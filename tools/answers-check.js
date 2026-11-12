// Checks data/answers/<module>.json: for each interview question, in order, an optional program in five languages
// and one written answer per "likely follow-up".
// usage: node tools/answers-check.js [--require] [--run] [module ids...]
//   --require fails when a named module (or, with no names, any module) has no answers file.
//   --run compiles and runs every program (needs javac, python3, node, g++ and mcs); each must exit 0 and print something.
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const root = path.join(__dirname, '..');
const args = process.argv.slice(2), require_ = args.includes('--require'), run = args.includes('--run'), only = args.filter((a) => !a.startsWith('--'));
const LANGS = ['java', 'python', 'js', 'cpp', 'csharp'];
const TAGS = /<\/?([a-z0-9]+)[^>]*>/gi, OK_TAGS = new Set('p b i u em strong code pre sub sup br hr small mark kbd span div ul ol li table thead tbody tr th td h4 h5 blockquote'.split(' '));
const text = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const errors = [];
let modules = 0, answers = 0, programs = 0, ran = 0;

function html(w, s) {
  const stack = [];
  let m; TAGS.lastIndex = 0;
  while ((m = TAGS.exec(s))) {
    const t = m[1].toLowerCase(), close = m[0][1] === '/';
    if (!OK_TAGS.has(t)) { errors.push(w + ': tag <' + t + '> is not allowed'); return; }
    if (t === 'br' || t === 'hr') continue;
    if (close) { if (stack.pop() !== t) { errors.push(w + ': unbalanced </' + t + '>'); return; } } else stack.push(t);
  }
  if (stack.length) errors.push(w + ': unclosed <' + stack.pop() + '>');
  if (/<\/script/i.test(s)) errors.push(w + ': contains </script');
}
function exec(w, lang, code) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ans-'));
  const sh = (cmd, a) => spawnSync(cmd, a, { cwd: dir, encoding: 'utf8', timeout: 60000 });
  let r;
  try {
    if (lang === 'java') { fs.writeFileSync(path.join(dir, 'Main.java'), code); r = sh('javac', ['Main.java']); if (r.status === 0) r = sh('java', ['-cp', '.', 'Main']); }
    else if (lang === 'python') { fs.writeFileSync(path.join(dir, 'main.py'), code); r = sh('python3', ['main.py']); }
    else if (lang === 'js') { fs.writeFileSync(path.join(dir, 'main.js'), code); r = sh(process.execPath, ['main.js']); }
    else if (lang === 'cpp') { fs.writeFileSync(path.join(dir, 'main.cpp'), code); r = sh('g++', ['-std=c++20', '-O1', '-o', 'main', 'main.cpp']); if (r.status === 0) r = sh(path.join(dir, 'main'), []); }
    else { fs.writeFileSync(path.join(dir, 'Main.cs'), code); r = sh('mcs', ['-out:main.exe', 'Main.cs']); if (r.status === 0) r = sh('mono', ['main.exe']); }
    if (r.error || r.status !== 0) errors.push(w + ' [' + lang + ']: ' + String((r.error && r.error.message) || r.stderr || r.stdout).trim().split('\n').slice(0, 3).join(' | '));
    else if (!String(r.stdout).trim()) errors.push(w + ' [' + lang + ']: the program printed nothing');
    else ran++;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const base = fs.readFileSync(path.join(root, 'src/helpers.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/tracks.js'), 'utf8');
const ctx = { console, MODULES: [] }; ctx.registerModule = () => { }; vm.createContext(ctx); vm.runInContext(base, ctx);
for (const t of ctx.TRACKS) {
  for (const pm of t.modules) {
    if (only.length && !only.includes(pm.id)) continue;
    const f = path.join(root, 'content', t.id, pm.id + '.js'), af = path.join(root, 'data', 'answers', pm.id + '.json');
    if (!fs.existsSync(f)) continue;
    if (!fs.existsSync(af)) { if (require_) errors.push(pm.id + ': missing data/answers/' + pm.id + '.json'); continue; }
    const c2 = { console, MODULES: [] }; c2.registerModule = (m) => c2.MODULES.push(m); vm.createContext(c2); vm.runInContext(base, c2);
    vm.runInContext(fs.readFileSync(f, 'utf8'), c2);
    const iv = c2.MODULES[0].interview || [];
    let a;
    try { a = JSON.parse(fs.readFileSync(af, 'utf8')); } catch (e) { errors.push(pm.id + ': invalid JSON (' + e.message + ')'); continue; }
    modules++;
    if (!Array.isArray(a.interview) || a.interview.length !== iv.length) { errors.push(pm.id + ': "interview" must be an array of ' + iv.length + ' entries (one per interview question), found ' + (Array.isArray(a.interview) ? a.interview.length : typeof a.interview)); continue; }
    a.interview.forEach((x, i) => {
      const w = pm.id + ' interview[' + i + ']', fu = (iv[i].followUps || []);
      if (!x || typeof x !== 'object') { errors.push(w + ': must be an object'); return; }
      if (!Array.isArray(x.followUps) || x.followUps.length !== fu.length) errors.push(w + ': needs ' + fu.length + ' follow-up answers, found ' + (Array.isArray(x.followUps) ? x.followUps.length : 0));
      else x.followUps.forEach((s, j) => {
        if (typeof s !== 'string' || text(s).length < 120) errors.push(w + '.followUps[' + j + ']: answer must be at least 120 characters of text');
        else { if (text(s).length > 1200) errors.push(w + '.followUps[' + j + ']: answer is over 1,200 characters'); html(w + '.followUps[' + j + ']', s); answers++; }
      });
      if (x.code === null || x.code === undefined) return;
      if (typeof x.code !== 'object') { errors.push(w + ': code must be null or an object'); return; }
      if (typeof x.code.title !== 'string' || x.code.title.trim().length < 5) errors.push(w + ': code.title is required');
      const extra = Object.keys(x.code).filter((k) => k !== 'title' && !LANGS.includes(k));
      if (extra.length) errors.push(w + ': unknown code keys ' + extra.join(', '));
      LANGS.forEach((l) => {
        const c = x.code[l];
        if (typeof c !== 'string' || c.trim().length < 40) { errors.push(w + ': code.' + l + ' is missing'); return; }
        if (/<\/script/i.test(c)) errors.push(w + ': code.' + l + ' contains </script');
        if (c.split('\n').length > 80) errors.push(w + ': code.' + l + ' is over 80 lines');
        if (run) exec(w, l, c);
      });
      programs++;
    });
  }
}
if (errors.length) { console.error(errors.slice(0, 60).join('\n') + (errors.length > 60 ? '\n… ' + (errors.length - 60) + ' more' : '')); console.error('answers-check: ' + errors.length + ' problem(s)'); process.exit(1); }
console.log('answers-check: ' + answers + ' follow-up answers and ' + programs + ' programs in ' + modules + ' modules OK' + (run ? ' (' + ran + ' program runs passed)' : ''));
