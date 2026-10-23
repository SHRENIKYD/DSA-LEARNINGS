// Tests the version bump arithmetic in tools/release.js  —  usage: node tools/release-test.js
const assert = require('assert');
const { bumpWeb, bumpApp, versionCode } = require('./release');
assert.strictEqual(bumpWeb('1.10.3'), '1.10.4');
assert.strictEqual(bumpWeb('1.10.99'), '1.10.100');
assert.strictEqual(bumpWeb('1.10.100'), '1.11.0');
assert.strictEqual(bumpWeb('1.11.0'), '1.11.1');
assert.strictEqual(bumpApp('1.11.3'), '1.11.4');
assert.strictEqual(bumpApp('1.11.98'), '1.11.99');
assert.strictEqual(bumpApp('1.11.99'), '1.12.0');
assert.strictEqual(bumpApp('1.12.0'), '1.12.1');
assert.strictEqual(versionCode('1.7.0'), 10700);
let v = '1.11.1', last = versionCode(v);
const codes = [last];
for (let i = 0; i < 250; i++) {
  v = bumpApp(v);
  const c = versionCode(v);
  assert(c > last, 'versionCode not increasing at ' + v);
  codes.push(c); last = c;
}
console.log('250 releases: ' + codes.slice(0, 3).join(', ') + ' ... ' + codes.slice(-2).join(', ') + ' (last ' + v + '), strictly increasing, no collisions');
assert.strictEqual(new Set(codes).size, codes.length);
console.log('release-test: all passed');
