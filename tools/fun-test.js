const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const G = require('../app/games.js');
const E = require('../app/experience.js');
function node() {
  let html = ''; const classes = new Set();
  const e = { children: [], style: {}, textContent: '', className: '', disabled: false, hidden: false, events: {}, appendChild(n) { this.children.push(n); return n; }, setAttribute(k, v) { this[k] = v; }, addEventListener(k, f) { this.events[k] = f; }, querySelector() { return node(); }, classList: { add(k) { classes.add(k); }, remove(k) { classes.delete(k); }, toggle(k, on) { if (on) classes.add(k); else classes.delete(k); } } };
  Object.defineProperty(e, 'innerHTML', { get() { return html; }, set(v) { html = v; e.children = []; } });
  return e;
}
global.document = { createElement: node };
function mounted(id) { const box = node(), result = { wins: 0, misses: 0, ticks: 0 }; G.get(id).mount(box, { win() { result.wins++; }, miss() { result.misses++; }, tick() { result.ticks++; } }); return { box, result }; }
function click(b) { if (!b.disabled && b.events.click) b.events.click(); }
assert(G.list.length >= 73); assert.equal(new Set(G.list.map(g => g.id)).size, G.list.length);
// Every pack in app/games/ is registered, loaded by the app page, and each pack game has a lesson, 2-3 hints and a kind.
const packFiles = fs.readdirSync('app/games').filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
assert.deepEqual(G.PACKS.slice().sort(), packFiles, 'Games.PACKS must list every file in app/games');
const appHtml = fs.readFileSync('app/index.html', 'utf8');
packFiles.forEach((p) => assert(appHtml.indexOf('src="app/games/' + p + '.js?v=@@V@@"') > appHtml.indexOf('app/games.js'), 'app/index.html must load app/games/' + p + '.js after games.js'));
assert.equal(new Set(G.list.map((g) => g.title.toLowerCase())).size, G.list.length, 'every game needs its own title');
for (const g of G.list.filter((x) => x.kind)) { assert(['quiz', 'tf', 'odd'].includes(g.kind), g.id + ' kind'); assert(/^[a-z]+\d\d$/.test(g.mid), g.id + ' needs a lesson id'); assert(g.learned && g.title && g.kicker, g.id + ' text'); }
// Every game has 2-3 hints; categories in the registry are all offered as filters.
for (const g of G.list) { assert(Array.isArray(g.hints) && g.hints.length >= 2 && g.hints.length <= 3, g.id + ' needs 2-3 hints'); g.hints.forEach((t) => assert(typeof t === 'string' && t.length > 20, g.id + ' hint too short')); }
const catIds = new Set(G.cats.map((c) => c[0])); G.list.forEach((g) => assert(catIds.has(g.cat), g.id + ' category ' + g.cat + ' has no filter'));
// New-game helpers.
assert.deepEqual(G.rrFinish([5, 2, 3], 2), [1, 2, 0]); assert.deepEqual(G.rrFinish([1, 1], 3), [0, 1]);
assert.equal(G.dsuGroups(4, [[0, 1], [1, 0], [2, 3]]), 2); assert.equal(G.dsuGroups(3, []), 3);
assert.equal(G.bstLevels([1, 2, 3, 4]), 4); assert.equal(G.bstLevels([2, 1, 3]), 2);
assert.equal(G.topoValid(['a', 'b'], { b: ['a'] }), true); assert.equal(G.topoValid(['b', 'a'], { b: ['a'] }), false);
// Generated quizzes: the marked answer always equals a fresh computation from the question text.
const L = 'ABCDEFGH', strip = (x) => x.replace(/<[^>]+>/g, ' ');
for (let pass = 0; pass < 40; pass++) {
  for (const it of G.get('unionfind').puzzles()) {
    const t = strip(it.q), n = t.match(/People:\s+([A-H ]+?)\s+union/)[1].trim().split(/\s+/).length;
    const ops = [...t.matchAll(/union\(([A-H]), ([A-H])\)/g)].map((m) => [L.indexOf(m[1]), L.indexOf(m[2])]);
    assert.equal(it.opts[it.ans], String(G.dsuGroups(n, ops))); assert.equal(new Set(it.opts).size, it.opts.length);
  }
  for (const it of G.get('bstbuild').puzzles()) {
    const keys = strip(it.q).match(/order:\s+([\d, ]+)/)[1].split(',').map(Number);
    assert.equal(it.opts[it.ans], String(G.bstLevels(keys))); assert.equal(new Set(it.opts).size, it.opts.length);
  }
  for (const it of G.get('roundrobin').puzzles()) {
    const t = strip(it.q), q = +t.match(/Quantum\s+(\d)/)[1], b = [...t.matchAll(/([PQRS]) = (\d)/g)].map((m) => +m[2]);
    assert.equal(it.opts[it.ans], G.rrFinish(b, q).map((i) => 'PQRS'[i]).join(' → ')); assert.equal(new Set(it.opts).size, it.opts.length);
  }
  for (const id of ['cppout', 'csref', 'patternpick', 'gitrescue', 'capcall']) { const items = G.get(id).puzzles(); assert.equal(items.length, 5); items.forEach((it) => assert(it.ans >= 0 && it.opts.length >= 3)); }
}
// Course planner: taking any unlocked course every time always wins; a locked course costs a slip.
for (let pass = 0; pass < 30; pass++) {
  const { box, result } = mounted('courseplan'); const buttons = box.children[0].children;
  const needs = new Map(buttons.map((b) => [b._c, (b.innerHTML.match(/needs ([^<]+)/) || [, ''])[1].split(', ').filter(Boolean)]));
  const done = new Set();
  const locked = buttons.find((b) => needs.get(b._c).length); if (locked) { click(locked); assert.equal(result.misses, 1); }
  while (done.size < buttons.length) { const b = buttons.find((x) => !done.has(x._c) && needs.get(x._c).every((n) => done.has(n))); assert(b, 'a course is always available'); click(b); done.add(b._c); }
  assert.equal(result.wins, 1, 'respecting prerequisites wins');
}
assert.deepEqual(G.bfsLayers({ A: ['B', 'C'], B: ['D'], C: ['D'], D: [], X: [] }, 'A'), { A: 0, B: 1, C: 1, D: 2 });
for (let pass = 0; pass < 30; pass++) {
  let { box, result } = mounted('queuecourier'); const parcelButtons = box.children[1].children; parcelButtons.forEach(click); parcelButtons.forEach(click); assert.equal(result.wins, 1, 'queue wins exactly once');
  ({ box, result } = mounted('queuecourier')); const fail = box.children[1].children; click(fail[3]); click(fail[3]); fail.forEach(click); assert.equal(result.wins, 0, 'exhausted queue does not award XP');
  ({ box, result } = mounted('bfsbeacons')); const beacons = box.children[1].children; [0, 2, 1, 4, 3, 5].forEach(i => click(beacons[i])); assert.equal(result.wins, 1, 'same-layer beacon order is flexible');
  ({ box, result } = mounted('windowchef')); const trays = box.children[0].children, a = trays.map(b => +b.innerHTML); const sums = a.slice(0, 5).map((_, i) => a.slice(i, i + 3).reduce((n, x) => n + x, 0)); click(trays[sums.indexOf(Math.max(...sums))]); trays.forEach(click); assert.equal(result.wins, 1, 'best window wins once');
}
for (const id of ['recursiontrail', 'cssduel', 'httprescue', 'transactionvault', 'promptdetective']) {
  const g = G.get(id), oracle = new Map(); (G.fresh.bank(g.puzzles) || g.puzzles()).forEach(x => oracle.set(x.q, x.opts[x.ans]));
  for (let pass = 0; pass < 10; pass++) {
    const { box, result } = mounted(id); const [, body, choices, , next] = box.children;
    for (let round = 0; round < 5; round++) {
      let answer = oracle.get(body.innerHTML);
      if (id === 'recursiontrail') { const t = body.innerHTML.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<'); const n = +/walk\((\d+)\)\s*$/.exec(t)[1], st = +/walk\(n - (\d+)\)/.exec(t)[1], strict = /if n < 0/.test(t); const seq = []; for (let v = n; strict ? v >= 0 : v > 0; v -= st) seq.push(v); const pre = t.indexOf('print(n)') < t.indexOf('walk(n -'), post = t.lastIndexOf('print(n)') > t.indexOf('walk(n -'); answer = (pre && post ? seq.concat(seq.slice().reverse()) : pre ? seq : seq.slice().reverse()).join(' '); }
      const b = choices.children.find(b => b.innerHTML === answer); assert(b, id + ': correct answer must be offered'); click(b); click(b); if (round < 4) click(next);
    }
    assert.equal(result.wins, 1, id + ': full correct run wins once');
  }
}
const c = { window: {}, localStorage: { getItem() { return null; } } }; vm.createContext(c); vm.runInContext(fs.readFileSync(__dirname + '/../src/tracks.js', 'utf8') + fs.readFileSync(__dirname + '/../src/journey.js', 'utf8'), c); c.window.TRACKS = c.TRACKS;
G.list.filter(g => g.track).forEach(g => assert(c.TRACKS.find(t => t.id === g.track).modules.some(m => m.id === g.mid), g.id + ' lesson link'));
// The 30 newer concept quizzes: two per track, each play gives 5 well-formed rounds.
const NEW30 = ['bigoloop', 'maskmagic', 'javacollect', 'javastream', 'pydecor', 'pygen', 'jsthis', 'jsscope', 'cppsmart', 'cppstl', 'csasync', 'cslinq', 'sqlwindow', 'sqlindex', 'solidspot', 'umlrel', 'estimator', 'cachepick', 'a11yfix', 'hookhunt', 'authcheck', 'microfix', 'mlmetric', 'ragfix', 'pagewalk', 'deadlockspot', 'chmodcalc', 'k8sfix', 'starstory', 'offertalk'];
const perTrack = {}; NEW30.forEach((id) => { const g = G.get(id); assert(g, id + ' registered'); perTrack[g.track] = (perTrack[g.track] || 0) + 1; assert(c.TRACKS.find(t => t.id === g.track).modules.some(m => m.id === g.mid), id + ' mid in track');
  for (let pass = 0; pass < 60; pass++) { const items = g.puzzles(); assert.equal(items.length, 5, id + ' 5 rounds'); items.forEach((it) => { assert(it.opts.length >= 3, id + ' needs 3+ options: ' + it.q); assert(it.ans >= 0 && it.ans < it.opts.length, id + ' answer in options'); assert.equal(new Set(it.opts).size, it.opts.length, id + ' distinct options'); assert(typeof it.why === 'string' && it.why.length > 0, id + ' why'); }); } });
assert.equal(Object.keys(perTrack).length, 15); Object.values(perTrack).forEach((n) => assert.equal(n, 2));
const stats = c.Journey.stats({}, {}); const world = E.world(c.Journey, stats, c.TRACKS, 'isle'); assert.equal((world.match(/class="floating-island/g) || []).length, 7); assert.match(world, /href="#map\/dsa"/);
const entries = [{ t: '<b>Binary</b>', c: 'DSA', s: 'search', h: 'dsa.html#dsa10' }, { t: 'Binary', c: 'bad', h: 'javascript:alert(1)' }]; const results = E.search(entries, 'binary', c.TRACKS); assert.match(results, /1 results/); assert.match(results, /&lt;b&gt;Binary/); assert.doesNotMatch(results, /javascript:/);
assert.match(E.search(entries, '', c.TRACKS), /Search a topic/); assert.match(E.search(entries, 'nothing', c.TRACKS), /No matches/);
const P = require('../app/play.js'); const week = E.week(P, { '2026-10-19': { g: 1 }, '2026-10-18': { t: 0 } }, new Date(2026, 9, 19, 12)); assert.equal(week.length, 7); assert.equal(week[6].active, true); assert.equal(week[5].active, false);
// New puzzle: every quiz bank holds at least 30 rounds (150 questions) and none repeats until all are seen.
for (const g of G.list) {
  if (typeof g.puzzles !== 'function') continue;
  const bank = G.fresh.bank(g.puzzles); if (!bank) continue;
  const qs = new Set(bank.map((it) => it.k || it.q));
  assert(qs.size >= 150, g.id + ' has only ' + qs.size + ' questions; it needs 30 rounds of 5');
  G.fresh.reset(g.id); const shown = new Set();
  for (let r = 0; r < Math.floor(qs.size / 5); r++) G.fresh(g.id, g.puzzles).forEach((it) => { const k = it.k || it.q; assert(!shown.has(k), g.id + ' repeated a question before all were seen'); shown.add(k); });
}
console.log('PASS: ' + G.list.length + '-game registry with 2-3 hints each; new-game helpers and generated answers; 90 interactive randomized wins; 250 round answers; win deduplication/failure paths; at least 30 rounds (150 questions) per quiz, none repeated until all are seen; lesson mappings; BFS distances; real-progress world; safe search; streak calendar');
