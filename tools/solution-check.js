// Runs every problem's solutions against its test cases in Java, Python, JavaScript/TypeScript, C++ and C#.
// usage: node tools/solution-check.js content/<track>/<id>.js [--lang java,python,js,ts,cpp,csharp] [--only <index>] [--report] [--keep]
//
// A problem opts in with a language-neutral `tests` field:
//   function:   tests: { sig: 'int[] int -> int[]', fn: 'twoSum', cases: [[[[2,7,11,15], 9], [0,1]], ...], cmp: 'exact' }
//   design:     tests: { cls: 'LRUCache', sigs: { LRUCache: 'int', put: 'int int -> void', get: 'int -> int' },
//                        cases: [{ ops: ['LRUCache', 'put', 'get'], args: [[2], [1, 1], [1]], out: [null, null, 1] }] }
//   program:    tests: { io: true, cases: [{ stdin: '3\n1 2 3\n', stdout: '6' }] }
//   SQL:        tests: { db?, engine: 'sqlite'|'postgres'|'both', cmp: 'exact'|'set', cases: [{ setup?, after?, result?, cols?, rows: [[...]] } | { after, error: 'regex' }] }
//   TS types:   tests: { types: ['type _1 = Expect<Equal<First<[3, 2]>, 3>>', '// @ts-expect-error\nconst x: Id = 5'] }
//   not code:   tests: { skip: 'reason' }
// Types: int long double bool string char ListNode TreeNode void, T[] / T[][] arrays, list<T> lists.
// cmp: exact (default) | set (order-free list) | sets (order-free list of order-free lists) | float | oneOf (expected = list of answers)
// check: optional JS source '(args, out) => boolean' for answers with many valid forms.
// generated values: { $rep: V, n: N }, { $range: [a, b, step] }, { $concat: [...] } for big inputs (see LANGUAGE_AUTHORING.md)
// Stacks and recursion limits are each language's defaults, as a learner gets them: a solution that overflows at the
// stated maximum input is a real bug (use iteration, or raise the limit inside the solution itself).
// harness: { java, python, js, cpp, csharp } -> test-only helper code appended to each solution before compiling; with Java
//               and C#, put helpers in their own class with static methods (e.g. class Check { static int[] cycleInfo(...) }).
// mutate: k  -> for '-> void' functions, the answer is argument k after the call.
// both: k     -> for functions that return a value and change argument k (e.g. remove duplicates in place), the answer is
//               [returned value, argument k after the call]; usually paired with a check function.
// names: { python: 'two_sum', csharp: 'TwoSum' } overrides the function name per language (default: Python uses snake_case,
//               C# PascalCase, others the given name). C# needs mono (mcs) or the .NET SDK (dotnet); see tools/harness/cs-compile.js.
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const LANGS = (opt('lang') || 'java,python,js,ts,cpp,csharp,sql').split(',');
const ONLY = opt('only') !== null ? +opt('only') : null;
const REPORT = args.includes('--report'), KEEP = args.includes('--keep'), QUIET = args.includes('--quiet');
const REQUIRE = (opt('require') || '').split(',').filter(Boolean);
if (!file) { console.error('usage: node tools/solution-check.js content/<track>/<id>.js [--lang ...] [--only N] [--report]'); process.exit(2); }

const asList = (x) => (x === undefined || x === null ? [] : Array.isArray(x) ? x : [x]);
const ctx = { console, MODULES: [], window: {} };
ctx.registerModule = (m) => ctx.MODULES.push(m);
vm.createContext(ctx);
for (const f of ['src/helpers.js', 'src/tracks.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
const mod = ctx.MODULES[0];
const track = ctx.TRACKS.find((t) => t.modules.some((pm) => pm.id === mod.id));
const DEF = mod.lang || track.lang;
const NORM = { javascript: 'js', typescript: 'ts', py: 'python', 'c++': 'cpp', c: 'cpp', 'c#': 'csharp', cs: 'csharp' };

/* ---------- collect problems ---------- */
const problems = [];
mod.topics.forEach((t, i) => asList(t.problems).concat(asList(t.problem)).forEach((p, j) => problems.push({ id: mod.id + '-t' + i + '-q' + j, p, lang: t.lang || DEF })));
(mod.practice || []).forEach((p, k) => problems.push({ id: mod.id + '-p' + k, p, lang: DEF }));
function dedent(src) {
  if (typeof src !== 'string') return src;
  const lines = src.replace(/\t/g, '    ').replace(/\r/g, '').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const min = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(Number.isFinite(min) ? min : 0)).join('\n');
}
function impls(pr) {
  const s = pr.p.solution || {}, out = {};
  // Code is dedented the way the site displays it (src/engine.js dedent), so an indented template literal still runs.
  // An alternative marked check: false is illustrative and not meant to run (for example a MongoDB pipeline shown as JS).
  // The main solution is always tested: there check: false only means the validator cannot compile it (e.g. PostgreSQL-only SQL).
  const add = (c, l, isAlt) => { if (!c || (isAlt && typeof c === 'object' && c.check === false)) return; const code = dedent(typeof c === 'object' ? c.code : c); const lang = NORM[(typeof c === 'object' && c.lang) || l] || (typeof c === 'object' && c.lang) || l; if (code && !out[lang]) out[lang] = code; };
  // tests.alt: k tests solution.alt[k] first (e.g. the pure-Python version when the main one needs NumPy).
  const T0 = pr.p.tests || {};
  if (Number.isInteger(T0.alt)) add(asList(s.alt)[T0.alt], pr.p.lang || pr.lang, false);
  add(s.code, pr.p.lang || pr.lang);
  asList(s.alt).forEach((a) => add(a, pr.p.lang || pr.lang, true));
  return out;
}

/* ---------- types ---------- */
function parseType(t) {
  t = t.trim();
  let m = t.match(/^list<(.+)>$/);
  if (m) return { k: 'list', of: parseType(m[1]) };
  if (t.endsWith('[]')) return { k: 'arr', of: parseType(t.slice(0, -2)) };
  if (!['int', 'long', 'double', 'bool', 'string', 'char', 'ListNode', 'TreeNode', 'void'].includes(t)) throw new Error('unknown type "' + t + '"');
  return { k: t };
}
function parseSig(sig) {
  const [a, r] = sig.split('->');
  return { params: a.trim() ? a.trim().split(/\s+/).map(parseType) : [], ret: parseType((r || 'void').trim()) };
}
const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z])([A-Z][a-z])/g, '$1_$2').toLowerCase();
const pascal = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Java ---------- */
const J_IMP = 'import java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport java.util.concurrent.*;\nimport java.util.concurrent.atomic.*;\nimport java.util.concurrent.locks.*;\nimport java.time.*;\nimport java.math.*;\nimport java.io.*;\n';
const J_NODES = {
  ListNode: 'class ListNode { int val; ListNode next; ListNode() {} ListNode(int v) { val = v; } ListNode(int v, ListNode n) { val = v; next = n; } }',
  TreeNode: 'class TreeNode { int val; TreeNode left, right; TreeNode() {} TreeNode(int v) { val = v; } TreeNode(int v, TreeNode l, TreeNode r) { val = v; left = l; right = r; } }'
};
const J_H = fs.readFileSync(path.join(__dirname, 'harness', 'H.java'), 'utf8');
function jType(t) {
  if (t.k === 'arr') return jType(t.of) + '[]';
  if (t.k === 'list') return 'List<' + jBox(t.of) + '>';
  return { int: 'int', long: 'long', double: 'double', bool: 'boolean', string: 'String', char: 'char', ListNode: 'ListNode', TreeNode: 'TreeNode', void: 'void' }[t.k];
}
function jBox(t) { return t.k === 'list' || t.k === 'arr' ? jType(t) : ({ int: 'Integer', long: 'Long', double: 'Double', bool: 'Boolean', string: 'String', char: 'Character' }[t.k] || jType(t)); }

/* ---------- generated values: big inputs without huge literals ----------
   { $rep: V, n: N }          N copies of V (array or list), or string V repeated N times
   { $range: [a, b, step] }   integers a, a+step, ... up to but not including b (step defaults to 1)
   { $concat: [part, ...] }   parts joined; each part is a literal array/string or one of the forms above */
const isGen = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && ('$rep' in v || '$range' in v || '$concat' in v);
const genParts = (v) => (v.$concat ? v.$concat : [v]);
const rangeArgs = (r) => { const [a, b, st = 1] = r; if (!st) throw new Error('$range step 0'); return [a, b, st]; };
function expand(v, t) {
  if (Array.isArray(v)) return v.map((x, i) => expand(x, t && (t.k === 'arr' || t.k === 'list') ? t.of : t && t.list ? t.list[i] : undefined));
  if (!isGen(v)) return v;
  const hasStr = genParts(v).some((p) => typeof p === 'string' || (isGen(p) && typeof p.$rep === 'string'));
  const str = t ? t.k === 'string' : hasStr, el = t && (t.k === 'arr' || t.k === 'list') ? t.of : undefined;
  const out = [];
  for (const p of genParts(v)) {
    if (typeof p === 'string') out.push(...(str ? [p] : p.split('')));
    else if (Array.isArray(p)) out.push(...p.map((x) => expand(x, el)));
    else if ('$rep' in p) { if (typeof p.$rep === 'string' && str) out.push(p.$rep.repeat(p.n)); else { const one = expand(p.$rep, el); for (let i = 0; i < p.n; i++) out.push(i && one && typeof one === 'object' ? JSON.parse(JSON.stringify(one)) : one); } }
    else { const [a, b, st] = rangeArgs(p.$range); for (let i = a; st > 0 ? i < b : i > b; i += st) out.push(i); }
  }
  return str ? out.join('') : out;
}
const PRIM = new Set(['int', 'long', 'double', 'bool', 'char', 'string']);
const STREAM = { int: ['IntStream', 'Integer'], long: ['LongStream', 'Long'], double: ['DoubleStream', 'Double'] };
function jGen(t, v) {
  if (t.k === 'string') return '(' + genParts(v).map((p) => (typeof p === 'string' ? JSON.stringify(p) : JSON.stringify(p.$rep) + '.repeat(' + p.n + ')')).join(' + ') + ')';
  if (t.k === 'arr' && t.of.k === 'char') return '(' + genParts(v).map((p) => (typeof p === 'string' ? JSON.stringify(p) : Array.isArray(p) ? JSON.stringify(p.join('')) : JSON.stringify(p.$rep) + '.repeat(' + p.n + ')')).join(' + ') + ').toCharArray()';
  const el = t.of, S = STREAM[el.k], st = S ? 'java.util.stream.' + S[0] : 'java.util.stream.Stream';
  const part = (p) => {
    if (Array.isArray(p)) return st + '.of(' + p.map((x) => jLit(el, x)).join(',') + ')';
    if ('$rep' in p) return st + '.generate(() -> ' + jLit(el, p.$rep) + ').limit(' + p.n + ')';
    const [a, b, s2] = rangeArgs(p.$range), x = '_hg';
    return st + '.iterate(' + jLit0(el, a) + ', ' + x + ' -> ' + x + (s2 > 0 ? ' < ' : ' > ') + jLit0(el, b) + ', ' + x + ' -> ' + x + ' + ' + jLit0(el, s2) + ')';
  };
  const ps = genParts(v).map(part), all = ps.reduce((acc, q) => st + '.concat(' + acc + ', ' + q + ')');
  if (t.k === 'arr') return all + (S ? '.toArray()' : '.toArray(' + jType(el) + '[]::new)');
  return (S ? all + '.boxed()' : all) + '.collect(java.util.stream.Collectors.toCollection(ArrayList::new))';
}
function pyGen(t, v) {
  return '(' + genParts(v).map((p) => {
    if (typeof p === 'string') return t.k === 'string' ? JSON.stringify(p) : 'list(' + JSON.stringify(p) + ')';
    if (Array.isArray(p)) return '[' + p.map((x) => pyLit(t.of, x)).join(', ') + ']';
    if ('$rep' in p) return t.k === 'string' ? JSON.stringify(p.$rep) + ' * ' + p.n : PRIM.has(t.of.k) ? '[' + pyLit0(t.of, p.$rep) + '] * ' + p.n : '[' + pyLit(t.of, p.$rep) + ' for _ in range(' + p.n + ')]';
    const [a, b, s2] = rangeArgs(p.$range); return 'list(range(' + a + ', ' + b + ', ' + s2 + '))';
  }).join(' + ') + ')';
}
function jsGen(t, v) {
  if (t.k === 'string') return '(' + genParts(v).map((p) => (typeof p === 'string' ? JSON.stringify(p) : JSON.stringify(p.$rep) + '.repeat(' + p.n + ')')).join(' + ') + ')';
  return '[' + genParts(v).map((p) => {
    if (typeof p === 'string') return '...' + JSON.stringify(p);
    if (Array.isArray(p)) return p.map((x) => jsLit(t.of, x)).join(', ');
    if ('$rep' in p) return PRIM.has(t.of.k) ? '...Array(' + p.n + ').fill(' + jsLit0(t.of, p.$rep) + ')' : '...Array.from({ length: ' + p.n + ' }, () => ' + jsLit(t.of, p.$rep) + ')';
    const [a, b, s2] = rangeArgs(p.$range), n = Math.max(0, Math.ceil((b - a) / s2));
    return '...Array.from({ length: ' + n + ' }, (_, i) => ' + a + ' + i * ' + s2 + ')';
  }).filter((x) => x !== '').join(', ') + ']';
}
function cGen(t, v) {
  const T = cType(t), el = t.k === 'string' ? 'char' : cType(t.of);
  const part = (p) => {
    if (typeof p === 'string') return t.k === 'string' ? 'string(' + JSON.stringify(p) + ')' : '[]{ string s = ' + JSON.stringify(p) + '; return ' + T + '(s.begin(), s.end()); }()';
    if (Array.isArray(p)) return T + '{' + p.map((x) => cLit(t.of, x)).join(', ') + '}';
    if ('$rep' in p) return t.k === 'string' ? '[]{ string r; for (int i = 0; i < ' + p.n + '; i++) r += ' + JSON.stringify(p.$rep) + '; return r; }()' : PRIM.has(t.of.k) ? T + '(' + p.n + ', ' + cLit0(t.of, p.$rep) + ')' : '[]{ ' + T + ' r; for (int i = 0; i < ' + p.n + '; i++) r.push_back(' + cLit(t.of, p.$rep) + '); return r; }()';
    const [a, b, s2] = rangeArgs(p.$range);
    return '[]{ ' + T + ' r; for (' + el + ' i = ' + a + '; i ' + (s2 > 0 ? '<' : '>') + ' ' + b + '; i += ' + s2 + ') r.push_back(i); return r; }()';
  };
  return '[]{ ' + T + ' r; ' + genParts(v).map((p) => '{ auto q = ' + part(p) + '; r.insert(r.end(), q.begin(), q.end()); }').join(' ') + ' return r; }()';
}

let csGenN = 0;
function csGen(t, v) {
  const rep = (p) => 'string.Concat(Enumerable.Repeat(' + JSON.stringify(p.$rep) + ', ' + p.n + '))', iv = '_i' + (csGenN++);
  if (t.k === 'string') return '(' + genParts(v).map((p) => (typeof p === 'string' ? JSON.stringify(p) : rep(p))).join(' + ') + ')';
  if (t.k === 'arr' && t.of.k === 'char') return '(' + genParts(v).map((p) => (typeof p === 'string' ? JSON.stringify(p) : Array.isArray(p) ? JSON.stringify(p.join('')) : rep(p))).join(' + ') + ').ToCharArray()';
  const el = t.of, E = csType(el);
  const part = (p) => {
    if (Array.isArray(p)) return 'new ' + E + '[]{' + p.map((x) => csLit(el, x)).join(', ') + '}';
    if ('$rep' in p) return PRIM.has(el.k) ? 'Enumerable.Repeat<' + E + '>(' + csLit0(el, p.$rep) + ', ' + p.n + ')' : 'Enumerable.Range(0, ' + p.n + ').Select<int, ' + E + '>(' + iv + ' => ' + csLit(el, p.$rep) + ')';
    const [a, b, s2] = rangeArgs(p.$range), n = Math.max(0, Math.ceil((b - a) / s2));
    return 'Enumerable.Range(0, ' + n + ').Select<int, ' + E + '>(' + iv + ' => (' + E + ')(' + csLit0(el, a) + ' + (long)' + iv + ' * ' + csLit0(el, s2) + '))';
  };
  const ps = genParts(v).map(part), all = ps.length === 1 ? ps[0] : ps.reduce((acc, q) => acc + '.Concat(' + q + ')');
  return t.k === 'arr' ? all + '.ToArray()' : 'new List<' + E + '>(' + all + ')';
}

const INTS = { k: 'arr', of: { k: 'int' } };
function jLit(t, v) { return !isGen(v) ? jLit0(t, v) : t.k === 'ListNode' ? '(ListNode) H.list(' + jGen(INTS, v) + ')' : jGen(t, v); }
function pyLit(t, v) { return !isGen(v) ? pyLit0(t, v) : t.k === 'ListNode' ? '_h_list(' + pyGen(INTS, v) + ')' : pyGen(t, v); }
function jsLit(t, v) { return !isGen(v) ? jsLit0(t, v) : t.k === 'ListNode' ? '_h_list(' + jsGen(INTS, v) + ')' : jsGen(t, v); }
function cLit(t, v) { return !isGen(v) ? cLit0(t, v) : t.k === 'ListNode' ? '_h_list(' + cGen(INTS, v) + ')' : cGen(t, v); }
function csLit(t, v) { return !isGen(v) ? csLit0(t, v) : t.k === 'ListNode' ? 'H.List(' + csGen(INTS, v) + ')' : csGen(t, v); }
function jLit0(t, v) {
  if (v === null && !['int', 'long', 'double', 'bool', 'char'].includes(t.k)) return 'null';
  switch (t.k) {
    case 'int': return String(v);
    case 'long': return String(v) + 'L';
    case 'double': return (Number.isInteger(+v) ? (+v).toFixed(1) : String(v));
    case 'bool': return v ? 'true' : 'false';
    case 'string': return JSON.stringify(String(v));
    case 'char': return "'" + (v === "'" ? "\\'" : v === '\\' ? '\\\\' : v) + "'";
    case 'ListNode': return '(ListNode) H.list(new int[]{' + v.join(',') + '})';
    case 'TreeNode': return '(TreeNode) H.tree(new Integer[]{' + v.map((x) => (x === null ? 'null' : x)).join(',') + '})';
    case 'arr': return 'new ' + jType(t) + '{' + v.map((x) => jArrInner(t.of, x)).join(',') + '}';
    case 'list': return 'new ArrayList<' + jBox(t.of) + '>(Arrays.<' + jBox(t.of) + '>asList(' + v.map((x) => jLit(t.of, x)).join(',') + '))';
  }
}
function jArrInner(t, v) { return t.k === 'arr' && !isGen(v) && v !== null ? '{' + v.map((x) => jArrInner(t.of, x)).join(',') + '}' : jLit(t, v); }
function jCallTarget(code, fn, kw) {
  const at = code.search(new RegExp('\\b' + fn + '\\s*\\('));
  // The owner is the innermost class whose body contains the method (a nested helper class declared earlier is skipped).
  const span = (i) => { const open = code.indexOf('{', i); let d = 0; for (let j = open; j >= 0 && j < code.length; j++) { if (code[j] === '{') d++; else if (code[j] === '}' && --d === 0) return [open, j]; } return [open, code.length]; };
  const classes = [...code.matchAll(kw || /\b(class|record)\s+(\w+)/g)].filter((m) => m.index < at).map((m) => ({ name: m[2], r: span(m.index) })).filter((c) => c.r[0] < at && at < c.r[1]);
  const owner = classes.length ? classes[classes.length - 1].name : 'Solution';
  const isStatic = new RegExp('static[^;{(]*\\b' + fn + '\\s*\\(').test(code);
  return isStatic ? owner + '.' + fn : 'new ' + owner + '().' + fn;
}
function javaSource(pr, code, T) {
  const imps = (code.match(/^import\s+(static\s+)?[\w.*]+\s*;\s*$/gm) || []).join('\n');
  let body = code.replace(/^import\s+(static\s+)?[\w.*]+\s*;\s*$/gm, '').replace(/^package\s+[\w.]+\s*;\s*$/gm, '');
  body = body.replace(/^(\s*)public\s+(?=((final|abstract|sealed)\s+)*(class|interface|enum|record)\b)/gm, '$1');
  let stubs = '';
  for (const [n, d] of Object.entries(J_NODES)) if (new RegExp('\\b' + n + '\\b').test(body + JSON.stringify(T)) && !new RegExp('(class|record)\\s+' + n + '\\b').test(body)) stubs += d + '\n';
  // Each case (and each block of 200 design operations) gets its own method, so big tests stay under Java's 64 KB method limit.
  let main = '', methods = '';
  if (T.io) {
    main = null;
  } else if (T.cls) {
    methods += '  static ' + T.cls + ' obj; static StringBuilder sb;\n';
    T.cases.forEach((c, ci) => {
      const calls = [];
      for (let k = 0; k * 200 < c.ops.length; k++) {
        let b = '';
        c.ops.slice(k * 200, k * 200 + 200).forEach((op, j) => {
          const oi = k * 200 + j, sig = parseSig(T.sigs[op] || '');
          const a = c.args[oi].map((v, i) => jLit(sig.params[i], v)).join(', ');
          if (oi) b += '    sb.append(",");\n';
          if (op === T.cls) b += '    obj = new ' + T.cls + '(' + a + '); sb.append("null");\n';
          else if (sig.ret.k === 'void') b += '    obj.' + op + '(' + a + '); sb.append("null");\n';
          else b += '    sb.append(H.json(obj.' + op + '(' + a + ')));\n';
        });
        methods += '  static void c' + ci + '_' + k + '() throws Exception {\n' + b + '  }\n';
        calls.push('c' + ci + '_' + k + '();');
      }
      main += '    try { sb = new StringBuilder("["); obj = null; ' + calls.join(' ') + ' System.out.println("@@' + ci + ' " + sb.append("]")); } catch (Throwable e) { System.out.println("@@' + ci + ' !" + e); }\n';
    });
  } else {
    const sig = parseSig(T.sig), fn = (T.names && T.names.java) || T.fn, target = jCallTarget(body, fn);
    T.cases.forEach((c, ci) => {
      const decl = c[0].map((v, i) => jType(sig.params[i]) + ' a' + i + ' = ' + jLit(sig.params[i], v) + ';').join(' ');
      const call = target + '(' + c[0].map((_, i) => 'a' + i).join(', ') + ')';
      const res = sig.ret.k === 'void' ? call + '; System.out.println("@@' + ci + ' " + H.json(a' + (T.mutate || 0) + '));' : (T.both !== undefined ? '{ var _r = ' + call + '; System.out.println("@@' + ci + ' [" + H.json(_r) + "," + H.json(a' + T.both + ') + "]"); }' : 'System.out.println("@@' + ci + ' " + H.json(' + call + '));');
      methods += '  static void f' + ci + '() {\n    try { ' + decl + ' ' + res + ' } catch (Throwable e) { System.out.println("@@' + ci + ' !" + e); }\n  }\n';
      main += '    f' + ci + '();\n';
    });
  }
  return J_IMP + imps + '\n' + body + '\n' + stubs + J_H + (main === null ? '' : '\nclass Main__ {\n' + methods + '  public static void main(String[] x) throws Exception {\n' + main + '  }\n}\n');
}

/* ---------- Python ---------- */
const PY_H = fs.readFileSync(path.join(__dirname, 'harness', 'h.py'), 'utf8');
function pyLit0(t, v) {
  if (v === null) return 'None';
  switch (t.k) {
    case 'bool': return v ? 'True' : 'False';
    case 'string': case 'char': return JSON.stringify(String(v));
    case 'int': case 'long': return String(v);
    case 'double': return String(v);
    case 'ListNode': return '_h_list(' + JSON.stringify(v) + ')';
    case 'TreeNode': return '_h_tree(' + JSON.stringify(v).replace(/null/g, 'None') + ')';
    default: return '[' + v.map((x) => pyLit(t.of, x)).join(', ') + ']';
  }
}
function pySource(pr, code, T) {
  if (T.io) return code;
  let s = PY_H + '\n' + code + '\n\n';
  if (T.cls) {
    T.cases.forEach((c, ci) => {
      s += 'try:\n    _r = []\n';
      c.ops.forEach((op, oi) => {
        const sig = parseSig(T.sigs[op] || ''), a = c.args[oi].map((v, i) => pyLit(sig.params[i], v)).join(', ');
        s += op === T.cls ? '    _o = ' + T.cls + '(' + a + '); _r.append(None)\n' : '    _r.append(' + (sig.ret.k === 'void' ? '_h_void(_o.' + op + '(' + a + '))' : '_o.' + op + '(' + a + ')') + ')\n';
      });
      s += '    print("@@' + ci + ' " + _h_json(_r))\nexcept Exception as e:\n    print("@@' + ci + ' !" + repr(e))\n';
    });
  } else {
    const sig = parseSig(T.sig), fn = (T.names && T.names.python) || snake(T.fn);
    const target = '(Solution().' + fn + " if 'Solution' in globals() and hasattr(Solution, '" + fn + "') else " + fn + ')';
    T.cases.forEach((c, ci) => {
      const decl = c[0].map((v, i) => '_a' + i + ' = ' + pyLit(sig.params[i], v)).join('; ');
      const call = target + '(' + c[0].map((_, i) => '_a' + i).join(', ') + ')';
      s += 'try:\n    ' + (decl || 'pass') + '\n    ' + (sig.ret.k === 'void' ? call + '\n    print("@@' + ci + ' " + _h_json(_a' + (T.mutate || 0) + '))' : (T.both !== undefined ? '_r = ' + call + '\n    print("@@' + ci + ' [" + _h_json(_r) + "," + _h_json(_a' + T.both + ') + "]")' : 'print("@@' + ci + ' " + _h_json(' + call + '))')) + '\nexcept Exception as e:\n    print("@@' + ci + ' !" + repr(e))\n';
    });
  }
  return s;
}

/* ---------- JavaScript / TypeScript ---------- */
const JS_H = fs.readFileSync(path.join(__dirname, 'harness', 'h.js'), 'utf8');
function jsLit0(t, v) {
  if (v === null) return 'null';
  if (t.k === 'ListNode') return '_h_list(' + JSON.stringify(v) + ')';
  if (t.k === 'TreeNode') return '_h_tree(' + JSON.stringify(v) + ')';
  if (t.k === 'long' && typeof v === 'string') return v + 'n';
  if (t.k === 'arr' || t.k === 'list') return '[' + v.map((x) => jsLit(t.of, x)).join(', ') + ']';
  return JSON.stringify(v);
}
let tsMod = null;
function transpileTs(code) {
  if (!tsMod) for (const p of ['typescript', '/opt/node22/lib/node_modules/typescript']) { try { tsMod = require(p); break; } catch (e) { } }
  if (!tsMod) throw new Error('typescript is not installed');
  const r = tsMod.transpileModule(code, { reportDiagnostics: true, compilerOptions: { target: tsMod.ScriptTarget.ES2022, module: tsMod.ModuleKind.CommonJS } });
  const errs = (r.diagnostics || []).filter((d) => d.category === tsMod.DiagnosticCategory.Error);
  if (errs.length) throw new Error(errs.map((d) => tsMod.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  return r.outputText;
}
function jsSource(pr, code, T, ts) {
  if (ts) code = transpileTs(code);
  if (T.io) return code;
  let h = JS_H;
  if (/\bclass\s+ListNode\b/.test(code)) h = h.replace(/^class ListNode .*$/m, '');
  if (/\bclass\s+TreeNode\b/.test(code)) h = h.replace(/^class TreeNode .*$/m, '');
  let s = h + '\n' + code + '\n;\n';
  if (T.cls) {
    T.cases.forEach((c, ci) => {
      s += 'try { const _r = []; let _o;\n';
      c.ops.forEach((op, oi) => {
        const sig = parseSig(T.sigs[op] || ''), a = c.args[oi].map((v, i) => jsLit(sig.params[i], v)).join(', ');
        s += op === T.cls ? '  _o = new ' + T.cls + '(' + a + '); _r.push(null);\n' : '  _r.push(' + (sig.ret.k === 'void' ? '(_o.' + op + '(' + a + '), null)' : '_o.' + op + '(' + a + ')') + ');\n';
      });
      s += '  console.log("@@' + ci + ' " + _h_json(_r)); } catch (e) { console.log("@@' + ci + ' !" + e); }\n';
    });
  } else {
    const sig = parseSig(T.sig), fn = (T.names && T.names.js) || T.fn;
    const target = "(typeof Solution !== 'undefined' && Solution.prototype && Solution.prototype." + fn + ' ? ((...a) => new Solution().' + fn + '(...a)) : ' + fn + ')';
    T.cases.forEach((c, ci) => {
      const decl = c[0].map((v, i) => 'const _a' + i + ' = ' + jsLit(sig.params[i], v) + ';').join(' ');
      const call = target + '(' + c[0].map((_, i) => '_a' + i).join(', ') + ')';
      s += 'try { ' + decl + ' ' + (sig.ret.k === 'void' ? call + '; console.log("@@' + ci + ' " + _h_json(_a' + (T.mutate || 0) + '));' : (T.both !== undefined ? 'const _r = ' + call + '; console.log("@@' + ci + ' [" + _h_json(_r) + "," + _h_json(_a' + T.both + ') + "]");' : 'console.log("@@' + ci + ' " + _h_json(' + call + '));')) + ' } catch (e) { console.log("@@' + ci + ' !" + e); }\n';
    });
  }
  return s;
}

/* ---------- C++ ---------- */
const CPP_H = fs.readFileSync(path.join(__dirname, 'harness', 'h.hpp'), 'utf8');
const CPP_NODES = fs.readFileSync(path.join(__dirname, 'harness', 'h_nodes.hpp'), 'utf8');
function cType(t) {
  if (t.k === 'arr' || t.k === 'list') return 'vector<' + cType(t.of) + '>';
  return { int: 'int', long: 'long long', double: 'double', bool: 'bool', string: 'string', char: 'char', ListNode: 'ListNode*', TreeNode: 'TreeNode*', void: 'void' }[t.k];
}
function cLit0(t, v) {
  if (v === null) return t.k === 'ListNode' || t.k === 'TreeNode' ? 'nullptr' : '{}';
  switch (t.k) {
    case 'int': return String(v);
    case 'long': return String(v) + 'LL';
    case 'double': return Number.isInteger(+v) ? (+v).toFixed(1) : String(v);
    case 'bool': return v ? 'true' : 'false';
    case 'string': return 'string(' + JSON.stringify(String(v)) + ')';
    case 'char': return "'" + (v === "'" ? "\\'" : v === '\\' ? '\\\\' : v) + "'";
    case 'ListNode': return '_h_list({' + v.join(',') + '})';
    case 'TreeNode': return '_h_tree({' + v.map((x) => (x === null ? 'INT_MIN' : x)).join(',') + '})';
    default: return cType(t) + '{' + v.map((x) => cLit(t.of, x)).join(', ') + '}';
  }
}
function cppSource(pr, code, T) {
  if (T.io) return code;
  const uses = (n) => new RegExp('\\b' + n + '\\b').test(code + JSON.stringify(T));
  const own = (n) => new RegExp('(struct|class)\\s+' + n + '\\s*\\{').test(code);
  const flags = '#define H_LISTNODE ' + (uses('ListNode') && !own('ListNode') ? 1 : 0) + '\n#define H_TREENODE ' + (uses('TreeNode') && !own('TreeNode') ? 1 : 0) + '\n#define H_USES_LISTNODE ' + (uses('ListNode') ? 1 : 0) + '\n#define H_USES_TREENODE ' + (uses('TreeNode') ? 1 : 0) + '\n';
  // A lesson program's own main() is renamed so function and design tests can call its functions with many cases.
  code = code.replace(/\bint\s+main\s*\(/g, 'int lesson_main__(');
  let s = flags + CPP_H + '\n' + code + '\n' + CPP_NODES + '\nint main() {\n';
  if (T.cls) {
    T.cases.forEach((c, ci) => {
      s += '  try { string _r = "["; ' + T.cls + '* _o = nullptr;\n';
      c.ops.forEach((op, oi) => {
        const sig = parseSig(T.sigs[op] || '');
        const decl = c.args[oi].map((v, i) => 'auto _a' + oi + '_' + i + ' = ' + cLit(sig.params[i], v) + ';').join(' ');
        const a = c.args[oi].map((_, i) => '_a' + oi + '_' + i).join(', ');
        s += '    { ' + decl + (oi ? ' _r += ",";' : '') + (op === T.cls ? ' _o = new ' + T.cls + '(' + a + '); _r += "null";' : sig.ret.k === 'void' ? ' _o->' + op + '(' + a + '); _r += "null";' : ' _r += _h_json(_o->' + op + '(' + a + '));') + ' }\n';
      });
      s += '    cout << "@@' + ci + ' " << _r << "]" << endl; } catch (std::exception& e) { cout << "@@' + ci + ' !" << e.what() << endl; }\n';
    });
  } else {
    const sig = parseSig(T.sig), fn = (T.names && T.names.cpp) || T.fn;
    const fromHarness = T.harness && T.harness.cpp && new RegExp('\\b' + fn + '\\s*\\(').test(T.harness.cpp);
    const target = !fromHarness && /\bclass\s+Solution\b|\bstruct\s+Solution\b/.test(code) ? 'Solution().' + fn : fn;
    T.cases.forEach((c, ci) => {
      const decl = c[0].map((v, i) => cType(sig.params[i]) + ' _a' + i + ' = ' + cLit(sig.params[i], v) + ';').join(' ');
      const call = target + '(' + c[0].map((_, i) => '_a' + i).join(', ') + ')';
      s += '  try { ' + decl + ' ' + (sig.ret.k === 'void' ? call + '; cout << "@@' + ci + ' " << _h_json(_a' + (T.mutate || 0) + ') << endl;' : (T.both !== undefined ? 'auto _r = ' + call + '; cout << "@@' + ci + ' [" << _h_json(_r) << "," << _h_json(_a' + T.both + ') << "]" << endl;' : 'cout << "@@' + ci + ' " << _h_json(' + call + ') << endl;')) + ' } catch (std::exception& e) { cout << "@@' + ci + ' !" << e.what() << endl; }\n';
    });
  }
  return s + '  return 0;\n}\n';
}

/* ---------- C# ---------- */
// Mono (mcs/mono) or the .NET SDK (dotnet), see tools/harness/cs-compile.js. Solutions are C# 7.3: `public class Solution`
// with PascalCase methods (twoSum -> TwoSum); ListNode/TreeNode come from tools/harness/H.cs unless the code declares them.
const CS_H = fs.readFileSync(path.join(__dirname, 'harness', 'H.cs'), 'utf8');
const CS_USING = 'using System;\nusing System.Collections;\nusing System.Collections.Generic;\nusing System.Linq;\nusing System.Text;\n';
const csCompile = require('./harness/cs-compile.js');
// The C# course (content/csharp) is modern C# 12 on .NET 8; every other module's C# is 7.3 (see cs-compile.js).
const CS_MODERN = /content[\/\\]csharp[\/\\]/.test(file || '');
function csType(t) {
  if (t.k === 'arr') return csType(t.of) + '[]';
  if (t.k === 'list') return 'IList<' + csType(t.of) + '>';
  return { int: 'int', long: 'long', double: 'double', bool: 'bool', string: 'string', char: 'char', ListNode: 'ListNode', TreeNode: 'TreeNode', void: 'void' }[t.k];
}
function csLit0(t, v) {
  if (v === null) return ['int', 'long', 'double', 'bool', 'char'].includes(t.k) ? 'default(' + csType(t) + ')' : '(' + csType(t) + ')null';
  switch (t.k) {
    case 'int': return String(v);
    case 'long': return String(v) + 'L';
    case 'double': return Number.isInteger(+v) ? (+v).toFixed(1) : String(v);
    case 'bool': return v ? 'true' : 'false';
    case 'string': return JSON.stringify(String(v));
    case 'char': return "'" + (v === "'" ? "\\'" : v === '\\' ? '\\\\' : v) + "'";
    case 'ListNode': return 'H.List(new int[]{' + v.join(',') + '})';
    case 'TreeNode': return 'H.Tree(new int?[]{' + v.map((x) => (x === null ? 'null' : x)).join(',') + '})';
    case 'arr': return 'new ' + csType(t) + '{' + v.map((x) => csLit(t.of, x)).join(', ') + '}';
    case 'list': return 'new List<' + csType(t.of) + '>{' + v.map((x) => csLit(t.of, x)).join(', ') + '}';
  }
}
const CS_USING_RE = /^[ \t]*using\s+(static\s+)?[\w.]+(\s*=\s*[\w.<>, ]+)?\s*;[ \t]*$/gm;
function csSource(pr, code, T) {
  if (T.io) return code;
  const uses = (n) => new RegExp('\\b' + n + '\\b').test(code + JSON.stringify(T));
  const own = (n) => new RegExp('(class|struct)\\s+' + n + '\\b').test(code);
  // #define lines must open the file, so the solution's own using directives are hoisted after them.
  const flags = ['ListNode', 'TreeNode'].map((n) => (uses(n) && !own(n) ? '#define H_' + n.toUpperCase() + '\n' : '') + (uses(n) ? '#define H_USES_' + n.toUpperCase() + '\n' : '')).join('');
  const usings = (code.match(CS_USING_RE) || []).map((u) => u.trim()).join('\n');
  const body = code.replace(CS_USING_RE, '');
  const err = (ci) => ' catch (Exception e) { Console.WriteLine("@@' + ci + ' !" + e.GetType().Name + ": " + e.Message.Replace("\\n", " ")); }';
  let main = '', methods = '';
  if (T.cls) {
    methods += '  static ' + T.cls + ' obj; static StringBuilder sb;\n';
    T.cases.forEach((c, ci) => {
      const calls = [];
      for (let k = 0; k * 200 < c.ops.length; k++) {
        let b = '';
        c.ops.slice(k * 200, k * 200 + 200).forEach((op, j) => {
          const oi = k * 200 + j, sig = parseSig(T.sigs[op] || '');
          const a = c.args[oi].map((v, i) => csLit(sig.params[i], v)).join(', ');
          if (oi) b += '    sb.Append(",");\n';
          if (op === T.cls) b += '    obj = new ' + T.cls + '(' + a + '); sb.Append("null");\n';
          else if (sig.ret.k === 'void') b += '    obj.' + pascal(op) + '(' + a + '); sb.Append("null");\n';
          else b += '    sb.Append(H.Json(obj.' + pascal(op) + '(' + a + ')));\n';
        });
        methods += '  static void C' + ci + '_' + k + '() {\n' + b + '  }\n';
        calls.push('C' + ci + '_' + k + '();');
      }
      main += '    try { sb = new StringBuilder("["); obj = null; ' + calls.join(' ') + ' Console.WriteLine("@@' + ci + ' " + sb.Append("]")); }' + err(ci) + '\n';
    });
  } else {
    const sig = parseSig(T.sig), fn = (T.names && T.names.csharp) || pascal(T.fn), target = jCallTarget(body, fn, /\b(class|struct)\s+(\w+)/g);
    T.cases.forEach((c, ci) => {
      const decl = c[0].map((v, i) => 'var a' + i + ' = ' + csLit(sig.params[i], v) + ';').join(' ');
      const call = target + '(' + c[0].map((_, i) => 'a' + i).join(', ') + ')';
      const res = sig.ret.k === 'void' ? call + '; Console.WriteLine("@@' + ci + ' " + H.Json(a' + (T.mutate || 0) + '));' : (T.both !== undefined ? '{ var _r = ' + call + '; Console.WriteLine("@@' + ci + ' [" + H.Json(_r) + "," + H.Json(a' + T.both + ') + "]"); }' : 'Console.WriteLine("@@' + ci + ' " + H.Json(' + call + '));');
      methods += '  static void F' + ci + '() {\n    try { ' + decl + ' ' + res + ' }' + err(ci) + '\n  }\n';
      main += '    F' + ci + '();\n';
    });
  }
  return flags + CS_USING + usings + '\n' + body + '\n' + CS_H + '\nclass Main__ {\n' + methods + '  static void Main(string[] x) {\n' + main + '  }\n}\n';
}

/* ---------- comparison ---------- */
function parseOut(txt) {
  const big = txt.replace(/("(?:[^"\\]|\\.)*")|(?<![\d.eE+-])(-?\d{16,})(?![\d.eE])/g, (m, str, num) => (str ? str : '"' + num + '"'));
  return JSON.parse(big);
}
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (typeof v === 'number' && Number.isInteger(v) && Math.abs(v) >= 1e15) return String(BigInt(v));
  return v;
}
function deepEq(a, b, fl) {
  if (fl) {
    const num = (x) => (typeof x === 'string' && /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(x) ? Number(x) : x);
    const x = num(a), y = num(b);
    if (typeof x === 'number' && typeof y === 'number') return Math.abs(x - y) <= 1e-5 * Math.max(1, Math.abs(x), Math.abs(y));
  }
  a = canon(a); b = canon(b);
  if (typeof a === 'number' && typeof b === 'number') return fl ? Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(a), Math.abs(b)) : a === b;
  if (typeof a === 'string' && typeof b === 'number') return a === String(b);
  if (typeof b === 'string' && typeof a === 'number') return b === String(a);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEq(x, b[i], fl));
  if (a && b && typeof a === 'object' && typeof b === 'object') { const ka = Object.keys(a).sort(), kb = Object.keys(b).sort(); return deepEq(ka, kb) && ka.every((k) => deepEq(a[k], b[k], fl)); }
  return a === b;
}
const key = (x) => JSON.stringify(canon(x));
const sortDeep = (x) => (Array.isArray(x) ? x.map(sortDeep).sort((p, q) => (key(p) < key(q) ? -1 : key(p) > key(q) ? 1 : 0)) : x);
function matches(T, c, got) {
  const sg = !T.cls && T.sig ? parseSig(T.sig) : null;
  const exp = expand(T.cls ? c.out : c[1], sg ? sg.ret : undefined);
  if (!T.cls && T.sig && got === null && Array.isArray(exp) && !exp.length && /->\s*(ListNode|TreeNode)\s*$/.test(T.sig)) got = [];
  if (T.check) { const f = vm.runInNewContext('(' + T.check + ')'); return !!f(T.cls ? expand(c.args) : expand(c[0], sg ? { list: sg.params } : undefined), got, exp); }
  const cmp = T.cmp || 'exact';
  if (cmp === 'float') return deepEq(got, exp, true);
  if (cmp === 'set') return Array.isArray(got) && deepEq(sortDeep(got.map((x) => x)).map((x) => x), sortDeep(exp.map((x) => x)));
  if (cmp === 'sets') return Array.isArray(got) && deepEq(sortDeep(got), sortDeep(exp));
  if (cmp === 'oneOf') return exp.some((e) => deepEq(got, e));
  return deepEq(got, exp);
}

/* ---------- run ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'solcheck-'));
let pch = null;
function cppPch() {
  if (pch) return pch;
  const d = path.join(os.tmpdir(), 'imastery-pch'), h = path.join(d, 'all.h');
  if (!fs.existsSync(h + '.gch')) {
    // Several checkers may run at once: build under a private name, then rename into place atomically.
    fs.mkdirSync(d, { recursive: true });
    const tag = '.' + process.pid + '-' + Date.now();
    fs.writeFileSync(h + tag, '#include <bits/stdc++.h>\nusing namespace std;\n');
    if (!fs.existsSync(h)) fs.renameSync(h + tag, h); else fs.rmSync(h + tag, { force: true });
    const r = spawnSync('g++', ['-std=c++20', '-O1', '-x', 'c++-header', h, '-o', h + '.gch' + tag], { encoding: 'utf8' });
    if (r.status === 0 && !fs.existsSync(h + '.gch')) fs.renameSync(h + '.gch' + tag, h + '.gch'); else fs.rmSync(h + '.gch' + tag, { force: true });
  }
  return (pch = h);
}
/* ---------- SQL ---------- */
const SQL_RUNNER = 'sql-runner.js';
// SQLite runs on the site's own sql.js build (tools/sql-runner.js); PostgreSQL runs on a private throwaway cluster.
function splitSql(src) {
  const out = []; let cur = '', i = 0;
  while (i < src.length) {
    const ch = src[i], two = src.slice(i, i + 2);
    if (two === '--') { const j = src.indexOf('\n', i); const e = j < 0 ? src.length : j; cur += src.slice(i, e); i = e; continue; }
    if (two === '/*') { const j = src.indexOf('*/', i + 2); const e = j < 0 ? src.length : j + 2; cur += src.slice(i, e); i = e; continue; }
    if (ch === "'" || ch === '"') { let j = i + 1; while (j < src.length) { if (src[j] === ch) { if (src[j + 1] === ch) { j += 2; continue; } break; } j++; } cur += src.slice(i, j + 1); i = j + 1; continue; }
    const dq = ch === '$' && src.slice(i).match(/^\$[A-Za-z_]*\$/);
    if (dq) { const j = src.indexOf(dq[0], i + dq[0].length); const e = j < 0 ? src.length : j + dq[0].length; cur += src.slice(i, e); i = e; continue; }
    if (ch === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue; }
    cur += ch; i++;
  }
  if (cur.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '').trim()) out.push(cur.trim());
  return out;
}
function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false, i = 0, any = false;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; continue; }
    if (ch === '"') { q = true; any = true; } else if (ch === ',') { row.push(f); f = ''; any = true; } else if (ch === '\n') { row.push(f); rows.push(row); row = []; f = ''; any = false; } else if (ch !== '\r') { f += ch; any = true; }
  }
  if (any || f) { row.push(f); rows.push(row); }
  return rows;
}
let pg = null;
const PG_NULL = '\u2400NULL';
function pgStart() {
  if (pg) return pg;
  const cfg = spawnSync('pg_config', ['--bindir'], { encoding: 'utf8' });
  const bin = cfg.status === 0 ? cfg.stdout.trim() : '/usr/lib/postgresql/16/bin';
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'imastery-pg-')); fs.chmodSync(d, 0o777);
  const port = String(20000 + (process.pid % 20000));
  const root = process.getuid && process.getuid() === 0;
  const sh = (cmd) => (root ? spawnSync('su', ['postgres', '-s', '/bin/sh', '-c', cmd], { encoding: 'utf8', timeout: 120000 }) : spawnSync('sh', ['-c', cmd], { encoding: 'utf8', timeout: 120000 }));
  const data = path.join(d, 'data');
  let r = sh(`"${bin}/initdb" -D "${data}" -A trust -U postgres -E UTF8 --locale=C --no-sync >/dev/null`);
  if (r.status !== 0) throw new Error('initdb failed: ' + (r.stderr || r.stdout).slice(0, 400));
  r = sh(`"${bin}/pg_ctl" -D "${data}" -w -l "${d}/log" -o "-k ${d} -p ${port} -c listen_addresses='' -c fsync=off -c full_page_writes=off" start >/dev/null`);
  if (r.status !== 0) throw new Error('postgres did not start: ' + (r.stderr || r.stdout).slice(0, 400));
  pg = { d, port, n: 0, stop: () => sh(`"${bin}/pg_ctl" -D "${data}" -m immediate stop >/dev/null 2>&1`) };
  process.on('exit', () => { pg.stop(); fs.rmSync(d, { recursive: true, force: true }); });
  return pg;
}
function pgCase(schema, code, c) {
  const P = pgStart(), name = 'c' + (++P.n);
  const psql = (db, argv, input) => spawnSync('psql', ['-X', '-q', '-h', P.d, '-p', P.port, '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', ...argv], { encoding: 'utf8', input: input || '', timeout: 60000, maxBuffer: 16 << 20 });
  let r = psql('postgres', ['-c', 'CREATE DATABASE ' + name]);
  if (r.status !== 0) return { error: 'createdb: ' + r.stderr };
  // Every statement whose result is compared is followed by a marker, so each result set can be read back separately.
  const quiet = [schema.replace(/^\s*PRAGMA\b[^;]*;/gim, ''), c.setup, c.after ? code : ''].filter((x) => x && x.trim()).join(';\n');
  const shown = splitSql(c.after || code);
  const script = '\\o /dev/null\n' + (quiet ? quiet + ';\n' : '') + "\\o\n\\pset format csv\n\\pset null '" + PG_NULL + "'\n" + shown.map((q) => q + ';\n\\echo @@END\n').join('');
  r = psql(name, ['-f', '-'], script);
  psql('postgres', ['-c', 'DROP DATABASE ' + name + ' WITH (FORCE)']);
  if (r.status !== 0) return { error: (r.stderr || '').replace(/^psql:[^:]*:\d+: /gm, '').trim().slice(0, 500) };
  // Like sql.js, keep only statements that returned rows.
  const sets = String(r.stdout || '').split('@@END\n').map(parseCsv).filter((rows) => rows.length > 1)
    .map((rows) => ({ cols: rows[0], rows: rows.slice(1).map((rw) => rw.map((v) => (v === PG_NULL ? null : v))) }));
  return { sets };
}
function sqlVal(got, exp) {
  if (exp === null) return got === null;
  if (got === null) return false;
  if (typeof exp === 'boolean') return got === exp || got === (exp ? 1 : 0) || got === (exp ? 't' : 'f') || got === String(exp);
  if (typeof exp === 'number') { const g = typeof got === 'number' ? got : /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(String(got).trim()) ? Number(got) : NaN; return Math.abs(g - exp) <= 1e-6 * Math.max(1, Math.abs(exp)); }
  return String(got) === String(exp);
}
function runSql(pr, code, T) {
  const sol = pr.p.solution || {};
  const db = T.db !== undefined ? T.db : (sol.code && typeof sol.code === 'object' ? sol.code.db : undefined);
  if (db && !(mod.databases && db in mod.databases)) return { err: 'unknown database "' + db + '"' };
  const schema = db ? mod.databases[db] : '';
  const engines = T.engine === 'both' ? ['sqlite', 'postgres'] : [T.engine || 'sqlite'];
  const fails = [];
  engines.forEach((eng) => {
    let res;
    if (eng === 'sqlite') {
      const r = spawnSync('node', [path.join(__dirname, SQL_RUNNER)], { input: JSON.stringify({ schema, code, cases: T.cases.map((c) => ({ setup: c.setup || '', after: c.after || '' })) }), encoding: 'utf8', timeout: 120000, maxBuffer: 64 << 20 });
      try { res = JSON.parse(r.stdout); } catch (e) { fails.push('[sqlite] runner failed: ' + String(r.stderr || r.stdout).slice(0, 400)); return; }
      if (res.fatal) { fails.push('[sqlite] ' + res.fatal); return; }
    } else if (eng === 'postgres') {
      const pgSchema = T.pg !== undefined ? T.pg : schema;
      res = T.cases.map((c) => pgCase(pgSchema, code, c));
    } else { fails.push('unknown engine ' + eng); return; }
    T.cases.forEach((c, ci) => {
      const tag = engines.length > 1 ? '[' + eng + '] ' : '';
      let g = res[ci];
      if (!g.error) {
        // result: k picks the k-th result set (negative counts from the end); the default is the last one.
        const sets = g.sets || [], k = c.result === undefined ? -1 : c.result, i = k < 0 ? sets.length + k : k;
        if (c.result !== undefined && !(i >= 0 && i < sets.length)) { fails.push(tag + 'case ' + ci + ': result ' + k + ' does not exist (' + sets.length + ' result sets)'); return; }
        g = sets[i] || { cols: [], rows: [] };
      }
      if (c.error !== undefined) {
        if (!g.error) fails.push(tag + 'case ' + ci + ': expected an error matching /' + c.error + '/, but it succeeded');
        else if (!new RegExp(c.error, 'i').test(g.error)) fails.push(tag + 'case ' + ci + ': expected an error matching /' + c.error + '/, got: ' + g.error);
        return;
      }
      if (g.error) { fails.push(tag + 'case ' + ci + ': error: ' + g.error); return; }
      if (c.cols && !(c.cols.length === g.cols.length && c.cols.every((x, i) => String(x).toLowerCase() === String(g.cols[i]).toLowerCase()))) { fails.push(tag + 'case ' + ci + ': columns ' + JSON.stringify(g.cols) + ', expected ' + JSON.stringify(c.cols)); return; }
      let ok;
      if (T.check) ok = !!vm.runInNewContext('(' + T.check + ')')(g.rows, g.cols, c);
      else {
        const exp = c.rows || [];
        const rowEq = (a, b) => a.length === b.length && a.every((v, i) => sqlVal(v, b[i]));
        if ((T.cmp || 'exact') === 'set') {
          const left = g.rows.slice(); ok = g.rows.length === exp.length && exp.every((e) => { const k = left.findIndex((x) => rowEq(x, e)); if (k < 0) return false; left.splice(k, 1); return true; });
        } else ok = g.rows.length === exp.length && g.rows.every((x, i) => rowEq(x, exp[i]));
      }
      if (!ok) fails.push(tag + 'case ' + ci + (c.setup ? ' (setup ' + JSON.stringify(c.setup).slice(0, 80) + ')' : '') + ': ' + (T.check ? 'check failed' : 'expected ' + JSON.stringify(c.rows || []).slice(0, 220)) + ', got ' + JSON.stringify(g.rows).slice(0, 220));
    });
  });
  return { fails, n: T.cases.length };
}

/* ---------- TypeScript type-level tests ---------- */
// tests.types: assertions compiled with the solution under --strict, e.g. 'type _1 = Expect<Equal<First<[3, 2]>, 3>>'
// or '// @ts-expect-error\nconst bad: PartialBy<User, "id"> = {}'. Every assertion must type-check (an unused
// @ts-expect-error is itself an error), so a wrong type fails.
function runTypes(code, T) {
  if (!tsMod) for (const p of ['typescript', '/opt/node22/lib/node_modules/typescript']) { try { tsMod = require(p); break; } catch (e) { } }
  if (!tsMod) return { err: 'typescript is not installed' };
  const pre = (/\btype\s+Equal\b/.test(code) ? '' : 'type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;\n') +
    (/\btype\s+Expect\b/.test(code) ? '' : 'type Expect<T extends true> = T;\n');
  const fails = [];
  T.types.forEach((a, ci) => {
    // A top-level `declare module 'x'` must stay in a script file; otherwise make the file a module so names stay local.
    const ambient = /^\s*declare\s+module\s+['"]/m.test(code);
    const name = '/__types/case' + ci + '.ts', src = code + '\n' + pre + a + (ambient ? '\n' : '\nexport {};\n');
    const opts = { strict: true, noEmit: true, target: tsMod.ScriptTarget.ES2022, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], skipLibCheck: true, noUnusedLocals: false };
    const host = tsMod.createCompilerHost(opts), getSf = host.getSourceFile.bind(host);
    host.getSourceFile = (f, lv, ...r) => (f === name ? tsMod.createSourceFile(f, src, lv) : getSf(f, lv, ...r));
    host.fileExists = ((fe) => (f) => f === name || fe(f))(host.fileExists.bind(host));
    const prog = tsMod.createProgram([name], opts, host);
    const diags = tsMod.getPreEmitDiagnostics(prog).filter((d) => d.file && d.file.fileName === name);
    if (diags.length) fails.push('assertion ' + ci + ' ' + JSON.stringify(a).slice(0, 120) + ': ' + diags.map((d) => tsMod.flattenDiagnosticMessageText(d.messageText, ' ')).join(' | ').slice(0, 300));
  });
  return { fails, n: T.types.length };
}

function runLang(lang, pr, code, T, n) {
  if (lang === 'sql') return runSql(pr, code, T);
  if (T.types) return lang === 'ts' ? runTypes(code, T) : { err: 'tests.types needs a TypeScript implementation' };
  // Harness-only helpers (e.g. building a cyclic list) are appended here so learner-facing solutions stay clean.
  const extra = T.harness && (T.harness[lang] || (lang === 'ts' && T.harness.js));
  if (extra) code = code + '\n' + extra + '\n';
  const dir = path.join(tmp, pr.id + '-' + lang); fs.mkdirSync(dir, { recursive: true });
  const ioCases = T.io ? T.cases : null;
  // Compiles get a generous limit (a busy machine can be slow); running the solution keeps the 20 s limit.
  const exec = (cmd, argv, stdin, ms) => spawnSync(cmd, argv, { cwd: dir, encoding: 'utf8', input: stdin || '', timeout: ms || 20000, maxBuffer: 16 << 20 });
  let run;
  if (lang === 'java') {
    fs.writeFileSync(path.join(dir, 'Main.java'), javaSource(pr, code, T));
    const c = exec('javac', ['-nowarn', '-Xlint:none', '-d', 'out', 'Main.java'], '', 180000);
    if (c.status !== 0) return { err: 'compile error:\n' + (c.stderr || c.stdout).slice(0, 1500) };
    let mainCls = 'Main__';
    if (T.io) { const bare = code.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, (m) => ' '.repeat(m.length)); const at = bare.search(/static\s+void\s+main\s*\(/); const span = (i) => { const o = bare.indexOf('{', i); let d = 0; for (let j = o; j >= 0 && j < bare.length; j++) { if (bare[j] === '{') d++; else if (bare[j] === '}' && --d === 0) return [o, j]; } return [o, bare.length]; }; const cs = [...bare.matchAll(/\b(class|record|enum|interface)\s+(\w+)/g)].filter((x) => x.index < at).map((x) => ({ n: x[2], r: span(x.index) })).filter((c) => c.r[0] < at && at < c.r[1]); mainCls = cs.length ? cs[cs.length - 1].n : 'Main'; }
    run = (stdin) => exec('java', ['-cp', 'out', mainCls], stdin);
  } else if (lang === 'python') {
    fs.writeFileSync(path.join(dir, 'main.py'), pySource(pr, code, T));
    run = (stdin) => exec('python3', ['-I', 'main.py'], stdin);
  } else if (lang === 'js' || lang === 'ts') {
    let src; try { src = jsSource(pr, code, T, lang === 'ts'); } catch (e) { return { err: 'compile error:\n' + e.message }; }
    fs.writeFileSync(path.join(dir, 'main.js'), src);
    run = (stdin) => exec('node', ['main.js'], stdin);
  } else if (lang === 'cpp') {
    fs.writeFileSync(path.join(dir, 'main.cpp'), cppSource(pr, code, T));
    const c = exec('g++', ['-std=c++20', '-O1', '-w', '-include', cppPch(), 'main.cpp', '-o', 'main'], '', 180000);
    if (c.status !== 0) return { err: 'compile error:\n' + (c.stderr || '').replace(/\/tmp\/[^\s:]+\//g, '').slice(0, 1500) };
    run = (stdin) => exec('./main', [], stdin);
  } else if (lang === 'csharp') {
    const c = csCompile.compile(dir, csSource(pr, code, T), { exe: true, main: T.io ? null : 'Main__', timeout: 180000, modern: CS_MODERN });
    if (!c) return { err: CS_MODERN ? 'no .NET SDK: the C# course needs dotnet (C# 12)' : 'no C# compiler: install mono (mcs + mono) or the .NET SDK (dotnet)' };
    if (!c.ok) return { err: 'compile error:\n' + c.err.slice(0, 1500) };
    run = (stdin) => c.run(stdin, 20000);
  }
  if (ioCases) {
    const fails = [];
    ioCases.forEach((c, ci) => {
      const r = run(isGen(c.stdin) ? expand(c.stdin) : c.stdin);
      const norm = (s) => String(s || '').replace(/\r/g, '').split('\n').map((l) => l.trim().replace(/\s+/g, ' ')).filter(Boolean).join('\n');
      if (r.status !== 0 || norm(r.stdout) !== norm(c.stdout)) fails.push('case ' + ci + ': expected ' + JSON.stringify(norm(c.stdout).slice(0, 200)) + ', got ' + JSON.stringify(norm(r.stdout).slice(0, 200)) + (r.status !== 0 ? ' (exit ' + r.status + ') ' + String(r.stderr || '').slice(-300) : ''));
    });
    return { fails, n: ioCases.length };
  }
  const r = run('');
  const got = {};
  String(r.stdout || '').split('\n').forEach((l) => { const m = l.match(/^@@(\d+) ([\s\S]*)$/); if (m) got[m[1]] = m[2]; });
  const fails = [];
  T.cases.forEach((c, ci) => {
    const raw = got[ci];
    if (raw === undefined) { fails.push('case ' + ci + ': no output' + (r.status !== 0 ? ' (exit ' + r.status + (r.signal ? ' ' + r.signal : '') + ') ' + String(r.stderr || '').slice(-400) : '')); return; }
    if (raw.startsWith('!')) { fails.push('case ' + ci + ': threw ' + raw.slice(1, 300)); return; }
    let v; try { v = parseOut(raw); } catch (e) { fails.push('case ' + ci + ': unreadable output ' + raw.slice(0, 200)); return; }
    if (!matches(T, c, v)) fails.push('case ' + ci + ': input ' + JSON.stringify(T.cls ? c.args : c[0]).slice(0, 160) + ' expected ' + JSON.stringify(T.cls ? c.out : c[1]).slice(0, 160) + ', got ' + raw.slice(0, 160));
  });
  return { fails, n: T.cases.length };
}

let bad = 0, checked = 0, untested = 0, skipped = 0;
const cover = {};
problems.forEach((pr, idx) => {
  if (ONLY !== null && idx !== ONLY) return;
  const T = pr.p.tests, I = impls(pr);
  Object.keys(I).forEach((l) => { cover[l] = (cover[l] || 0) + 1; });
  if (!T) { untested++; if (REQUIRE.length) bad++; if (!REPORT) console.log('NO TESTS  #' + idx + ' ' + pr.id + ' ' + pr.p.title); return; }
  if (T.skip) { skipped++; return; }
  const n = T.cases ? T.cases.length : T.types ? T.types.length : 0;
  // Design cases may generate their operation lists ({ $rep: 'push', n: 5000 }, $concat of arrays).
  if (T.cls && n) T.cases.forEach((c) => { if (isGen(c.ops)) c.ops = expand(c.ops, { k: 'arr', of: { k: 'string' } }); if (isGen(c.args)) c.args = expand(c.args); });
  if (!n) { bad++; console.log('FAIL #' + idx + ' ' + pr.id + ': tests has no cases'); return; }
  REQUIRE.forEach((alts) => { if (!alts.split('|').some((l) => I[l])) { bad++; console.log('MISSING #' + idx + ' ' + pr.id + ' ' + pr.p.title + ': no ' + alts.replace('|', ' or ') + ' implementation'); } });
  LANGS.forEach((lang) => {
    if (!I[lang]) return;
    checked++;
    let res;
    try { res = runLang(lang, pr, I[lang], T); } catch (e) { res = { err: 'harness: ' + e.message }; }
    if (res.err || res.fails.length) {
      bad++;
      console.log('FAIL #' + idx + ' ' + pr.id + ' [' + lang + '] ' + pr.p.title + '\n  ' + (res.err || res.fails.slice(0, 4).join('\n  ')).split('\n').join('\n  '));
    } else if (!QUIET && !REPORT) console.log('ok   #' + idx + ' ' + pr.id + ' [' + lang + '] ' + n + ' cases');
    // tests.also: other versions of the method that the solution teaches (e.g. an idiomatic one-liner next to the loop)
    // run the same cases. A list applies to every language; { java: [...], python: [...] } names them per language.
    const also = Array.isArray(T.also) ? T.also : asList(T.also && T.also[lang]);
    also.forEach((name0) => {
      checked++;
      const name = lang === 'csharp' ? pascal(name0) : name0;
      const T2 = Object.assign({}, T, { fn: name, names: Object.assign({}, T.names, { [lang]: name }) });
      // The other version may sit in the main code or in a same-language alternative block.
      const has = (c) => typeof c === 'string' && new RegExp('\\b' + name + '\\s*\\(').test(c);
      const altCode = asList((pr.p.solution || {}).alt).filter((a) => a && typeof a === 'object' && ((l) => NORM[l] || l)(a.lang || pr.p.lang || pr.lang) === lang).map((a) => dedent(a.code)).find(has);
      let r2;
      // A Java alternative written as a bare method is shown that way on the site; wrap it in a class to run it.
      const wrap = (c) => (c && lang === 'java' && !/\b(class|record|interface|enum)\s+\w/.test(c) ? 'class Solution {\n' + c + '\n}' : c);
      try { r2 = runLang(lang, pr, wrap(altCode) || I[lang], T2); } catch (e) { r2 = { err: 'harness: ' + e.message }; }
      if (r2.err || r2.fails.length) {
        bad++;
        console.log('FAIL #' + idx + ' ' + pr.id + ' [' + lang + ':' + name + '] ' + pr.p.title + '\n  ' + (r2.err || r2.fails.slice(0, 4).join('\n  ')).split('\n').join('\n  '));
      } else if (!QUIET && !REPORT) console.log('ok   #' + idx + ' ' + pr.id + ' [' + lang + ':' + name + '] ' + n + ' cases');
    });
  });
});
if (!KEEP) fs.rmSync(tmp, { recursive: true, force: true }); else console.log('kept ' + tmp);
console.log(mod.id + ': ' + problems.length + ' problems, ' + (problems.length - untested - skipped) + ' with tests, ' + skipped + ' skipped, ' + untested + ' without tests; implementations ' + JSON.stringify(cover) + '; ' + checked + ' language runs, ' + bad + ' failing');
process.exit(bad || (REPORT ? 0 : 0) ? 1 : 0);
