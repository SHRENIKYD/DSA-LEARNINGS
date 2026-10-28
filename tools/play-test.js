// Unit tests for app/play.js  —  usage: node tools/play-test.js
const assert = require('assert');
const Play = require('../app/play.js');
let n = 0;
function t(name, fn) { fn(); n++; console.log('PASS ' + name); }

const SI = { modules: { x01: { items: ['x01-t0', 'x01-t0-q0', 'x01-t1', 'x01-p0', 'x01-p1', 'x01-p2', 'x01-quiz', 'x01-iv'], pl: 'EMH' }, x02: { items: ['x02-t0'], pl: '' } } };
const TRACKS = [{ id: 'x', modules: [{ id: 'x01', num: 1, level: 'B', title: 'One' }, { id: 'x02', num: 2, level: 'B', title: 'Two' }, { id: 'x03', num: 3, level: 'I', title: 'Unwritten' }] }];
const day = (s) => new Date(s + 'T12:00:00');

t('item kinds and XP', () => {
  assert.strictEqual(Play.kind('x01-t3'), 'topic');
  assert.strictEqual(Play.kind('x01-t3-q1'), 'guided');
  assert.strictEqual(Play.kind('x01-p12'), 'practice');
  assert.strictEqual(Play.kind('x01-quiz'), 'quiz');
  assert.strictEqual(Play.kind('x01-iv'), 'iv');
  assert.strictEqual(Play.itemXP('x01-p0', 'EMH'), 15);
  assert.strictEqual(Play.itemXP('x01-p2', 'EMH'), 40);
  assert.strictEqual(Play.itemXP('x01-p9', 'EMH'), 25);
  assert.strictEqual(Play.moduleOf('dsa06-t0-q1'), 'dsa06');
});

t('totals count XP, completion bonus and unwritten modules', () => {
  const all = {}; SI.modules.x01.items.forEach((id) => (all[id] = true));
  const r = Play.totals(all, SI, TRACKS);
  assert.strictEqual(r.modules.x01.xp, 10 + 20 + 10 + 15 + 25 + 40 + 30 + 15 + 100);
  assert.strictEqual(r.modules.x01.complete, true);
  assert.strictEqual(r.modules.x01.practiceDone, 3);
  assert.strictEqual(r.modules.x02.complete, false);
  assert.strictEqual(r.modules.x03, undefined);
  assert.strictEqual(r.tracks.x.live, 2);
  assert.strictEqual(r.completeModules, 1);
  assert.strictEqual(Play.totals({}, SI, TRACKS).xp, 0);
});

t('levels: level n needs 100 + 50n XP', () => {
  assert.deepStrictEqual([Play.levelOf(0).level, Play.levelOf(0).need], [1, 150]);
  assert.strictEqual(Play.levelOf(149).level, 1);
  assert.strictEqual(Play.levelOf(150).level, 2);
  assert.strictEqual(Play.levelOf(150 + 200).level, 3);
  assert.strictEqual(Play.levelOf(150 + 200 + 250 + 300 + 350 + 400).level, 7);
  assert.strictEqual(Play.levelOf(150 + 200 + 250 + 300 + 350 + 400).need, 450);
  assert.strictEqual(Play.levelOf(0).name, 'Loop Learner');
  assert.strictEqual(Play.levelOf(150 + 200 + 250 + 300 + 350 + 400).name, 'Pointer Pro');
});

t('streak counts back from today or yesterday, with 2 freezes a month', () => {
  const a = { t: 1 };
  assert.strictEqual(Play.streak({ '2026-10-14': a, '2026-10-15': a, '2026-10-16': a }, day('2026-10-16')).days, 3);
  assert.strictEqual(Play.streak({ '2026-10-14': a, '2026-10-15': a }, day('2026-10-16')).days, 2);
  assert.strictEqual(Play.streak({ '2026-10-14': a, '2026-10-15': a }, day('2026-10-16')).today, false);
  const gap = Play.streak({ '2026-10-12': a, '2026-10-13': a, '2026-10-15': a, '2026-10-16': a }, day('2026-10-16'));
  assert.strictEqual(gap.days, 4);
  assert.strictEqual(gap.freezesLeft, 1);
  assert.strictEqual(Play.streak({ '2026-10-12': a, '2026-10-15': a, '2026-10-16': a }, day('2026-10-16')).days, 2);
  assert.strictEqual(Play.streak({}, day('2026-10-16')).days, 0);
});

t('observe credits only new ticks to today; first run backfills nothing', () => {
  let s = Play.emptyState();
  let r = Play.observe(s, { 'x01-t0': true }, day('2026-10-16'));
  assert.deepStrictEqual(r.fresh, []);
  r = Play.observe(r.state, { 'x01-t0': true, 'x01-t1': true, 'x01-p0': true, 'x01-quiz': true }, day('2026-10-16'));
  assert.deepStrictEqual(r.fresh.sort(), ['x01-p0', 'x01-quiz', 'x01-t1']);
  assert.deepStrictEqual(r.state.days['2026-10-16'], { t: 1, q: 1, x: 1 });
  r = Play.observe(r.state, { 'x01-t1': true }, day('2026-10-16'));
  assert.ok(!r.state.seen['x01-t0']);
  r = Play.observe(r.state, { 'x01-t1': true, 'x01-t0': true }, day('2026-10-16'));
  assert.deepStrictEqual(r.fresh, ['x01-t0']);
});

t('quests complete and pay out once', () => {
  const s = Play.emptyState(); s.seen = {};
  s.days['2026-10-16'] = { t: 1, q: 2 };
  const q = Play.quests(s, day('2026-10-16'));
  assert.deepStrictEqual(q.map((x) => x.done), [true, true, false]);
  assert.strictEqual(Play.claim(s, day('2026-10-16')), 60);
  assert.strictEqual(Play.claim(s, day('2026-10-16')), 0);
  assert.strictEqual(s.bonus, 60);
  assert.strictEqual(Play.quests(s, day('2026-10-17'))[0].done, false);
});

t('games: first win 25 XP, later wins 5 XP up to 10 a day; counts toward quest and streak', () => {
  const s = Play.emptyState(); s.seen = {};
  assert.strictEqual(Play.winGame(s, 'guess', day('2026-10-16')), 25);
  assert.strictEqual(Play.winGame(s, 'guess', day('2026-10-16')), 5);
  for (let i = 0; i < 10; i++) Play.winGame(s, 'race', day('2026-10-16'));  // 1 first win + 9 replays → 10 replays today
  assert.strictEqual(Play.winGame(s, 'race', day('2026-10-16')), 0);
  assert.strictEqual(Play.winGame(s, 'race', day('2026-10-17')), 5);
  assert.strictEqual(s.bonus, 25 + 5 + 25 + 9 * 5 + 5);
  assert.strictEqual(s.games.guess.wins, 2);
  assert.strictEqual(Play.quests(s, day('2026-10-16'))[2].done, true);
  assert.strictEqual(Play.streak(s.days, day('2026-10-16')).days, 1);
});

t('summary adds bonus XP and computes badges', () => {
  const s = Play.emptyState(); s.seen = {}; s.bonus = 40;
  const r = Play.summary({ 'x01-t0': true }, s, SI, TRACKS, day('2026-10-16'));
  assert.strictEqual(r.xp, 50);
  assert.strictEqual(r.badges.filter((b) => b.id === 'first')[0].earned, true);
  assert.strictEqual(r.badges.filter((b) => b.id === 'st7')[0].earned, false);
});

t('games helpers: bracket balance and inversion count', () => {
  global.document = { createElement() { return {}; } };
  const G = require('../app/games.js');
  assert.strictEqual(G.balanced('([]{})'), true);
  assert.strictEqual(G.balanced('([)]'), false);
  assert.strictEqual(G.balanced('(('), false);
  assert.strictEqual(G.inversions([3, 1, 2]), 2);
  assert.strictEqual(G.inversions([1, 2, 3]), 0);
  assert.strictEqual(G.list.length, 73);
  assert.notStrictEqual(G.random('guess').id, 'guess');
  assert.strictEqual(new Set(G.list.map((g) => g.id)).size, G.list.length);
  ['sql', 'java', 'js', 'py', 'cs', 'web', 'ai'].forEach((c) => { assert.ok(G.inCat(c).length >= 1, c); for (let i = 0; i < 20; i++) assert.strictEqual(G.random(null, c).cat, c); });
  assert.strictEqual(G.inCat('all').length, G.list.length);
});

t('new game logic: Python slicing and coin change', () => {
  const G = require('../app/games.js'), a = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const S = (s, e, st) => G.pySlice(a, s, e, st).join('');
  assert.strictEqual(S(1, 4, 1), 'bcd');
  assert.strictEqual(S(-3, null, 1), 'efg');
  assert.strictEqual(S(null, -2, 1), 'abcde');
  assert.strictEqual(S(null, null, -1), 'gfedcba');
  assert.strictEqual(S(null, null, -2), 'geca');
  assert.strictEqual(S(5, 1, -1), 'fedc');
  assert.strictEqual(S(5, 2, 1), '');
  assert.strictEqual(S(1, null, 2), 'bdf');
  assert.strictEqual(S(-1, null, 1), 'g');
  assert.deepStrictEqual(G.minCoins([1, 3, 4], 6), [3, 3]);
  assert.deepStrictEqual(G.greedyCoins([1, 3, 4], 6), [4, 1, 1]);
  assert.strictEqual(G.minCoins([1, 5, 6], 10).length, 2);
});

t('video picker: filters unusable videos and prefers a relevant, popular, trusted one', () => {
  const V = require('./find-videos.js');
  assert.strictEqual(V.seconds('PT1H2M3S'), 3723);
  assert.strictEqual(V.seconds('PT9M'), 540);
  const base = { embeddable: true, privacy: 'public', live: false, secs: 600, views: 1000, likes: 10, channel: 'Someone', lang: 'en', title: 'random video' };
  const c = [
    Object.assign({}, base, { id: 'short', secs: 60, views: 9e7, title: 'Two pointers container most water' }),
    Object.assign({}, base, { id: 'blocked', embeddable: false, views: 9e7 }),
    Object.assign({}, base, { id: 'other', views: 2e6, title: 'Learn guitar fast' }),
    Object.assign({}, base, { id: 'good', views: 3e5, likes: 9000, channel: 'NeetCode', title: 'Container With Most Water - Two Pointers' })
  ];
  assert.strictEqual(V.pick(c, 'Container With Most Water (Two Pointers)').id, 'good');
  assert.strictEqual(V.pick([c[0], c[1]], 'x'), null);
});

console.log(n + ' tests passed');
