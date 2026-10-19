const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const root = path.join(__dirname, '..');
function check(file, w, h, opaque) {
  const b = fs.readFileSync(path.join(root, file));
  assert.equal(b.subarray(1, 4).toString(), 'PNG', file);
  assert.equal(b.readUInt32BE(16), w, file + ' width'); assert.equal(b.readUInt32BE(20), h, file + ' height');
  if (opaque) { assert(![4, 6].includes(b[25]), 'iOS icon must not have an alpha channel'); assert(!b.includes(Buffer.from('tRNS')), 'iOS icon must not use palette transparency'); }
}
for (const [d, k] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
  for (const suffix of ['', '_round']) check('android/app/src/main/res/mipmap-' + d + '/ic_launcher' + suffix + '.png', 48 * k, 48 * k);
  check('android/app/src/main/res/mipmap-' + d + '/ic_launcher_foreground.png', 108 * k, 108 * k);
}
check('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024, 1024, true);
check('store/play-icon-512.png', 512, 512, true); check('app/icon.png', 192, 192);
const build = fs.readFileSync(path.join(root, 'tools/build-app.js'), 'utf8');
assert(build.includes("'icon.png'") && build.includes("'update.js'"));
const page = fs.readFileSync(path.join(root, 'app/index.html'), 'utf8'); assert(page.indexOf('app/update.js') < page.indexOf('app/app.js'));
console.log('PASS: Android densities and adaptive sizes; opaque iOS/Play icons; app icon and updater included in bundle');
