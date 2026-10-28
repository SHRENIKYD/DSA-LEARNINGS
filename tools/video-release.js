// Daily app release for new lesson videos. The app carries its own copy of the video catalog (built in by
// tools/build-app.js), so new videos reach it only through a new app version.
// usage: node tools/video-release.js [--base <git-ref>] [--min N] [--dry-run]
//   Compares data/videos.json with the base (default HEAD) and, when at least N (default 1) videos became playable,
//   bumps appVersion (tools/release.js rules), adds a CHANGELOG-APP.md entry and syncs the iOS project.
//   Writes released=true|false and version=<x> to $GITHUB_OUTPUT when set.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { bumpApp } = require('./release.js');
const root = path.join(__dirname, '..');

// Playable picks in a catalog: default picks plus per-language picks, as "<topic>" and "<topic>@<lang>".
function playable(db) {
  const out = new Set();
  Object.keys((db && db.videos) || {}).forEach((k) => {
    const e = db.videos[k];
    if (e.id && e.available !== false && !e.stale) out.add(k);
    Object.keys(e.byLang || {}).forEach((l) => { const b = e.byLang[l]; if (b && b.id && b.available !== false) out.add(k + '@' + l); });
  });
  return out;
}
function added(before, after) { const a = playable(before), b = playable(after); let n = 0; b.forEach((k) => { if (!a.has(k)) n++; }); return { added: n, total: b.size }; }

function main() {
  const args = process.argv.slice(2), opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
  const base = opt('--base', 'HEAD'), min = Math.max(1, +opt('--min', 1) || 1), dry = args.includes('--dry-run');
  let before = { videos: {} };
  try { before = JSON.parse(execFileSync('git', ['show', base + ':data/videos.json'], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 })); } catch (e) { /* new file */ }
  const after = JSON.parse(fs.readFileSync(path.join(root, 'data', 'videos.json'), 'utf8'));
  const d = added(before, after);
  const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, k + '=' + v + '\n'); };
  if (d.added < min) { console.log('video-release: ' + d.added + ' new video(s), below the minimum of ' + min + '; no app release'); out('released', 'false'); return; }
  const pkgPath = path.join(root, 'package.json'), src = fs.readFileSync(pkgPath, 'utf8'), cur = JSON.parse(src).appVersion, next = bumpApp(cur);
  const date = new Date().toISOString().slice(0, 10);
  const entry = '## [' + next + '] — ' + date + ' · Lesson videos\n\n### Changed\n- ' + d.added + ' new lesson video' + (d.added === 1 ? '' : 's') + ' (' + d.total + ' in the app now, counting per-language picks).\n';
  console.log('video-release: ' + d.added + ' new video(s); app ' + cur + ' -> ' + next + (dry ? ' (dry run)' : ''));
  if (!dry) {
    fs.writeFileSync(pkgPath, src.replace(/("appVersion": ")[^"]+"/, '$1' + next + '"'));
    const cl = path.join(root, 'CHANGELOG-APP.md'), text = fs.readFileSync(cl, 'utf8'), i = text.search(/^## \[/m);
    fs.writeFileSync(cl, i < 0 ? text.trimEnd() + '\n\n' + entry + '\n' : text.slice(0, i) + entry + '\n' + text.slice(i));
    execFileSync('node', [path.join(__dirname, 'version-sync.js')], { cwd: root, stdio: 'inherit' });
  }
  out('released', dry ? 'false' : 'true'); out('version', next);
}

module.exports = { playable, added };
if (require.main === module) main();
