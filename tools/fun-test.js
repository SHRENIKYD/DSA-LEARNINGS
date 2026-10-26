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
assert.equal(G.list.length, 43); assert.equal(new Set(G.list.map(g => g.id)).size, 43);
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
  const g = G.get(id), oracle = new Map(g.puzzles().map(x => [x.q, x.opts[x.ans]]));
  for (let pass = 0; pass < 10; pass++) {
    const { box, result } = mounted(id); const [, body, choices, , next] = box.children;
    for (let round = 0; round < 5; round++) {
      let answer = oracle.get(body.innerHTML);
      if (id === 'recursiontrail') { const n = +/walk\((\d+)\)/.exec(body.innerHTML)[1]; const values = Array.from({ length: n + 1 }, (_, i) => i); if (body.innerHTML.indexOf('print(n)') < body.innerHTML.indexOf('walk(n - 1)')) values.reverse(); answer = values.join(' '); }
      const b = choices.children.find(b => b.innerHTML === answer); assert(b, id + ': correct answer must be offered'); click(b); click(b); if (round < 4) click(next);
    }
    assert.equal(result.wins, 1, id + ': full correct run wins once');
  }
}
const c = { window: {}, localStorage: { getItem() { return null; } } }; vm.createContext(c); vm.runInContext(fs.readFileSync(__dirname + '/../src/tracks.js', 'utf8') + fs.readFileSync(__dirname + '/../src/journey.js', 'utf8'), c); c.window.TRACKS = c.TRACKS;
G.list.slice(0, 8).forEach(g => assert(c.TRACKS.find(t => t.id === g.track).modules.some(m => m.id === g.mid), g.id + ' lesson link'));
const stats = c.Journey.stats({}, {}); const world = E.world(c.Journey, stats, c.TRACKS, 'isle'); assert.equal((world.match(/class="floating-island/g) || []).length, 7); assert.match(world, /href="#map\/dsa"/);
const entries = [{ t: '<b>Binary</b>', c: 'DSA', s: 'search', h: 'dsa.html#dsa10' }, { t: 'Binary', c: 'bad', h: 'javascript:alert(1)' }]; const results = E.search(entries, 'binary', c.TRACKS); assert.match(results, /1 results/); assert.match(results, /&lt;b&gt;Binary/); assert.doesNotMatch(results, /javascript:/);
assert.match(E.search(entries, '', c.TRACKS), /Search a topic/); assert.match(E.search(entries, 'nothing', c.TRACKS), /No matches/);
const P = require('../app/play.js'); const week = E.week(P, { '2026-10-19': { g: 1 }, '2026-10-18': { t: 0 } }, new Date(2026, 9, 19, 12)); assert.equal(week.length, 7); assert.equal(week[6].active, true); assert.equal(week[5].active, false);
console.log('PASS: 43-game registry with 2-3 hints each; new-game helpers and generated answers; 90 interactive randomized wins; 250 round answers; win deduplication/failure paths; lesson mappings; BFS distances; real-progress world; safe search; streak calendar');
