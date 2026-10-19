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
assert.equal(G.list.length, 34); assert.equal(new Set(G.list.map(g => g.id)).size, 34);
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
console.log('PASS: 34-game registry; 90 interactive randomized wins; 250 round answers; win deduplication/failure paths; lesson mappings; BFS distances; real-progress world; safe search; streak calendar');
