// Tests the local-reminder planner (app/notify.js): which reminders are scheduled, when, and that settings and quiet hours apply.
const assert = require('assert');
const N = require('../app/notify.js');

const now = new Date(2026, 10, 1, 10, 0); // Sunday 10:00
const base = {
  streak: { days: 5, today: false },
  reviews: [{ due: +new Date(2026, 10, 2, 6), title: 'Prefix sums' }, { due: +new Date(2026, 10, 2, 7), title: 'SQL joins' }],
  next: { title: 'Binary Search', minutes: 45 },
  quests: { xp: 150 },
  level: { level: 7, into: 950, need: 1000 },
  week: { days: 4, games: 9, topics: 12 },
  lastActive: new Date(2026, 10, 1)
};
const by = (list) => Object.fromEntries(list.map((x) => [x.kind, x]));
const hm = (d) => d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');

// Defaults: core + helpful on, opt-in off.
let r = by(N.plan(base, now));
assert.deepStrictEqual(Object.keys(r).sort(), ['level', 'plan', 'quest', 'reviews', 'streak', 'weekly']);
assert.strictEqual(hm(r.streak.at), '1 20:00', 'streak warning tonight when nothing done today');
assert.strictEqual(r.streak.title, 'Your 5-day streak ends tonight');
assert.strictEqual(hm(r.reviews.at), '2 8:00', 'reviews at 8 AM on the due day');
assert.strictEqual(r.reviews.title, '2 sections due for review');
assert.ok(r.reviews.body.startsWith('Prefix sums, SQL joins.'));
assert.strictEqual(hm(r.plan.at), '1 19:00', 'plan at the default study hour');
assert.strictEqual(r.plan.body, 'Next up: Binary Search.');
assert.strictEqual(hm(r.quest.at), '2 9:00', 'quests tomorrow 9 AM once today is past 9');
assert.strictEqual(hm(r.weekly.at), '1 19:30', 'weekly summary this Sunday evening');
assert.ok(r.level.body.includes('50 XP'), 'level-close shows XP left');
assert.ok(new Set(N.plan(base, now).map((x) => x.id)).size === N.plan(base, now).length, 'ids are unique');

// Streak already kept today: warn tomorrow evening; a 1-day streak gets no warning.
r = by(N.plan(Object.assign({}, base, { streak: { days: 5, today: true } }), now));
assert.strictEqual(hm(r.streak.at), '2 20:00');
assert.ok(!by(N.plan(Object.assign({}, base, { streak: { days: 1, today: false } }), now)).streak);

// Groups switch off; opt-in adds come-back nudges at +3 and +7 days.
r = by(N.plan(Object.assign({}, base, { settings: { core: false, helpful: false, optin: true } }), now));
assert.deepStrictEqual(Object.keys(r).sort(), ['nudge3', 'nudge7']);
assert.strictEqual(hm(r.nudge3.at), '4 18:00');
assert.strictEqual(hm(r.nudge7.at), '8 18:00');

// Quiet hours move a reminder to their end; a custom study hour is used.
r = by(N.plan(Object.assign({}, base, { settings: { hour: 21, quietFrom: 20, quietTo: 8 } }), now));
assert.strictEqual(hm(r.plan.at), '2 8:00', '9 PM inside quiet 8 PM–8 AM moves to 8 AM');
assert.strictEqual(hm(r.streak.at), '2 8:00');
assert.strictEqual(hm(N.unquiet(new Date(2026, 10, 1, 23, 0), N.settings(null))), '2 7:00');
assert.strictEqual(hm(N.unquiet(new Date(2026, 10, 1, 15, 0), N.settings(null))), '1 15:00');

// Nothing in the past is scheduled; nothing without data.
const late = new Date(2026, 10, 1, 21, 0);
N.plan(base, late).forEach((x) => assert.ok(x.at > late, x.kind + ' is in the future'));
r = by(N.plan({ streak: { days: 0 }, reviews: [], next: null, quests: { xp: 0 }, level: null, week: { days: 0, games: 0, topics: 0 }, lastActive: null }, now));
assert.ok(!r.streak && !r.reviews && !r.plan && !r.level, 'empty learner gets only quest and weekly');

// Off the app (web), sync does nothing.
N.sync(base).then((x) => { assert.strictEqual(x, false); console.log('notify-test: reminder planner OK'); });
