// The "What's new" popup shows the newest entry of each changelog.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { latest } = require('./whatsnew-lib.js');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const [file, v] of [['CHANGELOG.md', pkg.version], ['CHANGELOG-APP.md', pkg.appVersion]]) {
  const n = latest(fs.readFileSync(file, 'utf8'));
  assert(n, file + ': no entry found');
  assert.equal(n.v, v, file + ': newest entry must match package.json');
  assert(n.title && n.html.includes('<li>'), file + ': entry needs a title and items');
  assert(!/<script|javascript:/i.test(n.html), file + ': entry html must be inert');
}
const t = latest('# x\n\n## [2.0.0] — 2026-01-01 · Big\n\n### Added\n- **A** <b> `c`\n  - nested\n- second\n\n## [1.0.0] — old\n- no\n');
assert.deepEqual([t.v, t.date, t.title], ['2.0.0', '2026-01-01', 'Big']);
assert.equal(t.html, '<h4>Added</h4><ul><li><b>A</b> &lt;b&gt; <code>c</code><ul><li>nested</li></ul></li><li>second</li></ul>');
console.log('PASS: whats-new entries for website ' + pkg.version + ' and app ' + pkg.appVersion + ' match package.json; markdown is escaped');
