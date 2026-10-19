var MODULES = [];
function registerModule(m) { MODULES.push(m); }

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
    json: { name: 'JSON', kw: kw('true false null') },
    css: { name: 'CSS', kw: {}, c: 1 },
    html: { name: 'HTML', kw: {}, html: 1 },
    http: { name: 'HTTP', kw: kw('GET POST PUT PATCH DELETE HEAD OPTIONS HTTP') },
    text: { name: 'Text', kw: {}, plain: 1 }
  };
  LANGS.jsx = LANGS.js; LANGS.tsx = LANGS.ts; LANGS.javascript = LANGS.js; LANGS.typescript = LANGS.ts; LANGS.py = LANGS.python; LANGS.sh = LANGS.bash; LANGS.c = LANGS.cpp; LANGS.xml = LANGS.html;
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
    return codeTabs([s]);
  }
  function codeTabs(list) {
    list = list.filter(Boolean);
    if (!list.length) return '';
    var h = '<div class="code' + (list.length > 1 ? ' tabs' : '') + '">';
    if (list.length > 1) h += '<div class="code-tabs">' + list.map(function (s, i) { return '<button type="button" class="ctab' + (i ? '' : ' on') + '" data-tab="' + i + '">' + esc((LANGS[s.lang] || LANGS.text).name) + '</button>'; }).join('') + '</div>';
    list.forEach(function (s, i) {
      var k = SNIPS.push(s) - 1, code = dedent(s.code);
      s.code = code;
      var runnable = (s.lang === 'sql' && s.db !== undefined) || ((s.lang === 'js' || s.lang === 'javascript' || s.lang === 'python' || s.lang === 'py') && s.run);
      h += '<div class="cpane" data-pane="' + i + '"' + (i ? ' hidden' : '') + '><div class="code-head"><span>' + esc(s.title || (LANGS[s.lang] || LANGS.text).name) + '</span><span class="code-btns">' +
        (runnable ? '<button class="btn run" type="button" data-lang="' + s.lang + '" data-snip="' + k + '">' + ICONS.play + 'Run</button><button class="btn edit" type="button">Edit</button>' : '') +
        '<button class="btn copy" type="button">Copy</button></span></div><pre><code>' + highlight(code, s.lang) + '</code></pre>' + (runnable ? '<div class="run-out" hidden></div>' : '') + '</div>';
    });
    return h + '</div>';
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
        'window.onerror=function(m){__s("error",["Uncaught "+m])};window.addEventListener("unhandledrejection",function(e){__s("error",["Unhandled rejection: "+(e.reason&&e.reason.message||e.reason)])});';
      ifr.srcdoc = '<script>' + shim + '<\/script><script>' + code.replace(/<\/script/gi, '<\\/script') + '<\/script>';
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
      var lines = dedent(p.code || '').split('\n'), hl = p.hl || {};
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
    var mins = v.secs ? Math.max(1, Math.round(v.secs / 60)) + ' min · ' : '';
    return '<div class="box vid" id="' + id + '-vid"><span class="tag">From the watchtower · watch it explained</span>' +
      '<button type="button" class="vid-play" data-vid="' + v.id + '" aria-label="Play video: ' + esc(v.title) + '"><span class="vid-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5l12 7-12 7z"/></svg></span><span class="vid-meta"><b>' + esc(v.title) + '</b><small>' + esc(v.channel) + ' · ' + mins + 'YouTube</small></span></button>' +
      '<p class="vid-note">Plays from YouTube when you tap it. Picked automatically for this topic.</p></div>';
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

  function moduleHtml(m) {
    vizRegistry = []; SNIPS = [];
    var lang = m.lang || TRACK.lang;
    var h = '<div class="crumb"><a href="index.html">World map</a><span>›</span><a href="#">' + esc(TRACK.title) + '</a><span>›</span><span>Place ' + m.num + '</span>' + lvlBadge(m.level) + '</div><h1>' + m.title + '</h1>';
    h += '<div class="intro">' + (m.intro || '') + '</div>';
    h += '<div class="box path"><span class="tag">Learning path for this module</span><div class="cx"><b>Time</b><span>~' + (m.hours || '?') + ' hours including practice</span><b>Before this</b><span>' + (m.prereqs || '—') + '</span><b>You will be able to</b><ul>' + asList(m.goals).map(function (g) { return '<li>' + g + '</li>'; }).join('') + '</ul></div>' +
      '<div class="meta">How to travel: read each landmark’s legend → the idea → run the visualizer → work the examples → dig up the hidden treasure with clues → riddle gate → interview tavern → practice arena. Checkmarks tick themselves when you finish a section with the right answers; untick one to redo it.</div></div><div class="toc">';
    m.topics.forEach(function (t, i) { h += '<a href="#' + m.id + '-t' + i + '" class="' + (DONE[m.id + '-t' + i] ? 'ok' : '') + '">' + m.num + '.' + (i + 1) + ' ' + stripTags(t.title) + '</a>'; });
    if (m.quiz && m.quiz.length) h += '<a href="#' + m.id + '-quiz">Riddle gate</a>';
    if (m.interview && m.interview.length) h += '<a href="#' + m.id + '-iv">Interview tavern</a>';
    h += '<a href="#' + m.id + '-arena">Practice arena</a></div>';
    m.topics.forEach(function (t, i) { h += topicHtml(m, t, i, lang); });
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
    for (var i = 0; i < MODULES.length; i++) { var ids = items(MODULES[i]); if (doneOf(ids) < ids.length) return MODULES[i]; }
    return MODULES[MODULES.length - 1] || null;
  }
  function stampCard(key, on, how) {
    if (!window.Journey) return '';
    var st = Journey.STAMPS.filter(function (x) { return x.key === key; })[0];
    return '<div class="place guard' + (on ? ' on' : '') + '">' + Journey.stampSvg(st, on) + '<b>' + esc(st.name) + ' stamp</b><span>' + (on ? 'Earned. It is in your passport.' : how) + '</span></div>';
  }
  function trackDashHtml() {
    var R = region(TRACK.id), tot = 0, dn = 0, lm = 0, cur = curPlace(), last = store.get('imastery.last', null);
    MODULES.forEach(function (m) { var ids = items(m); tot += ids.length; dn += doneOf(ids); lm += m.topics.length; });
    var p = tot ? Math.round(dn / tot * 100) : 0, mine = last && last.track === TRACK.id && last.hash;
    var go = mine ? '<a class="btn clay lg" href="#' + esc(last.hash) + '">Continue at place ' + esc(last.num) + '</a>' : cur ? '<a class="btn clay lg" href="#' + cur.id + '">' + (dn ? 'Continue at place ' : 'Start at place ') + cur.num + '</a>' : '';
    var h = '<section class="land-hero"><div class="lh-l"><span class="kicker c-' + R.color + '">' + esc(R.name) + ' · ' + esc(R.area) + '</span><h1>' + TRACK.title + '</h1><p>' + TRACK.desc + '</p>' +
      '<p class="muted">' + TRACK.modules.length + ' places from Beginner Shore to Expert Summit · ' + MODULES.length + ' open now · ' + lm + ' landmarks, with a practice arena at the end of each place.</p></div>' +
      '<div class="lh-r"><div class="jrow"><span>Explored</span><b class="c-gold">' + p + '%</b></div><div class="jbar-p c-gold"><i style="width:' + p + '%"></i></div>' + go + '</div></section>';
    if (cur) {
      var ci = -1;
      cur.topics.forEach(function (_, i) { if (ci < 0 && !DONE[cur.id + '-t' + i]) ci = i; });
      h += '<section class="here" aria-labelledby="hereH"><span class="kicker">You are here · place ' + cur.num + ' · ' + ZN[cur.level] + '</span><h2 id="hereH">' + cur.title + '</h2><div class="marks">' +
        cur.topics.map(function (t, i) { var id = cur.id + '-t' + i, d = DONE[id]; return '<a class="mark' + (d ? ' ok' : i === ci ? ' cur' : '') + '" href="#' + id + '"><span class="md">' + (d ? '✓' : i + 1) + '</span><span>' + stripTags(t.title) + '</span></a>'; }).join('') + '</div><div class="here-acts">' +
        (cur.quiz && cur.quiz.length ? '<a class="btn ink lg" href="#' + cur.id + '-quiz">' + JI('gate') + 'Riddle gate · ' + cur.quiz.length + ' riddles</a>' : '') +
        '<a class="btn line lg" href="#' + cur.id + '-arena">' + JI('chest') + 'Practice arena · ' + (cur.practice || []).length + ' treasures</a>' +
        (cur.interview && cur.interview.length ? '<a class="btn line lg" href="#' + cur.id + '-iv">' + JI('lantern') + 'Interview tavern · ' + cur.interview.length + ' questions</a>' : '') + '</div></section>';
    }
    ['B', 'I', 'A', 'E'].forEach(function (lv) {
      var ms = TRACK.modules.filter(function (x) { return x.level === lv; });
      if (!ms.length) return;
      var bl = 0, bd = 0, ed = 0;
      h += '<section class="zone" aria-labelledby="z' + lv + '"><h2 class="zone-h" id="z' + lv + '"><span class="zdot bg-' + ZC[lv] + '" aria-hidden="true"></span>' + ZN[lv] + '<small>' + ms.length + ' places</small></h2><div class="trail">';
      ms.forEach(function (pm) {
        var m = loaded(pm.id);
        if (!m) { h += '<div class="place soon"><div class="jrow"><span class="pdot">' + pm.num + '</span><span class="ptag2">coming soon</span></div><b>' + esc(pm.title) + '</b><span class="pmeta">' + esc(pm.scope) + '</span></div>'; return; }
        var ids = items(m), d = doneOf(ids), full = ids.length && d === ids.length, isCur = cur === m && !full, w = ids.length ? Math.round(d / ids.length * 100) : 0;
        if (lv === 'B') { bl++; if (full) bd++; }
        if (lv === 'E' && full) ed++;
        h += '<a class="place' + (full ? ' done' : isCur ? ' cur' : '') + '" href="#' + m.id + '"><div class="jrow"><span class="pdot">' + (full ? '✓' : m.num) + '</span><span class="ptag2">' + (full ? 'cleared' : isCur ? 'you are here' : d ? 'exploring' : 'ahead') + '</span></div><b>' + m.title + '</b><div class="jbar-p"><i style="width:' + w + '%"></i></div><span class="pmeta">' + m.topics.length + ' landmarks · ' + w + '%</span></a>';
      });
      if (lv === 'B') h += stampCard('shore', bl > 0 && bd === bl, 'Clear every Beginner place in this land to earn it.');
      if (lv === 'E') h += stampCard('summit', ed > 0, 'Clear any Expert place to earn it.');
      h += '</div></section>';
    });
    return h;
  }
  function navHtml() {
    var cur = curPlace();
    var h = '<a class="nav-back" href="index.html">' + ICONS.back + 'World map</a><a class="nav-mod' + (!current ? ' active' : '') + '" href="#"><span class="num">' + esc(TRACK.icon) + '</span><span>Land overview</span></a>';
    ['B', 'I', 'A', 'E'].forEach(function (lv) {
      var ms = TRACK.modules.filter(function (x) { return x.level === lv; });
      if (!ms.length) return;
      h += '<div class="nav-part c-' + ZC[lv] + '">' + ZN[lv] + '</div>';
      ms.forEach(function (pm) {
        var m = loaded(pm.id);
        if (!m) { h += '<div class="nav-mod soon" title="coming soon"><span class="num">' + pm.num + '</span><span>' + esc(pm.title) + '</span><span class="cnt">soon</span></div>'; return; }
        var ids = items(m), d = doneOf(ids), act = current === m, full = ids.length && d === ids.length;
        h += '<a class="nav-mod' + (act ? ' active' : '') + (full ? ' full' : cur === m ? ' nhere' : '') + '" href="#' + m.id + '"><span class="num">' + (full ? '✓' : m.num) + '</span><span>' + m.title + '</span><span class="cnt">' + (ids.length ? Math.round(d / ids.length * 100) : 0) + '%</span></a>';
        if (act) {
          h += '<div class="nav-sub">';
          m.topics.forEach(function (t, i) { h += '<a href="#' + m.id + '-t' + i + '" class="' + (DONE[m.id + '-t' + i] ? 'ok' : '') + '">' + m.num + '.' + (i + 1) + ' ' + stripTags(t.title) + '</a>'; });
          if (m.quiz && m.quiz.length) h += '<a href="#' + m.id + '-quiz" class="' + (DONE[m.id + '-quiz'] ? 'ok' : '') + '">Riddle gate (' + m.quiz.length + ')</a>';
          if (m.interview && m.interview.length) h += '<a href="#' + m.id + '-iv" class="' + (DONE[m.id + '-iv'] ? 'ok' : '') + '">Interview tavern (' + m.interview.length + ')</a>';
          h += '<a href="#' + m.id + '-arena">Practice arena (' + (m.practice || []).length + ')</a></div>';
        }
      });
    });
    return h;
  }
  function updateProgress() {
    var tot = 0, dn = 0;
    MODULES.forEach(function (m) { var ids = items(m); tot += ids.length; dn += doneOf(ids); });
    $('#pfill').style.width = (tot ? dn / tot * 100 : 0) + '%';
    $('#ptext').textContent = 'Land explored: ' + (tot ? Math.round(dn / tot * 100) : 0) + '% · ' + dn + ' / ' + tot;
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
  function searchInto(q, index, res, nav) {
    q = q.trim().toLowerCase();
    if (!q) { res.hidden = true; if (nav) nav.hidden = false; return; }
    var words = q.split(/\s+/);
    var hits = index.map(function (it) {
      var tl = it.t.toLowerCase(), sc = 0;
      for (var i = 0; i < words.length; i++) {
        if (tl.indexOf(words[i]) >= 0) sc += 3; else if ((it.s || '').indexOf(words[i]) >= 0) sc += 1; else return null;
      }
      return { it: it, sc: sc };
    }).filter(Boolean).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 80);
    var re = new RegExp('(' + words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
    res.innerHTML = hits.length ? hits.map(function (x) {
      return '<a class="res" href="' + x.it.h + '">' + esc(x.it.t).replace(re, '<mark>$1</mark>') + '<small>' + esc(x.it.c) + '</small></a>';
    }).join('') : '<div class="empty" style="padding:10px">No matches yet.</div>';
    res.hidden = false; if (nav) nav.hidden = true;
  }

  /* ---------- routing ---------- */
  function route() {
    var hs = decodeURIComponent(location.hash.slice(1)), main = $('#main');
    if (!hs) {
      current = null; vizRegistry = []; SNIPS = []; main.innerHTML = trackDashHtml(); updateProgress(); window.scrollTo(0, 0); return;
    }
    var mid = hs.split('-')[0], m = loaded(mid);
    if (!m) { location.hash = ''; return; }
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
      } else if (t.classList.contains('ctab')) {
        var box = t.closest('.code'), i = t.getAttribute('data-tab');
        $$('.ctab', box).forEach(function (b) { b.classList.toggle('on', b === t); });
        $$('.cpane', box).forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== i; });
      } else if (t.closest('.vid-play')) {
        var vb = t.closest('.vid-play'), vidId = vb.getAttribute('data-vid');
        if (!/^[A-Za-z0-9_-]{11}$/.test(vidId)) return;
        var fr = document.createElement('div'); fr.className = 'vid-frame';
        fr.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + vidId + '?autoplay=1&rel=0&playsinline=1" title="' + esc(vb.querySelector('b').textContent) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
        var ln = document.createElement('a'); ln.className = 'vid-open'; ln.href = 'https://www.youtube.com/watch?v=' + vidId; ln.target = '_blank'; ln.rel = 'noopener'; ln.textContent = 'Open on YouTube';
        vb.replaceWith(fr); fr.after(ln);
      } else if (t.closest('.opt')) {
        var b = t.closest('.opt'), mb2 = b.closest('.mcq'), ans = +mb2.getAttribute('data-ans'), pick = +b.getAttribute('data-opt');
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
    store.set('imastery.done', DONE);
    if (window.Auth) Auth.changed();
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
    $$('.mcq', el).forEach(function (q) { q._ok = false; $$('.opt', q).forEach(function (o) { o.classList.remove('right', 'wrong'); }); $('.mcq-fb', q).hidden = true; });
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

  function track(id) {
    TRACK = TRACKS.filter(function (t) { return t.id === id; })[0];
    var order = {};
    TRACK.modules.forEach(function (pm, i) { order[pm.id] = i; });
    MODULES = MODULES.filter(function (m) { return order[m.id] !== undefined; });
    MODULES.forEach(function (m) { var pm = TRACK.modules[order[m.id]]; m.num = pm.num; m.level = pm.level; if (!m.title) m.title = pm.title; });
    MODULES.sort(function (a, b) { return order[a.id] - order[b.id]; });
    document.title = TRACK.title + ' — Interview Mastery';
    var ln = $('#landName'); if (ln) { var R = region(TRACK.id); ln.textContent = R.name + ' · ' + TRACK.modules.length + ' places'; }
    chrome();
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
      var b = e.target.closest('[data-role]');
      if (b && window.Journey) { Journey.setDest(b.getAttribute('data-role')); renderHome(); var d = $('#dest'); if (d) d.querySelector('[data-role="' + b.getAttribute('data-role') + '"]').focus(); }
    });
    renderHome();
  }
  function renderHome() {
    var J = window.Journey, S = J.stats(DONE), last = store.get('imastery.last', null), M = window.IM_MODS || {};
    var lands = TRACKS.length, R0 = last && last.track ? J.regionOf(last.track) : J.REGIONS[0];
    var trackBy = {}; TRACKS.forEach(function (t) { trackBy[t.id] = t; });
    var h = '<section class="whero"><div class="wh-l"><span class="kicker">' + (S.done ? J.pct(S.done, S.items) + '% of the world explored' : 'A new traveller arrives') + '</span>' +
      '<h1>' + (S.done ? 'Welcome back, traveller' : 'Your journey starts on Foundation Isle') + '</h1>' +
      '<p>' + lands + ' lands, ' + S.planned + ' places, ' + S.landmarks.toLocaleString('en-US') + ' landmarks. Every lesson is a stop on the map; finish it and the path lights up.</p>';
    if (last && last.track && last.hash) {
      h += '<a class="nextstop" href="' + esc(last.track) + '.html#' + esc(last.hash) + '"><span class="kicker">Next stop · place ' + esc(last.num) + ' · ' + esc(last.title) + '</span><b>' + esc(last.topicTitle || last.title) + '</b>' +
        '<span>' + esc(J.regionOf(last.track).name) + ' · ' + esc(last.trackTitle) + (last.topics ? ' · landmark ' + (last.topic + 1) + ' of ' + last.topics : '') + '</span><span class="sail">' + ICONS.play + 'Set sail</span></a>';
    } else {
      h += '<a class="nextstop" href="dsa.html#dsa01"><span class="kicker">First stop · place 1 · Foundation Isle</span><b>Programming Foundations</b><span>DSA + Math for CS · starts with a real-world legend</span><span class="sail">' + ICONS.play + 'Set sail</span></a>';
    }
    h += '</div>' + J.atlasHtml(S, R0, trackBy, last) + '</section>';

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
    var D = J.dest(), di = 0, dd = 0, nextP = [];
    D.tracks.forEach(function (t) { var g = S.track[t]; if (g) { di += g.items; dd += g.done; } });
    ['B', 'I', 'A', 'E'].forEach(function (lv) { D.tracks.forEach(function (t) { var tr = trackBy[t]; if (!tr) return; tr.modules.forEach(function (pm) { var mm = S.module[pm.id]; if (pm.level === lv && mm && !mm.full && nextP.length < 3) nextP.push(pm.title); }); }); });
    h += '<div class="jcard dest" id="dest"><div class="droles" role="group" aria-label="Choose a destination">' + J.ROLES.map(function (r) { return '<button type="button" class="drole" data-role="' + r.id + '" aria-pressed="' + (r === D) + '">' + esc(r.name.replace(' role', '')) + '</button>'; }).join('') + '</div>' +
      J.icon('flag', 'dflag') + '<b class="dname">Destination: ' + esc(D.name) + '</b><span class="dtx">' + J.pct(dd, di) + '% of the route travelled.' + (nextP.length ? ' Next on the route: ' + nextP.map(esc).join(', ') + '.' : '') + '</span><div class="jbar-p c-violet"><i style="width:' + J.pct(dd, di) + '%"></i></div></div></section>';

    h += '<section class="world" aria-labelledby="worldH"><div class="jrow"><h2 id="worldH">The world</h2><span class="muted">' + J.REGIONS.length + ' regions · ' + lands + ' lands</span></div><div class="wgrid">' +
      J.REGIONS.map(function (r) {
        return '<div class="jcard region" id="r-' + r.key + '"><span class="kicker c-' + r.color + '">' + J.icon(r.icon) + esc(r.area) + '</span><b class="rname">' + esc(r.name) + '</b>' + r.tracks.filter(function (t) { return trackBy[t]; }).map(function (t) {
          var g = S.track[t] || { items: 0, done: 0 }, p = J.pct(g.done, g.items);
          return '<a class="rland" href="' + t + '.html"><span>' + esc(trackBy[t].title) + '</span><span class="jbar-p c-' + r.color + '"><i style="width:' + (p ? Math.max(3, p) : 0) + '%"></i></span><span class="mono">' + p + '%</span></a>';
        }).join('') + '</div>';
      }).join('') +
      (function () { var extra = TRACKS.filter(function (t) { return J.regionOf(t.id).key === 'new'; }); return extra.length ? '<div class="jcard region" id="r-new"><span class="kicker c-sky">' + J.icon('compass') + 'New lands</span><b class="rname">Uncharted</b>' + extra.map(function (t) { var g = S.track[t.id] || { items: 0, done: 0 }, p = J.pct(g.done, g.items); return '<a class="rland" href="' + t.id + '.html"><span>' + esc(t.title) + '</span><span class="jbar-p c-sky"><i style="width:' + p + '%"></i></span><span class="mono">' + p + '%</span></a>'; }).join('') + '</div>' : '<div class="uncharted">Uncharted · new lands appear here as topics are added</div>'; })() +
      '</div></section>';

    h += '<section id="paths" class="jcard"><h2>Learning routes</h2><div class="ptabs" role="tablist" aria-label="Choose a learning route">' +
      LEARNING_PATHS.map(function (p, i) { return '<button type="button" class="ptab" role="tab" id="ptab' + i + '" aria-controls="proute" aria-selected="' + (i === 1 ? 'true' : 'false') + '" data-path="' + i + '">' + esc(p.name) + ' · ' + esc(p.time) + '</button>'; }).join('') +
      '</div><ol class="route" id="proute" role="tabpanel" aria-labelledby="ptab1"></ol></section>';
    h += '<footer class="jfoot">' + (window.IM_VERSION ? '<span>Interview Mastery v' + esc(window.IM_VERSION) + '</span>' : '') + '<a href="privacy.html">Privacy policy</a><a href="https://github.com/SHRENIKYD/DSA-LEARNINGS">Source on GitHub</a><button class="btn ghost" type="button" id="resetProgress">Reset all progress</button></footer>';
    $('#main').innerHTML = h;
    J.mountAtlas(S, trackBy, last);

    var pickPath = function (i) {
      $$('.ptab').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-path') === String(i) ? 'true' : 'false'); });
      $('#proute').setAttribute('aria-labelledby', 'ptab' + i);
      $('#proute').innerHTML = LEARNING_PATHS[i].route.split(/\s*·\s*|\s*→\s*/).filter(Boolean).map(function (s) { return '<li><span>' + esc(s.replace(/\.$/, '')) + '</span></li>'; }).join('');
    };
    $('.ptabs').addEventListener('click', function (e) { var b = e.target.closest('.ptab'); if (b) pickPath(+b.getAttribute('data-path')); });
    pickPath(1);
  }

  /* ---------- account sync ---------- */
  function reloadDone() {
    DONE = store.get('imastery.done', {}) || {};
    if (HOME) { renderHome(); return; }
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

  return { track: track, home: home, renderPart: renderPart, highlight: highlight, dedent: dedent, PART: PART, items: items };
})();

