// Picks one embeddable YouTube video per lesson topic and stores it in data/videos.json.
// usage: YOUTUBE_API_KEY=<key> node tools/find-videos.js [--max 95]   search topics that have no video yet
//        YOUTUBE_API_KEY=<key> node tools/find-videos.js --check      drop videos that were removed or can no longer be embedded
// Quota: a search costs 100 units and the free daily quota is 10,000, so --max 95 fits in one day.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const FILE = path.join(root, 'data', 'videos.json');
const API = 'https://www.googleapis.com/youtube/v3/';
const QUERY_PREFIX = { dsa: 'DSA', java: 'Java', py: 'Python', js: 'JavaScript', cpp: 'C++', sql: 'SQL', lld: 'low level design', hld: 'system design', fe: 'frontend', be: 'backend', ai: 'AI', cs: '', beh: 'behavioral interview' };
const TRUSTED = ['freeCodeCamp.org', 'NeetCode', 'NeetCodeIO', 'Abdul Bari', 'take U forward', 'Back To Back SWE', 'William Fiset', 'mycodeschool', 'CS Dojo', 'Fireship', 'ByteByteGo', 'Gaurav Sen', 'Hussein Nasser', 'Computerphile', '3Blue1Brown', 'StatQuest with Josh Starmer', 'Andrej Karpathy', 'Corey Schafer', 'Tech With Tim', 'Web Dev Simplified', 'Traversy Media', 'Amigoscode', 'Telusko', 'Kunal Kushwaha', 'Neso Academy', 'Gate Smashers', 'Jenny\'s Lectures CS IT', 'The Coding Train', 'Programming with Mosh', 'Bro Code', 'Theo - t3․gg', 'Jack Herrington', 'Kevin Powell', 'Net Ninja', 'Coding with John', 'Defog Tech', 'Arpit Bhayani', 'Jordan has no life', 'Exponent', 'IBM Technology', 'Google Cloud Tech', 'AWS Events', 'CppCon', 'Cherno', 'The Cherno', 'mCoding', 'ArjanCodes', 'Hitesh Choudhary', 'Striver'];

function strip(s) { return String(s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim(); }
function seconds(iso) { const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || ''); return m ? (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0) : 0; }
function words(s) { return strip(s).toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 3); }

function topics() {
  const ctx = { console, MODULES: [], window: {} };
  ctx.registerModule = (m) => ctx.MODULES.push(m);
  vm.createContext(ctx);
  for (const f of ['src/helpers.js', 'src/tracks.js', 'src/engine.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  const out = [];
  ctx.TRACKS.forEach((t, ti) => t.modules.forEach((pm, mi) => {
    const f = path.join(root, 'content', t.id, pm.id + '.js');
    if (!fs.existsSync(f)) return;
    ctx.MODULES.length = 0;
    vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
    const m = ctx.MODULES[0];
    if (!m) return;
    (m.topics || []).forEach((tp, i) => out.push({ id: pm.id + '-t' + i, title: strip(tp.title), query: ((QUERY_PREFIX[t.id] || '') + ' ' + strip(tp.title)).trim().slice(0, 120), track: ti, module: mi, topic: i }));
  }));
  return out;
}

// Search order: every module's first topic before any second topic, and within each round the modules of all tracks
// interleaved (module 1 of every track, then module 2 of every track...), so each day's quota reaches every track.
function searchOrder(list) {
  return list.slice().sort((a, b) => a.topic - b.topic || a.module - b.module || a.track - b.track);
}

// Scores the candidates for one topic and returns the best one, or null when none qualifies.
function pick(cands, topicTitle) {
  const want = words(topicTitle);
  let best = null;
  cands.forEach((c, rank) => {
    if (!c.embeddable || c.privacy !== 'public' || c.live) return;
    if (c.secs < 180 || c.secs > 2700) return;
    const have = new Set(words(c.title)), overlap = want.length ? want.filter((w) => have.has(w)).length / want.length : 0;
    if (want.length && overlap < 0.35) return;
    let s = Math.log10((c.views || 0) + 1) + Math.min(1.5, c.views ? (c.likes || 0) / c.views * 40 : 0) + overlap * 2 - rank * 0.25;
    if (TRUSTED.indexOf(c.channel) >= 0) s += 1.5;
    if (c.lang && !/^en/i.test(c.lang)) s -= 1.5;
    if (!best || s > best.score) best = Object.assign({ score: s }, c);
  });
  return best;
}

async function api(endpoint, params) {
  const q = new URLSearchParams(Object.assign({ key: process.env.YOUTUBE_API_KEY }, params));
  const r = await fetch(API + endpoint + '?' + q);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((body.error && body.error.message) || 'HTTP ' + r.status); e.quota = /quota/i.test(JSON.stringify(body.error || {})); throw e; }
  return body;
}
async function details(ids) {
  if (!ids.length) return [];
  const d = await api('videos', { part: 'snippet,contentDetails,statistics,status', id: ids.join(','), maxResults: 50 });
  return (d.items || []).map((v) => ({
    id: v.id, title: v.snippet.title, channel: v.snippet.channelTitle, lang: v.snippet.defaultAudioLanguage || v.snippet.defaultLanguage || '',
    live: v.snippet.liveBroadcastContent !== 'none', secs: seconds(v.contentDetails.duration), views: +v.statistics.viewCount || 0, likes: +v.statistics.likeCount || 0,
    embeddable: !!v.status.embeddable, privacy: v.status.privacyStatus
  }));
}

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return { v: 1, videos: {} }; } }
function availability(entry, meta, checkedAt) {
  const usable = !!(meta && meta.embeddable && meta.privacy === 'public');
  if (!entry.curated) return usable ? entry : null;
  // Keep a curated choice even if removed/blocked, so the daily job cannot
  // silently replace it with another loosely related recommendation.
  return Object.assign({}, entry, { available: usable, availabilityCheckedAt: checkedAt });
}
function save(db) {
  const sorted = {}; Object.keys(db.videos).sort().forEach((k) => { sorted[k] = db.videos[k]; });
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({ v: 1, videos: sorted }, null, 1) + '\n');
}

async function main() {
  if (!process.env.YOUTUBE_API_KEY) { console.log('YOUTUBE_API_KEY is not set: nothing to do.'); return; }
  const args = process.argv.slice(2), max = args.includes('--max') ? +args[args.indexOf('--max') + 1] : 95;
  const db = load(), all = topics(), byId = {};
  all.forEach((t) => { byId[t.id] = t; });
  let removed = 0;
  Object.keys(db.videos).forEach((k) => {
    const e = db.videos[k];
    if (!byId[k] || e.t !== byId[k].title) {
      if (e.curated) e.stale = true;
      else { delete db.videos[k]; removed++; }
    } else if (e.stale) delete e.stale;
  });

  if (args.includes('--check')) {
    const ids = Object.keys(db.videos).filter((k) => db.videos[k].id);
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50), live = {};
      (await details(chunk.map((k) => db.videos[k].id))).forEach((v) => { live[v.id] = v; });
      chunk.forEach((k) => {
        const next = availability(db.videos[k], live[db.videos[k].id], new Date().toISOString());
        if (next) db.videos[k] = next;
        else { delete db.videos[k]; removed++; }
      });
    }
    save(db);
    console.log('check: ' + ids.length + ' videos checked, ' + removed + ' removed');
    return;
  }

  const todo = searchOrder(all.filter((t) => !db.videos[t.id])).slice(0, max);
  let found = 0, none = 0;
  for (const t of todo) {
    try {
      const s = await api('search', { part: 'snippet', q: t.query, type: 'video', maxResults: 8, videoEmbeddable: 'true', videoSyndicated: 'true', safeSearch: 'strict', relevanceLanguage: 'en' });
      const order = (s.items || []).map((x) => x.id.videoId).filter(Boolean), info = {};
      (await details(order)).forEach((v) => { info[v.id] = v; });
      const best = pick(order.map((id) => info[id]).filter(Boolean), t.title);
      if (best) { db.videos[t.id] = { t: t.title, id: best.id, title: best.title, channel: best.channel, secs: best.secs }; found++; }
      else { db.videos[t.id] = { t: t.title, id: null }; none++; }
    } catch (e) {
      if (e.quota) { console.log('quota reached, stopping'); break; }
      console.warn('skip ' + t.id + ': ' + e.message);
    }
  }
  save(db);
  const total = all.length, have = Object.keys(db.videos).filter((k) => db.videos[k].id && db.videos[k].available !== false && !db.videos[k].stale).length;
  console.log('search: ' + found + ' found, ' + none + ' with no good match, ' + removed + ' stale removed · ' + have + '/' + total + ' topics have a video, ' + all.filter((t) => !db.videos[t.id]).length + ' not searched yet');
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { pick, seconds, words, searchOrder, topics, availability };
