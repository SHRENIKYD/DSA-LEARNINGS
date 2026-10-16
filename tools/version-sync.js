// Copies the version in package.json into the iOS project (Android reads package.json directly)  —  usage: node tools/version-sync.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const [maj, min, pat] = version.split('.').map(Number);
const build = maj * 10000 + min * 100 + pat;
const pbx = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
if (fs.existsSync(pbx)) {
  const src = fs.readFileSync(pbx, 'utf8')
    .replace(/MARKETING_VERSION = [^;]+;/g, 'MARKETING_VERSION = ' + version + ';')
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, 'CURRENT_PROJECT_VERSION = ' + build + ';');
  fs.writeFileSync(pbx, src);
}
console.log('version ' + version + ' (build ' + build + ')');
