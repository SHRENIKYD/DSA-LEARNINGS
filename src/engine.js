var MODULES = [];
// Track pages load a small index (window.IM_MINDEX) first; each module file arrives when the learner opens it
// and registers itself here, taking its index entry's place.
function registerModule(m) { if (typeof App !== 'undefined' && App.loadedModule(m)) return; MODULES.push(m); }

var App = (function () {
  var esc = H.esc;
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  var DONE = store.get('imastery.done', {}) || {};
  var TRACK = null, current = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function asList(x) { return x === undefined || x === null ? [] : (Array.isArray(x) ? x : [x]); }
  function stripTags(s) { return String(s || '').replace(/<[^>]*>/g, ''); }
  function lvlBadge(l) { var L = LEVELS[l] || LEVELS.B; return '<span class="lvlb lv-' + l + '">' + L.name + '</span>'; }
  function dot(l) { return '<span class="dot lv-' + l + '" aria-hidden="true"></span>'; }
  var ICONS = {
    play: '<svg class="ic fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z"/></svg>',
    pause: '<svg class="ic fill" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    prev: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    reset: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    sun: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    home: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    back: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    arrow: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };

  function JI(n) { return window.Journey ? Journey.icon(n, 'ji') : ''; }

  /* ---------- module item ids (progress) ---------- */
  function topicProblems(t) { return asList(t.problems).concat(asList(t.problem)); }
  function items(m) {
    var ids = [];
    m.topics.forEach(function (t, i) {
      ids.push(m.id + '-t' + i);
      topicProblems(t).forEach(function (_, j) { ids.push(m.id + '-t' + i + '-q' + j); });
    });
    (m.practice || []).forEach(function (_, k) { ids.push(m.id + '-p' + k); });
    if (m.quiz && m.quiz.length) ids.push(m.id + '-quiz');
    if (m.interview && m.interview.length) ids.push(m.id + '-iv');
    return ids;
  }
  function doneOf(ids) { return ids.filter(function (id) { return DONE[id]; }).length; }

  /* ---------- code: highlight, snippets, runners ---------- */
  function dedent(s) {
    var lines = String(s || '').replace(/\t/g, '    ').replace(/\r/g, '').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    var min = Infinity;
    lines.forEach(function (l) { if (l.trim()) { var n = l.match(/^ */)[0].length; if (n < min) min = n; } });
    if (min === Infinity) min = 0;
    return lines.map(function (l) { return l.slice(min); }).join('\n');
  }
  function kw(s) { var o = {}; s.split(/\s+/).forEach(function (k) { if (k) o[k] = 1; }); return o; }
  var CK = 'break case catch continue default do else finally for if return switch throw try while ';
  var LANGS = {
    java: { name: 'Java', kw: kw(CK + 'abstract assert boolean byte char class const double enum extends final float goto implements import instanceof int interface long native new null package private protected public short static strictfp super synchronized this throws transient void volatile var true false record yield sealed permits non-sealed'), c: 1 },
    cpp: { name: 'C++', kw: kw(CK + 'alignas alignof auto bool char char16_t char32_t class const constexpr consteval constinit const_cast decltype delete double dynamic_cast enum explicit export extern false float friend goto inline int long mutable namespace new noexcept nullptr operator private protected public register reinterpret_cast short signed sizeof static static_assert static_cast struct template this thread_local true typedef typeid typename union unsigned using virtual void volatile wchar_t override final concept requires co_await co_return co_yield size_t'), c: 1, pre: 1 },
    js: { name: 'JavaScript', kw: kw(CK + 'async await class const debugger delete export extends false function import in instanceof let new null of super this true typeof undefined var void with yield static get set from as'), c: 1, bt: 1 },
    ts: { name: 'TypeScript', kw: kw(CK + 'async await class const debugger delete export extends false function import in instanceof let new null of super this true typeof undefined var void with yield static get set from as interface type enum implements private protected public readonly declare namespace abstract keyof infer is never unknown any string number boolean symbol bigint object satisfies'), c: 1, bt: 1 },
    python: { name: 'Python', kw: kw('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case self print len range'), hash: 1, tri: 1 },
    sql: { name: 'SQL', kw: kw('select from where and or not in is null like between group by having order asc desc limit offset join inner left right full outer cross on as distinct union all intersect except insert into values update set delete create table view index drop alter add column primary key foreign references unique check default constraint case when then else end exists with recursive over partition rows range preceding following current row unbounded count sum avg min max coalesce nullif cast begin commit rollback transaction integer int text varchar real numeric date boolean serial if replace trigger after before for each procedure function returns language explain query plan analyze lateral filter window rank dense_rank row_number lag lead ntile first_value last_value conflict do nothing using natural'), dash: 1, c: 1, ci: 1 },
    go: { name: 'Go', kw: kw(CK + 'chan const defer else fallthrough func go goto import interface map package range select struct type var nil true false'), c: 1, bt: 1 },
    bash: { name: 'Shell', kw: kw('if then else elif fi for while do done case esac in function return export local echo cd sudo'), hash: 1 },
    yaml: { name: 'YAML', kw: kw('true false null'), hash: 1 },
    hcl: { name: 'HCL', kw: kw('resource data variable output locals module provider terraform backend required_providers required_version moved import removed check for_each count depends_on lifecycle dynamic content provisioner connection for in if true false null each self var local'), c: 1, hash: 1 },
    json: { name: 'JSON', kw: kw('true false null') },
    css: { name: 'CSS', kw: {}, c: 1 },
    html: { name: 'HTML', kw: {}, html: 1 },
    http: { name: 'HTTP', kw: kw('GET POST PUT PATCH DELETE HEAD OPTIONS HTTP') },
    text: { name: 'Text', kw: {}, plain: 1 }
  };
  LANGS.jsx = LANGS.js; LANGS.tsx = LANGS.ts; LANGS.javascript = LANGS.js; LANGS.typescript = LANGS.ts; LANGS.py = LANGS.python; LANGS.sh = LANGS.bash; LANGS.tf = LANGS.hcl; LANGS.terraform = LANGS.hcl; LANGS.c = LANGS.cpp; LANGS.xml = LANGS.html;
  function highlight(code, lang) {
    var L = LANGS[lang] || LANGS.text;
    if (L.plain) return esc(code);
    if (L.html) return esc(code).replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="tk-kw">$2</span>').replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tk-com">$1</span>');
    var parts = [];
    if (L.c) parts.push('\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/');
    if (L.hash) parts.push('#[^\\n]*');
    if (L.dash) parts.push('--[^\\n]*');
    if (L.pre) parts.push('^\\s*#\\s*\\w+[^\\n]*');
    var com = parts.length ? '(' + parts.join('|') + ')' : '(\\b\\B)';
    var str = '(' + (L.tri ? '"""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|' : '') + (L.bt ? '`(?:\\\\.|[^`\\\\])*`|' : '') + '"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\')';
    var re = new RegExp(com + '|' + str + '|(\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?[LlFfDdnU]*\\b|\\b0[xX][0-9a-fA-F_]+\\b)|([A-Za-z_$@][\\w$]*)|([\\s\\S])', 'gm');
    var out = '', m;
    while ((m = re.exec(code))) {
      if (m[1]) out += '<span class="tk-com">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tk-str">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tk-num">' + esc(m[3]) + '</span>';
      else if (m[4]) {
        var w = m[4], lw = L.ci ? w.toLowerCase() : w;
        if (L.kw[lw]) out += '<span class="tk-kw">' + esc(w) + '</span>';
        else if (w.charAt(0) === '@') out += '<span class="tk-typ">' + esc(w) + '</span>';
        else if (/^[A-Z]/.test(w) && !/^[A-Z0-9_]+$/.test(w) && !L.ci) out += '<span class="tk-typ">' + esc(w) + '</span>';
        else if (code.charAt(re.lastIndex) === '(') out += '<span class="tk-fn">' + esc(w) + '</span>';
        else out += esc(w);
      } else out += esc(m[5]);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return out;
  }
  function snip(x, defLang, defTitle) {
    if (x === undefined || x === null || x === '') return null;
    if (typeof x === 'string') return { lang: defLang, code: x, title: defTitle };
    return { lang: x.lang || defLang, code: x.code || '', title: x.title || defTitle, db: x.db, run: x.run };
  }
  var SNIPS = [];
  function codeBlock(x, defLang, defTitle) {
    var s = snip(x, defLang, defTitle);
    if (!s) return '';
    return codeTabs([s].concat(asList(x && x.alt).map(function (a) { return snip(a, defLang, defTitle); })));
  }
  /* ---------- the learner's code language ---------- */
  var CODE_LANGS = [['java', 'Java'], ['python', 'Python'], ['js', 'JavaScript / TypeScript'], ['cpp', 'C++']];
  function langPref() { var l = store.get('imastery.lang', null); return CODE_LANGS.some(function (c) { return c[0] === l; }) ? l : null; }
  function langKey(l) { l = String(l || '').toLowerCase(); return { py: 'python', javascript: 'js', typescript: 'js', ts: 'js', 'c++': 'cpp', c: 'cpp' }[l] || l; }
  /* The language whose code shows first while the other languages wait behind "Other languages": an explicit pick
     (imastery.lang), else the chosen route's language. 'all' is stored when the learner asks for every language;
     with no choice at all the page renders exactly as it did before language mode existed. */
  function viewLang() {
    var l = langPref();
    if (l) return l;
    if (store.get('imastery.lang', null) === 'all') return null;
    var P = window.Learn && window.PATHS ? Learn.pref() : null;
    return P && P.chosen && CODE_LANGS.some(function (c) { return c[0] === P.lang; }) ? P.lang : null;
  }
  function isCodeLang(l) { var k = langKey(l); return CODE_LANGS.some(function (c) { return c[0] === k; }); }
  var OTHERS_OPEN = false; // "Other languages" expanded; remembered for this page load
  function byPref(list) {
    var p = viewLang();
    if (!p || list.length < 2) return list;
    return list.map(function (s, i) { return [s, i]; }).sort(function (a, b) { return ((langKey(a[0].lang) === p ? 0 : 1) - (langKey(b[0].lang) === p ? 0 : 1)) || a[1] - b[1]; }).map(function (x) { return x[0]; });
  }
  function codeTabs(list) {
    list = byPref(list.filter(Boolean));
    if (!list.length) return '';
    // Language mode: when the learner's language is among the panes, the other code languages (java/python/js/cpp)
    // collapse behind one "Other languages" tab; language-neutral snippets (text, sql, bash, ...) stay in the row.
    var pref = viewLang(), other = [];
    if (pref && list.length > 1 && list.some(function (s) { return langKey(s.lang) === pref; })) list.forEach(function (s, i) { if (langKey(s.lang) !== pref && isCodeLang(s.lang)) other.push(i); });
    var h = '<div class="code' + (list.length > 1 ? ' tabs' : '') + '"' + (other.length ? ' data-langmode="' + esc(pref) + '"' : '') + '>';
    var tab = function (s, i) { var o = other.indexOf(i) >= 0; return '<button type="button" class="ctab' + (i ? '' : ' on') + (o ? ' other' : '') + '" data-tab="' + i + '"' + (o && !OTHERS_OPEN ? ' hidden' : '') + '>' + esc((LANGS[s.lang] || LANGS.text).name) + '</button>'; };
    if (list.length > 1) h += '<div class="code-tabs">' + list.map(function (s, i) { return other.indexOf(i) >= 0 ? '' : tab(s, i); }).join('') +
      (other.length ? '<button type="button" class="ctab more" data-more aria-expanded="' + (OTHERS_OPEN ? 'true' : 'false') + '">Other languages <span aria-hidden="true">' + (OTHERS_OPEN ? '▴' : '▾') + '</span></button>' + other.map(function (i) { return tab(list[i], i); }).join('') : '') + '</div>';
    list.forEach(function (s, i) {
      var k = SNIPS.push(s) - 1, code = dedent(s.code);
      s.code = code;
      var runnable = (s.lang === 'sql' && s.db !== undefined) || ((s.lang === 'js' || s.lang === 'javascript' || s.lang === 'python' || s.lang === 'py') && s.run);
      h += '<div class="cpane" data-pane="' + i + '"' + (i ? ' hidden' : '') + '><div class="code-head"><span>' + esc(s.title || (LANGS[s.lang] || LANGS.text).name) + '</span><span class="code-btns">' +
        (runnable ? '<button class="btn run" type="button" data-lang="' + s.lang + '" data-snip="' + k + '">' + ICONS.play + 'Run</button><button class="btn edit" type="button">Edit</button>' : '') +
        '<button class="btn copy" type="button">Copy</button></span></div><pre tabindex="0"><code>' + highlight(code, s.lang) + '</code></pre>' + (runnable ? '<div class="run-out" hidden></div>' : '') + '</div>';
    });
    return h + '</div>';
  }
  function showTab(t) {
    var box = t.closest('.code'), i = t.getAttribute('data-tab');
    $$('.ctab', box).forEach(function (b) { b.classList.toggle('on', b === t); });
    $$('.cpane', box).forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== i; });
  }
  /* "Other languages": one tap reveals the collapsed tabs in every code block on the page; the state is kept for the
     rest of this page load so blocks rendered later open the same way. */
  function toggleOthers() {
    OTHERS_OPEN = !OTHERS_OPEN;
    $$('.code[data-langmode]').forEach(function (box) {
      $$('.ctab.other', box).forEach(function (b) { b.hidden = !OTHERS_OPEN; });
      var m = $('[data-more]', box);
      if (m) { m.setAttribute('aria-expanded', OTHERS_OPEN ? 'true' : 'false'); var ar = $('span', m); if (ar) ar.textContent = OTHERS_OPEN ? '▴' : '▾'; }
      var on = $('.ctab.on', box);
      if (!OTHERS_OPEN && on && on.hidden) { var first = $('.ctab:not(.other)', box); if (first) showTab(first); }
    });
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }
  var sqlP = null, pyP = null;
  function getSQL() {
    if (!sqlP) sqlP = loadScript('vendor/sql-wasm.js').then(function () { return initSqlJs({ locateFile: function (f) { return 'vendor/' + f; } }); });
    return sqlP;
  }
  function getPy() {
    if (!pyP) pyP = loadScript('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js').then(function () { return loadPyodide(); });
    return pyP;
  }
  function tableHtml(cols, rows) {
    var h = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.slice(0, 200).forEach(function (r) { h += '<tr>' + r.map(function (c) { return '<td>' + (c === null ? '<span class="c-m">NULL</span>' : esc(c)) + '</td>'; }).join('') + '</tr>'; });
    return h + '</tbody></table></div>' + (rows.length > 200 ? '<div class="meta">… ' + rows.length + ' rows total</div>' : '') + '<div class="meta">' + rows.length + ' row(s)</div>';
  }
  function runSnippet(btn) {
    var pane = btn.closest('.cpane'), s = SNIPS[+btn.getAttribute('data-snip')], out = $('.run-out', pane);
    var ta = $('textarea', pane), code = ta ? ta.value : s.code;
    out.hidden = false;
    out.innerHTML = '<span class="c-m">Running…</span>';
    if (s.lang === 'sql') {
      var schema = (current && current.databases && current.databases[s.db]) || '';
      getSQL().then(function (SQL) {
        var db = new SQL.Database();
        try {
          if (schema) db.exec(schema);
          var res = db.exec(code);
          out.innerHTML = res.length ? res.map(function (r) { return tableHtml(r.columns, r.values); }).join('') : '<span class="c-g">✔ Statement executed (no rows returned).</span>';
        } catch (e) { out.innerHTML = '<span class="c-r">SQL error: ' + esc(e.message) + '</span>'; }
        db.close();
      }, function (e) { out.innerHTML = '<span class="c-r">' + esc(e.message) + '. The SQL runner needs the site served over http(s) (e.g. GitHub Pages or <code>npx serve</code>).</span>'; });
    } else if (s.lang === 'python' || s.lang === 'py') {
      out.innerHTML = '<span class="c-m">Loading Python in your browser (first run downloads ~10 MB)…</span>';
      getPy().then(function (py) {
        var buf = [];
        py.setStdout({ batched: function (t) { buf.push(t); } });
        py.setStderr({ batched: function (t) { buf.push('⚠ ' + t); } });
        return py.runPythonAsync(code).then(function (r) {
          if (r !== undefined && r !== null) buf.push(String(r));
          out.innerHTML = '<pre class="out">' + esc(buf.join('\n') || '(no output)') + '</pre>';
        }, function (e) { out.innerHTML = '<pre class="out">' + esc(buf.join('\n')) + '</pre><span class="c-r">' + esc(e.message) + '</span>'; });
      }, function (e) { out.innerHTML = '<span class="c-r">' + esc(e.message) + '</span>'; });
    } else {
      var tok = 'r' + Math.random().toString(36).slice(2), lines = [];
      var ifr = document.createElement('iframe');
      ifr.setAttribute('sandbox', 'allow-scripts');
      ifr.style.display = 'none';
      var shim = 'var __s=function(t,a){parent.postMessage({tok:"' + tok + '",t:t,a:Array.prototype.map.call(a,function(x){if(typeof x==="string")return x;try{return JSON.stringify(x)}catch(e){return String(x)}}).join(" ")},"*")};' +
        '["log","info","warn","error","table"].forEach(function(k){console[k]=function(){__s(k,arguments)}});' +
        'var process={stdout:{write:function(t){__s("log",[String(t).replace(/\\n$/,"")]);return true}},stderr:{write:function(t){__s("error",[String(t).replace(/\\n$/,"")]);return true}},argv:["node","main.js"],env:{},exit:function(){}};' +
        'window.onerror=function(m){__s("error",["Uncaught "+m])};window.addEventListener("unhandledrejection",function(e){__s("error",["Unhandled rejection: "+(e.reason&&e.reason.message||e.reason)])});';
      // let/const/class names that the browser reserves on window (top, window, document, location) would throw at the top
      // level, so only such snippets run inside a block. Others run unwrapped, so var/function hoisting demos behave as written.
      var clash = /(^|[^.\w$])(let|const|class)\s+(top|window|document|location)\b/.test(code);
      var body = code.replace(/<\/script/gi, '<\\/script');
      ifr.srcdoc = '<script>' + shim + '<\/script><script>' + (clash ? '{\n' + body + '\n}' : body) + '<\/script>';
      var render = function (fin) {
        out.innerHTML = '<pre class="out">' + (lines.length ? lines.map(function (l) { return l.t === 'error' || l.t === 'warn' ? '<span class="c-r">' + esc(l.a) + '</span>' : esc(l.a); }).join('\n') : '<span class="c-m">(no console output yet)</span>') + '</pre>' + (fin ? '<div class="meta">Finished (captured for 3s, including timers & promises).</div>' : '');
      };
      var onMsg = function (e) { if (e.data && e.data.tok === tok) { lines.push(e.data); render(false); } };
      window.addEventListener('message', onMsg);
      document.body.appendChild(ifr);
      setTimeout(function () { window.removeEventListener('message', onMsg); ifr.remove(); render(true); }, 3000);
      render(false);
    }
  }

  var AUTO_HINT = {
    Understood: 'Ticks itself when you reach the end of this topic with every question in it answered correctly.',
    Solved: 'Ticks itself when you answer the question correctly and open the full solution.',
    Completed: 'Ticks itself when every quiz answer is correct.',
    Reviewed: 'Ticks itself when you have opened every interview question.'
  };
  function doneBox(id, label) {
    var on = !!DONE[id], hint = AUTO_HINT[label] || '';
    return '<label class="donebox' + (on ? ' on' : '') + '" title="' + esc(hint) + '"><input type="checkbox" data-done="' + id + '"' + (on ? ' checked' : ' disabled') + ' aria-description="' + esc(hint + ' You can untick it to redo the section.') + '"> ' + (label || 'Done') + '</label>';
  }
  function setBox(cb, on) { cb.checked = on; cb.disabled = !on; cb.parentNode.classList.toggle('on', on); }

  /* ---------- visualizer parts ---------- */
  function lbl(t) { return t ? '<div class="plbl">' + t + '</div>' : ''; }
  function hc(c) { return c ? ' hl-' + c : ''; }
  function ptrHtml(ps) {
    var pl = asList(ps);
    if (!pl.length) return '<div class="ptrs"></div>';
    return '<div class="ptrs">' + pl.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '<span class="ar">▼</span></div>';
  }
  var PART = {
    array: function (p) {
      var hl = p.hl || {}, ptr = p.ptr || {}, r = p.range, h = '<div class="arr">';
      (p.values || []).forEach(function (v, i) {
        var c = hl[i] || (r && i >= r[0] && i <= r[1] ? 'win' : '');
        h += '<div class="cw">' + ptrHtml(ptr[i]) + '<div class="cell' + hc(c) + '">' + esc(v) + '</div>' +
          (p.showIdx === false ? '' : '<div class="idx">' + (p.idxLabels ? esc(p.idxLabels[i]) : i + (p.start || 0)) + '</div>') + '</div>';
      });
      return lbl(p.label) + h + '</div>';
    },
    set: function (p) {
      var hl = p.hl || {}, its = p.items || [];
      return lbl(p.label || 'HashSet') + '<div class="chips">' + (its.length ? its.map(function (v) {
        return '<span class="chip' + hc(hl[String(v)]) + '">' + esc(v) + '</span>';
      }).join('') : '<span class="empty">empty</span>') + '</div>';
    },
    map: function (p) {
      var hl = p.hl || {}, en = p.entries || [];
      return lbl(p.label || 'HashMap') + '<div class="chips">' + (en.length ? en.map(function (e) {
        return '<span class="chip' + hc(hl[String(e[0])]) + '"><span class="k">' + esc(e[0]) + '</span> → ' + esc(e[1]) + '</span>';
      }).join('') : '<span class="empty">empty</span>') + '</div>';
    },
    bars: function (p) {
      var vals = (p.values || []).map(Number), hl = p.hl || {}, ptr = p.ptr || {};
      var max = Math.max.apply(null, [1].concat(vals.map(function (v) { return Math.abs(v) || 0; })));
      var neg = vals.some(function (v) { return v < 0; });
      var HT = 150, y0 = neg ? HT / 2 : HT, span = (neg ? HT / 2 : HT) - 18;
      var h = '<div class="bars">';
      vals.forEach(function (v, i) {
        var bh = Math.max(2, Math.abs(v) / max * span), top = v >= 0 ? y0 - bh : y0;
        var vt = v >= 0 ? top - 16 : top + bh + 1;
        h += '<div class="bcol">' + ptrHtml(ptr[i]) + '<div class="btrack" style="height:' + HT + 'px">' +
          '<div class="zline" style="top:' + y0 + 'px"></div>' +
          '<div class="bar' + hc(hl[i]) + '" style="top:' + top + 'px;height:' + bh + 'px"></div>' +
          '<div class="bval" style="top:' + vt + 'px">' + esc(p.texts ? p.texts[i] : v) + '</div></div>' +
          '<div class="idx">' + (p.idxLabels ? esc(p.idxLabels[i]) : i) + '</div></div>';
      });
      return lbl(p.label) + h + '</div>';
    },
    bits: function (p) {
      var w = p.width || 8, v = Number(p.value) || 0, hl = p.hl || {};
      var s = w >= 32 ? (v >>> 0).toString(2).padStart(32, '0') : ((v & ((1 << w) - 1)) >>> 0).toString(2).padStart(w, '0');
      var h = '<div class="bitrow">';
      for (var i = 0; i < w; i++) {
        var pos = w - 1 - i;
        h += '<div class="cw">' + ptrHtml((p.ptr || {})[pos]) + '<div class="cell' + hc(hl[pos]) + '">' + s[i] + '</div><div class="idx">' + pos + '</div></div>';
      }
      h += '<div class="bitlbl">' + (p.showDec === false ? '' : '= ' + esc(p.dec !== undefined ? p.dec : v)) + '</div>';
      return lbl(p.label) + h + '</div>';
    },
    stack: function (p) {
      var hl = p.hl || {}, its = p.items || [], h = '<div class="stk-top">↓ top</div><div class="stk">';
      for (var i = its.length - 1; i >= 0; i--) h += '<div class="cell' + hc(hl[i]) + '">' + esc(its[i]) + '</div>';
      if (!its.length) h += '<span class="empty">empty</span>';
      return '<div style="display:inline-block">' + lbl(p.label || 'Stack') + h + '</div></div>';
    },
    queue: function (p) {
      var hl = p.hl || {}, its = p.items || [];
      var h = '<div class="row"><span class="qend">' + esc(p.frontLabel || 'front') + ' ←</span><div class="que">';
      its.forEach(function (v, i) { h += '<div class="cell' + hc(hl[i]) + '">' + esc(v) + '</div>'; });
      if (!its.length) h += '<span class="empty">empty</span>';
      return lbl(p.label || 'Queue') + h + '</div><span class="qend">← ' + esc(p.backLabel || 'back') + '</span></div>';
    },
    tree: function (p) {
      var a = p.arr || [], hl = p.hl || {}, tags = p.tags || {}, depth = 0, i;
      var ok = function (k) { return k < a.length && a[k] !== null && a[k] !== undefined; };
      for (i = 0; i < a.length; i++) if (ok(i)) depth = Math.floor(Math.log2(i + 1));
      var W = Math.max(320, Math.pow(2, depth) * 52), HT = (depth + 1) * 66 + 26;
      var pos = function (k) { var d = Math.floor(Math.log2(k + 1)), q = k - (Math.pow(2, d) - 1); return [(q + 0.5) * W / Math.pow(2, d), 26 + d * 66]; };
      var e = '', n = '';
      for (i = 1; i < a.length; i++) if (ok(i) && ok((i - 1) >> 1)) {
        var A = pos((i - 1) >> 1), B = pos(i);
        e += '<line class="edge' + hc((p.ehl || {})[i]) + '" x1="' + A[0] + '" y1="' + A[1] + '" x2="' + B[0] + '" y2="' + B[1] + '"/>';
      }
      for (i = 0; i < a.length; i++) if (ok(i)) {
        var P = pos(i);
        n += '<g class="node' + hc(hl[i]) + '"><circle cx="' + P[0] + '" cy="' + P[1] + '" r="17"/><text x="' + P[0] + '" y="' + P[1] + '">' + esc(a[i]) + '</text>' +
          (tags[i] !== undefined ? '<text class="ntag" x="' + P[0] + '" y="' + (P[1] + 27) + '">' + esc(tags[i]) + '</text>' : '') + '</g>';
      }
      return lbl(p.label) + '<svg class="tree" viewBox="0 0 ' + W + ' ' + HT + '" width="' + W + '">' + e + n + '</svg>';
    },
    graph: function (p) {
      var nodes = p.nodes || [], hl = p.hl || {}, ehl = p.ehl || {}, tags = p.tags || {}, S = 6, R = 17, byId = {};
      nodes.forEach(function (nd) {
        byId[nd.id] = nd;
        if (nd.shape === 'box') { var lab = String(nd.label !== undefined ? nd.label : nd.id); nd._w = nd.w ? nd.w * S : Math.max(64, lab.length * 7.6 + 22); nd._h = 34; }
      });
      var trim = function (nd, ux, uy) {
        if (nd.shape !== 'box') return R;
        var hw = nd._w / 2 + 2, hh = nd._h / 2 + 2;
        return Math.min(ux ? hw / Math.abs(ux) : 1e9, uy ? hh / Math.abs(uy) : 1e9);
      };
      var mk = 'ah' + Math.random().toString(36).slice(2, 8);
      var e = '';
      (p.edges || []).forEach(function (ed) {
        var u = byId[ed[0]], v = byId[ed[1]];
        if (!u || !v) return;
        var x1 = u.x * S, y1 = u.y * S, x2 = v.x * S, y2 = v.y * S, dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L;
        var c = ehl[ed[0] + '-' + ed[1]] || (!p.directed ? ehl[ed[1] + '-' + ed[0]] : '') || '';
        var t1 = trim(u, ux, uy), t2 = trim(v, ux, uy) + (p.directed ? 3 : 0);
        e += '<line class="edge' + hc(c) + '" x1="' + (x1 + ux * t1) + '" y1="' + (y1 + uy * t1) + '" x2="' + (x2 - ux * t2) + '" y2="' + (y2 - uy * t2) + '"' + (p.directed ? ' marker-end="url(#' + mk + ')"' : '') + '/>';
        if (ed[2] !== undefined && ed[2] !== null && ed[2] !== '') e += '<text class="wt" x="' + ((x1 + x2) / 2 - uy * 10) + '" y="' + ((y1 + y2) / 2 + ux * 10) + '">' + esc(ed[2]) + '</text>';
      });
      var n = '';
      nodes.forEach(function (nd) {
        var X = nd.x * S, Y = nd.y * S, lab = nd.label !== undefined ? nd.label : nd.id;
        var shape = nd.shape === 'box' ? '<rect x="' + (X - nd._w / 2) + '" y="' + (Y - nd._h / 2) + '" width="' + nd._w + '" height="' + nd._h + '" rx="8"/>' : '<circle cx="' + X + '" cy="' + Y + '" r="' + R + '"/>';
        n += '<g class="node' + (nd.shape === 'box' ? ' box' : '') + hc(hl[nd.id]) + '">' + shape + '<text x="' + X + '" y="' + Y + '">' + esc(lab) + '</text>' +
          (tags[nd.id] !== undefined ? '<text class="ntag" x="' + X + '" y="' + (Y + (nd.shape === 'box' ? 30 : 29)) + '">' + esc(tags[nd.id]) + '</text>' : '') + '</g>';
      });
      var defs = p.directed ? '<defs><marker id="' + mk + '" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto-start-reverse"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>' : '';
      return lbl(p.label) + '<svg class="graph" viewBox="0 0 ' + (100 * S) + ' ' + ((p.height || 60) * S) + '" width="600">' + defs + e + n + '</svg>';
    },
    grid: function (p) {
      var hl = p.hl || {}, rows = p.rows || [], h = '<div class="grid"><table>';
      if (p.colHead) h += '<tr>' + (p.rowHead ? '<th></th>' : '') + p.colHead.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>';
      rows.forEach(function (r, i) {
        h += '<tr>' + (p.rowHead ? '<th>' + esc(p.rowHead[i]) + '</th>' : '');
        r.forEach(function (c, j) { h += '<td class="' + hc(hl[i + ',' + j]) + '">' + esc(c) + '</td>'; });
        h += '</tr>';
      });
      return lbl(p.label) + h + '</table></div>';
    },
    list: function (p) {
      var v = p.values || [], n = v.length, nx = p.next, hl = p.hl || {}, ptr = p.ptr || {};
      if (!nx) { nx = v.map(function (_, i) { return i + 1 < n ? i + 1 : (p.cycleTo !== undefined ? p.cycleTo : -1); }); }
      var h = '<div class="llist">';
      for (var i = 0; i < n; i++) {
        var note = '';
        if (nx[i] === -1 && i !== n - 1) note = '→null';
        else if (nx[i] !== -1 && nx[i] !== i + 1 && !(i > 0 && nx[i] === i - 1)) note = '→[' + nx[i] + ']';
        h += '<div class="lnode">' + ptrHtml(ptr[i]) + '<div class="cell' + hc(hl[i]) + '">' + esc(v[i]) + '</div><div class="lnote">' + note + '</div></div>';
        if (i < n - 1) {
          var rt = nx[i] === i + 1, lf = nx[i + 1] === i;
          h += '<div class="lconn">' + (rt && lf ? '⇄' : rt ? '→' : lf ? '←' : '') + '</div>';
        } else h += '<div class="lconn">' + (nx[i] === -1 ? '→ null' : '') + '</div>';
      }
      return lbl(p.label || 'Linked List') + h + '</div>';
    },
    vars: function (p) {
      var hl = p.hl || {}, vals = p.vals || {};
      return lbl(p.label) + '<div class="vars">' + Object.keys(vals).map(function (k) {
        return '<span class="var' + hc(hl[k]) + '"><b>' + esc(k) + '</b> = ' + esc(vals[k]) + '</span>';
      }).join('') + '</div>';
    },
    code: function (p) {
      // p.alt = { python: { code, map }, js: {...}, cpp: {...} } shows the learner's language; map turns the main
      // version's line numbers (used by hl) into that version's lines, e.g. { 3: 4 } (unlisted lines keep their number).
      var pref = viewLang(), a = pref && p.alt && p.alt[pref] && langKey(p.lang) !== pref ? p.alt[pref] : null;
      var hl = p.hl || {};
      if (a) {
        var m = a.map || {}, h2 = {};
        Object.keys(hl).forEach(function (k) { var t = m[k] !== undefined ? m[k] : +k; if (t) h2[t] = hl[k]; });
        p = { label: p.label, code: a.code, lang: a.lang || pref }; hl = h2;
      }
      var lines = dedent(p.code || '').split('\n');
      return lbl(p.label) + '<div class="vcode"><pre>' + lines.map(function (l, i) {
        return '<div class="vline' + hc(hl[i + 1]) + '"><span class="ln">' + (i + 1) + '</span>' + (highlight(l, p.lang || 'text') || ' ') + '</div>';
      }).join('') + '</pre></div>';
    },
    table: function (p) {
      var hl = p.hl || {}, rows = p.rows || [];
      return lbl(p.label) + '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + (p.columns || []).map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r, i) { return '<tr class="' + hc(hl[i]) + '">' + r.map(function (c) { return '<td>' + (c === null ? '<span class="c-m">NULL</span>' : esc(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    },
    text: function (p) { return lbl(p.label) + '<div>' + (p.html || '') + '</div>'; }
  };
  PART.matrix = PART.grid;
  function renderPart(p) {
    var f = PART[p && p.type];
    if (!f) return '<div class="part"><span class="empty">unknown part ' + esc(p && p.type) + '</span></div>';
    return '<div class="part part-' + p.type + '">' + f(p) + '</div>';
  }

  var vizRegistry = [];
  function vizHtml(v) {
    var k = vizRegistry.push(v) - 1;
    return '<div class="viz" data-viz="' + k + '"><div class="viz-head"><b>' + esc(v.title || 'Visualizer') + '</b><span class="viz-step"></span></div>' +
      (v.input !== undefined ? '<div class="viz-in"><label>' + esc(v.inputLabel || 'Input') + '</label>' + (/\n/.test(String(v.input))
        ? '<textarea aria-label="' + esc(v.inputLabel || 'Input') + '" rows="' + Math.min(10, String(v.input).split('\n').length) + '" spellcheck="false">' + esc(v.input) + '</textarea>'
        : '<input type="text" aria-label="' + esc(v.inputLabel || 'Input') + '" value="' + esc(v.input) + '">') + '<button class="btn" data-act="load" type="button">Load</button></div>' : '') +
      '<div class="viz-stage"></div><div class="viz-tl" role="group" aria-label="Step timeline"></div>' +
      '<div class="narr" aria-live="polite"><span class="tag">Narrator</span><div class="narr-prev"></div><div class="narr-text"></div></div>' +
      '<div class="viz-ctrl"><button class="btn" data-act="prev" type="button" aria-label="Previous step">' + ICONS.prev + 'Prev</button><button class="btn primary" data-act="play" type="button">' + ICONS.play + 'Play</button>' +
      '<button class="btn" data-act="next" type="button" aria-label="Next step">Next' + ICONS.next + '</button><button class="btn ghost" data-act="reset" type="button">' + ICONS.reset + 'Reset</button>' +
      '<select data-act="speed" aria-label="Playback speed"><option value="1800">Slow</option><option value="1100" selected>Normal</option><option value="550">Fast</option></select></div>' +
      '<div class="legend"><span class="lg-cur">current / checking</span><span class="lg-ok">new / inserted / match</span><span class="lg-bad">duplicate / removed / conflict</span><span class="lg-win">window / range</span><span class="lg-sel">special / answer</span><span class="lg-done">finished</span></div></div>';
  }
  function mountViz(el) {
    var v = vizRegistry[+el.getAttribute('data-viz')];
    var frames = [], k = 0, timer = null;
    var stage = $('.viz-stage', el), narr = $('.narr-text', el), prevN = $('.narr-prev', el), step = $('.viz-step', el), tl = $('.viz-tl', el);
    var bPrev = $('[data-act=prev]', el), bNext = $('[data-act=next]', el), bPlay = $('[data-act=play]', el), sp = $('[data-act=speed]', el), inp = $('.viz-in input, .viz-in textarea', el);
    function stop() { if (timer) clearInterval(timer); timer = null; bPlay.innerHTML = ICONS.play + 'Play'; }
    function buildTl() {
      if (frames.length < 2) { tl.innerHTML = ''; return; }
      tl.innerHTML = frames.length <= 40
        ? frames.map(function (_, i) { return '<button type="button" class="tick" data-act="go" data-k="' + i + '" aria-label="Go to step ' + (i + 1) + '"></button>'; }).join('')
        : '<input type="range" data-act="seek" min="0" max="' + (frames.length - 1) + '" value="0" aria-label="Step">';
    }
    function draw() {
      var f = frames[k] || { parts: [] };
      stage.innerHTML = asList(f.parts).map(renderPart).join('');
      narr.innerHTML = f.narr || '';
      prevN.innerHTML = k > 0 && frames[k - 1].narr ? frames[k - 1].narr : '';
      step.textContent = 'Step ' + (k + 1) + ' / ' + frames.length;
      bPrev.disabled = k === 0;
      bNext.disabled = k >= frames.length - 1;
      $$('.tick', tl).forEach(function (t, i) { t.className = 'tick' + (i === k ? ' on' : i < k ? ' past' : ''); t.setAttribute('aria-pressed', i === k ? 'true' : 'false'); });
      var rg = $('input[type=range]', tl);
      if (rg) rg.value = k;
    }
    function load() {
      stop();
      try {
        frames = v.gen(inp ? inp.value : undefined) || [];
        if (!frames.length) throw new Error('No steps generated for this input.');
      } catch (e) {
        frames = [{ narr: '⚠️ ' + esc(e.message) + (v.inputHint ? ' — ' + esc(v.inputHint) : ''), parts: [] }];
      }
      k = 0; buildTl(); draw();
    }
    tl.addEventListener('input', function (ev) { if (ev.target.getAttribute('data-act') === 'seek') { stop(); k = +ev.target.value; draw(); } });
    el.addEventListener('click', function (ev) {
      var bt = ev.target.closest ? ev.target.closest('[data-act]') : ev.target;
      var a = bt && bt.getAttribute('data-act');
      if (a === 'go') { stop(); k = +bt.getAttribute('data-k'); draw(); }
      else if (a === 'prev' && k > 0) { stop(); k--; draw(); }
      else if (a === 'next' && k < frames.length - 1) { stop(); k++; draw(); }
      else if (a === 'reset') { stop(); k = 0; draw(); }
      else if (a === 'load') load();
      else if (a === 'play') {
        if (timer) { stop(); return; }
        if (k >= frames.length - 1) { k = 0; draw(); }
        bPlay.innerHTML = ICONS.pause + 'Pause';
        timer = setInterval(function () {
          if (!document.body.contains(el) || k >= frames.length - 1) { stop(); return; }
          k++; draw();
        }, +sp.value);
      }
    });
    sp.addEventListener('change', function () { if (timer) { stop(); bPlay.click(); } });
    if (inp) inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && (inp.tagName !== 'TEXTAREA' || ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); load(); } });
    load();
  }

  /* ---------- problems, quiz, interview ---------- */
  function letter(i) { return String.fromCharCode(65 + i); }
  function mcqHtml(q, cls) {
    var ord = q.options.map(function (_, i) { return i; }), pos = [];
    for (var i = ord.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = ord[i]; ord[i] = ord[j]; ord[j] = t; }
    ord.forEach(function (o, k) { pos[o] = k; });
    var ex = String(q.explain || '').replace(/\b([Oo]ptions?\s+)([A-D])\b/g, function (s, w, c) { var k = pos[c.charCodeAt(0) - 65]; return k === undefined ? s : w + letter(k); });
    return '<div class="box mcq ' + (cls || '') + '" data-ans="' + q.answer + '"><span class="tag">What would you do?</span><div>' + q.q + '</div><div class="opts">' +
      ord.map(function (o, k) { return '<button class="opt" type="button" data-opt="' + o + '">' + letter(k) + '. ' + q.options[o] + '</button>'; }).join('') +
      '</div><div class="mcq-fb" hidden></div><template>' + ex + '</template></div>';
  }
  function problemHtml(p, id, practice, lang) {
    var lv = p.level || 'Medium', plang = p.lang || lang;
    var labels = practice
      ? ['Hint 1 — Math / observation', 'Hint 2 — Data structure / approach', 'Hint 3 — Pseudocode & edge cases']
      : ['Hint 1 — The “aha” observation', 'Hint 2 — Data structure & pointer choice', 'Hint 3 — Edge cases & plain-English recipe'];
    var h = '<article class="card problem ' + lv + (practice ? '' : ' treasure') + '" id="' + id + '"><div class="prob-head"><span class="lvl ' + lv + '">' + lv + '</span><h3>' + p.title + '</h3>' + doneBox(id, 'Solved') + '</div>';
    if (p.tags) h += '<div class="meta">' + esc(asList(p.tags).join(' · ')) + (p.companies ? ' · <b>Asked at</b> ' + esc(asList(p.companies).join(', ')) : '') + '</div>';
    h += '<div class="statement">' + (p.statement || '') + '</div>';
    if (p.constraints) h += '<div class="meta"><b>Constraints:</b> ' + p.constraints + '</div>';
    if (p.example) h += '<div class="box example"><span class="tag">Example — why this input gives this output</span>' + p.example + '</div>';
    if (p.brute) h += '<div class="box brute"><span class="tag">Brute force / naive approach</span>' + (p.brute.why || '') + codeBlock(p.brute.code, plang, 'Brute force') + '</div>';
    if (p.mcq) h += mcqHtml(p.mcq);
    asList(p.hints).forEach(function (hint, i) {
      h += '<details class="h' + (i + 1) + '"><summary>' + (labels[i] || 'Hint ' + (i + 1)) + '</summary><div class="dbody">' + hint + '</div></details>';
    });
    var s = p.solution || {};
    var sn = [snip(s.code, plang, 'Solution')].concat(asList(s.alt).map(function (a) { return snip(a, plang, 'Solution'); }));
    h += '<details class="sol"><summary>Full solution — annotated code' + (s.dry ? ', dry run' : '') + ' &amp; complexity</summary><div class="dbody">' +
      (s.approach ? '<div>' + s.approach + '</div>' : '') + codeTabs(sn) +
      (s.dry && s.dry.head ? '<h4>Line-by-line dry run</h4>' + H.table(s.dry.head, s.dry.rows || []) : '') +
      (s.complexity ? '<h4>Complexity / trade-offs</h4><div>' + s.complexity + '</div>' : '') +
      (s.followUps ? '<h4>Interview follow-ups</h4><ul>' + asList(s.followUps).map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul>' : '') + '</div></details>';
    return h + '</article>';
  }
  function videoOf(id) { var v = (window.IM_VIDEOS || {})[id]; return v && /^[A-Za-z0-9_-]{11}$/.test(v.id) ? v : null; }
  function videoHtml(id, v) {
    var mins = LessonVideo.label(v);
    return '<div class="box vid" id="' + id + '-vid"><span class="tag">From the watchtower · watch it explained</span>' +
      '<button type="button" class="vid-play" ' + LessonVideo.attrs(v) + ' aria-label="Play video: ' + esc(v.title) + '"><span class="vid-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5l12 7-12 7z"/></svg></span><span class="vid-meta"><b>' + esc(v.title) + '</b><small>' + esc(v.channel) + ' · ' + mins + 'YouTube</small></span></button>' +
      '<p class="vid-note">' + (v.note ? esc(v.note) + ' ' : '') + 'Plays from YouTube when you tap it. ' + (v.curated ? 'Selected for this lesson.' : 'Suggested automatically; check the coverage against the lesson.') + '</p>' +
      '<a class="vid-open" href="' + esc(LessonVideo.watchUrl(v)) + '" target="_blank" rel="noopener noreferrer">Open on YouTube</a></div>';
  }
  function topicHtml(m, t, i, lang) {
    var id = m.id + '-t' + i, vid = videoOf(id);
    var hasHow = asList(t.viz).length || asList(t.code).length, probs = topicProblems(t);
    var layers = [[t.analogy, 'an', 'Legend'], [t.explain, 'idea', 'Explain'], [vid, 'vid', 'Video'], [t.clues && t.clues.length, 'clues', 'Clues'], [hasHow, 'viz', 'Visualize'],
      [t.examples && t.examples.length, 'ex', 'Examples'], [t.deepDive, 'deep', 'Deep dive'], [t.aiEra, 'ai', 'AI era'], [probs.length, 'q0', 'Treasure']];
    var h = '<section class="card topic" id="' + id + '"><div class="topic-head"><h2><span class="tnum">' + m.num + '.' + (i + 1) + '</span>' + t.title + '</h2>' + doneBox(id, 'Understood') + '</div>' +
      '<nav class="lnav" aria-label="Lesson layers">' + layers.filter(function (L) { return L[0]; }).map(function (L) { return '<a href="#' + id + '-' + L[1] + '">' + L[2] + '</a>'; }).join('') + '</nav>';
    if (t.analogy) h += '<div class="box analogy" id="' + id + '-an"><span class="tag">The legend of this place · real-world analogy</span>' + t.analogy + '</div>';
    if (t.explain) h += '<div class="layer" id="' + id + '-idea"><div class="layer-tag lv-B">The idea in plain English</div><div class="explain">' + t.explain + '</div></div>';
    if (vid) h += videoHtml(id, vid);
    if (t.clues && t.clues.length) h += '<div class="box clues" id="' + id + '-clues"><span class="tag">How do I think of this myself? — clues in the question</span><ul>' + t.clues.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul></div>';
    if (hasHow) h += '<div class="layer-tag lv-I" id="' + id + '-viz">How it really works — watch it, then read the code</div>';
    asList(t.viz).forEach(function (v) { h += vizHtml(v); });
    var titles = asList(t.codeTitle);
    asList(t.code).forEach(function (c, j) { h += codeBlock(c, t.lang || lang, titles[j]); });
    if (t.after) h += '<div class="explain">' + t.after + '</div>';
    if (t.examples && t.examples.length) {
      h += '<div class="layer-tag lv-B" id="' + id + '-ex">Worked examples</div><div class="examples">';
      t.examples.forEach(function (ex, j) {
        h += '<details class="ex"' + (j === 0 ? ' open' : '') + '><summary>Example ' + (j + 1) + ': ' + ex.title + '</summary><div class="dbody">' + (ex.html || '') + codeBlock(ex.code, t.lang || lang, 'Example code') + '</div></details>';
      });
      h += '</div>';
    }
    if (t.deepDive) h += '<div class="box deep" id="' + id + '-deep"><span class="tag">Expert deep dive — internals, proofs, edge cases, production reality</span>' + t.deepDive + '</div>';
    if (t.aiEra) h += '<div class="box ai" id="' + id + '-ai"><span class="tag">New school — working alongside AI</span>' + t.aiEra + '</div>';
    probs.forEach(function (p, j) {
      h += '<div class="guided-title">' + JI('chest') + 'Hidden treasure · guided problem — solve it yourself</div>' + problemHtml(p, id + '-q' + j, false, t.lang || lang);
    });
    return h + '<div class="topic-end" aria-hidden="true"></div></section>';
  }
  function quizHtml(m) {
    var q = m.quiz || [];
    if (!q.length) return '';
    return '<section class="card gate" id="' + m.id + '-quiz"><div class="topic-head"><h2>' + JI('gate') + 'Riddle gate — ' + q.length + ' riddles</h2>' + doneBox(m.id + '-quiz', 'Completed') + '</div><div class="meta">Answer from memory first. Wrong answers show a nudge; right answers explain why. Answer every riddle right and the gate opens by itself.</div>' +
      q.map(function (x, i) { return mcqHtml({ q: '<b>Q' + (i + 1) + '.</b> ' + x.q, options: x.options, answer: x.answer, explain: x.explain }, 'quizq'); }).join('') + '</section>';
  }
  function interviewHtml(m) {
    var iv = m.interview || [];
    if (!iv.length) return '';
    return '<section class="card tavern" id="' + m.id + '-iv"><div class="topic-head"><h2>' + JI('lantern') + 'Interview tavern — ' + iv.length + ' questions</h2>' + doneBox(m.id + '-iv', 'Reviewed') + '</div><div class="meta">Say your answer out loud before opening each one. Then compare structure, not just facts.</div>' +
      iv.map(function (x, i) {
        return '<details class="iv"><summary><span class="ivn">Q' + (i + 1) + '</span> ' + x.q + (x.level ? ' ' + lvlBadge(x.level) : '') + '</summary><div class="dbody">' + x.a +
          (x.followUps && x.followUps.length ? '<h4>Likely follow-ups</h4><ul>' + x.followUps.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul>' : '') + '</div></details>';
      }).join('') + '</section>';
  }

  function routeLang() { return langPref() || (window.Learn ? Learn.pref().lang : 'java'); }
  function prereqHtml(m) {
    if (!window.PATHS || !window.Learn) return m.prereqs || '—';
    var lang = routeLang(), req = PATHS.needs(m.id, lang), rec = PATHS.recs(m.id, lang);
    var link = function (id) { var mm = Learn.meta(id), st = Learn.status(id, DONE); return '<a class="pq' + (st.satisfied ? ' ok' : '') + '" href="' + Learn.href(id) + '">' + (st.satisfied ? '✓ ' : '') + esc(mm ? mm.title : id) + '</a>'; };
    var h = req.length ? '<span class="pq-l">Required:</span> ' + req.map(link).join(', ') : 'Nothing required: this is a starting point.';
    if ((PATHS.NEEDS[m.id] || []).some(function (x) { return x.indexOf('prep:') === 0; })) h += ' <small class="muted">(the ' + esc(Learn.LANG_NAMES[lang]) + ' modules; choose your code language below)</small>';
    if (rec.length) h += '<br><span class="pq-l">Helpful:</span> ' + rec.map(link).join(', ');
    var miss = Learn.missing(m.id, lang, DONE);
    if (miss.length) h += '<div class="pq-miss"><b>Missing first:</b> ' + miss.map(function (id) { var mm = Learn.meta(id); return esc(mm ? mm.title : id); }).join(', ') + '. Already know these? <button class="btn sm" type="button" data-testout="' + m.id + '">Take the readiness check</button></div>';
    var un = Learn.unlocks(m.id, lang).slice(0, 4);
    if (un.length) h += '<div class="pq-next"><span class="pq-l">This unlocks:</span> ' + un.map(function (id) { var mm = Learn.meta(id); return '<a href="' + Learn.href(id) + '">' + esc(mm ? mm.title : id) + '</a>'; }).join(', ') + '</div>';
    var st = Learn.status(m.id, DONE);
    h += '<div class="pq-st">' + (st.mastered ? '<b class="c-g">★ Mastered</b>: lessons, quiz, practice and checkpoint done.' : '<b>Mastery:</b> finish the lessons and the riddle gate, solve half the practice arena, then pass the ' + esc(ZN[m.level]) + ' checkpoint on the land page' + (st.overdue ? ', and clear the reviews that are due' : '') + '.') + '</div>';
    return h;
  }
  function langBoxHtml(m) {
    var p = viewLang(), notes = m.langNotes || {};
    var h = '<div class="box lang"><div class="lang-row"><span class="tag">Your code language</span><label class="lang-pick"><span class="sr">Code language</span><select data-langpick>' +
      '<option value="">Show every language</option>' + CODE_LANGS.map(function (c) { return '<option value="' + c[0] + '"' + (p === c[0] ? ' selected' : '') + '>' + esc(c[1]) + '</option>'; }).join('') + '</select></label></div>';
    var keys = CODE_LANGS.map(function (c) { return c[0]; }).filter(function (k) { return notes[k] || (k === 'js' && notes.ts); });
    if (keys.length) {
      var first = p && keys.indexOf(p) >= 0 ? p : null;
      if (first) h += '<div class="lang-note"><b>' + esc(CODE_LANGS.filter(function (c) { return c[0] === first; })[0][1]) + ' notes for this module</b>' + (notes[first] || notes.ts) + '</div>';
      var rest = keys.filter(function (k) { return k !== first; });
      if (rest.length) h += '<details class="lang-more"><summary>' + (first ? 'Notes for other languages' : 'Language notes: recursion limits, integers and complexity traps') + '</summary><div class="dbody">' +
        rest.map(function (k) { return '<div class="lang-note"><b>' + esc(CODE_LANGS.filter(function (c) { return c[0] === k; })[0][1]) + '</b>' + (notes[k] || notes.ts) + '</div>'; }).join('') + '</div></details>';
    }
    if (m.langExplain) h += '<div class="lang-note lang-explain">' + m.langExplain + '</div>';
    return h + '</div>';
  }
  function moduleHtml(m) {
    vizRegistry = []; SNIPS = [];
    var lang = m.lang || TRACK.lang;
    var h = '<div class="crumb"><a href="index.html">World map</a><span>›</span><a href="#">' + esc(TRACK.title) + '</a><span>›</span><span>Place ' + m.num + '</span>' + lvlBadge(m.level) + '</div><h1>' + m.title + '</h1>';
    if (PM()) h += pathBannerHtml(m);
    h += '<div class="intro">' + (m.intro || '') + '</div>';
    h += '<div class="box path"><span class="tag">Learning path for this module</span><div class="cx"><b>Time</b><span>~' + (m.hours || '?') + ' hours including practice</span><b>Before this</b><span id="prq-' + m.id + '">' + prereqHtml(m) + '</span><b>You will be able to</b><ul>' + asList(m.goals).map(function (g) { return '<li>' + g + '</li>'; }).join('') + '</ul></div>' +
      '<div class="meta">How to travel: read each landmark’s legend → the idea → run the visualizer → work the examples → dig up the hidden treasure with clues → riddle gate → interview tavern → practice arena. Checkmarks tick themselves when you finish a section with the right answers; untick one to redo it.</div></div><div class="toc">';
    h = h.replace(/<div class="toc">$/, langBoxHtml(m) + '<div class="toc">');
    m.topics.forEach(function (t, i) { h += '<a href="#' + m.id + '-t' + i + '" class="' + (DONE[m.id + '-t' + i] ? 'ok' : '') + '">' + m.num + '.' + (i + 1) + ' ' + stripTags(t.title) + '</a>'; });
    if (m.quiz && m.quiz.length) h += '<a href="#' + m.id + '-quiz">Riddle gate</a>';
    if (m.interview && m.interview.length) h += '<a href="#' + m.id + '-iv">Interview tavern</a>';
    h += '<a href="#' + m.id + '-arena">Practice arena</a></div>';
    var gate = langGate(m);
    if (gate && gate.hide) h += '<div class="box langgate" id="lg-' + m.id + '"><p><b>' + esc(gate.label) + ' version.</b> These lessons are written for ' + esc(gate.langs.map(function (l) { return Learn.LANG_NAMES[l]; }).join(' and ')) + ', not ' + esc(Learn.LANG_NAMES[gate.lang]) + '. <button class="btn sm" type="button" data-langshow="' + m.id + '">Show it</button></p></div>';
    m.topics.forEach(function (t, i) {
      var th = topicHtml(m, t, i, lang);
      if (gate) th = th.replace('<section class="card topic"', '<section class="card topic" data-lang="' + gate.langs.join(' ') + '"' + (gate.hide ? ' hidden' : ''));
      h += th;
    });
    h += quizHtml(m) + interviewHtml(m);
    var pr = m.practice || [], cnt = { Easy: 0, Medium: 0, Hard: 0 };
    pr.forEach(function (p) { cnt[p.level] = (cnt[p.level] || 0) + 1; });
    h += '<div class="arena-head" id="' + m.id + '-arena"><div class="ptag">Module ' + m.num + '</div><h2>Practice arena — ' + m.title + '</h2><div class="meta">' + pr.length + ' graded problems · ' +
      '<span class="c-g">' + cnt.Easy + ' Easy warm-ups</span> → <span class="c-y">' + cnt.Medium + ' Medium interview-standard</span> → <span class="c-r">' + cnt.Hard + ' Hard twists</span>. Try each alone first; open hints one at a time.</div></div>';
    pr.forEach(function (p, k) { h += problemHtml(p, m.id + '-p' + k, true, lang); });
    var avail = MODULES, idx = avail.indexOf(m), prev = avail[idx - 1], next = avail[idx + 1];
    h += '<div class="row" style="justify-content:space-between;margin-top:30px;flex-wrap:wrap;gap:8px">' + (prev ? '<a class="btn lg" href="#' + prev.id + '">‹ Place ' + prev.num + ' · ' + prev.title + '</a>' : '<span></span>') +
      (next ? '<a class="btn primary lg" href="#' + next.id + '">Next place · ' + next.title + ' ›</a>' : '') + '</div>';
    return h;
  }

  /* ---------- track dashboard + nav ---------- */
  function loaded(id) { for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) return MODULES[i]; return null; }
  var ZN = { B: 'Beginner Shore', I: 'Intermediate Forest', A: 'Advanced Peaks', E: 'Expert Summit' }, ZC = { B: 'green', I: 'gold', A: 'clay', E: 'violet' };
  function region(tid) { return window.Journey ? Journey.regionOf(tid) : { name: 'The world', area: '', color: 'gold' }; }
  function curPlace() {
    var TP = trackPath();
    if (TP && TP.length) for (var j = 0; j < TP.length; j++) { var pm = loaded(TP[j]); if (pm) { var pids = items(pm); if (doneOf(pids) < pids.length) return pm; } }
    for (var i = 0; i < MODULES.length; i++) { var ids = items(MODULES[i]); if (doneOf(ids) < ids.length) return MODULES[i]; }
    return MODULES[MODULES.length - 1] || null;
  }
  function stampCard(key, on, how) {
    if (!window.Journey) return '';
    var st = Journey.STAMPS.filter(function (x) { return x.key === key; })[0];
    return '<div class="place guard' + (on ? ' on' : '') + '">' + Journey.stampSvg(st, on) + '<b>' + esc(st.name) + ' stamp</b><span>' + (on ? 'Earned. It is in your passport.' : how) + '</span></div>';
  }
  function zoneQuestions(lv) {
    var qs = [];
    MODULES.forEach(function (m) { if (m.level !== lv) return; (m.src ? (window.IM_QUIZ || {})[m.id] || [] : m.quiz || []).forEach(function (q, i) { if (q && q.options && q.options.length > 1) qs.push({ q: q.q, options: q.options, answer: q.answer, explain: q.explain, section: m.id + '-quiz', mod: m.id, modTitle: stripTags(m.title) }); }); });
    return qs;
  }
  function checkpointCard(lv) {
    if (!window.Learn) return '';
    var n = 0;
    MODULES.forEach(function (m) { if (m.level === lv) n += m.src ? m.qn || 0 : (m.quiz || []).filter(function (q) { return q && q.options && q.options.length > 1; }).length; });
    if (n < 6) return '';
    var ok = !!DONE['@cp:' + TRACK.id + '-' + lv];
    return '<div class="place guard cp' + (ok ? ' on' : '') + '">' + Journey.icon('key', 'cp-ic') + '<b>' + esc(ZN[lv]) + ' checkpoint</b><span>' + (ok ? 'Passed. Modules here can count as mastered.' : 'Twelve mixed questions from this zone, no topic labels. 80% passes.') + '</span><button class="btn sm" type="button" data-checkpoint="' + lv + '">' + (ok ? 'Retake' : 'Take the checkpoint') + '</button></div>';
  }
  function trackDashHtml() {
    var R = region(TRACK.id), tot = 0, dn = 0, lm = 0, cur = curPlace(), last = store.get('imastery.last', null);
    MODULES.forEach(function (m) { var ids = items(m); tot += ids.length; dn += doneOf(ids); lm += m.topics.length; });
    var p = tot ? Math.round(dn / tot * 100) : 0, mine = last && last.track === TRACK.id && last.hash;
    var TP = trackPath(), onp = {}, pdone = 0;
    if (TP && TP.length) { TP.forEach(function (id) { onp[id] = 1; if (Learn.status(id, DONE).satisfied) pdone++; }); mine = false; } else TP = null;
    var go = mine ? '<a class="btn clay lg" href="#' + esc(last.hash) + '">Continue at place ' + esc(last.num) + '</a>' : cur ? '<a class="btn clay lg" href="#' + cur.id + '">' + (dn ? 'Continue at place ' : 'Start at place ') + cur.num + '</a>' : '';
    var h = '<section class="land-hero"><div class="lh-l"><span class="kicker c-' + R.color + '">' + esc(R.name) + ' · ' + esc(R.area) + '</span><h1>' + TRACK.title + '</h1><p>' + TRACK.desc + '</p>' +
      '<p class="muted">' + TRACK.modules.length + ' places from Beginner Shore to Expert Summit · ' + MODULES.length + ' open now · ' + lm + ' landmarks, with a practice arena at the end of each place.</p></div>' +
      (TP ? '<div class="lh-r"><div class="jrow"><span>Your path</span><b class="c-gold">' + pdone + ' of ' + TP.length + '</b></div><div class="jbar-p c-gold"><i style="width:' + Math.round(pdone / TP.length * 100) + '%"></i></div><small class="muted lh-all">All ' + TRACK.modules.length + ' places: ' + p + '% explored</small>' + go + '</div></section>'
        : '<div class="lh-r"><div class="jrow"><span>Explored</span><b class="c-gold">' + p + '%</b></div><div class="jbar-p c-gold"><i style="width:' + p + '%"></i></div>' + go + '</div></section>');
    if (TP && TP.length) {
      h += '<section class="zone pathzone" aria-labelledby="zPath"><h2 class="zone-h" id="zPath"><span class="zdot bg-violet" aria-hidden="true"></span>Your path in this land<small>' + TP.length + ' places</small></h2><div class="trail">';
      TP.forEach(function (id) {
        var m = loaded(id);
        if (!m) return;
        var ids = items(m), d = doneOf(ids), full = ids.length && d === ids.length, isCur = cur === m && !full, w = ids.length ? Math.round(d / ids.length * 100) : 0, mst = Learn.status(m.id, DONE);
        h += '<a class="place' + (full ? ' done' : isCur ? ' cur' : '') + (mst.mastered ? ' mastered' : '') + '" href="#' + m.id + '"><div class="jrow"><span class="pdot">' + (mst.mastered ? '★' : full ? '✓' : m.num) + '</span><span class="ptag2">' + (mst.mastered ? 'mastered' : full ? 'cleared' : isCur ? 'you are here' : d ? 'exploring' : 'ahead') + '</span></div><b>' + m.title + '</b>' + relTag(id) + '<div class="jbar-p"><i style="width:' + w + '%"></i></div><span class="pmeta">' + m.topics.length + ' landmarks · ' + w + '%</span></a>';
      });
      h += '</div></section>';
    } else if (TP === null && PM()) h += '<p class="muted pathnone">No place in this land is on your path. Everything stays open.</p>';
    if (cur) {
      var ci = -1;
      cur.topics.forEach(function (_, i) { if (ci < 0 && !DONE[cur.id + '-t' + i]) ci = i; });
      h += '<section class="here" aria-labelledby="hereH"><span class="kicker">You are here · place ' + cur.num + ' · ' + ZN[cur.level] + '</span><h2 id="hereH">' + cur.title + '</h2><div class="marks">' +
        cur.topics.map(function (t, i) { var id = cur.id + '-t' + i, d = DONE[id]; return '<a class="mark' + (d ? ' ok' : i === ci ? ' cur' : '') + '" href="#' + id + '"><span class="md">' + (d ? '✓' : i + 1) + '</span><span>' + stripTags(t.title) + '</span></a>'; }).join('') + '</div><div class="here-acts">' +
        (cur.quiz && cur.quiz.length ? '<a class="btn ink lg" href="#' + cur.id + '-quiz">' + JI('gate') + 'Riddle gate · ' + cur.quiz.length + ' riddles</a>' : '') +
        '<a class="btn line lg" href="#' + cur.id + '-arena">' + JI('chest') + 'Practice arena · ' + (cur.practice || []).length + ' treasures</a>' +
        (cur.interview && cur.interview.length ? '<a class="btn line lg" href="#' + cur.id + '-iv">' + JI('lantern') + 'Interview tavern · ' + cur.interview.length + ' questions</a>' : '') + '</div></section>';
    }
    var nMore = TP ? TRACK.modules.filter(function (x) { return !onp[x.id]; }).length : 0;
    if (TP && nMore) h += '<details class="more-track"><summary>More in this track (' + nMore + ')</summary>';
    ['B', 'I', 'A', 'E'].forEach(function (lv) {
      var ms = TRACK.modules.filter(function (x) { return x.level === lv; });
      if (!ms.length) return;
      if (TP && !ms.some(function (x) { return !onp[x.id]; })) return;
      var bl = 0, bd = 0, ed = 0;
      h += '<section class="zone" aria-labelledby="z' + lv + '"><h2 class="zone-h" id="z' + lv + '"><span class="zdot bg-' + ZC[lv] + '" aria-hidden="true"></span>' + ZN[lv] + '<small>' + ms.length + ' places</small></h2><div class="trail">';
      ms.forEach(function (pm) {
        var m = loaded(pm.id);
        if (!m) { h += '<div class="place soon"><div class="jrow"><span class="pdot">' + pm.num + '</span><span class="ptag2">coming soon</span></div><b>' + esc(pm.title) + '</b><span class="pmeta">' + esc(pm.scope) + '</span></div>'; return; }
        var ids = items(m), d = doneOf(ids), full = ids.length && d === ids.length, isCur = cur === m && !full, w = ids.length ? Math.round(d / ids.length * 100) : 0;
        if (lv === 'B') { bl++; if (full) bd++; }
        if (lv === 'E' && full) ed++;
        if (TP && onp[m.id]) return;
        var mst = window.Learn ? Learn.status(m.id, DONE) : {};
        h += '<a class="place' + (full ? ' done' : isCur ? ' cur' : '') + (mst.mastered ? ' mastered' : '') + '" href="#' + m.id + '"><div class="jrow"><span class="pdot">' + (mst.mastered ? '★' : full ? '✓' : m.num) + '</span><span class="ptag2">' + (mst.mastered ? 'mastered' : full ? 'cleared' : isCur ? 'you are here' : d ? 'exploring' : 'ahead') + '</span></div><b>' + m.title + '</b><div class="jbar-p"><i style="width:' + w + '%"></i></div><span class="pmeta">' + m.topics.length + ' landmarks · ' + w + '%</span></a>';
      });
      h += checkpointCard(lv);
      if (lv === 'B') h += stampCard('shore', bl > 0 && bd === bl, 'Clear every Beginner place in this land to earn it.');
      if (lv === 'E') h += stampCard('summit', ed > 0, 'Clear any Expert place to earn it.');
      h += '</div></section>';
    });
    if (TP && nMore) h += '</details>';
    return h;
  }
  function navHtml() {
    var cur = curPlace(), TP = trackPath(), onp = {}, h = '';
    if (TP && TP.length) TP.forEach(function (id) { onp[id] = 1; });
    else TP = null;
    function zones(filter) {
      ['B', 'I', 'A', 'E'].forEach(function (lv) {
        var ms = TRACK.modules.filter(function (x) { return x.level === lv && (!filter || !onp[x.id]); });
        if (!ms.length) return;
        h += '<div class="nav-part c-' + ZC[lv] + '">' + ZN[lv] + '</div>';
        ms.forEach(function (pm) { navMod(pm, ''); });
      });
    }
    function navMod(pm, tag) {
        var m = loaded(pm.id);
        if (!m) { h += '<div class="nav-mod soon" title="coming soon"><span class="num">' + pm.num + '</span><span>' + esc(pm.title) + '</span><span class="cnt">soon</span></div>'; return; }
        var ids = items(m), d = doneOf(ids), act = current === m, full = ids.length && d === ids.length;
        var ms2 = window.Learn ? Learn.status(m.id, DONE) : {};
        h += '<a class="nav-mod' + (act ? ' active' : '') + (full ? ' full' : cur === m ? ' nhere' : '') + (ms2.mastered ? ' mastered' : '') + '" href="#' + m.id + '"' + (ms2.mastered ? ' title="Mastered"' : '') + '><span class="num">' + (ms2.mastered ? '★' : full ? '✓' : m.num) + '</span><span>' + m.title + tag + '</span><span class="cnt">' + (ids.length ? Math.round(d / ids.length * 100) : 0) + '%</span></a>';
        if (act) {
          h += '<div class="nav-sub">';
          m.topics.forEach(function (t, i) { h += '<a href="#' + m.id + '-t' + i + '" class="' + (DONE[m.id + '-t' + i] ? 'ok' : '') + '">' + m.num + '.' + (i + 1) + ' ' + stripTags(t.title) + '</a>'; });
          if (m.quiz && m.quiz.length) h += '<a href="#' + m.id + '-quiz" class="' + (DONE[m.id + '-quiz'] ? 'ok' : '') + '">Riddle gate (' + m.quiz.length + ')</a>';
          if (m.interview && m.interview.length) h += '<a href="#' + m.id + '-iv" class="' + (DONE[m.id + '-iv'] ? 'ok' : '') + '">Interview tavern (' + m.interview.length + ')</a>';
          h += '<a href="#' + m.id + '-arena">Practice arena (' + (m.practice || []).length + ')</a></div>';
        }
    }
    h += '<a class="nav-back" href="index.html">' + ICONS.back + 'World map</a><a class="nav-mod' + (!current ? ' active' : '') + '" href="#"><span class="num">' + esc(TRACK.icon) + '</span><span>Land overview</span></a>';
    if (!TP) { zones(false); return h; }
    h += '<div class="nav-part c-violet">Your path · ' + TP.length + ' places</div>';
    TP.forEach(function (id) { var pm = TRACK.modules.filter(function (x) { return x.id === id; })[0]; if (pm) navMod(pm, ' ' + relTag(id)); });
    var more = TRACK.modules.filter(function (x) { return !onp[x.id]; });
    if (more.length) {
      var open = current && !onp[current.id];
      h += '<details class="nav-more"' + (open ? ' open' : '') + '><summary>More in this track (' + more.length + ')</summary>';
      zones(true);
      h += '</details>';
    }
    return h;
  }
  function updateProgress() {
    var tot = 0, dn = 0;
    MODULES.forEach(function (m) { var ids = items(m); tot += ids.length; dn += doneOf(ids); });
    $('#pfill').style.width = (tot ? dn / tot * 100 : 0) + '%';
    var TP = trackPath();
    if (TP && TP.length) $('#ptext').textContent = 'Your path: ' + TP.filter(function (id) { return Learn.status(id, DONE).satisfied; }).length + ' of ' + TP.length + ' · land ' + (tot ? Math.round(dn / tot * 100) : 0) + '%';
    else $('#ptext').textContent = 'Land explored: ' + (tot ? Math.round(dn / tot * 100) : 0) + '% · ' + dn + ' / ' + tot;
    var nav = $('#nav'), st = nav.scrollTop;
    nav.innerHTML = navHtml();
    nav.scrollTop = st;
  }

  /* ---------- search ---------- */
  var INDEX = [];
  function buildIndex() {
    INDEX = [];
    MODULES.forEach(function (m) {
      INDEX.push({ t: m.num + '. ' + stripTags(m.title), c: 'Module · ' + LEVELS[m.level].name, h: '#' + m.id, s: (m.title + ' ' + stripTags(m.intro)).toLowerCase() });
      m.topics.forEach(function (t, i) {
        INDEX.push({ t: stripTags(t.title), c: 'Topic ' + m.num + '.' + (i + 1) + ' · ' + stripTags(m.title), h: '#' + m.id + '-t' + i, s: (stripTags(t.title) + ' ' + stripTags(asList(t.clues).join(' ')) + ' ' + stripTags(t.analogy)).toLowerCase() });
        topicProblems(t).forEach(function (p, j) { INDEX.push({ t: stripTags(p.title), c: 'Guided ' + p.level + ' · ' + stripTags(t.title), h: '#' + m.id + '-t' + i + '-q' + j, s: (stripTags(p.title) + ' ' + asList(p.tags).join(' ')).toLowerCase() }); });
      });
      (m.practice || []).forEach(function (p, k) { INDEX.push({ t: stripTags(p.title), c: 'Practice ' + p.level + ' · ' + stripTags(m.title), h: '#' + m.id + '-p' + k, s: (stripTags(p.title) + ' ' + asList(p.tags).join(' ')).toLowerCase() }); });
      (m.interview || []).forEach(function (q) { INDEX.push({ t: stripTags(q.q), c: 'Interview Q · ' + stripTags(m.title), h: '#' + m.id + '-iv', s: stripTags(q.q).toLowerCase() }); });
    });
  }
  /* Screens the home search can jump to (the "/" shortcut already focuses the box). */
  var SCREENS = [['Home', 'index.html', 'World map'], ['Today', 'today.html', 'Your plan for today'], ['Plan', 'plan.html', 'Hours, interview date, forecast'], ['Passport', 'passport.html', 'Stamps and settings'], ['Your route', 'route.html', 'Stages and schedule'], ['Watchtower', 'videos.html', 'Video library']];
  function screenHits(q, words) {
    if (!HOME) return '';
    return SCREENS.filter(function (sc) { var t = sc[0].toLowerCase(); return words.every(function (w) { return t.indexOf(w) >= 0 || sc[2].toLowerCase().indexOf(w) >= 0; }); })
      .map(function (sc) { return '<a class="res screen" href="' + sc[1] + '">' + esc(sc[0]) + '<small>Screen · ' + esc(sc[2]) + '</small></a>'; }).join('');
  }
  function searchInto(q, index, res, nav) {
    lastSearch = [q, index, res, nav];
    q = q.trim().toLowerCase();
    if (!q) { res.hidden = true; if (nav) nav.hidden = false; return; }
    if (PM()) { searchPath(q, index, res, nav); return; }
    var words = q.split(/\s+/);
    var hits = index.map(function (it) {
      var tl = it.t.toLowerCase(), sc = 0;
      for (var i = 0; i < words.length; i++) {
        if (tl.indexOf(words[i]) >= 0) sc += 3; else if ((it.s || '').indexOf(words[i]) >= 0) sc += 1; else return null;
      }
      return { it: it, sc: sc };
    }).filter(Boolean).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 80);
    var re = new RegExp('(' + words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
    var scr = screenHits(q, words);
    res.innerHTML = scr + (hits.length ? hits.map(function (x) {
      return '<a class="res" href="' + x.it.h + '">' + esc(x.it.t).replace(re, '<mark>$1</mark>') + '<small>' + esc(x.it.c) + '</small></a>';
    }).join('') : (scr ? '' : '<div class="empty" style="padding:10px">No matches yet.</div>'));
    res.hidden = false; if (nav) nav.hidden = true;
  }

  /* My path search: on-path hits rank first and are labelled; "My path only" filters, with a reveal for the rest. */
  function searchPath(q, index, res, nav) {
    var words = q.split(/\s+/), on = {};
    var hits = index.map(function (it) {
      var tl = it.t.toLowerCase(), sc = 0;
      for (var i = 0; i < words.length; i++) {
        if (tl.indexOf(words[i]) >= 0) sc += 3; else if ((it.s || '').indexOf(words[i]) >= 0) sc += 1; else return null;
      }
      var mid = midOf(it.h), o = mid ? Learn.onPath(mid) : false;
      return { it: it, sc: sc + (o ? 2 : 0), on: o };
    }).filter(Boolean).sort(function (a, b) { return b.sc - a.sc; });
    var nOn = hits.filter(function (x) { return x.on; }).length, shown = (searchOnly ? hits.filter(function (x) { return x.on; }) : hits).slice(0, 80), more = hits.length - nOn;
    var re = new RegExp('(' + words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
    var h = '<div class="sfilter"><button type="button" class="schip" data-pathonly aria-pressed="' + searchOnly + '">My path only</button><span class="muted">' + nOn + ' on your path' + (more ? ' · ' + more + ' elsewhere' : '') + '</span></div>';
    h += screenHits(q, words);
    h += shown.length ? shown.map(function (x) {
      return '<a class="res' + (x.on ? '' : ' off') + '" href="' + x.it.h + '">' + esc(x.it.t).replace(re, '<mark>$1</mark>') + '<small>' + esc(x.it.c) + ' · <span class="' + (x.on ? 'son' : 'soff') + '">' + (x.on ? 'On your path' : 'Other lands') + '</span></small></a>';
    }).join('') : '<div class="empty" style="padding:10px">' + (more && searchOnly ? 'Nothing on your path matches.' : 'No matches yet.') + '</div>';
    if (searchOnly && more) h += '<button type="button" class="btn sm sall" data-searchall>Search everything (' + more + ' more result' + (more === 1 ? '' : 's') + ')</button>';
    res.innerHTML = h;
    res.hidden = false; if (nav) nav.hidden = true;
    res.onclick = function (e) {
      var b = e.target.closest && e.target.closest('[data-pathonly],[data-searchall]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      searchOnly = b.hasAttribute('data-searchall') ? false : !searchOnly;
      searchInto.apply(null, lastSearch);
      var f = $('[data-pathonly]', res); if (f) f.focus();
    };
  }

  /* ---------- routing ---------- */
  function route() {
    var hs = decodeURIComponent(location.hash.slice(1)), main = $('#main');
    if (!hs) {
      current = null; vizRegistry = []; SNIPS = []; main.innerHTML = trackDashHtml(); updateProgress(); window.scrollTo(0, 0); return;
    }
    var mid = hs.split('-')[0], m = loaded(mid);
    if (!m) { location.hash = ''; return; }
    if (m.src) { fetchModule(m); return; }
    var tix = 0, tm = /-t(\d+)/.exec(hs);
    if (tm) tix = +tm[1];
    store.set('imastery.last', { track: TRACK.id, trackTitle: TRACK.title, id: m.id, num: m.num, title: stripTags(m.title), topic: tix, topics: m.topics.length, topicTitle: stripTags((m.topics[tix] || {}).title), hash: hs });
    if (window.Auth) Auth.changed('last');
    if (current !== m) {
      current = m;
      main.innerHTML = moduleHtml(m);
      $$('.viz', main).forEach(function (el) { try { mountViz(el); } catch (e) { $('.narr-text', el).textContent = 'Visualizer error: ' + e.message; } });
      watchEnds(main);
      updateProgress();
      if (hs === mid) window.scrollTo(0, 0);
    }
    if (hs !== mid) {
      var hid = document.getElementById(hs), sec = hid && hid.closest && hid.closest('section.topic[hidden]');
      if (sec) revealLang(mid, false);
      var el = document.getElementById(hs);
      if (el) { el.scrollIntoView({ block: 'start' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    }
    closeMenu();
  }
  function closeMenu() {
    if (!$('#sidebar')) return;
    $('#sidebar').classList.remove('open');
    var mb = $('#menuBtn');
    if (mb) mb.setAttribute('aria-expanded', 'false');
  }

  /* ---------- common chrome ---------- */
  function chrome() {
    var tb = $('#themeBtn');
    function apply(t) {
      document.documentElement.setAttribute('data-theme', t);
      tb.innerHTML = t === 'dark' ? ICONS.sun : ICONS.moon;
      tb.setAttribute('aria-label', t === 'dark' ? 'Switch to daylight map' : 'Switch to night map'); tb.title = tb.getAttribute('aria-label');
      var mc = $('meta[name="theme-color"]'); if (mc) mc.setAttribute('content', t === 'light' ? '#F6F1E4' : '#12263A');
    }
    function sync() { apply(store.get('imastery.theme', null) === 'light' ? 'light' : 'dark'); }
    sync();
    tb.addEventListener('click', function () {
      var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      store.set('imastery.theme', t);
      apply(t);
    });
    window.addEventListener('pageshow', sync);
    window.addEventListener('storage', function (e) { if (e.key === 'imastery.theme') sync(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) sync(); });
    startAuth();
    if (window.Journey) Journey.bar();
    var mb = $('#menuBtn');
    if (mb) mb.addEventListener('click', function () { var o = $('#sidebar').classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o) { var s = $('#search') || $('#gsearch'); if (s) s.focus(); } });
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (e.key === 'Escape' && $('#sidebar') && $('#sidebar').classList.contains('open')) { closeMenu(); if (mb) mb.focus(); return; }
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        var s = $('#search') || $('#gsearch');
        if (s) { e.preventDefault(); if (mb && $('#sidebar') && getComputedStyle(mb).display !== 'none') { $('#sidebar').classList.add('open'); mb.setAttribute('aria-expanded', 'true'); } s.focus(); }
      }
    });
    document.addEventListener('change', function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute('data-langpick')) {
        // "Show every language" for a learner whose route already names a language is stored as 'all' (see viewLang)
        store.set('imastery.lang', e.target.value || (window.Learn && window.PATHS && Learn.pref().chosen ? 'all' : null));
        if (window.Auth) Auth.changed();
        if (TRACK && current) { var keep = location.hash; current = null; route(); if (location.hash !== keep) location.hash = keep; setTimeout(function () { var sel = $('[data-langpick]'), fb = sel && sel.nextSibling && sel.nextSibling.querySelector ? sel.nextSibling.querySelector('.jdd-btn') : null; if (fb || sel) (fb || sel).focus(); }, 0); }
        return;
      }
      var id = e.target.getAttribute && e.target.getAttribute('data-done');
      if (!id) return;
      if (e.target.checked) { setBox(e.target, false); return; }
      markDone(id, false);
      var sec = document.getElementById(id);
      if (sec) resetSection(sec);
    });
    document.addEventListener('toggle', function (e) {
      var d = e.target;
      if (!d || d.tagName !== 'DETAILS' || !d.open || !d.parentNode) return;
      d._seen = true; progress(d);
      var before = d.getBoundingClientRect().top;
      Array.prototype.forEach.call(d.parentNode.children, function (s) { if (s !== d && s.tagName === 'DETAILS' && s.open) s.open = false; });
      var shift = d.getBoundingClientRect().top - before;
      if (shift) window.scrollBy(0, shift);
    }, true);
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.closest) return;
      if (t.classList.contains('copy')) {
        var pre = t.closest('.cpane'), ta = $('textarea', pre), txt = ta ? ta.value : $('pre', pre).textContent;
        var done = function () { t.textContent = 'Copied!'; setTimeout(function () { t.textContent = 'Copy'; }, 1200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
        else { var x = document.createElement('textarea'); x.value = txt; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); } catch (er) { } x.remove(); done(); }
      } else if (t.classList.contains('run')) runSnippet(t);
      else if (t.classList.contains('edit')) {
        var pane = t.closest('.cpane'), pr = $('pre', pane), s = SNIPS[+$('.run', pane).getAttribute('data-snip')];
        if (!$('textarea', pane)) {
          var ta2 = document.createElement('textarea'); ta2.className = 'code-edit'; ta2.value = s.code; ta2.spellcheck = false;
          ta2.rows = Math.min(30, s.code.split('\n').length + 2);
          pr.hidden = true; pr.parentNode.insertBefore(ta2, pr.nextSibling); t.textContent = 'Reset';
        } else { $('textarea', pane).remove(); pr.hidden = false; t.textContent = 'Edit'; }
      } else if (t.closest('[data-more]')) toggleOthers();
      else if (t.classList.contains('ctab')) showTab(t);
      else if (t.closest('.vid-play')) {
        var vb = t.closest('.vid-play'), vidId = vb.getAttribute('data-vid');
        if (!/^[A-Za-z0-9_-]{11}$/.test(vidId)) return;
        var fr = document.createElement('div'); fr.className = 'vid-frame';
        fr.innerHTML = '<iframe src="' + LessonVideo.embedUrl(LessonVideo.fromButton(vb)) + '" title="' + esc(vb.querySelector('b').textContent) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
        vb.replaceWith(fr);
      } else if (t.closest('[data-langshow]')) {
        revealLang(t.closest('[data-langshow]').getAttribute('data-langshow'), true);
      } else if (t.closest('[data-testout]')) {
        var tm = t.closest('[data-testout]').getAttribute('data-testout');
        Learn.readiness(tm, routeLang(), function () { var el2 = document.getElementById('prq-' + tm), mm2 = loaded(tm); if (el2 && mm2) el2.innerHTML = prereqHtml(mm2); });
      } else if (t.closest('[data-checkpoint]')) {
        var lvk = t.closest('[data-checkpoint]').getAttribute('data-checkpoint'), cpb = t.closest('[data-checkpoint]');
        var startCp = function () { Learn.checkpoint(TRACK.id, lvk, ZN[lvk], zoneQuestions(lvk), function () { DONE = store.get('imastery.done', {}) || {}; if (!current) { $('#main').innerHTML = trackDashHtml(); } updateProgress(); }); };
        if (window.IM_QUIZ || !window.IM_QUIZSRC) startCp();
        else {
          var qs = document.createElement('script'), was = cpb.textContent;
          cpb.disabled = true; cpb.textContent = 'Loading…';
          qs.src = window.IM_QUIZSRC;
          qs.onload = function () { cpb.disabled = false; cpb.textContent = was; startCp(); };
          qs.onerror = function () { cpb.disabled = false; cpb.textContent = 'Could not load. Try again'; if (qs.parentNode) qs.parentNode.removeChild(qs); };
          document.body.appendChild(qs);
        }
      } else if (t.closest('.opt')) {
        var b = t.closest('.opt'), mb2 = b.closest('.mcq'), ans = +mb2.getAttribute('data-ans'), pick = +b.getAttribute('data-opt');
        if (!mb2._tried) { mb2._tried = true; mb2._first = pick === ans; }
        if (pick !== ans && window.Learn && TRACK) { var sec = mb2.closest('section[id]'); if (sec) Learn.remember(sec.id, current ? current.id : sec.id.split('-')[0], (current ? stripTags(current.title) : '') + (/-quiz$/.test(sec.id) ? ' · riddle gate' : '')); }
        $$('.opt', mb2).forEach(function (o) { o.classList.remove('right', 'wrong'); });
        b.classList.add(pick === ans ? 'right' : 'wrong');
        if (pick === ans) { mb2._ok = true; progress(mb2); }
        var fb = $('.mcq-fb', mb2);
        fb.hidden = false;
        fb.innerHTML = pick === ans ? '<b class="c-g">✔ Correct!</b> ' + $('template', mb2).innerHTML : '<b class="c-r">✘ Not quite — think again and try another option.</b>';
      } else if (t.id === 'resetProgress') {
        if (confirm('Reset ALL progress checkboxes across every track?' + (window.Auth && Auth.user() ? ' This also clears the copy saved to your account.' : ''))) {
          DONE = {}; store.set('imastery.done', DONE);
          (window.Auth ? Auth.reset() : Promise.resolve()).then(function () { location.reload(); });
        }
      }
    });
  }

  /* ---------- automatic checkmarks: earned by finishing a section, never ticked by hand ---------- */
  function markDone(id, on) {
    if (on) DONE[id] = 1; else delete DONE[id];
    if (on && window.Learn && current) { Learn.passed(id); if (/-quiz$/.test(id)) Learn.schedule(id, current.id, stripTags(current.title) + ' · riddle gate'); }
    store.set('imastery.done', DONE);
    if (window.Auth) Auth.changed();
    /* The planner reads the riddle gate as a quiz score: the share of riddles answered right at the first try. */
    if (on && window.Planner) {
      if (/-quiz$/.test(id)) {
        var gate = document.getElementById(id), qs = gate ? $$('.mcq', gate) : [];
        if (qs.length) Planner.recordScore(id.replace(/-quiz$/, ''), qs.filter(function (q) { return q._first; }).length / qs.length * 100);
      }
      Planner.touch();
      DONE = store.get('imastery.done', {}) || {};
    }
    $$('[data-done="' + id + '"]').forEach(function (cb) { setBox(cb, on); if (on) { cb.parentNode.classList.remove('pop'); void cb.parentNode.offsetWidth; cb.parentNode.classList.add('pop'); } });
    $$('a[href="#' + id + '"]').forEach(function (a) { a.classList.toggle('ok', on); });
    if (TRACK) updateProgress();
  }
  function earned(el) {
    var right = $$('.mcq', el).every(function (q) { return q._ok; });
    if (el.classList.contains('problem')) return right && !!($('details.sol', el) || {})._seen;
    if (el.classList.contains('topic')) return right && !!el._end;
    if (/-quiz$/.test(el.id)) return right;
    if (/-iv$/.test(el.id)) { var d = $$('details.iv', el); return d.length > 0 && d.every(function (x) { return x._seen; }); }
    return false;
  }
  function progress(node) {
    [node.closest('article.problem'), node.closest('section')].forEach(function (el) {
      if (!el || !el.id || DONE[el.id] || !$('[data-done="' + el.id + '"]', el)) return;
      if (earned(el)) markDone(el.id, true);
    });
  }
  function resetSection(el) {
    el._end = false;
    $$('.mcq', el).forEach(function (q) { q._ok = false; q._tried = false; q._first = false; $$('.opt', q).forEach(function (o) { o.classList.remove('right', 'wrong'); }); $('.mcq-fb', q).hidden = true; });
    $$('details', el).forEach(function (d) { d._seen = false; });
    $$('details.sol, details.iv', el).forEach(function (d) { d.open = false; });
  }
  var endObs = null;
  function watchEnds(root) {
    var ends = $$('.topic-end', root);
    if (!('IntersectionObserver' in window)) { ends.forEach(function (s) { s.parentNode._end = true; }); return; }
    if (endObs) endObs.disconnect();
    endObs = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.parentNode._end = true; progress(en.target); } }); });
    ends.forEach(function (s) { endObs.observe(s); });
  }

  /* ---------- lazy module files ---------- */
  var pending = {};
  function placeOf(pm, m) { m.num = pm.num; m.level = pm.level; if (!m.title) m.title = pm.title; }
  function loadedModule(m) {
    if (!TRACK) return false;
    for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === m.id && MODULES[i].src) {
      var pm = TRACK.modules.filter(function (x) { return x.id === m.id; })[0];
      placeOf(pm, m); MODULES[i] = m; buildIndex();
      return true;
    }
    return false;
  }
  function fetchModule(m) {
    var main = $('#main');
    if (current !== m) {
      current = null;
      main.innerHTML = '<div class="crumb"><a href="index.html">World map</a><span>›</span><a href="#">' + esc(TRACK.title) + '</a><span>›</span><span>Place ' + m.num + '</span></div><h1>' + m.title + '</h1><div class="skel" aria-hidden="true"><i class="sk-h"></i><i class="sk-l"></i><i class="sk-l"></i><i class="sk-l s"></i><i class="sk-card"></i><i class="sk-l"></i><i class="sk-l s"></i></div><p class="sr-only" role="status">Loading lesson…</p>';
      main.setAttribute('aria-busy', 'true');
    }
    if (pending[m.id]) return;
    var s = document.createElement('script');
    pending[m.id] = s;
    s.src = m.src;
    s.onload = function () {
      delete pending[m.id];
      main.removeAttribute('aria-busy');
      if (loaded(m.id) === m) { s.onerror(); return; }
      if (decodeURIComponent(location.hash.slice(1)).split('-')[0] === m.id) route();
      else updateProgress();
    };
    s.onerror = function () {
      delete pending[m.id];
      main.removeAttribute('aria-busy');
      if (s.parentNode) s.parentNode.removeChild(s);
      if (decodeURIComponent(location.hash.slice(1)).split('-')[0] !== m.id) return;
      main.innerHTML = '<div class="crumb"><a href="index.html">World map</a><span>›</span><a href="#">' + esc(TRACK.title) + '</a></div><h1>' + m.title + '</h1><p role="alert">This place could not be loaded. Check your connection, then try again.</p><button class="btn primary" type="button" id="modRetry">Retry</button>';
      $('#modRetry').addEventListener('click', route);
    };
    document.body.appendChild(s);
  }

  function track(id) {
    TRACK = TRACKS.filter(function (t) { return t.id === id; })[0];
    var order = {};
    TRACK.modules.forEach(function (pm, i) { order[pm.id] = i; });
    if (window.IM_MINDEX) MODULES = MODULES.concat(window.IM_MINDEX.filter(function (x) { return !MODULES.some(function (m) { return m.id === x.id; }); }));
    MODULES = MODULES.filter(function (m) { return order[m.id] !== undefined; });
    MODULES.forEach(function (m) { placeOf(TRACK.modules[order[m.id]], m); });
    MODULES.sort(function (a, b) { return order[a.id] - order[b.id]; });
    document.title = TRACK.title + ' — Interview Mastery';
    var ln = $('#landName'); if (ln) { var R = region(TRACK.id); ln.textContent = R.name + ' · ' + TRACK.modules.length + ' places'; }
    chrome();
    mountPathbar();
    buildIndex();
    var tmr;
    $('#search').addEventListener('input', function () { var v = this.value; clearTimeout(tmr); tmr = setTimeout(function () { searchInto(v, INDEX, $('#results'), $('#nav')); }, 120); });
    $('#results').addEventListener('click', function (e) {
      var a = e.target.closest('.res');
      if (a && location.hash === a.getAttribute('href')) { e.preventDefault(); route(); }
    });
    window.addEventListener('hashchange', route);
    route();
  }

  /* ---------- home ---------- */
  var HOME = false;
  function home() {
    HOME = true;
    chrome();
    var SI = window.SEARCH_INDEX || { modules: {}, entries: [] }, tmr;
    $('#gsearch').addEventListener('input', function () { var v = this.value; clearTimeout(tmr); tmr = setTimeout(function () { searchInto(v, SI.entries || [], $('#gresults'), null); }, 120); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.jsearch')) $('#gresults').hidden = true; });
    $('#main').addEventListener('click', function (e) {
      var b = e.target.closest('[data-route]');
      if (b && window.Learn) { Learn.setPref({ id: b.getAttribute('data-route') }); renderHome(); var d = $('#dest [data-route="' + b.getAttribute('data-route') + '"]'); if (d) d.focus(); }
      var j = e.target.closest('[data-jump]');
      if (j) { var gs = $('#gsearch'); if (gs) { gs.focus(); gs.select(); } }
    });
    renderHome();
    mountPathbar();
    window.addEventListener('im:plan', function () { if (PM()) renderHome(); });
    if (window.Learn && window.PATHS) {
      var p0 = Learn.pref(), fresh = !p0.chosen && !p0.onboarded && !Object.keys(DONE).length && Learn.mode() === 'all' && !/[?&]view=all\b/.test(location.search);
      if (fresh || location.hash === '#pick') openOnboarding(fresh, null);
    }
  }
  function routeCardHtml() {
    if (!window.Learn || !window.PATHS) return '';
    var v = Learn.routeView(), p = v.pref, R = v.sch.plan.route, due = Learn.due();
    return '<div class="jcard dest" id="dest"><div class="droles" role="radiogroup" aria-label="Choose a route">' + PATHS.ROUTES.map(function (r) { return '<button type="button" role="radio" class="drole" data-route="' + r.id + '" aria-checked="' + (r.id === p.id) + '">' + esc(r.name) + '</button>'; }).join('') + '</div>' +
      Journey.icon('flag', 'dflag') + '<b class="dname">' + esc(R.name) + '</b><span class="dtx">' + esc(Learn.LANG_NAMES[p.lang]) + ' · ' + p.hours + ' h/week · ' + v.pctHours + '% done · ' + v.mastered + ' of ' + v.core + ' modules mastered · about ' + v.weeksLeft + ' weeks left</span>' +
      '<div class="jbar-p c-violet"><i style="width:' + v.pctHours + '%"></i></div>' +
      (v.next.length ? '<ol class="dnext">' + v.next.map(function (n) { return '<li><a href="' + Learn.href(n.id) + '"><b>' + esc(n.meta.title) + '</b><span>' + esc(n.why) + '</span></a></li>'; }).join('') + '</ol>' : '') +
      (due.length ? '<a class="ddue" href="route.html#rpNextH">' + due.length + ' review' + (due.length === 1 ? '' : 's') + ' due today ›</a>' : '') +
      '<a class="btn line-v" href="route.html">Open your route plan ›</a></div>';
  }
  function renderHome() {
    var J = window.Journey, S = J.stats(DONE), last = store.get('imastery.last', null), M = window.IM_MODS || {};
    var lands = TRACKS.length, R0 = last && last.track ? J.regionOf(last.track) : J.REGIONS[0];
    var trackBy = {}; TRACKS.forEach(function (t) { trackBy[t.id] = t; });
    var PMODE = PM(), RV = PMODE ? Learn.routeView() : null, ON = {};
    if (PMODE) Learn.pathTracks().forEach(function (t) { ON[t.track] = 1; });
    var nextMod = PMODE ? RV.next.filter(function (n) { return n.kind !== 'project' && n.meta; })[0] : null;
    var h = '';
    if (PMODE && window.Planner) h = planHeroHtml(J, S, R0, trackBy, last) + planHomeHtml(trackBy);
    else {
    h = '<section class="whero"><div class="wh-l"><span class="kicker">' + (PMODE ? RV.pctHours + '% of your path <small class="kick-all">· ' + J.pct(S.done, S.items) + '% of the world</small>' : S.done ? J.pct(S.done, S.items) + '% of the world explored' : 'A new traveller arrives') + '</span>' +
      '<h1>' + (S.done ? 'Welcome back, traveller' : 'Your journey starts on Foundation Isle') + '</h1>' +
      '<p>' + lands + ' lands, ' + S.planned + ' places, ' + S.landmarks.toLocaleString('en-US') + ' landmarks. Every lesson is a stop on the map; finish it and the path lights up.</p>';
    h += '</div>' + J.atlasHtml(S, R0, trackBy, last) + '</section>';
    if (PMODE) h += pathHomeHtml(trackBy);
    }

    var mid = last && last.id && M[last.id] ? last.id : 'dsa01', tid = last && last.id && M[last.id] ? last.track : 'dsa', c = M[mid], steps = [];
    var tix = last && last.id === mid ? last.topic || 0 : 0, num = last && last.id === mid ? last.num : 1;
    if (c) {
      steps.push({ id: mid + '-t' + tix, t: 'Finish the landmark: ' + (last && last.id === mid ? last.topicTitle : 'your first topic'), h: tid + '.html#' + mid + '-t' + tix });
      if (c[3]) steps.push({ id: mid + '-quiz', t: 'Pass the riddle gate of place ' + num, h: tid + '.html#' + mid + '-quiz' });
      var k = 0; while (k < c[2] && DONE[mid + '-p' + k]) k++;
      if (c[2]) steps.push({ id: mid + '-p' + Math.min(k, c[2] - 1), t: k < c[2] ? 'Dig up a treasure: practice problem ' + (k + 1) : 'Every treasure of this place is found', h: tid + '.html#' + mid + '-p' + Math.min(k, c[2] - 1) });
    }
    var nx = -1;
    steps.forEach(function (x, i) { if (nx < 0 && !DONE[x.id]) nx = i; });
    var list = J.stampsOf(S), got = list.filter(function (x) { return x.on; });
    h += '<section class="wrow"><div class="jcard"><h2>Today’s expedition</h2><div class="exped">' + steps.map(function (x, i) {
      var st = DONE[x.id] ? 'done' : i === nx ? 'next' : 'ahead';
      return '<a class="estep ' + st + '" href="' + esc(x.h) + '"><span class="en">' + (st === 'done' ? '✓' : i + 1) + '</span><span class="et">' + esc(x.t) + '</span><span class="es">' + st + '</span></a>';
    }).join('') + '</div></div>';
    h += '<div class="jcard"><h2>Journey log</h2><div class="jlog"><div><b>' + S.places + '</b><span>places cleared</span></div><div><b>' + S.topics.toLocaleString('en-US') + '</b><span>landmarks</span></div><div><b>' + S.problems.toLocaleString('en-US') + '</b><span>treasures found</span></div></div>' +
      '<a class="jstamps" href="passport.html"><span class="mini">' + (got.length ? got.slice(-4) : list.slice(0, 3)).map(function (x) { return J.stampSvg(x.st, x.on); }).join('') + '</span><span>' + (got.length ? got.length + ' of ' + list.length + ' stamps · open passport ›' : 'Your first stamp lands after one landmark · passport ›') + '</span></a></div>';
    h += (PMODE ? '' : routeCardHtml()) + '</section>';

    var regOn = function (r) { return !PMODE || r.tracks.some(function (t) { return ON[t]; }); }, offRegions = J.REGIONS.filter(function (r) { return !regOn(r); });
    var regionHtml = function (r) {
        return '<div class="jcard region" id="r-' + r.key + '"><span class="kicker c-' + r.color + '">' + J.icon(r.icon) + esc(r.area) + '</span><b class="rname">' + esc(r.name) + '</b>' + r.tracks.filter(function (t) { return trackBy[t]; }).map(function (t) {
          var g = S.track[t] || { items: 0, done: 0 }, p = J.pct(g.done, g.items);
          return '<a class="rland' + (PMODE && !ON[t] ? ' off' : '') + '" href="' + t + '.html"><span>' + esc(trackBy[t].title) + (PMODE && ON[t] ? ' <small class="reltag rel-core">On your path</small>' : '') + '</span><span class="jbar-p c-' + r.color + '"><i style="width:' + (p ? Math.max(3, p) : 0) + '%"></i></span><span class="mono">' + p + '%</span></a>';
        }).join('') + '</div>';
    };
    h += '<section class="world" aria-labelledby="worldH"><div class="jrow"><h2 id="worldH">The world</h2><span class="muted">' + J.REGIONS.length + ' regions · ' + lands + ' lands</span></div><div class="wgrid">' +
      J.REGIONS.filter(regOn).map(regionHtml).join('') +
      (function () { var extra = TRACKS.filter(function (t) { return J.regionOf(t.id).key === 'new'; }); return extra.length ? '<div class="jcard region" id="r-new"><span class="kicker c-sky">' + J.icon('compass') + 'New lands</span><b class="rname">Uncharted</b>' + extra.map(function (t) { var g = S.track[t.id] || { items: 0, done: 0 }, p = J.pct(g.done, g.items); return '<a class="rland" href="' + t.id + '.html"><span>' + esc(t.title) + '</span><span class="jbar-p c-sky"><i style="width:' + p + '%"></i></span><span class="mono">' + p + '%</span></a>'; }).join('') + '</div>' : '<div class="uncharted">Uncharted · new lands appear here as topics are added</div>'; })() +
      '</div>' + (offRegions.length ? '<details class="otherlands"><summary>Other lands (' + offRegions.length + ') · Show all lands</summary><div class="wgrid">' + offRegions.map(regionHtml).join('') + '</div></details>' : '') + '</section>';

    var RP = window.Learn ? Learn.pref() : { id: 'sde', hours: 10 };
    h += '<section id="paths" class="jcard"><div class="jrow"><h2>Learning routes</h2><a href="route.html">Plan yours in detail ›</a></div><div class="ptabs" role="tablist" aria-label="Choose a learning route">' +
      (window.PATHS ? PATHS.ROUTES : []).map(function (r, i) { return '<button type="button" class="ptab" role="tab" id="ptab' + i + '" aria-controls="proute" aria-selected="' + (r.id === RP.id) + '" data-path="' + i + '">' + esc(r.name) + '</button>'; }).join('') +
      '</div><div id="proute" role="tabpanel"></div></section>';
    h += '<footer class="jfoot">' + (window.IM_VERSION ? '<span>Interview Mastery v' + esc(window.IM_VERSION) + '</span>' : '') + '<a href="privacy.html">Privacy policy</a><a href="https://github.com/SHRENIKYD/DSA-LEARNINGS">Source on GitHub</a><button class="btn ghost" type="button" id="resetProgress">Reset all progress</button></footer>';
    $('#main').innerHTML = h;
    J.mountAtlas(S, trackBy, last);
    var offCss = $('#imOffLands');
    if (!offCss) { offCss = document.createElement('style'); offCss.id = 'imOffLands'; document.head.appendChild(offCss); }
    offCss.textContent = offRegions.map(function (r) { return '.atlas-island[data-island="' + r.key + '"]'; }).join(',') + (offRegions.length ? '{opacity:.42;filter:saturate(.4)}' : '');

    var pickPath = function (i) {
      if (!window.PATHS || !window.Learn) return;
      var r = PATHS.ROUTES[i], pr = Learn.pref(), lang = r.langs.indexOf(pr.lang) >= 0 ? pr.lang : r.langs[0];
      var hours = {}; Object.keys(window.IM_PATHMETA || {}).forEach(function (k) { hours[k] = window.IM_PATHMETA[k][3]; });
      var sc = PATHS.schedule(r.id, lang, hours);
      $$('.ptab').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-path') === String(i) ? 'true' : 'false'); });
      $('#proute').setAttribute('aria-labelledby', 'ptab' + i);
      $('#proute').innerHTML = '<p class="muted">' + esc(r.blurb) + '</p><ol class="route">' + r.stages.map(function (st) { return '<li><span>' + esc(st.name) + '</span></li>'; }).join('') + '</ol>' +
        '<p class="pr-time"><b>' + sc.total + ' hours</b> including ' + sc.projects + ' h of projects and ' + sc.revision + ' h of revision: ' + [5, 10, 20, 40].map(function (w) { return '<span' + (w === pr.hours ? ' class="on"' : '') + '>' + sc.weeks[w] + ' weeks at ' + w + ' h/week</span>'; }).join(' · ') + '.</p>' +
        '<button class="btn" type="button" data-route="' + r.id + '">Make this my route</button>';
    };
    $('.ptabs').addEventListener('click', function (e) { var b = e.target.closest('.ptab'); if (b) pickPath(+b.getAttribute('data-path')); });
    pickPath(Math.max(0, (window.PATHS ? PATHS.ROUTES : []).map(function (r) { return r.id; }).indexOf(RP.id)));
  }

  /* ---------- personalized navigation: My path / Explore all (Learn.pref, Learn.relevance) ----------
     Explore all renders every view exactly as before; My path only adds ordering, labels, dimming and reveals.
     Nothing is ever locked: every link opens the full module. */
  function PM() { return !!(window.Learn && window.PATHS && Learn.mode && Learn.mode() === 'path'); }
  function routeOf(id) { return (window.PATHS ? PATHS.ROUTES : []).filter(function (r) { return r.id === id; })[0] || null; }
  function midOf(h) { var x = /#([a-z]+\d+)/.exec(h || ''); return x ? x[1] : null; }
  var REL_LABEL = { core: 'Required', rec: 'Recommended', opt: 'Optional', ext: 'Go deeper', off: 'Not on your path' };
  function relTag(mid) { var r = Learn.relevance(mid); return r.state === 'rec' || r.state === 'opt' || r.state === 'ext' ? '<span class="reltag rel-' + r.state + '">' + REL_LABEL[r.state] + '</span>' : ''; }
  function trackPath() {
    if (!TRACK || !PM()) return null;
    var pt = Learn.pathTracks().filter(function (x) { return x.track === TRACK.id; })[0];
    return pt ? pt.mods.slice() : [];
  }
  function pathbarHtml() {
    var p = Learn.pref(), R = routeOf(p.id), flag = window.Journey ? Journey.icon('flag', 'pb-ic') : '';
    if (!p.chosen) {
      var hide = store.get('imastery.pathBanner', null) === 'hidden';
      return '<div class="pb-in' + (hide ? '' : ' ban') + '">' + (hide ? '' : '<p class="pb-ban"><b>Pick a path</b> and we put the lands and lessons for your goal first. Nothing is locked.</p>') +
        '<button type="button" class="btn pb-chip" data-onb aria-haspopup="dialog">' + flag + 'Pick a path</button>' +
        (hide ? '' : '<button type="button" class="btn ghost pb-x" data-pbx aria-label="Dismiss the pick a path banner">×</button>') + '</div>';
    }
    var m = Learn.mode();
    return '<div class="pb-in"><button type="button" class="btn pb-chip" data-onb aria-haspopup="dialog" aria-label="My path: ' + esc(R.name + ', ' + Learn.LANG_NAMES[p.lang] + ', ' + p.hours + ' hours a week') + '. Change path">' + flag +
      '<span class="pb-k">My path:</span> <b>' + esc(R.name) + '</b><span class="pb-d"> · ' + esc(Learn.LANG_NAMES[p.lang]) + ' · ' + p.hours + ' h/wk</span></button>' +
      '<div class="pb-mode" role="group" aria-label="What to show"><button type="button" data-mode="path" aria-pressed="' + (m === 'path') + '">My path</button><button type="button" data-mode="all" aria-pressed="' + (m === 'all') + '">Explore all</button></div></div>';
  }
  function drawPathbar() {
    var pb = $('#pathbar');
    if (!pb || !window.Learn || !window.PATHS) return;
    var a = document.activeElement, keep = a && pb.contains(a) ? (a.hasAttribute('data-mode') ? '[data-mode="' + a.getAttribute('data-mode') + '"]' : a.hasAttribute('data-onb') ? '[data-onb]' : null) : null;
    pb.innerHTML = pathbarHtml();
    if (keep && $(keep, pb)) $(keep, pb).focus();
  }
  function mountPathbar() {
    if (!window.Learn || !window.PATHS || $('#pathbar')) return;
    var pb = document.createElement('div');
    pb.id = 'pathbar';
    if (HOME || PAGE) { pb.className = 'pathbar'; $('#main').parentNode.insertBefore(pb, $('#main')); }
    else { var st = $('.side-top'); if (!st) return; pb.className = 'pathbar side'; st.insertBefore(pb, $('.pwrap', st)); }
    drawPathbar();
    pb.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t) return;
      if (t.hasAttribute('data-onb')) openOnboarding(false, t);
      else if (t.hasAttribute('data-pbx')) { store.set('imastery.pathBanner', 'hidden'); drawPathbar(); var c = $('[data-onb]', pb); if (c) c.focus(); }
      else if (t.hasAttribute('data-mode') && t.getAttribute('aria-pressed') !== 'true') Learn.setMode(t.getAttribute('data-mode'));
    });
    window.addEventListener('im:pref', prefChanged);
  }
  function prefChanged() {
    drawPathbar();
    if (HOME) { renderHome(); return; }
    if (PAGE) { PAGE(); return; }
    if (!TRACK) return;
    if (current) { var keep = location.hash, y = window.scrollY; current = null; route(); if (location.hash !== keep) location.hash = keep; window.scrollTo(0, y); }
    else { $('#main').innerHTML = trackDashHtml(); updateProgress(); }
    if (lastSearch) searchInto.apply(null, lastSearch);
  }

  /* Onboarding: goal, language (skipped for one-language routes), weekly hours. Also the "change path" sheet. */
  function openOnboarding(first, opener) {
    if (!window.Learn || !window.PATHS) return;
    var p = Learn.pref(), prev = store.get('imastery.route', null);
    var st = { step: 0, id: p.chosen ? p.id : null, lang: p.lang, hours: p.hours, known: p.known.indexOf(p.lang) >= 0 };
    var d = $('#onb');
    if (!d) { d = document.createElement('dialog'); d.id = 'onb'; d.className = 'onb'; d.setAttribute('aria-labelledby', 'onbH'); document.body.appendChild(d); }
    var hours = {}; Object.keys(window.IM_PATHMETA || {}).forEach(function (k) { hours[k] = window.IM_PATHMETA[k][3]; });
    function steps() { var R = routeOf(st.id); return R && R.langs.length > 1 ? ['goal', 'lang', 'time'] : ['goal', 'time']; }
    function compare() {
      if (!st.id || (p.chosen && st.id === p.id)) return '';
      var D = store.get('imastery.done', {}) || {}, mods = Object.keys(window.IM_PATHMETA || {}).filter(function (k) { return Learn.status(k, D).satisfied; });
      if (!mods.length) return '';
      var pl = PATHS.plan(st.id, st.lang), on = {};
      pl.items.forEach(function (it) { on[it.id] = 1; });
      return '<p class="onb-cmp">Switching keeps all your progress. ' + mods.filter(function (k) { return on[k]; }).length + ' of your ' + mods.length + ' completed modules count on ' + esc(routeOf(st.id).name) + ' too.</p>';
    }
    function draw(focusSel) {
      var S = steps(), k = S[st.step], R = routeOf(st.id), n = '<p class="onb-n">Step ' + (st.step + 1) + ' of ' + S.length + '</p>', body = '';
      if (k === 'goal') {
        body = '<h2 id="onbH">What are you preparing for?</h2>' + n + '<fieldset class="onb-opts"><legend class="sr-only">Your goal</legend>' + PATHS.ROUTES.map(function (r) {
          return '<label class="onb-opt"><input type="radio" name="onbRoute" value="' + r.id + '"' + (st.id === r.id ? ' checked' : '') + '><span><b>' + esc(r.name) + '</b><small>' + esc(r.blurb) + '</small></span></label>';
        }).join('') + '<label class="onb-opt"><input type="radio" name="onbRoute" value=""' + (st.id === '' ? ' checked' : '') + '><span><b>Not sure, show me everything</b><small>Explore all lands freely. You can pick a path later from the My path chip.</small></span></label></fieldset>' + compare();
      } else if (k === 'lang') {
        body = '<h2 id="onbH">Which language will you use?</h2>' + n + '<fieldset class="onb-opts"><legend class="sr-only">Language for ' + esc(R.name) + '</legend>' + R.langs.map(function (l) {
          return '<label class="onb-opt"><input type="radio" name="onbLang" value="' + l + '"' + (st.lang === l ? ' checked' : '') + '><span><b>' + esc(Learn.LANG_NAMES[l]) + '</b></span></label>';
        }).join('') + '</fieldset><label class="onb-known"><input type="checkbox" name="onbKnown"' + (st.known ? ' checked' : '') + '> I already know it (its basics become optional)</label>';
      } else {
        var sc = PATHS.schedule(st.id, st.lang, hours);
        body = '<h2 id="onbH">How much time a week?</h2>' + n + '<fieldset class="onb-opts hrs"><legend class="sr-only">Hours per week</legend>' + [5, 10, 20, 40].map(function (w) {
          return '<label class="onb-opt"><input type="radio" name="onbHours" value="' + w + '"' + (st.hours === w ? ' checked' : '') + '><span><b>' + w + ' h/week</b><small>about ' + sc.weeks[w] + ' weeks</small></span></label>';
        }).join('') + '</fieldset>';
      }
      var last = st.step === S.length - 1 || (k === 'goal' && st.id === '');
      d.innerHTML = '<form method="dialog" class="onb-f">' + body + '<div class="onb-acts">' +
        (st.step ? '<button type="button" class="btn ghost" data-onb-back>Back</button>' : '<button type="button" class="btn ghost" data-onb-skip>' + (first ? 'Just explore' : 'Cancel') + '</button>') +
        '<button type="button" class="btn primary" data-onb-next' + (k === 'goal' && st.id === null ? ' disabled' : '') + '>' + (last ? (st.id === '' ? 'Explore all' : 'Start my path') : 'Next') + '</button></div></form>';
      var f = focusSel && $(focusSel, d) || $('input:checked', d) || $('input', d);
      if (f) f.focus();
    }
    function close() { if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); } }
    function finish() {
      close();
      if (st.id === '') { Learn.setPref({ mode: 'all', onboarded: true }); toast(first ? 'Exploring all lands. Pick a path any time from the chip at the top.' : 'Showing everything. Your path is kept.', null); }
      else {
        var changed = !p.chosen || p.id !== st.id || p.lang !== st.lang;
        Learn.setPref({ id: st.id, lang: st.lang, hours: st.hours, known: st.known ? [st.lang] : [], mode: 'path', onboarded: true });
        toast('Your path: ' + routeOf(st.id).name + '. Switching never deletes progress.', changed && p.chosen ? prev : null);
      }
      var c = $('#pathbar [data-onb]'); if (c) c.focus();
    }
    function skip() { close(); if (first) Learn.setPref({ mode: 'all', onboarded: true }); else if (opener && opener.focus) opener.focus(); }
    d.onchange = function (e) {
      var t = e.target;
      if (t.name === 'onbRoute') { st.id = t.value; var R = routeOf(st.id); if (R && R.langs.indexOf(st.lang) < 0) st.lang = R.langs[0]; draw('input[name="onbRoute"][value="' + t.value + '"]'); }
      else if (t.name === 'onbLang') st.lang = t.value;
      else if (t.name === 'onbKnown') st.known = t.checked;
      else if (t.name === 'onbHours') st.hours = +t.value;
    };
    d.onclick = function (e) {
      var t = e.target.closest && e.target.closest('button');
      if (!t) return;
      if (t.hasAttribute('data-onb-skip')) skip();
      else if (t.hasAttribute('data-onb-back')) { st.step--; draw(); }
      else if (t.hasAttribute('data-onb-next')) { if (st.step === steps().length - 1 || st.id === '') finish(); else { st.step++; draw(); } }
    };
    d.oncancel = function (e) { e.preventDefault(); skip(); };
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
    draw();
  }
  function toast(msg, undo) {
    var t = $('#imToast');
    if (!t) { t = document.createElement('div'); t.id = 'imToast'; t.className = 'imtoast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (undo !== null && undo !== undefined ? '<button type="button" class="btn sm" data-undo>Undo</button>' : '') + '<button type="button" class="btn ghost sm" data-toastx aria-label="Dismiss">×</button>';
    t.hidden = false;
    clearTimeout(t._tm); t._tm = setTimeout(function () { t.hidden = true; }, 9000);
    t.onclick = function (e) {
      var b = e.target.closest && e.target.closest('button');
      if (!b) return;
      t.hidden = true;
      if (b.hasAttribute('data-undo')) {
        store.set('imastery.route', Object.assign({}, undo, { updatedAt: Date.now() }));
        if (window.Auth) Auth.changed('prefs');
        Learn.prefChanged();
        var c = $('#pathbar [data-onb]'); if (c) c.focus();
      }
    };
  }
  /* Home in My path mode: route-first block with the path tracks; off-path lands are dimmed under "Other lands". */
  function pathHomeHtml(trackBy) {
    var PT = Learn.pathTracks(), v = Learn.routeView(), R = v.sch.plan.route, done = v.stages.every(function (s) { return s.complete; });
    return '<section class="jcard pathhome" aria-labelledby="phH"><div class="jrow"><h2 id="phH">On your path (' + PT.length + ' tracks)</h2><span class="muted">' + esc(R.name) + ' · ' + v.pctHours + '% of your path</span></div>' +
      (done ? '<p class="ph-done"><b>Route complete.</b> Pick extensions on <a href="route.html">your route plan</a> or choose a new route.</p>' : '') +
      '<div class="pathtracks">' + PT.map(function (t) {
        var tr = trackBy[t.track], p = t.required ? Math.round(t.done / t.required * 100) : 0;
        return '<a class="ptrack" data-track="' + t.track + '" href="' + t.track + '.html"><b>' + esc(tr ? tr.title : t.track) + '</b><span class="jbar-p c-violet"><i style="width:' + p + '%"></i></span><span class="mono">' + t.done + '/' + t.required + '</span>' +
          (t.required < t.total ? '<small class="muted">' + t.required + ' of ' + t.total + ' on your path</small>' : '') + '</a>';
      }).join('') + '</div>' + routeCardHtml() + '</section>';
  }
  /* Module page in My path mode: where this module sits on the route. */
  function pathBannerHtml(m) {
    var r = Learn.relevance(m.id), p = Learn.pref(), R = routeOf(p.id);
    if (r.state === 'off') return '<div class="box pathban off" data-rel="off"><b>Not on your path</b> (' + esc(R.name) + '). Everything here stays open to you.</div>';
    var stg = r.stage >= 0 ? ' · Stage ' + (r.stage + 1) + ' of ' + R.stages.length + ': ' + esc(R.stages[r.stage].name) : ' · after the route';
    return '<div class="box pathban" data-rel="' + r.state + '"><b>Your path · ' + REL_LABEL[r.state] + '</b>' + stg + '</div>';
  }
  var langShown = {};
  function langGate(m) {
    if (!window.Learn || !window.PATHS || !PATHS.LANG_ONLY) return null;
    var x = PATHS.LANG_ONLY[m.id], lang = viewLang();
    if (!x || !lang) return null;
    return { langs: x.langs, label: x.label, hide: x.langs.indexOf(lang) < 0 && !langShown[m.id], lang: lang };
  }
  function revealLang(mid, focus) {
    langShown[mid] = true;
    var first = null;
    $$('section.topic[data-lang][hidden]').forEach(function (s) { s.hidden = false; if (!first) first = s; });
    var g = $('#lg-' + mid);
    if (g) g.innerHTML = '<p>Showing the ' + esc(PATHS.LANG_ONLY[mid].label) + ' version.</p>';
    if (focus && first) { var hd = $('h2', first); if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus(); } }
    watchEnds($('#main'));
  }
  var searchOnly = true, lastSearch = null;

  /* ---------- planner screens: home in My path mode, today.html, plan.html (Planner, src/planner.js) ----------
     Explore all never reaches this code: renderHome keeps its pre-planner markup in that mode. */
  var PAGE = null;
  var KIND_TAG = { review: 'REV', practice: 'PRC', lesson: 'LRN', project: 'DO', mock: 'MOCK' };
  function greeting() { var hr = new Date().getHours(); return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function nextCardHtml(n, big) {
    if (!n) return '<div class="nextstop path done"><span class="kicker">Path complete</span><b>Everything on your path is done</b><span>Pick extensions on your route plan or choose a new goal.</span><span class="sail"><a href="route.html">Open your route ›</a></span></div>';
    var mins = n.kind === 'project' ? Math.round(n.minutes / 60) + ' h' : n.minutes + ' min';
    return '<a class="nextstop path" href="' + esc(n.href) + '" data-next="' + esc(n.id) + '"><span class="kicker">' + (n.kind === 'review' ? 'Review first' : n.kind === 'practice' ? 'Practice first' : n.kind === 'project' ? 'Stage project' : 'Next on your path') + '</span><b>' + esc(n.title) + '</b><span>' + esc(n.why) + '</span><span class="sail">' + ICONS.play + 'Continue · ' + mins + '</span></a>';
  }
  function chipsHtml(T, dl) {
    var st = Planner.streak(), rev = T.items.filter(function (x) { return x.kind === 'review' && !x.done; }).length;
    return '<div class="pchips" role="list"><span class="chip" role="listitem">' + (st ? '🔥 ' + plural(st, 'day') + ' streak' : 'Start a streak today') + '</span>' +
      '<span class="chip" role="listitem">' + (T.rest ? 'Rest day' : T.minutes + ' min today') + '</span>' +
      (rev ? '<span class="chip" role="listitem">' + plural(rev, 'review') + ' due</span>' : '') +
      (dl !== null ? '<span class="chip" role="listitem">' + (dl === 0 ? 'Interview today' : plural(dl, 'day') + ' to interview') + '</span>' : '') + '</div>';
  }
  function fitPill(W) {
    if (W.daysLeft === null) return '';
    return W.fits ? '<span class="pill good">fits the date</span>' : '<span class="pill bad">tight · ' + Math.ceil(Planner.effective().usedHours - W.budgetHours) + ' h over</span>';
  }
  function planHeroHtml(J, S, R0, trackBy, last) {
    var p = Learn.pref(), R = routeOf(p.id), n = Planner.next(), T = Planner.today(), dl = Planner.daysLeft(), P = Planner.progress();
    return '<section class="whero plan"><div class="wh-l"><span class="kicker">' + greeting() + ' <small class="kick-all">· ' + esc(R.name) + ' · ' + P.pct + '% of your path</small></span>' +
      '<h1>' + (P.done || S.done ? 'Keep the streak going' : 'Let’s begin') + '</h1>' + chipsHtml(T, dl) + nextCardHtml(n) +
      '<a class="btn ghost seetoday" href="today.html">See today’s plan ›</a></div>' + J.atlasHtml(S, R0, trackBy, last) + '</section>';
  }
  /* Home in My path mode: progress and forecast, the path's tracks (tap → next module in that track), quick actions. */
  function planHomeHtml(trackBy) {
    var PT = Learn.pathTracks(), W = Planner.weeks(), P = Planner.progress(), T = Planner.today(), n = Planner.next(), D = store.get('imastery.done', {}) || {};
    var todo = T.items.filter(function (x) { return !x.done; }).length;
    var h = '<section class="jcard pathhome" aria-labelledby="phH"><div class="jrow"><h2 id="phH">Your path</h2><a href="route.html">Full route ›</a></div>' +
      '<div class="pprog"><span><b>' + P.pct + '%</b> of required modules</span><span class="muted">~' + plural(W.weeks, 'week') + ' left' + (W.daysLeft !== null ? ' · ' : '') + fitPill(W) + '</span></div><div class="jbar-p c-violet"><i style="width:' + P.pct + '%"></i></div>' +
      (W.fast ? '<p class="muted sm">Fast track: ' + plural(W.fast, 'recommended module') + ' skipped after a strong score.</p>' : '') +
      (W.trimmed ? '<p class="muted sm">' + plural(W.trimmed, 'module') + ' moved after the interview to fit the date. <a href="plan.html">Change the plan ›</a></p>' : '') +
      '<div class="jrow"><h3 class="ph-sub">On your path · ' + plural(PT.length, 'track') + '</h3><span class="muted">' + (TRACKS.length - PT.length) + ' other lands</span></div><div class="pathtracks">' + PT.map(function (t) {
        var tr = trackBy[t.track], pc = t.required ? Math.round(t.done / t.required * 100) : 0, cur = n && n.track === t.track;
        var nx = t.mods.filter(function (id) { return !Learn.status(id, D).satisfied; })[0];
        return '<a class="ptrack' + (cur ? ' cur' : '') + '" data-track="' + t.track + '" href="' + (nx ? Learn.href(nx) : t.track + '.html') + '" aria-label="' + esc((tr ? tr.title : t.track) + ': ' + t.done + ' of ' + t.required + ' done' + (nx ? ', continue with ' + (Learn.meta(nx) || {}).title : ', complete')) + '"><b>' + esc(tr ? tr.title : t.track) + '</b><span class="jbar-p c-violet"><i style="width:' + pc + '%"></i></span><span class="mono">' + t.done + '/' + t.required + '</span>' +
          '<small class="muted">' + (cur ? 'you are here' : nx ? 'next: ' + esc((Learn.meta(nx) || {}).title) : 'complete on your path') + '</small></a>';
      }).join('') + '</div>' +
      '<div class="quick"><a href="today.html"><span class="n">' + todo + '</span>Today’s items</a><a href="plan.html"><span class="n">' + W.hoursLeft + 'h</span>Left on path</a><button type="button" data-jump aria-keyshortcuts="/"><span class="n">/</span>Jump to…</button></div>' +
      routeCardHtml() + '</section>';
    return h;
  }
  function needPathHtml(what) {
    return '<section class="jcard needpath"><h1 id="pgH" tabindex="-1">' + esc(what) + ' needs a path</h1><p class="muted">Pick a goal and the planner lays out lessons, reviews and practice for you. Nothing is locked.</p>' +
      '<div class="row"><button type="button" class="btn primary" data-onb aria-haspopup="dialog">Pick a path</button><a class="btn ghost" href="index.html">Back to the map</a></div></section>';
  }
  function pagePrep(fn) {
    chrome();
    PAGE = fn;
    $('#main').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-onb')) openOnboarding(false, b);
      else if (b.hasAttribute('data-revdone')) { Planner.completeReview(b.getAttribute('data-revdone')); toast('Review done. Moving on.', null); }
      else if (b.hasAttribute('data-mock')) startMock(b);
    });
    window.addEventListener('im:plan', function () { fn(true); });
    fn(false);
    mountPathbar();
  }
  function startMock(b) {
    var was = b.textContent; b.disabled = true; b.textContent = 'Loading questions…';
    Planner.mock(function (pct) { toast('Mock round recorded: ' + pct + '%.', null); }).then(function () { b.disabled = false; b.textContent = was; }, function () { b.disabled = false; b.textContent = was; toast('Could not load the questions. Check your connection and try again.', null); });
  }
  function refocus(refocusHeading) { if (refocusHeading) { var hd = $('#pgH'); if (hd) hd.focus(); } }
  /* today.html: the day's list in planner order; items link to their section and strike through when done. */
  function todayPage() { pagePrep(renderToday); }
  function renderToday(refocusHeading) {
    var main = $('#main');
    main.removeAttribute('aria-busy');
    if (!window.Planner || !Learn.pref().chosen) { main.innerHTML = needPathHtml('Today’s plan'); refocus(refocusHeading); return; }
    var p = Learn.pref(), R = routeOf(p.id), T = Planner.today(), n = Planner.next(), W = Planner.weeks(), P = Planner.progress(), dl = Planner.daysLeft();
    var h = '<section class="tp-head"><span class="kicker">Today · ' + esc(R.name) + '</span><h1 id="pgH" tabindex="-1">' + (T.rest ? 'Rest day' : T.minutes + ' minutes planned') + '</h1>' + chipsHtml(T, dl) + '</section>';
    h += nextCardHtml(n);
    h += '<section class="jcard tlist" aria-labelledby="tlH"><div class="jrow"><h2 id="tlH">Today’s plan</h2><span class="pill ' + (T.missed ? 'warn' : 'good') + '">' + (T.rest ? 'rest day' : T.missed ? 'catching up ' + plural(T.missed, 'day') : 'on schedule') + '</span></div>';
    if (!T.items.length) h += '<p class="muted">' + (T.rest ? 'Nothing is planned on your rest day. Due reviews would still appear here.' : 'Nothing to plan: your path is complete.') + '</p>';
    else h += '<ol class="plan">' + T.items.map(function (x) {
      var act = x.kind === 'mock' && !x.done ? '<button type="button" class="btn sm" data-mock>Start</button>' : (x.id.indexOf('rev:') === 0 || x.id.indexOf('xp:') === 0) && !x.done ? '<button type="button" class="btn sm ghost" data-revdone="' + esc(x.mod) + '" aria-label="Mark ' + esc(x.title) + ' done">Done</button>' : '';
      return '<li class="titem k-' + x.kind + (x.done ? ' done' : '') + '"><span class="ico" aria-hidden="true">' + KIND_TAG[x.kind] + '</span><a class="t" href="' + esc(x.href) + '">' + (x.done ? '<s>' : '') + esc(x.title) + (x.done ? '</s> <span class="sr-only">(done)</span>' : '') + '<small>' + esc(x.why) + '</small></a><span class="min">' + x.minutes + ' min</span>' + act + '</li>';
    }).join('') + '</ol>';
    h += '</section>';
    h += '<section class="jcard"><div class="pprog"><span><b>' + P.pct + '%</b> of required modules</span><span class="muted">' + W.hoursLeft + ' h left · ~' + plural(W.weeks, 'week') + ' at ' + p.hours + ' h/wk ' + fitPill(W) + '</span></div><div class="jbar-p c-violet"><i style="width:' + P.pct + '%"></i></div>' +
      (W.trimmed || W.mockHours ? '<p class="muted sm">' + (W.trimmed ? plural(W.trimmed, 'module') + ' moved after the interview. ' : '') + (W.mockHours ? Math.round(W.mockHours) + ' h of mocks reserved.' : '') + '</p>' : '') +
      '<a class="btn line-v" href="plan.html">Change hours, date or rest day ›</a></section>';
    main.innerHTML = h;
    refocus(refocusHeading);
  }
  /* plan.html: hours, interview date, rest day, placement (confirm first, or prove it with a readiness check), forecast, mock round. */
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var PLACE = [['beginner', 'Beginner', 'Start from the first module.'], ['lang', 'Knows the language', 'Skip the language basics.'], ['langdsa', 'Knows language + DSA basics', 'Skip the basics and the first 6 DSA modules.']];
  function planPage() { pagePrep(renderPlan); }
  function renderPlan(refocusHeading) {
    var main = $('#main');
    main.removeAttribute('aria-busy');
    if (!window.Planner || !Learn.pref().chosen) { main.innerHTML = needPathHtml('Your plan'); refocus(refocusHeading); return; }
    var p = Learn.pref(), R = routeOf(p.id), W = Planner.weeks(), E = Planner.effective(), dl = W.daysLeft, D = store.get('imastery.done', {}) || {};
    var active = document.activeElement, keep = active && main.contains(active) ? (active.id ? '#' + active.id : active.getAttribute('data-hours') ? '[data-hours="' + active.getAttribute('data-hours') + '"]' : active.getAttribute('data-place') ? '[data-place="' + active.getAttribute('data-place') + '"]' : null) : null;
    var h = '<section class="tp-head"><span class="kicker">Plan · ' + esc(R.name) + '</span><h1 id="pgH" tabindex="-1">Your plan</h1><p class="muted">Tune your pace and the path re-plans itself. Quiz scores come from the riddle gates and checkpoints you pass.</p></section>';
    h += '<section class="jcard" aria-labelledby="plSetH"><h2 id="plSetH">Time</h2><div class="rp-row">' +
      '<div class="rp-field"><span id="plHoursL">Hours per week</span><div class="rp-hours" role="group" aria-labelledby="plHoursL">' + [5, 10, 20, 40].map(function (w) { return '<button type="button" class="rp-h' + (w === p.hours ? ' on' : '') + '" data-hours="' + w + '" aria-pressed="' + (w === p.hours) + '">' + w + '</button>'; }).join('') + '</div></div>' +
      '<label class="rp-field" for="plDate">Interview date<input type="date" id="plDate" value="' + esc(p.interviewDate) + '" min="' + Planner.ymd(new Date()) + '"></label>' +
      '<label class="rp-field" for="plRest">Rest day<select id="plRest">' + DAYS.map(function (d, i) { return '<option value="' + i + '"' + (i === p.restDay ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label>' +
      (p.interviewDate ? '<button type="button" class="btn ghost" id="plClear">Clear the date</button>' : '') + '</div>' +
      '<p class="muted sm" id="plNote" role="status">' + (dl === null ? 'No interview date: the forecast assumes ' + p.hours + ' h a week with ' + DAYS[p.restDay] + 's off.' : (dl === 0 ? 'Your interview is today.' : plural(dl, 'day') + ' to go: ' + Math.round(W.budgetHours) + ' h of study available after ' + Math.round(W.mockHours) + ' h of mocks.')) + '</p></section>';
    h += '<section class="jcard" aria-labelledby="plPlaceH"><h2 id="plPlaceH">Placement</h2><p class="muted">Already know some of this? Mark it as known, or prove it with a readiness check. Marking never deletes progress.</p><div class="placement-opts">' +
      PLACE.map(function (x) { var n = Planner.placementMods(x[0]).filter(function (id) { return !D['@tested:' + id] && !Learn.status(id, D).satisfied; }).length; return '<button type="button" class="btn' + (p.placement === x[0] ? ' on' : '') + '" data-place="' + x[0] + '" aria-pressed="' + (p.placement === x[0]) + '"><b>' + x[1] + '</b><small>' + x[2] + (x[0] !== 'beginner' ? ' ' + plural(n, 'module') + ' to mark.' : '') + '</small></button>'; }).join('') + '</div></section>';
    var hero = dl === null ? '~' + plural(W.weeks, 'week') + ' to finish' : (W.fits ? 'Fits: ' : 'Won’t fit: ') + plural(dl, 'day') + ', ' + Math.round(W.budgetHours) + ' h available';
    h += '<section class="jcard forecast" aria-labelledby="plWkH" id="forecast"><div class="jrow"><h2 id="plWkH">Weeks</h2>' + fitPill(W) + '</div>' +
      '<div class="fc-hero"><span class="kicker">Forecast</span><b id="plHero">' + esc(hero) + '</b><span class="muted">' + W.hoursLeft + ' h of lessons left at ' + p.hours + ' h/wk.' + (dl !== null && !W.fits && W.hoursNeeded ? (W.hoursNeeded <= 40 ? ' Raise hours to ' + W.hoursNeeded + '/wk, or accept a shorter path (core only).' : ' Even 40 h/wk would not fit: move the date, or keep the required modules only.') : '') + '</span></div>' +
      '<ol class="plan weeks">' + W.stages.map(function (s) { return '<li><span class="ico" aria-hidden="true">W' + s.byWeek + '</span><span class="t">' + esc(s.name) + '<small>' + plural(s.modules.length, 'module') + ' · ' + s.hours + ' h</small></span><span class="min">by wk ' + s.byWeek + '</span></li>'; }).join('') +
      (dl !== null && dl > 7 ? '<li><span class="ico mock" aria-hidden="true">MOCK</span><span class="t">Mock rounds<small>Last 7 days before the interview</small></span><span class="min">' + Math.round(W.mockHours) + ' h</span></li>' : '') + '</ol>' +
      (E.trimmed.length ? '<details class="trimmed"><summary>' + plural(E.trimmed.length, 'module') + ' moved after the interview</summary><ul>' + E.trimmed.map(function (x) { return '<li><a href="' + Learn.href(x.id) + '">' + esc(x.title) + '</a> <small class="muted">' + x.hours + ' h · ' + (x.kind === 'rec' ? 'recommended' : 'optional') + '</small></li>'; }).join('') + '</ul></details>' : '') +
      (E.fast.length ? '<p class="muted sm">Fast track: ' + E.fast.map(function (x) { return esc(x.title); }).join(', ') + ' skipped after a strong score on this stage. Open any of them from its land to add it back.</p>' : '') + '</section>';
    var mocks = Object.keys(D).filter(function (k) { return k.indexOf('@mock:') === 0; }).sort();
    h += '<section class="jcard" aria-labelledby="plMockH" id="mock"><h2 id="plMockH">Mock round</h2><p class="muted">Twelve mixed questions from the modules on your path, 45 minutes on the clock. Planned daily in the last week before your interview; run one any time.</p>' +
      '<div class="row"><button type="button" class="btn primary" data-mock>Start a mock round</button>' + (mocks.length ? '<span class="muted">Last: ' + D[mocks[mocks.length - 1]] + '% on ' + esc(mocks[mocks.length - 1].slice(6)) + ' · ' + plural(mocks.length, 'round') + ' so far</span>' : '') + '</div></section>';
    main.innerHTML = h;
    $('#plDate').addEventListener('change', function () { Learn.setPref({ interviewDate: this.value || '' }); });
    $('#plRest').addEventListener('change', function () { Learn.setPref({ restDay: +this.value }); });
    var clr = $('#plClear'); if (clr) clr.addEventListener('click', function () { Learn.setPref({ interviewDate: '' }); });
    $$('[data-hours]', main).forEach(function (b) { b.addEventListener('click', function () { Learn.setPref({ hours: +b.getAttribute('data-hours') }); }); });
    $$('[data-place]', main).forEach(function (b) { b.addEventListener('click', function () { placementDialog(b.getAttribute('data-place'), b); }); });
    if (keep && $(keep, main)) $(keep, main).focus(); else refocus(refocusHeading);
  }
  function placementDialog(level, opener) {
    var D = store.get('imastery.done', {}) || {}, mods = Planner.placementMods(level).filter(function (id) { return !D['@tested:' + id]; }), proof = Planner.placementProof(level);
    var d = $('#placeDlg');
    if (!d) { d = document.createElement('dialog'); d.id = 'placeDlg'; d.className = 'onb'; d.setAttribute('aria-labelledby', 'placeH'); document.body.appendChild(d); }
    var name = PLACE.filter(function (x) { return x[0] === level; })[0][1];
    d.innerHTML = '<form method="dialog" class="onb-f"><h2 id="placeH">' + (level === 'beginner' ? 'Start as a beginner?' : 'Mark ' + plural(mods.length, 'module') + ' as known?') + '</h2>' +
      (level === 'beginner' ? '<p class="muted">Nothing is skipped. Modules you already marked as known stay known; untick them from their land if you want them back on the plan.</p>' :
        '<p class="muted">' + name + ': these count as tested out, exactly as if you had passed a readiness check. Your progress is never deleted.</p><ul class="place-list">' + mods.slice(0, 12).map(function (id) { var m = Learn.meta(id); return '<li>' + esc(m ? m.title : id) + '</li>'; }).join('') + (mods.length > 12 ? '<li class="muted">and ' + (mods.length - 12) + ' more</li>' : '') + '</ul>') +
      '<div class="onb-acts"><button type="button" class="btn ghost" data-pl-cancel>Cancel</button><span class="row">' + (proof && level !== 'beginner' ? '<button type="button" class="btn" data-pl-prove>Prove it: readiness check</button>' : '') + '<button type="button" class="btn primary" data-pl-ok>' + (level === 'beginner' ? 'Start from the beginning' : 'Mark as known') + '</button></span></div></form>';
    function close() { if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); } if (opener && opener.focus) opener.focus(); }
    d.onclick = function (e) {
      var t = e.target.closest && e.target.closest('button');
      if (!t) return;
      if (t.hasAttribute('data-pl-cancel')) close();
      else if (t.hasAttribute('data-pl-ok')) { var n = Planner.placement(level); close(); toast(level === 'beginner' ? 'Starting from the beginning. Your plan is updated.' : plural(n, 'module') + ' marked as known. Your plan is re-planned.', null); }
      else if (t.hasAttribute('data-pl-prove')) { close(); Learn.setPref({ placement: level }); Learn.readiness(proof, Learn.pref().lang, function () { toast('You proved it. The prerequisites are marked as known.', null); }); }
    };
    d.oncancel = function (e) { e.preventDefault(); close(); };
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
    var f = $('[data-pl-ok]', d); if (f) f.focus();
  }

  /* ---------- account sync ---------- */
  function reloadDone() {
    DONE = store.get('imastery.done', {}) || {};
    if (HOME) { renderHome(); return; }
    if (PAGE) { PAGE(); return; }
    if (!TRACK) return;
    $$('[data-done]').forEach(function (cb) { setBox(cb, !!DONE[cb.getAttribute('data-done')]); });
    $$('.toc a').forEach(function (a) { var id = (a.getAttribute('href') || '').slice(1); a.classList.toggle('ok', !!DONE[id]); });
    if (!current) $('#main').innerHTML = trackDashHtml();
    updateProgress();
  }
  function startAuth() {
    if (!window.Auth) return;
    Auth.mountAccount($('#account'));
    Auth.on(function (k) { if (k === 'progress') reloadDone(); });
    Auth.init();
  }

  return { track: track, loadedModule: loadedModule, home: home, today: todayPage, plan: planPage, renderPart: renderPart, highlight: highlight, dedent: dedent, PART: PART, items: items };
})();

