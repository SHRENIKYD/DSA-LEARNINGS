// CI gate: validates modules and runs their solution tests with the languages each track requires.
// usage: node tools/ci-check.js --base <git-ref>   modules changed since <ref> (a tool change adds one sample module per track)
//        node tools/ci-check.js --track <id>       every module of one track ("other" = tracks without required tests)
//        node tools/ci-check.js content/<t>/<id>.js ...
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
// Tracks whose every problem must have tests, and the languages each problem must be implemented in.
const REQUIRE = {
  dsa: 'java,python,js,cpp,csharp', lld: 'java,python,ts,cpp,csharp',
  java: 'java', py: 'python', js: 'js|ts', cpp: 'cpp', sql: 'sql|python|java|js'
};
const SAMPLE = ['dsa/dsa07', 'dsa/dsa27', 'lld/lld03', 'java/java07', 'py/py05', 'js/js02', 'cpp/cpp05', 'sql/sql02'].map((m) => 'content/' + m + '.js');
const TOOLS = /^tools\/(solution-check|sql-runner|validate|pycheck)\.js$|^tools\/pycheck\.py$|^tools\/harness\/|^vendor\/sql-wasm/; // tools/harness/ includes H.cs and cs-compile.js

const allModules = () => fs.readdirSync(path.join(root, 'content')).flatMap((t) => fs.readdirSync(path.join(root, 'content', t)).filter((f) => /\.js$/.test(f)).sort().map((f) => 'content/' + t + '/' + f));
let files;
if (opt('base')) {
  const d = spawnSync('git', ['diff', '--name-only', opt('base') + '...HEAD'], { cwd: root, encoding: 'utf8' });
  if (d.status !== 0) { console.error('git diff failed: ' + d.stderr); process.exit(2); }
  const changed = d.stdout.split('\n').filter(Boolean);
  files = changed.filter((f) => /^content\/[^/]+\/[^/]+\.js$/.test(f) && fs.existsSync(path.join(root, f)));
  if (changed.some((f) => TOOLS.test(f))) files = files.concat(SAMPLE.filter((f) => !files.includes(f)));
} else if (opt('track')) {
  const t = opt('track');
  files = allModules().filter((f) => (t === 'other' ? !REQUIRE[f.split('/')[1]] : f.split('/')[1] === t));
} else files = args.filter((a) => a.endsWith('.js'));

if (!files.length) { console.log('No modules to check.'); process.exit(0); }
const failed = [];
for (const f of files) {
  const track = f.split('/')[1];
  const v = spawnSync('node', [path.join(__dirname, 'validate.js'), f, '--code'], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
  const vOut = (v.stdout + v.stderr).trim();
  if (v.status !== 0) { failed.push(f + ' (validate)'); console.log('::group::validate ' + f + '\n' + vOut + '\n::endgroup::'); }
  const sArgs = [path.join(__dirname, 'solution-check.js'), f, '--quiet'];
  if (REQUIRE[track]) sArgs.push('--require', REQUIRE[track]);
  const s = spawnSync('node', sArgs, { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
  const sOut = (s.stdout + s.stderr).trim(), summary = sOut.split('\n').pop();
  if (s.status !== 0) { failed.push(f + ' (solutions)'); console.log('::group::solutions ' + f + '\n' + sOut + '\n::endgroup::'); }
  console.log((v.status || s.status ? 'FAIL ' : 'ok   ') + f + ' | ' + (vOut.split('\n').pop() || '') + ' | ' + summary);
}
console.log('\n' + files.length + ' modules checked, ' + failed.length + ' failing' + (failed.length ? ':\n  ' + failed.join('\n  ') : ''));
process.exit(failed.length ? 1 : 0);
