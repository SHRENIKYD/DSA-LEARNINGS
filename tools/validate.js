// Usage: node tools/validate.js content/<track>/<id>.js [--code]
//   --code  also compiles/runs every code snippet (Java, Python, JS/TS, C++, C#, SQL, JSON)
//           C# needs mono (mcs) or the .NET SDK (dotnet); `run: true` C# programs are also executed, like Python and JS.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const file = process.argv[2];
const CODE = process.argv.includes('--code');
if (!file) { console.error('usage: node tools/validate.js content/<track>/<id>.js [--code]'); process.exit(2); }

const errors = [], warns = [];
const E = (w, m) => errors.push(w + ': ' + m);
const W = (w, m) => warns.push(w + ': ' + m);
const asList = (x) => (x === undefined || x === null ? [] : Array.isArray(x) ? x : [x]);

const ctx = { console, MODULES: [] };
ctx.registerModule = (m) => ctx.MODULES.push(m);
vm.createContext(ctx);
for (const f of ['src/helpers.js', 'src/tracks.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const src = fs.readFileSync(file, 'utf8');
if (/<\/script/i.test(src)) E('file', 'contains "</script" — not allowed anywhere (write <\\/script if you must)');
try { vm.runInContext(src, ctx, { filename: file }); } catch (e) { console.error('MODULE FAILED TO LOAD:', e.stack); process.exit(1); }
if (ctx.MODULES.length !== 1) { console.error('Expected exactly 1 registerModule call, got ' + ctx.MODULES.length); process.exit(1); }
const m = ctx.MODULES[0];
const track = ctx.TRACKS.find((t) => t.modules.some((pm) => pm.id === m.id));
if (!track) { console.error('Module id "' + m.id + '" is not in src/tracks.js'); process.exit(1); }
const plan = track.modules.find((pm) => pm.id === m.id);
if (path.basename(file) !== m.id + '.js' || path.basename(path.dirname(file)) !== track.id) E('file', 'must live at content/' + track.id + '/' + m.id + '.js');
const LANG = m.lang || track.lang;
const CODE_REQ = track.code === 'required';

const TAGS = new Set('a abbr b br blockquote caption code col colgroup dd del details div dl dt em figure figcaption h4 h5 h6 hr i img kbd li mark ol p pre s small span strong sub summary sup table tbody td tfoot th thead tr u ul var svg line circle rect text g path polyline polygon marker defs tspan'.split(' '));
const PAIRED = ['div', 'span', 'table', 'ul', 'ol', 'details', 'b', 'i', 'code', 'pre', 'sub', 'sup', 'strong', 'em', 'tr', 'td', 'th', 'thead', 'tbody', 'summary', 'small', 'mark', 'kbd', 'svg', 'g', 'text', 'blockquote', 'h4', 'h5', 'a'];
function checkHtml(where, s) {
  if (s === undefined || s === null) return;
  if (typeof s !== 'string') { E(where, 'expected HTML string, got ' + typeof s); return; }
  const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)/g;
  let mm;
  while ((mm = re.exec(s))) {
    if (!TAGS.has(mm[1].toLowerCase())) E(where, 'unknown tag "<' + mm[1] + '" near "' + s.slice(Math.max(0, mm.index - 25), mm.index + 25).replace(/\n/g, ' ') + '" — escape literal < as &lt; (List&lt;Integer&gt;, i &lt; n, &lt;div&gt;)');
  }
  for (const t of PAIRED) {
    const open = (s.match(new RegExp('<' + t + '(\\s[^>]*)?>', 'gi')) || []).length;
    const close = (s.match(new RegExp('</' + t + '\\s*>', 'gi')) || []).length;
    if (open !== close) E(where, 'unbalanced <' + t + '>: ' + open + ' open vs ' + close + ' close');
  }
  if (/\$\{/.test(s)) E(where, 'literal "${" left in HTML');
}
function txtLen(v) { return typeof v === 'string' ? v.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().length : 0; }
function str(where, v, min) { if (txtLen(v) < (min || 1)) E(where, 'missing/too short (needs >= ' + (min || 1) + ' chars of text, has ' + txtLen(v) + ')'); }
function html(where, v, min) { str(where, v, min); checkHtml(where, v); }

const snippets = [];
function code(where, x, required, defLang) {
  if (x === undefined || x === null || x === '') { if (required) E(where, 'missing code'); return; }
  const s = typeof x === 'string' ? { code: x, lang: defLang } : Object.assign({ lang: defLang }, x);
  if (typeof s.code !== 'string' || !s.code.trim()) { E(where, 'code must be a non-empty string'); return; }
  if (/\bTODO\b|implement here|your code here/i.test(s.code)) E(where, 'placeholder text in code');
  // In Python, a bare `...` body right after a `def ...:` / `class ...:` line is an idiomatic abstract stub, not a placeholder.
  const ell = /^py(thon)?$/.test(s.lang || '') ? s.code.replace(/(:[ \t]*(#[^\n]*)?\n)([ \t]+)\.\.\.[ \t]*(?=\n|$)/g, '$1$3pass') : s.code;
  if (/^\s*(\/\/|#|--)?\s*\.\.\.\s*$/m.test(ell) || /(\/\/|#)\s*\.\.\.\s*$/m.test(s.code) || /\/\*\s*\.\.\.\s*\*\//.test(s.code)) E(where, 'ellipsis placeholder in code');
  if (s.lang === 'sql' && s.db !== undefined && !(m.databases && m.databases[s.db])) E(where, 'sql snippet uses db "' + s.db + '" but module.databases has no such key');
  asList(s.alt).forEach((a, i) => code(where + '.alt[' + i + ']', a, true, defLang));
  if (s.check === false) return;
  snippets.push(Object.assign({ where }, s, { alt: undefined }));
}
function mcq(where, q) {
  if (!q) { E(where, 'missing'); return; }
  html(where + '.q', q.q, 10);
  if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 5) E(where, 'options must have 3-5 entries');
  else q.options.forEach((o, i) => html(where + '.options[' + i + ']', o, 1));
  if (!Number.isInteger(q.answer) || !q.options || q.answer < 0 || q.answer >= q.options.length) E(where, 'answer must be a valid 0-based index');
  html(where + '.explain', q.explain, 20);
}
function problem(where, p, core) {
  if (!p || typeof p !== 'object') { E(where, 'not an object'); return; }
  const pl = p.lang || LANG;
  str(where + '.title', p.title, 3);
  if (!['Easy', 'Medium', 'Hard'].includes(p.level)) E(where, 'level must be Easy|Medium|Hard');
  html(where + '.statement', p.statement, 40);
  html(where + '.constraints', p.constraints, 5);
  html(where + '.example', p.example, 20);
  if (!p.brute) E(where, 'missing brute {why, code}');
  else { html(where + '.brute.why', p.brute.why, 40); code(where + '.brute.code', p.brute.code, CODE_REQ, pl); }
  mcq(where + '.mcq', p.mcq);
  if (!Array.isArray(p.hints) || p.hints.length !== 3) E(where, 'hints must be an array of exactly 3 HTML strings');
  else p.hints.forEach((h, i) => html(where + '.hints[' + i + ']', h, 40));
  const s = p.solution;
  if (!s) { E(where, 'missing solution'); return; }
  checkHtml(where + '.solution.approach', s.approach);
  code(where + '.solution.code', s.code, CODE_REQ, pl);
  asList(s.alt).forEach((a, i) => code(where + '.solution.alt[' + i + ']', a, true, pl));
  if (!CODE_REQ && !s.code) html(where + '.solution.approach', s.approach, 200);
  html(where + '.solution.complexity', s.complexity, 20);
  asList(s.followUps).forEach((f, i) => html(where + '.solution.followUps[' + i + ']', f, 5));
  if (core && track.dry && !s.dry) E(where, 'guided problem needs solution.dry {head, rows}');
  if (s.dry) {
    if (!Array.isArray(s.dry.head) || !Array.isArray(s.dry.rows) || s.dry.rows.length < 2) E(where, 'solution.dry needs head[] and >= 2 rows');
    else s.dry.rows.forEach((r, i) => {
      if (!Array.isArray(r) || r.length !== s.dry.head.length) E(where, 'dry row ' + i + ' length != head length');
      else r.forEach((c) => checkHtml(where + '.dry.row' + i, String(c)));
    });
  }
}
const PARTREQ = {
  array: (p) => Array.isArray(p.values), set: (p) => Array.isArray(p.items), map: (p) => Array.isArray(p.entries) && p.entries.every((e) => Array.isArray(e) && e.length === 2),
  bars: (p) => Array.isArray(p.values) && p.values.every((v) => !isNaN(Number(v))), bits: (p) => p.value !== undefined && (!p.width || p.width <= 32),
  stack: (p) => Array.isArray(p.items), queue: (p) => Array.isArray(p.items), tree: (p) => Array.isArray(p.arr),
  graph: (p) => Array.isArray(p.nodes) && p.nodes.every((n) => n.id !== undefined && typeof n.x === 'number' && typeof n.y === 'number') && Array.isArray(p.edges),
  grid: (p) => Array.isArray(p.rows) && p.rows.every(Array.isArray), matrix: (p) => Array.isArray(p.rows), list: (p) => Array.isArray(p.values),
  vars: (p) => p.vals && typeof p.vals === 'object', text: (p) => typeof p.html === 'string', code: (p) => typeof p.code === 'string',
  table: (p) => Array.isArray(p.columns) && Array.isArray(p.rows) && p.rows.every(Array.isArray)
};
let vizCount = 0, frameCount = 0;
function viz(where, v) {
  vizCount++;
  if (!v || typeof v.gen !== 'function') { E(where, 'viz needs gen function'); return; }
  str(where + '.title', v.title, 3);
  let frames;
  try { frames = v.gen(v.input); } catch (e) { E(where, 'gen threw: ' + e.message); return; }
  if (!Array.isArray(frames) || frames.length < 4) { E(where, 'gen must return >= 4 frames'); return; }
  if (frames.length > 400) W(where, frames.length + ' frames is a lot');
  frameCount += frames.length;
  frames.forEach((f, i) => {
    const fw = where + '.frame' + i;
    html(fw + '.narr', f.narr, 10);
    if (!Array.isArray(f.parts) || !f.parts.length) { E(fw, 'parts must be non-empty array'); return; }
    f.parts.forEach((p, j) => {
      if (!p || !PARTREQ[p.type]) E(fw + '.part' + j, 'unknown part type ' + (p && p.type));
      else if (!PARTREQ[p.type](p)) E(fw + '.part' + j, 'invalid fields for type ' + p.type);
      if (p && p.type === 'text') checkHtml(fw + '.part' + j, p.html);
      if (p && p.label) checkHtml(fw + '.part' + j + '.label', p.label);
    });
  });
  if (v.input !== undefined && typeof v.input !== 'string') E(where, 'viz.input must be a string');
}

/* ---------- module ---------- */
str('module.title', m.title, 3);
html('module.intro', m.intro, 120);
if (!Array.isArray(m.goals) || m.goals.length < 3) E('module', 'needs goals: >= 3 HTML strings');
else m.goals.forEach((g, i) => html('module.goals[' + i + ']', g, 10));
html('module.prereqs', m.prereqs, 15);
if (typeof m.hours !== 'number' || m.hours <= 0) E('module', 'needs hours (number)');
if (m.databases) Object.keys(m.databases).forEach((k) => { if (typeof m.databases[k] !== 'string') E('module.databases.' + k, 'must be a SQL string'); });
if (!Array.isArray(m.topics) || m.topics.length < 3) E('module', 'needs >= 3 topics');
let core = 0, exCount = 0;
(m.topics || []).forEach((t, i) => {
  const w = 'topic[' + i + '] "' + String(t.title).slice(0, 40) + '"';
  str(w + '.title', t.title, 3);
  html(w + '.analogy', t.analogy, 80);
  html(w + '.explain', t.explain, 300);
  html(w + '.deepDive', t.deepDive, 250);
  html(w + '.aiEra', t.aiEra, 250);
  checkHtml(w + '.after', t.after);
  if (!Array.isArray(t.clues) || t.clues.length < 3) E(w, 'needs >= 3 clues');
  else t.clues.forEach((c, j) => html(w + '.clues[' + j + ']', c, 8));
  asList(t.code).forEach((c, j) => code(w + '.code[' + j + ']', c, true, t.lang || LANG));
  if (!asList(t.viz).length) E(w, 'needs >= 1 visualizer (viz) — mandatory for every topic');
  asList(t.viz).forEach((v, j) => viz(w + '.viz[' + j + ']', v));
  if (!Array.isArray(t.examples) || t.examples.length < 3) E(w, 'needs examples: >= 3 worked examples {title, html, code?}');
  else t.examples.forEach((ex, j) => {
    exCount++;
    str(w + '.examples[' + j + '].title', ex.title, 3);
    html(w + '.examples[' + j + '].html', ex.html, 60);
    if (ex.code) code(w + '.examples[' + j + '].code', ex.code, false, t.lang || LANG);
  });
  asList(t.problems).concat(asList(t.problem)).forEach((p, j) => { core++; problem(w + '.problems[' + j + ']', p, true); });
});
if (core < 3) E('module', 'needs >= 3 guided problems inside topics (got ' + core + ')');
const pr = m.practice || [];
if (pr.length < 12 || pr.length > 20) E('module', 'practice must have 12-20 problems (got ' + pr.length + ')');
const lc = (l) => pr.filter((p) => p.level === l).length;
if (lc('Easy') < 3) E('module', 'practice needs >= 3 Easy'); if (lc('Medium') < 4) E('module', 'practice needs >= 4 Medium'); if (lc('Hard') < 3) E('module', 'practice needs >= 3 Hard');
pr.forEach((p, k) => problem('practice[' + k + '] "' + String(p.title).slice(0, 40) + '"', p, false));
if (m.langNotes) {
  if (typeof m.langNotes !== 'object') E('module', 'langNotes must be an object {java, python, js, cpp}');
  else Object.keys(m.langNotes).forEach((k) => { if (!['java', 'python', 'js', 'ts', 'cpp', 'csharp'].includes(k)) E('langNotes', 'unknown language key ' + k); html('langNotes.' + k, m.langNotes[k], 40); });
}
const qz = m.quiz || [];
if (qz.length < 10) E('module', 'quiz needs >= 10 MCQs (got ' + qz.length + ')');
qz.forEach((q, i) => mcq('quiz[' + i + ']', q));
const iv = m.interview || [];
if (iv.length < 12) E('module', 'interview needs >= 12 Q&A (got ' + iv.length + ')');
iv.forEach((q, i) => {
  html('interview[' + i + '].q', q.q, 10);
  html('interview[' + i + '].a', q.a, 150);
  if (q.level && !ctx.LEVELS[q.level]) E('interview[' + i + ']', 'level must be B|I|A|E');
  asList(q.followUps).forEach((f, j) => html('interview[' + i + '].followUps[' + j + ']', f, 5));
});

/* ---------- code checks ---------- */
function codeCheck() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'imcheck-'));
  const norm = (c) => { const L = c.replace(/\r/g, '').split('\n'); const mn = Math.min(...L.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length)); return L.map((l) => l.slice(mn)).join('\n'); };
  const fail = (s, msg) => E(s.where, (s.lang || '?') + ' check failed:\n      ' + String(msg).split('\n').filter((l) => l.trim()).slice(0, 8).join('\n      '));
  const by = {};
  snippets.forEach((s) => { const l = ({ javascript: 'js', jsx: 'js', typescript: 'ts', tsx: 'ts', py: 'python', c: 'cpp', 'c#': 'csharp', cs: 'csharp' })[s.lang] || s.lang; (by[l] = by[l] || []).push(Object.assign(s, { lang: l, code: norm(s.code) })); });
  let ok = 0, total = 0;
  // Java
  if (by.java) {
    const IMP = 'import java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport java.util.concurrent.*;\nimport java.util.concurrent.atomic.*;\nimport java.util.concurrent.locks.*;\nimport java.io.*;\nimport java.math.*;\nimport java.time.*;\n';
    const STUBS = {
      ListNode: 'class ListNode { int val; ListNode next; ListNode() {} ListNode(int v) { val = v; } ListNode(int v, ListNode n) { val = v; next = n; } }',
      TreeNode: 'class TreeNode { int val; TreeNode left, right; TreeNode() {} TreeNode(int v) { val = v; } TreeNode(int v, TreeNode l, TreeNode r) { val = v; left = l; right = r; } }'
    };
    const dirs = [];
    by.java.forEach((s, k) => {
      const imps = (s.code.match(/^import\s+(static\s+)?[\w.*]+\s*;\s*$/gm) || []).join('\n') + '\n';
      const body = s.code.replace(/^import\s+(static\s+)?[\w.*]+\s*;\s*$/gm, '').replace(/^package\s+[\w.]+\s*;\s*$/gm, '');
      let stubs = '';
      for (const [n, d] of Object.entries(STUBS)) if (new RegExp('\\b' + n + '\\b').test(body) && !new RegExp('(class|record)\\s+' + n + '\\b').test(body)) stubs += d + '\n';
      const top = body.replace(/^public\s+(?=((final|abstract|sealed)\s+)?(class|interface|enum|record)\b)/gm, '');
      const v = { a: IMP + imps + top + '\n' + stubs, b: IMP + imps + 'class Snip__ {\n' + body + '\n}\n' + stubs, c: IMP + imps + 'class Snip__ {\n@SuppressWarnings("unchecked") void run__() throws Exception {\n' + body + '\n}\n}\n' + stubs };
      s.pref = /^(public\s+|final\s+|abstract\s+|sealed\s+)*(class|interface|enum|record)\s+\w+/m.test(body) ? 'a' : /^(public\s+|private\s+|protected\s+|static\s+|final\s+|synchronized\s+)*[\w<>\[\], ?]+\s+\w+\s*\([^;{]*\)\s*(throws\s+[\w, ]+)?\s*\{/m.test(body) ? 'b' : 'c';
      for (const [k2, txt] of Object.entries(v)) { const d = path.join(tmp, 'j' + k + k2); fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'Snip.java'), txt); dirs.push(d); }
    });
    const res = {};
    try {
      const o = execFileSync('java', [path.join(__dirname, 'SnipCheck.java'), ...dirs], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
      o.split('@@END').forEach((blk) => { const mm = blk.trim().match(/^(OK|FAIL) (\S+)\n?([\s\S]*)$/); if (mm) res[path.basename(mm[2])] = { ok: mm[1] === 'OK', msg: mm[3] }; });
    } catch (e) { E('java', 'SnipCheck failed: ' + (e.stderr || e.message)); }
    by.java.forEach((s, k) => { total++; if (['a', 'b', 'c'].some((v) => res['j' + k + v] && res['j' + k + v].ok)) ok++; else fail(s, (res['j' + k + s.pref] || { msg: '?' }).msg); });
  }
  // Python + SQL (one python process)
  const jobs = [];
  (by.python || []).forEach((s, k) => { const p = path.join(tmp, 'p' + k + '.py'); fs.writeFileSync(p, s.code); jobs.push({ k: 'py' + k, kind: 'py', path: p, run: !!s.run, s }); });
  (by.sql || []).forEach((s, k) => jobs.push({ k: 'sql' + k, kind: 'sql', code: s.code, db: s.db, schema: s.db !== undefined && m.databases ? m.databases[s.db] : '', s }));
  if (jobs.length) {
    const jf = path.join(tmp, 'jobs.json');
    fs.writeFileSync(jf, JSON.stringify(jobs.map((j) => Object.assign({}, j, { s: undefined }))));
    const r = spawnSync('python3', ['-I', path.join(__dirname, 'pycheck.py'), jf], { encoding: 'utf8', maxBuffer: 64 << 20, timeout: 600000 });
    let arr = [];
    try { arr = JSON.parse(r.stdout); } catch (e) { E('python', 'pycheck failed: ' + r.stderr); }
    const byK = {}; arr.forEach((x) => { byK[x.k] = x; });
    jobs.forEach((j) => { total++; const x = byK[j.k]; if (x && x.ok) ok++; else fail(j.s, x ? x.msg : 'no result'); });
  }
  // JS / TS
  if (by.js || by.ts) {
    let ts = null;
    for (const p of ['typescript', '/opt/node22/lib/node_modules/typescript']) { try { ts = require(p); break; } catch (e) { } }
    [].concat(by.js || [], by.ts || []).forEach((s, k) => {
      total++;
      if (ts) {
        const r = ts.transpileModule(s.code, { reportDiagnostics: true, fileName: 'snip.' + (s.lang === 'ts' ? 'tsx' : 'jsx'), compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
        const d = (r.diagnostics || []).filter((x) => x.category === ts.DiagnosticCategory.Error);
        if (d.length) { fail(s, d.map((x) => ts.flattenDiagnosticMessageText(x.messageText, '\n')).join('\n')); return; }
      } else W(s.where, 'typescript not installed, JS/TS syntax not checked');
      if (s.run && s.lang === 'js') {
        const f = path.join(tmp, 'r' + k + '.js');
        fs.writeFileSync(f, s.code);
        const r = spawnSync('node', [f], { encoding: 'utf8', timeout: 10000 });
        if (r.status !== 0) { fail(s, 'runtime error: ' + (r.stderr || r.error || '').toString().slice(-800)); return; }
      }
      ok++;
    });
  }
  // C++
  if (by.cpp) {
    const pchDir = path.join(os.tmpdir(), 'imastery-pch');
    const hdr = path.join(pchDir, 'all.h');
    if (!fs.existsSync(hdr + '.gch')) {
      // Shared with tools/solution-check.js and parallel runs: build privately, then rename into place.
      fs.mkdirSync(pchDir, { recursive: true });
      const tag = '.' + process.pid + '-' + Date.now();
      fs.writeFileSync(hdr + tag, '#include <bits/stdc++.h>\nusing namespace std;\n');
      if (!fs.existsSync(hdr)) fs.renameSync(hdr + tag, hdr); else fs.rmSync(hdr + tag, { force: true });
      const r = spawnSync('g++', ['-std=c++20', '-O1', '-x', 'c++-header', hdr, '-o', hdr + '.gch' + tag], { encoding: 'utf8' });
      if (r.status === 0 && !fs.existsSync(hdr + '.gch')) fs.renameSync(hdr + '.gch' + tag, hdr + '.gch'); else fs.rmSync(hdr + '.gch' + tag, { force: true });
    }
    const CSTUBS = {
      ListNode: 'struct ListNode { int val; ListNode* next; ListNode() : val(0), next(nullptr) {} ListNode(int x) : val(x), next(nullptr) {} ListNode(int x, ListNode* n) : val(x), next(n) {} };',
      TreeNode: 'struct TreeNode { int val; TreeNode* left; TreeNode* right; TreeNode() : val(0), left(nullptr), right(nullptr) {} TreeNode(int x) : val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode* l, TreeNode* r) : val(x), left(l), right(r) {} };'
    };
    by.cpp.forEach((s, k) => {
      total++;
      let stubs = '';
      for (const [n, d] of Object.entries(CSTUBS)) if (new RegExp('\\b' + n + '\\b').test(s.code) && !new RegExp('(struct|class)\\s+' + n + '\\b').test(s.code)) stubs += d + '\n';
      const tries = [stubs + s.code, stubs + 'void snip__() {\n' + s.code + '\n}\n'];
      let msg = '';
      for (let i = 0; i < tries.length; i++) {
        const f = path.join(tmp, 'c' + k + '_' + i + '.cpp');
        fs.writeFileSync(f, tries[i]);
        // A busy machine can stall g++; retry a timed-out compile once and say so if it times out again.
        const gxx = () => spawnSync('g++', ['-std=c++20', '-fsyntax-only', '-w', '-include', hdr, f], { encoding: 'utf8', timeout: 180000 });
        let r = gxx();
        if (r.error && r.error.code === 'ETIMEDOUT') r = gxx();
        if (r.error && r.error.code === 'ETIMEDOUT') { msg = 'g++ timed out twice (180 s each); the machine is overloaded, re-run this module'; break; }
        if (r.status === 0) { ok++; return; }
        if (i === 0) msg = r.stderr;
      }
      fail(s, msg.replace(new RegExp(tmp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/', 'g'), ''));
    });
  }
  // C#: mono (mcs/mono) or the .NET SDK via tools/harness/cs-compile.js. A snippet may be a whole program, a class, bare
  // members or statements; `run: true` programs must also exit 0 (their output is not compared, as for Python and JS).
  if (by.csharp) {
    const cs = require('./harness/cs-compile.js');
    if (!cs.toolchain()) { W('csharp', 'no C# compiler (mcs or dotnet), ' + by.csharp.length + ' C# snippet(s) not checked'); total += by.csharp.length; ok += by.csharp.length; }
    else {
      const USING = 'using System;\nusing System.Collections;\nusing System.Collections.Generic;\nusing System.Linq;\nusing System.Text;\n';
      const CS_STUBS = {
        ListNode: 'public class ListNode { public int val; public ListNode next; public ListNode(int val = 0, ListNode next = null) { this.val = val; this.next = next; } }',
        TreeNode: 'public class TreeNode { public int val; public TreeNode left; public TreeNode right; public TreeNode(int val = 0, TreeNode left = null, TreeNode right = null) { this.val = val; this.left = left; this.right = right; } }'
      };
      const USING_RE = /^[ \t]*using\s+(static\s+)?[\w.]+(\s*=\s*[\w.<>, ]+)?\s*;[ \t]*$/gm;
      by.csharp.forEach((s, k) => {
        total++;
        let stubs = '';
        for (const [n, d] of Object.entries(CS_STUBS)) if (new RegExp('\\b' + n + '\\b').test(s.code) && !new RegExp('(class|struct)\\s+' + n + '\\b').test(s.code)) stubs += d + '\n';
        const usings = (s.code.match(USING_RE) || []).map((u) => u.trim()).join('\n') + '\n', body = s.code.replace(USING_RE, '');
        const head = USING + usings + stubs;
        const tries = s.run ? [head + body] : [head + body, head + 'class Snip__ {\n' + body + '\n}\n', head + 'class Snip__ {\n  void Run__() {\n' + body + '\n  }\n}\n'];
        let msg = '';
        for (let i = 0; i < tries.length; i++) {
          const r = cs.compile(path.join(tmp, 'cs' + k + '_' + i), tries[i], { exe: !!s.run, timeout: 180000 });
          if (r.ok) {
            if (s.run) { const x = r.run('', 10000); if (x.status !== 0) { msg = 'runtime error: ' + ((x.stderr || (x.error && x.error.message) || x.stdout || '') + '').toString().slice(-800); break; } }
            ok++; return;
          }
          if (i === 0) msg = r.err;
        }
        fail(s, msg);
      });
    }
  }
  (by.json || []).forEach((s) => { total++; try { JSON.parse(s.code); ok++; } catch (e) { fail(s, e.message); } });
  [].concat(by.bash || [], by.sh || []).forEach((s, k) => {
    total++;
    const f = path.join(tmp, 'b' + k + '.sh'); fs.writeFileSync(f, s.code);
    const r = spawnSync('bash', ['-n', f], { encoding: 'utf8' });
    if (r.status === 0) ok++; else fail(s, r.stderr);
  });
  (by.yaml || []).forEach((s, k) => {
    total++;
    const f = path.join(tmp, 'y' + k + '.yaml'); fs.writeFileSync(f, s.code);
    const r = spawnSync('python3', ['-c', 'import sys, yaml; list(yaml.safe_load_all(open(sys.argv[1])))', f], { encoding: 'utf8' });
    if (r.status === 0) ok++; else fail(s, (r.stderr || '').split('\n').slice(-4).join('\n'));
  });
  const unchecked = Object.keys(by).filter((l) => !['java', 'python', 'sql', 'js', 'ts', 'cpp', 'csharp', 'json', 'bash', 'sh', 'yaml'].includes(l)).reduce((a, l) => a + by[l].length, 0);
  console.log('code: ' + ok + '/' + total + ' checked snippets pass' + (unchecked ? ' (' + unchecked + ' in unchecked languages)' : ''));
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (CODE) codeCheck();

console.log(m.id + ' "' + m.title + '" [' + plan.level + ']: ' + (m.topics || []).length + ' topics, ' + exCount + ' examples, ' + vizCount + ' visualizers (' + frameCount + ' frames), ' + core + ' guided, ' + pr.length + ' practice (' +
  ['Easy', 'Medium', 'Hard'].map((l) => lc(l) + ' ' + l).join(', ') + '), ' + qz.length + ' quiz, ' + iv.length + ' interview, ' + snippets.length + ' checked snippets, ' + (src.length / 1024).toFixed(0) + ' KB');
warns.forEach((w) => console.log('WARN  ' + w));
errors.slice(0, 150).forEach((e) => console.log('ERROR ' + e));
if (errors.length > 150) console.log('… ' + (errors.length - 150) + ' more errors');
console.log(errors.length ? 'FAILED with ' + errors.length + ' error(s)' : 'PASSED');
process.exit(errors.length ? 1 : 0);
