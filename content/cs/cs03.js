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
function mlfqViz(def) {
  return {
    title: 'MLFQ: 3 levels (quantum 2 / 4 / 8) with demotion and optional boost', input: def,
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
function cfsViz(def) {
  return {
    title: 'CFS: always run the leftmost (smallest vruntime) node', input: def,
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
