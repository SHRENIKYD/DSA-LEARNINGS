/* Planner: the adaptive study plan on top of Learn and PATHS. Pure logic, no DOM; it works from the small build-time maps
   (window.IM_PATHMETA, window.IM_MODS) and the stored state, so it never loads a module.
   Stored state (all existing synced stores):
     imastery.route  — Learn.pref(): hours, interviewDate, restDay, placement
     imastery.done   — '@score:<mod>': quiz percentage, '@rev:<mod>': inserted review done, '@mock:<YYYY-MM-DD>': mock percentage,
                       '@tested:<mod>': known (placement or readiness check)
     imastery.days   — list of days with activity (streak and catch-up); synced with the account inside progress.play (src/auth.js)
   Rules (from the approved demo): a score under 60 inserts a review and extra practice before moving on; 85 or more fast-tracks the
   recommended modules of that stage; an interview date trims optional, then recommended modules until the core fits, and books mock
   rounds in the last 7 days; missed days are spread over the rest of the week, capped at 1.5x the daily budget. */
var Planner = (function () {
  var DAY = 864e5, PART_MIN = 40, PRACTICE_MIN = 30, REVIEW_MIN = 20, DUE_MIN = 10, MOCK_MIN = 45, MOCK_QS = 12;
  var WEAK = 60, STRONG = 85;
  var LANG_TRACK = { java: 'java', python: 'py', js: 'js', cpp: 'cpp' };
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function done() { return get('imastery.done', {}) || {}; }
  function fire() { try { window.dispatchEvent(new CustomEvent('im:plan')); } catch (e) { } }
  function saveDone(D) { set('imastery.done', D); if (typeof window !== 'undefined' && window.Auth && Auth.changed) Auth.changed(); fire(); }
  function ymd(d) { d = d || new Date(); return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate(); }
  function midnight() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function score(mod, D) { var v = (D || done())['@score:' + mod]; return v === undefined || v === null ? null : +v; }

  /* ---------- the path as items ---------- */
  function pref() { return Learn.pref(); }
  function items(p) {
    p = p || pref();
    var pl = PATHS.plan(p.id, p.lang), out = [];
    if (!pl) return out;
    pl.items.forEach(function (it) {
      var m = Learn.meta(it.id);
      if (!m) return;
      var kind = Learn.relevance(it.id, p).state;
      if (kind !== 'core' && kind !== 'rec' && kind !== 'opt') kind = it.kind;
      out.push({ id: it.id, kind: kind, stage: it.stage, title: m.title, track: m.track, hours: m.hours || 0, problems: m.problems || 0, practice: m.practice || 0 });
    });
    return out;
  }
  function route(p) { p = p || pref(); return PATHS.ROUTES.filter(function (r) { return r.id === p.id; })[0] || PATHS.ROUTES[0]; }
  function daysLeft(p) {
    p = p || pref();
    if (!p.interviewDate) return null;
    var d = Math.ceil((new Date(p.interviewDate + 'T00:00:00') - midnight()) / DAY);
    return d < 0 ? 0 : d;
  }
  /* Interview mode keeps the core, then adds recommended, then optional modules while they fit the hours left before the date
     (15% of them, at most one week's hours, are kept for mock rounds). Fast track drops recommended modules in a stage whose
     last core module was passed with 85% or more. */
  function effective(p) {
    p = p || pref();
    var all = items(p), D = done(), dl = daysLeft(p), B = dl === null ? null : dl / 7 * p.hours, mock = 0;
    if (B !== null) { mock = Math.min(p.hours, B * 0.15); B -= mock; }
    var sat = {};
    all.forEach(function (x) { sat[x.id] = Learn.status(x.id, D).satisfied; });
    var left = function (x) { return sat[x.id] ? 0 : x.hours; };
    var keep = {}, used = 0, trimmed = [];
    all.forEach(function (x) { if (x.kind === 'core') { keep[x.id] = 1; used += left(x); } });
    ['rec', 'opt'].forEach(function (k) {
      all.forEach(function (x) {
        if (x.kind !== k) return;
        if (B === null || sat[x.id] || used + left(x) <= B) { keep[x.id] = 1; used += left(x); } else trimmed.push(x);
      });
    });
    var master = {};
    all.forEach(function (x) { if (x.kind === 'core') master[x.stage] = x.id; });
    var fast = all.filter(function (x) {
      var m = master[x.stage], sc = m ? score(m, D) : null;
      return x.kind === 'rec' && keep[x.id] && !sat[x.id] && m && sat[m] && sc !== null && sc >= STRONG;
    });
    fast.forEach(function (x) { delete keep[x.id]; used -= left(x); });
    var list = all.filter(function (x) { return keep[x.id]; }).map(function (x) { x.done = !!sat[x.id]; return x; });
    return { list: list, trimmed: trimmed, fast: fast, usedHours: Math.round(used * 10) / 10, budgetHours: B === null ? null : Math.round(B * 10) / 10, mockHours: Math.round(mock * 10) / 10, short: B !== null && used > B, daysLeft: dl };
  }
  function stageName(st, p) { var R = route(p); return R.stages[st] ? R.stages[st].name : R.name; }
  function kindWord(k) { return k === 'core' ? 'required' : k === 'rec' ? 'recommended' : 'optional'; }

  /* ---------- inserted work from weak quiz scores ---------- */
  function weak(D) {
    D = D || done();
    var out = [];
    Object.keys(D).forEach(function (k) {
      if (k.indexOf('@score:') !== 0) return;
      var mod = k.slice(7);
      if (+D[k] < WEAK && !D['@rev:' + mod] && Learn.meta(mod)) out.push(mod);
    });
    return out;
  }
  function firstUndone(mod, prefix, n, D) { for (var i = 0; i < n; i++) if (!D[mod + '-' + prefix + i]) return i; return Math.max(0, n - 1); }
  function inserted(D) {
    D = D || done();
    var out = [];
    weak(D).forEach(function (mod) {
      var m = Learn.meta(mod), it = Learn.itemsOf(mod), sc = score(mod, D), href = Learn.href(mod);
      out.push({ id: 'rev:' + mod, kind: 'review', mod: mod, title: 'Review: ' + m.title, why: 'You scored ' + sc + '% on the riddle gate. Reread the weak spots, then pass the gate again.', minutes: REVIEW_MIN, href: href + '-t0', done: false });
      if (it && it.practice) out.push({ id: 'xp:' + mod, kind: 'practice', mod: mod, title: 'Extra practice: ' + m.title, why: 'Targeted problems before moving on.', minutes: PRACTICE_MIN, href: href + '-p' + firstUndone(mod, 'p', it.practice, D), done: false });
    });
    return out;
  }
  function lessonItem(x, D) {
    var it = Learn.itemsOf(x.id), topics = it ? it.topics : 1, t = it ? firstUndone(x.id, 't', topics, D) : 0;
    var parts = Math.max(1, Math.round(x.hours * 60 / PART_MIN)), doneTopics = 0;
    for (var i = 0; i < topics; i++) if (D[x.id + '-t' + i]) doneTopics++;
    var k = Math.min(parts, Math.floor(doneTopics / Math.max(1, topics) * parts) + 1);
    return { id: x.id + '-t' + t, kind: 'lesson', mod: x.id, title: x.title, track: x.track, stage: x.stage, why: kindWord(x.kind) + ' in “' + stageName(x.stage) + '” · lesson part ' + k + ' of ' + parts, minutes: PART_MIN, href: Learn.href(x.id) + '-t' + t, done: false };
  }
  function practiceItem(x, D) {
    var it = Learn.itemsOf(x.id), n = it ? it.practice : 0;
    if (!n) return null;
    var k = firstUndone(x.id, 'p', n, D);
    return { id: x.id + '-p' + k, kind: 'practice', mod: x.id, title: 'Practice: ' + x.title, track: x.track, why: Math.min(3, n - k) + ' of ' + n + ' problems, easiest first', minutes: PRACTICE_MIN, href: Learn.href(x.id) + '-p' + k, done: false };
  }
  function projectItem(st, p) {
    var R = route(p), pr = R.stages[st] && R.stages[st].project ? Learn.projectState(R.stages[st].project) : null;
    if (!pr || !pr.project || pr.done) return null;
    return { id: 'proj:' + pr.id, kind: 'project', mod: pr.id, title: pr.project.name, why: 'Stage project for “' + R.stages[st].name + '” · ' + pr.ticked + ' of ' + pr.total + ' criteria ticked', minutes: pr.project.hours * 60, href: 'route.html#rp-' + pr.id, done: false };
  }
  /* The one smart Continue: inserted review or practice first, then the first unfinished step of the effective path
     (a stage project follows its stage once every module of that stage is satisfied). */
  function next(p) {
    p = p || pref();
    var D = done(), ins = inserted(D);
    if (ins.length) return ins[0];
    var e = effective(p), list = e.list;
    for (var i = 0; i < list.length; i++) {
      var x = list[i];
      if (!x.done) return lessonItem(x, D);
      var last = !list.slice(i + 1).some(function (y) { return y.stage === x.stage; });
      if (last) { var pj = projectItem(x.stage, p); if (pj) return pj; }
    }
    return null;
  }

  /* ---------- activity log: streak and catch-up ---------- */
  function days() { var d = get('imastery.days', []); return Array.isArray(d) ? d : []; }
  function touch() {
    var d = days(), t = ymd();
    if (d[d.length - 1] === t) return;
    d.push(t); set('imastery.days', d.slice(-60)); if (typeof window !== 'undefined' && window.Auth && Auth.changed) Auth.changed('play'); fire();
  }
  function streak() {
    var d = {}, n = 0, t = midnight(), rest = pref().restDay;
    days().forEach(function (x) { d[x] = 1; });
    if (!d[ymd(t)]) t = new Date(t - DAY);
    while (d[ymd(t)] || (t.getDay() === rest && n)) { if (d[ymd(t)]) n++; t = new Date(t - DAY); }
    return n;
  }
  /* Days this week (after the rest day) before today with no activity; 0 until the learner has any activity at all. */
  function missed(p) {
    p = p || pref();
    var d = {}, log = days();
    if (!log.length) return 0;
    log.forEach(function (x) { d[x] = 1; });
    var t = midnight(), n = 0;
    for (var i = 1; i <= 6; i++) {
      var x = new Date(t - i * DAY);
      if (x.getDay() === p.restDay) break;
      if (!d[ymd(x)]) n++;
    }
    return n;
  }
  function dayMinutes(p) {
    p = p || pref();
    if (midnight().getDay() === p.restDay) return 0;
    var base = p.hours * 60 / 6, m = missed(p), carry = m * base / Math.max(1, 6 - m);
    return Math.round(Math.min(base * 1.5, base + carry));
  }
  function today(p) {
    p = p || pref();
    var D = done(), mins = dayMinutes(p), out = [], dl = daysLeft(p), t = ymd(), rest = mins === 0;
    Learn.due().forEach(function (r) {
      var m = Learn.meta(r.mod);
      out.push({ id: 'due:' + r.id, kind: 'review', mod: r.mod, title: 'Review: ' + (r.title || (m ? m.title : r.mod)), why: 'Spaced review due' + (r.misses ? ' · missed ' + r.misses + ' time' + (r.misses === 1 ? '' : 's') : ''), minutes: DUE_MIN, href: (m ? m.track : 'dsa') + '.html#' + r.id, done: false });
    });
    if (!rest) {
      inserted(D).forEach(function (x) { out.push(x); });
      if (dl !== null && dl > 0 && dl <= 7 && !D['@mock:' + t]) out.push({ id: 'mock:' + t, kind: 'mock', mod: '', title: 'Mock round: 45-minute timed set', why: 'Interview in ' + dl + ' day' + (dl === 1 ? '' : 's') + '. Mixed questions from your path.', minutes: MOCK_MIN, href: 'plan.html#mock', done: false });
      var used = 0, n = 0;
      out.forEach(function (x) { used += x.minutes; });
      var e = effective(p);
      for (var i = 0; i < e.list.length && used < mins && n < 4; i++) {
        var x = e.list[i];
        if (x.done) continue;
        var les = lessonItem(x, D); les.minutes = Math.min(PART_MIN, mins - used); out.push(les); used += les.minutes; n++;
        if (used < mins) { var pr = practiceItem(x, D); if (pr) { pr.minutes = Math.min(PRACTICE_MIN, mins - used); out.push(pr); used += pr.minutes; n++; } }
      }
    }
    /* Items planned earlier today stay listed (struck through) once finished. */
    var cache = get('imastery.today', null), prev = cache && cache.date === t && Array.isArray(cache.items) ? cache.items : [];
    var byId = {}; out.forEach(function (x) { byId[x.id] = x; });
    var merged = [];
    prev.forEach(function (x) { if (byId[x.id]) { merged.push(byId[x.id]); delete byId[x.id]; } else if (isDone(x, D)) { x.done = true; merged.push(x); } });
    out.forEach(function (x) { if (byId[x.id]) merged.push(x); });
    set('imastery.today', { date: t, items: merged.map(function (x) { var c = {}; Object.keys(x).forEach(function (k) { c[k] = x[k]; }); c.done = false; return c; }) });
    var total = 0; merged.forEach(function (x) { if (!x.done) total += x.minutes; });
    return { items: merged, minutes: mins, used: total, rest: rest, missed: missed(p), date: t };
  }
  function isDone(x, D) {
    D = D || done();
    if (x.kind === 'mock') return !!D['@mock:' + ymd()];
    if (x.id.indexOf('rev:') === 0 || x.id.indexOf('xp:') === 0) return !!D['@rev:' + x.mod];
    if (x.id.indexOf('due:') === 0) return !Learn.due().some(function (r) { return 'due:' + r.id === x.id; });
    if (x.id.indexOf('proj:') === 0) return Learn.projectState(x.mod).done;
    return !!D[x.id];
  }

  /* ---------- forecast ---------- */
  function weeks(p) {
    p = p || pref();
    var e = effective(p), R = route(p), hoursLeft = 0, cum = 0, stages = [];
    e.list.forEach(function (x) { if (!x.done) hoursLeft += x.hours; });
    R.stages.forEach(function (st, i) {
      var ms = e.list.filter(function (x) { return x.stage === i && !x.done; });
      if (!ms.length) return;
      var h = ms.reduce(function (a, x) { return a + x.hours; }, 0);
      cum += h;
      stages.push({ name: st.name, index: i, modules: ms.map(function (x) { return x.id; }), hours: Math.round(h * 10) / 10, byWeek: Math.ceil(cum / p.hours) });
    });
    hoursLeft = Math.round(hoursLeft * 10) / 10;
    var dl = e.daysLeft;
    return { hoursLeft: hoursLeft, weeks: Math.ceil(hoursLeft / p.hours), stages: stages, fits: !e.short, mockHours: e.mockHours, budgetHours: e.budgetHours, daysLeft: dl, trimmed: e.trimmed.length, fast: e.fast.length,
      hoursNeeded: dl !== null && dl > 0 ? Math.ceil(e.usedHours / Math.max(1 / 7, dl / 7)) : null };
  }
  function progress(p) {
    var e = effective(p), core = e.list.filter(function (x) { return x.kind === 'core'; }), d = core.filter(function (x) { return x.done; }).length;
    return { done: d, total: core.length, pct: core.length ? Math.round(d / core.length * 100) : 0 };
  }

  /* ---------- writes ---------- */
  function recordScore(mod, pct) {
    if (!mod || !isFinite(pct)) return;
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    var D = done(), old = score(mod, D);
    D['@score:' + mod] = pct;
    if (pct >= WEAK && old !== null && old < WEAK) D['@rev:' + mod] = 1;
    saveDone(D); touch();
  }
  function completeReview(mod) { if (!mod) return; var D = done(); D['@rev:' + mod] = 1; saveDone(D); touch(); }
  function recordMock(pct) { var D = done(); D['@mock:' + ymd()] = Math.max(0, Math.min(100, Math.round(pct))); saveDone(D); touch(); }
  /* What a placement level would mark as known: language-track modules ('lang'), plus the first 6 DSA modules ('langdsa'). */
  function placementMods(level, p) {
    p = p || pref();
    var all = items(p), out = [], lt = LANG_TRACK[p.lang], dsa = 0;
    if (level !== 'lang' && level !== 'langdsa') return out;
    all.forEach(function (x) { if (lt && x.track === lt) out.push(x.id); });
    if (level === 'langdsa') all.forEach(function (x) { if (x.track === 'dsa' && dsa < 6) { out.push(x.id); dsa++; } });
    return out;
  }
  function placement(level, p) {
    p = p || pref();
    var D = done(), n = 0;
    placementMods(level, p).forEach(function (id) { if (!D['@tested:' + id]) { D['@tested:' + id] = 1; n++; } });
    Learn.setPref({ placement: level });
    saveDone(D);
    return n;
  }
  /* Readiness check that proves a placement level instead: the module whose prerequisites that level covers. */
  function placementProof(level, p) {
    p = p || pref();
    var all = items(p), first = all.filter(function (x) { return x.track === 'dsa'; });
    if (level === 'lang') return first[0] ? first[0].id : null;
    if (level === 'langdsa') return first[6] ? first[6].id : (first.length ? first[first.length - 1].id : null);
    return null;
  }

  /* ---------- mock round: 12 mixed questions from the path's modules, 45 minutes ---------- */
  function loadScript(src) { return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); }); }
  var QUIZ = {};
  function quizFor(tracks) {
    var files = window.IM_QUIZFILES || {}, chain = Promise.resolve();
    if (window.IM_QUIZ) Object.keys(window.IM_QUIZ).forEach(function (k) { QUIZ[k] = window.IM_QUIZ[k]; });
    tracks.forEach(function (t) {
      if (!files[t]) return;
      if (Object.keys(QUIZ).some(function (k) { var m = Learn.meta(k); return m && m.track === t; })) return;
      chain = chain.then(function () { return loadScript(files[t]).then(function () { var Q = window.IM_QUIZ || {}; Object.keys(Q).forEach(function (k) { QUIZ[k] = Q[k]; }); }, function () { }); });
    });
    return chain.then(function () { return QUIZ; });
  }
  function mockQuestions(Q, C, mods, seed) {
    var pool = [];
    mods.forEach(function (x) {
      var m = Learn.meta(x.id), qs = Q[x.id] && Q[x.id].length ? Q[x.id] : (C[x.id] || []).map(function (q) { return { q: q[0], options: q[1], answer: q[2], explain: q[3] }; });
      qs.forEach(function (q) { if (q && q.options && q.options.length > 1) pool.push({ q: q.q, options: q.options, answer: q.answer, explain: q.explain, from: m.title, section: x.id + '-quiz', mod: x.id, modTitle: m.title }); });
    });
    var s = seed || 11, a = pool.slice();
    for (var i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; var j = Math.floor(s / 233280 * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    /* spread across modules: at most two questions from one module while others are available */
    var out = [], per = {};
    for (var pass = 0; pass < 3 && out.length < MOCK_QS; pass++) a.forEach(function (q) { if (out.length < MOCK_QS && (per[q.mod] || 0) < 2 + pass * 4 && out.indexOf(q) < 0) { out.push(q); per[q.mod] = (per[q.mod] || 0) + 1; } });
    return out;
  }
  function mock(onDone) {
    var e = effective(), mods = e.list.filter(function (x) { return x.done; });
    if (mods.length < 2) mods = e.list.slice(0, 6);
    var tracks = []; mods.forEach(function (x) { if (tracks.indexOf(x.track) < 0) tracks.push(x.track); });
    var checks = window.IM_CHECKS ? Promise.resolve(window.IM_CHECKS) : loadScript('assets/checks.js').then(function () { return window.IM_CHECKS || {}; }, function () { return {}; });
    return Promise.all([quizFor(tracks), checks]).then(function (r) {
      var qs = mockQuestions(r[0], r[1], mods, new Date().getDate() * 131 + mods.length);
      if (!qs.length) { alert('No questions are available for a mock round yet. Finish a module first.'); return; }
      Learn.quizDialog({ kicker: 'Mock round', title: 'Timed set · ' + qs.length + ' questions', questions: qs, pass: 0.7, timer: 45,
        intro: 'Mixed questions from the modules on your path, 45 minutes on the clock. 70% or more counts as a pass.',
        passText: 'Solid round. The result is on your plan.', failText: 'Keep going. The missed topics were added to your review list.',
        onResult: function (pct) { recordMock(pct); if (onDone) onDone(pct); } });
    });
  }

  return { effective: effective, next: next, today: today, weeks: weeks, daysLeft: daysLeft, placement: placement, placementMods: placementMods, placementProof: placementProof,
    recordScore: recordScore, completeReview: completeReview, recordMock: recordMock, mock: mock, mockQuestions: mockQuestions, items: items, progress: progress,
    streak: streak, missed: missed, dayMinutes: dayMinutes, touch: touch, isDone: isDone, score: score, weak: weak, inserted: inserted, ymd: ymd };
})();
