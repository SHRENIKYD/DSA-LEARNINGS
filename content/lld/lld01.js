(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ------------------------------------------------------------------
     Shared visualizer helpers for this module (UML class + sequence)
     ------------------------------------------------------------------ */
  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  function bx(id, label, x, y, w) {
    var n = { id: id, label: label === undefined ? id : label, x: x, y: y, shape: 'box' };
    if (w) n.w = w;
    return n;
  }
  function plural(w) { return /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : /(s|x|ch|sh)$/.test(w) ? w + 'es' : w + 's'; }
  function snake(s) { return s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase(); }
  // Neutral class model -> skeleton source in python / ts / cpp (the Java skeleton is built separately).
  // class = { n, iface, ext, impl:[], fields:[{ t, n, list, own, c }], methods:[{ n, ps:[[type, name]], c }] }
  function emitSkeleton(classes, lang) {
    return classes.map(function (c) {
      var fs = c.fields, ms = c.methods, L = [];
      if (lang === 'python') {
        var bases = (c.ext ? [c.ext] : []).concat(c.impl, c.iface ? ['ABC'] : []);
        L.push('class ' + c.n + (bases.length ? '(' + bases.join(', ') + ')' : '') + ':');
        if (fs.length) L.push('    def __init__(self):');
        fs.forEach(function (f) { L.push('        self.' + snake(f.n) + ' = ' + (f.list ? '[]' : f.own ? f.t + '()' : 'None') + (f.c ? '  # ' + f.c : '')); });
        ms.forEach(function (m) { L.push('    def ' + snake(m.n) + '(' + ['self'].concat(m.ps.map(function (p) { return snake(p[1]); })).join(', ') + '):\n        pass' + (m.c ? '  # ' + m.c : '')); });
        if (!fs.length && !ms.length) L.push('    pass');
        return L.join('\n');
      }
      if (lang === 'ts') {
        var head = (c.iface ? 'interface ' : 'class ') + c.n + (c.ext ? ' extends ' + c.ext : '') + (c.impl.length ? ' implements ' + c.impl.join(', ') : '');
        fs.forEach(function (f) { L.push('    ' + (f.list ? 'private readonly ' + f.n + ': ' + f.t + '[] = [];' : f.own ? 'private readonly ' + f.n + ' = new ' + f.t + '();' : 'private ' + f.n + ': ' + f.t + ' | null = null;') + (f.c ? ' // ' + f.c : '')); });
        ms.forEach(function (m) { L.push('    ' + m.n + '(' + m.ps.map(function (p) { return p[1] + ': ' + p[0]; }).join(', ') + '): void { ' + (m.c ? '/* ' + m.c + ' */ ' : '') + '}'); });
        return head + ' {' + (L.length ? '\n' + L.join('\n') + '\n' : ' ') + '}';
      }
      var bs = (c.ext ? [c.ext] : []).concat(c.impl).map(function (b) { return 'public ' + b; });
      var h = 'class ' + c.n + (bs.length ? ' : ' + bs.join(', ') : '');
      fs.forEach(function (f) { L.push('    ' + (f.list ? 'vector<' + f.t + (f.own ? '' : '*') + '> ' + f.n + ';' : f.own ? f.t + ' ' + f.n + ';' : f.t + '* ' + f.n + ' = nullptr;') + (f.c ? ' // ' + f.c : '')); });
      if (ms.length || c.iface) L.push('public:');
      if (c.iface) L.push('    virtual ~' + c.n + '() = default;');
      ms.forEach(function (m) { L.push('    void ' + m.n + '(' + m.ps.map(function (p) { return p[0] + '& ' + p[1]; }).join(', ') + ') { ' + (m.c ? '/* ' + m.c + ' */ ' : '') + '}'); });
      return h + ' {' + (L.length ? '\n' + L.join('\n') + '\n' : ' ') + '};';
    }).join('\n');
  }
  function skeletonAlt(classes) {
    return { python: { code: emitSkeleton(classes, 'python') }, js: { lang: 'ts', code: emitSkeleton(classes, 'ts') }, cpp: { code: emitSkeleton(classes, 'cpp') } };
  }
  function hesc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // Build a UML class diagram one step at a time.
  // step = { narr, nodes, edges, hl, ehl, tags, rows:[[cls, attrs, ops]], code, codeHl, codeLabel, extra, noTable }
  function uml(title, height, steps) {
    var nodes = [], edges = [], rows = [], tags = {}, frames = [];
    steps.forEach(function (s) {
      var hl = {}, ehl = {}, rhl = {}, k;
      nodes.forEach(function (n) { hl[n.id] = 'done'; });
      (s.nodes || []).forEach(function (n) { nodes.push(n); hl[n.id] = 'ok'; });
      (s.edges || []).forEach(function (e) { edges.push(e); ehl[e[0] + '-' + e[1]] = 'cur'; });
      if (s.hl) for (k in s.hl) hl[k] = s.hl[k];
      if (s.ehl) for (k in s.ehl) ehl[k] = s.ehl[k];
      if (s.tags) for (k in s.tags) tags[k] = s.tags[k];
      (s.rows || []).forEach(function (r) {
        var idx = -1;
        rows.forEach(function (old, j) { if (old[0] === r[0]) idx = j; });
        if (idx < 0) { rows.push(r); idx = rows.length - 1; } else rows[idx] = r;
        rhl[idx] = 'ok';
      });
      var parts = [{ type: 'graph', label: title, directed: true, height: height, nodes: cp(nodes), edges: cp(edges), hl: hl, ehl: ehl, tags: cp(tags) }];
      if (rows.length && !s.noTable) parts.push({ type: 'table', label: 'Class boxes: name | attributes | operations', columns: ['Class', 'Attributes', 'Operations'], rows: cp(rows), hl: rhl });
      if (s.code) parts.push({ type: 'code', label: s.codeLabel || 'Code skeleton so far', lang: 'java', code: s.code, hl: s.codeHl || {}, alt: s.alt });
      if (s.extra) parts = parts.concat(s.extra);
      frames.push({ narr: s.narr, parts: parts });
    });
    return frames;
  }

  // Build a UML sequence diagram message by message.
  // who = ['Customer', 'ATM', 'Bank'];  msgs = [{ f, t, m, ret?, narr, line? }]
  function seq(title, who, msgs, opt) {
    opt = opt || {};
    var n = who.length, X = {}, ID = {}, frames = [];
    who.forEach(function (p, i) { X[p] = Math.round(100 * (i + 0.5) / n); ID[p] = 'P' + i; });
    var height = 18 + msgs.length * 9;
    var base = who.map(function (p) { return bx(ID[p], p, X[p], 6); });
    var allHl = {};
    who.forEach(function (p) { allHl[ID[p]] = 'sel'; });
    var intro = [{ type: 'graph', label: title, directed: true, height: height, nodes: cp(base), edges: [], hl: allHl }];
    if (opt.code) intro.push({ type: 'code', label: opt.codeLabel || 'The code this diagram describes', lang: 'java', code: opt.code, hl: {}, alt: opt.alt });
    frames.push({ narr: opt.intro || 'Lifelines first: one box per object taking part. Time flows <b>downwards</b>.', parts: intro });
    var nodes = cp(base), edges = [], log = [];
    msgs.forEach(function (msg, k) {
      var y = 16 + k * 9, a = 'a' + k, b = 'b' + k;
      var xb = msg.f === msg.t ? Math.min(97, X[msg.f] + 10) : X[msg.t];
      nodes.push({ id: a, label: String(k + 1), x: X[msg.f], y: y });
      nodes.push({ id: b, label: String(k + 1), x: xb, y: y });
      edges.push([a, b, (msg.ret ? 'return ' : '') + msg.m]);
      log.push([String(k + 1), msg.f, msg.t, (msg.ret ? '(return) ' : '') + msg.m]);
      var hl = {}, ehl = {}, lhl = {};
      edges.forEach(function (e) { ehl[e[0] + '-' + e[1]] = 'done'; });
      ehl[a + '-' + b] = msg.ret ? 'ok' : 'cur';
      hl[ID[msg.f]] = 'cur'; hl[ID[msg.t]] = 'ok'; hl[a] = 'cur'; hl[b] = 'ok';
      lhl[k] = 'cur';
      var parts = [
        { type: 'graph', label: title, directed: true, height: height, nodes: cp(nodes), edges: cp(edges), hl: hl, ehl: ehl },
        { type: 'table', label: 'Message log (read top to bottom = time order)', columns: ['#', 'from', 'to', 'message'], rows: cp(log), hl: lhl }
      ];
      if (opt.code) { var ch = {}; if (msg.line) ch[msg.line] = msg.ret ? 'ok' : 'cur'; parts.push({ type: 'code', label: opt.codeLabel || 'The code this diagram describes', lang: 'java', code: opt.code, hl: ch, alt: opt.alt }); }
      frames.push({ narr: msg.narr || ('<b>' + hesc(msg.f) + '</b> ' + (msg.ret ? 'returns <b>' + hesc(msg.m) + '</b> to ' : 'calls <b>' + hesc(msg.m) + '</b> on ') + '<b>' + hesc(msg.t) + '</b>.'), parts: parts });
    });
    var fin = {};
    edges.forEach(function (e) { fin[e[0] + '-' + e[1]] = 'ok'; });
    var last = [{ type: 'graph', label: title, directed: true, height: height, nodes: cp(nodes), edges: cp(edges), ehl: fin }, { type: 'table', label: 'Full message log', columns: ['#', 'from', 'to', 'message'], rows: cp(log) }];
    if (opt.code) last.push({ type: 'code', label: opt.codeLabel || 'The code this diagram describes', lang: 'java', code: opt.code, hl: {}, alt: opt.alt });
    frames.push({ narr: opt.outro || 'Done. Read the numbers top to bottom and you can replay the whole use case.', parts: last });
    return frames;
  }

  // Parse a tiny sequence DSL:  "A -> B: msg; B --> A: reply"
  function parseSeq(input) {
    var clauses = String(input || '').split(/[;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!clauses.length) throw new Error('Write messages like: Customer -> ATM: insertCard; ATM --> Customer: askPin');
    if (clauses.length > 10) throw new Error('Use at most 10 messages');
    var who = [], msgs = [];
    clauses.forEach(function (c) {
      var m = c.match(/^([A-Za-z_][\w]*)\s*(-->|->)\s*([A-Za-z_][\w]*)\s*:\s*(.+)$/);
      if (!m) throw new Error('Could not read "' + c + '". Format: From -> To: message   (use --> for a return)');
      [m[1], m[3]].forEach(function (p) { if (who.indexOf(p) < 0) who.push(p); });
      msgs.push({ f: m[1], t: m[3], m: m[4].trim().slice(0, 24), ret: m[2] === '-->' });
    });
    if (who.length > 5) throw new Error('Use at most 5 participants so the diagram fits');
    return { who: who, msgs: msgs };
  }

  // Relationship DSL:  "Car *-- 1 Engine; Library o-- 0..* Book; Dog --|> Animal"
  var REL = [
    { op: '--|>', kind: 'inheritance', lab: 'is-a', test: 'Can you say "a CHILD IS A PARENT" in every situation? Then extends.', java: 'class CHILD extends PARENT' },
    { op: '..|>', kind: 'realization', lab: 'implements', test: 'CHILD promises the abilities listed by the PARENT interface.', java: 'class CHILD implements PARENT' },
    { op: '*--', kind: 'composition', lab: '◆ owns', test: 'Delete the CHILD-owner (whole) and the part dies with it. The part is never shared.', java: 'private final PART part = new PART(); // created inside' },
    { op: 'o--', kind: 'aggregation', lab: '◇ has-a', test: 'The whole groups the parts, but parts live on (and can be shared) after the whole is gone.', java: 'private final List<PART> parts = new ArrayList<>(); // passed in from outside' },
    { op: '..>', kind: 'dependency', lab: 'uses', test: 'Only used briefly: a method parameter or local variable, never stored.', java: 'void work(PART p) { p.doSomething(); } // no field' },
    { op: '-->', kind: 'association', lab: 'knows →', test: 'A long-lived link: one object keeps a reference to another, but neither owns the other.', java: 'private PART part; // a reference field' },
    { op: '--', kind: 'association', lab: 'knows', test: 'A two-way long-lived link (both sides hold a reference).', java: 'private PART part; // and PART keeps a reference back' }
  ];
  // Layered layout: links = [[upper, lower]] (parent above child, whole above part). Returns {name: [x, y]}.
  function layout(names, links) {
    var depth = {}, it, rows = [[], [], [], []], pos = {};
    names.forEach(function (n) { depth[n] = 0; });
    for (it = 0; it < 10; it++) links.forEach(function (l) { if (l[0] !== l[1] && depth[l[1]] < depth[l[0]] + 1 && depth[l[0]] < 3) depth[l[1]] = depth[l[0]] + 1; });
    names.forEach(function (n) {
      var r = Math.min(3, depth[n]);
      while (r < 3 && rows[r].length >= 4) r++;
      if (rows[r].length >= 4) { r = 0; while (r < 3 && rows[r].length >= 4) r++; }
      rows[r].push(n);
    });
    rows.forEach(function (row, r) { row.forEach(function (n, i) { pos[n] = [Math.round(100 * (i + 0.5) / row.length), 8 + r * 19]; }); });
    return pos;
  }

  function relFrames(input, title) {
    var clauses = String(input || '').split(/[;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!clauses.length) throw new Error('Write relations like: Car *-- 1 Engine; Library o-- 0..* Book; Dog --|> Animal');
    if (clauses.length > 9) throw new Error('Use at most 9 relations');
    var rels = [], names = [];
    clauses.forEach(function (c) {
      var m = c.match(/^([A-Za-z_]\w*)\s*(--\|>|\.\.\|>|\*--|o--|\.\.>|-->|--)\s*([0-9*.n]+\s+)?([A-Za-z_]\w*)$/);
      if (!m) throw new Error('Could not read "' + c + '". Use A *-- B, A o-- 0..* B, A --> B, A -- B, A ..> B, A --|> B, A ..|> B');
      var r = REL.filter(function (x) { return x.op === m[2]; })[0];
      rels.push({ a: m[1], b: m[4], r: r, mult: (m[3] || '').trim() });
      [m[1], m[4]].forEach(function (p) { if (names.indexOf(p) < 0) names.push(p); });
    });
    if (names.length > 9) throw new Error('Use at most 9 classes so the diagram fits');
    var pos = layout(names, rels.map(function (x) { return /inheritance|realization/.test(x.r.kind) ? [x.b, x.a] : [x.a, x.b]; }));
    var steps = [], summary = [], isIface = {};
    rels.forEach(function (x) { if (x.r.kind === 'realization') isIface[x.b] = true; });
    rels.forEach(function (x, i) {
      var nodes = [];
      [x.a, x.b].forEach(function (p) { if (!pos[p].shown) { pos[p].shown = true; nodes.push(bx(p, p.slice(0, 14), pos[p][0], pos[p][1])); } });
      var lab = x.r.lab + (x.mult ? ' ' + x.mult : '');
      summary.push([x.a, x.r.kind, x.b, x.mult || '-', x.r.java.replace(/PART|PARENT/g, x.b).replace(/CHILD/g, x.a)]);
      var tg = {};
      if (isIface[x.b]) tg[x.b] = '«interface»';
      var hl = {}; hl[x.a] = 'cur'; hl[x.b] = 'ok';
      steps.push({
        narr: '<b>' + hesc(x.a) + ' ' + hesc(x.r.op) + ' ' + hesc(x.b) + '</b> is <b>' + x.r.kind + '</b>' + (x.mult ? ' with multiplicity <b>' + hesc(x.mult) + '</b>' : '') + '. ' +
          hesc(x.r.test.replace(/CHILD-owner/g, x.a).replace(/CHILD/g, x.a).replace(/PARENT/g, x.b)) + ' Code shape (Java): <code>' + hesc(x.r.java.replace(/PART|PARENT/g, x.b).replace(/CHILD/g, x.a)) + '</code>',
        nodes: nodes, edges: [[x.a, x.b, lab]], hl: hl, tags: tg, noTable: true,
        extra: [{ type: 'table', label: 'Relationships so far', columns: ['From', 'Kind', 'To', 'Mult.', 'Code shape (Java)'], rows: cp(summary), hl: (function () { var h = {}; h[i] = 'cur'; return h; })() }]
      });
    });
    // generate a Java skeleton
    var cls = {};
    var ncls = {};
    names.forEach(function (n) { cls[n] = { ext: null, impl: [], body: [] }; ncls[n] = { n: n, iface: !!isIface[n], ext: null, impl: [], fields: [], methods: [] }; });
    rels.forEach(function (x) {
      var A = cls[x.a], NA = ncls[x.a], many = ['', '1', '0..1'].indexOf(x.mult) < 0, fld = x.b.charAt(0).toLowerCase() + x.b.slice(1);
      if (x.r.kind === 'inheritance') NA.ext = x.b;
      else if (x.r.kind === 'realization') NA.impl.push(x.b);
      else if (x.r.kind === 'composition') NA.fields.push({ t: x.b, n: many ? plural(fld) : fld, list: many, own: true, c: many ? 'owned: created inside, never handed out' : 'owned: born and dies with ' + x.a });
      else if (x.r.kind === 'aggregation') NA.fields.push({ t: x.b, n: many ? plural(fld) : fld, list: many, own: false, c: many ? 'shared parts, added from outside' : 'set from outside, may outlive ' + x.a });
      else if (x.r.kind === 'dependency') NA.methods.push({ n: 'use', ps: [[x.b, fld]], c: 'uses it briefly, keeps no field' });
      else {
        NA.fields.push({ t: x.b, n: many ? plural(fld) : fld, list: many, own: false, c: many ? 'association' : 'association (reference)' });
        if (x.r.op === '--') ncls[x.b].fields.push({ t: x.a, n: x.a.charAt(0).toLowerCase() + x.a.slice(1), list: false, own: false, c: 'back-reference (two-way link)' });
      }
      if (x.r.kind === 'inheritance') A.ext = x.b;
      else if (x.r.kind === 'realization') A.impl.push(x.b);
      else if (x.r.kind === 'composition') A.body.push(many ? '    private final List<' + x.b + '> ' + plural(fld) + ' = new ArrayList<>(); // owned: created inside, never handed out' : '    private final ' + x.b + ' ' + fld + ' = new ' + x.b + '(); // owned: born and dies with ' + x.a);
      else if (x.r.kind === 'aggregation') A.body.push(many ? '    private final List<' + x.b + '> ' + plural(fld) + ' = new ArrayList<>(); // shared parts, added from outside' : '    private ' + x.b + ' ' + fld + '; // set from outside, may outlive ' + x.a);
      else if (x.r.kind === 'dependency') A.body.push('    void use(' + x.b + ' ' + fld + ') { /* uses it briefly, keeps no field */ }');
      else { A.body.push(many ? '    private final List<' + x.b + '> ' + plural(fld) + ' = new ArrayList<>(); // association' : '    private ' + x.b + ' ' + fld + '; // association (reference)'); if (x.r.op === '--') cls[x.b].body.push('    private ' + x.a + ' ' + x.a.charAt(0).toLowerCase() + x.a.slice(1) + '; // back-reference (two-way link)'); }
    });
    var code = names.map(function (n) {
      var c = cls[n];
      var head = (isIface[n] ? 'interface ' : 'class ') + n + (c.ext ? ' extends ' + c.ext : '') + (c.impl.length ? ' implements ' + c.impl.join(', ') : '');
      return head + ' {' + (c.body.length ? '\n' + c.body.join('\n') + '\n' : ' ') + '}';
    }).join('\n');
    var fin = {};
    rels.forEach(function (x) { fin[x.a + '-' + x.b] = 'ok'; });
    steps.push({ narr: 'Finished diagram. Every arrow became a <b>field</b>, a <b>constructor/parameter</b>, an <b>extends</b> or an <b>implements</b> in the code skeleton below. Edit the input and press run to model your own system.', ehl: fin, noTable: true, code: code, codeLabel: 'Generated code skeleton', alt: skeletonAlt(names.map(function (n) { return ncls[n]; })),
      extra: [{ type: 'table', label: 'All relationships', columns: ['From', 'Kind', 'To', 'Mult.', 'Code shape (Java)'], rows: cp(summary) }] });
    return uml(title || 'UML class diagram', 72, steps);
  }

  // Noun / verb requirement builder: "Member borrows Book; Library has Book; Librarian is Member"
  function nounVerbFrames(input) {
    var clauses = String(input || '').split(/[;.\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!clauses.length) throw new Error('Write short sentences like: Member borrows Book; Library has Book');
    if (clauses.length > 8) throw new Error('Use at most 8 sentences');
    var names = [], facts = [], verbs = [];
    function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
    clauses.forEach(function (c) {
      var t = c.split(/\s+/);
      if (t.length < 3) throw new Error('Each sentence needs Subject verb Object, e.g. "Member borrows Book"');
      var s = cap(t[0]), o = cap(t[t.length - 1]), v = t.slice(1, t.length - 1).join(' ').toLowerCase();
      if (!/^[A-Za-z]\w*$/.test(s) || !/^[A-Za-z]\w*$/.test(o)) throw new Error('Subject and object must be single words (class names)');
      var kind = /^(has|have|owns|contains|holds|has many|has a|has an)$/.test(v) ? 'has' : /^(is|is a|is an|is a kind of)$/.test(v) ? 'is' : 'does';
      facts.push({ s: s, o: o, v: v, kind: kind });
      [s, o].forEach(function (p) { if (names.indexOf(p) < 0) names.push(p); });
      if (kind === 'does' && verbs.indexOf(v) < 0) verbs.push(v);
    });
    if (names.length > 9) throw new Error('Use at most 9 different nouns');
    var pos = layout(names, facts.map(function (f) { return f.kind === 'is' ? [f.o, f.s] : [f.s, f.o]; }));
    var model = {};
    names.forEach(function (n) { model[n] = { attrs: [], ops: [], ext: null, nf: [], nm: [] }; });
    var chipHl = {};
    names.forEach(function (n) { chipHl[n] = 'ok'; });
    verbs.forEach(function (v) { chipHl[v] = 'win'; });
    var steps = [{
      narr: 'Step 0: underline the <b>nouns</b> (green: candidate classes) and the <b>verbs</b> (blue: candidate methods). This is classic <b>noun-verb analysis</b>.',
      noTable: true,
      extra: [{ type: 'set', label: 'Nouns and verbs found in the requirement', items: names.concat(verbs), hl: chipHl }, { type: 'text', html: '<b>Requirement:</b> ' + hesc(clauses.join('. ')) + '.' }]
    }];
    function base(v) { var w = v.split(' ')[0]; if (/ies$/.test(w)) return w.slice(0, -3) + 'y'; if (/(ss|sh|ch|x)es$/.test(w)) return w.slice(0, -2); if (/s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1); return w; }
    facts.forEach(function (f, i) {
      var nodes = [];
      [f.s, f.o].forEach(function (p) { if (!pos[p].shown) { pos[p].shown = true; nodes.push(bx(p, p.slice(0, 14), pos[p][0], pos[p][1])); } });
      var lab, narr, low = f.o.charAt(0).toLowerCase() + f.o.slice(1);
      if (f.kind === 'has') { model[f.s].attrs.push('List<' + f.o + '> ' + plural(low)); model[f.s].nf.push({ t: f.o, n: plural(low), list: true, own: true, c: null }); lab = 'has-a 0..*'; narr = '"' + hesc(f.s + ' ' + f.v + ' ' + f.o) + '" is a <b>has-a</b> phrase, so ' + hesc(f.s) + ' gets a <b>field</b> holding ' + hesc(f.o) + ' objects, not a method.'; }
      else if (f.kind === 'is') { model[f.s].ext = f.o; lab = 'is-a'; narr = '"' + hesc(f.s + ' ' + f.v + ' ' + f.o) + '" is an <b>is-a</b> phrase, so ' + hesc(f.s) + ' <b>extends</b> ' + hesc(f.o) + ' (check it is true in every case first!).'; }
      else { var mth = base(f.v) + f.o + '(' + f.o + ' ' + low + ')'; model[f.s].ops.push(mth); model[f.s].nm.push({ n: base(f.v) + f.o, ps: [[f.o, low]], c: null }); lab = base(f.v); narr = 'The verb <b>' + hesc(f.v) + '</b> becomes a <b>method</b> on the actor who does it: <code>' + hesc(f.s) + '.' + hesc(mth) + '</code>. The arrow shows ' + hesc(f.s) + ' <b>uses</b> ' + hesc(f.o) + '.'; }
      var rows = [f.s, f.o].map(function (n) { var m = model[n]; return [n + (m.ext ? ' extends ' + m.ext : ''), m.attrs.join(', ') || '-', m.ops.join(', ') || '-']; });
      var hl = {}; hl[f.s] = 'cur'; hl[f.o] = 'ok';
      steps.push({ narr: 'Sentence ' + (i + 1) + ': ' + narr, nodes: nodes, edges: [[f.s, f.o, lab]], hl: hl, rows: rows });
    });
    var code = names.map(function (n) {
      var m = model[n], body = [];
      m.attrs.forEach(function (a) { body.push('    private final ' + a + ' = new ArrayList<>();'); });
      m.ops.forEach(function (o) { body.push('    void ' + o + ' { }'); });
      return 'class ' + n + (m.ext ? ' extends ' + m.ext : '') + ' {' + (body.length ? '\n' + body.join('\n') + '\n' : ' ') + '}';
    }).join('\n');
    steps.push({ narr: 'Last step: turn the diagram into a code skeleton. Nouns became classes, has-a became fields, is-a became extends, verbs became methods. Now <b>prune</b>: delete nouns that are just values (name, date) and merge synonyms.', code: code, codeLabel: 'Generated code skeleton', alt: skeletonAlt(names.map(function (n) { var m = model[n]; return { n: n, iface: false, ext: m.ext, impl: [], fields: m.nf, methods: m.nm }; })) });
    return uml('Class diagram built from the requirement', 72, steps);
  }

  /* =========================== TOPIC 1 =========================== */
  topics.push({
    title: 'Thinking in Objects: Classes, Objects, State & Behaviour',
    analogy: `<p>Think of a <b>cookie cutter</b> and the <b>cookies</b> it makes. The cutter is the <b>class</b>: it decides the shape. Each cookie is an <b>object</b>: it has its own sprinkles (its own <i>state</i>), and you can eat one without touching the others. You only make one cutter, but you can make a thousand cookies.</p>
<p>A second picture: a small <b>office</b>. Each employee has a desk drawer (private data) and a job description (what you may ask them to do). You never open a colleague's drawer and change their files yourself. You <i>ask</i> them: "please file this invoice". That polite rule is the heart of object-oriented design.</p>`,
    explain: `<p><b>Object-oriented design (OOD)</b> means: break a big problem into small "workers" (objects), each of which <b>knows</b> some things and <b>does</b> some things. Low-Level Design (LLD) interviews test exactly this: can you turn a messy paragraph of requirements into clean, cooperating classes?</p>
<p>Every object has three things:</p>
${H.table(['Part', 'Plain meaning', 'In code', 'Dog example'], [
  ['<b>State</b>', 'what it knows right now', 'fields', '<code>name = "Rex"</code>, <code>age = 3</code>'],
  ['<b>Behaviour</b>', 'what you can ask it to do', 'methods', '<code>bark()</code>, <code>birthday()</code>'],
  ['<b>Identity</b>', 'which one it is, even if two look identical', 'its reference or address', 'two dogs both called Rex are still two dogs']
])}
<p>A <b>class</b> is the blueprint (written once). An <b>object</b> (also called an <i>instance</i>) is one thing built from it at runtime (<code>new Dog(...)</code> in Java, TypeScript and C++; plain <code>Dog(...)</code> in Python). A <b>reference</b> is the "remote control" a variable holds to reach the object; two variables can hold remotes to the <i>same</i> object.</p>
<h4>The four pillars, in one line each</h4>
<ul>
<li><b>Encapsulation</b>: keep data private and change it only through methods that protect the rules (a balance can never go negative). ${H.c('g', 'The drawer is locked; you ask the owner.')}</li>
<li><b>Abstraction</b>: show <i>what</i> something does, hide <i>how</i>. You press "brake"; you do not manage hydraulic pressure.</li>
<li><b>Inheritance</b>: a <i>kind-of</i> link. A <code>SavingsAccount</code> is a kind of <code>Account</code> and reuses its code.</li>
<li><b>Polymorphism</b>: "many shapes". One call, <code>shape.area()</code>, runs the right code for a circle or a square without an if/else.</li>
</ul>
<h4>The mindset switch</h4>
<p>Beginners write <b>procedures that push data around</b>: <code>if (account.balance &gt;= amt) account.balance -= amt;</code> scattered everywhere. OO designers give that rule to the object that owns the data: <code>account.withdraw(amt)</code>. This is called <b>Tell, Don't Ask</b>: tell the object what you want, don't ask for its data and decide for it. The rule now lives in exactly <b>one</b> place, so it cannot be forgotten.</p>
<p>A good class has <b>one clear job</b>, a small public surface (few methods), private fields, and a constructor that makes it valid from birth (no half-built objects).</p>`,
    clues: [
      '"Design the classes for…" / "Model this domain" / "What objects would you create?" → start with objects, state and behaviour.',
      '"The balance must never go negative" / "seat cannot be double-booked" → an <b>invariant</b>: encapsulate it inside the owning class.',
      '"Machine coding round, 60–90 minutes, working code" → small classes with private fields and clear methods beat one giant class.',
      '"Two orders with the same items, are they the same order?" → identity vs equality (<code>==</code> vs <code>equals</code>).',
      '"Make it easy to add new types later" → abstraction + polymorphism (an interface with several implementations).',
      '"Value that never changes, like Money or Coordinates" → an immutable value object (Java <code>record</code>, Python frozen <code>@dataclass</code>, C++ <code>struct</code>).'
    ],
    code: [{ lang: 'java', code: `
class Dog {
    // STATE: private fields, nobody outside can touch them directly
    private final String name;   // final: a dog's name never changes after birth
    private int age;

    // CONSTRUCTOR: the only way to create a Dog, so every Dog starts valid
    Dog(String name, int age) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name required");
        if (age < 0) throw new IllegalArgumentException("age must be >= 0");
        this.name = name;
        this.age = age;
    }

    // BEHAVIOUR: methods that use and protect the state
    void birthday() { age++; }                 // the only way age can change
    String bark() { return name + " says Woof!"; }
    int getAge() { return age; }               // read-only view, no setter
    String getName() { return name; }

    public static void main(String[] args) {
        Dog rex = new Dog("Rex", 3);   // object #1
        Dog bo = new Dog("Bo", 5);     // object #2
        Dog alias = rex;               // NOT a new dog: a second reference to object #1
        alias.birthday();              // changes object #1
        System.out.println(rex.getAge());   // 4, because rex and alias point to the same object
        System.out.println(bo.bark());
    }
}`,
alt: [
  { lang: 'python', code: `
class Dog:
    # STATE: "private by convention" (leading underscore); nobody should touch it directly
    def __init__(self, name: str, age: int) -> None:
        # CONSTRUCTOR: the only way to create a Dog, so every Dog starts valid
        if not name or not name.strip():
            raise ValueError("name required")
        if age < 0:
            raise ValueError("age must be >= 0")
        self._name = name  # never reassigned: a dog's name never changes after birth
        self._age = age

    # BEHAVIOUR: methods that use and protect the state
    def birthday(self) -> None:  # the only way age can change
        self._age += 1

    def bark(self) -> str:
        return f"{self._name} says Woof!"

    @property
    def age(self) -> int:  # read-only view, no setter
        return self._age

    @property
    def name(self) -> str:
        return self._name


rex = Dog("Rex", 3)  # object #1
bo = Dog("Bo", 5)  # object #2
alias = rex  # NOT a new dog: a second reference to object #1
alias.birthday()  # changes object #1
print(rex.age)  # 4, because rex and alias point to the same object
print(bo.bark())` },
  { lang: 'ts', code: `
class Dog {
  // STATE: private fields, nobody outside can touch them directly
  private readonly name: string; // readonly: a dog's name never changes after birth
  private age: number;

  // CONSTRUCTOR: the only way to create a Dog, so every Dog starts valid
  constructor(name: string, age: number) {
    if (name.trim() === "") throw new Error("name required");
    if (age < 0) throw new Error("age must be >= 0");
    this.name = name;
    this.age = age;
  }

  // BEHAVIOUR: methods that use and protect the state
  birthday(): void { this.age++; } // the only way age can change
  bark(): string { return \`\${this.name} says Woof!\`; }
  getAge(): number { return this.age; } // read-only view, no setter
  getName(): string { return this.name; }
}

const rex = new Dog("Rex", 3); // object #1
const bo = new Dog("Bo", 5); // object #2
const alias = rex; // NOT a new dog: a second reference to object #1
alias.birthday(); // changes object #1
console.log(rex.getAge()); // 4, because rex and alias point to the same object
console.log(bo.bark());` },
  { lang: 'cpp', code: `
class Dog {
    // STATE: private members, nobody outside can touch them directly
    const string name_;  // const: a dog's name never changes after birth
    int age_;

public:
    // CONSTRUCTOR: the only way to create a Dog, so every Dog starts valid
    Dog(string name, int age) : name_(std::move(name)), age_(age) {
        if (name_.find_first_not_of(" \\t") == string::npos) throw invalid_argument("name required");
        if (age < 0) throw invalid_argument("age must be >= 0");
    }

    // BEHAVIOUR: methods that use and protect the state
    void birthday() { age_++; }  // the only way age can change
    string bark() const { return name_ + " says Woof!"; }
    int getAge() const { return age_; }  // read-only view, no setter
    const string& getName() const { return name_; }
};

int main() {
    Dog rex("Rex", 3);  // object #1
    Dog bo("Bo", 5);    // object #2
    Dog& alias = rex;   // NOT a new dog: a second reference to object #1
    alias.birthday();   // changes object #1
    cout << rex.getAge() << "\\n";  // 4, because rex and alias refer to the same object
    cout << bo.bark() << "\\n";
}` }
] }, { lang: 'java', code: `
// Encapsulation in action: the rule "balance >= 0" lives in ONE place.
class BankAccount {
    private final String accountNumber;
    private long balancePaise;                 // money in the smallest unit: no floating-point errors

    BankAccount(String accountNumber, long openingPaise) {
        if (openingPaise < 0) throw new IllegalArgumentException("opening balance cannot be negative");
        this.accountNumber = accountNumber;
        this.balancePaise = openingPaise;
    }

    void deposit(long paise) {
        if (paise <= 0) throw new IllegalArgumentException("deposit must be positive");
        balancePaise += paise;
    }

    boolean withdraw(long paise) {             // Tell, Don't Ask: callers just say "withdraw"
        if (paise <= 0 || paise > balancePaise) return false;   // invariant protected here
        balancePaise -= paise;
        return true;
    }

    long getBalancePaise() { return balancePaise; }
    String getAccountNumber() { return accountNumber; }
}`,
alt: [
  { lang: 'python', code: `
# Encapsulation in action: the rule "balance >= 0" lives in ONE place.
class BankAccount:
    def __init__(self, account_number: str, opening_paise: int) -> None:
        if opening_paise < 0:
            raise ValueError("opening balance cannot be negative")
        self._account_number = account_number
        self._balance_paise = opening_paise  # money in the smallest unit: no floating-point errors

    def deposit(self, paise: int) -> None:
        if paise <= 0:
            raise ValueError("deposit must be positive")
        self._balance_paise += paise

    def withdraw(self, paise: int) -> bool:  # Tell, Don't Ask: callers just say "withdraw"
        if paise <= 0 or paise > self._balance_paise:
            return False  # invariant protected here
        self._balance_paise -= paise
        return True

    @property
    def balance_paise(self) -> int:
        return self._balance_paise

    @property
    def account_number(self) -> str:
        return self._account_number` },
  { lang: 'ts', code: `
// Encapsulation in action: the rule "balance >= 0" lives in ONE place.
class BankAccount {
  private readonly accountNumber: string;
  private balancePaise: number; // money in the smallest unit: no floating-point errors

  constructor(accountNumber: string, openingPaise: number) {
    if (openingPaise < 0) throw new Error("opening balance cannot be negative");
    this.accountNumber = accountNumber;
    this.balancePaise = openingPaise;
  }

  deposit(paise: number): void {
    if (paise <= 0) throw new Error("deposit must be positive");
    this.balancePaise += paise;
  }

  withdraw(paise: number): boolean { // Tell, Don't Ask: callers just say "withdraw"
    if (paise <= 0 || paise > this.balancePaise) return false; // invariant protected here
    this.balancePaise -= paise;
    return true;
  }

  getBalancePaise(): number { return this.balancePaise; }
  getAccountNumber(): string { return this.accountNumber; }
}` },
  { lang: 'cpp', code: `
// Encapsulation in action: the rule "balance >= 0" lives in ONE place.
class BankAccount {
    string accountNumber_;
    long long balancePaise_;  // money in the smallest unit: no floating-point errors

public:
    BankAccount(string accountNumber, long long openingPaise)
        : accountNumber_(std::move(accountNumber)), balancePaise_(openingPaise) {
        if (openingPaise < 0) throw invalid_argument("opening balance cannot be negative");
    }

    void deposit(long long paise) {
        if (paise <= 0) throw invalid_argument("deposit must be positive");
        balancePaise_ += paise;
    }

    bool withdraw(long long paise) {  // Tell, Don't Ask: callers just say "withdraw"
        if (paise <= 0 || paise > balancePaise_) return false;  // invariant protected here
        balancePaise_ -= paise;
        return true;
    }

    long long getBalancePaise() const { return balancePaise_; }
    const string& getAccountNumber() const { return accountNumber_; }
};` }
] }],
    codeTitle: ['Class, objects, references (Dog)', 'Encapsulation protects an invariant (BankAccount)'],
    viz: [{
      title: 'Objects and references on the heap, line by line',
      gen: function () {
        var code = 'Dog rex = new Dog("Rex", 3);\nDog bo = new Dog("Bo", 5);\nDog alias = rex;\nalias.birthday();\nSystem.out.println(rex.getAge());\nbo = null;';
        var pyCode = 'rex = Dog("Rex", 3)\nbo = Dog("Bo", 5)\nalias = rex\nalias.birthday()\nprint(rex.get_age())\nbo = None';
        var tsCode = 'let rex = new Dog("Rex", 3);\nlet bo: Dog | null = new Dog("Bo", 5);\nlet alias = rex;\nalias.birthday();\nconsole.log(rex.getAge());\nbo = null;';
        var cppCode = 'Dog* rex = new Dog("Rex", 3);\nDog* bo = new Dog("Bo", 5);\nDog* alias = rex;\nalias->birthday();\ncout << rex->getAge() << endl;\nbo = nullptr;';
        var altCode = { python: { code: pyCode }, js: { lang: 'ts', code: tsCode }, cpp: { code: cppCode } };
        var vars = [bx('rex', 'rex', 12, 10), bx('bo', 'bo', 12, 30), bx('alias', 'alias', 12, 50)];
        var o1 = function (age) { return bx('O1', 'Dog#1 Rex, age ' + age, 70, 18, 30); };
        var o2 = bx('O2', 'Dog#2 Bo, age 5', 70, 42, 30);
        function f(narr, nodes, edges, hl, ehl, line, vals, tags) {
          var ch = {}; if (line) ch[line] = 'cur';
          return { narr: narr, parts: [
            { type: 'graph', label: 'Stack variables (left) hold references to objects on the heap (right)', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || {} },
            { type: 'code', label: 'Running code', lang: 'java', code: code, hl: ch, alt: altCode },
            { type: 'vars', label: 'What each variable holds', vals: vals }
          ] };
        }
        return [
          { narr: 'Before running anything there is only the <b>class</b> Dog: a blueprint with fields <code>name, age</code> and methods <code>birthday(), bark()</code>. No dogs exist yet.', parts: [
            { type: 'table', label: 'Class Dog (the blueprint)', columns: ['Class', 'Attributes', 'Operations'], rows: [['Dog', '- name: String, - age: int', '+ birthday(), + bark(): String, + getAge(): int']], hl: { 0: 'sel' } },
            { type: 'code', label: 'Running code', lang: 'java', code: code, hl: {}, alt: altCode }
          ] },
          f('<code>new Dog("Rex", 3)</code> builds object <b>#1</b> on the heap. The variable <code>rex</code> stores a <b>reference</b> (like a remote control) to it.', [vars[0], o1(3)], [['rex', 'O1', 'ref']], { rex: 'cur', O1: 'ok' }, { 'rex-O1': 'cur' }, 1, { rex: 'Dog#1', bo: '-', alias: '-' }),
          f('A second <code>new</code> builds a completely separate object <b>#2</b>. Each object has its <b>own</b> state.', [vars[0], vars[1], o1(3), o2], [['rex', 'O1', 'ref'], ['bo', 'O2', 'ref']], { bo: 'cur', O2: 'ok' }, { 'bo-O2': 'cur' }, 2, { rex: 'Dog#1', bo: 'Dog#2', alias: '-' }),
          f('<code>alias = rex</code> does <b>not</b> copy the dog. It copies the <b>remote control</b>. Now two variables point to the <b>same</b> object #1: same identity.', vars.concat([o1(3), o2]), [['rex', 'O1', 'ref'], ['bo', 'O2', 'ref'], ['alias', 'O1', 'same ref']], { alias: 'cur', O1: 'sel' }, { 'alias-O1': 'cur' }, 3, { rex: 'Dog#1', bo: 'Dog#2', alias: 'Dog#1' }),
          f('<code>alias.birthday()</code> sends a message to object #1. Its <b>state</b> changes from age 3 to 4. Notice we did not touch <code>age</code> directly: the object changed itself (encapsulation).', vars.concat([o1(4), o2]), [['rex', 'O1', 'ref'], ['bo', 'O2', 'ref'], ['alias', 'O1', 'birthday()']], { alias: 'cur', O1: 'ok' }, { 'alias-O1': 'ok' }, 4, { rex: 'Dog#1', bo: 'Dog#2', alias: 'Dog#1' }),
          f('<code>rex.getAge()</code> prints <b>4</b>, not 3. Surprise for beginners, obvious once you see both arrows land on one object. This is why shared mutable objects need care.', vars.concat([o1(4), o2]), [['rex', 'O1', 'getAge() = 4'], ['bo', 'O2', 'ref'], ['alias', 'O1', 'same ref']], { rex: 'cur', O1: 'sel' }, { 'rex-O1': 'cur' }, 5, { rex: 'Dog#1', bo: 'Dog#2', alias: 'Dog#1', printed: 4 }),
          f('<code>bo = null</code> drops the only reference to object #2. Nobody can reach it now, so the garbage collector may reclaim it. Objects live as long as something refers to them.', vars.concat([o1(4), o2]), [['rex', 'O1', 'ref'], ['alias', 'O1', 'same ref']], { bo: 'bad', O2: 'bad' }, {}, 6, { rex: 'Dog#1', bo: 'null', alias: 'Dog#1' }, { O2: 'unreachable: GC can free it' }),
          { narr: 'Summary: <b>class</b> = blueprint, <b>object</b> = a thing built from it with its own state, <b>reference</b> = how variables reach it. Many references can share one object.', parts: [
            { type: 'table', label: 'Three words people mix up', columns: ['Word', 'What it is', 'How many here'], rows: [['class Dog', 'the blueprint (code)', '1'], ['object', 'a Dog living on the heap', '2 created, 1 still reachable'], ['reference', 'variable that points to an object', '3 variables']], hl: { 1: 'ok' } }
          ] }
        ];
      }
    }, {
      title: 'Encapsulation guarding an invariant (balance never negative)',
      input: '500 -200 -400 -100 300',
      inputLabel: 'Deposits (+) and withdrawals (-) in rupees, space separated',
      gen: function (input) {
        var ops = String(input || '').trim().split(/[\s,]+/).map(Number);
        if (!ops.length || ops.some(function (x) { return isNaN(x) || x === 0; })) throw new Error('Enter non-zero numbers like: 500 -200 -400');
        if (ops.length > 12) throw new Error('Use at most 12 operations');
        var code = 'boolean withdraw(long amt) {\n    if (amt <= 0 || amt > balance) return false; // guard\n    balance -= amt;\n    return true;\n}\nvoid deposit(long amt) {\n    if (amt <= 0) throw new IllegalArgumentException();\n    balance += amt;\n}';
        var pyCode = 'def withdraw(self, amt):\n    if amt <= 0 or amt > self.balance: return False  # guard\n    self.balance -= amt\n    return True\ndef deposit(self, amt):\n    if amt <= 0: raise ValueError()\n    self.balance += amt';
        var tsCode = 'withdraw(amt: number): boolean {\n    if (amt <= 0 || amt > this.balance) return false; // guard\n    this.balance -= amt;\n    return true;\n}\ndeposit(amt: number): void {\n    if (amt <= 0) throw new Error("amount must be positive");\n    this.balance += amt;\n}';
        var cppCode = 'bool withdraw(long long amt) {\n    if (amt <= 0 || amt > balance) return false; // guard\n    balance -= amt;\n    return true;\n}\nvoid deposit(long long amt) {\n    if (amt <= 0) throw invalid_argument("amount must be positive");\n    balance += amt;\n}';
        var altCode = { python: { code: pyCode, map: { 7: 6, 8: 7 } }, js: { lang: 'ts', code: tsCode }, cpp: { code: cppCode } };
        var bal = 0, frames = [], hist = [];
        frames.push({ narr: 'A new account starts at balance 0. The field <code>balance</code> is <b>private</b>: the only doors are <code>deposit</code> and <code>withdraw</code>, and both check the rules.', parts: [
          { type: 'vars', label: 'BankAccount object state', vals: { balance: 0 } },
          { type: 'code', label: 'The only doors into the object', lang: 'java', code: code, hl: {}, alt: altCode }
        ] });
        ops.forEach(function (x) {
          var ok = true, hl;
          if (x > 0) { bal += x; hl = { 7: 'cur', 8: 'ok' }; }
          else if (-x > bal) { ok = false; hl = { 2: 'bad' }; }
          else { bal += x; hl = { 2: 'cur', 3: 'ok', 4: 'ok' }; }
          hist.push([x > 0 ? 'deposit(' + x + ')' : 'withdraw(' + (-x) + ')', ok ? 'accepted' : 'REJECTED', String(bal)]);
          var rh = {}; rh[hist.length - 1] = ok ? 'ok' : 'bad';
          frames.push({ narr: x > 0 ? 'Deposit <b>' + x + '</b>: positive, so accepted. Balance is now <b>' + bal + '</b>.' : (ok ? 'Withdraw <b>' + (-x) + '</b>: enough money, the guard passes, balance becomes <b>' + bal + '</b>.' : '<span class="c-r">Withdraw <b>' + (-x) + '</b> is more than the balance ' + bal + '.</span> The guard inside the object refuses it. No caller anywhere can break this rule because no caller can touch <code>balance</code> directly.'), parts: [
            { type: 'vars', label: 'BankAccount object state', vals: { balance: bal }, hl: { balance: ok ? 'ok' : 'bad' } },
            { type: 'code', label: 'The only doors into the object', lang: 'java', code: code, hl: hl, alt: altCode },
            { type: 'table', label: 'History', columns: ['call', 'result', 'balance after'], rows: cp(hist), hl: rh }
          ] });
        });
        frames.push({ narr: 'If <code>balance</code> were a <b>public</b> field, any of 50 classes could write <code>acc.balance -= x</code> and one of them would forget the check. Encapsulation puts the rule in <b>one place</b>.', parts: [
          { type: 'vars', label: 'Final state', vals: { balance: bal }, hl: { balance: 'sel' } },
          { type: 'table', label: 'History', columns: ['call', 'result', 'balance after'], rows: cp(hist) }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'A light switch: the smallest useful object', html: `<p>State: <code>on</code> (true/false). Behaviour: <code>toggle()</code>, <code>isOn()</code>. Identity: the kitchen switch and the bedroom switch are different objects even when both are off. Notice there is <b>no</b> <code>setOn(boolean)</code>: the real-world action is "toggle", so the method mirrors the real behaviour, not the field.</p>`, code: { lang: 'java', code: `
class LightSwitch {
    private boolean on;                  // state, starts false
    void toggle() { on = !on; }          // behaviour mirrors the real action
    boolean isOn() { return on; }
    public static void main(String[] args) {
        LightSwitch kitchen = new LightSwitch(), bedroom = new LightSwitch();
        kitchen.toggle();
        System.out.println(kitchen.isOn() + " " + bedroom.isOn()); // true false: separate objects
    }
}`,
alt: [
  { lang: 'python', code: `
class LightSwitch:
    def __init__(self) -> None:
        self._on = False  # state, starts False

    def toggle(self) -> None:  # behaviour mirrors the real action
        self._on = not self._on

    def is_on(self) -> bool:
        return self._on


kitchen, bedroom = LightSwitch(), LightSwitch()
kitchen.toggle()
print(str(kitchen.is_on()).lower(), str(bedroom.is_on()).lower())  # true false: separate objects` },
  { lang: 'ts', code: `
class LightSwitch {
  private on = false; // state, starts false
  toggle(): void { this.on = !this.on; } // behaviour mirrors the real action
  isOn(): boolean { return this.on; }
}

const kitchen = new LightSwitch(), bedroom = new LightSwitch();
kitchen.toggle();
console.log(kitchen.isOn() + " " + bedroom.isOn()); // true false: separate objects` },
  { lang: 'cpp', code: `
class LightSwitch {
    bool on_ = false;  // state, starts false
public:
    void toggle() { on_ = !on_; }  // behaviour mirrors the real action
    bool isOn() const { return on_; }
};

int main() {
    LightSwitch kitchen, bedroom;
    kitchen.toggle();
    cout << boolalpha << kitchen.isOn() << " " << bedroom.isOn() << "\\n";  // true false: separate objects
}` }
] } },
      { title: 'Identity vs equality: same object or same value?', html: `<p>Two <code>Point(2, 3)</code> objects are <b>equal</b> (same values) but not <b>identical</b> (different objects). In Java, <code>==</code> compares remotes (identity) and <code>equals()</code> compares contents (Python: <code>is</code> vs <code>==</code>; C++: addresses vs <code>operator==</code>; TypeScript: <code>===</code> is always identity for objects, so write an <code>equals</code> method). A Java <code>record</code>, a Python frozen <code>@dataclass</code> or a C++ defaulted <code>operator==</code> writes correct equality for you, which makes it perfect for <b>value objects</b> such as Money, Point, Address.</p>
${H.table(['Expression (Java)', 'Result', 'Why'], [['<code>p1 == p2</code>', H.c('r', 'false'), 'two different objects'], ['<code>p1.equals(p2)</code>', H.c('g', 'true'), 'a value type compares fields'], ['<code>p1 == p1</code>', H.c('g', 'true'), 'same object']])}`, code: { lang: 'java', code: `
record Point(int x, int y) { }
class IdentityDemo {
    public static void main(String[] args) {
        Point p1 = new Point(2, 3), p2 = new Point(2, 3);
        System.out.println(p1 == p2);        // false: different identity
        System.out.println(p1.equals(p2));   // true: equal values
    }
}`,
alt: [
  { lang: 'python', code: `
from dataclasses import dataclass


@dataclass(frozen=True)
class Point:  # value object: __eq__ and __hash__ are generated from the fields
    x: int
    y: int


p1, p2 = Point(2, 3), Point(2, 3)
print(str(p1 is p2).lower())  # false: different identity
print(str(p1 == p2).lower())  # true: equal values` },
  { lang: 'ts', code: `
// TypeScript has no built-in value equality: === compares identity for objects.
class Point {
  constructor(readonly x: number, readonly y: number) {}
  equals(o: Point): boolean { return this.x === o.x && this.y === o.y; }
}

const p1 = new Point(2, 3), p2 = new Point(2, 3);
console.log(p1 === p2); // false: different identity
console.log(p1.equals(p2)); // true: equal values` },
  { lang: 'cpp', code: `
struct Point {
    int x, y;
    bool operator==(const Point&) const = default;  // value equality, generated by the compiler
};

int main() {
    Point p1{2, 3}, p2{2, 3};
    cout << boolalpha;
    cout << (&p1 == &p2) << "\\n";  // false: different identity (different addresses)
    cout << (p1 == p2) << "\\n";    // true: equal values
}` }
] } },
      { title: 'Anemic object vs rich object (Order)', html: `<p><b>Anemic</b>: <code>Order</code> has only getters/setters; a service does <code>order.getItems().add(item); order.setTotal(order.getTotal() + item.price())</code>. Any caller can forget the total update or add items to a <i>shipped</i> order. <b>Rich</b>: <code>order.addItem(item)</code> checks the status and updates the total itself. Same data, but the rules now live with the data.</p>`, code: { lang: 'java', code: `
class Order {
    enum Status { OPEN, SHIPPED }
    private final List<String> items = new ArrayList<>();
    private long totalPaise;
    private Status status = Status.OPEN;

    void addItem(String sku, long pricePaise) {
        if (status != Status.OPEN) throw new IllegalStateException("cannot change a shipped order");
        items.add(sku);
        totalPaise += pricePaise;            // total can never drift out of sync
    }
    void ship() { status = Status.SHIPPED; }
    List<String> items() { return Collections.unmodifiableList(items); } // no back door
    long totalPaise() { return totalPaise; }
}`,
alt: [
  { lang: 'python', code: `
from enum import Enum


class Status(Enum):
    OPEN = 1
    SHIPPED = 2


class Order:
    def __init__(self) -> None:
        self._items: list[str] = []
        self._total_paise = 0
        self._status = Status.OPEN

    def add_item(self, sku: str, price_paise: int) -> None:
        if self._status is not Status.OPEN:
            raise RuntimeError("cannot change a shipped order")
        self._items.append(sku)
        self._total_paise += price_paise  # total can never drift out of sync

    def ship(self) -> None:
        self._status = Status.SHIPPED

    def items(self) -> tuple[str, ...]:
        return tuple(self._items)  # no back door: a read-only copy

    def total_paise(self) -> int:
        return self._total_paise` },
  { lang: 'ts', code: `
class Order {
  private readonly itemList: string[] = [];
  private total = 0;
  private status: "OPEN" | "SHIPPED" = "OPEN";

  addItem(sku: string, pricePaise: number): void {
    if (this.status !== "OPEN") throw new Error("cannot change a shipped order");
    this.itemList.push(sku);
    this.total += pricePaise; // total can never drift out of sync
  }
  ship(): void { this.status = "SHIPPED"; }
  items(): readonly string[] { return [...this.itemList]; } // no back door: a read-only copy
  totalPaise(): number { return this.total; }
}` },
  { lang: 'cpp', code: `
class Order {
    enum class Status { Open, Shipped };
    vector<string> items_;
    long long totalPaise_ = 0;
    Status status_ = Status::Open;

public:
    void addItem(const string& sku, long long pricePaise) {
        if (status_ != Status::Open) throw runtime_error("cannot change a shipped order");
        items_.push_back(sku);
        totalPaise_ += pricePaise;  // total can never drift out of sync
    }
    void ship() { status_ = Status::Shipped; }
    const vector<string>& items() const { return items_; }  // const reference: no back door
    long long totalPaise() const { return totalPaise_; }
};` }
] } }
    ],
    deepDive: `<p><b>Invariants are the real reason for encapsulation.</b> An invariant is a fact that must always be true about an object (<code>0 ≤ balance</code>, <code>total == sum(items)</code>, <code>status</code> follows legal transitions). If every path that changes state goes through a method that checks the invariant, the object can never be observed in a broken state. That is also why constructors should validate and why returning a mutable internal list (<code>return items;</code>) is a leak: the caller can bypass every rule. Return a read-only view or a copy instead (Java <code>List.copyOf</code>, Python <code>tuple(items)</code>, TypeScript a <code>readonly</code> array plus a copy, C++ a <code>const</code> reference).</p>
<p><b>Entities vs value objects.</b> An <i>entity</i> has an identity that survives change (a Customer with id 42 is still customer 42 after changing her address). A <i>value object</i> is defined only by its values and is usually immutable (Money(500, INR)). Model values as immutable value types (Java <code>record</code>, Python <code>@dataclass(frozen=True)</code>, C++ <code>struct</code> with a defaulted <code>operator==</code>, TypeScript <code>readonly</code> fields plus an <code>equals</code> method): thread-safe and free equality. Entities usually implement <code>equals</code> by id, or not at all.</p>
<p><b>Equality and hashing contract.</b> If two objects are equal (Java <code>equals</code>, Python <code>__eq__</code>, C++ <code>operator==</code>) their hashes must be equal (<code>hashCode</code>, <code>__hash__</code>, <code>std::hash</code>). Break it and hash sets and maps (<code>HashSet</code>, <code>set</code> / <code>dict</code>, <code>unordered_set</code>) silently lose objects. TypeScript's <code>Set</code> and <code>Map</code> compare objects by identity, so use a string key when you need value-equal lookups. Never use mutable fields in the hash of an object stored in a hash collection.</p>
<p><b>Static vs instance.</b> <code>static</code> belongs to the class (one copy), instance fields belong to each object. Overusing static turns OO design back into procedural code and makes testing hard (you cannot swap a static call for a fake).</p>
<p><b>Getters are not evil, setters often are.</b> A setter per field means the object has no rules. Prefer intention-revealing methods: <code>account.freeze()</code> instead of <code>setStatus(FROZEN)</code>. In interviews, saying "I avoid public setters so the object protects its invariants" is a strong signal.</p>
<p><b>Production reality:</b> frameworks like JPA/Hibernate want no-arg constructors and setters, which fights encapsulation; teams keep rich domain objects and map them to separate persistence classes, or use package-private setters. Know the tension; don't let the framework design your domain.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can spit out 15 classes with getters and setters in five seconds. Typing classes is no longer the hard part. The hard part, and what interviewers now probe harder, is <b>deciding who owns which rule</b>.</p>
<p><b>Use AI as a partner:</b> ask <code>List the entities, their state and their behaviours for a library system. Do not write code yet.</code> Then challenge it: <code>Which invariants does each class protect? Which setters can be removed?</code> This turns the AI into a sparring partner rather than an answer machine.</p>
<p><b>Where AI goes wrong:</b> it loves <i>anemic</i> models (data classes plus one huge <code>XyzService</code>), public setters for everything, <code>double</code> for money, and mutable lists returned straight from getters. It rarely adds constructor validation unless asked.</p>
<p><b>What you must still own:</b> spotting invariants in the requirement, putting each rule in exactly one class, and explaining <i>why</i> in plain words. In an AI-assisted machine-coding round, reviewers grade your judgement on the generated code, so practise reviewing for leaks like <code>return items;</code>.</p>`,
    problems: [{
      title: 'Model a Bank Account with Proper Encapsulation',
      level: 'Easy', tags: ['encapsulation', 'invariants', 'value object'], companies: ['Amazon', 'Flipkart', 'Paytm'],
      statement: `<p>Design a <code>BankAccount</code> class. Requirements: an account has a fixed account number and an owner name; customers can <b>deposit</b> and <b>withdraw</b>; the balance can <b>never go negative</b>; every successful deposit or withdrawal is recorded in a <b>transaction history</b> that callers can read but never modify. Identify the state, the behaviour, the invariants, and write the class.</p>`,
      constraints: `<ul><li>Amounts are whole paise (a 64-bit integer), must be &gt; 0.</li><li>Account number cannot change after creation.</li><li>History must be read-only from outside.</li></ul>`,
      example: `<p>open("ACC-1", "Asha") → deposit(500) → withdraw(200) → withdraw(400)</p>
${H.table(['call', 'result', 'balance', 'history size'], [['deposit(500)', H.c('g', 'ok'), '500', '1'], ['withdraw(200)', H.c('g', 'ok'), '300', '2'], ['withdraw(400)', H.c('r', 'rejected'), '300', '2']])}
<p>The last withdrawal is rejected because 400 &gt; 300 would break the invariant <code>balance ≥ 0</code>. It is <b>not</b> recorded in history.</p>`,
      brute: {
        why: `<p>The naive design makes every field <b>public</b> and lets a "BankUtils" god class change them. Every caller must remember the balance check and the history update. One forgotten check in one of fifty callers produces a negative balance, and because <code>history</code> is a public mutable list, anyone can delete records. Nothing is enforced; everything relies on discipline.</p>`,
        code: { lang: 'java', code: `
class Account {
    public String accountNumber;      // anyone can change it
    public double balance;            // double for money: rounding bugs
    public List<String> history = new ArrayList<>();   // anyone can clear it
}
class BankUtils {
    static void withdraw(Account a, double amt) {
        a.balance -= amt;             // forgot the check: balance goes negative
        a.history.add("W " + amt);
    }
}`, alt: [
                { lang: 'python', code: `
class Account:
    def __init__(self):
        self.account_number = ""      # anyone can change it
        self.balance = 0.0            # float for money: rounding bugs
        self.history = []             # anyone can clear it

class BankUtils:
    @staticmethod
    def withdraw(a, amt):
        a.balance -= amt              # forgot the check: balance goes negative
        a.history.append(f"W {amt}")` },
                { lang: 'ts', code: `
class Account {
    accountNumber = "";      // anyone can change it
    balance = 0;             // number for money: rounding bugs
    history: string[] = [];  // anyone can clear it
}
class BankUtils {
    static withdraw(a: Account, amt: number): void {
        a.balance -= amt;    // forgot the check: balance goes negative
        a.history.push("W " + amt);
    }
}` },
                { lang: 'cpp', code: `
struct Account {
    string accountNumber;      // anyone can change it
    double balance = 0;        // double for money: rounding bugs
    vector<string> history;    // anyone can clear it
};
struct BankUtils {
    static void withdraw(Account& a, double amt) {
        a.balance -= amt;      // forgot the check: balance goes negative
        a.history.push_back("W " + to_string(amt));
    }
};` }
              ] }
      },
      mcq: { q: 'Where should the rule "balance can never go negative" live?', options: ['In every controller that calls withdraw', 'Inside BankAccount.withdraw(), with balance private', 'In a database trigger only', 'In a static utility class'], answer: 1, explain: 'The object that owns the data owns its rules. Making balance private and checking inside withdraw() means no caller can bypass it.' },
      hints: [
        `<p>Hint 1: list the <b>nouns</b> (account, number, owner, balance, transaction) and decide which are <i>state</i> of BankAccount and which deserve their own small type (a Transaction value).</p>`,
        `<p>Hint 2: make every field <code>private</code>; make <code>accountNumber</code> <code>final</code>; store money as <code>long</code> paise; model a transaction as an immutable value type (a <code>record</code> in Java, a frozen dataclass in Python).</p>`,
        `<p>Hint 3: <code>withdraw</code> returns false (or throws) when amount ≤ 0 or amount &gt; balance; only on success update balance <i>and</i> append history. Expose history as a read-only view or a copy (Java <code>List.copyOf</code>, Python <code>tuple(...)</code>, a <code>readonly</code> array, a C++ <code>const</code> reference).</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "true\nfalse\n300 2\n" }] },
      solution: {
        approach: `<p><b>State:</b> accountNumber (final), owner, balancePaise, history. <b>Behaviour:</b> deposit, withdraw, balance, history. <b>Invariant:</b> balance ≥ 0 and history contains exactly the successful operations. Put both rules inside the class, make all fields private, validate in the constructor, and return an unmodifiable view of the history. A tiny <code>Transaction</code> value type (a Java <code>record</code>; type, amount, balanceAfter) is a value object: immutable and comparable by value. An <code>enum TxType</code> keeps the fixed set of types type-safe instead of magic strings.</p>`,
        code: `
enum TxType { DEPOSIT, WITHDRAWAL }

record Transaction(TxType type, long amountPaise, long balanceAfterPaise) { }

class BankAccount {
    private final String accountNumber;
    private final String owner;
    private long balancePaise;
    private final List<Transaction> history = new ArrayList<>();

    BankAccount(String accountNumber, String owner) {
        if (accountNumber == null || accountNumber.isBlank()) throw new IllegalArgumentException("account number required");
        this.accountNumber = accountNumber;
        this.owner = Objects.requireNonNull(owner);
    }

    void deposit(long paise) {
        if (paise <= 0) throw new IllegalArgumentException("deposit must be positive");
        balancePaise += paise;
        history.add(new Transaction(TxType.DEPOSIT, paise, balancePaise));
    }

    boolean withdraw(long paise) {
        if (paise <= 0 || paise > balancePaise) return false;   // invariant: never negative
        balancePaise -= paise;
        history.add(new Transaction(TxType.WITHDRAWAL, paise, balancePaise));
        return true;
    }

    long balancePaise() { return balancePaise; }
    String accountNumber() { return accountNumber; }
    String owner() { return owner; }
    List<Transaction> history() { return Collections.unmodifiableList(history); } // read-only view

    public static void main(String[] args) {
        BankAccount acc = new BankAccount("ACC-1", "Asha");
        acc.deposit(500);
        System.out.println(acc.withdraw(200));   // true
        System.out.println(acc.withdraw(400));   // false, balance stays 300
        System.out.println(acc.balancePaise() + " " + acc.history().size()); // 300 2
    }
}`,
        alt: [
          { lang: 'python', code: `
from dataclasses import dataclass
from enum import Enum


class TxType(Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"


@dataclass(frozen=True)
class Transaction:
    type: TxType
    amount_paise: int
    balance_after_paise: int


class BankAccount:
    def __init__(self, account_number: str, owner: str) -> None:
        if not account_number or not account_number.strip():
            raise ValueError("account number required")
        if owner is None:
            raise ValueError("owner required")
        self._account_number = account_number
        self._owner = owner
        self._balance_paise = 0
        self._history: list[Transaction] = []

    def deposit(self, paise: int) -> None:
        if paise <= 0:
            raise ValueError("deposit must be positive")
        self._balance_paise += paise
        self._history.append(Transaction(TxType.DEPOSIT, paise, self._balance_paise))

    def withdraw(self, paise: int) -> bool:
        if paise <= 0 or paise > self._balance_paise:
            return False  # invariant: never negative
        self._balance_paise -= paise
        self._history.append(Transaction(TxType.WITHDRAWAL, paise, self._balance_paise))
        return True

    @property
    def balance_paise(self) -> int:
        return self._balance_paise

    @property
    def account_number(self) -> str:
        return self._account_number

    @property
    def owner(self) -> str:
        return self._owner

    @property
    def history(self) -> tuple[Transaction, ...]:
        return tuple(self._history)  # read-only snapshot


def main() -> None:
    acc = BankAccount("ACC-1", "Asha")
    acc.deposit(500)
    print(str(acc.withdraw(200)).lower())  # true
    print(str(acc.withdraw(400)).lower())  # false, balance stays 300
    print(acc.balance_paise, len(acc.history))  # 300 2


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `
type TxType = "DEPOSIT" | "WITHDRAWAL";

interface Transaction {
  readonly type: TxType;
  readonly amountPaise: number;
  readonly balanceAfterPaise: number;
}

class BankAccount {
  private balance = 0;
  private readonly txs: Transaction[] = [];

  constructor(
    private readonly number: string,
    private readonly ownerName: string,
  ) {
    if (number.trim() === "") throw new Error("account number required");
  }

  deposit(paise: number): void {
    if (paise <= 0) throw new Error("deposit must be positive");
    this.balance += paise;
    this.txs.push({ type: "DEPOSIT", amountPaise: paise, balanceAfterPaise: this.balance });
  }

  withdraw(paise: number): boolean {
    if (paise <= 0 || paise > this.balance) return false; // invariant: never negative
    this.balance -= paise;
    this.txs.push({ type: "WITHDRAWAL", amountPaise: paise, balanceAfterPaise: this.balance });
    return true;
  }

  balancePaise(): number { return this.balance; }
  accountNumber(): string { return this.number; }
  owner(): string { return this.ownerName; }
  history(): readonly Transaction[] { return [...this.txs]; } // read-only copy
}

function main(): void {
  const acc = new BankAccount("ACC-1", "Asha");
  acc.deposit(500);
  console.log(acc.withdraw(200)); // true
  console.log(acc.withdraw(400)); // false, balance stays 300
  console.log(acc.balancePaise() + " " + acc.history().length); // 300 2
}
main();` },
          { lang: 'cpp', code: `
enum class TxType { Deposit, Withdrawal };

struct Transaction {
    TxType type;
    long long amountPaise;
    long long balanceAfterPaise;
};

class BankAccount {
public:
    BankAccount(string accountNumber, string owner)
        : accountNumber_(std::move(accountNumber)), owner_(std::move(owner)) {
        if (accountNumber_.find_first_not_of(" \\t") == string::npos)
            throw invalid_argument("account number required");
    }

    void deposit(long long paise) {
        if (paise <= 0) throw invalid_argument("deposit must be positive");
        balancePaise_ += paise;
        history_.push_back({TxType::Deposit, paise, balancePaise_});
    }

    bool withdraw(long long paise) {
        if (paise <= 0 || paise > balancePaise_) return false;  // invariant: never negative
        balancePaise_ -= paise;
        history_.push_back({TxType::Withdrawal, paise, balancePaise_});
        return true;
    }

    long long balancePaise() const { return balancePaise_; }
    const string& accountNumber() const { return accountNumber_; }
    const string& owner() const { return owner_; }
    const vector<Transaction>& history() const { return history_; }  // read-only view

private:
    string accountNumber_;
    string owner_;
    long long balancePaise_ = 0;
    vector<Transaction> history_;
};

int main() {
    BankAccount acc("ACC-1", "Asha");
    acc.deposit(500);
    cout << boolalpha << acc.withdraw(200) << "\\n";  // true
    cout << acc.withdraw(400) << "\\n";               // false, balance stays 300
    cout << acc.balancePaise() << " " << acc.history().size() << "\\n";  // 300 2
}` }
        ],
        complexity: `<p>deposit/withdraw are O(1) (amortised list append). History uses O(T) memory for T transactions. The real "complexity" win is design-level: the invariant is enforced in exactly one place.</p>`,
        followUps: ['Make it thread-safe for two ATMs withdrawing at once (a lock such as <code>synchronized</code>, <code>threading.Lock</code> or <code>std::mutex</code>, or an atomic with compare-and-swap).', 'Add a SavingsAccount with a minimum balance: inheritance or a policy object?', 'Add transfer(from, to, amount) without breaking either account\'s invariant.']
      }
    }]
  });

  /* =========================== TOPIC 2 =========================== */
  topics.push({
    title: 'From Requirements to Entities, Attributes & Behaviours (Noun-Verb Analysis)',
    analogy: `<p>Imagine you are a <b>detective with two highlighters</b> reading a witness statement. Green for every <b>thing or person</b> mentioned (nouns), blue for every <b>action</b> (verbs). After one pass you have a list of suspects (candidate classes) and what they did (candidate methods). Then the real detective work starts: crossing out the names that turn out to be just a hat colour (an attribute), or two names for the same person (synonyms).</p>`,
    explain: `<p>Every LLD question starts as a paragraph of English. Your first job is to turn it into a short list of <b>classes</b>, each with <b>attributes</b> (data) and <b>behaviours</b> (methods). Here is the repeatable recipe:</p>
<ol>
<li><b>Clarify scope</b> (2–3 minutes): who uses it, which features are in, which are out. "Do we need fines? Reservations? Multiple branches?" Write the agreed list down.</li>
<li><b>Noun-verb pass</b>: highlight nouns (candidate classes or attributes) and verbs (candidate methods).</li>
<li><b>Filter the nouns</b> using the table below.</li>
<li><b>Give each verb to an owner</b>: the class that holds the data needed to do it (the <i>Information Expert</i> rule).</li>
<li><b>Check with a use case</b>: walk one real scenario ("Asha borrows Clean Code") through your classes. Missing data or awkward calls reveal missing classes.</li>
</ol>
<h4>How to filter a noun</h4>
${H.table(['If the noun…', 'it becomes…', 'Library example'], [
  ['has its own data + behaviour + identity, lives over time', H.c('g', '<b>a class</b>'), 'Member, Book, Loan'],
  ['is a single simple value describing something else', H.c('b', '<b>an attribute</b>'), 'title, ISBN, dueDate, name'],
  ['is one of a small fixed set of options', H.c('p', '<b>an enum</b>'), 'BookStatus {AVAILABLE, LOANED, LOST}'],
  ['is a value with rules but no identity', H.c('b', '<b>a value object (record / frozen dataclass / struct)</b>'), 'Money, Address, DateRange'],
  ['is the system itself or a vague word', H.c('r', '<b>drop it</b>'), '"system", "information", "details"'],
  ['means the same as another noun', H.c('r', '<b>merge</b>'), '"patron" = "member" = "user"'],
  ['links two things AND has its own data', H.c('g', '<b>a class in the middle</b>'), 'Loan (member + copy + dueDate)']
])}
<h4>Verbs: who does it?</h4>
<p>"Member borrows a book" does not automatically mean <code>Member.borrow()</code>. Ask <b>whose data changes and who knows the rules</b>. Borrowing checks the member's loan limit (Member's data) and the copy's status (BookCopy's data) and creates a Loan. A coordinating method <code>Library.checkout(member, copy)</code> asks both, then creates the Loan. Small rules stay inside their owners: <code>member.canBorrow()</code>, <code>copy.markLoaned()</code>.</p>
<p><b>Attributes vs behaviours</b>: attributes are what an object <i>knows</i> (nouns, adjectives: title, isOverdue); behaviours are what it <i>does or decides</i> (verbs: renew, calculateFine). Prefer <b>derived</b> values computed on demand (an order total, an age) over stored copies that can go stale.</p>`,
    clues: [
      'A paragraph of requirements followed by "Design the classes" → do the noun-verb pass out loud.',
      '"A user can… / The system should… / An admin can…" → actors and use cases; each "can" is a candidate operation.',
      'A noun with a lifecycle word ("pending, confirmed, cancelled") → a class with a <b>status enum</b>.',
      'The same thing described in two ways ("a book" vs "a copy on the shelf") → type vs instance (Book vs BookCopy).',
      'Something that connects two things and has its own date/amount ("loan", "booking", "enrollment") → its own class.',
      '"Keep it extensible for new types" → behaviour behind an interface instead of a type string.'
    ],
    code: { lang: 'java', code: `
// Requirement: "Members borrow copies of books for 14 days. A member may hold at most 3 loans.
//  Each book has a title and ISBN; the library owns several copies of each book."
enum CopyStatus { AVAILABLE, LOANED, LOST }            // fixed set of options -> enum

record Isbn(String value) {                            // value object: rules but no identity
    Isbn { if (!value.matches("[0-9X-]{10,17}")) throw new IllegalArgumentException("bad ISBN"); }
}

class Book {                                           // the TITLE (type): one per ISBN
    private final Isbn isbn;
    private final String title;
    Book(Isbn isbn, String title) { this.isbn = isbn; this.title = title; }
    String title() { return title; }
}

class BookCopy {                                       // the PHYSICAL item (instance) on the shelf
    private final String barcode;
    private final Book book;                           // which title this copy is
    private CopyStatus status = CopyStatus.AVAILABLE;
    BookCopy(String barcode, Book book) { this.barcode = barcode; this.book = book; }
    boolean isAvailable() { return status == CopyStatus.AVAILABLE; }
    void markLoaned() { status = CopyStatus.LOANED; }
    void markReturned() { status = CopyStatus.AVAILABLE; }
    Book book() { return book; }
}

class Member {
    static final int MAX_LOANS = 3;
    private final String id;
    private final List<Loan> activeLoans = new ArrayList<>();
    Member(String id) { this.id = id; }
    boolean canBorrow() { return activeLoans.size() < MAX_LOANS; }   // Member knows its own limit
    void addLoan(Loan loan) { activeLoans.add(loan); }
    void removeLoan(Loan loan) { activeLoans.remove(loan); }
}

class Loan {                                           // links Member + BookCopy AND has its own data
    private final Member member;
    private final BookCopy copy;
    private final LocalDate dueDate;
    Loan(Member member, BookCopy copy, LocalDate today) {
        this.member = member; this.copy = copy; this.dueDate = today.plusDays(14);
    }
    boolean isOverdue(LocalDate today) { return today.isAfter(dueDate); }  // derived, not stored
}

class Library {                                        // coordinates the use case
    Loan checkout(Member member, BookCopy copy, LocalDate today) {
        if (!member.canBorrow()) throw new IllegalStateException("loan limit reached");
        if (!copy.isAvailable()) throw new IllegalStateException("copy not available");
        Loan loan = new Loan(member, copy, today);
        copy.markLoaned();
        member.addLoan(loan);
        return loan;
    }
}`,
alt: [
  { lang: 'python', code: `
# Requirement: "Members borrow copies of books for 14 days. A member may hold at most 3 loans.
#  Each book has a title and ISBN; the library owns several copies of each book."
import re
from dataclasses import dataclass
from datetime import date, timedelta
from enum import Enum


class CopyStatus(Enum):  # fixed set of options -> enum
    AVAILABLE = 1
    LOANED = 2
    LOST = 3


@dataclass(frozen=True)
class Isbn:  # value object: rules but no identity
    value: str

    def __post_init__(self) -> None:
        if not re.fullmatch(r"[0-9X-]{10,17}", self.value):
            raise ValueError("bad ISBN")


class Book:  # the TITLE (type): one per ISBN
    def __init__(self, isbn: Isbn, title: str) -> None:
        self._isbn = isbn
        self._title = title

    @property
    def title(self) -> str:
        return self._title


class BookCopy:  # the PHYSICAL item (instance) on the shelf
    def __init__(self, barcode: str, book: Book) -> None:
        self._barcode = barcode
        self._book = book  # which title this copy is
        self._status = CopyStatus.AVAILABLE

    def is_available(self) -> bool:
        return self._status is CopyStatus.AVAILABLE

    def mark_loaned(self) -> None:
        self._status = CopyStatus.LOANED

    def mark_returned(self) -> None:
        self._status = CopyStatus.AVAILABLE

    @property
    def book(self) -> Book:
        return self._book


class Member:
    MAX_LOANS = 3

    def __init__(self, member_id: str) -> None:
        self._id = member_id
        self._active_loans: list["Loan"] = []

    def can_borrow(self) -> bool:  # Member knows its own limit
        return len(self._active_loans) < Member.MAX_LOANS

    def add_loan(self, loan: "Loan") -> None:
        self._active_loans.append(loan)

    def remove_loan(self, loan: "Loan") -> None:
        self._active_loans.remove(loan)


class Loan:  # links Member + BookCopy AND has its own data
    def __init__(self, member: Member, copy: BookCopy, today: date) -> None:
        self._member = member
        self._copy = copy
        self._due_date = today + timedelta(days=14)

    def is_overdue(self, today: date) -> bool:  # derived, not stored
        return today > self._due_date


class Library:  # coordinates the use case
    def checkout(self, member: Member, copy: BookCopy, today: date) -> Loan:
        if not member.can_borrow():
            raise RuntimeError("loan limit reached")
        if not copy.is_available():
            raise RuntimeError("copy not available")
        loan = Loan(member, copy, today)
        copy.mark_loaned()
        member.add_loan(loan)
        return loan` },
  { lang: 'ts', code: `
// Requirement: "Members borrow copies of books for 14 days. A member may hold at most 3 loans.
//  Each book has a title and ISBN; the library owns several copies of each book."
enum CopyStatus { Available, Loaned, Lost } // fixed set of options -> enum

class Isbn { // value object: rules but no identity
  constructor(readonly value: string) {
    if (!/^[0-9X-]{10,17}$/.test(value)) throw new Error("bad ISBN");
  }
}

class Book { // the TITLE (type): one per ISBN
  constructor(private readonly isbn: Isbn, private readonly name: string) {}
  title(): string { return this.name; }
}

class BookCopy { // the PHYSICAL item (instance) on the shelf
  private status = CopyStatus.Available;
  constructor(private readonly barcode: string, private readonly theBook: Book) {} // which title this copy is
  isAvailable(): boolean { return this.status === CopyStatus.Available; }
  markLoaned(): void { this.status = CopyStatus.Loaned; }
  markReturned(): void { this.status = CopyStatus.Available; }
  book(): Book { return this.theBook; }
}

class Member {
  static readonly MAX_LOANS = 3;
  private readonly activeLoans: Loan[] = [];
  constructor(private readonly id: string) {}
  canBorrow(): boolean { return this.activeLoans.length < Member.MAX_LOANS; } // Member knows its own limit
  addLoan(loan: Loan): void { this.activeLoans.push(loan); }
  removeLoan(loan: Loan): void {
    const i = this.activeLoans.indexOf(loan);
    if (i >= 0) this.activeLoans.splice(i, 1);
  }
}

class Loan { // links Member + BookCopy AND has its own data
  private readonly dueDate: Date;
  constructor(private readonly member: Member, private readonly copy: BookCopy, today: Date) {
    this.dueDate = new Date(today.getTime() + 14 * 86_400_000);
  }
  isOverdue(today: Date): boolean { return today > this.dueDate; } // derived, not stored
}

class Library { // coordinates the use case
  checkout(member: Member, copy: BookCopy, today: Date): Loan {
    if (!member.canBorrow()) throw new Error("loan limit reached");
    if (!copy.isAvailable()) throw new Error("copy not available");
    const loan = new Loan(member, copy, today);
    copy.markLoaned();
    member.addLoan(loan);
    return loan;
  }
}` },
  { lang: 'cpp', code: `
// Requirement: "Members borrow copies of books for 14 days. A member may hold at most 3 loans.
//  Each book has a title and ISBN; the library owns several copies of each book."
enum class CopyStatus { Available, Loaned, Lost };  // fixed set of options -> enum class

class Isbn {  // value object: rules but no identity
    string value_;
public:
    explicit Isbn(string value) : value_(std::move(value)) {
        if (!regex_match(value_, regex("[0-9X-]{10,17}"))) throw invalid_argument("bad ISBN");
    }
    const string& value() const { return value_; }
};

class Book {  // the TITLE (type): one per ISBN
    Isbn isbn_;
    string title_;
public:
    Book(Isbn isbn, string title) : isbn_(std::move(isbn)), title_(std::move(title)) {}
    const string& title() const { return title_; }
};

class BookCopy {  // the PHYSICAL item (instance) on the shelf
    string barcode_;
    shared_ptr<const Book> book_;  // which title this copy is (many copies share one Book)
    CopyStatus status_ = CopyStatus::Available;
public:
    BookCopy(string barcode, shared_ptr<const Book> book) : barcode_(std::move(barcode)), book_(std::move(book)) {}
    bool isAvailable() const { return status_ == CopyStatus::Available; }
    void markLoaned() { status_ = CopyStatus::Loaned; }
    void markReturned() { status_ = CopyStatus::Available; }
    const Book& book() const { return *book_; }
};

class Loan;

class Member {
    string id_;
    vector<Loan*> activeLoans_;  // non-owning: the Library owns the loans
public:
    static constexpr size_t MAX_LOANS = 3;
    explicit Member(string id) : id_(std::move(id)) {}
    bool canBorrow() const { return activeLoans_.size() < MAX_LOANS; }  // Member knows its own limit
    void addLoan(Loan* loan) { activeLoans_.push_back(loan); }
    void removeLoan(Loan* loan) { activeLoans_.erase(remove(activeLoans_.begin(), activeLoans_.end(), loan), activeLoans_.end()); }
};

class Loan {  // links Member + BookCopy AND has its own data
    Member* member_;
    BookCopy* copy_;
    chrono::sys_days dueDate_;
public:
    Loan(Member& member, BookCopy& copy, chrono::sys_days today)
        : member_(&member), copy_(&copy), dueDate_(today + chrono::days(14)) {}
    bool isOverdue(chrono::sys_days today) const { return today > dueDate_; }  // derived, not stored
};

class Library {  // coordinates the use case
public:
    unique_ptr<Loan> checkout(Member& member, BookCopy& copy, chrono::sys_days today) {
        if (!member.canBorrow()) throw runtime_error("loan limit reached");
        if (!copy.isAvailable()) throw runtime_error("copy not available");
        auto loan = make_unique<Loan>(member, copy, today);
        copy.markLoaned();
        member.addLoan(loan.get());
        return loan;  // ownership moves to the caller
    }
};` }
] },
    codeTitle: 'Nouns filtered into classes, enum, value object (Library)',
    viz: [{
      title: 'Noun-verb analysis: type a requirement, watch the class diagram grow',
      input: 'Member borrows Copy; Library has Copy; Copy is Item; Librarian adds Copy; Member pays Fine',
      inputLabel: 'Short sentences "Subject verb Object" separated by ; (has = field, is = extends, other verbs = methods)',
      gen: function (input) { return nounVerbFrames(input); }
    }, {
      title: 'Filtering the noun list for a library requirement',
      gen: function () {
        var req = 'A <b>library</b> has many <b>books</b>. Each <b>book</b> has a <b>title</b>, <b>author</b> and <b>ISBN</b>. The library keeps several <b>copies</b> of a book. A <b>member</b> (also called a <b>patron</b>) can borrow up to 3 copies for 14 <b>days</b>. The <b>system</b> records each <b>loan</b> with a <b>due date</b> and charges a <b>fine</b> for late returns. A copy can be <b>available</b>, <b>loaned</b> or <b>lost</b>.';
        var rows = [
          ['library', '?', ''], ['book', '?', ''], ['title / author / ISBN', '?', ''], ['copy', '?', ''], ['member', '?', ''], ['patron', '?', ''],
          ['day / due date', '?', ''], ['system', '?', ''], ['loan', '?', ''], ['fine', '?', ''], ['available / loaned / lost', '?', '']
        ];
        var verdicts = [
          ['class', 'coordinates checkout/return; owns the catalogue', 'ok'],
          ['class (Book)', 'the title: one per ISBN, shared by copies', 'ok'],
          ['attributes of Book', 'single values describing a book', 'win'],
          ['class (BookCopy)', 'the physical item; has its own status and barcode', 'ok'],
          ['class (Member)', 'has id, loan limit, active loans', 'ok'],
          ['merge into Member', 'synonym: same real-world person', 'bad'],
          ['attribute of Loan', 'a LocalDate value, no behaviour', 'win'],
          ['drop', 'the whole program, not a domain thing (avoid god class)', 'bad'],
          ['class (Loan)', 'links Member + BookCopy and has its own due date', 'ok'],
          ['class or value (Fine)', 'amount + paid flag; could be a record', 'ok'],
          ['enum CopyStatus', 'a fixed set of states of a copy', 'sel']
        ];
        var frames = [{ narr: 'Here is the requirement. Step 1: highlight every noun (bold). We get 11 candidates. Now we judge them one by one.', parts: [{ type: 'text', label: 'Requirement', html: req }, { type: 'table', label: 'Candidate nouns', columns: ['noun', 'verdict', 'reason'], rows: cp(rows) }] }];
        var classes = [];
        verdicts.forEach(function (v, i) {
          rows[i][1] = v[0]; rows[i][2] = v[1];
          var keep = { 0: 'Library', 1: 'Book', 3: 'BookCopy', 4: 'Member', 8: 'Loan', 9: 'Fine', 10: 'enum CopyStatus' }[i];
          if (keep) classes.push(keep);
          var h = {}; h[i] = v[2];
          frames.push({ narr: '<b>' + rows[i][0] + '</b> → ' + v[0] + '. ' + v[1] + '.', parts: [
            { type: 'table', label: 'Candidate nouns', columns: ['noun', 'verdict', 'reason'], rows: cp(rows), hl: h },
            { type: 'set', label: 'Classes / enums kept so far', items: classes.slice() }
          ] });
        });
        frames.push({ narr: 'Result: <b>6 classes + 1 enum</b> from 11 nouns. Two were merged or dropped, and two groups (title/author/ISBN, day/due date) became attributes. This filtering is what interviewers want to hear you say out loud.', parts: [
          { type: 'set', label: 'Final model', items: ['Library', 'Book', 'BookCopy', 'Member', 'Loan', 'Fine', 'enum CopyStatus'], hl: { 'enum CopyStatus': 'sel' } },
          { type: 'table', label: 'Verbs → owners', columns: ['verb in requirement', 'method', 'owner (who has the data)'], rows: [['borrow', 'checkout(member, copy)', 'Library (coordinates)'], ['up to 3', 'canBorrow()', 'Member'], ['records loan / due date', 'new Loan(...)', 'Loan constructor'], ['charges fine', 'fineFor(today)', 'Loan (knows due date)'], ['available/loaned/lost', 'markLoaned(), markLost()', 'BookCopy']] }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Coffee shop: "A customer orders drinks in sizes S, M, L with optional extra shots"', html: `<p>Nouns: customer, drink, size, shot, order. Verdicts: <code>Order</code> (class, has items and status), <code>OrderItem</code> (class: drink + size + shots, has its own price), <code>Drink</code> (class: menu entry with base price), <code>Size</code> (enum S/M/L with a price multiplier), <code>shot</code> (an int attribute <code>extraShots</code> on OrderItem, not a class). Verb "orders" → <code>Order.addItem(drink, size, shots)</code>; "price" → <code>OrderItem.price()</code> computed from drink, size, shots (derived, never stored).</p>`, code: { lang: 'java', code: `
enum Size {
    S(100), M(125), L(150);
    final int percent;
    Size(int percent) { this.percent = percent; }
}
record Drink(String name, long basePaise) { }
record OrderItem(Drink drink, Size size, int extraShots) {
    long pricePaise() { return drink.basePaise() * size.percent / 100 + extraShots * 3000L; }
}
class CoffeeOrder {
    private final List<OrderItem> items = new ArrayList<>();
    void addItem(Drink d, Size s, int shots) { items.add(new OrderItem(d, s, shots)); }
    long totalPaise() { return items.stream().mapToLong(OrderItem::pricePaise).sum(); }
}`,
alt: [
  { lang: 'python', code: `
from dataclasses import dataclass
from enum import Enum


class Size(Enum):
    S = 100
    M = 125
    L = 150

    @property
    def percent(self) -> int:
        return self.value


@dataclass(frozen=True)
class Drink:
    name: str
    base_paise: int


@dataclass(frozen=True)
class OrderItem:
    drink: Drink
    size: Size
    extra_shots: int

    def price_paise(self) -> int:
        return self.drink.base_paise * self.size.percent // 100 + self.extra_shots * 3000


class CoffeeOrder:
    def __init__(self) -> None:
        self._items: list[OrderItem] = []

    def add_item(self, d: Drink, s: Size, shots: int) -> None:
        self._items.append(OrderItem(d, s, shots))

    def total_paise(self) -> int:
        return sum(i.price_paise() for i in self._items)` },
  { lang: 'ts', code: `
const SIZE_PERCENT = { S: 100, M: 125, L: 150 } as const;
type Size = keyof typeof SIZE_PERCENT;

interface Drink { readonly name: string; readonly basePaise: number; }

class OrderItem {
  constructor(readonly drink: Drink, readonly size: Size, readonly extraShots: number) {}
  pricePaise(): number {
    return Math.floor((this.drink.basePaise * SIZE_PERCENT[this.size]) / 100) + this.extraShots * 3000;
  }
}

class CoffeeOrder {
  private readonly items: OrderItem[] = [];
  addItem(d: Drink, s: Size, shots: number): void { this.items.push(new OrderItem(d, s, shots)); }
  totalPaise(): number { return this.items.reduce((sum, i) => sum + i.pricePaise(), 0); }
}` },
  { lang: 'cpp', code: `
enum class Size { S, M, L };

int percent(Size s) {
    static const int table[] = {100, 125, 150};
    return table[static_cast<int>(s)];
}

struct Drink {
    string name;
    long long basePaise;
};

struct OrderItem {
    Drink drink;
    Size size;
    int extraShots;
    long long pricePaise() const { return drink.basePaise * percent(size) / 100 + extraShots * 3000LL; }
};

class CoffeeOrder {
    vector<OrderItem> items_;
public:
    void addItem(const Drink& d, Size s, int shots) { items_.push_back({d, s, shots}); }
    long long totalPaise() const {
        return accumulate(items_.begin(), items_.end(), 0LL, [](long long sum, const OrderItem& i) { return sum + i.pricePaise(); });
    }
};` }
] } },
      { title: 'Type vs instance: Book vs BookCopy, Movie vs Show, Product vs StockItem', html: `<p>Many requirements hide two different things behind one word. "The library has 3 copies of <i>Clean Code</i>" means <b>one</b> Book (title, author, ISBN) and <b>three</b> BookCopy objects (barcode, status). If you merge them, the title is duplicated three times and "how many copies are available?" becomes messy. Same shape: Movie (the film) vs Show (a screening), Product (catalogue entry) vs InventoryItem (one physical unit with a serial number). This is called the <b>type-object</b> or <b>item-description</b> pattern.</p>
${H.table(['Type (shared description)', 'Instance (individual)', 'Link'], [['Book', 'BookCopy', '1 → 0..*'], ['Movie', 'Show', '1 → 0..*'], ['Product', 'StockItem', '1 → 0..*']])}` },
      { title: 'Actor or entity? "A driver parks a car and gets a ticket"', html: `<p>Is <b>Driver</b> a class? Only if the system <i>stores</i> something about drivers. A basic parking lot never knows who the driver is, it only knows the <b>Vehicle</b> (plate number, type) and the <b>Ticket</b>. So Driver is an <b>actor</b> (outside the system) and is dropped. In a ride-hailing app, Driver has ratings, location and earnings, so it <b>is</b> a class. Rule: <i>a noun becomes a class only if the system must remember it or ask it to do something.</i></p>` }
    ],
    deepDive: `<p><b>GRASP Information Expert.</b> Assign a responsibility to the class that has the information needed to fulfil it. <code>Loan</code> knows its due date, so <code>Loan.fineFor(today)</code> belongs there, not in a <code>FineCalculatorUtil</code>. When a responsibility needs data from several objects, a <b>Controller</b>/coordinator (Library, BookingService) orchestrates but each object still checks its own rules. This keeps the coordinator thin.</p>
<p><b>CRC cards</b> (Class–Responsibilities–Collaborators) are index cards with the class name, 2–4 responsibilities, and the classes it talks to. If a card needs 8 responsibilities, split it. If a class has no responsibilities, it is probably an attribute. Saying "here is my CRC for Loan" in an interview shows structured thinking.</p>
<p><b>Use cases drive verbs.</b> List 3–5 core use cases ("checkout", "return", "pay fine", "search"). Each becomes a public method on a facade/service, and you trace it through domain objects. Verbs like "view", "display" usually belong to the UI layer, not the domain; leave them out of the model.</p>
<p><b>Avoid these traps:</b> (1) a class called <code>System</code>, <code>Manager</code> or <code>Helper</code> that does everything; (2) storing derived data (<code>age</code>, <code>total</code>, <code>isOverdue</code>) that can go stale; (3) using <code>String</code> for statuses (typos compile fine; enums do not); (4) modelling every adjective as a subclass (<code>RedCar</code>, <code>BlueCar</code>): colour is an attribute.</p>
<p><b>Lifecycle signals.</b> Words like pending, confirmed, cancelled, expired mean a <b>state machine</b>. Model a status enum and legal transitions in methods (<code>confirm()</code> only from PENDING). The State pattern (later module) is the heavy version of the same idea.</p>
<p><b>Scope control</b> is a senior skill: say "I will model fines as a simple value now; if we need payment plans it becomes its own aggregate". Interviewers reward explicit trade-offs over a 30-class diagram.</p>`,
    aiEra: `<p><b>What AI changes:</b> paste a requirement into an assistant and you get a noun list and a class list instantly. That makes the <i>mechanical</i> pass free, so interviews (and real design reviews) focus on the <b>filtering judgement</b>: which nouns to drop, merge, or split into type/instance.</p>
<p><b>Use AI as a partner:</b> <code>Here is my noun list and verdicts. Which nouns did I miss? Which verdicts would you challenge?</code> or <code>Give me 5 tricky scenarios that would break this model (e.g. a member loses a copy)</code>. Use it to generate use-case walkthroughs you then trace by hand.</p>
<p><b>Where AI goes wrong:</b> it turns every noun into a class (Title, Author, Day classes), adds a <code>LibrarySystem</code> god class, merges Book and BookCopy, and invents features you never agreed to (reservations, e-books). It also tends to put every verb on a service instead of the information expert.</p>
<p><b>What you must still own:</b> scope agreement with the interviewer, the noun verdicts with reasons, and the use-case walkthrough. If you used AI to draft, state your edits: "I removed the System class and split Book from BookCopy because…". That narration is the signal being graded.</p>`,
    problems: [{
      title: 'Identify the Classes for a Library Management System',
      level: 'Medium', tags: ['noun-verb analysis', 'entities', 'enum', 'type-object'], companies: ['Amazon', 'Microsoft', 'Atlassian'],
      statement: `<p>Requirement: <i>"A library has books. Each book has a title, authors and an ISBN, and the library may own several copies. Members can borrow up to 3 copies at a time for 14 days and can renew a loan once if nobody has reserved the book. Late returns cost ₹10 per day. Copies can be available, loaned or lost."</i></p><p>Identify the classes, their key attributes and behaviours, the enums, and write a compilable skeleton supporting <b>checkout</b>, <b>renew</b> and <b>return with fine</b>.</p>`,
      constraints: `<ul><li>Max 3 active loans per member; 14-day loan period; 1 renewal max.</li><li>Fine = ₹10 × days late (0 if on time).</li><li>No UI, no database: in-memory domain model.</li></ul>`,
      example: `<p>Asha borrows copy C1 on day 0 (due day 14), renews on day 10 (new due date = day 10 + 14 = day 24), returns on day 27 → fine = 3 × ₹10 = ${H.c('r', '₹30')}. A second renew attempt is ${H.c('r', 'rejected')} (only one renewal). A 4th checkout while holding 3 loans is ${H.c('r', 'rejected')}.</p>
${H.table(['day', 'action', 'due', 'result'], [['0', 'checkout C1', '14', H.c('g', 'ok')], ['10', 'renew', '24', H.c('g', 'ok')], ['12', 'renew', '24', H.c('r', 'no: already renewed')], ['27', 'return', '-', H.c('r', 'fine ₹30 (3 days late)')]])}`,
      brute: {
        why: `<p>The naive "god class" puts everything in one <code>LibrarySystem</code> with parallel maps of strings: <code>Map&lt;String,String&gt; copyStatus</code>, <code>Map&lt;String,Integer&gt; memberLoanCount</code>, <code>Map&lt;String,Integer&gt; dueDay</code>. It works for the happy path, but every rule is an if-statement in one 800-line class; statuses are strings ("loand" typo compiles); renew count, due date and member are in three different maps that can drift apart; and adding reservations means editing every method. It cannot be unit tested piece by piece and nobody can own a part of it.</p>`,
        code: { lang: 'java', code: `
class LibrarySystem {
    Map<String, String> copyStatus = new HashMap<>();       // "AVAILABLE" / "LOANED" as strings
    Map<String, Integer> memberLoans = new HashMap<>();
    Map<String, Integer> dueDay = new HashMap<>();
    Map<String, String> copyHolder = new HashMap<>();

    String checkout(String member, String copy, int today) {
        if (memberLoans.getOrDefault(member, 0) >= 3) return "LIMIT";
        if (!"AVAILABLE".equals(copyStatus.get(copy))) return "UNAVAILABLE";
        copyStatus.put(copy, "LOANED");
        memberLoans.merge(member, 1, Integer::sum);
        dueDay.put(copy, today + 14);
        copyHolder.put(copy, member);
        return "OK";
    }
    int giveBack(String copy, int today) {                   // every rule tangled in one place
        int late = Math.max(0, today - dueDay.get(copy));
        memberLoans.merge(copyHolder.get(copy), -1, Integer::sum);
        copyStatus.put(copy, "AVAILABLE");
        return late * 10;
    }
}`, alt: [
                { lang: 'python', code: `
class LibrarySystem:
    def __init__(self):
        self.copy_status = {}      # "AVAILABLE" / "LOANED" as strings
        self.member_loans = {}
        self.due_day = {}
        self.copy_holder = {}

    def checkout(self, member, copy, today):
        if self.member_loans.get(member, 0) >= 3: return "LIMIT"
        if self.copy_status.get(copy) != "AVAILABLE": return "UNAVAILABLE"
        self.copy_status[copy] = "LOANED"
        self.member_loans[member] = self.member_loans.get(member, 0) + 1
        self.due_day[copy] = today + 14
        self.copy_holder[copy] = member
        return "OK"

    def give_back(self, copy, today):                  # every rule tangled in one place
        late = max(0, today - self.due_day[copy])
        self.member_loans[self.copy_holder[copy]] -= 1
        self.copy_status[copy] = "AVAILABLE"
        return late * 10` },
                { lang: 'ts', code: `
class LibrarySystem {
    copyStatus = new Map<string, string>();       // "AVAILABLE" / "LOANED" as strings
    memberLoans = new Map<string, number>();
    dueDay = new Map<string, number>();
    copyHolder = new Map<string, string>();

    checkout(member: string, copy: string, today: number): string {
        if ((this.memberLoans.get(member) ?? 0) >= 3) return "LIMIT";
        if (this.copyStatus.get(copy) !== "AVAILABLE") return "UNAVAILABLE";
        this.copyStatus.set(copy, "LOANED");
        this.memberLoans.set(member, (this.memberLoans.get(member) ?? 0) + 1);
        this.dueDay.set(copy, today + 14);
        this.copyHolder.set(copy, member);
        return "OK";
    }
    giveBack(copy: string, today: number): number {   // every rule tangled in one place
        const late = Math.max(0, today - this.dueDay.get(copy)!);
        const m = this.copyHolder.get(copy)!;
        this.memberLoans.set(m, this.memberLoans.get(m)! - 1);
        this.copyStatus.set(copy, "AVAILABLE");
        return late * 10;
    }
}` },
                { lang: 'cpp', code: `
class LibrarySystem {
    unordered_map<string, string> copyStatus;       // "AVAILABLE" / "LOANED" as strings
    unordered_map<string, int> memberLoans;
    unordered_map<string, int> dueDay;
    unordered_map<string, string> copyHolder;
public:
    string checkout(const string& member, const string& copy, int today) {
        if (memberLoans[member] >= 3) return "LIMIT";
        if (copyStatus[copy] != "AVAILABLE") return "UNAVAILABLE";
        copyStatus[copy] = "LOANED";
        memberLoans[member]++;
        dueDay[copy] = today + 14;
        copyHolder[copy] = member;
        return "OK";
    }
    int giveBack(const string& copy, int today) {   // every rule tangled in one place
        int late = max(0, today - dueDay[copy]);
        memberLoans[copyHolder[copy]]--;
        copyStatus[copy] = "AVAILABLE";
        return late * 10;
    }
};` }
              ] }
      },
      mcq: { q: 'The requirement says "the library may own several copies of a book". What is the best model?', options: ['One Book class with a copies counter', 'Book (title, ISBN) and BookCopy (barcode, status), Book 1 → 0..* BookCopy', 'A subclass per copy: BookCopy1, BookCopy2', 'Only BookCopy, with the title repeated in each'], answer: 1, explain: 'Type vs instance. The title data is shared (Book) while each physical copy has its own identity and status (BookCopy). A counter cannot track which copy is lost or who holds it.' },
      hints: [
        `<p>Hint 1: highlight nouns: library, book, title, author, ISBN, copy, member, loan, day, fine, status. Which are single values (attributes)? Which have their own state (classes)? Which is a fixed set (enum)?</p>`,
        `<p>Hint 2: Loan is the "middle" class: it links Member and BookCopy and owns dueDate and renewCount. The fine is derived from the loan's due date and the return date, so <code>Loan</code> computes it.</p>`,
        `<p>Hint 3: Recipe: <code>Library.checkout</code> checks <code>member.canBorrow()</code> and <code>copy.isAvailable()</code>, creates Loan, updates both. <code>loan.renew()</code> checks renewCount &lt; 1 and that the book is not reserved. <code>Library.giveBack</code> closes the loan and returns <code>loan.fineFor(returnDate)</code>.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "true\nfalse\n3000\n" }] },
      solution: {
        approach: `<p><b>Classes:</b> <code>Library</code> (coordinator: catalogue, checkout, return), <code>Book</code> (ISBN, title, authors, reservation flag), <code>BookCopy</code> (barcode, Book, CopyStatus), <code>Member</code> (id, active loans, limit), <code>Loan</code> (member, copy, dueDate, renewCount, fine logic). <b>Enum:</b> <code>CopyStatus</code>. <b>Attributes, not classes:</b> title, ISBN, author names, dates. <b>Dropped:</b> "system". Each rule sits with the data it needs: loan limit in Member, availability in BookCopy, renewal and fine in Loan. Library only orchestrates the multi-object use cases. Dates use <code>LocalDate</code> so "days late" is <code>ChronoUnit.DAYS.between</code>.</p>`,
        code: `
import java.time.*;

enum CopyStatus { AVAILABLE, LOANED, LOST }

class Book {
    private final String isbn, title;
    private final List<String> authors;
    private boolean reserved;
    Book(String isbn, String title, List<String> authors) {
        this.isbn = isbn; this.title = title; this.authors = List.copyOf(authors);
    }
    boolean isReserved() { return reserved; }
    void setReserved(boolean r) { reserved = r; }
    String title() { return title; }
}

class BookCopy {
    private final String barcode;
    private final Book book;
    private CopyStatus status = CopyStatus.AVAILABLE;
    BookCopy(String barcode, Book book) { this.barcode = barcode; this.book = book; }
    boolean isAvailable() { return status == CopyStatus.AVAILABLE; }
    void markLoaned() { status = CopyStatus.LOANED; }
    void markAvailable() { status = CopyStatus.AVAILABLE; }
    Book book() { return book; }
    String barcode() { return barcode; }
}

class Member {
    private static final int MAX_LOANS = 3;
    private final String id;
    private final List<Loan> loans = new ArrayList<>();
    Member(String id) { this.id = id; }
    boolean canBorrow() { return loans.size() < MAX_LOANS; }
    void add(Loan l) { loans.add(l); }
    void remove(Loan l) { loans.remove(l); }
}

class Loan {
    private static final int PERIOD_DAYS = 14, MAX_RENEWALS = 1;
    private static final long FINE_PER_DAY_PAISE = 1000;
    private final Member member;
    private final BookCopy copy;
    private LocalDate dueDate;
    private int renewals;
    Loan(Member member, BookCopy copy, LocalDate start) {
        this.member = member; this.copy = copy; this.dueDate = start.plusDays(PERIOD_DAYS);
    }
    boolean renew(LocalDate today) {
        if (renewals >= MAX_RENEWALS || copy.book().isReserved()) return false;
        dueDate = today.plusDays(PERIOD_DAYS);
        renewals++;
        return true;
    }
    long fineFor(LocalDate returned) {                 // derived from data Loan owns
        long late = java.time.temporal.ChronoUnit.DAYS.between(dueDate, returned);
        return Math.max(0, late) * FINE_PER_DAY_PAISE;
    }
    Member member() { return member; }
    BookCopy copy() { return copy; }
    LocalDate dueDate() { return dueDate; }
}

class Library {
    private final Map<String, BookCopy> copies = new HashMap<>();
    private final Map<String, Loan> activeLoans = new HashMap<>();   // barcode -> loan

    void addCopy(BookCopy c) { copies.put(c.barcode(), c); }

    Loan checkout(Member m, String barcode, LocalDate today) {
        BookCopy c = copies.get(barcode);
        if (c == null || !c.isAvailable()) throw new IllegalStateException("copy not available");
        if (!m.canBorrow()) throw new IllegalStateException("loan limit reached");
        Loan loan = new Loan(m, c, today);
        c.markLoaned();
        m.add(loan);
        activeLoans.put(barcode, loan);
        return loan;
    }

    long giveBack(String barcode, LocalDate today) {
        Loan loan = activeLoans.remove(barcode);
        if (loan == null) throw new IllegalStateException("no active loan");
        loan.copy().markAvailable();
        loan.member().remove(loan);
        return loan.fineFor(today);
    }

    public static void main(String[] args) {
        Library lib = new Library();
        Book cc = new Book("978-0132350884", "Clean Code", List.of("Robert C. Martin"));
        lib.addCopy(new BookCopy("C1", cc));
        Member asha = new Member("M1");
        LocalDate d0 = LocalDate.of(2026, 1, 1);
        Loan loan = lib.checkout(asha, "C1", d0);
        System.out.println(loan.renew(d0.plusDays(10)));   // true, due day 24 from start+10
        System.out.println(loan.renew(d0.plusDays(12)));   // false: one renewal only
        System.out.println(lib.giveBack("C1", d0.plusDays(27))); // 3 days late -> 3000 paise
    }
}`,
        alt: [
          { lang: 'python', code: `
from dataclasses import dataclass, field
from datetime import date, timedelta
from enum import Enum


class CopyStatus(Enum):
    AVAILABLE = 1
    LOANED = 2
    LOST = 3


@dataclass
class Book:
    isbn: str
    title: str
    authors: tuple[str, ...]
    reserved: bool = False


@dataclass(eq=False)
class BookCopy:
    barcode: str
    book: Book
    status: CopyStatus = CopyStatus.AVAILABLE

    def is_available(self) -> bool:
        return self.status is CopyStatus.AVAILABLE

    def mark_loaned(self) -> None:
        self.status = CopyStatus.LOANED

    def mark_available(self) -> None:
        self.status = CopyStatus.AVAILABLE


class Member:
    MAX_LOANS = 3

    def __init__(self, member_id: str) -> None:
        self.id = member_id
        self._loans: list["Loan"] = []

    def can_borrow(self) -> bool:
        return len(self._loans) < Member.MAX_LOANS

    def add(self, loan: "Loan") -> None:
        self._loans.append(loan)

    def remove(self, loan: "Loan") -> None:
        self._loans.remove(loan)


class Loan:
    PERIOD_DAYS = 14
    MAX_RENEWALS = 1
    FINE_PER_DAY_PAISE = 1000

    def __init__(self, member: Member, copy: BookCopy, start: date) -> None:
        self.member = member
        self.copy = copy
        self.due_date = start + timedelta(days=Loan.PERIOD_DAYS)
        self._renewals = 0

    def renew(self, today: date) -> bool:
        if self._renewals >= Loan.MAX_RENEWALS or self.copy.book.reserved:
            return False
        self.due_date = today + timedelta(days=Loan.PERIOD_DAYS)
        self._renewals += 1
        return True

    def fine_for(self, returned: date) -> int:  # derived from data Loan owns
        late = (returned - self.due_date).days
        return max(0, late) * Loan.FINE_PER_DAY_PAISE


class Library:
    def __init__(self) -> None:
        self._copies: dict[str, BookCopy] = {}
        self._active_loans: dict[str, Loan] = {}  # barcode -> loan

    def add_copy(self, copy: BookCopy) -> None:
        self._copies[copy.barcode] = copy

    def checkout(self, member: Member, barcode: str, today: date) -> Loan:
        copy = self._copies.get(barcode)
        if copy is None or not copy.is_available():
            raise RuntimeError("copy not available")
        if not member.can_borrow():
            raise RuntimeError("loan limit reached")
        loan = Loan(member, copy, today)
        copy.mark_loaned()
        member.add(loan)
        self._active_loans[barcode] = loan
        return loan

    def give_back(self, barcode: str, today: date) -> int:
        loan = self._active_loans.pop(barcode, None)
        if loan is None:
            raise RuntimeError("no active loan")
        loan.copy.mark_available()
        loan.member.remove(loan)
        return loan.fine_for(today)


def main() -> None:
    lib = Library()
    cc = Book("978-0132350884", "Clean Code", ("Robert C. Martin",))
    lib.add_copy(BookCopy("C1", cc))
    asha = Member("M1")
    d0 = date(2026, 1, 1)
    loan = lib.checkout(asha, "C1", d0)
    print(str(loan.renew(d0 + timedelta(days=10))).lower())  # true, due day 24 from start+10
    print(str(loan.renew(d0 + timedelta(days=12))).lower())  # false: one renewal only
    print(lib.give_back("C1", d0 + timedelta(days=27)))  # 3 days late -> 3000 paise


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `
class LocalDate {
  private constructor(private readonly epochDay: number) {}
  static of(year: number, month: number, day: number): LocalDate {
    return new LocalDate(Math.round(Date.UTC(year, month - 1, day) / 86_400_000));
  }
  plusDays(n: number): LocalDate { return new LocalDate(this.epochDay + n); }
  daysUntil(other: LocalDate): number { return other.epochDay - this.epochDay; }
}

enum CopyStatus { Available, Loaned, Lost }

class Book {
  private reserved = false;
  private readonly authors: readonly string[];
  constructor(readonly isbn: string, private readonly name: string, authors: string[]) {
    this.authors = [...authors];
  }
  isReserved(): boolean { return this.reserved; }
  setReserved(r: boolean): void { this.reserved = r; }
  title(): string { return this.name; }
}

class BookCopy {
  private status = CopyStatus.Available;
  constructor(private readonly code: string, private readonly _book: Book) {}
  isAvailable(): boolean { return this.status === CopyStatus.Available; }
  markLoaned(): void { this.status = CopyStatus.Loaned; }
  markAvailable(): void { this.status = CopyStatus.Available; }
  book(): Book { return this._book; }
  barcode(): string { return this.code; }
}

class Member {
  private static readonly MAX_LOANS = 3;
  private readonly loans: Loan[] = [];
  constructor(readonly id: string) {}
  canBorrow(): boolean { return this.loans.length < Member.MAX_LOANS; }
  add(l: Loan): void { this.loans.push(l); }
  remove(l: Loan): void {
    const i = this.loans.indexOf(l);
    if (i >= 0) this.loans.splice(i, 1);
  }
}

class Loan {
  private static readonly PERIOD_DAYS = 14;
  private static readonly MAX_RENEWALS = 1;
  private static readonly FINE_PER_DAY_PAISE = 1000;
  private due: LocalDate;
  private renewals = 0;
  constructor(private readonly _member: Member, private readonly _copy: BookCopy, start: LocalDate) {
    this.due = start.plusDays(Loan.PERIOD_DAYS);
  }
  renew(today: LocalDate): boolean {
    if (this.renewals >= Loan.MAX_RENEWALS || this._copy.book().isReserved()) return false;
    this.due = today.plusDays(Loan.PERIOD_DAYS);
    this.renewals++;
    return true;
  }
  fineFor(returned: LocalDate): number { // derived from data Loan owns
    const late = this.due.daysUntil(returned);
    return Math.max(0, late) * Loan.FINE_PER_DAY_PAISE;
  }
  member(): Member { return this._member; }
  copy(): BookCopy { return this._copy; }
  dueDate(): LocalDate { return this.due; }
}

class Library {
  private readonly copies = new Map<string, BookCopy>();
  private readonly activeLoans = new Map<string, Loan>(); // barcode -> loan

  addCopy(c: BookCopy): void { this.copies.set(c.barcode(), c); }

  checkout(m: Member, barcode: string, today: LocalDate): Loan {
    const c = this.copies.get(barcode);
    if (!c || !c.isAvailable()) throw new Error("copy not available");
    if (!m.canBorrow()) throw new Error("loan limit reached");
    const loan = new Loan(m, c, today);
    c.markLoaned();
    m.add(loan);
    this.activeLoans.set(barcode, loan);
    return loan;
  }

  giveBack(barcode: string, today: LocalDate): number {
    const loan = this.activeLoans.get(barcode);
    if (!loan) throw new Error("no active loan");
    this.activeLoans.delete(barcode);
    loan.copy().markAvailable();
    loan.member().remove(loan);
    return loan.fineFor(today);
  }
}

function main(): void {
  const lib = new Library();
  const cc = new Book("978-0132350884", "Clean Code", ["Robert C. Martin"]);
  lib.addCopy(new BookCopy("C1", cc));
  const asha = new Member("M1");
  const d0 = LocalDate.of(2026, 1, 1);
  const loan = lib.checkout(asha, "C1", d0);
  console.log(loan.renew(d0.plusDays(10))); // true, due day 24 from start+10
  console.log(loan.renew(d0.plusDays(12))); // false: one renewal only
  console.log(lib.giveBack("C1", d0.plusDays(27))); // 3 days late -> 3000 paise
}
main();` },
          { lang: 'cpp', code: `
using Day = chrono::sys_days;
using chrono::days;

enum class CopyStatus { Available, Loaned, Lost };

class Book {
public:
    Book(string isbn, string title, vector<string> authors)
        : isbn_(std::move(isbn)), title_(std::move(title)), authors_(std::move(authors)) {}
    bool isReserved() const { return reserved_; }
    void setReserved(bool r) { reserved_ = r; }
    const string& title() const { return title_; }
private:
    string isbn_, title_;
    vector<string> authors_;
    bool reserved_ = false;
};

class BookCopy {
public:
    BookCopy(string barcode, shared_ptr<Book> book) : barcode_(std::move(barcode)), book_(std::move(book)) {}
    bool isAvailable() const { return status_ == CopyStatus::Available; }
    void markLoaned() { status_ = CopyStatus::Loaned; }
    void markAvailable() { status_ = CopyStatus::Available; }
    const Book& book() const { return *book_; }
    const string& barcode() const { return barcode_; }
private:
    string barcode_;
    shared_ptr<Book> book_;  // many copies share one Book
    CopyStatus status_ = CopyStatus::Available;
};

class Loan;

class Member {
public:
    explicit Member(string id) : id_(std::move(id)) {}
    bool canBorrow() const { return loans_.size() < MAX_LOANS; }
    void add(Loan* l) { loans_.push_back(l); }
    void remove(Loan* l) { loans_.erase(std::remove(loans_.begin(), loans_.end(), l), loans_.end()); }
private:
    static constexpr size_t MAX_LOANS = 3;
    string id_;
    vector<Loan*> loans_;  // non-owning: the Library owns the loans
};

class Loan {
public:
    Loan(Member& member, BookCopy& copy, Day start)
        : member_(&member), copy_(&copy), due_(start + days(PERIOD_DAYS)) {}
    bool renew(Day today) {
        if (renewals_ >= MAX_RENEWALS || copy_->book().isReserved()) return false;
        due_ = today + days(PERIOD_DAYS);
        ++renewals_;
        return true;
    }
    long long fineFor(Day returned) const {  // derived from data Loan owns
        long long late = (returned - due_).count();
        return std::max(0LL, late) * FINE_PER_DAY_PAISE;
    }
    Member& member() const { return *member_; }
    BookCopy& copy() const { return *copy_; }
    Day dueDate() const { return due_; }
private:
    static constexpr int PERIOD_DAYS = 14, MAX_RENEWALS = 1;
    static constexpr long long FINE_PER_DAY_PAISE = 1000;
    Member* member_;
    BookCopy* copy_;
    Day due_;
    int renewals_ = 0;
};

class Library {
public:
    void addCopy(unique_ptr<BookCopy> c) {
        string code = c->barcode();
        copies_[code] = std::move(c);
    }

    Loan& checkout(Member& m, const string& barcode, Day today) {
        auto it = copies_.find(barcode);
        if (it == copies_.end() || !it->second->isAvailable()) throw runtime_error("copy not available");
        if (!m.canBorrow()) throw runtime_error("loan limit reached");
        auto loan = make_unique<Loan>(m, *it->second, today);
        it->second->markLoaned();
        m.add(loan.get());
        Loan& ref = *loan;
        activeLoans_[barcode] = std::move(loan);
        return ref;
    }

    long long giveBack(const string& barcode, Day today) {
        auto it = activeLoans_.find(barcode);
        if (it == activeLoans_.end()) throw runtime_error("no active loan");
        unique_ptr<Loan> loan = std::move(it->second);
        activeLoans_.erase(it);
        loan->copy().markAvailable();
        loan->member().remove(loan.get());
        return loan->fineFor(today);
    }

private:
    map<string, unique_ptr<BookCopy>> copies_;
    map<string, unique_ptr<Loan>> activeLoans_;  // barcode -> loan
};

int main() {
    Library lib;
    auto cc = make_shared<Book>("978-0132350884", "Clean Code", vector<string>{"Robert C. Martin"});
    lib.addCopy(make_unique<BookCopy>("C1", cc));
    Member asha("M1");
    Day d0 = chrono::year{2026} / 1 / 1;
    Loan& loan = lib.checkout(asha, "C1", d0);
    cout << boolalpha << loan.renew(d0 + days(10)) << "\\n";  // true, due day 24 from start+10
    cout << loan.renew(d0 + days(12)) << "\\n";               // false: one renewal only
    cout << lib.giveBack("C1", d0 + days(27)) << "\\n";       // 3 days late -> 3000 paise
}` }
        ],
        complexity: `<p>checkout/renew/return are O(1) with hash-map lookups by barcode. Memory O(B + C + L) for books, copies, loans. Design complexity: 5 small classes, each testable alone, versus one god class.</p>`,
        followUps: ['Add reservations: a queue of members per Book; who notifies the next member when a copy returns?', 'Support different member tiers (student: 3 loans, faculty: 10). Subclass or policy object?', 'How would you search the catalogue by author or title?']
      }
    }]
  });

  /* =========================== TOPIC 3 =========================== */
  topics.push({
    title: 'Has-a Relationships: Association, Aggregation, Composition & Dependency',
    analogy: `<p>Four everyday pictures:</p>
<ul>
<li><b>Composition</b> = a <b>house and its rooms</b>. Demolish the house and the rooms are gone too. A room never belongs to two houses.</li>
<li><b>Aggregation</b> = a <b>cricket team and its players</b>. Disband the team; the players still exist and can join another team.</li>
<li><b>Association</b> = a <b>doctor and her patients</b>. They know each other for a long time, but neither owns the other.</li>
<li><b>Dependency</b> = you and a <b>taxi</b>. You use it for one ride and forget it. You do not keep it in your pocket.</li>
</ul>`,
    explain: `<p>Classes rarely live alone. The way they connect decides how easy your design is to change. All four relationships below are "has-a" or "uses-a" links (as opposed to "is-a", the next topic). They differ in <b>how long</b> the link lives and <b>who controls the life</b> of the other object.</p>
${H.table(['Relationship', 'UML symbol', 'Life test', 'Code shape', 'Example'], [
  ['<b>Dependency</b>', 'dashed arrow - - -&gt;', 'used only inside one method call', 'method parameter or local variable', 'ReportPrinter uses a Formatter'],
  ['<b>Association</b>', 'solid line / arrow', 'long-lived link, independent lives', 'a field holding a reference', 'Doctor → Patient'],
  ['<b>Aggregation</b>', 'hollow diamond ◇ at the whole', 'whole groups parts; parts survive and can be shared', 'collection field, parts passed in from outside', 'Team ◇— Player'],
  ['<b>Composition</b>', 'filled diamond ◆ at the whole', 'part is created, owned and destroyed by the whole; never shared', 'field created inside the whole, never handed out', 'House ◆— Room']
])}
<p>Think of them as a <b>strength scale</b>: dependency (weakest) → association → aggregation → composition (strongest).</p>
<h4>Three questions decide it</h4>
<ol>
<li><b>Does A keep B after the method returns?</b> No → dependency. Yes → keep asking.</li>
<li><b>Can B exist without A, or belong to another A at the same time?</b> Yes → association or aggregation. No → composition.</li>
<li><b>Is A a "container/group" of B?</b> Yes → aggregation. Just a peer link → association.</li>
</ol>
<h4>Multiplicity: how many?</h4>
${H.table(['Notation', 'Meaning', 'Code shape (Java syntax)'], [['1', 'exactly one', '<code>private final Engine engine;</code>'], ['0..1', 'zero or one (optional)', '<code>private Car car;</code> (nullable) or an optional getter (<code>Optional</code>, <code>None</code>, <code>std::optional</code>)'], ['0..* or *', 'any number', '<code>List&lt;Book&gt; books</code>'], ['1..*', 'at least one', 'list + constructor that requires one'], ['4', 'exactly four', 'array or list with size check']])}
<p><b>Navigability</b> (arrow direction) says who knows whom. <code>Order → Customer</code> means an Order can find its Customer, but Customer may not hold a list of orders. One-way links are simpler: fewer objects to keep in sync. Make a link two-way only when a real use case needs both directions.</p>`,
    clues: [
      '"X consists of / is made of / contains" (a Car is made of an Engine and Wheels) → composition.',
      '"X groups / has a list of Ys that can also exist on their own" (playlist of songs) → aggregation.',
      '"X is assigned to / works with / is linked to Y" (driver assigned to a cab) → association.',
      '"X uses Y to do something" (OrderService uses a PaymentGateway for one call) → dependency.',
      '"If the order is deleted, delete its line items" → composition (cascade delete).',
      '"Each / at most one / at least one / many" → write the multiplicity on the line (1, 0..1, 1..*, 0..*).'
    ],
    code: { lang: 'java', code: `
class Engine { void start() { System.out.println("vroom"); } }
class Room { final String name; Room(String name) { this.name = name; } }
class Player { final String name; Player(String name) { this.name = name; } }
class Patient { final String name; Patient(String name) { this.name = name; } }
class Formatter { String bold(String s) { return "**" + s + "**"; } }

// COMPOSITION: House creates its rooms; they are never shared or handed out raw.
class House {
    private final List<Room> rooms = new ArrayList<>();
    House(String... roomNames) { for (String n : roomNames) rooms.add(new Room(n)); } // born inside
    int roomCount() { return rooms.size(); }
}

// AGGREGATION: Team groups players that were created elsewhere and outlive the team.
class Team {
    private final List<Player> players = new ArrayList<>();
    void add(Player p) { players.add(p); }         // passed in from outside
    void disband() { players.clear(); }            // players still exist afterwards
}

// ASSOCIATION: Doctor keeps references to patients; neither owns the other.
class Doctor {
    private final Set<Patient> patients = new HashSet<>();
    void treat(Patient p) { patients.add(p); }
}

// DEPENDENCY: ReportPrinter only uses Formatter inside one call; no field.
class ReportPrinter {
    String print(String title, Formatter f) { return f.bold(title); }
}

class Relations {
    public static void main(String[] args) {
        House h = new House("kitchen", "bedroom");
        Player virat = new Player("Virat");
        Team rcb = new Team(); rcb.add(virat);
        Team india = new Team(); india.add(virat);   // aggregation allows sharing
        rcb.disband();
        System.out.println(virat.name + " still exists; house has " + h.roomCount() + " rooms");
        System.out.println(new ReportPrinter().print("Q3", new Formatter()));
    }
}`,
alt: [
  { lang: 'python', code: `
class Engine:
    def start(self) -> None:
        print("vroom")


class Room:
    def __init__(self, name: str) -> None:
        self.name = name


class Player:
    def __init__(self, name: str) -> None:
        self.name = name


class Patient:
    def __init__(self, name: str) -> None:
        self.name = name


class Formatter:
    def bold(self, s: str) -> str:
        return f"**{s}**"


# COMPOSITION: House creates its rooms; they are never shared or handed out raw.
class House:
    def __init__(self, *room_names: str) -> None:
        self._rooms = [Room(n) for n in room_names]  # born inside

    def room_count(self) -> int:
        return len(self._rooms)


# AGGREGATION: Team groups players that were created elsewhere and outlive the team.
class Team:
    def __init__(self) -> None:
        self._players: list[Player] = []

    def add(self, p: Player) -> None:  # passed in from outside
        self._players.append(p)

    def disband(self) -> None:  # players still exist afterwards
        self._players.clear()


# ASSOCIATION: Doctor keeps references to patients; neither owns the other.
class Doctor:
    def __init__(self) -> None:
        self._patients: set[Patient] = set()

    def treat(self, p: Patient) -> None:
        self._patients.add(p)


# DEPENDENCY: ReportPrinter only uses Formatter inside one call; no field.
class ReportPrinter:
    def print(self, title: str, f: Formatter) -> str:
        return f.bold(title)


h = House("kitchen", "bedroom")
virat = Player("Virat")
rcb = Team()
rcb.add(virat)
india = Team()
india.add(virat)  # aggregation allows sharing
rcb.disband()
print(f"{virat.name} still exists; house has {h.room_count()} rooms")
print(ReportPrinter().print("Q3", Formatter()))` },
  { lang: 'ts', code: `
class Engine { start(): void { console.log("vroom"); } }
class Room { constructor(readonly name: string) {} }
class Player { constructor(readonly name: string) {} }
class Patient { constructor(readonly name: string) {} }
class Formatter { bold(s: string): string { return "**" + s + "**"; } }

// COMPOSITION: House creates its rooms; they are never shared or handed out raw.
class House {
  private readonly rooms: Room[] = [];
  constructor(...roomNames: string[]) { for (const n of roomNames) this.rooms.push(new Room(n)); } // born inside
  roomCount(): number { return this.rooms.length; }
}

// AGGREGATION: Team groups players that were created elsewhere and outlive the team.
class Team {
  private players: Player[] = [];
  add(p: Player): void { this.players.push(p); } // passed in from outside
  disband(): void { this.players = []; } // players still exist afterwards
}

// ASSOCIATION: Doctor keeps references to patients; neither owns the other.
class Doctor {
  private readonly patients = new Set<Patient>();
  treat(p: Patient): void { this.patients.add(p); }
}

// DEPENDENCY: ReportPrinter only uses Formatter inside one call; no field.
class ReportPrinter {
  print(title: string, f: Formatter): string { return f.bold(title); }
}

const h = new House("kitchen", "bedroom");
const virat = new Player("Virat");
const rcb = new Team(); rcb.add(virat);
const india = new Team(); india.add(virat); // aggregation allows sharing
rcb.disband();
console.log(\`\${virat.name} still exists; house has \${h.roomCount()} rooms\`);
console.log(new ReportPrinter().print("Q3", new Formatter()));` },
  { lang: 'cpp', code: `
class Engine { public: void start() { cout << "vroom\\n"; } };
class Room { public: const string name; explicit Room(string n) : name(std::move(n)) {} };
class Player { public: const string name; explicit Player(string n) : name(std::move(n)) {} };
class Patient { public: const string name; explicit Patient(string n) : name(std::move(n)) {} };
class Formatter { public: string bold(const string& s) const { return "**" + s + "**"; } };

// COMPOSITION: House creates and owns its rooms; they die with the house.
class House {
    vector<Room> rooms_;  // stored by value: the lifetime is tied to House
public:
    House(initializer_list<string> roomNames) { for (const auto& n : roomNames) rooms_.emplace_back(n); }
    int roomCount() const { return static_cast<int>(rooms_.size()); }
};

// AGGREGATION: Team groups players that were created elsewhere and outlive the team.
class Team {
    vector<const Player*> players_;  // non-owning pointers
public:
    void add(const Player& p) { players_.push_back(&p); }  // passed in from outside
    void disband() { players_.clear(); }                   // players still exist afterwards
};

// ASSOCIATION: Doctor keeps references to patients; neither owns the other.
class Doctor {
    set<const Patient*> patients_;
public:
    void treat(const Patient& p) { patients_.insert(&p); }
};

// DEPENDENCY: ReportPrinter only uses Formatter inside one call; no member.
class ReportPrinter {
public:
    string print(const string& title, const Formatter& f) const { return f.bold(title); }
};

int main() {
    House h{"kitchen", "bedroom"};
    Player virat("Virat");
    Team rcb; rcb.add(virat);
    Team india; india.add(virat);  // aggregation allows sharing
    rcb.disband();
    cout << virat.name << " still exists; house has " << h.roomCount() << " rooms\\n";
    cout << ReportPrinter().print("Q3", Formatter()) << "\\n";
}` }
] },
    codeTitle: 'The four relationships as code',
    viz: [{
      title: 'Build a class diagram from relationship arrows (editable)',
      input: 'Car *-- 1 Engine; Car *-- 4 Wheel; Driver --> 0..1 Car; Garage o-- 0..* Car; Mechanic ..> Car',
      inputLabel: 'Relations: A *-- B (composition), A o-- B (aggregation), A --> B / A -- B (association), A ..> B (dependency); optional multiplicity before B',
      gen: function (input) { return relFrames(input, 'Has-a relationships (arrow from whole/owner to part)'); }
    }, {
      title: 'The lifecycle test: delete the whole, who survives?',
      gen: function () {
        var nodes = [bx('House', 'House', 25, 8), bx('R1', 'Kitchen', 10, 32), bx('R2', 'Bedroom', 40, 32), bx('Team', 'Team RCB', 75, 8), bx('P1', 'Virat', 62, 32), bx('P2', 'Faf', 88, 32), bx('India', 'Team India', 75, 52)];
        var edges = [['House', 'R1', '◆ owns'], ['House', 'R2', '◆ owns'], ['Team', 'P1', '◇ has-a'], ['Team', 'P2', '◇ has-a']];
        function G(n, e, hl, ehl, tags) { return { type: 'graph', label: 'Composition (left) vs Aggregation (right)', directed: true, height: 60, nodes: cp(n), edges: e, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        return [
          { narr: 'Left: a <b>House</b> composed of rooms (filled diamond ◆). Right: a <b>Team</b> aggregating players (hollow diamond ◇). They look similar on paper. The difference shows up when the whole dies.', parts: [G(nodes.slice(0, 6), edges, {})] },
          { narr: 'Where did the parts come from? Rooms were <b>created inside</b> <code>new House(...)</code>. Players were <b>created elsewhere</b> and passed to <code>team.add(p)</code>. Who creates is the first hint.', parts: [G(nodes.slice(0, 6), edges, { R1: 'ok', R2: 'ok', P1: 'win', P2: 'win' }, {}, { R1: 'made by House', R2: 'made by House', P1: 'made outside', P2: 'made outside' }), { type: 'code', label: 'Creation', lang: 'java', code: 'House h = new House("Kitchen", "Bedroom"); // rooms born inside\nPlayer virat = new Player("Virat");           // born outside\nteam.add(virat);', hl: { 1: 'ok', 2: 'cur', 3: 'cur' }, alt: {
            python: { code: 'h = House("Kitchen", "Bedroom")    # rooms born inside\nvirat = Player("Virat")            # born outside\nteam.add(virat)' },
            js: { lang: 'ts', code: 'const h = new House("Kitchen", "Bedroom"); // rooms born inside\nconst virat = new Player("Virat");          // born outside\nteam.add(virat);' },
            cpp: { code: 'House h("Kitchen", "Bedroom");   // rooms born inside\nPlayer virat("Virat");            // born outside\nteam.add(virat);' } } }] },
          { narr: 'Can a part be <b>shared</b>? Virat can play for RCB <b>and</b> Team India at the same time: aggregation allows it. A kitchen cannot belong to two houses: composition forbids it.', parts: [G(nodes, edges.concat([['India', 'P1', '◇ has-a']]), { P1: 'sel', India: 'ok' }, { 'India-P1': 'cur' }, { P1: 'shared by 2 teams' })] },
          { narr: 'Now <b>demolish the house</b>. The rooms go with it: no one else refers to them and they make no sense alone. That is <b>composition</b>: the whole controls the life of its parts.', parts: [G(nodes, edges.concat([['India', 'P1', '◇ has-a']]), { House: 'bad', R1: 'bad', R2: 'bad' }, { 'House-R1': 'bad', 'House-R2': 'bad' }, { R1: 'destroyed', R2: 'destroyed' })] },
          { narr: '<b>Disband RCB</b>. Virat and Faf still exist; Virat is still in Team India. That is <b>aggregation</b>: the group goes away, the members live on.', parts: [G(nodes, edges.concat([['India', 'P1', '◇ has-a']]), { House: 'bad', R1: 'bad', R2: 'bad', Team: 'bad', P1: 'ok', P2: 'ok' }, { 'Team-P1': 'bad', 'Team-P2': 'bad', 'India-P1': 'ok' }, { P1: 'alive', P2: 'alive (free agent)' })] },
          { narr: 'Rule of thumb you can say in an interview: <b>"If deleting the whole should delete the part, and the part is never shared, it is composition. Otherwise aggregation or plain association."</b>', parts: [{ type: 'table', label: 'Lifecycle test summary', columns: ['Question', 'Composition', 'Aggregation'], rows: [['Who creates the part?', 'the whole', 'someone else'], ['Can the part be shared?', 'no', 'yes'], ['Whole deleted → part?', 'deleted', 'survives'], ['UML', 'filled ◆', 'hollow ◇']], hl: { 2: 'sel' } }] }
        ];
      }
    }],
    examples: [
      { title: 'University ◆ Department ◇ Professor', html: `<p>A <b>University</b> is composed of <b>Departments</b>: close the university and the CS department ceases to exist (composition, 1 → 1..*). A Department aggregates <b>Professors</b>: if the department closes, professors still exist and may move to another department (aggregation, 0..*). A Professor <b>teaches</b> Courses: association (many-to-many). Grading software that <b>uses</b> a <code>GradeCalculator</code> for one call: dependency.</p>
${H.table(['Pair', 'Relationship', 'Multiplicity'], [['University–Department', 'composition ◆', '1 → 1..*'], ['Department–Professor', 'aggregation ◇', '1 → 0..*'], ['Professor–Course', 'association', '* ↔ *'], ['GradeService–GradeCalculator', 'dependency', '-']])}` },
      { title: 'Order ◆ OrderLine, but OrderLine → Product is only association', html: `<p>An <b>OrderLine</b> (product, quantity, price at purchase) only makes sense inside its <b>Order</b>: delete the order, delete its lines. That is composition. But the <b>Product</b> in the line is just referenced: deleting an order must <b>never</b> delete the product from the catalogue. Same object (OrderLine) takes part in a strong link on one side and a weak link on the other. Notice the line copies the price: the product's price may change tomorrow, but the order must remember what the customer paid.</p>`, code: { lang: 'java', code: `
record Product(String sku, String name, long pricePaise) { }
class PurchaseOrder {
    // composition: lines are created inside and never exposed for modification
    private final List<Line> lines = new ArrayList<>();
    record Line(Product product, int qty, long unitPricePaise) { }   // association to Product
    void add(Product p, int qty) { lines.add(new Line(p, qty, p.pricePaise())); } // price frozen
    long totalPaise() { return lines.stream().mapToLong(l -> l.qty() * l.unitPricePaise()).sum(); }
    List<Line> lines() { return List.copyOf(lines); }
}`,
alt: [
  { lang: 'python', code: `
from dataclasses import dataclass


@dataclass(frozen=True)
class Product:
    sku: str
    name: str
    price_paise: int


@dataclass(frozen=True)
class Line:  # association to Product
    product: Product
    qty: int
    unit_price_paise: int


class PurchaseOrder:
    def __init__(self) -> None:
        # composition: lines are created inside and never exposed for modification
        self._lines: list[Line] = []

    def add(self, p: Product, qty: int) -> None:
        self._lines.append(Line(p, qty, p.price_paise))  # price frozen

    def total_paise(self) -> int:
        return sum(line.qty * line.unit_price_paise for line in self._lines)

    def lines(self) -> tuple[Line, ...]:
        return tuple(self._lines)` },
  { lang: 'ts', code: `
interface Product { readonly sku: string; readonly name: string; readonly pricePaise: number; }
interface Line { readonly product: Product; readonly qty: number; readonly unitPricePaise: number; } // association to Product

class PurchaseOrder {
  // composition: lines are created inside and never exposed for modification
  private readonly lineList: Line[] = [];
  add(p: Product, qty: number): void {
    this.lineList.push({ product: p, qty, unitPricePaise: p.pricePaise }); // price frozen
  }
  totalPaise(): number { return this.lineList.reduce((s, l) => s + l.qty * l.unitPricePaise, 0); }
  lines(): readonly Line[] { return [...this.lineList]; }
}` },
  { lang: 'cpp', code: `
struct Product {
    string sku;
    string name;
    long long pricePaise;
};

class PurchaseOrder {
public:
    struct Line {  // association to Product (non-owning)
        const Product* product;
        int qty;
        long long unitPricePaise;
    };

    void add(const Product& p, int qty) { lines_.push_back({&p, qty, p.pricePaise}); }  // price frozen
    long long totalPaise() const {
        long long t = 0;
        for (const auto& l : lines_) t += l.qty * l.unitPricePaise;
        return t;
    }
    const vector<Line>& lines() const { return lines_; }

private:
    // composition: lines are created inside and exposed only as a const reference
    vector<Line> lines_;
};` }
] } },
      { title: 'Two-way association must stay in sync (Student ↔ Course)', html: `<p>If both sides hold references, one method must update <b>both</b> sides, otherwise you get a student who thinks she is enrolled in a course whose roster does not list her. Put the logic in one place and keep the other side hidden (package-private in Java, an underscore-prefixed method in Python, a <code>friend</code> or private method in C++).</p>`, code: { lang: 'java', code: `
class Course {
    private final String code;
    private final Set<Student> roster = new HashSet<>();
    Course(String code) { this.code = code; }
    void addInternal(Student s) { roster.add(s); }     // only Student calls this
    int size() { return roster.size(); }
}
class Student {
    private final Set<Course> courses = new HashSet<>();
    void enroll(Course c) {                            // single entry point keeps both sides consistent
        if (courses.add(c)) c.addInternal(this);
    }
    public static void main(String[] args) {
        Student s = new Student(); Course c = new Course("CS101");
        s.enroll(c); s.enroll(c);                      // second call is a no-op
        System.out.println(c.size());                  // 1
    }
}`,
alt: [
  { lang: 'python', code: `
from __future__ import annotations


class Course:
    def __init__(self, code: str) -> None:
        self._code = code
        self._roster: set[Student] = set()

    def add_internal(self, s: Student) -> None:  # only Student calls this
        self._roster.add(s)

    def size(self) -> int:
        return len(self._roster)


class Student:
    def __init__(self) -> None:
        self._courses: set[Course] = set()

    def enroll(self, c: Course) -> None:  # single entry point keeps both sides consistent
        if c not in self._courses:
            self._courses.add(c)
            c.add_internal(self)


s, c = Student(), Course("CS101")
s.enroll(c)
s.enroll(c)  # second call is a no-op
print(c.size())  # 1` },
  { lang: 'ts', code: `
class Course {
  private readonly roster = new Set<Student>();
  constructor(private readonly code: string) {}
  addInternal(s: Student): void { this.roster.add(s); } // only Student calls this
  size(): number { return this.roster.size; }
}

class Student {
  private readonly courses = new Set<Course>();
  enroll(c: Course): void { // single entry point keeps both sides consistent
    if (!this.courses.has(c)) {
      this.courses.add(c);
      c.addInternal(this);
    }
  }
}

const s = new Student(), c = new Course("CS101");
s.enroll(c);
s.enroll(c); // second call is a no-op
console.log(c.size()); // 1` },
  { lang: 'cpp', code: `
class Student;

class Course {
    string code_;
    set<Student*> roster_;  // non-owning
public:
    explicit Course(string code) : code_(std::move(code)) {}
    void addInternal(Student* s) { roster_.insert(s); }  // only Student calls this
    int size() const { return static_cast<int>(roster_.size()); }
};

class Student {
    set<Course*> courses_;  // non-owning
public:
    void enroll(Course& c) {  // single entry point keeps both sides consistent
        if (courses_.insert(&c).second) c.addInternal(this);
    }
};

int main() {
    Student s;
    Course c("CS101");
    s.enroll(c);
    s.enroll(c);  // second call is a no-op
    cout << c.size() << "\\n";  // 1
}` }
] } }
    ],
    deepDive: `<p><b>UML vs code reality.</b> Java, Python and TypeScript are garbage collected, so "the whole destroys the part" really means: <i>the whole is the only holder of the reference and is responsible for its lifecycle</i>. To truly honour composition: create the part inside (or take a fresh one and never let callers keep it), never return the raw mutable part or list, and make the field private and never reassigned (<code>private final</code>, a <code>_</code> prefix, <code>readonly</code>). C++ makes composition literal: a by-value member or a <code>std::unique_ptr</code> member is destroyed with its owner, while aggregation is a non-owning pointer or reference (or a <code>std::shared_ptr</code> when ownership really is shared). Leaking <code>getRooms()</code> as a mutable list silently turns composition into shared aggregation.</p>
<p><b>Aggregation is the fuzziest notation.</b> The UML spec itself says aggregation semantics vary by application. Many senior engineers only draw <b>association</b> and <b>composition</b> and explain the lifecycle in words. In an interview, saying "aggregation vs association is a modelling nuance; what matters is ownership and lifecycle" shows maturity. The databases echo it: composition ≈ <code>ON DELETE CASCADE</code>, association ≈ a foreign key you must not cascade.</p>
<p><b>Dependency injection is aggregation through the constructor.</b> <code>new OrderService(paymentGateway)</code>: the service holds a gateway it did not create and that lives on (singleton). This makes the dependency swappable in tests. If the service did <code>new StripeGateway()</code> inside, it would be composition and impossible to fake.</p>
<p><b>Association classes.</b> When the link itself has data (enrollment date, grade), promote it to a class: <code>Enrollment(student, course, grade)</code>. Many-to-many relationships almost always end up this way in real systems (and as join tables in SQL).</p>
<p><b>Qualified association.</b> "A library finds a copy by barcode" → <code>Map&lt;String, BookCopy&gt;</code>. UML draws the key (qualifier) as a small box on the line; in code it is simply a map (<code>HashMap</code>, <code>dict</code>, <code>Map</code>, <code>std::map</code>).</p>
<p><b>Bidirectional cost.</b> Two-way links double the update points, create cycles (careful with <code>toString</code>/<code>equals</code>/JSON serialisation recursing forever), and couple both classes. Default to one-way and add the reverse lookup through a repository query when needed.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code makes these relationships implicit. An AI will happily write <code>public List&lt;Room&gt; getRooms() { return rooms; }</code>, quietly destroying composition. You must be the one who reads code and recognises which relationship it <i>actually</i> implements.</p>
<p><b>Use AI as a partner:</b> ask <code>For each field in these classes, tell me if it is dependency, association, aggregation or composition, and whether any getter leaks ownership.</code> Or have it draw the PlantUML for your skeleton, then compare it with your intended diagram. Diffs reveal design drift.</p>
<p><b>Where AI goes wrong:</b> it confuses aggregation and composition (it often picks by gut, not the lifecycle test), makes every link bidirectional "for convenience", and creates JPA cascade settings that delete shared entities (cascade REMOVE on a many-to-many is a classic production bug).</p>
<p><b>What you must still own:</b> the lifecycle questions (who creates, who can share, what happens on delete) asked of the real business, plus the multiplicities. These come from talking to people, not from the code, so no model can infer them for you.</p>`,
    problems: [{
      title: 'Model a University: Choose the Right Relationship for Each Pair',
      level: 'Medium', tags: ['composition', 'aggregation', 'association', 'multiplicity'], companies: ['Google', 'Adobe', 'Oracle'],
      statement: `<p>A university has departments. Each department has professors; a professor belongs to exactly one department at a time but may move. Professors teach courses; a course can be co-taught. Students enroll in courses and get a grade per enrollment. If the university shuts down, its departments are gone, but professors and students are people who still exist. For each pair, choose association, aggregation or composition, give the multiplicity, and write the code skeleton.</p>`,
      constraints: `<ul><li>A department belongs to exactly one university.</li><li>A professor is in 0..1 departments at a time.</li><li>Grade is stored per (student, course) pair.</li></ul>`,
      example: `${H.table(['Pair', 'Relationship', 'Multiplicity', 'Why'], [['University–Department', H.c('g', 'composition'), '1 → 1..*', 'department dies with the university'], ['Department–Professor', H.c('b', 'aggregation'), '0..1 → 0..*', 'professor outlives and can move'], ['Professor–Course', H.c('p', 'association'), '* ↔ *', 'co-teaching, independent lives'], ['Student–Course', H.c('p', 'association class Enrollment'), '* ↔ *', 'the link has its own data (grade)']])}`,
      brute: {
        why: `<p>The naive design stores everything as strings inside one <code>University</code> class: <code>Map&lt;String, List&lt;String&gt;&gt; deptToProfs</code>, <code>Map&lt;String, Map&lt;String, String&gt;&gt; grades</code>. There is no Professor object, so moving a professor means hunting through maps and hoping you removed her from the old department. Grades keyed by concatenated strings break when a name changes. Relationships exist only in the programmer's head, so nobody can tell which deletions should cascade.</p>`,
        code: { lang: 'java', code: `
class University {
    Map<String, List<String>> deptToProfs = new HashMap<>();
    Map<String, List<String>> courseToStudents = new HashMap<>();
    Map<String, String> grades = new HashMap<>();   // key "student|course" -> grade
    void moveProf(String prof, String from, String to) {
        deptToProfs.get(from).remove(prof);          // forget this line once and the prof is in two depts
        deptToProfs.computeIfAbsent(to, k -> new ArrayList<>()).add(prof);
    }
    void grade(String student, String course, String g) { grades.put(student + "|" + course, g); }
}`, alt: [
                { lang: 'python', code: `
class University:
    def __init__(self):
        self.dept_to_profs = {}
        self.course_to_students = {}
        self.grades = {}   # key "student|course" -> grade

    def move_prof(self, prof, frm, to):
        self.dept_to_profs[frm].remove(prof)          # forget this line once and the prof is in two depts
        self.dept_to_profs.setdefault(to, []).append(prof)

    def grade(self, student, course, g):
        self.grades[student + "|" + course] = g` },
                { lang: 'ts', code: `
class University {
    deptToProfs = new Map<string, string[]>();
    courseToStudents = new Map<string, string[]>();
    grades = new Map<string, string>();   // key "student|course" -> grade
    moveProf(prof: string, from: string, to: string): void {
        const old = this.deptToProfs.get(from)!;
        old.splice(old.indexOf(prof), 1);          // forget this line once and the prof is in two depts
        if (!this.deptToProfs.has(to)) this.deptToProfs.set(to, []);
        this.deptToProfs.get(to)!.push(prof);
    }
    grade(student: string, course: string, g: string): void { this.grades.set(student + "|" + course, g); }
}` },
                { lang: 'cpp', code: `
class University {
    unordered_map<string, vector<string>> deptToProfs;
    unordered_map<string, vector<string>> courseToStudents;
    unordered_map<string, string> grades;   // key "student|course" -> grade
public:
    void moveProf(const string& prof, const string& from, const string& to) {
        auto& v = deptToProfs[from];
        v.erase(find(v.begin(), v.end(), prof));     // forget this line once and the prof is in two depts
        deptToProfs[to].push_back(prof);
    }
    void grade(const string& student, const string& course, const string& g) { grades[student + "|" + course] = g; }
};` }
              ] }
      },
      mcq: { q: 'Students and courses are many-to-many, and each pair needs a grade. How should you model it?', options: ['Student has List&lt;Course&gt;, Course has List&lt;Student&gt;, grade in Student as Map&lt;String,String&gt;', 'An Enrollment class holding student, course and grade', 'Make Student extend Course', 'Composition: Course owns its Students'], answer: 1, explain: 'When the link itself carries data, promote the link to an association class (Enrollment). It also maps cleanly to a join table.' },
      hints: [
        `<p>Hint 1: apply the lifecycle test to each pair. "If the university shuts down, departments are gone" is literally the definition of composition.</p>`,
        `<p>Hint 2: "belongs to exactly one department at a time but may move" → aggregation from Department to Professor plus a back-reference <code>Professor.department</code> (0..1) kept in sync by one method.</p>`,
        `<p>Hint 3: the grade lives neither in Student nor Course: create <code>Enrollment(student, course, grade)</code>. University creates departments inside <code>openDepartment(name)</code> so they can never be shared.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "0 1\nA\n" }] },
      solution: {
        approach: `<p>University <b>composes</b> departments: created via <code>university.openDepartment(name)</code>, stored privately, never constructed outside. Department <b>aggregates</b> professors: professors are created elsewhere and joined; <code>Department.hire</code> removes the professor from the old department first, keeping the two-way 0..1 ↔ 0..* link consistent in one place. Professor ↔ Course is a plain many-to-many <b>association</b>. Student–Course goes through the <b>association class</b> <code>Enrollment</code> that owns the grade. Grade is an enum, so invalid grades cannot exist.</p>`,
        code: `
enum Grade { A, B, C, D, F, IN_PROGRESS }

class Professor {
    private final String name;
    private Department department;                     // 0..1, kept in sync by Department
    private final Set<Course> teaches = new HashSet<>();
    Professor(String name) { this.name = name; }
    void setDepartmentInternal(Department d) { this.department = d; }
    Department department() { return department; }
    void teach(Course c) { teaches.add(c); c.addTeacherInternal(this); }
    String name() { return name; }
}

class Department {
    private final String name;
    private final Set<Professor> professors = new HashSet<>();   // aggregation
    Department(String name) { this.name = name; }                 // package-private use by University
    void hire(Professor p) {
        Department old = p.department();
        if (old == this) return;
        if (old != null) old.professors.remove(p);              // keep both sides consistent
        professors.add(p);
        p.setDepartmentInternal(this);
    }
    int headcount() { return professors.size(); }
    String name() { return name; }
}

class University {
    private final Map<String, Department> departments = new LinkedHashMap<>();   // composition
    Department openDepartment(String name) {
        return departments.computeIfAbsent(name, Department::new);  // created only here
    }
    int departmentCount() { return departments.size(); }
}

class Course {
    private final String code;
    private final Set<Professor> teachers = new HashSet<>();
    Course(String code) { this.code = code; }
    void addTeacherInternal(Professor p) { teachers.add(p); }
    String code() { return code; }
}

class Student {
    private final String name;
    private final List<Enrollment> enrollments = new ArrayList<>();
    Student(String name) { this.name = name; }
    Enrollment enroll(Course c) { Enrollment e = new Enrollment(this, c); enrollments.add(e); return e; }
}

class Enrollment {                                     // association class: the link has data
    private final Student student;
    private final Course course;
    private Grade grade = Grade.IN_PROGRESS;
    Enrollment(Student s, Course c) { this.student = s; this.course = c; }
    void assign(Grade g) { this.grade = g; }
    Grade grade() { return grade; }

    public static void main(String[] args) {
        University iit = new University();
        Department cs = iit.openDepartment("CS"), ee = iit.openDepartment("EE");
        Professor rao = new Professor("Rao");
        cs.hire(rao); ee.hire(rao);                    // moves, never in two departments
        System.out.println(cs.headcount() + " " + ee.headcount());   // 0 1
        Course dsa = new Course("CS201"); rao.teach(dsa);
        Enrollment e = new Student("Asha").enroll(dsa); e.assign(Grade.A);
        System.out.println(e.grade());                 // A
    }
}`,
        alt: [
          { lang: 'python', code: `
from __future__ import annotations

from enum import Enum


class Grade(Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    F = "F"
    IN_PROGRESS = "IN_PROGRESS"


class Professor:
    def __init__(self, name: str) -> None:
        self.name = name
        self.department: Department | None = None  # 0..1, kept in sync by Department
        self._teaches: set[Course] = set()

    def set_department_internal(self, d: Department | None) -> None:
        self.department = d

    def teach(self, course: Course) -> None:
        self._teaches.add(course)
        course.add_teacher_internal(self)


class Department:
    def __init__(self, name: str) -> None:
        self.name = name
        self._professors: set[Professor] = set()  # aggregation

    def hire(self, p: Professor) -> None:
        old = p.department
        if old is self:
            return
        if old is not None:
            old._professors.discard(p)  # keep both sides consistent
        self._professors.add(p)
        p.set_department_internal(self)

    def headcount(self) -> int:
        return len(self._professors)


class University:
    def __init__(self) -> None:
        self._departments: dict[str, Department] = {}  # composition

    def open_department(self, name: str) -> Department:
        if name not in self._departments:
            self._departments[name] = Department(name)  # created only here
        return self._departments[name]

    def department_count(self) -> int:
        return len(self._departments)


class Course:
    def __init__(self, code: str) -> None:
        self.code = code
        self._teachers: set[Professor] = set()

    def add_teacher_internal(self, p: Professor) -> None:
        self._teachers.add(p)


class Student:
    def __init__(self, name: str) -> None:
        self.name = name
        self._enrollments: list[Enrollment] = []

    def enroll(self, course: Course) -> Enrollment:
        e = Enrollment(self, course)
        self._enrollments.append(e)
        return e


class Enrollment:  # association class: the link has data
    def __init__(self, student: Student, course: Course) -> None:
        self.student = student
        self.course = course
        self._grade = Grade.IN_PROGRESS

    def assign(self, g: Grade) -> None:
        self._grade = g

    def grade(self) -> Grade:
        return self._grade


def main() -> None:
    iit = University()
    cs, ee = iit.open_department("CS"), iit.open_department("EE")
    rao = Professor("Rao")
    cs.hire(rao)
    ee.hire(rao)  # moves, never in two departments
    print(cs.headcount(), ee.headcount())  # 0 1
    dsa = Course("CS201")
    rao.teach(dsa)
    e = Student("Asha").enroll(dsa)
    e.assign(Grade.A)
    print(e.grade().name)  # A


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `
enum Grade { A = "A", B = "B", C = "C", D = "D", F = "F", IN_PROGRESS = "IN_PROGRESS" }

class Professor {
  private dept: Department | null = null; // 0..1, kept in sync by Department
  private readonly teaches = new Set<Course>();
  constructor(readonly name: string) {}
  setDepartmentInternal(d: Department | null): void { this.dept = d; }
  department(): Department | null { return this.dept; }
  teach(c: Course): void {
    this.teaches.add(c);
    c.addTeacherInternal(this);
  }
}

class Department {
  private readonly professors = new Set<Professor>(); // aggregation
  constructor(readonly name: string) {}
  hire(p: Professor): void {
    const old = p.department();
    if (old === this) return;
    if (old) old.professors.delete(p); // keep both sides consistent
    this.professors.add(p);
    p.setDepartmentInternal(this);
  }
  headcount(): number { return this.professors.size; }
}

class University {
  private readonly departments = new Map<string, Department>(); // composition
  openDepartment(name: string): Department {
    let d = this.departments.get(name);
    if (!d) {
      d = new Department(name); // created only here
      this.departments.set(name, d);
    }
    return d;
  }
  departmentCount(): number { return this.departments.size; }
}

class Course {
  private readonly teachers = new Set<Professor>();
  constructor(readonly code: string) {}
  addTeacherInternal(p: Professor): void { this.teachers.add(p); }
}

class Student {
  private readonly enrollments: Enrollment[] = [];
  constructor(readonly name: string) {}
  enroll(c: Course): Enrollment {
    const e = new Enrollment(this, c);
    this.enrollments.push(e);
    return e;
  }
}

class Enrollment { // association class: the link has data
  private current: Grade = Grade.IN_PROGRESS;
  constructor(readonly student: Student, readonly course: Course) {}
  assign(g: Grade): void { this.current = g; }
  grade(): Grade { return this.current; }
}

function main(): void {
  const iit = new University();
  const cs = iit.openDepartment("CS"), ee = iit.openDepartment("EE");
  const rao = new Professor("Rao");
  cs.hire(rao);
  ee.hire(rao); // moves, never in two departments
  console.log(cs.headcount() + " " + ee.headcount()); // 0 1
  const dsa = new Course("CS201");
  rao.teach(dsa);
  const e = new Student("Asha").enroll(dsa);
  e.assign(Grade.A);
  console.log(e.grade()); // A
}
main();` },
          { lang: 'cpp', code: `
enum class Grade { A, B, C, D, F, InProgress };

string gradeName(Grade g) {
    static const char* names[] = {"A", "B", "C", "D", "F", "IN_PROGRESS"};
    return names[static_cast<int>(g)];
}

class Department;
class Course;

class Professor {
public:
    explicit Professor(string name) : name_(std::move(name)) {}
    void setDepartmentInternal(Department* d) { department_ = d; }
    Department* department() const { return department_; }
    void teach(Course& c);
    const string& name() const { return name_; }
private:
    string name_;
    Department* department_ = nullptr;  // 0..1, non-owning, kept in sync by Department
    set<Course*> teaches_;
};

class Course {
public:
    explicit Course(string code) : code_(std::move(code)) {}
    void addTeacherInternal(Professor* p) { teachers_.insert(p); }
    const string& code() const { return code_; }
private:
    string code_;
    set<Professor*> teachers_;
};

void Professor::teach(Course& c) {
    teaches_.insert(&c);
    c.addTeacherInternal(this);
}

class Department {
public:
    explicit Department(string name) : name_(std::move(name)) {}
    void hire(Professor& p) {
        Department* old = p.department();
        if (old == this) return;
        if (old) old->professors_.erase(&p);  // keep both sides consistent
        professors_.insert(&p);               // aggregation: professors live elsewhere
        p.setDepartmentInternal(this);
    }
    int headcount() const { return static_cast<int>(professors_.size()); }
    const string& name() const { return name_; }
private:
    string name_;
    set<Professor*> professors_;
};

class University {
public:
    Department& openDepartment(const string& name) {
        auto& slot = departments_[name];
        if (!slot) slot = make_unique<Department>(name);  // created (and owned) only here
        return *slot;
    }
    int departmentCount() const { return static_cast<int>(departments_.size()); }
private:
    map<string, unique_ptr<Department>> departments_;  // composition
};

class Student;

class Enrollment {  // association class: the link has data
public:
    Enrollment(Student& s, Course& c) : student_(&s), course_(&c) {}
    void assign(Grade g) { grade_ = g; }
    Grade grade() const { return grade_; }
private:
    Student* student_;
    Course* course_;
    Grade grade_ = Grade::InProgress;
};

class Student {
public:
    explicit Student(string name) : name_(std::move(name)) {}
    Enrollment& enroll(Course& c) {
        enrollments_.push_back(make_unique<Enrollment>(*this, c));
        return *enrollments_.back();
    }
private:
    string name_;
    vector<unique_ptr<Enrollment>> enrollments_;  // the student owns its enrollments
};

int main() {
    University iit;
    Department& cs = iit.openDepartment("CS");
    Department& ee = iit.openDepartment("EE");
    Professor rao("Rao");
    cs.hire(rao);
    ee.hire(rao);  // moves, never in two departments
    cout << cs.headcount() << " " << ee.headcount() << "\\n";  // 0 1
    Course dsa("CS201");
    rao.teach(dsa);
    Student asha("Asha");
    Enrollment& e = asha.enroll(dsa);
    e.assign(Grade::A);
    cout << gradeName(e.grade()) << "\\n";  // A
}` }
        ],
        complexity: `<p>All operations are O(1) average with hash sets/maps. The design keeps every two-way link updated from a single method, so consistency bugs cannot creep in from other callers.</p>`,
        followUps: ['A professor can now hold joint appointments in two departments. What changes?', 'How would these relationships map to SQL tables and foreign keys (cascade or not)?', 'Where would you put "a student may take at most 6 courses per semester"?']
      }
    }]
  });

  /* =========================== TOPIC 4 =========================== */
  topics.push({
    title: 'Is-a Relationships: Inheritance, Interfaces & Polymorphism',
    analogy: `<p><b>Inheritance</b> is like job titles: "a <b>surgeon is a doctor</b>". Everything you can expect from any doctor (check your pulse, write a prescription) you can expect from a surgeon, plus she can operate. If some "doctor" could <i>not</i> check a pulse, the family tree is lying.</p>
<p>An <b>interface</b> is like a <b>driving licence</b>. A teacher, a chef and a robot can all hold one. The licence does not say what you <i>are</i>, only what you <i>can do</i>: "can drive". Hiring someone "who can drive" lets you pick any licence holder: that is <b>polymorphism</b>.</p>`,
    explain: `<p>"Is-a" links let you treat many kinds of things through one common type. Object-oriented languages give you two tools:</p>
${H.table(['Tool', 'Java syntax', 'UML', 'Use when'], [
  ['<b>Inheritance</b> (generalisation)', '<code>class Dog extends Animal</code>', 'solid line, hollow triangle ▷ at the parent', 'a true "kind of" relation AND shared state/code'],
  ['<b>Interface</b> (realisation)', '<code>class Bird implements Flyable</code>', 'dashed line, hollow triangle ▷, «interface»', 'a capability many unrelated classes share'],
  ['<b>Abstract class</b>', '<code>abstract class Shape</code>', 'name in <i>italics</i> or «abstract»', 'a partial base: some code shared, some steps left to children']
])}
<h4>Polymorphism: one call, many behaviours</h4>
<p>If <code>Circle</code> and <code>Square</code> both extend <code>Shape</code> and override <code>area()</code>, then <code>for (Shape s : shapes) total += s.area();</code> runs the right formula for each object <b>at runtime</b>. No <code>if (type == "circle")</code>. Adding a <code>Triangle</code> means writing one new class; the loop never changes. This is the single biggest reason OO designs are easy to extend.</p>
<h4>The is-a test (and when it fails)</h4>
<p>Before writing <code>extends</code>, say the sentence "<b>every</b> X is a Y, and can do <b>everything</b> a Y can, in every situation". Classic failures:</p>
<ul>
<li>${H.c('r', 'Penguin extends Bird')} where Bird has <code>fly()</code>: a penguin cannot fly, so <code>fly()</code> would throw. Fix: move flying to a <code>Flyable</code> interface.</li>
<li>${H.c('r', 'Manager extends Employee')} when people get promoted: an object cannot change its class at runtime. Fix: <code>Employee</code> <b>has a</b> <code>Role</code> (composition).</li>
<li>${H.c('r', 'Stack extends ArrayList')} just to reuse code: now callers can insert in the middle of your stack. Fix: a Stack that <b>has</b> a list inside.</li>
</ul>
<p>That is the famous advice <b>"favour composition over inheritance"</b>: inherit for true "kind-of" types, compose for reuse and for things that change.</p>
<h4>Abstract class vs interface</h4>
${H.table(['', 'Abstract class', 'Interface'], [['State (fields)', 'yes', 'only constants'], ['Constructors', 'yes', 'no'], ['Multiple', 'extend only one', 'implement many'], ['Method bodies', 'yes', '<code>default</code>/<code>static</code>/<code>private</code> methods'], ['Best for', 'shared code + "kind of"', 'capability / contract / plug-in point']])}
<p>The table is Java\'s rule set; the idea carries over. Python has no <code>interface</code> keyword: use <code>abc.ABC</code> (nominal) or <code>typing.Protocol</code> (structural). TypeScript <code>interface</code>s are pure types with no code, so share code with an abstract class or by composition. C++ has no <code>interface</code> keyword either: an abstract class with only pure virtual functions and a virtual destructor is the interface.</p>`,
    clues: [
      '"Different types of X (card, UPI, wallet) behave differently" → an interface or abstract class with one implementation per type.',
      '"Easy to add a new type later without changing existing code" → polymorphism (Open/Closed principle).',
      '"Every X is a Y" said truthfully in every case → inheritance is allowed; otherwise prefer composition.',
      '"An employee can become a manager" / "a user can switch plans" → behaviour changes at runtime → composition (a Role or Plan field), not subclasses.',
      '"Some animals can fly, some can swim" → capabilities → small interfaces (Flyable, Swimmable).',
      '"A fixed, known set of variants" → a closed type: Java <code>sealed</code> interface with records, a TypeScript discriminated union, a Python <code>Union</code> of dataclasses with <code>match</code>, or C++ <code>std::variant</code>.'
    ],
    code: [{ lang: 'java', code: `
// Abstract class: shared state + shared code, one step left to children.
abstract class Shape {
    private final String name;
    protected Shape(String name) { this.name = name; }
    abstract double area();                          // each child must say how
    String describe() { return name + " with area " + String.format("%.2f", area()); } // shared
}
class Circle extends Shape {
    private final double r;
    Circle(double r) { super("Circle"); this.r = r; }
    @Override double area() { return Math.PI * r * r; }
}
class Square extends Shape {
    private final double side;
    Square(double side) { super("Square"); this.side = side; }
    @Override double area() { return side * side; }
}

// Interface: a capability unrelated classes can share.
interface Flyable { int maxAltitudeMeters(); }
class Sparrow implements Flyable { public int maxAltitudeMeters() { return 300; } }
class Drone implements Flyable { public int maxAltitudeMeters() { return 120; } }

class PolymorphismDemo {
    public static void main(String[] args) {
        List<Shape> shapes = List.of(new Circle(1), new Square(2));
        for (Shape s : shapes) System.out.println(s.describe()); // right area() picked at runtime
        List<Flyable> fliers = List.of(new Sparrow(), new Drone());
        int max = 0;
        for (Flyable f : fliers) max = Math.max(max, f.maxAltitudeMeters());
        System.out.println(max);                                 // 300
    }
}`,
alt: [
  { lang: 'python', code: `
import math
from abc import ABC, abstractmethod
from typing import Protocol


# Abstract class: shared state + shared code, one step left to children.
class Shape(ABC):
    def __init__(self, name: str) -> None:
        self._name = name

    @abstractmethod
    def area(self) -> float:  # each child must say how
        raise NotImplementedError

    def describe(self) -> str:  # shared
        return f"{self._name} with area {self.area():.2f}"


class Circle(Shape):
    def __init__(self, r: float) -> None:
        super().__init__("Circle")
        self._r = r

    def area(self) -> float:
        return math.pi * self._r * self._r


class Square(Shape):
    def __init__(self, side: float) -> None:
        super().__init__("Square")
        self._side = side

    def area(self) -> float:
        return self._side * self._side


# Protocol: a capability unrelated classes can share (no common base class needed).
class Flyable(Protocol):
    def max_altitude_meters(self) -> int: ...


class Sparrow:
    def max_altitude_meters(self) -> int:
        return 300


class Drone:
    def max_altitude_meters(self) -> int:
        return 120


shapes: list[Shape] = [Circle(1), Square(2)]
for s in shapes:
    print(s.describe())  # right area() picked at runtime
fliers: list[Flyable] = [Sparrow(), Drone()]
print(max(f.max_altitude_meters() for f in fliers))  # 300` },
  { lang: 'ts', code: `
// Abstract class: shared state + shared code, one step left to children.
abstract class Shape {
  protected constructor(private readonly name: string) {}
  abstract area(): number; // each child must say how
  describe(): string { return \`\${this.name} with area \${this.area().toFixed(2)}\`; } // shared
}
class Circle extends Shape {
  constructor(private readonly r: number) { super("Circle"); }
  area(): number { return Math.PI * this.r * this.r; }
}
class Square extends Shape {
  constructor(private readonly side: number) { super("Square"); }
  area(): number { return this.side * this.side; }
}

// Interface: a capability unrelated classes can share (checked structurally).
interface Flyable { maxAltitudeMeters(): number; }
class Sparrow implements Flyable { maxAltitudeMeters(): number { return 300; } }
class Drone implements Flyable { maxAltitudeMeters(): number { return 120; } }

const shapes: Shape[] = [new Circle(1), new Square(2)];
for (const s of shapes) console.log(s.describe()); // right area() picked at runtime
const fliers: Flyable[] = [new Sparrow(), new Drone()];
console.log(Math.max(...fliers.map((f) => f.maxAltitudeMeters()))); // 300` },
  { lang: 'cpp', code: `
// Abstract class: shared state + shared code, one step left to children.
class Shape {
    string name_;
public:
    virtual ~Shape() = default;                 // virtual destructor: delete through a Shape* is safe
    virtual double area() const = 0;            // each child must say how
    string describe() const {                   // shared
        ostringstream out;
        out << name_ << " with area " << fixed << setprecision(2) << area();
        return out.str();
    }
protected:
    explicit Shape(string name) : name_(std::move(name)) {}
};
class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : Shape("Circle"), r_(r) {}
    double area() const override { return numbers::pi * r_ * r_; }
};
class Square : public Shape {
    double side_;
public:
    explicit Square(double side) : Shape("Square"), side_(side) {}
    double area() const override { return side_ * side_; }
};

// Interface: a capability unrelated classes can share (a class with only pure virtual functions).
class Flyable {
public:
    virtual ~Flyable() = default;
    virtual int maxAltitudeMeters() const = 0;
};
class Sparrow : public Flyable { public: int maxAltitudeMeters() const override { return 300; } };
class Drone : public Flyable { public: int maxAltitudeMeters() const override { return 120; } };

int main() {
    vector<unique_ptr<Shape>> shapes;
    shapes.push_back(make_unique<Circle>(1));
    shapes.push_back(make_unique<Square>(2));
    for (const auto& s : shapes) cout << s->describe() << "\\n";  // right area() picked at runtime
    vector<unique_ptr<Flyable>> fliers;
    fliers.push_back(make_unique<Sparrow>());
    fliers.push_back(make_unique<Drone>());
    int best = 0;
    for (const auto& f : fliers) best = max(best, f->maxAltitudeMeters());
    cout << best << "\\n";  // 300
}` }
] }, { lang: 'java', code: `
// Java 21: a CLOSED set of variants with sealed + records + pattern matching.
sealed interface Payment permits Card, Upi, Cash { }
record Card(String last4) implements Payment { }
record Upi(String vpa) implements Payment { }
record Cash() implements Payment { }

class Receipt {
    static String describe(Payment p) {
        return switch (p) {                     // compiler checks every variant is handled
            case Card c -> "Card ending " + c.last4();
            case Upi u -> "UPI " + u.vpa();
            case Cash c -> "Cash";
        };
    }
    public static void main(String[] args) {
        System.out.println(describe(new Upi("asha@bank")));
    }
}`,
alt: [
  { lang: 'python', code: `
from dataclasses import dataclass


# A CLOSED set of variants: frozen dataclasses + a Union + pattern matching (Python 3.10+).
@dataclass(frozen=True)
class Card:
    last4: str


@dataclass(frozen=True)
class Upi:
    vpa: str


@dataclass(frozen=True)
class Cash:
    pass


Payment = Card | Upi | Cash


def describe(p: Payment) -> str:
    match p:  # a type checker (mypy, pyright) warns if a variant is missing
        case Card(last4=l4):
            return f"Card ending {l4}"
        case Upi(vpa=v):
            return f"UPI {v}"
        case Cash():
            return "Cash"


print(describe(Upi("asha@bank")))` },
  { lang: 'ts', code: `
// A CLOSED set of variants: a discriminated union, checked by the compiler.
type Payment =
  | { readonly kind: "card"; readonly last4: string }
  | { readonly kind: "upi"; readonly vpa: string }
  | { readonly kind: "cash" };

function describe(p: Payment): string {
  switch (p.kind) { // compile error here if a variant is missing
    case "card": return "Card ending " + p.last4;
    case "upi": return "UPI " + p.vpa;
    case "cash": return "Cash";
  }
}

console.log(describe({ kind: "upi", vpa: "asha@bank" }));` },
  { lang: 'cpp', code: `
// A CLOSED set of variants: std::variant + std::visit (the compiler checks every case is handled).
struct Card { string last4; };
struct Upi { string vpa; };
struct Cash {};
using Payment = variant<Card, Upi, Cash>;

string describe(const Payment& p) {
    return visit(
        [](const auto& v) -> string {
            using T = decay_t<decltype(v)>;
            if constexpr (is_same_v<T, Card>) return "Card ending " + v.last4;
            else if constexpr (is_same_v<T, Upi>) return "UPI " + v.vpa;
            else return "Cash";
        },
        p);
}

int main() {
    cout << describe(Upi{"asha@bank"}) << "\\n";
}` }
] }],
    codeTitle: ['Abstract class, interface, polymorphism', 'Closed set of variants (sealed / union / variant)'],
    viz: [{
      title: 'Build an is-a hierarchy (editable)',
      input: 'Dog --|> Animal; Cat --|> Animal; Penguin --|> Animal; Sparrow --|> Animal; Sparrow ..|> Flyable; Drone ..|> Flyable',
      inputLabel: 'A --|> B means A extends B; A ..|> B means A implements interface B (you can mix in *-- o-- --> too)',
      gen: function (input) { return relFrames(input, 'Is-a hierarchy (arrow from child to parent)'); }
    }, {
      title: 'Polymorphic dispatch: one loop, the right method every time',
      input: 'circle 1; square 3; rect 2 5; circle 2',
      inputLabel: 'Shapes: circle r; square s; rect w h (separated by ;)',
      gen: function (input) {
        var items = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!items.length) throw new Error('Write shapes like: circle 1; square 3; rect 2 5');
        if (items.length > 8) throw new Error('Use at most 8 shapes');
        var shapes = items.map(function (it) {
          var t = it.split(/\s+/), k = t[0].toLowerCase(), a = Number(t[1]), b = Number(t[2]);
          if (k === 'circle' && a > 0) return { k: 'Circle', d: 'Circle(' + a + ')', area: Math.PI * a * a, line: 6 };
          if (k === 'square' && a > 0) return { k: 'Square', d: 'Square(' + a + ')', area: a * a, line: 7 };
          if (k === 'rect' && a > 0 && b > 0) return { k: 'Rect', d: 'Rect(' + a + 'x' + b + ')', area: a * b, line: 8 };
          throw new Error('Could not read "' + it + '". Use circle r, square s or rect w h with positive numbers');
        });
        var code = 'double total = 0;\nfor (Shape s : shapes) {\n    total += s.area();   // ONE call site\n}\n// which body runs?\nCircle.area()  { return PI * r * r; }\nSquare.area()  { return side * side; }\nRect.area()    { return w * h; }';
        var altCode = {
          python: { code: 'total = 0.0\nfor s in shapes:\n    total += s.area()   # ONE call site\n# which body runs?\nclass Circle(Shape): area = lambda self: math.pi * self.r * self.r\nclass Square(Shape): area = lambda self: self.side * self.side\nclass Rect(Shape): area = lambda self: self.w * self.h', map: { 6: 5, 7: 6, 8: 7 } },
          js: { lang: 'ts', code: 'let total = 0;\nfor (const s of shapes) {\n    total += s.area();   // ONE call site\n}\n// which body runs?\nclass Circle extends Shape { area() { return Math.PI * this.r * this.r; } }\nclass Square extends Shape { area() { return this.side * this.side; } }\nclass Rect extends Shape { area() { return this.w * this.h; } }' },
          cpp: { code: 'double total = 0;\nfor (Shape* s : shapes) {\n    total += s->area();   // ONE call site\n}\n// which body runs?\nstruct Circle : Shape { double area() const override { return M_PI * r * r; } };\nstruct Square : Shape { double area() const override { return side * side; } };\nstruct Rect : Shape { double area() const override { return w * h; } };' } };
        var nodes = [bx('Shape', 'Shape (abstract)', 50, 8), bx('Circle', 'Circle', 17, 34), bx('Square', 'Square', 50, 34), bx('Rect', 'Rect', 83, 34)];
        var edges = [['Circle', 'Shape', 'is-a'], ['Square', 'Shape', 'is-a'], ['Rect', 'Shape', 'is-a']];
        var frames = [], total = 0, done = [];
        frames.push({ narr: 'The loop only knows the type <b>Shape</b>. It has <b>no if/else</b> on the kind of shape. Let us watch the runtime pick the right <code>area()</code> for each object.', parts: [
          { type: 'graph', label: 'Class hierarchy', directed: true, height: 44, nodes: cp(nodes), edges: edges, hl: { Shape: 'sel' }, tags: { Shape: '«abstract» area()' } },
          { type: 'code', label: 'Caller code (top) and the three overrides (bottom)', lang: 'java', code: code, hl: { 3: 'cur' }, alt: altCode },
          { type: 'array', label: 'List&lt;Shape&gt; shapes', values: shapes.map(function (s) { return s.d; }) }
        ] });
        shapes.forEach(function (s, i) {
          total += s.area; done.push(s.area.toFixed(2));
          var hl = { Shape: 'done' }; hl[s.k] = 'cur';
          var ehl = {}; ehl[s.k + '-Shape'] = 'cur';
          var ch = { 3: 'cur' }; ch[s.line] = 'ok';
          var ah = {}; ah[i] = 'cur';
          frames.push({ narr: 'Element ' + i + ' is really a <b>' + s.k + '</b>. The call <code>s.area()</code> is the same text every time, but the runtime looks at the <b>actual object</b> (dynamic dispatch) and runs <code>' + s.k + '.area()</code> = <b>' + s.area.toFixed(2) + '</b>.', parts: [
            { type: 'graph', label: 'Class hierarchy', directed: true, height: 44, nodes: cp(nodes), edges: edges, hl: hl, ehl: ehl },
            { type: 'code', label: 'Caller code (top) and the three overrides (bottom)', lang: 'java', code: code, hl: ch, alt: altCode },
            { type: 'array', label: 'List&lt;Shape&gt; shapes', values: shapes.map(function (x) { return x.d; }), hl: ah, ptr: (function () { var p = {}; p[i] = 's'; return p; })() },
            { type: 'vars', label: 'Loop state', vals: { 'runtime type': s.k, 'area()': s.area.toFixed(2), total: total.toFixed(2) }, hl: { total: 'ok' } }
          ] });
        });
        frames.push({ narr: 'Total = <b>' + total.toFixed(2) + '</b>. To add a <b>Triangle</b> you write one new class. The loop, and every other caller, stays untouched. That is polymorphism paying off (and the Open/Closed principle you will meet in SOLID).', parts: [
          { type: 'bars', label: 'area per shape', values: shapes.map(function (s) { return Math.round(s.area * 100) / 100; }), texts: shapes.map(function (s) { return s.d; }) },
          { type: 'vars', label: 'Result', vals: { total: total.toFixed(2) }, hl: { total: 'sel' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'The Penguin problem: fix a lying hierarchy with an interface', html: `<p>If <code>Bird</code> has <code>fly()</code> and <code>Penguin extends Bird</code>, then <code>Penguin.fly()</code> must throw or do nothing. Code that loops over birds and calls <code>fly()</code> now crashes. The hierarchy promised something false. Move the capability into an interface: only birds that can fly implement <code>Flyable</code>.</p>`, code: { lang: 'java', code: `
abstract class Bird { abstract String sound(); }
interface Flyable { void fly(); }
class Sparrow extends Bird implements Flyable {
    String sound() { return "chirp"; }
    public void fly() { System.out.println("sparrow flies"); }
}
class Penguin extends Bird {                 // no fly() at all: no lie to tell
    String sound() { return "squawk"; }
}
class Zoo {
    public static void main(String[] args) {
        List<Bird> birds = List.of(new Sparrow(), new Penguin());
        for (Bird b : birds) {
            System.out.println(b.sound());
            if (b instanceof Flyable f) f.fly();  // only real fliers fly
        }
    }
}`,
alt: [
  { lang: 'python', code: `
from abc import ABC, abstractmethod


class Bird(ABC):
    @abstractmethod
    def sound(self) -> str: ...


class Flyable(ABC):
    @abstractmethod
    def fly(self) -> None: ...


class Sparrow(Bird, Flyable):
    def sound(self) -> str:
        return "chirp"

    def fly(self) -> None:
        print("sparrow flies")


class Penguin(Bird):  # no fly() at all: no lie to tell
    def sound(self) -> str:
        return "squawk"


birds: list[Bird] = [Sparrow(), Penguin()]
for b in birds:
    print(b.sound())
    if isinstance(b, Flyable):  # only real fliers fly
        b.fly()` },
  { lang: 'ts', code: `
abstract class Bird { abstract sound(): string; }
interface Flyable { fly(): void; }
const canFly = (b: Bird): b is Bird & Flyable => typeof (b as Partial<Flyable>).fly === "function";

class Sparrow extends Bird implements Flyable {
  sound(): string { return "chirp"; }
  fly(): void { console.log("sparrow flies"); }
}
class Penguin extends Bird { // no fly() at all: no lie to tell
  sound(): string { return "squawk"; }
}

const birds: Bird[] = [new Sparrow(), new Penguin()];
for (const b of birds) {
  console.log(b.sound());
  if (canFly(b)) b.fly(); // only real fliers fly
}` },
  { lang: 'cpp', code: `
class Bird {
public:
    virtual ~Bird() = default;
    virtual string sound() const = 0;
};
class Flyable {
public:
    virtual ~Flyable() = default;
    virtual void fly() const = 0;
};
class Sparrow : public Bird, public Flyable {
public:
    string sound() const override { return "chirp"; }
    void fly() const override { cout << "sparrow flies\\n"; }
};
class Penguin : public Bird {  // no fly() at all: no lie to tell
public:
    string sound() const override { return "squawk"; }
};

int main() {
    vector<unique_ptr<Bird>> birds;
    birds.push_back(make_unique<Sparrow>());
    birds.push_back(make_unique<Penguin>());
    for (const auto& b : birds) {
        cout << b->sound() << "\\n";
        if (auto* f = dynamic_cast<const Flyable*>(b.get())) f->fly();  // only real fliers fly
    }
}` }
] } },
      { title: 'Roles that change: Employee has-a Role, not Manager extends Employee', html: `<p>Asha joins as an Engineer and gets promoted to Manager next year. With inheritance you would need to create a <i>new</i> <code>Manager</code> object and copy her data, losing identity (her id, history, references from other objects). With composition the same Employee object just swaps its <code>Role</code> field.</p>
${H.table(['Design', 'Promotion', 'Identity kept?'], [['Manager extends Employee', 'new object, copy fields', H.c('r', 'no')], ['Employee has Role', '<code>asha.setRole(new ManagerRole())</code>', H.c('g', 'yes')]])}`, code: { lang: 'java', code: `
interface Role { long bonusPercent(); String title(); }
record EngineerRole() implements Role { public long bonusPercent() { return 10; } public String title() { return "Engineer"; } }
record ManagerRole(int reports) implements Role { public long bonusPercent() { return 20; } public String title() { return "Manager"; } }
class Employee {
    private final String id;
    private Role role;
    Employee(String id, Role role) { this.id = id; this.role = role; }
    void promote(Role newRole) { this.role = newRole; }       // same object, new behaviour
    String badge() { return id + " - " + role.title() + " (" + role.bonusPercent() + "% bonus)"; }
    public static void main(String[] args) {
        Employee asha = new Employee("E7", new EngineerRole());
        asha.promote(new ManagerRole(5));
        System.out.println(asha.badge());
    }
}`,
alt: [
  { lang: 'python', code: `
from dataclasses import dataclass
from typing import Protocol


class Role(Protocol):
    def bonus_percent(self) -> int: ...

    def title(self) -> str: ...


@dataclass(frozen=True)
class EngineerRole:
    def bonus_percent(self) -> int:
        return 10

    def title(self) -> str:
        return "Engineer"


@dataclass(frozen=True)
class ManagerRole:
    reports: int

    def bonus_percent(self) -> int:
        return 20

    def title(self) -> str:
        return "Manager"


class Employee:
    def __init__(self, emp_id: str, role: Role) -> None:
        self._id = emp_id
        self._role = role

    def promote(self, new_role: Role) -> None:  # same object, new behaviour
        self._role = new_role

    def badge(self) -> str:
        return f"{self._id} - {self._role.title()} ({self._role.bonus_percent()}% bonus)"


asha = Employee("E7", EngineerRole())
asha.promote(ManagerRole(5))
print(asha.badge())` },
  { lang: 'ts', code: `
interface Role { bonusPercent(): number; title(): string; }
class EngineerRole implements Role {
  bonusPercent(): number { return 10; }
  title(): string { return "Engineer"; }
}
class ManagerRole implements Role {
  constructor(readonly reports: number) {}
  bonusPercent(): number { return 20; }
  title(): string { return "Manager"; }
}
class Employee {
  constructor(private readonly id: string, private role: Role) {}
  promote(newRole: Role): void { this.role = newRole; } // same object, new behaviour
  badge(): string { return \`\${this.id} - \${this.role.title()} (\${this.role.bonusPercent()}% bonus)\`; }
}

const asha = new Employee("E7", new EngineerRole());
asha.promote(new ManagerRole(5));
console.log(asha.badge());` },
  { lang: 'cpp', code: `
class Role {
public:
    virtual ~Role() = default;
    virtual long long bonusPercent() const = 0;
    virtual string title() const = 0;
};
class EngineerRole : public Role {
public:
    long long bonusPercent() const override { return 10; }
    string title() const override { return "Engineer"; }
};
class ManagerRole : public Role {
    int reports_;
public:
    explicit ManagerRole(int reports) : reports_(reports) {}
    long long bonusPercent() const override { return 20; }
    string title() const override { return "Manager"; }
};
class Employee {
    string id_;
    unique_ptr<Role> role_;  // owned; swapped on promotion
public:
    Employee(string id, unique_ptr<Role> role) : id_(std::move(id)), role_(std::move(role)) {}
    void promote(unique_ptr<Role> newRole) { role_ = std::move(newRole); }  // same object, new behaviour
    string badge() const { return id_ + " - " + role_->title() + " (" + to_string(role_->bonusPercent()) + "% bonus)"; }
};

int main() {
    Employee asha("E7", make_unique<EngineerRole>());
    asha.promote(make_unique<ManagerRole>(5));
    cout << asha.badge() << "\\n";
}` }
] } },
      { title: 'Abstract class for shared steps: monthly interest', html: `<p>All accounts share the bookkeeping "compute interest, add it, log it", but each type computes the rate differently. An abstract class holds the shared steps and leaves one <code>abstract</code> method to the children. This is a sneak peek at the <b>Template Method</b> pattern.</p>
${H.table(['Class', 'rate rule', 'balance 10,000 → interest'], [['SavingsAccount', '4% per year', '33 (monthly)'], ['SalaryAccount', '3% per year', '25 (monthly)']])}`, code: { lang: 'java', code: `
abstract class InterestAccount {
    protected long balance;
    InterestAccount(long balance) { this.balance = balance; }
    final long applyMonthlyInterest() {            // shared algorithm, final so children cannot break it
        long interest = balance * annualRatePercent() / 100 / 12;
        balance += interest;
        return interest;
    }
    protected abstract long annualRatePercent();   // the one step children decide
}
class SavingsAccount extends InterestAccount {
    SavingsAccount(long b) { super(b); }
    protected long annualRatePercent() { return 4; }
}
class SalaryAccount extends InterestAccount {
    SalaryAccount(long b) { super(b); }
    protected long annualRatePercent() { return 3; }
}`,
alt: [
  { lang: 'python', code: `
from abc import ABC, abstractmethod


class InterestAccount(ABC):
    def __init__(self, balance: int) -> None:
        self._balance = balance

    def apply_monthly_interest(self) -> int:  # shared algorithm (Python cannot forbid overriding)
        interest = self._balance * self._annual_rate_percent() // 100 // 12
        self._balance += interest
        return interest

    @abstractmethod
    def _annual_rate_percent(self) -> int:  # the one step children decide
        raise NotImplementedError


class SavingsAccount(InterestAccount):
    def _annual_rate_percent(self) -> int:
        return 4


class SalaryAccount(InterestAccount):
    def _annual_rate_percent(self) -> int:
        return 3` },
  { lang: 'ts', code: `
abstract class InterestAccount {
  protected balance: number;
  constructor(balance: number) { this.balance = balance; }
  applyMonthlyInterest(): number { // shared algorithm (TypeScript has no \`final\`: document it)
    const interest = Math.floor(Math.floor((this.balance * this.annualRatePercent()) / 100) / 12);
    this.balance += interest;
    return interest;
  }
  protected abstract annualRatePercent(): number; // the one step children decide
}
class SavingsAccount extends InterestAccount {
  protected annualRatePercent(): number { return 4; }
}
class SalaryAccount extends InterestAccount {
  protected annualRatePercent(): number { return 3; }
}` },
  { lang: 'cpp', code: `
class InterestAccount {
protected:
    long long balance_;
    explicit InterestAccount(long long balance) : balance_(balance) {}
    virtual long long annualRatePercent() const = 0;  // the one step children decide
public:
    virtual ~InterestAccount() = default;
    long long applyMonthlyInterest() {  // shared algorithm: not virtual, so children cannot override it
        long long interest = balance_ * annualRatePercent() / 100 / 12;
        balance_ += interest;
        return interest;
    }
};
class SavingsAccount : public InterestAccount {
public:
    explicit SavingsAccount(long long b) : InterestAccount(b) {}
protected:
    long long annualRatePercent() const override { return 4; }
};
class SalaryAccount : public InterestAccount {
public:
    explicit SalaryAccount(long long b) : InterestAccount(b) {}
protected:
    long long annualRatePercent() const override { return 3; }
};` }
] } }
    ],
    deepDive: `<p><b>How dispatch works.</b> Each class has a method table (vtable). A call <code>s.area()</code> compiles to <code>invokevirtual Shape.area</code>; at runtime the JVM looks up the slot in the <i>actual</i> object's table (C++ virtual calls go through a vtable pointer in the same way; Python and JavaScript look the method up by name at run time). The JIT often inlines it when only one or two receiver types are seen (monomorphic/bimorphic inline caches), so polymorphism is nearly free in hot loops. Interface calls use <code>invokeinterface</code>, similarly optimised.</p>
<p><b>Liskov Substitution Principle (LSP)</b>: a subclass must honour the parent's contract: accept at least what the parent accepts (preconditions no stronger), promise at least what it promises (postconditions no weaker), and keep its invariants. The classic Rectangle/Square case: if <code>Square extends Rectangle</code> and <code>setWidth</code> also changes height, code that sets width 5 and height 4 and expects area 20 gets 16. Mathematically a square is a rectangle; <i>behaviourally</i> a mutable square is not.</p>
<p><b>Fragile base class.</b> Changing a parent can break children you have never seen (e.g. a parent's <code>addAll</code> starts calling <code>add</code>, and a child that counts adds now double-counts, the famous <code>InstrumentedHashSet</code> example from Effective Java). Defences: make classes <code>final</code> unless designed for inheritance, document self-use, prefer composition + delegation.</p>
<p><b>Constructors must not call overridable methods</b>: the child's override runs before the child's fields are initialised and sees nulls/zeros.</p>
<p><b>equals and inheritance don't mix.</b> A <code>ColorPoint extends Point</code> cannot add a field to equals without breaking symmetry or transitivity. Prefer composition or make value classes final (Java <code>final</code> and records, C++ <code>final</code>).</p>
<p><b>Closed hierarchies</b> list every variant up front: Java <code>sealed interface Shape permits Circle, Square</code>, a TypeScript discriminated union, a Python <code>Union</code> of dataclasses, C++ <code>std::variant</code>. With a pattern-matching <code>switch</code> / <code>match</code> / <code>std::visit</code> the compiler or type checker can check exhaustiveness, which is a modern alternative to the Visitor pattern when the set of types is fixed but operations keep growing. Use open interfaces when <i>types</i> grow (plugins), sealed when <i>operations</i> grow.</p>
<p><b>Default methods</b> (Java; Python mixins and C++ base classes with non-pure virtuals play the same role) let interfaces evolve without breaking implementers. If two interfaces supply the same default, the class must override and pick (<code>A.super.m()</code>).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants reach for inheritance eagerly: <code>AbstractBaseManager</code>, deep 4-level hierarchies, and <code>BaseEntity</code> classes with 20 fields. They also produce correct-looking but LSP-violating subclasses that throw <code>UnsupportedOperationException</code>. Spotting this is now a core reviewer skill.</p>
<p><b>Use AI as a partner:</b> <code>For each extends in this code, state the is-a sentence and one scenario where it could be false.</code> or <code>Rewrite this hierarchy using composition and an interface; list what we gain and lose.</code> Also ask for a sealed + pattern-matching version and compare it to the polymorphic one.</p>
<p><b>Where AI goes wrong:</b> mixes up UML arrows (draws the triangle at the child), uses inheritance for code reuse (<code>OrderService extends DatabaseHelper</code>), forgets <code>@Override</code>, and suggests <code>instanceof</code> chains where polymorphism belongs.</p>
<p><b>What you must still own:</b> the is-a sentence test against real business rules (can roles change? are there exceptions?), the choice between open polymorphism and a sealed set, and the judgement to keep hierarchies shallow (1–2 levels) in interview designs.</p>`,
    problems: [{
      title: 'Payment Methods: One Interface, Many Implementations',
      level: 'Medium', tags: ['interface', 'polymorphism', 'abstract class', 'open/closed'], companies: ['PhonePe', 'Razorpay', 'Amazon', 'Stripe'],
      statement: `<p>A checkout supports <b>credit card</b>, <b>debit card</b> and <b>UPI</b>. Cards share validation (16-digit number, expiry) and charge a fee: credit 2%, debit 0.5%. UPI validates a VPA like <code>name@bank</code> and is free. The checkout must compute the final amount and call <code>pay</code> without knowing which method was chosen. Tomorrow the business will add <b>wallets</b>. Design the hierarchy (interface vs abstract class), draw it, and write the code.</p>`,
      constraints: `<ul><li>Adding a new payment method must not modify Checkout.</li><li>Amounts in paise (long). Fee rounded down.</li><li>Invalid details → reject before charging.</li></ul>`,
      example: `<p>Amount ₹1,000 (100000 paise):</p>
${H.table(['method', 'fee', 'charged'], [['CreditCard', '2% = 2000', H.c('y', '102000')], ['DebitCard', '0.5% = 500', H.c('y', '100500')], ['Upi asha@okbank', '0', H.c('g', '100000')], ['Upi "asha"', '-', H.c('r', 'rejected: bad VPA')]])}
<p>The checkout code is identical in all four cases; only the object passed in differs.</p>`,
      brute: {
        why: `<p>The naive design has a single <code>Payment</code> class with a <code>String type</code> and a switch in every method (<code>fee</code>, <code>validate</code>, <code>pay</code>). Adding wallets means editing every switch (and forgetting one compiles fine and silently charges zero fee). Card-only fields (expiry) sit next to UPI-only fields (vpa) with nulls everywhere. It violates Open/Closed and makes each method a growing if-ladder.</p>`,
        code: { lang: 'java', code: `
class Payment {
    String type;            // "CREDIT", "DEBIT", "UPI" ... typo = silent bug
    String cardNumber, expiry, vpa;   // half of these are always null
    long fee(long amount) {
        switch (type) {
            case "CREDIT": return amount * 2 / 100;
            case "DEBIT": return amount / 200;
            default: return 0;           // new WALLET type silently free
        }
    }
    boolean validate() {
        if (type.equals("UPI")) return vpa != null && vpa.contains("@");
        return cardNumber != null && cardNumber.length() == 16;
    }
}`, alt: [
                { lang: 'python', code: `
class Payment:
    def __init__(self):
        self.type = None          # "CREDIT", "DEBIT", "UPI" ... typo = silent bug
        self.card_number = self.expiry = self.vpa = None   # half of these are always None

    def fee(self, amount):
        if self.type == "CREDIT": return amount * 2 // 100
        if self.type == "DEBIT": return amount // 200
        return 0                  # new WALLET type silently free

    def validate(self):
        if self.type == "UPI": return self.vpa is not None and "@" in self.vpa
        return self.card_number is not None and len(self.card_number) == 16` },
                { lang: 'ts', code: `
class Payment {
    type = "";                 // "CREDIT", "DEBIT", "UPI" ... typo = silent bug
    cardNumber: string | null = null;   // half of these are always null
    expiry: string | null = null;
    vpa: string | null = null;
    fee(amount: number): number {
        switch (this.type) {
            case "CREDIT": return Math.floor(amount * 2 / 100);
            case "DEBIT": return Math.floor(amount / 200);
            default: return 0;           // new WALLET type silently free
        }
    }
    validate(): boolean {
        if (this.type === "UPI") return this.vpa !== null && this.vpa.includes("@");
        return this.cardNumber !== null && this.cardNumber.length === 16;
    }
}` },
                { lang: 'cpp', code: `
class Payment {
public:
    string type;                       // "CREDIT", "DEBIT", "UPI" ... typo = silent bug
    string cardNumber, expiry, vpa;    // half of these are always empty
    long long fee(long long amount) {
        if (type == "CREDIT") return amount * 2 / 100;
        if (type == "DEBIT") return amount / 200;
        return 0;                      // new WALLET type silently free
    }
    bool validate() {
        if (type == "UPI") return vpa.find('@') != string::npos;
        return cardNumber.size() == 16;
    }
};` }
              ] }
      },
      mcq: { q: 'Credit and debit cards share validation code and fields; UPI shares nothing but the "can pay" ability. What structure fits best?', options: ['One Payment class with a type field', 'interface PaymentMethod; abstract class CardPayment implements it; CreditCard/DebitCard extend CardPayment; Upi implements PaymentMethod directly', 'Upi extends CreditCard', 'Three unrelated classes and instanceof checks in Checkout'], answer: 1, explain: 'Interface for the capability every method shares (validate, fee, pay); abstract class only where real shared code and state exist (cards). Checkout depends on the interface only.' },
      hints: [
        `<p>Hint 1: what does Checkout need to know? Only "validate, compute fee, pay". That list is your <b>interface</b>.</p>`,
        `<p>Hint 2: cards share fields (number, expiry) and validation: an <b>abstract class</b> <code>CardPayment</code> implementing the interface, leaving <code>feePercentTimes10()</code> abstract. UPI implements the interface directly.</p>`,
        `<p>Hint 3: <code>Checkout.process(amount, PaymentMethod m)</code>: if <code>!m.isValid()</code> reject; total = amount + m.fee(amount); m.pay(total). Wallet later = one new class, zero edits.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "Charged 102000 to credit card ****1111\nDebited 100500 from card ****0004\nUPI collect request of 100000 sent to asha@okbank\nRejected: invalid payment details\n" }] },
      solution: {
        approach: `<p><b>Diagram:</b> «interface» <code>PaymentMethod</code> (isValid, fee, pay) ◁·· <code>CardPayment</code> (abstract: number, expiry, shared isValid) ◁— <code>CreditCard</code>, <code>DebitCard</code>; <code>Upi</code> ··▷ PaymentMethod. <code>Checkout</code> ··&gt; PaymentMethod (dependency: received as a parameter). Polymorphism removes every switch; a new <code>Wallet</code> implements the interface and Checkout never changes (Open/Closed). The abstract class exists only because cards truly share state and code; we did not force UPI into it.</p>`,
        code: `
import java.time.*;

interface PaymentMethod {
    boolean isValid();
    long fee(long amountPaise);
    String pay(long totalPaise);
}

abstract class CardPayment implements PaymentMethod {
    private final String number;
    private final YearMonth expiry;
    protected CardPayment(String number, YearMonth expiry) { this.number = number; this.expiry = expiry; }
    public boolean isValid() {                                   // shared by all cards
        return number != null && number.matches("[0-9]{16}") && !expiry.isBefore(YearMonth.of(2026, 1));
    }
    public long fee(long amountPaise) { return amountPaise * feePerMille() / 1000; }
    protected abstract long feePerMille();                       // the only thing that differs
    protected String last4() { return number.substring(12); }
}

class CreditCard extends CardPayment {
    CreditCard(String n, YearMonth e) { super(n, e); }
    protected long feePerMille() { return 20; }                  // 2%
    public String pay(long total) { return "Charged " + total + " to credit card ****" + last4(); }
}

class DebitCard extends CardPayment {
    DebitCard(String n, YearMonth e) { super(n, e); }
    protected long feePerMille() { return 5; }                   // 0.5%
    public String pay(long total) { return "Debited " + total + " from card ****" + last4(); }
}

class Upi implements PaymentMethod {
    private final String vpa;
    Upi(String vpa) { this.vpa = vpa; }
    public boolean isValid() { return vpa != null && vpa.matches("[a-zA-Z0-9.]+@[a-zA-Z]+"); }
    public long fee(long amountPaise) { return 0; }
    public String pay(long total) { return "UPI collect request of " + total + " sent to " + vpa; }
}

class Checkout {
    String process(long amountPaise, PaymentMethod method) {    // knows only PaymentMethod
        if (!method.isValid()) return "Rejected: invalid payment details";
        long total = amountPaise + method.fee(amountPaise);
        return method.pay(total);
    }
    public static void main(String[] args) {
        Checkout c = new Checkout();
        YearMonth exp = YearMonth.of(2028, 5);
        System.out.println(c.process(100000, new CreditCard("4111111111111111", exp)));
        System.out.println(c.process(100000, new DebitCard("5500000000000004", exp)));
        System.out.println(c.process(100000, new Upi("asha@okbank")));
        System.out.println(c.process(100000, new Upi("asha")));
    }
}`,
        alt: [
          { lang: 'python', code: `
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True, order=True)
class YearMonth:
    year: int
    month: int


class PaymentMethod(ABC):
    @abstractmethod
    def is_valid(self) -> bool: ...

    @abstractmethod
    def fee(self, amount_paise: int) -> int: ...

    @abstractmethod
    def pay(self, total_paise: int) -> str: ...


class CardPayment(PaymentMethod, ABC):
    def __init__(self, number: str, expiry: YearMonth) -> None:
        self._number = number
        self._expiry = expiry

    def is_valid(self) -> bool:  # shared by all cards
        return (
            self._number is not None
            and re.fullmatch(r"[0-9]{16}", self._number) is not None
            and not self._expiry < YearMonth(2026, 1)
        )

    def fee(self, amount_paise: int) -> int:
        return amount_paise * self._fee_per_mille() // 1000

    @abstractmethod
    def _fee_per_mille(self) -> int:  # the only thing that differs
        raise NotImplementedError

    def _last4(self) -> str:
        return self._number[12:]


class CreditCard(CardPayment):
    def _fee_per_mille(self) -> int:
        return 20  # 2%

    def pay(self, total_paise: int) -> str:
        return f"Charged {total_paise} to credit card ****{self._last4()}"


class DebitCard(CardPayment):
    def _fee_per_mille(self) -> int:
        return 5  # 0.5%

    def pay(self, total_paise: int) -> str:
        return f"Debited {total_paise} from card ****{self._last4()}"


class Upi(PaymentMethod):
    def __init__(self, vpa: str) -> None:
        self._vpa = vpa

    def is_valid(self) -> bool:
        return self._vpa is not None and re.fullmatch(r"[a-zA-Z0-9.]+@[a-zA-Z]+", self._vpa) is not None

    def fee(self, amount_paise: int) -> int:
        return 0

    def pay(self, total_paise: int) -> str:
        return f"UPI collect request of {total_paise} sent to {self._vpa}"


class Checkout:
    def process(self, amount_paise: int, method: PaymentMethod) -> str:  # knows only the interface
        if not method.is_valid():
            return "Rejected: invalid payment details"
        total = amount_paise + method.fee(amount_paise)
        return method.pay(total)


def main() -> None:
    c = Checkout()
    exp = YearMonth(2028, 5)
    print(c.process(100000, CreditCard("4111111111111111", exp)))
    print(c.process(100000, DebitCard("5500000000000004", exp)))
    print(c.process(100000, Upi("asha@okbank")))
    print(c.process(100000, Upi("asha")))


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `
interface PaymentMethod {
  isValid(): boolean;
  fee(amountPaise: number): number;
  pay(totalPaise: number): string;
}

class YearMonth {
  constructor(readonly year: number, readonly month: number) {}
  isBefore(o: YearMonth): boolean {
    return this.year < o.year || (this.year === o.year && this.month < o.month);
  }
}

abstract class CardPayment implements PaymentMethod {
  protected constructor(private readonly number: string, private readonly expiry: YearMonth) {}
  isValid(): boolean { // shared by all cards
    return /^[0-9]{16}$/.test(this.number) && !this.expiry.isBefore(new YearMonth(2026, 1));
  }
  fee(amountPaise: number): number {
    return Math.floor((amountPaise * this.feePerMille()) / 1000);
  }
  protected abstract feePerMille(): number; // the only thing that differs
  protected last4(): string { return this.number.substring(12); }
  abstract pay(totalPaise: number): string;
}

class CreditCard extends CardPayment {
  constructor(n: string, e: YearMonth) { super(n, e); }
  protected feePerMille(): number { return 20; } // 2%
  pay(total: number): string { return \`Charged \${total} to credit card ****\${this.last4()}\`; }
}

class DebitCard extends CardPayment {
  constructor(n: string, e: YearMonth) { super(n, e); }
  protected feePerMille(): number { return 5; } // 0.5%
  pay(total: number): string { return \`Debited \${total} from card ****\${this.last4()}\`; }
}

class Upi implements PaymentMethod {
  constructor(private readonly vpa: string) {}
  isValid(): boolean { return /^[a-zA-Z0-9.]+@[a-zA-Z]+$/.test(this.vpa); }
  fee(_amountPaise: number): number { return 0; }
  pay(total: number): string { return \`UPI collect request of \${total} sent to \${this.vpa}\`; }
}

class Checkout {
  process(amountPaise: number, method: PaymentMethod): string { // knows only the interface
    if (!method.isValid()) return "Rejected: invalid payment details";
    const total = amountPaise + method.fee(amountPaise);
    return method.pay(total);
  }
}

function main(): void {
  const c = new Checkout();
  const exp = new YearMonth(2028, 5);
  console.log(c.process(100000, new CreditCard("4111111111111111", exp)));
  console.log(c.process(100000, new DebitCard("5500000000000004", exp)));
  console.log(c.process(100000, new Upi("asha@okbank")));
  console.log(c.process(100000, new Upi("asha")));
}
main();` },
          { lang: 'cpp', code: `
struct YearMonth {
    int year, month;
    auto operator<=>(const YearMonth&) const = default;
};

class PaymentMethod {
public:
    virtual ~PaymentMethod() = default;
    virtual bool isValid() const = 0;
    virtual long long fee(long long amountPaise) const = 0;
    virtual string pay(long long totalPaise) const = 0;
};

class CardPayment : public PaymentMethod {
public:
    bool isValid() const override {  // shared by all cards
        return regex_match(number_, regex("[0-9]{16}")) && !(expiry_ < YearMonth{2026, 1});
    }
    long long fee(long long amountPaise) const override { return amountPaise * feePerMille() / 1000; }

protected:
    CardPayment(string number, YearMonth expiry) : number_(std::move(number)), expiry_(expiry) {}
    virtual long long feePerMille() const = 0;  // the only thing that differs
    string last4() const { return number_.substr(12); }

private:
    string number_;
    YearMonth expiry_;
};

class CreditCard : public CardPayment {
public:
    CreditCard(string n, YearMonth e) : CardPayment(std::move(n), e) {}
    string pay(long long total) const override { return "Charged " + to_string(total) + " to credit card ****" + last4(); }
protected:
    long long feePerMille() const override { return 20; }  // 2%
};

class DebitCard : public CardPayment {
public:
    DebitCard(string n, YearMonth e) : CardPayment(std::move(n), e) {}
    string pay(long long total) const override { return "Debited " + to_string(total) + " from card ****" + last4(); }
protected:
    long long feePerMille() const override { return 5; }  // 0.5%
};

class Upi : public PaymentMethod {
public:
    explicit Upi(string vpa) : vpa_(std::move(vpa)) {}
    bool isValid() const override { return regex_match(vpa_, regex("[a-zA-Z0-9.]+@[a-zA-Z]+")); }
    long long fee(long long) const override { return 0; }
    string pay(long long total) const override { return "UPI collect request of " + to_string(total) + " sent to " + vpa_; }
private:
    string vpa_;
};

class Checkout {
public:
    string process(long long amountPaise, const PaymentMethod& method) const {  // knows only the interface
        if (!method.isValid()) return "Rejected: invalid payment details";
        long long total = amountPaise + method.fee(amountPaise);
        return method.pay(total);
    }
};

int main() {
    Checkout c;
    YearMonth exp{2028, 5};
    cout << c.process(100000, CreditCard("4111111111111111", exp)) << "\\n";
    cout << c.process(100000, DebitCard("5500000000000004", exp)) << "\\n";
    cout << c.process(100000, Upi("asha@okbank")) << "\\n";
    cout << c.process(100000, Upi("asha")) << "\\n";
}` }
        ],
        complexity: `<p>Each payment is O(1). Adding a method = 1 new class, 0 edits (vs N edited switches in the god class). Dispatch cost is a virtual call, negligible.</p>`,
        followUps: ['Add Wallet with a balance: which relationships appear (Wallet → Customer)?', 'How would you pick the method from a user\'s string input? (a factory: next modules)', 'Convert this to a sealed interface. What do you gain and what do you lose?']
      }
    }]
  });

  /* =========================== TOPIC 5 =========================== */
  topics.push({
    title: 'UML Class Diagrams: Notation, Reading & Drawing One Step by Step',
    analogy: `<p>A UML class diagram is an <b>architect's floor plan</b>. The plan does not show every brick or paint colour; it shows rooms, doors and which room connects to which, using a small <b>legend</b> of symbols everyone agrees on. A builder in Pune and one in Berlin read the same plan the same way. UML gives programmers that shared legend, so you can sketch a design on a whiteboard in 10 minutes and everyone understands it.</p>`,
    explain: `<p>A <b>class diagram</b> shows the <i>static structure</i>: which classes exist, what they hold, what they can do, and how they relate. In interviews you draw it on a whiteboard or in text; keep it readable, not exhaustive.</p>
<h4>1. The class box (three compartments)</h4>
${H.table(['Compartment', 'Syntax', 'Example'], [
  ['Name', 'bold; <i>italic</i> if abstract; «stereotype» above', '<b>BankAccount</b>, «interface» <b>PaymentMethod</b>, «enum» <b>Status</b>'],
  ['Attributes', 'visibility name : Type [= default]', '<code>- balance : long = 0</code>'],
  ['Operations', 'visibility name(param : Type) : ReturnType', '<code>+ withdraw(amount : long) : boolean</code>']
])}
<h4>2. Visibility symbols</h4>
${H.table(['Symbol', 'Java syntax', 'Meaning'], [['<code>+</code>', 'public', 'anyone'], ['<code>-</code>', 'private', 'only this class'], ['<code>#</code>', 'protected', 'subclasses (and package)'], ['<code>~</code>', 'package-private (no keyword)', 'same package'], ['<u>underlined</u>', 'static', 'belongs to the class, not objects']])}
<p>Python enforces no visibility: a leading underscore means "protected by convention" and a double underscore triggers name mangling. TypeScript has <code>public</code>, <code>private</code> and <code>protected</code>, plus real runtime privacy with <code>#field</code>. C++ has <code>public</code>, <code>protected</code>, <code>private</code> and <code>friend</code>; it has no package level, so <code>~</code> maps to a friend or to the translation unit.</p>
<h4>3. The six arrows (memorise this legend)</h4>
${H.table(['Relationship', 'Line', 'Arrow head / end', 'Read it as'], [
  ['Association', 'solid', 'plain open arrow (or none)', '"knows / is linked to"'],
  ['Aggregation', 'solid', 'hollow diamond ◇ at the whole', '"has (shared parts)"'],
  ['Composition', 'solid', 'filled diamond ◆ at the whole', '"owns (part dies with whole)"'],
  ['Dependency', 'dashed', 'open arrow', '"uses for a moment"'],
  ['Inheritance', 'solid', 'hollow triangle ▷ at the parent', '"is a kind of"'],
  ['Realisation', 'dashed', 'hollow triangle ▷ at the interface', '"implements"']
])}
<p><b>Multiplicity</b> numbers go at the ends of a line: <code>Customer 1 —— 0..* Order</code> reads "one customer places zero or more orders; each order belongs to exactly one customer". Read each end from the <i>other</i> class's point of view.</p>
<h4>4. Drawing order that works in an interview</h4>
<ol><li>Core entities as boxes with names only.</li><li>Relationship lines + multiplicities.</li><li>Key attributes (ids, status, money) and key operations (the use-case verbs).</li><li>Interfaces/abstract classes where variation exists.</li><li>Enums for fixed sets.</li></ol>
<p>Stop when the main use cases can be traced through the diagram. In 45 minutes, 6–10 classes is the sweet spot.</p>`,
    clues: [
      '"Draw the class diagram" / "show me the classes and how they relate" → boxes, then lines with multiplicities, then key members.',
      '"What does the filled diamond mean?" → composition; hollow → aggregation; triangle → inheritance/realisation.',
      '"Which class owns X?" → look for the diamond end and the navigability arrow.',
      '"How many Ys can an X have?" → multiplicity on the Y end (0..1, 1, 0..*, 1..*).',
      '"Write the code from this diagram" → each line becomes a field, collection, parameter, extends or implements.',
      '"Document the design in the repo" → text-based UML (PlantUML/Mermaid) that lives next to the code.'
    ],
    code: [{ lang: 'java', code: `
// Java that a class box translates into (and back):
//   «abstract» Account
//   - id : String
//   # balance : long
//   - nextId : int   (underlined = static)
//   + deposit(amount : long) : void
//   + monthlyFee() : long   (italic = abstract)
abstract class Account {
    private static int nextId = 1;            // underlined in UML
    private final String id;                  // -
    protected long balance;                   // #
    Account() { this.id = "AC" + (nextId++); }
    public void deposit(long amount) { balance += amount; }   // +
    public abstract long monthlyFee();        // italic
    String id() { return id; }                // ~ package-private
}
class Current extends Account {               // solid line + hollow triangle to Account
    public long monthlyFee() { return 50_00; }
}`,
alt: [
  { lang: 'python', code: `
# Python that a class box translates into (and back):
#   «abstract» Account
#   - id : str
#   # balance : int
#   - next_id : int   (underlined = class attribute)
#   + deposit(amount : int) : None
#   + monthly_fee() : int   (italic = abstract)
from abc import ABC, abstractmethod


class Account(ABC):
    _next_id = 1  # underlined in UML (shared by the class)

    def __init__(self) -> None:
        self._id = f"AC{Account._next_id}"  # -  (private by convention)
        Account._next_id += 1
        self._balance = 0  # #  (protected by convention: one underscore)

    def deposit(self, amount: int) -> None:  # +
        self._balance += amount

    @abstractmethod
    def monthly_fee(self) -> int:  # italic
        raise NotImplementedError

    @property
    def id(self) -> str:
        return self._id


class Current(Account):  # solid line + hollow triangle to Account
    def monthly_fee(self) -> int:
        return 5000` },
  { lang: 'ts', code: `
// TypeScript that a class box translates into (and back):
//   «abstract» Account
//   - id : string
//   # balance : number
//   - nextId : number   (underlined = static)
//   + deposit(amount : number) : void
//   + monthlyFee() : number   (italic = abstract)
abstract class Account {
  private static nextId = 1; // underlined in UML
  private readonly accountId: string; // -
  protected balance = 0; // #
  constructor() { this.accountId = "AC" + Account.nextId++; }
  public deposit(amount: number): void { this.balance += amount; } // +
  public abstract monthlyFee(): number; // italic
  id(): string { return this.accountId; } // TypeScript has no package-private: ~ becomes public or module-private
}
class Current extends Account { // solid line + hollow triangle to Account
  public monthlyFee(): number { return 5000; }
}` },
  { lang: 'cpp', code: `
// C++ that a class box translates into (and back):
//   «abstract» Account
//   - id : string
//   # balance : long long
//   - nextId : int   (underlined = static)
//   + deposit(amount : long long) : void
//   + monthlyFee() : long long   (italic = abstract)
class Account {
    static inline int nextId_ = 1;  // underlined in UML
    string id_;                     // -
protected:
    long long balance_ = 0;         // #
public:
    Account() : id_("AC" + to_string(nextId_++)) {}
    virtual ~Account() = default;
    void deposit(long long amount) { balance_ += amount; }  // +
    virtual long long monthlyFee() const = 0;               // italic
    const string& id() const { return id_; }
};
class Current : public Account {  // solid line + hollow triangle to Account
public:
    long long monthlyFee() const override { return 5000; }
};` }
] }, { lang: 'text', title: 'Same diagram as PlantUML text (paste into any PlantUML renderer)', code: `@startuml
abstract class Account {
  - id : String
  # balance : long
  - {static} nextId : int
  + deposit(amount : long) : void
  + {abstract} monthlyFee() : long
}
class Current
Account <|-- Current
class Customer
Customer "1" -- "0..*" Account : holds >
@enduml` }],
    codeTitle: ['Class box to code', 'Text-based UML (PlantUML)'],
    viz: [{
      title: 'Draw an online shop class diagram, one decision at a time',
      gen: function () {
        return uml('Online shop: class diagram', 72, [
          { narr: 'Start with the <b>core entities</b> from the requirement "customers add products to a cart and place orders": just names, no details yet.', nodes: [bx('Customer', 'Customer', 15, 8), bx('Cart', 'Cart', 50, 8), bx('Product', 'Product', 85, 27), bx('Order', 'Order', 15, 46)],
            rows: [['Customer', '', ''], ['Cart', '', ''], ['Product', '', ''], ['Order', '', '']] },
          { narr: 'Each customer has exactly <b>one cart</b> that exists only for them: <b>composition</b>, multiplicity 1. Arrow from the whole (Customer) to the part (Cart).', edges: [['Customer', 'Cart', '◆ 1']], hl: { Customer: 'cur', Cart: 'ok' },
            rows: [['Customer', '- id: String, - name: String', ''], ['Cart', '', '']] },
          { narr: 'A cart holds <b>CartItems</b> (product + quantity). Items exist only inside the cart: composition, <b>0..*</b>. A CartItem merely <b>points to</b> a Product: association, 1. Deleting the cart must never delete the product!', nodes: [bx('CartItem', 'CartItem', 50, 27)], edges: [['Cart', 'CartItem', '◆ 0..*'], ['CartItem', 'Product', '→ 1']],
            rows: [['Cart', '', '+ add(p: Product, qty: int), + remove(sku: String), + total(): long'], ['CartItem', '- quantity: int', '+ subtotal(): long'], ['Product', '- sku: String, - name: String, - pricePaise: long', '']] },
          { narr: 'A customer <b>places</b> many orders over time. Orders outlive any single session and the link is long-lived: <b>association</b> 1 → 0..*. (Customer does not own them in the composition sense: we keep orders for accounting even if the account closes.)', edges: [['Customer', 'Order', 'places 0..*']], hl: { Order: 'cur' },
            rows: [['Customer', '- id: String, - name: String', '+ checkout(pm: PaymentMethod): Order']] },
          { narr: 'An order is made of <b>OrderLines</b>: composition, <b>1..*</b> (an empty order is invalid). Each line references a Product but <b>copies the price</b> at purchase time.', nodes: [bx('OrderLine', 'OrderLine', 50, 46)], edges: [['Order', 'OrderLine', '◆ 1..*'], ['OrderLine', 'Product', '→ 1']],
            rows: [['Order', '- id: String, - placedAt: Instant', '+ total(): long'], ['OrderLine', '- quantity: int, - unitPricePaise: long', '+ subtotal(): long']] },
          { narr: 'Fixed set of order states → an <b>enum</b>, shown with the «enum» stereotype. Order holds exactly one current status.', nodes: [bx('OrderStatus', 'OrderStatus', 15, 65)], edges: [['Order', 'OrderStatus', '1']], tags: { OrderStatus: '«enum» PLACED PAID SHIPPED' },
            rows: [['OrderStatus «enum»', 'PLACED, PAID, SHIPPED, CANCELLED', ''], ['Order', '- id: String, - placedAt: Instant, - status: OrderStatus', '+ total(): long, + pay(pm), + cancel()']] },
          { narr: 'Payment varies (card, UPI, wallet) → an <b>interface</b>. Order only <b>uses</b> it during <code>pay()</code>: <b>dependency</b> (dashed arrow). Implementations hang below it with the realisation triangle.', nodes: [bx('PM', 'PaymentMethod', 85, 46), bx('Upi', 'Upi', 70, 65), bx('Card', 'Card', 94, 65)], edges: [['Order', 'PM', 'uses'], ['Upi', 'PM', 'implements'], ['Card', 'PM', 'implements']], tags: { PM: '«interface»' },
            rows: [['PaymentMethod «interface»', '', '+ pay(amountPaise: long): boolean'], ['Upi', '- vpa: String', '+ pay(amountPaise: long): boolean'], ['Card', '- last4: String', '+ pay(amountPaise: long): boolean']] },
          { narr: 'Sanity check with a use case: <i>checkout</i> = Customer reads Cart → creates Order with one OrderLine per CartItem (price copied) → Order.pay(PaymentMethod) → status PAID → cart cleared. Every step has a home. The diagram is done.', hl: { Customer: 'cur', Cart: 'win', Order: 'ok', PM: 'sel' },
            code: 'class Customer { private final Cart cart = new Cart(); Order checkout(PaymentMethod pm) { /* cart items become order lines */ } }\nclass Cart { private final List<CartItem> items = new ArrayList<>(); }\nclass CartItem { private final Product product; private int quantity; }\nrecord Product(String sku, String name, long pricePaise) { }\nclass Order { private final List<OrderLine> lines; private OrderStatus status; boolean pay(PaymentMethod pm) { /* charge total, set PAID */ } }\nrecord OrderLine(Product product, int quantity, long unitPricePaise) { }\nenum OrderStatus { PLACED, PAID, SHIPPED, CANCELLED }\ninterface PaymentMethod { boolean pay(long amountPaise); }', codeLabel: 'Skeleton read straight off the diagram', alt: {
              python: { code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

class Customer:
    def __init__(self): self._cart = Cart()
    def checkout(self, pm): ...   # cart items become order lines
class Cart:
    def __init__(self): self._items = []
@dataclass
class CartItem:
    product: "Product"
    quantity: int
@dataclass(frozen=True)
class Product:
    sku: str
    name: str
    price_paise: int
class Order:
    def __init__(self): self._lines = []; self._status = OrderStatus.PLACED
    def pay(self, pm): ...        # charge total, set PAID
@dataclass(frozen=True)
class OrderLine:
    product: Product
    quantity: int
    unit_price_paise: int
class OrderStatus(Enum):
    PLACED = 1; PAID = 2; SHIPPED = 3; CANCELLED = 4
class PaymentMethod(ABC):
    @abstractmethod
    def pay(self, amount_paise): ...` },
              js: { lang: 'ts', code: `class Customer { private readonly cart = new Cart(); checkout(pm: PaymentMethod): Order { /* cart items become order lines */ } }
class Cart { private readonly items: CartItem[] = []; }
class CartItem { constructor(private readonly product: Product, private quantity: number) {} }
interface Product { sku: string; name: string; pricePaise: number }
class Order { private readonly lines: OrderLine[] = []; private status = OrderStatus.PLACED; pay(pm: PaymentMethod): boolean { /* charge total, set PAID */ } }
interface OrderLine { product: Product; quantity: number; unitPricePaise: number }
enum OrderStatus { PLACED, PAID, SHIPPED, CANCELLED }
interface PaymentMethod { pay(amountPaise: number): boolean }` },
              cpp: { code: `struct Product { string sku, name; long long pricePaise; };
struct CartItem { Product product; int quantity; };
struct OrderLine { Product product; int quantity; long long unitPricePaise; };
enum class OrderStatus { PLACED, PAID, SHIPPED, CANCELLED };
class PaymentMethod { public: virtual bool pay(long long amountPaise) = 0; virtual ~PaymentMethod() = default; };
class Cart { vector<CartItem> items; };
class Order { vector<OrderLine> lines; OrderStatus status = OrderStatus::PLACED; public: bool pay(PaymentMethod& pm) { /* charge total, set PAID */ return true; } };
class Customer { Cart cart; public: Order checkout(PaymentMethod& pm) { /* cart items become order lines */ return Order(); } };` } } }
        ]);
      }
    }, {
      title: 'Translate Java into a UML class box, line by line',
      gen: function () {
        var code = 'abstract class Vehicle {\n    private static int count = 0;\n    private final String plate;\n    protected int wheels;\n    Vehicle(String plate) { this.plate = plate; count++; }\n    public String getPlate() { return plate; }\n    public abstract long tollPaise();\n    static int count() { return count; }\n}';
        var steps = [
          [1, 'Vehicle', 'Name compartment: the class is <code>abstract</code>, so the name is written in <i>italics</i> (or with «abstract»).', ['«abstract» Vehicle (italic)', '', '']],
          [2, 'count', '<code>private static</code> → <code>-</code> and <b>underlined</b> (static belongs to the class).', ['«abstract» Vehicle (italic)', '- count: int = 0 (underlined)', '']],
          [3, 'plate', '<code>private final String plate</code> → <code>- plate: String</code> ({readOnly} if you want to show final).', ['«abstract» Vehicle (italic)', '- count: int = 0 (underlined), - plate: String {readOnly}', '']],
          [4, 'wheels', '<code>protected</code> → <code>#</code>. Subclasses (Car, Bike) can see it.', ['«abstract» Vehicle (italic)', '- count: int = 0 (underlined), - plate: String {readOnly}, # wheels: int', '']],
          [5, 'ctor', 'Constructors are often omitted in interview diagrams, or written as <code>~ Vehicle(plate: String)</code> (package-private here, no keyword).', ['«abstract» Vehicle (italic)', '- count: int = 0 (underlined), - plate: String {readOnly}, # wheels: int', '~ Vehicle(plate: String)']],
          [6, 'getPlate', '<code>public</code> method → <code>+ getPlate(): String</code>. Return type goes <b>after</b> the colon.', ['«abstract» Vehicle (italic)', '- count: int = 0 (underlined), - plate: String {readOnly}, # wheels: int', '~ Vehicle(plate: String), + getPlate(): String']],
          [7, 'toll', '<code>abstract</code> method → written in <i>italics</i>: <code>+ tollPaise(): long</code>. Every concrete subclass must implement it.', ['«abstract» Vehicle (italic)', '- count: int = 0 (underlined), - plate: String {readOnly}, # wheels: int', '~ Vehicle(plate: String), + getPlate(): String, + tollPaise(): long (italic)']],
          [8, 'countm', 'Package-private static method → <code>~ count(): int</code>, underlined. Done: the box now carries everything a reader needs.', ['«abstract» Vehicle (italic)', '- count: int = 0 (underlined), - plate: String {readOnly}, # wheels: int', '~ Vehicle(plate: String), + getPlate(): String, + tollPaise(): long (italic), ~ count(): int (underlined)']]
        ];
        var frames = [{ narr: 'Here is a Java class. We will turn each line into UML notation. Watch the three compartments fill: <b>name</b>, <b>attributes</b>, <b>operations</b>.', parts: [{ type: 'code', label: 'Java source', lang: 'java', code: code, hl: {} }, { type: 'table', label: 'UML class box', columns: ['Name', 'Attributes', 'Operations'], rows: [['', '', '']] }] }];
        steps.forEach(function (s) {
          var h = {}; h[s[0]] = 'cur';
          frames.push({ narr: s[2], parts: [{ type: 'code', label: 'Java source', lang: 'java', code: code, hl: h }, { type: 'table', label: 'UML class box', columns: ['Name', 'Attributes', 'Operations'], rows: [s[3]], hl: { 0: 'ok' } }] });
        });
        frames.push({ narr: 'Add a subclass <code>Car extends Vehicle</code> and the diagram gets its first <b>is-a</b> arrow (hollow triangle at Vehicle).', parts: [
          { type: 'graph', label: 'Generalisation', directed: true, height: 40, nodes: [bx('Vehicle', 'Vehicle (abstract)', 50, 8), bx('Car', 'Car', 25, 30), bx('Bike', 'Bike', 75, 30)], edges: [['Car', 'Vehicle', 'is-a'], ['Bike', 'Vehicle', 'is-a']], hl: { Vehicle: 'sel', Car: 'ok', Bike: 'ok' } },
          { type: 'table', label: 'Subclass boxes list only what they add or override', columns: ['Name', 'Attributes', 'Operations'], rows: [['Car', '- seats: int', '+ tollPaise(): long'], ['Bike', '', '+ tollPaise(): long']] }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Reading a diagram aloud', html: `<p>Diagram fragment: <code>Library 1 ◆—— 0..* BookCopy</code>, <code>BookCopy 0..* ——&gt; 1 Book</code>, <code>Member 1 —— 0..3 Loan</code>.</p><p>Say it in English: "A library owns zero or more copies, and a copy belongs to exactly one library and is destroyed with it. Each copy is of exactly one book; a book can have many copies, and a copy knows its book but the book does not keep a list of copies (arrow direction). A member has at most three loans; each loan belongs to one member." If you can read a diagram like this, you can also <b>check</b> one: does "at most three" match the requirement?</p>` },
      { title: 'Diagram to code: every line has a code shape', html: `${H.table(['UML', 'Code (Java syntax)'], [['<code>Order 1 ◆— 1..* OrderLine</code>', '<code>private final List&lt;OrderLine&gt; lines</code> created inside Order, constructor rejects empty'], ['<code>Order → 1 Customer</code>', '<code>private final Customer customer;</code> (no list of orders in Customer)'], ['<code>Order ..&gt; PaymentMethod</code>', '<code>boolean pay(PaymentMethod pm)</code> (parameter only)'], ['<code>Upi ..▷ PaymentMethod</code>', '<code>class Upi implements PaymentMethod</code>'], ['<code>«enum» OrderStatus</code>', '<code>enum OrderStatus { PLACED, PAID }</code>']])}`, code: { lang: 'java', code: `
enum OrderStatus { PLACED, PAID }
interface PaymentMethod { boolean pay(long amountPaise); }
record Customer(String id) { }
record OrderLine(String sku, int qty, long unitPaise) { }
class Order {
    private final Customer customer;                    // association, navigable one way
    private final List<OrderLine> lines;                // composition 1..*
    private OrderStatus status = OrderStatus.PLACED;
    Order(Customer customer, List<OrderLine> lines) {
        if (lines.isEmpty()) throw new IllegalArgumentException("1..* means at least one line");
        this.customer = customer;
        this.lines = new ArrayList<>(lines);            // defensive copy: nobody else holds our parts
    }
    boolean pay(PaymentMethod pm) {                     // dependency: used, not stored
        long total = lines.stream().mapToLong(l -> l.qty() * l.unitPaise()).sum();
        if (pm.pay(total)) { status = OrderStatus.PAID; return true; }
        return false;
    }
}`,
alt: [
  { lang: 'python', code: `
from dataclasses import dataclass
from enum import Enum
from typing import Protocol


class OrderStatus(Enum):
    PLACED = 1
    PAID = 2


class PaymentMethod(Protocol):
    def pay(self, amount_paise: int) -> bool: ...


@dataclass(frozen=True)
class Customer:
    id: str


@dataclass(frozen=True)
class OrderLine:
    sku: str
    qty: int
    unit_paise: int


class Order:
    def __init__(self, customer: Customer, lines: list[OrderLine]) -> None:
        if not lines:
            raise ValueError("1..* means at least one line")
        self._customer = customer  # association, navigable one way
        self._lines = list(lines)  # composition 1..*; defensive copy: nobody else holds our parts
        self._status = OrderStatus.PLACED

    def pay(self, pm: PaymentMethod) -> bool:  # dependency: used, not stored
        total = sum(line.qty * line.unit_paise for line in self._lines)
        if pm.pay(total):
            self._status = OrderStatus.PAID
            return True
        return False` },
  { lang: 'ts', code: `
type OrderStatus = "PLACED" | "PAID";
interface PaymentMethod { pay(amountPaise: number): boolean; }
interface Customer { readonly id: string; }
interface OrderLine { readonly sku: string; readonly qty: number; readonly unitPaise: number; }

class Order {
  private readonly lines: OrderLine[]; // composition 1..*
  private status: OrderStatus = "PLACED";
  constructor(private readonly customer: Customer, lines: OrderLine[]) { // association, navigable one way
    if (lines.length === 0) throw new Error("1..* means at least one line");
    this.lines = [...lines]; // defensive copy: nobody else holds our parts
  }
  pay(pm: PaymentMethod): boolean { // dependency: used, not stored
    const total = this.lines.reduce((s, l) => s + l.qty * l.unitPaise, 0);
    if (pm.pay(total)) {
      this.status = "PAID";
      return true;
    }
    return false;
  }
}` },
  { lang: 'cpp', code: `
enum class OrderStatus { Placed, Paid };

class PaymentMethod {
public:
    virtual ~PaymentMethod() = default;
    virtual bool pay(long long amountPaise) = 0;
};

struct Customer { string id; };
struct OrderLine { string sku; int qty; long long unitPaise; };

class Order {
    const Customer* customer_;        // association, navigable one way (non-owning)
    vector<OrderLine> lines_;         // composition 1..*
    OrderStatus status_ = OrderStatus::Placed;
public:
    Order(const Customer& customer, vector<OrderLine> lines) : customer_(&customer), lines_(std::move(lines)) {
        if (lines_.empty()) throw invalid_argument("1..* means at least one line");
    }
    bool pay(PaymentMethod& pm) {     // dependency: used, not stored
        long long total = 0;
        for (const auto& l : lines_) total += l.qty * l.unitPaise;
        if (pm.pay(total)) {
            status_ = OrderStatus::Paid;
            return true;
        }
        return false;
    }
};` }
] } },
      { title: 'Five notation mistakes interviewers notice', html: `${H.table(['Mistake', 'Fix'], [['Diamond drawn at the <b>part</b> end', 'The diamond always sits at the <b>whole</b> (Car ◆— Engine)'], ['Inheritance triangle pointing at the child', 'Triangle points at the <b>parent</b>/interface'], ['Same link drawn twice: a line to Engine <i>and</i> an attribute <code>engine: Engine</code>', 'Show it once, as a line (attributes are for simple values)'], ['No multiplicities', 'Always write them: they encode business rules (max 3 loans)'], ['30 boxes with every getter', 'Key classes, key fields, use-case methods only']])}` }
    ],
    deepDive: `<p><b>Three levels of class diagram.</b> A <i>conceptual/domain model</i> shows real-world concepts and associations, no types or methods (good for the first 5 minutes with an interviewer). A <i>design model</i> adds types, visibility, interfaces and navigability. An <i>implementation model</i> mirrors the code 1:1 and is usually generated by tools. Know which level you are drawing and say so.</p>
<p><b>Extra notation worth knowing:</b> derived attributes start with a slash (<code>/total : long</code>, computed not stored); constraints in braces (<code>{ordered}</code>, <code>{unique}</code>, <code>{readOnly}</code>); role names at line ends (<code>Employee —manager— Employee</code> for a self-association); qualifiers (a small box with <code>barcode</code> on the Library end = a map lookup); association classes (dashed line from the association to a class like <code>Enrollment</code>); notes (dog-eared box) for rules that do not fit the notation.</p>
<p><b>Navigability is a coupling decision.</b> An arrowhead means "this side can reach that side". Each two-way link adds a dependency in both directions and a consistency obligation. A mature diagram has mostly one-way arrows pointing from use-case coordinators down to entities and from entities to values.</p>
<p><b>Diagrams rot; text survives.</b> In production, hand-drawn diagrams go stale within months. Teams keep PlantUML or Mermaid text in the repo (reviewed in pull requests) or generate diagrams from code (IntelliJ, ArchUnit-based tooling). For system-level views, many teams use the C4 model and keep UML class diagrams only for tricky domain cores.</p>
<p><b>Interview timing.</b> In a 45–60 minute LLD round, spend roughly 5 min requirements, 10 min diagram, 25 min code, 5 min extensions. If the diagram takes 20 minutes you will not finish the code. Draw names and lines first; add members only for the classes you are about to code.</p>
<p><b>Other UML diagrams you may be asked about:</b> object diagram (a snapshot of instances with values), state machine diagram (status transitions of one class; perfect for orders, elevators, vending machines), activity diagram (a flowchart of a process), component and deployment diagrams (closer to HLD). Class + sequence + state cover 95% of LLD interviews.</p>`,
    aiEra: `<p><b>What AI changes:</b> diagrams are now cheap. You can ask an assistant to turn a package of classes into Mermaid or PlantUML in seconds, and ask it the other way round: diagram text to skeleton code. Many interview platforms and design docs accept text diagrams, so <b>fluency in Mermaid/PlantUML syntax</b> is a practical 2026 skill.</p>
<p><b>Use AI as a partner:</b> <code>Generate a Mermaid classDiagram from this code; mark composition vs association by checking who creates each object.</code> Then review the arrows yourself. Or: <code>Here is my diagram text. List every multiplicity and the business rule it implies; flag any that look wrong.</code></p>
<p><b>Where AI goes wrong:</b> it routinely reverses arrow directions, uses composition for every field, omits multiplicities, and lists every getter and setter, burying the design. Generated diagrams from code also cannot know <i>intent</i> (should orders survive account deletion?), only structure.</p>
<p><b>What you must still own:</b> choosing the level of detail for your audience, encoding the business rules in multiplicities and diamonds, and keeping the diagram small enough to reason about. A crisp 8-box diagram you can explain beats a 40-box generated one.</p>`,
    problems: [{
      title: 'Draw the Class Diagram for an Online Shopping Cart',
      level: 'Medium', tags: ['class diagram', 'multiplicity', 'composition', 'interface'], companies: ['Amazon', 'Flipkart', 'Walmart', 'Shopify'],
      statement: `<p>Customers browse <b>products</b> (sku, name, price, stock), add them to a <b>cart</b> with quantities, apply at most one <b>coupon</b> (flat or percentage), and <b>checkout</b> to create an <b>order</b> paid by a payment method. The order must keep the price paid even if the product price changes later. Draw the class diagram (describe boxes, members, arrows and multiplicities) and write a compilable skeleton with working <code>Cart.add</code>, <code>Cart.total</code> and <code>Customer.checkout</code>.</p>`,
      constraints: `<ul><li>Quantity ≥ 1; cannot add more than stock.</li><li>Coupon types: FLAT (paise off) or PERCENT (0–100). Total never below 0.</li><li>Order has 1..* lines; cart is emptied after checkout.</li></ul>`,
      example: `<p>Cart: 2 × Pen (₹50) + 1 × Notebook (₹120) = ₹220. Coupon PERCENT 10 → ${H.c('g', '₹198')}. After checkout: Order with 2 lines at the frozen prices, cart empty. If Pen's price changes to ₹60 later, the order total stays ₹198.</p>
${H.table(['Box', 'Key members', 'Links'], [['Customer', 'id, name; checkout(pm)', '◆ 1 Cart; 1 → 0..* Order'], ['Cart', 'add, remove, total', '◆ 0..* CartItem; 0..1 → Coupon'], ['Order', 'lines, total, status', '◆ 1..* OrderLine'], ['«interface» Coupon', 'apply(total)', 'FlatCoupon, PercentCoupon ..▷']])}`,
      brute: {
        why: `<p>The god-class version is one <code>ShopService</code> with <code>Map&lt;String, Integer&gt; cart</code> (sku → qty), <code>Map&lt;String, Long&gt; prices</code> and a <code>String couponType</code>. Checkout re-reads <i>current</i> prices, so old orders change when prices change (an accounting bug). Coupon logic is an if-else on strings. There is no Order object at all, just a list of maps. You cannot draw a class diagram of it because there are no classes to draw, which is exactly the problem.</p>`,
        code: { lang: 'java', code: `
class ShopService {
    Map<String, Integer> cart = new HashMap<>();
    Map<String, Long> prices = new HashMap<>();
    String couponType; long couponValue;
    List<Map<String, Integer>> orders = new ArrayList<>();
    long total() {
        long t = 0;
        for (var e : cart.entrySet()) t += prices.get(e.getKey()) * e.getValue();
        if ("FLAT".equals(couponType)) t -= couponValue;
        else if ("PERCENT".equals(couponType)) t -= t * couponValue / 100;
        return t;                         // may go negative
    }
    void checkout() { orders.add(new HashMap<>(cart)); cart.clear(); }  // prices not frozen
}`, alt: [
                { lang: 'python', code: `
class ShopService:
    def __init__(self):
        self.cart = {}
        self.prices = {}
        self.coupon_type = None
        self.coupon_value = 0
        self.orders = []

    def total(self):
        t = sum(self.prices[sku] * qty for sku, qty in self.cart.items())
        if self.coupon_type == "FLAT": t -= self.coupon_value
        elif self.coupon_type == "PERCENT": t -= t * self.coupon_value // 100
        return t                         # may go negative

    def checkout(self):
        self.orders.append(dict(self.cart)); self.cart.clear()   # prices not frozen` },
                { lang: 'ts', code: `
class ShopService {
    cart = new Map<string, number>();
    prices = new Map<string, number>();
    couponType: string | null = null; couponValue = 0;
    orders: Map<string, number>[] = [];
    total(): number {
        let t = 0;
        for (const [sku, qty] of this.cart) t += this.prices.get(sku)! * qty;
        if (this.couponType === "FLAT") t -= this.couponValue;
        else if (this.couponType === "PERCENT") t -= Math.floor(t * this.couponValue / 100);
        return t;                         // may go negative
    }
    checkout(): void { this.orders.push(new Map(this.cart)); this.cart.clear(); }  // prices not frozen
}` },
                { lang: 'cpp', code: `
class ShopService {
    unordered_map<string, int> cart;
    unordered_map<string, long long> prices;
    string couponType; long long couponValue = 0;
    vector<unordered_map<string, int>> orders;
public:
    long long total() {
        long long t = 0;
        for (auto& [sku, qty] : cart) t += prices[sku] * qty;
        if (couponType == "FLAT") t -= couponValue;
        else if (couponType == "PERCENT") t -= t * couponValue / 100;
        return t;                         // may go negative
    }
    void checkout() { orders.push_back(cart); cart.clear(); }   // prices not frozen
};` }
              ] }
      },
      mcq: { q: 'Why does OrderLine store unitPricePaise instead of just referencing Product?', options: ['To save memory', 'Because the order must remember the price actually paid even if the product price changes later', 'Because Product is immutable', 'UML requires it'], answer: 1, explain: 'An order is a historical record. Referencing the live product price would rewrite history. Copy the price (a snapshot) into the line; keep the reference to Product for everything else.' },
      hints: [
        `<p>Hint 1: nouns → Customer, Product, Cart, CartItem, Coupon, Order, OrderLine, PaymentMethod. Which are parts that die with a whole? (CartItem in Cart, OrderLine in Order.)</p>`,
        `<p>Hint 2: Coupon varies → interface with FlatCoupon and PercentCoupon value classes (records in Java). Cart holds 0..1 coupon (nullable, <code>None</code> or an optional type). Payment → interface used by Customer.checkout (dependency).</p>`,
        `<p>Hint 3: checkout = build OrderLines from CartItems copying the current price → new Order(lines, discountedTotal) → pm.pay(total) → cart.clear(). Validate stock in Cart.add.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "19800 PAID\nnot enough stock\n" }] },
      solution: {
        approach: `<p><b>Diagram (text form):</b> <code>Customer 1 ◆— 1 Cart</code>; <code>Cart 1 ◆— 0..* CartItem</code>; <code>CartItem 0..* —&gt; 1 Product</code>; <code>Cart 0..* —&gt; 0..1 Coupon</code>; <code>Customer 1 —&gt; 0..* Order</code>; <code>Order 1 ◆— 1..* OrderLine</code>; <code>OrderLine —&gt; 1 Product</code> (plus frozen price); <code>FlatCoupon ..▷ «interface» Coupon</code>, <code>PercentCoupon ..▷ Coupon</code>; <code>Customer ..&gt; «interface» PaymentMethod</code>. Rules sit with their data: stock check in Cart.add (asks Product), discount in Coupon.apply, price freeze in OrderLine, total in Order. Records model immutable values (Product snapshot fields, OrderLine, coupons).</p>`,
        code: `
interface Coupon { long apply(long totalPaise); }
record FlatCoupon(long offPaise) implements Coupon {
    public long apply(long total) { return Math.max(0, total - offPaise); }
}
record PercentCoupon(int percent) implements Coupon {
    PercentCoupon { if (percent < 0 || percent > 100) throw new IllegalArgumentException("0..100"); }
    public long apply(long total) { return total - total * percent / 100; }
}
interface PaymentMethod { boolean pay(long amountPaise); }

class Product {
    private final String sku, name;
    private long pricePaise;
    private int stock;
    Product(String sku, String name, long pricePaise, int stock) { this.sku = sku; this.name = name; this.pricePaise = pricePaise; this.stock = stock; }
    long price() { return pricePaise; }
    void changePrice(long p) { pricePaise = p; }
    boolean hasStock(int qty) { return qty <= stock; }
    String sku() { return sku; }
}

class CartItem {
    private final Product product;
    private int quantity;
    CartItem(Product p, int q) { product = p; quantity = q; }
    long subtotal() { return product.price() * quantity; }
    Product product() { return product; }
    int quantity() { return quantity; }
    void increase(int q) { quantity += q; }
}

class Cart {
    private final Map<String, CartItem> items = new LinkedHashMap<>();   // composition
    private Coupon coupon;                                                // 0..1
    void add(Product p, int qty) {
        if (qty < 1) throw new IllegalArgumentException("qty >= 1");
        int already = items.containsKey(p.sku()) ? items.get(p.sku()).quantity() : 0;
        if (!p.hasStock(already + qty)) throw new IllegalStateException("not enough stock");
        items.computeIfAbsent(p.sku(), k -> new CartItem(p, 0)).increase(qty);
    }
    void applyCoupon(Coupon c) { coupon = c; }
    long total() {
        long raw = items.values().stream().mapToLong(CartItem::subtotal).sum();
        return coupon == null ? raw : coupon.apply(raw);
    }
    List<CartItem> items() { return List.copyOf(items.values()); }
    void clear() { items.clear(); coupon = null; }
}

record OrderLine(Product product, int quantity, long unitPricePaise) { }   // price frozen

class Order {
    enum Status { PLACED, PAID }
    private final List<OrderLine> lines;
    private final long totalPaise;
    private Status status = Status.PLACED;
    Order(List<OrderLine> lines, long totalPaise) {
        if (lines.isEmpty()) throw new IllegalArgumentException("order needs 1..* lines");
        this.lines = List.copyOf(lines); this.totalPaise = totalPaise;
    }
    void markPaid() { status = Status.PAID; }
    long total() { return totalPaise; }
    Status status() { return status; }
}

class Customer {
    private final String id;
    private final Cart cart = new Cart();                 // composition: born with the customer
    private final List<Order> orders = new ArrayList<>(); // association 0..*
    Customer(String id) { this.id = id; }
    Cart cart() { return cart; }
    Order checkout(PaymentMethod pm) {                    // dependency on PaymentMethod
        List<OrderLine> lines = new ArrayList<>();
        for (CartItem ci : cart.items()) lines.add(new OrderLine(ci.product(), ci.quantity(), ci.product().price()));
        Order order = new Order(lines, cart.total());
        if (!pm.pay(order.total())) throw new IllegalStateException("payment failed");
        order.markPaid();
        orders.add(order);
        cart.clear();
        return order;
    }

    public static void main(String[] args) {
        Product pen = new Product("P1", "Pen", 5000, 10), book = new Product("N1", "Notebook", 12000, 5);
        Customer asha = new Customer("C1");
        asha.cart().add(pen, 2); asha.cart().add(book, 1);
        asha.cart().applyCoupon(new PercentCoupon(10));
        Order o = asha.checkout(amount -> true);          // lambda as a fake payment method
        pen.changePrice(6000);
        System.out.println(o.total() + " " + o.status());  // 19800 PAID, unaffected by the price change
        try { asha.cart().add(pen, 11); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }  // only 10 in stock
    }
}`,
        alt: [
          { lang: 'python', code: `
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Protocol


class Coupon(ABC):
    @abstractmethod
    def apply(self, total_paise: int) -> int: ...


@dataclass(frozen=True)
class FlatCoupon(Coupon):
    off_paise: int

    def apply(self, total_paise: int) -> int:
        return max(0, total_paise - self.off_paise)


@dataclass(frozen=True)
class PercentCoupon(Coupon):
    percent: int

    def __post_init__(self) -> None:
        if not 0 <= self.percent <= 100:
            raise ValueError("0..100")

    def apply(self, total_paise: int) -> int:
        return total_paise - total_paise * self.percent // 100


class PaymentMethod(Protocol):
    def pay(self, amount_paise: int) -> bool: ...


class Product:
    def __init__(self, sku: str, name: str, price_paise: int, stock: int) -> None:
        self.sku = sku
        self.name = name
        self._price_paise = price_paise
        self._stock = stock

    def price(self) -> int:
        return self._price_paise

    def change_price(self, p: int) -> None:
        self._price_paise = p

    def has_stock(self, qty: int) -> bool:
        return qty <= self._stock


class CartItem:
    def __init__(self, product: Product, quantity: int) -> None:
        self.product = product
        self.quantity = quantity

    def subtotal(self) -> int:
        return self.product.price() * self.quantity

    def increase(self, q: int) -> None:
        self.quantity += q


class Cart:
    def __init__(self) -> None:
        self._items: dict[str, CartItem] = {}  # composition
        self._coupon: Coupon | None = None  # 0..1

    def add(self, p: Product, qty: int) -> None:
        if qty < 1:
            raise ValueError("qty >= 1")
        already = self._items[p.sku].quantity if p.sku in self._items else 0
        if not p.has_stock(already + qty):
            raise RuntimeError("not enough stock")
        self._items.setdefault(p.sku, CartItem(p, 0)).increase(qty)

    def apply_coupon(self, c: Coupon) -> None:
        self._coupon = c

    def total(self) -> int:
        raw = sum(i.subtotal() for i in self._items.values())
        return raw if self._coupon is None else self._coupon.apply(raw)

    def items(self) -> list[CartItem]:
        return list(self._items.values())

    def clear(self) -> None:
        self._items.clear()
        self._coupon = None


@dataclass(frozen=True)
class OrderLine:  # price frozen
    product: Product
    quantity: int
    unit_price_paise: int


class OrderStatus(Enum):
    PLACED = "PLACED"
    PAID = "PAID"


class Order:
    def __init__(self, lines: list[OrderLine], total_paise: int) -> None:
        if not lines:
            raise ValueError("order needs 1..* lines")
        self._lines = tuple(lines)
        self._total_paise = total_paise
        self._status = OrderStatus.PLACED

    def mark_paid(self) -> None:
        self._status = OrderStatus.PAID

    def total(self) -> int:
        return self._total_paise

    def status(self) -> OrderStatus:
        return self._status


class Customer:
    def __init__(self, customer_id: str) -> None:
        self.id = customer_id
        self._cart = Cart()  # composition: born with the customer
        self._orders: list[Order] = []  # association 0..*

    def cart(self) -> Cart:
        return self._cart

    def checkout(self, pm: PaymentMethod) -> Order:  # dependency on PaymentMethod
        lines = [OrderLine(ci.product, ci.quantity, ci.product.price()) for ci in self._cart.items()]
        order = Order(lines, self._cart.total())
        if not pm.pay(order.total()):
            raise RuntimeError("payment failed")
        order.mark_paid()
        self._orders.append(order)
        self._cart.clear()
        return order


class AlwaysApproves:
    def pay(self, amount_paise: int) -> bool:
        return True


def main() -> None:
    pen = Product("P1", "Pen", 5000, 10)
    book = Product("N1", "Notebook", 12000, 5)
    asha = Customer("C1")
    asha.cart().add(pen, 2)
    asha.cart().add(book, 1)
    asha.cart().apply_coupon(PercentCoupon(10))
    o = asha.checkout(AlwaysApproves())  # a fake payment method
    pen.change_price(6000)
    print(o.total(), o.status().name)  # 19800 PAID, unaffected by the price change
    try:
        asha.cart().add(pen, 11)  # only 10 in stock
    except RuntimeError as e:
        print(e)


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `
interface Coupon { apply(totalPaise: number): number; }

class FlatCoupon implements Coupon {
  constructor(readonly offPaise: number) {}
  apply(total: number): number { return Math.max(0, total - this.offPaise); }
}

class PercentCoupon implements Coupon {
  constructor(readonly percent: number) {
    if (percent < 0 || percent > 100) throw new Error("0..100");
  }
  apply(total: number): number { return total - Math.floor((total * this.percent) / 100); }
}

interface PaymentMethod { pay(amountPaise: number): boolean; }

class Product {
  constructor(
    readonly sku: string,
    readonly name: string,
    private pricePaise: number,
    private stock: number,
  ) {}
  price(): number { return this.pricePaise; }
  changePrice(p: number): void { this.pricePaise = p; }
  hasStock(qty: number): boolean { return qty <= this.stock; }
}

class CartItem {
  private qty: number;
  constructor(private readonly prod: Product, quantity: number) { this.qty = quantity; }
  subtotal(): number { return this.prod.price() * this.qty; }
  product(): Product { return this.prod; }
  quantity(): number { return this.qty; }
  increase(q: number): void { this.qty += q; }
}

class Cart {
  private readonly items_ = new Map<string, CartItem>(); // composition
  private coupon: Coupon | null = null; // 0..1

  add(p: Product, qty: number): void {
    if (qty < 1) throw new Error("qty >= 1");
    const already = this.items_.get(p.sku)?.quantity() ?? 0;
    if (!p.hasStock(already + qty)) throw new Error("not enough stock");
    let item = this.items_.get(p.sku);
    if (!item) {
      item = new CartItem(p, 0);
      this.items_.set(p.sku, item);
    }
    item.increase(qty);
  }
  applyCoupon(c: Coupon): void { this.coupon = c; }
  total(): number {
    let raw = 0;
    for (const i of this.items_.values()) raw += i.subtotal();
    return this.coupon === null ? raw : this.coupon.apply(raw);
  }
  items(): CartItem[] { return [...this.items_.values()]; }
  clear(): void {
    this.items_.clear();
    this.coupon = null;
  }
}

interface OrderLine { // price frozen
  readonly product: Product;
  readonly quantity: number;
  readonly unitPricePaise: number;
}

type OrderStatus = "PLACED" | "PAID";

class Order {
  private readonly lines: readonly OrderLine[];
  private current: OrderStatus = "PLACED";
  constructor(lines: OrderLine[], private readonly totalPaise: number) {
    if (lines.length === 0) throw new Error("order needs 1..* lines");
    this.lines = [...lines];
  }
  markPaid(): void { this.current = "PAID"; }
  total(): number { return this.totalPaise; }
  status(): OrderStatus { return this.current; }
}

class Customer {
  private readonly myCart = new Cart(); // composition: born with the customer
  private readonly orders: Order[] = []; // association 0..*
  constructor(readonly id: string) {}
  cart(): Cart { return this.myCart; }
  checkout(pm: PaymentMethod): Order { // dependency on PaymentMethod
    const lines = this.myCart.items().map(
      (ci): OrderLine => ({ product: ci.product(), quantity: ci.quantity(), unitPricePaise: ci.product().price() }),
    );
    const order = new Order(lines, this.myCart.total());
    if (!pm.pay(order.total())) throw new Error("payment failed");
    order.markPaid();
    this.orders.push(order);
    this.myCart.clear();
    return order;
  }
}

function main(): void {
  const pen = new Product("P1", "Pen", 5000, 10);
  const book = new Product("N1", "Notebook", 12000, 5);
  const asha = new Customer("C1");
  asha.cart().add(pen, 2);
  asha.cart().add(book, 1);
  asha.cart().applyCoupon(new PercentCoupon(10));
  const o = asha.checkout({ pay: () => true }); // object literal as a fake payment method
  pen.changePrice(6000);
  console.log(o.total() + " " + o.status()); // 19800 PAID, unaffected by the price change
  try {
    asha.cart().add(pen, 11); // only 10 in stock
  } catch (e) {
    console.log((e as Error).message);
  }
}
main();` },
          { lang: 'cpp', code: `
class Coupon {
public:
    virtual ~Coupon() = default;
    virtual long long apply(long long totalPaise) const = 0;
};

class FlatCoupon : public Coupon {
public:
    explicit FlatCoupon(long long offPaise) : offPaise_(offPaise) {}
    long long apply(long long total) const override { return max(0LL, total - offPaise_); }
private:
    long long offPaise_;
};

class PercentCoupon : public Coupon {
public:
    explicit PercentCoupon(int percent) : percent_(percent) {
        if (percent < 0 || percent > 100) throw invalid_argument("0..100");
    }
    long long apply(long long total) const override { return total - total * percent_ / 100; }
private:
    int percent_;
};

class PaymentMethod {
public:
    virtual ~PaymentMethod() = default;
    virtual bool pay(long long amountPaise) = 0;
};

class Product {
public:
    Product(string sku, string name, long long pricePaise, int stock)
        : sku_(std::move(sku)), name_(std::move(name)), pricePaise_(pricePaise), stock_(stock) {}
    long long price() const { return pricePaise_; }
    void changePrice(long long p) { pricePaise_ = p; }
    bool hasStock(int qty) const { return qty <= stock_; }
    const string& sku() const { return sku_; }
private:
    string sku_, name_;
    long long pricePaise_;
    int stock_;
};

class CartItem {
public:
    CartItem(shared_ptr<Product> p, int q) : product_(std::move(p)), quantity_(q) {}
    long long subtotal() const { return product_->price() * quantity_; }
    const shared_ptr<Product>& product() const { return product_; }
    int quantity() const { return quantity_; }
    void increase(int q) { quantity_ += q; }
private:
    shared_ptr<Product> product_;  // shared with the catalogue
    int quantity_;
};

class Cart {
public:
    void add(const shared_ptr<Product>& p, int qty) {
        if (qty < 1) throw invalid_argument("qty >= 1");
        auto it = find_if(items_.begin(), items_.end(), [&](const CartItem& i) { return i.product()->sku() == p->sku(); });
        int already = it == items_.end() ? 0 : it->quantity();
        if (!p->hasStock(already + qty)) throw runtime_error("not enough stock");
        if (it == items_.end()) items_.emplace_back(p, qty);
        else it->increase(qty);
    }
    void applyCoupon(unique_ptr<Coupon> c) { coupon_ = std::move(c); }
    long long total() const {
        long long raw = 0;
        for (const auto& i : items_) raw += i.subtotal();
        return coupon_ ? coupon_->apply(raw) : raw;
    }
    const vector<CartItem>& items() const { return items_; }
    void clear() { items_.clear(); coupon_.reset(); }
private:
    vector<CartItem> items_;       // composition
    unique_ptr<Coupon> coupon_;    // 0..1, owned
};

struct OrderLine {  // price frozen
    shared_ptr<Product> product;
    int quantity;
    long long unitPricePaise;
};

enum class OrderStatus { Placed, Paid };

class Order {
public:
    Order(vector<OrderLine> lines, long long totalPaise) : lines_(std::move(lines)), totalPaise_(totalPaise) {
        if (lines_.empty()) throw invalid_argument("order needs 1..* lines");
    }
    void markPaid() { status_ = OrderStatus::Paid; }
    long long total() const { return totalPaise_; }
    OrderStatus status() const { return status_; }
private:
    vector<OrderLine> lines_;
    long long totalPaise_;
    OrderStatus status_ = OrderStatus::Placed;
};

class Customer {
public:
    explicit Customer(string id) : id_(std::move(id)) {}
    Cart& cart() { return cart_; }
    Order& checkout(PaymentMethod& pm) {  // dependency on PaymentMethod
        vector<OrderLine> lines;
        for (const auto& ci : cart_.items()) lines.push_back({ci.product(), ci.quantity(), ci.product()->price()});
        auto order = make_unique<Order>(std::move(lines), cart_.total());
        if (!pm.pay(order->total())) throw runtime_error("payment failed");
        order->markPaid();
        orders_.push_back(std::move(order));
        cart_.clear();
        return *orders_.back();
    }
private:
    string id_;
    Cart cart_;                          // composition: born with the customer
    vector<unique_ptr<Order>> orders_;   // association 0..*
};

class AlwaysApproves : public PaymentMethod {
public:
    bool pay(long long) override { return true; }
};

int main() {
    auto pen = make_shared<Product>("P1", "Pen", 5000, 10);
    auto book = make_shared<Product>("N1", "Notebook", 12000, 5);
    Customer asha("C1");
    asha.cart().add(pen, 2);
    asha.cart().add(book, 1);
    asha.cart().applyCoupon(make_unique<PercentCoupon>(10));
    AlwaysApproves fake;  // a fake payment method
    Order& o = asha.checkout(fake);
    pen->changePrice(6000);
    cout << o.total() << " " << (o.status() == OrderStatus::Paid ? "PAID" : "PLACED") << "\\n";  // 19800 PAID
    try {
        asha.cart().add(pen, 11);  // only 10 in stock
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";
    }
}` }
        ],
        complexity: `<p>add/remove O(1) (an insertion-ordered map by sku); total O(items); checkout O(items). Memory O(items + orders). Extending with a new coupon type = one new class, no edits.</p>`,
        followUps: ['Reserve stock at checkout so two customers cannot buy the last unit (concurrency module).', 'Support multiple coupons with a priority order. Which pattern helps?', 'Add order states SHIPPED/DELIVERED/RETURNED: draw the state machine diagram.']
      }
    }]
  });

  /* =========================== TOPIC 6 =========================== */
  topics.push({
    title: 'UML Sequence Diagrams: Who Calls Whom, In What Order',
    analogy: `<p>Picture ordering food in a restaurant. You tell the <b>waiter</b> your order, the waiter tells the <b>kitchen</b>, the kitchen says "ready", the waiter brings the plate, you pay at the <b>counter</b>. Write each person as a column and each sentence as an arrow from one column to another, top to bottom in time order. That picture is a <b>sequence diagram</b>. A class diagram is the restaurant's <i>staff list</i>; a sequence diagram is <i>one evening's story</i>.</p>`,
    explain: `<p>A class diagram shows structure. A <b>sequence diagram</b> shows <b>behaviour over time</b> for one use case: which object sends which message to which other object, in order. It is the best tool to check that your classes can actually <i>do</i> the job.</p>
${H.table(['Element', 'Drawing', 'In code'], [
  ['<b>Lifeline</b>', 'box at the top + dashed line going down', 'an object taking part (<code>atm : ATM</code>)'],
  ['<b>Synchronous message</b>', 'solid line, filled arrow head', 'a normal method call; caller waits'],
  ['<b>Return</b>', 'dashed line back', 'the return value (often omitted if obvious)'],
  ['<b>Asynchronous message</b>', 'solid line, open arrow head', 'fire-and-forget: publish an event, submit to an executor'],
  ['<b>Activation bar</b>', 'thin rectangle on a lifeline', 'the method is on the call stack'],
  ['<b>Self-call</b>', 'arrow looping back to the same lifeline', '<code>this.validate()</code>'],
  ['<b>Create</b>', 'arrow to a box placed lower down, «create»', '<code>new Order(...)</code>'],
  ['<b>Fragments</b>', 'labelled frame: <code>alt</code>, <code>opt</code>, <code>loop</code>, <code>par</code>', '<code>if/else</code>, <code>if</code>, <code>for</code>, parallel tasks']
])}
<h4>How to draw one in an interview (2–4 minutes)</h4>
<ol>
<li>Pick <b>one</b> important use case: "withdraw cash", "book a seat", "place an order".</li>
<li>Put the <b>actor</b> or entry point (Controller, Customer) on the far left; then objects in the order they get involved, left to right.</li>
<li>Draw the first message (the public API call). Then ask, at each step, "<i>who knows how to do this?</i>" and send the next message there.</li>
<li>Add the most important <b>failure branch</b> as an <code>alt</code> (insufficient funds, seat taken).</li>
<li>Read it back: every arrow must be a method that exists on the receiving class in your class diagram. Missing method? Add it. Arrow to a class with no data for it? Wrong owner.</li>
</ol>
<p><b>Why bother?</b> Sequence diagrams expose bad designs fast: a controller with arrows to 8 objects is a god class; a long chain <code>a → b → c → d</code> just to read a value is a "train wreck" violating the Law of Demeter; two arrows going back and forth repeatedly signal a chatty interface.</p>`,
    clues: [
      '"Walk me through what happens when a user clicks Book / Pay / Withdraw" → draw a sequence diagram for that use case.',
      '"Which class calls which?" / "show the interaction" / "flow of control" → sequence diagram.',
      '"What if payment fails / the seat is already taken?" → an <code>alt</code> fragment with the failure branch.',
      '"Send an email after the order is placed, don\'t block the user" → asynchronous message (open arrow head).',
      '"For each item in the cart…" → a <code>loop</code> fragment.',
      '"How would you trace this in production?" → distributed tracing spans are runtime sequence diagrams.'
    ],
    code: { lang: 'java', code: `
// The code behind an "ATM withdraw" sequence diagram.
// Customer -> ATM: withdraw(500) ; ATM -> Bank: debit(card, 500) ; alt approved: ATM -> ATM: dispense ; else: show error
class Bank {
    private final Map<String, Long> balances = new HashMap<>();
    Bank() { balances.put("CARD-1", 1_000L); }
    boolean debit(String card, long amount) {                 // message 2 arrives here
        long bal = balances.getOrDefault(card, 0L);
        if (amount > bal) return false;                        // return message: false
        balances.put(card, bal - amount);
        return true;                                           // return message: true
    }
}
class Atm {
    private final Bank bank;                                   // association: ATM knows its bank
    private long cash = 10_000;
    Atm(Bank bank) { this.bank = bank; }
    String withdraw(String card, long amount) {                // message 1 (from Customer)
        if (amount > cash) return "ATM out of cash";           // alt branch 1
        boolean ok = bank.debit(card, amount);                 // message 2: synchronous call
        if (!ok) return "Insufficient funds";                  // alt branch 2
        dispense(amount);                                      // message 3: self-call
        return "Please take " + amount;                        // return to Customer
    }
    private void dispense(long amount) { cash -= amount; }
    public static void main(String[] args) {
        Atm atm = new Atm(new Bank());
        System.out.println(atm.withdraw("CARD-1", 500));
        System.out.println(atm.withdraw("CARD-1", 800));       // only 500 left in the account
    }
}`,
alt: [
  { lang: 'python', code: `
# The code behind an "ATM withdraw" sequence diagram.
# Customer -> ATM: withdraw(500) ; ATM -> Bank: debit(card, 500) ; alt approved: ATM -> ATM: dispense ; else: show error
class Bank:
    def __init__(self) -> None:
        self._balances: dict[str, int] = {"CARD-1": 1_000}

    def debit(self, card: str, amount: int) -> bool:  # message 2 arrives here
        bal = self._balances.get(card, 0)
        if amount > bal:
            return False  # return message: False
        self._balances[card] = bal - amount
        return True  # return message: True


class Atm:
    def __init__(self, bank: Bank) -> None:
        self._bank = bank  # association: ATM knows its bank
        self._cash = 10_000

    def withdraw(self, card: str, amount: int) -> str:  # message 1 (from Customer)
        if amount > self._cash:
            return "ATM out of cash"  # alt branch 1
        ok = self._bank.debit(card, amount)  # message 2: synchronous call
        if not ok:
            return "Insufficient funds"  # alt branch 2
        self._dispense(amount)  # message 3: self-call
        return f"Please take {amount}"  # return to Customer

    def _dispense(self, amount: int) -> None:
        self._cash -= amount


atm = Atm(Bank())
print(atm.withdraw("CARD-1", 500))
print(atm.withdraw("CARD-1", 800))  # only 500 left in the account` },
  { lang: 'ts', code: `
// The code behind an "ATM withdraw" sequence diagram.
// Customer -> ATM: withdraw(500) ; ATM -> Bank: debit(card, 500) ; alt approved: ATM -> ATM: dispense ; else: show error
class Bank {
  private readonly balances = new Map<string, number>([["CARD-1", 1_000]]);
  debit(card: string, amount: number): boolean { // message 2 arrives here
    const bal = this.balances.get(card) ?? 0;
    if (amount > bal) return false; // return message: false
    this.balances.set(card, bal - amount);
    return true; // return message: true
  }
}

class Atm {
  private cash = 10_000;
  constructor(private readonly bank: Bank) {} // association: ATM knows its bank
  withdraw(card: string, amount: number): string { // message 1 (from Customer)
    if (amount > this.cash) return "ATM out of cash"; // alt branch 1
    const ok = this.bank.debit(card, amount); // message 2: synchronous call
    if (!ok) return "Insufficient funds"; // alt branch 2
    this.dispense(amount); // message 3: self-call
    return "Please take " + amount; // return to Customer
  }
  private dispense(amount: number): void { this.cash -= amount; }
}

const atm = new Atm(new Bank());
console.log(atm.withdraw("CARD-1", 500));
console.log(atm.withdraw("CARD-1", 800)); // only 500 left in the account` },
  { lang: 'cpp', code: `
// The code behind an "ATM withdraw" sequence diagram.
// Customer -> ATM: withdraw(500) ; ATM -> Bank: debit(card, 500) ; alt approved: ATM -> ATM: dispense ; else: show error
class Bank {
    map<string, long long> balances_{{"CARD-1", 1'000}};
public:
    bool debit(const string& card, long long amount) {  // message 2 arrives here
        long long bal = balances_.count(card) ? balances_[card] : 0;
        if (amount > bal) return false;                  // return message: false
        balances_[card] = bal - amount;
        return true;                                     // return message: true
    }
};

class Atm {
    Bank& bank_;              // association: ATM knows its bank (non-owning reference)
    long long cash_ = 10'000;
    void dispense(long long amount) { cash_ -= amount; }
public:
    explicit Atm(Bank& bank) : bank_(bank) {}
    string withdraw(const string& card, long long amount) {   // message 1 (from Customer)
        if (amount > cash_) return "ATM out of cash";         // alt branch 1
        bool ok = bank_.debit(card, amount);                  // message 2: synchronous call
        if (!ok) return "Insufficient funds";                 // alt branch 2
        dispense(amount);                                     // message 3: self-call
        return "Please take " + to_string(amount);            // return to Customer
    }
};

int main() {
    Bank bank;
    Atm atm(bank);
    cout << atm.withdraw("CARD-1", 500) << "\\n";
    cout << atm.withdraw("CARD-1", 800) << "\\n";  // only 500 left in the account
}` }
] },
    codeTitle: 'Sequence diagram → code (ATM withdraw)',
    viz: [{
      title: 'Sequence diagram builder (editable): ATM cash withdrawal',
      input: 'Customer -> ATM: insertCard; ATM -> Bank: verifyPin(pin); Bank --> ATM: valid; Customer -> ATM: withdraw(500); ATM -> Bank: debit(500); Bank --> ATM: approved; ATM -> ATM: dispense(500); ATM --> Customer: cash',
      inputLabel: 'Messages "From -> To: call" (use --> for a return), separated by ;',
      gen: function (input) {
        var p = parseSeq(input);
        return seq('Sequence diagram (numbers = time order, top to bottom)', p.who, p.msgs, {
          intro: 'Lifelines: <b>' + p.who.map(hesc).join(', ') + '</b>. Each will get dots where it sends or receives a message. Time flows <b>downwards</b>; solid arrows are calls, the ones labelled "return" are replies.',
          outro: 'Read it back as a story. Every arrow into a box must be a <b>method on that class</b>: here that means ' + p.msgs.filter(function (m) { return !m.ret; }).map(function (m) { return hesc(m.t + '.' + m.m.replace(/\(.*$/, '') + '()'); }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ') + '.'
        });
      }
    }, {
      title: 'From sequence diagram to code: placing an order',
      gen: function () {
        var code = 'OrderId placeOrder(Cart cart, PaymentMethod pm) {   // called by Controller\n    if (!inventory.reserve(cart.items()))            // ask Inventory\n        throw new OutOfStockException();             // alt: failure branch\n    Receipt r = payments.charge(pm, cart.total());   // ask Payments\n    Order order = new Order(cart, r);                // create\n    repository.save(order);                          // persist\n    notifier.sendAsync(order.id());                  // async, no waiting\n    return order.id();                               // reply to Controller\n}';;
        return seq('placeOrder: OrderService coordinates, others do one job each', ['Controller', 'OrderService', 'Inventory', 'Payments', 'Notifier'], [
          { f: 'Controller', t: 'OrderService', m: 'placeOrder(cart, pm)', line: 1, narr: 'The HTTP controller calls the <b>OrderService</b> (the use-case coordinator). Synchronous: the controller waits for an answer.' },
          { f: 'OrderService', t: 'Inventory', m: 'reserve(items)', line: 2, narr: 'First, ask the object that knows stock: <b>Inventory.reserve</b>. Inventory, not the service, decides whether items are available (information expert).' },
          { f: 'Inventory', t: 'OrderService', m: 'true', ret: true, line: 2, narr: 'Inventory replies <b>true</b>. (If false, the <code>alt</code> branch throws OutOfStock and the diagram would end here: line 3.)' },
          { f: 'OrderService', t: 'Payments', m: 'charge(pm, total)', line: 4, narr: 'Next, charge the customer. The service does not know <i>how</i> to charge a card or UPI; it delegates to <b>Payments</b>.' },
          { f: 'Payments', t: 'OrderService', m: 'receipt', ret: true, line: 4, narr: 'Payments returns a <b>Receipt</b> value object.' },
          { f: 'OrderService', t: 'OrderService', m: 'new Order + save', line: 5, narr: '<b>Self-call</b> area: the service creates the Order («create» message) and saves it through the repository. Shown as a self-arrow to keep the picture small.' },
          { f: 'OrderService', t: 'Notifier', m: 'sendAsync(orderId)', line: 7, narr: '<b>Asynchronous</b> message (open arrow head in real UML): queue a confirmation email. The service does <b>not</b> wait for it; the user should not wait for SMTP.' },
          { f: 'OrderService', t: 'Controller', m: 'orderId', ret: true, line: 8, narr: 'Return the new order id to the controller, which turns it into an HTTP 201 response.' }
        ], { code: code, alt: {
          python: { code: 'def place_order(self, cart, pm):                  # called by Controller\n    if not self.inventory.reserve(cart.items()):     # ask Inventory\n        raise OutOfStockError()                      # alt: failure branch\n    r = self.payments.charge(pm, cart.total())       # ask Payments\n    order = Order(cart, r)                           # create\n    self.repository.save(order)                      # persist\n    self.notifier.send_async(order.id())             # async, no waiting\n    return order.id()                                # reply to Controller' },
          js: { lang: 'ts', code: 'placeOrder(cart: Cart, pm: PaymentMethod): OrderId {   // called by Controller\n    if (!this.inventory.reserve(cart.items()))        // ask Inventory\n        throw new OutOfStockError();                  // alt: failure branch\n    const r = this.payments.charge(pm, cart.total()); // ask Payments\n    const order = new Order(cart, r);                 // create\n    this.repository.save(order);                      // persist\n    this.notifier.sendAsync(order.id());              // async, no waiting\n    return order.id();                                // reply to Controller\n}' },
          cpp: { code: 'OrderId placeOrder(Cart& cart, PaymentMethod& pm) {   // called by Controller\n    if (!inventory.reserve(cart.items()))             // ask Inventory\n        throw OutOfStockError();                      // alt: failure branch\n    Receipt r = payments.charge(pm, cart.total());    // ask Payments\n    Order order(cart, r);                             // create\n    repository.save(order);                           // persist\n    notifier.sendAsync(order.id());                   // async, no waiting\n    return order.id();                                // reply to Controller\n}' } }, codeLabel: 'OrderService.placeOrder (each message = one highlighted line)', intro: 'Five lifelines for the "place order" use case. Watch each arrow light up the line of code that sends it.', outro: 'Notice the <b>shape</b>: one coordinator in the middle with short arrows to helpers that each own one job. If Controller had arrows straight to Inventory, Payments and Notifier, the controller would be a god class.' });
      }
    }],
    examples: [
      { title: 'alt fragment = if/else (login)', html: `<p>Diagram: <code>User → AuthService: login(email, pw)</code>; <code>AuthService → UserRepo: findByEmail</code>; then an <b>alt</b> frame with two compartments: <code>[password matches] AuthService → SessionStore: create → return token</code> and <code>[else] AuthService → AuditLog: recordFailure → return error</code>. Each compartment of <code>alt</code> becomes one branch of an if/else. <b>opt</b> is an if with no else; <b>loop</b> is a for/while; <b>par</b> is work done in parallel (e.g. <code>CompletableFuture.allOf</code>).</p>`, code: { lang: 'java', code: `
record User(String email, String passwordHash) { }
class AuthService {
    private final Map<String, User> users = new HashMap<>();
    private final List<String> audit = new ArrayList<>();
    AuthService() { users.put("a@x.com", new User("a@x.com", "h:secret")); }
    String login(String email, String pw) {
        User u = users.get(email);                          // AuthService -> UserRepo: findByEmail
        if (u != null && u.passwordHash().equals("h:" + pw)) {   // alt [password matches]
            return "token-" + UUID.randomUUID();            // SessionStore: create
        } else {                                            // alt [else]
            audit.add("failed login " + email);             // AuditLog: recordFailure
            return "error";
        }
    }
}`,
alt: [
  { lang: 'python', code: `
import uuid
from dataclasses import dataclass


@dataclass(frozen=True)
class User:
    email: str
    password_hash: str


class AuthService:
    def __init__(self) -> None:
        self._users = {"a@x.com": User("a@x.com", "h:secret")}
        self._audit: list[str] = []

    def login(self, email: str, pw: str) -> str:
        u = self._users.get(email)  # AuthService -> UserRepo: findByEmail
        if u is not None and u.password_hash == "h:" + pw:  # alt [password matches]
            return f"token-{uuid.uuid4()}"  # SessionStore: create
        self._audit.append(f"failed login {email}")  # alt [else] AuditLog: recordFailure
        return "error"` },
  { lang: 'ts', code: `
interface User { readonly email: string; readonly passwordHash: string; }

class AuthService {
  private readonly users = new Map<string, User>([["a@x.com", { email: "a@x.com", passwordHash: "h:secret" }]]);
  private readonly audit: string[] = [];

  login(email: string, pw: string): string {
    const u = this.users.get(email); // AuthService -> UserRepo: findByEmail
    if (u !== undefined && u.passwordHash === "h:" + pw) { // alt [password matches]
      return "token-" + crypto.randomUUID(); // SessionStore: create
    }
    this.audit.push("failed login " + email); // alt [else] AuditLog: recordFailure
    return "error";
  }
}` },
  { lang: 'cpp', code: `
struct User {
    string email;
    string passwordHash;
};

class AuthService {
    map<string, User> users_{{"a@x.com", User{"a@x.com", "h:secret"}}};
    vector<string> audit_;
    static string newToken() {
        static mt19937_64 rng(random_device{}());
        return "token-" + to_string(rng());
    }

public:
    string login(const string& email, const string& pw) {
        auto it = users_.find(email);  // AuthService -> UserRepo: findByEmail
        if (it != users_.end() && it->second.passwordHash == "h:" + pw) {  // alt [password matches]
            return newToken();  // SessionStore: create
        }
        audit_.push_back("failed login " + email);  // alt [else] AuditLog: recordFailure
        return "error";
    }
};` }
] } },
      { title: 'loop fragment = a for loop (cart total)', html: `<p><code>Cart → CartItem: subtotal()</code> inside a <b>loop [for each item]</b> frame, and inside that, <code>CartItem → Product: price()</code>. The diagram makes it obvious that Cart talks to items, items talk to products, and Cart never reaches into Product directly. That is the <b>Law of Demeter</b> ("talk only to your immediate friends") made visible.</p>
${H.table(['#', 'from', 'to', 'message', 'fragment'], [['1', 'Client', 'Cart', 'total()', ''], ['2', 'Cart', 'CartItem', 'subtotal()', 'loop [each item]'], ['3', 'CartItem', 'Product', 'price()', 'loop [each item]'], ['4', 'Cart', 'Client', 'return sum', '']])}` },
      { title: 'Spotting a train wreck from the diagram', html: `<p>Bad: <code>Controller → Order: getCustomer()</code>, <code>Controller → Customer: getWallet()</code>, <code>Controller → Wallet: getBalance()</code>, <code>Controller → Wallet: setBalance(b - x)</code>. Four arrows fan out from the controller, which now knows the inner structure of three classes and holds the balance rule itself. Better: <code>Controller → Order: payWithWallet()</code>, <code>Order → Customer: charge(x)</code>, <code>Customer → Wallet: debit(x)</code>. Each object talks only to its neighbour and owns its rule. Same behaviour, far less coupling.</p>`, code: { lang: 'java', code: `
class Wallet {
    private long balance = 1_000;
    boolean debit(long x) { if (x > balance) return false; balance -= x; return true; }
}
class Customer2 {
    private final Wallet wallet = new Wallet();
    boolean charge(long x) { return wallet.debit(x); }      // talks only to its own wallet
}
class Order2 {
    private final Customer2 customer;
    private final long total;
    Order2(Customer2 c, long total) { this.customer = c; this.total = total; }
    boolean payWithWallet() { return customer.charge(total); }   // controller calls only this
}`,
alt: [
  { lang: 'python', code: `
class Wallet:
    def __init__(self) -> None:
        self._balance = 1_000

    def debit(self, x: int) -> bool:
        if x > self._balance:
            return False
        self._balance -= x
        return True


class Customer2:
    def __init__(self) -> None:
        self._wallet = Wallet()

    def charge(self, x: int) -> bool:  # talks only to its own wallet
        return self._wallet.debit(x)


class Order2:
    def __init__(self, customer: Customer2, total: int) -> None:
        self._customer = customer
        self._total = total

    def pay_with_wallet(self) -> bool:  # controller calls only this
        return self._customer.charge(self._total)` },
  { lang: 'ts', code: `
class Wallet {
  private balance = 1_000;
  debit(x: number): boolean {
    if (x > this.balance) return false;
    this.balance -= x;
    return true;
  }
}
class Customer2 {
  private readonly wallet = new Wallet();
  charge(x: number): boolean { return this.wallet.debit(x); } // talks only to its own wallet
}
class Order2 {
  constructor(private readonly customer: Customer2, private readonly total: number) {}
  payWithWallet(): boolean { return this.customer.charge(this.total); } // controller calls only this
}` },
  { lang: 'cpp', code: `
class Wallet {
    long long balance_ = 1'000;
public:
    bool debit(long long x) {
        if (x > balance_) return false;
        balance_ -= x;
        return true;
    }
};
class Customer2 {
    Wallet wallet_;
public:
    bool charge(long long x) { return wallet_.debit(x); }  // talks only to its own wallet
};
class Order2 {
    Customer2& customer_;  // non-owning
    long long total_;
public:
    Order2(Customer2& c, long long total) : customer_(c), total_(total) {}
    bool payWithWallet() { return customer_.charge(total_); }  // controller calls only this
};` }
] } }
    ],
    deepDive: `<p><b>Sequence diagrams assign responsibilities.</b> The GRASP patterns become visible: the <i>Controller</i> is the first object receiving the system event; the <i>Creator</i> of an object (who sends «create») should be the one that contains or closely uses it (Order creates OrderLines); the <i>Information Expert</i> receives the message that needs its data. If you cannot decide where an arrow should land, your class diagram is missing a class.</p>
<p><b>Sync vs async semantics matter.</b> A synchronous arrow means the caller's thread blocks and the callee's failure is the caller's failure (same transaction, same latency budget). An async arrow (message queue, event bus, executor) decouples latency and failure but introduces ordering, retries and idempotency questions. Drawing the arrow type correctly in an interview opens a deeper discussion: "the email is async, so if it fails we retry from an outbox table; the order is already committed".</p>
<p><b>Transaction boundaries and failures.</b> Draw a note or frame around the messages that must be atomic (reserve + charge + save). Ask: what if <code>charge</code> succeeds and <code>save</code> fails? You need a compensation (refund) or a different order (save PENDING first). Sequence diagrams are where these bugs are cheapest to find.</p>
<p><b>Advanced notation:</b> <code>ref</code> (reuse another diagram), <code>break</code> (exit the enclosing fragment), <code>critical</code> (mutual exclusion region), <code>neg</code> (invalid trace), destruction (an X at the end of a lifeline), found/lost messages (from/to unknown senders), guards in square brackets <code>[amount &lt;= balance]</code>, and timing constraints <code>{&lt; 200ms}</code>.</p>
<p><b>Production reality:</b> distributed tracing (OpenTelemetry, Jaeger, Zipkin, Datadog APM) records real request flows as spans; a trace waterfall <i>is</i> a sequence diagram generated from runtime. Senior engineers use traces to verify that the drawn design matches reality (e.g. finding an N+1 loop of calls that the diagram did not show).</p>
<p><b>Keep it small.</b> One diagram per use case, 4–7 lifelines, 6–15 messages. Omit obvious returns and getters. If it gets bigger, split with <code>ref</code> frames.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate Mermaid <code>sequenceDiagram</code> text from a description or from code in seconds, and many design docs now embed those directly. AI is also good at listing failure branches you forgot ("what if the payment times out after charging?").</p>
<p><b>Use AI as a partner:</b> <code>Here is my placeOrder sequence. List every failure that can occur between messages and what state the system is left in.</code> or <code>Generate a Mermaid sequenceDiagram from this method; mark async calls with -) arrows.</code> Then compare the generated picture to your mental model: mismatches are bugs or misunderstandings.</p>
<p><b>Where AI goes wrong:</b> it draws everything as synchronous, invents participants that do not exist in your class diagram, puts business rules in the controller lifeline, and generates diagrams of 30+ messages that nobody can read. When generating from code, it shows what the code <i>does</i>, which may not be what it <i>should</i> do.</p>
<p><b>What you must still own:</b> choosing which use case deserves a diagram, the sync/async decision, the transaction boundary, and the failure handling story. Interviewers in 2026 often ask "what happens if step 4 fails?"; that answer comes from your understanding of the flow, not from the drawing tool.</p>`,
    problems: [{
      title: 'Turn a Sequence Diagram into Code: Cab Booking Request',
      level: 'Medium', tags: ['sequence diagram', 'responsibility assignment', 'alt fragment'], companies: ['Uber', 'Ola', 'Swiggy', 'Grab'],
      statement: `<p>Implement the classes behind this sequence diagram:</p>
<ol><li><code>Rider → RideService: requestRide(pickup, drop)</code></li><li><code>RideService → FareCalculator: estimate(pickup, drop)</code> → returns fare</li><li><code>RideService → DriverPool: nearestAvailable(pickup)</code> → returns driver or none</li><li><b>alt</b> [driver found]: <code>RideService → Driver: assign(ride)</code>; «create» <code>Ride</code> with status ASSIGNED; <code>RideService → Notifier: notifyAsync(rider, ride)</code>; return ride</li><li><b>alt</b> [else]: return "no drivers nearby"</li></ol>
<p>Write compilable code where each arrow is a method on the receiving class, and the alt fragment is the if/else.</p>`,
      constraints: `<ul><li>Locations as (x, y) grid points; distance = Manhattan distance.</li><li>Fare = ₹50 base + ₹12 per unit distance.</li><li>A driver is available only if not already assigned. Notifier must not block (async).</li></ul>`,
      example: `<p>Drivers: D1 at (0,0) free, D2 at (5,5) free. Rider requests (1,1) → (4,5): distance 3 + 4 = 7 → fare = 50 + 84 = ${H.c('g', '₹134')}. Nearest free driver to (1,1) is D1 (distance 2) → ride ASSIGNED to D1. A second request from (1,1) gets ${H.c('y', 'D2')}. A third gets ${H.c('r', '"no drivers nearby"')} (alt else branch).</p>`,
      brute: {
        why: `<p>The naive version puts the whole diagram inside one <code>RideController.request</code> method: it computes the fare inline, loops over a raw list of driver maps, flips a <code>"busy"</code> string, and sends the notification synchronously with a blocking call. Drawn as a sequence diagram it has <b>one lifeline</b> with 20 self-calls: no object owns anything, the fare formula cannot be reused or tested, and the user waits for the SMS gateway.</p>`,
        code: { lang: 'java', code: `
class RideController {
    List<Map<String, Object>> drivers = new ArrayList<>();
    String request(int px, int py, int dx, int dy) {
        long fare = 50 + 12L * (Math.abs(px - dx) + Math.abs(py - dy));    // formula buried here
        Map<String, Object> best = null; int bestD = Integer.MAX_VALUE;
        for (Map<String, Object> d : drivers) {
            if ("busy".equals(d.get("status"))) continue;
            int dist = Math.abs((int) d.get("x") - px) + Math.abs((int) d.get("y") - py);
            if (dist < bestD) { bestD = dist; best = d; }
        }
        if (best == null) return "no drivers nearby";
        best.put("status", "busy");
        System.out.println("SMS sent");           // synchronous: user waits for this
        return "assigned " + best.get("id") + " fare " + fare;
    }
}`, alt: [
                { lang: 'python', code: `
class RideController:
    def __init__(self):
        self.drivers = []        # list of dicts

    def request(self, px, py, dx, dy):
        fare = 50 + 12 * (abs(px - dx) + abs(py - dy))     # formula buried here
        best, best_d = None, float("inf")
        for d in self.drivers:
            if d["status"] == "busy": continue
            dist = abs(d["x"] - px) + abs(d["y"] - py)
            if dist < best_d: best_d, best = dist, d
        if best is None: return "no drivers nearby"
        best["status"] = "busy"
        print("SMS sent")           # synchronous: user waits for this
        return f"assigned {best['id']} fare {fare}"` },
                { lang: 'ts', code: `
class RideController {
    drivers: { id: string; x: number; y: number; status: string }[] = [];
    request(px: number, py: number, dx: number, dy: number): string {
        const fare = 50 + 12 * (Math.abs(px - dx) + Math.abs(py - dy));    // formula buried here
        let best: { id: string; x: number; y: number; status: string } | null = null, bestD = Infinity;
        for (const d of this.drivers) {
            if (d.status === "busy") continue;
            const dist = Math.abs(d.x - px) + Math.abs(d.y - py);
            if (dist < bestD) { bestD = dist; best = d; }
        }
        if (best === null) return "no drivers nearby";
        best.status = "busy";
        console.log("SMS sent");           // synchronous: user waits for this
        return "assigned " + best.id + " fare " + fare;
    }
}` },
                { lang: 'cpp', code: `
struct Driver { string id; int x, y; string status; };
class RideController {
    vector<Driver> drivers;
public:
    string request(int px, int py, int dx, int dy) {
        long long fare = 50 + 12LL * (abs(px - dx) + abs(py - dy));    // formula buried here
        Driver* best = nullptr; int bestD = INT_MAX;
        for (auto& d : drivers) {
            if (d.status == "busy") continue;
            int dist = abs(d.x - px) + abs(d.y - py);
            if (dist < bestD) { bestD = dist; best = &d; }
        }
        if (!best) return "no drivers nearby";
        best->status = "busy";
        cout << "SMS sent\\n";           // synchronous: user waits for this
        return "assigned " + best->id + " fare " + to_string(fare);
    }
};` }
              ] }
      },
      mcq: { q: 'In the diagram, which class should own "find the nearest available driver"?', options: ['RideService, by looping over all drivers itself', 'DriverPool, because it holds the drivers and their availability', 'Rider', 'Notifier'], answer: 1, explain: 'Information Expert: DriverPool has the data (drivers, positions, availability). RideService just asks it, which is exactly the arrow RideService → DriverPool: nearestAvailable(pickup).' },
      hints: [
        `<p>Hint 1: each lifeline is a class; each solid arrow into it is a method you must write on it: <code>FareCalculator.estimate</code>, <code>DriverPool.nearestAvailable</code>, <code>Driver.assign</code>, <code>Notifier.notifyAsync</code>.</p>`,
        `<p>Hint 2: <code>nearestAvailable</code> returns an optional driver (<code>Optional&lt;Driver&gt;</code>, <code>Driver | None</code>, <code>Driver | undefined</code> or a nullable pointer); the alt fragment becomes an if/else on whether one was found. Location is a small immutable value type with <code>distanceTo</code>.</p>`,
        `<p>Hint 3: async = hand work to an executor (Java <code>Executor</code>, Python <code>ThreadPoolExecutor</code> or a callback, a C++ <code>std::function</code> task; or record it in a queue) and return immediately. RideService receives all collaborators via its constructor (association), so tests can pass fakes.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "Asha with D1 fare 134 ASSIGNED\nRavi with D2 fare 134 ASSIGNED\nno drivers nearby\nSMS to Asha: Asha with D1 fare 134 ASSIGNED\n2\n" }] },
      solution: {
        approach: `<p>Map the diagram 1:1. <b>Lifelines → classes</b>: RideService (coordinator), FareCalculator, DriverPool, Driver, Notifier, plus the created Ride. <b>Messages → methods</b> on the receiver. <b>alt → if/else</b> on the optional result. <b>«create» → constructor</b> call inside RideService. <b>Async → Executor</b> so the caller never waits. RideService holds references to its collaborators (association via constructor injection), while Location and Fare are small value objects. Each class has one job, matching the short arrows in the diagram.</p>`,
        code: `
import java.util.concurrent.*;

record Location(int x, int y) {
    int distanceTo(Location o) { return Math.abs(x - o.x) + Math.abs(y - o.y); }
}

enum RideStatus { ASSIGNED, STARTED, COMPLETED }

class Driver {
    private final String id;
    private final Location location;
    private Ride current;
    Driver(String id, Location location) { this.id = id; this.location = location; }
    boolean isAvailable() { return current == null; }
    void assign(Ride ride) {                                    // arrow: RideService -> Driver: assign(ride)
        if (!isAvailable()) throw new IllegalStateException("driver busy");
        current = ride;
    }
    Location location() { return location; }
    String id() { return id; }
}

class Ride {
    private final String rider;
    private final Driver driver;
    private final long farePaise;
    private RideStatus status = RideStatus.ASSIGNED;
    Ride(String rider, Driver driver, long farePaise) { this.rider = rider; this.driver = driver; this.farePaise = farePaise; }
    String summary() { return rider + " with " + driver.id() + " fare " + farePaise / 100 + " " + status; }
}

class FareCalculator {
    long estimate(Location from, Location to) { return 5000 + 1200L * from.distanceTo(to); }  // paise
}

class DriverPool {
    private final List<Driver> drivers = new ArrayList<>();
    void add(Driver d) { drivers.add(d); }
    Optional<Driver> nearestAvailable(Location p) {            // the information expert
        return drivers.stream().filter(Driver::isAvailable)
                .min(Comparator.comparingInt(d -> d.location().distanceTo(p)));
    }
}

class Notifier {
    private final Executor executor;
    final List<String> sent = Collections.synchronizedList(new ArrayList<>());
    Notifier(Executor executor) { this.executor = executor; }
    void notifyAsync(String rider, Ride ride) {                // async: returns immediately
        executor.execute(() -> sent.add("SMS to " + rider + ": " + ride.summary()));
    }
}

class RideService {
    private final FareCalculator fares;
    private final DriverPool pool;
    private final Notifier notifier;
    RideService(FareCalculator f, DriverPool p, Notifier n) { fares = f; pool = p; notifier = n; }

    String requestRide(String rider, Location pickup, Location drop) {
        long fare = fares.estimate(pickup, drop);                       // message 2
        Optional<Driver> driver = pool.nearestAvailable(pickup);        // message 3
        if (driver.isPresent()) {                                       // alt [driver found]
            Ride ride = new Ride(rider, driver.get(), fare);            // «create»
            driver.get().assign(ride);                                  // message 4
            notifier.notifyAsync(rider, ride);                          // async message
            return ride.summary();
        } else {                                                        // alt [else]
            return "no drivers nearby";
        }
    }

    public static void main(String[] args) {
        DriverPool pool = new DriverPool();
        pool.add(new Driver("D1", new Location(0, 0)));
        pool.add(new Driver("D2", new Location(5, 5)));
        Executor direct = Runnable::run;                                // run inline for the demo
        Notifier notifier = new Notifier(direct);
        RideService svc = new RideService(new FareCalculator(), pool, notifier);
        Location a = new Location(1, 1), b = new Location(4, 5);
        System.out.println(svc.requestRide("Asha", a, b));   // Asha with D1 fare 134 ASSIGNED
        System.out.println(svc.requestRide("Ravi", a, b));   // Ravi with D2 fare 134 ASSIGNED
        System.out.println(svc.requestRide("Mia", a, b));    // no drivers nearby
        System.out.println(notifier.sent.get(0));            // SMS to Asha: Asha with D1 fare 134 ASSIGNED
        System.out.println(notifier.sent.size());            // 2: no SMS when nobody was assigned
    }
}`,
        alt: [
          { lang: 'python', code: `
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Callable

Executor = Callable[[Callable[[], None]], None]


@dataclass(frozen=True)
class Location:
    x: int
    y: int

    def distance_to(self, o: Location) -> int:
        return abs(self.x - o.x) + abs(self.y - o.y)


class RideStatus(Enum):
    ASSIGNED = "ASSIGNED"
    STARTED = "STARTED"
    COMPLETED = "COMPLETED"


class Driver:
    def __init__(self, driver_id: str, location: Location) -> None:
        self.id = driver_id
        self.location = location
        self._current: Ride | None = None

    def is_available(self) -> bool:
        return self._current is None

    def assign(self, ride: Ride) -> None:  # arrow: RideService -> Driver: assign(ride)
        if not self.is_available():
            raise RuntimeError("driver busy")
        self._current = ride


class Ride:
    def __init__(self, rider: str, driver: Driver, fare_paise: int) -> None:
        self._rider = rider
        self._driver = driver
        self._fare_paise = fare_paise
        self._status = RideStatus.ASSIGNED

    def summary(self) -> str:
        return f"{self._rider} with {self._driver.id} fare {self._fare_paise // 100} {self._status.name}"


class FareCalculator:
    def estimate(self, origin: Location, dest: Location) -> int:
        return 5000 + 1200 * origin.distance_to(dest)  # paise


class DriverPool:
    def __init__(self) -> None:
        self._drivers: list[Driver] = []

    def add(self, d: Driver) -> None:
        self._drivers.append(d)

    def nearest_available(self, p: Location) -> Driver | None:  # the information expert
        free = [d for d in self._drivers if d.is_available()]
        return min(free, key=lambda d: d.location.distance_to(p), default=None)


class Notifier:
    def __init__(self, executor: Executor) -> None:
        self._executor = executor
        self.sent: list[str] = []

    def notify_async(self, rider: str, ride: Ride) -> None:  # async: returns immediately
        self._executor(lambda: self.sent.append(f"SMS to {rider}: {ride.summary()}"))


class RideService:
    def __init__(self, fares: FareCalculator, pool: DriverPool, notifier: Notifier) -> None:
        self._fares = fares
        self._pool = pool
        self._notifier = notifier

    def request_ride(self, rider: str, pickup: Location, drop: Location) -> str:
        fare = self._fares.estimate(pickup, drop)  # message 2
        driver = self._pool.nearest_available(pickup)  # message 3
        if driver is not None:  # alt [driver found]
            ride = Ride(rider, driver, fare)  # «create»
            driver.assign(ride)  # message 4
            self._notifier.notify_async(rider, ride)  # async message
            return ride.summary()
        return "no drivers nearby"  # alt [else]


def main() -> None:
    pool = DriverPool()
    pool.add(Driver("D1", Location(0, 0)))
    pool.add(Driver("D2", Location(5, 5)))
    notifier = Notifier(lambda task: task())  # run inline for the demo
    svc = RideService(FareCalculator(), pool, notifier)
    a, b = Location(1, 1), Location(4, 5)
    print(svc.request_ride("Asha", a, b))  # Asha with D1 fare 134 ASSIGNED
    print(svc.request_ride("Ravi", a, b))  # Ravi with D2 fare 134 ASSIGNED
    print(svc.request_ride("Mia", a, b))  # no drivers nearby
    print(notifier.sent[0])  # SMS to Asha: Asha with D1 fare 134 ASSIGNED
    print(len(notifier.sent))  # 2: no SMS when nobody was assigned


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `
type Executor = (task: () => void) => void;

class Location {
  constructor(readonly x: number, readonly y: number) {}
  distanceTo(o: Location): number { return Math.abs(this.x - o.x) + Math.abs(this.y - o.y); }
}

type RideStatus = "ASSIGNED" | "STARTED" | "COMPLETED";

class Driver {
  private currentRide: Ride | null = null;
  constructor(private readonly driverId: string, private readonly loc: Location) {}
  isAvailable(): boolean { return this.currentRide === null; }
  assign(ride: Ride): void { // arrow: RideService -> Driver: assign(ride)
    if (!this.isAvailable()) throw new Error("driver busy");
    this.currentRide = ride;
  }
  location(): Location { return this.loc; }
  id(): string { return this.driverId; }
}

class Ride {
  private status: RideStatus = "ASSIGNED";
  constructor(
    private readonly rider: string,
    private readonly driver: Driver,
    private readonly farePaise: number,
  ) {}
  summary(): string {
    return \`\${this.rider} with \${this.driver.id()} fare \${Math.floor(this.farePaise / 100)} \${this.status}\`;
  }
}

class FareCalculator {
  estimate(from: Location, to: Location): number { return 5000 + 1200 * from.distanceTo(to); } // paise
}

class DriverPool {
  private readonly drivers: Driver[] = [];
  add(d: Driver): void { this.drivers.push(d); }
  nearestAvailable(p: Location): Driver | undefined { // the information expert
    let best: Driver | undefined;
    for (const d of this.drivers) {
      if (d.isAvailable() && (!best || d.location().distanceTo(p) < best.location().distanceTo(p))) best = d;
    }
    return best;
  }
}

class Notifier {
  readonly sent: string[] = [];
  constructor(private readonly executor: Executor) {}
  notifyAsync(rider: string, ride: Ride): void { // async: returns immediately
    this.executor(() => { this.sent.push(\`SMS to \${rider}: \${ride.summary()}\`); });
  }
}

class RideService {
  constructor(
    private readonly fares: FareCalculator,
    private readonly pool: DriverPool,
    private readonly notifier: Notifier,
  ) {}

  requestRide(rider: string, pickup: Location, drop: Location): string {
    const fare = this.fares.estimate(pickup, drop); // message 2
    const driver = this.pool.nearestAvailable(pickup); // message 3
    if (driver) { // alt [driver found]
      const ride = new Ride(rider, driver, fare); // «create»
      driver.assign(ride); // message 4
      this.notifier.notifyAsync(rider, ride); // async message
      return ride.summary();
    }
    return "no drivers nearby"; // alt [else]
  }
}

function main(): void {
  const pool = new DriverPool();
  pool.add(new Driver("D1", new Location(0, 0)));
  pool.add(new Driver("D2", new Location(5, 5)));
  const notifier = new Notifier((task) => task()); // run inline for the demo
  const svc = new RideService(new FareCalculator(), pool, notifier);
  const a = new Location(1, 1), b = new Location(4, 5);
  console.log(svc.requestRide("Asha", a, b)); // Asha with D1 fare 134 ASSIGNED
  console.log(svc.requestRide("Ravi", a, b)); // Ravi with D2 fare 134 ASSIGNED
  console.log(svc.requestRide("Mia", a, b)); // no drivers nearby
  console.log(notifier.sent[0]); // SMS to Asha: Asha with D1 fare 134 ASSIGNED
  console.log(notifier.sent.length); // 2: no SMS when nobody was assigned
}
main();` },
          { lang: 'cpp', code: `
struct Location {
    int x, y;
    int distanceTo(const Location& o) const { return abs(x - o.x) + abs(y - o.y); }
};

enum class RideStatus { Assigned, Started, Completed };

class Driver;

class Ride {
public:
    Ride(string rider, const Driver* driver, long long farePaise)
        : rider_(std::move(rider)), driver_(driver), farePaise_(farePaise) {}
    string summary() const;
private:
    string rider_;
    const Driver* driver_;  // non-owning back pointer: the Driver owns its current Ride
    long long farePaise_;
    RideStatus status_ = RideStatus::Assigned;
};

class Driver {
public:
    Driver(string id, Location location) : id_(std::move(id)), location_(location) {}
    bool isAvailable() const { return current_ == nullptr; }
    void assign(unique_ptr<Ride> ride) {  // arrow: RideService -> Driver: assign(ride)
        if (!isAvailable()) throw runtime_error("driver busy");
        current_ = std::move(ride);
    }
    const Location& location() const { return location_; }
    const string& id() const { return id_; }
private:
    string id_;
    Location location_;
    unique_ptr<Ride> current_;
};

string Ride::summary() const {
    return rider_ + " with " + driver_->id() + " fare " + to_string(farePaise_ / 100) + " " +
           (status_ == RideStatus::Assigned ? "ASSIGNED" : status_ == RideStatus::Started ? "STARTED" : "COMPLETED");
}

class FareCalculator {
public:
    long long estimate(const Location& from, const Location& to) const { return 5000 + 1200LL * from.distanceTo(to); }  // paise
};

class DriverPool {
public:
    void add(unique_ptr<Driver> d) { drivers_.push_back(std::move(d)); }
    Driver* nearestAvailable(const Location& p) const {  // the information expert; nullptr if none
        Driver* best = nullptr;
        for (const auto& d : drivers_)
            if (d->isAvailable() && (!best || d->location().distanceTo(p) < best->location().distanceTo(p))) best = d.get();
        return best;
    }
private:
    vector<unique_ptr<Driver>> drivers_;
};

using Executor = function<void(function<void()>)>;

class Notifier {
public:
    explicit Notifier(Executor executor) : executor_(std::move(executor)) {}
    void notifyAsync(const string& rider, const string& summary) {  // async: returns immediately
        executor_([this, rider, summary] { sent_.push_back("SMS to " + rider + ": " + summary); });
    }
    const vector<string>& sent() const { return sent_; }
private:
    Executor executor_;
    vector<string> sent_;
};

class RideService {
public:
    RideService(const FareCalculator& f, DriverPool& p, Notifier& n) : fares_(f), pool_(p), notifier_(n) {}

    string requestRide(const string& rider, const Location& pickup, const Location& drop) {
        long long fare = fares_.estimate(pickup, drop);        // message 2
        Driver* driver = pool_.nearestAvailable(pickup);       // message 3
        if (driver) {                                          // alt [driver found]
            auto ride = make_unique<Ride>(rider, driver, fare);  // «create»
            string summary = ride->summary();
            driver->assign(std::move(ride));                   // message 4
            notifier_.notifyAsync(rider, summary);             // async message
            return summary;
        }
        return "no drivers nearby";                            // alt [else]
    }

private:
    const FareCalculator& fares_;
    DriverPool& pool_;
    Notifier& notifier_;
};

int main() {
    DriverPool pool;
    pool.add(make_unique<Driver>("D1", Location{0, 0}));
    pool.add(make_unique<Driver>("D2", Location{5, 5}));
    Notifier notifier([](function<void()> task) { task(); });  // run inline for the demo
    FareCalculator fares;
    RideService svc(fares, pool, notifier);
    Location a{1, 1}, b{4, 5};
    cout << svc.requestRide("Asha", a, b) << "\\n";  // Asha with D1 fare 134 ASSIGNED
    cout << svc.requestRide("Ravi", a, b) << "\\n";  // Ravi with D2 fare 134 ASSIGNED
    cout << svc.requestRide("Mia", a, b) << "\\n";   // no drivers nearby
    cout << notifier.sent()[0] << "\\n";             // SMS to Asha: Asha with D1 fare 134 ASSIGNED
    cout << notifier.sent().size() << "\\n";         // 2: no SMS when nobody was assigned
}` }
        ],
        complexity: `<p>estimate O(1); nearestAvailable O(D) over D drivers (a spatial index like a geohash grid or k-d tree makes it ~O(log D) at scale); assign O(1). The design keeps each arrow a single, testable method.</p>`,
        followUps: ['Two riders request at the same instant and both get D1. Where do you add synchronisation?', 'Add surge pricing without editing FareCalculator callers. Which relationship/pattern?', 'Draw the alt branch for "driver rejects the ride": what new messages appear?']
      }
    }]
  });

  /* =========================== TOPIC 7 =========================== */
  topics.push({
    title: 'End to End: Requirement → Class Diagram → Sequence → Code Skeleton',
    analogy: `<p>Assembling <b>flat-pack furniture</b>: first you read the instruction sheet and check the box has what you need (requirements). Then you lay every part on the floor and label them (classes). You check which screw joins which panel (relationships). Only then do you assemble (code), and finally you push the wardrobe to see if it wobbles (walk a use case). People who start screwing panels together before laying out the parts end up with a wardrobe whose door opens into the wall.</p>`,
    explain: `<p>This topic ties everything together into the <b>repeatable workflow</b> used in LLD / machine-coding interviews.</p>
${H.table(['Step', 'Time (60-min round)', 'Output', 'Key question'], [
  ['1. Clarify', '5 min', 'feature list, in/out of scope', '"What must it do? What can we skip?"'],
  ['2. Entities', '5 min', 'filtered noun list, enums, value objects', '"What does the system have to remember?"'],
  ['3. Relationships', '5 min', 'lines + diamonds + multiplicities', '"Who owns whom? How many?"'],
  ['4. Class diagram', '5 min', 'boxes with key members, interfaces', '"Where will things vary?"'],
  ['5. Sequence (main use case)', '5 min', 'one flow + one failure branch', '"Who does each step?"'],
  ['6. Code skeleton + core logic', '25–30 min', 'compiling code + a tiny demo', '"Does it run? Is it easy to extend?"'],
  ['7. Extensions', '5 min', 'how new requirements fit', '"What changes if…?"']
])}
<h4>Writing the skeleton: an order that never gets stuck</h4>
<ol>
<li><b>Enums</b> for fixed sets (RoomType, BookingStatus).</li>
<li><b>Value objects</b> as immutable value types (Java <code>record</code>, Python frozen <code>@dataclass</code>, C++ <code>struct</code>; DateRange, Money): validate in the constructor.</li>
<li><b>Entities</b> (Room, Guest, Booking): private fields that are never reassigned (<code>final</code>, <code>readonly</code>, <code>const</code>), constructor validation, intention-revealing methods, no public setters.</li>
<li><b>Interfaces</b> at variation points (PricingPolicy, PaymentMethod).</li>
<li><b>Coordinator/service</b> (Hotel, BookingService) holding in-memory maps as repositories, implementing the use cases.</li>
<li><b>main()</b> that runs the happy path and one failure. Interviewers love seeing it run.</li>
</ol>
<h4>Skeleton quality checklist</h4>
${H.table(['Check', 'Good', 'Smell'], [
  ['Fields', 'private, never-reassigned fields where possible', 'public / mutable everything'],
  ['Money', 'integer paise or a decimal type (<code>BigDecimal</code>, <code>Decimal</code>)', '<code>double</code>'],
  ['Status', '<code>enum</code> + transition methods', '<code>String status</code> + setter'],
  ['Collections out', 'a copy or a read-only view', 'returning the internal list'],
  ['0..1 links', 'optional return (<code>Optional</code>, <code>None</code>, <code>std::optional</code>) or explicit null contract', 'surprise null dereference'],
  ['Variation', 'interface + implementations', 'switch on a type string'],
  ['Collaborators', 'constructor parameters (injectable)', '<code>new</code> of concrete services inside methods']
])}`,
    clues: [
      '"Design X. You have 60–90 minutes and the code must run" (machine coding) → follow the 7-step workflow, keep 6–10 classes.',
      '"Make sure it is extensible" → name the variation points out loud and put interfaces there.',
      '"Two users try to book the same room" → note the concurrency hook (the check-then-book must be atomic) even if you code it simply.',
      '"Show me how a booking flows" → draw the sequence for the main use case before coding it.',
      '"Can you add X now?" (late twist) → a good skeleton absorbs it by adding a class, not editing ten.',
      '"Explain your design decisions" → be ready with one reason for each relationship and each interface.'
    ],
    code: { lang: 'java', code: `
// A compact, runnable skeleton for "book a hotel room for a date range".
enum RoomType { SINGLE, DOUBLE, SUITE }
enum BookingStatus { CONFIRMED, CANCELLED }

record DateRange(LocalDate checkIn, LocalDate checkOut) {             // value object
    DateRange {
        if (!checkOut.isAfter(checkIn)) throw new IllegalArgumentException("checkOut must be after checkIn");
    }
    boolean overlaps(DateRange o) { return checkIn.isBefore(o.checkOut) && o.checkIn.isBefore(checkOut); }
    long nights() { return java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut); }
}

class Room {                                                         // entity
    private final String number;
    private final RoomType type;
    private final long nightlyPaise;
    Room(String number, RoomType type, long nightlyPaise) { this.number = number; this.type = type; this.nightlyPaise = nightlyPaise; }
    String number() { return number; }
    RoomType type() { return type; }
    long nightlyPaise() { return nightlyPaise; }
}

class Booking {                                                      // entity linking Guest + Room
    private final String id, guest;
    private final Room room;
    private final DateRange stay;
    private BookingStatus status = BookingStatus.CONFIRMED;
    Booking(String id, String guest, Room room, DateRange stay) { this.id = id; this.guest = guest; this.room = room; this.stay = stay; }
    boolean blocks(Room r, DateRange d) { return status == BookingStatus.CONFIRMED && room == r && stay.overlaps(d); }
    void cancel() { status = BookingStatus.CANCELLED; }
    long totalPaise() { return stay.nights() * room.nightlyPaise(); }
    String id() { return id; }
}

class Hotel {                                                        // coordinator + in-memory repository
    private final List<Room> rooms = new ArrayList<>();
    private final List<Booking> bookings = new ArrayList<>();
    private int seq = 1;
    void addRoom(Room r) { rooms.add(r); }
    synchronized Optional<Booking> book(String guest, RoomType type, DateRange stay) {   // atomic check-then-book
        for (Room r : rooms) {
            if (r.type() != type) continue;
            boolean free = bookings.stream().noneMatch(b -> b.blocks(r, stay));
            if (free) {
                Booking b = new Booking("B" + (seq++), guest, r, stay);
                bookings.add(b);
                return Optional.of(b);
            }
        }
        return Optional.empty();
    }
    public static void main(String[] args) {
        Hotel h = new Hotel();
        h.addRoom(new Room("101", RoomType.DOUBLE, 4000_00));
        DateRange may = new DateRange(LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 4));
        System.out.println(h.book("Asha", RoomType.DOUBLE, may).map(Booking::totalPaise).orElse(-1L)); // 1200000
        System.out.println(h.book("Ravi", RoomType.DOUBLE, may).isPresent());                          // false
    }
}`,
alt: [
  { lang: 'python', code: `
# A compact, runnable skeleton for "book a hotel room for a date range".
import threading
from dataclasses import dataclass
from datetime import date
from enum import Enum


class RoomType(Enum):
    SINGLE = 1
    DOUBLE = 2
    SUITE = 3


class BookingStatus(Enum):
    CONFIRMED = 1
    CANCELLED = 2


@dataclass(frozen=True)
class DateRange:  # value object
    check_in: date
    check_out: date

    def __post_init__(self) -> None:
        if not self.check_out > self.check_in:
            raise ValueError("checkOut must be after checkIn")

    def overlaps(self, o: "DateRange") -> bool:
        return self.check_in < o.check_out and o.check_in < self.check_out

    def nights(self) -> int:
        return (self.check_out - self.check_in).days


class Room:  # entity
    def __init__(self, number: str, type_: RoomType, nightly_paise: int) -> None:
        self.number = number
        self.type = type_
        self.nightly_paise = nightly_paise


class Booking:  # entity linking Guest + Room
    def __init__(self, booking_id: str, guest: str, room: Room, stay: DateRange) -> None:
        self.id = booking_id
        self._guest = guest
        self._room = room
        self._stay = stay
        self._status = BookingStatus.CONFIRMED

    def blocks(self, r: Room, d: DateRange) -> bool:
        return self._status is BookingStatus.CONFIRMED and self._room is r and self._stay.overlaps(d)

    def cancel(self) -> None:
        self._status = BookingStatus.CANCELLED

    def total_paise(self) -> int:
        return self._stay.nights() * self._room.nightly_paise


class Hotel:  # coordinator + in-memory repository
    def __init__(self) -> None:
        self._rooms: list[Room] = []
        self._bookings: list[Booking] = []
        self._seq = 1
        self._lock = threading.Lock()

    def add_room(self, r: Room) -> None:
        self._rooms.append(r)

    def book(self, guest: str, type_: RoomType, stay: DateRange) -> Booking | None:  # atomic check-then-book
        with self._lock:
            for r in self._rooms:
                if r.type is not type_:
                    continue
                if not any(b.blocks(r, stay) for b in self._bookings):
                    b = Booking(f"B{self._seq}", guest, r, stay)
                    self._seq += 1
                    self._bookings.append(b)
                    return b
            return None


h = Hotel()
h.add_room(Room("101", RoomType.DOUBLE, 400000))
may = DateRange(date(2026, 5, 1), date(2026, 5, 4))
first = h.book("Asha", RoomType.DOUBLE, may)
print(first.total_paise() if first else -1)  # 1200000
print(str(h.book("Ravi", RoomType.DOUBLE, may) is not None).lower())  # false` },
  { lang: 'ts', code: `
// A compact, runnable skeleton for "book a hotel room for a date range".
type RoomType = "SINGLE" | "DOUBLE" | "SUITE";
type BookingStatus = "CONFIRMED" | "CANCELLED";

class DateRange { // value object
  constructor(readonly checkIn: Date, readonly checkOut: Date) {
    if (!(checkOut > checkIn)) throw new Error("checkOut must be after checkIn");
  }
  overlaps(o: DateRange): boolean { return this.checkIn < o.checkOut && o.checkIn < this.checkOut; }
  nights(): number { return Math.round((this.checkOut.getTime() - this.checkIn.getTime()) / 86_400_000); }
}

class Room { // entity
  constructor(readonly number: string, readonly type: RoomType, readonly nightlyPaise: number) {}
}

class Booking { // entity linking Guest + Room
  private status: BookingStatus = "CONFIRMED";
  constructor(
    readonly id: string,
    private readonly guest: string,
    private readonly room: Room,
    private readonly stay: DateRange,
  ) {}
  blocks(r: Room, d: DateRange): boolean { return this.status === "CONFIRMED" && this.room === r && this.stay.overlaps(d); }
  cancel(): void { this.status = "CANCELLED"; }
  totalPaise(): number { return this.stay.nights() * this.room.nightlyPaise; }
}

class Hotel { // coordinator + in-memory repository
  private readonly rooms: Room[] = [];
  private readonly bookings: Booking[] = [];
  private seq = 1;
  addRoom(r: Room): void { this.rooms.push(r); }
  book(guest: string, type: RoomType, stay: DateRange): Booking | undefined { // JS is single-threaded: check-then-book is atomic
    for (const r of this.rooms) {
      if (r.type !== type) continue;
      if (!this.bookings.some((b) => b.blocks(r, stay))) {
        const b = new Booking("B" + this.seq++, guest, r, stay);
        this.bookings.push(b);
        return b;
      }
    }
    return undefined;
  }
}

const h = new Hotel();
h.addRoom(new Room("101", "DOUBLE", 400000));
const may = new DateRange(new Date(Date.UTC(2026, 4, 1)), new Date(Date.UTC(2026, 4, 4)));
console.log(h.book("Asha", "DOUBLE", may)?.totalPaise() ?? -1); // 1200000
console.log(h.book("Ravi", "DOUBLE", may) !== undefined); // false` },
  { lang: 'cpp', code: `
// A compact, runnable skeleton for "book a hotel room for a date range".
enum class RoomType { Single, Double, Suite };
enum class BookingStatus { Confirmed, Cancelled };

class DateRange {  // value object
    chrono::sys_days checkIn_, checkOut_;
public:
    DateRange(chrono::sys_days in, chrono::sys_days out) : checkIn_(in), checkOut_(out) {
        if (!(out > in)) throw invalid_argument("checkOut must be after checkIn");
    }
    bool overlaps(const DateRange& o) const { return checkIn_ < o.checkOut_ && o.checkIn_ < checkOut_; }
    long long nights() const { return (checkOut_ - checkIn_).count(); }
};

class Room {  // entity
    string number_;
    RoomType type_;
    long long nightlyPaise_;
public:
    Room(string number, RoomType type, long long nightlyPaise) : number_(std::move(number)), type_(type), nightlyPaise_(nightlyPaise) {}
    const string& number() const { return number_; }
    RoomType type() const { return type_; }
    long long nightlyPaise() const { return nightlyPaise_; }
};

class Booking {  // entity linking Guest + Room
    string id_, guest_;
    const Room* room_;  // non-owning: the hotel owns the rooms
    DateRange stay_;
    BookingStatus status_ = BookingStatus::Confirmed;
public:
    Booking(string id, string guest, const Room& room, DateRange stay)
        : id_(std::move(id)), guest_(std::move(guest)), room_(&room), stay_(stay) {}
    bool blocks(const Room& r, const DateRange& d) const {
        return status_ == BookingStatus::Confirmed && room_ == &r && stay_.overlaps(d);
    }
    void cancel() { status_ = BookingStatus::Cancelled; }
    long long totalPaise() const { return stay_.nights() * room_->nightlyPaise(); }
    const string& id() const { return id_; }
};

class Hotel {  // coordinator + in-memory repository
    deque<Room> rooms_;       // deque: adding a room never moves existing ones
    vector<Booking> bookings_;
    int seq_ = 1;
    mutex mu_;
public:
    void addRoom(Room r) { rooms_.push_back(std::move(r)); }
    optional<Booking> book(const string& guest, RoomType type, const DateRange& stay) {  // atomic check-then-book
        lock_guard<mutex> guard(mu_);
        for (const Room& r : rooms_) {
            if (r.type() != type) continue;
            bool free = none_of(bookings_.begin(), bookings_.end(), [&](const Booking& b) { return b.blocks(r, stay); });
            if (free) {
                bookings_.emplace_back("B" + to_string(seq_++), guest, r, stay);
                return bookings_.back();
            }
        }
        return nullopt;
    }
};

int main() {
    using namespace chrono;
    Hotel h;
    h.addRoom(Room("101", RoomType::Double, 400000));
    DateRange may(year{2026} / 5 / 1, year{2026} / 5 / 4);
    auto first = h.book("Asha", RoomType::Double, may);
    cout << (first ? first->totalPaise() : -1) << "\\n";  // 1200000
    cout << boolalpha << h.book("Ravi", RoomType::Double, may).has_value() << "\\n";  // false
}` }
] },
    codeTitle: 'End-to-end skeleton: hotel booking (runs)',
    viz: [{
      title: 'Hotel booking: the whole workflow in one animation',
      gen: function () {
        var req = '"Guests search for a room type for a date range and book it. A room cannot be double-booked. Bookings can be cancelled. Price = nights × nightly rate. Later we may add seasonal pricing."';
        var f = [];
        f.push({ narr: '<b>Step 1, clarify.</b> Agree the scope out loud: search + book + cancel; single hotel; no payments for now; pricing must be pluggable later. Write it down.', parts: [{ type: 'text', label: 'Requirement', html: '<i>' + req + '</i>' }, { type: 'table', label: 'Scope agreed with interviewer', columns: ['In scope', 'Out of scope'], rows: [['search by type + dates', 'payments, refunds'], ['book (no double booking)', 'multiple hotels'], ['cancel', 'loyalty points'], ['price = nights × rate (pluggable)', 'UI / database']], hl: { 3: 'sel' } }] });
        f.push({ narr: '<b>Step 2, entities.</b> Noun pass: guest, room, room type, date range, booking, price, hotel. Filter: room type → enum; date range → value object (record); price → derived; guest → just a name for now (attribute).', parts: [{ type: 'set', label: 'Nouns → verdicts', items: ['Hotel: class', 'Room: class', 'RoomType: enum', 'DateRange: record', 'Booking: class', 'BookingStatus: enum', 'price: derived', 'guest: attribute (for now)'], hl: { 'Hotel: class': 'ok', 'Room: class': 'ok', 'Booking: class': 'ok', 'RoomType: enum': 'sel', 'BookingStatus: enum': 'sel', 'DateRange: record': 'win', 'price: derived': 'cur', 'guest: attribute (for now)': 'cur' } }] });
        f = f.concat(uml('Step 3–4: relationships and class diagram', 60, [
          { narr: '<b>Step 3, relationships.</b> Hotel <b>owns</b> its rooms (composition 1..*) and its bookings (composition 0..*).', nodes: [bx('Hotel', 'Hotel', 50, 8), bx('Room', 'Room', 20, 30), bx('Booking', 'Booking', 80, 30)], edges: [['Hotel', 'Room', '◆ 1..*'], ['Hotel', 'Booking', '◆ 0..*']], rows: [['Hotel', '- rooms, - bookings', '+ search(type, range), + book(guest, type, range), + cancel(id)']] },
          { narr: 'A booking <b>refers to</b> exactly one room (association, 1). A room can have many bookings over time, but Room does not need to know them (one-way arrow keeps Room simple).', edges: [['Booking', 'Room', '→ 1']], rows: [['Booking', '- id, - guest, - status: BookingStatus', '+ blocks(room, range): boolean, + cancel(), + total(): long'], ['Room', '- number, - type: RoomType, - nightlyRate', '']] },
          { narr: 'Booking <b>has a</b> DateRange value (composition of a value, 1) and a status enum. DateRange owns the overlap rule: the information expert for dates.', nodes: [bx('DateRange', 'DateRange', 80, 52), bx('Status', 'BookingStatus', 50, 52)], edges: [['Booking', 'DateRange', '◆ 1'], ['Booking', 'Status', '1']], tags: { DateRange: '«record»', Status: '«enum»' }, rows: [['DateRange «record»', '- checkIn, - checkOut', '+ overlaps(other), + nights()']] },
          { narr: '<b>Step 4, variation point.</b> "Later we may add seasonal pricing" → put pricing behind an <b>interface</b> now. Hotel <b>uses</b> it to price a booking.', nodes: [bx('Pricing', 'PricingPolicy', 20, 52)], edges: [['Hotel', 'Pricing', 'uses']], tags: { Pricing: '«interface»' }, rows: [['PricingPolicy «interface»', '', '+ price(room, range): long']] }
        ]));
        f = f.concat(seq('Step 5: sequence for book()', ['Guest', 'Hotel', 'Booking', 'DateRange'], [
          { f: 'Guest', t: 'Hotel', m: 'book(type, range)', narr: '<b>Step 5, sequence.</b> The guest calls <code>Hotel.book</code>. Hotel coordinates.' },
          { f: 'Hotel', t: 'Booking', m: 'blocks(room, range)', narr: 'For each candidate room, Hotel asks every existing booking "do you block this room for these dates?" Booking knows its own room and status.' },
          { f: 'Booking', t: 'DateRange', m: 'overlaps(range)', narr: 'Booking delegates the date maths to DateRange.overlaps: the classic rule <code>a.start &lt; b.end AND b.start &lt; a.end</code> (check-out day is free for the next guest).' },
          { f: 'Booking', t: 'Hotel', m: 'false', ret: true, narr: 'No overlap → the room is free.' },
          { f: 'Hotel', t: 'Hotel', m: 'new Booking', narr: 'Hotel creates the Booking (Creator rule: Hotel contains bookings) and stores it. This check-then-create must be <b>atomic</b> (synchronized) or two guests could grab the same room.' },
          { f: 'Hotel', t: 'Guest', m: 'booking id', ret: true, narr: 'Return the booking. The failure branch (alt: no free room) returns <code>Optional.empty()</code>.' }
        ], { intro: 'Now prove the diagram works by walking the main use case. Four lifelines are enough.', outro: 'Every arrow landed on a method that exists in the class diagram. Only now do we write the code (step 6, see the code tab above).' }));
        f.push({ narr: '<b>Step 7, extensions.</b> Each future requirement should land in <b>one</b> new class. That is the proof of a good model.', parts: [{ type: 'table', label: 'Late twists and where they land', columns: ['New requirement', 'Change'], rows: [['seasonal pricing', 'new SeasonalPricing implements PricingPolicy'], ['multiple hotels', 'new Chain ◆ Hotel; nothing inside Hotel changes'], ['payments', 'Booking ..> PaymentMethod interface'], ['guest profiles', 'promote guest from String to Guest class']], hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Enum or class hierarchy for "room types"?', html: `<p>If room types differ only in <b>data</b> (name, capacity, base rate), an <code>enum</code> with fields is perfect and adding a type is one line. If types differ in <b>behaviour</b> (a Suite includes breakfast and has a custom cancellation rule), move to an interface/abstract class with subclasses, or keep the enum and inject behaviour via a policy. Decide by asking: "does the new type need new <i>code</i> or just new <i>numbers</i>?"</p>`, code: { lang: 'java', code: `
enum RoomKind {
    SINGLE(1, 2500_00), DOUBLE(2, 4000_00), SUITE(4, 9000_00);
    final int capacity;
    final long baseRatePaise;
    RoomKind(int capacity, long baseRatePaise) { this.capacity = capacity; this.baseRatePaise = baseRatePaise; }
    boolean fits(int guests) { return guests <= capacity; }      // behaviour on the enum is fine too
}`,
alt: [
  { lang: 'python', code: `
from enum import Enum


class RoomKind(Enum):
    SINGLE = (1, 250000)
    DOUBLE = (2, 400000)
    SUITE = (4, 900000)

    def __init__(self, capacity: int, base_rate_paise: int) -> None:
        self.capacity = capacity
        self.base_rate_paise = base_rate_paise

    def fits(self, guests: int) -> bool:  # behaviour on the enum is fine too
        return guests <= self.capacity` },
  { lang: 'ts', code: `
interface RoomKindInfo {
  readonly capacity: number;
  readonly baseRatePaise: number;
}
const ROOM_KINDS = {
  SINGLE: { capacity: 1, baseRatePaise: 250000 },
  DOUBLE: { capacity: 2, baseRatePaise: 400000 },
  SUITE: { capacity: 4, baseRatePaise: 900000 },
} as const satisfies Record<string, RoomKindInfo>;
type RoomKind = keyof typeof ROOM_KINDS;

const fits = (kind: RoomKind, guests: number): boolean => guests <= ROOM_KINDS[kind].capacity; // behaviour beside the data` },
  { lang: 'cpp', code: `
enum class RoomKind { Single, Double, Suite };

struct RoomKindInfo {
    int capacity;
    long long baseRatePaise;
};

constexpr RoomKindInfo info(RoomKind k) {
    switch (k) {
        case RoomKind::Single: return {1, 250000};
        case RoomKind::Double: return {2, 400000};
        default: return {4, 900000};
    }
}

constexpr bool fits(RoomKind k, int guests) { return guests <= info(k).capacity; }  // behaviour beside the data` }
] } },
      { title: 'Making the late twist cheap: pricing as an interface', html: `<p>The interviewer adds: "weekends cost 25% more". With <code>PricingPolicy</code> already in the diagram, you add one class and pass it to the Hotel constructor. Nothing else changes, and the old flat pricing still works for tests.</p>
${H.table(['Stay', 'Flat', 'Weekend +25%'], [['Fri→Sun (2 nights)', '8000', '10000'], ['Mon→Wed (2 nights)', '8000', '8000']])}`, code: { lang: 'java', code: `
interface PricingPolicy { long price(long nightlyPaise, LocalDate checkIn, LocalDate checkOut); }

class FlatPricing implements PricingPolicy {
    public long price(long nightly, LocalDate in, LocalDate out) {
        return nightly * java.time.temporal.ChronoUnit.DAYS.between(in, out);
    }
}

class WeekendPricing implements PricingPolicy {
    public long price(long nightly, LocalDate in, LocalDate out) {
        long total = 0;
        for (LocalDate d = in; d.isBefore(out); d = d.plusDays(1)) {
            boolean weekend = d.getDayOfWeek() == DayOfWeek.FRIDAY || d.getDayOfWeek() == DayOfWeek.SATURDAY;
            total += weekend ? nightly * 125 / 100 : nightly;
        }
        return total;
    }
}`,
alt: [
  { lang: 'python', code: `
from datetime import date, timedelta
from typing import Protocol


class PricingPolicy(Protocol):
    def price(self, nightly_paise: int, check_in: date, check_out: date) -> int: ...


class FlatPricing:
    def price(self, nightly: int, check_in: date, check_out: date) -> int:
        return nightly * (check_out - check_in).days


class WeekendPricing:
    def price(self, nightly: int, check_in: date, check_out: date) -> int:
        total = 0
        d = check_in
        while d < check_out:
            weekend = d.weekday() in (4, 5)  # Friday, Saturday
            total += nightly * 125 // 100 if weekend else nightly
            d += timedelta(days=1)
        return total` },
  { lang: 'ts', code: `
interface PricingPolicy {
  price(nightlyPaise: number, checkIn: Date, checkOut: Date): number;
}

const DAY_MS = 86_400_000;

class FlatPricing implements PricingPolicy {
  price(nightly: number, checkIn: Date, checkOut: Date): number {
    return nightly * Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
  }
}

class WeekendPricing implements PricingPolicy {
  price(nightly: number, checkIn: Date, checkOut: Date): number {
    let total = 0;
    for (let t = checkIn.getTime(); t < checkOut.getTime(); t += DAY_MS) {
      const day = new Date(t).getUTCDay(); // 0 = Sunday
      const weekend = day === 5 || day === 6; // Friday, Saturday
      total += weekend ? Math.floor((nightly * 125) / 100) : nightly;
    }
    return total;
  }
}` },
  { lang: 'cpp', code: `
class PricingPolicy {
public:
    virtual ~PricingPolicy() = default;
    virtual long long price(long long nightlyPaise, chrono::sys_days checkIn, chrono::sys_days checkOut) const = 0;
};

class FlatPricing : public PricingPolicy {
public:
    long long price(long long nightly, chrono::sys_days in, chrono::sys_days out) const override {
        return nightly * (out - in).count();
    }
};

class WeekendPricing : public PricingPolicy {
public:
    long long price(long long nightly, chrono::sys_days in, chrono::sys_days out) const override {
        long long total = 0;
        for (auto d = in; d < out; d += chrono::days(1)) {
            chrono::weekday wd{d};
            bool weekend = wd == chrono::Friday || wd == chrono::Saturday;
            total += weekend ? nightly * 125 / 100 : nightly;
        }
        return total;
    }
};` }
] } },
      { title: 'What interviewers actually grade', html: `${H.table(['Signal', 'Weak', 'Strong'], [['Requirements', 'starts coding immediately', 'asks 3–5 scoping questions, writes them down'], ['Entities', 'one class per noun, or one god class', 'filters nouns with reasons; enums and values'], ['Relationships', 'fields everywhere, no reasoning', 'explains ownership and multiplicity'], ['Code', 'does not compile / no demo', 'compiles, small methods, a main() that runs'], ['Extensibility', '"we can add an if"', 'points to the interface where change lands'], ['Communication', 'silent typing', 'narrates trade-offs and time budget']])}` }
    ],
    deepDive: `<p><b>Design for the change you were told about, not every change imaginable.</b> The requirement said "seasonal pricing later", so pricing gets an interface. It did not mention multiple currencies, so Money stays simple. Over-engineering (interfaces for everything, factories of factories) is penalised as much as under-engineering. Name this trade-off explicitly: <i>YAGNI with a hook where change was announced</i>.</p>
<p><b>Entities need identity rules.</b> Decide how two Booking objects are compared: by id (entity) not by fields. Generate ids in one place (a counter in the coordinator, or <code>UUID</code>). Value objects (DateRange) compare by value and are immutable, so they can be shared freely and used as map keys.</p>
<p><b>Where do "repositories" go?</b> In interviews keep them as in-memory <code>Map</code>s inside the coordinator or as tiny <code>XRepository</code> classes with <code>save/findById</code>. Mention that a real system would put an interface in front so a database implementation can be swapped in (Dependency Inversion, next module).</p>
<p><b>Error handling contract.</b> Pick one style per layer: exceptions for programmer errors and broken invariants (Java <code>IllegalArgumentException</code> / <code>IllegalStateException</code>, Python <code>ValueError</code> / <code>RuntimeError</code>, C++ <code>std::invalid_argument</code> / <code>std::logic_error</code>, TypeScript <code>Error</code>), an optional or result objects for expected business outcomes ("no room available"). Mixing both randomly is a smell interviewers notice.</p>
<p><b>Concurrency hook.</b> Check-then-act on shared state (is the room free? then book) is a race. Even in a single-threaded interview solution, take a lock (<code>synchronized</code>, <code>threading.Lock</code>, <code>std::mutex</code>; JavaScript is single-threaded, so check-then-act is atomic there unless it awaits) or say where a lock/DB constraint would go (unique index on room+night, optimistic version column). The Concurrency in LLD module goes deep.</p>
<p><b>Testability falls out of good modelling.</b> If every collaborator comes in through a constructor and every rule lives in a small class, you can unit-test <code>DateRange.overlaps</code> with 6 cases in a minute. The overlap boundary (check-out day equals next check-in day is <i>not</i> an overlap) is exactly the kind of edge case to state aloud.</p>
<p><b>Package structure</b> once it grows: <code>domain</code> (entities, values, enums, interfaces), <code>service</code> (use cases), <code>infra</code> (repositories, gateways). Dependencies point inwards to the domain.</p>`,
    aiEra: `<p><b>What AI changes:</b> in 2026 many machine-coding rounds allow an AI assistant, and real teams scaffold features with agents. The bottleneck moved from typing to <b>specifying and reviewing</b>: a crisp class diagram and sequence is now the best prompt you can give, and the best yardstick for judging what comes back.</p>
<p><b>Use AI as a partner:</b> write your scope list, entity verdicts and diagram first, then prompt <code>Generate classes in Java 21 (or Python 3.12, TypeScript 5, C++20) exactly matching this diagram: immutable value types for values, enums for statuses, no public setters, constructor validation, a main() demo. Do not add classes I did not list.</code> Then ask <code>Write JUnit tests for DateRange.overlaps including the boundary where checkOut equals the next checkIn.</code></p>
<p><b>Where AI goes wrong:</b> it adds speculative layers (DTOs, mappers, factories), silently changes multiplicities, uses <code>double</code> for money, ignores the double-booking race, and produces code that compiles but places rules in a fat service. It may also "helpfully" implement features you scoped out.</p>
<p><b>What you must still own:</b> the scope negotiation, the model (entities, ownership, multiplicities, variation points), the race condition call-out, and the review of generated code against your diagram. Interviewers increasingly ask you to critique a generated design, so practise reading code back into a diagram and spotting where it drifted.</p>`,
    problems: [{
      title: 'End-to-End Design: Meeting Room Booking System',
      level: 'Hard', tags: ['end-to-end', 'class diagram', 'sequence diagram', 'value object', 'interface'], companies: ['Microsoft', 'Google', 'Atlassian', 'Salesforce'],
      statement: `<p>An office has meeting rooms with a <b>capacity</b> and <b>equipment</b> (projector, whiteboard, video-conf). Employees book a room for a <b>time slot</b> on a day for N attendees, optionally requiring equipment. No two bookings may overlap in the same room. The system should <b>suggest the smallest room</b> that fits and is free. Bookings can be cancelled by their organiser only. Later the company wants different <b>room-selection strategies</b> (closest floor, least used). Produce: scope list, entities with verdicts, class diagram (as text), the sequence for <code>book()</code>, and compilable code.</p>`,
      constraints: `<ul><li>Slots are [start, end) with minute precision on one day; end &gt; start.</li><li>Capacity ≥ attendees; required equipment ⊆ room equipment.</li><li>Only the organiser can cancel. Selection strategy must be pluggable.</li></ul>`,
      example: `<p>Rooms: <b>Ganga</b> (4 seats, whiteboard), <b>Yamuna</b> (8 seats, projector + whiteboard), <b>Kaveri</b> (12 seats, all equipment).</p>
${H.table(['request', 'result', 'why'], [['Asha, 10:00–11:00, 3 people', H.c('g', 'Ganga'), 'smallest that fits'], ['Ravi, 10:30–11:30, 3 people', H.c('g', 'Yamuna'), 'Ganga overlaps 10:30–11:00'], ['Mia, 11:00–12:00, 3 people, projector', H.c('y', 'Kaveri'), 'Ganga has no projector; Yamuna busy until 11:30'], ['Ravi cancels Asha\'s booking', H.c('r', 'rejected'), 'not the organiser']])}
<p>Note row 3: Ganga is <i>free</i> at 11:00 (Asha's [10:00, 11:00) ends exactly then, half-open intervals) but lacks a projector, and Yamuna's [10:30, 11:30) overlaps, so the smallest fitting free room is ${H.c('y', 'Kaveri')}. Getting these boundaries right is part of the problem.</p>`,
      brute: {
        why: `<p>The god-class approach: <code>OfficeManager</code> with <code>Map&lt;String, List&lt;int[]&gt;&gt; roomSlots</code>, capacities in another map, equipment as comma-separated strings, and a <code>book</code> method with nested loops and string <code>contains</code> checks. "Smallest room" is a hard-coded sort inside book(). Switching to "closest floor" means editing the core method; cancellation has no idea who the organiser was because bookings are just int arrays. It has no seams to test or extend.</p>`,
        code: { lang: 'java', code: `
class OfficeManager {
    Map<String, Integer> capacity = new HashMap<>();
    Map<String, String> equipment = new HashMap<>();       // "projector,whiteboard"
    Map<String, List<int[]>> slots = new HashMap<>();      // room -> [start, end] minutes
    String book(int start, int end, int people, String needs) {
        List<String> rooms = new ArrayList<>(capacity.keySet());
        rooms.sort(Comparator.comparing(capacity::get));     // strategy hard-coded
        for (String r : rooms) {
            if (capacity.get(r) < people) continue;
            if (!needs.isEmpty() && !equipment.get(r).contains(needs)) continue;
            boolean free = true;
            for (int[] s : slots.getOrDefault(r, List.of())) if (start < s[1] && s[0] < end) free = false;
            if (free) { slots.computeIfAbsent(r, k -> new ArrayList<>()).add(new int[]{start, end}); return r; }
        }
        return null;                                         // who booked it? unknown, so no safe cancel
    }
}`, alt: [
                { lang: 'python', code: `
class OfficeManager:
    def __init__(self):
        self.capacity = {}
        self.equipment = {}       # "projector,whiteboard"
        self.slots = {}           # room -> [start, end] minutes

    def book(self, start, end, people, needs):
        rooms = sorted(self.capacity, key=lambda r: self.capacity[r])   # strategy hard-coded
        for r in rooms:
            if self.capacity[r] < people: continue
            if needs and needs not in self.equipment[r]: continue
            free = True
            for s in self.slots.get(r, []):
                if start < s[1] and s[0] < end: free = False
            if free:
                self.slots.setdefault(r, []).append([start, end]); return r
        return None                                          # who booked it? unknown, so no safe cancel` },
                { lang: 'ts', code: `
class OfficeManager {
    capacity = new Map<string, number>();
    equipment = new Map<string, string>();       // "projector,whiteboard"
    slots = new Map<string, number[][]>();       // room -> [start, end] minutes
    book(start: number, end: number, people: number, needs: string): string | null {
        const rooms = [...this.capacity.keys()].sort((a, b) => this.capacity.get(a)! - this.capacity.get(b)!);  // strategy hard-coded
        for (const r of rooms) {
            if (this.capacity.get(r)! < people) continue;
            if (needs !== "" && !this.equipment.get(r)!.includes(needs)) continue;
            let free = true;
            for (const s of this.slots.get(r) ?? []) if (start < s[1] && s[0] < end) free = false;
            if (free) {
                if (!this.slots.has(r)) this.slots.set(r, []);
                this.slots.get(r)!.push([start, end]); return r;
            }
        }
        return null;                                         // who booked it? unknown, so no safe cancel
    }
}` },
                { lang: 'cpp', code: `
class OfficeManager {
    unordered_map<string, int> capacity;
    unordered_map<string, string> equipment;                  // "projector,whiteboard"
    unordered_map<string, vector<pair<int, int>>> slots;      // room -> [start, end] minutes
public:
    string book(int start, int end, int people, const string& needs) {
        vector<string> rooms;
        for (auto& [r, c] : capacity) rooms.push_back(r);
        sort(rooms.begin(), rooms.end(), [&](const string& a, const string& b) { return capacity[a] < capacity[b]; });  // strategy hard-coded
        for (auto& r : rooms) {
            if (capacity[r] < people) continue;
            if (!needs.empty() && equipment[r].find(needs) == string::npos) continue;
            bool free = true;
            for (auto& s : slots[r]) if (start < s.second && s.first < end) free = false;
            if (free) { slots[r].push_back({start, end}); return r; }
        }
        return "";                                           // who booked it? unknown, so no safe cancel
    }
};` }
              ] }
      },
      mcq: { q: 'The company will later want "closest floor" or "least used" room selection. What should the design include now?', options: ['A big if/else on a strategy name inside book()', 'A RoomSelectionStrategy interface injected into the booking service, with SmallestFitStrategy as the first implementation', 'A subclass of the service for each strategy', 'Nothing; YAGNI'], answer: 1, explain: 'The change was announced, so add a seam exactly there. An interface with one implementation today costs almost nothing and turns the future change into one new class.' },
      hints: [
        `<p>Hint 1: entities: Room (name, capacity, Set&lt;Equipment&gt;, floor), Booking (id, organiser, room, TimeSlot, attendees), Employee or just organiser id; value object <code>TimeSlot</code> with <code>overlaps</code>; enum <code>Equipment</code>.</p>`,
        `<p>Hint 2: the service filters <b>candidate rooms</b> (capacity, equipment, free in that slot) and hands the candidates to <code>RoomSelectionStrategy.choose(candidates)</code>. SmallestFit = min by capacity.</p>`,
        `<p>Hint 3: TimeSlot overlap for half-open intervals: <code>a.start &lt; b.end &amp;&amp; b.start &lt; a.end</code>. Cancel checks <code>booking.organiser().equals(requester)</code>. Make book() atomic with a lock (check-then-act). Return an optional or empty result for "no room".</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "Ganga\nYamuna\nKaveri\nfalse\ntrue\nGanga\nfalse\n" }] },
      solution: {
        approach: `<p><b>Scope:</b> one office, one day granularity, book/cancel/suggest, pluggable selection. <b>Entities:</b> Room, Booking (entities), TimeSlot (record), Equipment (enum), organiser as an employee id string. <b>Diagram:</b> <code>BookingService ◆— 0..* Booking</code>, <code>BookingService o— 1..* Room</code> (rooms exist independently of the service), <code>Booking → 1 Room</code>, <code>Booking ◆ 1 TimeSlot</code>, <code>Room → 0..* Equipment</code>, <code>BookingService → 1 «interface» RoomSelectionStrategy</code> ◁·· SmallestFitStrategy, LeastUsedStrategy. <b>Sequence book():</b> Employee → BookingService.book → for each Room: room.fits(people, needs) → isFree(room, slot) asks each Booking.conflicts(room, slot) → TimeSlot.overlaps → strategy.choose(candidates) → «create» Booking → return. Overlap uses half-open intervals so back-to-back meetings are allowed.</p>`,
        code: `
import java.time.*;

enum Equipment { PROJECTOR, WHITEBOARD, VIDEO_CONF }

record TimeSlot(LocalTime start, LocalTime end) {
    TimeSlot { if (!end.isAfter(start)) throw new IllegalArgumentException("end must be after start"); }
    boolean overlaps(TimeSlot o) { return start.isBefore(o.end) && o.start.isBefore(end); }   // [start, end)
}

class Room {
    private final String name;
    private final int capacity, floor;
    private final Set<Equipment> equipment;
    Room(String name, int capacity, int floor, Set<Equipment> equipment) {
        this.name = name; this.capacity = capacity; this.floor = floor; this.equipment = Set.copyOf(equipment);
    }
    boolean fits(int people, Set<Equipment> needs) { return capacity >= people && equipment.containsAll(needs); }
    int capacity() { return capacity; }
    String name() { return name; }
}

class Booking {
    private final String id, organiser;
    private final Room room;
    private final TimeSlot slot;
    private boolean cancelled;
    Booking(String id, String organiser, Room room, TimeSlot slot) { this.id = id; this.organiser = organiser; this.room = room; this.slot = slot; }
    boolean conflicts(Room r, TimeSlot s) { return !cancelled && room == r && slot.overlaps(s); }
    boolean cancelBy(String who) { if (!organiser.equals(who)) return false; cancelled = true; return true; }
    Room room() { return room; }
    String id() { return id; }
}

interface RoomSelectionStrategy { Optional<Room> choose(List<Room> candidates); }

class SmallestFitStrategy implements RoomSelectionStrategy {
    public Optional<Room> choose(List<Room> c) { return c.stream().min(Comparator.comparingInt(Room::capacity)); }
}

class BookingService {
    private final List<Room> rooms;                                   // aggregation: rooms passed in
    private final Map<String, Booking> bookings = new LinkedHashMap<>();   // composition
    private final RoomSelectionStrategy strategy;                     // the variation point
    private int seq = 1;
    BookingService(List<Room> rooms, RoomSelectionStrategy strategy) { this.rooms = List.copyOf(rooms); this.strategy = strategy; }

    private boolean isFree(Room r, TimeSlot s) { return bookings.values().stream().noneMatch(b -> b.conflicts(r, s)); }

    synchronized Optional<Booking> book(String organiser, TimeSlot slot, int people, Set<Equipment> needs) {
        List<Room> candidates = new ArrayList<>();
        for (Room r : rooms) if (r.fits(people, needs) && isFree(r, slot)) candidates.add(r);
        Optional<Room> chosen = strategy.choose(candidates);
        if (chosen.isEmpty()) return Optional.empty();                   // alt: no room
        Booking b = new Booking("MB" + (seq++), organiser, chosen.get(), slot);
        bookings.put(b.id(), b);
        return Optional.of(b);
    }

    boolean cancel(String bookingId, String requester) {
        Booking b = bookings.get(bookingId);
        return b != null && b.cancelBy(requester);
    }

    public static void main(String[] args) {
        List<Room> rooms = List.of(
            new Room("Ganga", 4, 1, Set.of(Equipment.WHITEBOARD)),
            new Room("Yamuna", 8, 2, Set.of(Equipment.PROJECTOR, Equipment.WHITEBOARD)),
            new Room("Kaveri", 12, 3, EnumSet.allOf(Equipment.class)));
        BookingService svc = new BookingService(rooms, new SmallestFitStrategy());
        TimeSlot t1 = new TimeSlot(LocalTime.of(10, 0), LocalTime.of(11, 0));
        TimeSlot t2 = new TimeSlot(LocalTime.of(10, 30), LocalTime.of(11, 30));
        TimeSlot t3 = new TimeSlot(LocalTime.of(11, 0), LocalTime.of(12, 0));
        Booking a = svc.book("asha", t1, 3, Set.of()).orElseThrow();
        System.out.println(a.room().name());                                              // Ganga
        System.out.println(svc.book("ravi", t2, 3, Set.of()).orElseThrow().room().name()); // Yamuna
        System.out.println(svc.book("mia", t3, 3, Set.of(Equipment.PROJECTOR)).orElseThrow().room().name()); // Kaveri
        System.out.println(svc.cancel(a.id(), "ravi"));                                   // false: not the organiser
        System.out.println(svc.cancel(a.id(), "asha"));                                   // true
        System.out.println(svc.book("kiran", t1, 3, Set.of()).orElseThrow().room().name()); // Ganga is free again
        System.out.println(svc.book("zed", t1, 13, Set.of()).isPresent());                // false: no room holds 13
    }
}`,
        alt: [
          { lang: 'python', code: `
import threading
from dataclasses import dataclass
from datetime import time
from enum import Enum
from typing import Protocol


class Equipment(Enum):
    PROJECTOR = 1
    WHITEBOARD = 2
    VIDEO_CONF = 3


@dataclass(frozen=True)
class TimeSlot:
    start: time
    end: time

    def __post_init__(self) -> None:
        if not self.end > self.start:
            raise ValueError("end must be after start")

    def overlaps(self, o: "TimeSlot") -> bool:  # [start, end)
        return self.start < o.end and o.start < self.end


class Room:
    def __init__(self, name: str, capacity: int, floor: int, equipment: set[Equipment]) -> None:
        self.name = name
        self.capacity = capacity
        self.floor = floor
        self._equipment = frozenset(equipment)

    def fits(self, people: int, needs: set[Equipment]) -> bool:
        return self.capacity >= people and self._equipment.issuperset(needs)


class Booking:
    def __init__(self, booking_id: str, organiser: str, room: Room, slot: TimeSlot) -> None:
        self.id = booking_id
        self._organiser = organiser
        self.room = room
        self._slot = slot
        self._cancelled = False

    def conflicts(self, room: Room, slot: TimeSlot) -> bool:
        return not self._cancelled and self.room is room and self._slot.overlaps(slot)

    def cancel_by(self, who: str) -> bool:
        if self._organiser != who:
            return False
        self._cancelled = True
        return True


class RoomSelectionStrategy(Protocol):
    def choose(self, candidates: list[Room]) -> Room | None: ...


class SmallestFitStrategy:
    def choose(self, candidates: list[Room]) -> Room | None:
        return min(candidates, key=lambda r: r.capacity, default=None)


class BookingService:
    def __init__(self, rooms: list[Room], strategy: RoomSelectionStrategy) -> None:
        self._rooms = list(rooms)  # aggregation: rooms passed in
        self._bookings: dict[str, Booking] = {}  # composition
        self._strategy = strategy  # the variation point
        self._seq = 1
        self._lock = threading.Lock()

    def _is_free(self, room: Room, slot: TimeSlot) -> bool:
        return not any(b.conflicts(room, slot) for b in self._bookings.values())

    def book(self, organiser: str, slot: TimeSlot, people: int, needs: set[Equipment]) -> Booking | None:
        with self._lock:
            candidates = [r for r in self._rooms if r.fits(people, needs) and self._is_free(r, slot)]
            chosen = self._strategy.choose(candidates)
            if chosen is None:
                return None  # alt: no room
            b = Booking(f"MB{self._seq}", organiser, chosen, slot)
            self._seq += 1
            self._bookings[b.id] = b
            return b

    def cancel(self, booking_id: str, requester: str) -> bool:
        b = self._bookings.get(booking_id)
        return b is not None and b.cancel_by(requester)


def main() -> None:
    rooms = [
        Room("Ganga", 4, 1, {Equipment.WHITEBOARD}),
        Room("Yamuna", 8, 2, {Equipment.PROJECTOR, Equipment.WHITEBOARD}),
        Room("Kaveri", 12, 3, set(Equipment)),
    ]
    svc = BookingService(rooms, SmallestFitStrategy())
    t1 = TimeSlot(time(10, 0), time(11, 0))
    t2 = TimeSlot(time(10, 30), time(11, 30))
    t3 = TimeSlot(time(11, 0), time(12, 0))
    a = svc.book("asha", t1, 3, set())
    print(a.room.name)  # Ganga
    print(svc.book("ravi", t2, 3, set()).room.name)  # Yamuna
    print(svc.book("mia", t3, 3, {Equipment.PROJECTOR}).room.name)  # Kaveri
    print(str(svc.cancel(a.id, "ravi")).lower())  # false: not the organiser
    print(str(svc.cancel(a.id, "asha")).lower())  # true
    print(svc.book("kiran", t1, 3, set()).room.name)  # Ganga is free again
    print(str(svc.book("zed", t1, 13, set()) is not None).lower())  # false: no room holds 13


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `
enum Equipment { Projector, Whiteboard, VideoConf }

class LocalTime {
  private constructor(private readonly minutes: number) {}
  static of(hour: number, minute: number): LocalTime { return new LocalTime(hour * 60 + minute); }
  isBefore(o: LocalTime): boolean { return this.minutes < o.minutes; }
  isAfter(o: LocalTime): boolean { return this.minutes > o.minutes; }
}

class TimeSlot {
  constructor(readonly start: LocalTime, readonly end: LocalTime) {
    if (!end.isAfter(start)) throw new Error("end must be after start");
  }
  overlaps(o: TimeSlot): boolean { // [start, end)
    return this.start.isBefore(o.end) && o.start.isBefore(this.end);
  }
}

class Room {
  private readonly equipment: ReadonlySet<Equipment>;
  constructor(
    private readonly roomName: string,
    private readonly cap: number,
    readonly floor: number,
    equipment: Iterable<Equipment>,
  ) {
    this.equipment = new Set(equipment);
  }
  fits(people: number, needs: ReadonlySet<Equipment>): boolean {
    return this.cap >= people && [...needs].every((e) => this.equipment.has(e));
  }
  capacity(): number { return this.cap; }
  name(): string { return this.roomName; }
}

class Booking {
  private cancelled = false;
  constructor(
    private readonly bookingId: string,
    private readonly organiser: string,
    private readonly bookedRoom: Room,
    private readonly slot: TimeSlot,
  ) {}
  conflicts(r: Room, s: TimeSlot): boolean {
    return !this.cancelled && this.bookedRoom === r && this.slot.overlaps(s);
  }
  cancelBy(who: string): boolean {
    if (this.organiser !== who) return false;
    this.cancelled = true;
    return true;
  }
  room(): Room { return this.bookedRoom; }
  id(): string { return this.bookingId; }
}

interface RoomSelectionStrategy {
  choose(candidates: Room[]): Room | undefined;
}

class SmallestFitStrategy implements RoomSelectionStrategy {
  choose(c: Room[]): Room | undefined {
    return c.reduce<Room | undefined>((best, r) => (!best || r.capacity() < best.capacity() ? r : best), undefined);
  }
}

class BookingService {
  private readonly rooms: readonly Room[]; // aggregation: rooms passed in
  private readonly bookings = new Map<string, Booking>(); // composition
  private seq = 1;
  constructor(rooms: Room[], private readonly strategy: RoomSelectionStrategy) { // the variation point
    this.rooms = [...rooms];
  }

  private isFree(r: Room, s: TimeSlot): boolean {
    return ![...this.bookings.values()].some((b) => b.conflicts(r, s));
  }

  book(organiser: string, slot: TimeSlot, people: number, needs: ReadonlySet<Equipment>): Booking | undefined {
    const candidates = this.rooms.filter((r) => r.fits(people, needs) && this.isFree(r, slot));
    const chosen = this.strategy.choose(candidates);
    if (!chosen) return undefined; // alt: no room
    const b = new Booking("MB" + this.seq++, organiser, chosen, slot);
    this.bookings.set(b.id(), b);
    return b;
  }

  cancel(bookingId: string, requester: string): boolean {
    const b = this.bookings.get(bookingId);
    return b !== undefined && b.cancelBy(requester);
  }
}

function main(): void {
  const rooms = [
    new Room("Ganga", 4, 1, [Equipment.Whiteboard]),
    new Room("Yamuna", 8, 2, [Equipment.Projector, Equipment.Whiteboard]),
    new Room("Kaveri", 12, 3, [Equipment.Projector, Equipment.Whiteboard, Equipment.VideoConf]),
  ];
  const svc = new BookingService(rooms, new SmallestFitStrategy());
  const t1 = new TimeSlot(LocalTime.of(10, 0), LocalTime.of(11, 0));
  const t2 = new TimeSlot(LocalTime.of(10, 30), LocalTime.of(11, 30));
  const t3 = new TimeSlot(LocalTime.of(11, 0), LocalTime.of(12, 0));
  const none = new Set<Equipment>();
  const a = svc.book("asha", t1, 3, none)!;
  console.log(a.room().name()); // Ganga
  console.log(svc.book("ravi", t2, 3, none)!.room().name()); // Yamuna
  console.log(svc.book("mia", t3, 3, new Set([Equipment.Projector]))!.room().name()); // Kaveri
  console.log(svc.cancel(a.id(), "ravi")); // false: not the organiser
  console.log(svc.cancel(a.id(), "asha")); // true
  console.log(svc.book("kiran", t1, 3, none)!.room().name()); // Ganga is free again
  console.log(svc.book("zed", t1, 13, none) !== undefined); // false: no room holds 13
}
main();` },
          { lang: 'cpp', code: `
enum class Equipment { Projector, Whiteboard, VideoConf };

struct LocalTime {
    int minutes;
    static LocalTime of(int hour, int minute) { return {hour * 60 + minute}; }
    auto operator<=>(const LocalTime&) const = default;
};

class TimeSlot {
public:
    TimeSlot(LocalTime start, LocalTime end) : start_(start), end_(end) {
        if (!(end > start)) throw invalid_argument("end must be after start");
    }
    bool overlaps(const TimeSlot& o) const { return start_ < o.end_ && o.start_ < end_; }  // [start, end)
private:
    LocalTime start_, end_;
};

class Room {
public:
    Room(string name, int capacity, int floor, set<Equipment> equipment)
        : name_(std::move(name)), capacity_(capacity), floor_(floor), equipment_(std::move(equipment)) {}
    bool fits(int people, const set<Equipment>& needs) const {
        return capacity_ >= people && includes(equipment_.begin(), equipment_.end(), needs.begin(), needs.end());
    }
    int capacity() const { return capacity_; }
    const string& name() const { return name_; }
private:
    string name_;
    int capacity_, floor_;
    set<Equipment> equipment_;
};

class Booking {
public:
    Booking(string id, string organiser, const Room* room, TimeSlot slot)
        : id_(std::move(id)), organiser_(std::move(organiser)), room_(room), slot_(slot) {}
    bool conflicts(const Room* r, const TimeSlot& s) const { return !cancelled_ && room_ == r && slot_.overlaps(s); }
    bool cancelBy(const string& who) {
        if (organiser_ != who) return false;
        cancelled_ = true;
        return true;
    }
    const Room& room() const { return *room_; }
    const string& id() const { return id_; }
private:
    string id_, organiser_;
    const Room* room_;  // non-owning: the service owns the rooms
    TimeSlot slot_;
    bool cancelled_ = false;
};

class RoomSelectionStrategy {
public:
    virtual ~RoomSelectionStrategy() = default;
    virtual const Room* choose(const vector<const Room*>& candidates) const = 0;  // nullptr when empty
};

class SmallestFitStrategy : public RoomSelectionStrategy {
public:
    const Room* choose(const vector<const Room*>& c) const override {
        auto it = min_element(c.begin(), c.end(), [](const Room* a, const Room* b) { return a->capacity() < b->capacity(); });
        return it == c.end() ? nullptr : *it;
    }
};

class BookingService {
public:
    BookingService(vector<Room> rooms, unique_ptr<RoomSelectionStrategy> strategy)
        : rooms_(std::move(rooms)), strategy_(std::move(strategy)) {}

    Booking* book(const string& organiser, const TimeSlot& slot, int people, const set<Equipment>& needs) {
        lock_guard<mutex> guard(mu_);
        vector<const Room*> candidates;
        for (const Room& r : rooms_)
            if (r.fits(people, needs) && isFree(&r, slot)) candidates.push_back(&r);
        const Room* chosen = strategy_->choose(candidates);
        if (!chosen) return nullptr;  // alt: no room (Java: Optional.empty)
        string id = "MB" + to_string(seq_++);
        auto [it, ok] = bookings_.emplace(id, Booking(id, organiser, chosen, slot));
        return &it->second;
    }

    bool cancel(const string& bookingId, const string& requester) {
        auto it = bookings_.find(bookingId);
        return it != bookings_.end() && it->second.cancelBy(requester);
    }

private:
    bool isFree(const Room* r, const TimeSlot& s) const {
        return none_of(bookings_.begin(), bookings_.end(), [&](const auto& kv) { return kv.second.conflicts(r, s); });
    }
    vector<Room> rooms_;                    // never resized, so Room addresses stay valid
    map<string, Booking> bookings_;         // composition
    unique_ptr<RoomSelectionStrategy> strategy_;  // the variation point
    int seq_ = 1;
    mutex mu_;
};

int main() {
    vector<Room> rooms;
    rooms.emplace_back("Ganga", 4, 1, set<Equipment>{Equipment::Whiteboard});
    rooms.emplace_back("Yamuna", 8, 2, set<Equipment>{Equipment::Projector, Equipment::Whiteboard});
    rooms.emplace_back("Kaveri", 12, 3, set<Equipment>{Equipment::Projector, Equipment::Whiteboard, Equipment::VideoConf});
    BookingService svc(std::move(rooms), make_unique<SmallestFitStrategy>());
    TimeSlot t1(LocalTime::of(10, 0), LocalTime::of(11, 0));
    TimeSlot t2(LocalTime::of(10, 30), LocalTime::of(11, 30));
    TimeSlot t3(LocalTime::of(11, 0), LocalTime::of(12, 0));
    set<Equipment> none;
    Booking* a = svc.book("asha", t1, 3, none);
    cout << boolalpha;
    cout << a->room().name() << "\\n";                                                        // Ganga
    cout << svc.book("ravi", t2, 3, none)->room().name() << "\\n";                            // Yamuna
    cout << svc.book("mia", t3, 3, {Equipment::Projector})->room().name() << "\\n";           // Kaveri
    cout << svc.cancel(a->id(), "ravi") << "\\n";                                             // false: not the organiser
    cout << svc.cancel(a->id(), "asha") << "\\n";                                             // true
    cout << svc.book("kiran", t1, 3, none)->room().name() << "\\n";                           // Ganga is free again
    cout << (svc.book("zed", t1, 13, none) != nullptr) << "\\n";                              // false: no room holds 13
}` }
        ],
        complexity: `<p>book() is O(R × B) for R rooms and B bookings (fine for an office). At scale, index bookings per room in a <code>TreeMap&lt;LocalTime, Booking&gt;</code> and check only the floor/ceiling neighbours: O(R log B). Cancel is O(1) by id.</p>`,
        followUps: ['Add recurring meetings (every Monday 10:00). Which new class appears and how does overlap checking change?', 'Implement LeastUsedStrategy. What data does it need and who should own it?', 'Two people book the last room concurrently across two servers: what replaces the in-process lock?']
      }
    }]
  });

  /* =========================== PRACTICE: EASY =========================== */
  practice.push({
    title: 'Car, Engine, Wheels and Driver',
    level: 'Easy', tags: ['composition', 'association', 'multiplicity'], companies: ['TCS', 'Infosys', 'Amazon'],
    statement: `<p>Model a <b>Car</b> that is built with exactly one <b>Engine</b> and four <b>Wheels</b>. A <b>Driver</b> can be assigned to at most one car at a time, and a car has at most one driver. Starting the car starts its engine. Replacing a flat tyre swaps one wheel. Identify each relationship, its multiplicity, and write the classes.</p>`,
    constraints: `<ul><li>Engine and wheels are created with the car and never shared.</li><li>Wheel position 0–3.</li><li>Driver ↔ Car is 0..1 on both sides.</li></ul>`,
    example: `${H.table(['Pair', 'Relationship', 'Multiplicity'], [['Car–Engine', H.c('g', 'composition'), '1 → 1'], ['Car–Wheel', H.c('g', 'composition'), '1 → 4'], ['Driver–Car', H.c('b', 'association'), '0..1 ↔ 0..1']])}<p><code>car.start()</code> prints "engine on"; <code>driver.drive(car)</code> fails if the car already has another driver.</p>`,
    brute: {
      why: `<p>The naive version gives Car public fields <code>engine</code> and <code>wheels</code> that callers fill in, so two cars can end up sharing one Engine object (start one, the other "starts" too) and a car can be built with 3 wheels or none. Driver and Car are linked by two independent setters, so a car can point to Ravi while Ravi points to a different car.</p>`,
      code: { lang: 'java', code: `
class Engine { boolean on; }
class Car {
    public Engine engine;                 // set from outside: may be shared or null
    public List<String> wheels = new ArrayList<>();
    public String driverName;             // and Driver has its own carPlate: drift
}`, alt: [
              { lang: 'python', code: `
class Engine:
    def __init__(self): self.on = False

class Car:
    def __init__(self):
        self.engine = None                # set from outside: may be shared or None
        self.wheels = []
        self.driver_name = ""             # and Driver has its own car_plate: drift` },
              { lang: 'ts', code: `
class Engine { on = false; }
class Car {
    engine: Engine | null = null;         // set from outside: may be shared or null
    wheels: string[] = [];
    driverName = "";                      // and Driver has its own carPlate: drift
}` },
              { lang: 'cpp', code: `
struct Engine { bool on = false; };
struct Car {
    Engine* engine = nullptr;             // set from outside: may be shared or null
    vector<string> wheels;
    string driverName;                    // and Driver has its own carPlate: drift
};` }
            ] }
    },
    mcq: { q: 'Two cars must never share an engine, and the engine is scrapped with the car. Which shape fits?', options: ['Engine passed into the Car constructor from outside', 'private final Engine engine = new Engine(); created inside Car', 'public Engine engine; set later', 'static Engine shared by all cars'], answer: 1, explain: 'Composition: the whole creates and exclusively owns the part. Creating it inside and keeping it private guarantees no sharing.' },
    hints: [
      `<p>Hint 1: apply the life test. Can an engine exist in our system without its car? No → composition. Can a driver exist without a car? Yes → association.</p>`,
      `<p>Hint 2: create the engine and an array of 4 wheels inside the Car constructor. Expose behaviour (<code>start()</code>, <code>replaceWheel(pos)</code>) instead of the parts themselves.</p>`,
      `<p>Hint 3: keep the two-way Driver ↔ Car link consistent with one entry point, <code>driver.drive(car)</code>, that checks the car is free and sets both sides.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "true\nfalse\nKA-01-1234: engine on\ntrue\n" }] },
    solution: {
      approach: `<p><b>Car ◆ 1 Engine</b> and <b>Car ◆ 4 Wheel</b>: created in the constructor, private, never returned. <b>Driver 0..1 — 0..1 Car</b>: a two-way association updated only through <code>Driver.drive</code> / <code>Driver.leave</code>, which call hidden (package-private) hooks on Car. Behaviour goes on the whole: <code>car.start()</code> delegates to its engine (the caller never touches Engine).</p>`,
      code: `
class Engine {
    private boolean running;
    void start() { running = true; }
    boolean isRunning() { return running; }
}

class Wheel {
    private final int position;
    private int wearPercent;
    Wheel(int position) { this.position = position; }
    int position() { return position; }
}

class Car {
    private final String plate;
    private final Engine engine = new Engine();                 // composition 1
    private final Wheel[] wheels = new Wheel[4];                // composition 4
    private Driver driver;                                      // association 0..1
    Car(String plate) {
        this.plate = plate;
        for (int i = 0; i < 4; i++) wheels[i] = new Wheel(i);
    }
    void start() { engine.start(); System.out.println(plate + ": engine on"); }
    void replaceWheel(int pos) {
        if (pos < 0 || pos > 3) throw new IllegalArgumentException("position 0..3");
        wheels[pos] = new Wheel(pos);                           // old wheel is discarded with no other owner
    }
    boolean hasDriver() { return driver != null; }
    void setDriverInternal(Driver d) { driver = d; }            // only Driver calls this
}

class Driver {
    private final String name;
    private Car car;                                            // association 0..1
    Driver(String name) { this.name = name; }
    boolean drive(Car c) {
        if (c.hasDriver() || car != null) return false;
        car = c;
        c.setDriverInternal(this);                              // both sides in one place
        return true;
    }
    void leave() { if (car != null) { car.setDriverInternal(null); car = null; } }

    public static void main(String[] args) {
        Car swift = new Car("KA-01-1234");
        Driver ravi = new Driver("Ravi"), mia = new Driver("Mia");
        System.out.println(ravi.drive(swift));   // true
        System.out.println(mia.drive(swift));    // false: car taken
        swift.start();
        ravi.leave();
        System.out.println(mia.drive(swift));    // true
    }
}`,
      alt: [
        { lang: 'python', code: `
from __future__ import annotations


class Engine:
    def __init__(self) -> None:
        self._running = False

    def start(self) -> None:
        self._running = True

    def is_running(self) -> bool:
        return self._running


class Wheel:
    def __init__(self, position: int) -> None:
        self.position = position
        self.wear_percent = 0


class Car:
    def __init__(self, plate: str) -> None:
        self._plate = plate
        self._engine = Engine()  # composition 1
        self._wheels = [Wheel(i) for i in range(4)]  # composition 4
        self._driver: Driver | None = None  # association 0..1

    def start(self) -> None:
        self._engine.start()
        print(f"{self._plate}: engine on")

    def replace_wheel(self, pos: int) -> None:
        if not 0 <= pos <= 3:
            raise ValueError("position 0..3")
        self._wheels[pos] = Wheel(pos)  # old wheel is discarded with no other owner

    def has_driver(self) -> bool:
        return self._driver is not None

    def set_driver_internal(self, d: Driver | None) -> None:  # only Driver calls this
        self._driver = d


class Driver:
    def __init__(self, name: str) -> None:
        self._name = name
        self._car: Car | None = None  # association 0..1

    def drive(self, car: Car) -> bool:
        if car.has_driver() or self._car is not None:
            return False
        self._car = car
        car.set_driver_internal(self)  # both sides in one place
        return True

    def leave(self) -> None:
        if self._car is not None:
            self._car.set_driver_internal(None)
            self._car = None


def main() -> None:
    swift = Car("KA-01-1234")
    ravi, mia = Driver("Ravi"), Driver("Mia")
    print(str(ravi.drive(swift)).lower())  # true
    print(str(mia.drive(swift)).lower())  # false: car taken
    swift.start()
    ravi.leave()
    print(str(mia.drive(swift)).lower())  # true


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
class Engine {
  private running = false;
  start(): void { this.running = true; }
  isRunning(): boolean { return this.running; }
}

class Wheel {
  private wearPercent = 0;
  constructor(private readonly pos: number) {}
  position(): number { return this.pos; }
}

class Car {
  private readonly engine = new Engine(); // composition 1
  private readonly wheels: Wheel[] = [0, 1, 2, 3].map((i) => new Wheel(i)); // composition 4
  private driver: Driver | null = null; // association 0..1
  constructor(private readonly plate: string) {}
  start(): void {
    this.engine.start();
    console.log(\`\${this.plate}: engine on\`);
  }
  replaceWheel(pos: number): void {
    if (pos < 0 || pos > 3) throw new Error("position 0..3");
    this.wheels[pos] = new Wheel(pos); // old wheel is discarded with no other owner
  }
  hasDriver(): boolean { return this.driver !== null; }
  setDriverInternal(d: Driver | null): void { this.driver = d; } // only Driver calls this
}

class Driver {
  private car: Car | null = null; // association 0..1
  constructor(private readonly name: string) {}
  drive(c: Car): boolean {
    if (c.hasDriver() || this.car !== null) return false;
    this.car = c;
    c.setDriverInternal(this); // both sides in one place
    return true;
  }
  leave(): void {
    if (this.car !== null) {
      this.car.setDriverInternal(null);
      this.car = null;
    }
  }
}

function main(): void {
  const swift = new Car("KA-01-1234");
  const ravi = new Driver("Ravi"), mia = new Driver("Mia");
  console.log(ravi.drive(swift)); // true
  console.log(mia.drive(swift)); // false: car taken
  swift.start();
  ravi.leave();
  console.log(mia.drive(swift)); // true
}
main();` },
        { lang: 'cpp', code: `
class Engine {
public:
    void start() { running_ = true; }
    bool isRunning() const { return running_; }
private:
    bool running_ = false;
};

class Wheel {
public:
    explicit Wheel(int position = 0) : position_(position) {}
    int position() const { return position_; }
private:
    int position_;
    int wearPercent_ = 0;
};

class Driver;

class Car {
public:
    explicit Car(string plate) : plate_(std::move(plate)) {
        for (int i = 0; i < 4; ++i) wheels_[i] = Wheel(i);
    }
    void start() {
        engine_.start();
        cout << plate_ << ": engine on\\n";
    }
    void replaceWheel(int pos) {
        if (pos < 0 || pos > 3) throw invalid_argument("position 0..3");
        wheels_[pos] = Wheel(pos);  // old wheel is discarded with no other owner
    }
    bool hasDriver() const { return driver_ != nullptr; }
    void setDriverInternal(Driver* d) { driver_ = d; }  // only Driver calls this
private:
    string plate_;
    Engine engine_;                // composition 1: stored by value, dies with the car
    array<Wheel, 4> wheels_;       // composition 4
    Driver* driver_ = nullptr;     // association 0..1, non-owning
};

class Driver {
public:
    explicit Driver(string name) : name_(std::move(name)) {}
    bool drive(Car& c) {
        if (c.hasDriver() || car_ != nullptr) return false;
        car_ = &c;
        c.setDriverInternal(this);  // both sides in one place
        return true;
    }
    void leave() {
        if (car_) {
            car_->setDriverInternal(nullptr);
            car_ = nullptr;
        }
    }
private:
    string name_;
    Car* car_ = nullptr;  // association 0..1, non-owning
};

int main() {
    Car swift("KA-01-1234");
    Driver ravi("Ravi"), mia("Mia");
    cout << boolalpha << ravi.drive(swift) << "\\n";  // true
    cout << mia.drive(swift) << "\\n";                // false: car taken
    swift.start();
    ravi.leave();
    cout << mia.drive(swift) << "\\n";                // true
}` }
      ],
      complexity: `<p>All operations O(1). Memory: 1 engine + 4 wheels per car. The design guarantees no shared engines and no inconsistent driver links.</p>`,
      followUps: ['Electric cars have a Battery instead of an Engine. Interface PowerSource?', 'A fleet company assigns drivers to cars per shift: does the association become a class?']
    }
  });

  practice.push({
    title: 'Music Library, Songs and Playlists',
    level: 'Easy', tags: ['aggregation', 'composition', 'shared parts'], companies: ['Spotify', 'JioSaavn', 'Apple'],
    statement: `<p>A user's <b>music library</b> holds all songs they have saved. The user creates <b>playlists</b> that contain songs from the library, in order; the same song can appear in many playlists. Deleting a playlist must not delete songs. Deleting a song from the library removes it from every playlist. Model the classes and relationships and implement add/remove.</p>`,
    constraints: `<ul><li>Songs are identified by id; title and duration in seconds.</li><li>A playlist may contain the same song twice (repeats allowed).</li><li>Total duration of a playlist must be computed, not stored.</li></ul>`,
    example: `<p>Library: {S1 "Kesariya" 268s, S2 "Naatu Naatu" 210s}. Playlist "Gym": [S2, S1, S2] → duration ${H.c('g', '688s')}. Delete playlist "Gym" → songs still in library. Delete S2 from library → Playlist "Chill" [S2, S1] becomes ${H.c('y', '[S1]')}.</p>`,
    brute: {
      why: `<p>The naive design copies song data into each playlist (<code>List&lt;String&gt; titles</code>). Now a renamed or deleted song stays stale in every playlist, the duration is stored and goes out of sync, and the library has no idea which playlists use a song. Copying parts instead of referencing them is the opposite of aggregation.</p>`,
      code: { lang: 'java', code: `
class Playlist {
    String name;
    List<String> songTitles = new ArrayList<>();   // copies, not references
    int totalSeconds;                               // stored, drifts when songs change
}
class MusicApp {
    List<Playlist> playlists = new ArrayList<>();
    Map<String, Integer> library = new HashMap<>(); // title -> seconds
}`, alt: [
              { lang: 'python', code: `
class Playlist:
    def __init__(self):
        self.name = ""
        self.song_titles = []        # copies, not references
        self.total_seconds = 0       # stored, drifts when songs change

class MusicApp:
    def __init__(self):
        self.playlists = []
        self.library = {}            # title -> seconds` },
              { lang: 'ts', code: `
class Playlist {
    name = "";
    songTitles: string[] = [];   // copies, not references
    totalSeconds = 0;            // stored, drifts when songs change
}
class MusicApp {
    playlists: Playlist[] = [];
    library = new Map<string, number>();   // title -> seconds
}` },
              { lang: 'cpp', code: `
struct Playlist {
    string name;
    vector<string> songTitles;   // copies, not references
    int totalSeconds = 0;        // stored, drifts when songs change
};
struct MusicApp {
    vector<Playlist> playlists;
    unordered_map<string, int> library;   // title -> seconds
};` }
            ] }
    },
    mcq: { q: 'Library → Song and Playlist → Song: which pair of relationships fits?', options: ['Both composition', 'Library ◆ Song (owns them), Playlist ◇ Song (shared references)', 'Both inheritance', 'Playlist ◆ Song, Library ◇ Song'], answer: 1, explain: 'Songs live in the library (deleting from the library deletes the song). Playlists only group references to songs that are shared with other playlists.' },
    hints: [
      `<p>Hint 1: who controls the life of a song? The library. Who only groups songs? Playlists.</p>`,
      `<p>Hint 2: <code>Song</code> is an immutable value type (a record in Java: id, title, seconds). Library keeps <code>Map&lt;String, Song&gt;</code> and <code>List&lt;Playlist&gt;</code>; Playlist keeps <code>List&lt;Song&gt;</code> references.</p>`,
      `<p>Hint 3: <code>library.deleteSong(id)</code> removes it from the map and calls <code>p.removeAll(song)</code> on each playlist; duration = stream sum of seconds.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "688\n268\n" }] },
    solution: {
      approach: `<p><b>MusicLibrary ◆ 0..* Song</b> (songs are created through the library), <b>MusicLibrary ◆ 0..* Playlist</b>, <b>Playlist ◇ 0..* Song</b> (ordered references, repeats allowed). The library coordinates deletion so playlists never reference a removed song. Duration is derived on demand.</p>`,
      code: `
record Song(String id, String title, int seconds) { }

class Playlist {
    private final String name;
    private final List<Song> songs = new ArrayList<>();        // aggregation: references only
    Playlist(String name) { this.name = name; }
    void add(Song s) { songs.add(s); }
    void removeAll(Song s) { songs.removeIf(x -> x.equals(s)); }
    int durationSeconds() { return songs.stream().mapToInt(Song::seconds).sum(); }   // derived
    List<Song> songs() { return List.copyOf(songs); }
    String name() { return name; }
}

class MusicLibrary {
    private final Map<String, Song> songs = new LinkedHashMap<>();       // composition
    private final Map<String, Playlist> playlists = new LinkedHashMap<>();
    Song save(String id, String title, int seconds) {
        Song s = new Song(id, title, seconds);
        songs.put(id, s);
        return s;
    }
    Playlist createPlaylist(String name) { return playlists.computeIfAbsent(name, Playlist::new); }
    void addToPlaylist(String playlist, String songId) {
        Song s = songs.get(songId);
        if (s == null) throw new IllegalArgumentException("save the song first");
        playlists.get(playlist).add(s);
    }
    void deletePlaylist(String name) { playlists.remove(name); }         // songs untouched
    void deleteSong(String id) {
        Song s = songs.remove(id);
        if (s != null) playlists.values().forEach(p -> p.removeAll(s)); // keep playlists consistent
    }

    public static void main(String[] args) {
        MusicLibrary lib = new MusicLibrary();
        lib.save("S1", "Kesariya", 268); lib.save("S2", "Naatu Naatu", 210);
        Playlist gym = lib.createPlaylist("Gym");
        lib.addToPlaylist("Gym", "S2"); lib.addToPlaylist("Gym", "S1"); lib.addToPlaylist("Gym", "S2");
        System.out.println(gym.durationSeconds());   // 688
        lib.deleteSong("S2");
        System.out.println(gym.durationSeconds());   // 268
    }
}`,
      alt: [
        { lang: 'python', code: `
from dataclasses import dataclass


@dataclass(frozen=True)
class Song:  # value object: equal when all fields are equal
    id: str
    title: str
    seconds: int


class Playlist:
    def __init__(self, name: str) -> None:
        self.name = name
        self._songs: list[Song] = []  # aggregation: references only

    def add(self, s: Song) -> None:
        self._songs.append(s)

    def remove_all(self, s: Song) -> None:
        self._songs = [x for x in self._songs if x != s]

    def duration_seconds(self) -> int:  # derived
        return sum(s.seconds for s in self._songs)

    def songs(self) -> list[Song]:
        return list(self._songs)


class MusicLibrary:
    def __init__(self) -> None:
        self._songs: dict[str, Song] = {}  # composition
        self._playlists: dict[str, Playlist] = {}

    def save(self, song_id: str, title: str, seconds: int) -> Song:
        s = Song(song_id, title, seconds)
        self._songs[song_id] = s
        return s

    def create_playlist(self, name: str) -> Playlist:
        return self._playlists.setdefault(name, Playlist(name))

    def add_to_playlist(self, playlist: str, song_id: str) -> None:
        s = self._songs.get(song_id)
        if s is None:
            raise ValueError("save the song first")
        self._playlists[playlist].add(s)

    def delete_playlist(self, name: str) -> None:
        self._playlists.pop(name, None)  # songs untouched

    def delete_song(self, song_id: str) -> None:
        s = self._songs.pop(song_id, None)
        if s is not None:
            for p in self._playlists.values():  # keep playlists consistent
                p.remove_all(s)


def main() -> None:
    lib = MusicLibrary()
    lib.save("S1", "Kesariya", 268)
    lib.save("S2", "Naatu Naatu", 210)
    gym = lib.create_playlist("Gym")
    lib.add_to_playlist("Gym", "S2")
    lib.add_to_playlist("Gym", "S1")
    lib.add_to_playlist("Gym", "S2")
    print(gym.duration_seconds())  # 688
    lib.delete_song("S2")
    print(gym.duration_seconds())  # 268


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
interface Song { // value object: compared field by field, never mutated
  readonly id: string;
  readonly title: string;
  readonly seconds: number;
}

const sameSong = (a: Song, b: Song): boolean =>
  a.id === b.id && a.title === b.title && a.seconds === b.seconds;

class Playlist {
  private songList: Song[] = []; // aggregation: references only
  constructor(private readonly playlistName: string) {}
  add(s: Song): void { this.songList.push(s); }
  removeAll(s: Song): void { this.songList = this.songList.filter((x) => !sameSong(x, s)); }
  durationSeconds(): number { return this.songList.reduce((sum, s) => sum + s.seconds, 0); } // derived
  songs(): readonly Song[] { return [...this.songList]; }
  name(): string { return this.playlistName; }
}

class MusicLibrary {
  private readonly songs = new Map<string, Song>(); // composition
  private readonly playlists = new Map<string, Playlist>();

  save(id: string, title: string, seconds: number): Song {
    const s: Song = Object.freeze({ id, title, seconds });
    this.songs.set(id, s);
    return s;
  }
  createPlaylist(name: string): Playlist {
    let p = this.playlists.get(name);
    if (!p) {
      p = new Playlist(name);
      this.playlists.set(name, p);
    }
    return p;
  }
  addToPlaylist(playlist: string, songId: string): void {
    const s = this.songs.get(songId);
    if (!s) throw new Error("save the song first");
    this.playlists.get(playlist)!.add(s);
  }
  deletePlaylist(name: string): void { this.playlists.delete(name); } // songs untouched
  deleteSong(id: string): void {
    const s = this.songs.get(id);
    if (!s) return;
    this.songs.delete(id);
    this.playlists.forEach((p) => p.removeAll(s)); // keep playlists consistent
  }
}

function main(): void {
  const lib = new MusicLibrary();
  lib.save("S1", "Kesariya", 268);
  lib.save("S2", "Naatu Naatu", 210);
  const gym = lib.createPlaylist("Gym");
  lib.addToPlaylist("Gym", "S2");
  lib.addToPlaylist("Gym", "S1");
  lib.addToPlaylist("Gym", "S2");
  console.log(gym.durationSeconds()); // 688
  lib.deleteSong("S2");
  console.log(gym.durationSeconds()); // 268
}
main();` },
        { lang: 'cpp', code: `
struct Song {  // value object: equal when all fields are equal
    string id;
    string title;
    int seconds;
    bool operator==(const Song&) const = default;
};

class Playlist {
public:
    explicit Playlist(string name) : name_(std::move(name)) {}
    void add(const Song& s) { songs_.push_back(s); }  // aggregation: a copy of the value
    void removeAll(const Song& s) { songs_.erase(remove(songs_.begin(), songs_.end(), s), songs_.end()); }
    int durationSeconds() const {  // derived
        return accumulate(songs_.begin(), songs_.end(), 0, [](int sum, const Song& s) { return sum + s.seconds; });
    }
    const vector<Song>& songs() const { return songs_; }
    const string& name() const { return name_; }
private:
    string name_;
    vector<Song> songs_;
};

class MusicLibrary {
public:
    Song save(const string& id, const string& title, int seconds) {
        Song s{id, title, seconds};
        songs_[id] = s;
        return s;
    }
    Playlist& createPlaylist(const string& name) {
        auto [it, inserted] = playlists_.try_emplace(name, name);
        return it->second;
    }
    void addToPlaylist(const string& playlist, const string& songId) {
        auto it = songs_.find(songId);
        if (it == songs_.end()) throw invalid_argument("save the song first");
        playlists_.at(playlist).add(it->second);
    }
    void deletePlaylist(const string& name) { playlists_.erase(name); }  // songs untouched
    void deleteSong(const string& id) {
        auto it = songs_.find(id);
        if (it == songs_.end()) return;
        Song s = it->second;
        songs_.erase(it);
        for (auto& [name, p] : playlists_) p.removeAll(s);  // keep playlists consistent
    }
private:
    map<string, Song> songs_;          // composition
    map<string, Playlist> playlists_;  // node-based map: references stay valid
};

int main() {
    MusicLibrary lib;
    lib.save("S1", "Kesariya", 268);
    lib.save("S2", "Naatu Naatu", 210);
    Playlist& gym = lib.createPlaylist("Gym");
    lib.addToPlaylist("Gym", "S2");
    lib.addToPlaylist("Gym", "S1");
    lib.addToPlaylist("Gym", "S2");
    cout << gym.durationSeconds() << "\\n";  // 688
    lib.deleteSong("S2");
    cout << gym.durationSeconds() << "\\n";  // 268
}` }
      ],
      complexity: `<p>save/add O(1); deleteSong O(P × L) over playlists and their lengths (fine for one user; at scale keep a reverse index song → playlists). Duration O(L).</p>`,
      followUps: ['Collaborative playlists shared by several users: what relationship joins User and Playlist?', 'Shuffle without changing the stored order: where does that behaviour belong?']
    }
  });

  practice.push({
    title: 'Animals That Swim, Fly or Both',
    level: 'Easy', tags: ['inheritance', 'interface', 'polymorphism', 'is-a vs can-do'], companies: ['Microsoft', 'Zoho', 'Wipro'],
    statement: `<p>A zoo app needs Duck (walks, swims, flies), Penguin (walks, swims), Eagle (walks, flies) and Fish (swims). Every animal has a name and makes a sound. The keeper wants to: list all animals' sounds, get all swimmers for the pool show, and get all fliers for the bird show. Design the hierarchy so that no class has a method it cannot honestly perform.</p>`,
    constraints: `<ul><li>No method may throw UnsupportedOperationException.</li><li>Adding a new animal must not modify the show code.</li></ul>`,
    example: `<p>Pool show → ${H.c('g', 'Duck, Penguin, Fish')}. Bird show → ${H.c('g', 'Duck, Eagle')}. A design where <code>Penguin extends Bird</code> with <code>fly()</code> would ${H.c('r', 'lie')}.</p>`,
    brute: {
      why: `<p>The naive design puts every ability in one base class: <code>Animal</code> with <code>swim()</code>, <code>fly()</code>, <code>walk()</code>, and subclasses override the ones they cannot do with a <code>throw</code> of a "not supported" error. Every show must now wrap calls in try/catch or check a type string. The hierarchy promises abilities that do not exist (an LSP violation).</p>`,
      code: { lang: 'java', code: `
class Animal {
    String name;
    void fly() { System.out.println(name + " flies"); }
    void swim() { System.out.println(name + " swims"); }
}
class Fish extends Animal {
    @Override void fly() { throw new UnsupportedOperationException("fish can't fly"); }
}`, alt: [
              { lang: 'python', code: `
class Animal:
    def __init__(self, name): self.name = name
    def fly(self): print(self.name + " flies")
    def swim(self): print(self.name + " swims")

class Fish(Animal):
    def fly(self): raise NotImplementedError("fish can't fly")` },
              { lang: 'ts', code: `
class Animal {
    constructor(public name: string) {}
    fly(): void { console.log(this.name + " flies"); }
    swim(): void { console.log(this.name + " swims"); }
}
class Fish extends Animal {
    override fly(): void { throw new Error("fish can't fly"); }
}` },
              { lang: 'cpp', code: `
class Animal {
public:
    string name;
    virtual void fly() { cout << name << " flies\\n"; }
    virtual void swim() { cout << name << " swims\\n"; }
    virtual ~Animal() = default;
};
class Fish : public Animal {
public:
    void fly() override { throw runtime_error("fish can't fly"); }
};` }
            ] }
    },
    mcq: { q: 'Where should "can fly" live?', options: ['As fly() on the Animal base class', 'In a Flyable interface implemented only by animals that fly', 'As a boolean canFly field checked everywhere', 'In a FlyingAnimal superclass that Duck and Eagle extend, while Penguin extends SwimmingAnimal'], answer: 1, explain: 'Abilities that cut across the family tree are capabilities: small interfaces. A Duck both swims and flies, which single-inheritance superclasses cannot express.' },
    hints: [
      `<p>Hint 1: what is true of <b>all</b> animals? name and sound. That goes into an abstract base class.</p>`,
      `<p>Hint 2: abilities not shared by all → interfaces <code>Swimmer</code>, <code>Flyer</code>. A class can implement several.</p>`,
      `<p>Hint 3: shows filter with a type test (<code>instanceof Swimmer</code>, <code>isinstance</code>, a type guard, <code>dynamic_cast</code>) or keep separate typed lists; then call the ability polymorphically.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "Duck: quack\nPenguin: squawk\nEagle: screech\nFish: blub\nDuck splash, Penguin splash, Fish splash\nDuck up to 1000m, Eagle up to 3000m\n" }] },
    solution: {
      approach: `<p><code>abstract class Animal</code> (name, abstract sound()) is the honest is-a root. Capabilities are interfaces: <code>Swimmer</code>, <code>Flyer</code>. Duck extends Animal implements both; Penguin implements Swimmer; Eagle implements Flyer; Fish implements Swimmer. Show code depends only on the capability interfaces, so new animals plug in with no edits.</p>`,
      code: `
abstract class Animal {
    private final String name;
    protected Animal(String name) { this.name = name; }
    abstract String sound();
    String name() { return name; }
}
interface Swimmer { default String swim() { return "splash"; } }
interface Flyer { int maxAltitude(); }

class Duck extends Animal implements Swimmer, Flyer {
    Duck() { super("Duck"); }
    String sound() { return "quack"; }
    public int maxAltitude() { return 1000; }
}
class Penguin extends Animal implements Swimmer {
    Penguin() { super("Penguin"); }
    String sound() { return "squawk"; }
}
class Eagle extends Animal implements Flyer {
    Eagle() { super("Eagle"); }
    String sound() { return "screech"; }
    public int maxAltitude() { return 3000; }
}
class Fish extends Animal implements Swimmer {
    Fish() { super("Fish"); }
    String sound() { return "blub"; }
}

class ZooShows {
    static List<String> poolShow(List<Animal> zoo) {
        List<String> out = new ArrayList<>();
        for (Animal a : zoo) if (a instanceof Swimmer s) out.add(a.name() + " " + s.swim());
        return out;
    }
    static List<String> birdShow(List<Animal> zoo) {
        List<String> out = new ArrayList<>();
        for (Animal a : zoo) if (a instanceof Flyer f) out.add(a.name() + " up to " + f.maxAltitude() + "m");
        return out;
    }
    public static void main(String[] args) {
        List<Animal> zoo = List.of(new Duck(), new Penguin(), new Eagle(), new Fish());
        zoo.forEach(a -> System.out.println(a.name() + ": " + a.sound()));
        System.out.println(String.join(", ", poolShow(zoo)));   // Duck, Penguin, Fish
        System.out.println(String.join(", ", birdShow(zoo)));   // Duck, Eagle
    }
}`,
      alt: [
        { lang: 'python', code: `
from abc import ABC, abstractmethod


class Animal(ABC):
    def __init__(self, name: str) -> None:
        self._name = name

    @abstractmethod
    def sound(self) -> str: ...

    def name(self) -> str:
        return self._name


class Swimmer:  # capability with a default behaviour (a mixin)
    def swim(self) -> str:
        return "splash"


class Flyer(ABC):  # capability every flyer must provide
    @abstractmethod
    def max_altitude(self) -> int: ...


class Duck(Animal, Swimmer, Flyer):
    def __init__(self) -> None:
        super().__init__("Duck")

    def sound(self) -> str:
        return "quack"

    def max_altitude(self) -> int:
        return 1000


class Penguin(Animal, Swimmer):
    def __init__(self) -> None:
        super().__init__("Penguin")

    def sound(self) -> str:
        return "squawk"


class Eagle(Animal, Flyer):
    def __init__(self) -> None:
        super().__init__("Eagle")

    def sound(self) -> str:
        return "screech"

    def max_altitude(self) -> int:
        return 3000


class Fish(Animal, Swimmer):
    def __init__(self) -> None:
        super().__init__("Fish")

    def sound(self) -> str:
        return "blub"


class ZooShows:
    @staticmethod
    def pool_show(zoo: list[Animal]) -> list[str]:
        return [f"{a.name()} {a.swim()}" for a in zoo if isinstance(a, Swimmer)]

    @staticmethod
    def bird_show(zoo: list[Animal]) -> list[str]:
        return [f"{a.name()} up to {a.max_altitude()}m" for a in zoo if isinstance(a, Flyer)]


def main() -> None:
    zoo: list[Animal] = [Duck(), Penguin(), Eagle(), Fish()]
    for a in zoo:
        print(f"{a.name()}: {a.sound()}")
    print(", ".join(ZooShows.pool_show(zoo)))  # Duck, Penguin, Fish
    print(", ".join(ZooShows.bird_show(zoo)))  # Duck, Eagle


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
abstract class Animal {
  protected constructor(private readonly label: string) {}
  abstract sound(): string;
  name(): string { return this.label; }
}

interface Swimmer { swim(): string; }
interface Flyer { maxAltitude(): number; }

// Interfaces carry no code in TypeScript, so the shared default lives in a function.
const defaultSwim = (): string => "splash";

// Type guards: "does this animal have the capability?"
const isSwimmer = (a: Animal): a is Animal & Swimmer => typeof (a as Partial<Swimmer>).swim === "function";
const isFlyer = (a: Animal): a is Animal & Flyer => typeof (a as Partial<Flyer>).maxAltitude === "function";

class Duck extends Animal implements Swimmer, Flyer {
  constructor() { super("Duck"); }
  sound(): string { return "quack"; }
  swim(): string { return defaultSwim(); }
  maxAltitude(): number { return 1000; }
}

class Penguin extends Animal implements Swimmer {
  constructor() { super("Penguin"); }
  sound(): string { return "squawk"; }
  swim(): string { return defaultSwim(); }
}

class Eagle extends Animal implements Flyer {
  constructor() { super("Eagle"); }
  sound(): string { return "screech"; }
  maxAltitude(): number { return 3000; }
}

class Fish extends Animal implements Swimmer {
  constructor() { super("Fish"); }
  sound(): string { return "blub"; }
  swim(): string { return defaultSwim(); }
}

class ZooShows {
  static poolShow(zoo: Animal[]): string[] {
    return zoo.filter(isSwimmer).map((a) => \`\${a.name()} \${a.swim()}\`);
  }
  static birdShow(zoo: Animal[]): string[] {
    return zoo.filter(isFlyer).map((a) => \`\${a.name()} up to \${a.maxAltitude()}m\`);
  }
}

function main(): void {
  const zoo: Animal[] = [new Duck(), new Penguin(), new Eagle(), new Fish()];
  zoo.forEach((a) => console.log(\`\${a.name()}: \${a.sound()}\`));
  console.log(ZooShows.poolShow(zoo).join(", ")); // Duck, Penguin, Fish
  console.log(ZooShows.birdShow(zoo).join(", ")); // Duck, Eagle
}
main();` },
        { lang: 'cpp', code: `
class Animal {
public:
    virtual ~Animal() = default;
    virtual string sound() const = 0;
    const string& name() const { return name_; }
protected:
    explicit Animal(string name) : name_(std::move(name)) {}
private:
    string name_;
};

class Swimmer {  // capability with a default behaviour
public:
    virtual ~Swimmer() = default;
    virtual string swim() const { return "splash"; }
};

class Flyer {  // capability every flyer must provide
public:
    virtual ~Flyer() = default;
    virtual int maxAltitude() const = 0;
};

class Duck : public Animal, public Swimmer, public Flyer {
public:
    Duck() : Animal("Duck") {}
    string sound() const override { return "quack"; }
    int maxAltitude() const override { return 1000; }
};

class Penguin : public Animal, public Swimmer {
public:
    Penguin() : Animal("Penguin") {}
    string sound() const override { return "squawk"; }
};

class Eagle : public Animal, public Flyer {
public:
    Eagle() : Animal("Eagle") {}
    string sound() const override { return "screech"; }
    int maxAltitude() const override { return 3000; }
};

class Fish : public Animal, public Swimmer {
public:
    Fish() : Animal("Fish") {}
    string sound() const override { return "blub"; }
};

using Zoo = vector<unique_ptr<Animal>>;

class ZooShows {
public:
    static vector<string> poolShow(const Zoo& zoo) {
        vector<string> out;
        for (const auto& a : zoo)
            if (auto* s = dynamic_cast<const Swimmer*>(a.get())) out.push_back(a->name() + " " + s->swim());
        return out;
    }
    static vector<string> birdShow(const Zoo& zoo) {
        vector<string> out;
        for (const auto& a : zoo)
            if (auto* f = dynamic_cast<const Flyer*>(a.get())) out.push_back(a->name() + " up to " + to_string(f->maxAltitude()) + "m");
        return out;
    }
};

string join(const vector<string>& v, const string& sep) {
    string out;
    for (size_t i = 0; i < v.size(); ++i) out += (i ? sep : "") + v[i];
    return out;
}

int main() {
    Zoo zoo;
    zoo.push_back(make_unique<Duck>());
    zoo.push_back(make_unique<Penguin>());
    zoo.push_back(make_unique<Eagle>());
    zoo.push_back(make_unique<Fish>());
    for (const auto& a : zoo) cout << a->name() << ": " << a->sound() << "\\n";
    cout << join(ZooShows::poolShow(zoo), ", ") << "\\n";  // Duck, Penguin, Fish
    cout << join(ZooShows::birdShow(zoo), ", ") << "\\n";  // Duck, Eagle
}` }
      ],
      complexity: `<p>Each show is O(N) over animals. Adding an animal = one class, no edits to shows.</p>`,
      followUps: ['A robot fish also swims but is not an Animal. Does the design still work?', 'Would a sealed hierarchy be appropriate here? Why or why not?']
    }
  });

  practice.push({
    title: 'Encapsulate a Smart Thermostat',
    level: 'Easy', tags: ['encapsulation', 'enum', 'invariants'], companies: ['Google Nest', 'Honeywell', 'Bosch'],
    statement: `<p>A thermostat has a <b>mode</b> (OFF, HEAT, COOL, AUTO), a <b>target temperature</b> between 16 °C and 30 °C, and a <b>current temperature</b> reported by a sensor. Users can change the mode and nudge the target up/down by 0.5 °C. Based on mode and temperatures it decides whether the heater or cooler should run. Nobody outside may set the current temperature except the sensor callback. Design and code it.</p>`,
    constraints: `<ul><li>Target always within [16.0, 30.0]; nudges past the limit are clamped.</li><li>Store temperatures in tenths of a degree (int) to avoid float drift.</li><li>AUTO: heat if current &lt; target − 1 °C, cool if current &gt; target + 1 °C.</li></ul>`,
    example: `${H.table(['mode', 'target', 'current', 'action'], [['HEAT', '22.0', '20.5', H.c('r', 'HEATING')], ['COOL', '22.0', '20.5', H.c('m', 'IDLE')], ['AUTO', '22.0', '23.5', H.c('b', 'COOLING')], ['OFF', 'any', 'any', H.c('m', 'IDLE')]])}<p>30 nudges up from 29.0 leave the target at ${H.c('g', '30.0')}, not 44.0.</p>`,
    brute: {
      why: `<p>With public fields, the mobile app writes <code>t.target = 45</code>, a buggy integration sets <code>t.current</code> directly, and mode is a String ("Heat" vs "HEAT"). The decision logic is copied into the app, the wall panel and the voice assistant, and the three copies disagree. Nothing protects the 16–30 rule.</p>`,
      code: { lang: 'java', code: `
class Thermostat {
    public double target;      // anyone can set 45.0
    public double current;     // anyone can fake the sensor
    public String mode;        // "heat", "HEAT", "Heat"?
}`, alt: [
              { lang: 'python', code: `
class Thermostat:
    def __init__(self):
        self.target = 0.0      # anyone can set 45.0
        self.current = 0.0     # anyone can fake the sensor
        self.mode = ""         # "heat", "HEAT", "Heat"?` },
              { lang: 'ts', code: `
class Thermostat {
    target = 0;      // anyone can set 45.0
    current = 0;     // anyone can fake the sensor
    mode = "";       // "heat", "HEAT", "Heat"?
}` },
              { lang: 'cpp', code: `
struct Thermostat {
    double target = 0;     // anyone can set 45.0
    double current = 0;    // anyone can fake the sensor
    string mode;           // "heat", "HEAT", "Heat"?
};` }
            ] }
    },
    mcq: { q: 'Which is the best API for changing the target?', options: ['setTarget(double) with no checks', 'nudgeUp() / nudgeDown() that clamp to [16, 30], plus a validated setTarget', 'A public target field', 'A static method in ThermostatUtils'], answer: 1, explain: 'Methods named after real user actions, each guarding the invariant inside the object. The field stays private.' },
    hints: [
      `<p>Hint 1: list invariants: target range, mode from a fixed set, current only from the sensor.</p>`,
      `<p>Hint 2: <code>enum Mode</code>, <code>enum Action { IDLE, HEATING, COOLING }</code>; ints in tenths: 160..300.</p>`,
      `<p>Hint 3: <code>action()</code> is derived from mode + temperatures each time it is called (no stored copy). <code>onSensorReading(int tenths)</code> is the only writer of current.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "COOLING\n30.0\n" }] },
    solution: {
      approach: `<p>All state private. Target in tenths with clamping in <code>nudge</code> and validation in <code>setTarget</code>. Mode is an enum. Current temperature changes only through <code>onSensorReading</code> (the sensor's callback). The decision is a derived method so every UI asks the object instead of re-implementing the rule.</p>`,
      code: `
enum Mode { OFF, HEAT, COOL, AUTO }
enum Action { IDLE, HEATING, COOLING }

class Thermostat {
    private static final int MIN = 160, MAX = 300, STEP = 5, BAND = 10;   // tenths of a degree
    private Mode mode = Mode.OFF;
    private int targetTenths = 220;
    private int currentTenths = 220;

    void setMode(Mode m) { mode = Objects.requireNonNull(m); }
    void setTarget(int tenths) {
        if (tenths < MIN || tenths > MAX) throw new IllegalArgumentException("target must be 16.0..30.0");
        targetTenths = tenths;
    }
    void nudgeUp() { targetTenths = Math.min(MAX, targetTenths + STEP); }
    void nudgeDown() { targetTenths = Math.max(MIN, targetTenths - STEP); }
    void onSensorReading(int tenths) { currentTenths = tenths; }          // the only writer

    Action action() {                                                      // derived each time
        switch (mode) {
            case HEAT: return currentTenths < targetTenths ? Action.HEATING : Action.IDLE;
            case COOL: return currentTenths > targetTenths ? Action.COOLING : Action.IDLE;
            case AUTO:
                if (currentTenths < targetTenths - BAND) return Action.HEATING;
                if (currentTenths > targetTenths + BAND) return Action.COOLING;
                return Action.IDLE;
            default: return Action.IDLE;
        }
    }
    String target() { return targetTenths / 10 + "." + targetTenths % 10; }

    public static void main(String[] args) {
        Thermostat t = new Thermostat();
        t.setMode(Mode.AUTO); t.onSensorReading(235);
        System.out.println(t.action());          // COOLING
        t.setTarget(290);
        for (int i = 0; i < 30; i++) t.nudgeUp();
        System.out.println(t.target());          // 30.0
    }
}`,
      alt: [
        { lang: 'python', code: `
from enum import Enum


class Mode(Enum):
    OFF = 1
    HEAT = 2
    COOL = 3
    AUTO = 4


class Action(Enum):
    IDLE = 1
    HEATING = 2
    COOLING = 3


class Thermostat:
    _MIN, _MAX, _STEP, _BAND = 160, 300, 5, 10  # tenths of a degree

    def __init__(self) -> None:
        self._mode = Mode.OFF
        self._target_tenths = 220
        self._current_tenths = 220

    def set_mode(self, m: Mode) -> None:
        if m is None:
            raise ValueError("mode required")
        self._mode = m

    def set_target(self, tenths: int) -> None:
        if not self._MIN <= tenths <= self._MAX:
            raise ValueError("target must be 16.0..30.0")
        self._target_tenths = tenths

    def nudge_up(self) -> None:
        self._target_tenths = min(self._MAX, self._target_tenths + self._STEP)

    def nudge_down(self) -> None:
        self._target_tenths = max(self._MIN, self._target_tenths - self._STEP)

    def on_sensor_reading(self, tenths: int) -> None:  # the only writer
        self._current_tenths = tenths

    def action(self) -> Action:  # derived each time
        cur, target = self._current_tenths, self._target_tenths
        if self._mode is Mode.HEAT:
            return Action.HEATING if cur < target else Action.IDLE
        if self._mode is Mode.COOL:
            return Action.COOLING if cur > target else Action.IDLE
        if self._mode is Mode.AUTO:
            if cur < target - self._BAND:
                return Action.HEATING
            if cur > target + self._BAND:
                return Action.COOLING
        return Action.IDLE

    def target(self) -> str:
        return f"{self._target_tenths // 10}.{self._target_tenths % 10}"


def main() -> None:
    t = Thermostat()
    t.set_mode(Mode.AUTO)
    t.on_sensor_reading(235)
    print(t.action().name)  # COOLING
    t.set_target(290)
    for _ in range(30):
        t.nudge_up()
    print(t.target())  # 30.0


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
type Mode = "OFF" | "HEAT" | "COOL" | "AUTO";
type Action = "IDLE" | "HEATING" | "COOLING";

class Thermostat {
  private static readonly MIN = 160;
  private static readonly MAX = 300;
  private static readonly STEP = 5;
  private static readonly BAND = 10; // tenths of a degree
  private mode: Mode = "OFF";
  private targetTenths = 220;
  private currentTenths = 220;

  setMode(m: Mode): void { this.mode = m; }
  setTarget(tenths: number): void {
    if (tenths < Thermostat.MIN || tenths > Thermostat.MAX) throw new Error("target must be 16.0..30.0");
    this.targetTenths = tenths;
  }
  nudgeUp(): void { this.targetTenths = Math.min(Thermostat.MAX, this.targetTenths + Thermostat.STEP); }
  nudgeDown(): void { this.targetTenths = Math.max(Thermostat.MIN, this.targetTenths - Thermostat.STEP); }
  onSensorReading(tenths: number): void { this.currentTenths = tenths; } // the only writer

  action(): Action { // derived each time
    const cur = this.currentTenths, target = this.targetTenths;
    switch (this.mode) {
      case "HEAT": return cur < target ? "HEATING" : "IDLE";
      case "COOL": return cur > target ? "COOLING" : "IDLE";
      case "AUTO":
        if (cur < target - Thermostat.BAND) return "HEATING";
        if (cur > target + Thermostat.BAND) return "COOLING";
        return "IDLE";
      default: return "IDLE";
    }
  }
  target(): string {
    return \`\${Math.floor(this.targetTenths / 10)}.\${this.targetTenths % 10}\`;
  }
}

function main(): void {
  const t = new Thermostat();
  t.setMode("AUTO");
  t.onSensorReading(235);
  console.log(t.action()); // COOLING
  t.setTarget(290);
  for (let i = 0; i < 30; i++) t.nudgeUp();
  console.log(t.target()); // 30.0
}
main();` },
        { lang: 'cpp', code: `
enum class Mode { Off, Heat, Cool, Auto };
enum class Action { Idle, Heating, Cooling };

string actionName(Action a) {
    switch (a) {
        case Action::Heating: return "HEATING";
        case Action::Cooling: return "COOLING";
        default: return "IDLE";
    }
}

class Thermostat {
public:
    void setMode(Mode m) { mode_ = m; }
    void setTarget(int tenths) {
        if (tenths < MIN || tenths > MAX) throw invalid_argument("target must be 16.0..30.0");
        targetTenths_ = tenths;
    }
    void nudgeUp() { targetTenths_ = min(MAX, targetTenths_ + STEP); }
    void nudgeDown() { targetTenths_ = max(MIN, targetTenths_ - STEP); }
    void onSensorReading(int tenths) { currentTenths_ = tenths; }  // the only writer

    Action action() const {  // derived each time
        switch (mode_) {
            case Mode::Heat: return currentTenths_ < targetTenths_ ? Action::Heating : Action::Idle;
            case Mode::Cool: return currentTenths_ > targetTenths_ ? Action::Cooling : Action::Idle;
            case Mode::Auto:
                if (currentTenths_ < targetTenths_ - BAND) return Action::Heating;
                if (currentTenths_ > targetTenths_ + BAND) return Action::Cooling;
                return Action::Idle;
            default: return Action::Idle;
        }
    }
    string target() const { return to_string(targetTenths_ / 10) + "." + to_string(targetTenths_ % 10); }

private:
    static constexpr int MIN = 160, MAX = 300, STEP = 5, BAND = 10;  // tenths of a degree
    Mode mode_ = Mode::Off;
    int targetTenths_ = 220;
    int currentTenths_ = 220;
};

int main() {
    Thermostat t;
    t.setMode(Mode::Auto);
    t.onSensorReading(235);
    cout << actionName(t.action()) << "\\n";  // COOLING
    t.setTarget(290);
    for (int i = 0; i < 30; i++) t.nudgeUp();
    cout << t.target() << "\\n";  // 30.0
}` }
      ],
      complexity: `<p>Every operation O(1). The invariant (16–30) and the decision rule each live in exactly one place.</p>`,
      followUps: ['Add a weekly schedule (target per time slot). New class or more fields?', 'Notify the app whenever action changes: which relationship does that add (Observer, later module)?']
    }
  });

  /* =========================== PRACTICE: MEDIUM =========================== */
  practice.push({
    title: 'Student Enrollment with Grades and GPA',
    level: 'Medium', tags: ['association class', 'many-to-many', 'derived attribute'], companies: ['Coursera', 'Byju\'s', 'Oracle'],
    statement: `<p>Students enroll in courses each semester. A course has a code, title and credits (1–5). A student can take at most 24 credits per semester and cannot enroll in the same course twice in a semester. At the end, each enrollment gets a letter grade (A=10, B=8, C=6, D=4, F=0 points). Compute a student's <b>semester GPA</b> = Σ(credits × points) / Σ credits over graded enrollments. Model it and code it.</p>`,
    constraints: `<ul><li>Max 24 credits per semester per student.</li><li>Grades from a fixed set.</li><li>GPA is derived, rounded to 2 decimals; 0.00 if nothing graded.</li></ul>`,
    example: `<p>Asha, Sem 1: DSA (4 cr) → A, DBMS (3 cr) → B, Ethics (1 cr) → C.</p>
<p>GPA = (4×10 + 3×8 + 1×6) / 8 = 70 / 8 = ${H.c('g', '8.75')}. Enrolling in DSA again in Sem 1 → ${H.c('r', 'rejected')}.</p>`,
    brute: {
      why: `<p>The naive model stores <code>Map&lt;String, String&gt; grades</code> (course code → letter) inside Student and a separate <code>List&lt;String&gt; students</code> inside Course. Semester information is lost (retaking a course overwrites the old grade), credits must be looked up from somewhere else, and GPA is a stored field updated by hand. The link (enrollment) has its own data but has no class to live in.</p>`,
      code: { lang: 'java', code: `
class Student {
    String name;
    Map<String, String> grades = new HashMap<>();   // course -> "A": which semester? overwritten on retake
    double gpa;                                      // stored, goes stale
}
class Course {
    String code; int credits;
    List<String> students = new ArrayList<>();       // separately maintained: drifts
}`, alt: [
              { lang: 'python', code: `
class Student:
    def __init__(self, name):
        self.name = name
        self.grades = {}    # course -> "A": which semester? overwritten on retake
        self.gpa = 0.0      # stored, goes stale

class Course:
    def __init__(self, code, credits):
        self.code = code
        self.credits = credits
        self.students = []  # separately maintained: drifts` },
              { lang: 'ts', code: `
class Student {
    name = "";
    grades = new Map<string, string>();   // course -> "A": which semester? overwritten on retake
    gpa = 0;                              // stored, goes stale
}
class Course {
    code = ""; credits = 0;
    students: string[] = [];              // separately maintained: drifts
}` },
              { lang: 'cpp', code: `
struct Student {
    string name;
    unordered_map<string, string> grades;   // course -> "A": which semester? overwritten on retake
    double gpa = 0;                         // stored, goes stale
};
struct Course {
    string code; int credits = 0;
    vector<string> students;                // separately maintained: drifts
};` }
            ] }
    },
    mcq: { q: 'Where should the grade live?', options: ['In Student as a map', 'In Course as a map', 'In an Enrollment object linking student, course and semester', 'In a global static map'], answer: 2, explain: 'The grade belongs to the (student, course, semester) link, not to either side alone. That makes Enrollment an association class.' },
    hints: [
      `<p>Hint 1: the many-to-many link has its own data (semester, grade) → <code>Enrollment</code> class.</p>`,
      `<p>Hint 2: <code>enum Grade { A(10), B(8), ... }</code> with points; an immutable <code>Course(code, title, credits)</code> value type (a record in Java) validating credits 1..5.</p>`,
      `<p>Hint 3: Student keeps its enrollments; <code>enroll</code> checks duplicates and the 24-credit cap for that semester; <code>gpa(sem)</code> streams graded enrollments.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "8.75\n0.00\nalready enrolled in CS201\n" }] },
    solution: {
      approach: `<p><code>Student 1 ◆— 0..* Enrollment</code>, <code>Enrollment → 1 Course</code>; Enrollment holds semester and an optional grade (null until graded, exposed as Optional). Rules on the owner of the data: duplicate and credit-cap checks in Student.enroll (it knows all its enrollments), points in the Grade enum, GPA derived on demand. Course is an immutable value type shared by many enrollments.</p>`,
      code: `
enum Grade {
    A(10), B(8), C(6), D(4), F(0);
    final int points;
    Grade(int p) { points = p; }
}

record Course(String code, String title, int credits) {
    Course { if (credits < 1 || credits > 5) throw new IllegalArgumentException("credits 1..5"); }
}

class Enrollment {                                       // association class
    private final Course course;
    private final int semester;
    private Grade grade;                                 // null until graded
    Enrollment(Course course, int semester) { this.course = course; this.semester = semester; }
    void grade(Grade g) { this.grade = Objects.requireNonNull(g); }
    Optional<Grade> grade() { return Optional.ofNullable(grade); }
    Course course() { return course; }
    int semester() { return semester; }
}

class Student {
    private static final int MAX_CREDITS = 24;
    private final String name;
    private final List<Enrollment> enrollments = new ArrayList<>();
    Student(String name) { this.name = name; }

    Enrollment enroll(Course c, int semester) {
        int credits = 0;
        for (Enrollment e : enrollments) {
            if (e.semester() != semester) continue;
            if (e.course().equals(c)) throw new IllegalStateException("already enrolled in " + c.code());
            credits += e.course().credits();
        }
        if (credits + c.credits() > MAX_CREDITS) throw new IllegalStateException("credit cap exceeded");
        Enrollment e = new Enrollment(c, semester);
        enrollments.add(e);
        return e;
    }

    double gpa(int semester) {
        int weighted = 0, credits = 0;
        for (Enrollment e : enrollments) {
            if (e.semester() != semester || e.grade().isEmpty()) continue;
            weighted += e.course().credits() * e.grade().get().points;
            credits += e.course().credits();
        }
        return credits == 0 ? 0.0 : Math.round(100.0 * weighted / credits) / 100.0;
    }

    public static void main(String[] args) {
        Course dsa = new Course("CS201", "DSA", 4), db = new Course("CS202", "DBMS", 3), eth = new Course("HS101", "Ethics", 1);
        Student asha = new Student("Asha");
        asha.enroll(dsa, 1).grade(Grade.A);
        asha.enroll(db, 1).grade(Grade.B);
        asha.enroll(eth, 1).grade(Grade.C);
        System.out.println(String.format("%.2f", asha.gpa(1)));   // 8.75
        System.out.println(String.format("%.2f", asha.gpa(2)));   // 0.00: nothing graded in semester 2
        try { asha.enroll(dsa, 1); } catch (IllegalStateException ex) { System.out.println(ex.getMessage()); }
    }
}`,
      alt: [
        { lang: 'python', code: `
import math
from dataclasses import dataclass
from enum import Enum


class Grade(Enum):
    A = 10
    B = 8
    C = 6
    D = 4
    F = 0

    @property
    def points(self) -> int:
        return self.value


@dataclass(frozen=True)
class Course:  # value object: equal when code, title and credits are equal
    code: str
    title: str
    credits: int

    def __post_init__(self) -> None:
        if not 1 <= self.credits <= 5:
            raise ValueError("credits 1..5")


class Enrollment:  # association class
    def __init__(self, course: Course, semester: int) -> None:
        self.course = course
        self.semester = semester
        self._grade: Grade | None = None  # None until graded

    def assign(self, g: Grade) -> None:
        if g is None:
            raise ValueError("grade required")
        self._grade = g

    @property
    def grade(self) -> Grade | None:
        return self._grade


class Student:
    MAX_CREDITS = 24

    def __init__(self, name: str) -> None:
        self.name = name
        self._enrollments: list[Enrollment] = []

    def enroll(self, c: Course, semester: int) -> Enrollment:
        credits = 0
        for e in self._enrollments:
            if e.semester != semester:
                continue
            if e.course == c:
                raise RuntimeError(f"already enrolled in {c.code}")
            credits += e.course.credits
        if credits + c.credits > Student.MAX_CREDITS:
            raise RuntimeError("credit cap exceeded")
        e = Enrollment(c, semester)
        self._enrollments.append(e)
        return e

    def gpa(self, semester: int) -> float:
        weighted = credits = 0
        for e in self._enrollments:
            g = e.grade
            if e.semester != semester or g is None:
                continue
            weighted += e.course.credits * g.points
            credits += e.course.credits
        return 0.0 if credits == 0 else math.floor(100.0 * weighted / credits + 0.5) / 100.0


def main() -> None:
    dsa, db, eth = Course("CS201", "DSA", 4), Course("CS202", "DBMS", 3), Course("HS101", "Ethics", 1)
    asha = Student("Asha")
    asha.enroll(dsa, 1).assign(Grade.A)
    asha.enroll(db, 1).assign(Grade.B)
    asha.enroll(eth, 1).assign(Grade.C)
    print(f"{asha.gpa(1):.2f}")  # 8.75
    print(f"{asha.gpa(2):.2f}")  # 0.00: nothing graded in semester 2
    try:
        asha.enroll(dsa, 1)
    except RuntimeError as ex:
        print(ex)


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
const GRADE_POINTS = { A: 10, B: 8, C: 6, D: 4, F: 0 } as const;
type Grade = keyof typeof GRADE_POINTS;

class Course { // value object: equal when code, title and credits are equal
  constructor(readonly code: string, readonly title: string, readonly credits: number) {
    if (credits < 1 || credits > 5) throw new Error("credits 1..5");
  }
  equals(o: Course): boolean {
    return this.code === o.code && this.title === o.title && this.credits === o.credits;
  }
}

class Enrollment { // association class
  private graded: Grade | undefined; // undefined until graded
  constructor(private readonly _course: Course, private readonly _semester: number) {}
  grade(g: Grade): void { this.graded = g; }
  currentGrade(): Grade | undefined { return this.graded; }
  course(): Course { return this._course; }
  semester(): number { return this._semester; }
}

class Student {
  private static readonly MAX_CREDITS = 24;
  private readonly enrollments: Enrollment[] = [];
  constructor(readonly name: string) {}

  enroll(c: Course, semester: number): Enrollment {
    let credits = 0;
    for (const e of this.enrollments) {
      if (e.semester() !== semester) continue;
      if (e.course().equals(c)) throw new Error(\`already enrolled in \${c.code}\`);
      credits += e.course().credits;
    }
    if (credits + c.credits > Student.MAX_CREDITS) throw new Error("credit cap exceeded");
    const e = new Enrollment(c, semester);
    this.enrollments.push(e);
    return e;
  }

  gpa(semester: number): number {
    let weighted = 0, credits = 0;
    for (const e of this.enrollments) {
      const g = e.currentGrade();
      if (e.semester() !== semester || g === undefined) continue;
      weighted += e.course().credits * GRADE_POINTS[g];
      credits += e.course().credits;
    }
    return credits === 0 ? 0 : Math.round((100 * weighted) / credits) / 100;
  }
}

function main(): void {
  const dsa = new Course("CS201", "DSA", 4), db = new Course("CS202", "DBMS", 3), eth = new Course("HS101", "Ethics", 1);
  const asha = new Student("Asha");
  asha.enroll(dsa, 1).grade("A");
  asha.enroll(db, 1).grade("B");
  asha.enroll(eth, 1).grade("C");
  console.log(asha.gpa(1).toFixed(2)); // 8.75
  console.log(asha.gpa(2).toFixed(2)); // 0.00: nothing graded in semester 2
  try {
    asha.enroll(dsa, 1);
  } catch (ex) {
    console.log((ex as Error).message);
  }
}
main();` },
        { lang: 'cpp', code: `
enum class Grade { A, B, C, D, F };

int points(Grade g) {
    static const int table[] = {10, 8, 6, 4, 0};
    return table[static_cast<int>(g)];
}

struct Course {  // value object: equal when code, title and credits are equal
    string code;
    string title;
    int credits;
    Course(string c, string t, int cr) : code(std::move(c)), title(std::move(t)), credits(cr) {
        if (cr < 1 || cr > 5) throw invalid_argument("credits 1..5");
    }
    bool operator==(const Course&) const = default;
};

class Enrollment {  // association class
public:
    Enrollment(Course course, int semester) : course_(std::move(course)), semester_(semester) {}
    void grade(Grade g) { grade_ = g; }
    optional<Grade> grade() const { return grade_; }  // empty until graded
    const Course& course() const { return course_; }
    int semester() const { return semester_; }
private:
    Course course_;
    int semester_;
    optional<Grade> grade_;
};

class Student {
public:
    explicit Student(string name) : name_(std::move(name)) {}

    Enrollment& enroll(const Course& c, int semester) {
        int credits = 0;
        for (const auto& e : enrollments_) {
            if (e->semester() != semester) continue;
            if (e->course() == c) throw runtime_error("already enrolled in " + c.code);
            credits += e->course().credits;
        }
        if (credits + c.credits > MAX_CREDITS) throw runtime_error("credit cap exceeded");
        enrollments_.push_back(make_unique<Enrollment>(c, semester));
        return *enrollments_.back();
    }

    double gpa(int semester) const {
        int weighted = 0, credits = 0;
        for (const auto& e : enrollments_) {
            if (e->semester() != semester || !e->grade()) continue;
            weighted += e->course().credits * points(*e->grade());
            credits += e->course().credits;
        }
        return credits == 0 ? 0.0 : floor(100.0 * weighted / credits + 0.5) / 100.0;
    }

private:
    static constexpr int MAX_CREDITS = 24;
    string name_;
    vector<unique_ptr<Enrollment>> enrollments_;
};

int main() {
    Course dsa("CS201", "DSA", 4), db("CS202", "DBMS", 3), eth("HS101", "Ethics", 1);
    Student asha("Asha");
    asha.enroll(dsa, 1).grade(Grade::A);
    asha.enroll(db, 1).grade(Grade::B);
    asha.enroll(eth, 1).grade(Grade::C);
    cout << fixed << setprecision(2);
    cout << asha.gpa(1) << "\\n";  // 8.75
    cout << asha.gpa(2) << "\\n";  // 0.00: nothing graded in semester 2
    try {
        asha.enroll(dsa, 1);
    } catch (const runtime_error& ex) {
        cout << ex.what() << "\\n";
    }
}` }
      ],
      complexity: `<p>enroll and gpa are O(E) over the student's enrollments (tiny). A per-semester map would make them O(courses in that semester).</p>`,
      followUps: ['Courses have prerequisites (DSA requires Programming 1 with grade ≥ C). Where does that rule go?', 'A course section has a seat limit: which class owns the waitlist?']
    }
  });

  practice.push({
    title: 'Restaurant: Menu, Tables, Orders and the Bill',
    level: 'Medium', tags: ['composition', 'association', 'price snapshot', 'enum'], companies: ['Zomato', 'Swiggy', 'Petpooja'],
    statement: `<p>A restaurant has a <b>menu</b> of items (name, price, category VEG/NON_VEG, available flag) and numbered <b>tables</b>. A <b>waiter</b> opens an order for a table and adds items with quantities; unavailable items are rejected. The kitchen marks the order SERVED. The <b>bill</b> = item subtotal + 5% GST, and the table becomes free after payment. Menu prices may change during the day without affecting orders already placed.</p>`,
    constraints: `<ul><li>One open order per table at a time.</li><li>Status: OPEN → SERVED → PAID only.</li><li>Money in paise; GST rounded down.</li></ul>`,
    example: `<p>Table 4: 2 × Paneer Tikka (₹250) + 3 × Roti (₹30) = ₹590; GST 5% = ₹29.50 → 2950 paise; total ${H.c('g', '61950 paise (₹619.50)')}. Changing Roti to ₹35 afterwards does not change this bill. Opening a second order on table 4 before payment → ${H.c('r', 'rejected')}.</p>`,
    brute: {
      why: `<p>A single <code>RestaurantSystem</code> with <code>Map&lt;Integer, List&lt;String&gt;&gt; tableItems</code> computes the bill by looking up <b>today's</b> menu prices, so a price change rewrites open bills. Status is a string, any transition is allowed (PAID → OPEN), and nothing stops two orders on one table.</p>`,
      code: { lang: 'java', code: `
class RestaurantSystem {
    Map<String, Integer> menuPrices = new HashMap<>();
    Map<Integer, List<String>> tableItems = new HashMap<>();
    Map<Integer, String> tableStatus = new HashMap<>();   // free-form strings
    int bill(int table) {
        int sum = 0;
        for (String item : tableItems.get(table)) sum += menuPrices.get(item);  // live prices: wrong
        return sum + sum * 5 / 100;
    }
}`, alt: [
              { lang: 'python', code: `
class RestaurantSystem:
    def __init__(self):
        self.menu_prices = {}
        self.table_items = {}
        self.table_status = {}    # free-form strings

    def bill(self, table):
        total = 0
        for item in self.table_items[table]:
            total += self.menu_prices[item]     # live prices: wrong
        return total + total * 5 // 100` },
              { lang: 'ts', code: `
class RestaurantSystem {
    menuPrices = new Map<string, number>();
    tableItems = new Map<number, string[]>();
    tableStatus = new Map<number, string>();   // free-form strings
    bill(table: number): number {
        let sum = 0;
        for (const item of this.tableItems.get(table)!) sum += this.menuPrices.get(item)!;  // live prices: wrong
        return sum + Math.floor(sum * 5 / 100);
    }
}` },
              { lang: 'cpp', code: `
class RestaurantSystem {
    unordered_map<string, int> menuPrices;
    unordered_map<int, vector<string>> tableItems;
    unordered_map<int, string> tableStatus;   // free-form strings
public:
    int bill(int table) {
        int sum = 0;
        for (auto& item : tableItems[table]) sum += menuPrices[item];   // live prices: wrong
        return sum + sum * 5 / 100;
    }
};` }
            ] }
    },
    mcq: { q: 'Order → OrderItem → MenuItem. Which statement is right?', options: ['Order ◆ OrderItem; OrderItem → MenuItem (association) plus a copied unit price', 'Order ◇ MenuItem directly, no OrderItem needed', 'MenuItem ◆ OrderItem', 'OrderItem extends MenuItem'], answer: 0, explain: 'Order lines live and die with the order (composition) and snapshot the price; they only reference the menu item, which belongs to the menu.' },
    hints: [
      `<p>Hint 1: entities: Restaurant, Menu ◆ MenuItem, Table, Waiter, Order ◆ OrderItem. Enums: Category, OrderStatus.</p>`,
      `<p>Hint 2: OrderItem copies <code>unitPricePaise</code> at add time. Table knows its current order (0..1) so "one open order per table" is checked there.</p>`,
      `<p>Hint 3: status transitions as methods: <code>serve()</code> only from OPEN, <code>pay()</code> only from SERVED, then <code>table.release()</code>.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "61950\ntable 4 busy\n61950\n" }] },
    solution: {
      approach: `<p><code>Menu ◆ 0..* MenuItem</code>; <code>Order ◆ 1..* OrderItem</code>; <code>OrderItem → 1 MenuItem</code> with frozen price; <code>Table 1 — 0..1 Order</code> (current order); <code>Waiter → 0..* Order</code> (who took it). Status changes are guarded methods on Order, so illegal transitions are impossible. The bill is derived from the order's own lines, not from the live menu.</p>`,
      code: `
enum Category { VEG, NON_VEG }
enum OrderStatus { OPEN, SERVED, PAID }

class MenuItem {
    private final String name;
    private final Category category;
    private long pricePaise;
    private boolean available = true;
    MenuItem(String name, Category c, long price) { this.name = name; this.category = c; this.pricePaise = price; }
    void changePrice(long p) { pricePaise = p; }
    void setAvailable(boolean a) { available = a; }
    boolean isAvailable() { return available; }
    long price() { return pricePaise; }
    String name() { return name; }
}

record OrderItem(MenuItem item, int qty, long unitPricePaise) {
    long subtotal() { return qty * unitPricePaise; }
}

class Order {
    private final int tableNo;
    private final String waiter;
    private final List<OrderItem> items = new ArrayList<>();
    private OrderStatus status = OrderStatus.OPEN;
    Order(int tableNo, String waiter) { this.tableNo = tableNo; this.waiter = waiter; }
    void add(MenuItem m, int qty) {
        if (status != OrderStatus.OPEN) throw new IllegalStateException("order not open");
        if (!m.isAvailable()) throw new IllegalStateException(m.name() + " unavailable");
        items.add(new OrderItem(m, qty, m.price()));               // price snapshot
    }
    void serve() { require(OrderStatus.OPEN); status = OrderStatus.SERVED; }
    long bill() {
        long sub = items.stream().mapToLong(OrderItem::subtotal).sum();
        return sub + sub * 5 / 100;                                  // 5% GST, rounded down
    }
    void pay() { require(OrderStatus.SERVED); status = OrderStatus.PAID; }
    private void require(OrderStatus s) { if (status != s) throw new IllegalStateException("expected " + s + " but was " + status); }
}

class Table {
    private final int number;
    private Order current;                                           // 0..1
    Table(int number) { this.number = number; }
    Order open(String waiter) {
        if (current != null) throw new IllegalStateException("table " + number + " busy");
        current = new Order(number, waiter);
        return current;
    }
    long settle() { current.pay(); long amt = current.bill(); current = null; return amt; }
}

class RestaurantDemo {
    public static void main(String[] args) {
        MenuItem paneer = new MenuItem("Paneer Tikka", Category.VEG, 25000), roti = new MenuItem("Roti", Category.VEG, 3000);
        Table t4 = new Table(4);
        Order o = t4.open("Ravi");
        o.add(paneer, 2); o.add(roti, 3);
        roti.changePrice(3500);                      // does not affect the open order
        o.serve();
        System.out.println(o.bill());                // 61950
        try { t4.open("Mia"); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        System.out.println(t4.settle());             // 61950, table free again
    }
}`,
      alt: [
        { lang: 'python', code: `
from dataclasses import dataclass
from enum import Enum


class Category(Enum):
    VEG = 1
    NON_VEG = 2


class OrderStatus(Enum):
    OPEN = "OPEN"
    SERVED = "SERVED"
    PAID = "PAID"


class MenuItem:
    def __init__(self, name: str, category: Category, price_paise: int) -> None:
        self.name = name
        self.category = category
        self._price_paise = price_paise
        self._available = True

    def change_price(self, p: int) -> None:
        self._price_paise = p

    def set_available(self, a: bool) -> None:
        self._available = a

    def is_available(self) -> bool:
        return self._available

    def price(self) -> int:
        return self._price_paise


@dataclass(frozen=True)
class OrderItem:
    item: MenuItem
    qty: int
    unit_price_paise: int

    def subtotal(self) -> int:
        return self.qty * self.unit_price_paise


class Order:
    def __init__(self, table_no: int, waiter: str) -> None:
        self._table_no = table_no
        self._waiter = waiter
        self._items: list[OrderItem] = []
        self._status = OrderStatus.OPEN

    def add(self, m: MenuItem, qty: int) -> None:
        if self._status is not OrderStatus.OPEN:
            raise RuntimeError("order not open")
        if not m.is_available():
            raise RuntimeError(f"{m.name} unavailable")
        self._items.append(OrderItem(m, qty, m.price()))  # price snapshot

    def serve(self) -> None:
        self._require(OrderStatus.OPEN)
        self._status = OrderStatus.SERVED

    def bill(self) -> int:
        sub = sum(i.subtotal() for i in self._items)
        return sub + sub * 5 // 100  # 5% GST, rounded down

    def pay(self) -> None:
        self._require(OrderStatus.SERVED)
        self._status = OrderStatus.PAID

    def _require(self, s: OrderStatus) -> None:
        if self._status is not s:
            raise RuntimeError(f"expected {s.name} but was {self._status.name}")


class Table:
    def __init__(self, number: int) -> None:
        self._number = number
        self._current: Order | None = None  # 0..1

    def open(self, waiter: str) -> Order:
        if self._current is not None:
            raise RuntimeError(f"table {self._number} busy")
        self._current = Order(self._number, waiter)
        return self._current

    def settle(self) -> int:
        self._current.pay()
        amount = self._current.bill()
        self._current = None
        return amount


def main() -> None:
    paneer = MenuItem("Paneer Tikka", Category.VEG, 25000)
    roti = MenuItem("Roti", Category.VEG, 3000)
    t4 = Table(4)
    o = t4.open("Ravi")
    o.add(paneer, 2)
    o.add(roti, 3)
    roti.change_price(3500)  # does not affect the open order
    o.serve()
    print(o.bill())  # 61950
    try:
        t4.open("Mia")
    except RuntimeError as e:
        print(e)
    print(t4.settle())  # 61950, table free again


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
type Category = "VEG" | "NON_VEG";
type OrderStatus = "OPEN" | "SERVED" | "PAID";

class MenuItem {
  private pricePaise: number;
  private available = true;
  constructor(readonly name: string, readonly category: Category, price: number) { this.pricePaise = price; }
  changePrice(p: number): void { this.pricePaise = p; }
  setAvailable(a: boolean): void { this.available = a; }
  isAvailable(): boolean { return this.available; }
  price(): number { return this.pricePaise; }
}

interface OrderItem {
  readonly item: MenuItem;
  readonly qty: number;
  readonly unitPricePaise: number;
}

const subtotal = (i: OrderItem): number => i.qty * i.unitPricePaise;

class Order {
  private readonly items: OrderItem[] = [];
  private status: OrderStatus = "OPEN";
  constructor(private readonly tableNo: number, private readonly waiter: string) {}

  add(m: MenuItem, qty: number): void {
    if (this.status !== "OPEN") throw new Error("order not open");
    if (!m.isAvailable()) throw new Error(\`\${m.name} unavailable\`);
    this.items.push({ item: m, qty, unitPricePaise: m.price() }); // price snapshot
  }
  serve(): void {
    this.require("OPEN");
    this.status = "SERVED";
  }
  bill(): number {
    const sub = this.items.reduce((s, i) => s + subtotal(i), 0);
    return sub + Math.floor((sub * 5) / 100); // 5% GST, rounded down
  }
  pay(): void {
    this.require("SERVED");
    this.status = "PAID";
  }
  private require(s: OrderStatus): void {
    if (this.status !== s) throw new Error(\`expected \${s} but was \${this.status}\`);
  }
}

class Table {
  private current: Order | null = null; // 0..1
  constructor(private readonly number: number) {}
  open(waiter: string): Order {
    if (this.current !== null) throw new Error(\`table \${this.number} busy\`);
    this.current = new Order(this.number, waiter);
    return this.current;
  }
  settle(): number {
    if (this.current === null) throw new Error("no open order");
    this.current.pay();
    const amount = this.current.bill();
    this.current = null;
    return amount;
  }
}

function main(): void {
  const paneer = new MenuItem("Paneer Tikka", "VEG", 25000);
  const roti = new MenuItem("Roti", "VEG", 3000);
  const t4 = new Table(4);
  const o = t4.open("Ravi");
  o.add(paneer, 2);
  o.add(roti, 3);
  roti.changePrice(3500); // does not affect the open order
  o.serve();
  console.log(o.bill()); // 61950
  try {
    t4.open("Mia");
  } catch (e) {
    console.log((e as Error).message);
  }
  console.log(t4.settle()); // 61950, table free again
}
main();` },
        { lang: 'cpp', code: `
enum class Category { Veg, NonVeg };
enum class OrderStatus { Open, Served, Paid };

string statusName(OrderStatus s) {
    switch (s) {
        case OrderStatus::Open: return "OPEN";
        case OrderStatus::Served: return "SERVED";
        default: return "PAID";
    }
}

class MenuItem {
public:
    MenuItem(string name, Category c, long long price) : name_(std::move(name)), category_(c), pricePaise_(price) {}
    void changePrice(long long p) { pricePaise_ = p; }
    void setAvailable(bool a) { available_ = a; }
    bool isAvailable() const { return available_; }
    long long price() const { return pricePaise_; }
    const string& name() const { return name_; }
private:
    string name_;
    Category category_;
    long long pricePaise_;
    bool available_ = true;
};

struct OrderItem {
    const MenuItem* item;  // non-owning: the menu outlives orders
    int qty;
    long long unitPricePaise;
    long long subtotal() const { return qty * unitPricePaise; }
};

class Order {
public:
    Order(int tableNo, string waiter) : tableNo_(tableNo), waiter_(std::move(waiter)) {}
    void add(const MenuItem& m, int qty) {
        if (status_ != OrderStatus::Open) throw runtime_error("order not open");
        if (!m.isAvailable()) throw runtime_error(m.name() + " unavailable");
        items_.push_back({&m, qty, m.price()});  // price snapshot
    }
    void serve() { require(OrderStatus::Open); status_ = OrderStatus::Served; }
    long long bill() const {
        long long sub = 0;
        for (const auto& i : items_) sub += i.subtotal();
        return sub + sub * 5 / 100;  // 5% GST, rounded down
    }
    void pay() { require(OrderStatus::Served); status_ = OrderStatus::Paid; }
private:
    void require(OrderStatus s) const {
        if (status_ != s) throw runtime_error("expected " + statusName(s) + " but was " + statusName(status_));
    }
    int tableNo_;
    string waiter_;
    vector<OrderItem> items_;
    OrderStatus status_ = OrderStatus::Open;
};

class Table {
public:
    explicit Table(int number) : number_(number) {}
    Order& open(const string& waiter) {
        if (current_) throw runtime_error("table " + to_string(number_) + " busy");
        current_ = make_unique<Order>(number_, waiter);
        return *current_;
    }
    long long settle() {
        current_->pay();
        long long amount = current_->bill();
        current_.reset();  // the table owns its open order, so it is destroyed here
        return amount;
    }
private:
    int number_;
    unique_ptr<Order> current_;  // 0..1
};

int main() {
    MenuItem paneer("Paneer Tikka", Category::Veg, 25000), roti("Roti", Category::Veg, 3000);
    Table t4(4);
    Order& o = t4.open("Ravi");
    o.add(paneer, 2);
    o.add(roti, 3);
    roti.changePrice(3500);  // does not affect the open order
    o.serve();
    cout << o.bill() << "\\n";  // 61950
    try {
        t4.open("Mia");
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";
    }
    cout << t4.settle() << "\\n";  // 61950, table free again
}` }
      ],
      complexity: `<p>add/serve/pay O(1); bill O(items). Each rule (availability, transitions, one order per table, GST) lives in one class.</p>`,
      followUps: ['Split the bill between guests: new class or a method on Order?', 'Kitchen display needs orders by status: who keeps that index?']
    }
  });

  practice.push({
    title: 'Notification Service with Pluggable Channels',
    level: 'Medium', tags: ['interface', 'realization', 'aggregation', 'sequence diagram'], companies: ['Twilio', 'Freshworks', 'Amazon'],
    statement: `<p>Users choose how they want to be notified: EMAIL, SMS and/or PUSH (any combination). When an event like "Order shipped" happens, the <b>NotificationService</b> sends the message on each preferred channel. SMS is limited to 160 characters (truncate with "…"). If a channel fails, the others must still be tried, and the service reports which channels succeeded. New channels (WhatsApp) will be added later. Draw the class diagram and the <code>notify</code> sequence, then code it.</p>`,
    constraints: `<ul><li>A channel failure must not stop other channels.</li><li>Adding a channel must not modify NotificationService.</li><li>Users with no preferences receive nothing.</li></ul>`,
    example: `<p>Asha prefers {EMAIL, SMS}. Event "Order 42 shipped" → Email ${H.c('g', 'sent')}, SMS ${H.c('g', 'sent')}. If the SMS gateway is down: result {EMAIL: ok, SMS: ${H.c('r', 'failed')}}; email still went out.</p>`,
    brute: {
      why: `<p>The naive service has <code>if (prefs.contains("EMAIL")) sendEmail(...); if (prefs.contains("SMS")) sendSms(...);</code> with each sender's code inline. One exception in SMS aborts the rest. Adding WhatsApp means editing the service, its tests, and every place that lists channels.</p>`,
      code: { lang: 'java', code: `
class NotificationService {
    void notifyUser(Set<String> prefs, String msg) {
        if (prefs.contains("EMAIL")) System.out.println("SMTP: " + msg);
        if (prefs.contains("SMS")) { if (msg.length() > 160) throw new RuntimeException("too long"); System.out.println("SMS: " + msg); }
        if (prefs.contains("PUSH")) System.out.println("FCM: " + msg);   // never reached if SMS threw
    }
}`, alt: [
              { lang: 'python', code: `
class NotificationService:
    def notify_user(self, prefs, msg):
        if "EMAIL" in prefs: print("SMTP: " + msg)
        if "SMS" in prefs:
            if len(msg) > 160: raise RuntimeError("too long")
            print("SMS: " + msg)
        if "PUSH" in prefs: print("FCM: " + msg)   # never reached if SMS raised` },
              { lang: 'ts', code: `
class NotificationService {
    notifyUser(prefs: Set<string>, msg: string): void {
        if (prefs.has("EMAIL")) console.log("SMTP: " + msg);
        if (prefs.has("SMS")) { if (msg.length > 160) throw new Error("too long"); console.log("SMS: " + msg); }
        if (prefs.has("PUSH")) console.log("FCM: " + msg);   // never reached if SMS threw
    }
}` },
              { lang: 'cpp', code: `
class NotificationService {
public:
    void notifyUser(const set<string>& prefs, const string& msg) {
        if (prefs.count("EMAIL")) cout << "SMTP: " << msg << "\\n";
        if (prefs.count("SMS")) { if (msg.size() > 160) throw runtime_error("too long"); cout << "SMS: " << msg << "\\n"; }
        if (prefs.count("PUSH")) cout << "FCM: " << msg << "\\n";   // never reached if SMS threw
    }
};` }
            ] }
    },
    mcq: { q: 'The service holds a Map&lt;ChannelType, NotificationChannel&gt; passed in at construction. What relationship is that?', options: ['Composition, because the service created them', 'Aggregation/association via dependency injection: channels are created outside and may be shared', 'Inheritance', 'No relationship'], answer: 1, explain: 'The channels live independently (often singletons shared by many services) and are handed in, which is what makes them swappable in tests.' },
    hints: [
      `<p>Hint 1: the varying part is "how to send on a channel" → <code>interface NotificationChannel { ChannelType type(); void send(User u, String msg); }</code>.</p>`,
      `<p>Hint 2: the service receives a list of channels and builds a map by type. For each preferred type: look up the channel, try/catch around send, record the outcome.</p>`,
      `<p>Hint 3: sequence: Caller → Service.notify(user, msg) → loop [each preference] → Service → Channel.send → (alt failure) record failed → return results map.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "EMAIL to asha@x.com: Order 42 shipped\nSMS to +91-90000: Order 42 shipped\n{EMAIL=true, SMS=true}\nEMAIL to asha@x.com: Order 42 shipped\n{EMAIL=true, SMS=false}\n{PUSH=false}\n" }] },
    solution: {
      approach: `<p>Class diagram: <code>«interface» NotificationChannel</code> ◁·· EmailChannel, SmsChannel, PushChannel; <code>NotificationService o— 1..* NotificationChannel</code> (injected); <code>NotificationService ..&gt; User</code> (parameter); <code>User → 0..* ChannelType</code> (enum preferences). Sequence: one loop fragment over preferences with an alt for failure. Each channel owns its own formatting rules (SMS truncation lives in SmsChannel). New channel = one class + one enum constant.</p>`,
      code: `
enum ChannelType { EMAIL, SMS, PUSH }

record User(String name, String email, String phone, Set<ChannelType> prefs) { }

interface NotificationChannel {
    ChannelType type();
    void send(User u, String message);
}

class EmailChannel implements NotificationChannel {
    public ChannelType type() { return ChannelType.EMAIL; }
    public void send(User u, String m) { System.out.println("EMAIL to " + u.email() + ": " + m); }
}

class SmsChannel implements NotificationChannel {
    private final boolean gatewayUp;
    SmsChannel(boolean gatewayUp) { this.gatewayUp = gatewayUp; }
    public ChannelType type() { return ChannelType.SMS; }
    public void send(User u, String m) {
        if (!gatewayUp) throw new IllegalStateException("SMS gateway down");
        String body = m.length() > 160 ? m.substring(0, 159) + "…" : m;   // channel-specific rule
        System.out.println("SMS to " + u.phone() + ": " + body);
    }
}

class PushChannel implements NotificationChannel {
    public ChannelType type() { return ChannelType.PUSH; }
    public void send(User u, String m) { System.out.println("PUSH to " + u.name() + ": " + m); }
}

class NotificationService {
    private final Map<ChannelType, NotificationChannel> channels = new EnumMap<>(ChannelType.class);
    NotificationService(List<NotificationChannel> list) { for (NotificationChannel c : list) channels.put(c.type(), c); }

    Map<ChannelType, Boolean> notifyUser(User u, String message) {
        Map<ChannelType, Boolean> result = new EnumMap<>(ChannelType.class);
        for (ChannelType t : u.prefs()) {                          // loop fragment
            NotificationChannel c = channels.get(t);
            try {
                if (c == null) throw new IllegalStateException("no channel for " + t);
                c.send(u, message);
                result.put(t, true);
            } catch (RuntimeException ex) {                        // alt [failure]: keep going
                result.put(t, false);
            }
        }
        return result;
    }

    public static void main(String[] args) {
        User asha = new User("Asha", "asha@x.com", "+91-90000", EnumSet.of(ChannelType.EMAIL, ChannelType.SMS));
        NotificationService ok = new NotificationService(List.of(new EmailChannel(), new SmsChannel(true), new PushChannel()));
        System.out.println(ok.notifyUser(asha, "Order 42 shipped"));
        NotificationService smsDown = new NotificationService(List.of(new EmailChannel(), new SmsChannel(false)));
        System.out.println(smsDown.notifyUser(asha, "Order 42 shipped"));   // {EMAIL=true, SMS=false}
        User ravi = new User("Ravi", "ravi@x.com", "+91-80000", EnumSet.of(ChannelType.PUSH));
        System.out.println(smsDown.notifyUser(ravi, "Order 42 shipped"));   // {PUSH=false}: no push channel registered
    }
}`,
      alt: [
        { lang: 'python', code: `
from dataclasses import dataclass
from enum import Enum
from typing import Protocol


class ChannelType(Enum):
    EMAIL = 1
    SMS = 2
    PUSH = 3


@dataclass(frozen=True)
class User:
    name: str
    email: str
    phone: str
    prefs: frozenset[ChannelType]


class NotificationChannel(Protocol):
    def channel_type(self) -> ChannelType: ...

    def send(self, user: User, message: str) -> None: ...


class EmailChannel:
    def channel_type(self) -> ChannelType:
        return ChannelType.EMAIL

    def send(self, user: User, message: str) -> None:
        print(f"EMAIL to {user.email}: {message}")


class SmsChannel:
    def __init__(self, gateway_up: bool) -> None:
        self._gateway_up = gateway_up

    def channel_type(self) -> ChannelType:
        return ChannelType.SMS

    def send(self, user: User, message: str) -> None:
        if not self._gateway_up:
            raise RuntimeError("SMS gateway down")
        body = message[:159] + "…" if len(message) > 160 else message  # channel-specific rule
        print(f"SMS to {user.phone}: {body}")


class PushChannel:
    def channel_type(self) -> ChannelType:
        return ChannelType.PUSH

    def send(self, user: User, message: str) -> None:
        print(f"PUSH to {user.name}: {message}")


class NotificationService:
    def __init__(self, channels: list[NotificationChannel]) -> None:
        self._channels = {c.channel_type(): c for c in channels}

    def notify_user(self, user: User, message: str) -> dict[ChannelType, bool]:
        result: dict[ChannelType, bool] = {}
        for t in sorted(user.prefs, key=lambda c: c.value):  # loop fragment, in enum order
            try:
                channel = self._channels.get(t)
                if channel is None:
                    raise RuntimeError(f"no channel for {t.name}")
                channel.send(user, message)
                result[t] = True
            except Exception:  # alt [failure]: keep going
                result[t] = False
        return result


def show(result: dict[ChannelType, bool]) -> str:
    return "{" + ", ".join(f"{t.name}={str(ok).lower()}" for t, ok in result.items()) + "}"


def main() -> None:
    asha = User("Asha", "asha@x.com", "+91-90000", frozenset({ChannelType.EMAIL, ChannelType.SMS}))
    ok = NotificationService([EmailChannel(), SmsChannel(True), PushChannel()])
    print(show(ok.notify_user(asha, "Order 42 shipped")))
    sms_down = NotificationService([EmailChannel(), SmsChannel(False)])
    print(show(sms_down.notify_user(asha, "Order 42 shipped")))  # {EMAIL=true, SMS=false}
    ravi = User("Ravi", "ravi@x.com", "+91-80000", frozenset({ChannelType.PUSH}))
    print(show(sms_down.notify_user(ravi, "Order 42 shipped")))  # {PUSH=false}: no push channel registered


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
type ChannelType = "EMAIL" | "SMS" | "PUSH";
const CHANNEL_ORDER: readonly ChannelType[] = ["EMAIL", "SMS", "PUSH"];

interface User {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly prefs: ReadonlySet<ChannelType>;
}

interface NotificationChannel {
  type(): ChannelType;
  send(u: User, message: string): void;
}

class EmailChannel implements NotificationChannel {
  type(): ChannelType { return "EMAIL"; }
  send(u: User, m: string): void { console.log(\`EMAIL to \${u.email}: \${m}\`); }
}

class SmsChannel implements NotificationChannel {
  constructor(private readonly gatewayUp: boolean) {}
  type(): ChannelType { return "SMS"; }
  send(u: User, m: string): void {
    if (!this.gatewayUp) throw new Error("SMS gateway down");
    const body = m.length > 160 ? m.substring(0, 159) + "…" : m; // channel-specific rule
    console.log(\`SMS to \${u.phone}: \${body}\`);
  }
}

class PushChannel implements NotificationChannel {
  type(): ChannelType { return "PUSH"; }
  send(u: User, m: string): void { console.log(\`PUSH to \${u.name}: \${m}\`); }
}

class NotificationService {
  private readonly channels = new Map<ChannelType, NotificationChannel>();
  constructor(list: NotificationChannel[]) {
    for (const c of list) this.channels.set(c.type(), c);
  }

  notifyUser(u: User, message: string): Map<ChannelType, boolean> {
    const result = new Map<ChannelType, boolean>();
    for (const t of CHANNEL_ORDER.filter((c) => u.prefs.has(c))) { // loop fragment, in enum order
      try {
        const c = this.channels.get(t);
        if (!c) throw new Error(\`no channel for \${t}\`);
        c.send(u, message);
        result.set(t, true);
      } catch {
        result.set(t, false); // alt [failure]: keep going
      }
    }
    return result;
  }
}

function show(result: Map<ChannelType, boolean>): string {
  return "{" + [...result].map(([t, ok]) => \`\${t}=\${ok}\`).join(", ") + "}";
}

function main(): void {
  const asha: User = { name: "Asha", email: "asha@x.com", phone: "+91-90000", prefs: new Set<ChannelType>(["EMAIL", "SMS"]) };
  const ok = new NotificationService([new EmailChannel(), new SmsChannel(true), new PushChannel()]);
  console.log(show(ok.notifyUser(asha, "Order 42 shipped")));
  const smsDown = new NotificationService([new EmailChannel(), new SmsChannel(false)]);
  console.log(show(smsDown.notifyUser(asha, "Order 42 shipped"))); // {EMAIL=true, SMS=false}
  const ravi: User = { name: "Ravi", email: "ravi@x.com", phone: "+91-80000", prefs: new Set<ChannelType>(["PUSH"]) };
  console.log(show(smsDown.notifyUser(ravi, "Order 42 shipped"))); // {PUSH=false}: no push channel registered
}
main();` },
        { lang: 'cpp', code: `
enum class ChannelType { Email, Sms, Push };

string channelName(ChannelType t) {
    switch (t) {
        case ChannelType::Email: return "EMAIL";
        case ChannelType::Sms: return "SMS";
        default: return "PUSH";
    }
}

struct User {
    string name, email, phone;
    set<ChannelType> prefs;  // ordered by enum value
};

class NotificationChannel {
public:
    virtual ~NotificationChannel() = default;
    virtual ChannelType type() const = 0;
    virtual void send(const User& u, const string& message) const = 0;
};

class EmailChannel : public NotificationChannel {
public:
    ChannelType type() const override { return ChannelType::Email; }
    void send(const User& u, const string& m) const override { cout << "EMAIL to " << u.email << ": " << m << "\\n"; }
};

class SmsChannel : public NotificationChannel {
public:
    explicit SmsChannel(bool gatewayUp) : gatewayUp_(gatewayUp) {}
    ChannelType type() const override { return ChannelType::Sms; }
    void send(const User& u, const string& m) const override {
        if (!gatewayUp_) throw runtime_error("SMS gateway down");
        string body = m.size() > 160 ? m.substr(0, 159) + "…" : m;  // channel-specific rule
        cout << "SMS to " << u.phone << ": " << body << "\\n";
    }
private:
    bool gatewayUp_;
};

class PushChannel : public NotificationChannel {
public:
    ChannelType type() const override { return ChannelType::Push; }
    void send(const User& u, const string& m) const override { cout << "PUSH to " << u.name << ": " << m << "\\n"; }
};

class NotificationService {
public:
    explicit NotificationService(vector<unique_ptr<NotificationChannel>> list) {
        for (auto& c : list) {
            ChannelType t = c->type();
            channels_[t] = std::move(c);
        }
    }

    map<ChannelType, bool> notifyUser(const User& u, const string& message) const {
        map<ChannelType, bool> result;
        for (ChannelType t : u.prefs) {  // loop fragment, in enum order
            try {
                auto it = channels_.find(t);
                if (it == channels_.end()) throw runtime_error("no channel for " + channelName(t));
                it->second->send(u, message);
                result[t] = true;
            } catch (const runtime_error&) {
                result[t] = false;  // alt [failure]: keep going
            }
        }
        return result;
    }

private:
    map<ChannelType, unique_ptr<NotificationChannel>> channels_;
};

string show(const map<ChannelType, bool>& result) {
    string out = "{";
    bool first = true;
    for (const auto& [t, ok] : result) {
        out += (first ? "" : ", ") + channelName(t) + "=" + (ok ? "true" : "false");
        first = false;
    }
    return out + "}";
}

template <typename... Ts>
vector<unique_ptr<NotificationChannel>> channelList(Ts... cs) {
    vector<unique_ptr<NotificationChannel>> v;
    (v.push_back(std::move(cs)), ...);
    return v;
}

int main() {
    User asha{"Asha", "asha@x.com", "+91-90000", {ChannelType::Email, ChannelType::Sms}};
    NotificationService ok(channelList(make_unique<EmailChannel>(), make_unique<SmsChannel>(true), make_unique<PushChannel>()));
    cout << show(ok.notifyUser(asha, "Order 42 shipped")) << "\\n";
    NotificationService smsDown(channelList(make_unique<EmailChannel>(), make_unique<SmsChannel>(false)));
    cout << show(smsDown.notifyUser(asha, "Order 42 shipped")) << "\\n";  // {EMAIL=true, SMS=false}
    User ravi{"Ravi", "ravi@x.com", "+91-80000", {ChannelType::Push}};
    cout << show(smsDown.notifyUser(ravi, "Order 42 shipped")) << "\\n";  // {PUSH=false}: no push channel registered
}` }
      ],
      complexity: `<p>O(P) channel sends per notification for P preferences. Adding a channel: one class + one enum constant, zero service edits.</p>`,
      followUps: ['Make sending asynchronous with retries: where does the queue sit in the sequence diagram?', 'Quiet hours (no SMS between 22:00 and 08:00): a decorator around a channel, or a rule in the service?']
    }
  });

  practice.push({
    title: 'Payroll: Composition Over Inheritance',
    level: 'Medium', tags: ['composition over inheritance', 'interface', 'runtime change'], companies: ['Workday', 'ADP', 'Deel', 'Zoho'],
    statement: `<p>A company pays employees in different ways: <b>salaried</b> (fixed monthly), <b>hourly</b> (rate × hours, 1.5× above 160 hours/month), and <b>commissioned</b> (base + % of sales). Employees can <b>switch</b> pay type (an intern becomes salaried) without losing their id or history. Some employees are also <b>managers</b> who get a fixed allowance on top of any pay type. Design it so that no class explosion (SalariedManager, HourlyManager…) happens.</p>`,
    constraints: `<ul><li>Pay type changes at runtime keep the same Employee object.</li><li>Manager allowance stacks with any pay type.</li><li>Amounts in paise.</li></ul>`,
    example: `${H.table(['employee', 'pay policy', 'input', 'monthly pay'], [['Asha', 'Salaried 80,000', '-', '80,000'], ['Ravi', 'Hourly 500/h', '170 h', '160×500 + 10×750 = 87,500'], ['Mia', 'Commission 20,000 + 5%', 'sales 4,00,000', '40,000'], ['Mia as manager', 'same + 10,000 allowance', 'same', H.c('g', '50,000')]])}`,
    brute: {
      why: `<p>An inheritance tree <code>Employee → SalariedEmployee, HourlyEmployee, CommissionedEmployee</code> plus managers doubles it: <code>SalariedManager, HourlyManager, CommissionedManager</code>. Every new dimension multiplies classes. Worse, switching pay type requires creating a different object, breaking every reference held elsewhere (payslips, org chart) and losing identity.</p>`,
      code: { lang: 'java', code: `
abstract class Employee { String id; abstract long pay(); }
class SalariedEmployee extends Employee { long monthly; long pay() { return monthly; } }
class HourlyEmployee extends Employee { long rate; int hours; long pay() { return rate * hours; } }
class SalariedManager extends SalariedEmployee { long pay() { return super.pay() + 1_000_000; } }
class HourlyManager extends HourlyEmployee { long pay() { return super.pay() + 1_000_000; } }
// CommissionedManager, InternManager, ... the explosion continues`, alt: [
              { lang: 'python', code: `
class Employee:
    def __init__(self, id): self.id = id
    def pay(self): raise NotImplementedError

class SalariedEmployee(Employee):
    def __init__(self, id, monthly): super().__init__(id); self.monthly = monthly
    def pay(self): return self.monthly

class HourlyEmployee(Employee):
    def __init__(self, id, rate, hours): super().__init__(id); self.rate = rate; self.hours = hours
    def pay(self): return self.rate * self.hours

class SalariedManager(SalariedEmployee):
    def pay(self): return super().pay() + 1_000_000

class HourlyManager(HourlyEmployee):
    def pay(self): return super().pay() + 1_000_000
# CommissionedManager, InternManager, ... the explosion continues` },
              { lang: 'ts', code: `
abstract class Employee { constructor(public id: string) {} abstract pay(): number; }
class SalariedEmployee extends Employee { monthly = 0; pay() { return this.monthly; } }
class HourlyEmployee extends Employee { rate = 0; hours = 0; pay() { return this.rate * this.hours; } }
class SalariedManager extends SalariedEmployee { pay() { return super.pay() + 1_000_000; } }
class HourlyManager extends HourlyEmployee { pay() { return super.pay() + 1_000_000; } }
// CommissionedManager, InternManager, ... the explosion continues` },
              { lang: 'cpp', code: `
struct Employee { string id; virtual long long pay() = 0; virtual ~Employee() = default; };
struct SalariedEmployee : Employee { long long monthly = 0; long long pay() override { return monthly; } };
struct HourlyEmployee : Employee { long long rate = 0; int hours = 0; long long pay() override { return rate * hours; } };
struct SalariedManager : SalariedEmployee { long long pay() override { return SalariedEmployee::pay() + 1000000; } };
struct HourlyManager : HourlyEmployee { long long pay() override { return HourlyEmployee::pay() + 1000000; } };
// CommissionedManager, InternManager, ... the explosion continues` }
            ] }
    },
    mcq: { q: 'An intern becomes a salaried employee. With which design is that a one-line change on the same object?', options: ['class Intern extends Employee, class Salaried extends Employee', 'Employee has a PayPolicy field; call employee.changePolicy(new Salaried(...))', 'A String payType field with a switch in pay()', 'Delete the intern and create a new employee'], answer: 1, explain: 'Composition with a behaviour object (a policy/strategy) lets behaviour change at runtime while identity stays the same.' },
    hints: [
      `<p>Hint 1: identify the axes of variation: (a) how pay is computed, (b) whether a manager allowance applies. Neither is a "kind of employee"; both are things an employee <b>has</b>.</p>`,
      `<p>Hint 2: <code>interface PayPolicy { long monthlyPay(WorkLog log); }</code> implemented by Salaried/Hourly/Commission value classes. Employee holds one policy (association to a behaviour object).</p>`,
      `<p>Hint 3: manager allowance: an optional <code>long allowancePaise</code> on Employee or a role object. Pay = policy.monthlyPay(log) + allowance.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "8750000\n5000000\nE9 6000000\n" }] },
    solution: {
      approach: `<p>Employee (entity: id, name) <b>has a</b> PayPolicy (interface; Salaried, Hourly, Commission implement it) and an optional ManagerRole value. Pay type and managerial status vary independently, so we compose them instead of multiplying subclasses (N policies + 1 role instead of N × 2 classes). <code>WorkLog</code> is an immutable value type carrying hours and sales for the month. Changing policy keeps the same Employee object and id.</p>`,
      code: `
record WorkLog(int hours, long salesPaise) { }

interface PayPolicy { long monthlyPay(WorkLog log); }

record Salaried(long monthlyPaise) implements PayPolicy {
    public long monthlyPay(WorkLog log) { return monthlyPaise; }
}
record Hourly(long ratePaise) implements PayPolicy {
    public long monthlyPay(WorkLog log) {
        int normal = Math.min(160, log.hours()), extra = Math.max(0, log.hours() - 160);
        return normal * ratePaise + extra * ratePaise * 3 / 2;
    }
}
record Commission(long basePaise, int percent) implements PayPolicy {
    public long monthlyPay(WorkLog log) { return basePaise + log.salesPaise() * percent / 100; }
}

record ManagerRole(long allowancePaise) { }

class Employee {
    private final String id, name;
    private PayPolicy policy;
    private ManagerRole managerRole;                  // 0..1
    Employee(String id, String name, PayPolicy policy) { this.id = id; this.name = name; this.policy = Objects.requireNonNull(policy); }
    void changePolicy(PayPolicy p) { policy = Objects.requireNonNull(p); }   // same object, new behaviour
    void makeManager(long allowance) { managerRole = new ManagerRole(allowance); }
    long pay(WorkLog log) {
        return policy.monthlyPay(log) + (managerRole == null ? 0 : managerRole.allowancePaise());
    }
    String id() { return id; }

    public static void main(String[] args) {
        Employee ravi = new Employee("E2", "Ravi", new Hourly(50000));
        System.out.println(ravi.pay(new WorkLog(170, 0)));          // 8750000
        Employee mia = new Employee("E3", "Mia", new Commission(2000000, 5));
        mia.makeManager(1000000);
        System.out.println(mia.pay(new WorkLog(0, 40000000)));     // 5000000
        Employee intern = new Employee("E9", "Kiran", new Hourly(20000));
        intern.changePolicy(new Salaried(6000000));                 // promotion: same id E9
        System.out.println(intern.id() + " " + intern.pay(new WorkLog(0, 0)));
    }
}`,
      alt: [
        { lang: 'python', code: `
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class WorkLog:
    hours: int
    sales_paise: int


class PayPolicy(Protocol):
    def monthly_pay(self, log: WorkLog) -> int: ...


@dataclass(frozen=True)
class Salaried:
    monthly_paise: int

    def monthly_pay(self, log: WorkLog) -> int:
        return self.monthly_paise


@dataclass(frozen=True)
class Hourly:
    rate_paise: int

    def monthly_pay(self, log: WorkLog) -> int:
        normal = min(160, log.hours)
        extra = max(0, log.hours - 160)
        return normal * self.rate_paise + extra * self.rate_paise * 3 // 2


@dataclass(frozen=True)
class Commission:
    base_paise: int
    percent: int

    def monthly_pay(self, log: WorkLog) -> int:
        return self.base_paise + log.sales_paise * self.percent // 100


@dataclass(frozen=True)
class ManagerRole:
    allowance_paise: int


class Employee:
    def __init__(self, emp_id: str, name: str, policy: PayPolicy) -> None:
        self.id = emp_id
        self.name = name
        self._policy = policy
        self._manager_role: ManagerRole | None = None  # 0..1

    def change_policy(self, p: PayPolicy) -> None:  # same object, new behaviour
        self._policy = p

    def make_manager(self, allowance: int) -> None:
        self._manager_role = ManagerRole(allowance)

    def pay(self, log: WorkLog) -> int:
        bonus = 0 if self._manager_role is None else self._manager_role.allowance_paise
        return self._policy.monthly_pay(log) + bonus


def main() -> None:
    ravi = Employee("E2", "Ravi", Hourly(50000))
    print(ravi.pay(WorkLog(170, 0)))  # 8750000
    mia = Employee("E3", "Mia", Commission(2000000, 5))
    mia.make_manager(1000000)
    print(mia.pay(WorkLog(0, 40000000)))  # 5000000
    intern = Employee("E9", "Kiran", Hourly(20000))
    intern.change_policy(Salaried(6000000))  # promotion: same id E9
    print(intern.id, intern.pay(WorkLog(0, 0)))


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
interface WorkLog { readonly hours: number; readonly salesPaise: number; }

interface PayPolicy { monthlyPay(log: WorkLog): number; }

class Salaried implements PayPolicy {
  constructor(readonly monthlyPaise: number) {}
  monthlyPay(_log: WorkLog): number { return this.monthlyPaise; }
}

class Hourly implements PayPolicy {
  constructor(readonly ratePaise: number) {}
  monthlyPay(log: WorkLog): number {
    const normal = Math.min(160, log.hours), extra = Math.max(0, log.hours - 160);
    return normal * this.ratePaise + Math.floor((extra * this.ratePaise * 3) / 2);
  }
}

class Commission implements PayPolicy {
  constructor(readonly basePaise: number, readonly percent: number) {}
  monthlyPay(log: WorkLog): number {
    return this.basePaise + Math.floor((log.salesPaise * this.percent) / 100);
  }
}

interface ManagerRole { readonly allowancePaise: number; }

class Employee {
  private managerRole: ManagerRole | null = null; // 0..1
  constructor(private readonly empId: string, private readonly name: string, private policy: PayPolicy) {}
  changePolicy(p: PayPolicy): void { this.policy = p; } // same object, new behaviour
  makeManager(allowance: number): void { this.managerRole = { allowancePaise: allowance }; }
  pay(log: WorkLog): number {
    return this.policy.monthlyPay(log) + (this.managerRole?.allowancePaise ?? 0);
  }
  id(): string { return this.empId; }
}

function main(): void {
  const ravi = new Employee("E2", "Ravi", new Hourly(50000));
  console.log(ravi.pay({ hours: 170, salesPaise: 0 })); // 8750000
  const mia = new Employee("E3", "Mia", new Commission(2000000, 5));
  mia.makeManager(1000000);
  console.log(mia.pay({ hours: 0, salesPaise: 40000000 })); // 5000000
  const intern = new Employee("E9", "Kiran", new Hourly(20000));
  intern.changePolicy(new Salaried(6000000)); // promotion: same id E9
  console.log(intern.id() + " " + intern.pay({ hours: 0, salesPaise: 0 }));
}
main();` },
        { lang: 'cpp', code: `
struct WorkLog {
    int hours;
    long long salesPaise;
};

class PayPolicy {
public:
    virtual ~PayPolicy() = default;
    virtual long long monthlyPay(const WorkLog& log) const = 0;
};

class Salaried : public PayPolicy {
public:
    explicit Salaried(long long monthlyPaise) : monthlyPaise_(monthlyPaise) {}
    long long monthlyPay(const WorkLog&) const override { return monthlyPaise_; }
private:
    long long monthlyPaise_;
};

class Hourly : public PayPolicy {
public:
    explicit Hourly(long long ratePaise) : ratePaise_(ratePaise) {}
    long long monthlyPay(const WorkLog& log) const override {
        long long normal = min(160, log.hours), extra = max(0, log.hours - 160);
        return normal * ratePaise_ + extra * ratePaise_ * 3 / 2;
    }
private:
    long long ratePaise_;
};

class Commission : public PayPolicy {
public:
    Commission(long long basePaise, int percent) : basePaise_(basePaise), percent_(percent) {}
    long long monthlyPay(const WorkLog& log) const override { return basePaise_ + log.salesPaise * percent_ / 100; }
private:
    long long basePaise_;
    int percent_;
};

struct ManagerRole {
    long long allowancePaise;
};

class Employee {
public:
    Employee(string id, string name, unique_ptr<PayPolicy> policy)
        : id_(std::move(id)), name_(std::move(name)), policy_(std::move(policy)) {
        if (!policy_) throw invalid_argument("policy required");
    }
    void changePolicy(unique_ptr<PayPolicy> p) {  // same object, new behaviour
        if (!p) throw invalid_argument("policy required");
        policy_ = std::move(p);
    }
    void makeManager(long long allowance) { managerRole_ = ManagerRole{allowance}; }
    long long pay(const WorkLog& log) const {
        return policy_->monthlyPay(log) + (managerRole_ ? managerRole_->allowancePaise : 0);
    }
    const string& id() const { return id_; }
private:
    string id_, name_;
    unique_ptr<PayPolicy> policy_;       // owned strategy, swapped on promotion
    optional<ManagerRole> managerRole_;  // 0..1
};

int main() {
    Employee ravi("E2", "Ravi", make_unique<Hourly>(50000));
    cout << ravi.pay({170, 0}) << "\\n";  // 8750000
    Employee mia("E3", "Mia", make_unique<Commission>(2000000, 5));
    mia.makeManager(1000000);
    cout << mia.pay({0, 40000000}) << "\\n";  // 5000000
    Employee intern("E9", "Kiran", make_unique<Hourly>(20000));
    intern.changePolicy(make_unique<Salaried>(6000000));  // promotion: same id E9
    cout << intern.id() << " " << intern.pay({0, 0}) << "\\n";
}` }
      ],
      complexity: `<p>pay is O(1). Classes grow as P + R (policies + roles) instead of P × R. Policy objects are immutable value objects and can be shared between employees.</p>`,
      followUps: ['Payroll must keep history of past policies for audit: what new class appears?', 'This "policy object" is the Strategy pattern: when would you still prefer inheritance?']
    }
  });

  practice.push({
    title: 'Social Feed: Users, Posts, Comments, Likes and Follows',
    level: 'Medium', tags: ['self-association', 'composition', 'uniqueness', 'navigability'], companies: ['Meta', 'LinkedIn', 'ShareChat', 'X'],
    statement: `<p>Users can <b>follow</b> other users (not themselves), create <b>posts</b>, <b>comment</b> on posts, and <b>like</b> a post at most once. Deleting a post deletes its comments and likes. Deleting a user is out of scope. A user's <b>feed</b> shows posts by people they follow, newest first. Model the relationships carefully (including the User → User link) and implement follow, post, comment, like and feed.</p>`,
    constraints: `<ul><li>Like is idempotent per (user, post).</li><li>Follow is one-way (like Instagram, not Facebook friends).</li><li>Use a logical clock (increasing counter) for "newest first".</li></ul>`,
    example: `<p>Asha follows Ravi and Mia. Ravi posts P1, Mia posts P2, Kiran posts P3. Asha's feed → ${H.c('g', '[P2, P1]')} (P3 excluded: not followed). Asha likes P1 twice → like count ${H.c('y', '1')}. Ravi deletes P1 → its comments vanish.</p>`,
    brute: {
      why: `<p>The naive design keeps global lists: <code>List&lt;String[]&gt; follows</code>, <code>List&lt;String[]&gt; likes</code>, <code>List&lt;String[]&gt; comments</code>. Deleting a post means scanning three lists and remembering each one; likes are duplicated because nothing enforces uniqueness; building a feed scans every post in the system for every request.</p>`,
      code: { lang: 'java', code: `
class SocialApp {
    List<String[]> follows = new ArrayList<>();    // [follower, followee]
    List<String[]> posts = new ArrayList<>();      // [id, author, text]
    List<String[]> likes = new ArrayList<>();      // duplicates possible
    List<String[]> comments = new ArrayList<>();   // orphaned after post deletion
}`, alt: [
              { lang: 'python', code: `
class SocialApp:
    def __init__(self):
        self.follows = []    # [follower, followee]
        self.posts = []      # [id, author, text]
        self.likes = []      # duplicates possible
        self.comments = []   # orphaned after post deletion` },
              { lang: 'ts', code: `
class SocialApp {
    follows: string[][] = [];    // [follower, followee]
    posts: string[][] = [];      // [id, author, text]
    likes: string[][] = [];      // duplicates possible
    comments: string[][] = [];   // orphaned after post deletion
}` },
              { lang: 'cpp', code: `
struct SocialApp {
    vector<array<string, 2>> follows;    // [follower, followee]
    vector<array<string, 3>> posts;      // [id, author, text]
    vector<array<string, 2>> likes;      // duplicates possible
    vector<array<string, 3>> comments;   // orphaned after post deletion
};` }
            ] }
    },
    mcq: { q: 'How do you guarantee a user likes a post at most once?', options: ['Check a List&lt;String&gt; of likers with contains() and hope callers use it', 'Post holds a Set&lt;User&gt; likedBy and like() returns set.add(user)', 'A static counter', 'Store likes in User only'], answer: 1, explain: 'A Set gives uniqueness by construction, and keeping it inside Post (which owns its likes) means one place enforces the rule.' },
    hints: [
      `<p>Hint 1: follow is a <b>self-association</b> User → 0..* User. One-way, so each User keeps a <code>Set&lt;User&gt; following</code>.</p>`,
      `<p>Hint 2: <code>Post ◆ 0..* Comment</code> (deleted together) and <code>Post → 0..* User</code> for likes (a Set). Users are referenced, never owned.</p>`,
      `<p>Hint 3: feed = posts of everyone in <code>following</code>, sorted by timestamp descending. A <code>SocialNetwork</code> coordinator holds users and posts and generates ids/timestamps.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "[2, 1]\n1\nonly the author can delete\n[2]\n" }] },
    solution: {
      approach: `<p><b>User → 0..* User</b> (following, one-way self-association). <b>User 1 — 0..* Post</b> (author). <b>Post ◆ 0..* Comment</b>, <b>Post → 0..* User</b> as a Set of likers. <b>SocialNetwork ◆ users, posts</b> (coordinator and in-memory store) generates ids and a logical clock. Each rule sits with the owner: self-follow check in User.follow, like uniqueness in Post.like, cascade delete by removing the Post (its comments go with it).</p>`,
      code: `
class User {
    private final String handle;
    private final Set<User> following = new LinkedHashSet<>();    // self-association
    User(String handle) { this.handle = handle; }
    void follow(User other) {
        if (other == this) throw new IllegalArgumentException("cannot follow yourself");
        following.add(other);
    }
    boolean follows(User u) { return following.contains(u); }
    String handle() { return handle; }
}

record Comment(User author, String text) { }

class Post {
    private final long id, createdAt;
    private final User author;
    private final String text;
    private final List<Comment> comments = new ArrayList<>();     // composition
    private final Set<User> likedBy = new HashSet<>();             // association, unique
    Post(long id, User author, String text, long createdAt) { this.id = id; this.author = author; this.text = text; this.createdAt = createdAt; }
    boolean like(User u) { return likedBy.add(u); }                 // idempotent
    void comment(User u, String t) { comments.add(new Comment(u, t)); }
    int likes() { return likedBy.size(); }
    User author() { return author; }
    long createdAt() { return createdAt; }
    long id() { return id; }
}

class SocialNetwork {
    private final Map<Long, Post> posts = new HashMap<>();
    private long clock = 0;
    Post post(User author, String text) {
        long t = ++clock;                                            // logical clock doubles as id
        Post p = new Post(t, author, text, t);
        posts.put(p.id(), p);
        return p;
    }
    void delete(Post p, User requester) {
        if (p.author() != requester) throw new IllegalStateException("only the author can delete");
        posts.remove(p.id());                                        // comments and likes go with it
    }
    List<Post> feed(User viewer) {
        List<Post> out = new ArrayList<>();
        for (Post p : posts.values()) if (viewer.follows(p.author())) out.add(p);
        out.sort(Comparator.comparingLong(Post::createdAt).reversed());
        return out;
    }

    public static void main(String[] args) {
        User asha = new User("asha"), ravi = new User("ravi"), mia = new User("mia"), kiran = new User("kiran");
        asha.follow(ravi); asha.follow(mia);
        SocialNetwork net = new SocialNetwork();
        Post p1 = net.post(ravi, "hello"), p2 = net.post(mia, "chai?");
        net.post(kiran, "not followed");
        System.out.println(net.feed(asha).stream().map(Post::id).toList());   // [2, 1]
        p1.like(asha); p1.like(asha);
        System.out.println(p1.likes());                                       // 1
        p2.comment(asha, "yes!");
        try { net.delete(p1, asha); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }   // not her post
        net.delete(p1, ravi);
        System.out.println(net.feed(asha).stream().map(Post::id).toList());   // [2]
    }
}`,
      alt: [
        { lang: 'python', code: `
from __future__ import annotations

from dataclasses import dataclass


class User:
    def __init__(self, handle: str) -> None:
        self.handle = handle
        self._following: dict[User, None] = {}  # self-association, insertion ordered set

    def follow(self, other: User) -> None:
        if other is self:
            raise ValueError("cannot follow yourself")
        self._following[other] = None

    def follows(self, u: User) -> bool:
        return u in self._following


@dataclass(frozen=True)
class Comment:
    author: User
    text: str


class Post:
    def __init__(self, post_id: int, author: User, text: str, created_at: int) -> None:
        self.id = post_id
        self.author = author
        self.text = text
        self.created_at = created_at
        self._comments: list[Comment] = []  # composition
        self._liked_by: set[User] = set()  # association, unique

    def like(self, u: User) -> bool:  # idempotent
        if u in self._liked_by:
            return False
        self._liked_by.add(u)
        return True

    def comment(self, u: User, text: str) -> None:
        self._comments.append(Comment(u, text))

    def likes(self) -> int:
        return len(self._liked_by)


class SocialNetwork:
    def __init__(self) -> None:
        self._posts: dict[int, Post] = {}
        self._clock = 0

    def post(self, author: User, text: str) -> Post:
        self._clock += 1  # logical clock doubles as id
        p = Post(self._clock, author, text, self._clock)
        self._posts[p.id] = p
        return p

    def delete(self, p: Post, requester: User) -> None:
        if p.author is not requester:
            raise RuntimeError("only the author can delete")
        del self._posts[p.id]  # comments and likes go with it

    def feed(self, viewer: User) -> list[Post]:
        mine = [p for p in self._posts.values() if viewer.follows(p.author)]
        return sorted(mine, key=lambda p: p.created_at, reverse=True)


def main() -> None:
    asha, ravi, mia, kiran = User("asha"), User("ravi"), User("mia"), User("kiran")
    asha.follow(ravi)
    asha.follow(mia)
    net = SocialNetwork()
    p1, p2 = net.post(ravi, "hello"), net.post(mia, "chai?")
    net.post(kiran, "not followed")
    print([p.id for p in net.feed(asha)])  # [2, 1]
    p1.like(asha)
    p1.like(asha)
    print(p1.likes())  # 1
    p2.comment(asha, "yes!")
    try:
        net.delete(p1, asha)  # not her post
    except RuntimeError as e:
        print(e)
    net.delete(p1, ravi)
    print([p.id for p in net.feed(asha)])  # [2]


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
class User {
  private readonly following = new Set<User>(); // self-association (identity equality)
  constructor(readonly handle: string) {}
  follow(other: User): void {
    if (other === this) throw new Error("cannot follow yourself");
    this.following.add(other);
  }
  follows(u: User): boolean { return this.following.has(u); }
}

interface Comment {
  readonly author: User;
  readonly text: string;
}

class Post {
  private readonly comments: Comment[] = []; // composition
  private readonly likedBy = new Set<User>(); // association, unique
  constructor(
    readonly id: number,
    private readonly authorUser: User,
    readonly text: string,
    readonly createdAt: number,
  ) {}
  like(u: User): boolean { // idempotent
    if (this.likedBy.has(u)) return false;
    this.likedBy.add(u);
    return true;
  }
  comment(u: User, text: string): void { this.comments.push({ author: u, text }); }
  likes(): number { return this.likedBy.size; }
  author(): User { return this.authorUser; }
}

class SocialNetwork {
  private readonly posts = new Map<number, Post>();
  private clock = 0;

  post(author: User, text: string): Post {
    const t = ++this.clock; // logical clock doubles as id
    const p = new Post(t, author, text, t);
    this.posts.set(p.id, p);
    return p;
  }
  delete(p: Post, requester: User): void {
    if (p.author() !== requester) throw new Error("only the author can delete");
    this.posts.delete(p.id); // comments and likes go with it
  }
  feed(viewer: User): Post[] {
    return [...this.posts.values()]
      .filter((p) => viewer.follows(p.author()))
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}

function main(): void {
  const asha = new User("asha"), ravi = new User("ravi"), mia = new User("mia"), kiran = new User("kiran");
  asha.follow(ravi);
  asha.follow(mia);
  const net = new SocialNetwork();
  const p1 = net.post(ravi, "hello"), p2 = net.post(mia, "chai?");
  net.post(kiran, "not followed");
  const ids = (viewer: User): string => "[" + net.feed(viewer).map((p) => p.id).join(", ") + "]";
  console.log(ids(asha)); // [2, 1]
  p1.like(asha);
  p1.like(asha);
  console.log(p1.likes()); // 1
  p2.comment(asha, "yes!");
  try {
    net.delete(p1, asha); // not her post
  } catch (e) {
    console.log((e as Error).message);
  }
  net.delete(p1, ravi);
  console.log(ids(asha)); // [2]
}
main();` },
        { lang: 'cpp', code: `
class User {
public:
    explicit User(string handle) : handle_(std::move(handle)) {}
    void follow(User& other) {
        if (&other == this) throw invalid_argument("cannot follow yourself");
        following_.insert(&other);
    }
    bool follows(const User& u) const { return following_.count(&u) > 0; }
    const string& handle() const { return handle_; }
private:
    string handle_;
    set<const User*> following_;  // self-association: non-owning, identity compared
};

struct Comment {
    const User* author;
    string text;
};

class Post {
public:
    Post(long long id, const User& author, string text, long long createdAt)
        : id_(id), author_(&author), text_(std::move(text)), createdAt_(createdAt) {}
    bool like(const User& u) { return likedBy_.insert(&u).second; }  // idempotent
    void comment(const User& u, const string& t) { comments_.push_back({&u, t}); }
    int likes() const { return static_cast<int>(likedBy_.size()); }
    const User& author() const { return *author_; }
    long long createdAt() const { return createdAt_; }
    long long id() const { return id_; }
private:
    long long id_;
    const User* author_;
    string text_;
    long long createdAt_;
    vector<Comment> comments_;          // composition
    set<const User*> likedBy_;          // association, unique
};

class SocialNetwork {
public:
    Post& post(const User& author, const string& text) {
        long long t = ++clock_;  // logical clock doubles as id
        auto p = make_unique<Post>(t, author, text, t);
        Post& ref = *p;
        posts_[t] = std::move(p);
        return ref;
    }
    void deletePost(const Post& p, const User& requester) {  // \`delete\` is a C++ keyword
        if (&p.author() != &requester) throw runtime_error("only the author can delete");
        posts_.erase(p.id());  // comments and likes go with it
    }
    vector<const Post*> feed(const User& viewer) const {
        vector<const Post*> out;
        for (const auto& [id, p] : posts_)
            if (viewer.follows(p->author())) out.push_back(p.get());
        sort(out.begin(), out.end(), [](const Post* a, const Post* b) { return a->createdAt() > b->createdAt(); });
        return out;
    }
private:
    map<long long, unique_ptr<Post>> posts_;  // the network owns every post
    long long clock_ = 0;
};

string ids(const vector<const Post*>& posts) {
    string out = "[";
    for (size_t i = 0; i < posts.size(); ++i) out += (i ? ", " : "") + to_string(posts[i]->id());
    return out + "]";
}

int main() {
    User asha("asha"), ravi("ravi"), mia("mia"), kiran("kiran");
    asha.follow(ravi);
    asha.follow(mia);
    SocialNetwork net;
    Post& p1 = net.post(ravi, "hello");
    Post& p2 = net.post(mia, "chai?");
    net.post(kiran, "not followed");
    cout << ids(net.feed(asha)) << "\\n";  // [2, 1]
    p1.like(asha);
    p1.like(asha);
    cout << p1.likes() << "\\n";  // 1
    p2.comment(asha, "yes!");
    try {
        net.deletePost(p1, asha);  // not her post
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";
    }
    net.deletePost(p1, ravi);
    cout << ids(net.feed(asha)) << "\\n";  // [2]
}` }
      ],
      complexity: `<p>follow/like/comment O(1). Feed is O(P log P) over all posts here; production systems precompute feeds (fan-out on write) or merge per-followee timelines with a heap (fan-out on read).</p>`,
      followUps: ['Mutual friendship (Facebook-style): how does the self-association change?', 'Who should own "unfollow removes their posts from my cached feed"?']
    }
  });

  practice.push({
    title: 'ATM Withdrawal from a Sequence Diagram (with PIN Retries)',
    level: 'Medium', tags: ['sequence diagram', 'alt fragment', 'state', 'responsibility'], companies: ['NCR', 'Diebold', 'HDFC', 'Goldman Sachs'],
    statement: `<p>Implement the classes behind this flow: Customer inserts card → <code>ATM → CardReader: read()</code> → Customer enters PIN → <code>ATM → Bank: verifyPin(card, pin)</code>; <b>alt</b> wrong PIN: allow 3 attempts, then <code>ATM → CardReader: retain()</code>; <b>else</b>: Customer requests amount → <code>ATM → Bank: debit(account, amount)</code> → <b>alt</b> approved: <code>ATM → CashDispenser: dispense(amount)</code> using ₹500 and ₹100 notes (fewest notes) → print receipt; <b>else</b> show "insufficient funds".</p>`,
    constraints: `<ul><li>Amount must be a positive multiple of 100.</li><li>Dispenser has limited notes; if it cannot make the amount, do not debit.</li><li>3 wrong PINs → card retained, session ends.</li></ul>`,
    example: `<p>Balance ₹2,000; dispenser has 2 × ₹500 and 10 × ₹100. Withdraw ₹1,300 → dispense ${H.c('g', '2×500 + 3×100')}, balance ₹700. Withdraw ₹250 → ${H.c('r', 'rejected')} (not a multiple of 100). Wrong PIN 3 times → ${H.c('r', 'card retained')}.</p>`,
    brute: {
      why: `<p>The naive version is a single <code>Atm.run()</code> method with nested ifs: it reads the PIN, compares it with a hard-coded map, subtracts from a balance map, and computes notes inline. The order of checks is easy to get wrong (debit happens before checking that notes are available, so the customer loses money without cash). There are no seams to test the dispenser or the bank separately.</p>`,
      code: { lang: 'java', code: `
class AtmGod {
    Map<String, Integer> pins = new HashMap<>(), balances = new HashMap<>();
    int notes500 = 2, notes100 = 10;
    String run(String card, int pin, int amount) {
        if (pins.get(card) != pin) return "wrong pin";          // no retry count, no retention
        balances.merge(card, -amount, Integer::sum);             // debited first...
        int n5 = Math.min(amount / 500, notes500);
        int rest = amount - n5 * 500;
        if (rest / 100 > notes100) return "cannot dispense";    // ...money already gone
        return "ok";
    }
}`, alt: [
              { lang: 'python', code: `
class AtmGod:
    def __init__(self):
        self.pins, self.balances = {}, {}
        self.notes500, self.notes100 = 2, 10

    def run(self, card, pin, amount):
        if self.pins.get(card) != pin: return "wrong pin"       # no retry count, no retention
        self.balances[card] = self.balances.get(card, 0) - amount   # debited first...
        n5 = min(amount // 500, self.notes500)
        rest = amount - n5 * 500
        if rest // 100 > self.notes100: return "cannot dispense"   # ...money already gone
        return "ok"` },
              { lang: 'ts', code: `
class AtmGod {
    pins = new Map<string, number>(); balances = new Map<string, number>();
    notes500 = 2; notes100 = 10;
    run(card: string, pin: number, amount: number): string {
        if (this.pins.get(card) !== pin) return "wrong pin";          // no retry count, no retention
        this.balances.set(card, (this.balances.get(card) ?? 0) - amount);   // debited first...
        const n5 = Math.min(Math.floor(amount / 500), this.notes500);
        const rest = amount - n5 * 500;
        if (Math.floor(rest / 100) > this.notes100) return "cannot dispense";   // ...money already gone
        return "ok";
    }
}` },
              { lang: 'cpp', code: `
class AtmGod {
    unordered_map<string, int> pins, balances;
    int notes500 = 2, notes100 = 10;
public:
    string run(const string& card, int pin, int amount) {
        if (pins[card] != pin) return "wrong pin";          // no retry count, no retention
        balances[card] -= amount;                           // debited first...
        int n5 = min(amount / 500, notes500);
        int rest = amount - n5 * 500;
        if (rest / 100 > notes100) return "cannot dispense";   // ...money already gone
        return "ok";
    }
};` }
            ] }
    },
    mcq: { q: 'Which order avoids taking money without giving cash?', options: ['debit → check notes → dispense', 'check notes can make the amount → debit → dispense', 'dispense → debit', 'Order does not matter'], answer: 1, explain: 'Ask the CashDispenser whether it can make the amount before the bank debit. The sequence diagram is the place to get this order right.' },
    hints: [
      `<p>Hint 1: lifelines → classes: Atm (coordinator), CardReader, Bank, CashDispenser. Each arrow → method on the receiver.</p>`,
      `<p>Hint 2: Atm keeps per-session state: current card and failed attempts. The PIN check lives in Bank (it owns secrets); the note maths lives in CashDispenser (it owns notes).</p>`,
      `<p>Hint 3: dispenser exposes <code>canDispense(amount)</code> (greedy 500s then 100s within stock) and <code>dispense(amount)</code>. Withdraw: validate amount → canDispense → bank.debit → dispense → receipt.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "PIN ok\nDispensed 2x500 + 3x100, balance 700\nAmount must be a multiple of 100\nATM cannot dispense this amount\nDispensed 0x500 + 7x100, balance 0\nEnter PIN first\nWrong PIN, 2 left\nWrong PIN, 1 left\nCard retained\n" }] },
    solution: {
      approach: `<p>Map the sequence 1:1. <code>Atm</code> coordinates and holds session state (card, attempts). <code>CardReader</code> reads/retains. <code>Bank</code> verifies PINs and debits (information expert for accounts). <code>CashDispenser</code> owns note counts and the fewest-notes algorithm. The alt fragments become if/else in Atm. Crucially, the dispenser feasibility check runs <b>before</b> the debit.</p>`,
      code: `
class CardReader {
    private String inserted;
    private final List<String> retained = new ArrayList<>();
    void insert(String card) { inserted = card; }
    String read() { return inserted; }
    void retain() { retained.add(inserted); inserted = null; }
    void eject() { inserted = null; }
}

class Bank {
    private final Map<String, Integer> pins = new HashMap<>();
    private final Map<String, Long> balances = new HashMap<>();
    void open(String card, int pin, long balance) { pins.put(card, pin); balances.put(card, balance); }
    boolean verifyPin(String card, int pin) { return Objects.equals(pins.get(card), pin); }
    boolean debit(String card, long amount) {
        long b = balances.getOrDefault(card, 0L);
        if (amount > b) return false;
        balances.put(card, b - amount);
        return true;
    }
    long balance(String card) { return balances.get(card); }
}

class CashDispenser {
    private int n500, n100;
    CashDispenser(int n500, int n100) { this.n500 = n500; this.n100 = n100; }
    private int[] plan(long amount) {
        int use500 = (int) Math.min(amount / 500, n500);
        long rest = amount - use500 * 500L;
        if (rest % 100 != 0 || rest / 100 > n100) return null;
        return new int[]{use500, (int) (rest / 100)};
    }
    boolean canDispense(long amount) { return plan(amount) != null; }
    String dispense(long amount) {
        int[] p = plan(amount);
        n500 -= p[0]; n100 -= p[1];
        return p[0] + "x500 + " + p[1] + "x100";
    }
}

class Atm {
    private static final int MAX_ATTEMPTS = 3;
    private final CardReader reader;
    private final Bank bank;
    private final CashDispenser dispenser;
    private int failed;
    private boolean authenticated;
    Atm(CardReader r, Bank b, CashDispenser d) { reader = r; bank = b; dispenser = d; }

    String enterPin(int pin) {
        if (bank.verifyPin(reader.read(), pin)) { authenticated = true; failed = 0; return "PIN ok"; }
        if (++failed >= MAX_ATTEMPTS) { reader.retain(); return "Card retained"; }   // alt: 3 failures
        return "Wrong PIN, " + (MAX_ATTEMPTS - failed) + " left";
    }

    String withdraw(long amount) {
        if (!authenticated) return "Enter PIN first";
        if (amount <= 0 || amount % 100 != 0) return "Amount must be a multiple of 100";
        if (!dispenser.canDispense(amount)) return "ATM cannot dispense this amount";   // before debit!
        if (!bank.debit(reader.read(), amount)) return "Insufficient funds";            // alt else
        return "Dispensed " + dispenser.dispense(amount) + ", balance " + bank.balance(reader.read());
    }

    public static void main(String[] args) {
        Bank bank = new Bank(); bank.open("C1", 1234, 2000);
        CardReader reader = new CardReader(); reader.insert("C1");
        Atm atm = new Atm(reader, bank, new CashDispenser(2, 10));
        System.out.println(atm.enterPin(1234));
        System.out.println(atm.withdraw(1300));   // 2x500 + 3x100, balance 700
        System.out.println(atm.withdraw(250));    // multiple of 100
        System.out.println(atm.withdraw(1300));   // the 500-rupee notes are gone and only 7 x 100 remain
        System.out.println(atm.withdraw(700));    // 0x500 + 7x100, balance 0
        CardReader reader2 = new CardReader(); reader2.insert("C1");
        Atm atm2 = new Atm(reader2, bank, new CashDispenser(2, 10));
        System.out.println(atm2.withdraw(100));   // Enter PIN first
        System.out.println(atm2.enterPin(1111));  // Wrong PIN, 2 left
        System.out.println(atm2.enterPin(2222));  // Wrong PIN, 1 left
        System.out.println(atm2.enterPin(3333));  // Card retained
    }
}`,
      alt: [
        { lang: 'python', code: `
class CardReader:
    def __init__(self) -> None:
        self._inserted: str | None = None
        self._retained: list[str] = []

    def insert(self, card: str) -> None:
        self._inserted = card

    def read(self) -> str | None:
        return self._inserted

    def retain(self) -> None:
        self._retained.append(self._inserted)
        self._inserted = None

    def eject(self) -> None:
        self._inserted = None


class Bank:
    def __init__(self) -> None:
        self._pins: dict[str, int] = {}
        self._balances: dict[str, int] = {}

    def open(self, card: str, pin: int, balance: int) -> None:
        self._pins[card] = pin
        self._balances[card] = balance

    def verify_pin(self, card: str | None, pin: int) -> bool:
        return card in self._pins and self._pins[card] == pin

    def debit(self, card: str, amount: int) -> bool:
        b = self._balances.get(card, 0)
        if amount > b:
            return False
        self._balances[card] = b - amount
        return True

    def balance(self, card: str) -> int:
        return self._balances[card]


class CashDispenser:
    def __init__(self, n500: int, n100: int) -> None:
        self._n500 = n500
        self._n100 = n100

    def _plan(self, amount: int) -> tuple[int, int] | None:
        use500 = min(amount // 500, self._n500)
        rest = amount - use500 * 500
        if rest % 100 != 0 or rest // 100 > self._n100:
            return None
        return use500, rest // 100

    def can_dispense(self, amount: int) -> bool:
        return self._plan(amount) is not None

    def dispense(self, amount: int) -> str:
        n500, n100 = self._plan(amount)
        self._n500 -= n500
        self._n100 -= n100
        return f"{n500}x500 + {n100}x100"


class Atm:
    MAX_ATTEMPTS = 3

    def __init__(self, reader: CardReader, bank: Bank, dispenser: CashDispenser) -> None:
        self._reader = reader
        self._bank = bank
        self._dispenser = dispenser
        self._failed = 0
        self._authenticated = False

    def enter_pin(self, pin: int) -> str:
        if self._bank.verify_pin(self._reader.read(), pin):
            self._authenticated = True
            self._failed = 0
            return "PIN ok"
        self._failed += 1
        if self._failed >= Atm.MAX_ATTEMPTS:  # alt: 3 failures
            self._reader.retain()
            return "Card retained"
        return f"Wrong PIN, {Atm.MAX_ATTEMPTS - self._failed} left"

    def withdraw(self, amount: int) -> str:
        if not self._authenticated:
            return "Enter PIN first"
        if amount <= 0 or amount % 100 != 0:
            return "Amount must be a multiple of 100"
        if not self._dispenser.can_dispense(amount):
            return "ATM cannot dispense this amount"  # before debit!
        card = self._reader.read()
        if not self._bank.debit(card, amount):
            return "Insufficient funds"  # alt else
        return f"Dispensed {self._dispenser.dispense(amount)}, balance {self._bank.balance(card)}"


def main() -> None:
    bank = Bank()
    bank.open("C1", 1234, 2000)
    reader = CardReader()
    reader.insert("C1")
    atm = Atm(reader, bank, CashDispenser(2, 10))
    print(atm.enter_pin(1234))
    print(atm.withdraw(1300))  # 2x500 + 3x100, balance 700
    print(atm.withdraw(250))  # multiple of 100
    print(atm.withdraw(1300))  # the 500-rupee notes are gone and only 7 x 100 remain
    print(atm.withdraw(700))  # 0x500 + 7x100, balance 0
    reader2 = CardReader()
    reader2.insert("C1")
    atm2 = Atm(reader2, bank, CashDispenser(2, 10))
    print(atm2.withdraw(100))  # Enter PIN first
    print(atm2.enter_pin(1111))  # Wrong PIN, 2 left
    print(atm2.enter_pin(2222))  # Wrong PIN, 1 left
    print(atm2.enter_pin(3333))  # Card retained


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
class CardReader {
  private inserted: string | null = null;
  private readonly retained: string[] = [];
  insert(card: string): void { this.inserted = card; }
  read(): string | null { return this.inserted; }
  retain(): void {
    if (this.inserted !== null) this.retained.push(this.inserted);
    this.inserted = null;
  }
  eject(): void { this.inserted = null; }
}

class Bank {
  private readonly pins = new Map<string, number>();
  private readonly balances = new Map<string, number>();
  open(card: string, pin: number, balance: number): void {
    this.pins.set(card, pin);
    this.balances.set(card, balance);
  }
  verifyPin(card: string | null, pin: number): boolean {
    return card !== null && this.pins.get(card) === pin;
  }
  debit(card: string, amount: number): boolean {
    const b = this.balances.get(card) ?? 0;
    if (amount > b) return false;
    this.balances.set(card, b - amount);
    return true;
  }
  balance(card: string): number { return this.balances.get(card) ?? 0; }
}

class CashDispenser {
  constructor(private n500: number, private n100: number) {}
  private plan(amount: number): [number, number] | null {
    const use500 = Math.min(Math.floor(amount / 500), this.n500);
    const rest = amount - use500 * 500;
    if (rest % 100 !== 0 || rest / 100 > this.n100) return null;
    return [use500, rest / 100];
  }
  canDispense(amount: number): boolean { return this.plan(amount) !== null; }
  dispense(amount: number): string {
    const p = this.plan(amount);
    if (!p) throw new Error("cannot dispense");
    this.n500 -= p[0];
    this.n100 -= p[1];
    return \`\${p[0]}x500 + \${p[1]}x100\`;
  }
}

class Atm {
  private static readonly MAX_ATTEMPTS = 3;
  private failed = 0;
  private authenticated = false;
  constructor(
    private readonly reader: CardReader,
    private readonly bank: Bank,
    private readonly dispenser: CashDispenser,
  ) {}

  enterPin(pin: number): string {
    if (this.bank.verifyPin(this.reader.read(), pin)) {
      this.authenticated = true;
      this.failed = 0;
      return "PIN ok";
    }
    if (++this.failed >= Atm.MAX_ATTEMPTS) { // alt: 3 failures
      this.reader.retain();
      return "Card retained";
    }
    return \`Wrong PIN, \${Atm.MAX_ATTEMPTS - this.failed} left\`;
  }

  withdraw(amount: number): string {
    const card = this.reader.read();
    if (!this.authenticated || card === null) return "Enter PIN first";
    if (amount <= 0 || amount % 100 !== 0) return "Amount must be a multiple of 100";
    if (!this.dispenser.canDispense(amount)) return "ATM cannot dispense this amount"; // before debit!
    if (!this.bank.debit(card, amount)) return "Insufficient funds"; // alt else
    return \`Dispensed \${this.dispenser.dispense(amount)}, balance \${this.bank.balance(card)}\`;
  }
}

function main(): void {
  const bank = new Bank();
  bank.open("C1", 1234, 2000);
  const reader = new CardReader();
  reader.insert("C1");
  const atm = new Atm(reader, bank, new CashDispenser(2, 10));
  console.log(atm.enterPin(1234));
  console.log(atm.withdraw(1300)); // 2x500 + 3x100, balance 700
  console.log(atm.withdraw(250)); // multiple of 100
  console.log(atm.withdraw(1300)); // the 500-rupee notes are gone and only 7 x 100 remain
  console.log(atm.withdraw(700)); // 0x500 + 7x100, balance 0
  const reader2 = new CardReader();
  reader2.insert("C1");
  const atm2 = new Atm(reader2, bank, new CashDispenser(2, 10));
  console.log(atm2.withdraw(100)); // Enter PIN first
  console.log(atm2.enterPin(1111)); // Wrong PIN, 2 left
  console.log(atm2.enterPin(2222)); // Wrong PIN, 1 left
  console.log(atm2.enterPin(3333)); // Card retained
}
main();` },
        { lang: 'cpp', code: `
class CardReader {
public:
    void insert(const string& card) { inserted_ = card; }
    const optional<string>& read() const { return inserted_; }
    void retain() {
        if (inserted_) retained_.push_back(*inserted_);
        inserted_.reset();
    }
    void eject() { inserted_.reset(); }
private:
    optional<string> inserted_;
    vector<string> retained_;
};

class Bank {
public:
    void open(const string& card, int pin, long long balance) {
        pins_[card] = pin;
        balances_[card] = balance;
    }
    bool verifyPin(const optional<string>& card, int pin) const {
        if (!card) return false;
        auto it = pins_.find(*card);
        return it != pins_.end() && it->second == pin;
    }
    bool debit(const string& card, long long amount) {
        long long b = balances_[card];
        if (amount > b) return false;
        balances_[card] = b - amount;
        return true;
    }
    long long balance(const string& card) const { return balances_.at(card); }
private:
    map<string, int> pins_;
    map<string, long long> balances_;
};

class CashDispenser {
public:
    CashDispenser(int n500, int n100) : n500_(n500), n100_(n100) {}
    bool canDispense(long long amount) const { return plan(amount).has_value(); }
    string dispense(long long amount) {
        auto p = plan(amount);
        if (!p) throw runtime_error("cannot dispense");
        n500_ -= p->first;
        n100_ -= p->second;
        return to_string(p->first) + "x500 + " + to_string(p->second) + "x100";
    }
private:
    optional<pair<int, int>> plan(long long amount) const {
        int use500 = static_cast<int>(min<long long>(amount / 500, n500_));
        long long rest = amount - use500 * 500LL;
        if (rest % 100 != 0 || rest / 100 > n100_) return nullopt;
        return pair<int, int>{use500, static_cast<int>(rest / 100)};
    }
    int n500_, n100_;
};

class Atm {
public:
    Atm(CardReader& r, Bank& b, CashDispenser& d) : reader_(r), bank_(b), dispenser_(d) {}

    string enterPin(int pin) {
        if (bank_.verifyPin(reader_.read(), pin)) {
            authenticated_ = true;
            failed_ = 0;
            return "PIN ok";
        }
        if (++failed_ >= MAX_ATTEMPTS) {  // alt: 3 failures
            reader_.retain();
            return "Card retained";
        }
        return "Wrong PIN, " + to_string(MAX_ATTEMPTS - failed_) + " left";
    }

    string withdraw(long long amount) {
        if (!authenticated_ || !reader_.read()) return "Enter PIN first";
        if (amount <= 0 || amount % 100 != 0) return "Amount must be a multiple of 100";
        if (!dispenser_.canDispense(amount)) return "ATM cannot dispense this amount";  // before debit!
        const string card = *reader_.read();
        if (!bank_.debit(card, amount)) return "Insufficient funds";  // alt else
        return "Dispensed " + dispenser_.dispense(amount) + ", balance " + to_string(bank_.balance(card));
    }

private:
    static constexpr int MAX_ATTEMPTS = 3;
    CardReader& reader_;
    Bank& bank_;
    CashDispenser& dispenser_;
    int failed_ = 0;
    bool authenticated_ = false;
};

int main() {
    Bank bank;
    bank.open("C1", 1234, 2000);
    CardReader reader;
    reader.insert("C1");
    CashDispenser cash(2, 10);
    Atm atm(reader, bank, cash);
    cout << atm.enterPin(1234) << "\\n";
    cout << atm.withdraw(1300) << "\\n";  // 2x500 + 3x100, balance 700
    cout << atm.withdraw(250) << "\\n";   // multiple of 100
    cout << atm.withdraw(1300) << "\\n";  // the 500-rupee notes are gone and only 7 x 100 remain
    cout << atm.withdraw(700) << "\\n";   // 0x500 + 7x100, balance 0
    CardReader reader2;
    reader2.insert("C1");
    CashDispenser cash2(2, 10);
    Atm atm2(reader2, bank, cash2);
    cout << atm2.withdraw(100) << "\\n";  // Enter PIN first
    cout << atm2.enterPin(1111) << "\\n"; // Wrong PIN, 2 left
    cout << atm2.enterPin(2222) << "\\n"; // Wrong PIN, 1 left
    cout << atm2.enterPin(3333) << "\\n"; // Card retained
}` }
      ],
      complexity: `<p>Each step O(1). The design mirrors the sequence diagram, so reviewing the diagram reviews the code.</p>`,
      followUps: ['Model the ATM session states (IDLE, CARD_INSERTED, AUTHENTICATED) explicitly: this becomes the State pattern in a later module.', 'The bank call times out after debiting: what does the sequence need (reversal message)?']
    }
  });

  /* =========================== PRACTICE: HARD =========================== */
  practice.push({
    title: 'Movie Ticket Booking: Domain Model (Type vs Instance Everywhere)',
    level: 'Hard', tags: ['type-object', 'composition', 'association class', 'class diagram'], companies: ['BookMyShow', 'PVR INOX', 'Amazon', 'Paytm'],
    statement: `<p>A city has <b>theatres</b>; each theatre has <b>screens</b>; each screen has a fixed layout of <b>seats</b> (row, number, type REGULAR/PREMIUM). A <b>movie</b> is played in <b>shows</b> (movie + screen + start time). For each show, every seat is independently AVAILABLE, LOCKED (in someone's cart for 5 minutes) or BOOKED. A customer selects seats for a show, locks them, then confirms a <b>booking</b>; price depends on seat type and the show. Produce the class diagram (with all multiplicities) and the domain model in code with <code>lock</code>, <code>confirm</code>, and lock expiry.</p>`,
    constraints: `<ul><li>A physical seat is shared by all shows on that screen; its status is per show.</li><li>Locks expire after 5 minutes (use an injected clock value in minutes).</li><li>Confirm only seats locked by the same customer and not expired.</li></ul>`,
    example: `<p>Show S1 (Dune, Screen 2, 18:00), premium ₹400, regular ₹250. Asha locks A1, A2 at minute 0 → Ravi tries A2 at minute 2 → ${H.c('r', 'rejected')} (locked). Asha confirms at minute 3 → booking ₹650 if A1 premium, A2 regular. Had Asha waited until minute 6, her lock ${H.c('y', 'expired')} and Ravi could lock A2.</p>`,
    brute: {
      why: `<p>The naive model puts a <code>status</code> field on <b>Seat</b>. But the same physical seat is used by the 15:00 and the 18:00 show, so booking A1 for 18:00 also blocks it at 15:00. The workaround (copying the whole seat layout per show, including row/number/type) duplicates data and makes layout changes impossible. Locks with no owner or expiry leave seats stuck forever.</p>`,
      code: { lang: 'java', code: `
class Seat {
    String row; int number; String type;
    String status = "AVAILABLE";      // one status for ALL shows: wrong
}
class Screen { List<Seat> seats = new ArrayList<>(); }
class Show { String movie; Screen screen; String time; }   // no per-show seat state`, alt: [
              { lang: 'python', code: `
class Seat:
    def __init__(self, row, number, type):
        self.row, self.number, self.type = row, number, type
        self.status = "AVAILABLE"     # one status for ALL shows: wrong

class Screen:
    def __init__(self): self.seats = []

class Show:                           # no per-show seat state
    def __init__(self, movie, screen, time):
        self.movie, self.screen, self.time = movie, screen, time` },
              { lang: 'ts', code: `
class Seat {
    row = ""; number = 0; type = "";
    status = "AVAILABLE";      // one status for ALL shows: wrong
}
class Screen { seats: Seat[] = []; }
class Show { movie = ""; screen!: Screen; time = ""; }   // no per-show seat state` },
              { lang: 'cpp', code: `
struct Seat {
    string row; int number = 0; string type;
    string status = "AVAILABLE";      // one status for ALL shows: wrong
};
struct Screen { vector<Seat> seats; };
struct Show { string movie; Screen* screen = nullptr; string time; };   // no per-show seat state` }
            ] }
    },
    mcq: { q: 'Seat A1 on Screen 2 is booked for the 18:00 show but free at 15:00. Where does its status live?', options: ['Seat.status', 'In a ShowSeat object (show + seat + status), one per seat per show', 'Screen.status', 'Movie.status'], answer: 1, explain: 'Type vs instance again: Seat is the physical, shared description; ShowSeat is the per-show instance carrying status, lock owner and lock time.' },
    hints: [
      `<p>Hint 1: draw the composition chain: Theatre ◆ 1..* Screen ◆ 1..* Seat. Movie is independent. Show → 1 Movie, Show → 1 Screen.</p>`,
      `<p>Hint 2: Show ◆ 1..* ShowSeat (one per Seat of the screen, created with the show); ShowSeat → 1 Seat, holds status, lockedBy, lockedAt. Booking → 1 Show, → 1..* ShowSeat, has total.</p>`,
      `<p>Hint 3: <code>ShowSeat.isFreeAt(now)</code> = AVAILABLE or (LOCKED and now − lockedAt ≥ 5). Lock all-or-nothing: first check every seat, then lock. Confirm checks owner + not expired, then marks BOOKED and creates Booking.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "true\nfalse\nBK1 65000\ntrue\nfailed\ntrue\n" }] },
    solution: {
      approach: `<p><b>Diagram:</b> <code>Theatre 1 ◆— 1..* Screen 1 ◆— 1..* Seat</code>; <code>Show 0..* —&gt; 1 Movie</code>; <code>Show 0..* —&gt; 1 Screen</code>; <code>Show 1 ◆— 1..* ShowSeat</code>; <code>ShowSeat 0..* —&gt; 1 Seat</code>; <code>Booking 0..* —&gt; 1 Show</code>; <code>Booking 0..1 —&gt; 1..* ShowSeat</code>; enums SeatType, SeatStatus. The key insight is <b>Seat (type) vs ShowSeat (instance)</b>, the same idea as Book vs BookCopy. Show owns pricing per seat type and the lock/confirm use cases (it holds its ShowSeats). Locking is all-or-nothing and locked per show.</p>`,
      code: `
import java.time.*;

enum SeatType { REGULAR, PREMIUM }
enum SeatStatus { AVAILABLE, LOCKED, BOOKED }

record Seat(String row, int number, SeatType type) {
    String label() { return row + number; }
}

class Screen {
    private final String name;
    private final List<Seat> seats = new ArrayList<>();          // composition
    Screen(String name) { this.name = name; }
    void addSeat(String row, int n, SeatType t) { seats.add(new Seat(row, n, t)); }
    List<Seat> seats() { return List.copyOf(seats); }
}

class Theatre {
    private final String name;
    private final List<Screen> screens = new ArrayList<>();      // composition
    Theatre(String name) { this.name = name; }
    Screen addScreen(String n) { Screen s = new Screen(n); screens.add(s); return s; }
}

record Movie(String title, int minutes) { }

class ShowSeat {
    static final int LOCK_MINUTES = 5;
    private final Seat seat;
    private SeatStatus status = SeatStatus.AVAILABLE;
    private String lockedBy;
    private long lockedAt;
    ShowSeat(Seat seat) { this.seat = seat; }
    boolean isFreeAt(long now) {
        return status == SeatStatus.AVAILABLE || (status == SeatStatus.LOCKED && now - lockedAt >= LOCK_MINUTES);
    }
    void lock(String customer, long now) { status = SeatStatus.LOCKED; lockedBy = customer; lockedAt = now; }
    boolean heldBy(String customer, long now) {
        return status == SeatStatus.LOCKED && customer.equals(lockedBy) && now - lockedAt < LOCK_MINUTES;
    }
    void book() { status = SeatStatus.BOOKED; }
    Seat seat() { return seat; }
}

record Booking(String id, String customer, List<String> seats, long totalPaise) { }

class Show {
    private final Movie movie;
    private final Screen screen;
    private final LocalDateTime start;
    private final Map<SeatType, Long> prices;
    private final Map<String, ShowSeat> showSeats = new LinkedHashMap<>();   // composition
    private int seq = 1;
    Show(Movie movie, Screen screen, LocalDateTime start, Map<SeatType, Long> prices) {
        this.movie = movie; this.screen = screen; this.start = start; this.prices = Map.copyOf(prices);
        for (Seat s : screen.seats()) showSeats.put(s.label(), new ShowSeat(s));  // one per physical seat
    }

    synchronized boolean lock(String customer, List<String> labels, long now) {
        for (String l : labels) {                                  // check all first: all-or-nothing
            ShowSeat ss = showSeats.get(l);
            if (ss == null || !ss.isFreeAt(now)) return false;
        }
        for (String l : labels) showSeats.get(l).lock(customer, now);
        return true;
    }

    synchronized Optional<Booking> confirm(String customer, List<String> labels, long now) {
        long total = 0;
        for (String l : labels) {
            ShowSeat ss = showSeats.get(l);
            if (ss == null || !ss.heldBy(customer, now)) return Optional.empty();
            total += prices.get(ss.seat().type());
        }
        labels.forEach(l -> showSeats.get(l).book());
        return Optional.of(new Booking("BK" + (seq++), customer, List.copyOf(labels), total));
    }

    public static void main(String[] args) {
        Theatre pvr = new Theatre("PVR Forum");
        Screen s2 = pvr.addScreen("Screen 2");
        s2.addSeat("A", 1, SeatType.PREMIUM); s2.addSeat("A", 2, SeatType.REGULAR);
        Show evening = new Show(new Movie("Dune", 166), s2, LocalDateTime.of(2026, 3, 6, 18, 0),
                Map.of(SeatType.PREMIUM, 40000L, SeatType.REGULAR, 25000L));
        System.out.println(evening.lock("asha", List.of("A1", "A2"), 0));      // true
        System.out.println(evening.lock("ravi", List.of("A2"), 2));            // false: locked
        System.out.println(evening.confirm("asha", List.of("A1", "A2"), 3).map(b -> b.id() + " " + b.totalPaise()).orElse("failed"));   // BK1 65000
        Show late = new Show(new Movie("Dune", 166), s2, LocalDateTime.of(2026, 3, 6, 21, 0),
                Map.of(SeatType.PREMIUM, 40000L, SeatType.REGULAR, 25000L));
        System.out.println(late.lock("asha", List.of("A1"), 0));               // true
        System.out.println(late.confirm("asha", List.of("A1"), 5).map(b -> b.id()).orElse("failed"));   // failed: the 5-minute hold expired
        System.out.println(late.lock("ravi", List.of("A1"), 5));               // true: an expired lock is free again
    }
}`,
      alt: [
        { lang: 'python', code: `
import threading
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class SeatType(Enum):
    REGULAR = 1
    PREMIUM = 2


class SeatStatus(Enum):
    AVAILABLE = 1
    LOCKED = 2
    BOOKED = 3


@dataclass(frozen=True)
class Seat:
    row: str
    number: int
    type: SeatType

    def label(self) -> str:
        return f"{self.row}{self.number}"


class Screen:
    def __init__(self, name: str) -> None:
        self.name = name
        self._seats: list[Seat] = []  # composition

    def add_seat(self, row: str, n: int, t: SeatType) -> None:
        self._seats.append(Seat(row, n, t))

    def seats(self) -> list[Seat]:
        return list(self._seats)


class Theatre:
    def __init__(self, name: str) -> None:
        self.name = name
        self._screens: list[Screen] = []  # composition

    def add_screen(self, name: str) -> Screen:
        s = Screen(name)
        self._screens.append(s)
        return s


@dataclass(frozen=True)
class Movie:
    title: str
    minutes: int


class ShowSeat:
    LOCK_MINUTES = 5

    def __init__(self, seat: Seat) -> None:
        self.seat = seat
        self._status = SeatStatus.AVAILABLE
        self._locked_by: str | None = None
        self._locked_at = 0

    def is_free_at(self, now: int) -> bool:
        return self._status is SeatStatus.AVAILABLE or (
            self._status is SeatStatus.LOCKED and now - self._locked_at >= ShowSeat.LOCK_MINUTES
        )

    def lock(self, customer: str, now: int) -> None:
        self._status = SeatStatus.LOCKED
        self._locked_by = customer
        self._locked_at = now

    def held_by(self, customer: str, now: int) -> bool:
        return (
            self._status is SeatStatus.LOCKED
            and customer == self._locked_by
            and now - self._locked_at < ShowSeat.LOCK_MINUTES
        )

    def book(self) -> None:
        self._status = SeatStatus.BOOKED


@dataclass(frozen=True)
class Booking:
    id: str
    customer: str
    seats: tuple[str, ...]
    total_paise: int


class Show:
    def __init__(self, movie: Movie, screen: Screen, start: datetime, prices: dict[SeatType, int]) -> None:
        self._movie = movie
        self._screen = screen
        self._start = start
        self._prices = dict(prices)
        self._show_seats = {s.label(): ShowSeat(s) for s in screen.seats()}  # one per physical seat
        self._seq = 1
        self._lock = threading.Lock()

    def lock(self, customer: str, labels: list[str], now: int) -> bool:
        with self._lock:
            for label in labels:  # check all first: all-or-nothing
                ss = self._show_seats.get(label)
                if ss is None or not ss.is_free_at(now):
                    return False
            for label in labels:
                self._show_seats[label].lock(customer, now)
            return True

    def confirm(self, customer: str, labels: list[str], now: int) -> Booking | None:
        with self._lock:
            total = 0
            for label in labels:
                ss = self._show_seats.get(label)
                if ss is None or not ss.held_by(customer, now):
                    return None
                total += self._prices[ss.seat.type]
            for label in labels:
                self._show_seats[label].book()
            booking = Booking(f"BK{self._seq}", customer, tuple(labels), total)
            self._seq += 1
            return booking


def main() -> None:
    pvr = Theatre("PVR Forum")
    s2 = pvr.add_screen("Screen 2")
    s2.add_seat("A", 1, SeatType.PREMIUM)
    s2.add_seat("A", 2, SeatType.REGULAR)
    prices = {SeatType.PREMIUM: 40000, SeatType.REGULAR: 25000}
    evening = Show(Movie("Dune", 166), s2, datetime(2026, 3, 6, 18, 0), prices)
    print(str(evening.lock("asha", ["A1", "A2"], 0)).lower())  # true
    print(str(evening.lock("ravi", ["A2"], 2)).lower())  # false: locked
    b = evening.confirm("asha", ["A1", "A2"], 3)
    print(f"{b.id} {b.total_paise}" if b else "failed")  # BK1 65000
    late = Show(Movie("Dune", 166), s2, datetime(2026, 3, 6, 21, 0), prices)
    print(str(late.lock("asha", ["A1"], 0)).lower())  # true
    b = late.confirm("asha", ["A1"], 5)
    print(b.id if b else "failed")  # failed: the 5-minute hold expired
    print(str(late.lock("ravi", ["A1"], 5)).lower())  # true: an expired lock is free again


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
type SeatType = "REGULAR" | "PREMIUM";
type SeatStatus = "AVAILABLE" | "LOCKED" | "BOOKED";

class Seat {
  constructor(readonly row: string, readonly number: number, readonly type: SeatType) {}
  label(): string { return this.row + this.number; }
}

class Screen {
  private readonly seatList: Seat[] = []; // composition
  constructor(readonly name: string) {}
  addSeat(row: string, n: number, t: SeatType): void { this.seatList.push(new Seat(row, n, t)); }
  seats(): readonly Seat[] { return [...this.seatList]; }
}

class Theatre {
  private readonly screens: Screen[] = []; // composition
  constructor(readonly name: string) {}
  addScreen(n: string): Screen {
    const s = new Screen(n);
    this.screens.push(s);
    return s;
  }
}

interface Movie { readonly title: string; readonly minutes: number; }

class ShowSeat {
  static readonly LOCK_MINUTES = 5;
  private status: SeatStatus = "AVAILABLE";
  private lockedBy: string | null = null;
  private lockedAt = 0;
  constructor(private readonly theSeat: Seat) {}
  isFreeAt(now: number): boolean {
    return this.status === "AVAILABLE" || (this.status === "LOCKED" && now - this.lockedAt >= ShowSeat.LOCK_MINUTES);
  }
  lock(customer: string, now: number): void {
    this.status = "LOCKED";
    this.lockedBy = customer;
    this.lockedAt = now;
  }
  heldBy(customer: string, now: number): boolean {
    return this.status === "LOCKED" && customer === this.lockedBy && now - this.lockedAt < ShowSeat.LOCK_MINUTES;
  }
  book(): void { this.status = "BOOKED"; }
  seat(): Seat { return this.theSeat; }
}

interface Booking {
  readonly id: string;
  readonly customer: string;
  readonly seats: readonly string[];
  readonly totalPaise: number;
}

class Show {
  private readonly prices: ReadonlyMap<SeatType, number>;
  private readonly showSeats = new Map<string, ShowSeat>(); // composition
  private seq = 1;
  constructor(
    private readonly movie: Movie,
    private readonly screen: Screen,
    private readonly start: Date,
    prices: Map<SeatType, number>,
  ) {
    this.prices = new Map(prices);
    for (const s of screen.seats()) this.showSeats.set(s.label(), new ShowSeat(s)); // one per physical seat
  }

  lock(customer: string, labels: string[], now: number): boolean {
    for (const l of labels) { // check all first: all-or-nothing
      const ss = this.showSeats.get(l);
      if (!ss || !ss.isFreeAt(now)) return false;
    }
    for (const l of labels) this.showSeats.get(l)!.lock(customer, now);
    return true;
  }

  confirm(customer: string, labels: string[], now: number): Booking | undefined {
    let total = 0;
    for (const l of labels) {
      const ss = this.showSeats.get(l);
      if (!ss || !ss.heldBy(customer, now)) return undefined;
      total += this.prices.get(ss.seat().type)!;
    }
    labels.forEach((l) => this.showSeats.get(l)!.book());
    return { id: "BK" + this.seq++, customer, seats: [...labels], totalPaise: total };
  }
}

function main(): void {
  const pvr = new Theatre("PVR Forum");
  const s2 = pvr.addScreen("Screen 2");
  s2.addSeat("A", 1, "PREMIUM");
  s2.addSeat("A", 2, "REGULAR");
  const prices = new Map<SeatType, number>([["PREMIUM", 40000], ["REGULAR", 25000]]);
  const evening = new Show({ title: "Dune", minutes: 166 }, s2, new Date(2026, 2, 6, 18, 0), prices);
  console.log(evening.lock("asha", ["A1", "A2"], 0)); // true
  console.log(evening.lock("ravi", ["A2"], 2)); // false: locked
  const b = evening.confirm("asha", ["A1", "A2"], 3);
  console.log(b ? \`\${b.id} \${b.totalPaise}\` : "failed"); // BK1 65000
  const late = new Show({ title: "Dune", minutes: 166 }, s2, new Date(2026, 2, 6, 21, 0), prices);
  console.log(late.lock("asha", ["A1"], 0)); // true
  console.log(late.confirm("asha", ["A1"], 5)?.id ?? "failed"); // failed: the 5-minute hold expired
  console.log(late.lock("ravi", ["A1"], 5)); // true: an expired lock is free again
}
main();` },
        { lang: 'cpp', code: `
enum class SeatType { Regular, Premium };
enum class SeatStatus { Available, Locked, Booked };

struct Seat {
    string row;
    int number;
    SeatType type;
    string label() const { return row + to_string(number); }
};

class Screen {
public:
    explicit Screen(string name) : name_(std::move(name)) {}
    void addSeat(const string& row, int n, SeatType t) { seats_.push_back({row, n, t}); }
    const vector<Seat>& seats() const { return seats_; }
private:
    string name_;
    vector<Seat> seats_;  // composition
};

class Theatre {
public:
    explicit Theatre(string name) : name_(std::move(name)) {}
    Screen& addScreen(const string& n) {
        screens_.push_back(make_unique<Screen>(n));
        return *screens_.back();
    }
private:
    string name_;
    vector<unique_ptr<Screen>> screens_;  // composition: the theatre owns its screens
};

struct Movie {
    string title;
    int minutes;
};

struct DateTime {
    int year, month, day, hour, minute;
};

class ShowSeat {
public:
    static constexpr int LOCK_MINUTES = 5;
    explicit ShowSeat(Seat seat) : seat_(std::move(seat)) {}
    bool isFreeAt(long long now) const {
        return status_ == SeatStatus::Available || (status_ == SeatStatus::Locked && now - lockedAt_ >= LOCK_MINUTES);
    }
    void lock(const string& customer, long long now) {
        status_ = SeatStatus::Locked;
        lockedBy_ = customer;
        lockedAt_ = now;
    }
    bool heldBy(const string& customer, long long now) const {
        return status_ == SeatStatus::Locked && customer == lockedBy_ && now - lockedAt_ < LOCK_MINUTES;
    }
    void book() { status_ = SeatStatus::Booked; }
    const Seat& seat() const { return seat_; }
private:
    Seat seat_;
    SeatStatus status_ = SeatStatus::Available;
    string lockedBy_;
    long long lockedAt_ = 0;
};

struct Booking {
    string id;
    string customer;
    vector<string> seats;
    long long totalPaise;
};

class Show {
public:
    Show(Movie movie, const Screen& screen, DateTime start, map<SeatType, long long> prices)
        : movie_(std::move(movie)), start_(start), prices_(std::move(prices)) {
        for (const Seat& s : screen.seats()) showSeats_.emplace(s.label(), ShowSeat(s));  // one per physical seat
    }

    bool lock(const string& customer, const vector<string>& labels, long long now) {
        lock_guard<mutex> guard(mu_);
        for (const auto& l : labels) {  // check all first: all-or-nothing
            auto it = showSeats_.find(l);
            if (it == showSeats_.end() || !it->second.isFreeAt(now)) return false;
        }
        for (const auto& l : labels) showSeats_.at(l).lock(customer, now);
        return true;
    }

    optional<Booking> confirm(const string& customer, const vector<string>& labels, long long now) {
        lock_guard<mutex> guard(mu_);
        long long total = 0;
        for (const auto& l : labels) {
            auto it = showSeats_.find(l);
            if (it == showSeats_.end() || !it->second.heldBy(customer, now)) return nullopt;
            total += prices_.at(it->second.seat().type);
        }
        for (const auto& l : labels) showSeats_.at(l).book();
        return Booking{"BK" + to_string(seq_++), customer, labels, total};
    }

private:
    Movie movie_;
    DateTime start_;
    map<SeatType, long long> prices_;
    map<string, ShowSeat> showSeats_;  // composition
    int seq_ = 1;
    mutex mu_;
};

int main() {
    Theatre pvr("PVR Forum");
    Screen& s2 = pvr.addScreen("Screen 2");
    s2.addSeat("A", 1, SeatType::Premium);
    s2.addSeat("A", 2, SeatType::Regular);
    map<SeatType, long long> prices{{SeatType::Premium, 40000}, {SeatType::Regular, 25000}};
    Show evening(Movie{"Dune", 166}, s2, DateTime{2026, 3, 6, 18, 0}, prices);
    cout << boolalpha;
    cout << evening.lock("asha", {"A1", "A2"}, 0) << "\\n";  // true
    cout << evening.lock("ravi", {"A2"}, 2) << "\\n";        // false: locked
    auto b = evening.confirm("asha", {"A1", "A2"}, 3);
    cout << (b ? b->id + " " + to_string(b->totalPaise) : "failed") << "\\n";  // BK1 65000
    Show late(Movie{"Dune", 166}, s2, DateTime{2026, 3, 6, 21, 0}, prices);
    cout << late.lock("asha", {"A1"}, 0) << "\\n";           // true
    auto c = late.confirm("asha", {"A1"}, 5);
    cout << (c ? c->id : "failed") << "\\n";                 // failed: the 5-minute hold expired
    cout << late.lock("ravi", {"A1"}, 5) << "\\n";           // true: an expired lock is free again
}` }
      ],
      complexity: `<p>lock/confirm are O(k) for k seats requested. Creating a show is O(seats on the screen). Synchronising per Show keeps different shows independent (a finer-grained design locks per seat or uses DB row locks; see the Concurrency module).</p>`,
      followUps: ['Two app servers handle the same show: what replaces the in-process lock (DB unique constraint, optimistic version, Redis lock with TTL)?', 'Add dynamic pricing (weekend, occupancy-based) without editing Show: what interface appears?', 'Draw the sequence diagram for "select seats → pay → confirm" including the payment-failure branch.']
    }
  });

  practice.push({
    title: 'Food Delivery: Orders with a Status Lifecycle and Agent Assignment',
    level: 'Hard', tags: ['enum state machine', 'sequence diagram', 'association', 'composition'], companies: ['Swiggy', 'Zomato', 'DoorDash', 'Uber Eats'],
    statement: `<p>Customers order from one <b>restaurant</b> at a time; the restaurant's <b>menu</b> has items with prices. An order moves through <b>PLACED → ACCEPTED → PREPARING → PICKED_UP → DELIVERED</b>, or CANCELLED (only before PREPARING). When the restaurant accepts, the platform assigns the nearest free <b>delivery agent</b>; the agent becomes free again on delivery. Model the classes, write the legal-transition logic once, and implement place, accept (with assignment), pick up, deliver and cancel.</p>`,
    constraints: `<ul><li>Illegal transitions throw an illegal-state error (<code>IllegalStateException</code> in Java, <code>RuntimeError</code> in Python, <code>Error</code> in TypeScript, <code>std::runtime_error</code> in C++).</li><li>All items in an order come from the same restaurant.</li><li>Agent distance: Manhattan on a grid; ties by agent id.</li></ul>`,
    example: `${H.table(['step', 'status', 'agent'], [['place (2 × Biryani)', 'PLACED', '-'], ['restaurant accepts', 'ACCEPTED', H.c('g', 'A1 (nearest free)')], ['cancel', H.c('r', 'still allowed (before PREPARING)'), 'A1 released'], ['… or: prepare → pick up → deliver', 'DELIVERED', 'A1 free again'], ['cancel after PREPARING', H.c('r', 'illegal-state error'), '-']])}`,
    brute: {
      why: `<p>A god class <code>DeliveryApp</code> holds <code>Map&lt;Integer, String&gt; orderStatus</code> and each endpoint does <code>orderStatus.put(id, "DELIVERED")</code>. Nothing prevents DELIVERED → PLACED; cancellation rules are copied (and differ) in the customer app and the restaurant app; agents are marked busy in one map and never freed when an order is cancelled.</p>`,
      code: { lang: 'java', code: `
class DeliveryApp {
    Map<Integer, String> orderStatus = new HashMap<>();
    Map<String, Boolean> agentBusy = new HashMap<>();
    void setStatus(int orderId, String status) { orderStatus.put(orderId, status); }   // any jump allowed
    void cancel(int orderId) { orderStatus.put(orderId, "CANCELLED"); }                 // agent never freed
}`, alt: [
              { lang: 'python', code: `
class DeliveryApp:
    def __init__(self):
        self.order_status = {}
        self.agent_busy = {}

    def set_status(self, order_id, status): self.order_status[order_id] = status   # any jump allowed
    def cancel(self, order_id): self.order_status[order_id] = "CANCELLED"          # agent never freed` },
              { lang: 'ts', code: `
class DeliveryApp {
    orderStatus = new Map<number, string>();
    agentBusy = new Map<string, boolean>();
    setStatus(orderId: number, status: string): void { this.orderStatus.set(orderId, status); }   // any jump allowed
    cancel(orderId: number): void { this.orderStatus.set(orderId, "CANCELLED"); }                 // agent never freed
}` },
              { lang: 'cpp', code: `
class DeliveryApp {
    unordered_map<int, string> orderStatus;
    unordered_map<string, bool> agentBusy;
public:
    void setStatus(int orderId, const string& status) { orderStatus[orderId] = status; }   // any jump allowed
    void cancel(int orderId) { orderStatus[orderId] = "CANCELLED"; }                        // agent never freed
};` }
            ] }
    },
    mcq: { q: 'Where should the rule "cancel only before PREPARING" be written?', options: ['In every client app', 'Inside Order (or its status enum) as the only way to change status', 'In the database only', 'In the DeliveryAgent class'], answer: 1, explain: 'The order owns its lifecycle. Putting legal transitions in one place (enum or Order methods) makes illegal jumps impossible from any caller.' },
    hints: [
      `<p>Hint 1: classes: Restaurant ◆ MenuItem, Customer, Order ◆ OrderLine → MenuItem, DeliveryAgent, Location value type, OrderStatus enum, DispatchService (coordinator).</p>`,
      `<p>Hint 2: give the enum a method <code>canMoveTo(next)</code> listing legal targets, and route every change through <code>Order.moveTo(next)</code>.</p>`,
      `<p>Hint 3: <code>accept</code> = order.moveTo(ACCEPTED) then dispatcher picks nearest free agent (min by distance, then id) → agent.assign(order). cancel releases the agent if any; deliver releases too.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "ACCEPTED A1\nPREPARING -> CANCELLED not allowed\nDELIVERED total=60000\nnot on menu: Pizza\nA1\n" }] },
    solution: {
      approach: `<p><b>Diagram:</b> <code>Restaurant ◆ 1..* MenuItem</code>; <code>Order → 1 Restaurant</code>, <code>Order → 1 Customer</code>, <code>Order ◆ 1..* OrderLine → 1 MenuItem</code>; <code>Order 0..1 — 0..1 DeliveryAgent</code> (current assignment, two-way, kept in sync); <code>DispatchService o— 0..* DeliveryAgent</code>. The lifecycle lives in <code>OrderStatus.canMoveTo</code>; <code>Order.moveTo</code> is the single door. Sequence for accept: Restaurant → Order.moveTo(ACCEPTED) → DispatchService.assign(order) → nearest free agent → agent.assign(order).</p>`,
      code: `
enum OrderStatus {
    PLACED, ACCEPTED, PREPARING, PICKED_UP, DELIVERED, CANCELLED;
    boolean canMoveTo(OrderStatus next) {
        switch (this) {
            case PLACED: return next == ACCEPTED || next == CANCELLED;
            case ACCEPTED: return next == PREPARING || next == CANCELLED;
            case PREPARING: return next == PICKED_UP;
            case PICKED_UP: return next == DELIVERED;
            default: return false;                                   // DELIVERED, CANCELLED are final
        }
    }
}

record Location(int x, int y) { int dist(Location o) { return Math.abs(x - o.x) + Math.abs(y - o.y); } }
record MenuItem(String name, long pricePaise) { }
record OrderLine(MenuItem item, int qty, long unitPaise) { }

class Restaurant {
    private final String name;
    private final Location location;
    private final Map<String, MenuItem> menu = new HashMap<>();     // composition
    Restaurant(String name, Location loc) { this.name = name; this.location = loc; }
    void addItem(String n, long p) { menu.put(n, new MenuItem(n, p)); }
    MenuItem item(String n) {
        MenuItem m = menu.get(n);
        if (m == null) throw new IllegalArgumentException("not on menu: " + n);   // bad input, not a NullPointerException
        return m;
    }
    Location location() { return location; }
}

class DeliveryAgent {
    private final String id;
    private final Location location;
    private Order current;                                         // 0..1
    DeliveryAgent(String id, Location loc) { this.id = id; this.location = loc; }
    boolean isFree() { return current == null; }
    void assign(Order o) { current = o; }
    void release() { current = null; }
    Location location() { return location; }
    String id() { return id; }
}

class Order {
    private final Restaurant restaurant;
    private final List<OrderLine> lines = new ArrayList<>();       // composition
    private OrderStatus status = OrderStatus.PLACED;
    private DeliveryAgent agent;                                   // 0..1
    Order(Restaurant r) { this.restaurant = r; }
    void add(String itemName, int qty) {
        if (status != OrderStatus.PLACED) throw new IllegalStateException("order already accepted");
        MenuItem m = restaurant.item(itemName);                    // same restaurant by construction
        lines.add(new OrderLine(m, qty, m.pricePaise()));
    }
    void moveTo(OrderStatus next) {                                // the ONLY door for status changes
        if (!status.canMoveTo(next)) throw new IllegalStateException(status + " -> " + next + " not allowed");
        status = next;
        if ((next == OrderStatus.CANCELLED || next == OrderStatus.DELIVERED) && agent != null) { agent.release(); agent = null; }
    }
    void setAgent(DeliveryAgent a) { agent = a; a.assign(this); }
    Optional<DeliveryAgent> agent() { return Optional.ofNullable(agent); }
    OrderStatus status() { return status; }
    Restaurant restaurant() { return restaurant; }
    long total() { return lines.stream().mapToLong(l -> l.qty() * l.unitPaise()).sum(); }
}

class DispatchService {
    private final List<DeliveryAgent> agents;
    DispatchService(List<DeliveryAgent> agents) { this.agents = List.copyOf(agents); }
    void accept(Order o) {
        o.moveTo(OrderStatus.ACCEPTED);
        Location r = o.restaurant().location();
        agents.stream().filter(DeliveryAgent::isFree)
              .min(Comparator.comparingInt((DeliveryAgent a) -> a.location().dist(r)).thenComparing(DeliveryAgent::id))
              .ifPresent(o::setAgent);
    }

    public static void main(String[] args) {
        Restaurant meghana = new Restaurant("Meghana", new Location(0, 0));
        meghana.addItem("Biryani", 30000);
        DispatchService d = new DispatchService(List.of(new DeliveryAgent("A1", new Location(1, 1)), new DeliveryAgent("A2", new Location(5, 5))));
        Order o = new Order(meghana);
        o.add("Biryani", 2);
        d.accept(o);
        System.out.println(o.status() + " " + o.agent().map(DeliveryAgent::id).orElse("none"));   // ACCEPTED A1
        o.moveTo(OrderStatus.PREPARING);
        try { o.moveTo(OrderStatus.CANCELLED); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        o.moveTo(OrderStatus.PICKED_UP); o.moveTo(OrderStatus.DELIVERED);
        System.out.println(o.status() + " total=" + o.total());   // DELIVERED total=60000
        Order o2 = new Order(meghana);
        try { o2.add("Pizza", 1); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }   // not on menu: Pizza
        o2.add("Biryani", 1);
        d.accept(o2);
        System.out.println(o2.agent().map(DeliveryAgent::id).orElse("none"));   // A1: freed when the first order was delivered
    }
}`,
      alt: [
        { lang: 'python', code: `
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class OrderStatus(Enum):
    PLACED = "PLACED"
    ACCEPTED = "ACCEPTED"
    PREPARING = "PREPARING"
    PICKED_UP = "PICKED_UP"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

    def can_move_to(self, nxt: OrderStatus) -> bool:
        allowed = {
            OrderStatus.PLACED: {OrderStatus.ACCEPTED, OrderStatus.CANCELLED},
            OrderStatus.ACCEPTED: {OrderStatus.PREPARING, OrderStatus.CANCELLED},
            OrderStatus.PREPARING: {OrderStatus.PICKED_UP},
            OrderStatus.PICKED_UP: {OrderStatus.DELIVERED},
        }
        return nxt in allowed.get(self, set())  # DELIVERED, CANCELLED are final


@dataclass(frozen=True)
class Location:
    x: int
    y: int

    def dist(self, o: Location) -> int:
        return abs(self.x - o.x) + abs(self.y - o.y)


@dataclass(frozen=True)
class MenuItem:
    name: str
    price_paise: int


@dataclass(frozen=True)
class OrderLine:
    item: MenuItem
    qty: int
    unit_paise: int


class Restaurant:
    def __init__(self, name: str, location: Location) -> None:
        self.name = name
        self.location = location
        self._menu: dict[str, MenuItem] = {}  # composition

    def add_item(self, name: str, price: int) -> None:
        self._menu[name] = MenuItem(name, price)

    def item(self, name: str) -> MenuItem:
        m = self._menu.get(name)
        if m is None:
            raise ValueError(f"not on menu: {name}")  # bad input, not a KeyError
        return m


class DeliveryAgent:
    def __init__(self, agent_id: str, location: Location) -> None:
        self.id = agent_id
        self.location = location
        self._current: Order | None = None  # 0..1

    def is_free(self) -> bool:
        return self._current is None

    def assign(self, o: Order) -> None:
        self._current = o

    def release(self) -> None:
        self._current = None


class Order:
    def __init__(self, restaurant: Restaurant) -> None:
        self.restaurant = restaurant
        self._lines: list[OrderLine] = []  # composition
        self._status = OrderStatus.PLACED
        self._agent: DeliveryAgent | None = None  # 0..1

    def add(self, item_name: str, qty: int) -> None:
        if self._status is not OrderStatus.PLACED:
            raise RuntimeError("order already accepted")
        m = self.restaurant.item(item_name)  # same restaurant by construction
        self._lines.append(OrderLine(m, qty, m.price_paise))

    def move_to(self, nxt: OrderStatus) -> None:  # the ONLY door for status changes
        if not self._status.can_move_to(nxt):
            raise RuntimeError(f"{self._status.name} -> {nxt.name} not allowed")
        self._status = nxt
        if nxt in (OrderStatus.CANCELLED, OrderStatus.DELIVERED) and self._agent is not None:
            self._agent.release()
            self._agent = None

    def set_agent(self, a: DeliveryAgent) -> None:
        self._agent = a
        a.assign(self)

    @property
    def agent(self) -> DeliveryAgent | None:
        return self._agent

    @property
    def status(self) -> OrderStatus:
        return self._status

    def total(self) -> int:
        return sum(line.qty * line.unit_paise for line in self._lines)


class DispatchService:
    def __init__(self, agents: list[DeliveryAgent]) -> None:
        self._agents = list(agents)

    def accept(self, o: Order) -> None:
        o.move_to(OrderStatus.ACCEPTED)
        r = o.restaurant.location
        free = [a for a in self._agents if a.is_free()]
        if free:
            o.set_agent(min(free, key=lambda a: (a.location.dist(r), a.id)))


def main() -> None:
    meghana = Restaurant("Meghana", Location(0, 0))
    meghana.add_item("Biryani", 30000)
    d = DispatchService([DeliveryAgent("A1", Location(1, 1)), DeliveryAgent("A2", Location(5, 5))])
    o = Order(meghana)
    o.add("Biryani", 2)
    d.accept(o)
    print(o.status.name, o.agent.id if o.agent else "none")  # ACCEPTED A1
    o.move_to(OrderStatus.PREPARING)
    try:
        o.move_to(OrderStatus.CANCELLED)
    except RuntimeError as e:
        print(e)
    o.move_to(OrderStatus.PICKED_UP)
    o.move_to(OrderStatus.DELIVERED)
    print(f"{o.status.name} total={o.total()}")  # DELIVERED total=60000
    o2 = Order(meghana)
    try:
        o2.add("Pizza", 1)
    except ValueError as e:
        print(e)  # not on menu: Pizza
    o2.add("Biryani", 1)
    d.accept(o2)
    print(o2.agent.id if o2.agent else "none")  # A1: freed when the first order was delivered


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
type OrderStatus = "PLACED" | "ACCEPTED" | "PREPARING" | "PICKED_UP" | "DELIVERED" | "CANCELLED";

const NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  PLACED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["PICKED_UP"],
  PICKED_UP: ["DELIVERED"],
  DELIVERED: [], // final
  CANCELLED: [], // final
};
const canMoveTo = (from: OrderStatus, to: OrderStatus): boolean => NEXT[from].includes(to);

class Location {
  constructor(readonly x: number, readonly y: number) {}
  dist(o: Location): number { return Math.abs(this.x - o.x) + Math.abs(this.y - o.y); }
}

interface MenuItem { readonly name: string; readonly pricePaise: number; }
interface OrderLine { readonly item: MenuItem; readonly qty: number; readonly unitPaise: number; }

class Restaurant {
  private readonly menu = new Map<string, MenuItem>(); // composition
  constructor(readonly name: string, private readonly loc: Location) {}
  addItem(n: string, p: number): void { this.menu.set(n, { name: n, pricePaise: p }); }
  item(n: string): MenuItem {
    const m = this.menu.get(n);
    if (!m) throw new Error("not on menu: " + n); // bad input
    return m;
  }
  location(): Location { return this.loc; }
}

class DeliveryAgent {
  private current: Order | null = null; // 0..1
  constructor(private readonly agentId: string, private readonly loc: Location) {}
  isFree(): boolean { return this.current === null; }
  assign(o: Order): void { this.current = o; }
  release(): void { this.current = null; }
  location(): Location { return this.loc; }
  id(): string { return this.agentId; }
}

class Order {
  private readonly lines: OrderLine[] = []; // composition
  private current: OrderStatus = "PLACED";
  private assigned: DeliveryAgent | null = null; // 0..1
  constructor(private readonly place: Restaurant) {}

  add(itemName: string, qty: number): void {
    if (this.current !== "PLACED") throw new Error("order already accepted");
    const m = this.place.item(itemName); // same restaurant by construction
    this.lines.push({ item: m, qty, unitPaise: m.pricePaise });
  }
  moveTo(next: OrderStatus): void { // the ONLY door for status changes
    if (!canMoveTo(this.current, next)) throw new Error(\`\${this.current} -> \${next} not allowed\`);
    this.current = next;
    if ((next === "CANCELLED" || next === "DELIVERED") && this.assigned) {
      this.assigned.release();
      this.assigned = null;
    }
  }
  setAgent(a: DeliveryAgent): void {
    this.assigned = a;
    a.assign(this);
  }
  agent(): DeliveryAgent | null { return this.assigned; }
  status(): OrderStatus { return this.current; }
  restaurant(): Restaurant { return this.place; }
  total(): number { return this.lines.reduce((s, l) => s + l.qty * l.unitPaise, 0); }
}

class DispatchService {
  private readonly agents: readonly DeliveryAgent[];
  constructor(agents: DeliveryAgent[]) { this.agents = [...agents]; }
  accept(o: Order): void {
    o.moveTo("ACCEPTED");
    const r = o.restaurant().location();
    const free = this.agents.filter((a) => a.isFree());
    free.sort((a, b) => a.location().dist(r) - b.location().dist(r) || a.id().localeCompare(b.id()));
    if (free.length > 0) o.setAgent(free[0]);
  }
}

function main(): void {
  const meghana = new Restaurant("Meghana", new Location(0, 0));
  meghana.addItem("Biryani", 30000);
  const d = new DispatchService([new DeliveryAgent("A1", new Location(1, 1)), new DeliveryAgent("A2", new Location(5, 5))]);
  const o = new Order(meghana);
  o.add("Biryani", 2);
  d.accept(o);
  console.log(o.status() + " " + (o.agent()?.id() ?? "none")); // ACCEPTED A1
  o.moveTo("PREPARING");
  try {
    o.moveTo("CANCELLED");
  } catch (e) {
    console.log((e as Error).message);
  }
  o.moveTo("PICKED_UP");
  o.moveTo("DELIVERED");
  console.log(o.status() + " total=" + o.total()); // DELIVERED total=60000
  const o2 = new Order(meghana);
  try {
    o2.add("Pizza", 1);
  } catch (e) {
    console.log((e as Error).message); // not on menu: Pizza
  }
  o2.add("Biryani", 1);
  d.accept(o2);
  console.log(o2.agent()?.id() ?? "none"); // A1: freed when the first order was delivered
}
main();` },
        { lang: 'cpp', code: `
enum class OrderStatus { Placed, Accepted, Preparing, PickedUp, Delivered, Cancelled };

string statusName(OrderStatus s) {
    static const char* names[] = {"PLACED", "ACCEPTED", "PREPARING", "PICKED_UP", "DELIVERED", "CANCELLED"};
    return names[static_cast<int>(s)];
}

bool canMoveTo(OrderStatus from, OrderStatus to) {
    switch (from) {
        case OrderStatus::Placed: return to == OrderStatus::Accepted || to == OrderStatus::Cancelled;
        case OrderStatus::Accepted: return to == OrderStatus::Preparing || to == OrderStatus::Cancelled;
        case OrderStatus::Preparing: return to == OrderStatus::PickedUp;
        case OrderStatus::PickedUp: return to == OrderStatus::Delivered;
        default: return false;  // Delivered, Cancelled are final
    }
}

struct Location {
    int x, y;
    int dist(const Location& o) const { return abs(x - o.x) + abs(y - o.y); }
};

struct MenuItem {
    string name;
    long long pricePaise;
};

struct OrderLine {
    MenuItem item;
    int qty;
    long long unitPaise;
};

class Restaurant {
public:
    Restaurant(string name, Location loc) : name_(std::move(name)), location_(loc) {}
    void addItem(const string& n, long long p) { menu_[n] = MenuItem{n, p}; }
    const MenuItem& item(const string& n) const {
        auto it = menu_.find(n);
        if (it == menu_.end()) throw invalid_argument("not on menu: " + n);  // bad input
        return it->second;
    }
    const Location& location() const { return location_; }
private:
    string name_;
    Location location_;
    map<string, MenuItem> menu_;  // composition
};

class Order;

class DeliveryAgent {
public:
    DeliveryAgent(string id, Location loc) : id_(std::move(id)), location_(loc) {}
    bool isFree() const { return current_ == nullptr; }
    void assign(Order* o) { current_ = o; }
    void release() { current_ = nullptr; }
    const Location& location() const { return location_; }
    const string& id() const { return id_; }
private:
    string id_;
    Location location_;
    Order* current_ = nullptr;  // 0..1, non-owning
};

class Order {
public:
    explicit Order(const Restaurant& r) : restaurant_(&r) {}
    void add(const string& itemName, int qty) {
        if (status_ != OrderStatus::Placed) throw runtime_error("order already accepted");
        const MenuItem& m = restaurant_->item(itemName);  // same restaurant by construction
        lines_.push_back({m, qty, m.pricePaise});
    }
    void moveTo(OrderStatus next) {  // the ONLY door for status changes
        if (!canMoveTo(status_, next))
            throw runtime_error(statusName(status_) + " -> " + statusName(next) + " not allowed");
        status_ = next;
        if ((next == OrderStatus::Cancelled || next == OrderStatus::Delivered) && agent_) {
            agent_->release();
            agent_ = nullptr;
        }
    }
    void setAgent(DeliveryAgent& a) {
        agent_ = &a;
        a.assign(this);
    }
    DeliveryAgent* agent() const { return agent_; }  // nullptr when unassigned
    OrderStatus status() const { return status_; }
    const Restaurant& restaurant() const { return *restaurant_; }
    long long total() const {
        long long t = 0;
        for (const auto& l : lines_) t += l.qty * l.unitPaise;
        return t;
    }
private:
    const Restaurant* restaurant_;
    vector<OrderLine> lines_;  // composition
    OrderStatus status_ = OrderStatus::Placed;
    DeliveryAgent* agent_ = nullptr;
};

class DispatchService {
public:
    explicit DispatchService(vector<DeliveryAgent*> agents) : agents_(std::move(agents)) {}
    void accept(Order& o) {
        o.moveTo(OrderStatus::Accepted);
        const Location& r = o.restaurant().location();
        DeliveryAgent* best = nullptr;
        for (DeliveryAgent* a : agents_) {
            if (!a->isFree()) continue;
            if (!best || make_pair(a->location().dist(r), a->id()) < make_pair(best->location().dist(r), best->id())) best = a;
        }
        if (best) o.setAgent(*best);
    }
private:
    vector<DeliveryAgent*> agents_;  // aggregation: agents live elsewhere
};

int main() {
    Restaurant meghana("Meghana", Location{0, 0});
    meghana.addItem("Biryani", 30000);
    DeliveryAgent a1("A1", Location{1, 1}), a2("A2", Location{5, 5});
    DispatchService d({&a1, &a2});
    Order o(meghana);
    o.add("Biryani", 2);
    d.accept(o);
    cout << statusName(o.status()) << " " << (o.agent() ? o.agent()->id() : "none") << "\\n";  // ACCEPTED A1
    o.moveTo(OrderStatus::Preparing);
    try {
        o.moveTo(OrderStatus::Cancelled);
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";
    }
    o.moveTo(OrderStatus::PickedUp);
    o.moveTo(OrderStatus::Delivered);
    cout << statusName(o.status()) << " total=" << o.total() << "\\n";  // DELIVERED total=60000
    Order o2(meghana);
    try {
        o2.add("Pizza", 1);
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";  // not on menu: Pizza
    }
    o2.add("Biryani", 1);
    d.accept(o2);
    cout << (o2.agent() ? o2.agent()->id() : "none") << "\\n";  // A1: freed when the first order was delivered
}` }
      ],
      complexity: `<p>Transitions O(1); assignment O(A) over agents (a geo-index makes it sublinear at scale). All lifecycle rules live in one enum method, so adding a state (e.g. READY_FOR_PICKUP) is a local change.</p>`,
      followUps: ['The agent rejects the assignment: which messages appear in the sequence and who retries?', 'Add order states with timeouts (auto-cancel if not accepted in 10 minutes): who owns the timer?', 'When does this enum-based lifecycle become the full State pattern?']
    }
  });

  practice.push({
    title: 'Refactor a God Class: E-Learning Platform',
    level: 'Hard', tags: ['refactoring', 'god class', 'responsibility assignment', 'class diagram'], companies: ['Udemy', 'upGrad', 'Coursera', 'Unacademy'],
    statement: `<p>You inherit <code>LearningPlatform</code>, a 1,000-line class (simplified in the brute-force code below) that stores courses, lessons, enrollments, progress and certificates in parallel maps of strings. Rules: a course has ordered lessons; a learner must <b>enroll</b> before watching; a lesson counts as complete when watched ≥ 90%; a <b>certificate</b> is issued once when all lessons are complete; paid courses require payment before enrollment. Identify the hidden entities, draw the class diagram, and rewrite it as cooperating classes with the same behaviour.</p>`,
    constraints: `<ul><li>Behaviour must stay identical for existing callers' use cases.</li><li>Certificate issued exactly once, with a unique id.</li><li>Progress is per learner per lesson.</li></ul>`,
    example: `<p>Course "Intro 101" with lessons L1, L2. Asha enrolls (free course), watches L1 95% → complete, L2 50% → not complete → progress ${H.c('y', '50%')}; watches L2 92% → progress ${H.c('g', '100%')} → certificate CERT-1 issued. Watching L2 again does ${H.c('m', 'not')} issue a second certificate.</p>`,
    brute: {
      why: `<p>Everything is keyed by concatenated strings (<code>learner + "|" + course + "|" + lesson</code>), so a typo silently creates a new key. Rules are scattered: the 90% threshold appears in two methods with different values; certificate issuance can run twice because "already issued" lives in a different map than progress; adding quizzes would mean editing every method. There is no type to hang a unit test on.</p>`,
      code: { lang: 'java', code: `
class LearningPlatform {
    Map<String, List<String>> courseLessons = new HashMap<>();
    Map<String, Boolean> paid = new HashMap<>();               // course -> paid?
    Set<String> enrolled = new HashSet<>();                    // "learner|course"
    Map<String, Integer> watched = new HashMap<>();            // "learner|course|lesson" -> percent
    Map<String, String> certificates = new HashMap<>();        // "learner|course" -> id
    int certSeq = 1;

    String watch(String learner, String course, String lesson, int percent) {
        if (!enrolled.contains(learner + "|" + course)) return "not enrolled";
        watched.merge(learner + "|" + course + "|" + lesson, percent, Math::max);
        int done = 0;
        for (String l : courseLessons.get(course))
            if (watched.getOrDefault(learner + "|" + course + "|" + l, 0) >= 90) done++;
        if (done == courseLessons.get(course).size())
            certificates.put(learner + "|" + course, "CERT-" + (certSeq++));   // re-issued every time!
        return "ok";
    }
}`, alt: [
              { lang: 'python', code: `
class LearningPlatform:
    def __init__(self):
        self.course_lessons = {}
        self.paid = {}                # course -> paid?
        self.enrolled = set()         # "learner|course"
        self.watched = {}             # "learner|course|lesson" -> percent
        self.certificates = {}        # "learner|course" -> id
        self.cert_seq = 1

    def watch(self, learner, course, lesson, percent):
        if learner + "|" + course not in self.enrolled: return "not enrolled"
        k = learner + "|" + course + "|" + lesson
        self.watched[k] = max(self.watched.get(k, 0), percent)
        done = 0
        for l in self.course_lessons[course]:
            if self.watched.get(learner + "|" + course + "|" + l, 0) >= 90: done += 1
        if done == len(self.course_lessons[course]):
            self.certificates[learner + "|" + course] = "CERT-" + str(self.cert_seq); self.cert_seq += 1   # re-issued every time!
        return "ok"` },
              { lang: 'ts', code: `
class LearningPlatform {
    courseLessons = new Map<string, string[]>();
    paid = new Map<string, boolean>();               // course -> paid?
    enrolled = new Set<string>();                    // "learner|course"
    watched = new Map<string, number>();             // "learner|course|lesson" -> percent
    certificates = new Map<string, string>();        // "learner|course" -> id
    certSeq = 1;

    watch(learner: string, course: string, lesson: string, percent: number): string {
        if (!this.enrolled.has(learner + "|" + course)) return "not enrolled";
        const k = learner + "|" + course + "|" + lesson;
        this.watched.set(k, Math.max(this.watched.get(k) ?? 0, percent));
        let done = 0;
        for (const l of this.courseLessons.get(course)!)
            if ((this.watched.get(learner + "|" + course + "|" + l) ?? 0) >= 90) done++;
        if (done === this.courseLessons.get(course)!.length)
            this.certificates.set(learner + "|" + course, "CERT-" + (this.certSeq++));   // re-issued every time!
        return "ok";
    }
}` },
              { lang: 'cpp', code: `
class LearningPlatform {
    unordered_map<string, vector<string>> courseLessons;
    unordered_map<string, bool> paid;                // course -> paid?
    unordered_set<string> enrolled;                  // "learner|course"
    unordered_map<string, int> watched;              // "learner|course|lesson" -> percent
    unordered_map<string, string> certificates;      // "learner|course" -> id
    int certSeq = 1;
public:
    string watch(const string& learner, const string& course, const string& lesson, int percent) {
        if (!enrolled.count(learner + "|" + course)) return "not enrolled";
        int& w = watched[learner + "|" + course + "|" + lesson];
        w = max(w, percent);
        int done = 0;
        for (auto& l : courseLessons[course])
            if (watched[learner + "|" + course + "|" + l] >= 90) done++;
        if (done == (int)courseLessons[course].size())
            certificates[learner + "|" + course] = "CERT-" + to_string(certSeq++);   // re-issued every time!
        return "ok";
    }
};` }
            ] }
    },
    mcq: { q: 'Which hidden entity owns "is this lesson complete for this learner"?', options: ['Course', 'Lesson', 'Enrollment (learner + course), holding per-lesson progress', 'Certificate'], answer: 2, explain: 'Progress belongs to the learner-in-a-course relationship. Enrollment is the association class that should hold per-lesson watch percentages and decide completion.' },
    hints: [
      `<p>Hint 1: every string key is a hidden class: "learner|course" = Enrollment; "learner|course|lesson" = progress inside Enrollment; the certificate map = Certificate owned by Enrollment (0..1).</p>`,
      `<p>Hint 2: Course ◆ 1..* Lesson (ordered); Course has a price (0 = free). Enrollment → Course, → Learner; Enrollment ◆ Map&lt;Lesson, Integer&gt; progress; Enrollment ◆ 0..1 Certificate.</p>`,
      `<p>Hint 3: <code>Enrollment.watch(lesson, pct)</code> stores max pct; if <code>isComplete()</code> and certificate is null → issue via an injected <code>CertificateIssuer</code> (id generator). Payment check moves to <code>Platform.enroll</code> through a <code>PaymentGateway</code> interface.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "50\n100 CERT-1\n1\npayment failed\n" }] },
    solution: {
      approach: `<p><b>Entities recovered:</b> Course (id, title, price) ◆ 1..* Lesson; Learner; Enrollment (association class Learner–Course) ◆ per-lesson progress and ◆ 0..1 Certificate (value type). <b>Variation/infra:</b> «interface» PaymentGateway, CertificateIssuer (id sequence). <b>Coordinator:</b> Platform with in-memory maps and two use cases (enroll, watch). Rules move to their experts: completion threshold in Enrollment (one constant), "issue once" in Enrollment (it owns the 0..1 certificate), payment in Platform.enroll (enrolling twice returns the existing Enrollment, so a learner is never charged twice). Strings become types, so typos fail to compile.</p>`,
      code: `
record Lesson(String id, String title) { }
record Certificate(String id, String learner, String courseId) { }

class Course {
    private final String id, title;
    private final long pricePaise;
    private final List<Lesson> lessons = new ArrayList<>();      // composition, ordered
    Course(String id, String title, long pricePaise) { this.id = id; this.title = title; this.pricePaise = pricePaise; }
    Lesson addLesson(String lid, String t) { Lesson l = new Lesson(lid, t); lessons.add(l); return l; }
    List<Lesson> lessons() { return List.copyOf(lessons); }
    boolean isPaid() { return pricePaise > 0; }
    long price() { return pricePaise; }
    String id() { return id; }
}

interface PaymentGateway { boolean charge(String learner, long amountPaise); }

class CertificateIssuer {
    private int seq = 1;
    Certificate issue(String learner, String courseId) { return new Certificate("CERT-" + (seq++), learner, courseId); }
}

class Enrollment {                                              // association class Learner - Course
    private static final int COMPLETE_AT = 90;                  // the ONE place for the threshold
    private final String learner;
    private final Course course;
    private final Map<String, Integer> watchedPercent = new HashMap<>();
    private Certificate certificate;                            // 0..1
    Enrollment(String learner, Course course) { this.learner = learner; this.course = course; }

    void watch(Lesson lesson, int percent, CertificateIssuer issuer) {
        if (!course.lessons().contains(lesson)) throw new IllegalArgumentException("lesson not in course");
        watchedPercent.merge(lesson.id(), Math.min(100, percent), Math::max);
        if (certificate == null && progressPercent() == 100) certificate = issuer.issue(learner, course.id()); // once
    }
    int progressPercent() {
        List<Lesson> ls = course.lessons();
        long done = ls.stream().filter(l -> watchedPercent.getOrDefault(l.id(), 0) >= COMPLETE_AT).count();
        return ls.isEmpty() ? 0 : (int) (100 * done / ls.size());   // an empty course is never "complete"
    }
    Optional<Certificate> certificate() { return Optional.ofNullable(certificate); }
}

class Platform {
    private final Map<String, Course> courses = new HashMap<>();
    private final Map<String, Enrollment> enrollments = new HashMap<>();   // key learner|course kept internal
    private final PaymentGateway payments;
    private final CertificateIssuer issuer = new CertificateIssuer();
    Platform(PaymentGateway payments) { this.payments = payments; }

    void addCourse(Course c) { courses.put(c.id(), c); }
    Enrollment enroll(String learner, String courseId) {
        Course c = courses.get(courseId);
        if (c == null) throw new IllegalArgumentException("unknown course");
        Enrollment existing = enrollments.get(learner + "|" + courseId);
        if (existing != null) return existing;                      // enrolling twice must not charge twice
        if (c.isPaid() && !payments.charge(learner, c.price())) throw new IllegalStateException("payment failed");
        Enrollment e = new Enrollment(learner, c);
        enrollments.put(learner + "|" + courseId, e);
        return e;
    }
    void watch(String learner, String courseId, Lesson lesson, int percent) {
        Enrollment e = enrollments.get(learner + "|" + courseId);
        if (e == null) throw new IllegalStateException("not enrolled");
        e.watch(lesson, percent, issuer);
    }

    public static void main(String[] args) {
        Platform p = new Platform((who, amt) -> true);
        Course intro = new Course("J101", "Intro 101", 0);
        Lesson l1 = intro.addLesson("L1", "Basics"), l2 = intro.addLesson("L2", "OOP");
        p.addCourse(intro);
        Enrollment e = p.enroll("asha", "J101");
        p.watch("asha", "J101", l1, 95);
        p.watch("asha", "J101", l2, 50);
        System.out.println(e.progressPercent());                       // 50
        p.watch("asha", "J101", l2, 92);
        p.watch("asha", "J101", l2, 100);
        System.out.println(e.progressPercent() + " " + e.certificate().map(Certificate::id).orElse("-"));  // 100 CERT-1
        int[] charges = {0};
        Platform paid = new Platform((who, amt) -> { charges[0]++; return true; });
        paid.addCourse(new Course("A1", "Advanced", 49900));
        paid.enroll("ravi", "A1");
        paid.enroll("ravi", "A1");
        System.out.println(charges[0]);                                 // 1: the second enroll is a no-op
        Platform broke = new Platform((who, amt) -> false);
        broke.addCourse(new Course("A1", "Advanced", 49900));
        try { broke.enroll("mia", "A1"); } catch (IllegalStateException ex) { System.out.println(ex.getMessage()); }   // payment failed
    }
}`,
      alt: [
        { lang: 'python', code: `
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

PaymentGateway = Callable[[str, int], bool]  # (learner, amount_paise) -> charged?


@dataclass(frozen=True)
class Lesson:
    id: str
    title: str


@dataclass(frozen=True)
class Certificate:
    id: str
    learner: str
    course_id: str


class Course:
    def __init__(self, course_id: str, title: str, price_paise: int) -> None:
        self.id = course_id
        self.title = title
        self.price = price_paise
        self._lessons: list[Lesson] = []  # composition, ordered

    def add_lesson(self, lesson_id: str, title: str) -> Lesson:
        lesson = Lesson(lesson_id, title)
        self._lessons.append(lesson)
        return lesson

    def lessons(self) -> list[Lesson]:
        return list(self._lessons)

    def is_paid(self) -> bool:
        return self.price > 0


class CertificateIssuer:
    def __init__(self) -> None:
        self._seq = 1

    def issue(self, learner: str, course_id: str) -> Certificate:
        cert = Certificate(f"CERT-{self._seq}", learner, course_id)
        self._seq += 1
        return cert


class Enrollment:  # association class Learner - Course
    COMPLETE_AT = 90  # the ONE place for the threshold

    def __init__(self, learner: str, course: Course) -> None:
        self._learner = learner
        self._course = course
        self._watched_percent: dict[str, int] = {}
        self._certificate: Certificate | None = None  # 0..1

    def watch(self, lesson: Lesson, percent: int, issuer: CertificateIssuer) -> None:
        if lesson not in self._course.lessons():
            raise ValueError("lesson not in course")
        best = max(self._watched_percent.get(lesson.id, 0), min(100, percent))
        self._watched_percent[lesson.id] = best
        if self._certificate is None and self.progress_percent() == 100:  # once
            self._certificate = issuer.issue(self._learner, self._course.id)

    def progress_percent(self) -> int:
        lessons = self._course.lessons()
        done = sum(1 for lesson in lessons if self._watched_percent.get(lesson.id, 0) >= Enrollment.COMPLETE_AT)
        return 0 if not lessons else 100 * done // len(lessons)  # an empty course is never "complete"

    @property
    def certificate(self) -> Certificate | None:
        return self._certificate


class Platform:
    def __init__(self, payments: PaymentGateway) -> None:
        self._courses: dict[str, Course] = {}
        self._enrollments: dict[str, Enrollment] = {}  # key learner|course kept internal
        self._payments = payments
        self._issuer = CertificateIssuer()

    def add_course(self, course: Course) -> None:
        self._courses[course.id] = course

    def enroll(self, learner: str, course_id: str) -> Enrollment:
        course = self._courses.get(course_id)
        if course is None:
            raise ValueError("unknown course")
        key = f"{learner}|{course_id}"
        if key in self._enrollments:
            return self._enrollments[key]  # enrolling twice must not charge twice
        if course.is_paid() and not self._payments(learner, course.price):
            raise RuntimeError("payment failed")
        self._enrollments[key] = Enrollment(learner, course)
        return self._enrollments[key]

    def watch(self, learner: str, course_id: str, lesson: Lesson, percent: int) -> None:
        e = self._enrollments.get(f"{learner}|{course_id}")
        if e is None:
            raise RuntimeError("not enrolled")
        e.watch(lesson, percent, self._issuer)


def main() -> None:
    p = Platform(lambda who, amt: True)
    intro = Course("J101", "Intro 101", 0)
    l1, l2 = intro.add_lesson("L1", "Basics"), intro.add_lesson("L2", "OOP")
    p.add_course(intro)
    e = p.enroll("asha", "J101")
    p.watch("asha", "J101", l1, 95)
    p.watch("asha", "J101", l2, 50)
    print(e.progress_percent())  # 50
    p.watch("asha", "J101", l2, 92)
    p.watch("asha", "J101", l2, 100)
    print(e.progress_percent(), e.certificate.id if e.certificate else "-")  # 100 CERT-1
    charges = [0]

    def counting(who: str, amt: int) -> bool:
        charges[0] += 1
        return True

    paid = Platform(counting)
    paid.add_course(Course("A1", "Advanced", 49900))
    paid.enroll("ravi", "A1")
    paid.enroll("ravi", "A1")
    print(charges[0])  # 1: the second enroll is a no-op
    broke = Platform(lambda who, amt: False)
    broke.add_course(Course("A1", "Advanced", 49900))
    try:
        broke.enroll("mia", "A1")
    except RuntimeError as ex:
        print(ex)  # payment failed


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
type PaymentGateway = (learner: string, amountPaise: number) => boolean;

interface Lesson { readonly id: string; readonly title: string; }
interface Certificate { readonly id: string; readonly learner: string; readonly courseId: string; }

class Course {
  private readonly lessonList: Lesson[] = []; // composition, ordered
  constructor(readonly id: string, readonly title: string, private readonly pricePaise: number) {}
  addLesson(lid: string, title: string): Lesson {
    const lesson: Lesson = { id: lid, title };
    this.lessonList.push(lesson);
    return lesson;
  }
  lessons(): readonly Lesson[] { return [...this.lessonList]; }
  isPaid(): boolean { return this.pricePaise > 0; }
  price(): number { return this.pricePaise; }
}

class CertificateIssuer {
  private seq = 1;
  issue(learner: string, courseId: string): Certificate {
    return { id: "CERT-" + this.seq++, learner, courseId };
  }
}

class Enrollment { // association class Learner - Course
  private static readonly COMPLETE_AT = 90; // the ONE place for the threshold
  private readonly watchedPercent = new Map<string, number>();
  private issued: Certificate | undefined; // 0..1
  constructor(private readonly learner: string, private readonly course: Course) {}

  watch(lesson: Lesson, percent: number, issuer: CertificateIssuer): void {
    if (!this.course.lessons().some((l) => l.id === lesson.id && l.title === lesson.title)) {
      throw new Error("lesson not in course");
    }
    const best = Math.max(this.watchedPercent.get(lesson.id) ?? 0, Math.min(100, percent));
    this.watchedPercent.set(lesson.id, best);
    if (this.issued === undefined && this.progressPercent() === 100) { // once
      this.issued = issuer.issue(this.learner, this.course.id);
    }
  }
  progressPercent(): number {
    const ls = this.course.lessons();
    const done = ls.filter((l) => (this.watchedPercent.get(l.id) ?? 0) >= Enrollment.COMPLETE_AT).length;
    return ls.length === 0 ? 0 : Math.floor((100 * done) / ls.length); // an empty course is never "complete"
  }
  certificate(): Certificate | undefined { return this.issued; }
}

class Platform {
  private readonly courses = new Map<string, Course>();
  private readonly enrollments = new Map<string, Enrollment>(); // key learner|course kept internal
  private readonly issuer = new CertificateIssuer();
  constructor(private readonly payments: PaymentGateway) {}

  addCourse(c: Course): void { this.courses.set(c.id, c); }
  enroll(learner: string, courseId: string): Enrollment {
    const c = this.courses.get(courseId);
    if (!c) throw new Error("unknown course");
    const key = \`\${learner}|\${courseId}\`;
    const existing = this.enrollments.get(key);
    if (existing) return existing; // enrolling twice must not charge twice
    if (c.isPaid() && !this.payments(learner, c.price())) throw new Error("payment failed");
    const e = new Enrollment(learner, c);
    this.enrollments.set(key, e);
    return e;
  }
  watch(learner: string, courseId: string, lesson: Lesson, percent: number): void {
    const e = this.enrollments.get(\`\${learner}|\${courseId}\`);
    if (!e) throw new Error("not enrolled");
    e.watch(lesson, percent, this.issuer);
  }
}

function main(): void {
  const p = new Platform(() => true);
  const intro = new Course("J101", "Intro 101", 0);
  const l1 = intro.addLesson("L1", "Basics"), l2 = intro.addLesson("L2", "OOP");
  p.addCourse(intro);
  const e = p.enroll("asha", "J101");
  p.watch("asha", "J101", l1, 95);
  p.watch("asha", "J101", l2, 50);
  console.log(e.progressPercent()); // 50
  p.watch("asha", "J101", l2, 92);
  p.watch("asha", "J101", l2, 100);
  console.log(e.progressPercent() + " " + (e.certificate()?.id ?? "-")); // 100 CERT-1
  let charges = 0;
  const paid = new Platform(() => { charges++; return true; });
  paid.addCourse(new Course("A1", "Advanced", 49900));
  paid.enroll("ravi", "A1");
  paid.enroll("ravi", "A1");
  console.log(charges); // 1: the second enroll is a no-op
  const broke = new Platform(() => false);
  broke.addCourse(new Course("A1", "Advanced", 49900));
  try {
    broke.enroll("mia", "A1");
  } catch (ex) {
    console.log((ex as Error).message); // payment failed
  }
}
main();` },
        { lang: 'cpp', code: `
using PaymentGateway = function<bool(const string&, long long)>;  // (learner, amountPaise) -> charged?

struct Lesson {
    string id, title;
    bool operator==(const Lesson&) const = default;
};

struct Certificate {
    string id, learner, courseId;
};

class Course {
public:
    Course(string id, string title, long long pricePaise)
        : id_(std::move(id)), title_(std::move(title)), pricePaise_(pricePaise) {}
    Lesson addLesson(const string& lid, const string& title) {
        lessons_.push_back({lid, title});
        return lessons_.back();
    }
    const vector<Lesson>& lessons() const { return lessons_; }
    bool isPaid() const { return pricePaise_ > 0; }
    long long price() const { return pricePaise_; }
    const string& id() const { return id_; }
private:
    string id_, title_;
    long long pricePaise_;
    vector<Lesson> lessons_;  // composition, ordered
};

class CertificateIssuer {
public:
    Certificate issue(const string& learner, const string& courseId) {
        return {"CERT-" + to_string(seq_++), learner, courseId};
    }
private:
    int seq_ = 1;
};

class Enrollment {  // association class Learner - Course
public:
    Enrollment(string learner, const Course& course) : learner_(std::move(learner)), course_(&course) {}

    void watch(const Lesson& lesson, int percent, CertificateIssuer& issuer) {
        const auto& ls = course_->lessons();
        if (find(ls.begin(), ls.end(), lesson) == ls.end()) throw invalid_argument("lesson not in course");
        int& best = watchedPercent_[lesson.id];
        best = max(best, min(100, percent));
        if (!certificate_ && progressPercent() == 100)  // once
            certificate_ = issuer.issue(learner_, course_->id());
    }
    int progressPercent() const {
        const auto& ls = course_->lessons();
        int done = 0;
        for (const auto& l : ls) {
            auto it = watchedPercent_.find(l.id);
            if (it != watchedPercent_.end() && it->second >= COMPLETE_AT) ++done;
        }
        return ls.empty() ? 0 : 100 * done / static_cast<int>(ls.size());  // an empty course is never "complete"
    }
    const optional<Certificate>& certificate() const { return certificate_; }

private:
    static constexpr int COMPLETE_AT = 90;  // the ONE place for the threshold
    string learner_;
    const Course* course_;  // non-owning: the platform owns courses
    map<string, int> watchedPercent_;
    optional<Certificate> certificate_;  // 0..1
};

class Platform {
public:
    explicit Platform(PaymentGateway payments) : payments_(std::move(payments)) {}

    void addCourse(unique_ptr<Course> c) {
        string id = c->id();
        courses_[id] = std::move(c);
    }
    Enrollment& enroll(const string& learner, const string& courseId) {
        auto cit = courses_.find(courseId);
        if (cit == courses_.end()) throw invalid_argument("unknown course");
        string key = learner + "|" + courseId;
        auto eit = enrollments_.find(key);
        if (eit != enrollments_.end()) return *eit->second;  // enrolling twice must not charge twice
        const Course& c = *cit->second;
        if (c.isPaid() && !payments_(learner, c.price())) throw runtime_error("payment failed");
        return *(enrollments_[key] = make_unique<Enrollment>(learner, c));
    }
    void watch(const string& learner, const string& courseId, const Lesson& lesson, int percent) {
        auto it = enrollments_.find(learner + "|" + courseId);
        if (it == enrollments_.end()) throw runtime_error("not enrolled");
        it->second->watch(lesson, percent, issuer_);
    }

private:
    map<string, unique_ptr<Course>> courses_;
    map<string, unique_ptr<Enrollment>> enrollments_;  // key learner|course kept internal
    PaymentGateway payments_;
    CertificateIssuer issuer_;
};

int main() {
    Platform p([](const string&, long long) { return true; });
    auto intro = make_unique<Course>("J101", "Intro 101", 0);
    Lesson l1 = intro->addLesson("L1", "Basics"), l2 = intro->addLesson("L2", "OOP");
    p.addCourse(std::move(intro));
    Enrollment& e = p.enroll("asha", "J101");
    p.watch("asha", "J101", l1, 95);
    p.watch("asha", "J101", l2, 50);
    cout << e.progressPercent() << "\\n";  // 50
    p.watch("asha", "J101", l2, 92);
    p.watch("asha", "J101", l2, 100);
    cout << e.progressPercent() << " " << (e.certificate() ? e.certificate()->id : "-") << "\\n";  // 100 CERT-1
    int charges = 0;
    Platform paid([&charges](const string&, long long) { ++charges; return true; });
    paid.addCourse(make_unique<Course>("A1", "Advanced", 49900));
    paid.enroll("ravi", "A1");
    paid.enroll("ravi", "A1");
    cout << charges << "\\n";  // 1: the second enroll is a no-op
    Platform broke([](const string&, long long) { return false; });
    broke.addCourse(make_unique<Course>("A1", "Advanced", 49900));
    try {
        broke.enroll("mia", "A1");
    } catch (const runtime_error& ex) {
        cout << ex.what() << "\\n";  // payment failed
    }
}` }
      ],
      complexity: `<p>watch is O(lessons in the course) for the progress check (cache a completed-count to make it O(1)). Same behaviour as before, but each rule has one home and each class can be unit tested alone.</p>`,
      followUps: ['Add quizzes that must be passed (≥ 60%) for a lesson to count: which class changes?', 'How would you refactor safely in production (characterisation tests first, strangler approach)?', 'Courses get versions (lessons added later): do existing certificates stay valid?']
    }
  });

  practice.push({
    title: 'In-Memory File System: Recursive Composition',
    level: 'Hard', tags: ['composition', 'inheritance', 'recursion', 'self-association'], companies: ['Google', 'Dropbox', 'Microsoft', 'Amazon'],
    statement: `<p>Model an in-memory file system. A <b>directory</b> contains files and other directories (any depth). A <b>file</b> has a name and content (its size = content length). Support <code>mkdir -p</code> on a path like <code>/a/b/c</code>, <code>write(path, content)</code> creating the file if needed, <code>ls(path)</code> (sorted names), <code>size(path)</code> (recursive for directories), and <code>rm(path)</code> which removes a directory with everything inside it. Draw the class diagram and implement it.</p>`,
    constraints: `<ul><li>Names are unique within a directory; a file and directory cannot share a name there.</li><li>Paths are absolute, '/'-separated; root is "/".</li><li>rm on root is not allowed.</li></ul>`,
    example: `<p>mkdir /docs/java; write /docs/java/notes.txt "OOP!" (4 bytes); write /docs/plan.txt "buy milk" (8 bytes).</p>
${H.table(['call', 'result'], [['ls /docs', H.c('g', '[java, plan.txt]')], ['size /docs', H.c('g', '12')], ['rm /docs/java', 'java and notes.txt gone'], ['size /docs', H.c('y', '8')]])}`,
    brute: {
      why: `<p>The naive design stores a flat <code>Map&lt;String, String&gt;</code> from full path to content, and directories as a <code>Set&lt;String&gt;</code> of path strings. <code>ls</code> and <code>size</code> scan every path with <code>startsWith</code> (O(total files) per call and buggy: "/doc" matches "/docs"); <code>rm</code> must find all prefixes; renaming a directory rewrites thousands of keys. The tree structure exists only in string prefixes.</p>`,
      code: { lang: 'java', code: `
class FlatFs {
    Map<String, String> files = new HashMap<>();      // "/docs/java/notes.txt" -> content
    Set<String> dirs = new HashSet<>();
    long size(String path) {
        long s = 0;
        for (var e : files.entrySet()) if (e.getKey().startsWith(path)) s += e.getValue().length();  // "/doc" matches "/docs"!
        return s;
    }
}`, alt: [
              { lang: 'python', code: `
class FlatFs:
    def __init__(self):
        self.files = {}      # "/docs/java/notes.txt" -> content
        self.dirs = set()

    def size(self, path):
        s = 0
        for k, v in self.files.items():
            if k.startswith(path): s += len(v)      # "/doc" matches "/docs"!
        return s` },
              { lang: 'ts', code: `
class FlatFs {
    files = new Map<string, string>();      // "/docs/java/notes.txt" -> content
    dirs = new Set<string>();
    size(path: string): number {
        let s = 0;
        for (const [k, v] of this.files) if (k.startsWith(path)) s += v.length;  // "/doc" matches "/docs"!
        return s;
    }
}` },
              { lang: 'cpp', code: `
class FlatFs {
    unordered_map<string, string> files;      // "/docs/java/notes.txt" -> content
    unordered_set<string> dirs;
public:
    long long size(const string& path) {
        long long s = 0;
        for (auto& [k, v] : files) if (k.rfind(path, 0) == 0) s += v.size();   // "/doc" matches "/docs"!
        return s;
    }
};` }
            ] }
    },
    mcq: { q: 'Directory contains Files and Directories. What structure models "any depth" cleanly?', options: ['Directory has List&lt;File&gt; and List&lt;List&lt;File&gt;&gt;', 'abstract Entry; File extends Entry; Directory extends Entry and ◆ 0..* Entry children', 'One class Node with a boolean isFile and a String content for everything', 'A Map from path to content only'], answer: 1, explain: 'A recursive composition: Directory owns children of the common supertype Entry, which can themselves be directories. Polymorphic size() then recurses naturally (the Composite pattern you will meet later).' },
    hints: [
      `<p>Hint 1: both files and directories have a name and a size, and a directory holds "things that are either". That common supertype is <code>abstract class Entry</code>.</p>`,
      `<p>Hint 2: <code>Directory ◆ 0..* Entry</code> as a <code>TreeMap&lt;String, Entry&gt;</code> (sorted ls for free). <code>File.size()</code> = content length; <code>Directory.size()</code> = sum of children's size() (polymorphic recursion).</p>`,
      `<p>Hint 3: a FileSystem facade splits paths and walks from root; <code>mkdir</code> creates missing directories; <code>rm</code> = parent.children.remove(name) (composition: the whole subtree goes with it).</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "java plan.txt\n12\njava is a directory\n8\n/docs/java\n" }] },
    solution: {
      approach: `<p><b>Diagram:</b> <code>«abstract» Entry</code> (name, size()) ◁— <code>File</code> (content), ◁— <code>Directory</code>; <code>Directory 1 ◆— 0..* Entry</code> (recursive composition: a directory is part of its parent, deleting the parent deletes the subtree). <code>FileSystem ◆ 1 Directory</code> (root) as the facade parsing paths. size() is polymorphic: File answers directly, Directory sums its children. A TreeMap keeps names unique and sorted.</p>`,
      code: `
abstract class Entry {
    private final String name;
    protected Entry(String name) { this.name = name; }
    String name() { return name; }
    abstract long size();
}

class FileEntry extends Entry {
    private String content = "";
    FileEntry(String name) { super(name); }
    void write(String c) { content = c; }
    long size() { return content.length(); }
}

class Directory extends Entry {
    private final TreeMap<String, Entry> children = new TreeMap<>();   // recursive composition
    Directory(String name) { super(name); }
    long size() {
        long s = 0;
        for (Entry e : children.values()) s += e.size();                // polymorphic recursion
        return s;
    }
    Entry child(String n) { return children.get(n); }
    Directory dir(String n) {
        Entry e = children.computeIfAbsent(n, Directory::new);
        if (!(e instanceof Directory d)) throw new IllegalStateException(n + " is a file");
        return d;
    }
    FileEntry file(String n) {
        Entry e = children.computeIfAbsent(n, FileEntry::new);
        if (!(e instanceof FileEntry f)) throw new IllegalStateException(n + " is a directory");
        return f;
    }
    boolean remove(String n) { return children.remove(n) != null; }       // subtree goes with it
    List<String> names() { return new ArrayList<>(children.keySet()); }
}

class FileSystem {
    private final Directory root = new Directory("");

    private static String[] parts(String path) {
        if (!path.startsWith("/")) throw new IllegalArgumentException("absolute path required");
        return Arrays.stream(path.split("/")).filter(s -> !s.isEmpty()).toArray(String[]::new);
    }
    private Entry resolve(String path) {
        Entry cur = root;
        for (String p : parts(path)) {
            if (!(cur instanceof Directory d) || (cur = d.child(p)) == null) throw new NoSuchElementException(path);
        }
        return cur;
    }

    void mkdirs(String path) { Directory cur = root; for (String p : parts(path)) cur = cur.dir(p); }
    void write(String path, String content) {
        String[] ps = parts(path);
        Directory cur = root;
        for (int i = 0; i < ps.length - 1; i++) cur = cur.dir(ps[i]);
        cur.file(ps[ps.length - 1]).write(content);
    }
    List<String> ls(String path) {
        Entry e = resolve(path);
        return e instanceof Directory d ? d.names() : List.of(e.name());
    }
    long size(String path) { return resolve(path).size(); }
    void rm(String path) {
        String[] ps = parts(path);
        if (ps.length == 0) throw new IllegalArgumentException("cannot remove root");
        Entry parent = resolve("/" + String.join("/", Arrays.copyOf(ps, ps.length - 1)));
        if (!(parent instanceof Directory d) || !d.remove(ps[ps.length - 1])) throw new NoSuchElementException(path);
    }

    public static void main(String[] args) {
        FileSystem fs = new FileSystem();
        fs.mkdirs("/docs/java");
        fs.write("/docs/java/notes.txt", "OOP!");
        fs.write("/docs/plan.txt", "buy milk");
        System.out.println(String.join(" ", fs.ls("/docs")));   // java plan.txt
        System.out.println(fs.size("/docs"));   // 12
        try { fs.write("/docs/java", "x"); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }   // java is a directory
        fs.rm("/docs/java");
        System.out.println(fs.size("/docs"));   // 8
        try { fs.ls("/docs/java"); } catch (NoSuchElementException e) { System.out.println(e.getMessage()); }   // /docs/java
    }
}`,
      alt: [
        { lang: 'python', code: `
from abc import ABC, abstractmethod


class Entry(ABC):
    def __init__(self, name: str) -> None:
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    @abstractmethod
    def size(self) -> int: ...


class FileEntry(Entry):
    def __init__(self, name: str) -> None:
        super().__init__(name)
        self._content = ""

    def write(self, content: str) -> None:
        self._content = content

    def size(self) -> int:
        return len(self._content)


class Directory(Entry):
    def __init__(self, name: str) -> None:
        super().__init__(name)
        self._children: dict[str, Entry] = {}  # recursive composition

    def size(self) -> int:
        return sum(e.size() for e in self._children.values())  # polymorphic recursion

    def child(self, name: str) -> Entry | None:
        return self._children.get(name)

    def dir(self, name: str) -> "Directory":
        e = self._children.setdefault(name, Directory(name))
        if not isinstance(e, Directory):
            raise RuntimeError(f"{name} is a file")
        return e

    def file(self, name: str) -> FileEntry:
        e = self._children.setdefault(name, FileEntry(name))
        if not isinstance(e, FileEntry):
            raise RuntimeError(f"{name} is a directory")
        return e

    def remove(self, name: str) -> bool:
        return self._children.pop(name, None) is not None  # subtree goes with it

    def names(self) -> list[str]:
        return sorted(self._children)


class FileSystem:
    def __init__(self) -> None:
        self._root = Directory("")

    @staticmethod
    def _parts(path: str) -> list[str]:
        if not path.startswith("/"):
            raise ValueError("absolute path required")
        return [p for p in path.split("/") if p]

    def _resolve(self, path: str) -> Entry:
        cur: Entry = self._root
        for p in self._parts(path):
            nxt = cur.child(p) if isinstance(cur, Directory) else None
            if nxt is None:
                raise FileNotFoundError(path)
            cur = nxt
        return cur

    def mkdirs(self, path: str) -> None:
        cur = self._root
        for p in self._parts(path):
            cur = cur.dir(p)

    def write(self, path: str, content: str) -> None:
        ps = self._parts(path)
        cur = self._root
        for p in ps[:-1]:
            cur = cur.dir(p)
        cur.file(ps[-1]).write(content)

    def ls(self, path: str) -> list[str]:
        e = self._resolve(path)
        return e.names() if isinstance(e, Directory) else [e.name]

    def size(self, path: str) -> int:
        return self._resolve(path).size()

    def rm(self, path: str) -> None:
        ps = self._parts(path)
        if not ps:
            raise ValueError("cannot remove root")
        parent = self._resolve("/" + "/".join(ps[:-1]))
        if not isinstance(parent, Directory) or not parent.remove(ps[-1]):
            raise FileNotFoundError(path)


def main() -> None:
    fs = FileSystem()
    fs.mkdirs("/docs/java")
    fs.write("/docs/java/notes.txt", "OOP!")
    fs.write("/docs/plan.txt", "buy milk")
    print(" ".join(fs.ls("/docs")))  # java plan.txt
    print(fs.size("/docs"))  # 12
    try:
        fs.write("/docs/java", "x")
    except RuntimeError as e:
        print(e)  # java is a directory
    fs.rm("/docs/java")
    print(fs.size("/docs"))  # 8
    try:
        fs.ls("/docs/java")
    except FileNotFoundError as e:
        print(e)  # /docs/java


if __name__ == "__main__":
    main()` },
        { lang: 'ts', code: `
abstract class Entry {
  protected constructor(private readonly label: string) {}
  name(): string { return this.label; }
  abstract size(): number;
}

class FileEntry extends Entry {
  private content = "";
  constructor(name: string) { super(name); }
  write(c: string): void { this.content = c; }
  size(): number { return this.content.length; }
}

class Directory extends Entry {
  private readonly children = new Map<string, Entry>(); // recursive composition
  constructor(name: string) { super(name); }
  size(): number {
    let s = 0;
    for (const e of this.children.values()) s += e.size(); // polymorphic recursion
    return s;
  }
  child(n: string): Entry | undefined { return this.children.get(n); }
  dir(n: string): Directory {
    let e = this.children.get(n);
    if (!e) {
      e = new Directory(n);
      this.children.set(n, e);
    }
    if (!(e instanceof Directory)) throw new Error(\`\${n} is a file\`);
    return e;
  }
  file(n: string): FileEntry {
    let e = this.children.get(n);
    if (!e) {
      e = new FileEntry(n);
      this.children.set(n, e);
    }
    if (!(e instanceof FileEntry)) throw new Error(\`\${n} is a directory\`);
    return e;
  }
  remove(n: string): boolean { return this.children.delete(n); } // subtree goes with it
  names(): string[] { return [...this.children.keys()].sort(); }
}

class FileSystem {
  private readonly root = new Directory("");

  private static parts(path: string): string[] {
    if (!path.startsWith("/")) throw new Error("absolute path required");
    return path.split("/").filter((s) => s !== "");
  }
  private resolve(path: string): Entry {
    let cur: Entry = this.root;
    for (const p of FileSystem.parts(path)) {
      const next: Entry | undefined = cur instanceof Directory ? cur.child(p) : undefined;
      if (!next) throw new Error(path);
      cur = next;
    }
    return cur;
  }

  mkdirs(path: string): void {
    let cur = this.root;
    for (const p of FileSystem.parts(path)) cur = cur.dir(p);
  }
  write(path: string, content: string): void {
    const ps = FileSystem.parts(path);
    let cur = this.root;
    for (const p of ps.slice(0, -1)) cur = cur.dir(p);
    cur.file(ps[ps.length - 1]).write(content);
  }
  ls(path: string): string[] {
    const e = this.resolve(path);
    return e instanceof Directory ? e.names() : [e.name()];
  }
  size(path: string): number { return this.resolve(path).size(); }
  rm(path: string): void {
    const ps = FileSystem.parts(path);
    if (ps.length === 0) throw new Error("cannot remove root");
    const parent = this.resolve("/" + ps.slice(0, -1).join("/"));
    if (!(parent instanceof Directory) || !parent.remove(ps[ps.length - 1])) throw new Error(path);
  }
}

function main(): void {
  const fs = new FileSystem();
  fs.mkdirs("/docs/java");
  fs.write("/docs/java/notes.txt", "OOP!");
  fs.write("/docs/plan.txt", "buy milk");
  console.log(fs.ls("/docs").join(" ")); // java plan.txt
  console.log(fs.size("/docs")); // 12
  try {
    fs.write("/docs/java", "x");
  } catch (e) {
    console.log((e as Error).message); // java is a directory
  }
  fs.rm("/docs/java");
  console.log(fs.size("/docs")); // 8
  try {
    fs.ls("/docs/java");
  } catch (e) {
    console.log((e as Error).message); // /docs/java
  }
}
main();` },
        { lang: 'cpp', code: `
class Entry {
public:
    virtual ~Entry() = default;
    const string& name() const { return name_; }
    virtual long long size() const = 0;
protected:
    explicit Entry(string name) : name_(std::move(name)) {}
private:
    string name_;
};

class FileEntry : public Entry {
public:
    explicit FileEntry(string name) : Entry(std::move(name)) {}
    void write(string c) { content_ = std::move(c); }
    long long size() const override { return static_cast<long long>(content_.size()); }
private:
    string content_;
};

class Directory : public Entry {
public:
    explicit Directory(string name) : Entry(std::move(name)) {}
    long long size() const override {
        long long s = 0;
        for (const auto& [n, e] : children_) s += e->size();  // polymorphic recursion
        return s;
    }
    Entry* child(const string& n) const {
        auto it = children_.find(n);
        return it == children_.end() ? nullptr : it->second.get();
    }
    Directory& dir(const string& n) {
        auto& slot = children_[n];
        if (!slot) slot = make_unique<Directory>(n);
        auto* d = dynamic_cast<Directory*>(slot.get());
        if (!d) throw runtime_error(n + " is a file");
        return *d;
    }
    FileEntry& file(const string& n) {
        auto& slot = children_[n];
        if (!slot) slot = make_unique<FileEntry>(n);
        auto* f = dynamic_cast<FileEntry*>(slot.get());
        if (!f) throw runtime_error(n + " is a directory");
        return *f;
    }
    bool remove(const string& n) { return children_.erase(n) > 0; }  // subtree goes with it
    vector<string> names() const {
        vector<string> out;
        for (const auto& [n, e] : children_) out.push_back(n);
        return out;
    }
private:
    map<string, unique_ptr<Entry>> children_;  // recursive composition: each directory owns its subtree
};

class FileSystem {
public:
    FileSystem() : root_("") {}

    void mkdirs(const string& path) {
        Directory* cur = &root_;
        for (const auto& p : parts(path)) cur = &cur->dir(p);
    }
    void write(const string& path, const string& content) {
        auto ps = parts(path);
        Directory* cur = &root_;
        for (size_t i = 0; i + 1 < ps.size(); ++i) cur = &cur->dir(ps[i]);
        cur->file(ps.back()).write(content);
    }
    vector<string> ls(const string& path) {
        Entry* e = resolve(path);
        if (auto* d = dynamic_cast<Directory*>(e)) return d->names();
        return {e->name()};
    }
    long long size(const string& path) { return resolve(path)->size(); }
    void rm(const string& path) {
        auto ps = parts(path);
        if (ps.empty()) throw invalid_argument("cannot remove root");
        string last = ps.back();
        ps.pop_back();
        string parentPath = "/";
        for (size_t i = 0; i < ps.size(); ++i) parentPath += (i ? "/" : "") + ps[i];
        auto* parent = dynamic_cast<Directory*>(resolve(parentPath));
        if (!parent || !parent->remove(last)) throw runtime_error(path);
    }

private:
    static vector<string> parts(const string& path) {
        if (path.empty() || path[0] != '/') throw invalid_argument("absolute path required");
        vector<string> out;
        string cur;
        for (char c : path + "/") {
            if (c == '/') {
                if (!cur.empty()) out.push_back(cur);
                cur.clear();
            } else {
                cur += c;
            }
        }
        return out;
    }
    Entry* resolve(const string& path) {
        Entry* cur = &root_;
        for (const auto& p : parts(path)) {
            auto* d = dynamic_cast<Directory*>(cur);
            cur = d ? d->child(p) : nullptr;
            if (!cur) throw runtime_error(path);
        }
        return cur;
    }
    Directory root_;
};

int main() {
    FileSystem fs;
    fs.mkdirs("/docs/java");
    fs.write("/docs/java/notes.txt", "OOP!");
    fs.write("/docs/plan.txt", "buy milk");
    auto names = fs.ls("/docs");
    cout << names[0] << " " << names[1] << "\\n";  // java plan.txt
    cout << fs.size("/docs") << "\\n";             // 12
    try {
        fs.write("/docs/java", "x");
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";  // java is a directory
    }
    fs.rm("/docs/java");
    cout << fs.size("/docs") << "\\n";  // 8
    try {
        fs.ls("/docs/java");
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";  // /docs/java
    }
}` }
      ],
      complexity: `<p>Path operations are O(depth × log fanout) thanks to TreeMap; size is O(subtree) (cache sizes with parent pointers to make it O(depth) per update); rm is O(log fanout) since the subtree is dropped by reference.</p>`,
      followUps: ['Add mv (move a directory): which relationship makes this O(1)?', 'Add symbolic links: what new Entry subclass and what danger (cycles) appears?', 'Cache directory sizes: which class needs a parent reference, and what does that do to the diagram?']
    }
  });

  /* =========================== QUIZ =========================== */
  quiz.push(
    { q: 'A <code>House</code> creates its <code>Room</code>s in its constructor and never shares them. Demolishing the house removes the rooms. Which relationship is this?', options: ['Association', 'Aggregation', 'Composition', 'Dependency'], answer: 2, explain: 'Exclusive ownership plus a shared lifecycle (the whole creates and destroys the part) is composition, drawn with a filled diamond at House.' },
    { q: 'In UML, where does the hollow triangle of an inheritance arrow go?', options: ['At the child class', 'At the parent class', 'In the middle of the line', 'Either end; it does not matter'], answer: 1, explain: 'The arrow reads "child is a parent": the line starts at the child and the triangle sits at the parent (or interface, for a dashed realisation line).' },
    { q: '<code>class ReportPrinter { String print(Report r, Formatter f) { return f.format(r); } }</code>. What is the relationship between ReportPrinter and Formatter?', options: ['Composition', 'Aggregation', 'Association', 'Dependency'], answer: 3, explain: 'Formatter is only used as a parameter inside one call and is not stored in a field. That is a dependency (dashed arrow).' },
    { q: 'What does the multiplicity <code>1..*</code> on the OrderLine end of <code>Order —— OrderLine</code> mean?', options: ['An order line has at least one order', 'An order has at least one order line', 'An order has at most one line', 'Exactly one line per order'], answer: 1, explain: 'The number at the OrderLine end answers "how many OrderLines does one Order have?": one or more. An empty order is invalid.' },
    { q: 'Which UML visibility symbol means <code>protected</code>?', options: ['+', '-', '#', '~'], answer: 2, explain: '+ public, - private, # protected, ~ package-private. Static members are underlined; abstract ones are italic.' },
    { q: 'A requirement says "a member (also called a patron) borrows books". How should you treat "patron"?', options: ['A separate Patron class', 'A subclass of Member', 'A synonym: merge it into Member', 'An attribute of Book'], answer: 2, explain: 'Noun filtering: synonyms describe the same concept and must be merged, otherwise you get two classes that drift apart.' },
    { q: 'The library owns 3 copies of "Clean Code". Which model is best?', options: ['One Book object with copies = 3', 'Three Book objects each repeating title and ISBN', 'Book (title, ISBN) 1 → 0..* BookCopy (barcode, status)', 'BookCopy extends Book'], answer: 2, explain: 'Type vs instance (item-description pattern): shared description in Book, per-item identity and status in BookCopy. BookCopy extends Book would wrongly say a copy is a kind of title.' },
    { q: 'An employee can be promoted from Engineer to Manager at runtime. Best design?', options: ['Manager extends Employee', 'Employee has a Role field (composition) that can be swapped', 'A boolean isManager plus duplicated methods', 'Create a new Manager object and copy fields'], answer: 1, explain: 'Objects cannot change class at runtime. Composition with a Role keeps the same identity while behaviour changes: favour composition over inheritance for things that change.' },
    { q: 'In a sequence diagram, what does an <code>alt</code> fragment with two compartments map to in code?', options: ['A for loop', 'An if/else', 'A try/finally', 'A new thread'], answer: 1, explain: 'alt = alternatives (if/else or switch), opt = an if without else, loop = for/while, par = parallel execution.' },
    { q: 'Why is <code>Penguin extends Bird</code> wrong when <code>Bird</code> declares <code>fly()</code>?', options: ['Penguins are not animals', 'It violates the Liskov Substitution Principle: a Penguin cannot honour Bird\'s fly() contract', 'The compiler forbids it', 'It makes the class too small'], answer: 1, explain: 'Any code that loops over Birds and calls fly() breaks for penguins. Move flying to a Flyable interface implemented only by birds that fly.' },
    { q: 'Which is an <b>invariant</b> best enforced inside the owning class?', options: ['The UI font size', 'An account balance never goes below zero', 'The database host name', 'The log file path'], answer: 1, explain: 'Invariants are facts about an object\'s state that must always hold. Keeping the field private and checking inside withdraw() makes violation impossible.' },
    { q: 'Order lines reference Product but also store <code>unitPricePaise</code>. Why?', options: ['Duplicate data is always good', 'To freeze the price paid; later product price changes must not rewrite the order', 'Because Product cannot be referenced', 'To make Product immutable'], answer: 1, explain: 'An order is a historical record. Snapshotting the price at purchase time keeps totals correct after catalogue changes.' },
    { q: 'Two classes keep references to each other (Student ↔ Course). What is the main risk?', options: ['Slower compilation', 'The two sides can become inconsistent unless one method updates both', 'Object references cannot form cycles', 'Automatic memory cleanup stops working'], answer: 1, explain: 'Bidirectional associations double the update points. Use one entry point (student.enroll(course)) that updates both sides, or make the link one-way.' }
  );

  /* =========================== INTERVIEW =========================== */
  interview.push(
    { level: 'B', q: 'What is the difference between a class and an object? Give an everyday example.', a: `<p>A <b>class</b> is a blueprint written once in code: it declares what state (fields) and behaviour (methods) its instances will have. An <b>object</b> is one concrete instance created at runtime by calling a constructor (<code>new</code> in Java, TypeScript and C++; <code>Dog(...)</code> in Python), with its own state and identity. Cookie cutter vs cookies: one <code>Dog</code> class, many dog objects, each with its own name and age. Variables hold <b>references</b> to objects, so two variables can point to the same object, which is why changing it through one is visible through the other.</p>`, followUps: ['What is object identity and how does it differ from equality (==, equals, is, operator==)?', 'Where do objects live in memory and when are they destroyed or garbage collected?'] },
    { level: 'B', q: 'Explain association, aggregation and composition with examples. How do you decide between them?', a: `<p>All three are "has-a" links. <b>Association</b>: a long-lived reference between independent objects (Doctor ↔ Patient). <b>Aggregation</b>: a whole groups parts that can exist alone and be shared (Team ◇ Player). <b>Composition</b>: the whole creates, exclusively owns and destroys its parts (House ◆ Room, Order ◆ OrderLine). I decide with the life test: can the part exist without the whole? Can it belong to two wholes at once? Who creates it? If the part dies with the whole and is never shared, composition; otherwise aggregation or plain association. In code, composition means the part is created inside and never leaked; aggregation usually arrives through the constructor or an add method.</p>`, followUps: ['How does composition map to database foreign keys?', 'Is aggregation worth distinguishing from association in practice?'] },
    { level: 'B', q: 'What are the four pillars of OOP, in one sentence each?', a: `<p><b>Encapsulation</b>: keep state private and change it only through methods that protect the rules. <b>Abstraction</b>: expose what an object does and hide how (a <code>PaymentMethod.pay()</code> hides card vs UPI details). <b>Inheritance</b>: a subclass is a kind of its parent and reuses its contract and code. <b>Polymorphism</b>: one call site runs different implementations depending on the runtime object, removing type switches. In design interviews encapsulation and polymorphism carry most of the weight; inheritance is used sparingly.</p>`, followUps: ['Give an example where inheritance hurts.', 'Is a getter for every field still encapsulation?'] },
    { level: 'I', q: 'How do you identify classes from a requirements paragraph?', a: `<p>First I clarify scope with the interviewer. Then I do a noun-verb pass: nouns are candidate classes or attributes, verbs candidate methods. I filter nouns: things with their own state, behaviour and identity become classes; single values become attributes; fixed option sets become enums; values with rules but no identity become immutable value objects (records, frozen dataclasses, structs); synonyms are merged; vague words like "system" are dropped; a link with its own data (loan, booking, enrollment) becomes its own class. I give each verb to the class that has the data (Information Expert), and finally I trace one real use case through the classes to find gaps. I say my reasons out loud for every drop or merge.</p>`, followUps: ['How do you avoid creating a god class like LibrarySystem?', 'When does an actor (Driver, User) become a class?'] },
    { level: 'I', q: 'Abstract class vs interface: when do you use each?', a: `<p>An <b>interface</b> describes a capability or contract; a class can implement many, and in Java interfaces can carry <code>default</code>, <code>static</code> and <code>private</code> methods but no instance state (Python uses <code>abc.ABC</code> or <code>Protocol</code>, TypeScript interfaces hold no code, and C++ has no interface keyword, so an abstract class with only pure virtual functions plays that role). An <b>abstract class</b> is a partial implementation with shared state and constructors; a class can extend only one. I use interfaces at variation points (PaymentMethod, NotificationChannel, PricingPolicy) and for capabilities across unrelated classes (Flyable). I use an abstract class when subclasses truly share state and an algorithm skeleton (CardPayment with number/expiry validation). Often both: interface for clients, abstract base for shared implementation. For a closed set of variants, a closed type (Java <code>sealed</code> interface with records, a Python union of dataclasses, a TypeScript discriminated union, C++ <code>std::variant</code>) is a modern option.</p>`, followUps: ['What happens if two interfaces provide the same default method?', 'When would you choose a sealed interface?'] },
    { level: 'I', q: 'What does "favour composition over inheritance" mean? Give an example.', a: `<p>Inheritance couples the child to the parent's implementation and fixes the type at compile time. Composition gets reuse by holding another object and delegating to it, which keeps classes loosely coupled and lets behaviour change at runtime. Example: payroll with Salaried, Hourly and Commissioned employees who can also be managers. Inheritance explodes into SalariedManager, HourlyManager and so on, and a promotion requires a new object. With composition, Employee holds a <code>PayPolicy</code> and an optional <code>ManagerRole</code>: P + R classes instead of P × R, and <code>changePolicy()</code> keeps the same identity. I still use inheritance for genuine, stable "kind-of" hierarchies.</p>`, followUps: ['What is the fragile base class problem?', 'How does this relate to the Strategy pattern?'] },
    { level: 'I', q: 'Walk me through drawing a class diagram in an interview. How much detail do you include?', a: `<p>I draw boxes with names first, then relationship lines with diamonds/triangles and multiplicities, then key attributes (ids, statuses, money) and use-case methods, then interfaces where variation was mentioned and enums for fixed sets. I skip getters/setters and constructors. 6–10 classes is typical in 45 minutes, and I budget about 10 minutes for the diagram so most time goes to code. I verify it by tracing the main use case. I mention that in a real repo I would keep it as PlantUML/Mermaid text next to the code so it does not rot.</p>`, followUps: ['What notation mistakes do people commonly make?', 'Domain model vs design model: what is the difference?'] },
    { level: 'I', q: 'What is a sequence diagram for, and how does it map to code?', a: `<p>It shows the behaviour of one use case over time: lifelines are participating objects, solid arrows are synchronous method calls, dashed arrows are returns, open-headed arrows are async messages, and fragments (<code>alt</code>, <code>opt</code>, <code>loop</code>, <code>par</code>) are if/else, if, loops and parallel work. Each arrow into a lifeline must be a method on that class, so drawing it validates the class diagram: missing methods or arrows landing on classes without the needed data reveal design gaps. It also exposes god classes (one lifeline with arrows to everyone) and train wrecks (long chains of getters).</p>`, followUps: ['How do you show an asynchronous email send?', 'What would you draw for a payment failure after inventory was reserved?'] },
    { level: 'A', q: 'How do you keep a bidirectional association consistent? When would you avoid it?', a: `<p>I give the relationship a single entry point that updates both sides, for example <code>student.enroll(course)</code> adds the course to the student and calls a hidden <code>course.addInternal(student)</code> (package-private in Java, underscore-prefixed in Python, private or friend in C++); removal mirrors it. Collections are never exposed mutably. I avoid two-way links unless a real use case navigates both directions often, because they double the update points, couple both classes, and create cycles that break naive string conversion, equality, hashing and JSON serialisation. A reverse lookup can instead come from a repository query or an index maintained by a coordinator.</p>`, followUps: ['How do JPA mappedBy and owning sides relate to this?', 'What happens to equals/hashCode with cyclic references?'] },
    { level: 'A', q: 'What is the Liskov Substitution Principle? Show a violation and the fix.', a: `<p>LSP says objects of a subtype must be usable anywhere the parent type is expected without breaking correctness: no stronger preconditions, no weaker postconditions, invariants preserved. Violation: <code>Square extends Rectangle</code> where <code>setWidth</code> also changes height; code that sets width 5 and height 4 expects area 20 but gets 16. Another: <code>Penguin extends Bird</code> with <code>fly()</code> throwing. Fixes: model squares and rectangles as separate immutable shapes implementing a <code>Shape</code> interface, and move flying into a <code>Flyable</code> capability interface. The test is behavioural, not taxonomic: "is-a" in biology does not guarantee substitutability in code.</p>`, followUps: ['How do exception declarations (Java <code>throws</code>) and return types relate to LSP?', 'Can an immutable Square extend an immutable Rectangle safely?'] },
    { level: 'A', q: 'Entity vs value object: how do you model each in code?', a: `<p>An <b>entity</b> has identity that persists through state changes (Customer #42 changing address is still #42); I give it an id, mutable state guarded by methods, and equality and hashing based on id (or identity). A <b>value object</b> is defined only by its values and is immutable (Money, DateRange, Address); I use an immutable value type (a Java <code>record</code>, a frozen dataclass, a C++ struct with <code>==</code>), validate in its constructor, and share instances freely, including as map keys. Values make code safer (no aliasing bugs), thread-safe by default, and push small rules (like <code>DateRange.overlaps</code>) to tiny, testable types instead of services.</p>`, followUps: ['Why is double a bad type for money?', 'How do value objects reduce primitive obsession?'] },
    { level: 'E', q: 'An interviewer adds a late twist: "now support seasonal pricing and multiple hotels". How do you show your model is extensible?', a: `<p>I point to the seams I created on purpose. Pricing was announced as variable, so it sits behind a <code>PricingPolicy</code> interface; seasonal pricing is one new class injected into Hotel, with no edits to booking logic (Open/Closed). Multiple hotels means a new <code>HotelChain ◆ 1..* Hotel</code> composition above the existing model; Hotel's internals do not change. I also say what I would <i>not</i> do: no speculative factories or plugin frameworks for changes nobody mentioned (YAGNI). Then I sketch the diff: which classes are added, which are untouched, and which tests prove the old behaviour still works.</p>`, followUps: ['How do you decide which variation points to create upfront?', 'What if the twist breaks a core assumption (bookings by the hour)?'] },
    { level: 'E', q: 'You are given an AI-generated design for a library system. What do you check first?', a: `<p>I read it back into a class diagram and compare it with the requirement. First checks: is there a god class or anemic model (data classes + one giant service)? Are Book and BookCopy separated? Are statuses enums and money not a floating-point number? Do getters leak mutable collections (breaking composition)? Are rules owned by the information expert (loan limit in Member, fine in Loan)? Are relationships one-way unless needed? Are invariants validated in constructors? Is the check-then-act in checkout atomic? Did it add features we scoped out? Then I write a few tests for the riskiest rules. The AI saves typing; ownership and lifecycle decisions are still mine to verify.</p>`, followUps: ['What prompt would you write to get a better first draft?', 'How would you catch architectural drift over time (ArchUnit, diagrams-as-code)?'] }
  );

  registerModule({
    id: 'lld01',
    title: 'OOP Modelling & UML',
    intro: `<p>Every Low-Level Design interview starts the same way: a paragraph of English and the words "design the classes". This module teaches the skill underneath every LLD question: <b>thinking in objects</b>. You will learn to read a requirement like a detective (noun-verb analysis), decide which nouns become classes, attributes, enums or value objects, and choose the right link between them: <b>association, aggregation, composition, dependency, inheritance, realisation</b>, each with a lifecycle test you can say out loud.</p>
<p>Then you will speak the industry's shared drawing language: <b>UML class diagrams</b> (boxes, visibility, the six arrows, multiplicities) and <b>sequence diagrams</b> (lifelines, sync/async messages, alt/loop fragments). Every visualizer builds diagrams step by step, and several are editable: type your own requirement or relationship list and watch the diagram and the code skeleton appear.</p>
<p>Finally you will put it all together in the <b>requirement → diagram → sequence → compilable code</b> workflow (in Java, Python, TypeScript or C++) used in machine-coding rounds, practising on libraries, shops, universities, cab booking, restaurants, movie tickets and file systems. Every solution starts with the naive god-class design and explains exactly why it fails.</p>`,
    goals: [
      'Turn a requirements paragraph into a filtered list of classes, attributes, enums and value objects, with a spoken reason for every decision',
      'Choose between association, aggregation, composition and dependency using the lifecycle test, and write the matching code shape in your language',
      'Decide when inheritance is honest (is-a, LSP) and when to use interfaces or composition instead',
      'Read and draw UML class diagrams with correct visibility, arrows and multiplicities, and translate them to and from code',
      'Draw a sequence diagram for a use case (including alt/loop and async messages) and implement it as cooperating classes',
      'Produce a compilable, extensible code skeleton in an interview time budget and explain where future changes will land'
    ],
    prereqs: `Java track: Classes, Objects &amp; Constructors; OOP Pillars in Java; equals &amp; hashCode; Collections Framework (Java modules 3–7). Comfort with records and enums helps. No design-pattern knowledge needed: this is the first LLD module.`,
    hours: 14,
    langNotes: {
      java: `<p><b>Interfaces vs abstract classes.</b> An <code>interface</code> is a contract (plus optional <code>default</code> methods, no instance state); a class implements many, but extends only one class. Put shared state and constructor rules in an <code>abstract class</code>, and use <code>sealed</code> interfaces with <code>record</code>s for a closed set of variants. <b>Equality and hashing.</b> <code>==</code> is identity; override <code>equals</code> and <code>hashCode</code> together or use a <code>record</code>, otherwise <code>HashSet</code> and <code>HashMap</code> lose objects. <b>Immutability.</b> <code>final</code> fields, <code>record</code>s, <code>List.copyOf</code> and <code>Collections.unmodifiableList</code> (a view, not a copy). <b>Composition idioms.</b> Create the part inside the whole (<code>private final</code>), take aggregated parts through the constructor, and use a lambda for a one-method interface such as a fake <code>PaymentMethod</code>. <b>Lifetimes.</b> The garbage collector frees objects, so "the whole destroys the part" is a rule you keep by never leaking the reference. Money: use <code>long</code> paise, because <code>int</code> overflow wraps silently and <code>double</code> rounds.</p>`,
      python: `<p><b>Interfaces vs abstract classes.</b> Use <code>abc.ABC</code> with <code>@abstractmethod</code> for a nominal base class (it cannot be instantiated until every abstract method is implemented), and <code>typing.Protocol</code> for a structural interface where any class with the right methods fits, such as a fake payment method. A mixin class gives a default method (<code>Swimmer.swim</code>), and multiple inheritance follows the MRO. <b>Equality and hashing.</b> <code>==</code> calls <code>__eq__</code>; <code>is</code> is identity. Defining <code>__eq__</code> removes the default <code>__hash__</code>, so use <code>@dataclass(frozen=True)</code> (generates both) for value objects, and never hash a mutable object. <b>Immutability.</b> Frozen dataclasses, tuples and <code>frozenset</code>; a leading underscore only <em>asks</em> callers to keep out. <b>Composition idioms.</b> Plain attributes holding other objects, constructor injection, and a <code>Callable</code> where Java would use a one-method interface. <b>Lifetimes.</b> Reference counting plus a cycle collector: cyclic links (Student and Course) are collected, but a two-way link still needs one method that updates both sides. Integers never overflow, so paise arithmetic is exact; use <code>//</code> for integer division.</p>`,
      js: `<p><b>TypeScript.</b> <b>Interfaces vs abstract classes.</b> An <code>interface</code> exists only at compile time and carries no code, so share behaviour with an <code>abstract class</code> or a plain function (<code>defaultSwim()</code>), and check capabilities with type guards (<code>a is Swimmer</code>). A discriminated union (<code>kind: "card" | "upi"</code>) models a closed set of variants and the compiler checks the <code>switch</code> is exhaustive. Types are structural, so any object with the right shape fits, including an object literal as a fake. <b>Equality and hashing.</b> <code>===</code> compares object identity; <code>Set</code> and <code>Map</code> also use identity, so write an <code>equals</code> method for value objects and key maps by a string such as <code>"A1"</code>. <b>Immutability.</b> <code>readonly</code> and <code>ReadonlyArray</code> are compile-time only; copy with <code>[...items]</code> or <code>Object.freeze</code> when you must enforce it at run time. Use <code>private</code> (or <code>#field</code> for real privacy). <b>Composition idioms.</b> Constructor parameter properties (<code>constructor(private readonly bank: Bank)</code>) and function-typed fields. <b>Numbers.</b> <code>number</code> is a double, exact for integers up to 2<sup>53</sup>, which is fine for paise; divide with <code>Math.floor(a / b)</code>. JavaScript is single-threaded, so check-then-act is atomic unless it awaits.</p>`,
      cpp: `<p><b>Interfaces vs abstract classes.</b> There is no <code>interface</code> keyword: a class with only pure virtual functions (<code>= 0</code>) is the interface, and an abstract base adds data and shared code. Always give a polymorphic base a <b>virtual destructor</b> (<code>virtual ~Shape() = default;</code>), mark overrides with <code>override</code>, and use <code>std::variant</code> with <code>std::visit</code> for a closed set of variants. <b>Equality and hashing.</b> <code>bool operator==(const T&amp;) const = default;</code> compares all members; a type used as an <code>unordered_map</code> key also needs a <code>std::hash</code> specialisation, while <code>std::map</code> and <code>std::set</code> need <code>operator&lt;</code>. Comparing pointers compares addresses (identity). <b>Immutability.</b> <code>const</code> members and <code>const</code> methods; return <code>const T&amp;</code> instead of copying a collection. <b>Ownership and lifetimes.</b> This is the C++ part of the design: composition is a by-value member or a <code>std::unique_ptr</code> that dies with its owner (RAII), aggregation and association are non-owning pointers or references that must not outlive the owner, and <code>std::shared_ptr</code> is for parts that really have several owners (many copies sharing one <code>Book</code>). Never return a reference to a local, and do not keep a pointer into a <code>std::vector</code> that may grow (use <code>std::deque</code>, <code>std::map</code> or <code>unique_ptr</code> elements). <b>Composition idioms.</b> Strategy objects held in a <code>unique_ptr&lt;Policy&gt;</code>, or a <code>std::function</code> for a one-method interface. Signed integer overflow is undefined behaviour, so use <code>long long</code> for money.</p>`
    },
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
