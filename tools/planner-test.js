// Unit test of src/planner.js in Node: fake localStorage and fake IM_PATHMETA/IM_MODS, real PATHS and Learn.
// Usage: node tools/planner-test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; console.log('ok  ' + msg); };
const eq = (a, b, msg) => { assert.equal(JSON.stringify(a), JSON.stringify(b), msg + ' (got ' + JSON.stringify(a) + ')'); passed++; console.log('ok  ' + msg); };

function fresh() {
  const store = {};
  const ctx = {
    console,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    CustomEvent: function (t) { this.type = t; },
    alert: () => { },
    document: null,
    events: [],
  };
  ctx.window = ctx;
  ctx.dispatchEvent = (e) => { ctx.events.push(e.type); };
  vm.createContext(ctx);
  for (const f of ['src/paths.js', 'src/learn.js', 'src/planner.js']) vm.runInContext(rd(f), ctx, { filename: f });
  // Fake build-time maps for every module of the SDE / Java route: 2 h, 3 topics, 2 practice problems, a riddle gate.
  const TR = { java: 'java', py: 'py', js: 'js', cpp: 'cpp', dsa: 'dsa', sql: 'sql', cs: 'cs', lld: 'lld', hld: 'hld', beh: 'beh', be: 'be', fe: 'fe', ai: 'ai', devops: 'devops' };
  const PM = {}, MODS = {};
  const pl = ctx.PATHS.plan('sde', 'java');
  pl.items.concat(pl.extensions.map((id) => ({ id }))).forEach((it) => {
    const tr = TR[/^[a-z]+/.exec(it.id)[0]];
    PM[it.id] = ['Title ' + it.id, tr, 'B', 2, 15, 5, 5, 2];
    MODS[it.id] = [3, [1, 1, 1], 2, 1, 1];
  });
  ctx.IM_PATHMETA = PM; ctx.IM_MODS = MODS;
  ctx.store = store;
  ctx.set = (k, v) => { store[k] = JSON.stringify(v); };
  ctx.get = (k) => (k in store ? JSON.parse(store[k]) : null);
  ctx.ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  ctx.plusDays = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return ctx.ymd(d); };
  // satisfy a module the way the learner would: every item ticked
  ctx.finish = (id) => { const D = ctx.get('imastery.done') || {}; ctx.Learn.itemsOf(id).ids.forEach((x) => { D[x] = 1; }); ctx.set('imastery.done', D); };
  return ctx;
}

const todayDow = new Date().getDay();
const notToday = (todayDow + 3) % 7;

// ---- 1. Explore all: the planner reads prefs but never changes mode or the stored route
{
  const c = fresh();
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'all', onboarded: true, updatedAt: 1 });
  const before = c.store['imastery.route'];
  c.Planner.effective(); c.Planner.next(); c.Planner.today(); c.Planner.weeks();
  eq(c.Learn.mode(), 'all', 'Explore all mode is unchanged by planner reads');
  eq(c.store['imastery.route'], before, 'planner reads never write imastery.route');
}

// ---- 2. no interview date: nothing trimmed, budget null
{
  const c = fresh();
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'path', onboarded: true, restDay: notToday, updatedAt: 1 });
  const e = c.Planner.effective(), all = c.Planner.items();
  eq(e.budgetHours, null, 'no date: budget is null');
  eq(e.trimmed.length, 0, 'no date: nothing is trimmed');
  eq(e.list.length, all.length, 'no date: every path module is on the effective list');
  eq(c.Planner.daysLeft(), null, 'daysLeft is null without a date');
}

// ---- 3. tight date: optional modules go first, then recommended; core is always kept
{
  const c = fresh();
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 5, mode: 'path', onboarded: true, restDay: notToday, interviewDate: c.plusDays(7), updatedAt: 1 });
  const e = c.Planner.effective();
  ok(e.short && e.budgetHours !== null && e.budgetHours < e.usedHours, 'one week at 5 h/wk is marked short');
  ok(e.list.every((x) => x.kind === 'core'), 'only core modules survive a one-week budget');
  ok(e.trimmed.some((x) => x.kind === 'opt') && e.trimmed.some((x) => x.kind === 'rec'), 'optional and recommended modules are trimmed');
  eq(e.mockHours, Math.round(Math.min(5, 5 * 0.15) * 10) / 10, 'mock hours are 15% of the budget, capped at one week');
  // the first date on which the recommended modules fit: they are kept while the optional ones are still trimmed
  let e2 = null;
  for (let d = 7; d < 400 && !e2; d++) {
    c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'path', onboarded: true, restDay: notToday, interviewDate: c.plusDays(d), updatedAt: 1 });
    const ex = c.Planner.effective();
    if (ex.list.some((x) => x.kind === 'rec') && !ex.trimmed.some((x) => x.kind === 'rec')) e2 = ex;
  }
  ok(e2 && e2.list.some((x) => x.kind === 'rec'), 'recommended modules are kept as soon as they fit');
  ok(e2.trimmed.length > 0 && e2.trimmed.every((x) => x.kind === 'opt'), 'optional modules are trimmed before recommended ones');
}

// ---- 4. fast track: last core module of a stage passed with 85%+ skips that stage's recommended modules
{
  const c = fresh();
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'path', onboarded: true, restDay: notToday, updatedAt: 1 });
  const items = c.Planner.items(), recs = items.filter((x) => x.kind === 'rec');
  ok(recs.length > 0, 'the SDE route has recommended modules to fast-track');
  const st = recs[0].stage, master = items.filter((x) => x.kind === 'core' && x.stage === st).pop();
  c.finish(master.id);
  c.Planner.recordScore(master.id, 70);
  eq(c.Planner.effective().fast.length, 0, 'a 70% score does not fast-track');
  c.Planner.recordScore(master.id, 90);
  const e = c.Planner.effective();
  eq(e.fast.map((x) => x.id).sort(), recs.filter((x) => x.stage === st).map((x) => x.id).sort(), 'a 90% score on the stage master fast-tracks its recommended modules');
  ok(!e.list.some((x) => e.fast.indexOf(x) >= 0), 'fast-tracked modules leave the effective list');
  ok(c.events.includes('im:plan'), 'recordScore dispatches im:plan');
}

// ---- 5. weak score: review + practice inserted once; next() puts them first; completing clears them
{
  const c = fresh();
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'path', onboarded: true, restDay: notToday, updatedAt: 1 });
  const first = c.Planner.items()[0];
  c.finish(first.id);
  c.Planner.recordScore(first.id, 35);
  const ins = c.Planner.inserted();
  eq(ins.map((x) => x.kind), ['review', 'practice'], 'a 35% score inserts one review and one practice item');
  eq(c.Planner.next().kind, 'review', 'next() is the inserted review');
  ok(/-t0$/.test(c.Planner.next().href) && c.Planner.next().href.indexOf(first.id) >= 0, 'review links into the module');
  c.Planner.recordScore(first.id, 35);
  eq(c.Planner.inserted().length, 2, 'a second weak score does not insert twice');
  c.Planner.completeReview(first.id);
  eq(c.Planner.inserted().length, 0, 'completeReview clears the inserted items');
  eq(c.Planner.next().kind, 'lesson', 'next() falls back to the first unfinished lesson');
  ok(c.Planner.next().mod !== first.id, 'the finished module is not next');
  // re-passing the gate after a weak score counts as the review
  const second = c.Planner.items()[1];
  c.finish(second.id); c.Planner.recordScore(second.id, 40);
  eq(c.Planner.inserted().length, 2, 'another weak module inserts again');
  c.Planner.recordScore(second.id, 75);
  eq(c.Planner.inserted().length, 0, 'passing the gate again (75%) completes the review automatically');
}

// ---- 6. catch-up: missed days spread over the week, capped at 1.5x; nothing until there is any activity
{
  const c = fresh();
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'path', onboarded: true, restDay: notToday, updatedAt: 1 });
  eq(c.Planner.missed(), 0, 'no activity log: no catch-up');
  eq(c.Planner.dayMinutes(), 100, '10 h/wk over 6 days is 100 minutes');
  c.set('imastery.days', [c.plusDays(-20)]);
  ok(c.Planner.missed() >= 1, 'days since the rest day without activity count as missed');
  ok(c.Planner.dayMinutes() <= 150 && c.Planner.dayMinutes() >= 100, 'catch-up is capped at 1.5x the daily budget');
  c.set('imastery.days', [c.plusDays(-1), c.plusDays(0)]);
  eq(c.Planner.streak(), 2, 'two consecutive days make a 2-day streak');
}

// ---- 7. rest day: zero minutes, only due reviews listed
{
  const c = fresh();
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'path', onboarded: true, restDay: todayDow, updatedAt: 1 });
  const t = c.Planner.today();
  eq(t.minutes, 0, 'rest day has a 0-minute budget');
  ok(t.rest && t.items.length === 0, 'rest day lists no lessons');
  c.set('imastery.review', [{ id: 'dsa01-quiz', mod: 'dsa01', title: 'x', step: 0, due: Date.now() - 1000, misses: 1 }]);
  eq(c.Planner.today().items.map((x) => x.kind), ['review'], 'due spaced reviews still show on a rest day');
}

// ---- 8. today's plan: reviews first, lessons in 40-minute parts with a practice block, within budget
{
  const c = fresh();
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'path', onboarded: true, restDay: notToday, updatedAt: 1 });
  c.set('imastery.review', [{ id: 'dsa01-t1', mod: 'dsa01', title: 'Arrays', step: 0, due: Date.now() - 1000, misses: 1 }]);
  const t = c.Planner.today();
  eq(t.items[0].kind, 'review', 'due review comes first');
  ok(t.items[0].href === 'dsa.html#dsa01-t1', 'due review links to its section');
  const les = t.items.filter((x) => x.kind === 'lesson');
  ok(les.length >= 1 && les.every((x) => x.minutes <= 40), 'lessons are split into parts of at most 40 minutes');
  ok(t.items.some((x) => x.kind === 'practice' && /-p0$/.test(x.href)), 'a practice block of problems follows the lesson');
  ok(t.used <= t.minutes, 'planned minutes stay within the budget');
  // a finished item stays listed, struck through
  const l0 = les[0];
  const D = c.get('imastery.done') || {}; D[l0.id] = 1; c.set('imastery.done', D);
  const t2 = c.Planner.today();
  ok(t2.items.some((x) => x.id === l0.id && x.done), 'a finished item stays on today\'s list as done');
}

// ---- 9. interview mode: a mock round in the final week, none before
{
  const c = fresh();
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'path', onboarded: true, restDay: notToday, interviewDate: c.plusDays(3), updatedAt: 1 });
  eq(c.Planner.daysLeft(), 3, 'daysLeft counts to the interview date');
  ok(c.Planner.today().items.some((x) => x.kind === 'mock'), 'a mock round is planned within 7 days of the interview');
  c.Planner.recordMock(80);
  ok(!c.Planner.today().items.some((x) => x.kind === 'mock' && !x.done), 'a recorded mock is not planned again today');
  eq(c.get('imastery.done')['@mock:' + c.plusDays(0)], 80, 'the mock result is stored as @mock:<date>');
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'path', onboarded: true, restDay: notToday, interviewDate: c.plusDays(30), updatedAt: 1 });
  c.set('imastery.today', null);
  ok(!c.Planner.today().items.some((x) => x.kind === 'mock'), 'no mock round a month before the interview');
}

// ---- 10. placement
{
  const c = fresh();
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'path', onboarded: true, restDay: notToday, updatedAt: 1 });
  const items = c.Planner.items(), javaN = items.filter((x) => x.track === 'java').length;
  eq(c.Planner.placement('beginner'), 0, 'beginner placement marks nothing');
  eq(c.Planner.placement('lang'), javaN, 'knows-the-language marks every language module as tested');
  eq(c.Planner.placement('langdsa'), 6, 'language + DSA basics adds the first 6 DSA modules');
  eq(c.Learn.pref().placement, 'langdsa', 'the placement level is remembered in prefs');
  ok(c.Learn.status(items.filter((x) => x.track === 'dsa')[0].id).satisfied, 'placed modules count as satisfied');
  ok(c.Planner.next().mod !== items[0].id, 'next() moves past the placed modules');
  ok(c.Planner.placementProof('lang') === items.filter((x) => x.track === 'dsa')[0].id, 'the readiness alternative for "lang" is the first DSA module');
}

// ---- 11. forecast
{
  const c = fresh();
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'path', onboarded: true, restDay: notToday, updatedAt: 1 });
  const w = c.Planner.weeks(), e = c.Planner.effective();
  eq(w.hoursLeft, e.list.reduce((a, x) => a + x.hours, 0), 'hoursLeft sums the effective list');
  eq(w.weeks, Math.ceil(w.hoursLeft / 10), 'weeks = hours left / weekly hours');
  ok(w.stages.length > 1 && w.stages.every((s, i) => !i || s.byWeek >= w.stages[i - 1].byWeek), 'stage weeks are cumulative');
  ok(w.fits, 'without a date the plan fits');
  c.finish(c.Planner.items()[0].id);
  ok(c.Planner.weeks().hoursLeft === w.hoursLeft - 2, 'finishing a module takes its hours off the forecast');
}

// ---- 12. mock questions: 12 at most, spread across modules
{
  const c = fresh();
  c.set('imastery.route', { id: 'sde', lang: 'java', hours: 10, mode: 'path', onboarded: true, restDay: notToday, updatedAt: 1 });
  const mods = c.Planner.items().slice(0, 8), Q = {};
  mods.forEach((x) => { Q[x.id] = [0, 1, 2, 3, 4].map((i) => ({ q: x.id + ' q' + i, options: ['a', 'b', 'c'], answer: 1, explain: '' })); });
  const qs = c.Planner.mockQuestions(Q, {}, mods, 5);
  eq(qs.length, 12, 'a mock round has 12 questions');
  const per = {}; qs.forEach((q) => { per[q.mod] = (per[q.mod] || 0) + 1; });
  ok(Object.keys(per).length >= 6 && Object.values(per).every((n) => n <= 2), 'questions are spread across modules (at most 2 each)');
  ok(qs.every((q) => q.mod && q.section === q.mod + '-quiz'), 'each question carries its module and section for review scheduling');
}

console.log('\nplanner-test: ' + passed + ' assertions passed');
