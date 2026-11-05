const assert = require('node:assert/strict');
const D = require('./find-videos');
const daily = require('./video-daily');
const day = new Date().toISOString().slice(0, 10);
const ago = n => new Date(Date.parse(day) - n * 864e5).toISOString().slice(0, 10);
const topic = (id, trackId) => ({ id, trackId, title: 'Array traversal', query: 'Array traversal', topic: 0, module: 0, track: 0 });
const all = [topic('a', 'dsa'), topic('b', 'lld'), topic('c', 'csharp'), topic('d', 'hld')];
async function main() {
  const db = { v: 1, videos: {
    c: { t: 'Array traversal', id: null, at: ago(8) },
    d: { t: 'Array traversal', id: null, at: ago(1) }
  } };
  const tasks = daily.queues(db, all).flat();
  assert.equal(new Set(tasks.filter(t => t.type === 'lang').map(t => t.lang)).size, 5, 'all five languages participate');
  assert(tasks.some(t => t.type === 'retry' && t.t.id === 'c'), 'week-old default misses retry');
  assert(!tasks.some(t => t.t.id === 'd'), 'fresh misses wait');
  let calls = 0;
  D.usage.exhausted = false;
  D.setClient(async endpoint => { assert.equal(endpoint, 'search'); calls++; return { items: [] }; });
  let saved = 0;
  const r = await daily.run(db, all, 8, () => saved++);
  assert.equal(r.searched, 8); assert.equal(calls, 8); assert.equal(saved, 8);
  assert(r.remaining > 0, 'one shared budget caps the whole run');
  assert(Object.keys(db.videos.a.byLang || {}).length >= 1, 'language queues receive work');
  // A large budget uses other queues when a track runs out; no same-day retries.
  const next = await daily.run(db, all, 400);
  assert(next.searched > 0 && next.searched < 400);
  assert.equal(next.remaining, 0);
  const again = await daily.run(db, all, 400);
  assert.equal(again.searched, 0, 'same-day misses are not searched repeatedly');
  const oldLang = { videos: { a: { t: all[0].title, id: 'VALIDVIDEO1', byLang: { java: { id: null, at: ago(8) }, python: { id: null, at: ago(1) } } } } };
  const langs = daily.queues(oldLang, [all[0]]).flat();
  assert(langs.some(t => t.lang === 'java'));
  assert(!langs.some(t => t.lang === 'python'));
  const curated = { videos: { a: { t: all[0].title, id: 'CURATED0001', curated: true } } };
  assert(!daily.queues(curated, [all[0]]).flat().some(t => t.type !== 'lang'), 'available curated default stays untouched');
  D.setClient(async () => { D.usage.exhausted = true; throw Object.assign(new Error('quota'), { quota: true }); });
  const stopped = await daily.run({ videos: {} }, all, 360);
  assert.equal(stopped.searched, 1, 'stop all queues when all keys are exhausted');
  D.setClient(null); D.usage.exhausted = false;
  console.log('PASS: shared budget, all languages, spillover, seven-day cooldown, no repeat searches, curated retention and quota stop');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
