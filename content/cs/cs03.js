(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ---------- shared helpers for every visualizer in this module ---------- */
function parseProcs(input, needPrio) {
  var toks = String(input).trim().split(/[\s,;]+/).filter(Boolean), procs = [], opt = { q: 2, age: 0, s: 6, boost: 0 };
  toks.forEach(function (tk) {
    var m = /^(q|age|s|boost)=(\d+)$/i.exec(tk);
    if (m) { opt[m[1].toLowerCase()] = parseInt(m[2], 10); return; }
    var f = tk.split(':');
    if (f.length < 3) throw new Error('Format: Name:arrival:burst (e.g. P1:0:5 P2:1:3). Optional 4th number = priority (lower = more important). Options: q=2 age=3');
    var at = parseInt(f[1], 10), bt = parseInt(f[2], 10), pr = f.length > 3 ? parseInt(f[3], 10) : procs.length + 1;
    if (isNaN(at) || isNaN(bt) || isNaN(pr) || at < 0 || bt < 1) throw new Error('Arrival must be ≥ 0 and burst ≥ 1 (whole numbers). Problem near "' + tk + '"');
    procs.push({ n: f[0].slice(0, 6), at: at, bt: bt, pr: pr });
  });
  if (!procs.length) throw new Error('Give at least one process like P1:0:5');
  if (procs.length > 8) throw new Error('Use at most 8 processes');
  var tot = 0; procs.forEach(function (p) { tot += p.bt; if (p.at > 30) throw new Error('Keep arrival times ≤ 30'); });
  if (tot > 40) throw new Error('Keep total burst time ≤ 40 so the animation stays short');
  if (opt.q < 1) opt.q = 1;
  return { procs: procs, q: opt.q, age: opt.age, s: Math.max(1, opt.s), boost: opt.boost };
}
function fmt(x) { return (Math.round(x * 100) / 100).toString(); }

/* tick-by-tick simulator: algo = fcfs | sjf | srtf | prio | prio_p | rr */
function sim(P, algo, q, age) {
  var n = P.length, rem = P.map(function (p) { return p.bt; }), wait = P.map(function () { return 0; });
  var fin = [], first = [], ready = [], cur = -1, used = 0, t = 0, arrived = {}, ticks = [], line = [], arrAt = {};
  var isPrio = algo === 'prio' || algo === 'prio_p';
  function eff(i) { return P[i].pr - (age ? Math.floor(wait[i] / age) : 0); }
  function key(i) {
    var k = algo === 'sjf' ? P[i].bt : algo === 'srtf' ? rem[i] : eff(i);
    return [k, P[i].at, i];
  }
  function less(a, b) { for (var j = 0; j < 3; j++) { if (a[j] !== b[j]) return a[j] < b[j]; } return false; }
  function admit(tm) { for (var i = 0; i < n; i++) { if (P[i].at === tm && !arrived[i]) { arrived[i] = 1; ready.push(i); (arrAt[tm] = arrAt[tm] || []).push(P[i].n); } } }
  function done() { for (var i = 0; i < n; i++) { if (fin[i] === undefined) return false; } return true; }
  var guard = 0;
  admit(0);
  while (!done() && guard++ < 400) {
    var why = '', ev = [];
    admit(t);
    if (cur === -1 || algo === 'srtf' || algo === 'prio_p') {
      var pool = ready.slice(); if (cur !== -1) pool.push(cur);
      if (pool.length) {
        var pick = pool[0], label;
        if (algo === 'fcfs' || algo === 'rr') { pick = pool[0]; why = algo === 'rr' ? 'front of the queue goes next' : 'first in line (earliest arrival) goes next'; }
        else {
          pick = pool[0]; pool.forEach(function (i) { if (less(key(i), key(pick))) pick = i; });
          label = algo === 'sjf' ? 'total burst' : algo === 'srtf' ? 'time left' : (age ? 'effective priority' : 'priority');
          why = 'smallest ' + label + ' wins: ' + pool.map(function (i) { return P[i].n + '=' + key(i)[0]; }).join(', ');
        }
        if (pick !== cur) {
          if (cur !== -1) { ready.push(cur); ev.push('<span class="c-r">' + P[cur].n + ' is preempted</span> (goes back to ready)'); }
          ready.splice(ready.indexOf(pick), 1); cur = pick; used = 0;
        } else { why = P[cur].n + ' is still the best choice, keeps running'; }
      }
    } else { why = P[cur].n + ' is mid-run (no preemption in this algorithm)'; if (algo === 'rr') why = P[cur].n + ' keeps its quantum (' + used + '/' + q + ' used)'; }
    if (cur === -1) { line.push('-'); ticks.push({ t: t, run: -1, ready: [], rem: rem.slice(), why: 'nobody has arrived yet, CPU idles', ev: [], eff: P.map(function (p, i) { return eff(i); }), arr: [] }); t++; continue; }
    if (first[cur] === undefined) first[cur] = t;
    line.push(P[cur].n);
    var rec = { t: t, run: cur, ready: ready.slice(), why: why, ev: ev, eff: P.map(function (p, i) { return eff(i); }), arr: [] };
    ready.forEach(function (i) { wait[i]++; }); wait[cur] = 0;
    rem[cur]--; used++; t++;
    admit(t); rec.arr = arrAt[t] || [];
    if (rem[cur] === 0) { fin[cur] = t; rec.ev.push('<span class="c-g">' + P[cur].n + ' finishes at t=' + t + '</span>'); rec.fin = cur; cur = -1; }
    else if (algo === 'rr' && used === q) { ready.push(cur); rec.ev.push('quantum ' + q + ' used up: <b>' + P[cur].n + '</b> goes to the back'); rec.qexp = cur; cur = -1; }
    rec.rem = rem.slice(); rec.readyAfter = ready.slice();
    ticks.push(rec);
  }
  return { ticks: ticks, fin: fin, first: first, line: line };
}
function stats(P, S) {
  var tw = 0, tt = 0, tr = 0, n = P.length, rows = [], cs = 0;
  P.forEach(function (p, i) { var tat = S.fin[i] - p.at, wt = tat - p.bt, rt = S.first[i] - p.at; tw += wt; tt += tat; tr += rt; rows.push({ tat: tat, wt: wt, rt: rt, ct: S.fin[i] }); });
  for (var k = 1; k < S.line.length; k++) { if (S.line[k] !== S.line[k - 1] && S.line[k] !== '-' && S.line[k - 1] !== '-') cs++; }
  return { rows: rows, wt: tw / n, tat: tt / n, rt: tr / n, cs: cs };
}
function ganttCompact(line) {
  var out = [], i = 0;
  while (i < line.length) { var j = i; while (j < line.length && line[j] === line[i]) j++; out.push(line[i] + '[' + i + '–' + j + ']'); i = j; }
  return out.join(' → ');
}
function ganttViz(algo, def, label, needPrio) {
  return {
    title: label, input: def, inputLabel: 'Processes Name:arrival:burst' + (needPrio ? ':priority' : '') + '  (options: q=2  age=3)',
    gen: function (input) {
      var cfg = parseProcs(input), P = cfg.procs, S = sim(P, algo, cfg.q, cfg.age), st = stats(P, S), frames = [];
      var isPrio = algo === 'prio' || algo === 'prio_p';
      var cols = ['PID', 'AT', 'BT'].concat(isPrio ? [cfg.age ? 'Prio→eff' : 'Prio'] : [], ['Left', 'State', 'CT', 'TAT', 'WT', 'RT']);
      // tk = tick record (or null before start); upto = time after the tick
      function table(upto, tk, allDone) {
        var rows = [], hl = {};
        P.forEach(function (p, i) {
          var done = S.fin[i] !== undefined && S.fin[i] <= upto;
          var state = !tk ? 'not arrived' : done ? 'done' : (tk.run === i) ? 'RUNNING' : (p.at <= upto ? 'waiting' : 'not arrived');
          if (allDone) state = 'done';
          var row = [p.n, p.at, p.bt];
          if (isPrio) row.push(cfg.age && tk && !allDone ? p.pr + '→' + tk.eff[i] : p.pr);
          row.push(allDone ? 0 : tk ? tk.rem[i] : p.bt, state, done ? S.fin[i] : '-', done ? S.fin[i] - p.at : '-', done ? S.fin[i] - p.at - p.bt : '-', (S.first[i] !== undefined && S.first[i] < upto) ? S.first[i] - p.at : '-');
          rows.push(row);
          if (tk && tk.run === i) hl[i] = 'cur';
          if (tk && tk.fin === i) hl[i] = 'ok'; else if (done && !(tk && tk.run === i)) hl[i] = 'done';
        });
        return { type: 'table', label: 'Per-process table (TAT = CT − AT, WT = TAT − BT, RT = first run − AT)', columns: cols, rows: rows, hl: hl };
      }
      frames.push({ narr: 'We simulate <b>' + algo.toUpperCase().replace('_P', ' (preemptive)') + '</b> one time unit at a time. Slot <i>k</i> in the Gantt row means the time span k → k+1. Nobody has run yet.', parts: [
        { type: 'text', html: 'Time starts at <b>0</b>. Click Next to build the Gantt chart tick by tick.' }, table(0, null)] });
      S.ticks.forEach(function (tk) {
        var vals = S.line.slice(0, tk.t + 1), hl = {}, ptr = {};
        for (var k = 0; k < tk.t; k++) hl[k] = 'ok'; hl[tk.t] = 'cur'; ptr[tk.t] = 'now';
        var items = (tk.readyAfter || []).map(function (i) { return P[i].n + '(' + tk.rem[i] + ')'; });
        var nm = tk.run >= 0 ? P[tk.run].n : 'idle';
        var nar = '<b>t = ' + tk.t + ' → ' + (tk.t + 1) + '</b>: ' + (tk.run >= 0 ? '<b>' + nm + '</b> runs for one unit. ' : '') + '<i>' + tk.why + '.</i>';
        if (tk.ev.length) nar += ' ' + tk.ev.join('; ') + '.';
        if (tk.arr && tk.arr.length) nar += ' <span class="c-b">' + tk.arr.join(', ') + ' arrive' + (tk.arr.length === 1 ? 's' : '') + ' at t=' + (tk.t + 1) + '.</span>';
        frames.push({ narr: nar, parts: [
          { type: 'array', label: 'Gantt chart (one slot per time unit)', values: vals, hl: hl, ptr: ptr, showIdx: true },
          { type: 'queue', label: 'Ready queue after this tick (time left in brackets)', items: items, frontLabel: 'next', backLabel: 'last' },
          table(tk.t + 1, tk)] });
      });
      frames.push({ narr: 'All done. <b>Average waiting time = ' + fmt(st.wt) + '</b>, average turnaround = ' + fmt(st.tat) + ', average response = ' + fmt(st.rt) + ', context switches = ' + st.cs + '.', parts: [
        { type: 'array', label: 'Final Gantt chart', values: S.line, showIdx: true },
        table(S.line.length, { t: S.line.length, run: -1, rem: P.map(function () { return 0; }), eff: P.map(function (p) { return p.pr; }) }, true),
        { type: 'text', html: ganttCompact(S.line) + '<br>Avg WT = ' + fmt(st.wt) + ' · Avg TAT = ' + fmt(st.tat) + ' · Avg RT = ' + fmt(st.rt) }] });
      return frames;
    }
  };
}


/* ---------- MLFQ visualizer ---------- */
var QUANTA = [2, 4, 8];
function mlfqViz(def, ttl) {
  return {
    title: ttl || 'MLFQ: 3 levels (quantum 2 / 4 / 8) with demotion and optional boost', input: def,
    inputLabel: 'Processes Name:arrival:burst  (option boost=N: every N ticks everyone returns to Q0)',
    gen: function (input) {
      var cfg = parseProcs(input), P = cfg.procs, n = P.length, boost = cfg.boost;
      var rem = P.map(function (p) { return p.bt; }), lvl = P.map(function () { return 0; }), Q = [[], [], []];
      var cur = -1, curL = 0, used = 0, t = 0, line = [], fin = [], arrived = {}, frames = [], guard = 0;
      function admit(tm) { var a = []; for (var i = 0; i < n; i++) { if (P[i].at === tm && !arrived[i]) { arrived[i] = 1; Q[0].push(i); lvl[i] = 0; a.push(P[i].n); } } return a; }
      function allDone() { for (var i = 0; i < n; i++) { if (fin[i] === undefined) return false; } return true; }
      function names(l) { return Q[l].map(function (i) { return P[i].n + '(' + rem[i] + ')'; }); }
      function tableRows() { return P.map(function (p, i) { return [p.n, p.at, p.bt, fin[i] !== undefined ? 'done' : 'Q' + lvl[i], rem[i], fin[i] !== undefined ? fin[i] : '-']; }); }
      function snapshot(narr, hlIdx) {
        var hl = {}; for (var k = 0; k < line.length - 1; k++) hl[k] = 'ok'; if (line.length) hl[line.length - 1] = 'cur';
        var th = {}; P.forEach(function (p, i) { if (i === hlIdx) th[i] = 'cur'; else if (fin[i] !== undefined) th[i] = 'done'; });
        frames.push({ narr: narr, parts: [
          { type: 'array', label: 'Gantt chart', values: line.length ? line.slice() : ['-'], hl: hl, showIdx: true },
          { type: 'queue', label: 'Q0 · top level · quantum 2', items: names(0), frontLabel: 'next', backLabel: 'last' },
          { type: 'queue', label: 'Q1 · middle · quantum 4', items: names(1), frontLabel: 'next', backLabel: 'last' },
          { type: 'queue', label: 'Q2 · bottom · quantum 8 (round robin)', items: names(2), frontLabel: 'next', backLabel: 'last' },
          { type: 'vars', label: 'CPU', vals: { running: cur >= 0 ? P[cur].n : (hlIdx >= 0 ? P[hlIdx].n : 'idle'), time: t }, hl: { running: 'cur' } },
          { type: 'table', label: 'Processes', columns: ['PID', 'AT', 'BT', 'Level', 'Left', 'CT'], rows: tableRows(), hl: th }] });
      }
      var first = admit(0);
      snapshot('Start. New processes always enter the <b>top queue Q0</b>. ' + (first.length ? first.join(', ') + ' arrive at t=0.' : 'Nobody is here at t=0.'), -1);
      while (!allDone() && guard++ < 300) {
        var ev = [];
        admit(t);
        if (boost && t > 0 && t % boost === 0) {
          var all = []; if (cur >= 0) all.push(cur); Q.forEach(function (q) { q.forEach(function (i) { all.push(i); }); });
          Q = [[], [], []]; all.forEach(function (i) { Q[0].push(i); lvl[i] = 0; }); cur = -1;
          ev.push('<span class="c-p">PRIORITY BOOST at t=' + t + ': every unfinished process goes back to Q0</span> (stops starvation)');
        }
        if (cur >= 0) {
          for (var l = 0; l < curL; l++) {
            if (Q[l].length) { Q[curL].push(cur); ev.push('<span class="c-r">' + P[cur].n + ' is preempted</span> because a job in a higher queue is waiting'); cur = -1; break; }
          }
        }
        if (cur < 0) {
          for (var lv = 0; lv < 3; lv++) { if (Q[lv].length) { cur = Q[lv].shift(); curL = lv; used = 0; ev.push('pick the head of the <b>highest non-empty queue Q' + lv + '</b>: <b>' + P[cur].n + '</b>'); break; } }
        }
        if (cur < 0) { line.push('-'); t++; var a0 = admit(t); snapshot('<b>t=' + (t - 1) + '→' + t + '</b>: CPU idle, nobody is ready.' + ev.join('; '), -1); continue; }
        var ran = cur; line.push(P[cur].n); rem[cur]--; used++; t++;
        var arr = admit(t), msg = '<b>t=' + (t - 1) + '→' + t + '</b>: <b>' + P[ran].n + '</b> runs at Q' + curL + ' (' + used + '/' + QUANTA[curL] + ' of its quantum). ' + ev.join('; ');
        if (rem[ran] === 0) { fin[ran] = t; msg += ' <span class="c-g">' + P[ran].n + ' finishes at t=' + t + '.</span>'; cur = -1; }
        else if (used === QUANTA[curL]) {
          var nl = Math.min(curL + 1, 2); lvl[ran] = nl; Q[nl].push(ran);
          msg += ' <span class="c-y">It used the whole quantum, so it looks CPU-hungry: ' + (nl === curL ? 'stays at the bottom queue' : 'demoted Q' + curL + ' → Q' + nl) + '.</span>'; cur = -1;
        }
        if (arr.length) msg += ' <span class="c-b">' + arr.join(', ') + ' arrive in Q0.</span>';
        snapshot(msg, ran);
      }
      snapshot('Everything finished at t=' + t + '. Short jobs finished in the top queues; long jobs sank to lower levels.', -1);
      return frames;
    }
  };
}

/* ---------- CFS visualizer + engine ---------- */
var WEIGHT = { '-20': 88761, '-10': 9548, '-5': 3121, '-4': 2501, '-3': 1991, '-2': 1586, '-1': 1277, '0': 1024, '1': 820, '2': 655, '3': 526, '4': 423, '5': 335, '10': 110, '15': 36, '19': 15 };
function weightOf(nice) { var k = String(nice); return WEIGHT[k] !== undefined ? WEIGHT[k] : Math.max(15, Math.round(1024 / Math.pow(1.25, nice))); }
function parseCfs(input) {
  var toks = String(input).trim().split(/[\s,;]+/).filter(Boolean), tasks = [], s = 6;
  toks.forEach(function (tk) {
    var m = /^s=(\d+)$/i.exec(tk); if (m) { s = Math.max(1, parseInt(m[1], 10)); return; }
    var f = tk.split(':'); if (f.length !== 3) throw new Error('Format: Name:nice:burstMs, e.g. A:0:12 B:5:12. Optional s=6 sets the time slice in ms.');
    var nice = parseInt(f[1], 10), b = parseInt(f[2], 10);
    if (isNaN(nice) || isNaN(b) || nice < -20 || nice > 19 || b < 1) throw new Error('nice must be -20..19 and burst ≥ 1 ms near "' + tk + '"');
    tasks.push({ n: f[0].slice(0, 5), nice: nice, w: weightOf(nice), left: b, vr: 0, cpu: 0 });
  });
  if (!tasks.length) throw new Error('Give at least one task like A:0:12');
  if (tasks.length > 7) throw new Error('Use at most 7 tasks');
  return { tasks: tasks, s: s };
}
function bstLevel(sorted) {
  var arr = []; function put(lo, hi, pos) { if (lo > hi) return; var mid = (lo + hi) >> 1; arr[pos] = sorted[mid]; put(lo, mid - 1, 2 * pos + 1); put(mid + 1, hi, 2 * pos + 2); }
  put(0, sorted.length - 1, 0); var out = []; for (var i = 0; i < arr.length; i++) out.push(arr[i] === undefined ? null : arr[i]); return out;
}
function cfsViz(def, ttl) {
  return {
    title: ttl || 'CFS: always run the leftmost (smallest vruntime) node', input: def,
    inputLabel: 'Tasks Name:nice:burstMs  (option s=6 = ms per slice)',
    gen: function (input) {
      var cfg = parseCfs(input), T = cfg.tasks, S = cfg.s, frames = [], steps = 0, clock = 0;
      var total = 0; T.forEach(function (x) { total += Math.ceil(x.left / S); }); if (total > 28) throw new Error('Too many slices (' + total + '). Use shorter bursts or a bigger s=.');
      function live() { return T.filter(function (x) { return x.left > 0 && !x.running; }); }
      function sorted() { return live().sort(function (a, b) { return a.vr - b.vr || T.indexOf(a) - T.indexOf(b); }); }
      function treeFor(list, hlName, cls) {
        var arr = bstLevel(list.map(function (x) { return x.n + ' ' + fmt(x.vr); })), hl = {};
        if (hlName) arr.forEach(function (lab, i) { if (lab && lab.split(' ')[0] === hlName) hl[i] = cls; });
        return { type: 'tree', label: 'Run queue ordered by vruntime (left = smallest). Leftmost = next to run', arr: arr, hl: hl };
      }
      function table(cur) {
        return { type: 'table', label: 'Tasks (weight from the kernel nice table, vruntime in virtual ms)', columns: ['Task', 'nice', 'weight', 'vruntime', 'left (ms)', 'CPU got (ms)'],
          rows: T.map(function (x) { return [x.n, x.nice, x.w, fmt(x.vr), x.left, x.cpu]; }), hl: (function () { var h = {}; T.forEach(function (x, i) { if (x === cur) h[i] = 'cur'; else if (x.left <= 0) h[i] = 'done'; }); return h; })() };
      }
      frames.push({ narr: 'Every task starts with <b>vruntime = 0</b>. The scheduler keeps tasks in a tree ordered by vruntime and always picks the <b>leftmost</b> (smallest). Heavy tasks (low nice, big weight) have their vruntime grow <b>slowly</b>, so they get picked more often.', parts: [treeFor(sorted(), sorted()[0].n, 'win'), table(null)] });
      while (live().length && steps++ < 40) {
        var list = sorted(), pick = list[0], run = Math.min(S, pick.left), before = pick.vr;
        frames.push({ narr: '<b>Pick:</b> smallest vruntime is <b>' + pick.n + '</b> (' + fmt(pick.vr) + '). It is the leftmost node, so it runs next for ' + run + ' ms.', parts: [treeFor(list, pick.n, 'win'), table(pick)] });
        pick.running = true;
        var delta = run * 1024 / pick.w;
        pick.vr += delta; pick.left -= run; pick.cpu += run; clock += run;
        frames.push({ narr: '<b>' + pick.n + ' runs ' + run + ' ms</b> (clock = ' + clock + '). It is taken out of the tree while it runs. <code>vruntime += ' + run + ' × 1024 / ' + pick.w + ' = +' + fmt(delta) + '</code>, so ' + fmt(before) + ' → <b>' + fmt(pick.vr) + '</b>.', parts: [treeFor(sorted(), null), { type: 'vars', label: 'Running now', vals: { task: pick.n, weight: pick.w, 'ms run': run, 'vruntime Δ': fmt(delta) }, hl: { task: 'cur' } }, table(pick)] });
        pick.running = false;
        var nextList = sorted();
        frames.push({ narr: pick.left > 0 ? '<b>' + pick.n + '</b> is put back into the tree at its new position (vruntime ' + fmt(pick.vr) + ').' : '<span class="c-g">' + pick.n + ' has finished</span> and leaves the tree.', parts: [treeFor(nextList, pick.left > 0 ? pick.n : null, 'ok'), table(null)] });
      }
      frames.push({ narr: 'Done at t=' + clock + ' ms. Compare "CPU got" with weights: while all tasks were runnable the shares followed the weights (nice 0 has 3× the weight of nice 5).', parts: [table(null)] });
      return frames;
    }
  };
}

/* ---------- Scheduler shootout visualizer ---------- */
function shootoutViz(def) {
  return {
    title: 'Scheduler shootout: same jobs, every algorithm', input: def,
    inputLabel: 'Processes Name:arrival:burst:priority  (option q=2)',
    gen: function (input) {
      var cfg = parseProcs(input), P = cfg.procs, frames = [];
      var algos = [['fcfs', 'FCFS'], ['sjf', 'SJF'], ['srtf', 'SRTF'], ['prio_p', 'Priority (pre)'], ['rr', 'RR q=' + cfg.q]], rows = [], hl = {}, best = {};
      frames.push({ narr: 'Same ' + P.length + ' processes, five schedulers. Watch average <b>waiting</b>, <b>turnaround</b>, <b>response</b> and <b>context switches</b> change.', parts: [{ type: 'text', html: P.map(function (p) { return '<code>' + p.n + ' AT=' + p.at + ' BT=' + p.bt + ' prio=' + p.pr + '</code>'; }).join(' · ') }] });
      algos.forEach(function (a, k) {
        var S = sim(P, a[0], cfg.q, 0), st = stats(P, S);
        rows.push([a[1], fmt(st.wt), fmt(st.tat), fmt(st.rt), st.cs]);
        var comments = { fcfs: 'Simple and fair in arrival order, but a long first job makes everyone wait (convoy effect).', sjf: 'Best average waiting among non-preemptive algorithms, but needs to know burst lengths and can starve long jobs.', srtf: 'Preemptive SJF: provably minimal average waiting time, but many switches and starvation of long jobs.', prio_p: 'Lowest priority number always wins; low-priority jobs may wait for a long time.', rr: 'Everyone gets the CPU quickly (low response), at the price of more switches and higher turnaround.' };
        frames.push({ narr: '<b>' + a[1] + '</b>: avg WT <b>' + fmt(st.wt) + '</b>, avg TAT ' + fmt(st.tat) + ', avg RT ' + fmt(st.rt) + ', switches ' + st.cs + '. ' + comments[a[0]], parts: [
          { type: 'array', label: a[1] + ' Gantt chart', values: S.line, showIdx: true, hl: (function () { var h = {}; S.line.forEach(function (x, i) { if (i === 0 || x !== S.line[i - 1]) h[i] = 'cur'; }); return h; })() },
          { type: 'table', label: 'Comparison so far', columns: ['Algorithm', 'avg WT', 'avg TAT', 'avg RT', 'switches'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[k] = 'sel'; return h; })() }] });
      });
      var bw = 0, br = 0; rows.forEach(function (r, i) { if (parseFloat(r[1]) < parseFloat(rows[bw][1])) bw = i; if (parseFloat(r[3]) < parseFloat(rows[br][3])) br = i; });
      var h2 = {}; h2[bw] = 'ok'; 
      frames.push({ narr: 'Lowest average waiting: <b>' + rows[bw][0] + '</b>. Lowest average response: <b>' + rows[br][0] + '</b>. No single algorithm wins on every metric. That is why real systems mix them (MLFQ, CFS).', parts: [{ type: 'table', label: 'Final comparison (green = lowest avg waiting)', columns: ['Algorithm', 'avg WT', 'avg TAT', 'avg RT', 'switches'], rows: rows, hl: h2 }] });
      return frames;
    }
  };
}


topics.push({
  title: 'Scheduling Goals, Metrics and How to Read a Gantt Chart',
  analogy: `<p>Picture <b>one cashier</b> at a busy shop and a line of customers. The cashier is the CPU, the customers are processes. Some customers have one bottle of milk, some have a full trolley. "Who do I serve next?" is the whole scheduling problem. Different shops care about different things: a fast-food shop wants nobody to wait long to be <i>noticed</i>, a wholesale shop wants the most trolleys cleared per hour.</p>`,
  explain: `<p>The <b>CPU scheduler</b> is the part of the OS that picks which ready process gets the CPU next. It runs when a process finishes, blocks (waits for I/O), is preempted, or a new one arrives. Before comparing algorithms you need the scoreboard. Every interview number comes from these words:</p>
  ${H.table(['Term', 'Plain meaning', 'Formula'], [
    ['Arrival time (AT)', 'when the process shows up in the ready queue', 'given'],
    ['Burst time (BT)', 'CPU time it needs in total', 'given'],
    ['Completion time (CT)', 'clock time when it finishes', 'read from the Gantt chart'],
    ['Turnaround time (TAT)', 'total time from arrival to finish', H.c('b', 'CT − AT')],
    ['Waiting time (WT)', 'time spent sitting in the ready queue', H.c('b', 'TAT − BT')],
    ['Response time (RT)', 'arrival until the <i>first</i> time it gets the CPU', H.c('b', 'first run − AT')],
    ['CPU utilization', 'fraction of time the CPU is busy', 'busy time / total time'],
    ['Throughput', 'jobs finished per unit time', 'jobs / total time']])}
  <p><b>Goals pull in different directions.</b> We want high utilization and throughput, low turnaround, low waiting, low response time, and <b>fairness</b> (nobody starves). Batch systems (nightly payroll) care about throughput and turnaround. Interactive systems (your laptop) care about response time. Servers care about the tail of latency. No algorithm wins everything.</p>
  <p><b>Gantt chart</b> = a timeline bar showing who ran when. We draw one box per run, and write the time at each edge. Example with processes P1 (AT 0, BT 5), P2 (AT 1, BT 3) in arrival order:</p>
  ${H.arr(['P1', 'P1', 'P1', 'P1', 'P1', 'P2', 'P2', 'P2'], { label: 'Gantt: slot k means time k → k+1', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'b', 6: 'b', 7: 'b' }, idx: true })}
  ${H.table(['PID', 'AT', 'BT', 'CT', 'TAT = CT−AT', 'WT = TAT−BT', 'RT'], [['P1', 0, 5, 5, 5, 0, 0], ['P2', 1, 3, 8, 7, 4, 4]])}
  <p>Average WT = (0 + 4) / 2 = <b>2</b>. Average TAT = (5 + 7) / 2 = <b>6</b>. Always finish with the averages; interviewers ask for them.</p>
  <p><b>Preemptive vs non-preemptive.</b> Non-preemptive: once a process gets the CPU it keeps it until it finishes or blocks. Preemptive: the OS can take the CPU away (timer interrupt or a more important process arrived). Modern OSes are preemptive; the textbook non-preemptive ones are easier to calculate by hand.</p>
  <p><b>Context switch cost.</b> Switching processes saves registers, swaps page tables (TLB effects), and cools the caches. It is pure overhead: the CPU does zero user work during it. More preemption = better responsiveness but more overhead.</p>`,
  clues: ['"average waiting time", "average turnaround time", "draw the Gantt chart" → tabulate AT, BT, CT, TAT, WT', '"interactive" or "response time matters" → preemptive, small time slices', '"batch", "throughput", "payroll" → favour long non-preemptive runs, fewer switches', '"fair", "no starvation" → aging, round robin, or CFS', '"CPU utilization 40%" with many processes blocked on I/O → raise the degree of multiprogramming', 'Same arrival time for everyone → classic "all arrive at t=0" table; check for idle gaps otherwise'],
  code: [
    { lang: 'python', title: 'Runnable lab: Gantt chart + averages for FCFS, SJF, SRTF, Priority, Round Robin', run: true, code: `"""CPU scheduling lab: tick-by-tick simulator for FCFS, SJF, SRTF, Priority (+aging), Round Robin."""

def parse(text):
    # "P1:0:5 P2:1:3" -> [name, arrival, burst, priority]; lower priority number = more important
    procs = []
    for tok in text.split():
        f = tok.split(":")
        procs.append([f[0], int(f[1]), int(f[2]), int(f[3]) if len(f) > 3 else 0])
    return procs

def simulate(procs, algo, q=2, age=0):
    n = len(procs)
    rem = [p[2] for p in procs]
    wait = [0] * n            # ticks spent waiting since last run (for aging)
    finish = [None] * n
    first = [None] * n
    ready, cur, used, t, line = [], None, 0, 0, []
    arrived = set()
    while any(f is None for f in finish):
        for i in range(n):                       # arrivals enter the queue first
            if procs[i][1] == t and i not in arrived:
                arrived.add(i); ready.append(i)
        if cur is None or algo in ("srtf", "prio_p"):
            pool = ready + ([cur] if cur is not None else [])
            if pool:
                if algo in ("fcfs", "rr"):
                    pick = pool[0]
                else:
                    def key(i):
                        if algo in ("sjf", "srtf"):
                            k = rem[i] if algo == "srtf" else procs[i][2]
                        else:
                            k = procs[i][3] - (wait[i] // age if age else 0)
                        return (k, procs[i][1], i)
                    pick = min(pool, key=key)
                if pick != cur:
                    if cur is not None:
                        ready.append(cur)        # preempted: back to ready
                    ready.remove(pick); cur = pick; used = 0
        if cur is None:
            line.append("-"); t += 1; continue
        if first[cur] is None: first[cur] = t
        line.append(procs[cur][0])
        for i in ready: wait[i] += 1
        wait[cur] = 0
        rem[cur] -= 1; used += 1; t += 1
        for i in range(n):                       # arrivals at the new time join before a preempted RR job
            if procs[i][1] == t and i not in arrived:
                arrived.add(i); ready.append(i)
        if rem[cur] == 0:
            finish[cur] = t; cur = None
        elif algo == "rr" and used == q:
            ready.append(cur); cur = None
    return line, finish, first

def report(procs, algo, **kw):
    line, fin, first = simulate(procs, algo, **kw)
    print("== %s %s ==" % (algo.upper(), kw if kw else ""))
    print("Gantt:", "|".join(line))
    tw = tt = tr = 0
    print("%-4s %3s %3s %3s %4s %4s %4s" % ("P", "AT", "BT", "CT", "TAT", "WT", "RT"))
    for i, p in enumerate(procs):
        tat = fin[i] - p[1]; wt = tat - p[2]; rt = first[i] - p[1]
        tw += wt; tt += tat; tr += rt
        print("%-4s %3d %3d %3d %4d %4d %4d" % (p[0], p[1], p[2], fin[i], tat, wt, rt))
    n = len(procs)
    print("avg TAT=%.2f  avg WT=%.2f  avg RT=%.2f\\n" % (tt / n, tw / n, tr / n))
    return tt / n, tw / n, tr / n

if __name__ == "__main__":
    ps = parse("P1:0:5:3 P2:1:3:1 P3:2:8:4 P4:3:6:2")
    for a, kw in [("fcfs", {}), ("sjf", {}), ("srtf", {}), ("rr", {"q": 2}), ("rr", {"q": 4}), ("prio_p", {}), ("prio_p", {"age": 3})]:
        report(ps, a, **kw)` }
  ],
  viz: ganttViz('fcfs', 'P1:0:5 P2:1:3 P3:2:8 P4:3:6', 'Build the Gantt chart tick by tick (FCFS) and fill the metric table', false),
  examples: [
    { title: 'Worked: reading TAT, WT, RT from a finished chart', html: `<p>Chart: P1 [0–4], P2 [4–7], P3 [7–8], arrivals P1=0, P2=1, P3=2, bursts 4, 3, 1.</p>${H.table(['PID', 'CT', 'TAT', 'WT', 'RT'], [['P1', 4, '4−0 = 4', '4−4 = 0', 0], ['P2', 7, '7−1 = 6', '6−3 = 3', '4−1 = 3'], ['P3', 8, '8−2 = 6', '6−1 = 5', '7−2 = 5']])}<p>Avg WT = 8/3 ≈ <b>2.67</b>. Without preemption RT = WT. That is a handy check: if a process never gets preempted, response time equals waiting time.</p>` },
    { title: 'Idle gaps and CPU utilization', html: `<p>P1 (AT 0, BT 2) and P2 (AT 6, BT 3). The CPU idles from t=2 to t=6.</p>${H.arr(['P1', 'P1', '-', '-', '-', '-', 'P2', 'P2', 'P2'], { idx: true, hl: { 2: 'r', 3: 'r', 4: 'r', 5: 'r' } })}<p>Utilization = busy / total = 5 / 9 ≈ <b>55.6%</b>. Throughput = 2 jobs / 9 time units ≈ 0.22 jobs per unit. WT for both is 0, because nobody ever waited.</p>` },
    { title: 'Why average WT alone can mislead', html: `<p>Two schedules with the same average waiting time can feel very different: (0, 0, 30) vs (10, 10, 10). The second is "fair", the first has one unlucky victim. In production we also track <b>variance</b> and the <b>worst case (p99)</b> of wait, not just the mean.</p>` },
    { title: 'Utilization from I/O-bound jobs', html: `<p>If a process spends 80% of its time waiting on I/O and we run <i>n</i> of them, the chance all wait at once is 0.8<sup>n</sup>. CPU utilization ≈ 1 − 0.8<sup>n</sup>. n = 1 → 20%, n = 5 → 67%, n = 10 → 89%. That is the textbook reason multiprogramming exists.</p>` }
  ],
  deepDive: `<p><b>When does the scheduler actually run?</b> The four decision points are: (1) running → waiting (I/O request), (2) running → ready (timer interrupt), (3) waiting → ready (I/O finished), (4) running → terminated. Only 1 and 4 exist in a non-preemptive system. Cases 2 and 3 need preemption, which is why shared data in the kernel must be protected (a process can be interrupted in the middle of a kernel update).</p>
  <p><b>Dispatcher vs scheduler.</b> The scheduler decides <i>who</i>; the dispatcher does the handover: switch context, switch to user mode, jump to the saved program counter. <b>Dispatch latency</b> is how long that takes (a few microseconds on modern hardware, but cache and TLB damage make the real cost bigger).</p>
  <p><b>Burst model.</b> Real processes alternate CPU bursts and I/O bursts. The histogram is heavy on many short CPU bursts and a few long ones. That observation is why "favour short jobs" works so well in practice (SJF, MLFQ, CFS sleeper bonus).</p>
  <p><b>Little's Law</b> (a nice senior-level link): average number in system = arrival rate × average time in system. For a stable system, minimizing average turnaround also minimizes the average number of jobs sitting around.</p>
  <p><b>Tail latency.</b> Average numbers hide the p99. On a server a 1% slow path hits many users once a page needs 100 backend calls. Production schedulers are therefore judged on percentiles, not just averages.</p>
  <p><b>Scheduling classes today.</b> Linux has several policies: SCHED_OTHER/NORMAL (CFS, now EEVDF from 6.6), SCHED_FIFO and SCHED_RR (real-time), SCHED_DEADLINE (EDF), SCHED_BATCH, SCHED_IDLE. Real-time systems are judged on meeting deadlines, not on averages at all.</p>`,
  aiEra: `<p><b>What AI changes:</b> GPU and ML workloads made scheduling a front-page topic again. A GPU does not time-slice as cheaply as a CPU, so cluster schedulers (Kubernetes, Slurm, Ray) use gang scheduling, bin-packing, and priorities with preemption for training jobs. Inference servers batch requests ("continuous batching") which is a scheduling decision very much like picking a time slice and a queue discipline: short prompts should not wait behind a 100k-token monster, the convoy effect again.</p>
  <p><b>Use AI as a partner:</b> ask <code>Generate 5 random arrival/burst tables and the correct Gantt and averages for SRTF, then I will check my work</code>. It is a great infinite worksheet. Always re-verify with your own simulator, because models slip on tie-breaks.</p>
  <p><b>Where AI goes wrong:</b> it silently changes the tie-break rule, forgets idle gaps, counts WT from time 0 instead of from arrival, and mixes up "waiting" with "response". It also hand-waves the order of a newly arrived process versus a preempted one in round robin.</p>
  <p><b>What you must still own:</b> the definitions (TAT = CT − AT, WT = TAT − BT), stating your tie-break assumption out loud, and the judgment of which metric the business actually cares about.</p>`,
  problems: [{
    title: 'Compute the Gantt Chart and Averages for FCFS',
    level: 'Easy', tags: ['FCFS', 'gantt', 'metrics'], companies: ['TCS', 'Infosys', 'Amazon'],
    statement: `<p>Four processes arrive as follows: P1 (AT 0, BT 5), P2 (AT 1, BT 3), P3 (AT 2, BT 8), P4 (AT 3, BT 6). Using <b>FCFS</b>, draw the Gantt chart and compute CT, TAT, WT, RT for each, and the average WT and TAT.</p>`,
    constraints: `All times are whole numbers. FCFS is non-preemptive. Ties are broken by lower process number.`,
    example: `${H.arr(['P1', 'P2', 'P3', 'P4'], { label: 'run order = arrival order' })}<p>Gantt: ${H.c('g', 'P1 [0–5]')} ${H.c('b', 'P2 [5–8]')} ${H.c('y', 'P3 [8–16]')} ${H.c('p', 'P4 [16–22]')}. Average WT = <b>5.75</b>, average TAT = <b>11.25</b>. Why: each process waits for everything that arrived before it.</p>`,
    brute: { why: `<p>A common weak approach is guessing the order and adding burst times without tracking arrival times. That breaks as soon as there is an idle gap or when WT is measured from time 0 instead of from arrival. A table makes the bookkeeping mechanical.</p>` },
    mcq: { q: 'FCFS: P1 finishes at 5 and P2 arrived at 1. What is P2\'s waiting time before it starts?', options: ['5 − 1 = 4', '5', '1', '3'], answer: 0, explain: 'Waiting before first run = start − arrival = 5 − 1 = 4. With no preemption this equals total waiting time.' },
    hints: [`<p>Hint 1: FCFS = sort by arrival, run each to completion. No decisions needed.</p>`, `<p>Hint 2: Start time of a job = max(its arrival, previous job's completion). Completion = start + burst.</p>`, `<p>Hint 3: TAT = CT − AT, WT = TAT − BT. Add the columns, divide by 4. Check: if a job never waits, TAT = BT.</p>`],
    solution: {
      approach: `<p>Sort by arrival (already sorted). For each process compute start = max(AT, previous CT), CT = start + BT. Then TAT = CT − AT and WT = TAT − BT. Averages: WT (0+4+6+13)/4 = 5.75, TAT (5+7+14+19)/4 = 11.25. Note that P4, the second-longest job, waits 13 units because it sits behind three others: FCFS is fair in order but poor for short jobs behind long ones.</p>`,
      dry: { head: ['PID', 'Start', 'CT = start+BT', 'TAT = CT−AT', 'WT = TAT−BT'], rows: [['P1', 0, 5, 5, 0], ['P2', 5, 8, 7, 4], ['P3', 8, 16, 14, 6], ['P4', 16, 22, 19, 13], ['Avg', '', '', '11.25', '5.75']] },
      complexity: `<p>O(n log n) to sort by arrival, O(n) to compute the table.</p>`,
      followUps: ['What changes if P1 arrives at t=10 instead of 0? (idle gap, CT shifts)', 'Compute the same table for SJF and compare the averages.']
    }
  }]
});


topics.push({
  title: 'FCFS and the Convoy Effect',
  analogy: `<p>A supermarket has <b>one</b> queue. The first person has a trolley with 200 items; behind them stand ten people with a single bottle each. Everybody is served in the order they came (fair!), yet the ten small shoppers each lose 15 minutes. That traffic-jam pattern, many short jobs stuck behind one long job, is the <b>convoy effect</b>.</p>`,
  explain: `<p><b>First-Come, First-Served (FCFS)</b> keeps a plain FIFO queue. The process at the front gets the CPU and keeps it until it finishes or blocks. It is non-preemptive, trivially easy to code (a queue), and perfectly fair <i>in order of arrival</i>.</p>
  <p><b>The catch:</b> average waiting time depends heavily on the order. Take three jobs arriving together with bursts 24, 3, 3:</p>
  ${H.table(['Order', 'Gantt', 'Waits', 'Avg WT'], [['P1, P2, P3', 'P1[0–24] P2[24–27] P3[27–30]', '0, 24, 27', H.c('r', '17')], ['P2, P3, P1', 'P2[0–3] P3[3–6] P1[6–30]', '0, 3, 6', H.c('g', '3')]])}
  <p>Same work, same machine, but the average wait dropped from 17 to 3 just by letting the short ones go first. That is the whole motivation for SJF in the next topic.</p>
  <p><b>The convoy effect with I/O.</b> Imagine one CPU-bound process and many I/O-bound ones. The CPU-bound process grabs the CPU for a long burst while the I/O-bound ones wait in the ready queue. Meanwhile the disks sit <i>idle</i> because nobody is issuing I/O. When the CPU hog finally blocks, all the I/O processes run for a tiny moment and block again, so now the CPU sits idle. The CPU and the devices take turns being idle: low utilization of both.</p>
  ${H.arr(['CPU-hog', 'io1', 'io2', 'io3', 'io4'], { label: 'ready queue (front → back)', hl: { 0: 'r' } })}
  <p><b>When FCFS is fine:</b> batch work where all jobs are similar, simple embedded loops, and as the tie-breaker inside other algorithms (RR, MLFQ bottom level use FCFS-like ordering). Use the visualizer below and change the first burst from 24 to 2 to see the convoy vanish.</p>`,
  clues: ['"long process arrives first, many short processes behind" → convoy effect', '"non-preemptive", "simple queue", "FIFO" → FCFS', '"average waiting time very high with one big job" → switch to SJF/SRTF/RR', '"CPU-bound and I/O-bound mix, devices idle" → convoy effect with I/O', 'Order of arrival changes the average → FCFS is order-sensitive', '"Which scheduler is starvation free?" → FCFS (everyone eventually reaches the front)'],
  code: `// FCFS in 12 lines: start = max(arrival, previous completion)
struct P { int at, bt; };
double fcfsAvgWait(vector<P> v) {
    sort(v.begin(), v.end(), [](const P& a, const P& b) { return a.at < b.at; });
    int t = 0; double wait = 0;
    for (auto& p : v) {
        t = max(t, p.at);        // CPU may sit idle until the job arrives
        wait += t - p.at;        // time spent in the ready queue
        t += p.bt;               // run to completion (non-preemptive)
    }
    return wait / v.size();
}`,
  codeTitle: 'FCFS average waiting time',
  viz: [ganttViz('fcfs', 'P1:0:24 P2:1:3 P3:2:3', 'Convoy effect: one long job first (FCFS)', false), ganttViz('fcfs', 'P1:0:2 P2:1:3 P3:2:3', 'Same jobs, short one first: convoy gone', false)],
  examples: [
    { title: 'Convoy numbers: arrival at t=0,1,2 with bursts 24, 3, 3', html: `<p>FCFS: P1 [0–24], P2 [24–27], P3 [27–30]. WT = 0, 24−1 = 23, 27−2 = 25. Average = 48/3 = <b>16</b>. Compare SRTF on the same input (next topic): P2 and P3 jump in and the average WT falls to about 2.67.</p>${H.table(['PID', 'AT', 'BT', 'CT', 'TAT', 'WT'], [['P1', 0, 24, 24, 24, 0], ['P2', 1, 3, 27, 26, 23], ['P3', 2, 3, 30, 28, 25]])}` },
    { title: 'Idle gap in FCFS', html: `<p>P1 (AT 0, BT 3), P2 (AT 10, BT 2). After P1 finishes at 3 the CPU idles until 10. P2 starts at 10, finishes at 12, WT = 0. FCFS formula start = max(AT, prevCT) handles it; subtracting from time 0 does not.</p>` },
    { title: 'Order sensitivity: all arrive at 0', html: `<p>Bursts 6, 8, 7, 3 in that order give WT 0, 6, 14, 21 → avg <b>10.25</b>. Sorted shortest-first (3, 6, 7, 8): WT 0, 3, 9, 16 → avg <b>7</b>. The 3.25 saved per job is the price of ignoring burst length.</p>` },
    { title: 'Why FCFS never starves anyone', html: `<p>A process at position k in the queue only waits for the k−1 jobs ahead of it. New arrivals join the back, so nobody can overtake. Waiting is bounded, unlike in priority or SJF scheduling.</p>` }
  ],
  deepDive: `<p><b>Why "convoy"?</b> The name comes from early IBM System R experiments: a lock holder that gets descheduled makes all waiters pile up behind it. In the database world the same term describes <i>lock convoys</i>: threads queue behind a lock owner, run in lock-step, and context switching overhead explodes. The CPU version and the lock version share one cause: a slow item at the head of a FIFO.</p>
  <p><b>Quantifying it.</b> For n jobs with burst times b<sub>1</sub>…b<sub>n</sub> in FIFO order, total waiting = Σ (n − i) · b<sub>i</sub>: a job's burst is paid once by <i>every job behind it</i>. So the long job should go as late as possible, which is exactly what SJF does.</p>
  <p><b>Practical forms today.</b> A single-threaded event loop (Node.js, Redis) is FCFS over events: one slow handler (a big JSON.parse, a KEYS * command) delays every request behind it. A thread pool with a single shared FIFO queue and one 30-second job suffers the same. Fixes: split long work into chunks (cooperative time slicing), separate pools for slow and fast work (a multilevel queue!), timeouts, and priority lanes.</p>
  <p><b>Non-preemptive means a bug can hang the system.</b> If a process in an FCFS system loops forever, nothing else ever runs. Preemption with a timer interrupt is a protection mechanism, not just a performance feature.</p>
  <p><b>Cost model.</b> Context switches are minimal: exactly one per process. That is why FCFS is still used in some batch and high-throughput compute clusters where jobs are large and switches are expensive.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM serving is a fresh convoy story. Static batching made a whole batch wait for the slowest (longest) generation, so short chats sat behind long ones. Modern servers (vLLM, TGI, TensorRT-LLM) use <b>continuous batching</b>: finished sequences leave and new ones join every decoding step, a preemptive-like scheduler at token granularity. Training clusters meanwhile run FCFS with backfill: a huge job at the head blocks the queue, so schedulers let smaller jobs "backfill" the holes without delaying it.</p>
  <p><b>Use AI as a partner:</b> paste a table of burst times and ask "which ordering minimizes total waiting and why?" to practise the exchange argument; ask it to produce a convoy example for a Node.js server and the fix.</p>
  <p><b>Where AI goes wrong:</b> it often says FCFS "minimizes starvation and waiting"; it only guarantees no starvation. It may also confuse the convoy effect with the lock convoy or with the thundering herd; know all three by name.</p>
  <p><b>What you must still own:</b> explaining the effect with two numbers (average wait 16 vs about 3), and knowing the engineering fixes: chunking, separate lanes, preemption.</p>`,
  problems: [{
    title: 'Quantify the Convoy Effect',
    level: 'Easy', tags: ['FCFS', 'SJF', 'convoy'], companies: ['Oracle', 'Cisco', 'TCS'],
    statement: `<p>Five processes all arrive at t = 0 in this order with burst times: P1 = 10, P2 = 1, P3 = 2, P4 = 1, P5 = 5. Compute the average waiting time under FCFS and under SJF, and explain the convoy effect in one sentence.</p>`,
    constraints: `All arrive at time 0; non-preemptive; no I/O.`,
    example: `${H.table(['Scheduler', 'Order', 'Avg WT'], [['FCFS', 'P1 P2 P3 P4 P5', H.c('r', '9.6')], ['SJF', 'P2 P4 P3 P5 P1', H.c('g', '3.2')]])}<p>The 10-unit job at the front makes four others wait 10 units each.</p>`,
    brute: { why: `<p>Trying all 5! = 120 orders and picking the best works but is wasteful. A simple exchange argument shows that the shortest-first order is always optimal for average waiting time.</p>` },
    mcq: { q: 'Which change cuts the convoy effect the most?', options: ['Run shortest jobs first or preempt long jobs', 'Add more RAM', 'Make the long job higher priority', 'Switch to a longer FIFO queue'], answer: 0, explain: 'The cause is a long job at the head of a FIFO queue. Shortest-first or preemption stops short jobs from paying for it.' },
    hints: [`<p>Hint 1: With everyone at t=0, WT of a job = sum of bursts of all jobs scheduled before it.</p>`, `<p>Hint 2: Make a cumulative-sum column. FCFS order 10, 1, 2, 1, 5; SJF order 1, 1, 2, 5, 10.</p>`, `<p>Hint 3: Add up the waits and divide by 5: FCFS (0+10+11+13+14)/5, SJF (0+1+2+4+9)/5.</p>`],
    solution: {
      approach: `<p>With all arrivals at 0 the waiting time of the k-th scheduled job is the sum of the bursts before it. FCFS order (10, 1, 2, 1, 5): waits 0, 10, 11, 13, 14 → total 48 → average 9.6. SJF order sorted by burst (P2=1, P4=1, P3=2, P5=5, P1=10): waits 0, 1, 2, 4, 9 → total 16 → average 3.2. The big job P1 is paid for by four other jobs in FCFS; in SJF it is last so nobody pays for it. This is the convoy effect: many short jobs held up behind one long job, hurting average waiting time and keeping I/O devices idle.</p>`,
      dry: { head: ['Order', 'Job (burst)', 'Start = WT', 'CT'], rows: [['FCFS 1', 'P1 (10)', 0, 10], ['FCFS 2', 'P2 (1)', 10, 11], ['FCFS 3', 'P3 (2)', 11, 13], ['FCFS 4', 'P4 (1)', 13, 14], ['FCFS 5', 'P5 (5)', 14, 19], ['SJF 1', 'P2 (1)', 0, 1], ['SJF 2', 'P4 (1)', 1, 2], ['SJF 3', 'P3 (2)', 2, 4], ['SJF 4', 'P5 (5)', 4, 9], ['SJF 5', 'P1 (10)', 9, 19]] },
      complexity: `<p>FCFS O(n log n) for sorting by arrival; SJF O(n log n) with a heap.</p>`,
      followUps: ['Show the answer under Round Robin with q = 1 (avg WT 5.4).', 'How does the answer change if P2 arrives at t = 1?']
    }
  }]
});


topics.push({
  title: 'SJF and SRTF (Shortest Job First, Shortest Remaining Time First)',
  analogy: `<p>At a hospital reception, a nurse who sees a patient with a splinter and a patient who needs a long operation prep will quickly deal with the splinter first: the splinter patient leaves happy in two minutes, and the other barely notices a two-minute delay. That is <b>SJF</b>. If a splinter patient walks in <i>while</i> the nurse is halfway through a 20-minute job, and the nurse pauses to deal with the splinter, that is <b>SRTF</b> (the preemptive version).</p>`,
  explain: `<p><b>SJF (non-preemptive):</b> whenever the CPU is free, pick the ready process with the <b>smallest total burst time</b>. Once started, it runs to completion. <b>SRTF (preemptive SJF):</b> whenever a process arrives, compare its burst with the <i>remaining</i> time of the running process. If the newcomer is shorter, preempt.</p>
  <p>Both give the <b>minimum possible average waiting time</b> (SRTF is optimal among all schedules, SJF among non-preemptive ones). Why? Putting a short job before a long job helps the short job a lot and hurts the long job only a little. Swap any out-of-order pair and the total wait goes down.</p>
  <p><b>Worked example (classic):</b> P1 (AT 0, BT 7), P2 (AT 2, BT 4), P3 (AT 4, BT 1), P4 (AT 5, BT 4).</p>
  ${H.table(['Algorithm', 'Gantt', 'Avg WT', 'Avg TAT'], [
    ['FCFS', 'P1[0–7] P2[7–11] P3[11–12] P4[12–16]', '4.75', '8.75'],
    ['SJF', 'P1[0–7] P3[7–8] P2[8–12] P4[12–16]', '4.00', '8.00'],
    ['SRTF', 'P1[0–2] P2[2–4] P3[4–5] P2[5–7] P4[7–11] P1[11–16]', H.c('g', '3.00'), H.c('g', '7.00')]])}
  <p><b>How to do SRTF by hand (no mistakes):</b> list the time points where something changes (each arrival and each completion). At each point, look at the ready set and compare remaining times. Keep a "remaining" column.</p>
  ${H.table(['t', 'Event', 'Ready (remaining)', 'Run'], [[0, 'P1 arrives', 'P1(7)', 'P1'], [2, 'P2 arrives', 'P1(5), P2(4)', 'P2 (4 &lt; 5)'], [4, 'P3 arrives', 'P1(5), P2(2), P3(1)', 'P3 (1 is smallest)'], [5, 'P3 done, P4 arrives', 'P1(5), P2(2), P4(4)', 'P2'], [7, 'P2 done', 'P1(5), P4(4)', 'P4'], [11, 'P4 done', 'P1(5)', 'P1 till 16']])}
  <p><b>Problems:</b> (1) <b>Starvation</b>: a steady stream of short jobs can postpone a long job forever. (2) <b>You do not know the future.</b> The scheduler cannot know the next CPU burst, so it <i>predicts</i> it with an exponential average: <code>τ(n+1) = α · t(n) + (1 − α) · τ(n)</code>. (3) SRTF causes many context switches. Ties are usually broken by earlier arrival, then lower PID; say so in your answer.</p>`,
  clues: ['"minimum average waiting time" → SJF (non-preemptive) or SRTF (preemptive)', '"shortest remaining time", "preempt when a shorter job arrives" → SRTF', '"how does the OS know the burst length?" → exponential averaging of past bursts', '"long job never runs" → starvation of SJF/SRTF; fix with aging', '"provably optimal" for average WT → SJF/SRTF (exchange argument)', 'Same input asked for both SJF and SRTF → draw non-preemptive first (once started it finishes)'],
  code: [
    { lang: 'cpp', title: 'C++ simulator: FCFS, SJF and Round Robin with Gantt + averages', code: `#include <bits/stdc++.h>
using namespace std;

struct Proc { string name; int at, bt, ct = 0, rem = 0, first = -1; };

// Print Gantt + table + averages. 'line' holds one name per time slot ("-" = idle).
static void report(const string& title, vector<Proc>& ps, const vector<string>& line) {
    cout << "== " << title << " ==\\nGantt: ";
    for (size_t i = 0; i < line.size(); i++) cout << line[i] << (i + 1 < line.size() ? "|" : "\\n");
    double tw = 0, tt = 0, tr = 0;
    cout << "P   AT BT CT TAT WT RT\\n";
    for (auto& p : ps) {
        int tat = p.ct - p.at, wt = tat - p.bt, rt = p.first - p.at;
        tw += wt; tt += tat; tr += rt;
        printf("%-3s %2d %2d %2d %3d %2d %2d\\n", p.name.c_str(), p.at, p.bt, p.ct, tat, wt, rt);
    }
    printf("avg TAT=%.2f avg WT=%.2f avg RT=%.2f\\n\\n", tt / ps.size(), tw / ps.size(), tr / ps.size());
}

// Non-preemptive: FCFS (shortest=false) or SJF (shortest=true).
static void runNonPreemptive(vector<Proc> ps, bool shortest) {
    int n = ps.size(), t = 0, done = 0;
    vector<bool> fin(n, false);
    vector<string> line;
    while (done < n) {
        int best = -1;
        for (int i = 0; i < n; i++) {
            if (fin[i] || ps[i].at > t) continue;                       // not arrived / already done
            if (best == -1) { best = i; continue; }
            // FCFS key = arrival time, SJF key = burst time; ties -> earlier arrival -> lower index
            auto key = [&](int k) { return make_tuple(shortest ? ps[k].bt : ps[k].at, ps[k].at, k); };
            if (key(i) < key(best)) best = i;
        }
        if (best == -1) { line.push_back("-"); t++; continue; }         // CPU idle
        ps[best].first = t;
        for (int k = 0; k < ps[best].bt; k++) line.push_back(ps[best].name);
        t += ps[best].bt; ps[best].ct = t; fin[best] = true; done++;
    }
    report(shortest ? "SJF (non-preemptive)" : "FCFS", ps, line);
}

// Round robin: arrivals during a slice join the queue BEFORE the preempted process.
static void runRR(vector<Proc> ps, int q) {
    int n = ps.size(), t = 0, done = 0, next = 0;
    vector<int> order(n);
    iota(order.begin(), order.end(), 0);
    stable_sort(order.begin(), order.end(), [&](int a, int b) { return ps[a].at < ps[b].at; });
    for (auto& p : ps) p.rem = p.bt;
    deque<int> ready;
    vector<string> line;
    auto admit = [&]() { while (next < n && ps[order[next]].at <= t) ready.push_back(order[next++]); };
    admit();
    while (done < n) {
        if (ready.empty()) { line.push_back("-"); t++; admit(); continue; }
        int i = ready.front(); ready.pop_front();
        if (ps[i].first < 0) ps[i].first = t;
        int run = min(q, ps[i].rem);
        for (int k = 0; k < run; k++) line.push_back(ps[i].name);
        t += run; ps[i].rem -= run;
        admit();                                                        // newcomers first
        if (ps[i].rem == 0) { ps[i].ct = t; done++; }
        else ready.push_back(i);                                        // then the preempted one
    }
    report("Round Robin q=" + to_string(q), ps, line);
}

int main() {
    vector<Proc> ps = {{"P1", 0, 5}, {"P2", 1, 3}, {"P3", 2, 8}, {"P4", 3, 6}};
    runNonPreemptive(ps, false);
    runNonPreemptive(ps, true);
    runRR(ps, 2);
    runRR(ps, 4);
}` },
    { lang: 'python', title: 'Exponential-average burst prediction (alpha = 0.5)', run: true, code: `# tau_next = alpha * last_actual + (1 - alpha) * tau_old
alpha, tau = 0.5, 10.0
actual = [6, 4, 6, 4, 13, 13, 13]
print("pred  actual")
for t in actual:
    print("%5.2f  %3d" % (tau, t))
    tau = alpha * t + (1 - alpha) * tau
print("next prediction: %.2f" % tau)` }
  ],
  viz: [ganttViz('sjf', 'P1:0:7 P2:2:4 P3:4:1 P4:5:4', 'SJF (non-preemptive): once started, a job finishes', false), ganttViz('srtf', 'P1:0:7 P2:2:4 P3:4:1 P4:5:4', 'SRTF (preemptive): a shorter newcomer takes over', false)],
  examples: [
    { title: 'Exponential averaging by hand', html: `<p>α = 0.5, τ<sub>0</sub> = 10, actual bursts 6, 4, 6, 4.</p>${H.table(['n', 'actual t(n)', 'prediction τ(n)', 'next τ(n+1) = 0.5·t + 0.5·τ'], [[0, 6, 10, 8], [1, 4, 8, 6], [2, 6, 6, 6], [3, 4, 6, 5]])}<p>α = 0 ignores history-latest (stuck on τ<sub>0</sub>), α = 1 trusts only the last burst. Most systems use α around 0.5.</p>` },
    { title: 'Same input, SJF vs SRTF', html: `<p>P1 (0, 8), P2 (1, 4), P3 (2, 9), P4 (3, 5). SJF: P1 [0–8], P2 [8–12], P4 [12–17], P3 [17–26] → avg WT 7.75. SRTF: P1[0–1], P2[1–5], P4[5–10], P1[10–17], P3[17–26] → avg WT <b>6.5</b>. P1 gets preempted at t=1 because P2 needs 4 &lt; 7 left.</p>` },
    { title: 'Tie-break matters', html: `<p>If P2 and P3 both have remaining 3, we choose the one that arrived earlier; if still tied, lower PID. Write the rule in your answer; graders accept any consistent rule.</p>` },
    { title: 'Starvation in numbers', html: `<p>A long job P (BT 100) arrives at t=0 together with a source of one new 2-unit job every 2 units. With SRTF there is always a 2-unit job in the ready queue, so P never runs. Throughput is great, the long job's TAT is infinite.</p>` }
  ],
  deepDive: `<p><b>Proof sketch of optimality (exchange argument).</b> Suppose in some schedule a longer job A runs immediately before a shorter job B. Swapping them: B's wait drops by len(A) while A's wait grows by len(B). Since len(B) &lt; len(A), the total wait goes down. Repeat until sorted: shortest-first is optimal. For SRTF the same argument applies to remaining time at each moment.</p>
  <p><b>Prediction in real kernels.</b> Pure SJF is impossible without knowing the future, so real systems learn: exponential averaging (above), or they use proxies. Linux CFS has no burst predictor; sleeping tasks get naturally small vruntime and so run soon, giving the "I/O-bound tasks look like short jobs" effect. Batch schedulers for clusters (Slurm) ask users for a <i>time limit</i> and use it as the burst estimate (with backfill).</p>
  <p><b>Overhead of SRTF.</b> Every arrival triggers a comparison and maybe a context switch. With a heap/priority queue keyed by remaining time, the cost per decision is O(log n). Beware: the key of the running process changes every tick; store it separately and compare at arrival, not every tick.</p>
  <p><b>Response vs waiting.</b> SRTF gives excellent average waiting and response for short jobs, but a long job has awful response. For interactive use we need bounded response for <i>everyone</i>, which pushes us to round robin.</p>
  <p><b>Real-world analogs.</b> "Shortest processing time" first is how checkout "express lanes" work, how query planners prioritise cheap queries, and how many load balancers favour requests with a small known size (SRPT is optimal for mean response time in queueing theory; the unfairness to large jobs is less severe than expected, which is the famous "SRPT is not unfair" result).</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM inference is a predictable-ish workload: the prompt length is known, the output length can be <i>predicted</i> by a small model. Research systems (for example length-prediction schedulers for LLM serving) apply <b>shortest-predicted-job-first</b> across requests to cut average latency, and need aging to avoid starving long generations. This is SJF with a learned τ replacing exponential averaging.</p>
  <p><b>Use AI as a partner:</b> ask it to generate adversarial inputs for your SRTF code: simultaneous arrivals, equal remaining times, an arrival exactly when a job finishes. Ask it to write a brute-force "all permutations" checker for SJF and compare.</p>
  <p><b>Where AI goes wrong:</b> mixing up SJF with SRTF on the same example, forgetting that SJF only chooses at completion points, and using <i>burst</i> instead of <i>remaining</i> time when comparing in SRTF. It also likes to claim SJF has "no starvation".</p>
  <p><b>What you must still own:</b> state the assumption that burst times are known, name the starvation problem and the aging fix, and be able to reproduce a preemptive table without a tool.</p>`,
  problems: [{
    title: 'SRTF Gantt Chart and Averages',
    level: 'Medium', tags: ['SRTF', 'SJF', 'gantt'], companies: ['Amazon', 'Microsoft', 'Cisco'],
    statement: `<p>Processes: P1 (AT 0, BT 7), P2 (AT 2, BT 4), P3 (AT 4, BT 1), P4 (AT 5, BT 4). Using <b>SRTF</b>, find the Gantt chart, each CT, TAT, WT, RT and the averages. Compare average WT with non-preemptive SJF.</p>`,
    constraints: `Integer times. Ties: smaller remaining time, then earlier arrival, then lower PID. A context switch costs 0.`,
    example: `${H.arr(['P1', 'P1', 'P2', 'P2', 'P3', 'P2', 'P2', 'P4', 'P4', 'P4', 'P4', 'P1', 'P1', 'P1', 'P1', 'P1'], { label: 'SRTF Gantt (slot k = k → k+1)', idx: true })}<p>Avg WT = <b>3.00</b>, avg TAT = <b>7.00</b>, avg RT = <b>0.5</b>. SJF would give avg WT 4.00.</p>`,
    brute: { why: `<p>Simulating every integer tick from 0 to 16 and scanning all processes works, but is easy to get wrong when done mentally. Better: only re-decide at events (arrivals and completions) and keep a remaining-time column.</p>` },
    mcq: { q: 'At t=4, P2 has 2 units left and P3 (burst 1) arrives. SRTF does what?', options: ['Preempts P2 and runs P3', 'Lets P2 finish first', 'Runs P1', 'Round robins P2 and P3'], answer: 0, explain: 'Remaining 1 &lt; remaining 2, so the newcomer is shorter and preempts.' },
    hints: [`<p>Hint 1: Only decisions at arrivals (2, 4, 5) and completions matter. List events in order.</p>`, `<p>Hint 2: At each event compare remaining times of all ready processes including the one running.</p>`, `<p>Hint 3: Gantt: P1 0–2, P2 2–4, P3 4–5, P2 5–7, P4 7–11, P1 11–16. Then CT = 16, 7, 5, 11; TAT = CT − AT; WT = TAT − BT.</p>`],
    solution: {
      approach: `<p>Walk through the events. t=0 only P1 → run. t=2 P2 arrives with 4, P1 has 5 left → preempt, run P2. t=4 P3 arrives with 1, P2 has 2 left → run P3. t=5 P3 done, P4 arrives (4), P2 has 2 → P2 resumes. t=7 P2 done; P4 (4) vs P1 (5) → P4. t=11 P4 done → P1 finishes at 16. CT: P1 16, P2 7, P3 5, P4 11. TAT = 16, 5, 1, 6 (avg 7.0). WT = 9, 1, 0, 2 (avg 3.0). RT = 0, 0, 0, 2 (avg 0.5). The non-preemptive SJF gives avg WT 4.0, so preemption bought a full unit of average waiting at the cost of two extra switches.</p>`,
      dry: { head: ['t', 'Event', 'Remaining of ready jobs', 'Runs next'], rows: [[0, 'P1 arrives', 'P1=7', 'P1'], [2, 'P2 arrives', 'P1=5, P2=4', 'P2'], [4, 'P3 arrives', 'P1=5, P2=2, P3=1', 'P3'], [5, 'P3 done, P4 arrives', 'P1=5, P2=2, P4=4', 'P2'], [7, 'P2 done', 'P1=5, P4=4', 'P4'], [11, 'P4 done', 'P1=5', 'P1'], [16, 'P1 done', '—', 'idle']] },
      complexity: `<p>With a min-heap on remaining time: O(n log n) overall; by-hand it is O(events × n).</p>`,
      followUps: ['Add a 0.5 unit context switch cost and recompute the average TAT.', 'How would you prevent starvation of P1?']
    }
  }]
});


topics.push({
  title: 'Priority Scheduling, Starvation and Aging',
  analogy: `<p>An airport check-in has a <b>business class</b> lane and an <b>economy</b> lane. Business passengers always go first. If business travellers keep arriving every minute, the economy line never moves: <b>starvation</b>. The airline's fix: "anyone who has waited more than an hour gets upgraded to the fast lane". That upgrade-by-waiting is <b>aging</b>.</p>`,
  explain: `<p>Every process gets a <b>priority number</b>; the scheduler runs the most important one. <b>Convention matters:</b> in most textbooks and in Linux, a <i>lower number = higher priority</i> (nice -20 beats nice 19). Always state it in your answer, because some exam questions flip it.</p>
  <p>Two flavours, same as SJF/SRTF:</p>
  ${H.table(['Type', 'When does it re-decide?', 'Example behaviour'], [['Non-preemptive priority', 'only when the CPU is free', 'a new high-priority job waits for the running one to finish'], ['Preemptive priority', 'also whenever a higher-priority job arrives', 'the running job is kicked out immediately']])}
  <p><b>Worked example</b> (lower number = better): P1 (AT 0, BT 5, pr 3), P2 (1, 3, pr 1), P3 (2, 8, pr 4), P4 (3, 6, pr 2).</p>
  ${H.table(['Variant', 'Gantt', 'Avg WT', 'Avg TAT'], [['Non-preemptive', 'P1[0–5] P2[5–8] P4[8–14] P3[14–22]', '5.25', '10.75'], ['Preemptive', 'P1[0–1] P2[1–4] P4[4–10] P1[10–14] P3[14–22]', '5.50', '11.00']])}
  <p>Priority is the <i>general</i> idea: SJF is priority scheduling where priority = predicted burst length. FCFS is priority = arrival time. Round robin with equal priorities is the fair special case.</p>
  <p><b>Where do priorities come from?</b> Internal (the OS computes them: burst length, memory use, I/O ratio) or external (user sets them: nice values, importance of the job, how much was paid for the compute). Real-time tasks get fixed high priorities.</p>
  <p><b>The danger: starvation (indefinite blocking).</b> A low-priority process may wait forever if high-priority work keeps coming. Legend says when MIT shut down their IBM 7094 in 1973 they found a low-priority job submitted in 1967 that had never run.</p>
  <p><b>The cure: aging.</b> Slowly improve the priority of anything that waits. Example rule: every 10 ticks in the ready queue lowers the number by 1. A priority-127 job gets to priority 0 after 1270 ticks at the very worst, so it is guaranteed to run eventually. When it finally runs, reset its priority.</p>
  <p><b>Priority inversion (a sneaky cousin).</b> A low-priority task L holds a lock; a high-priority H needs it and blocks; a medium M preempts L, so H waits for M, which has nothing to do with it. Fix: <b>priority inheritance</b> (L temporarily inherits H's priority). This famously hit the Mars Pathfinder in 1997.</p>`,
  clues: ['"priority number" + "lower is higher priority" (read the convention!)', '"low priority process never gets CPU" → starvation, answer: aging', '"priority increases the longer it waits" → aging', '"high-priority task blocked by low-priority task holding a lock" → priority inversion, priority inheritance', '"Mars Pathfinder" → priority inversion', '"preemptive priority" → compare at every arrival; "non-preemptive" → only at completion'],
  code: [{ lang: 'python', title: 'Priority scheduling with aging: watch a low-priority job escape starvation', run: true, code: `# lower number = more important. Aging: every AGE ticks of waiting, priority number drops by 1.
AGE = 4
jobs = {"low": {"pr": 8, "need": 3, "wait": 0, "run": 0},
        "hi1": {"pr": 1, "need": 6, "wait": 0, "run": 0},
        "hi2": {"pr": 2, "need": 6, "wait": 0, "run": 0}}
timeline = []
t = 0
while any(j["run"] < j["need"] for j in jobs.values()):
    ready = [n for n, j in jobs.items() if j["run"] < j["need"]]
    eff = {n: jobs[n]["pr"] - jobs[n]["wait"] // AGE for n in ready}   # effective priority
    pick = min(ready, key=lambda n: (eff[n], n))
    for n in ready:
        if n != pick:
            jobs[n]["wait"] += 1          # waiting: ages
    jobs[pick]["wait"] = 0                # just ran: aging counter resets
    jobs[pick]["run"] += 1
    timeline.append(pick)
    t += 1
print("order:", " ".join(timeline))
first_low = timeline.index("low")
print("low-priority job first ran at t =", first_low, "(without aging it would run at t = 12)")` }],
  viz: [ganttViz('prio_p', 'P1:0:5:3 P2:1:3:1 P3:2:8:4 P4:3:6:2', 'Preemptive priority (lower number wins)', true), ganttViz('prio', 'P1:0:5:3 P2:1:3:1 P3:2:8:4 P4:3:6:2', 'Non-preemptive priority (same jobs)', true), ganttViz('prio_p', 'P1:0:5:3 P2:1:3:1 P3:2:8:4 P4:3:6:2 age=3', 'Preemptive priority with aging (age=3: one level better per 3 ticks waiting)', true)],
  examples: [
    { title: 'Convention check: higher number = higher priority?', html: `<p>If a question says "higher number means higher priority", just flip the comparison. Always write the convention above your table. Same example with P2 pr=1 meaning <i>lowest</i>: the order becomes P3 (4), P1 (3), P4 (2), P2 (1).</p>` },
    { title: 'Aging by hand', html: `<p>Rule: effective priority = base − floor(waited / 3). A job with base 5 that has waited 6 ticks has effective 5 − 2 = 3. A job with base 4 that just ran (waited 0) has 4. So the waiting job (3) now beats it (4). That is how a starving job overtakes fresh arrivals.</p>${H.table(['waited', 0, 3, 6, 9, 12], [['effective (base 5)', 5, 4, 3, 2, 1]])}` },
    { title: 'Priority inversion timeline', html: `<p>t=0 L takes lock. t=1 H arrives, needs lock → blocks. t=2 M arrives, preempts L (M &gt; L). H waits for M, which can run for a long time. With <b>priority inheritance</b> L runs at H's priority, finishes the critical section, releases the lock, and H runs; M runs last.</p>` },
    { title: 'Preemptive vs non-preemptive on the same table', html: `<p>A (0, 4, pr 5), B (1, 3, pr 2), C (2, 2, pr 4), D (3, 5, pr 1). Non-preemptive: A[0–4] D[4–9] B[9–12] C[12–14], avg WT 4.75. Preemptive: A[0–1] B[1–3] D[3–8] B[8–9] C[9–11] A[11–14] gives avg WT 5.5. Preemption helps the high-priority jobs, not the average.</p>` }
  ],
  deepDive: `<p><b>Aging is a bound, not a magic fix.</b> If aging is too slow, the system effectively behaves like strict priority for a long time; too fast and priorities become meaningless (everything converges). Tune it to the longest delay you are willing to accept for the lowest class.</p>
  <p><b>Linux in practice.</b> Normal tasks use nice (-20…19, mapped to weights, see the CFS topic). Real-time tasks (SCHED_FIFO/RR) have static priorities 1–99 and <i>do</i> starve normal tasks, so the kernel keeps a safety valve: RT throttling by default reserves 5% of each second for normal work (<code>sched_rt_runtime_us</code> = 950000 out of 1000000).</p>
  <p><b>Windows</b> uses 32 priority levels (0–31): 16–31 real-time, 1–15 dynamic. It temporarily <b>boosts</b> a thread's priority after I/O completes or when a GUI window gets focus, and decays the boost over time. That is aging plus an interactivity bonus.</p>
  <p><b>Priority inheritance vs priority ceiling.</b> Inheritance raises the lock holder only when a higher task is actually blocked. Ceiling protocol raises the holder to the highest priority of any task that could ever take that lock, which also prevents deadlock in some designs. POSIX offers both for mutexes (<code>PTHREAD_PRIO_INHERIT</code>, <code>PTHREAD_PRIO_PROTECT</code>).</p>
  <p><b>Fairness trade-offs.</b> Priority is deliberate unfairness. Cloud providers monetize it (spot vs on-demand, preemptible VMs): low-priority instances can be evicted at any time, which is preemptive priority at datacenter scale.</p>`,
  aiEra: `<p><b>What AI changes:</b> Kubernetes <code>PriorityClass</code> decides which pods get evicted or preempted when the GPU cluster is full; training jobs usually run at low priority and are checkpointed so they can be preempted by inference traffic. Request-level priority is also used in LLM serving: paying or latency-critical requests jump the queue. Without aging, free-tier requests starve under load, exactly the textbook story.</p>
  <p><b>Use AI as a partner:</b> ask it to design an aging policy for a job queue with three classes and compute the worst-case wait. Then check by simulation.</p>
  <p><b>Where AI goes wrong:</b> it mixes up the priority direction, forgets that preemptive priority also needs a tie-break between equal priorities (usually FIFO or round robin inside the level), and says "aging prevents priority inversion" (it does not; inheritance does).</p>
  <p><b>What you must still own:</b> naming the three different problems: starvation (aging), priority inversion (inheritance), and unbounded real-time monopoly (throttling/budgets).</p>`,
  problems: [{
    title: 'Preemptive Priority Gantt Chart',
    level: 'Medium', tags: ['priority', 'preemptive', 'gantt'], companies: ['Infosys', 'Wipro', 'Amazon'],
    statement: `<p>P1 (AT 0, BT 5, pr 3), P2 (AT 1, BT 3, pr 1), P3 (AT 2, BT 8, pr 4), P4 (AT 3, BT 6, pr 2). Lower number = higher priority. Draw the Gantt chart for <b>preemptive</b> priority scheduling and compute the average WT and TAT. Which process risks starvation?</p>`,
    constraints: `Whole numbers; ties by earlier arrival.`,
    example: `<p>Gantt: ${H.c('g', 'P1[0–1]')} ${H.c('b', 'P2[1–4]')} ${H.c('y', 'P4[4–10]')} ${H.c('g', 'P1[10–14]')} ${H.c('p', 'P3[14–22]')}. Average WT <b>5.5</b>, TAT <b>11.0</b>. P3 (lowest priority) waits the longest.</p>`,
    brute: { why: `<p>Running each priority class to completion as soon as it appears is wrong for the preemptive version: a more important arrival must take the CPU right away. Another typical mistake is treating a preempted process as "new" and restarting its burst.</p>` },
    mcq: { q: 'At t=1, P2 (pr 1) arrives while P1 (pr 3) runs. Preemptive priority will…', options: ['Switch to P2 immediately', 'Finish P1 first', 'Run P3', 'Idle'], answer: 0, explain: 'A lower number means higher priority, so P2 preempts P1 which still has 4 units left.' },
    hints: [`<p>Hint 1: Re-decide at every arrival and completion. Keep a "remaining" column.</p>`, `<p>Hint 2: Events: t=1 P2 arrives (pr 1 &lt; 3, preempt), t=3 P4 arrives (pr 2 vs P2 pr 1: no), t=4 P2 done: ready P1 (3), P3 (4), P4 (2) → P4.</p>`, `<p>Hint 3: After P4 finishes at 10, P1 (3) beats P3 (4). P3 runs last 14–22. Then WT = TAT − BT.</p>`],
    solution: {
      approach: `<p>Event-driven walk: t=0 only P1 runs. t=1 P2 (pr 1) preempts P1 (4 left). t=3 P4 (pr 2) arrives but P2 (pr 1) still better, continues. t=4 P2 finishes. Ready: P1 pr3, P3 pr4, P4 pr2 → P4 runs 4–10. At t=10 ready: P1 (rem 4, pr 3), P3 (pr 4) → P1 runs 10–14. P3 runs 14–22. CT: P1 14, P2 4, P3 22, P4 10. TAT: 14, 3, 20, 7 → avg 11.0. WT: 9, 0, 12, 1 → avg 5.5. P3 is the starvation candidate: if more important jobs kept arriving it would never run; aging fixes that.</p>`,
      dry: { head: ['t', 'Event', 'Ready (pr, remaining)', 'Runs'], rows: [[0, 'P1 arrives', 'P1(3,5)', 'P1'], [1, 'P2 arrives', 'P1(3,4) P2(1,3)', 'P2 preempts P1'], [3, 'P4 arrives', 'P1(3,4) P2(1,1) P3(4,8) P4(2,6)', 'P2 continues'], [4, 'P2 done', 'P1(3,4) P3(4,8) P4(2,6)', 'P4'], [10, 'P4 done', 'P1(3,4) P3(4,8)', 'P1'], [14, 'P1 done', 'P3(4,8)', 'P3'], [22, 'P3 done', '—', '—']] },
      complexity: `<p>O(n log n) with a priority queue keyed by (priority, arrival).</p>`,
      followUps: ['Re-do with aging: every 3 ticks of waiting improves priority by 1.', 'Re-do non-preemptively (avg WT 5.25).']
    }
  }]
});


topics.push({
  title: 'Round Robin and Choosing the Time Quantum',
  analogy: `<p>Four kids share one video-game controller. The rule: <b>each gets 2 minutes, then passes it to the next kid in the circle</b>, and a kid who is not finished goes to the back of the circle. Nobody waits longer than 6 minutes for their next turn (everyone is served quickly), but there is a lot of passing of the controller. If each turn were only 5 seconds, the kids would spend more time passing than playing. If each turn were 1 hour, it is just "first come, first served" again.</p>`,
  explain: `<p><b>Round Robin (RR)</b> is FCFS plus a timer. The ready queue is a FIFO. The process at the front runs for at most one <b>time quantum q</b> (also called time slice). Then:</p>
  <ul><li>if it finishes earlier, fine, the next one starts immediately;</li><li>if the quantum ends first, a timer interrupt <b>preempts</b> it and it goes to the <b>back</b> of the queue.</li></ul>
  <p>With n processes, nobody waits more than <b>(n − 1) × q</b> before getting the CPU again. That promise is why RR is the base of every interactive system.</p>
  <p><b>Convention for ties (say it out loud):</b> if a new process arrives at the exact moment a quantum expires, the <b>newcomer goes into the queue first</b>, then the preempted process. Different textbooks differ; choose one and be consistent.</p>
  <p><b>Same jobs, two quanta</b> (P1 AT0 BT5, P2 AT1 BT3, P3 AT2 BT8, P4 AT3 BT6):</p>
  ${H.table(['q', 'Gantt', 'Avg WT', 'Avg TAT', 'Avg RT'], [['2', 'P1 P1 | P2 P2 | P3 P3 | P1 P1 | P4 P4 | P2 | P3 P3 | P1 | P4 P4 | P3 P3 | P4 P4 | P3 P3', '9.75', '15.25', '2.00'], ['4', 'P1×4 | P2×3 | P3×4 | P4×4 | P1 | P3×4 | P4×2', '9.25', '14.75', '4.00']])}
  <p><b>Choosing q:</b></p>
  ${H.table(['q is…', 'Behaviour', 'Problem'], [['huge (≥ longest burst)', 'degenerates to FCFS', 'convoy effect, poor response'], ['tiny (≈ switch cost)', 'looks like perfect processor sharing', 'most time wasted switching'], ['just right (10–100 ms typical)', 'about 80% of CPU bursts finish within one quantum', 'a small switch overhead, good response']])}
  <p><b>Overhead rule:</b> if a switch costs s and the quantum is q, the fraction of CPU wasted ≈ s / (q + s). With s = 0.1 ms: q = 10 ms → 1%, q = 1 ms → 9%, q = 0.1 ms → 50%.</p>
  <p><b>RR vs SJF:</b> RR has worse average turnaround and waiting (everyone is stretched out), but much better <b>response time</b> and no starvation. The run-it-yourself sweep below shows average response rising with q while switches fall.</p>`,
  clues: ['"time quantum", "time slice", "timer interrupt" → Round Robin', '"best response time for interactive users" → RR with a small quantum', '"if q is very large it behaves like…" → FCFS', '"if q → 0 it behaves like…" → processor sharing (but switch overhead dominates)', '"context switch time 1 ms, quantum 4 ms" → overhead = 1 / (4 + 1) = 20%', '"newly arrived process and preempted process at the same time" → state your tie rule (newcomer first)'],
  code: [
    { lang: 'python', title: 'Runnable: sweep the quantum and watch response time, waiting time and switches', run: true, code: `# Round robin quantum sweep: how do q and the switch cost change the averages?
from collections import deque

JOBS = [("P1", 0, 5), ("P2", 1, 3), ("P3", 2, 8), ("P4", 3, 6)]

def rr(jobs, q):
    rem = {n: b for n, a, b in jobs}
    arr = {n: a for n, a, b in jobs}
    first, fin = {}, {}
    pending = sorted(jobs, key=lambda j: j[1])
    queue, t, switches, last = deque(), 0, 0, None
    def admit():
        while pending and pending[0][1] <= t:
            queue.append(pending.pop(0)[0])
    admit()
    while len(fin) < len(jobs):
        if not queue:
            t += 1; admit(); continue
        n = queue.popleft()
        if last is not None and last != n:
            switches += 1
        last = n
        first.setdefault(n, t)
        run = min(q, rem[n])
        t += run; rem[n] -= run
        admit()                       # newcomers queue before the preempted job
        if rem[n] == 0: fin[n] = t
        else: queue.append(n)
    wt = sum(fin[n] - arr[n] - b for n, a, b in jobs) / len(jobs)
    rt = sum(first[n] - arr[n] for n, a, b in jobs) / len(jobs)
    return wt, rt, switches, t

print("q   avgWT  avgRT  switches")
for q in range(1, 9):
    wt, rt, sw, end = rr(JOBS, q)
    print("%d  %6.2f %6.2f  %d" % (q, wt, rt, sw))
SWITCH = 1  # pretend one switch costs 1 time unit
for q in (1, 2, 4, 8):
    wt, rt, sw, end = rr(JOBS, q)
    print("q=%d: %d switches * cost %d = %d wasted units (%.0f%% of %d useful)" % (q, sw, SWITCH, sw * SWITCH, 100.0 * sw * SWITCH / 22, 22))` },
    `// Round robin core loop (idea): the queue always holds ready processes.
// while (!ready.empty()) {
//     int i = ready.front(); ready.pop_front();
//     int run = min(q, rem[i]);
//     advance clock by run; rem[i] -= run;
//     admit newly arrived processes into 'ready';   // newcomers first
//     if (rem[i] > 0) ready.push_back(i);           // then the preempted job
// }`
  ],
  codeTitle: ['Quantum sweep (Python)', 'Core loop (C++ idea, full version in the SJF topic)'],
  viz: [ganttViz('rr', 'P1:0:5 P2:1:3 P3:2:8 P4:3:6 q=2', 'Round Robin q=2: quantum expiry and requeue, tick by tick', false), ganttViz('rr', 'P1:0:5 P2:1:3 P3:2:8 P4:3:6 q=4', 'Round Robin q=4 (edit q= to try other values)', false)],
  examples: [
    { title: 'The classic (24, 3, 3) with q = 4', html: `<p>All arrive at 0. Gantt: P1[0–4] P2[4–7] P3[7–10] P1[10–14] … P1[26–30]. WT: P1 = 30 − 24 = 6, P2 = 4, P3 = 7 → average <b>5.67</b> (vs 17 under FCFS). The two short jobs finish at 7 and 10, instead of waiting for the long one.</p>${H.arr(['P1', 'P2', 'P3', 'P1', 'P1', 'P1', 'P1', 'P1'], { label: 'RR q=4 (P1 appears 6 times in all, compressed)', hl: { 1: 'b', 2: 'p' } })}` },
    { title: 'Waiting-time bound', html: `<p>8 processes, q = 50 ms: a process waits at most 7 × 50 = <b>350 ms</b> between turns. With a 0.1 ms switch between turns it is 7 × 50.1 ≈ 351 ms. Increase users to 100 and the bound jumps to 4.95 s, which is why time-shared systems go sluggish under heavy load.</p>` },
    { title: 'Switch overhead table', html: `${H.table(['q (ms)', 'switch (ms)', 'wasted'], [[100, 1, '0.99%'], [10, 1, '9.1%'], [2, 1, '33%'], [1, 1, '50%']])}<p>wasted = s / (q + s).</p>` },
    { title: 'RR with I/O-bound plus CPU-bound jobs', html: `<p>An I/O-bound job often uses far less than q before blocking, so it hands the CPU back voluntarily and is not charged a full turn. CPU-bound jobs always burn the whole q. RR therefore treats an interactive job (short bursts) worse than it should be: it waits behind many CPU-bound jobs each time it wakes up. This is the weakness that MLFQ and CFS fix.</p>` }
  ],
  deepDive: `<p><b>Why queue order at ties matters.</b> In RR the position in the queue determines the future. Putting the preempted process <i>before</i> a newly arrived one gives a different Gantt chart (and different averages) than the other way around. Exams typically say "assume newly arrived goes first"; if not stated, write your assumption.</p>
  <p><b>Choosing q in real kernels.</b> Old Unix used 100 ms; Linux 2.4 about 60 ms by default (nice-dependent); Windows desktop 20–120 ms depending on foreground boost; modern CFS uses a dynamic slice (sched_latency 6 ms × (1 + log2 CPUs) split among runnable tasks, with a minimum granularity of about 0.75 ms × factor), so the slice shrinks as more tasks compete. Ask in an interview: "is the quantum fixed or derived from the number of runnable tasks?"</p>
  <p><b>Cache effects.</b> A tiny quantum means the working set (L1/L2 lines, TLB entries) never warms up, so the real cost of a switch is not only register saving (~1–2 µs) but also the cold-cache misses that follow (tens of µs). Hence the 10–100× rule between switch cost and quantum.</p>
  <p><b>Fairness & variants.</b> Plain RR is fair per process, not per user: a user with 10 processes gets 10 shares. Fair-share scheduling and cgroups fix that. Weighted RR gives some processes a bigger q (Linux CFS generalizes this to weights). Virtual RR gives processes returning from I/O a priority queue so they are not penalised.</p>
  <p><b>Same idea elsewhere.</b> Network routers use RR/deficit RR between flows; Go's goroutine scheduler preempts after 10 ms (sysmon); async runtimes use "cooperative budgets" so one task cannot monopolise a thread. Whenever you see "yield after N units", it is RR.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM serving schedulers apply the RR idea at the <i>token</i> level: each decoding iteration is a tiny quantum, every active request gets one token per step (continuous batching), so no long generation can block short ones. Chunked prefill splits a huge prompt into chunks so decode steps are not starved: a quantum for prompt processing. Multi-tenant GPU time-slicing (MPS, MIG, time-sliced sharing) uses RR-like policies between containers.</p>
  <p><b>Use AI as a partner:</b> have it produce RR tables for q = 1…5 on a fixed input and compare with your own run of the sweep. Ask "what is the mean response time for q = 3?" and verify numerically.</p>
  <p><b>Where AI goes wrong:</b> inconsistent tie-handling between steps of the same answer, forgetting to requeue the preempted process at the back, treating remaining time as the original burst, and confusing "waiting time" with "time until the next turn". It also claims smaller q always means better: only response time improves.</p>
  <p><b>What you must still own:</b> a one-line quantum-choice argument (switch cost vs response time vs burst distribution) and your tie-break rule.</p>`,
  problems: [{
    title: 'Round Robin with Staggered Arrivals (q = 2)',
    level: 'Medium', tags: ['round robin', 'quantum', 'gantt'], companies: ['Microsoft', 'Amazon', 'Qualcomm'],
    statement: `<p>Processes: P1 (AT 0, BT 5), P2 (AT 2, BT 3), P3 (AT 3, BT 1), P4 (AT 4, BT 2), P5 (AT 6, BT 4). Use Round Robin with q = 2. Newly arrived processes join the queue <b>before</b> a process whose quantum just expired. Find the Gantt chart, CT, TAT, WT, RT and averages.</p>`,
    constraints: `Whole numbers; zero switch cost.`,
    example: `${H.arr(['P1', 'P1', 'P2', 'P2', 'P1', 'P1', 'P3', 'P4', 'P4', 'P2', 'P5', 'P5', 'P1', 'P5', 'P5'], { label: 'Gantt q=2', idx: true })}<p>Avg WT <b>4.8</b>, avg TAT <b>7.8</b>, avg RT <b>2.0</b>.</p>`,
    brute: { why: `<p>Resetting every process to "fresh" after each quantum or ordering the queue by arrival time every round gives a wrong chart. The queue order is a result of history, not sortable by a key. Track the queue explicitly.</p>` },
    mcq: { q: 'At t=2, P1\'s quantum ends exactly as P2 arrives. With "newcomer first", the queue is…', options: ['P2, P1', 'P1, P2', 'P2 only', 'Empty'], answer: 0, explain: 'The newcomer P2 enters first, then the preempted P1 goes behind it.' },
    hints: [`<p>Hint 1: Keep an explicit queue after each slice. Write it down every time.</p>`, `<p>Hint 2: Slice length = min(q, remaining). A job with 1 unit left uses only 1 unit and leaves.</p>`, `<p>Hint 3: Queue snapshots: t=2 [P2,P1]; t=4 [P1,P3,P4,P2]; t=6 [P3,P4,P2,P5,P1]; follow the dry-run table.</p>`],
    solution: {
      approach: `<p>Simulate with an explicit queue and "arrivals first, then requeue". t=0–2 P1 (3 left); P2 arrives at 2 so queue [P2, P1]. t=2–4 P2 (1 left); P3 (3) and P4 (4) arrived so queue [P1, P3, P4, P2]. t=4–6 P1 (1 left); P5 arrives at 6: [P3, P4, P2, P5, P1]. P3 runs 6–7 and finishes. P4 7–9 finishes. P2 9–10 finishes. P5 10–12 (2 left) → [P1, P5]. P1 12–13 finishes. P5 13–15 finishes. CT = P1 13, P2 10, P3 7, P4 9, P5 15. TAT = 13, 8, 4, 5, 9 (avg 7.8). WT = 8, 5, 3, 3, 5 (avg 4.8). RT = 0, 0, 3, 3, 4 (avg 2.0).</p>`,
      dry: { head: ['Slice', 'Runs (from→to)', 'Left after', 'Queue after (front → back)'], rows: [['1', 'P1 0→2', 'P1=3', 'P2, P1'], ['2', 'P2 2→4', 'P2=1', 'P1, P3, P4, P2'], ['3', 'P1 4→6', 'P1=1', 'P3, P4, P2, P5, P1'], ['4', 'P3 6→7', 'done', 'P4, P2, P5, P1'], ['5', 'P4 7→9', 'done', 'P2, P5, P1'], ['6', 'P2 9→10', 'done', 'P5, P1'], ['7', 'P5 10→12', 'P5=2', 'P1, P5'], ['8', 'P1 12→13', 'done', 'P5'], ['9', 'P5 13→15', 'done', '—']] },
      complexity: `<p>O(total burst / q) slices, each O(1) with a deque.</p>`,
      followUps: ['Redo with q = 4 (avg WT 4.2, avg RT 3.0).', 'What q would minimise switches without exceeding an RT of 3?']
    }
  }]
});


topics.push({
  title: 'Multilevel Queue and Multilevel Feedback Queue (MLQ, MLFQ)',
  analogy: `<p>A hospital has separate waiting rooms: <b>emergency</b>, <b>appointments</b>, <b>routine check-ups</b>. Emergency patients are always seen first (<b>multilevel queue</b>), and each room has its own rules. Now add one more rule: a patient who turns out to need a long, heavy procedure is moved to a lower-priority room so quick cases do not wait behind them, and a patient who has waited too long in the lower room is moved up. Patients move between rooms based on how they behave: that is the <b>feedback</b> in MLFQ.</p>`,
  explain: `<p><b>Multilevel Queue (MLQ).</b> Split the ready queue into several queues by <i>type of process</i>, each with its own algorithm. Every process is permanently assigned to one queue.</p>
  ${H.table(['Queue', 'Who lives here', 'Its algorithm'], [['1 (highest)', 'system / kernel processes', 'priority or FCFS'], ['2', 'interactive (editor, shell)', 'round robin, q = 8 ms'], ['3', 'batch / background', 'FCFS']])}
  <p>Between the queues there are two common policies: <b>fixed priority</b> (serve queue 1 until empty, then 2, then 3; batch can starve) or <b>time-slice between queues</b> (for example 80% CPU to interactive, 20% to batch).</p>
  <p><b>Weakness:</b> a process cannot move, so it is inflexible. You must know in advance whether a job is interactive or batch.</p>
  <p><b>Multilevel Feedback Queue (MLFQ)</b> fixes that by letting processes <b>move between queues based on observed behaviour</b>. Typical textbook rules (3 queues, quanta 2/4/8):</p>
  <ol><li>Every new process enters the <b>top queue Q0</b>.</li>
  <li>The scheduler always runs a job from the <b>highest non-empty queue</b>. Inside a queue it is round robin with that queue's quantum.</li>
  <li>If a job uses its <b>entire quantum</b>, it looks CPU-hungry → <b>demote</b> it one level (lower queues have longer quanta, fewer switches).</li>
  <li>If it gives up the CPU before the quantum ends (I/O), it keeps its level: it looks interactive.</li>
  <li>A higher-queue arrival preempts a lower-queue job.</li>
  <li>Periodically <b>boost</b> every job to the top queue (stops starvation, and lets a job whose behaviour changed be re-classified).</li></ol>
  <p><b>What this achieves without knowing burst lengths:</b> short and interactive jobs finish in the top queues (like SJF), long CPU-bound jobs sink to the bottom (get long, efficient slices), and nobody starves thanks to the boost. It approximates SRTF using only <i>past behaviour</i>.</p>
  ${H.table(['Job', 'Burst', 'What happens'], [['short', '2', 'finishes in Q0 within its first quantum'], ['medium', '6', 'uses Q0 (2), Q1 (4) → done'], ['long', '30', 'sinks to Q2 and gets long 8-tick turns']])}
  <p><b>Parameters to tune:</b> number of queues, quantum per level, when to demote, boost period, and whether a quantum counts per turn or as a total allotment per level.</p>`,
  clues: ['"processes move between queues" → MLFQ; "permanently assigned" → MLQ', '"approximates SJF without knowing burst time" → MLFQ', '"CPU-bound jobs sink, I/O-bound stay on top"', '"gaming the scheduler" (yield just before quantum ends) → count total CPU used per level (allotment)', '"starvation in MLFQ" → periodic priority boost', '"different algorithm per queue", "foreground/background" → MLQ'],
  code: [{ lang: 'python', title: 'Runnable MLFQ (3 levels, quanta 2/4/8, boost) + starvation demo', run: true, code: `# Multilevel feedback queue: 3 levels, quanta 2/4/8, optional priority boost.
from collections import deque

QUANTA = [2, 4, 8]

def mlfq(jobs, boost=0):
    # jobs: list of (name, arrival, burst)
    rem = {n: b for n, a, b in jobs}
    level = {n: 0 for n, a, b in jobs}
    queues = [deque(), deque(), deque()]
    pending = sorted(jobs, key=lambda j: j[1])
    done, line, t, cur, used = {}, [], 0, None, 0
    while len(done) < len(jobs):
        while pending and pending[0][1] <= t:           # new jobs always enter the top queue
            queues[0].append(pending.pop(0)[0])
        if boost and t > 0 and t % boost == 0:          # anti-starvation boost
            everyone = ([cur] if cur else []) + [n for q in queues for n in q]
            queues = [deque(everyone), deque(), deque()]
            for n in everyone: level[n] = 0
            cur = None
        if cur and any(queues[l] for l in range(level[cur])):   # a higher queue has work: preempt
            queues[level[cur]].append(cur); cur = None
        if cur is None:
            for l in range(3):
                if queues[l]:
                    cur, used = queues[l].popleft(), 0
                    break
        if cur is None:
            line.append("-"); t += 1; continue
        line.append(cur); rem[cur] -= 1; used += 1; t += 1
        while pending and pending[0][1] <= t:
            queues[0].append(pending.pop(0)[0])
        if rem[cur] == 0:
            done[cur] = t; cur = None
        elif used == QUANTA[level[cur]]:                # used the whole quantum: demote
            level[cur] = min(level[cur] + 1, 2)
            queues[level[cur]].append(cur); cur = None
    return line, done

jobs = [("P1", 0, 9), ("P2", 1, 3), ("P3", 2, 2), ("P4", 9, 1)]
line, done = mlfq(jobs)
print("Gantt:", "|".join(line))
for n, a, b in jobs:
    print(n, "CT=%d TAT=%d WT=%d" % (done[n], done[n] - a, done[n] - a - b))
print("--- a CPU hog vs. one short job arriving EVERY tick (Q0 is never empty) ---")
hog = [("HOG", 0, 6)] + [("S%d" % i, i, 1) for i in range(1, 25)]
for b in (0, 8):
    line, done = mlfq(hog, boost=b)
    got = line[:24].count("HOG")
    print("boost=%-3s HOG got %d CPU ticks in the first 24, finished at t=%d" % (b or "off", got, done["HOG"]))` }],
  viz: [mlfqViz('P1:0:9 P2:1:3 P3:2:2 P4:9:1', 'MLFQ: short jobs finish on top, the long job sinks'), mlfqViz('P1:0:6 P2:0:6 P3:1:1 P4:2:1 P5:3:1 P6:4:1 P7:5:1 boost=6', 'MLFQ with a priority boost every 6 ticks (set boost=0 to compare)')],
  examples: [
    { title: 'MLFQ by hand: the Gantt chart', html: `<p>P1 (0, 9), P2 (1, 3), P3 (2, 2), P4 (9, 1). Q0 q=2, Q1 q=4.</p><p>${H.c('g', 'P1 P1')} (Q0, demoted) · ${H.c('b', 'P2 P2')} (Q0, demoted) · ${H.c('y', 'P3 P3')} (Q0, done at 6) · ${H.c('g', 'P1 P1 P1')} (Q1, preempted at 9 by P4) · ${H.c('p', 'P4')} (Q0, done at 10) · ${H.c('b', 'P2')} (Q1, done at 11) · ${H.c('g', 'P1 ×4')} (Q1, done at 15).</p>` },
    { title: 'Gaming the scheduler', html: `<p>A rule "demote only if the whole quantum is used" can be cheated: a program does a useless 1-byte I/O every 1.9 ms to stay in Q0 forever and hog the CPU. Fix: charge CPU time <i>cumulatively</i> per level (an allotment, e.g. 10 ms total in Q0, regardless of how many turns), then demote.</p>` },
    { title: 'MLQ with time-slicing between queues', html: `<p>Foreground queue gets 80% of each 100 ms frame (RR inside), background 20% (FCFS inside). Even a never-ending foreground load lets background make progress: 20 ms every 100 ms. No starvation, but the split is static.</p>` },
    { title: 'Why quanta grow at lower levels', html: `<p>Jobs at the bottom are proven CPU hogs, so we want fewer switches for them (long slice, 8 ticks), while top-level jobs are short or interactive and need quick turns (small slice, 2 ticks). Doubling per level (8, 16, 32 ms…) is a common choice.</p>` }
  ],
  deepDive: `<p><b>Famous implementations.</b> Solaris Time-Sharing class (60 levels with a dispatch table you can edit), BSD 4.4 (priority recalculated from recent CPU usage with decay), Windows NT (32 levels with dynamic boosts), macOS/XNU. The Compatible Time-Sharing System (CTSS, 1962) invented the idea of putting CPU-hungry jobs in lower queues with longer quanta. Modern Linux does <i>not</i> use MLFQ for normal tasks (CFS/EEVDF), but real-time classes are fixed-priority multilevel queues with 99 levels.</p>
  <p><b>Decay-usage priority (BSD).</b> Instead of discrete queues, priority = base + (recent CPU usage)/4 + 2 × nice, where recent CPU usage decays every second. A task that sleeps a lot has low usage and therefore a good priority. Same idea as the vruntime of CFS: a continuous version of MLFQ.</p>
  <p><b>Boost period trade-off.</b> Too long: starved jobs wait; too short: CPU hogs keep rejoining the top queue and hurt interactive latency ("voodoo constant" in OSTEP). Typical values: tens of milliseconds to a second.</p>
  <p><b>Anti-gaming and fairness.</b> Per-level allotment, user/tenant-level queues, and caps. Real systems also give a temporary priority bonus after I/O completes so a thread that just woke up gets served fast (Windows foreground boost, Solaris "sleep return priority").</p>
  <p><b>Cost.</b> O(1) per decision with a bitmap of non-empty queues (the Linux 2.6.0 "O(1) scheduler" used exactly this: 140 priority levels and a find-first-set on a bitmap). It was replaced by CFS because its interactivity heuristics were fragile.</p>`,
  aiEra: `<p><b>What AI changes:</b> inference gateways use MLFQ-style schedulers: new requests start in a high-priority queue and are demoted as they consume more tokens (research systems like FastServe apply skip-join MLFQ to LLM serving to cut head-of-line blocking). Autoscaling queues in Kubernetes batch systems (Kueue) combine queue priorities, preemption and borrowing; the vocabulary is the same.</p>
  <p><b>Use AI as a partner:</b> ask it to critique your MLFQ parameter choice for a mixed workload (chat requests vs batch embeddings). Ask for a trace-driven simulator skeleton, then run your own numbers.</p>
  <p><b>Where AI goes wrong:</b> it mixes up MLQ and MLFQ (the permanence of assignment is the difference), forgets the boost, and presents "MLFQ is what Linux uses" as fact (not for normal tasks since 2.6.23).</p>
  <p><b>What you must still own:</b> the six rules above, the gaming and starvation fixes, and the ability to run a trace by hand with a clear "what happens on preemption" rule.</p>`,
  problems: [{
    title: 'Trace a 3-Level MLFQ by Hand',
    level: 'Hard', tags: ['MLFQ', 'gantt', 'demotion'], companies: ['Google', 'Microsoft', 'VMware'],
    statement: `<p>3-level MLFQ: Q0 quantum 2, Q1 quantum 4, Q2 quantum 8; new jobs enter Q0; a job that uses its whole quantum is demoted one level; a job preempted by a higher-queue arrival goes to the back of <b>its own queue</b> and gets a fresh quantum later; higher queue always first. Jobs: P1 (AT 0, BT 9), P2 (AT 1, BT 3), P3 (AT 2, BT 2), P4 (AT 9, BT 1). Find the Gantt chart, CT, WT and averages.</p>`,
    constraints: `No I/O, zero switch cost, no boost within the horizon.`,
    example: `${H.arr(['P1', 'P1', 'P2', 'P2', 'P3', 'P3', 'P1', 'P1', 'P1', 'P4', 'P2', 'P1', 'P1', 'P1', 'P1'], { label: 'Gantt', idx: true })}<p>Avg WT <b>3.75</b>, avg TAT <b>7.5</b>.</p>`,
    brute: { why: `<p>Treating the problem as plain round robin with q = 2 ignores demotion and the strict priority between queues. Another trap is forgetting that P4's arrival at t=9 preempts P1 in the middle of its Q1 quantum.</p>` },
    mcq: { q: 'Why is P1 in Q1 (not Q0) when it runs at t=6?', options: ['It used its whole 2-tick quantum in Q0 earlier and was demoted', 'It arrived first', 'Q1 has the shortest quantum', 'Because it is the longest job'], answer: 0, explain: 'P1 ran 0–2 in Q0, consuming the full quantum, so it dropped to Q1.' },
    hints: [`<p>Hint 1: Keep three queue lists and a "currently running + used" pair; update after every tick or at events.</p>`, `<p>Hint 2: Order of events: t=2 P1 demoted, P2 (arrived t=1) is in Q0 → runs 2–4, demoted. P3 (arrived t=2) runs 4–6 and finishes within its quantum.</p>`, `<p>Hint 3: Q1 then holds [P1, P2]; P1 runs 6–9 and is preempted by P4 (arrives 9) after using 3 of 4 ticks; it goes behind P2 in Q1.</p>`],
    solution: {
      approach: `<p>t=0–2: P1 in Q0 uses the full quantum → demoted to Q1 (7 left). t=1 P2 arrived, t=2 P3 arrived, both in Q0. t=2–4: P2 uses full quantum (1 left) → Q1. t=4–6: P3 runs 2 ticks and finishes exactly at 6. Now Q0 is empty; Q1 = [P1, P2]. t=6–9: P1 runs 3 ticks, P4 arrives at 9 in Q0 and preempts it: P1 (4 left) goes to the back of Q1 → [P2, P1]. t=9–10: P4 runs 1 tick and finishes. t=10–11: P2 runs its last tick. t=11–15: P1 runs its last 4 ticks. CT: P1 15, P2 11, P3 6, P4 10. TAT 15, 10, 4, 1 (avg 7.5). WT 6, 7, 2, 0 (avg 3.75). The short jobs P3 and P4 are served almost immediately, the long job P1 pays.</p>`,
      dry: { head: ['Interval', 'Runs', 'Level', 'After'], rows: [['0–2', 'P1', 'Q0', 'quantum used → Q1 (7 left)'], ['2–4', 'P2', 'Q0', 'quantum used → Q1 (1 left)'], ['4–6', 'P3', 'Q0', 'done at 6'], ['6–9', 'P1', 'Q1', 'preempted by P4, back of Q1 (4 left)'], ['9–10', 'P4', 'Q0', 'done at 10'], ['10–11', 'P2', 'Q1', 'done at 11'], ['11–15', 'P1', 'Q1', 'done at 15']] },
      complexity: `<p>O(total burst) simulation; O(1) per decision with a bitmap of non-empty queues.</p>`,
      followUps: ['What changes if the preempted job keeps its remaining quantum instead?', 'Add a boost every 8 ticks and redraw.']
    }
  }]
});


topics.push({
  title: 'Linux CFS: vruntime, the Red-Black Tree and Nice Weights',
  analogy: `<p>Imagine a teacher giving a class of students <b>fair turns on the one computer</b>. She keeps a scoreboard of "how much computer time each student has had, adjusted for how important their work is". Whoever has the <i>lowest</i> score sits down next. Students doing important work (heavy weight) have their score grow slowly, so they get more turns; a student with low-importance work sees the score grow fast, so they get fewer. Nobody uses a stopwatch per turn: the rule is only "smallest score goes next". That score is <b>vruntime</b> and the "scoreboard sorted from smallest to largest" is the <b>red-black tree</b>.</p>`,
  explain: `<p>The <b>Completely Fair Scheduler (CFS)</b> was Linux's default for normal tasks from 2.6.23 (2007) to 6.5. The idea: model an "ideal fair CPU" where n tasks each run at 1/n speed simultaneously, and approximate it by always running the task that has received the <b>least</b> CPU so far.</p>
  <p><b>vruntime</b> = virtual runtime = how much CPU a task has used, scaled by its weight:</p>
  <p style="text-align:center"><code>vruntime += Δexec × (1024 / weight)</code></p>
  <p>Weight comes from the task's <b>nice</b> value (−20 … +19). Nice 0 has weight 1024; each step of nice changes the weight by about 25% (×1.25 per step), so one nice level ≈ 10% more or less CPU than a neighbour.</p>
  ${H.table(['nice', -10, -5, -2, 0, 1, 2, 5, 10, 19], [['weight', '9548', '3121', '1586', '1024', '820', '655', '335', '110', '15'], ['vruntime speed (1024/w)', '0.107×', '0.328×', '0.646×', '1×', '1.25×', '1.56×', '3.06×', '9.3×', '68×']])}
  <p><b>The data structure:</b> all runnable tasks live in a <b>red-black tree</b> (a self-balancing binary search tree) keyed by vruntime. The <b>leftmost node</b> has the smallest vruntime = next to run. The kernel caches a pointer to it, so "pick next" is <b>O(1)</b>; insert and remove are <b>O(log n)</b>.</p>
  ${H.arr(['B 3.0', 'A 5.0', 'D 7.5', 'C 9.0'], { label: 'tasks ordered by vruntime (left = next)', hl: { 0: 'b' } })}
  <p><b>One scheduling round:</b> (1) pick leftmost task T; (2) run it for its slice; (3) add Δexec × 1024 / weight to its vruntime; (4) re-insert into the tree (it moves right); repeat. Over time all vruntimes stay close together, which means CPU shares match the weights.</p>
  <p><b>Time slice:</b> period = max(sched_latency, n × min_granularity) (≈ 6 ms and 0.75 ms base values scaled with the CPU count); a task's slice = period × weight / Σ weights. A nice-0 and nice-5 task: shares 1024/(1024+335) = 75% and 25%.</p>
  <p><b>Sleepers and new tasks:</b> a task that sleeps (I/O) stops accumulating vruntime, so when it wakes it has a small vruntime and is picked soon. That gives interactive tasks great response <b>without any special case or heuristic</b>. To stop a long sleeper from hogging after waking, its vruntime is raised to at least <code>min_vruntime − latency/2</code>. A freshly forked task starts at about min_vruntime so it neither starves nor monopolises.</p>
  <p><b>Hand calculation (do this in interviews):</b> A (nice 0), B (nice 5), C (nice −5), each runs 6 ms per turn. After A runs 6 ms: +6.00. After B: 6 × 1024/335 = +18.34. After C: 6 × 1024/3121 = +1.97. C's score grows slowest so C is picked three times in a row; B is picked least.</p>`,
  clues: ['"completely fair", "vruntime", "red-black tree", "leftmost node" → Linux CFS', '"nice value", "weight 1024", "each nice level ≈ 10% / 25%"', '"how does Linux give interactive tasks good latency without heuristics?" → sleeper has small vruntime', '"O(1) pick next, O(log n) insert" → cached leftmost in RB tree', '"EEVDF", "kernel 6.6" → modern replacement, eligible time + virtual deadline', '"cgroups cpu.weight / cpu.shares" → group scheduling uses the same weights hierarchically'],
  code: [{ lang: 'python', title: 'Runnable CFS vruntime picker (heap = stand-in for the red-black tree)', run: true, code: `"""Toy CFS: always run the task with the smallest vruntime (the 'leftmost' node)."""
import heapq

# Linux sched_prio_to_weight (a few entries). Weight of nice 0 is 1024; each nice step is about 1.25x.
WEIGHT = {-10: 9548, -5: 3121, -2: 1586, -1: 1277, 0: 1024, 1: 820, 2: 655, 5: 335, 10: 110, 19: 15}
NICE0 = 1024

def cfs(tasks, slice_ms=6.0):
    # tasks: list of (name, nice, burst_ms); all start with vruntime 0
    heap = [(0.0, i, name, nice, burst) for i, (name, nice, burst) in enumerate(tasks)]
    heapq.heapify(heap)                      # a heap stands in for the red-black tree (min = leftmost)
    clock, cpu = 0.0, {}
    print("%-6s %-5s %-9s %-9s %s" % ("clock", "pick", "run(ms)", "vrt_before", "vrt_after"))
    while heap:
        vr, i, name, nice, left = heapq.heappop(heap)
        run = min(slice_ms, left)
        new_vr = vr + run * NICE0 / WEIGHT[nice]      # heavy (low nice) tasks age slowly
        print("%-6.1f %-5s %-9.1f %-9.2f %.2f" % (clock, name, run, vr, new_vr))
        clock += run
        cpu[name] = cpu.get(name, 0.0) + run
        left -= run
        if left > 1e-9:
            heapq.heappush(heap, (new_vr, i, name, nice, left))
    print("CPU time:", cpu)

cfs([("A", 0, 18), ("B", 5, 18), ("C", -5, 18)])` }],
  viz: [cfsViz('A:0:18 B:5:18 C:-5:18'), cfsViz('X:0:12 Y:0:12 s=4', 'CFS with equal nice: vruntimes leapfrog, shares stay equal')],
  examples: [
    { title: 'Share of CPU from weights', html: `<p>Tasks A (nice 0, 1024) and B (nice 5, 335): total 1359. A gets 1024/1359 = <b>75.4%</b>, B gets <b>24.6%</b>. With a 6 ms period: A's slice 4.52 ms, B's 1.48 ms. Check vruntime growth over one period: A: 4.52 × 1024/1024 = 4.52; B: 1.48 × 1024/335 = 4.52. Equal! That is exactly what "fair" means in CFS.</p>` },
    { title: 'One step by hand', html: `${H.table(['Step', 'Tree (task vruntime)', 'Pick', 'Run', 'New vruntime'], [[1, 'A 0, B 0, C 0', 'A (tie, first)', '6 ms', 'A = 6.00'], [2, 'B 0, C 0, A 6', 'B', '6 ms', 'B = 18.34'], [3, 'C 0, A 6, B 18.34', 'C', '6 ms', 'C = 1.97'], [4, 'C 1.97, A 6, B 18.34', 'C', '6 ms', 'C = 3.94']])}<p>The leftmost node is always the task with the smallest number.</p>` },
    { title: 'A waking sleeper', html: `<p>min_vruntime = 100 ms. Task S sleeps for 50 ms of wall time, its old vruntime was 90. On wake: vruntime = max(90, 100 − 3) = 97 (with latency/2 = 3 ms). It is slightly to the left of the others, so it is picked almost immediately: that is the interactive bonus. Without the clamp, a task that slept for an hour would return with a tiny vruntime and monopolise the CPU.</p>` },
    { title: 'Why nice values compound', html: `<p>nice 0 vs nice 1 is 1024 : 820 ≈ 1.25 : 1. nice 0 vs nice 10 is 1024 : 110 ≈ 9.3 : 1. So <code>nice -n 10 make</code> gives your compile about 10% of what a nice-0 task gets when both want the CPU.</p>` }
  ],
  deepDive: `<p><b>Why a red-black tree?</b> We need: fast min, fast insert, fast delete, with guaranteed O(log n) height even under adversarial insertion order. An RB tree is a BST where every node is red or black, there are no two red nodes in a row, and every path to a leaf has the same number of black nodes, so height ≤ 2 log₂(n+1). Linux caches <code>rb_leftmost</code> to make "pick next" constant time. A heap would give O(1) min too, but removing an arbitrary task (it blocks or migrates) is O(log n) with extra bookkeeping; the tree also allows ordered traversal. The visualizer above draws a balanced shape for readability; the real tree's shape depends on rotations.</p>
  <p><b>min_vruntime</b> is a monotonic floor per run queue: the smallest vruntime among the running task and the leftmost node. New and waking tasks are measured against it; because it never goes backwards, a task cannot sleep to "bank" unlimited credit.</p>
  <p><b>Per-CPU runqueues and load balancing.</b> Each CPU has its own tree. A periodic and idle load balancer migrates tasks between CPUs using each queue's total weight, with domain hierarchy (SMT → core → socket → NUMA) to keep cache locality. Wake-up placement picks an idle sibling or the previous CPU (cache affinity).</p>
  <p><b>Group scheduling.</b> With cgroups, each group is a scheduling entity with a weight (<code>cpu.weight</code> in v2, default 100). CFS is applied hierarchically so one user with 50 processes does not get 50 shares, which is how containers get a CPU fraction. Quotas (<code>cpu.max</code>) add throttling on top.</p>
  <p><b>EEVDF (Linux 6.6+, 2023).</b> CFS was replaced by Earliest Eligible Virtual Deadline First. Each task has a <i>lag</i> (how much service it is owed vs fair share). Only <b>eligible</b> tasks (lag ≥ 0) can run, and among them the scheduler picks the one with the earliest <b>virtual deadline</b> = start + slice/weight. Short-slice (latency-sensitive) tasks get earlier deadlines, so latency can be requested explicitly (latency-nice) instead of inferred from sleeping. Same weights and vruntime idea, better latency behaviour and fewer heuristics. Knowing both and saying "CFS until 6.5, EEVDF after" is a strong interview signal.</p>
  <p><b>Limits.</b> CFS is not a real-time scheduler (no deadlines; use SCHED_DEADLINE / SCHED_FIFO), and "fair" is per scheduling entity not per user unless you use cgroups. Heterogeneous CPUs (big.LITTLE, P/E cores) need energy-aware scheduling layered on top.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI clusters run Linux on every node, so CFS/EEVDF decides how tokenizer threads, data loaders and the inference server's CPU threads compete. A starved data loader leaves an expensive GPU idle; teams pin threads (<code>taskset</code>, cpusets), set <code>nice</code>, isolate cores (<code>isolcpus</code>) and pick cgroup weights. Linux 6.12 added <code>sched_ext</code>, which lets you write schedulers as eBPF programs, and ML-based schedulers are being researched on top of it.</p>
  <p><b>Use AI as a partner:</b> ask it to explain a <code>perf sched</code> or <code>schedstat</code> output, or to draft a cgroup v2 config that gives a latency-critical service weight 800 and a batch job weight 100, then test it with a stress tool.</p>
  <p><b>Where AI goes wrong:</b> it often mixes vruntime with real runtime, forgets the 1024/weight scaling, says "lowest priority number gets the biggest slice" (CFS has no fixed priority bands for normal tasks), and states CFS is "current" without the EEVDF update.</p>
  <p><b>What you must still own:</b> the vruntime formula, leftmost pick, why sleepers get low latency, and the cost model O(1)/O(log n).</p>`,
  problems: [{
    title: 'Simulate CFS vruntime by Hand',
    level: 'Medium', tags: ['CFS', 'vruntime', 'nice'], companies: ['Google', 'Red Hat', 'NVIDIA'],
    statement: `<p>Three CPU-bound tasks start together: A (nice 0, weight 1024), B (nice 5, weight 335), C (nice −5, weight 3121), each needing 18 ms. Each time a task is picked it runs 6 ms. All vruntimes start at 0; ties go to the earlier name. Show the first 9 picks and the final vruntimes.</p>`,
    constraints: `vruntime += run × 1024 / weight. Round to 2 decimals. Ignore wake-ups and load balancing.`,
    example: `<p>Pick order: ${H.c('b', 'A')}, ${H.c('y', 'B')}, ${H.c('g', 'C')}, ${H.c('g', 'C')}, ${H.c('g', 'C')}, ${H.c('b', 'A')}, ${H.c('b', 'A')}, ${H.c('y', 'B')}, ${H.c('y', 'B')}. The heavy task C runs three slices in a row because its vruntime grows only 1.97 per slice.</p>`,
    brute: { why: `<p>Dividing time equally (RR with q = 6) would give A, B, C, A, B, C… ignoring nice. That is fair per task but not <i>weighted fair</i>; CFS's whole point is that vruntime moves slower for heavy tasks.</p>` },
    mcq: { q: 'Which task is picked next: A (vruntime 6.00), B (18.34) or C (1.97)?', options: ['C', 'A', 'B', 'The one with the highest nice'], answer: 0, explain: 'The leftmost (smallest vruntime) wins: 1.97 is smallest.' },
    hints: [`<p>Hint 1: Delta per 6 ms slice: A = 6 × 1024/1024, B = 6 × 1024/335, C = 6 × 1024/3121.</p>`, `<p>Hint 2: Compute the three deltas once: 6.00, 18.34, 1.97. Then you only add.</p>`, `<p>Hint 3: Each step: pick smallest vruntime (ties: A before B before C), add its delta, repeat until all have run 3 times.</p>`],
    solution: {
      approach: `<p>Precompute deltas per 6 ms slice: A +6.00, B +18.34, C +1.97. Then repeat "pick the smallest vruntime". Step 1 all 0 → A (6.00). Step 2 B (18.34). Step 3 C (1.97). Steps 4 and 5: C still smallest (3.94, 5.91). Step 6: C would be 5.91 vs A 6.00, but C is finished after three slices (18 ms), so A runs (12.00), then A again (18.00). Then B (36.68), B (55.02). Final vruntimes: A 18.00, B 55.02, C 5.91 (C stopped after 3 slices). CPU time is equal here only because every task asked for exactly 18 ms; while all three are runnable, C receives about 3 slices for each of A's 1 and B's 0.33, which equals the weight ratio 3121 : 1024 : 335.</p>`,
      dry: { head: ['Pick #', 'Tree before (task vruntime)', 'Picked', 'Δ vruntime', 'New vruntime'], rows: [[1, 'A 0, B 0, C 0', 'A', '+6.00', '6.00'], [2, 'B 0, C 0, A 6.00', 'B', '+18.34', '18.34'], [3, 'C 0, A 6.00, B 18.34', 'C', '+1.97', '1.97'], [4, 'C 1.97, A 6.00, B 18.34', 'C', '+1.97', '3.94'], [5, 'C 3.94, A 6.00, B 18.34', 'C', '+1.97', '5.91 (C done)'], [6, 'A 6.00, B 18.34', 'A', '+6.00', '12.00'], [7, 'A 12.00, B 18.34', 'A', '+6.00', '18.00 (A done)'], [8, 'B 18.34', 'B', '+18.34', '36.68'], [9, 'B 36.68', 'B', '+18.34', '55.02 (B done)']] },
      complexity: `<p>Heap/tree: O(log n) per pick; with a cached leftmost the pick itself is O(1).</p>`,
      followUps: ['What happens if C sleeps for 20 ms and wakes up? (clamped to min_vruntime − latency/2)', 'How would EEVDF choose differently?']
    }
  }]
});


topics.push({
  title: 'Choosing a Scheduler: Interactive vs Batch vs Real-Time (Putting It All Together)',
  analogy: `<p>Choosing a scheduler is like choosing a <b>queue style for a venue</b>. A pizza counter wants "quick turns for everyone" (short slices). A laundromat wants "finish whole loads, minimise changeovers" (long runs). An ambulance dispatcher wants "the most urgent first, always, and a guaranteed response time" (real-time priorities). One shop with all three kinds of customers builds a mix: priority lanes plus fair sharing inside each lane. That mix is a real OS scheduler.</p>`,
  explain: `<p>You have now seen every algorithm. The interview skill is <b>matching an algorithm to a workload</b> and justifying it with the right metric. Use this cheat-sheet:</p>
  ${H.table(['Algorithm', 'Strong at', 'Weak at', 'Starves?', 'Needs burst knowledge?'], [
    ['FCFS', 'simplicity, minimal switches, batch with similar jobs', 'convoy effect, response time', 'no', 'no'],
    ['SJF / SRTF', 'lowest average waiting/turnaround', 'long jobs, response of long jobs, prediction', H.c('r', 'yes'), 'yes (estimate)'],
    ['Priority (pre/non)', 'honouring importance, real-time', 'low-priority jobs, inversion', H.c('r', 'yes'), 'no'],
    ['Round Robin', 'response time, fairness, time sharing', 'avg turnaround, switch overhead', 'no', 'no'],
    ['MLQ', 'clear job classes (system, user, batch)', 'rigid assignment', 'possible', 'no'],
    ['MLFQ', 'approximates SJF without prediction, good for mixed loads', 'many knobs, gaming', 'fixed by boost', 'no (learns)'],
    ['CFS / EEVDF', 'weighted fairness, great interactivity with no heuristics', 'not hard real-time', 'no', 'no']])}
  <p><b>Decision guide:</b></p>
  <ul><li><b>Interactive desktop / web server:</b> response time rules. Use preemptive, time-sliced, with a boost for tasks returning from I/O: RR/MLFQ in textbooks, CFS/EEVDF in Linux. Small q (but ≫ switch cost).</li>
  <li><b>Batch / scientific / payroll:</b> throughput and turnaround. Long slices or FCFS/SJF with backfill; minimise context switches. Response time is irrelevant.</li>
  <li><b>Real-time (car brakes, audio, robotics):</b> deadlines. Fixed-priority (Rate-Monotonic) or EDF, with admission control. Averages are meaningless; the <i>worst case</i> must meet the deadline.</li>
  <li><b>Mixed / cloud:</b> classes + weights: real-time class on top, CFS with cgroup weights for services, batch at idle priority.</li></ul>
  <p><b>Sanity-check with numbers.</b> Four jobs arrive together with bursts 6, 8, 7, 3 (priorities 2, 1, 3, 2):</p>
  ${H.table(['Scheduler', 'Avg WT', 'Avg TAT', 'Avg RT'], [['FCFS', '10.25', '16.25', '10.25'], ['SJF', H.c('g', '7.00'), H.c('g', '13.00'), '7.00'], ['Round Robin q=2', '13.75', '19.75', H.c('g', '3.00')], ['Priority (pre)', '9.75', '15.75', '9.75']])}
  <p>SJF wins on waiting and turnaround; RR wins response time and loses badly on the others. <b>There is no free lunch</b>: a good answer names the metric you optimise and what you give up.</p>
  <p><b>Utilization first:</b> before tuning the scheduler, make sure there is enough runnable work: with I/O-bound processes you need a high degree of multiprogramming (1 − pⁿ rule). The scheduler cannot create work.</p>`,
  clues: ['"interactive users", "response time" → preemptive time slicing (RR/MLFQ/CFS)', '"batch", "throughput", "overnight" → FCFS/SJF with long slices', '"deadline", "hard real time", "safety" → RM/EDF, fixed priority, admission control', '"minimise average waiting time" → SJF/SRTF; "also avoid starvation" → add aging', '"which one for a mixed workload?" → MLFQ or CFS with classes', '"justify" questions: always name metric, trade-off and failure mode'],
  viz: shootoutViz('P1:0:6:2 P2:0:8:1 P3:0:7:3 P4:0:3:2 q=2'),
  examples: [
    { title: 'Pick for a laptop', html: `<p>Editor, browser, music, a background compile. The user must feel instant keystrokes: small slices and a bonus for tasks that sleep (they are interactive). CFS gives the compile a low weight (<code>nice 10</code>) so it only takes leftovers. Metric: response time (p99 under 10 ms). Algorithm: CFS/EEVDF or MLFQ.</p>` },
    { title: 'Pick for a nightly data job farm', html: `<p>10,000 independent jobs, each hours long, no humans waiting. Switching costs cache and TLB warmth; response is irrelevant. Choose FCFS (or SJF using user-supplied time limits) with backfilling, one job per core. Metric: throughput and utilization.</p>` },
    { title: 'Pick for an anti-lock brake controller', html: `<p>The task must finish within 5 ms of the sensor event, every time. Use fixed-priority preemptive scheduling (Rate-Monotonic) with a schedulability test: for n periodic tasks, utilization ≤ n(2<sup>1/n</sup> − 1) guarantees deadlines (69% as n → ∞); EDF reaches 100%. Metric: worst-case latency, not average.</p>` },
    { title: 'Mixed server answer template', html: `<p>"I would use classes. Latency-critical RPC threads in a high-weight cgroup under CFS, batch jobs at nice 19 or SCHED_IDLE, kernel and network threads at real-time priority with throttling. I would watch p99 scheduling latency and run-queue length, and tune weights if the p99 grows."</p>` }
  ],
  deepDive: `<p><b>Rate-Monotonic and EDF in one paragraph.</b> For periodic real-time tasks, RM gives shorter-period tasks higher fixed priority. Liu &amp; Layland (1973) proved the bound U ≤ n(2<sup>1/n</sup> − 1). EDF always runs the task with the earliest absolute deadline and is optimal on a single CPU (feasible iff U ≤ 1). Linux has SCHED_FIFO/SCHED_RR (fixed priority) and SCHED_DEADLINE (EDF with runtime/period/deadline reservations).</p>
  <p><b>Multiprocessor scheduling.</b> One global queue is simple but contends on a lock and ignores cache affinity; per-CPU queues scale but need load balancing; Linux uses per-CPU queues with hierarchical balancing and affinity. NUMA, SMT (hyper-threads share a core) and heterogeneous cores (P/E cores) add placement decisions.</p>
  <p><b>Measuring in production.</b> Useful signals: run-queue length (<code>vmstat r</code>), load average, scheduling latency (<code>perf sched latency</code>, <code>runqlat</code> eBPF), involuntary context switches per process, CPU steal in VMs, throttled time in cgroups. High load average with low CPU use usually means tasks stuck in uninterruptible I/O, not a scheduler problem.</p>
  <p><b>Virtualised and container worlds.</b> A VM's vCPU is a thread the hypervisor schedules; "steal time" is the time your vCPU was ready but not running. Kubernetes CPU requests map to cgroup weights; limits map to quotas that <i>throttle</i> (can cause latency spikes even at low average usage).</p>
  <p><b>Theory corner.</b> SRPT is optimal for mean response time (single server); processor sharing (the RR limit) is insensitive to the job size distribution; FIFO is the worst when job sizes have heavy tails. Real workloads are heavy-tailed (few huge jobs, many tiny ones), which is exactly why size-aware or feedback-based policies (SRPT, MLFQ, LAS) beat FIFO and why the convoy effect is so costly in practice.</p>`,
  aiEra: `<p><b>What AI changes:</b> the new scheduling problems are at the cluster and request level: gang scheduling of multi-GPU jobs, fair-share and preemption across teams (Slurm, Kueue, Volcano), and token-level scheduling in inference servers. Metrics are TTFT (time to first token, the response time) and TPOT (time per output token), plus throughput; the same trade-off table applies (chunked prefill, priority classes, preemption by swapping KV-cache). Learned schedulers (RL or predicted-length based) are an active area but production defaults are still simple, explainable policies with guardrails.</p>
  <p><b>Use AI as a partner:</b> describe your workload and ask for the top two candidate schedulers with failure modes, then ask it to write a tiny simulator that tests both on a trace you provide. Compare with your own reasoning.</p>
  <p><b>Where AI goes wrong:</b> it gives a universal "use CFS" or "use RR" answer without naming metrics, or recommends SJF without noting that burst lengths are unknown. It rarely mentions starvation or worst-case latency unless prompted.</p>
  <p><b>What you must still own:</b> turning a vague requirement into a metric (p99 latency, throughput, deadline miss rate) and defending the trade-off.</p>`,
  problems: [{
    title: 'Compare Four Schedulers and Recommend One',
    level: 'Medium', tags: ['comparison', 'FCFS', 'SJF', 'RR', 'priority'], companies: ['Amazon', 'Cisco', 'Adobe'],
    statement: `<p>Four jobs arrive at t=0: P1 (BT 6, pr 2), P2 (BT 8, pr 1), P3 (BT 7, pr 3), P4 (BT 3, pr 2). Lower number = higher priority. Compute average WT and TAT for FCFS (order P1..P4), SJF, preemptive priority (ties by lower PID) and RR q=2, then recommend a scheduler for (a) an interactive terminal server and (b) an overnight batch cluster.</p>`,
    constraints: `All times integers, zero switch cost. RR order P1, P2, P3, P4.`,
    example: `${H.table(['Scheduler', 'Avg WT', 'Avg TAT'], [['FCFS', '10.25', '16.25'], ['SJF', '7.00', '13.00'], ['Priority', '9.75', '15.75'], ['RR q=2', '13.75', '19.75']])}`,
    brute: { why: `<p>"Just use the one with the lowest average waiting time" ignores that interactive users care about response time (RR gives avg RT 3.0 versus 10.25 for FCFS), and that SJF needs burst knowledge and can starve P2.</p>` },
    mcq: { q: 'For the interactive terminal server, which scheduler fits best?', options: ['Round Robin / MLFQ / CFS (preemptive time slicing)', 'FCFS', 'Non-preemptive SJF', 'Priority without aging'], answer: 0, explain: 'Interactive users need bounded response time, which time slicing gives (avg RT 3.0 here versus 7–10 for the others).' },
    hints: [`<p>Hint 1: All arrive at 0, so WT = start time of the job (no preemption) for FCFS, SJF; TAT = WT + BT.</p>`, `<p>Hint 2: SJF order: P4 (3), P1 (6), P3 (7), P2 (8). Priority order: P2 (1), P1 (2), P4 (2), P3 (3).</p>`, `<p>Hint 3: RR q=2 Gantt: P1 P2 P3 P4 P1 P2 P3 P4(1) P1 P2 P3 P2 P3 — work with remaining times; CT: P1 17, P2 23, P3 24, P4 15.</p>`],
    solution: {
      approach: `<p>FCFS: starts 0, 6, 14, 21 → WT sum 41 → 10.25; TAT = WT + BT: sums 65 → 16.25. SJF: order P4, P1, P3, P2 starts 0, 3, 9, 16 → WT sum 28 → 7.00; TAT sum 52 → 13.00. Priority (preemptive, nothing arrives later so it is just an order): P2, P1, P4, P3 starts 0, 8, 14, 17 → WT sum 39 → 9.75; TAT sum 63 → 15.75. RR q=2: completion times P1 17, P2 23, P3 24, P4 15 → TAT sum 79 → 19.75; WT = TAT − BT: sum 55 → 13.75; response times 0, 2, 4, 6 → 3.0. Recommendation: (a) interactive server → RR-style preemptive time slicing (MLFQ/CFS in practice); average RT 3.0 beats 7–10 for the others even though total waiting is worse. (b) overnight batch → SJF (or FCFS with backfill and user time limits), which minimises average waiting/turnaround and switches; guard against starvation of the long jobs with aging.</p>`,
      dry: { head: ['Scheduler', 'Order / Gantt', 'WT (P1,P2,P3,P4)', 'Avg WT', 'Avg TAT'], rows: [['FCFS', 'P1 P2 P3 P4', '0, 6, 14, 21', '10.25', '16.25'], ['SJF', 'P4 P1 P3 P2', '3, 16, 9, 0', '7.00', '13.00'], ['Priority', 'P2 P1 P4 P3', '8, 0, 17, 14', '9.75', '15.75'], ['RR q=2', 'interleaved', '11, 15, 17, 12', '13.75', '19.75']] },
      complexity: `<p>Each simulation is O(total burst); sorting-based ones O(n log n).</p>`,
      followUps: ['Which would you pick for a mix of both and why?', 'How would you stop P2 from starving under SJF?']
    }
  }]
});
