/* Learner state on top of PATHS: route preferences, prerequisites met, mastery, spaced review and a quiz dialog.
   Synced achievements live in imastery.done as '@cp:<track>-<zone>' (checkpoint passed), '@tested:<module>' (tested out)
   and '@proj:<project>:<n>' (criterion n of a project checklist ticked).
   The review queue and preferences stay on the device. */
var Learn = (function () {
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var DAY = 864e5, STEPS = [1, 3, 7, 21];
  var LANG_NAMES = { java: 'Java', python: 'Python', js: 'JavaScript / TypeScript', cpp: 'C++' };

  /* ---------- preferences ---------- */
  function pref() {
    var p = get('imastery.route', null) || {};
    var R = PATHS.ROUTES.filter(function (r) { return r.id === p.id; })[0] || PATHS.ROUTES[0];
    var lang = R.langs.indexOf(p.lang) >= 0 ? p.lang : (R.langs.indexOf(get('imastery.lang', null)) >= 0 ? get('imastery.lang', null) : R.langs[0]);
    var hours = [5, 10, 20, 40].indexOf(+p.hours) >= 0 ? +p.hours : 10;
    return { id: R.id, lang: lang, hours: hours, chosen: !!p.id };
  }
  function setPref(p) {
    var cur = pref(), next = { id: p.id || cur.id, lang: p.lang || cur.lang, hours: p.hours || cur.hours };
    var R = PATHS.ROUTES.filter(function (r) { return r.id === next.id; })[0];
    if (R && R.langs.indexOf(next.lang) < 0) next.lang = R.langs[0];
    set('imastery.route', next);
    if (next.lang) set('imastery.lang', next.lang);
    return next;
  }

  /* ---------- module status ---------- */
  function done() { return get('imastery.done', {}) || {}; }
  function itemsOf(mid) {
    var c = (window.IM_MODS || {})[mid];
    if (!c) return null;
    var ids = [];
    for (var i = 0; i < c[0]; i++) { ids.push(mid + '-t' + i); for (var j = 0; j < (c[1][i] || 0); j++) ids.push(mid + '-t' + i + '-q' + j); }
    for (var k = 0; k < c[2]; k++) ids.push(mid + '-p' + k);
    if (c[3]) ids.push(mid + '-quiz');
    if (c[4]) ids.push(mid + '-iv');
    return { ids: ids, topics: c[0], practice: c[2], quiz: !!c[3] };
  }
  function meta(mid) { var m = (window.IM_PATHMETA || {})[mid]; return m ? { title: m[0], track: m[1], level: m[2], hours: m[3], cover: m[4], problems: m[5], tested: m[6], practice: m[7] } : null; }
  function zoneKey(mid) { var m = meta(mid); return m ? m.track + '-' + m.level : ''; }
  function status(mid, D) {
    D = D || done();
    var it = itemsOf(mid);
    if (!it) return { live: false, visited: false, satisfied: !!D['@tested:' + mid], mastered: false, pct: 0, tested: !!D['@tested:' + mid] };
    var n = 0, topics = 0, prac = 0;
    it.ids.forEach(function (id) { if (D[id]) { n++; if (/-t\d+$/.test(id)) topics++; if (/-p\d+$/.test(id)) prac++; } });
    var quiz = !it.quiz || !!D[mid + '-quiz'];
    var tested = !!D['@tested:' + mid], checkpoint = !!D['@cp:' + zoneKey(mid)];
    var visited = it.ids.length > 0 && n === it.ids.length;
    var lessons = topics === it.topics;
    var overdue = reviews().some(function (r) { return r.mod === mid && r.due < Date.now() - DAY; });
    var mastered = quiz && lessons && prac * 2 >= it.practice && (checkpoint || tested) && !overdue;
    return { live: true, visited: visited, lessons: lessons, quiz: quiz, pct: it.ids.length ? Math.round(n / it.ids.length * 100) : 0, tested: tested, checkpoint: checkpoint, overdue: overdue, mastered: mastered, satisfied: tested || visited || (quiz && lessons) };
  }
  /* ---------- project checklists ---------- */
  function projectState(pid, D) {
    D = D || done();
    var P = PATHS.PROJECTS[pid], total = P ? P.rubric.length : 0, ticks = [], n = 0;
    for (var i = 0; i < total; i++) { var on = !!D['@proj:' + pid + ':' + i]; ticks.push(on); if (on) n++; }
    return { id: pid, project: P || null, ticks: ticks, ticked: n, total: total, done: total > 0 && n === total };
  }
  function setCriterion(pid, i, on) {
    var P = PATHS.PROJECTS[pid];
    if (!P || i < 0 || i >= P.rubric.length) return;
    var D = done(), k = '@proj:' + pid + ':' + i;
    if (on) D[k] = 1; else delete D[k];
    set('imastery.done', D);
    if (window.Auth) Auth.changed();
  }
  function missing(mid, lang, D) { D = D || done(); return PATHS.needs(mid, lang).filter(function (x) { return !status(x, D).satisfied; }); }
  function unlocks(mid, lang) { var out = []; Object.keys(PATHS.NEEDS).forEach(function (k) { if (PATHS.needs(k, lang).indexOf(mid) >= 0) out.push(k); }); return out; }

  /* ---------- route progress and what to do next ---------- */
  function routeView(p) {
    p = p || pref();
    var hours = {};
    Object.keys(window.IM_PATHMETA || {}).forEach(function (k) { hours[k] = window.IM_PATHMETA[k][3]; });
    var sch = PATHS.schedule(p.id, p.lang, hours), D = done();
    var items = sch.plan.items.map(function (it) { return { id: it.id, kind: it.kind, stage: it.stage, st: status(it.id, D), meta: meta(it.id) }; });
    var core = items.filter(function (x) { return x.kind !== 'opt'; });
    var hoursDone = 0, hoursAll = 0, mastered = 0, visited = 0;
    core.forEach(function (x) { var h = x.meta ? x.meta.hours : 0; hoursAll += h; if (x.st.satisfied) hoursDone += h; if (x.st.mastered) mastered++; if (x.st.satisfied) visited++; });
    /* Stages: complete when every written required module is mastered and the stage project (if any) is done. */
    var stages = sch.plan.route.stages.map(function (st, si) {
      var req = items.filter(function (x) { return x.stage === si && x.kind === 'core' && x.st.live; });
      var m = req.filter(function (x) { return x.st.mastered; }).length;
      var pr = st.project && PATHS.PROJECTS[st.project] ? projectState(st.project, D) : null;
      return { index: si, name: st.name, required: req.length, mastered: m, modulesMastered: m === req.length, project: pr, complete: m === req.length && (!pr || pr.done) };
    });
    var projects = stages.filter(function (s) { return s.project; }).map(function (s) { return s.project; });
    var projDone = 0, projHours = 0, projHoursDone = 0;
    projects.forEach(function (pr) { projHours += pr.project.hours; if (pr.done) { projDone++; projHoursDone += pr.project.hours; } });
    hoursAll += projHours; hoursDone += projHoursDone;
    var modHoursDone = hoursDone - projHoursDone;
    var left = Math.max(0, sch.total - Math.round(modHoursDone * (1 + PATHS.REVISION)) - projHoursDone);
    /* Study next: unfinished modules in route order; a project follows its stage once that stage's required modules are mastered. */
    var seq = [];
    items.forEach(function (x, i) {
      seq.push({ x: x, i: i });
      var last = !items.slice(i + 1).some(function (y) { return y.stage === x.stage; });
      if (last && stages[x.stage].project) seq.push({ stage: x.stage });
    });
    stages.forEach(function (s) { if (s.project && !items.some(function (y) { return y.stage === s.index; })) seq.push({ stage: s.index }); });
    var next = [];
    seq.forEach(function (e) {
      if (next.length >= 3) return;
      if (e.stage !== undefined) {
        var sg = stages[e.stage];
        if (sg.modulesMastered && !sg.project.done) {
          var ticked = sg.project.ticked;
          next.push({ id: sg.project.id, project: sg.project.project, state: sg.project, kind: 'project', meta: { title: sg.project.project.name, hours: sg.project.project.hours, level: '' },
            why: 'The modules in “' + sg.name + '” are mastered. ' + (ticked ? ticked + ' of ' + sg.project.total + ' project criteria are ticked.' : 'Build the project to finish this stage.') });
        }
        return;
      }
      var x = e.x, i = e.i;
      if (x.st.satisfied || x.kind === 'opt' || !x.meta) return;
      var why;
      var after = items.slice(i + 1).filter(function (y) { return PATHS.needs(y.id, p.lang).indexOf(x.id) >= 0; })[0];
      if (x.st.pct) why = 'You have started it (' + x.st.pct + '% done).';
      else if (after) why = 'Needed before ' + (after.meta ? after.meta.title : after.id) + '.';
      else why = 'Next in “' + sch.plan.route.stages[x.stage].name + '”.';
      next.push({ id: x.id, meta: x.meta, why: why, kind: x.kind });
    });
    return { pref: p, sch: sch, items: items, core: core.length, mastered: mastered, visited: visited, pctHours: hoursAll ? Math.round(hoursDone / hoursAll * 100) : 0, weeksLeft: Math.ceil(left / p.hours), next: next, coverage: coverage(items, p.lang),
      stages: stages, projects: projects, projectsDone: projDone, hoursDone: hoursDone, hoursAll: hoursAll };
  }
  function coverage(items, lang) {
    var bit = { java: 1, python: 2, js: 4, cpp: 8 }[lang] || 1, gaps = [];
    items.forEach(function (x) { if (x.meta && x.kind !== 'opt' && !(x.meta.cover & bit)) gaps.push(x.id); });
    return gaps;
  }
  function href(mid) { var m = meta(mid); return m ? m.track + '.html#' + mid : '#'; }

  /* ---------- spaced review ---------- */
  function reviews() { var r = get('imastery.review', []); return Array.isArray(r) ? r : []; }
  function saveReviews(r) { set('imastery.review', r.slice(0, 300)); }
  function remember(section, mod, title) {
    var r = reviews(), now = Date.now(), cur = r.filter(function (x) { return x.id === section; })[0];
    if (cur) { cur.step = 0; cur.due = now + DAY; cur.misses = (cur.misses || 0) + 1; }
    else r.push({ id: section, mod: mod, title: title, step: 0, due: now + DAY, misses: 1 });
    saveReviews(r);
  }
  function schedule(section, mod, title) {
    var r = reviews();
    if (!r.some(function (x) { return x.id === section; })) { r.push({ id: section, mod: mod, title: title, step: 2, due: Date.now() + STEPS[2] * DAY, misses: 0 }); saveReviews(r); }
  }
  function passed(section) {
    var r = reviews(), cur = r.filter(function (x) { return x.id === section; })[0];
    if (!cur || cur.due > Date.now()) return;
    cur.step++;
    if (cur.step >= STEPS.length) r = r.filter(function (x) { return x !== cur; }); else cur.due = Date.now() + STEPS[cur.step] * DAY;
    saveReviews(r);
  }
  function due() { var now = Date.now(); return reviews().filter(function (x) { return x.due <= now; }).sort(function (a, b) { return a.due - b.due; }); }

  /* ---------- quiz dialog (readiness checks and checkpoints) ---------- */
  function shuffle(a, seed) { var s = seed || 7; a = a.slice(); for (var i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; var j = Math.floor(s / 233280 * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function quizDialog(opts) {
    var qs = opts.questions;
    if (!qs.length) { alert('No questions are available for this check yet.'); return; }
    var dlg = document.createElement('dialog');
    dlg.className = 'qdlg';
    dlg.setAttribute('aria-labelledby', 'qdlgT');
    var h = '<form method="dialog" class="qdlg-in"><div class="qdlg-head"><div><span class="kicker">' + esc(opts.kicker || 'Readiness check') + '</span><h2 id="qdlgT">' + esc(opts.title) + '</h2></div><button class="btn ghost" value="cancel" type="submit" aria-label="Close">✕</button></div>' +
      '<p class="muted">' + esc(opts.intro || ('Answer ' + qs.length + ' questions. ' + Math.round(opts.pass * 100) + '% or more passes.')) + '</p><ol class="qlist">';
    qs.forEach(function (q, i) {
      h += '<li><fieldset><legend>' + q.q + (q.from ? ' <small class="muted">(' + esc(q.from) + ')</small>' : '') + '</legend>' + q.options.map(function (o, k) {
        return '<label class="qopt"><input type="radio" name="q' + i + '" value="' + k + '"> <span>' + o + '</span></label>';
      }).join('') + '<div class="qexp" hidden></div></fieldset></li>';
    });
    h += '</ol><div class="qdlg-foot"><p class="qres" role="status" aria-live="polite"></p><button class="btn primary lg" type="button" data-qsubmit>Check my answers</button><button class="btn lg" type="submit" value="done" data-qclose hidden>Close</button></div></form>';
    dlg.innerHTML = h;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', function () { dlg.remove(); });
    dlg.querySelector('[data-qsubmit]').addEventListener('click', function () {
      var right = 0;
      qs.forEach(function (q, i) {
        var pick = dlg.querySelector('input[name="q' + i + '"]:checked'), ok = pick && +pick.value === q.answer;
        if (ok) right++;
        var fs = dlg.querySelectorAll('fieldset')[i], ex = fs.querySelector('.qexp');
        fs.classList.toggle('ok', !!ok); fs.classList.toggle('bad', !ok);
        ex.hidden = false;
        ex.innerHTML = (ok ? '<b class="c-g">Correct.</b> ' : '<b class="c-r">Answer: ' + q.options[q.answer] + '.</b> ') + (q.explain || '');
        if (!ok && q.section) remember(q.section, q.mod, q.modTitle || q.mod);
      });
      var pct = right / qs.length, pass = pct >= opts.pass;
      dlg.querySelector('.qres').innerHTML = '<b>' + right + ' / ' + qs.length + '</b> · ' + (pass ? (opts.passText || 'Passed.') : (opts.failText || 'Not yet. The missed topics were added to your review list.'));
      if (pass && opts.onPass) opts.onPass();
      this.hidden = true;
      var cl = dlg.querySelector('[data-qclose]'); cl.hidden = false; cl.focus();
    });
    dlg.showModal();
  }
  function loadChecks() {
    if (window.IM_CHECKS) return Promise.resolve(window.IM_CHECKS);
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'assets/checks.js'; s.onload = function () { res(window.IM_CHECKS || {}); }; s.onerror = rej; document.head.appendChild(s); });
  }
  /* Test out of a module's prerequisites: up to 3 questions from each required module. */
  function readiness(mid, lang, onDone) {
    loadChecks().then(function (C) {
      var reqs = PATHS.needs(mid, lang), qs = [];
      reqs.forEach(function (r) { var m = meta(r); (C[r] || []).slice(0, 3).forEach(function (q, i) { qs.push({ q: q[0], options: q[1], answer: q[2], explain: q[3], from: m ? m.title : r, section: r + '-quiz', mod: r, modTitle: m ? m.title : r }); }); });
      qs = shuffle(qs, mid.length * 31).slice(0, 12);
      var m = meta(mid);
      quizDialog({ kicker: 'Readiness check', title: 'Ready for ' + (m ? m.title : mid) + '?', questions: qs, pass: 0.8,
        intro: 'Questions from the modules this one builds on. Score 80% or more to mark them as known and go straight in.',
        passText: 'You know the groundwork. The prerequisites are marked as tested out.',
        onPass: function () { var D = done(); reqs.forEach(function (r) { D['@tested:' + r] = 1; }); set('imastery.done', D); if (window.Auth) Auth.changed(); if (onDone) onDone(); } });
    }, function () { alert('Could not load the readiness questions. Check your connection and try again.'); });
  }
  /* Mixed checkpoint at the end of a zone: questions from every live module of that zone, without topic labels. */
  function checkpoint(track, zone, zoneName, questions, onDone) {
    quizDialog({ kicker: 'Mixed checkpoint', title: zoneName + ' checkpoint', questions: shuffle(questions, track.length * 17 + zone.charCodeAt(0)).slice(0, 12), pass: 0.8,
      intro: 'Twelve mixed questions from across this zone, without topic labels. Score 80% or more to pass; it counts towards mastering each module here.',
      passText: 'Checkpoint passed. Modules in this zone can now count as mastered.',
      onPass: function () { var D = done(); D['@cp:' + track + '-' + zone] = 1; set('imastery.done', D); if (window.Auth) Auth.changed(); if (onDone) onDone(); } });
  }

  return { pref: pref, setPref: setPref, status: status, projectState: projectState, setCriterion: setCriterion, missing: missing, unlocks: unlocks, routeView: routeView, href: href, meta: meta,
    reviews: reviews, remember: remember, schedule: schedule, passed: passed, due: due, quizDialog: quizDialog, readiness: readiness, checkpoint: checkpoint,
    LANG_NAMES: LANG_NAMES, esc: esc, itemsOf: itemsOf };
})();
