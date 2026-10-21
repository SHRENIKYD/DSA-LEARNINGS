(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ============================ TOPIC 1: fetch + AbortController ============================ */
topics.push({
  title: 'fetch and AbortController: Talking to Servers Safely',
  analogy: `<p>Think of <code>fetch</code> as <b>ordering a pizza by phone</b>. You call (send the request), the shop says "got it" (the headers arrive), and later the pizza comes (the body). A <code>404</code> is the shop saying "we do not sell that" - the phone call itself worked fine! Only a dead phone line is a real failure.</p>
  <p><code>AbortController</code> is the "never mind, cancel my order" button. If you change your mind and order a different pizza, you cancel the first one - otherwise two pizzas arrive and you might eat the old, wrong one. That is exactly the <b>stale search result</b> bug.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> <code>fetch(url, options)</code> sends an HTTP request and gives you back a <b>Promise</b> of a <code>Response</code>. Three things beginners get wrong:</p>
  <ul>
    <li><b>The promise resolves when the headers arrive</b>, not when the whole body is downloaded. You then call <code>res.json()</code> (another promise) to read the body. The body can be read <b>only once</b>.</li>
    <li><b>HTTP errors do not reject.</b> A 404 or 500 still gives a normal Response. You must check <code>res.ok</code> (true for 200-299). Only a network failure (offline, DNS, CORS block) rejects with a <code>TypeError</code>.</li>
    <li><b>Responses can arrive in any order.</b> If you send request A then request B, B may come back first. The last request <i>sent</i> is not always the last response <i>received</i>.</li>
  </ul>
  ${H.table(['What happened', 'Does fetch() reject?', 'What you check'], [
    ['Server answered 200', 'No', '<code>res.ok === true</code>'],
    ['Server answered 404 / 500', '<span class="c-r">No!</span>', '<code>res.ok === false</code>, <code>res.status</code>'],
    ['Offline / DNS failure / CORS blocked', 'Yes (<code>TypeError</code>)', '<code>catch</code> block'],
    ['You called <code>controller.abort()</code>', 'Yes (<code>AbortError</code>)', '<code>err.name === "AbortError"</code>'],
    ['<code>AbortSignal.timeout(ms)</code> fired', 'Yes (<code>TimeoutError</code>)', '<code>err.name === "TimeoutError"</code>']
  ])}
  <p><b>🔵 How AbortController works.</b> You make a controller, hand its <code>signal</code> to <code>fetch</code>, and later call <code>controller.abort()</code>. The browser stops the download, closes the stream, and the fetch promise rejects with a <code>DOMException</code> named <code>AbortError</code>. One controller is good for <b>one cancel event</b> - once aborted, it stays aborted, so make a new controller for each new request.</p>
  <p><b>Timeout and retry.</b> Servers hang. Wrap each attempt with a timeout (<code>AbortSignal.timeout(5000)</code> or a manual timer calling <code>abort()</code>), and retry only when it makes sense: network errors and 5xx (server trouble) yes, 4xx (your mistake) no. Wait longer each time (<b>exponential backoff</b>: 100ms, 200ms, 400ms...) and add a little randomness (<b>jitter</b>) so a thousand clients do not all retry at the same instant.</p>`,
  clues: [
    '"search as you type" / "typeahead" → older responses must not overwrite newer ones (abort or ignore stale)',
    '"user navigates away / closes the modal while loading" → cancel the in-flight request, clean up in <code>useEffect</code>',
    '"request hangs forever" / "show an error after 5 seconds" → timeout with <code>AbortSignal.timeout</code>',
    '"flaky network" / "retry up to 3 times" → backoff + jitter, retry only idempotent requests and 5xx',
    '"fetch succeeded but the data is an error page" → forgot to check <code>res.ok</code>',
    '"stop generating" button on an AI chat → abort the streaming fetch'
  ],
  code: [
    {
      lang: 'js', title: 'The safe fetchJson helper (the one you should always write first)', code: `// fetch only rejects on NETWORK failure. HTTP 404/500 still "succeed".
// So we turn bad status codes into real errors ourselves.
async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    // Keep status on the error so callers can decide: retry on 5xx, show message on 4xx.
    const err = new Error('HTTP ' + res.status + ' for ' + url);
    err.status = res.status;
    throw err;
  }
  // 204 No Content has no body; calling res.json() would throw.
  if (res.status === 204) return null;
  return res.json();
}

// Usage with a timeout in one line (AbortSignal.timeout is supported in all modern browsers):
// fetchJson('/api/user', { signal: AbortSignal.timeout(5000) });`
    },
    {
      lang: 'js', run: true, title: 'Runnable: timeout + retry with backoff (fake server, real AbortController)', code: `// A fake fetch so this runs anywhere with no network.
// attempt 1 -> 503 error, attempt 2 -> hangs (we will time it out), attempt 3 -> 200 OK.
let serverCalls = 0;
function fakeFetch(url, options) {
  const signal = options && options.signal;
  const attempt = ++serverCalls;
  return new Promise(function (resolve, reject) {
    let timer;
    function respond(status, body) {
      timer = setTimeout(function () {
        resolve({
          ok: status >= 200 && status < 300,
          status: status,
          json: function () { return Promise.resolve(body); }
        });
      }, attempt === 2 ? 500 : 5); // attempt 2 is deliberately super slow
    }
    if (attempt === 1) respond(503, null);
    else if (attempt === 2) respond(200, { late: true });
    else respond(200, { name: 'Asha' });
    // When someone calls abort(), stop the "network" and reject like the real fetch does.
    if (signal) {
      signal.addEventListener('abort', function () {
        clearTimeout(timer);
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    }
  });
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function fetchWithRetry(url, opts) {
  opts = opts || {};
  const retries = opts.retries === undefined ? 3 : opts.retries;   // extra tries after the first
  const timeoutMs = opts.timeoutMs || 1000;
  const baseDelay = opts.baseDelay || 100;
  const doFetch = opts.fetchFn || fetch;
  const random = opts.random || Math.random;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    // A fresh controller per attempt: an aborted one can never be reused.
    const timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    try {
      const res = await doFetch(url, { signal: controller.signal });
      if (res.ok) return await res.json();
      if (res.status < 500) {
        // 4xx = our fault. Retrying the same bad request cannot help.
        const fatal = new Error('HTTP ' + res.status);
        fatal.fatal = true;
        throw fatal;
      }
      lastError = new Error('HTTP ' + res.status);
    } catch (err) {
      if (err.fatal) throw err;
      lastError = err.name === 'AbortError' ? new Error('timeout after ' + timeoutMs + 'ms') : err;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) {
      // Exponential backoff (100, 200, 400...) times a jitter between 0.5 and 1.
      const wait = Math.round(baseDelay * Math.pow(2, attempt) * (0.5 + random() / 2));
      console.log('attempt ' + (attempt + 1) + ' failed (' + lastError.message + '), waiting ' + wait + 'ms');
      await sleep(wait);
    }
  }
  throw lastError;
}

fetchWithRetry('/api/user', { fetchFn: fakeFetch, retries: 3, timeoutMs: 100, baseDelay: 10, random: function () { return 1; } })
  .then(function (data) { console.log('SUCCESS after', serverCalls, 'server calls ->', JSON.stringify(data)); })
  .catch(function (err) { console.log('GAVE UP:', err.message); });`
    },
    {
      lang: 'js', run: true, title: 'Runnable: the stale search bug and its fix', code: `// Fake search API: shorter queries are SLOWER, so responses arrive out of order.
const latency = { r: 80, re: 40, rea: 10 };
function fakeSearchFetch(url, options) {
  const signal = options && options.signal;
  const q = decodeURIComponent(url.split('q=')[1]);
  return new Promise(function (resolve, reject) {
    const timer = setTimeout(function () {
      resolve({ ok: true, json: function () { return Promise.resolve(['result for "' + q + '"']); } });
    }, latency[q]);
    if (signal) signal.addEventListener('abort', function () {
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    });
  });
}

// BAD: whichever response lands LAST wins, even if it is for an old query.
function createNaiveSearcher(fetchFn, render) {
  return async function search(q) {
    const res = await fetchFn('/search?q=' + encodeURIComponent(q), {});
    render(q, await res.json());
  };
}

// GOOD: every new search cancels the previous one.
function createSearcher(fetchFn, render) {
  let controller = null;
  return async function search(q) {
    if (controller) controller.abort();          // cancel the old order
    controller = new AbortController();
    const mine = controller;                       // remember which controller is mine
    try {
      const res = await fetchFn('/search?q=' + encodeURIComponent(q), { signal: mine.signal });
      const data = await res.json();
      if (mine.signal.aborted) return;             // extra safety: body may finish after abort
      render(q, data);
    } catch (err) {
      if (err.name === 'AbortError') { console.log('  (cancelled "' + q + '" quietly)'); return; }
      throw err;                                   // real errors still surface
    }
  };
}

function typeWord(search) {
  search('r');
  setTimeout(function () { search('re'); }, 5);
  setTimeout(function () { search('rea'); }, 10);
}

console.log('--- naive ---');
typeWord(createNaiveSearcher(fakeSearchFetch, function (q, d) { console.log('  render', d[0]); }));
setTimeout(function () {
  console.log('--- with AbortController ---');
  typeWord(createSearcher(fakeSearchFetch, function (q, d) { console.log('  render', d[0]); }));
}, 200);`
    }
  ],
  codeTitle: ['Core pattern', 'Timeout + retry wrapper', 'Cancel stale search requests'],
  viz: [
    {
      title: 'Fetch lifecycle: aborting a stale request while typing',
      input: 'react',
      inputLabel: 'Type a word (1-6 letters)',
      gen: function (input) {
        var word = String(input || '').replace(/[^a-z0-9]/gi, '');
        if (!word) throw new Error('Type 1 to 6 letters or digits, for example: react');
        if (word.length > 6) throw new Error('Use at most 6 characters');
        var nodes = [
          { id: 'UI', label: 'Search box', x: 12, y: 30, shape: 'box' },
          { id: 'AC', label: 'AbortController', x: 46, y: 8, shape: 'box' },
          { id: 'API', label: 'Server /search', x: 84, y: 30, shape: 'box' }
        ];
        var edges = [['UI', 'AC', 'abort()'], ['UI', 'API', 'fetch(q)']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Browser to server', height: 44, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var frames = [], inflight = [];
        frames.push({ narr: 'Empty search box. Nothing is in flight. Every keystroke will fire a <b>fetch</b>, and a fast network can return answers in a <b>different order</b> than we asked.', parts: [g({}, {}, {}), { type: 'queue', label: 'In-flight requests', items: [], frontLabel: 'oldest', backLabel: 'newest' }] });
        for (var i = 0; i < word.length; i++) {
          var prefix = word.slice(0, i + 1);
          if (inflight.length) {
            frames.push({ narr: 'You type <b>' + prefix + '</b>. The request for <b>"' + inflight[0] + '"</b> is still waiting - its answer is now <b>out of date</b>. We call <code>controller.abort()</code> first.', parts: [g({ UI: 'cur', AC: 'bad' }, { 'UI-AC': 'bad' }, { AC: 'abort!' }), { type: 'queue', label: 'In-flight requests', items: inflight.map(function (p) { return 'q=' + p; }), hl: { 0: 'bad' }, frontLabel: 'oldest', backLabel: 'newest' }] });
            frames.push({ narr: 'The old fetch promise <b>rejects with AbortError</b>. Our code catches it and does nothing - cancelling on purpose is not a bug. The browser also stops downloading the old body.', parts: [g({ AC: 'done' }, {}, {}), { type: 'queue', label: 'In-flight requests', items: [], frontLabel: 'oldest', backLabel: 'newest' }, { type: 'vars', vals: { cancelled: '"' + inflight[0] + '"', error: 'AbortError (ignored)' }, hl: { cancelled: 'bad' } }] });
            inflight = [];
          }
          inflight = [prefix];
          var t = {}; t.API = 'q=' + prefix;
          frames.push({ narr: 'New <code>AbortController</code> created for <b>"' + prefix + '"</b> and the request is sent. Only <b>one</b> request is in flight, so only one answer can ever land.', parts: [g({ UI: 'cur', API: 'ok' }, { 'UI-API': 'ok' }, t), { type: 'queue', label: 'In-flight requests', items: ['q=' + prefix], hl: { 0: 'ok' }, frontLabel: 'oldest', backLabel: 'newest' }] });
        }
        frames.push({ narr: 'The user stops typing. The last request <b>"' + word + '"</b> finishes, we check <code>res.ok</code>, parse JSON and render. No stale result can overwrite it.', parts: [g({ API: 'sel', UI: 'ok' }, { 'API-UI': 'ok' }, { UI: 'render' }), { type: 'queue', label: 'In-flight requests', items: [], frontLabel: 'oldest', backLabel: 'newest' }, { type: 'vars', vals: { rendered: '"' + word + '"', staleResultsShown: 0 }, hl: { rendered: 'sel' } }] });
        return frames;
      }
    },
    {
      title: 'Retry with exponential backoff (and when to stop)',
      input: '503,timeout,200',
      inputLabel: 'Outcomes per attempt (comma list: 200, 404, 503, timeout, net)',
      gen: function (input) {
        var toks = String(input || '').split(/[,\s]+/).filter(Boolean).slice(0, 5);
        if (!toks.length) throw new Error('Enter outcomes like: 503,timeout,200');
        var MAXTRIES = 4, base = 100, rows = [], elapsed = 0, frames = [];
        function tbl(hlRow) { return { type: 'table', label: 'Attempts so far', columns: ['#', 'Outcome', 'Decision', 'Wait before next'], rows: rows.map(function (r) { return r.slice(); }), hl: hlRow === undefined ? {} : (function () { var o = {}; o[hlRow] = rows[hlRow] && rows[hlRow][2].indexOf('success') >= 0 ? 'ok' : (rows[hlRow] && rows[hlRow][2].indexOf('stop') >= 0 ? 'bad' : 'cur'); return o; })() }; }
        frames.push({ narr: 'Plan: up to <b>' + MAXTRIES + ' tries</b>. Wait 100ms, 200ms, 400ms between tries (doubling). Each try has its own timeout controller.', parts: [{ type: 'vars', vals: { maxTries: MAXTRIES, baseDelayMs: base, elapsedMs: 0 } }, tbl()] });
        for (var i = 0; i < toks.length; i++) {
          var tk = toks[i].toLowerCase(), n = i + 1;
          frames.push({ narr: 'Attempt <b>' + n + '</b>: create a new AbortController, start the timer, call fetch.', parts: [{ type: 'vars', vals: { attempt: n, elapsedMs: elapsed }, hl: { attempt: 'cur' } }, tbl()] });
          var status = parseInt(tk, 10), decision, wait = '-', done = false, narr;
          if (!isNaN(status) && status >= 200 && status < 300) { decision = '<span class="c-g">success</span>'; done = true; narr = 'Status <b>' + status + '</b> means <code>res.ok</code> is true. Parse the body and return. Done.'; }
          else if (!isNaN(status) && status < 500) { decision = '<span class="c-r">stop (4xx is our bug)</span>'; done = true; narr = 'Status <b>' + status + '</b> is a client error. Sending the same request again will fail the same way, so we <b>do not retry</b>.'; }
          else {
            var why = tk === 'timeout' ? 'timer fired, abort() called' : (tk === 'net' ? 'network error (TypeError)' : 'server error ' + status);
            if (n >= MAXTRIES) { decision = '<span class="c-r">stop (out of tries)</span>'; done = true; narr = 'Failed again (' + why + ') and this was the last try. Throw the last error to the caller.'; }
            else { wait = Math.round(base * Math.pow(2, i)) + 'ms (+jitter)'; decision = '<span class="c-y">retry</span>'; narr = 'Failed (' + why + '). That is retryable, so wait <b>' + wait + '</b>. Doubling the wait gives a struggling server room to recover.'; elapsed += base * Math.pow(2, i); }
          }
          rows.push([String(n), tk, decision, wait]);
          frames.push({ narr: narr, parts: [{ type: 'vars', vals: { attempt: n, elapsedMs: elapsed }, hl: { elapsedMs: 'cur' } }, tbl(rows.length - 1)] });
          if (done) break;
        }
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'fetch does not reject on 404 (the classic trap)',
      html: `<p>Many beginner apps show a blank screen on a missing page because the code does <code>const data = await res.json()</code> on an HTML error page. Always check <code>res.ok</code> first. A wrong URL gives status <b>404</b> and the promise still <b>resolves</b>.</p>`,
      code: `async function loadUser(id) {
  try {
    const res = await fetch('/api/users/' + id);
    if (!res.ok) {
      // 404 -> show "user not found", 500 -> show "try again later"
      return { error: res.status === 404 ? 'User not found' : 'Server problem (' + res.status + ')' };
    }
    return { user: await res.json() };
  } catch (err) {
    // Only network failures end up here (offline, DNS, CORS).
    return { error: 'Cannot reach the server. Are you offline?' };
  }
}`
    },
    {
      title: 'POST JSON with a timeout',
      html: `<p>Sending data needs three extras: the <code>method</code>, a <code>Content-Type</code> header, and a string body (<code>JSON.stringify</code>). Add <code>AbortSignal.timeout</code> so a stuck server cannot freeze your spinner forever. When the timer fires, the error name is <b>TimeoutError</b> (not AbortError), which lets you show a different message.</p>`,
      code: `async function createTodo(title) {
  try {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title }),
      signal: AbortSignal.timeout(5000)   // gives up after 5 seconds
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    if (err.name === 'TimeoutError') return { error: 'The server is too slow. Try again.' };
    throw err;
  }
}`
    },
    {
      title: 'Cancel on cleanup in a component (React-style)',
      html: `<p>When a component unmounts (or its input changes), the effect cleanup should cancel the request. Otherwise the response may arrive later and try to update a screen that no longer exists, or show data for the <i>previous</i> id. This is the same pattern as the search box - one controller per effect run.</p>`,
      code: {
        lang: 'js', check: false, code: `useEffect(() => {
  const controller = new AbortController();
  fetch('/api/products/' + productId, { signal: controller.signal })
    .then((res) => res.json())
    .then(setProduct)
    .catch((err) => { if (err.name !== 'AbortError') setError(err); });
  // Cleanup runs before the next effect and on unmount.
  return () => controller.abort();
}, [productId]);`
      }
    },
    {
      title: 'Combine a user cancel button with a timeout',
      html: `<p><code>AbortSignal.any([a, b])</code> makes one signal that aborts when <i>either</i> input aborts. Great for "cancel button OR 10 second timeout". Check <code>signal.reason</code> to know which one fired. It is available in current evergreen browsers; for older ones, wire two listeners to one controller by hand.</p>`,
      code: `const userCancel = new AbortController();
document.querySelector('#cancel').addEventListener('click', () => userCancel.abort('user'));

const signal = AbortSignal.any([userCancel.signal, AbortSignal.timeout(10000)]);
fetch('/api/report', { signal })
  .then((res) => res.blob())
  .catch((err) => console.log('stopped because:', signal.reason));`
    }
  ],
  deepDive: `<p><b>🟣 What abort really does.</b> Aborting closes the client side of the request. The <b>server may still do the work</b> - a payment POST that you aborted might already have been charged. That is why retrying a POST is dangerous unless the server supports an <b>idempotency key</b> (a unique id header so a repeated request is recognised and not applied twice). GET, PUT and DELETE are idempotent by definition; POST is not.</p>
  <p><b>Promise.race is not a timeout.</b> <code>Promise.race([fetch(url), sleep(5000).then(reject)])</code> makes <i>your code</i> stop waiting, but the request keeps running in the background and keeps a connection busy. A real timeout aborts the fetch. Browsers allow only ~6 parallel connections per host on HTTP/1.1, so leaking zombie requests slows everything else.</p>
  <p><b>Error names matter.</b> <code>AbortError</code> = someone called abort(). <code>TimeoutError</code> = <code>AbortSignal.timeout</code> fired. <code>TypeError</code> = network failure or CORS. Do not catch everything and show "something went wrong" - cancelled requests are normal and should be silent.</p>
  <p><b>Backoff details.</b> Pure exponential backoff makes every client retry in lock-step ("thundering herd"). Full jitter (<code>random(0, base * 2^n)</code>) spreads them out. Respect the server's <code>Retry-After</code> header when present, and cap the maximum wait (for example 30s) and the number of tries. Do not trust <code>navigator.onLine</code> to decide whether to retry. It is unreliable, so react to the real failure instead.</p>
  <p><b>Streaming.</b> <code>res.body</code> is a <code>ReadableStream</code>. You can read it chunk by chunk with <code>res.body.getReader()</code> (progress bars, server-sent text, LLM tokens). The same <code>signal</code> cancels the stream mid-way. Also remember <code>res.clone()</code> if you need to read a body twice, and <code>credentials: 'include'</code> if cookies must be sent cross-origin.</p>
  <p><b>Response races beyond search.</b> Pagination, tab switches, "refresh" buttons and optimistic updates all have the same shape: <i>only the latest intent should win</i>. Two defences, use both when it matters: (1) abort the old request, (2) tag each request with an id and ignore any response whose id is not the latest.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI assistants write <code>fetch</code> code in seconds, and the code usually <i>looks</i> right. The typical generated version has four hidden holes: no <code>res.ok</code> check, no cancellation, no timeout, and an effect without cleanup. These bugs only show up on slow or flaky networks, which is exactly where your real users are.</p>
  <p><b>Use AI as a partner:</b> paste your hook and ask <code>List every race condition and unhandled failure in this fetch code. Do not rewrite it yet.</code> Then ask for a test with fake timers that fires responses out of order. You will learn faster by judging its list than by accepting its rewrite.</p>
  <p><b>AI products are fetch products.</b> The "Stop generating" button in a chat UI is just <code>controller.abort()</code> on a streaming fetch, and the token-by-token text is a <code>ReadableStream</code> read in a loop. Knowing this makes you the person who can build (and debug) those UIs.</p>
  <p><b>What you must still own:</b> deciding what is safe to retry (idempotency), picking sensible timeouts for your product, and noticing that an "AbortError" in the logs is normal while a "TypeError" is not.</p>`,
  problems: [
    {
      title: 'Cancel Stale Search Requests', level: 'Medium', tags: ['fetch', 'AbortController', 'race condition', 'typeahead'], companies: ['Google', 'Amazon', 'Flipkart'],
      statement: `<p>A search box calls <code>fetchFn('/search?q=...', { signal })</code> on every keystroke. Responses can arrive out of order, so an old, slow answer may overwrite a newer one. Write <code>createSearcher(fetchFn, render)</code> that returns a <code>search(query)</code> function so that <b>only the latest query is ever rendered</b>, older in-flight requests are aborted, and the resulting <code>AbortError</code> is swallowed silently. Real errors must still be thrown.</p>`,
      constraints: `Up to 100 calls per second. Latency of each request is 10 ms to 2 s. <code>fetchFn</code> returns a Promise of an object with <code>ok</code> and <code>json()</code>.`,
      example: `<p>Typing <b>r</b>, <b>re</b>, <b>rea</b> within 10 ms. Latencies: r = 80 ms, re = 40 ms, rea = 10 ms.</p>
        ${H.table(['Approach', 'Order responses arrive', 'Rendered'], [['No abort', 'rea, re, r', '<span class="c-r">"r" last (wrong, stale)</span>'], ['With abort', 'r and re cancelled', '<span class="c-g">only "rea"</span>']])}
        <p>Why: after aborting, the old requests reject with AbortError and never reach <code>render</code>.</p>`,
      brute: {
        why: `<p>The naive version just awaits each fetch and renders. Every keystroke keeps its request alive, so the slowest (oldest) response can arrive last and win. Wasted work: 3 downloads for 1 visible result, plus a wrong final screen.</p>`,
        code: `function createNaiveSearcher(fetchFn, render) {
  return async function search(q) {
    const res = await fetchFn('/search?q=' + encodeURIComponent(q), {});
    render(q, await res.json());   // stale answers overwrite fresh ones
  };
}`
      },
      mcq: { q: 'Which approach guarantees no stale result is shown?', options: ['Abort the previous request when a new one starts', 'Increase the server timeout', 'Use setTimeout 500ms before every fetch only', 'Call res.json() twice'], answer: 0, explain: 'Aborting stops the old request from ever resolving into render. A debounce helps reduce requests but cannot stop an already-sent slow request from landing late.' },
      hints: [
        `<p>Hint 1: the aha - only <b>one</b> request should be alive at a time. A new keystroke makes the old one worthless.</p>`,
        `<p>Hint 2: keep one <code>controller</code> variable in a closure. On each search call <code>abort()</code> on the old one, then create a new <code>AbortController</code>.</p>`,
        `<p>Hint 3: wrap in try/catch. If <code>err.name === 'AbortError'</code> return quietly, otherwise rethrow. Also check <code>mine.signal.aborted</code> after awaiting <code>res.json()</code>, because the body can finish right as you abort.</p>`
      ],
      solution: {
        approach: `<p>Store the current controller in a closure. Each call aborts the previous controller, creates a new one, and remembers it in a local <code>mine</code> variable (so a later call cannot change which controller this call checks). Swallow <code>AbortError</code>, rethrow everything else.</p>`,
        code: {
          lang: 'js', run: true, code: `function createSearcher(fetchFn, render) {
  let controller = null;
  return async function search(q) {
    if (controller) controller.abort();
    controller = new AbortController();
    const mine = controller;
    try {
      const res = await fetchFn('/search?q=' + encodeURIComponent(q), { signal: mine.signal });
      const data = await res.json();
      if (mine.signal.aborted) return;
      render(q, data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      throw err;
    }
  };
}

// Tiny test harness: shorter query = slower response.
const latency = { r: 80, re: 40, rea: 10 };
function fakeFetch(url, o) {
  const q = decodeURIComponent(url.split('q=')[1]);
  return new Promise(function (resolve, reject) {
    const t = setTimeout(function () { resolve({ ok: true, json: function () { return Promise.resolve(q); } }); }, latency[q]);
    o.signal.addEventListener('abort', function () { clearTimeout(t); reject(new DOMException('x', 'AbortError')); });
  });
}
const rendered = [];
const search = createSearcher(fakeFetch, function (q, d) { rendered.push(d); });
search('r');
setTimeout(function () { search('re'); }, 5);
setTimeout(function () { search('rea'); }, 10);
setTimeout(function () { console.log('rendered:', JSON.stringify(rendered)); }, 150);`
        },
        complexity: `<p>Time O(1) per keystroke; space O(1) (one controller). Network: at most one live request.</p>`,
        followUps: ['Add a 250 ms debounce before sending. How does it combine with abort?', 'What if the API cannot be cancelled (no signal)? Use a request id and ignore stale responses.', 'How would you cache results per query so deleting a letter is instant?']
      }
    }
  ]
});

/* ============================ TOPIC 2: Browser storage ============================ */
topics.push({
  title: 'Browser Storage: Cookies, localStorage, sessionStorage, IndexedDB',
  analogy: `<p>Imagine you are staying in a hotel. A <b>sticky note on your door</b> that the staff reads every time they walk past is a <b>cookie</b> (the server sees it on every request). Your <b>suitcase</b> that stays in the room until you leave for good is <b>localStorage</b>. A <b>towel for this one visit</b> that is thrown away at checkout is <b>sessionStorage</b> (and each room - each tab - gets its own towel). The hotel's <b>big warehouse with labelled shelves</b> is <b>IndexedDB</b>: you can store lots of things and look them up by label, but you need a bit of paperwork.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Your page loses all its JavaScript variables when you refresh. To remember things (theme, a half-written form, offline data, "who is logged in") you put them in the browser's storage. There are four main places, and choosing the right one is a classic interview question.</p>
  ${H.table(['', 'Cookie', 'localStorage', 'sessionStorage', 'IndexedDB'], [
    ['Size (rough)', '~4 KB each', '~5 MB per origin', '~5 MB per origin', 'Hundreds of MB to GBs (quota)'],
    ['Lifetime', 'Until <code>Expires</code>/<code>Max-Age</code> (else session)', 'Until you clear it', 'Until the <b>tab</b> closes', 'Until you clear it'],
    ['Sent to server?', '<span class="c-r">Yes, every request</span>', 'No', 'No', 'No'],
    ['API style', 'String in <code>document.cookie</code>', 'Sync <code>getItem/setItem</code>', 'Sync <code>getItem/setItem</code>', 'Async (events / promises)'],
    ['Data types', 'Strings', 'Strings only', 'Strings only', 'Objects, Blobs, files, arrays (structured clone)'],
    ['Shared across tabs?', 'Yes', 'Yes (+ <code>storage</code> event)', '<b>No</b>, one per tab', 'Yes']
  ])}
  <p><b>🔵 How each one really works.</b></p>
  <ul>
    <li><b>localStorage / sessionStorage</b> are key-value stores with <b>string</b> values. To save an object use <code>JSON.stringify</code>, to read it back use <code>JSON.parse</code>. They are <b>synchronous</b>: a big read blocks the main thread. They are tied to the <b>origin</b> (scheme + host + port), so <code>https://a.com</code> cannot read <code>https://b.com</code>.</li>
    <li><b>Cookies</b> are small strings the server and JS can both set. The browser attaches matching cookies to every request to that site, which is why they are used for login sessions - and why stuffing big data in them slows every request. Flags: <code>HttpOnly</code> (JS cannot read it), <code>Secure</code> (HTTPS only), <code>SameSite=Lax|Strict|None</code> (cross-site sending rules), <code>Path</code>, <code>Domain</code>, <code>Max-Age</code>.</li>
    <li><b>IndexedDB</b> is a real database in the browser: <b>databases → object stores → records</b>, with indexes and <b>transactions</b>. It is asynchronous (does not freeze the page), can store objects directly, works inside Web Workers, and has a much larger quota. The raw API is clunky (request objects with <code>onsuccess</code>), so people wrap it in promises or use a library (idb, Dexie).</li>
  </ul>
  <p><b>Rule of thumb:</b> small preference → localStorage. Per-tab temporary state → sessionStorage. Something the server must see → cookie. Lots of data, files, offline, or anything you want to query → IndexedDB. A secret token → keep it out of anything JavaScript can read if you can (HttpOnly cookie).</p>`,
  clues: [
    '"remember the user\'s theme / language" → localStorage (tiny, survives restarts, no server needed)',
    '"cleared when the tab closes" / "multi-step form, each tab independent" → sessionStorage',
    '"server must know who the user is on every request" → cookie (HttpOnly + Secure + SameSite)',
    '"offline mode" / "store 50 MB of notes or images" / "need to query by index" → IndexedDB',
    '"is it safe to keep the JWT in localStorage?" → any XSS can read it; prefer HttpOnly cookie or in-memory + refresh cookie',
    '"logout in one tab should log out the other tabs" → <code>storage</code> event or BroadcastChannel'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Runnable: a safe storage wrapper (JSON, quota errors, blocked storage)', code: `// Real localStorage can THROW: private mode, blocked cookies, or a full quota.
// This wrapper never throws and falls back to memory. A fake backend lets it run anywhere.
class FakeStorage {
  constructor(limitChars) { this.data = {}; this.limit = limitChars; }
  setItem(k, v) {
    const used = Object.keys(this.data).reduce((n, key) => n + key.length + this.data[key].length, 0);
    if (used + k.length + String(v).length > this.limit) {
      const e = new Error('Quota exceeded'); e.name = 'QuotaExceededError'; throw e;
    }
    this.data[k] = String(v);
  }
  getItem(k) { return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null; }
  removeItem(k) { delete this.data[k]; }
}

function createStore(backend) {
  const memory = new Map();       // fallback when the real storage is unusable
  let usable = true;
  try {
    backend.setItem('__probe__', '1');   // just touching storage can throw in some browsers
    backend.removeItem('__probe__');
  } catch (e) { usable = false; }

  return {
    get: function (key, fallback) {
      try {
        const raw = usable ? backend.getItem(key) : null;
        if (raw !== null) return JSON.parse(raw);          // corrupt JSON throws -> caught below
        return memory.has(key) ? memory.get(key) : fallback;
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try {
        if (!usable) throw new Error('storage unavailable');
        backend.setItem(key, JSON.stringify(value));
        memory.delete(key);
        return 'saved';
      } catch (e) {
        memory.set(key, value);                            // keep working for this visit
        return 'memory-only (' + e.name + ')';
      }
    }
  };
}

const store = createStore(new FakeStorage(60));
console.log(store.set('theme', 'dark'));                    // small, fits
console.log(store.set('cart', { items: [1, 2, 3], note: 'x'.repeat(80) })); // too big
console.log(store.get('theme', 'light'), JSON.stringify(store.get('cart').items), store.get('missing', 'default'));`
    },
    {
      lang: 'js', run: true, title: 'Runnable: parse and build cookie strings', code: `// document.cookie is ONE string: "a=1; b=2". You parse it yourself.
function parseCookies(str) {
  const out = {};
  str.split(';').forEach(function (part) {
    const i = part.indexOf('=');
    if (i < 0) return;
    const name = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (name) out[name] = decodeURIComponent(value);   // values are URL-encoded
  });
  return out;
}

// Build a Set-Cookie style string with safe defaults.
function buildCookie(name, value, o) {
  o = o || {};
  let s = encodeURIComponent(name) + '=' + encodeURIComponent(value);
  s += '; Path=' + (o.path || '/');
  if (o.maxAgeSeconds !== undefined) s += '; Max-Age=' + o.maxAgeSeconds;
  s += '; SameSite=' + (o.sameSite || 'Lax');
  if (o.secure !== false) s += '; Secure';
  if (o.httpOnly) s += '; HttpOnly';   // NOTE: JS cannot set HttpOnly; only a server can
  return s;
}

console.log(JSON.stringify(parseCookies('theme=dark; lang=en-IN; cart=%5B1%2C2%5D')));
console.log(buildCookie('theme', 'dark', { maxAgeSeconds: 60 * 60 * 24 * 365 }));
console.log(buildCookie('sid', 'abc123', { httpOnly: true, sameSite: 'Strict' }));`
    },
    {
      lang: 'js', title: 'IndexedDB with a tiny promise wrapper (browser only)', code: `// Open (or create) a database. The 3rd argument runs only when the version number grows.
function openDb(name, version, upgrade) {
  return new Promise(function (resolve, reject) {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = function () { upgrade(req.result, req.transaction); };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
    req.onblocked = function () { reject(new Error('Close other tabs using an older version')); };
  });
}

// Turn one IDBRequest into a promise.
function wrap(request) {
  return new Promise(function (resolve, reject) {
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error); };
  });
}

async function demo() {
  const db = await openDb('notes-app', 1, function (db) {
    // Create the "table" (object store) once, with an index for fast lookups by tag.
    const store = db.createObjectStore('notes', { keyPath: 'id' });
    store.createIndex('byTag', 'tag', { unique: false });
  });

  // All reads/writes happen inside a transaction.
  const tx = db.transaction('notes', 'readwrite');
  tx.objectStore('notes').put({ id: 1, title: 'Buy milk', tag: 'home', done: false });
  tx.objectStore('notes').put({ id: 2, title: 'Fix bug 42', tag: 'work', done: false });
  await new Promise(function (resolve, reject) { tx.oncomplete = resolve; tx.onerror = function () { reject(tx.error); }; });

  const work = await wrap(db.transaction('notes').objectStore('notes').index('byTag').getAll('work'));
  console.log(work);   // [{ id: 2, title: 'Fix bug 42', ... }]
}`
    },
    {
      lang: 'js', title: 'Cross-tab sync with the storage event and BroadcastChannel', code: `// 1) storage event: fires in the OTHER tabs (never in the tab that made the change).
window.addEventListener('storage', function (e) {
  if (e.key === 'logout') {
    console.log('Another tab logged out at', e.newValue);
    showLoginScreen();
  }
});
// In tab A:  localStorage.setItem('logout', String(Date.now()));

// 2) BroadcastChannel: direct messages between tabs of the same origin, no storage needed.
const channel = new BroadcastChannel('auth');
channel.onmessage = function (e) { if (e.data.type === 'logout') showLoginScreen(); };
// In tab A:  channel.postMessage({ type: 'logout' });

function showLoginScreen() { document.body.textContent = 'Please log in again'; }`
    }
  ],
  codeTitle: ['Safe localStorage wrapper', 'Cookies by hand', 'IndexedDB basics', 'Syncing tabs'],
  viz: [
    {
      title: 'Choose the right storage (comparison table filtered by your need)',
      input: 'theme',
      inputLabel: 'Need: theme, login, wizard or offline',
      gen: function (input) {
        var need = String(input || '').trim().toLowerCase();
        var COLS = ['Storage', 'Size', 'Survives refresh', 'Survives browser close', 'Own copy per tab', 'Sent to server', 'Async', 'Can hide from JS'];
        var D = [
          { n: 'Cookie', size: '~4 KB', refresh: 1, close: 1, tab: 0, sent: 1, big: 0, async: 0, http: 1 },
          { n: 'localStorage', size: '~5 MB', refresh: 1, close: 1, tab: 0, sent: 0, big: 0, async: 0, http: 0 },
          { n: 'sessionStorage', size: '~5 MB', refresh: 1, close: 0, tab: 1, sent: 0, big: 0, async: 0, http: 0 },
          { n: 'IndexedDB', size: '100s of MB', refresh: 1, close: 1, tab: 0, sent: 0, big: 1, async: 1, http: 0 },
          { n: 'JS variable (memory)', size: 'RAM', refresh: 0, close: 0, tab: 1, sent: 0, big: 1, async: 0, http: 0 }
        ];
        var Y = '<span class="c-g">yes</span>', N = '<span class="c-m">no</span>';
        function row(r) { return [r.n, r.size, r.refresh ? Y : N, r.close ? Y : N, r.tab ? Y : N, r.sent ? Y : N, r.async ? Y : N, r.http ? Y : N]; }
        var NEEDS = {
          theme: { title: 'Remember the dark/light theme', f: [['Must survive closing the browser', function (r) { return r.close; }], ['Must NOT travel to the server on every request', function (r) { return !r.sent; }]], pick: 1, why: 'Both localStorage and IndexedDB pass, but a one-word preference does not need a database. <b>Simplest tool that works wins: localStorage.</b>' },
          login: { title: 'Keep the user logged in', f: [['Server needs it on every request', function (r) { return r.sent; }], ['Hidden from JavaScript (XSS-safe)', function (r) { return r.http; }]], pick: 0, why: 'Only a cookie is both sent automatically and can be <code>HttpOnly</code>. Add <code>Secure</code> and <code>SameSite</code>.' },
          wizard: { title: 'Half-filled multi-step form, per tab', f: [['Survives a page refresh', function (r) { return r.refresh; }], ['Own copy per tab', function (r) { return r.tab; }], ['Disappears when the tab closes', function (r) { return !r.close; }]], pick: 2, why: 'Only <b>sessionStorage</b> matches all three: refresh-safe, tab-private, auto-cleaned.' },
          offline: { title: 'Offline notes with 50 MB of attachments', f: [['Bigger than a few MB', function (r) { return r.big; }], ['Does not block the UI (async)', function (r) { return r.async; }], ['Survives browser close', function (r) { return r.close; }]], pick: 3, why: '<b>IndexedDB</b> is the only async, large, durable store. Memory is big but vanishes on refresh.' }
        };
        var cfg = NEEDS[need];
        if (!cfg) throw new Error('Type one of: theme, login, wizard, offline');
        var rows = D.map(row), frames = [], alive = D.map(function () { return true; });
        frames.push({ narr: 'Five places to keep data. Need: <b>' + cfg.title + '</b>. We will ask questions and cross out every option that fails.', parts: [{ type: 'table', label: 'Storage options', columns: COLS, rows: rows }, { type: 'vars', vals: { need: cfg.title, optionsLeft: D.length } }] });
        cfg.f.forEach(function (f, k) {
          var hl = {}, left = 0;
          D.forEach(function (r, i) {
            if (!alive[i]) { hl[i] = 'done'; return; }
            if (f[1](r)) { hl[i] = 'ok'; left++; } else { hl[i] = 'bad'; alive[i] = false; }
          });
          frames.push({ narr: 'Question ' + (k + 1) + ': <b>' + f[0] + '?</b> Green rows pass, red rows are out. <b>' + left + '</b> left.', parts: [{ type: 'table', label: 'Storage options', columns: COLS, rows: rows, hl: hl }, { type: 'vars', vals: { question: f[0], optionsLeft: left }, hl: { optionsLeft: left === 1 ? 'ok' : 'cur' } }] });
        });
        var fin = {};
        D.forEach(function (r, i) { fin[i] = i === cfg.pick ? 'sel' : 'done'; });
        frames.push({ narr: 'Decision: <b>' + D[cfg.pick].n + '</b>. ' + cfg.why, parts: [{ type: 'table', label: 'Storage options', columns: COLS, rows: rows, hl: fin }, { type: 'vars', vals: { choice: D[cfg.pick].n }, hl: { choice: 'sel' } }] });
        return frames;
      }
    },
    {
      title: 'IndexedDB flow: open, upgrade, transaction, put',
      input: '0',
      inputLabel: 'Existing DB version on disk (0 = brand new, 1, or 2)',
      gen: function (input) {
        var existing = parseInt(String(input).trim(), 10);
        if (isNaN(existing) || existing < 0 || existing > 2) throw new Error('Type 0, 1 or 2');
        var wanted = 2, needsUpgrade = existing < wanted;
        var nodes = [
          { id: 'A', label: 'open("app", 2)', x: 15, y: 10, shape: 'box' },
          { id: 'B', label: 'onupgradeneeded', x: 50, y: 10, shape: 'box' },
          { id: 'C', label: 'onsuccess: db', x: 85, y: 10, shape: 'box' },
          { id: 'D', label: 'db.transaction()', x: 85, y: 42, shape: 'box' },
          { id: 'E', label: 'store.put(obj)', x: 50, y: 42, shape: 'box' },
          { id: 'F', label: 'tx.oncomplete', x: 15, y: 42, shape: 'box' }
        ];
        var edges = [['A', 'B', 'older version'], ['A', 'C', 'same version'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'F']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'IndexedDB lifecycle', directed: true, height: 52, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        var frames = [];
        frames.push({ narr: 'We ask for database <b>"app" version 2</b>. On disk it is version <b>' + existing + '</b>' + (existing === 0 ? ' (does not exist yet)' : '') + '. Everything in IndexedDB is a <b>request</b> that answers later via events.', parts: [g({ A: 'cur' }), { type: 'vars', vals: { onDisk: existing, requested: wanted } }] });
        if (needsUpgrade) {
          frames.push({ narr: 'The requested version is higher, so the browser fires <b>onupgradeneeded</b>. This is the <i>only</i> place you may create object stores and indexes (schema changes).', parts: [g({ A: 'done', B: 'cur' }, { 'A-B': 'ok' }), { type: 'vars', vals: { schemaChange: 'createObjectStore("notes", { keyPath: "id" })' }, hl: { schemaChange: 'ok' } }] });
        } else {
          frames.push({ narr: 'The version already matches, so <b>no upgrade runs</b>. The browser skips straight to success.', parts: [g({ A: 'done' }, { 'A-C': 'ok' }), { type: 'vars', vals: { upgradeRan: 'no' } }] });
        }
        frames.push({ narr: '<b>onsuccess</b>: we now hold a <code>db</code> connection. Keep it and reuse it - opening for every read is slow.', parts: [g({ C: 'ok', A: 'done', B: 'done' }, needsUpgrade ? { 'B-C': 'ok' } : { 'A-C': 'ok' }), { type: 'vars', vals: { db: 'IDBDatabase (open)' }, hl: { db: 'ok' } }] });
        frames.push({ narr: 'Every read or write must be inside a <b>transaction</b>. Mode "readwrite" because we will add data. Transactions are all-or-nothing.', parts: [g({ D: 'cur', C: 'done' }, { 'C-D': 'ok' }), { type: 'vars', vals: { mode: 'readwrite', stores: 'notes' } }] });
        frames.push({ narr: '<code>store.put({ id: 1, title: "Buy milk" })</code> stores a JS object directly (no JSON.stringify needed - IndexedDB uses structured clone). If the key exists, put replaces it.', parts: [g({ E: 'cur', D: 'done' }, { 'D-E': 'ok' }), { type: 'table', label: 'object store "notes"', columns: ['id (key)', 'title', 'tag'], rows: [[1, 'Buy milk', 'home']], hl: { 0: 'ok' } }] });
        frames.push({ narr: '<b>tx.oncomplete</b> fires only after the data is safely committed. Success of one <code>put</code> request alone does not mean durable - wait for the transaction.', parts: [g({ F: 'sel', E: 'done' }, { 'E-F': 'ok' }), { type: 'vars', vals: { committed: true }, hl: { committed: 'sel' } }] });
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'Theme preference: localStorage (with a safe default)',
      html: `<p>A one-word preference is perfect for localStorage. Always read with a fallback and wrap in try/catch, because storage can be disabled. Apply the theme <b>before first paint</b> (a tiny inline script in the head) or users see a white flash.</p>`,
      code: `function loadTheme() {
  try {
    return localStorage.getItem('theme') || 'light';
  } catch (e) {
    return 'light';          // storage blocked: just use the default
  }
}
function saveTheme(theme) {
  try { localStorage.setItem('theme', theme); } catch (e) { /* not fatal */ }
  document.documentElement.dataset.theme = theme;
}`
    },
    {
      title: 'Login session: HttpOnly cookie, not localStorage',
      html: `<p>If your token sits in <code>localStorage</code>, any injected script (an XSS bug, a malicious npm package) can read it and send it away. A server-set cookie with <code>HttpOnly; Secure; SameSite=Lax</code> cannot be read by JavaScript at all, yet the browser still sends it automatically. You then defend against CSRF with SameSite and/or a CSRF token.</p>
      ${H.table(['Header from server', 'Effect'], [['<code>Set-Cookie: sid=abc; HttpOnly</code>', 'JS cannot read it via <code>document.cookie</code>'], ['<code>Secure</code>', 'Only sent over HTTPS'], ['<code>SameSite=Lax</code>', 'Not sent on cross-site POSTs (basic CSRF protection)']])}`
    },
    {
      title: 'Checkout wizard: sessionStorage so tabs do not collide',
      html: `<p>A user opens the same checkout in two tabs for two different gifts. With localStorage the tabs would overwrite each other's draft. <code>sessionStorage</code> gives each tab its own copy, survives a refresh, and cleans itself when the tab closes. Remember it is copied (not shared) when a tab is duplicated.</p>`,
      code: `function saveStep(step, data) {
  sessionStorage.setItem('checkout', JSON.stringify({ step: step, data: data }));
}
function restoreStep() {
  const raw = sessionStorage.getItem('checkout');
  return raw ? JSON.parse(raw) : { step: 1, data: {} };
}`
    },
    {
      title: 'Check how much room you have',
      html: `<p>Storage is not unlimited. Ask the browser, and ask it to protect your data from automatic eviction when you store something users would be upset to lose (notes, drafts).</p>`,
      code: `async function checkStorage() {
  const est = await navigator.storage.estimate();            // { usage, quota } in bytes
  console.log(Math.round(est.usage / 1e6) + ' MB used of ' + Math.round(est.quota / 1e6) + ' MB');
  const persisted = await navigator.storage.persist();        // true = browser will not evict this origin
  console.log('persistent storage granted:', persisted);
}`
    }
  ],
  deepDive: `<p><b>🟣 Why localStorage is synchronous (and why that hurts).</b> The spec requires <code>localStorage</code> to be readable immediately from any script, so the browser may block the main thread while it reads from disk the first time. Writing a 3 MB JSON string on every keystroke freezes typing. Fixes: debounce writes, keep a copy in memory, store less, or move to IndexedDB (async) for big data.</p>
  <p><b>Quota and eviction.</b> Each origin gets a quota (a fraction of free disk space). When storage is full, <code>setItem</code> throws <code>QuotaExceededError</code>. Data is "best effort" by default: if the device is low on space, the browser may evict whole origins (least recently used first). <code>navigator.storage.persist()</code> asks to opt out. Safari's anti-tracking can also delete script-written storage after about 7 days without a visit (installed web apps are exempt) - never treat browser storage as a durable source of truth; the server is.</p>
  <p><b>Partitioned storage.</b> Modern browsers partition third-party storage by the top-level site, so an iframe from <code>widgets.com</code> embedded on <code>a.com</code> and on <code>b.com</code> gets <b>separate</b> storage. Safari and Firefox block third-party cookies by default, and Chrome restricts them in several cases, so do not build features on them.</p>
  <p><b>Cookie gotchas.</b> Cookies are matched by <code>Domain</code> + <code>Path</code>; a cookie set for <code>.example.com</code> goes to every subdomain. Large cookies are sent on <i>every</i> request, including images, so they waste bandwidth. <code>HttpOnly</code> cookies can only be created and cleared by the server. A request header size limit (often 8 KB total) means a pile of tracking cookies can cause "400 Request Header Too Large".</p>
  <p><b>IndexedDB specifics.</b> Transactions auto-commit when there are no more pending requests <i>in that tick</i>, so you cannot <code>await</code> a network call in the middle of one (the transaction would close). Schema changes happen only in <code>onupgradeneeded</code>; if another tab holds an older version open, the upgrade is <b>blocked</b> until it closes. Values are copied with the structured-clone algorithm, so functions and DOM nodes cannot be stored. Libraries like <b>idb</b> and <b>Dexie</b> wrap this in promises. Related: the <b>Cache API</b> (stores Request/Response pairs, used by service workers) and the newer Origin Private File System for file-like storage.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI code generators default to <code>localStorage.setItem('token', ...)</code> because that is what most tutorials do. It works in the demo and creates a security hole in production. They also love to store whole objects without try/catch and forget that blocked site data, full disks and enterprise policies can make storage calls throw.</p>
  <p><b>Use AI as a partner:</b> describe your data in plain words - <code>20 MB of cached product images, a theme flag, a login session, a draft email</code> - and ask <code>Which browser storage for each and why? Mention security and quota.</code> Then verify against the table above. It is a fast way to check you did not miss an option.</p>
  <p><b>AI-era use cases:</b> chat apps keep conversation history and embeddings <b>locally in IndexedDB</b> so search works offline, and small on-device models are cached with the Cache API / OPFS because they are hundreds of MB. Knowing quotas and persistence is now a real frontend skill.</p>
  <p><b>What you must still own:</b> classifying data by sensitivity (never put secrets or personal data where scripts can read them), deciding what is a cache (safe to lose) versus a source of truth (must sync to the server), and handling "storage unavailable" as a normal case.</p>`,
  problems: [
    {
      title: 'Pick the Storage for a Need', level: 'Easy', tags: ['storage', 'decision', 'cookies', 'IndexedDB'], companies: ['Amazon', 'Atlassian'],
      statement: `<p>Write <code>pickStorage(need)</code> that takes a description object and returns the best browser storage as a string. The need has: <code>needsServer</code> (server must read it on every request), <code>sensitive</code> (a secret such as a login token), <code>survivesClose</code> (must still exist after the browser closes), <code>perTab</code> (each tab has its own copy), <code>sizeMB</code> and <code>queryable</code> (needs lookups by index). Possible answers: <code>'HttpOnly cookie'</code>, <code>'cookie'</code>, <code>'memory'</code>, <code>'IndexedDB'</code>, <code>'sessionStorage'</code>, <code>'localStorage'</code>.</p>`,
      constraints: `Pure function, no browser APIs. sizeMB between 0 and 500. Exactly one answer per input.`,
      example: `${H.table(['Need', 'Answer', 'Why'], [['login session cookie', '<span class="c-g">HttpOnly cookie</span>', 'server needs it + secret'], ['dark mode flag', '<span class="c-g">localStorage</span>', 'tiny, survives close'], ['wizard draft per tab', '<span class="c-g">sessionStorage</span>', 'per tab, dies with tab'], ['50 MB offline maps', '<span class="c-g">IndexedDB</span>', 'big, async']])}`,
      brute: {
        why: `<p>Beginners put everything in localStorage. That leaks secrets to any script (XSS), cannot hold 50 MB (5 MB limit, blocks the thread) and wrongly shares per-tab state between tabs.</p>`,
        code: `function pickStorageNaive(need) {
  return 'localStorage';   // "works" in the demo, wrong for secrets, big data and per-tab state
}`
      },
      mcq: { q: 'A short-lived access token that only your JavaScript sends in an Authorization header. Best home?', options: ['In memory (a JS variable), refreshed via an HttpOnly cookie', 'localStorage', 'A readable cookie', 'IndexedDB'], answer: 0, explain: 'Memory cannot be read by a script injected later (it is gone on refresh, which the refresh cookie solves). localStorage, readable cookies and IndexedDB are all readable by injected scripts.' },
      hints: [
        `<p>Hint 1: order the questions from "most restrictive" to "least": security and server needs first, then size, then lifetime.</p>`,
        `<p>Hint 2: sensitive + needsServer → HttpOnly cookie. sensitive but server does not need it automatically → memory. Large or queryable → IndexedDB.</p>`,
        `<p>Hint 3: after those, if it must not survive closing the browser choose sessionStorage when per-tab, otherwise memory; else localStorage. Write the rules as early returns.</p>`
      ],
      solution: {
        approach: `<p>A short chain of early returns, most important rule first. The security rule comes before size and lifetime so a "sensitive and big" request still avoids script-readable storage.</p>`,
        code: {
          lang: 'js', run: true, code: `function pickStorage(n) {
  if (n.sensitive) return n.needsServer ? 'HttpOnly cookie' : 'memory';   // never script-readable
  if (n.needsServer) return 'cookie';
  if (n.sizeMB > 4 || n.queryable) return 'IndexedDB';                    // beyond ~5 MB or needs an index
  if (!n.survivesClose) return n.perTab ? 'sessionStorage' : 'memory';
  return 'localStorage';
}

const cases = [
  { name: 'login session', needsServer: true, sensitive: true, survivesClose: true, perTab: false, sizeMB: 0.001 },
  { name: 'dark mode flag', needsServer: false, sensitive: false, survivesClose: true, perTab: false, sizeMB: 0.001 },
  { name: 'wizard draft', needsServer: false, sensitive: false, survivesClose: false, perTab: true, sizeMB: 0.05 },
  { name: 'offline maps', needsServer: false, sensitive: false, survivesClose: true, perTab: false, sizeMB: 50 },
  { name: 'language for server rendering', needsServer: true, sensitive: false, survivesClose: true, perTab: false, sizeMB: 0.001 },
  { name: 'access token for fetch headers', needsServer: false, sensitive: true, survivesClose: false, perTab: true, sizeMB: 0.002 }
];
cases.forEach(function (c) { console.log(c.name + ' -> ' + pickStorage(c)); });`
        },
        complexity: `<p>Time and space O(1). The value is in the ordering of the rules.</p>`,
        followUps: ['Add a TTL: how would you expire a localStorage entry after 7 days?', 'How would the answer change for a native-like PWA installed on a phone?']
      }
    }
  ]
});

/* ============================ TOPIC 3: IntersectionObserver ============================ */
topics.push({
  title: 'IntersectionObserver: Knowing When Things Scroll Into View',
  analogy: `<p>Picture a long shop window with posters behind it. The old way (a <code>scroll</code> listener) is like <b>walking outside every half second to check</b> which posters you can see - tiring and slow. <code>IntersectionObserver</code> is a <b>security guard</b> who stands there and taps your shoulder only when a poster <b>enters or leaves</b> the window. You do nothing the rest of the time.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Sometimes you need to know "is this element visible right now?": to load an image only when it is near the screen (<b>lazy loading</b>), to load the next page of a list when the user reaches the bottom (<b>infinite scroll</b>), to count an ad as "seen", or to pause a video that scrolled away. Doing it with <code>scroll</code> events and <code>getBoundingClientRect()</code> runs on every scroll tick and forces the browser to recalculate layout again and again. <code>IntersectionObserver</code> lets the browser do the maths and call you <b>only when something changes</b>.</p>
  <p><b>🔵 How you use it.</b></p>
  <pre>const io = new IntersectionObserver(callback, { root, rootMargin, threshold });
io.observe(element);      // start watching
io.unobserve(element);    // stop watching one
io.disconnect();          // stop watching all</pre>
  <ul>
    <li><b>callback(entries, observer)</b> gets a list of <i>entries</i>, one per element whose state changed. Each entry has <code>target</code>, <code>isIntersecting</code> (true/false), <code>intersectionRatio</code> (0 to 1, how much is visible), <code>boundingClientRect</code>.</li>
    <li><b>root</b>: the "window" to measure against. <code>null</code> (default) means the browser viewport. You can pass a scrolling container instead.</li>
    <li><b>rootMargin</b>: grows or shrinks that window, like CSS margin: <code>'200px'</code> means "treat things 200px below the screen as already visible" - perfect for <b>pre-loading before the user arrives</b>.</li>
    <li><b>threshold</b>: at what visible fraction to fire. <code>0</code> = the first pixel, <code>1</code> = fully visible, <code>[0, 0.5, 1]</code> = fire at each of those.</li>
  </ul>
  <p><b>The callback also fires once right after <code>observe()</code></b> with the starting state - so you get "already visible" elements for free. Beginners often forget this and think the callback only runs on scroll.</p>
  <p><b>Infinite scroll with a sentinel.</b> Put an empty <code>&lt;div id="sentinel"&gt;</code> after the last item. Observe it. When it becomes visible, load the next page, append items (the sentinel moves down), and wait for it to appear again. Add a <code>loading</code> flag so you never fetch two pages at once, and stop observing when there are no more pages.</p>`,
  clues: [
    '"load images only when they are about to be visible" / "lazy load below the fold"',
    '"infinite scroll" / "load more when the user reaches the bottom" → sentinel element + observer',
    '"track ad impressions / analytics: element was 50% visible for 1 second"',
    '"scroll listener is janky" / "avoid <code>getBoundingClientRect</code> on scroll" → IntersectionObserver',
    '"play the video only while visible" / "animate when it scrolls into view"',
    '"sticky header changes style when the page is scrolled" → observe a 1px sentinel at the top'
  ],
  code: [
    {
      lang: 'js', title: 'Lazy-load images (browser)', code: `// HTML: <img data-src="photo-big.jpg" alt="..." width="400" height="300">
// Start loading 200px BEFORE the image reaches the screen, so users rarely see a blank box.
const imageObserver = new IntersectionObserver(function (entries, observer) {
  entries.forEach(function (entry) {
    if (!entry.isIntersecting) return;          // it just LEFT the view, ignore
    const img = entry.target;
    img.src = img.dataset.src;                   // this starts the real download
    observer.unobserve(img);                     // job done: stop watching this one
  });
}, { rootMargin: '200px 0px' });

document.querySelectorAll('img[data-src]').forEach(function (img) {
  imageObserver.observe(img);
});
// Note: for plain images the native attribute <img loading="lazy"> needs no JavaScript at all.`
    },
    {
      lang: 'js', title: 'Infinite scroll with a sentinel (browser)', code: `function setupInfiniteScroll(listEl, sentinelEl, fetchPage) {
  let page = 0;
  let loading = false;     // guard: never run two loads at once
  let hasMore = true;

  const observer = new IntersectionObserver(async function (entries) {
    const entry = entries[0];
    if (!entry.isIntersecting || loading || !hasMore) return;
    loading = true;
    try {
      const items = await fetchPage(page + 1);       // e.g. fetch('/api/feed?page=2')
      items.forEach(function (item) {
        const li = document.createElement('li');
        li.textContent = item.title;
        listEl.appendChild(li);                       // sentinel is pushed further down
      });
      page++;
      if (items.length === 0) {                       // empty page = end of the feed
        hasMore = false;
        observer.disconnect();
      }
    } catch (err) {
      console.error('load failed, will retry when sentinel shows again', err);
    } finally {
      loading = false;
    }
  }, { rootMargin: '300px' });                        // start the next load a bit early

  observer.observe(sentinelEl);
  return function cleanup() { observer.disconnect(); };
}`
    },
    {
      lang: 'js', run: true, title: 'Runnable: the maths the browser does (ratio of an element inside a viewport)', code: `// Rectangles are { top, bottom } in pixels measured from the top of the page.
function visibleRatio(el, viewport) {
  const overlap = Math.min(el.bottom, viewport.bottom) - Math.max(el.top, viewport.top);
  const height = el.bottom - el.top;
  return Math.max(0, overlap) / height;
}

// Pretend scroll through 5 cards of height 100, each starting 120px apart, in a 300px-tall screen.
const cards = [0, 1, 2, 3, 4].map(function (i) { return { id: 'card' + i, top: i * 120, bottom: i * 120 + 100 }; });
const state = {};          // remembers who was visible last time (observers only report CHANGES)

[0, 100, 200, 300].forEach(function (scrollTop) {
  const viewport = { top: scrollTop, bottom: scrollTop + 300 };
  const entries = [];
  cards.forEach(function (c) {
    const ratio = visibleRatio(c, viewport);
    const nowVisible = ratio > 0;
    if (state[c.id] !== nowVisible) {                      // changed? then report an "entry"
      entries.push(c.id + ': isIntersecting=' + nowVisible + ', ratio=' + ratio.toFixed(2));
      state[c.id] = nowVisible;
    }
  });
  console.log('scrollTop=' + scrollTop + ' -> ' + (entries.length ? entries.join(' | ') : 'no changes, callback NOT called'));
});`
    },
    {
      lang: 'js', title: 'Impression tracker: "50% visible for 1 second" (browser)', code: `const timers = new Map();   // element -> timeout id

const impressionObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    const el = entry.target;
    if (entry.isIntersecting) {
      // At least half visible: start a 1-second timer.
      timers.set(el, setTimeout(function () {
        sendAnalytics({ type: 'impression', id: el.dataset.adId });
        impressionObserver.unobserve(el);        // count each ad only once
        timers.delete(el);
      }, 1000));
    } else if (timers.has(el)) {
      clearTimeout(timers.get(el));              // scrolled away too early
      timers.delete(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-ad-id]').forEach(function (el) { impressionObserver.observe(el); });

function sendAnalytics(event) {
  // sendBeacon survives page unload and does not block
  navigator.sendBeacon('/analytics', JSON.stringify(event));
}`
    }
  ],
  codeTitle: ['Lazy images', 'Infinite scroll', 'How visibility is computed', 'Ad impressions'],
  viz: [
    {
      title: 'Entries crossing the viewport as you scroll',
      input: '10 4',
      inputLabel: 'Items and viewport size (e.g. 10 4)',
      gen: function (input) {
        var p = String(input || '').trim().split(/[\s,]+/).map(Number);
        var n = p[0], k = p[1];
        if (p.length < 2 || isNaN(n) || isNaN(k) || n < 4 || n > 16 || k < 2 || k >= n) throw new Error('Enter items and viewport size, e.g. "10 4" (items 4-16, viewport smaller than items)');
        var labels = [];
        for (var i = 0; i < n; i++) labels.push('#' + (i + 1));
        var frames = [], prevVis = {};
        for (var top = 0; top <= n - k; top++) {
          var hl = {}, rows = [], vis = {};
          for (var j = 0; j < n; j++) {
            var inside = j >= top && j < top + k;
            vis[j] = inside;
            if (inside) hl[j] = 'win';
            var was = top === 0 ? false : prevVis[j];
            if (inside && !was) { hl[j] = 'ok'; rows.push([labels[j], '<span class="c-g">true</span>', top === 0 ? 'initial callback after observe()' : 'entered the viewport']); }
            if (!inside && was) { hl[j] = 'bad'; rows.push([labels[j], '<span class="c-r">false</span>', 'left the viewport']); }
          }
          var narr = top === 0
            ? 'We called <code>observe()</code> on all ' + n + ' items. The browser instantly reports the starting state: the <b>' + k + '</b> items inside the viewport are <code>isIntersecting: true</code> (green).'
            : 'Scroll by one row. Only items whose state <b>changed</b> appear in <code>entries</code>. Items that stayed visible (blue) or stayed hidden are <b>not</b> reported.';
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'List (blue window = viewport)', values: labels, hl: hl, range: [top, top + k - 1], ptr: (function () { var o = {}; o[top] = 'top'; return o; })() },
            { type: 'table', label: 'entries passed to the callback', columns: ['target', 'isIntersecting', 'why'], rows: rows.length ? rows : [['(none)', '-', 'callback not called']] },
            { type: 'vars', vals: { scrollTop: top, visibleCount: k, entriesInCallback: rows.length }, hl: { entriesInCallback: rows.length ? 'cur' : '' } }
          ] });
          prevVis = vis;
        }
        frames.push({ narr: 'Reached the end of the list. Notice the browser never ran code for rows that did not change - that is why it is cheaper than a <code>scroll</code> handler.', parts: [{ type: 'array', label: 'Final position', values: labels, hl: (function () { var o = {}; for (var q = n - k; q < n; q++) o[q] = 'win'; return o; })(), range: [n - k, n - 1] }] });
        return frames;
      }
    },
    {
      title: 'Infinite scroll with a sentinel',
      input: '3',
      inputLabel: 'Pages of 4 items to scroll through (1-4)',
      gen: function (input) {
        var pages = parseInt(String(input).trim(), 10);
        if (isNaN(pages) || pages < 1 || pages > 4) throw new Error('Type a number from 1 to 4');
        var frames = [], items = [], VIEW = 4;
        function mk(count) { var v = []; for (var i = 1; i <= count; i++) v.push(String(i)); v.push('S'); return v; }
        // first page is rendered with the initial HTML
        items = 4;
        frames.push({ narr: 'First 4 items are on the page, plus an invisible <b>sentinel S</b> (an empty div) at the end. We called <code>observer.observe(sentinel)</code>. The sentinel is <b>inside</b> the viewport (blue), so the observer fires right away.', parts: [
          { type: 'array', label: 'List + sentinel', values: mk(items), hl: { 4: 'win', 0: 'win', 1: 'win', 2: 'win', 3: 'win' }, range: [0, 4] },
          { type: 'vars', vals: { loading: false, page: 1, hasMore: true } }
        ] });
        for (var p = 2; p <= pages + 1; p++) {
          var v = mk(items), top = Math.max(0, items - VIEW + 1);
          var rangeHl = {}; for (var a = top; a <= items; a++) rangeHl[a] = 'win';
          frames.push({ narr: 'The user scrolls down. The sentinel enters the viewport -> callback runs with <code>isIntersecting: true</code>. We set <code>loading = true</code> so a second callback cannot start a second fetch.', parts: [
            { type: 'array', label: 'List + sentinel', values: v, hl: (function () { var o = rangeHl; o[items] = 'cur'; return o; })(), range: [top, items], ptr: (function () { var o = {}; o[items] = 'S'; return o; })() },
            { type: 'queue', label: 'Network', items: ['GET /feed?page=' + p], hl: { 0: 'cur' }, frontLabel: 'in flight' },
            { type: 'vars', vals: { loading: true, page: p - 1, hasMore: true }, hl: { loading: 'cur' } }
          ] });
          if (p === pages + 1) {
            frames.push({ narr: 'The server returns an <b>empty page</b>. That means the feed is finished: set <code>hasMore = false</code> and call <code>observer.disconnect()</code> so we stop reacting. Show an "end of feed" message.', parts: [
              { type: 'array', label: 'List (final)', values: (function () { var r = []; for (var i = 1; i <= items; i++) r.push(String(i)); return r; })(), hl: { 0: 'done' } },
              { type: 'vars', vals: { loading: false, page: pages, hasMore: false }, hl: { hasMore: 'bad' } }
            ] });
            break;
          }
          items += 4;
          frames.push({ narr: 'Page ' + p + ' arrived. We append 4 more items <b>before</b> the sentinel, which pushes the sentinel down and out of the viewport. <code>loading = false</code> again.', parts: [
            { type: 'array', label: 'List + sentinel', values: mk(items), hl: (function () { var o = {}; for (var i = items - 4; i < items; i++) o[i] = 'ok'; o[items] = 'done'; return o; })(), range: [Math.max(0, items - 7), items - 4] },
            { type: 'vars', vals: { loading: false, page: p, hasMore: true }, hl: { page: 'ok' } }
          ] });
        }
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'Lazy images: rootMargin buys you a head start',
      html: `<p>Without <code>rootMargin</code> the image starts downloading only when its first pixel appears, so fast scrollers see a grey box. With <code>rootMargin: '200px'</code> the browser pretends the screen is 200px taller at the bottom, so downloads start about one screen early. Always set <code>width</code> and <code>height</code> on the image so it reserves space and does not shift the page (that hurts CLS, a Core Web Vital).</p>`,
      code: `const io = new IntersectionObserver(loadImage, { rootMargin: '200px 0px' });
function loadImage(entries, obs) {
  entries.forEach(function (e) {
    if (!e.isIntersecting) return;
    e.target.src = e.target.dataset.src;
    obs.unobserve(e.target);
  });
}`
    },
    {
      title: 'Sticky header shadow without scroll events',
      html: `<p>Place a 1px tall empty div at the very top of the page. Observe it. When it <b>leaves</b> the viewport (user scrolled down), add a "scrolled" class to the header (shadow, smaller logo). When it comes back, remove the class. No scroll listener needed.</p>`,
      code: `const topSentinel = document.querySelector('#top-sentinel');
const header = document.querySelector('header');
new IntersectionObserver(function (entries) {
  // isIntersecting === true means we are still at the very top
  header.classList.toggle('scrolled', !entries[0].isIntersecting);
}).observe(topSentinel);`
    },
    {
      title: 'Pause a video that is off screen',
      html: `<p>Autoplaying videos waste battery and data when nobody sees them. Use a threshold of <b>0.5</b>: play when at least half the video is visible, pause otherwise. The same trick works for CSS animations and canvas drawing.</p>`,
      code: `const videoObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (e) {
    if (e.isIntersecting) e.target.play(); else e.target.pause();
  });
}, { threshold: 0.5 });
document.querySelectorAll('video').forEach(function (v) { videoObserver.observe(v); });`
    },
    {
      title: 'Observing inside a scrolling box (custom root)',
      html: `<p>If the list scrolls inside a fixed-height <code>&lt;div&gt;</code> (a chat window, a table body), the page viewport never changes. Pass that div as <code>root</code> so the observer measures against the box, not the screen. The root must be an <b>ancestor</b> of the targets.</p>`,
      code: `const chatBox = document.querySelector('#chat-scroll');
const io = new IntersectionObserver(function (entries) {
  if (entries[0].isIntersecting) loadOlderMessages();
}, { root: chatBox, rootMargin: '100px 0px 0px 0px' });   // watch the TOP edge of the chat
io.observe(document.querySelector('#oldest-sentinel'));
function loadOlderMessages() { console.log('fetch older messages'); }`
    }
  ],
  deepDive: `<p><b>🟣 What the browser actually does.</b> Observers are computed during the browser's <b>rendering step</b> (after layout), not on every scroll event, and the callback is delivered asynchronously (as a task shortly after). So visibility is slightly delayed but cheap. Because it reuses layout the browser has already done, it avoids the <b>forced synchronous layout</b> ("layout thrashing") that comes from calling <code>getBoundingClientRect()</code> inside a scroll handler.</p>
  <p><b>Thresholds and tall elements.</b> If an element is taller than the viewport, it can never reach <code>intersectionRatio: 1</code>, so a threshold of 1 would never fire. Use a small threshold, or compute from <code>intersectionRect</code>. The ratio is relative to the <i>target's own</i> area, not the root's.</p>
  <p><b>Common mistakes.</b> (1) Forgetting that the callback fires on the first observe, so "load on enter" code can run for elements already visible - usually fine, sometimes not. (2) Not unobserving after one-time work (leaks memory and CPU). (3) Using <code>isIntersecting</code> when you need <code>intersectionRatio</code>, or the opposite. (4) Two quick page loads because there is no <code>loading</code> guard. (5) Observers on elements with <code>display: none</code> never intersect. (6) A sentinel with <code>height: 0</code> may not report as intersecting in some layouts; give it 1px.</p>
  <p><b>Infinite scroll's real costs.</b> The DOM grows forever: after a few thousand items memory and layout time explode, and the footer becomes unreachable. Production feeds use <b>virtualization</b> (render only visible rows, see the performance module) or "windowing" and keep the scroll position and the URL (page cursor) so Back works. For accessibility, offer a visible "Load more" button as an alternative, and move focus carefully.</p>
  <p><b>Related tools.</b> Native <code>loading="lazy"</code> for images and iframes, CSS <code>content-visibility: auto</code> to skip rendering off-screen sections, <b>IntersectionObserver v2</b> (true visibility, detects overlays, used for ad-fraud checks, limited support), and the newer CSS scroll-driven animations for effects you used to script.</p>`,
  aiEra: `<p><b>What AI changes:</b> asked for "infinite scroll", AI often produces a <code>window.addEventListener('scroll')</code> handler with <code>getBoundingClientRect</code> or even <code>scrollTop + clientHeight &gt;= scrollHeight</code> maths. It works, but janks on low-end phones. Asking for "use IntersectionObserver with a sentinel and a loading guard" produces much better code.</p>
  <p><b>Use AI as a partner:</b> have it generate a fake paginated API (an async function returning 20 items with random delays and a failure on page 3), then test your sentinel logic against it. Ask: <code>Which edge cases could make this load the same page twice or skip a page?</code></p>
  <p><b>AI-era use cases:</b> chat UIs that load older messages as you scroll up (observer on the top sentinel), token-streaming answers that auto-scroll to the bottom only while the user is already at the bottom, and "was this AI answer actually seen" feedback metrics all rely on this API.</p>
  <p><b>What you must still own:</b> choosing the loading guard and error behaviour, keeping lists accessible and bounded (virtualization), and measuring the real effect on Core Web Vitals instead of assuming "lazy" always wins - lazy-loading your hero (LCP) image makes the page slower.</p>`,
  problems: [
    {
      title: 'Infinite Scroll with IntersectionObserver', level: 'Medium', tags: ['IntersectionObserver', 'infinite scroll', 'pagination', 'guard flags'], companies: ['Meta', 'Twitter', 'Swiggy'],
      statement: `<p>Write <code>createFeed(fetchPage, render)</code> that returns an object with <code>onSentinelVisible()</code>. Your browser code will call it from an IntersectionObserver callback when the bottom sentinel is visible. It must: (1) load the next page via <code>fetchPage(page)</code> (pages start at 1), (2) call <code>render(items)</code>, (3) never run two loads at the same time even if the sentinel fires twice, (4) stop for good after an empty page, and (5) after a <b>failed</b> load, allow a later retry. To keep it testable, no DOM code goes inside this function.</p>`,
      constraints: `Pages hold at most 50 items. <code>fetchPage</code> returns a Promise of an array. The sentinel may fire many times per second while fetching.`,
      example: `<p>Sentinel fires three times in a row while page 1 is loading, then again after it finishes.</p>
        ${H.table(['Call', 'State', 'Action'], [['1st', 'idle', '<span class="c-g">fetch page 1</span>'], ['2nd, 3rd', 'loading', '<span class="c-r">ignored (guard)</span>'], ['after page 1 renders', 'idle', '<span class="c-g">fetch page 2</span>'], ['page returns []', 'done', 'never fetch again']])}`,
      brute: {
        why: `<p>The naive handler fetches on every visible event. When the sentinel fires twice during one slow request, the same page is fetched and appended twice (duplicate items), and after the end it keeps hitting the server forever.</p>`,
        code: `function createFeedNaive(fetchPage, render) {
  let page = 1;
  return {
    onSentinelVisible: async function () {
      const items = await fetchPage(page);   // no guard: two calls fetch the same page
      render(items);
      page++;
    }
  };
}`
      },
      mcq: { q: 'Why do we need a <code>loading</code> flag even though IntersectionObserver only fires on changes?', options: ['Appending items may keep the sentinel visible and fire again before the fetch ends', 'It makes fetch faster', 'Because observers never fire twice', 'To clear the cache'], answer: 0, explain: 'The sentinel can leave and re-enter the viewport (or be visible again after content appears) while a slow request is still running, so without a guard you start a second request for the same page.' },
      hints: [
        `<p>Hint 1: the observer tells you <i>when</i>, your code decides <i>whether</i>. Think of three states: idle, loading, done.</p>`,
        `<p>Hint 2: keep <code>page</code>, <code>loading</code>, <code>done</code> in a closure. Return immediately if loading or done.</p>`,
        `<p>Hint 3: use try/catch/finally: increase <code>page</code> only on success, set <code>loading = false</code> in finally (so errors allow a retry), and set <code>done = true</code> when the array is empty.</p>`
      ],
      solution: {
        approach: `<p>A small state machine with the three flags. We advance the page counter only after a successful render, so a failed fetch retries the <i>same</i> page next time. <code>finally</code> always releases the lock.</p>`,
        code: {
          lang: 'js', run: true, code: `function createFeed(fetchPage, render) {
  let page = 1;
  let loading = false;
  let done = false;
  return {
    onSentinelVisible: async function () {
      if (loading || done) return 'ignored';
      loading = true;
      try {
        const items = await fetchPage(page);
        if (items.length === 0) { done = true; return 'finished'; }
        render(items);
        page++;                      // only after success
        return 'loaded page ' + (page - 1);
      } catch (err) {
        return 'failed, will retry page ' + page;
      } finally {
        loading = false;
      }
    }
  };
}

// Test: page 2 fails once, page 4 is empty.
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
let failedOnce = false;
async function fakePage(p) {
  await sleep(20);
  if (p === 2 && !failedOnce) { failedOnce = true; throw new Error('boom'); }
  return p >= 4 ? [] : [p * 10 + 1, p * 10 + 2];
}
const all = [];
const feed = createFeed(fakePage, function (items) { all.push.apply(all, items); });

(async function () {
  const first = feed.onSentinelVisible();          // starts loading page 1
  console.log('during load:', await feed.onSentinelVisible(), '/', await feed.onSentinelVisible());
  console.log(await first);
  console.log(await feed.onSentinelVisible());     // page 2 fails
  console.log(await feed.onSentinelVisible());     // retry page 2 works
  console.log(await feed.onSentinelVisible());     // page 3
  console.log(await feed.onSentinelVisible());     // page 4 empty -> finished
  console.log(await feed.onSentinelVisible());     // done forever
  console.log('items:', JSON.stringify(all));
})();`
        },
        complexity: `<p>O(1) per sentinel event plus the cost of fetching/rendering one page. Memory grows with items rendered (use virtualization for very long lists).</p>`,
        followUps: ['How do you prevent duplicates if new posts are inserted at the top while paging by number? (cursor-based pagination)', 'How would you also load OLDER content when scrolling up and keep the scroll position stable?']
      }
    }
  ]
});

/* ============================ TOPIC 4: Mutation + Resize Observers ============================ */
topics.push({
  title: 'MutationObserver and ResizeObserver: Watching the DOM and Box Sizes',
  analogy: `<p>A <b>MutationObserver</b> is a <b>CCTV camera with a notebook</b> pointed at one room. Whenever someone moves a chair, paints a wall or writes on a whiteboard, the camera writes a line in the notebook. It does not phone you for each change - when the busy moment is over, it hands you the <b>whole notebook at once</b>.</p>
  <p>A <b>ResizeObserver</b> is a <b>tailor with a tape measure</b> standing next to one box. Whatever makes the box bigger or smaller - the window, a sidebar opening, longer text - the tailor says "its size changed, now it is 480 wide". The old <code>window.resize</code> event only knew when the <i>window</i> changed, not your box.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> You do not always control the DOM. A chat app adds messages, a third-party script injects a banner, a rich-text editor changes text, a sidebar collapses. Two observers let you <b>react</b> instead of <b>polling</b> with <code>setInterval</code>.</p>
  <p><b>🔵 MutationObserver - "something in the tree changed".</b></p>
  <pre>const mo = new MutationObserver(function (records, observer) { ... });
mo.observe(targetNode, { childList: true, attributes: true, characterData: true, subtree: true });
mo.disconnect();</pre>
  ${H.table(['Option', 'Watches for', 'Record type'], [
    ['<code>childList: true</code>', 'children added or removed', '<code>"childList"</code> (see <code>addedNodes</code>, <code>removedNodes</code>)'],
    ['<code>attributes: true</code>', 'attribute changes (class, src, aria-*)', '<code>"attributes"</code> (<code>attributeName</code>, <code>oldValue</code>)'],
    ['<code>characterData: true</code>', 'text node content changes', '<code>"characterData"</code>'],
    ['<code>subtree: true</code>', 'also all descendants, not just the target', '(widens the other three)'],
    ['<code>attributeFilter: ["class"]</code>', 'only these attributes', '(cuts noise)']
  ])}
  <p>The key idea: records are <b>batched</b>. Many changes in the same piece of synchronous code produce <b>one callback</b> afterwards, in a <b>microtask</b> (just after your current JavaScript finishes, before the browser paints). So your callback sees the final DOM, plus a list of what happened.</p>
  <p><b>🔵 ResizeObserver - "this box changed size".</b></p>
  <pre>const ro = new ResizeObserver(function (entries) {
  for (const entry of entries) {
    const w = entry.contentRect.width;   // or entry.contentBoxSize[0].inlineSize
  }
});
ro.observe(element);</pre>
  <p>It fires once when you start observing (initial size) and then whenever the element's content box or border box changes - for any reason. It runs <b>after layout, before paint</b>, so you can adjust things without a visible flicker. Typical uses: switch a component to a compact layout based on <i>its own</i> width (before CSS container queries were common), resize a <code>&lt;canvas&gt;</code> to match its box, re-measure a virtualized list row, keep a chart sized to its card.</p>
  <p><b>Rule:</b> prefer plain CSS (media queries, container queries, flexbox) when it can do the job. Reach for observers when <b>JavaScript must know</b> about the change.</p>`,
  clues: [
    '"detect when an element is added to / removed from the page" (third-party widget, ads, cookie banner) → MutationObserver',
    '"auto-scroll the chat when a new message appears" → MutationObserver <code>childList</code> on the message list',
    '"react to a class/attribute change that I do not control" → MutationObserver with <code>attributeFilter</code>',
    '"component should adapt to its container, not the window" → ResizeObserver (or CSS container queries)',
    '"canvas looks blurry after the layout changed" → ResizeObserver + devicePixelRatio',
    '"ResizeObserver loop completed with undelivered notifications" → you changed the observed size inside the callback'
  ],
  code: [
    {
      lang: 'js', title: 'Chat auto-scroll only if the user is already at the bottom (browser)', code: `const list = document.querySelector('#messages');

// Remember whether the user was "stuck to the bottom" BEFORE new messages arrive.
function isAtBottom() {
  return list.scrollHeight - list.scrollTop - list.clientHeight < 40;   // within 40px
}

let stick = true;
list.addEventListener('scroll', function () { stick = isAtBottom(); });

const observer = new MutationObserver(function (records) {
  // One callback for the whole batch: count how many messages were added.
  let added = 0;
  records.forEach(function (r) { added += r.addedNodes.length; });
  if (added > 0 && stick) list.scrollTop = list.scrollHeight;   // follow the conversation
  // If the user scrolled up to read, do NOT yank them down; show a "New messages" pill instead.
});

observer.observe(list, { childList: true });    // no subtree: only direct children`
    },
    {
      lang: 'js', run: true, title: 'Runnable: how batching works (a mini MutationObserver)', code: `// A tiny imitation: every change adds a record; ONE microtask delivers them all.
class MiniMutationObserver {
  constructor(callback) { this.callback = callback; this.records = []; this.scheduled = false; }
  record(rec) {
    this.records.push(rec);
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => {                     // runs after the current synchronous code ends
        const batch = this.records;
        this.records = [];
        this.scheduled = false;
        this.callback(batch, this);
      });
    }
  }
}

const log = [];
const mo = new MiniMutationObserver(function (records) {
  console.log('callback got ' + records.length + ' records:', records.map(function (r) { return r.type; }).join(', '));
});

// Three DOM changes in the same synchronous block:
mo.record({ type: 'childList', added: 1 });
mo.record({ type: 'attributes', name: 'class' });
mo.record({ type: 'characterData' });
console.log('synchronous code finished (callback has NOT run yet)');

// A callback that changes the DOM again triggers a NEW batch - this is how infinite loops happen.
let rounds = 0;
const loopy = new MiniMutationObserver(function (records) {
  rounds++;
  console.log('loopy round', rounds);
  if (rounds < 3) loopy.record({ type: 'attributes', name: 'data-x' });   // BAD in real life without a guard
});
Promise.resolve().then(function () { loopy.record({ type: 'attributes', name: 'data-x' }); });`
    },
    {
      lang: 'js', title: 'Watch for an unwanted element injected into the page (browser)', code: `// Example: a third-party script keeps re-adding a promo banner. Remove it as soon as it appears.
const observer = new MutationObserver(function (records) {
  records.forEach(function (r) {
    r.addedNodes.forEach(function (node) {
      // Only element nodes (nodeType 1), not text nodes.
      if (node.nodeType === 1 && node.matches('.promo-banner')) node.remove();
    });
  });
});
observer.observe(document.body, { childList: true, subtree: true });

// Stop watching when you no longer need it (leaks and CPU use otherwise).
window.addEventListener('pagehide', function () { observer.disconnect(); });`
    },
    {
      lang: 'js', title: 'ResizeObserver: layout classes and a sharp canvas (browser)', code: `const card = document.querySelector('.card');
const canvas = card.querySelector('canvas');

const ro = new ResizeObserver(function (entries) {
  for (const entry of entries) {
    const width = entry.contentRect.width;
    // 1) Choose a layout by the card's OWN width
    card.dataset.layout = width < 400 ? 'compact' : width < 800 ? 'medium' : 'wide';

    // 2) Keep the canvas pixel-sharp on high-density screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(entry.contentRect.height * dpr);
    redraw(canvas);
  }
});
ro.observe(card);

function redraw(c) { c.getContext('2d').clearRect(0, 0, c.width, c.height); }`
    },
    {
      lang: 'js', run: true, title: 'Runnable: only react when the breakpoint actually changes', code: `// Many resize events -> few real layout changes. Return a function that reports only changes.
function createBreakpointWatcher(breakpoints, onChange) {
  // breakpoints sorted from small to large: [{ name, min }]
  let current = null;
  return function update(width) {
    let active = breakpoints[0].name;
    breakpoints.forEach(function (b) { if (width >= b.min) active = b.name; });
    if (active !== current) {
      const previous = current;
      current = active;
      onChange(active, previous, width);
    }
  };
}

const update = createBreakpointWatcher(
  [{ name: 'compact', min: 0 }, { name: 'medium', min: 600 }, { name: 'wide', min: 1000 }],
  function (now, before, w) { console.log('layout ' + (before || 'none') + ' -> ' + now + ' at ' + w + 'px'); }
);

// The window is dragged smoothly from 320px up to 1200px and back down to 580px.
const widths = [];
for (let w = 320; w <= 1200; w += 40) widths.push(w);
for (let w = 1160; w >= 580; w -= 40) widths.push(w);
widths.forEach(update);
console.log(widths.length + ' resize events, layout re-rendered only when the name changed');`
    }
  ],
  codeTitle: ['Chat auto-scroll', 'Batching explained', 'Remove injected banner', 'ResizeObserver basics', 'Breakpoint watcher'],
  viz: [
    {
      title: 'MutationObserver: many changes, one batched callback',
      input: 'append,attr,text,append',
      inputLabel: 'DOM changes (comma list of: append, remove, attr, text)',
      gen: function (input) {
        var ops = String(input || '').split(/[,\s]+/).filter(Boolean).map(function (s) { return s.toLowerCase(); }).slice(0, 6);
        var INFO = {
          append: { code: 'list.appendChild(li)', rec: 'childList: +1 node' },
          remove: { code: 'list.firstChild.remove()', rec: 'childList: -1 node' },
          attr: { code: 'list.className = "busy"', rec: 'attributes: class' },
          text: { code: 'label.firstChild.data = "5 new"', rec: 'characterData' }
        };
        if (!ops.length) throw new Error('Enter changes like: append,attr,text');
        for (var i = 0; i < ops.length; i++) if (!INFO[ops[i]]) throw new Error('Allowed words: append, remove, attr, text');
        var nodes = [
          { id: 'DOM', label: 'DOM #chat', x: 14, y: 22, shape: 'box' },
          { id: 'MO', label: 'MutationObserver', x: 50, y: 22, shape: 'box' },
          { id: 'CB', label: 'your callback', x: 86, y: 22, shape: 'box' }
        ];
        var edges = [['DOM', 'MO', 'records'], ['MO', 'CB', 'batch']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Who tells whom', directed: true, height: 40, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var frames = [], queue = [];
        frames.push({ narr: 'We called <code>observer.observe(chat, { childList: true, attributes: true, characterData: true, subtree: true })</code>. The notebook (record queue) is empty. Now our code makes ' + ops.length + ' DOM change(s) in one go.', parts: [g({ MO: 'cur' }), { type: 'queue', label: 'Record queue (notebook)', items: [], frontLabel: 'first', backLabel: 'last' }] });
        ops.forEach(function (op, k) {
          queue.push(INFO[op].rec);
          var h = {}; h[queue.length - 1] = 'ok';
          frames.push({ narr: 'Change ' + (k + 1) + ': <code>' + INFO[op].code + '</code>. The DOM updates immediately, and the browser writes a <b>record</b> in the notebook. <b>Your callback does not run yet.</b>', parts: [g({ DOM: 'cur', MO: 'ok' }, { 'DOM-MO': 'ok' }, { MO: queue.length + ' rec' }), { type: 'queue', label: 'Record queue (notebook)', items: queue.slice(), hl: h, frontLabel: 'first', backLabel: 'last' }, { type: 'vars', vals: { callbackRuns: 0, recordsWaiting: queue.length } }] });
        });
        frames.push({ narr: 'Your synchronous code ends. The JavaScript call stack is now empty, so the browser runs the <b>microtask checkpoint</b>. This happens before the next paint.', parts: [g({ MO: 'cur' }, { 'MO-CB': 'cur' }), { type: 'queue', label: 'Record queue (notebook)', items: queue.slice(), hl: { 0: 'cur' }, frontLabel: 'first', backLabel: 'last' }, { type: 'vars', vals: { phase: 'microtask checkpoint' } }] });
        frames.push({ narr: '<b>One</b> call: <code>callback(records)</code> receives all <b>' + queue.length + '</b> records in order. Loop over them, then decide what to do once. Changing the observed DOM again here would start a new batch.', parts: [g({ CB: 'sel', MO: 'done', DOM: 'done' }, { 'MO-CB': 'ok' }, { CB: queue.length + ' records' }), { type: 'queue', label: 'Record queue (now empty)', items: [], frontLabel: 'first', backLabel: 'last' }, { type: 'vars', vals: { callbackRuns: 1, recordsDelivered: queue.length }, hl: { callbackRuns: 'sel' } }] });
        return frames;
      }
    },
    {
      title: 'ResizeObserver: a box width changes, layout reacts',
      input: '320 480 720 1100',
      inputLabel: 'Box widths in px as the user resizes (space separated)',
      gen: function (input) {
        var ws = String(input || '').trim().split(/[\s,]+/).map(Number);
        if (!ws.length || ws.some(function (x) { return isNaN(x) || x < 0; }) || ws.length > 10) throw new Error('Enter up to 10 widths such as: 320 480 720 1100');
        function layout(w) { return w < 600 ? 'compact (1 column)' : (w < 1000 ? 'medium (2 columns)' : 'wide (3 columns)'); }
        var frames = [], rows = [], prev = null;
        frames.push({ narr: 'We call <code>ro.observe(card)</code>. Rule inside the callback: width &lt; 600 compact, &lt; 1000 medium, otherwise wide. Widths will change for different reasons (window drag, sidebar toggle, longer text).', parts: [{ type: 'bars', label: 'Widths we will see', values: ws.slice(), texts: ws.map(function (x) { return x + 'px'; }) }] });
        ws.forEach(function (w, i) {
          var lay = layout(w), changed = lay !== prev;
          rows.push([i === 0 ? 'initial (on observe)' : 'resize #' + i, w + 'px', lay, changed ? '<span class="c-g">class updated</span>' : '<span class="c-m">same, nothing to do</span>']);
          var hlBars = {}; hlBars[i] = changed ? 'ok' : 'cur';
          var ptr = {}; ptr[i] = 'now';
          frames.push({ narr: 'Entry: <code>contentRect.width = ' + w + '</code>. ' + (changed ? 'The layout name changes from <b>' + (prev || 'nothing') + '</b> to <b>' + lay + '</b>, so we update the class (runs after layout, before paint - no flicker).' : 'Still <b>' + lay + '</b>. The observer fired because the size changed, but our code decides no work is needed.'), parts: [
            { type: 'bars', label: 'Box width (px)', values: ws.slice(), hl: hlBars, ptr: ptr, texts: ws.map(function (x) { return String(x); }) },
            { type: 'table', label: 'Callback calls so far', columns: ['when', 'width', 'layout', 'action'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[rows.length - 1] = changed ? 'ok' : 'cur'; return o; })() }
          ] });
          prev = lay;
        });
        frames.push({ narr: 'Done. <b>' + ws.length + '</b> callback calls, but only the rows marked "class updated" changed the page. Tip: do cheap checks first and avoid changing the observed element\'s size inside the callback - that can cause a "loop" warning.', parts: [{ type: 'vars', vals: { callbackCalls: ws.length, layoutChanges: rows.filter(function (r) { return r[3].indexOf('updated') >= 0; }).length }, hl: { layoutChanges: 'sel' } }] });
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'Which node did the user change? attributeOldValue',
      html: `<p>Set <code>attributeOldValue: true</code> and each record keeps what the attribute <i>used to be</i>. Handy for undo features and debugging "who keeps changing my class?".</p>`,
      code: `const el = document.querySelector('#panel');
new MutationObserver(function (records) {
  records.forEach(function (r) {
    console.log(r.attributeName + ': "' + r.oldValue + '" -> "' + r.target.getAttribute(r.attributeName) + '"');
  });
}).observe(el, { attributes: true, attributeFilter: ['class', 'hidden'], attributeOldValue: true });`
    },
    {
      title: 'Wait until an element exists (no polling)',
      html: `<p>A common need: your script runs before a framework has rendered the element. Instead of <code>setInterval</code> polling, use a MutationObserver on the document and resolve a promise as soon as the selector matches. Always include a timeout so you do not wait forever.</p>`,
      code: `function waitForElement(selector, timeoutMs) {
  return new Promise(function (resolve, reject) {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);             // already there

    const observer = new MutationObserver(function () {
      const found = document.querySelector(selector);
      if (found) { observer.disconnect(); clearTimeout(timer); resolve(found); }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const timer = setTimeout(function () {
      observer.disconnect();
      reject(new Error('Timed out waiting for ' + selector));
    }, timeoutMs || 5000);
  });
}`
    },
    {
      title: 'Textarea that grows with its content',
      html: `<p>Auto-growing inputs used to need scroll tricks. Now CSS <code>field-sizing: content</code> does it in modern browsers, but the observer pattern is still useful to learn: when the element's size changes for <i>any</i> reason (font loads, container resizes), re-measure.</p>`,
      code: `const ta = document.querySelector('textarea');
function fit() { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
ta.addEventListener('input', fit);
new ResizeObserver(fit).observe(ta);   // re-fit when the width changes and text wraps differently
fit();`
    },
    {
      title: 'Avoiding the resize loop warning',
      html: `<p>If your ResizeObserver callback changes the size of the same element, the browser has to notify you again, and may stop with <code>ResizeObserver loop completed with undelivered notifications</code>. Fix: change something that does not affect the observed size, or defer the work to the next frame with <code>requestAnimationFrame</code>.</p>`,
      code: `const ro = new ResizeObserver(function (entries) {
  // Defer layout-changing work so the observer is not re-triggered in the same frame.
  requestAnimationFrame(function () {
    entries.forEach(function (e) { e.target.style.setProperty('--w', e.contentRect.width + 'px'); });
  });
});
ro.observe(document.querySelector('.panel'));`
    }
  ],
  deepDive: `<p><b>🟣 Timing.</b> MutationObserver callbacks run as <b>microtasks</b>: after the current script and before rendering. That is much better than the old Mutation Events (<code>DOMNodeInserted</code>), which were synchronous, deprecated, and so slow they were removed. ResizeObserver runs at a specific step of the "update the rendering" algorithm: after layout, before paint. If the callback resizes watched elements <i>deeper</i> in the tree, the browser delivers them again in the same frame. If it resizes elements at the same depth or higher up, they cannot be delivered this frame, so the browser reports the "loop" warning. That is why layout-changing work should be deferred.</p>
  <p><b>Cost model.</b> <code>subtree: true</code> on <code>document.body</code> with <code>attributes: true</code> and no <code>attributeFilter</code> makes the browser create a record for <i>every</i> change anywhere. On a busy app (animations, frameworks) that is thousands of records a second. Always watch the smallest node, the smallest option set, and call <code>disconnect()</code> when done. <code>takeRecords()</code> empties the queue synchronously if you need the pending records now.</p>
  <p><b>Frameworks and observers.</b> React/Vue/Svelte already know when the DOM changes (they made the change). You rarely need MutationObserver for your own components; it is for DOM you do <b>not</b> own: third-party widgets, browser extensions, content editable regions, legacy pages, test tools, and "wait for element" helpers.</p>
  <p><b>Resize details.</b> You can choose <code>box: 'border-box'</code> or <code>'device-pixel-content-box'</code> (exact physical pixels, great for canvas). <code>contentRect</code> excludes padding; <code>borderBoxSize</code> includes it. Hidden (<code>display: none</code>) elements report 0. Inline elements are not observed meaningfully. For purely layout-driven changes, <b>CSS container queries</b> (<code>@container</code>) are better: no JS, no flash, and they react before paint. Use ResizeObserver when JS must act (draw a chart, measure text, virtualization).</p>
  <p><b>Other observers in the family.</b> <code>PerformanceObserver</code> (get Core Web Vitals entries like LCP, CLS, long tasks as they happen) and <code>ReportingObserver</code> (deprecation warnings). All follow the same shape: create with callback, <code>observe</code>, get batched entries, <code>disconnect</code>.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI assistants often reach for <code>setInterval</code> polling or <code>window.resize</code> listeners because older tutorials did. They also sprinkle <code>MutationObserver</code> on <code>document.body</code> with every option turned on "to be safe", which quietly burns CPU on large pages.</p>
  <p><b>Use AI as a partner:</b> ask <code>Rewrite this polling loop with the narrowest possible MutationObserver options and explain why each option is needed.</code> Or describe a bug ("my chat jumps to the bottom while I read old messages") and ask it to list the <i>states</i> involved before suggesting code. It is great at enumerating cases you can then check.</p>
  <p><b>AI-era use cases:</b> streaming chat answers append text nodes many times per second - a MutationObserver (or better, your own state) decides auto-scroll; browser agents and extensions that read pages use MutationObserver to know when a page finished rendering; auto-growing prompt boxes use ResizeObserver or <code>field-sizing</code>.</p>
  <p><b>What you must still own:</b> choosing the narrowest observation scope, avoiding feedback loops (observer changes DOM that triggers the same observer), and cleaning up with <code>disconnect()</code> in the right lifecycle hook.</p>`,
  problems: [
    {
      title: 'Breakpoint Watcher with ResizeObserver', level: 'Easy', tags: ['ResizeObserver', 'responsive', 'debounce by change'], companies: ['Adobe', 'Atlassian'],
      statement: `<p>A card component must switch between layouts based on <b>its own width</b>. Write <code>createBreakpointWatcher(breakpoints, onChange)</code> where <code>breakpoints</code> is a list like <code>[{name:'compact',min:0},{name:'medium',min:600},{name:'wide',min:1000}]</code> sorted by <code>min</code>. It returns <code>update(width)</code>. <code>update</code> must call <code>onChange(newName, oldName, width)</code> only when the active breakpoint <b>name</b> changes, not on every resize event. The active breakpoint is the one with the largest <code>min</code> that is still &lt;= width.</p>`,
      constraints: `1 to 10 breakpoints, the first has min = 0. Up to 60 resize events per second. Width is a non-negative number.`,
      example: `<p>Widths: 500, 550, 650, 900, 1000, 990</p>
        ${H.table(['width', 'active', 'onChange called?'], [['500', 'compact', '<span class="c-g">yes (first)</span>'], ['550', 'compact', 'no'], ['650', 'medium', '<span class="c-g">yes</span>'], ['900', 'medium', 'no'], ['1000', 'wide', '<span class="c-g">yes</span>'], ['990', 'medium', '<span class="c-g">yes</span>']])}`,
      brute: {
        why: `<p>Calling <code>onChange</code> on every resize event re-renders the component up to 60 times per second, even though the layout only changes a couple of times during a drag. That is wasted work and can cause jank.</p>`,
        code: `function createWatcherNaive(breakpoints, onChange) {
  return function update(width) {
    let name = breakpoints[0].name;
    breakpoints.forEach(function (b) { if (width >= b.min) name = b.name; });
    onChange(name, null, width);   // fires every single time
  };
}`
      },
      mcq: { q: 'Which is the best way to wire this up in the browser?', options: ['new ResizeObserver(e => update(e[0].contentRect.width)).observe(card)', 'setInterval(() => update(card.offsetWidth), 16)', 'window.onresize = ... and ignore the card width', 'Only check width once on page load'], answer: 0, explain: 'ResizeObserver reports changes of the element itself, for any cause, without polling. window resize misses sidebar toggles and content changes.' },
      hints: [
        `<p>Hint 1: two separate jobs - (a) find the active name for a width, (b) remember the previous name and compare.</p>`,
        `<p>Hint 2: a variable <code>current</code> in the closure, starting as <code>null</code>.</p>`,
        `<p>Hint 3: loop the breakpoints (sorted) and keep the last one whose <code>min</code> is &lt;= width. If it differs from <code>current</code>, update <code>current</code> and call <code>onChange</code> with the old name.</p>`
      ],
      solution: {
        approach: `<p>Compute the active name with one pass over the sorted list. Keep the last reported name in a closure and call the callback only when the name differs. The ResizeObserver callback just forwards <code>contentRect.width</code> to <code>update</code>.</p>`,
        code: {
          lang: 'js', run: true, code: `function createBreakpointWatcher(breakpoints, onChange) {
  let current = null;
  return function update(width) {
    let active = breakpoints[0].name;
    for (const b of breakpoints) {
      if (width >= b.min) active = b.name;   // list is sorted, so the last match wins
    }
    if (active !== current) {
      const old = current;
      current = active;
      onChange(active, old, width);
    }
  };
}

// Browser wiring (comment shows how it connects):
// new ResizeObserver(function (entries) { update(entries[0].contentRect.width); }).observe(card);

const calls = [];
const update = createBreakpointWatcher(
  [{ name: 'compact', min: 0 }, { name: 'medium', min: 600 }, { name: 'wide', min: 1000 }],
  function (n, o, w) { calls.push(w + 'px: ' + (o || 'none') + ' -> ' + n); }
);
[500, 550, 650, 900, 1000, 990].forEach(update);
console.log(calls.join('\\n'));`
        },
        complexity: `<p>Time O(B) per event for B breakpoints (B is at most 10, so effectively constant); space O(1). The callback runs only on actual changes.</p>`,
        followUps: ['Add hysteresis (a 20px dead zone) so a width hovering at 600 does not flip back and forth.', 'Replace the observer with a CSS container query. When is that better?']
      }
    }
  ]
});

/* ============================ TOPIC 5: Web Workers ============================ */
topics.push({
  title: 'Web Workers: Keeping the Page Smooth with a Second Thread',
  analogy: `<p>A restaurant has one <b>waiter</b> (the main thread). The waiter greets guests, takes orders, brings food and answers questions. If the waiter also has to <b>cook a huge stew</b> personally, every guest waits and the room feels frozen. A <b>Web Worker</b> is a <b>kitchen</b> with its own cook. The waiter hands over an <b>order slip</b> (<code>postMessage</code>), keeps serving, and the kitchen sends back a <b>finished dish</b> (another message). The cook cannot walk into the dining room though - workers cannot touch the DOM.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> JavaScript on a page runs on <b>one main thread</b> that also handles clicks, scrolling, layout and painting. If your code runs for a long time (parsing a 50 MB file, resizing an image, searching a big list, running a model) the page <b>freezes</b>: no clicks, no animation. Any task longer than about <b>50 ms</b> is a "long task" and hurts the responsiveness score (INP).</p>
  <p>A <b>Web Worker</b> runs a separate JavaScript file on a <b>separate thread</b>. The two sides cannot share variables; they talk with <b>messages</b>.</p>
  <pre>// main.js
const worker = new Worker('worker.js');
worker.onmessage = function (e) { console.log('result', e.data); };
worker.postMessage({ type: 'start', numbers: [1, 2, 3] });

// worker.js
self.onmessage = function (e) {
  const total = e.data.numbers.reduce(function (a, b) { return a + b; }, 0);
  self.postMessage({ type: 'done', total: total });
};</pre>
  <p><b>🔵 What you need to know.</b></p>
  <ul>
    <li><b>No DOM</b>: inside a worker there is no <code>document</code> or <code>window</code>. You do have <code>fetch</code>, <code>setTimeout</code>, <code>IndexedDB</code>, <code>WebSocket</code>, <code>crypto</code>, <code>URL</code>, and <code>importScripts()</code> / ES module imports. The global object is <code>self</code>.</li>
    <li><b>Messages are copied</b> (the <b>structured clone</b> algorithm). Objects, arrays, Maps, Dates, Blobs and typed arrays work. Functions, DOM nodes and class instances (they lose methods) do not. Copying a huge object costs time.</li>
    <li><b>Transferables</b> move big binary data <b>without copying</b>: <code>worker.postMessage(buf, [buf])</code>. The sender's buffer becomes empty (<code>byteLength 0</code>) - ownership moved, like handing over a physical document.</li>
    <li><b>Lifecycle</b>: <code>worker.terminate()</code> kills it from outside; <code>self.close()</code> from inside. Errors appear on <code>worker.onerror</code>.</li>
    <li><b>Not free</b>: a worker costs memory and a startup of a few to tens of milliseconds. For a 2 ms job, a worker is slower than just doing it.</li>
  </ul>
  ${H.table(['Kind', 'Purpose'], [['Dedicated Worker', 'Owned by one page. The one you use for heavy calculations.'], ['Shared Worker', 'One worker shared by several tabs/windows of the same origin (rare).'], ['Service Worker', 'A network proxy that enables offline mode and push; lives beyond the page (next modules).'], ['Worklets', 'Tiny special-purpose workers for audio/painting.']])}`,
  clues: [
    '"the page freezes while processing a big file / large list / image" → move the work to a Web Worker',
    '"long task over 50 ms" / "improve INP" / "main thread is blocked"',
    '"parse CSV/JSON/Excel in the browser" / "client-side image or video processing" / "WASM"',
    '"worker cannot access the DOM" → send data back and let the main thread update the UI',
    '"send a large array without copying" → transferable ArrayBuffer (or SharedArrayBuffer + Atomics)',
    '"several heavy jobs at once" → a worker pool sized by <code>navigator.hardwareConcurrency</code>'
  ],
  code: [
    {
      lang: 'js', title: 'worker.js - runs on the background thread', code: `// Everything here runs on a different thread. There is no document and no window.
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

self.onmessage = function (event) {
  const msg = event.data;
  if (msg.type === 'count-primes') {
    let count = 0;
    const step = Math.max(1, Math.floor(msg.limit / 10));
    for (let n = 2; n <= msg.limit; n++) {
      if (isPrime(n)) count++;
      // Tell the page how far we are, 10 times in total.
      if (n % step === 0) self.postMessage({ id: msg.id, type: 'progress', percent: Math.round((n / msg.limit) * 100) });
    }
    self.postMessage({ id: msg.id, type: 'result', count: count });
  }
};`
    },
    {
      lang: 'js', title: 'main.js - the page talks to the worker (browser)', code: `const worker = new Worker('worker.js');
const button = document.querySelector('#go');
const bar = document.querySelector('progress');
const output = document.querySelector('#out');

worker.onmessage = function (event) {
  const msg = event.data;
  if (msg.type === 'progress') bar.value = msg.percent;          // UI stays alive
  if (msg.type === 'result') {
    output.textContent = msg.count + ' primes';
    button.disabled = false;
  }
};
worker.onerror = function (e) {
  output.textContent = 'Worker failed: ' + e.message;
  button.disabled = false;
};

button.addEventListener('click', function () {
  button.disabled = true;
  worker.postMessage({ id: 1, type: 'count-primes', limit: 5000000 });   // returns immediately
});
// When the page no longer needs the worker (route change, component unmount):
// worker.terminate();`
    },
    {
      lang: 'js', run: true, title: 'Runnable: a promise-based worker client (request ids) with a fake worker', code: `// A fake worker (no real threads here) that copies messages like a real one does.
class FakeWorker {
  constructor(handler) { this.handler = handler; this.onmessage = null; this.dead = false; }
  postMessage(data) {
    const copy = JSON.parse(JSON.stringify(data));          // structured clone = a COPY
    setTimeout(() => {
      if (this.dead) return;
      let reply;
      try { reply = { id: copy.id, result: this.handler(copy.type, copy.payload) }; }
      catch (e) { reply = { id: copy.id, error: e.message }; }
      if (this.onmessage) this.onmessage({ data: reply });
    }, 5);
  }
  terminate() { this.dead = true; }
}

// The client: gives every request an id so many calls can be in flight at once.
function createWorkerClient(worker) {
  let nextId = 1;
  const pending = new Map();                                // id -> { resolve, reject }
  worker.onmessage = function (e) {
    const msg = e.data;
    const p = pending.get(msg.id);
    if (!p) return;                                         // unknown or already cleaned up
    pending.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error)); else p.resolve(msg.result);
  };
  return {
    call: function (type, payload) {
      return new Promise(function (resolve, reject) {
        const id = nextId++;
        pending.set(id, { resolve: resolve, reject: reject });
        worker.postMessage({ id: id, type: type, payload: payload });
      });
    },
    terminate: function () {
      worker.terminate();
      pending.forEach(function (p) { p.reject(new Error('worker terminated')); });
      pending.clear();
    }
  };
}

// "Worker code": the heavy functions.
function handler(type, payload) {
  if (type === 'sum') { let s = 0; for (let i = 1; i <= payload.n; i++) s += i; return s; }
  if (type === 'upper') return payload.text.toUpperCase();
  throw new Error('unknown task ' + type);
}

const client = createWorkerClient(new FakeWorker(handler));
Promise.all([client.call('sum', { n: 1000000 }), client.call('upper', { text: 'hello worker' })])
  .then(function (r) { console.log('results (any order, matched by id):', r); return client.call('nope', {}); })
  .catch(function (e) { console.log('error from worker:', e.message); })
  .then(function () {
    const slow = client.call('sum', { n: 10 });
    client.terminate();
    return slow.catch(function (e) { console.log('pending call rejected:', e.message); });
  });`
    },
    {
      lang: 'js', run: true, title: 'Runnable: transferring an ArrayBuffer (moved, not copied)', code: `// structuredClone with { transfer } behaves exactly like postMessage(data, [data]).
const big = new ArrayBuffer(8 * 1024 * 1024);          // 8 MB
console.log('before: sender has', big.byteLength, 'bytes');

const received = structuredClone(big, { transfer: [big] });   // ownership moves

console.log('after:  sender has', big.byteLength, 'bytes (detached)');
console.log('after:  receiver has', received.byteLength, 'bytes');

// A plain copy (no transfer) keeps both, but costs time and memory:
const small = new ArrayBuffer(1024);
const copy = structuredClone(small);
console.log('copy:   sender', small.byteLength, 'and receiver', copy.byteLength, '(two buffers exist)');`
    },
    {
      lang: 'js', run: true, title: 'Runnable: no worker? at least yield between chunks', code: `// If you cannot use a worker, split long work into chunks and let the event loop breathe.
function yieldToMain() { return new Promise(function (r) { setTimeout(r, 0); }); }

async function sumInChunks(n, chunkSize) {
  let total = 0, longest = 0, chunks = 0;
  for (let start = 1; start <= n; start += chunkSize) {
    const t0 = Date.now();
    const end = Math.min(n, start + chunkSize - 1);
    for (let i = start; i <= end; i++) total += i;
    longest = Math.max(longest, Date.now() - t0);
    chunks++;
    await yieldToMain();                                    // clicks and paints can run here
  }
  return { total: total, chunks: chunks, longestBlockMs: longest };
}

sumInChunks(20000000, 2000000).then(function (r) {
  console.log('total', r.total, 'in', r.chunks, 'chunks; the page was never blocked longer than about', r.longestBlockMs, 'ms at a time');
});`
    }
  ],
  codeTitle: ['Worker side', 'Page side', 'Request/response wrapper', 'Transferables', 'Chunking fallback'],
  viz: [
    {
      title: 'Main thread and worker: message passing',
      input: '3',
      inputLabel: 'Number of progress messages (1-5)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 1 || n > 5) throw new Error('Type a number from 1 to 5');
        var nodes = [
          { id: 'M', label: 'Main thread (UI)', x: 16, y: 10, shape: 'box' },
          { id: 'D', label: 'DOM / screen', x: 16, y: 46, shape: 'box' },
          { id: 'W', label: 'Worker thread', x: 82, y: 10, shape: 'box' }
        ];
        var edges = [['M', 'W', 'postMessage'], ['M', 'D', 'can touch']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Two threads, no shared variables', height: 56, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        function q(label, items, hl) { return { type: 'queue', label: label, items: items, hl: hl || {}, frontLabel: 'next', backLabel: 'newest' }; }
        var frames = [];
        frames.push({ narr: 'Two separate threads. They <b>cannot share variables</b>. The only road between them is <b>messages</b>, and each side has its own inbox (a queue). Only the main thread may touch the DOM.', parts: [g({ M: 'cur', W: 'cur' }), q('Worker inbox', []), q('Main inbox', [])] });
        frames.push({ narr: 'User clicks "Analyze". Main creates the worker with <code>new Worker("worker.js")</code>. The file downloads and starts on the new thread.', parts: [g({ M: 'cur', W: 'ok' }, { 'M-W': 'ok' }, { W: 'starting' }), q('Worker inbox', []), q('Main inbox', [])] });
        frames.push({ narr: '<code>worker.postMessage({ type: "start" })</code>. The data is <b>copied</b> (structured clone) into the worker\'s inbox. The call returns <b>immediately</b>; the main thread does not wait.', parts: [g({ M: 'cur' }, { 'M-W': 'cur' }, { M: 'sent' }), q('Worker inbox', ['start (copy)'], { 0: 'ok' }), q('Main inbox', []), { type: 'vars', vals: { uiResponsive: true } }] });
        frames.push({ narr: 'The worker picks up the message and starts the heavy loop. Meanwhile the user scrolls and clicks and the main thread answers instantly: <b>60 fps stays smooth</b>.', parts: [g({ W: 'bad', M: 'ok' }, {}, { W: 'computing...', M: 'handling clicks' }), q('Worker inbox', []), q('Main inbox', []), { type: 'vars', vals: { uiResponsive: true, workerBusy: true }, hl: { uiResponsive: 'ok', workerBusy: 'cur' } }] });
        for (var i = 1; i <= n; i++) {
          var pct = Math.round((i / (n + 1)) * 100);
          frames.push({ narr: 'The worker calls <code>self.postMessage({ progress: ' + pct + ' })</code>. The message lands in the <b>main inbox</b> and the main thread\'s <code>onmessage</code> updates the progress bar (a DOM change, so it must happen here).', parts: [g({ W: 'bad', M: 'cur' }, { 'M-W': 'ok' }, { W: 'computing...', M: 'progress ' + pct + '%' }), q('Worker inbox', []), q('Main inbox', ['progress ' + pct + '%'], { 0: 'cur' }), { type: 'vars', vals: { progressBar: pct + '%' }, hl: { progressBar: 'cur' } }] });
        }
        frames.push({ narr: 'The worker finishes and sends <code>{ result }</code>. Main renders it and then calls <code>worker.terminate()</code> (or keeps it for the next job). If you forget, the worker thread and its memory stay alive.', parts: [g({ M: 'sel', W: 'done' }, { 'M-W': 'ok' }, { W: 'done', M: 'render result' }), q('Worker inbox', []), q('Main inbox', ['result'], { 0: 'sel' }), { type: 'vars', vals: { progressBar: '100%', worker: 'terminated' }, hl: { worker: 'sel' } }] });
        return frames;
      }
    },
    {
      title: 'Timeline: heavy job on the main thread vs in a worker',
      input: '5',
      inputLabel: 'Heavy job length in ticks (3-8)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 3 || n > 8) throw new Error('Type a number from 3 to 8');
        var T = n + 3, TAP = 2;
        var colHead = []; for (var t = 0; t < T; t++) colHead.push('t' + t);
        var A = [], B = [], C = [], hlAll = {};
        for (t = 0; t < T; t++) {
          // Row A: no worker, everything on the main thread
          if (t < n) A.push(t >= TAP ? 'HEAVY (tap waits)' : 'HEAVY');
          else if (t === n) A.push('handle tap (late!)');
          else A.push('idle');
          // Row B: main thread when a worker does the job
          if (t === 0) B.push('send job');
          else if (t === TAP) B.push('handle tap NOW');
          else if (t === n + 1) B.push('show result');
          else B.push('idle (free)');
          // Row C: the worker
          if (t >= 1 && t <= n) C.push('HEAVY');
          else if (t === n + 1) C.push('send result');
          else C.push('idle');
        }
        var frames = [];
        for (var col = 0; col < T; col++) {
          var rows = [A.map(function (v, i) { return i <= col ? v : ''; }), B.map(function (v, i) { return i <= col ? v : ''; }), C.map(function (v, i) { return i <= col ? v : ''; })];
          var hl = {};
          for (var c2 = 0; c2 <= col; c2++) {
            if (A[c2].indexOf('tap waits') >= 0 || A[c2].indexOf('late') >= 0) hl['0,' + c2] = 'bad'; else if (A[c2] === 'HEAVY') hl['0,' + c2] = 'cur';
            if (B[c2].indexOf('NOW') >= 0) hl['1,' + c2] = 'ok';
            if (C[c2] === 'HEAVY') hl['2,' + c2] = 'cur';
          }
          var narr;
          if (col === 0) narr = 'Tick 0: the user clicks "process". Top row: the main thread starts the heavy job itself. Middle row: the main thread just sends the job to the worker (fast).';
          else if (col < TAP) narr = 'Tick ' + col + ': the job keeps running. The worker row is busy; the main thread in the middle row is free.';
          else if (col === TAP) narr = 'Tick ' + col + ': the user <b>taps a button</b>. Top row: the main thread is stuck in the heavy loop, so the tap <span class="c-r">waits</span>. Middle row: it answers right away.';
          else if (col < n) narr = 'Tick ' + col + ': still heavy. The top row keeps the user waiting (the page looks frozen); the middle row stays responsive.';
          else if (col === n) narr = 'Tick ' + col + ': the top row finally finishes and handles the tap <span class="c-r">' + (n - TAP) + ' ticks late</span>. The worker also finishes now.';
          else if (col === n + 1) narr = 'Tick ' + col + ': the worker sends the result; the main thread shows it with one quick message handler.';
          else narr = 'Done. Total work is the same - a worker does not make the calculation faster. It moves it off the main thread so the page never freezes.';
          frames.push({ narr: narr, parts: [{ type: 'grid', label: 'Who is doing what', rowHead: ['Main (no worker)', 'Main (with worker)', 'Worker'], colHead: colHead, rows: rows, hl: hl }] });
        }
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'When a worker is the wrong tool',
      html: `<p>A worker costs thread startup time, message copying and code complexity. If the job takes under ~10 ms, do it inline. If it is long but <b>depends on the DOM</b>, split it into chunks and yield between them. If the slowness is the <b>network</b>, a worker will not help at all (fetch is already async). Measure first with the Performance panel: look for red-flagged "Long Task" bars.</p>`
    },
    {
      title: 'Sort and filter 1 million rows without freezing',
      html: `<p>Send the rows <b>once</b> to a worker and keep them there. Later messages carry only the small query ("sort by price desc") and the worker returns only the <b>visible slice</b> (the first 50 rows). This avoids copying a million rows on every keystroke. The page renders just the slice.</p>`,
      code: `// worker.js
let rows = [];
self.onmessage = function (e) {
  const m = e.data;
  if (m.type === 'load') { rows = m.rows; self.postMessage({ type: 'loaded', count: rows.length }); }
  if (m.type === 'query') {
    const filtered = rows.filter(function (r) { return r.name.toLowerCase().includes(m.text.toLowerCase()); });
    filtered.sort(function (a, b) { return a.price - b.price; });
    self.postMessage({ type: 'slice', total: filtered.length, rows: filtered.slice(0, 50) });
  }
};`
    },
    {
      title: 'Image processing with a transferred buffer',
      html: `<p>Grab pixel data from a canvas, <b>transfer</b> its buffer to the worker (no copy), modify it, and transfer it back. The pixel array is millions of numbers, so skipping the copy matters.</p>`,
      code: `// main.js
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
worker.postMessage({ pixels: imageData.data.buffer, w: canvas.width, h: canvas.height }, [imageData.data.buffer]);
worker.onmessage = function (e) {
  const result = new ImageData(new Uint8ClampedArray(e.data.pixels), canvas.width, canvas.height);
  ctx.putImageData(result, 0, 0);
};

// worker.js - make it grayscale
self.onmessage = function (e) {
  const px = new Uint8ClampedArray(e.data.pixels);
  for (let i = 0; i < px.length; i += 4) {
    const gray = (px[i] + px[i + 1] + px[i + 2]) / 3;
    px[i] = px[i + 1] = px[i + 2] = gray;
  }
  self.postMessage({ pixels: px.buffer }, [px.buffer]);   // hand it back without copying
};`
    },
    {
      title: 'Create a worker from a string (no separate file)',
      html: `<p>For tiny helpers you can build a worker from a Blob URL. Remember it counts as inline script: a strict Content-Security-Policy may block it unless you allow <code>worker-src blob:</code>. Revoke the URL after use.</p>`,
      code: `function runInWorker(fnBody, data) {
  const source = 'self.onmessage = function (e) { self.postMessage((' + fnBody.toString() + ')(e.data)); };';
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const worker = new Worker(url);
  return new Promise(function (resolve, reject) {
    worker.onmessage = function (e) { resolve(e.data); worker.terminate(); URL.revokeObjectURL(url); };
    worker.onerror = function (e) { reject(e); worker.terminate(); URL.revokeObjectURL(url); };
    worker.postMessage(data);
  });
}
// runInWorker(function (n) { let s = 0; for (let i = 0; i < n; i++) s += i; return s; }, 1e8).then(console.log);`
    }
  ],
  deepDive: `<p><b>🟣 Memory model.</b> Each worker has its own JavaScript heap, event loop and call stack. A message is serialized with the structured-clone algorithm on the sender and deserialized on the receiver, so cost is proportional to size. <b>Transferables</b> (ArrayBuffer, MessagePort, ImageBitmap, OffscreenCanvas, streams) move ownership instead. <b>SharedArrayBuffer</b> is true shared memory between threads, used with <code>Atomics</code> (<code>Atomics.add</code>, <code>wait</code>, <code>notify</code>) for locks and counters - and brings race conditions back. It is only available on <b>cross-origin isolated</b> pages: serve <code>Cross-Origin-Opener-Policy: same-origin</code> and <code>Cross-Origin-Embedder-Policy: require-corp</code> (or <code>credentialless</code>).</p>
  <p><b>Worker pools.</b> Creating a worker for every task wastes startup time. Make N workers (usually <code>navigator.hardwareConcurrency - 1</code>, capped), keep a queue of tasks, give each idle worker the next task, and resolve the task's promise when it replies. Libraries: <b>Comlink</b> (makes a worker feel like an async object), <b>workerpool</b>, <b>Piscina</b> (Node).</p>
  <p><b>Errors.</b> An uncaught exception in a worker fires <code>worker.onerror</code> on the page; failing to deserialize fires <code>messageerror</code>. A worker that throws does <i>not</i> die automatically, but a crashed worker may never reply, so always add timeouts to your promise wrapper and reject pending calls on terminate.</p>
  <p><b>Bundling.</b> With modern tools write <code>new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })</code> and the bundler (Vite, webpack 5) emits and hashes the file. Module workers can use <code>import</code>. Classic workers use <code>importScripts()</code>.</p>
  <p><b>What else runs in workers.</b> WebAssembly modules (video codecs, SQLite in the browser, PDF rendering), <code>OffscreenCanvas</code> (draw to a canvas from a worker), IndexedDB and Cache API, <code>fetch</code> streams. What does <b>not</b>: DOM, <code>localStorage</code>, <code>alert</code>. Related ideas for keeping the main thread free: <code>requestIdleCallback</code>, <code>scheduler.postTask</code> / <code>scheduler.yield()</code> (cooperative scheduling), and moving rendering work to the GPU with CSS transforms.</p>`,
  aiEra: `<p><b>What AI changes:</b> a big wave of apps now run <b>AI models in the browser</b> (Transformers.js, ONNX Runtime Web, WebLLM with WebGPU, MediaPipe). Loading and running a model takes seconds of heavy compute; the only sane place is a worker, with <code>postMessage</code> streaming tokens or embeddings back. Privacy-friendly features (on-device summaries, speech-to-text, image classification) all follow this shape.</p>
  <p><b>Use AI as a partner:</b> ask it to write the <b>message protocol</b> first: <code>Define the message types between my page and worker (start, progress, result, error, cancel) with example payloads.</code> A clear protocol prevents the usual bugs. Then ask for a fake-worker test like the one above.</p>
  <p><b>Where AI goes wrong:</b> it often posts huge objects on every keystroke (a copy each time), forgets request ids so concurrent results get mixed up, never calls <code>terminate()</code>, tries to use <code>document</code> or <code>localStorage</code> inside the worker, or creates a new worker per call. These pass a tiny demo and fail on real data.</p>
  <p><b>What you must still own:</b> deciding what should live in the worker (data stays there, only small queries and results cross the boundary), measuring that the worker actually helped, and adding cancel and timeout paths.</p>`,
  problems: [
    {
      title: 'Offload Heavy Work to a Worker (Request/Response Client)', level: 'Medium', tags: ['Web Worker', 'postMessage', 'promises', 'request id'], companies: ['Google', 'Figma', 'Microsoft'],
      statement: `<p>The page needs to call a worker like an async function: <code>client.call(type, payload)</code> returns a Promise for the result. Several calls can be in flight at once and replies may arrive in any order, so each message carries an <code>id</code>. If the worker replies with <code>{ id, error }</code> the promise must reject. <code>client.terminate()</code> must stop the worker and reject every call still pending. Implement <code>createWorkerClient(worker)</code> for any object with <code>postMessage</code>, <code>onmessage</code> and <code>terminate</code>.</p>`,
      constraints: `Up to 1000 calls in flight. Replies for unknown ids must be ignored. Messages are plain JSON-like objects.`,
      example: `<p>Two calls are sent: id 1 (slow, "sum") and id 2 (fast, "upper"). Replies arrive: id 2, then id 1.</p>
        ${H.table(['Message', 'Matched call', 'Promise'], [['{id:2, result:"HI"}', 'call #2', '<span class="c-g">resolves "HI"</span>'], ['{id:1, result:500500}', 'call #1', '<span class="c-g">resolves 500500</span>'], ['{id:9, result:1}', 'none', 'ignored']])}`,
      brute: {
        why: `<p>Using a single <code>worker.onmessage = ...</code> per call overwrites the previous handler, so the first caller never gets its answer; with two calls in flight the results get mixed up because nothing links a reply to its request.</p>`,
        code: `function callNaive(worker, data) {
  return new Promise(function (resolve) {
    worker.onmessage = function (e) { resolve(e.data); };   // 2nd call overwrites the 1st handler
    worker.postMessage(data);
  });
}`
      },
      mcq: { q: 'Why does each message need a unique id?', options: ['Replies can arrive in any order and must be matched to the right promise', 'Workers refuse messages without ids', 'To make messages smaller', 'Because structured clone requires it'], answer: 0, explain: 'postMessage has no built-in request/response pairing. An id stored in a Map lets the single onmessage handler find the right resolve/reject.' },
      hints: [
        `<p>Hint 1: a promise needs its <code>resolve</code> and <code>reject</code> kept somewhere until the reply comes back.</p>`,
        `<p>Hint 2: use a <code>Map</code> from id to <code>{ resolve, reject }</code> and a counter for new ids. Install <b>one</b> <code>onmessage</code> handler once.</p>`,
        `<p>Hint 3: in the handler look up the id, delete it from the map, then reject if <code>msg.error</code> is set, otherwise resolve <code>msg.result</code>. On terminate, call <code>worker.terminate()</code> and reject everything left in the map.</p>`
      ],
      solution: {
        approach: `<p>One shared message handler plus a Map of pending promises. The id travels with the request and comes back with the reply. Terminate cleans up so no promise hangs forever.</p>`,
        code: {
          lang: 'js', run: true, code: `function createWorkerClient(worker) {
  let nextId = 1;
  const pending = new Map();
  worker.onmessage = function (e) {
    const msg = e.data;
    const p = pending.get(msg.id);
    if (!p) return;                       // unknown id: ignore
    pending.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error));
    else p.resolve(msg.result);
  };
  return {
    call: function (type, payload) {
      return new Promise(function (resolve, reject) {
        const id = nextId++;
        pending.set(id, { resolve: resolve, reject: reject });
        worker.postMessage({ id: id, type: type, payload: payload });
      });
    },
    terminate: function () {
      worker.terminate();
      pending.forEach(function (p) { p.reject(new Error('terminated')); });
      pending.clear();
    }
  };
}

// A fake worker that answers out of order: "slow" takes 30ms, "fast" 5ms.
const fake = {
  onmessage: null,
  dead: false,
  postMessage: function (m) {
    const delay = m.type === 'slow' ? 30 : 5;
    setTimeout(function () {
      if (fake.dead) return;
      fake.onmessage({ data: m.type === 'bad' ? { id: m.id, error: 'boom' } : { id: m.id, result: m.type + ':' + m.payload } });
    }, delay);
  },
  terminate: function () { fake.dead = true; }
};
const client = createWorkerClient(fake);
Promise.all([client.call('slow', 'A'), client.call('fast', 'B')]).then(function (r) {
  console.log('both matched correctly:', r.join(' | '));
  return client.call('bad', 'C').catch(function (e) { console.log('error propagated:', e.message); });
}).then(function () {
  const hanging = client.call('slow', 'D');
  client.terminate();
  return hanging.catch(function (e) { console.log('pending rejected:', e.message); });
});`
        },
        complexity: `<p>Each call is O(1) (Map insert/lookup). Memory is proportional to the number of calls in flight.</p>`,
        followUps: ['Add a per-call timeout that rejects and cleans the Map entry.', 'How would you cancel a running calculation inside the worker? (check a flag between chunks, or terminate and respawn)']
      }
    }
  ]
});

/* ============================ TOPIC 6: History API + SPA router ============================ */
topics.push({
  title: 'The History API: pushState, popstate and Building an SPA Router',
  analogy: `<p>Think of the browser's history as a <b>stack of plates</b> in a cafeteria, with a finger pointing at the plate you are on. Visiting a new page puts a new plate on top. The <b>Back</b> button just moves your finger down one plate - nothing is thrown away yet. But if you go back two plates and then visit somewhere new, all the plates above your finger are <b>thrown out</b> (that is why "Forward" greys out).</p>
  <p><code>history.pushState()</code> lets JavaScript put a new plate on the stack and change the address bar <b>without loading a new page</b>. A single-page app (SPA) uses this trick to feel like many pages while staying on one HTML file.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> In a normal website, clicking a link asks the server for a whole new page. In a <b>single-page app</b> the page is loaded once; clicking a link changes what is drawn by JavaScript. But users still expect: the URL changes, Back/Forward work, refresh keeps them in the same place, and they can share the link. The History API gives you that.</p>
  <p><b>🔵 The tools.</b></p>
  ${H.table(['API', 'What it does'], [
    ['<code>history.pushState(state, "", "/users/7")</code>', 'Adds a new entry and changes the URL. <b>No request, no reload, and no <code>popstate</code> event.</b>'],
    ['<code>history.replaceState(state, "", url)</code>', 'Changes the <i>current</i> entry instead of adding one (good for redirects and fixing the URL).'],
    ['<code>history.back() / forward() / go(n)</code>', 'Move the finger along the stack (same as the browser buttons).'],
    ['<code>window.onpopstate</code>', 'Fires when the user moves <b>to</b> an entry (Back, Forward, <code>go</code>). It is your signal to draw the matching screen.'],
    ['<code>history.state</code>', 'The state object stored with the current entry (copied with structured clone).'],
    ['<code>location.pathname / search / hash</code>', 'The URL pieces to read when deciding which screen to render.']
  ])}
  <p><b>The 4-step SPA router recipe.</b></p>
  <ol>
    <li><b>Intercept links</b>: on click of an internal <code>&lt;a href&gt;</code>, call <code>event.preventDefault()</code> (stop the normal page load).</li>
    <li><b>Push the URL</b>: <code>history.pushState({}, '', href)</code>.</li>
    <li><b>Render</b>: look at <code>location.pathname</code>, match it to a route (<code>/users/:id</code> gives <code>{ id: '7' }</code>), and draw that view.</li>
    <li><b>Listen for <code>popstate</code></b>: when the user presses Back/Forward, render again for the new <code>location.pathname</code>. (Do <i>not</i> push again.)</li>
  </ol>
  <p><b>Don't forget the server!</b> If the user refreshes on <code>/users/7</code> (or opens a shared link), the browser asks the <b>server</b> for <code>/users/7</code>. The server must answer with your <code>index.html</code> for every app route (a "fallback" or "rewrite" rule), otherwise the user sees a 404.</p>
  <p><b>Hash routing</b> (<code>/#/users/7</code>) is the old alternative: everything after <code>#</code> never goes to the server, so no server setup is needed - at the price of uglier URLs and weaker SEO. It uses the <code>hashchange</code> event.</p>`,
  clues: [
    '"change the URL without a full page reload" → <code>history.pushState</code>',
    '"Back button should work in my SPA" / "browser back leaves the app" → handle <code>popstate</code>',
    '"build a client-side router" / "implement react-router from scratch" / "match /users/:id"',
    '"refresh on a deep link gives 404" → server fallback to <code>index.html</code>',
    '"modal / filter / tab should be shareable via URL" → keep that state in the URL (query string) with pushState or replaceState',
    '"pushState does not fire popstate" → you must call your render function yourself'
  ],
  code: [
    {
      lang: 'js', title: 'Smallest possible SPA router (browser)', code: `const routes = {
  '/': function () { return '<h1>Home</h1>'; },
  '/about': function () { return '<h1>About us</h1>'; }
};

function render() {
  const view = routes[location.pathname] || function () { return '<h1>404 - not found</h1>'; };
  document.querySelector('#app').innerHTML = view();
}

function navigate(url) {
  history.pushState({}, '', url);   // 1) change the URL, add a history entry (no reload)
  render();                          // 2) pushState does NOT fire popstate, so draw it ourselves
}

// Intercept clicks on internal links (event delegation on the document).
document.addEventListener('click', function (e) {
  const a = e.target.closest('a[data-link]');
  if (!a) return;
  // Let the browser handle ctrl/cmd-click, middle click, target=_blank, downloads.
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target && a.target !== '_self') return;
  e.preventDefault();
  navigate(a.getAttribute('href'));
});

window.addEventListener('popstate', render);   // Back / Forward buttons
render();                                       // first load (also handles refresh on a deep link)`
    },
    {
      lang: 'js', run: true, title: 'Runnable: a simulated history stack + router with params and query', code: `// A fake browser history so the demo runs anywhere. It follows the real rules:
//  - pushState cuts off "forward" entries and does NOT fire popstate
//  - back/forward/go DO fire popstate
class MemoryHistory {
  constructor(startUrl) { this.entries = [{ url: startUrl, state: null }]; this.index = 0; this.listeners = []; }
  get url() { return this.entries[this.index].url; }
  get state() { return this.entries[this.index].state; }
  pushState(state, title, url) {
    this.entries = this.entries.slice(0, this.index + 1);   // forward entries are thrown away
    this.entries.push({ url: url, state: state });
    this.index++;
  }
  replaceState(state, title, url) { this.entries[this.index] = { url: url, state: state }; }
  go(delta) {
    const target = this.index + delta;
    if (target < 0 || target >= this.entries.length) return;   // nothing happens at the ends
    this.index = target;
    this.listeners.forEach(function (fn) { fn(); });            // popstate
  }
  back() { this.go(-1); }
  forward() { this.go(1); }
  onPopState(fn) { this.listeners.push(fn); }
  dump() { return this.entries.map((e, i) => (i === this.index ? '[' + e.url + ']' : e.url)).join(' > '); }
}

// Turn '/users/:id' into a matcher.
function compile(pattern) {
  const names = [];
  const parts = pattern.split('/').map(function (seg) {
    if (seg.startsWith(':')) { names.push(seg.slice(1)); return '([^/]+)'; }
    return seg;
  });
  return { regex: new RegExp('^' + parts.join('/') + '$'), names: names };
}

function createRouter(history, routeTable, render) {
  const compiled = routeTable.map(function (r) { return { c: compile(r.path), view: r.view }; });
  function resolve(url) {
    const u = new URL(url, 'http://app.local');                 // parses path and query for us
    for (const r of compiled) {
      const m = r.c.regex.exec(u.pathname);
      if (m) {
        const params = {};
        r.c.names.forEach(function (n, i) { params[n] = decodeURIComponent(m[i + 1]); });
        return { view: r.view, params: params, query: Object.fromEntries(u.searchParams) };
      }
    }
    return { view: 'NotFound', params: {}, query: {} };
  }
  function show() { render(resolve(history.url)); }
  history.onPopState(show);                                      // Back/Forward
  return {
    navigate: function (url) {
      if (url === history.url) return;                           // same URL: do not stack duplicates
      history.pushState({}, '', url);
      show();
    },
    start: show
  };
}

const history = new MemoryHistory('/');
const router = createRouter(history,
  [{ path: '/', view: 'Home' }, { path: '/users/:id', view: 'UserProfile' }, { path: '/search', view: 'Search' }],
  function (r) { console.log('render ' + r.view + ' params=' + JSON.stringify(r.params) + ' query=' + JSON.stringify(r.query)); });

router.start();
router.navigate('/users/42');
router.navigate('/search?q=react&page=2');
router.navigate('/nope');
console.log(history.dump());
history.back(); history.back();
console.log(history.dump());
router.navigate('/users/7');            // cuts off the forward entries
console.log(history.dump());
history.forward();                      // nothing to go forward to
console.log('forward did nothing:', history.url);`
    },
    {
      lang: 'js', title: 'Query-string state, replaceState and scroll restoration (browser)', code: `// Keep filters in the URL so the page is shareable and Back works.
function setFilter(name, value) {
  const url = new URL(location.href);
  if (value) url.searchParams.set(name, value); else url.searchParams.delete(name);
  // Typing in a search box? Use replaceState so every keystroke does not add a history entry.
  history.replaceState({}, '', url);
  // Choosing a tab or a page? Use pushState so Back returns to the previous choice.
}

// Tell the browser we manage scroll ourselves (SPA pages change height after data loads).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// Save the scroll position into the current entry before leaving it.
window.addEventListener('pagehide', function () {
  history.replaceState({ scrollY: window.scrollY }, '');
});
window.addEventListener('popstate', function (e) {
  renderCurrentRoute().then(function () { window.scrollTo(0, (e.state && e.state.scrollY) || 0); });
});

function renderCurrentRoute() { return Promise.resolve(); }`
    },
    {
      lang: 'js', title: 'Hash routing and the newer Navigation API (browser)', code: `// 1) Hash routing: works on any static host, no server fallback needed.
window.addEventListener('hashchange', function () {
  const path = location.hash.slice(1) || '/';     // '#/users/7' -> '/users/7'
  console.log('render', path);
});

// 2) Navigation API: one event for ALL navigations (links, back/forward, form submits, location changes).
//    Check support first; it is newer than pushState.
if ('navigation' in window) {
  navigation.addEventListener('navigate', function (event) {
    if (!event.canIntercept || event.hashChange || event.downloadRequest) return;
    const url = new URL(event.destination.url);
    event.intercept({
      handler: async function () {
        // Browser updates the URL and history for you; you only render.
        document.querySelector('#app').textContent = 'Now showing ' + url.pathname;
      }
    });
  });
}`
    }
  ],
  codeTitle: ['Tiny router', 'History stack + router (simulated)', 'URL state and scroll', 'Hash routing / Navigation API'],
  viz: [
    {
      title: 'History stack: push, back, forward',
      input: 'push /home, push /about, push /users/7, back, back, push /contact, forward',
      inputLabel: 'Commands: push /x, replace /x, back, forward',
      gen: function (input) {
        var cmds = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 10);
        if (!cmds.length) throw new Error('Try: push /a, push /b, back, forward');
        var entries = ['/'], idx = 0, frames = [];
        function stackPart() {
          var hl = {};
          for (var i = 0; i < entries.length; i++) hl[i] = i === idx ? 'cur' : (i > idx ? 'done' : '');
          return { type: 'stack', label: 'History entries (bottom = oldest). Amber = where you are', items: entries.slice(), hl: hl };
        }
        function info(ev, extra) { var v = { 'location.pathname': entries[idx], 'popstate fired': ev, 'forward entries': entries.length - 1 - idx }; if (extra) v.note = extra; return { type: 'vars', vals: v, hl: { 'popstate fired': ev === 'yes' ? 'ok' : '' } }; }
        frames.push({ narr: 'You open the site at <b>/</b>. The stack has one entry and your "finger" (amber) points at it.', parts: [stackPart(), info('no')] });
        for (var c = 0; c < cmds.length; c++) {
          var parts = cmds[c].split(/\s+/), op = (parts[0] || '').toLowerCase(), arg = parts[1];
          if (op === 'push' || op === 'replace') {
            if (!arg || arg.charAt(0) !== '/') throw new Error('push/replace needs a path starting with /, e.g. push /about');
          } else if (op !== 'back' && op !== 'forward') throw new Error('Unknown command "' + cmds[c] + '". Use push, replace, back, forward');
          var narr, ev = 'no';
          if (op === 'push') {
            var dropped = entries.length - 1 - idx;
            entries = entries.slice(0, idx + 1); entries.push(arg); idx++;
            narr = '<code>history.pushState({}, "", "' + arg + '")</code>: new entry on top, URL changes, <b>no reload and no popstate event</b>.' + (dropped > 0 ? ' <span class="c-r">' + dropped + ' forward entr' + (dropped === 1 ? 'y was' : 'ies were') + ' thrown away</span>, so Forward is now disabled.' : ' Your router must call render() itself.');
          } else if (op === 'replace') {
            entries[idx] = arg;
            narr = '<code>history.replaceState({}, "", "' + arg + '")</code>: the <i>current</i> entry is rewritten. The stack height does not change, so Back still goes where it used to.';
          } else if (op === 'back') {
            if (idx === 0) narr = '<code>history.back()</code> at the oldest entry: <b>nothing happens</b>. (The real browser would leave your site if there was an earlier page.)';
            else { idx--; ev = 'yes'; narr = '<code>history.back()</code>: the finger moves down one entry. The browser fires <b>popstate</b>; your router renders <b>' + entries[idx] + '</b>. Nothing is deleted - the forward entries stay available.'; }
          } else {
            if (idx === entries.length - 1) narr = '<code>history.forward()</code> with no forward entries: <b>nothing happens</b>.';
            else { idx++; ev = 'yes'; narr = '<code>history.forward()</code>: the finger moves up. <b>popstate</b> fires and the router renders <b>' + entries[idx] + '</b>.'; }
          }
          frames.push({ narr: narr, parts: [stackPart(), info(ev)] });
        }
        return frames;
      }
    },
    {
      title: 'SPA router flow: link click, Back button, reload',
      input: 'click, back, reload',
      inputLabel: 'User actions (click, back, reload) up to 4',
      gen: function (input) {
        var acts = String(input || '').split(/[,\s]+/).filter(Boolean).map(function (s) { return s.toLowerCase(); }).slice(0, 4);
        if (!acts.length) throw new Error('Try: click, back, reload');
        acts.forEach(function (a) { if (a !== 'click' && a !== 'back' && a !== 'reload') throw new Error('Allowed actions: click, back, reload'); });
        var nodes = [
          { id: 'A', label: 'Link click', x: 14, y: 8, shape: 'box' },
          { id: 'B', label: 'preventDefault()', x: 50, y: 8, shape: 'box' },
          { id: 'C', label: 'history.pushState', x: 86, y: 8, shape: 'box' },
          { id: 'E', label: 'Back button', x: 14, y: 36, shape: 'box' },
          { id: 'F', label: 'popstate event', x: 50, y: 36, shape: 'box' },
          { id: 'D', label: 'render(route)', x: 86, y: 36, shape: 'box' },
          { id: 'R', label: 'Reload / shared link', x: 14, y: 64, shape: 'box' },
          { id: 'S', label: 'Server: index.html', x: 50, y: 64, shape: 'box' }
        ];
        var edges = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['E', 'F'], ['F', 'D'], ['R', 'S'], ['S', 'D']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'How the pieces connect', directed: true, height: 72, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var frames = [];
        frames.push({ narr: 'Three ways a screen can change in an SPA. All of them must end in the <b>same render(route)</b> function that reads <code>location.pathname</code>. Pick actions to see each path.', parts: [g({ D: 'cur' })] });
        acts.forEach(function (a) {
          if (a === 'click') {
            frames.push({ narr: '<b>Link click.</b> A click listener catches an internal link. Without the next step the browser would load a whole new page.', parts: [g({ A: 'cur' }, {}, { A: 'click' })] });
            frames.push({ narr: '<code>event.preventDefault()</code> cancels the normal navigation. We skip this for ctrl/cmd-click and <code>target="_blank"</code> so users keep those habits.', parts: [g({ A: 'done', B: 'cur' }, { 'A-B': 'ok' })] });
            frames.push({ narr: '<code>history.pushState({}, "", "/users/7")</code> adds an entry and updates the address bar. It does <b>not</b> fire popstate.', parts: [g({ B: 'done', C: 'cur' }, { 'B-C': 'ok' }, { C: '/users/7' })] });
            frames.push({ narr: 'We call <b>render(route)</b> ourselves: match <code>/users/:id</code>, get <code>id = "7"</code>, draw the profile.', parts: [g({ C: 'done', D: 'sel' }, { 'C-D': 'ok' }, { D: 'UserProfile 7' })] });
          } else if (a === 'back') {
            frames.push({ narr: '<b>Back button.</b> The user presses it. The browser moves its history finger to the previous entry and the URL changes by itself.', parts: [g({ E: 'cur' }, {}, { E: 'back' })] });
            frames.push({ narr: 'Because the user moved <i>to</i> an existing entry, the browser fires <b>popstate</b>. Our listener (<code>window.addEventListener("popstate", render)</code>) wakes up.', parts: [g({ E: 'done', F: 'cur' }, { 'E-F': 'ok' })] });
            frames.push({ narr: 'The listener calls the same <b>render(route)</b>. We do <b>not</b> pushState again - that would corrupt the stack.', parts: [g({ F: 'done', D: 'sel' }, { 'F-D': 'ok' }, { D: 'previous view' })] });
          } else {
            frames.push({ narr: '<b>Reload or a shared link.</b> All JavaScript state is gone. The browser asks the <b>server</b> for <code>/users/7</code> - a real HTTP request.', parts: [g({ R: 'cur' }, {}, { R: 'GET /users/7' })] });
            frames.push({ narr: 'The server must have a <b>fallback rule</b>: for any app route, return <code>index.html</code> (not a 404). Static hosts call this a rewrite or SPA mode.', parts: [g({ R: 'done', S: 'cur' }, { 'R-S': 'ok' }, { S: 'index.html' })] });
            frames.push({ narr: 'The app boots, calls render once at startup using <code>location.pathname</code>, and shows the right screen. Deep links work.', parts: [g({ S: 'done', D: 'sel' }, { 'S-D': 'ok' }, { D: 'boot render' })] });
          }
        });
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'push vs replace: which one for which action?',
      html: `<p>Use <b>pushState</b> when the user would expect Back to undo the change: opening a new page, switching a tab, opening a product. Use <b>replaceState</b> when the change is a refinement of the same page: typing in a search box, sorting, a redirect after login, normalising <code>/Home</code> to <code>/home</code>. A router that pushes on every keystroke makes Back useless.</p>
      ${H.table(['Action', 'Method'], [['Click a product', 'push'], ['Typing in a filter box', 'replace'], ['Redirect from /login after success', 'replace'], ['Open a modal that has its own URL', 'push'], ['Pagination ?page=3', 'push']])}`
    },
    {
      title: 'The form of a safe internal-link check',
      html: `<p>Not every click should be hijacked. A good router leaves these alone and lets the browser do its job: ctrl/cmd/shift/alt held, a non-left button, <code>target="_blank"</code>, <code>download</code> attribute, links to another origin, mailto: and tel:, and clicks where someone else already called <code>preventDefault()</code>.</p>`,
      code: `function shouldIntercept(event, anchor) {
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;
  const url = new URL(anchor.href, location.href);
  return url.origin === location.origin;      // external links: let the browser go there
}`
    },
    {
      title: 'Storing UI state in history.state',
      html: `<p>The <code>state</code> object is saved <i>with the entry</i>, so it comes back when the user presses Back. It is perfect for things like scroll position, an open accordion or a selected row. Keep it small and cloneable (no functions). It survives reload in most browsers but not a new tab, so the URL stays the source of truth for anything shareable.</p>`,
      code: `// Remember which row was open on the current entry:
history.replaceState({ openRow: 12 }, '');
// Later, after Back:
window.addEventListener('popstate', function (e) {
  const openRow = e.state && e.state.openRow;
  if (openRow) openRowById(openRow);
});
function openRowById(id) { console.log('open row', id); }`
    },
    {
      title: 'Leave-page warning and navigation guards',
      html: `<p>To warn about unsaved changes you use two different tools: <code>beforeunload</code> for refresh, tab close and external links, and your router's own check <i>before calling pushState</i> for in-app links. On <b>Back</b> you cannot cancel the browser's move, so routers either push the old URL back (restore) or use the Navigation API's <code>intercept()</code>/<code>precommitHandler</code>.</p>`,
      code: `let dirty = false;
window.addEventListener('beforeunload', function (e) {
  if (dirty) { e.preventDefault(); e.returnValue = ''; }   // browser shows its own generic message
});

async function guardedNavigate(url) {
  if (dirty && !window.confirm('Discard unsaved changes?')) return false;
  dirty = false;
  history.pushState({}, '', url);
  return true;
}`
    }
  ],
  deepDive: `<p><b>🟣 Events, precisely.</b> <code>popstate</code> fires when the active history entry changes through <i>traversal</i> (Back, Forward, <code>go()</code>, or editing the URL's hash). It does <b>not</b> fire for <code>pushState</code> or <code>replaceState</code>. The event's <code>state</code> is the entry's stored object. On page load some old browsers fired it too; modern ones do not, which is why you call <code>render()</code> once on startup.</p>
  <p><b>Same-origin rule.</b> The URL passed to pushState must have the same origin as the current page (scheme, host, port) or it throws a <code>SecurityError</code>; only the path, query and hash may differ. Paths are resolved relative to the current URL, so <code>pushState(null, '', 'detail')</code> on <code>/a/b</code> gives <code>/a/detail</code> - use absolute paths. The title argument is ignored by browsers; set <code>document.title</code> yourself.</p>
  <p><b>Routing details that bite.</b> Trailing slashes (<code>/users</code> vs <code>/users/</code>), the base path when deployed under <code>/app</code>, URL-encoded params (<code>decodeURIComponent</code>), query strings that are state, and the 404 route (render a not-found view and, for SEO, make the server send a real 404 status where possible). <b>Accessibility</b>: after a route change there is no page load, so screen readers hear nothing. Move focus to the new page's heading (or a wrapper with <code>tabindex="-1"</code>), update <code>document.title</code>, and announce the change in an <code>aria-live</code> region.</p>
  <p><b>Scroll.</b> The default <code>scrollRestoration: 'auto'</code> restores scroll on Back before your async data arrives, so the page may be too short. Many routers set it to <code>manual</code> and restore after render. New navigations should scroll to the top (or to the <code>#hash</code> target).</p>
  <p><b>Navigation API.</b> A modern replacement that fires one <code>navigate</code> event for every navigation, lets you <code>intercept()</code> with an async handler, tracks <code>navigation.entries()</code> (a real list you can inspect, unlike History's opaque stack) and handles loading/abort for you. It has been in Chromium for a while and has recently reached the other engines; check browser support for your audience and keep a pushState fallback. Pair it with <b>View Transitions</b> for animated route changes.</p>
  <p><b>Frameworks.</b> react-router, Next.js, Vue Router and TanStack Router are this module plus data loading, nested routes, code-splitting per route, prefetching on hover/visible links (an IntersectionObserver!), and server rendering. Understanding the History API is how you debug them.</p>`,
  aiEra: `<p><b>What AI changes:</b> asking an assistant for "a simple router" usually returns working code - but often with <code>window.location.href = '/about'</code> (a full reload, defeating the point), or listeners on <code>hashchange</code> while the links use real paths, or a missing <code>popstate</code> handler so Back breaks. Hand-rolled routers in AI answers also ignore modifier-key clicks and the server fallback.</p>
  <p><b>Use AI as a partner:</b> ask it to generate a <b>checklist of navigation behaviours to test</b> (deep link, refresh, Back after push, Back after replace, forward cut-off, external link, ctrl-click, unknown route, query change, focus after navigation). Turn each into a test using a fake history like the one in this module.</p>
  <p><b>AI-era use cases:</b> chat products put the conversation id in the URL (<code>/chat/abc123</code>) so each chat is shareable and Back works; streaming answers must be cancelled (AbortController!) when the user navigates away; AI agents driving a browser rely on real URLs and history to move around and to report where they are.</p>
  <p><b>What you must still own:</b> choosing push vs replace, keeping meaningful state in the URL, the server fallback and a11y (focus, title, announcements) - things generators skip because they are not visible in a screenshot.</p>`,
  problems: [
    {
      title: 'Build an SPA Router with pushState and popstate', level: 'Medium', tags: ['History API', 'router', 'popstate', 'route params'], companies: ['Meta', 'Airbnb', 'Razorpay'],
      statement: `<p>Implement <code>createRouter(history, routes, render)</code>. <code>history</code> offers <code>url</code>, <code>pushState</code>, <code>replaceState</code> and <code>onPopState(fn)</code>. <code>routes</code> is an array like <code>[{ path: '/users/:id', view: 'User' }]</code>. The router returns <code>{ start, navigate(url, opts), link(event) }</code>. Requirements: (1) <code>start()</code> renders the current URL (deep link). (2) <code>navigate(url)</code> pushes and renders, but does <b>nothing</b> if the URL equals the current one; with <code>{ replace: true }</code> it replaces instead of pushing. (3) Back/Forward (popstate) must render <b>without pushing</b>. (4) Match <code>:param</code> segments and parse the query string. (5) Unknown paths render the view <code>'NotFound'</code>. (6) <code>link(event)</code> receives a click-like object <code>{ href, button, metaKey, ctrlKey, shiftKey, altKey, preventDefault }</code> and returns true only if it intercepted the click (left click, no modifier keys, same-origin path starting with <code>/</code>).</p>`,
      constraints: `Up to 100 routes, paths of at most 200 characters. Param values may be URL-encoded. No DOM access inside the router.`,
      example: `${H.table(['Action', 'History after', 'Render'], [['start() at /', '[/]', 'Home'], ['navigate("/users/7?tab=posts")', '[/ , /users/7?tab=posts]', 'User {id:"7"} query {tab:"posts"}'], ['navigate("/users/7?tab=posts") again', 'unchanged', '<span class="c-m">no render</span>'], ['back (popstate)', '[/]  (finger moves)', 'Home, <span class="c-g">no push</span>'], ['navigate("/zzz")', '[/ , /zzz]', 'NotFound']])}`,
      brute: {
        why: `<p>The naive router changes <code>location.href</code> (full page reload, all state lost), has no popstate handling, and uses exact string comparison so <code>/users/7</code> never matches a <code>:id</code> route. Every click costs a network round trip.</p>`,
        code: `function navigateNaive(url) {
  window.location.href = url;     // full reload: loses JS state, refetches everything
}
function matchNaive(routes, path) {
  return routes.find(function (r) { return r.path === path; }) || null;   // no params, no query
}`
      },
      mcq: { q: 'The user presses the Back button. What should the router do?', options: ['Render the route for the new location, without calling pushState', 'Call pushState with the previous URL', 'Reload the page', 'Ignore it, pushState already handled it'], answer: 0, explain: 'popstate means the browser already moved to the previous entry and updated the URL. Pushing again would add a new entry and corrupt the stack; we only need to draw the matching view.' },
      hints: [
        `<p>Hint 1: one internal <code>show()</code> function reads <code>history.url</code> and renders. Every way of navigating (start, navigate, popstate) ends by calling it.</p>`,
        `<p>Hint 2: compile each route pattern into a regex with capture groups for <code>:name</code> segments and remember the names. Use <code>new URL(url, base)</code> to split path and query.</p>`,
        `<p>Hint 3: <code>navigate</code> returns early if the url equals the current one; otherwise <code>pushState</code> (or <code>replaceState</code>) then <code>show()</code>. Register <code>history.onPopState(show)</code> once, inside <code>createRouter</code>. In <code>link</code>, check button 0, no modifier keys, and <code>href.startsWith('/')</code> before calling <code>preventDefault</code>.</p>`
      ],
      solution: {
        approach: `<p>Separate matching (pure) from navigation (side effects). All entry points funnel through <code>show()</code>. Popstate only calls <code>show()</code>; navigate adds the history change first. Link interception is a small guard function so ctrl-click, new-tab and external links keep browser behaviour.</p>`,
        code: {
          lang: 'js', run: true, code: `class FakeHistory {
  constructor(u) { this.entries = [u]; this.i = 0; this.pop = []; }
  get url() { return this.entries[this.i]; }
  pushState(s, t, u) { this.entries = this.entries.slice(0, this.i + 1); this.entries.push(u); this.i++; }
  replaceState(s, t, u) { this.entries[this.i] = u; }
  back() { if (this.i > 0) { this.i--; this.pop.forEach(function (f) { f(); }); } }
  onPopState(f) { this.pop.push(f); }
}

function createRouter(history, routes, render) {
  const compiled = routes.map(function (r) {
    const names = [];
    const pattern = r.path.split('/').map(function (seg) {
      if (seg.charAt(0) === ':') { names.push(seg.slice(1)); return '([^/]+)'; }
      return seg.replace(/[.*+?^()|[\\]{}$]/g, '');   // keep literal segments simple
    }).join('/');
    return { re: new RegExp('^' + pattern + '/?$'), names: names, view: r.view };
  });

  function match(url) {
    const u = new URL(url, 'http://app.local');
    for (const r of compiled) {
      const m = r.re.exec(u.pathname);
      if (!m) continue;
      const params = {};
      r.names.forEach(function (n, i) { params[n] = decodeURIComponent(m[i + 1]); });
      return { view: r.view, params: params, query: Object.fromEntries(u.searchParams) };
    }
    return { view: 'NotFound', params: {}, query: {} };
  }

  function show() { render(match(history.url)); }
  history.onPopState(show);                  // Back/Forward: render only, never push

  return {
    start: show,
    navigate: function (url, opts) {
      if (url === history.url) return false;
      if (opts && opts.replace) history.replaceState({}, '', url);
      else history.pushState({}, '', url);
      show();
      return true;
    },
    link: function (ev) {
      if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return false;
      if (typeof ev.href !== 'string' || ev.href.charAt(0) !== '/' || ev.href.indexOf('//') === 0) return false;
      ev.preventDefault();
      this.navigate(ev.href);
      return true;
    }
  };
}

const h = new FakeHistory('/');
const out = [];
const router = createRouter(h, [{ path: '/', view: 'Home' }, { path: '/users/:id', view: 'User' }], function (r) {
  out.push(r.view + ' ' + JSON.stringify(r.params) + ' ' + JSON.stringify(r.query));
});
router.start();
router.navigate('/users/7?tab=posts');
router.navigate('/users/7?tab=posts');          // duplicate: ignored
h.back();                                       // popstate
router.navigate('/zzz');
console.log(out.join('\\n'));
console.log('history:', h.entries.join(' , '), '| at', h.url);
console.log('ctrl-click intercepted?', router.link({ href: '/users/9', button: 0, ctrlKey: true, preventDefault: function () {} }));
console.log('plain click intercepted?', router.link({ href: '/users/9', button: 0, preventDefault: function () {} }), '->', out[out.length - 1]);`
        },
        complexity: `<p>Matching is O(R x L) for R routes and path length L (a trie would make it O(L)). Navigation itself is O(1) plus the cost of render.</p>`,
        followUps: ['Add nested routes and a wildcard (*) route.', 'Add a navigation guard that can cancel a navigation (what do you do on Back?).', 'Add scroll restoration using history.state.']
      }
    }
  ]
});

/* ============================ PRACTICE: Easy ============================ */
practice.push({
  title: 'Safe JSON Storage Wrapper', level: 'Easy', tags: ['localStorage', 'JSON', 'error handling'], companies: ['Amazon', 'Zomato'],
  statement: `<p>Write <code>createSafeStorage(backend)</code> where <code>backend</code> has <code>getItem</code>, <code>setItem</code> and <code>removeItem</code> (like <code>localStorage</code>). Return <code>{ get(key, fallback), set(key, value), remove(key) }</code>. It must <b>never throw</b>: <code>get</code> returns <code>fallback</code> when the key is missing, the JSON is corrupt, or storage itself throws. <code>set</code> returns <code>true</code> on success and <code>false</code> on failure (for example quota exceeded). Setting <code>undefined</code> should remove the key (because <code>JSON.stringify(undefined)</code> is not valid JSON).</p>`,
  constraints: `Values are JSON-serialisable. Keys are strings. Backend calls may throw at any time.`,
  example: `${H.table(['Call', 'Backend state', 'Result'], [['get("theme", "light")', 'missing', '<span class="c-g">"light"</span>'], ['get("cart", [])', '"{bad json"', '<span class="c-g">[]</span> (no crash)'], ['set("a", {x:1})', 'quota full', '<span class="c-r">false</span>'], ['set("a", undefined)', 'a exists', 'removed, <span class="c-g">true</span>']])}`,
  brute: {
    why: `<p>Calling <code>JSON.parse(localStorage.getItem(k))</code> directly crashes the whole screen when the stored text is corrupt, and <code>setItem</code> throws when site data is blocked or storage is full. One bad entry takes the app down on every visit.</p>`,
    code: `function getNaive(key) { return JSON.parse(localStorage.getItem(key)); }   // throws on corrupt or blocked storage
function setNaive(key, value) { localStorage.setItem(key, JSON.stringify(value)); }`
  },
  mcq: { q: 'Which situation can make <code>localStorage.setItem</code> throw?', options: ['Quota full, or storage disabled/private mode', 'Using a key longer than 3 characters', 'Calling it twice', 'Storing a string'], answer: 0, explain: 'QuotaExceededError and SecurityError are real. Always wrap storage access in try/catch and have a default.' },
  hints: [
    `<p>Hint 1: every storage call can fail, so every call goes inside a <code>try</code> block.</p>`,
    `<p>Hint 2: <code>getItem</code> returns <code>null</code> for a missing key - treat that like "use fallback". <code>JSON.parse</code> can throw, so it must be in the same try.</p>`,
    `<p>Hint 3: for <code>set</code>, check <code>value === undefined</code> first and call <code>removeItem</code>. Return booleans so callers can show a "could not save" hint if they care.</p>`
  ],
  solution: {
    approach: `<p>Wrap each method in try/catch and return safe defaults. The missing-key check uses <code>null</code> (a stored <code>"null"</code> text would parse to <code>null</code> legitimately, so we must not confuse the two).</p>`,
    code: {
      lang: 'js', run: true, code: `function createSafeStorage(backend) {
  return {
    get: function (key, fallback) {
      try {
        const raw = backend.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try {
        if (value === undefined) { backend.removeItem(key); return true; }
        backend.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) { return false; }
    },
    remove: function (key) {
      try { backend.removeItem(key); return true; } catch (e) { return false; }
    }
  };
}

// Fake backends
const data = { cart: '{bad json' };
const ok = { getItem: function (k) { return k in data ? data[k] : null; }, setItem: function (k, v) { data[k] = v; }, removeItem: function (k) { delete data[k]; } };
const full = { getItem: function () { return null; }, setItem: function () { throw new Error('QuotaExceededError'); }, removeItem: function () {} };

const s = createSafeStorage(ok);
console.log(s.get('theme', 'light'), JSON.stringify(s.get('cart', [])), s.set('a', { x: 1 }), JSON.stringify(s.get('a')));
console.log(s.set('a', undefined), s.get('a', 'gone'));
console.log('full storage ->', createSafeStorage(full).set('a', 1));`
    },
    complexity: `<p>O(size of value) for stringify/parse; O(1) extra space.</p>`,
    followUps: ['How would you add a version number so old data from a previous app release is ignored?', 'How would you fall back to an in-memory Map when storage is unusable?']
  }
});

practice.push({
  title: 'getJson That Treats HTTP Errors as Errors', level: 'Easy', tags: ['fetch', 'res.ok', 'error handling'], companies: ['Flipkart', 'Atlassian'],
  statement: `<p>Write <code>async function getJson(fetchFn, url)</code>. It calls <code>fetchFn(url)</code> and: returns <code>null</code> for status <b>204</b>; throws an <code>HttpError</code> (with <code>.status</code>) when <code>res.ok</code> is false; throws a <code>TypeError('Expected JSON')</code> when the response's <code>content-type</code> header does not include <code>application/json</code>; otherwise returns the parsed body. <code>res.headers.get(name)</code> gives header values.</p>`,
  constraints: `Response has <code>ok</code>, <code>status</code>, <code>headers.get()</code>, <code>json()</code>. Network failures should propagate unchanged.`,
  example: `${H.table(['Server answer', 'getJson does'], [['200 + JSON', '<span class="c-g">returns object</span>'], ['204', '<span class="c-g">returns null</span>'], ['404', '<span class="c-r">throws HttpError(404)</span>'], ['200 + text/html (login page)', '<span class="c-r">throws TypeError</span>']])}`,
  brute: {
    why: `<p>Calling <code>res.json()</code> blindly: on a 404 HTML page it throws a confusing "Unexpected token &lt;" error, and a 204 (no body) also throws. The real cause (HTTP status) is lost.</p>`,
    code: `async function getJsonNaive(fetchFn, url) {
  const res = await fetchFn(url);
  return res.json();   // 404 page -> SyntaxError; 204 -> SyntaxError
}`
  },
  mcq: { q: 'A fetch to a missing URL returns status 404. What happens to the promise?', options: ['It resolves; you must check res.ok', 'It rejects with a TypeError', 'It rejects with AbortError', 'It never settles'], answer: 0, explain: 'fetch only rejects for network-level failures. HTTP error codes still resolve, so res.ok / res.status must be checked.' },
  hints: [
    `<p>Hint 1: order matters - check status first (204, then !ok) before touching the body.</p>`,
    `<p>Hint 2: define <code>class HttpError extends Error</code> that stores <code>status</code> so callers can branch on 401 vs 500.</p>`,
    `<p>Hint 3: header lookup can return <code>null</code>; use <code>(res.headers.get('content-type') || '')</code> before calling <code>includes</code>.</p>`
  ],
  solution: {
    approach: `<p>Guard clauses in a sensible order: 204, not ok, wrong content type, then parse. The custom error class keeps the status number for callers.</p>`,
    code: {
      lang: 'js', run: true, code: `class HttpError extends Error {
  constructor(status, message) { super(message || 'HTTP ' + status); this.name = 'HttpError'; this.status = status; }
}

async function getJson(fetchFn, url) {
  const res = await fetchFn(url);
  if (res.status === 204) return null;
  if (!res.ok) throw new HttpError(res.status);
  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new TypeError('Expected JSON');
  return res.json();
}

function fakeRes(status, type, body) {
  return { ok: status >= 200 && status < 300, status: status, headers: { get: function () { return type; } }, json: function () { return Promise.resolve(body); } };
}
const cases = [[200, 'application/json; charset=utf-8', { id: 1 }], [204, null, null], [404, 'text/html', null], [200, 'text/html', null]];
(async function () {
  for (const c of cases) {
    try { console.log(c[0], c[1], '->', JSON.stringify(await getJson(function () { return Promise.resolve(fakeRes(c[0], c[1], c[2])); }, '/x'))); }
    catch (e) { console.log(c[0], c[1], '->', e.name, e.status || e.message); }
  }
})();`
    },
    complexity: `<p>O(1) work besides parsing the body (O(body size)).</p>`,
    followUps: ['Also read the error body (JSON problem details) and attach it to HttpError.', 'Add a typed generic return in TypeScript: <code>getJson&lt;T&gt;(): Promise&lt;T | null&gt;</code>.']
  }
});

practice.push({
  title: 'Read, Write and Delete Cookies', level: 'Easy', tags: ['cookies', 'document.cookie', 'parsing'], companies: ['Walmart', 'Paytm'],
  statement: `<p>Implement three pure helpers that work on cookie <b>strings</b> so they can be tested without a browser: <code>getCookie(cookieString, name)</code> returns the decoded value or <code>null</code>; <code>makeCookie(name, value, { days, path })</code> returns a string like <code>theme=dark; Max-Age=604800; Path=/; SameSite=Lax</code> with name and value URL-encoded; <code>deleteCookie(name, path)</code> returns a string that expires the cookie (<code>Max-Age=0</code>). In a browser you would assign the result to <code>document.cookie</code>.</p>`,
  constraints: `Cookie string format is <code>a=1; b=2</code>. Names are case-sensitive. Values may contain <code>=</code> and encoded characters.`,
  example: `<p><code>getCookie("theme=dark; lang=en-IN; cart=%5B1%5D", "cart")</code> gives <b>"[1]"</b>.</p>${H.table(['Call', 'Output'], [['makeCookie("theme","dark",{days:7})', '<code>theme=dark; Max-Age=604800; Path=/; SameSite=Lax</code>'], ['deleteCookie("theme")', '<code>theme=; Max-Age=0; Path=/</code>']])}`,
  brute: {
    why: `<p>Using <code>cookieString.split('=')</code> or a regex built from the name breaks when values contain "=" or when one cookie name ends with another (<code>id</code> vs <code>user_id</code>).</p>`,
    code: `function getCookieNaive(str, name) {
  return str.split('=')[1];    // wrong cookie, wrong when values contain '='
}`
  },
  mcq: { q: 'Which cookie flag stops JavaScript from reading a cookie via document.cookie?', options: ['HttpOnly', 'Secure', 'SameSite', 'Path'], answer: 0, explain: 'HttpOnly hides the cookie from scripts (and so from XSS theft). Only a server can set it.' },
  hints: [
    `<p>Hint 1: split the whole string on <code>; </code> first to get one piece per cookie.</p>`,
    `<p>Hint 2: for each piece split at the <b>first</b> "=" only, using <code>indexOf</code>, so "=" inside values survives.</p>`,
    `<p>Hint 3: <code>Max-Age</code> is in seconds: days * 24 * 60 * 60. Always encode name and value with <code>encodeURIComponent</code>. Delete = same name and path with <code>Max-Age=0</code>.</p>`
  ],
  solution: {
    approach: `<p>Parse by scanning pieces and comparing exact names. Build strings with sensible defaults (Path, SameSite=Lax). Deleting works by setting an already-expired cookie with the same name and path.</p>`,
    code: {
      lang: 'js', run: true, code: `function getCookie(str, name) {
  const pieces = str.split(';');
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i].trim();
    const eq = piece.indexOf('=');          // first '=' only
    if (eq < 0) continue;
    if (decodeURIComponent(piece.slice(0, eq)) === name) return decodeURIComponent(piece.slice(eq + 1));
  }
  return null;
}

function makeCookie(name, value, o) {
  o = o || {};
  let s = encodeURIComponent(name) + '=' + encodeURIComponent(value);
  if (o.days !== undefined) s += '; Max-Age=' + Math.round(o.days * 24 * 60 * 60);
  s += '; Path=' + (o.path || '/') + '; SameSite=Lax';
  return s;
}

function deleteCookie(name, path) {
  return encodeURIComponent(name) + '=; Max-Age=0; Path=' + (path || '/');
}

const jar = 'theme=dark; lang=en-IN; cart=%5B1%5D; user_id=7; id=9';
console.log(getCookie(jar, 'cart'), getCookie(jar, 'id'), getCookie(jar, 'user_id'), getCookie(jar, 'none'));
console.log(makeCookie('theme', 'dark', { days: 7 }));
console.log(makeCookie('note', 'a=b; c', {}));
console.log(deleteCookie('theme'));`
    },
    complexity: `<p>getCookie is O(length of the string); building strings is O(length of name + value).</p>`,
    followUps: ['Why can JavaScript never set HttpOnly? Who sets it?', 'What does SameSite=None require? (Secure)']
  }
});

/* ============================ PRACTICE: Medium ============================ */
practice.push({
  title: 'Fetch with Timeout (and a User Cancel)', level: 'Medium', tags: ['fetch', 'AbortController', 'timeout'], companies: ['Google', 'Stripe'],
  statement: `<p>Write <code>fetchWithTimeout(fetchFn, url, ms, userSignal)</code>. It must abort the request after <code>ms</code> milliseconds and reject with an error whose <code>name</code> is <code>'TimeoutError'</code>. If the optional <code>userSignal</code> aborts first, the request is aborted and the rejection stays an <code>AbortError</code> (cancelled on purpose, not a timeout). The timer must always be cleared so nothing leaks, even on success.</p>`,
  constraints: `ms between 1 and 60000. <code>fetchFn(url, { signal })</code> rejects with an AbortError when the signal aborts. Avoid unhandled promise rejections.`,
  example: `${H.table(['Situation', 'Result'], [['server answers in 20 ms, ms = 100', '<span class="c-g">response</span>'], ['server answers in 500 ms, ms = 100', '<span class="c-r">TimeoutError after 100 ms</span>'], ['user clicks Cancel at 30 ms', '<span class="c-y">AbortError (not a timeout)</span>']])}`,
  brute: {
    why: `<p>Racing the fetch against a <code>setTimeout</code> rejection stops <i>your code</i> from waiting, but the request keeps running in the background, uses a connection, and the timer is never cleared when the fetch wins.</p>`,
    code: `function fetchWithTimeoutNaive(fetchFn, url, ms) {
  return Promise.race([
    fetchFn(url, {}),
    new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, ms); })
  ]);   // request is NOT cancelled; timer is NOT cleared
}`
  },
  mcq: { q: 'Why create a new AbortController for each call?', options: ['An aborted controller stays aborted and cannot be reused', 'Controllers expire after 5 seconds', 'fetch requires a unique controller id', 'To save memory'], answer: 0, explain: 'Once abort() is called the signal is permanently aborted; reusing it would cancel every future request immediately.' },
  hints: [
    `<p>Hint 1: you need to know <i>why</i> the abort happened (timer vs user), so remember it in a variable such as <code>timedOut</code>.</p>`,
    `<p>Hint 2: create a controller, start <code>setTimeout(() =&gt; { timedOut = true; controller.abort(); }, ms)</code>, and if <code>userSignal</code> exists listen for its abort event and abort the controller too.</p>`,
    `<p>Hint 3: in <code>catch</code>, if <code>timedOut</code> convert the AbortError into an Error named TimeoutError; otherwise rethrow. Use <code>finally</code> to <code>clearTimeout</code> and remove the user listener.</p>`
  ],
  solution: {
    approach: `<p>One internal controller is the only signal given to fetch. The timer and the user's signal both abort it. A flag tells us which one caused the abort so we can translate the error. <code>finally</code> cleans up.</p>`,
    code: {
      lang: 'js', run: true, code: `async function fetchWithTimeout(fetchFn, url, ms, userSignal) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(function () { timedOut = true; controller.abort(); }, ms);
  const onUserAbort = function () { controller.abort(); };
  if (userSignal) {
    if (userSignal.aborted) controller.abort();
    else userSignal.addEventListener('abort', onUserAbort);
  }
  try {
    return await fetchFn(url, { signal: controller.signal });
  } catch (err) {
    if (timedOut && err.name === 'AbortError') {
      const e = new Error('Request timed out after ' + ms + 'ms');
      e.name = 'TimeoutError';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (userSignal) userSignal.removeEventListener('abort', onUserAbort);
  }
}

function slowFetch(delay) {
  return function (url, o) {
    return new Promise(function (resolve, reject) {
      const t = setTimeout(function () { resolve('response from ' + url); }, delay);
      o.signal.addEventListener('abort', function () { clearTimeout(t); reject(new DOMException('aborted', 'AbortError')); });
    });
  };
}
(async function () {
  console.log(await fetchWithTimeout(slowFetch(20), '/fast', 100));
  try { await fetchWithTimeout(slowFetch(500), '/slow', 50); } catch (e) { console.log('slow ->', e.name); }
  const user = new AbortController();
  setTimeout(function () { user.abort(); }, 20);
  try { await fetchWithTimeout(slowFetch(500), '/cancelled', 300, user.signal); } catch (e) { console.log('cancel ->', e.name); }
})();`
    },
    complexity: `<p>O(1) extra work. One timer and at most one listener per call, both cleaned up.</p>`,
    followUps: ['Replace the manual timer with AbortSignal.timeout and AbortSignal.any. What do you lose?', 'Add a separate, longer timeout for reading the body, not just the headers.']
  }
});

practice.push({
  title: 'Retry with Exponential Backoff and Jitter', level: 'Medium', tags: ['retry', 'backoff', 'resilience', 'promises'], companies: ['Netflix', 'Uber', 'Amazon'],
  statement: `<p>Write <code>retry(task, options)</code>. <code>task(attempt)</code> returns a Promise. Retry up to <code>retries</code> extra times when <code>shouldRetry(error)</code> is true. Between attempts wait <code>random() * min(maxMs, baseMs * 2^attempt)</code> milliseconds ("full jitter"). Inject <code>sleep</code> and <code>random</code> so the function is testable. Stop immediately (no waiting) if <code>shouldRetry</code> says no, and throw the last error when attempts run out. The default <code>shouldRetry</code> retries network errors (<code>TypeError</code>) and HTTP status &gt;= 500 but not 4xx.</p>`,
  constraints: `retries from 0 to 10. baseMs 10 to 5000. maxMs at least baseMs. Errors may carry a numeric <code>status</code>.`,
  example: `<p>baseMs = 100, random() always 1 (worst case). Task fails with 503, 503, then succeeds.</p>${H.table(['Attempt', 'Result', 'Wait before next'], [['0', '503', '<span class="c-y">100 ms</span>'], ['1', '503', '<span class="c-y">200 ms</span>'], ['2', 'success', '-']])}`,
  brute: {
    why: `<p>A fixed <code>setTimeout(retry, 1000)</code> loop hammers a struggling server at a constant rate, makes all clients retry in lock-step (a thundering herd), retries 4xx errors that can never succeed, and may loop forever.</p>`,
    code: `async function retryNaive(task) {
  while (true) {                       // never gives up
    try { return await task(); } catch (e) { await new Promise(function (r) { setTimeout(r, 1000); }); }
  }
}`
  },
  mcq: { q: 'Why add random jitter to the delay?', options: ['So many clients do not all retry at the same instant', 'To make the wait shorter on average only', 'Because setTimeout needs a random value', 'To avoid using Promises'], answer: 0, explain: 'Without jitter, every client that failed together retries together and overloads the recovering server again. Jitter spreads the load.' },
  hints: [
    `<p>Hint 1: a <code>for</code> loop from attempt 0 to <code>retries</code> (inclusive) is simpler than recursion.</p>`,
    `<p>Hint 2: inside try, <code>return await task(attempt)</code>. In catch, throw immediately when <code>attempt === retries</code> or <code>!shouldRetry(err)</code>.</p>`,
    `<p>Hint 3: delay = <code>Math.floor(random() * Math.min(maxMs, baseMs * 2 ** attempt))</code>; then <code>await sleep(delay)</code> and continue the loop.</p>`
  ],
  solution: {
    approach: `<p>Loop over attempts. Decide in the catch block whether to stop or wait. Capping the exponential term with <code>maxMs</code> keeps waits sensible for large retry counts. Injecting <code>sleep</code> lets tests run instantly and assert the exact delays.</p>`,
    code: {
      lang: 'js', run: true, code: `function defaultShouldRetry(err) {
  if (err && err.name === 'TypeError') return true;                    // network failure
  return !!err && typeof err.status === 'number' && err.status >= 500; // server trouble
}

async function retry(task, options) {
  const o = Object.assign({
    retries: 3, baseMs: 100, maxMs: 5000,
    shouldRetry: defaultShouldRetry,
    random: Math.random,
    sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  }, options);
  for (let attempt = 0; ; attempt++) {
    try {
      return await task(attempt);
    } catch (err) {
      if (attempt >= o.retries || !o.shouldRetry(err)) throw err;
      const ceiling = Math.min(o.maxMs, o.baseMs * Math.pow(2, attempt));
      await o.sleep(Math.floor(o.random() * ceiling));
    }
  }
}

const waits = [];
const fakeSleep = function (ms) { waits.push(ms); return Promise.resolve(); };
function httpError(status) { const e = new Error('HTTP ' + status); e.status = status; return e; }

(async function () {
  const r = await retry(function (n) { if (n < 2) return Promise.reject(httpError(503)); return Promise.resolve('ok on attempt ' + n); }, { random: function () { return 1; }, sleep: fakeSleep });
  console.log(r, '| waits:', waits.join(', '));
  try { await retry(function () { return Promise.reject(httpError(404)); }, { sleep: fakeSleep }); } catch (e) { console.log('404 stops at once ->', e.message); }
  waits.length = 0;
  try { await retry(function () { return Promise.reject(httpError(500)); }, { retries: 4, baseMs: 100, maxMs: 300, random: function () { return 1; }, sleep: fakeSleep }); } catch (e) { console.log('gave up after waits:', waits.join(', ')); }
})();`
    },
    complexity: `<p>Time is dominated by the waits (at most retries x maxMs); extra space O(1).</p>`,
    followUps: ['Honour the Retry-After header when the server sends one.', 'Why must non-idempotent POSTs not be retried blindly? How does an idempotency key fix it?']
  }
});

practice.push({
  title: 'Cache with Expiry (TTL) and Schema Version', level: 'Medium', tags: ['localStorage', 'TTL', 'versioning', 'cache'], companies: ['Shopify', 'Swiggy'],
  statement: `<p>Build <code>createTtlStore(backend, version, now)</code>. <code>set(key, value, ttlMs)</code> saves <code>{ v: version, exp: now() + ttlMs, data: value }</code> as JSON. <code>get(key)</code> returns the value, or <code>undefined</code> when the key is missing, <b>expired</b>, saved with a <b>different version</b>, or corrupt - and in those cases it also deletes the entry (self-cleaning). <code>now</code> is an injected clock (a function returning milliseconds). Also add <code>sweep()</code> that removes every expired entry it can find and returns how many it removed; the backend exposes <code>keys()</code> for this.</p>`,
  constraints: `ttlMs between 1 and 30 days. The backend can throw on write (quota); then <code>set</code> returns false.`,
  example: `${H.table(['Time', 'Action', 'Result'], [['t = 0', 'set("user", {id:1}, 1000)', 'saved'], ['t = 500', 'get("user")', '<span class="c-g">{id:1}</span>'], ['t = 1500', 'get("user")', '<span class="c-r">undefined</span> + entry deleted'], ['after app update (version 2)', 'get of old v1 data', '<span class="c-r">undefined</span> (schema changed)']])}`,
  brute: {
    why: `<p>Plain <code>localStorage</code> never forgets: stale data lives forever, old shapes of the data crash new code after a release, and nothing ever cleans up so the quota fills.</p>`,
    code: `function getNaive(key) { return JSON.parse(localStorage.getItem(key)); }   // no expiry, no version, may throw`
  },
  mcq: { q: 'Why store an absolute expiry time (exp) instead of just the TTL?', options: ['The TTL alone cannot tell you when it was saved', 'Absolute times use less memory', 'localStorage requires dates', 'It avoids JSON'], answer: 0, explain: 'On read you compare now() to exp. A bare TTL has no reference point, so you could not tell how old the entry is.' },
  hints: [
    `<p>Hint 1: store a small wrapper object, not just the raw value, so metadata travels with the data.</p>`,
    `<p>Hint 2: in <code>get</code>, parse inside try/catch; if parse fails, version mismatches or <code>exp &lt;= now()</code>, call <code>removeItem</code> and return <code>undefined</code>.</p>`,
    `<p>Hint 3: <code>sweep()</code> loops over <code>backend.keys()</code> and simply calls <code>get(key)</code> for each; count how many entries disappeared.</p>`
  ],
  solution: {
    approach: `<p>The wrapper <code>{ v, exp, data }</code> gives expiry and versioning in one place. Reads validate before returning and delete bad entries so the store heals itself. <code>sweep</code> reuses <code>get</code>.</p>`,
    code: {
      lang: 'js', run: true, code: `function createTtlStore(backend, version, now) {
  function read(key) {
    const raw = backend.getItem(key);
    if (raw === null) return undefined;
    try {
      const rec = JSON.parse(raw);
      if (rec && rec.v === version && typeof rec.exp === 'number' && rec.exp > now()) return rec.data;
    } catch (e) { /* corrupt: fall through and delete */ }
    backend.removeItem(key);
    return undefined;
  }
  return {
    set: function (key, value, ttlMs) {
      try { backend.setItem(key, JSON.stringify({ v: version, exp: now() + ttlMs, data: value })); return true; }
      catch (e) { return false; }
    },
    get: read,
    sweep: function () {
      let removed = 0;
      backend.keys().forEach(function (k) {
        const before = backend.getItem(k);
        read(k);
        if (before !== null && backend.getItem(k) === null) removed++;
      });
      return removed;
    }
  };
}

const mem = {};
const backend = {
  getItem: function (k) { return k in mem ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = v; },
  removeItem: function (k) { delete mem[k]; },
  keys: function () { return Object.keys(mem); }
};
let clock = 0;
const store = createTtlStore(backend, 2, function () { return clock; });
store.set('user', { id: 1 }, 1000);
store.set('temp', 'x', 100);
mem.old = JSON.stringify({ v: 1, exp: 99999, data: 'old shape' });
mem.junk = '{nope';
clock = 500;
console.log(JSON.stringify(store.get('user')), store.get('temp'));
clock = 1500;
console.log('get after expiry:', store.get('user'), '| keys:', Object.keys(mem).join(','));
console.log('sweep removed', store.sweep(), '| keys left:', Object.keys(mem).join(',') || '(none)');`
    },
    complexity: `<p>get/set O(size of value). sweep is O(number of keys) and should run rarely (on app start).</p>`,
    followUps: ['How would you migrate old versions instead of throwing them away?', 'How would you limit total size with an LRU policy?']
  }
});

practice.push({
  title: 'Lazy-Load Helper with IntersectionObserver (observe once)', level: 'Medium', tags: ['IntersectionObserver', 'lazy loading', 'dependency injection'], companies: ['Pinterest', 'Myntra'],
  statement: `<p>Write <code>observeOnce(elements, onVisible, options, ObserverClass)</code>. For every element, call <code>onVisible(element)</code> <b>exactly once</b>, the first time it intersects the viewport, then stop observing that element. It returns a <code>stop()</code> function that disconnects everything. If <code>ObserverClass</code> is not available (very old browser), call <code>onVisible</code> for every element immediately so content still loads. Passing the class in lets you test with a fake.</p>`,
  constraints: `Up to 2000 elements. The browser may deliver several entries per callback, some with <code>isIntersecting: false</code>.`,
  example: `<p>Elements A, B, C. Entries arrive: A visible, B hidden, A visible again, C visible.</p>${H.table(['Entry', 'Action'], [['A visible', '<span class="c-g">onVisible(A), unobserve(A)</span>'], ['B hidden', 'ignore'], ['A visible again', '<span class="c-m">not delivered (already unobserved)</span>'], ['C visible', '<span class="c-g">onVisible(C), unobserve(C)</span>']])}`,
  brute: {
    why: `<p>A scroll listener that calls <code>getBoundingClientRect()</code> on every element on every scroll event forces layout hundreds of times per second and keeps firing forever for elements that already loaded.</p>`,
    code: `function lazyNaive(elements, onVisible) {
  window.addEventListener('scroll', function () {
    elements.forEach(function (el) {
      const r = el.getBoundingClientRect();     // forces layout every time
      if (r.top < window.innerHeight) onVisible(el);   // and calls again and again
    });
  });
}`
  },
  mcq: { q: 'Which entry property tells you an element is entering the viewport?', options: ['isIntersecting', 'target', 'time', 'rootBounds'], answer: 0, explain: 'isIntersecting is true while the target overlaps the root (after applying rootMargin). The callback also fires with false when it leaves.' },
  hints: [
    `<p>Hint 1: the observer callback receives an <b>array</b> of entries and the observer itself as the second argument.</p>`,
    `<p>Hint 2: skip entries with <code>!entry.isIntersecting</code>; for the rest call <code>onVisible(entry.target)</code> then <code>observer.unobserve(entry.target)</code>.</p>`,
    `<p>Hint 3: feature-detect with <code>typeof ObserverClass !== 'function'</code> and run the fallback. Return a <code>stop</code> that calls <code>observer.disconnect()</code>.</p>`
  ],
  solution: {
    approach: `<p>The callback filters on <code>isIntersecting</code>, fires the user callback and unobserves the element so it can never fire again. The injectable class makes the helper testable and gives a safe fallback.</p>`,
    code: {
      lang: 'js', run: true, code: `function observeOnce(elements, onVisible, options, ObserverClass) {
  if (typeof ObserverClass !== 'function') {
    elements.forEach(onVisible);                 // no support: just load everything
    return function stop() {};
  }
  const observer = new ObserverClass(function (entries, obs) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      onVisible(entry.target);
      obs.unobserve(entry.target);               // never again for this element
    });
  }, options);
  elements.forEach(function (el) { observer.observe(el); });
  return function stop() { observer.disconnect(); };
}

// A fake observer so we can test: trigger() simulates the browser delivering entries.
class FakeIO {
  constructor(cb) { this.cb = cb; this.watched = new Set(); FakeIO.last = this; }
  observe(el) { this.watched.add(el); }
  unobserve(el) { this.watched.delete(el); }
  disconnect() { this.watched.clear(); }
  trigger(list) {
    const entries = list.filter(function (x) { return FakeIO.last.watched.has(x[0]); })
      .map(function (x) { return { target: x[0], isIntersecting: x[1] }; });
    if (entries.length) this.cb(entries, this);
  }
}

const seen = [];
const stop = observeOnce(['A', 'B', 'C'], function (el) { seen.push(el); }, { rootMargin: '200px' }, FakeIO);
const io = FakeIO.last;
io.trigger([['A', true], ['B', false]]);
io.trigger([['A', true], ['C', true]]);          // A is not watched any more
console.log('loaded:', seen.join(','), '| still watching:', Array.from(io.watched).join(','));
stop();
const fallbackSeen = [];
observeOnce(['X', 'Y'], function (el) { fallbackSeen.push(el); }, {}, undefined);
console.log('fallback loaded:', fallbackSeen.join(','));`
    },
    complexity: `<p>O(1) per entry; O(N) to register N elements. No work while nothing changes.</p>`,
    followUps: ['How would you load only after 300 ms of continuous visibility?', 'How does loading="lazy" compare, and when is JavaScript still needed?']
  }
});

practice.push({
  title: 'Deduplicate In-Flight Requests', level: 'Medium', tags: ['fetch', 'promise caching', 'deduplication'], companies: ['Meta', 'Atlassian'],
  statement: `<p>Several components ask for <code>/api/user/1</code> at the same moment. Write <code>createDedupedFetcher(fetchFn)</code> returning <code>get(url)</code> so that concurrent calls for the <b>same url share one network request</b> and one promise. Once that request settles (success or failure) the entry is removed, so a later call fetches again. A failure must reach <b>all</b> waiting callers, and must not poison later calls. Add <code>get(url, { fresh: true })</code> to force a new request even when one is in flight.</p>`,
  constraints: `Up to 1000 distinct URLs in flight. Values returned are shared, so callers must not mutate them (mention this in your design).`,
  example: `${H.table(['Call', 'Network requests'], [['get(A) x3 at once', '<span class="c-g">1</span>'], ['get(B)', '1 more (different URL)'], ['get(A) after A finished', '<span class="c-y">1 more (fresh data)</span>'], ['get(A, {fresh:true}) while A pending', '<span class="c-y">1 more</span>']])}`,
  brute: {
    why: `<p>Each component calls fetch itself. A page with 5 widgets that all need the current user sends 5 identical requests, wasting bandwidth and slowing the page, and the responses may even differ slightly.</p>`,
    code: `function getNaive(fetchFn, url) { return fetchFn(url).then(function (r) { return r.json(); }); }   // N callers -> N requests`
  },
  mcq: { q: 'What should be cached in the Map?', options: ['The Promise (not the finished value)', 'Only the resolved JSON', 'The URL string', 'The AbortController'], answer: 0, explain: 'Caching the promise lets callers that arrive while the request is still running share it. Caching only the value would miss the in-flight window.' },
  hints: [
    `<p>Hint 1: the shared thing is the <b>promise</b>. If a promise already exists for that url, return it.</p>`,
    `<p>Hint 2: store the promise in a <code>Map</code> keyed by url, and remove the entry when the promise settles (both success and failure) using <code>finally</code>.</p>`,
    `<p>Hint 3: when removing, compare identity: only delete if the map still holds <i>your</i> promise (a fresh request may have replaced it).</p>`
  ],
  solution: {
    approach: `<p>A Map from url to in-flight promise. A <code>fresh</code> flag bypasses the lookup. Cleanup in <code>finally</code> guards against deleting a newer promise that took the same slot.</p>`,
    code: {
      lang: 'js', run: true, code: `function createDedupedFetcher(fetchFn) {
  const inflight = new Map();
  return {
    get: function (url, opts) {
      if (!(opts && opts.fresh) && inflight.has(url)) return inflight.get(url);
      const p = fetchFn(url).then(function (res) { return res.json(); });
      inflight.set(url, p);
      const cleanup = function () { if (inflight.get(url) === p) inflight.delete(url); };
      p.then(cleanup, cleanup);          // runs on success AND failure, never throws
      return p;
    }
  };
}

let network = 0;
function fakeFetch(url) {
  network++;
  const n = network;
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      if (url === '/bad') reject(new Error('network down'));
      else resolve({ json: function () { return Promise.resolve({ url: url, requestNumber: n }); } });
    }, 20);
  });
}
const f = createDedupedFetcher(fakeFetch);
(async function () {
  const three = await Promise.all([f.get('/user/1'), f.get('/user/1'), f.get('/user/1')]);
  console.log('3 callers, requests made:', network, '| same object shared:', three[0] === three[1]);
  await f.get('/user/1');
  console.log('after settle, a new call fetches again, total requests:', network);
  const fresh = f.get('/user/1');
  const forced = f.get('/user/1', { fresh: true });
  await Promise.all([fresh, forced]);
  console.log('with fresh:true total requests:', network);
  const results = await Promise.allSettled([f.get('/bad'), f.get('/bad')]);
  console.log('failure reaches both callers:', results.map(function (r) { return r.status; }).join(','), '| requests:', network);
  console.log('retry after failure works:', (await f.get('/user/2')).requestNumber);
})();`
    },
    complexity: `<p>O(1) per call. Map size is bounded by the number of distinct URLs currently in flight.</p>`,
    followUps: ['Add a short result cache (stale-while-revalidate) on top of this.', 'What if one caller aborts? Should the shared request stop? (Only when every caller aborted - reference counting.)']
  }
});

practice.push({
  title: 'Log Out Every Tab (Cross-Tab Sync)', level: 'Medium', tags: ['storage event', 'localStorage', 'cross-tab', 'auth'], companies: ['Google', 'Dropbox'],
  statement: `<p>When the user logs out in one tab, all other open tabs of the same site should show the login screen. Implement <code>setupLogoutSync(win, storage, onLogout)</code> returning <code>logout()</code>. <code>logout()</code> must run <code>onLogout()</code> in the <b>current</b> tab and notify the others through <code>storage</code>. Other tabs react to the <code>storage</code> event for the key <code>'logout'</code>. Remember: the storage event fires only in the <i>other</i> tabs and only when the value <b>changes</b>, so two logouts in a row must still notify. <code>win</code> has <code>addEventListener</code>; <code>storage</code> has <code>setItem</code>.</p>`,
  constraints: `Any number of tabs. Do not store credentials in the logout key. Unrelated keys must be ignored. Removing the key must not trigger a logout.`,
  example: `${H.table(['Event', 'Tab A (initiator)', 'Tab B'], [['A calls logout()', '<span class="c-g">onLogout() immediately</span>', 'storage event key="logout" -> <span class="c-g">onLogout()</span>'], ['A logs out again later', 'onLogout()', 'new timestamp value -> <span class="c-g">fires again</span>'], ['theme changes', 'n/a', '<span class="c-m">ignored (other key)</span>']])}`,
  brute: {
    why: `<p>Only clearing the token in the current tab leaves other tabs showing private data until they next call the server. A fixed value like "true" written twice produces no event the second time because the value did not change.</p>`,
    code: `function logoutNaive(storage, onLogout) {
  onLogout();
  storage.setItem('logout', 'true');   // second logout writes the same value -> no storage event
}`
  },
  mcq: { q: 'In which tab does a <code>storage</code> event fire after <code>localStorage.setItem</code>?', options: ['Only in the OTHER tabs of the same origin', 'Only in the same tab', 'In all tabs including the writer', 'In no tab'], answer: 0, explain: 'The writer already knows what it did. The event exists to tell the other documents sharing that storage area.' },
  hints: [
    `<p>Hint 1: two jobs: do the local logout now, and leave a note for the other tabs.</p>`,
    `<p>Hint 2: the note must <b>change</b> each time, so write a unique value such as <code>String(Date.now()) + Math.random()</code>.</p>`,
    `<p>Hint 3: the listener checks <code>e.key === 'logout'</code> and <code>e.newValue !== null</code> (removal sets newValue to null) before calling <code>onLogout</code>.</p>`
  ],
  solution: {
    approach: `<p>The initiating tab runs the handler directly. Other tabs run it from the event. A unique value guarantees an event every time, and ignoring <code>newValue === null</code> avoids reacting to cleanup.</p>`,
    code: {
      lang: 'js', run: true, code: `function setupLogoutSync(win, storage, onLogout) {
  win.addEventListener('storage', function (e) {
    if (e.key === 'logout' && e.newValue !== null) onLogout();
  });
  return function logout() {
    onLogout();                                             // this tab
    try {
      storage.setItem('logout', Date.now() + ':' + Math.random());   // other tabs (value always differs)
    } catch (err) { /* storage blocked: other tabs will find out on their next API call */ }
  };
}

// Fake browser: tabs share one storage; a write notifies every OTHER tab, only if the value changed.
const shared = {};
const tabs = [];
function makeTab(name) {
  const handlers = [];
  const tab = {
    name: name,
    win: { addEventListener: function (type, fn) { if (type === 'storage') handlers.push(fn); } },
    storage: {
      setItem: function (k, v) {
        const old = k in shared ? shared[k] : null;
        shared[k] = v;
        if (old !== v) tabs.forEach(function (t) { if (t !== tab) t.fire({ key: k, newValue: v, oldValue: old }); });
      }
    },
    fire: function (e) { handlers.forEach(function (h) { h(e); }); }
  };
  tabs.push(tab);
  return tab;
}
const log = [];
const A = makeTab('A'), B = makeTab('B'), C = makeTab('C');
const logoutA = setupLogoutSync(A.win, A.storage, function () { log.push('A logged out'); });
setupLogoutSync(B.win, B.storage, function () { log.push('B logged out'); });
setupLogoutSync(C.win, C.storage, function () { log.push('C logged out'); });
logoutA();
console.log(log.join(' | '));
log.length = 0;
logoutA();                                                  // same user logs out again later
console.log('second logout still notifies:', log.join(' | '));
log.length = 0;
B.fire({ key: 'theme', newValue: 'dark' });
B.fire({ key: 'logout', newValue: null });
console.log('ignored events ->', log.length === 0 ? 'nothing happened' : log.join(','));`
    },
    complexity: `<p>O(T) notifications for T tabs per logout; each tab does O(1) work.</p>`,
    followUps: ['Use BroadcastChannel instead. What is simpler and what is different about delivery?', 'Why is this only a UX nicety and not a security measure? (the server must invalidate the session)']
  }
});

/* ============================ PRACTICE: Hard ============================ */
practice.push({
  title: 'Worker Pool with a Task Queue', level: 'Hard', tags: ['Web Worker', 'pool', 'queue', 'concurrency'], companies: ['Figma', 'Google', 'Canva'],
  statement: `<p>Spawning a new worker for every task is slow, and spawning one per task for 1000 tasks would use huge memory. Write <code>createWorkerPool(makeWorker, size)</code>. It creates <code>size</code> workers once. <code>pool.run(payload)</code> returns a Promise. If a worker is idle the task goes to it, otherwise the task waits in a FIFO queue. Each worker handles <b>one task at a time</b>; when it replies the next queued task is sent to it. Messages look like <code>{ id, payload }</code> going in and <code>{ id, result }</code> or <code>{ id, error }</code> coming out. <code>pool.terminate()</code> terminates all workers and rejects queued and running tasks. Never more than <code>size</code> tasks may run at once.</p>`,
  constraints: `1 to 16 workers. Up to 10<sup>4</sup> queued tasks. A task error must reject only that task's promise and the worker must stay usable.`,
  example: `<p>size = 2, five tasks with durations 30, 10, 10, 10, 10 ms.</p>${H.table(['Time (ms)', 'Worker 1', 'Worker 2', 'Queue'], [['0', 'task 1 (30)', 'task 2 (10)', '3, 4, 5'], ['10', 'task 1', 'task 3 (10)', '4, 5'], ['20', 'task 1', 'task 4 (10)', '5'], ['30', 'task 5', 'task 4 done -> idle', '-']])}<p>Max parallelism is always 2.</p>`,
  brute: {
    why: `<p>Creating a worker per task pays the startup cost (tens of ms and several MB) every time, and sending 1000 tasks creates 1000 threads that fight for the same few CPU cores - slower overall and may crash the tab.</p>`,
    code: `function runNaive(makeWorker, payload) {
  return new Promise(function (resolve, reject) {
    const w = makeWorker();                       // new thread for every task
    w.onmessage = function (e) { resolve(e.data.result); w.terminate(); };
    w.postMessage({ id: 1, payload: payload });
  });
}`
  },
  mcq: { q: 'How many workers is a sensible default pool size for CPU-heavy tasks?', options: ['About navigator.hardwareConcurrency minus one', 'Exactly one per task', 'Always 100', 'Always 1'], answer: 0, explain: 'More threads than cores adds scheduling overhead without more speed. Leave a core for the main thread.' },
  hints: [
    `<p>Hint 1: you need two lists - idle workers and queued jobs. Whenever either changes, try to match them.</p>`,
    `<p>Hint 2: write a small <code>pump()</code> function: while there is an idle worker and a queued job, take one of each, remember the job under its id, and post the message.</p>`,
    `<p>Hint 3: in each worker's <code>onmessage</code>: look up the job by id, settle its promise, push the worker back to idle, then call <code>pump()</code> again. <code>terminate</code> rejects everything left.</p>`
  ],
  solution: {
    approach: `<p>The pool owns workers for its whole life. A <code>pump()</code> loop assigns jobs to idle workers, so concurrency can never exceed the number of workers. Replies free a worker and trigger the next assignment. Errors are just another reply type, so the worker is returned to the idle list either way.</p>`,
    code: {
      lang: 'js', run: true, code: `function createWorkerPool(makeWorker, size) {
  const idle = [], queue = [], running = new Map(), all = [];
  let nextId = 1, closed = false;

  function pump() {
    while (!closed && idle.length && queue.length) {
      const worker = idle.shift();
      const job = queue.shift();
      running.set(job.id, { job: job, worker: worker });
      worker.postMessage({ id: job.id, payload: job.payload });
    }
  }
  function makeOne() {
    const worker = makeWorker();
    worker.onmessage = function (e) {
      const msg = e.data;
      const entry = running.get(msg.id);
      if (!entry) return;
      running.delete(msg.id);
      if (msg.error) entry.job.reject(new Error(msg.error)); else entry.job.resolve(msg.result);
      idle.push(entry.worker);
      pump();
    };
    all.push(worker);
    idle.push(worker);
  }
  for (let i = 0; i < size; i++) makeOne();

  return {
    run: function (payload) {
      if (closed) return Promise.reject(new Error('pool terminated'));
      return new Promise(function (resolve, reject) {
        queue.push({ id: nextId++, payload: payload, resolve: resolve, reject: reject });
        pump();
      });
    },
    terminate: function () {
      closed = true;
      all.forEach(function (w) { w.terminate(); });
      queue.splice(0).forEach(function (j) { j.reject(new Error('pool terminated')); });
      running.forEach(function (e) { e.job.reject(new Error('pool terminated')); });
      running.clear();
    }
  };
}

// Fake workers that "compute" for payload.ms milliseconds. We measure the real parallelism.
let active = 0, maxActive = 0;
function makeFake() {
  return {
    onmessage: null, dead: false,
    postMessage: function (m) {
      const self = this;
      active++; maxActive = Math.max(maxActive, active);
      setTimeout(function () {
        active--;
        if (self.dead) return;
        self.onmessage({ data: m.payload.fail ? { id: m.id, error: 'task failed' } : { id: m.id, result: m.payload.name + ' done' } });
      }, m.payload.ms);
    },
    terminate: function () { this.dead = true; }
  };
}
const pool = createWorkerPool(makeFake, 2);
const tasks = [{ name: 't1', ms: 30 }, { name: 't2', ms: 10 }, { name: 't3', ms: 10 }, { name: 't4', ms: 10, fail: true }, { name: 't5', ms: 10 }];
const order = [];
Promise.allSettled(tasks.map(function (t) {
  return pool.run(t).then(function (r) { order.push(r); return r; });
})).then(function (results) {
  console.log('finished in this order:', order.join(', '));
  console.log('statuses:', results.map(function (r) { return r.status + (r.status === 'rejected' ? '(' + r.reason.message + ')' : ''); }).join(' | '));
  console.log('max tasks running at once:', maxActive);
  pool.terminate();
  return pool.run({ name: 'late', ms: 1 }).catch(function (e) { console.log('after terminate:', e.message); });
});`
    },
    complexity: `<p>Each run/reply is O(1) amortised (queue shift could be made O(1) with a deque). Memory is O(size + queued tasks).</p>`,
    followUps: ['Add task priorities (a heap instead of a FIFO).', 'Detect a crashed or hung worker (timeout) and replace it with a new one.', 'Support cancelling a queued task before it starts.']
  }
});

practice.push({
  title: 'Promise-Based IndexedDB Key-Value Store', level: 'Hard', tags: ['IndexedDB', 'transactions', 'promises', 'versioning'], companies: ['Google', 'Notion', 'Slack'],
  statement: `<p>Wrap IndexedDB in a friendly async API: <code>createKV(dbName, storeName)</code> returns <code>{ get(key), set(key, value), del(key), keys(), clear() }</code>, all returning Promises. Requirements: open the database <b>once</b> and reuse the connection (share the open promise, even for concurrent first calls); create the object store in <code>onupgradeneeded</code>; resolve writes only on <code>tx.oncomplete</code> (committed), not on the request's <code>onsuccess</code>; reject on transaction error or abort; and if another tab asks for a newer version, close the connection (<code>onversionchange</code>) and reopen on the next call.</p>`,
  constraints: `Keys are strings or numbers; values must be structured-cloneable. Do not use <code>await</code> on non-IndexedDB promises inside a transaction callback (the transaction would auto-close).`,
  example: `${H.table(['Call', 'Behaviour'], [['set("a", {n:1}); get("a")', '<span class="c-g">{n:1}</span>'], ['get("zzz")', '<span class="c-g">undefined</span>'], ['5 calls before the DB is open', 'all share ONE open request'], ['transaction aborts (quota)', '<span class="c-r">promise rejects</span>']])}`,
  brute: {
    why: `<p>Calling <code>indexedDB.open</code> inside every function opens many connections, which blocks future upgrades from other tabs, and resolving on the request <code>onsuccess</code> instead of <code>tx.oncomplete</code> can report success before the data is durably committed.</p>`,
    code: `function getNaive(name, store, key) {
  return new Promise(function (resolve) {
    const open = indexedDB.open(name);                       // a brand new connection on every call
    open.onsuccess = function () {
      const req = open.result.transaction(store).objectStore(store).get(key);
      req.onsuccess = function () { resolve(req.result); };  // connection never closed
    };
  });
}`
  },
  mcq: { q: 'When is a write to IndexedDB safely committed?', options: ['When the transaction fires oncomplete', 'When the request fires onsuccess', 'As soon as put() returns', 'After 100 ms'], answer: 0, explain: 'Request success only means the operation was queued successfully in the transaction. The transaction can still abort (for example on quota errors); oncomplete means it is committed.' },
  hints: [
    `<p>Hint 1: cache the <b>promise</b> for the database connection in a variable. If it is already there, just return it.</p>`,
    `<p>Hint 2: write one helper <code>withStore(mode, fn)</code>. It opens (or reuses) the DB, makes a transaction, runs <code>fn(store)</code> to get a request, remembers <code>request.result</code>, and resolves in <code>tx.oncomplete</code>.</p>`,
    `<p>Hint 3: attach <code>tx.onerror</code> and <code>tx.onabort</code> to reject. In <code>onsuccess</code> of the open request set <code>db.onversionchange = () =&gt; { db.close(); dbPromise = null; }</code>. Reset the cached promise on open errors too.</p>`
  ],
  solution: {
    approach: `<p>One cached open-promise, one transaction helper that every method uses. Reads and writes differ only in the mode and the store call. Committed-ness is tied to the transaction events, and the version-change handler keeps other tabs able to upgrade.</p>`,
    code: {
      lang: 'js', code: `function createKV(dbName, storeName) {
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;               // share one open request
    dbPromise = new Promise(function (resolve, reject) {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = function () {
        // Schema work happens only here.
        if (!req.result.objectStoreNames.contains(storeName)) req.result.createObjectStore(storeName);
      };
      req.onsuccess = function () {
        const db = req.result;
        db.onversionchange = function () { db.close(); dbPromise = null; };   // let other tabs upgrade
        resolve(db);
      };
      req.onerror = function () { dbPromise = null; reject(req.error); };
      req.onblocked = function () { dbPromise = null; reject(new Error('Close other tabs and try again')); };
    });
    return dbPromise;
  }

  async function withStore(mode, makeRequest) {
    const db = await open();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(storeName, mode);
      const request = makeRequest(tx.objectStore(storeName));   // synchronous, inside the transaction
      let result;
      if (request) request.onsuccess = function () { result = request.result; };
      tx.oncomplete = function () { resolve(result); };          // committed
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error('Transaction aborted')); };
    });
  }

  return {
    get: function (key) { return withStore('readonly', function (s) { return s.get(key); }); },
    set: function (key, value) { return withStore('readwrite', function (s) { return s.put(value, key); }); },
    del: function (key) { return withStore('readwrite', function (s) { return s.delete(key); }); },
    keys: function () { return withStore('readonly', function (s) { return s.getAllKeys(); }); },
    clear: function () { return withStore('readwrite', function (s) { return s.clear(); }); }
  };
}

// Usage (browser):
// const kv = createKV('app', 'cache');
// await kv.set('profile', { name: 'Asha' });
// console.log(await kv.get('profile'));`
      },
    complexity: `<p>Each operation is one transaction: O(log n) per key for the B-tree; keys() is O(n). Opening happens once per page (or after a version change).</p>`,
    followUps: ['Add a secondary index and a query method (getAll by index range).', 'How would you migrate data when the schema version goes from 1 to 2 inside onupgradeneeded?', 'Why does awaiting a fetch inside a transaction callback break it?']
  }
});

practice.push({
  title: 'Stale-While-Revalidate Fetch Cache', level: 'Hard', tags: ['caching', 'fetch', 'stale-while-revalidate', 'deduplication'], companies: ['Vercel', 'Netflix', 'LinkedIn'],
  statement: `<p>Write <code>createSwrClient(fetchFn, ttlMs, now)</code> with <code>get(url, onUpdate)</code> that returns a Promise of <code>{ data, source }</code>. Rules: (1) no cache entry: fetch from the network, <code>source = 'network'</code>. (2) Fresh entry (age &lt; ttl): return it at once, <code>source = 'cache'</code>, no network. (3) Stale entry (age &gt;= ttl): return the old data <b>immediately</b> with <code>source = 'stale'</code> and revalidate in the background; when new data arrives, store it and call <code>onUpdate(newData)</code>. (4) Background revalidations of the same url are shared (never two at once). (5) If a background revalidation fails, keep the stale data and do not reject anything.</p>`,
  constraints: `<code>now()</code> returns milliseconds. fetchFn(url) resolves to <code>{ ok, status, json() }</code>. Unlimited number of URLs (an LRU limit is a follow-up).`,
  example: `<p>ttl = 1000 ms.</p>${H.table(['Time', 'Call', 'Returned', 'Network'], [['0', 'get(A)', 'network (waits)', '1'], ['400', 'get(A)', '<span class="c-g">cache</span>', '0'], ['1500', 'get(A)', '<span class="c-y">stale</span> instantly, then onUpdate(new)', '1 in background'], ['1500', 'get(A) again right away', 'stale (shared revalidation)', '<span class="c-m">0 extra</span>']])}`,
  brute: {
    why: `<p>Either you always wait for the network (slow, spinners everywhere), or you cache forever (users see old data indefinitely). The two extremes cannot give "instant now, correct soon".</p>`,
    code: `const cache = new Map();
async function getNaive(fetchFn, url) {
  if (cache.has(url)) return cache.get(url);          // stale forever
  const data = await (await fetchFn(url)).json();
  cache.set(url, data);
  return data;
}`
  },
  mcq: { q: 'What does stale-while-revalidate show the user first?', options: ['The cached (possibly old) data immediately, then the fresh data when it arrives', 'A loading spinner until fresh data arrives', 'Nothing until the TTL expires', 'Only fresh data, never cached data'], answer: 0, explain: 'The user sees something instantly; the UI quietly updates when the revalidation finishes. React Query, SWR and HTTP stale-while-revalidate all follow this idea.' },
  hints: [
    `<p>Hint 1: store <code>{ data, at }</code> per url so you can compute age as <code>now() - at</code>.</p>`,
    `<p>Hint 2: write <code>revalidate(url)</code> that returns the in-flight promise if one exists (a second Map), otherwise starts the request, saves to the cache on success and deletes the in-flight entry in <code>finally</code>.</p>`,
    `<p>Hint 3: in <code>get</code>: no entry -> <code>return revalidate(url)</code> mapped to <code>source: 'network'</code>. Stale entry -> start revalidate in the background with a <code>.catch(() =&gt; {})</code> and return the old data immediately.</p>`
  ],
  solution: {
    approach: `<p>Two Maps: the cache and the in-flight revalidations. Foreground misses wait for the network; stale hits return instantly and refresh in the background. Sharing the in-flight promise prevents a refresh storm when many callers hit the same stale key.</p>`,
    code: {
      lang: 'js', run: true, code: `function createSwrClient(fetchFn, ttlMs, now) {
  const cache = new Map();      // url -> { data, at }
  const inflight = new Map();   // url -> Promise<data>

  function revalidate(url) {
    if (inflight.has(url)) return inflight.get(url);
    const p = fetchFn(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        cache.set(url, { data: data, at: now() });
        return data;
      })
      .finally(function () { inflight.delete(url); });
    inflight.set(url, p);
    return p;
  }

  return {
    get: function (url, onUpdate) {
      const hit = cache.get(url);
      if (!hit) {
        return revalidate(url).then(function (data) { return { data: data, source: 'network' }; });
      }
      const fresh = now() - hit.at < ttlMs;
      if (!fresh) {
        revalidate(url).then(function (data) { if (onUpdate) onUpdate(data); }, function () { /* keep stale data */ });
      }
      return Promise.resolve({ data: hit.data, source: fresh ? 'cache' : 'stale' });
    }
  };
}

let clock = 0, calls = 0, failNext = false;
function fakeFetch(url) {
  calls++;
  const version = calls;
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve({ ok: !failNext, status: failNext ? 503 : 200, json: function () { return Promise.resolve('v' + version); } });
    }, 10);
  });
}
const swr = createSwrClient(fakeFetch, 1000, function () { return clock; });
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
(async function () {
  console.log(JSON.stringify(await swr.get('/a')), 'calls', calls);
  clock = 400;
  console.log(JSON.stringify(await swr.get('/a')), 'calls', calls);
  clock = 1500;
  const updates = [];
  const r1 = await swr.get('/a', function (d) { updates.push(d); });
  const r2 = await swr.get('/a', function (d) { updates.push(d); });   // shares the revalidation
  console.log(JSON.stringify(r1), JSON.stringify(r2), 'calls', calls);
  await sleep(30);
  console.log('onUpdate received:', updates.join(','), '| now cached:', JSON.stringify(await swr.get('/a')));
  clock = 3000; failNext = true;
  console.log('stale during failing refresh:', JSON.stringify(await swr.get('/a')));
  await sleep(30);
  console.log('after failed refresh still serves:', JSON.stringify(await swr.get('/a')));
})();`
    },
    complexity: `<p>O(1) per call. Memory grows with the number of cached URLs (add an LRU cap in production).</p>`,
    followUps: ['Add AbortController support so leaving the page cancels a background refresh.', 'Add an ETag / If-None-Match revalidation so unchanged data costs almost no bytes.', 'What should happen when the user is offline?']
  }
});

practice.push({
  title: 'SPA Router with a Navigation Guard (Unsaved Changes)', level: 'Hard', tags: ['History API', 'popstate', 'router', 'guard'], companies: ['Atlassian', 'Meta', 'Microsoft'],
  statement: `<p>Extend an SPA router with <code>setGuard(fn)</code>, where <code>fn(nextUrl)</code> returns <code>true</code> if leaving the current page is allowed (for example no unsaved form). Write <code>createGuardedRouter(history, render)</code>. <b>In-app navigation</b> (<code>navigate(url)</code>): if the guard says no, do nothing; otherwise push and render. <b>Back/Forward</b> are harder: the browser has already moved. If the guard says no, you must <b>undo the move</b> so the user stays put and the URL bar is correct, without rendering and without losing forward entries. Store a logical index in <code>history.state</code> so you can tell how far the browser moved. Ignore the popstate that your own undo causes.</p>`,
  constraints: `<code>history</code> offers <code>url</code>, <code>state</code>, <code>pushState</code>, <code>replaceState</code>, <code>go(delta)</code>, <code>onPopState(fn)</code>. The guard is synchronous here. Several Back presses may happen in a row.`,
  example: `<p>Pages: / -> /a -> /b. A dirty form on /b makes the guard return false.</p>${H.table(['Action', 'Browser does', 'Router does'], [['navigate("/c")', '-', '<span class="c-r">blocked</span>, nothing changes'], ['user presses Back', 'moves to /a (index 1)', 'guard says no -> <code>go(+1)</code> back to /b, <span class="c-r">no render</span>'], ['(the undo causes popstate)', 'moves to /b', '<span class="c-m">ignored via flag</span>'], ['form saved (guard true), Back', 'moves to /a', '<span class="c-g">renders /a</span>']])}`,
  brute: {
    why: `<p>Calling the guard only inside link click handlers does not protect the Back button: the browser has already changed the URL by the time popstate fires, so the page content and URL disagree (or the work is lost). Trying to <code>pushState</code> the old URL on a blocked Back adds a duplicate entry and destroys the forward history.</p>`,
    code: `window.addEventListener('popstate', function () {
  if (!canLeave()) {
    history.pushState({}, '', previousUrl);   // wrong: adds a new entry, deletes forward entries
    return;
  }
  render(location.pathname);
});`
  },
  mcq: { q: 'The guard blocks a Back press. What is the right way to stay on the page?', options: ['Call history.go(+1) (move back to where we were) and ignore the resulting popstate', 'Call history.pushState with the old URL', 'Reload the page', 'Call history.back() again'], answer: 0, explain: 'The browser moved one entry back; going forward by the same amount restores the exact position and keeps all history entries. The resulting popstate is our own and must be ignored.' },
  hints: [
    `<p>Hint 1: the browser does not tell you how far it moved, so write a logical index into <code>history.state</code> on every pushState (and on the first entry with replaceState).</p>`,
    `<p>Hint 2: keep <code>idx</code> (where we think we are). On popstate read <code>history.state.idx</code>; the difference <code>idx - target</code> is the undo distance for <code>history.go</code>.</p>`,
    `<p>Hint 3: use a boolean <code>restoring</code>. Set it before calling <code>history.go(undo)</code>; at the top of the popstate handler, if it is set, clear it and return. If the guard allows leaving, set <code>idx = target</code> and render.</p>`
  ],
  solution: {
    approach: `<p>Index in state tells us the direction and distance of any traversal, including multi-step jumps. A blocked traversal is reversed with <code>go(idx - target)</code> and the echo popstate is ignored with a one-shot flag. Normal navigation increments the index and pushes.</p>`,
    code: {
      lang: 'js', run: true, code: `class FakeHistory {
  constructor() { this.entries = [{ url: '/', state: null }]; this.i = 0; this.pop = []; }
  get url() { return this.entries[this.i].url; }
  get state() { return this.entries[this.i].state; }
  pushState(s, t, u) { this.entries = this.entries.slice(0, this.i + 1); this.entries.push({ url: u, state: s }); this.i++; }
  replaceState(s, t, u) { this.entries[this.i] = { url: u, state: s }; }
  go(d) { const t = this.i + d; if (t < 0 || t >= this.entries.length) return; this.i = t; this.pop.forEach(function (f) { f(); }); }
  onPopState(f) { this.pop.push(f); }
}

function createGuardedRouter(history, render) {
  let guard = null;
  let idx = 0;
  let restoring = false;
  history.replaceState({ idx: 0 }, '', history.url);       // tag the first entry

  function show() { render(history.url); }

  history.onPopState(function () {
    if (restoring) { restoring = false; return; }           // echo of our own undo
    const target = history.state && typeof history.state.idx === 'number' ? history.state.idx : 0;
    if (guard && !guard(history.url)) {
      restoring = true;
      history.go(idx - target);                              // jump back to where we were
      return;
    }
    idx = target;
    show();
  });

  return {
    setGuard: function (fn) { guard = fn; },
    start: show,
    navigate: function (url) {
      if (url === history.url) return false;
      if (guard && !guard(url)) return false;
      idx++;
      history.pushState({ idx: idx }, '', url);
      show();
      return true;
    }
  };
}

const h = new FakeHistory();
const shown = [];
const router = createGuardedRouter(h, function (url) { shown.push(url); });
let dirty = false;
router.setGuard(function () { return !dirty; });
router.start();
router.navigate('/a');
router.navigate('/b');
dirty = true;
console.log('navigate while dirty ->', router.navigate('/c'), '| at', h.url);
h.go(-1);                                                   // user presses Back
console.log('Back while dirty: url is', h.url, '| rendered so far:', shown.join(' '));
h.go(-2);                                                   // user holds Back / long-press jump
console.log('jump back 2 while dirty: url is', h.url, '| entries:', h.entries.length);
dirty = false;
h.go(-1);
console.log('Back after saving: url is', h.url, '| rendered:', shown.join(' '));
h.go(1);
console.log('Forward still works: url is', h.url);`
    },
    complexity: `<p>O(1) per navigation. The index trick works for any traversal distance in one step.</p>`,
    followUps: ['Make the guard async (a confirm dialog). What changes when the browser has already moved?', 'Add beforeunload for tab close/refresh. Why can routers not cover those cases?', 'How does the Navigation API make this simpler?']
  }
});

practice.push({
  title: 'Bounded Bidirectional Infinite Feed', level: 'Hard', tags: ['IntersectionObserver', 'infinite scroll', 'windowing', 'dedupe'], companies: ['Twitter', 'Instagram', 'LinkedIn'],
  statement: `<p>A chat or feed loads <b>newer</b> items when the bottom sentinel is visible and <b>older</b> items when the top sentinel is visible. The DOM must not grow forever. Implement <code>createWindowedFeed(maxItems)</code> with: <code>append(batch)</code> adds items at the bottom and, if the window exceeds <code>maxItems</code>, trims from the <b>top</b>; <code>prepend(batch)</code> adds at the top (batch is oldest-to-newest) and trims from the <b>bottom</b>. Items have unique <code>id</code>s: duplicates already in the window (also duplicates inside the same batch) must be ignored. Track <code>hiddenAbove</code> and <code>hiddenBelow</code> (how many items were trimmed away on each side so the UI knows there is more to reload). Also write <code>scrollFixAfterPrepend(scrollTop, addedHeights)</code> that returns the new scrollTop which keeps the visible content from jumping.</p>`,
  constraints: `maxItems between 5 and 500. Batches have at most 100 items. Heights are positive numbers.`,
  example: `<p>maxItems = 6.</p>${H.table(['Call', 'Window ids', 'hiddenAbove / hiddenBelow'], [['append [1,2,3,4]', '1 2 3 4', '0 / 0'], ['append [4,5,6,7,8]', '3 4 5 6 7 8  (4 was a duplicate; 1, 2 trimmed)', '2 / 0'], ['prepend [1,2]', '1 2 3 4 5 6  (7, 8 trimmed)', '0 / 2']])}`,
  brute: {
    why: `<p>Just appending forever makes the DOM grow without limit: after a few thousand items layout becomes slow and memory climbs. Prepending without fixing <code>scrollTop</code> makes the content jump down by the height of the new rows, and ignoring ids shows the same message twice when pages overlap.</p>`,
    code: `const items = [];
function appendNaive(batch) { batch.forEach(function (i) { items.push(i); }); }     // duplicates, unbounded
function prependNaive(batch) { batch.forEach(function (i) { items.unshift(i); }); } // wrong order, unbounded`
  },
  mcq: { q: 'After inserting rows above the viewport, what keeps the user\'s reading position stable?', options: ['Add the total height of the inserted rows to scrollTop', 'Scroll to the very top', 'Remove the observer', 'Call location.reload()'], answer: 0, explain: 'Rows inserted above push existing content down; increasing scrollTop by the same height moves the viewport with it (or use CSS overflow-anchor / scroll anchoring).' },
  hints: [
    `<p>Hint 1: keep an array <code>items</code> and a <code>Set</code> of ids currently inside the window.</p>`,
    `<p>Hint 2: filter each batch against the set <i>while adding</i> so duplicates inside the same batch are also dropped. For prepend build the new list first, then <code>concat</code> the old items.</p>`,
    `<p>Hint 3: after adding, trim: <code>append</code> removes from the front with <code>splice(0, extra)</code> and increases <code>hiddenAbove</code>; <code>prepend</code> removes from the end and increases <code>hiddenBelow</code>. Removed ids must be deleted from the set. Prepending also reduces <code>hiddenAbove</code> by the number added (never below 0).</p>`
  ],
  solution: {
    approach: `<p>A bounded sliding window over an infinite list. Ids guard against overlapping pages. Counters tell the UI whether there is hidden content it can reload. The scroll fix simply sums the heights of newly inserted rows.</p>`,
    code: {
      lang: 'js', run: true, code: `function createWindowedFeed(maxItems) {
  let items = [];
  const ids = new Set();
  let hiddenAbove = 0, hiddenBelow = 0;

  function takeFresh(batch) {
    const fresh = [];
    batch.forEach(function (item) {
      if (!ids.has(item.id)) { ids.add(item.id); fresh.push(item); }   // also catches dupes inside the batch
    });
    return fresh;
  }

  return {
    append: function (batch) {
      const fresh = takeFresh(batch);
      items = items.concat(fresh);
      let trimmed = 0;
      if (items.length > maxItems) {
        const removed = items.splice(0, items.length - maxItems);
        removed.forEach(function (i) { ids.delete(i.id); });
        trimmed = removed.length;
        hiddenAbove += trimmed;
      }
      hiddenBelow = Math.max(0, hiddenBelow - fresh.length);
      return { added: fresh.length, trimmed: trimmed };
    },
    prepend: function (batch) {
      const fresh = takeFresh(batch);
      items = fresh.concat(items);
      let trimmed = 0;
      if (items.length > maxItems) {
        const removed = items.splice(maxItems);
        removed.forEach(function (i) { ids.delete(i.id); });
        trimmed = removed.length;
        hiddenBelow += trimmed;
      }
      hiddenAbove = Math.max(0, hiddenAbove - fresh.length);
      return { added: fresh.length, trimmed: trimmed };
    },
    ids: function () { return items.map(function (i) { return i.id; }); },
    hidden: function () { return { above: hiddenAbove, below: hiddenBelow }; }
  };
}

function scrollFixAfterPrepend(scrollTop, addedHeights) {
  return scrollTop + addedHeights.reduce(function (a, b) { return a + b; }, 0);
}

const mk = function (list) { return list.map(function (n) { return { id: n }; }); };
const feed = createWindowedFeed(6);
function show(label, r) { console.log(label.padEnd(22), feed.ids().join(' '), '| hidden', JSON.stringify(feed.hidden()), r ? '| ' + JSON.stringify(r) : ''); }
show('append [1,2,3,4]', feed.append(mk([1, 2, 3, 4])));
show('append [4..8]', feed.append(mk([4, 5, 6, 7, 8])));
show('prepend [1,2]', feed.prepend(mk([1, 2])));
show('prepend [2,2,0]', feed.prepend(mk([2, 2, 0])));
console.log('scrollTop 500 + two rows (80, 120 px) ->', scrollFixAfterPrepend(500, [80, 120]));`
    },
    complexity: `<p>Each call is O(batch + window) because of the array concat/splice (a deque would make trimming O(batch)). Memory is bounded by maxItems.</p>`,
    followUps: ['With variable row heights, how do you know the heights of rows that are not rendered yet? (estimate, then measure with ResizeObserver)', 'How would you keep the browser Back button working with this window? (store the cursor in the URL)', 'Make it accessible: how do keyboard and screen reader users reach older content?']
  }
});

/* ============================ QUIZ ============================ */
quiz.push({ q: 'A <code>fetch()</code> call to a URL returns HTTP status 500. What happens to the returned promise?', options: ['It resolves with a Response whose <code>ok</code> is false', 'It rejects with a TypeError', 'It rejects with an AbortError', 'It stays pending forever'], answer: 0, explain: 'fetch rejects only on network-level failures (offline, DNS, CORS). An HTTP 4xx or 5xx is still a successful round trip, so you must check <code>res.ok</code> or <code>res.status</code> yourself.' });
quiz.push({ q: 'What is the main reason to call <code>controller.abort()</code> on the previous request in a search-as-you-type box?', options: ['So an old, slow response cannot arrive later and overwrite the newer result', 'To make the server faster', 'To clear the browser cache', 'Because fetch can only run one request at a time'], answer: 0, explain: 'Responses can arrive in a different order than requests were sent. Aborting the older request (and ignoring its AbortError) guarantees only the latest query can render.' });
quiz.push({ q: 'You used <code>Promise.race([fetch(url), timeoutPromise])</code> for a timeout. What is still wrong?', options: ['The underlying request keeps running because nothing aborted it', 'Promise.race cannot take two promises', 'fetch cannot be used with a timer', 'The timeout promise leaks the DOM'], answer: 0, explain: 'The race only stops your code from waiting. The network request continues and holds a connection. A real timeout calls <code>abort()</code> (or uses <code>AbortSignal.timeout</code>).' });
quiz.push({ q: 'Which storage is cleared automatically when the tab is closed and is separate for each tab?', options: ['sessionStorage', 'localStorage', 'IndexedDB', 'A cookie without Expires'], answer: 0, explain: 'sessionStorage is scoped to one tab (browsing context) and discarded with it. localStorage and IndexedDB persist across tabs and restarts.' });
quiz.push({ q: 'Why is putting a login token in <code>localStorage</code> considered risky?', options: ['Any injected script (XSS) can read it', 'localStorage deletes data after one hour', 'It makes pages load slower than cookies', 'Tokens cannot be stored as strings'], answer: 0, explain: 'localStorage is readable by all JavaScript on the page, including injected or third-party scripts. An HttpOnly cookie cannot be read by scripts at all.' });
quiz.push({ q: 'Which is the best fit for storing 80 MB of offline notes with images that you want to query by tag?', options: ['IndexedDB', 'localStorage', 'A cookie', 'sessionStorage'], answer: 0, explain: 'IndexedDB is asynchronous, supports large amounts of structured data, Blobs and indexes. localStorage/sessionStorage are limited to a few MB and block the main thread.' });
quiz.push({ q: 'When does an IntersectionObserver callback first run for an element after <code>observe(el)</code>?', options: ['Right away with the starting state, then again whenever it changes', 'Only after the user scrolls', 'Only when the element is fully visible', 'Never, you must call a start() method'], answer: 0, explain: 'The browser reports the initial state of each observed target, so already-visible elements trigger the callback without any scrolling.' });
quiz.push({ q: 'What does <code>rootMargin: "200px"</code> do on an IntersectionObserver used for lazy loading?', options: ['Treats the root as 200px larger, so targets count as visible slightly before they reach the screen', 'Makes images 200px wide', 'Delays the callback by 200 ms', 'Limits the observer to 200 elements'], answer: 0, explain: 'rootMargin grows (or shrinks) the root box like CSS margin. A positive value starts loading before the element is on screen, hiding the delay from the user.' });
quiz.push({ q: 'Several DOM changes happen in one synchronous block. How many times is the MutationObserver callback called?', options: ['Once, with an array of all records, after the current script finishes', 'Once per change, immediately', 'Never until disconnect() is called', 'Once per frame, after painting'], answer: 0, explain: 'MutationObserver batches records and delivers them in a microtask after the current JavaScript completes, before the browser paints.' });
quiz.push({ q: 'Which statement about Web Workers is true?', options: ['They cannot access the DOM and talk to the page with postMessage', 'They share all variables with the main thread', 'They can call document.querySelector', 'They always make the calculation itself run faster'], answer: 0, explain: 'A worker has its own global scope without document or window. Data is copied (structured clone) or transferred. A worker does not speed up the maths; it keeps the main thread free so the page stays responsive.' });
quiz.push({ q: 'What does <code>worker.postMessage(buffer, [buffer])</code> do?', options: ['Transfers ownership of the ArrayBuffer to the worker without copying it', 'Copies the buffer twice', 'Shares the buffer with locking', 'Sends only the first byte'], answer: 0, explain: 'The second argument is a transfer list. The buffer is moved zero-copy and becomes detached (byteLength 0) in the sender.' });
quiz.push({ q: 'In an SPA, you call <code>history.pushState({}, "", "/about")</code>. What happens?', options: ['The URL and history stack change, but no page load and no popstate event happen', 'The browser loads /about from the server', 'popstate fires immediately', 'The previous entry is replaced'], answer: 0, explain: 'pushState only updates the address bar and history. Your code must render the new view itself. popstate fires only when the user traverses history (Back/Forward).' });
quiz.push({ q: 'A user opens a shared link <code>https://app.com/users/7</code> directly and gets a server 404, though clicking around inside the app worked. What is the likely fix?', options: ['Configure the server to return index.html for all app routes', 'Use replaceState instead of pushState', 'Add more popstate listeners', 'Switch the router to use localStorage'], answer: 0, explain: 'Direct visits and refreshes send a real HTTP request for that path. The server needs a fallback rule that serves the SPA shell so the client router can render the route.' });
quiz.push({ q: 'You type in a filter box and want the URL to reflect the text without filling the Back button history with an entry per keystroke. Which call?', options: ['history.replaceState', 'history.pushState on every keystroke', 'location.href = ...', 'history.forward()'], answer: 0, explain: 'replaceState rewrites the current entry. pushState would add one entry per keystroke, so Back would step through every letter.' });

/* ============================ INTERVIEW ============================ */
interview.push({
  level: 'B', q: 'Why does <code>fetch()</code> not reject on a 404 or 500, and how do you handle errors correctly?',
  a: `<p>For <code>fetch</code>, a promise "succeeds" when the browser receives <i>any</i> HTTP response. A 404 or 500 is a valid response, so the promise resolves with a <code>Response</code> whose <code>ok</code> is false. The promise only <b>rejects</b> when no response could be obtained at all: offline, DNS failure, connection reset, CORS block, or an abort.</p>
  <p>So correct handling has two layers: a <code>try/catch</code> (or <code>.catch</code>) for network failures, and an explicit <code>if (!res.ok) throw ...</code> for HTTP errors. I usually wrap this in one helper (<code>fetchJson</code>) that throws an error carrying <code>status</code>, handles 204 No Content, and checks the content-type before <code>res.json()</code>, so every caller gets consistent behaviour.</p>`,
  followUps: ['How do you distinguish a timeout from a user cancel?', 'What can go wrong calling res.json() twice?', 'What does CORS failure look like from JavaScript?']
});
interview.push({
  level: 'B', q: 'Compare cookies, localStorage, sessionStorage and IndexedDB. How do you choose?',
  a: `<p><b>Cookies</b>: ~4 KB, sent to the server on every matching request, can be <code>HttpOnly</code>/<code>Secure</code>/<code>SameSite</code>; best for server-side sessions. <b>localStorage</b>: ~5 MB, string key-value, synchronous, persists until cleared, same origin, not sent to the server; best for small preferences. <b>sessionStorage</b>: same API but one copy per tab and cleared when the tab closes; best for per-tab temporary state like a wizard. <b>IndexedDB</b>: large, asynchronous, structured data, Blobs, indexes and transactions, available in workers; best for offline data and anything big or queryable.</p>
  <p>I choose by asking four questions: does the server need it automatically (cookie), how long must it live (tab, forever), how big or structured is it (IndexedDB when large or queryable), and how sensitive is it (secrets should not be readable by scripts, so HttpOnly cookie or memory).</p>`,
  followUps: ['Where would you keep a short-lived access token in a SPA?', 'What happens when the quota is exceeded?', 'How do other tabs learn that localStorage changed?']
});
interview.push({
  level: 'I', q: 'How do you prevent stale responses in a search-as-you-type input?',
  a: `<p>The problem is a race: requests are sent in order but responses may return out of order, so an older slow response can overwrite a newer result. My approach: keep one <code>AbortController</code> per input. On each new query I call <code>abort()</code> on the previous controller, create a new one, and pass its signal to <code>fetch</code>. The aborted promise rejects with <code>AbortError</code>, which I catch and ignore; real errors still surface. I also add a short debounce (200-300 ms) to reduce the number of requests, and I check <code>signal.aborted</code> after awaiting the body as a safety net.</p>
  <p>If the API client does not support signals, I fall back to a request counter: each call remembers its sequence number and renders only if it is still the latest. In React this lives in a <code>useEffect</code> whose cleanup aborts the request.</p>`,
  followUps: ['Where does debounce fit relative to abort?', 'How would you cache previous queries?', 'What about pagination and tab switches - the same race?']
});
interview.push({
  level: 'I', q: 'Design a fetch wrapper with timeout and retry. What are the key decisions?',
  a: `<p>Per attempt: create a fresh <code>AbortController</code> and a timer (or use <code>AbortSignal.timeout</code>) so a hung request is cancelled for real, not just ignored. Retry only when it can help: network errors and 5xx (and sometimes 429 with <code>Retry-After</code>), never 4xx. Use exponential backoff with a cap and jitter (<code>random * min(max, base * 2^n)</code>) so many clients do not retry in lock-step. Cap the number of attempts and the total time.</p>
  <p>The biggest correctness issue is idempotency: GET/PUT/DELETE are safe to repeat, but POST may have already succeeded on the server before the timeout. For those, either do not retry or send an idempotency key. Also expose a way for the caller's own signal to cancel everything, and treat the caller's abort as a non-retryable event.</p>`,
  followUps: ['What is a thundering herd?', 'How would you add a circuit breaker?', 'Should the timeout cover reading the body?']
});
interview.push({
  level: 'I', q: 'How does <code>IntersectionObserver</code> work and why is it better than a scroll listener for lazy loading?',
  a: `<p>You create an observer with a callback and options (<code>root</code>, <code>rootMargin</code>, <code>threshold</code>), then <code>observe(element)</code>. The browser computes intersections as part of its normal rendering cycle and calls your callback only when an element's intersection state crosses a threshold, passing entries with <code>isIntersecting</code> and <code>intersectionRatio</code>. The callback also fires once after <code>observe</code> with the initial state.</p>
  <p>A scroll listener runs on every scroll tick on the main thread and usually calls <code>getBoundingClientRect()</code>, forcing layout repeatedly, which causes jank. The observer avoids that work, fires far less often, and needs no throttling. For lazy images I use a positive <code>rootMargin</code> to start early, set <code>src</code> from <code>data-src</code>, then <code>unobserve</code> the element. For simple images the native <code>loading="lazy"</code> attribute is even better.</p>`,
  followUps: ['What does threshold [0, 0.5, 1] mean?', 'Why might a threshold of 1 never fire?', 'How do you observe inside a scrolling container?']
});
interview.push({
  level: 'I', q: 'Implement infinite scroll. What edge cases do you handle?',
  a: `<p>I place an empty sentinel element after the list and observe it with a <code>rootMargin</code> such as 300px so loading starts early. In the callback: if the sentinel is intersecting and I am not already loading and there is more data, set <code>loading = true</code>, fetch the next page (preferably by cursor, not page number), append items, and clear the flag in <code>finally</code>. When a page comes back empty I set <code>hasMore = false</code> and disconnect the observer.</p>
  <p>Edge cases: double fetches (loading guard), failures (allow retry, show a retry button), duplicates when data changes between pages (dedupe by id, cursor pagination), the DOM growing forever (virtualization or windowing), restoring scroll position on Back, and accessibility (a visible "Load more" fallback, focus handling, an end-of-list message).</p>`,
  followUps: ['Why cursor pagination over offset?', 'How would you load older items when scrolling up without jumping?', 'How do you test it without a browser?']
});
interview.push({
  level: 'I', q: 'What is the difference between MutationObserver and ResizeObserver, and when would you use each?',
  a: `<p><b>MutationObserver</b> watches the DOM tree: child nodes added or removed, attribute changes and text changes (with <code>subtree</code> for descendants). Records are batched and delivered in a microtask after the current script. I use it for DOM I do not control: third-party widgets, extensions, "wait until this element exists", auto-scroll chat on new messages. <b>ResizeObserver</b> reports changes to an element's box size, for any reason (window, sidebar, content, fonts). It runs after layout and before paint. I use it for sizing canvases and charts, virtualized row measurement, and component-level responsiveness.</p>
  <p>Pitfalls: observing <code>document.body</code> with every option is expensive; changing the observed DOM or size inside the callback can cause loops; always <code>disconnect()</code> on cleanup. For purely visual responsive layout CSS container queries are better than JavaScript.</p>`,
  followUps: ['Why is the MutationObserver callback a microtask?', 'What causes the "ResizeObserver loop" warning?', 'What replaced DOM mutation events?']
});
interview.push({
  level: 'I', q: 'What can and cannot a Web Worker do, and how do you communicate with it?',
  a: `<p>A dedicated worker runs a script on its own thread with its own event loop and global scope (<code>self</code>). It can do computation, <code>fetch</code>, timers, WebSocket, IndexedDB, crypto, WebAssembly, and (with <code>OffscreenCanvas</code>) drawing. It cannot touch the DOM, <code>window</code> or <code>localStorage</code>. Communication is by messages: <code>postMessage(data)</code> and the <code>message</code> event. Data is copied with structured clone; large binary data can be <b>transferred</b> zero-copy with a transfer list, or shared with <code>SharedArrayBuffer</code> and <code>Atomics</code> on cross-origin isolated pages.</p>
  <p>In practice I wrap it with a promise-based client using request ids, add timeouts and error handling, keep big data inside the worker and send only small queries and results, and terminate the worker when the component unmounts.</p>`,
  followUps: ['When is a worker not worth it?', 'How is a Service Worker different?', 'How would you build a worker pool?']
});
interview.push({
  level: 'A', q: 'How would you build a client-side router from scratch with the History API?',
  a: `<p>Core pieces: (1) a route table that compiles patterns like <code>/users/:id</code> into matchers and extracts params and query via <code>URL</code>/<code>URLSearchParams</code>; (2) a click handler on internal links that ignores modified clicks, <code>target=_blank</code>, downloads and external origins, otherwise calls <code>preventDefault()</code>, then <code>history.pushState</code> and renders; (3) a <code>popstate</code> listener that only renders (never pushes) for Back/Forward; (4) an initial render at startup for deep links; (5) a not-found route.</p>
  <p>Beyond the basics: server fallback to <code>index.html</code>, <code>replaceState</code> for redirects and filter inputs, scroll restoration, focus and title updates for accessibility, navigation guards (store an index in <code>history.state</code> so a blocked Back can be undone with <code>history.go</code>), and code-splitting per route. The Navigation API now simplifies much of this where supported.</p>`,
  followUps: ['Why does pushState not fire popstate?', 'Hash routing vs history routing trade-offs?', 'How do you handle trailing slashes and base paths?']
});
interview.push({
  level: 'A', q: 'Explain the security trade-offs of where to keep authentication tokens in a browser app.',
  a: `<p>Anything JavaScript can read can be stolen by an XSS bug or a malicious dependency. <code>localStorage</code> and <code>sessionStorage</code> are fully readable, so a stolen token lets an attacker act as the user from anywhere until it expires. An <code>HttpOnly</code> cookie cannot be read by scripts, but the browser attaches it automatically, which opens CSRF; that is mitigated with <code>SameSite=Lax/Strict</code>, CSRF tokens, and checking the <code>Origin</code> header. <code>Secure</code> keeps it on HTTPS.</p>
  <p>A common modern pattern: a short-lived access token kept only in memory, renewed through a refresh token stored in an <code>HttpOnly; Secure; SameSite</code> cookie. It limits what XSS can steal (the in-memory token disappears on reload, and the refresh cookie is not readable). It is not a substitute for preventing XSS with a strict CSP, output escaping and dependency hygiene.</p>`,
  followUps: ['What does SameSite=Lax block?', 'How do you log out all tabs?', 'What is token rotation?']
});
interview.push({
  level: 'A', q: 'The page freezes for two seconds when the user uploads a large CSV. Walk me through diagnosing and fixing it.',
  a: `<p>First reproduce it and record a trace in the Performance panel: I look for a long task on the main thread and which function dominates (CSV parsing, array sorting, a render of 50k rows). Then I fix the biggest cost, in order of impact: (1) move parsing and heavy transformations into a Web Worker, streaming the file in chunks via <code>file.stream()</code> or <code>slice()</code> and sending progress messages; (2) send results as transferables or send only a page of rows; (3) render with virtualization so only visible rows exist in the DOM; (4) if a worker is not an option, chunk the work and yield between chunks with <code>scheduler.yield()</code> or <code>setTimeout</code>.</p>
  <p>I verify with the same trace: no task over ~50 ms, INP improved, memory stable. I also add a progress indicator, cancellation (terminate or a flag checked between chunks) and error handling for malformed files.</p>`,
  followUps: ['How do you measure INP in the field?', 'What if the data must be shared with other tabs?', 'How big can a postMessage payload be before it hurts?']
});
interview.push({
  level: 'A', q: 'Describe how IndexedDB transactions work and the common mistakes with them.',
  a: `<p>IndexedDB is a transactional object database. You open a database by name and version; schema changes (object stores, indexes) happen only in <code>onupgradeneeded</code>. All reads and writes occur inside a transaction on named stores with a mode (<code>readonly</code> or <code>readwrite</code>). Requests inside a transaction run in order; the transaction auto-commits when no more requests are pending in that tick, and either fully commits (<code>oncomplete</code>) or fully aborts (<code>onabort</code>).</p>
  <p>Common mistakes: awaiting a non-IndexedDB promise (like fetch) inside a transaction so it closes; treating a request's <code>onsuccess</code> as durable instead of waiting for <code>oncomplete</code>; opening a new connection on every call; ignoring <code>onversionchange</code> so another tab's upgrade is blocked; storing non-cloneable values; and loading entire stores with <code>getAll</code> instead of using cursors or index ranges. I wrap it with promises or use a small library such as idb or Dexie.</p>`,
  followUps: ['How do you migrate from version 1 to 2?', 'What is the difference between an index and a key path?', 'What happens when quota is exceeded mid-transaction?']
});
interview.push({
  level: 'E', q: 'Design a robust client data layer for a large app: fetching, caching, cancellation, offline and cross-tab behaviour.',
  a: `<p>I would centralise network access in one data layer (or adopt React Query/SWR) so every screen shares behaviour. Features: request <b>deduplication</b> (one in-flight promise per key), <b>stale-while-revalidate</b> caching with per-resource TTLs and invalidation after mutations, <b>cancellation</b> with <code>AbortController</code> on unmount/param changes, <b>timeouts and retries</b> only for idempotent requests (idempotency keys for writes), consistent error shapes, and optimistic updates with rollback.</p>
  <p>For offline: persist the cache to IndexedDB (async, large), queue writes in an outbox and replay with backoff when online, version the schema, and handle quota errors by evicting least-recently-used entries. Cross-tab: <code>BroadcastChannel</code> or the <code>storage</code> event to propagate logout and invalidations; a leader tab (Web Locks) can own the websocket. Heavy parsing or merging runs in a worker. Security: tokens out of script-readable storage, per-user cache keys, and clearing caches on logout. I would instrument everything (error rates, cache hit rate, retries) because these layers fail silently.</p>`,
  followUps: ['How do you avoid showing user A data after user B logs in?', 'How do you resolve conflicts in the offline outbox?', 'When is a service worker the right place for caching?']
});

registerModule({
  id: 'fe07',
  title: 'Browser APIs, Storage & Networking',
  intro: `<p>This module teaches the browser features that turn a static page into a real application: talking to servers with <b>fetch</b> (and cancelling, timing out and retrying requests with <b>AbortController</b>), remembering things with <b>cookies, localStorage, sessionStorage and IndexedDB</b>, reacting to the page with <b>Intersection, Mutation and Resize Observers</b>, keeping the page smooth with <b>Web Workers</b>, and changing the URL without reloading using the <b>History API</b>.</p>
  <p>Each topic starts with an everyday analogy, then shows how it really works with step-by-step visualizers and runnable code. You will build the things interviewers ask for: cancel stale search requests, a fetch wrapper with timeout and retry, an infinite scroll with a sentinel, a worker pool, and a tiny SPA router. It builds on <i>DOM &amp; Events</i> and prepares you for React data fetching, performance and security.</p>`,
  goals: [
    'Use <code>fetch</code> correctly (check <code>res.ok</code>, parse bodies, handle network errors) and cancel, time out and retry requests with <code>AbortController</code>',
    'Choose between cookies, localStorage, sessionStorage and IndexedDB for any given need and explain the security and size trade-offs',
    'Build lazy loading and infinite scroll with <code>IntersectionObserver</code>, and react to DOM and size changes with <code>MutationObserver</code> and <code>ResizeObserver</code>',
    'Move heavy work off the main thread with Web Workers using <code>postMessage</code>, request ids and transferables',
    'Implement a small SPA router with <code>pushState</code>, <code>replaceState</code> and <code>popstate</code>, including params, query strings and navigation guards',
    'Spot the race conditions and silent failures that AI-generated browser code commonly contains'
  ],
  prereqs: `Frontend modules "DOM &amp; Events" and "CSS Layout" first. You should be comfortable with JavaScript Promises and async/await (JS track: async JavaScript) and with how a page loads (How the Web Works).`,
  hours: 12,
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
