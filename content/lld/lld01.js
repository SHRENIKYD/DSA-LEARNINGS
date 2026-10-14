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
  var SLOTS = [[50, 8], [17, 32], [83, 32], [50, 56], [17, 56], [83, 56], [17, 8], [83, 8], [50, 32]];

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
    var pos = {};
    names.forEach(function (n, i) { pos[n] = SLOTS[i].slice(); });
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
      var A = cls[x.a], many = /\*|n|\.\.[2-9]/.test(x.mult), fld = x.b.charAt(0).toLowerCase() + x.b.slice(1);
      if (x.r.kind === 'inheritance') A.ext = x.b;
      else if (x.r.kind === 'realization') A.impl.push(x.b);
      else if (x.r.kind === 'composition') A.body.push(many ? '    private final List<' + x.b + '> ' + fld + 's = new ArrayList<>(); // owned: created inside, never handed out' : '    private final ' + x.b + ' ' + fld + ' = new ' + x.b + '(); // owned: born and dies with ' + x.a);
      else if (x.r.kind === 'aggregation') A.body.push(many ? '    private final List<' + x.b + '> ' + fld + 's = new ArrayList<>(); // shared parts, added from outside' : '    private ' + x.b + ' ' + fld + '; // set from outside, may outlive ' + x.a);
      else if (x.r.kind === 'dependency') A.body.push('    void use(' + x.b + ' ' + fld + ') { /* uses it briefly, keeps no field */ }');
      else { A.body.push(many ? '    private final List<' + x.b + '> ' + fld + 's = new ArrayList<>(); // association' : '    private ' + x.b + ' ' + fld + '; // association (reference)'); if (x.r.op === '--') cls[x.b].body.push('    private ' + x.a + ' ' + x.a.charAt(0).toLowerCase() + x.a.slice(1) + '; // back-reference (two-way link)'); }
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
    return uml(title || 'UML class diagram', 64, steps);
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
    var pos = {};
    names.forEach(function (n, i) { pos[n] = SLOTS[i].slice(); });
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
      if (f.kind === 'has') { model[f.s].attrs.push('List<' + f.o + '> ' + low + 's'); lab = 'has-a 0..*'; narr = '"' + hesc(f.s + ' ' + f.v + ' ' + f.o) + '" is a <b>has-a</b> phrase, so ' + hesc(f.s) + ' gets a <b>field</b> holding ' + hesc(f.o) + ' objects, not a method.'; }
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
    return uml('Class diagram built from the requirement', 64, steps);
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

  registerModule({ id: 'lld01', title: 'OOP Modelling & UML', intro: `<p>temp intro temp intro temp intro temp intro temp intro temp intro temp intro temp intro temp intro temp intro temp intro temp intro</p>`, goals: ['aaaaaaaaaaaa', 'bbbbbbbbbbbbb', 'cccccccccccc'], prereqs: `Java basics module xx`, hours: 10, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
