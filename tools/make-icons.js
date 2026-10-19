// Build native icon and splash assets from the approved Lightbulb Logic master.
// Requires ImageMagick (`convert`). No browser or network is used.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const master = path.join(root, 'store/app-icon-master.png');
function write(file, args) {
  const out = path.join(root, file); fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('convert', [...args, '-colors', '128', '-strip', out], { stdio: 'inherit' });
}
function icon(file, size) { write(file, [master, '-resize', size + 'x' + size, '-alpha', 'off']); }
const res = 'android/app/src/main/res/';
for (const [density, k] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
  const size = Math.round(48 * k), canvas = Math.round(108 * k), inner = Math.round(canvas * .84);
  icon(res + 'mipmap-' + density + '/ic_launcher.png', size);
  // Android performs launcher masks; legacy round assets retain a circular alpha mask.
  write(res + 'mipmap-' + density + '/ic_launcher_round.png', [master, '-resize', size + 'x' + size, '(', '+clone', '-alpha', 'transparent', '-fill', 'white', '-draw', 'circle ' + size / 2 + ',' + size / 2 + ' ' + size / 2 + ',0', ')', '-alpha', 'off', '-compose', 'CopyOpacity', '-composite']);
  // Keep the mark inside Android's central 66dp adaptive-icon safe zone.
  write(res + 'mipmap-' + density + '/ic_launcher_foreground.png', [master, '-resize', inner + 'x' + inner, '-background', '#F6F1E4', '-gravity', 'center', '-extent', canvas + 'x' + canvas]);
}
function splash(file, w, h) { const inner = Math.round(Math.min(w, h) * .42); write(file, [master, '-resize', inner + 'x' + inner, '-background', '#F6F1E4', '-gravity', 'center', '-extent', w + 'x' + h, '-alpha', 'off']); }
const sizes = { 'drawable/splash.png': [480, 320], 'drawable-land-mdpi/splash.png': [480, 320], 'drawable-land-hdpi/splash.png': [800, 480], 'drawable-land-xhdpi/splash.png': [1280, 720], 'drawable-land-xxhdpi/splash.png': [1600, 960], 'drawable-land-xxxhdpi/splash.png': [1920, 1280], 'drawable-port-mdpi/splash.png': [320, 480], 'drawable-port-hdpi/splash.png': [480, 800], 'drawable-port-xhdpi/splash.png': [720, 1280], 'drawable-port-xxhdpi/splash.png': [960, 1600], 'drawable-port-xxxhdpi/splash.png': [1280, 1920] };
for (const [file, [w, h]] of Object.entries(sizes)) splash(res + file, w, h);
const ios = 'ios/App/App/Assets.xcassets/';
icon(ios + 'AppIcon.appiconset/AppIcon-512@2x.png', 1024);
for (const file of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) splash(ios + 'Splash.imageset/' + file, 2732, 2732);
icon('store/play-icon-512.png', 512);
icon('app/icon.png', 192);
write('store/feature-graphic-1024x500.png', ['-size', '1024x500', 'xc:#12263A', '(', master, '-resize', '300x300', ')', '-geometry', '+60+100', '-composite', '-font', 'DejaVu-Sans-Bold', '-fill', '#F4EEDC', '-pointsize', '62', '-annotate', '+420+180', 'Interview', '-annotate', '+420+255', 'Mastery', '-font', 'DejaVu-Sans', '-pointsize', '25', '-fill', '#C9DCE8', '-annotate', '+422+315', 'Learn. Practice. Master.']);
console.log('Lightbulb Logic: Android density icons, adaptive foregrounds, iOS icon, splash screens and in-app icon generated');
