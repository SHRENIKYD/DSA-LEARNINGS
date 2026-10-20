(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* =====================================================================
     SHARED EVENT-LOOP VISUALIZER KIT
     Every visualizer in this module draws the same 7 boxes:
       code (running line) · call stack · Web APIs · task queue ·
       microtask queue · console output · event-loop phase
     Two ways to make frames:
       1) elScript(code, steps)  – hand-written steps for a fixed program
       2) elSim(dslText)         – a tiny event-loop SIMULATOR that parses a
                                   mini-language, prints real JS and animates it
     ===================================================================== */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  var MAXF = 170;
  var DSL_HELP = 'One statement per line (or separated by ;). Use: log A · timeout A · timeout 100 { log A; then B } · then A then B · micro A · new { log A } then B · async { log A; await; log B } · await sleep 50 · reject E catch F · throw E · fn name { ... } · sync 30 (busy-wait 30 ms). Braces nest.';

  /* one frame with all the standard boxes */
  function elFrame(s) {
    var hl = {};
    [].concat(s.line === undefined || s.line === null ? [] : s.line).forEach(function (n) { hl[n] = s.lineCls || 'cur'; });
    var st = s.stack || [], web = s.web || [], mac = s.macro || [], mic = s.micro || [], out = s.out || [];
    var outHl = {};
    (s.outBad || []).forEach(function (i) { outHl[i] = 'bad'; });
    if (s.outNew) outHl[out.length - 1] = out[out.length - 1] && /^Uncaught/.test(out[out.length - 1]) ? 'bad' : 'ok';
    var webHl = {};
    if (s.webNew !== undefined && s.webNew !== null) webHl[String(s.webNew)] = 'ok';
    if (s.webDone !== undefined && s.webDone !== null) webHl[String(s.webDone)] = 'sel';
    var parts = [
      { type: 'code', label: 'Code — highlighted line is running now', lang: 'js', code: s.code, hl: hl },
      { type: 'stack', label: 'Call stack (the ONE thread)', items: st.slice(), hl: st.length ? one(st.length - 1, s.stackCls || 'cur') : {} },
      { type: 'set', label: 'Web APIs / host (works in the background)', items: web.slice(), hl: webHl },
      { type: 'queue', label: 'Task (macrotask) queue', items: mac.slice(), hl: s.macroHl || {}, frontLabel: 'next', backLabel: 'joins' },
      { type: 'queue', label: 'Microtask queue (VIP lane)', items: mic.slice(), hl: s.microHl || {}, frontLabel: 'next', backLabel: 'joins' },
      { type: 'array', label: 'Console output (1 = printed first)', values: out.slice(), hl: outHl, start: 1 },
      { type: 'vars', label: 'Event loop', vals: { phase: s.phase || '—', clock: (s.clock || 0) + ' ms' }, hl: s.phaseHl ? { phase: s.phaseHl } : {} }
    ];
    (s.extra || []).forEach(function (p) { parts.push(p); });
    return { narr: s.narr, parts: parts };
  }

  /* hand-written programs: steps carry the full state of every box */
  function elScript(code, steps) {
    var last = { stack: [], web: [], macro: [], micro: [], out: [], phase: 'run script', clock: 0 };
    return steps.map(function (s) {
      var cur = {};
      ['stack', 'web', 'macro', 'micro', 'out', 'phase', 'clock'].forEach(function (k) { cur[k] = s[k] !== undefined ? s[k] : last[k]; });
      last = cur;
      var o = { code: code, line: s.l, lineCls: s.cls, narr: s.narr, stack: cur.stack, web: cur.web, macro: cur.macro, micro: cur.micro, out: cur.out, phase: cur.phase, clock: cur.clock, extra: s.extra };
      if (s.outNew) o.outNew = true;
      if (s.mi !== undefined) o.microHl = s.mi;
      if (s.ma !== undefined) o.macroHl = s.ma;
      if (s.wn !== undefined) o.webNew = s.wn;
      if (s.wd !== undefined) o.webDone = s.wd;
      if (s.ph) o.phaseHl = s.ph;
      return elFrame(o);
    });
  }

  /* ------------------------- the mini-language ------------------------- */
  function elParse(src) {
    var text = String(src === undefined || src === null ? '' : src);
    if (text.length > 1500) throw new Error('Program too long (max 1500 characters). ' + DSL_HELP);
    var t = [], re = /\{|\}|;|\n|[^\s{};]+/g, mm;
    while ((mm = re.exec(text))) t.push(mm[0] === '\n' ? ';' : mm[0]);
    var i = 0, count = 0;
    function err(msg) { throw new Error(msg + ' — ' + DSL_HELP); }
    function word(what) {
      var w = t[i];
      if (w === undefined || w === '{' || w === '}' || w === ';') err('Expected ' + what + (w ? ' but found "' + w + '"' : ' at the end'));
      if (!/^[A-Za-z0-9_\-.!?:#]+$/.test(w)) err('Names may only use letters, digits and _ - . ! ? : # (got "' + w + '")');
      if (w.length > 14) err('Keep names short (max 14 chars): "' + w + '"');
      i++;
      return w;
    }
    function num(def) {
      if (t[i] !== undefined && /^\d+$/.test(t[i])) { var n = parseInt(t[i++], 10); if (n > 5000) err('Use delays up to 5000 ms'); return n; }
      return def;
    }
    function block(allowAwait) {
      if (t[i] === '{') {
        i++;
        var body = list(allowAwait, false);
        if (t[i] !== '}') err('Missing }');
        i++;
        return body;
      }
      if (++count > 45) err('Too many statements (max 45)');
      return [{ k: 'log', msg: word('a message name or { ... }') }];
    }
    function chain(allowAwait) {
      var c = [];
      while (t[i] === 'then' || t[i] === 'catch') { var kind = t[i++]; c.push({ kind: kind, body: block(false) }); }
      return c;
    }
    function stmt(allowAwait) {
      if (++count > 45) err('Too many statements (max 45)');
      var k = t[i++];
      switch (k) {
        case 'log': return { k: 'log', msg: word('a message after log') };
        case 'throw': return { k: 'throw', msg: word('an error name after throw') };
        case 'sync': { var ms = num(-1); if (ms < 0) err('sync needs a number of milliseconds, e.g. sync 30'); return { k: 'sync', ms: ms }; }
        case 'timeout': {
          /* "timeout 7" alone means: 0 ms timer that logs 7 */
          if (t[i] !== undefined && /^\d+$/.test(t[i]) && (t[i + 1] === undefined || t[i + 1] === ';' || t[i + 1] === '}')) return { k: 'timeout', ms: 0, body: block(false) };
          var d = num(0); return { k: 'timeout', ms: d, body: block(false) };
        }
        case 'micro': return { k: 'micro', body: block(false) };
        case 'then': { i--; var c1 = chain(false); return { k: 'promise', start: 'resolve', chain: c1 }; }
        case 'resolve': { var c2 = chain(false); if (!c2.length) err('resolve must be followed by then/catch'); return { k: 'promise', start: 'resolve', chain: c2 }; }
        case 'reject': { var em = word('an error name after reject'); return { k: 'promise', start: 'reject', msg: em, chain: chain(false) }; }
        case 'new': { var ex = block(false); return { k: 'promise', start: 'new', exec: ex, chain: chain(false) }; }
        case 'async': return { k: 'async', body: block(true) };
        case 'fn': { var nm = word('a function name after fn'); return { k: 'fn', name: nm, body: block(false) }; }
        case 'await':
          if (!allowAwait) err('await is only allowed directly inside async { ... }');
          if (t[i] === 'sleep') { i++; var sl = num(-1); if (sl < 0) err('await sleep needs a number, e.g. await sleep 50'); return { k: 'await', sleep: sl }; }
          return { k: 'await' };
        default: err('Unknown statement "' + k + '"');
      }
    }
    function list(allowAwait, top) {
      var out = [];
      for (;;) {
        while (t[i] === ';') i++;
        if (i >= t.length) { if (top) break; err('Missing }'); }
        if (t[i] === '}') { if (top) err('Unexpected }'); break; }
        out.push(stmt(allowAwait));
      }
      return out;
    }
    var prog = list(false, true);
    if (!prog.length) err('The program is empty');
    return prog;
  }

  /* turns the parsed program into real-looking JS and remembers each node's line */
  function elRender(prog) {
    var lines = [], usesSleep = false, usesBusy = false;
    (function scan(b) {
      b.forEach(function (n) {
        if (n.k === 'await' && n.sleep !== undefined) usesSleep = true;
        if (n.k === 'sync') usesBusy = true;
        if (n.body) scan(n.body);
        if (n.exec) scan(n.exec);
        if (n.chain) n.chain.forEach(function (c) { scan(c.body); });
      });
    })(prog);
    function emit(s, ind) { lines.push(ind + s); return lines.length; }
    if (usesSleep) emit('const sleep = (ms) => new Promise((r) => setTimeout(r, ms));', '');
    if (usesBusy) emit('const busyWait = (ms) => { const end = Date.now() + ms; while (Date.now() < end); };', '');
    if (usesSleep || usesBusy) emit('', '');
    function simple(b) { return b.length === 1 && b[0].k === 'log'; }
    function logTxt(n) { return "console.log('" + n.msg + "')"; }
    function cb(owner, prefix, args, body, suffix, ind) {
      if (simple(body)) { owner.line = owner.cbLine = owner.endLine = body[0].line = emit(prefix + args + ' => ' + logTxt(body[0]) + suffix, ind); return; }
      owner.line = owner.cbLine = emit(prefix + args + ' => {', ind);
      body.forEach(function (n) { st(n, ind + '  '); });
      owner.endLine = emit('}' + suffix, ind);
    }
    function chainLines(n, ind) {
      n.chain.forEach(function (c, j) {
        var last = j === n.chain.length - 1;
        cb(c, '.' + c.kind + '(', c.kind === 'catch' ? '(err)' : '()', c.body, ')' + (last ? ';' : ''), ind + '  ');
      });
    }
    function st(n, ind) {
      switch (n.k) {
        case 'log': n.line = emit(logTxt(n) + ';', ind); break;
        case 'throw': n.line = emit("throw new Error('" + n.msg + "');", ind); break;
        case 'sync': n.line = emit('busyWait(' + n.ms + '); // blocks the only thread', ind); break;
        case 'timeout': cb(n, 'setTimeout(', '()', n.body, ', ' + n.ms + ');', ind); break;
        case 'micro': cb(n, 'queueMicrotask(', '()', n.body, ');', ind); break;
        case 'await': n.line = emit(n.sleep !== undefined ? 'await sleep(' + n.sleep + ');' : 'await null;', ind); break;
        case 'fn':
          n.line = emit('(function ' + n.name + '() {', ind);
          n.body.forEach(function (x) { st(x, ind + '  '); });
          n.endLine = emit('})();', ind);
          break;
        case 'async':
          n.line = emit('(async () => {', ind);
          n.body.forEach(function (x) { st(x, ind + '  '); });
          n.endLine = emit('})();', ind);
          break;
        case 'promise':
          if (n.start === 'new') {
            n.line = emit('new Promise((resolve) => {', ind);
            n.exec.forEach(function (x) { st(x, ind + '  '); });
            n.resolveLine = emit('resolve();', ind + '  ');
            if (!n.chain.length) { n.endLine = emit('});', ind); break; }
            n.endLine = emit('})', ind);
            chainLines(n, ind);
            break;
          }
          var head = n.start === 'resolve' ? 'Promise.resolve()' : "Promise.reject(new Error('" + n.msg + "'))";
          if (n.chain.length === 1 && simple(n.chain[0].body)) {
            var c = n.chain[0];
            n.line = c.line = c.cbLine = c.endLine = c.body[0].line = emit(head + '.' + c.kind + '(' + (c.kind === 'catch' ? '(err)' : '()') + ' => ' + logTxt(c.body[0]) + ');', ind);
            break;
          }
          n.line = emit(head + (n.chain.length ? '' : ';'), ind);
          chainLines(n, ind);
          break;
      }
    }
    prog.forEach(function (n) { st(n, ''); });
    return lines.join('\n');
  }

  /* short human name for a callback, e.g. "A" or "cb(A…)" */
  function elName(body) {
    if (body.length === 1 && body[0].k === 'log') return body[0].msg;
    var f = null;
    (function find(b) { b.forEach(function (n) { if (!f && n.k === 'log') f = n.msg; if (!f && n.body) find(n.body); }); })(body);
    return f ? f + '…' : 'cb';
  }

  /* ------------------------- the simulator ------------------------- */
  function elSim(src, opts) {
    opts = opts || {};
    var prog = elParse(src), code = elRender(prog);
    var frames = [], stack = [], web = [], macro = [], micro = [], out = [], outBad = [];
    var pendingRej = [];
    var clock = 0, seq = 0, phase = '① run script (first task)', fresh = {};
    var STOP = { stop: true };
    function snap(narr, line, cls) {
      if (frames.length >= MAXF) throw STOP;
      var o = { code: code, line: line, lineCls: cls, narr: narr, stack: stack, web: web.map(function (w) { return w.label; }), macro: macro.map(function (m) { return m.label; }), micro: micro.map(function (m) { return m.label; }), out: out, outBad: outBad, phase: phase, clock: clock };
      if (fresh.micro) o.microHl = one(micro.length - 1, 'ok');
      if (fresh.macro) o.macroHl = one(macro.length - 1, 'ok');
      if (fresh.microRun) o.microHl = one(0, 'cur');
      if (fresh.macroRun) o.macroHl = one(0, 'cur');
      if (fresh.web) o.webNew = fresh.web;
      if (fresh.out) o.outNew = true;
      frames.push(elFrame(o));
      fresh = {};
    }
    function print(msg, bad) { out.push(msg); if (bad) outBad.push(out.length - 1); fresh.out = true; }
    function addMicro(label, run) { micro.push({ label: label, run: run }); fresh.micro = true; }
    function addTimer(ms, label, task) {
      var w = { label: '⏱ ' + label + ' · ' + ms + ' ms' + (clock ? ' (set at t=' + clock + ')' : ''), due: clock + ms, seq: seq++, task: task };
      web.push(w); fresh.web = w.label;
    }
    /* timers whose time is up move from Web APIs into the task queue */
    function expire() {
      var moved = [];
      web.sort(function (a, b) { return a.due - b.due || a.seq - b.seq; });
      while (web.length && web[0].due <= clock) { var w = web.shift(); macro.push(w.task); moved.push(w.task.label); }
      if (moved.length) fresh.macro = true;
      return moved;
    }
    /* run a list of statements; returns {thrown: msg} or {suspended: true} or {} */
    function exec(body, from, actx) {
      for (var j = from; j < body.length; j++) {
        var n = body[j], r;
        switch (n.k) {
          case 'log':
            stack.push("console.log('" + n.msg + "')");
            print(n.msg);
            snap('<b>console.log</b> is synchronous: it runs <i>right now</i> and prints <b>' + H.esc(n.msg) + '</b>.', n.line);
            stack.pop();
            break;
          case 'throw':
            snap('<span class="c-r"><b>throw</b></span> — an Error named <b>' + H.esc(n.msg) + '</b> is thrown. Everything after this line in the current function is skipped.', n.line, 'bad');
            return { thrown: n.msg };
          case 'sync':
            stack.push('busyWait(' + n.ms + ')');
            clock += n.ms;
            var moved = expire();
            snap('A <b>synchronous busy loop</b> hogs the only thread for ' + n.ms + ' ms (clock is now ' + clock + ' ms). Nothing else can run — no clicks, no paints, no callbacks.' + (moved.length ? ' Meanwhile the timer for <b>' + H.esc(moved.join(', ')) + '</b> finished, so its callback moved to the <b>task queue</b> — but it still has to wait for the stack to be empty.' : ''), n.line, 'bad');
            stack.pop();
            break;
          case 'timeout':
            stack.push('setTimeout(…, ' + n.ms + ')');
            (function (node) {
              var nm = elName(node.body);
              addTimer(node.ms, nm, { label: 'timeout ' + nm, run: function () { return runCb(node.body, node.cbLine, 'timeout ' + nm + ' callback', 'task'); } });
            })(n);
            snap('<b>setTimeout</b> does not wait. It hands the callback and a <b>' + n.ms + ' ms</b> timer to the <b>Web APIs</b> (the browser/Node does the counting), then JavaScript moves straight on to the next line.', n.line);
            stack.pop();
            break;
          case 'micro':
            stack.push('queueMicrotask(…)');
            (function (node) {
              var nm = elName(node.body);
              addMicro('micro ' + nm, function () { return runCb(node.body, node.cbLine, 'microtask ' + nm, 'micro'); });
            })(n);
            snap('<b>queueMicrotask</b> drops the callback straight into the <b>microtask queue</b> (the VIP lane). It runs after the current code finishes, before any timer.', n.line);
            stack.pop();
            break;
          case 'fn':
            stack.push(n.name + '()');
            snap('Calling <b>' + H.esc(n.name) + '()</b> pushes a new frame on the call stack. A normal call is synchronous: we finish it before going on.', n.line);
            r = exec(n.body, 0, actx);
            if (r.suspended) { stack.pop(); return r; }
            if (r.thrown) { stack.pop(); snap('<b>' + H.esc(n.name) + '()</b> did not catch the error, so its frame is popped and the error keeps bubbling up the stack.', n.endLine, 'bad'); return r; }
            stack.pop();
            snap('<b>' + H.esc(n.name) + '()</b> returns — its frame is popped off the stack.', n.endLine);
            break;
          case 'async':
            stack.push('async fn');
            snap('Calling an <b>async</b> function: its body starts running <b>synchronously</b>, right now, until the first <code>await</code>.', n.line);
            r = exec(n.body, 0, { node: n });
            stack.pop();
            if (r.thrown) {
              pendingRej.push(r.thrown);
              snap('The async function threw, so the promise it returned is <b>rejected</b>. Nobody awaits it or calls .catch → <span class="c-r">unhandled rejection</span> (reported once the microtasks are done).', n.endLine, 'bad');
            } else if (r.suspended) {
              snap('The async function is <b>paused</b> and has already handed a <b>pending promise</b> back to its caller. The caller carries on with the next line.', n.endLine);
            } else {
              snap('The async function ran to its end without awaiting, so it returns an already-<b>fulfilled</b> promise. The caller continues.', n.endLine);
            }
            break;
          case 'await':
            (function (node, body, idx, ctx) {
              var resume = function () {
                snap('The microtask runs: the async function <b>resumes</b> right after <code>await</code>, with its local variables intact.', node.line, 'ok');
                var rr = exec(body, idx + 1, ctx);
                if (rr.thrown) { pendingRej.push(rr.thrown); snap('After resuming, the async function threw → its promise rejects with nobody listening: <span class="c-r">unhandled rejection</span> (reported once the microtasks are done).', ctx.node.endLine, 'bad'); }
                else if (!rr.suspended) snap('The async function reaches its end → its promise is fulfilled.', ctx.node.endLine);
                return {};
              };
              if (node.sleep !== undefined) {
                stack.push('sleep(' + node.sleep + ')');
                addTimer(node.sleep, 'sleep', { label: 'timeout sleep→resolve', run: function () {
                  snap('The sleep timer fires as a <b>task</b>. Its only job: call <code>resolve()</code>. The paused async function cannot continue directly — its continuation is queued as a <b>microtask</b>.', node.line);
                  addMicro('resume async', resume);
                  snap('Continuation queued in the microtask queue. It runs as soon as this tiny task ends.', node.line);
                  return {};
                } });
                snap('<code>await sleep(' + node.sleep + ')</code>: sleep starts a timer in the Web APIs and returns a pending promise. <b>await</b> pauses the function and gives the thread back to the caller.', node.line);
                stack.pop();
              } else {
                addMicro('resume async', resume);
                snap('<code>await</code> on a value that is already ready still <b>pauses</b> the function. The rest of the function becomes a <b>microtask</b>; control returns to whoever called the async function.', node.line);
              }
            })(n, body, j, actx);
            return { suspended: true };
          case 'promise':
            r = runPromise(n);
            if (r.thrown) return r;
            break;
        }
      }
      return {};
    }
    function runCb(body, line, label, kind) {
      var r = exec(body, 0, null);
      if (r.thrown) {
        print('Uncaught ' + r.thrown, true);
        snap('The error escaped the ' + (kind === 'task' ? 'timer callback' : 'microtask') + ' — nobody is above it on the stack to catch it. The browser reports <span class="c-r">Uncaught ' + H.esc(r.thrown) + '</span> and the event loop simply <b>moves on</b>. (In Node.js an uncaught error like this crashes the process.)', line, 'bad');
      }
      return {};
    }
    function queueLink(n, k, state, msg) {
      var c = n.chain[k], nm = elName(c.body);
      addMicro(c.kind + ' ' + nm, function () { return runLink(n, k, state, msg); });
    }
    function runLink(n, k, state, msg) {
      var c = n.chain[k], nm = elName(c.body), newState = state, newMsg = msg;
      var matches = (c.kind === 'then' && state === 'ok') || (c.kind === 'catch' && state === 'bad');
      if (matches) {
        snap('Microtask: the <b>.' + c.kind + '</b> callback runs' + (c.kind === 'catch' ? ' and receives the error <b>' + H.esc(msg) + '</b>' : '') + '.', c.cbLine);
        var r = exec(c.body, 0, null);
        if (r.thrown) { newState = 'bad'; newMsg = r.thrown; } else { newState = 'ok'; newMsg = null; }
      } else {
        snap('Microtask: this <b>.' + c.kind + '</b> has nothing to do (the promise is ' + (state === 'ok' ? 'fulfilled, not rejected' : 'rejected, not fulfilled') + '), so it just <b>passes the result along</b>. Skipping still costs one microtask turn!', c.cbLine, 'done');
      }
      if (k + 1 < n.chain.length) {
        queueLink(n, k + 1, newState, newMsg);
        snap('The promise returned by this .' + c.kind + ' is now ' + (newState === 'ok' ? '<b>fulfilled</b>' : '<span class="c-r">rejected</span>') + ', so the <b>next</b> link (.' + n.chain[k + 1].kind + ') is queued as a new microtask — at the <b>back</b> of the line.', n.chain[k + 1].cbLine);
      } else if (newState === 'bad') {
        pendingRej.push(newMsg);
        snap('End of the chain and the promise is still rejected with no .catch → <span class="c-r">unhandled rejection</span> (reported once the microtask queue is empty).', c.endLine, 'bad');
      }
      return {};
    }
    function runPromise(n) {
      var state = 'ok', msg = null;
      if (n.start === 'new') {
        stack.push('new Promise(executor)');
        snap('<b>new Promise(executor)</b>: the executor function runs <b>immediately and synchronously</b> — promises are not lazy.', n.line);
        var r = exec(n.exec, 0, null);
        if (r.thrown) { state = 'bad'; msg = r.thrown; snap('The executor threw, so the promise becomes <span class="c-r">rejected</span> (the error is captured, not thrown outward).', n.endLine, 'bad'); }
        else snap('<code>resolve()</code> is called → the promise is now <b>fulfilled</b>. (Resolving does not run any callback by itself.)', n.resolveLine);
        stack.pop();
      } else if (n.start === 'reject') { state = 'bad'; msg = n.msg; }
      if (!n.chain.length) {
        if (state === 'bad') { pendingRej.push(msg); snap('A rejected promise with no handler → <span class="c-r">unhandled rejection</span> (reported once the microtasks are done).', n.endLine || n.line, 'bad'); }
        return {};
      }
      stack.push(n.chain[0].kind === 'then' ? '.then(cb)' : '.catch(cb)');
      queueLink(n, 0, state, msg);
      var first = n.chain[0];
      snap((n.start === 'reject' ? 'The promise is already <span class="c-r">rejected</span>' : 'The promise is already <b>fulfilled</b>') + ', so <b>.' + first.kind + '</b> puts its callback job into the <b>microtask queue</b> — it does <i>not</i> run now.' + (n.chain.length > 1 ? ' The later links wait: each one is queued only when the link before it finishes.' : ''), first.line || n.line);
      stack.pop();
      return {};
    }
    function flushRej() {
      while (pendingRej.length) {
        print('Uncaught (in promise) ' + pendingRej.shift(), true);
        snap('Microtasks are done, so the host checks for <b>rejected promises that nobody handled</b> and reports them. Browsers log it and fire an <code>unhandledrejection</code> event; Node.js 15+ <b>crashes</b> the process by default.', null, 'bad');
      }
    }
    function drain() {
      if (!micro.length) { flushRej(); return; }
      phase = '② drain ALL microtasks';
      snap('The call stack is empty. Before touching any task, the event loop <b>empties the whole microtask queue</b> — including microtasks added while draining.', null);
      while (micro.length) {
        fresh.microRun = true;
        var job = micro[0];
        snap('Take the job at the front of the microtask queue: <b>' + H.esc(job.label) + '</b>.', null);
        micro.shift();
        stack.push(job.label);
        job.run();
        stack.pop();
      }
      flushRej();
    }
    try {
      stack.push('main script');
      snap('The whole script is the <b>first task</b>. JavaScript has one call stack, so it runs the file top to bottom, one line at a time.', null);
      var r0 = exec(prog, 0, null);
      if (r0.thrown) { print('Uncaught ' + r0.thrown, true); snap('Uncaught error in the main script: the <b>rest of the script is skipped</b>. Callbacks that were already scheduled will still run.', null, 'bad'); }
      stack.pop();
      snap('The script finished, the <b>call stack is empty</b>. Now the event loop takes over.', null);
      drain();
      var guard = 0;
      while ((macro.length || web.length) && guard++ < 200) {
        var mv0 = expire();
        if (mv0.length) {
          phase = '③ timers → task queue';
          snap('Timer time is up for <b>' + H.esc(mv0.join(', ').replace(/timeout /g, '')) + '</b> (the clock is at ' + clock + ' ms), so the Web APIs copy ' + (mv0.length > 1 ? 'those callbacks' : 'that callback') + ' into the <b>task queue</b>, in the order the timers finished.', null);
        }
        if (!macro.length) {
          var nextDue = Math.min.apply(null, web.map(function (w) { return w.due; }));
          phase = '③ idle — waiting for timers';
          clock = Math.max(clock, nextDue);
          var mv = expire();
          snap('Nothing to run, so the thread sleeps. The clock reaches <b>' + clock + ' ms</b>: the timer for <b>' + H.esc(mv.join(', ').replace(/timeout /g, '')) + '</b> is done → its callback is copied into the <b>task queue</b>.', null);
        }
        phase = '③ run ONE task';
        fresh.macroRun = true;
        var task = macro[0];
        snap('The event loop picks <b>only the oldest task</b>: <b>' + H.esc(task.label) + '</b>. (One task per loop turn, then microtasks again.)', null);
        macro.shift();
        stack.push(task.label);
        task.run();
        stack.pop();
        drain();
        if (web.length) expire();
      }
      phase = '✓ done';
      snap('All boxes are empty — the program is finished. Final order: <b>' + H.esc(out.join(' → ')) + '</b>' + (opts.endNote ? '. ' + opts.endNote : ''), null, 'ok');
    } catch (e) {
      if (e !== STOP) throw e;
      frames.push(elFrame({ code: code, narr: 'Stopping here: this visualizer shows at most ' + MAXF + ' steps. Try a smaller program.', stack: stack, out: out, phase: 'trimmed' }));
    }
    return frames;
  }

  /* a "what's the order?" answer-reveal table for examples */
  function orderRow(items, hl) { return H.arr(items, { label: 'printed', hl: hl || {}, start: 1 }); }

  /* ======================================================================
     TOPIC 1 — Call stack, one thread, run-to-completion, blocking
     ====================================================================== */
  topics.push({
    title: 'The Call Stack: One Thread, Run-to-Completion & Blocking',
    analogy: `<p>Picture a small restaurant with <b>exactly one waiter</b>. The waiter can only do one thing at a time. When a customer asks for the bill, the waiter stops at the counter, prints it, comes back. If, while printing, the printer asks "which table?", the waiter answers that first, then finishes the print, then returns to the customer. The waiter keeps a little <b>pile of sticky notes</b> in his pocket: "serving table 4" → on top of it "printing bill" → on top of it "answering printer". He always works on the <b>top note</b>, and throws it away when that job is done. That pile of notes is the <b>call stack</b>.</p><p>Now imagine a customer says "wait here while I read the whole menu aloud". The waiter is stuck. Nobody else gets water, food goes cold, the door bell rings unanswered. That is a <b>blocked thread</b> — and it is exactly what a long loop does to a web page.</p>`,
    explain: `<p><b>JavaScript runs your code on one thread.</b> "Thread" just means "a worker that executes instructions one after another". One thread = one waiter. There is no second JavaScript worker secretly running another function at the same time (Web Workers are a separate, opt-in thing — more in the deep dive).</p>
<p>To keep track of "where am I?", the engine uses the <b>call stack</b>:</p>
<ul>
<li>Calling a function <b>pushes</b> a new frame (its local variables + where to return) on top.</li>
<li>When the function <b>returns</b>, its frame is <b>popped</b> off and we continue in the frame below.</li>
<li>The frame on top is the only code running right now. Last in, first out — like a stack of plates.</li>
</ul>
${H.table(['step', 'what runs', 'call stack (bottom → top)'], [
  ['1', 'script starts', 'main'],
  ['2', 'printSquare(4)', 'main → printSquare'],
  ['3', 'square(4)', 'main → printSquare → square'],
  ['4', 'multiply(4, 4)', 'main → printSquare → square → <span class="c-y">multiply</span>'],
  ['5', 'multiply returns 16', 'main → printSquare → square'],
  ['6', 'console.log(16)', 'main → printSquare → <span class="c-y">console.log</span>'],
  ['7', 'everything returns', '<span class="c-m">(empty)</span>']
])}
<p><b>Run-to-completion:</b> once a piece of JavaScript starts (a script, a click handler, a timer callback), it runs until the stack is <b>empty</b> again. Nothing can interrupt it in the middle — not a timer, not a click, not a finished network request. Those things <i>wait their turn</i> in queues (the next topics). This is a gift: you never need locks around a normal variable, because no other JS can touch it mid-function.</p>
<p>The price: <b>if your code takes long, everything waits.</b> A 2-second loop means 2 seconds where the page cannot respond to clicks, cannot repaint, and no timer callback can fire — even a <code>setTimeout(fn, 0)</code>.</p>
<p>Two famous stack errors to recognise:</p>
<ul>
<li><code>RangeError: Maximum call stack size exceeded</code> — recursion with no (or an unreachable) base case. The stack has a size limit (roughly ten thousand frames in V8, depending on frame size).</li>
<li>The <b>stack trace</b> in an error message is literally a printout of the call stack at the moment of the throw, top frame first.</li>
</ul>`,
    clues: [
      '"Is JavaScript single-threaded?" / "How can JS do many things at once if it has one thread?" → call stack + event loop',
      '"Why does my page freeze while this loop runs?" → long synchronous task blocking the only thread',
      '"Maximum call stack size exceeded" in the question → recursion depth / missing base case',
      '"Why did my setTimeout(…, 0) fire late?" → the stack was busy; timers only run when the stack is empty',
      '"Can two callbacks run at the same time / do I need a lock?" → run-to-completion: no, not on the main thread',
      '"Read this stack trace" → frames are listed top (latest call) first'
    ],
    code: [
      { lang: 'js', title: 'Watch the stack grow and shrink (runnable)', run: true, code: `// Each call pushes a frame; each return pops it.
// We print the depth so you can "see" the stack.
let depth = 0;

function multiply(a, b) {
  depth++;
  console.log('  '.repeat(depth) + 'multiply (depth ' + depth + ')');
  const result = a * b;
  depth--;            // returning = frame popped
  return result;
}

function square(n) {
  depth++;
  console.log('  '.repeat(depth) + 'square (depth ' + depth + ')');
  const result = multiply(n, n);
  depth--;
  return result;
}

function printSquare(n) {
  depth++;
  console.log('  '.repeat(depth) + 'printSquare (depth ' + depth + ')');
  const s = square(n);
  console.log('  '.repeat(depth) + 'result = ' + s);
  depth--;
}

printSquare(4);
console.log('stack is empty again, depth = ' + depth);

// Expected output:
//   printSquare (depth 1)
//     square (depth 2)
//       multiply (depth 3)
//   result = 16
// stack is empty again, depth = 0` },
      { lang: 'js', title: 'Blocking: a busy loop delays a 0 ms timer (runnable)', run: true, code: `// setTimeout(..., 0) means "as soon as possible AFTER the stack is empty",
// not "right now". A busy loop keeps the stack busy.
const start = Date.now();

setTimeout(() => {
  const waited = Date.now() - start;
  console.log('timer fired after about ' + waited + ' ms');
  console.log('waited at least 200 ms? ' + (waited >= 200));
}, 0);

// Busy-wait for 200 ms: the ONLY thread is stuck here.
while (Date.now() - start < 200) {
  // spinning... no clicks, no paints, no timers can run
}
console.log('loop done');

// Expected output (the number varies a little):
// loop done
// timer fired after about 200 ms
// waited at least 200 ms? true` }
    ],
    codeTitle: ['Call stack depth demo', 'Blocking demo'],
    viz: [
      {
        title: 'Call stack: printSquare(4) step by step',
        gen: function () {
          var code = 'function multiply(a, b) {\n  return a * b;\n}\nfunction square(n) {\n  return multiply(n, n);\n}\nfunction printSquare(n) {\n  const s = square(n);\n  console.log(s);\n}\nprintSquare(4);';
          return elScript(code, [
            { l: 11, stack: ['main script'], narr: 'The file itself runs as the first job. The engine pushes a frame for the <b>main script</b>. Function <i>declarations</i> (lines 1–10) were already set up, so we jump to line 11.' },
            { l: 7, stack: ['main script', 'printSquare(4)'], ph: 'cur', narr: 'Calling <b>printSquare(4)</b> pushes a new frame on top. Its local variable <code>n = 4</code> lives in this frame.' },
            { l: 8, stack: ['main script', 'printSquare(4)', 'square(4)'], narr: 'Line 8 calls <b>square(4)</b>. printSquare is <i>paused</i> mid-line, waiting for the answer. A new frame goes on top.' },
            { l: 5, stack: ['main script', 'printSquare(4)', 'square(4)', 'multiply(4, 4)'], narr: 'square calls <b>multiply(4, 4)</b>. Now 4 frames are stacked. Only the <b>top</b> one is actually running; the others are waiting.' },
            { l: 2, stack: ['main script', 'printSquare(4)', 'square(4)', 'multiply(4, 4)'], narr: 'multiply computes 4 × 4 = 16 and hits <code>return</code>.' },
            { l: 5, stack: ['main script', 'printSquare(4)', 'square(4)'], narr: 'multiply\'s frame is <b>popped</b>. Control goes back to square, exactly where it paused, with the value 16.' },
            { l: 8, stack: ['main script', 'printSquare(4)'], narr: 'square returns 16 and is popped. printSquare stores <code>s = 16</code>.' },
            { l: 9, stack: ['main script', 'printSquare(4)', 'console.log(16)'], out: ['16'], outNew: true, narr: '<b>console.log</b> is a function too: it is pushed, prints <b>16</b>, and pops.' },
            { l: 10, stack: ['main script'], narr: 'printSquare reaches its closing brace — popped.' },
            { l: null, stack: [], phase: '✓ done', narr: 'The script frame is popped. The stack is <b>empty</b> — only now could the event loop run anything else (timers, clicks, promise callbacks). Notice the whole thing ran <b>to completion</b> without any interruption.' }
          ]);
        }
      },
      {
        title: 'Blocking: a busy loop makes every timer late (editable)',
        input: 'log start\ntimeout 10 T10\ntimeout 0 T0\nsync 50\nlog end',
        inputLabel: 'Mini-program (log X · timeout MS X · sync MS = busy loop · then X · micro X)',
        gen: function (input) { return elSim(input, { endNote: 'Both timers were due long before 50 ms, but they had to wait until the busy loop and the script were finished.' }); }
      }
    ],
    examples: [
      {
        title: 'Reading a stack trace like a call stack',
        html: `<p>When an error is thrown, the engine snapshots the call stack. The <b>top line</b> is where it blew up; each line below is "who called that". Read it bottom-up to replay the story: main → checkout → applyCoupon. This is the single most useful debugging habit for beginners.</p>`,
        code: { lang: 'js', run: true, code: `function applyCoupon(code) {
  // Pretend this coupon is invalid
  throw new Error('Invalid coupon: ' + code);
}
function checkout() {
  applyCoupon('SAVE50');
}

try {
  checkout();
} catch (err) {
  // err.stack is a text copy of the call stack at the throw
  const lines = err.stack.split('\\n').slice(0, 3);
  console.log(lines[0]);                          // the message
  console.log('top frame mentions applyCoupon? ' + lines[1].includes('applyCoupon'));
  console.log('next frame mentions checkout? ' + lines[2].includes('checkout'));
}

// Expected output:
// Error: Invalid coupon: SAVE50
// top frame mentions applyCoupon? true
// next frame mentions checkout? true` }
      },
      {
        title: 'Stack overflow: recursion without a base case',
        html: `<p>Each recursive call adds a frame. With no stopping condition the pile grows until the engine refuses: <code>RangeError: Maximum call stack size exceeded</code>. You can catch it — the depth you reach depends on the engine and on how big each frame is (more local variables = fewer frames fit). The fix is a correct base case, or turning deep recursion into a loop with your own array as a stack.</p>`,
        code: { lang: 'js', run: true, code: `let calls = 0;
function forever() {
  calls++;
  forever();          // no base case → the stack keeps growing
}

try {
  forever();
} catch (err) {
  console.log(err.name + ': ' + err.message);
  console.log('reached more than 1000 frames? ' + (calls > 1000));
}

// The fix: an explicit base case (or a loop).
function countdown(n) {
  if (n === 0) return 'liftoff';   // base case stops the growth
  return countdown(n - 1);
}
console.log(countdown(500));

// Expected output:
// RangeError: Maximum call stack size exceeded
// reached more than 1000 frames? true
// liftoff` }
      },
      {
        title: 'Run-to-completion: no one can interrupt a function midway',
        html: `<p>Even though the timer is "due" after 0 ms, the loop below finishes all one million increments first. The timer callback sees the <b>final</b> value, never a half-way value. That is why ordinary JavaScript on the main thread never needs locks or mutexes around a variable.</p>`,
        code: { lang: 'js', run: true, code: `let counter = 0;

setTimeout(() => {
  console.log('timer sees counter = ' + counter);
}, 0);

for (let i = 0; i < 1000000; i++) {
  counter++;        // the timer cannot sneak in between iterations
}
console.log('loop finished, counter = ' + counter);

// Expected output:
// loop finished, counter = 1000000
// timer sees counter = 1000000` }
      },
      {
        title: 'The "frozen page" bug and the fix (chunking)',
        html: `<p>Processing 50 000 rows in one loop can freeze a page for seconds. The fix is to split work into <b>chunks</b> and give the thread back between chunks so clicks and paints can happen. Here we simulate it: work in chunks of 10 000, yielding with <code>setTimeout(…, 0)</code>. Another queued task (the "click") gets a turn <i>between</i> chunks instead of after everything.</p>`,
        code: { lang: 'js', run: true, code: `const rows = Array.from({ length: 50000 }, (_, i) => i);
let sum = 0, index = 0;
const CHUNK = 10000;

// Pretend a user clicks right away: this task waits for a free thread.
setTimeout(() => console.log('click handled (between chunks!)'), 0);

function processChunk() {
  const end = Math.min(index + CHUNK, rows.length);
  for (; index < end; index++) sum += rows[index];
  console.log('processed up to row ' + index);
  if (index < rows.length) {
    setTimeout(processChunk, 0);   // yield: let other tasks run first
  } else {
    console.log('done, sum = ' + sum);
  }
}
processChunk();

// Expected output:
// processed up to row 10000
// click handled (between chunks!)
// processed up to row 20000
// processed up to row 30000
// processed up to row 40000
// processed up to row 50000
// done, sum = 1249975000` }
      }
    ],
    deepDive: `<p><b>What a frame really holds.</b> Each frame is an <i>execution context</i>: the function's local variables (its lexical environment), the value of <code>this</code>, and the return address. V8 stores frames on the native machine stack; the default limit is about 1 MB in Node (<code>node --stack-size=…</code> changes it, carefully), which is "roughly ten thousand" frames for small functions. Bigger frames (many locals, many arguments) → fewer frames fit.</p>
<p><b>Tail calls.</b> ES2015 specifies proper tail calls (a call in return position reuses the frame), but only Safari's JavaScriptCore ships it. V8 and SpiderMonkey do not, so you cannot rely on it — convert deep recursion to a loop.</p>
<p><b>Stack traces.</b> V8 captures 10 frames by default (<code>Error.stackTraceLimit</code>). DevTools and Node also show <b>async stack traces</b>: after an <code>await</code>, the trace includes an "at async …" section even though the original frames were popped long ago. V8 rebuilds those from the promise chain ("zero-cost async stack traces"), so they work only through <code>await</code>, not through raw <code>.then</code> chains or <code>setTimeout</code>.</p>
<p><b>"Single-threaded" — precisely.</b> Each <i>agent</i> (a page's main thread, a Web Worker, a Node main thread or worker_thread) has one call stack and one event loop. The browser itself is heavily multi-threaded: networking, timers, decoding, compositing and GC helper threads all run in parallel. Only <i>your JS</i> on that agent is single-threaded. Real parallel JS means Web Workers / <code>worker_threads</code>, which talk by message passing; shared memory exists via <code>SharedArrayBuffer</code> + <code>Atomics</code> (requires cross-origin isolation in browsers).</p>
<p><b>Production reality.</b> Any task over <b>50 ms</b> is a "long task". Since March 2024, Google's Core Web Vitals use <b>INP (Interaction to Next Paint)</b>: a long task right when the user clicks directly worsens your score. Find them in the DevTools Performance panel (red-cornered tasks) or with the <code>PerformanceObserver</code> long-task / Long Animation Frames APIs. Fixes: chunk work and yield (<code>scheduler.yield()</code> in Chromium, <code>setTimeout</code> fallback elsewhere), move CPU work to a Worker, or make the algorithm faster.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants will happily write a "process all 100k items" loop or a recursive tree walk that looks perfect in a unit test with 10 items. They rarely think about <i>where</i> the code runs. In production that same loop freezes the UI or blows the stack on a deep tree.</p>
<p><b>Use AI as a partner:</b> ask <code>"Which parts of this function are synchronous and could block the main thread for more than 50 ms with 100k inputs? Suggest a chunked or Worker-based version."</code> or paste a stack trace and ask <code>"Explain this stack trace bottom-up as a story of calls."</code> It is great at turning recursion into an explicit-stack loop on request.</p>
<p><b>Where AI goes wrong:</b> it may claim "JavaScript is multi-threaded because of async", or suggest <code>async</code> on a CPU-heavy function as a fix — marking a function <code>async</code> does <b>not</b> move work off the thread; the loop still blocks. It may also "fix" stack overflow by raising <code>--stack-size</code>, which only hides the bug.</p>
<p><b>What you must still own:</b> the mental model of one stack, run-to-completion, and "nothing else happens until the stack is empty". Every later topic (timers, promises, await) builds on that sentence.</p>`,
    problems: [
      {
        title: 'Will the 0 ms timer fire on time?',
        level: 'Easy', tags: ['call stack', 'blocking', 'setTimeout'], companies: ['Amazon', 'Flipkart', 'Atlassian'],
        statement: `<p>Predict the exact console output, in order, and estimate when the timer callback runs:</p><pre>console.log('A');
setTimeout(() =&gt; console.log('B'), 0);
const t = Date.now();
while (Date.now() - t &lt; 100) {}   // busy for 100 ms
console.log('C');</pre>`,
        constraints: `Assume a browser or Node.js. No other code is running.`,
        example: `<p>Output: ${H.c('g', 'A')} → ${H.c('g', 'C')} → ${H.c('b', 'B')}. B prints after roughly <b>100 ms</b>, not 0 ms, because the while-loop keeps the only call stack busy; the timer callback can only run once the stack is empty.</p>`,
        brute: {
          why: `<p>The naive mental model reads top to bottom and assumes "0 ms = immediately", predicting A, B, C. That model ignores that <code>setTimeout</code> only <i>schedules</i>; it never runs a callback while other code is still on the stack.</p>`,
          code: `// WRONG mental model, written as if setTimeout ran the callback inline:
function wrongModel() {
  const out = [];
  out.push('A');
  out.push('B');      // assumes the 0 ms timer fires right here
  out.push('C');
  return out.join(' ');
}
console.log(wrongModel()); // "A B C"  <- not what really happens`
        },
        mcq: { q: 'What does the 0 in setTimeout(fn, 0) really promise?', options: ['fn runs immediately, interrupting the loop', 'fn runs no sooner than 0 ms, and only when the stack is empty', 'fn runs exactly 0 ms later', 'fn runs before any other code in the file'], answer: 1, explain: 'The delay is a minimum. The callback waits in the task queue until the call stack is empty — after the loop and after "C".' },
        hints: [
          `<p>Hint 1: Which lines are <b>synchronous</b>? Those all run first, top to bottom, before any callback.</p>`,
          `<p>Hint 2: setTimeout hands the callback to the timer system (Web APIs). When the timer finishes it can only <i>queue</i> the callback.</p>`,
          `<p>Hint 3: Recipe: write the sync output (A, C), then queued callbacks (B). The delay = time until the stack is empty ≈ 100 ms.</p>`
        ],
        tests: {"io":true,"cases":[{"stdin":"","stdout":"A\nC\nB after ~100+ ms"}]},
        solution: {
          approach: `<p>Split the code into "runs now" and "runs later". Now: log A, register timer, busy loop 100 ms, log C. The timer expired at ~0–1 ms, so its callback sits in the task queue — but the loop and the rest of the script must finish first. When the stack empties, the event loop takes B.</p>`,
          code: { lang: 'js', run: true, code: `const start = Date.now();
console.log('A');
setTimeout(() => {
  console.log('B after ~' + (Date.now() - start >= 100 ? '100+' : 'less than 100') + ' ms');
}, 0);
const t = Date.now();
while (Date.now() - t < 100) {
  // busy: the timer is ready but cannot run
}
console.log('C');

// Expected output:
// A
// C
// B after ~100+ ms` },
          dry: { head: ['time', 'call stack', 'timer / task queue', 'printed'], rows: [
            ['0 ms', 'main → console.log', '—', 'A'],
            ['0 ms', 'main → setTimeout', 'timer 0 ms starts', 'A'],
            ['1 ms', 'main (busy loop)', 'timer done → <b>B</b> waits in task queue', 'A'],
            ['100 ms', 'main → console.log', 'B waiting', 'A C'],
            ['100 ms', '(empty) → B callback', '—', '<span class="c-g">A C B</span>']
          ] },
          complexity: `<p>Reasoning cost O(lines). Runtime: the busy loop costs 100 ms of pure blocking — a "long task" that would hurt INP in a real page.</p>`,
          followUps: ['What if the loop ran for 3 seconds in a browser tab — what would the user see?', 'How would you rewrite the loop so the timer can run sooner?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 2 — Web APIs & the task (macrotask) queue
     ====================================================================== */
  topics.push({
    title: 'Web APIs & the Task (Macrotask) Queue',
    analogy: `<p>Back to our one-waiter restaurant. The waiter does <b>not</b> cook. When you order soup he writes a ticket, hands it to the <b>kitchen</b> and immediately walks off to serve other tables. The kitchen (lots of cooks working in parallel) prepares the soup. When it is ready, the cook puts the bowl on the <b>pass counter</b> with your table number — a line of finished plates waiting to be carried out. Whenever the waiter has <b>empty hands</b>, he takes the <b>oldest</b> plate from the counter and serves it.</p>
<p>The kitchen = <b>Web APIs</b> (timers, network, disk, DOM events — work done by the browser or Node, outside your JS). The pass counter = the <b>task queue</b> (also called the <i>macrotask</i> or <i>callback</i> queue). The waiter = the one JS thread. Notice: a soup that is ready early still waits if the waiter is busy at another table.</p>`,
    explain: `<p><b>Important surprise:</b> <code>setTimeout</code>, <code>fetch</code>, <code>addEventListener</code>, <code>setInterval</code> are <b>not part of the JavaScript language</b>. The JS engine (V8, SpiderMonkey, JavaScriptCore) only knows variables, functions, objects, promises. The <b>host</b> — the browser or Node.js — adds these extra powers. We call them <b>Web APIs</b> (in Node: libuv + Node APIs, same idea).</p>
<p>What happens with <code>setTimeout(cb, 1000)</code>:</p>
<ol>
<li>JS calls setTimeout (a quick function call — it returns an id immediately).</li>
<li>The host starts a 1000 ms timer <b>in the background</b>. Your JS keeps running the next lines.</li>
<li>When the timer is done, the host puts <code>cb</code> into the <b>task queue</b>. It does <b>not</b> run it yet.</li>
<li>When the call stack is empty (and microtasks are done — next topic), the <b>event loop</b> takes the oldest task and runs it.</li>
</ol>
${H.table(['Goes to the Web APIs', 'When done, its callback becomes a…'], [
  ['setTimeout / setInterval', 'task (timer task source)'],
  ['click, keydown, scroll… (addEventListener)', 'task (user-interaction source)'],
  ['XMLHttpRequest, WebSocket message, postMessage, MessageChannel', 'task'],
  ['fetch(…)', 'promise resolution → its .then is a <b>microtask</b> (next topic)'],
  ['Node: fs.readFile callback, setImmediate', 'callback in a libuv phase (task-like)']
])}
<p><b>Key rules for timers:</b></p>
<ul>
<li>The delay is a <b>minimum</b>, never a guarantee. "Run no sooner than X ms, and only when the thread is free."</li>
<li>Timers that finish at different times are queued in <b>finish order</b> (shorter delay first, if started together).</li>
<li>Timers with the <b>same</b> delay run in the order they were <b>created</b> (FIFO).</li>
<li>The event loop runs <b>one task per turn</b>, then checks microtasks, maybe repaints, then the next task.</li>
</ul>
<p>The word <i>macrotask</i> is interview slang — the HTML spec just says <b>task</b>. Both mean "a callback the event loop picks from a task queue, one at a time".</p>`,
    clues: [
      '"Is setTimeout part of JavaScript?" → no, it is a host (Web/Node) API',
      '"Where does the callback wait after the timer finishes?" → the task (macrotask / callback) queue',
      '"Why didn’t setTimeout(fn, 1000) run after exactly 1 second?" → delay is a minimum; the stack/queue was busy',
      '"Two timers with the same delay — which first?" → FIFO in creation order',
      '"setTimeout(fn, 0) vs running fn() directly" → deferred to a later task vs synchronous now',
      '"setInterval drifts / overlaps" → use recursive setTimeout, schedule against a target time'
    ],
    code: [
      { lang: 'js', title: 'Timers are queued by finish time, ties by creation order (runnable)', run: true, code: `console.log('script start');

setTimeout(() => console.log('timeout 100 ms'), 100);
setTimeout(() => console.log('timeout 0 ms (first created)'), 0);
setTimeout(() => console.log('timeout 50 ms'), 50);
setTimeout(() => console.log('timeout 0 ms (second created)'), 0);

console.log('script end');

// Expected output:
// script start
// script end
// timeout 0 ms (first created)
// timeout 0 ms (second created)
// timeout 50 ms
// timeout 100 ms` }
    ],
    codeTitle: ['Timer ordering'],
    viz: [
      {
        title: 'Timers travel: Web APIs → task queue → call stack (editable)',
        input: 'log start\ntimeout 100 slow\ntimeout 0 fast\ntimeout 50 mid\nlog end',
        inputLabel: 'Mini-program (log X · timeout MS X · timeout MS { ... } · sync MS)',
        gen: function (input) { return elSim(input, { endNote: 'Callbacks ran in the order their timers FINISHED, never before the script ended.' }); }
      },
      {
        title: 'A timer that schedules another timer (editable)',
        input: 'log go\ntimeout 10 { log outer; timeout 0 inner }\ntimeout 10 sibling',
        inputLabel: 'Mini-program',
        gen: function (input) { return elSim(input, { endNote: 'inner was created later (inside outer), so it joins the back of the line behind sibling.' }); }
      }
    ],
    examples: [
      {
        title: 'setTimeout(fn, 0) vs calling fn() directly',
        html: `<p><code>fn()</code> runs <b>now</b>, inside the current task. <code>setTimeout(fn, 0)</code> runs fn in a <b>future task</b>, after everything currently on the stack (and all microtasks). People use the 0-delay timer to "defer" work until after the current code — but it is a coarse tool: in browsers, after 5 nested levels the minimum becomes 4 ms, and in Node a 0 delay is treated as 1 ms.</p>`,
        code: { lang: 'js', run: true, code: `function greet(who) { console.log('hello ' + who); }

greet('now');                       // synchronous call
setTimeout(() => greet('later'), 0); // deferred to a future task
console.log('end of script');

// Expected output:
// hello now
// end of script
// hello later` }
      },
      {
        title: 'A timer inside a timer goes to the back of the line',
        html: `<p>Callbacks created <i>during</i> a task join the queue <b>behind</b> callbacks that already exist. Below, both outer timers were created by the script; inner is created only when T1 runs, so T2 (already waiting) goes first.</p>`,
        code: { lang: 'js', run: true, code: `setTimeout(() => {
  console.log('T1');
  setTimeout(() => console.log('inner (created inside T1)'), 0);
}, 0);
setTimeout(() => console.log('T2'), 0);

// Expected output:
// T1
// T2
// inner (created inside T1)` }
      },
      {
        title: 'setInterval vs recursive setTimeout',
        html: `<p><code>setInterval(fn, 100)</code> tries to start fn every 100 ms no matter how long fn takes; if fn is slow, runs bunch up (browsers skip piled-up repeats, but the spacing becomes uneven). A <b>recursive setTimeout</b> schedules the next run only after the current one finishes, guaranteeing a gap. Always keep the id so you can stop it with <code>clearInterval</code>/<code>clearTimeout</code>.</p>`,
        code: { lang: 'js', run: true, code: `let ticks = 0;
const id = setInterval(() => {
  ticks++;
  console.log('interval tick ' + ticks);
  if (ticks === 3) {
    clearInterval(id);          // forget this and it runs forever
    startPolling();
  }
}, 20);

function startPolling() {
  let polls = 0;
  function poll() {
    polls++;
    console.log('poll ' + polls + ' (next one scheduled only after this finishes)');
    if (polls < 3) setTimeout(poll, 20);
  }
  setTimeout(poll, 20);
}

// Expected output:
// interval tick 1
// interval tick 2
// interval tick 3
// poll 1 (next one scheduled only after this finishes)
// poll 2 (next one scheduled only after this finishes)
// poll 3 (next one scheduled only after this finishes)` }
      },
      {
        title: 'Event listeners also produce tasks (browser)',
        html: `<p>A real user click is delivered as a <b>task</b>: the browser queues "dispatch click" and the event loop runs your listener when the thread is free. That is why a page busy in a long loop ignores clicks until the loop ends — then all the queued clicks fire in a burst. (DOM code, so not runnable here.)</p>`,
        code: { lang: 'js', code: `const button = document.querySelector('#buy');

button.addEventListener('click', () => {
  console.log('click handled');       // runs as its own task
});

// Simulate a long task: clicks during these 3 seconds wait in the queue
const end = Date.now() + 3000;
while (Date.now() < end) { /* frozen UI */ }
console.log('long task finished');    // queued clicks run after this` }
      }
    ],
    deepDive: `<p><b>Many task queues, not one.</b> The HTML spec says an event loop has <i>one or more task queues</i>, grouped by <b>task source</b> (timers, user interaction, networking, DOM manipulation, history…). Within one source, order is FIFO. <i>Between</i> sources the browser may choose — Chromium gives input events higher priority so the page feels responsive. So "the macrotask queue" is a teaching simplification; the guarantee you can rely on is FIFO within a source, and one task at a time.</p>
<p><b>Timer clamping (browsers).</b> If timers are nested more than 5 levels deep (a timeout scheduling a timeout scheduling…), the minimum delay becomes <b>4 ms</b>. Background tabs are throttled to about once per second, and Chrome's "intensive throttling" can batch chained timers in hidden pages to once per minute. Delays larger than 2<sup>31</sup>−1 ms (~24.8 days) overflow and fire almost immediately (Node prints a <code>TimeoutOverflowWarning</code> and uses 1 ms).</p>
<p><b>Timers in Node.</b> libuv keeps timers in a min-heap keyed by expiry; Node groups timers with the same duration into linked lists. A delay of 0 (or anything below 1, or above the max) becomes 1 ms. <code>setTimeout</code> returns a <code>Timeout</code> object with <code>.unref()</code> (do not keep the process alive for me) and <code>.refresh()</code>; browsers return a plain number.</p>
<p><b>Faster "next task" tricks.</b> <code>MessageChannel</code> posts a message to yourself — a task with no 4 ms clamp; React's scheduler uses it. <code>scheduler.postTask(cb, { priority })</code> (Chromium) and <code>scheduler.yield()</code> (Chromium 129+) give real priorities. In Node, <code>setImmediate</code> runs in the "check" phase right after I/O polling.</p>
<p><b>Accuracy.</b> Timers are not real-time: OS timer resolution, CPU power saving, long tasks and GC pauses all add lateness. For animation use <code>requestAnimationFrame</code>; for precise scheduling compute against <code>performance.now()</code> and correct drift each tick.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools generate polling loops, retry helpers and debounce functions instantly — nearly all built on timers. The bugs they ship are timing bugs: intervals never cleared (memory leaks in single-page apps), retries without backoff, or "wait for the DOM" hacks using <code>setTimeout(…, 0)</code> that work on a fast laptop and fail on a slow phone.</p>
<p><b>Use AI as a partner:</b> <code>"List every timer this component creates and show me where each one is cleared on unmount."</code> or <code>"Rewrite this setInterval poller as a recursive setTimeout with exponential backoff and an AbortSignal."</code> Ask it to draw the queue state for a snippet and compare with your own drawing.</p>
<p><b>Where AI goes wrong:</b> it often says "setTimeout(fn, 1000) runs after exactly one second", forgets the 4 ms nested clamp and background-tab throttling, and confuses Node's <code>setImmediate</code> with browser APIs (browsers do not have it).</p>
<p><b>What you must still own:</b> knowing that timers are host APIs, that delays are minimums, and that every callback waits for an empty stack. That is what lets you judge whether generated timing code is correct.</p>`,
    problems: [
      {
        title: 'Order four timers with mixed delays',
        level: 'Easy', tags: ['setTimeout', 'task queue'], companies: ['Microsoft', 'Swiggy', 'Paytm'],
        statement: `<p>Predict the output order:</p><pre>setTimeout(() =&gt; console.log('W'), 300);
setTimeout(() =&gt; console.log('X'), 0);
console.log('Y');
setTimeout(() =&gt; console.log('Z'), 100);
setTimeout(() =&gt; console.log('Q'), 0);</pre>`,
        constraints: `The script itself takes a few ms at most. No other code runs. (Delays are counted from the moment each setTimeout is <i>called</i>.)`,
        example: `<p>Output: ${H.c('g', 'Y')} → ${H.c('b', 'X')} → ${H.c('b', 'Q')} → ${H.c('b', 'Z')} → ${H.c('b', 'W')}. Sync first; then timers by finish time (0, 0, 100, 300); the two 0 ms timers keep their creation order.</p>`,
        brute: {
          why: `<p>Reading strictly top to bottom gives W X Y Z Q — it pretends every callback runs where it is written. It ignores that all callbacks wait for the script to finish and are then ordered by <b>finish time</b>.</p>`,
          code: `// Top-to-bottom reading (wrong): treat each callback as inline
const naive = ['W', 'X', 'Y', 'Z', 'Q'];
console.log(naive.join(' '));   // W X Y Z Q  <- incorrect`
        },
        mcq: { q: 'Two timers both use delay 0. Which runs first?', options: ['The one created first', 'The one created last', 'Random', 'Both at the same time on two threads'], answer: 0, explain: 'Timers with equal delays expire in creation order, and their tasks are queued FIFO.' },
        hints: [
          `<p>Hint 1: Only one line is synchronous. It prints first.</p>`,
          `<p>Hint 2: Each timer callback is queued when its delay finishes. Sort the timers by delay.</p>`,
          `<p>Hint 3: Ties (same delay) keep creation order. Recipe: sync lines → sort timers by (delay, creation index).</p>`
        ],
        tests: {"io":true,"cases":[{"stdin":"","stdout":"Y\nX\nQ\nZ\nW"}]},
        solution: {
          approach: `<p>Sort timers by <b>(start time + delay, creation order)</b>. All were started at ~0 ms, so sort by delay: X(0, #2), Q(0, #4), Z(100), W(300). Sync Y prints before any of them.</p>`,
          code: { lang: 'js', run: true, code: `setTimeout(() => console.log('W'), 300);
setTimeout(() => console.log('X'), 0);
console.log('Y');
setTimeout(() => console.log('Z'), 100);
setTimeout(() => console.log('Q'), 0);

// Expected output:
// Y
// X
// Q
// Z
// W` },
          dry: { head: ['time', 'event', 'task queue', 'printed'], rows: [
            ['0 ms', 'script runs, 4 timers start', '—', 'Y'],
            ['~1 ms', 'X and Q timers finish', 'X, Q', 'Y'],
            ['~1 ms', 'loop runs X, then Q', '—', 'Y X Q'],
            ['100 ms', 'Z finishes → queued → runs', '—', 'Y X Q Z'],
            ['300 ms', 'W finishes → queued → runs', '—', '<span class="c-g">Y X Q Z W</span>']
          ] },
          complexity: `<p>Ordering n timers is effectively a sort by (due time, creation index): O(n log n) to reason about; libuv uses a min-heap for exactly this.</p>`,
          followUps: ['What changes if a 250 ms busy loop runs right after console.log(\'Y\')? (Hint: Z is created later, so its 100 ms starts later.)', 'What if Z’s callback created a new 0 ms timer?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 3 — The microtask queue
     ====================================================================== */
  topics.push({
    title: 'The Microtask Queue: Promises, queueMicrotask & the VIP Lane',
    analogy: `<p>Next to the pass counter (task queue) our waiter wears a <b>clipboard of urgent notes</b>: "table 3 asked for salt", "table 5 wants the bill split". Rule of the house: <b>after finishing any job, before picking up the next plate, the waiter handles every urgent note on the clipboard</b> — including any new urgent notes that get added while he is handling them. Plates on the counter wait, no matter how long they have been there.</p>
<p>That clipboard is the <b>microtask queue</b>. Promise callbacks (<code>.then</code>, <code>.catch</code>, <code>.finally</code>), the code after an <code>await</code>, and <code>queueMicrotask</code> all go there. It is the VIP lane: small, urgent follow-ups that must happen "right after the current code, before anything else".</p>`,
    explain: `<p>There are <b>two</b> waiting lines in the event loop, not one:</p>
${H.table(['', 'Task queue (macrotasks)', 'Microtask queue'], [
  ['Who goes there', 'setTimeout, setInterval, events, messages, I/O', 'Promise .then/.catch/.finally, code after await, queueMicrotask, MutationObserver'],
  ['When it is served', 'ONE task per loop turn', 'ALL microtasks, every time the stack becomes empty'],
  ['New items added while serving', 'wait for a later turn', 'run in the <b>same</b> drain (before any task)'],
  ['Analogy', 'plates on the pass counter', 'urgent notes on the clipboard']
])}
<p><b>The golden rule:</b> whenever the call stack becomes empty, the engine runs the <b>entire</b> microtask queue until it is empty, and only then lets the event loop pick the next task (or repaint the screen).</p>
<p>So in this code:</p>
<pre>setTimeout(() =&gt; console.log('timeout'), 0);
Promise.resolve().then(() =&gt; console.log('promise'));
console.log('sync');</pre>
<p>the order is <b>sync → promise → timeout</b>. The timer was created first, but the promise callback is a microtask and microtasks always cut in front of tasks.</p>
<p><b>Why does .then never run immediately, even on a promise that is already resolved?</b> Consistency. If <code>.then</code> sometimes ran synchronously and sometimes later, code after it would behave differently depending on timing (this bug pattern is nicknamed "releasing Zalgo"). Promises promise: <i>your callback always runs asynchronously, after the current code finishes</i>.</p>
<p><b>queueMicrotask(fn)</b> is the direct way to add a microtask without creating a promise. It shares the <b>same FIFO queue</b> as promise callbacks, so order is simply "who was queued first".</p>
<p><b>Danger — starvation:</b> because microtasks added during the drain also run before any task, a microtask that keeps queueing another microtask will <b>never</b> let timers, clicks or rendering happen. The page freezes just like an infinite loop — even though each piece of code is "async".</p>`,
    clues: [
      '"Why does Promise.then run before setTimeout(…, 0)?" → microtask queue is drained before the next task',
      '"What is queueMicrotask / when would you use it?" → schedule work right after the current code, before tasks and rendering',
      '"Can microtasks block rendering / starve the event loop?" → yes, a self-refilling microtask queue never ends',
      '"MutationObserver callback timing" → microtask',
      '"Is .then on an already-resolved promise synchronous?" → never; always queued as a microtask',
      '"Vue nextTick / batching updates" → microtask-based batching'
    ],
    code: [
      { lang: 'js', title: 'Microtasks always beat tasks (runnable)', run: true, code: `console.log('1: sync start');

setTimeout(() => console.log('6: timeout (task)'), 0);

Promise.resolve().then(() => console.log('3: promise.then (microtask)'));

queueMicrotask(() => {
  console.log('4: queueMicrotask (microtask)');
  // A microtask added DURING the drain still runs before the timeout
  queueMicrotask(() => console.log('5: nested microtask'));
});

console.log('2: sync end');

// Expected output:
// 1: sync start
// 2: sync end
// 3: promise.then (microtask)
// 4: queueMicrotask (microtask)
// 5: nested microtask
// 6: timeout (task)` }
    ],
    codeTitle: ['Two queues, one winner'],
    viz: [
      {
        title: 'Microtasks drain completely before the next task (editable)',
        input: 'log s\ntimeout T\nmicro { log m1; micro m2 }\nthen p1 then p2\nlog e',
        inputLabel: 'Mini-program (micro X · then X then Y · timeout X · log X · braces nest)',
        gen: function (input) { return elSim(input, { endNote: 'Every microtask — even ones created while draining — ran before the timer task T.' }); }
      },
      {
        title: 'Starvation: microtasks that keep adding microtasks (editable)',
        input: 'timeout T\nmicro { log m1; micro { log m2; micro { log m3; micro { log m4; micro m5 } } } }',
        inputLabel: 'Mini-program',
        gen: function (input) { return elSim(input, { endNote: 'The timer was ready at 0 ms but had to wait for the whole microtask chain. An endless chain = a frozen page.' }); }
      },
      {
        title: 'Real user click: microtasks run BETWEEN two listeners',
        gen: function () {
          var code = "// <div id=outer><div id=inner></div></div>\nfunction onClick() {\n  console.log('click');\n  setTimeout(() => console.log('timeout'), 0);\n  Promise.resolve().then(() => console.log('promise'));\n}\ninner.addEventListener('click', onClick);\nouter.addEventListener('click', onClick);\n// the USER clicks on inner (event bubbles to outer)";
          return elScript(code, [
            { l: 9, stack: [], phase: '③ run ONE task', narr: 'The user clicks. The browser queues a <b>task</b>: "dispatch click". When the thread is free the event loop starts it. Dispatching is done by the browser itself, so <b>no JS frame</b> is on the stack between listeners.' },
            { l: 2, stack: ['onClick (inner)'], narr: 'The browser calls the first listener (on <b>inner</b>). The stack now has one JS frame.' },
            { l: 3, stack: ['onClick (inner)', 'console.log'], out: ['click'], outNew: true, narr: 'Prints <b>click</b>.' },
            { l: 4, stack: ['onClick (inner)', 'setTimeout'], web: ['⏱ timeout · 0 ms'], wn: '⏱ timeout · 0 ms', narr: 'setTimeout hands a timer to the Web APIs.' },
            { l: 5, stack: ['onClick (inner)', '.then(cb)'], micro: ['then promise'], mi: { 0: 'ok' }, narr: '.then on a resolved promise → callback joins the <b>microtask queue</b>.' },
            { l: 6, stack: [], web: [], macro: ['timeout'], ma: { 0: 'ok' }, phase: '② microtask checkpoint', narr: 'The listener returns and the JS stack is <b>empty</b> (the browser is between listeners). Rule: an empty stack after a callback ⇒ <b>microtask checkpoint</b>. (Meanwhile the 0 ms timer finished, so its callback waits in the task queue.)' },
            { l: 5, stack: ['then promise'], micro: [], out: ['click', 'promise'], outNew: true, narr: 'So <b>promise</b> prints <i>before</i> the second listener even starts!' },
            { l: 2, stack: ['onClick (outer)'], phase: '③ same task continues', narr: 'The event bubbles: the browser calls the listener on <b>outer</b> — still inside the same click task.' },
            { l: 3, stack: ['onClick (outer)', 'console.log'], out: ['click', 'promise', 'click'], outNew: true, narr: 'Prints <b>click</b> again.' },
            { l: 5, stack: ['onClick (outer)'], macro: ['timeout', 'timeout'], micro: ['then promise'], mi: { 0: 'ok' }, ma: { 1: 'ok' }, narr: 'Another timer (already done → queued behind the first) and another microtask.' },
            { l: 5, stack: ['then promise'], micro: [], out: ['click', 'promise', 'click', 'promise'], outNew: true, phase: '② microtask checkpoint', narr: 'Listener returns → stack empty → checkpoint → <b>promise</b>.' },
            { l: 4, stack: ['timeout'], macro: ['timeout'], out: ['click', 'promise', 'click', 'promise', 'timeout'], outNew: true, phase: '③ run ONE task', narr: 'The click task is over. Next loop turn: first timer task.' },
            { l: 4, stack: ['timeout'], macro: [], out: ['click', 'promise', 'click', 'promise', 'timeout', 'timeout'], outNew: true, narr: 'Next turn: second timer task.' },
            { l: null, stack: [], phase: '✓ done', narr: 'Final: click, promise, click, promise, timeout, timeout. <b>Twist:</b> if JS calls <code>inner.click()</code> instead of a real user, the calling script stays on the stack during both listeners, so no checkpoint happens between them → click, click, promise, promise, timeout, timeout.' }
          ]);
        }
      }
    ],
    examples: [
      {
        title: 'then and queueMicrotask share ONE FIFO queue',
        html: `<p>There is no priority between promise callbacks and <code>queueMicrotask</code> callbacks — they are in the same line, served in the order they were queued.</p>`,
        code: { lang: 'js', run: true, code: `Promise.resolve().then(() => console.log('then 1'));
queueMicrotask(() => console.log('queueMicrotask'));
Promise.resolve().then(() => console.log('then 2'));
console.log('sync');

// Expected output:
// sync
// then 1
// queueMicrotask
// then 2` }
      },
      {
        title: 'A timer waits for 100 000 microtasks',
        html: `<p>The timer is ready almost immediately, but the microtask queue keeps refilling itself 100 000 times. The timer only runs after the chain stops. Make the chain infinite and the timer (and, in a browser, every click and repaint) never runs — classic <b>microtask starvation</b>.</p>`,
        code: { lang: 'js', run: true, code: `let n = 0;
setTimeout(() => console.log('timer finally ran after ' + n + ' microtasks'), 0);

function spin() {
  n++;
  if (n < 100000) queueMicrotask(spin);  // keeps the VIP lane busy
}
queueMicrotask(spin);

// Expected output:
// timer finally ran after 100000 microtasks` }
      },
      {
        title: 'Batching many updates into one microtask (how frameworks do it)',
        html: `<p>Vue's <code>nextTick</code> and many state libraries batch changes: the first change schedules <b>one</b> microtask flush; later changes in the same synchronous run just add to the batch. The flush runs once, after your code, before the browser paints — so the user never sees half-updated UI and the DOM is touched only once.</p>`,
        code: { lang: 'js', run: true, code: `const pending = new Set();
let flushScheduled = false;

function markDirty(component) {
  pending.add(component);
  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(flush);    // one flush for the whole synchronous burst
  }
}

function flush() {
  console.log('re-render once: ' + [...pending].join(', '));
  pending.clear();
  flushScheduled = false;
}

markDirty('Header');
markDirty('Cart');
markDirty('Header');          // duplicate is ignored by the Set
console.log('three updates requested');

// Expected output:
// three updates requested
// re-render once: Header, Cart` }
      },
      {
        title: 'MutationObserver callbacks are microtasks (browser)',
        html: `<p>DOM changes made in one synchronous run are collected and delivered to a MutationObserver in <b>one microtask</b>, after your code — not once per change. (DOM code, not runnable here.)</p>`,
        code: { lang: 'js', code: `const list = document.querySelector('#list');
const observer = new MutationObserver((records) => {
  console.log('observer saw ' + records.length + ' changes');   // runs as a microtask
});
observer.observe(list, { childList: true });

list.append(document.createElement('li'));
list.append(document.createElement('li'));
console.log('sync code done');
// Logs: "sync code done", then "observer saw 2 changes"` }
      }
    ],
    deepDive: `<p><b>Spec words.</b> ECMAScript calls these <i>Jobs</i>: promise reactions are queued with <code>HostEnqueuePromiseJob</code>; the host (HTML or Node) decides that they go on its microtask queue. HTML defines a <b>microtask checkpoint</b>: run microtasks until the queue is empty; a flag prevents re-entering a checkpoint that is already running.</p>
<p><b>When exactly does a checkpoint happen?</b> (1) after each task, as a step of the event loop; (2) whenever a callback that the browser invoked returns and the JavaScript execution context stack is empty ("clean up after running script"). Rule (2) explains the two-listeners puzzle: user clicks give a checkpoint between listeners; <code>el.click()</code> from script does not, because the caller is still on the stack. Also after each <code>&lt;script&gt;</code> element runs.</p>
<p><b>Microtasks block rendering.</b> Rendering ("update the rendering": rAF callbacks, style, layout, paint) happens <i>between tasks</i>, never during a microtask drain. A 200 ms microtask chain is as bad for INP as a 200 ms loop. Use a task (<code>setTimeout</code>, <code>MessageChannel</code>, <code>scheduler.yield()</code>) when you <i>want</i> the browser to breathe.</p>
<p><b>Errors.</b> An exception thrown inside a <code>queueMicrotask</code> callback is reported like any uncaught exception (<code>window.onerror</code> / Node <code>uncaughtException</code>) — not as a promise rejection. An exception inside a <code>.then</code> callback instead rejects the promise returned by <code>.then</code>.</p>
<p><b>Node.js has an extra, even-higher lane:</b> <code>process.nextTick</code>. After each callback, Node empties the nextTick queue first, then the promise microtask queue, repeating until both are empty. So in CommonJS: <code>nextTick</code> callbacks beat <code>.then</code> callbacks. Since Node 11, microtasks also run between individual <code>setTimeout</code> callbacks, matching browsers.</p>
<p><b>Why not use microtasks for everything?</b> They are perfect for "after this synchronous burst, before anyone else looks" (batching, consistency). They are terrible for "let the browser do other things in the meantime" — that is a task's job.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code chains promises and <code>await</code>s everywhere, which means huge amounts of work silently runs as microtasks. AI also likes "fixes" such as <code>await Promise.resolve()</code> to "let the UI update" — which does <b>not</b> yield to rendering at all, because it is just another microtask.</p>
<p><b>Use AI as a partner:</b> ask <code>"For each callback in this file, label it sync / microtask / task, and explain where rendering can happen."</code> Then verify one or two by running the snippet. Ask it to convert a recursive promise loop into a chunked task loop with <code>scheduler.yield()</code> and a <code>setTimeout</code> fallback.</p>
<p><b>Where AI goes wrong:</b> claiming <code>queueMicrotask</code> is "like setTimeout 0", claiming promise callbacks can run synchronously when the promise is already resolved, or forgetting Node's <code>process.nextTick</code> priority when the interviewer says "in Node".</p>
<p><b>What you must still own:</b> the two-queue model and the sentence "all microtasks, then one task". Interviewers love asking you to justify a single line of output with it.</p>`,
    problems: [
      {
        title: 'Nested microtasks vs a 0 ms timer',
        level: 'Easy', tags: ['microtask', 'queueMicrotask', 'promise'], companies: ['Google', 'Uber', 'Razorpay'],
        statement: `<p>Predict the exact output:</p><pre>setTimeout(() =&gt; console.log('T'), 0);
queueMicrotask(() =&gt; {
  console.log('M1');
  queueMicrotask(() =&gt; console.log('M3'));
});
Promise.resolve().then(() =&gt; console.log('M2'));
console.log('S');</pre>`,
        constraints: `Browser or Node.js (CommonJS). No other code.`,
        example: `<p>Output: ${H.c('g', 'S')} → ${H.c('p', 'M1')} → ${H.c('p', 'M2')} → ${H.c('p', 'M3')} → ${H.c('b', 'T')}. M3 is queued while draining, so it goes behind M2 — but still before the timer task.</p>`,
        brute: {
          why: `<p>A "one queue" model (everything async goes in a single FIFO line in creation order) predicts S T M1 M2 M3, because the timer was created first. It forgets that microtasks are a separate, higher-priority queue drained completely before any task.</p>`,
          code: `// One-queue model (wrong): sort async callbacks by creation order only
const createdOrder = ['T', 'M1', 'M2'];
console.log(['S'].concat(createdOrder, ['M3']).join(' '));  // S T M1 M2 M3  <- incorrect`
        },
        mcq: { q: 'M3 is queued while M1 is running. When does it run?', options: ['After the timer T', 'Immediately inside M1', 'At the back of the microtask queue, after M2, before T', 'Never'], answer: 2, explain: 'New microtasks join the back of the current microtask queue and are drained in the same checkpoint, before any task.' },
        hints: [
          `<p>Hint 1: Separate the callbacks into two lines: microtasks (M1, M2) and tasks (T).</p>`,
          `<p>Hint 2: After the script, drain microtasks FIFO. Anything queued during the drain joins the back.</p>`,
          `<p>Hint 3: Recipe: sync → microtasks (keep adding new ones to the back) → one task → repeat.</p>`
        ],
        tests: {"io":true,"cases":[{"stdin":"","stdout":"S\nM1\nM2\nM3\nT"}]},
        solution: {
          approach: `<p>Sync: S. Microtask queue after the script: [M1, M2]. Run M1 → prints M1, queues M3 → [M2, M3]. Run M2, then M3. Queue empty → task T.</p>`,
          code: { lang: 'js', run: true, code: `setTimeout(() => console.log('T'), 0);
queueMicrotask(() => {
  console.log('M1');
  queueMicrotask(() => console.log('M3'));
});
Promise.resolve().then(() => console.log('M2'));
console.log('S');

// Expected output:
// S
// M1
// M2
// M3
// T` },
          dry: { head: ['step', 'running', 'microtask queue', 'task queue', 'printed'], rows: [
            ['1', 'script', 'M1, M2', 'T', 'S'],
            ['2', 'M1', 'M2, M3', 'T', 'S M1'],
            ['3', 'M2', 'M3', 'T', 'S M1 M2'],
            ['4', 'M3', '—', 'T', 'S M1 M2 M3'],
            ['5', 'T', '—', '—', '<span class="c-g">S M1 M2 M3 T</span>']
          ] },
          complexity: `<p>Each callback runs exactly once: O(number of callbacks). The microtask drain is a simple FIFO loop.</p>`,
          followUps: ['Replace queueMicrotask(M3) with setTimeout(M3, 0): where does M3 land now?', 'In Node, add process.nextTick(() =&gt; console.log(\'N\')) at the end — where does N go?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 4 — The event loop algorithm (browser + Node.js)
     ====================================================================== */
  function loopGraph(hlNode, hlEdge) {
    var ehl = {}; if (hlEdge) ehl[hlEdge] = 'ok';
    var hl = {}; if (hlNode) hl[hlNode] = 'cur';
    return {
      type: 'graph', label: 'One turn of the browser event loop', directed: true, height: 62,
      nodes: [
        { id: 'TQ', label: 'Task queue', x: 14, y: 31, shape: 'box' },
        { id: 'CS', label: 'Call stack: run ONE task', x: 46, y: 9, shape: 'box' },
        { id: 'MQ', label: 'Drain ALL microtasks', x: 84, y: 31, shape: 'box' },
        { id: 'RD', label: 'Render? rAF → style → layout → paint', x: 46, y: 53, shape: 'box' }
      ],
      edges: [['TQ', 'CS', 'oldest task'], ['CS', 'MQ', 'stack empty'], ['MQ', 'RD', 'queue empty'], ['RD', 'TQ', 'next turn']],
      hl: hl, ehl: ehl
    };
  }
  function nodeGraph(hlNode, tags) {
    var hl = {}; if (hlNode) hl[hlNode] = 'cur';
    return {
      type: 'graph', label: 'Node.js event loop phases (libuv)', directed: true, height: 64,
      nodes: [
        { id: 'TM', label: 'timers', x: 16, y: 10, shape: 'box' },
        { id: 'PE', label: 'pending callbacks', x: 52, y: 10, shape: 'box' },
        { id: 'PO', label: 'poll (I/O callbacks)', x: 84, y: 32, shape: 'box' },
        { id: 'CH', label: 'check (setImmediate)', x: 52, y: 54, shape: 'box' },
        { id: 'CL', label: 'close callbacks', x: 16, y: 54, shape: 'box' }
      ],
      edges: [['TM', 'PE'], ['PE', 'PO'], ['PO', 'CH'], ['CH', 'CL'], ['CL', 'TM', 'loop']],
      hl: hl, tags: tags || {}
    };
  }

  topics.push({
    title: 'The Event Loop Algorithm: One Task → All Microtasks → Render → Repeat',
    analogy: `<p>Our waiter follows the same routine all night, forever:</p><ol><li>Pick up <b>one</b> plate from the pass counter (oldest first) and serve it.</li><li>Handle <b>every</b> urgent note on the clipboard, including new ones.</li><li>If it is time (about 60 times a second), quickly <b>refresh the menu board</b> on the wall so customers see the latest prices.</li><li>Back to step 1. If the counter is empty, stand by the kitchen and wait.</li></ol><p>That routine <i>is</i> the event loop. It is not magic — it is a <code>while (true)</code> loop inside the browser or Node that keeps feeding callbacks to the one JavaScript thread.</p>`,
    explain: `<p>The <b>event loop</b> is the host's loop that decides <i>what JavaScript runs next</i>. In a browser, one turn looks like this:</p>
<pre>while (true) {
  task = taskQueue.oldest();          // 1. ONE task (script, timer, click, message…)
  run(task);                          //    runs until the call stack is empty
  while (microtaskQueue.notEmpty())   // 2. ALL microtasks (promise callbacks, await, queueMicrotask)
    run(microtaskQueue.next());       //    new ones added here also run now
  if (timeToPaint())                  // 3. maybe render (~every 16.7 ms on a 60 Hz screen)
    runAnimationFrames(); styleLayoutPaint();
  if (nothingToDo) sleepUntilSomethingArrives();
}</pre>
<p>Three facts make almost every output-order question easy:</p>
<ol>
<li><b>The script itself is the first task.</b> So all its synchronous lines run before any callback.</li>
<li><b>After every task, all microtasks run.</b> A timer callback that creates a promise sees that promise's <code>.then</code> run right after it — before the next timer.</li>
<li><b>Rendering only happens between tasks</b>, never in the middle of your code or the microtask drain. If you change the DOM 1000 times in one task, the user only ever sees the final state.</li>
</ol>
${H.table(['Turn', 'Task', 'Microtasks after it', 'Printed so far'], [
  ['1', 'main script (prints S)', 'P1', 'S P1'],
  ['2', 'timer T1 (prints T1, queues P2)', 'P2', 'S P1 T1 P2'],
  ['3', 'timer T2', '—', 'S P1 T1 P2 T2']
])}
<p><b>Node.js</b> runs the same idea with named <b>phases</b> (from the libuv library): <i>timers</i> → <i>pending callbacks</i> → <i>poll</i> (I/O: files, sockets) → <i>check</i> (<code>setImmediate</code>) → <i>close callbacks</i> → back to timers. Between <b>every single callback</b>, Node drains <code>process.nextTick</code> callbacks first, then promise microtasks. So the browser rule "one task, then all microtasks" still holds callback by callback.</p>
<p><code>requestAnimationFrame(cb)</code> is special: cb is neither a task nor a microtask; it runs in step 3, right before the browser paints the next frame. Use it for animations and "measure then change the DOM" work.</p>`,
    clues: [
      '"Explain the event loop" → task → drain microtasks → render → repeat; one stack',
      '"When does the browser repaint?" → between tasks, after microtasks, when a frame is due (rAF runs right before)',
      '"In Node, setImmediate vs setTimeout(…, 0)?" → check phase vs timers phase; inside an I/O callback setImmediate always first',
      '"process.nextTick vs Promise.then" → nextTick queue drains first (CommonJS)',
      '"Why didn’t my spinner show while the loop ran?" → no render opportunity until the task (and microtasks) end',
      '"requestAnimationFrame vs setTimeout(fn, 16)" → rAF is synced to paint, paused in background tabs'
    ],
    code: [
      { lang: 'js', title: 'A tiny event loop written in plain JS (runnable model)', run: true, code: `// A toy model of the browser event loop: arrays instead of real queues.
const taskQueue = [];
const microtaskQueue = [];
const log = [];

const toySetTimeout = (fn) => taskQueue.push(fn);
const toyThen = (fn) => microtaskQueue.push(fn);

function runEventLoop(mainScript) {
  taskQueue.push(mainScript);              // the script is the first task
  let turn = 0;
  while (taskQueue.length) {
    turn++;
    const task = taskQueue.shift();        // 1. ONE task
    task();
    while (microtaskQueue.length) {        // 2. ALL microtasks (even new ones)
      microtaskQueue.shift()();
    }
    log.push('[render opportunity after turn ' + turn + ']'); // 3. maybe paint
  }
}

runEventLoop(() => {
  log.push('S');
  toySetTimeout(() => {
    log.push('T1');
    toyThen(() => log.push('P2'));
  });
  toySetTimeout(() => log.push('T2'));
  toyThen(() => log.push('P1'));
});
console.log(log.join('\\n'));

// Expected output:
// S
// P1
// [render opportunity after turn 1]
// T1
// P2
// [render opportunity after turn 2]
// T2
// [render opportunity after turn 3]` }
    ],
    codeTitle: ['Event loop model'],
    viz: [
      {
        title: 'The loop itself: task → microtasks → render → next task',
        gen: function () {
          var code = "setTimeout(() => {\n  console.log('T1');\n  Promise.resolve().then(() => console.log('P2'));\n}, 0);\nsetTimeout(() => console.log('T2'), 0);\nPromise.resolve().then(() => console.log('P1'));\nconsole.log('S');";
          var S = [
            ['TQ', 'TQ-CS', null, ['main script'], ['timeout T1', 'timeout T2'], [], [], 'Turn 1 begins: the oldest (only) task is the <b>main script</b>. It goes onto the call stack.'],
            ['CS', null, 7, ['main script'], ['timeout T1', 'timeout T2'], ['then P1'], ['S'], 'The script schedules two timers (both done almost instantly → tasks) and one promise callback (→ microtask), then prints <b>S</b>.'],
            ['MQ', 'CS-MQ', 6, ['then P1'], ['timeout T1', 'timeout T2'], [], ['S', 'P1'], 'Stack empty → drain <b>all</b> microtasks: <b>P1</b> prints. Note the timers were created earlier but still wait.'],
            ['RD', 'MQ-RD', null, [], ['timeout T1', 'timeout T2'], [], ['S', 'P1'], 'Microtask queue empty → <b>render opportunity</b>. If a frame is due, the browser runs rAF callbacks, recalculates styles, layout, and paints. (Only here can the user see DOM changes.)'],
            ['TQ', 'RD-TQ', null, [], ['timeout T1', 'timeout T2'], [], ['S', 'P1'], 'Turn 2: back to the task queue. Oldest task: <b>T1</b>.'],
            ['CS', 'TQ-CS', 2, ['timeout T1'], ['timeout T2'], ['then P2'], ['S', 'P1', 'T1'], 'T1 runs: prints <b>T1</b> and queues a promise callback P2 (microtask).'],
            ['MQ', 'CS-MQ', 3, ['then P2'], ['timeout T2'], [], ['S', 'P1', 'T1', 'P2'], 'T1 finished → drain microtasks <b>before</b> T2: <b>P2</b> prints. This is the key rule — microtasks between every task.'],
            ['RD', 'MQ-RD', null, [], ['timeout T2'], [], ['S', 'P1', 'T1', 'P2'], 'Render opportunity again (skipped if no frame is due or nothing changed).'],
            ['CS', 'TQ-CS', 5, ['timeout T2'], [], [], ['S', 'P1', 'T1', 'P2', 'T2'], 'Turn 3: task <b>T2</b> runs and prints.'],
            ['TQ', 'RD-TQ', null, [], [], [], ['S', 'P1', 'T1', 'P2', 'T2'], 'All queues empty → the loop <b>sleeps</b> until a new task arrives (a click, a timer, a network reply). Final: S P1 T1 P2 T2.']
          ];
          return S.map(function (s) {
            var hl = {}; if (s[2]) hl[s[2]] = 'cur';
            return { narr: s[7], parts: [
              loopGraph(s[0], s[1]),
              { type: 'code', label: 'Program', lang: 'js', code: code, hl: hl },
              { type: 'stack', label: 'Call stack', items: s[3], hl: s[3].length ? one(s[3].length - 1, 'cur') : {} },
              { type: 'queue', label: 'Task queue', items: s[4], frontLabel: 'next', backLabel: 'joins' },
              { type: 'queue', label: 'Microtask queue', items: s[5], frontLabel: 'next', backLabel: 'joins' },
              { type: 'array', label: 'Console output', values: s[6], start: 1, hl: s[6].length ? one(s[6].length - 1, 'ok') : {} }
            ] };
          });
        }
      },
      {
        title: 'Tasks and microtasks interleaving (editable)',
        input: 'log s\ntimeout { log t1; then p1 }\ntimeout { log t2; micro m2 }\nthen { log p0; timeout t3 }\nlog e',
        inputLabel: 'Mini-program (log · timeout · then · micro · braces nest)',
        gen: function (input) { return elSim(input, { endNote: 'Pattern: after EVERY task, its microtasks run before the next task.' }); }
      },
      {
        title: 'Node.js phases: why setImmediate beats setTimeout inside an I/O callback',
        gen: function () {
          var code = "const fs = require('fs');\nfs.readFile(__filename, () => {\n  setTimeout(() => console.log('timeout'), 0);\n  setImmediate(() => console.log('immediate'));\n  process.nextTick(() => console.log('nextTick'));\n  Promise.resolve().then(() => console.log('promise'));\n  console.log('sync');\n});";
          var S = [
            ['PO', 1, [], [], [], [], 'Node starts: the main module runs, asks libuv to read a file (in the background thread pool), and the loop starts spinning through phases. Nothing is ready yet, so it waits in <b>poll</b>.'],
            ['PO', 2, ['readFile callback'], [], [], [], 'File read finished → its callback runs in the <b>poll</b> phase (an I/O callback).'],
            ['PO', 3, ['readFile callback'], ['timers: timeout'], [], [], 'setTimeout(…, 0) → a 1 ms timer (Node turns 0 into 1). It can only run in the <b>timers</b> phase.'],
            ['PO', 4, ['readFile callback'], ['timers: timeout', 'check: immediate'], [], [], 'setImmediate → queued for the <b>check</b> phase, which comes right after poll.'],
            ['PO', 5, ['readFile callback'], ['timers: timeout', 'check: immediate'], ['nextTick: nextTick'], [], 'process.nextTick → Node\'s special highest-priority queue.'],
            ['PO', 7, ['readFile callback'], ['timers: timeout', 'check: immediate'], ['nextTick: nextTick', 'promise: promise'], ['sync'], 'A promise microtask is queued, then <b>sync</b> prints.'],
            ['PO', 5, ['nextTick'], ['timers: timeout', 'check: immediate'], ['promise: promise'], ['sync', 'nextTick'], 'The callback returns. Before moving on, Node drains the <b>nextTick queue first</b> → <b>nextTick</b>…'],
            ['PO', 6, ['promise'], ['timers: timeout', 'check: immediate'], [], ['sync', 'nextTick', 'promise'], '…then the promise microtasks → <b>promise</b>.'],
            ['CH', 4, ['immediate'], ['timers: timeout'], [], ['sync', 'nextTick', 'promise', 'immediate'], 'Poll is done, so the loop moves to the next phase: <b>check</b> → <b>immediate</b> runs. The timers phase is behind us in this lap.'],
            ['CL', null, [], ['timers: timeout'], [], ['sync', 'nextTick', 'promise', 'immediate'], 'close callbacks (none) → the loop wraps around.'],
            ['TM', 3, ['timeout'], [], [], ['sync', 'nextTick', 'promise', 'immediate', 'timeout'], 'Next lap: <b>timers</b> phase → <b>timeout</b>. Inside an I/O callback this order is guaranteed. In the main module, setTimeout(0) vs setImmediate is <b>not</b> deterministic (depends on whether 1 ms has passed when the loop starts).']
          ];
          return S.map(function (s) {
            var hl = {}; if (s[1]) hl[s[1]] = 'cur';
            return { narr: s[6], parts: [
              nodeGraph(s[0]),
              { type: 'code', label: 'Node.js program', lang: 'js', code: code, hl: hl },
              { type: 'stack', label: 'Call stack', items: s[2], hl: s[2].length ? one(s[2].length - 1, 'cur') : {} },
              { type: 'queue', label: 'Waiting in phases', items: s[3], frontLabel: 'next', backLabel: '' },
              { type: 'queue', label: 'Between callbacks: nextTick queue, then promise queue', items: s[4], frontLabel: 'next', backLabel: '' },
              { type: 'array', label: 'Console output', values: s[5], start: 1, hl: s[5].length ? one(s[5].length - 1, 'ok') : {} }
            ] };
          });
        }
      }
    ],
    examples: [
      {
        title: 'Microtasks run after EACH timer, not after all timers',
        html: `<p>Since Node 11 (and always in browsers) the microtask queue is drained after <b>each</b> timer callback. Old Node (10 and earlier) ran the whole batch of expired timers first, printing T1 T2 P1 P2 — a classic "it works differently on my machine" story.</p>`,
        code: { lang: 'js', run: true, code: `setTimeout(() => {
  console.log('T1');
  Promise.resolve().then(() => console.log('P1 (after T1)'));
}, 0);
setTimeout(() => {
  console.log('T2');
  Promise.resolve().then(() => console.log('P2 (after T2)'));
}, 0);

// Expected output:
// T1
// P1 (after T1)
// T2
// P2 (after T2)` }
      },
      {
        title: 'Why the spinner never shows (render only between tasks)',
        html: `<p>Showing a spinner and then doing heavy work in the <b>same task</b> means the browser never gets a render opportunity in between: the user sees nothing, then the final result. Give the browser one frame first — <code>requestAnimationFrame</code> + a task, or <code>await scheduler.yield()</code> where available. (DOM code, not runnable here.)</p>`,
        code: { lang: 'js', code: `// BAD: spinner is set and removed inside one task → never painted
function bad() {
  spinner.hidden = false;
  heavyComputation();          // 2 s of blocking
  spinner.hidden = true;
}

// GOOD: let the browser paint the spinner, then work in a later task
function good() {
  spinner.hidden = false;
  requestAnimationFrame(() => {        // runs right before the next paint
    setTimeout(() => {                 // a new task AFTER that paint
      heavyComputation();
      spinner.hidden = true;
    }, 0);
  });
}` }
      },
      {
        title: 'Node priority ladder: nextTick > promise > timers / immediate',
        html: `<p>In a CommonJS main module Node prints <b>sync, nextTick, promise</b>, and then timeout/immediate in an order that can differ between runs (it depends on whether 1 ms passed before the loop started). Inside an I/O callback the order is fixed: immediate before timeout. In an <b>ES module</b> (<code>.mjs</code>), the module body itself runs inside a promise job, so <b>promise</b> prints before <b>nextTick</b>! (Node-only APIs, so not runnable in the browser sandbox.)</p>`,
        code: { lang: 'js', code: `// node ladder.js   (CommonJS)
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));
console.log('sync');
// sync
// nextTick
// promise
// timeout / immediate  (either order in the main module!)` }
      },
      {
        title: 'requestAnimationFrame runs right before paint',
        html: `<p>rAF callbacks run in the render step, once per frame (~16.7 ms at 60 Hz, ~8.3 ms at 120 Hz), and are paused in background tabs. Compared to <code>setTimeout(fn, 16)</code>, they never drift out of sync with the screen and never run twice per frame. All rAF callbacks registered before a frame run together in that frame. (DOM code.)</p>`,
        code: { lang: 'js', code: `const box = document.querySelector('.box');
let x = 0;
function step(timestamp) {          // timestamp = start time of this frame
  x += 2;
  box.style.transform = 'translateX(' + x + 'px)';
  if (x < 300) requestAnimationFrame(step);   // schedule for the NEXT frame
}
requestAnimationFrame(step);` }
      }
    ],
    deepDive: `<p><b>The real HTML processing model</b> (simplified from the spec): pick a task queue with a runnable task (the browser chooses which source) → run the oldest task in it → <i>perform a microtask checkpoint</i> → if this is a "rendering opportunity": for each document run resize/scroll steps, media queries, animations, fullscreen, <b>requestAnimationFrame callbacks</b>, style + layout, ResizeObserver/IntersectionObserver steps, then paint → if idle, run <code>requestIdleCallback</code> callbacks → repeat. Rendering opportunities follow the display refresh rate; the browser may skip them when nothing changed or the tab is hidden.</p>
<p><b>Ordering between tasks and rAF is not guaranteed</b> — whether a <code>setTimeout(…, 0)</code> runs before or after the next rAF depends on where in the frame you are. Interview-safe answer: "rAF runs before the next paint; timers and rAF are not ordered relative to each other".</p>
<p><b>Node/libuv details.</b> Phases: <i>timers</i> (expired setTimeout/setInterval), <i>pending callbacks</i> (some deferred system errors), <i>idle/prepare</i> (internal), <i>poll</i> (wait for and run I/O callbacks; may block here when nothing else is scheduled), <i>check</i> (setImmediate), <i>close callbacks</i> (<code>socket.on('close')</code>). Node 20+ (libuv 1.45) runs timers only <i>after</i> poll in each iteration, but the observable rules you need stay the same: in the main module timeout-vs-immediate is a race; inside I/O callbacks immediate wins. <code>process.nextTick</code> recursion can starve I/O exactly like microtask recursion starves the browser.</p>
<p><b>Workers.</b> Each Web Worker / worker_thread has its own event loop, stack and queues; they do not share the main thread's microtask queue. <code>postMessage</code> delivers a <b>task</b> to the other side.</p>
<p><b>Other runtimes.</b> Deno (Tokio-based) and Bun (its own loop) implement the same web-compatible ordering for timers, promises and <code>queueMicrotask</code>; Node-compat APIs like <code>process.nextTick</code> are emulated. Interview answers built on "task → all microtasks → render" transfer everywhere.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can explain the event loop fluently, but explanations often mix browser and Node rules (e.g. claiming browsers have <code>setImmediate</code>, or that rendering happens between microtasks). When you ask for UI code, it may update the DOM and measure layout in the same task, causing forced reflows, or put animation logic in <code>setInterval</code>.</p>
<p><b>Use AI as a partner:</b> <code>"Annotate this code with which event-loop phase each callback runs in, for Chrome and for Node 22 separately."</code> Then ask it to produce a counter-example where its own claim breaks. Ask for performance-panel interpretation: paste a Long Animation Frame entry and ask what blocked rendering.</p>
<p><b>Where AI goes wrong:</b> stating deterministic order for <code>setTimeout(0)</code> vs <code>setImmediate</code> in a main module, forgetting the ESM nextTick twist, or claiming rAF is a microtask.</p>
<p><b>What you must still own:</b> drawing the loop from memory, and knowing which guarantees are real (FIFO per queue, microtasks after each callback, render between tasks) versus implementation details.</p>`,
    problems: [
      {
        title: 'Node: order inside an I/O callback',
        level: 'Medium', tags: ['node', 'nextTick', 'setImmediate', 'phases'], companies: ['Netflix', 'PayPal', 'Zomato'],
        statement: `<p>In Node.js (CommonJS) predict the exact output:</p><pre>const fs = require('fs');
fs.readFile(__filename, () =&gt; {
  setTimeout(() =&gt; console.log('timeout'), 0);
  setImmediate(() =&gt; console.log('immediate'));
  process.nextTick(() =&gt; console.log('nextTick'));
  Promise.resolve().then(() =&gt; console.log('promise'));
  console.log('sync');
});</pre>`,
        constraints: `Node.js 18+ running a CommonJS file. The file exists.`,
        example: `<p>${H.c('g', 'sync')} → ${H.c('p', 'nextTick')} → ${H.c('p', 'promise')} → ${H.c('b', 'immediate')} → ${H.c('b', 'timeout')}. The callback runs in the poll phase; check (setImmediate) comes right after poll, timers only on the next lap.</p>`,
        brute: {
          why: `<p>A browser-only model (all timers are the same "macrotask queue" and setTimeout was created first) predicts timeout before immediate. It ignores that Node's loop is split into phases and that we are currently in poll, which is followed by check.</p>`,
          code: `// Browser-style single macrotask queue model (wrong for this Node case)
const macrotasks = ['timeout', 'immediate'];          // creation order
const micro = ['nextTick', 'promise'];
console.log(['sync'].concat(micro, macrotasks).join(' '));
// sync nextTick promise timeout immediate  <- wrong inside an I/O callback`
        },
        mcq: { q: 'Inside an fs callback, why does setImmediate run before setTimeout(…, 0)?', options: ['setImmediate has a shorter delay', 'The loop is in the poll phase; check comes next, timers only on the next lap', 'setTimeout is broken in Node', 'Promises delay timers'], answer: 1, explain: 'Phases run in a fixed order: poll → check → close → timers. From poll, check is reached first.' },
        hints: [
          `<p>Hint 1: Which phase is the readFile callback running in? (It is an I/O callback.)</p>`,
          `<p>Hint 2: Between callbacks Node drains nextTick first, then promises. Then the loop moves to the <i>next phase</i>.</p>`,
          `<p>Hint 3: Recipe: sync → nextTick queue → promise queue → next phase after poll (check: immediate) → … → timers (timeout).</p>`
        ],
        tests: {"io":true,"cases":[{"stdin":"","stdout":"sync\nnextTick\npromise\nimmediate\ntimeout"}]},
        solution: {
          approach: `<p>We are in <b>poll</b>. Sync prints first. When the callback returns, Node drains <code>nextTick</code> then promises. The loop then proceeds to <b>check</b> (immediate), then close, then wraps to <b>timers</b> (timeout).</p>`,
          code: `const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);       // timers phase (next lap)
  setImmediate(() => console.log('immediate'));       // check phase (right after poll)
  process.nextTick(() => console.log('nextTick'));    // drained first after this callback
  Promise.resolve().then(() => console.log('promise')); // drained right after nextTick
  console.log('sync');
});
// Output (always, inside an I/O callback):
// sync
// nextTick
// promise
// immediate
// timeout`,
          dry: { head: ['phase', 'runs', 'printed'], rows: [
            ['poll', 'readFile callback', 'sync'],
            ['(between callbacks)', 'nextTick queue', 'sync nextTick'],
            ['(between callbacks)', 'promise microtasks', 'sync nextTick promise'],
            ['check', 'setImmediate callback', '… immediate'],
            ['timers (next lap)', 'setTimeout callback', '<span class="c-g">sync nextTick promise immediate timeout</span>']
          ] },
          complexity: `<p>O(callbacks). Conceptually each phase drains its own FIFO queue; nextTick/promise queues are drained between every callback.</p>`,
          followUps: ['What prints if the same five lines are at the top level of the main module instead?', 'What changes if the file is an ES module (.mjs)?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 5 — setTimeout vs Promise vs queueMicrotask (priority ladder)
     ====================================================================== */
  topics.push({
    title: 'setTimeout vs Promise vs queueMicrotask: Who Goes First?',
    analogy: `<p>Think of three ways to ask our waiter for something:</p><ul><li><b>"Right after you finish this sentence"</b> — <code>queueMicrotask</code> / <code>Promise.then</code>. He finishes what he is saying, then does it before walking anywhere.</li><li><b>"Before you next update the menu board"</b> — <code>requestAnimationFrame</code>.</li><li><b>"Next time you are free, take a ticket from the counter"</b> — <code>setTimeout</code>. It waits behind every plate already on the counter <i>and</i> behind every urgent note.</li></ul><p>The person who asked first does not win. The <b>type of request</b> decides the lane; only inside the same lane does "first come, first served" apply.</p>`,
    explain: `<p>Here is the <b>priority ladder</b> you can use for any "what prints first?" question:</p>
${H.table(['Rank', 'Kind', 'Examples', 'Runs…'], [
  ['1', '<b>Synchronous code</b>', 'plain lines, <code>new Promise</code> executor, async function body up to its first <code>await</code>', 'now, top to bottom'],
  ['2', '<span class="c-p">process.nextTick</span> (Node only)', '<code>process.nextTick(fn)</code>', 'as soon as the current callback ends'],
  ['3', '<span class="c-p">Microtasks</span>', '<code>.then/.catch/.finally</code>, code after <code>await</code>, <code>queueMicrotask</code>, MutationObserver', 'all of them, FIFO, whenever the stack empties'],
  ['4', 'Render step (browser)', '<code>requestAnimationFrame</code>', 'before the next paint, if a frame is due'],
  ['5', '<span class="c-b">Tasks</span>', '<code>setTimeout</code>, <code>setInterval</code>, events, <code>MessageChannel</code>, I/O, <code>setImmediate</code> (Node)', 'one per loop turn; timers ordered by due time'],
  ['6', 'Idle', '<code>requestIdleCallback</code>', 'only when the browser has spare time']
])}
<p><b>Rules inside the microtask lane:</b></p>
<ul>
<li><code>Promise.then</code> and <code>queueMicrotask</code> share one FIFO queue — no one beats the other; queue order wins.</li>
<li>A <code>.then</code> on a <b>pending</b> promise is <i>not</i> queued yet. It is queued at the moment the promise resolves. If a timer resolves it, the callback runs right after <i>that</i> timer task.</li>
<li>In a chain <code>p.then(a).then(b)</code>, <b>b</b> is queued only after <b>a</b> has run. So two chains started together <b>interleave</b>: a1, b1, a2, b2…</li>
</ul>
<p><b>Rules inside the task lane:</b> timers are ordered by due time (creation time + delay), ties by creation order. A <code>setTimeout</code> created <i>inside</i> a microtask or task joins at the back.</p>
<p>The classic interview line:</p>
<pre>setTimeout(() =&gt; console.log('timeout'), 0);
Promise.resolve().then(() =&gt; console.log('then'));
queueMicrotask(() =&gt; console.log('microtask'));
console.log('sync');
// sync → then → microtask → timeout</pre>`,
    clues: [
      '"setTimeout(fn, 0) vs Promise.resolve().then(fn) — which first?" → promise (microtask) always first',
      '"queueMicrotask vs Promise.then" → same queue, FIFO by enqueue order',
      '"Two promise chains — what is the interleaving?" → each link queued after the previous one runs → alternate',
      '"Promise resolved inside a setTimeout" → its .then runs right after that timer task, before the next timer',
      '"How do I defer work but let the browser paint?" → a task (setTimeout/MessageChannel/scheduler.yield), not a microtask',
      '"process.nextTick vs setImmediate naming confusion" → nextTick runs sooner (before promises); setImmediate is a later phase'
    ],
    code: [
      { lang: 'js', title: 'The priority ladder in one snippet (runnable)', run: true, code: `setTimeout(() => console.log('5. setTimeout (task)'), 0);

Promise.resolve().then(() => console.log('3. promise.then (microtask)'));

queueMicrotask(() => console.log('4. queueMicrotask (microtask, queued after the then)'));

new Promise((resolve) => {
  console.log('1. Promise executor (synchronous!)');
  resolve();
});

console.log('2. plain sync line');

// Expected output:
// 1. Promise executor (synchronous!)
// 2. plain sync line
// 3. promise.then (microtask)
// 4. queueMicrotask (microtask, queued after the then)
// 5. setTimeout (task)` }
    ],
    codeTitle: ['Priority ladder'],
    viz: [
      {
        title: 'Mixed lanes: timers inside promises, promises inside timers (editable)',
        input: 'timeout T1\nthen { log P1; timeout T2 }\nmicro { log M1; then P2 }\ntimeout { log T3; micro M3 }\nlog S',
        inputLabel: 'Mini-program (log · timeout · then · micro · new { } then · braces nest)',
        gen: function (input) { return elSim(input, { endNote: 'T2 was created inside a microtask, so it lands behind T1 and T3.' }); }
      },
      {
        title: 'A pending promise: .then is queued only when resolve() happens',
        gen: function () {
          var code = "const p = new Promise((resolve) => {\n  setTimeout(() => {\n    console.log('timer resolves p');\n    resolve();\n  }, 0);\n});\np.then(() => console.log('then on p'));\nsetTimeout(() => console.log('second timer'), 0);\nconsole.log('sync');";
          return elScript(code, [
            { l: 1, stack: ['main script', 'executor'], narr: 'The executor runs synchronously. It does not call resolve now — it starts a timer that will resolve later. So <b>p is pending</b>.' },
            { l: 2, stack: ['main script', 'executor', 'setTimeout'], web: ['⏱ resolver · 0 ms'], wn: '⏱ resolver · 0 ms', narr: 'Timer #1 (the resolver) goes to the Web APIs.' },
            { l: 7, stack: ['main script', '.then(cb)'], web: ['⏱ resolver · 0 ms'], narr: '<b>p.then(cb)</b> on a <b>pending</b> promise: cb is only <i>registered</i> on p (a reaction list). Nothing goes into the microtask queue yet!' },
            { l: 8, stack: ['main script', 'setTimeout'], web: ['⏱ resolver · 0 ms', '⏱ second · 0 ms'], wn: '⏱ second · 0 ms', narr: 'Timer #2 is created.' },
            { l: 9, stack: ['main script', 'console.log'], out: ['sync'], outNew: true, narr: 'Prints <b>sync</b>.' },
            { l: null, stack: [], web: [], macro: ['resolver', 'second'], ma: { 0: 'ok', 1: 'ok' }, phase: '③ timers → task queue', narr: 'Script done, microtask queue is <b>empty</b> (the then is still waiting on p). Both timers finish → tasks, in creation order.' },
            { l: 3, stack: ['resolver'], macro: ['second'], out: ['sync', 'timer resolves p'], outNew: true, phase: '③ run ONE task', narr: 'Task 1: the resolver prints <b>timer resolves p</b>…' },
            { l: 4, stack: ['resolver', 'resolve()'], micro: ['then on p'], mi: { 0: 'ok' }, narr: '…and calls <b>resolve()</b>. NOW p is fulfilled, and its registered callback is queued as a <b>microtask</b>.' },
            { l: 7, stack: ['then on p'], micro: [], out: ['sync', 'timer resolves p', 'then on p'], outNew: true, phase: '② drain ALL microtasks', narr: 'Task 1 ends → microtasks drain → <b>then on p</b> runs — <i>before</i> the second timer, even though that timer was waiting.' },
            { l: 8, stack: ['second'], macro: [], out: ['sync', 'timer resolves p', 'then on p', 'second timer'], outNew: true, phase: '③ run ONE task', narr: 'Task 2: <b>second timer</b>.' },
            { l: null, stack: [], phase: '✓ done', narr: 'Lesson: a .then callback is queued when the promise <b>settles</b>, not when .then is called.' }
          ]);
        }
      }
    ],
    examples: [
      {
        title: 'Two promise chains interleave',
        html: `<p>Each <code>.then</code> link is queued only after the link before it finishes. Both chains start with one queued job, so the queue alternates between them: A1, B1, then A2, B2 (queued while A1/B1 ran), and so on.</p>`,
        code: { lang: 'js', run: true, code: `Promise.resolve()
  .then(() => console.log('A1'))
  .then(() => console.log('A2'))
  .then(() => console.log('A3'));

Promise.resolve()
  .then(() => console.log('B1'))
  .then(() => console.log('B2'))
  .then(() => console.log('B3'));

// Expected output:
// A1
// B1
// A2
// B2
// A3
// B3` }
      },
      {
        title: 'setTimeout inside then vs then inside setTimeout',
        html: `<p>A timer created inside a microtask is created <i>later</i> than timers from the script, so it waits behind them. A promise created inside a timer runs right after that timer — before the next timer.</p>`,
        code: { lang: 'js', run: true, code: `setTimeout(() => {
  console.log('timer A');
  Promise.resolve().then(() => console.log('  promise inside timer A'));
}, 0);

Promise.resolve().then(() => {
  console.log('promise B');
  setTimeout(() => console.log('  timer inside promise B'), 0);
});

setTimeout(() => console.log('timer C'), 0);

// Expected output:
// promise B
// timer A
//   promise inside timer A
// timer C
//   timer inside promise B` }
      },
      {
        title: 'Same lane, queue order wins',
        html: `<p>Nothing about the <i>API name</i> gives priority inside the microtask lane. Here a <code>queueMicrotask</code> queued first beats a <code>.then</code> queued second, and an <code>await</code> continuation takes its place in line just like the others.</p>`,
        code: { lang: 'js', run: true, code: `queueMicrotask(() => console.log('1: queueMicrotask'));

(async () => {
  await null;                          // continuation queued now (2nd in line)
  console.log('2: after await');
})();

Promise.resolve().then(() => console.log('3: then'));

// Expected output:
// 1: queueMicrotask
// 2: after await
// 3: then` }
      },
      {
        title: 'Choosing a "defer" tool (browser)',
        html: `<p>Pick by intent: <b>queueMicrotask</b> = after this code, before anyone else sees state (batching). <b>requestAnimationFrame</b> = right before the next paint (visual updates). <b>setTimeout / MessageChannel / scheduler.postTask</b> = later, let the browser handle input and paint first. <b>requestIdleCallback</b> = non-urgent background work.</p>`,
        code: { lang: 'js', code: `queueMicrotask(() => flushStateBatch());            // before paint, before any task
requestAnimationFrame(() => applyVisualChanges());  // right before next paint
setTimeout(() => sendAnalytics(), 0);               // a later task (≥ 4 ms when deeply nested)

// MessageChannel: a task without the nested-timer 4 ms clamp
const channel = new MessageChannel();
channel.port1.onmessage = () => doNextChunk();
channel.port2.postMessage(null);

// Chromium: prioritized tasks
if ('scheduler' in window) {
  scheduler.postTask(() => prefetchNextPage(), { priority: 'background' });
}
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 1) doTinyBackgroundStep();
});` }
      }
    ],
    deepDive: `<p><b>Why are promises microtasks and not tasks?</b> Promise callbacks are "continuations" of the code that just ran. Running them before any other task means state stays consistent: no click handler or timer can observe a half-finished multi-step async update. And unlike synchronous callbacks they never run in the middle of the caller's code.</p>
<p><b>Reaction records.</b> A promise holds two lists: fulfil reactions and reject reactions. <code>.then(f, r)</code> on a pending promise appends to those lists. On <code>resolve(value)</code> the engine runs <code>TriggerPromiseReactions</code>, enqueueing one job per reaction, <b>in registration order</b>. On an already-settled promise, <code>.then</code> enqueues the job immediately. Either way it is always a job, never a direct call.</p>
<p><b>Resolve with a thenable = extra ticks.</b> <code>resolve(otherPromise)</code> (or returning a promise from a <code>.then</code> callback) does not adopt it instantly: the engine queues a <code>NewPromiseResolveThenableJob</code>, which calls <code>otherPromise.then(…)</code>, whose reaction is another job. That is <b>2 extra microtask ticks</b>, a favourite trick in hard puzzles (see the puzzles topic).</p>
<p><b>Timer "due time" vs creation.</b> Delays count from when <code>setTimeout</code> was <i>called</i>. A 0 ms timer created inside a later microtask can still be behind a 0 ms timer created earlier, and a 10 ms timer created early can beat a 0 ms timer created after a 20 ms busy loop.</p>
<p><b>The modern scheduling toolbox (2026).</b> <code>scheduler.postTask(fn, { priority: 'user-blocking' | 'user-visible' | 'background', signal })</code> and <code>scheduler.yield()</code> are available in Chromium-based browsers, with other engines adding them; always feature-detect and fall back to <code>setTimeout</code>/<code>MessageChannel</code>. <code>scheduler.yield()</code> is special: the continuation is queued <i>ahead</i> of other same-priority tasks, so you yield to input and rendering without losing your place in line.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code freely mixes timers, promises and <code>await</code>; most bugs it introduces are ordering bugs that only show up under load: state read before a <code>.then</code> wrote it, a "deferred" update done with a microtask that still blocks paint, or a test that passes only because a 0 ms timer happened to fire after a promise.</p>
<p><b>Use AI as a partner:</b> <code>"Rank every callback in this snippet using the ladder: sync, nextTick, microtask, rAF, task. Then give the output."</code> Compare with your own ranking and with the ▶ Run button. Ask: <code>"Which of these setTimeout(…, 0) calls are really trying to wait for something, and what should they wait for instead (a promise, an event, rAF)?"</code></p>
<p><b>Where AI goes wrong:</b> claiming <code>queueMicrotask</code> runs before <code>.then</code> (or vice versa) by API rather than by queue order, and assuming a <code>.then</code> on a pending promise is queued when <code>.then</code> is called.</p>
<p><b>What you must still own:</b> the ladder and the two "inside" rules (FIFO within a lane; a .then joins the queue when its promise settles).</p>`,
    problems: [
      {
        title: 'Eight logs, three lanes',
        level: 'Medium', tags: ['setTimeout', 'promise', 'queueMicrotask', 'output order'], companies: ['Meta', 'Adobe', 'CRED'],
        statement: `<p>Predict the exact output:</p><pre>console.log('1');
setTimeout(() =&gt; console.log('2'), 0);
Promise.resolve().then(() =&gt; {
  console.log('3');
  setTimeout(() =&gt; console.log('4'), 0);
});
queueMicrotask(() =&gt; console.log('5'));
setTimeout(() =&gt; {
  console.log('6');
  Promise.resolve().then(() =&gt; console.log('7'));
}, 0);
console.log('8');</pre>`,
        constraints: `Browser or Node.js (CommonJS). Assume the script runs in well under 1 ms of real work.`,
        example: `${H.arr(['1', '8', '3', '5', '2', '6', '7', '4'], { hl: { 0: 'g', 1: 'g', 2: 'p', 3: 'p', 4: 'b', 5: 'b', 6: 'p', 7: 'b' }, start: 1 })}<p>Green = sync, purple = microtasks, blue = timer tasks. 4 is created inside a microtask, after timers 2 and 6 already exist, so it is last.</p>`,
        brute: {
          why: `<p>A "creation order" model sorts all callbacks by where they appear in the file: 1 2 3 5 6 8 … It mixes lanes. Another wrong model treats all microtasks as running after all timers. Both ignore "microtasks drain after every task".</p>`,
          code: `// Wrong: just number the console.log calls in reading order
const readingOrder = ['1', '2', '3', '4', '5', '6', '7', '8'];
console.log(readingOrder.join(' '));   // 1 2 3 4 5 6 7 8  <- incorrect`
        },
        mcq: { q: 'Why does 7 print before 4?', options: ['7 has a smaller number', '7 is a microtask created by task 6; microtasks drain right after that task, before the next task (4)', 'Timers created in promises are ignored', 'Promise.then is synchronous'], answer: 1, explain: 'After task 6 ends the event loop drains the microtask queue (7) before picking the next task (4).' },
        hints: [
          `<p>Hint 1: Sync lines first: 1 and 8 print before any callback can run.</p>`,
          `<p>Hint 2: Microtasks after the script: the then-callback (3) and queueMicrotask (5), in that order. 3 creates timer 4 — <i>after</i> timers 2 and 6 already exist.</p>`,
          `<p>Hint 3: Then tasks in order 2, 6, 4 — and after each task drain microtasks (7 after 6). Recipe: sync → micro → [task → micro]*.</p>`
        ],
        tests: {"io":true,"cases":[{"stdin":"","stdout":"1\n8\n3\n5\n2\n6\n7\n4"}]},
        solution: {
          approach: `<p>Track three lists. After the script: printed [1, 8], micro [3, 5], tasks [2, 6]. Drain micro: 3 (adds task 4 → tasks [2, 6, 4]), 5. Task 2. Task 6 (adds micro 7) → drain 7. Task 4.</p>`,
          code: { lang: 'js', run: true, code: `console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => {
  console.log('3');
  setTimeout(() => console.log('4'), 0);
});
queueMicrotask(() => console.log('5'));
setTimeout(() => {
  console.log('6');
  Promise.resolve().then(() => console.log('7'));
}, 0);
console.log('8');

// Expected output:
// 1
// 8
// 3
// 5
// 2
// 6
// 7
// 4` },
          dry: { head: ['phase', 'runs', 'microtasks after', 'tasks after', 'printed'], rows: [
            ['script', 'sync lines', '3, 5', '2, 6', '1 8'],
            ['drain', 'micro 3', '5', '2, 6, 4', '1 8 3'],
            ['drain', 'micro 5', '—', '2, 6, 4', '1 8 3 5'],
            ['task', 'timer 2', '—', '6, 4', '… 2'],
            ['task + drain', 'timer 6 → micro 7', '—', '4', '… 6 7'],
            ['task', 'timer 4', '—', '—', '<span class="c-g">1 8 3 5 2 6 7 4</span>']
          ] },
          complexity: `<p>O(n) callbacks, each placed once in one queue. The skill is bookkeeping, not computation.</p>`,
          followUps: ['Change timer 2 to a 10 ms delay. What moves?', 'Replace queueMicrotask with process.nextTick in Node. What moves?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 6 — async/await under the hood
     ====================================================================== */
  topics.push({
    title: 'async/await Under the Hood: Pause, Bookmark, Resume as a Microtask',
    analogy: `<p>A waiter takes your order and says: <i>"Your soup needs 10 minutes. I'll come back."</i> He puts a <b>bookmark</b> in his notepad — table 7, step 3 of 5, they wanted extra pepper — and walks away to serve other tables. He is <b>not</b> standing frozen next to your table (that would be blocking). When the kitchen rings, an urgent note goes on his clipboard: <i>"resume table 7 at the bookmark"</i>. He picks up exactly where he left off, extra pepper remembered.</p><p><code>await</code> is that bookmark. The function <b>pauses</b>, its local variables are saved, the thread goes to do other work, and when the awaited promise settles, the rest of the function is scheduled as a <b>microtask</b>.</p>`,
    explain: `<p>Three facts explain almost everything about <code>async/await</code>:</p>
<ol>
<li><b>An async function always returns a promise.</b> <code>return 5</code> becomes a promise fulfilled with 5; <code>throw err</code> becomes a rejected promise. Callers get the promise <i>immediately</i>.</li>
<li><b>The body runs synchronously until the first <code>await</code>.</b> Calling an async function is like calling a normal function — the first part runs right now, on the current stack.</li>
<li><b><code>await x</code> pauses the function and schedules the rest as a microtask</b> once x is settled. Even <code>await 5</code> or <code>await alreadyResolvedPromise</code> pauses: the rest still waits for the microtask queue. Control returns to the caller, which continues with its next line.</li>
</ol>
<p>So this:</p>
<pre>async function demo() {
  console.log('A');
  await null;
  console.log('C');
}
demo();
console.log('B');</pre>
<p>prints <b>A, B, C</b>. A is sync, the await hands control back so B prints, then the continuation (C) runs as a microtask.</p>
<p><b>What it desugars to.</b> Roughly, everything after an <code>await</code> is a <code>.then</code> callback:</p>
${H.table(['async/await', 'equivalent promise code'], [
  ['<code>const u = await getUser();</code><br><code>console.log(u);</code>', '<code>getUser().then((u) =&gt; {</code><br><code>&nbsp;&nbsp;console.log(u);</code><br><code>});</code>'],
  ['<code>try { await x } catch (e) { … }</code>', '<code>x.then(…, (e) =&gt; { … })</code>'],
  ['<code>return value</code> inside async', '<code>resolve(value)</code> of the hidden promise'],
  ['<code>throw err</code> inside async', '<code>reject(err)</code> of the hidden promise']
])}
<p>Under the hood engines implement an async function like a <b>generator</b> (a function that can pause at <code>yield</code> and be resumed) plus a small driver that resumes it when each awaited promise settles. The locals live in a saved frame on the heap — not on the call stack — while it is paused.</p>
<p><b>Sequential vs parallel:</b> <code>await a(); await b();</code> waits for a before even <i>starting</i> b. If they are independent, start both first, then await: <code>const [x, y] = await Promise.all([a(), b()]);</code></p>`,
    clues: [
      '"What does an async function return?" → always a promise (even for return 5 or throw)',
      '"Does code before the first await run synchronously?" → yes, immediately on the caller’s stack',
      '"await on a non-promise / already resolved promise — does it still yield?" → yes, the rest is a microtask (1 tick)',
      '"Rewrite this async function using .then" / "implement async/await with generators" → desugaring',
      '"Why are these requests slow / one after another?" → sequential awaits; use Promise.all',
      '"await inside forEach doesn’t wait" → forEach ignores returned promises; use for…of or Promise.all(map)'
    ],
    code: [
      { lang: 'js', title: 'Sync until the first await, then a microtask (runnable)', run: true, code: `async function brewCoffee() {
  console.log('2: start brewing (sync part of the async function)');
  await null;                       // pause; the rest becomes a microtask
  console.log('4: coffee ready (resumed after await)');
  return 'latte';
}

console.log('1: before call');
const promise = brewCoffee();       // runs until the await, returns a promise
console.log('3: after call, got a ' + (promise instanceof Promise ? 'Promise' : 'value'));
promise.then((drink) => console.log('5: then received ' + drink));

// Expected output:
// 1: before call
// 2: start brewing (sync part of the async function)
// 3: after call, got a Promise
// 4: coffee ready (resumed after await)
// 5: then received latte` }
    ],
    codeTitle: ['await = pause + microtask'],
    viz: [
      {
        title: 'await pauses, the caller continues, the rest resumes as a microtask (editable)',
        input: 'log 1\nasync { log 2; await; log 3; await sleep 10; log 4 }\nthen 5\nlog 6\ntimeout 0 7',
        inputLabel: 'Mini-program (async { ... } with await or await sleep MS inside; log · then · timeout · micro)',
        gen: function (input) { return elSim(input, { endNote: 'Plain await = 1 microtask. await sleep = a timer task first, then a microtask to resume.' }); }
      },
      {
        title: 'Two async functions take turns at every await (editable)',
        input: 'async { log a1; await; log a2; await; log a3 }\nasync { log b1; await; log b2; await; log b3 }\nlog sync',
        inputLabel: 'Mini-program',
        gen: function (input) { return elSim(input, { endNote: 'Each await sends the function to the back of the microtask line, so the two functions interleave.' }); }
      },
      {
        title: 'Side by side: async/await and the promise code it becomes',
        gen: function () {
          var asyncCode = "async function getUser() {\n  console.log('A: start');\n  const user = await fetchUser();\n  console.log('C: got ' + user);\n  return user.toUpperCase();\n}\ngetUser().then((u) => console.log('D: ' + u));\nconsole.log('B: after call');";
          var thenCode = "function getUser() {\n  return new Promise((resolve, reject) => {\n    console.log('A: start');\n    fetchUser().then((user) => {\n      console.log('C: got ' + user);\n      resolve(user.toUpperCase());\n    }, reject);\n  });\n}";
          var S = [
            [7, 2, ['main script', 'getUser()'], [], [], 'Calling <b>getUser()</b>: an async function starts running <b>synchronously</b>. In the promise version, that is the <code>new Promise</code> executor — also synchronous.'],
            [2, 3, ['main script', 'getUser()', 'console.log'], [], ['A: start'], 'Prints <b>A</b> on the caller’s stack.'],
            [3, 4, ['main script', 'getUser()', 'fetchUser()'], [], ['A: start'], '<code>fetchUser()</code> returns an already-resolved promise ("ana").'],
            [3, 4, ['main script'], ['resume getUser'], ['A: start'], '<b>await</b> = subscribe the rest of the function to that promise (like <code>.then</code>). It is resolved, so the continuation is queued as a <b>microtask</b>. getUser is <b>suspended</b>: its frame leaves the stack, locals are saved on the heap.'],
            [7, 2, ['main script', '.then(cb)'], ['resume getUser'], ['A: start'], 'Back in the caller: getUser() already returned a <b>pending promise</b>. <code>.then(cb)</code> registers cb on it (not queued — the promise is still pending).'],
            [8, null, ['main script', 'console.log'], ['resume getUser'], ['A: start', 'B: after call'], 'Prints <b>B</b>. The script ends, the stack empties.'],
            [4, 5, ['resume getUser'], [], ['A: start', 'B: after call', 'C: got ana'], 'Microtask: getUser <b>resumes</b> right after the await with <code>user = "ana"</code> → prints <b>C</b>.'],
            [5, 6, ['resume getUser'], ['then D'], ['A: start', 'B: after call', 'C: got ana'], '<code>return "ANA"</code> = resolve the hidden promise. Its registered .then callback is now queued.'],
            [7, null, ['then D'], [], ['A: start', 'B: after call', 'C: got ana', 'D: ANA'], 'Microtask: the caller’s .then prints <b>D: ANA</b>. Same order for both versions: A, B, C, D.']
          ];
          return S.map(function (s) {
            var h1 = {}, h2 = {}; if (s[0]) h1[s[0]] = 'cur'; if (s[1]) h2[s[1]] = 'cur';
            return { narr: s[5], parts: [
              { type: 'code', label: 'async/await version (fetchUser() resolves to "ana")', lang: 'js', code: asyncCode, hl: h1 },
              { type: 'code', label: 'Same thing written with promises', lang: 'js', code: thenCode, hl: h2 },
              { type: 'stack', label: 'Call stack', items: s[2], hl: s[2].length ? one(s[2].length - 1, 'cur') : {} },
              { type: 'queue', label: 'Microtask queue', items: s[3], frontLabel: 'next', backLabel: 'joins' },
              { type: 'array', label: 'Console output', values: s[4], start: 1, hl: s[4].length ? one(s[4].length - 1, 'ok') : {} }
            ] };
          });
        }
      }
    ],
    examples: [
      {
        title: 'An async function always returns a promise — even when it throws',
        html: `<p><code>return</code> fulfils the promise; <code>throw</code> rejects it. The throw does <b>not</b> escape synchronously to the caller — a try/catch around the <i>call</i> (without await) catches nothing. You must <code>await</code> it or attach <code>.catch</code>.</p>`,
        code: { lang: 'js', run: true, code: `async function five() { return 5; }
async function boom() { throw new Error('boom'); }

const p1 = five();
console.log('five() returned a Promise? ' + (p1 instanceof Promise));

let caughtSync = false;
let p2;
try {
  p2 = boom();               // does NOT throw here
} catch (e) {
  caughtSync = true;
}
console.log('try/catch around boom() caught it? ' + caughtSync);

p1.then((v) => console.log('p1 fulfilled with ' + v));
p2.catch((e) => console.log('p2 rejected with ' + e.message));

// Expected output:
// five() returned a Promise? true
// try/catch around boom() caught it? false
// p1 fulfilled with 5
// p2 rejected with boom` }
      },
      {
        title: 'Building async/await yourself with a generator',
        html: `<p>Before async/await (ES2017) libraries like <b>co</b> did exactly this: a generator yields promises, and a runner resumes it with <code>gen.next(value)</code> when each promise fulfils (or <code>gen.throw(err)</code> when it rejects). This is close to what engines do internally.</p>`,
        code: { lang: 'js', run: true, code: `// run(generatorFunction) behaves like calling an async function
function run(genFn) {
  return new Promise((resolve, reject) => {
    const gen = genFn();
    function step(method, arg) {
      let result;
      try {
        result = gen[method](arg);          // resume the paused generator
      } catch (err) {
        return reject(err);                 // generator threw → reject
      }
      if (result.done) return resolve(result.value);   // "return" → resolve
      // "await": wait for the yielded value, then resume
      Promise.resolve(result.value).then(
        (v) => step('next', v),
        (e) => step('throw', e)
      );
    }
    step('next', undefined);
  });
}

const delay = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));

run(function* () {
  const a = yield delay(20, 2);       // like: const a = await delay(20, 2)
  const b = yield delay(20, 3);
  try {
    yield Promise.reject(new Error('nope'));
  } catch (e) {
    console.log('caught inside generator: ' + e.message);
  }
  return a * b;
}).then((v) => console.log('result = ' + v));

// Expected output:
// caught inside generator: nope
// result = 6` }
      },
      {
        title: 'Sequential vs parallel awaits',
        html: `<p>Each <code>await</code> in a row waits for the previous one: three 100 ms calls take ~300 ms. Starting all three first and awaiting <code>Promise.all</code> takes ~100 ms. Only keep them sequential when one call needs the previous result.</p>`,
        code: { lang: 'js', run: true, code: `const fakeFetch = (name) => new Promise((r) => setTimeout(() => r(name), 100));

async function sequential() {
  const t = Date.now();
  const a = await fakeFetch('a');     // wait 100
  const b = await fakeFetch('b');     // then wait 100 more
  const c = await fakeFetch('c');     // then 100 more
  const ms = Date.now() - t;
  console.log('sequential ' + [a, b, c].join('') + ' took >= 290 ms? ' + (ms >= 290));
}

async function parallel() {
  const t = Date.now();
  // all three timers start NOW, then we wait for all of them together
  const [a, b, c] = await Promise.all([fakeFetch('a'), fakeFetch('b'), fakeFetch('c')]);
  const ms = Date.now() - t;
  console.log('parallel ' + [a, b, c].join('') + ' took < 250 ms? ' + (ms < 250));
}

sequential().then(parallel);

// Expected output:
// sequential abc took >= 290 ms? true
// parallel abc took < 250 ms? true` }
      },
      {
        title: 'await inside forEach does not wait',
        html: `<p><code>forEach</code> calls your async callback, gets a promise back, and <b>throws it away</b>. So "done" prints before any item finishes. Use <code>for…of</code> (sequential) or <code>await Promise.all(items.map(…))</code> (parallel).</p>`,
        code: { lang: 'js', run: true, code: `const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const items = [1, 2, 3];

async function broken() {
  items.forEach(async (n) => {
    await wait(10);
    console.log('forEach item ' + n);
  });
  console.log('broken: "done" (too early!)');
}

async function fixed() {
  for (const n of items) {              // waits for each one
    await wait(10);
    console.log('for...of item ' + n);
  }
  console.log('fixed: done (really)');
}

broken().then(() => wait(50)).then(fixed);

// Expected output:
// broken: "done" (too early!)
// forEach item 1
// forEach item 2
// forEach item 3
// for...of item 1
// for...of item 2
// for...of item 3
// fixed: done (really)` }
      },
      {
        title: 'Returning a promise from an async function costs extra ticks',
        html: `<p>When an async function <code>return</code>s a <b>promise</b>, the hidden result promise must <i>adopt</i> it, which takes 2 extra microtask ticks (a resolve-thenable job + a then job). Returning a plain value settles it at once. Invisible in real apps, decisive in tick-counting puzzles.</p>`,
        code: { lang: 'js', run: true, code: `async function returnsValue() { return 1; }
async function returnsPromise() { return Promise.resolve(1); }

returnsPromise().then(() => console.log('returnsPromise settled'));
returnsValue().then(() => console.log('returnsValue settled'));

Promise.resolve()
  .then(() => console.log('tick 1'))
  .then(() => console.log('tick 2'))
  .then(() => console.log('tick 3'));

// Expected output:
// returnsValue settled
// tick 1
// tick 2
// returnsPromise settled
// tick 3` }
      }
    ],
    deepDive: `<p><b>The spec's Await(value)</b>: (1) <code>promise = PromiseResolve(%Promise%, value)</code> — returns <code>value</code> itself if it is already a native promise, else wraps it; (2) <code>PerformPromiseThen(promise, onFulfilled, onRejected)</code> where the callbacks resume the suspended function with the value or throw the reason into it; (3) suspend and return to the caller. Because step 1 reuses native promises directly, awaiting a native promise costs exactly <b>one</b> microtask tick once it is resolved.</p>
<p><b>History that explains old blog posts.</b> Before the 2018–2019 spec change (shipped in V8 7.2 / Node 12), <code>await p</code> always wrapped p in a new promise and took <b>3 ticks</b>. Old articles showing "promise2 before async1 end" for the famous puzzle were correct for Node 10; modern engines print "async1 end" first.</p>
<p><b>Return values.</b> <code>return v</code> inside an async function resolves the hidden promise with v. If v is a thenable (including a native promise), resolution goes through <code>NewPromiseResolveThenableJob</code> → <code>v.then(resolve, reject)</code> → another job: <b>+2 ticks</b>. <code>return await v</code> costs 1 tick for the await and then resolves with a plain value. ESLint's old <code>no-return-await</code> rule is deprecated: <code>return await</code> is required inside <code>try</code> (to catch the rejection there) and gives better async stack traces.</p>
<p><b>Thenables.</b> <code>await { then(res) { res(42); } }</code> works: any object with a <code>then</code> method is treated as promise-like. Its <code>then</code> is called inside a microtask (not synchronously), which is why thenables cost an extra tick.</p>
<p><b>Implementation.</b> V8 compiles async functions to resumable bytecode: <code>SuspendGenerator</code>/<code>ResumeGenerator</code> save and restore the register file into a heap-allocated generator object. That is why a paused async function costs memory but no stack — thousands of pending awaits are fine; thousands of nested synchronous calls are not.</p>
<p><b>Related syntax.</b> Top-level <code>await</code> (ES modules only) pauses evaluation of the module and of every module importing it. <code>for await (const x of asyncIterable)</code> awaits each <code>next()</code>. An <code>async</code> arrow has no own <code>this</code>, like any arrow.</p>`,
    aiEra: `<p><b>What AI changes:</b> almost all AI-generated JS is async/await-heavy, and it reads beautifully — which hides cost. Typical generated anti-patterns: <code>await</code> inside loops for independent requests (N× slower), <code>async</code> on functions that never await, <code>array.forEach(async …)</code> that silently does not wait, and floating promises (calling an async function without await or catch).</p>
<p><b>Use AI as a partner:</b> <code>"Find every await in this file whose operations are independent and could run in parallel with Promise.all, and every floating promise."</code> Turn on <code>@typescript-eslint/no-floating-promises</code> and <code>no-misused-promises</code> and ask the assistant to fix the reports one by one with explanations.</p>
<p><b>Where AI goes wrong:</b> claiming <code>await</code> "blocks the thread", that code before the first await runs asynchronously, or that <code>await nonPromise</code> is a no-op. It may also replace sequential awaits with <code>Promise.all</code> where order matters (e.g. "create user, then create their profile").</p>
<p><b>What you must still own:</b> the three facts (returns a promise, sync until first await, continuation = microtask) and the dependency judgement of what may run in parallel.</p>`,
    problems: [
      {
        title: 'await of another async function vs a plain then',
        level: 'Medium', tags: ['async/await', 'microtask', 'ticks'], companies: ['Amazon', 'Walmart', 'Atlassian'],
        statement: `<p>Predict the exact output (modern Node/Chrome):</p><pre>async function one() {
  console.log('one start');
  await two();
  console.log('one end');
}
async function two() {
  console.log('two');
}
console.log('script start');
one();
Promise.resolve().then(() =&gt; console.log('then'));
console.log('script end');</pre>`,
        constraints: `Node 12+ or any current browser.`,
        example: `<p>${H.c('g', 'script start')} → ${H.c('g', 'one start')} → ${H.c('g', 'two')} → ${H.c('g', 'script end')} → ${H.c('p', 'one end')} → ${H.c('p', 'then')}. two() returns an already-fulfilled native promise; awaiting it costs exactly one tick, and that continuation was queued <i>before</i> the then-callback.</p>`,
        brute: {
          why: `<p>The "await waits for everything else first" model puts <b>one end</b> last. Another outdated model (pre-2019 engines) gave await 3 ticks, so <b>then</b> came before <b>one end</b>. Both ignore today's spec: await on a native resolved promise = 1 microtask.</p>`,
          code: `// Outdated 3-tick model (Node 10 era) — gives the wrong order today
const oldEngineOrder = ['script start', 'one start', 'two', 'script end', 'then', 'one end'];
console.log(oldEngineOrder.join(' | '));`
        },
        mcq: { q: 'Is "two" printed synchronously?', options: ['No, two is async so it runs later', 'Yes — calling an async function runs its body synchronously until an await (two has none)', 'Only in Node', 'Only after one end'], answer: 1, explain: 'Async functions run synchronously until their first await. two() has no await, so its log happens immediately, and it returns a fulfilled promise.' },
        hints: [
          `<p>Hint 1: Run all sync code first, including the bodies of one() and two() up to the first await.</p>`,
          `<p>Hint 2: <code>await two()</code>: two() returned an already-fulfilled promise → the continuation of one() is queued <b>now</b> (1 tick).</p>`,
          `<p>Hint 3: The then-callback is queued after that. Microtask FIFO → one end, then.</p>`
        ],
        tests: {"io":true,"cases":[{"stdin":"","stdout":"script start\none start\ntwo\nscript end\none end\nthen"}]},
        solution: {
          approach: `<p>Sync: script start, one start, two (inside one → two), then one suspends at await with its continuation queued. Then the .then callback is queued. script end. Drain: continuation (one end), then-callback (then).</p>`,
          code: { lang: 'js', run: true, code: `async function one() {
  console.log('one start');
  await two();
  console.log('one end');
}
async function two() {
  console.log('two');
}
console.log('script start');
one();
Promise.resolve().then(() => console.log('then'));
console.log('script end');

// Expected output:
// script start
// one start
// two
// script end
// one end
// then` },
          dry: { head: ['step', 'running', 'microtask queue', 'printed'], rows: [
            ['1', 'script', '—', 'script start'],
            ['2', 'one() → two()', '—', '… one start, two'],
            ['3', 'one() hits await', 'resume one', '…'],
            ['4', 'script queues then', 'resume one, then', '… script end'],
            ['5', 'drain', 'then', '… one end'],
            ['6', 'drain', '—', '<span class="c-g">… one end, then</span>']
          ] },
          complexity: `<p>O(statements). Tick rule used: await on a fulfilled native promise = 1 microtask.</p>`,
          followUps: ['Make two() return Promise.resolve() explicitly. Does the order change? (Yes: +2 ticks → then first.)', 'What if one() is awaited by another async function?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 7 — Error handling in async code
     ====================================================================== */
  var ERR_CODE = "function risky() {\n  setTimeout(() => {\n    throw new Error('late');\n  }, 0);\n}\ntry {\n  risky();\n  console.log('A: try finished');\n} catch (e) {\n  console.log('never printed: ' + e.message);\n}\nasync function safe() {\n  try {\n    await Promise.reject(new Error('nope'));\n  } catch (e) {\n    console.log('C: caught ' + e.message);\n  }\n}\nsafe();\nconsole.log('B: script end');";

  topics.push({
    title: 'Async Error Handling: try/catch, .catch, await & Unhandled Rejections',
    analogy: `<p>Our waiter takes your order and walks away. Ten minutes later the kitchen discovers the fish is burnt. Who hears the bad news?</p><ul><li>If you only told the waiter <i>"shout if anything goes wrong <b>while you are standing here</b>"</i> (that is <code>try/catch</code> around <code>setTimeout</code>), nobody hears it: the waiter left long ago. The kitchen yells into an empty room — an <b>uncaught error</b>.</li><li>A <b>promise</b> is a written ticket. Bad news is written <i>on the ticket</i> ("rejected: fish burnt") and the ticket travels down the line until someone signs for it (<code>.catch</code>). Everyone in between who only handles good news (<code>.then</code>) just passes it along.</li><li><code>await</code> is the waiter coming <b>back to your table</b> with the ticket. If it says "rejected", he tells you right there — so your <code>try/catch</code> at the table works again.</li><li>If a bad-news ticket reaches the end of the shift unsigned, the manager notices: an <b>unhandled rejection</b>. A browser writes it in the log book; Node.js closes the restaurant (crashes the process).</li></ul>`,
    explain: `<p>Async errors confuse people because the code that <i>schedules</i> work and the code that <i>runs</i> it live on different call stacks. Six rules cover everything:</p>
<ol>
<li><b>try/catch only catches what is thrown while its frame is on the stack.</b> A callback that runs later (timer, event, I/O) starts on a fresh, almost empty stack. A <code>try</code> around <code>setTimeout(…)</code> finished long before the callback runs, so it catches nothing.</li>
<li><b>Inside promise land, a throw becomes a rejection.</b> If a <code>new Promise</code> executor or a <code>.then</code> callback throws, the error is captured and the promise is <span class="c-r">rejected</span> — it does not crash anything right away.</li>
<li><b>A rejection skips every <code>.then(onFulfilled)</code> until it meets a <code>.catch</code></b> (or a <code>.then(_, onRejected)</code>). Each skipped link still costs one microtask turn.</li>
<li><b><code>.catch</code> recovers.</b> Whatever it returns becomes a <b>fulfilled</b> value, so the chain continues with <code>.then</code>s after it. Re-throw inside <code>.catch</code> if you only want to log and pass the error on.</li>
<li><b><code>await</code> turns a rejection back into a <code>throw</code></b> at the await line — in the resumed function, as a microtask. So a plain <code>try/catch</code> around <code>await</code> works, because the try block was saved together with the paused function.</li>
<li><b>Nobody handled it?</b> After the microtask queue is empty, the host reports rejected promises without a handler. Browsers: console says <code>Uncaught (in promise)</code> and an <code>unhandledrejection</code> event fires. <b>Node.js 15+</b>: the process <b>crashes</b> (default <code>--unhandled-rejections=throw</code>) unless you listen to <code>process.on('unhandledRejection')</code>.</li>
</ol>
${H.table(['Where the error is thrown', 'What happens', 'How to catch it'], [
  ['Synchronous code', 'normal exception, bubbles up the stack', '<code>try/catch</code> around the call'],
  ['Timer / event / I/O callback', '<span class="c-r">uncaught</span> — browser logs it, Node crashes', 'try/catch <b>inside</b> the callback, or <code>window.onerror</code> / <code>process.on(\'uncaughtException\')</code> as a last resort'],
  ['<code>queueMicrotask</code> callback', 'reported like an uncaught exception (not a rejection)', 'try/catch inside the callback'],
  ['<code>new Promise</code> executor or <code>.then</code> callback', 'the promise is rejected', '<code>.catch</code> later in the chain, or <code>await</code> + try/catch'],
  ['<code>async</code> function body', 'its returned promise is rejected', '<code>await</code> it in try/catch, or <code>.catch</code> on the call']
])}
<p>The rejection's journey down a chain, one microtask per link:</p>
${H.arr(['reject(E)', '.then(A) skipped', '.then(B) skipped', '.catch(fix)', '.then(C) runs'], { label: 'Promise.reject(E).then(A).then(B).catch(fix).then(C)', hl: { 0: 'r', 1: 'm', 2: 'm', 3: 'g', 4: 'g' } })}
<p><b>Two traps:</b> (1) <code>.then(ok, onRejected)</code> does <b>not</b> catch errors thrown by <code>ok</code> itself — only a later <code>.catch</code> does. (2) <code>return promise</code> inside <code>try</code> of an async function skips that function's <code>catch</code>; write <code>return await promise</code> there.</p>`,
    clues: [
      '"Why doesn’t my try/catch catch this error?" → the error is thrown in a later callback, on a different stack',
      '"What happens to an error thrown inside .then?" → the returned promise rejects; the next .catch gets it',
      '"Node process crashed with UnhandledPromiseRejection" → a rejected promise nobody awaited or caught (Node 15+ throws)',
      '"Output-order question with reject/catch/finally" → each skipped .then still costs one microtask tick',
      '"return vs return await inside try" → only return await lets the local catch see the rejection',
      '"Promise.all rejects but other requests still run" → fail-fast settles early; it does not cancel the others',
      '"Global error handler for async code" → window unhandledrejection / process.on(\'unhandledRejection\') for logging, not for control flow'
    ],
    code: [
      { lang: 'js', title: 'Where does each error go? (runnable)', run: true, code: `// 1) An error thrown inside .then becomes a rejection, skips the next .then, lands in .catch
Promise.resolve('order')
  .then((x) => {
    throw new Error('fish burnt while cooking ' + x);
  })
  .then(() => console.log('never: this .then is skipped'))
  .catch((err) => {
    console.log('1. catch got: ' + err.message);
    return 'free dessert';                       // recovering: the chain is fulfilled again
  })
  .then((v) => console.log('2. chain continues with: ' + v));

// 2) await turns the rejection back into a throw, so try/catch works
async function serveTable() {
  try {
    await Promise.reject(new Error('out of soup'));
    console.log('never: skipped because await threw');
  } catch (err) {
    console.log('3. try/catch around await got: ' + err.message);
  } finally {
    console.log('4. finally always runs (clear the table)');
  }
}
serveTable();

// 3) Errors thrown in a timer must be caught INSIDE the callback
setTimeout(() => {
  try {
    JSON.parse('{ broken json');
  } catch (err) {
    console.log('5. caught inside the timer callback: ' + err.name);
  }
}, 0);

// Expected output:
// 3. try/catch around await got: out of soup
// 4. finally always runs (clear the table)
// 1. catch got: fish burnt while cooking order
// 2. chain continues with: free dessert
// 5. caught inside the timer callback: SyntaxError` }
    ],
    codeTitle: ['Errors in promise land vs timer land'],
    viz: [
      {
        title: 'A rejection travels down the chain; a timer error is uncaught (editable)',
        input: 'log s\nreject E1 then skip catch fix then next\nthen { throw E2 } catch got2\ntimeout { log t; throw Boom }\nlog e',
        inputLabel: 'Mini-program (reject E then A catch B · then { throw E } catch F · timeout { throw E } · async { await; throw E })',
        gen: function (input) { return elSim(input, { endNote: 'Promise errors flow to the next catch (one microtask per link); the timer error had no catch around it.' }); }
      },
      {
        title: 'Unhandled rejections: who forgot to catch? (editable)',
        input: 'async { log a1; await; throw Oops }\nreject Lost then never\nreject E catch fixed\nlog end',
        inputLabel: 'Mini-program',
        gen: function (input) { return elSim(input, { endNote: 'Every rejection needs a catch (or an await inside try/catch). Browsers log the rest; Node.js 15+ crashes.' }); }
      },
      {
        title: 'try/catch around setTimeout vs try/catch around await',
        gen: function () {
          var o1 = ['A: try finished'], o2 = o1.concat(['B: script end']), o3 = o2.concat(['C: caught nope']), o4 = o3.concat(['Uncaught Error: late']);
          return elScript(ERR_CODE, [
            { l: 6, stack: ['main script'], narr: 'The script enters a <code>try</code> block. Important: a try/catch only guards code that runs <b>while this frame is on the call stack</b>.' },
            { l: 7, stack: ['main script', 'risky()'], narr: '<code>risky()</code> is called, so a frame for it is pushed on top of the stack.' },
            { l: 2, stack: ['main script', 'risky()', 'setTimeout'], web: ['⏱ throwing cb · 0 ms'], wn: '⏱ throwing cb · 0 ms', narr: '<b>setTimeout</b> hands the callback to the Web APIs and returns at once. Nothing has been thrown yet — the callback has not even started.' },
            { l: 5, stack: ['main script'], narr: '<code>risky()</code> returns normally. Its frame is popped.' },
            { l: 8, out: o1, outNew: true, narr: 'Prints <b>A</b>. As far as the try block knows, everything went fine.' },
            { l: 9, cls: 'done', web: [], macro: ['timeout throwing cb'], ma: { 0: 'ok' }, narr: 'The try block ends without an error, so the <code>catch</code> is skipped — and this try/catch is now <b>gone forever</b>. Meanwhile the 0 ms timer is done; its callback moves to the <b>task queue</b>.' },
            { l: 19, stack: ['main script', 'safe()'], narr: 'Calling the async function <code>safe()</code>: it runs synchronously until its first await.' },
            { l: 14, stack: ['main script', 'safe()', 'Promise.reject'], narr: '<code>Promise.reject(…)</code> creates an already <span class="c-r">rejected</span> promise. Creating it does not throw anything.' },
            { l: 14, stack: ['main script'], micro: ['resume safe (throw)'], mi: { 0: 'ok' }, narr: '<code>await</code> subscribes to that promise. It is already rejected, so a job "resume safe by <b>throwing</b> the reason" is queued as a <b>microtask</b>. safe pauses — and its paused state includes the <b>try block it is in</b>.' },
            { l: 20, out: o2, outNew: true, narr: 'Prints <b>B</b>. The script is over.' },
            { l: null, stack: [], phase: '② drain ALL microtasks', ph: 'cur', narr: 'The stack is empty, so the event loop drains the microtask queue first.' },
            { l: 14, cls: 'bad', stack: ['resume safe (throw)'], micro: [], narr: 'safe <b>resumes</b>: the <code>await</code> expression <b>throws</b> the error "nope" right at line 14 — and we are inside safe\'s try block, which is on the stack again.' },
            { l: 16, out: o3, outNew: true, narr: 'The catch block runs and prints <b>C: caught nope</b>. This is why <code>await</code> + try/catch feels like normal synchronous error handling.' },
            { l: 18, stack: [], narr: 'safe finishes; its promise is fulfilled with <code>undefined</code>. Microtask queue is empty.' },
            { l: null, phase: '③ run ONE task', ph: 'cur', ma: { 0: 'cur' }, narr: 'Now the event loop takes the oldest task: the timer callback.' },
            { l: 3, cls: 'bad', stack: ['timeout throwing cb'], macro: [], narr: 'The callback throws "late". Look at the stack: <b>only the callback</b> is on it. The try/catch from line 6 finished long ago, so nobody is there to catch it.' },
            { l: 3, cls: 'bad', stack: [], out: o4, outNew: true, narr: 'The browser reports <span class="c-r">Uncaught Error: late</span> and the event loop carries on with the next task. In Node.js an uncaught exception <b>crashes</b> the process (unless <code>process.on(\'uncaughtException\')</code> is set).' },
            { l: null, phase: '✓ done', ph: 'ok', narr: 'Lesson: put try/catch <b>inside</b> callbacks, or use promises + <code>await</code> so errors come back to the code that is waiting for them.' }
          ]);
        }
      }
    ],
    examples: [
      {
        title: 'try/catch around setTimeout catches nothing',
        html: `<p>The callback runs on a new stack, after the try block is over. This demo installs a <b>global last-resort handler</b> so the snippet keeps running in both Node and the browser; in real code you would put the try/catch inside the callback.</p>`,
        code: { lang: 'js', run: true, code: `// Last-resort global handlers (Node or browser), only so this demo does not crash.
if (typeof process !== 'undefined' && process.on) {
  process.on('uncaughtException', (err) => console.log('global handler got: ' + err.message));
} else if (typeof window !== 'undefined') {
  window.addEventListener('error', (ev) => {
    console.log('global handler got: ' + (ev.error ? ev.error.message : ev.message));
    ev.preventDefault();
  });
}

try {
  setTimeout(() => {
    throw new Error('thrown later, on a fresh stack');
  }, 0);
  console.log('try block finished without error');
} catch (err) {
  console.log('never printed');
}

// Expected output:
// try block finished without error
// global handler got: thrown later, on a fresh stack` }
      },
      {
        title: 'Rejection skips .then links — and each skip costs a tick',
        html: `<p>Two chains start together. Chain A is rejected and has two <code>.then</code>s before its <code>.catch</code>; chain B is fulfilled. Every link of A — even the skipped ones — takes one microtask turn, so B overtakes it.</p>${H.table(['tick', 'chain A (rejected)', 'chain B (fulfilled)'], [['1', '.then skipped', 'prints B1'], ['2', '.then skipped', 'prints B2'], ['3', '<span class="c-g">.catch prints A-caught</span>', 'prints B3']])}`,
        code: { lang: 'js', run: true, code: `Promise.reject(new Error('A'))
  .then(() => console.log('A1 (skipped)'))
  .then(() => console.log('A2 (skipped)'))
  .catch((e) => console.log(e.message + '-caught'));

Promise.resolve()
  .then(() => console.log('B1'))
  .then(() => console.log('B2'))
  .then(() => console.log('B3'));

// Expected output:
// B1
// B2
// A-caught
// B3` }
      },
      {
        title: '.then(ok, onRejected) does not catch errors thrown by ok',
        html: `<p>The second argument of <code>.then</code> only handles a rejection of the promise <b>before</b> it. If <code>ok</code> itself throws, that error rejects the <i>next</i> promise and needs a later <code>.catch</code>. That is why <code>.then(ok).catch(handle)</code> is usually what you want.</p>`,
        code: { lang: 'js', run: true, code: `Promise.resolve('data')
  .then(
    (v) => { throw new Error('bug inside ok handler for ' + v); },
    (err) => console.log('onRejected: never sees the bug')
  )
  .catch((err) => console.log('later .catch got: ' + err.message));

// Expected output:
// later .catch got: bug inside ok handler for data` }
      },
      {
        title: 'return vs return await inside try',
        html: `<p>With plain <code>return promise</code>, the function leaves its try block <b>before</b> the promise rejects, so its catch never runs and the caller gets the rejection. <code>return await</code> waits inside the try, so the local catch can handle it.</p>`,
        code: { lang: 'js', run: true, code: `const failSoon = () => new Promise((_, reject) => setTimeout(() => reject(new Error('db down')), 10));

async function withoutAwait() {
  try {
    return failSoon();            // leaves the try immediately
  } catch (e) {
    return 'fallback (never used)';
  }
}

async function withAwait() {
  try {
    return await failSoon();      // waits INSIDE the try
  } catch (e) {
    return 'fallback because ' + e.message;
  }
}

withoutAwait()
  .then((v) => console.log('withoutAwait: ' + v))
  .catch((e) => console.log('withoutAwait rejected to caller: ' + e.message))
  .then(() => withAwait())
  .then((v) => console.log('withAwait: ' + v));

// Expected output:
// withoutAwait rejected to caller: db down
// withAwait: fallback because db down` }
      },
      {
        title: 'finally passes values through — unless it throws',
        html: `<p><code>.finally(cb)</code> gets no argument and does not change the result: a fulfilled value or a rejection flows through it. But if <code>cb</code> throws (or returns a rejected promise), that new error <b>replaces</b> the old outcome.</p><p><b>Tick detail:</b> to pass a value through, <code>finally</code> internally returns <code>Promise.resolve(cb()).then(() =&gt; value)</code> — a promise returned from a handler, which costs <b>extra microtask ticks</b>. A throwing <code>cb</code> rejects at once, so the third chain prints <i>first</i> below.</p>`,
        code: { lang: 'js', run: true, code: `Promise.resolve(42)
  .finally(() => console.log('cleanup 1 (no argument received)'))
  .then((v) => console.log('value survived finally: ' + v));

Promise.reject(new Error('original'))
  .finally(() => console.log('cleanup 2'))
  .catch((e) => console.log('rejection survived finally: ' + e.message));

Promise.resolve('ok')
  .finally(() => { throw new Error('cleanup failed'); })
  .catch((e) => console.log('finally error replaced the value: ' + e.message));

// Expected output:
// cleanup 1 (no argument received)
// cleanup 2
// finally error replaced the value: cleanup failed
// value survived finally: 42
// rejection survived finally: original` }
      },
      {
        title: 'Throw after resolve is ignored; executor throw rejects',
        html: `<p>A promise settles <b>once</b>. A throw in the executor before settling rejects it; a throw <i>after</i> <code>resolve()</code> is silently swallowed (the promise already settled). A throw inside an <b>async callback</b> in the executor (e.g. a timer) is not captured at all — it is a normal uncaught error.</p>`,
        code: { lang: 'js', run: true, code: `const p1 = new Promise(() => {
  throw new Error('executor threw');
});
p1.catch((e) => console.log('p1 rejected: ' + e.message));

const p2 = new Promise((resolve) => {
  resolve('first answer wins');
  throw new Error('ignored, already settled');
});
p2.then((v) => console.log('p2 fulfilled: ' + v));

const p3 = new Promise((resolve, reject) => {
  resolve('A');
  reject(new Error('too late'));   // ignored too
  resolve('B');                    // ignored
});
p3.then((v) => console.log('p3 fulfilled: ' + v));

// Expected output:
// p1 rejected: executor threw
// p2 fulfilled: first answer wins
// p3 fulfilled: A` }
      },
      {
        title: 'Promise.all fails fast, allSettled never rejects, any needs one success',
        html: `<p>When failures are expected (e.g. 3 widgets on a dashboard), choose the combinator that matches what you want to happen. <code>Promise.all</code> rejects on the first failure but does <b>not cancel</b> the other operations — they keep running.</p>${H.table(['combinator', 'one fails', 'result'], [['Promise.all', 'rejects immediately', 'array of values, or first error'], ['Promise.allSettled', 'keeps waiting', 'array of {status, value | reason}'], ['Promise.any', 'keeps waiting for a success', 'first value, or AggregateError if all fail'], ['Promise.race', 'whichever settles first', 'first value or first error']])}`,
        code: { lang: 'js', run: true, code: `const ok = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
const fail = (ms, m) => new Promise((_, j) => setTimeout(() => j(new Error(m)), ms));

async function demo() {
  try {
    await Promise.all([ok(30, 'profile'), fail(10, 'ads down'), ok(20, 'feed')]);
  } catch (e) {
    console.log('all: rejected fast with "' + e.message + '"');
  }

  const settled = await Promise.allSettled([ok(10, 'profile'), fail(5, 'ads down')]);
  console.log('allSettled: ' + settled.map((r) => r.status + ':' + (r.value || r.reason.message)).join(', '));

  const first = await Promise.any([fail(5, 'mirror1'), ok(15, 'mirror2'), ok(25, 'mirror3')]);
  console.log('any: first success = ' + first);

  try {
    await Promise.any([fail(5, 'x'), fail(10, 'y')]);
  } catch (e) {
    console.log('any: ' + e.constructor.name + ' with ' + e.errors.length + ' errors');
  }
}
demo();

// Expected output:
// all: rejected fast with "ads down"
// allSettled: fulfilled:profile, rejected:ads down
// any: first success = mirror2
// any: AggregateError with 2 errors` }
      },
      {
        title: 'Catching unhandled rejections globally (and "handled later")',
        html: `<p>Global hooks are for <b>logging and alerting</b>, not normal control flow. In Node, registering <code>process.on('unhandledRejection')</code> also stops the default crash. Browsers fire <code>unhandledrejection</code> on <code>window</code>, and <code>rejectionhandled</code> if a <code>.catch</code> is attached later.</p>`,
        code: { lang: 'js', run: true, code: `if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason) => console.log('[monitor] unhandled: ' + reason.message));
} else if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (ev) => {
    console.log('[monitor] unhandled: ' + ev.reason.message);
    ev.preventDefault();
  });
}

async function saveDraft() {
  throw new Error('quota exceeded');
}

saveDraft();              // floating promise: no await, no .catch
console.log('script continues, nobody is listening to saveDraft()');

// Expected output:
// script continues, nobody is listening to saveDraft()
// [monitor] unhandled: quota exceeded` }
      }
    ],
    deepDive: `<p><b>Spec view of a throw in a reaction.</b> A promise reaction job calls your handler inside an abrupt-completion check: if the handler throws, the job calls <code>reject</code> of the derived promise instead of letting the exception escape. That is why a throw inside <code>.then</code> never reaches <code>window.onerror</code>. <code>queueMicrotask</code> callbacks have no derived promise, so their exceptions are "reported" like a script error.</p>
<p><b>How "unhandled" is decided.</b> The engine calls <code>HostPromiseRejectionTracker(promise, "reject")</code> when a promise is rejected with no handlers, and <code>"handle"</code> when a handler is attached later. HTML collects these in an "about-to-be-notified" list and fires <code>unhandledrejection</code> after the microtask checkpoint; if a handler appears later, <code>rejectionhandled</code> fires. Node follows the same idea (process <code>'unhandledRejection'</code> / <code>'rejectionHandled'</code>), and since <b>Node 15</b> the default mode is <code>throw</code>: an unhandled rejection becomes an uncaught exception and kills the process. Modes: <code>--unhandled-rejections=strict|throw|warn|none|warn-with-error-code</code>.</p>
<p><b>Attach handlers early.</b> Because detection runs after microtasks, a rejection with a <code>.catch</code> attached <i>in the same synchronous run</i> or even a microtask later is fine. Attaching one after an <code>await</code> on <i>something else</i> is not: <code>const a = fetchA(); const b = fetchB(); await a; await b;</code> — if b rejects while you wait on a, b is briefly unhandled and Node may crash. Use <code>await Promise.all([a, b])</code>.</p>
<p><b>Async stack traces.</b> A rejection's <code>err.stack</code> shows the frames at the throw point. V8's "zero-cost async stack traces" add <code>at async fn</code> frames by following the awaiting chain — they only work across <code>await</code>, not across <code>.then</code> or <code>return promise</code>. Another reason for <code>return await</code> in try blocks and for awaiting rather than chaining in hot debugging paths.</p>
<p><b>Error-first callbacks</b> (Node's old style: <code>fs.readFile(p, (err, data) =&gt; …)</code>) never throw; errors arrive as the first argument and must be checked manually. <code>util.promisify</code> converts them into promise-returning functions so rejections flow into try/await. Event emitters are a third model: an <code>'error'</code> event with no listener throws.</p>
<p><b>Cancellation is not an error model in promises.</b> Promises cannot be cancelled; use an <code>AbortController</code> signal and treat <code>AbortError</code> as a special, expected rejection. Timeouts: <code>AbortSignal.timeout(ms)</code> (fetch) or <code>Promise.race</code> with a timer — and clear that timer.</p>
<p><b>Production reality.</b> Always send global unhandled errors and rejections to monitoring (Sentry, Datadog). Custom error classes (<code>class HttpError extends Error</code>) and <code>new Error(msg, { cause })</code> (ES2022) keep the original reason when you wrap and re-throw.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code often wraps everything in <code>try/catch</code> that only logs (<code>catch (e) { console.log(e) }</code>), swallowing failures and returning <code>undefined</code> to callers. It also produces floating promises — calling an async function without await or catch — which in Node 15+ can crash a server at 3 a.m.</p>
<p><b>Use AI as a partner:</b> <code>"List every promise in this module that can reject without a handler, every catch that swallows the error, and every try block that contains return somePromise without await."</code> Enable <code>@typescript-eslint/no-floating-promises</code>, <code>no-misused-promises</code> and <code>prefer-promise-reject-errors</code>, then ask the assistant to fix each report and explain why.</p>
<p><b>Where AI goes wrong:</b> suggesting a try/catch around <code>setTimeout</code> or around a non-awaited call; claiming <code>.then(ok, onRejected)</code> catches errors in <code>ok</code>; adding <code>process.on('unhandledRejection', () =&gt; {})</code> to "fix" a crash (hiding the bug); or saying unhandled rejections are "just warnings" — true only before Node 15.</p>
<p><b>What you must still own:</b> knowing which stack an error is thrown on, and a clear policy per layer: where errors are handled, where they are converted (wrap with <code>cause</code>), and where they are reported.</p>`,
    problems: [
      {
        title: 'Rejections, catch and await in one program',
        level: 'Medium', tags: ['error handling', 'microtask', 'catch', 'await'], companies: ['Microsoft', 'Flipkart', 'Shopify'],
        statement: `<p>Predict the exact output:</p><pre>setTimeout(() =&gt; console.log('T'), 0);
Promise.reject(new Error('E1'))
  .then(() =&gt; console.log('skip'))
  .catch((e) =&gt; { console.log('caught ' + e.message); return 'ok'; })
  .then((v) =&gt; console.log('then ' + v));
(async () =&gt; {
  try {
    await Promise.reject(new Error('E2'));
  } catch (e) {
    console.log('async caught ' + e.message);
  }
  console.log('async after');
})();
console.log('S');</pre>`,
        constraints: `Any modern browser or Node.js 12+.`,
        example: `<p>Output: ${H.c('g', 'S')} → ${H.c('p', 'async caught E2')} → ${H.c('p', 'async after')} → ${H.c('p', 'caught E1')} → ${H.c('p', 'then ok')} → ${H.c('b', 'T')}. The skipped <code>.then</code> costs chain 1 a whole tick, so the async function's catch (1 tick) wins.</p>`,
        brute: {
          why: `<p>The "errors are handled immediately" model assumes a rejected promise jumps straight to its <code>.catch</code>. It predicts <b>caught E1</b> first, because that chain was written first. It forgets that the skipped <code>.then</code> is still a microtask turn.</p>`,
          code: `// Naive model: a rejection jumps straight to .catch (wrong)
const naive = ['S', 'caught E1', 'async caught E2', 'async after', 'then ok', 'T'];
console.log(naive.join(' | '));`
        },
        mcq: { q: 'How many microtask turns does it take for "caught E1" to print after the script ends?', options: ['0 — it prints synchronously', '1', '2 — one for the skipped .then, one for .catch', '3'], answer: 2, explain: 'The rejected promise first reaches the .then link (it passes the rejection on: tick 1), then the .catch runs (tick 2).' },
        hints: [
          `<p>Hint 1: Only S is synchronous. After the script the microtask queue holds two jobs: the skipped .then link and the async function's resume-with-throw.</p>`,
          `<p>Hint 2: Tick 1: the .then passes the rejection on (queues .catch); the async function resumes, throws at await, its catch prints and it continues to "async after".</p>`,
          `<p>Hint 3: Tick 2: .catch prints and returns 'ok' (queues the last .then). Tick 3: "then ok". Only then the timer task T.</p>`
        ],
        tests: {"io":true,"cases":[{"stdin":"","stdout":"S\nasync caught E2\nasync after\ncaught E1\nthen ok\nT"}]},
        solution: {
          approach: `<p>Track each chain one microtask at a time. Chain 1 needs 3 ticks (skip, catch, then). The async function needs 1 tick (resume into catch), and it runs the rest of its body synchronously in that same tick. Timer last.</p>`,
          code: { lang: 'js', run: true, code: `setTimeout(() => console.log('T'), 0);
Promise.reject(new Error('E1'))
  .then(() => console.log('skip'))
  .catch((e) => { console.log('caught ' + e.message); return 'ok'; })
  .then((v) => console.log('then ' + v));
(async () => {
  try {
    await Promise.reject(new Error('E2'));
  } catch (e) {
    console.log('async caught ' + e.message);
  }
  console.log('async after');
})();
console.log('S');

// Expected output:
// S
// async caught E2
// async after
// caught E1
// then ok
// T` },
          dry: { head: ['tick', 'job running', 'microtask queue after', 'printed'], rows: [
            ['script', 'main script', '[skip-link, resume async]', 'S'],
            ['1', 'skip-link passes E1 on', '[resume async, catch]', '—'],
            ['1', 'resume async → throws at await → catch', '[catch]', 'async caught E2, async after'],
            ['2', 'catch(E1) returns ok', '[then]', 'caught E1'],
            ['3', 'then', '[]', 'then ok'],
            ['task', 'timer', '[]', '<span class="c-g">T</span>']
          ] },
          complexity: `<p>O(number of chain links): each link is exactly one microtask, skipped or not.</p>`,
          followUps: ['Remove the .then("skip") link. What is the new order? (caught E1 and async caught E2 swap.)', 'Replace the async try/catch with no try at all. What does Node print, and does the process survive?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 8 — Output-order puzzles: a repeatable method + the famous ones
     ====================================================================== */
  var FAMOUS_CODE = "async function async1() {\n  console.log('async1 start');\n  await async2();\n  console.log('async1 end');\n}\nasync function async2() {\n  console.log('async2');\n}\nconsole.log('script start');\nsetTimeout(() => console.log('setTimeout'), 0);\nasync1();\nnew Promise((resolve) => {\n  console.log('promise1');\n  resolve();\n}).then(() => console.log('promise2'));\nconsole.log('script end');";
  var FOUR_CODE = "Promise.resolve().then(() => {\n  console.log(0);\n  return Promise.resolve(4);\n}).then((res) => console.log(res));\nPromise.resolve().then(() => console.log(1))\n  .then(() => console.log(2))\n  .then(() => console.log(3))\n  .then(() => console.log(5))\n  .then(() => console.log(6));";

  topics.push({
    title: 'Output-Order Puzzles: The 4-Column Method & the Famous Interview Questions',
    analogy: `<p>Imagine the waiter's notebook has <b>four columns</b>: <i>Doing now</i> (the call stack), <i>Waiting in the kitchen</i> (Web APIs: timers, network), <i>Pass counter</i> (task queue) and <i>Urgent clipboard</i> (microtask queue). Before you guess anything, you fill in the notebook line by line, exactly like the waiter would. Puzzles stop being "tricky" and become <b>bookkeeping</b>: you are not guessing the order, you are <i>replaying</i> the waiter's night.</p>`,
    explain: `<p>Every "predict the output" question is solved with the same five steps. Draw four columns on paper: <b>Output · Microtasks · Tasks · Waiting (timers / pending promises)</b>.</p>
<ol>
<li><b>Run the script top to bottom.</b> Every <code>console.log</code> that is executed now goes straight to <i>Output</i>. Remember what also runs <b>now</b>: a <code>new Promise</code> executor, the body of an async function up to its first <code>await</code>, and the expression being awaited (<code>await f()</code> calls <code>f</code> now).</li>
<li><b>Put each callback in the right column</b> the moment it is scheduled:
<ul><li><code>.then/.catch/.finally</code> on an <b>already settled</b> promise, <code>queueMicrotask</code>, the rest of an async function after <code>await</code> → <b>Microtasks</b> (at the back).</li>
<li><code>.then</code> on a <b>pending</b> promise → <b>Waiting</b>: it is parked <i>on the promise</i>, not in any queue. It moves to Microtasks only when that promise is resolved.</li>
<li><code>setTimeout/setInterval</code> → <b>Waiting</b> until the delay passes, then <b>Tasks</b> (ordered by due time, ties by creation order). <code>setImmediate</code>, I/O, clicks, messages → <b>Tasks</b>.</li></ul></li>
<li><b>Script done → drain Microtasks</b> front to back. Anything a microtask schedules goes into the columns too (new microtasks at the <b>back</b> of the same drain).</li>
<li><b>Take ONE task</b>, run it, then <b>drain Microtasks again</b>. Repeat.</li>
<li><b>Count ticks</b> when two promise chains race. Use the cost table:</li>
</ol>
${H.table(['Situation', 'Microtask ticks until the next step runs'], [
  ['<code>.then(cb)</code> on a fulfilled promise', '1'],
  ['next <code>.then</code> in a chain', '+1 per link (skipped links too)'],
  ['<code>await</code> a value or a native promise that is fulfilled', '1'],
  ['<code>return value</code> from an async function / then-callback', '0 extra (settles at once)'],
  ['<code>return somePromise</code> from an async function or a then-callback, <code>resolve(somePromise)</code>', '<b>+2</b> (resolve-thenable job + then job)'],
  ['<code>await</code> a non-native thenable <code>{ then(r) { r(x) } }</code>', '2 (its then is called in a job)'],
  ['Node: <code>process.nextTick</code>', 'runs before all promise jobs (CommonJS)']
])}
<p>Applied to the most famous interview puzzle (code in the visualizer below):</p>
${H.table(['Step', 'Output', 'Microtasks', 'Tasks'], [
  ['sync', 'script start, async1 start, async2, promise1, script end', 'async1 resume, promise2', 'setTimeout'],
  ['drain', '… async1 end, promise2', '—', 'setTimeout'],
  ['task', '… setTimeout', '—', '—']
])}
<p>Answer: <b>script start → async1 start → async2 → promise1 → script end → async1 end → promise2 → setTimeout</b>.</p>`,
    clues: [
      '"What is the output of the following code?" with setTimeout + Promise + async → use the 4-column method',
      '"script start / async1 start / async2 / promise1" → the classic ByteDance/Toutiao puzzle; answer has async1 end before promise2 (modern engines)',
      '"return Promise.resolve(4) inside then" → +2 ticks; answer 0 1 2 3 4 5 6',
      '"for (var i…) setTimeout(() =&gt; console.log(i))" → closures + task queue: prints the final i each time',
      '"In Node.js" + nextTick / setImmediate in the question → add the nextTick lane and the libuv phases',
      '"Explain why X prints before Y" → name the queue each callback is in and the tick it runs on'
    ],
    code: [
      { lang: 'js', title: 'The famous puzzle (runnable)', run: true, code: FAMOUS_CODE + `

// Expected output:
// script start
// async1 start
// async2
// promise1
// script end
// async1 end
// promise2
// setTimeout` }
    ],
    codeTitle: ['Interview classic'],
    viz: [
      {
        title: 'The famous async1/async2 puzzle, line by line',
        gen: function () {
          var o = ['script start'], s = [];
          function add(x) { o = o.concat([x]); return o; }
          s.push({ l: 1, stack: ['main script'], narr: 'Lines 1–8 only <b>define</b> two functions (declarations are hoisted). Nothing is printed yet.' });
          s.push({ l: 9, out: o, outNew: true, narr: 'First executed line: <b>script start</b> (sync).' });
          s.push({ l: 10, stack: ['main script', 'setTimeout'], web: ['⏱ setTimeout cb · 0 ms'], wn: '⏱ setTimeout cb · 0 ms', narr: '<b>setTimeout</b>: the callback goes to the Web APIs with a 0 ms timer. JavaScript does not wait.' });
          s.push({ l: 11, stack: ['main script', 'async1()'], web: [], macro: ['timeout setTimeout'], ma: { 0: 'ok' }, narr: 'The 0 ms timer is already due, so its callback sits in the <b>task queue</b> — but tasks only run when the stack is empty <i>and</i> the microtasks are done. Now <code>async1()</code> is called: its body runs <b>synchronously</b>.' });
          s.push({ l: 2, stack: ['main script', 'async1()', 'console.log'], out: add('async1 start'), outNew: true, narr: 'Prints <b>async1 start</b>.' });
          s.push({ l: 3, stack: ['main script', 'async1()', 'async2()'], narr: '<code>await async2()</code>: the expression after await is evaluated <b>first, right now</b>, so async2 is called.' });
          s.push({ l: 7, stack: ['main script', 'async1()', 'async2()', 'console.log'], out: add('async2'), outNew: true, narr: 'Prints <b>async2</b> — still synchronous.' });
          s.push({ l: 8, stack: ['main script', 'async1()'], narr: 'async2 ends and returns an <b>already-fulfilled</b> promise (async functions always return promises).' });
          s.push({ l: 3, stack: ['main script'], micro: ['async1 resume'], mi: { 0: 'ok' }, narr: 'Now the <b>await</b> itself: the promise is fulfilled, so "resume async1" is queued as a <b>microtask</b> (1 tick in modern engines). async1 pauses and returns control to the script.' });
          s.push({ l: 12, stack: ['main script', 'executor'], narr: '<code>new Promise(executor)</code>: the executor runs <b>immediately</b>.' });
          s.push({ l: 13, stack: ['main script', 'executor', 'console.log'], out: add('promise1'), outNew: true, narr: 'Prints <b>promise1</b> (sync, inside the executor).' });
          s.push({ l: 14, stack: ['main script', 'executor'], narr: '<code>resolve()</code>: the promise is fulfilled. No callback is registered yet, so nothing is queued.' });
          s.push({ l: 15, stack: ['main script', '.then(cb)'], micro: ['async1 resume', 'then promise2'], mi: { 1: 'ok' }, narr: '<code>.then</code> on a fulfilled promise → its callback joins the microtask queue <b>behind</b> "async1 resume".' });
          s.push({ l: 16, stack: ['main script', 'console.log'], out: add('script end'), outNew: true, narr: 'Prints <b>script end</b>. That was the last line.' });
          s.push({ l: null, stack: [], phase: '② drain ALL microtasks', ph: 'cur', narr: 'Stack empty → drain the microtask queue, front first.' });
          s.push({ l: 4, stack: ['async1 resume'], micro: ['then promise2'], out: add('async1 end'), outNew: true, mi: { 0: 'cur' }, narr: 'async1 resumes after its await → <b>async1 end</b>. (Old Node 10-era engines used 3 ticks for await and printed promise2 first — a classic trap in outdated blog posts.)' });
          s.push({ l: 15, stack: ['then promise2'], micro: [], out: add('promise2'), outNew: true, narr: 'The then-callback prints <b>promise2</b>. Microtask queue is empty.' });
          s.push({ l: null, stack: [], phase: '③ run ONE task', ph: 'cur', ma: { 0: 'cur' }, narr: 'Only now does the event loop pick the oldest task: the timer callback.' });
          s.push({ l: 10, stack: ['timeout setTimeout'], macro: [], out: add('setTimeout'), outNew: true, narr: 'Prints <b>setTimeout</b>.' });
          s.push({ l: null, stack: [], phase: '✓ done', ph: 'ok', narr: 'Final: script start → async1 start → async2 → promise1 → script end → async1 end → promise2 → setTimeout.' });
          return elScript(FAMOUS_CODE, s);
        }
      },
      {
        title: 'Why "return Promise.resolve(4)" prints 4 after 3 (tick counting)',
        gen: function () {
          var o = [], s = [], tick = 0;
          function add(x) { o = o.concat([String(x)]); return o; }
          function T(n) { return [{ type: 'vars', label: 'Tick counter (microtasks run so far)', vals: { tick: n, 'chain A waits for': n < 5 ? 'p4 to be adopted' : 'nothing' }, hl: { tick: 'cur' } }]; }
          s.push({ l: 1, stack: ['main script'], micro: ['A: log 0'], mi: { 0: 'ok' }, extra: T(0), narr: 'Chain A: <code>Promise.resolve().then(cb)</code> → cb queued (the promise is already fulfilled).' });
          s.push({ l: 5, micro: ['A: log 0', 'B: log 1'], mi: { 1: 'ok' }, extra: T(0), narr: 'Chain B: its first callback is queued too. The later <code>.then</code>s of both chains are parked on <b>pending</b> promises — not queued yet.' });
          s.push({ l: null, stack: [], phase: '② drain ALL microtasks', ph: 'cur', extra: T(0), narr: 'Script over. Drain microtasks.' });
          s.push({ l: 2, stack: ['A: log 0'], micro: ['B: log 1'], out: add(0), outNew: true, extra: T(1), narr: 'Tick 1: prints <b>0</b>.' });
          s.push({ l: 3, stack: ['A: log 0'], micro: ['B: log 1', 'resolve-thenable job'], mi: { 1: 'ok' }, extra: T(1), narr: 'The callback <b>returns a promise</b> (p4). The promise from <code>.then</code> must <i>adopt</i> p4, which cannot happen synchronously: a <b>NewPromiseResolveThenableJob</b> is queued. Extra tick #1.' });
          s.push({ l: 5, stack: ['B: log 1'], micro: ['resolve-thenable job', 'B: log 2'], out: add(1), outNew: true, mi: { 1: 'ok' }, extra: T(2), narr: 'Tick 2: chain B prints <b>1</b> and queues its next link.' });
          s.push({ l: 3, stack: ['resolve-thenable job'], micro: ['B: log 2', 'p4.then → adopt'], mi: { 1: 'ok' }, extra: T(3), narr: 'Tick 3: the job calls <code>p4.then(resolveA, rejectA)</code>. p4 is fulfilled, so that reaction is queued. Extra tick #2.' });
          s.push({ l: 6, stack: ['B: log 2'], micro: ['p4.then → adopt', 'B: log 3'], out: add(2), outNew: true, mi: { 1: 'ok' }, extra: T(4), narr: 'Tick 4: prints <b>2</b>.' });
          s.push({ l: 4, stack: ['p4.then → adopt'], micro: ['B: log 3', 'A: log res'], mi: { 1: 'ok' }, extra: T(5), narr: 'Tick 5: chain A\'s promise is finally fulfilled with 4 → its <code>.then((res) =&gt; …)</code> is queued — behind B\'s "log 3".' });
          s.push({ l: 7, stack: ['B: log 3'], micro: ['A: log res', 'B: log 5'], out: add(3), outNew: true, mi: { 1: 'ok' }, extra: T(6), narr: 'Tick 6: prints <b>3</b>.' });
          s.push({ l: 4, stack: ['A: log res'], micro: ['B: log 5'], out: add(4), outNew: true, extra: T(7), narr: 'Tick 7: prints <b>4</b> — two ticks later than a plain <code>return 4</code> would have.' });
          s.push({ l: 8, stack: ['B: log 5'], micro: ['B: log 6'], out: add(5), outNew: true, extra: T(8), narr: 'Tick 8: prints <b>5</b>.' });
          s.push({ l: 9, stack: ['B: log 6'], micro: [], out: add(6), outNew: true, extra: T(9), narr: 'Tick 9: prints <b>6</b>.' });
          s.push({ l: null, stack: [], phase: '✓ done', ph: 'ok', extra: T(9), narr: 'Output 0 1 2 3 4 5 6. Rule: returning a <b>promise</b> from a then-callback or async function costs <b>2 extra ticks</b>.' });
          return elScript(FOUR_CODE, s);
        }
      },
      {
        title: 'Puzzle playground: write your own and watch every queue (editable)',
        input: 'log A\ntimeout { log B; then C }\nnew { log D } then E then F\nasync { log G; await; log H; await sleep 0; log I }\nmicro { log J; timeout K }\nlog L',
        inputLabel: 'Mini-program (try your own interview puzzle)',
        gen: function (input) { return elSim(input, { endNote: 'Write your guess first, then step through to check it.' }); }
      }
    ],
    examples: [
      {
        title: 'The "0 1 2 3 4 5 6" puzzle',
        html: `<p>A classic from big-tech interviews. Chain A returns <code>Promise.resolve(4)</code> from a then-callback. Adopting a returned promise costs 2 extra ticks, so chain B (one tick per link) gets two steps ahead: the 4 lands exactly between 3 and 5.</p>`,
        code: { lang: 'js', run: true, code: FOUR_CODE + `

// Expected output:
// 0
// 1
// 2
// 3
// 4
// 5
// 6` }
      },
      {
        title: 'Closures meet the task queue: var vs let in a loop',
        html: `<p>The loop finishes completely (sync) before any timer callback runs. With <code>var</code> there is <b>one</b> shared <code>i</code>, which is 3 by then. With <code>let</code> each iteration gets its own binding.</p>${H.table(['loop', 'bindings', 'prints'], [['var i', 'one shared i (= 3 at the end)', '3 3 3'], ['let i', 'a new i per iteration', '0 1 2']])}`,
        code: { lang: 'js', run: true, code: `const varOut = [];
const letOut = [];

for (var i = 0; i < 3; i++) {
  setTimeout(() => varOut.push(i), 0);       // all three read the SAME i later
}
for (let j = 0; j < 3; j++) {
  setTimeout(() => letOut.push(j), 0);       // each callback has its own j
}
console.log('loops done, i is now ' + i);

setTimeout(() => {
  console.log('var: ' + varOut.join(' '));
  console.log('let: ' + letOut.join(' '));
}, 0);

// Expected output:
// loops done, i is now 3
// var: 3 3 3
// let: 0 1 2` }
      },
      {
        title: 'Awaiting a thenable costs an extra tick',
        html: `<p>Any object with a <code>then</code> method can be awaited. Its <code>then</code> is not called synchronously: a job calls it on the next tick, and the resume needs one more tick. So the async function finishes after <b>p1</b>.</p>`,
        code: { lang: 'js', run: true, code: `const thenable = {
  then(resolve) {
    console.log('thenable.then called');
    resolve('T');
  }
};

(async () => {
  console.log('A');
  const v = await thenable;
  console.log('got ' + v);
})();

Promise.resolve()
  .then(() => console.log('p1'))
  .then(() => console.log('p2'))
  .then(() => console.log('p3'));
console.log('S');

// Expected output:
// A
// S
// thenable.then called
// p1
// got T
// p2
// p3` }
      },
      {
        title: 'Node.js edition: nextTick, promise, setImmediate, setTimeout',
        html: `<p>Inside a timer callback (or an I/O callback) the order is fully deterministic: sync → <code>nextTick</code> → promise microtasks → <code>setImmediate</code> (check phase comes next) → <code>setTimeout 0</code> (needs the <i>next</i> loop's timers phase). At the top level of the main script, setTimeout-0 vs setImmediate is <b>not</b> deterministic — never write an interview answer that depends on it.</p>`,
        code: { lang: 'js', run: true, code: `if (typeof process === 'undefined' || typeof setImmediate === 'undefined') {
  console.log('This demo needs Node.js (process.nextTick and setImmediate).');
} else {
  setTimeout(() => {
    console.log('timer start');
    setTimeout(() => console.log('timeout 0'), 0);
    setImmediate(() => console.log('immediate'));
    Promise.resolve().then(() => console.log('promise'));
    process.nextTick(() => console.log('nextTick'));
    console.log('timer end');
  }, 0);
}

// Expected output:
// timer start
// timer end
// nextTick
// promise
// immediate
// timeout 0` }
      },
      {
        title: 'A then on a pending promise waits for resolve()',
        html: `<p><code>.then</code> does not queue anything while the promise is pending. Here the promise is resolved inside a <b>timer</b>, so its then-callback runs right after that timer task — before the second timer, which was created later.</p>${H.table(['phase', 'what runs', 'printed'], [['sync', 'script', 'start, end'], ['task 1', 'timer resolves p', 'resolving'], ['micro', 'p.then', 'then got done'], ['task 2', 'second timer', 'timer 2']])}`,
        code: { lang: 'js', run: true, code: `console.log('start');
const p = new Promise((resolve) => {
  setTimeout(() => {
    console.log('resolving');
    resolve('done');
  }, 0);
});
p.then((v) => console.log('then got ' + v));
setTimeout(() => console.log('timer 2'), 0);
console.log('end');

// Expected output:
// start
// end
// resolving
// then got done
// timer 2` }
      },
      {
        title: 'The same file, two answers: CommonJS vs ES module in Node',
        html: `<p>In an <b>ES module</b> (<code>.mjs</code> or <code>"type": "module"</code>) the top-level code is evaluated as part of a promise job, so the promise microtask queue is drained <i>before</i> Node gets to the nextTick queue. In CommonJS, nextTick wins. Always ask "browser, Node CJS or Node ESM?" when a puzzle uses <code>process.nextTick</code>.</p>${H.table(['file type', 'output'], [['script.cjs', 'sync, nextTick, promise'], ['script.mjs', 'sync, promise, nextTick']])}`,
        code: { lang: 'js', code: `// save as order.cjs and as order.mjs, run both with node
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));
console.log('sync');` }
      }
    ],
    deepDive: `<p><b>Why ticks matter.</b> Two promise chains interleave tick by tick: each tick runs the job at the front of one FIFO queue. Any operation that costs extra jobs (returning a promise, awaiting a thenable, <code>new Promise(r =&gt; r(p))</code>) makes its chain fall behind by that many places. <code>Promise.resolve(p)</code> with a native <code>p</code> returns <code>p</code> itself (0 cost), but <code>new Promise((r) =&gt; r(p))</code> goes through <code>NewPromiseResolveThenableJob</code> (+2).</p>
<p><b>Engine history you will meet in old answers.</b> (1) Before V8 7.2 / Node 12, <code>await p</code> took 3 ticks — the famous puzzle printed <i>promise2</i> before <i>async1 end</i>. (2) Before Node 11, all expired timers ran in one batch and microtasks only ran after the whole batch, so <code>setTimeout(() =&gt; { log(1); Promise.resolve().then(() =&gt; log(2)) }); setTimeout(() =&gt; log(3))</code> printed 1 3 2; today it is 1 2 3 like browsers.</p>
<p><b>Host differences.</b> Browsers clamp timers nested more than 5 levels deep to ≥ 4 ms and throttle timers in background tabs (≥ 1 s, more for long-hidden tabs). Node has no 4 ms clamp but turns a delay of 0 into 1 ms. <code>setTimeout</code>'s delay is a <b>minimum</b>; ties between equal delays keep creation order.</p>
<p><b>Rendering in browser puzzles.</b> <code>requestAnimationFrame</code> callbacks run before the next paint, which is <i>usually</i> after a <code>setTimeout(…, 0)</code> but not guaranteed — the frame might be due right after the current task. Good interview answers say "rAF timing depends on the frame; tasks and microtasks are deterministic."</p>
<p><b>Puzzle-solving checklist</b> (catches 95% of mistakes): executor is sync · async body is sync until the first await · <code>await f()</code> calls f now · then on a pending promise is parked · skipped then/catch links still cost a tick · return-a-promise costs +2 · microtasks drain fully between tasks · timers ordered by due time then creation · Node: nextTick first in CJS.</p>`,
    aiEra: `<p><b>What AI changes:</b> output-order puzzles are a favourite way to test whether you truly understand the runtime, precisely because AI assistants often get the subtle ones wrong — especially tick-counting (return a promise, thenables), Node CJS vs ESM, and old 3-tick await answers copied from 2018 blog posts.</p>
<p><b>Use AI as a partner:</b> <code>"Generate 5 event-loop puzzles of increasing difficulty mixing setTimeout, queueMicrotask, then-chains and async/await. Don't show answers."</code> Solve each with the 4-column method, then <b>run</b> them (node or the browser console) — the runtime is the judge, not the model. Then ask: <code>"Here is my tick-by-tick table; find the first row where I'm wrong."</code></p>
<p><b>Where AI goes wrong:</b> stating that a resolved promise's then runs synchronously; ignoring that <code>await f()</code> calls f immediately; treating setTimeout-0 vs setImmediate at the top level as deterministic; mixing browser and Node rules.</p>
<p><b>What you must still own:</b> narrating the queues out loud in an interview. The interviewer is grading the explanation ("this goes in the microtask queue because the promise is already fulfilled") far more than the final list.</p>`,
    problems: [
      {
        title: 'The boss puzzle: a promise resolved inside a timer',
        level: 'Hard', tags: ['event loop', 'puzzle', 'promise', 'async/await', 'timers'], companies: ['Google', 'Meta', 'ByteDance', 'Atlassian'],
        statement: `<p>Predict the exact output:</p><pre>console.log('A');
setTimeout(() =&gt; {
  console.log('B');
  Promise.resolve().then(() =&gt; console.log('C'));
}, 0);
const p = new Promise((resolve) =&gt; {
  console.log('D');
  setTimeout(() =&gt; { console.log('E'); resolve('F'); }, 0);
});
p.then((v) =&gt; console.log(v));
(async () =&gt; {
  console.log('G');
  await p;
  console.log('H');
})();
queueMicrotask(() =&gt; console.log('I'));
console.log('J');</pre>`,
        constraints: `Any modern browser or Node.js 12+ (CommonJS).`,
        example: `<p>Output: ${H.c('g', 'A D G J')} → ${H.c('p', 'I')} → ${H.c('b', 'B')} ${H.c('p', 'C')} → ${H.c('b', 'E')} ${H.c('p', 'F H')}. p stays <b>pending</b> until the second timer, so both <code>p.then</code> and the <code>await p</code> continuation are parked on it, in registration order.</p>`,
        brute: {
          why: `<p>A common wrong answer puts F and H right after I, treating <code>p.then</code> and <code>await p</code> like callbacks on a resolved promise. Another wrong answer runs both timers back to back (B E C F H), forgetting that microtasks drain after <b>each</b> task.</p>`,
          code: `// Wrong model: "all timers first, then all promise callbacks"
const wrong = ['A', 'D', 'G', 'J', 'I', 'B', 'E', 'C', 'F', 'H'];
console.log(wrong.join(' '));`
        },
        mcq: { q: 'Right after the script finishes, which callbacks are in the microtask queue?', options: ['I, F and H', 'Only I — p is still pending, so p.then and await p are parked on p', 'C and I', 'None'], answer: 1, explain: 'p is resolved only inside the second timer. Callbacks on a pending promise wait on the promise itself, not in a queue.' },
        hints: [
          `<p>Hint 1: Sync pass: A, the executor's D, the async function's G (up to <code>await p</code>), J. Two timers exist: timer1 (B…) created before timer2 (E…).</p>`,
          `<p>Hint 2: p is pending after the script. <code>p.then(v)</code> and the await continuation are both parked on p — in that order. The only microtask is I.</p>`,
          `<p>Hint 3: Task timer1 → B, microtask C. Task timer2 → E, resolve('F') queues the parked reactions in registration order → F, H. Recipe: sync → micro → [task → micro]*.</p>`
        ],
        tests: {"io":true,"cases":[{"stdin":"","stdout":"A\nD\nG\nJ\nI\nB\nC\nE\nF\nH"}]},
        solution: {
          approach: `<p>Use the four columns. After the script: Output A D G J; Microtasks [I]; Tasks [timer1, timer2]; Waiting on p: [then(v), resume async]. Drain: I. Task timer1: B, queues C → drain: C. Task timer2: E, resolve('F') moves both parked reactions into the microtask queue → drain: F, H.</p>`,
          code: { lang: 'js', run: true, code: `console.log('A');
setTimeout(() => {
  console.log('B');
  Promise.resolve().then(() => console.log('C'));
}, 0);
const p = new Promise((resolve) => {
  console.log('D');
  setTimeout(() => { console.log('E'); resolve('F'); }, 0);
});
p.then((v) => console.log(v));
(async () => {
  console.log('G');
  await p;
  console.log('H');
})();
queueMicrotask(() => console.log('I'));
console.log('J');

// Expected output:
// A
// D
// G
// J
// I
// B
// C
// E
// F
// H` },
          dry: { head: ['phase', 'running', 'microtasks', 'tasks', 'parked on p', 'printed'], rows: [
            ['sync', 'script', 'I', 'timer1, timer2', 'then(v), resume', 'A D G J'],
            ['micro', 'I', '—', 'timer1, timer2', 'then(v), resume', 'I'],
            ['task', 'timer1', 'C', 'timer2', 'then(v), resume', 'B'],
            ['micro', 'C', '—', 'timer2', 'then(v), resume', 'C'],
            ['task', 'timer2 → resolve(F)', 'then(v), resume', '—', '—', 'E'],
            ['micro', 'then(v), resume', '—', '—', '—', '<span class="c-g">F H</span>']
          ] },
          complexity: `<p>Linear in the number of callbacks; the skill is placing each callback in the right column at the right moment.</p>`,
          followUps: ['Move <code>p.then(v)</code> below the async function. What changes? (H before F.)', 'Change the first timer to 10 ms. What is the new order?', 'What if the executor called resolve(\'F\') synchronously instead?']
        }
      }
    ]
  });

  /* ======================================================================
     PRACTICE — Easy → Medium → Hard
     ====================================================================== */

  /* ---------------- EASY ---------------- */
  practice.push({
    title: 'Sync first, timer later',
    level: 'Easy', tags: ['setTimeout', 'call stack', 'output order'], companies: ['TCS', 'Infosys', 'Accenture'],
    statement: `<p>Predict the exact output:</p><pre>console.log('1');
setTimeout(() =&gt; console.log('2'), 0);
console.log('3');</pre>`,
    constraints: `Browser or Node.js.`,
    example: `<p>Output: ${H.c('g', '1')} → ${H.c('g', '3')} → ${H.c('b', '2')}. "0 ms" means "as soon as possible <b>after</b> the current script", not "right now".</p>`,
    brute: {
      why: `<p>Reading the code top to bottom like a recipe gives 1 2 3. That model ignores that <code>setTimeout</code> only <i>registers</i> the callback with the host; the callback becomes a task that waits for the call stack to be empty.</p>`,
      code: `// "Top to bottom" model — wrong for async callbacks
console.log(['1', '2', '3'].join(' '));`
    },
    mcq: { q: 'What does setTimeout(fn, 0) guarantee?', options: ['fn runs immediately', 'fn runs after the current synchronous code (and the microtasks) finish, at the earliest', 'fn runs exactly 0 ms later', 'fn runs before promises'], answer: 1, explain: 'The delay is a minimum. The callback becomes a task and tasks only run when the stack is empty and microtasks are drained.' },
    hints: [
      `<p>Hint 1: Which lines run right now, on the call stack? Only the two console.log calls at the top level.</p>`,
      `<p>Hint 2: setTimeout hands the callback to the timer system (Web APIs / libuv) and returns undefined immediately.</p>`,
      `<p>Hint 3: When the script ends the stack is empty, so the event loop takes the timer task and prints 2 last.</p>`
    ],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"1\n3\n2"}]},
    solution: {
      approach: `<p>Sync logs first (1, 3). The timer callback is a task, so it runs after the script task finishes.</p>`,
      code: { lang: 'js', run: true, code: `console.log('1');
setTimeout(() => console.log('2'), 0);
console.log('3');

// Expected output:
// 1
// 3
// 2` },
      dry: { head: ['step', 'call stack', 'task queue', 'printed'], rows: [['1', 'script → log', '—', '1'], ['2', 'script → setTimeout', 'timer cb (after 0 ms)', '1'], ['3', 'script → log', 'timer cb', '1 3'], ['4', 'timer cb', '—', '<span class="c-g">1 3 2</span>']] },
      complexity: `<p>O(1) — three statements.</p>`,
      followUps: ['What if a 2-second busy loop sits between the two logs? Does 2 print sooner?', 'What if the delay is 1000 ms instead of 0?']
    }
  });

  practice.push({
    title: 'Promise.then vs setTimeout',
    level: 'Easy', tags: ['microtask', 'macrotask', 'promise'], companies: ['Amazon', 'Paytm', 'Swiggy'],
    statement: `<p>Predict the exact output:</p><pre>console.log('A');
setTimeout(() =&gt; console.log('B'), 0);
Promise.resolve().then(() =&gt; console.log('C'));
console.log('D');</pre>`,
    constraints: `Browser or Node.js.`,
    example: `<p>Output: ${H.c('g', 'A')} → ${H.c('g', 'D')} → ${H.c('p', 'C')} → ${H.c('b', 'B')}. The promise callback is a <b>microtask</b>; the timer is a <b>task</b>. All microtasks run before the next task.</p>`,
    brute: {
      why: `<p>"Callbacks run in the order they were scheduled" puts B before C, because setTimeout was called first. That ignores the two separate queues and their priority.</p>`,
      code: `// Single-queue model (wrong)
console.log(['A', 'D', 'B', 'C'].join(' '));`
    },
    mcq: { q: 'Why does C print before B even though B was scheduled first?', options: ['Promises are faster than timers', 'Microtasks are drained completely before the event loop picks the next task', 'setTimeout has a 4 ms minimum', 'Random'], answer: 1, explain: 'The order is guaranteed by the event loop algorithm, not by speed: after the script task, every microtask runs before the next task.' },
    hints: [
      `<p>Hint 1: Sync first: A and D print during the script itself.</p>`,
      `<p>Hint 2: Sort the two callbacks into lanes: then-callback → microtask queue; timer callback → task queue.</p>`,
      `<p>Hint 3: Rule: after each task (the script is one), drain all microtasks, then take one task.</p>`
    ],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"A\nD\nC\nB"}]},
    solution: {
      approach: `<p>Sync: A, D. Microtask drain: C. Next task: B.</p>`,
      code: { lang: 'js', run: true, code: `console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');

// Expected output:
// A
// D
// C
// B` },
      dry: { head: ['phase', 'microtasks', 'tasks', 'printed'], rows: [['script', 'C', 'B', 'A D'], ['drain', '—', 'B', 'A D C'], ['task', '—', '—', '<span class="c-g">A D C B</span>']] },
      complexity: `<p>O(1) — four statements, two callbacks.</p>`,
      followUps: ['Replace Promise.resolve().then with queueMicrotask. Same output?', 'Add a second setTimeout with 0 ms before the first. Where does it print?']
    }
  });

  practice.push({
    title: 'The executor runs now',
    level: 'Easy', tags: ['promise', 'executor', 'output order'], companies: ['Wipro', 'Zoho', 'Freshworks'],
    statement: `<p>Predict the exact output:</p><pre>console.log('1');
const p = new Promise((resolve) =&gt; {
  console.log('2');
  resolve();
  console.log('3');
});
p.then(() =&gt; console.log('4'));
console.log('5');</pre>`,
    constraints: `Browser or Node.js.`,
    example: `<p>Output: ${H.c('g', '1 2 3 5')} → ${H.c('p', '4')}. The executor is called synchronously by <code>new Promise</code>, and <code>resolve()</code> does not stop it — it only marks the promise fulfilled.</p>`,
    brute: {
      why: `<p>Two wrong beliefs: "everything inside a promise is async" (gives 1 5 2 3 4) and "resolve() returns/jumps to then" (gives 1 2 4 3 5). Both misunderstand when executors and then-callbacks run.</p>`,
      code: `// Belief 1: the executor is async (wrong)
console.log('1 5 2 3 4');
// Belief 2: resolve() calls the then-callback right away (wrong)
console.log('1 2 4 3 5');`
    },
    mcq: { q: 'What does calling resolve() inside the executor do immediately?', options: ['Runs the then-callbacks', 'Marks the promise fulfilled; then-callbacks are queued as microtasks', 'Exits the executor like return', 'Throws if called twice'], answer: 1, explain: 'resolve settles the promise and queues reactions already registered (none yet here). The executor keeps running to its end.' },
    hints: [
      `<p>Hint 1: new Promise(executor) calls executor immediately, on the same stack, before returning the promise.</p>`,
      `<p>Hint 2: resolve() is just a function call that changes the promise's state; code after it in the executor still runs.</p>`,
      `<p>Hint 3: p.then on a fulfilled promise queues the callback as a microtask; it runs after the last sync log.</p>`
    ],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"1\n2\n3\n5\n4"}]},
    solution: {
      approach: `<p>Sync: 1, executor prints 2, resolve, 3, then 5. Microtask: 4.</p>`,
      code: { lang: 'js', run: true, code: `console.log('1');
const p = new Promise((resolve) => {
  console.log('2');
  resolve();
  console.log('3');
});
p.then(() => console.log('4'));
console.log('5');

// Expected output:
// 1
// 2
// 3
// 5
// 4` },
      dry: { head: ['line', 'running', 'p state', 'microtasks', 'printed'], rows: [['1', 'script', '—', '—', '1'], ['executor', 'executor', 'pending → fulfilled', '—', '1 2 3'], ['p.then', 'script', 'fulfilled', 'cb4', '1 2 3'], ['end', 'script', 'fulfilled', 'cb4', '1 2 3 5'], ['drain', 'cb4', 'fulfilled', '—', '<span class="c-g">1 2 3 5 4</span>']] },
      complexity: `<p>O(1) — the cost is understanding, not computation.</p>`,
      followUps: ['Write return resolve(); instead of resolve(); — what changes?', 'What if the executor throws after resolve()?']
    }
  });

  practice.push({
    title: 'Implement sleep(ms) without blocking',
    level: 'Easy', tags: ['promise', 'setTimeout', 'async/await'], companies: ['Uber', 'Razorpay', 'PhonePe'],
    statement: `<p>Write <code>sleep(ms)</code> that returns a promise fulfilled after <code>ms</code> milliseconds, then use it in <code>countdown()</code> to print 3, 2, 1 (100 ms apart) and then <b>liftoff</b>. Meanwhile, a timer scheduled for 150 ms must still be able to print <b>other work ran</b> — your sleep must not block the thread.</p>`,
    constraints: `No busy-waiting. Works in browser and Node.`,
    example: `<p>Output: ${H.c('g', '3')} → ${H.c('g', '2')} → ${H.c('b', 'other work ran')} → ${H.c('g', '1')} → ${H.c('g', 'liftoff')}. The 150 ms timer fires between "2" (t≈100) and "1" (t≈200) because the thread is free while we sleep.</p>`,
    brute: {
      why: `<p>A busy-wait loop (<code>while (Date.now() &lt; end) {}</code>) does pause for the right time — but it holds the only thread hostage: no clicks, no paints, no other timers. The 150 ms timer would print only after the whole countdown.</p>`,
      code: `function busySleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* spinning: the whole thread is blocked */ }
}
setTimeout(() => console.log('other work ran (late!)'), 150);
for (let i = 3; i >= 1; i--) { console.log(i); busySleep(100); }
console.log('liftoff');`
    },
    mcq: { q: 'Why does await sleep(100) not block other code?', options: ['It runs in another thread', 'await pauses only this async function; the thread returns to the event loop until the timer task resolves the promise', 'setTimeout is synchronous', 'It does block'], answer: 1, explain: 'The async function is suspended (saved on the heap); the call stack empties and other tasks can run. The timer later resolves the promise and the continuation is queued as a microtask.' },
    hints: [
      `<p>Hint 1: You need something that "finishes later" without holding the thread: setTimeout plus a promise.</p>`,
      `<p>Hint 2: Wrap it: <code>new Promise((resolve) =&gt; setTimeout(resolve, ms))</code>. The timer callback is resolve itself.</p>`,
      `<p>Hint 3: In countdown, loop i from 3 to 1: log, then <code>await sleep(100)</code>. After the loop log liftoff. Use for…of / for, not forEach.</p>`
    ],
    tests: {"sig":"string int -> string[]","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 700); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(kind, n) {\n  return __job(async function () {\n    if (kind === 'countdown') {\n      var r = await __cap(async function () { setTimeout(function () { console.log('other work ran'); }, 150); await countdown(); await sleep(60); });\n      return r[1];\n    }\n    if (kind === 'elapsed') { var t = Date.now(); await sleep(n); return Date.now() - t >= n - 2 && Date.now() - t < n + 200; }\n    if (kind === 'order') {\n      var ev = []; setTimeout(function () { ev.push('t5'); }, 5); setTimeout(function () { ev.push('t60'); }, 60);\n      await sleep(n); ev.push('slept'); await sleep(80); return ev;\n    }\n    if (kind === 'promise') { var p = sleep(n); var ok = typeof p.then === 'function'; await p; return ok; }\n    if (kind === 'parallel') { var s = Date.now(); await Promise.all([sleep(n), sleep(n), sleep(n)]); return Date.now() - s < n * 2 + 50; }\n  });\n}"},"cases":[[["countdown",0],["3","2","other work ran","1","liftoff"]],[["elapsed",30],true],[["elapsed",0],true],[["order",30],["t5","slept","t60"]],[["order",0],["slept","t5","t60"]],[["promise",10],true],[["parallel",40],true]]},
    solution: {
      approach: `<p>Promise-wrap setTimeout. Each <code>await sleep(100)</code> suspends countdown, the stack empties, and other tasks (the 150 ms timer) get their turn.</p>`,
      code: { lang: 'js', run: true, code: `const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function countdown() {
  for (let i = 3; i >= 1; i--) {
    console.log(i);
    await sleep(100);         // pause THIS function only; the thread is free
  }
  console.log('liftoff');
}

setTimeout(() => console.log('other work ran'), 150);
countdown();

// Expected output:
// 3
// 2
// other work ran
// 1
// liftoff` },
      dry: { head: ['time', 'event', 'printed'], rows: [['0 ms', 'countdown starts, sleep(100)', '3'], ['100 ms', 'sleep timer → resume', '2'], ['150 ms', 'other timer task', 'other work ran'], ['200 ms', 'sleep timer → resume', '1'], ['300 ms', 'sleep timer → resume', '<span class="c-g">liftoff</span>']] },
      complexity: `<p>O(n) timers for n steps; O(1) extra memory. No CPU used while waiting.</p>`,
      followUps: ['Add an AbortSignal parameter so sleep can be cancelled.', 'Why does setTimeout(resolve, ms) not need an arrow function here?']
    }
  });

  /* ---------------- MEDIUM ---------------- */
  practice.push({
    title: 'Two promise chains and a queueMicrotask',
    level: 'Medium', tags: ['microtask', 'promise chain', 'ticks'], companies: ['Google', 'Atlassian', 'Adobe'],
    statement: `<p>Predict the exact output:</p><pre>Promise.resolve()
  .then(() =&gt; console.log('a1'))
  .then(() =&gt; console.log('a2'))
  .then(() =&gt; console.log('a3'));
Promise.resolve()
  .then(() =&gt; console.log('b1'))
  .then(() =&gt; console.log('b2'));
queueMicrotask(() =&gt; console.log('m'));</pre>`,
    constraints: `Browser or Node.js.`,
    example: `<p>Output: ${H.c('p', 'a1 b1 m')} → ${H.c('p', 'a2 b2')} → ${H.c('p', 'a3')}. Only the <b>first</b> link of each chain is queued during the script; each later link is queued when the previous one finishes, at the back of the line.</p>`,
    brute: {
      why: `<p>"Each chain runs to completion" gives a1 a2 a3 b1 b2 m. But a chain is not one job — every <code>.then</code> is a separate microtask queued only when its parent promise settles.</p>`,
      code: `// "Whole chain at once" model (wrong)
console.log(['a1', 'a2', 'a3', 'b1', 'b2', 'm'].join(' '));`
    },
    mcq: { q: 'When is the callback of the second .then (a2) put into the microtask queue?', options: ['During the script', 'When a1 has run and its promise fulfils', 'After all microtasks', 'After the next task'], answer: 1, explain: 'a2 is registered on the promise returned by the first .then, which is pending until a1 has run.' },
    hints: [
      `<p>Hint 1: After the script the queue is [a1, b1, m] — only first links and the queueMicrotask callback.</p>`,
      `<p>Hint 2: Running a1 queues a2 at the back: [b1, m, a2]. Running b1 queues b2: [m, a2, b2].</p>`,
      `<p>Hint 3: Keep simulating the FIFO queue: m, a2 (queues a3), b2, a3. Write the queue after every step.</p>`
    ],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"a1\nb1\nm\na2\nb2\na3"}]},
    solution: {
      approach: `<p>Simulate the single FIFO microtask queue, adding each next link at the back when its parent runs.</p>`,
      code: { lang: 'js', run: true, code: `Promise.resolve()
  .then(() => console.log('a1'))
  .then(() => console.log('a2'))
  .then(() => console.log('a3'));
Promise.resolve()
  .then(() => console.log('b1'))
  .then(() => console.log('b2'));
queueMicrotask(() => console.log('m'));

// Expected output:
// a1
// b1
// m
// a2
// b2
// a3` },
      dry: { head: ['run', 'queue after'], rows: [['(script)', 'a1, b1, m'], ['a1', 'b1, m, a2'], ['b1', 'm, a2, b2'], ['m', 'a2, b2'], ['a2', 'b2, a3'], ['b2', 'a3'], ['a3', '<span class="c-g">—</span>']] },
      complexity: `<p>O(total links). Each link = exactly one microtask.</p>`,
      followUps: ['Make the first link of chain a return Promise.resolve(). Where does a2 move?', 'Move queueMicrotask to the top of the file.']
    }
  });

  practice.push({
    title: 'Timers inside promises, promises inside timers',
    level: 'Medium', tags: ['event loop', 'macrotask', 'microtask'], companies: ['Microsoft', 'Walmart', 'CRED'],
    statement: `<p>Predict the exact output:</p><pre>setTimeout(() =&gt; {
  console.log('t1');
  Promise.resolve().then(() =&gt; console.log('p-in-t1'));
}, 0);
Promise.resolve().then(() =&gt; {
  console.log('p1');
  setTimeout(() =&gt; console.log('t-in-p1'), 0);
});
setTimeout(() =&gt; console.log('t2'), 0);
console.log('s');</pre>`,
    constraints: `Browser or Node.js 11+.`,
    example: `<p>Output: ${H.c('g', 's')} → ${H.c('p', 'p1')} → ${H.c('b', 't1')} → ${H.c('p', 'p-in-t1')} → ${H.c('b', 't2')} → ${H.c('b', 't-in-p1')}. The timer created inside p1 is created <i>after</i> t1 and t2, so it is last. The microtask created inside t1 runs right after t1, before t2.</p>`,
    brute: {
      why: `<p>"All timers, then all promises" (or the Node &lt; 11 batching behaviour) prints t1 t2 before p-in-t1. Modern hosts drain microtasks after <b>every</b> task.</p>`,
      code: `// Old Node 10 batching / wrong model
console.log(['s', 'p1', 't1', 't2', 'p-in-t1', 't-in-p1'].join(' '));`
    },
    mcq: { q: 'Where does the timer created inside p1 end up?', options: ['Before t1', 'Between t1 and t2', 'After t2 — it was created later with the same delay', 'It never runs'], answer: 2, explain: 'Equal delays run in creation order. t1 and t2 were created during the script; t-in-p1 during the microtask drain afterwards.' },
    hints: [
      `<p>Hint 1: Script: two timers (t1, t2) registered, one microtask (p1), prints s.</p>`,
      `<p>Hint 2: Drain: p1 prints and registers a third timer, which joins after t2.</p>`,
      `<p>Hint 3: Task t1 → microtask p-in-t1 drains before the next task. Then t2, then t-in-p1.</p>`
    ],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"s\np1\nt1\np-in-t1\nt2\nt-in-p1"}]},
    solution: {
      approach: `<p>Alternate: one task, then all microtasks. Timers with equal delay keep creation order.</p>`,
      code: { lang: 'js', run: true, code: `setTimeout(() => {
  console.log('t1');
  Promise.resolve().then(() => console.log('p-in-t1'));
}, 0);
Promise.resolve().then(() => {
  console.log('p1');
  setTimeout(() => console.log('t-in-p1'), 0);
});
setTimeout(() => console.log('t2'), 0);
console.log('s');

// Expected output:
// s
// p1
// t1
// p-in-t1
// t2
// t-in-p1` },
      dry: { head: ['phase', 'runs', 'tasks waiting', 'printed'], rows: [['script', 'main', 't1, t2', 's'], ['micro', 'p1', 't1, t2, t-in-p1', 'p1'], ['task', 't1', 't2, t-in-p1', 't1'], ['micro', 'p-in-t1', 't2, t-in-p1', 'p-in-t1'], ['task', 't2', 't-in-p1', 't2'], ['task', 't-in-p1', '—', '<span class="c-g">t-in-p1</span>']] },
      complexity: `<p>O(callbacks): each callback is queued and run exactly once.</p>`,
      followUps: ['Give t2 a 5 ms delay. Does the order change?', 'Replace the inner Promise in t1 with queueMicrotask.']
    }
  });

  practice.push({
    title: 'Error chain: reject, then, catch, finally',
    level: 'Medium', tags: ['error handling', 'promise chain', 'finally'], companies: ['Stripe', 'Intuit', 'Zomato'],
    statement: `<p>Predict the exact output:</p><pre>console.log('sync');
Promise.reject(new Error('x'))
  .finally(() =&gt; console.log('f1'))
  .then(() =&gt; console.log('t1'))
  .catch((e) =&gt; { console.log('c1 ' + e.message); return 'recovered'; })
  .finally(() =&gt; console.log('f2'))
  .then((v) =&gt; console.log('t2 ' + v));</pre>`,
    constraints: `Browser or Node.js.`,
    example: `<p>Output: ${H.c('g', 'sync')} → ${H.c('p', 'f1')} → ${H.c('r', 'c1 x')} → ${H.c('p', 'f2')} → ${H.c('g', 't2 recovered')}. <b>t1</b> never prints: the rejection skips it. <code>finally</code> runs for both outcomes and passes the outcome through.</p>`,
    brute: {
      why: `<p>Common mistakes: thinking <code>finally</code> "handles" the error (so t1 prints), or that after <code>.catch</code> the chain stays rejected (so t2 never prints), or that finally receives the value (it gets no argument).</p>`,
      code: `// Wrong: "finally handles the rejection"
console.log(['sync', 'f1', 't1', 'f2', 't2 undefined'].join(' | '));`
    },
    mcq: { q: 'What does the last .then receive as v?', options: ['undefined, because finally returned nothing', '"recovered" — finally passes the previous value through', 'The Error x', 'It does not run'], answer: 1, explain: 'finally ignores its callback\'s return value (unless it throws or returns a rejected promise) and forwards the previous outcome: the catch returned "recovered".' },
    hints: [
      `<p>Hint 1: Track the state of the chain: rejected(x) → finally keeps it rejected → then is skipped → catch makes it fulfilled("recovered").</p>`,
      `<p>Hint 2: finally callbacks run on both paths and get no argument; they forward the incoming outcome.</p>`,
      `<p>Hint 3: Only sync is synchronous. Then follow the chain: f1, (t1 skipped), c1 x, f2, t2 recovered.</p>`
    ],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"sync\nf1\nc1 x\nf2\nt2 recovered"}]},
    solution: {
      approach: `<p>Follow the settled state link by link. Rejection: finally (runs, keeps rejection) → then (skipped) → catch (handles, returns value) → finally (runs, keeps value) → then (receives value).</p>`,
      code: { lang: 'js', run: true, code: `console.log('sync');
Promise.reject(new Error('x'))
  .finally(() => console.log('f1'))
  .then(() => console.log('t1'))
  .catch((e) => { console.log('c1 ' + e.message); return 'recovered'; })
  .finally(() => console.log('f2'))
  .then((v) => console.log('t2 ' + v));

// Expected output:
// sync
// f1
// c1 x
// f2
// t2 recovered` },
      dry: { head: ['link', 'incoming state', 'callback runs?', 'outgoing state'], rows: [['finally f1', 'rejected(x)', 'yes', 'rejected(x)'], ['then t1', 'rejected(x)', '<span class="c-r">no (skipped)</span>', 'rejected(x)'], ['catch c1', 'rejected(x)', 'yes', 'fulfilled(recovered)'], ['finally f2', 'fulfilled(recovered)', 'yes', 'fulfilled(recovered)'], ['then t2', 'fulfilled(recovered)', 'yes', '<span class="c-g">prints t2 recovered</span>']] },
      complexity: `<p>O(links): one microtask per link, skipped or not.</p>`,
      followUps: ['Make f2 throw new Error("y"). What prints now, and is there an unhandled rejection?', 'Replace .catch with .then(null, handler). Same result?']
    }
  });

  practice.push({
    title: 'Load users in parallel, keep input order',
    level: 'Medium', tags: ['async/await', 'Promise.all', 'performance'], companies: ['Amazon', 'Netflix', 'Booking.com'],
    statement: `<p><code>getUser(id)</code> takes ~50 ms and resolves to <code>'user' + id</code>. Write <code>loadUsers(ids)</code> that returns the users <b>in the same order as ids</b>, in about 50 ms total (not 50 ms × N).</p>`,
    constraints: `1 ≤ ids.length ≤ 1000. Requests are independent. Keep result order = input order.`,
    example: `<p><code>loadUsers([1, 2, 3])</code> → ${H.c('g', "['user1', 'user2', 'user3']")} in ≈ 50 ms. The sequential version takes ≈ 150 ms.</p>`,
    brute: {
      why: `<p><code>for…of</code> with <code>await</code> inside waits for each request before <b>starting</b> the next. Correct output, but N × 50 ms.</p>`,
      code: `const getUser = (id) => new Promise((r) => setTimeout(() => r('user' + id), 50));
async function loadUsersSlow(ids) {
  const out = [];
  for (const id of ids) out.push(await getUser(id));   // one at a time
  return out;
}
const t = Date.now();
loadUsersSlow([1, 2, 3]).then((u) => console.log(u.join(',') + ' sequential >= 140 ms? ' + (Date.now() - t >= 140)));`
    },
    mcq: { q: 'Promise.all(ids.map(getUser)) returns results in which order?', options: ['Order of completion', 'Same order as the input array, whatever finishes first', 'Random', 'Reverse order'], answer: 1, explain: 'Promise.all stores each value at its input index, so order is preserved even if later requests finish first.' },
    hints: [
      `<p>Hint 1: Start all requests first — calling getUser(id) starts the timer immediately — then wait for all of them.</p>`,
      `<p>Hint 2: <code>ids.map(getUser)</code> gives an array of promises; <code>Promise.all</code> waits for all and keeps index order.</p>`,
      `<p>Hint 3: Edge cases: empty array resolves to [] immediately; one rejection rejects the whole call (use allSettled if partial results are OK); for 1000 ids consider a concurrency limit.</p>`
    ],
    tests: {"sig":"int[] -> string[]","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 300); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(ids) {\n  return __job(async function () {\n    var t = Date.now(), users = await loadUsers(ids), ms = Date.now() - t;\n    var inOrder = users.length === ids.length && users.every(function (u, i) { return u === 'user' + ids[i]; });\n    return [users.length > 5 ? users.length : users, inOrder, ms < 400];\n  });\n}"},"cases":[[[[1,2,3]],[["user1","user2","user3"],true,true]],[[[3,1,2]],[["user3","user1","user2"],true,true]],[[[7]],[["user7"],true,true]],[[[5,5,5]],[["user5","user5","user5"],true,true]],[[[0,-1,10]],[["user0","user-1","user10"],true,true]],[[{"$range":[0,1000]}],[1000,true,true]]]},
    solution: {
      approach: `<p>Fan out, then fan in: <code>return Promise.all(ids.map(getUser))</code>. All timers run concurrently in the host; JavaScript just waits once.</p>`,
      code: { lang: 'js', run: true, code: `const getUser = (id) => new Promise((r) => setTimeout(() => r('user' + id), 50));

async function loadUsers(ids) {
  // map() calls getUser for every id NOW, so all requests are in flight together
  return Promise.all(ids.map(getUser));
}

const t = Date.now();
loadUsers([3, 1, 2]).then((users) => {
  console.log(users.join(','));
  console.log('took < 120 ms? ' + (Date.now() - t < 120));
});

// Expected output:
// user3,user1,user2
// took < 120 ms? true` },
      dry: { head: ['time', 'in flight', 'result array'], rows: [['0 ms', 'getUser(3), getUser(1), getUser(2)', '[_, _, _]'], ['≈50 ms', 'all three resolve', '[user3, user1, user2]'], ['≈50 ms', 'Promise.all fulfils', '<span class="c-g">input order kept</span>']] },
      complexity: `<p>Wall time ≈ max(request time) instead of the sum. Memory O(N) promises.</p>`,
      followUps: ['What if one request fails but you still want the others?', 'Limit to 5 requests in flight at once.']
    }
  });

  practice.push({
    title: 'promiseWithTimeout(promise, ms)',
    level: 'Medium', tags: ['Promise.race', 'setTimeout', 'error handling'], companies: ['Uber', 'LinkedIn', 'Airbnb'],
    statement: `<p>Implement <code>withTimeout(promise, ms)</code>: it settles like <code>promise</code> if that happens within <code>ms</code>, otherwise rejects with <code>Error('Timeout after ' + ms + ' ms')</code>. The timer must be <b>cleared</b> when the promise wins (no leaked timers keeping Node alive).</p>`,
    constraints: `Do not modify the input promise. Must work for both fulfilment and rejection.`,
    example: `<p><code>withTimeout(fast30ms, 100)</code> → ${H.c('g', 'fulfils')}; <code>withTimeout(slow200ms, 50)</code> → ${H.c('r', 'rejects "Timeout after 50 ms"')} at ≈ 50 ms.</p>`,
    brute: {
      why: `<p>A version without <code>clearTimeout</code> works logically but leaves a pending timer every time the promise wins. In Node a 30-second timeout keeps the process alive 30 s after the work is done; in a server it accumulates thousands of live timers.</p>`,
      code: `function withTimeoutLeaky(promise, ms) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after ' + ms + ' ms')), ms));
  return Promise.race([promise, timeout]);     // timer never cleared
}
withTimeoutLeaky(Promise.resolve('fast'), 200).then((v) => console.log(v + ' (but a 200 ms timer is still pending)'));`
    },
    mcq: { q: 'Promise.race([work, timeout]) settles when…', options: ['both settle', 'the first of them settles — fulfilled or rejected', 'the first one fulfils', 'never'], answer: 1, explain: 'race adopts the first settlement of any kind. The loser keeps running — race does not cancel it.' },
    hints: [
      `<p>Hint 1: Race the real promise against a promise that rejects after ms using a timer.</p>`,
      `<p>Hint 2: Keep the timer id; whatever wins, call clearTimeout(id) in a finally so the loser timer is removed.</p>`,
      `<p>Hint 3: Remember race does not cancel the slow work. For fetch, pass an AbortSignal (AbortSignal.timeout(ms)) to really stop it.</p>`
    ],
    tests: {"sig":"string int int -> string[]","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 400); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(kind, delayMs, limitMs) {\n  return __job(async function () {\n    var live = 0, st = globalThis.setTimeout, ct = globalThis.clearTimeout, ids = new Set();\n    globalThis.setTimeout = function (f, ms) { var id = st(function () { ids.delete(id); f(); }, ms); ids.add(id); return id; };\n    globalThis.clearTimeout = function (id) { ids.delete(id); return ct(id); };\n    var out;\n    try {\n      var p = new Promise(function (res, rej) { st(function () { if (kind === 'reject') rej(new Error('server 500')); else res('value'); }, delayMs); });\n      try { out = 'ok:' + await withTimeout(p, limitMs); } catch (e) { out = 'err:' + e.message; }\n      var leaked = ids.size;\n    } finally { globalThis.setTimeout = st; globalThis.clearTimeout = ct; }\n    return [out, leaked];\n  });\n}"},"cases":[[["fulfil",10,200],["ok:value",0]],[["fulfil",150,20],["err:Timeout after 20 ms",0]],[["reject",10,200],["err:server 500",0]],[["reject",150,20],["err:Timeout after 20 ms",0]],[["fulfil",0,100],["ok:value",0]],[["fulfil",40,0],["err:Timeout after 0 ms",0]]]},
    solution: {
      approach: `<p><code>Promise.race</code> between the input and a timer-rejecting promise; <code>.finally(() =&gt; clearTimeout(id))</code> cleans up in every outcome.</p>`,
      code: { lang: 'js', run: true, code: `function withTimeout(promise, ms) {
  let timerId;
  const timeout = new Promise((_, reject) => {
    timerId = setTimeout(() => reject(new Error('Timeout after ' + ms + ' ms')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timerId));
}

const delay = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));

async function demo() {
  console.log('fast: ' + await withTimeout(delay(30, 'done in 30 ms'), 100));
  try {
    await withTimeout(delay(200, 'too slow'), 50);
  } catch (e) {
    console.log('slow: ' + e.message);
  }
  try {
    await withTimeout(Promise.reject(new Error('server 500')), 100);
  } catch (e) {
    console.log('failing: ' + e.message);
  }
}
demo();

// Expected output:
// fast: done in 30 ms
// slow: Timeout after 50 ms
// failing: server 500` },
      dry: { head: ['call', 'winner', 'outcome', 'timer'], rows: [['delay(30) vs 100', 'work at 30 ms', 'fulfilled', 'cleared'], ['delay(200) vs 50', 'timer at 50 ms', 'rejected: Timeout', 'already fired'], ['reject vs 100', 'work at 0 ms', 'rejected: server 500', 'cleared']] },
      complexity: `<p>O(1) per call; one timer that is always cleaned up.</p>`,
      followUps: ['Add an AbortController so the underlying fetch is cancelled on timeout.', 'Why can the slow delay(200) still keep Node alive after the timeout fires?']
    }
  });

  practice.push({
    title: 'Process a big array without freezing the page',
    level: 'Medium', tags: ['blocking', 'chunking', 'yield to main', 'INP'], companies: ['Google', 'Meta', 'Figma'],
    statement: `<p>Write <code>processInChunks(items, chunkSize, fn)</code> that sums <code>fn(item)</code> over all items but <b>yields to the event loop</b> between chunks, so a click handler (simulated by a timer scheduled before the call) gets a turn after the first chunk instead of after all of them. Return a promise of the total.</p>`,
    constraints: `items.length up to 10<sup>6</sup>; keep each chunk short (≈ 5–50 ms of work).`,
    example: `<p>With 9 items, chunk size 3, fn = x²: output ${H.c('g', 'chunk done up to 3')} → ${H.c('b', '&gt;&gt; click handler got a turn')} → ${H.c('g', 'chunk done up to 6')} → ${H.c('g', 'chunk done up to 9')} → ${H.c('g', 'sum of squares = 285')}.</p>`,
    brute: {
      why: `<p>One long synchronous loop gives the right sum but blocks the only thread: the click handler (and painting) waits for the whole loop. On a real page that is a "long task" that ruins INP (Interaction to Next Paint).</p>`,
      code: `setTimeout(() => console.log('>> click handler finally got a turn'), 0);
let total = 0;
for (let i = 1; i <= 9; i++) total += i * i;     // imagine 10 million items here
console.log('all done in one go, sum = ' + total);`
    },
    mcq: { q: 'Which "yield" lets a click handler (a task) run between chunks?', options: ['await Promise.resolve()', 'await new Promise((r) => setTimeout(r, 0)) or scheduler.yield()', 'queueMicrotask', 'A for loop'], answer: 1, explain: 'Microtask-based "yields" never let a task run — microtasks are drained before the next task. You need a new task (setTimeout, MessageChannel) or scheduler.yield().' },
    hints: [
      `<p>Hint 1: Split the loop into chunks; after each chunk, give the thread back to the event loop.</p>`,
      `<p>Hint 2: Yield with a task: <code>const yieldToMain = () =&gt; new Promise((r) =&gt; setTimeout(r, 0));</code> and <code>await</code> it. (In Chrome 129+ prefer <code>scheduler.yield()</code>.)</p>`,
      `<p>Hint 3: Do not yield after the last chunk. Make the function async so the caller gets a promise of the total.</p>`
    ],
    tests: {"sig":"int int -> string[]","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 500); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(n, size) {\n  return __job(async function () {\n    var items = Array.from({ length: n }, function (_, i) { return i + 1; });\n    var r = await __cap(async function () {\n      setTimeout(function () { console.log('click'); }, 0);\n      var total = await processInChunks(items, size, function (x) { return x * x; });\n      await new Promise(function (r) { setTimeout(r, 30); });\n      return total;\n    });\n    return [r[0], r[1]];\n  });\n}"},"cases":[[[9,3],[285,["chunk done up to 3","click","chunk done up to 6","chunk done up to 9"]]],[[1,5],[1,["chunk done up to 1","click"]]],[[0,3],[0,["click"]]],[[4,4],[30,["chunk done up to 4","click"]]],[[5,2],[55,["chunk done up to 2","click","chunk done up to 4","chunk done up to 5"]]],[[3,1],[14,["chunk done up to 1","click","chunk done up to 2","chunk done up to 3"]]]]},
    solution: {
      approach: `<p>Async loop over chunks; after each chunk except the last, await a task-based yield. Pending tasks (clicks, timers) and rendering can happen in between.</p>`,
      code: { lang: 'js', run: true, code: `// Prefer scheduler.yield() where available; fall back to a 0 ms timer (a new task).
const yieldToMain = () =>
  (globalThis.scheduler && typeof globalThis.scheduler.yield === 'function')
    ? globalThis.scheduler.yield()
    : new Promise((resolve) => setTimeout(resolve, 0));

async function processInChunks(items, chunkSize, fn) {
  let total = 0;
  for (let start = 0; start < items.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, items.length);
    for (let i = start; i < end; i++) total += fn(items[i]);
    console.log('chunk done up to ' + end);
    if (end < items.length) await yieldToMain();   // let other tasks run
  }
  return total;
}

setTimeout(() => console.log('>> click handler got a turn'), 0);
const items = Array.from({ length: 9 }, (_, i) => i + 1);
processInChunks(items, 3, (x) => x * x).then((t) => console.log('sum of squares = ' + t));

// Expected output:
// chunk done up to 3
// >> click handler got a turn
// chunk done up to 6
// chunk done up to 9
// sum of squares = 285` },
      dry: { head: ['task', 'work', 'printed'], rows: [['script', 'chunk 1, schedule yield timer Y1', 'chunk done up to 3'], ['click timer', 'handler', '&gt;&gt; click handler got a turn'], ['Y1 → microtask resume', 'chunk 2, schedule Y2', 'chunk done up to 6'], ['Y2 → resume', 'chunk 3, return 285', 'chunk done up to 9'], ['microtask', 'then', '<span class="c-g">sum of squares = 285</span>']] },
      complexity: `<p>Same O(N) total work, split into N / chunkSize tasks. Small overhead per yield (≈ a few µs, more with browser timer clamping ≥ 4 ms after deep nesting — another reason to prefer scheduler.yield or MessageChannel).</p>`,
      followUps: ['Pick the chunk size by time (e.g. 8 ms budget) instead of by count.', 'Move the work to a Web Worker instead. Trade-offs?']
    }
  });

  /* ---------------- HARD ---------------- */
  practice.push({
    title: 'async functions returning values vs promises',
    level: 'Hard', tags: ['async/await', 'ticks', 'thenable adoption'], companies: ['ByteDance', 'Google', 'Bloomberg'],
    statement: `<p>Predict the exact output (modern engines):</p><pre>async function a() {
  console.log('a start');
  await null;
  console.log('a end');
  return Promise.resolve('A');
}
async function b() {
  console.log('b start');
  return 'B';
}
a().then((v) =&gt; console.log('got ' + v));
b().then((v) =&gt; console.log('got ' + v));
Promise.resolve()
  .then(() =&gt; console.log('t1'))
  .then(() =&gt; console.log('t2'))
  .then(() =&gt; console.log('t3'))
  .then(() =&gt; console.log('t4'));
console.log('sync');</pre>`,
    constraints: `Node.js 12+ or any current browser.`,
    example: `<p>Output: ${H.c('g', 'a start, b start, sync')} → ${H.c('p', 'a end, got B, t1, t2, t3, got A, t4')}. b returns a plain value, so its promise is fulfilled immediately. a returns a <b>promise</b>, which costs 2 extra ticks to adopt.</p>`,
    brute: {
      why: `<p>Treating <code>return Promise.resolve('A')</code> like <code>return 'A'</code> predicts "got A" right after t1. Treating async functions as fully async predicts "b start" after "sync". Both skip the precise tick rules.</p>`,
      code: `// Naive: return-a-promise costs nothing extra (wrong)
console.log(['a start', 'b start', 'sync', 'a end', 'got B', 't1', 'got A', 't2', 't3', 't4'].join(', '));`
    },
    mcq: { q: 'How many extra microtask ticks does "return somePromise" in an async function cost compared to "return value"?', options: ['0', '1', '2', '3'], answer: 2, explain: 'Resolving with a thenable queues NewPromiseResolveThenableJob (1), which calls then; the reaction to that then is another job (2).' },
    hints: [
      `<p>Hint 1: Sync: a start (then a pauses at await null), b start (b finishes and its promise is fulfilled with 'B'), sync. Queue: [resume a, got B, t1].</p>`,
      `<p>Hint 2: resume a prints "a end" and returns a promise → queue the resolve-thenable job at the back. Keep simulating the FIFO queue tick by tick.</p>`,
      `<p>Hint 3: The thenable job runs after t1, queues the adopt reaction after t2; that reaction fulfils a's promise and queues got A after t3.</p>`
    ],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"a start\nb start\nsync\na end\ngot B\nt1\nt2\nt3\ngot A\nt4"}]},
    solution: {
      approach: `<p>Write the microtask queue after every job. Adopting a returned promise = 2 jobs before the outer promise is fulfilled, plus 1 for its then-callback.</p>`,
      code: { lang: 'js', run: true, code: `async function a() {
  console.log('a start');
  await null;
  console.log('a end');
  return Promise.resolve('A');
}
async function b() {
  console.log('b start');
  return 'B';
}
a().then((v) => console.log('got ' + v));
b().then((v) => console.log('got ' + v));
Promise.resolve()
  .then(() => console.log('t1'))
  .then(() => console.log('t2'))
  .then(() => console.log('t3'))
  .then(() => console.log('t4'));
console.log('sync');

// Expected output:
// a start
// b start
// sync
// a end
// got B
// t1
// t2
// t3
// got A
// t4` },
      dry: { head: ['job', 'prints', 'queue after'], rows: [
        ['(script)', 'a start, b start, sync', 'resume a, got B, t1'],
        ['resume a', 'a end', 'got B, t1, thenable-job'],
        ['got B', 'got B', 't1, thenable-job'],
        ['t1', 't1', 'thenable-job, t2'],
        ['thenable-job', '—', 't2, adopt'],
        ['t2', 't2', 'adopt, t3'],
        ['adopt', '—', 't3, got A'],
        ['t3', 't3', 'got A, t4'],
        ['got A', 'got A', 't4'],
        ['t4', '<span class="c-g">t4</span>', '—']
      ] },
      complexity: `<p>O(jobs). Practical lesson: <code>return await p</code> or returning plain values keeps chains short; the 2-tick cost is invisible in real apps but decides puzzles.</p>`,
      followUps: ['Change a to "return await Promise.resolve(\'A\')". Where does got A move?', 'Change b to return Promise.resolve(\'B\').']
    }
  });

  practice.push({
    title: 'Promise pool: run async tasks with a concurrency limit',
    level: 'Hard', tags: ['concurrency', 'promises', 'scheduling'], companies: ['Google', 'Amazon', 'Uber', 'Rippling'],
    statement: `<p>Implement <code>runWithLimit(tasks, limit)</code>. <code>tasks</code> is an array of functions, each returning a promise. Run them with at most <code>limit</code> in flight at any time, start a new one as soon as one finishes, and resolve to the results <b>in input order</b>. If any task rejects, reject with that error.</p>`,
    constraints: `0 ≤ tasks.length ≤ 10<sup>4</sup>, 1 ≤ limit. Do not start a task before a slot is free.`,
    example: `<p>Durations [60, 20, 50, 20, 20] ms, limit 2: start 0,1 → 1 finishes (20 ms) → start 2 → 0 finishes (60 ms) → start 3 → 2 finishes (70 ms) → start 4 → 3, 4. Finish order ${H.c('b', '1,0,2,3,4')}; results ${H.c('g', 'r0..r4 in order')}; never more than ${H.c('p', '2')} running.</p>`,
    brute: {
      why: `<p><code>Promise.all(tasks.map((t) =&gt; t()))</code> starts everything at once — ignores the limit (rate limits, sockets, memory). Batching in fixed groups of <code>limit</code> respects it but wastes time: each batch waits for its slowest member while free slots sit idle.</p>`,
      code: `async function batches(tasks, limit) {
  const results = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const group = tasks.slice(i, i + limit).map((t) => t());
    results.push(...(await Promise.all(group)));       // whole batch waits for its slowest task
  }
  return results;
}
const job = (ms, v) => () => new Promise((r) => setTimeout(() => r(v), ms));
batches([job(30, 'a'), job(5, 'b'), job(5, 'c')], 2).then((r) => console.log(r.join(',')));`
    },
    mcq: { q: 'What is the key trick to start the next task as soon as ANY slot frees up?', options: ['Promise.all over batches', 'Start `limit` workers; each worker loops: take the next index, await that task, repeat', 'Promise.race in a loop over all tasks', 'Sort tasks by duration'], answer: 1, explain: 'Worker loops share one "next index" counter. JavaScript is single-threaded, so next++ cannot race.' },
    hints: [
      `<p>Hint 1: Think of <code>limit</code> workers (cashiers) pulling from a shared line of tasks. A shared index <code>next</code> says which task is next.</p>`,
      `<p>Hint 2: Each worker: <code>while (next &lt; tasks.length) { const i = next++; results[i] = await tasks[i](); }</code>. Run <code>Math.min(limit, n)</code> workers with Promise.all.</p>`,
      `<p>Hint 3: Store by index to keep input order. Empty input → []. A rejection rejects Promise.all of the workers; set a flag so other workers stop taking new tasks.</p>`
    ],
    tests: {"sig":"string int[] int -> string[]","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 700); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(kind, durs, limit) {\n  return __job(async function () {\n    var running = 0, max = 0, order = [];\n    if (kind === 'many') {\n      var tasks = durs.map(function (_, id) { return function () { running++; max = Math.max(max, running); return Promise.resolve().then(function () { running--; return 'r' + id; }); }; });\n      var res = await runWithLimit(tasks, limit);\n      return [res.length, res[0], res[res.length - 1], max, res.every(function (v, i) { return v === 'r' + i; })];\n    }\n    if (kind === 'fail') {\n      var tasks2 = durs.map(function (ms, id) { return function () { return new Promise(function (res, rej) { setTimeout(function () { if (ms < 0) rej(new Error('boom' + id)); else res('r' + id); }, Math.abs(ms) * 3); }); }; });\n      try { await runWithLimit(tasks2, limit); return 'resolved'; } catch (e) { return e.message; }\n    }\n    var tasks3 = durs.map(function (ms, id) { return function () { running++; max = Math.max(max, running); return new Promise(function (res) { setTimeout(function () { running--; order.push(id); res('r' + id); }, ms * 3); }); }; });\n    var out = await runWithLimit(tasks3, limit);\n    return [out, max, order];\n  });\n}"},"cases":[[["run",[60,20,50,20,20],2],[["r0","r1","r2","r3","r4"],2,[1,0,2,3,4]]],[["run",[],3],[[],0,[]]],[["run",[20,10],5],[["r0","r1"],2,[1,0]]],[["run",[30,10,20],1],[["r0","r1","r2"],1,[0,1,2]]],[["run",[40],1],[["r0"],1,[0]]],[["fail",[10,-10,10],2],"boom1"],[["fail",[10,10,-20],1],"boom2"],[["many",{"$rep":0,"n":10000},7],[10000,"r0","r9999",7,true]]]},
    solution: {
      approach: `<p>Worker-pool pattern. Because only one piece of JS runs at a time, <code>next++</code> is atomic — no locks needed. Each worker awaits one task at a time, so at most <code>limit</code> are in flight.</p>`,
      code: { lang: 'js', run: true, code: `async function runWithLimit(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  let failed = false;

  async function worker() {
    while (next < tasks.length && !failed) {
      const i = next++;                      // claim a task (single thread: no race)
      try {
        results[i] = await tasks[i]();
      } catch (err) {
        failed = true;                       // stop other workers taking new tasks
        throw err;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ---- demo with instrumentation ----
let running = 0, maxRunning = 0;
const finishOrder = [];
const job = (id, ms) => () => {
  running++;
  maxRunning = Math.max(maxRunning, running);
  return new Promise((resolve) => setTimeout(() => {
    running--;
    finishOrder.push(id);
    resolve('r' + id);
  }, ms));
};

const durations = [60, 20, 50, 20, 20];
runWithLimit(durations.map((ms, id) => job(id, ms)), 2).then((results) => {
  console.log('finish order: ' + finishOrder.join(','));
  console.log('results: ' + results.join(','));
  console.log('max running at once: ' + maxRunning);
  return runWithLimit([], 3);
}).then((empty) => console.log('empty input -> ' + JSON.stringify(empty)));

// Expected output:
// finish order: 1,0,2,3,4
// results: r0,r1,r2,r3,r4
// max running at once: 2
// empty input -> []` },
      dry: { head: ['time', 'event', 'running', 'next'], rows: [
        ['0', 'W1 starts 0 (60), W2 starts 1 (20)', '0, 1', '2'],
        ['20', '1 done → W2 starts 2 (50)', '0, 2', '3'],
        ['60', '0 done → W1 starts 3 (20)', '2, 3', '4'],
        ['70', '2 done → W2 starts 4 (20)', '3, 4', '5'],
        ['80', '3 done → W1 exits', '4', '5'],
        ['90', '4 done → W2 exits → resolve', '—', '<span class="c-g">results in input order</span>']
      ] },
      complexity: `<p>Time ≈ optimal greedy schedule for the given order; O(N) memory for results. Each task is started exactly once.</p>`,
      followUps: ['Return allSettled-style results instead of failing fast.', 'Add a per-task timeout and retries with exponential backoff.', 'Make limit adjustable while running (adaptive concurrency).']
    }
  });

  practice.push({
    title: 'Build a mini event-loop simulator',
    level: 'Hard', tags: ['event loop', 'simulation', 'priority queue', 'machine coding'], companies: ['Microsoft', 'Atlassian', 'Postman'],
    statement: `<p>Build a <b>virtual</b> runtime with <code>toySetTimeout(fn, ms)</code>, <code>toyQueueMicrotask(fn)</code> and <code>run(main)</code> that reproduces the real ordering rules: run <code>main</code> as the first task; after every task drain <b>all</b> microtasks (including ones added during the drain); then pick the timer with the smallest due time (ties: creation order), advance a virtual clock to it, and repeat. Callbacks print via <code>log(msg)</code>, which records <code>t=&lt;clock&gt; msg</code>.</p>`,
    constraints: `No real timers. Must handle timers created inside microtasks and microtasks created inside timers. Deterministic output.`,
    example: `<p>A program that mixes both lanes must produce exactly what the real runtime would, with virtual timestamps, e.g. ${H.c('g', 't=0 S')}, ${H.c('p', 't=0 M1')}, ${H.c('b', 't=10 T10')}…</p>`,
    brute: {
      why: `<p>A single FIFO queue for everything (in creation order) is simple but wrong: it lets timers run before microtasks and ignores delays. It is exactly the misconception the real algorithm fixes.</p>`,
      code: `const q = [];
const out = [];
const add = (fn) => q.push(fn);
add(() => out.push('T (timer, created first)'));
add(() => out.push('M (microtask)'));
while (q.length) q.shift()();
console.log(out.join(' | ') + '   <- wrong order');`
    },
    mcq: { q: 'Which data structure should hold the pending timers?', options: ['A plain FIFO queue', 'A min-heap / sorted list keyed by (dueTime, sequence number)', 'A stack', 'A Set'], answer: 1, explain: 'Timers fire by due time, ties by creation order. A min-heap gives O(log n) insert and extract; libuv uses a min-heap too.' },
    hints: [
      `<p>Hint 1: Keep three things: a microtask array (FIFO), a timer list of {due, seq, fn}, and a virtual clock.</p>`,
      `<p>Hint 2: <code>drain()</code>: while microtasks exist, shift and run one (new ones are pushed to the back, so the loop picks them up).</p>`,
      `<p>Hint 3: run(main): main(); drain(); while timers exist: pick min by (due, seq), clock = max(clock, due), run it, drain(). For a few timers a sort is fine; for many use a heap.</p>`
    ],
    tests: {"sig":"int -> string[]","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var rt = createRuntime(), log = rt.log, qm = rt.toyQueueMicrotask, st = rt.toySetTimeout;\n  var main;\n  if (k === 0) main = function () { log('S'); st(function () { log('T10'); qm(function () { log('M-in-T10'); }); st(function () { log('T10+0'); }, 0); }, 10); st(function () { log('T0'); }, 0); qm(function () { log('M1'); qm(function () { log('M2'); }); st(function () { log('T0-from-M1'); }, 0); }); log('E'); };\n  if (k === 1) main = function () { qm(function () { log('A'); qm(function () { log('B'); }); }); log('m'); };\n  if (k === 2) main = function () { st(function () { log('a'); }, 50); st(function () { log('b'); }, 20); st(function () { log('c'); }, 20); };\n  if (k === 3) main = function () { st(function () { log('x'); st(function () { log('y'); }, 5); }, 10); };\n  if (k === 4) main = function () { st(function () { log('T1'); qm(function () { log('m1'); }); }, 0); st(function () { log('T2'); }, 0); };\n  if (k === 5) main = function () {};\n  if (k === 6) main = function () { st(function () { log('d'); }); };\n  if (k === 7) { main = function () { for (var i = 0; i < 2000; i++) (function (j) { st(function () { log(j); }, 2000 - j); })(i); }; var o = rt.run(main); return [o.length, o[0], o[1999]]; }\n  if (k === 8) { main = function () { var n = 0; (function step() { if (n++ < 3000) qm(step); else log('done'); })(); st(function () { log('timer'); }, 0); }; var o2 = rt.run(main); return o2; }\n  return rt.run(main);\n}"},"cases":[[[0],["t=0 S","t=0 E","t=0 M1","t=0 M2","t=0 T0","t=0 T0-from-M1","t=10 T10","t=10 M-in-T10","t=10 T10+0"]],[[1],["t=0 m","t=0 A","t=0 B"]],[[2],["t=20 b","t=20 c","t=50 a"]],[[3],["t=10 x","t=15 y"]],[[4],["t=0 T1","t=0 m1","t=0 T2"]],[[5],[]],[[6],["t=0 d"]],[[7],[2000,"t=1 1999","t=2000 0"]],[[8],["t=0 done","t=0 timer"]]]},
    solution: {
      approach: `<p>Implement the HTML/Node loop literally: one task → microtask checkpoint → next timer by (due, seq). Timers created inside callbacks get <code>due = clock + ms</code>.</p>`,
      code: { lang: 'js', run: true, code: `function createRuntime() {
  let clock = 0, seq = 0;
  const microtasks = [];
  const timers = [];                      // { due, seq, fn }
  const output = [];

  const log = (msg) => output.push('t=' + clock + ' ' + msg);
  const toyQueueMicrotask = (fn) => microtasks.push(fn);
  const toySetTimeout = (fn, ms = 0) => timers.push({ due: clock + Math.max(0, ms), seq: seq++, fn });

  function drain() {                      // microtask checkpoint
    while (microtasks.length) microtasks.shift()();
  }
  function popNextTimer() {               // smallest due, then smallest seq
    let best = 0;
    for (let i = 1; i < timers.length; i++) {
      const a = timers[i], b = timers[best];
      if (a.due < b.due || (a.due === b.due && a.seq < b.seq)) best = i;
    }
    return timers.splice(best, 1)[0];
  }
  function run(main) {
    main();                               // the script is the first task
    drain();
    while (timers.length) {
      const t = popNextTimer();
      clock = Math.max(clock, t.due);     // jump the virtual clock forward
      t.fn();                             // ONE task
      drain();                            // then ALL microtasks
    }
    return output;
  }
  return { log, toyQueueMicrotask, toySetTimeout, run };
}

const { log, toyQueueMicrotask, toySetTimeout, run } = createRuntime();
const result = run(() => {
  log('S');
  toySetTimeout(() => {
    log('T10');
    toyQueueMicrotask(() => log('M-in-T10'));
    toySetTimeout(() => log('T10+0'), 0);
  }, 10);
  toySetTimeout(() => log('T0'), 0);
  toyQueueMicrotask(() => {
    log('M1');
    toyQueueMicrotask(() => log('M2'));
    toySetTimeout(() => log('T0-from-M1'), 0);
  });
  log('E');
});
console.log(result.join('\\n'));

// Expected output:
// t=0 S
// t=0 E
// t=0 M1
// t=0 M2
// t=0 T0
// t=0 T0-from-M1
// t=10 T10
// t=10 M-in-T10
// t=10 T10+0` },
      dry: { head: ['step', 'clock', 'runs', 'microtasks', 'timers (due)'], rows: [
        ['script', '0', 'main: S, E', 'M1', 'T10(10), T0(0)'],
        ['drain', '0', 'M1, M2', '—', 'T10(10), T0(0), T0-from-M1(0)'],
        ['task', '0', 'T0', '—', 'T10(10), T0-from-M1(0)'],
        ['task', '0', 'T0-from-M1', '—', 'T10(10)'],
        ['task', '10', 'T10', 'M-in-T10', 'T10+0(10)'],
        ['drain', '10', 'M-in-T10', '—', 'T10+0(10)'],
        ['task', '10', '<span class="c-g">T10+0</span>', '—', '—']
      ] },
      complexity: `<p>With a linear scan: O(T²) for T timers; with a binary min-heap: O(T log T). Microtasks O(M). Use <code>shift</code>-free index pointers or a ring buffer for huge microtask counts.</p>`,
      followUps: ['Add toyPromiseResolve(value).then(cb) built on toyQueueMicrotask.', 'Add a nextTick lane that drains before microtasks (Node).', 'Add setInterval with drift-free scheduling.']
    }
  });

  practice.push({
    title: 'Node.js: nextTick, promises and setImmediate inside a timer',
    level: 'Hard', tags: ['Node.js', 'process.nextTick', 'setImmediate', 'libuv phases'], companies: ['Netflix', 'PayPal', 'LinkedIn', 'Walmart'],
    statement: `<p>Predict the exact output in Node.js (CommonJS):</p><pre>setTimeout(() =&gt; {
  console.log('T');
  setImmediate(() =&gt; console.log('I1'));
  process.nextTick(() =&gt; {
    console.log('N1');
    Promise.resolve().then(() =&gt; console.log('P-from-N1'));
    process.nextTick(() =&gt; console.log('N2'));
  });
  Promise.resolve().then(() =&gt; {
    console.log('P1');
    process.nextTick(() =&gt; console.log('N-from-P1'));
  });
  setTimeout(() =&gt; console.log('T2'), 0);
}, 0);</pre>`,
    constraints: `Node.js 11+ CommonJS file. (Wrapped in a timer so setImmediate vs setTimeout is deterministic.)`,
    example: `<p>Output: ${H.c('b', 'T')} → ${H.c('y', 'N1 N2')} → ${H.c('p', 'P1 P-from-N1')} → ${H.c('y', 'N-from-P1')} → ${H.c('g', 'I1')} → ${H.c('b', 'T2')}. Node empties the <b>whole</b> nextTick queue, then the <b>whole</b> promise queue, and repeats while either has work.</p>`,
    brute: {
      why: `<p>Treating nextTick and promises as one shared FIFO gives T N1 P1 … in creation order; treating nextTick as "interrupting" each promise job gives P1 N-from-P1 P-from-N1. Both are wrong for Node's two-level drain.</p>`,
      code: `// One shared queue in creation order (wrong for Node)
console.log(['T', 'N1', 'P1', 'P-from-N1', 'N2', 'N-from-P1', 'I1', 'T2'].join(' '));`
    },
    mcq: { q: 'A nextTick callback is queued from inside a promise callback. When does it run?', options: ['Immediately, interrupting the promise queue', 'After the current promise microtask queue is fully drained, before moving on', 'In the next loop iteration', 'After setImmediate'], answer: 1, explain: 'Node runs all nextTicks, then V8 drains all promise jobs; then it checks nextTick again. A tick added during the promise drain waits for that drain to finish.' },
    hints: [
      `<p>Hint 1: After the timer callback (prints T), Node processes ticks: nextTick queue = [N1], promise queue = [P1].</p>`,
      `<p>Hint 2: Drain nextTicks fully: N1 (adds P-from-N1 to promises, N2 to ticks), N2. Then drain promises fully: P1 (adds tick N-from-P1), P-from-N1. Then ticks again: N-from-P1.</p>`,
      `<p>Hint 3: After the timers phase comes poll then <b>check</b> (setImmediate → I1); T2 needs the next loop's timers phase.</p>`
    ],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"T\nN1\nN2\nP1\nP-from-N1\nN-from-P1\nI1\nT2"}]},
    solution: {
      approach: `<p>Model Node's <code>processTicksAndRejections</code>: do { run all nextTicks; run all promise microtasks } while ticks remain. Then follow the libuv phase order: timers → poll → check → next timers.</p>`,
      code: { lang: 'js', run: true, code: `if (typeof process === 'undefined' || typeof setImmediate === 'undefined') {
  console.log('This puzzle needs Node.js (process.nextTick and setImmediate).');
} else {
  setTimeout(() => {
    console.log('T');
    setImmediate(() => console.log('I1'));
    process.nextTick(() => {
      console.log('N1');
      Promise.resolve().then(() => console.log('P-from-N1'));
      process.nextTick(() => console.log('N2'));
    });
    Promise.resolve().then(() => {
      console.log('P1');
      process.nextTick(() => console.log('N-from-P1'));
    });
    setTimeout(() => console.log('T2'), 0);
  }, 0);
}

// Expected output:
// T
// N1
// N2
// P1
// P-from-N1
// N-from-P1
// I1
// T2` },
      dry: { head: ['stage', 'nextTick queue', 'promise queue', 'printed'], rows: [
        ['timer cb', 'N1', 'P1', 'T'],
        ['ticks', 'N2 → —', 'P1, P-from-N1', 'N1 N2'],
        ['promises', 'N-from-P1', '—', 'P1 P-from-N1'],
        ['ticks', '—', '—', 'N-from-P1'],
        ['check phase', '—', '—', 'I1'],
        ['next timers phase', '—', '—', '<span class="c-g">T2</span>']
      ] },
      complexity: `<p>O(callbacks). Danger: recursive nextTick starves the loop even worse than recursive promises — prefer queueMicrotask or setImmediate.</p>`,
      followUps: ['Save the same code as .mjs. Does anything change? (Top-level ordering can, inside this timer it does not.)', 'Replace the outer setTimeout with fs.readFile callback. Same order?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'How many call stacks does the JavaScript code on one page (main thread, no workers) have?', options: ['One', 'One per function', 'One per async function', 'As many as CPU cores'], answer: 0, explain: 'One thread, one call stack. Concurrency comes from the host (Web APIs / libuv) doing work in the background and the event loop feeding callbacks back one at a time.' },
    { q: 'What prints? <code>setTimeout(() =&gt; log(1), 0); Promise.resolve().then(() =&gt; log(2)); log(3);</code>', options: ['1 2 3', '3 1 2', '3 2 1', '2 3 1'], answer: 2, explain: 'Sync 3 first; then the microtask 2; then the task 1.' },
    { q: 'Which of these schedules a <b>microtask</b>?', options: ['setTimeout(fn, 0)', 'queueMicrotask(fn)', 'setInterval(fn, 0)', 'a click event listener'], answer: 1, explain: 'queueMicrotask, promise reactions (then/catch/finally), await continuations and MutationObserver callbacks are microtasks. Timers and events are tasks.' },
    { q: 'After one task finishes, the event loop runs…', options: ['one microtask, then the next task', 'all microtasks, including ones added while draining, then (maybe) renders, then the next task', 'all tasks, then all microtasks', 'only rendering'], answer: 1, explain: 'One task → full microtask checkpoint → rendering opportunity → next task.' },
    { q: 'An async function is called. When does the code <b>before</b> its first await run?', options: ['Synchronously, right away, on the caller\'s stack', 'As a microtask', 'As a task', 'Only when someone awaits the result'], answer: 0, explain: 'Async functions start like normal functions. Only the part after an await is deferred.' },
    { q: '<code>await 42</code> (a non-promise value)…', options: ['continues immediately without pausing', 'still pauses; the rest of the function resumes as a microtask', 'throws a TypeError', 'waits for the next task'], answer: 1, explain: 'await wraps the value with Promise.resolve and always suspends, costing one microtask tick.' },
    { q: 'Why is a <code>try/catch</code> around <code>setTimeout(() =&gt; { throw e }, 0)</code> useless?', options: ['setTimeout swallows errors', 'The callback runs later on a fresh stack, after the try block has already finished', 'try/catch does not work with arrow functions', 'Errors in timers are converted to rejections'], answer: 1, explain: 'try/catch only covers code that runs while its frame is on the stack. Put the try/catch inside the callback, or use promises + await.' },
    { q: 'What happens in Node.js 15+ when a promise rejects and nobody handles it?', options: ['Nothing', 'A warning only', 'The process crashes with an uncaught error (default --unhandled-rejections=throw), unless an unhandledRejection listener exists', 'The promise is retried'], answer: 2, explain: 'Since Node 15 the default mode is throw. Browsers log "Uncaught (in promise)" and fire unhandledrejection.' },
    { q: 'Which order is correct in Node.js (CommonJS) for callbacks queued in the same synchronous run?', options: ['promise → nextTick → setTimeout', 'nextTick → promise → setTimeout', 'setTimeout → nextTick → promise', 'nextTick → setTimeout → promise'], answer: 1, explain: 'Node drains the nextTick queue first, then promise microtasks, then moves on to the timers phase.' },
    { q: 'What prints? <code>Promise.resolve().then(() =&gt; { log(0); return Promise.resolve(4); }).then(log); Promise.resolve().then(() =&gt; log(1)).then(() =&gt; log(2)).then(() =&gt; log(3)).then(() =&gt; log(5));</code>', options: ['0 1 4 2 3 5', '0 1 2 3 4 5', '0 4 1 2 3 5', '0 1 2 4 3 5'], answer: 1, explain: 'Returning a promise from a then-callback costs 2 extra ticks (resolve-thenable job + then job), so 4 lands after 3.' },
    { q: 'You want the browser to repaint (show a spinner) in the middle of a long computation. Which yields correctly?', options: ['await Promise.resolve()', 'queueMicrotask(next)', 'await new Promise((r) =&gt; setTimeout(r, 0)) or scheduler.yield()', 'A while loop that checks Date.now()'], answer: 2, explain: 'Rendering only happens between tasks. Microtask yields never let the browser paint.' },
    { q: 'Inside an async function, <code>try { return fetchData(); } catch (e) { … }</code> — fetchData() rejects. What happens?', options: ['The local catch handles it', 'The rejection skips the local catch and goes to the caller; use return await to catch it locally', 'The function throws synchronously', 'The rejection is ignored'], answer: 1, explain: 'return hands the promise out and leaves the try block before it rejects. return await waits inside the try.' },
    { q: 'Two timers: <code>setTimeout(a, 10)</code> created at t=0, then <code>setTimeout(b, 5)</code> created at t=0. A 50 ms busy loop follows. Which runs first?', options: ['a, because it was created first', 'b, because its due time (5 ms) is earlier', 'Random', 'Neither runs until another event'], answer: 1, explain: 'Both are overdue when the loop ends; timers fire in due-time order (ties broken by creation order). The delay is a minimum: both run late.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    {
      q: 'Explain the JavaScript event loop to a beginner.', level: 'B',
      a: `<p>JavaScript runs on <b>one thread</b> with one call stack, like a restaurant with one waiter. Slow things (timers, network, files) are handed to the <b>host</b> — the browser's Web APIs or Node's libuv — which works on them in the background. When they finish, their callbacks are put into queues. The <b>event loop</b> is the routine that, whenever the call stack is empty, takes the next callback and runs it: <b>one task</b> (script, timer, click), then <b>all microtasks</b> (promise callbacks, await continuations, queueMicrotask), then the browser may <b>render</b>, then repeat. That is why <code>setTimeout(fn, 0)</code> runs after the current code and after promise callbacks.</p>`,
      followUps: ['Where does the callback wait while the timer is counting?', 'What is "run-to-completion"?', 'Why can a long loop freeze the page?']
    },
    {
      q: 'What is the difference between the task (macrotask) queue and the microtask queue?', level: 'B',
      a: `<p><b>Tasks</b>: the script itself, <code>setTimeout/setInterval</code>, UI events, <code>MessageChannel</code>, I/O and (Node) <code>setImmediate</code>. The loop runs <b>one</b> task per turn. <b>Microtasks</b>: promise reactions (<code>then/catch/finally</code>), the rest of an async function after <code>await</code>, <code>queueMicrotask</code>, <code>MutationObserver</code>. After every task, the loop runs <b>all</b> microtasks until the queue is empty — including new ones queued during the drain. So microtasks always run before the next task and before rendering. Consequence: a microtask that keeps queueing microtasks can starve timers, clicks and painting forever.</p>`,
      followUps: ['Can a microtask starve the page? How would you show it?', 'Where does requestAnimationFrame fit?']
    },
    {
      q: 'Predict the output of the classic async1/async2 puzzle (script start, async1 start, async2, promise1, script end, …) and explain each line.', level: 'I',
      a: `<p>Answer: <b>script start, async1 start, async2, promise1, script end, async1 end, promise2, setTimeout</b>. Sync: <i>script start</i>; setTimeout registers a task; async1 runs synchronously → <i>async1 start</i>; <code>await async2()</code> calls async2 now → <i>async2</i>; async2's promise is already fulfilled, so async1's continuation is queued as a microtask. The executor of <code>new Promise</code> runs now → <i>promise1</i>; resolve + then queues <i>promise2</i> behind the continuation. <i>script end</i>. Drain microtasks: <i>async1 end</i>, <i>promise2</i>. Then the timer task: <i>setTimeout</i>. Pre-2019 engines (Node ≤ 10) needed 3 ticks for await and printed promise2 first.</p>`,
      followUps: ['What changes if async2 returns Promise.resolve() explicitly?', 'What changes if async2 contains its own await?']
    },
    {
      q: 'How does async/await work under the hood?', level: 'I',
      a: `<p>An async function is compiled like a <b>generator</b> plus a driver. Calling it creates a hidden promise and runs the body synchronously until the first <code>await</code>. <code>await x</code> does <code>PromiseResolve(x)</code> (reuses a native promise, wraps anything else), subscribes resume/throw callbacks with <code>then</code>, and <b>suspends</b>: the frame's registers are saved into a heap object and the stack is freed, so the caller continues. When the promise settles, a microtask resumes the function with the value — or throws the reason at the await line, so <code>try/catch</code> works. <code>return v</code> resolves the hidden promise; <code>throw</code> rejects it. Awaiting a fulfilled native promise costs 1 tick; returning a promise costs 2 extra.</p>`,
      followUps: ['Write a run(genFn) helper that drives a generator like async/await.', 'Why do paused async functions not consume stack space?']
    },
    {
      q: 'setTimeout(fn, 0) vs Promise.resolve().then(fn) vs queueMicrotask(fn) — when would you use each?', level: 'I',
      a: `<p><code>queueMicrotask(fn)</code> and <code>Promise.resolve().then(fn)</code> both queue a <b>microtask</b>: fn runs after the current synchronous code, before any other task or render. Use for "after this burst, before anyone else looks" — batching state updates, consistent ordering in libraries. queueMicrotask is cheaper and does not convert exceptions into rejections. <code>setTimeout(fn, 0)</code> queues a <b>task</b>: other tasks, input and painting can happen first; it has ≥ 1 ms (Node) or clamped ≥ 4 ms (nested in browsers) delays. Use it — or better <code>scheduler.yield()</code> / <code>MessageChannel</code> — when you want to <b>yield</b> to the browser.</p>`,
      followUps: ['Why is await Promise.resolve() not a way to let the UI update?', 'What does scheduler.postTask add?']
    },
    {
      q: 'Why doesn’t try/catch catch errors from a setTimeout callback, and how should async errors be handled?', level: 'I',
      a: `<p>try/catch works on the <b>current call stack</b>. The timer callback runs later as a new task, on a fresh stack; the try block finished long ago. Options: put try/catch <b>inside</b> the callback; or wrap the async work in a promise so errors become <b>rejections</b> that flow to a <code>.catch</code> or to <code>await</code> inside try/catch. Inside promise land, throws in executors and then-callbacks reject the derived promise. Every promise chain should end in a handler; add global <code>unhandledrejection</code>/<code>error</code> (browser) or <code>process.on('unhandledRejection'/'uncaughtException')</code> (Node) handlers for <b>reporting</b>, not control flow.</p>`,
      followUps: ['What does Node 15+ do with an unhandled rejection?', 'How do you preserve the original error when re-throwing? (new Error(msg, { cause }))']
    },
    {
      q: 'What is the difference between return and return await inside an async function?', level: 'A',
      a: `<p>Outside try/catch they behave the same for callers (only tick counts differ: returning a promise costs 2 extra microtasks for adoption, return await costs 1 for the await). Inside <code>try</code> they differ in <b>semantics</b>: <code>return promise</code> leaves the try block immediately, so if the promise rejects, the local <code>catch</code>/<code>finally</code> do not see it; <code>return await promise</code> waits inside the try so the catch handles the rejection and finally runs after settlement. return await also gives better async stack traces in V8. That is why ESLint deprecated <code>no-return-await</code> and typescript-eslint's <code>return-await</code> rule defaults to "in-try-catch".</p>`,
      followUps: ['Show a case where finally runs too early without await.', 'How many ticks does each version take?']
    },
    {
      q: 'Explain the Node.js event loop phases and where process.nextTick, promises and setImmediate fit.', level: 'A',
      a: `<p>libuv runs phases in a loop: <b>timers</b> (expired setTimeout/setInterval) → <b>pending callbacks</b> (some deferred I/O errors) → <b>idle/prepare</b> → <b>poll</b> (wait for and run I/O callbacks) → <b>check</b> (setImmediate) → <b>close callbacks</b>. After <b>every</b> callback, Node drains the <code>process.nextTick</code> queue, then the V8 promise microtask queue, repeating while either has work (Node 11+ does this per timer, matching browsers). So nextTick &gt; promises &gt; next phase. Inside an I/O or timer callback, setImmediate always runs before setTimeout 0; at the main module's top level, their order depends on process performance and is not deterministic. In ES modules, top-level promises can run before nextTicks.</p>`,
      followUps: ['Why can recursive nextTick starve I/O?', 'When would you choose setImmediate over setTimeout(…, 0)?']
    },
    {
      q: 'What is "run-to-completion" and what are its consequences?', level: 'I',
      a: `<p>Once a function starts running, nothing else in that thread can run until the call stack is empty again — no other callback, no event handler, no rendering. Benefits: no data races inside a single thread, no locks needed, a shared counter like <code>next++</code> in a promise pool is safe. Costs: a long synchronous piece of work (big JSON.parse, heavy loop, giant microtask chain) blocks everything — input lag, frozen UI, missed frames, bad INP; in Node it blocks every request on the server. Fixes: split work into chunks with task yields, move CPU-heavy work to Web Workers / worker_threads, or stream the data.</p>`,
      followUps: ['Is an await point a "completion"? What can change across an await?', 'How do you detect long tasks in production? (Long Animation Frames API)']
    },
    {
      q: 'Can microtasks starve the event loop? Give an example and a fix.', level: 'A',
      a: `<p>Yes. Because the loop drains microtasks until the queue is empty, a microtask that always queues another one never lets the loop reach the next task or render: <code>function spin() { queueMicrotask(spin); } spin();</code> freezes the tab while a <code>setTimeout</code> callback never fires. Same with a recursive promise loop such as <code>const loop = () =&gt; Promise.resolve().then(loop)</code> (and with recursive <code>process.nextTick</code> in Node, which also starves I/O). Fix: break long or unbounded work into <b>tasks</b> (<code>setTimeout</code>, <code>MessageChannel</code>, <code>setImmediate</code>, <code>scheduler.yield()</code>), add a budget (process for 5–10 ms, then yield), or move it to a worker.</p>`,
      followUps: ['Why does Node warn about recursive nextTick?', 'How does React schedule work so it does not starve input?']
    },
    {
      q: 'What happens step by step when you await a fetch() call in the browser?', level: 'I',
      a: `<p>1) <code>fetch()</code> runs synchronously just long enough to start the request in the browser's network stack (outside the JS thread) and returns a pending promise. 2) <code>await</code> subscribes the function's continuation to that promise and suspends the function; the stack unwinds and the event loop continues — the page stays responsive. 3) When response headers arrive, the networking task resolves the promise; the continuation is queued as a <b>microtask</b>. 4) The function resumes with the <code>Response</code>. 5) <code>await res.json()</code> repeats the cycle while the body streams in and is parsed. Errors: network failures reject (→ throw at await); HTTP 404/500 do <b>not</b> reject — check <code>res.ok</code>.</p>`,
      followUps: ['How do you cancel it? (AbortController)', 'How would you fetch 3 independent resources faster?']
    },
    {
      q: 'Why might a requestAnimationFrame callback run before or after a setTimeout(…, 0) callback?', level: 'A',
      a: `<p>rAF callbacks are not tasks or microtasks — they run in the <b>update-the-rendering</b> step, right before the browser paints, which happens only when a frame is due (about every 16.7 ms at 60 Hz, and never in hidden tabs). A 0 ms timer becomes a task that usually runs within a few ms. If the current task ends just before a frame is due, rAF runs first; otherwise the timer runs first. Therefore puzzles mixing rAF and setTimeout have <b>no single correct order</b>; a strong answer says so and explains the model. Use rAF for visual updates and to batch DOM reads and writes; use tasks for yielding.</p>`,
      followUps: ['How do you run code right after the next paint? (rAF + setTimeout / MessageChannel)', 'What happens to rAF in a background tab?']
    },
    {
      q: 'How would you implement a concurrency-limited async task runner, and why is it safe without locks?', level: 'E',
      a: `<p>Start <code>limit</code> async <b>workers</b> that share an index: each loops <code>while (next &lt; n) { const i = next++; results[i] = await tasks[i](); }</code>; return <code>Promise.all(workers)</code> then results. Order is preserved by writing at index i; fail-fast via a flag; for allSettled semantics catch per task. It is safe because JavaScript is single-threaded with run-to-completion: <code>next++</code> executes atomically between awaits, and no two workers ever run JS at the same instant. Extensions: per-task timeouts with AbortController, retries with exponential backoff and jitter, priority queues, and adaptive limits based on error rates (like p-limit / p-queue in production).</p>`,
      followUps: ['How would you stop in-flight tasks on the first failure?', 'Where could a race still happen? (state that changes across an await)']
    },
    {
      q: 'An AI assistant claims a snippet prints "promise2" before "async1 end". How do you settle it and explain the discrepancy?', level: 'E',
      a: `<p>First, <b>run it</b> in the target runtime (current Node and a browser) — the runtime is the source of truth. Modern engines print "async1 end" first because since the 2019 spec change (V8 7.2 / Node 12), <code>await</code> on a native promise uses <code>PromiseResolve</code> and costs one tick; the old algorithm wrapped it in an extra promise (3 ticks), which is what many pre-2019 blog posts and therefore training data describe. Then explain with a tick table: list the microtask queue after every job. Finally ask which runtime the question targets (browser, Node CJS, Node ESM) — tick-level answers can differ for <code>process.nextTick</code> and module evaluation.</p>`,
      followUps: ['Which other output-order facts changed between Node 10 and 12/11?', 'How would you write a test that guards a library against ordering regressions?']
    }
  );

  registerModule({
    id: 'js08',
    title: 'Async II: Event Loop, Microtasks & async/await',
    intro: `<p>This is the module that turns "JavaScript is weird" into "JavaScript is predictable". You will learn how <b>one thread</b> with one <b>call stack</b> handles timers, clicks, network calls and promises without freezing: the host (browser <b>Web APIs</b> or Node's <b>libuv</b>) does the waiting, and the <b>event loop</b> feeds callbacks back from two queues — the <b>task (macrotask) queue</b> and the higher-priority <b>microtask queue</b>.</p><p>Every topic uses our one-waiter restaurant analogy and an animated visualizer that shows the running line of code, the call stack, the Web APIs, both queues and the console output step by step. Most visualizers are <b>editable</b>: type your own mini-program and watch the event loop run it. You will master <code>setTimeout</code> vs <code>Promise.then</code> vs <code>queueMicrotask</code>, what <code>async/await</code> really compiles to, how async errors travel, and a repeatable 4-column method that solves any "predict the output" interview puzzle — including the famous ones.</p>`,
    goals: [
      'Explain the call stack, Web APIs, task queue, microtask queue and the event loop algorithm in plain words and with a diagram',
      'Predict the exact output order of any mix of sync code, setTimeout, Promise.then, queueMicrotask and async/await — and justify every line',
      'Explain what async/await does under the hood (generator + promise, 1 tick per await, +2 ticks for returning a promise)',
      'Handle async errors correctly: try/catch with await, .catch chains, finally, return await, unhandled rejections in browsers and Node',
      'Know the Node.js differences: process.nextTick, setImmediate, libuv phases, CommonJS vs ES modules',
      'Keep apps responsive: spot blocking code and microtask starvation, and yield with tasks or scheduler.yield()'
    ],
    prereqs: `JS 7 (Async I: Callbacks & Promises) — promise states, then/catch chaining and Promise.all. JS 4 (Scope, Hoisting & Closures) helps for the closure-in-loop puzzles. Basic comfort running code in Node or the browser console (JS 3).`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
