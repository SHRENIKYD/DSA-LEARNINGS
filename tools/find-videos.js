// Picks one embeddable YouTube video per lesson topic and stores it in data/videos.json.
// usage: YOUTUBE_API_KEY=<key> node tools/find-videos.js [--max 95]   search topics that have no video yet
//        YOUTUBE_API_KEY=<key> node tools/find-videos.js --check      drop videos that were removed or can no longer be embedded (default picks and byLang picks)
//        YOUTUBE_API_KEY=<key> node tools/find-videos.js --lang python [--max 40]   search dsa/lld topics that lack a byLang.python pick (java|python|js|cpp|csharp)
// Quota: a search costs 100 units and the free daily quota is 10,000 per Google Cloud project, so --max 95 fits in one day.
// Several keys (each from its own project) can be given as YOUTUBE_API_KEYS=k1,k2,k3: the run moves to the next key when one
// reports its daily quota, and --per-key multiplies --max by the number of keys.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const FILE = path.join(root, 'data', 'videos.json');
const API = 'https://www.googleapis.com/youtube/v3/';
const QUERY_PREFIX = { dsa: 'DSA', java: 'Java', py: 'Python', js: 'JavaScript', cpp: 'C++', csharp: 'C#', sql: 'SQL', lld: 'low level design', hld: 'system design', fe: 'frontend', be: 'backend', ai: 'AI', cs: '', beh: 'behavioral interview' };
const TRUSTED = ['freeCodeCamp.org', 'NeetCode', 'NeetCodeIO', 'Abdul Bari', 'take U forward', 'Back To Back SWE', 'William Fiset', 'mycodeschool', 'CS Dojo', 'Fireship', 'ByteByteGo', 'Gaurav Sen', 'Hussein Nasser', 'Computerphile', '3Blue1Brown', 'StatQuest with Josh Starmer', 'Andrej Karpathy', 'Corey Schafer', 'Tech With Tim', 'Web Dev Simplified', 'Traversy Media', 'Amigoscode', 'Telusko', 'Kunal Kushwaha', 'Neso Academy', 'Gate Smashers', 'Jenny\'s Lectures CS IT', 'The Coding Train', 'Programming with Mosh', 'Bro Code', 'Theo - t3․gg', 'Jack Herrington', 'Kevin Powell', 'Net Ninja', 'Coding with John', 'Defog Tech', 'Arpit Bhayani', 'Jordan has no life', 'Exponent', 'IBM Technology', 'Google Cloud Tech', 'AWS Events', 'CppCon', 'Cherno', 'The Cherno', 'mCoding', 'ArjanCodes', 'Hitesh Choudhary', 'Striver'];

const LANGS = { java: { name: 'Java', re: /\bjava\b/i }, python: { name: 'Python', re: /\bpython\b/i }, js: { name: 'JavaScript', re: /\b(javascript|js|node\.?js|typescript)\b/i }, cpp: { name: 'C++', re: /(c\+\+|\bcpp\b)/i }, csharp: { name: 'C#', re: /(c#|\bc ?sharp\b|\.net\b|\bdotnet\b)/i } };
const LANG_TRACKS = ['dsa', 'lld'];

// A topic with no good match is retried after this many days (YouTube keeps adding videos); older misses without a date retry now.
const RETRY_DAYS = 30;
const today = () => new Date().toISOString().slice(0, 10);
function due(miss) { return !miss.at || (Date.parse(today()) - Date.parse(miss.at)) / 864e5 >= RETRY_DAYS; }
function strip(s) { return String(s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim(); }
function seconds(iso) { const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || ''); return m ? (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0) : 0; }
// Topic notes in brackets ("BST search (and min, max)") are dropped from queries and matching; acronyms such as BST,
// DFS or LRU count as words even though they are short.
function core(s) { return strip(s).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim() || strip(s); }
// Filler words carry no topic meaning; leaving them out lets a title match on the words that matter.
const STOP = new Set(['with', 'from', 'into', 'using', 'your', 'what', 'when', 'that', 'this', 'their', 'than', 'then', 'them', 'they', 'have', 'does', 'each', 'more', 'most', 'also', 'only', 'over', 'very', 'about', 'basics', 'introduction', 'intro']);
function words(s) {
  return strip(s).split(/[^A-Za-z0-9+#]+/).filter((w) => w.length > 3 || /^[A-Z][A-Z0-9+#]{1,4}$/.test(w) || /^(c\+\+|c#)$/i.test(w)).map((w) => w.toLowerCase()).filter((w) => !STOP.has(w));
}

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
    (m.topics || []).forEach((tp, i) => out.push({ id: pm.id + '-t' + i, title: strip(tp.title), trackId: t.id, query: ((QUERY_PREFIX[t.id] || '') + ' ' + core(tp.title)).trim().slice(0, 120), track: ti, module: mi, topic: i }));
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
  const want = words(core(topicTitle));
  let best = null;
  cands.forEach((c, rank) => {
    if (!c.embeddable || c.privacy !== 'public' || c.live) return;
    if (c.secs < 180 || c.secs > 5400) return; // 3 to 90 minutes
    const have = new Set(words(c.title)), overlap = want.length ? want.filter((w) => have.has(w)).length / want.length : 0;
    if (want.length && overlap < 0.3) return; // at least ~a third of the topic's meaningful words in the title
    let s = Math.log10((c.views || 0) + 1) + Math.min(1.5, c.views ? (c.likes || 0) / c.views * 40 : 0) + overlap * 2 - rank * 0.25;
    if (TRUSTED.indexOf(c.channel) >= 0) s += 1.5;
    if (c.lang && !/^en/i.test(c.lang)) s -= 1.5;
    if (!best || s > best.score) best = Object.assign({ score: s }, c);
  });
  return best;
}

let client = null; // tests replace this with a fixture; production uses the YouTube Data API below
// Quota units this process spent (search = 100, videos = 1), printed with every summary so a key shared with another
// project shows up as "quota reached" long before ~10,000 units.
const usage = { units: 0 };
const COST = { search: 100, videos: 1 };
// Google's error reason decides what happens: the daily quota stops the run; per-minute limits and server errors are
// retried with a growing pause (up to 3 tries); anything else is a normal error for that topic.
function apiError(status, body) {
  const err = (body && body.error) || {}, reason = (err.errors && err.errors[0] && err.errors[0].reason) || err.status || ('HTTP ' + status);
  const e = new Error(reason + ': ' + (err.message || 'HTTP ' + status));
  e.reason = reason;
  // Google also reports the per-day search limit as rateLimitExceeded ("... limit 'Search Queries per day'"): that is a
  // daily quota too, not a per-minute limit, so retrying is pointless and the next key should take over.
  e.quota = /^(quotaExceeded|dailyLimitExceeded)$/.test(reason) || (reason === 'rateLimitExceeded' && /per day/i.test(err.message || ''));
  e.retry = !e.quota && (/^(rateLimitExceeded|userRateLimitExceeded|backendError|internalError)$/.test(reason) || status >= 500);
  return e;
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
function apiKeys() { return String(process.env.YOUTUBE_API_KEYS || process.env.YOUTUBE_API_KEY || '').split(',').map((k) => k.trim()).filter(Boolean); }
const keyState = { at: 0 };
async function api(endpoint, params) {
  usage.units += COST[endpoint] || 1;
  if (client) return client(endpoint, params);
  const keys = apiKeys();
  for (let attempt = 1; ; attempt++) {
    const q = new URLSearchParams(Object.assign({ key: keys[keyState.at] }, params));
    const r = await fetch(API + endpoint + '?' + q);
    const body = await r.json().catch(() => ({}));
    if (r.ok) return body;
    const e = apiError(r.status, body);
    if (e.quota && keyState.at + 1 < keys.length) { keyState.at++; console.log('key ' + keyState.at + ' of ' + keys.length + ' used up its daily quota; switching to key ' + (keyState.at + 1)); attempt = 0; continue; }
    if (!e.retry || attempt >= 3) throw e;
    console.warn('retrying ' + endpoint + ' after ' + e.message);
    await pause(2000 * attempt);
  }
}
function setClient(fn) { client = fn; }
async function details(ids) {
  if (!ids.length) return [];
  const d = await api('videos', { part: 'snippet,contentDetails,statistics,status', id: ids.join(','), maxResults: 50 });
  return (d.items || []).map((v) => ({
    id: v.id, title: v.snippet.title, channel: v.snippet.channelTitle, desc: v.snippet.description || '', lang: v.snippet.defaultAudioLanguage || v.snippet.defaultLanguage || '',
    live: v.snippet.liveBroadcastContent !== 'none', secs: seconds(v.contentDetails.duration), views: +v.statistics.viewCount || 0, likes: +v.statistics.likeCount || 0,
    embeddable: !!v.status.embeddable, privacy: v.status.privacyStatus
  }));
}

async function searchBest(query, title, lang) {
  const s = await api('search', { part: 'snippet', q: query, type: 'video', maxResults: lang ? 15 : 8, videoEmbeddable: 'true', videoSyndicated: 'true', safeSearch: 'strict', relevanceLanguage: 'en' });
  const order = (s.items || []).map((x) => x.id.videoId).filter(Boolean), info = {};
  (await details(order)).forEach((v) => { info[v.id] = v; });
  let cands = order.map((id) => info[id]).filter(Boolean);
  // The language may be named in the title, the channel or the description ("Code in Java: ...").
  if (lang) cands = cands.filter((c) => LANGS[lang].re.test(c.title + ' ' + c.channel + ' ' + String(c.desc || '').slice(0, 400)));
  return pick(cands, title);
}

// Topics in the language-dependent tracks (dsa, lld) that have no byLang[lang] pick yet, in searchOrder.
function langTodo(all, db, lang) {
  const pickOf = (t) => db.videos[t.id] && db.videos[t.id].byLang && db.videos[t.id].byLang[lang];
  return searchOrder(all.filter((t) => LANG_TRACKS.indexOf(t.trackId) >= 0 && (!pickOf(t) || (!pickOf(t).id && due(pickOf(t))))));
}
async function searchLang(db, all, lang, max) {
  const todo = langTodo(all, db, lang).slice(0, max);
  let found = 0, none = 0, searched = 0;
  for (const t of todo) {
    try {
      const best = await searchBest(LANGS[lang].name + ' ' + core(t.title), t.title, lang);
      searched++;
      const e = db.videos[t.id] || (db.videos[t.id] = { t: t.title });
      e.byLang = e.byLang || {};
      if (best) { e.byLang[lang] = { id: best.id, title: best.title, channel: best.channel, secs: best.secs }; found++; }
      else { e.byLang[lang] = { id: null, at: today() }; none++; }
    } catch (e) {
      if (e.quota) { console.log('quota reached after ~' + usage.units + ' units this run, stopping (' + e.message + ')'); break; }
      console.warn('skip ' + t.id + ': ' + e.message);
    }
  }
  return { found, none, searched, remaining: langTodo(all, db, lang).length };
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

// The default (language-neutral) pass. An entry that only holds byLang picks (no "id" key) still needs its default
// search; a dated miss (id null) is retried after RETRY_DAYS; a curated video YouTube no longer serves (available
// false) gets a searched replacement, with the old pick kept in "was" (an unsuccessful replacement search retries
// after RETRY_DAYS too).
function needsDefault(db, t) {
  const e = db.videos[t.id];
  if (!e) return true;
  if (e.curated) return e.available === false && due({ at: e.searchedAt });
  return e.id === undefined || (e.id === null && due(e));
}
async function searchDefault(db, all, max) {
  const todo = searchOrder(all.filter((t) => needsDefault(db, t))).slice(0, max);
  let found = 0, none = 0, replaced = 0;
  for (const t of todo) {
    try {
      const best = await searchBest(t.query, t.title, '');
      const prev = db.videos[t.id], keep = prev && prev.byLang ? { byLang: prev.byLang } : {};
      if (prev && prev.curated) {
        if (!best) { prev.searchedAt = today(); none++; continue; } // stays hidden for review until a replacement is found
        keep.was = { id: prev.id, title: prev.title, channel: prev.channel, note: prev.note, reviewedAt: prev.reviewedAt, replacedAt: today() };
        replaced++;
      }
      if (best) { db.videos[t.id] = Object.assign({ t: t.title, id: best.id, title: best.title, channel: best.channel, secs: best.secs }, keep); found++; }
      else { db.videos[t.id] = Object.assign({ t: t.title, id: null, at: today() }, keep); none++; }
    } catch (e) {
      if (e.quota) { console.log('quota reached after ~' + usage.units + ' units this run, stopping (' + e.message + ')'); break; }
      console.warn('skip ' + t.id + ': ' + e.message);
    }
  }
  return { found, none, replaced };
}

async function main() {
  if (!apiKeys().length) { console.log('YOUTUBE_API_KEY / YOUTUBE_API_KEYS is not set: nothing to do.'); return; }
  const args = process.argv.slice(2), lang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : '';
  if (args.includes('--lang') && !LANGS[lang]) { console.error('--lang must be one of: ' + Object.keys(LANGS).join(', ')); process.exit(1); }
  const max = (args.includes('--max') ? +args[args.indexOf('--max') + 1] : (lang ? 40 : 95)) * (args.includes('--per-key') ? apiKeys().length : 1);
  if (apiKeys().length > 1) console.log(apiKeys().length + ' API keys; up to ' + max + ' searches this pass');
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
    const refs = [];
    Object.keys(db.videos).forEach((k) => {
      if (db.videos[k].id) refs.push({ k, id: db.videos[k].id });
      Object.keys(db.videos[k].byLang || {}).forEach((l) => { if (db.videos[k].byLang[l] && db.videos[k].byLang[l].id) refs.push({ k, l, id: db.videos[k].byLang[l].id }); });
    });
    const unique = Array.from(new Set(refs.map((r) => r.id))), live = {};
    for (let i = 0; i < unique.length; i += 50) (await details(unique.slice(i, i + 50))).forEach((v) => { live[v.id] = v; });
    const now = new Date().toISOString();
    let langRemoved = 0;
    refs.forEach((r) => {
      const e = db.videos[r.k];
      if (!e) return;
      if (r.l) {
        const next = availability(e.byLang[r.l], live[r.id], now);
        if (next) e.byLang[r.l] = next;
        else { delete e.byLang[r.l]; langRemoved++; }
      } else {
        const next = availability(e, live[r.id], now);
        if (next) db.videos[r.k] = next;
        else if (e.byLang && Object.keys(e.byLang).length) { delete e.id; delete e.title; delete e.channel; delete e.secs; removed++; }
        else { delete db.videos[r.k]; removed++; }
      }
    });
    save(db);
    console.log('check: ' + refs.length + ' videos checked, ' + removed + ' removed, ' + langRemoved + ' per-language picks removed');
    return;
  }

  if (lang) {
    const r = await searchLang(db, all, lang, max);
    save(db);
    console.log('lang ' + lang + ' (~' + usage.units + ' quota units): ' + r.found + ' found, ' + r.none + ' with no good match, ' + r.remaining + ' dsa/lld topics still without a ' + LANGS[lang].name + ' pick');
    return;
  }
  const { found, none, replaced } = await searchDefault(db, all, max);
  save(db);
  const total = all.length, have = Object.keys(db.videos).filter((k) => db.videos[k].id && db.videos[k].available !== false && !db.videos[k].stale).length;
  console.log('search (~' + usage.units + ' quota units): ' + found + ' found (' + replaced + ' replacing removed curated videos), ' + none + ' with no good match, ' + removed + ' stale removed · ' + have + '/' + total + ' topics have a video, ' + all.filter((t) => !db.videos[t.id]).length + ' not searched yet');
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { usage, apiError, apiKeys, keyState, LANGS, LANG_TRACKS, RETRY_DAYS, due, core, needsDefault, searchDefault, setClient, langTodo, searchLang, searchBest, pick, seconds, words, searchOrder, topics, availability };
