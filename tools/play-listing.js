// Uploads the Play Store listing graphics (and optionally the text) through the Google Play Developer API.
// usage: node tools/play-listing.js [--lang en-US] [--text] [--dry-run]
//   PLAY_SERVICE_ACCOUNT_JSON  service-account key (JSON text); not needed with --dry-run
// Replaces the hi-res icon, the feature graphic and all phone screenshots in one edit, then commits it.
// Everything is checked against Play's limits first; on any error the edit is discarded and the live listing is unchanged.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PKG = 'io.github.shrenikyd.interviewmastery';
const root = path.join(__dirname, '..'), store = path.join(root, 'store');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const LANG = opt('lang', 'en-US'), DRY = args.includes('--dry-run'), TEXT = args.includes('--text');
if (!/^[a-z]{2,3}(-[A-Z]{2}|-[0-9]{3})?$/.test(LANG)) { console.error('--lang must be a Play language code such as en-US, is "' + LANG + '"'); process.exit(1); }
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PKG;
const UPLOAD = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/' + PKG;

function png(file) {
  const b = fs.readFileSync(file);
  if (b.length < 33 || b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') throw new Error(path.relative(root, file) + ': not a PNG');
  const colorType = b[25];
  return { file, bytes: b.length, w: b.readUInt32BE(16), h: b.readUInt32BE(20), depth: b[24], alpha: colorType === 4 || colorType === 6 || b.includes(Buffer.from('tRNS')) };
}
const rel = (f) => path.relative(root, f);
function checkGraphics() {
  const errs = [];
  const icon = png(path.join(store, 'play-icon-512.png'));
  if (icon.w !== 512 || icon.h !== 512) errs.push(rel(icon.file) + ': must be 512×512, is ' + icon.w + '×' + icon.h);
  if (icon.bytes > 1024 * 1024) errs.push(rel(icon.file) + ': must be at most 1 MB');
  const feature = png(path.join(store, 'feature-graphic-1024x500.png'));
  if (feature.w !== 1024 || feature.h !== 500) errs.push(rel(feature.file) + ': must be 1024×500, is ' + feature.w + '×' + feature.h);
  if (feature.alpha) errs.push(rel(feature.file) + ': must not have transparency');
  if (feature.depth > 8) errs.push(rel(feature.file) + ': must be 24-bit (8 bits per channel), is ' + feature.depth + '-bit per channel');
  const dir = path.join(store, 'screenshots');
  const shots = fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort().map((f) => png(path.join(dir, f)));
  if (shots.length < 2 || shots.length > 8) errs.push('store/screenshots: needs 2 to 8 PNG screenshots, has ' + shots.length);
  shots.forEach((s) => {
    const lo = Math.min(s.w, s.h), hi = Math.max(s.w, s.h);
    if (lo < 320 || hi > 3840) errs.push(rel(s.file) + ': each side must be 320–3840 px, is ' + s.w + '×' + s.h);
    if (hi > 2 * lo) errs.push(rel(s.file) + ': the long side may be at most twice the short side');
    if (s.bytes > 8 * 1024 * 1024) errs.push(rel(s.file) + ': must be at most 8 MB');
  });
  return { errs, icon, feature, shots };
}
function readText() {
  const md = fs.readFileSync(path.join(store, 'listing.md'), 'utf8');
  const section = (h) => { const m = md.match(new RegExp('^## ' + h + '[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))', 'm')); return m ? m[1].trim() : ''; };
  const t = { title: section('App name'), shortDescription: section('Short description'), fullDescription: section('Full description') };
  const errs = [];
  [['title', 30], ['shortDescription', 80], ['fullDescription', 4000]].forEach(([k, max]) => {
    if (!t[k]) errs.push('store/listing.md: missing ' + k);
    else if ([...t[k]].length > max) errs.push('store/listing.md: ' + k + ' is ' + [...t[k]].length + ' characters, max ' + max);
  });
  return { t, errs };
}

async function token(key) {
  const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const jwt = unsigned + '.' + crypto.sign('RSA-SHA256', Buffer.from(unsigned), key.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  const j = await r.json();
  if (!r.ok) throw new Error('sign-in failed (' + r.status + '): ' + (j.error_description || j.error || 'unknown error'));
  return j.access_token;
}
async function call(tok, method, url, body, type) {
  const headers = { Authorization: 'Bearer ' + tok };
  if (body !== undefined) headers['Content-Type'] = type || 'application/json';
  const r = await fetch(url, { method, headers, body: body === undefined ? undefined : type ? body : JSON.stringify(body) });
  const txt = await r.text();
  if (!r.ok) {
    let msg = txt.slice(0, 500); try { msg = JSON.parse(txt).error.message; } catch (e) { }
    if (r.status === 403) msg += ' (check that the service account has "Manage store presence" for this app in Play Console → Users and permissions)';
    throw new Error(method + ' ' + url.replace(/^https:\/\/[^/]+/, '') + ' → ' + r.status + ': ' + msg);
  }
  return txt ? JSON.parse(txt) : {};
}

(async () => {
  const g = checkGraphics(), tx = TEXT ? readText() : { errs: [] };
  const errs = g.errs.concat(tx.errs);
  console.log('Listing ' + PKG + ' [' + LANG + ']');
  console.log('  icon            ' + rel(g.icon.file) + ' (' + g.icon.w + '×' + g.icon.h + ', ' + Math.round(g.icon.bytes / 1024) + ' KB)');
  console.log('  feature graphic ' + rel(g.feature.file) + ' (' + g.feature.w + '×' + g.feature.h + ')');
  g.shots.forEach((s, i) => console.log('  screenshot ' + (i + 1) + '    ' + rel(s.file) + ' (' + s.w + '×' + s.h + ')'));
  if (TEXT && tx.t) console.log('  text            title "' + tx.t.title + '", short ' + [...tx.t.shortDescription].length + ' chars, full ' + [...tx.t.fullDescription].length + ' chars');
  if (errs.length) { console.error('\nNot uploaded:\n  ' + errs.join('\n  ')); process.exit(1); }
  if (DRY) { console.log('\nDry run: everything is within Play limits. Nothing was uploaded.'); return; }

  const raw = process.env.PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) { console.error('PLAY_SERVICE_ACCOUNT_JSON is not set.'); process.exit(1); }
  let key; try { key = JSON.parse(raw); } catch (e) { console.error('PLAY_SERVICE_ACCOUNT_JSON is not valid JSON.'); process.exit(1); }
  const tok = await token(key);
  const edit = await call(tok, 'POST', API + '/edits', {});
  const E = API + '/edits/' + edit.id, U = UPLOAD + '/edits/' + edit.id;
  try {
    const put = async (type, files) => {
      await call(tok, 'DELETE', E + '/listings/' + LANG + '/' + type);
      for (const f of files) await call(tok, 'POST', U + '/listings/' + LANG + '/' + type + '?uploadType=media', fs.readFileSync(f.file), 'image/png');
      console.log('  uploaded ' + type + ' (' + files.length + ')');
    };
    await put('icon', [g.icon]);
    await put('featureGraphic', [g.feature]);
    await put('phoneScreenshots', g.shots);
    if (TEXT) { await call(tok, 'PATCH', E + '/listings/' + LANG, tx.t); console.log('  updated title and descriptions'); }
    await call(tok, 'POST', E + ':commit');
    console.log('\nCommitted. Google reviews listing changes before they appear in the store.');
  } catch (e) {
    await call(tok, 'DELETE', E).catch(() => { });
    throw e;
  }
})().catch((e) => { console.error('\nFailed, nothing was changed: ' + e.message); process.exit(1); });
