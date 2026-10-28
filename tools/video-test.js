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
const topicTrack = new Map(discovery.topics().map((t) => [t.id, t.trackId]));
let langPicks = 0;
let have = 0, curated = 0;
const unavailable = [];
for (const [id, e] of Object.entries(db.videos)) {
  assert(topics.has(id), 'Unknown topic: ' + id);
  assert.equal(e.t, topics.get(id), 'Stale topic mapping: ' + id);
  for (const [l, b] of Object.entries(e.byLang || {})) {
    assert(discovery.LANGS[l], 'Unknown byLang language: ' + id + '.' + l);
    assert(discovery.LANG_TRACKS.includes(topicTrack.get(id)), 'byLang only belongs on dsa/lld topics: ' + id);
    if (!b.id) continue;
    assert.match(b.id, /^[A-Za-z0-9_-]{11}$/, 'Bad byLang id: ' + id + '.' + l);
    assert(b.title && b.channel && Number.isSafeInteger(b.secs) && b.secs >= 0, 'Missing byLang metadata: ' + id + '.' + l);
    langPicks++;
  }
  if (!e.id) continue;
  assert.match(e.id, /^[A-Za-z0-9_-]{11}$/);
  assert(e.title && e.channel, 'Missing video metadata: ' + id);
  assert(Number.isSafeInteger(e.secs) && e.secs >= 0);
  if (e.start !== undefined) assert(Number.isSafeInteger(e.start) && e.start >= 0);
  if (e.end !== undefined) assert(Number.isSafeInteger(e.end) && e.end > (e.start || 0));
  if (e.curated) { assert(e.note && /^\d{4}-\d{2}-\d{2}$/.test(e.reviewedAt)); curated++; }
  // A video YouTube reports as unavailable stays in the catalog for review but must be hidden (docs/VIDEOS.md).
  if (e.available === false) { assert.equal(V.publicEntry(e, topics.get(id)), null, 'Unavailable video still shown: ' + id); unavailable.push(id); continue; }
  else assert(V.publicEntry(e, topics.get(id)), 'Unexpectedly hidden video: ' + id);
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
// Per-language picks: byLang wins, otherwise the default; a byLang-only entry yields null for other languages.
const ID_A = 'AAAAAAAAAAA', ID_B = 'BBBBBBBBBBB', ID_C = 'CCCCCCCCCCC';
const raw = { t: 'Arrays', id: ID_A, title: 'Arrays', channel: 'X', secs: 300, byLang: { python: { id: ID_B, title: 'Python arrays', channel: 'Y', secs: 400 }, js: { id: 'bad id', title: 'x' }, cpp: { id: ID_C, available: false }, ruby: { id: ID_C } } };
const pub = V.publicEntry(raw, 'Arrays');
assert.deepEqual(Object.keys(pub.byLang), ['python'], 'byLang keeps only valid, available, known languages');
assert.equal(V.pick(pub, 'python').id, ID_B);
assert.equal(V.pick(pub, 'python').perLang, true);
assert.equal(V.pick(pub, 'python').lang, 'python');
for (const l of ['java', 'js', 'cpp', '', 'nope']) { const p = V.pick(pub, l); assert.equal(p.id, ID_A, 'fallback for ' + l); assert.equal(p.perLang, false); assert(!('byLang' in p)); }
const only = V.publicEntry({ t: 'Arrays', byLang: { python: { id: ID_B, title: 'P', channel: 'Y', secs: 1 } } }, 'Arrays');
assert.equal(V.pick(only, 'python').id, ID_B);
assert.equal(V.pick(only, 'java'), null);
assert.equal(V.publicEntry({ t: 'Arrays', byLang: { python: { id: 'bad' } } }, 'Arrays'), null);
assert.equal(V.publicEntry(raw, 'Other'), null);
assert.equal(V.pick(null, 'python'), null);
// window.IM_VIDEOS resolves per read, from the stored route (the lesson page reads IM_VIDEOS[id] unchanged).
const store = { 'imastery.route': JSON.stringify({ id: 'sde', lang: 'python' }) };
const env = { window: {}, localStorage: { getItem: (k) => (k in store ? store[k] : null) } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'src/video.js'), 'utf8') + '\nwindow.R=window.LessonVideo.resolveAll({a:' + JSON.stringify(pub) + '});', env);
assert.equal(env.window.R.a.id, ID_B);
store['imastery.route'] = JSON.stringify({ id: 'sde', lang: 'java' });
assert.equal(env.window.R.a.id, ID_A);
delete store['imastery.route'];
assert.equal(env.window.R.a.id, ID_A, 'no chosen language: default pick');

// A miss is retried once it is RETRY_DAYS old; an undated (older-format) miss retries now.
{
  const d = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  assert.equal(discovery.due({ id: null }), true, 'undated miss is retried');
  assert.equal(discovery.due({ id: null, at: d(1) }), false, 'fresh miss waits');
  assert.equal(discovery.due({ id: null, at: d(discovery.RETRY_DAYS) }), true, 'old miss is retried');
  const all = discovery.topics(), t = all.find((x) => x.trackId === 'dsa');
  const fresh = { videos: { [t.id]: { t: t.title, byLang: { csharp: { id: null, at: d(1) } } } } };
  const old = { videos: { [t.id]: { t: t.title, byLang: { csharp: { id: null, at: d(40) } } } } };
  assert.ok(!discovery.langTodo(all, fresh, 'csharp').some((x) => x.id === t.id), 'fresh language miss is not searched again');
  assert.ok(discovery.langTodo(all, old, 'csharp').some((x) => x.id === t.id), 'old language miss is searched again');
}

// Matching: bracketed notes are dropped and short acronyms count as words.
// API errors: the daily quota stops the run; per-minute limits and server errors are retried; others are per-topic errors.
{
  const q = discovery.apiError(403, { error: { message: 'The request cannot be completed because you have exceeded your quota.', errors: [{ reason: 'quotaExceeded' }] } });
  assert.equal(q.quota, true); assert.equal(q.retry, false); assert.match(q.message, /^quotaExceeded: /);
  const rl = discovery.apiError(403, { error: { message: 'Rate limit', errors: [{ reason: 'rateLimitExceeded' }] } });
  assert.equal(rl.quota, false); assert.equal(rl.retry, true);
  assert.equal(discovery.apiError(503, {}).retry, true);
  const bad = discovery.apiError(400, { error: { message: 'bad key', errors: [{ reason: 'keyInvalid' }] } });
  assert.equal(bad.quota, false); assert.equal(bad.retry, false);
}
assert.equal(discovery.core('BST Search & Insert (and Min, Max, Floor, Ceil)'), 'BST Search & Insert');
assert.deepEqual(discovery.words('DFS on a grid with LRU cache'), ['dfs', 'grid', 'lru', 'cache']);
assert.ok(discovery.pick([{ id: 'LONGLECTURE', title: 'BST search and insert full lecture', channel: 'X', embeddable: true, privacy: 'public', live: false, secs: 4800, views: 1000, likes: 50 }], 'BST Search & Insert (and Min, Max)'), 'an 80-minute lecture can be picked');

// find-videos --lang with a mocked YouTube client (no network, no key).
(async () => {
  const all = discovery.topics(), calls = [];
  const dsaTopic = all.find((t) => t.trackId === 'dsa'), beTopic = all.find((t) => t.trackId === 'be');
  discovery.setClient(async (endpoint, params) => {
    calls.push([endpoint, params]);
    if (endpoint === 'search') return { items: [{ id: { videoId: 'GOODVIDEO01' } }, { id: { videoId: 'OFFLANG0001' } }] };
    return { items: [
      { id: 'GOODVIDEO01', snippet: { title: 'Python ' + dsaTopic.title + ' explained', channelTitle: 'NeetCode', liveBroadcastContent: 'none' }, contentDetails: { duration: 'PT10M' }, statistics: { viewCount: '100000', likeCount: '4000' }, status: { embeddable: true, privacyStatus: 'public' } },
      { id: 'OFFLANG0001', snippet: { title: 'Java ' + dsaTopic.title + ' explained', channelTitle: 'Other', liveBroadcastContent: 'none' }, contentDetails: { duration: 'PT10M' }, statistics: { viewCount: '9000000', likeCount: '90000' }, status: { embeddable: true, privacyStatus: 'public' } }
    ] };
  });
  const mem = { v: 1, videos: { [dsaTopic.id]: { t: dsaTopic.title, id: ID_A, title: 'd', channel: 'c', secs: 60 } } };
  assert(discovery.langTodo(all, mem, 'python').every((t) => ['dsa', 'lld'].includes(t.trackId)), 'only dsa/lld topics are searched per language');
  assert(!discovery.langTodo(all, mem, 'python').some((t) => t.id === beTopic.id));
  const r = await discovery.searchLang(mem, all, 'python', 2);
  assert.equal(r.searched, 2);
  assert.equal(mem.videos[dsaTopic.id].id, ID_A, 'default pick is untouched');
  assert.equal(mem.videos[dsaTopic.id].byLang.python.id, 'GOODVIDEO01', 'a Python search must not keep a Java-titled video');
  const q = calls.find((c) => c[0] === 'search')[1].q;
  assert(q.startsWith('Python '), 'query is prefixed with the language: ' + q);
  assert.equal(calls.find((c) => c[0] === 'search')[1].videoEmbeddable, 'true');
  assert(!discovery.langTodo(all, mem, 'python').some((t) => t.id === dsaTopic.id), 'already-picked topics are not searched again');
  assert(discovery.langTodo(all, mem, 'cpp').some((t) => t.id === dsaTopic.id), 'other languages are still todo');
  // A curated pick YouTube no longer serves is replaced by a searched one; the old pick is kept in "was".
  const pyMem = { v: 1, videos: {} };
  const ct = all.find((t) => t.trackId === 'dsa' && t.id !== dsaTopic.id);
  discovery.setClient(async (endpoint) => endpoint === 'search' ? { items: [{ id: { videoId: 'REPLACEMENT' } }] } : { items: [
    { id: 'REPLACEMENT', snippet: { title: discovery.core(ct.title) + ' tutorial', channelTitle: 'NeetCode', liveBroadcastContent: 'none' }, contentDetails: { duration: 'PT12M' }, statistics: { viewCount: '9000', likeCount: '400' }, status: { embeddable: true, privacyStatus: 'public' } }] });
  pyMem.videos[ct.id] = { t: ct.title, id: 'GONEVIDEO01', title: 'Old', channel: 'Old', secs: 300, curated: true, note: 'n', reviewedAt: '2026-01-01', available: false };
  assert.ok(discovery.needsDefault(pyMem, ct), 'a removed curated video is due for a replacement search');
  const rr = await discovery.searchDefault(pyMem, all.filter((t) => t.id === ct.id), 5);
  assert.equal(rr.replaced, 1);
  assert.equal(pyMem.videos[ct.id].id, 'REPLACEMENT', 'the replacement becomes the shown video');
  assert.equal(pyMem.videos[ct.id].curated, undefined, 'the replacement is a bot pick, not curated');
  assert.equal(pyMem.videos[ct.id].was.id, 'GONEVIDEO01', 'the removed curated pick is kept for review');
  assert.ok(!discovery.needsDefault(pyMem, ct), 'a replaced topic is not searched again');
  // A dated default miss waits; an undated one is searched.
  assert.ok(!discovery.needsDefault({ videos: { [ct.id]: { t: ct.title, id: null, at: new Date().toISOString().slice(0, 10) } } }, ct));
  assert.ok(discovery.needsDefault({ videos: { [ct.id]: { t: ct.title, id: null } } }, ct));
  discovery.setClient(null);
  // Several API keys: a key that reports its daily quota hands over to the next one; the last one's quota stops the run.
  {
    const realFetch = global.fetch, seen = [];
    process.env.YOUTUBE_API_KEYS = 'KEY_A, KEY_B'; discovery.keyState.at = 0;
    assert.deepEqual(discovery.apiKeys(), ['KEY_A', 'KEY_B']);
    const quotaBody = { error: { message: 'quota', errors: [{ reason: 'quotaExceeded' }] } };
    global.fetch = async (url) => { const k = new URL(url).searchParams.get('key'); seen.push(k);
      return k === 'KEY_A' ? { ok: false, status: 403, json: async () => quotaBody } : { ok: true, status: 200, json: async () => ({ items: [] }) }; };
    const best = await discovery.searchBest('DSA arrays', 'Arrays', '');
    assert.equal(best, null); assert.deepEqual(seen.slice(0, 2), ['KEY_A', 'KEY_B'], 'switches to the second key after a quota error');
    global.fetch = async () => ({ ok: false, status: 403, json: async () => quotaBody });
    await assert.rejects(discovery.searchBest('DSA arrays', 'Arrays', ''), (e) => e.quota === true, 'the last key\'s quota stops the run');
    global.fetch = realFetch; delete process.env.YOUTUBE_API_KEYS; discovery.keyState.at = 0;
  }
  finish();
})().catch((e) => { console.error(e); process.exit(1); });

function finish() {
// Execute the browser export as well as the CommonJS export.
const browser = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'src/video.js'), 'utf8'), browser);
assert.equal(browser.window.LessonVideo.embedUrl(sample), V.embedUrl(sample));
if (process.argv[2]) {
  const out = path.resolve(process.argv[2]), ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(out, 'assets/videos.js'), 'utf8'), ctx);
  const built = ctx.window.IM_VIDEOS;
  const raws = ctx.window.IM_VIDEOS_RAW;
  assert(raws, 'Build must keep the raw catalog with byLang');
  const withDefault = Object.keys(raws).filter((k) => raws[k].id);
  assert.equal(withDefault.length, have, 'Build lost a populated topic');
  for (const [id, e] of Object.entries(db.videos)) if (e.id && e.available !== false) {
    assert.equal(built[id].id, e.id);
    assert.deepEqual(Object.keys(raws[id].byLang || {}).sort(), Object.keys(e.byLang || {}).filter((l) => e.byLang[l].id && e.byLang[l].available !== false).sort(), 'Build lost byLang for ' + id);
    assert.equal(built[id].note, e.note || '');
    assert.equal(built[id].start, e.start || 0);
    assert.equal(built[id].end, e.end || 0);
  }
  const libCtx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(out, 'assets/video-library.js'), 'utf8'), libCtx);
  assert.equal(libCtx.window.IM_VIDEO_LIB.tracks.reduce((n, t) => n + t.items.length, 0), have + Object.keys(raws).length - withDefault.length);
  assert(libCtx.window.LessonVideo, 'Watchtower must have the same playback helper');
}
if (unavailable.length) console.log('Review needed: ' + unavailable.length + ' video(s) no longer available on YouTube and hidden until replaced: ' + unavailable.join(', '));
console.log('PASS: ' + have + ' video mappings (' + curated + ' curated), ' + langPicks + ' per-language picks, per-language fallback, mocked --lang search, topic titles, review records, chapter URLs, safe fallbacks and curated-link retention' + (process.argv[2] ? '; built web/app catalogs match' : ''));
}
