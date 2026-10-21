// Run offline: node tools/video-test.js [built-site-directory]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const V = require('../src/video.js');
const discovery = require('./find-videos.js');
const root = path.join(__dirname, '..');
const db = JSON.parse(fs.readFileSync(path.join(root, 'data/videos.json'), 'utf8'));
const review = JSON.parse(fs.readFileSync(path.join(root, 'data/video-review.json'), 'utf8'));
const topics = new Map(discovery.topics().map((t) => [t.id, t.title]));
let have = 0, curated = 0;
for (const [id, e] of Object.entries(db.videos)) {
  assert(topics.has(id), 'Unknown topic: ' + id);
  assert.equal(e.t, topics.get(id), 'Stale topic mapping: ' + id);
  if (!e.id) continue;
  assert.match(e.id, /^[A-Za-z0-9_-]{11}$/);
  assert(e.title && e.channel, 'Missing video metadata: ' + id);
  assert(Number.isSafeInteger(e.secs) && e.secs >= 0);
  if (e.start !== undefined) assert(Number.isSafeInteger(e.start) && e.start >= 0);
  if (e.end !== undefined) assert(Number.isSafeInteger(e.end) && e.end > (e.start || 0));
  if (e.curated) { assert(e.note && /^\d{4}-\d{2}-\d{2}$/.test(e.reviewedAt)); curated++; }
  assert(V.publicEntry(e, topics.get(id)), 'Unexpectedly hidden video: ' + id);
  have++;
}
for (const e of review.entries) {
  assert.equal(db.videos[e.topic].id, e.id, 'Review does not match catalog: ' + e.topic);
  assert.equal(e.source, V.watchUrl({ id: e.id }));
  assert.equal(db.videos[e.topic].curated, true);
  assert.equal(e.playbackVerified, false, 'Do not claim playback verification from an offline check');
}
const sample = db.videos['dsa09-t2'];
assert.equal(sample.start, 3642);
assert(V.embedUrl(sample).includes('&start=3642&end=4357'));
assert(V.watchUrl(sample).endsWith('&t=3642s'));
assert.equal(V.label(sample), 'Chapter 1:00:42–1:12:37 · ');
assert.equal(V.publicEntry({ ...sample, available: false }, sample.t), null);
assert.equal(V.publicEntry({ ...sample, stale: true }, sample.t), null);
assert.equal(V.publicEntry(sample, 'A different concept'), null);
assert.equal(V.embedUrl({ id: 'https://evil.example' }), '');
assert.equal(V.watchUrl({ id: '" onload="bad' }), '');
assert(!V.embedUrl({ ...sample, start: -1, end: Infinity }).includes('&start='));
assert(!V.embedUrl({ ...sample, start: 10, end: 2 }).includes('&end='));
assert.equal(V.publicEntry({ ...sample, t: 'A &amp; B' }, 'A & B').id, sample.id);
assert.equal(V.publicEntry(db.videos['dsa04-t2'], "Bitwise Operators: &amp;, |, ^, ~, &lt;&lt;, &gt;&gt; and Java's &gt;&gt;&gt;").id, db.videos['dsa04-t2'].id);
const blocked = discovery.availability(sample, null, '2026-10-21');
assert.equal(blocked.id, sample.id, 'Unavailable curated choices must retain their identity');
assert.equal(blocked.curated, true);
assert.equal(blocked.available, false);
assert.equal(discovery.availability({ id: sample.id }, null, '2026-10-21'), null);
assert.equal(discovery.availability(blocked, { embeddable: true, privacy: 'public' }, '2026-10-22').available, true);
assert.equal(discovery.pick([{ id: 'bad', title: 'Amazon behavioral interview leadership principles', channel: 'NeetCode', views: 1e9, secs: 600, embeddable: true, privacy: 'public' }], 'Pattern Picker: Which Pointer Trick Fits?'), null);
// Execute the browser export as well as the CommonJS export.
const browser = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'src/video.js'), 'utf8'), browser);
assert.equal(browser.window.LessonVideo.embedUrl(sample), V.embedUrl(sample));
if (process.argv[2]) {
  const out = path.resolve(process.argv[2]), ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(out, 'assets/videos.js'), 'utf8'), ctx);
  const built = ctx.window.IM_VIDEOS;
  assert.equal(Object.keys(built).length, have, 'Build lost a populated topic');
  for (const [id, e] of Object.entries(db.videos)) if (e.id) {
    assert.equal(built[id].id, e.id);
    assert.equal(built[id].note, e.note);
    assert.equal(built[id].start, e.start || 0);
    assert.equal(built[id].end, e.end || 0);
  }
  const libCtx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(out, 'assets/video-library.js'), 'utf8'), libCtx);
  assert.equal(libCtx.window.IM_VIDEO_LIB.tracks.reduce((n, t) => n + t.items.length, 0), have);
  assert(libCtx.window.LessonVideo, 'Watchtower must have the same playback helper');
}
console.log('PASS: ' + have + ' video mappings (' + curated + ' curated), topic titles, review records, chapter URLs, safe fallbacks and curated-link retention' + (process.argv[2] ? '; built web/app catalogs match' : ''));
