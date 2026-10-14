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
      if (s.code) parts.push({ type: 'code', label: s.codeLabel || 'Java skeleton so far', lang: 'java', code: s.code, hl: s.codeHl || {} });
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
    if (opt.code) intro.push({ type: 'code', label: opt.codeLabel || 'The Java this diagram describes', lang: 'java', code: opt.code, hl: {} });
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
      if (opt.code) { var ch = {}; if (msg.line) ch[msg.line] = msg.ret ? 'ok' : 'cur'; parts.push({ type: 'code', label: opt.codeLabel || 'The Java this diagram describes', lang: 'java', code: opt.code, hl: ch }); }
      frames.push({ narr: msg.narr || ('<b>' + hesc(msg.f) + '</b> ' + (msg.ret ? 'returns <b>' + hesc(msg.m) + '</b> to ' : 'calls <b>' + hesc(msg.m) + '</b> on ') + '<b>' + hesc(msg.t) + '</b>.'), parts: parts });
    });
    var fin = {};
    edges.forEach(function (e) { fin[e[0] + '-' + e[1]] = 'ok'; });
    var last = [{ type: 'graph', label: title, directed: true, height: height, nodes: cp(nodes), edges: cp(edges), ehl: fin }, { type: 'table', label: 'Full message log', columns: ['#', 'from', 'to', 'message'], rows: cp(log) }];
    if (opt.code) last.push({ type: 'code', label: opt.codeLabel || 'The Java this diagram describes', lang: 'java', code: opt.code, hl: {} });
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
          hesc(x.r.test.replace(/CHILD-owner/g, x.a).replace(/CHILD/g, x.a).replace(/PARENT/g, x.b)) + ' Java shape: <code>' + hesc(x.r.java.replace(/PART|PARENT/g, x.b).replace(/CHILD/g, x.a)) + '</code>',
        nodes: nodes, edges: [[x.a, x.b, lab]], hl: hl, tags: tg, noTable: true,
        extra: [{ type: 'table', label: 'Relationships so far', columns: ['From', 'Kind', 'To', 'Mult.', 'Java shape'], rows: cp(summary), hl: (function () { var h = {}; h[i] = 'cur'; return h; })() }]
      });
    });
    // generate a Java skeleton
    var cls = {};
    names.forEach(function (n) { cls[n] = { ext: null, impl: [], body: [] }; });
    rels.forEach(function (x) {
      var A = cls[x.a], many = ['', '1', '0..1'].indexOf(x.mult) < 0, fld = x.b.charAt(0).toLowerCase() + x.b.slice(1);
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
    steps.push({ narr: 'Finished diagram. Every arrow became a <b>field</b>, a <b>constructor/parameter</b>, an <b>extends</b> or an <b>implements</b> in the Java skeleton below. Edit the input and press run to model your own system.', ehl: fin, noTable: true, code: code, codeLabel: 'Generated Java skeleton',
      extra: [{ type: 'table', label: 'All relationships', columns: ['From', 'Kind', 'To', 'Mult.', 'Java shape'], rows: cp(summary) }] });
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
    names.forEach(function (n) { model[n] = { attrs: [], ops: [], ext: null }; });
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
      if (f.kind === 'has') { model[f.s].attrs.push('List<' + f.o + '> ' + plural(low)); lab = 'has-a 0..*'; narr = '"' + hesc(f.s + ' ' + f.v + ' ' + f.o) + '" is a <b>has-a</b> phrase, so ' + hesc(f.s) + ' gets a <b>field</b> holding ' + hesc(f.o) + ' objects, not a method.'; }
      else if (f.kind === 'is') { model[f.s].ext = f.o; lab = 'is-a'; narr = '"' + hesc(f.s + ' ' + f.v + ' ' + f.o) + '" is an <b>is-a</b> phrase, so ' + hesc(f.s) + ' <b>extends</b> ' + hesc(f.o) + ' (check it is true in every case first!).'; }
      else { var mth = base(f.v) + f.o + '(' + f.o + ' ' + low + ')'; model[f.s].ops.push(mth); lab = base(f.v); narr = 'The verb <b>' + hesc(f.v) + '</b> becomes a <b>method</b> on the actor who does it: <code>' + hesc(f.s) + '.' + hesc(mth) + '</code>. The arrow shows ' + hesc(f.s) + ' <b>uses</b> ' + hesc(f.o) + '.'; }
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
    steps.push({ narr: 'Last step: turn the diagram into a Java skeleton. Nouns became classes, has-a became fields, is-a became extends, verbs became methods. Now <b>prune</b>: delete nouns that are just values (name, date) and merge synonyms.', code: code, codeLabel: 'Generated Java skeleton' });
    return uml('Class diagram built from the requirement', 72, steps);
  }

  /* =========================== TOPIC 1 =========================== */
  topics.push({
    title: 'Thinking in Objects: Classes, Objects, State & Behaviour',
    analogy: `<p>Think of a <b>cookie cutter</b> and the <b>cookies</b> it makes. The cutter is the <b>class</b>: it decides the shape. Each cookie is an <b>object</b>: it has its own sprinkles (its own <i>state</i>), and you can eat one without touching the others. You only make one cutter, but you can make a thousand cookies.</p>
<p>A second picture: a small <b>office</b>. Each employee has a desk drawer (private data) and a job description (what you may ask them to do). You never open a colleague's drawer and change their files yourself. You <i>ask</i> them: "please file this invoice". That polite rule is the heart of object-oriented design.</p>`,
    explain: `<p><b>Object-oriented design (OOD)</b> means: break a big problem into small "workers" (objects), each of which <b>knows</b> some things and <b>does</b> some things. Low-Level Design (LLD) interviews test exactly this: can you turn a messy paragraph of requirements into clean, cooperating classes?</p>
<p>Every object has three things:</p>
${H.table(['Part', 'Plain meaning', 'Java form', 'Dog example'], [
  ['<b>State</b>', 'what it knows right now', 'fields', '<code>name = "Rex"</code>, <code>age = 3</code>'],
  ['<b>Behaviour</b>', 'what you can ask it to do', 'methods', '<code>bark()</code>, <code>birthday()</code>'],
  ['<b>Identity</b>', 'which one it is, even if two look identical', 'its reference (memory address)', 'two dogs both called Rex are still two dogs']
])}
<p>A <b>class</b> is the blueprint (written once). An <b>object</b> (also called an <i>instance</i>) is one thing built from it at runtime with <code>new</code>. A <b>reference</b> is the "remote control" a variable holds to reach the object; two variables can hold remotes to the <i>same</i> object.</p>
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
      '"Value that never changes, like Money or Coordinates" → an immutable value object (a Java <code>record</code>).'
    ],
    code: [`
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
}`, `
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
}`],
    codeTitle: ['Class, objects, references (Dog)', 'Encapsulation protects an invariant (BankAccount)'],
    viz: [{
      title: 'Objects and references on the heap, line by line',
      gen: function () {
        var code = 'Dog rex = new Dog("Rex", 3);\nDog bo = new Dog("Bo", 5);\nDog alias = rex;\nalias.birthday();\nSystem.out.println(rex.getAge());\nbo = null;';
        var vars = [bx('rex', 'rex', 12, 10), bx('bo', 'bo', 12, 30), bx('alias', 'alias', 12, 50)];
        var o1 = function (age) { return bx('O1', 'Dog#1 Rex, age ' + age, 70, 18, 30); };
        var o2 = bx('O2', 'Dog#2 Bo, age 5', 70, 42, 30);
        function f(narr, nodes, edges, hl, ehl, line, vals, tags) {
          var ch = {}; if (line) ch[line] = 'cur';
          return { narr: narr, parts: [
            { type: 'graph', label: 'Stack variables (left) hold references to objects on the heap (right)', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || {} },
            { type: 'code', label: 'Running code', lang: 'java', code: code, hl: ch },
            { type: 'vars', label: 'What each variable holds', vals: vals }
          ] };
        }
        return [
          { narr: 'Before running anything there is only the <b>class</b> Dog: a blueprint with fields <code>name, age</code> and methods <code>birthday(), bark()</code>. No dogs exist yet.', parts: [
            { type: 'table', label: 'Class Dog (the blueprint)', columns: ['Class', 'Attributes', 'Operations'], rows: [['Dog', '- name: String, - age: int', '+ birthday(), + bark(): String, + getAge(): int']], hl: { 0: 'sel' } },
            { type: 'code', label: 'Running code', lang: 'java', code: code, hl: {} }
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
        var bal = 0, frames = [], hist = [];
        frames.push({ narr: 'A new account starts at balance 0. The field <code>balance</code> is <b>private</b>: the only doors are <code>deposit</code> and <code>withdraw</code>, and both check the rules.', parts: [
          { type: 'vars', label: 'BankAccount object state', vals: { balance: 0 } },
          { type: 'code', label: 'The only doors into the object', lang: 'java', code: code, hl: {} }
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
            { type: 'code', label: 'The only doors into the object', lang: 'java', code: code, hl: hl },
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
      { title: 'A light switch: the smallest useful object', html: `<p>State: <code>on</code> (true/false). Behaviour: <code>toggle()</code>, <code>isOn()</code>. Identity: the kitchen switch and the bedroom switch are different objects even when both are off. Notice there is <b>no</b> <code>setOn(boolean)</code>: the real-world action is "toggle", so the method mirrors the real behaviour, not the field.</p>`, code: `
class LightSwitch {
    private boolean on;                  // state, starts false
    void toggle() { on = !on; }          // behaviour mirrors the real action
    boolean isOn() { return on; }
    public static void main(String[] args) {
        LightSwitch kitchen = new LightSwitch(), bedroom = new LightSwitch();
        kitchen.toggle();
        System.out.println(kitchen.isOn() + " " + bedroom.isOn()); // true false: separate objects
    }
}` },
      { title: 'Identity vs equality: == vs equals()', html: `<p>Two <code>Point(2, 3)</code> objects are <b>equal</b> (same values) but not <b>identical</b> (different objects). <code>==</code> compares remotes (identity); <code>equals()</code> compares contents. A Java <code>record</code> writes a correct <code>equals</code> and <code>hashCode</code> for you, which makes it perfect for <b>value objects</b> such as Money, Point, Address.</p>
${H.table(['Expression', 'Result', 'Why'], [['<code>p1 == p2</code>', H.c('r', 'false'), 'two different objects'], ['<code>p1.equals(p2)</code>', H.c('g', 'true'), 'record compares fields'], ['<code>p1 == p1</code>', H.c('g', 'true'), 'same object']])}`, code: `
record Point(int x, int y) { }
class IdentityDemo {
    public static void main(String[] args) {
        Point p1 = new Point(2, 3), p2 = new Point(2, 3);
        System.out.println(p1 == p2);        // false: different identity
        System.out.println(p1.equals(p2));   // true: equal values
    }
}` },
      { title: 'Anemic object vs rich object (Order)', html: `<p><b>Anemic</b>: <code>Order</code> has only getters/setters; a service does <code>order.getItems().add(item); order.setTotal(order.getTotal() + item.price())</code>. Any caller can forget the total update or add items to a <i>shipped</i> order. <b>Rich</b>: <code>order.addItem(item)</code> checks the status and updates the total itself. Same data, but the rules now live with the data.</p>`, code: `
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
}` }
    ],
    deepDive: `<p><b>Invariants are the real reason for encapsulation.</b> An invariant is a fact that must always be true about an object (<code>0 ≤ balance</code>, <code>total == sum(items)</code>, <code>status</code> follows legal transitions). If every path that changes state goes through a method that checks the invariant, the object can never be observed in a broken state. That is also why constructors should validate and why returning a mutable internal list (<code>return items;</code>) is a leak: the caller can bypass every rule. Return <code>Collections.unmodifiableList(items)</code> or <code>List.copyOf(items)</code>.</p>
<p><b>Entities vs value objects.</b> An <i>entity</i> has an identity that survives change (a Customer with id 42 is still customer 42 after changing her address). A <i>value object</i> is defined only by its values and is usually immutable (Money(500, INR)). Model values as <code>record</code>s: immutable, thread-safe, free equals/hashCode. Entities usually implement <code>equals</code> by id, or not at all.</p>
<p><b>equals/hashCode contract.</b> If <code>a.equals(b)</code> then <code>a.hashCode() == b.hashCode()</code>. Break it and HashSet/HashMap silently lose objects. Never use mutable fields in hashCode for objects stored in hash collections.</p>
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
      statement: `<p>Design a <code>BankAccount</code> class. Requirements: an account has a fixed account number and an owner name; customers can <b>deposit</b> and <b>withdraw</b>; the balance can <b>never go negative</b>; every successful deposit or withdrawal is recorded in a <b>transaction history</b> that callers can read but never modify. Identify the state, the behaviour, the invariants, and write the Java class.</p>`,
      constraints: `<ul><li>Amounts are whole paise (long), must be &gt; 0.</li><li>Account number cannot change after creation.</li><li>History must be read-only from outside.</li></ul>`,
      example: `<p>open("ACC-1", "Asha") → deposit(500) → withdraw(200) → withdraw(400)</p>
${H.table(['call', 'result', 'balance', 'history size'], [['deposit(500)', H.c('g', 'ok'), '500', '1'], ['withdraw(200)', H.c('g', 'ok'), '300', '2'], ['withdraw(400)', H.c('r', 'rejected'), '300', '2']])}
<p>The last withdrawal is rejected because 400 &gt; 300 would break the invariant <code>balance ≥ 0</code>. It is <b>not</b> recorded in history.</p>`,
      brute: {
        why: `<p>The naive design makes every field <b>public</b> and lets a "BankUtils" god class change them. Every caller must remember the balance check and the history update. One forgotten check in one of fifty callers produces a negative balance, and because <code>history</code> is a public mutable list, anyone can delete records. Nothing is enforced; everything relies on discipline.</p>`,
        code: `
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
}`
      },
      mcq: { q: 'Where should the rule "balance can never go negative" live?', options: ['In every controller that calls withdraw', 'Inside BankAccount.withdraw(), with balance private', 'In a database trigger only', 'In a static utility class'], answer: 1, explain: 'The object that owns the data owns its rules. Making balance private and checking inside withdraw() means no caller can bypass it.' },
      hints: [
        `<p>Hint 1: list the <b>nouns</b> (account, number, owner, balance, transaction) and decide which are <i>state</i> of BankAccount and which deserve their own small type (a Transaction value).</p>`,
        `<p>Hint 2: make every field <code>private</code>; make <code>accountNumber</code> <code>final</code>; store money as <code>long</code> paise; model a transaction as an immutable <code>record</code>.</p>`,
        `<p>Hint 3: <code>withdraw</code> returns false (or throws) when amount ≤ 0 or amount &gt; balance; only on success update balance <i>and</i> append history. Expose history with <code>List.copyOf</code> or <code>Collections.unmodifiableList</code>.</p>`
      ],
      solution: {
        approach: `<p><b>State:</b> accountNumber (final), owner, balancePaise, history. <b>Behaviour:</b> deposit, withdraw, balance, history. <b>Invariant:</b> balance ≥ 0 and history contains exactly the successful operations. Put both rules inside the class, make all fields private, validate in the constructor, and return an unmodifiable view of the history. A tiny <code>Transaction</code> record (type, amount, balanceAfter) is a value object: immutable and comparable by value. An <code>enum TxType</code> keeps the fixed set of types type-safe instead of magic strings.</p>`,
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
        complexity: `<p>deposit/withdraw are O(1) (amortised list append). History uses O(T) memory for T transactions. The real "complexity" win is design-level: the invariant is enforced in exactly one place.</p>`,
        followUps: ['Make it thread-safe for two ATMs withdrawing at once (synchronized or AtomicLong with CAS).', 'Add a SavingsAccount with a minimum balance: inheritance or a policy object?', 'Add transfer(from, to, amount) without breaking either account\'s invariant.']
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
  ['is a value with rules but no identity', H.c('b', '<b>a value object (record)</b>'), 'Money, Address, DateRange'],
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
    code: `
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
        frames.push({ narr: 'Result: <b>6 classes + 1 enum</b> from 11 nouns. Two were merged or dropped, three became attributes. This filtering is what interviewers want to hear you say out loud.', parts: [
          { type: 'set', label: 'Final model', items: ['Library', 'Book', 'BookCopy', 'Member', 'Loan', 'Fine', 'enum CopyStatus'], hl: { 'enum CopyStatus': 'sel' } },
          { type: 'table', label: 'Verbs → owners', columns: ['verb in requirement', 'method', 'owner (who has the data)'], rows: [['borrow', 'checkout(member, copy)', 'Library (coordinates)'], ['up to 3', 'canBorrow()', 'Member'], ['records loan / due date', 'new Loan(...)', 'Loan constructor'], ['charges fine', 'fineFor(today)', 'Loan (knows due date)'], ['available/loaned/lost', 'markLoaned(), markLost()', 'BookCopy']] }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Coffee shop: "A customer orders drinks in sizes S, M, L with optional extra shots"', html: `<p>Nouns: customer, drink, size, shot, order. Verdicts: <code>Order</code> (class, has items and status), <code>OrderItem</code> (class: drink + size + shots, has its own price), <code>Drink</code> (class: menu entry with base price), <code>Size</code> (enum S/M/L with a price multiplier), <code>shot</code> (an int attribute <code>extraShots</code> on OrderItem, not a class). Verb "orders" → <code>Order.addItem(drink, size, shots)</code>; "price" → <code>OrderItem.price()</code> computed from drink, size, shots (derived, never stored).</p>`, code: `
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
}` },
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
      statement: `<p>Requirement: <i>"A library has books. Each book has a title, authors and an ISBN, and the library may own several copies. Members can borrow up to 3 copies at a time for 14 days and can renew a loan once if nobody has reserved the book. Late returns cost ₹10 per day. Copies can be available, loaned or lost."</i></p><p>Identify the classes, their key attributes and behaviours, the enums, and write a compilable Java skeleton supporting <b>checkout</b>, <b>renew</b> and <b>return with fine</b>.</p>`,
      constraints: `<ul><li>Max 3 active loans per member; 14-day loan period; 1 renewal max.</li><li>Fine = ₹10 × days late (0 if on time).</li><li>No UI, no database: in-memory domain model.</li></ul>`,
      example: `<p>Asha borrows copy C1 on day 0 (due day 14), renews on day 10 (due day 28), returns on day 31 → fine = 3 × ₹10 = ${H.c('r', '₹30')}. A second renew attempt is ${H.c('r', 'rejected')} (only one renewal). A 4th checkout while holding 3 loans is ${H.c('r', 'rejected')}.</p>
${H.table(['day', 'action', 'due', 'result'], [['0', 'checkout C1', '14', H.c('g', 'ok')], ['10', 'renew', '28', H.c('g', 'ok')], ['12', 'renew', '28', H.c('r', 'no: already renewed')], ['31', 'return', '-', H.c('r', 'fine ₹30')]])}`,
      brute: {
        why: `<p>The naive "god class" puts everything in one <code>LibrarySystem</code> with parallel maps of strings: <code>Map&lt;String,String&gt; copyStatus</code>, <code>Map&lt;String,Integer&gt; memberLoanCount</code>, <code>Map&lt;String,Integer&gt; dueDay</code>. It works for the happy path, but every rule is an if-statement in one 800-line class; statuses are strings ("loand" typo compiles); renew count, due date and member are in three different maps that can drift apart; and adding reservations means editing every method. It cannot be unit tested piece by piece and nobody can own a part of it.</p>`,
        code: `
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
}`
      },
      mcq: { q: 'The requirement says "the library may own several copies of a book". What is the best model?', options: ['One Book class with a copies counter', 'Book (title, ISBN) and BookCopy (barcode, status), Book 1 → 0..* BookCopy', 'A subclass per copy: BookCopy1, BookCopy2', 'Only BookCopy, with the title repeated in each'], answer: 1, explain: 'Type vs instance. The title data is shared (Book) while each physical copy has its own identity and status (BookCopy). A counter cannot track which copy is lost or who holds it.' },
      hints: [
        `<p>Hint 1: highlight nouns: library, book, title, author, ISBN, copy, member, loan, day, fine, status. Which are single values (attributes)? Which have their own state (classes)? Which is a fixed set (enum)?</p>`,
        `<p>Hint 2: Loan is the "middle" class: it links Member and BookCopy and owns dueDate and renewCount. The fine is derived from the loan's due date and the return date, so <code>Loan</code> computes it.</p>`,
        `<p>Hint 3: Recipe: <code>Library.checkout</code> checks <code>member.canBorrow()</code> and <code>copy.isAvailable()</code>, creates Loan, updates both. <code>loan.renew()</code> checks renewCount &lt; 1 and that the book is not reserved. <code>Library.giveBack</code> closes the loan and returns <code>loan.fineFor(returnDate)</code>.</p>`
      ],
      solution: {
        approach: `<p><b>Classes:</b> <code>Library</code> (coordinator: catalogue, checkout, return), <code>Book</code> (ISBN, title, authors, reservation flag), <code>BookCopy</code> (barcode, Book, CopyStatus), <code>Member</code> (id, active loans, limit), <code>Loan</code> (member, copy, dueDate, renewCount, fine logic). <b>Enum:</b> <code>CopyStatus</code>. <b>Attributes, not classes:</b> title, ISBN, author names, dates. <b>Dropped:</b> "system". Each rule sits with the data it needs: loan limit in Member, availability in BookCopy, renewal and fine in Loan. Library only orchestrates the multi-object use cases. Dates use <code>LocalDate</code> so "days late" is <code>ChronoUnit.DAYS.between</code>.</p>`,
        code: `
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
        complexity: `<p>checkout/renew/return are O(1) with HashMap lookups by barcode. Memory O(B + C + L) for books, copies, loans. Design complexity: 5 small classes, each testable alone, versus one god class.</p>`,
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
${H.table(['Relationship', 'UML symbol', 'Life test', 'Java shape', 'Example'], [
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
${H.table(['Notation', 'Meaning', 'Java field'], [['1', 'exactly one', '<code>private final Engine engine;</code>'], ['0..1', 'zero or one (optional)', '<code>private Car car;</code> (nullable) or <code>Optional</code> getter'], ['0..* or *', 'any number', '<code>List&lt;Book&gt; books</code>'], ['1..*', 'at least one', 'list + constructor that requires one'], ['4', 'exactly four', 'array or list with size check']])}
<p><b>Navigability</b> (arrow direction) says who knows whom. <code>Order → Customer</code> means an Order can find its Customer, but Customer may not hold a list of orders. One-way links are simpler: fewer objects to keep in sync. Make a link two-way only when a real use case needs both directions.</p>`,
    clues: [
      '"X consists of / is made of / contains" (a Car is made of an Engine and Wheels) → composition.',
      '"X groups / has a list of Ys that can also exist on their own" (playlist of songs) → aggregation.',
      '"X is assigned to / works with / is linked to Y" (driver assigned to a cab) → association.',
      '"X uses Y to do something" (OrderService uses a PaymentGateway for one call) → dependency.',
      '"If the order is deleted, delete its line items" → composition (cascade delete).',
      '"Each / at most one / at least one / many" → write the multiplicity on the line (1, 0..1, 1..*, 0..*).'
    ],
    code: `
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
    codeTitle: 'The four relationships as Java code',
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
          { narr: 'Where did the parts come from? Rooms were <b>created inside</b> <code>new House(...)</code>. Players were <b>created elsewhere</b> and passed to <code>team.add(p)</code>. Who creates is the first hint.', parts: [G(nodes.slice(0, 6), edges, { R1: 'ok', R2: 'ok', P1: 'win', P2: 'win' }, {}, { R1: 'made by House', R2: 'made by House', P1: 'made outside', P2: 'made outside' }), { type: 'code', label: 'Creation', lang: 'java', code: 'House h = new House("Kitchen", "Bedroom"); // rooms born inside\nPlayer virat = new Player("Virat");           // born outside\nteam.add(virat);', hl: { 1: 'ok', 2: 'cur', 3: 'cur' } }] },
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
      { title: 'Order ◆ OrderLine, but OrderLine → Product is only association', html: `<p>An <b>OrderLine</b> (product, quantity, price at purchase) only makes sense inside its <b>Order</b>: delete the order, delete its lines. That is composition. But the <b>Product</b> in the line is just referenced: deleting an order must <b>never</b> delete the product from the catalogue. Same object (OrderLine) takes part in a strong link on one side and a weak link on the other. Notice the line copies the price: the product's price may change tomorrow, but the order must remember what the customer paid.</p>`, code: `
record Product(String sku, String name, long pricePaise) { }
class PurchaseOrder {
    // composition: lines are created inside and never exposed for modification
    private final List<Line> lines = new ArrayList<>();
    record Line(Product product, int qty, long unitPricePaise) { }   // association to Product
    void add(Product p, int qty) { lines.add(new Line(p, qty, p.pricePaise())); } // price frozen
    long totalPaise() { return lines.stream().mapToLong(l -> l.qty() * l.unitPricePaise()).sum(); }
    List<Line> lines() { return List.copyOf(lines); }
}` },
      { title: 'Two-way association must stay in sync (Student ↔ Course)', html: `<p>If both sides hold references, one method must update <b>both</b> sides, otherwise you get a student who thinks she is enrolled in a course whose roster does not list her. Put the logic in one place and keep the other side package-private.</p>`, code: `
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
}` }
    ],
    deepDive: `<p><b>UML vs Java reality.</b> Java has a garbage collector, so "the whole destroys the part" really means: <i>the whole is the only holder of the reference and is responsible for its lifecycle</i>. To truly honour composition: create the part inside (or take a fresh one and never let callers keep it), never return the raw mutable part or list, and make it <code>private final</code>. Leaking <code>getRooms()</code> as a mutable list silently turns composition into shared aggregation.</p>
<p><b>Aggregation is the fuzziest notation.</b> The UML spec itself says aggregation semantics vary by application. Many senior engineers only draw <b>association</b> and <b>composition</b> and explain the lifecycle in words. In an interview, saying "aggregation vs association is a modelling nuance; what matters is ownership and lifecycle" shows maturity. The databases echo it: composition ≈ <code>ON DELETE CASCADE</code>, association ≈ a foreign key you must not cascade.</p>
<p><b>Dependency injection is aggregation through the constructor.</b> <code>new OrderService(paymentGateway)</code>: the service holds a gateway it did not create and that lives on (singleton). This makes the dependency swappable in tests. If the service did <code>new StripeGateway()</code> inside, it would be composition and impossible to fake.</p>
<p><b>Association classes.</b> When the link itself has data (enrollment date, grade), promote it to a class: <code>Enrollment(student, course, grade)</code>. Many-to-many relationships almost always end up this way in real systems (and as join tables in SQL).</p>
<p><b>Qualified association.</b> "A library finds a copy by barcode" → <code>Map&lt;String, BookCopy&gt;</code>. UML draws the key (qualifier) as a small box on the line; in Java it is simply a map.</p>
<p><b>Bidirectional cost.</b> Two-way links double the update points, create cycles (careful with <code>toString</code>/<code>equals</code>/JSON serialisation recursing forever), and couple both classes. Default to one-way and add the reverse lookup through a repository query when needed.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code makes these relationships implicit. An AI will happily write <code>public List&lt;Room&gt; getRooms() { return rooms; }</code>, quietly destroying composition. You must be the one who reads code and recognises which relationship it <i>actually</i> implements.</p>
<p><b>Use AI as a partner:</b> ask <code>For each field in these classes, tell me if it is dependency, association, aggregation or composition, and whether any getter leaks ownership.</code> Or have it draw the PlantUML for your skeleton, then compare it with your intended diagram. Diffs reveal design drift.</p>
<p><b>Where AI goes wrong:</b> it confuses aggregation and composition (it often picks by gut, not the lifecycle test), makes every link bidirectional "for convenience", and creates JPA cascade settings that delete shared entities (cascade REMOVE on a many-to-many is a classic production bug).</p>
<p><b>What you must still own:</b> the lifecycle questions (who creates, who can share, what happens on delete) asked of the real business, plus the multiplicities. These come from talking to people, not from the code, so no model can infer them for you.</p>`,
    problems: [{
      title: 'Model a University: Choose the Right Relationship for Each Pair',
      level: 'Medium', tags: ['composition', 'aggregation', 'association', 'multiplicity'], companies: ['Google', 'Adobe', 'Oracle'],
      statement: `<p>A university has departments. Each department has professors; a professor belongs to exactly one department at a time but may move. Professors teach courses; a course can be co-taught. Students enroll in courses and get a grade per enrollment. If the university shuts down, its departments are gone, but professors and students are people who still exist. For each pair, choose association, aggregation or composition, give the multiplicity, and write the Java skeleton.</p>`,
      constraints: `<ul><li>A department belongs to exactly one university.</li><li>A professor is in 0..1 departments at a time.</li><li>Grade is stored per (student, course) pair.</li></ul>`,
      example: `${H.table(['Pair', 'Relationship', 'Multiplicity', 'Why'], [['University–Department', H.c('g', 'composition'), '1 → 1..*', 'department dies with the university'], ['Department–Professor', H.c('b', 'aggregation'), '0..1 → 0..*', 'professor outlives and can move'], ['Professor–Course', H.c('p', 'association'), '* ↔ *', 'co-teaching, independent lives'], ['Student–Course', H.c('p', 'association class Enrollment'), '* ↔ *', 'the link has its own data (grade)']])}`,
      brute: {
        why: `<p>The naive design stores everything as strings inside one <code>University</code> class: <code>Map&lt;String, List&lt;String&gt;&gt; deptToProfs</code>, <code>Map&lt;String, Map&lt;String, String&gt;&gt; grades</code>. There is no Professor object, so moving a professor means hunting through maps and hoping you removed her from the old department. Grades keyed by concatenated strings break when a name changes. Relationships exist only in the programmer's head, so nobody can tell which deletions should cascade.</p>`,
        code: `
class University {
    Map<String, List<String>> deptToProfs = new HashMap<>();
    Map<String, List<String>> courseToStudents = new HashMap<>();
    Map<String, String> grades = new HashMap<>();   // key "student|course" -> grade
    void moveProf(String prof, String from, String to) {
        deptToProfs.get(from).remove(prof);          // forget this line once and the prof is in two depts
        deptToProfs.computeIfAbsent(to, k -> new ArrayList<>()).add(prof);
    }
    void grade(String student, String course, String g) { grades.put(student + "|" + course, g); }
}`
      },
      mcq: { q: 'Students and courses are many-to-many, and each pair needs a grade. How should you model it?', options: ['Student has List&lt;Course&gt;, Course has List&lt;Student&gt;, grade in Student as Map&lt;String,String&gt;', 'An Enrollment class holding student, course and grade', 'Make Student extend Course', 'Composition: Course owns its Students'], answer: 1, explain: 'When the link itself carries data, promote the link to an association class (Enrollment). It also maps cleanly to a join table.' },
      hints: [
        `<p>Hint 1: apply the lifecycle test to each pair. "If the university shuts down, departments are gone" is literally the definition of composition.</p>`,
        `<p>Hint 2: "belongs to exactly one department at a time but may move" → aggregation from Department to Professor plus a back-reference <code>Professor.department</code> (0..1) kept in sync by one method.</p>`,
        `<p>Hint 3: the grade lives neither in Student nor Course: create <code>Enrollment(student, course, grade)</code>. University creates departments inside <code>openDepartment(name)</code> so they can never be shared.</p>`
      ],
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
    explain: `<p>"Is-a" links let you treat many kinds of things through one common type. Java gives you two tools:</p>
${H.table(['Tool', 'Java', 'UML', 'Use when'], [
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
<h4>Abstract class vs interface (Java 21)</h4>
${H.table(['', 'Abstract class', 'Interface'], [['State (fields)', 'yes', 'only constants'], ['Constructors', 'yes', 'no'], ['Multiple', 'extend only one', 'implement many'], ['Method bodies', 'yes', '<code>default</code>/<code>static</code>/<code>private</code> methods'], ['Best for', 'shared code + "kind of"', 'capability / contract / plug-in point']])}`,
    clues: [
      '"Different types of X (card, UPI, wallet) behave differently" → an interface or abstract class with one implementation per type.',
      '"Easy to add a new type later without changing existing code" → polymorphism (Open/Closed principle).',
      '"Every X is a Y" said truthfully in every case → inheritance is allowed; otherwise prefer composition.',
      '"An employee can become a manager" / "a user can switch plans" → behaviour changes at runtime → composition (a Role or Plan field), not subclasses.',
      '"Some animals can fly, some can swim" → capabilities → small interfaces (Flyable, Swimmable).',
      '"A fixed, known set of variants" (Java 17+) → a <code>sealed</code> interface with records and a pattern-matching switch.'
    ],
    code: [`
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
}`, `
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
}`],
    codeTitle: ['Abstract class, interface, polymorphism', 'Sealed hierarchy (modern Java alternative)'],
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
        var nodes = [bx('Shape', 'Shape (abstract)', 50, 8), bx('Circle', 'Circle', 17, 34), bx('Square', 'Square', 50, 34), bx('Rect', 'Rect', 83, 34)];
        var edges = [['Circle', 'Shape', 'is-a'], ['Square', 'Shape', 'is-a'], ['Rect', 'Shape', 'is-a']];
        var frames = [], total = 0, done = [];
        frames.push({ narr: 'The loop only knows the type <b>Shape</b>. It has <b>no if/else</b> on the kind of shape. Let us watch the JVM pick the right <code>area()</code> for each object.', parts: [
          { type: 'graph', label: 'Class hierarchy', directed: true, height: 44, nodes: cp(nodes), edges: edges, hl: { Shape: 'sel' }, tags: { Shape: '«abstract» area()' } },
          { type: 'code', label: 'Caller code (top) and the three overrides (bottom)', lang: 'java', code: code, hl: { 3: 'cur' } },
          { type: 'array', label: 'List&lt;Shape&gt; shapes', values: shapes.map(function (s) { return s.d; }) }
        ] });
        shapes.forEach(function (s, i) {
          total += s.area; done.push(s.area.toFixed(2));
          var hl = { Shape: 'done' }; hl[s.k] = 'cur';
          var ehl = {}; ehl[s.k + '-Shape'] = 'cur';
          var ch = { 3: 'cur' }; ch[s.line] = 'ok';
          var ah = {}; ah[i] = 'cur';
          frames.push({ narr: 'Element ' + i + ' is really a <b>' + s.k + '</b>. The call <code>s.area()</code> is the same text every time, but the JVM looks at the <b>actual object</b> (dynamic dispatch) and runs <code>' + s.k + '.area()</code> = <b>' + s.area.toFixed(2) + '</b>.', parts: [
            { type: 'graph', label: 'Class hierarchy', directed: true, height: 44, nodes: cp(nodes), edges: edges, hl: hl, ehl: ehl },
            { type: 'code', label: 'Caller code (top) and the three overrides (bottom)', lang: 'java', code: code, hl: ch },
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
      { title: 'The Penguin problem: fix a lying hierarchy with an interface', html: `<p>If <code>Bird</code> has <code>fly()</code> and <code>Penguin extends Bird</code>, then <code>Penguin.fly()</code> must throw or do nothing. Code that loops over birds and calls <code>fly()</code> now crashes. The hierarchy promised something false. Move the capability into an interface: only birds that can fly implement <code>Flyable</code>.</p>`, code: `
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
}` },
      { title: 'Roles that change: Employee has-a Role, not Manager extends Employee', html: `<p>Asha joins as an Engineer and gets promoted to Manager next year. With inheritance you would need to create a <i>new</i> <code>Manager</code> object and copy her data, losing identity (her id, history, references from other objects). With composition the same Employee object just swaps its <code>Role</code> field.</p>
${H.table(['Design', 'Promotion', 'Identity kept?'], [['Manager extends Employee', 'new object, copy fields', H.c('r', 'no')], ['Employee has Role', '<code>asha.setRole(new ManagerRole())</code>', H.c('g', 'yes')]])}`, code: `
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
}` },
      { title: 'Abstract class for shared steps: monthly interest', html: `<p>All accounts share the bookkeeping "compute interest, add it, log it", but each type computes the rate differently. An abstract class holds the shared steps and leaves one <code>abstract</code> method to the children. This is a sneak peek at the <b>Template Method</b> pattern.</p>
${H.table(['Class', 'rate rule', 'balance 10,000 → interest'], [['SavingsAccount', '4% per year', '33 (monthly)'], ['SalaryAccount', '3% per year', '25 (monthly)']])}`, code: `
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
}` }
    ],
    deepDive: `<p><b>How dispatch works.</b> Each class has a method table (vtable). A call <code>s.area()</code> compiles to <code>invokevirtual Shape.area</code>; at runtime the JVM looks up the slot in the <i>actual</i> object's table. The JIT often inlines it when only one or two receiver types are seen (monomorphic/bimorphic inline caches), so polymorphism is nearly free in hot loops. Interface calls use <code>invokeinterface</code>, similarly optimised.</p>
<p><b>Liskov Substitution Principle (LSP)</b>: a subclass must honour the parent's contract: accept at least what the parent accepts (preconditions no stronger), promise at least what it promises (postconditions no weaker), and keep its invariants. The classic Rectangle/Square case: if <code>Square extends Rectangle</code> and <code>setWidth</code> also changes height, code that sets width 5 and height 4 and expects area 20 gets 16. Mathematically a square is a rectangle; <i>behaviourally</i> a mutable square is not.</p>
<p><b>Fragile base class.</b> Changing a parent can break children you have never seen (e.g. a parent's <code>addAll</code> starts calling <code>add</code>, and a child that counts adds now double-counts, the famous <code>InstrumentedHashSet</code> example from Effective Java). Defences: make classes <code>final</code> unless designed for inheritance, document self-use, prefer composition + delegation.</p>
<p><b>Constructors must not call overridable methods</b>: the child's override runs before the child's fields are initialised and sees nulls/zeros.</p>
<p><b>equals and inheritance don't mix.</b> A <code>ColorPoint extends Point</code> cannot add a field to equals without breaking symmetry or transitivity. Prefer composition or make value classes final (records are final).</p>
<p><b>Sealed types (Java 17+)</b> give you a closed hierarchy: <code>sealed interface Shape permits Circle, Square</code>. With pattern-matching <code>switch</code> (Java 21) the compiler checks exhaustiveness, which is a modern alternative to the Visitor pattern when the set of types is fixed but operations keep growing. Use open interfaces when <i>types</i> grow (plugins), sealed when <i>operations</i> grow.</p>
<p><b>Default methods</b> let interfaces evolve without breaking implementers. If two interfaces supply the same default, the class must override and pick (<code>A.super.m()</code>).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants reach for inheritance eagerly: <code>AbstractBaseManager</code>, deep 4-level hierarchies, and <code>BaseEntity</code> classes with 20 fields. They also produce correct-looking but LSP-violating subclasses that throw <code>UnsupportedOperationException</code>. Spotting this is now a core reviewer skill.</p>
<p><b>Use AI as a partner:</b> <code>For each extends in this code, state the is-a sentence and one scenario where it could be false.</code> or <code>Rewrite this hierarchy using composition and an interface; list what we gain and lose.</code> Also ask for a sealed + pattern-matching version and compare it to the polymorphic one.</p>
<p><b>Where AI goes wrong:</b> mixes up UML arrows (draws the triangle at the child), uses inheritance for code reuse (<code>OrderService extends DatabaseHelper</code>), forgets <code>@Override</code>, and suggests <code>instanceof</code> chains where polymorphism belongs.</p>
<p><b>What you must still own:</b> the is-a sentence test against real business rules (can roles change? are there exceptions?), the choice between open polymorphism and a sealed set, and the judgement to keep hierarchies shallow (1–2 levels) in interview designs.</p>`,
    problems: [{
      title: 'Payment Methods: One Interface, Many Implementations',
      level: 'Medium', tags: ['interface', 'polymorphism', 'abstract class', 'open/closed'], companies: ['PhonePe', 'Razorpay', 'Amazon', 'Stripe'],
      statement: `<p>A checkout supports <b>credit card</b>, <b>debit card</b> and <b>UPI</b>. Cards share validation (16-digit number, expiry) and charge a fee: credit 2%, debit 0.5%. UPI validates a VPA like <code>name@bank</code> and is free. The checkout must compute the final amount and call <code>pay</code> without knowing which method was chosen. Tomorrow the business will add <b>wallets</b>. Design the hierarchy (interface vs abstract class), draw it, and write Java.</p>`,
      constraints: `<ul><li>Adding a new payment method must not modify Checkout.</li><li>Amounts in paise (long). Fee rounded down.</li><li>Invalid details → reject before charging.</li></ul>`,
      example: `<p>Amount ₹1,000 (100000 paise):</p>
${H.table(['method', 'fee', 'charged'], [['CreditCard', '2% = 2000', H.c('y', '102000')], ['DebitCard', '0.5% = 500', H.c('y', '100500')], ['Upi asha@okbank', '0', H.c('g', '100000')], ['Upi "asha"', '-', H.c('r', 'rejected: bad VPA')]])}
<p>The checkout code is identical in all four cases; only the object passed in differs.</p>`,
      brute: {
        why: `<p>The naive design has a single <code>Payment</code> class with a <code>String type</code> and a switch in every method (<code>fee</code>, <code>validate</code>, <code>pay</code>). Adding wallets means editing every switch (and forgetting one compiles fine and silently charges zero fee). Card-only fields (expiry) sit next to UPI-only fields (vpa) with nulls everywhere. It violates Open/Closed and makes each method a growing if-ladder.</p>`,
        code: `
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
}`
      },
      mcq: { q: 'Credit and debit cards share validation code and fields; UPI shares nothing but the "can pay" ability. What structure fits best?', options: ['One Payment class with a type field', 'interface PaymentMethod; abstract class CardPayment implements it; CreditCard/DebitCard extend CardPayment; Upi implements PaymentMethod directly', 'Upi extends CreditCard', 'Three unrelated classes and instanceof checks in Checkout'], answer: 1, explain: 'Interface for the capability every method shares (validate, fee, pay); abstract class only where real shared code and state exist (cards). Checkout depends on the interface only.' },
      hints: [
        `<p>Hint 1: what does Checkout need to know? Only "validate, compute fee, pay". That list is your <b>interface</b>.</p>`,
        `<p>Hint 2: cards share fields (number, expiry) and validation: an <b>abstract class</b> <code>CardPayment</code> implementing the interface, leaving <code>feePercentTimes10()</code> abstract. UPI implements the interface directly.</p>`,
        `<p>Hint 3: <code>Checkout.process(amount, PaymentMethod m)</code>: if <code>!m.isValid()</code> reject; total = amount + m.fee(amount); m.pay(total). Wallet later = one new class, zero edits.</p>`
      ],
      solution: {
        approach: `<p><b>Diagram:</b> «interface» <code>PaymentMethod</code> (isValid, fee, pay) ◁·· <code>CardPayment</code> (abstract: number, expiry, shared isValid) ◁— <code>CreditCard</code>, <code>DebitCard</code>; <code>Upi</code> ··▷ PaymentMethod. <code>Checkout</code> ··&gt; PaymentMethod (dependency: received as a parameter). Polymorphism removes every switch; a new <code>Wallet</code> implements the interface and Checkout never changes (Open/Closed). The abstract class exists only because cards truly share state and code; we did not force UPI into it.</p>`,
        code: `
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
    String process(long amountPaise, PaymentMethod method) {    // knows only the interface
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
${H.table(['Symbol', 'Java', 'Meaning'], [['<code>+</code>', 'public', 'anyone'], ['<code>-</code>', 'private', 'only this class'], ['<code>#</code>', 'protected', 'subclasses (and package)'], ['<code>~</code>', 'package-private (no keyword)', 'same package'], ['<u>underlined</u>', 'static', 'belongs to the class, not objects']])}
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
    code: [`
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
}`, { lang: 'text', title: 'Same diagram as PlantUML text (paste into any PlantUML renderer)', code: `@startuml
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
    codeTitle: ['Class box to Java', 'Text-based UML (PlantUML)'],
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
            code: 'class Customer { private final Cart cart = new Cart(); Order checkout(PaymentMethod pm) { /* cart items become order lines */ } }\nclass Cart { private final List<CartItem> items = new ArrayList<>(); }\nclass CartItem { private final Product product; private int quantity; }\nrecord Product(String sku, String name, long pricePaise) { }\nclass Order { private final List<OrderLine> lines; private OrderStatus status; boolean pay(PaymentMethod pm) { /* charge total, set PAID */ } }\nrecord OrderLine(Product product, int quantity, long unitPricePaise) { }\nenum OrderStatus { PLACED, PAID, SHIPPED, CANCELLED }\ninterface PaymentMethod { boolean pay(long amountPaise); }', codeLabel: 'Skeleton read straight off the diagram' }
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
      { title: 'Diagram to code: every line has a Java shape', html: `${H.table(['UML', 'Java'], [['<code>Order 1 ◆— 1..* OrderLine</code>', '<code>private final List&lt;OrderLine&gt; lines</code> created inside Order, constructor rejects empty'], ['<code>Order → 1 Customer</code>', '<code>private final Customer customer;</code> (no list of orders in Customer)'], ['<code>Order ..&gt; PaymentMethod</code>', '<code>boolean pay(PaymentMethod pm)</code> (parameter only)'], ['<code>Upi ..▷ PaymentMethod</code>', '<code>class Upi implements PaymentMethod</code>'], ['<code>«enum» OrderStatus</code>', '<code>enum OrderStatus { PLACED, PAID }</code>']])}`, code: `
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
}` },
      { title: 'Five notation mistakes interviewers notice', html: `${H.table(['Mistake', 'Fix'], [['Diamond drawn at the <b>part</b> end', 'The diamond always sits at the <b>whole</b> (Car ◆— Engine)'], ['Inheritance triangle pointing at the child', 'Triangle points at the <b>parent</b>/interface'], ['Same link drawn twice: a line to Engine <i>and</i> an attribute <code>engine: Engine</code>', 'Show it once, as a line (attributes are for simple values)'], ['No multiplicities', 'Always write them: they encode business rules (max 3 loans)'], ['30 boxes with every getter', 'Key classes, key fields, use-case methods only']])}` }
    ],
    deepDive: `<p><b>Three levels of class diagram.</b> A <i>conceptual/domain model</i> shows real-world concepts and associations, no types or methods (good for the first 5 minutes with an interviewer). A <i>design model</i> adds types, visibility, interfaces and navigability. An <i>implementation model</i> mirrors the code 1:1 and is usually generated by tools. Know which level you are drawing and say so.</p>
<p><b>Extra notation worth knowing:</b> derived attributes start with a slash (<code>/total : long</code>, computed not stored); constraints in braces (<code>{ordered}</code>, <code>{unique}</code>, <code>{readOnly}</code>); role names at line ends (<code>Employee —manager— Employee</code> for a self-association); qualifiers (a small box with <code>barcode</code> on the Library end = a map lookup); association classes (dashed line from the association to a class like <code>Enrollment</code>); notes (dog-eared box) for rules that do not fit the notation.</p>
<p><b>Navigability is a coupling decision.</b> An arrowhead means "this side can reach that side". Each two-way link adds a dependency in both directions and a consistency obligation. A mature diagram has mostly one-way arrows pointing from use-case coordinators down to entities and from entities to values.</p>
<p><b>Diagrams rot; text survives.</b> In production, hand-drawn diagrams go stale within months. Teams keep PlantUML or Mermaid text in the repo (reviewed in pull requests) or generate diagrams from code (IntelliJ, ArchUnit-based tooling). For system-level views, many teams use the C4 model and keep UML class diagrams only for tricky domain cores.</p>
<p><b>Interview timing.</b> In a 45–60 minute LLD round, spend roughly 5 min requirements, 10 min diagram, 25 min code, 5 min extensions. If the diagram takes 20 minutes you will not finish the code. Draw names and lines first; add members only for the classes you are about to code.</p>
<p><b>Other UML diagrams you may be asked about:</b> object diagram (a snapshot of instances with values), state machine diagram (status transitions of one class; perfect for orders, elevators, vending machines), activity diagram (a flowchart of a process), component and deployment diagrams (closer to HLD). Class + sequence + state cover 95% of LLD interviews.</p>`,
    aiEra: `<p><b>What AI changes:</b> diagrams are now cheap. You can ask an assistant to turn a Java package into Mermaid or PlantUML in seconds, and ask it the other way round: diagram text to skeleton code. Many interview platforms and design docs accept text diagrams, so <b>fluency in Mermaid/PlantUML syntax</b> is a practical 2026 skill.</p>
<p><b>Use AI as a partner:</b> <code>Generate a Mermaid classDiagram from this code; mark composition vs association by checking who creates each object.</code> Then review the arrows yourself. Or: <code>Here is my diagram text. List every multiplicity and the business rule it implies; flag any that look wrong.</code></p>
<p><b>Where AI goes wrong:</b> it routinely reverses arrow directions, uses composition for every field, omits multiplicities, and lists every getter and setter, burying the design. Generated diagrams from code also cannot know <i>intent</i> (should orders survive account deletion?), only structure.</p>
<p><b>What you must still own:</b> choosing the level of detail for your audience, encoding the business rules in multiplicities and diamonds, and keeping the diagram small enough to reason about. A crisp 8-box diagram you can explain beats a 40-box generated one.</p>`,
    problems: [{
      title: 'Draw the Class Diagram for an Online Shopping Cart',
      level: 'Medium', tags: ['class diagram', 'multiplicity', 'composition', 'interface'], companies: ['Amazon', 'Flipkart', 'Walmart', 'Shopify'],
      statement: `<p>Customers browse <b>products</b> (sku, name, price, stock), add them to a <b>cart</b> with quantities, apply at most one <b>coupon</b> (flat or percentage), and <b>checkout</b> to create an <b>order</b> paid by a payment method. The order must keep the price paid even if the product price changes later. Draw the class diagram (describe boxes, members, arrows and multiplicities) and write a compilable Java skeleton with working <code>Cart.add</code>, <code>Cart.total</code> and <code>Customer.checkout</code>.</p>`,
      constraints: `<ul><li>Quantity ≥ 1; cannot add more than stock.</li><li>Coupon types: FLAT (paise off) or PERCENT (0–100). Total never below 0.</li><li>Order has 1..* lines; cart is emptied after checkout.</li></ul>`,
      example: `<p>Cart: 2 × Pen (₹50) + 1 × Notebook (₹120) = ₹220. Coupon PERCENT 10 → ${H.c('g', '₹198')}. After checkout: Order with 2 lines at the frozen prices, cart empty. If Pen's price changes to ₹60 later, the order total stays ₹198.</p>
${H.table(['Box', 'Key members', 'Links'], [['Customer', 'id, name; checkout(pm)', '◆ 1 Cart; 1 → 0..* Order'], ['Cart', 'add, remove, total', '◆ 0..* CartItem; 0..1 → Coupon'], ['Order', 'lines, total, status', '◆ 1..* OrderLine'], ['«interface» Coupon', 'apply(total)', 'FlatCoupon, PercentCoupon ..▷']])}`,
      brute: {
        why: `<p>The god-class version is one <code>ShopService</code> with <code>Map&lt;String, Integer&gt; cart</code> (sku → qty), <code>Map&lt;String, Long&gt; prices</code> and a <code>String couponType</code>. Checkout re-reads <i>current</i> prices, so old orders change when prices change (an accounting bug). Coupon logic is an if-else on strings. There is no Order object at all, just a list of maps. You cannot draw a class diagram of it because there are no classes to draw, which is exactly the problem.</p>`,
        code: `
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
}`
      },
      mcq: { q: 'Why does OrderLine store unitPricePaise instead of just referencing Product?', options: ['To save memory', 'Because the order must remember the price actually paid even if the product price changes later', 'Because Product is immutable', 'UML requires it'], answer: 1, explain: 'An order is a historical record. Referencing the live product price would rewrite history. Copy the price (a snapshot) into the line; keep the reference to Product for everything else.' },
      hints: [
        `<p>Hint 1: nouns → Customer, Product, Cart, CartItem, Coupon, Order, OrderLine, PaymentMethod. Which are parts that die with a whole? (CartItem in Cart, OrderLine in Order.)</p>`,
        `<p>Hint 2: Coupon varies → interface with FlatCoupon and PercentCoupon records. Cart holds 0..1 coupon (nullable or Optional). Payment → interface used by Customer.checkout (dependency).</p>`,
        `<p>Hint 3: checkout = build OrderLines from CartItems copying the current price → new Order(lines, discountedTotal) → pm.pay(total) → cart.clear(). Validate stock in Cart.add.</p>`
      ],
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
    }
}`,
        complexity: `<p>add/remove O(1) (LinkedHashMap by sku); total O(items); checkout O(items). Memory O(items + orders). Extending with a new coupon type = one new record, no edits.</p>`,
        followUps: ['Reserve stock at checkout so two customers cannot buy the last unit (concurrency module).', 'Support multiple coupons with a priority order. Which pattern helps?', 'Add order states SHIPPED/DELIVERED/RETURNED: draw the state machine diagram.']
      }
    }]
  });

  /* =========================== TOPIC 6 =========================== */
  topics.push({
    title: 'UML Sequence Diagrams: Who Calls Whom, In What Order',
    analogy: `<p>Picture ordering food in a restaurant. You tell the <b>waiter</b> your order, the waiter tells the <b>kitchen</b>, the kitchen says "ready", the waiter brings the plate, you pay at the <b>counter</b>. Write each person as a column and each sentence as an arrow from one column to another, top to bottom in time order. That picture is a <b>sequence diagram</b>. A class diagram is the restaurant's <i>staff list</i>; a sequence diagram is <i>one evening's story</i>.</p>`,
    explain: `<p>A class diagram shows structure. A <b>sequence diagram</b> shows <b>behaviour over time</b> for one use case: which object sends which message to which other object, in order. It is the best tool to check that your classes can actually <i>do</i> the job.</p>
${H.table(['Element', 'Drawing', 'Java meaning'], [
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
    code: `
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
    codeTitle: 'Sequence diagram → Java (ATM withdraw)',
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
        ], { code: code, codeLabel: 'OrderService.placeOrder (each message = one highlighted line)', intro: 'Five lifelines for the "place order" use case. Watch each arrow light up the line of Java that sends it.', outro: 'Notice the <b>shape</b>: one coordinator in the middle with short arrows to helpers that each own one job. If Controller had arrows straight to Inventory, Payments and Notifier, the controller would be a god class.' });
      }
    }],
    examples: [
      { title: 'alt fragment = if/else (login)', html: `<p>Diagram: <code>User → AuthService: login(email, pw)</code>; <code>AuthService → UserRepo: findByEmail</code>; then an <b>alt</b> frame with two compartments: <code>[password matches] AuthService → SessionStore: create → return token</code> and <code>[else] AuthService → AuditLog: recordFailure → return error</code>. Each compartment of <code>alt</code> becomes one branch of an if/else. <b>opt</b> is an if with no else; <b>loop</b> is a for/while; <b>par</b> is work done in parallel (e.g. <code>CompletableFuture.allOf</code>).</p>`, code: `
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
}` },
      { title: 'loop fragment = a for loop (cart total)', html: `<p><code>Cart → CartItem: subtotal()</code> inside a <b>loop [for each item]</b> frame, and inside that, <code>CartItem → Product: price()</code>. The diagram makes it obvious that Cart talks to items, items talk to products, and Cart never reaches into Product directly. That is the <b>Law of Demeter</b> ("talk only to your immediate friends") made visible.</p>
${H.table(['#', 'from', 'to', 'message', 'fragment'], [['1', 'Client', 'Cart', 'total()', ''], ['2', 'Cart', 'CartItem', 'subtotal()', 'loop [each item]'], ['3', 'CartItem', 'Product', 'price()', 'loop [each item]'], ['4', 'Cart', 'Client', 'return sum', '']])}` },
      { title: 'Spotting a train wreck from the diagram', html: `<p>Bad: <code>Controller → Order: getCustomer()</code>, <code>Controller → Customer: getWallet()</code>, <code>Controller → Wallet: getBalance()</code>, <code>Controller → Wallet: setBalance(b - x)</code>. Four arrows fan out from the controller, which now knows the inner structure of three classes and holds the balance rule itself. Better: <code>Controller → Order: payWithWallet()</code>, <code>Order → Customer: charge(x)</code>, <code>Customer → Wallet: debit(x)</code>. Each object talks only to its neighbour and owns its rule. Same behaviour, far less coupling.</p>`, code: `
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
}` }
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
<p>Write compilable Java where each arrow is a method on the receiving class, and the alt fragment is the if/else.</p>`,
      constraints: `<ul><li>Locations as (x, y) grid points; distance = Manhattan distance.</li><li>Fare = ₹50 base + ₹12 per unit distance.</li><li>A driver is available only if not already assigned. Notifier must not block (async).</li></ul>`,
      example: `<p>Drivers: D1 at (0,0) free, D2 at (5,5) free. Rider requests (1,1) → (4,5): distance 3 + 4 = 7 → fare = 50 + 84 = ${H.c('g', '₹134')}. Nearest free driver to (1,1) is D1 (distance 2) → ride ASSIGNED to D1. A second request from (1,1) gets ${H.c('y', 'D2')}. A third gets ${H.c('r', '"no drivers nearby"')} (alt else branch).</p>`,
      brute: {
        why: `<p>The naive version puts the whole diagram inside one <code>RideController.request</code> method: it computes the fare inline, loops over a raw list of driver maps, flips a <code>"busy"</code> string, and sends the notification synchronously with a <code>Thread.sleep</code>-like call. Drawn as a sequence diagram it has <b>one lifeline</b> with 20 self-calls: no object owns anything, the fare formula cannot be reused or tested, and the user waits for the SMS gateway.</p>`,
        code: `
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
}`
      },
      mcq: { q: 'In the diagram, which class should own "find the nearest available driver"?', options: ['RideService, by looping over all drivers itself', 'DriverPool, because it holds the drivers and their availability', 'Rider', 'Notifier'], answer: 1, explain: 'Information Expert: DriverPool has the data (drivers, positions, availability). RideService just asks it, which is exactly the arrow RideService → DriverPool: nearestAvailable(pickup).' },
      hints: [
        `<p>Hint 1: each lifeline is a class; each solid arrow into it is a method you must write on it: <code>FareCalculator.estimate</code>, <code>DriverPool.nearestAvailable</code>, <code>Driver.assign</code>, <code>Notifier.notifyAsync</code>.</p>`,
        `<p>Hint 2: <code>nearestAvailable</code> returns <code>Optional&lt;Driver&gt;</code>; the alt fragment becomes <code>if (driver.isPresent()) ... else ...</code>. Location is a record with <code>distanceTo</code>.</p>`,
        `<p>Hint 3: async = hand work to an <code>Executor</code> (or record it in a queue) and return immediately. RideService receives all collaborators via its constructor (association), so tests can pass fakes.</p>`
      ],
      solution: {
        approach: `<p>Map the diagram 1:1. <b>Lifelines → classes</b>: RideService (coordinator), FareCalculator, DriverPool, Driver, Notifier, plus the created Ride. <b>Messages → methods</b> on the receiver. <b>alt → if/else</b> on the Optional. <b>«create» → constructor</b> call inside RideService. <b>Async → Executor</b> so the caller never waits. RideService holds references to its collaborators (association via constructor injection), while Location and Fare are small value objects. Each class has one job, matching the short arrows in the diagram.</p>`,
        code: `
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
        RideService svc = new RideService(new FareCalculator(), pool, new Notifier(direct));
        Location a = new Location(1, 1), b = new Location(4, 5);
        System.out.println(svc.requestRide("Asha", a, b));   // Asha with D1 fare 134 ASSIGNED
        System.out.println(svc.requestRide("Ravi", a, b));   // Ravi with D2 ...
        System.out.println(svc.requestRide("Mia", a, b));    // no drivers nearby
    }
}`,
        complexity: `<p>estimate O(1); nearestAvailable O(D) over D drivers (a spatial index like a geohash grid or k-d tree makes it ~O(log D) at scale); assign O(1). The design keeps each arrow a single, testable method.</p>`,
        followUps: ['Two riders request at the same instant and both get D1. Where do you add synchronisation?', 'Add surge pricing without editing FareCalculator callers. Which relationship/pattern?', 'Draw the alt branch for "driver rejects the ride": what new messages appear?']
      }
    }]
  });

  /* =========================== TOPIC 7 =========================== */
  topics.push({
    title: 'End to End: Requirement → Class Diagram → Sequence → Java Skeleton',
    analogy: `<p>Assembling <b>flat-pack furniture</b>: first you read the instruction sheet and check the box has what you need (requirements). Then you lay every part on the floor and label them (classes). You check which screw joins which panel (relationships). Only then do you assemble (code), and finally you push the wardrobe to see if it wobbles (walk a use case). People who start screwing panels together before laying out the parts end up with a wardrobe whose door opens into the wall.</p>`,
    explain: `<p>This topic ties everything together into the <b>repeatable workflow</b> used in LLD / machine-coding interviews.</p>
${H.table(['Step', 'Time (60-min round)', 'Output', 'Key question'], [
  ['1. Clarify', '5 min', 'feature list, in/out of scope', '"What must it do? What can we skip?"'],
  ['2. Entities', '5 min', 'filtered noun list, enums, value objects', '"What does the system have to remember?"'],
  ['3. Relationships', '5 min', 'lines + diamonds + multiplicities', '"Who owns whom? How many?"'],
  ['4. Class diagram', '5 min', 'boxes with key members, interfaces', '"Where will things vary?"'],
  ['5. Sequence (main use case)', '5 min', 'one flow + one failure branch', '"Who does each step?"'],
  ['6. Java skeleton + core logic', '25–30 min', 'compiling code + a tiny demo', '"Does it run? Is it easy to extend?"'],
  ['7. Extensions', '5 min', 'how new requirements fit', '"What changes if…?"']
])}
<h4>Writing the skeleton: an order that never gets stuck</h4>
<ol>
<li><b>Enums</b> for fixed sets (RoomType, BookingStatus).</li>
<li><b>Value objects</b> as <code>record</code>s (DateRange, Money): validate in the compact constructor.</li>
<li><b>Entities</b> (Room, Guest, Booking): private final fields, constructor validation, intention-revealing methods, no public setters.</li>
<li><b>Interfaces</b> at variation points (PricingPolicy, PaymentMethod).</li>
<li><b>Coordinator/service</b> (Hotel, BookingService) holding in-memory maps as repositories, implementing the use cases.</li>
<li><b>main()</b> that runs the happy path and one failure. Interviewers love seeing it run.</li>
</ol>
<h4>Skeleton quality checklist</h4>
${H.table(['Check', 'Good', 'Smell'], [
  ['Fields', '<code>private final</code> where possible', 'public / mutable everything'],
  ['Money', '<code>long</code> paise or <code>BigDecimal</code>', '<code>double</code>'],
  ['Status', '<code>enum</code> + transition methods', '<code>String status</code> + setter'],
  ['Collections out', '<code>List.copyOf</code> / unmodifiable view', 'returning the internal list'],
  ['0..1 links', '<code>Optional</code> return or explicit null contract', 'surprise NullPointerException'],
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
    code: `
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
      { title: 'Enum or class hierarchy for "room types"?', html: `<p>If room types differ only in <b>data</b> (name, capacity, base rate), an <code>enum</code> with fields is perfect and adding a type is one line. If types differ in <b>behaviour</b> (a Suite includes breakfast and has a custom cancellation rule), move to an interface/abstract class with subclasses, or keep the enum and inject behaviour via a policy. Decide by asking: "does the new type need new <i>code</i> or just new <i>numbers</i>?"</p>`, code: `
enum RoomKind {
    SINGLE(1, 2500_00), DOUBLE(2, 4000_00), SUITE(4, 9000_00);
    final int capacity;
    final long baseRatePaise;
    RoomKind(int capacity, long baseRatePaise) { this.capacity = capacity; this.baseRatePaise = baseRatePaise; }
    boolean fits(int guests) { return guests <= capacity; }      // behaviour on the enum is fine too
}` },
      { title: 'Making the late twist cheap: pricing as an interface', html: `<p>The interviewer adds: "weekends cost 25% more". With <code>PricingPolicy</code> already in the diagram, you add one class and pass it to the Hotel constructor. Nothing else changes, and the old flat pricing still works for tests.</p>
${H.table(['Stay', 'Flat', 'Weekend +25%'], [['Fri→Sun (2 nights)', '8000', '10000'], ['Mon→Wed (2 nights)', '8000', '8000']])}`, code: `
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
}` },
      { title: 'What interviewers actually grade', html: `${H.table(['Signal', 'Weak', 'Strong'], [['Requirements', 'starts coding immediately', 'asks 3–5 scoping questions, writes them down'], ['Entities', 'one class per noun, or one god class', 'filters nouns with reasons; enums and values'], ['Relationships', 'fields everywhere, no reasoning', 'explains ownership and multiplicity'], ['Code', 'does not compile / no demo', 'compiles, small methods, a main() that runs'], ['Extensibility', '"we can add an if"', 'points to the interface where change lands'], ['Communication', 'silent typing', 'narrates trade-offs and time budget']])}` }
    ],
    deepDive: `<p><b>Design for the change you were told about, not every change imaginable.</b> The requirement said "seasonal pricing later", so pricing gets an interface. It did not mention multiple currencies, so Money stays simple. Over-engineering (interfaces for everything, factories of factories) is penalised as much as under-engineering. Name this trade-off explicitly: <i>YAGNI with a hook where change was announced</i>.</p>
<p><b>Entities need identity rules.</b> Decide how two Booking objects are compared: by id (entity) not by fields. Generate ids in one place (a counter in the coordinator, or <code>UUID</code>). Value objects (DateRange) compare by value and are immutable, so they can be shared freely and used as map keys.</p>
<p><b>Where do "repositories" go?</b> In interviews keep them as in-memory <code>Map</code>s inside the coordinator or as tiny <code>XRepository</code> classes with <code>save/findById</code>. Mention that a real system would put an interface in front so a database implementation can be swapped in (Dependency Inversion, next module).</p>
<p><b>Error handling contract.</b> Pick one style per layer: exceptions for programmer errors and broken invariants (<code>IllegalArgumentException</code>, <code>IllegalStateException</code>), <code>Optional</code> or result objects for expected business outcomes ("no room available"). Mixing both randomly is a smell interviewers notice.</p>
<p><b>Concurrency hook.</b> Check-then-act on shared state (is the room free? then book) is a race. Even in a single-threaded interview solution, mark the method <code>synchronized</code> or say where a lock/DB constraint would go (unique index on room+night, optimistic version column). The Concurrency in LLD module goes deep.</p>
<p><b>Testability falls out of good modelling.</b> If every collaborator comes in through a constructor and every rule lives in a small class, you can unit-test <code>DateRange.overlaps</code> with 6 cases in a minute. The overlap boundary (check-out day equals next check-in day is <i>not</i> an overlap) is exactly the kind of edge case to state aloud.</p>
<p><b>Package structure</b> once it grows: <code>domain</code> (entities, values, enums, interfaces), <code>service</code> (use cases), <code>infra</code> (repositories, gateways). Dependencies point inwards to the domain.</p>`,
    aiEra: `<p><b>What AI changes:</b> in 2026 many machine-coding rounds allow an AI assistant, and real teams scaffold features with agents. The bottleneck moved from typing to <b>specifying and reviewing</b>: a crisp class diagram and sequence is now the best prompt you can give, and the best yardstick for judging what comes back.</p>
<p><b>Use AI as a partner:</b> write your scope list, entity verdicts and diagram first, then prompt <code>Generate Java 21 classes exactly matching this diagram: records for values, enums for statuses, no public setters, constructor validation, a main() demo. Do not add classes I did not list.</code> Then ask <code>Write JUnit tests for DateRange.overlaps including the boundary where checkOut equals the next checkIn.</code></p>
<p><b>Where AI goes wrong:</b> it adds speculative layers (DTOs, mappers, factories), silently changes multiplicities, uses <code>double</code> for money, ignores the double-booking race, and produces code that compiles but places rules in a fat service. It may also "helpfully" implement features you scoped out.</p>
<p><b>What you must still own:</b> the scope negotiation, the model (entities, ownership, multiplicities, variation points), the race condition call-out, and the review of generated code against your diagram. Interviewers increasingly ask you to critique a generated design, so practise reading code back into a diagram and spotting where it drifted.</p>`,
    problems: [{
      title: 'End-to-End Design: Meeting Room Booking System',
      level: 'Hard', tags: ['end-to-end', 'class diagram', 'sequence diagram', 'value object', 'interface'], companies: ['Microsoft', 'Google', 'Atlassian', 'Salesforce'],
      statement: `<p>An office has meeting rooms with a <b>capacity</b> and <b>equipment</b> (projector, whiteboard, video-conf). Employees book a room for a <b>time slot</b> on a day for N attendees, optionally requiring equipment. No two bookings may overlap in the same room. The system should <b>suggest the smallest room</b> that fits and is free. Bookings can be cancelled by their organiser only. Later the company wants different <b>room-selection strategies</b> (closest floor, least used). Produce: scope list, entities with verdicts, class diagram (as text), the sequence for <code>book()</code>, and compilable Java.</p>`,
      constraints: `<ul><li>Slots are [start, end) with minute precision on one day; end &gt; start.</li><li>Capacity ≥ attendees; required equipment ⊆ room equipment.</li><li>Only the organiser can cancel. Selection strategy must be pluggable.</li></ul>`,
      example: `<p>Rooms: <b>Ganga</b> (4 seats, whiteboard), <b>Yamuna</b> (8 seats, projector + whiteboard), <b>Kaveri</b> (12 seats, all equipment).</p>
${H.table(['request', 'result', 'why'], [['Asha, 10:00–11:00, 3 people', H.c('g', 'Ganga'), 'smallest that fits'], ['Ravi, 10:30–11:30, 3 people', H.c('g', 'Yamuna'), 'Ganga overlaps 10:30–11:00'], ['Mia, 11:00–12:00, 3 people, projector', H.c('y', 'Kaveri'), 'Ganga has no projector; Yamuna busy until 11:30'], ['Ravi cancels Asha\'s booking', H.c('r', 'rejected'), 'not the organiser']])}
<p>Note row 3: Ganga is <i>free</i> at 11:00 (Asha's [10:00, 11:00) ends exactly then, half-open intervals) but lacks a projector, and Yamuna's [10:30, 11:30) overlaps, so the smallest fitting free room is ${H.c('y', 'Kaveri')}. Getting these boundaries right is part of the problem.</p>`,
      brute: {
        why: `<p>The god-class approach: <code>OfficeManager</code> with <code>Map&lt;String, List&lt;int[]&gt;&gt; roomSlots</code>, capacities in another map, equipment as comma-separated strings, and a <code>book</code> method with nested loops and string <code>contains</code> checks. "Smallest room" is a hard-coded sort inside book(). Switching to "closest floor" means editing the core method; cancellation has no idea who the organiser was because bookings are just int arrays. It has no seams to test or extend.</p>`,
        code: `
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
}`
      },
      mcq: { q: 'The company will later want "closest floor" or "least used" room selection. What should the design include now?', options: ['A big if/else on a strategy name inside book()', 'A RoomSelectionStrategy interface injected into the booking service, with SmallestFitStrategy as the first implementation', 'A subclass of the service for each strategy', 'Nothing; YAGNI'], answer: 1, explain: 'The change was announced, so add a seam exactly there. An interface with one implementation today costs almost nothing and turns the future change into one new class.' },
      hints: [
        `<p>Hint 1: entities: Room (name, capacity, Set&lt;Equipment&gt;, floor), Booking (id, organiser, room, TimeSlot, attendees), Employee or just organiser id; value object <code>TimeSlot</code> with <code>overlaps</code>; enum <code>Equipment</code>.</p>`,
        `<p>Hint 2: the service filters <b>candidate rooms</b> (capacity, equipment, free in that slot) and hands the candidates to <code>RoomSelectionStrategy.choose(candidates)</code>. SmallestFit = min by capacity.</p>`,
        `<p>Hint 3: TimeSlot overlap for half-open intervals: <code>a.start &lt; b.end &amp;&amp; b.start &lt; a.end</code>. Cancel checks <code>booking.organiser().equals(requester)</code>. Make book() synchronized (check-then-act). Return Optional for "no room".</p>`
      ],
      solution: {
        approach: `<p><b>Scope:</b> one office, one day granularity, book/cancel/suggest, pluggable selection. <b>Entities:</b> Room, Booking (entities), TimeSlot (record), Equipment (enum), organiser as an employee id string. <b>Diagram:</b> <code>BookingService ◆— 0..* Booking</code>, <code>BookingService o— 1..* Room</code> (rooms exist independently of the service), <code>Booking → 1 Room</code>, <code>Booking ◆ 1 TimeSlot</code>, <code>Room → 0..* Equipment</code>, <code>BookingService → 1 «interface» RoomSelectionStrategy</code> ◁·· SmallestFitStrategy, LeastUsedStrategy. <b>Sequence book():</b> Employee → BookingService.book → for each Room: room.fits(people, needs) → isFree(room, slot) asks each Booking.conflicts(room, slot) → TimeSlot.overlaps → strategy.choose(candidates) → «create» Booking → return. Overlap uses half-open intervals so back-to-back meetings are allowed.</p>`,
        code: `
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
        System.out.println(svc.cancel(a.id(), "ravi"));                                   // false
    }
}`,
        complexity: `<p>book() is O(R × B) for R rooms and B bookings (fine for an office). At scale, index bookings per room in a <code>TreeMap&lt;LocalTime, Booking&gt;</code> and check only the floor/ceiling neighbours: O(R log B). Cancel is O(1) by id.</p>`,
        followUps: ['Add recurring meetings (every Monday 10:00). Which new class appears and how does overlap checking change?', 'Implement LeastUsedStrategy. What data does it need and who should own it?', 'Two people book the last room concurrently across two servers: what replaces synchronized?']
      }
    }]
  });

  /* =========================== PRACTICE: EASY =========================== */
  practice.push({
    title: 'Car, Engine, Wheels and Driver',
    level: 'Easy', tags: ['composition', 'association', 'multiplicity'], companies: ['TCS', 'Infosys', 'Amazon'],
    statement: `<p>Model a <b>Car</b> that is built with exactly one <b>Engine</b> and four <b>Wheels</b>. A <b>Driver</b> can be assigned to at most one car at a time, and a car has at most one driver. Starting the car starts its engine. Replacing a flat tyre swaps one wheel. Identify each relationship, its multiplicity, and write the Java classes.</p>`,
    constraints: `<ul><li>Engine and wheels are created with the car and never shared.</li><li>Wheel position 0–3.</li><li>Driver ↔ Car is 0..1 on both sides.</li></ul>`,
    example: `${H.table(['Pair', 'Relationship', 'Multiplicity'], [['Car–Engine', H.c('g', 'composition'), '1 → 1'], ['Car–Wheel', H.c('g', 'composition'), '1 → 4'], ['Driver–Car', H.c('b', 'association'), '0..1 ↔ 0..1']])}<p><code>car.start()</code> prints "engine on"; <code>driver.drive(car)</code> fails if the car already has another driver.</p>`,
    brute: {
      why: `<p>The naive version gives Car public fields <code>engine</code> and <code>wheels</code> that callers fill in, so two cars can end up sharing one Engine object (start one, the other "starts" too) and a car can be built with 3 wheels or none. Driver and Car are linked by two independent setters, so a car can point to Ravi while Ravi points to a different car.</p>`,
      code: `
class Engine { boolean on; }
class Car {
    public Engine engine;                 // set from outside: may be shared or null
    public List<String> wheels = new ArrayList<>();
    public String driverName;             // and Driver has its own carPlate: drift
}`
    },
    mcq: { q: 'Two cars must never share an engine, and the engine is scrapped with the car. Which Java shape fits?', options: ['Engine passed into the Car constructor from outside', 'private final Engine engine = new Engine(); created inside Car', 'public Engine engine; set later', 'static Engine shared by all cars'], answer: 1, explain: 'Composition: the whole creates and exclusively owns the part. Creating it inside and keeping it private guarantees no sharing.' },
    hints: [
      `<p>Hint 1: apply the life test. Can an engine exist in our system without its car? No → composition. Can a driver exist without a car? Yes → association.</p>`,
      `<p>Hint 2: create the engine and an array of 4 wheels inside the Car constructor. Expose behaviour (<code>start()</code>, <code>replaceWheel(pos)</code>) instead of the parts themselves.</p>`,
      `<p>Hint 3: keep the two-way Driver ↔ Car link consistent with one entry point, <code>driver.drive(car)</code>, that checks the car is free and sets both sides.</p>`
    ],
    solution: {
      approach: `<p><b>Car ◆ 1 Engine</b> and <b>Car ◆ 4 Wheel</b>: created in the constructor, private, never returned. <b>Driver 0..1 — 0..1 Car</b>: a two-way association updated only through <code>Driver.drive</code> / <code>Driver.leave</code>, which call package-private hooks on Car. Behaviour goes on the whole: <code>car.start()</code> delegates to its engine (the caller never touches Engine).</p>`,
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
      code: `
class Playlist {
    String name;
    List<String> songTitles = new ArrayList<>();   // copies, not references
    int totalSeconds;                               // stored, drifts when songs change
}
class MusicApp {
    List<Playlist> playlists = new ArrayList<>();
    Map<String, Integer> library = new HashMap<>(); // title -> seconds
}`
    },
    mcq: { q: 'Library → Song and Playlist → Song: which pair of relationships fits?', options: ['Both composition', 'Library ◆ Song (owns them), Playlist ◇ Song (shared references)', 'Both inheritance', 'Playlist ◆ Song, Library ◇ Song'], answer: 1, explain: 'Songs live in the library (deleting from the library deletes the song). Playlists only group references to songs that are shared with other playlists.' },
    hints: [
      `<p>Hint 1: who controls the life of a song? The library. Who only groups songs? Playlists.</p>`,
      `<p>Hint 2: <code>Song</code> is a record (id, title, seconds). Library keeps <code>Map&lt;String, Song&gt;</code> and <code>List&lt;Playlist&gt;</code>; Playlist keeps <code>List&lt;Song&gt;</code> references.</p>`,
      `<p>Hint 3: <code>library.deleteSong(id)</code> removes it from the map and calls <code>p.removeAll(song)</code> on each playlist; duration = stream sum of seconds.</p>`
    ],
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
      why: `<p>The naive design puts every ability in one base class: <code>Animal</code> with <code>swim()</code>, <code>fly()</code>, <code>walk()</code>, and subclasses override the ones they cannot do with <code>throw new UnsupportedOperationException()</code>. Every show must now wrap calls in try/catch or check a type string. The hierarchy promises abilities that do not exist (an LSP violation).</p>`,
      code: `
class Animal {
    String name;
    void fly() { System.out.println(name + " flies"); }
    void swim() { System.out.println(name + " swims"); }
}
class Fish extends Animal {
    @Override void fly() { throw new UnsupportedOperationException("fish can't fly"); }
}`
    },
    mcq: { q: 'Where should "can fly" live?', options: ['As fly() on the Animal base class', 'In a Flyable interface implemented only by animals that fly', 'As a boolean canFly field checked everywhere', 'In a FlyingAnimal superclass that Duck and Eagle extend, while Penguin extends SwimmingAnimal'], answer: 1, explain: 'Abilities that cut across the family tree are capabilities: small interfaces. A Duck both swims and flies, which single-inheritance superclasses cannot express.' },
    hints: [
      `<p>Hint 1: what is true of <b>all</b> animals? name and sound. That goes into an abstract base class.</p>`,
      `<p>Hint 2: abilities not shared by all → interfaces <code>Swimmer</code>, <code>Flyer</code>. A class can implement several.</p>`,
      `<p>Hint 3: shows filter with <code>instanceof Swimmer s</code> (pattern matching) or keep separate typed lists; then call the ability polymorphically.</p>`
    ],
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
        System.out.println(poolShow(zoo));   // Duck, Penguin, Fish
        System.out.println(birdShow(zoo));   // Duck, Eagle
    }
}`,
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
      code: `
class Thermostat {
    public double target;      // anyone can set 45.0
    public double current;     // anyone can fake the sensor
    public String mode;        // "heat", "HEAT", "Heat"?
}`
    },
    mcq: { q: 'Which is the best API for changing the target?', options: ['setTarget(double) with no checks', 'nudgeUp() / nudgeDown() that clamp to [16, 30], plus a validated setTarget', 'A public target field', 'A static method in ThermostatUtils'], answer: 1, explain: 'Methods named after real user actions, each guarding the invariant inside the object. The field stays private.' },
    hints: [
      `<p>Hint 1: list invariants: target range, mode from a fixed set, current only from the sensor.</p>`,
      `<p>Hint 2: <code>enum Mode</code>, <code>enum Action { IDLE, HEATING, COOLING }</code>; ints in tenths: 160..300.</p>`,
      `<p>Hint 3: <code>action()</code> is derived from mode + temperatures each time it is called (no stored copy). <code>onSensorReading(int tenths)</code> is the only writer of current.</p>`
    ],
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
      code: `
class Student {
    String name;
    Map<String, String> grades = new HashMap<>();   // course -> "A": which semester? overwritten on retake
    double gpa;                                      // stored, goes stale
}
class Course {
    String code; int credits;
    List<String> students = new ArrayList<>();       // separately maintained: drifts
}`
    },
    mcq: { q: 'Where should the grade live?', options: ['In Student as a map', 'In Course as a map', 'In an Enrollment object linking student, course and semester', 'In a global static map'], answer: 2, explain: 'The grade belongs to the (student, course, semester) link, not to either side alone. That makes Enrollment an association class.' },
    hints: [
      `<p>Hint 1: the many-to-many link has its own data (semester, grade) → <code>Enrollment</code> class.</p>`,
      `<p>Hint 2: <code>enum Grade { A(10), B(8), ... }</code> with points; <code>record Course(code, title, credits)</code> validating credits 1..5.</p>`,
      `<p>Hint 3: Student keeps its enrollments; <code>enroll</code> checks duplicates and the 24-credit cap for that semester; <code>gpa(sem)</code> streams graded enrollments.</p>`
    ],
    solution: {
      approach: `<p><code>Student 1 ◆— 0..* Enrollment</code>, <code>Enrollment → 1 Course</code>; Enrollment holds semester and an optional grade (null until graded, exposed as Optional). Rules on the owner of the data: duplicate and credit-cap checks in Student.enroll (it knows all its enrollments), points in the Grade enum, GPA derived on demand. Course is an immutable record shared by many enrollments.</p>`,
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
        System.out.println(asha.gpa(1));          // 8.75
        try { asha.enroll(dsa, 1); } catch (IllegalStateException ex) { System.out.println(ex.getMessage()); }
    }
}`,
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
      code: `
class RestaurantSystem {
    Map<String, Integer> menuPrices = new HashMap<>();
    Map<Integer, List<String>> tableItems = new HashMap<>();
    Map<Integer, String> tableStatus = new HashMap<>();   // free-form strings
    int bill(int table) {
        int sum = 0;
        for (String item : tableItems.get(table)) sum += menuPrices.get(item);  // live prices: wrong
        return sum + sum * 5 / 100;
    }
}`
    },
    mcq: { q: 'Order → OrderItem → MenuItem. Which statement is right?', options: ['Order ◆ OrderItem; OrderItem → MenuItem (association) plus a copied unit price', 'Order ◇ MenuItem directly, no OrderItem needed', 'MenuItem ◆ OrderItem', 'OrderItem extends MenuItem'], answer: 0, explain: 'Order lines live and die with the order (composition) and snapshot the price; they only reference the menu item, which belongs to the menu.' },
    hints: [
      `<p>Hint 1: entities: Restaurant, Menu ◆ MenuItem, Table, Waiter, Order ◆ OrderItem. Enums: Category, OrderStatus.</p>`,
      `<p>Hint 2: OrderItem copies <code>unitPricePaise</code> at add time. Table knows its current order (0..1) so "one open order per table" is checked there.</p>`,
      `<p>Hint 3: status transitions as methods: <code>serve()</code> only from OPEN, <code>pay()</code> only from SERVED, then <code>table.release()</code>.</p>`
    ],
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
      code: `
class NotificationService {
    void notifyUser(Set<String> prefs, String msg) {
        if (prefs.contains("EMAIL")) System.out.println("SMTP: " + msg);
        if (prefs.contains("SMS")) { if (msg.length() > 160) throw new RuntimeException("too long"); System.out.println("SMS: " + msg); }
        if (prefs.contains("PUSH")) System.out.println("FCM: " + msg);   // never reached if SMS threw
    }
}`
    },
    mcq: { q: 'The service holds a Map&lt;ChannelType, NotificationChannel&gt; passed in at construction. What relationship is that?', options: ['Composition, because the service created them', 'Aggregation/association via dependency injection: channels are created outside and may be shared', 'Inheritance', 'No relationship'], answer: 1, explain: 'The channels live independently (often singletons shared by many services) and are handed in, which is what makes them swappable in tests.' },
    hints: [
      `<p>Hint 1: the varying part is "how to send on a channel" → <code>interface NotificationChannel { ChannelType type(); void send(User u, String msg); }</code>.</p>`,
      `<p>Hint 2: the service receives a list of channels and builds a map by type. For each preferred type: look up the channel, try/catch around send, record the outcome.</p>`,
      `<p>Hint 3: sequence: Caller → Service.notify(user, msg) → loop [each preference] → Service → Channel.send → (alt failure) record failed → return results map.</p>`
    ],
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
    }
}`,
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
      code: `
abstract class Employee { String id; abstract long pay(); }
class SalariedEmployee extends Employee { long monthly; long pay() { return monthly; } }
class HourlyEmployee extends Employee { long rate; int hours; long pay() { return rate * hours; } }
class SalariedManager extends SalariedEmployee { long pay() { return super.pay() + 1_000_000; } }
class HourlyManager extends HourlyEmployee { long pay() { return super.pay() + 1_000_000; } }
// CommissionedManager, InternManager, ... the explosion continues`
    },
    mcq: { q: 'An intern becomes a salaried employee. With which design is that a one-line change on the same object?', options: ['class Intern extends Employee, class Salaried extends Employee', 'Employee has a PayPolicy field; call employee.changePolicy(new Salaried(...))', 'A String payType field with a switch in pay()', 'Delete the intern and create a new employee'], answer: 1, explain: 'Composition with a behaviour object (a policy/strategy) lets behaviour change at runtime while identity stays the same.' },
    hints: [
      `<p>Hint 1: identify the axes of variation: (a) how pay is computed, (b) whether a manager allowance applies. Neither is a "kind of employee"; both are things an employee <b>has</b>.</p>`,
      `<p>Hint 2: <code>interface PayPolicy { long monthlyPay(WorkLog log); }</code> with Salaried/Hourly/Commission records. Employee holds one policy (association to a behaviour object).</p>`,
      `<p>Hint 3: manager allowance: an optional <code>long allowancePaise</code> on Employee or a role object. Pay = policy.monthlyPay(log) + allowance.</p>`
    ],
    solution: {
      approach: `<p>Employee (entity: id, name) <b>has a</b> PayPolicy (interface; Salaried, Hourly, Commission implement it) and an optional ManagerRole value. Pay type and managerial status vary independently, so we compose them instead of multiplying subclasses (N policies + 1 role instead of N × 2 classes). <code>WorkLog</code> is a record carrying hours and sales for the month. Changing policy keeps the same Employee object and id.</p>`,
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
      complexity: `<p>pay is O(1). Classes grow as P + R (policies + roles) instead of P × R. Policy objects are immutable records and can be shared between employees.</p>`,
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
      code: `
class SocialApp {
    List<String[]> follows = new ArrayList<>();    // [follower, followee]
    List<String[]> posts = new ArrayList<>();      // [id, author, text]
    List<String[]> likes = new ArrayList<>();      // duplicates possible
    List<String[]> comments = new ArrayList<>();   // orphaned after post deletion
}`
    },
    mcq: { q: 'How do you guarantee a user likes a post at most once?', options: ['Check a List&lt;String&gt; of likers with contains() and hope callers use it', 'Post holds a Set&lt;User&gt; likedBy and like() returns set.add(user)', 'A static counter', 'Store likes in User only'], answer: 1, explain: 'A Set gives uniqueness by construction, and keeping it inside Post (which owns its likes) means one place enforces the rule.' },
    hints: [
      `<p>Hint 1: follow is a <b>self-association</b> User → 0..* User. One-way, so each User keeps a <code>Set&lt;User&gt; following</code>.</p>`,
      `<p>Hint 2: <code>Post ◆ 0..* Comment</code> (deleted together) and <code>Post → 0..* User</code> for likes (a Set). Users are referenced, never owned.</p>`,
      `<p>Hint 3: feed = posts of everyone in <code>following</code>, sorted by timestamp descending. A <code>SocialNetwork</code> coordinator holds users and posts and generates ids/timestamps.</p>`
    ],
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
    }
}`,
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
      code: `
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
}`
    },
    mcq: { q: 'Which order avoids taking money without giving cash?', options: ['debit → check notes → dispense', 'check notes can make the amount → debit → dispense', 'dispense → debit', 'Order does not matter'], answer: 1, explain: 'Ask the CashDispenser whether it can make the amount before the bank debit. The sequence diagram is the place to get this order right.' },
    hints: [
      `<p>Hint 1: lifelines → classes: Atm (coordinator), CardReader, Bank, CashDispenser. Each arrow → method on the receiver.</p>`,
      `<p>Hint 2: Atm keeps per-session state: current card and failed attempts. The PIN check lives in Bank (it owns secrets); the note maths lives in CashDispenser (it owns notes).</p>`,
      `<p>Hint 3: dispenser exposes <code>canDispense(amount)</code> (greedy 500s then 100s within stock) and <code>dispense(amount)</code>. Withdraw: validate amount → canDispense → bank.debit → dispense → receipt.</p>`
    ],
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
    }
}`,
      complexity: `<p>Each step O(1). The design mirrors the sequence diagram, so reviewing the diagram reviews the code.</p>`,
      followUps: ['Model the ATM session states (IDLE, CARD_INSERTED, AUTHENTICATED) explicitly: this becomes the State pattern in a later module.', 'The bank call times out after debiting: what does the sequence need (reversal message)?']
    }
  });

  /* =========================== PRACTICE: HARD =========================== */
  practice.push({
    title: 'Movie Ticket Booking: Domain Model (Type vs Instance Everywhere)',
    level: 'Hard', tags: ['type-object', 'composition', 'association class', 'class diagram'], companies: ['BookMyShow', 'PVR INOX', 'Amazon', 'Paytm'],
    statement: `<p>A city has <b>theatres</b>; each theatre has <b>screens</b>; each screen has a fixed layout of <b>seats</b> (row, number, type REGULAR/PREMIUM). A <b>movie</b> is played in <b>shows</b> (movie + screen + start time). For each show, every seat is independently AVAILABLE, LOCKED (in someone's cart for 5 minutes) or BOOKED. A customer selects seats for a show, locks them, then confirms a <b>booking</b>; price depends on seat type and the show. Produce the class diagram (with all multiplicities) and the Java domain model with <code>lock</code>, <code>confirm</code>, and lock expiry.</p>`,
    constraints: `<ul><li>A physical seat is shared by all shows on that screen; its status is per show.</li><li>Locks expire after 5 minutes (use an injected clock value in minutes).</li><li>Confirm only seats locked by the same customer and not expired.</li></ul>`,
    example: `<p>Show S1 (Dune, Screen 2, 18:00), premium ₹400, regular ₹250. Asha locks A1, A2 at minute 0 → Ravi tries A2 at minute 2 → ${H.c('r', 'rejected')} (locked). Asha confirms at minute 3 → booking ₹650 if A1 premium, A2 regular. Had Asha waited until minute 6, her lock ${H.c('y', 'expired')} and Ravi could lock A2.</p>`,
    brute: {
      why: `<p>The naive model puts a <code>status</code> field on <b>Seat</b>. But the same physical seat is used by the 15:00 and the 18:00 show, so booking A1 for 18:00 also blocks it at 15:00. The workaround (copying the whole seat layout per show, including row/number/type) duplicates data and makes layout changes impossible. Locks with no owner or expiry leave seats stuck forever.</p>`,
      code: `
class Seat {
    String row; int number; String type;
    String status = "AVAILABLE";      // one status for ALL shows: wrong
}
class Screen { List<Seat> seats = new ArrayList<>(); }
class Show { String movie; Screen screen; String time; }   // no per-show seat state`
    },
    mcq: { q: 'Seat A1 on Screen 2 is booked for the 18:00 show but free at 15:00. Where does its status live?', options: ['Seat.status', 'In a ShowSeat object (show + seat + status), one per seat per show', 'Screen.status', 'Movie.status'], answer: 1, explain: 'Type vs instance again: Seat is the physical, shared description; ShowSeat is the per-show instance carrying status, lock owner and lock time.' },
    hints: [
      `<p>Hint 1: draw the composition chain: Theatre ◆ 1..* Screen ◆ 1..* Seat. Movie is independent. Show → 1 Movie, Show → 1 Screen.</p>`,
      `<p>Hint 2: Show ◆ 1..* ShowSeat (one per Seat of the screen, created with the show); ShowSeat → 1 Seat, holds status, lockedBy, lockedAt. Booking → 1 Show, → 1..* ShowSeat, has total.</p>`,
      `<p>Hint 3: <code>ShowSeat.isFreeAt(now)</code> = AVAILABLE or (LOCKED and now − lockedAt ≥ 5). Lock all-or-nothing: first check every seat, then lock. Confirm checks owner + not expired, then marks BOOKED and creates Booking.</p>`
    ],
    solution: {
      approach: `<p><b>Diagram:</b> <code>Theatre 1 ◆— 1..* Screen 1 ◆— 1..* Seat</code>; <code>Show 0..* —&gt; 1 Movie</code>; <code>Show 0..* —&gt; 1 Screen</code>; <code>Show 1 ◆— 1..* ShowSeat</code>; <code>ShowSeat 0..* —&gt; 1 Seat</code>; <code>Booking 0..* —&gt; 1 Show</code>; <code>Booking 0..1 —&gt; 1..* ShowSeat</code>; enums SeatType, SeatStatus. The key insight is <b>Seat (type) vs ShowSeat (instance)</b>, the same idea as Book vs BookCopy. Show owns pricing per seat type and the lock/confirm use cases (it holds its ShowSeats). Locking is all-or-nothing and synchronized per show.</p>`,
      code: `
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
        System.out.println(evening.confirm("asha", List.of("A1", "A2"), 3));   // total 65000
    }
}`,
      complexity: `<p>lock/confirm are O(k) for k seats requested. Creating a show is O(seats on the screen). Synchronising per Show keeps different shows independent (a finer-grained design locks per seat or uses DB row locks; see the Concurrency module).</p>`,
      followUps: ['Two app servers handle the same show: what replaces synchronized (DB unique constraint, optimistic version, Redis lock with TTL)?', 'Add dynamic pricing (weekend, occupancy-based) without editing Show: what interface appears?', 'Draw the sequence diagram for "select seats → pay → confirm" including the payment-failure branch.']
    }
  });

  practice.push({
    title: 'Food Delivery: Orders with a Status Lifecycle and Agent Assignment',
    level: 'Hard', tags: ['enum state machine', 'sequence diagram', 'association', 'composition'], companies: ['Swiggy', 'Zomato', 'DoorDash', 'Uber Eats'],
    statement: `<p>Customers order from one <b>restaurant</b> at a time; the restaurant's <b>menu</b> has items with prices. An order moves through <b>PLACED → ACCEPTED → PREPARING → PICKED_UP → DELIVERED</b>, or CANCELLED (only before PREPARING). When the restaurant accepts, the platform assigns the nearest free <b>delivery agent</b>; the agent becomes free again on delivery. Model the classes, write the legal-transition logic once, and implement place, accept (with assignment), pick up, deliver and cancel.</p>`,
    constraints: `<ul><li>Illegal transitions throw IllegalStateException.</li><li>All items in an order come from the same restaurant.</li><li>Agent distance: Manhattan on a grid; ties by agent id.</li></ul>`,
    example: `${H.table(['step', 'status', 'agent'], [['place (2 × Biryani)', 'PLACED', '-'], ['restaurant accepts', 'ACCEPTED', H.c('g', 'A1 (nearest free)')], ['cancel', H.c('r', 'still allowed (before PREPARING)'), 'A1 released'], ['… or: prepare → pick up → deliver', 'DELIVERED', 'A1 free again'], ['cancel after PREPARING', H.c('r', 'IllegalStateException'), '-']])}`,
    brute: {
      why: `<p>A god class <code>DeliveryApp</code> holds <code>Map&lt;Integer, String&gt; orderStatus</code> and each endpoint does <code>orderStatus.put(id, "DELIVERED")</code>. Nothing prevents DELIVERED → PLACED; cancellation rules are copied (and differ) in the customer app and the restaurant app; agents are marked busy in one map and never freed when an order is cancelled.</p>`,
      code: `
class DeliveryApp {
    Map<Integer, String> orderStatus = new HashMap<>();
    Map<String, Boolean> agentBusy = new HashMap<>();
    void setStatus(int orderId, String status) { orderStatus.put(orderId, status); }   // any jump allowed
    void cancel(int orderId) { orderStatus.put(orderId, "CANCELLED"); }                 // agent never freed
}`
    },
    mcq: { q: 'Where should the rule "cancel only before PREPARING" be written?', options: ['In every client app', 'Inside Order (or its status enum) as the only way to change status', 'In the database only', 'In the DeliveryAgent class'], answer: 1, explain: 'The order owns its lifecycle. Putting legal transitions in one place (enum or Order methods) makes illegal jumps impossible from any caller.' },
    hints: [
      `<p>Hint 1: classes: Restaurant ◆ MenuItem, Customer, Order ◆ OrderLine → MenuItem, DeliveryAgent, Location record, OrderStatus enum, DispatchService (coordinator).</p>`,
      `<p>Hint 2: give the enum a method <code>canMoveTo(next)</code> listing legal targets, and route every change through <code>Order.moveTo(next)</code>.</p>`,
      `<p>Hint 3: <code>accept</code> = order.moveTo(ACCEPTED) then dispatcher picks nearest free agent (min by distance, then id) → agent.assign(order). cancel releases the agent if any; deliver releases too.</p>`
    ],
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
    MenuItem item(String n) { return Objects.requireNonNull(menu.get(n), "not on menu: " + n); }
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
    }
}`,
      complexity: `<p>Transitions O(1); assignment O(A) over agents (a geo-index makes it sublinear at scale). All lifecycle rules live in one enum method, so adding a state (e.g. READY_FOR_PICKUP) is a local change.</p>`,
      followUps: ['The agent rejects the assignment: which messages appear in the sequence and who retries?', 'Add order states with timeouts (auto-cancel if not accepted in 10 minutes): who owns the timer?', 'When does this enum-based lifecycle become the full State pattern?']
    }
  });

  practice.push({
    title: 'Refactor a God Class: E-Learning Platform',
    level: 'Hard', tags: ['refactoring', 'god class', 'responsibility assignment', 'class diagram'], companies: ['Udemy', 'upGrad', 'Coursera', 'Unacademy'],
    statement: `<p>You inherit <code>LearningPlatform</code>, a 1,000-line class (simplified in the brute-force code below) that stores courses, lessons, enrollments, progress and certificates in parallel maps of strings. Rules: a course has ordered lessons; a learner must <b>enroll</b> before watching; a lesson counts as complete when watched ≥ 90%; a <b>certificate</b> is issued once when all lessons are complete; paid courses require payment before enrollment. Identify the hidden entities, draw the class diagram, and rewrite it as cooperating classes with the same behaviour.</p>`,
    constraints: `<ul><li>Behaviour must stay identical for existing callers' use cases.</li><li>Certificate issued exactly once, with a unique id.</li><li>Progress is per learner per lesson.</li></ul>`,
    example: `<p>Course "Java 101" with lessons L1, L2. Asha enrolls (free course), watches L1 95% → complete, L2 50% → not complete → progress ${H.c('y', '50%')}; watches L2 92% → progress ${H.c('g', '100%')} → certificate CERT-1 issued. Watching L2 again does ${H.c('m', 'not')} issue a second certificate.</p>`,
    brute: {
      why: `<p>Everything is keyed by concatenated strings (<code>learner + "|" + course + "|" + lesson</code>), so a typo silently creates a new key. Rules are scattered: the 90% threshold appears in two methods with different values; certificate issuance can run twice because "already issued" lives in a different map than progress; adding quizzes would mean editing every method. There is no type to hang a unit test on.</p>`,
      code: `
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
}`
    },
    mcq: { q: 'Which hidden entity owns "is this lesson complete for this learner"?', options: ['Course', 'Lesson', 'Enrollment (learner + course), holding per-lesson progress', 'Certificate'], answer: 2, explain: 'Progress belongs to the learner-in-a-course relationship. Enrollment is the association class that should hold per-lesson watch percentages and decide completion.' },
    hints: [
      `<p>Hint 1: every string key is a hidden class: "learner|course" = Enrollment; "learner|course|lesson" = progress inside Enrollment; the certificate map = Certificate owned by Enrollment (0..1).</p>`,
      `<p>Hint 2: Course ◆ 1..* Lesson (ordered); Course has a price (0 = free). Enrollment → Course, → Learner; Enrollment ◆ Map&lt;Lesson, Integer&gt; progress; Enrollment ◆ 0..1 Certificate.</p>`,
      `<p>Hint 3: <code>Enrollment.watch(lesson, pct)</code> stores max pct; if <code>isComplete()</code> and certificate is null → issue via an injected <code>CertificateIssuer</code> (id generator). Payment check moves to <code>Platform.enroll</code> through a <code>PaymentGateway</code> interface.</p>`
    ],
    solution: {
      approach: `<p><b>Entities recovered:</b> Course (id, title, price) ◆ 1..* Lesson; Learner; Enrollment (association class Learner–Course) ◆ per-lesson progress and ◆ 0..1 Certificate (record). <b>Variation/infra:</b> «interface» PaymentGateway, CertificateIssuer (id sequence). <b>Coordinator:</b> Platform with in-memory maps and two use cases (enroll, watch). Rules move to their experts: completion threshold in Enrollment (one constant), "issue once" in Enrollment (it owns the 0..1 certificate), payment in Platform.enroll. Strings become types, so typos fail to compile.</p>`,
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
        return (int) (100 * done / ls.size());
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
        if (c.isPaid() && !payments.charge(learner, c.price())) throw new IllegalStateException("payment failed");
        return enrollments.computeIfAbsent(learner + "|" + courseId, k -> new Enrollment(learner, c));
    }
    void watch(String learner, String courseId, Lesson lesson, int percent) {
        Enrollment e = enrollments.get(learner + "|" + courseId);
        if (e == null) throw new IllegalStateException("not enrolled");
        e.watch(lesson, percent, issuer);
    }

    public static void main(String[] args) {
        Platform p = new Platform((who, amt) -> true);
        Course java = new Course("J101", "Java 101", 0);
        Lesson l1 = java.addLesson("L1", "Basics"), l2 = java.addLesson("L2", "OOP");
        p.addCourse(java);
        Enrollment e = p.enroll("asha", "J101");
        p.watch("asha", "J101", l1, 95);
        p.watch("asha", "J101", l2, 50);
        System.out.println(e.progressPercent());                       // 50
        p.watch("asha", "J101", l2, 92);
        p.watch("asha", "J101", l2, 100);
        System.out.println(e.progressPercent() + " " + e.certificate().map(Certificate::id).orElse("-"));  // 100 CERT-1
    }
}`,
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
      code: `
class FlatFs {
    Map<String, String> files = new HashMap<>();      // "/docs/java/notes.txt" -> content
    Set<String> dirs = new HashSet<>();
    long size(String path) {
        long s = 0;
        for (var e : files.entrySet()) if (e.getKey().startsWith(path)) s += e.getValue().length();  // "/doc" matches "/docs"!
        return s;
    }
}`
    },
    mcq: { q: 'Directory contains Files and Directories. What structure models "any depth" cleanly?', options: ['Directory has List&lt;File&gt; and List&lt;List&lt;File&gt;&gt;', 'abstract Entry; File extends Entry; Directory extends Entry and ◆ 0..* Entry children', 'One class Node with a boolean isFile and a String content for everything', 'A Map from path to content only'], answer: 1, explain: 'A recursive composition: Directory owns children of the common supertype Entry, which can themselves be directories. Polymorphic size() then recurses naturally (the Composite pattern you will meet later).' },
    hints: [
      `<p>Hint 1: both files and directories have a name and a size, and a directory holds "things that are either". That common supertype is <code>abstract class Entry</code>.</p>`,
      `<p>Hint 2: <code>Directory ◆ 0..* Entry</code> as a <code>TreeMap&lt;String, Entry&gt;</code> (sorted ls for free). <code>File.size()</code> = content length; <code>Directory.size()</code> = sum of children's size() (polymorphic recursion).</p>`,
      `<p>Hint 3: a FileSystem facade splits paths and walks from root; <code>mkdir</code> creates missing directories; <code>rm</code> = parent.children.remove(name) (composition: the whole subtree goes with it).</p>`
    ],
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
        System.out.println(fs.ls("/docs"));     // [java, plan.txt]
        System.out.println(fs.size("/docs"));   // 12
        fs.rm("/docs/java");
        System.out.println(fs.size("/docs"));   // 8
    }
}`,
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
    { q: 'In a sequence diagram, what does an <code>alt</code> fragment with two compartments map to in Java?', options: ['A for loop', 'An if/else', 'A try/finally', 'A new thread'], answer: 1, explain: 'alt = alternatives (if/else or switch), opt = an if without else, loop = for/while, par = parallel execution.' },
    { q: 'Why is <code>Penguin extends Bird</code> wrong when <code>Bird</code> declares <code>fly()</code>?', options: ['Penguins are not animals', 'It violates the Liskov Substitution Principle: a Penguin cannot honour Bird\'s fly() contract', 'Java forbids it', 'It makes the class too small'], answer: 1, explain: 'Any code that loops over Birds and calls fly() breaks for penguins. Move flying to a Flyable interface implemented only by birds that fly.' },
    { q: 'Which is an <b>invariant</b> best enforced inside the owning class?', options: ['The UI font size', 'An account balance never goes below zero', 'The database host name', 'The log file path'], answer: 1, explain: 'Invariants are facts about an object\'s state that must always hold. Keeping the field private and checking inside withdraw() makes violation impossible.' },
    { q: 'Order lines reference Product but also store <code>unitPricePaise</code>. Why?', options: ['Duplicate data is always good', 'To freeze the price paid; later product price changes must not rewrite the order', 'Because Product cannot be referenced', 'To make Product immutable'], answer: 1, explain: 'An order is a historical record. Snapshotting the price at purchase time keeps totals correct after catalogue changes.' },
    { q: 'Two classes keep references to each other (Student ↔ Course). What is the main risk?', options: ['Slower compilation', 'The two sides can become inconsistent unless one method updates both', 'Java does not allow cycles', 'Garbage collection stops working'], answer: 1, explain: 'Bidirectional associations double the update points. Use one entry point (student.enroll(course)) that updates both sides, or make the link one-way.' }
  );

  /* =========================== INTERVIEW =========================== */
  interview.push(
    { level: 'B', q: 'What is the difference between a class and an object? Give an everyday example.', a: `<p>A <b>class</b> is a blueprint written once in code: it declares what state (fields) and behaviour (methods) its instances will have. An <b>object</b> is one concrete instance created at runtime with <code>new</code>, with its own state and identity. Cookie cutter vs cookies: one <code>Dog</code> class, many dog objects, each with its own name and age. Variables hold <b>references</b> to objects, so two variables can point to the same object, which is why changing it through one is visible through the other.</p>`, followUps: ['What is object identity and how does == differ from equals()?', 'Where do objects live in memory and when are they garbage collected?'] },
    { level: 'B', q: 'Explain association, aggregation and composition with examples. How do you decide between them?', a: `<p>All three are "has-a" links. <b>Association</b>: a long-lived reference between independent objects (Doctor ↔ Patient). <b>Aggregation</b>: a whole groups parts that can exist alone and be shared (Team ◇ Player). <b>Composition</b>: the whole creates, exclusively owns and destroys its parts (House ◆ Room, Order ◆ OrderLine). I decide with the life test: can the part exist without the whole? Can it belong to two wholes at once? Who creates it? If the part dies with the whole and is never shared, composition; otherwise aggregation or plain association. In Java, composition means the part is created inside and never leaked; aggregation usually arrives through the constructor or an add method.</p>`, followUps: ['How does composition map to database foreign keys?', 'Is aggregation worth distinguishing from association in practice?'] },
    { level: 'B', q: 'What are the four pillars of OOP, in one sentence each?', a: `<p><b>Encapsulation</b>: keep state private and change it only through methods that protect the rules. <b>Abstraction</b>: expose what an object does and hide how (a <code>PaymentMethod.pay()</code> hides card vs UPI details). <b>Inheritance</b>: a subclass is a kind of its parent and reuses its contract and code. <b>Polymorphism</b>: one call site runs different implementations depending on the runtime object, removing type switches. In design interviews encapsulation and polymorphism carry most of the weight; inheritance is used sparingly.</p>`, followUps: ['Give an example where inheritance hurts.', 'Is a getter for every field still encapsulation?'] },
    { level: 'I', q: 'How do you identify classes from a requirements paragraph?', a: `<p>First I clarify scope with the interviewer. Then I do a noun-verb pass: nouns are candidate classes or attributes, verbs candidate methods. I filter nouns: things with their own state, behaviour and identity become classes; single values become attributes; fixed option sets become enums; values with rules but no identity become records; synonyms are merged; vague words like "system" are dropped; a link with its own data (loan, booking, enrollment) becomes its own class. I give each verb to the class that has the data (Information Expert), and finally I trace one real use case through the classes to find gaps. I say my reasons out loud for every drop or merge.</p>`, followUps: ['How do you avoid creating a god class like LibrarySystem?', 'When does an actor (Driver, User) become a class?'] },
    { level: 'I', q: 'Abstract class vs interface in modern Java: when do you use each?', a: `<p>An <b>interface</b> describes a capability or contract; a class can implement many, and interfaces can carry <code>default</code>, <code>static</code> and <code>private</code> methods but no instance state. An <b>abstract class</b> is a partial implementation with shared state and constructors; a class can extend only one. I use interfaces at variation points (PaymentMethod, NotificationChannel, PricingPolicy) and for capabilities across unrelated classes (Flyable). I use an abstract class when subclasses truly share state and an algorithm skeleton (CardPayment with number/expiry validation). Often both: interface for clients, abstract base for shared implementation. For a closed set of variants, a <code>sealed</code> interface with records is a modern option.</p>`, followUps: ['What happens if two interfaces provide the same default method?', 'When would you choose a sealed interface?'] },
    { level: 'I', q: 'What does "favour composition over inheritance" mean? Give an example.', a: `<p>Inheritance couples the child to the parent's implementation and fixes the type at compile time. Composition gets reuse by holding another object and delegating to it, which keeps classes loosely coupled and lets behaviour change at runtime. Example: payroll with Salaried, Hourly and Commissioned employees who can also be managers. Inheritance explodes into SalariedManager, HourlyManager and so on, and a promotion requires a new object. With composition, Employee holds a <code>PayPolicy</code> and an optional <code>ManagerRole</code>: P + R classes instead of P × R, and <code>changePolicy()</code> keeps the same identity. I still use inheritance for genuine, stable "kind-of" hierarchies.</p>`, followUps: ['What is the fragile base class problem?', 'How does this relate to the Strategy pattern?'] },
    { level: 'I', q: 'Walk me through drawing a class diagram in an interview. How much detail do you include?', a: `<p>I draw boxes with names first, then relationship lines with diamonds/triangles and multiplicities, then key attributes (ids, statuses, money) and use-case methods, then interfaces where variation was mentioned and enums for fixed sets. I skip getters/setters and constructors. 6–10 classes is typical in 45 minutes, and I budget about 10 minutes for the diagram so most time goes to code. I verify it by tracing the main use case. I mention that in a real repo I would keep it as PlantUML/Mermaid text next to the code so it does not rot.</p>`, followUps: ['What notation mistakes do people commonly make?', 'Domain model vs design model: what is the difference?'] },
    { level: 'I', q: 'What is a sequence diagram for, and how does it map to code?', a: `<p>It shows the behaviour of one use case over time: lifelines are participating objects, solid arrows are synchronous method calls, dashed arrows are returns, open-headed arrows are async messages, and fragments (<code>alt</code>, <code>opt</code>, <code>loop</code>, <code>par</code>) are if/else, if, loops and parallel work. Each arrow into a lifeline must be a method on that class, so drawing it validates the class diagram: missing methods or arrows landing on classes without the needed data reveal design gaps. It also exposes god classes (one lifeline with arrows to everyone) and train wrecks (long chains of getters).</p>`, followUps: ['How do you show an asynchronous email send?', 'What would you draw for a payment failure after inventory was reserved?'] },
    { level: 'A', q: 'How do you keep a bidirectional association consistent? When would you avoid it?', a: `<p>I give the relationship a single entry point that updates both sides, for example <code>student.enroll(course)</code> adds the course to the student and calls a package-private <code>course.addInternal(student)</code>; removal mirrors it. Collections are never exposed mutably. I avoid two-way links unless a real use case navigates both directions often, because they double the update points, couple both classes, and create cycles that break naive <code>toString</code>, <code>equals</code>, <code>hashCode</code> and JSON serialisation. A reverse lookup can instead come from a repository query or an index maintained by a coordinator.</p>`, followUps: ['How do JPA mappedBy and owning sides relate to this?', 'What happens to equals/hashCode with cyclic references?'] },
    { level: 'A', q: 'What is the Liskov Substitution Principle? Show a violation and the fix.', a: `<p>LSP says objects of a subtype must be usable anywhere the parent type is expected without breaking correctness: no stronger preconditions, no weaker postconditions, invariants preserved. Violation: <code>Square extends Rectangle</code> where <code>setWidth</code> also changes height; code that sets width 5 and height 4 expects area 20 but gets 16. Another: <code>Penguin extends Bird</code> with <code>fly()</code> throwing. Fixes: model squares and rectangles as separate immutable shapes implementing a <code>Shape</code> interface, and move flying into a <code>Flyable</code> capability interface. The test is behavioural, not taxonomic: "is-a" in biology does not guarantee substitutability in code.</p>`, followUps: ['How do throws clauses and return types relate to LSP in Java?', 'Can an immutable Square extend an immutable Rectangle safely?'] },
    { level: 'A', q: 'Entity vs value object: how do you model each in Java?', a: `<p>An <b>entity</b> has identity that persists through state changes (Customer #42 changing address is still #42); I give it an id, mutable state guarded by methods, and equals/hashCode based on id (or identity). A <b>value object</b> is defined only by its values and is immutable (Money, DateRange, Address); I use a <code>record</code>, validate in the compact constructor, and share instances freely, including as map keys. Values make code safer (no aliasing bugs), thread-safe by default, and push small rules (like <code>DateRange.overlaps</code>) to tiny, testable types instead of services.</p>`, followUps: ['Why is double a bad type for money?', 'How do value objects reduce primitive obsession?'] },
    { level: 'E', q: 'An interviewer adds a late twist: "now support seasonal pricing and multiple hotels". How do you show your model is extensible?', a: `<p>I point to the seams I created on purpose. Pricing was announced as variable, so it sits behind a <code>PricingPolicy</code> interface; seasonal pricing is one new class injected into Hotel, with no edits to booking logic (Open/Closed). Multiple hotels means a new <code>HotelChain ◆ 1..* Hotel</code> composition above the existing model; Hotel's internals do not change. I also say what I would <i>not</i> do: no speculative factories or plugin frameworks for changes nobody mentioned (YAGNI). Then I sketch the diff: which classes are added, which are untouched, and which tests prove the old behaviour still works.</p>`, followUps: ['How do you decide which variation points to create upfront?', 'What if the twist breaks a core assumption (bookings by the hour)?'] },
    { level: 'E', q: 'You are given an AI-generated design for a library system. What do you check first?', a: `<p>I read it back into a class diagram and compare it with the requirement. First checks: is there a god class or anemic model (data classes + one giant service)? Are Book and BookCopy separated? Are statuses enums and money not double? Do getters leak mutable collections (breaking composition)? Are rules owned by the information expert (loan limit in Member, fine in Loan)? Are relationships one-way unless needed? Are invariants validated in constructors? Is the check-then-act in checkout atomic? Did it add features we scoped out? Then I write a few tests for the riskiest rules. The AI saves typing; ownership and lifecycle decisions are still mine to verify.</p>`, followUps: ['What prompt would you write to get a better first draft?', 'How would you catch architectural drift over time (ArchUnit, diagrams-as-code)?'] }
  );

  registerModule({
    id: 'lld01',
    title: 'OOP Modelling & UML',
    intro: `<p>Every Low-Level Design interview starts the same way: a paragraph of English and the words "design the classes". This module teaches the skill underneath every LLD question: <b>thinking in objects</b>. You will learn to read a requirement like a detective (noun-verb analysis), decide which nouns become classes, attributes, enums or value objects, and choose the right link between them: <b>association, aggregation, composition, dependency, inheritance, realisation</b>, each with a lifecycle test you can say out loud.</p>
<p>Then you will speak the industry's shared drawing language: <b>UML class diagrams</b> (boxes, visibility, the six arrows, multiplicities) and <b>sequence diagrams</b> (lifelines, sync/async messages, alt/loop fragments). Every visualizer builds diagrams step by step, and several are editable: type your own requirement or relationship list and watch the diagram and the Java skeleton appear.</p>
<p>Finally you will put it all together in the <b>requirement → diagram → sequence → compilable Java</b> workflow used in machine-coding rounds, practising on libraries, shops, universities, cab booking, restaurants, movie tickets and file systems. Every solution starts with the naive god-class design and explains exactly why it fails.</p>`,
    goals: [
      'Turn a requirements paragraph into a filtered list of classes, attributes, enums and value objects, with a spoken reason for every decision',
      'Choose between association, aggregation, composition and dependency using the lifecycle test, and write the matching Java shape',
      'Decide when inheritance is honest (is-a, LSP) and when to use interfaces or composition instead',
      'Read and draw UML class diagrams with correct visibility, arrows and multiplicities, and translate them to and from Java',
      'Draw a sequence diagram for a use case (including alt/loop and async messages) and implement it as cooperating classes',
      'Produce a compilable, extensible Java skeleton in an interview time budget and explain where future changes will land'
    ],
    prereqs: `Java track: Classes, Objects &amp; Constructors; OOP Pillars in Java; equals &amp; hashCode; Collections Framework (Java modules 3–7). Comfort with records and enums helps. No design-pattern knowledge needed: this is the first LLD module.`,
    hours: 14,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
