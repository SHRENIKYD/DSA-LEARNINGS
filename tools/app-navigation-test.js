const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const path = require('path');
const root = path.join(__dirname, '..'), nodes = {}, storage = {}, events = {};
function element() { const n = { innerHTML: '', textContent: '', style: {}, children: [], checked: false, offsetWidth: 0, events: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, removeAttribute() {}, addEventListener(k, fn) { this.events[k] = fn; }, appendChild(c) { this.children.push(c); }, scrollIntoView() {}, focus() {}, querySelector() { return element(); }, querySelectorAll() { return []; } }; return n; }
const ctx = { console, Date, setTimeout() { return 1; }, clearTimeout() {}, navigator: {}, location: { pathname: '/index.html', hash: '#home', replace(h) { this.hash = h; } }, localStorage: { getItem(k) { return storage[k] || null; }, setItem(k, v) { storage[k] = v; } }, document: { hidden: false, documentElement: { setAttribute() {}, classList: { toggle() {} } }, querySelector(s) { return nodes[s] ||= element(); }, querySelectorAll() { return []; }, addEventListener() {} }, Sound: { enable() {}, play() {} }, Reader: { configure() {}, close() {}, available() { return false; } }, Auth: { enabled: false, user() { return null; } }, AppUpdates: { init() {} }, addEventListener(k, f) { events[k] = f; }, matchMedia() { return { matches: false }; }, IM_VERSION: '1.8.0' };
ctx.window = ctx; vm.createContext(ctx);
for (const file of ['src/tracks.js', 'src/journey.js', 'app/play.js', 'app/games.js', 'app/experience.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
ctx.SEARCH_INDEX = { entries: [{ t: 'Binary Search', c: 'DSA', s: 'binary', h: 'dsa.html#dsa10' }], modules: { dsa01: { items: ['dsa01-t0', 'dsa01-p0', 'dsa01-quiz'], pl: 'E' } } };
let gameApi;
const get = ctx.Games.get; ctx.Games.get = id => id === 'rewardtest' ? { id: 'rewardtest', title: 'Reward test', kicker: 'Test', goal: 'Test', mid: 'dsa01', learned: 'A real reward should be issued once.', mount(box, api) { gameApi = api; } } : get(id);
vm.runInContext(fs.readFileSync(path.join(root, 'app/app.js'), 'utf8'), ctx, { filename: 'app/app.js' });
assert.match(nodes['#app'].innerHTML, /LET’S EXPLORE/, 'new travellers see onboarding');
nodes['#beginJourney'].events.click(); events.hashchange(); assert.match(nodes['#app'].innerHTML, /Explore islands/); assert.equal(JSON.parse(storage['imastery.welcomed']), true);
function go(hash) { ctx.location.hash = hash; events.hashchange(); return nodes['#app'].innerHTML; }
assert.equal((go('#world').match(/class="floating-island/g) || []).length, 6);
assert.match(go('#world/peaks'), /Design Peaks/); assert.match(nodes['#app'].innerHTML, /#map\/lld/);
assert.match(go('#map/dsa'), /Programming Foundations/);
assert.match(go('#module/dsa01'), /Programming Foundations/);
assert.match(go('#passport'), /Your stamp passport/); assert.match(nodes['#app'].innerHTML, /0 of 16 collected/);
go('#search'); nodes['#appSearch'].value = 'binary'; nodes['#appSearch'].events.input.call(nodes['#appSearch']); assert.match(nodes['#appSearchResults'].innerHTML, /dsa.html#dsa10/);
assert.match(go('#expedition'), /Today’s expedition/);
assert.match(go('#progress'), /Your journey so far/);
assert.match(go('#play'), /34 games/);
assert.match(go('#badges'), /Open your stamp passport/);
assert.match(go('#me'), /Check for updates/); assert.match(nodes['#app'].innerHTML, /Your progress/);
go('#game/rewardtest'); gameApi.win(); const once = storage['imastery.play']; gameApi.win(); assert.equal(storage['imastery.play'], once, 'duplicate win callback cannot grant more XP'); assert.equal(JSON.parse(once).games.rewardtest.wins, 1);
assert.match(go('#expedition'), /reward collected/);
storage['imastery.done'] = JSON.stringify({ 'dsa01-t0': true }); // A lesson tick is persisted by the existing lesson engine.
// Rebuild the passport directly against changed progress, as the route does.
assert.match(go('#passport'), /1 of 16 collected/);
console.log('PASS: actual app startup, onboarding, home/world/track/module/search/passport/quest/progress/play/badge/settings routes, live stamps, game win deduplication and quest integration');
