// One process shares API-key failover and a total search budget across all tracks/languages.
const fs = require('node:fs');
const path = require('node:path');
const D = require('./find-videos');
const RETRY_DAYS = 7;
function oldEnough(e, now) {
  return !e.at || (Date.parse(now) - Date.parse(e.at)) / 864e5 >= RETRY_DAYS;
}
function queues(db, all, day = new Date().toISOString().slice(0, 10)) {
  const result = [];
  for (const track of [...new Set(all.map(t => t.trackId))]) {
    const ts = D.searchOrder(all.filter(t => t.trackId === track));
    const fresh = ts.filter(t => D.needsDefault(db, t));
    const retry = ts.filter(t => {
      const e = db.videos[t.id];
      return !fresh.includes(t) && e && !e.curated && e.id === null && oldEnough(e, day);
    }).sort((a, b) => String(db.videos[a.id].at || '').localeCompare(String(db.videos[b.id].at || '')));
    result.push([...fresh.map(t => ({ type: 'default', t })), ...retry.map(t => ({ type: 'retry', t, track }))]);
  }
  for (const lang of Object.keys(D.LANGS)) {
    const ts = D.langTodo(all, db, lang, RETRY_DAYS);
    // Unsearched language picks first; then oldest misses.
    ts.sort((a, b) => {
      const p = t => db.videos[t.id]?.byLang?.[lang];
      return Number(!!p(a)) - Number(!!p(b)) || String(p(a)?.at || '').localeCompare(String(p(b)?.at || ''));
    });
    result.push(ts.map(t => ({ type: 'lang', t, lang })));
  }
  // Rotate which queue starts, while visiting every nonempty queue each round.
  const offset = Math.floor(Date.parse(day) / 864e5) % result.length;
  return [...result.slice(offset), ...result.slice(0, offset)];
}
async function run(db, all, budget, save = () => {}) {
  if (!Number.isSafeInteger(budget) || budget < 1) throw new Error('Search budget must be a positive integer');
  const pending = queues(db, all);
  let searched = 0, found = 0;
  while (searched < budget && !D.usage.exhausted && pending.some(q => q.length)) {
    for (const q of pending) {
      if (!q.length || searched >= budget || D.usage.exhausted) continue;
      const task = q.shift();
      let r;
      if (task.type === 'lang') r = await D.searchLang(db, [task.t], task.lang, 1, RETRY_DAYS);
      else if (task.type === 'retry') r = await D.searchRetry(db, [task.t], task.track, 1);
      else r = await D.searchDefault(db, [task.t], 1);
      searched++; found += r.found;
      save(db);
      console.log(`daily ${task.type} ${task.lang || task.t.trackId}: ${task.t.id}, ${r.found} found`);
    }
  }
  const remaining = pending.reduce((n, q) => n + q.length, 0);
  console.log(`daily: ${searched}/${budget} topic searches attempted, ${found} found; ${remaining} eligible remaining; ${D.usage.exhausted ? 'API quota exhausted' : remaining ? 'search budget reached' : 'all eligible topics searched'}`);
  return { searched, found, remaining };
}
async function main() {
  const keys = D.apiKeys();
  if (!keys.length) throw new Error('YouTube API keys are missing');
  const perKey = Number(process.env.SEARCHES_PER_KEY || 90);
  if (!Number.isSafeInteger(perKey) || perKey < 1 || perKey > 95) throw new Error('SEARCHES_PER_KEY must be between 1 and 95');
  const file = path.join(__dirname, '../data/videos.json');
  const db = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`${keys.length} API keys; shared budget ${perKey * keys.length} searches across all tracks and languages`);
  await run(db, D.topics(), perKey * keys.length, value => fs.writeFileSync(file, JSON.stringify(value, null, 1) + '\n'));
}
module.exports = { queues, run, RETRY_DAYS };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
