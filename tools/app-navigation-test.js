const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const path = require('path');
const root = path.join(__dirname, '..'), nodes = {}, storage = {}, events = {};
function element() { const n = { innerHTML: '', textContent: '', style: {}, children: [], checked: false, offsetWidth: 0, events: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, removeAttribute() {}, addEventListener(k, fn) { this.events[k] = fn; }, appendChild(c) { this.children.push(c); }, scrollIntoView() {}, focus() {}, querySelector() { return element(); }, querySelectorAll() { return []; } }; return n; }
const ctx = { console, Date, setTimeout() { return 1; }, clearTimeout() {}, navigator: {}, location: { pathname: '/index.html', hash: '#home', replace(h) { this.hash = h; } }, localStorage: { getItem(k) { return storage[k] || null; }, setItem(k, v) { storage[k] = v; } }, document: { hidden: false, documentElement: { setAttribute() {}, classList: { toggle() {} } }, querySelector(s) { return nodes[s] ||= element(); }, querySelectorAll() { return []; }, addEventListener() {} }, Sound: { enable() {}, play() {} }, Reader: { configure() {}, close() {}, available() { return false; } }, Auth: { enabled: false, user() { return null; }, changed() { ctx.synced = (ctx.synced || 0) + 1; } }, AppUpdates: { init() {} }, addEventListener(k, f) { events[k] = f; }, matchMedia() { return { matches: false }; }, IM_VERSION: '1.8.0' };
ctx.window = ctx; vm.createContext(ctx);
// The route screen reads the same generated data files as the website (run node tools/build.js first).
const built = ['site', 'app-www'].map(d => path.join(root, d, 'assets')).find(d => fs.existsSync(path.join(d, 'paths-data.js')));
assert.ok(built, 'build the site first: node tools/build.js');
for (const file of ['src/tracks.js', 'src/journey.js', 'src/paths.js', 'src/learn.js', 'app/play.js', 'app/games.js', 'app/experience.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
ctx.SEARCH_INDEX = { entries: [{ t: 'Binary Search', c: 'DSA', s: 'binary', h: 'dsa.html#dsa10' }], modules: { dsa01: { items: ['dsa01-t0', 'dsa01-p0', 'dsa01-quiz'], pl: 'E' } } };
let gameApi;
const get = ctx.Games.get; ctx.Games.get = id => id === 'rewardtest' ? { id: 'rewardtest', title: 'Reward test', kicker: 'Test', goal: 'Test', mid: 'dsa01', learned: 'A real reward should be issued once.', mount(box, api) { gameApi = api; } } : get(id);
for (const f of ['progress-map.js', 'paths-data.js']) vm.runInContext(fs.readFileSync(path.join(built, f), 'utf8'), ctx, { filename: f });
vm.runInContext(fs.readFileSync(path.join(root, 'app/app.js'), 'utf8'), ctx, { filename: 'app/app.js' });
assert.match(nodes['#app'].innerHTML, /LET’S EXPLORE/, 'new travellers see onboarding');
nodes['#beginJourney'].events.click(); events.hashchange(); assert.match(nodes['#app'].innerHTML, /Explore islands/); assert.equal(JSON.parse(storage['imastery.welcomed']), true);
function go(hash) { ctx.location.hash = hash; events.hashchange(); return nodes['#app'].innerHTML; }
assert.equal((go('#world').match(/class="floating-island/g) || []).length, 7);
assert.match(go('#world/peaks'), /Design Peaks/); assert.match(nodes['#app'].innerHTML, /#map\/lld/);
assert.match(go('#map/dsa'), /Programming Foundations/);
assert.match(go('#module/dsa01'), /Programming Foundations/);
assert.match(go('#passport'), /Your stamp passport/); assert.match(nodes['#app'].innerHTML, /0 of 17 collected/);
go('#search'); nodes['#appSearch'].value = 'binary'; nodes['#appSearch'].events.input.call(nodes['#appSearch']); assert.match(nodes['#appSearchResults'].innerHTML, /dsa.html#dsa10/);
assert.match(go('#expedition'), /Today’s expedition/);
assert.match(go('#progress'), /Your journey so far/);
assert.match(go('#play'), /34 games/);
assert.match(go('#badges'), /Open your stamp passport/);
assert.match(go('#me'), /Check for updates/); assert.match(nodes['#app'].innerHTML, /Your progress/);
// Route screen: pickers, schedule, study next, stages and project checklists, all drawn from Learn and PATHS.
assert.match(go('#home'), /href="#route"/, 'home route card opens the app route screen, not the website page');
assert.doesNotMatch(nodes['#app'].innerHTML, /href="route\.html"/);
let rt = go('#route');
assert.match(rt, /Your route/); assert.match(rt, /Destination/); assert.match(rt, /Code language/); assert.match(rt, /Hours per week/);
assert.equal((rt.match(/name="rtRoute"/g) || []).length, ctx.PATHS.ROUTES.length, 'one radio per route');
assert.equal((rt.match(/name="rtHours"/g) || []).length, 4);
assert.match(rt, /Schedule/); assert.match(rt, /Study next/); assert.match(rt, /Stages/); assert.match(rt, /Extensions after the route/);
const pref = ctx.Learn.pref(), view = ctx.Learn.routeView(pref), projStages = view.stages.filter(x => x.project);
assert.ok(projStages.length >= 2, 'default route has projects');
assert.equal((rt.match(/type="checkbox" data-proj=/g) || []).length, projStages.reduce((n, x) => n + x.project.total, 0), 'every project criterion has a checkbox');
assert.match(rt, /Done when every criterion is ticked \(0 of /);
// Ticking criteria is stored in the synced progress map and drives project and route progress.
const sp = projStages[0].project, before = view.hoursDone, syncedBefore = ctx.synced || 0;
const tick = (pid, i, on) => nodes['#scr'].events.change({ target: { getAttribute: k => ({ 'data-proj': pid, 'data-i': String(i) })[k], checked: on } });
tick(sp.id, 0, true);
assert.equal(JSON.parse(storage['imastery.done'])['@proj:' + sp.id + ':0'], 1); assert.ok(ctx.synced > syncedBefore, 'ticks are announced to account sync');
assert.match(nodes['#app'].innerHTML, new RegExp('Done when every criterion is ticked \\(1 of ' + sp.total));
assert.equal(ctx.Learn.projectState(sp.id).done, false, 'one tick is not enough');
for (let i = 1; i < sp.total; i++) tick(sp.id, i, true);
assert.equal(ctx.Learn.projectState(sp.id).done, true); assert.match(nodes['#app'].innerHTML, /· done/);
assert.equal(ctx.Learn.routeView(pref).hoursDone, before + sp.project.hours, 'a done project adds its hours to route progress');
tick(sp.id, 0, false);
assert.equal(ctx.Learn.projectState(sp.id).done, false); assert.equal(ctx.Learn.routeView(pref).hoursDone, before, 'unticking removes it again');
assert.equal(JSON.parse(storage['imastery.done'])['@proj:' + sp.id + ':0'], undefined);
// A stage is complete only when its required modules are mastered and its project is done; study next then points at the project.
const first = projStages[0], D0 = JSON.parse(storage['imastery.done']);
const D1 = Object.assign({}, D0);
view.items.filter(x => x.stage <= first.index && x.st.live).forEach(x => { ctx.Learn.itemsOf(x.id).ids.forEach(id => { D1[id] = 1; }); D1['@tested:' + x.id] = 1; });
for (let i = 1; i < sp.total; i++) delete D1['@proj:' + sp.id + ':' + i];
storage['imastery.done'] = JSON.stringify(D1);
let v2 = ctx.Learn.routeView(pref);
assert.equal(v2.stages[first.index].modulesMastered, true); assert.equal(v2.stages[first.index].complete, false, 'mastered modules without the project do not complete the stage');
assert.equal(v2.next[0].kind, 'project'); assert.equal(v2.next[0].id, sp.id);
rt = go('#route'); assert.match(rt, /data-proj-link="/); assert.match(rt, /project not done yet/);
for (let i = 0; i < sp.total; i++) tick(sp.id, i, true);
v2 = ctx.Learn.routeView(pref);
assert.equal(v2.stages[first.index].complete, true); assert.notEqual(v2.next[0] && v2.next[0].id, sp.id);
assert.match(nodes['#app'].innerHTML, /Stage complete/);
// Pickers change the route through the shared preference store.
nodes['#scr'].events.change({ target: { name: 'rtHours', value: '20' } }); assert.equal(ctx.Learn.pref().hours, 20);
nodes['#scr'].events.change({ target: { name: 'rtRoute', value: 'frontend' } }); assert.equal(ctx.Learn.pref().id, 'frontend'); assert.match(nodes['#app'].innerHTML, /Frontend/);
storage['imastery.done'] = JSON.stringify({}); delete storage['imastery.route'];
go('#game/rewardtest'); gameApi.win(); const once = storage['imastery.play']; gameApi.win(); assert.equal(storage['imastery.play'], once, 'duplicate win callback cannot grant more XP'); assert.equal(JSON.parse(once).games.rewardtest.wins, 1);
assert.match(go('#expedition'), /reward collected/);
storage['imastery.done'] = JSON.stringify({ 'dsa01-t0': true }); // A lesson tick is persisted by the existing lesson engine.
// Rebuild the passport directly against changed progress, as the route does.
assert.match(go('#passport'), /1 of 17 collected/);
console.log('PASS: actual app startup, onboarding, home/world/track/module/search/passport/quest/progress/play/badge/settings routes, live stamps, game win deduplication, quest integration and the route screen with project checklists');
