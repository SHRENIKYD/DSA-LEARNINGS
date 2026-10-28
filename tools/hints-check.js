// Checks data/hints/<module>.json: one hint per riddle (quiz) and per interview question, in the same order.
// usage: node tools/hints-check.js [--require] [module ids...]   --require fails when a module has no hints file.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const args = process.argv.slice(2), require_ = args.includes('--require'), only = args.filter((a) => !a.startsWith('--'));
const ctx = { console, MODULES: [] };
ctx.registerModule = (m) => ctx.MODULES.push(m);
vm.createContext(ctx);
for (const f of ['src/helpers.js', 'src/tracks.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
const strip = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().toLowerCase();
const errors = [];
let modules = 0, hints = 0;
function checkList(id, kind, items, list) {
  if (!Array.isArray(list)) { errors.push(id + ': "' + kind + '" must be an array'); return; }
  if (list.length !== items.length) errors.push(id + ': ' + kind + ' has ' + list.length + ' hints for ' + items.length + ' questions');
  list.forEach((h, i) => {
    const w = id + ' ' + kind + '[' + i + ']';
    if (typeof h !== 'string' || h.trim().length < 20) { errors.push(w + ': hint must be a sentence of at least 20 characters'); return; }
    if (h.length > 260) errors.push(w + ': hint is ' + h.length + ' characters (keep it under 260)');
    if (/<[a-z\/][^>]*>/i.test(h)) errors.push(w + ': hints are plain text; write tags as words');
    const q = items[i];
    if (kind === 'quiz' && q && Array.isArray(q.options)) {
      const right = strip(q.options[q.answer]);
      if (right.length >= 6 && strip(h).includes(right)) errors.push(w + ': hint gives away the answer ("' + right + '")');
    }
    hints++;
  });
}
for (const t of ctx.TRACKS) {
  for (const pm of t.modules) {
    if (only.length && !only.includes(pm.id)) continue;
    const f = path.join(root, 'content', t.id, pm.id + '.js');
    if (!fs.existsSync(f)) continue;
    const c2 = { console, MODULES: [] };
    c2.registerModule = (m) => c2.MODULES.push(m);
    vm.createContext(c2);
    for (const x of ['src/helpers.js', 'src/tracks.js']) vm.runInContext(fs.readFileSync(path.join(root, x), 'utf8'), c2);
    vm.runInContext(fs.readFileSync(f, 'utf8'), c2);
    const m = c2.MODULES[0], hf = path.join(root, 'data', 'hints', pm.id + '.json');
    if (!fs.existsSync(hf)) { if (require_) errors.push(pm.id + ': missing data/hints/' + pm.id + '.json'); continue; }
    let h;
    try { h = JSON.parse(fs.readFileSync(hf, 'utf8')); } catch (e) { errors.push(pm.id + ': invalid JSON (' + e.message + ')'); continue; }
    modules++;
    checkList(pm.id, 'quiz', m.quiz || [], h.quiz);
    checkList(pm.id, 'interview', m.interview || [], h.interview);
  }
}
if (errors.length) { console.error(errors.slice(0, 60).join('\n') + (errors.length > 60 ? '\n… ' + (errors.length - 60) + ' more' : '')); console.error('hints-check: ' + errors.length + ' problem(s)'); process.exit(1); }
console.log('hints-check: ' + hints + ' hints in ' + modules + ' modules OK');
