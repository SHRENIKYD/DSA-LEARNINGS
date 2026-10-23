// Bumps the website and/or app version and drafts changelog entries.
// Usage: node tools/release.js [--web] [--app] [--dry-run]
// With no --web/--app flag it decides from the files changed since the last release.
// Set RELEASE_NOTES_FILE=path to also write the new entries there (used by release-prep.yml).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');

// Website: patch 1..100, then next minor with patch 0 (1.10.100 -> 1.11.0).
function bumpWeb(v) {
  const [a, b, c] = v.split('.').map(Number);
  return c >= 100 ? [a, b + 1, 0].join('.') : [a, b, c + 1].join('.');
}
// App: patch 1..99, then next minor with patch 0 (1.11.99 -> 1.12.0).
function bumpApp(v) {
  const [a, b, c] = v.split('.').map(Number);
  return c >= 99 ? [a, b + 1, 0].join('.') : [a, b, c + 1].join('.');
}
function versionCode(v) {
  const [a, b, c] = v.split('.').map(Number);
  return a * 10000 + b * 100 + c;
}

const WEB_PATHS = ['src/', 'content/', 'data/', 'vendor/', 'tools/build.js'];
const APP_PATHS = ['app/', 'android/', 'ios/', 'content/', 'src/', 'capacitor.config.json', 'tools/build-app.js'];
const touches = (files, prefixes) => files.some(f => prefixes.some(p => f === p || (p.endsWith('/') && f.startsWith(p))));

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}
function tryGit(args) {
  try { return git(args); } catch (e) { return ''; }
}
// Last release point: the tag if it exists, else the commit that set the current version.
function baseline(tagPrefix, field, version) {
  const tag = tagPrefix + version;
  if (tryGit(['tag', '--list', tag])) return tag;
  const sha = tryGit(['log', '-1', '--format=%H', '-S"' + field + '": "' + version + '"', '--', 'package.json']);
  return sha || '';
}
function changedFiles(base) {
  const out = base ? tryGit(['diff', '--name-only', base + '..HEAD']) : tryGit(['ls-files']);
  return out ? out.split('\n') : [];
}
function subjects(base) {
  const range = base ? [base + '..HEAD'] : [];
  const out = tryGit(['log', '--no-merges', '--format=%s', ...range]);
  return out.split('\n').filter(s => s && !/^update lesson videos/i.test(s) && !/^release (website|app)/i.test(s));
}
function section(subject) {
  if (/^(fix|bug|repair|correct)/i.test(subject)) return 'Fixed';
  if (/^(add|new|introduce|create)/i.test(subject)) return 'Added';
  return 'Changed';
}
function entry(version, date, subs) {
  const groups = { Added: [], Changed: [], Fixed: [] };
  subs.forEach(s => groups[section(s)].push(s.replace(/^./, c => c.toUpperCase())));
  let text = '## [' + version + '] — ' + date + ' · TODO title\n';
  let any = false;
  for (const k of ['Added', 'Changed', 'Fixed']) {
    if (!groups[k].length) continue;
    any = true;
    text += '\n### ' + k + '\n' + groups[k].map(s => '- ' + s).join('\n') + '\n';
  }
  if (!any) text += '\n### Changed\n- TODO describe the change\n';
  return text;
}
function insertEntry(file, text) {
  const p = path.join(root, file);
  const src = fs.readFileSync(p, 'utf8');
  const i = src.search(/^## \[/m);
  fs.writeFileSync(p, i < 0 ? src.trimEnd() + '\n\n' + text + '\n' : src.slice(0, i) + text + '\n' + src.slice(i));
}
function setVersion(field, from, to) {
  const p = path.join(root, 'package.json');
  const src = fs.readFileSync(p, 'utf8');
  const re = new RegExp('("' + field + '": ")' + from.replace(/\./g, '\\.') + '"');
  if (!re.test(src)) throw new Error('could not find ' + field + ' ' + from + ' in package.json');
  fs.writeFileSync(p, src.replace(re, '$1' + to + '"'));
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry-run');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const webBase = baseline('web-v', 'version', pkg.version);
  const appBase = baseline('app-v', 'appVersion', pkg.appVersion);
  let doWeb = args.includes('--web'), doApp = args.includes('--app');
  let how = 'chosen by flag';
  if (!doWeb && !doApp) {
    how = 'chosen automatically from changes since web ' + (webBase || 'start') + ' / app ' + (appBase || 'start');
    doApp = touches(changedFiles(appBase), APP_PATHS);
    doWeb = touches(changedFiles(webBase), WEB_PATHS);
  }
  if (!doWeb && !doApp) { console.log('Nothing to release: only docs, tests or workflows changed (' + how + ').'); return; }

  const date = new Date().toISOString().slice(0, 10);
  const notes = [];
  console.log((dry ? 'DRY RUN, nothing changed. ' : '') + 'Plan (' + how + '):');
  if (doWeb) {
    const next = bumpWeb(pkg.version);
    const subs = subjects(webBase);
    console.log('  website ' + pkg.version + ' -> ' + next + ', ' + subs.length + ' commit subject(s) since ' + (webBase ? webBase.slice(0, 12) : 'start'));
    const text = entry(next, date, subs);
    notes.push('### Website ' + next + '\n\n' + text);
    if (!dry) { setVersion('version', pkg.version, next); insertEntry('CHANGELOG.md', text); }
  }
  if (doApp) {
    const next = bumpApp(pkg.appVersion);
    const subs = subjects(appBase);
    console.log('  app ' + pkg.appVersion + ' -> ' + next + ' (versionCode ' + versionCode(pkg.appVersion) + ' -> ' + versionCode(next) + '), ' + subs.length + ' commit subject(s) since ' + (appBase ? appBase.slice(0, 12) : 'start'));
    const text = entry(next, date, subs);
    notes.push('### App ' + next + '\n\n' + text);
    if (!dry) {
      setVersion('appVersion', pkg.appVersion, next);
      insertEntry('CHANGELOG-APP.md', text);
      execFileSync('node', [path.join(__dirname, 'version-sync.js')], { cwd: root, stdio: 'inherit' });
    }
  }
  if (!dry) {
    if (process.env.RELEASE_NOTES_FILE) fs.writeFileSync(process.env.RELEASE_NOTES_FILE, notes.join('\n'));
    console.log('Done. Edit the "TODO title" lines and tidy the draft notes before merging.');
  } else {
    console.log('\nDraft notes:\n\n' + notes.join('\n'));
  }
}

module.exports = { bumpWeb, bumpApp, versionCode };
if (require.main === module) main();
