// Renders store/icon.svg into the Android and iOS app icons, splash screens and Play Store graphics.
// usage: node tools/make-icons.js   (needs Playwright with Chromium installed)
const fs = require('fs');
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'store', 'icon.svg'), 'utf8');
const noBg = svg.replace('<rect id="bg" width="1024" height="1024" fill="#0B0D12"/>', '').replace(/<rect width="1024" height="1024" fill="url\(#glow\)"\/>/, '');
const res = (p) => path.join(root, 'android', 'app', 'src', 'main', 'res', p);

async function shot(page, html, w, h, file, transparent) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent('<!doctype html><html><body style="margin:0;background:' + (transparent ? 'transparent' : '#0B0D12') + '">' + html + '</body></html>');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, omitBackground: !!transparent });
}
const sized = (s, w, h, extra) => s.replace('<svg ', '<svg width="' + w + '" height="' + h + '" style="display:block' + (extra || '') + '" ');

(async () => {
  const br = await chromium.launch(), page = await br.newPage();
  const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(DENS)) {
    const legacy = Math.round(48 * k), fg = Math.round(108 * k);
    await shot(page, sized(svg, legacy, legacy), legacy, legacy, res('mipmap-' + d + '/ic_launcher.png'));
    await shot(page, '<div style="width:' + legacy + 'px;height:' + legacy + 'px;border-radius:50%;overflow:hidden">' + sized(svg, legacy, legacy) + '</div>', legacy, legacy, res('mipmap-' + d + '/ic_launcher_round.png'), true);
    // Adaptive icon foreground: 108dp canvas; Bit fills about half of it, inside the central 66dp safe zone.
    const inner = fg;
    await shot(page, '<div style="width:' + fg + 'px;height:' + fg + 'px;display:grid;place-items:center">' + sized(noBg, inner, inner) + '</div>', fg, fg, res('mipmap-' + d + '/ic_launcher_foreground.png'), true);
  }
  // Splash screens: dark background with Bit in the middle.
  const splash = (w, h) => '<div style="width:' + w + 'px;height:' + h + 'px;display:grid;place-items:center;background:#0B0D12">' + sized(svg, Math.round(Math.min(w, h) * 0.42), Math.round(Math.min(w, h) * 0.42), ';border-radius:22%') + '</div>';
  const SPL = { 'drawable/splash.png': [480, 320], 'drawable-land-mdpi/splash.png': [480, 320], 'drawable-land-hdpi/splash.png': [800, 480], 'drawable-land-xhdpi/splash.png': [1280, 720], 'drawable-land-xxhdpi/splash.png': [1600, 960], 'drawable-land-xxxhdpi/splash.png': [1920, 1280], 'drawable-port-mdpi/splash.png': [320, 480], 'drawable-port-hdpi/splash.png': [480, 800], 'drawable-port-xhdpi/splash.png': [720, 1280], 'drawable-port-xxhdpi/splash.png': [960, 1600], 'drawable-port-xxxhdpi/splash.png': [1280, 1920] };
  for (const [f, [w, h]] of Object.entries(SPL)) await shot(page, splash(w, h), w, h, res(f));
  // iOS
  const ios = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets');
  await shot(page, sized(svg, 1024, 1024), 1024, 1024, path.join(ios, 'AppIcon.appiconset', 'AppIcon-512@2x.png'));
  for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) await shot(page, splash(2732, 2732), 2732, 2732, path.join(ios, 'Splash.imageset', f));
  // Play Store: 512×512 icon and 1024×500 feature graphic
  await shot(page, sized(svg, 512, 512), 512, 512, path.join(root, 'store', 'play-icon-512.png'));
  await shot(page, '<div style="width:1024px;height:500px;display:flex;align-items:center;gap:56px;padding:0 72px;box-sizing:border-box;background:radial-gradient(circle at 22% 50%,rgba(34,211,238,.28),transparent 45%),#0B0D12;font-family:Space Grotesk,Inter Display,Inter,DejaVu Sans,sans-serif;color:#E7E9EE">' +
    sized(noBg, 300, 300) + '<div><div style="font-size:64px;font-weight:700;line-height:1.05">Interview<br>Mastery</div><div style="margin-top:18px;font-size:28px;color:#A0A6B2">Learn DSA &amp; CS by playing</div><div style="margin-top:22px;font-size:22px;color:#FDE047;font-family:IBM Plex Mono,DejaVu Sans Mono,monospace">194 modules · 8 concept games</div></div></div>', 1024, 500, path.join(root, 'store', 'feature-graphic-1024x500.png'));
  await br.close();
  console.log('icons, splash screens and store graphics written');
})();
