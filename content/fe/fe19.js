(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ---------- shared runnable runtimes (prepended to runnable snippets) ----------
   The real libraries (rxjs, @angular/core) cannot be imported in the sandbox, so runnable
   examples carry a tiny look-alike with the same semantics for the parts they use. */
var RX = `// ---- tiny RxJS look-alike (same behaviour as RxJS 7 for these pieces) ----
// In a real app: import { Observable, Subject, map, switchMap, ... } from 'rxjs';
class Observable {
  constructor(subscribeFn) { this._subscribeFn = subscribeFn; }
  subscribe(observer) {
    const o = typeof observer === 'function' ? { next: observer } : (observer || {});
    let closed = false, teardown = null;
    const cleanup = () => { if (teardown) { const t = teardown; teardown = null; t(); } };
    const sink = {
      next: (v) => { if (!closed && o.next) o.next(v); },
      error: (e) => { if (closed) return; closed = true; if (o.error) o.error(e); else console.log('unhandled error:', e && e.message ? e.message : e); cleanup(); },
      complete: () => { if (closed) return; closed = true; if (o.complete) o.complete(); cleanup(); },
      get closed() { return closed; }
    };
    const r = this._subscribeFn(sink);
    teardown = typeof r === 'function' ? r : (r && r.unsubscribe ? () => r.unsubscribe() : null);
    if (closed) cleanup();                       // finished synchronously: tear down right away
    return { unsubscribe() { closed = true; cleanup(); }, get closed() { return closed; } };
  }
  pipe(...ops) { return ops.reduce((src, op) => op(src), this); }
}
const of = (...vals) => new Observable((s) => { vals.forEach((v) => s.next(v)); s.complete(); });
const timer = (ms, val) => new Observable((s) => { const id = setTimeout(() => { s.next(val === undefined ? 0 : val); s.complete(); }, ms); return () => clearTimeout(id); });
const interval = (ms) => new Observable((s) => { let i = 0; const id = setInterval(() => s.next(i++), ms); return () => clearInterval(id); });
const throwError = (makeErr) => new Observable((s) => s.error(makeErr()));
// errors thrown inside your callbacks are caught and sent down the error channel (like RxJS)
const op = (onNext) => (src) => new Observable((s) => src.subscribe({ next: (v) => { try { onNext(v, s); } catch (e) { s.error(e); } }, error: (e) => s.error(e), complete: () => s.complete() }));
const map = (fn) => op((v, s) => s.next(fn(v)));
const filter = (fn) => op((v, s) => { if (fn(v)) s.next(v); });
const tap = (fn) => op((v, s) => { fn(v); s.next(v); });
const take = (n) => (src) => new Observable((s) => {
  let c = 0;
  if (n <= 0) { s.complete(); return; }
  return src.subscribe({ next: (v) => { c++; s.next(v); if (c >= n) s.complete(); }, error: (e) => s.error(e), complete: () => s.complete() });
});
const takeUntil = (notifier) => (src) => new Observable((s) => {
  const stop = notifier.subscribe({ next: () => s.complete() });
  const sub = src.subscribe(s);
  return () => { stop.unsubscribe(); sub.unsubscribe(); };
});
const distinctUntilChanged = () => (src) => new Observable((s) => {
  let has = false, last;
  return src.subscribe({ next: (v) => { if (!has || v !== last) { has = true; last = v; s.next(v); } }, error: (e) => s.error(e), complete: () => s.complete() });
});
const debounceTime = (ms) => (src) => new Observable((s) => {
  let id = null, last, has = false;
  const sub = src.subscribe({
    next: (v) => { last = v; has = true; clearTimeout(id); id = setTimeout(() => { has = false; s.next(last); }, ms); },
    error: (e) => s.error(e),
    complete: () => { clearTimeout(id); if (has) s.next(last); s.complete(); }
  });
  return () => { clearTimeout(id); sub.unsubscribe(); };
});
const catchError = (handler) => (src) => new Observable((s) => {
  let inner = null;
  const sub = src.subscribe({ next: (v) => s.next(v), error: (e) => { inner = handler(e).subscribe(s); }, complete: () => s.complete() });
  return () => { sub.unsubscribe(); if (inner) inner.unsubscribe(); };
});
// One engine, four strategies: what to do with a NEW outer value while an inner is still running?
const flatten = (mode) => (project) => (src) => new Observable((s) => {
  const active = new Set(), queue = [];
  let outerDone = false, index = 0;
  const maybeDone = () => { if (outerDone && active.size === 0 && queue.length === 0) s.complete(); };
  const start = (v) => {
    const h = {}; active.add(h);
    h.sub = project(v, index++).subscribe({
      next: (x) => s.next(x), error: (e) => s.error(e),
      complete: () => { active.delete(h); if (queue.length) start(queue.shift()); else maybeDone(); }
    });
  };
  const outer = src.subscribe({
    next: (v) => {
      if (mode === 'switch') { active.forEach((h) => h.sub && h.sub.unsubscribe()); active.clear(); start(v); }
      else if (mode === 'merge') start(v);
      else if (mode === 'concat') { if (active.size) queue.push(v); else start(v); }
      else if (mode === 'exhaust') { if (!active.size) start(v); }
    },
    error: (e) => s.error(e),
    complete: () => { outerDone = true; maybeDone(); }
  });
  return () => { outer.unsubscribe(); active.forEach((h) => h.sub && h.sub.unsubscribe()); };
});
const switchMap = flatten('switch'), mergeMap = flatten('merge'), concatMap = flatten('concat'), exhaustMap = flatten('exhaust');
class Subject extends Observable {
  constructor() {
    super((s) => {
      if (this._stopped) { this._lateJoin(s); return; }
      this._onSubscribe(s); this.observers.add(s);
      return () => this.observers.delete(s);
    });
    this.observers = new Set(); this._stopped = null;
  }
  _onSubscribe(s) {}
  _lateJoin(s) { this._onSubscribe(s); if (this._stopped.err) s.error(this._stopped.err); else s.complete(); }
  next(v) { if (!this._stopped) [...this.observers].forEach((o) => o.next(v)); }
  error(e) { if (this._stopped) return; this._stopped = { err: e }; [...this.observers].forEach((o) => o.error(e)); this.observers.clear(); }
  complete() { if (this._stopped) return; this._stopped = { err: null }; [...this.observers].forEach((o) => o.complete()); this.observers.clear(); }
  asObservable() { return new Observable((s) => this.subscribe(s)); }
}
class BehaviorSubject extends Subject {
  constructor(initial) { super(); this._value = initial; }
  get value() { return this._value; }
  getValue() { return this._value; }
  _onSubscribe(s) { s.next(this._value); }
  _lateJoin(s) { if (this._stopped.err) s.error(this._stopped.err); else s.complete(); }
  next(v) { if (this._stopped) return; this._value = v; super.next(v); }
}
class ReplaySubject extends Subject {
  constructor(bufferSize = Infinity) { super(); this._buf = []; this._n = bufferSize; }
  _onSubscribe(s) { this._buf.forEach((v) => s.next(v)); }
  next(v) { if (this._stopped) return; this._buf.push(v); if (this._buf.length > this._n) this._buf.shift(); super.next(v); }
}
const firstValueFrom = (src) => new Promise((res, rej) => {
  src.pipe(take(1)).subscribe({ next: res, error: rej, complete: () => rej(new Error('EmptyError: no elements in sequence')) });
});
const T0 = Date.now();
const at = () => String(Math.round((Date.now() - T0) / 10) * 10).padStart(4) + 'ms';
// ---- end of look-alike ----
`;

var SIG = `// ---- tiny signals runtime (same model as Angular signals: push "dirty", pull values) ----
// In a real app: import { signal, computed, effect, untracked } from '@angular/core';
let active = null;                                  // the computed/effect currently running
const track = (node) => { if (active) { active.deps.set(node, node.version); node.subs.add(active); } };
const notify = (node) => [...node.subs].forEach((c) => c.markDirty());
const changed = (node) => [...node.deps].some(([d, ver]) => { d.refresh(); return d.version !== ver; });
function runTracked(node, fn) {
  const prev = active; active = node;
  node.deps.forEach((_, d) => d.subs.delete(node)); node.deps = new Map();   // re-collect deps every run
  try { return fn(); } finally { active = prev; }
}
function signal(initial, opts) {
  const eq = (opts && opts.equal) || Object.is;
  const node = { value: initial, version: 0, subs: new Set(), refresh() {} };
  const read = () => { track(node); return node.value; };
  read.set = (v) => { if (eq(node.value, v)) return; node.value = v; node.version++; notify(node); };
  read.update = (fn) => read.set(fn(node.value));
  read.asReadonly = () => () => read();
  return read;
}
function computed(fn, opts) {
  const eq = (opts && opts.equal) || Object.is;
  const node = {
    value: undefined, version: 0, dirty: true, runs: 0, subs: new Set(), deps: new Map(),
    markDirty() { if (!node.dirty) { node.dirty = true; notify(node); } },
    refresh() {
      if (!node.dirty) return;
      node.dirty = false;
      if (node.runs > 0 && !changed(node)) return;            // deps dirty but values equal: skip
      const v = runTracked(node, fn); node.runs++;
      if (node.runs === 1 || !eq(node.value, v)) { node.value = v; node.version++; }
    }
  };
  const read = () => { node.refresh(); track(node); return node.value; };
  read.runs = () => node.runs;
  return read;
}
const effectQueue = new Set(); let flushScheduled = false;
function scheduleFlush() {
  if (flushScheduled) return; flushScheduled = true;
  queueMicrotask(() => { flushScheduled = false; const list = [...effectQueue]; effectQueue.clear(); list.forEach((n) => n.run()); });
}
function effect(fn) {
  let cleanupFn = null;
  const node = {
    deps: new Map(), runs: 0, destroyed: false,
    markDirty() { if (!node.destroyed) { effectQueue.add(node); scheduleFlush(); } },
    run() {
      if (node.destroyed || (node.runs > 0 && !changed(node))) return;
      if (cleanupFn) { cleanupFn(); cleanupFn = null; }
      runTracked(node, () => fn((c) => { cleanupFn = c; })); node.runs++;
    }
  };
  node.markDirty();                                          // effects always run once (asynchronously)
  return { destroy() { node.destroyed = true; effectQueue.delete(node); node.deps.forEach((_, d) => d.subs.delete(node)); if (cleanupFn) cleanupFn(); } };
}
function untracked(fn) { const prev = active; active = null; try { return fn(); } finally { active = prev; } }
const nextTick = () => new Promise((r) => setTimeout(r, 0));
// ---- end of signals runtime ----
`;

/* ---------- visualizer helpers ---------- */
function parseTimed(str, maxT) {
  // "a@0, b@2" -> [{v:'a', t:0}, ...]
  var out = [];
  String(str).split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (tok) {
    var m = /^([A-Za-z0-9]+)\s*@\s*(\d+)$/.exec(tok);
    if (!m) throw new Error('Use value@time pairs separated by commas, e.g. a@0, b@2, c@5');
    var t = +m[2];
    if (t > maxT) throw new Error('Keep times between 0 and ' + maxT);
    out.push({ v: m[1], t: t });
  });
  out.sort(function (x, y) { return x.t - y.t; });
  return out;
}
function marbleRow(len) { var r = []; for (var i = 0; i < len; i++) r.push(''); return r; }
function put(row, t, s) { row[t] = row[t] ? row[t] + ' ' + s : s; }
function ticks(len) { var h = []; for (var i = 0; i < len; i++) h.push(String(i)); return h; }
function copyRows(rows) { return rows.map(function (r) { return r.slice(); }); }

/* Simulate the four flattening strategies in discrete ticks.
   Each inner "request" for value v emits v+'1' one tick after it starts and v+'2' after `dur` ticks, then completes. */
function simulateFlatten(mode, outer, dur, T) {
  var srcRow = marbleRow(T), outRow = marbleRow(T), innerRow = marbleRow(T);
  var active = [], queue = [], dropped = [], cancelled = [], log = [];
  var byT = {};
  outer.forEach(function (e) { (byT[e.t] = byT[e.t] || []).push(e.v); });
  function start(v, t) { active.push({ v: v, start: t }); put(innerRow, t, '▶' + v); }
  for (var t = 0; t < T; t++) {
    var events = [];
    // 1) running inners emit / complete
    var still = [];
    active.forEach(function (a) {
      var age = t - a.start;
      if (age === 1 && dur > 1) { put(outRow, t, a.v + '1'); events.push('inner ' + a.v + ' emits <b>' + a.v + '1</b>'); }
      if (age === dur) { put(outRow, t, a.v + '2'); put(innerRow, t, a.v + '|'); events.push('inner ' + a.v + ' emits <b>' + a.v + '2</b> and completes'); }
      else still.push(a);
    });
    var finished = active.length - still.length;
    active = still;
    if (mode === 'concat' && finished && active.length === 0 && queue.length) { var q = queue.shift(); start(q, t); events.push('queued <b>' + q + '</b> starts now'); }
    // 2) new outer values
    (byT[t] || []).forEach(function (v) {
      put(srcRow, t, v);
      if (mode === 'switch') {
        active.forEach(function (a) { cancelled.push(a.v); put(innerRow, t, '✕' + a.v); events.push('<span class="c-r">cancel</span> inner ' + a.v); });
        active = []; start(v, t); events.push('outer <b>' + v + '</b> → start inner ' + v);
      } else if (mode === 'merge') { start(v, t); events.push('outer <b>' + v + '</b> → start inner ' + v + ' in parallel'); }
      else if (mode === 'concat') {
        if (active.length) { queue.push(v); events.push('outer <b>' + v + '</b> → <span class="c-y">queued</span> (inner busy)'); }
        else { start(v, t); events.push('outer <b>' + v + '</b> → start inner ' + v); }
      } else {
        if (active.length) { dropped.push(v); put(innerRow, t, '∅' + v); events.push('outer <b>' + v + '</b> → <span class="c-r">ignored</span> (inner busy)'); }
        else { start(v, t); events.push('outer <b>' + v + '</b> → start inner ' + v); }
      }
    });
    if (events.length) log.push({ t: t, events: events, rows: [srcRow.slice(), innerRow.slice(), outRow.slice()], active: active.map(function (a) { return a.v; }), queue: queue.slice(), dropped: dropped.slice(), cancelled: cancelled.slice() });
  }
  return log;
}
/* =====================================================================
   TOPIC 1: Observables vs Promises, subscribe and teardown
   ===================================================================== */
topics.push({
  title: 'Observables vs Promises: Subscribe, Values Over Time, Teardown',
  analogy: `<p>A <b>Promise</b> is a parcel delivery: you order once, one box arrives (or a "delivery failed" note), and once the van has left you cannot cancel it. An <b>Observable</b> is a <b>newspaper subscription</b>: nothing is printed for you until you subscribe, papers keep arriving day after day, the paper can announce "last issue" (complete) or "we went bankrupt" (error), and you can <b>cancel</b> any time, at which point the publisher stops the presses for you (teardown).</p>`,
  explain: `<p>🟢 <b>The big idea:</b> an Observable is a <b>function that can push zero, one or many values over time</b> to whoever subscribes, and that gives you a way to stop it.</p>
    ${H.table(['', 'Promise', 'Observable (RxJS)'], [
      ['How many values?', 'Exactly one (or an error)', 'Zero, one, many, or infinite'],
      ['When does work start?', '<span class="c-y">Eager</span>: the moment you create it', '<span class="c-g">Lazy</span>: only when someone calls <code>subscribe()</code>'],
      ['Two consumers?', 'Share the same single result', 'Cold: each subscriber runs the producer again'],
      ['Cancel?', 'No built-in cancel (AbortController is separate)', '<code>subscription.unsubscribe()</code> runs teardown'],
      ['Sync or async?', 'Callbacks always async (microtask)', 'Can emit synchronously <i>or</i> later'],
      ['Combine / transform?', '<code>then</code>, <code>Promise.all</code>', '100+ operators: <code>map</code>, <code>switchMap</code>, <code>debounceTime</code>...']
    ])}
    <p>🔵 <b>The three channels.</b> A subscriber is an object with up to three callbacks: <code>next(value)</code> (any number of times), then at most one of <code>error(err)</code> or <code>complete()</code>. After error or complete, nothing else is delivered. This is called the <b>Observable contract</b>: <code>next*(error|complete)?</code>.</p>
    <p>🔵 <b>Teardown.</b> The function you pass to <code>new Observable(subscriber =&gt; { ... })</code> may <b>return a cleanup function</b>. RxJS calls it when the consumer unsubscribes <i>or</i> when the stream errors or completes. That is where you <code>clearInterval</code>, <code>removeEventListener</code> or abort a request. Getting teardown right is what prevents memory leaks.</p>
    <p>🔵 <b>Cold vs hot.</b> A <b>cold</b> Observable creates its producer per subscriber (Angular's <code>HttpClient.get</code>: two subscribes = two HTTP requests). A <b>hot</b> one shares an existing producer (DOM clicks, a <code>Subject</code>, a WebSocket you opened once). Late subscribers to a hot stream miss what already happened.</p>
    <p>🔵 <b>Bridges:</b> <code>from(promise)</code> turns a promise into an Observable; <code>firstValueFrom(obs$)</code> / <code>lastValueFrom(obs$)</code> turn an Observable into a promise (the old <code>toPromise()</code> is deprecated in RxJS 7). The trailing <code>$</code> in <code>user$</code> is just a naming convention meaning "this is a stream".</p>`,
  clues: [
    '"Values over time" / "a stream of events" / "live updates" → Observable, not Promise',
    '"Cancel the previous request when the user types again" → Observable + unsubscribe (via <code>switchMap</code>)',
    '"Why did my HTTP call fire twice?" → cold Observable subscribed twice',
    '"Nothing happens when I call <code>http.get()</code>" → Observables are <b>lazy</b>; nobody subscribed',
    '"Convert to async/await" → <code>firstValueFrom</code> / <code>lastValueFrom</code>, not the deprecated <code>toPromise</code>',
    '"Clean up a timer / listener / socket" → return a teardown function from the Observable constructor'
  ],
  code: [{
    lang: 'js', run: true, title: 'Lazy, many values, teardown (runnable)',
    code: RX + `
// A promise runs immediately, even if nobody calls .then():
const p = new Promise((resolve) => { console.log('promise: producer runs NOW (eager)'); resolve(42); });

// An Observable is just a recipe. Nothing runs until subscribe():
const ticks$ = new Observable((subscriber) => {
  console.log(at(), 'observable: producer starts (someone subscribed)');
  let n = 0;
  const id = setInterval(() => subscriber.next(++n), 50);
  // TEARDOWN: called on unsubscribe, error or complete
  return () => { clearInterval(id); console.log(at(), 'observable: teardown, interval cleared'); };
});
console.log('created ticks$, but nothing logged by it yet');

const sub = ticks$.subscribe({
  next: (v) => console.log(at(), 'next', v),
  complete: () => console.log('complete (never happens: we cancel first)')
});
setTimeout(() => { sub.unsubscribe(); console.log(at(), 'unsubscribed; closed =', sub.closed); }, 180);
p.then((v) => console.log('promise value', v, '(always delivered async, in a microtask)'));`
  }, {
    lang: 'ts', title: 'The same ideas with real RxJS 7 imports',
    code: `import { Observable, firstValueFrom, from, interval, take } from 'rxjs';

const ticks$ = new Observable<number>((subscriber) => {
  let n = 0;
  const id = setInterval(() => subscriber.next(++n), 1000);
  return () => clearInterval(id);            // teardown
});

const sub = ticks$.subscribe({
  next: (v) => console.log('tick', v),
  error: (err) => console.error(err),
  complete: () => console.log('done'),
});
setTimeout(() => sub.unsubscribe(), 3500); // logs 1, 2, 3 then stops

// Promise -> Observable and back
const user$ = from(fetch('/api/me').then((r) => r.json()));
async function firstThree(): Promise<number> {
  return firstValueFrom(interval(100).pipe(take(3))); // resolves with 0
}`
  }],
  viz: {
    title: 'Promise vs Observable on one timeline',
    input: '1@1, 2@3, 3@5, 4@7; unsubscribe@6',
    inputLabel: 'Values the producer would emit (value@tick), then "; unsubscribe@tick" (ticks 0 to 9)',
    gen: function (input) {
      var parts = String(input).split(';');
      var vals = parseTimed(parts[0], 9);
      if (vals.length < 2) throw new Error('Give at least 2 values, e.g. 1@1, 2@3, 3@5; unsubscribe@4');
      var m = /unsubscribe\s*@\s*(\d+)/.exec(parts[1] || '');
      var un = m ? Math.min(9, +m[1]) : 99;
      var T = 10, pRow = marbleRow(T), oRow = marbleRow(T), tRow = marbleRow(T), hl = {}, frames = [];
      var promiseDone = false, closed = false, got = 0;
      function frame(narr, t) {
        var h = JSON.parse(JSON.stringify(hl));
        if (t !== undefined) { h['0,' + t] = h['0,' + t] || 'cur'; h['1,' + t] = h['1,' + t] || 'cur'; }
        frames.push({ narr: narr, parts: [
          { type: 'grid', label: 'Timeline (columns are ticks)', rows: [pRow.slice(), oRow.slice(), tRow.slice()], rowHead: ['Promise', 'Observable', 'teardown'], colHead: ticks(T), hl: h },
          { type: 'vars', label: 'State', vals: { promiseSettled: promiseDone, obsClosed: closed, valuesReceived: got } }
        ] });
      }
      put(pRow, 0, 'run'); hl['0,0'] = 'cur';
      frame('Tick 0. Creating a <b>Promise</b> starts its work <b>immediately</b> (eager). Creating an Observable does nothing yet: it is only a recipe until <code>subscribe()</code> is called. We subscribe at tick 0 too, so the producer starts now.', 0);
      put(oRow, 0, 'sub');
      vals.forEach(function (e) {
        if (closed) return;
        if (e.t >= un) return;
        if (!promiseDone) {
          put(pRow, e.t, e.v + ' ✓'); hl['0,' + e.t] = 'ok'; promiseDone = true;
          put(oRow, e.t, e.v); hl['1,' + e.t] = 'ok'; got++;
          frame('Tick ' + e.t + '. Both get the first value <b>' + e.v + '</b>. The Promise is now <b>settled forever</b>: any later value is impossible for it.', e.t);
        } else {
          put(oRow, e.t, e.v); hl['1,' + e.t] = 'ok'; hl['0,' + e.t] = 'done'; got++;
          frame('Tick ' + e.t + '. The Observable keeps going: <code>next(' + e.v + ')</code>. The Promise ignores everything after its single value.', e.t);
        }
      });
      if (un < 99) {
        closed = true; put(oRow, un, 'unsub'); put(tRow, un, 'clear'); hl['1,' + un] = 'bad'; hl['2,' + un] = 'sel';
        frame('Tick ' + un + '. The consumer calls <code>subscription.unsubscribe()</code>. RxJS runs the <b>teardown</b> function we returned (e.g. <code>clearInterval</code>). No CPU, timers or listeners are left behind.', un);
        var lost = vals.filter(function (e) { return e.t >= un; }).map(function (e) { return e.v; });
        frame('After unsubscribe nothing is delivered' + (lost.length ? ' (values <b>' + lost.join(', ') + '</b> are never produced at all, because the producer was stopped)' : '') + '. A Promise has no such button: its work runs to the end even if you no longer care.', undefined);
      } else {
        var last = vals[vals.length - 1].t;
        closed = true; put(oRow, Math.min(9, last + 1), '|'); put(tRow, Math.min(9, last + 1), 'clear'); hl['2,' + Math.min(9, last + 1)] = 'sel';
        frame('No unsubscribe given, so the producer calls <code>complete()</code> after the last value (marble <code>|</code>). Teardown <b>also</b> runs on complete and on error, so resources are released either way.', undefined);
      }
      frames.push({ narr: '<b>Summary:</b> Promise = one value, eager, not cancellable. Observable = many values, lazy, cancellable with teardown. Received by the Observable subscriber: <b>' + got + '</b> value(s).', parts: [
        { type: 'grid', label: 'Final timeline', rows: [pRow, oRow, tRow], rowHead: ['Promise', 'Observable', 'teardown'], colHead: ticks(T), hl: hl },
        { type: 'text', html: 'Contract: <code>next*</code> then optionally one of <code>error</code> | <code>complete</code>. Teardown runs on unsubscribe, error and complete.' }
      ] });
      return frames;
    }
  },
  examples: [
    {
      title: 'Cold HttpClient: the "why two requests?" bug',
      html: `<p>In Angular, <code>http.get('/api/user')</code> returns a <b>cold</b> Observable. Each <code>subscribe</code> (including each <code>| async</code> in a template) sends its own request.</p>
        ${H.table(['Code', 'Requests sent'], [['<code>user$ = http.get(...)</code> (no subscribe)', '<span class="c-y">0</span> (lazy)'], ['one <code>user$ | async</code>', '1'], ['<code>{{ (user$ | async)?.name }}</code> and <code>{{ (user$ | async)?.email }}</code>', '<span class="c-r">2</span>'], ['<code>@if (user$ | async; as user)</code> then <code>user.name</code>, <code>user.email</code>', '<span class="c-g">1</span>']])}
        <p>Fix: subscribe once in the template, or share with <code>shareReplay({ bufferSize: 1, refCount: true })</code>, or convert to a signal with <code>toSignal</code>.</p>`
    },
    {
      title: 'Observables can be synchronous',
      html: `<p><code>of(1, 2, 3).subscribe(v =&gt; console.log(v)); console.log('after');</code> prints <b>1, 2, 3, after</b>. All values are pushed during <code>subscribe()</code>. A resolved promise would print <b>after</b> first, because <code>.then</code> callbacks always wait for a microtask. Do not assume "Observable means async".</p>`,
      code: { lang: 'js', run: true, code: RX + `
of(1, 2, 3).subscribe((v) => console.log('of:', v));
console.log('after of (sync stream already finished)');
Promise.resolve('p').then((v) => console.log('promise:', v, '(printed last, microtask)'));
console.log('after promise');` }
    },
    {
      title: 'Teardown runs on complete too',
      html: `<p>Teardown is not only for unsubscribe. With <code>interval(100).pipe(take(3))</code>, <code>take</code> completes after 3 values, and completion triggers the teardown chain, which clears the interval. That is why <code>take(1)</code>, <code>first()</code> and HTTP calls (which complete after one response) usually do not leak. Infinite streams (intervals, router events, store selects, <code>valueChanges</code>) do, unless something completes or unsubscribes them.</p>`,
      code: { lang: 'js', run: true, code: RX + `
const src$ = new Observable((s) => {
  let i = 0;
  const id = setInterval(() => s.next(i++), 20);
  return () => { clearInterval(id); console.log(at(), 'teardown ran (because take(3) completed)'); };
});
src$.pipe(take(3)).subscribe({ next: (v) => console.log(at(), 'value', v), complete: () => console.log(at(), 'complete') });` }
    },
    {
      title: 'Promise vs Observable for one HTTP call',
      html: `<p>For a single request, a Promise (<code>fetch</code> + <code>await</code>) is perfectly fine. Observables shine when you need <b>cancellation</b> (search-as-you-type), <b>composition over time</b> (retry with backoff, debounce, polling, combining several streams) or <b>many values</b> (WebSocket, events). In Angular, <code>HttpClient</code> returns Observables so all of this composes; you can still <code>await firstValueFrom(http.get(...))</code> in a simple service method.</p>`
    }
  ],
  deepDive: `<p>🟣 <b>An Observable is a function, a Subscription is its cleanup.</b> Strip RxJS away and <code>subscribe(observer)</code> is "call the producer function with a safe wrapper of the observer, and keep what it returns". The <b>safe subscriber</b> enforces the contract: after <code>error</code>/<code>complete</code> it ignores further calls, and it runs teardown exactly once. If the producer completes synchronously <i>before</i> returning its teardown, RxJS runs that teardown immediately after it is returned, which is why the runnable look-alike checks <code>if (closed) cleanup()</code>.</p>
    <p>🟣 <b>Subscription trees.</b> Operators subscribe to their source, so a pipe of 5 operators is a chain of 5 subscriptions. Unsubscribing at the end walks back up and tears down each link, including inner subscriptions created by <code>switchMap</code>. A <code>Subscription</code> can also hold children (<code>sub.add(other)</code>) so one call cleans many.</p>
    <p>🟣 <b>Errors.</b> An error thrown inside <code>next</code> handlers of operators is caught and sent down the error channel. An error with <b>no</b> error handler is reported asynchronously (RxJS 7 rethrows it on a timeout via <code>reportUnhandledError</code>, configurable with <code>config.onUnhandledError</code>), so it does not break the producer synchronously. After an error the stream is <b>dead</b>: to keep going you must catch it (next topics) or resubscribe (<code>retry</code>).</p>
    <p>🟣 <b>Promises are not cancellable, but their work can be.</b> <code>fetch</code> accepts an <code>AbortSignal</code>. Angular's <code>HttpClient</code> wires unsubscribe to aborting the underlying XHR/fetch, so <code>switchMap</code> really cancels in-flight HTTP requests (visible as "(canceled)" in DevTools). RxJS 7 also gives the producer function a signal-like check: <code>subscriber.closed</code> lets long sync loops stop early.</p>
    <p>🟣 <b>Performance:</b> subscribing is cheap, but every operator allocates a subscriber. Hot paths (mousemove at 120 Hz) benefit from <code>auditTime</code>/<code>throttleTime</code> or <code>animationFrameScheduler</code> rather than heavy per-event work.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> assistants generate RxJS fluently, but they often (1) write <code>.toPromise()</code> from pre-2021 training data, (2) nest <code>subscribe</code> inside <code>subscribe</code> instead of using a flattening operator, and (3) forget teardown in custom <code>new Observable</code> producers. Review generated code for those three smells.</p>
    <p>LLM streaming APIs (server-sent events, token streams) are naturally <b>Observables</b>: many values, a completion, an error, and the user may press "Stop generating" (unsubscribe → abort the request). Wrapping an SSE or fetch-stream reader in <code>new Observable</code> with an <code>AbortController</code> in the teardown is a modern, interview-worthy pattern. Ask AI to write it, then verify that teardown aborts and that errors are surfaced.</p>`,
  problems: [{
    title: 'Write fromEvent with proper teardown',
    level: 'Easy', tags: ['observable', 'teardown', 'events'], companies: ['Google', 'Microsoft'],
    statement: `<p>Implement <code>fromEvent(target, type)</code> that returns an Observable of events. The target has <code>addEventListener(type, fn)</code> and <code>removeEventListener(type, fn)</code>. Requirements: (1) lazy, no listener is added until someone subscribes; (2) every subscriber gets its own listener; (3) unsubscribing removes exactly that subscriber's listener.</p>`,
    constraints: `Use the tiny Observable class (or RxJS's). Do not use a global list of handlers.`,
    example: `<p>Subscribe A, subscribe B, emit "click" → both log. Unsubscribe A, emit → only B logs. Listener count goes <span class="c-y">0 → 1 → 2 → 1</span>.</p>`,
    brute: {
      why: `<p>The naive version adds the listener once, eagerly, at creation time and never removes it. It runs even with no subscribers, and unsubscribing does nothing, so every page visit adds another listener: a classic leak.</p>`,
      code: { lang: 'js', run: true, code: RX + `
function makeTarget() { const fns = {}; return { add: 0,
  addEventListener(t, f) { (fns[t] = fns[t] || []).push(f); this.add++; },
  removeEventListener(t, f) { fns[t] = (fns[t] || []).filter((x) => x !== f); },
  emit(t, e) { (fns[t] || []).forEach((f) => f(e)); }, count(t) { return (fns[t] || []).length; } }; }

function fromEventLeaky(target, type) {
  const subs = [];
  target.addEventListener(type, (e) => subs.forEach((s) => s.next(e)));  // eager, never removed
  return new Observable((s) => { subs.push(s); /* no teardown */ });
}
const btn = makeTarget();
const clicks$ = fromEventLeaky(btn, 'click');
console.log('listeners before any subscribe:', btn.count('click'), '(should be 0)');
const a = clicks$.subscribe((e) => console.log('A got', e));
a.unsubscribe();
btn.emit('click', 'c1');
console.log('listeners after unsubscribe:', btn.count('click'), '(leak: still attached)');` }
    },
    mcq: { q: 'Where should removeEventListener be called?', options: ['In complete() only', 'In the teardown function returned from the Observable constructor', 'Never; the garbage collector removes listeners'], answer: 1, explain: 'Teardown runs on unsubscribe, error and complete, so it covers every way a subscription can end. GC cannot collect a handler the DOM still references.' },
    hints: [
      `<p>Hint 1: put <code>addEventListener</code> <b>inside</b> the function you pass to <code>new Observable</code>; that function runs once per subscriber.</p>`,
      `<p>Hint 2: create the handler as a local <code>const</code> so you keep the exact same function reference for removal.</p>`,
      `<p>Hint 3: return <code>() =&gt; target.removeEventListener(type, handler)</code>.</p>`
    ],
    solution: {
      approach: `<p>The subscribe function is the per-subscriber "setup", and its return value is the per-subscriber "cleanup". Keeping the handler in a closure guarantees we remove exactly the function we added.</p>`,
      code: { lang: 'js', run: true, code: RX + `
function makeTarget() { const fns = {}; return {
  addEventListener(t, f) { (fns[t] = fns[t] || []).push(f); },
  removeEventListener(t, f) { fns[t] = (fns[t] || []).filter((x) => x !== f); },
  emit(t, e) { (fns[t] || []).forEach((f) => f(e)); }, count(t) { return (fns[t] || []).length; } }; }

function fromEvent(target, type) {
  return new Observable((subscriber) => {
    const handler = (e) => subscriber.next(e);          // one listener per subscriber
    target.addEventListener(type, handler);
    return () => target.removeEventListener(type, handler);   // teardown removes THAT listener
  });
}
const btn = makeTarget();
const clicks$ = fromEvent(btn, 'click');
console.log('created, listeners =', btn.count('click'));
const a = clicks$.subscribe((e) => console.log('A got', e));
const b = clicks$.subscribe((e) => console.log('B got', e));
console.log('two subscribers, listeners =', btn.count('click'));
btn.emit('click', 'c1');
a.unsubscribe();
console.log('A unsubscribed, listeners =', btn.count('click'));
btn.emit('click', 'c2');
b.unsubscribe();
console.log('all gone, listeners =', btn.count('click'));` },
      complexity: `<p>O(1) per subscribe/unsubscribe; one listener per active subscriber.</p>`,
      followUps: ['How would you share ONE listener between many subscribers? (share())', 'How does RxJS fromEvent handle Node EventEmitter and jQuery-style targets?']
    }
  }]
});
/* =====================================================================
   TOPIC 2: Pipeable operators: map, filter, debounceTime, catchError
   ===================================================================== */
topics.push({
  title: 'Operators and pipe(): map, filter, debounceTime, catchError',
  analogy: `<p>Think of a <b>factory conveyor belt</b>. Items (values) roll along; each station does one job: one <b>paints</b> every item (<code>map</code>), one <b>throws out</b> broken ones (<code>filter</code>), one <b>waits until the belt has been quiet for 3 seconds</b> before letting the last item through (<code>debounceTime</code>), and a safety station catches anything that <b>explodes</b> and puts a replacement on the belt (<code>catchError</code>). <code>pipe()</code> is how you bolt the stations together, in order.</p>`,
  explain: `<p>🟢 <b>The big idea:</b> an operator is a function that takes an Observable and returns a <b>new</b> Observable. It never changes the source. You chain them with <code>source$.pipe(op1, op2, op3)</code>, read top to bottom like a recipe.</p>
    ${H.table(['Operator', 'What it does', 'Marble (input → output)'], [
      ['<code>map(fn)</code>', 'Transform each value', '1 2 3 → (x10) → 10 20 30'],
      ['<code>filter(fn)</code>', 'Keep values where fn is true', '1 2 3 4 → (even) → 2 4'],
      ['<code>tap(fn)</code>', 'Side effect (log), value unchanged', '1 2 → 1 2 (and logs)'],
      ['<code>debounceTime(ms)</code>', 'Emit the latest value only after <i>ms</i> of silence', 'a b c ··· d ··· → c d'],
      ['<code>distinctUntilChanged()</code>', 'Drop a value equal to the previous one', 'a a b a → a b a'],
      ['<code>catchError(fn)</code>', 'On error, switch to the Observable that fn returns', '1 2 ✕ → 1 2 fallback |'],
      ['<code>retry({ count, delay })</code>', 'On error, resubscribe to the source', '✕ ✕ ok → ok']
    ])}
    <p>🔵 <b>Search box recipe</b> (the most asked RxJS interview task):</p>
    <ol>
      <li><code>debounceTime(300)</code>: wait until the user pauses typing.</li>
      <li><code>map(q =&gt; q.trim())</code>, <code>filter(q =&gt; q.length &gt;= 2)</code>: ignore tiny queries.</li>
      <li><code>distinctUntilChanged()</code>: do not search "rx" again after "rx " was trimmed to the same text.</li>
      <li><code>switchMap(q =&gt; api.search(q).pipe(catchError(() =&gt; of([]))))</code>: one request at a time, cancel stale ones, and survive errors (next topic).</li>
    </ol>
    <p>🔵 <b>Where catchError goes matters.</b> An error <b>kills</b> the stream it travels through. If <code>catchError</code> sits at the end of the outer pipe, the first failed request ends the whole search box forever. Put it <b>inside</b> the inner request so only that request is replaced, and the outer stream lives on.</p>
    <p>🔵 <b>Imports:</b> since RxJS 7.2 every operator is exported from <code>'rxjs'</code> directly (the old <code>'rxjs/operators'</code> path still works). Prototype chaining (<code>obs.map(...)</code>) was removed back in RxJS 6.</p>`,
  clues: [
    '"Search as you type", "autocomplete", "do not hit the API on every keystroke" → <code>debounceTime</code> + <code>distinctUntilChanged</code> + <code>switchMap</code>',
    '"Save draft after the user stops typing" → <code>debounceTime</code>',
    '"After one failed request my stream stops working" → <code>catchError</code> is in the wrong place (put it inside the inner Observable)',
    '"Retry a flaky request 3 times with backoff" → <code>retry({ count: 3, delay })</code>',
    '"Transform the API response before the component sees it" → <code>map</code> in the service',
    '"Limit scroll / resize handler frequency" → <code>throttleTime</code> / <code>auditTime</code> (cousins of debounce)'
  ],
  code: [{
    lang: 'js', run: true, title: 'A search pipeline with debounce, filter, distinct and safe errors (runnable)',
    code: RX + `
// Fake keystrokes: [text, ms since start]
const keys = [['r', 0], ['rx', 40], ['rxj', 80], ['rxjs', 300], ['rxjs ', 340], ['ng', 600], ['boom', 900]];
const input$ = new Observable((s) => {
  const ids = keys.map(([text, ms]) => setTimeout(() => s.next(text), ms));
  const end = setTimeout(() => s.complete(), 1300);
  return () => { ids.forEach(clearTimeout); clearTimeout(end); };
});
const fakeApi = (q) => q === 'boom'
  ? timer(50).pipe(map(() => { throw new Error('500 from server'); }))
  : timer(50, ['result for "' + q + '"']);

input$.pipe(
  tap((q) => console.log(at(), 'typed   ', JSON.stringify(q))),
  debounceTime(150),                       // wait for a 150 ms pause
  map((q) => q.trim()),
  filter((q) => q.length >= 2),
  distinctUntilChanged(),                  // "rxjs " trims to "rxjs": skipped
  switchMap((q) => fakeApi(q).pipe(
    catchError((err) => { console.log(at(), 'caught  ', err.message); return of(['(no results)']); })  // INSIDE: outer stream survives
  ))
).subscribe({
  next: (r) => console.log(at(), 'render  ', r.join(', ')),
  complete: () => console.log(at(), 'input closed, pipeline complete')
});`
  }, {
    lang: 'ts', title: 'Angular service + component (RxJS 7)',
    code: `import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, debounceTime, distinctUntilChanged, filter, map, retry, switchMap, timer } from 'rxjs';

export interface Hit { id: number; title: string; }

@Injectable({ providedIn: 'root' })
export class SearchService {
  private http = inject(HttpClient);

  search(q: string): Observable<Hit[]> {
    return this.http.get<{ items: Hit[] }>('/api/search', { params: { q } }).pipe(
      map((res) => res.items),                                        // shape the data here
      retry({ count: 2, delay: (_err, attempt) => timer(attempt * 500) }), // 500 ms, then 1000 ms
      catchError(() => of([] as Hit[]))                                // per-request fallback
    );
  }

  // Turn a stream of raw input values into a stream of results
  results(query$: Observable<string>): Observable<Hit[]> {
    return query$.pipe(
      debounceTime(300),
      map((q) => q.trim()),
      filter((q) => q.length >= 2),
      distinctUntilChanged(),
      switchMap((q) => this.search(q))   // errors already handled inside search()
    );
  }
}`
  }],
  viz: {
    title: 'Typeahead marbles: keystrokes → debounce → filter/distinct → requests',
    input: 'r@0, rx@1, rxj@2, rxjs@6, rxjs@10, ng@11, ngrx@12; debounce=3',
    inputLabel: 'Keystrokes as text@tick (ticks 0 to 15), then "; debounce=N" (1 to 5)',
    gen: function (input) {
      var parts = String(input).split(';');
      var keysIn = parseTimed(parts[0], 15);
      if (keysIn.length < 2) throw new Error('Give at least 2 keystrokes, e.g. r@0, rx@1, rxj@5; debounce=3');
      var dm = /debounce\s*=\s*(\d+)/.exec(parts[1] || '');
      var d = dm ? Math.max(1, Math.min(5, +dm[1])) : 3;
      var T = Math.min(22, keysIn[keysIn.length - 1].t + d + 2);
      var rows = [marbleRow(T), marbleRow(T), marbleRow(T), marbleRow(T)], hl = {}, frames = [];
      var pending = null, due = -1, last = null, sent = [], skipped = 0;
      var byT = {};
      keysIn.forEach(function (k) { (byT[k.t] = byT[k.t] || []).push(k.v); });
      function snap(narr, t) {
        var h = JSON.parse(JSON.stringify(hl));
        for (var r = 0; r < 4; r++) if (!h[r + ',' + t] && rows[r][t]) h[r + ',' + t] = 'cur';
        frames.push({ narr: narr, parts: [
          { type: 'grid', label: 'Marble diagram (columns = ticks)', rows: copyRows(rows), rowHead: ['keystrokes', 'debounceTime(' + d + ')', 'filter + distinct', 'HTTP requests'], colHead: ticks(T), hl: h },
          { type: 'vars', label: 'Operator state', vals: { pending: pending === null ? '-' : pending, timerFiresAt: due < 0 ? '-' : due, lastSent: last === null ? '-' : last, requests: sent.length, savedCalls: skipped } }
        ] });
      }
      snap('A user types into a search box. Without operators we would send <b>' + keysIn.length + '</b> requests, one per keystroke. Let us push each keystroke through <code>debounceTime(' + d + ')</code>, then <code>filter(len ≥ 2)</code> + <code>distinctUntilChanged()</code>, then the request.', 0);
      for (var t = 0; t < T; t++) {
        if (due === t && pending !== null) {
          var v = pending; pending = null; due = -1;
          put(rows[1], t, v); hl['1,' + t] = 'ok';
          if (v.length < 2) { put(rows[2], t, '✕'); hl['2,' + t] = 'bad'; skipped++; snap('Tick ' + t + ': ' + d + ' quiet ticks passed, so debounce releases <b>' + v + '</b>. But <code>filter</code> drops it: shorter than 2 characters.', t); }
          else if (v === last) { put(rows[2], t, '=' ); hl['2,' + t] = 'bad'; skipped++; snap('Tick ' + t + ': debounce releases <b>' + v + '</b>, but it equals the last query we sent, so <code>distinctUntilChanged</code> drops it. No duplicate request.', t); }
          else { last = v; sent.push(v); put(rows[2], t, v); put(rows[3], t, 'GET ' + v); hl['2,' + t] = 'ok'; hl['3,' + t] = 'sel'; snap('Tick ' + t + ': the user paused for ' + d + ' ticks. Debounce emits the <b>latest</b> text <b>' + v + '</b>, it passes filter and distinct, and one request goes out.', t); }
        }
        (byT[t] || []).forEach(function (k) {
          put(rows[0], t, k);
          var replaced = pending;
          pending = k; due = t + d;
          if (replaced !== null) skipped++;
          snap('Tick ' + t + ': keystroke <b>' + k + '</b>. ' + (replaced !== null ? 'The previous pending value <b>' + replaced + '</b> is thrown away and ' : '') + 'debounce (re)starts its timer: it will emit at tick ' + due + ' if nothing else arrives.', t);
        });
      }
      frames.push({ narr: '<b>Result:</b> ' + keysIn.length + ' keystrokes became <b>' + sent.length + '</b> request(s): ' + (sent.join(', ') || 'none') + '. The other ' + (keysIn.length - sent.length) + ' were absorbed by debounce, filter or distinct. In a real app <code>switchMap</code> would also cancel a request that is still running when a new query arrives.', parts: [
        { type: 'grid', label: 'Final marbles', rows: rows, rowHead: ['keystrokes', 'debounceTime(' + d + ')', 'filter + distinct', 'HTTP requests'], colHead: ticks(T), hl: hl },
        { type: 'set', label: 'Requests sent', items: sent.length ? sent : ['(none)'] }
      ] });
      return frames;
    }
  },
  examples: [
    {
      title: 'map + filter on numbers',
      html: `<p><code>of(1, 2, 3, 4, 5).pipe(filter(n =&gt; n % 2 === 1), map(n =&gt; n * 10))</code> emits <b>10, 30, 50</b> and completes. Order matters: <code>map</code> then <code>filter(odd)</code> would give nothing, because 10, 20, 30... are all even.</p>`,
      code: { lang: 'js', run: true, code: RX + `
of(1, 2, 3, 4, 5).pipe(filter((n) => n % 2 === 1), map((n) => n * 10)).subscribe((v) => console.log('filter then map:', v));
of(1, 2, 3, 4, 5).pipe(map((n) => n * 10), filter((n) => n % 2 === 1)).subscribe({ next: (v) => console.log(v), complete: () => console.log('map then filter: nothing passed') });` }
    },
    {
      title: 'catchError in the wrong place kills the stream',
      html: `<p>Click 1 loads OK, click 2 fails, click 3 should still work.</p>
        ${H.table(['Placement', 'Click 1', 'Click 2 (500)', 'Click 3'], [
          ['<code>clicks$.pipe(switchMap(load), catchError(() =&gt; of(null)))</code>', 'data', 'null, then <span class="c-r">complete</span>', '<span class="c-r">nothing, stream is dead</span>'],
          ['<code>clicks$.pipe(switchMap(() =&gt; load().pipe(catchError(() =&gt; of(null)))))</code>', 'data', 'null', '<span class="c-g">data</span>']
        ])}
        <p>Rule: <b>catch errors as close to their source as possible</b>, inside the inner Observable of a flattening operator.</p>`
    },
    {
      title: 'debounceTime vs throttleTime vs auditTime',
      html: `${H.table(['Operator', 'Emits', 'Good for'], [
        ['<code>debounceTime(300)</code>', 'last value after 300 ms of silence', 'search box, autosave'],
        ['<code>throttleTime(300)</code>', 'first value, then ignores for 300 ms', 'button spam, scroll analytics'],
        ['<code>auditTime(300)</code>', 'last value at the end of each 300 ms window', 'resize / mousemove (latest position, regular rate)']
      ])}
      <p>A user who never stops typing will <b>never</b> trigger <code>debounceTime</code>. If you need a guaranteed update every N ms, use <code>auditTime</code> or <code>throttleTime</code> with <code>{ trailing: true }</code>.</p>`
    }
  ],
  deepDive: `<p>🟣 <b>An operator is just a function.</b> Writing your own is easy: <code>const double = () =&gt; (source) =&gt; new Observable(sub =&gt; source.subscribe({ next: v =&gt; sub.next(v * 2), error: e =&gt; sub.error(e), complete: () =&gt; sub.complete() }))</code>. Or compose existing ones: <code>const nonEmptyTrimmed = () =&gt; pipe(map(s =&gt; s.trim()), filter(Boolean))</code> using the standalone <code>pipe</code> function. Custom operators keep components tidy.</p>
    <p>🟣 <b>Errors thrown in your callbacks are caught.</b> If the function given to <code>map</code> throws, the operator sends that error down the error channel and unsubscribes from the source. So a <code>JSON.parse</code> inside <code>map</code> can kill a WebSocket stream; parse inside a <code>catchError</code>-protected inner pipe or guard it.</p>
    <p>🟣 <b>catchError's second argument</b> is <code>caught</code>, the source Observable itself. Returning it resubscribes (a manual retry; easy to make an infinite loop). Prefer <code>retry({ count, delay, resetOnSuccess })</code>; the <code>delay</code> option can be a function returning a timer for exponential backoff, and the old <code>retryWhen</code> is deprecated in RxJS 7.</p>
    <p>🟣 <b>Schedulers and testing.</b> Time-based operators accept a scheduler (default <code>asyncScheduler</code>, i.e. <code>setTimeout</code>). In tests, <code>TestScheduler.run(({ cold, expectObservable }) =&gt; ...)</code> runs marble diagrams in <b>virtual time</b>: <code>'a-b 300ms c|'</code>. That is the professional way to test <code>debounceTime</code> without real waiting. Angular's <code>fakeAsync</code> + <code>tick(300)</code> also works.</p>
    <p>🟣 <b>Memory:</b> <code>debounceTime</code> holds only the last value and one timer; <code>bufferTime</code>/<code>toArray</code> can grow without bound on infinite streams.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> "Debounced search with cancellation" is now a one-prompt task; the interview value moved to <b>explaining</b> each operator and catching the subtle bugs AI leaves in: <code>catchError</code> on the outer stream, missing <code>distinctUntilChanged</code>, <code>mergeMap</code> instead of <code>switchMap</code> (out-of-order results), or debouncing the request instead of the input.</p>
    <p>For AI features themselves, the same operators apply: debounce prompt suggestions, <code>throttleTime</code> on token-by-token UI updates to avoid re-rendering 50 times a second, <code>retry</code> with backoff on 429 rate-limit responses, and <code>timeout()</code> so a hung model call does not spin forever.</p>`,
  problems: [{
    title: 'Autosave a draft without flooding the server',
    level: 'Medium', tags: ['debounceTime', 'distinctUntilChanged', 'catchError'], companies: ['Notion', 'Atlassian'],
    statement: `<p>A note editor emits its full text on every keystroke (<code>text$</code>). Save to the server with <code>save(text)</code> (returns an Observable that may error). Requirements: save only after 200 ms of no typing; never save the same text twice in a row; a failed save must be logged but must <b>not</b> stop future saves; output a status stream of <code>'saved: ...'</code> or <code>'failed: ...'</code>.</p>`,
    constraints: `Saves are rare and short; ordering is not a concern for this task (use concatMap if it were).`,
    example: `<p>Typing "h","he","hel" quickly, pause, then "help" (fails), pause, "hello" → statuses: <span class="c-g">saved: hel</span>, <span class="c-r">failed: help</span>, <span class="c-g">saved: hello</span>.</p>`,
    brute: {
      why: `<p>Saving on every keystroke sends one request per character, and putting <code>catchError</code> at the end means the first failure completes the stream, so later edits are never saved.</p>`,
      code: { lang: 'js', run: true, code: RX + `
const text$ = new Subject();
const save = (t) => t === 'help' ? throwError(() => new Error('disk full')) : timer(10, 'saved: ' + t);
text$.pipe(
  mergeMap((t) => save(t)),                       // one save per keystroke
  catchError((e) => of('failed: ' + e.message))   // outer catch: stream ends after first error
).subscribe({ next: (s) => console.log(s), complete: () => console.log('status stream COMPLETED: autosave is dead') });
['h', 'he', 'hel', 'help', 'hello'].forEach((t, i) => setTimeout(() => text$.next(t), i * 30));` }
    },
    mcq: { q: 'Where should catchError go so later saves still happen?', options: ['After mergeMap in the outer pipe', 'Inside the inner save(text).pipe(...)', 'Before debounceTime'], answer: 1, explain: 'Inside, the error only ends that one inner save Observable; the outer text stream stays alive.' },
    hints: [
      `<p>Hint 1: the waiting part is <code>debounceTime(200)</code>; the "same text" part is <code>distinctUntilChanged()</code>.</p>`,
      `<p>Hint 2: map each surviving text to <code>save(text).pipe(...)</code> with a flattening operator.</p>`,
      `<p>Hint 3: inside that inner pipe: <code>map(() =&gt; 'saved: ' + t)</code> and <code>catchError(e =&gt; of('failed: ' + t))</code>.</p>`
    ],
    solution: {
      approach: `<p>Debounce collapses bursts into one value; distinct avoids repeat saves; the per-save inner pipe turns both success and failure into a status value, so the outer stream never sees an error.</p>`,
      code: { lang: 'js', run: true, code: RX + `
const text$ = new Subject();
const save = (t) => t === 'help' ? timer(10).pipe(map(() => { throw new Error('disk full'); })) : timer(10, 'ok');

const status$ = text$.pipe(
  debounceTime(200),
  distinctUntilChanged(),
  concatMap((t) => save(t).pipe(
    map(() => 'saved: ' + t),
    catchError((e) => of('failed: ' + t + ' (' + e.message + ')'))   // inner catch: stream survives
  ))
);
status$.subscribe({ next: (s) => console.log(at(), s), complete: () => console.log(at(), 'editor closed') });

// h, he, hel typed fast; pause; help; pause; hello; pause; hello again (no-op); close
const plan = [['h', 0], ['he', 30], ['hel', 60], ['help', 400], ['hello', 800], ['hello', 1200]];
plan.forEach(([t, ms]) => setTimeout(() => text$.next(t), ms));
setTimeout(() => text$.complete(), 1500);` },
      complexity: `<p>One timer and one stored value for debounce; at most one save per pause.</p>`,
      followUps: ['Why is concatMap a safer default than mergeMap for saves?', 'How would you also save immediately on window blur?']
    }
  }]
});
/* =====================================================================
   TOPIC 3: Higher-order mapping: switchMap, mergeMap, concatMap, exhaustMap
   ===================================================================== */
topics.push({
  title: 'switchMap vs mergeMap vs concatMap vs exhaustMap',
  analogy: `<p>You are a waiter and new orders keep arriving while the kitchen is still cooking. <b>switchMap</b>: "customer changed their mind", bin the old dish, cook the new one. <b>mergeMap</b>: cook everything at once on all burners; dishes come out in whatever order they finish. <b>concatMap</b>: one burner, orders wait in a queue, served strictly in order. <b>exhaustMap</b>: "kitchen busy, come back later", new orders are <b>ignored</b> until the current dish is served.</p>`,
  explain: `<p>🟢 <b>The problem they solve:</b> often each value should start <b>another</b> async job: each search term starts an HTTP call, each click starts a save. <code>map(q =&gt; http.get(q))</code> gives you an Observable <i>of Observables</i>, and subscribing inside subscribe is the classic anti-pattern (no cancellation, no ordering, leaks). A <b>flattening operator</b> subscribes to the inner Observables for you and decides what happens when a new outer value arrives <b>while an inner one is still running</b>.</p>
    ${H.table(['Operator', 'New value while busy', 'Concurrency', 'Order of results', 'Typical use'], [
      ['<code>switchMap</code>', '<span class="c-r">cancel</span> the running inner, start the new one', '1', 'latest only', 'search / typeahead, route param → load details'],
      ['<code>mergeMap</code>', 'start another in <b>parallel</b>', 'unlimited (or N with 2nd arg)', 'as they finish', 'independent actions: delete several rows, upload files'],
      ['<code>concatMap</code>', '<span class="c-y">queue</span> it', '1', 'strict input order', 'saves / writes that must not overlap or reorder'],
      ['<code>exhaustMap</code>', '<span class="c-r">ignore</span> it', '1', 'first wins', 'login / submit button double-click, refresh while refreshing']
    ])}
    <p>🔵 <b>Memory trick:</b> <b>s</b>witch = <b>s</b>top the old one; <b>m</b>erge = <b>m</b>any at once; <b>c</b>oncat = <b>c</b> queue in line; <b>e</b>xhaust = <b>e</b>xisting one wins.</p>
    <p>🔵 <b>Danger zones:</b></p>
    <ul>
      <li><code>switchMap</code> for <b>writes</b> is risky: cancelling the HTTP call on the client does not stop the server, and you lose the response (did the save succeed?).</li>
      <li><code>mergeMap</code> for search causes <b>race conditions</b>: a slow response for "an" can arrive after the fast one for "angular" and overwrite it.</li>
      <li><code>concatMap</code> with a fast source and slow inner builds an ever-growing queue.</li>
      <li><code>exhaustMap</code> silently drops input, which is wrong when every event matters.</li>
    </ul>`,
  clues: [
    '"Only show results for the latest query" / "cancel the previous request" → <code>switchMap</code>',
    '"Prevent double submit" / "ignore clicks while a request is pending" → <code>exhaustMap</code>',
    '"Saves must happen in order" / "do not overlap writes" → <code>concatMap</code>',
    '"Fire requests in parallel, at most 3 at a time" → <code>mergeMap(fn, 3)</code>',
    '"Old results flash over new ones" → a race; you used <code>mergeMap</code> where <code>switchMap</code> belongs',
    '"Nested subscribe" in code review → replace with a flattening operator'
  ],
  code: [{
    lang: 'js', run: true, title: 'Same clicks, four strategies (runnable)',
    code: RX + `
// Outer values arrive at 0, 40, 60 ms. Each inner "request" takes 100 ms.
const clicks = () => new Observable((s) => {
  const ids = [['A', 0], ['B', 40], ['C', 60]].map(([v, ms]) => setTimeout(() => s.next(v), ms));
  const end = setTimeout(() => s.complete(), 70);
  return () => { ids.forEach(clearTimeout); clearTimeout(end); };
});
const request = (v) => timer(100, v + ' done');

function run(name, flat, startAt) {
  setTimeout(() => {
    const t0 = Date.now(), out = [];
    clicks().pipe(flat(request)).subscribe({
      next: (r) => out.push(r + '@' + Math.round((Date.now() - t0) / 10) * 10),
      complete: () => console.log(name.padEnd(10), '->', out.join(', '))
    });
  }, startAt);
}
run('switchMap', switchMap, 0);     // only C survives
run('mergeMap', mergeMap, 400);     // A, B, C in parallel
run('concatMap', concatMap, 800);   // A, then B, then C (queued)
run('exhaustMap', exhaustMap, 1300); // A only, B and C ignored`
  }, {
    lang: 'ts', title: 'Angular: picking the right one per feature',
    code: `import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, catchError, concatMap, exhaustMap, map, mergeMap, of, switchMap } from 'rxjs';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface Product { id: string; name: string; }

@Component({ selector: 'app-product', standalone: true, template: '{{ product()?.name }}' })
export class ProductComponent {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  // Route param changes quickly (next/prev buttons): only the latest matters -> switchMap
  product = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('id')!),
      switchMap((id) => this.http.get<Product>('/api/products/' + id).pipe(catchError(() => of(null))))
    ),
    { initialValue: null }
  );

  // "Buy" must not be sent twice on a double-click -> exhaustMap
  buyClicks = new Subject<void>();
  // Every rating edit must be saved, in order -> concatMap
  ratings = new Subject<number>();
  // Delete several rows independently, max 3 requests at a time -> mergeMap with concurrency
  deletes = new Subject<string>();

  constructor() {
    this.buyClicks.pipe(exhaustMap(() => this.http.post('/api/orders', {})), takeUntilDestroyed()).subscribe();
    this.ratings.pipe(concatMap((r) => this.http.put('/api/rating', { r })), takeUntilDestroyed()).subscribe();
    this.deletes.pipe(mergeMap((id) => this.http.delete('/api/rows/' + id), 3), takeUntilDestroyed()).subscribe();
  }
}`
  }],
  viz: {
    title: 'Flattening strategies as marble diagrams',
    input: 'mode=switch; a@0, b@2, c@3, d@9; inner=3',
    inputLabel: 'mode=switch|merge|concat|exhaust; outer values value@tick (0 to 14); inner=duration in ticks (1 to 5)',
    gen: function (input) {
      var parts = String(input).split(';');
      if (parts.length < 2) throw new Error('Format: mode=switch; a@0, b@2, c@3; inner=3');
      var mm = /mode\s*=\s*(switch|merge|concat|exhaust)/i.exec(parts[0]);
      if (!mm) throw new Error('mode must be switch, merge, concat or exhaust');
      var mode = mm[1].toLowerCase();
      var outer = parseTimed(parts[1], 14);
      if (outer.length < 2 || outer.length > 6) throw new Error('Give 2 to 6 outer values, e.g. a@0, b@2, c@3');
      var im = /inner\s*=\s*(\d+)/.exec(parts[2] || '');
      var dur = im ? Math.max(1, Math.min(5, +im[1])) : 3;
      var T = Math.min(26, outer[outer.length - 1].t + dur * (mode === 'concat' ? outer.length : 1) + 2);
      var log = simulateFlatten(mode, outer, dur, T);
      var op = mode + 'Map';
      var frames = [{
        narr: 'Each outer value starts an inner job (think HTTP call) that emits <b>x1</b> after 1 tick and <b>x2</b> after ' + dur + ' ticks, then completes. The question <code>' + op + '</code> answers: <i>what if a new outer value arrives while an inner job is still running?</i>',
        parts: [
          { type: 'grid', label: op + ' (columns = ticks)', rows: [marbleRow(T), marbleRow(T), marbleRow(T)], rowHead: ['outer', 'inner jobs', 'result'], colHead: ticks(T) },
          { type: 'text', html: { switch: '<b>switchMap</b>: cancel the old inner, keep only the latest.', merge: '<b>mergeMap</b>: run all inners in parallel.', concat: '<b>concatMap</b>: queue new values, run inners one at a time in order.', exhaust: '<b>exhaustMap</b>: ignore new values while an inner is busy.' }[mode] }
        ]
      }];
      log.forEach(function (st) {
        var h = {};
        for (var r = 0; r < 3; r++) if (st.rows[r][st.t]) h[r + ',' + st.t] = r === 2 ? 'ok' : (/[✕∅]/.test(st.rows[r][st.t]) ? 'bad' : 'cur');
        frames.push({
          narr: 'Tick ' + st.t + ': ' + st.events.join('; ') + '.',
          parts: [
            { type: 'grid', label: op + ' (columns = ticks)', rows: st.rows, rowHead: ['outer', 'inner jobs', 'result'], colHead: ticks(T), hl: h },
            { type: 'vars', label: 'Operator state', vals: { running: st.active.join(',') || '-', queued: st.queue.join(',') || '-', ignored: st.dropped.join(',') || '-', cancelled: st.cancelled.join(',') || '-' } }
          ]
        });
      });
      var fin = log.length ? log[log.length - 1] : null;
      var outVals = [];
      if (fin) fin.rows[2].forEach(function (c) { if (c) outVals = outVals.concat(c.split(' ')); });
      frames.push({
        narr: '<b>Done.</b> <code>' + op + '</code> produced: <b>' + (outVals.join(', ') || 'nothing') + '</b>. ' + {
          switch: 'Only inners that were not interrupted finished: perfect for "latest search wins", dangerous for saves.',
          merge: 'Everything ran, results interleave by finish time: fast, but order is not guaranteed.',
          concat: 'Everything ran, strictly in order, one at a time: safe for writes, but can lag behind.',
          exhaust: 'Values that arrived while busy were dropped: ideal for "ignore double clicks".'
        }[mode] + ' Try the same input with another mode to compare.',
        parts: [
          { type: 'grid', label: op + ' final', rows: fin ? fin.rows : [marbleRow(T), marbleRow(T), marbleRow(T)], rowHead: ['outer', 'inner jobs', 'result'], colHead: ticks(T) },
          { type: 'set', label: 'Result values', items: outVals.length ? outVals : ['(none)'] }
        ]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'The search race condition, with numbers',
      html: `<p>User types "an" (request takes 900 ms) and then "angular" (takes 200 ms).</p>
        ${H.table(['Time', 'mergeMap', 'switchMap'], [
          ['0 ms', 'GET ?q=an', 'GET ?q=an'],
          ['300 ms', 'GET ?q=angular', '<span class="c-r">cancel</span> "an", GET ?q=angular'],
          ['500 ms', 'show angular results', 'show angular results'],
          ['900 ms', '<span class="c-r">show "an" results (stale, wrong!)</span>', '<span class="c-g">nothing ("an" was cancelled)</span>']
        ])}`
    },
    {
      title: 'Login button: exhaustMap',
      html: `<p>A nervous user clicks "Log in" three times in 200 ms. With <code>mergeMap</code> you send 3 login requests (maybe 3 sessions, 3 audit log entries). With <code>switchMap</code> you cancel the first two client-side, but the server may have processed them anyway. With <code>exhaustMap</code>, clicks 2 and 3 are <b>ignored</b> while the first request is in flight; once it completes, the button works again. (Disabling the button is still good UX; the operator is the safety net.)</p>`
    },
    {
      title: 'Ordered saves: concatMap',
      html: `<p>A slider sends ratings 3, 4, 5 quickly. With <code>mergeMap</code> the server might receive 3, 5, 4 (network jitter) and store <b>4</b>. With <code>concatMap</code> each PUT starts only after the previous completes, so the final stored value is <b>5</b>. If you only care about the final value, <code>switchMap</code> is tempting, but a cancelled PUT may still be applied by the server; a common robust answer is <code>debounceTime</code> + <code>concatMap</code>.</p>`
    },
    {
      title: 'mergeMap with a concurrency limit',
      html: `<p><code>from(fileList).pipe(mergeMap(file =&gt; upload(file), 3))</code> uploads at most <b>3</b> files at a time; when one finishes, the next starts. <code>concatMap(fn)</code> is exactly <code>mergeMap(fn, 1)</code>.</p>`,
      code: { lang: 'js', run: true, code: RX + `
// concatMap(fn) behaves like mergeMap(fn, 1): one at a time, in order
const jobs = of(1, 2, 3);
const slow = (n) => timer(60 - n * 15, 'job' + n);   // later jobs are faster
const out1 = [], out2 = [];
jobs.pipe(mergeMap(slow)).subscribe({ next: (v) => out1.push(v), complete: () => console.log('mergeMap  (parallel, finish order):', out1.join(' ')) });
jobs.pipe(concatMap(slow)).subscribe({ next: (v) => out2.push(v), complete: () => console.log('concatMap (sequential, input order):', out2.join(' ')) });` }
    }
  ],
  deepDive: `<p>🟣 <b>All four are mergeMap with a policy.</b> Internally RxJS 7 implements them with a shared <code>mergeInternals</code> (concurrency + buffer): <code>concatMap</code> = concurrency 1 with an unbounded queue; <code>switchMap</code> has its own small implementation that unsubscribes the previous inner subscriber; <code>exhaustMap</code> checks "is an inner active?" and drops. The runnable look-alike above follows the same structure with one <code>flatten(mode)</code> engine.</p>
    <p>🟣 <b>Completion rules.</b> The result completes only when the outer has completed <b>and</b> all active (and queued) inners have completed. An outer that never completes (route params, clicks) keeps the result alive: you still need teardown. An error in any inner errors the whole result, which is why the inner <code>catchError</code> matters.</p>
    <p>🟣 <b>Cancellation is real.</b> With Angular's <code>HttpClient</code>, unsubscribing an inner request aborts the XHR/fetch. With <code>switchMap</code> on a server-side write, the request may already have reached the server: client cancellation is <b>not</b> a transaction rollback. Make writes idempotent (idempotency keys) when in doubt.</p>
    <p>🟣 <b>The <code>*All</code> and <code>*To</code> family:</b> <code>switchAll()</code>, <code>mergeAll()</code>, <code>concatAll()</code>, <code>exhaustAll()</code> flatten an existing higher-order Observable; <code>switchMap(() =&gt; x$)</code> with a constant inner used to be <code>switchMapTo</code> (deprecated in RxJS 7). Also related: <code>combineLatest</code>/<code>forkJoin</code>/<code>withLatestFrom</code> combine <i>independent</i> streams rather than mapping one to another; <code>forkJoin</code> waits for all to complete (like <code>Promise.all</code>).</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> code assistants default to <code>switchMap</code> for almost everything because it dominates tutorials. That is correct for reads and often wrong for writes. In code review, ask for each flattening operator: <i>what should happen when a second value arrives early?</i> If nobody can answer, the operator was not chosen, it was guessed.</p>
    <p>AI chat UIs give fresh examples: "regenerate response" while a response is streaming is a <code>switchMap</code> (abort the old stream), "send message" is often <code>concatMap</code> (keep conversation order), and "run tool calls in parallel, max 4" is <code>mergeMap(fn, 4)</code>.</p>`,
  problems: [{
    title: 'Fix the double-submit payment button',
    level: 'Medium', tags: ['exhaustMap', 'mergeMap', 'race'], companies: ['Stripe', 'Flipkart', 'PayPal'],
    statement: `<p>A "Pay" button stream <code>clicks$</code> feeds <code>clicks$.pipe(mergeMap(() =&gt; pay()))</code>. Users double-click and get charged twice. Change the pipeline so that <b>while a payment is in flight, extra clicks are ignored</b>, and once it finishes, a new click starts a new payment. A failed payment must emit <code>'failed'</code> and keep the button usable.</p>`,
    constraints: `pay() takes ~100 ms and may error. Do not use flags or variables outside the stream.`,
    example: `<p>Clicks at 0, 20, 50 ms and 300 ms → payments start at <span class="c-g">0</span> and <span class="c-g">300</span> only; clicks at 20 and 50 are <span class="c-r">ignored</span>.</p>`,
    brute: {
      why: `<p><code>mergeMap</code> starts a new payment for every click, in parallel. Three quick clicks become three charges.</p>`,
      code: { lang: 'js', run: true, code: RX + `
let charges = 0;
const pay = () => { charges++; return timer(100, 'paid #' + charges); };
const clicks$ = new Subject();
clicks$.pipe(mergeMap(() => pay())).subscribe((r) => console.log(at(), r));
[0, 20, 50].forEach((ms) => setTimeout(() => clicks$.next(), ms));
setTimeout(() => console.log('total charges:', charges, '(customer charged 3 times!)'), 250);` }
    },
    mcq: { q: 'Which operator ignores new clicks while a payment is running?', options: ['switchMap', 'concatMap', 'exhaustMap', 'mergeMap'], answer: 2, explain: 'exhaustMap drops outer values while an inner subscription is active. concatMap would still pay later for every queued click; switchMap would cancel on the client but the server may already be charging.' },
    hints: [
      `<p>Hint 1: the question is "what should a click do while the inner pay() is still running?" Answer: nothing.</p>`,
      `<p>Hint 2: that policy has a name among the four flattening operators.</p>`,
      `<p>Hint 3: <code>clicks$.pipe(exhaustMap(() =&gt; pay().pipe(catchError(() =&gt; of('failed')))))</code>.</p>`
    ],
    solution: {
      approach: `<p><code>exhaustMap</code> keeps a single active inner subscription and drops outer values until it completes. The inner <code>catchError</code> turns a failure into a value, so the outer click stream is never errored and the button keeps working.</p>`,
      code: { lang: 'js', run: true, code: RX + `
let charges = 0;
const pay = () => { charges++; const n = charges; return n === 2 ? timer(100).pipe(map(() => { throw new Error('card declined'); })) : timer(100, 'paid #' + n); };
const clicks$ = new Subject();
clicks$.pipe(
  exhaustMap(() => pay().pipe(catchError((e) => of('failed: ' + e.message))))
).subscribe((r) => console.log(at(), r));
[0, 20, 50, 300, 320, 600].forEach((ms) => setTimeout(() => { console.log(at(), 'click'); clicks$.next(); }, ms));
setTimeout(() => console.log('total charges:', charges, '(one per completed attempt, never two at once)'), 800);` },
      complexity: `<p>O(1) state: one active inner subscription.</p>`,
      followUps: ['Why is switchMap unsafe here even though it also prevents parallel payments on the client?', 'How do idempotency keys protect you on the server side?']
    }
  }]
});
/* =====================================================================
   TOPIC 4: Subjects
   ===================================================================== */
topics.push({
  title: 'Subjects: Subject, BehaviorSubject, ReplaySubject',
  analogy: `<p>A <b>Subject</b> is a <b>live radio broadcast</b>: if you tune in late, you missed it. A <b>BehaviorSubject</b> is a <b>departure board</b> at a station: whenever you look, it shows the <i>current</i> state, then keeps updating. A <b>ReplaySubject</b> is a <b>group chat</b> where new members can scroll up and see the last N messages before the live ones.</p>`,
  explain: `<p>🟢 <b>The big idea:</b> a Subject is <b>both</b> an Observable (you can <code>subscribe</code>) <b>and</b> an observer (you can call <code>next</code>, <code>error</code>, <code>complete</code> on it). It is <b>hot</b> and <b>multicast</b>: one producer, many listeners, everyone gets the same value at the same time.</p>
    ${H.table(['Type', 'Needs initial value?', 'What a NEW subscriber gets first', 'Read current value synchronously?', 'Use for'], [
      ['<code>Subject</code>', 'No', 'Nothing; only future values', 'No', 'events: clicks, "save requested", destroy notifier'],
      ['<code>BehaviorSubject</code>', '<b>Yes</b>', 'The current (latest) value immediately', '<code>.value</code> / <code>getValue()</code>', 'state: current user, filters, cart (pre-signals stores)'],
      ['<code>ReplaySubject(n, ms?)</code>', 'No', 'The last <i>n</i> values (within <i>ms</i> window)', 'No', 'history / late joiners: last 10 notifications, cached config'],
      ['<code>AsyncSubject</code>', 'No', 'Only the final value, on complete', 'No', 'rare; one-shot computations']
    ])}
    <p>🔵 <b>The service-with-a-subject pattern</b> (very common in Angular before signals): keep a <code>private</code> <code>BehaviorSubject</code>, expose <code>readonly state$ = subject.asObservable()</code>, and change state only through methods. <code>asObservable()</code> hides <code>next()</code> from consumers so components cannot push random values into your store.</p>
    <p>🔵 <b>After complete:</b> a Subject that completed or errored is finished. Late subscribers to a <code>Subject</code> just get the complete/error; a <code>ReplaySubject</code> first replays its buffer, then the complete; a <code>BehaviorSubject</code> does <b>not</b> replay its value after completing. Calling <code>next()</code> after <code>complete()</code> does nothing.</p>
    <p>🔵 <b>Today:</b> for <b>synchronous component and service state</b>, Angular signals (<code>signal()</code>) usually replace <code>BehaviorSubject</code>. Subjects remain the right tool for <b>events</b> and for feeding RxJS pipelines (e.g. a <code>Subject&lt;string&gt;</code> of search terms piped through <code>debounceTime</code>).</p>`,
  clues: [
    '"Share state between sibling components through a service" → private <code>BehaviorSubject</code> + public <code>asObservable()</code> (or a signal)',
    '"A late subscriber needs the current value" → <code>BehaviorSubject</code> (not <code>Subject</code>)',
    '"Show the last 5 messages to whoever opens the panel" → <code>ReplaySubject(5)</code>',
    '"Why does my component never receive the first event?" → plain <code>Subject</code>, subscribed too late',
    '"Event bus" / "notify other components that X happened" → <code>Subject</code>',
    '"Multicast one HTTP call to many subscribers" → <code>shareReplay(1)</code> (built on a ReplaySubject)'
  ],
  code: [{
    lang: 'js', run: true, title: 'Late subscribers on each Subject type (runnable)',
    code: RX + `
function demo(name, subj) {
  const got = { A: [], B: [] };
  subj.subscribe((v) => got.A.push(v));    // early subscriber
  subj.next(1); subj.next(2); subj.next(3);
  subj.subscribe((v) => got.B.push(v));    // late subscriber
  subj.next(4);
  console.log(name.padEnd(22), 'A got', JSON.stringify(got.A).padEnd(12), 'B (late) got', JSON.stringify(got.B));
}
demo('Subject', new Subject());
demo('BehaviorSubject(0)', new BehaviorSubject(0));
demo('ReplaySubject(2)', new ReplaySubject(2));

const user = new BehaviorSubject(null);
user.next({ name: 'Ana' });
console.log('BehaviorSubject.value right now:', user.value.name);`
  }, {
    lang: 'ts', title: 'A small store service with BehaviorSubject (classic Angular)',
    code: `import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, map } from 'rxjs';

export interface CartLine { id: string; price: number; qty: number; }
interface CartState { lines: CartLine[]; }

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly state = new BehaviorSubject<CartState>({ lines: [] });   // private: only this service can next()

  readonly lines$: Observable<CartLine[]> = this.state.pipe(map((s) => s.lines), distinctUntilChanged());
  readonly count$ = this.lines$.pipe(map((ls) => ls.reduce((n, l) => n + l.qty, 0)));
  readonly total$ = this.lines$.pipe(map((ls) => ls.reduce((t, l) => t + l.price * l.qty, 0)));

  add(line: CartLine): void {
    const cur = this.state.value;                                          // synchronous snapshot
    const existing = cur.lines.find((l) => l.id === line.id);
    const lines = existing
      ? cur.lines.map((l) => (l.id === line.id ? { ...l, qty: l.qty + line.qty } : l))
      : [...cur.lines, line];
    this.state.next({ ...cur, lines });                                    // always a NEW object
  }

  clear(): void { this.state.next({ lines: [] }); }
}`
  }],
  viz: {
    title: 'Who receives what? Subject vs BehaviorSubject vs ReplaySubject',
    input: 'next 1; sub A; next 2; next 3; sub B; next 4; complete; sub C',
    inputLabel: 'Commands separated by ";": next N, sub NAME, complete (up to 14 commands; BehaviorSubject starts at 0, ReplaySubject buffer = 2)',
    gen: function (input) {
      var cmds = String(input).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      if (cmds.length < 3) throw new Error('Give at least 3 commands, e.g. next 1; sub A; next 2');
      if (cmds.length > 14) throw new Error('Use at most 14 commands');
      var types = ['Subject', 'BehaviorSubject(0)', 'ReplaySubject(2)'];
      var st = types.map(function (_, i) { return { subs: [], got: {}, buf: [], value: 0, done: false }; });
      var order = [], frames = [];
      function rows() { return order.map(function (n) { return [n].concat(st.map(function (s) { return (s.got[n] || []).join(' ') + (s.ended && s.ended[n] ? ' |' : ''); })); }); }
      function vals() { return { 'Behavior.value': st[1].value, 'Replay buffer': '[' + st[2].buf.join(',') + ']', completed: st[0].done }; }
      function frame(narr, hlRow) { var h = {}; if (hlRow !== undefined && hlRow >= 0) h[hlRow] = 'cur'; frames.push({ narr: narr, parts: [{ type: 'table', label: 'Values received by each subscriber', columns: ['subscriber'].concat(types), rows: rows(), hl: h }, { type: 'vars', label: 'Inside the subjects', vals: vals() }] }); }
      frame('Three subjects receive the <b>same</b> commands. BehaviorSubject starts with value <b>0</b>. ReplaySubject keeps the last <b>2</b> values. Watch what late subscribers get.');
      cmds.forEach(function (c) {
        var m;
        if ((m = /^next\s+(-?\w+)$/i.exec(c))) {
          var v = m[1];
          st.forEach(function (s, i) {
            if (s.done) return;
            s.subs.forEach(function (n) { s.got[n].push(v); });
            if (i === 1) s.value = v;
            if (i === 2) { s.buf.push(v); if (s.buf.length > 2) s.buf.shift(); }
          });
          frame(st[0].done ? '<code>next(' + v + ')</code> after <code>complete()</code>: <span class="c-r">ignored</span> by all three. A finished subject stays finished.' : '<code>next(' + v + ')</code>: every <b>current</b> subscriber of every subject receives <b>' + v + '</b> at the same moment (multicast). BehaviorSubject\'s value becomes ' + v + '; ReplaySubject\'s buffer keeps the last 2.', -1);
        } else if ((m = /^sub\s+(\w+)$/i.exec(c))) {
          var n = m[1];
          if (order.indexOf(n) >= 0) throw new Error('Subscriber ' + n + ' already exists');
          if (order.length >= 6) throw new Error('At most 6 subscribers');
          order.push(n);
          st.forEach(function (s, i) {
            s.got[n] = []; s.ended = s.ended || {};
            if (s.done) { if (i === 2) s.got[n] = s.buf.slice(); s.ended[n] = true; return; }
            s.subs.push(n);
            if (i === 1) s.got[n].push(s.value);
            if (i === 2) s.got[n] = s.buf.slice();
          });
          frame(st[0].done
            ? '<b>' + n + '</b> subscribes <b>after complete</b>. Subject: just the completion. BehaviorSubject: just the completion (no value!). ReplaySubject: replays its buffer <b>[' + st[2].buf.join(',') + ']</b>, then completes.'
            : '<b>' + n + '</b> subscribes now. <span class="c-m">Subject</span>: gets nothing yet (missed the past). <span class="c-b">BehaviorSubject</span>: immediately gets the current value <b>' + st[1].value + '</b>. <span class="c-p">ReplaySubject(2)</span>: immediately gets the buffered <b>[' + st[2].buf.join(',') + ']</b>.', order.length - 1);
        } else if (/^complete$/i.test(c)) {
          st.forEach(function (s) { if (!s.done) { s.done = true; s.subs.forEach(function (n) { s.ended[n] = true; }); s.subs = []; } });
          frame('<code>complete()</code>: every current subscriber gets the completion signal (shown as |) and is removed. From now on <code>next</code> is ignored.', -1);
        } else throw new Error('Unknown command "' + c + '". Use next N, sub NAME or complete');
      });
      frames.push({ narr: '<b>Takeaway:</b> use <code>Subject</code> for events (late joiners should not see old clicks), <code>BehaviorSubject</code> for "current state" (always has a value), <code>ReplaySubject(n)</code> when late joiners need recent history.', parts: [{ type: 'table', label: 'Final', columns: ['subscriber'].concat(types), rows: rows() }] });
      return frames;
    }
  },
  examples: [
    {
      title: 'The "missing first event" bug',
      html: `<p>A service emits <code>loaded$.next(config)</code> in its constructor; a component subscribes in <code>ngOnInit</code>, later. With a plain <code>Subject</code> the component <b>never</b> sees the config. Fix: <code>BehaviorSubject</code> (needs an initial value, e.g. <code>null</code>) or <code>ReplaySubject(1)</code> (no initial value; late subscribers wait for the first one), or a signal.</p>`
    },
    {
      title: 'Exposing state safely with asObservable()',
      html: `<p>If a service exposes <code>public user = new BehaviorSubject(...)</code>, any component can call <code>user.next(somethingWrong)</code> and you can never find who changed it. Keep the subject <code>private</code> and expose <code>user$ = this.user.asObservable()</code> plus intention-revealing methods (<code>login()</code>, <code>logout()</code>). The same idea with signals: <code>private _user = signal(...)</code>, <code>user = this._user.asReadonly()</code>.</p>`
    },
    {
      title: 'shareReplay: one HTTP call, many subscribers',
      html: `<p><code>config$ = http.get('/config').pipe(shareReplay({ bufferSize: 1, refCount: true }))</code> turns a cold request into a shared, cached one: the first subscriber triggers the call, later ones get the replayed value. With <code>refCount: true</code>, the source is unsubscribed when the last subscriber leaves (avoids keeping infinite sources alive); with <code>refCount: false</code> (the default when you pass a number), the source stays subscribed forever, which is fine for a one-shot HTTP call but a leak for an interval or WebSocket.</p>`,
      code: { lang: 'js', run: true, code: RX + `
// Hand-made shareReplay(1) for a cold source, to see the idea
let calls = 0;
const http$ = new Observable((s) => { calls++; const id = setTimeout(() => { s.next({ theme: 'dark' }); s.complete(); }, 30); return () => clearTimeout(id); });
function shareReplay1(src) { let subject = null; return new Observable((s) => { if (!subject) { subject = new ReplaySubject(1); src.subscribe(subject); } return subject.subscribe(s); }); }

const config$ = shareReplay1(http$);
config$.subscribe((c) => console.log('header got', c.theme));
config$.subscribe((c) => console.log('sidebar got', c.theme));
setTimeout(() => config$.subscribe((c) => console.log('late footer got', c.theme, '(replayed)')), 100);
setTimeout(() => console.log('HTTP calls made:', calls), 150);` }
    }
  ],
  deepDive: `<p>🟣 <b>How a Subject works.</b> It keeps an array of observers. <code>subscribe</code> adds one (and returns a Subscription that removes it); <code>next(v)</code> loops over a <b>copy</b> of the array calling each observer's <code>next</code>. That is all multicast is. <code>BehaviorSubject</code> additionally stores <code>_value</code> and emits it on subscribe; <code>ReplaySubject</code> stores a buffer (optionally with timestamps for the window) and replays it.</p>
    <p>🟣 <b>Re-entrancy.</b> If an observer calls <code>subject.next()</code> inside its own <code>next</code> handler, other observers can see values in surprising order (observer 2 may receive the nested value before the original). Avoid feedback loops; if needed, schedule the re-emission (<code>queueScheduler</code> or a microtask).</p>
    <p>🟣 <b>Multicasting operators.</b> RxJS 7 unified them into <code>share()</code> with options: <code>share({ connector: () =&gt; new ReplaySubject(1), resetOnError, resetOnComplete, resetOnRefCountZero })</code>. <code>shareReplay</code> is a convenience over that idea. The old <code>multicast</code>, <code>publish</code>, <code>publishReplay</code> and <code>refCount</code> operators are deprecated (removal planned for RxJS 8); <code>connectable()</code> replaces <code>ConnectableObservable</code>.</p>
    <p>🟣 <b>BehaviorSubject vs signals.</b> Both hold a current value and can be read synchronously. Differences: a <code>BehaviorSubject</code> notifies subscribers <b>synchronously</b> on every <code>next</code>, even with the same value (add <code>distinctUntilChanged</code>); a signal skips equal values (<code>Object.is</code>), notifies lazily, and is automatically tracked by templates, <code>computed</code> and <code>effect</code> without manual subscriptions. That is why new Angular code uses signals for state.</p>
    <p>🟣 <b>Errors:</b> calling <code>error()</code> on a Subject shared by the whole app (an event bus) kills it for everyone. Prefer emitting error <i>values</i> on buses.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> older training data makes assistants produce "BehaviorSubject stores" for every bit of Angular state. In Angular 17+ codebases, ask for a <b>signal-based</b> store first (or NgRx SignalStore) and keep Subjects for events and stream pipelines. AI is useful for mechanical migrations: <code>BehaviorSubject</code> + <code>asObservable</code> + <code>| async</code> → <code>signal</code> + <code>asReadonly</code> + direct template reads, but review that synchronous <code>.value</code> reads and <code>distinctUntilChanged</code> semantics were preserved.</p>
    <p>Real-time AI features (live transcription, agent progress events) often fan out one WebSocket to many widgets: that is a <code>share()</code>/<code>Subject</code> job, with <code>ReplaySubject</code> giving newly opened panels the recent context.</p>`
});
/* =====================================================================
   TOPIC 5: Angular: async pipe, avoiding leaks, takeUntilDestroyed
   ===================================================================== */
topics.push({
  title: 'Angular Subscriptions: the async Pipe, Leaks and takeUntilDestroyed',
  analogy: `<p>Subscribing is like <b>turning on a tap</b>. If you leave the room (the component is destroyed) without turning it off, water keeps running: the flat floods slowly, and every time you come back you open <i>another</i> tap. The <b>async pipe</b> is a tap with a motion sensor that shuts itself off when you leave. <b>takeUntilDestroyed</b> is a timer switch wired to the room's light: lights off, tap off.</p>`,
  explain: `<p>🟢 <b>The leak:</b> a component subscribes to a stream that <b>never completes</b> (an <code>interval</code>, router events, a store, a <code>BehaviorSubject</code>, <code>form.valueChanges</code>, a WebSocket). The component is destroyed, but the subscription keeps a reference to it, so the component cannot be garbage-collected, and its callback keeps running. Navigate back and forth 10 times and you have 10 zombie callbacks (duplicate requests, duplicate logs, rising memory).</p>
    <p>🔵 <b>Option 1: don't subscribe, use the <code>async</code> pipe.</b> <code>{{ user$ | async }}</code> subscribes when the view is created, returns the latest value, calls <code>markForCheck()</code> on every emission (so it works with <code>OnPush</code>), and <b>unsubscribes automatically</b> when the view is destroyed. Before the first value it returns <code>null</code>. With the built-in control flow: <code>@if (user$ | async; as user) { {{ user.name }} }</code> subscribes once and gives you a local variable.</p>
    <p>🔵 <b>Option 2: <code>takeUntilDestroyed()</code></b> (from <code>@angular/core/rxjs-interop</code>, Angular 16+). Add it as the <b>last</b> operator: <code>stream$.pipe(..., takeUntilDestroyed()).subscribe(...)</code>. It completes the stream when the surrounding component, directive, service or <code>DestroyRef</code> is destroyed. Called with no argument it must run in an <b>injection context</b> (field initializer or constructor). Elsewhere (e.g. <code>ngOnInit</code>) inject <code>DestroyRef</code> and pass it: <code>takeUntilDestroyed(this.destroyRef)</code>.</p>
    <p>🔵 <b>Option 3: <code>toSignal()</code></b> converts the stream to a signal and also unsubscribes on destroy (next topics).</p>
    ${H.table(['Approach', 'Unsubscribes automatically?', 'Notes'], [
      ['manual <code>subscribe</code> in <code>ngOnInit</code>', '<span class="c-r">No</span>', 'leak for infinite streams'],
      ['store <code>Subscription</code>, <code>unsubscribe()</code> in <code>ngOnDestroy</code>', 'Yes (if you remember)', 'boilerplate, easy to forget one'],
      ['<code>takeUntil(this.destroy$)</code> + <code>ngOnDestroy</code>', 'Yes', 'pre-v16 classic; must be the last operator'],
      ['<code>takeUntilDestroyed()</code>', '<span class="c-g">Yes</span>', 'modern; injection context or pass DestroyRef'],
      ['<code>| async</code> in template', '<span class="c-g">Yes</span>', 'best when the value is only displayed'],
      ['<code>toSignal(obs$)</code>', '<span class="c-g">Yes</span>', 'best in signal-based components']
    ])}`,
  clues: [
    '"Memory grows every time I navigate to the page" / "callback fires twice after revisiting" → a subscription that is never torn down',
    '"How do you unsubscribe in Angular?" → async pipe, <code>takeUntilDestroyed</code>, <code>toSignal</code>; explain which streams need it',
    '"Do I need to unsubscribe from HttpClient?" → it completes after one response, but unsubscribe still cancels in-flight requests on destroy',
    '"OnPush component does not update when the Observable emits" → use the <code>async</code> pipe (it calls <code>markForCheck</code>) or a signal',
    '"NG0203: takeUntilDestroyed() can only be used within an injection context" → pass <code>DestroyRef</code> explicitly',
    '"Template shows the same request twice" → several <code>| async</code> on a cold stream; use <code>@if (... | async; as x)</code> or share'
  ],
  code: [{
    lang: 'ts', title: 'Leaky vs fixed component (Angular 17+)',
    code: `import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';
import { NotificationsService } from './notifications.service';

// BAD: subscribes to an infinite stream and never unsubscribes
@Component({ selector: 'app-leaky', standalone: true, template: '{{ count }}' })
export class LeakyComponent implements OnInit {
  count = 0;
  ngOnInit(): void {
    interval(1000).subscribe(() => this.count++);   // keeps running after the component is gone
  }
}

// GOOD: three leak-free styles
@Component({
  selector: 'app-clean',
  standalone: true,
  imports: [AsyncPipe],
  template: \`
    <p>Seconds: {{ seconds$ | async }}</p>
    @if (notifications.unread$ | async; as unread) {
      <span class="badge">{{ unread }}</span>
    }
  \`,
})
export class CleanComponent implements OnInit {
  protected notifications = inject(NotificationsService);
  private destroyRef = inject(DestroyRef);

  // 1) async pipe: the template subscribes and unsubscribes for us
  seconds$ = interval(1000).pipe(map((n) => n + 1));

  constructor() {
    // 2) takeUntilDestroyed() in an injection context (constructor / field initializer)
    this.notifications.unread$.pipe(takeUntilDestroyed()).subscribe((n) => (document.title = '(' + n + ') Inbox'));
  }

  ngOnInit(): void {
    // 3) outside an injection context: pass the DestroyRef explicitly
    interval(5000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.notifications.poll());
  }
}`
  }, {
    lang: 'js', run: true, title: 'Simulating navigation: leaky vs takeUntil (runnable)',
    code: RX + `
// A "component" that subscribes to an app-wide stream. destroy$ plays the role of DestroyRef.
const appEvents$ = new Subject();
let liveLeaky = 0, liveClean = 0;
function mount(clean) {
  const destroy$ = new Subject();
  const src$ = new Observable((s) => { clean ? liveClean++ : liveLeaky++; const sub = appEvents$.subscribe(s); return () => { clean ? liveClean-- : liveLeaky--; sub.unsubscribe(); }; });
  (clean ? src$.pipe(takeUntil(destroy$)) : src$).subscribe(() => {});
  return { destroy() { destroy$.next(); destroy$.complete(); } };   // what Angular does on destroy
}
for (let visit = 1; visit <= 5; visit++) {
  mount(false).destroy();   // leaky page: destroy does nothing for its subscription
  mount(true).destroy();    // clean page: takeUntil completes the stream on destroy
  console.log('after visit', visit, '| leaky live subscriptions:', liveLeaky, '| clean:', liveClean);
}
console.log('appEvents$ listeners still attached:', appEvents$.observers.size);`
  }],
  viz: {
    title: 'Navigate in and out: who leaks?',
    input: 'open, close, open, close, open, close, open',
    inputLabel: 'A sequence of open / close actions for a page that subscribes to interval(1000) (up to 12 actions)',
    gen: function (input) {
      var acts = String(input).split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
      if (acts.length < 2) throw new Error('Give at least 2 actions, e.g. open, close, open');
      if (acts.length > 12) throw new Error('Use at most 12 actions');
      acts.forEach(function (a) { if (a !== 'open' && a !== 'close') throw new Error('Actions must be "open" or "close"'); });
      var isOpen = false, manual = 0, until = 0, asyncP = 0, frames = [], step = 0;
      var nodes = [
        { id: 'src', label: 'interval(1000)', x: 10, y: 30, shape: 'box', w: 22 },
        { id: 'man', label: 'manual subscribe', x: 55, y: 8, shape: 'box', w: 26 },
        { id: 'tud', label: 'takeUntilDestroyed', x: 55, y: 30, shape: 'box', w: 26 },
        { id: 'asy', label: '| async', x: 55, y: 52, shape: 'box', w: 26 },
        { id: 'cmp', label: 'component', x: 92, y: 30, shape: 'box', w: 16 }
      ];
      function frame(narr, hl) {
        frames.push({ narr: narr, parts: [
          { type: 'graph', label: 'Subscriptions from the page', directed: true, height: 60, nodes: nodes, edges: [['src', 'man'], ['src', 'tud'], ['src', 'asy'], ['man', 'cmp'], ['tud', 'cmp'], ['asy', 'cmp']], hl: hl || {} },
          { type: 'bars', label: 'Live subscriptions (callbacks firing every second)', values: [manual, until, asyncP], idxLabels: ['manual', 'takeUntilDestroyed', 'async pipe'], hl: manual > 1 ? { 0: 'bad' } : {} },
          { type: 'vars', label: 'Page', vals: { step: step, pageOpen: isOpen, zombieCallbacks: manual - (isOpen ? 1 : 0) } }
        ] });
      }
      frame('Three versions of the same page each subscribe to <code>interval(1000)</code>: a <b>manual</b> subscribe, one with <code>takeUntilDestroyed()</code>, and one using the <code>async</code> pipe. Let us navigate.');
      acts.forEach(function (a) {
        step++;
        if (a === 'open') {
          if (isOpen) { frame('Step ' + step + ': page is already open, nothing changes.'); return; }
          isOpen = true; manual++; until++; asyncP++;
          frame('Step ' + step + ': <b>open</b>. Each version subscribes once. Manual now has <b>' + manual + '</b> live subscription(s)' + (manual > 1 ? ', but only one page is on screen: the extra ' + (manual - 1) + ' are <span class="c-r">zombies</span> from earlier visits.' : '.'), { src: 'cur', man: manual > 1 ? 'bad' : 'ok', tud: 'ok', asy: 'ok', cmp: 'ok' });
        } else {
          if (!isOpen) { frame('Step ' + step + ': page is already closed, nothing changes.'); return; }
          isOpen = false; until--; asyncP--;
          frame('Step ' + step + ': <b>close</b>. Angular destroys the component. <code>DestroyRef</code> fires, so <code>takeUntilDestroyed</code> completes its stream; the async pipe\'s <code>ngOnDestroy</code> unsubscribes. The manual subscription <span class="c-r">keeps running</span> and holds the dead component in memory.', { man: 'bad', tud: 'done', asy: 'done', cmp: 'done' });
        }
      });
      frames.push({ narr: '<b>Result after ' + step + ' steps:</b> manual = <b>' + manual + '</b> live subscription(s), takeUntilDestroyed = ' + until + ', async pipe = ' + asyncP + '. Every visit to the leaky page adds one more forever. Streams that complete on their own (an <code>HttpClient</code> call, <code>take(1)</code>) do not pile up like this, but infinite ones always do.', parts: [
        { type: 'bars', label: 'Live subscriptions', values: [manual, until, asyncP], idxLabels: ['manual', 'takeUntilDestroyed', 'async pipe'], hl: { 0: manual > 1 ? 'bad' : 'cur', 1: 'ok', 2: 'ok' } },
        { type: 'text', html: 'Fix: <code>| async</code> for display, <code>takeUntilDestroyed()</code> for side effects, <code>toSignal()</code> in signal components.' }
      ] });
      return frames;
    }
  },
  examples: [
    {
      title: 'Which streams actually need cleanup?',
      html: `${H.table(['Stream', 'Completes by itself?', 'Leak risk if not unsubscribed'], [
        ['<code>http.get()</code>', 'Yes, after the response', 'Low (but the callback may run after destroy, and the request is not cancelled)'],
        ['<code>of()</code>, <code>from([..])</code>, <code>take(1)</code>', 'Yes', 'None'],
        ['<code>interval</code>, <code>timer(0, 1000)</code>, <code>fromEvent</code>', '<span class="c-r">Never</span>', 'High'],
        ['<code>router.events</code>, <code>route.paramMap</code>', 'Router-owned streams live with the router; paramMap completes with the route\'s component', 'High for router.events'],
        ['<code>form.valueChanges</code>', 'Never (lives with the form)', 'Medium (form usually dies with the component, but callbacks touching services can leak)'],
        ['Service <code>BehaviorSubject</code> / store select', 'Never (root service lives forever)', '<span class="c-r">High</span>']
      ])}
      <p>Rule of thumb used by most teams: <b>always</b> make teardown explicit (async pipe, <code>takeUntilDestroyed</code> or <code>toSignal</code>), so nobody has to reason about each case.</p>`
    },
    {
      title: 'takeUntilDestroyed must come last',
      html: `<p><code>a$.pipe(takeUntilDestroyed(), switchMap(() =&gt; b$))</code> completes the <b>outer</b> stream on destroy, but <code>switchMap</code> keeps the active inner <code>b$</code> subscription alive (a flattening operator only completes when outer <b>and</b> inner are done). Put it last: <code>a$.pipe(switchMap(() =&gt; b$), takeUntilDestroyed())</code>. The same rule applied to <code>takeUntil(destroy$)</code>, and the ESLint rule <code>rxjs/no-unsafe-takeuntil</code> checks it.</p>`,
      code: { lang: 'js', run: true, code: RX + `
const destroy$ = new Subject();
const outer$ = new Subject();
const inner$ = () => interval(30);
let wrongCount = 0, rightCount = 0;
const wrongSub = outer$.pipe(takeUntil(destroy$), switchMap(inner$)).subscribe(() => wrongCount++);   // WRONG order
outer$.pipe(switchMap(inner$), takeUntil(destroy$)).subscribe(() => rightCount++);   // RIGHT order
outer$.next('go');
setTimeout(() => { destroy$.next(); console.log('destroyed at', wrongCount, '/', rightCount); }, 100);
setTimeout(() => {
  console.log('200ms later: wrong order still ticking ->', wrongCount, '| right order stopped ->', rightCount);
  wrongSub.unsubscribe();   // clean up the leak so this demo can exit
}, 300);` }
    },
    {
      title: 'One async pipe, not three',
      html: `<p>Bad: <code>{{ (order$ | async)?.id }} {{ (order$ | async)?.status }} {{ (order$ | async)?.total }}</code> creates 3 subscriptions → 3 HTTP calls for a cold <code>order$</code>. Good:</p>
        <pre>@if (order$ | async; as order) {
  {{ order.id }} {{ order.status }} {{ order.total }}
} @else {
  Loading...
}</pre>
        <p>Even better in modern code: <code>order = toSignal(order$)</code> and read <code>order()?.id</code>.</p>`
    }
  ],
  deepDive: `<p>🟣 <b>How takeUntilDestroyed works.</b> It is roughly <code>takeUntil(new Observable(sub =&gt; destroyRef.onDestroy(() =&gt; sub.next())))</code>. <code>DestroyRef</code> is an injectable token: a component's <code>DestroyRef</code> fires when the view is destroyed; an environment injector's fires when that injector is destroyed (for a root service: when the app is destroyed). The no-argument form calls <code>inject(DestroyRef)</code>, which is why it needs an injection context (error NG0203 otherwise). If the <code>DestroyRef</code> is already destroyed, newer Angular versions complete immediately instead of throwing.</p>
    <p>🟣 <b>What the async pipe does on each emission.</b> It stores the latest value, calls <code>ChangeDetectorRef.markForCheck()</code> to mark the view and ancestors dirty (required for <code>OnPush</code>), and on the next change detection the pipe's <code>transform</code> returns the stored value. When the input reference changes (a new Observable object), it unsubscribes the old one and subscribes the new one. That is why <code>{{ getUser() | async }}</code>, where <code>getUser()</code> returns a new Observable each call, causes an endless resubscribe/request loop. Keep streams in fields.</p>
    <p>🟣 <b>Zoneless.</b> Angular's zoneless change detection (<code>provideZonelessChangeDetection()</code>, stable in recent versions) schedules rendering from signal changes, <code>markForCheck</code> (async pipe), events and input changes. Raw <code>subscribe</code> callbacks that mutate a plain field do <b>not</b> schedule a render without Zone.js, another reason to prefer the async pipe or signals.</p>
    <p>🟣 <b>Finding leaks:</b> Chrome DevTools → Memory → heap snapshot after navigating away, search for the component class name ("Detached" DOM nodes and retained component instances), compare snapshots after N visits. The callback's closure over <code>this</code> is what retains the component.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI-generated Angular code is the single biggest source of new <code>subscribe()</code>-without-teardown in code reviews, because many training examples omit it. A cheap guard: enable lint rules (<code>rxjs-x/no-ignored-subscription</code>, <code>@angular-eslint</code> rules) and ask the assistant to "convert every manual subscribe in this file to toSignal, the async pipe or takeUntilDestroyed". It does that migration well.</p>
    <p>AI coding agents can also run the leak check for you: navigate a route 20 times in a Playwright script, take heap snapshots, and diff retained component instances. Use that as a regression test for pages with WebSockets or polling.</p>`,
  problems: [{
    title: 'Fix a polling component that leaks',
    level: 'Easy', tags: ['angular', 'takeUntilDestroyed', 'leak', 'polling'], companies: ['Microsoft', 'Deloitte', 'Infosys'],
    lang: 'ts',
    statement: `<p>A dashboard component polls <code>/api/stats</code> every 10 seconds. After users navigate away and back a few times, the network tab shows several polls every 10 seconds. Rewrite it so polling stops when the component is destroyed, a slow response never overlaps the next poll, and failed polls do not stop polling.</p>`,
    constraints: `Angular 17+, standalone component, RxJS 7. No ngOnDestroy boilerplate.`,
    example: `<p>Visit dashboard → leave → visit again: exactly <span class="c-g">one</span> poll every 10 s, not two.</p>`,
    brute: {
      why: `<p>The subscription to <code>interval</code> is never torn down, so each visit adds a poller. <code>mergeMap</code> also lets slow responses overlap, and one HTTP error kills polling.</p>`,
      code: { lang: 'ts', code: `import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, mergeMap } from 'rxjs';

@Component({ selector: 'app-stats', standalone: true, template: '{{ stats?.users }}' })
export class StatsComponent implements OnInit {
  private http = inject(HttpClient);
  stats: { users: number } | null = null;

  ngOnInit(): void {
    interval(10000)
      .pipe(mergeMap(() => this.http.get<{ users: number }>('/api/stats')))
      .subscribe((s) => (this.stats = s));      // never unsubscribed, errors kill it
  }
}` }
    },
    mcq: { q: 'You call takeUntilDestroyed() with no argument inside ngOnInit. What happens?', options: ['It works the same as in the constructor', 'It throws NG0203: not in an injection context', 'It silently never completes'], answer: 1, explain: 'With no argument it calls inject(DestroyRef), which only works in an injection context (constructor, field initializer, factory). In ngOnInit, inject DestroyRef as a field and pass it.' },
    hints: [
      `<p>Hint 1: the cleanest fix needs no lifecycle hooks: build the stream in a field initializer.</p>`,
      `<p>Hint 2: <code>timer(0, 10000)</code> polls immediately then every 10 s; <code>exhaustMap</code> skips a tick while a request is still running.</p>`,
      `<p>Hint 3: add <code>catchError(() =&gt; EMPTY)</code> inside the inner request, then either <code>toSignal(...)</code> or <code>takeUntilDestroyed()</code> as the last operator.</p>`
    ],
    solution: {
      approach: `<p>Make the poll a declarative stream and let Angular own the subscription: <code>toSignal</code> subscribes in the injection context and unsubscribes when the component is destroyed. <code>exhaustMap</code> prevents overlapping requests and the inner <code>catchError</code> keeps polling alive after a failure.</p>`,
      code: { lang: 'ts', code: `import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, exhaustMap, timer } from 'rxjs';

interface Stats { users: number; }

@Component({
  selector: 'app-stats',
  standalone: true,
  template: \`
    @if (stats(); as s) { <p>Users online: {{ s.users }}</p> } @else { <p>Loading...</p> }
  \`,
})
export class StatsComponent {
  private http = inject(HttpClient);

  // Field initializer = injection context. toSignal unsubscribes on destroy.
  readonly stats = toSignal(
    timer(0, 10000).pipe(
      exhaustMap(() =>
        this.http.get<Stats>('/api/stats').pipe(
          catchError(() => EMPTY)     // skip this tick, keep polling
        )
      )
    ),
    { initialValue: null as Stats | null }
  );
}` },
      complexity: `<p>One subscription per component instance; at most one request in flight.</p>`,
      followUps: ['How would you pause polling while the browser tab is hidden?', 'How would you share one poller across several components?']
    }
  }]
});
/* =====================================================================
   TOPIC 6: Signals: signal, computed, effect
   ===================================================================== */
topics.push({
  title: 'Angular Signals: signal(), computed(), effect()',
  analogy: `<p>A <b>spreadsheet</b>. Cells A1 and B1 hold numbers (<b>signals</b>). C1 has the formula <code>=A1+B1</code> (<b>computed</b>): you never update C1 yourself, it is always right, and it only recalculates when A1 or B1 actually change and someone looks at it. A chart that redraws whenever C1 changes is an <b>effect</b>: a side effect that reacts to the cells it reads. Nobody "subscribes" to anything; the spreadsheet tracks which cells each formula reads.</p>`,
  explain: `<p>🟢 <b>The big idea:</b> a <b>signal</b> is a value wrapped in a getter function that <b>knows who reads it</b>. When it changes, Angular knows exactly which computed values, effects and templates depend on it, and updates only those. Signals are synchronous and always have a current value (unlike Observables).</p>
    ${H.table(['API', 'What it is', 'Read', 'Write'], [
      ['<code>count = signal(0)</code>', 'writable state', '<code>count()</code>', '<code>count.set(5)</code>, <code>count.update(n =&gt; n + 1)</code>'],
      ['<code>double = computed(() =&gt; count() * 2)</code>', 'derived, read-only, memoized, lazy', '<code>double()</code>', 'none (it derives itself)'],
      ['<code>effect(() =&gt; console.log(count()))</code>', 'side effect re-run when what it read changes', '-', '(should rarely write signals)'],
      ['<code>count.asReadonly()</code>', 'read-only view to expose from a service', '<code>()</code>', 'no']
    ])}
    <p>🔵 <b>Automatic dependency tracking.</b> While a <code>computed</code> or <code>effect</code> function runs, every signal it <i>calls</i> is recorded as a dependency. Dependencies are re-collected on every run, so <code>computed(() =&gt; showName() ? name() : 'anon')</code> only depends on <code>name</code> while <code>showName</code> is true.</p>
    <p>🔵 <b>Rules worth memorizing:</b></p>
    <ul>
      <li><b>Equality:</b> <code>set</code> with an equal value (<code>Object.is</code> by default) does nothing. So mutate immutably: <code>items.update(list =&gt; [...list, x])</code>, never <code>items().push(x)</code> (same array reference → no change detected).</li>
      <li><b>computed is lazy and memoized:</b> computed only when read, recomputed only when a dependency changed, and if its new value equals the old one, its dependents are not considered changed (the "cutoff").</li>
      <li><b>effect runs at least once, asynchronously</b>, during Angular's change-detection flush, never synchronously inside <code>set()</code>. Several <code>set</code> calls in a row produce one effect run with the final values (glitch-free).</li>
      <li><b>Effects are for syncing to the outside world</b>: localStorage, logging, analytics, a canvas or chart library. To derive state, use <code>computed</code> (or <code>linkedSignal</code>), not an effect that sets another signal.</li>
      <li><code>effect</code> needs an injection context (or an <code>injector</code> option) and is destroyed with its component; it can register cleanup with <code>onCleanup</code>. <code>untracked(() =&gt; ...)</code> reads without creating a dependency.</li>
    </ul>
    <p>🔵 <b>In templates</b> you just call them: <code>{{ count() }}</code>. The template becomes a consumer, and with <code>OnPush</code> or zoneless change detection only views that read a changed signal are refreshed. Related newer APIs: <code>input()</code>, <code>model()</code>, <code>output()</code>, <code>viewChild()</code> (signal-based component APIs), <code>linkedSignal()</code> and <code>resource()</code>/<code>httpResource()</code>.</p>`,
  clues: [
    '"Derived value, e.g. total from items" → <code>computed()</code>, not an effect and not a stored field',
    '"Sync state to localStorage / log / call a third-party chart" → <code>effect()</code>',
    '"I pushed into the array but the UI did not update" → mutation keeps the same reference; use <code>update(arr =&gt; [...arr, x])</code>',
    '"Replace BehaviorSubject in a service" → private <code>signal</code> + <code>asReadonly()</code> + <code>computed</code> selectors',
    '"Fine-grained reactivity" / "zoneless" / "OnPush without markForCheck" → signals',
    '"ExpressionChanged / infinite loop when an effect sets a signal" → use <code>computed</code> or <code>linkedSignal</code> instead'
  ],
  code: [{
    lang: 'js', run: true, title: 'A working mini signals runtime: computed cutoff and batched effects (runnable)',
    code: SIG + `
const first = signal('Ana');
const last = signal('Lee');
const count = signal(1);
const fullName = computed(() => first() + ' ' + last());
const isEven = computed(() => count() % 2 === 0);

effect(() => console.log('effect ->', fullName(), '| even?', isEven()));

(async () => {
  await nextTick();                                  // effects run asynchronously, once at start
  first.set('Bo'); last.set('Kim');                  // two writes...
  await nextTick();                                  // ...one effect run with both values (batched)
  count.set(2);                                      // isEven false -> true: effect runs
  await nextTick();
  count.set(4);                                      // isEven recomputes to true again: SAME value
  await nextTick();                                  // -> effect is skipped (cutoff)
  first.set('Bo');                                   // equal value: nothing is even marked dirty
  await nextTick();
  console.log('fullName computed', fullName.runs(), 'times, isEven computed', isEven.runs(), 'times');
})();`
  }, {
    lang: 'ts', title: 'A signal-based component and store (Angular 17+)',
    code: `import { Component, Injectable, computed, effect, inject, signal } from '@angular/core';

export interface Task { id: number; title: string; done: boolean; }
type Filter = 'all' | 'open' | 'done';

@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly _tasks = signal<Task[]>([]);
  readonly tasks = this._tasks.asReadonly();
  readonly filter = signal<Filter>('all');

  readonly visible = computed(() => {
    const f = this.filter();
    return this._tasks().filter((t) => f === 'all' || (f === 'done' ? t.done : !t.done));
  });
  readonly remaining = computed(() => this._tasks().filter((t) => !t.done).length);

  add(title: string): void {
    this._tasks.update((list) => [...list, { id: Date.now(), title, done: false }]); // new array
  }
  toggle(id: number): void {
    this._tasks.update((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }
}

@Component({
  selector: 'app-tasks',
  standalone: true,
  template: \`
    <p>{{ store.remaining() }} left</p>
    @for (t of store.visible(); track t.id) {
      <label><input type="checkbox" [checked]="t.done" (change)="store.toggle(t.id)" /> {{ t.title }}</label>
    }
  \`,
})
export class TasksComponent {
  protected store = inject(TaskStore);

  constructor() {
    // Side effect: persist. Runs once now, then whenever tasks() changes.
    effect(() => localStorage.setItem('tasks', JSON.stringify(this.store.tasks())));
  }
}`
  }],
  viz: {
    title: 'Signal graph: push "dirty", pull values, skip when unchanged',
    input: 'first=Bo; count=2; count=4; last=Lee; first=Bo',
    inputLabel: 'Writes separated by ";" to signals first, last or count (count must be a number; up to 10 writes)',
    gen: function (input) {
      var ops = String(input).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      if (ops.length < 2) throw new Error('Give at least 2 writes, e.g. count=2; count=4');
      if (ops.length > 10) throw new Error('Use at most 10 writes');
      var S = { first: 'Ana', last: 'Lee', count: 1 };
      var fullName = 'Ana Lee', isEven = false, runs = { fullName: 1, isEven: 1, effect: 1 };
      var nodes = [
        { id: 'first', label: 'first', x: 10, y: 10, shape: 'box', w: 16 },
        { id: 'last', label: 'last', x: 10, y: 32, shape: 'box', w: 16 },
        { id: 'count', label: 'count', x: 10, y: 54, shape: 'box', w: 16 },
        { id: 'fullName', label: 'fullName (computed)', x: 47, y: 20, shape: 'box', w: 28 },
        { id: 'isEven', label: 'isEven (computed)', x: 47, y: 50, shape: 'box', w: 28 },
        { id: 'effect', label: 'effect / template', x: 88, y: 35, shape: 'box', w: 22 }
      ];
      var edges = [['first', 'fullName'], ['last', 'fullName'], ['count', 'isEven'], ['fullName', 'effect'], ['isEven', 'effect']];
      var frames = [];
      function frame(narr, hl, ehl) {
        frames.push({ narr: narr, parts: [
          { type: 'graph', label: 'Dependency graph (built automatically by reading signals)', directed: true, height: 64, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} },
          { type: 'vars', label: 'Values', vals: { first: S.first, last: S.last, count: S.count, fullName: fullName, isEven: isEven } },
          { type: 'vars', label: 'How many times each ran', vals: runs }
        ] });
      }
      frame('Signals <code>first</code>, <code>last</code>, <code>count</code> feed two computeds and one effect (think: a template). Initial run: effect read <b>' + fullName + '</b> and <b>' + isEven + '</b>, so Angular recorded those dependencies.', { effect: 'ok' });
      ops.forEach(function (o) {
        var m = /^(first|last|count)\s*=\s*(.+)$/.exec(o);
        if (!m) throw new Error('Writes look like first=Bo, last=Lee or count=3');
        var k = m[1], raw = m[2].trim(), v = k === 'count' ? Number(raw) : raw;
        if (k === 'count' && !isFinite(v)) throw new Error('count must be a number');
        if (S[k] === v) { frame('<code>' + k + '.set(' + JSON.stringify(v) + ')</code>: same value as now (<code>Object.is</code>). The signal does <b>nothing</b>: no dirty flags, no recompute, no effect.', (function () { var h = {}; h[k] = 'done'; return h; })()); return; }
        S[k] = v;
        var comp = k === 'count' ? 'isEven' : 'fullName';
        var h1 = {}; h1[k] = 'cur'; h1[comp] = 'win'; h1.effect = 'win';
        var e1 = {}; e1[k + '-' + comp] = 'cur'; e1[comp + '-effect'] = 'cur';
        frame('<code>' + k + '.set(' + JSON.stringify(v) + ')</code>. Step 1 <b>push</b>: the signal marks <b>' + comp + '</b> and then the effect as <i>maybe dirty</i>. Nothing is recomputed yet: that is cheap and lazy. The effect is scheduled for the next flush.', h1, e1);
        var nv = comp === 'fullName' ? S.first + ' ' + S.last : S.count % 2 === 0;
        var old = comp === 'fullName' ? fullName : isEven;
        runs[comp]++;
        if (comp === 'fullName') fullName = nv; else isEven = nv;
        if (old === nv) {
          var h2 = {}; h2[comp] = 'sel'; h2.effect = 'done';
          frame('Step 2 <b>pull</b> (at flush): before re-running, the effect asks its dependencies "did you really change?". <b>' + comp + '</b> recomputes to <b>' + nv + '</b>, equal to before, so its version does not change. The effect is <b>skipped</b>: the cutoff saved a re-render.', h2);
        } else {
          runs.effect++;
          var h3 = {}; h3[comp] = 'ok'; h3.effect = 'ok';
          frame('Step 2 <b>pull</b> (at flush): <b>' + comp + '</b> recomputes from ' + JSON.stringify(old) + ' to <b>' + JSON.stringify(nv) + '</b>, a real change, so the effect re-runs and reads fresh values. The other computed was not touched at all.', h3);
        }
      });
      frames.push({ narr: '<b>Summary:</b> ' + ops.length + ' writes caused only <b>' + (runs.effect - 1) + '</b> effect re-run(s). Signals push cheap "dirty" notifications and pull real values lazily; equal values stop propagation. Several writes before a flush would also collapse into a single effect run.', parts: [
        { type: 'vars', label: 'Run counts', vals: runs },
        { type: 'text', html: 'Push (mark dirty) → schedule → pull (recompute only what is read) → compare → re-run only real changes.' }
      ] });
      return frames;
    }
  },
  examples: [
    {
      title: 'The mutation trap',
      html: `<p><code>const items = signal([1, 2]); items().push(3);</code> changes the array, but the signal holds the <b>same reference</b>, so no computed, effect or template is notified. Even <code>items.set(items())</code> is ignored (equal reference). Use <code>items.update(a =&gt; [...a, 3])</code>. If you must use mutable objects, pass a custom <code>equal</code> option, but immutability is simpler.</p>`,
      code: { lang: 'js', run: true, code: SIG + `
const items = signal([1, 2]);
const size = computed(() => items().length);
console.log('size', size());
items().push(3);                       // mutation: signal never knows
items.set(items());                    // same reference: ignored
console.log('after push, size still', size(), '(stale!)');
items.update((a) => [...a, 4]);        // new array: tracked
console.log('after update, size', size());` }
    },
    {
      title: 'computed vs effect for derived state',
      html: `${H.table(['Goal', 'Wrong', 'Right'], [
        ['total = sum of cart lines', '<code>effect(() =&gt; total.set(sum(lines())))</code>', '<code>total = computed(() =&gt; sum(lines()))</code>'],
        ['save cart to localStorage', 'computed with a side effect', '<code>effect(() =&gt; localStorage.setItem(..., JSON.stringify(lines())))</code>'],
        ['reset selected item when list changes, but still let the user pick', 'effect that sets <code>selected</code>', '<code>selected = linkedSignal(() =&gt; list()[0])</code> (writable, resets on source change)']
      ])}
      <p>The wrong versions work at first but create extra change-detection cycles, ordering bugs and, in older versions, an error about writing signals inside effects.</p>`
    },
    {
      title: 'untracked: read without depending',
      html: `<p><code>effect(() =&gt; { analytics.track('page', { page: page(), user: untracked(() =&gt; user().id) }); })</code> re-runs when <code>page</code> changes, but <b>not</b> when the user object changes. Without <code>untracked</code>, a profile update would log a fake page view.</p>`
    },
    {
      title: 'Signals in a template replace the async pipe',
      html: `<p>Before: <code>count$ = new BehaviorSubject(0)</code>, template <code>{{ count$ | async }}</code>, update with <code>count$.next(count$.value + 1)</code>. After: <code>count = signal(0)</code>, template <code>{{ count() }}</code>, update with <code>count.update(n =&gt; n + 1)</code>. No subscription, no <code>null</code> before the first value, works with OnPush and zoneless automatically.</p>`
    }
  ],
  deepDive: `<p>🟣 <b>The algorithm (push-pull, glitch-free).</b> Angular's reactive core (shared with the TC39 Signals proposal ideas) keeps a graph of <b>producer</b> and <b>consumer</b> nodes. Each producer has a <b>version</b> number. On <code>set</code>: bump version and walk consumers marking them dirty (push, no computation). When a consumer is read or flushed: for each dependency, recompute it if dirty and compare its version with the one recorded at the last run (pull). Recompute only if something actually changed. This order guarantees no <b>glitches</b>: you never observe <code>fullName</code> built from the new <code>first</code> and the old <code>last</code>. The runnable mini runtime above implements exactly this with ~60 lines.</p>
    <p>🟣 <b>Effect timing.</b> Since Angular 19, effects created in components run as part of change detection (before the component's view is refreshed) and "root" effects run as a separate microtask-like flush. Both are asynchronous relative to <code>set()</code>, and multiple writes coalesce. Effects have <code>onCleanup</code> for cancelling timers or requests before the next run. <code>effect</code> became stable in Angular 20; <code>signal</code> and <code>computed</code> were stable from Angular 17.</p>
    <p>🟣 <b>Errors and equality.</b> If a <code>computed</code> throws, the error is cached and rethrown on read until a dependency changes. A custom <code>equal</code> function lets you treat structurally equal objects as unchanged. Signals are synchronous: reading inside a computed must be cheap and side-effect free; never call <code>set</code> inside <code>computed</code> (Angular throws).</p>
    <p>🟣 <b>Why fine-grained reactivity matters:</b> with Zone.js, any async event triggers change detection over the whole tree (or OnPush branches). With signals, Angular knows which views read a changed signal and can refresh only them (and with zoneless change detection, drop Zone.js entirely, giving smaller bundles and clearer stack traces).</p>
    <p>🟣 <b>Signals vs RxJS:</b> signals model <b>state</b> (a value now); RxJS models <b>events over time</b> (with time operators, cancellation, back-pressure-like strategies). They complement each other; the next topic connects them.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> models trained mostly on pre-2023 Angular still default to <code>@Input()</code>, <code>BehaviorSubject</code> stores and <code>ngOnChanges</code>. Ask explicitly for "Angular 17+ standalone components, signal inputs, <code>computed</code>, the new control flow (<code>@if</code>, <code>@for</code>)". Then check the classic AI mistakes: effects used for derived state, array mutation instead of <code>update</code>, and effects created outside an injection context.</p>
    <p>The Angular team publishes official LLM guidance (an <code>llms.txt</code> and best-practice rules) to steer assistants toward signals; feeding it to your coding agent noticeably improves output. Signals also fit AI UIs well: a streaming answer is an Observable converted with <code>toSignal</code>, and derived pieces (token count, "is generating") are <code>computed</code>.</p>`,
  problems: [{
    title: 'Shopping cart with signals: derived totals, no effect misuse',
    level: 'Medium', tags: ['signals', 'computed', 'effect', 'immutability'], companies: ['Google', 'SAP', 'Zalando'],
    statement: `<p>Build a cart with <code>lines = signal([])</code> of <code>{ id, price, qty }</code>. Provide <code>add(id, price)</code> (increments qty if present), <code>remove(id)</code>, derived <code>count</code> (total quantity) and <code>total</code> (sum of price × qty, with a 10% discount when total ≥ 100), and an effect that logs <code>"saved: N items"</code> whenever the cart changes. Adding and removing in one go must log once.</p>`,
    constraints: `Immutable updates only. Derived values must be computed, not stored.`,
    example: `<p>add(a, 30) ×2, add(b, 50) → count <b>3</b>, total 110 → discount → <b>99</b>. Log once per batch.</p>`,
    brute: {
      why: `<p>Storing <code>count</code> and <code>total</code> as separate signals updated by an effect means extra effect runs, a moment where total is stale, and mutation via <code>push</code> that the signal never notices.</p>`,
      code: { lang: 'js', run: true, code: SIG + `
const lines = signal([]);
const total = signal(0);
effect(() => total.set(lines().reduce((t, l) => t + l.price * l.qty, 0)));   // derived state in an effect
function add(id, price) { lines().push({ id, price, qty: 1 }); }               // mutation: not detected
(async () => {
  await nextTick();
  add('a', 30); add('a', 30); add('b', 50);
  await nextTick();
  console.log('lines', lines().length, 'but total =', total(), '(stale: effect never re-ran)');
})();` }
    },
    mcq: { q: 'Where should "total with discount" live?', options: ['A signal updated from an effect', 'A computed() reading lines()', 'A plain class field updated in add() and remove()'], answer: 1, explain: 'computed is memoized, always consistent with lines, and recalculates only when lines changes. The other options duplicate state that can drift.' },
    hints: [
      `<p>Hint 1: the only real state is <code>lines</code>. Everything else is a formula over it.</p>`,
      `<p>Hint 2: <code>update(ls =&gt; ...)</code> must return a <b>new</b> array: <code>map</code> to bump qty, spread to append, <code>filter</code> to remove.</p>`,
      `<p>Hint 3: <code>count = computed(sum qty)</code>, <code>subtotal = computed(...)</code>, <code>total = computed(() =&gt; subtotal() &gt;= 100 ? subtotal() * 0.9 : subtotal())</code>, effect logs <code>count()</code>.</p>`
    ],
    solution: {
      approach: `<p>One writable signal holds the lines; <code>computed</code> derives count, subtotal and total. The effect only does I/O (logging/persisting). Because effects run asynchronously after writes, several synchronous <code>add</code>/<code>remove</code> calls collapse into one log.</p>`,
      code: { lang: 'js', run: true, code: SIG + `
const lines = signal([]);
const count = computed(() => lines().reduce((n, l) => n + l.qty, 0));
const subtotal = computed(() => lines().reduce((t, l) => t + l.price * l.qty, 0));
const total = computed(() => (subtotal() >= 100 ? Math.round(subtotal() * 0.9 * 100) / 100 : subtotal()));

function add(id, price) {
  lines.update((ls) => ls.some((l) => l.id === id)
    ? ls.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l))
    : [...ls, { id, price, qty: 1 }]);
}
function remove(id) { lines.update((ls) => ls.filter((l) => l.id !== id)); }

effect(() => console.log('saved:', count(), 'items'));   // I/O only

(async () => {
  await nextTick();
  add('a', 30); add('a', 30); add('b', 50);              // one batch -> one log
  await nextTick();
  console.log('count', count(), '| subtotal', subtotal(), '| total', total());
  remove('b');
  await nextTick();
  console.log('count', count(), '| total', total(), '(no discount below 100)');
})();` },
      complexity: `<p>Each computed is O(lines) and recomputes only after <code>lines</code> changes and only when read.</p>`,
      followUps: ['How would you persist to localStorage and restore on startup?', 'How would this look with NgRx SignalStore (withState, withComputed, withMethods)?']
    }
  }]
});
/* =====================================================================
   TOPIC 7: Interop: toSignal / toObservable, choosing between them
   ===================================================================== */
topics.push({
  title: 'Bridging Worlds: toSignal, toObservable and When to Use Which',
  analogy: `<p>RxJS is a <b>river</b> (things flowing past over time); a signal is a <b>water tank with a level gauge</b> (there is always a current level you can read). <code>toSignal</code> is a <b>pipe from the river into the tank</b>: the tank always shows the latest water that arrived. <code>toObservable</code> is a <b>tap on the tank</b> that sends out the level whenever it settles at a new value. Rivers are great for timing and routing; tanks are great for "what is it right now?".</p>`,
  explain: `<p>🟢 <b>The big idea:</b> use <b>RxJS for events and async workflows over time</b> (debounce, cancellation, retries, WebSockets, combining streams) and <b>signals for state that templates read</b>. The functions in <code>@angular/core/rxjs-interop</code> connect them.</p>
    <p>🔵 <b><code>toSignal(obs$, options?)</code></b></p>
    <ul>
      <li><b>Subscribes immediately</b> (not lazily!) and keeps the latest value in a signal. Unsubscribes automatically when the component/injector is destroyed. Needs an injection context (or an <code>injector</code> option).</li>
      <li>Before the first emission the value is <code>undefined</code> (type <code>T | undefined</code>). Give <code>{ initialValue: x }</code> to avoid that, or <code>{ requireSync: true }</code> when the Observable emits synchronously on subscribe (e.g. a <code>BehaviorSubject</code>); then the type is just <code>T</code>.</li>
      <li>If the Observable errors, <b>reading</b> the signal throws that error. Catch errors in the pipe if the template should keep working.</li>
      <li>Call it <b>once</b> (field initializer), never inside a getter or template method: each call creates a new subscription.</li>
    </ul>
    <p>🔵 <b><code>toObservable(sig)</code></b></p>
    <ul>
      <li>Creates an Observable that tracks the signal with an <b>effect</b>. Values are emitted <b>asynchronously</b> when effects flush, and only the <b>latest</b> value of several synchronous <code>set</code>s is emitted (intermediate values are skipped; equal values are skipped).</li>
      <li>Emits the current value on the first flush. Needs an injection context.</li>
      <li>Typical use: <code>toObservable(this.query).pipe(debounceTime(300), switchMap(q =&gt; api.search(q)))</code>: keep state in a signal, but use RxJS for the time-based async part.</li>
    </ul>
    ${H.table(['Need', 'Pick'], [
      ['Value the template displays, derived values', 'signal / computed'],
      ['Debounce, throttle, retry, cancel stale requests', 'RxJS (then <code>toSignal</code> for display)'],
      ['WebSocket / SSE / interval / router events', 'RxJS stream, <code>toSignal</code> at the edge'],
      ['Simple GET that depends on a signal', '<code>resource()</code> / <code>httpResource()</code> (newer APIs) or <code>toObservable</code> + <code>switchMap</code> + <code>toSignal</code>'],
      ['React to every event, even identical repeats', 'RxJS / Subject (signals drop equal values)']
    ])}`,
  clues: [
    '"Use an Observable in a signal-based component" → <code>toSignal</code> with <code>initialValue</code>',
    '"Debounce a signal" / "search driven by a signal input" → <code>toObservable</code> → RxJS operators → <code>toSignal</code>',
    '"Signals vs RxJS, which should I use?" → state vs events-over-time; they interoperate',
    '"toSignal type includes undefined" → <code>initialValue</code> or <code>requireSync</code>',
    '"My toObservable missed some values" → only the latest value per flush is emitted (by design)',
    '"Template throws after the HTTP call failed" → <code>toSignal</code> rethrows errors on read; add <code>catchError</code>'
  ],
  code: [{
    lang: 'ts', title: 'Signal input → RxJS pipeline → signal for the template',
    code: `import { Component, inject, input, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';

interface Hit { id: number; title: string; }
type SearchState = { status: 'idle' | 'loading' | 'done' | 'error'; hits: Hit[] };

@Component({
  selector: 'app-search',
  standalone: true,
  template: \`
    <input [value]="query()" (input)="query.set($any($event.target).value)" />
    @switch (state().status) {
      @case ('loading') { <p>Searching...</p> }
      @case ('error') { <p>Something went wrong</p> }
      @default { @for (h of state().hits; track h.id) { <li>{{ h.title }}</li> } }
    }
    <small>{{ count() }} results in {{ category() }}</small>
  \`,
})
export class SearchComponent {
  private http = inject(HttpClient);
  readonly category = input('all');                  // signal input from the parent
  readonly query = signal('');                       // local state as a signal

  // signal -> Observable (async, latest value per flush) -> RxJS for time + cancellation
  private readonly state$ = toObservable(this.query).pipe(
    debounceTime(300),
    map((q) => q.trim()),
    distinctUntilChanged(),
    switchMap((q) =>
      q.length < 2
        ? of<SearchState>({ status: 'idle', hits: [] })
        : this.http.get<Hit[]>('/api/search', { params: { q, cat: this.category() } }).pipe(
            map((hits): SearchState => ({ status: 'done', hits })),
            startWith<SearchState>({ status: 'loading', hits: [] }),
            catchError(() => of<SearchState>({ status: 'error', hits: [] }))
          )
    )
  );

  // Observable -> signal (subscribes now, unsubscribes on destroy)
  readonly state = toSignal(this.state$, { initialValue: { status: 'idle', hits: [] } as SearchState });
  readonly count = computed(() => this.state().hits.length);
}`
  }, {
    lang: 'js', run: true, title: 'toSignal and toObservable semantics, simulated (runnable)',
    code: SIG + RX.replace(/^\/\/ ---- tiny RxJS[^\n]*\n/, '') + `
// toSignal: subscribe now, hold the latest value in a signal
function toSignal(obs$, { initialValue } = {}) {
  const s = signal(initialValue);
  const sub = obs$.subscribe({ next: (v) => s.set(v), error: (e) => console.log('toSignal would rethrow on read:', e.message) });
  const read = () => s(); read.destroy = () => sub.unsubscribe();
  return read;
}
// toObservable: an effect that pushes the latest value (asynchronously, deduped)
function toObservable(sig) {
  return new Observable((subscriber) => {
    const ref = effect(() => { const v = sig(); untracked(() => subscriber.next(v)); });
    return () => ref.destroy();
  });
}

const query = signal('a');
const seen = [];
const sub = toObservable(query).subscribe((v) => seen.push(v));
query.set('an'); query.set('ang'); query.set('angu');     // sync burst: only the latest survives
setTimeout(() => {
  query.set('angu');                                       // equal value: no emission
  query.set('angular');
  setTimeout(() => {
    console.log('toObservable emitted:', JSON.stringify(seen), '(intermediate values skipped)');
    sub.unsubscribe();

    const ticks$ = interval(20).pipe(take(3));
    const t = toSignal(ticks$, { initialValue: -1 });
    console.log('toSignal right away:', t(), '(initialValue)');
    setTimeout(() => console.log('toSignal later:', t(), '(latest emission)'), 100);
  }, 10);
}, 10);`
  }],
  viz: {
    title: 'toObservable: only the settled value per flush is emitted',
    input: 'set a; set an; set ang; flush; set ang; flush; set angu; set angular; flush',
    inputLabel: 'Commands separated by ";": set VALUE or flush (an effect/change-detection run); up to 14',
    gen: function (input) {
      var cmds = String(input).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      if (cmds.length < 2) throw new Error('Give at least 2 commands, e.g. set a; flush');
      if (cmds.length > 14) throw new Error('Use at most 14 commands');
      var value = '(initial)', lastEmitted = null, emitted = [], skipped = [], pending = [], frames = [], dirty = true;
      function frame(narr, hlCls) {
        frames.push({ narr: narr, parts: [
          { type: 'queue', label: 'Writes since the last flush (only the last one matters)', items: pending.length ? pending.slice() : ['(none)'], hl: pending.length ? (function () { var h = {}; h[pending.length - 1] = 'cur'; return h; })() : {}, frontLabel: 'older', backLabel: 'latest' },
          { type: 'vars', label: 'Signal and stream', vals: { 'query()': value, scheduledEffect: dirty, lastEmitted: lastEmitted === null ? '-' : lastEmitted }, hl: hlCls ? { lastEmitted: hlCls } : {} },
          { type: 'array', label: 'Values the Observable emitted', values: emitted.length ? emitted.slice() : ['-'], hl: emitted.length && hlCls === 'ok' ? (function () { var h = {}; h[emitted.length - 1] = 'ok'; return h; })() : {} }
        ] });
      }
      frame('<code>query$ = toObservable(query)</code> creates an <b>effect</b> that reads <code>query()</code> and calls <code>subscriber.next</code>. Effects never run synchronously inside <code>set()</code>; they run when Angular flushes (change detection / microtask). The first flush emits the current value.');
      cmds.forEach(function (c) {
        var m = /^set\s+(.+)$/i.exec(c);
        if (m) {
          var v = m[1].trim();
          if (v === value) { frame('<code>query.set(' + JSON.stringify(v) + ')</code>: equal to the current value, so the signal ignores it. Nothing is scheduled.'); return; }
          value = v; pending.push(v); dirty = true;
          frame('<code>query.set(' + JSON.stringify(v) + ')</code>: the signal changes and marks the effect dirty. <b>No emission yet</b>. ' + (pending.length > 1 ? 'The earlier pending value(s) will never be emitted.' : ''));
        } else if (/^flush$/i.test(c)) {
          if (!dirty) { frame('Flush: the effect is not dirty, nothing to do.'); return; }
          dirty = false;
          var lost = pending.slice(0, -1);
          skipped = skipped.concat(lost);
          if (value !== lastEmitted) { emitted.push(value); lastEmitted = value; pending = []; frame('<b>Flush</b>: the effect runs once, reads <code>query()</code> = <b>' + value + '</b> and emits it.' + (lost.length ? ' Skipped: ' + lost.join(', ') + '.' : ''), 'ok'); }
          else { pending = []; frame('<b>Flush</b>: value is the same as the last emission, nothing new is emitted.'); }
        } else throw new Error('Unknown command "' + c + '". Use set VALUE or flush');
      });
      frames.push({ narr: '<b>Result:</b> emitted <b>' + (emitted.join(', ') || 'nothing') + '</b>' + (skipped.length ? '; never emitted: ' + skipped.join(', ') : '') + '. This is perfect for state (a search box only needs the latest text) but wrong if every intermediate event matters (use a Subject for events). The reverse bridge, <code>toSignal</code>, just stores each emitted value; a signal always shows the latest one.', parts: [
        { type: 'array', label: 'Emitted', values: emitted.length ? emitted : ['-'] },
        { type: 'set', label: 'Skipped (overwritten before a flush)', items: skipped.length ? skipped : ['(none)'] }
      ] });
      return frames;
    }
  },
  examples: [
    {
      title: 'Router params as a signal',
      html: `<p><code>id = toSignal(inject(ActivatedRoute).paramMap.pipe(map(p =&gt; p.get('id'))))</code> gives a signal you can use in <code>computed</code>. With <code>withComponentInputBinding()</code> in the router config, route params can even arrive as signal inputs: <code>id = input.required&lt;string&gt;()</code>, no RxJS needed.</p>`
    },
    {
      title: 'requireSync with a BehaviorSubject',
      html: `<p>A <code>BehaviorSubject</code> emits synchronously on subscribe, so <code>toSignal(store.user$, { requireSync: true })</code> has type <code>Signal&lt;User&gt;</code> with no <code>undefined</code>. If the Observable does <b>not</b> emit synchronously, Angular throws at creation time, which is a helpful early failure.</p>`
    },
    {
      title: 'Deciding by question',
      html: `${H.table(['Question about the data', 'Answer → tool'], [
        ['"What is it right now?"', 'signal'],
        ['"What happened, in what order, how often?"', 'Observable'],
        ['"Should old async work be cancelled?"', 'Observable (switchMap)'],
        ['"Does it depend on other state?"', 'computed'],
        ['"Must the outside world be updated?"', 'effect (or subscribe in a stream with teardown)']
      ])}`
    }
  ],
  deepDive: `<p>🟣 <b>toSignal internals.</b> It creates a writable signal holding a small state object (value or error), subscribes immediately, and registers <code>DestroyRef.onDestroy(() =&gt; sub.unsubscribe())</code>. The returned signal is a <code>computed</code> that unwraps the state and throws if it holds an error. Options include <code>initialValue</code>, <code>requireSync</code>, <code>injector</code>, <code>manualCleanup</code> (do not tie to DestroyRef) and <code>equal</code>. Because it subscribes eagerly, a cold HTTP Observable fires as soon as the component is created, even if the template never reads the signal.</p>
    <p>🟣 <b>toObservable internals.</b> Roughly: a <code>ReplaySubject(1)</code> plus an <code>effect</code> that reads the signal and calls <code>subject.next(untracked(...))</code>; destroying the injector completes the subject. Hence the asynchronous emission, the coalescing of synchronous writes, and the "latest value" replay for late subscribers.</p>
    <p>🟣 <b>Glitches across the bridge.</b> Signals are glitch-free inside the graph, but <code>combineLatest</code> over two <code>toObservable</code> streams can still emit intermediate combinations (one side updated, the other not yet). If two values must stay consistent, combine them in a <code>computed</code> first and convert that one signal.</p>
    <p>🟣 <b>Newer building blocks.</b> <code>resource({ params, loader })</code> and <code>rxResource({ params, stream })</code> load async data driven by signals, with built-in status (<code>isLoading()</code>, <code>error()</code>, <code>value()</code>) and automatic cancellation of stale loads; <code>httpResource</code> wraps <code>HttpClient</code>. These APIs evolved across Angular 19 to 21 (e.g. <code>request</code> renamed to <code>params</code>), so check the version in your project. For heavy event-driven workflows (WebSockets, complex retries, multi-step orchestration), RxJS remains the tool.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> "Signals vs RxJS" is a hot interview question because teams are mid-migration, and assistants confidently produce either extreme ("signals replace RxJS" or "keep everything in BehaviorSubjects"). The senior answer is the split above, plus knowing the interop semantics (eager <code>toSignal</code>, async/coalescing <code>toObservable</code>).</p>
    <p>Migration with AI works best in small, verifiable steps: one service at a time, keep public APIs stable by exposing both <code>state$</code> and <code>state</code> during the transition, and keep tests (TestBed + <code>fakeAsync</code> or <code>TestBed.flushEffects()</code>/<code>tick()</code>) green after each step. Angular also ships schematics for signal inputs and queries that automate the mechanical parts.</p>`
});
/* =====================================================================
   PRACTICE: Easy (3)
   ===================================================================== */
practice.push({
  title: 'Make a Promise-based API lazy and cancellable (defer)',
  level: 'Easy', tags: ['observable', 'promise', 'lazy', 'defer'], companies: ['Google', 'Amazon'],
  statement: `<p>You have <code>loadUser(id)</code>, which returns a Promise and starts the request <b>immediately</b>. Write <code>defer(factory)</code> returning an Observable that calls <code>factory()</code> only when someone subscribes (once per subscriber), emits the resolved value, then completes, and forwards rejections to <code>error</code>. If the subscriber unsubscribes before the promise resolves, it must <b>not</b> receive the value.</p>`,
  constraints: `Use the Observable class. You cannot cancel the promise itself; just stop delivering.`,
  example: `<p><code>const user$ = defer(() =&gt; loadUser(1))</code> → no request yet. Two subscribes → <span class="c-y">2</span> requests (cold). Unsubscribe at 10 ms with a 50 ms request → <span class="c-g">nothing delivered</span>.</p>`,
  brute: {
    why: `<p>Wrapping an already-created promise (<code>from(loadUser(1))</code>) starts the request at definition time, even if nobody subscribes, and all subscribers share that one eager call.</p>`,
    code: { lang: 'js', run: true, code: RX + `
let requests = 0;
const loadUser = (id) => { requests++; return new Promise((r) => setTimeout(() => r({ id, name: 'Ana' }), 30)); };
const fromPromise = (p) => new Observable((s) => { p.then((v) => { s.next(v); s.complete(); }, (e) => s.error(e)); });
const user$ = fromPromise(loadUser(1));      // request starts HERE
console.log('defined user$, requests already sent:', requests);` }
  },
  mcq: { q: 'When must factory() be called?', options: ['When defer() is called', 'Inside the Observable subscribe function', 'In complete()'], answer: 1, explain: 'Calling it inside the subscribe function makes the work lazy and per-subscriber, which is what a cold Observable means.' },
  hints: [
    `<p>Hint 1: anything inside <code>new Observable(s =&gt; ...)</code> runs per subscribe.</p>`,
    `<p>Hint 2: <code>s.next</code> after unsubscribe is ignored by the safe subscriber, but being explicit with a flag is clearer.</p>`,
    `<p>Hint 3: return <code>() =&gt; { cancelled = true; }</code> as teardown.</p>`
  ],
  solution: {
    approach: `<p>Move the promise creation into the subscribe function and guard delivery with a cancelled flag set in teardown. That gives laziness, one call per subscriber, and "no late delivery" after unsubscribe. (RxJS has this built in: <code>defer(() =&gt; loadUser(1))</code> or <code>from(...)</code> inside <code>defer</code>.)</p>`,
    code: { lang: 'js', run: true, code: RX + `
let requests = 0;
const loadUser = (id) => { requests++; return new Promise((r) => setTimeout(() => r({ id, name: 'Ana' }), 50)); };

function defer(factory) {
  return new Observable((s) => {
    let cancelled = false;
    factory().then(
      (v) => { if (!cancelled) { s.next(v); s.complete(); } },
      (e) => { if (!cancelled) s.error(e); }
    );
    return () => { cancelled = true; };
  });
}
const user$ = defer(() => loadUser(1));
console.log('defined, requests =', requests);
user$.subscribe((u) => console.log('A got', u.name));
const b = user$.subscribe((u) => console.log('B got', u.name, '(should not happen)'));
setTimeout(() => b.unsubscribe(), 10);
setTimeout(() => console.log('requests =', requests, '(one per subscriber: cold)'), 100);` },
    complexity: `<p>O(1) per subscription.</p>`,
    followUps: ['How would you actually abort the HTTP request with AbortController?', 'What does shareReplay(1) change here?']
  }
});
practice.push({
  title: 'Counter service with a BehaviorSubject',
  level: 'Easy', tags: ['BehaviorSubject', 'service', 'asObservable'], companies: ['TCS', 'Accenture', 'Capgemini'],
  statement: `<p>Create a <code>CounterStore</code> with <code>increment()</code>, <code>decrement()</code> (never below 0), <code>reset()</code>, a read-only <code>count$</code> stream that skips repeated equal values, and a synchronous <code>snapshot</code> getter. A component that subscribes late must immediately receive the current count.</p>`,
  constraints: `Consumers must not be able to call next() on the store's state.`,
  example: `<p>increment ×3, decrement, late subscribe → late subscriber first sees <b>2</b>. decrement ×5 → stays at <b>0</b>, and the stream does not repeat 0.</p>`,
  brute: {
    why: `<p>A public <code>Subject</code>: late subscribers see nothing until the next change, there is no synchronous value, and any component can push garbage into it.</p>`,
    code: { lang: 'js', run: true, code: RX + `
class CounterStore { count$ = new Subject(); n = 0; increment() { this.count$.next(++this.n); } }
const store = new CounterStore();
store.increment(); store.increment();
store.count$.subscribe((v) => console.log('late subscriber got', v));
console.log('late subscriber received nothing yet; and anyone can do store.count$.next(-99)');
store.count$.next(-99);` }
  },
  mcq: { q: 'Which subject gives a late subscriber the current value immediately?', options: ['Subject', 'BehaviorSubject', 'AsyncSubject'], answer: 1, explain: 'BehaviorSubject stores the latest value (it requires an initial one) and emits it to each new subscriber.' },
  hints: [
    `<p>Hint 1: keep a <code>private</code> <code>BehaviorSubject(0)</code>.</p>`,
    `<p>Hint 2: expose <code>state.asObservable().pipe(distinctUntilChanged())</code>.</p>`,
    `<p>Hint 3: compute the next value from <code>state.value</code> with <code>Math.max(0, ...)</code>.</p>`
  ],
  solution: {
    approach: `<p>The private <code>BehaviorSubject</code> is the single source of truth; methods are the only writers; <code>asObservable</code> + <code>distinctUntilChanged</code> give a safe, de-duplicated read stream, and <code>.value</code> gives the snapshot. (In Angular 17+ the signal version is <code>private _count = signal(0); count = this._count.asReadonly();</code>.)</p>`,
    code: { lang: 'js', run: true, code: RX + `
class CounterStore {
  #state = new BehaviorSubject(0);
  count$ = this.#state.asObservable().pipe(distinctUntilChanged());
  get snapshot() { return this.#state.value; }
  increment() { this.#state.next(this.snapshot + 1); }
  decrement() { this.#state.next(Math.max(0, this.snapshot - 1)); }
  reset() { this.#state.next(0); }
}
const store = new CounterStore();
store.increment(); store.increment(); store.increment(); store.decrement();
const seen = [];
store.count$.subscribe((v) => seen.push(v));          // late: gets 2 immediately
for (let i = 0; i < 5; i++) store.decrement();         // 1, 0, then 0s are deduped
store.reset();                                          // 0 again: deduped
console.log('late subscriber saw', JSON.stringify(seen), '| snapshot', store.snapshot);
console.log('can a consumer call next?', typeof store.count$.next === 'function');` },
    complexity: `<p>O(1) per operation and per notification.</p>`,
    followUps: ['Rewrite the store with signals; what replaces distinctUntilChanged?', 'Why is exposing the subject itself a maintenance problem?']
  }
});
practice.push({
  title: 'Signals: a filtered, counted list with no stored derived state',
  level: 'Easy', tags: ['signals', 'computed'], companies: ['Google', 'Thoughtworks'],
  statement: `<p>Given <code>tasks = signal([{title, done}])</code> and <code>showDone = signal(true)</code>, create <code>visible</code> (filtered list), <code>doneCount</code> and <code>label</code> ("2 of 5 done"). Add <code>toggle(index)</code> and <code>add(title)</code>. Do not store any derived value in its own signal.</p>`,
  constraints: `Immutable updates; computed values only.`,
  example: `<p>3 tasks, 1 done, showDone = false → visible has <b>2</b>, label "<b>1 of 3 done</b>". toggle(0) → "2 of 3 done".</p>`,
  brute: {
    why: `<p>Keeping <code>doneCount</code> in its own signal and updating it manually inside every method forgets a case sooner or later (here: <code>add</code> of an already-done task), and the label drifts.</p>`,
    code: { lang: 'js', run: true, code: SIG + `
const tasks = signal([{ title: 'a', done: true }]);
const doneCount = signal(1);
function toggle(i) { tasks.update((ts) => ts.map((t, j) => (j === i ? { ...t, done: !t.done } : t))); doneCount.update((n) => n + (tasks()[i].done ? 1 : -1)); }
function add(title, done) { tasks.update((ts) => [...ts, { title, done }]); /* forgot doneCount */ }
add('b', true);
console.log('stored doneCount', doneCount(), 'vs real', tasks().filter((t) => t.done).length);` }
  },
  mcq: { q: 'What happens to doneCount = computed(...) if no template or effect reads it?', options: ['It recomputes on every change anyway', 'It is not computed at all (lazy)', 'It throws'], answer: 1, explain: 'computed is lazy: it only calculates when read, and memoizes until a dependency changes.' },
  hints: [
    `<p>Hint 1: only <code>tasks</code> and <code>showDone</code> are real state.</p>`,
    `<p>Hint 2: <code>visible = computed(() =&gt; showDone() ? tasks() : tasks().filter(t =&gt; !t.done))</code>.</p>`,
    `<p>Hint 3: <code>label</code> can read other computeds: <code>doneCount() + ' of ' + tasks().length + ' done'</code>.</p>`
  ],
  solution: {
    approach: `<p>Derive everything with <code>computed</code>. Each one depends only on what it reads, recomputes lazily and cannot drift out of sync.</p>`,
    code: { lang: 'js', run: true, code: SIG + `
const tasks = signal([{ title: 'write tests', done: true }, { title: 'review PR', done: false }, { title: 'ship', done: false }]);
const showDone = signal(false);
const visible = computed(() => (showDone() ? tasks() : tasks().filter((t) => !t.done)));
const doneCount = computed(() => tasks().filter((t) => t.done).length);
const label = computed(() => doneCount() + ' of ' + tasks().length + ' done');

const toggle = (i) => tasks.update((ts) => ts.map((t, j) => (j === i ? { ...t, done: !t.done } : t)));
const add = (title) => tasks.update((ts) => [...ts, { title, done: false }]);

console.log(label(), '| visible:', visible().map((t) => t.title).join(', '));
toggle(1);
console.log(label(), '| visible:', visible().map((t) => t.title).join(', '));
add('celebrate');
showDone.set(true);
console.log(label(), '| visible:', visible().map((t) => t.title).join(', '));` },
    complexity: `<p>O(n) per recompute, only after a change and only when read.</p>`,
    followUps: ['How would @for (t of visible(); track t.title) behave if two tasks had the same title?', 'When would you add a custom equal function to a computed?']
  }
});
/* =====================================================================
   PRACTICE: Medium (5)
   ===================================================================== */
practice.push({
  title: 'Typeahead without race conditions',
  level: 'Medium', tags: ['switchMap', 'debounceTime', 'race', 'catchError'], companies: ['Google', 'Amazon', 'Booking.com'],
  statement: `<p>Build <code>results$</code> from <code>query$</code> (raw input values). Requirements: wait 100 ms of silence, trim, ignore queries shorter than 2 characters (emit <code>[]</code> for them), skip repeats, cancel any in-flight request when a newer query arrives, and survive request errors (emit <code>['error']</code> for that query only). The fake API has <b>random-like latency</b>: older requests can be slower.</p>`,
  constraints: `api(q) returns an Observable; latency 20 to 200 ms.`,
  example: `<p>Type "an" then 150 ms later "ang" (api("an") takes 200 ms, api("ang") 20 ms) → results: <span class="c-g">ang results only</span>, never stale "an" results after them.</p>`,
  brute: {
    why: `<p><code>mergeMap</code> keeps every request alive; a slow early response arrives last and overwrites the newer one.</p>`,
    code: { lang: 'js', run: true, code: RX + `
const query$ = new Subject();
const api = (q) => timer(q === 'an' ? 200 : 20, [q + ' results']);
query$.pipe(debounceTime(100), mergeMap(api)).subscribe((r) => console.log(at(), 'screen shows', r[0]));
query$.next('an');
setTimeout(() => query$.next('ang'), 150);
setTimeout(() => console.log('final screen is STALE ("an") because the slow response won the race'), 450);` }
  },
  mcq: { q: 'Why does switchMap remove the race?', options: ['It makes requests faster', 'It unsubscribes the previous inner request, so its late response is never delivered', 'It sorts responses by time'], answer: 1, explain: 'Only one inner subscription is alive; earlier ones are unsubscribed (and HttpClient aborts them).' },
  hints: [
    `<p>Hint 1: order: debounce → trim → distinct → switchMap.</p>`,
    `<p>Hint 2: short queries: <code>q.length &lt; 2 ? of([]) : api(q)</code> inside switchMap (also cancels a running request!).</p>`,
    `<p>Hint 3: <code>catchError</code> goes on <code>api(q)</code>, inside the switchMap callback.</p>`
  ],
  solution: {
    approach: `<p>Debounce reduces the number of queries; distinct removes repeats; switchMap guarantees only the latest query's request can deliver; the inner catchError isolates failures. Mapping short queries to <code>of([])</code> inside switchMap also clears results and cancels any older request.</p>`,
    code: { lang: 'js', run: true, code: RX + `
const query$ = new Subject();
const latency = { an: 200, ang: 20, angu: 60, boom: 30 };
const api = (q) => q === 'boom'
  ? timer(30).pipe(map(() => { throw new Error('500'); }))
  : timer(latency[q] || 40, [q + ' results']);

const results$ = query$.pipe(
  debounceTime(100),
  map((q) => q.trim()),
  distinctUntilChanged(),
  switchMap((q) => (q.length < 2 ? of([]) : api(q).pipe(catchError(() => of(['error'])))))
);
results$.subscribe((r) => console.log(at(), 'screen shows', JSON.stringify(r)));

[['an', 0], ['ang', 150], ['ang ', 300], ['a', 450], ['boom', 600], ['angu', 800]].forEach(([q, ms]) => setTimeout(() => query$.next(q), ms));
setTimeout(() => query$.complete(), 1100);` },
    complexity: `<p>At most one request in flight; O(1) operator state.</p>`,
    followUps: ['How would you show a loading indicator (startWith)?', 'How would you cache recent queries to avoid refetching?']
  }
});
practice.push({
  title: 'retryWithBackoff: a custom operator',
  level: 'Medium', tags: ['custom operator', 'retry', 'backoff', 'catchError'], companies: ['Netflix', 'Uber', 'Atlassian'],
  statement: `<p>Write <code>retryWithBackoff(maxRetries, baseMs)</code>: when the source errors, resubscribe after <code>baseMs × 2<sup>attempt</sup></code> (100, 200, 400 ...). After <code>maxRetries</code> failed retries, forward the last error. Unsubscribing during a wait must cancel the pending retry.</p>`,
  constraints: `Implement it yourself with new Observable (RxJS 7 has retry({ count, delay }) built in).`,
  example: `<p>A source that fails twice then succeeds, with <code>retryWithBackoff(3, 50)</code> → attempts at <span class="c-y">0, 50, 150 ms</span>, value delivered on the third attempt.</p>`,
  brute: {
    why: `<p>Retrying immediately in a loop hammers a failing server (a self-inflicted DDoS when many clients do it), and with no limit it never gives up.</p>`,
    code: { lang: 'js', run: true, code: RX + `
let calls = 0;
const flaky = new Observable((s) => { calls++; if (calls < 50) s.error(new Error('503')); else { s.next('ok'); s.complete(); } });
const retryForever = (src) => new Observable((s) => { const go = () => src.subscribe({ next: (v) => s.next(v), error: () => go(), complete: () => s.complete() }); go(); });
retryForever(flaky).subscribe((v) => console.log('got', v, 'after', calls, 'calls with zero delay'));` }
  },
  mcq: { q: 'Why add a growing delay between retries?', options: ['To make tests slower', 'To give an overloaded server time to recover and avoid synchronized retry storms', 'Because RxJS requires it'], answer: 1, explain: 'Exponential backoff (often with random jitter) spreads retries out so a struggling service is not hit harder exactly when it is weakest.' },
  hints: [
    `<p>Hint 1: keep an <code>attempt</code> counter and a function <code>subscribeToSource()</code>.</p>`,
    `<p>Hint 2: on error: if <code>attempt &gt;= max</code>, forward the error; else <code>setTimeout(subscribeToSource, base * 2 ** attempt++)</code>.</p>`,
    `<p>Hint 3: teardown must clear the timeout and unsubscribe the current source subscription.</p>`
  ],
  solution: {
    approach: `<p>A retry is just "subscribe to the source again". Keep the current inner subscription and pending timer in the closure so teardown can cancel both. Add jitter in production (<code>delay × (0.5 + Math.random())</code>).</p>`,
    code: { lang: 'js', run: true, code: RX + `
const retryWithBackoff = (maxRetries, baseMs) => (source) => new Observable((s) => {
  let attempt = 0, sub = null, timerId = null;
  const subscribeToSource = () => {
    sub = source.subscribe({
      next: (v) => s.next(v),
      complete: () => s.complete(),
      error: (err) => {
        if (attempt >= maxRetries) { s.error(err); return; }
        const wait = baseMs * 2 ** attempt++;
        console.log(at(), 'failed (' + err.message + '), retry #' + attempt + ' in ' + wait + 'ms');
        timerId = setTimeout(subscribeToSource, wait);
      }
    });
  };
  subscribeToSource();
  return () => { clearTimeout(timerId); if (sub) sub.unsubscribe(); };
});

let calls = 0;
const flaky = new Observable((s) => { calls++; if (calls < 3) s.error(new Error('503')); else { s.next('data on call ' + calls); s.complete(); } });
flaky.pipe(retryWithBackoff(3, 50)).subscribe({ next: (v) => console.log(at(), v), complete: () => console.log(at(), 'complete') });

const dead = new Observable((s) => s.error(new Error('404')));
setTimeout(() => dead.pipe(retryWithBackoff(2, 20)).subscribe({ error: (e) => console.log(at(), 'gave up:', e.message) }), 300);` },
    complexity: `<p>Total wait is base × (2<sup>n</sup> − 1) for n retries; O(1) memory.</p>`,
    followUps: ['Which errors should NOT be retried (4xx vs 5xx)?', 'Write the same with RxJS 7 retry({ count, delay: (err, n) => ... })']
  }
});
practice.push({
  title: 'Upload files with at most N in parallel',
  level: 'Medium', tags: ['mergeMap', 'concurrency', 'queue'], companies: ['Dropbox', 'Google', 'Box'],
  statement: `<p>Implement <code>mergeMapLimit(project, limit)</code>: like <code>mergeMap</code>, but at most <code>limit</code> inner Observables run at once; extra outer values wait in a FIFO queue. Use it to upload 6 files with limit 2 and print when each starts and finishes. Completes when the source and all uploads are done.</p>`,
  constraints: `This is mergeMap's second argument in real RxJS: mergeMap(fn, 2).`,
  example: `<p>Files f1..f6, each 50 ms, limit 2 → starts at <span class="c-y">0,0,50,50,100,100</span> ms; done at ~150 ms. With no limit all 6 start at 0.</p>`,
  brute: {
    why: `<p>Plain <code>mergeMap</code> starts all uploads at once: with 500 files the browser opens hundreds of requests, the server throttles, and progress is unusable.</p>`,
    code: { lang: 'js', run: true, code: RX + `
const upload = (f) => { console.log(at(), 'start', f); return timer(50, f + ' done'); };
of('f1', 'f2', 'f3', 'f4', 'f5', 'f6').pipe(mergeMap(upload)).subscribe({ complete: () => console.log(at(), 'all done (all 6 started at once)') });` }
  },
  mcq: { q: 'mergeMapLimit(fn, 1) behaves like which operator?', options: ['switchMap', 'concatMap', 'exhaustMap'], answer: 1, explain: 'One at a time with a FIFO queue is exactly concatMap.' },
  hints: [
    `<p>Hint 1: state = <code>active</code> count, <code>queue</code> array, <code>outerDone</code> flag.</p>`,
    `<p>Hint 2: on outer next: <code>active &lt; limit ? start(v) : queue.push(v)</code>. On inner complete: <code>active--</code>, start the next queued value.</p>`,
    `<p>Hint 3: complete when <code>outerDone &amp;&amp; active === 0 &amp;&amp; queue.length === 0</code>; teardown unsubscribes outer and all inners.</p>`
  ],
  solution: {
    approach: `<p>A concurrency limiter is a counter plus a queue. Every inner completion frees a slot and pulls the next queued value. Completion requires the outer to be done and both the queue and active set to be empty.</p>`,
    code: { lang: 'js', run: true, code: RX + `
const mergeMapLimit = (project, limit) => (src) => new Observable((s) => {
  const inners = new Set(), queue = [];
  let outerDone = false;
  const check = () => { if (outerDone && inners.size === 0 && queue.length === 0) s.complete(); };
  const start = (v) => {
    const h = {}; inners.add(h);
    h.sub = project(v).subscribe({
      next: (x) => s.next(x), error: (e) => s.error(e),
      complete: () => { inners.delete(h); if (queue.length) start(queue.shift()); else check(); }
    });
  };
  const outer = src.subscribe({
    next: (v) => (inners.size < limit ? start(v) : queue.push(v)),
    error: (e) => s.error(e),
    complete: () => { outerDone = true; check(); }
  });
  return () => { outer.unsubscribe(); inners.forEach((h) => h.sub && h.sub.unsubscribe()); };
});

const upload = (f) => { console.log(at(), 'start', f); return timer(50, f + ' done'); };
of('f1', 'f2', 'f3', 'f4', 'f5', 'f6').pipe(mergeMapLimit(upload, 2)).subscribe({
  next: (r) => console.log(at(), r),
  complete: () => console.log(at(), 'all uploads finished')
});` },
    complexity: `<p>O(1) per value; at most <code>limit</code> concurrent inners; queue up to n.</p>`,
    followUps: ['How would you report overall progress (scan)?', 'How would you retry only the failed files?']
  }
});
practice.push({
  title: 'Write your own takeUntilDestroyed',
  level: 'Medium', tags: ['takeUntilDestroyed', 'DestroyRef', 'teardown'], companies: ['Microsoft', 'Google'],
  statement: `<p>Given a fake <code>DestroyRef</code> with <code>onDestroy(callback)</code> (returns an unregister function) and <code>destroy()</code>, write <code>takeUntilDestroyed(destroyRef)</code>: it completes the stream when the ref is destroyed, unregisters its callback if the stream ends earlier (to avoid leaking callbacks on the ref), and completes immediately if the ref is already destroyed.</p>`,
  constraints: `Same behaviour as Angular's operator from @angular/core/rxjs-interop.`,
  example: `<p>interval(20) piped through it, destroy after 70 ms → values <span class="c-g">0, 1, 2</span>, then complete; the interval is cleared.</p>`,
  brute: {
    why: `<p>Registering an <code>onDestroy</code> callback that only calls <code>unsubscribe</code> on a subscription you created outside the stream works for one subscriber but leaks callbacks for short-lived streams, and does not signal <code>complete</code> to downstream operators like <code>finalize</code>.</p>`,
    code: { lang: 'js', run: true, code: RX + `
const makeRef = () => { const cbs = new Set(); let done = false; return { onDestroy(cb) { cbs.add(cb); return () => cbs.delete(cb); }, destroy() { done = true; cbs.forEach((c) => c()); }, get size() { return cbs.size; }, get destroyed() { return done; } }; };
const ref = makeRef();
for (let i = 0; i < 100; i++) { const sub = of(i).subscribe(() => {}); ref.onDestroy(() => sub.unsubscribe()); }   // short streams
console.log('callbacks piled up on the DestroyRef:', ref.size);` }
  },
  mcq: { q: 'Why is takeUntilDestroyed placed last in the pipe?', options: ['Style only', 'So it also ends inner subscriptions created by earlier flattening operators', 'Because it must run after map'], answer: 1, explain: 'Completing at the end of the chain unsubscribes everything upstream, including switchMap inners; placed earlier, inners stay alive.' },
  hints: [
    `<p>Hint 1: it is an operator: <code>(source) =&gt; new Observable(s =&gt; ...)</code>.</p>`,
    `<p>Hint 2: in the subscribe function: if already destroyed, complete; else <code>const off = ref.onDestroy(() =&gt; s.complete())</code>.</p>`,
    `<p>Hint 3: teardown: <code>off(); sub.unsubscribe();</code>.</p>`
  ],
  solution: {
    approach: `<p>Turn the destroy hook into a completion signal for this subscription only, and clean the hook up when the subscription ends for any other reason. Completing (instead of silently unsubscribing) lets downstream <code>finalize</code> logic run.</p>`,
    code: { lang: 'js', run: true, code: RX + `
const makeRef = () => { const cbs = new Set(); let done = false; return { onDestroy(cb) { cbs.add(cb); return () => cbs.delete(cb); }, destroy() { done = true; [...cbs].forEach((c) => c()); cbs.clear(); }, get size() { return cbs.size; }, get destroyed() { return done; } }; };

const takeUntilDestroyed = (ref) => (source) => new Observable((s) => {
  if (ref.destroyed) { s.complete(); return; }
  const off = ref.onDestroy(() => s.complete());
  const sub = source.subscribe(s);
  return () => { off(); sub.unsubscribe(); };
});

const ref = makeRef();
for (let i = 0; i < 100; i++) of(i).pipe(takeUntilDestroyed(ref)).subscribe(() => {});
console.log('callbacks left after 100 short streams:', ref.size);

interval(20).pipe(takeUntilDestroyed(ref)).subscribe({ next: (v) => console.log(at(), 'tick', v), complete: () => console.log(at(), 'completed on destroy') });
setTimeout(() => { ref.destroy(); console.log('callbacks after destroy:', ref.size); }, 70);
setTimeout(() => of('late').pipe(takeUntilDestroyed(ref)).subscribe({ next: (v) => console.log('should not print', v), complete: () => console.log('already destroyed: completes immediately') }), 100);` },
    complexity: `<p>O(1) per subscription.</p>`,
    followUps: ['Why does the no-argument version need an injection context?', 'How does the async pipe achieve the same thing?']
  }
});
practice.push({
  title: 'Debounce a signal with toObservable and bring it back with toSignal',
  level: 'Medium', tags: ['toObservable', 'toSignal', 'debounceTime', 'interop'], companies: ['Google', 'SAP'],
  lang: 'ts',
  statement: `<p>A component has <code>search = signal('')</code> bound to an input and a <code>ProductsService.find(q): Observable&lt;Product[]&gt;</code>. Show a <code>products</code> signal that updates 300 ms after the user stops typing, cancels stale requests, starts as an empty array, and a <code>loading</code> signal. No manual subscribe.</p>`,
  constraints: `Angular 17+ standalone component, RxJS 7.`,
  example: `<p>Type "lap" quickly → after 300 ms one request; <span class="c-g">loading()</span> true until it returns; <span class="c-g">products()</span> holds the list.</p>`,
  brute: {
    why: `<p>An <code>effect</code> that calls the service and subscribes on every keystroke: no debounce, no cancellation, a new subscription per run that is never cleaned up, and a signal written from an effect.</p>`,
    code: { lang: 'ts', code: `import { Component, effect, inject, signal } from '@angular/core';
import { ProductsService, Product } from './products.service';

@Component({ selector: 'app-products', standalone: true, template: '' })
export class ProductsComponent {
  private api = inject(ProductsService);
  search = signal('');
  products = signal<Product[]>([]);

  constructor() {
    effect(() => {
      this.api.find(this.search()).subscribe((list) => this.products.set(list));  // leak + race + no debounce
    });
  }
}` }
  },
  mcq: { q: 'When does toObservable(search) emit?', options: ['Synchronously inside search.set()', 'Asynchronously when effects flush, with the latest value only', 'Only when the component is destroyed'], answer: 1, explain: 'toObservable is built on an effect, so emissions happen at flush time and intermediate synchronous writes are coalesced.' },
  hints: [
    `<p>Hint 1: signal → <code>toObservable</code> → <code>debounceTime</code>, <code>distinctUntilChanged</code>, <code>switchMap</code> → <code>toSignal</code>.</p>`,
    `<p>Hint 2: model the result as <code>{ loading, items }</code> and use <code>startWith({ loading: true, items: [] })</code> inside switchMap.</p>`,
    `<p>Hint 3: two computeds read that one signal: <code>products</code> and <code>loading</code>.</p>`
  ],
  solution: {
    approach: `<p>Keep the input state as a signal, convert it once to an Observable for the time-based part, and convert the final stream back with <code>toSignal</code> (which owns the subscription). A single state object prevents <code>loading</code> and <code>items</code> from disagreeing.</p>`,
    code: { lang: 'ts', code: `import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { ProductsService, Product } from './products.service';

interface View { loading: boolean; items: Product[]; }

@Component({
  selector: 'app-products',
  standalone: true,
  template: \`
    <input [value]="search()" (input)="search.set($any($event.target).value)" placeholder="Search" />
    @if (loading()) { <p>Loading...</p> }
    @for (p of products(); track p.id) { <li>{{ p.name }}</li> } @empty { <li>No products</li> }
  \`,
})
export class ProductsComponent {
  private api = inject(ProductsService);
  readonly search = signal('');

  private readonly view = toSignal(
    toObservable(this.search).pipe(
      debounceTime(300),
      map((q) => q.trim()),
      distinctUntilChanged(),
      switchMap((q) =>
        this.api.find(q).pipe(
          map((items): View => ({ loading: false, items })),
          startWith<View>({ loading: true, items: [] }),
          catchError(() => of<View>({ loading: false, items: [] }))
        )
      )
    ),
    { initialValue: { loading: false, items: [] } as View }
  );

  readonly products = computed(() => this.view().items);
  readonly loading = computed(() => this.view().loading);
}` },
    complexity: `<p>One subscription owned by toSignal; at most one request in flight.</p>`,
    followUps: ['How would httpResource / rxResource simplify this?', 'How do you keep previous results visible while loading?']
  }
});
/* =====================================================================
   PRACTICE: Hard (4)
   ===================================================================== */
practice.push({
  title: 'Implement switchMap from scratch',
  level: 'Hard', tags: ['switchMap', 'operators', 'internals'], companies: ['Google', 'Microsoft', 'Meta'],
  statement: `<p>Write <code>mySwitchMap(project)</code> using only <code>new Observable</code>. Rules: on each outer value, unsubscribe the current inner (if any) and subscribe to <code>project(value, index)</code>; forward inner values; any error (outer or inner) errors the result; the result completes only when the outer has completed <b>and</b> the current inner has completed; unsubscribing the result tears down both.</p>`,
  constraints: `Must handle inners that complete synchronously (e.g. of(x)).`,
  example: `<p>Outer a@0, b@30 with inner = timer(50) → only <span class="c-g">b</span>'s result at ~80 ms; a's timer is cleared at 30 ms.</p>`,
  brute: {
    why: `<p>Nested subscribe: subscribe to the outer and inside it subscribe to each inner. Old inners are never cancelled, completion is reported too early (when the outer completes), and unsubscribing the outer leaves inners running.</p>`,
    code: { lang: 'js', run: true, code: RX + `
const nested = (outer$, project) => new Observable((s) => outer$.subscribe({
  next: (v) => project(v).subscribe((x) => s.next(x)),   // no cancel, no tracking
  complete: () => s.complete()                            // too early!
}));
const outer$ = new Observable((s) => { s.next('a'); setTimeout(() => { s.next('b'); s.complete(); }, 30); });
const ran = [];
nested(outer$, (v) => timer(50, v).pipe(tap(() => ran.push(v)))).subscribe({ next: (v) => console.log(at(), 'got', v), complete: () => console.log(at(), 'complete (reported before inner b finished)') });
setTimeout(() => console.log('inner jobs that still ran to the end:', ran.join(', '), "(a was never cancelled, and b's result was lost)"), 150);` }
  },
  mcq: { q: 'When should mySwitchMap complete?', options: ['As soon as the outer completes', 'When the outer has completed and the active inner (if any) has completed', 'When the first inner completes'], answer: 1, explain: 'An inner may still be emitting after the outer is done; completing early would lose its values.' },
  hints: [
    `<p>Hint 1: state: <code>innerSub</code>, <code>innerActive</code>, <code>outerDone</code>, <code>index</code>.</p>`,
    `<p>Hint 2: before subscribing a new inner, <code>innerSub?.unsubscribe()</code>. Mark <code>innerActive = true</code> <b>before</b> subscribing so a synchronous completion can set it back to false.</p>`,
    `<p>Hint 3: inner complete: <code>innerActive = false; if (outerDone) s.complete()</code>. Outer complete: <code>outerDone = true; if (!innerActive) s.complete()</code>.</p>`
  ],
  solution: {
    approach: `<p>Track exactly one inner subscription. A new outer value cancels it and starts another. The two completion conditions are checked from both sides (outer complete and inner complete). Setting <code>innerActive</code> before subscribing handles synchronous inners correctly.</p>`,
    code: { lang: 'js', run: true, code: RX + `
const mySwitchMap = (project) => (source) => new Observable((s) => {
  let innerSub = null, innerActive = false, outerDone = false, index = 0;
  const outerSub = source.subscribe({
    next: (v) => {
      if (innerSub) innerSub.unsubscribe();               // cancel the previous inner
      innerActive = true;
      const myTurn = ++index;
      const sub = project(v, myTurn - 1).subscribe({
        next: (x) => s.next(x),
        error: (e) => s.error(e),
        complete: () => { if (myTurn === index) { innerActive = false; if (outerDone) s.complete(); } }
      });
      if (myTurn === index) innerSub = sub;
    },
    error: (e) => s.error(e),
    complete: () => { outerDone = true; if (!innerActive) s.complete(); }
  });
  return () => { outerSub.unsubscribe(); if (innerSub) innerSub.unsubscribe(); };
});

const outer$ = new Observable((s) => {
  s.next('a');
  const t1 = setTimeout(() => s.next('b'), 30);
  const t2 = setTimeout(() => { s.next('c'); s.complete(); }, 40);
  return () => { clearTimeout(t1); clearTimeout(t2); };
});
outer$.pipe(mySwitchMap((v) => new Observable((s) => {
  console.log(at(), 'inner', v, 'starts');
  const id = setTimeout(() => { s.next(v + '!'); s.complete(); }, 50);
  return () => { clearTimeout(id); console.log(at(), 'inner', v, 'torn down'); };
}))).subscribe({ next: (v) => console.log(at(), 'result', v), complete: () => console.log(at(), 'complete (after the last inner)') });

of(1, 2, 3).pipe(mySwitchMap((n) => of(n * 10))).subscribe({ next: (v) => console.log('sync inner', v), complete: () => console.log('sync case complete') });` },
    complexity: `<p>O(1) state; each outer value costs one subscribe and at most one unsubscribe.</p>`,
    followUps: ['Change one line to get exhaustMap. Which line?', 'How would you add a concurrency limit to get mergeMap(fn, n)?']
  }
});
practice.push({
  title: 'Build a glitch-free signal + computed core',
  level: 'Hard', tags: ['signals', 'reactivity', 'internals', 'memoization'], companies: ['Google', 'Vercel', 'Meta'],
  statement: `<p>Implement <code>signal(v)</code> (read by calling it, <code>set</code>, <code>update</code>) and <code>computed(fn)</code> with: automatic dependency tracking, <b>laziness</b> (compute only when read), <b>memoization</b> (no recompute if dependencies did not change), dynamic dependencies (re-collected each run), and <b>equality cutoff</b> (if a computed recalculates to the same value, computeds that depend on it do not recompute). Prove each property with run counters.</p>`,
  constraints: `No effects needed. Synchronous reads only.`,
  example: `<p><code>a=1; b=computed(a%2); c=computed(b?'odd':'even')</code>. <code>a.set(3)</code> → b recomputes (still odd), <b>c does not</b>.</p>`,
  brute: {
    why: `<p>An eager "recompute every dependent immediately on set" approach recomputes things nobody reads, recomputes a diamond's bottom twice, and can expose a <b>glitch</b> (a computed seen with one new input and one old input).</p>`,
    code: { lang: 'js', run: true, code: `// Eager push: every set immediately recomputes all dependents
function eagerSignal(v) { const deps = []; const s = () => v; s.set = (n) => { v = n; deps.forEach((d) => d.recompute()); }; s.deps = deps; return s; }
function eagerComputed(fn, sources) { const c = () => c.value; c.runs = 0; c.deps = []; c.recompute = () => { c.runs++; c.value = fn(); c.deps.forEach((d) => d.recompute()); }; sources.forEach((s) => s.deps.push(c)); c.recompute(); return c; }
const a = eagerSignal(1);
const left = eagerComputed(() => a() + 1, [a]);
const right = eagerComputed(() => a() * 10, [a]);
const glitches = [];
const sum = eagerComputed(() => { const r = left() + right(); glitches.push(left() + '+' + right()); return r; }, [left, right]);
a.set(2);
console.log('sum ran', sum.runs, 'times; intermediate views:', glitches.join(' | '), '(2+10 is a glitch: new left, old right)');` }
  },
  mcq: { q: 'How does a computed know whether to recompute when it is read?', options: ['It always recomputes', 'It compares the versions of its dependencies with the versions recorded at its last run', 'It deep-compares its old and new value before running'], answer: 1, explain: 'Version numbers make the check cheap: if no dependency version changed, the cached value is still valid.' },
  hints: [
    `<p>Hint 1: a global <code>active</code> variable holds the computed currently running; reading a signal while <code>active</code> is set records a dependency (with its current version).</p>`,
    `<p>Hint 2: <code>set</code> bumps the version and marks dependents <code>dirty</code> (recursively), without computing anything.</p>`,
    `<p>Hint 3: reading a dirty computed: refresh each dependency; if none changed version, keep the value; else rerun <code>fn</code> and bump own version only if the value changed.</p>`
  ],
  solution: {
    approach: `<p>Push-pull: writes push cheap dirty flags down the graph; reads pull, refreshing dependencies first and comparing version numbers. Versions give memoization and the equality cutoff; pulling in dependency order gives glitch-free results; re-collecting dependencies each run supports conditional reads. This is the same design as Angular's signal core and the TC39 Signals proposal.</p>`,
    code: { lang: 'js', run: true, code: SIG + `
const a = signal(1);
const left = computed(() => a() + 1);
const right = computed(() => a() * 10);
const seen = [];
const sum = computed(() => { const r = left() + right(); seen.push(left() + '+' + right()); return r; });
console.log('nothing computed yet (lazy): sum runs =', sum.runs());
console.log('sum =', sum(), '| runs', sum.runs());
a.set(2);
console.log('after set, still lazy: sum runs =', sum.runs());
console.log('sum =', sum(), '| views seen:', seen.join(' | '), '(no glitch)');
console.log('read again, memoized: sum runs =', (sum(), sum.runs()));

const n = signal(1);
const parity = computed(() => (n() % 2 ? 'odd' : 'even'));
const label = computed(() => 'number is ' + parity());
label();
n.set(3);                                    // parity recomputes to the same value
label();
console.log('parity runs', parity.runs(), '| label runs', label.runs(), '(cutoff: label did not rerun)');

const useNick = signal(false), nick = signal('Zed'), real = signal('Zoe');
const name = computed(() => (useNick() ? nick() : real()));
name(); nick.set('Zap'); name();
console.log('nick changed while unused -> name runs', name.runs(), '(dynamic deps)');` },
    complexity: `<p>set: O(dependents) to mark dirty. read: O(dependencies) version checks, plus recompute only when needed.</p>`,
    followUps: ['Add effect() with a microtask flush. Why must effects be scheduled instead of run inside set()?', 'How would you detect a cycle (a computed reading itself)?']
  }
});
practice.push({
  title: 'shareReplay with refCount, built by hand',
  level: 'Hard', tags: ['multicast', 'shareReplay', 'ReplaySubject', 'refCount'], companies: ['Google', 'Bloomberg'],
  statement: `<p>Implement <code>shareReplayRefCount(src)</code>: the first subscriber connects to <code>src</code> through a <code>ReplaySubject(1)</code>; later subscribers share that connection and immediately get the latest value; when the subscriber count drops to 0, disconnect from the source <b>and</b> reset, so the next subscriber starts a fresh connection. If the source completes, keep replaying the last value (do not reconnect).</p>`,
  constraints: `This is shareReplay({ bufferSize: 1, refCount: true }).`,
  example: `<p>A ticker source: A subscribes, B joins later and gets the latest tick at once; both leave → <span class="c-g">source torn down</span>; C subscribes → <span class="c-y">new connection</span> from tick 0.</p>`,
  brute: {
    why: `<p>A global <code>ReplaySubject</code> subscribed once and never disconnected keeps an infinite source (interval, WebSocket) running forever, even when no screen uses it: the "shareReplay without refCount" leak.</p>`,
    code: { lang: 'js', run: true, code: RX + `
let open = 0;
const ticker$ = new Observable((s) => { open++; const id = setInterval(() => s.next(Date.now()), 20); return () => { open--; clearInterval(id); }; });
const cache = new ReplaySubject(1);
const conn = ticker$.subscribe(cache);                     // connected forever
const a = cache.subscribe(() => {});
setTimeout(() => { a.unsubscribe(); console.log('no subscribers, but source connections open =', open); conn.unsubscribe(); }, 60);` }
  },
  mcq: { q: 'Why reset the ReplaySubject when refCount hits 0 (for a source that has not completed)?', options: ['To save memory only', 'So the next subscriber does not get a stale value from a disconnected source and a fresh connection is made', 'Because ReplaySubject cannot be reused'], answer: 1, explain: 'After disconnecting, the buffered value no longer reflects a live source; a new connection with a new subject gives fresh data.' },
  hints: [
    `<p>Hint 1: closure state: <code>subject</code>, <code>connection</code>, <code>refCount</code>, <code>completed</code>.</p>`,
    `<p>Hint 2: on subscribe: create subject + connection if missing, <code>refCount++</code>, subscribe the subscriber to the subject.</p>`,
    `<p>Hint 3: teardown: <code>refCount--</code>; if 0 and not completed, unsubscribe the connection and set subject/connection to null.</p>`
  ],
  solution: {
    approach: `<p>A connectable pattern: one shared inner subscription to the source feeds a ReplaySubject; a reference count decides when to connect and disconnect. Completion is remembered so finished results (like an HTTP response) keep replaying without refetching.</p>`,
    code: { lang: 'js', run: true, code: RX + `
function shareReplayRefCount(src) {
  let subject = null, connection = null, refCount = 0, completed = false;
  return new Observable((subscriber) => {
    if (!subject) {
      subject = new ReplaySubject(1);
      const target = subject;
      connection = src.subscribe({
        next: (v) => target.next(v),
        error: (e) => { target.error(e); subject = null; connection = null; },
        complete: () => { completed = true; target.complete(); }
      });
    }
    refCount++;
    const inner = subject.subscribe(subscriber);
    return () => {
      inner.unsubscribe();
      refCount--;
      if (refCount === 0 && !completed && connection) {
        connection.unsubscribe(); connection = null; subject = null;   // disconnect + reset
      }
    };
  });
}

let connections = 0;
const ticker$ = new Observable((s) => { const me = ++connections; let n = 0; const id = setInterval(() => s.next('conn' + me + ':tick' + n++), 20); return () => { clearInterval(id); console.log(at(), 'source conn' + me + ' torn down'); }; });
const shared$ = shareReplayRefCount(ticker$);
const a = shared$.subscribe((v) => console.log(at(), 'A', v));
let b;
setTimeout(() => { b = shared$.subscribe((v) => console.log(at(), 'B', v)); }, 50);
setTimeout(() => { a.unsubscribe(); b.unsubscribe(); }, 90);
setTimeout(() => { const c = shared$.subscribe((v) => console.log(at(), 'C', v)); setTimeout(() => { c.unsubscribe(); console.log('connections made:', connections); }, 50); }, 120);` },
    complexity: `<p>O(1) per subscribe/unsubscribe; one source subscription shared by all.</p>`,
    followUps: ['What does RxJS 7 share({ resetOnRefCountZero: () => timer(1000) }) add?', 'When is refCount: false actually what you want?']
  }
});
practice.push({
  title: 'Smart polling: pause when hidden, back off on errors, stop on destroy',
  level: 'Hard', tags: ['switchMap', 'polling', 'backoff', 'visibility', 'teardown'], companies: ['Datadog', 'Grafana', 'Atlassian'],
  statement: `<p>Build <code>poll$(fetchFn, visible$, destroy$)</code>: while <code>visible$</code> is true, call <code>fetchFn</code> every <code>period</code> ms (first call immediately); never overlap calls; on error, wait twice as long before the next call (capped at 8× period) and reset after a success; when <code>visible$</code> becomes false, stop polling (cancel in-flight call); resume when visible again; complete everything on <code>destroy$</code>.</p>`,
  constraints: `Use switchMap for pause/resume. Period 40 ms in the demo.`,
  example: `<p>Visible → polls at 0, 40, 80; tab hidden at 100 → <span class="c-r">no calls</span>; visible again at 200 → polls resume immediately; destroy at 330 → done.</p>`,
  brute: {
    why: `<p>A plain <code>setInterval</code> keeps polling hidden tabs (wasting battery and server capacity), overlaps calls when the server is slow, retries errors at full speed, and is never cleared on destroy.</p>`,
    code: { lang: 'js', run: true, code: RX + `
let calls = 0;
const id = setInterval(() => { calls++; }, 40);     // ignores visibility, errors and destroy
setTimeout(() => { console.log('calls while the tab was hidden for most of the time:', calls); clearInterval(id); }, 300);` }
  },
  mcq: { q: 'Which operator turns "visible$ true/false" into "start/stop the poller"?', options: ['mergeMap', 'switchMap', 'concatMap'], answer: 1, explain: 'switchMap unsubscribes the previous inner (the running poller) whenever visibility changes, and starts either a new poller or an empty stream.' },
  hints: [
    `<p>Hint 1: <code>visible$.pipe(distinctUntilChanged(), switchMap(v =&gt; v ? poller$ : EMPTY), takeUntil(destroy$))</code>.</p>`,
    `<p>Hint 2: the poller is a recursive loop: call, then wait (period or backoff), then call again. A <code>new Observable</code> with a timer and a flag is simplest.</p>`,
    `<p>Hint 3: keep <code>delay</code> in the poller's closure: success → period; error → <code>Math.min(delay * 2, 8 * period)</code>. Teardown clears the timer and unsubscribes the in-flight call.</p>`
  ],
  solution: {
    approach: `<p>Split concerns: a poller Observable handles "call, wait, repeat" with backoff and never overlaps (the next call is scheduled only after the previous finishes). <code>switchMap</code> over visibility starts and kills pollers, which also cancels in-flight calls. <code>takeUntil(destroy$)</code>, placed last, ends everything. In Angular, <code>visible$</code> is <code>fromEvent(document, 'visibilitychange').pipe(map(() =&gt; !document.hidden), startWith(!document.hidden))</code> and <code>destroy$</code> becomes <code>takeUntilDestroyed()</code>.</p>`,
    code: { lang: 'js', run: true, code: RX + `
const EMPTY = new Observable((s) => s.complete());
function poller(fetchFn, period) {
  return new Observable((s) => {
    let delay = period, timerId = null, inflight = null;
    const schedule = () => { timerId = setTimeout(tick, delay); };     // next call only AFTER this one ends
    const tick = () => {
      let ok = false;
      inflight = fetchFn().subscribe({
        next: (v) => { ok = true; s.next(v); },
        error: (e) => {
          delay = Math.min(delay * 2, 8 * period);                        // back off
          s.next('error: ' + e.message + ', next try in ' + delay + 'ms');
          schedule();
        },
        complete: () => { if (ok) delay = period; schedule(); }          // success resets the delay
      });
    };
    tick();                                                              // first call immediately
    return () => { clearTimeout(timerId); if (inflight) inflight.unsubscribe(); };
  });
}
function poll$(fetchFn, visible$, destroy$, period) {
  return visible$.pipe(distinctUntilChanged(), switchMap((v) => (v ? poller(fetchFn, period) : EMPTY)), takeUntil(destroy$));
}

let n = 0;
const fetchStats = () => { n++; const me = n; return me === 4 || me === 5 ? timer(5).pipe(map(() => { throw new Error('503'); })) : timer(5, 'stats #' + me); };
const visible$ = new BehaviorSubject(true), destroy$ = new Subject();
poll$(fetchStats, visible$, destroy$, 40).subscribe({ next: (v) => console.log(at(), v), complete: () => console.log(at(), 'destroyed: polling stopped for good') });
setTimeout(() => { console.log(at(), '-- tab hidden'); visible$.next(false); }, 100);
setTimeout(() => { console.log(at(), '-- tab visible'); visible$.next(true); }, 200);
setTimeout(() => { destroy$.next(); }, 500);` },
    complexity: `<p>O(1) state; at most one call in flight; zero calls while hidden.</p>`,
    followUps: ['How would you add jitter so 10,000 clients do not poll in sync?', 'When would you switch from polling to SSE or WebSockets?']
  }
});
/* =====================================================================
   QUIZ
   ===================================================================== */
quiz.push({
  q: `You write <code>const user$ = this.http.get('/api/me');</code> in a service and never subscribe. How many HTTP requests are sent?`,
  options: ['One, immediately', 'Zero, Observables are lazy', 'One per component that injects the service'],
  answer: 1,
  explain: `HttpClient returns a cold Observable. The request is only sent when something subscribes (a <code>subscribe</code>, an <code>async</code> pipe, <code>toSignal</code>, <code>firstValueFrom</code>).`
});
quiz.push({
  q: `What does <code>of(1, 2); console.log('x')</code> print when the <code>of</code> is subscribed with <code>console.log</code> before the last line runs?`,
  options: ['x, 1, 2', '1, 2, x', '1, x, 2'],
  answer: 1,
  explain: `<code>of</code> emits synchronously during <code>subscribe()</code>. Observables are not automatically asynchronous; Promises are.`
});
quiz.push({
  q: `A search box shows results for an old query after the user typed a longer one. Which operator most likely caused it?`,
  options: ['switchMap', 'mergeMap', 'debounceTime', 'distinctUntilChanged'],
  answer: 1,
  explain: `<code>mergeMap</code> keeps every request alive, so a slow response for an older query can arrive last and overwrite newer results. <code>switchMap</code> cancels the old one.`
});
quiz.push({
  q: `Which operator should handle a "Submit order" button so double-clicks never create two orders?`,
  options: ['exhaustMap', 'mergeMap', 'concatMap', 'switchMap'],
  answer: 0,
  explain: `<code>exhaustMap</code> ignores new clicks while the current request is in flight. <code>concatMap</code> would queue and still send a second order; <code>switchMap</code> cancels client-side only.`
});
quiz.push({
  q: `<code>clicks$.pipe(switchMap(() =&gt; load()), catchError(() =&gt; of([])))</code>: what happens after the first failed <code>load()</code>?`,
  options: ['The next click retries normally', 'The stream emits [] and completes, so later clicks do nothing', 'The error is swallowed and the stream keeps going unchanged'],
  answer: 1,
  explain: `An error kills the stream it travels through. catchError at the outer level replaces the whole stream with <code>of([])</code>, which completes. Put catchError inside the inner <code>load()</code> pipe.`
});
quiz.push({
  q: `A component subscribes late to a service's <code>Subject</code> that already emitted the config. What does it receive?`,
  options: ['The last config immediately', 'Nothing until the next emission', 'All past emissions'],
  answer: 1,
  explain: `A plain Subject is hot and does not store values. Use a <code>BehaviorSubject</code> or <code>ReplaySubject(1)</code> (or a signal) for state that late subscribers need.`
});
quiz.push({
  q: `Which statement about <code>BehaviorSubject</code> is TRUE?`,
  options: ['It needs no initial value', 'New subscribers immediately receive the current value, and .value reads it synchronously', 'It skips emitting a value equal to the previous one'],
  answer: 1,
  explain: `It requires an initial value, replays the current value to each new subscriber, and exposes <code>.value</code>. It does emit duplicates (add <code>distinctUntilChanged</code>).`
});
quiz.push({
  q: `Where must <code>takeUntilDestroyed()</code> (no argument) be called?`,
  options: ['Anywhere in the component', 'In an injection context such as a constructor or field initializer', 'Only inside ngOnDestroy'],
  answer: 1,
  explain: `Without an argument it calls <code>inject(DestroyRef)</code>, which requires an injection context. In <code>ngOnInit</code>, pass an injected <code>DestroyRef</code>.`
});
quiz.push({
  q: `<code>items = signal([1, 2]); items().push(3);</code> What does a <code>computed(() =&gt; items().length)</code> return when read next (it was read before the push)?`,
  options: ['3', '2 (stale, the signal did not see a change)', 'It throws'],
  answer: 1,
  explain: `The array reference did not change, so the signal never notified; the computed keeps its memoized value. Use <code>items.update(a =&gt; [...a, 3])</code>.`
});
quiz.push({
  q: `You call <code>a.set(1); a.set(2); a.set(3);</code> synchronously. How many times does <code>effect(() =&gt; log(a()))</code> run because of these writes?`,
  options: ['3 times, once per set', 'Once, with the value 3', 'Never'],
  answer: 1,
  explain: `Effects are scheduled, not run inside <code>set</code>. At the next flush they run once and read the latest value.`
});
quiz.push({
  q: `What is the type of <code>toSignal(http.get&lt;User&gt;('/me'))</code> without options?`,
  options: ['Signal&lt;User&gt;', 'Signal&lt;User | undefined&gt;', 'Observable&lt;User&gt;'],
  answer: 1,
  explain: `Until the first emission the value is <code>undefined</code>. Use <code>initialValue</code> or, for synchronous sources, <code>requireSync: true</code>.`
});
quiz.push({
  q: `Which is the best tool for "total price of the cart lines" in an Angular 17+ component?`,
  options: ['effect() that sets a total signal', 'computed(() =&gt; sum of lines())', 'A BehaviorSubject updated in every method'],
  answer: 1,
  explain: `Derived state belongs in <code>computed</code>: memoized, lazy, always consistent. Effects are for side effects to the outside world.`
});
quiz.push({
  q: `<code>{{ (order$ | async)?.id }} {{ (order$ | async)?.total }}</code> with a cold HTTP <code>order$</code> sends how many requests?`,
  options: ['1', '2', '0'],
  answer: 1,
  explain: `Each async pipe subscribes separately to the cold Observable. Use one <code>@if (order$ | async; as order)</code>, <code>shareReplay</code>, or <code>toSignal</code>.`
});
/* =====================================================================
   INTERVIEW
   ===================================================================== */
interview.push({
  q: 'What is the difference between an Observable and a Promise?',
  level: 'B',
  a: `<p>A Promise represents <b>one</b> future value (or error), is <b>eager</b> (its work starts when created), always resolves asynchronously, and cannot be cancelled. An Observable represents <b>zero to many</b> values over time, is <b>lazy</b> (nothing happens until <code>subscribe</code>), can emit synchronously or asynchronously, and can be cancelled with <code>unsubscribe()</code>, which runs its teardown (clear timers, remove listeners, abort HTTP). Observables also come with operators for composing values over time (debounce, retry, switchMap). Bridges: <code>from(promise)</code>, <code>firstValueFrom</code>/<code>lastValueFrom</code>.</p>`,
  followUps: ['What is a cold vs hot Observable?', 'Why was toPromise() deprecated?']
});
interview.push({
  q: 'Explain switchMap, mergeMap, concatMap and exhaustMap with a real example for each.',
  level: 'I',
  a: `<p>All four map each outer value to an inner Observable and flatten the results; they differ in what happens when a new value arrives while an inner one is running. <b>switchMap</b> cancels the current inner: typeahead search, loading details for the current route param. <b>mergeMap</b> runs inners in parallel (optionally limited): deleting several independent rows, uploading files with a concurrency of 3. <b>concatMap</b> queues and runs one at a time in order: sequential saves where order matters. <b>exhaustMap</b> ignores new values while busy: login or payment button, "refresh" while already refreshing. Choosing wrong causes races (mergeMap in search), lost writes (switchMap on saves) or growing queues (concatMap with a fast source).</p>`,
  followUps: ['Why is switchMap risky for POST requests?', 'Which one equals mergeMap(fn, 1)?']
});
interview.push({
  q: 'How do you avoid memory leaks with subscriptions in Angular?',
  level: 'I',
  a: `<p>Prefer not to subscribe manually: use the <code>async</code> pipe in templates (subscribes and unsubscribes with the view, works with OnPush) or <code>toSignal</code> in signal-based components (unsubscribes on destroy). When you need a side-effect subscription, end it with <code>takeUntilDestroyed()</code> as the <b>last</b> operator, called in an injection context, or with an injected <code>DestroyRef</code> elsewhere. Know which streams complete by themselves (HttpClient, <code>take(1)</code>) and which never do (intervals, router events, store selects, valueChanges, subjects in root services). Detect leaks with heap snapshots after repeated navigation and lint rules for unhandled subscriptions.</p>`,
  followUps: ['Why must takeUntilDestroyed be the last operator?', 'Do you need to unsubscribe from HttpClient calls?']
});
interview.push({
  q: 'Subject vs BehaviorSubject vs ReplaySubject: when would you use each?',
  level: 'B',
  a: `<p>All are hot, multicast Observables you can push into. <b>Subject</b> has no memory: late subscribers only see future values, which is right for events (button clicked, save requested, a destroy notifier). <b>BehaviorSubject</b> requires an initial value, gives each new subscriber the current value immediately and exposes <code>.value</code>: classic for state in services (current user, filters). <b>ReplaySubject(n, windowMs)</b> replays the last n values to late subscribers: recent notifications, cached configuration (it is what <code>shareReplay</code> builds on). Keep subjects private and expose <code>asObservable()</code>. In new Angular code, signals often replace BehaviorSubject for synchronous state.</p>`,
  followUps: ['What does a late subscriber get after complete() for each type?', 'Why expose asObservable() instead of the subject?']
});
interview.push({
  q: 'What are Angular signals, and how do signal(), computed() and effect() differ?',
  level: 'I',
  a: `<p>A signal is a reactive value container read by calling it; Angular tracks which consumers read it. <code>signal(v)</code> is writable state (<code>set</code>, <code>update</code>), skipping equal values. <code>computed(fn)</code> is read-only derived state: lazy, memoized, recomputed only when a dependency really changed, with dependencies tracked automatically and re-collected per run. <code>effect(fn)</code> runs side effects (logging, localStorage, third-party DOM libraries) once and again whenever what it read changes; it runs asynchronously during change detection flushes, coalescing multiple writes, and is destroyed with its injection context. Templates reading signals let Angular update only affected views, enabling OnPush-by-default behaviour and zoneless change detection.</p>`,
  followUps: ['Why should you not set signals inside effects to derive state?', 'What does untracked() do?']
});
interview.push({
  q: 'Signals or RxJS: how do you decide, and how do they work together?',
  level: 'A',
  a: `<p>Signals model <b>state</b>: a synchronous value that always exists, ideal for what templates display and for derived values. RxJS models <b>events and async workflows over time</b>: debouncing, cancellation, retries with backoff, combining multiple sources, WebSockets, polling. A healthy Angular 17+ codebase keeps component state in signals, keeps HTTP and complex async in RxJS pipelines, and bridges with <code>toSignal</code> (eager subscribe, unsubscribes on destroy, <code>initialValue</code>/<code>requireSync</code>, rethrows errors on read) and <code>toObservable</code> (effect-based, emits asynchronously, only the latest value per flush). For simple signal-driven fetching, <code>resource</code>/<code>httpResource</code> reduce the need for RxJS.</p>`,
  followUps: ['Why might toObservable miss values?', 'When would you still choose a Subject over a signal?']
});
interview.push({
  q: 'How would you implement a typeahead search in Angular?',
  level: 'I',
  a: `<p>Keep the input in a signal or form control. Convert to a stream (<code>toObservable(query)</code> or <code>control.valueChanges</code>), then: <code>debounceTime(300)</code>, <code>map(trim)</code>, <code>filter</code> or map short queries to empty results, <code>distinctUntilChanged()</code>, and <code>switchMap(q =&gt; api.search(q).pipe(startWith(loading), catchError(() =&gt; of(errorState))))</code>. switchMap cancels stale requests (HttpClient aborts them), the inner catchError keeps the stream alive after failures. Expose the result with <code>toSignal</code> or the async pipe so subscriptions are cleaned up. Extras: cache recent queries, highlight matches, keyboard navigation and ARIA combobox semantics.</p>`,
  followUps: ['Why not debounce the HTTP call instead of the input?', 'How would you test the debounce timing?']
});
interview.push({
  q: 'What does the async pipe do, and what are its pitfalls?',
  level: 'I',
  a: `<p>It subscribes to an Observable (or Promise) when the view renders, returns the latest value (initially <code>null</code>), calls <code>markForCheck()</code> on each emission so OnPush views update, and unsubscribes when the view is destroyed or the input Observable reference changes. Pitfalls: several async pipes on the same cold Observable create several subscriptions (duplicate HTTP calls), so use <code>@if (x$ | async; as x)</code> or share; passing a method call that returns a new Observable each change detection causes endless resubscription; the initial <code>null</code> must be handled in types and templates. In signal-based code, <code>toSignal</code> gives the same automatic cleanup with a synchronous value.</p>`,
  followUps: ['Why does the async pipe work with OnPush but a manual subscribe that sets a field may not?', 'How does it behave with zoneless change detection?']
});
interview.push({
  q: 'Explain how catchError and retry work, and where to place them.',
  level: 'I',
  a: `<p>An error terminates the Observable it travels through. <code>catchError(fn)</code> intercepts it and switches to the Observable returned by <code>fn</code> (a fallback value, EMPTY, or rethrow with <code>throwError</code>). <code>retry({ count, delay })</code> resubscribes to the source on error, optionally with a delay function for exponential backoff. Placement matters: inside the inner Observable of a flattening operator, catchError protects only that request and the outer stream (clicks, search terms) lives on; at the outer level, the first error ends the whole feature. Retry only idempotent operations and transient errors (5xx, network), not 4xx validation errors.</p>`,
  followUps: ['What is the second argument of catchError?', 'Why add jitter to backoff?']
});
interview.push({
  q: 'How does Angular\'s signal graph stay glitch-free and efficient?',
  level: 'A',
  a: `<p>It uses a push-pull algorithm with version numbers. Writing a signal increments its version and pushes a cheap "maybe dirty" mark to consumers, computing nothing. When a computed is read or an effect flushes, it pulls: for each dependency it first refreshes that dependency, then compares its version with the version recorded at the last run; only if something changed does it recompute, and it increments its own version only if its new value differs (equality cutoff). Pulling in dependency order means you never see a value computed from a mix of old and new inputs (a glitch). Dependencies are re-collected each run, so conditional branches only track what was actually read. Effects are batched, so multiple writes produce one run.</p>`,
  followUps: ['Why is laziness important for computed?', 'What happens if a computed throws?']
});
interview.push({
  q: 'Your Angular page makes the same HTTP request three times when it loads. How do you debug and fix it?',
  level: 'I',
  a: `<p>Check the Network tab initiators and search the template and code for subscriptions to the same cold Observable: multiple <code>| async</code> pipes, a <code>subscribe</code> plus an async pipe, a <code>toSignal</code> created in a getter, or a method returning a new Observable bound in the template. Fixes: subscribe once (<code>@if (data$ | async; as data)</code>), convert once with <code>toSignal</code> in a field, or share with <code>shareReplay({ bufferSize: 1, refCount: true })</code> in the service when several components need it. Also check for parent and child components each triggering the load, and for route resolvers duplicating component fetches.</p>`,
  followUps: ['What is the difference between refCount true and false in shareReplay?', 'Would a signal-based resource avoid this?']
});
interview.push({
  q: 'When should you use effect(), and what are common mistakes with it?',
  level: 'A',
  a: `<p>Use effects to synchronize signal state with things outside the signal graph: localStorage, analytics, logging, imperative DOM or third-party widgets (charts, maps), or calling non-signal APIs. Common mistakes: deriving state by setting another signal in an effect (use <code>computed</code> or <code>linkedSignal</code>), creating effects outside an injection context, accidentally tracking signals read only for context (wrap with <code>untracked</code>), expecting effects to run synchronously after <code>set</code>, subscribing to Observables inside effects without cleanup (use <code>onCleanup</code> or stay in RxJS), and creating loops where an effect writes a signal it reads.</p>`,
  followUps: ['How does onCleanup work?', 'How do you test code that relies on effects?']
});
interview.push({
  q: 'How would you design state management for a medium Angular 17+ app today?',
  level: 'E',
  a: `<p>Classify state first. Local UI state: signals in the component. Shared client state: small injectable stores with private writable signals, read-only signals and computed selectors, methods for updates (or NgRx SignalStore for more structure: <code>withState</code>, <code>withComputed</code>, <code>withMethods</code>, entity and devtools support). Server state: HttpClient plus RxJS pipelines or <code>httpResource</code>/<code>rxResource</code> for loading, caching per key, cancellation and error states; consider a query-cache library for heavy apps. Events and real-time data (WebSockets, polling): RxJS with <code>share</code>, converted with <code>toSignal</code> at the component edge. URL state via router inputs. Rules: one source of truth, derived values computed, every subscription owned by a destroy scope, and global NgRx Store only when you need strict event sourcing, time-travel debugging or very large teams.</p>`,
  followUps: ['When is classic NgRx Store still worth it?', 'How do you migrate a BehaviorSubject service to signals without breaking consumers?']
});

registerModule({
  id: 'fe19',
  title: 'RxJS & Angular Signals',
  intro: `<p>Angular apps run on two reactive engines. <b>RxJS</b> handles anything that happens <i>over time</i>: HTTP calls, search boxes, polling, WebSockets, retries. <b>Signals</b> hold state that is always available <i>right now</i> and that templates read directly. This module starts with what an Observable really is (lazy, many values, cancellable, with teardown) and moves on to the operators interviewers ask about most (<code>map</code>, <code>filter</code>, <code>debounceTime</code>, <code>catchError</code>, and the four flattening operators <code>switchMap</code>, <code>mergeMap</code>, <code>concatMap</code> and <code>exhaustMap</code>). Then it covers Subjects, the <code>async</code> pipe, avoiding leaks with <code>takeUntilDestroyed</code>, Angular signals (<code>signal</code>, <code>computed</code>, <code>effect</code>), and the bridges <code>toSignal</code>/<code>toObservable</code>. You get marble-diagram visualizers and small runnable versions of RxJS and of the signal engine, so you can see how each one works inside.</p>`,
  goals: [
    'Explain Observables vs Promises (lazy, multi-value, cancellable, sync or async) and write Observables with correct teardown',
    'Build operator pipelines with map, filter, debounceTime, distinctUntilChanged, catchError and retry, placing error handling so streams survive failures',
    'Choose correctly between switchMap, mergeMap, concatMap and exhaustMap for search, saves, payments and parallel uploads, and implement one from scratch',
    'Use Subject, BehaviorSubject and ReplaySubject appropriately and expose state safely from services',
    'Write leak-free Angular components with the async pipe, takeUntilDestroyed/DestroyRef and toSignal',
    'Model component and service state with signal, computed and effect, explain the push-pull algorithm, and bridge to RxJS with toSignal/toObservable'
  ],
  prereqs: `Module "Angular Services &amp; Dependency Injection" (fe18): <code>inject()</code>, providers, injection context and component lifecycle. Module "Event Loop &amp; async/await" (js08): Promises, microtasks vs timers, which explain why effects and <code>toObservable</code> emit asynchronously. Basic TypeScript generics help when reading the Angular examples.`,
  hours: 12,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
