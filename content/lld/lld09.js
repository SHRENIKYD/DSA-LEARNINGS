(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- tiny helpers shared by all visualizers ---------- */
  // a box node (states, classes, components)
  function B(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  // a directed diagram part; edge [u, v, label]
  function G(label, nodes, edges, o) {
    o = o || {};
    return { type: 'graph', label: label, directed: o.undirected ? false : true, height: o.h || 60, nodes: nodes, edges: edges, hl: o.hl || {}, ehl: o.ehl || {}, tags: o.tags || {} };
  }
  function CODE(label, code, hl, alt) { var p = { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; if (alt) p.alt = alt; return p; }
  var RIDE_REQUESTED_PY = [
    "class Requested(RideState):",
    "    def assign(self, r, d): r.transition_to(Assigned(d))",
    "    def cancel(self, r): r.charge(0); r.transition_to(Cancelled())",
    "    # arrive/start/end -> default: r.reject(..)"
  ].join('\n');
  var RIDE_REQUESTED_TS = [
    "class Requested implements RideState {",
    "  assign(r: Ride, d: string): void { r.transitionTo(new Assigned(d)); }",
    "  cancel(r: Ride): void { r.charge(0); r.transitionTo(new Cancelled()); }",
    "  // arrive/start/end -> default: r.reject(..)",
    "}"
  ].join('\n');
  var RIDE_REQUESTED_CPP = [
    "struct Requested : RideState {",
    "  void assign(Ride& r, const string& d) override { r.transitionTo(make_unique<Assigned>(d)); }",
    "  void cancel(Ride& r) override { r.charge(0); r.transitionTo(make_unique<Cancelled>()); }",
    "  // arrive/start/end -> default: r.reject(..)",
    "};"
  ].join('\n');
  var RIDE_ASSIGNED_PY = [
    "class Assigned(RideState):",
    "    def arrive(self, r): r.transition_to(Arrived(self.driver))",
    "    def cancel(self, r): r.charge(25); r.transition_to(Cancelled())",
    "    # assign/start/end -> default: r.reject(..)"
  ].join('\n');
  var RIDE_ASSIGNED_TS = [
    "class Assigned implements RideState {",
    "  arrive(r: Ride): void { r.transitionTo(new Arrived(this.driver)); }",
    "  cancel(r: Ride): void { r.charge(25); r.transitionTo(new Cancelled()); }",
    "  // assign/start/end -> default: r.reject(..)",
    "}"
  ].join('\n');
  var RIDE_ASSIGNED_CPP = [
    "struct Assigned : RideState {",
    "  void arrive(Ride& r) override { r.transitionTo(make_unique<Arrived>(driver)); }",
    "  void cancel(Ride& r) override { r.charge(25); r.transitionTo(make_unique<Cancelled>()); }",
    "  // assign/start/end -> default: r.reject(..)",
    "};"
  ].join('\n');
  var RIDE_ARRIVED_PY = [
    "class Arrived(RideState):",
    "    def start(self, r):  r.transition_to(InTrip())",
    "    def cancel(self, r): r.charge(50); r.transition_to(Cancelled())",
    "    # assign/arrive/end -> default: r.reject(..)"
  ].join('\n');
  var RIDE_ARRIVED_TS = [
    "class Arrived implements RideState {",
    "  start(r: Ride): void  { r.transitionTo(new InTrip()); }",
    "  cancel(r: Ride): void { r.charge(50); r.transitionTo(new Cancelled()); }",
    "  // assign/arrive/end -> default: r.reject(..)",
    "}"
  ].join('\n');
  var RIDE_ARRIVED_CPP = [
    "struct Arrived : RideState {",
    "  void start(Ride& r) override  { r.transitionTo(make_unique<InTrip>()); }",
    "  void cancel(Ride& r) override { r.charge(50); r.transitionTo(make_unique<Cancelled>()); }",
    "  // assign/arrive/end -> default: r.reject(..)",
    "};"
  ].join('\n');
  var RIDE_INTRIP_PY = [
    "class InTrip(RideState):",
    "    def end(self, r, fare): r.transition_to(Completed(fare))",
    "    # cancel NOT overridden -> rejected mid-ride",
    "    # assign/arrive/start -> default: r.reject(..)"
  ].join('\n');
  var RIDE_INTRIP_TS = [
    "class InTrip implements RideState {",
    "  end(r: Ride, fare: number): void { r.transitionTo(new Completed(fare)); }",
    "  // cancel NOT overridden -> rejected mid-ride",
    "  // assign/arrive/start -> default: r.reject(..)",
    "}"
  ].join('\n');
  var RIDE_INTRIP_CPP = [
    "struct InTrip : RideState {",
    "  void end(Ride& r, int fare) override { r.transitionTo(make_unique<Completed>(fare)); }",
    "  // cancel NOT overridden -> rejected mid-ride",
    "  // assign/arrive/start -> default: r.reject(..)",
    "};"
  ].join('\n');
  var RIDE_COMPLETED_PY = [
    "class Completed(RideState):",
    "    # terminal: overrides nothing",
    "    # every event -> default: r.reject(..)",
    "    pass"
  ].join('\n');
  var RIDE_COMPLETED_TS = [
    "class Completed implements RideState {",
    "  // terminal: overrides nothing",
    "  // every event -> default: r.reject(..)",
    "}"
  ].join('\n');
  var RIDE_COMPLETED_CPP = [
    "struct Completed : RideState {",
    "  // terminal: overrides nothing",
    "  // every event -> default: r.reject(..)",
    "};"
  ].join('\n');
  var RIDE_CANCELLED_PY = [
    "class Cancelled(RideState):",
    "    # terminal: overrides nothing",
    "    # every event -> default: r.reject(..)",
    "    pass"
  ].join('\n');
  var RIDE_CANCELLED_TS = [
    "class Cancelled implements RideState {",
    "  // terminal: overrides nothing",
    "  // every event -> default: r.reject(..)",
    "}"
  ].join('\n');
  var RIDE_CANCELLED_CPP = [
    "struct Cancelled : RideState {",
    "  // terminal: overrides nothing",
    "  // every event -> default: r.reject(..)",
    "};"
  ].join('\n');
  var RIDE_ALT = {
    Requested: { python: { code: RIDE_REQUESTED_PY }, js: { lang: 'ts', code: RIDE_REQUESTED_TS }, cpp: { code: RIDE_REQUESTED_CPP } },
    Assigned: { python: { code: RIDE_ASSIGNED_PY }, js: { lang: 'ts', code: RIDE_ASSIGNED_TS }, cpp: { code: RIDE_ASSIGNED_CPP } },
    Arrived: { python: { code: RIDE_ARRIVED_PY }, js: { lang: 'ts', code: RIDE_ARRIVED_TS }, cpp: { code: RIDE_ARRIVED_CPP } },
    InTrip: { python: { code: RIDE_INTRIP_PY }, js: { lang: 'ts', code: RIDE_INTRIP_TS }, cpp: { code: RIDE_INTRIP_CPP } },
    Completed: { python: { code: RIDE_COMPLETED_PY }, js: { lang: 'ts', code: RIDE_COMPLETED_TS }, cpp: { code: RIDE_COMPLETED_CPP } },
    Cancelled: { python: { code: RIDE_CANCELLED_PY }, js: { lang: 'ts', code: RIDE_CANCELLED_TS }, cpp: { code: RIDE_CANCELLED_CPP } }
  };
  var LADDER_PY = [
    "def handle(self, event):",
    "    if self.state == REQUESTED:",
    "        if event == \"assign\": self.state = ASSIGNED",
    "        elif event == \"cancel\": self.fee = 0; self.state = CANCELLED",
    "        else: self.reject(event)",
    "    elif self.state == ASSIGNED:",
    "        if event == \"arrive\": self.state = ARRIVED",
    "        elif event == \"cancel\": self.fee = 25; self.state = CANCELLED",
    "        else: self.reject(event)",
    "    elif self.state == ARRIVED:",
    "        if event == \"start\": self.state = IN_TRIP",
    "        elif event == \"cancel\": self.fee = 50; self.state = CANCELLED",
    "        else: self.reject(event)",
    "    elif self.state == IN_TRIP:",
    "        if event == \"end\": self.state = COMPLETED",
    "        else: self.reject(event)",
    "    else:",
    "        self.reject(event)  # COMPLETED or CANCELLED"
  ].join('\n');
  var LADDER_TS = [
    "handle(event: string): void {",
    "  if (this.state === REQUESTED) {",
    "    if (event === \"assign\") this.state = ASSIGNED;",
    "    else if (event === \"cancel\") { this.fee = 0; this.state = CANCELLED; }",
    "    else this.reject(event);",
    "  } else if (this.state === ASSIGNED) {",
    "    if (event === \"arrive\") this.state = ARRIVED;",
    "    else if (event === \"cancel\") { this.fee = 25; this.state = CANCELLED; }",
    "    else this.reject(event);",
    "  } else if (this.state === ARRIVED) {",
    "    if (event === \"start\") this.state = IN_TRIP;",
    "    else if (event === \"cancel\") { this.fee = 50; this.state = CANCELLED; }",
    "    else this.reject(event);",
    "  } else if (this.state === IN_TRIP) {",
    "    if (event === \"end\") this.state = COMPLETED;",
    "    else this.reject(event);",
    "  } else {",
    "    this.reject(event); // COMPLETED or CANCELLED",
    "  }",
    "}"
  ].join('\n');
  var LADDER_CPP = [
    "void handle(const string& event) {",
    "  if (state == REQUESTED) {",
    "    if (event == \"assign\") state = ASSIGNED;",
    "    else if (event == \"cancel\") { fee = 0; state = CANCELLED; }",
    "    else reject(event);",
    "  } else if (state == ASSIGNED) {",
    "    if (event == \"arrive\") state = ARRIVED;",
    "    else if (event == \"cancel\") { fee = 25; state = CANCELLED; }",
    "    else reject(event);",
    "  } else if (state == ARRIVED) {",
    "    if (event == \"start\") state = IN_TRIP;",
    "    else if (event == \"cancel\") { fee = 50; state = CANCELLED; }",
    "    else reject(event);",
    "  } else if (state == IN_TRIP) {",
    "    if (event == \"end\") state = COMPLETED;",
    "    else reject(event);",
    "  } else {",
    "    reject(event); // COMPLETED or CANCELLED",
    "  }",
    "}"
  ].join('\n');
  var LADDER_ALT = { python: { code: LADDER_PY, map: {} }, js: { lang: 'ts', code: LADDER_TS, map: {} }, cpp: { code: LADDER_CPP, map: {} } };
  var UNSAFE_PY = [
    "def buy(self):",
    "    if self.stock > 0:        # check",
    "        self.stock = self.stock - 1    # act",
    "        return True",
    "    return False"
  ].join('\n');
  var UNSAFE_TS = [
    "buy(): boolean {   // shared by worker threads (or interleaved at an await)",
    "  if (this.stock > 0) {        // check",
    "    this.stock = this.stock - 1;    // act",
    "    return true;",
    "  }",
    "  return false;",
    "}"
  ].join('\n');
  var UNSAFE_CPP = [
    "bool buy() {",
    "  if (stock > 0) {        // check",
    "    stock = stock - 1;    // act",
    "    return true;",
    "  }",
    "  return false;",
    "}"
  ].join('\n');
  var UNSAFE_ALT = { python: { code: UNSAFE_PY, map: {} }, js: { lang: 'ts', code: UNSAFE_TS, map: {} }, cpp: { code: UNSAFE_CPP, map: {} } };
  var LOCK_PY = [
    "def buy(self):",
    "    with self.lock:                    # one thread at a time",
    "        if self.stock > 0:",
    "            self.stock = self.stock - 1",
    "            return True",
    "        return False"
  ].join('\n');
  var LOCK_TS = [
    "async buy(): Promise<boolean> {",
    "  const release = await this.mutex.acquire();   // one caller at a time",
    "  try {",
    "    if (this.stock > 0) {",
    "      this.stock = this.stock - 1;",
    "      return true;",
    "    }",
    "    return false;",
    "  } finally { release(); }",
    "}"
  ].join('\n');
  var LOCK_CPP = [
    "bool buy() {",
    "  lock_guard<mutex> guard(m);   // one thread at a time",
    "  if (stock > 0) {",
    "    stock = stock - 1;",
    "    return true;",
    "  }",
    "  return false;",
    "}"
  ].join('\n');
  var LOCK_ALT = { python: { code: LOCK_PY, map: {"1":2,"2":3,"3":4} }, js: { lang: 'ts', code: LOCK_TS, map: {"1":2,"2":4,"3":5,"6":8} }, cpp: { code: LOCK_CPP, map: {"1":2,"2":3,"3":4,"6":7} } };
  var CAS_PY = [
    "def buy(self):",
    "    cur = self.ref.get()",
    "    if cur.stock == 0: return False",
    "    nxt = Slot(cur.state, cur.stock - 1, cur.version + 1)",
    "    return self.ref.compare_and_set(cur, nxt) or self.buy()  # lost? retry"
  ].join('\n');
  var CAS_TS = [
    "buy(): boolean {",
    "  const cur = this.ref.get();",
    "  if (cur.stock === 0) return false;",
    "  const next = new Slot(cur.state, cur.stock - 1, cur.version + 1);",
    "  return this.ref.compareAndSet(cur, next) || this.buy(); // lost? retry",
    "}"
  ].join('\n');
  var CAS_CPP = [
    "bool buy() {",
    "  auto cur = ref.load();",
    "  if (cur->stock == 0) return false;",
    "  auto next = make_shared<Slot>(cur->state, cur->stock - 1, cur->version + 1);",
    "  return ref.compare_exchange_strong(cur, next) || buy(); // lost? retry",
    "}"
  ].join('\n');
  var CAS_ALT = { python: { code: CAS_PY, map: {} }, js: { lang: 'ts', code: CAS_TS, map: {} }, cpp: { code: CAS_CPP, map: {} } };
  function TXT(html, label) { var p = { type: 'text', html: html }; if (label) p.label = label; return p; }
  function VARS(label, vals, hl) { return { type: 'vars', label: label, vals: vals, hl: hl || {} }; }
  function QUEUE(label, items, hl, front, back) { return { type: 'queue', label: label, items: items.slice(), hl: hl || {}, frontLabel: front || 'front', backLabel: back || 'back' }; }
  function MAP(label, entries, hl) { return { type: 'map', label: label, entries: entries.map(function (e) { return [e[0], e[1]]; }), hl: hl || {} }; }
  function TABLE(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns, rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }; }
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function one(k, v) { var o = {}; o[k] = v; return o; }
  // split "a, b c;d" into trimmed tokens, with size cap and a friendly error
  function tokens(input, sep, max, hint) {
    var t = String(input === undefined ? '' : input).split(sep).map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
    if (!t.length) throw new Error(hint);
    if (t.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return t;
  }
  // parse "key=value; key=value" into an object (lower-case keys)
  function kvParse(input, hint) {
    var o = {};
    String(input === undefined ? '' : input).split(';').forEach(function (part) {
      var p = part.split('=');
      if (p.length === 2 && p[0].trim()) o[p[0].trim().toLowerCase()] = p[1].trim();
    });
    if (!Object.keys(o).length) throw new Error(hint);
    return o;
  }
  // a state-machine graph: nodes = boxes, cur = current state id, edgeKey/edgeCls = transition being taken
  function SM(label, nodes, edges, cur, curCls, edgeKey, edgeCls, tags, h) {
    var hl = {}, ehl = {};
    if (cur) hl[cur] = curCls || 'cur';
    if (edgeKey) ehl[edgeKey] = edgeCls || 'ok';
    return G(label, nodes, edges, { hl: hl, ehl: ehl, tags: tags || {}, h: h || 60 });
  }

  /* ======================= TOPIC 1: STATE PATTERN DEEP DIVE ======================= */
  // Ride (cab trip) lifecycle used by the topic-1 visualizers
  var RIDE_NODES = [B('REQUESTED', 'REQUESTED', 10, 12), B('ASSIGNED', 'ASSIGNED', 36, 12), B('ARRIVED', 'ARRIVED', 62, 12), B('IN_TRIP', 'IN_TRIP', 88, 12), B('COMPLETED', 'COMPLETED', 88, 50), B('CANCELLED', 'CANCELLED', 36, 50)];
  var RIDE_EDGES = [['REQUESTED', 'ASSIGNED', 'assign'], ['ASSIGNED', 'ARRIVED', 'arrive'], ['ARRIVED', 'IN_TRIP', 'start'], ['IN_TRIP', 'COMPLETED', 'end'], ['REQUESTED', 'CANCELLED', 'cancel ₹0'], ['ASSIGNED', 'CANCELLED', 'cancel ₹25'], ['ARRIVED', 'CANCELLED', 'cancel ₹50']];
  var RIDE_STATES = ['REQUESTED', 'ASSIGNED', 'ARRIVED', 'IN_TRIP', 'COMPLETED', 'CANCELLED'];
  var RIDE_EVENTS = ['assign', 'arrive', 'start', 'end', 'cancel'];
  var RIDE_T = {
    REQUESTED: { assign: 'ASSIGNED', cancel: 'CANCELLED' },
    ASSIGNED: { arrive: 'ARRIVED', cancel: 'CANCELLED' },
    ARRIVED: { start: 'IN_TRIP', cancel: 'CANCELLED' },
    IN_TRIP: { end: 'COMPLETED' },
    COMPLETED: {}, CANCELLED: {}
  };
  var RIDE_FEE = { REQUESTED: 0, ASSIGNED: 25, ARRIVED: 50 };
  var RIDE_CLASS = { REQUESTED: 'Requested', ASSIGNED: 'Assigned', ARRIVED: 'Arrived', IN_TRIP: 'InTrip', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
  function rideGrid(cur, ev, ok) {
    var rows = RIDE_STATES.map(function (s) { return RIDE_EVENTS.map(function (e) { return RIDE_T[s][e] || '—'; }); });
    var hl = {};
    if (cur && ev) hl[RIDE_STATES.indexOf(cur) + ',' + RIDE_EVENTS.indexOf(ev)] = ok ? 'ok' : 'bad';
    return { type: 'grid', label: 'Transition table (row = current state, column = event)', rows: rows, rowHead: RIDE_STATES, colHead: RIDE_EVENTS, hl: hl };
  }
  function rideCode(cls, ev) {
    var body = {
      Requested: 'class Requested implements RideState {\n  public void assign(Ride r, String d) { r.transitionTo(new Assigned(d)); }\n  public void cancel(Ride r) { r.charge(0); r.transitionTo(new Cancelled()); }\n  // arrive/start/end -> default: r.reject(..)\n}',
      Assigned: 'class Assigned implements RideState {\n  public void arrive(Ride r) { r.transitionTo(new Arrived(driver)); }\n  public void cancel(Ride r) { r.charge(25); r.transitionTo(new Cancelled()); }\n  // assign/start/end -> default: r.reject(..)\n}',
      Arrived: 'class Arrived implements RideState {\n  public void start(Ride r)  { r.transitionTo(new InTrip()); }\n  public void cancel(Ride r) { r.charge(50); r.transitionTo(new Cancelled()); }\n  // assign/arrive/end -> default: r.reject(..)\n}',
      InTrip: 'class InTrip implements RideState {\n  public void end(Ride r, int fare) { r.transitionTo(new Completed(fare)); }\n  // cancel NOT overridden -> rejected mid-ride\n  // assign/arrive/start -> default: r.reject(..)\n}',
      Completed: 'class Completed implements RideState {\n  // terminal: overrides nothing\n  // every event -> default: r.reject(..)\n}',
      Cancelled: 'class Cancelled implements RideState {\n  // terminal: overrides nothing\n  // every event -> default: r.reject(..)\n}'
    }[cls];
    var lines = body.split('\n'), hl = {};
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('void ' + ev) >= 0) hl[i + 1] = 'ok';
    }
    if (!Object.keys(hl).length) hl[lines.length - 1] = 'bad';
    return CODE('Method that runs: ' + cls + '.' + ev + '()', body, hl, RIDE_ALT[cls]);
  }

  topics.push({
    title: 'State Pattern Deep Dive: From if/else Soup to State Objects',
    analogy: `<p>Think of a <b>cab ride on Uber or Ola</b>. You press the same <b>Cancel</b> button at different moments. Before a driver is found, cancel is <b>free</b>. After a driver is assigned, it costs a little. After the driver has reached your gate, it costs more. Once you are inside the car, the app does not even allow it. Same button, four different behaviours — and the only thing that changed is <b>which stage (state) the ride is in</b>.</p><p>Or think of a <b>traffic policeman</b> who wears a different cap for each shift. Whatever cap he wears decides how he reacts to the same honk. The State pattern is exactly that: <b>swap the cap (state object), and the behaviour changes by itself.</b></p>`,
    explain: `<p><b>The idea in one line:</b> when an object behaves differently depending on what "mode" it is in, put each mode's behaviour in its <b>own class</b>, and let the object hold a reference to the <b>current mode object</b>. Every request is simply passed to that object.</p>
${H.table(['Role', 'Plain meaning', 'Cab-ride example'], [
  ['<b>Context</b>', 'The thing the outside world talks to. Holds data + the current state.', '<code>Ride</code> (has <code>cancel()</code>, <code>startTrip()</code>…)'],
  ['<b>State interface</b>', 'One method per <b>event</b> (button / message) the object can receive.', '<code>RideState</code>: <code>assign</code>, <code>arrive</code>, <code>start</code>, <code>end</code>, <code>cancel</code>'],
  ['<b>Concrete states</b>', 'One class per mode. Each answers every event its own way.', '<code>Requested</code>, <code>Assigned</code>, <code>Arrived</code>, <code>InTrip</code>, <code>Completed</code>, <code>Cancelled</code>'],
  ['<b>Transition</b>', 'Moving from one state to the next because of an event.', '<code>Arrived</code> + <i>start</i> → <code>InTrip</code>']
])}
<p><b>The brute-force way (and why it breaks):</b> one big method with <code>if (state == REQUESTED) { if (event == …) … } else if (state == ASSIGNED) { … }</code>. With <b>S</b> states and <b>E</b> events you get up to <b>S × E</b> branches in one place. Six states × five events = 30 branches. Now product says "add a NO_SHOW state". You must open that giant method, read all 30 branches and edit several of them — and nothing tells you if you forgot one. ${H.c('r', 'Every new state touches every event handler.')}</p>
<p><b>With State objects:</b> adding NO_SHOW = ${H.c('g', 'one new class + one changed line in the state that leads to it')}. Each class is tiny, readable and testable by itself. The "is this event allowed here?" question is answered by <b>which methods the class overrides</b>; everything else falls to a default "reject" method.</p>
${H.table(['State \\ Event', 'assign', 'arrive', 'start', 'end', 'cancel'], [
  ['REQUESTED', H.c('g', 'ASSIGNED'), '—', '—', '—', H.c('g', 'CANCELLED (₹0)')],
  ['ASSIGNED', '—', H.c('g', 'ARRIVED'), '—', '—', H.c('y', 'CANCELLED (₹25)')],
  ['ARRIVED', '—', '—', H.c('g', 'IN_TRIP'), '—', H.c('r', 'CANCELLED (₹50)')],
  ['IN_TRIP', '—', '—', '—', H.c('g', 'COMPLETED'), H.c('r', 'rejected')],
  ['COMPLETED / CANCELLED', '—', '—', '—', '—', '—']
])}
<p>This <b>state × event table</b> is the first thing to draw in any state-heavy interview (elevator, vending machine, ATM). A "—" means "not allowed here". Each <b>row</b> becomes one State class; each <b>column</b> becomes one method on the State interface.</p>
<p><b>Three ways to code a state machine</b> (you should know all three):</p>
<ul>
<li><b>Enum + transition table</b> — best when states only decide "what is next", with little behaviour.</li>
<li><b>State classes (GoF State pattern)</b> — best when each state has real behaviour (charging fees, starting meters, opening doors, dispensing cash).</li>
<li><b>Closed set of immutable states + exhaustive match</b> — a pure function <code>next(state, event)</code>; the compiler checks you handled every state (Java sealed interface + records, Python dataclasses + <code>match</code>, TypeScript discriminated union, C++ <code>std::variant</code>).</li>
</ul>`,
    clues: [
      '"The same button/request behaves differently depending on the current status" → State pattern.',
      'Requirement lists <b>statuses</b> (IDLE, MOVING, DOORS_OPEN / HAS_MONEY / CARD_INSERTED…) and says some actions are only allowed in some of them → draw a state × event table first.',
      '"We will add new states later (maintenance, out-of-service, no-show)" → you need Open/Closed: one class per state.',
      'You notice the same <code>switch(status)</code> repeated in 4+ methods → classic smell; replace with State objects.',
      '"Invalid operations must be rejected with a clear message" (e.g. dispense before payment) → default-reject methods on the State interface.',
      'Words like <b>lifecycle, workflow, status transitions, machine, mode</b> in an LLD prompt.'
    ],
    code: [{ lang: 'java', title: 'Classic GoF State: cab ride with per-state behaviour', code: `import java.util.*;

/** Context: the outside world only talks to Ride. Ride owns data; the state object owns behaviour. */
class Ride {
    private RideState state = new Requested();
    private int cancellationFee = 0;
    private final List<String> log = new ArrayList<>();

    // Public API = events. Each one is a one-line delegation to the current state.
    void assignDriver(String driver) { state.assign(this, driver); }
    void driverArrived()             { state.arrive(this); }
    void startTrip()                 { state.start(this); }
    void endTrip(int fare)           { state.end(this, fare); }
    void cancel()                    { state.cancel(this); }

    // Hooks the state objects use. Only states call these.
    void transitionTo(RideState next) {
        log.add(state.name() + " -> " + next.name());
        state.onExit(this);          // exit action of the old state
        state = next;
        next.onEnter(this);          // entry action of the new state
    }
    void reject(String event) { log.add("REJECTED '" + event + "' in " + state.name()); }
    void charge(int fee)      { cancellationFee = fee; }
    String stateName()        { return state.name(); }
    int fee()                 { return cancellationFee; }
    List<String> log()        { return log; }
}

/** One method per event. Defaults reject, so each state overrides ONLY what it allows. */
interface RideState {
    String name();
    default void onEnter(Ride r) {}
    default void onExit(Ride r) {}
    default void assign(Ride r, String driver) { r.reject("assign"); }
    default void arrive(Ride r)                { r.reject("arrive"); }
    default void start(Ride r)                 { r.reject("start"); }
    default void end(Ride r, int fare)         { r.reject("end"); }
    default void cancel(Ride r)                { r.reject("cancel"); }
}

final class Requested implements RideState {
    public String name() { return "REQUESTED"; }
    public void assign(Ride r, String driver) { r.transitionTo(new Assigned(driver)); }
    public void cancel(Ride r) { r.charge(0); r.transitionTo(new Cancelled()); }      // free
}

final class Assigned implements RideState {
    private final String driver;                  // state-specific data lives in the state
    Assigned(String driver) { this.driver = driver; }
    public String name() { return "ASSIGNED(" + driver + ")"; }
    public void arrive(Ride r) { r.transitionTo(new Arrived(driver)); }
    public void cancel(Ride r) { r.charge(25); r.transitionTo(new Cancelled()); }     // small fee
}

final class Arrived implements RideState {
    private final String driver;
    Arrived(String driver) { this.driver = driver; }
    public String name() { return "ARRIVED(" + driver + ")"; }
    public void start(Ride r)  { r.transitionTo(new InTrip()); }
    public void cancel(Ride r) { r.charge(50); r.transitionTo(new Cancelled()); }     // driver waited
}

final class InTrip implements RideState {
    public String name() { return "IN_TRIP"; }
    public void onEnter(Ride r) { /* start the fare meter here */ }
    public void end(Ride r, int fare) { r.transitionTo(new Completed(fare)); }
    // cancel() is NOT overridden -> default rejects it: no cancelling mid-ride
}

final class Completed implements RideState {
    private final int fare;
    Completed(int fare) { this.fare = fare; }
    public String name() { return "COMPLETED(Rs " + fare + ")"; }
}

final class Cancelled implements RideState {
    public String name() { return "CANCELLED"; }
}

class RideDemo {
    public static void main(String[] args) {
        Ride ride = new Ride();
        ride.startTrip();              // rejected: no driver yet
        ride.assignDriver("Asha");
        ride.driverArrived();
        ride.startTrip();
        ride.cancel();                 // rejected: cannot cancel mid-trip
        ride.endTrip(240);
        ride.log().forEach(System.out::println);
        System.out.println("final state = " + ride.stateName() + ", fee = " + ride.fee());
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class Ride:
    """Context: the outside world only talks to Ride. Ride owns data; the state object owns behaviour."""

    def __init__(self) -> None:
        self._state: "RideState" = Requested()
        self._cancellation_fee = 0
        self._log: list[str] = []

    # Public API = events. Each one is a one-line delegation to the current state.
    def assign_driver(self, driver: str) -> None: self._state.assign(self, driver)
    def driver_arrived(self) -> None: self._state.arrive(self)
    def start_trip(self) -> None: self._state.start(self)
    def end_trip(self, fare: int) -> None: self._state.end(self, fare)
    def cancel(self) -> None: self._state.cancel(self)

    # Hooks the state objects use. Only states call these.
    def transition_to(self, nxt: "RideState") -> None:
        self._log.append(f"{self._state.name()} -> {nxt.name()}")
        self._state.on_exit(self)  # exit action of the old state
        self._state = nxt
        nxt.on_enter(self)  # entry action of the new state

    def reject(self, event: str) -> None:
        self._log.append(f"REJECTED '{event}' in {self._state.name()}")

    def charge(self, fee: int) -> None: self._cancellation_fee = fee
    def state_name(self) -> str: return self._state.name()
    def fee(self) -> int: return self._cancellation_fee
    def log(self) -> list[str]: return self._log


class RideState(ABC):
    """One method per event. Defaults reject, so each state overrides ONLY what it allows."""

    @abstractmethod
    def name(self) -> str: ...

    def on_enter(self, r: Ride) -> None: pass
    def on_exit(self, r: Ride) -> None: pass
    def assign(self, r: Ride, driver: str) -> None: r.reject("assign")
    def arrive(self, r: Ride) -> None: r.reject("arrive")
    def start(self, r: Ride) -> None: r.reject("start")
    def end(self, r: Ride, fare: int) -> None: r.reject("end")
    def cancel(self, r: Ride) -> None: r.reject("cancel")


class Requested(RideState):
    def name(self) -> str: return "REQUESTED"
    def assign(self, r: Ride, driver: str) -> None: r.transition_to(Assigned(driver))

    def cancel(self, r: Ride) -> None:  # free
        r.charge(0)
        r.transition_to(Cancelled())


class Assigned(RideState):
    def __init__(self, driver: str) -> None:
        self._driver = driver  # state-specific data lives in the state

    def name(self) -> str: return f"ASSIGNED({self._driver})"
    def arrive(self, r: Ride) -> None: r.transition_to(Arrived(self._driver))

    def cancel(self, r: Ride) -> None:  # small fee
        r.charge(25)
        r.transition_to(Cancelled())


class Arrived(RideState):
    def __init__(self, driver: str) -> None:
        self._driver = driver

    def name(self) -> str: return f"ARRIVED({self._driver})"
    def start(self, r: Ride) -> None: r.transition_to(InTrip())

    def cancel(self, r: Ride) -> None:  # driver waited
        r.charge(50)
        r.transition_to(Cancelled())


class InTrip(RideState):
    def name(self) -> str: return "IN_TRIP"
    def on_enter(self, r: Ride) -> None: pass  # start the fare meter here
    def end(self, r: Ride, fare: int) -> None: r.transition_to(Completed(fare))
    # cancel() is NOT overridden -> default rejects it: no cancelling mid-ride


class Completed(RideState):
    def __init__(self, fare: int) -> None:
        self._fare = fare

    def name(self) -> str: return f"COMPLETED(Rs {self._fare})"


class Cancelled(RideState):
    def name(self) -> str: return "CANCELLED"


if __name__ == "__main__":
    ride = Ride()
    ride.start_trip()  # rejected: no driver yet
    ride.assign_driver("Asha")
    ride.driver_arrived()
    ride.start_trip()
    ride.cancel()  # rejected: cannot cancel mid-trip
    ride.end_trip(240)
    for line in ride.log():
        print(line)
    print(f"final state = {ride.state_name()}, fee = {ride.fee()}")` },
          { lang: 'ts', code: `/** Context: the outside world only talks to Ride. Ride owns data; the state object owns behaviour. */
class Ride {
  private state: RideState = new Requested();
  private cancellationFee = 0;
  private readonly entries: string[] = [];

  // Public API = events. Each one is a one-line delegation to the current state.
  assignDriver(driver: string): void { this.state.assign(this, driver); }
  driverArrived(): void { this.state.arrive(this); }
  startTrip(): void { this.state.start(this); }
  endTrip(fare: number): void { this.state.end(this, fare); }
  cancel(): void { this.state.cancel(this); }

  // Hooks the state objects use. Only states call these.
  transitionTo(next: RideState): void {
    this.entries.push(\`\${this.state.name()} -> \${next.name()}\`);
    this.state.onExit(this); // exit action of the old state
    this.state = next;
    next.onEnter(this); // entry action of the new state
  }
  reject(event: string): void { this.entries.push(\`REJECTED '\${event}' in \${this.state.name()}\`); }
  charge(fee: number): void { this.cancellationFee = fee; }
  stateName(): string { return this.state.name(); }
  fee(): number { return this.cancellationFee; }
  log(): readonly string[] { return this.entries; }
}

/** One method per event. Defaults reject, so each state overrides ONLY what it allows. */
interface RideState {
  name(): string;
  onEnter(r: Ride): void;
  onExit(r: Ride): void;
  assign(r: Ride, driver: string): void;
  arrive(r: Ride): void;
  start(r: Ride): void;
  end(r: Ride, fare: number): void;
  cancel(r: Ride): void;
}

// Interfaces carry no code in TypeScript, so the defaults live in a base class.
abstract class BaseRideState implements RideState {
  abstract name(): string;
  onEnter(r: Ride): void {}
  onExit(r: Ride): void {}
  assign(r: Ride, driver: string): void { r.reject("assign"); }
  arrive(r: Ride): void { r.reject("arrive"); }
  start(r: Ride): void { r.reject("start"); }
  end(r: Ride, fare: number): void { r.reject("end"); }
  cancel(r: Ride): void { r.reject("cancel"); }
}

class Requested extends BaseRideState {
  name(): string { return "REQUESTED"; }
  override assign(r: Ride, driver: string): void { r.transitionTo(new Assigned(driver)); }
  override cancel(r: Ride): void { r.charge(0); r.transitionTo(new Cancelled()); } // free
}

class Assigned extends BaseRideState {
  constructor(private readonly driver: string) { super(); } // state-specific data lives in the state
  name(): string { return \`ASSIGNED(\${this.driver})\`; }
  override arrive(r: Ride): void { r.transitionTo(new Arrived(this.driver)); }
  override cancel(r: Ride): void { r.charge(25); r.transitionTo(new Cancelled()); } // small fee
}

class Arrived extends BaseRideState {
  constructor(private readonly driver: string) { super(); }
  name(): string { return \`ARRIVED(\${this.driver})\`; }
  override start(r: Ride): void { r.transitionTo(new InTrip()); }
  override cancel(r: Ride): void { r.charge(50); r.transitionTo(new Cancelled()); } // driver waited
}

class InTrip extends BaseRideState {
  name(): string { return "IN_TRIP"; }
  override onEnter(r: Ride): void { /* start the fare meter here */ }
  override end(r: Ride, fare: number): void { r.transitionTo(new Completed(fare)); }
  // cancel() is NOT overridden -> default rejects it: no cancelling mid-ride
}

class Completed extends BaseRideState {
  constructor(private readonly fare: number) { super(); }
  name(): string { return \`COMPLETED(Rs \${this.fare})\`; }
}

class Cancelled extends BaseRideState {
  name(): string { return "CANCELLED"; }
}

const ride = new Ride();
ride.startTrip(); // rejected: no driver yet
ride.assignDriver("Asha");
ride.driverArrived();
ride.startTrip();
ride.cancel(); // rejected: cannot cancel mid-trip
ride.endTrip(240);
ride.log().forEach((line) => console.log(line));
console.log(\`final state = \${ride.stateName()}, fee = \${ride.fee()}\`);` },
          { lang: 'cpp', code: `class Ride;

// One method per event. Defaults reject, so each state overrides ONLY what it allows.
struct RideState {
    virtual ~RideState() = default;
    virtual string name() const = 0;
    virtual void onEnter(Ride&) const {}
    virtual void onExit(Ride&) const {}
    virtual void assign(Ride& r, const string& driver) const;
    virtual void arrive(Ride& r) const;
    virtual void start(Ride& r) const;
    virtual void end(Ride& r, int fare) const;
    virtual void cancel(Ride& r) const;
};

// Context: the outside world only talks to Ride. Ride owns data and the current state object.
class Ride {
    unique_ptr<RideState> state_;
    int cancellationFee_ = 0;
    vector<string> log_;

public:
    Ride();

    // Public API = events. Each one is a one-line delegation to the current state.
    void assignDriver(const string& driver) { state_->assign(*this, driver); }
    void driverArrived() { state_->arrive(*this); }
    void startTrip() { state_->start(*this); }
    void endTrip(int fare) { state_->end(*this, fare); }
    void cancel() { state_->cancel(*this); }

    // Hooks the state objects use. Only states call these. The old state is destroyed here,
    // so a state method must not touch its own members after calling transitionTo.
    void transitionTo(unique_ptr<RideState> next) {
        log_.push_back(state_->name() + " -> " + next->name());
        state_->onExit(*this);  // exit action of the old state
        state_ = move(next);
        state_->onEnter(*this);  // entry action of the new state
    }
    void reject(const string& event) { log_.push_back("REJECTED '" + event + "' in " + state_->name()); }
    void charge(int fee) { cancellationFee_ = fee; }
    string stateName() const { return state_->name(); }
    int fee() const { return cancellationFee_; }
    const vector<string>& log() const { return log_; }
};

void RideState::assign(Ride& r, const string&) const { r.reject("assign"); }
void RideState::arrive(Ride& r) const { r.reject("arrive"); }
void RideState::start(Ride& r) const { r.reject("start"); }
void RideState::end(Ride& r, int) const { r.reject("end"); }
void RideState::cancel(Ride& r) const { r.reject("cancel"); }

struct Cancelled final : RideState {
    string name() const override { return "CANCELLED"; }
};
struct Completed final : RideState {
    explicit Completed(int fare) : fare_(fare) {}
    string name() const override { return "COMPLETED(Rs " + to_string(fare_) + ")"; }

private:
    int fare_;
};
struct InTrip final : RideState {
    string name() const override { return "IN_TRIP"; }
    void onEnter(Ride&) const override {}  // start the fare meter here
    void end(Ride& r, int fare) const override { r.transitionTo(make_unique<Completed>(fare)); }
    // cancel() is NOT overridden -> default rejects it: no cancelling mid-ride
};
struct Arrived final : RideState {
    explicit Arrived(string driver) : driver_(move(driver)) {}
    string name() const override { return "ARRIVED(" + driver_ + ")"; }
    void start(Ride& r) const override { r.transitionTo(make_unique<InTrip>()); }
    void cancel(Ride& r) const override { r.charge(50); r.transitionTo(make_unique<Cancelled>()); }  // driver waited

private:
    string driver_;
};
struct Assigned final : RideState {
    explicit Assigned(string driver) : driver_(move(driver)) {}  // state-specific data lives in the state
    string name() const override { return "ASSIGNED(" + driver_ + ")"; }
    void arrive(Ride& r) const override { r.transitionTo(make_unique<Arrived>(driver_)); }
    void cancel(Ride& r) const override { r.charge(25); r.transitionTo(make_unique<Cancelled>()); }  // small fee

private:
    string driver_;
};
struct Requested final : RideState {
    string name() const override { return "REQUESTED"; }
    void assign(Ride& r, const string& driver) const override { r.transitionTo(make_unique<Assigned>(driver)); }
    void cancel(Ride& r) const override { r.charge(0); r.transitionTo(make_unique<Cancelled>()); }  // free
};

Ride::Ride() : state_(make_unique<Requested>()) {}

int main() {
    Ride ride;
    ride.startTrip();  // rejected: no driver yet
    ride.assignDriver("Asha");
    ride.driverArrived();
    ride.startTrip();
    ride.cancel();  // rejected: cannot cancel mid-trip
    ride.endTrip(240);
    for (const auto& line : ride.log()) cout << line << "\\n";
    cout << "final state = " << ride.stateName() << ", fee = " << ride.fee() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

/// Context: the outside world only talks to Ride. Ride owns data; the state object owns behaviour.
class Ride {
    private RideState state = new Requested();
    private int cancellationFee = 0;
    private readonly List<string> log = new List<string>();

    // Public API = events. Each one is a one-line delegation to the current state.
    public void AssignDriver(string driver) { state.Assign(this, driver); }
    public void DriverArrived()             { state.Arrive(this); }
    public void StartTrip()                 { state.Start(this); }
    public void EndTrip(int fare)           { state.End(this, fare); }
    public void Cancel()                    { state.Cancel(this); }

    // Hooks the state objects use. Only states call these.
    public void TransitionTo(RideState next) {
        log.Add(state.Name() + " -> " + next.Name());
        state.OnExit(this);          // exit action of the old state
        state = next;
        next.OnEnter(this);          // entry action of the new state
    }
    public void Reject(string ev)   { log.Add("REJECTED '" + ev + "' in " + state.Name()); }
    public void Charge(int fee)     { cancellationFee = fee; }
    public string StateName()       { return state.Name(); }
    public int Fee()                { return cancellationFee; }
    public List<string> Log()       { return log; }
}

/// One method per event. Defaults reject, so each state overrides ONLY what it allows.
abstract class RideState {
    public abstract string Name();
    public virtual void OnEnter(Ride r) {}
    public virtual void OnExit(Ride r) {}
    public virtual void Assign(Ride r, string driver) { r.Reject("assign"); }
    public virtual void Arrive(Ride r)                { r.Reject("arrive"); }
    public virtual void Start(Ride r)                 { r.Reject("start"); }
    public virtual void End(Ride r, int fare)         { r.Reject("end"); }
    public virtual void Cancel(Ride r)                { r.Reject("cancel"); }
}

sealed class Requested : RideState {
    public override string Name() { return "REQUESTED"; }
    public override void Assign(Ride r, string driver) { r.TransitionTo(new Assigned(driver)); }
    public override void Cancel(Ride r) { r.Charge(0); r.TransitionTo(new Cancelled()); }      // free
}

sealed class Assigned : RideState {
    private readonly string driver;               // state-specific data lives in the state
    public Assigned(string driver) { this.driver = driver; }
    public override string Name() { return "ASSIGNED(" + driver + ")"; }
    public override void Arrive(Ride r) { r.TransitionTo(new Arrived(driver)); }
    public override void Cancel(Ride r) { r.Charge(25); r.TransitionTo(new Cancelled()); }     // small fee
}

sealed class Arrived : RideState {
    private readonly string driver;
    public Arrived(string driver) { this.driver = driver; }
    public override string Name() { return "ARRIVED(" + driver + ")"; }
    public override void Start(Ride r)  { r.TransitionTo(new InTrip()); }
    public override void Cancel(Ride r) { r.Charge(50); r.TransitionTo(new Cancelled()); }     // driver waited
}

sealed class InTrip : RideState {
    public override string Name() { return "IN_TRIP"; }
    public override void OnEnter(Ride r) { /* start the fare meter here */ }
    public override void End(Ride r, int fare) { r.TransitionTo(new Completed(fare)); }
    // Cancel() is NOT overridden -> default rejects it: no cancelling mid-ride
}

sealed class Completed : RideState {
    private readonly int fare;
    public Completed(int fare) { this.fare = fare; }
    public override string Name() { return "COMPLETED(Rs " + fare + ")"; }
}

sealed class Cancelled : RideState {
    public override string Name() { return "CANCELLED"; }
}

class Program {
    static void Main() {
        Ride ride = new Ride();
        ride.StartTrip();              // rejected: no driver yet
        ride.AssignDriver("Asha");
        ride.DriverArrived();
        ride.StartTrip();
        ride.Cancel();                 // rejected: cannot cancel mid-trip
        ride.EndTrip(240);
        foreach (string line in ride.Log()) Console.WriteLine(line);
        Console.WriteLine("final state = " + ride.StateName() + ", fee = " + ride.Fee());
    }
}` }
        ] }, { lang: 'java', title: 'Enum + EnumMap transition table (when states carry little behaviour)', code: `import java.util.*;

enum TripState { REQUESTED, ASSIGNED, ARRIVED, IN_TRIP, COMPLETED, CANCELLED }
enum TripEvent { ASSIGN, ARRIVE, START, END, CANCEL }

class TripMachine {
    // The whole machine is DATA: row = state, column = event, cell = next state.
    private static final Map<TripState, Map<TripEvent, TripState>> TABLE = new EnumMap<>(TripState.class);
    static {
        for (TripState s : TripState.values()) TABLE.put(s, new EnumMap<>(TripEvent.class));
        add(TripState.REQUESTED, TripEvent.ASSIGN, TripState.ASSIGNED);
        add(TripState.REQUESTED, TripEvent.CANCEL, TripState.CANCELLED);
        add(TripState.ASSIGNED,  TripEvent.ARRIVE, TripState.ARRIVED);
        add(TripState.ASSIGNED,  TripEvent.CANCEL, TripState.CANCELLED);
        add(TripState.ARRIVED,   TripEvent.START,  TripState.IN_TRIP);
        add(TripState.ARRIVED,   TripEvent.CANCEL, TripState.CANCELLED);
        add(TripState.IN_TRIP,   TripEvent.END,    TripState.COMPLETED);
    }
    private static void add(TripState from, TripEvent on, TripState to) { TABLE.get(from).put(on, to); }

    private TripState state = TripState.REQUESTED;

    /** Returns true if the event was accepted. Unknown cell = rejected, state unchanged. */
    boolean fire(TripEvent e) {
        TripState next = TABLE.get(state).get(e);
        if (next == null) return false;
        state = next;
        return true;
    }
    TripState state() { return state; }

    public static void main(String[] args) {
        TripMachine m = new TripMachine();
        for (TripEvent e : List.of(TripEvent.START, TripEvent.ASSIGN, TripEvent.ARRIVE, TripEvent.START, TripEvent.CANCEL, TripEvent.END)) {
            boolean ok = m.fire(e);
            System.out.println(e + (ok ? " accepted -> " : " rejected, still ") + m.state());
        }
    }
}`, alt: [
          { lang: 'python', code: `from enum import Enum


class TripState(Enum):
    REQUESTED = 1
    ASSIGNED = 2
    ARRIVED = 3
    IN_TRIP = 4
    COMPLETED = 5
    CANCELLED = 6


class TripEvent(Enum):
    ASSIGN = 1
    ARRIVE = 2
    START = 3
    END = 4
    CANCEL = 5


S, E = TripState, TripEvent

# The whole machine is DATA: row = state, column = event, cell = next state.
TABLE: dict[TripState, dict[TripEvent, TripState]] = {
    S.REQUESTED: {E.ASSIGN: S.ASSIGNED, E.CANCEL: S.CANCELLED},
    S.ASSIGNED: {E.ARRIVE: S.ARRIVED, E.CANCEL: S.CANCELLED},
    S.ARRIVED: {E.START: S.IN_TRIP, E.CANCEL: S.CANCELLED},
    S.IN_TRIP: {E.END: S.COMPLETED},
    S.COMPLETED: {},
    S.CANCELLED: {},
}


class TripMachine:
    def __init__(self) -> None:
        self._state = TripState.REQUESTED

    def fire(self, e: TripEvent) -> bool:
        """Returns True if the event was accepted. Unknown cell = rejected, state unchanged."""
        nxt = TABLE[self._state].get(e)
        if nxt is None:
            return False
        self._state = nxt
        return True

    @property
    def state(self) -> TripState:
        return self._state


if __name__ == "__main__":
    m = TripMachine()
    for e in [E.START, E.ASSIGN, E.ARRIVE, E.START, E.CANCEL, E.END]:
        ok = m.fire(e)
        print(e.name + (" accepted -> " if ok else " rejected, still ") + m.state.name)` },
          { lang: 'ts', code: `type TripState = "REQUESTED" | "ASSIGNED" | "ARRIVED" | "IN_TRIP" | "COMPLETED" | "CANCELLED";
type TripEvent = "ASSIGN" | "ARRIVE" | "START" | "END" | "CANCEL";

// The whole machine is DATA: row = state, column = event, cell = next state.
const TABLE: Record<TripState, Partial<Record<TripEvent, TripState>>> = {
  REQUESTED: { ASSIGN: "ASSIGNED", CANCEL: "CANCELLED" },
  ASSIGNED: { ARRIVE: "ARRIVED", CANCEL: "CANCELLED" },
  ARRIVED: { START: "IN_TRIP", CANCEL: "CANCELLED" },
  IN_TRIP: { END: "COMPLETED" },
  COMPLETED: {},
  CANCELLED: {},
};

class TripMachine {
  private current: TripState = "REQUESTED";

  /** Returns true if the event was accepted. Unknown cell = rejected, state unchanged. */
  fire(e: TripEvent): boolean {
    const next = TABLE[this.current][e];
    if (next === undefined) return false;
    this.current = next;
    return true;
  }
  state(): TripState { return this.current; }
}

const m = new TripMachine();
const events: TripEvent[] = ["START", "ASSIGN", "ARRIVE", "START", "CANCEL", "END"];
for (const e of events) {
  const ok = m.fire(e);
  console.log(e + (ok ? " accepted -> " : " rejected, still ") + m.state());
}` },
          { lang: 'cpp', code: `enum class TripState { REQUESTED, ASSIGNED, ARRIVED, IN_TRIP, COMPLETED, CANCELLED };
enum class TripEvent { ASSIGN, ARRIVE, START, END, CANCEL };

const char* name(TripState s) {
    static const char* n[] = {"REQUESTED", "ASSIGNED", "ARRIVED", "IN_TRIP", "COMPLETED", "CANCELLED"};
    return n[static_cast<int>(s)];
}
const char* name(TripEvent e) {
    static const char* n[] = {"ASSIGN", "ARRIVE", "START", "END", "CANCEL"};
    return n[static_cast<int>(e)];
}

class TripMachine {
    using S = TripState;
    using E = TripEvent;
    // The whole machine is DATA: (state, event) -> next state.
    inline static const map<pair<S, E>, S> TABLE = {
        {{S::REQUESTED, E::ASSIGN}, S::ASSIGNED}, {{S::REQUESTED, E::CANCEL}, S::CANCELLED},
        {{S::ASSIGNED, E::ARRIVE}, S::ARRIVED},   {{S::ASSIGNED, E::CANCEL}, S::CANCELLED},
        {{S::ARRIVED, E::START}, S::IN_TRIP},     {{S::ARRIVED, E::CANCEL}, S::CANCELLED},
        {{S::IN_TRIP, E::END}, S::COMPLETED},
    };
    TripState state_ = TripState::REQUESTED;

public:
    // Returns true if the event was accepted. Unknown cell = rejected, state unchanged.
    bool fire(TripEvent e) {
        auto it = TABLE.find({state_, e});
        if (it == TABLE.end()) return false;
        state_ = it->second;
        return true;
    }
    TripState state() const { return state_; }
};

int main() {
    TripMachine m;
    for (TripEvent e : {TripEvent::START, TripEvent::ASSIGN, TripEvent::ARRIVE, TripEvent::START, TripEvent::CANCEL, TripEvent::END}) {
        bool ok = m.fire(e);
        cout << name(e) << (ok ? " accepted -> " : " rejected, still ") << name(m.state()) << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

enum TripState { REQUESTED, ASSIGNED, ARRIVED, IN_TRIP, COMPLETED, CANCELLED }
enum TripEvent { ASSIGN, ARRIVE, START, END, CANCEL }

class TripMachine {
    // The whole machine is DATA: row = state, column = event, cell = next state.
    private static readonly Dictionary<TripState, Dictionary<TripEvent, TripState>> TABLE = new Dictionary<TripState, Dictionary<TripEvent, TripState>>();
    static TripMachine() {
        foreach (TripState s in Enum.GetValues(typeof(TripState))) TABLE[s] = new Dictionary<TripEvent, TripState>();
        Add(TripState.REQUESTED, TripEvent.ASSIGN, TripState.ASSIGNED);
        Add(TripState.REQUESTED, TripEvent.CANCEL, TripState.CANCELLED);
        Add(TripState.ASSIGNED,  TripEvent.ARRIVE, TripState.ARRIVED);
        Add(TripState.ASSIGNED,  TripEvent.CANCEL, TripState.CANCELLED);
        Add(TripState.ARRIVED,   TripEvent.START,  TripState.IN_TRIP);
        Add(TripState.ARRIVED,   TripEvent.CANCEL, TripState.CANCELLED);
        Add(TripState.IN_TRIP,   TripEvent.END,    TripState.COMPLETED);
    }
    private static void Add(TripState from, TripEvent on, TripState to) { TABLE[from][on] = to; }

    private TripState state = TripState.REQUESTED;

    /// Returns true if the event was accepted. Unknown cell = rejected, state unchanged.
    public bool Fire(TripEvent e) {
        TripState next;
        if (!TABLE[state].TryGetValue(e, out next)) return false;
        state = next;
        return true;
    }
    public TripState State() { return state; }

    static void Main() {
        TripMachine m = new TripMachine();
        foreach (TripEvent e in new[] { TripEvent.START, TripEvent.ASSIGN, TripEvent.ARRIVE, TripEvent.START, TripEvent.CANCEL, TripEvent.END }) {
            bool ok = m.Fire(e);
            Console.WriteLine(e + (ok ? " accepted -> " : " rejected, still ") + m.State());
        }
    }
}` }
        ] }, { lang: 'java', title: 'Java 21: sealed states + records + exhaustive pattern switch (pure function)', code: `import java.util.*;

sealed interface TripS permits Req, Asg, Arr, Run, Done, Cxl {}
record Req() implements TripS {}
record Asg(String driver) implements TripS {}
record Arr(String driver) implements TripS {}
record Run(String driver) implements TripS {}
record Done(String driver, int fare) implements TripS {}
record Cxl(int fee) implements TripS {}

class PureTrip {
    /** (state, event) -> next state. No mutation: easy to test, log, replay and persist. */
    static TripS next(TripS s, String event) {
        return switch (s) {                       // no default: compiler proves every state is handled
            case Req r -> switch (event) {
                case "assign" -> new Asg("Asha");
                case "cancel" -> new Cxl(0);
                default -> s;
            };
            case Asg a -> switch (event) {
                case "arrive" -> new Arr(a.driver());
                case "cancel" -> new Cxl(25);
                default -> s;
            };
            case Arr a -> switch (event) {
                case "start" -> new Run(a.driver());
                case "cancel" -> new Cxl(50);
                default -> s;
            };
            case Run t -> event.equals("end") ? new Done(t.driver(), 240) : s;
            case Done d -> s;                     // terminal
            case Cxl c -> s;                      // terminal
        };
    }

    public static void main(String[] args) {
        TripS s = new Req();
        for (String e : List.of("start", "assign", "arrive", "start", "cancel", "end")) {
            TripS n = next(s, e);
            System.out.println(e + ": " + s + " -> " + n + (n == s ? "  (ignored)" : ""));
            s = n;
        }
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Req: pass


@dataclass(frozen=True)
class Asg: driver: str


@dataclass(frozen=True)
class Arr: driver: str


@dataclass(frozen=True)
class Run: driver: str


@dataclass(frozen=True)
class Done:
    driver: str
    fare: int


@dataclass(frozen=True)
class Cxl: fee: int


TripS = Req | Asg | Arr | Run | Done | Cxl  # a closed set of states


def next_state(s: TripS, event: str) -> TripS:
    """(state, event) -> next state. No mutation: easy to test, log, replay and persist."""
    match s, event:
        case Req(), "assign": return Asg("Asha")
        case Req(), "cancel": return Cxl(0)
        case Asg(driver), "arrive": return Arr(driver)
        case Asg(), "cancel": return Cxl(25)
        case Arr(driver), "start": return Run(driver)
        case Arr(), "cancel": return Cxl(50)
        case Run(driver), "end": return Done(driver, 240)
        case _: return s  # unknown event, or a terminal state (Done, Cxl)


def show(s: TripS) -> str:
    """Same look as a Java record: Asg[driver=Asha]."""
    fields = ", ".join(f"{k}={v}" for k, v in vars(s).items())
    return f"{type(s).__name__}[{fields}]"


if __name__ == "__main__":
    s: TripS = Req()
    for e in ["start", "assign", "arrive", "start", "cancel", "end"]:
        n = next_state(s, e)
        print(f"{e}: {show(s)} -> {show(n)}" + ("  (ignored)" if n is s else ""))
        s = n` },
          { lang: 'ts', code: `// A discriminated union: the compiler checks that every state is handled.
type TripS =
  | { kind: "Req" }
  | { kind: "Asg"; driver: string }
  | { kind: "Arr"; driver: string }
  | { kind: "Run"; driver: string }
  | { kind: "Done"; driver: string; fare: number }
  | { kind: "Cxl"; fee: number };

/** (state, event) -> next state. No mutation: easy to test, log, replay and persist. */
function next(s: TripS, event: string): TripS {
  switch (s.kind) { // no default: the compiler proves every state is handled
    case "Req":
      if (event === "assign") return { kind: "Asg", driver: "Asha" };
      if (event === "cancel") return { kind: "Cxl", fee: 0 };
      return s;
    case "Asg":
      if (event === "arrive") return { kind: "Arr", driver: s.driver };
      if (event === "cancel") return { kind: "Cxl", fee: 25 };
      return s;
    case "Arr":
      if (event === "start") return { kind: "Run", driver: s.driver };
      if (event === "cancel") return { kind: "Cxl", fee: 50 };
      return s;
    case "Run":
      return event === "end" ? { kind: "Done", driver: s.driver, fare: 240 } : s;
    case "Done": return s; // terminal
    case "Cxl": return s; // terminal
  }
}

/** Same look as a Java record: Asg[driver=Asha]. */
function show(s: TripS): string {
  const { kind, ...fields } = s;
  return \`\${kind}[\${Object.entries(fields).map(([k, v]) => \`\${k}=\${v}\`).join(", ")}]\`;
}

let s: TripS = { kind: "Req" };
for (const e of ["start", "assign", "arrive", "start", "cancel", "end"]) {
  const n = next(s, e);
  console.log(\`\${e}: \${show(s)} -> \${show(n)}\` + (n === s ? "  (ignored)" : ""));
  s = n;
}` },
          { lang: 'cpp', code: `struct Req { bool operator==(const Req&) const = default; };
struct Asg { string driver; bool operator==(const Asg&) const = default; };
struct Arr { string driver; bool operator==(const Arr&) const = default; };
struct Run { string driver; bool operator==(const Run&) const = default; };
struct Done { string driver; int fare; bool operator==(const Done&) const = default; };
struct Cxl { int fee; bool operator==(const Cxl&) const = default; };

using TripS = variant<Req, Asg, Arr, Run, Done, Cxl>;  // a closed set of states

// (state, event) -> next state. No mutation: easy to test, log, replay and persist.
TripS next(const TripS& s, const string& event) {
    return visit([&](const auto& st) -> TripS {
        using T = decay_t<decltype(st)>;
        if constexpr (is_same_v<T, Req>) {
            if (event == "assign") return Asg{"Asha"};
            if (event == "cancel") return Cxl{0};
        } else if constexpr (is_same_v<T, Asg>) {
            if (event == "arrive") return Arr{st.driver};
            if (event == "cancel") return Cxl{25};
        } else if constexpr (is_same_v<T, Arr>) {
            if (event == "start") return Run{st.driver};
            if (event == "cancel") return Cxl{50};
        } else if constexpr (is_same_v<T, Run>) {
            if (event == "end") return Done{st.driver, 240};
        }
        return st;  // unknown event, or a terminal state (Done, Cxl)
    }, s);
}

// Same look as a Java record: Asg[driver=Asha].
string show(const TripS& s) {
    return visit([](const auto& st) -> string {
        using T = decay_t<decltype(st)>;
        if constexpr (is_same_v<T, Req>) return "Req[]";
        else if constexpr (is_same_v<T, Asg>) return "Asg[driver=" + st.driver + "]";
        else if constexpr (is_same_v<T, Arr>) return "Arr[driver=" + st.driver + "]";
        else if constexpr (is_same_v<T, Run>) return "Run[driver=" + st.driver + "]";
        else if constexpr (is_same_v<T, Done>) return "Done[driver=" + st.driver + ", fare=" + to_string(st.fare) + "]";
        else return "Cxl[fee=" + to_string(st.fee) + "]";
    }, s);
}

int main() {
    TripS s = Req{};
    for (const char* e : {"start", "assign", "arrive", "start", "cancel", "end"}) {
        TripS n = next(s, e);
        cout << e << ": " << show(s) << " -> " << show(n) << (n == s ? "  (ignored)" : "") << "\\n";
        s = n;
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

/// A closed set of immutable states: the private constructor means only the nested variants exist.
abstract class TripS {
    private TripS() { }
    public sealed class Req : TripS { public override string ToString() { return "Req[]"; } }
    public sealed class Asg : TripS { public readonly string Driver; public Asg(string d) { Driver = d; } public override string ToString() { return "Asg[driver=" + Driver + "]"; } }
    public sealed class Arr : TripS { public readonly string Driver; public Arr(string d) { Driver = d; } public override string ToString() { return "Arr[driver=" + Driver + "]"; } }
    public sealed class Run : TripS { public readonly string Driver; public Run(string d) { Driver = d; } public override string ToString() { return "Run[driver=" + Driver + "]"; } }
    public sealed class Done : TripS { public readonly string Driver; public readonly int Fare; public Done(string d, int f) { Driver = d; Fare = f; } public override string ToString() { return "Done[driver=" + Driver + ", fare=" + Fare + "]"; } }
    public sealed class Cxl : TripS { public readonly int Fee; public Cxl(int f) { Fee = f; } public override string ToString() { return "Cxl[fee=" + Fee + "]"; } }
}

static class PureTrip {
    /// (state, event) -> next state. No mutation: easy to test, log, replay and persist.
    public static TripS Next(TripS s, string ev) {
        if (s is TripS.Req) {
            if (ev == "assign") return new TripS.Asg("Asha");
            if (ev == "cancel") return new TripS.Cxl(0);
            return s;
        }
        if (s is TripS.Asg a) {
            if (ev == "arrive") return new TripS.Arr(a.Driver);
            if (ev == "cancel") return new TripS.Cxl(25);
            return s;
        }
        if (s is TripS.Arr r) {
            if (ev == "start") return new TripS.Run(r.Driver);
            if (ev == "cancel") return new TripS.Cxl(50);
            return s;
        }
        if (s is TripS.Run t) return ev == "end" ? new TripS.Done(t.Driver, 240) : s;
        return s;                                 // Done and Cxl are terminal
    }

    static void Main() {
        TripS s = new TripS.Req();
        foreach (string e in new[] { "start", "assign", "arrive", "start", "cancel", "end" }) {
            TripS n = Next(s, e);
            Console.WriteLine(e + ": " + s + " -> " + n + (n == s ? "  (ignored)" : ""));
            s = n;
        }
    }
}` }
        ] }],
    codeTitle: ['GoF State classes', 'Enum transition table', 'Sealed + pattern switch'],
    viz: [{
      title: 'Cab ride state machine: watch each event move (or bounce off) the current state',
      input: 'start, assign, arrive, start, cancel, end, cancel',
      inputLabel: 'Events (comma separated): assign, arrive, start, end, cancel',
      gen: function (input) {
        var evs = tokens(input, /[\s,]+/, 14, 'Example: start, assign, arrive, start, cancel, end').map(function (e) { return e.toLowerCase(); });
        evs.forEach(function (e) { if (RIDE_EVENTS.indexOf(e) < 0) throw new Error('Unknown event "' + e + '". Use: assign, arrive, start, end, cancel'); });
        var cur = 'REQUESTED', fee = 0, accepted = 0, rejected = 0, frames = [];
        frames.push(F('A rider taps <b>Book</b>. The <code>Ride</code> object is created in state <b>REQUESTED</b>. The ride itself has no if/else — it just forwards every event to the current state object (<code>Requested</code>).', [
          SM('Ride lifecycle (current state highlighted)', RIDE_NODES, RIDE_EDGES, cur, 'cur'),
          rideGrid(null, null, true),
          VARS('Ride context', { state: cur, stateObject: 'new Requested()', fee: '₹0' })
        ]));
        evs.forEach(function (ev, i) {
          var next = RIDE_T[cur][ev];
          var cls = RIDE_CLASS[cur];
          if (next) {
            var extra = '';
            if (ev === 'cancel') { fee = RIDE_FEE[cur]; extra = ' The <code>' + cls + '</code> class charges a cancellation fee of <b>₹' + fee + '</b> — the <i>same</i> cancel button costs a different amount in each state, and no if/else was needed.'; }
            accepted++;
            frames.push(F('Event ' + (i + 1) + ': <b>' + ev + '</b>. Ride calls <code>state.' + ev + '(this)</code>. The current object is <code>' + cls + '</code>, which <b>overrides</b> ' + ev + '(), so it calls <code>transitionTo(' + next + ')</code>. ' + esc(cur) + ' → <b>' + next + '</b>.' + extra, [
              SM('Ride lifecycle', RIDE_NODES, RIDE_EDGES, next, 'ok', cur + '-' + next, 'ok', one(cur, 'was here')),
              rideGrid(cur, ev, true),
              rideCode(cls, ev),
              VARS('Ride context', { state: next, lastEvent: ev, fee: '₹' + fee, accepted: accepted, rejected: rejected }, { state: 'ok' })
            ]));
            cur = next;
          } else {
            rejected++;
            var why = (cur === 'IN_TRIP' && ev === 'cancel') ? ' You cannot cancel while riding — the rider must end the trip (or use SOS).' : (cur === 'COMPLETED' || cur === 'CANCELLED') ? ' This is a <b>terminal</b> state: the ride is over, every event is rejected.' : ' The table cell is "—": that event makes no sense now.';
            frames.push(F('Event ' + (i + 1) + ': <b>' + ev + '</b>. <code>' + RIDE_CLASS[cur] + '</code> does <b>not</b> override ' + ev + '(), so the <b>default method</b> in <code>RideState</code> runs: <code>r.reject("' + ev + '")</code>. <span class="c-r">State stays ' + cur + '.</span>' + why, [
              SM('Ride lifecycle', RIDE_NODES, RIDE_EDGES, cur, 'bad', null, null, one(cur, 'rejected: ' + ev)),
              rideGrid(cur, ev, false),
              rideCode(RIDE_CLASS[cur], ev),
              VARS('Ride context', { state: cur, lastEvent: ev + ' (rejected)', fee: '₹' + fee, accepted: accepted, rejected: rejected }, { lastEvent: 'bad' })
            ]));
          }
        });
        frames.push(F('Done. <b>' + accepted + '</b> events accepted, <b>' + rejected + '</b> rejected. Notice: the Ride class never asked "what state am I in?". Each answer came from the object that represents the state. <b>Add-a-state test:</b> a NO_SHOW state would be one new class plus one new method in <code>Arrived</code> (a <i>timeout</i> event) — nothing else changes.', [
          SM('Final state', RIDE_NODES, RIDE_EDGES, cur, 'sel'),
          TABLE('Summary', ['Measure', 'Value'], [['final state', cur], ['accepted events', accepted], ['rejected events', rejected], ['fee charged', '₹' + fee]])
        ]));
        return frames;
      }
    }, {
      title: 'Brute force: the giant if/else ladder — count the checks, then try adding a state',
      input: 'assign, arrive, start, end',
      inputLabel: 'Events (comma separated)',
      gen: function (input) {
        var evs = tokens(input, /[\s,]+/, 10, 'Example: assign, arrive, start, end').map(function (e) { return e.toLowerCase(); });
        evs.forEach(function (e) { if (RIDE_EVENTS.indexOf(e) < 0) throw new Error('Unknown event "' + e + '". Use: assign, arrive, start, end, cancel'); });
        var code = 'void handle(String event) {\n  if (state == REQUESTED) {\n    if (event.equals("assign")) state = ASSIGNED;\n    else if (event.equals("cancel")) { fee = 0; state = CANCELLED; }\n    else reject(event);\n  } else if (state == ASSIGNED) {\n    if (event.equals("arrive")) state = ARRIVED;\n    else if (event.equals("cancel")) { fee = 25; state = CANCELLED; }\n    else reject(event);\n  } else if (state == ARRIVED) {\n    if (event.equals("start")) state = IN_TRIP;\n    else if (event.equals("cancel")) { fee = 50; state = CANCELLED; }\n    else reject(event);\n  } else if (state == IN_TRIP) {\n    if (event.equals("end")) state = COMPLETED;\n    else reject(event);\n  } else {\n    reject(event); // COMPLETED or CANCELLED\n  }\n}';
        // line numbers of the state check and its inner checks
        var blocks = { REQUESTED: { s: 2, inner: [[3, 'assign'], [4, 'cancel']], rej: 5 }, ASSIGNED: { s: 6, inner: [[7, 'arrive'], [8, 'cancel']], rej: 9 }, ARRIVED: { s: 10, inner: [[11, 'start'], [12, 'cancel']], rej: 13 }, IN_TRIP: { s: 14, inner: [[15, 'end']], rej: 16 } };
        var order = ['REQUESTED', 'ASSIGNED', 'ARRIVED', 'IN_TRIP'];
        var cur = 'REQUESTED', total = 0, frames = [];
        frames.push(F('This is the <b>brute-force</b> design: one <code>handle()</code> method that asks "which state am I in?" and then "which event is this?". It works for 6 states × 5 events, but every question is answered by walking the ladder from the top.', [CODE('Ride.handle() — the if/else ladder', code, {}, LADDER_ALT), VARS('cost so far', { state: cur, conditionsChecked: 0 })]));
        evs.forEach(function (ev) {
          var hl = {}, checks = 0, next = null;
          for (var k = 0; k < order.length && !next; k++) {
            var b = blocks[order[k]];
            checks++;
            if (order[k] !== cur) { hl[b.s] = 'done'; continue; }
            hl[b.s] = 'cur';
            for (var j = 0; j < b.inner.length; j++) {
              checks++;
              if (b.inner[j][1] === ev) { hl[b.inner[j][0]] = 'ok'; next = RIDE_T[cur][ev]; break; }
              hl[b.inner[j][0]] = 'done';
            }
            if (!next) { hl[b.rej] = 'bad'; next = cur; }
          }
          if (!next) { hl[17] = 'cur'; hl[18] = 'bad'; next = cur; checks++; }
          total += checks;
          frames.push(F('Event <b>' + ev + '</b> in ' + cur + ': the method checks <b>' + checks + '</b> conditions top-to-bottom (faded = skipped branches) before it finds the right line. ' + (next !== cur ? 'Moves to <b>' + next + '</b>.' : '<span class="c-r">Rejected.</span>') + ' With the State pattern this is <b>one</b> virtual call to the current state object.', [
            CODE('Ride.handle()', code, hl, LADDER_ALT),
            VARS('cost so far', { state: next, conditionsChecked: total, statePatternCalls: frames.length }, { conditionsChecked: 'cur' })
          ]));
          cur = next;
        });
        var addHl = {}; [2, 5, 6, 9, 10, 13, 14, 16, 17].forEach(function (l) { addHl[l] = 'bad'; });
        frames.push(F('<b>Now product asks for a NO_SHOW state</b> (driver waited 5 minutes, rider never came; charge ₹100). In the ladder you must add a new <code>else if (state == NO_SHOW)</code> block, add a <i>timeout</i> branch inside ARRIVED, re-check every <code>else reject</code> line (red), and re-test the whole method. One method, edited by everyone, merge conflicts every sprint. ' + H.c('r', 'That is why the ladder breaks: change is not local.'), [
          CODE('Lines you must read/edit to add NO_SHOW', code, addHl, LADDER_ALT),
          TABLE('Adding a state: ladder vs State pattern', ['', 'if/else ladder', 'State pattern'], [['files touched', '1 giant file', '1 new class + 1 method in Arrived'], ['branches to re-check', 'all S × E', 'only Arrived'], ['compiler help', 'none', 'interface forces method set'], ['merge conflicts', 'frequent', 'rare']])
        ]));
        frames.push(F('Rule of thumb: <b>2–3 states with no behaviour</b> → a small switch or enum table is fine. <b>4+ states, behaviour per state, or "more states coming"</b> → State pattern. Interviewers love hearing you say <i>when</i> each one is right.', [
          TABLE('Choose your tool', ['Situation', 'Use'], [['few states, only "next state" logic', 'enum + EnumMap table'], ['states have actions (fees, doors, cash)', 'GoF State classes'], ['want pure, replayable logic + compiler exhaustiveness', 'sealed interface + records + switch'], ['states nest (Emergency inside Operating)', 'hierarchical state machine']], { 1: 'sel' })
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Same event, four meanings: Cancel', html: `<p>${H.table(['Current state', 'cancel() does', 'Why'], [['REQUESTED', 'free → CANCELLED', 'nobody has been inconvenienced'], ['ASSIGNED', '₹25 fee → CANCELLED', 'driver started driving to you'], ['ARRIVED', '₹50 fee → CANCELLED', 'driver is waiting at your gate'], ['IN_TRIP', H.c('r', 'rejected'), 'you are in the car — end the trip instead']])}</p><p>Four different behaviours for one button, and <b>zero</b> if-statements in <code>Ride.cancel()</code>. The <i>fee rule</i> lives inside the class of the state it belongs to.</p>` },
      { title: 'Add-a-state follow-up: NO_SHOW', html: `<p>Interviewer: "If the rider does not come out within 5 minutes, mark NO_SHOW and charge ₹100." With State objects: ${H.c('g', '(1) new class NoShow')}; ${H.c('g', '(2) one new method timeout() on the state interface with a default reject')}; ${H.c('g', '(3) Arrived overrides timeout()')}. Requested, Assigned, InTrip, Completed are untouched. That is the Open/Closed principle in action.</p>`, code: { lang: 'java', code: `interface RideState2 {
    String name();
    default RideState2 timeout() { return this; }          // new event: default = ignore
    default RideState2 start()   { return this; }
}
final class Arrived2 implements RideState2 {
    public String name() { return "ARRIVED"; }
    public RideState2 start()   { return new InTrip2(); }
    public RideState2 timeout() { return new NoShow2(100); } // the ONLY changed state
}
final class InTrip2 implements RideState2 { public String name() { return "IN_TRIP"; } }
final class NoShow2 implements RideState2 {                  // the new state
    final int fee;
    NoShow2(int fee) { this.fee = fee; }
    public String name() { return "NO_SHOW(Rs " + fee + ")"; }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class RideState2(ABC):
    @abstractmethod
    def name(self) -> str: ...

    def timeout(self) -> "RideState2": return self  # new event: default = ignore
    def start(self) -> "RideState2": return self


class Arrived2(RideState2):
    def name(self) -> str: return "ARRIVED"
    def start(self) -> RideState2: return InTrip2()
    def timeout(self) -> RideState2: return NoShow2(100)  # the ONLY changed state


class InTrip2(RideState2):
    def name(self) -> str: return "IN_TRIP"


class NoShow2(RideState2):  # the new state
    def __init__(self, fee: int) -> None:
        self.fee = fee

    def name(self) -> str: return f"NO_SHOW(Rs {self.fee})"` },
          { lang: 'ts', code: `interface RideState2 {
  name(): string;
  timeout(): RideState2;
  start(): RideState2;
}

abstract class BaseRideState2 implements RideState2 {
  abstract name(): string;
  timeout(): RideState2 { return this; } // new event: default = ignore
  start(): RideState2 { return this; }
}

class Arrived2 extends BaseRideState2 {
  name(): string { return "ARRIVED"; }
  override start(): RideState2 { return new InTrip2(); }
  override timeout(): RideState2 { return new NoShow2(100); } // the ONLY changed state
}
class InTrip2 extends BaseRideState2 {
  name(): string { return "IN_TRIP"; }
}
class NoShow2 extends BaseRideState2 { // the new state
  constructor(readonly fee: number) { super(); }
  name(): string { return \`NO_SHOW(Rs \${this.fee})\`; }
}` },
          { lang: 'cpp', code: `struct RideState2;
using StatePtr = unique_ptr<RideState2>;  // nullptr means "stay in this state"

struct RideState2 {
    virtual ~RideState2() = default;
    virtual string name() const = 0;
    virtual StatePtr timeout() const { return nullptr; }  // new event: default = ignore
    virtual StatePtr start() const { return nullptr; }
};
struct InTrip2 final : RideState2 {
    string name() const override { return "IN_TRIP"; }
};
struct NoShow2 final : RideState2 {  // the new state
    explicit NoShow2(int fee) : fee(fee) {}
    const int fee;
    string name() const override { return "NO_SHOW(Rs " + to_string(fee) + ")"; }
};
struct Arrived2 final : RideState2 {
    string name() const override { return "ARRIVED"; }
    StatePtr start() const override { return make_unique<InTrip2>(); }
    StatePtr timeout() const override { return make_unique<NoShow2>(100); }  // the ONLY changed state
};` },
  { lang: 'csharp', code: `
abstract class RideState2 {
    public abstract string Name();
    public virtual RideState2 Timeout() { return this; }          // new event: default = ignore
    public virtual RideState2 Start()   { return this; }
}
sealed class Arrived2 : RideState2 {
    public override string Name() { return "ARRIVED"; }
    public override RideState2 Start()   { return new InTrip2(); }
    public override RideState2 Timeout() { return new NoShow2(100); } // the ONLY changed state
}
sealed class InTrip2 : RideState2 { public override string Name() { return "IN_TRIP"; } }
sealed class NoShow2 : RideState2 {                                  // the new state
    public readonly int Fee;
    public NoShow2(int fee) { Fee = fee; }
    public override string Name() { return "NO_SHOW(Rs " + Fee + ")"; }
}` }
        ] } },
      { title: 'Who decides the next state? Three valid answers', html: `<p>${H.table(['Style', 'Where the transition lives', 'Good for'], [['State-driven', 'Inside each State class (<code>r.transitionTo(new X())</code>)', 'behaviour-rich states, GoF classic'], ['Context-driven', 'Context switches based on what the state returns', 'states as stateless singletons; easy logging'], ['Table-driven', 'A map keyed by (state, event), or a config file', 'many simple states, rules owned by product/ops']])}</p><p>A popular middle ground: each state method <b>returns</b> the next state (<code>RideState start()</code>), and the context does <code>state = state.start()</code>. States stay free of setters, and the context is the only place that writes the field — perfect for logging and locking.</p>` },
      { title: 'State vs Strategy: identical class diagram, different story', html: `<p>Both have a context holding an interface reference. The difference is <b>who changes it and why</b>. ${H.c('b', 'Strategy')}: the <i>client</i> picks an algorithm (pay by card or UPI) and it rarely changes during the object’s life. ${H.c('p', 'State')}: the object changes its <i>own</i> state as events arrive (REQUESTED → ASSIGNED → …), and states usually know their successors. If an interviewer asks "isn't that just Strategy?", answer with this.</p>` },
      { title: 'Entry and exit actions', html: `<p>Some work belongs to <b>entering</b> or <b>leaving</b> a state, not to a specific event. Entering IN_TRIP starts the fare meter; leaving it stops the meter. Put these in <code>onEnter()</code>/<code>onExit()</code> and call them from <code>transitionTo()</code>. Otherwise you copy "start meter" into every event that leads to IN_TRIP — and forget one. Elevators use this heavily: entering DOORS_OPEN starts a 3-second timer; leaving it cancels the timer.</p>` }
    ],
    deepDive: `<p><b>1. State objects: shared or per-context?</b> If a state has no fields (Requested, InTrip) you can make it a single shared instance (a <code>static final</code> field in Java, a module-level constant in Python, a <code>static</code> member in TypeScript or C++) and share it across a million rides — that is the Flyweight idea. If a state carries data (Assigned has the driver name), create a new instance per transition. Mixing both is fine.</p>
<p><b>2. Invalid-event policy</b> is a design decision you must state out loud: <i>ignore</i> (UI buttons — pressing pause twice is harmless), <i>reject with error</i> (APIs — return 409 Conflict), or <i>throw</i> (programming bug — should never happen). Elevators ignore duplicate hall calls; ATMs return an error screen; payment ledgers throw.</p>
<p><b>3. Guards.</b> A transition may need a condition: "start only if the OTP matches". Put the guard in the state method (<code>if (!otpOk) { r.reject("bad OTP"); return; }</code>) or in the table as a <code>Predicate</code>. UML statecharts write it as <code>start [otp ok] / startMeter</code>: <i>event [guard] / action</i>.</p>
<p><b>4. Hierarchical (nested) states.</b> An elevator in EMERGENCY must ignore all hall calls whether it was MOVING or IDLE. Instead of adding "if emergency" to every state, model a parent state <b>OPERATIONAL</b> with children IDLE/MOVING/DOORS_OPEN, and a sibling EMERGENCY. Events not handled by a child bubble up to the parent (like exceptions bubbling up the call stack). Spring Statemachine, XState and SCXML all support this.</p>
<p><b>5. Persistence.</b> State objects are not stored in a database; their <b>name</b> is. Save <code>status = 'ARRIVED'</code> plus the data (driver id), and rehydrate with a factory: <code>switch (status) { case "ARRIVED" -> new Arrived(driver); … }</code>. Add a <code>version</code> column so two servers cannot both apply a transition (optimistic locking: <code>UPDATE ride SET status='IN_TRIP', version=8 WHERE id=? AND version=7</code>).</p>
<p><b>6. Concurrency.</b> "Check current state, then write next state" is a <b>check-then-act</b> race. Two threads can both see ARRIVED and both start the trip. Make transitions atomic: a lock on the context (<code>synchronized</code>, <code>threading.Lock</code>, <code>std::mutex</code>), an atomic compare-and-set on an immutable snapshot (<code>AtomicReference.compareAndSet(old, next)</code> in Java), or a single-threaded event loop (actor model; JavaScript already works this way) — the elevator and ATM topics use these.</p>
<p><b>7. Testing.</b> A state machine is perfect for table-driven tests: for every (state, event) cell, assert the next state and the side effects. 6 × 5 = 30 parameterized cases cover the whole behaviour — including all the "—" rejections that hand-written tests usually forget.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask an assistant for "a vending machine" in any language and you will very often get the if/else ladder or a <code>switch(status)</code> repeated in every method, because that is the most common code online. Your value is spotting that the requirement is <i>state-heavy</i> and asking for the right shape: "Give me a state × event table first, then one class per state with default-reject methods."</p>
<p><b>Use AI as a partner:</b> <code>Here is my transition table. List every (state, event) pair I have not specified and suggest a sensible behaviour for each.</code> LLMs are good at enumerating the missing cells — exactly the edge cases interviewers poke at. Also: <code>Generate parameterized tests (JUnit, pytest, Jest or GoogleTest) for every cell of this table.</code></p>
<p><b>AI agents ARE state machines.</b> LangGraph, OpenAI Agents SDK handoffs and most "agent workflow" tools model an agent as nodes (states) and edges (transitions) with guards ("if tool call failed, go to RETRY"). Knowing State deeply lets you design reliable agent flows: explicit terminal states, retry limits, and no "LLM decides to jump anywhere".</p>
<p><b>Where AI goes wrong:</b> forgets terminal states (allows <i>cancel</i> after COMPLETED), mixes state checks into the context again, creates new state objects on every call in hot paths, and ignores concurrency (two threads transitioning at once). <b>What you must still own:</b> drawing the table, choosing the invalid-event policy, and explaining why the design survives the "add a state" follow-up.</p>`,
    problems: [{
      title: 'Document Approval Workflow (add-a-state ready)', level: 'Medium', tags: ['state pattern', 'workflow', 'open-closed'], companies: ['Atlassian', 'Microsoft', 'Google'],
      statement: `<p>Design the lifecycle of a document in a wiki. States: <b>DRAFT</b>, <b>IN_REVIEW</b>, <b>APPROVED</b>, <b>PUBLISHED</b>. Events: <code>submit()</code> (DRAFT → IN_REVIEW), <code>approve(reviewer)</code> (IN_REVIEW → APPROVED, reviewer must not be the author), <code>reject(reason)</code> (IN_REVIEW → DRAFT, keep the reason), <code>publish()</code> (APPROVED → PUBLISHED), <code>edit()</code> (allowed only in DRAFT; editing an APPROVED doc sends it back to DRAFT). Any other event in any state must be rejected with a message, not crash. <b>Follow-up:</b> add an <b>ARCHIVED</b> state reachable only from PUBLISHED, touching as few classes as possible.</p>`,
      constraints: `Single-threaded is fine for the base version. Keep a history log of transitions. Author and reviewer are plain strings.`,
      example: `<p>Author "asha". Events: ${H.c('b', 'submit')} → IN_REVIEW; ${H.c('r', 'approve("asha")')} → rejected (self-approval); ${H.c('b', 'approve("ben")')} → APPROVED; ${H.c('b', 'edit')} → back to DRAFT (approval is void because content changed); ${H.c('b', 'submit, approve("ben"), publish')} → PUBLISHED; ${H.c('r', 'edit')} → rejected (published docs are frozen).</p>`,
      brute: { why: `<p>A <code>String status</code> field and five methods, each with its own <code>if/else</code> on status. The rule "edit in APPROVED goes back to DRAFT" hides inside <code>edit()</code>; the rule "no self-approval" hides inside <code>approve()</code>. Adding ARCHIVED means editing all five methods (each needs a new branch saying "not allowed"), and a typo like <code>"APPROVD"</code> is accepted silently (no compile-time check) and breaks the flow.</p>`, code: { lang: 'java', code: `class NaiveDoc {
    String status = "DRAFT";
    final String author;
    NaiveDoc(String author) { this.author = author; }
    void submit() {
        if (status.equals("DRAFT")) status = "IN_REVIEW";
        else System.out.println("cannot submit in " + status);
    }
    void approve(String reviewer) {
        if (status.equals("IN_REVIEW") && !reviewer.equals(author)) status = "APPROVED";
        else System.out.println("cannot approve in " + status);
    }
    void edit() {
        if (status.equals("DRAFT")) System.out.println("edited");
        else if (status.equals("APPROVED")) status = "DRAFT";
        else System.out.println("cannot edit in " + status);
    }
    // publish(), reject(), archive() ... the same if/else repeated in every method
}`, alt: [{ lang: 'python', code: "class NaiveDoc:\n    def __init__(self, author):\n        self.status = \"DRAFT\"\n        self.author = author\n\n    def submit(self):\n        if self.status == \"DRAFT\": self.status = \"IN_REVIEW\"\n        else: print(\"cannot submit in\", self.status)\n\n    def approve(self, reviewer):\n        if self.status == \"IN_REVIEW\" and reviewer != self.author: self.status = \"APPROVED\"\n        else: print(\"cannot approve in\", self.status)\n\n    def edit(self):\n        if self.status == \"DRAFT\": print(\"edited\")\n        elif self.status == \"APPROVED\": self.status = \"DRAFT\"\n        else: print(\"cannot edit in\", self.status)\n\n    # publish(), reject(), archive() ... the same if/else repeated in every method\n" }, { lang: 'ts', code: "class NaiveDoc {\n  status = \"DRAFT\";\n  constructor(private readonly author: string) {}\n  submit(): void {\n    if (this.status === \"DRAFT\") this.status = \"IN_REVIEW\";\n    else console.log(\"cannot submit in \" + this.status);\n  }\n  approve(reviewer: string): void {\n    if (this.status === \"IN_REVIEW\" && reviewer !== this.author) this.status = \"APPROVED\";\n    else console.log(\"cannot approve in \" + this.status);\n  }\n  edit(): void {\n    if (this.status === \"DRAFT\") console.log(\"edited\");\n    else if (this.status === \"APPROVED\") this.status = \"DRAFT\";\n    else console.log(\"cannot edit in \" + this.status);\n  }\n  // publish(), reject(), archive() ... the same if/else repeated in every method\n}\n" }, { lang: 'cpp', code: "class NaiveDoc {\npublic:\n    string status = \"DRAFT\";\n    const string author;\n    NaiveDoc(string author) : author(move(author)) {}\n    void submit() {\n        if (status == \"DRAFT\") status = \"IN_REVIEW\";\n        else cout << \"cannot submit in \" << status << endl;\n    }\n    void approve(const string& reviewer) {\n        if (status == \"IN_REVIEW\" && reviewer != author) status = \"APPROVED\";\n        else cout << \"cannot approve in \" << status << endl;\n    }\n    void edit() {\n        if (status == \"DRAFT\") cout << \"edited\" << endl;\n        else if (status == \"APPROVED\") status = \"DRAFT\";\n        else cout << \"cannot edit in \" << status << endl;\n    }\n    // publish(), reject(), archive() ... the same if/else repeated in every method\n};\n" }, { lang: 'csharp', code: "using System;\n\nclass NaiveDoc {\n    public string Status = \"DRAFT\";\n    public readonly string Author;\n    public NaiveDoc(string author) { Author = author; }\n    public void Submit() {\n        if (Status == \"DRAFT\") Status = \"IN_REVIEW\";\n        else Console.WriteLine(\"cannot submit in \" + Status);\n    }\n    public void Approve(string reviewer) {\n        if (Status == \"IN_REVIEW\" && reviewer != Author) Status = \"APPROVED\";\n        else Console.WriteLine(\"cannot approve in \" + Status);\n    }\n    public void Edit() {\n        if (Status == \"DRAFT\") Console.WriteLine(\"edited\");\n        else if (Status == \"APPROVED\") Status = \"DRAFT\";\n        else Console.WriteLine(\"cannot edit in \" + Status);\n    }\n    // Publish(), Reject(), Archive() ... the same if/else repeated in every method\n}\n" }] } },
      mcq: { q: 'You add ARCHIVED with the State pattern and default-reject methods. Which classes must change?', options: ['The interface (new archive() with default reject), Published (override archive), and a new Archived class', 'Every state class', 'Only the Document context', 'Draft and Published only'], answer: 0, explain: 'A default in the base state (an interface default method, a base-class method) means states that do not allow archive() need no change. Only the state that leads to ARCHIVED overrides it, plus the new class.' },
      hints: [`<p>Hint 1: Draw the state × event table: 4 states × 5 events. Most cells are "reject". Only 6 cells move the document.</p>`, `<p>Hint 2: <code>DocState</code> (an interface or base class) with one default method per event that calls <code>doc.reject(event)</code>. Each concrete state overrides only its allowed events. The guard "reviewer ≠ author" lives in <code>InReview.approve</code>.</p>`, `<p>Hint 3: Keep the reason from reject() in the Document (data), not in a static field. Recipe: Document(context) → transitionTo(next) logs "A → B" → states as stateless singletons except where they need data → default-reject → ARCHIVED = new class + override in Published.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "DRAFT -> IN_REVIEW\nrejected approve (self-approval not allowed) in IN_REVIEW\nIN_REVIEW -> APPROVED\nAPPROVED -> DRAFT\nDRAFT -> IN_REVIEW\nIN_REVIEW -> APPROVED\nAPPROVED -> PUBLISHED\nrejected edit in PUBLISHED\nPUBLISHED -> ARCHIVED\nfinal = ARCHIVED\n" }] },
      solution: {
        approach: `<p>The Document is the context: it holds author, content, last rejection reason, history and the current <code>DocState</code>. Each event method on Document is one line: <code>state.submit(this)</code>. States are stateless, so we share singletons. Invalid events fall to the base state's default methods, which log a rejection. The ARCHIVED follow-up adds one base-state method with a default, one override in <code>Published</code>, and one new class.</p>`,
        code: `import java.util.*;

interface DocState {
    String name();
    default void submit(Document d)                  { d.reject("submit"); }
    default void approve(Document d, String reviewer) { d.reject("approve"); }
    default void rejectDoc(Document d, String reason) { d.reject("reject"); }
    default void publish(Document d)                 { d.reject("publish"); }
    default void edit(Document d, String text)       { d.reject("edit"); }
    default void archive(Document d)                 { d.reject("archive"); }   // follow-up event
}

final class Draft implements DocState {
    static final Draft I = new Draft();
    public String name() { return "DRAFT"; }
    public void submit(Document d) { d.transitionTo(InReview.I); }
    public void edit(Document d, String text) { d.setContent(text); }
}
final class InReview implements DocState {
    static final InReview I = new InReview();
    public String name() { return "IN_REVIEW"; }
    public void approve(Document d, String reviewer) {
        if (reviewer.equals(d.author())) { d.reject("approve (self-approval not allowed)"); return; }  // guard
        d.transitionTo(Approved.I);
    }
    public void rejectDoc(Document d, String reason) { d.setRejectionReason(reason); d.transitionTo(Draft.I); }
}
final class Approved implements DocState {
    static final Approved I = new Approved();
    public String name() { return "APPROVED"; }
    public void publish(Document d) { d.transitionTo(Published.I); }
    public void edit(Document d, String text) { d.setContent(text); d.transitionTo(Draft.I); } // approval void
}
final class Published implements DocState {
    static final Published I = new Published();
    public String name() { return "PUBLISHED"; }
    public void archive(Document d) { d.transitionTo(Archived.I); }               // follow-up: 1 override
}
final class Archived implements DocState {                                     // follow-up: 1 new class
    static final Archived I = new Archived();
    public String name() { return "ARCHIVED"; }
}

class Document {
    private final String author;
    private String content = "";
    private String rejectionReason = "";
    private DocState state = Draft.I;
    private final List<String> history = new ArrayList<>();

    Document(String author) { this.author = author; }
    void submit()                    { state.submit(this); }
    void approve(String reviewer)    { state.approve(this, reviewer); }
    void rejectReview(String reason) { state.rejectDoc(this, reason); }
    void publish()                   { state.publish(this); }
    void edit(String text)           { state.edit(this, text); }
    void archive()                   { state.archive(this); }

    void transitionTo(DocState next) { history.add(state.name() + " -> " + next.name()); state = next; }
    void reject(String event)        { history.add("rejected " + event + " in " + state.name()); }
    void setContent(String c)        { content = c; }
    void setRejectionReason(String r){ rejectionReason = r; }
    String author()                  { return author; }
    String status()                  { return state.name(); }
    List<String> history()           { return history; }

    public static void main(String[] args) {
        Document doc = new Document("asha");
        doc.edit("v1");
        doc.submit();
        doc.approve("asha");          // rejected: self approval
        doc.approve("ben");
        doc.edit("v2");               // back to DRAFT
        doc.submit();
        doc.approve("ben");
        doc.publish();
        doc.edit("v3");               // rejected: published is frozen
        doc.archive();
        doc.history().forEach(System.out::println);
        System.out.println("final = " + doc.status());
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class DocState(ABC):
    @abstractmethod
    def name(self) -> str: ...

    # Every event is rejected unless a state overrides it.
    def submit(self, d: "Document") -> None: d.reject("submit")
    def approve(self, d: "Document", reviewer: str) -> None: d.reject("approve")
    def reject_doc(self, d: "Document", reason: str) -> None: d.reject("reject")
    def publish(self, d: "Document") -> None: d.reject("publish")
    def edit(self, d: "Document", text: str) -> None: d.reject("edit")
    def archive(self, d: "Document") -> None: d.reject("archive")  # follow-up event


class Draft(DocState):
    def name(self) -> str: return "DRAFT"
    def submit(self, d: "Document") -> None: d.transition_to(IN_REVIEW)
    def edit(self, d: "Document", text: str) -> None: d.set_content(text)


class InReview(DocState):
    def name(self) -> str: return "IN_REVIEW"

    def approve(self, d: "Document", reviewer: str) -> None:
        if reviewer == d.author:  # guard
            d.reject("approve (self-approval not allowed)")
            return
        d.transition_to(APPROVED)

    def reject_doc(self, d: "Document", reason: str) -> None:
        d.set_rejection_reason(reason)
        d.transition_to(DRAFT)


class Approved(DocState):
    def name(self) -> str: return "APPROVED"
    def publish(self, d: "Document") -> None: d.transition_to(PUBLISHED)

    def edit(self, d: "Document", text: str) -> None:  # approval void
        d.set_content(text)
        d.transition_to(DRAFT)


class Published(DocState):
    def name(self) -> str: return "PUBLISHED"
    def archive(self, d: "Document") -> None: d.transition_to(ARCHIVED)  # follow-up: 1 override


class Archived(DocState):  # follow-up: 1 new class
    def name(self) -> str: return "ARCHIVED"


# States hold no data, so one shared instance of each is enough.
DRAFT, IN_REVIEW, APPROVED = Draft(), InReview(), Approved()
PUBLISHED, ARCHIVED = Published(), Archived()


class Document:
    def __init__(self, author: str) -> None:
        self.author = author
        self.content = ""
        self.rejection_reason = ""
        self.state: DocState = DRAFT
        self.history: list[str] = []

    def submit(self) -> None: self.state.submit(self)
    def approve(self, reviewer: str) -> None: self.state.approve(self, reviewer)
    def reject_review(self, reason: str) -> None: self.state.reject_doc(self, reason)
    def publish(self) -> None: self.state.publish(self)
    def edit(self, text: str) -> None: self.state.edit(self, text)
    def archive(self) -> None: self.state.archive(self)

    def transition_to(self, nxt: DocState) -> None:
        self.history.append(f"{self.state.name()} -> {nxt.name()}")
        self.state = nxt

    def reject(self, event: str) -> None:
        self.history.append(f"rejected {event} in {self.state.name()}")

    def set_content(self, c: str) -> None: self.content = c
    def set_rejection_reason(self, r: str) -> None: self.rejection_reason = r
    def status(self) -> str: return self.state.name()


if __name__ == "__main__":
    doc = Document("asha")
    doc.edit("v1")
    doc.submit()
    doc.approve("asha")  # rejected: self approval
    doc.approve("ben")
    doc.edit("v2")  # back to DRAFT
    doc.submit()
    doc.approve("ben")
    doc.publish()
    doc.edit("v3")  # rejected: published is frozen
    doc.archive()
    for line in doc.history:
        print(line)
    print("final =", doc.status())` },
          { lang: 'ts', code: `interface DocState {
  name(): string;
  submit(d: Document): void;
  approve(d: Document, reviewer: string): void;
  rejectDoc(d: Document, reason: string): void;
  publish(d: Document): void;
  edit(d: Document, text: string): void;
  archive(d: Document): void;
}

// Interfaces have no default methods, so shared "reject everything" lives in a base class.
abstract class BaseState implements DocState {
  abstract name(): string;
  submit(d: Document): void { d.reject("submit"); }
  approve(d: Document, reviewer: string): void { d.reject("approve"); }
  rejectDoc(d: Document, reason: string): void { d.reject("reject"); }
  publish(d: Document): void { d.reject("publish"); }
  edit(d: Document, text: string): void { d.reject("edit"); }
  archive(d: Document): void { d.reject("archive"); } // follow-up event
}

class Draft extends BaseState {
  static readonly I = new Draft();
  name(): string { return "DRAFT"; }
  override submit(d: Document): void { d.transitionTo(InReview.I); }
  override edit(d: Document, text: string): void { d.setContent(text); }
}
class InReview extends BaseState {
  static readonly I = new InReview();
  name(): string { return "IN_REVIEW"; }
  override approve(d: Document, reviewer: string): void {
    if (reviewer === d.author) { d.reject("approve (self-approval not allowed)"); return; } // guard
    d.transitionTo(Approved.I);
  }
  override rejectDoc(d: Document, reason: string): void { d.setRejectionReason(reason); d.transitionTo(Draft.I); }
}
class Approved extends BaseState {
  static readonly I = new Approved();
  name(): string { return "APPROVED"; }
  override publish(d: Document): void { d.transitionTo(Published.I); }
  override edit(d: Document, text: string): void { d.setContent(text); d.transitionTo(Draft.I); } // approval void
}
class Published extends BaseState {
  static readonly I = new Published();
  name(): string { return "PUBLISHED"; }
  override archive(d: Document): void { d.transitionTo(Archived.I); } // follow-up: 1 override
}
class Archived extends BaseState { // follow-up: 1 new class
  static readonly I = new Archived();
  name(): string { return "ARCHIVED"; }
}

class Document {
  private content = "";
  private rejectionReason = "";
  private state: DocState = Draft.I;
  readonly history: string[] = [];

  constructor(readonly author: string) {}

  submit(): void { this.state.submit(this); }
  approve(reviewer: string): void { this.state.approve(this, reviewer); }
  rejectReview(reason: string): void { this.state.rejectDoc(this, reason); }
  publish(): void { this.state.publish(this); }
  edit(text: string): void { this.state.edit(this, text); }
  archive(): void { this.state.archive(this); }

  transitionTo(next: DocState): void { this.history.push(\`\${this.state.name()} -> \${next.name()}\`); this.state = next; }
  reject(event: string): void { this.history.push(\`rejected \${event} in \${this.state.name()}\`); }
  setContent(c: string): void { this.content = c; }
  setRejectionReason(r: string): void { this.rejectionReason = r; }
  status(): string { return this.state.name(); }
}

const doc = new Document("asha");
doc.edit("v1");
doc.submit();
doc.approve("asha"); // rejected: self approval
doc.approve("ben");
doc.edit("v2"); // back to DRAFT
doc.submit();
doc.approve("ben");
doc.publish();
doc.edit("v3"); // rejected: published is frozen
doc.archive();
doc.history.forEach((line) => console.log(line));
console.log("final = " + doc.status());` },
          { lang: 'cpp', code: `class Document;

struct DocState {
    virtual ~DocState() = default;
    virtual string name() const = 0;
    // Every event is rejected unless a state overrides it.
    virtual void submit(Document& d) const;
    virtual void approve(Document& d, const string& reviewer) const;
    virtual void rejectDoc(Document& d, const string& reason) const;
    virtual void publish(Document& d) const;
    virtual void edit(Document& d, const string& text) const;
    virtual void archive(Document& d) const;  // follow-up event
};

struct Draft final : DocState {
    static const Draft I;
    string name() const override { return "DRAFT"; }
    void submit(Document& d) const override;
    void edit(Document& d, const string& text) const override;
};
struct InReview final : DocState {
    static const InReview I;
    string name() const override { return "IN_REVIEW"; }
    void approve(Document& d, const string& reviewer) const override;
    void rejectDoc(Document& d, const string& reason) const override;
};
struct Approved final : DocState {
    static const Approved I;
    string name() const override { return "APPROVED"; }
    void publish(Document& d) const override;
    void edit(Document& d, const string& text) const override;
};
struct Published final : DocState {
    static const Published I;
    string name() const override { return "PUBLISHED"; }
    void archive(Document& d) const override;  // follow-up: 1 override
};
struct Archived final : DocState {  // follow-up: 1 new class
    static const Archived I;
    string name() const override { return "ARCHIVED"; }
};
inline const Draft Draft::I;
inline const InReview InReview::I;
inline const Approved Approved::I;
inline const Published Published::I;
inline const Archived Archived::I;

class Document {
    string author_;
    string content_, rejectionReason_;
    const DocState* state_ = &Draft::I;
    vector<string> history_;

public:
    explicit Document(string author) : author_(move(author)) {}
    void submit() { state_->submit(*this); }
    void approve(const string& reviewer) { state_->approve(*this, reviewer); }
    void rejectReview(const string& reason) { state_->rejectDoc(*this, reason); }
    void publish() { state_->publish(*this); }
    void edit(const string& text) { state_->edit(*this, text); }
    void archive() { state_->archive(*this); }

    void transitionTo(const DocState& next) {
        history_.push_back(state_->name() + " -> " + next.name());
        state_ = &next;
    }
    void reject(const string& event) { history_.push_back("rejected " + event + " in " + state_->name()); }
    void setContent(const string& c) { content_ = c; }
    void setRejectionReason(const string& r) { rejectionReason_ = r; }
    const string& author() const { return author_; }
    string status() const { return state_->name(); }
    const vector<string>& history() const { return history_; }
};

void DocState::submit(Document& d) const { d.reject("submit"); }
void DocState::approve(Document& d, const string&) const { d.reject("approve"); }
void DocState::rejectDoc(Document& d, const string&) const { d.reject("reject"); }
void DocState::publish(Document& d) const { d.reject("publish"); }
void DocState::edit(Document& d, const string&) const { d.reject("edit"); }
void DocState::archive(Document& d) const { d.reject("archive"); }

void Draft::submit(Document& d) const { d.transitionTo(InReview::I); }
void Draft::edit(Document& d, const string& text) const { d.setContent(text); }
void InReview::approve(Document& d, const string& reviewer) const {
    if (reviewer == d.author()) { d.reject("approve (self-approval not allowed)"); return; }  // guard
    d.transitionTo(Approved::I);
}
void InReview::rejectDoc(Document& d, const string& reason) const { d.setRejectionReason(reason); d.transitionTo(Draft::I); }
void Approved::publish(Document& d) const { d.transitionTo(Published::I); }
void Approved::edit(Document& d, const string& text) const { d.setContent(text); d.transitionTo(Draft::I); }  // approval void
void Published::archive(Document& d) const { d.transitionTo(Archived::I); }

int main() {
    Document doc("asha");
    doc.edit("v1");
    doc.submit();
    doc.approve("asha");  // rejected: self approval
    doc.approve("ben");
    doc.edit("v2");       // back to DRAFT
    doc.submit();
    doc.approve("ben");
    doc.publish();
    doc.edit("v3");       // rejected: published is frozen
    doc.archive();
    for (const auto& line : doc.history()) cout << line << "\\n";
    cout << "final = " << doc.status() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

abstract class DocState {
    public abstract string Name();
    public virtual void Submit(Document d)                   { d.Reject("submit"); }
    public virtual void Approve(Document d, string reviewer) { d.Reject("approve"); }
    public virtual void RejectDoc(Document d, string reason) { d.Reject("reject"); }
    public virtual void Publish(Document d)                  { d.Reject("publish"); }
    public virtual void Edit(Document d, string text)        { d.Reject("edit"); }
    public virtual void Archive(Document d)                  { d.Reject("archive"); }   // follow-up event
}

sealed class Draft : DocState {
    public static readonly Draft I = new Draft();
    public override string Name() { return "DRAFT"; }
    public override void Submit(Document d) { d.TransitionTo(InReview.I); }
    public override void Edit(Document d, string text) { d.SetContent(text); }
}
sealed class InReview : DocState {
    public static readonly InReview I = new InReview();
    public override string Name() { return "IN_REVIEW"; }
    public override void Approve(Document d, string reviewer) {
        if (reviewer == d.Author()) { d.Reject("approve (self-approval not allowed)"); return; }  // guard
        d.TransitionTo(Approved.I);
    }
    public override void RejectDoc(Document d, string reason) { d.SetRejectionReason(reason); d.TransitionTo(Draft.I); }
}
sealed class Approved : DocState {
    public static readonly Approved I = new Approved();
    public override string Name() { return "APPROVED"; }
    public override void Publish(Document d) { d.TransitionTo(Published.I); }
    public override void Edit(Document d, string text) { d.SetContent(text); d.TransitionTo(Draft.I); } // approval void
}
sealed class Published : DocState {
    public static readonly Published I = new Published();
    public override string Name() { return "PUBLISHED"; }
    public override void Archive(Document d) { d.TransitionTo(Archived.I); }               // follow-up: 1 override
}
sealed class Archived : DocState {                                                      // follow-up: 1 new class
    public static readonly Archived I = new Archived();
    public override string Name() { return "ARCHIVED"; }
}

class Document {
    private readonly string author;
    private string content = "";
    private string rejectionReason = "";
    private DocState state = Draft.I;
    private readonly List<string> history = new List<string>();

    public Document(string author) { this.author = author; }
    public void Submit()                    { state.Submit(this); }
    public void Approve(string reviewer)    { state.Approve(this, reviewer); }
    public void RejectReview(string reason) { state.RejectDoc(this, reason); }
    public void Publish()                   { state.Publish(this); }
    public void Edit(string text)           { state.Edit(this, text); }
    public void Archive()                   { state.Archive(this); }

    public void TransitionTo(DocState next) { history.Add(state.Name() + " -> " + next.Name()); state = next; }
    public void Reject(string ev)           { history.Add("rejected " + ev + " in " + state.Name()); }
    public void SetContent(string c)        { content = c; }
    public void SetRejectionReason(string r){ rejectionReason = r; }
    public string Author()                  { return author; }
    public string Status()                  { return state.Name(); }
    public List<string> History()           { return history; }

    static void Main() {
        Document doc = new Document("asha");
        doc.Edit("v1");
        doc.Submit();
        doc.Approve("asha");          // rejected: self approval
        doc.Approve("ben");
        doc.Edit("v2");               // back to DRAFT
        doc.Submit();
        doc.Approve("ben");
        doc.Publish();
        doc.Edit("v3");               // rejected: published is frozen
        doc.Archive();
        foreach (string h in doc.History()) Console.WriteLine(h);
        Console.WriteLine("final = " + doc.Status());
    }
}` }
        ],
        complexity: `<p>Every event is O(1): one virtual call plus a list append. Adding a state costs O(1) new classes and touches only the states that lead into it. Memory: states are shared singletons, so a million documents share 5 state objects.</p>`,
        followUps: ['Two reviewers must approve (2-of-3). Where does the approval count live — in the state or in the context?', 'Persist the document in a database and rebuild the state object on load.', 'Two editors click submit at the same time — how do you stop a double transition?']
      }
    }]
  });

  /* ======================= TOPIC 2: ELEVATOR DESIGN + CAR STATE MACHINE ======================= */
  var CAR_NODES = [B('IDLE', 'IDLE', 14, 32), B('MOVING_UP', 'MOVING_UP', 50, 9), B('MOVING_DOWN', 'MOVING_DOWN', 50, 55), B('DOORS_OPEN', 'DOORS_OPEN', 86, 32), B('MAINTENANCE', 'MAINTENANCE', 14, 58)];
  var CAR_EDGES = [['IDLE', 'MOVING_UP', 'stop above'], ['IDLE', 'MOVING_DOWN', 'stop below'], ['MOVING_UP', 'DOORS_OPEN', 'arrived'], ['MOVING_DOWN', 'DOORS_OPEN', 'arrived'], ['DOORS_OPEN', 'IDLE', 'timer → close'], ['IDLE', 'MAINTENANCE', 'fault'], ['MAINTENANCE', 'IDLE', 'fixed']];
  // building grid: rows = floors (top first), columns = shaft + pending marker
  function shaft(floors, carFloor, sym, pending, cls) {
    var rows = [], rh = [], hl = {};
    for (var f = floors - 1; f >= 0; f--) {
      var r = floors - 1 - f;
      rh.push('Floor ' + f);
      rows.push([f === carFloor ? sym : '', pending.indexOf(f) >= 0 ? '● call' : '']);
      if (f === carFloor) hl[r + ',0'] = cls || 'cur';
      if (pending.indexOf(f) >= 0) hl[r + ',1'] = 'win';
    }
    return { type: 'grid', label: 'Building (car position and pending stops)', rows: rows, rowHead: rh, colHead: ['car', 'stop'], hl: hl };
  }

  topics.push({
    title: 'Elevator System I: Requirements, Class Design and the Car State Machine',
    analogy: `<p>An elevator is like a <b>city bus on a vertical road</b>. The bus has a route (floors), a driver brain that decides where to go next (the controller), passengers pressing "stop here" inside (car buttons), and people waiting at bus stops waving it down with an "I want to go up/down" sign (hall buttons). At any moment the bus is either <b>parked</b>, <b>driving up</b>, <b>driving down</b>, <b>stopped with doors open</b>, or <b>in the garage for repair</b>. What the bus does with a new "stop" request depends entirely on which of those it is doing — that is our state machine.</p>`,
    explain: `<p><b>Step 1 — clarify requirements</b> (always ask before drawing classes):</p>
${H.table(['Question', 'Typical answer', 'Why it matters'], [
  ['How many floors / cars?', '0–9, start with 1 car, then N cars', 'one car = state machine; N cars = dispatcher'],
  ['Hall buttons have direction?', 'Yes: ▲ and ▼ on each floor', 'request = (floor, direction)'],
  ['Car buttons?', 'Yes: one per floor inside', 'request = (floor) for a specific car'],
  ['Door behaviour?', 'Stay open ~3 s, re-open if blocked', 'DOORS_OPEN state + timer + safety'],
  ['Special modes?', 'Maintenance, overload, fire', 'extra states; must not break others'],
  ['Optimise for?', 'Low wait time, fairness, low energy', 'chooses the scheduling strategy (next topic)']
])}
<p><b>Step 2 — entities (nouns become classes):</b></p>
${H.table(['Class', 'Holds', 'Does'], [
  ['<code>Building</code>', 'floors, cars, controller', 'wires everything together'],
  ['<code>ElevatorCar</code>', 'id, current floor, direction, <b>state</b>, set of stops, door', '<code>addStop()</code>, <code>tick()</code>'],
  ['<code>CarState</code> (enum with behaviour)', 'IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, MAINTENANCE', '<code>onTick(car)</code> returns the next state'],
  ['<code>HallCall</code> / car call', 'floor (+ direction for hall calls)', 'immutable value object (record, dataclass, struct) — the "request"'],
  ['<code>ElevatorController</code>', 'list of cars, dispatch strategy', 'picks which car serves a hall call'],
  ['<code>SchedulingStrategy</code>', '—', 'decides the next stop (FCFS/SSTF/SCAN/LOOK)'],
  ['<code>Door</code>, <code>Display</code>, <code>Button</code>', 'open/closed, text, lit', 'small helpers; Display observes the car']
])}
<p><b>Step 3 — the car's state machine.</b> The car runs on a <b>clock tick</b> (a "heartbeat" — say every 500 ms in real life). On each tick the current state decides what happens:</p>
<ul>
<li><b>IDLE</b>: if there is a stop on this floor → open doors. Else pick a direction (stops above → MOVING_UP, below → MOVING_DOWN). Nothing to do → stay IDLE.</li>
<li><b>MOVING_UP / MOVING_DOWN</b>: move one floor. If this floor is a stop → DOORS_OPEN.</li>
<li><b>DOORS_OPEN</b>: count the door timer down. If the door sensor is blocked, <b>reset</b> the timer (safety). When the timer ends → close doors → IDLE (which immediately decides where to go next).</li>
<li><b>MAINTENANCE</b>: ignore all calls until a technician resets it.</li>
</ul>
<p><b>The brute force trap:</b> one <code>tick()</code> method with <code>if (moving) { if (up) … else … } else if (doorsOpen) { if (blocked) … } else if (maintenance) …</code> plus boolean flags <code>isMoving</code>, <code>isDoorOpen</code>, <code>isUnderMaintenance</code>. Flags allow <b>impossible combinations</b> (moving AND doors open!). ${H.c('r', 'A single state field makes illegal states unrepresentable.')} ${H.c('g', 'The State pattern makes each mode a small, testable unit.')}</p>`,
    clues: [
      '"Design an elevator system" — first ask: floors, cars, hall vs car buttons, special modes. Then draw the car state machine before any scheduling talk.',
      'Boolean flags like <code>isMoving</code>, <code>doorOpen</code>, <code>underMaintenance</code> in your draft → replace with one <code>CarState</code>; flags allow impossible combos.',
      '"Doors must re-open if something blocks them" → a self-transition on DOORS_OPEN that resets the timer (safety guard).',
      '"Requests arrive while the elevator is moving" → requests go into a <b>set of stops</b>, not a FIFO queue; the state decides when to serve them.',
      '"Simulate time" / "tick" in a machine-coding round → a <code>tick()</code> method that delegates to <code>state.onTick(car)</code>.',
      '"Add maintenance / fire / VIP mode" → add states, do not add flags.'
    ],
    code: { lang: 'java', title: 'Elevator core: enum State pattern + car + controller (runnable simulation)', code: `import java.util.*;

enum Direction { UP, DOWN, NONE }

/** A request from a floor button: "I am on floor 4 and want to go UP". */
record HallCall(int floor, Direction direction) {}

/** Enum State pattern: each constant carries its own behaviour. */
enum CarState {
    IDLE {
        CarState onTick(ElevatorCar c) {
            if (c.maintenanceRequested()) return MAINTENANCE;
            if (c.isStop(c.floor())) { c.arrive(); return DOORS_OPEN; }
            Direction d = c.chooseDirection();
            c.setDirection(d);
            return d == Direction.UP ? MOVING_UP : d == Direction.DOWN ? MOVING_DOWN : IDLE;
        }
    },
    MOVING_UP {
        CarState onTick(ElevatorCar c) {
            c.move(+1);
            if (c.isStop(c.floor())) { c.arrive(); return DOORS_OPEN; }
            return MOVING_UP;
        }
    },
    MOVING_DOWN {
        CarState onTick(ElevatorCar c) {
            c.move(-1);
            if (c.isStop(c.floor())) { c.arrive(); return DOORS_OPEN; }
            return MOVING_DOWN;
        }
    },
    DOORS_OPEN {
        CarState onTick(ElevatorCar c) {
            if (c.doorBlocked()) { c.resetDoorTimer(); return DOORS_OPEN; }   // safety: never close on a person
            if (c.countDownDoor() > 0) return DOORS_OPEN;
            return IDLE;                                                      // doors closed; IDLE decides next
        }
    },
    MAINTENANCE {
        CarState onTick(ElevatorCar c) { return MAINTENANCE; }
        boolean acceptsCalls() { return false; }
    };

    abstract CarState onTick(ElevatorCar c);
    boolean acceptsCalls() { return true; }
}

class ElevatorCar {
    static final int DOOR_TICKS = 2;
    private final int id, minFloor, maxFloor;
    private int floor;
    private Direction direction = Direction.NONE;
    private CarState state = CarState.IDLE;
    private final TreeSet<Integer> stops = new TreeSet<>();   // sorted: higher()/lower() are O(log n)
    private int doorTicks = 0;
    private boolean blocked = false, maintenance = false;

    ElevatorCar(int id, int minFloor, int maxFloor, int startFloor) {
        this.id = id; this.minFloor = minFloor; this.maxFloor = maxFloor; this.floor = startFloor;
    }

    /** Car button or dispatcher assignment. Returns false if the car is not taking calls. */
    boolean addStop(int f) {
        if (f < minFloor || f > maxFloor) throw new IllegalArgumentException("no floor " + f);
        if (!state.acceptsCalls() || maintenance) return false;
        stops.add(f);                                          // duplicates ignored by the set
        return true;
    }

    void tick() {
        CarState next = state.onTick(this);
        if (next != state) System.out.printf("car %d: %s -> %s at floor %d%n", id, state, next, floor);
        state = next;
    }

    /** Cost of serving a hall call; the controller picks the cheapest car. */
    int costFor(HallCall call) {
        if (!state.acceptsCalls() || maintenance) return Integer.MAX_VALUE;
        int distance = Math.abs(floor - call.floor());
        boolean onTheWay = (state == CarState.MOVING_UP && call.direction() == Direction.UP && call.floor() > floor)
                || (state == CarState.MOVING_DOWN && call.direction() == Direction.DOWN && call.floor() < floor);
        if (state == CarState.IDLE || onTheWay) return distance;
        return distance + 2 * (maxFloor - minFloor);           // must finish its current sweep first
    }

    // ---- helpers used only by CarState ----
    boolean isStop(int f)             { return stops.contains(f); }
    void arrive()                     { stops.remove(floor); doorTicks = DOOR_TICKS; }
    void move(int delta)              { floor += delta; }
    int countDownDoor()               { return --doorTicks; }
    void resetDoorTimer()             { doorTicks = DOOR_TICKS; blocked = false; }
    boolean doorBlocked()             { return blocked; }
    void setDirection(Direction d)    { direction = d; }
    boolean maintenanceRequested()    { return maintenance; }
    Direction chooseDirection() {                              // LOOK rule: keep going while work remains ahead
        Integer above = stops.higher(floor), below = stops.lower(floor);
        if (direction == Direction.UP && above != null) return Direction.UP;
        if (direction == Direction.DOWN && below != null) return Direction.DOWN;
        if (above != null && below != null) return (above - floor) <= (floor - below) ? Direction.UP : Direction.DOWN;
        if (above != null) return Direction.UP;
        if (below != null) return Direction.DOWN;
        return Direction.NONE;
    }

    // ---- outside events ----
    void blockDoor()          { blocked = true; }
    void requestMaintenance() { maintenance = true; stops.clear(); }
    void finishMaintenance()  { maintenance = false; if (state == CarState.MAINTENANCE) state = CarState.IDLE; }
    int floor()               { return floor; }
    int id()                  { return id; }
    CarState state()          { return state; }
}

class ElevatorController {
    private final List<ElevatorCar> cars;
    ElevatorController(List<ElevatorCar> cars) { this.cars = cars; }

    ElevatorCar onHallCall(HallCall call) {
        ElevatorCar best = cars.stream().min(Comparator.comparingInt(c -> c.costFor(call))).orElseThrow();
        if (best.costFor(call) == Integer.MAX_VALUE) throw new IllegalStateException("no car in service");
        best.addStop(call.floor());
        return best;
    }
    void onCarButton(int carIndex, int floor) { cars.get(carIndex).addStop(floor); }
    void tickAll() { cars.forEach(ElevatorCar::tick); }

    public static void main(String[] args) {
        ElevatorCar a = new ElevatorCar(0, 0, 9, 0), b = new ElevatorCar(1, 0, 9, 9);
        ElevatorController ctl = new ElevatorController(List.of(a, b));
        System.out.println("hall call 2 UP -> car " + ctl.onHallCall(new HallCall(2, Direction.UP)).id());
        System.out.println("hall call 8 DOWN -> car " + ctl.onHallCall(new HallCall(8, Direction.DOWN)).id());
        for (int t = 0; t < 6; t++) ctl.tickAll();
        ctl.onCarButton(0, 6);                 // passenger in car 0 presses 6
        a.blockDoor();                         // someone holds the door
        for (int t = 0; t < 12; t++) ctl.tickAll();
        System.out.println("car 0 at " + a.floor() + " " + a.state() + ", car 1 at " + b.floor() + " " + b.state());
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from enum import Enum
from typing import Optional

MAX_COST = 2**31 - 1


class Direction(Enum):
    UP = 1
    DOWN = 2
    NONE = 3


@dataclass(frozen=True)
class HallCall:
    """A request from a floor button: "I am on floor 4 and want to go UP"."""
    floor: int
    direction: Direction


class CarState(Enum):
    """Enum State pattern: each member carries its own behaviour (see on_tick)."""
    IDLE = 1
    MOVING_UP = 2
    MOVING_DOWN = 3
    DOORS_OPEN = 4
    MAINTENANCE = 5

    def on_tick(self, c: "ElevatorCar") -> "CarState":
        S = CarState
        match self:
            case S.IDLE:
                if c.maintenance_requested():
                    return S.MAINTENANCE
                if c.is_stop(c.floor):
                    c.arrive()
                    return S.DOORS_OPEN
                d = c.choose_direction()
                c.set_direction(d)
                return {Direction.UP: S.MOVING_UP, Direction.DOWN: S.MOVING_DOWN}.get(d, S.IDLE)
            case S.MOVING_UP | S.MOVING_DOWN:
                c.move(+1 if self is S.MOVING_UP else -1)
                if c.is_stop(c.floor):
                    c.arrive()
                    return S.DOORS_OPEN
                return self
            case S.DOORS_OPEN:
                if c.door_blocked():  # safety: never close on a person
                    c.reset_door_timer()
                    return S.DOORS_OPEN
                if c.count_down_door() > 0:
                    return S.DOORS_OPEN
                return S.IDLE  # doors closed; IDLE decides next
            case _:
                return S.MAINTENANCE

    def accepts_calls(self) -> bool:
        return self is not CarState.MAINTENANCE


class ElevatorCar:
    DOOR_TICKS = 2

    def __init__(self, id: int, min_floor: int, max_floor: int, start_floor: int) -> None:
        self.id = id
        self._min_floor, self._max_floor = min_floor, max_floor
        self.floor = start_floor
        self._direction = Direction.NONE
        self.state = CarState.IDLE
        self._stops: set[int] = set()
        self._door_ticks = 0
        self._blocked = False
        self._maintenance = False

    def add_stop(self, f: int) -> bool:
        """Car button or dispatcher assignment. Returns False if the car is not taking calls."""
        if f < self._min_floor or f > self._max_floor:
            raise ValueError(f"no floor {f}")
        if not self.state.accepts_calls() or self._maintenance:
            return False
        self._stops.add(f)  # duplicates ignored by the set
        return True

    def tick(self) -> None:
        nxt = self.state.on_tick(self)
        if nxt is not self.state:
            print(f"car {self.id}: {self.state.name} -> {nxt.name} at floor {self.floor}")
        self.state = nxt

    def cost_for(self, call: HallCall) -> int:
        """Cost of serving a hall call; the controller picks the cheapest car."""
        if not self.state.accepts_calls() or self._maintenance:
            return MAX_COST
        distance = abs(self.floor - call.floor)
        on_the_way = (self.state is CarState.MOVING_UP and call.direction is Direction.UP and call.floor > self.floor) or \\
                     (self.state is CarState.MOVING_DOWN and call.direction is Direction.DOWN and call.floor < self.floor)
        if self.state is CarState.IDLE or on_the_way:
            return distance
        return distance + 2 * (self._max_floor - self._min_floor)  # must finish its current sweep first

    # ---- helpers used only by CarState ----
    def is_stop(self, f: int) -> bool: return f in self._stops

    def arrive(self) -> None:
        self._stops.discard(self.floor)
        self._door_ticks = self.DOOR_TICKS

    def move(self, delta: int) -> None: self.floor += delta

    def count_down_door(self) -> int:
        self._door_ticks -= 1
        return self._door_ticks

    def reset_door_timer(self) -> None:
        self._door_ticks = self.DOOR_TICKS
        self._blocked = False

    def door_blocked(self) -> bool: return self._blocked
    def set_direction(self, d: Direction) -> None: self._direction = d
    def maintenance_requested(self) -> bool: return self._maintenance

    def choose_direction(self) -> Direction:
        """LOOK rule: keep going while work remains ahead."""
        above = min((s for s in self._stops if s > self.floor), default=None)
        below = max((s for s in self._stops if s < self.floor), default=None)
        if self._direction is Direction.UP and above is not None:
            return Direction.UP
        if self._direction is Direction.DOWN and below is not None:
            return Direction.DOWN
        if above is not None and below is not None:
            return Direction.UP if (above - self.floor) <= (self.floor - below) else Direction.DOWN
        if above is not None:
            return Direction.UP
        if below is not None:
            return Direction.DOWN
        return Direction.NONE

    # ---- outside events ----
    def block_door(self) -> None: self._blocked = True

    def request_maintenance(self) -> None:
        self._maintenance = True
        self._stops.clear()

    def finish_maintenance(self) -> None:
        self._maintenance = False
        if self.state is CarState.MAINTENANCE:
            self.state = CarState.IDLE


class ElevatorController:
    def __init__(self, cars: list[ElevatorCar]) -> None:
        self._cars = cars

    def on_hall_call(self, call: HallCall) -> ElevatorCar:
        best = min(self._cars, key=lambda c: c.cost_for(call))
        if best.cost_for(call) == MAX_COST:
            raise RuntimeError("no car in service")
        best.add_stop(call.floor)
        return best

    def on_car_button(self, car_index: int, floor: int) -> None:
        self._cars[car_index].add_stop(floor)

    def tick_all(self) -> None:
        for c in self._cars:
            c.tick()


if __name__ == "__main__":
    a, b = ElevatorCar(0, 0, 9, 0), ElevatorCar(1, 0, 9, 9)
    ctl = ElevatorController([a, b])
    print("hall call 2 UP -> car", ctl.on_hall_call(HallCall(2, Direction.UP)).id)
    print("hall call 8 DOWN -> car", ctl.on_hall_call(HallCall(8, Direction.DOWN)).id)
    for _ in range(6):
        ctl.tick_all()
    ctl.on_car_button(0, 6)  # passenger in car 0 presses 6
    a.block_door()  # someone holds the door
    for _ in range(12):
        ctl.tick_all()
    print(f"car 0 at {a.floor} {a.state.name}, car 1 at {b.floor} {b.state.name}")` },
          { lang: 'ts', code: `type Direction = "UP" | "DOWN" | "NONE";

/** A request from a floor button: "I am on floor 4 and want to go UP". */
interface HallCall { readonly floor: number; readonly direction: Direction }

const MAX_COST = 2 ** 31 - 1;

/** Object-literal State pattern: each state carries its own behaviour. */
interface CarState {
  readonly name: string;
  onTick(c: ElevatorCar): CarState;
  acceptsCalls(): boolean;
}

function state(name: string, onTick: (c: ElevatorCar) => CarState, acceptsCalls = true): CarState {
  return { name, onTick, acceptsCalls: () => acceptsCalls };
}

const IDLE: CarState = state("IDLE", (c) => {
  if (c.maintenanceRequested()) return MAINTENANCE;
  if (c.isStop(c.floor)) { c.arrive(); return DOORS_OPEN; }
  const d = c.chooseDirection();
  c.setDirection(d);
  return d === "UP" ? MOVING_UP : d === "DOWN" ? MOVING_DOWN : IDLE;
});
const MOVING_UP: CarState = state("MOVING_UP", (c) => {
  c.move(+1);
  if (c.isStop(c.floor)) { c.arrive(); return DOORS_OPEN; }
  return MOVING_UP;
});
const MOVING_DOWN: CarState = state("MOVING_DOWN", (c) => {
  c.move(-1);
  if (c.isStop(c.floor)) { c.arrive(); return DOORS_OPEN; }
  return MOVING_DOWN;
});
const DOORS_OPEN: CarState = state("DOORS_OPEN", (c) => {
  if (c.doorBlocked()) { c.resetDoorTimer(); return DOORS_OPEN; } // safety: never close on a person
  if (c.countDownDoor() > 0) return DOORS_OPEN;
  return IDLE; // doors closed; IDLE decides next
});
const MAINTENANCE: CarState = state("MAINTENANCE", () => MAINTENANCE, false);

class ElevatorCar {
  static readonly DOOR_TICKS = 2;
  floor: number;
  state: CarState = IDLE;
  private direction: Direction = "NONE";
  private readonly stops = new Set<number>();
  private doorTicks = 0;
  private blocked = false;
  private maintenance = false;

  constructor(readonly id: number, private readonly minFloor: number, private readonly maxFloor: number, startFloor: number) {
    this.floor = startFloor;
  }

  /** Car button or dispatcher assignment. Returns false if the car is not taking calls. */
  addStop(f: number): boolean {
    if (f < this.minFloor || f > this.maxFloor) throw new RangeError(\`no floor \${f}\`);
    if (!this.state.acceptsCalls() || this.maintenance) return false;
    this.stops.add(f); // duplicates ignored by the set
    return true;
  }

  tick(): void {
    const next = this.state.onTick(this);
    if (next !== this.state) console.log(\`car \${this.id}: \${this.state.name} -> \${next.name} at floor \${this.floor}\`);
    this.state = next;
  }

  /** Cost of serving a hall call; the controller picks the cheapest car. */
  costFor(call: HallCall): number {
    if (!this.state.acceptsCalls() || this.maintenance) return MAX_COST;
    const distance = Math.abs(this.floor - call.floor);
    const onTheWay = (this.state === MOVING_UP && call.direction === "UP" && call.floor > this.floor)
      || (this.state === MOVING_DOWN && call.direction === "DOWN" && call.floor < this.floor);
    if (this.state === IDLE || onTheWay) return distance;
    return distance + 2 * (this.maxFloor - this.minFloor); // must finish its current sweep first
  }

  // ---- helpers used only by the states ----
  isStop(f: number): boolean { return this.stops.has(f); }
  arrive(): void { this.stops.delete(this.floor); this.doorTicks = ElevatorCar.DOOR_TICKS; }
  move(delta: number): void { this.floor += delta; }
  countDownDoor(): number { return --this.doorTicks; }
  resetDoorTimer(): void { this.doorTicks = ElevatorCar.DOOR_TICKS; this.blocked = false; }
  doorBlocked(): boolean { return this.blocked; }
  setDirection(d: Direction): void { this.direction = d; }
  maintenanceRequested(): boolean { return this.maintenance; }
  chooseDirection(): Direction { // LOOK rule: keep going while work remains ahead
    const ahead = [...this.stops].filter((s) => s > this.floor);
    const behind = [...this.stops].filter((s) => s < this.floor);
    const above = ahead.length ? Math.min(...ahead) : null;
    const below = behind.length ? Math.max(...behind) : null;
    if (this.direction === "UP" && above !== null) return "UP";
    if (this.direction === "DOWN" && below !== null) return "DOWN";
    if (above !== null && below !== null) return (above - this.floor) <= (this.floor - below) ? "UP" : "DOWN";
    if (above !== null) return "UP";
    if (below !== null) return "DOWN";
    return "NONE";
  }

  // ---- outside events ----
  blockDoor(): void { this.blocked = true; }
  requestMaintenance(): void { this.maintenance = true; this.stops.clear(); }
  finishMaintenance(): void { this.maintenance = false; if (this.state === MAINTENANCE) this.state = IDLE; }
}

class ElevatorController {
  constructor(private readonly cars: ElevatorCar[]) {}

  onHallCall(call: HallCall): ElevatorCar {
    let best = this.cars[0];
    for (const c of this.cars) if (c.costFor(call) < best.costFor(call)) best = c;
    if (best.costFor(call) === MAX_COST) throw new Error("no car in service");
    best.addStop(call.floor);
    return best;
  }
  onCarButton(carIndex: number, floor: number): void { this.cars[carIndex].addStop(floor); }
  tickAll(): void { this.cars.forEach((c) => c.tick()); }
}

const a = new ElevatorCar(0, 0, 9, 0), b = new ElevatorCar(1, 0, 9, 9);
const ctl = new ElevatorController([a, b]);
console.log("hall call 2 UP -> car " + ctl.onHallCall({ floor: 2, direction: "UP" }).id);
console.log("hall call 8 DOWN -> car " + ctl.onHallCall({ floor: 8, direction: "DOWN" }).id);
for (let t = 0; t < 6; t++) ctl.tickAll();
ctl.onCarButton(0, 6); // passenger in car 0 presses 6
a.blockDoor(); // someone holds the door
for (let t = 0; t < 12; t++) ctl.tickAll();
console.log(\`car 0 at \${a.floor} \${a.state.name}, car 1 at \${b.floor} \${b.state.name}\`);` },
          { lang: 'cpp', code: `enum class Direction { UP, DOWN, NONE };

// A request from a floor button: "I am on floor 4 and want to go UP".
struct HallCall {
    int floor;
    Direction direction;
};

// Enum State pattern: the state is a plain enum; onTick(state, car) holds the behaviour.
enum class CarState { IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, MAINTENANCE };

const char* name(CarState s) {
    static const char* n[] = {"IDLE", "MOVING_UP", "MOVING_DOWN", "DOORS_OPEN", "MAINTENANCE"};
    return n[static_cast<int>(s)];
}
bool acceptsCalls(CarState s) { return s != CarState::MAINTENANCE; }

class ElevatorCar {
public:
    static constexpr int DOOR_TICKS = 2;

    ElevatorCar(int id, int minFloor, int maxFloor, int startFloor)
        : id_(id), minFloor_(minFloor), maxFloor_(maxFloor), floor_(startFloor) {}

    // Car button or dispatcher assignment. Returns false if the car is not taking calls.
    bool addStop(int f) {
        if (f < minFloor_ || f > maxFloor_) throw invalid_argument("no floor " + to_string(f));
        if (!acceptsCalls(state_) || maintenance_) return false;
        stops_.insert(f);  // duplicates ignored by the set
        return true;
    }

    void tick() {
        CarState next = onTick(state_);
        if (next != state_) cout << "car " << id_ << ": " << name(state_) << " -> " << name(next) << " at floor " << floor_ << "\\n";
        state_ = next;
    }

    // Cost of serving a hall call; the controller picks the cheapest car.
    int costFor(const HallCall& call) const {
        if (!acceptsCalls(state_) || maintenance_) return INT_MAX;
        int distance = abs(floor_ - call.floor);
        bool onTheWay = (state_ == CarState::MOVING_UP && call.direction == Direction::UP && call.floor > floor_)
                     || (state_ == CarState::MOVING_DOWN && call.direction == Direction::DOWN && call.floor < floor_);
        if (state_ == CarState::IDLE || onTheWay) return distance;
        return distance + 2 * (maxFloor_ - minFloor_);  // must finish its current sweep first
    }

    // ---- outside events ----
    void blockDoor() { blocked_ = true; }
    void requestMaintenance() { maintenance_ = true; stops_.clear(); }
    void finishMaintenance() { maintenance_ = false; if (state_ == CarState::MAINTENANCE) state_ = CarState::IDLE; }
    int floor() const { return floor_; }
    int id() const { return id_; }
    CarState state() const { return state_; }

private:
    // The behaviour of each state, one case per enum constant.
    CarState onTick(CarState s) {
        switch (s) {
            case CarState::IDLE: {
                if (maintenance_) return CarState::MAINTENANCE;
                if (stops_.count(floor_)) { arrive(); return CarState::DOORS_OPEN; }
                direction_ = chooseDirection();
                return direction_ == Direction::UP ? CarState::MOVING_UP
                     : direction_ == Direction::DOWN ? CarState::MOVING_DOWN : CarState::IDLE;
            }
            case CarState::MOVING_UP:
            case CarState::MOVING_DOWN:
                floor_ += s == CarState::MOVING_UP ? +1 : -1;
                if (stops_.count(floor_)) { arrive(); return CarState::DOORS_OPEN; }
                return s;
            case CarState::DOORS_OPEN:
                if (blocked_) { doorTicks_ = DOOR_TICKS; blocked_ = false; return CarState::DOORS_OPEN; }  // safety: never close on a person
                if (--doorTicks_ > 0) return CarState::DOORS_OPEN;
                return CarState::IDLE;  // doors closed; IDLE decides next
            case CarState::MAINTENANCE:
                return CarState::MAINTENANCE;
        }
        return s;
    }

    void arrive() { stops_.erase(floor_); doorTicks_ = DOOR_TICKS; }

    Direction chooseDirection() const {  // LOOK rule: keep going while work remains ahead
        auto up = stops_.upper_bound(floor_);
        auto lo = stops_.lower_bound(floor_);
        bool hasAbove = up != stops_.end(), hasBelow = lo != stops_.begin();
        int above = hasAbove ? *up : 0, below = hasBelow ? *prev(lo) : 0;
        if (direction_ == Direction::UP && hasAbove) return Direction::UP;
        if (direction_ == Direction::DOWN && hasBelow) return Direction::DOWN;
        if (hasAbove && hasBelow) return (above - floor_) <= (floor_ - below) ? Direction::UP : Direction::DOWN;
        if (hasAbove) return Direction::UP;
        if (hasBelow) return Direction::DOWN;
        return Direction::NONE;
    }

    int id_, minFloor_, maxFloor_, floor_;
    Direction direction_ = Direction::NONE;
    CarState state_ = CarState::IDLE;
    set<int> stops_;  // sorted: bound lookups are O(log n)
    int doorTicks_ = 0;
    bool blocked_ = false, maintenance_ = false;
};

class ElevatorController {
    vector<ElevatorCar*> cars_;  // the cars are owned by the caller

public:
    explicit ElevatorController(vector<ElevatorCar*> cars) : cars_(move(cars)) {}

    ElevatorCar& onHallCall(const HallCall& call) {
        auto best = min_element(cars_.begin(), cars_.end(),
                                [&](ElevatorCar* x, ElevatorCar* y) { return x->costFor(call) < y->costFor(call); });
        if ((*best)->costFor(call) == INT_MAX) throw runtime_error("no car in service");
        (*best)->addStop(call.floor);
        return **best;
    }
    void onCarButton(int carIndex, int floor) { cars_[carIndex]->addStop(floor); }
    void tickAll() { for (ElevatorCar* c : cars_) c->tick(); }
};

int main() {
    ElevatorCar a(0, 0, 9, 0), b(1, 0, 9, 9);
    ElevatorController ctl({&a, &b});
    cout << "hall call 2 UP -> car " << ctl.onHallCall({2, Direction::UP}).id() << "\\n";
    cout << "hall call 8 DOWN -> car " << ctl.onHallCall({8, Direction::DOWN}).id() << "\\n";
    for (int t = 0; t < 6; t++) ctl.tickAll();
    ctl.onCarButton(0, 6);  // passenger in car 0 presses 6
    a.blockDoor();          // someone holds the door
    for (int t = 0; t < 12; t++) ctl.tickAll();
    cout << "car 0 at " << a.floor() << " " << name(a.state()) << ", car 1 at " << b.floor() << " " << name(b.state()) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

enum Direction { UP, DOWN, NONE }

/// A request from a floor button: "I am on floor 4 and want to go UP".
sealed class HallCall {
    public readonly int Floor; public readonly Direction Direction;
    public HallCall(int floor, Direction direction) { Floor = floor; Direction = direction; }
}

/// Type-safe enum State pattern: each constant is an instance that carries its own behaviour.
abstract class CarState {
    public static readonly CarState IDLE = new IdleState();
    public static readonly CarState MOVING_UP = new MovingUpState();
    public static readonly CarState MOVING_DOWN = new MovingDownState();
    public static readonly CarState DOORS_OPEN = new DoorsOpenState();
    public static readonly CarState MAINTENANCE = new MaintenanceState();

    private readonly string name;
    private CarState(string name) { this.name = name; }
    public abstract CarState OnTick(ElevatorCar c);
    public virtual bool AcceptsCalls() { return true; }
    public override string ToString() { return name; }

    sealed class IdleState : CarState {
        public IdleState() : base("IDLE") { }
        public override CarState OnTick(ElevatorCar c) {
            if (c.MaintenanceRequested()) return MAINTENANCE;
            if (c.IsStop(c.Floor())) { c.Arrive(); return DOORS_OPEN; }
            Direction d = c.ChooseDirection();
            c.SetDirection(d);
            return d == Direction.UP ? MOVING_UP : d == Direction.DOWN ? MOVING_DOWN : IDLE;
        }
    }
    sealed class MovingUpState : CarState {
        public MovingUpState() : base("MOVING_UP") { }
        public override CarState OnTick(ElevatorCar c) {
            c.Move(+1);
            if (c.IsStop(c.Floor())) { c.Arrive(); return DOORS_OPEN; }
            return MOVING_UP;
        }
    }
    sealed class MovingDownState : CarState {
        public MovingDownState() : base("MOVING_DOWN") { }
        public override CarState OnTick(ElevatorCar c) {
            c.Move(-1);
            if (c.IsStop(c.Floor())) { c.Arrive(); return DOORS_OPEN; }
            return MOVING_DOWN;
        }
    }
    sealed class DoorsOpenState : CarState {
        public DoorsOpenState() : base("DOORS_OPEN") { }
        public override CarState OnTick(ElevatorCar c) {
            if (c.DoorBlocked()) { c.ResetDoorTimer(); return DOORS_OPEN; }   // safety: never close on a person
            if (c.CountDownDoor() > 0) return DOORS_OPEN;
            return IDLE;                                                      // doors closed; IDLE decides next
        }
    }
    sealed class MaintenanceState : CarState {
        public MaintenanceState() : base("MAINTENANCE") { }
        public override CarState OnTick(ElevatorCar c) { return MAINTENANCE; }
        public override bool AcceptsCalls() { return false; }
    }
}

class ElevatorCar {
    public const int DOOR_TICKS = 2;
    private readonly int id, minFloor, maxFloor;
    private int floor;
    private Direction direction = Direction.NONE;
    private CarState state = CarState.IDLE;
    private readonly SortedSet<int> stops = new SortedSet<int>();   // sorted: next-above / next-below are O(log n)
    private int doorTicks = 0;
    private bool blocked = false, maintenance = false;

    public ElevatorCar(int id, int minFloor, int maxFloor, int startFloor) {
        this.id = id; this.minFloor = minFloor; this.maxFloor = maxFloor; floor = startFloor;
    }

    /// Car button or dispatcher assignment. Returns false if the car is not taking calls.
    public bool AddStop(int f) {
        if (f < minFloor || f > maxFloor) throw new ArgumentException("no floor " + f);
        if (!state.AcceptsCalls() || maintenance) return false;
        stops.Add(f);                                          // duplicates ignored by the set
        return true;
    }

    public void Tick() {
        CarState next = state.OnTick(this);
        if (next != state) Console.WriteLine("car " + id + ": " + state + " -> " + next + " at floor " + floor);
        state = next;
    }

    /// Cost of serving a hall call; the controller picks the cheapest car.
    public int CostFor(HallCall call) {
        if (!state.AcceptsCalls() || maintenance) return int.MaxValue;
        int distance = Math.Abs(floor - call.Floor);
        bool onTheWay = (state == CarState.MOVING_UP && call.Direction == Direction.UP && call.Floor > floor)
                || (state == CarState.MOVING_DOWN && call.Direction == Direction.DOWN && call.Floor < floor);
        if (state == CarState.IDLE || onTheWay) return distance;
        return distance + 2 * (maxFloor - minFloor);           // must finish its current sweep first
    }

    // ---- helpers used only by CarState ----
    public bool IsStop(int f)             { return stops.Contains(f); }
    public void Arrive()                  { stops.Remove(floor); doorTicks = DOOR_TICKS; }
    public void Move(int delta)           { floor += delta; }
    public int CountDownDoor()            { return --doorTicks; }
    public void ResetDoorTimer()          { doorTicks = DOOR_TICKS; blocked = false; }
    public bool DoorBlocked()             { return blocked; }
    public void SetDirection(Direction d) { direction = d; }
    public bool MaintenanceRequested()    { return maintenance; }
    private int? Higher(int f) { foreach (int s in stops.GetViewBetween(f + 1, int.MaxValue)) return s; return null; }
    private int? Lower(int f)  { int? best = null; foreach (int s in stops.GetViewBetween(int.MinValue, f - 1)) best = s; return best; }
    public Direction ChooseDirection() {                        // LOOK rule: keep going while work remains ahead
        int? above = Higher(floor), below = Lower(floor);
        if (direction == Direction.UP && above != null) return Direction.UP;
        if (direction == Direction.DOWN && below != null) return Direction.DOWN;
        if (above != null && below != null) return (above.Value - floor) <= (floor - below.Value) ? Direction.UP : Direction.DOWN;
        if (above != null) return Direction.UP;
        if (below != null) return Direction.DOWN;
        return Direction.NONE;
    }

    // ---- outside events ----
    public void BlockDoor()          { blocked = true; }
    public void RequestMaintenance() { maintenance = true; stops.Clear(); }
    public void FinishMaintenance()  { maintenance = false; if (state == CarState.MAINTENANCE) state = CarState.IDLE; }
    public int Floor()               { return floor; }
    public int Id()                  { return id; }
    public CarState State()          { return state; }
}

class ElevatorController {
    private readonly List<ElevatorCar> cars;
    public ElevatorController(List<ElevatorCar> cars) { this.cars = cars; }

    public ElevatorCar OnHallCall(HallCall call) {
        ElevatorCar best = cars.OrderBy(c => c.CostFor(call)).First();
        if (best.CostFor(call) == int.MaxValue) throw new InvalidOperationException("no car in service");
        best.AddStop(call.Floor);
        return best;
    }
    public void OnCarButton(int carIndex, int floor) { cars[carIndex].AddStop(floor); }
    public void TickAll() { foreach (ElevatorCar c in cars) c.Tick(); }

    static void Main() {
        ElevatorCar a = new ElevatorCar(0, 0, 9, 0), b = new ElevatorCar(1, 0, 9, 9);
        ElevatorController ctl = new ElevatorController(new List<ElevatorCar> { a, b });
        Console.WriteLine("hall call 2 UP -> car " + ctl.OnHallCall(new HallCall(2, Direction.UP)).Id());
        Console.WriteLine("hall call 8 DOWN -> car " + ctl.OnHallCall(new HallCall(8, Direction.DOWN)).Id());
        for (int t = 0; t < 6; t++) ctl.TickAll();
        ctl.OnCarButton(0, 6);                 // passenger in car 0 presses 6
        a.BlockDoor();                         // someone holds the door
        for (int t = 0; t < 12; t++) ctl.TickAll();
        Console.WriteLine("car 0 at " + a.Floor() + " " + a.State() + ", car 1 at " + b.Floor() + " " + b.State());
    }
}` }
        ] },
    viz: {
      title: 'One elevator car: states light up as it serves calls floor by floor',
      input: 'start=0; calls=5 B 2 M 7',
      inputLabel: 'start=floor; calls = floors 0-9 in arrival order, B = someone blocks the door at the next stop, M = maintenance cycle',
      gen: function (input) {
        var o = kvParse(input, 'Format: start=0; calls=5 B 2 M 7');
        var start = parseInt(o.start, 10);
        if (isNaN(start) || start < 0 || start > 9) throw new Error('start must be a floor 0-9');
        var toks = tokens(o.calls || '', /[\s,]+/, 8, 'calls = floors 0-9, B or M, e.g. calls=5 B 2 M 7');
        toks.forEach(function (t) { if (!/^([0-9]|b|m|B|M)$/.test(t)) throw new Error('Bad token "' + t + '": use floors 0-9, B or M'); });
        var floors = 10, f = start, frames = [], pending = toks.filter(function (t) { return /^[0-9]$/.test(t); }).map(Number), moved = 0, blockNext = false;
        var qItems = toks.slice();
        function snap(state, sym, narr, edge, cls, extra) {
          var parts = [SM('Car state machine', CAR_NODES, CAR_EDGES, state, cls || 'cur', edge, 'ok', null, 64), shaft(floors, f, sym, pending, cls === 'ok' ? 'ok' : 'cur'), QUEUE('Requests still to serve (arrival order)', qItems, { 0: 'cur' }), VARS('ElevatorCar', { floor: f, state: state, floorsMoved: moved, doorTimer: extra || '-' })];
          frames.push(F(narr, parts));
        }
        snap('IDLE', '[ ]', 'The car is <b>IDLE</b> on floor ' + f + ' with doors closed. Requests will arrive in this order: <b>' + esc(toks.join(', ')) + '</b>. The car keeps a set of stops (blue ● on the right) and processes them one heartbeat (tick) at a time.');
        while (qItems.length && frames.length < 70) {
          var t = qItems[0];
          if (t === 'B' || t === 'b') { blockNext = true; qItems.shift(); snap('IDLE', '[ ]', 'Note for later: a passenger will <b>block the door</b> at the next stop (B).'); continue; }
          if (t === 'M' || t === 'm') {
            snap('MAINTENANCE', '✖', 'A <b>fault</b> is reported. Because the car is IDLE with doors closed, it is safe to switch to <b>MAINTENANCE</b>. In this state <code>acceptsCalls()</code> returns false — the dispatcher will skip this car and hall calls go to other cars.', 'IDLE-MAINTENANCE', 'bad');
            snap('MAINTENANCE', '✖', 'Technician works on the car. Every tick, <code>MAINTENANCE.onTick()</code> just returns MAINTENANCE — no if/else anywhere else had to learn about this mode.', null, 'bad');
            qItems.shift();
            snap('IDLE', '[ ]', 'Technician presses <b>reset</b> → back to <b>IDLE</b>. The car is in service again.', 'MAINTENANCE-IDLE', 'ok');
            continue;
          }
          var target = Number(t);
          if (target === f) {
            snap('DOORS_OPEN', '[< >]', 'A call for floor ' + f + ' — the car is already here. <code>IDLE.onTick()</code> sees a stop on the current floor and opens the doors immediately (no movement).', null, 'ok', 2);
          } else {
            var up = target > f, st = up ? 'MOVING_UP' : 'MOVING_DOWN';
            snap(st, up ? '▲' : '▼', 'IDLE picks a direction: the stop (' + target + ') is ' + (up ? 'above' : 'below') + ' → <b>' + st + '</b>. From now on each tick runs <code>' + st + '.onTick()</code>, which moves one floor and checks "is this floor a stop?".', 'IDLE-' + st, 'cur');
            while (f !== target) {
              f += up ? 1 : -1; moved++;
              if (f !== target) snap(st, up ? '▲' : '▼', 'Tick: moved to floor ' + f + '. Not a stop → stay ' + st + '.', null, 'cur');
            }
            snap('DOORS_OPEN', '[< >]', 'Tick: reached floor <b>' + f + '</b>, which is in the stop set → <code>arrive()</code> removes it from the set, starts the door timer (2 ticks) and the state becomes <b>DOORS_OPEN</b>.', st + '-DOORS_OPEN', 'ok', 2);
          }
          pending.splice(pending.indexOf(target), 1);
          qItems.shift();
          if (blockNext) {
            blockNext = false;
            snap('DOORS_OPEN', '[< >]', 'Door sensor reports something in the doorway. <code>DOORS_OPEN.onTick()</code> sees <code>doorBlocked()</code> and <b>resets</b> the timer instead of closing — a self-transition. Safety rule beats efficiency every time.', null, 'bad', '2 (reset)');
          }
          snap('DOORS_OPEN', '[< >]', 'Tick: door timer 2 → 1. Passengers get in and out.', null, 'cur', 1);
          snap('IDLE', '[ ]', 'Tick: timer hits 0 → doors close → <b>IDLE</b>. IDLE will look at the remaining stops on the next tick and choose a direction again (or stay idle if there is no work).', 'DOORS_OPEN-IDLE', 'cur');
        }
        snap('IDLE', '[ ]', 'All requests served. The car moved <b>' + moved + '</b> floors in total. Serving calls strictly in arrival order (like here) is simple but wasteful when calls zig-zag — the next topic compares smarter scheduling (SSTF, SCAN, LOOK).', null, 'sel');
        return frames;
      }
    },
    examples: [
      { title: 'Hall call vs car call: two kinds of request', html: `<p>${H.table(['', 'Hall call', 'Car call'], [['Pressed', 'on the floor (▲/▼)', 'inside the car (a floor number)'], ['Data', '(floor, direction)', '(car id, floor)'], ['Who decides the car?', 'the controller (dispatcher)', 'already decided — it is that car'], ['Example', 'Floor 4, ▲', 'Car B, go to 9']])}</p><p>Modelling both as one <code>Request</code> class with a nullable direction is a common mistake; the dispatcher only ever handles hall calls. Two small records keep each rule obvious.</p>`, code: { lang: 'java', code: `record HallRequest(int floor, boolean up) {}
record CarRequest(int carId, int floor) {}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class HallRequest:
    floor: int
    up: bool


@dataclass(frozen=True)
class CarRequest:
    car_id: int
    floor: int` },
          { lang: 'ts', code: `interface HallRequest { readonly floor: number; readonly up: boolean }
interface CarRequest { readonly carId: number; readonly floor: number }` },
          { lang: 'cpp', code: `struct HallRequest {
    int floor;
    bool up;
    bool operator==(const HallRequest&) const = default;
};
struct CarRequest {
    int carId;
    int floor;
    bool operator==(const CarRequest&) const = default;
};` },
  { lang: 'csharp', code: `
sealed class HallRequest {
    public readonly int Floor; public readonly bool Up;
    public HallRequest(int floor, bool up) { Floor = floor; Up = up; }
}
sealed class CarRequest {
    public readonly int CarId, Floor;
    public CarRequest(int carId, int floor) { CarId = carId; Floor = floor; }
}` }
        ] } },
      { title: 'Why a set of stops, not a FIFO queue', html: `<p>Calls arrive: 7, 2, 6 while the car is at 0. A FIFO queue forces 0→7→2→6 = 7 + 5 + 4 = <b>16 floors</b>. A sorted set lets the car serve 2 and 6 on the way up: 0→2→6→7 = <b>7 floors</b>. Also, pressing 6 three times must not create three stops — a set ignores duplicates for free. ${H.c('g', 'A sorted set (TreeSet, std::set, or a sorted list with bisect) gives higher(f)/lower(f) in O(log n)')}, exactly the "next stop above/below me" questions a lift asks.</p>` },
      { title: 'Door obstruction: the safety self-loop', html: `<p>In DOORS_OPEN, each tick checks the door sensor first. Blocked → reset timer, stay open. This rule lives in exactly one place (<code>DOORS_OPEN.onTick</code>). With flags, you would have to remember to check <code>doorBlocked</code> everywhere doors might close — and an elevator closing on a child is not a bug you get to fix later.</p>` },
      { title: 'Add-a-state follow-up: OVERLOADED', html: `<p>"If load exceeds 680 kg, keep doors open and beep." Add <b>OVERLOADED</b>: DOORS_OPEN → OVERLOADED when the weight sensor trips; OVERLOADED → DOORS_OPEN when weight drops. IDLE/MOVING states are untouched because only DOORS_OPEN can lead there — a car cannot become overloaded with closed doors.</p>`, code: { lang: 'java', code: `enum CarState2 {
    DOORS_OPEN { CarState2 onTick(Car2 c) { return c.loadKg() > 680 ? OVERLOADED : DOORS_OPEN; } },
    OVERLOADED { CarState2 onTick(Car2 c) { c.beep(); return c.loadKg() > 680 ? OVERLOADED : DOORS_OPEN; } };
    abstract CarState2 onTick(Car2 c);
}
class Car2 {
    int load = 700;
    int loadKg() { return load; }
    void beep() { System.out.println("BEEP: overloaded"); }
}`, alt: [
          { lang: 'python', code: `from enum import Enum


class Car2:
    def __init__(self) -> None:
        self.load = 700

    def load_kg(self) -> int: return self.load
    def beep(self) -> None: print("BEEP: overloaded")


class CarState2(Enum):
    DOORS_OPEN = 1
    OVERLOADED = 2

    def on_tick(self, c: Car2) -> "CarState2":
        if self is CarState2.OVERLOADED:
            c.beep()
        return CarState2.OVERLOADED if c.load_kg() > 680 else CarState2.DOORS_OPEN` },
          { lang: 'ts', code: `class Car2 {
  load = 700;
  loadKg(): number { return this.load; }
  beep(): void { console.log("BEEP: overloaded"); }
}

interface CarState2 {
  onTick(c: Car2): CarState2;
}

const DOORS_OPEN: CarState2 = { onTick: (c) => (c.loadKg() > 680 ? OVERLOADED : DOORS_OPEN) };
const OVERLOADED: CarState2 = {
  onTick: (c) => {
    c.beep();
    return c.loadKg() > 680 ? OVERLOADED : DOORS_OPEN;
  },
};` },
          { lang: 'cpp', code: `struct Car2 {
    int load = 700;
    int loadKg() const { return load; }
    void beep() const { cout << "BEEP: overloaded\\n"; }
};

enum class CarState2 { DOORS_OPEN, OVERLOADED };

CarState2 onTick(CarState2 s, const Car2& c) {
    if (s == CarState2::OVERLOADED) c.beep();
    return c.loadKg() > 680 ? CarState2::OVERLOADED : CarState2::DOORS_OPEN;
}` },
  { lang: 'csharp', code: `
using System;

abstract class CarState2 {
    public static readonly CarState2 DOORS_OPEN = new DoorsOpen2();
    public static readonly CarState2 OVERLOADED = new Overloaded2();
    public abstract CarState2 OnTick(Car2 c);
    sealed class DoorsOpen2 : CarState2 { public override CarState2 OnTick(Car2 c) { return c.LoadKg() > 680 ? OVERLOADED : DOORS_OPEN; } }
    sealed class Overloaded2 : CarState2 { public override CarState2 OnTick(Car2 c) { c.Beep(); return c.LoadKg() > 680 ? OVERLOADED : DOORS_OPEN; } }
}
class Car2 {
    public int Load = 700;
    public int LoadKg() { return Load; }
    public void Beep() { Console.WriteLine("BEEP: overloaded"); }
}` }
        ] } },
      { title: 'Display as an Observer of the car', html: `<p>Each floor has a display "▲ 5". Instead of the car calling every display, displays <b>subscribe</b> to the car: <code>car.addListener(display)</code>; on every state change the car notifies listeners with (floor, direction). New listeners (a mobile app, a building-management dashboard, a logger) plug in without changing <code>ElevatorCar</code>. State + Observer is the standard combination in elevator designs.</p>` }
    ],
    deepDive: `<p><b>Tick-driven vs event-driven.</b> Our car advances on a clock tick — easy to simulate and test deterministically (great in a machine-coding round). Real controllers are <b>event-driven</b>: sensors fire "floor 4 reached", "door closed", "weight changed"; each event is fed to the current state. Both are the same state machine; only the trigger differs. Say this out loud in interviews.</p>
<p><b>Single thread of control.</b> Buttons are pressed from many threads (floors, cars, network). Never let them mutate the car directly. Put every input into a thread-safe queue of events (<code>BlockingQueue</code>, <code>queue.Queue</code>, a mutex plus condition variable; in JavaScript the event loop is that queue) consumed by one controller per car (the <b>actor</b> or event-loop model). Then the state machine needs no locks, and events are applied in a clear order. If you must share, guard <code>addStop</code> and <code>tick</code> with one lock per car.</p>
<p><b>Illegal states must be unrepresentable.</b> With flags (isMoving, isDoorOpen) there are 2 × 2 = 4 combinations and one of them (moving with doors open) is deadly. With one <code>CarState</code> field there are exactly 5 legal states. Real lift firmware is verified exactly this way — every state has a defined door status and motor status.</p>
<p><b>Stops data structure.</b> a sorted set (<code>TreeSet</code>, <code>std::set</code>) gives O(log n) for add/remove/higher/lower; with only ~100 floors a <code>boolean[] up, down</code> pair indexed by floor is O(1) and even simpler. Many production designs keep <b>two sets</b>: stops to serve while going up, stops while going down — this is how a hall call "5▼" is <i>not</i> served by a car passing 5 on its way up (the person wants to go down; picking them up now would take them the wrong way).</p>
<p><b>Timers.</b> In production, DOORS_OPEN uses a scheduler (<code>ScheduledExecutorService</code>, <code>asyncio</code> or <code>threading.Timer</code>, <code>setTimeout</code>, a timer thread) to schedule a <code>DoorTimeout</code> event; leaving the state (exit action) cancels the scheduled future. A forgotten timer that fires in the wrong state is a classic bug — the state machine protects you because DOORS_OPEN is the only state that handles DoorTimeout; every other state ignores it.</p>
<p><b>Safety vs efficiency hierarchy.</b> Fire service &gt; maintenance &gt; door safety &gt; overload &gt; normal scheduling. Model this as a <b>hierarchical state machine</b>: a top-level FIRE_SERVICE state overrides everything; NORMAL_OPERATION contains IDLE/MOVING/DOORS_OPEN as sub-states.</p>`,
    aiEra: `<p><b>What AI changes:</b> an LLM will produce a 200-line elevator in seconds — usually a single <code>Elevator</code> class with <code>isMoving</code> and <code>doorOpen</code> booleans and a priority queue of requests. It runs, so juniors stop there. Your job is to review it like a senior: "Which combinations of these flags are illegal? Where is the door-safety rule? What happens to a hall call for 5▼ while the car goes up past 5?"</p>
<p><b>Use AI as a partner:</b> <code>Here is my CarState enum and transitions. Generate a randomized simulation that presses 1000 random buttons and asserts: doors never open while moving, every request is eventually served, the car never goes outside floors 0-9.</code> Property-based tests like this find bugs no hand-written test does — and AI is very good at writing them.</p>
<p><b>Modern buildings:</b> destination dispatch (you type your floor in the lobby and the screen says "take car C"), occupancy prediction from badge-in data, and ML models tuning dispatch weights by time of day (morning up-peak, lunch, evening down-peak). The state machine stays the same; the dispatcher gets smarter.</p>
<p><b>What you must still own:</b> the state × event table, the safety ordering, the single-thread-of-control decision, and explaining trade-offs (tick vs event, sorted set vs arrays) in your own words.</p>`,
    problems: [{
      title: 'Fire Recall Mode for an Elevator (add-a-state)', level: 'Medium', tags: ['state pattern', 'elevator', 'add-a-state'], companies: ['Amazon', 'Microsoft', 'Otis', 'Uber'],
      statement: `<p>You have a working elevator car with states IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN. Add <b>fire recall</b>: when the building's fire alarm triggers, the car must (1) drop all pending stops, (2) if doors are open, close them as soon as the door is not blocked, (3) travel non-stop to the lobby (floor 0), (4) open doors and stay parked, ignoring every call, until the alarm is reset — then return to IDLE. Implement it without adding <code>if (fire)</code> checks to the existing states.</p>`,
      constraints: `Floors 0–20. Tick-based simulation. Existing states may change only where they must react to the alarm event.`,
      example: `<p>Car at floor 6 moving up to 9. ${H.c('r', 'Alarm!')} Stops {9} cleared → state ${H.c('y', 'FIRE_RECALL')} → moves 6→5→…→0 (ignores a car call for 3 pressed on the way) → ${H.c('b', 'FIRE_PARKED')} with doors open. Hall calls rejected. ${H.c('g', 'Alarm reset')} → IDLE.</p>`,
      brute: { why: `<p>Add a boolean <code>fireMode</code> and sprinkle checks: in addStop (reject), in IDLE (go to 0), in MOVING_UP (reverse!), in MOVING_DOWN (do not stop), in DOORS_OPEN (close faster). Five places to edit; forgetting one (say MOVING_DOWN still stops at floor 3 for a car call) is a safety bug. And the combination <code>fireMode && maintenance</code> is undefined.</p>`, code: { lang: 'java', code: `class FlagCar {
    int floor = 6; boolean fireMode = false, movingUp = true, doorOpen = false;
    java.util.TreeSet<Integer> stops = new java.util.TreeSet<>();
    void tick() {
        if (fireMode) {
            if (doorOpen) doorOpen = false;
            else if (floor > 0) floor--;            // easy to forget: what if we were moving up?
            else doorOpen = true;
        } else if (movingUp) {
            floor++;
            if (stops.remove(floor)) doorOpen = true;
        }
        // ... every other branch also needs "if (fireMode)" - one missed check = safety bug
    }
}`, alt: [{ lang: 'python', code: "class FlagCar:\n    def __init__(self):\n        self.floor, self.fire_mode, self.moving_up, self.door_open = 6, False, True, False\n        self.stops = set()\n\n    def tick(self):\n        if self.fire_mode:\n            if self.door_open: self.door_open = False\n            elif self.floor > 0: self.floor -= 1        # easy to forget: what if we were moving up?\n            else: self.door_open = True\n        elif self.moving_up:\n            self.floor += 1\n            if self.floor in self.stops:\n                self.stops.remove(self.floor)\n                self.door_open = True\n        # ... every other branch also needs \"if fire_mode\" - one missed check = safety bug\n" }, { lang: 'ts', code: "class FlagCar {\n  floor = 6; fireMode = false; movingUp = true; doorOpen = false;\n  stops = new Set<number>();\n  tick(): void {\n    if (this.fireMode) {\n      if (this.doorOpen) this.doorOpen = false;\n      else if (this.floor > 0) this.floor--;            // easy to forget: what if we were moving up?\n      else this.doorOpen = true;\n    } else if (this.movingUp) {\n      this.floor++;\n      if (this.stops.delete(this.floor)) this.doorOpen = true;\n    }\n    // ... every other branch also needs \"if (fireMode)\" - one missed check = safety bug\n  }\n}\n" }, { lang: 'cpp', code: "class FlagCar {\npublic:\n    int floor = 6; bool fireMode = false, movingUp = true, doorOpen = false;\n    set<int> stops;\n    void tick() {\n        if (fireMode) {\n            if (doorOpen) doorOpen = false;\n            else if (floor > 0) floor--;            // easy to forget: what if we were moving up?\n            else doorOpen = true;\n        } else if (movingUp) {\n            floor++;\n            if (stops.erase(floor)) doorOpen = true;\n        }\n        // ... every other branch also needs \"if (fireMode)\" - one missed check = safety bug\n    }\n};\n" }, { lang: 'csharp', code: "using System.Collections.Generic;\n\nclass FlagCar {\n    public int Floor = 6; public bool FireMode = false, MovingUp = true, DoorOpen = false;\n    public SortedSet<int> Stops = new SortedSet<int>();\n    public void Tick() {\n        if (FireMode) {\n            if (DoorOpen) DoorOpen = false;\n            else if (Floor > 0) Floor--;            // easy to forget: what if we were moving up?\n            else DoorOpen = true;\n        } else if (MovingUp) {\n            Floor++;\n            if (Stops.Remove(Floor)) DoorOpen = true;\n        }\n        // ... every other branch also needs \"if (FireMode)\" - one missed check = safety bug\n    }\n}\n" }] } },
      mcq: { q: 'A passenger presses "3" inside the car during FIRE_RECALL. With the State pattern, where is this handled?', options: ['FIRE_RECALL.acceptsCalls() returns false, so addStop() rejects it — no other code changes', 'MOVING_DOWN must check a fire flag', 'The controller must filter it', 'It cannot be handled'], answer: 0, explain: 'The new states declare their own policy for calls. The context asks the current state; existing states do not know fire mode exists.' },
      hints: [`<p>Hint 1: Fire recall is really <b>two</b> new states: FIRE_RECALL (travelling to the lobby) and FIRE_PARKED (doors open, waiting for reset).</p>`, `<p>Hint 2: The alarm is an <b>outside event</b> that can arrive in any state. Handle it once in the car: <code>onFireAlarm()</code> clears stops and sets the state to FIRE_RECALL — the existing states do not need to know.</p>`, `<p>Hint 3: FIRE_RECALL.onTick: if doors open and not blocked → close; else if floor &gt; 0 → move down; else → FIRE_PARKED. Both new states answer <code>acceptsCalls()</code> with false. Reset: only FIRE_PARKED → IDLE.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "call 3 accepted? false\nFIRE_PARKED at floor 0, door open true\nreset ok? true -> IDLE\nreset again? false\nIDLE at floor 2\n" }] },
      solution: {
        approach: `<p>Model the alarm as an outside event handled by the context: it clears the stop set and jumps to <b>FIRE_RECALL</b> (doors close safely, then the car moves down without stopping). On reaching floor 0 it becomes <b>FIRE_PARKED</b> (doors open). Both new states answer <code>acceptsCalls()</code> with false, so <code>addStop</code> rejects calls without any flag. Reset is accepted only in FIRE_PARKED. The original four states are unchanged.</p>`,
        code: `import java.util.*;

enum FState {
    IDLE {
        FState onTick(FireCar c) {
            Integer up = c.stops.higher(c.floor), down = c.stops.lower(c.floor);
            if (c.stops.remove(c.floor)) { c.doorOpen = true; return DOORS_OPEN; }
            if (up != null) return MOVING_UP;
            if (down != null) return MOVING_DOWN;
            return IDLE;
        }
    },
    MOVING_UP {
        FState onTick(FireCar c) { c.floor++; if (c.stops.remove(c.floor)) { c.doorOpen = true; return DOORS_OPEN; } return MOVING_UP; }
    },
    MOVING_DOWN {
        FState onTick(FireCar c) { c.floor--; if (c.stops.remove(c.floor)) { c.doorOpen = true; return DOORS_OPEN; } return MOVING_DOWN; }
    },
    DOORS_OPEN {
        FState onTick(FireCar c) { if (c.doorBlocked) return DOORS_OPEN; c.doorOpen = false; return IDLE; }
    },
    // ---------- the two NEW states; nothing above was modified ----------
    FIRE_RECALL {
        FState onTick(FireCar c) {
            if (c.doorOpen) { if (!c.doorBlocked) c.doorOpen = false; return FIRE_RECALL; } // close safely first
            if (c.floor > 0) { c.floor--; return FIRE_RECALL; }                            // non-stop to lobby
            c.doorOpen = true;
            return FIRE_PARKED;
        }
        boolean acceptsCalls() { return false; }
    },
    FIRE_PARKED {
        FState onTick(FireCar c) { return FIRE_PARKED; }
        boolean acceptsCalls() { return false; }
    };

    abstract FState onTick(FireCar c);
    boolean acceptsCalls() { return true; }
}

class FireCar {
    int floor;
    boolean doorOpen = false, doorBlocked = false;
    final TreeSet<Integer> stops = new TreeSet<>();
    FState state = FState.IDLE;

    FireCar(int floor) { this.floor = floor; }

    boolean addStop(int f) { if (!state.acceptsCalls()) return false; stops.add(f); return true; }
    void tick() { state = state.onTick(this); }

    /** Outside event: valid in ANY state, so the context handles it once. */
    void onFireAlarm() { stops.clear(); state = FState.FIRE_RECALL; }

    /** Only a parked car may return to service. */
    boolean onAlarmReset() {
        if (state != FState.FIRE_PARKED) return false;
        doorOpen = false;
        state = FState.IDLE;
        return true;
    }

    public static void main(String[] args) {
        FireCar car = new FireCar(6);
        car.addStop(9);
        car.tick();                                  // IDLE -> MOVING_UP
        car.onFireAlarm();
        System.out.println("call 3 accepted? " + car.addStop(3));   // false
        for (int t = 0; t < 10; t++) car.tick();
        System.out.println(car.state + " at floor " + car.floor + ", door open " + car.doorOpen);
        System.out.println("reset ok? " + car.onAlarmReset() + " -> " + car.state);
        System.out.println("reset again? " + car.onAlarmReset());       // false: only a parked car resets
        car.addStop(2);
        for (int t = 0; t < 5; t++) car.tick();
        System.out.println(car.state + " at floor " + car.floor);      // back in service
    }
}`, alt: [
          { lang: 'python', code: `from enum import Enum


class FState(Enum):
    IDLE = "IDLE"
    MOVING_UP = "MOVING_UP"
    MOVING_DOWN = "MOVING_DOWN"
    DOORS_OPEN = "DOORS_OPEN"
    # ---------- the two NEW states; nothing above was modified ----------
    FIRE_RECALL = "FIRE_RECALL"
    FIRE_PARKED = "FIRE_PARKED"

    def on_tick(self, c: "FireCar") -> "FState":
        match self:
            case FState.IDLE:
                if c.floor in c.stops:
                    c.stops.discard(c.floor)
                    c.door_open = True
                    return FState.DOORS_OPEN
                if any(f > c.floor for f in c.stops):
                    return FState.MOVING_UP
                if any(f < c.floor for f in c.stops):
                    return FState.MOVING_DOWN
                return FState.IDLE
            case FState.MOVING_UP | FState.MOVING_DOWN:
                c.floor += 1 if self is FState.MOVING_UP else -1
                if c.floor in c.stops:
                    c.stops.discard(c.floor)
                    c.door_open = True
                    return FState.DOORS_OPEN
                return self
            case FState.DOORS_OPEN:
                if c.door_blocked:
                    return FState.DOORS_OPEN
                c.door_open = False
                return FState.IDLE
            case FState.FIRE_RECALL:
                if c.door_open:  # close safely first
                    if not c.door_blocked:
                        c.door_open = False
                    return FState.FIRE_RECALL
                if c.floor > 0:  # non-stop to lobby
                    c.floor -= 1
                    return FState.FIRE_RECALL
                c.door_open = True
                return FState.FIRE_PARKED
            case _:  # FIRE_PARKED
                return FState.FIRE_PARKED

    def accepts_calls(self) -> bool:
        return self not in (FState.FIRE_RECALL, FState.FIRE_PARKED)


class FireCar:
    def __init__(self, floor: int) -> None:
        self.floor = floor
        self.door_open = False
        self.door_blocked = False
        self.stops: set[int] = set()
        self.state = FState.IDLE

    def add_stop(self, f: int) -> bool:
        if not self.state.accepts_calls():
            return False
        self.stops.add(f)
        return True

    def tick(self) -> None:
        self.state = self.state.on_tick(self)

    def on_fire_alarm(self) -> None:
        """Outside event: valid in ANY state, so the context handles it once."""
        self.stops.clear()
        self.state = FState.FIRE_RECALL

    def on_alarm_reset(self) -> bool:
        """Only a parked car may return to service."""
        if self.state is not FState.FIRE_PARKED:
            return False
        self.door_open = False
        self.state = FState.IDLE
        return True


if __name__ == "__main__":
    car = FireCar(6)
    car.add_stop(9)
    car.tick()  # IDLE -> MOVING_UP
    car.on_fire_alarm()
    print("call 3 accepted?", str(car.add_stop(3)).lower())  # false
    for _ in range(10):
        car.tick()
    print(f"{car.state.name} at floor {car.floor}, door open {str(car.door_open).lower()}")
    ok = car.on_alarm_reset()
    print(f"reset ok? {str(ok).lower()} -> {car.state.name}")
    print("reset again?", str(car.on_alarm_reset()).lower())  # false: only a parked car resets
    car.add_stop(2)
    for _ in range(5):
        car.tick()
    print(f"{car.state.name} at floor {car.floor}")  # back in service` },
          { lang: 'ts', code: `interface FState {
  readonly name: string;
  onTick(c: FireCar): FState;
  acceptsCalls(): boolean;
}

// Each state is an object literal: behaviour lives next to the state it belongs to.
function state(name: string, onTick: (c: FireCar) => FState, acceptsCalls = true): FState {
  return { name, onTick, acceptsCalls: () => acceptsCalls };
}

const IDLE: FState = state("IDLE", (c) => {
  if (c.stops.delete(c.floor)) { c.doorOpen = true; return DOORS_OPEN; }
  if ([...c.stops].some((f) => f > c.floor)) return MOVING_UP;
  if ([...c.stops].some((f) => f < c.floor)) return MOVING_DOWN;
  return IDLE;
});
const MOVING_UP: FState = state("MOVING_UP", (c) => {
  c.floor++;
  if (c.stops.delete(c.floor)) { c.doorOpen = true; return DOORS_OPEN; }
  return MOVING_UP;
});
const MOVING_DOWN: FState = state("MOVING_DOWN", (c) => {
  c.floor--;
  if (c.stops.delete(c.floor)) { c.doorOpen = true; return DOORS_OPEN; }
  return MOVING_DOWN;
});
const DOORS_OPEN: FState = state("DOORS_OPEN", (c) => {
  if (c.doorBlocked) return DOORS_OPEN;
  c.doorOpen = false;
  return IDLE;
});
// ---------- the two NEW states; nothing above was modified ----------
const FIRE_RECALL: FState = state("FIRE_RECALL", (c) => {
  if (c.doorOpen) { if (!c.doorBlocked) c.doorOpen = false; return FIRE_RECALL; } // close safely first
  if (c.floor > 0) { c.floor--; return FIRE_RECALL; } // non-stop to lobby
  c.doorOpen = true;
  return FIRE_PARKED;
}, false);
const FIRE_PARKED: FState = state("FIRE_PARKED", () => FIRE_PARKED, false);

class FireCar {
  doorOpen = false;
  doorBlocked = false;
  readonly stops = new Set<number>();
  state: FState = IDLE;

  constructor(public floor: number) {}

  addStop(f: number): boolean {
    if (!this.state.acceptsCalls()) return false;
    this.stops.add(f);
    return true;
  }
  tick(): void { this.state = this.state.onTick(this); }

  /** Outside event: valid in ANY state, so the context handles it once. */
  onFireAlarm(): void { this.stops.clear(); this.state = FIRE_RECALL; }

  /** Only a parked car may return to service. */
  onAlarmReset(): boolean {
    if (this.state !== FIRE_PARKED) return false;
    this.doorOpen = false;
    this.state = IDLE;
    return true;
  }
}

const car = new FireCar(6);
car.addStop(9);
car.tick(); // IDLE -> MOVING_UP
car.onFireAlarm();
console.log("call 3 accepted? " + car.addStop(3)); // false
for (let t = 0; t < 10; t++) car.tick();
console.log(\`\${car.state.name} at floor \${car.floor}, door open \${car.doorOpen}\`);
const ok = car.onAlarmReset();
console.log(\`reset ok? \${ok} -> \${car.state.name}\`);
console.log("reset again? " + car.onAlarmReset()); // false: only a parked car resets
car.addStop(2);
for (let t = 0; t < 5; t++) car.tick();
console.log(\`\${car.state.name} at floor \${car.floor}\`); // back in service` },
          { lang: 'cpp', code: `enum class FState { IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, FIRE_RECALL, FIRE_PARKED };  // last two are NEW

const char* toString(FState s) {
    static const char* names[] = {"IDLE", "MOVING_UP", "MOVING_DOWN", "DOORS_OPEN", "FIRE_RECALL", "FIRE_PARKED"};
    return names[static_cast<int>(s)];
}

struct FireCar {
    int floor;
    bool doorOpen = false, doorBlocked = false;
    set<int> stops;
    FState state = FState::IDLE;

    explicit FireCar(int floor) : floor(floor) {}

    static bool acceptsCalls(FState s) { return s != FState::FIRE_RECALL && s != FState::FIRE_PARKED; }

    bool addStop(int f) {
        if (!acceptsCalls(state)) return false;
        stops.insert(f);
        return true;
    }

    FState onTick() {
        switch (state) {
            case FState::IDLE:
                if (stops.erase(floor)) { doorOpen = true; return FState::DOORS_OPEN; }
                if (stops.upper_bound(floor) != stops.end()) return FState::MOVING_UP;
                if (stops.begin() != stops.end() && *stops.begin() < floor) return FState::MOVING_DOWN;
                return FState::IDLE;
            case FState::MOVING_UP:
            case FState::MOVING_DOWN:
                floor += state == FState::MOVING_UP ? 1 : -1;
                if (stops.erase(floor)) { doorOpen = true; return FState::DOORS_OPEN; }
                return state;
            case FState::DOORS_OPEN:
                if (doorBlocked) return FState::DOORS_OPEN;
                doorOpen = false;
                return FState::IDLE;
            case FState::FIRE_RECALL:
                if (doorOpen) { if (!doorBlocked) doorOpen = false; return FState::FIRE_RECALL; }  // close safely first
                if (floor > 0) { floor--; return FState::FIRE_RECALL; }                            // non-stop to lobby
                doorOpen = true;
                return FState::FIRE_PARKED;
            case FState::FIRE_PARKED:
                return FState::FIRE_PARKED;
        }
        return state;
    }

    void tick() { state = onTick(); }

    // Outside event: valid in ANY state, so the context handles it once.
    void onFireAlarm() { stops.clear(); state = FState::FIRE_RECALL; }

    // Only a parked car may return to service.
    bool onAlarmReset() {
        if (state != FState::FIRE_PARKED) return false;
        doorOpen = false;
        state = FState::IDLE;
        return true;
    }
};

int main() {
    cout << boolalpha;
    FireCar car(6);
    car.addStop(9);
    car.tick();  // IDLE -> MOVING_UP
    car.onFireAlarm();
    cout << "call 3 accepted? " << car.addStop(3) << "\\n";  // false
    for (int t = 0; t < 10; t++) car.tick();
    cout << toString(car.state) << " at floor " << car.floor << ", door open " << car.doorOpen << "\\n";
    bool ok = car.onAlarmReset();
    cout << "reset ok? " << ok << " -> " << toString(car.state) << "\\n";
    cout << "reset again? " << car.onAlarmReset() << "\\n";  // false: only a parked car resets
    car.addStop(2);
    for (int t = 0; t < 5; t++) car.tick();
    cout << toString(car.state) << " at floor " << car.floor << "\\n";  // back in service
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

abstract class FState {
    public static readonly FState IDLE = new IdleS();
    public static readonly FState MOVING_UP = new MovingUpS();
    public static readonly FState MOVING_DOWN = new MovingDownS();
    public static readonly FState DOORS_OPEN = new DoorsOpenS();
    // ---------- the two NEW states; nothing above was modified ----------
    public static readonly FState FIRE_RECALL = new FireRecallS();
    public static readonly FState FIRE_PARKED = new FireParkedS();

    private readonly string name;
    private FState(string name) { this.name = name; }
    public abstract FState OnTick(FireCar c);
    public virtual bool AcceptsCalls() { return true; }
    public override string ToString() { return name; }

    sealed class IdleS : FState {
        public IdleS() : base("IDLE") { }
        public override FState OnTick(FireCar c) {
            bool up = c.Stops.GetViewBetween(c.Floor + 1, int.MaxValue).Count > 0, down = c.Stops.GetViewBetween(int.MinValue, c.Floor - 1).Count > 0;
            if (c.Stops.Remove(c.Floor)) { c.DoorOpen = true; return DOORS_OPEN; }
            if (up) return MOVING_UP;
            if (down) return MOVING_DOWN;
            return IDLE;
        }
    }
    sealed class MovingUpS : FState {
        public MovingUpS() : base("MOVING_UP") { }
        public override FState OnTick(FireCar c) { c.Floor++; if (c.Stops.Remove(c.Floor)) { c.DoorOpen = true; return DOORS_OPEN; } return MOVING_UP; }
    }
    sealed class MovingDownS : FState {
        public MovingDownS() : base("MOVING_DOWN") { }
        public override FState OnTick(FireCar c) { c.Floor--; if (c.Stops.Remove(c.Floor)) { c.DoorOpen = true; return DOORS_OPEN; } return MOVING_DOWN; }
    }
    sealed class DoorsOpenS : FState {
        public DoorsOpenS() : base("DOORS_OPEN") { }
        public override FState OnTick(FireCar c) { if (c.DoorBlocked) return DOORS_OPEN; c.DoorOpen = false; return IDLE; }
    }
    sealed class FireRecallS : FState {
        public FireRecallS() : base("FIRE_RECALL") { }
        public override FState OnTick(FireCar c) {
            if (c.DoorOpen) { if (!c.DoorBlocked) c.DoorOpen = false; return FIRE_RECALL; } // close safely first
            if (c.Floor > 0) { c.Floor--; return FIRE_RECALL; }                            // non-stop to lobby
            c.DoorOpen = true;
            return FIRE_PARKED;
        }
        public override bool AcceptsCalls() { return false; }
    }
    sealed class FireParkedS : FState {
        public FireParkedS() : base("FIRE_PARKED") { }
        public override FState OnTick(FireCar c) { return FIRE_PARKED; }
        public override bool AcceptsCalls() { return false; }
    }
}

class FireCar {
    public int Floor;
    public bool DoorOpen = false, DoorBlocked = false;
    public readonly SortedSet<int> Stops = new SortedSet<int>();
    public FState State = FState.IDLE;

    public FireCar(int floor) { Floor = floor; }

    public bool AddStop(int f) { if (!State.AcceptsCalls()) return false; Stops.Add(f); return true; }
    public void Tick() { State = State.OnTick(this); }

    /// Outside event: valid in ANY state, so the context handles it once.
    public void OnFireAlarm() { Stops.Clear(); State = FState.FIRE_RECALL; }

    /// Only a parked car may return to service.
    public bool OnAlarmReset() {
        if (State != FState.FIRE_PARKED) return false;
        DoorOpen = false;
        State = FState.IDLE;
        return true;
    }

    static string B(bool b) { return b.ToString().ToLower(); }

    static void Main() {
        FireCar car = new FireCar(6);
        car.AddStop(9);
        car.Tick();                                  // IDLE -> MOVING_UP
        car.OnFireAlarm();
        Console.WriteLine("call 3 accepted? " + B(car.AddStop(3)));   // false
        for (int t = 0; t < 10; t++) car.Tick();
        Console.WriteLine(car.State + " at floor " + car.Floor + ", door open " + B(car.DoorOpen));
        Console.WriteLine("reset ok? " + B(car.OnAlarmReset()) + " -> " + car.State);
        Console.WriteLine("reset again? " + B(car.OnAlarmReset()));       // false: only a parked car resets
        car.AddStop(2);
        for (int t = 0; t < 5; t++) car.Tick();
        Console.WriteLine(car.State + " at floor " + car.Floor);      // back in service
    }
}` }
        ],
        complexity: `<p>Each tick is O(log n) for the sorted-set operations; recall takes at most (current floor + 1) ticks. Adding the mode cost 2 new enum constants and 2 context methods; the four existing states were not edited.</p>`,
        followUps: ['Firefighters use a key to drive the car manually (Phase II). Model it as another state — what does it accept?', 'With 4 cars, should all recall at once or one by one? Who coordinates?', 'Should a car already in MAINTENANCE also recall? How would a hierarchical state machine express priority?']
      }
    }]
  });

  /* ======================= TOPIC 3: ELEVATOR SCHEDULING ======================= */
  // Plan the waypoints for a scheduling algorithm. Requests are all known at time 0 (like disk scheduling).
  function liftPlan(algo, start, dir, reqs, top) {
    var uniq = []; reqs.forEach(function (r) { if (uniq.indexOf(r) < 0) uniq.push(r); });
    var asc = uniq.slice().sort(function (a, b) { return a - b; });
    var out = [], d = dir, cur = start, i;
    if (algo === 'FCFS') out = uniq.slice();
    else if (algo === 'SSTF') {
      var left = asc.slice();
      while (left.length) {
        var best = -1, bd = 1e9;
        for (i = 0; i < left.length; i++) {
          var dist = Math.abs(left[i] - cur), goesUp = left[i] >= cur;
          if (dist < bd || (dist === bd && ((d === 'up') === goesUp))) { bd = dist; best = i; }
        }
        var nx = left.splice(best, 1)[0];
        if (nx !== cur) d = nx > cur ? 'up' : 'down';
        out.push(nx); cur = nx;
      }
    } else {
      var first, second, end;
      if (dir === 'up') { first = asc.filter(function (x) { return x >= start; }); second = asc.filter(function (x) { return x < start; }).reverse(); end = top; }
      else { first = asc.filter(function (x) { return x <= start; }).reverse(); second = asc.filter(function (x) { return x > start; }); end = 0; }
      out = first.slice();
      if (algo === 'SCAN' && second.length && (!first.length || first[first.length - 1] !== end)) out.push('E' + end);
      out = out.concat(second);
    }
    // compute distance + wait (floors travelled before each request is served)
    var pos = start, total = 0, wait = {}, ws = [];
    out.forEach(function (w) {
      var f = typeof w === 'string' ? Number(w.slice(1)) : w;
      total += Math.abs(f - pos); pos = f;
      if (typeof w !== 'string' && wait[w] === undefined) { wait[w] = total; ws.push(total); }
    });
    var avg = ws.length ? ws.reduce(function (a, b) { return a + b; }, 0) / ws.length : 0;
    return { route: out, total: total, avgWait: Math.round(avg * 10) / 10, maxWait: ws.length ? Math.max.apply(null, ws) : 0 };
  }
  function liftGrid(top, carFloor, sym, waiting, served, cls, trail) {
    var rows = [], rh = [], hl = {};
    for (var f = top; f >= 0; f--) {
      var r = top - f;
      rh.push('Floor ' + f);
      var st = waiting.indexOf(f) >= 0 ? '● waiting' : served.indexOf(f) >= 0 ? '✓ served' : '';
      rows.push([f === carFloor ? sym : (trail && trail.indexOf(f) >= 0 ? '·' : ''), st]);
      if (f === carFloor) hl[r + ',0'] = cls || 'cur';
      if (waiting.indexOf(f) >= 0) hl[r + ',1'] = 'win';
      if (served.indexOf(f) >= 0) hl[r + ',1'] = 'ok';
    }
    return { type: 'grid', label: 'Shaft (· = floors already travelled)', rows: rows, rowHead: rh, colHead: ['car', 'request'], hl: hl };
  }

  topics.push({
    title: 'Elevator System II: Scheduling Strategies (FCFS, SSTF, SCAN, LOOK) and Multi-Car Dispatch',
    analogy: `<p>Imagine a <b>delivery rider with five parcels</b> for houses on one long street. He could deliver in the order the orders came in (zig-zagging up and down the street), or always ride to the <b>nearest</b> house next (fast, but the house at the far end may wait forever if new nearby orders keep coming), or ride <b>to the end of the street and back</b> like a bus, or ride only <b>as far as the last parcel</b> in that direction and then turn around. Those four habits are FCFS, SSTF, SCAN and LOOK — and an elevator is just a rider on a vertical street.</p>`,
    explain: `<p>The car state machine (previous topic) says <i>how</i> to move. The <b>scheduling strategy</b> says <i>where to go next</i>. Because the rule changes (office morning rush vs. hospital vs. night mode), it belongs behind a <b>Strategy</b> interface — State and Strategy working together.</p>
${H.table(['Strategy', 'Rule in plain words', 'Good', 'Bad'], [
  ['<b>FCFS</b> (first come first served)', 'serve requests in arrival order', 'perfectly fair, trivial', 'zig-zags; huge travel'],
  ['<b>SSTF</b> (shortest seek time first)', 'always go to the nearest request', 'low total travel', 'far floors can <b>starve</b>'],
  ['<b>SCAN</b> ("elevator algorithm")', 'keep going one way to the <b>end floor</b>, serving on the way, then reverse', 'no starvation, predictable', 'rides to the top even if nobody is there'],
  ['<b>LOOK</b>', 'like SCAN, but turn around at the <b>last request</b> in that direction', 'no starvation and less waste', 'slightly more bookkeeping']
])}
<p><b>Worked example</b>: car at floor <b>5</b> going ▲, requests arrive as <b>8, 2, 6, 1, 4</b>, floors 0–9.</p>
${H.table(['Strategy', 'Stops in order', 'Floors travelled'], [
  ['FCFS', '5 → 8 → 2 → 6 → 1 → 4', '3+6+4+5+3 = ' + H.c('r', '21')],
  ['SSTF', '5 → 6 → 8 → 4 → 2 → 1', '1+2+4+2+1 = ' + H.c('g', '10')],
  ['SCAN', '5 → 6 → 8 → <i>9 (end)</i> → 4 → 2 → 1', '1+2+1+5+2+1 = ' + H.c('y', '12')],
  ['LOOK', '5 → 6 → 8 → 4 → 2 → 1', '1+2+4+2+1 = ' + H.c('g', '10')]
])}
<p>SSTF and LOOK tie here, but SSTF has no direction memory: if people keep pressing floors near the car, someone waiting at floor 0 may <b>never</b> be served (starvation). LOOK guarantees every waiting request is reached within one full sweep up and one down. That is why real elevators use SCAN/LOOK-style "<b>collective control</b>": keep moving in your direction while there are calls ahead; reverse only when there are none.</p>
<p><b>Directional hall calls matter.</b> A person at floor 4 pressing ▼ while the car goes up past 4 should <b>not</b> be picked up (they would ride up first). So the car keeps two sets: <code>upStops</code> and <code>downStops</code>; on the way up it serves car calls + ▲ hall calls; ▼ calls wait for the down sweep.</p>
<p><b>Many cars → a dispatcher.</b> A hall call must be assigned to one car. The dispatcher computes a <b>cost</b> per car — estimated travel time to reach the caller given its current direction (idle: plain distance; moving toward the caller in the same direction: distance; otherwise: finish the sweep and come back) plus a small load penalty — and picks the cheapest. Also a Strategy: <code>NearestCar</code>, <code>ZoneBased</code> (car A serves 0–10, car B 11–20), <code>DestinationDispatch</code>.</p>`,
    clues: [
      '"Minimise waiting time" / "minimise travel" / "avoid starvation" in an elevator prompt → compare SSTF vs SCAN/LOOK out loud.',
      '"The scheduling algorithm should be configurable" → <code>SchedulingStrategy</code> interface (Strategy pattern) plugged into the car/controller.',
      '"Multiple elevators" → a <b>dispatcher</b> with a cost function; the car-level scheduling stays per car.',
      '"Morning rush everybody goes up from the lobby" → zoning / up-peak mode = a different dispatch strategy, swapped at runtime.',
      'Disk-scheduling words (seek time, head, cylinder) mean the same algorithms — FCFS/SSTF/SCAN/C-SCAN/LOOK/C-LOOK.',
      '"Requests keep arriving while moving" → online problem: keep a sorted set per direction and re-plan each tick rather than computing one fixed route.'
    ],
    code: [{ lang: 'java', title: 'Pluggable scheduling strategies + comparison', code: `import java.util.*;

enum Dir { UP, DOWN }

/** Strategy: given where the car is, plan the waypoints it will visit. */
interface SchedulingStrategy {
    String name();
    List<Integer> route(int start, Dir dir, List<Integer> requests, int topFloor);
}

class Fcfs implements SchedulingStrategy {
    public String name() { return "FCFS"; }
    public List<Integer> route(int start, Dir dir, List<Integer> req, int top) {
        return new ArrayList<>(new LinkedHashSet<>(req));        // arrival order, duplicates removed
    }
}

class Sstf implements SchedulingStrategy {
    public String name() { return "SSTF"; }
    public List<Integer> route(int start, Dir dir, List<Integer> req, int top) {
        TreeSet<Integer> left = new TreeSet<>(req);
        List<Integer> out = new ArrayList<>();
        int cur = start;
        Dir d = dir;
        while (!left.isEmpty()) {
            Integer lo = left.floor(cur), hi = left.ceiling(cur);  // nearest below / above in O(log n)
            int dDown = lo == null ? Integer.MAX_VALUE : cur - lo;
            int dUp = hi == null ? Integer.MAX_VALUE : hi - cur;
            int next;
            if (dUp < dDown || (dUp == dDown && d == Dir.UP)) { next = hi; d = Dir.UP; }
            else { next = lo; d = Dir.DOWN; }                       // tie -> keep current direction
            out.add(next);
            left.remove(next);
            cur = next;
        }
        return out;
    }
}

class Look implements SchedulingStrategy {
    public String name() { return "LOOK"; }
    public List<Integer> route(int start, Dir dir, List<Integer> req, int top) {
        TreeSet<Integer> s = new TreeSet<>(req);
        List<Integer> out = new ArrayList<>();
        if (dir == Dir.UP) {
            out.addAll(s.tailSet(start, true));                   // everything at/above, ascending
            out.addAll(s.headSet(start, false).descendingSet());  // then turn at the LAST request
        } else {
            out.addAll(s.headSet(start, true).descendingSet());
            out.addAll(s.tailSet(start, false));
        }
        return out;
    }
}

class Scan implements SchedulingStrategy {
    public String name() { return "SCAN"; }
    public List<Integer> route(int start, Dir dir, List<Integer> req, int top) {
        TreeSet<Integer> s = new TreeSet<>(req);
        List<Integer> first = new ArrayList<>(), second = new ArrayList<>();
        int end;
        if (dir == Dir.UP) { first.addAll(s.tailSet(start, true)); second.addAll(s.headSet(start, false).descendingSet()); end = top; }
        else { first.addAll(s.headSet(start, true).descendingSet()); second.addAll(s.tailSet(start, false)); end = 0; }
        List<Integer> out = new ArrayList<>(first);
        boolean alreadyAtEnd = !first.isEmpty() && first.get(first.size() - 1) == end;
        if (!second.isEmpty() && !alreadyAtEnd) out.add(end);    // ride all the way to the end floor
        out.addAll(second);
        return out;
    }
}

class SchedulerBench {
    static int distance(int start, List<Integer> route) {
        int total = 0, pos = start;
        for (int f : route) { total += Math.abs(f - pos); pos = f; }
        return total;
    }

    public static void main(String[] args) {
        List<Integer> req = List.of(8, 2, 6, 1, 4);
        for (SchedulingStrategy s : List.of(new Fcfs(), new Sstf(), new Scan(), new Look())) {
            List<Integer> r = s.route(5, Dir.UP, req, 9);
            System.out.printf("%-4s route=%s floors=%d%n", s.name(), r, distance(5, r));
        }
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from enum import Enum


class Dir(Enum):
    UP = 1
    DOWN = 2


class SchedulingStrategy(ABC):
    """Strategy: given where the car is, plan the waypoints it will visit."""

    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def route(self, start: int, direction: Dir, requests: list[int], top: int) -> list[int]: ...


class Fcfs(SchedulingStrategy):
    def name(self) -> str: return "FCFS"

    def route(self, start: int, direction: Dir, requests: list[int], top: int) -> list[int]:
        return list(dict.fromkeys(requests))  # arrival order, duplicates removed


class Sstf(SchedulingStrategy):
    def name(self) -> str: return "SSTF"

    def route(self, start: int, direction: Dir, requests: list[int], top: int) -> list[int]:
        left = set(requests)
        out: list[int] = []
        cur, d = start, direction
        while left:
            lo = max((f for f in left if f <= cur), default=None)  # nearest below / above
            hi = min((f for f in left if f >= cur), default=None)
            d_down = float("inf") if lo is None else cur - lo
            d_up = float("inf") if hi is None else hi - cur
            if d_up < d_down or (d_up == d_down and d is Dir.UP):
                nxt, d = hi, Dir.UP
            else:
                nxt, d = lo, Dir.DOWN  # tie -> keep current direction
            out.append(nxt)
            left.remove(nxt)
            cur = nxt
        return out


class Look(SchedulingStrategy):
    def name(self) -> str: return "LOOK"

    def route(self, start: int, direction: Dir, requests: list[int], top: int) -> list[int]:
        s = sorted(set(requests))
        if direction is Dir.UP:
            # everything at/above ascending, then turn at the LAST request
            return [f for f in s if f >= start] + [f for f in reversed(s) if f < start]
        return [f for f in reversed(s) if f <= start] + [f for f in s if f > start]


class Scan(SchedulingStrategy):
    def name(self) -> str: return "SCAN"

    def route(self, start: int, direction: Dir, requests: list[int], top: int) -> list[int]:
        s = sorted(set(requests))
        if direction is Dir.UP:
            first, second, end = [f for f in s if f >= start], [f for f in reversed(s) if f < start], top
        else:
            first, second, end = [f for f in reversed(s) if f <= start], [f for f in s if f > start], 0
        out = list(first)
        already_at_end = bool(first) and first[-1] == end
        if second and not already_at_end:
            out.append(end)  # ride all the way to the end floor
        return out + second


def distance(start: int, route: list[int]) -> int:
    total, pos = 0, start
    for f in route:
        total += abs(f - pos)
        pos = f
    return total


if __name__ == "__main__":
    req = [8, 2, 6, 1, 4]
    for s in (Fcfs(), Sstf(), Scan(), Look()):
        r = s.route(5, Dir.UP, req, 9)
        print(f"{s.name():<4} route={r} floors={distance(5, r)}")` },
          { lang: 'ts', code: `type Dir = "UP" | "DOWN";

/** Strategy: given where the car is, plan the waypoints it will visit. */
interface SchedulingStrategy {
  name(): string;
  route(start: number, dir: Dir, requests: number[], topFloor: number): number[];
}

const sortedUnique = (xs: number[]): number[] => [...new Set(xs)].sort((a, b) => a - b);

class Fcfs implements SchedulingStrategy {
  name(): string { return "FCFS"; }
  route(start: number, dir: Dir, req: number[], top: number): number[] {
    return [...new Set(req)]; // arrival order, duplicates removed
  }
}

class Sstf implements SchedulingStrategy {
  name(): string { return "SSTF"; }
  route(start: number, dir: Dir, req: number[], top: number): number[] {
    const left = new Set(req);
    const out: number[] = [];
    let cur = start;
    let d = dir;
    while (left.size > 0) {
      const below = [...left].filter((f) => f <= cur), above = [...left].filter((f) => f >= cur);
      const lo = below.length ? Math.max(...below) : null; // nearest below / above
      const hi = above.length ? Math.min(...above) : null;
      const dDown = lo === null ? Infinity : cur - lo;
      const dUp = hi === null ? Infinity : hi - cur;
      let next: number;
      if (dUp < dDown || (dUp === dDown && d === "UP")) { next = hi!; d = "UP"; }
      else { next = lo!; d = "DOWN"; } // tie -> keep current direction
      out.push(next);
      left.delete(next);
      cur = next;
    }
    return out;
  }
}

class Look implements SchedulingStrategy {
  name(): string { return "LOOK"; }
  route(start: number, dir: Dir, req: number[], top: number): number[] {
    const s = sortedUnique(req), desc = [...s].reverse();
    return dir === "UP"
      ? [...s.filter((f) => f >= start), ...desc.filter((f) => f < start)] // turn at the LAST request
      : [...desc.filter((f) => f <= start), ...s.filter((f) => f > start)];
  }
}

class Scan implements SchedulingStrategy {
  name(): string { return "SCAN"; }
  route(start: number, dir: Dir, req: number[], top: number): number[] {
    const s = sortedUnique(req), desc = [...s].reverse();
    const up = dir === "UP";
    const first = up ? s.filter((f) => f >= start) : desc.filter((f) => f <= start);
    const second = up ? desc.filter((f) => f < start) : s.filter((f) => f > start);
    const end = up ? top : 0;
    const out = [...first];
    const alreadyAtEnd = first.length > 0 && first[first.length - 1] === end;
    if (second.length > 0 && !alreadyAtEnd) out.push(end); // ride all the way to the end floor
    return [...out, ...second];
  }
}

function distance(start: number, route: number[]): number {
  let total = 0, pos = start;
  for (const f of route) { total += Math.abs(f - pos); pos = f; }
  return total;
}

const req = [8, 2, 6, 1, 4];
const strategies: SchedulingStrategy[] = [new Fcfs(), new Sstf(), new Scan(), new Look()];
for (const s of strategies) {
  const r = s.route(5, "UP", req, 9);
  console.log(\`\${s.name().padEnd(4)} route=[\${r.join(", ")}] floors=\${distance(5, r)}\`);
}` },
          { lang: 'cpp', code: `enum class Dir { UP, DOWN };

// Strategy: given where the car is, plan the waypoints it will visit.
struct SchedulingStrategy {
    virtual ~SchedulingStrategy() = default;
    virtual string name() const = 0;
    virtual vector<int> route(int start, Dir dir, const vector<int>& requests, int topFloor) const = 0;
};

struct Fcfs final : SchedulingStrategy {
    string name() const override { return "FCFS"; }
    vector<int> route(int, Dir, const vector<int>& req, int) const override {
        vector<int> out;
        for (int f : req) if (find(out.begin(), out.end(), f) == out.end()) out.push_back(f);  // arrival order, no duplicates
        return out;
    }
};

struct Sstf final : SchedulingStrategy {
    string name() const override { return "SSTF"; }
    vector<int> route(int start, Dir dir, const vector<int>& req, int) const override {
        set<int> left(req.begin(), req.end());
        vector<int> out;
        int cur = start;
        Dir d = dir;
        while (!left.empty()) {
            auto hi = left.lower_bound(cur);  // nearest above / below in O(log n)
            auto lo = left.upper_bound(cur);
            bool hasLo = lo != left.begin();
            if (hasLo) --lo;
            int dDown = hasLo ? cur - *lo : INT_MAX;
            int dUp = hi != left.end() ? *hi - cur : INT_MAX;
            int next;
            if (dUp < dDown || (dUp == dDown && d == Dir::UP)) { next = *hi; d = Dir::UP; }
            else { next = *lo; d = Dir::DOWN; }  // tie -> keep current direction
            out.push_back(next);
            left.erase(next);
            cur = next;
        }
        return out;
    }
};

struct Look final : SchedulingStrategy {
    string name() const override { return "LOOK"; }
    vector<int> route(int start, Dir dir, const vector<int>& req, int) const override {
        set<int> s(req.begin(), req.end());
        vector<int> out;
        if (dir == Dir::UP) {
            for (auto it = s.lower_bound(start); it != s.end(); ++it) out.push_back(*it);  // at/above, ascending
            for (auto it = s.lower_bound(start); it != s.begin();) out.push_back(*--it);    // then turn at the LAST request
        } else {
            for (auto it = s.upper_bound(start); it != s.begin();) out.push_back(*--it);
            for (auto it = s.upper_bound(start); it != s.end(); ++it) out.push_back(*it);
        }
        return out;
    }
};

struct Scan final : SchedulingStrategy {
    string name() const override { return "SCAN"; }
    vector<int> route(int start, Dir dir, const vector<int>& req, int top) const override {
        set<int> s(req.begin(), req.end());
        vector<int> first, second;
        int end;
        if (dir == Dir::UP) {
            for (auto it = s.lower_bound(start); it != s.end(); ++it) first.push_back(*it);
            for (auto it = s.lower_bound(start); it != s.begin();) second.push_back(*--it);
            end = top;
        } else {
            for (auto it = s.upper_bound(start); it != s.begin();) first.push_back(*--it);
            for (auto it = s.upper_bound(start); it != s.end(); ++it) second.push_back(*it);
            end = 0;
        }
        vector<int> out = first;
        bool alreadyAtEnd = !first.empty() && first.back() == end;
        if (!second.empty() && !alreadyAtEnd) out.push_back(end);  // ride all the way to the end floor
        out.insert(out.end(), second.begin(), second.end());
        return out;
    }
};

int distance(int start, const vector<int>& route) {
    int total = 0, pos = start;
    for (int f : route) { total += abs(f - pos); pos = f; }
    return total;
}

int main() {
    vector<int> req = {8, 2, 6, 1, 4};
    vector<unique_ptr<SchedulingStrategy>> strategies;
    strategies.push_back(make_unique<Fcfs>());
    strategies.push_back(make_unique<Sstf>());
    strategies.push_back(make_unique<Scan>());
    strategies.push_back(make_unique<Look>());
    for (const auto& s : strategies) {
        vector<int> r = s->route(5, Dir::UP, req, 9);
        cout << left << setw(4) << s->name() << " route=[";
        for (size_t i = 0; i < r.size(); i++) cout << (i ? ", " : "") << r[i];
        cout << "] floors=" << distance(5, r) << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

enum Dir { UP, DOWN }

/// Strategy: given where the car is, plan the waypoints it will visit.
interface ISchedulingStrategy {
    string Name();
    List<int> Route(int start, Dir dir, List<int> requests, int topFloor);
}

class Fcfs : ISchedulingStrategy {
    public string Name() { return "FCFS"; }
    public List<int> Route(int start, Dir dir, List<int> req, int top) {
        return req.Distinct().ToList();                            // arrival order, duplicates removed
    }
}

class Sstf : ISchedulingStrategy {
    public string Name() { return "SSTF"; }
    public List<int> Route(int start, Dir dir, List<int> req, int top) {
        SortedSet<int> left = new SortedSet<int>(req);
        List<int> result = new List<int>();
        int cur = start;
        Dir d = dir;
        while (left.Count > 0) {
            int? lo = left.GetViewBetween(int.MinValue, cur).Count > 0 ? left.GetViewBetween(int.MinValue, cur).Max : (int?)null;   // nearest below (floor)
            int? hi = left.GetViewBetween(cur, int.MaxValue).Count > 0 ? left.GetViewBetween(cur, int.MaxValue).Min : (int?)null;   // nearest above (ceiling)
            int dDown = lo == null ? int.MaxValue : cur - lo.Value;
            int dUp = hi == null ? int.MaxValue : hi.Value - cur;
            int next;
            if (dUp < dDown || (dUp == dDown && d == Dir.UP)) { next = hi.Value; d = Dir.UP; }
            else { next = lo.Value; d = Dir.DOWN; }                 // tie -> keep current direction
            result.Add(next);
            left.Remove(next);
            cur = next;
        }
        return result;
    }
}

class Look : ISchedulingStrategy {
    public string Name() { return "LOOK"; }
    public List<int> Route(int start, Dir dir, List<int> req, int top) {
        SortedSet<int> s = new SortedSet<int>(req);
        List<int> result = new List<int>();
        if (dir == Dir.UP) {
            result.AddRange(s.Where(f => f >= start));                     // everything at/above, ascending
            result.AddRange(s.Where(f => f < start).Reverse());            // then turn at the LAST request
        } else {
            result.AddRange(s.Where(f => f <= start).Reverse());
            result.AddRange(s.Where(f => f > start));
        }
        return result;
    }
}

class Scan : ISchedulingStrategy {
    public string Name() { return "SCAN"; }
    public List<int> Route(int start, Dir dir, List<int> req, int top) {
        SortedSet<int> s = new SortedSet<int>(req);
        List<int> first = new List<int>(), second = new List<int>();
        int end;
        if (dir == Dir.UP) { first.AddRange(s.Where(f => f >= start)); second.AddRange(s.Where(f => f < start).Reverse()); end = top; }
        else { first.AddRange(s.Where(f => f <= start).Reverse()); second.AddRange(s.Where(f => f > start)); end = 0; }
        List<int> result = new List<int>(first);
        bool alreadyAtEnd = first.Count > 0 && first[first.Count - 1] == end;
        if (second.Count > 0 && !alreadyAtEnd) result.Add(end);    // ride all the way to the end floor
        result.AddRange(second);
        return result;
    }
}

class SchedulerBench {
    static int Distance(int start, List<int> route) {
        int total = 0, pos = start;
        foreach (int f in route) { total += Math.Abs(f - pos); pos = f; }
        return total;
    }

    static void Main() {
        List<int> req = new List<int> { 8, 2, 6, 1, 4 };
        foreach (ISchedulingStrategy s in new ISchedulingStrategy[] { new Fcfs(), new Sstf(), new Scan(), new Look() }) {
            List<int> r = s.Route(5, Dir.UP, req, 9);
            Console.WriteLine(string.Format("{0,-4} route=[{1}] floors={2}", s.Name(), string.Join(", ", r), Distance(5, r)));
        }
    }
}` }
        ] }, { lang: 'java', title: 'Multi-car dispatcher with a direction-aware cost function', code: `import java.util.*;

enum Motion { UP, DOWN, IDLE }

record Call(int floor, boolean wantsUp) {}

class Car {
    final String id;
    int floor;
    Motion motion;
    final List<Integer> assigned = new ArrayList<>();
    Car(String id, int floor, Motion motion) { this.id = id; this.floor = floor; this.motion = motion; }
}

interface DispatchStrategy { Car choose(List<Car> cars, Call call, int top); }

/** Estimated floors to travel before reaching the caller, assuming SCAN-like sweeps, + load penalty. */
class NearestCarDispatch implements DispatchStrategy {
    static int travel(Car c, Call k, int top) {
        int p = c.floor, f = k.floor();
        switch (c.motion) {
            case IDLE: return Math.abs(p - f);
            case UP:
                if (k.wantsUp() && f >= p) return f - p;          // on the way
                if (!k.wantsUp()) return (top - p) + (top - f);    // up to the top, then down to f
                return (top - p) + top + f;                        // full loop: top, bottom, back up to f
            default:
                if (!k.wantsUp() && f <= p) return p - f;
                if (k.wantsUp()) return p + f;                     // down to 0, then up to f
                return p + top + (top - f);
        }
    }
    public Car choose(List<Car> cars, Call call, int top) {
        Car best = null;
        int bestCost = Integer.MAX_VALUE;
        for (Car c : cars) {
            int cost = travel(c, call, top) + c.assigned.size();   // small penalty spreads the load
            if (cost < bestCost) { bestCost = cost; best = c; }
        }
        return best;
    }
}

class Dispatcher {
    private final List<Car> cars;
    private final int top;
    private DispatchStrategy strategy;                 // swappable: zoning in the morning rush, etc.
    Dispatcher(List<Car> cars, int top, DispatchStrategy s) { this.cars = cars; this.top = top; this.strategy = s; }
    void setStrategy(DispatchStrategy s) { strategy = s; }

    Car onHallCall(Call call) {
        Car c = strategy.choose(cars, call, top);
        c.assigned.add(call.floor());
        if (c.motion == Motion.IDLE && c.floor != call.floor()) c.motion = call.floor() > c.floor ? Motion.UP : Motion.DOWN;
        return c;
    }

    public static void main(String[] args) {
        List<Car> cars = List.of(new Car("A", 0, Motion.IDLE), new Car("B", 6, Motion.DOWN), new Car("C", 3, Motion.UP));
        Dispatcher d = new Dispatcher(cars, 9, new NearestCarDispatch());
        for (Call call : List.of(new Call(4, true), new Call(7, false), new Call(2, false))) {
            System.out.println("call " + call + " -> car " + d.onHallCall(call).id);
        }
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum


class Motion(Enum):
    UP = 1
    DOWN = 2
    IDLE = 3


@dataclass(frozen=True)
class Call:
    floor: int
    wants_up: bool

    def __str__(self) -> str:  # same look as a Java record
        return f"Call[floor={self.floor}, wantsUp={str(self.wants_up).lower()}]"


@dataclass
class Car:
    id: str
    floor: int
    motion: Motion
    assigned: list[int] = field(default_factory=list)


class DispatchStrategy(ABC):
    @abstractmethod
    def choose(self, cars: list[Car], call: Call, top: int) -> Car: ...


class NearestCarDispatch(DispatchStrategy):
    """Estimated floors to travel before reaching the caller, assuming SCAN-like sweeps, + load penalty."""

    @staticmethod
    def travel(c: Car, k: Call, top: int) -> int:
        p, f = c.floor, k.floor
        if c.motion is Motion.IDLE:
            return abs(p - f)
        if c.motion is Motion.UP:
            if k.wants_up and f >= p:
                return f - p  # on the way
            if not k.wants_up:
                return (top - p) + (top - f)  # up to the top, then down to f
            return (top - p) + top + f  # full loop: top, bottom, back up to f
        if not k.wants_up and f <= p:
            return p - f
        if k.wants_up:
            return p + f  # down to 0, then up to f
        return p + top + (top - f)

    def choose(self, cars: list[Car], call: Call, top: int) -> Car:
        # the small penalty spreads the load; min() keeps the first car on ties
        return min(cars, key=lambda c: self.travel(c, call, top) + len(c.assigned))


class Dispatcher:
    def __init__(self, cars: list[Car], top: int, strategy: DispatchStrategy) -> None:
        self._cars = cars
        self._top = top
        self._strategy = strategy  # swappable: zoning in the morning rush, etc.

    def set_strategy(self, s: DispatchStrategy) -> None:
        self._strategy = s

    def on_hall_call(self, call: Call) -> Car:
        c = self._strategy.choose(self._cars, call, self._top)
        c.assigned.append(call.floor)
        if c.motion is Motion.IDLE and c.floor != call.floor:
            c.motion = Motion.UP if call.floor > c.floor else Motion.DOWN
        return c


if __name__ == "__main__":
    cars = [Car("A", 0, Motion.IDLE), Car("B", 6, Motion.DOWN), Car("C", 3, Motion.UP)]
    d = Dispatcher(cars, 9, NearestCarDispatch())
    for call in [Call(4, True), Call(7, False), Call(2, False)]:
        print(f"call {call} -> car {d.on_hall_call(call).id}")` },
          { lang: 'ts', code: `type Motion = "UP" | "DOWN" | "IDLE";

interface Call { readonly floor: number; readonly wantsUp: boolean }

class Car {
  readonly assigned: number[] = [];
  constructor(readonly id: string, public floor: number, public motion: Motion) {}
}

interface DispatchStrategy {
  choose(cars: Car[], call: Call, top: number): Car;
}

/** Estimated floors to travel before reaching the caller, assuming SCAN-like sweeps, + load penalty. */
class NearestCarDispatch implements DispatchStrategy {
  static travel(c: Car, k: Call, top: number): number {
    const p = c.floor, f = k.floor;
    switch (c.motion) {
      case "IDLE": return Math.abs(p - f);
      case "UP":
        if (k.wantsUp && f >= p) return f - p; // on the way
        if (!k.wantsUp) return (top - p) + (top - f); // up to the top, then down to f
        return (top - p) + top + f; // full loop: top, bottom, back up to f
      default:
        if (!k.wantsUp && f <= p) return p - f;
        if (k.wantsUp) return p + f; // down to 0, then up to f
        return p + top + (top - f);
    }
  }

  choose(cars: Car[], call: Call, top: number): Car {
    let best = cars[0];
    let bestCost = Infinity;
    for (const c of cars) {
      const cost = NearestCarDispatch.travel(c, call, top) + c.assigned.length; // small penalty spreads the load
      if (cost < bestCost) { bestCost = cost; best = c; }
    }
    return best;
  }
}

class Dispatcher {
  // swappable: zoning in the morning rush, etc.
  constructor(private readonly cars: Car[], private readonly top: number, private strategy: DispatchStrategy) {}

  setStrategy(s: DispatchStrategy): void { this.strategy = s; }

  onHallCall(call: Call): Car {
    const c = this.strategy.choose(this.cars, call, this.top);
    c.assigned.push(call.floor);
    if (c.motion === "IDLE" && c.floor !== call.floor) c.motion = call.floor > c.floor ? "UP" : "DOWN";
    return c;
  }
}

const cars = [new Car("A", 0, "IDLE"), new Car("B", 6, "DOWN"), new Car("C", 3, "UP")];
const d = new Dispatcher(cars, 9, new NearestCarDispatch());
const calls: Call[] = [{ floor: 4, wantsUp: true }, { floor: 7, wantsUp: false }, { floor: 2, wantsUp: false }];
for (const call of calls) {
  console.log(\`call Call[floor=\${call.floor}, wantsUp=\${call.wantsUp}] -> car \${d.onHallCall(call).id}\`);
}` },
          { lang: 'cpp', code: `enum class Motion { UP, DOWN, IDLE };

struct Call {
    int floor;
    bool wantsUp;
};

struct Car {
    string id;
    int floor;
    Motion motion;
    vector<int> assigned;
};

struct DispatchStrategy {
    virtual ~DispatchStrategy() = default;
    virtual Car& choose(vector<Car>& cars, const Call& call, int top) const = 0;
};

// Estimated floors to travel before reaching the caller, assuming SCAN-like sweeps, + load penalty.
class NearestCarDispatch final : public DispatchStrategy {
public:
    static int travel(const Car& c, const Call& k, int top) {
        int p = c.floor, f = k.floor;
        switch (c.motion) {
            case Motion::IDLE: return abs(p - f);
            case Motion::UP:
                if (k.wantsUp && f >= p) return f - p;      // on the way
                if (!k.wantsUp) return (top - p) + (top - f);  // up to the top, then down to f
                return (top - p) + top + f;                 // full loop: top, bottom, back up to f
            default:
                if (!k.wantsUp && f <= p) return p - f;
                if (k.wantsUp) return p + f;                // down to 0, then up to f
                return p + top + (top - f);
        }
    }

    Car& choose(vector<Car>& cars, const Call& call, int top) const override {
        Car* best = nullptr;
        int bestCost = INT_MAX;
        for (Car& c : cars) {
            int cost = travel(c, call, top) + static_cast<int>(c.assigned.size());  // small penalty spreads the load
            if (cost < bestCost) { bestCost = cost; best = &c; }
        }
        return *best;
    }
};

class Dispatcher {
    vector<Car> cars_;
    int top_;
    unique_ptr<DispatchStrategy> strategy_;  // swappable: zoning in the morning rush, etc.

public:
    Dispatcher(vector<Car> cars, int top, unique_ptr<DispatchStrategy> s)
        : cars_(move(cars)), top_(top), strategy_(move(s)) {}

    void setStrategy(unique_ptr<DispatchStrategy> s) { strategy_ = move(s); }

    const Car& onHallCall(const Call& call) {
        Car& c = strategy_->choose(cars_, call, top_);
        c.assigned.push_back(call.floor);
        if (c.motion == Motion::IDLE && c.floor != call.floor) c.motion = call.floor > c.floor ? Motion::UP : Motion::DOWN;
        return c;
    }
};

int main() {
    cout << boolalpha;
    Dispatcher d({{"A", 0, Motion::IDLE, {}}, {"B", 6, Motion::DOWN, {}}, {"C", 3, Motion::UP, {}}}, 9,
                 make_unique<NearestCarDispatch>());
    for (Call call : {Call{4, true}, Call{7, false}, Call{2, false}}) {
        cout << "call Call[floor=" << call.floor << ", wantsUp=" << call.wantsUp << "] -> car " << d.onHallCall(call).id << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

enum Motion { UP, DOWN, IDLE }

sealed class Call {
    public readonly int Floor; public readonly bool WantsUp;
    public Call(int floor, bool wantsUp) { Floor = floor; WantsUp = wantsUp; }
    public override string ToString() { return "Call[floor=" + Floor + ", wantsUp=" + WantsUp.ToString().ToLower() + "]"; }
}

class Car {
    public readonly string Id;
    public int Floor;
    public Motion Motion;
    public readonly List<int> Assigned = new List<int>();
    public Car(string id, int floor, Motion motion) { Id = id; Floor = floor; Motion = motion; }
}

interface IDispatchStrategy { Car Choose(List<Car> cars, Call call, int top); }

/// Estimated floors to travel before reaching the caller, assuming SCAN-like sweeps, + load penalty.
class NearestCarDispatch : IDispatchStrategy {
    public static int Travel(Car c, Call k, int top) {
        int p = c.Floor, f = k.Floor;
        switch (c.Motion) {
            case Motion.IDLE: return Math.Abs(p - f);
            case Motion.UP:
                if (k.WantsUp && f >= p) return f - p;             // on the way
                if (!k.WantsUp) return (top - p) + (top - f);      // up to the top, then down to f
                return (top - p) + top + f;                        // full loop: top, bottom, back up to f
            default:
                if (!k.WantsUp && f <= p) return p - f;
                if (k.WantsUp) return p + f;                       // down to 0, then up to f
                return p + top + (top - f);
        }
    }
    public Car Choose(List<Car> cars, Call call, int top) {
        Car best = null;
        int bestCost = int.MaxValue;
        foreach (Car c in cars) {
            int cost = Travel(c, call, top) + c.Assigned.Count;    // small penalty spreads the load
            if (cost < bestCost) { bestCost = cost; best = c; }
        }
        return best;
    }
}

class Dispatcher {
    private readonly List<Car> cars;
    private readonly int top;
    private IDispatchStrategy strategy;                 // swappable: zoning in the morning rush, etc.
    public Dispatcher(List<Car> cars, int top, IDispatchStrategy s) { this.cars = cars; this.top = top; strategy = s; }
    public void SetStrategy(IDispatchStrategy s) { strategy = s; }

    public Car OnHallCall(Call call) {
        Car c = strategy.Choose(cars, call, top);
        c.Assigned.Add(call.Floor);
        if (c.Motion == Motion.IDLE && c.Floor != call.Floor) c.Motion = call.Floor > c.Floor ? Motion.UP : Motion.DOWN;
        return c;
    }

    static void Main() {
        List<Car> cars = new List<Car> { new Car("A", 0, Motion.IDLE), new Car("B", 6, Motion.DOWN), new Car("C", 3, Motion.UP) };
        Dispatcher d = new Dispatcher(cars, 9, new NearestCarDispatch());
        foreach (Call call in new[] { new Call(4, true), new Call(7, false), new Call(2, false) }) {
            Console.WriteLine("call " + call + " -> car " + d.OnHallCall(call).Id);
        }
    }
}` }
        ] }],
    codeTitle: ['Car-level scheduling strategies', 'Building-level dispatch'],
    viz: [{
      title: 'Scheduling race: watch the car serve the request list (FCFS / SSTF / SCAN / LOOK)',
      input: 'algo=LOOK; start=5; dir=up; req=8 2 6 1 4',
      inputLabel: 'algo=FCFS|SSTF|SCAN|LOOK; start=0-9; dir=up|down; req=up to 8 floors 0-9',
      gen: function (input) {
        var o = kvParse(input, 'Format: algo=LOOK; start=5; dir=up; req=8 2 6 1 4');
        var algo = String(o.algo || 'LOOK').toUpperCase();
        if (['FCFS', 'SSTF', 'SCAN', 'LOOK'].indexOf(algo) < 0) throw new Error('algo must be FCFS, SSTF, SCAN or LOOK');
        var start = parseInt(o.start, 10), dir = String(o.dir || 'up').toLowerCase(), top = 9;
        if (isNaN(start) || start < 0 || start > top) throw new Error('start must be 0-9');
        if (dir !== 'up' && dir !== 'down') throw new Error('dir must be up or down');
        var reqs = tokens(o.req || '', /[\s,]+/, 8, 'req = floors 0-9, e.g. req=8 2 6 1 4').map(Number);
        if (reqs.some(function (x) { return isNaN(x) || x < 0 || x > top || x % 1; })) throw new Error('Requests must be floors 0-9');
        var plan = liftPlan(algo, start, dir, reqs, top);
        var waiting = []; reqs.forEach(function (r) { if (waiting.indexOf(r) < 0) waiting.push(r); });
        var served = [], trail = [start], pos = start, moved = 0, frames = [];
        var rule = { FCFS: 'serve strictly in arrival order', SSTF: 'always go to the nearest waiting floor', SCAN: 'keep going ' + dir + ' to the END floor, then reverse', LOOK: 'keep going ' + dir + ' while requests remain ahead, then reverse' }[algo];
        var routeTxt = plan.route.map(function (w) { return typeof w === 'string' ? w.slice(1) + '(end)' : String(w); });
        frames.push(F('<b>' + algo + '</b>: ' + rule + '. Car starts at floor <b>' + start + '</b> heading ' + dir + '. All requests (blue ●) are already waiting. Planned route: <b>' + routeTxt.join(' → ') + '</b>.', [
          liftGrid(top, pos, '■', waiting, served, 'cur', []),
          QUEUE('Planned stops (' + algo + ')', routeTxt, { 0: 'cur' }, 'next', 'last'),
          VARS('Car', { algo: algo, floor: pos, direction: dir, floorsMoved: 0 })
        ]));
        var step = 1;
        plan.route.forEach(function (w, wi) {
          var isEnd = typeof w === 'string', tgt = isEnd ? Number(w.slice(1)) : w;
          while (pos !== tgt) {
            var up = tgt > pos;
            pos += up ? step : -step; moved++;
            if (trail.indexOf(pos) < 0) trail.push(pos);
            if (pos !== tgt) {
              var passing = waiting.indexOf(pos) >= 0 ? ' Passing floor ' + pos + ' where someone waits — ' + (algo === 'FCFS' || algo === 'SSTF' ? 'this textbook ' + algo + ' does not stop (only its chosen target counts).' : 'it is scheduled later in this sweep plan.') : '';
              frames.push(F('Moving ' + (up ? '▲' : '▼') + ' to floor ' + pos + ' (target ' + tgt + ').' + passing, [
                liftGrid(top, pos, up ? '▲' : '▼', waiting, served, 'cur', trail),
                QUEUE('Remaining planned stops', routeTxt.slice(wi), { 0: 'cur' }, 'next', 'last'),
                VARS('Car', { algo: algo, floor: pos, direction: up ? 'up' : 'down', floorsMoved: moved })
              ]));
            }
          }
          if (isEnd) {
            frames.push(F('Reached the <b>end floor ' + tgt + '</b> with nobody to serve here. That is the cost of SCAN: it always rides to the wall before turning. LOOK would have turned around at the last real request.', [
              liftGrid(top, pos, '■', waiting, served, 'bad', trail),
              QUEUE('Remaining planned stops', routeTxt.slice(wi + 1), {}, 'next', 'last'),
              VARS('Car', { algo: algo, floor: pos, floorsMoved: moved, wastedTrip: 'yes' }, { wastedTrip: 'bad' })
            ]));
          } else {
            waiting.splice(waiting.indexOf(tgt), 1); served.push(tgt);
            frames.push(F('Stop at floor <b>' + tgt + '</b>: doors open, request served after <b>' + moved + '</b> floors of travel (its wait). ' + (waiting.length ? waiting.length + ' still waiting.' : 'Everyone served!'), [
              liftGrid(top, pos, '[< >]', waiting, served, 'ok', trail),
              QUEUE('Remaining planned stops', routeTxt.slice(wi + 1), { 0: 'cur' }, 'next', 'last'),
              VARS('Car', { algo: algo, floor: pos, floorsMoved: moved, served: served.length + '/' + (served.length + waiting.length) }, { floorsMoved: 'ok' })
            ]));
          }
        });
        var all = ['FCFS', 'SSTF', 'SCAN', 'LOOK'].map(function (a) { var p = liftPlan(a, start, dir, reqs, top); return { a: a, p: p }; });
        var hl = {}; all.forEach(function (x, i) { if (x.a === algo) hl[i] = 'sel'; });
        frames.push(F('Done: <b>' + algo + '</b> travelled <b>' + plan.total + '</b> floors. Compare all four on the same input: total travel (efficiency), average and worst wait (fairness). Try changing <code>algo=</code> or the requests — e.g. put requests at both ends to see SCAN waste, or many near the car to see SSTF neglect far floors.', [
          TABLE('Same requests, four strategies', ['strategy', 'route', 'total floors', 'avg wait', 'max wait'], all.map(function (x) { return [x.a, [start].concat(x.p.route.map(function (w) { return typeof w === 'string' ? w.slice(1) + '*' : w; })).join('→'), x.p.total, x.p.avgWait, x.p.maxWait]; }), hl),
          { type: 'bars', label: 'Total floors travelled', values: all.map(function (x) { return x.p.total; }), idxLabels: all.map(function (x) { return x.a; }), hl: one(['FCFS', 'SSTF', 'SCAN', 'LOOK'].indexOf(algo), 'sel') }
        ]));
        return frames;
      }
    }, {
      title: 'Multi-car dispatch: cost function picks a car for each hall call',
      input: 'cars=0 idle, 6 down, 3 up; calls=4 up, 7 down, 2 down',
      inputLabel: 'cars = up to 4 "floor motion" (idle/up/down); calls = up to 6 "floor up|down"; floors 0-9',
      gen: function (input) {
        var o = kvParse(input, 'Format: cars=0 idle, 6 down, 3 up; calls=4 up, 7 down');
        var top = 9, names = ['A', 'B', 'C', 'D'];
        var cars = tokens(o.cars || '', ',', 4, 'cars=0 idle, 6 down, 3 up').map(function (t, i) {
          var p = t.split(/\s+/), fl = parseInt(p[0], 10), mo = String(p[1] || 'idle').toLowerCase();
          if (isNaN(fl) || fl < 0 || fl > top || ['idle', 'up', 'down'].indexOf(mo) < 0) throw new Error('Each car is "floor motion", e.g. 6 down');
          return { id: names[i], floor: fl, motion: mo, assigned: [] };
        });
        var calls = tokens(o.calls || '', ',', 6, 'calls=4 up, 7 down').map(function (t) {
          var p = t.split(/\s+/), fl = parseInt(p[0], 10), dd = String(p[1] || '').toLowerCase();
          if (isNaN(fl) || fl < 0 || fl > top || (dd !== 'up' && dd !== 'down')) throw new Error('Each call is "floor up|down", e.g. 7 down');
          return { floor: fl, up: dd === 'up' };
        });
        function travel(c, k) {
          var p = c.floor, f = k.floor;
          if (c.motion === 'idle') return [Math.abs(p - f), 'idle: just the distance'];
          if (c.motion === 'up') {
            if (k.up && f >= p) return [f - p, 'on the way up'];
            if (!k.up) return [(top - p) + (top - f), 'finish up-sweep, come down'];
            return [(top - p) + top + f, 'behind it: full loop'];
          }
          if (!k.up && f <= p) return [p - f, 'on the way down'];
          if (k.up) return [p + f, 'finish down-sweep, come up'];
          return [p + top + (top - f), 'behind it: full loop'];
        }
        function carGrid(hlCar, callFloor) {
          var rows = [], rh = [], hl = {};
          for (var f = top; f >= 0; f--) {
            var r = top - f; rh.push('Floor ' + f);
            rows.push(cars.map(function (c, ci) {
              var s = c.floor === f ? (c.motion === 'up' ? '▲' : c.motion === 'down' ? '▼' : '■') : (c.assigned.indexOf(f) >= 0 ? '○' : '');
              if (c.floor === f) hl[r + ',' + ci] = ci === hlCar ? 'sel' : 'cur';
              else if (c.assigned.indexOf(f) >= 0) hl[r + ',' + ci] = 'win';
              return s;
            }).concat([f === callFloor ? 'CALL' : '']));
            if (f === callFloor) hl[r + ',' + cars.length] = 'bad';
          }
          return { type: 'grid', label: 'Building (■ idle, ▲/▼ moving, ○ assigned stop)', rows: rows, rowHead: rh, colHead: cars.map(function (c) { return 'car ' + c.id; }).concat(['hall']), hl: hl };
        }
        var frames = [];
        frames.push(F('Building with ' + cars.length + ' cars. Each hall call goes to the dispatcher, which asks every car "how many floors until you can reach this caller <i>going their way</i>?" and adds a small load penalty (1 per stop already assigned). Cheapest car wins.', [carGrid(-1, -1), TABLE('Cars', ['car', 'floor', 'motion'], cars.map(function (c) { return [c.id, c.floor, c.motion]; }))]));
        calls.forEach(function (k) {
          var rows = [], best = -1, bc = 1e9;
          cars.forEach(function (c, i) {
            var t = travel(c, k), cost = t[0] + c.assigned.length;
            rows.push([c.id, c.floor + ' ' + c.motion, t[1], t[0], c.assigned.length, cost]);
            if (cost < bc) { bc = cost; best = i; }
          });
          frames.push(F('Hall call: floor <b>' + k.floor + ' ' + (k.up ? '▲' : '▼') + '</b>. Compute each car\'s cost. A car moving the other way, or already past the caller, must finish its sweep first — that is why "nearest by distance" is not enough.', [carGrid(-1, k.floor), TABLE('Cost per car', ['car', 'now', 'reasoning', 'travel', 'load', 'cost'], rows)]));
          var c = cars[best];
          c.assigned.push(k.floor);
          if (c.motion === 'idle' && c.floor !== k.floor) c.motion = k.floor > c.floor ? 'up' : 'down';
          frames.push(F('Car <b>' + c.id + '</b> wins with cost ' + bc + '. The call is added to car ' + c.id + '\'s stop set (○). ' + (c.motion !== 'idle' ? 'Its state is now ' + c.motion + ', which changes its cost for the next call.' : ''), [carGrid(best, k.floor), TABLE('Cost per car', ['car', 'now', 'reasoning', 'travel', 'load', 'cost'], rows, one(best, 'sel'))]));
        });
        frames.push(F('All calls assigned. The dispatcher is a <b>Strategy</b> too: at 9 am you could swap in a zoning strategy (cars A/B serve floors 1–5, C/D serve 6–9) without touching the cars or the state machine.', [carGrid(-1, -1), TABLE('Assignments', ['car', 'stops assigned'], cars.map(function (c) { return [c.id, c.assigned.join(', ') || '—']; }))]));
        return frames;
      }
    }],
    examples: [
      { title: 'SSTF starvation, step by step', html: `<p>Car at 5. Waiting: floor 0. Every few seconds someone presses 4 or 6. SSTF always picks the nearer 4/6, so floor 0 waits forever. ${H.table(['time', 'car at', 'waiting', 'SSTF picks'], [['t0', '5', '0, 6', '6'], ['t1', '6', '0, 4', '4'], ['t2', '4', '0, 6', '6'], ['…', '…', H.c('r', '0 still waiting'), '…']])} LOOK would keep going in one direction and reach 0 within one sweep. ${H.c('g', 'Bounded waiting')} is a requirement worth saying out loud.</p>` },
      { title: 'C-SCAN / C-LOOK: fairness for the top floors', html: `<p>With SCAN, middle floors are passed twice per cycle but end floors once, so their worst-case wait is longer. <b>C-SCAN</b> (circular) serves only while going up, then rides empty straight to the bottom and starts again — every floor gets the same worst-case wait. Common in disk schedulers; in buildings, a similar idea is an "up-peak" mode where cars return to the lobby after each trip.</p>` },
      { title: 'Directional hall calls in the stop sets', html: `<p>Car at 2 going ▲ with car call 8. Hall calls: 5▲ and 5▼. With two sets: <code>upStops = {5, 8}</code>, <code>downStops = {5}</code>. Going up it stops at 5 for the ▲ caller only; the ▼ caller is served on the way back down. Passing a floor serves it only if the floor is in the set for the <b>current direction</b>.</p>`, code: { lang: 'java', code: `import java.util.*;
class DirectionalStops {
    final TreeSet<Integer> up = new TreeSet<>(), down = new TreeSet<>();
    void hallCall(int floor, boolean wantsUp) { (wantsUp ? up : down).add(floor); }
    /** Should a car moving in direction 'goingUp' stop at 'floor'? */
    boolean shouldStop(int floor, boolean goingUp) { return goingUp ? up.contains(floor) : down.contains(floor); }
}`, alt: [
          { lang: 'python', code: `class DirectionalStops:
    def __init__(self) -> None:
        self.up: set[int] = set()
        self.down: set[int] = set()

    def hall_call(self, floor: int, wants_up: bool) -> None:
        (self.up if wants_up else self.down).add(floor)

    def should_stop(self, floor: int, going_up: bool) -> bool:
        """Should a car moving in direction 'going_up' stop at 'floor'?"""
        return floor in (self.up if going_up else self.down)` },
          { lang: 'ts', code: `class DirectionalStops {
  readonly up = new Set<number>();
  readonly down = new Set<number>();

  hallCall(floor: number, wantsUp: boolean): void { (wantsUp ? this.up : this.down).add(floor); }

  /** Should a car moving in direction 'goingUp' stop at 'floor'? */
  shouldStop(floor: number, goingUp: boolean): boolean {
    return (goingUp ? this.up : this.down).has(floor);
  }
}` },
          { lang: 'cpp', code: `class DirectionalStops {
    set<int> up_, down_;

public:
    void hallCall(int floor, bool wantsUp) { (wantsUp ? up_ : down_).insert(floor); }

    // Should a car moving in direction 'goingUp' stop at 'floor'?
    bool shouldStop(int floor, bool goingUp) const { return (goingUp ? up_ : down_).count(floor) > 0; }
};` },
  { lang: 'csharp', code: `
using System.Collections.Generic;
class DirectionalStops {
    public readonly SortedSet<int> Up = new SortedSet<int>(), Down = new SortedSet<int>();
    public void HallCall(int floor, bool wantsUp) { (wantsUp ? Up : Down).Add(floor); }
    /// Should a car moving in direction 'goingUp' stop at 'floor'?
    public bool ShouldStop(int floor, bool goingUp) { return goingUp ? Up.Contains(floor) : Down.Contains(floor); }
}` }
        ] } },
      { title: 'Estimating wait time for the dispatcher', html: `<p>Our cost uses floors, but production systems estimate <b>seconds</b>: travel ≈ floors × 1.5 s + stops on the way × 10 s (doors + boarding). A car 3 floors away with 4 stops in between (≈ 44 s) loses to an idle car 7 floors away (≈ 10 s). The structure stays the same — only the cost function (a Strategy) gets smarter.</p>` }
    ],
    deepDive: `<p><b>Offline vs online.</b> Textbook FCFS/SSTF/SCAN/LOOK assume all requests are known (offline). Real elevators are <b>online</b>: requests keep arriving. The correct implementation is not "compute a route once" but "on every tick, ask: is my current floor in the stop set for my direction? Is there anything ahead? If not, reverse or go idle." That is LOOK expressed as a state machine — exactly the <code>chooseDirection()</code> in the previous topic.</p>
<p><b>Complexity.</b> With a sorted set per direction (<code>TreeSet</code>, <code>std::set</code>), adding a stop and finding the next stop ahead (<code>ceiling</code>/<code>floor</code>) are O(log F); with F ≤ 200 floors a <code>boolean[]</code> scan is also fine. SSTF over N pending requests is O(N) per decision with a list, O(log N) with a sorted set (nearest = floor/ceiling of the current position).</p>
<p><b>Starvation proof for LOOK.</b> A request at floor f is reached at most after the car finishes its current sweep and one sweep in the opposite direction — at most 2·(top − bottom) floors of travel, regardless of new arrivals, because the car never reverses while requests remain ahead. SSTF has no such bound.</p>
<p><b>Dispatch is an assignment problem.</b> Assigning calls one at a time greedily (what we do) is standard. Modern controllers <b>re-assign</b> periodically (a call may move to a newly idle car), and destination-dispatch systems group passengers by destination so a car makes fewer stops — fewer stops is the biggest win, since each stop costs ~10 seconds.</p>
<p><b>Traffic modes as Strategy swaps.</b> Up-peak (morning): send idle cars to the lobby. Down-peak (evening): park cars at the top. Inter-floor (midday): spread cars across zones. Night: park one car at the lobby, put others in energy-save. A <code>TrafficModeStrategy</code> chosen by time-of-day or by measured traffic keeps all this out of the car code.</p>
<p><b>Energy and comfort.</b> Fewer direction reversals = less energy and fewer jerks; LOOK minimises reversals. Some systems penalise reversals in the cost function and cap the number of stops per trip.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking "which elevator algorithm is best?" gets a confident generic answer. The better use is <b>simulation</b>: <code>Write a simulator (in your language) that replays 10,000 random requests (Poisson arrivals, 70% from the lobby at 9 am) through FCFS, SSTF and LOOK and reports average and 99th-percentile wait.</code> Data beats opinions, and AI writes simulators fast.</p>
<p><b>ML in real dispatch:</b> modern controllers learn traffic patterns (badge-ins, calendar, weather) and tune dispatch weights or pre-position idle cars. Reinforcement learning has been studied for dispatch for decades; in practice it usually tunes a <b>cost function</b> inside a classic, verifiable controller rather than replacing it, because safety rules must stay deterministic.</p>
<p><b>Where AI goes wrong:</b> LLM-written elevators often use one priority queue ordered by distance — that is SSTF with starvation — or ignore hall-call direction. They also mix scheduling into the state machine with if/else. <b>What you must still own:</b> naming the trade-off (throughput vs fairness), proving bounded waiting, and keeping scheduling as a swappable Strategy separate from the car's State.</p>`,
    problems: [{
      title: 'LOOK Service Order and Distance', level: 'Medium', tags: ['elevator', 'scheduling', 'treeset'], companies: ['Amazon', 'Microsoft', 'Adobe', 'Goldman Sachs'],
      statement: `<p>An elevator is at floor <code>start</code> moving in direction <code>dir</code> (UP or DOWN). Pending requests are given as a list of floors (may contain duplicates). Using the <b>LOOK</b> policy, return the order in which the floors are served and the total floors travelled. Then implement a <code>LookScheduler</code> class that supports <b>online</b> use: <code>addRequest(floor)</code> at any time and <code>nextStop()</code> that returns the next floor to go to (or -1 if idle), updating its direction.</p>`,
      constraints: `0 ≤ floors ≤ 10<sup>6</sup>, up to 10<sup>5</sup> requests; a request at the current floor is served immediately.`,
      example: `<p>start = 5, dir = UP, requests = [8, 2, 6, 1, 4, 6]. Up sweep: ${H.c('g', '6, 8')}; reverse at 8 (last request above); down sweep: ${H.c('b', '4, 2, 1')}. Order = [6, 8, 4, 2, 1]; distance = 1 + 2 + 4 + 2 + 1 = <b>10</b>. The duplicate 6 is served once.</p>`,
      brute: { why: `<p>Simulate floor by floor: at each floor scan every pending request to see if one is here, and to see if anything remains ahead. That is O(F × N) — 10<sup>6</sup> floors × 10<sup>5</sup> requests = 10<sup>11</sup> steps. All the work spent "checking empty floors" is wasted; a sorted structure can jump straight to the next stop.</p>`, code: { lang: 'java', code: `import java.util.*;
class BruteLook {
    static List<Integer> order(int start, boolean up, List<Integer> req, int top) {
        List<Integer> pending = new ArrayList<>(new HashSet<>(req)), out = new ArrayList<>();
        int pos = start;
        while (!pending.isEmpty()) {
            if (pending.remove(Integer.valueOf(pos))) { out.add(pos); continue; }   // O(N) scan
            boolean ahead = false;
            for (int f : pending) if (up ? f > pos : f < pos) ahead = true;          // O(N) scan per floor
            if (!ahead) { up = !up; continue; }
            pos += up ? 1 : -1;                                                       // one floor at a time
        }
        return out;
    }
}`, alt: [{ lang: 'python', code: "class BruteLook:\n    @staticmethod\n    def order(start, up, req, top):\n        pending, out = list(set(req)), []\n        pos = start\n        while pending:\n            if pos in pending:                                                   # O(N) scan\n                pending.remove(pos); out.append(pos); continue\n            ahead = any((f > pos) if up else (f < pos) for f in pending)        # O(N) scan per floor\n            if not ahead: up = not up; continue\n            pos += 1 if up else -1                                               # one floor at a time\n        return out\n" }, { lang: 'ts', code: "class BruteLook {\n  static order(start: number, up: boolean, req: number[], top: number): number[] {\n    const pending = [...new Set(req)], out: number[] = [];\n    let pos = start;\n    while (pending.length) {\n      const at = pending.indexOf(pos);                                           // O(N) scan\n      if (at >= 0) { pending.splice(at, 1); out.push(pos); continue; }\n      const ahead = pending.some((f) => (up ? f > pos : f < pos));               // O(N) scan per floor\n      if (!ahead) { up = !up; continue; }\n      pos += up ? 1 : -1;                                                        // one floor at a time\n    }\n    return out;\n  }\n}\n" }, { lang: 'cpp', code: "struct BruteLook {\n    static vector<int> order(int start, bool up, const vector<int>& req, int top) {\n        set<int> uniq(req.begin(), req.end());\n        vector<int> pending(uniq.begin(), uniq.end()), out;\n        int pos = start;\n        while (!pending.empty()) {\n            auto it = find(pending.begin(), pending.end(), pos);                  // O(N) scan\n            if (it != pending.end()) { pending.erase(it); out.push_back(pos); continue; }\n            bool ahead = false;\n            for (int f : pending) if (up ? f > pos : f < pos) ahead = true;       // O(N) scan per floor\n            if (!ahead) { up = !up; continue; }\n            pos += up ? 1 : -1;                                                   // one floor at a time\n        }\n        return out;\n    }\n};\n" }, { lang: 'csharp', code: "using System.Collections.Generic;\nclass BruteLook {\n    public static List<int> Order(int start, bool up, List<int> req, int top) {\n        List<int> pending = new List<int>(new HashSet<int>(req)), result = new List<int>();\n        int pos = start;\n        while (pending.Count > 0) {\n            if (pending.Remove(pos)) { result.Add(pos); continue; }                   // O(N) scan\n            bool ahead = false;\n            foreach (int f in pending) if (up ? f > pos : f < pos) ahead = true;      // O(N) scan per floor\n            if (!ahead) { up = !up; continue; }\n            pos += up ? 1 : -1;                                                       // one floor at a time\n        }\n        return result;\n    }\n}\n" }] } },
      mcq: { q: 'The car is at 5 going UP, with requests at 3 and 7. A new request for 6 arrives when the car is at 5.5 (between 5 and 6). What does LOOK do?', options: ['Stops at 6, then 7, then reverses to 3', 'Goes to 7 first because it was earlier', 'Reverses to 3 immediately because 3 is closer to 5 than 7', 'Ignores 6 until the next sweep'], answer: 0, explain: 'LOOK serves everything ahead in the current direction in floor order, including late arrivals ahead of the car.' },
      hints: [`<p>Hint 1: LOOK = "everything at or above me in ascending order, then everything below me in descending order" (for UP). Duplicates do not matter — use a set.</p>`, `<p>Hint 2: A sorted set (<code>TreeSet</code> in Java) gives the requests at or above <code>start</code> ascending and those below it descending (<code>tailSet(start, true)</code> and <code>headSet(start, false).descendingSet()</code>; with <code>std::set</code> use <code>lower_bound</code> and iterate; in Python filter a sorted list). For the online version, <code>ceiling(pos)</code> / <code>floor(pos)</code> give the next stop in each direction in O(log N).</p>`, `<p>Hint 3: Online <code>nextStop()</code>: if direction is UP and <code>ceiling(pos)</code> exists → go there; else flip to DOWN and try <code>floor(pos)</code>; if neither, return -1 (idle). Remove the floor when served, update pos.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "[6, 8, 4, 2, 1] distance=10\n6 7 3\n-1\n" }] },
      solution: {
        approach: `<p>Offline: put requests in a sorted set; for UP take the tail set (≥ start) ascending, then the head set (&lt; start) descending; the mirror for DOWN. Distance is the sum of absolute gaps. Online: keep the sorted set and the current direction; <code>nextStop</code> looks ahead with <code>ceiling</code>/<code>floor</code> and flips only when nothing remains ahead — that is exactly the LOOK rule, and it avoids starvation.</p>`,
        code: `import java.util.*;

class LookScheduler {
    private final TreeSet<Integer> pending = new TreeSet<>();
    private int pos;
    private boolean up;

    LookScheduler(int start, boolean up) { this.pos = start; this.up = up; }

    void addRequest(int floor) { pending.add(floor); }

    /** Next floor to stop at under LOOK, or -1 if idle. Serves (removes) it and moves there. */
    int nextStop() {
        if (pending.isEmpty()) return -1;
        Integer next = up ? pending.ceiling(pos) : pending.floor(pos);
        if (next == null) {                         // nothing ahead -> reverse (the LOOK turn)
            up = !up;
            next = up ? pending.ceiling(pos) : pending.floor(pos);
        }
        pending.remove(next);
        pos = next;
        return next;
    }

    /** Offline helper: whole order + distance. */
    static long[] serveAll(int start, boolean up, List<Integer> req, List<Integer> orderOut) {
        LookScheduler s = new LookScheduler(start, up);
        req.forEach(s::addRequest);
        long dist = 0;
        int at = start;
        for (int f = s.nextStop(); f != -1; f = s.nextStop()) {
            orderOut.add(f);
            dist += Math.abs(f - at);
            at = f;
        }
        return new long[] { dist };
    }

    public static void main(String[] args) {
        List<Integer> order = new ArrayList<>();
        long[] d = serveAll(5, true, List.of(8, 2, 6, 1, 4, 6), order);
        System.out.println(order + " distance=" + d[0]);      // [6, 8, 4, 2, 1] distance=10

        LookScheduler live = new LookScheduler(5, true);
        live.addRequest(3); live.addRequest(7);
        live.addRequest(6);                                     // arrives late, but is ahead
        System.out.println(live.nextStop() + " " + live.nextStop() + " " + live.nextStop()); // 6 7 3
        System.out.println(live.nextStop());                    // -1: nothing pending, idle
    }
}`, alt: [
          { lang: 'python', code: `from bisect import bisect_left, bisect_right, insort


class LookScheduler:
    def __init__(self, start: int, up: bool) -> None:
        self._pending: list[int] = []  # sorted, no duplicates (like a TreeSet)
        self._pos = start
        self._up = up

    def add_request(self, floor: int) -> None:
        i = bisect_left(self._pending, floor)
        if i == len(self._pending) or self._pending[i] != floor:
            insort(self._pending, floor)

    def _ahead(self) -> int | None:
        p = self._pending
        if self._up:  # ceiling(pos)
            i = bisect_left(p, self._pos)
            return p[i] if i < len(p) else None
        i = bisect_right(p, self._pos) - 1  # floor(pos)
        return p[i] if i >= 0 else None

    def next_stop(self) -> int:
        """Next floor to stop at under LOOK, or -1 if idle. Serves (removes) it and moves there."""
        if not self._pending:
            return -1
        nxt = self._ahead()
        if nxt is None:  # nothing ahead -> reverse (the LOOK turn)
            self._up = not self._up
            nxt = self._ahead()
        self._pending.remove(nxt)
        self._pos = nxt
        return nxt

    @staticmethod
    def serve_all(start: int, up: bool, req: list[int], order_out: list[int]) -> int:
        """Offline helper: fills the whole order and returns the distance."""
        s = LookScheduler(start, up)
        for f in req:
            s.add_request(f)
        dist, at = 0, start
        while (f := s.next_stop()) != -1:
            order_out.append(f)
            dist += abs(f - at)
            at = f
        return dist


if __name__ == "__main__":
    order: list[int] = []
    d = LookScheduler.serve_all(5, True, [8, 2, 6, 1, 4, 6], order)
    print(f"{order} distance={d}")  # [6, 8, 4, 2, 1] distance=10

    live = LookScheduler(5, True)
    live.add_request(3)
    live.add_request(7)
    live.add_request(6)  # arrives late, but is ahead
    print(live.next_stop(), live.next_stop(), live.next_stop())  # 6 7 3
    print(live.next_stop())  # -1: nothing pending, idle` },
          { lang: 'ts', code: `class LookScheduler {
  private readonly pending: number[] = []; // sorted, no duplicates (like a TreeSet)
  private pos: number;
  private up: boolean;

  constructor(start: number, up: boolean) { this.pos = start; this.up = up; }

  addRequest(floor: number): void {
    const i = this.pending.findIndex((f) => f >= floor);
    if (i === -1) this.pending.push(floor);
    else if (this.pending[i] !== floor) this.pending.splice(i, 0, floor);
  }

  private ahead(): number | undefined {
    return this.up
      ? this.pending.find((f) => f >= this.pos) // ceiling(pos)
      : this.pending.filter((f) => f <= this.pos).pop(); // floor(pos)
  }

  /** Next floor to stop at under LOOK, or -1 if idle. Serves (removes) it and moves there. */
  nextStop(): number {
    if (this.pending.length === 0) return -1;
    let next = this.ahead();
    if (next === undefined) { // nothing ahead -> reverse (the LOOK turn)
      this.up = !this.up;
      next = this.ahead();
    }
    this.pending.splice(this.pending.indexOf(next!), 1);
    this.pos = next!;
    return next!;
  }

  /** Offline helper: fills the whole order and returns the distance. */
  static serveAll(start: number, up: boolean, req: number[], orderOut: number[]): number {
    const s = new LookScheduler(start, up);
    req.forEach((f) => s.addRequest(f));
    let dist = 0;
    let at = start;
    for (let f = s.nextStop(); f !== -1; f = s.nextStop()) {
      orderOut.push(f);
      dist += Math.abs(f - at);
      at = f;
    }
    return dist;
  }
}

const order: number[] = [];
const d = LookScheduler.serveAll(5, true, [8, 2, 6, 1, 4, 6], order);
console.log(\`[\${order.join(", ")}] distance=\${d}\`); // [6, 8, 4, 2, 1] distance=10

const live = new LookScheduler(5, true);
live.addRequest(3); live.addRequest(7);
live.addRequest(6); // arrives late, but is ahead
const a = live.nextStop(), b = live.nextStop(), c = live.nextStop();
console.log(\`\${a} \${b} \${c}\`); // 6 7 3
console.log(live.nextStop()); // -1: nothing pending, idle` },
          { lang: 'cpp', code: `class LookScheduler {
    set<int> pending_;
    int pos_;
    bool up_;

    // ceiling(pos) when going up, floor(pos) when going down; -1 if nothing ahead
    int ahead() const {
        if (up_) {
            auto it = pending_.lower_bound(pos_);
            return it == pending_.end() ? -1 : *it;
        }
        auto it = pending_.upper_bound(pos_);
        return it == pending_.begin() ? -1 : *prev(it);
    }

public:
    LookScheduler(int start, bool up) : pos_(start), up_(up) {}

    void addRequest(int floor) { pending_.insert(floor); }

    // Next floor to stop at under LOOK, or -1 if idle. Serves (removes) it and moves there.
    int nextStop() {
        if (pending_.empty()) return -1;
        int next = ahead();
        if (next == -1) {  // nothing ahead -> reverse (the LOOK turn)
            up_ = !up_;
            next = ahead();
        }
        pending_.erase(next);
        pos_ = next;
        return next;
    }

    // Offline helper: fills the whole order and returns the distance.
    static long long serveAll(int start, bool up, const vector<int>& req, vector<int>& orderOut) {
        LookScheduler s(start, up);
        for (int f : req) s.addRequest(f);
        long long dist = 0;
        int at = start;
        for (int f = s.nextStop(); f != -1; f = s.nextStop()) {
            orderOut.push_back(f);
            dist += abs(f - at);
            at = f;
        }
        return dist;
    }
};

int main() {
    vector<int> order;
    long long d = LookScheduler::serveAll(5, true, {8, 2, 6, 1, 4, 6}, order);
    cout << "[";
    for (size_t i = 0; i < order.size(); i++) cout << (i ? ", " : "") << order[i];
    cout << "] distance=" << d << "\\n";  // [6, 8, 4, 2, 1] distance=10

    LookScheduler live(5, true);
    live.addRequest(3); live.addRequest(7);
    live.addRequest(6);  // arrives late, but is ahead
    int a = live.nextStop(), b = live.nextStop(), c = live.nextStop();
    cout << a << " " << b << " " << c << "\\n";  // 6 7 3
    cout << live.nextStop() << "\\n";            // -1: nothing pending, idle
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class LookScheduler {
    private readonly SortedSet<int> pending = new SortedSet<int>();
    private int pos;
    private bool up;

    public LookScheduler(int start, bool up) { pos = start; this.up = up; }

    public void AddRequest(int floor) { pending.Add(floor); }

    private int? Ceiling(int f) { SortedSet<int> v = pending.GetViewBetween(f, int.MaxValue); return v.Count > 0 ? v.Min : (int?)null; }
    private int? FloorOf(int f) { SortedSet<int> v = pending.GetViewBetween(int.MinValue, f); return v.Count > 0 ? v.Max : (int?)null; }

    /// Next floor to stop at under LOOK, or -1 if idle. Serves (removes) it and moves there.
    public int NextStop() {
        if (pending.Count == 0) return -1;
        int? next = up ? Ceiling(pos) : FloorOf(pos);
        if (next == null) {                         // nothing ahead -> reverse (the LOOK turn)
            up = !up;
            next = up ? Ceiling(pos) : FloorOf(pos);
        }
        pending.Remove(next.Value);
        pos = next.Value;
        return next.Value;
    }

    /// Offline helper: whole order + distance.
    public static long[] ServeAll(int start, bool up, List<int> req, List<int> orderOut) {
        LookScheduler s = new LookScheduler(start, up);
        foreach (int r in req) s.AddRequest(r);
        long dist = 0;
        int at = start;
        for (int f = s.NextStop(); f != -1; f = s.NextStop()) {
            orderOut.Add(f);
            dist += Math.Abs(f - at);
            at = f;
        }
        return new long[] { dist };
    }

    static void Main() {
        List<int> order = new List<int>();
        long[] d = ServeAll(5, true, new List<int> { 8, 2, 6, 1, 4, 6 }, order);
        Console.WriteLine("[" + string.Join(", ", order) + "] distance=" + d[0]);      // [6, 8, 4, 2, 1] distance=10

        LookScheduler live = new LookScheduler(5, true);
        live.AddRequest(3); live.AddRequest(7);
        live.AddRequest(6);                                     // arrives late, but is ahead
        Console.WriteLine(live.NextStop() + " " + live.NextStop() + " " + live.NextStop()); // 6 7 3
        Console.WriteLine(live.NextStop());                    // -1: nothing pending, idle
    }
}` }
        ],
        complexity: `<p>O(N log N) to insert N requests; each <code>nextStop</code> is O(log N). Space O(N). Compared with the brute force O(F × N), we never visit empty floors in the algorithm (the physical car still moves floor by floor, but the decision is instant).</p>`,
        followUps: ['Modify it into C-LOOK (only serve while going up; jump back to the lowest request).', 'Hall calls have a direction: a ▼ caller must not be served on the up sweep. How do you change the data structure?', 'Add a second car: how would you decide which scheduler gets a new request?']
      }
    }]
  });

  /* ======================= TOPIC 4: VENDING MACHINE ======================= */
  var VM_NODES = [B('IDLE', 'IDLE', 14, 30), B('HAS_MONEY', 'HAS_MONEY', 50, 8), B('DISPENSING', 'DISPENSING', 86, 30), B('SOLD_OUT', 'SOLD_OUT', 86, 56), B('MAINTENANCE', 'MAINTENANCE', 18, 56)];
  var VM_EDGES = [['IDLE', 'HAS_MONEY', 'coin'], ['HAS_MONEY', 'IDLE', 'cancel → refund'], ['HAS_MONEY', 'DISPENSING', 'select: paid + in stock + change ok'], ['DISPENSING', 'IDLE', 'item + change out'], ['DISPENSING', 'SOLD_OUT', 'last item sold'], ['SOLD_OUT', 'MAINTENANCE', 'operator'], ['IDLE', 'MAINTENANCE', 'operator'], ['MAINTENANCE', 'IDLE', 'done']];
  var VM_DENOMS = [20, 10, 5, 2, 1];
  // bounded change-making: largest coin first, with backtracking (pure greedy can fail with limited coins)
  function vmChange(amount, box) {
    var out = [];
    function go(rest, i) {
      if (rest === 0) return true;
      if (i === VM_DENOMS.length) return false;
      var c = VM_DENOMS[i], mx = Math.min(box[c] || 0, Math.floor(rest / c));
      for (var k = mx; k >= 0; k--) {
        for (var j = 0; j < k; j++) out.push(c);
        if (go(rest - k * c, i + 1)) return true;
        out.splice(out.length - k, k);
      }
      return false;
    }
    return go(amount, 0) ? out : null;
  }
  function vmPrep(inv) { return Object.keys(inv).map(function (k) { return [k, inv[k].name + ' ₹' + inv[k].price + ' ×' + inv[k].qty]; }); }
  function vmBox(box) { return VM_DENOMS.map(function (d) { return ['₹' + d, box[d] || 0]; }); }

  topics.push({
    title: 'Vending Machine: States, Inventory, Coins and Change',
    analogy: `<p>A vending machine is a <b>very strict shopkeeper with no eyes</b>. He only knows four things: "has this customer paid anything yet?", "is the snack still on the shelf?", "is the money enough?", and "do I have the right coins to give change?". If you ask for chips before paying, he points at the price. If you pay ₹20 for a ₹12 water, he must hand back ₹8 — and if his drawer only has ₹5 coins, he cannot sell to you at all and must give your ₹20 back. Each of those answers depends on <b>which state he is in</b> and <b>what is in his drawer and shelves</b>.</p>`,
    explain: `<p><b>Requirements (clarify first):</b> which coins/notes are accepted (say ₹1, 2, 5, 10, 20), product slots with price and quantity, cancel/refund, change-making with a <b>limited coin box</b>, sold-out handling, and an operator mode to restock and collect cash.</p>
${H.table(['Class', 'Responsibility'], [
  ['<code>VendingMachine</code> (context)', 'public API: <code>insertCoin</code>, <code>select</code>, <code>cancel</code>, <code>service</code>, <code>restock</code>; holds state, inventory, coin box, escrow'],
  ['<code>VmState</code> + 5 states', 'IDLE, HAS_MONEY, DISPENSING, SOLD_OUT, MAINTENANCE — each answers every event its own way'],
  ['<code>Inventory</code>', 'slot code → product + quantity; <code>inStock</code>, <code>takeOne</code>, <code>allEmpty</code>'],
  ['<code>Product</code> (immutable value)', 'code, name, price — immutable'],
  ['<code>Coin</code> (enum)', 'accepted denominations with values — invalid coins cannot even be represented'],
  ['<code>CoinBox</code>', 'count per coin; <code>planChange(amount)</code> with limited coins'],
  ['<b>Escrow</b> (list of inserted coins)', 'coins held aside until the sale completes — cancel returns <i>the exact coins</i> you put in']
])}
<p><b>The state × event table</b> (the heart of the design):</p>
${H.table(['State \\ Event', 'insertCoin', 'select(code)', 'cancel', 'operator'], [
  ['IDLE', H.c('g', '→ HAS_MONEY'), 'show price only', 'nothing to cancel', H.c('b', '→ MAINTENANCE')],
  ['HAS_MONEY', 'add to balance', H.c('g', 'checks pass → DISPENSING') + ' / else stay + message', H.c('y', 'refund → IDLE'), 'finish sale first'],
  ['DISPENSING', 'return coin, "please wait"', 'ignored', 'ignored', 'ignored'],
  ['SOLD_OUT', 'return coin, "sold out"', 'sold out', '—', H.c('b', '→ MAINTENANCE')],
  ['MAINTENANCE', 'return coin', 'ignored', '—', 'restock / done → IDLE or SOLD_OUT']
])}
<p><b>The four checks in HAS_MONEY.select()</b>, in this order: (1) slot exists, (2) slot is in stock, (3) balance ≥ price, (4) the machine <b>can make change</b> for balance − price using its coin box + the escrow coins. Only if all four pass do we move to DISPENSING. Doing check 4 <i>before</i> taking money and dropping the snack is what separates a senior answer from a junior one.</p>
<p><b>Brute force:</b> <code>if (balance == 0) {…} else if (dispensing) {…}</code> inside every method, plus booleans <code>soldOut</code>, <code>inService</code>. Adding "card payment" or "maintenance" means editing every method; a refund path gets forgotten and the machine eats money. ${H.c('g', 'With State objects each row of the table is one small class.')}</p>`,
    clues: [
      '"Design a vending machine" — the interviewer expects: states, inventory, coins/change, cancel/refund, sold out. Mention all five in your first minute.',
      '"Return change" + "limited coins" → bounded change-making; greedy can fail, so plan change <b>before</b> dispensing.',
      '"Cancel returns the money" → escrow: keep inserted coins separate until the sale commits.',
      '"Support new payment types (card, UPI) later" → a <code>PaymentMethod</code> Strategy feeding the same state machine.',
      '"Operator restocks / collects cash" → a MAINTENANCE state instead of an <code>isAdmin</code> flag.',
      '"Machine should never lose money or snacks" → transactional thinking: check everything, then commit stock + coins together.'
    ],
    code: { lang: 'java', title: 'Vending machine: State pattern + inventory + coin box with exact-change planning', code: `import java.util.*;

enum Coin {
    ONE(1), TWO(2), FIVE(5), TEN(10), TWENTY(20);
    final int value;
    Coin(int value) { this.value = value; }
}

record Product(String code, String name, int price) {}

class Inventory {
    private final Map<String, Product> products = new LinkedHashMap<>();
    private final Map<String, Integer> stock = new HashMap<>();
    void restock(Product p, int qty) { products.put(p.code(), p); stock.merge(p.code(), qty, Integer::sum); }
    Product find(String code)        { return products.get(code); }
    boolean inStock(String code)     { return stock.getOrDefault(code, 0) > 0; }
    void takeOne(String code)        { stock.computeIfPresent(code, (k, q) -> q - 1); }
    boolean allEmpty()               { return stock.values().stream().allMatch(q -> q == 0); }
}

class CoinBox {
    private final EnumMap<Coin, Integer> coins = new EnumMap<>(Coin.class);
    void add(Coin c, int n) { coins.merge(c, n, Integer::sum); }

    /** Change for 'amount' using box coins + 'extra' (escrow). Largest-first with backtracking. */
    Optional<List<Coin>> planChange(int amount, List<Coin> extra) {
        EnumMap<Coin, Integer> avail = new EnumMap<>(coins);
        extra.forEach(c -> avail.merge(c, 1, Integer::sum));
        List<Coin> desc = new ArrayList<>(List.of(Coin.values()));
        Collections.reverse(desc);                                 // 20, 10, 5, 2, 1
        List<Coin> out = new ArrayList<>();
        return search(amount, 0, desc, avail, out) ? Optional.of(out) : Optional.empty();
    }
    private boolean search(int amount, int i, List<Coin> desc, Map<Coin, Integer> avail, List<Coin> out) {
        if (amount == 0) return true;
        if (i == desc.size()) return false;
        Coin c = desc.get(i);
        int max = Math.min(avail.getOrDefault(c, 0), amount / c.value);
        for (int k = max; k >= 0; k--) {                           // try many big coins first, back off if stuck
            for (int j = 0; j < k; j++) out.add(c);
            if (search(amount - k * c.value, i + 1, desc, avail, out)) return true;
            for (int j = 0; j < k; j++) out.remove(out.size() - 1);
        }
        return false;
    }
    /** Commit a sale: escrow goes in, change comes out. */
    void commit(List<Coin> escrow, List<Coin> change) {
        escrow.forEach(c -> add(c, 1));
        change.forEach(c -> add(c, -1));
    }
    @Override public String toString() { return coins.toString(); }
}

interface VmState {
    String name();
    default void insertCoin(VendingMachine m, Coin c)   { m.show(name() + ": coin returned"); m.giveBack(List.of(c)); }
    default void select(VendingMachine m, String code)  { m.show(name() + ": cannot select now"); }
    default void cancel(VendingMachine m)               { m.show(name() + ": nothing to cancel"); }
    default void service(VendingMachine m)              { m.show(name() + ": cannot enter service now"); }
    default void restock(VendingMachine m, Product p, int qty) { m.show(name() + ": open service mode first"); }
    default void finishService(VendingMachine m)        { m.show(name() + ": not in service"); }
}

class Idle implements VmState {
    public String name() { return "IDLE"; }
    public void insertCoin(VendingMachine m, Coin c) { m.escrow().add(c); m.setState(new HasMoney()); }
    public void select(VendingMachine m, String code) {
        Product p = m.inventory().find(code);
        m.show(p == null ? "No such slot" : p.name() + " costs Rs " + p.price() + ". Insert coins.");
    }
    public void service(VendingMachine m) { m.setState(new Maintenance()); }
}

class HasMoney implements VmState {
    public String name() { return "HAS_MONEY"; }
    public void insertCoin(VendingMachine m, Coin c) { m.escrow().add(c); m.show("Balance Rs " + m.balance()); }
    public void select(VendingMachine m, String code) {
        Product p = m.inventory().find(code);
        if (p == null) { m.show("No such slot"); return; }                                  // check 1
        if (!m.inventory().inStock(code)) { m.show(p.name() + " sold out, pick another"); return; } // check 2
        int due = p.price() - m.balance();
        if (due > 0) { m.show("Insert Rs " + due + " more"); return; }                     // check 3
        Optional<List<Coin>> change = m.coinBox().planChange(-due, m.escrow());
        if (change.isEmpty()) { m.show("Cannot make change, pick another or cancel"); return; } // check 4
        m.setState(new Dispensing());
        m.completeSale(p, change.get());                    // commit stock + coins together
        m.setState(m.inventory().allEmpty() ? new SoldOut() : new Idle());
    }
    public void cancel(VendingMachine m) { m.giveBack(m.escrow()); m.escrow().clear(); m.setState(new Idle()); }
}

class Dispensing implements VmState {                     // in real hardware the motor takes ~2 s
    public String name() { return "DISPENSING"; }
}

class SoldOut implements VmState {
    public String name() { return "SOLD_OUT"; }
    public void service(VendingMachine m) { m.setState(new Maintenance()); }
}

class Maintenance implements VmState {
    public String name() { return "MAINTENANCE"; }
    public void restock(VendingMachine m, Product p, int qty) { m.inventory().restock(p, qty); m.show("Restocked " + p.code()); }
    public void finishService(VendingMachine m) { m.setState(m.inventory().allEmpty() ? new SoldOut() : new Idle()); }
}

class VendingMachine {
    private VmState state = new Idle();
    private final Inventory inventory = new Inventory();
    private final CoinBox coinBox = new CoinBox();
    private final List<Coin> escrow = new ArrayList<>();

    // ---- public API: every call is a one-line delegation ----
    void insertCoin(Coin c)              { state.insertCoin(this, c); }
    void select(String code)             { state.select(this, code); }
    void cancel()                        { state.cancel(this); }
    void service()                       { state.service(this); }
    void restock(Product p, int qty)     { state.restock(this, p, qty); }
    void finishService()                 { state.finishService(this); }

    // ---- used by states ----
    void setState(VmState s)             { show("[" + state.name() + " -> " + s.name() + "]"); state = s; }
    int balance()                        { return escrow.stream().mapToInt(c -> c.value).sum(); }
    void completeSale(Product p, List<Coin> change) {
        inventory.takeOne(p.code());
        coinBox.commit(escrow, change);
        escrow.clear();
        show("Dropped " + p.name() + (change.isEmpty() ? "" : ", change " + change));
    }
    void giveBack(List<Coin> coins)      { if (!coins.isEmpty()) show("Returned " + coins); }
    void show(String msg)                { System.out.println(msg); }
    List<Coin> escrow()                  { return escrow; }
    Inventory inventory()                { return inventory; }
    CoinBox coinBox()                    { return coinBox; }
    String stateName()                   { return state.name(); }

    public static void main(String[] args) {
        VendingMachine vm = new VendingMachine();
        vm.service();
        vm.restock(new Product("A1", "Chips", 15), 2);
        vm.restock(new Product("B2", "Water", 12), 3);
        vm.finishService();
        vm.coinBox().add(Coin.ONE, 1); vm.coinBox().add(Coin.TWO, 2);
        vm.select("A1");                                   // price only
        vm.insertCoin(Coin.TEN); vm.insertCoin(Coin.FIVE);
        vm.select("A1");                                   // exact money
        vm.insertCoin(Coin.TWENTY);
        vm.select("B2");                                   // change 8 = 5 + 2 + 1
        vm.insertCoin(Coin.TEN);
        vm.select("A1");                                   // needs 5 more
        vm.cancel();                                       // refund the exact 10 coin
        System.out.println("state=" + vm.stateName() + " box=" + vm.coinBox());
    }
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Coin(Enum):
    ONE = 1
    TWO = 2
    FIVE = 5
    TEN = 10
    TWENTY = 20


@dataclass(frozen=True)
class Product:
    code: str
    name: str
    price: int


class Inventory:
    def __init__(self) -> None:
        self._products: dict[str, Product] = {}
        self._stock: dict[str, int] = {}

    def restock(self, p: Product, qty: int) -> None:
        self._products[p.code] = p
        self._stock[p.code] = self._stock.get(p.code, 0) + qty

    def find(self, code: str) -> Optional[Product]: return self._products.get(code)
    def in_stock(self, code: str) -> bool: return self._stock.get(code, 0) > 0

    def take_one(self, code: str) -> None:
        if code in self._stock:
            self._stock[code] -= 1

    def all_empty(self) -> bool: return all(q == 0 for q in self._stock.values())


class CoinBox:
    def __init__(self) -> None:
        self._coins: dict[Coin, int] = {}

    def add(self, c: Coin, n: int) -> None:
        self._coins[c] = self._coins.get(c, 0) + n

    def plan_change(self, amount: int, extra: list[Coin]) -> Optional[list[Coin]]:
        """Change for 'amount' using box coins + 'extra' (escrow). Largest-first with backtracking."""
        avail = dict(self._coins)
        for c in extra:
            avail[c] = avail.get(c, 0) + 1
        desc = sorted(Coin, key=lambda c: c.value, reverse=True)  # 20, 10, 5, 2, 1
        out: list[Coin] = []
        return out if self._search(amount, 0, desc, avail, out) else None

    def _search(self, amount: int, i: int, desc: list[Coin], avail: dict[Coin, int], out: list[Coin]) -> bool:
        if amount == 0:
            return True
        if i == len(desc):
            return False
        c = desc[i]
        most = min(avail.get(c, 0), amount // c.value)
        for k in range(most, -1, -1):  # try many big coins first, back off if stuck
            out.extend([c] * k)
            if self._search(amount - k * c.value, i + 1, desc, avail, out):
                return True
            del out[len(out) - k:]
        return False

    def commit(self, escrow: list[Coin], change: list[Coin]) -> None:
        """Commit a sale: escrow goes in, change comes out."""
        for c in escrow:
            self.add(c, 1)
        for c in change:
            self.add(c, -1)

    def __str__(self) -> str:  # sorted by coin value, like Java's EnumMap
        items = sorted(self._coins.items(), key=lambda kv: kv[0].value)
        return "{" + ", ".join(f"{c.name}={n}" for c, n in items) + "}"


def names(coins: list[Coin]) -> str:
    return "[" + ", ".join(c.name for c in coins) + "]"


class VmState(ABC):
    @abstractmethod
    def name(self) -> str: ...

    def insert_coin(self, m: "VendingMachine", c: Coin) -> None:
        m.show(f"{self.name()}: coin returned")
        m.give_back([c])

    def select(self, m: "VendingMachine", code: str) -> None: m.show(f"{self.name()}: cannot select now")
    def cancel(self, m: "VendingMachine") -> None: m.show(f"{self.name()}: nothing to cancel")
    def service(self, m: "VendingMachine") -> None: m.show(f"{self.name()}: cannot enter service now")
    def restock(self, m: "VendingMachine", p: Product, qty: int) -> None: m.show(f"{self.name()}: open service mode first")
    def finish_service(self, m: "VendingMachine") -> None: m.show(f"{self.name()}: not in service")


class Idle(VmState):
    def name(self) -> str: return "IDLE"

    def insert_coin(self, m: "VendingMachine", c: Coin) -> None:
        m.escrow.append(c)
        m.set_state(HasMoney())

    def select(self, m: "VendingMachine", code: str) -> None:
        p = m.inventory.find(code)
        m.show("No such slot" if p is None else f"{p.name} costs Rs {p.price}. Insert coins.")

    def service(self, m: "VendingMachine") -> None: m.set_state(Maintenance())


class HasMoney(VmState):
    def name(self) -> str: return "HAS_MONEY"

    def insert_coin(self, m: "VendingMachine", c: Coin) -> None:
        m.escrow.append(c)
        m.show(f"Balance Rs {m.balance()}")

    def select(self, m: "VendingMachine", code: str) -> None:
        p = m.inventory.find(code)
        if p is None:
            m.show("No such slot")  # check 1
            return
        if not m.inventory.in_stock(code):
            m.show(f"{p.name} sold out, pick another")  # check 2
            return
        due = p.price - m.balance()
        if due > 0:
            m.show(f"Insert Rs {due} more")  # check 3
            return
        change = m.coin_box.plan_change(-due, m.escrow)
        if change is None:
            m.show("Cannot make change, pick another or cancel")  # check 4
            return
        m.set_state(Dispensing())
        m.complete_sale(p, change)  # commit stock + coins together
        m.set_state(SoldOut() if m.inventory.all_empty() else Idle())

    def cancel(self, m: "VendingMachine") -> None:
        m.give_back(m.escrow)
        m.escrow.clear()
        m.set_state(Idle())


class Dispensing(VmState):  # in real hardware the motor takes ~2 s
    def name(self) -> str: return "DISPENSING"


class SoldOut(VmState):
    def name(self) -> str: return "SOLD_OUT"
    def service(self, m: "VendingMachine") -> None: m.set_state(Maintenance())


class Maintenance(VmState):
    def name(self) -> str: return "MAINTENANCE"

    def restock(self, m: "VendingMachine", p: Product, qty: int) -> None:
        m.inventory.restock(p, qty)
        m.show(f"Restocked {p.code}")

    def finish_service(self, m: "VendingMachine") -> None:
        m.set_state(SoldOut() if m.inventory.all_empty() else Idle())


class VendingMachine:
    def __init__(self) -> None:
        self._state: VmState = Idle()
        self.inventory = Inventory()
        self.coin_box = CoinBox()
        self.escrow: list[Coin] = []

    # ---- public API: every call is a one-line delegation ----
    def insert_coin(self, c: Coin) -> None: self._state.insert_coin(self, c)
    def select(self, code: str) -> None: self._state.select(self, code)
    def cancel(self) -> None: self._state.cancel(self)
    def service(self) -> None: self._state.service(self)
    def restock(self, p: Product, qty: int) -> None: self._state.restock(self, p, qty)
    def finish_service(self) -> None: self._state.finish_service(self)

    # ---- used by states ----
    def set_state(self, s: VmState) -> None:
        self.show(f"[{self._state.name()} -> {s.name()}]")
        self._state = s

    def balance(self) -> int: return sum(c.value for c in self.escrow)

    def complete_sale(self, p: Product, change: list[Coin]) -> None:
        self.inventory.take_one(p.code)
        self.coin_box.commit(self.escrow, change)
        self.escrow.clear()
        self.show(f"Dropped {p.name}" + ("" if not change else f", change {names(change)}"))

    def give_back(self, coins: list[Coin]) -> None:
        if coins:
            self.show(f"Returned {names(coins)}")

    def show(self, msg: str) -> None: print(msg)
    def state_name(self) -> str: return self._state.name()


if __name__ == "__main__":
    vm = VendingMachine()
    vm.service()
    vm.restock(Product("A1", "Chips", 15), 2)
    vm.restock(Product("B2", "Water", 12), 3)
    vm.finish_service()
    vm.coin_box.add(Coin.ONE, 1); vm.coin_box.add(Coin.TWO, 2)
    vm.select("A1")  # price only
    vm.insert_coin(Coin.TEN); vm.insert_coin(Coin.FIVE)
    vm.select("A1")  # exact money
    vm.insert_coin(Coin.TWENTY)
    vm.select("B2")  # change 8 = 5 + 2 + 1
    vm.insert_coin(Coin.TEN)
    vm.select("A1")  # needs 5 more
    vm.cancel()  # refund the exact 10 coin
    print(f"state={vm.state_name()} box={vm.coin_box}")` },
          { lang: 'ts', code: `const COINS = ["ONE", "TWO", "FIVE", "TEN", "TWENTY"] as const;
type Coin = (typeof COINS)[number];
const VALUE: Record<Coin, number> = { ONE: 1, TWO: 2, FIVE: 5, TEN: 10, TWENTY: 20 };

interface Product { readonly code: string; readonly name: string; readonly price: number }

class Inventory {
  private readonly products = new Map<string, Product>();
  private readonly stock = new Map<string, number>();

  restock(p: Product, qty: number): void {
    this.products.set(p.code, p);
    this.stock.set(p.code, (this.stock.get(p.code) ?? 0) + qty);
  }
  find(code: string): Product | undefined { return this.products.get(code); }
  inStock(code: string): boolean { return (this.stock.get(code) ?? 0) > 0; }
  takeOne(code: string): void { const q = this.stock.get(code); if (q !== undefined) this.stock.set(code, q - 1); }
  allEmpty(): boolean { return [...this.stock.values()].every((q) => q === 0); }
}

class CoinBox {
  private readonly coins = new Map<Coin, number>();

  add(c: Coin, n: number): void { this.coins.set(c, (this.coins.get(c) ?? 0) + n); }

  /** Change for 'amount' using box coins + 'extra' (escrow). Largest-first with backtracking. */
  planChange(amount: number, extra: Coin[]): Coin[] | null {
    const avail = new Map(this.coins);
    for (const c of extra) avail.set(c, (avail.get(c) ?? 0) + 1);
    const desc = [...COINS].reverse(); // 20, 10, 5, 2, 1
    const out: Coin[] = [];
    return this.search(amount, 0, desc, avail, out) ? out : null;
  }

  private search(amount: number, i: number, desc: Coin[], avail: Map<Coin, number>, out: Coin[]): boolean {
    if (amount === 0) return true;
    if (i === desc.length) return false;
    const c = desc[i];
    const max = Math.min(avail.get(c) ?? 0, Math.floor(amount / VALUE[c]));
    for (let k = max; k >= 0; k--) { // try many big coins first, back off if stuck
      for (let j = 0; j < k; j++) out.push(c);
      if (this.search(amount - k * VALUE[c], i + 1, desc, avail, out)) return true;
      out.length -= k;
    }
    return false;
  }

  /** Commit a sale: escrow goes in, change comes out. */
  commit(escrow: Coin[], change: Coin[]): void {
    escrow.forEach((c) => this.add(c, 1));
    change.forEach((c) => this.add(c, -1));
  }

  toString(): string { // in coin order, like Java's EnumMap
    return "{" + COINS.filter((c) => this.coins.has(c)).map((c) => \`\${c}=\${this.coins.get(c)}\`).join(", ") + "}";
  }
}

const names = (coins: Coin[]): string => "[" + coins.join(", ") + "]";

interface VmState {
  name(): string;
  insertCoin(m: VendingMachine, c: Coin): void;
  select(m: VendingMachine, code: string): void;
  cancel(m: VendingMachine): void;
  service(m: VendingMachine): void;
  restock(m: VendingMachine, p: Product, qty: number): void;
  finishService(m: VendingMachine): void;
}

// Interfaces carry no code in TypeScript, so the "refuse everything" defaults live in a base class.
abstract class BaseVmState implements VmState {
  abstract name(): string;
  insertCoin(m: VendingMachine, c: Coin): void { m.show(\`\${this.name()}: coin returned\`); m.giveBack([c]); }
  select(m: VendingMachine, code: string): void { m.show(\`\${this.name()}: cannot select now\`); }
  cancel(m: VendingMachine): void { m.show(\`\${this.name()}: nothing to cancel\`); }
  service(m: VendingMachine): void { m.show(\`\${this.name()}: cannot enter service now\`); }
  restock(m: VendingMachine, p: Product, qty: number): void { m.show(\`\${this.name()}: open service mode first\`); }
  finishService(m: VendingMachine): void { m.show(\`\${this.name()}: not in service\`); }
}

class Idle extends BaseVmState {
  name(): string { return "IDLE"; }
  override insertCoin(m: VendingMachine, c: Coin): void { m.escrow.push(c); m.setState(new HasMoney()); }
  override select(m: VendingMachine, code: string): void {
    const p = m.inventory.find(code);
    m.show(p === undefined ? "No such slot" : \`\${p.name} costs Rs \${p.price}. Insert coins.\`);
  }
  override service(m: VendingMachine): void { m.setState(new Maintenance()); }
}

class HasMoney extends BaseVmState {
  name(): string { return "HAS_MONEY"; }
  override insertCoin(m: VendingMachine, c: Coin): void { m.escrow.push(c); m.show(\`Balance Rs \${m.balance()}\`); }
  override select(m: VendingMachine, code: string): void {
    const p = m.inventory.find(code);
    if (p === undefined) { m.show("No such slot"); return; } // check 1
    if (!m.inventory.inStock(code)) { m.show(\`\${p.name} sold out, pick another\`); return; } // check 2
    const due = p.price - m.balance();
    if (due > 0) { m.show(\`Insert Rs \${due} more\`); return; } // check 3
    const change = m.coinBox.planChange(-due, m.escrow);
    if (change === null) { m.show("Cannot make change, pick another or cancel"); return; } // check 4
    m.setState(new Dispensing());
    m.completeSale(p, change); // commit stock + coins together
    m.setState(m.inventory.allEmpty() ? new SoldOut() : new Idle());
  }
  override cancel(m: VendingMachine): void { m.giveBack(m.escrow); m.escrow.length = 0; m.setState(new Idle()); }
}

class Dispensing extends BaseVmState { // in real hardware the motor takes ~2 s
  name(): string { return "DISPENSING"; }
}

class SoldOut extends BaseVmState {
  name(): string { return "SOLD_OUT"; }
  override service(m: VendingMachine): void { m.setState(new Maintenance()); }
}

class Maintenance extends BaseVmState {
  name(): string { return "MAINTENANCE"; }
  override restock(m: VendingMachine, p: Product, qty: number): void { m.inventory.restock(p, qty); m.show(\`Restocked \${p.code}\`); }
  override finishService(m: VendingMachine): void { m.setState(m.inventory.allEmpty() ? new SoldOut() : new Idle()); }
}

class VendingMachine {
  private state: VmState = new Idle();
  readonly inventory = new Inventory();
  readonly coinBox = new CoinBox();
  readonly escrow: Coin[] = [];

  // ---- public API: every call is a one-line delegation ----
  insertCoin(c: Coin): void { this.state.insertCoin(this, c); }
  select(code: string): void { this.state.select(this, code); }
  cancel(): void { this.state.cancel(this); }
  service(): void { this.state.service(this); }
  restock(p: Product, qty: number): void { this.state.restock(this, p, qty); }
  finishService(): void { this.state.finishService(this); }

  // ---- used by states ----
  setState(s: VmState): void { this.show(\`[\${this.state.name()} -> \${s.name()}]\`); this.state = s; }
  balance(): number { return this.escrow.reduce((sum, c) => sum + VALUE[c], 0); }
  completeSale(p: Product, change: Coin[]): void {
    this.inventory.takeOne(p.code);
    this.coinBox.commit(this.escrow, change);
    this.escrow.length = 0;
    this.show(\`Dropped \${p.name}\` + (change.length === 0 ? "" : \`, change \${names(change)}\`));
  }
  giveBack(coins: Coin[]): void { if (coins.length > 0) this.show(\`Returned \${names(coins)}\`); }
  show(msg: string): void { console.log(msg); }
  stateName(): string { return this.state.name(); }
}

const vm = new VendingMachine();
vm.service();
vm.restock({ code: "A1", name: "Chips", price: 15 }, 2);
vm.restock({ code: "B2", name: "Water", price: 12 }, 3);
vm.finishService();
vm.coinBox.add("ONE", 1); vm.coinBox.add("TWO", 2);
vm.select("A1"); // price only
vm.insertCoin("TEN"); vm.insertCoin("FIVE");
vm.select("A1"); // exact money
vm.insertCoin("TWENTY");
vm.select("B2"); // change 8 = 5 + 2 + 1
vm.insertCoin("TEN");
vm.select("A1"); // needs 5 more
vm.cancel(); // refund the exact 10 coin
console.log(\`state=\${vm.stateName()} box=\${vm.coinBox}\`);` },
          { lang: 'cpp', code: `enum class Coin { ONE, TWO, FIVE, TEN, TWENTY };

constexpr int value(Coin c) {
    constexpr int v[] = {1, 2, 5, 10, 20};
    return v[static_cast<int>(c)];
}
const char* name(Coin c) {
    static const char* n[] = {"ONE", "TWO", "FIVE", "TEN", "TWENTY"};
    return n[static_cast<int>(c)];
}
string names(const vector<Coin>& coins) {
    string s = "[";
    for (size_t i = 0; i < coins.size(); i++) s += (i ? ", " : "") + string(name(coins[i]));
    return s + "]";
}

struct Product {
    string code, name;
    int price;
};

class Inventory {
    map<string, Product> products_;  // sorted by code; only lookups matter here
    map<string, int> stock_;

public:
    void restock(const Product& p, int qty) { products_[p.code] = p; stock_[p.code] += qty; }
    const Product* find(const string& code) const {
        auto it = products_.find(code);
        return it == products_.end() ? nullptr : &it->second;
    }
    bool inStock(const string& code) const {
        auto it = stock_.find(code);
        return it != stock_.end() && it->second > 0;
    }
    void takeOne(const string& code) { auto it = stock_.find(code); if (it != stock_.end()) it->second--; }
    bool allEmpty() const {
        return all_of(stock_.begin(), stock_.end(), [](const auto& e) { return e.second == 0; });
    }
};

class CoinBox {
    map<Coin, int> coins_;  // ordered by enum value, like Java's EnumMap

    bool search(int amount, size_t i, const vector<Coin>& desc, const map<Coin, int>& avail, vector<Coin>& out) const {
        if (amount == 0) return true;
        if (i == desc.size()) return false;
        Coin c = desc[i];
        auto it = avail.find(c);
        int most = min(it == avail.end() ? 0 : it->second, amount / value(c));
        for (int k = most; k >= 0; k--) {  // try many big coins first, back off if stuck
            out.insert(out.end(), k, c);
            if (search(amount - k * value(c), i + 1, desc, avail, out)) return true;
            out.resize(out.size() - k);
        }
        return false;
    }

public:
    void add(Coin c, int n) { coins_[c] += n; }

    // Change for 'amount' using box coins + 'extra' (escrow). Largest-first with backtracking.
    optional<vector<Coin>> planChange(int amount, const vector<Coin>& extra) const {
        map<Coin, int> avail = coins_;
        for (Coin c : extra) avail[c]++;
        vector<Coin> desc = {Coin::TWENTY, Coin::TEN, Coin::FIVE, Coin::TWO, Coin::ONE};
        vector<Coin> out;
        if (!search(amount, 0, desc, avail, out)) return nullopt;
        return out;
    }

    // Commit a sale: escrow goes in, change comes out.
    void commit(const vector<Coin>& escrow, const vector<Coin>& change) {
        for (Coin c : escrow) add(c, 1);
        for (Coin c : change) add(c, -1);
    }

    string toString() const {
        string s = "{";
        for (const auto& [c, n] : coins_) s += (s.size() > 1 ? ", " : "") + string(name(c)) + "=" + to_string(n);
        return s + "}";
    }
};

class VendingMachine;

// Stateless singletons: the machine holds a pointer to the current one.
struct VmState {
    virtual ~VmState() = default;
    virtual string name() const = 0;
    virtual void insertCoin(VendingMachine& m, Coin c) const;
    virtual void select(VendingMachine& m, const string& code) const;
    virtual void cancel(VendingMachine& m) const;
    virtual void service(VendingMachine& m) const;
    virtual void restock(VendingMachine& m, const Product& p, int qty) const;
    virtual void finishService(VendingMachine& m) const;
};
struct Idle final : VmState {
    static const Idle I;
    string name() const override { return "IDLE"; }
    void insertCoin(VendingMachine& m, Coin c) const override;
    void select(VendingMachine& m, const string& code) const override;
    void service(VendingMachine& m) const override;
};
struct HasMoney final : VmState {
    static const HasMoney I;
    string name() const override { return "HAS_MONEY"; }
    void insertCoin(VendingMachine& m, Coin c) const override;
    void select(VendingMachine& m, const string& code) const override;
    void cancel(VendingMachine& m) const override;
};
struct Dispensing final : VmState {  // in real hardware the motor takes ~2 s
    static const Dispensing I;
    string name() const override { return "DISPENSING"; }
};
struct SoldOut final : VmState {
    static const SoldOut I;
    string name() const override { return "SOLD_OUT"; }
    void service(VendingMachine& m) const override;
};
struct Maintenance final : VmState {
    static const Maintenance I;
    string name() const override { return "MAINTENANCE"; }
    void restock(VendingMachine& m, const Product& p, int qty) const override;
    void finishService(VendingMachine& m) const override;
};
inline const Idle Idle::I;
inline const HasMoney HasMoney::I;
inline const Dispensing Dispensing::I;
inline const SoldOut SoldOut::I;
inline const Maintenance Maintenance::I;

class VendingMachine {
    const VmState* state_ = &Idle::I;
    Inventory inventory_;
    CoinBox coinBox_;
    vector<Coin> escrow_;

public:
    // ---- public API: every call is a one-line delegation ----
    void insertCoin(Coin c) { state_->insertCoin(*this, c); }
    void select(const string& code) { state_->select(*this, code); }
    void cancel() { state_->cancel(*this); }
    void service() { state_->service(*this); }
    void restock(const Product& p, int qty) { state_->restock(*this, p, qty); }
    void finishService() { state_->finishService(*this); }

    // ---- used by states ----
    void setState(const VmState& s) { show("[" + state_->name() + " -> " + s.name() + "]"); state_ = &s; }
    int balance() const {
        int sum = 0;
        for (Coin c : escrow_) sum += value(c);
        return sum;
    }
    void completeSale(const Product& p, const vector<Coin>& change) {
        inventory_.takeOne(p.code);
        coinBox_.commit(escrow_, change);
        escrow_.clear();
        show("Dropped " + p.name + (change.empty() ? "" : ", change " + names(change)));
    }
    void giveBack(const vector<Coin>& coins) { if (!coins.empty()) show("Returned " + names(coins)); }
    void show(const string& msg) const { cout << msg << "\\n"; }
    vector<Coin>& escrow() { return escrow_; }
    Inventory& inventory() { return inventory_; }
    CoinBox& coinBox() { return coinBox_; }
    string stateName() const { return state_->name(); }
};

void VmState::insertCoin(VendingMachine& m, Coin c) const { m.show(name() + ": coin returned"); m.giveBack({c}); }
void VmState::select(VendingMachine& m, const string&) const { m.show(name() + ": cannot select now"); }
void VmState::cancel(VendingMachine& m) const { m.show(name() + ": nothing to cancel"); }
void VmState::service(VendingMachine& m) const { m.show(name() + ": cannot enter service now"); }
void VmState::restock(VendingMachine& m, const Product&, int) const { m.show(name() + ": open service mode first"); }
void VmState::finishService(VendingMachine& m) const { m.show(name() + ": not in service"); }

void Idle::insertCoin(VendingMachine& m, Coin c) const { m.escrow().push_back(c); m.setState(HasMoney::I); }
void Idle::select(VendingMachine& m, const string& code) const {
    const Product* p = m.inventory().find(code);
    m.show(!p ? "No such slot" : p->name + " costs Rs " + to_string(p->price) + ". Insert coins.");
}
void Idle::service(VendingMachine& m) const { m.setState(Maintenance::I); }

void HasMoney::insertCoin(VendingMachine& m, Coin c) const { m.escrow().push_back(c); m.show("Balance Rs " + to_string(m.balance())); }
void HasMoney::select(VendingMachine& m, const string& code) const {
    const Product* p = m.inventory().find(code);
    if (!p) { m.show("No such slot"); return; }                                                  // check 1
    if (!m.inventory().inStock(code)) { m.show(p->name + " sold out, pick another"); return; }    // check 2
    int due = p->price - m.balance();
    if (due > 0) { m.show("Insert Rs " + to_string(due) + " more"); return; }                    // check 3
    auto change = m.coinBox().planChange(-due, m.escrow());
    if (!change) { m.show("Cannot make change, pick another or cancel"); return; }               // check 4
    m.setState(Dispensing::I);
    m.completeSale(*p, *change);  // commit stock + coins together
    if (m.inventory().allEmpty()) m.setState(SoldOut::I); else m.setState(Idle::I);
}
void HasMoney::cancel(VendingMachine& m) const { m.giveBack(m.escrow()); m.escrow().clear(); m.setState(Idle::I); }

void SoldOut::service(VendingMachine& m) const { m.setState(Maintenance::I); }

void Maintenance::restock(VendingMachine& m, const Product& p, int qty) const { m.inventory().restock(p, qty); m.show("Restocked " + p.code); }
void Maintenance::finishService(VendingMachine& m) const {
    if (m.inventory().allEmpty()) m.setState(SoldOut::I); else m.setState(Idle::I);
}

int main() {
    VendingMachine vm;
    vm.service();
    vm.restock({"A1", "Chips", 15}, 2);
    vm.restock({"B2", "Water", 12}, 3);
    vm.finishService();
    vm.coinBox().add(Coin::ONE, 1); vm.coinBox().add(Coin::TWO, 2);
    vm.select("A1");  // price only
    vm.insertCoin(Coin::TEN); vm.insertCoin(Coin::FIVE);
    vm.select("A1");  // exact money
    vm.insertCoin(Coin::TWENTY);
    vm.select("B2");  // change 8 = 5 + 2 + 1
    vm.insertCoin(Coin::TEN);
    vm.select("A1");  // needs 5 more
    vm.cancel();      // refund the exact 10 coin
    cout << "state=" << vm.stateName() << " box=" << vm.coinBox().toString() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

enum Coin { ONE = 1, TWO = 2, FIVE = 5, TEN = 10, TWENTY = 20 }

sealed class Product {
    public readonly string Code, Name; public readonly int Price;
    public Product(string code, string name, int price) { Code = code; Name = name; Price = price; }
}

class Inventory {
    private readonly Dictionary<string, Product> products = new Dictionary<string, Product>();
    private readonly Dictionary<string, int> stock = new Dictionary<string, int>();
    public void Restock(Product p, int qty) { products[p.Code] = p; int q; stock.TryGetValue(p.Code, out q); stock[p.Code] = q + qty; }
    public Product Find(string code)       { Product p; return products.TryGetValue(code, out p) ? p : null; }
    public bool InStock(string code)       { int q; return stock.TryGetValue(code, out q) && q > 0; }
    public void TakeOne(string code)       { if (stock.ContainsKey(code)) stock[code]--; }
    public bool AllEmpty()                 { return stock.Values.All(q => q == 0); }
}

class CoinBox {
    private readonly SortedDictionary<Coin, int> coins = new SortedDictionary<Coin, int>();
    public void Add(Coin c, int n) { int q; coins.TryGetValue(c, out q); coins[c] = q + n; }

    /// Change for 'amount' using box coins + 'extra' (escrow). Largest-first with backtracking. Null when impossible.
    public List<Coin> PlanChange(int amount, List<Coin> extra) {
        Dictionary<Coin, int> avail = new Dictionary<Coin, int>(coins);
        foreach (Coin c in extra) { int q; avail.TryGetValue(c, out q); avail[c] = q + 1; }
        List<Coin> desc = ((Coin[])Enum.GetValues(typeof(Coin))).OrderByDescending(c => (int)c).ToList();   // 20, 10, 5, 2, 1
        List<Coin> result = new List<Coin>();
        return Search(amount, 0, desc, avail, result) ? result : null;
    }
    private bool Search(int amount, int i, List<Coin> desc, Dictionary<Coin, int> avail, List<Coin> result) {
        if (amount == 0) return true;
        if (i == desc.Count) return false;
        Coin c = desc[i];
        int have; avail.TryGetValue(c, out have);
        int max = Math.Min(have, amount / (int)c);
        for (int k = max; k >= 0; k--) {                           // try many big coins first, back off if stuck
            for (int j = 0; j < k; j++) result.Add(c);
            if (Search(amount - k * (int)c, i + 1, desc, avail, result)) return true;
            for (int j = 0; j < k; j++) result.RemoveAt(result.Count - 1);
        }
        return false;
    }
    /// Commit a sale: escrow goes in, change comes out.
    public void Commit(List<Coin> escrow, List<Coin> change) {
        foreach (Coin c in escrow) Add(c, 1);
        foreach (Coin c in change) Add(c, -1);
    }
    public override string ToString() { return "{" + string.Join(", ", coins.Select(kv => kv.Key + "=" + kv.Value)) + "}"; }
}

abstract class VmState {
    public abstract string Name();
    public virtual void InsertCoin(VendingMachine m, Coin c)   { m.Show(Name() + ": coin returned"); m.GiveBack(new List<Coin> { c }); }
    public virtual void Select(VendingMachine m, string code)  { m.Show(Name() + ": cannot select now"); }
    public virtual void Cancel(VendingMachine m)               { m.Show(Name() + ": nothing to cancel"); }
    public virtual void Service(VendingMachine m)              { m.Show(Name() + ": cannot enter service now"); }
    public virtual void Restock(VendingMachine m, Product p, int qty) { m.Show(Name() + ": open service mode first"); }
    public virtual void FinishService(VendingMachine m)        { m.Show(Name() + ": not in service"); }
}

class Idle : VmState {
    public override string Name() { return "IDLE"; }
    public override void InsertCoin(VendingMachine m, Coin c) { m.Escrow().Add(c); m.SetState(new HasMoney()); }
    public override void Select(VendingMachine m, string code) {
        Product p = m.Inventory().Find(code);
        m.Show(p == null ? "No such slot" : p.Name + " costs Rs " + p.Price + ". Insert coins.");
    }
    public override void Service(VendingMachine m) { m.SetState(new Maintenance()); }
}

class HasMoney : VmState {
    public override string Name() { return "HAS_MONEY"; }
    public override void InsertCoin(VendingMachine m, Coin c) { m.Escrow().Add(c); m.Show("Balance Rs " + m.Balance()); }
    public override void Select(VendingMachine m, string code) {
        Product p = m.Inventory().Find(code);
        if (p == null) { m.Show("No such slot"); return; }                                  // check 1
        if (!m.Inventory().InStock(code)) { m.Show(p.Name + " sold out, pick another"); return; } // check 2
        int due = p.Price - m.Balance();
        if (due > 0) { m.Show("Insert Rs " + due + " more"); return; }                     // check 3
        List<Coin> change = m.CoinBox().PlanChange(-due, m.Escrow());
        if (change == null) { m.Show("Cannot make change, pick another or cancel"); return; } // check 4
        m.SetState(new Dispensing());
        m.CompleteSale(p, change);                          // commit stock + coins together
        m.SetState(m.Inventory().AllEmpty() ? (VmState)new SoldOut() : new Idle());
    }
    public override void Cancel(VendingMachine m) { m.GiveBack(m.Escrow()); m.Escrow().Clear(); m.SetState(new Idle()); }
}

class Dispensing : VmState {                     // in real hardware the motor takes ~2 s
    public override string Name() { return "DISPENSING"; }
}

class SoldOut : VmState {
    public override string Name() { return "SOLD_OUT"; }
    public override void Service(VendingMachine m) { m.SetState(new Maintenance()); }
}

class Maintenance : VmState {
    public override string Name() { return "MAINTENANCE"; }
    public override void Restock(VendingMachine m, Product p, int qty) { m.Inventory().Restock(p, qty); m.Show("Restocked " + p.Code); }
    public override void FinishService(VendingMachine m) { m.SetState(m.Inventory().AllEmpty() ? (VmState)new SoldOut() : new Idle()); }
}

class VendingMachine {
    private VmState state = new Idle();
    private readonly Inventory inventory = new Inventory();
    private readonly CoinBox coinBox = new CoinBox();
    private readonly List<Coin> escrow = new List<Coin>();

    // ---- public API: every call is a one-line delegation ----
    public void InsertCoin(Coin c)              { state.InsertCoin(this, c); }
    public void Select(string code)             { state.Select(this, code); }
    public void Cancel()                        { state.Cancel(this); }
    public void Service()                       { state.Service(this); }
    public void Restock(Product p, int qty)     { state.Restock(this, p, qty); }
    public void FinishService()                 { state.FinishService(this); }

    // ---- used by states ----
    public void SetState(VmState s)             { Show("[" + state.Name() + " -> " + s.Name() + "]"); state = s; }
    public int Balance()                        { return escrow.Sum(c => (int)c); }
    public void CompleteSale(Product p, List<Coin> change) {
        inventory.TakeOne(p.Code);
        coinBox.Commit(escrow, change);
        escrow.Clear();
        Show("Dropped " + p.Name + (change.Count == 0 ? "" : ", change [" + string.Join(", ", change) + "]"));
    }
    public void GiveBack(List<Coin> coins)      { if (coins.Count > 0) Show("Returned [" + string.Join(", ", coins) + "]"); }
    public void Show(string msg)                { Console.WriteLine(msg); }
    public List<Coin> Escrow()                  { return escrow; }
    public Inventory Inventory()                { return inventory; }
    public CoinBox CoinBox()                    { return coinBox; }
    public string StateName()                   { return state.Name(); }

    static void Main() {
        VendingMachine vm = new VendingMachine();
        vm.Service();
        vm.Restock(new Product("A1", "Chips", 15), 2);
        vm.Restock(new Product("B2", "Water", 12), 3);
        vm.FinishService();
        vm.CoinBox().Add(Coin.ONE, 1); vm.CoinBox().Add(Coin.TWO, 2);
        vm.Select("A1");                                   // price only
        vm.InsertCoin(Coin.TEN); vm.InsertCoin(Coin.FIVE);
        vm.Select("A1");                                   // exact money
        vm.InsertCoin(Coin.TWENTY);
        vm.Select("B2");                                   // change 8 = 5 + 2 + 1
        vm.InsertCoin(Coin.TEN);
        vm.Select("A1");                                   // needs 5 more
        vm.Cancel();                                       // refund the exact 10 coin
        Console.WriteLine("state=" + vm.StateName() + " box=" + vm.CoinBox());
    }
}` }
        ] },
    viz: {
      title: 'Vending machine: coins flow in, checks run, snack and change flow out',
      input: 'coin 10, coin 5, select A1, coin 20, select B1, select B2, coin 10, select A2, coin 20, select B2, cancel',
      inputLabel: 'Events: coin N (1,2,5,10,20), select A1|A2|B1|B2, cancel, service, restock CODE N, done',
      gen: function (input) {
        var evs = tokens(input, ',', 14, 'Example: coin 10, coin 5, select A1, cancel');
        var inv = { A1: { name: 'Chips', price: 15, qty: 2 }, A2: { name: 'Soda', price: 25, qty: 1 }, B1: { name: 'Candy', price: 10, qty: 0 }, B2: { name: 'Water', price: 12, qty: 3 } };
        var box = { 20: 0, 10: 1, 5: 0, 2: 1, 1: 1 };
        var state = 'IDLE', escrow = [], frames = [], sales = 0;
        function bal() { return escrow.reduce(function (a, b) { return a + b; }, 0); }
        function allEmpty() { return Object.keys(inv).every(function (k) { return inv[k].qty === 0; }); }
        function snap(narr, cur, cls, edge, ihl, bhl, msg) {
          frames.push(F(narr, [
            SM('Vending machine states', VM_NODES, VM_EDGES, cur, cls, edge, 'ok', null, 64),
            MAP('Inventory (slot → product, price, qty)', vmPrep(inv), ihl || {}),
            MAP('Coin box (machine\'s own coins)', vmBox(box), bhl || {}),
            VARS('Customer side', { escrow: escrow.length ? escrow.join('+') : '—', balance: '₹' + bal(), display: msg || '' }, msg ? { display: cls === 'bad' ? 'bad' : 'cur' } : {})
          ]));
        }
        snap('Machine starts <b>IDLE</b>. Inventory: B1 (Candy) is already empty. The coin box has only ₹10×1, ₹2×1, ₹1×1 for change — watch how that limits sales.', 'IDLE', 'cur', null, { B1: 'bad' }, {}, 'Insert coins');
        evs.forEach(function (raw) {
          var p = raw.trim().split(/\s+/), cmd = p[0].toLowerCase();
          if (cmd === 'coin') {
            var v = parseInt(p[1], 10);
            if (VM_DENOMS.indexOf(v) < 0) throw new Error('Coins must be 1, 2, 5, 10 or 20');
            if (state === 'IDLE' || state === 'HAS_MONEY') {
              escrow.push(v);
              var from = state; state = 'HAS_MONEY';
              snap('<b>coin ₹' + v + '</b>: ' + (from === 'IDLE' ? '<code>Idle.insertCoin()</code> puts the coin in <b>escrow</b> (a holding tray, not yet the machine\'s money) and moves to HAS_MONEY.' : '<code>HasMoney.insertCoin()</code> adds it to escrow; still HAS_MONEY.') + ' Balance = ₹' + bal() + '.', 'HAS_MONEY', 'ok', from === 'IDLE' ? 'IDLE-HAS_MONEY' : null, {}, {}, 'Balance ₹' + bal());
            } else {
              snap('<b>coin ₹' + v + '</b> while ' + state + ': this state does not accept coins, so the default method <b>returns the coin</b> immediately. No money is ever kept in a state that cannot sell.', state, 'bad', null, {}, {}, 'Coin returned');
            }
          } else if (cmd === 'select') {
            var code = String(p[1] || '').toUpperCase(), it = inv[code];
            if (!it) throw new Error('Slots are A1, A2, B1, B2');
            if (state === 'IDLE') { snap('<b>select ' + code + '</b> in IDLE: no money yet, so <code>Idle.select()</code> just shows the price.', 'IDLE', 'cur', null, one(code, 'cur'), {}, it.name + ' costs ₹' + it.price); return; }
            if (state !== 'HAS_MONEY') { snap('<b>select ' + code + '</b> in ' + state + ': ignored by this state.', state, 'bad', null, {}, {}, 'Not available'); return; }
            if (it.qty === 0) { snap('<b>select ' + code + '</b>: check 2 fails — ' + it.name + ' is <b>sold out</b>. Stay in HAS_MONEY so the customer can pick another item or cancel. The money is safe in escrow.', 'HAS_MONEY', 'bad', null, one(code, 'bad'), {}, it.name + ' sold out'); return; }
            var due = it.price - bal();
            if (due > 0) { snap('<b>select ' + code + '</b>: check 3 fails — price ₹' + it.price + ', balance ₹' + bal() + '. Need ₹' + due + ' more. Stay in HAS_MONEY.', 'HAS_MONEY', 'bad', null, one(code, 'cur'), {}, 'Insert ₹' + due + ' more'); return; }
            var tmp = {}; VM_DENOMS.forEach(function (d) { tmp[d] = box[d] || 0; }); escrow.forEach(function (c) { tmp[c]++; });
            var ch = vmChange(-due, tmp);
            if (!ch) { snap('<b>select ' + code + '</b>: check 4 fails — change of ₹' + (-due) + ' is <b>impossible</b> with the coins available (box + escrow). We refuse <i>before</i> dropping the snack, so nothing needs undoing. Customer can pick another item or cancel.', 'HAS_MONEY', 'bad', null, one(code, 'cur'), {}, 'No change, pick another'); return; }
            snap('<b>select ' + code + '</b>: all 4 checks pass (slot ok, in stock, ₹' + bal() + ' ≥ ₹' + it.price + ', change ₹' + (-due) + ' = ' + (ch.length ? ch.join('+') : 'none') + '). Move to <b>DISPENSING</b>: the motor turns and new coins/selections are refused until it finishes.', 'DISPENSING', 'cur', 'HAS_MONEY-DISPENSING', one(code, 'ok'), {}, 'Dispensing ' + it.name);
            it.qty--; escrow.forEach(function (c) { box[c]++; }); ch.forEach(function (c) { box[c]--; });
            var bhl = {}; escrow.forEach(function (c) { bhl['₹' + c] = 'ok'; }); ch.forEach(function (c) { bhl['₹' + c] = 'bad'; });
            escrow = []; sales++;
            var next = allEmpty() ? 'SOLD_OUT' : 'IDLE';
            snap('<b>Commit</b>: stock of ' + code + ' −1, escrow coins move into the coin box (green), change coins leave it (red) — all in one step so stock and money always agree. Then → <b>' + next + '</b>.', next, 'ok', 'DISPENSING-' + next, one(code, 'ok'), bhl, 'Take ' + it.name + (ch.length ? ' + ₹' + (-due) + ' change' : ''));
            state = next;
          } else if (cmd === 'cancel') {
            if (state === 'HAS_MONEY') {
              var back = escrow.join('+'); escrow = []; state = 'IDLE';
              snap('<b>cancel</b>: <code>HasMoney.cancel()</code> returns the <b>exact coins</b> from escrow (' + back + ') — the coin box is untouched — and goes back to IDLE.', 'IDLE', 'ok', 'HAS_MONEY-IDLE', {}, {}, 'Refunded ' + back);
            } else snap('<b>cancel</b> in ' + state + ': nothing to cancel (default method).', state, 'cur', null, {}, {}, 'Nothing to cancel');
          } else if (cmd === 'service') {
            if (state === 'IDLE' || state === 'SOLD_OUT') { var f0 = state; state = 'MAINTENANCE'; snap('<b>service</b>: operator opens the machine → MAINTENANCE. Customers cannot buy now; coins are returned.', 'MAINTENANCE', 'ok', f0 + '-MAINTENANCE', {}, {}, 'Out of service'); }
            else snap('<b>service</b> in ' + state + ': refused — finish or cancel the current sale first (never open the machine with a customer\'s money in escrow).', state, 'bad', null, {}, {}, 'Finish sale first');
          } else if (cmd === 'restock') {
            var rc = String(p[1] || '').toUpperCase(), n = parseInt(p[2], 10);
            if (!inv[rc] || isNaN(n) || n < 1 || n > 20) throw new Error('restock CODE N, e.g. restock B1 5');
            if (state !== 'MAINTENANCE') { snap('<b>restock</b> in ' + state + ': only allowed in MAINTENANCE.', state, 'bad', null, {}, {}, 'Open service mode first'); return; }
            inv[rc].qty += n;
            snap('<b>restock ' + rc + ' +' + n + '</b>: <code>Maintenance.restock()</code> updates the inventory.', 'MAINTENANCE', 'cur', null, one(rc, 'ok'), {}, 'Restocked');
          } else if (cmd === 'done') {
            if (state !== 'MAINTENANCE') { snap('<b>done</b> in ' + state + ': not in service mode.', state, 'bad', null, {}, {}, 'Not in service'); return; }
            state = allEmpty() ? 'SOLD_OUT' : 'IDLE';
            snap('<b>done</b>: leave MAINTENANCE → ' + state + (state === 'SOLD_OUT' ? ' (everything is still empty, so customers see SOLD OUT).' : '.'), state, 'ok', state === 'IDLE' ? 'MAINTENANCE-IDLE' : null, {}, {}, 'Ready');
          } else throw new Error('Unknown event "' + raw + '". Use coin N, select CODE, cancel, service, restock CODE N, done');
        });
        snap('End of script: <b>' + sales + '</b> sale(s). Every rule above lived in the state that owns it; the <code>VendingMachine</code> class never asked "what state am I in?".', state, 'sel', null, {}, {}, 'Bye');
        return frames;
      }
    },
    examples: [
      { title: 'Why greedy change can fail with a limited coin box', html: `<p>Change needed: ₹6. Coin box: ₹5×1, ₹2×3 (no ₹1). Greedy takes ₹5, then needs ₹1 — none → "cannot make change" ✗. But ₹2+₹2+₹2 works ✓. ${H.table(['Approach', 'Coins tried', 'Result'], [['Greedy (largest first, no backtracking)', '5, then stuck at 1', H.c('r', 'fail')], ['Largest-first with backtracking', '5 → stuck → undo → 2+2+2', H.c('g', 'ok')], ['Bounded DP (fewest coins)', 'best over all combos', H.c('g', 'ok, optimal')]])} With unlimited coins of a <b>canonical</b> system (1, 2, 5, 10, 20) greedy is always optimal; the <i>limited counts</i> are what break it.</p>` },
      { title: 'Escrow: the money is not yours until the sale commits', html: `<p>Customer inserts ₹10 + ₹10, then cancels. If the machine had dropped the coins straight into the coin box, it might refund with a ₹20 note it happens to have — or worse, not have ₹20 in coins at all. Real machines hold inserted coins in an <b>escrow</b> tray: cancel opens the tray (exact coins back), commit tips it into the box. In code: a <code>List&lt;Coin&gt; escrow</code> separate from <code>CoinBox</code>.</p>` },
      { title: 'Add-a-state: CARD_AUTHORIZING for UPI/card payment', html: `<p>New requirement: pay by card. Add a <b>PaymentMethod</b> Strategy (Cash, Card, UPI) and one new state <b>AUTHORIZING</b>: HAS_SELECTION → AUTHORIZING (waiting for the bank) → DISPENSING on approval, → IDLE on decline/timeout. Cash flow is untouched. Because authorization is <i>slow and can fail</i>, it deserves its own state — while authorizing, coin inserts are rejected and cancel sends a "void" to the bank.</p>`, code: { lang: 'java', code: `interface PaymentMethod { boolean authorize(int amountRs); void voidAuth(); }
class UpiPayment implements PaymentMethod {
    public boolean authorize(int amountRs) { return amountRs <= 2000; }   // stub: UPI-lite limit
    public void voidAuth() { System.out.println("UPI authorization voided"); }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class PaymentMethod(ABC):
    @abstractmethod
    def authorize(self, amount_rs: int) -> bool: ...

    @abstractmethod
    def void_auth(self) -> None: ...


class UpiPayment(PaymentMethod):
    def authorize(self, amount_rs: int) -> bool:
        return amount_rs <= 2000  # stub: UPI-lite limit

    def void_auth(self) -> None:
        print("UPI authorization voided")` },
          { lang: 'ts', code: `interface PaymentMethod {
  authorize(amountRs: number): boolean;
  voidAuth(): void;
}

class UpiPayment implements PaymentMethod {
  authorize(amountRs: number): boolean { return amountRs <= 2000; } // stub: UPI-lite limit
  voidAuth(): void { console.log("UPI authorization voided"); }
}` },
          { lang: 'cpp', code: `struct PaymentMethod {
    virtual ~PaymentMethod() = default;
    virtual bool authorize(int amountRs) = 0;
    virtual void voidAuth() = 0;
};

class UpiPayment final : public PaymentMethod {
public:
    bool authorize(int amountRs) override { return amountRs <= 2000; }  // stub: UPI-lite limit
    void voidAuth() override { cout << "UPI authorization voided\\n"; }
};` },
  { lang: 'csharp', code: `
using System;
interface IPaymentMethod { bool Authorize(int amountRs); void VoidAuth(); }
class UpiPayment : IPaymentMethod {
    public bool Authorize(int amountRs) { return amountRs <= 2000; }   // stub: UPI-lite limit
    public void VoidAuth() { Console.WriteLine("UPI authorization voided"); }
}` }
        ] } },
      { title: 'Dispense failure: the snack gets stuck', html: `<p>The motor turns but the drop sensor sees nothing (the classic stuck packet). A good design has the DISPENSING state wait for a <b>drop-sensor</b> event: success → commit; timeout → retry the motor once, then <b>refund</b> (or offer another item) and mark the slot faulty. That is why DISPENSING is a real state and not just a method call — it is where hardware can fail.</p>` }
    ],
    deepDive: `<p><b>Commit ordering = money safety.</b> The safest order is: validate everything (slot, stock, balance, change plan) → <b>reserve</b> (mark the item and change coins as taken) → physically dispense → on drop-sensor success <b>commit</b> (stock −1, escrow → box, change out) → on failure <b>release</b> the reservation and refund. It is a tiny two-phase commit between software and hardware.</p>
<p><b>Change-making complexity.</b> Largest-first with backtracking is fine for 5 denominations and small counts. For "fewest coins with limited counts", use bounded-knapsack DP: <code>dp[a]</code> = fewest coins for amount a, processing each denomination with its count (binary splitting keeps it O(D · A · log C)). Amounts are small (≤ ₹2000) so this is microseconds.</p>
<p><b>"Exact change only" mode.</b> When the coin box runs low, real machines light an "EXACT CHANGE" lamp. That is a derived condition (<code>coinBox.canMakeAnyChangeUpTo(maxOverpay)</code>), better shown as a display flag than a full state, because it does not change which events are allowed — only which <i>sales</i> succeed. Knowing when <i>not</i> to make something a state is part of the skill.</p>
<p><b>Thread safety.</b> A physical machine has one customer, but a "smart" machine also receives remote events (operator app, telemetry, card terminal callbacks). Run all events through one thread (an event queue) or guard the context methods with one lock; never let a card callback and a coin insert transition the state at the same time.</p>
<p><b>Inventory at scale.</b> A fleet of 10,000 machines reports stock and coin levels to a backend (IoT telemetry) so trucks restock before SOLD_OUT. The machine's state machine stays local and works offline; the backend is an Observer of state changes.</p>
<p><b>Money as integers.</b> Store paise/rupees as <code>int</code>/<code>long</code>, never <code>double</code> — 0.1 + 0.2 ≠ 0.3 in floating point, and a machine that is off by a paisa per sale fails audits.</p>`,
    aiEra: `<p><b>What AI changes:</b> "vending machine" is one of the most generated LLD answers on the internet, so AI output looks polished. Typical gaps: no escrow (cancel refunds from the coin box), change computed <i>after</i> dispensing, greedy change with limited coins, <code>double</code> for money, and no DISPENSING failure path. Use those as your review checklist.</p>
<p><b>Use AI as a partner:</b> <code>Generate 20 adversarial event sequences for my vending machine (cancel mid-dispense, coins during maintenance, exact-change edge cases) and the expected final inventory and coin box for each.</code> Then run them as tests. Also: <code>Prove or disprove: greedy change is optimal for coins {1, 3, 4}.</code> (It is not: 6 = 3+3, greedy gives 4+1+1.)</p>
<p><b>Real-world 2026:</b> machines take UPI/QR and tap-to-pay; the payment callback arrives asynchronously from a network — the state machine gains an AUTHORIZING state and idempotent handling of duplicate callbacks. <b>What you must still own:</b> the state table, the money-safety ordering and the failure paths — the parts that cost real money when wrong.</p>`,
    problems: [{
      title: 'Exact Change from a Limited Coin Box', level: 'Medium', tags: ['vending machine', 'dp', 'change-making'], companies: ['Amazon', 'Walmart', 'Flipkart'],
      statement: `<p>A vending machine must return <code>amount</code> rupees of change using its coin box, where <code>denoms[i]</code> has <code>counts[i]</code> coins available. Return the change using the <b>fewest coins</b> as a map denomination → count, or report that it is impossible (so the machine can refuse the sale <i>before</i> dispensing). Explain why greedy is not enough.</p>`,
      constraints: `1 ≤ denominations ≤ 10, 0 ≤ amount ≤ 10<sup>4</sup>, counts ≤ 10<sup>3</sup>.`,
      example: `<p>denoms = [1, 2, 5, 10], counts = [0, 3, 1, 1], amount = 6. Greedy: 5 → remaining 1 → ${H.c('r', 'no ₹1 coin, fails')}. Correct: ${H.c('g', '{2: 3}')} (3 coins). amount = 17 → ${H.c('g', '{10:1, 5:1, 2:1}')}. amount = 3 → ${H.c('r', 'impossible')} (only even coins and a 5/10).</p>`,
      brute: { why: `<p>Try every combination of counts for every denomination: (c<sub>1</sub>+1) × (c<sub>2</sub>+1) × … combinations — with 4 denominations of 1000 coins each that is 10<sup>12</sup>. Plain greedy is fast but wrong with limited counts (example above).</p>`, code: { lang: 'java', code: `import java.util.*;
class GreedyChange {
    // WRONG with limited coins: 6 with {5:1, 2:3} returns null although 2+2+2 works
    static Map<Integer, Integer> change(int[] denoms, int[] counts, int amount) {
        Map<Integer, Integer> out = new TreeMap<>();
        for (int i = denoms.length - 1; i >= 0 && amount > 0; i--) {
            int take = Math.min(counts[i], amount / denoms[i]);
            if (take > 0) { out.put(denoms[i], take); amount -= take * denoms[i]; }
        }
        return amount == 0 ? out : null;
    }
}`, alt: [{ lang: 'python', code: "class GreedyChange:\n    # WRONG with limited coins: 6 with {5:1, 2:3} returns None although 2+2+2 works\n    @staticmethod\n    def change(denoms, counts, amount):\n        out = {}\n        for i in range(len(denoms) - 1, -1, -1):\n            if amount <= 0: break\n            take = min(counts[i], amount // denoms[i])\n            if take > 0:\n                out[denoms[i]] = take\n                amount -= take * denoms[i]\n        return dict(sorted(out.items())) if amount == 0 else None\n" }, { lang: 'ts', code: "class GreedyChange {\n  // WRONG with limited coins: 6 with {5:1, 2:3} returns null although 2+2+2 works\n  static change(denoms: number[], counts: number[], amount: number): Map<number, number> | null {\n    const out = new Map<number, number>();\n    for (let i = denoms.length - 1; i >= 0 && amount > 0; i--) {\n      const take = Math.min(counts[i], Math.floor(amount / denoms[i]));\n      if (take > 0) { out.set(denoms[i], take); amount -= take * denoms[i]; }\n    }\n    return amount === 0 ? out : null;\n  }\n}\n" }, { lang: 'cpp', code: "struct GreedyChange {\n    // WRONG with limited coins: 6 with {5:1, 2:3} returns nullopt although 2+2+2 works\n    static optional<map<int, int>> change(const vector<int>& denoms, const vector<int>& counts, int amount) {\n        map<int, int> out;\n        for (int i = (int)denoms.size() - 1; i >= 0 && amount > 0; i--) {\n            int take = min(counts[i], amount / denoms[i]);\n            if (take > 0) { out[denoms[i]] = take; amount -= take * denoms[i]; }\n        }\n        if (amount == 0) return out;\n        return nullopt;\n    }\n};\n" }, { lang: 'csharp', code: "using System;\nusing System.Collections.Generic;\nclass GreedyChange {\n    // WRONG with limited coins: 6 with {5:1, 2:3} returns null although 2+2+2 works\n    public static SortedDictionary<int, int> Change(int[] denoms, int[] counts, int amount) {\n        SortedDictionary<int, int> result = new SortedDictionary<int, int>();\n        for (int i = denoms.Length - 1; i >= 0 && amount > 0; i--) {\n            int take = Math.Min(counts[i], amount / denoms[i]);\n            if (take > 0) { result[denoms[i]] = take; amount -= take * denoms[i]; }\n        }\n        return amount == 0 ? result : null;\n    }\n}\n" }] } },
      mcq: { q: 'Coins {1, 3, 4}, unlimited counts, amount 6. What does greedy give vs optimal?', options: ['Greedy 4+1+1 (3 coins), optimal 3+3 (2 coins)', 'Both give 3+3', 'Greedy fails entirely', 'Both give 4+1+1'], answer: 0, explain: 'Greedy is only guaranteed optimal for canonical coin systems with unlimited coins; {1,3,4} is not canonical.' },
      hints: [`<p>Hint 1: This is a <b>bounded</b> knapsack: each denomination can be used at most counts[i] times; minimise the number of coins.</p>`, `<p>Hint 2: <code>dp[a]</code> = fewest coins to make a. Process denominations one by one; for each, use it k = 1..counts[i] times on top of the previous layer (iterate a from high to low or keep a copy of the previous layer).</p>`, `<p>Hint 3: To return the coins, store for each (denomination, amount) how many of that coin were used, then walk back. dp[0] = 0, others = ∞; answer impossible if dp[amount] = ∞.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "{2=3}\n{10=1, 5=1, 2=1}\nnull\n{}\nnull\n" }] },
      solution: {
        approach: `<p>Layered DP. <code>prev[a]</code> = fewest coins for amount a using the denominations processed so far. For denomination d with count c, <code>cur[a] = min over k in 0..min(c, a/d) of prev[a − k·d] + k</code>. Record the best k in <code>used[i][a]</code> to reconstruct the answer by walking back from <code>amount</code>. O(D · A · C) worst case — tiny for vending amounts; binary splitting of counts brings it to O(D · A · log C).</p>`,
        code: `import java.util.*;

class ExactChange {
    static final int INF = Integer.MAX_VALUE / 2;

    /** Fewest coins with limited counts; returns null if impossible. */
    static Map<Integer, Integer> change(int[] denoms, int[] counts, int amount) {
        int n = denoms.length;
        int[] prev = new int[amount + 1];
        Arrays.fill(prev, INF);
        prev[0] = 0;
        int[][] used = new int[n][amount + 1];          // how many of coin i used to reach amount a
        for (int i = 0; i < n; i++) {
            int[] cur = new int[amount + 1];
            for (int a = 0; a <= amount; a++) {
                cur[a] = prev[a];                       // k = 0
                int maxK = Math.min(counts[i], a / denoms[i]);
                for (int k = 1; k <= maxK; k++) {
                    int cand = prev[a - k * denoms[i]] + k;
                    if (cand < cur[a]) { cur[a] = cand; used[i][a] = k; }
                }
            }
            prev = cur;
        }
        if (prev[amount] >= INF) return null;
        Map<Integer, Integer> out = new TreeMap<>(Comparator.reverseOrder());
        int a = amount;
        for (int i = n - 1; i >= 0; i--) {              // walk back layer by layer
            int k = used[i][a];
            if (k > 0) { out.put(denoms[i], k); a -= k * denoms[i]; }
        }
        return out;
    }

    public static void main(String[] args) {
        int[] d = {1, 2, 5, 10}, c = {0, 3, 1, 1};
        System.out.println(change(d, c, 6));            // {2=3}
        System.out.println(change(d, c, 17));           // {10=1, 5=1, 2=1}
        System.out.println(change(d, c, 3));            // null -> refuse the sale before dispensing
        System.out.println(change(d, c, 0));            // {} -> nothing to give back
        System.out.println(change(d, c, 1));            // null -> no 1-coins left
    }
}`, alt: [
          { lang: 'python', code: `INF = 2**30


def change(denoms: list[int], counts: list[int], amount: int) -> dict[int, int] | None:
    """Fewest coins with limited counts; returns None if impossible."""
    n = len(denoms)
    prev = [INF] * (amount + 1)
    prev[0] = 0
    used = [[0] * (amount + 1) for _ in range(n)]  # how many of coin i used to reach amount a
    for i in range(n):
        cur = prev[:]  # k = 0
        for a in range(amount + 1):
            for k in range(1, min(counts[i], a // denoms[i]) + 1):
                cand = prev[a - k * denoms[i]] + k
                if cand < cur[a]:
                    cur[a] = cand
                    used[i][a] = k
        prev = cur
    if prev[amount] >= INF:
        return None
    out: dict[int, int] = {}
    a = amount
    for i in range(n - 1, -1, -1):  # walk back layer by layer
        k = used[i][a]
        if k > 0:
            out[denoms[i]] = k
            a -= k * denoms[i]
    return out  # largest coin first, because we walk from the last layer


def show(m: dict[int, int] | None) -> str:
    return "null" if m is None else "{" + ", ".join(f"{k}={v}" for k, v in m.items()) + "}"


if __name__ == "__main__":
    d, c = [1, 2, 5, 10], [0, 3, 1, 1]
    print(show(change(d, c, 6)))   # {2=3}
    print(show(change(d, c, 17)))  # {10=1, 5=1, 2=1}
    print(show(change(d, c, 3)))   # null -> refuse the sale before dispensing
    print(show(change(d, c, 0)))   # {} -> nothing to give back
    print(show(change(d, c, 1)))   # null -> no 1-coins left` },
          { lang: 'ts', code: `const INF = 2 ** 30;

/** Fewest coins with limited counts; returns null if impossible. Map keeps largest coin first. */
function change(denoms: number[], counts: number[], amount: number): Map<number, number> | null {
  const n = denoms.length;
  let prev: number[] = new Array(amount + 1).fill(INF);
  prev[0] = 0;
  const used: number[][] = Array.from({ length: n }, () => new Array<number>(amount + 1).fill(0)); // coin i used to reach a
  for (let i = 0; i < n; i++) {
    const cur = prev.slice(); // k = 0
    for (let a = 0; a <= amount; a++) {
      const maxK = Math.min(counts[i], Math.floor(a / denoms[i]));
      for (let k = 1; k <= maxK; k++) {
        const cand = prev[a - k * denoms[i]] + k;
        if (cand < cur[a]) { cur[a] = cand; used[i][a] = k; }
      }
    }
    prev = cur;
  }
  if (prev[amount] >= INF) return null;
  const out = new Map<number, number>();
  let a = amount;
  for (let i = n - 1; i >= 0; i--) { // walk back layer by layer
    const k = used[i][a];
    if (k > 0) { out.set(denoms[i], k); a -= k * denoms[i]; }
  }
  return out;
}

function show(m: Map<number, number> | null): string {
  return m === null ? "null" : "{" + [...m].map(([k, v]) => \`\${k}=\${v}\`).join(", ") + "}";
}

const d = [1, 2, 5, 10], c = [0, 3, 1, 1];
console.log(show(change(d, c, 6)));  // {2=3}
console.log(show(change(d, c, 17))); // {10=1, 5=1, 2=1}
console.log(show(change(d, c, 3)));  // null -> refuse the sale before dispensing
console.log(show(change(d, c, 0)));  // {} -> nothing to give back
console.log(show(change(d, c, 1)));  // null -> no 1-coins left` },
          { lang: 'cpp', code: `const int INF = INT_MAX / 2;

// Fewest coins with limited counts; nullopt if impossible. The map lists the largest coin first.
optional<map<int, int, greater<int>>> change(const vector<int>& denoms, const vector<int>& counts, int amount) {
    int n = denoms.size();
    vector<int> prev(amount + 1, INF);
    prev[0] = 0;
    vector<vector<int>> used(n, vector<int>(amount + 1, 0));  // how many of coin i used to reach amount a
    for (int i = 0; i < n; i++) {
        vector<int> cur = prev;  // k = 0
        for (int a = 0; a <= amount; a++) {
            int maxK = min(counts[i], a / denoms[i]);
            for (int k = 1; k <= maxK; k++) {
                int cand = prev[a - k * denoms[i]] + k;
                if (cand < cur[a]) { cur[a] = cand; used[i][a] = k; }
            }
        }
        prev = move(cur);
    }
    if (prev[amount] >= INF) return nullopt;
    map<int, int, greater<int>> out;
    int a = amount;
    for (int i = n - 1; i >= 0; i--) {  // walk back layer by layer
        int k = used[i][a];
        if (k > 0) { out[denoms[i]] = k; a -= k * denoms[i]; }
    }
    return out;
}

void show(const optional<map<int, int, greater<int>>>& m) {
    if (!m) { cout << "null\\n"; return; }
    cout << "{";
    bool first = true;
    for (const auto& [coin, k] : *m) { cout << (first ? "" : ", ") << coin << "=" << k; first = false; }
    cout << "}\\n";
}

int main() {
    vector<int> d = {1, 2, 5, 10}, c = {0, 3, 1, 1};
    show(change(d, c, 6));   // {2=3}
    show(change(d, c, 17));  // {10=1, 5=1, 2=1}
    show(change(d, c, 3));   // null -> refuse the sale before dispensing
    show(change(d, c, 0));   // {} -> nothing to give back
    show(change(d, c, 1));   // null -> no 1-coins left
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

class ExactChange {
    const int INF = int.MaxValue / 2;

    /// Fewest coins with limited counts; returns null if impossible.
    public static SortedDictionary<int, int> Change(int[] denoms, int[] counts, int amount) {
        int n = denoms.Length;
        int[] prev = new int[amount + 1];
        for (int a = 0; a <= amount; a++) prev[a] = INF;
        prev[0] = 0;
        int[][] used = new int[n][];                     // how many of coin i used to reach amount a
        for (int i = 0; i < n; i++) {
            used[i] = new int[amount + 1];
            int[] cur = new int[amount + 1];
            for (int a = 0; a <= amount; a++) {
                cur[a] = prev[a];                        // k = 0
                int maxK = Math.Min(counts[i], a / denoms[i]);
                for (int k = 1; k <= maxK; k++) {
                    int cand = prev[a - k * denoms[i]] + k;
                    if (cand < cur[a]) { cur[a] = cand; used[i][a] = k; }
                }
            }
            prev = cur;
        }
        if (prev[amount] >= INF) return null;
        SortedDictionary<int, int> result = new SortedDictionary<int, int>(Comparer<int>.Create((x, y) => y.CompareTo(x)));   // largest first
        int rest = amount;
        for (int i = n - 1; i >= 0; i--) {               // walk back layer by layer
            int k = used[i][rest];
            if (k > 0) { result[denoms[i]] = k; rest -= k * denoms[i]; }
        }
        return result;
    }

    static string Show(SortedDictionary<int, int> m) { return m == null ? "null" : "{" + string.Join(", ", m.Select(kv => kv.Key + "=" + kv.Value)) + "}"; }

    static void Main() {
        int[] d = { 1, 2, 5, 10 }, c = { 0, 3, 1, 1 };
        Console.WriteLine(Show(Change(d, c, 6)));       // {2=3}
        Console.WriteLine(Show(Change(d, c, 17)));      // {10=1, 5=1, 2=1}
        Console.WriteLine(Show(Change(d, c, 3)));       // null -> refuse the sale before dispensing
        Console.WriteLine(Show(Change(d, c, 0)));       // {} -> nothing to give back
        Console.WriteLine(Show(Change(d, c, 1)));       // null -> no 1-coins left
    }
}` }
        ],
        complexity: `<p>Time O(D · A · C) with D denominations, amount A, max count C (≤ 10 · 10<sup>4</sup> · 10<sup>3</sup> worst case, but in practice A/d bounds k); space O(D · A) for reconstruction. For vending amounts (A ≤ 2000) this runs in well under a millisecond.</p>`,
        followUps: ['Prefer giving away coins the machine has too many of (keep scarce ₹1 coins). How do you change the objective?', 'Light an "EXACT CHANGE ONLY" lamp: which amounts must be checked?', 'Make it work for notes + coins in a ticket kiosk with amounts up to ₹10,000.']
      }
    }]
  });

  /* ======================= TOPIC 5: ATM ======================= */
  var ATM_NODES = [B('IDLE', 'IDLE', 12, 32), B('CARD_INSERTED', 'CARD_INSERTED', 42, 9), B('AUTHENTICATED', 'AUTHENTICATED', 82, 9), B('IN_TRANSACTION', 'IN_TRANSACTION', 82, 52), B('CARD_RETAINED', 'CARD_RETAINED', 46, 52), B('OUT_OF_SERVICE', 'OUT_OF_SERVICE', 14, 60)];
  var ATM_EDGES = [['IDLE', 'CARD_INSERTED', 'insert card'], ['CARD_INSERTED', 'AUTHENTICATED', 'PIN ok'], ['CARD_INSERTED', 'CARD_RETAINED', '3rd wrong PIN'], ['CARD_RETAINED', 'IDLE', 'card kept'], ['AUTHENTICATED', 'IN_TRANSACTION', 'withdraw / deposit / balance'], ['IN_TRANSACTION', 'AUTHENTICATED', 'done'], ['AUTHENTICATED', 'IDLE', 'eject'], ['CARD_INSERTED', 'IDLE', 'cancel'], ['IDLE', 'OUT_OF_SERVICE', 'no cash'], ['OUT_OF_SERVICE', 'IDLE', 'refilled']];
  var ATM_NOTES = [2000, 500, 200, 100];
  // chain of note handlers with backtracking; returns {note: count} or null
  function atmPlan(amount, cas) {
    function go(i, rest) {
      if (rest === 0) return {};
      if (i === ATM_NOTES.length) return null;
      var n = ATM_NOTES[i];
      for (var use = Math.min(cas[n], Math.floor(rest / n)); use >= 0; use--) {
        var r = go(i + 1, rest - use * n);
        if (r) { if (use) r[n] = use; return r; }
      }
      return null;
    }
    return go(0, amount);
  }
  function planTxt(p) { return ATM_NOTES.filter(function (n) { return p[n]; }).map(function (n) { return '₹' + n + '×' + p[n]; }).join(' + '); }
  function casEntries(cas) { return ATM_NOTES.map(function (n) { return ['₹' + n, cas[n]]; }); }

  topics.push({
    title: 'ATM: Card and PIN States, Transaction Flows, Cash Dispensing and Rollback',
    analogy: `<p>An ATM is a <b>bank teller locked in a steel box</b> who follows a strict script. First he wants your card (who are you?). Then your PIN (prove it). Only then does he show the menu. When you ask for cash he checks his own drawer, phones the head office to approve and <b>hold</b> the money, counts out notes, and if the drawer jams he <b>phones back to cancel the hold</b> so you are never charged for cash you did not get. Get the PIN wrong three times and he keeps your card. Each step only makes sense after the previous one — a perfect state machine, plus a careful money conversation with the bank.</p>`,
    explain: `<p><b>Requirements to clarify:</b> card + PIN authentication (max 3 attempts, then retain card), withdraw (multiples of ₹100, daily limit, enough balance, ATM must have the right notes), balance enquiry, deposit, receipt, cancel at any time, out-of-service when cash is low. The ATM <b>never</b> stores balances or PINs — the bank does.</p>
${H.table(['Class', 'Responsibility'], [
  ['<code>Atm</code> (context)', 'events: <code>insertCard</code>, <code>enterPin</code>, <code>withdraw</code>, <code>deposit</code>, <code>balance</code>, <code>eject</code>; holds state, current card, PIN attempts'],
  ['<code>AtmState</code> + states', 'IDLE, CARD_INSERTED, AUTHENTICATED, IN_TRANSACTION, CARD_RETAINED (transient), OUT_OF_SERVICE'],
  ['<code>Transaction</code> (Command)', '<code>WithdrawTxn</code>, <code>DepositTxn</code>, <code>BalanceTxn</code> — each one object with <code>run(atm)</code>, logged with an id'],
  ['<code>BankService</code> (interface)', '<code>verifyPin</code>, <code>debit(acct, amt, txnId)</code>, <code>reverse(txnId)</code>, <code>credit</code> — idempotent by txnId'],
  ['<code>CashDispenser</code> + <code>NoteHandler</code> chain', '₹2000 → ₹500 → ₹200 → ₹100 (Chain of Responsibility); plan first, then dispense'],
  ['<code>CardReader</code>, <code>Keypad</code>, <code>Screen</code>, <code>Printer</code>', 'hardware adapters behind interfaces (easy to fake in tests)']
])}
<p><b>Withdrawal flow — the order matters:</b></p>
<ol>
<li><b>Validate locally</b>: amount &gt; 0 and a multiple of 100.</li>
<li><b>Plan notes</b>: can the dispenser make this amount with the notes it has? If not, stop now — nothing has been charged.</li>
<li><b>Debit at the bank with a unique txnId</b>: bank checks balance and daily limit, then debits (or places a hold).</li>
<li><b>Dispense</b> the planned notes.</li>
<li>Success → <b>confirm</b> + receipt. Jam / timeout → <b>reverse(txnId)</b> so the customer is not charged.</li>
</ol>
<p>${H.c('r', 'Wrong order = lost money:')} dispensing before the bank approves gives away free cash on a network failure; debiting before checking notes charges people for cash the machine cannot give. Because messages can be lost, every bank call carries a <b>txnId</b> and the bank treats repeats as no-ops (<b>idempotency</b>).</p>
<p><b>Brute force:</b> <code>if (!cardInserted) … else if (!pinOk) … else if (choice == 1) …</code> in one giant <code>handleKey()</code> — the classic student ATM. Adding "change PIN" or "mini-statement" means touching the whole ladder, and the "3 wrong PINs" counter ends up checked in places where no card is even inserted.</p>`,
    clues: [
      '"Design an ATM" → states (card/PIN/menu), transactions as Command objects, BankService interface, cash dispenser chain. Say all four early.',
      '"Dispense with fewest notes / limited notes in each cassette" → Chain of Responsibility over denominations (+ backtracking when counts are limited).',
      '"What if cash does not come out?" / "network fails mid-transaction" → reversal with an idempotent txnId; never dispense before approval.',
      '"Lock the card after 3 wrong PINs" → attempts counter that lives with the CARD_INSERTED session, reset on success.',
      '"Daily limit", "insufficient balance" → bank-side checks; the ATM must not trust its own cache of balances.',
      '"Add a new transaction type (mini statement, PIN change, bill pay)" → new Command class; states unchanged.'
    ],
    code: { lang: 'java', title: 'ATM: states + transactions as commands + idempotent bank + note chain (runnable)', code: `import java.util.*;

record Card(String number, String account) {}

/** Everything about money lives at the bank. Every call is idempotent by txnId. */
interface BankService {
    boolean verifyPin(Card card, String pin);
    long balance(String account);
    String debit(String account, long amount, String txnId);   // null = approved, else reason
    void reverse(String txnId);
    void credit(String account, long amount, String txnId);
}

class InMemoryBank implements BankService {
    static final long DAILY_LIMIT = 10_000;
    record Debit(String account, long amount) {}
    private final Map<String, Long> balances = new HashMap<>();
    private final Map<String, String> pins = new HashMap<>();
    private final Map<String, Long> withdrawnToday = new HashMap<>();
    private final Map<String, Debit> debits = new HashMap<>();
    private final Set<String> reversed = new HashSet<>(), credits = new HashSet<>();

    void open(String account, String pin, long balance) { balances.put(account, balance); pins.put(account, pin); }
    public boolean verifyPin(Card c, String pin) { return pin.equals(pins.get(c.account())); }
    public synchronized long balance(String a) { return balances.getOrDefault(a, 0L); }

    public synchronized String debit(String a, long amt, String txnId) {
        if (debits.containsKey(txnId)) return null;                   // retry of an approved debit: no double charge
        if (balance(a) < amt) return "INSUFFICIENT_FUNDS";
        if (withdrawnToday.getOrDefault(a, 0L) + amt > DAILY_LIMIT) return "DAILY_LIMIT_EXCEEDED";
        balances.merge(a, -amt, Long::sum);
        withdrawnToday.merge(a, amt, Long::sum);
        debits.put(txnId, new Debit(a, amt));
        return null;
    }
    public synchronized void reverse(String txnId) {
        Debit d = debits.get(txnId);
        if (d == null || !reversed.add(txnId)) return;               // unknown or already reversed: no-op
        balances.merge(d.account(), d.amount(), Long::sum);
        withdrawnToday.merge(d.account(), -d.amount(), Long::sum);
    }
    public synchronized void credit(String a, long amt, String txnId) {
        if (credits.add(txnId)) balances.merge(a, amt, Long::sum);
    }
}

/** Chain of Responsibility: each cassette serves what it can and passes the rest on. */
class NoteHandler {
    final int note;
    int count;
    private NoteHandler next;
    NoteHandler(int note, int count) { this.note = note; this.count = count; }
    NoteHandler then(NoteHandler n) { next = n; return n; }

    /** Plan only (no notes move). Backtracks: uses fewer big notes if the chain below gets stuck. */
    boolean plan(int amount, Map<Integer, Integer> out) {
        for (int use = Math.min(count, amount / note); use >= 0; use--) {
            int rest = amount - use * note;
            if (rest == 0 || (next != null && next.plan(rest, out))) {
                if (use > 0) out.put(note, use);
                return true;
            }
        }
        return false;
    }
    void commit(Map<Integer, Integer> plan) { count -= plan.getOrDefault(note, 0); if (next != null) next.commit(plan); }
    long total() { return (long) note * count + (next == null ? 0 : next.total()); }
}

class CashDispenser {
    private final NoteHandler head;
    boolean jamNext = false;                                        // test hook: simulate a hardware jam
    CashDispenser(int n2000, int n500, int n200, int n100) {
        head = new NoteHandler(2000, n2000);
        head.then(new NoteHandler(500, n500)).then(new NoteHandler(200, n200)).then(new NoteHandler(100, n100));
    }
    Map<Integer, Integer> plan(int amount) {
        Map<Integer, Integer> p = new TreeMap<>(Comparator.reverseOrder());
        return head.plan(amount, p) ? p : null;
    }
    boolean dispense(Map<Integer, Integer> plan) {
        if (jamNext) { jamNext = false; return false; }
        head.commit(plan);
        return true;
    }
    long total() { return head.total(); }
}

/** Command pattern: each transaction is an object with an id that can be logged and audited. */
interface Transaction { String run(Atm atm); }

class WithdrawTxn implements Transaction {
    private final long amount;
    WithdrawTxn(long amount) { this.amount = amount; }
    public String run(Atm atm) {
        if (amount <= 0 || amount % 100 != 0) return "Amount must be a positive multiple of 100";   // 1. validate
        Map<Integer, Integer> plan = atm.dispenser().plan((int) amount);                           // 2. plan notes
        if (plan == null) return "This ATM cannot dispense Rs " + amount;
        String txnId = atm.newTxnId();
        String err = atm.bank().debit(atm.card().account(), amount, txnId);                         // 3. debit
        if (err != null) return "Declined: " + err;
        if (!atm.dispenser().dispense(plan)) {                                                      // 4. dispense
            atm.bank().reverse(txnId);                                                              // 5b. rollback
            return "Could not dispense. Your account was NOT charged (" + txnId + " reversed)";
        }
        return "Take Rs " + amount + " as " + plan + " [" + txnId + "]";                           // 5a. success
    }
}
class BalanceTxn implements Transaction {
    public String run(Atm atm) { return "Balance Rs " + atm.bank().balance(atm.card().account()); }
}
class DepositTxn implements Transaction {
    private final long amount;
    DepositTxn(long amount) { this.amount = amount; }
    public String run(Atm atm) {
        if (amount <= 0 || amount % 100 != 0) return "Invalid deposit";
        String txnId = atm.newTxnId();
        atm.bank().credit(atm.card().account(), amount, txnId);
        return "Deposited Rs " + amount + " [" + txnId + "]";
    }
}

interface AtmState {
    String name();
    default void insertCard(Atm a, Card c)   { a.show(name() + ": card not accepted now"); }
    default void enterPin(Atm a, String pin) { a.show(name() + ": insert card first"); }
    default void choose(Atm a, Transaction t){ a.show(name() + ": enter PIN first"); }
    default void eject(Atm a)                { a.show(name() + ": no card to eject"); }
}

class AtmIdle implements AtmState {
    public String name() { return "IDLE"; }
    public void insertCard(Atm a, Card c) { a.startSession(c); a.setState(new CardInserted()); }
}
class CardInserted implements AtmState {
    static final int MAX_ATTEMPTS = 3;
    public String name() { return "CARD_INSERTED"; }
    public void enterPin(Atm a, String pin) {
        if (a.bank().verifyPin(a.card(), pin)) { a.setState(new Authenticated()); return; }
        int tries = a.failedPin();
        if (tries >= MAX_ATTEMPTS) { a.retainCard(); return; }       // CARD_RETAINED, then IDLE
        a.show("Wrong PIN, " + (MAX_ATTEMPTS - tries) + " attempt(s) left");
    }
    public void eject(Atm a) { a.endSession(); }
}
class Authenticated implements AtmState {
    public String name() { return "AUTHENTICATED"; }
    public void choose(Atm a, Transaction t) {
        a.setState(new InTransaction());                            // other inputs rejected meanwhile
        a.show(t.run(a));
        a.setState(new Authenticated());                            // "another transaction?"
    }
    public void eject(Atm a) { a.endSession(); }
}
class InTransaction implements AtmState { public String name() { return "IN_TRANSACTION"; } }
class OutOfService implements AtmState { public String name() { return "OUT_OF_SERVICE"; } }

class Atm {
    private AtmState state = new AtmIdle();
    private final BankService bank;
    private final CashDispenser dispenser;
    private Card card;
    private int failedPins;
    private int txnSeq = 0;

    Atm(BankService bank, CashDispenser dispenser) { this.bank = bank; this.dispenser = dispenser; }

    // public API
    void insertCard(Card c)   { state.insertCard(this, c); }
    void enterPin(String pin) { state.enterPin(this, pin); }
    void withdraw(long amt)   { state.choose(this, new WithdrawTxn(amt)); }
    void deposit(long amt)    { state.choose(this, new DepositTxn(amt)); }
    void balance()            { state.choose(this, new BalanceTxn()); }
    void eject()              { state.eject(this); }

    // used by states and transactions
    void setState(AtmState s) { show("  [" + state.name() + " -> " + s.name() + "]"); state = s; }
    void startSession(Card c) { card = c; failedPins = 0; }
    int failedPin()           { return ++failedPins; }
    void retainCard()         { show("Card " + card.number() + " retained. Contact your bank."); setState(new AtmIdle()); card = null; }
    void endSession() {
        show("Card returned");
        card = null;
        setState(dispenser.total() < 100 ? new OutOfService() : new AtmIdle());
    }
    String newTxnId()         { return "T" + (++txnSeq); }
    void show(String msg)     { System.out.println(msg); }
    BankService bank()        { return bank; }
    CashDispenser dispenser() { return dispenser; }
    Card card()               { return card; }

    public static void main(String[] args) {
        InMemoryBank bank = new InMemoryBank();
        bank.open("ACC1", "1234", 15_000);
        CashDispenser cash = new CashDispenser(2, 10, 10, 10);
        Atm atm = new Atm(bank, cash);
        atm.balance();                                  // rejected: no card
        atm.insertCard(new Card("4111-01", "ACC1"));
        atm.enterPin("1111");                           // wrong
        atm.enterPin("1234");
        atm.withdraw(2750);                             // not a multiple of 100
        atm.withdraw(2700);                             // 2000 + 500 + 200
        cash.jamNext = true;
        atm.withdraw(1000);                             // jam -> reversed, not charged
        atm.withdraw(9000);                             // daily limit (2700 + 9000 > 10000)
        atm.balance();                                  // 12300
        atm.eject();
        atm.insertCard(new Card("4111-02", "ACC1"));
        atm.enterPin("0000"); atm.enterPin("1111"); atm.enterPin("2222");   // card retained
    }
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Card:
    number: str
    account: str


class BankService(ABC):
    """Everything about money lives at the bank. Every call is idempotent by txn_id."""

    @abstractmethod
    def verify_pin(self, card: Card, pin: str) -> bool: ...

    @abstractmethod
    def balance(self, account: str) -> int: ...

    @abstractmethod
    def debit(self, account: str, amount: int, txn_id: str) -> Optional[str]: ...  # None = approved, else reason

    @abstractmethod
    def reverse(self, txn_id: str) -> None: ...

    @abstractmethod
    def credit(self, account: str, amount: int, txn_id: str) -> None: ...


class InMemoryBank(BankService):
    DAILY_LIMIT = 10_000

    def __init__(self) -> None:
        self._balances: dict[str, int] = {}
        self._pins: dict[str, str] = {}
        self._withdrawn_today: dict[str, int] = {}
        self._debits: dict[str, tuple[str, int]] = {}  # txn_id -> (account, amount)
        self._reversed: set[str] = set()
        self._credits: set[str] = set()
        self._lock = threading.RLock()

    def open(self, account: str, pin: str, balance: int) -> None:
        self._balances[account] = balance
        self._pins[account] = pin

    def verify_pin(self, card: Card, pin: str) -> bool:
        return pin == self._pins.get(card.account)

    def balance(self, account: str) -> int:
        with self._lock:
            return self._balances.get(account, 0)

    def debit(self, account: str, amount: int, txn_id: str) -> Optional[str]:
        with self._lock:
            if txn_id in self._debits:
                return None  # retry of an approved debit: no double charge
            if self.balance(account) < amount:
                return "INSUFFICIENT_FUNDS"
            if self._withdrawn_today.get(account, 0) + amount > self.DAILY_LIMIT:
                return "DAILY_LIMIT_EXCEEDED"
            self._balances[account] = self._balances.get(account, 0) - amount
            self._withdrawn_today[account] = self._withdrawn_today.get(account, 0) + amount
            self._debits[txn_id] = (account, amount)
            return None

    def reverse(self, txn_id: str) -> None:
        with self._lock:
            d = self._debits.get(txn_id)
            if d is None or txn_id in self._reversed:  # unknown or already reversed: no-op
                return
            self._reversed.add(txn_id)
            account, amount = d
            self._balances[account] = self._balances.get(account, 0) + amount
            self._withdrawn_today[account] = self._withdrawn_today.get(account, 0) - amount

    def credit(self, account: str, amount: int, txn_id: str) -> None:
        with self._lock:
            if txn_id not in self._credits:
                self._credits.add(txn_id)
                self._balances[account] = self._balances.get(account, 0) + amount


class NoteHandler:
    """Chain of Responsibility: each cassette serves what it can and passes the rest on."""

    def __init__(self, note: int, count: int) -> None:
        self.note = note
        self.count = count
        self._next: Optional[NoteHandler] = None

    def then(self, n: NoteHandler) -> NoteHandler:
        self._next = n
        return n

    def plan(self, amount: int, out: dict[int, int]) -> bool:
        """Plan only (no notes move). Backtracks: uses fewer big notes if the chain below gets stuck."""
        for use in range(min(self.count, amount // self.note), -1, -1):
            rest = amount - use * self.note
            if rest == 0 or (self._next is not None and self._next.plan(rest, out)):
                if use > 0:
                    out[self.note] = use
                return True
        return False

    def commit(self, plan: dict[int, int]) -> None:
        self.count -= plan.get(self.note, 0)
        if self._next is not None:
            self._next.commit(plan)

    def total(self) -> int:
        return self.note * self.count + (0 if self._next is None else self._next.total())


def show_plan(plan: dict[int, int]) -> str:
    return "{" + ", ".join(f"{k}={v}" for k, v in plan.items()) + "}"


class CashDispenser:
    def __init__(self, n2000: int, n500: int, n200: int, n100: int) -> None:
        self._head = NoteHandler(2000, n2000)
        self._head.then(NoteHandler(500, n500)).then(NoteHandler(200, n200)).then(NoteHandler(100, n100))
        self.jam_next = False  # test hook: simulate a hardware jam

    def plan(self, amount: int) -> Optional[dict[int, int]]:
        p: dict[int, int] = {}
        if not self._head.plan(amount, p):
            return None
        return dict(sorted(p.items(), reverse=True))  # largest note first

    def dispense(self, plan: dict[int, int]) -> bool:
        if self.jam_next:
            self.jam_next = False
            return False
        self._head.commit(plan)
        return True

    def total(self) -> int:
        return self._head.total()


class Transaction(ABC):
    """Command pattern: each transaction is an object with an id that can be logged and audited."""

    @abstractmethod
    def run(self, atm: "Atm") -> str: ...


class WithdrawTxn(Transaction):
    def __init__(self, amount: int) -> None:
        self._amount = amount

    def run(self, atm: "Atm") -> str:
        if self._amount <= 0 or self._amount % 100 != 0:  # 1. validate
            return "Amount must be a positive multiple of 100"
        plan = atm.dispenser.plan(self._amount)  # 2. plan notes
        if plan is None:
            return f"This ATM cannot dispense Rs {self._amount}"
        txn_id = atm.new_txn_id()
        err = atm.bank.debit(atm.card.account, self._amount, txn_id)  # 3. debit
        if err is not None:
            return f"Declined: {err}"
        if not atm.dispenser.dispense(plan):  # 4. dispense
            atm.bank.reverse(txn_id)  # 5b. rollback
            return f"Could not dispense. Your account was NOT charged ({txn_id} reversed)"
        return f"Take Rs {self._amount} as {show_plan(plan)} [{txn_id}]"  # 5a. success


class BalanceTxn(Transaction):
    def run(self, atm: "Atm") -> str:
        return f"Balance Rs {atm.bank.balance(atm.card.account)}"


class DepositTxn(Transaction):
    def __init__(self, amount: int) -> None:
        self._amount = amount

    def run(self, atm: "Atm") -> str:
        if self._amount <= 0 or self._amount % 100 != 0:
            return "Invalid deposit"
        txn_id = atm.new_txn_id()
        atm.bank.credit(atm.card.account, self._amount, txn_id)
        return f"Deposited Rs {self._amount} [{txn_id}]"


class AtmState(ABC):
    @abstractmethod
    def name(self) -> str: ...

    def insert_card(self, a: "Atm", c: Card) -> None: a.show(f"{self.name()}: card not accepted now")
    def enter_pin(self, a: "Atm", pin: str) -> None: a.show(f"{self.name()}: insert card first")
    def choose(self, a: "Atm", t: Transaction) -> None: a.show(f"{self.name()}: enter PIN first")
    def eject(self, a: "Atm") -> None: a.show(f"{self.name()}: no card to eject")


class AtmIdle(AtmState):
    def name(self) -> str: return "IDLE"

    def insert_card(self, a: "Atm", c: Card) -> None:
        a.start_session(c)
        a.set_state(CardInserted())


class CardInserted(AtmState):
    MAX_ATTEMPTS = 3

    def name(self) -> str: return "CARD_INSERTED"

    def enter_pin(self, a: "Atm", pin: str) -> None:
        if a.bank.verify_pin(a.card, pin):
            a.set_state(Authenticated())
            return
        tries = a.failed_pin()
        if tries >= self.MAX_ATTEMPTS:
            a.retain_card()  # CARD_RETAINED, then IDLE
            return
        a.show(f"Wrong PIN, {self.MAX_ATTEMPTS - tries} attempt(s) left")

    def eject(self, a: "Atm") -> None: a.end_session()


class Authenticated(AtmState):
    def name(self) -> str: return "AUTHENTICATED"

    def choose(self, a: "Atm", t: Transaction) -> None:
        a.set_state(InTransaction())  # other inputs rejected meanwhile
        a.show(t.run(a))
        a.set_state(Authenticated())  # "another transaction?"

    def eject(self, a: "Atm") -> None: a.end_session()


class InTransaction(AtmState):
    def name(self) -> str: return "IN_TRANSACTION"


class OutOfService(AtmState):
    def name(self) -> str: return "OUT_OF_SERVICE"


class Atm:
    def __init__(self, bank: BankService, dispenser: CashDispenser) -> None:
        self._state: AtmState = AtmIdle()
        self.bank = bank
        self.dispenser = dispenser
        self._card: Optional[Card] = None
        self._failed_pins = 0
        self._txn_seq = 0

    @property
    def card(self) -> Card:
        assert self._card is not None
        return self._card

    # public API
    def insert_card(self, c: Card) -> None: self._state.insert_card(self, c)
    def enter_pin(self, pin: str) -> None: self._state.enter_pin(self, pin)
    def withdraw(self, amt: int) -> None: self._state.choose(self, WithdrawTxn(amt))
    def deposit(self, amt: int) -> None: self._state.choose(self, DepositTxn(amt))
    def balance(self) -> None: self._state.choose(self, BalanceTxn())
    def eject(self) -> None: self._state.eject(self)

    # used by states and transactions
    def set_state(self, s: AtmState) -> None:
        self.show(f"  [{self._state.name()} -> {s.name()}]")
        self._state = s

    def start_session(self, c: Card) -> None:
        self._card = c
        self._failed_pins = 0

    def failed_pin(self) -> int:
        self._failed_pins += 1
        return self._failed_pins

    def retain_card(self) -> None:
        self.show(f"Card {self.card.number} retained. Contact your bank.")
        self.set_state(AtmIdle())
        self._card = None

    def end_session(self) -> None:
        self.show("Card returned")
        self._card = None
        self.set_state(OutOfService() if self.dispenser.total() < 100 else AtmIdle())

    def new_txn_id(self) -> str:
        self._txn_seq += 1
        return f"T{self._txn_seq}"

    def show(self, msg: str) -> None: print(msg)


if __name__ == "__main__":
    bank = InMemoryBank()
    bank.open("ACC1", "1234", 15_000)
    cash = CashDispenser(2, 10, 10, 10)
    atm = Atm(bank, cash)
    atm.balance()  # rejected: no card
    atm.insert_card(Card("4111-01", "ACC1"))
    atm.enter_pin("1111")  # wrong
    atm.enter_pin("1234")
    atm.withdraw(2750)  # not a multiple of 100
    atm.withdraw(2700)  # 2000 + 500 + 200
    cash.jam_next = True
    atm.withdraw(1000)  # jam -> reversed, not charged
    atm.withdraw(9000)  # daily limit (2700 + 9000 > 10000)
    atm.balance()  # 12300
    atm.eject()
    atm.insert_card(Card("4111-02", "ACC1"))
    atm.enter_pin("0000"); atm.enter_pin("1111"); atm.enter_pin("2222")  # card retained` },
          { lang: 'ts', code: `interface Card { readonly number: string; readonly account: string }

/** Everything about money lives at the bank. Every call is idempotent by txnId. */
interface BankService {
  verifyPin(card: Card, pin: string): boolean;
  balance(account: string): number;
  debit(account: string, amount: number, txnId: string): string | null; // null = approved, else reason
  reverse(txnId: string): void;
  credit(account: string, amount: number, txnId: string): void;
}

class InMemoryBank implements BankService {
  static readonly DAILY_LIMIT = 10_000;
  private readonly balances = new Map<string, number>();
  private readonly pins = new Map<string, string>();
  private readonly withdrawnToday = new Map<string, number>();
  private readonly debits = new Map<string, { account: string; amount: number }>();
  private readonly reversed = new Set<string>();
  private readonly credits = new Set<string>();

  open(account: string, pin: string, balance: number): void { this.balances.set(account, balance); this.pins.set(account, pin); }
  verifyPin(c: Card, pin: string): boolean { return pin === this.pins.get(c.account); }
  balance(a: string): number { return this.balances.get(a) ?? 0; }

  debit(a: string, amt: number, txnId: string): string | null {
    if (this.debits.has(txnId)) return null; // retry of an approved debit: no double charge
    if (this.balance(a) < amt) return "INSUFFICIENT_FUNDS";
    if ((this.withdrawnToday.get(a) ?? 0) + amt > InMemoryBank.DAILY_LIMIT) return "DAILY_LIMIT_EXCEEDED";
    this.balances.set(a, this.balance(a) - amt);
    this.withdrawnToday.set(a, (this.withdrawnToday.get(a) ?? 0) + amt);
    this.debits.set(txnId, { account: a, amount: amt });
    return null;
  }
  reverse(txnId: string): void {
    const d = this.debits.get(txnId);
    if (d === undefined || this.reversed.has(txnId)) return; // unknown or already reversed: no-op
    this.reversed.add(txnId);
    this.balances.set(d.account, this.balance(d.account) + d.amount);
    this.withdrawnToday.set(d.account, (this.withdrawnToday.get(d.account) ?? 0) - d.amount);
  }
  credit(a: string, amt: number, txnId: string): void {
    if (this.credits.has(txnId)) return;
    this.credits.add(txnId);
    this.balances.set(a, this.balance(a) + amt);
  }
}

/** Chain of Responsibility: each cassette serves what it can and passes the rest on. */
class NoteHandler {
  private next: NoteHandler | null = null;

  constructor(readonly note: number, public count: number) {}

  then(n: NoteHandler): NoteHandler { this.next = n; return n; }

  /** Plan only (no notes move). Backtracks: uses fewer big notes if the chain below gets stuck. */
  plan(amount: number, out: Map<number, number>): boolean {
    for (let use = Math.min(this.count, Math.floor(amount / this.note)); use >= 0; use--) {
      const rest = amount - use * this.note;
      if (rest === 0 || (this.next !== null && this.next.plan(rest, out))) {
        if (use > 0) out.set(this.note, use);
        return true;
      }
    }
    return false;
  }
  commit(plan: Map<number, number>): void {
    this.count -= plan.get(this.note) ?? 0;
    this.next?.commit(plan);
  }
  total(): number { return this.note * this.count + (this.next === null ? 0 : this.next.total()); }
}

const showPlan = (plan: Map<number, number>): string => "{" + [...plan].map(([k, v]) => \`\${k}=\${v}\`).join(", ") + "}";

class CashDispenser {
  private readonly head: NoteHandler;
  jamNext = false; // test hook: simulate a hardware jam

  constructor(n2000: number, n500: number, n200: number, n100: number) {
    this.head = new NoteHandler(2000, n2000);
    this.head.then(new NoteHandler(500, n500)).then(new NoteHandler(200, n200)).then(new NoteHandler(100, n100));
  }
  plan(amount: number): Map<number, number> | null {
    const p = new Map<number, number>();
    if (!this.head.plan(amount, p)) return null;
    return new Map([...p].sort((a, b) => b[0] - a[0])); // largest note first
  }
  dispense(plan: Map<number, number>): boolean {
    if (this.jamNext) { this.jamNext = false; return false; }
    this.head.commit(plan);
    return true;
  }
  total(): number { return this.head.total(); }
}

/** Command pattern: each transaction is an object with an id that can be logged and audited. */
interface Transaction { run(atm: Atm): string }

class WithdrawTxn implements Transaction {
  constructor(private readonly amount: number) {}
  run(atm: Atm): string {
    if (this.amount <= 0 || this.amount % 100 !== 0) return "Amount must be a positive multiple of 100"; // 1. validate
    const plan = atm.dispenser.plan(this.amount); // 2. plan notes
    if (plan === null) return \`This ATM cannot dispense Rs \${this.amount}\`;
    const txnId = atm.newTxnId();
    const err = atm.bank.debit(atm.card().account, this.amount, txnId); // 3. debit
    if (err !== null) return \`Declined: \${err}\`;
    if (!atm.dispenser.dispense(plan)) { // 4. dispense
      atm.bank.reverse(txnId); // 5b. rollback
      return \`Could not dispense. Your account was NOT charged (\${txnId} reversed)\`;
    }
    return \`Take Rs \${this.amount} as \${showPlan(plan)} [\${txnId}]\`; // 5a. success
  }
}
class BalanceTxn implements Transaction {
  run(atm: Atm): string { return \`Balance Rs \${atm.bank.balance(atm.card().account)}\`; }
}
class DepositTxn implements Transaction {
  constructor(private readonly amount: number) {}
  run(atm: Atm): string {
    if (this.amount <= 0 || this.amount % 100 !== 0) return "Invalid deposit";
    const txnId = atm.newTxnId();
    atm.bank.credit(atm.card().account, this.amount, txnId);
    return \`Deposited Rs \${this.amount} [\${txnId}]\`;
  }
}

interface AtmState {
  name(): string;
  insertCard(a: Atm, c: Card): void;
  enterPin(a: Atm, pin: string): void;
  choose(a: Atm, t: Transaction): void;
  eject(a: Atm): void;
}

// Interfaces carry no code in TypeScript, so the "refuse everything" defaults live in a base class.
abstract class BaseAtmState implements AtmState {
  abstract name(): string;
  insertCard(a: Atm, c: Card): void { a.show(\`\${this.name()}: card not accepted now\`); }
  enterPin(a: Atm, pin: string): void { a.show(\`\${this.name()}: insert card first\`); }
  choose(a: Atm, t: Transaction): void { a.show(\`\${this.name()}: enter PIN first\`); }
  eject(a: Atm): void { a.show(\`\${this.name()}: no card to eject\`); }
}

class AtmIdle extends BaseAtmState {
  name(): string { return "IDLE"; }
  override insertCard(a: Atm, c: Card): void { a.startSession(c); a.setState(new CardInserted()); }
}
class CardInserted extends BaseAtmState {
  static readonly MAX_ATTEMPTS = 3;
  name(): string { return "CARD_INSERTED"; }
  override enterPin(a: Atm, pin: string): void {
    if (a.bank.verifyPin(a.card(), pin)) { a.setState(new Authenticated()); return; }
    const tries = a.failedPin();
    if (tries >= CardInserted.MAX_ATTEMPTS) { a.retainCard(); return; } // CARD_RETAINED, then IDLE
    a.show(\`Wrong PIN, \${CardInserted.MAX_ATTEMPTS - tries} attempt(s) left\`);
  }
  override eject(a: Atm): void { a.endSession(); }
}
class Authenticated extends BaseAtmState {
  name(): string { return "AUTHENTICATED"; }
  override choose(a: Atm, t: Transaction): void {
    a.setState(new InTransaction()); // other inputs rejected meanwhile
    a.show(t.run(a));
    a.setState(new Authenticated()); // "another transaction?"
  }
  override eject(a: Atm): void { a.endSession(); }
}
class InTransaction extends BaseAtmState { name(): string { return "IN_TRANSACTION"; } }
class OutOfService extends BaseAtmState { name(): string { return "OUT_OF_SERVICE"; } }

class Atm {
  private state: AtmState = new AtmIdle();
  private current: Card | null = null;
  private failedPins = 0;
  private txnSeq = 0;

  constructor(readonly bank: BankService, readonly dispenser: CashDispenser) {}

  // public API
  insertCard(c: Card): void { this.state.insertCard(this, c); }
  enterPin(pin: string): void { this.state.enterPin(this, pin); }
  withdraw(amt: number): void { this.state.choose(this, new WithdrawTxn(amt)); }
  deposit(amt: number): void { this.state.choose(this, new DepositTxn(amt)); }
  balance(): void { this.state.choose(this, new BalanceTxn()); }
  eject(): void { this.state.eject(this); }

  // used by states and transactions
  setState(s: AtmState): void { this.show(\`  [\${this.state.name()} -> \${s.name()}]\`); this.state = s; }
  startSession(c: Card): void { this.current = c; this.failedPins = 0; }
  failedPin(): number { return ++this.failedPins; }
  retainCard(): void {
    this.show(\`Card \${this.card().number} retained. Contact your bank.\`);
    this.setState(new AtmIdle());
    this.current = null;
  }
  endSession(): void {
    this.show("Card returned");
    this.current = null;
    this.setState(this.dispenser.total() < 100 ? new OutOfService() : new AtmIdle());
  }
  newTxnId(): string { return "T" + ++this.txnSeq; }
  show(msg: string): void { console.log(msg); }
  card(): Card {
    if (this.current === null) throw new Error("no card inserted");
    return this.current;
  }
}

const bank = new InMemoryBank();
bank.open("ACC1", "1234", 15_000);
const cash = new CashDispenser(2, 10, 10, 10);
const atm = new Atm(bank, cash);
atm.balance(); // rejected: no card
atm.insertCard({ number: "4111-01", account: "ACC1" });
atm.enterPin("1111"); // wrong
atm.enterPin("1234");
atm.withdraw(2750); // not a multiple of 100
atm.withdraw(2700); // 2000 + 500 + 200
cash.jamNext = true;
atm.withdraw(1000); // jam -> reversed, not charged
atm.withdraw(9000); // daily limit (2700 + 9000 > 10000)
atm.balance(); // 12300
atm.eject();
atm.insertCard({ number: "4111-02", account: "ACC1" });
atm.enterPin("0000"); atm.enterPin("1111"); atm.enterPin("2222"); // card retained` },
          { lang: 'cpp', code: `struct Card {
    string number, account;
};

// Everything about money lives at the bank. Every call is idempotent by txnId.
struct BankService {
    virtual ~BankService() = default;
    virtual bool verifyPin(const Card& card, const string& pin) = 0;
    virtual long long balance(const string& account) = 0;
    virtual optional<string> debit(const string& account, long long amount, const string& txnId) = 0;  // nullopt = approved, else reason
    virtual void reverse(const string& txnId) = 0;
    virtual void credit(const string& account, long long amount, const string& txnId) = 0;
};

class InMemoryBank final : public BankService {
    static constexpr long long DAILY_LIMIT = 10'000;
    struct Debit { string account; long long amount; };
    map<string, long long> balances_, withdrawnToday_;
    map<string, string> pins_;
    map<string, Debit> debits_;
    set<string> reversed_, credits_;
    recursive_mutex mu_;

public:
    void open(const string& account, const string& pin, long long balance) { balances_[account] = balance; pins_[account] = pin; }
    bool verifyPin(const Card& c, const string& pin) override {
        auto it = pins_.find(c.account);
        return it != pins_.end() && it->second == pin;
    }
    long long balance(const string& a) override {
        lock_guard g(mu_);
        auto it = balances_.find(a);
        return it == balances_.end() ? 0 : it->second;
    }
    optional<string> debit(const string& a, long long amt, const string& txnId) override {
        lock_guard g(mu_);
        if (debits_.count(txnId)) return nullopt;  // retry of an approved debit: no double charge
        if (balance(a) < amt) return "INSUFFICIENT_FUNDS";
        if (withdrawnToday_[a] + amt > DAILY_LIMIT) return "DAILY_LIMIT_EXCEEDED";
        balances_[a] -= amt;
        withdrawnToday_[a] += amt;
        debits_[txnId] = {a, amt};
        return nullopt;
    }
    void reverse(const string& txnId) override {
        lock_guard g(mu_);
        auto it = debits_.find(txnId);
        if (it == debits_.end() || !reversed_.insert(txnId).second) return;  // unknown or already reversed: no-op
        balances_[it->second.account] += it->second.amount;
        withdrawnToday_[it->second.account] -= it->second.amount;
    }
    void credit(const string& a, long long amt, const string& txnId) override {
        lock_guard g(mu_);
        if (credits_.insert(txnId).second) balances_[a] += amt;
    }
};

using Plan = map<int, int, greater<int>>;  // note -> count, largest note first

// Chain of Responsibility: each cassette serves what it can and passes the rest on.
class NoteHandler {
    int note_, count_;
    unique_ptr<NoteHandler> next_;  // the chain owns its links

public:
    NoteHandler(int note, int count) : note_(note), count_(count) {}
    NoteHandler* then(unique_ptr<NoteHandler> n) { next_ = move(n); return next_.get(); }

    // Plan only (no notes move). Backtracks: uses fewer big notes if the chain below gets stuck.
    bool plan(int amount, Plan& out) const {
        for (int use = min(count_, amount / note_); use >= 0; use--) {
            int rest = amount - use * note_;
            if (rest == 0 || (next_ && next_->plan(rest, out))) {
                if (use > 0) out[note_] = use;
                return true;
            }
        }
        return false;
    }
    void commit(const Plan& plan) {
        auto it = plan.find(note_);
        if (it != plan.end()) count_ -= it->second;
        if (next_) next_->commit(plan);
    }
    long long total() const { return 1LL * note_ * count_ + (next_ ? next_->total() : 0); }
};

string showPlan(const Plan& plan) {
    string s = "{";
    for (const auto& [note, n] : plan) s += (s.size() > 1 ? ", " : "") + to_string(note) + "=" + to_string(n);
    return s + "}";
}

class CashDispenser {
    NoteHandler head_;

public:
    bool jamNext = false;  // test hook: simulate a hardware jam

    CashDispenser(int n2000, int n500, int n200, int n100) : head_(2000, n2000) {
        head_.then(make_unique<NoteHandler>(500, n500))->then(make_unique<NoteHandler>(200, n200))
             ->then(make_unique<NoteHandler>(100, n100));
    }
    optional<Plan> plan(int amount) const {
        Plan p;
        if (!head_.plan(amount, p)) return nullopt;
        return p;
    }
    bool dispense(const Plan& plan) {
        if (jamNext) { jamNext = false; return false; }
        head_.commit(plan);
        return true;
    }
    long long total() const { return head_.total(); }
};

class Atm;

// Command pattern: each transaction is an object with an id that can be logged and audited.
struct Transaction {
    virtual ~Transaction() = default;
    virtual string run(Atm& atm) const = 0;
};

// Stateless singletons: the ATM holds a pointer to the current one.
struct AtmState {
    virtual ~AtmState() = default;
    virtual string name() const = 0;
    virtual void insertCard(Atm& a, const Card& c) const;
    virtual void enterPin(Atm& a, const string& pin) const;
    virtual void choose(Atm& a, const Transaction& t) const;
    virtual void eject(Atm& a) const;
};
struct AtmIdle final : AtmState {
    static const AtmIdle I;
    string name() const override { return "IDLE"; }
    void insertCard(Atm& a, const Card& c) const override;
};
struct CardInserted final : AtmState {
    static const CardInserted I;
    static constexpr int MAX_ATTEMPTS = 3;
    string name() const override { return "CARD_INSERTED"; }
    void enterPin(Atm& a, const string& pin) const override;
    void eject(Atm& a) const override;
};
struct Authenticated final : AtmState {
    static const Authenticated I;
    string name() const override { return "AUTHENTICATED"; }
    void choose(Atm& a, const Transaction& t) const override;
    void eject(Atm& a) const override;
};
struct InTransaction final : AtmState {
    static const InTransaction I;
    string name() const override { return "IN_TRANSACTION"; }
};
struct OutOfService final : AtmState {
    static const OutOfService I;
    string name() const override { return "OUT_OF_SERVICE"; }
};
inline const AtmIdle AtmIdle::I;
inline const CardInserted CardInserted::I;
inline const Authenticated Authenticated::I;
inline const InTransaction InTransaction::I;
inline const OutOfService OutOfService::I;

class Atm {
    const AtmState* state_ = &AtmIdle::I;
    BankService& bank_;
    CashDispenser& dispenser_;
    optional<Card> card_;
    int failedPins_ = 0, txnSeq_ = 0;

public:
    Atm(BankService& bank, CashDispenser& dispenser) : bank_(bank), dispenser_(dispenser) {}

    // public API
    void insertCard(const Card& c);
    void enterPin(const string& pin) { state_->enterPin(*this, pin); }
    void withdraw(long long amt);
    void deposit(long long amt);
    void balance();
    void eject() { state_->eject(*this); }

    // used by states and transactions
    void setState(const AtmState& s) { show("  [" + state_->name() + " -> " + s.name() + "]"); state_ = &s; }
    void startSession(const Card& c) { card_ = c; failedPins_ = 0; }
    int failedPin() { return ++failedPins_; }
    void retainCard() {
        show("Card " + card_->number + " retained. Contact your bank.");
        setState(AtmIdle::I);
        card_.reset();
    }
    void endSession() {
        show("Card returned");
        card_.reset();
        if (dispenser_.total() < 100) setState(OutOfService::I); else setState(AtmIdle::I);
    }
    string newTxnId() { return "T" + to_string(++txnSeq_); }
    void show(const string& msg) const { cout << msg << "\\n"; }
    BankService& bank() { return bank_; }
    CashDispenser& dispenser() { return dispenser_; }
    const Card& card() const { return *card_; }
    void choose(const Transaction& t) { state_->choose(*this, t); }
};

class WithdrawTxn final : public Transaction {
    long long amount_;

public:
    explicit WithdrawTxn(long long amount) : amount_(amount) {}
    string run(Atm& atm) const override {
        if (amount_ <= 0 || amount_ % 100 != 0) return "Amount must be a positive multiple of 100";  // 1. validate
        auto plan = atm.dispenser().plan(static_cast<int>(amount_));                                 // 2. plan notes
        if (!plan) return "This ATM cannot dispense Rs " + to_string(amount_);
        string txnId = atm.newTxnId();
        auto err = atm.bank().debit(atm.card().account, amount_, txnId);                            // 3. debit
        if (err) return "Declined: " + *err;
        if (!atm.dispenser().dispense(*plan)) {                                                     // 4. dispense
            atm.bank().reverse(txnId);                                                              // 5b. rollback
            return "Could not dispense. Your account was NOT charged (" + txnId + " reversed)";
        }
        return "Take Rs " + to_string(amount_) + " as " + showPlan(*plan) + " [" + txnId + "]";    // 5a. success
    }
};
class BalanceTxn final : public Transaction {
public:
    string run(Atm& atm) const override { return "Balance Rs " + to_string(atm.bank().balance(atm.card().account)); }
};
class DepositTxn final : public Transaction {
    long long amount_;

public:
    explicit DepositTxn(long long amount) : amount_(amount) {}
    string run(Atm& atm) const override {
        if (amount_ <= 0 || amount_ % 100 != 0) return "Invalid deposit";
        string txnId = atm.newTxnId();
        atm.bank().credit(atm.card().account, amount_, txnId);
        return "Deposited Rs " + to_string(amount_) + " [" + txnId + "]";
    }
};

void Atm::insertCard(const Card& c) { state_->insertCard(*this, c); }
void Atm::withdraw(long long amt) { choose(WithdrawTxn(amt)); }
void Atm::deposit(long long amt) { choose(DepositTxn(amt)); }
void Atm::balance() { choose(BalanceTxn()); }

void AtmState::insertCard(Atm& a, const Card&) const { a.show(name() + ": card not accepted now"); }
void AtmState::enterPin(Atm& a, const string&) const { a.show(name() + ": insert card first"); }
void AtmState::choose(Atm& a, const Transaction&) const { a.show(name() + ": enter PIN first"); }
void AtmState::eject(Atm& a) const { a.show(name() + ": no card to eject"); }

void AtmIdle::insertCard(Atm& a, const Card& c) const { a.startSession(c); a.setState(CardInserted::I); }
void CardInserted::enterPin(Atm& a, const string& pin) const {
    if (a.bank().verifyPin(a.card(), pin)) { a.setState(Authenticated::I); return; }
    int tries = a.failedPin();
    if (tries >= MAX_ATTEMPTS) { a.retainCard(); return; }  // CARD_RETAINED, then IDLE
    a.show("Wrong PIN, " + to_string(MAX_ATTEMPTS - tries) + " attempt(s) left");
}
void CardInserted::eject(Atm& a) const { a.endSession(); }
void Authenticated::choose(Atm& a, const Transaction& t) const {
    a.setState(InTransaction::I);  // other inputs rejected meanwhile
    a.show(t.run(a));
    a.setState(Authenticated::I);  // "another transaction?"
}
void Authenticated::eject(Atm& a) const { a.endSession(); }

int main() {
    InMemoryBank bank;
    bank.open("ACC1", "1234", 15'000);
    CashDispenser cash(2, 10, 10, 10);
    Atm atm(bank, cash);
    atm.balance();  // rejected: no card
    atm.insertCard({"4111-01", "ACC1"});
    atm.enterPin("1111");  // wrong
    atm.enterPin("1234");
    atm.withdraw(2750);  // not a multiple of 100
    atm.withdraw(2700);  // 2000 + 500 + 200
    cash.jamNext = true;
    atm.withdraw(1000);  // jam -> reversed, not charged
    atm.withdraw(9000);  // daily limit (2700 + 9000 > 10000)
    atm.balance();       // 12300
    atm.eject();
    atm.insertCard({"4111-02", "ACC1"});
    atm.enterPin("0000"); atm.enterPin("1111"); atm.enterPin("2222");  // card retained
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

sealed class Card {
    public readonly string Number, Account;
    public Card(string number, string account) { Number = number; Account = account; }
}

/// Everything about money lives at the bank. Every call is idempotent by txnId.
interface IBankService {
    bool VerifyPin(Card card, string pin);
    long Balance(string account);
    string Debit(string account, long amount, string txnId);   // null = approved, else reason
    void Reverse(string txnId);
    void Credit(string account, long amount, string txnId);
}

class InMemoryBank : IBankService {
    public const long DAILY_LIMIT = 10000;
    sealed class DebitRec { public readonly string Account; public readonly long Amount; public DebitRec(string a, long amt) { Account = a; Amount = amt; } }
    private readonly Dictionary<string, long> balances = new Dictionary<string, long>();
    private readonly Dictionary<string, string> pins = new Dictionary<string, string>();
    private readonly Dictionary<string, long> withdrawnToday = new Dictionary<string, long>();
    private readonly Dictionary<string, DebitRec> debits = new Dictionary<string, DebitRec>();
    private readonly HashSet<string> reversed = new HashSet<string>(), credits = new HashSet<string>();
    private readonly object gate = new object();

    public void Open(string account, string pin, long balance) { balances[account] = balance; pins[account] = pin; }
    public bool VerifyPin(Card c, string pin) { string real; return pins.TryGetValue(c.Account, out real) && real == pin; }
    public long Balance(string a) { lock (gate) { long b; return balances.TryGetValue(a, out b) ? b : 0; } }
    private static void Merge(Dictionary<string, long> m, string k, long delta) { long v; m.TryGetValue(k, out v); m[k] = v + delta; }

    public string Debit(string a, long amt, string txnId) {
        lock (gate) {
            if (debits.ContainsKey(txnId)) return null;                   // retry of an approved debit: no double charge
            if (Balance(a) < amt) return "INSUFFICIENT_FUNDS";
            long today; withdrawnToday.TryGetValue(a, out today);
            if (today + amt > DAILY_LIMIT) return "DAILY_LIMIT_EXCEEDED";
            Merge(balances, a, -amt);
            Merge(withdrawnToday, a, amt);
            debits[txnId] = new DebitRec(a, amt);
            return null;
        }
    }
    public void Reverse(string txnId) {
        lock (gate) {
            DebitRec d;
            if (!debits.TryGetValue(txnId, out d) || !reversed.Add(txnId)) return;   // unknown or already reversed: no-op
            Merge(balances, d.Account, d.Amount);
            Merge(withdrawnToday, d.Account, -d.Amount);
        }
    }
    public void Credit(string a, long amt, string txnId) {
        lock (gate) { if (credits.Add(txnId)) Merge(balances, a, amt); }
    }
}

/// Chain of Responsibility: each cassette serves what it can and passes the rest on.
class NoteHandler {
    public readonly int Note;
    public int Count;
    private NoteHandler next;
    public NoteHandler(int note, int count) { Note = note; Count = count; }
    public NoteHandler Then(NoteHandler n) { next = n; return n; }

    /// Plan only (no notes move). Backtracks: uses fewer big notes if the chain below gets stuck.
    public bool Plan(int amount, IDictionary<int, int> result) {
        for (int use = Math.Min(Count, amount / Note); use >= 0; use--) {
            int rest = amount - use * Note;
            if (rest == 0 || (next != null && next.Plan(rest, result))) {
                if (use > 0) result[Note] = use;
                return true;
            }
        }
        return false;
    }
    public void Commit(IDictionary<int, int> plan) { int n; if (plan.TryGetValue(Note, out n)) Count -= n; if (next != null) next.Commit(plan); }
    public long Total() { return (long)Note * Count + (next == null ? 0 : next.Total()); }
}

class CashDispenser {
    private readonly NoteHandler head;
    public bool JamNext = false;                                    // test hook: simulate a hardware jam
    public CashDispenser(int n2000, int n500, int n200, int n100) {
        head = new NoteHandler(2000, n2000);
        head.Then(new NoteHandler(500, n500)).Then(new NoteHandler(200, n200)).Then(new NoteHandler(100, n100));
    }
    public SortedDictionary<int, int> Plan(int amount) {
        SortedDictionary<int, int> p = new SortedDictionary<int, int>(Comparer<int>.Create((x, y) => y.CompareTo(x)));
        return head.Plan(amount, p) ? p : null;
    }
    public bool Dispense(IDictionary<int, int> plan) {
        if (JamNext) { JamNext = false; return false; }
        head.Commit(plan);
        return true;
    }
    public long Total() { return head.Total(); }
    public static string Show(SortedDictionary<int, int> p) { return "{" + string.Join(", ", p.Select(kv => kv.Key + "=" + kv.Value)) + "}"; }
}

/// Command pattern: each transaction is an object with an id that can be logged and audited.
interface ITransaction { string Run(Atm atm); }

class WithdrawTxn : ITransaction {
    private readonly long amount;
    public WithdrawTxn(long amount) { this.amount = amount; }
    public string Run(Atm atm) {
        if (amount <= 0 || amount % 100 != 0) return "Amount must be a positive multiple of 100";   // 1. validate
        SortedDictionary<int, int> plan = atm.Dispenser().Plan((int)amount);                        // 2. plan notes
        if (plan == null) return "This ATM cannot dispense Rs " + amount;
        string txnId = atm.NewTxnId();
        string err = atm.Bank().Debit(atm.Card().Account, amount, txnId);                          // 3. debit
        if (err != null) return "Declined: " + err;
        if (!atm.Dispenser().Dispense(plan)) {                                                      // 4. dispense
            atm.Bank().Reverse(txnId);                                                              // 5b. rollback
            return "Could not dispense. Your account was NOT charged (" + txnId + " reversed)";
        }
        return "Take Rs " + amount + " as " + CashDispenser.Show(plan) + " [" + txnId + "]";       // 5a. success
    }
}
class BalanceTxn : ITransaction {
    public string Run(Atm atm) { return "Balance Rs " + atm.Bank().Balance(atm.Card().Account); }
}
class DepositTxn : ITransaction {
    private readonly long amount;
    public DepositTxn(long amount) { this.amount = amount; }
    public string Run(Atm atm) {
        if (amount <= 0 || amount % 100 != 0) return "Invalid deposit";
        string txnId = atm.NewTxnId();
        atm.Bank().Credit(atm.Card().Account, amount, txnId);
        return "Deposited Rs " + amount + " [" + txnId + "]";
    }
}

abstract class AtmState {
    public abstract string Name();
    public virtual void InsertCard(Atm a, Card c)       { a.Show(Name() + ": card not accepted now"); }
    public virtual void EnterPin(Atm a, string pin)     { a.Show(Name() + ": insert card first"); }
    public virtual void Choose(Atm a, ITransaction t)   { a.Show(Name() + ": enter PIN first"); }
    public virtual void Eject(Atm a)                    { a.Show(Name() + ": no card to eject"); }
}

class AtmIdle : AtmState {
    public override string Name() { return "IDLE"; }
    public override void InsertCard(Atm a, Card c) { a.StartSession(c); a.SetState(new CardInserted()); }
}
class CardInserted : AtmState {
    public const int MAX_ATTEMPTS = 3;
    public override string Name() { return "CARD_INSERTED"; }
    public override void EnterPin(Atm a, string pin) {
        if (a.Bank().VerifyPin(a.Card(), pin)) { a.SetState(new Authenticated()); return; }
        int tries = a.FailedPin();
        if (tries >= MAX_ATTEMPTS) { a.RetainCard(); return; }       // CARD_RETAINED, then IDLE
        a.Show("Wrong PIN, " + (MAX_ATTEMPTS - tries) + " attempt(s) left");
    }
    public override void Eject(Atm a) { a.EndSession(); }
}
class Authenticated : AtmState {
    public override string Name() { return "AUTHENTICATED"; }
    public override void Choose(Atm a, ITransaction t) {
        a.SetState(new InTransaction());                            // other inputs rejected meanwhile
        a.Show(t.Run(a));
        a.SetState(new Authenticated());                            // "another transaction?"
    }
    public override void Eject(Atm a) { a.EndSession(); }
}
class InTransaction : AtmState { public override string Name() { return "IN_TRANSACTION"; } }
class OutOfService : AtmState { public override string Name() { return "OUT_OF_SERVICE"; } }

class Atm {
    private AtmState state = new AtmIdle();
    private readonly IBankService bank;
    private readonly CashDispenser dispenser;
    private Card card;
    private int failedPins;
    private int txnSeq = 0;

    public Atm(IBankService bank, CashDispenser dispenser) { this.bank = bank; this.dispenser = dispenser; }

    // public API
    public void InsertCard(Card c)   { state.InsertCard(this, c); }
    public void EnterPin(string pin) { state.EnterPin(this, pin); }
    public void Withdraw(long amt)   { state.Choose(this, new WithdrawTxn(amt)); }
    public void Deposit(long amt)    { state.Choose(this, new DepositTxn(amt)); }
    public void Balance()            { state.Choose(this, new BalanceTxn()); }
    public void Eject()              { state.Eject(this); }

    // used by states and transactions
    public void SetState(AtmState s) { Show("  [" + state.Name() + " -> " + s.Name() + "]"); state = s; }
    public void StartSession(Card c) { card = c; failedPins = 0; }
    public int FailedPin()           { return ++failedPins; }
    public void RetainCard()         { Show("Card " + card.Number + " retained. Contact your bank."); SetState(new AtmIdle()); card = null; }
    public void EndSession() {
        Show("Card returned");
        card = null;
        SetState(dispenser.Total() < 100 ? (AtmState)new OutOfService() : new AtmIdle());
    }
    public string NewTxnId()         { return "T" + (++txnSeq); }
    public void Show(string msg)     { Console.WriteLine(msg); }
    public IBankService Bank()       { return bank; }
    public CashDispenser Dispenser() { return dispenser; }
    public Card Card()               { return card; }

    static void Main() {
        InMemoryBank bank = new InMemoryBank();
        bank.Open("ACC1", "1234", 15000);
        CashDispenser cash = new CashDispenser(2, 10, 10, 10);
        Atm atm = new Atm(bank, cash);
        atm.Balance();                                  // rejected: no card
        atm.InsertCard(new Card("4111-01", "ACC1"));
        atm.EnterPin("1111");                           // wrong
        atm.EnterPin("1234");
        atm.Withdraw(2750);                             // not a multiple of 100
        atm.Withdraw(2700);                             // 2000 + 500 + 200
        cash.JamNext = true;
        atm.Withdraw(1000);                             // jam -> reversed, not charged
        atm.Withdraw(9000);                             // daily limit (2700 + 9000 > 10000)
        atm.Balance();                                  // 12300
        atm.Eject();
        atm.InsertCard(new Card("4111-02", "ACC1"));
        atm.EnterPin("0000"); atm.EnterPin("1111"); atm.EnterPin("2222");   // card retained
    }
}` }
        ] },
    viz: [{
      title: 'ATM state machine: card, PIN attempts, transactions, eject',
      input: 'balance, insert, pin 1111, pin 1234, withdraw 2750, withdraw 2700, balance, eject, insert, pin 0000, pin 1111, pin 2222',
      inputLabel: 'Events: insert, pin NNNN (correct = 1234), withdraw N, deposit N, balance, eject',
      gen: function (input) {
        var evs = tokens(input, ',', 16, 'Example: insert, pin 1234, withdraw 2700, eject');
        var st = 'IDLE', bal = 15000, today = 0, LIMIT = 10000, tries = 0, card = false, frames = [], txn = 0;
        var cas = { 2000: 2, 500: 10, 200: 10, 100: 10 };
        function snap(narr, cls, edge, msg, mhl) {
          frames.push(F(narr, [
            SM('ATM states', ATM_NODES, ATM_EDGES, st, cls, edge, 'ok', null, 66),
            VARS('Session + bank', { card: card ? 'inside' : '—', pinTries: tries + '/3', balance: '₹' + bal, withdrawnToday: '₹' + today + ' / ₹' + LIMIT, screen: msg }, { screen: cls === 'bad' ? 'bad' : 'cur' }),
            MAP('Note cassettes', casEntries(cas), mhl || {})
          ]));
        }
        snap('The ATM is <b>IDLE</b>: welcome screen, card slot open. The bank holds the account (₹15,000, daily limit ₹10,000, PIN 1234). The ATM only knows its own cash cassettes.', 'cur', null, 'Insert card');
        evs.forEach(function (raw) {
          var p = raw.trim().split(/\s+/), cmd = p[0].toLowerCase();
          if (cmd === 'insert') {
            if (st !== 'IDLE') { snap('<b>insert</b> while ' + st + ': the slot is busy — default method rejects it.', 'bad', null, 'Card already inside'); return; }
            card = true; tries = 0; st = 'CARD_INSERTED';
            snap('<b>insert card</b>: <code>AtmIdle.insertCard()</code> starts a session (attempts = 0) → <b>CARD_INSERTED</b>. The menu is still locked.', 'ok', 'IDLE-CARD_INSERTED', 'Enter PIN');
          } else if (cmd === 'pin') {
            if (st !== 'CARD_INSERTED') { snap('<b>pin</b> while ' + st + ': ' + (st === 'IDLE' ? 'no card — the keypad input is ignored.' : 'PIN already accepted.'), 'bad', null, st === 'IDLE' ? 'Insert card first' : 'Already logged in'); return; }
            if (p[1] === '1234') { st = 'AUTHENTICATED'; tries = 0; snap('<b>PIN ****</b>: the ATM sends the (encrypted) PIN to the bank, which says OK → <b>AUTHENTICATED</b>. The menu unlocks.', 'ok', 'CARD_INSERTED-AUTHENTICATED', 'Choose a transaction'); return; }
            tries++;
            if (tries >= 3) {
              st = 'CARD_RETAINED';
              snap('<b>Wrong PIN #3</b>: <code>CardInserted.enterPin()</code> hits the limit → <b>CARD_RETAINED</b>. The card is swallowed and the bank is told (possible theft).', 'bad', 'CARD_INSERTED-CARD_RETAINED', 'Card retained');
              st = 'IDLE'; card = false;
              snap('CARD_RETAINED is a short <b>transient</b> state: it logs the event and returns to <b>IDLE</b> for the next customer.', 'cur', 'CARD_RETAINED-IDLE', 'Insert card');
            } else snap('<b>Wrong PIN</b> (' + tries + '/3). Stay in CARD_INSERTED — the attempts counter belongs to this card session.', 'bad', null, 'Wrong PIN, ' + (3 - tries) + ' left');
          } else if (cmd === 'withdraw' || cmd === 'deposit' || cmd === 'balance') {
            if (st !== 'AUTHENTICATED') { snap('<b>' + cmd + '</b> while ' + st + ': the default method says "enter PIN first". This is the bug the if/else ATM often has — here it is impossible by construction.', 'bad', null, st === 'IDLE' ? 'Insert card first' : 'Enter PIN first'); return; }
            var amt = parseInt(p[1], 10);
            st = 'IN_TRANSACTION';
            if (cmd === 'balance') {
              snap('<b>balance</b>: AUTHENTICATED creates a <code>BalanceTxn</code> command and moves to <b>IN_TRANSACTION</b> (keypad locked while the bank answers).', 'cur', 'AUTHENTICATED-IN_TRANSACTION', 'Please wait…');
              st = 'AUTHENTICATED'; snap('Bank replies: balance <b>₹' + bal + '</b>. Back to AUTHENTICATED ("another transaction?").', 'ok', 'IN_TRANSACTION-AUTHENTICATED', 'Balance ₹' + bal);
              return;
            }
            if (isNaN(amt) || amt <= 0 || amt > 100000) throw new Error(cmd + ' needs an amount, e.g. ' + cmd + ' 2700');
            if (cmd === 'deposit') {
              if (amt % 100) { st = 'AUTHENTICATED'; snap('<b>deposit ₹' + amt + '</b>: notes only, multiples of 100 — rejected.', 'bad', null, 'Invalid amount'); return; }
              txn++; bal += amt;
              snap('<b>deposit ₹' + amt + '</b>: <code>DepositTxn</code> counts the notes, then <code>bank.credit(acct, ' + amt + ', T' + txn + ')</code>. Same txnId twice = credited once.', 'cur', 'AUTHENTICATED-IN_TRANSACTION', 'Counting notes…');
              st = 'AUTHENTICATED'; snap('Deposit credited (T' + txn + '). Balance ₹' + bal + '.', 'ok', 'IN_TRANSACTION-AUTHENTICATED', 'Deposited ₹' + amt);
              return;
            }
            if (amt % 100) { snap('<b>withdraw ₹' + amt + '</b>: step 1 (validate) fails — not a multiple of 100. Nothing was sent to the bank.', 'bad', 'AUTHENTICATED-IN_TRANSACTION', 'Multiples of ₹100 only'); st = 'AUTHENTICATED'; snap('Back to the menu.', 'cur', 'IN_TRANSACTION-AUTHENTICATED', 'Choose a transaction'); return; }
            var plan = atmPlan(amt, cas);
            if (!plan) { snap('<b>withdraw ₹' + amt + '</b>: step 2 (plan notes) fails — the cassettes cannot make this amount. Stop before touching the bank.', 'bad', 'AUTHENTICATED-IN_TRANSACTION', 'Cannot dispense ₹' + amt); st = 'AUTHENTICATED'; snap('Back to the menu.', 'cur', 'IN_TRANSACTION-AUTHENTICATED', 'Try another amount'); return; }
            if (bal < amt || today + amt > LIMIT) { snap('<b>withdraw ₹' + amt + '</b>: notes OK (' + planTxt(plan) + '), but the bank declines: ' + (bal < amt ? 'insufficient funds' : 'daily limit (₹' + today + ' + ₹' + amt + ' &gt; ₹' + LIMIT + ')') + '. No money moved.', 'bad', 'AUTHENTICATED-IN_TRANSACTION', 'Declined'); st = 'AUTHENTICATED'; snap('Back to the menu.', 'cur', 'IN_TRANSACTION-AUTHENTICATED', 'Choose a transaction'); return; }
            txn++;
            snap('<b>withdraw ₹' + amt + '</b>: validate ✓ → plan notes ✓ (' + planTxt(plan) + ') → <code>bank.debit(acct, ' + amt + ', T' + txn + ')</code> approved. Now in <b>IN_TRANSACTION</b> the dispenser counts notes.', 'cur', 'AUTHENTICATED-IN_TRANSACTION', 'Counting cash…');
            bal -= amt; today += amt;
            var mhl = {}; ATM_NOTES.forEach(function (n) { if (plan[n]) { cas[n] -= plan[n]; mhl['₹' + n] = 'bad'; } });
            st = 'AUTHENTICATED';
            snap('Cash presented and taken: cassettes drop (red). Bank balance ₹' + bal + ', withdrawn today ₹' + today + '. Back to AUTHENTICATED.', 'ok', 'IN_TRANSACTION-AUTHENTICATED', 'Take your cash', mhl);
          } else if (cmd === 'eject') {
            if (st !== 'AUTHENTICATED' && st !== 'CARD_INSERTED') { snap('<b>eject</b> while ' + st + ': no card to eject.', 'bad', null, 'No card'); return; }
            var from = st; st = 'IDLE'; card = false; tries = 0;
            snap('<b>eject</b>: session ends, card returned, attempts forgotten → <b>IDLE</b>.', 'ok', from + '-IDLE', 'Thank you');
          } else throw new Error('Unknown event "' + raw + '". Use insert, pin N, withdraw N, deposit N, balance, eject');
        });
        snap('Script finished. Notice how "3 wrong PINs", "menu only after PIN" and "keypad locked while processing" were each enforced by exactly one state class.', 'sel', null, 'Bye');
        return frames;
      }
    }, {
      title: 'Withdrawal flow across components: approve, dispense, and roll back on failure',
      input: 'amount=2700; fail=dispense',
      inputLabel: 'amount = multiple of 100 (≤ 10000); fail = none | dispense | network',
      gen: function (input) {
        var o = kvParse(input, 'Format: amount=2700; fail=none|dispense|network');
        var amt = parseInt(o.amount, 10), fail = String(o.fail || 'none').toLowerCase();
        if (isNaN(amt) || amt <= 0 || amt > 10000 || amt % 100) throw new Error('amount must be a multiple of 100 between 100 and 10000');
        if (['none', 'dispense', 'network'].indexOf(fail) < 0) throw new Error('fail must be none, dispense or network');
        var nodes = [B('U', 'Customer', 8, 30), B('A', 'ATM Controller', 34, 30), B('BK', 'Bank (core banking)', 74, 9), B('D', 'Cash Dispenser', 74, 52)];
        var edges = [['U', 'A', ''], ['A', 'U', ''], ['A', 'BK', ''], ['BK', 'A', ''], ['A', 'D', ''], ['D', 'A', '']];
        var bal = 15000, hold = 0, log = [], frames = [];
        function step(narr, from, to, label, cls, hlNode) {
          var e = edges.map(function (x) { return [x[0], x[1], (x[0] === from && x[1] === to) ? label : '']; });
          var ehl = {}; if (from) ehl[from + '-' + to] = cls || 'ok';
          var hl = {}; if (hlNode) hl[hlNode] = cls === 'bad' ? 'bad' : 'cur';
          if (from) log.push([log.length + 1, nodes.filter(function (n) { return n.id === from; })[0].label + ' → ' + nodes.filter(function (n) { return n.id === to; })[0].label, label]);
          frames.push(F(narr, [G('Components (active message highlighted)', nodes, e, { hl: hl, ehl: ehl, h: 62 }), TABLE('Message journal (the ATM writes every step to disk)', ['#', 'from → to', 'message'], log, one(log.length - 1, cls === 'bad' ? 'bad' : 'cur')), VARS('Account at the bank', { balance: '₹' + bal, debitedFor: hold ? '₹' + hold + ' (T42)' : '—' })]));
        }
        step('Customer is AUTHENTICATED and asks to withdraw <b>₹' + amt + '</b>. The ATM creates a <code>WithdrawTxn</code> with id <b>T42</b> and writes it to its journal <i>before</i> talking to anyone — so it can recover after a crash.', 'U', 'A', 'withdraw ₹' + amt, 'cur', 'A');
        step('Step 2: ask the dispenser to <b>plan</b> the notes (no notes move yet). If the cassettes cannot make ₹' + amt + ', we stop here and the bank is never called.', 'A', 'D', 'plan ₹' + amt + '?', 'cur', 'D');
        step('Dispenser: "Yes, I can" (Chain of Responsibility over ₹2000 → ₹500 → ₹200 → ₹100).', 'D', 'A', 'plan OK', 'ok', 'A');
        step('Step 3: <code>bank.debit(acct, ' + amt + ', "T42")</code>. The bank checks balance and daily limit.', 'A', 'BK', 'debit ₹' + amt + ' T42', 'cur', 'BK');
        bal -= amt; hold = amt;
        if (fail === 'network') {
          step('The bank <b>approved and debited</b>… but the reply is <b>lost</b> on the network. The ATM times out and does <b>not know</b> whether the money was taken.', 'BK', 'A', 'approved (LOST)', 'bad', 'BK');
          step('Rule: <b>never dispense without a confirmed approval</b>. The ATM sends <code>reverse("T42")</code>. Because the bank keys everything by txnId, the reversal undoes the debit if it happened and is a harmless no-op if it did not.', 'A', 'BK', 'reverse T42', 'cur', 'BK');
          bal += amt; hold = 0;
          step('Bank: reversal done (balance restored). It would also ignore a late duplicate of "debit T42" because T42 is already settled.', 'BK', 'A', 'reversed', 'ok', 'A');
          step('Customer sees "Unable to process, your account has not been charged". Money is safe on both sides; the journal proves it.', 'A', 'U', 'sorry, not charged', 'bad', 'U');
        } else {
          step('Bank: <b>approved</b>, ₹' + amt + ' debited under T42.', 'BK', 'A', 'approved T42', 'ok', 'A');
          step('Step 4: dispense the planned notes.', 'A', 'D', 'dispense', 'cur', 'D');
          if (fail === 'dispense') {
            step('<b>Jam!</b> The notes never reach the tray (sensor sees nothing). They are diverted to a sealed reject bin.', 'D', 'A', 'JAM', 'bad', 'D');
            step('Step 5b: <b>compensate</b> — <code>bank.reverse("T42")</code>. This is a saga-style rollback: the debit already committed, so we undo it with a new, opposite action.', 'A', 'BK', 'reverse T42', 'cur', 'BK');
            bal += amt; hold = 0;
            step('Bank: reversed. If the ATM crashes before this, on restart it replays its journal ("T42 debited, not dispensed") and sends the reversal again — safe because it is idempotent.', 'BK', 'A', 'reversed', 'ok', 'A');
            step('Customer: "Could not dispense. Your account was NOT charged." Ops later reconciles the reject bin against the journal.', 'A', 'U', 'not charged', 'bad', 'U');
          } else {
            step('Dispenser: notes presented and taken by the customer (tray sensor confirms).', 'D', 'A', 'presented ✓', 'ok', 'A');
            step('Step 5a: tell the bank the cash was dispensed so the hold becomes final (some networks call this completion/advice).', 'A', 'BK', 'confirm T42', 'cur', 'BK');
            step('Customer gets cash + receipt. Back to the AUTHENTICATED menu.', 'A', 'U', 'cash + receipt', 'ok', 'U');
          }
        }
        frames.push(F('Summary: the order <b>validate → plan notes → debit (with txnId) → dispense → confirm / reverse</b> guarantees the customer is charged <i>if and only if</i> cash came out. Try <code>fail=none</code>, <code>fail=dispense</code> and <code>fail=network</code>.', [TABLE('Failure → what protects the money', ['failure', 'protection'], [['cannot make the amount', 'plan notes before calling the bank'], ['bank declines', 'nothing dispensed, nothing to undo'], ['reply lost (timeout)', 'reverse(txnId), idempotent at bank'], ['note jam', 'reverse(txnId) + reject bin reconciliation'], ['ATM crash mid-way', 'journal replay on restart']]), VARS('Final account', { balance: '₹' + bal })]));
        return frames;
      }
    }, {
      title: 'Cash dispenser chain: ₹2000 → ₹500 → ₹200 → ₹100 (and when greedy gets stuck)',
      input: 'amount=600; notes=2000x1 500x1 200x3 100x0',
      inputLabel: 'amount = multiple of 100; notes = counts per cassette, e.g. 2000x1 500x2 200x5 100x3',
      gen: function (input) {
        var o = kvParse(input, 'Format: amount=600; notes=2000x1 500x1 200x3 100x0');
        var amt = parseInt(o.amount, 10);
        if (isNaN(amt) || amt <= 0 || amt > 50000 || amt % 100) throw new Error('amount must be a multiple of 100, at most 50000');
        var cas = { 2000: 0, 500: 0, 200: 0, 100: 0 };
        tokens(o.notes || '', /\s+/, 4, 'notes=2000x1 500x1 200x3 100x0').forEach(function (t) {
          var m = /^(2000|500|200|100)x(\d{1,2})$/.exec(t);
          if (!m) throw new Error('Each cassette is NOTExCOUNT, e.g. 500x2 (count ≤ 99)');
          cas[m[1]] = Number(m[2]);
        });
        var nodes = ATM_NOTES.map(function (n, i) { return B('N' + n, '₹' + n + ' handler', 13 + i * 25, 22); });
        var edges = [['N2000', 'N500', 'rest'], ['N500', 'N200', 'rest'], ['N200', 'N100', 'rest']];
        var frames = [], rest = amt, used = {};
        frames.push(F('Request <b>₹' + amt + '</b>. Each cassette is a <b>handler</b> in a chain. A handler takes as many of its notes as it can (without exceeding the amount or its stock) and passes the <b>rest</b> to the next handler. This is the classic Chain of Responsibility answer.', [G('Note handler chain', nodes, edges, { h: 40 }), MAP('Cassettes', casEntries(cas)), VARS('Plan', { remaining: '₹' + rest })]));
        ATM_NOTES.forEach(function (n, i) {
          var use = Math.min(cas[n], Math.floor(rest / n));
          used[n] = use; rest -= use * n;
          var hl = {}; hl['N' + n] = 'cur';
          var ehl = {}; if (i > 0) ehl['N' + ATM_NOTES[i - 1] + '-N' + n] = 'ok';
          frames.push(F('₹' + n + ' handler: stock ' + cas[n] + ', can use up to ' + Math.floor((rest + use * n) / n) + ' → takes <b>' + use + '</b>. Remaining <b>₹' + rest + '</b>' + (i < 3 ? ' passed down the chain.' : '.'), [G('Note handler chain', nodes, edges, { h: 40, hl: hl, ehl: ehl }), MAP('Cassettes', casEntries(cas), one('₹' + n, use ? 'ok' : 'cur')), VARS('Plan', { remaining: '₹' + rest, plan: planTxt(used) || '—' })]));
        });
        if (rest === 0) {
          frames.push(F('Greedy chain succeeded: <b>' + planTxt(used) + '</b>. Only now (after the bank approves) are notes actually moved — planning never touches the cassettes.', [G('Note handler chain', nodes, edges, { h: 40, hl: { N100: 'ok', N200: 'ok', N500: 'ok', N2000: 'ok' } }), VARS('Plan', { result: planTxt(used) })]));
        } else {
          var bt = atmPlan(amt, cas);
          frames.push(F('<span class="c-r">Stuck with ₹' + rest + ' left!</span> The greedy chain took a big note too early. With limited stock, "take as many as possible" is not always right.', [G('Note handler chain', nodes, edges, { h: 40, hl: { N100: 'bad' } }), VARS('Greedy result', { remaining: '₹' + rest, verdict: 'FAIL' }, { verdict: 'bad' })]));
          frames.push(F(bt ? 'Fix: each handler tries <b>use = max … 0</b> and asks the rest of the chain; if the chain below fails, it backs off by one note (backtracking). Result: <b>' + planTxt(bt) + '</b>. Still a chain; each handler still only knows its own note and its successor.' : 'Even with backtracking no combination makes ₹' + amt + ' from these cassettes — the ATM must say "cannot dispense this amount" <b>before</b> calling the bank.', [TABLE('Greedy vs backtracking', ['approach', 'plan', 'ok?'], [['greedy chain', planTxt(used) + ' (₹' + rest + ' short)', 'no'], ['backtracking chain', bt ? planTxt(bt) : 'none exists', bt ? 'yes' : 'no']], one(1, bt ? 'ok' : 'bad'))]));
        }
        return frames;
      }
    }],
    examples: [
      { title: 'PIN attempts: whose counter is it?', html: `<p>The counter resets when a <b>new card session</b> starts and on a correct PIN. If you put it in a field that survives sessions, customer B inherits customer A's two wrong tries and gets their card retained after one typo. Real systems also count failures <b>at the bank</b> per card (across ATMs) — the ATM counter is only a local safety net. ${H.table(['Event', 'attempts', 'state'], [['insert card', '0', 'CARD_INSERTED'], ['PIN 1111', '1', 'CARD_INSERTED'], ['PIN 0000', '2', 'CARD_INSERTED'], ['PIN 9999', '3', H.c('r', 'CARD_RETAINED → IDLE')]])}</p>` },
      { title: 'Transactions as Command objects', html: `<p>Each user choice becomes an object (<code>WithdrawTxn(2700)</code>) with an id. Benefits: the AUTHENTICATED state has one method <code>choose(Transaction t)</code> instead of one per menu item; each transaction is written to the <b>journal</b> before running (crash recovery); and adding "mini statement" or "PIN change" is a new class, nothing else.</p>`, code: { lang: 'java', code: `interface Txn { String run(); }
record MiniStatement(String account) implements Txn {
    public String run() { return "Last 5 transactions for " + account; }   // new feature = new class
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from typing import Protocol


class Txn(Protocol):
    def run(self) -> str: ...


@dataclass(frozen=True)
class MiniStatement:
    account: str

    def run(self) -> str:  # new feature = new class
        return f"Last 5 transactions for {self.account}"` },
          { lang: 'ts', code: `interface Txn {
  run(): string;
}

class MiniStatement implements Txn {
  constructor(readonly account: string) {}
  run(): string { return \`Last 5 transactions for \${this.account}\`; } // new feature = new class
}` },
          { lang: 'cpp', code: `struct Txn {
    virtual ~Txn() = default;
    virtual string run() const = 0;
};

class MiniStatement final : public Txn {
    string account_;

public:
    explicit MiniStatement(string account) : account_(move(account)) {}
    string run() const override { return "Last 5 transactions for " + account_; }  // new feature = new class
};` },
  { lang: 'csharp', code: `
interface ITxn { string Run(); }
sealed class MiniStatement : ITxn {
    private readonly string account;
    public MiniStatement(string account) { this.account = account; }
    public string Run() { return "Last 5 transactions for " + account; }   // new feature = new class
}` }
        ] } },
      { title: 'Idempotency in one picture', html: `<p>${H.table(['Bank receives', 'Bank state before', 'Result'], [['debit 2700 T42', 'T42 unknown', H.c('g', 'debit, store T42')], ['debit 2700 T42 (retry)', 'T42 debited', H.c('b', 'no-op, reply approved')], ['reverse T42', 'T42 debited', H.c('g', 'credit back, mark reversed')], ['reverse T42 (retry)', 'T42 reversed', H.c('b', 'no-op')]])} Without txnIds, a network retry charges the customer twice — the number one ATM bug interviewers probe.</p>` },
      { title: 'Out of service: a state, not a flag', html: `<p>When total cash drops below ₹100 (or a cassette faults, or the printer is out of paper for a bank that requires receipts), the ATM moves to <b>OUT_OF_SERVICE</b> after the current customer ejects. In that state <code>insertCard</code> is rejected by default. Partial modes are common: "no ₹100 notes" just shrinks the allowed amounts (handled by the planner), while "no cash at all" is a real state change.</p>` }
    ],
    deepDive: `<p><b>Two-phase money movement.</b> Real card networks use <b>authorization</b> (hold funds) then <b>completion/settlement</b>. For ATMs the debit is usually immediate, with a <b>reversal</b> message if dispensing fails — a compensating action, exactly the Saga pattern. The ATM never holds money state; the bank's ledger is the source of truth, and the ATM's <b>electronic journal</b> is the evidence.</p>
<p><b>Idempotency keys done right.</b> The txnId must be generated <i>by the ATM</i> before the first send and persisted to its journal, so a retry after a crash reuses the same id. The bank stores processed ids (with a TTL long enough to cover retries). A reversal that arrives <i>before</i> its debit (messages reordered) should leave a tombstone so the late debit is refused.</p>
<p><b>Security.</b> The PIN is encrypted inside the keypad (EPP — encrypting PIN pad) into a <b>PIN block</b>; the ATM software never sees it in clear. Card data uses EMV chip cryptograms. In LLD terms: <code>Keypad</code> returns an opaque <code>PinBlock</code>, not a <code>String</code> — a great detail to mention.</p>
<p><b>Timeouts are events.</b> Customer walks away at the menu → after 30 s the AUTHENTICATED state receives <code>Timeout</code> → eject card; if not taken in 20 s → retain it. Cash presented but not taken → retract and reverse. Each is a transition in the table, which is why ATMs are textbook state machines.</p>
<p><b>Chain of Responsibility vs DP.</b> The handler chain is easy to extend (add a ₹50 cassette = new handler) and with backtracking it is correct for limited stock. For "fewest notes" with limited stock across many denominations, bounded-knapsack DP is the exact algorithm; with 4–5 cassettes backtracking is tiny and clearer.</p>
<p><b>Concurrency.</b> One ATM serves one customer, but the <b>bank</b> serves thousands of ATMs, mobile apps and UPI at once on the same account. Debits must be atomic at the bank (row lock or <code>UPDATE … SET bal = bal − ? WHERE id = ? AND bal &gt;= ?</code>), and daily limits must be counted at the bank, never per ATM.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes the menu-driven ATM in seconds. The review is where you add value: Is there a txnId? Is reversal idempotent? Is the PIN a <code>String</code> sitting in memory? Does withdraw debit before planning notes? Can a customer reach the menu without a PIN through some path? Each question maps to a real-world fraud or loss.</p>
<p><b>Use AI as a partner:</b> <code>Act as a chaos tester: list every point in my withdrawal flow where the process could crash or a message could be lost, and say what my design does in each case.</code> Then turn the list into tests with a fake bank that drops, duplicates and reorders messages.</p>
<p><b>Banking in 2026:</b> cardless withdrawals (UPI-ATM / QR codes), biometric auth and app-initiated "pre-staged" withdrawals add new states (WAITING_FOR_QR_APPROVAL) and new Command types — the State + Command + Chain structure absorbs them. AI fraud models score withdrawals in real time at the bank; the ATM just sees a decline reason.</p>
<p><b>What you must still own:</b> the order of operations, idempotency, compensation, and the security boundary (what the ATM software must never see). These are judgment calls an LLM will not reliably make for you.</p>`,
    problems: [{
      title: 'ATM Cash Dispenser with Limited Notes (Chain of Responsibility)', level: 'Medium', tags: ['atm', 'chain of responsibility', 'backtracking'], companies: ['Goldman Sachs', 'JPMorgan', 'Amazon', 'PhonePe'],
      statement: `<p>Implement the cash dispenser of an ATM. Cassettes hold notes of ₹2000, ₹500, ₹200 and ₹100 in limited quantities. <code>plan(amount)</code> must return how many notes of each type to dispense, preferring bigger notes, or report that the amount cannot be dispensed — without changing the cassettes. <code>dispense(plan)</code> then removes the notes. Design it so a new denomination (e.g. ₹50) can be added without editing existing handler code.</p>`,
      constraints: `Amount ≤ 50,000 and a multiple of 100 (or 50 once ₹50 is added). Up to 2,000 notes per cassette.`,
      example: `<p>Cassettes: ₹2000×1, ₹500×1, ₹200×3, ₹100×0. Request ₹600. Greedy: ₹500 → remaining ₹100 → ${H.c('r', 'no ₹100 notes, stuck')}. Correct plan: ${H.c('g', '₹200×3')}. Request ₹2700 with ₹2000×2, ₹500×10, ₹200×10, ₹100×10 → ${H.c('g', '₹2000×1 + ₹500×1 + ₹200×1')}.</p>`,
      brute: { why: `<p>A single method with hard-coded <code>if (amount &gt;= 2000) … if (amount &gt;= 500) …</code> greedy steps. It fails on limited stock (₹600 case), and adding ₹50 means editing the method. Trying all combinations of all counts (2001<sup>4</sup>) is far too slow.</p>`, code: { lang: 'java', code: `class HardCodedDispenser {
    int n2000, n500, n200, n100;
    HardCodedDispenser(int a, int b, int c, int d) { n2000 = a; n500 = b; n200 = c; n100 = d; }
    // greedy + hard-coded denominations: wrong on limited stock, closed to extension
    int[] plan(int amount) {
        int a = Math.min(n2000, amount / 2000); amount -= a * 2000;
        int b = Math.min(n500, amount / 500);   amount -= b * 500;
        int c = Math.min(n200, amount / 200);   amount -= c * 200;
        int d = Math.min(n100, amount / 100);   amount -= d * 100;
        return amount == 0 ? new int[] {a, b, c, d} : null;   // 600 with {1,1,3,0} -> null (wrong!)
    }
}`, alt: [{ lang: 'python', code: "class HardCodedDispenser:\n    def __init__(self, a, b, c, d):\n        self.n2000, self.n500, self.n200, self.n100 = a, b, c, d\n\n    # greedy + hard-coded denominations: wrong on limited stock, closed to extension\n    def plan(self, amount):\n        a = min(self.n2000, amount // 2000); amount -= a * 2000\n        b = min(self.n500, amount // 500);   amount -= b * 500\n        c = min(self.n200, amount // 200);   amount -= c * 200\n        d = min(self.n100, amount // 100);   amount -= d * 100\n        return [a, b, c, d] if amount == 0 else None   # 600 with {1,1,3,0} -> None (wrong!)\n" }, { lang: 'ts', code: "class HardCodedDispenser {\n  constructor(private n2000: number, private n500: number, private n200: number, private n100: number) {}\n  // greedy + hard-coded denominations: wrong on limited stock, closed to extension\n  plan(amount: number): number[] | null {\n    const a = Math.min(this.n2000, Math.floor(amount / 2000)); amount -= a * 2000;\n    const b = Math.min(this.n500, Math.floor(amount / 500));   amount -= b * 500;\n    const c = Math.min(this.n200, Math.floor(amount / 200));   amount -= c * 200;\n    const d = Math.min(this.n100, Math.floor(amount / 100));   amount -= d * 100;\n    return amount === 0 ? [a, b, c, d] : null;   // 600 with {1,1,3,0} -> null (wrong!)\n  }\n}\n" }, { lang: 'cpp', code: "class HardCodedDispenser {\n    int n2000, n500, n200, n100;\npublic:\n    HardCodedDispenser(int a, int b, int c, int d) : n2000(a), n500(b), n200(c), n100(d) {}\n    // greedy + hard-coded denominations: wrong on limited stock, closed to extension\n    optional<array<int, 4>> plan(int amount) {\n        int a = min(n2000, amount / 2000); amount -= a * 2000;\n        int b = min(n500, amount / 500);   amount -= b * 500;\n        int c = min(n200, amount / 200);   amount -= c * 200;\n        int d = min(n100, amount / 100);   amount -= d * 100;\n        if (amount == 0) return array<int, 4>{a, b, c, d};\n        return nullopt;   // 600 with {1,1,3,0} -> nullopt (wrong!)\n    }\n};\n" }, { lang: 'csharp', code: "using System;\nclass HardCodedDispenser {\n    int n2000, n500, n200, n100;\n    public HardCodedDispenser(int a, int b, int c, int d) { n2000 = a; n500 = b; n200 = c; n100 = d; }\n    // greedy + hard-coded denominations: wrong on limited stock, closed to extension\n    public int[] Plan(int amount) {\n        int a = Math.Min(n2000, amount / 2000); amount -= a * 2000;\n        int b = Math.Min(n500, amount / 500);   amount -= b * 500;\n        int c = Math.Min(n200, amount / 200);   amount -= c * 200;\n        int d = Math.Min(n100, amount / 100);   amount -= d * 100;\n        return amount == 0 ? new[] { a, b, c, d } : null;   // 600 with {1,1,3,0} -> null (wrong!)\n    }\n}\n" }] } },
      mcq: { q: 'Why does the plan step come before calling the bank in a withdrawal?', options: ['So the customer is never charged for an amount the ATM cannot physically dispense', 'Because the bank needs the note breakdown', 'To make the transaction faster', 'It does not matter'], answer: 0, explain: 'Planning is local and side-effect free; if it fails, nothing needs undoing. Debit-then-discover-you-cannot-dispense forces a reversal.' },
      hints: [`<p>Hint 1: Make each denomination a <b>handler</b> that knows its note value, its stock and the next handler. The chain order (big → small) is set up once at construction.</p>`, `<p>Hint 2: Plain "take as many as you can" fails on limited stock. Let each handler try <code>use = max … 0</code> and ask the next handler to solve the remainder; return true on the first success (backtracking). Write into the plan only on success.</p>`, `<p>Hint 3: Keep <code>plan()</code> pure (no stock changes) and a separate <code>commit(plan)</code> that walks the chain subtracting counts. Adding ₹50 = link one more handler.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "plan {200=3}\nplan {2000=1, 500=1, 200=1}\nno plan\nno plan\n{2000=1, 500=1, 200=1, 50=1}\nplan {2000=1, 500=1, 200=1, 50=1}\nplan {500=8, 200=4, 100=1, 50=1}\nno plan\n" }] },
      solution: {
        approach: `<p>Chain of Responsibility with backtracking. Each <code>NoteHandler</code> tries the largest feasible number of its notes first and delegates the remainder; if the rest of the chain fails, it retries with one fewer note. This returns the plan that uses the most big notes among feasible plans (lexicographically largest from the top), matches greedy whenever greedy works, and finds a plan whenever one exists. <code>commit</code> applies a plan after the bank approves.</p>`,
        code: `import java.util.*;

class Cassette {
    final int note;
    int count;
    private Cassette next;
    Cassette(int note, int count) { this.note = note; this.count = count; }
    Cassette link(Cassette n) { next = n; return n; }

    /** Pure planning: no counts change. Backtracks when the rest of the chain cannot finish. */
    boolean plan(int amount, Map<Integer, Integer> out) {
        for (int use = Math.min(count, amount / note); use >= 0; use--) {
            int rest = amount - use * note;
            if (rest == 0 || (next != null && next.plan(rest, out))) {
                if (use > 0) out.put(note, use);
                return true;
            }
        }
        return false;
    }
    void commit(Map<Integer, Integer> plan) {
        count -= plan.getOrDefault(note, 0);
        if (next != null) next.commit(plan);
    }
}

class Dispenser {
    private final Cassette head;
    Dispenser(Cassette head) { this.head = head; }

    Optional<Map<Integer, Integer>> plan(int amount) {
        if (amount <= 0) return Optional.empty();
        Map<Integer, Integer> p = new TreeMap<>(Comparator.reverseOrder());
        return head.plan(amount, p) ? Optional.of(p) : Optional.empty();
    }
    void dispense(Map<Integer, Integer> plan) { head.commit(plan); }

    static String show(Optional<Map<Integer, Integer>> plan) { return plan.map(m -> "plan " + m).orElse("no plan"); }

    public static void main(String[] args) {
        Cassette c2000 = new Cassette(2000, 1);
        c2000.link(new Cassette(500, 1)).link(new Cassette(200, 3)).link(new Cassette(100, 0));
        Dispenser d = new Dispenser(c2000);
        System.out.println(show(d.plan(600)));      // plan {200=3}
        System.out.println(show(d.plan(2700)));     // plan {2000=1, 500=1, 200=1}
        System.out.println(show(d.plan(300)));      // no plan -> refuse before calling the bank
        System.out.println(show(d.plan(0)));        // no plan -> nothing to dispense

        Cassette big = new Cassette(2000, 2);  // adding a Rs 50 cassette = one more link()
        big.link(new Cassette(500, 10)).link(new Cassette(200, 10)).link(new Cassette(100, 10)).link(new Cassette(50, 4));
        Dispenser d2 = new Dispenser(big);
        Map<Integer, Integer> p = d2.plan(2750).orElseThrow();
        d2.dispense(p);
        System.out.println(p);                // {2000=1, 500=1, 200=1, 50=1}
        System.out.println(show(d2.plan(2750))); // plan {2000=1, 500=1, 200=1, 50=1}: counts dropped, still enough
        d2.dispense(d2.plan(2750).orElseThrow());
        System.out.println(show(d2.plan(4950))); // plan {500=8, 200=4, 100=1, 50=1}: the 2000s are gone
        System.out.println(show(d2.plan(4975))); // no plan: not a multiple of 50
    }
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations


class Cassette:
    def __init__(self, note: int, count: int) -> None:
        self.note = note
        self.count = count
        self._next: Cassette | None = None

    def link(self, n: Cassette) -> Cassette:
        self._next = n
        return n

    def plan(self, amount: int, out: dict[int, int]) -> bool:
        """Pure planning: no counts change. Backtracks when the rest of the chain cannot finish."""
        for use in range(min(self.count, amount // self.note), -1, -1):
            rest = amount - use * self.note
            if rest == 0 or (self._next is not None and self._next.plan(rest, out)):
                if use > 0:
                    out[self.note] = use
                return True
        return False

    def commit(self, plan: dict[int, int]) -> None:
        self.count -= plan.get(self.note, 0)
        if self._next is not None:
            self._next.commit(plan)


class Dispenser:
    def __init__(self, head: Cassette) -> None:
        self._head = head

    def plan(self, amount: int) -> dict[int, int] | None:
        if amount <= 0:
            return None
        p: dict[int, int] = {}
        if not self._head.plan(amount, p):
            return None
        return dict(sorted(p.items(), reverse=True))  # largest note first

    def dispense(self, plan: dict[int, int]) -> None:
        self._head.commit(plan)

    @staticmethod
    def show(plan: dict[int, int] | None) -> str:
        if plan is None:
            return "no plan"
        return "plan {" + ", ".join(f"{k}={v}" for k, v in plan.items()) + "}"


if __name__ == "__main__":
    c2000 = Cassette(2000, 1)
    c2000.link(Cassette(500, 1)).link(Cassette(200, 3)).link(Cassette(100, 0))
    d = Dispenser(c2000)
    print(Dispenser.show(d.plan(600)))   # plan {200=3}
    print(Dispenser.show(d.plan(2700)))  # plan {2000=1, 500=1, 200=1}
    print(Dispenser.show(d.plan(300)))   # no plan -> refuse before calling the bank
    print(Dispenser.show(d.plan(0)))     # no plan -> nothing to dispense

    big = Cassette(2000, 2)  # adding a Rs 50 cassette = one more link()
    big.link(Cassette(500, 10)).link(Cassette(200, 10)).link(Cassette(100, 10)).link(Cassette(50, 4))
    d2 = Dispenser(big)
    p = d2.plan(2750)
    assert p is not None
    d2.dispense(p)
    print("{" + ", ".join(f"{k}={v}" for k, v in p.items()) + "}")  # {2000=1, 500=1, 200=1, 50=1}
    print(Dispenser.show(d2.plan(2750)))  # plan {2000=1, 500=1, 200=1, 50=1}: counts dropped, still enough
    again = d2.plan(2750)
    assert again is not None
    d2.dispense(again)
    print(Dispenser.show(d2.plan(4950)))  # plan {500=8, 200=4, 100=1, 50=1}: the 2000s are gone
    print(Dispenser.show(d2.plan(4975)))  # no plan: not a multiple of 50` },
          { lang: 'ts', code: `type Plan = Map<number, number>; // note -> how many, largest note first

class Cassette {
  private next: Cassette | null = null;

  constructor(readonly note: number, public count: number) {}

  link(n: Cassette): Cassette {
    this.next = n;
    return n;
  }

  /** Pure planning: no counts change. Backtracks when the rest of the chain cannot finish. */
  plan(amount: number, out: Plan): boolean {
    for (let use = Math.min(this.count, Math.floor(amount / this.note)); use >= 0; use--) {
      const rest = amount - use * this.note;
      if (rest === 0 || (this.next !== null && this.next.plan(rest, out))) {
        if (use > 0) out.set(this.note, use);
        return true;
      }
    }
    return false;
  }

  commit(plan: Plan): void {
    this.count -= plan.get(this.note) ?? 0;
    this.next?.commit(plan);
  }
}

class Dispenser {
  constructor(private readonly head: Cassette) {}

  plan(amount: number): Plan | null {
    if (amount <= 0) return null;
    const p: Plan = new Map();
    if (!this.head.plan(amount, p)) return null;
    return new Map([...p].sort((a, b) => b[0] - a[0])); // largest note first
  }

  dispense(plan: Plan): void { this.head.commit(plan); }

  static show(plan: Plan | null): string {
    return plan === null ? "no plan" : "plan " + Dispenser.fmt(plan);
  }
  static fmt(plan: Plan): string {
    return "{" + [...plan].map(([k, v]) => \`\${k}=\${v}\`).join(", ") + "}";
  }
}

const c2000 = new Cassette(2000, 1);
c2000.link(new Cassette(500, 1)).link(new Cassette(200, 3)).link(new Cassette(100, 0));
const d = new Dispenser(c2000);
console.log(Dispenser.show(d.plan(600)));  // plan {200=3}
console.log(Dispenser.show(d.plan(2700))); // plan {2000=1, 500=1, 200=1}
console.log(Dispenser.show(d.plan(300)));  // no plan -> refuse before calling the bank
console.log(Dispenser.show(d.plan(0)));    // no plan -> nothing to dispense

const big = new Cassette(2000, 2); // adding a Rs 50 cassette = one more link()
big.link(new Cassette(500, 10)).link(new Cassette(200, 10)).link(new Cassette(100, 10)).link(new Cassette(50, 4));
const d2 = new Dispenser(big);
const p = d2.plan(2750)!;
d2.dispense(p);
console.log(Dispenser.fmt(p)); // {2000=1, 500=1, 200=1, 50=1}
console.log(Dispenser.show(d2.plan(2750))); // plan {2000=1, 500=1, 200=1, 50=1}: counts dropped, still enough
d2.dispense(d2.plan(2750)!);
console.log(Dispenser.show(d2.plan(4950))); // plan {500=8, 200=4, 100=1, 50=1}: the 2000s are gone
console.log(Dispenser.show(d2.plan(4975))); // no plan: not a multiple of 50` },
          { lang: 'cpp', code: `using Plan = map<int, int, greater<int>>;  // note -> how many, largest note first

class Cassette {
    int note_, count_;
    unique_ptr<Cassette> next_;  // the chain owns its links

public:
    Cassette(int note, int count) : note_(note), count_(count) {}

    Cassette* link(unique_ptr<Cassette> n) {
        next_ = move(n);
        return next_.get();
    }

    // Pure planning: no counts change. Backtracks when the rest of the chain cannot finish.
    bool plan(int amount, Plan& out) const {
        for (int use = min(count_, amount / note_); use >= 0; use--) {
            int rest = amount - use * note_;
            if (rest == 0 || (next_ && next_->plan(rest, out))) {
                if (use > 0) out[note_] = use;
                return true;
            }
        }
        return false;
    }

    void commit(const Plan& plan) {
        auto it = plan.find(note_);
        if (it != plan.end()) count_ -= it->second;
        if (next_) next_->commit(plan);
    }
};

class Dispenser {
    Cassette* head_;

public:
    explicit Dispenser(Cassette* head) : head_(head) {}

    optional<Plan> plan(int amount) const {
        if (amount <= 0) return nullopt;
        Plan p;
        if (!head_->plan(amount, p)) return nullopt;
        return p;
    }
    void dispense(const Plan& plan) { head_->commit(plan); }

    static string fmt(const Plan& plan) {
        string s = "{";
        for (const auto& [note, n] : plan) s += (s.size() > 1 ? ", " : "") + to_string(note) + "=" + to_string(n);
        return s + "}";
    }
    static string show(const optional<Plan>& plan) { return plan ? "plan " + fmt(*plan) : "no plan"; }
};

int main() {
    Cassette c2000(2000, 1);
    c2000.link(make_unique<Cassette>(500, 1))->link(make_unique<Cassette>(200, 3))->link(make_unique<Cassette>(100, 0));
    Dispenser d(&c2000);
    cout << Dispenser::show(d.plan(600)) << "\\n";   // plan {200=3}
    cout << Dispenser::show(d.plan(2700)) << "\\n";  // plan {2000=1, 500=1, 200=1}
    cout << Dispenser::show(d.plan(300)) << "\\n";   // no plan -> refuse before calling the bank
    cout << Dispenser::show(d.plan(0)) << "\\n";     // no plan -> nothing to dispense

    Cassette big(2000, 2);  // adding a Rs 50 cassette = one more link()
    big.link(make_unique<Cassette>(500, 10))->link(make_unique<Cassette>(200, 10))
        ->link(make_unique<Cassette>(100, 10))->link(make_unique<Cassette>(50, 4));
    Dispenser d2(&big);
    Plan p = *d2.plan(2750);
    d2.dispense(p);
    cout << Dispenser::fmt(p) << "\\n";                       // {2000=1, 500=1, 200=1, 50=1}
    cout << Dispenser::show(d2.plan(2750)) << "\\n";          // plan {2000=1, 500=1, 200=1, 50=1}: counts dropped, still enough
    d2.dispense(*d2.plan(2750));
    cout << Dispenser::show(d2.plan(4950)) << "\\n";          // plan {500=8, 200=4, 100=1, 50=1}: the 2000s are gone
    cout << Dispenser::show(d2.plan(4975)) << "\\n";          // no plan: not a multiple of 50
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

class Cassette {
    public readonly int Note;
    public int Count;
    private Cassette next;
    public Cassette(int note, int count) { Note = note; Count = count; }
    public Cassette Link(Cassette n) { next = n; return n; }

    /// Pure planning: no counts change. Backtracks when the rest of the chain cannot finish.
    public bool Plan(int amount, IDictionary<int, int> result) {
        for (int use = Math.Min(Count, amount / Note); use >= 0; use--) {
            int rest = amount - use * Note;
            if (rest == 0 || (next != null && next.Plan(rest, result))) {
                if (use > 0) result[Note] = use;
                return true;
            }
        }
        return false;
    }
    public void Commit(IDictionary<int, int> plan) {
        int n; if (plan.TryGetValue(Note, out n)) Count -= n;
        if (next != null) next.Commit(plan);
    }
}

class Dispenser {
    private readonly Cassette head;
    public Dispenser(Cassette head) { this.head = head; }

    /// Largest note first; null when the amount cannot be served.
    public SortedDictionary<int, int> Plan(int amount) {
        if (amount <= 0) return null;
        SortedDictionary<int, int> p = new SortedDictionary<int, int>(Comparer<int>.Create((x, y) => y.CompareTo(x)));
        return head.Plan(amount, p) ? p : null;
    }
    public void Dispense(IDictionary<int, int> plan) { head.Commit(plan); }

    static string Map(SortedDictionary<int, int> m) { return "{" + string.Join(", ", m.Select(kv => kv.Key + "=" + kv.Value)) + "}"; }
    static string Show(SortedDictionary<int, int> plan) { return plan == null ? "no plan" : "plan " + Map(plan); }

    static void Main() {
        Cassette c2000 = new Cassette(2000, 1);
        c2000.Link(new Cassette(500, 1)).Link(new Cassette(200, 3)).Link(new Cassette(100, 0));
        Dispenser d = new Dispenser(c2000);
        Console.WriteLine(Show(d.Plan(600)));      // plan {200=3}
        Console.WriteLine(Show(d.Plan(2700)));     // plan {2000=1, 500=1, 200=1}
        Console.WriteLine(Show(d.Plan(300)));      // no plan -> refuse before calling the bank
        Console.WriteLine(Show(d.Plan(0)));        // no plan -> nothing to dispense

        Cassette big = new Cassette(2000, 2);  // adding a Rs 50 cassette = one more Link()
        big.Link(new Cassette(500, 10)).Link(new Cassette(200, 10)).Link(new Cassette(100, 10)).Link(new Cassette(50, 4));
        Dispenser d2 = new Dispenser(big);
        SortedDictionary<int, int> p = d2.Plan(2750);
        d2.Dispense(p);
        Console.WriteLine(Map(p));                 // {2000=1, 500=1, 200=1, 50=1}
        Console.WriteLine(Show(d2.Plan(2750)));    // plan {2000=1, 500=1, 200=1, 50=1}: counts dropped, still enough
        d2.Dispense(d2.Plan(2750));
        Console.WriteLine(Show(d2.Plan(4950)));    // plan {500=8, 200=4, 100=1, 50=1}: the 2000s are gone
        Console.WriteLine(Show(d2.Plan(4975)));    // no plan: not a multiple of 50
    }
}` }
        ],
        complexity: `<p>Greedy-feasible cases run in O(D) (no backtracking). Worst case backtracking explores O(∏ counts) branches, but with 4–5 denominations, the descending order and early success it is tiny in practice; for guaranteed bounds use bounded-knapsack DP, O(D · A/100). Space O(D) recursion.</p>`,
        followUps: ['Prefer to keep ₹100 notes for small withdrawals: change the preference order without breaking correctness.', 'A cassette reports a fault mid-day: how does the chain skip it?', 'Customer asks for "₹2000 in ₹500 notes": how would you add a note-preference option?']
      }
    }]
  });

  /* ======================= TOPIC 6: PRODUCTION-GRADE STATE MACHINES ======================= */
  topics.push({
    title: 'Production-Grade State Machines: Table-Driven Engines, Thread-Safe Transitions, Persistence and Testing',
    analogy: `<p>Think of a <b>railway signal cabin</b>. Old cabins had big levers mechanically <b>interlocked</b>: you physically could not set two conflicting signals to green at the same time, no matter how fast two signalmen pulled. A state machine in production needs the same interlocking: when two threads (two customers, a phone app and a keypad, two servers) try to change the state at the same moment, only one may win, and the loser must see the new state — never a mix of both.</p>`,
    explain: `<p>Interview designs run on one thread in <code>main()</code>. Real ones do not. This topic turns your machine into something you could ship.</p>
<p><b>1. Make the machine data: a table-driven engine.</b> A generic <code>StateMachine&lt;S, E, C&gt;</code> holds rows <code>(from, event) → (to, guard, action)</code>. Elevator, vending machine and ATM each become a <b>configuration</b> of the same engine. Benefits: transitions can be printed as a diagram, validated at startup (every state reachable? any dead ends?), and tested cell by cell.</p>
${H.table(['from', 'event', 'guard', 'to', 'action'], [
  ['HAS_MONEY', 'SELECT', 'paid &amp;&amp; inStock &amp;&amp; changeOk', 'DISPENSING', 'reserve item + change'],
  ['DISPENSING', 'DROP_OK', '—', 'IDLE', 'commit stock + coins'],
  ['DISPENSING', 'DROP_TIMEOUT', 'retries &lt; 1', 'DISPENSING', 'retry motor'],
  ['DISPENSING', 'DROP_TIMEOUT', 'retries ≥ 1', 'IDLE', 'refund + mark slot faulty']
])}
<p><b>2. Make transitions atomic.</b> "Read state → check → write new state" is a <b>check-then-act race</b>. Two threads both read <i>qty = 1, state = IDLE</i>, both sell, and the machine sells one can twice. Three standard fixes:</p>
<ul>
<li><b>Lock</b> (<code>synchronized</code>/<code>ReentrantLock</code>, <code>threading.Lock</code>, <code>std::mutex</code>; JavaScript needs none on one thread) around the whole fire(): simple, correct, slightly slower under contention.</li>
<li><b>Compare-and-set</b> (<code>AtomicReference.compareAndSet(old, new)</code> in Java, <code>std::atomic</code> of a <code>shared_ptr</code> in C++; Python has no CAS primitive, so a tiny lock plays that role) on an immutable state snapshot: lock-free; the loser retries or fails.</li>
<li><b>Single-threaded event loop</b> (actor): all events go into a queue consumed by one thread — no shared mutation at all. Elevators and ATMs usually work this way.</li>
</ul>
<p><b>3. Persist state with a version.</b> Save <code>(id, state, version)</code>. Transition with <code>UPDATE … SET state = ?, version = version + 1 WHERE id = ? AND state = ? AND version = ?</code>. If 0 rows change, someone else won — reload and decide. This is the same CAS idea, at database level (<b>optimistic locking</b>).</p>
<p><b>4. Test every cell.</b> S states × E events = all behaviour. A parameterized test that walks the whole table catches the "—" cells (illegal events) that hand-written tests forget.</p>
<p><b>Brute force:</b> state as a mutable <code>String</code> field, transitions scattered over services, no locking ("it is rare"), no version column. It works in demos and fails on the first sale day when thousands of requests hit the same row.</p>`,
    clues: [
      '"Many users / devices may act at the same time" (app + kiosk, two ATMs on one account) → atomic transitions: lock, CAS or single-threaded loop.',
      '"State must survive restarts" → persist state + version; optimistic locking on transition.',
      '"Business wants to change the workflow without code changes" → table-driven / config-driven state machine.',
      '"Audit every change" → transition listeners (Observer) writing an append-only log; or event sourcing.',
      '"Make it testable" → pure transition function or table; exhaustive state × event tests.',
      'Words like <b>exactly once, double charge, sold twice, race</b> → the check-then-act problem.'
    ],
    code: [{ lang: 'java', title: 'Generic table-driven state machine: guards, actions, listeners, thread-safe fire()', code: `import java.util.*;
import java.util.function.*;

/** A reusable engine. S = state enum, E = event enum, C = context (the data the guards/actions use). */
final class StateMachine<S extends Enum<S>, E extends Enum<E>, C> {
    record Transition<S, C>(S to, Predicate<C> guard, Consumer<C> action) {}

    private final Map<S, Map<E, List<Transition<S, C>>>> table;
    private final List<BiConsumer<S, S>> listeners = new ArrayList<>();
    private S current;

    private StateMachine(S initial, Map<S, Map<E, List<Transition<S, C>>>> table) { this.current = initial; this.table = table; }

    /** Atomic: no other thread can observe or change state mid-transition. */
    synchronized boolean fire(E event, C ctx) {
        List<Transition<S, C>> options = table.getOrDefault(current, Map.of()).getOrDefault(event, List.of());
        for (Transition<S, C> t : options) {                  // first transition whose guard passes wins
            if (t.guard().test(ctx)) {
                S from = current;
                t.action().accept(ctx);                         // side effect while holding the lock
                current = t.to();
                listeners.forEach(l -> l.accept(from, t.to())); // Observer: audit log, metrics, UI
                return true;
            }
        }
        return false;                                           // illegal event or every guard failed
    }
    synchronized S state() { return current; }
    void onTransition(BiConsumer<S, S> l) { listeners.add(l); }

    static <S extends Enum<S>, E extends Enum<E>, C> Builder<S, E, C> builder(Class<S> states, S initial) { return new Builder<>(states, initial); }

    static final class Builder<S extends Enum<S>, E extends Enum<E>, C> {
        private final Map<S, Map<E, List<Transition<S, C>>>> table;
        private final S initial;
        Builder(Class<S> states, S initial) { this.table = new EnumMap<>(states); this.initial = initial; }
        Builder<S, E, C> permit(S from, E on, S to)  { return permit(from, on, to, c -> true, c -> {}); }
        Builder<S, E, C> permit(S from, E on, S to, Predicate<C> guard, Consumer<C> action) {
            table.computeIfAbsent(from, k -> new HashMap<>()).computeIfAbsent(on, k -> new ArrayList<>()).add(new Transition<>(to, guard, action));
            return this;
        }
        StateMachine<S, E, C> build() { return new StateMachine<>(initial, table); }
    }
}

enum VS { IDLE, HAS_MONEY, DISPENSING }
enum VE { COIN, SELECT, DROP_OK, CANCEL }

class Till { int balance; int stock = 1; final int price = 15; }

class EngineDemo {
    public static void main(String[] args) {
        StateMachine<VS, VE, Till> vm = StateMachine.<VS, VE, Till>builder(VS.class, VS.IDLE)
            .permit(VS.IDLE, VE.COIN, VS.HAS_MONEY, t -> true, t -> t.balance += 10)
            .permit(VS.HAS_MONEY, VE.COIN, VS.HAS_MONEY, t -> true, t -> t.balance += 10)
            .permit(VS.HAS_MONEY, VE.SELECT, VS.DISPENSING, t -> t.balance >= t.price && t.stock > 0, t -> t.stock--)
            .permit(VS.DISPENSING, VE.DROP_OK, VS.IDLE, t -> true, t -> t.balance = 0)
            .permit(VS.HAS_MONEY, VE.CANCEL, VS.IDLE, t -> true, t -> t.balance = 0)
            .build();
        vm.onTransition((a, b) -> System.out.println("audit: " + a + " -> " + b));
        Till till = new Till();
        System.out.println("select early: " + vm.fire(VE.SELECT, till));   // false: illegal in IDLE
        vm.fire(VE.COIN, till);
        System.out.println("select with 10: " + vm.fire(VE.SELECT, till)); // false: guard fails
        vm.fire(VE.COIN, till);
        vm.fire(VE.SELECT, till);
        vm.fire(VE.DROP_OK, till);
        System.out.println("final " + vm.state() + ", stock " + till.stock);
    }
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

import threading
from dataclasses import dataclass
from enum import Enum
from typing import Callable, Generic, TypeVar

S = TypeVar("S", bound=Enum)  # state enum
E = TypeVar("E", bound=Enum)  # event enum
C = TypeVar("C")  # context: the data the guards/actions use


@dataclass(frozen=True)
class Transition(Generic[S, C]):
    to: S
    guard: Callable[[C], bool]
    action: Callable[[C], None]


class StateMachine(Generic[S, E, C]):
    """A reusable engine. The table is data: (state, event) -> ordered list of guarded transitions."""

    def __init__(self, initial: S, table: dict[S, dict[E, list[Transition[S, C]]]]) -> None:
        self._current = initial
        self._table = table
        self._listeners: list[Callable[[S, S], None]] = []
        self._lock = threading.RLock()

    def fire(self, event: E, ctx: C) -> bool:
        """Atomic: no other thread can observe or change state mid-transition."""
        with self._lock:
            for t in self._table.get(self._current, {}).get(event, []):  # first transition whose guard passes wins
                if t.guard(ctx):
                    frm = self._current
                    t.action(ctx)  # side effect while holding the lock
                    self._current = t.to
                    for listener in self._listeners:  # Observer: audit log, metrics, UI
                        listener(frm, t.to)
                    return True
            return False  # illegal event or every guard failed

    @property
    def state(self) -> S:
        with self._lock:
            return self._current

    def on_transition(self, listener: Callable[[S, S], None]) -> None:
        self._listeners.append(listener)

    @staticmethod
    def builder(initial: S) -> "Builder[S, E, C]":
        return Builder(initial)


class Builder(Generic[S, E, C]):
    def __init__(self, initial: S) -> None:
        self._initial = initial
        self._table: dict[S, dict[E, list[Transition[S, C]]]] = {}

    def permit(self, frm: S, on: E, to: S,
               guard: Callable[[C], bool] = lambda c: True,
               action: Callable[[C], None] = lambda c: None) -> "Builder[S, E, C]":
        self._table.setdefault(frm, {}).setdefault(on, []).append(Transition(to, guard, action))
        return self

    def build(self) -> StateMachine[S, E, C]:
        return StateMachine(self._initial, self._table)


class VS(Enum):
    IDLE = 1
    HAS_MONEY = 2
    DISPENSING = 3


class VE(Enum):
    COIN = 1
    SELECT = 2
    DROP_OK = 3
    CANCEL = 4


class Till:
    def __init__(self) -> None:
        self.balance = 0
        self.stock = 1
        self.price = 15


def add_coin(t: Till) -> None: t.balance += 10
def take_one(t: Till) -> None: t.stock -= 1


def reset_balance(t: Till) -> None: t.balance = 0


if __name__ == "__main__":
    vm = (StateMachine.builder(VS.IDLE)
          .permit(VS.IDLE, VE.COIN, VS.HAS_MONEY, lambda t: True, add_coin)
          .permit(VS.HAS_MONEY, VE.COIN, VS.HAS_MONEY, lambda t: True, add_coin)
          .permit(VS.HAS_MONEY, VE.SELECT, VS.DISPENSING, lambda t: t.balance >= t.price and t.stock > 0, take_one)
          .permit(VS.DISPENSING, VE.DROP_OK, VS.IDLE, lambda t: True, reset_balance)
          .permit(VS.HAS_MONEY, VE.CANCEL, VS.IDLE, lambda t: True, reset_balance)
          .build())
    vm.on_transition(lambda a, b: print(f"audit: {a.name} -> {b.name}"))
    till = Till()
    print("select early:", str(vm.fire(VE.SELECT, till)).lower())  # false: illegal in IDLE
    vm.fire(VE.COIN, till)
    print("select with 10:", str(vm.fire(VE.SELECT, till)).lower())  # false: guard fails
    vm.fire(VE.COIN, till)
    vm.fire(VE.SELECT, till)
    vm.fire(VE.DROP_OK, till)
    print(f"final {vm.state.name}, stock {till.stock}")` },
          { lang: 'ts', code: `/** A reusable engine. S = state names, E = event names, C = context (the data the guards/actions use). */
interface Transition<S, C> {
  readonly to: S;
  readonly guard: (ctx: C) => boolean;
  readonly action: (ctx: C) => void;
}

class StateMachine<S extends string, E extends string, C> {
  private readonly listeners: Array<(from: S, to: S) => void> = [];

  constructor(private current: S, private readonly table: Map<S, Map<E, Transition<S, C>[]>>) {}

  /** One JS thread: a transition cannot be interrupted, so it is atomic by construction. */
  fire(event: E, ctx: C): boolean {
    const options = this.table.get(this.current)?.get(event) ?? [];
    for (const t of options) { // first transition whose guard passes wins
      if (t.guard(ctx)) {
        const from = this.current;
        t.action(ctx); // side effect
        this.current = t.to;
        this.listeners.forEach((l) => l(from, t.to)); // Observer: audit log, metrics, UI
        return true;
      }
    }
    return false; // illegal event or every guard failed
  }
  state(): S { return this.current; }
  onTransition(l: (from: S, to: S) => void): void { this.listeners.push(l); }

  static builder<S extends string, E extends string, C>(initial: S): Builder<S, E, C> {
    return new Builder<S, E, C>(initial);
  }
}

class Builder<S extends string, E extends string, C> {
  private readonly table = new Map<S, Map<E, Transition<S, C>[]>>();

  constructor(private readonly initial: S) {}

  permit(from: S, on: E, to: S, guard: (c: C) => boolean = () => true, action: (c: C) => void = () => {}): this {
    const row = this.table.get(from) ?? new Map<E, Transition<S, C>[]>();
    this.table.set(from, row);
    row.set(on, [...(row.get(on) ?? []), { to, guard, action }]);
    return this;
  }
  build(): StateMachine<S, E, C> { return new StateMachine(this.initial, this.table); }
}

type VS = "IDLE" | "HAS_MONEY" | "DISPENSING";
type VE = "COIN" | "SELECT" | "DROP_OK" | "CANCEL";

class Till { balance = 0; stock = 1; readonly price = 15; }

const vm = StateMachine.builder<VS, VE, Till>("IDLE")
  .permit("IDLE", "COIN", "HAS_MONEY", () => true, (t) => { t.balance += 10; })
  .permit("HAS_MONEY", "COIN", "HAS_MONEY", () => true, (t) => { t.balance += 10; })
  .permit("HAS_MONEY", "SELECT", "DISPENSING", (t) => t.balance >= t.price && t.stock > 0, (t) => { t.stock--; })
  .permit("DISPENSING", "DROP_OK", "IDLE", () => true, (t) => { t.balance = 0; })
  .permit("HAS_MONEY", "CANCEL", "IDLE", () => true, (t) => { t.balance = 0; })
  .build();
vm.onTransition((a, b) => console.log(\`audit: \${a} -> \${b}\`));
const till = new Till();
console.log("select early: " + vm.fire("SELECT", till)); // false: illegal in IDLE
vm.fire("COIN", till);
console.log("select with 10: " + vm.fire("SELECT", till)); // false: guard fails
vm.fire("COIN", till);
vm.fire("SELECT", till);
vm.fire("DROP_OK", till);
console.log(\`final \${vm.state()}, stock \${till.stock}\`);` },
          { lang: 'cpp', code: `// A reusable engine. S = state enum, E = event enum, C = context (the data the guards/actions use).
template <class S, class E, class C>
class StateMachine {
public:
    struct Transition {
        S to;
        function<bool(const C&)> guard;
        function<void(C&)> action;
    };
    using Table = map<S, map<E, vector<Transition>>>;

    class Builder {
        S initial_;
        Table table_;

    public:
        explicit Builder(S initial) : initial_(initial) {}
        Builder& permit(S from, E on, S to,
                        function<bool(const C&)> guard = [](const C&) { return true; },
                        function<void(C&)> action = [](C&) {}) {
            table_[from][on].push_back({to, move(guard), move(action)});
            return *this;
        }
        StateMachine build() { return StateMachine(initial_, move(table_)); }
    };

    static Builder builder(S initial) { return Builder(initial); }

    // Atomic: no other thread can observe or change state mid-transition.
    bool fire(E event, C& ctx) {
        lock_guard g(mu_);
        auto row = table_.find(current_);
        if (row == table_.end()) return false;
        auto options = row->second.find(event);
        if (options == row->second.end()) return false;
        for (const Transition& t : options->second) {  // first transition whose guard passes wins
            if (t.guard(ctx)) {
                S from = current_;
                t.action(ctx);  // side effect while holding the lock
                current_ = t.to;
                for (auto& l : listeners_) l(from, t.to);  // Observer: audit log, metrics, UI
                return true;
            }
        }
        return false;  // illegal event or every guard failed
    }
    S state() const { lock_guard g(mu_); return current_; }
    void onTransition(function<void(S, S)> l) { listeners_.push_back(move(l)); }

    StateMachine(S initial, Table table) : current_(initial), table_(move(table)) {}
    StateMachine(StateMachine&& o) : current_(o.current_), table_(move(o.table_)), listeners_(move(o.listeners_)) {}

private:
    mutable recursive_mutex mu_;
    S current_;
    Table table_;
    vector<function<void(S, S)>> listeners_;
};

enum class VS { IDLE, HAS_MONEY, DISPENSING };
enum class VE { COIN, SELECT, DROP_OK, CANCEL };

const char* name(VS s) {
    static const char* n[] = {"IDLE", "HAS_MONEY", "DISPENSING"};
    return n[static_cast<int>(s)];
}

struct Till {
    int balance = 0;
    int stock = 1;
    const int price = 15;
};

int main() {
    cout << boolalpha;
    using Vm = StateMachine<VS, VE, Till>;
    Vm vm = Vm::builder(VS::IDLE)
        .permit(VS::IDLE, VE::COIN, VS::HAS_MONEY, [](const Till&) { return true; }, [](Till& t) { t.balance += 10; })
        .permit(VS::HAS_MONEY, VE::COIN, VS::HAS_MONEY, [](const Till&) { return true; }, [](Till& t) { t.balance += 10; })
        .permit(VS::HAS_MONEY, VE::SELECT, VS::DISPENSING, [](const Till& t) { return t.balance >= t.price && t.stock > 0; }, [](Till& t) { t.stock--; })
        .permit(VS::DISPENSING, VE::DROP_OK, VS::IDLE, [](const Till&) { return true; }, [](Till& t) { t.balance = 0; })
        .permit(VS::HAS_MONEY, VE::CANCEL, VS::IDLE, [](const Till&) { return true; }, [](Till& t) { t.balance = 0; })
        .build();
    vm.onTransition([](VS a, VS b) { cout << "audit: " << name(a) << " -> " << name(b) << "\\n"; });
    Till till;
    cout << "select early: " << vm.fire(VE::SELECT, till) << "\\n";    // false: illegal in IDLE
    vm.fire(VE::COIN, till);
    cout << "select with 10: " << vm.fire(VE::SELECT, till) << "\\n";  // false: guard fails
    vm.fire(VE::COIN, till);
    vm.fire(VE::SELECT, till);
    vm.fire(VE::DROP_OK, till);
    cout << "final " << name(vm.state()) << ", stock " << till.stock << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

/// A reusable engine. S = state enum, E = event enum, C = context (the data the guards/actions use).
sealed class StateMachine<S, E, C> where S : struct where E : struct {
    public sealed class Transition {
        public readonly S To; public readonly Func<C, bool> Guard; public readonly Action<C> Action;
        public Transition(S to, Func<C, bool> guard, Action<C> action) { To = to; Guard = guard; Action = action; }
    }

    private readonly Dictionary<S, Dictionary<E, List<Transition>>> table;
    private readonly List<Action<S, S>> listeners = new List<Action<S, S>>();
    private readonly object gate = new object();
    private S current;

    private StateMachine(S initial, Dictionary<S, Dictionary<E, List<Transition>>> table) { current = initial; this.table = table; }

    /// Atomic: no other thread can observe or change state mid-transition.
    public bool Fire(E ev, C ctx) {
        lock (gate) {
            Dictionary<E, List<Transition>> row; List<Transition> options;
            if (!table.TryGetValue(current, out row) || !row.TryGetValue(ev, out options)) return false;
            foreach (Transition t in options) {                   // first transition whose guard passes wins
                if (t.Guard(ctx)) {
                    S from = current;
                    t.Action(ctx);                                  // side effect while holding the lock
                    current = t.To;
                    foreach (Action<S, S> l in listeners) l(from, t.To);   // Observer: audit log, metrics, UI
                    return true;
                }
            }
            return false;                                           // illegal event or every guard failed
        }
    }
    public S State() { lock (gate) return current; }
    public void OnTransition(Action<S, S> l) { listeners.Add(l); }

    public static Builder NewBuilder(S initial) { return new Builder(initial); }

    public sealed class Builder {
        private readonly Dictionary<S, Dictionary<E, List<Transition>>> table = new Dictionary<S, Dictionary<E, List<Transition>>>();
        private readonly S initial;
        public Builder(S initial) { this.initial = initial; }
        public Builder Permit(S from, E on, S to) { return Permit(from, on, to, c => true, c => { }); }
        public Builder Permit(S from, E on, S to, Func<C, bool> guard, Action<C> action) {
            Dictionary<E, List<Transition>> row;
            if (!table.TryGetValue(from, out row)) { row = new Dictionary<E, List<Transition>>(); table[from] = row; }
            List<Transition> list;
            if (!row.TryGetValue(on, out list)) { list = new List<Transition>(); row[on] = list; }
            list.Add(new Transition(to, guard, action));
            return this;
        }
        public StateMachine<S, E, C> Build() { return new StateMachine<S, E, C>(initial, table); }
    }
}

enum VS { IDLE, HAS_MONEY, DISPENSING }
enum VE { COIN, SELECT, DROP_OK, CANCEL }

class Till { public int Balance; public int Stock = 1; public readonly int Price = 15; }

class Program {
    static void Main() {
        StateMachine<VS, VE, Till> vm = StateMachine<VS, VE, Till>.NewBuilder(VS.IDLE)
            .Permit(VS.IDLE, VE.COIN, VS.HAS_MONEY, t => true, t => t.Balance += 10)
            .Permit(VS.HAS_MONEY, VE.COIN, VS.HAS_MONEY, t => true, t => t.Balance += 10)
            .Permit(VS.HAS_MONEY, VE.SELECT, VS.DISPENSING, t => t.Balance >= t.Price && t.Stock > 0, t => t.Stock--)
            .Permit(VS.DISPENSING, VE.DROP_OK, VS.IDLE, t => true, t => t.Balance = 0)
            .Permit(VS.HAS_MONEY, VE.CANCEL, VS.IDLE, t => true, t => t.Balance = 0)
            .Build();
        vm.OnTransition((a, b) => Console.WriteLine("audit: " + a + " -> " + b));
        Till till = new Till();
        Console.WriteLine("select early: " + vm.Fire(VE.SELECT, till).ToString().ToLower());   // false: illegal in IDLE
        vm.Fire(VE.COIN, till);
        Console.WriteLine("select with 10: " + vm.Fire(VE.SELECT, till).ToString().ToLower()); // false: guard fails
        vm.Fire(VE.COIN, till);
        vm.Fire(VE.SELECT, till);
        vm.Fire(VE.DROP_OK, till);
        Console.WriteLine("final " + vm.State() + ", stock " + till.Stock);
    }
}` }
        ] }, { lang: 'java', title: 'Lock-free transitions with an immutable snapshot + compareAndSet (and the race it prevents)', code: `import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/** Immutable snapshot: state + stock + version travel together, so they can never disagree. */
record Slot(String state, int stock, long version) {}

class LastCanMachine {
    private final AtomicReference<Slot> ref = new AtomicReference<>(new Slot("IDLE", 1, 0));

    /** Lock-free buy: read snapshot, compute next, publish only if nobody changed it meanwhile. */
    boolean buy() {
        while (true) {
            Slot cur = ref.get();
            if (cur.stock() == 0) return false;                       // guard on a consistent snapshot
            Slot next = new Slot(cur.stock() == 1 ? "SOLD_OUT" : "IDLE", cur.stock() - 1, cur.version() + 1);
            if (ref.compareAndSet(cur, next)) return true;            // we won the race
            // someone else transitioned first -> loop and re-check with fresh data
        }
    }
    Slot snapshot() { return ref.get(); }

    /** The broken version for comparison: check-then-act on plain fields. */
    static final class Unsafe {
        int stock = 1;
        boolean buy() {
            if (stock > 0) {                       // two threads can both pass this check...
                Thread.onSpinWait();
                stock--;                           // ...and both decrement: stock -1, two cans "sold"
                return true;
            }
            return false;
        }
    }

    public static void main(String[] args) throws Exception {
        LastCanMachine m = new LastCanMachine();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<Boolean>> results = new ArrayList<>();
        CountDownLatch go = new CountDownLatch(1);
        for (int i = 0; i < 8; i++) results.add(pool.submit(() -> { go.await(); return m.buy(); }));
        go.countDown();                            // release all 8 buyers at once
        int sold = 0;
        for (Future<Boolean> f : results) if (f.get()) sold++;
        pool.shutdown();
        System.out.println("CAS machine sold " + sold + " can(s); final " + m.snapshot());   // always exactly 1
    }
}`, alt: [
          { lang: 'python', code: `import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass


@dataclass(frozen=True, eq=False)  # eq=False: snapshots are compared by identity, like a reference CAS
class Slot:
    """Immutable snapshot: state + stock + version travel together, so they can never disagree."""
    state: str
    stock: int
    version: int

    def __str__(self) -> str:  # same look as a Java record
        return f"Slot[state={self.state}, stock={self.stock}, version={self.version}]"


class AtomicReference:
    """Python has no CAS primitive, so a tiny lock makes get/compare_and_set atomic."""

    def __init__(self, value: Slot) -> None:
        self._value = value
        self._lock = threading.Lock()

    def get(self) -> Slot:
        return self._value

    def compare_and_set(self, expect: Slot, update: Slot) -> bool:
        with self._lock:
            if self._value is not expect:
                return False
            self._value = update
            return True


class LastCanMachine:
    def __init__(self) -> None:
        self._ref = AtomicReference(Slot("IDLE", 1, 0))

    def buy(self) -> bool:
        """Optimistic buy: read snapshot, compute next, publish only if nobody changed it meanwhile."""
        while True:
            cur = self._ref.get()
            if cur.stock == 0:  # guard on a consistent snapshot
                return False
            nxt = Slot("SOLD_OUT" if cur.stock == 1 else "IDLE", cur.stock - 1, cur.version + 1)
            if self._ref.compare_and_set(cur, nxt):  # we won the race
                return True
            # someone else transitioned first -> loop and re-check with fresh data

    def snapshot(self) -> Slot:
        return self._ref.get()


class UnsafeMachine:
    """The broken version for comparison: check-then-act on plain fields."""

    def __init__(self) -> None:
        self.stock = 1

    def buy(self) -> bool:
        if self.stock > 0:  # two threads can both pass this check...
            self.stock -= 1  # ...and both decrement: stock -1, two cans "sold"
            return True
        return False


if __name__ == "__main__":
    m = LastCanMachine()
    go = threading.Event()

    def buyer() -> bool:
        go.wait()
        return m.buy()

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = [pool.submit(buyer) for _ in range(8)]
        go.set()  # release all 8 buyers at once
        sold = sum(f.result() for f in results)
    print(f"CAS machine sold {sold} can(s); final {m.snapshot()}")  # always exactly 1` },
          { lang: 'ts', code: `/** Immutable snapshot: state + stock + version travel together, so they can never disagree. */
class Slot {
  constructor(readonly state: string, readonly stock: number, readonly version: number) {}
  toString(): string { return \`Slot[state=\${this.state}, stock=\${this.stock}, version=\${this.version}]\`; }
}

// JavaScript has one thread, so compare-and-set cannot lose a race here;
// the loop is written the way it must be on a multi-threaded runtime.
class AtomicReference<T> {
  constructor(private value: T) {}
  get(): T { return this.value; }
  compareAndSet(expect: T, update: T): boolean {
    if (this.value !== expect) return false;
    this.value = update;
    return true;
  }
}

class LastCanMachine {
  private readonly ref = new AtomicReference(new Slot("IDLE", 1, 0));

  /** Optimistic buy: read snapshot, compute next, publish only if nobody changed it meanwhile. */
  buy(): boolean {
    for (;;) {
      const cur = this.ref.get();
      if (cur.stock === 0) return false; // guard on a consistent snapshot
      const next = new Slot(cur.stock === 1 ? "SOLD_OUT" : "IDLE", cur.stock - 1, cur.version + 1);
      if (this.ref.compareAndSet(cur, next)) return true; // we won the race
      // someone else transitioned first -> loop and re-check with fresh data
    }
  }
  snapshot(): Slot { return this.ref.get(); }
}

/** The broken version for comparison: check-then-act with an await between the check and the act. */
class UnsafeMachine {
  stock = 1;
  async buy(): Promise<boolean> {
    if (this.stock > 0) { // two callers can both pass this check...
      await Promise.resolve(); // ...because other work runs here...
      this.stock--; // ...and both decrement: stock -1, two cans "sold"
      return true;
    }
    return false;
  }
}

async function main(): Promise<void> {
  const m = new LastCanMachine();
  let open!: () => void;
  const go = new Promise<void>((resolve) => { open = resolve; });
  const results: Promise<boolean>[] = [];
  for (let i = 0; i < 8; i++) results.push(go.then(() => m.buy()));
  open(); // release all 8 buyers at once
  const sold = (await Promise.all(results)).filter(Boolean).length;
  console.log(\`CAS machine sold \${sold} can(s); final \${m.snapshot()}\`); // always exactly 1
}

main();` },
          { lang: 'cpp', code: `// Immutable snapshot: state + stock + version travel together, so they can never disagree.
struct Slot {
    string state;
    int stock;
    long long version;
    string toString() const {
        return "Slot[state=" + state + ", stock=" + to_string(stock) + ", version=" + to_string(version) + "]";
    }
};

class LastCanMachine {
    atomic<shared_ptr<const Slot>> ref_{make_shared<const Slot>(Slot{"IDLE", 1, 0})};

public:
    // Optimistic buy: read snapshot, compute next, publish only if nobody changed it meanwhile.
    bool buy() {
        for (;;) {
            shared_ptr<const Slot> cur = ref_.load();
            if (cur->stock == 0) return false;  // guard on a consistent snapshot
            auto next = make_shared<const Slot>(Slot{cur->stock == 1 ? "SOLD_OUT" : "IDLE", cur->stock - 1, cur->version + 1});
            if (ref_.compare_exchange_strong(cur, next)) return true;  // we won the race
            // someone else transitioned first -> loop and re-check with fresh data
        }
    }
    shared_ptr<const Slot> snapshot() const { return ref_.load(); }
};

// The broken version for comparison: check-then-act on plain fields.
struct UnsafeMachine {
    int stock = 1;
    bool buy() {
        if (stock > 0) {  // two threads can both pass this check...
            stock--;      // ...and both decrement: stock -1, two cans "sold" (a data race)
            return true;
        }
        return false;
    }
};

int main() {
    LastCanMachine m;
    latch go(1);
    atomic<int> sold = 0;
    vector<thread> pool;
    for (int i = 0; i < 8; i++) {
        pool.emplace_back([&] {
            go.wait();
            if (m.buy()) sold++;
        });
    }
    go.count_down();  // release all 8 buyers at once
    for (auto& t : pool) t.join();
    cout << "CAS machine sold " << sold << " can(s); final " << m.snapshot()->toString() << "\\n";  // always exactly 1
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Threading;

/// Immutable snapshot: state + stock + version travel together, so they can never disagree.
sealed class Slot {
    public readonly string State; public readonly int Stock; public readonly long Version;
    public Slot(string state, int stock, long version) { State = state; Stock = stock; Version = version; }
    public override string ToString() { return "Slot[state=" + State + ", stock=" + Stock + ", version=" + Version + "]"; }
}

class LastCanMachine {
    private Slot slot = new Slot("IDLE", 1, 0);              // swapped only with Interlocked.CompareExchange

    /// Lock-free buy: read snapshot, compute next, publish only if nobody changed it meanwhile.
    public bool Buy() {
        while (true) {
            Slot cur = Volatile.Read(ref slot);
            if (cur.Stock == 0) return false;                         // guard on a consistent snapshot
            Slot next = new Slot(cur.Stock == 1 ? "SOLD_OUT" : "IDLE", cur.Stock - 1, cur.Version + 1);
            if (Interlocked.CompareExchange(ref slot, next, cur) == cur) return true;   // we won the race
            // someone else transitioned first -> loop and re-check with fresh data
        }
    }
    public Slot Snapshot() { return Volatile.Read(ref slot); }

    /// The broken version for comparison: check-then-act on plain fields.
    public sealed class Unsafe {
        public int Stock = 1;
        public bool Buy() {
            if (Stock > 0) {                       // two threads can both pass this check...
                Thread.SpinWait(1);
                Stock--;                           // ...and both decrement: stock -1, two cans "sold"
                return true;
            }
            return false;
        }
    }

    static void Main() {
        LastCanMachine m = new LastCanMachine();
        ManualResetEventSlim go = new ManualResetEventSlim(false);
        bool[] results = new bool[8];
        List<Thread> pool = new List<Thread>();
        for (int i = 0; i < 8; i++) { int idx = i; Thread t = new Thread(() => { go.Wait(); results[idx] = m.Buy(); }); pool.Add(t); t.Start(); }
        go.Set();                                  // release all 8 buyers at once
        foreach (Thread t in pool) t.Join();
        int sold = 0;
        foreach (bool r in results) if (r) sold++;
        Console.WriteLine("CAS machine sold " + sold + " can(s); final " + m.Snapshot());   // always exactly 1
    }
}` }
        ] }],
    codeTitle: ['Generic FSM engine', 'CAS + immutable snapshot'],
    viz: {
      title: 'Race on the last can: two buyers, unsafe vs lock vs compare-and-set',
      input: 'mode=unsafe',
      inputLabel: 'mode = unsafe | lock | cas',
      gen: function (input) {
        var o = kvParse(input, 'Format: mode=unsafe (or lock, cas)');
        var mode = String(o.mode || 'unsafe').toLowerCase();
        if (['unsafe', 'lock', 'cas'].indexOf(mode) < 0) throw new Error('mode must be unsafe, lock or cas');
        var codes = {
          unsafe: 'boolean buy() {\n  if (stock > 0) {        // check\n    stock = stock - 1;    // act\n    return true;\n  }\n  return false;\n}',
          lock: 'synchronized boolean buy() {   // one thread at a time\n  if (stock > 0) {\n    stock = stock - 1;\n    return true;\n  }\n  return false;\n}',
          cas: 'boolean buy() {\n  Slot cur = ref.get();\n  if (cur.stock() == 0) return false;\n  Slot next = new Slot(.., cur.stock() - 1, cur.version() + 1);\n  return ref.compareAndSet(cur, next) || buy(); // lost? retry\n}'
        };
        var timeline = [], frames = [];
        var shared = { stock: 1, state: 'IDLE', version: 0, sold: 0 };
        function snap(narr, who, line, cls, sharedHl) {
          frames.push(F(narr, [
            CODE('Thread ' + (who || '-') + ' runs (' + mode + ')', codes[mode], line ? one(line, cls || 'cur') : {}, { unsafe: UNSAFE_ALT, lock: LOCK_ALT, cas: CAS_ALT }[mode]),
            TABLE('Interleaving timeline', ['step', 'Buyer A (keypad)', 'Buyer B (phone app)', 'shared memory'], timeline, timeline.length ? one(timeline.length - 1, cls === 'bad' ? 'bad' : cls === 'ok' ? 'ok' : 'cur') : {}),
            VARS('Shared vending slot (1 can left)', { stock: shared.stock, state: shared.state, version: shared.version, cansSold: shared.sold }, sharedHl || {})
          ]));
        }
        function row(a, b) { timeline.push([timeline.length + 1, a, b, 'stock=' + shared.stock + ', v' + shared.version]); }
        snap('One can of soda left. Buyer A presses the keypad and Buyer B taps "buy" in the phone app <b>at the same moment</b>. Each request runs on its own thread. Mode: <b>' + mode + '</b>.', null, null, null);
        if (mode === 'unsafe') {
          row('reads stock = 1 → check passes', ''); snap('A: <code>if (stock &gt; 0)</code> reads <b>1</b> → passes. Before A writes, the scheduler pauses A.', 'A', 2, 'cur');
          row('', 'reads stock = 1 → check passes'); snap('B: <code>if (stock &gt; 0)</code> also reads <b>1</b> (A has not written yet) → passes. Both threads now believe they own the last can.', 'B', 2, 'bad');
          shared.stock = 0; shared.sold = 1; shared.state = 'SOLD_OUT'; row('writes stock = 0, drops can', ''); snap('A: <code>stock = 1 − 1 = 0</code>, motor drops the can. Fine so far.', 'A', 3, 'cur', { stock: 'cur' });
          shared.stock = -1; shared.sold = 2; row('', 'writes stock = 0 (or −1), charges card'); snap('B: computes <code>stock − 1</code> from <b>its stale read</b> → writes again, charges B\'s card and tells B "enjoy your drink". <span class="c-r">Two sales, one can.</span> Stock is now wrong and B was charged for nothing.', 'B', 3, 'bad', { stock: 'bad', cansSold: 'bad' });
          snap('This is the <b>check-then-act</b> race. It never shows up in a single-threaded demo, which is why interviewers ask "what if two people buy at once?". Rerun with <code>mode=lock</code> or <code>mode=cas</code>.', null, null, 'bad', { cansSold: 'bad' });
        } else if (mode === 'lock') {
          row('acquires lock', 'waits for lock…'); snap('A enters the guarded method first and takes the lock (<code>synchronized</code>, <code>with lock</code>, <code>lock_guard</code>). B blocks at the door.', 'A', 1, 'cur');
          row('reads stock = 1 → passes', 'waiting'); snap('A checks stock = 1 → passes. B cannot read anything yet.', 'A', 2, 'cur');
          shared.stock = 0; shared.sold = 1; shared.state = 'SOLD_OUT'; shared.version = 1;
          row('writes stock = 0, releases lock', 'waiting'); snap('A writes stock = 0, state SOLD_OUT, releases the lock. The check and the act happened as one indivisible step.', 'A', 3, 'ok', { stock: 'ok' });
          row('', 'acquires lock, reads stock = 0'); snap('B finally gets the lock and reads the <b>fresh</b> value 0 → check fails.', 'B', 2, 'bad');
          row('', 'returns false → "sold out"'); snap('B returns false and the app shows "Sold out — you were not charged". Exactly one sale.', 'B', 6, 'ok', { cansSold: 'ok' });
          snap('Locks are the simplest correct answer. Cost: threads wait in line. For a vending slot or an elevator car that is perfectly fine; for very hot shared state consider CAS or a single-threaded event loop.', null, null, 'ok');
        } else {
          row('reads snapshot (stock 1, v0)', ''); snap('A reads the immutable snapshot <b>(stock 1, v0)</b>.', 'A', 2, 'cur');
          row('', 'reads snapshot (stock 1, v0)'); snap('B also reads <b>(stock 1, v0)</b>. No locks — both are allowed to try.', 'B', 2, 'cur');
          row('builds (stock 0, v1)', 'builds (stock 0, v1)'); snap('Both build a new snapshot (stock 0, SOLD_OUT, v1) privately. Nothing shared has changed yet.', 'A', 4, 'cur');
          shared.stock = 0; shared.sold = 1; shared.state = 'SOLD_OUT'; shared.version = 1;
          row('CAS(v0 → v1) succeeds', ''); snap('A calls <code>compareAndSet(cur, next)</code>: the reference still points to v0, so the swap <b>succeeds</b> atomically. A drops the can.', 'A', 5, 'ok', { version: 'ok', stock: 'ok' });
          row('', 'CAS(v0 → v1) FAILS'); snap('B calls <code>compareAndSet(cur, next)</code> with its old v0 — but the current snapshot is now v1. <b>CAS fails</b>; B\'s change is never published.', 'B', 5, 'bad');
          row('', 'retries: reads (stock 0, v1) → false'); snap('B retries with fresh data: stock 0 → returns false, "Sold out". Exactly one sale, no locks held.', 'B', 3, 'ok', { cansSold: 'ok' });
          snap('The same idea in a database is <b>optimistic locking</b>: <code>UPDATE slot SET stock = 0, version = 1 WHERE id = 7 AND version = 0</code> → the loser updates 0 rows and retries or reports failure.', null, null, 'ok');
        }
        return frames;
      }
    },
    examples: [
      { title: 'Optimistic locking in SQL for a persisted ride/order state', html: `<p>Two servers receive "driver arrived" and "rider cancelled" for ride 77 at the same time. Each runs: <code>UPDATE ride SET status = ?, version = version + 1 WHERE id = 77 AND status = 'ASSIGNED' AND version = 4</code>. The first commits (1 row). The second updates <b>0 rows</b>, reloads (status now ARRIVED or CANCELLED) and re-applies its event to the <i>new</i> state — maybe the cancel now costs ₹50, maybe it is rejected. The state machine runs again on fresh data; it never overwrites.</p>` },
      { title: 'Exhaustive table test (no framework needed)', html: `<p>Walk every (state, event) cell and compare with an expected table. 3 states × 4 events = 12 assertions, including all the rejections.</p>`, code: { lang: 'java', code: `import java.util.*;
class TableTest {
    enum S { IDLE, HAS_MONEY, DISPENSING }
    enum E { COIN, SELECT, DROP_OK, CANCEL }
    static S next(S s, E e) {                       // the machine under test (pure function)
        return switch (s) {
            case IDLE -> e == E.COIN ? S.HAS_MONEY : s;
            case HAS_MONEY -> switch (e) { case COIN -> S.HAS_MONEY; case SELECT -> S.DISPENSING; case CANCEL -> S.IDLE; default -> s; };
            case DISPENSING -> e == E.DROP_OK ? S.IDLE : s;
        };
    }
    public static void main(String[] args) {
        S[][] expected = {
            { S.HAS_MONEY, S.IDLE, S.IDLE, S.IDLE },                       // IDLE
            { S.HAS_MONEY, S.DISPENSING, S.HAS_MONEY, S.IDLE },            // HAS_MONEY
            { S.DISPENSING, S.DISPENSING, S.IDLE, S.DISPENSING }           // DISPENSING
        };
        int fails = 0;
        for (S s : S.values()) for (E e : E.values()) {
            S got = next(s, e), want = expected[s.ordinal()][e.ordinal()];
            if (got != want) { fails++; System.out.println("FAIL " + s + " + " + e + " -> " + got + ", want " + want); }
        }
        System.out.println(fails == 0 ? "all 12 cells pass" : fails + " failures");
    }
}`, alt: [
          { lang: 'python', code: `from enum import Enum


class S(Enum):
    IDLE = 0
    HAS_MONEY = 1
    DISPENSING = 2


class E(Enum):
    COIN = 0
    SELECT = 1
    DROP_OK = 2
    CANCEL = 3


def next_state(s: S, e: E) -> S:
    """The machine under test (pure function)."""
    match s, e:
        case S.IDLE, E.COIN: return S.HAS_MONEY
        case S.HAS_MONEY, E.COIN: return S.HAS_MONEY
        case S.HAS_MONEY, E.SELECT: return S.DISPENSING
        case S.HAS_MONEY, E.CANCEL: return S.IDLE
        case S.DISPENSING, E.DROP_OK: return S.IDLE
        case _: return s


if __name__ == "__main__":
    expected = [
        [S.HAS_MONEY, S.IDLE, S.IDLE, S.IDLE],  # IDLE
        [S.HAS_MONEY, S.DISPENSING, S.HAS_MONEY, S.IDLE],  # HAS_MONEY
        [S.DISPENSING, S.DISPENSING, S.IDLE, S.DISPENSING],  # DISPENSING
    ]
    fails = 0
    for s in S:
        for e in E:
            got, want = next_state(s, e), expected[s.value][e.value]
            if got is not want:
                fails += 1
                print(f"FAIL {s.name} + {e.name} -> {got.name}, want {want.name}")
    print("all 12 cells pass" if fails == 0 else f"{fails} failures")` },
          { lang: 'ts', code: `const STATES = ["IDLE", "HAS_MONEY", "DISPENSING"] as const;
const EVENTS = ["COIN", "SELECT", "DROP_OK", "CANCEL"] as const;
type S = (typeof STATES)[number];
type E = (typeof EVENTS)[number];

/** The machine under test (pure function). */
function next(s: S, e: E): S {
  switch (s) {
    case "IDLE": return e === "COIN" ? "HAS_MONEY" : s;
    case "HAS_MONEY":
      switch (e) {
        case "COIN": return "HAS_MONEY";
        case "SELECT": return "DISPENSING";
        case "CANCEL": return "IDLE";
        default: return s;
      }
    case "DISPENSING": return e === "DROP_OK" ? "IDLE" : s;
  }
}

const expected: S[][] = [
  ["HAS_MONEY", "IDLE", "IDLE", "IDLE"], // IDLE
  ["HAS_MONEY", "DISPENSING", "HAS_MONEY", "IDLE"], // HAS_MONEY
  ["DISPENSING", "DISPENSING", "IDLE", "DISPENSING"], // DISPENSING
];
let fails = 0;
STATES.forEach((s, i) => EVENTS.forEach((e, j) => {
  const got = next(s, e), want = expected[i][j];
  if (got !== want) { fails++; console.log(\`FAIL \${s} + \${e} -> \${got}, want \${want}\`); }
}));
console.log(fails === 0 ? "all 12 cells pass" : \`\${fails} failures\`);` },
          { lang: 'cpp', code: `enum class S { IDLE, HAS_MONEY, DISPENSING };
enum class E { COIN, SELECT, DROP_OK, CANCEL };

const char* name(S s) {
    static const char* n[] = {"IDLE", "HAS_MONEY", "DISPENSING"};
    return n[static_cast<int>(s)];
}
const char* name(E e) {
    static const char* n[] = {"COIN", "SELECT", "DROP_OK", "CANCEL"};
    return n[static_cast<int>(e)];
}

// The machine under test (pure function).
S next(S s, E e) {
    switch (s) {
        case S::IDLE: return e == E::COIN ? S::HAS_MONEY : s;
        case S::HAS_MONEY:
            switch (e) {
                case E::COIN: return S::HAS_MONEY;
                case E::SELECT: return S::DISPENSING;
                case E::CANCEL: return S::IDLE;
                default: return s;
            }
        case S::DISPENSING: return e == E::DROP_OK ? S::IDLE : s;
    }
    return s;
}

int main() {
    const S expected[3][4] = {
        {S::HAS_MONEY, S::IDLE, S::IDLE, S::IDLE},                       // IDLE
        {S::HAS_MONEY, S::DISPENSING, S::HAS_MONEY, S::IDLE},            // HAS_MONEY
        {S::DISPENSING, S::DISPENSING, S::IDLE, S::DISPENSING},          // DISPENSING
    };
    int fails = 0;
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 4; j++) {
            S s = static_cast<S>(i);
            E e = static_cast<E>(j);
            S got = next(s, e), want = expected[i][j];
            if (got != want) {
                fails++;
                cout << "FAIL " << name(s) << " + " << name(e) << " -> " << name(got) << ", want " << name(want) << "\\n";
            }
        }
    }
    cout << (fails == 0 ? "all 12 cells pass" : to_string(fails) + " failures") << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
class TableTest {
    enum S { IDLE, HAS_MONEY, DISPENSING }
    enum E { COIN, SELECT, DROP_OK, CANCEL }
    static S Next(S s, E e) {                       // the machine under test (pure function)
        switch (s) {
            case S.IDLE: return e == E.COIN ? S.HAS_MONEY : s;
            case S.HAS_MONEY:
                switch (e) { case E.COIN: return S.HAS_MONEY; case E.SELECT: return S.DISPENSING; case E.CANCEL: return S.IDLE; default: return s; }
            default: return e == E.DROP_OK ? S.IDLE : s;
        }
    }
    static void Main() {
        S[][] expected = {
            new[] { S.HAS_MONEY, S.IDLE, S.IDLE, S.IDLE },                       // IDLE
            new[] { S.HAS_MONEY, S.DISPENSING, S.HAS_MONEY, S.IDLE },            // HAS_MONEY
            new[] { S.DISPENSING, S.DISPENSING, S.IDLE, S.DISPENSING }           // DISPENSING
        };
        int fails = 0;
        foreach (S s in Enum.GetValues(typeof(S))) foreach (E e in Enum.GetValues(typeof(E))) {
            S got = Next(s, e), want = expected[(int)s][(int)e];
            if (got != want) { fails++; Console.WriteLine("FAIL " + s + " + " + e + " -> " + got + ", want " + want); }
        }
        Console.WriteLine(fails == 0 ? "all 12 cells pass" : fails + " failures");
    }
}` }
        ] } },
      { title: 'Single-threaded event loop for an elevator car', html: `<p>Buttons, sensors and the dispatcher run on different threads, but they only <b>post</b> events. One thread per car takes events from a thread-safe queue (<code>BlockingQueue</code>, <code>queue.Queue</code>, a mutex plus condition variable) and feeds them to the state machine. No locks inside the machine, and events are processed in a clear order — this is the actor model (Akka, Erlang, Go channels).</p>`, code: { lang: 'java', code: `import java.util.concurrent.*;
class CarLoop implements Runnable {
    private final BlockingQueue<String> inbox = new LinkedBlockingQueue<>();
    private volatile boolean running = true;
    private String state = "IDLE";
    void post(String event) { inbox.add(event); }            // safe to call from any thread
    public void run() {
        while (running) {
            try {
                String e = inbox.poll(100, TimeUnit.MILLISECONDS);
                if (e == null) continue;
                if (e.equals("STOP")) { running = false; continue; }
                state = state.equals("IDLE") && e.startsWith("CALL") ? "MOVING" : state;   // only this thread writes state
            } catch (InterruptedException ex) { Thread.currentThread().interrupt(); return; }
        }
    }
}`, alt: [
          { lang: 'python', code: `import queue
import threading


class CarLoop:
    def __init__(self) -> None:
        self._inbox: "queue.Queue[str]" = queue.Queue()
        self._running = True
        self._state = "IDLE"

    def post(self, event: str) -> None:
        self._inbox.put(event)  # safe to call from any thread

    def run(self) -> None:
        while self._running:
            try:
                e = self._inbox.get(timeout=0.1)
            except queue.Empty:
                continue
            if e == "STOP":
                self._running = False
                continue
            if self._state == "IDLE" and e.startswith("CALL"):  # only this thread writes state
                self._state = "MOVING"

    def start(self) -> threading.Thread:
        t = threading.Thread(target=self.run)
        t.start()
        return t` },
          { lang: 'ts', code: `// One JS thread already gives "only one writer at a time"; the inbox keeps events in order
// and the drain runs after the current call stack finishes, like a single-threaded event loop.
class CarLoop {
  private readonly inbox: string[] = [];
  private running = true;
  private state = "IDLE";
  private draining = false;

  post(event: string): void { // safe to call from any callback
    this.inbox.push(event);
    if (!this.draining) {
      this.draining = true;
      void Promise.resolve().then(() => this.drain());
    }
  }

  private drain(): void {
    for (let e = this.inbox.shift(); e !== undefined && this.running; e = this.inbox.shift()) {
      if (e === "STOP") { this.running = false; continue; }
      this.state = this.state === "IDLE" && e.startsWith("CALL") ? "MOVING" : this.state;
    }
    this.draining = false;
  }

  current(): string { return this.state; }
}` },
          { lang: 'cpp', code: `class CarLoop {
    queue<string> inbox_;
    mutex mu_;
    condition_variable cv_;
    bool running_ = true;
    string state_ = "IDLE";

public:
    void post(const string& event) {  // safe to call from any thread
        {
            lock_guard lock(mu_);
            inbox_.push(event);
        }
        cv_.notify_one();
    }

    void run() {
        while (true) {
            string e;
            {
                unique_lock lock(mu_);
                if (!cv_.wait_for(lock, chrono::milliseconds(100), [&] { return !inbox_.empty(); })) {
                    if (!running_) return;
                    continue;
                }
                e = move(inbox_.front());
                inbox_.pop();
            }
            if (e == "STOP") { running_ = false; return; }
            if (state_ == "IDLE" && e.rfind("CALL", 0) == 0) state_ = "MOVING";  // only this thread writes state
        }
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Threading;
class CarLoop {
    private readonly BlockingCollection<string> inbox = new BlockingCollection<string>();
    private volatile bool running = true;
    private string state = "IDLE";
    public void Post(string ev) { inbox.Add(ev); }           // safe to call from any thread
    public void Run() {
        while (running) {
            string e;
            if (!inbox.TryTake(out e, 100)) continue;        // poll with a 100 ms timeout
            if (e == "STOP") { running = false; continue; }
            state = state == "IDLE" && e.StartsWith("CALL") ? "MOVING" : state;   // only this thread writes state
        }
    }
}` }
        ] } },
      { title: 'Validating the table at startup', html: `<p>With transitions as data you can check the design itself: every state reachable from the start (BFS over the table), every non-terminal state has an exit, no (state, event) pair has two guards that can both be true. Run these checks in a unit test so a bad config never ships. Tools like Spring Statemachine, XState and AWS Step Functions do exactly this kind of validation.</p>` }
    ],
    deepDive: `<p><b>Where do side effects go?</b> Actions that talk to the outside world (charge a card, drop a can, call the bank) are the hard part. Pattern: transition to an <i>intermediate</i> state first (DISPENSING, AUTHORIZING), persist it, then perform the side effect, then fire a completion event (DROP_OK / AUTH_OK / TIMEOUT). After a crash you can see "stuck in DISPENSING since 10:02" and recover. Doing the side effect inside a lock and then failing to persist leaves the world and your state disagreeing.</p>
<p><b>Transactional outbox.</b> When a transition must also notify other services ("order PAID"), write the new state and an outbox event row in the <b>same database transaction</b>; a relay publishes outbox rows to Kafka. Never "update DB, then publish" separately — one can succeed without the other.</p>
<p><b>Event sourcing.</b> Instead of storing the current state, store the list of events (COIN 10, COIN 5, SELECT A1, DROP_OK). Current state = replay through the pure transition function. You get a full audit trail and time travel for debugging; the cost is replay time (fixed with snapshots) and schema evolution of events.</p>
<p><b>Lock granularity.</b> Lock per machine/car/account, never one global lock. For a bank, the lock is the account row; for an elevator system, each car has its own loop and the dispatcher only posts events. Holding a lock while doing slow I/O (bank call) blocks every other request for that object — prefer the intermediate-state pattern above.</p>
<p><b>CAS pitfalls.</b> CAS on a <i>mutable</i> object is useless (the reference does not change when fields do) — snapshots must be immutable (records). Under heavy contention CAS loops spin; add backoff or fall back to a lock. And the classic ABA problem (state goes A → B → A between your read and CAS) is solved by the <b>version</b> field.</p>
<p><b>Hierarchical and parallel states.</b> UML statecharts (Harel, 1987) add nesting (EMERGENCY overrides all OPERATIONAL sub-states), history states (resume where you left off) and orthogonal regions (the door and the motor as parallel sub-machines). Use them when the flat table explodes (S × E grows too big), not before.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating a state machine engine is now trivial; making it <b>correct under concurrency</b> is not. AI-generated code frequently has check-then-act races, mutates objects inside an atomic reference, or holds locks across network calls. Treat every AI-written transition as suspicious until you can point at the line that makes it atomic.</p>
<p><b>Use AI as a partner:</b> <code>Write a multi-threaded stress test (a thread pool and a start latch) that fires SELECT from 50 threads at a machine with stock 1 and asserts exactly one success, repeated 10,000 times.</code> AI is excellent at writing these harnesses. Also: <code>Given this transition table, generate a Mermaid stateDiagram and list unreachable states.</code></p>
<p><b>Agents and workflows:</b> durable-execution platforms (Temporal, AWS Step Functions, LangGraph with checkpointing) are production state machines: persisted state, retries, timeouts, compensation. AI agents built on them inherit these guarantees — and the same rules apply: idempotent steps, explicit terminal states, versioned state.</p>
<p><b>What you must still own:</b> choosing lock vs CAS vs event loop, placing side effects safely, and proving "exactly one winner" — the reasoning an interviewer is actually testing.</p>`,
    problems: [{
      title: 'Thread-Safe Seat/Slot State Machine with Optimistic Versioning', level: 'Hard', tags: ['concurrency', 'cas', 'state machine', 'optimistic locking'], companies: ['Uber', 'Amazon', 'BookMyShow', 'Stripe'],
      statement: `<p>A resource (a vending slot, a cinema seat, a parking spot) moves through states <b>AVAILABLE → HELD → SOLD</b>, with <b>HELD → AVAILABLE</b> on <code>release()</code> or hold expiry. Many threads call <code>hold(user)</code>, <code>confirm(user)</code> and <code>release(user)</code> concurrently. Guarantee: at most one user ever holds/buys it; only the holder may confirm or release; an expired hold can be taken by someone else. Implement it lock-free with an immutable snapshot and <code>compareAndSet</code>, and expose the version for database-style optimistic locking.</p>`,
      constraints: `Up to 10<sup>4</sup> concurrent callers. Hold expires after <code>ttlMillis</code>. No locks in the solution. Time is passed in (for testability).`,
      example: `<p>50 threads call <code>hold</code> at once → ${H.c('g', 'exactly 1 returns true')}, 49 false. Holder confirms → SOLD. A non-holder calling confirm → ${H.c('r', 'false')}. If the holder waits past the TTL, ${H.c('b', 'another user’s hold succeeds')} because the expired HELD counts as AVAILABLE.</p>`,
      brute: { why: `<p>Plain fields with if-checks: <code>if (state == AVAILABLE) { state = HELD; holder = user; }</code>. Two threads pass the check together, and the second overwrites the holder — both users think they hold the seat. Also <code>state</code> and <code>holder</code> are written separately, so a reader can see HELD with the old holder (torn state).</p>`, code: { lang: 'java', code: `class RacySeat {
    String state = "AVAILABLE", holder = null;
    boolean hold(String user) {
        if (state.equals("AVAILABLE")) {       // check
            state = "HELD";                     // act (not atomic with the check)
            holder = user;                      // second field: readers can see a torn mix
            return true;
        }
        return false;
    }
}`, alt: [{ lang: 'python', code: "class RacySeat:\n    def __init__(self):\n        self.state, self.holder = \"AVAILABLE\", None\n\n    def hold(self, user):\n        if self.state == \"AVAILABLE\":       # check\n            self.state = \"HELD\"             # act (not atomic with the check)\n            self.holder = user              # second field: readers can see a torn mix\n            return True\n        return False\n" }, { lang: 'ts', code: "class RacySeat {\n  state = \"AVAILABLE\";\n  holder: string | null = null;\n  hold(user: string): boolean {\n    if (this.state === \"AVAILABLE\") {       // check\n      this.state = \"HELD\";                  // act (not atomic with the check)\n      this.holder = user;                   // second field: readers can see a torn mix\n      return true;\n    }\n    return false;\n  }\n}\n" }, { lang: 'cpp', code: "class RacySeat {\npublic:\n    string state = \"AVAILABLE\", holder;\n    bool hold(const string& user) {\n        if (state == \"AVAILABLE\") {         // check\n            state = \"HELD\";                 // act (not atomic with the check)\n            holder = user;                  // second field: readers can see a torn mix\n            return true;\n        }\n        return false;\n    }\n};\n" }, { lang: 'csharp', code: "class RacySeat {\n    public string State = \"AVAILABLE\", Holder = null;\n    public bool Hold(string user) {\n        if (State == \"AVAILABLE\") {            // check\n            State = \"HELD\";                     // act (not atomic with the check)\n            Holder = user;                      // second field: readers can see a torn mix\n            return true;\n        }\n        return false;\n    }\n}\n" }] } },
      mcq: { q: 'Why must the snapshot passed to compareAndSet be immutable?', options: ['CAS compares references; if you mutate fields in place, the reference never changes and conflicting updates are not detected', 'Immutable objects are faster to allocate', 'A compare-and-set reference only accepts records', 'To avoid garbage collection'], answer: 0, explain: 'compareAndSet checks reference identity. Each transition must publish a new object so a concurrent change is visible as a different reference.' },
      hints: [`<p>Hint 1: Put <b>everything</b> that must be consistent (state, holder, expiry, version) into one immutable snapshot object (a record in Java). A transition = build a new snapshot from the old one.</p>`, `<p>Hint 2: Loop: <code>cur = ref.get()</code>; compute the "effective" state (HELD but expired counts as AVAILABLE); check the guard; build <code>next</code> with <code>version + 1</code>; <code>if (ref.compareAndSet(cur, next)) return true;</code> else retry.</p>`, `<p>Hint 3: Guards: hold needs effective AVAILABLE; confirm/release need state HELD, same holder and not expired. Return false (no retry) when the guard fails on a fresh snapshot. Pass <code>now</code> as a parameter so tests can control time.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "winners=1 state=HELD v1\nholder is a contender: true\nstranger confirm: false\nconfirm after expiry: false\nafter expiry, u_late holds: true\nu_late confirms: true -> SOLD\nhold after sold: false\nrelease after sold: false\n" }] },
      solution: {
        approach: `<p>Model the whole slot as an immutable snapshot <code>Snap(state, holder, expiresAt, version)</code> (a record in Java) held in an atomic reference (<code>AtomicReference</code> in Java). Each operation is a CAS loop: read, evaluate the guard on that consistent snapshot (treating an expired hold as available), build the next snapshot with version + 1, and publish with <code>compareAndSet</code>. Exactly one competing thread can publish from a given snapshot; losers re-read and re-evaluate. The version doubles as the optimistic-lock column when persisting.</p>`,
        code: `import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

enum SeatState { AVAILABLE, HELD, SOLD }

record Snap(SeatState state, String holder, long expiresAt, long version) {
    boolean heldBy(String u, long now) { return state == SeatState.HELD && holder.equals(u) && now < expiresAt; }
    boolean effectivelyAvailable(long now) {
        return state == SeatState.AVAILABLE || (state == SeatState.HELD && now >= expiresAt);   // expired hold
    }
}

class SeatMachine {
    private final AtomicReference<Snap> ref = new AtomicReference<>(new Snap(SeatState.AVAILABLE, null, 0, 0));
    private final long ttlMillis;
    SeatMachine(long ttlMillis) { this.ttlMillis = ttlMillis; }

    boolean hold(String user, long now) {
        while (true) {
            Snap cur = ref.get();
            if (!cur.effectivelyAvailable(now)) return false;                       // guard on a fresh snapshot
            Snap next = new Snap(SeatState.HELD, user, now + ttlMillis, cur.version() + 1);
            if (ref.compareAndSet(cur, next)) return true;                          // exactly one winner
        }
    }
    boolean confirm(String user, long now) {
        while (true) {
            Snap cur = ref.get();
            if (!cur.heldBy(user, now)) return false;                               // only the live holder
            Snap next = new Snap(SeatState.SOLD, user, 0, cur.version() + 1);
            if (ref.compareAndSet(cur, next)) return true;
        }
    }
    boolean release(String user, long now) {
        while (true) {
            Snap cur = ref.get();
            if (!cur.heldBy(user, now)) return false;
            Snap next = new Snap(SeatState.AVAILABLE, null, 0, cur.version() + 1);
            if (ref.compareAndSet(cur, next)) return true;
        }
    }
    Snap snapshot() { return ref.get(); }

    public static void main(String[] args) throws Exception {
        SeatMachine seat = new SeatMachine(5_000);
        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Boolean>> fs = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            String user = "u" + i;
            fs.add(pool.submit(() -> { go.await(); return seat.hold(user, 1_000); }));
        }
        go.countDown();
        int winners = 0;
        for (Future<Boolean> f : fs) if (f.get()) winners++;
        pool.shutdown();
        Snap s = seat.snapshot();
        System.out.println("winners=" + winners + " state=" + s.state() + " v" + s.version());   // winners=1 (holder varies per run)
        System.out.println("holder is a contender: " + s.holder().startsWith("u"));
        System.out.println("stranger confirm: " + seat.confirm("nobody", 2_000));                   // false
        System.out.println("confirm after expiry: " + seat.confirm(s.holder(), 6_000));             // false: hold expired at 6000
        System.out.println("after expiry, u_late holds: " + seat.hold("u_late", 7_000));            // true
        System.out.println("u_late confirms: " + seat.confirm("u_late", 7_500) + " -> " + seat.snapshot().state());
        System.out.println("hold after sold: " + seat.hold("u_other", 8_000));                      // false
        System.out.println("release after sold: " + seat.release("u_late", 8_000));                 // false
    }
}`, alt: [
          { lang: 'python', code: `import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from enum import Enum
from typing import Generic, Optional, TypeVar


class SeatState(Enum):
    AVAILABLE = 1
    HELD = 2
    SOLD = 3


@dataclass(frozen=True, eq=False)  # eq=False: compare snapshots by identity, like a Java record reference
class Snap:
    state: SeatState
    holder: Optional[str]
    expires_at: int
    version: int

    def held_by(self, u: str, now: int) -> bool:
        return self.state is SeatState.HELD and self.holder == u and now < self.expires_at

    def effectively_available(self, now: int) -> bool:
        # an expired hold counts as available
        return self.state is SeatState.AVAILABLE or (self.state is SeatState.HELD and now >= self.expires_at)


T = TypeVar("T")


class AtomicReference(Generic[T]):
    """Python has no CAS primitive, so a tiny lock makes get/compare_and_set atomic."""

    def __init__(self, value: T) -> None:
        self._value = value
        self._lock = threading.Lock()

    def get(self) -> T:
        return self._value

    def compare_and_set(self, expect: T, update: T) -> bool:
        with self._lock:
            if self._value is not expect:
                return False
            self._value = update
            return True


class SeatMachine:
    def __init__(self, ttl_millis: int) -> None:
        self._ref = AtomicReference(Snap(SeatState.AVAILABLE, None, 0, 0))
        self._ttl = ttl_millis

    def hold(self, user: str, now: int) -> bool:
        while True:
            cur = self._ref.get()
            if not cur.effectively_available(now):  # guard on a fresh snapshot
                return False
            nxt = Snap(SeatState.HELD, user, now + self._ttl, cur.version + 1)
            if self._ref.compare_and_set(cur, nxt):  # exactly one winner
                return True

    def confirm(self, user: str, now: int) -> bool:
        while True:
            cur = self._ref.get()
            if not cur.held_by(user, now):  # only the live holder
                return False
            if self._ref.compare_and_set(cur, Snap(SeatState.SOLD, user, 0, cur.version + 1)):
                return True

    def release(self, user: str, now: int) -> bool:
        while True:
            cur = self._ref.get()
            if not cur.held_by(user, now):
                return False
            if self._ref.compare_and_set(cur, Snap(SeatState.AVAILABLE, None, 0, cur.version + 1)):
                return True

    def snapshot(self) -> Snap:
        return self._ref.get()


if __name__ == "__main__":
    seat = SeatMachine(5_000)
    go = threading.Event()

    def contender(user: str) -> bool:
        go.wait()
        return seat.hold(user, 1_000)

    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = [pool.submit(contender, f"u{i}") for i in range(50)]
        go.set()
        winners = sum(f.result() for f in futures)
    s = seat.snapshot()
    print(f"winners={winners} state={s.state.name} v{s.version}")  # winners=1 (holder varies per run)
    print("holder is a contender:", str(s.holder.startswith("u")).lower())
    print("stranger confirm:", str(seat.confirm("nobody", 2_000)).lower())  # false
    print("confirm after expiry:", str(seat.confirm(s.holder, 6_000)).lower())  # false: hold expired at 6000
    print("after expiry, u_late holds:", str(seat.hold("u_late", 7_000)).lower())  # true
    ok = seat.confirm("u_late", 7_500)
    print(f"u_late confirms: {str(ok).lower()} -> {seat.snapshot().state.name}")
    print("hold after sold:", str(seat.hold("u_other", 8_000)).lower())  # false
    print("release after sold:", str(seat.release("u_late", 8_000)).lower())  # false` },
          { lang: 'ts', code: `type SeatState = "AVAILABLE" | "HELD" | "SOLD";

class Snap {
  constructor(
    readonly state: SeatState,
    readonly holder: string | null,
    readonly expiresAt: number,
    readonly version: number,
  ) {}

  heldBy(u: string, now: number): boolean {
    return this.state === "HELD" && this.holder === u && now < this.expiresAt;
  }
  effectivelyAvailable(now: number): boolean {
    return this.state === "AVAILABLE" || (this.state === "HELD" && now >= this.expiresAt); // expired hold
  }
}

// One JS thread means a compare-and-set can never actually lose a race here,
// but the transition code is written exactly as it would be on a multi-threaded runtime.
class AtomicReference<T> {
  constructor(private value: T) {}
  get(): T { return this.value; }
  compareAndSet(expect: T, update: T): boolean {
    if (this.value !== expect) return false;
    this.value = update;
    return true;
  }
}

class SeatMachine {
  private readonly ref = new AtomicReference<Snap>(new Snap("AVAILABLE", null, 0, 0));

  constructor(private readonly ttlMillis: number) {}

  hold(user: string, now: number): boolean {
    for (;;) {
      const cur = this.ref.get();
      if (!cur.effectivelyAvailable(now)) return false; // guard on a fresh snapshot
      const next = new Snap("HELD", user, now + this.ttlMillis, cur.version + 1);
      if (this.ref.compareAndSet(cur, next)) return true; // exactly one winner
    }
  }
  confirm(user: string, now: number): boolean {
    for (;;) {
      const cur = this.ref.get();
      if (!cur.heldBy(user, now)) return false; // only the live holder
      if (this.ref.compareAndSet(cur, new Snap("SOLD", user, 0, cur.version + 1))) return true;
    }
  }
  release(user: string, now: number): boolean {
    for (;;) {
      const cur = this.ref.get();
      if (!cur.heldBy(user, now)) return false;
      if (this.ref.compareAndSet(cur, new Snap("AVAILABLE", null, 0, cur.version + 1))) return true;
    }
  }
  snapshot(): Snap { return this.ref.get(); }
}

async function main(): Promise<void> {
  const seat = new SeatMachine(5_000);
  let open!: () => void;
  const go = new Promise<void>((resolve) => { open = resolve; });
  const contenders: Promise<boolean>[] = [];
  for (let i = 0; i < 50; i++) {
    const user = "u" + i;
    contenders.push(go.then(() => seat.hold(user, 1_000)));
  }
  open();
  const winners = (await Promise.all(contenders)).filter(Boolean).length;
  const s = seat.snapshot();
  console.log(\`winners=\${winners} state=\${s.state} v\${s.version}\`); // winners=1 (holder varies per run)
  console.log("holder is a contender: " + s.holder!.startsWith("u"));
  console.log("stranger confirm: " + seat.confirm("nobody", 2_000)); // false
  console.log("confirm after expiry: " + seat.confirm(s.holder!, 6_000)); // false: hold expired at 6000
  console.log("after expiry, u_late holds: " + seat.hold("u_late", 7_000)); // true
  const ok = seat.confirm("u_late", 7_500);
  console.log(\`u_late confirms: \${ok} -> \${seat.snapshot().state}\`);
  console.log("hold after sold: " + seat.hold("u_other", 8_000)); // false
  console.log("release after sold: " + seat.release("u_late", 8_000)); // false
}

main();` },
          { lang: 'cpp', code: `enum class SeatState { AVAILABLE, HELD, SOLD };

const char* toString(SeatState s) {
    switch (s) {
        case SeatState::AVAILABLE: return "AVAILABLE";
        case SeatState::HELD: return "HELD";
        default: return "SOLD";
    }
}

// Immutable snapshot: every transition builds a new one.
struct Snap {
    SeatState state;
    string holder;
    long long expiresAt;
    long long version;

    bool heldBy(const string& u, long long now) const { return state == SeatState::HELD && holder == u && now < expiresAt; }
    bool effectivelyAvailable(long long now) const {
        return state == SeatState::AVAILABLE || (state == SeatState::HELD && now >= expiresAt);  // expired hold
    }
};

class SeatMachine {
    atomic<shared_ptr<const Snap>> ref_{make_shared<const Snap>(Snap{SeatState::AVAILABLE, "", 0, 0})};
    long long ttlMillis_;

    // Retry loop shared by all transitions: guard on a fresh snapshot, then compare-and-set.
    template <class Guard, class Make>
    bool transition(Guard guard, Make make) {
        for (;;) {
            shared_ptr<const Snap> cur = ref_.load();
            if (!guard(*cur)) return false;
            shared_ptr<const Snap> next = make_shared<const Snap>(make(*cur));
            if (ref_.compare_exchange_strong(cur, next)) return true;  // exactly one winner
        }
    }

public:
    explicit SeatMachine(long long ttlMillis) : ttlMillis_(ttlMillis) {}

    bool hold(const string& user, long long now) {
        return transition([&](const Snap& c) { return c.effectivelyAvailable(now); },
                          [&](const Snap& c) { return Snap{SeatState::HELD, user, now + ttlMillis_, c.version + 1}; });
    }
    bool confirm(const string& user, long long now) {
        return transition([&](const Snap& c) { return c.heldBy(user, now); },
                          [&](const Snap& c) { return Snap{SeatState::SOLD, user, 0, c.version + 1}; });
    }
    bool release(const string& user, long long now) {
        return transition([&](const Snap& c) { return c.heldBy(user, now); },
                          [&](const Snap& c) { return Snap{SeatState::AVAILABLE, "", 0, c.version + 1}; });
    }
    Snap snapshot() const { return *ref_.load(); }
};

int main() {
    cout << boolalpha;
    SeatMachine seat(5'000);
    latch go(1);
    atomic<int> winners = 0;
    vector<thread> pool;
    for (int i = 0; i < 50; i++) {
        pool.emplace_back([&, user = "u" + to_string(i)] {
            go.wait();
            if (seat.hold(user, 1'000)) winners++;
        });
    }
    go.count_down();
    for (auto& t : pool) t.join();
    Snap s = seat.snapshot();
    cout << "winners=" << winners << " state=" << toString(s.state) << " v" << s.version << "\\n";  // winners=1 (holder varies per run)
    cout << "holder is a contender: " << (s.holder.rfind("u", 0) == 0) << "\\n";
    cout << "stranger confirm: " << seat.confirm("nobody", 2'000) << "\\n";                     // false
    cout << "confirm after expiry: " << seat.confirm(s.holder, 6'000) << "\\n";                 // false: hold expired at 6000
    cout << "after expiry, u_late holds: " << seat.hold("u_late", 7'000) << "\\n";              // true
    bool ok = seat.confirm("u_late", 7'500);
    cout << "u_late confirms: " << ok << " -> " << toString(seat.snapshot().state) << "\\n";
    cout << "hold after sold: " << seat.hold("u_other", 8'000) << "\\n";                        // false
    cout << "release after sold: " << seat.release("u_late", 8'000) << "\\n";                  // false
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Threading;

enum SeatState { AVAILABLE, HELD, SOLD }

sealed class Snap {
    public readonly SeatState State; public readonly string Holder; public readonly long ExpiresAt, Version;
    public Snap(SeatState state, string holder, long expiresAt, long version) { State = state; Holder = holder; ExpiresAt = expiresAt; Version = version; }
    public bool HeldBy(string u, long now) { return State == SeatState.HELD && Holder == u && now < ExpiresAt; }
    public bool EffectivelyAvailable(long now) {
        return State == SeatState.AVAILABLE || (State == SeatState.HELD && now >= ExpiresAt);   // expired hold
    }
}

class SeatMachine {
    private Snap snap = new Snap(SeatState.AVAILABLE, null, 0, 0);     // swapped only via CAS
    private readonly long ttlMillis;
    public SeatMachine(long ttlMillis) { this.ttlMillis = ttlMillis; }

    private bool Cas(Snap expected, Snap next) { return Interlocked.CompareExchange(ref snap, next, expected) == expected; }

    public bool Hold(string user, long now) {
        while (true) {
            Snap cur = Volatile.Read(ref snap);
            if (!cur.EffectivelyAvailable(now)) return false;                       // guard on a fresh snapshot
            Snap next = new Snap(SeatState.HELD, user, now + ttlMillis, cur.Version + 1);
            if (Cas(cur, next)) return true;                                        // exactly one winner
        }
    }
    public bool Confirm(string user, long now) {
        while (true) {
            Snap cur = Volatile.Read(ref snap);
            if (!cur.HeldBy(user, now)) return false;                               // only the live holder
            Snap next = new Snap(SeatState.SOLD, user, 0, cur.Version + 1);
            if (Cas(cur, next)) return true;
        }
    }
    public bool Release(string user, long now) {
        while (true) {
            Snap cur = Volatile.Read(ref snap);
            if (!cur.HeldBy(user, now)) return false;
            Snap next = new Snap(SeatState.AVAILABLE, null, 0, cur.Version + 1);
            if (Cas(cur, next)) return true;
        }
    }
    public Snap Snapshot() { return Volatile.Read(ref snap); }

    static string B(bool b) { return b.ToString().ToLower(); }

    static void Main() {
        SeatMachine seat = new SeatMachine(5000);
        ManualResetEventSlim go = new ManualResetEventSlim(false);
        bool[] results = new bool[50];
        List<Thread> threads = new List<Thread>();
        for (int i = 0; i < 50; i++) {
            int idx = i; string user = "u" + i;
            Thread t = new Thread(() => { go.Wait(); results[idx] = seat.Hold(user, 1000); });
            threads.Add(t); t.Start();
        }
        go.Set();
        foreach (Thread t in threads) t.Join();
        int winners = 0;
        foreach (bool r in results) if (r) winners++;
        Snap s = seat.Snapshot();
        Console.WriteLine("winners=" + winners + " state=" + s.State + " v" + s.Version);   // winners=1 (holder varies per run)
        Console.WriteLine("holder is a contender: " + B(s.Holder.StartsWith("u")));
        Console.WriteLine("stranger confirm: " + B(seat.Confirm("nobody", 2000)));                   // false
        Console.WriteLine("confirm after expiry: " + B(seat.Confirm(s.Holder, 6000)));               // false: hold expired at 6000
        Console.WriteLine("after expiry, u_late holds: " + B(seat.Hold("u_late", 7000)));            // true
        Console.WriteLine("u_late confirms: " + B(seat.Confirm("u_late", 7500)) + " -> " + seat.Snapshot().State);
        Console.WriteLine("hold after sold: " + B(seat.Hold("u_other", 8000)));                      // false
        Console.WriteLine("release after sold: " + B(seat.Release("u_late", 8000)));                 // false
    }
}` }
        ],
        complexity: `<p>Each operation is O(1) expected; under contention a loser retries, but every failed CAS means some other thread made progress (lock-free). Memory: one small snapshot per transition (garbage collected). The version gives ABA protection and maps directly to <code>UPDATE … WHERE version = ?</code> when persisted.</p>`,
        followUps: ['Persist it: write the SQL for hold/confirm with optimistic locking and explain what the caller does on 0 rows updated.', 'Hold 4 seats atomically (all or nothing) — why does per-seat CAS no longer suffice?', 'Add a SOLD → REFUNDED transition that only an admin can fire; where does the authorization guard live?']
      }
    }]
  });

  /* ======================= PRACTICE: EASY ======================= */
  practice.push({
    title: 'Traffic Light with Pedestrian Button', level: 'Easy', tags: ['enum state', 'timer', 'state pattern'], companies: ['Microsoft', 'Cisco', 'Bosch'],
    statement: `<p>Model a traffic light that cycles <b>RED (30 s) → GREEN (25 s) → YELLOW (5 s) → RED</b>. A <code>tick()</code> is called once per second. A pedestrian button may be pressed at any time: during GREEN it cuts the remaining green time to at most 5 seconds; in RED or YELLOW it does nothing. Print the colour whenever it changes. <b>Add-a-state follow-up:</b> a FLASHING_YELLOW night mode.</p>`,
    constraints: `Durations are fixed per state. No threads needed — the caller drives <code>tick()</code>.`,
    example: `<p>Start RED with 30 s. After 30 ticks → ${H.c('g', 'GREEN')} (25 s). 3 ticks later the button is pressed → remaining green becomes ${H.c('y', '5')} instead of 22. 5 ticks later → ${H.c('y', 'YELLOW')}, 5 more → ${H.c('r', 'RED')}.</p>`,
    brute: { why: `<p>Integer state codes and a counter inside one <code>tick()</code> with nested <code>if (state == 0) … else if (state == 1)</code>; the button handler repeats the same ladder. Adding FLASHING_YELLOW means editing both ladders, and magic numbers (0/1/2) make it easy to send RED → YELLOW by mistake.</p>`, code: { lang: 'java', code: `class NaiveLight {
    int state = 0, remaining = 30;          // 0 = red, 1 = green, 2 = yellow
    void tick() {
        if (--remaining > 0) return;
        if (state == 0) { state = 1; remaining = 25; }
        else if (state == 1) { state = 2; remaining = 5; }
        else if (state == 2) { state = 0; remaining = 30; }
    }
    void press() { if (state == 1 && remaining > 5) remaining = 5; }   // the ladder again
}`, alt: [{ lang: 'python', code: "class NaiveLight:\n    def __init__(self):\n        self.state, self.remaining = 0, 30          # 0 = red, 1 = green, 2 = yellow\n\n    def tick(self):\n        self.remaining -= 1\n        if self.remaining > 0: return\n        if self.state == 0: self.state, self.remaining = 1, 25\n        elif self.state == 1: self.state, self.remaining = 2, 5\n        elif self.state == 2: self.state, self.remaining = 0, 30\n\n    def press(self):                                 # the ladder again\n        if self.state == 1 and self.remaining > 5: self.remaining = 5\n" }, { lang: 'ts', code: "class NaiveLight {\n  state = 0; remaining = 30;          // 0 = red, 1 = green, 2 = yellow\n  tick(): void {\n    if (--this.remaining > 0) return;\n    if (this.state === 0) { this.state = 1; this.remaining = 25; }\n    else if (this.state === 1) { this.state = 2; this.remaining = 5; }\n    else if (this.state === 2) { this.state = 0; this.remaining = 30; }\n  }\n  press(): void { if (this.state === 1 && this.remaining > 5) this.remaining = 5; }   // the ladder again\n}\n" }, { lang: 'cpp', code: "class NaiveLight {\npublic:\n    int state = 0, remaining = 30;          // 0 = red, 1 = green, 2 = yellow\n    void tick() {\n        if (--remaining > 0) return;\n        if (state == 0) { state = 1; remaining = 25; }\n        else if (state == 1) { state = 2; remaining = 5; }\n        else if (state == 2) { state = 0; remaining = 30; }\n    }\n    void press() { if (state == 1 && remaining > 5) remaining = 5; }   // the ladder again\n};\n" }, { lang: 'csharp', code: "class NaiveLight {\n    public int State = 0, Remaining = 30;          // 0 = red, 1 = green, 2 = yellow\n    public void Tick() {\n        if (--Remaining > 0) return;\n        if (State == 0) { State = 1; Remaining = 25; }\n        else if (State == 1) { State = 2; Remaining = 5; }\n        else if (State == 2) { State = 0; Remaining = 30; }\n    }\n    public void Press() { if (State == 1 && Remaining > 5) Remaining = 5; }   // the ladder again\n}\n" }] } },
    mcq: { q: 'Where should the rule "button shortens GREEN only" live in an enum State design?', options: ['As a method on the state that only GREEN overrides; the others inherit "do nothing"', 'In the TrafficLight.press() method with an if on the colour', 'In a static utility class', 'In every tick() call'], answer: 0, explain: 'Constant-specific methods put the behaviour next to the state it belongs to; the context just delegates.' },
    hints: [`<p>Hint 1: Each colour knows its duration and its successor — that is all a cycle needs. An enum with a duration and a <code>next()</code> method is perfect (a Java enum with a constructor argument and an abstract method, a Python <code>Enum</code> with a lookup table, a C++ <code>enum class</code> with a switch).</p>`, `<p>Hint 2: Give the enum a method <code>int onPedestrian(int remaining)</code> that returns <code>remaining</code> by default; only GREEN overrides it with <code>min(remaining, 5)</code>.</p>`, `<p>Hint 3: The context holds <code>light</code> and <code>remaining</code>. tick(): decrement; when it hits 0, switch to <code>light.next()</code> and reload its duration. Night mode = one more constant whose next() is itself.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "RED -> GREEN\ngreen left after button: 5\nGREEN -> YELLOW\nYELLOW -> RED\nnow RED\nred left after button: 30\nnight FLASHING_YELLOW 1\n" }] },
      solution: {
      approach: `<p>An enum where every constant carries its duration and its successor (enum State pattern). The pedestrian rule is an override on the GREEN state only. The <code>TrafficLight</code> context only counts down and delegates; FLASHING_YELLOW is one new constant that loops to itself.</p>`,
      code: `enum Light {
    RED(30)    { Light next() { return GREEN; } },
    GREEN(25)  {
        Light next() { return YELLOW; }
        int onPedestrian(int remaining) { return Math.min(remaining, 5); }   // only GREEN reacts
    },
    YELLOW(5)  { Light next() { return RED; } },
    FLASHING_YELLOW(1) { Light next() { return FLASHING_YELLOW; } };       // add-a-state: night mode

    final int seconds;
    Light(int seconds) { this.seconds = seconds; }
    abstract Light next();
    int onPedestrian(int remaining) { return remaining; }                   // default: ignore
}

class TrafficLight {
    private Light light = Light.RED;
    private int remaining = Light.RED.seconds;

    void tick() {
        if (--remaining > 0) return;
        Light next = light.next();
        if (next != light) System.out.println(light + " -> " + next);
        light = next;
        remaining = light.seconds;
    }
    void pressButton()  { remaining = light.onPedestrian(remaining); }
    void nightMode()    { light = Light.FLASHING_YELLOW; remaining = light.seconds; }
    Light light()       { return light; }
    int remaining()     { return remaining; }

    public static void main(String[] args) {
        TrafficLight t = new TrafficLight();
        for (int i = 0; i < 33; i++) t.tick();          // RED -> GREEN, 3 s into green
        t.pressButton();
        System.out.println("green left after button: " + t.remaining());   // 5
        for (int i = 0; i < 10; i++) t.tick();          // GREEN -> YELLOW -> RED
        System.out.println("now " + t.light());
        t.pressButton();                                // RED ignores the button
        System.out.println("red left after button: " + t.remaining());   // 30
        t.nightMode();
        t.tick();
        System.out.println("night " + t.light() + " " + t.remaining());   // FLASHING_YELLOW 1
    }
}`, alt: [
          { lang: 'python', code: `from enum import Enum


class Light(Enum):
    RED = 30
    GREEN = 25
    YELLOW = 5
    FLASHING_YELLOW = 1  # add-a-state: night mode

    @property
    def seconds(self) -> int:
        return self.value

    def next(self) -> "Light":
        return {
            Light.RED: Light.GREEN,
            Light.GREEN: Light.YELLOW,
            Light.YELLOW: Light.RED,
            Light.FLASHING_YELLOW: Light.FLASHING_YELLOW,
        }[self]

    def on_pedestrian(self, remaining: int) -> int:
        if self is Light.GREEN:  # only GREEN reacts
            return min(remaining, 5)
        return remaining  # default: ignore


class TrafficLight:
    def __init__(self) -> None:
        self._light = Light.RED
        self._remaining = Light.RED.seconds

    def tick(self) -> None:
        self._remaining -= 1
        if self._remaining > 0:
            return
        nxt = self._light.next()
        if nxt is not self._light:
            print(f"{self._light.name} -> {nxt.name}")
        self._light = nxt
        self._remaining = nxt.seconds

    def press_button(self) -> None:
        self._remaining = self._light.on_pedestrian(self._remaining)

    def night_mode(self) -> None:
        self._light = Light.FLASHING_YELLOW
        self._remaining = self._light.seconds

    @property
    def light(self) -> Light:
        return self._light

    @property
    def remaining(self) -> int:
        return self._remaining


if __name__ == "__main__":
    t = TrafficLight()
    for _ in range(33):
        t.tick()  # RED -> GREEN, 3 s into green
    t.press_button()
    print("green left after button:", t.remaining)  # 5
    for _ in range(10):
        t.tick()  # GREEN -> YELLOW -> RED
    print("now", t.light.name)
    t.press_button()  # RED ignores the button
    print("red left after button:", t.remaining)  # 30
    t.night_mode()
    t.tick()
    print("night", t.light.name, t.remaining)  # FLASHING_YELLOW 1` },
          { lang: 'ts', code: `interface Light {
  readonly name: string;
  readonly seconds: number;
  next(): Light;
  onPedestrian(remaining: number): number;
}

// Behaviour sits with each state; only GREEN overrides the pedestrian button.
function light(name: string, seconds: number, next: () => Light, onPedestrian = (r: number) => r): Light {
  return { name, seconds, next, onPedestrian };
}

const RED: Light = light("RED", 30, () => GREEN);
const GREEN: Light = light("GREEN", 25, () => YELLOW, (remaining) => Math.min(remaining, 5)); // only GREEN reacts
const YELLOW: Light = light("YELLOW", 5, () => RED);
const FLASHING_YELLOW: Light = light("FLASHING_YELLOW", 1, () => FLASHING_YELLOW); // add-a-state: night mode

class TrafficLight {
  private current: Light = RED;
  private remainingSeconds: number = RED.seconds;

  tick(): void {
    if (--this.remainingSeconds > 0) return;
    const next = this.current.next();
    if (next !== this.current) console.log(\`\${this.current.name} -> \${next.name}\`);
    this.current = next;
    this.remainingSeconds = next.seconds;
  }
  pressButton(): void { this.remainingSeconds = this.current.onPedestrian(this.remainingSeconds); }
  nightMode(): void { this.current = FLASHING_YELLOW; this.remainingSeconds = FLASHING_YELLOW.seconds; }
  light(): Light { return this.current; }
  remaining(): number { return this.remainingSeconds; }
}

const t = new TrafficLight();
for (let i = 0; i < 33; i++) t.tick(); // RED -> GREEN, 3 s into green
t.pressButton();
console.log("green left after button: " + t.remaining()); // 5
for (let i = 0; i < 10; i++) t.tick(); // GREEN -> YELLOW -> RED
console.log("now " + t.light().name);
t.pressButton(); // RED ignores the button
console.log("red left after button: " + t.remaining()); // 30
t.nightMode();
t.tick();
console.log(\`night \${t.light().name} \${t.remaining()}\`); // FLASHING_YELLOW 1` },
          { lang: 'cpp', code: `enum class Light { RED, GREEN, YELLOW, FLASHING_YELLOW };  // FLASHING_YELLOW: add-a-state, night mode

const char* name(Light l) {
    switch (l) {
        case Light::RED: return "RED";
        case Light::GREEN: return "GREEN";
        case Light::YELLOW: return "YELLOW";
        default: return "FLASHING_YELLOW";
    }
}

int seconds(Light l) {
    switch (l) {
        case Light::RED: return 30;
        case Light::GREEN: return 25;
        case Light::YELLOW: return 5;
        default: return 1;
    }
}

Light next(Light l) {
    switch (l) {
        case Light::RED: return Light::GREEN;
        case Light::GREEN: return Light::YELLOW;
        case Light::YELLOW: return Light::RED;
        default: return Light::FLASHING_YELLOW;
    }
}

// Only GREEN reacts to the button; every other state ignores it.
int onPedestrian(Light l, int remaining) { return l == Light::GREEN ? min(remaining, 5) : remaining; }

class TrafficLight {
    Light light_ = Light::RED;
    int remaining_ = seconds(Light::RED);

public:
    void tick() {
        if (--remaining_ > 0) return;
        Light n = next(light_);
        if (n != light_) cout << name(light_) << " -> " << name(n) << "\\n";
        light_ = n;
        remaining_ = seconds(light_);
    }
    void pressButton() { remaining_ = onPedestrian(light_, remaining_); }
    void nightMode() { light_ = Light::FLASHING_YELLOW; remaining_ = seconds(light_); }
    Light light() const { return light_; }
    int remaining() const { return remaining_; }
};

int main() {
    TrafficLight t;
    for (int i = 0; i < 33; i++) t.tick();  // RED -> GREEN, 3 s into green
    t.pressButton();
    cout << "green left after button: " << t.remaining() << "\\n";  // 5
    for (int i = 0; i < 10; i++) t.tick();  // GREEN -> YELLOW -> RED
    cout << "now " << name(t.light()) << "\\n";
    t.pressButton();  // RED ignores the button
    cout << "red left after button: " << t.remaining() << "\\n";  // 30
    t.nightMode();
    t.tick();
    cout << "night " << name(t.light()) << " " << t.remaining() << "\\n";  // FLASHING_YELLOW 1
}` },
  { lang: 'csharp', code: `
using System;

/// Type-safe enum: each constant is an instance with its own Next()/OnPedestrian() behaviour.
abstract class Light {
    public static readonly Light RED = new Red();
    public static readonly Light GREEN = new Green();
    public static readonly Light YELLOW = new Yellow();
    public static readonly Light FLASHING_YELLOW = new FlashingYellow();      // add-a-state: night mode

    public readonly int Seconds;
    private readonly string name;
    private Light(string name, int seconds) { this.name = name; Seconds = seconds; }
    public abstract Light Next();
    public virtual int OnPedestrian(int remaining) { return remaining; }      // default: ignore
    public override string ToString() { return name; }

    sealed class Red : Light { public Red() : base("RED", 30) { } public override Light Next() { return GREEN; } }
    sealed class Green : Light {
        public Green() : base("GREEN", 25) { }
        public override Light Next() { return YELLOW; }
        public override int OnPedestrian(int remaining) { return Math.Min(remaining, 5); }   // only GREEN reacts
    }
    sealed class Yellow : Light { public Yellow() : base("YELLOW", 5) { } public override Light Next() { return RED; } }
    sealed class FlashingYellow : Light { public FlashingYellow() : base("FLASHING_YELLOW", 1) { } public override Light Next() { return FLASHING_YELLOW; } }
}

class TrafficLight {
    private Light light = Light.RED;
    private int remaining = Light.RED.Seconds;

    public void Tick() {
        if (--remaining > 0) return;
        Light next = light.Next();
        if (next != light) Console.WriteLine(light + " -> " + next);
        light = next;
        remaining = light.Seconds;
    }
    public void PressButton()  { remaining = light.OnPedestrian(remaining); }
    public void NightMode()    { light = Light.FLASHING_YELLOW; remaining = light.Seconds; }
    public Light Current()     { return light; }
    public int Remaining()     { return remaining; }

    static void Main() {
        TrafficLight t = new TrafficLight();
        for (int i = 0; i < 33; i++) t.Tick();          // RED -> GREEN, 3 s into green
        t.PressButton();
        Console.WriteLine("green left after button: " + t.Remaining());   // 5
        for (int i = 0; i < 10; i++) t.Tick();          // GREEN -> YELLOW -> RED
        Console.WriteLine("now " + t.Current());
        t.PressButton();                                // RED ignores the button
        Console.WriteLine("red left after button: " + t.Remaining());   // 30
        t.NightMode();
        t.Tick();
        Console.WriteLine("night " + t.Current() + " " + t.Remaining());   // FLASHING_YELLOW 1
    }
}` }
        ],
      complexity: `<p>O(1) per tick and per button press. Adding a colour/mode = one enum constant.</p>`,
      followUps: ['Two crossing roads must never both be GREEN — model the intersection as one state machine, not two.', 'An emergency vehicle sensor forces RED in all directions: which state and which transitions?']
    }
  });

  practice.push({
    title: 'Metro Turnstile (+ add a BROKEN state)', level: 'Easy', tags: ['state pattern', 'add-a-state'], companies: ['Amazon', 'Thoughtworks'],
    statement: `<p>A turnstile is <b>LOCKED</b> or <b>UNLOCKED</b>. Events: <code>coin()</code> and <code>push()</code>. LOCKED + coin → UNLOCKED; LOCKED + push → sound alarm, stay LOCKED; UNLOCKED + push → let one person through, LOCKED; UNLOCKED + coin → refund the extra coin, stay UNLOCKED. <b>Follow-up:</b> add <b>BROKEN</b>: any state + <code>fault()</code> → BROKEN (coins refunded, pushes ignored) until <code>repair()</code> → LOCKED.</p>`,
    constraints: `Single-threaded. Count passengers and collected coins.`,
    example: `<p>Events: push → ${H.c('r', 'alarm')}; coin → UNLOCKED; coin → ${H.c('y', 'refund')}; push → passenger 1, LOCKED; fault → BROKEN; coin → ${H.c('y', 'refund')}; repair → LOCKED. Collected = ${H.c('g', '1 coin')}, passengers = 1.</p>`,
    brute: { why: `<p>A <code>boolean locked</code> plus a later <code>boolean broken</code>: now there are 4 combinations, and code like <code>if (locked) … else …</code> forgets to check <code>broken</code> first — a broken gate that still takes coins. Each new mode doubles the combinations.</p>`, code: { lang: 'java', code: `class FlagTurnstile {
    boolean locked = true, broken = false;
    int coins, passengers;
    void coin() { if (locked) { locked = false; coins++; } else System.out.println("refund"); }   // forgot broken!
    void push() { if (!locked) { passengers++; locked = true; } else System.out.println("alarm"); }
    void fault() { broken = true; }
}`, alt: [{ lang: 'python', code: "class FlagTurnstile:\n    def __init__(self):\n        self.locked, self.broken = True, False\n        self.coins = self.passengers = 0\n\n    def coin(self):                                   # forgot broken!\n        if self.locked: self.locked = False; self.coins += 1\n        else: print(\"refund\")\n\n    def push(self):\n        if not self.locked: self.passengers += 1; self.locked = True\n        else: print(\"alarm\")\n\n    def fault(self): self.broken = True\n" }, { lang: 'ts', code: "class FlagTurnstile {\n  locked = true; broken = false;\n  coins = 0; passengers = 0;\n  coin(): void { if (this.locked) { this.locked = false; this.coins++; } else console.log(\"refund\"); }   // forgot broken!\n  push(): void { if (!this.locked) { this.passengers++; this.locked = true; } else console.log(\"alarm\"); }\n  fault(): void { this.broken = true; }\n}\n" }, { lang: 'cpp', code: "class FlagTurnstile {\npublic:\n    bool locked = true, broken = false;\n    int coins = 0, passengers = 0;\n    void coin() { if (locked) { locked = false; coins++; } else cout << \"refund\" << endl; }   // forgot broken!\n    void push() { if (!locked) { passengers++; locked = true; } else cout << \"alarm\" << endl; }\n    void fault() { broken = true; }\n};\n" }, { lang: 'csharp', code: "using System;\nclass FlagTurnstile {\n    public bool Locked = true, Broken = false;\n    public int Coins, Passengers;\n    public void Coin() { if (Locked) { Locked = false; Coins++; } else Console.WriteLine(\"refund\"); }   // forgot broken!\n    public void Push() { if (!Locked) { Passengers++; Locked = true; } else Console.WriteLine(\"alarm\"); }\n    public void Fault() { Broken = true; }\n}\n" }] } },
    mcq: { q: 'After adding BROKEN with default-reject methods, which existing state classes change?', options: ['None — fault() is handled once in the context or by a default in the base state; only Broken is new', 'Locked and Unlocked both', 'Only Unlocked', 'All classes and the interface'], answer: 0, explain: 'An event valid in every state (fault) can be handled once; the new state class handles its own coin/push.' },
    hints: [`<p>Hint 1: Draw the 2 × 2 table (LOCKED/UNLOCKED × coin/push). Every cell has a defined outcome — there are no "impossible" cells here.</p>`, `<p>Hint 2: <code>interface GateState { GateState coin(Turnstile t); GateState push(Turnstile t); }</code> returning the next state keeps the context in charge of the field.</p>`, `<p>Hint 3: fault() is legal from every state → handle it in the context (<code>state = new Broken()</code>). Broken.coin refunds, Broken.push ignores, repair() only works in Broken.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "[LOCKED] ALARM: pay first\n[UNLOCKED] already open, coin refunded\n[BROKEN] out of order, coin refunded\n[BROKEN] repaired\n[LOCKED] nothing to repair\nLOCKED coins=1 passengers=1\n" }] },
      solution: {
      approach: `<p>States return their successor (functional State pattern), so the context is the only writer of <code>state</code>. Counters live in the context. BROKEN is a new class; the global <code>fault()</code> event is handled once in the context because it is valid everywhere.</p>`,
      code: `interface GateState {
    GateState coin(Turnstile t);
    GateState push(Turnstile t);
    default GateState repair(Turnstile t) { t.say("nothing to repair"); return this; }
}
final class Locked implements GateState {
    public GateState coin(Turnstile t) { t.collect(); return new Unlocked(); }
    public GateState push(Turnstile t) { t.say("ALARM: pay first"); return this; }
    public String toString() { return "LOCKED"; }
}
final class Unlocked implements GateState {
    public GateState coin(Turnstile t) { t.say("already open, coin refunded"); return this; }
    public GateState push(Turnstile t) { t.pass(); return new Locked(); }
    public String toString() { return "UNLOCKED"; }
}
final class Broken implements GateState {                     // follow-up: one new class
    public GateState coin(Turnstile t) { t.say("out of order, coin refunded"); return this; }
    public GateState push(Turnstile t) { t.say("out of order"); return this; }
    public GateState repair(Turnstile t) { t.say("repaired"); return new Locked(); }
    public String toString() { return "BROKEN"; }
}

class Turnstile {
    private GateState state = new Locked();
    private int coins, passengers;
    void coin()   { state = state.coin(this); }
    void push()   { state = state.push(this); }
    void repair() { state = state.repair(this); }
    void fault()  { state = new Broken(); }                    // valid in every state: handled once
    void collect() { coins++; }
    void pass()    { passengers++; }
    void say(String s) { System.out.println("[" + state + "] " + s); }

    public static void main(String[] args) {
        Turnstile t = new Turnstile();
        t.push(); t.coin(); t.coin(); t.push(); t.fault(); t.coin(); t.repair();
        t.repair();                                 // nothing to repair when not broken
        System.out.println(t.state + " coins=" + t.coins + " passengers=" + t.passengers);   // LOCKED 1 1
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class GateState(ABC):
    @abstractmethod
    def coin(self, t: "Turnstile") -> "GateState": ...

    @abstractmethod
    def push(self, t: "Turnstile") -> "GateState": ...

    def repair(self, t: "Turnstile") -> "GateState":
        t.say("nothing to repair")
        return self


class Locked(GateState):
    def coin(self, t: "Turnstile") -> GateState:
        t.collect()
        return Unlocked()

    def push(self, t: "Turnstile") -> GateState:
        t.say("ALARM: pay first")
        return self

    def __str__(self) -> str:
        return "LOCKED"


class Unlocked(GateState):
    def coin(self, t: "Turnstile") -> GateState:
        t.say("already open, coin refunded")
        return self

    def push(self, t: "Turnstile") -> GateState:
        t.passed()
        return Locked()

    def __str__(self) -> str:
        return "UNLOCKED"


class Broken(GateState):  # follow-up: one new class
    def coin(self, t: "Turnstile") -> GateState:
        t.say("out of order, coin refunded")
        return self

    def push(self, t: "Turnstile") -> GateState:
        t.say("out of order")
        return self

    def repair(self, t: "Turnstile") -> GateState:
        t.say("repaired")
        return Locked()

    def __str__(self) -> str:
        return "BROKEN"


class Turnstile:
    def __init__(self) -> None:
        self.state: GateState = Locked()
        self.coins = 0
        self.passengers = 0

    def coin(self) -> None: self.state = self.state.coin(self)
    def push(self) -> None: self.state = self.state.push(self)
    def repair(self) -> None: self.state = self.state.repair(self)
    def fault(self) -> None: self.state = Broken()  # valid in every state: handled once
    def collect(self) -> None: self.coins += 1
    def passed(self) -> None: self.passengers += 1
    def say(self, s: str) -> None: print(f"[{self.state}] {s}")


if __name__ == "__main__":
    t = Turnstile()
    t.push(); t.coin(); t.coin(); t.push(); t.fault(); t.coin(); t.repair()
    t.repair()  # nothing to repair when not broken
    print(f"{t.state} coins={t.coins} passengers={t.passengers}")  # LOCKED 1 1` },
          { lang: 'ts', code: `interface GateState {
  coin(t: Turnstile): GateState;
  push(t: Turnstile): GateState;
  repair(t: Turnstile): GateState;
  toString(): string;
}

// Interfaces have no default methods, so the shared default lives in a base class.
abstract class BaseGateState implements GateState {
  abstract coin(t: Turnstile): GateState;
  abstract push(t: Turnstile): GateState;
  repair(t: Turnstile): GateState { t.say("nothing to repair"); return this; }
  abstract toString(): string;
}

class Locked extends BaseGateState {
  coin(t: Turnstile): GateState { t.collect(); return new Unlocked(); }
  push(t: Turnstile): GateState { t.say("ALARM: pay first"); return this; }
  toString(): string { return "LOCKED"; }
}
class Unlocked extends BaseGateState {
  coin(t: Turnstile): GateState { t.say("already open, coin refunded"); return this; }
  push(t: Turnstile): GateState { t.pass(); return new Locked(); }
  toString(): string { return "UNLOCKED"; }
}
class Broken extends BaseGateState { // follow-up: one new class
  coin(t: Turnstile): GateState { t.say("out of order, coin refunded"); return this; }
  push(t: Turnstile): GateState { t.say("out of order"); return this; }
  override repair(t: Turnstile): GateState { t.say("repaired"); return new Locked(); }
  toString(): string { return "BROKEN"; }
}

class Turnstile {
  state: GateState = new Locked();
  coins = 0;
  passengers = 0;

  coin(): void { this.state = this.state.coin(this); }
  push(): void { this.state = this.state.push(this); }
  repair(): void { this.state = this.state.repair(this); }
  fault(): void { this.state = new Broken(); } // valid in every state: handled once
  collect(): void { this.coins++; }
  pass(): void { this.passengers++; }
  say(s: string): void { console.log(\`[\${this.state}] \${s}\`); }
}

const t = new Turnstile();
t.push(); t.coin(); t.coin(); t.push(); t.fault(); t.coin(); t.repair();
t.repair(); // nothing to repair when not broken
console.log(\`\${t.state} coins=\${t.coins} passengers=\${t.passengers}\`); // LOCKED 1 1` },
          { lang: 'cpp', code: `class Turnstile;
struct GateState;
using StatePtr = unique_ptr<GateState>;  // nullptr means "stay in this state"

struct GateState {
    virtual ~GateState() = default;
    virtual StatePtr coin(Turnstile& t) = 0;
    virtual StatePtr push(Turnstile& t) = 0;
    virtual StatePtr repair(Turnstile& t);
    virtual string name() const = 0;
};
struct Locked final : GateState {
    StatePtr coin(Turnstile& t) override;
    StatePtr push(Turnstile& t) override;
    string name() const override { return "LOCKED"; }
};
struct Unlocked final : GateState {
    StatePtr coin(Turnstile& t) override;
    StatePtr push(Turnstile& t) override;
    string name() const override { return "UNLOCKED"; }
};
struct Broken final : GateState {  // follow-up: one new class
    StatePtr coin(Turnstile& t) override;
    StatePtr push(Turnstile& t) override;
    StatePtr repair(Turnstile& t) override;
    string name() const override { return "BROKEN"; }
};

class Turnstile {
    StatePtr state_ = make_unique<Locked>();
    int coins_ = 0, passengers_ = 0;

    void enter(StatePtr next) { if (next) state_ = move(next); }

public:
    void coin() { enter(state_->coin(*this)); }
    void push() { enter(state_->push(*this)); }
    void repair() { enter(state_->repair(*this)); }
    void fault() { state_ = make_unique<Broken>(); }  // valid in every state: handled once
    void collect() { coins_++; }
    void pass() { passengers_++; }
    void say(const string& s) const { cout << "[" << state_->name() << "] " << s << "\\n"; }
    string state() const { return state_->name(); }
    int coins() const { return coins_; }
    int passengers() const { return passengers_; }
};

StatePtr GateState::repair(Turnstile& t) { t.say("nothing to repair"); return nullptr; }
StatePtr Locked::coin(Turnstile& t) { t.collect(); return make_unique<Unlocked>(); }
StatePtr Locked::push(Turnstile& t) { t.say("ALARM: pay first"); return nullptr; }
StatePtr Unlocked::coin(Turnstile& t) { t.say("already open, coin refunded"); return nullptr; }
StatePtr Unlocked::push(Turnstile& t) { t.pass(); return make_unique<Locked>(); }
StatePtr Broken::coin(Turnstile& t) { t.say("out of order, coin refunded"); return nullptr; }
StatePtr Broken::push(Turnstile& t) { t.say("out of order"); return nullptr; }
StatePtr Broken::repair(Turnstile& t) { t.say("repaired"); return make_unique<Locked>(); }

int main() {
    Turnstile t;
    t.push(); t.coin(); t.coin(); t.push(); t.fault(); t.coin(); t.repair();
    t.repair();  // nothing to repair when not broken
    cout << t.state() << " coins=" << t.coins() << " passengers=" << t.passengers() << "\\n";  // LOCKED 1 1
}` },
  { lang: 'csharp', code: `
using System;

abstract class GateState {
    public abstract GateState Coin(Turnstile t);
    public abstract GateState Push(Turnstile t);
    public virtual GateState Repair(Turnstile t) { t.Say("nothing to repair"); return this; }
}
sealed class Locked : GateState {
    public override GateState Coin(Turnstile t) { t.Collect(); return new Unlocked(); }
    public override GateState Push(Turnstile t) { t.Say("ALARM: pay first"); return this; }
    public override string ToString() { return "LOCKED"; }
}
sealed class Unlocked : GateState {
    public override GateState Coin(Turnstile t) { t.Say("already open, coin refunded"); return this; }
    public override GateState Push(Turnstile t) { t.Pass(); return new Locked(); }
    public override string ToString() { return "UNLOCKED"; }
}
sealed class Broken : GateState {                              // follow-up: one new class
    public override GateState Coin(Turnstile t) { t.Say("out of order, coin refunded"); return this; }
    public override GateState Push(Turnstile t) { t.Say("out of order"); return this; }
    public override GateState Repair(Turnstile t) { t.Say("repaired"); return new Locked(); }
    public override string ToString() { return "BROKEN"; }
}

class Turnstile {
    private GateState state = new Locked();
    private int coins, passengers;
    public void Coin()   { state = state.Coin(this); }
    public void Push()   { state = state.Push(this); }
    public void Repair() { state = state.Repair(this); }
    public void Fault()  { state = new Broken(); }               // valid in every state: handled once
    public void Collect() { coins++; }
    public void Pass()    { passengers++; }
    public void Say(string s) { Console.WriteLine("[" + state + "] " + s); }

    static void Main() {
        Turnstile t = new Turnstile();
        t.Push(); t.Coin(); t.Coin(); t.Push(); t.Fault(); t.Coin(); t.Repair();
        t.Repair();                                 // nothing to repair when not broken
        Console.WriteLine(t.state + " coins=" + t.coins + " passengers=" + t.passengers);   // LOCKED 1 1
    }
}` }
        ],
      complexity: `<p>O(1) per event. Adding BROKEN: 1 new class + 2 context methods; Locked/Unlocked untouched.</p>`,
      followUps: ['Support a monthly pass (tap card) as another event — which states care?', 'Two people push through on one coin (tailgating sensor): which transition detects it?']
    }
  });

  practice.push({
    title: 'Smart Door Lock with Keypad Lockout', level: 'Easy', tags: ['state pattern', 'guards', 'time'], companies: ['Google', 'Amazon', 'Samsung'],
    statement: `<p>A smart door is <b>OPEN</b>, <b>CLOSED</b> or <b>LOCKED</b>. <code>close()</code>: OPEN → CLOSED. <code>open()</code>: CLOSED → OPEN. <code>lock()</code>: CLOSED → LOCKED (you cannot lock an open door). <code>unlock(code, now)</code>: LOCKED → CLOSED if the code is right. Three wrong codes in a row → <b>LOCKED_OUT</b> for 60 seconds: every unlock attempt is refused until <code>now ≥ lockedUntil</code>, then the door behaves as LOCKED again.</p>`,
    constraints: `Time is passed in as seconds (<code>long now</code>) so it is testable. The wrong-attempt counter resets on success.`,
    example: `<p>close, lock, unlock("0000", t=1) ✗, unlock("1111", t=2) ✗, unlock("2222", t=3) ✗ → ${H.c('r', 'LOCKED_OUT until t=63')}; unlock("4321", t=10) → ${H.c('r', 'refused')}; unlock("4321", t=70) → ${H.c('g', 'CLOSED')}.</p>`,
    brute: { why: `<p>Fields <code>isOpen</code>, <code>isLocked</code>, <code>failCount</code>, <code>lockedUntil</code> and if-checks in each method. <code>lock()</code> forgets to check <code>isOpen</code> (so an open door reports "locked"), and the lockout check is copy-pasted into unlock only — an attacker can keep calling it because one branch forgot the time check.</p>`, code: { lang: 'java', code: `class FlagDoor {
    boolean isOpen = true, isLocked = false;
    int fails; long lockedUntil;
    void lock() { isLocked = true; }                          // bug: can "lock" an open door
    boolean unlock(String code, long now) {
        if (code.equals("4321")) { isLocked = false; fails = 0; return true; }  // bug: ignores lockout time
        if (++fails >= 3) lockedUntil = now + 60;
        return false;
    }
}`, alt: [{ lang: 'python', code: "class FlagDoor:\n    def __init__(self):\n        self.is_open, self.is_locked = True, False\n        self.fails, self.locked_until = 0, 0\n\n    def lock(self): self.is_locked = True                          # bug: can \"lock\" an open door\n\n    def unlock(self, code, now):\n        if code == \"4321\":                                         # bug: ignores lockout time\n            self.is_locked = False; self.fails = 0\n            return True\n        self.fails += 1\n        if self.fails >= 3: self.locked_until = now + 60\n        return False\n" }, { lang: 'ts', code: "class FlagDoor {\n  isOpen = true; isLocked = false;\n  fails = 0; lockedUntil = 0;\n  lock(): void { this.isLocked = true; }                          // bug: can \"lock\" an open door\n  unlock(code: string, now: number): boolean {\n    if (code === \"4321\") { this.isLocked = false; this.fails = 0; return true; }  // bug: ignores lockout time\n    if (++this.fails >= 3) this.lockedUntil = now + 60;\n    return false;\n  }\n}\n" }, { lang: 'cpp', code: "class FlagDoor {\npublic:\n    bool isOpen = true, isLocked = false;\n    int fails = 0; long long lockedUntil = 0;\n    void lock() { isLocked = true; }                              // bug: can \"lock\" an open door\n    bool unlock(const string& code, long long now) {\n        if (code == \"4321\") { isLocked = false; fails = 0; return true; }  // bug: ignores lockout time\n        if (++fails >= 3) lockedUntil = now + 60;\n        return false;\n    }\n};\n" }, { lang: 'csharp', code: "class FlagDoor {\n    public bool IsOpen = true, IsLocked = false;\n    public int Fails; public long LockedUntil;\n    public void Lock() { IsLocked = true; }                      // bug: can \"lock\" an open door\n    public bool Unlock(string code, long now) {\n        if (code == \"4321\") { IsLocked = false; Fails = 0; return true; }  // bug: ignores lockout time\n        if (++Fails >= 3) LockedUntil = now + 60;\n        return false;\n    }\n}\n" }] } },
    mcq: { q: 'Is LOCKED_OUT better modelled as a separate state or as a counter inside LOCKED?', options: ['A separate state: it accepts different events (all unlocks refused) and has its own exit condition (time)', 'A counter, because states must not hold data', 'A boolean flag on the door', 'An exception thrown from unlock()'], answer: 0, explain: 'Different allowed behaviour + a distinct exit condition is exactly what makes something a state.' },
    hints: [`<p>Hint 1: Table first: 4 states × 4 events. Most cells are "not allowed"; lock in OPEN is a classic trap.</p>`, `<p>Hint 2: LOCKED_OUT is a state holding <code>lockedUntil</code>. Its unlock() checks time first: before → refuse; after → behave like LOCKED (delegate to a fresh Locked state).</p>`, `<p>Hint 3: Keep the wrong-attempt counter in Locked (per locking session) and reset it on success. Pass <code>now</code> into unlock rather than calling the clock inside.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "[OPEN] cannot lock now\n[LOCKED] wrong code (1/3)\n[LOCKED] wrong code (2/3)\n[LOCKED] 3 wrong codes: locked out for 60 s\n[LOCKED_OUT] locked out for 53 s\n[LOCKED_OUT] wrong code (1/3)\n[CLOSED] not locked\nfinal CLOSED\n" }] },
      solution: {
      approach: `<p>Four state classes behind an interface with default "not allowed" methods. Locked counts failures; on the third it returns a <code>LockedOut(now + 60)</code>. LockedOut refuses until the time passes, then delegates to a fresh <code>Locked</code> so the code path for a correct PIN exists in one place.</p>`,
      code: `interface DoorState {
    default DoorState open(SmartDoor d)  { d.say("cannot open now"); return this; }
    default DoorState close(SmartDoor d) { d.say("cannot close now"); return this; }
    default DoorState lock(SmartDoor d)  { d.say("cannot lock now"); return this; }
    default DoorState unlock(SmartDoor d, String code, long now) { d.say("not locked"); return this; }
}
final class OpenDoor implements DoorState {
    public DoorState close(SmartDoor d) { return new ClosedDoor(); }
    public String toString() { return "OPEN"; }
}
final class ClosedDoor implements DoorState {
    public DoorState open(SmartDoor d) { return new OpenDoor(); }
    public DoorState lock(SmartDoor d) { return new LockedDoor(); }
    public String toString() { return "CLOSED"; }
}
final class LockedDoor implements DoorState {
    private int fails = 0;
    public DoorState unlock(SmartDoor d, String code, long now) {
        if (d.codeMatches(code)) return new ClosedDoor();
        if (++fails >= 3) { d.say("3 wrong codes: locked out for 60 s"); return new LockedOut(now + 60); }
        d.say("wrong code (" + fails + "/3)");
        return this;
    }
    public String toString() { return "LOCKED"; }
}
final class LockedOut implements DoorState {
    private final long until;
    LockedOut(long until) { this.until = until; }
    public DoorState unlock(SmartDoor d, String code, long now) {
        if (now < until) { d.say("locked out for " + (until - now) + " s"); return this; }
        return new LockedDoor().unlock(d, code, now);           // time is up: behave like LOCKED
    }
    public String toString() { return "LOCKED_OUT"; }
}

class SmartDoor {
    private DoorState state = new OpenDoor();
    private final String secret;
    SmartDoor(String secret) { this.secret = secret; }
    void open()  { state = state.open(this); }
    void close() { state = state.close(this); }
    void lock()  { state = state.lock(this); }
    void unlock(String code, long now) { state = state.unlock(this, code, now); }
    boolean codeMatches(String c) { return secret.equals(c); }
    void say(String s) { System.out.println("[" + state + "] " + s); }

    public static void main(String[] args) {
        SmartDoor d = new SmartDoor("4321");
        d.lock();                                   // cannot lock an open door
        d.close(); d.lock();
        d.unlock("0000", 1); d.unlock("1111", 2); d.unlock("2222", 3);
        d.unlock("4321", 10);                       // still locked out
        d.unlock("9999", 70);                       // lock-out is over, but this code is wrong
        d.unlock("4321", 71);
        d.unlock("4321", 72);                       // not locked any more
        System.out.println("final " + d.state);     // CLOSED
    }
}`, alt: [
          { lang: 'python', code: `class DoorState:
    """Base state: every event is refused unless a subclass overrides it."""

    def open(self, d: "SmartDoor") -> "DoorState":
        d.say("cannot open now")
        return self

    def close(self, d: "SmartDoor") -> "DoorState":
        d.say("cannot close now")
        return self

    def lock(self, d: "SmartDoor") -> "DoorState":
        d.say("cannot lock now")
        return self

    def unlock(self, d: "SmartDoor", code: str, now: int) -> "DoorState":
        d.say("not locked")
        return self


class OpenDoor(DoorState):
    def close(self, d: "SmartDoor") -> DoorState:
        return ClosedDoor()

    def __str__(self) -> str:
        return "OPEN"


class ClosedDoor(DoorState):
    def open(self, d: "SmartDoor") -> DoorState:
        return OpenDoor()

    def lock(self, d: "SmartDoor") -> DoorState:
        return LockedDoor()

    def __str__(self) -> str:
        return "CLOSED"


class LockedDoor(DoorState):
    def __init__(self) -> None:
        self._fails = 0

    def unlock(self, d: "SmartDoor", code: str, now: int) -> DoorState:
        if d.code_matches(code):
            return ClosedDoor()
        self._fails += 1
        if self._fails >= 3:
            d.say("3 wrong codes: locked out for 60 s")
            return LockedOut(now + 60)
        d.say(f"wrong code ({self._fails}/3)")
        return self

    def __str__(self) -> str:
        return "LOCKED"


class LockedOut(DoorState):
    def __init__(self, until: int) -> None:
        self._until = until

    def unlock(self, d: "SmartDoor", code: str, now: int) -> DoorState:
        if now < self._until:
            d.say(f"locked out for {self._until - now} s")
            return self
        return LockedDoor().unlock(d, code, now)  # time is up: behave like LOCKED

    def __str__(self) -> str:
        return "LOCKED_OUT"


class SmartDoor:
    def __init__(self, secret: str) -> None:
        self.state: DoorState = OpenDoor()
        self._secret = secret

    def open(self) -> None: self.state = self.state.open(self)
    def close(self) -> None: self.state = self.state.close(self)
    def lock(self) -> None: self.state = self.state.lock(self)
    def unlock(self, code: str, now: int) -> None: self.state = self.state.unlock(self, code, now)
    def code_matches(self, c: str) -> bool: return self._secret == c
    def say(self, s: str) -> None: print(f"[{self.state}] {s}")


if __name__ == "__main__":
    d = SmartDoor("4321")
    d.lock()  # cannot lock an open door
    d.close(); d.lock()
    d.unlock("0000", 1); d.unlock("1111", 2); d.unlock("2222", 3)
    d.unlock("4321", 10)  # still locked out
    d.unlock("9999", 70)  # lock-out is over, but this code is wrong
    d.unlock("4321", 71)
    d.unlock("4321", 72)  # not locked any more
    print("final", d.state)  # CLOSED` },
          { lang: 'ts', code: `interface DoorState {
  open(d: SmartDoor): DoorState;
  close(d: SmartDoor): DoorState;
  lock(d: SmartDoor): DoorState;
  unlock(d: SmartDoor, code: string, now: number): DoorState;
  toString(): string;
}

// Interfaces have no default methods, so the "refuse everything" defaults live in a base class.
abstract class BaseDoorState implements DoorState {
  open(d: SmartDoor): DoorState { d.say("cannot open now"); return this; }
  close(d: SmartDoor): DoorState { d.say("cannot close now"); return this; }
  lock(d: SmartDoor): DoorState { d.say("cannot lock now"); return this; }
  unlock(d: SmartDoor, code: string, now: number): DoorState { d.say("not locked"); return this; }
  abstract toString(): string;
}

class OpenDoor extends BaseDoorState {
  override close(d: SmartDoor): DoorState { return new ClosedDoor(); }
  toString(): string { return "OPEN"; }
}
class ClosedDoor extends BaseDoorState {
  override open(d: SmartDoor): DoorState { return new OpenDoor(); }
  override lock(d: SmartDoor): DoorState { return new LockedDoor(); }
  toString(): string { return "CLOSED"; }
}
class LockedDoor extends BaseDoorState {
  private fails = 0;
  override unlock(d: SmartDoor, code: string, now: number): DoorState {
    if (d.codeMatches(code)) return new ClosedDoor();
    if (++this.fails >= 3) { d.say("3 wrong codes: locked out for 60 s"); return new LockedOut(now + 60); }
    d.say(\`wrong code (\${this.fails}/3)\`);
    return this;
  }
  toString(): string { return "LOCKED"; }
}
class LockedOut extends BaseDoorState {
  constructor(private readonly until: number) { super(); }
  override unlock(d: SmartDoor, code: string, now: number): DoorState {
    if (now < this.until) { d.say(\`locked out for \${this.until - now} s\`); return this; }
    return new LockedDoor().unlock(d, code, now); // time is up: behave like LOCKED
  }
  toString(): string { return "LOCKED_OUT"; }
}

class SmartDoor {
  state: DoorState = new OpenDoor();

  constructor(private readonly secret: string) {}

  open(): void { this.state = this.state.open(this); }
  close(): void { this.state = this.state.close(this); }
  lock(): void { this.state = this.state.lock(this); }
  unlock(code: string, now: number): void { this.state = this.state.unlock(this, code, now); }
  codeMatches(c: string): boolean { return this.secret === c; }
  say(s: string): void { console.log(\`[\${this.state}] \${s}\`); }
}

const d = new SmartDoor("4321");
d.lock(); // cannot lock an open door
d.close(); d.lock();
d.unlock("0000", 1); d.unlock("1111", 2); d.unlock("2222", 3);
d.unlock("4321", 10); // still locked out
d.unlock("9999", 70); // lock-out is over, but this code is wrong
d.unlock("4321", 71);
d.unlock("4321", 72); // not locked any more
console.log("final " + d.state); // CLOSED` },
          { lang: 'cpp', code: `class SmartDoor;
struct DoorState;
using StatePtr = unique_ptr<DoorState>;  // nullptr means "stay in this state"

struct DoorState {
    virtual ~DoorState() = default;
    virtual StatePtr open(SmartDoor& d);
    virtual StatePtr close(SmartDoor& d);
    virtual StatePtr lock(SmartDoor& d);
    virtual StatePtr unlock(SmartDoor& d, const string& code, long long now);
    virtual string name() const = 0;
};
struct OpenDoor final : DoorState {
    StatePtr close(SmartDoor& d) override;
    string name() const override { return "OPEN"; }
};
struct ClosedDoor final : DoorState {
    StatePtr open(SmartDoor& d) override;
    StatePtr lock(SmartDoor& d) override;
    string name() const override { return "CLOSED"; }
};
struct LockedDoor final : DoorState {
    StatePtr unlock(SmartDoor& d, const string& code, long long now) override;
    string name() const override { return "LOCKED"; }

private:
    int fails_ = 0;
};
struct LockedOut final : DoorState {
    explicit LockedOut(long long until) : until_(until) {}
    StatePtr unlock(SmartDoor& d, const string& code, long long now) override;
    string name() const override { return "LOCKED_OUT"; }

private:
    long long until_;
};

class SmartDoor {
    StatePtr state_ = make_unique<OpenDoor>();
    string secret_;

    void enter(StatePtr next) { if (next) state_ = move(next); }

public:
    explicit SmartDoor(string secret) : secret_(move(secret)) {}
    void open() { enter(state_->open(*this)); }
    void close() { enter(state_->close(*this)); }
    void lock() { enter(state_->lock(*this)); }
    void unlock(const string& code, long long now) { enter(state_->unlock(*this, code, now)); }
    bool codeMatches(const string& c) const { return secret_ == c; }
    void say(const string& s) const { cout << "[" << state_->name() << "] " << s << "\\n"; }
    string state() const { return state_->name(); }
};

StatePtr DoorState::open(SmartDoor& d) { d.say("cannot open now"); return nullptr; }
StatePtr DoorState::close(SmartDoor& d) { d.say("cannot close now"); return nullptr; }
StatePtr DoorState::lock(SmartDoor& d) { d.say("cannot lock now"); return nullptr; }
StatePtr DoorState::unlock(SmartDoor& d, const string&, long long) { d.say("not locked"); return nullptr; }

StatePtr OpenDoor::close(SmartDoor&) { return make_unique<ClosedDoor>(); }
StatePtr ClosedDoor::open(SmartDoor&) { return make_unique<OpenDoor>(); }
StatePtr ClosedDoor::lock(SmartDoor&) { return make_unique<LockedDoor>(); }
StatePtr LockedDoor::unlock(SmartDoor& d, const string& code, long long now) {
    if (d.codeMatches(code)) return make_unique<ClosedDoor>();
    if (++fails_ >= 3) { d.say("3 wrong codes: locked out for 60 s"); return make_unique<LockedOut>(now + 60); }
    d.say("wrong code (" + to_string(fails_) + "/3)");
    return nullptr;
}
StatePtr LockedOut::unlock(SmartDoor& d, const string& code, long long now) {
    if (now < until_) { d.say("locked out for " + to_string(until_ - now) + " s"); return nullptr; }
    auto fresh = make_unique<LockedDoor>();  // time is up: behave like LOCKED
    StatePtr next = fresh->unlock(d, code, now);
    return next ? move(next) : move(fresh);  // "stay" now means: stay in the fresh LOCKED
}

int main() {
    SmartDoor d("4321");
    d.lock();  // cannot lock an open door
    d.close(); d.lock();
    d.unlock("0000", 1); d.unlock("1111", 2); d.unlock("2222", 3);
    d.unlock("4321", 10);  // still locked out
    d.unlock("9999", 70);  // lock-out is over, but this code is wrong
    d.unlock("4321", 71);
    d.unlock("4321", 72);  // not locked any more
    cout << "final " << d.state() << "\\n";  // CLOSED
}` },
  { lang: 'csharp', code: `
using System;

abstract class DoorState {
    public virtual DoorState Open(SmartDoor d)  { d.Say("cannot open now"); return this; }
    public virtual DoorState Close(SmartDoor d) { d.Say("cannot close now"); return this; }
    public virtual DoorState Lock(SmartDoor d)  { d.Say("cannot lock now"); return this; }
    public virtual DoorState Unlock(SmartDoor d, string code, long now) { d.Say("not locked"); return this; }
}
sealed class OpenDoor : DoorState {
    public override DoorState Close(SmartDoor d) { return new ClosedDoor(); }
    public override string ToString() { return "OPEN"; }
}
sealed class ClosedDoor : DoorState {
    public override DoorState Open(SmartDoor d) { return new OpenDoor(); }
    public override DoorState Lock(SmartDoor d) { return new LockedDoor(); }
    public override string ToString() { return "CLOSED"; }
}
sealed class LockedDoor : DoorState {
    private int fails = 0;
    public override DoorState Unlock(SmartDoor d, string code, long now) {
        if (d.CodeMatches(code)) return new ClosedDoor();
        if (++fails >= 3) { d.Say("3 wrong codes: locked out for 60 s"); return new LockedOut(now + 60); }
        d.Say("wrong code (" + fails + "/3)");
        return this;
    }
    public override string ToString() { return "LOCKED"; }
}
sealed class LockedOut : DoorState {
    private readonly long until;
    public LockedOut(long until) { this.until = until; }
    public override DoorState Unlock(SmartDoor d, string code, long now) {
        if (now < until) { d.Say("locked out for " + (until - now) + " s"); return this; }
        return new LockedDoor().Unlock(d, code, now);            // time is up: behave like LOCKED
    }
    public override string ToString() { return "LOCKED_OUT"; }
}

class SmartDoor {
    private DoorState state = new OpenDoor();
    private readonly string secret;
    public SmartDoor(string secret) { this.secret = secret; }
    public void Open()  { state = state.Open(this); }
    public void Close() { state = state.Close(this); }
    public void Lock()  { state = state.Lock(this); }
    public void Unlock(string code, long now) { state = state.Unlock(this, code, now); }
    public bool CodeMatches(string c) { return secret == c; }
    public void Say(string s) { Console.WriteLine("[" + state + "] " + s); }

    static void Main() {
        SmartDoor d = new SmartDoor("4321");
        d.Lock();                                   // cannot lock an open door
        d.Close(); d.Lock();
        d.Unlock("0000", 1); d.Unlock("1111", 2); d.Unlock("2222", 3);
        d.Unlock("4321", 10);                       // still locked out
        d.Unlock("9999", 70);                       // lock-out is over, but this code is wrong
        d.Unlock("4321", 71);
        d.Unlock("4321", 72);                       // not locked any more
        Console.WriteLine("final " + d.state);      // CLOSED
    }
}` }
        ],
      complexity: `<p>O(1) per event. Lockout costs no timers: it is evaluated lazily from <code>now</code>.</p>`,
      followUps: ['Auto-lock 30 s after the door closes: which state starts the timer and which cancels it?', 'Store failures server-side so resetting the device does not reset the counter.']
    }
  });

  practice.push({
    title: 'Order Status Lifecycle Validator', level: 'Easy', tags: ['enum', 'transition table', 'EnumMap'], companies: ['Flipkart', 'Swiggy', 'Amazon'],
    statement: `<p>An e-commerce order moves through <b>PLACED → PACKED → SHIPPED → DELIVERED</b>. <b>CANCELLED</b> is allowed from PLACED or PACKED only. <b>RETURN_REQUESTED</b> is allowed from DELIVERED only within 7 days of delivery, then <b>RETURNED</b>. Implement <code>Order.moveTo(newStatus, today)</code> that rejects illegal transitions with a clear message and keeps a history. The rules must be readable in one place.</p>`,
    constraints: `Dates as <code>LocalDate</code>. Terminal states: CANCELLED, RETURNED. Support listing the allowed next statuses for the UI.`,
    example: `<p>PLACED → PACKED ✓ → CANCELLED ✓ (allowed from PACKED). But after PACKED → SHIPPED ✓, ${H.c('r', 'CANCELLED ✗ (already shipped)')}. Then SHIPPED → DELIVERED on 1 Mar ✓ → RETURN_REQUESTED on 5 Mar ✓; on 10 Mar ✗ (window closed).</p>`,
    brute: { why: `<p>A string status and <code>if (status == "PLACED" &amp;&amp; next == "PACKED") …</code> chains spread across controller, service and admin tools. The same rule is implemented three times, slightly differently, and the UI cannot ask "what can I do next?".</p>`, code: { lang: 'java', code: `class NaiveOrder {
    String status = "PLACED";
    boolean moveTo(String next) {
        if (status.equals("PLACED") && (next.equals("PACKED") || next.equals("CANCELLED"))) { status = next; return true; }
        if (status.equals("PACKED") && (next.equals("SHIPPED") || next.equals("CANCELLED"))) { status = next; return true; }
        if (status.equals("SHIPPED") && next.equals("DELIVERED")) { status = next; return true; }
        // return window? typo "DELIVERD"? every caller re-implements part of this
        return false;
    }
}`, alt: [{ lang: 'python', code: "class NaiveOrder:\n    def __init__(self):\n        self.status = \"PLACED\"\n\n    def move_to(self, nxt):\n        if self.status == \"PLACED\" and nxt in (\"PACKED\", \"CANCELLED\"): self.status = nxt; return True\n        if self.status == \"PACKED\" and nxt in (\"SHIPPED\", \"CANCELLED\"): self.status = nxt; return True\n        if self.status == \"SHIPPED\" and nxt == \"DELIVERED\": self.status = nxt; return True\n        # return window? typo \"DELIVERD\"? every caller re-implements part of this\n        return False\n" }, { lang: 'ts', code: "class NaiveOrder {\n  status = \"PLACED\";\n  moveTo(next: string): boolean {\n    if (this.status === \"PLACED\" && (next === \"PACKED\" || next === \"CANCELLED\")) { this.status = next; return true; }\n    if (this.status === \"PACKED\" && (next === \"SHIPPED\" || next === \"CANCELLED\")) { this.status = next; return true; }\n    if (this.status === \"SHIPPED\" && next === \"DELIVERED\") { this.status = next; return true; }\n    // return window? typo \"DELIVERD\"? every caller re-implements part of this\n    return false;\n  }\n}\n" }, { lang: 'cpp', code: "class NaiveOrder {\npublic:\n    string status = \"PLACED\";\n    bool moveTo(const string& next) {\n        if (status == \"PLACED\" && (next == \"PACKED\" || next == \"CANCELLED\")) { status = next; return true; }\n        if (status == \"PACKED\" && (next == \"SHIPPED\" || next == \"CANCELLED\")) { status = next; return true; }\n        if (status == \"SHIPPED\" && next == \"DELIVERED\") { status = next; return true; }\n        // return window? typo \"DELIVERD\"? every caller re-implements part of this\n        return false;\n    }\n};\n" }, { lang: 'csharp', code: "class NaiveOrder {\n    public string Status = \"PLACED\";\n    public bool MoveTo(string next) {\n        if (Status == \"PLACED\" && (next == \"PACKED\" || next == \"CANCELLED\")) { Status = next; return true; }\n        if (Status == \"PACKED\" && (next == \"SHIPPED\" || next == \"CANCELLED\")) { Status = next; return true; }\n        if (Status == \"SHIPPED\" && next == \"DELIVERED\") { Status = next; return true; }\n        // return window? typo \"DELIVERD\"? every caller re-implements part of this\n        return false;\n    }\n}\n" }] } },
    mcq: { q: 'Why is a map from each status to its set of allowed next statuses (in Java an EnumMap&lt;Status, EnumSet&lt;Status&gt;&gt;) a good fit here?', options: ['States have little behaviour; the rules are pure "from → allowed to" data that the UI can also read', 'It is faster than a switch in all cases', 'Because State classes cannot be used with enums', 'It removes the need for a date check'], answer: 0, explain: 'When states carry almost no behaviour, a transition table is the clearest single source of truth; extra conditions become guards.' },
    hints: [`<p>Hint 1: Separate the <b>structure</b> (which arrows exist) from <b>guards</b> (the 7-day rule). Structure is a map from status to its set of allowed next statuses (an <code>EnumMap</code> of <code>EnumSet</code>s in Java).</p>`, `<p>Hint 2: <code>allowedNext()</code> returns <code>TABLE.get(status)</code> — free UI support. Terminal states map to an empty set.</p>`, `<p>Hint 3: In moveTo: if the arrow is missing → reject; if target is RETURN_REQUESTED, check <code>today ≤ deliveredOn + 7 days</code>; record deliveredOn when entering DELIVERED; append "A → B" to history.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "allowed now: [RETURN_REQUESTED]\nPLACED -> PACKED\nPACKED -> SHIPPED\nREJECTED SHIPPED -> CANCELLED\nSHIPPED -> DELIVERED\nREJECTED return: window closed on 2026-03-09\nDELIVERED -> RETURN_REQUESTED\nRETURN_REQUESTED -> RETURNED\nREJECTED RETURNED -> PACKED\n" }] },
      solution: {
      approach: `<p>Table-driven: one static map (an <code>EnumMap</code> in Java) holds every legal arrow. One guard handles the time window. The order records the delivery date as an entry action of DELIVERED and keeps an immutable-ish history list.</p>`,
      code: `import java.time.*;
import java.util.*;

enum Status { PLACED, PACKED, SHIPPED, DELIVERED, CANCELLED, RETURN_REQUESTED, RETURNED }

class Order {
    private static final Map<Status, EnumSet<Status>> NEXT = new EnumMap<>(Status.class);
    static {
        NEXT.put(Status.PLACED, EnumSet.of(Status.PACKED, Status.CANCELLED));
        NEXT.put(Status.PACKED, EnumSet.of(Status.SHIPPED, Status.CANCELLED));
        NEXT.put(Status.SHIPPED, EnumSet.of(Status.DELIVERED));
        NEXT.put(Status.DELIVERED, EnumSet.of(Status.RETURN_REQUESTED));
        NEXT.put(Status.RETURN_REQUESTED, EnumSet.of(Status.RETURNED));
        NEXT.put(Status.CANCELLED, EnumSet.noneOf(Status.class));     // terminal
        NEXT.put(Status.RETURNED, EnumSet.noneOf(Status.class));      // terminal
    }
    private Status status = Status.PLACED;
    private LocalDate deliveredOn;
    private final List<String> history = new ArrayList<>();

    Set<Status> allowedNext() { return Collections.unmodifiableSet(NEXT.get(status)); }

    boolean moveTo(Status next, LocalDate today) {
        if (!NEXT.get(status).contains(next)) { history.add("REJECTED " + status + " -> " + next); return false; }
        if (next == Status.RETURN_REQUESTED && today.isAfter(deliveredOn.plusDays(7))) {         // guard
            history.add("REJECTED return: window closed on " + deliveredOn.plusDays(7));
            return false;
        }
        if (next == Status.DELIVERED) deliveredOn = today;                                       // entry action
        history.add(status + " -> " + next);
        status = next;
        return true;
    }
    Status status() { return status; }
    List<String> history() { return history; }

    public static void main(String[] args) {
        Order o = new Order();
        o.moveTo(Status.PACKED, LocalDate.of(2026, 3, 1));
        o.moveTo(Status.SHIPPED, LocalDate.of(2026, 3, 1));
        o.moveTo(Status.CANCELLED, LocalDate.of(2026, 3, 1));          // rejected
        o.moveTo(Status.DELIVERED, LocalDate.of(2026, 3, 2));
        System.out.println("allowed now: " + o.allowedNext());
        o.moveTo(Status.RETURN_REQUESTED, LocalDate.of(2026, 3, 12));  // rejected: > 7 days
        o.moveTo(Status.RETURN_REQUESTED, LocalDate.of(2026, 3, 6));
        o.moveTo(Status.RETURNED, LocalDate.of(2026, 3, 8));
        o.moveTo(Status.PACKED, LocalDate.of(2026, 3, 9));              // rejected: RETURNED is terminal
        o.history().forEach(System.out::println);
    }
}`, alt: [
          { lang: 'python', code: `from datetime import date, timedelta
from enum import Enum


class Status(Enum):
    PLACED = 1
    PACKED = 2
    SHIPPED = 3
    DELIVERED = 4
    CANCELLED = 5
    RETURN_REQUESTED = 6
    RETURNED = 7


S = Status
NEXT: dict[Status, frozenset[Status]] = {
    S.PLACED: frozenset({S.PACKED, S.CANCELLED}),
    S.PACKED: frozenset({S.SHIPPED, S.CANCELLED}),
    S.SHIPPED: frozenset({S.DELIVERED}),
    S.DELIVERED: frozenset({S.RETURN_REQUESTED}),
    S.RETURN_REQUESTED: frozenset({S.RETURNED}),
    S.CANCELLED: frozenset(),  # terminal
    S.RETURNED: frozenset(),  # terminal
}


class Order:
    def __init__(self) -> None:
        self._status = Status.PLACED
        self._delivered_on: date | None = None
        self._history: list[str] = []

    def allowed_next(self) -> list[Status]:
        return sorted(NEXT[self._status], key=lambda s: s.value)  # enum order, read-only copy

    def move_to(self, nxt: Status, today: date) -> bool:
        if nxt not in NEXT[self._status]:
            self._history.append(f"REJECTED {self._status.name} -> {nxt.name}")
            return False
        if nxt is Status.RETURN_REQUESTED and today > self._delivered_on + timedelta(days=7):  # guard
            self._history.append(f"REJECTED return: window closed on {self._delivered_on + timedelta(days=7)}")
            return False
        if nxt is Status.DELIVERED:  # entry action
            self._delivered_on = today
        self._history.append(f"{self._status.name} -> {nxt.name}")
        self._status = nxt
        return True

    @property
    def status(self) -> Status:
        return self._status

    @property
    def history(self) -> list[str]:
        return self._history


if __name__ == "__main__":
    o = Order()
    o.move_to(Status.PACKED, date(2026, 3, 1))
    o.move_to(Status.SHIPPED, date(2026, 3, 1))
    o.move_to(Status.CANCELLED, date(2026, 3, 1))  # rejected
    o.move_to(Status.DELIVERED, date(2026, 3, 2))
    print("allowed now: [" + ", ".join(s.name for s in o.allowed_next()) + "]")
    o.move_to(Status.RETURN_REQUESTED, date(2026, 3, 12))  # rejected: > 7 days
    o.move_to(Status.RETURN_REQUESTED, date(2026, 3, 6))
    o.move_to(Status.RETURNED, date(2026, 3, 8))
    o.move_to(Status.PACKED, date(2026, 3, 9))  # rejected: RETURNED is terminal
    for line in o.history:
        print(line)` },
          { lang: 'ts', code: `const STATUSES = ["PLACED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED"] as const;
type Status = (typeof STATUSES)[number];

const NEXT: Record<Status, readonly Status[]> = {
  PLACED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED"],
  CANCELLED: [], // terminal
  RETURNED: [], // terminal
};

// Dates are UTC calendar days so arithmetic never shifts with the local time zone.
const day = (y: number, m: number, d: number): Date => new Date(Date.UTC(y, m - 1, d));
const plusDays = (d: Date, n: number): Date => new Date(d.getTime() + n * 86_400_000);
const iso = (d: Date): string => d.toISOString().slice(0, 10);

class Order {
  private current: Status = "PLACED";
  private deliveredOn: Date | null = null;
  private readonly log: string[] = [];

  allowedNext(): readonly Status[] { return NEXT[this.current]; }

  moveTo(next: Status, today: Date): boolean {
    if (!NEXT[this.current].includes(next)) {
      this.log.push(\`REJECTED \${this.current} -> \${next}\`);
      return false;
    }
    if (next === "RETURN_REQUESTED" && today > plusDays(this.deliveredOn!, 7)) { // guard
      this.log.push(\`REJECTED return: window closed on \${iso(plusDays(this.deliveredOn!, 7))}\`);
      return false;
    }
    if (next === "DELIVERED") this.deliveredOn = today; // entry action
    this.log.push(\`\${this.current} -> \${next}\`);
    this.current = next;
    return true;
  }
  status(): Status { return this.current; }
  history(): readonly string[] { return this.log; }
}

const o = new Order();
o.moveTo("PACKED", day(2026, 3, 1));
o.moveTo("SHIPPED", day(2026, 3, 1));
o.moveTo("CANCELLED", day(2026, 3, 1)); // rejected
o.moveTo("DELIVERED", day(2026, 3, 2));
console.log(\`allowed now: [\${o.allowedNext().join(", ")}]\`);
o.moveTo("RETURN_REQUESTED", day(2026, 3, 12)); // rejected: > 7 days
o.moveTo("RETURN_REQUESTED", day(2026, 3, 6));
o.moveTo("RETURNED", day(2026, 3, 8));
o.moveTo("PACKED", day(2026, 3, 9)); // rejected: RETURNED is terminal
o.history().forEach((line) => console.log(line));` },
          { lang: 'cpp', code: `using Day = chrono::sys_days;

enum class Status { PLACED, PACKED, SHIPPED, DELIVERED, CANCELLED, RETURN_REQUESTED, RETURNED };

const char* name(Status s) {
    static const char* names[] = {"PLACED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED"};
    return names[static_cast<int>(s)];
}

Day day(int y, unsigned m, unsigned d) { return Day{chrono::year{y} / chrono::month{m} / chrono::day{d}}; }

string iso(Day d) {
    chrono::year_month_day ymd{d};
    char buf[16];
    snprintf(buf, sizeof buf, "%04d-%02u-%02u", int(ymd.year()), unsigned(ymd.month()), unsigned(ymd.day()));
    return buf;
}

class Order {
    inline static const map<Status, set<Status>> NEXT = {
        {Status::PLACED, {Status::PACKED, Status::CANCELLED}},
        {Status::PACKED, {Status::SHIPPED, Status::CANCELLED}},
        {Status::SHIPPED, {Status::DELIVERED}},
        {Status::DELIVERED, {Status::RETURN_REQUESTED}},
        {Status::RETURN_REQUESTED, {Status::RETURNED}},
        {Status::CANCELLED, {}},  // terminal
        {Status::RETURNED, {}},   // terminal
    };
    Status status_ = Status::PLACED;
    Day deliveredOn_{};
    vector<string> history_;

public:
    const set<Status>& allowedNext() const { return NEXT.at(status_); }

    bool moveTo(Status next, Day today) {
        if (!NEXT.at(status_).count(next)) {
            history_.push_back(string("REJECTED ") + name(status_) + " -> " + name(next));
            return false;
        }
        if (next == Status::RETURN_REQUESTED && today > deliveredOn_ + chrono::days{7}) {  // guard
            history_.push_back("REJECTED return: window closed on " + iso(deliveredOn_ + chrono::days{7}));
            return false;
        }
        if (next == Status::DELIVERED) deliveredOn_ = today;  // entry action
        history_.push_back(string(name(status_)) + " -> " + name(next));
        status_ = next;
        return true;
    }
    Status status() const { return status_; }
    const vector<string>& history() const { return history_; }
};

int main() {
    Order o;
    o.moveTo(Status::PACKED, day(2026, 3, 1));
    o.moveTo(Status::SHIPPED, day(2026, 3, 1));
    o.moveTo(Status::CANCELLED, day(2026, 3, 1));  // rejected
    o.moveTo(Status::DELIVERED, day(2026, 3, 2));
    cout << "allowed now: [";
    bool first = true;
    for (Status s : o.allowedNext()) { cout << (first ? "" : ", ") << name(s); first = false; }
    cout << "]\\n";
    o.moveTo(Status::RETURN_REQUESTED, day(2026, 3, 12));  // rejected: > 7 days
    o.moveTo(Status::RETURN_REQUESTED, day(2026, 3, 6));
    o.moveTo(Status::RETURNED, day(2026, 3, 8));
    o.moveTo(Status::PACKED, day(2026, 3, 9));  // rejected: RETURNED is terminal
    for (const auto& line : o.history()) cout << line << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

enum Status { PLACED, PACKED, SHIPPED, DELIVERED, CANCELLED, RETURN_REQUESTED, RETURNED }

class Order {
    private static readonly Dictionary<Status, HashSet<Status>> NEXT = new Dictionary<Status, HashSet<Status>> {
        { Status.PLACED, new HashSet<Status> { Status.PACKED, Status.CANCELLED } },
        { Status.PACKED, new HashSet<Status> { Status.SHIPPED, Status.CANCELLED } },
        { Status.SHIPPED, new HashSet<Status> { Status.DELIVERED } },
        { Status.DELIVERED, new HashSet<Status> { Status.RETURN_REQUESTED } },
        { Status.RETURN_REQUESTED, new HashSet<Status> { Status.RETURNED } },
        { Status.CANCELLED, new HashSet<Status>() },     // terminal
        { Status.RETURNED, new HashSet<Status>() }       // terminal
    };
    private Status status = Status.PLACED;
    private DateTime deliveredOn;
    private readonly List<string> history = new List<string>();

    public IEnumerable<Status> AllowedNext() { return NEXT[status].OrderBy(s => (int)s).ToList(); }

    public bool MoveTo(Status next, DateTime today) {
        if (!NEXT[status].Contains(next)) { history.Add("REJECTED " + status + " -> " + next); return false; }
        if (next == Status.RETURN_REQUESTED && today > deliveredOn.AddDays(7)) {                   // guard
            history.Add("REJECTED return: window closed on " + deliveredOn.AddDays(7).ToString("yyyy-MM-dd"));
            return false;
        }
        if (next == Status.DELIVERED) deliveredOn = today;                                          // entry action
        history.Add(status + " -> " + next);
        status = next;
        return true;
    }
    public Status CurrentStatus() { return status; }
    public List<string> History() { return history; }

    static void Main() {
        Order o = new Order();
        o.MoveTo(Status.PACKED, new DateTime(2026, 3, 1));
        o.MoveTo(Status.SHIPPED, new DateTime(2026, 3, 1));
        o.MoveTo(Status.CANCELLED, new DateTime(2026, 3, 1));          // rejected
        o.MoveTo(Status.DELIVERED, new DateTime(2026, 3, 2));
        Console.WriteLine("allowed now: [" + string.Join(", ", o.AllowedNext()) + "]");
        o.MoveTo(Status.RETURN_REQUESTED, new DateTime(2026, 3, 12));  // rejected: > 7 days
        o.MoveTo(Status.RETURN_REQUESTED, new DateTime(2026, 3, 6));
        o.MoveTo(Status.RETURNED, new DateTime(2026, 3, 8));
        o.MoveTo(Status.PACKED, new DateTime(2026, 3, 9));              // rejected: RETURNED is terminal
        foreach (string h in o.History()) Console.WriteLine(h);
    }
}` }
        ],
      complexity: `<p>O(1) per transition (EnumSet lookup is a bit test). Adding a status = one enum constant + one table row.</p>`,
      followUps: ['Persist with optimistic locking so two services cannot ship and cancel simultaneously.', 'Emit a domain event (OrderShipped) on each transition — where do you hook it?']
    }
  });

  /* ======================= PRACTICE: MEDIUM ======================= */
  practice.push({
    title: 'Coffee Machine with Recipes and Ingredient Inventory', level: 'Medium', tags: ['state pattern', 'inventory', 'machine coding'], companies: ['Swiggy', 'Zomato', 'Uber', 'Amazon'],
    statement: `<p>Build a coffee machine. Recipes: <b>espresso</b> (water 50, beans 18, price 120), <b>latte</b> (water 50, milk 150, beans 18, price 180), <b>cappuccino</b> (water 50, milk 100, beans 18, price 160). States: <b>IDLE</b>, <b>PAID</b> (money inserted), <b>BREWING</b>, <b>NEEDS_REFILL</b> (no drink can be made). Events: <code>pay(amount)</code>, <code>select(drink)</code>, <code>cancel()</code>, <code>refill(ingredient, qty)</code>. Selecting a drink whose ingredients are missing must refuse <i>before</i> charging; when nothing can be brewed, go to NEEDS_REFILL and refund any money.</p>`,
    constraints: `Ingredients in ml/grams as ints. Refill allowed in any state except BREWING. Adding a new drink must not change state classes.`,
    example: `<p>Stock: water 200, milk 120, beans 40. pay 200 → PAID; select latte → ${H.c('r', 'not enough milk (needs 150)')}, stay PAID; select cappuccino → ${H.c('g', 'brew, change 40')} → IDLE. Stock now water 150, milk 20, beans 22. Next espresso possible (beans 22 ≥ 18) → after it beans 4 → ${H.c('y', 'NEEDS_REFILL')}.</p>`,
    brute: { why: `<p>One <code>makeDrink(name, money)</code> with <code>if (name == "latte") { if (milk &gt;= 150 &amp;&amp; …) }</code> per drink, plus status flags. A new drink copies the whole block; the "check before charging" order is easy to get wrong in one copy; refill during brewing is not prevented.</p>`, code: { lang: 'java', code: `class NaiveCoffee {
    int water = 200, milk = 120, beans = 40;
    String make(String name, int money) {
        if (name.equals("latte")) {
            if (money < 180) return "pay more";
            if (milk < 150) return "no milk";            // money handling differs per copy...
            water -= 50; milk -= 150; beans -= 18; return "latte, change " + (money - 180);
        } else if (name.equals("espresso")) {
            if (beans < 18) return "no beans";
            water -= 50; beans -= 18; return "espresso, change " + (money - 120);   // forgot price check!
        }
        return "unknown";
    }
}`, alt: [{ lang: 'python', code: "class NaiveCoffee:\n    def __init__(self):\n        self.water, self.milk, self.beans = 200, 120, 40\n\n    def make(self, name, money):\n        if name == \"latte\":\n            if money < 180: return \"pay more\"\n            if self.milk < 150: return \"no milk\"            # money handling differs per copy...\n            self.water -= 50; self.milk -= 150; self.beans -= 18\n            return f\"latte, change {money - 180}\"\n        elif name == \"espresso\":\n            if self.beans < 18: return \"no beans\"\n            self.water -= 50; self.beans -= 18\n            return f\"espresso, change {money - 120}\"        # forgot price check!\n        return \"unknown\"\n" }, { lang: 'ts', code: "class NaiveCoffee {\n  water = 200; milk = 120; beans = 40;\n  make(name: string, money: number): string {\n    if (name === \"latte\") {\n      if (money < 180) return \"pay more\";\n      if (this.milk < 150) return \"no milk\";            // money handling differs per copy...\n      this.water -= 50; this.milk -= 150; this.beans -= 18; return \"latte, change \" + (money - 180);\n    } else if (name === \"espresso\") {\n      if (this.beans < 18) return \"no beans\";\n      this.water -= 50; this.beans -= 18; return \"espresso, change \" + (money - 120);   // forgot price check!\n    }\n    return \"unknown\";\n  }\n}\n" }, { lang: 'cpp', code: "class NaiveCoffee {\npublic:\n    int water = 200, milk = 120, beans = 40;\n    string make(const string& name, int money) {\n        if (name == \"latte\") {\n            if (money < 180) return \"pay more\";\n            if (milk < 150) return \"no milk\";            // money handling differs per copy...\n            water -= 50; milk -= 150; beans -= 18; return \"latte, change \" + to_string(money - 180);\n        } else if (name == \"espresso\") {\n            if (beans < 18) return \"no beans\";\n            water -= 50; beans -= 18; return \"espresso, change \" + to_string(money - 120);   // forgot price check!\n        }\n        return \"unknown\";\n    }\n};\n" }, { lang: 'csharp', code: "class NaiveCoffee {\n    public int Water = 200, Milk = 120, Beans = 40;\n    public string Make(string name, int money) {\n        if (name == \"latte\") {\n            if (money < 180) return \"pay more\";\n            if (Milk < 150) return \"no milk\";            // money handling differs per copy...\n            Water -= 50; Milk -= 150; Beans -= 18; return \"latte, change \" + (money - 180);\n        } else if (name == \"espresso\") {\n            if (Beans < 18) return \"no beans\";\n            Water -= 50; Beans -= 18; return \"espresso, change \" + (money - 120);   // forgot price check!\n        }\n        return \"unknown\";\n    }\n}\n" }] } },
    mcq: { q: 'Where should recipes live so that adding "mocha" needs no state-class changes?', options: ['In data: a map from drink name to a Recipe value object (ingredients + price)', 'One State class per drink', 'In the PAID state as if/else', 'In an enum switch inside BREWING'], answer: 0, explain: 'Drinks are data, states are behaviour. Mixing them makes every new drink a code change across states.' },
    hints: [`<p>Hint 1: States describe the machine's mode (IDLE, PAID, BREWING, NEEDS_REFILL); drinks are <b>data</b> (a Recipe value object: ingredients map + price).</p>`, `<p>Hint 2: PAID.select runs checks in order: known drink → enough money → enough ingredients (Inventory.canMake) → BREWING → consume + change → next state is NEEDS_REFILL if no recipe can be made, else IDLE.</p>`, `<p>Hint 3: Entering NEEDS_REFILL refunds the balance. refill() is accepted in IDLE/PAID/NEEDS_REFILL; in NEEDS_REFILL it re-checks and returns to IDLE if any drink is possible.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "[PAID] not enough milk, pick another\n[BREWING] enjoy your cappuccino, change 40\n[BREWING] enjoy your espresso\nstate NEEDS_REFILL, stock {beans=4, milk=20, water=100}\nafter refill: IDLE\n[IDLE] pay first\n[IDLE] nothing to cancel\n[PAID] unknown drink\n[PAID] insert 70 more\n[PAID] refund 50\nfinal IDLE balance 0\n" }] },
      solution: {
      approach: `<p>States as an enum with behaviour; recipes and inventory as data. The machine's helper <code>anyDrinkPossible()</code> decides between IDLE and NEEDS_REFILL after each brew and after each refill. Ingredient checks happen before money is kept, so a refused drink never costs anything.</p>`,
      code: `import java.util.*;

record Recipe(int price, Map<String, Integer> needs) {}

enum CoffeeState {
    IDLE {
        CoffeeState pay(CoffeeMachine m, int amt) { m.addBalance(amt); return PAID; }
    },
    PAID {
        CoffeeState pay(CoffeeMachine m, int amt) { m.addBalance(amt); return PAID; }
        CoffeeState select(CoffeeMachine m, String drink) {
            Recipe r = m.recipe(drink);
            if (r == null) { m.say("unknown drink"); return PAID; }
            if (m.balance() < r.price()) { m.say("insert " + (r.price() - m.balance()) + " more"); return PAID; }
            String missing = m.missingFor(r);
            if (missing != null) { m.say("not enough " + missing + ", pick another"); return PAID; }
            m.brew(drink, r);                                   // BREWING happens here (synchronous demo)
            return m.anyDrinkPossible() ? IDLE : NEEDS_REFILL.enter(m);
        }
        CoffeeState cancel(CoffeeMachine m) { m.refund(); return IDLE; }
    },
    BREWING {
        CoffeeState refill(CoffeeMachine m, String ing, int qty) { m.say("wait, brewing"); return BREWING; }
    },
    NEEDS_REFILL {
        CoffeeState pay(CoffeeMachine m, int amt) { m.say("needs refill, money returned: " + amt); return NEEDS_REFILL; }
        CoffeeState refill(CoffeeMachine m, String ing, int qty) { m.addStock(ing, qty); return m.anyDrinkPossible() ? IDLE : NEEDS_REFILL; }
    };

    CoffeeState pay(CoffeeMachine m, int amt) { m.say("cannot pay now"); return this; }
    CoffeeState select(CoffeeMachine m, String d) { m.say("pay first"); return this; }
    CoffeeState cancel(CoffeeMachine m) { m.say("nothing to cancel"); return this; }
    CoffeeState refill(CoffeeMachine m, String ing, int qty) { m.addStock(ing, qty); return this; }
    CoffeeState enter(CoffeeMachine m) { m.refund(); return this; }        // entry action
}

class CoffeeMachine {
    private CoffeeState state = CoffeeState.IDLE;
    private int balance;
    private final Map<String, Integer> stock = new TreeMap<>();      // sorted: stable printing
    private final Map<String, Recipe> recipes = new LinkedHashMap<>();

    CoffeeMachine() {
        recipes.put("espresso", new Recipe(120, needs("water", 50, "beans", 18)));
        recipes.put("latte", new Recipe(180, needs("water", 50, "milk", 150, "beans", 18)));
        recipes.put("cappuccino", new Recipe(160, needs("water", 50, "milk", 100, "beans", 18)));
    }
    /** Ordered on purpose: the first missing ingredient reported must not change from run to run. */
    private static Map<String, Integer> needs(Object... kv) {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], (Integer) kv[i + 1]);
        return m;
    }
    void pay(int amt)                     { state = state.pay(this, amt); }
    void select(String d)                 { state = state.select(this, d); }
    void cancel()                         { state = state.cancel(this); }
    void refill(String ing, int qty)      { state = state.refill(this, ing, qty); }

    Recipe recipe(String d)               { return recipes.get(d); }
    int balance()                         { return balance; }
    void addBalance(int a)                { balance += a; }
    void addStock(String ing, int q)      { stock.merge(ing, q, Integer::sum); }
    void refund()                         { if (balance > 0) say("refund " + balance); balance = 0; }
    String missingFor(Recipe r) {
        for (Map.Entry<String, Integer> e : r.needs().entrySet())
            if (stock.getOrDefault(e.getKey(), 0) < e.getValue()) return e.getKey();
        return null;
    }
    boolean anyDrinkPossible()            { return recipes.values().stream().anyMatch(r -> missingFor(r) == null); }
    void brew(String drink, Recipe r) {
        state = CoffeeState.BREWING;
        r.needs().forEach((k, v) -> stock.merge(k, -v, Integer::sum));
        int change = balance - r.price();
        balance = 0;
        say("enjoy your " + drink + (change > 0 ? ", change " + change : ""));
    }
    void say(String s) { System.out.println("[" + state + "] " + s); }

    public static void main(String[] args) {
        CoffeeMachine m = new CoffeeMachine();
        m.refill("water", 200); m.refill("milk", 120); m.refill("beans", 40);
        m.pay(200); m.select("latte"); m.select("cappuccino");
        m.pay(120); m.select("espresso");
        System.out.println("state " + m.state + ", stock " + m.stock);   // NEEDS_REFILL
        m.refill("beans", 100);
        System.out.println("after refill: " + m.state);                  // IDLE
        m.select("latte");                                               // pay first
        m.cancel();                                                      // nothing to cancel
        m.pay(50); m.select("tea"); m.select("espresso");                // unknown drink; insert 70 more
        m.cancel();                                                      // refund 50
        System.out.println("final " + m.state + " balance " + m.balance());
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Recipe:
    price: int
    needs: dict[str, int]  # insertion order = order of the "missing ingredient" check


class CoffeeState:
    """Default behaviour; each state overrides only the events it reacts to."""

    name = "?"

    def pay(self, m: "CoffeeMachine", amt: int) -> "CoffeeState":
        m.say("cannot pay now")
        return self

    def select(self, m: "CoffeeMachine", drink: str) -> "CoffeeState":
        m.say("pay first")
        return self

    def cancel(self, m: "CoffeeMachine") -> "CoffeeState":
        m.say("nothing to cancel")
        return self

    def refill(self, m: "CoffeeMachine", ing: str, qty: int) -> "CoffeeState":
        m.add_stock(ing, qty)
        return self

    def enter(self, m: "CoffeeMachine") -> "CoffeeState":  # entry action
        m.refund()
        return self


class Idle(CoffeeState):
    name = "IDLE"

    def pay(self, m: "CoffeeMachine", amt: int) -> CoffeeState:
        m.add_balance(amt)
        return PAID


class Paid(CoffeeState):
    name = "PAID"

    def pay(self, m: "CoffeeMachine", amt: int) -> CoffeeState:
        m.add_balance(amt)
        return PAID

    def select(self, m: "CoffeeMachine", drink: str) -> CoffeeState:
        r = m.recipe(drink)
        if r is None:
            m.say("unknown drink")
            return PAID
        if m.balance < r.price:
            m.say(f"insert {r.price - m.balance} more")
            return PAID
        missing = m.missing_for(r)
        if missing is not None:
            m.say(f"not enough {missing}, pick another")
            return PAID
        m.brew(drink, r)  # BREWING happens here (synchronous demo)
        return IDLE if m.any_drink_possible() else NEEDS_REFILL.enter(m)

    def cancel(self, m: "CoffeeMachine") -> CoffeeState:
        m.refund()
        return IDLE


class Brewing(CoffeeState):
    name = "BREWING"

    def refill(self, m: "CoffeeMachine", ing: str, qty: int) -> CoffeeState:
        m.say("wait, brewing")
        return BREWING


class NeedsRefill(CoffeeState):
    name = "NEEDS_REFILL"

    def pay(self, m: "CoffeeMachine", amt: int) -> CoffeeState:
        m.say(f"needs refill, money returned: {amt}")
        return NEEDS_REFILL

    def refill(self, m: "CoffeeMachine", ing: str, qty: int) -> CoffeeState:
        m.add_stock(ing, qty)
        return IDLE if m.any_drink_possible() else NEEDS_REFILL


IDLE, PAID, BREWING, NEEDS_REFILL = Idle(), Paid(), Brewing(), NeedsRefill()


class CoffeeMachine:
    def __init__(self) -> None:
        self.state: CoffeeState = IDLE
        self.balance = 0
        self.stock: dict[str, int] = {}
        self._recipes = {
            "espresso": Recipe(120, {"water": 50, "beans": 18}),
            "latte": Recipe(180, {"water": 50, "milk": 150, "beans": 18}),
            "cappuccino": Recipe(160, {"water": 50, "milk": 100, "beans": 18}),
        }

    def pay(self, amt: int) -> None: self.state = self.state.pay(self, amt)
    def select(self, d: str) -> None: self.state = self.state.select(self, d)
    def cancel(self) -> None: self.state = self.state.cancel(self)
    def refill(self, ing: str, qty: int) -> None: self.state = self.state.refill(self, ing, qty)

    def recipe(self, d: str) -> Recipe | None: return self._recipes.get(d)
    def add_balance(self, a: int) -> None: self.balance += a
    def add_stock(self, ing: str, q: int) -> None: self.stock[ing] = self.stock.get(ing, 0) + q

    def refund(self) -> None:
        if self.balance > 0:
            self.say(f"refund {self.balance}")
        self.balance = 0

    def missing_for(self, r: Recipe) -> str | None:
        return next((k for k, v in r.needs.items() if self.stock.get(k, 0) < v), None)

    def any_drink_possible(self) -> bool:
        return any(self.missing_for(r) is None for r in self._recipes.values())

    def brew(self, drink: str, r: Recipe) -> None:
        self.state = BREWING
        for k, v in r.needs.items():
            self.stock[k] = self.stock.get(k, 0) - v
        change = self.balance - r.price
        self.balance = 0
        self.say(f"enjoy your {drink}" + (f", change {change}" if change > 0 else ""))

    def say(self, s: str) -> None:
        print(f"[{self.state.name}] {s}")

    def stock_text(self) -> str:  # sorted by ingredient, like a TreeMap
        return "{" + ", ".join(f"{k}={v}" for k, v in sorted(self.stock.items())) + "}"


if __name__ == "__main__":
    m = CoffeeMachine()
    m.refill("water", 200); m.refill("milk", 120); m.refill("beans", 40)
    m.pay(200); m.select("latte"); m.select("cappuccino")
    m.pay(120); m.select("espresso")
    print(f"state {m.state.name}, stock {m.stock_text()}")  # NEEDS_REFILL
    m.refill("beans", 100)
    print("after refill:", m.state.name)  # IDLE
    m.select("latte")  # pay first
    m.cancel()  # nothing to cancel
    m.pay(50); m.select("tea"); m.select("espresso")  # unknown drink; insert 70 more
    m.cancel()  # refund 50
    print("final", m.state.name, "balance", m.balance)` },
          { lang: 'ts', code: `interface Recipe {
  readonly price: number;
  readonly needs: ReadonlyMap<string, number>; // insertion order = order of the "missing ingredient" check
}

// Base class holds the default behaviour; each state overrides only the events it reacts to.
abstract class CoffeeState {
  abstract readonly name: string;
  pay(m: CoffeeMachine, amt: number): CoffeeState { m.say("cannot pay now"); return this; }
  select(m: CoffeeMachine, drink: string): CoffeeState { m.say("pay first"); return this; }
  cancel(m: CoffeeMachine): CoffeeState { m.say("nothing to cancel"); return this; }
  refill(m: CoffeeMachine, ing: string, qty: number): CoffeeState { m.addStock(ing, qty); return this; }
  enter(m: CoffeeMachine): CoffeeState { m.refund(); return this; } // entry action
}

class Idle extends CoffeeState {
  readonly name = "IDLE";
  override pay(m: CoffeeMachine, amt: number): CoffeeState { m.addBalance(amt); return PAID; }
}
class Paid extends CoffeeState {
  readonly name = "PAID";
  override pay(m: CoffeeMachine, amt: number): CoffeeState { m.addBalance(amt); return PAID; }
  override select(m: CoffeeMachine, drink: string): CoffeeState {
    const r = m.recipe(drink);
    if (r === undefined) { m.say("unknown drink"); return PAID; }
    if (m.balance < r.price) { m.say(\`insert \${r.price - m.balance} more\`); return PAID; }
    const missing = m.missingFor(r);
    if (missing !== null) { m.say(\`not enough \${missing}, pick another\`); return PAID; }
    m.brew(drink, r); // BREWING happens here (synchronous demo)
    return m.anyDrinkPossible() ? IDLE : NEEDS_REFILL.enter(m);
  }
  override cancel(m: CoffeeMachine): CoffeeState { m.refund(); return IDLE; }
}
class Brewing extends CoffeeState {
  readonly name = "BREWING";
  override refill(m: CoffeeMachine, ing: string, qty: number): CoffeeState { m.say("wait, brewing"); return BREWING; }
}
class NeedsRefill extends CoffeeState {
  readonly name = "NEEDS_REFILL";
  override pay(m: CoffeeMachine, amt: number): CoffeeState { m.say(\`needs refill, money returned: \${amt}\`); return NEEDS_REFILL; }
  override refill(m: CoffeeMachine, ing: string, qty: number): CoffeeState {
    m.addStock(ing, qty);
    return m.anyDrinkPossible() ? IDLE : NEEDS_REFILL;
  }
}
const IDLE = new Idle(), PAID = new Paid(), BREWING = new Brewing(), NEEDS_REFILL = new NeedsRefill();

class CoffeeMachine {
  state: CoffeeState = IDLE;
  balance = 0;
  readonly stock = new Map<string, number>();
  private readonly recipes = new Map<string, Recipe>([
    ["espresso", { price: 120, needs: new Map([["water", 50], ["beans", 18]]) }],
    ["latte", { price: 180, needs: new Map([["water", 50], ["milk", 150], ["beans", 18]]) }],
    ["cappuccino", { price: 160, needs: new Map([["water", 50], ["milk", 100], ["beans", 18]]) }],
  ]);

  pay(amt: number): void { this.state = this.state.pay(this, amt); }
  select(d: string): void { this.state = this.state.select(this, d); }
  cancel(): void { this.state = this.state.cancel(this); }
  refill(ing: string, qty: number): void { this.state = this.state.refill(this, ing, qty); }

  recipe(d: string): Recipe | undefined { return this.recipes.get(d); }
  addBalance(a: number): void { this.balance += a; }
  addStock(ing: string, q: number): void { this.stock.set(ing, (this.stock.get(ing) ?? 0) + q); }
  refund(): void {
    if (this.balance > 0) this.say("refund " + this.balance);
    this.balance = 0;
  }
  missingFor(r: Recipe): string | null {
    for (const [k, v] of r.needs) if ((this.stock.get(k) ?? 0) < v) return k;
    return null;
  }
  anyDrinkPossible(): boolean {
    return [...this.recipes.values()].some((r) => this.missingFor(r) === null);
  }
  brew(drink: string, r: Recipe): void {
    this.state = BREWING;
    for (const [k, v] of r.needs) this.stock.set(k, (this.stock.get(k) ?? 0) - v);
    const change = this.balance - r.price;
    this.balance = 0;
    this.say("enjoy your " + drink + (change > 0 ? ", change " + change : ""));
  }
  say(s: string): void { console.log(\`[\${this.state.name}] \${s}\`); }
  stockText(): string { // sorted by ingredient, like a TreeMap
    return "{" + [...this.stock].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => \`\${k}=\${v}\`).join(", ") + "}";
  }
}

const m = new CoffeeMachine();
m.refill("water", 200); m.refill("milk", 120); m.refill("beans", 40);
m.pay(200); m.select("latte"); m.select("cappuccino");
m.pay(120); m.select("espresso");
console.log(\`state \${m.state.name}, stock \${m.stockText()}\`); // NEEDS_REFILL
m.refill("beans", 100);
console.log("after refill: " + m.state.name); // IDLE
m.select("latte"); // pay first
m.cancel(); // nothing to cancel
m.pay(50); m.select("tea"); m.select("espresso"); // unknown drink; insert 70 more
m.cancel(); // refund 50
console.log(\`final \${m.state.name} balance \${m.balance}\`);` },
          { lang: 'cpp', code: `struct Recipe {
    int price;
    vector<pair<string, int>> needs;  // order = order of the "missing ingredient" check
};

class CoffeeMachine;

// Singletons per state; the machine holds a non-owning pointer to the current one.
struct CoffeeState {
    virtual ~CoffeeState() = default;
    virtual string name() const = 0;
    virtual const CoffeeState* pay(CoffeeMachine& m, int amt) const;
    virtual const CoffeeState* select(CoffeeMachine& m, const string& drink) const;
    virtual const CoffeeState* cancel(CoffeeMachine& m) const;
    virtual const CoffeeState* refill(CoffeeMachine& m, const string& ing, int qty) const;
    virtual const CoffeeState* enter(CoffeeMachine& m) const;  // entry action
};
struct Idle final : CoffeeState {
    static const Idle I;
    string name() const override { return "IDLE"; }
    const CoffeeState* pay(CoffeeMachine& m, int amt) const override;
};
struct Paid final : CoffeeState {
    static const Paid I;
    string name() const override { return "PAID"; }
    const CoffeeState* pay(CoffeeMachine& m, int amt) const override;
    const CoffeeState* select(CoffeeMachine& m, const string& drink) const override;
    const CoffeeState* cancel(CoffeeMachine& m) const override;
};
struct Brewing final : CoffeeState {
    static const Brewing I;
    string name() const override { return "BREWING"; }
    const CoffeeState* refill(CoffeeMachine& m, const string& ing, int qty) const override;
};
struct NeedsRefill final : CoffeeState {
    static const NeedsRefill I;
    string name() const override { return "NEEDS_REFILL"; }
    const CoffeeState* pay(CoffeeMachine& m, int amt) const override;
    const CoffeeState* refill(CoffeeMachine& m, const string& ing, int qty) const override;
};
inline const Idle Idle::I;
inline const Paid Paid::I;
inline const Brewing Brewing::I;
inline const NeedsRefill NeedsRefill::I;

class CoffeeMachine {
    const CoffeeState* state_ = &Idle::I;
    int balance_ = 0;
    map<string, int> stock_;  // sorted: stable printing
    vector<pair<string, Recipe>> recipes_ = {
        {"espresso", {120, {{"water", 50}, {"beans", 18}}}},
        {"latte", {180, {{"water", 50}, {"milk", 150}, {"beans", 18}}}},
        {"cappuccino", {160, {{"water", 50}, {"milk", 100}, {"beans", 18}}}},
    };

public:
    void pay(int amt) { state_ = state_->pay(*this, amt); }
    void select(const string& d) { state_ = state_->select(*this, d); }
    void cancel() { state_ = state_->cancel(*this); }
    void refill(const string& ing, int qty) { state_ = state_->refill(*this, ing, qty); }

    const Recipe* recipe(const string& d) const {
        for (const auto& [name, r] : recipes_) if (name == d) return &r;
        return nullptr;
    }
    int balance() const { return balance_; }
    void addBalance(int a) { balance_ += a; }
    void addStock(const string& ing, int q) { stock_[ing] += q; }
    void refund() {
        if (balance_ > 0) say("refund " + to_string(balance_));
        balance_ = 0;
    }
    optional<string> missingFor(const Recipe& r) const {
        for (const auto& [ing, need] : r.needs) {
            auto it = stock_.find(ing);
            if ((it == stock_.end() ? 0 : it->second) < need) return ing;
        }
        return nullopt;
    }
    bool anyDrinkPossible() const {
        return any_of(recipes_.begin(), recipes_.end(), [&](const auto& e) { return !missingFor(e.second); });
    }
    void brew(const string& drink, const Recipe& r) {
        state_ = &Brewing::I;
        for (const auto& [ing, need] : r.needs) stock_[ing] -= need;
        int change = balance_ - r.price;
        balance_ = 0;
        say("enjoy your " + drink + (change > 0 ? ", change " + to_string(change) : ""));
    }
    void say(const string& s) const { cout << "[" << state_->name() << "] " << s << "\\n"; }
    string stateName() const { return state_->name(); }
    string stockText() const {
        string out = "{";
        for (const auto& [ing, q] : stock_) out += (out.size() > 1 ? ", " : "") + ing + "=" + to_string(q);
        return out + "}";
    }
};

const CoffeeState* CoffeeState::pay(CoffeeMachine& m, int) const { m.say("cannot pay now"); return this; }
const CoffeeState* CoffeeState::select(CoffeeMachine& m, const string&) const { m.say("pay first"); return this; }
const CoffeeState* CoffeeState::cancel(CoffeeMachine& m) const { m.say("nothing to cancel"); return this; }
const CoffeeState* CoffeeState::refill(CoffeeMachine& m, const string& ing, int qty) const { m.addStock(ing, qty); return this; }
const CoffeeState* CoffeeState::enter(CoffeeMachine& m) const { m.refund(); return this; }

const CoffeeState* Idle::pay(CoffeeMachine& m, int amt) const { m.addBalance(amt); return &Paid::I; }

const CoffeeState* Paid::pay(CoffeeMachine& m, int amt) const { m.addBalance(amt); return this; }
const CoffeeState* Paid::select(CoffeeMachine& m, const string& drink) const {
    const Recipe* r = m.recipe(drink);
    if (!r) { m.say("unknown drink"); return this; }
    if (m.balance() < r->price) { m.say("insert " + to_string(r->price - m.balance()) + " more"); return this; }
    if (auto missing = m.missingFor(*r)) { m.say("not enough " + *missing + ", pick another"); return this; }
    m.brew(drink, *r);  // BREWING happens here (synchronous demo)
    return m.anyDrinkPossible() ? static_cast<const CoffeeState*>(&Idle::I) : NeedsRefill::I.enter(m);
}
const CoffeeState* Paid::cancel(CoffeeMachine& m) const { m.refund(); return &Idle::I; }

const CoffeeState* Brewing::refill(CoffeeMachine& m, const string&, int) const { m.say("wait, brewing"); return this; }

const CoffeeState* NeedsRefill::pay(CoffeeMachine& m, int amt) const {
    m.say("needs refill, money returned: " + to_string(amt));
    return this;
}
const CoffeeState* NeedsRefill::refill(CoffeeMachine& m, const string& ing, int qty) const {
    m.addStock(ing, qty);
    return m.anyDrinkPossible() ? static_cast<const CoffeeState*>(&Idle::I) : this;
}

int main() {
    CoffeeMachine m;
    m.refill("water", 200); m.refill("milk", 120); m.refill("beans", 40);
    m.pay(200); m.select("latte"); m.select("cappuccino");
    m.pay(120); m.select("espresso");
    cout << "state " << m.stateName() << ", stock " << m.stockText() << "\\n";  // NEEDS_REFILL
    m.refill("beans", 100);
    cout << "after refill: " << m.stateName() << "\\n";  // IDLE
    m.select("latte");  // pay first
    m.cancel();         // nothing to cancel
    m.pay(50); m.select("tea"); m.select("espresso");  // unknown drink; insert 70 more
    m.cancel();         // refund 50
    cout << "final " << m.stateName() << " balance " << m.balance() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

sealed class Recipe {
    public readonly int Price; public readonly List<KeyValuePair<string, int>> Needs;   // ordered on purpose
    public Recipe(int price, List<KeyValuePair<string, int>> needs) { Price = price; Needs = needs; }
}

/// Type-safe enum State: each constant overrides only the events it handles.
abstract class CoffeeState {
    public static readonly CoffeeState IDLE = new IdleS();
    public static readonly CoffeeState PAID = new PaidS();
    public static readonly CoffeeState BREWING = new BrewingS();
    public static readonly CoffeeState NEEDS_REFILL = new NeedsRefillS();

    private readonly string name;
    private CoffeeState(string name) { this.name = name; }
    public override string ToString() { return name; }

    public virtual CoffeeState Pay(CoffeeMachine m, int amt) { m.Say("cannot pay now"); return this; }
    public virtual CoffeeState Select(CoffeeMachine m, string d) { m.Say("pay first"); return this; }
    public virtual CoffeeState Cancel(CoffeeMachine m) { m.Say("nothing to cancel"); return this; }
    public virtual CoffeeState Refill(CoffeeMachine m, string ing, int qty) { m.AddStock(ing, qty); return this; }
    public CoffeeState Enter(CoffeeMachine m) { m.Refund(); return this; }        // entry action

    sealed class IdleS : CoffeeState {
        public IdleS() : base("IDLE") { }
        public override CoffeeState Pay(CoffeeMachine m, int amt) { m.AddBalance(amt); return PAID; }
    }
    sealed class PaidS : CoffeeState {
        public PaidS() : base("PAID") { }
        public override CoffeeState Pay(CoffeeMachine m, int amt) { m.AddBalance(amt); return PAID; }
        public override CoffeeState Select(CoffeeMachine m, string drink) {
            Recipe r = m.RecipeOf(drink);
            if (r == null) { m.Say("unknown drink"); return PAID; }
            if (m.Balance() < r.Price) { m.Say("insert " + (r.Price - m.Balance()) + " more"); return PAID; }
            string missing = m.MissingFor(r);
            if (missing != null) { m.Say("not enough " + missing + ", pick another"); return PAID; }
            m.Brew(drink, r);                                   // BREWING happens here (synchronous demo)
            return m.AnyDrinkPossible() ? IDLE : NEEDS_REFILL.Enter(m);
        }
        public override CoffeeState Cancel(CoffeeMachine m) { m.Refund(); return IDLE; }
    }
    sealed class BrewingS : CoffeeState {
        public BrewingS() : base("BREWING") { }
        public override CoffeeState Refill(CoffeeMachine m, string ing, int qty) { m.Say("wait, brewing"); return BREWING; }
    }
    sealed class NeedsRefillS : CoffeeState {
        public NeedsRefillS() : base("NEEDS_REFILL") { }
        public override CoffeeState Pay(CoffeeMachine m, int amt) { m.Say("needs refill, money returned: " + amt); return NEEDS_REFILL; }
        public override CoffeeState Refill(CoffeeMachine m, string ing, int qty) { m.AddStock(ing, qty); return m.AnyDrinkPossible() ? IDLE : NEEDS_REFILL; }
    }
}

class CoffeeMachine {
    private CoffeeState state = CoffeeState.IDLE;
    private int balance;
    private readonly SortedDictionary<string, int> stock = new SortedDictionary<string, int>(StringComparer.Ordinal);   // sorted: stable printing
    private readonly List<KeyValuePair<string, Recipe>> recipes = new List<KeyValuePair<string, Recipe>>();

    public CoffeeMachine() {
        recipes.Add(new KeyValuePair<string, Recipe>("espresso", new Recipe(120, Needs("water", 50, "beans", 18))));
        recipes.Add(new KeyValuePair<string, Recipe>("latte", new Recipe(180, Needs("water", 50, "milk", 150, "beans", 18))));
        recipes.Add(new KeyValuePair<string, Recipe>("cappuccino", new Recipe(160, Needs("water", 50, "milk", 100, "beans", 18))));
    }
    /// Ordered on purpose: the first missing ingredient reported must not change from run to run.
    private static List<KeyValuePair<string, int>> Needs(params object[] kv) {
        List<KeyValuePair<string, int>> m = new List<KeyValuePair<string, int>>();
        for (int i = 0; i < kv.Length; i += 2) m.Add(new KeyValuePair<string, int>((string)kv[i], (int)kv[i + 1]));
        return m;
    }
    public void Pay(int amt)                     { state = state.Pay(this, amt); }
    public void Select(string d)                 { state = state.Select(this, d); }
    public void Cancel()                         { state = state.Cancel(this); }
    public void Refill(string ing, int qty)      { state = state.Refill(this, ing, qty); }

    public Recipe RecipeOf(string d)             { foreach (var kv in recipes) if (kv.Key == d) return kv.Value; return null; }
    public int Balance()                         { return balance; }
    public void AddBalance(int a)                { balance += a; }
    public void AddStock(string ing, int q)      { int v; stock.TryGetValue(ing, out v); stock[ing] = v + q; }
    public void Refund()                         { if (balance > 0) Say("refund " + balance); balance = 0; }
    public string MissingFor(Recipe r) {
        foreach (var e in r.Needs) { int have; stock.TryGetValue(e.Key, out have); if (have < e.Value) return e.Key; }
        return null;
    }
    public bool AnyDrinkPossible()               { return recipes.Any(kv => MissingFor(kv.Value) == null); }
    public void Brew(string drink, Recipe r) {
        state = CoffeeState.BREWING;
        foreach (var kv in r.Needs) stock[kv.Key] -= kv.Value;
        int change = balance - r.Price;
        balance = 0;
        Say("enjoy your " + drink + (change > 0 ? ", change " + change : ""));
    }
    public void Say(string s) { Console.WriteLine("[" + state + "] " + s); }
    string StockText() { return "{" + string.Join(", ", stock.Select(kv => kv.Key + "=" + kv.Value)) + "}"; }

    static void Main() {
        CoffeeMachine m = new CoffeeMachine();
        m.Refill("water", 200); m.Refill("milk", 120); m.Refill("beans", 40);
        m.Pay(200); m.Select("latte"); m.Select("cappuccino");
        m.Pay(120); m.Select("espresso");
        Console.WriteLine("state " + m.state + ", stock " + m.StockText());   // NEEDS_REFILL
        m.Refill("beans", 100);
        Console.WriteLine("after refill: " + m.state);                       // IDLE
        m.Select("latte");                                                   // pay first
        m.Cancel();                                                          // nothing to cancel
        m.Pay(50); m.Select("tea"); m.Select("espresso");                    // unknown drink; insert 70 more
        m.Cancel();                                                          // refund 50
        Console.WriteLine("final " + m.state + " balance " + m.Balance());
    }
}` }
        ],
      complexity: `<p>Each event is O(R · I) at worst (recipes × ingredients) for the refill check — tiny. New drink = one map entry.</p>`,
      followUps: ['Brewing takes 40 s: make BREWING asynchronous with a BREW_DONE event and a timeout.', 'Show only the drinks that can currently be made on the screen — which method already gives you that?']
    }
  });

  practice.push({
    title: 'ATM: PIN Lockout Across ATMs and Daily Withdrawal Limit', level: 'Medium', tags: ['atm', 'bank service', 'state per card'], companies: ['Goldman Sachs', 'JPMorgan', 'Paytm'],
    statement: `<p>Implement the bank-side <code>CardAuthService</code> used by every ATM. Each card is <b>ACTIVE</b> or <b>BLOCKED</b>. <code>verifyPin(card, pin)</code>: 3 consecutive wrong PINs (across any ATMs) → BLOCKED; a correct PIN resets the counter. BLOCKED cards fail every call until <code>adminUnblock(card)</code>. <code>authorizeWithdrawal(card, amount, date)</code> enforces a daily limit of ₹25,000 that resets when the date changes, and returns a reason on failure.</p>`,
    constraints: `Up to 10<sup>6</sup> cards; many ATMs call concurrently, so methods must be thread-safe per card.`,
    example: `<p>Wrong PIN at ATM-1, wrong at ATM-2, wrong at ATM-3 → ${H.c('r', 'BLOCKED')} (the counter is per card, not per ATM). Unblock. Withdraw 20,000 on 1 Jun ✓, 6,000 on 1 Jun ${H.c('r', 'DAILY_LIMIT')}, 6,000 on 2 Jun ${H.c('g', '✓ (new day)')}.</p>`,
    brute: { why: `<p>Counting wrong PINs inside each ATM object: a thief tries 2 PINs at each of 50 ATMs and never gets blocked. Storing "withdrawn today" without the date means the limit never resets (or a midnight job must reset millions of rows).</p>`, code: { lang: 'java', code: `class PerAtmCounter {
    int wrong = 0;                                   // lives in ONE ATM: a thief just walks to the next ATM
    boolean verify(String pin, String real) {
        if (pin.equals(real)) { wrong = 0; return true; }
        wrong++;
        return false;
    }
}`, alt: [{ lang: 'python', code: "class PerAtmCounter:\n    def __init__(self):\n        self.wrong = 0                               # lives in ONE ATM: a thief just walks to the next ATM\n\n    def verify(self, pin, real):\n        if pin == real:\n            self.wrong = 0\n            return True\n        self.wrong += 1\n        return False\n" }, { lang: 'ts', code: "class PerAtmCounter {\n  wrong = 0;                                   // lives in ONE ATM: a thief just walks to the next ATM\n  verify(pin: string, real: string): boolean {\n    if (pin === real) { this.wrong = 0; return true; }\n    this.wrong++;\n    return false;\n  }\n}\n" }, { lang: 'cpp', code: "class PerAtmCounter {\npublic:\n    int wrong = 0;                                   // lives in ONE ATM: a thief just walks to the next ATM\n    bool verify(const string& pin, const string& real) {\n        if (pin == real) { wrong = 0; return true; }\n        wrong++;\n        return false;\n    }\n};\n" }, { lang: 'csharp', code: "class PerAtmCounter {\n    public int Wrong = 0;                                // lives in ONE ATM: a thief just walks to the next ATM\n    public bool Verify(string pin, string real) {\n        if (pin == real) { Wrong = 0; return true; }\n        Wrong++;\n        return false;\n    }\n}\n" }] } },
    mcq: { q: 'How do you reset the daily limit without a midnight batch job?', options: ['Store (date, amountToday) per card; if the stored date differs from today, treat amountToday as 0', 'Reset all rows at midnight with a cron job', 'Never reset it', 'Keep the limit in the ATM'], answer: 0, explain: 'Lazy reset keyed by date is O(1), has no batch job and no midnight race.' },
    hints: [`<p>Hint 1: The state belongs to the <b>card at the bank</b>: status, failed attempts, and (date, withdrawnToday). Make it a small class per card.</p>`, `<p>Hint 2: Use a thread-safe map from card to CardAccount (<code>ConcurrentHashMap</code> in Java, a dict plus a lock in Python, a mutex-protected map in C++) and lock the CardAccount object so two ATMs updating the same card are serialized, while different cards run in parallel.</p>`, `<p>Hint 3: Lazy reset: if <code>lastDate != date</code>, set withdrawnToday = 0 and lastDate = date before checking. Return an enum result: OK, WRONG_PIN, BLOCKED, DAILY_LIMIT.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "WRONG_PIN WRONG_PIN BLOCKED\ncorrect PIN while blocked: BLOCKED\nOK\nDAILY_LIMIT\nOK\nUNKNOWN_CARD UNKNOWN_CARD\nWRONG_PIN OK WRONG_PIN WRONG_PIN\nOK DAILY_LIMIT\nBLOCKED BLOCKED\n" }] },
      solution: {
      approach: `<p>Per-card state object at the bank (ACTIVE/BLOCKED + counters), stored in a concurrent map and locked per card. PIN failures are counted globally per card; the daily limit uses a lazy, date-keyed reset. Results are an enum so ATMs can show the right screen.</p>`,
      code: `import java.time.*;
import java.util.*;
import java.util.concurrent.*;

enum AuthResult { OK, WRONG_PIN, BLOCKED, DAILY_LIMIT, UNKNOWN_CARD }

class CardAccount {
    final String pin;
    boolean blocked;
    int wrongPins;
    LocalDate lastDate;
    long withdrawnToday;
    CardAccount(String pin) { this.pin = pin; }
}

class CardAuthService {
    static final int MAX_WRONG = 3;
    static final long DAILY_LIMIT = 25_000;
    private final ConcurrentHashMap<String, CardAccount> cards = new ConcurrentHashMap<>();

    void register(String card, String pin) { cards.put(card, new CardAccount(pin)); }

    AuthResult verifyPin(String card, String pin) {
        CardAccount a = cards.get(card);
        if (a == null) return AuthResult.UNKNOWN_CARD;
        synchronized (a) {                                      // per-card lock: ATMs on other cards are not blocked
            if (a.blocked) return AuthResult.BLOCKED;
            if (a.pin.equals(pin)) { a.wrongPins = 0; return AuthResult.OK; }
            if (++a.wrongPins >= MAX_WRONG) { a.blocked = true; return AuthResult.BLOCKED; }
            return AuthResult.WRONG_PIN;
        }
    }

    AuthResult authorizeWithdrawal(String card, long amount, LocalDate date) {
        CardAccount a = cards.get(card);
        if (a == null) return AuthResult.UNKNOWN_CARD;
        synchronized (a) {
            if (a.blocked) return AuthResult.BLOCKED;
            if (!date.equals(a.lastDate)) { a.lastDate = date; a.withdrawnToday = 0; }   // lazy daily reset
            if (a.withdrawnToday + amount > DAILY_LIMIT) return AuthResult.DAILY_LIMIT;
            a.withdrawnToday += amount;
            return AuthResult.OK;
        }
    }

    void adminUnblock(String card) {
        CardAccount a = cards.get(card);
        if (a == null) return;                                  // unknown card: nothing to unblock
        synchronized (a) { a.blocked = false; a.wrongPins = 0; }
    }

    public static void main(String[] args) {
        CardAuthService s = new CardAuthService();
        s.register("C1", "1234");
        System.out.println(s.verifyPin("C1", "1111") + " " + s.verifyPin("C1", "2222") + " " + s.verifyPin("C1", "3333"));
        System.out.println("correct PIN while blocked: " + s.verifyPin("C1", "1234"));    // BLOCKED
        s.adminUnblock("C1");
        LocalDate d1 = LocalDate.of(2026, 6, 1);
        System.out.println(s.authorizeWithdrawal("C1", 20_000, d1));                    // OK
        System.out.println(s.authorizeWithdrawal("C1", 6_000, d1));                     // DAILY_LIMIT
        System.out.println(s.authorizeWithdrawal("C1", 6_000, d1.plusDays(1)));         // OK
        System.out.println(s.verifyPin("NOPE", "0000") + " " + s.authorizeWithdrawal("NOPE", 1, d1));  // UNKNOWN_CARD UNKNOWN_CARD
        s.adminUnblock("NOPE");                                                         // no-op, no crash
        s.register("C2", "9999");
        System.out.println(s.verifyPin("C2", "0") + " " + s.verifyPin("C2", "9999") + " " + s.verifyPin("C2", "1") + " " + s.verifyPin("C2", "2"));  // success resets the counter
        System.out.println(s.authorizeWithdrawal("C2", 25_000, d1) + " " + s.authorizeWithdrawal("C2", 1, d1));  // exactly the limit is allowed
        System.out.println(s.verifyPin("C2", "3") + " " + s.authorizeWithdrawal("C2", 1, d1.plusDays(1)));       // third wrong PIN blocks the card
    }
}`, alt: [
          { lang: 'python', code: `import threading
from dataclasses import dataclass, field
from datetime import date, timedelta
from enum import Enum
from typing import Optional


class AuthResult(Enum):
    OK = 1
    WRONG_PIN = 2
    BLOCKED = 3
    DAILY_LIMIT = 4
    UNKNOWN_CARD = 5


@dataclass
class CardAccount:
    pin: str
    blocked: bool = False
    wrong_pins: int = 0
    last_date: Optional[date] = None
    withdrawn_today: int = 0
    lock: threading.Lock = field(default_factory=threading.Lock)  # per-card lock


class CardAuthService:
    MAX_WRONG = 3
    DAILY_LIMIT = 25_000

    def __init__(self) -> None:
        self._cards: dict[str, CardAccount] = {}  # dict operations are atomic under the GIL

    def register(self, card: str, pin: str) -> None:
        self._cards[card] = CardAccount(pin)

    def verify_pin(self, card: str, pin: str) -> AuthResult:
        a = self._cards.get(card)
        if a is None:
            return AuthResult.UNKNOWN_CARD
        with a.lock:  # ATMs working on other cards are not blocked
            if a.blocked:
                return AuthResult.BLOCKED
            if a.pin == pin:
                a.wrong_pins = 0
                return AuthResult.OK
            a.wrong_pins += 1
            if a.wrong_pins >= self.MAX_WRONG:
                a.blocked = True
                return AuthResult.BLOCKED
            return AuthResult.WRONG_PIN

    def authorize_withdrawal(self, card: str, amount: int, on: date) -> AuthResult:
        a = self._cards.get(card)
        if a is None:
            return AuthResult.UNKNOWN_CARD
        with a.lock:
            if a.blocked:
                return AuthResult.BLOCKED
            if on != a.last_date:  # lazy daily reset
                a.last_date = on
                a.withdrawn_today = 0
            if a.withdrawn_today + amount > self.DAILY_LIMIT:
                return AuthResult.DAILY_LIMIT
            a.withdrawn_today += amount
            return AuthResult.OK

    def admin_unblock(self, card: str) -> None:
        a = self._cards.get(card)
        if a is None:  # unknown card: nothing to unblock
            return
        with a.lock:
            a.blocked = False
            a.wrong_pins = 0


if __name__ == "__main__":
    s = CardAuthService()
    s.register("C1", "1234")
    r1, r2, r3 = s.verify_pin("C1", "1111"), s.verify_pin("C1", "2222"), s.verify_pin("C1", "3333")
    print(r1.name, r2.name, r3.name)
    print("correct PIN while blocked:", s.verify_pin("C1", "1234").name)  # BLOCKED
    s.admin_unblock("C1")
    d1 = date(2026, 6, 1)
    print(s.authorize_withdrawal("C1", 20_000, d1).name)  # OK
    print(s.authorize_withdrawal("C1", 6_000, d1).name)  # DAILY_LIMIT
    print(s.authorize_withdrawal("C1", 6_000, d1 + timedelta(days=1)).name)  # OK
    print(s.verify_pin("NOPE", "0000").name, s.authorize_withdrawal("NOPE", 1, d1).name)  # UNKNOWN_CARD UNKNOWN_CARD
    s.admin_unblock("NOPE")  # no-op, no crash
    s.register("C2", "9999")
    print(*(s.verify_pin("C2", p).name for p in ("0", "9999", "1", "2")))  # success resets the counter
    print(s.authorize_withdrawal("C2", 25_000, d1).name, s.authorize_withdrawal("C2", 1, d1).name)  # exactly the limit is allowed
    print(s.verify_pin("C2", "3").name, s.authorize_withdrawal("C2", 1, d1 + timedelta(days=1)).name)  # third wrong PIN blocks the card` },
          { lang: 'ts', code: `type AuthResult = "OK" | "WRONG_PIN" | "BLOCKED" | "DAILY_LIMIT" | "UNKNOWN_CARD";

class CardAccount {
  blocked = false;
  wrongPins = 0;
  lastDate: string | null = null;
  withdrawnToday = 0;
  constructor(readonly pin: string) {}
}

// Dates are ISO strings (2026-06-01): equal days compare equal, no time-zone surprises.
const plusDays = (iso: string, n: number): string =>
  new Date(Date.parse(iso + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

class CardAuthService {
  static readonly MAX_WRONG = 3;
  static readonly DAILY_LIMIT = 25_000;
  // One JS thread: each method runs to completion, so no per-card lock is needed here.
  // With worker threads or a shared database, this is where the per-card lock would go.
  private readonly cards = new Map<string, CardAccount>();

  register(card: string, pin: string): void { this.cards.set(card, new CardAccount(pin)); }

  verifyPin(card: string, pin: string): AuthResult {
    const a = this.cards.get(card);
    if (a === undefined) return "UNKNOWN_CARD";
    if (a.blocked) return "BLOCKED";
    if (a.pin === pin) { a.wrongPins = 0; return "OK"; }
    if (++a.wrongPins >= CardAuthService.MAX_WRONG) { a.blocked = true; return "BLOCKED"; }
    return "WRONG_PIN";
  }

  authorizeWithdrawal(card: string, amount: number, date: string): AuthResult {
    const a = this.cards.get(card);
    if (a === undefined) return "UNKNOWN_CARD";
    if (a.blocked) return "BLOCKED";
    if (date !== a.lastDate) { a.lastDate = date; a.withdrawnToday = 0; } // lazy daily reset
    if (a.withdrawnToday + amount > CardAuthService.DAILY_LIMIT) return "DAILY_LIMIT";
    a.withdrawnToday += amount;
    return "OK";
  }

  adminUnblock(card: string): void {
    const a = this.cards.get(card);
    if (a === undefined) return; // unknown card: nothing to unblock
    a.blocked = false;
    a.wrongPins = 0;
  }
}

const s = new CardAuthService();
s.register("C1", "1234");
const r1 = s.verifyPin("C1", "1111"), r2 = s.verifyPin("C1", "2222"), r3 = s.verifyPin("C1", "3333");
console.log(\`\${r1} \${r2} \${r3}\`);
console.log("correct PIN while blocked: " + s.verifyPin("C1", "1234")); // BLOCKED
s.adminUnblock("C1");
const d1 = "2026-06-01";
console.log(s.authorizeWithdrawal("C1", 20_000, d1)); // OK
console.log(s.authorizeWithdrawal("C1", 6_000, d1)); // DAILY_LIMIT
console.log(s.authorizeWithdrawal("C1", 6_000, plusDays(d1, 1))); // OK
console.log(s.verifyPin("NOPE", "0000") + " " + s.authorizeWithdrawal("NOPE", 1, d1)); // UNKNOWN_CARD UNKNOWN_CARD
s.adminUnblock("NOPE"); // no-op, no crash
s.register("C2", "9999");
console.log(["0", "9999", "1", "2"].map((p) => s.verifyPin("C2", p)).join(" ")); // success resets the counter
console.log(s.authorizeWithdrawal("C2", 25_000, d1) + " " + s.authorizeWithdrawal("C2", 1, d1)); // exactly the limit is allowed
console.log(s.verifyPin("C2", "3") + " " + s.authorizeWithdrawal("C2", 1, plusDays(d1, 1))); // third wrong PIN blocks the card` },
          { lang: 'cpp', code: `enum class AuthResult { OK, WRONG_PIN, BLOCKED, DAILY_LIMIT, UNKNOWN_CARD };

const char* name(AuthResult r) {
    static const char* names[] = {"OK", "WRONG_PIN", "BLOCKED", "DAILY_LIMIT", "UNKNOWN_CARD"};
    return names[static_cast<int>(r)];
}

struct CardAccount {
    explicit CardAccount(string pin) : pin(move(pin)) {}
    const string pin;
    bool blocked = false;
    int wrongPins = 0;
    optional<chrono::sys_days> lastDate;
    long long withdrawnToday = 0;
    mutex lock;  // per-card lock: ATMs working on other cards are not blocked
};

class CardAuthService {
    static constexpr int MAX_WRONG = 3;
    static constexpr long long DAILY_LIMIT = 25'000;
    mutable shared_mutex mapLock_;  // protects the map itself; accounts are never removed
    map<string, unique_ptr<CardAccount>> cards_;

    CardAccount* find(const string& card) const {
        shared_lock g(mapLock_);
        auto it = cards_.find(card);
        return it == cards_.end() ? nullptr : it->second.get();
    }

public:
    void registerCard(const string& card, const string& pin) {
        unique_lock g(mapLock_);
        cards_[card] = make_unique<CardAccount>(pin);
    }

    AuthResult verifyPin(const string& card, const string& pin) {
        CardAccount* a = find(card);
        if (!a) return AuthResult::UNKNOWN_CARD;
        lock_guard g(a->lock);
        if (a->blocked) return AuthResult::BLOCKED;
        if (a->pin == pin) { a->wrongPins = 0; return AuthResult::OK; }
        if (++a->wrongPins >= MAX_WRONG) { a->blocked = true; return AuthResult::BLOCKED; }
        return AuthResult::WRONG_PIN;
    }

    AuthResult authorizeWithdrawal(const string& card, long long amount, chrono::sys_days date) {
        CardAccount* a = find(card);
        if (!a) return AuthResult::UNKNOWN_CARD;
        lock_guard g(a->lock);
        if (a->blocked) return AuthResult::BLOCKED;
        if (a->lastDate != date) { a->lastDate = date; a->withdrawnToday = 0; }  // lazy daily reset
        if (a->withdrawnToday + amount > DAILY_LIMIT) return AuthResult::DAILY_LIMIT;
        a->withdrawnToday += amount;
        return AuthResult::OK;
    }

    void adminUnblock(const string& card) {
        CardAccount* a = find(card);
        if (!a) return;  // unknown card: nothing to unblock
        lock_guard g(a->lock);
        a->blocked = false;
        a->wrongPins = 0;
    }
};

int main() {
    using chrono::sys_days;
    CardAuthService s;
    s.registerCard("C1", "1234");
    auto r1 = s.verifyPin("C1", "1111"), r2 = s.verifyPin("C1", "2222"), r3 = s.verifyPin("C1", "3333");
    cout << name(r1) << " " << name(r2) << " " << name(r3) << "\\n";
    cout << "correct PIN while blocked: " << name(s.verifyPin("C1", "1234")) << "\\n";  // BLOCKED
    s.adminUnblock("C1");
    sys_days d1 = chrono::year{2026} / 6 / 1;
    cout << name(s.authorizeWithdrawal("C1", 20'000, d1)) << "\\n";                      // OK
    cout << name(s.authorizeWithdrawal("C1", 6'000, d1)) << "\\n";                       // DAILY_LIMIT
    cout << name(s.authorizeWithdrawal("C1", 6'000, d1 + chrono::days{1})) << "\\n";     // OK
    auto u1 = s.verifyPin("NOPE", "0000"), u2 = s.authorizeWithdrawal("NOPE", 1, d1);
    cout << name(u1) << " " << name(u2) << "\\n";                                        // UNKNOWN_CARD UNKNOWN_CARD
    s.adminUnblock("NOPE");                                                             // no-op, no crash
    s.registerCard("C2", "9999");
    for (const char* p : {"0", "9999", "1", "2"}) cout << name(s.verifyPin("C2", p)) << (string(p) == "2" ? "\\n" : " ");  // success resets the counter
    auto w1 = s.authorizeWithdrawal("C2", 25'000, d1), w2 = s.authorizeWithdrawal("C2", 1, d1);
    cout << name(w1) << " " << name(w2) << "\\n";                                        // exactly the limit is allowed
    auto b1 = s.verifyPin("C2", "3"), b2 = s.authorizeWithdrawal("C2", 1, d1 + chrono::days{1});
    cout << name(b1) << " " << name(b2) << "\\n";                                        // third wrong PIN blocks the card
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;

enum AuthResult { OK, WRONG_PIN, BLOCKED, DAILY_LIMIT, UNKNOWN_CARD }

class CardAccount {
    public readonly string Pin;
    public bool Blocked;
    public int WrongPins;
    public DateTime? LastDate;
    public long WithdrawnToday;
    public CardAccount(string pin) { Pin = pin; }
}

class CardAuthService {
    public const int MAX_WRONG = 3;
    public const long DAILY_LIMIT = 25000;
    private readonly ConcurrentDictionary<string, CardAccount> cards = new ConcurrentDictionary<string, CardAccount>();

    public void Register(string card, string pin) { cards[card] = new CardAccount(pin); }

    public AuthResult VerifyPin(string card, string pin) {
        CardAccount a;
        if (!cards.TryGetValue(card, out a)) return AuthResult.UNKNOWN_CARD;
        lock (a) {                                              // per-card lock: ATMs on other cards are not blocked
            if (a.Blocked) return AuthResult.BLOCKED;
            if (a.Pin == pin) { a.WrongPins = 0; return AuthResult.OK; }
            if (++a.WrongPins >= MAX_WRONG) { a.Blocked = true; return AuthResult.BLOCKED; }
            return AuthResult.WRONG_PIN;
        }
    }

    public AuthResult AuthorizeWithdrawal(string card, long amount, DateTime date) {
        CardAccount a;
        if (!cards.TryGetValue(card, out a)) return AuthResult.UNKNOWN_CARD;
        lock (a) {
            if (a.Blocked) return AuthResult.BLOCKED;
            if (a.LastDate != date) { a.LastDate = date; a.WithdrawnToday = 0; }   // lazy daily reset
            if (a.WithdrawnToday + amount > DAILY_LIMIT) return AuthResult.DAILY_LIMIT;
            a.WithdrawnToday += amount;
            return AuthResult.OK;
        }
    }

    public void AdminUnblock(string card) {
        CardAccount a;
        if (!cards.TryGetValue(card, out a)) return;            // unknown card: nothing to unblock
        lock (a) { a.Blocked = false; a.WrongPins = 0; }
    }

    static void Main() {
        CardAuthService s = new CardAuthService();
        s.Register("C1", "1234");
        Console.WriteLine(s.VerifyPin("C1", "1111") + " " + s.VerifyPin("C1", "2222") + " " + s.VerifyPin("C1", "3333"));
        Console.WriteLine("correct PIN while blocked: " + s.VerifyPin("C1", "1234"));    // BLOCKED
        s.AdminUnblock("C1");
        DateTime d1 = new DateTime(2026, 6, 1);
        Console.WriteLine(s.AuthorizeWithdrawal("C1", 20000, d1));                     // OK
        Console.WriteLine(s.AuthorizeWithdrawal("C1", 6000, d1));                      // DAILY_LIMIT
        Console.WriteLine(s.AuthorizeWithdrawal("C1", 6000, d1.AddDays(1)));           // OK
        Console.WriteLine(s.VerifyPin("NOPE", "0000") + " " + s.AuthorizeWithdrawal("NOPE", 1, d1));  // UNKNOWN_CARD UNKNOWN_CARD
        s.AdminUnblock("NOPE");                                                        // no-op, no crash
        s.Register("C2", "9999");
        Console.WriteLine(s.VerifyPin("C2", "0") + " " + s.VerifyPin("C2", "9999") + " " + s.VerifyPin("C2", "1") + " " + s.VerifyPin("C2", "2"));  // success resets the counter
        Console.WriteLine(s.AuthorizeWithdrawal("C2", 25000, d1) + " " + s.AuthorizeWithdrawal("C2", 1, d1));  // exactly the limit is allowed
        Console.WriteLine(s.VerifyPin("C2", "3") + " " + s.AuthorizeWithdrawal("C2", 1, d1.AddDays(1)));       // third wrong PIN blocks the card
    }
}` }
        ],
      complexity: `<p>O(1) per call; contention only between requests for the same card. Memory O(cards).</p>`,
      followUps: ['Withdrawal authorized but the ATM fails to dispense: how do you give the limit back (and only once)?', 'Use a database instead of memory: write the conditional UPDATE that enforces the limit atomically.']
    }
  });

  practice.push({
    title: 'Elevator with Directional Hall Calls', level: 'Medium', tags: ['elevator', 'scheduling', 'simulation'], companies: ['Amazon', 'Microsoft', 'Otis', 'Adobe'],
    statement: `<p>A single car is at floor <code>start</code> moving <code>dir</code>. Requests are <b>car calls</b> (a floor pressed inside) and <b>hall calls</b> (floor + ▲ or ▼). Rules: going up, stop for car calls and ▲ hall calls; going down, stop for car calls and ▼ hall calls; keep moving in the current direction while <i>any</i> request lies ahead; otherwise reverse (a ▼ call at the highest point is served when the car turns there). Return the sequence of stops.</p>`,
    constraints: `Floors 0–100, up to 1000 requests, all known at time 0.`,
    example: `<p>Start 2 going ▲. Car call 8, hall 5▲, hall 5▼, hall 3▼. Up sweep stops at ${H.c('g', '5 (▲ caller), 8 (car)')}. Nothing above 8 → reverse. Down sweep stops at ${H.c('b', '5 (▼ caller), 3 (▼ caller)')}. Stops = [5, 8, 5, 3]. The ▼ caller at 5 was <b>not</b> picked up on the way up.</p>`,
    brute: { why: `<p>One set of floors ignoring direction: the car stops at 5 on the way up and picks up the person who wants to go down — they ride up to 8 and back, and the floor is then removed from the set so the car never stops at 5 again on the way down. Wrong for passengers, and it looks "optimal" in a distance metric, which is why interviewers use this trap.</p>`, code: { lang: 'java', code: `import java.util.*;
class DirectionBlind {
    static List<Integer> stops(int start, List<Integer> floors) {
        TreeSet<Integer> all = new TreeSet<>(floors);   // loses the direction of each hall call
        List<Integer> out = new ArrayList<>(all.tailSet(start, true));
        out.addAll(all.headSet(start, false).descendingSet());
        return out;                                     // 5 served once, on the way up: wrong for 5-DOWN
    }
}`, alt: [{ lang: 'python', code: "class DirectionBlind:\n    @staticmethod\n    def stops(start, floors):\n        all_ = sorted(set(floors))                       # loses the direction of each hall call\n        out = [f for f in all_ if f >= start]\n        out += [f for f in reversed(all_) if f < start]\n        return out                                       # 5 served once, on the way up: wrong for 5-DOWN\n" }, { lang: 'ts', code: "class DirectionBlind {\n  static stops(start: number, floors: number[]): number[] {\n    const all = [...new Set(floors)].sort((a, b) => a - b);   // loses the direction of each hall call\n    const out = all.filter((f) => f >= start);\n    out.push(...all.filter((f) => f < start).reverse());\n    return out;                                          // 5 served once, on the way up: wrong for 5-DOWN\n  }\n}\n" }, { lang: 'cpp', code: "struct DirectionBlind {\n    static vector<int> stops(int start, const vector<int>& floors) {\n        set<int> all(floors.begin(), floors.end());      // loses the direction of each hall call\n        vector<int> out(all.lower_bound(start), all.end());\n        for (auto it = make_reverse_iterator(all.lower_bound(start)); it != all.rend(); ++it) out.push_back(*it);\n        return out;                                      // 5 served once, on the way up: wrong for 5-DOWN\n    }\n};\n" }, { lang: 'csharp', code: "using System.Collections.Generic;\nusing System.Linq;\nclass DirectionBlind {\n    public static List<int> Stops(int start, List<int> floors) {\n        SortedSet<int> all = new SortedSet<int>(floors);   // loses the direction of each hall call\n        List<int> result = all.Where(f => f >= start).ToList();\n        result.AddRange(all.Where(f => f < start).Reverse());\n        return result;                                      // 5 served once, on the way up: wrong for 5-DOWN\n    }\n}\n" }] } },
    mcq: { q: 'The car is at 8 going up; the only remaining request is hall 8▼. What happens?', options: ['Nothing is ahead, so the car reverses to DOWN at 8 and serves the ▼ call right there', 'It ignores the call until the next up sweep', 'It goes to the top floor first', 'It serves it only if a car call exists'], answer: 0, explain: 'With nothing ahead, LOOK reverses; after reversing, the ▼ call at the current floor matches the new direction.' },
    hints: [`<p>Hint 1: Keep three sets: carCalls, upCalls, downCalls. A floor is a stop for direction d if it is in carCalls or in the hall set for d.</p>`, `<p>Hint 2: Simulate floor by floor: serve what matches the current direction at the current floor; if any request in <i>any</i> set lies strictly ahead, move one floor; otherwise flip direction (without moving).</p>`, `<p>Hint 3: The loop terminates because if requests remain but none is ahead in either direction, they are at the current floor and get served after at most one flip.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "[5, 8, 5, 3]\n[]\n[1, 4]\n" }] },
      solution: {
      approach: `<p>Floor-by-floor LOOK with three sets. At each floor serve car calls and same-direction hall calls; then decide: something ahead → move; nothing ahead → reverse. Opposite-direction calls at the turning floor are served right after the flip, exactly like a real collective-control elevator.</p>`,
      code: `import java.util.*;

class DirectionalElevator {
    final TreeSet<Integer> car = new TreeSet<>(), up = new TreeSet<>(), down = new TreeSet<>();
    int floor;
    boolean goingUp;
    DirectionalElevator(int start, boolean goingUp) { this.floor = start; this.goingUp = goingUp; }

    void carCall(int f)                  { car.add(f); }
    void hallCall(int f, boolean wantsUp){ (wantsUp ? up : down).add(f); }

    private boolean anyAhead() {
        for (TreeSet<Integer> s : List.of(car, up, down)) {
            Integer x = goingUp ? s.higher(floor) : s.lower(floor);
            if (x != null) return true;
        }
        return false;
    }
    private boolean empty() { return car.isEmpty() && up.isEmpty() && down.isEmpty(); }

    List<Integer> run() {
        List<Integer> stops = new ArrayList<>();
        while (!empty()) {
            boolean served = car.remove(floor);
            served |= goingUp ? up.remove(floor) : down.remove(floor);   // only same-direction hall calls
            if (served) stops.add(floor);
            if (empty()) break;
            if (anyAhead()) floor += goingUp ? 1 : -1;
            else goingUp = !goingUp;                                     // LOOK turn, no movement
        }
        return stops;
    }

    public static void main(String[] args) {
        DirectionalElevator e = new DirectionalElevator(2, true);
        e.carCall(8); e.hallCall(5, true); e.hallCall(5, false); e.hallCall(3, false);
        System.out.println(e.run());                       // [5, 8, 5, 3]

        DirectionalElevator idle = new DirectionalElevator(4, false);
        System.out.println(idle.run());                    // [] nothing to do
        idle.hallCall(4, true); idle.hallCall(1, true);    // the up-call at 4 is passed while going down
        System.out.println(idle.run());                    // [1, 4]
    }
}`, alt: [
          { lang: 'python', code: `class DirectionalElevator:
    def __init__(self, start: int, going_up: bool) -> None:
        self.car: set[int] = set()
        self.up: set[int] = set()
        self.down: set[int] = set()
        self.floor = start
        self.going_up = going_up

    def car_call(self, f: int) -> None:
        self.car.add(f)

    def hall_call(self, f: int, wants_up: bool) -> None:
        (self.up if wants_up else self.down).add(f)

    def _any_ahead(self) -> bool:
        if self.going_up:
            return any(x > self.floor for s in (self.car, self.up, self.down) for x in s)
        return any(x < self.floor for s in (self.car, self.up, self.down) for x in s)

    def _empty(self) -> bool:
        return not (self.car or self.up or self.down)

    def run(self) -> list[int]:
        stops: list[int] = []
        while not self._empty():
            served = self.floor in self.car
            self.car.discard(self.floor)
            same_dir = self.up if self.going_up else self.down  # only same-direction hall calls
            served = served or self.floor in same_dir
            same_dir.discard(self.floor)
            if served:
                stops.append(self.floor)
            if self._empty():
                break
            if self._any_ahead():
                self.floor += 1 if self.going_up else -1
            else:
                self.going_up = not self.going_up  # LOOK turn, no movement
        return stops


if __name__ == "__main__":
    e = DirectionalElevator(2, True)
    e.car_call(8); e.hall_call(5, True); e.hall_call(5, False); e.hall_call(3, False)
    print(e.run())  # [5, 8, 5, 3]

    idle = DirectionalElevator(4, False)
    print(idle.run())  # [] nothing to do
    idle.hall_call(4, True); idle.hall_call(1, True)  # the up-call at 4 is passed while going down
    print(idle.run())  # [1, 4]` },
          { lang: 'ts', code: `class DirectionalElevator {
  readonly car = new Set<number>();
  readonly up = new Set<number>();
  readonly down = new Set<number>();

  constructor(public floor: number, public goingUp: boolean) {}

  carCall(f: number): void { this.car.add(f); }
  hallCall(f: number, wantsUp: boolean): void { (wantsUp ? this.up : this.down).add(f); }

  private anyAhead(): boolean {
    return [this.car, this.up, this.down].some((s) =>
      [...s].some((x) => (this.goingUp ? x > this.floor : x < this.floor)));
  }
  private empty(): boolean { return this.car.size === 0 && this.up.size === 0 && this.down.size === 0; }

  run(): number[] {
    const stops: number[] = [];
    while (!this.empty()) {
      const sameDir = this.goingUp ? this.up : this.down; // only same-direction hall calls
      const served = this.car.delete(this.floor);
      const servedHall = sameDir.delete(this.floor);
      if (served || servedHall) stops.push(this.floor);
      if (this.empty()) break;
      if (this.anyAhead()) this.floor += this.goingUp ? 1 : -1;
      else this.goingUp = !this.goingUp; // LOOK turn, no movement
    }
    return stops;
  }
}

const show = (xs: number[]): string => \`[\${xs.join(", ")}]\`;

const e = new DirectionalElevator(2, true);
e.carCall(8); e.hallCall(5, true); e.hallCall(5, false); e.hallCall(3, false);
console.log(show(e.run())); // [5, 8, 5, 3]

const idle = new DirectionalElevator(4, false);
console.log(show(idle.run())); // [] nothing to do
idle.hallCall(4, true); idle.hallCall(1, true); // the up-call at 4 is passed while going down
console.log(show(idle.run())); // [1, 4]` },
          { lang: 'cpp', code: `class DirectionalElevator {
    set<int> car_, up_, down_;
    int floor_;
    bool goingUp_;

    bool anyAhead() const {
        for (const set<int>* s : {&car_, &up_, &down_}) {
            if (goingUp_ ? s->upper_bound(floor_) != s->end() : (!s->empty() && *s->begin() < floor_)) return true;
        }
        return false;
    }
    bool empty() const { return car_.empty() && up_.empty() && down_.empty(); }

public:
    DirectionalElevator(int start, bool goingUp) : floor_(start), goingUp_(goingUp) {}

    void carCall(int f) { car_.insert(f); }
    void hallCall(int f, bool wantsUp) { (wantsUp ? up_ : down_).insert(f); }

    vector<int> run() {
        vector<int> stops;
        while (!empty()) {
            bool served = car_.erase(floor_) > 0;
            served |= (goingUp_ ? up_ : down_).erase(floor_) > 0;  // only same-direction hall calls
            if (served) stops.push_back(floor_);
            if (empty()) break;
            if (anyAhead()) floor_ += goingUp_ ? 1 : -1;
            else goingUp_ = !goingUp_;  // LOOK turn, no movement
        }
        return stops;
    }
};

string show(const vector<int>& xs) {
    string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + to_string(xs[i]);
    return s + "]";
}

int main() {
    DirectionalElevator e(2, true);
    e.carCall(8); e.hallCall(5, true); e.hallCall(5, false); e.hallCall(3, false);
    cout << show(e.run()) << "\\n";  // [5, 8, 5, 3]

    DirectionalElevator idle(4, false);
    cout << show(idle.run()) << "\\n";  // [] nothing to do
    idle.hallCall(4, true); idle.hallCall(1, true);  // the up-call at 4 is passed while going down
    cout << show(idle.run()) << "\\n";  // [1, 4]
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class DirectionalElevator {
    public readonly SortedSet<int> Car = new SortedSet<int>(), Up = new SortedSet<int>(), Down = new SortedSet<int>();
    public int Floor;
    public bool GoingUp;
    public DirectionalElevator(int start, bool goingUp) { Floor = start; GoingUp = goingUp; }

    public void CarCall(int f)                   { Car.Add(f); }
    public void HallCall(int f, bool wantsUp)    { (wantsUp ? Up : Down).Add(f); }

    private bool AnyAhead() {
        foreach (SortedSet<int> s in new[] { Car, Up, Down }) {
            SortedSet<int> view = GoingUp ? s.GetViewBetween(Floor + 1, int.MaxValue) : s.GetViewBetween(int.MinValue, Floor - 1);
            if (view.Count > 0) return true;
        }
        return false;
    }
    private bool Empty() { return Car.Count == 0 && Up.Count == 0 && Down.Count == 0; }

    public List<int> Run() {
        List<int> stops = new List<int>();
        while (!Empty()) {
            bool served = Car.Remove(Floor);
            served |= GoingUp ? Up.Remove(Floor) : Down.Remove(Floor);   // only same-direction hall calls
            if (served) stops.Add(Floor);
            if (Empty()) break;
            if (AnyAhead()) Floor += GoingUp ? 1 : -1;
            else GoingUp = !GoingUp;                                     // LOOK turn, no movement
        }
        return stops;
    }

    static string Show(List<int> l) { return "[" + string.Join(", ", l) + "]"; }

    static void Main() {
        DirectionalElevator e = new DirectionalElevator(2, true);
        e.CarCall(8); e.HallCall(5, true); e.HallCall(5, false); e.HallCall(3, false);
        Console.WriteLine(Show(e.Run()));                   // [5, 8, 5, 3]

        DirectionalElevator idle = new DirectionalElevator(4, false);
        Console.WriteLine(Show(idle.Run()));                // [] nothing to do
        idle.HallCall(4, true); idle.HallCall(1, true);     // the up-call at 4 is passed while going down
        Console.WriteLine(Show(idle.Run()));                // [1, 4]
    }
}` }
        ],
      complexity: `<p>O(F · log N) for F floors travelled (each step does O(1) set operations, O(log N) each). For an online version, run one iteration per tick.</p>`,
      followUps: ['Show the hall-button lights: when exactly does 5▼ turn off?', 'Two cars: how does the dispatcher use the direction of each hall call?']
    }
  });

  practice.push({
    title: 'Washing Machine Cycle with Pause/Resume (history state)', level: 'Medium', tags: ['state machine', 'timers', 'history state'], companies: ['Samsung', 'LG', 'Whirlpool', 'Microsoft'],
    statement: `<p>A washing machine runs <b>FILLING (2 ticks) → WASHING (5) → RINSING (3) → SPINNING (2) → DONE</b>. The door is locked in every running state. <code>pause()</code> moves any running state to <b>PAUSED</b>, remembering where it was and how many ticks were left; <code>resume()</code> returns to exactly that state and time (a <b>history state</b>). The door may open only in IDLE, PAUSED and DONE. <code>start()</code> works only in IDLE with the door closed.</p>`,
    constraints: `Tick-driven. pause() in IDLE/DONE/PAUSED is ignored. Print each transition.`,
    example: `<p>start → FILLING (2) → WASHING; after 2 washing ticks ${H.c('y', 'pause')} → PAUSED (remembers WASHING, 3 left); open door ✓; close; ${H.c('g', 'resume')} → WASHING with 3 ticks left, not 5. Opening the door during RINSING → ${H.c('r', 'refused, door locked')}.</p>`,
    brute: { why: `<p>A <code>phase</code> int, a <code>paused</code> boolean and a <code>remaining</code> counter. Every method checks <code>paused</code> first — except the one somebody forgets (tick keeps counting while paused, so the wash "finishes" while the door is open). Resume often restarts the phase from the beginning because the remaining time was overwritten.</p>`, code: { lang: 'java', code: `class NaiveWasher {
    int phase = 0, remaining = 0; boolean paused = false, doorOpen = false;
    int[] durations = {2, 5, 3, 2};
    void tick() {
        if (--remaining <= 0 && phase < 4) { phase++; remaining = phase < 4 ? durations[phase] : 0; }  // forgot "if (paused) return"
    }
    void pause() { paused = true; }
    void openDoor() { if (paused || phase == 4) doorOpen = true; }
}`, alt: [{ lang: 'python', code: "class NaiveWasher:\n    def __init__(self):\n        self.phase, self.remaining = 0, 0\n        self.paused, self.door_open = False, False\n        self.durations = [2, 5, 3, 2]\n\n    def tick(self):\n        self.remaining -= 1\n        if self.remaining <= 0 and self.phase < 4:   # forgot \"if paused: return\"\n            self.phase += 1\n            self.remaining = self.durations[self.phase] if self.phase < 4 else 0\n\n    def pause(self): self.paused = True\n    def open_door(self):\n        if self.paused or self.phase == 4: self.door_open = True\n" }, { lang: 'ts', code: "class NaiveWasher {\n  phase = 0; remaining = 0; paused = false; doorOpen = false;\n  durations = [2, 5, 3, 2];\n  tick(): void {\n    if (--this.remaining <= 0 && this.phase < 4) { this.phase++; this.remaining = this.phase < 4 ? this.durations[this.phase] : 0; }  // forgot \"if (paused) return\"\n  }\n  pause(): void { this.paused = true; }\n  openDoor(): void { if (this.paused || this.phase === 4) this.doorOpen = true; }\n}\n" }, { lang: 'cpp', code: "class NaiveWasher {\npublic:\n    int phase = 0, remaining = 0; bool paused = false, doorOpen = false;\n    int durations[4] = {2, 5, 3, 2};\n    void tick() {\n        if (--remaining <= 0 && phase < 4) { phase++; remaining = phase < 4 ? durations[phase] : 0; }  // forgot \"if (paused) return\"\n    }\n    void pause() { paused = true; }\n    void openDoor() { if (paused || phase == 4) doorOpen = true; }\n};\n" }, { lang: 'csharp', code: "class NaiveWasher {\n    public int Phase = 0, Remaining = 0; public bool Paused = false, DoorOpen = false;\n    int[] durations = { 2, 5, 3, 2 };\n    public void Tick() {\n        if (--Remaining <= 0 && Phase < 4) { Phase++; Remaining = Phase < 4 ? durations[Phase] : 0; }  // forgot \"if (Paused) return\"\n    }\n    public void Pause() { Paused = true; }\n    public void OpenDoor() { if (Paused || Phase == 4) DoorOpen = true; }\n}\n" }] } },
    mcq: { q: 'What exactly must PAUSED remember to implement resume correctly?', options: ['The state it was paused from AND the ticks remaining in it', 'Only the original program', 'Nothing, resume restarts the cycle', 'Only the ticks remaining'], answer: 0, explain: 'A history state stores the interrupted sub-state plus its progress so the machine continues exactly where it stopped.' },
    hints: [`<p>Hint 1: Running phases differ only in name, duration and successor → an enum with (duration, next). PAUSED and IDLE/DONE are special.</p>`, `<p>Hint 2: Keep <code>current</code>, <code>remaining</code>, plus <code>resumeTo</code>/<code>resumeRemaining</code> captured on pause. tick() does nothing unless current is a running phase.</p>`, `<p>Hint 3: Door rule = a method on the enum: <code>doorMayOpen()</code> true for IDLE, PAUSED, DONE. Guard start() with "door closed".</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "IDLE -> FILLING (2 ticks)\nFILLING -> WASHING (5 ticks)\nWASHING -> PAUSED\nPAUSED -> WASHING (3 ticks)\nWASHING -> RINSING (3 ticks)\ndoor locked during RINSING\nRINSING -> SPINNING (2 ticks)\nSPINNING -> DONE\ncannot start (DONE, door closed)\ncannot resume\ncannot start (IDLE, door open)\n" }] },
      solution: {
      approach: `<p>An enum of phases with duration, successor and a door rule. The machine stores the current phase and remaining ticks; pause() snapshots both into history fields and switches to PAUSED; resume() restores them. tick() advances only running phases.</p>`,
      code: `enum Phase {
    IDLE(0, null), FILLING(2, "WASHING"), WASHING(5, "RINSING"), RINSING(3, "SPINNING"), SPINNING(2, "DONE"), DONE(0, null), PAUSED(0, null);
    final int ticks;
    private final String nextName;
    Phase(int ticks, String nextName) { this.ticks = ticks; this.nextName = nextName; }
    Phase next() { return nextName == null ? this : Phase.valueOf(nextName); }
    boolean running() { return ticks > 0; }
    boolean doorMayOpen() { return this == IDLE || this == PAUSED || this == DONE; }
}

class Washer {
    private Phase phase = Phase.IDLE, resumeTo;
    private int remaining, resumeRemaining;
    private boolean doorOpen;

    void start() {
        if (phase != Phase.IDLE || doorOpen) { System.out.println("cannot start (" + phase + ", door " + (doorOpen ? "open" : "closed") + ")"); return; }
        go(Phase.FILLING, Phase.FILLING.ticks);
    }
    void tick() {
        if (!phase.running()) return;                       // paused/idle/done: time does not move
        if (--remaining == 0) { Phase n = phase.next(); go(n, n.ticks); }
    }
    void pause() {
        if (!phase.running()) return;
        resumeTo = phase; resumeRemaining = remaining;      // history
        go(Phase.PAUSED, 0);
    }
    void resume() {
        if (phase != Phase.PAUSED || doorOpen) { System.out.println("cannot resume"); return; }
        go(resumeTo, resumeRemaining);
    }
    void openDoor()  { if (phase.doorMayOpen()) doorOpen = true; else System.out.println("door locked during " + phase); }
    void closeDoor() { doorOpen = false; }
    private void go(Phase p, int ticks) { System.out.println(phase + " -> " + p + (ticks > 0 ? " (" + ticks + " ticks)" : "")); phase = p; remaining = ticks; }

    public static void main(String[] args) {
        Washer w = new Washer();
        w.start();
        for (int i = 0; i < 4; i++) w.tick();               // FILLING done, 2 ticks into WASHING
        w.pause(); w.openDoor(); w.closeDoor(); w.resume();  // WASHING (3 ticks)
        for (int i = 0; i < 4; i++) w.tick();               // -> RINSING, 1 tick in
        w.openDoor();                                        // refused
        for (int i = 0; i < 10; i++) w.tick();              // -> SPINNING -> DONE
        w.start();                                           // refused: cycle already finished
        w.resume();                                          // refused: not paused
        Washer w2 = new Washer();
        w2.openDoor();
        w2.start();                                          // refused: door open
    }
}`, alt: [
          { lang: 'python', code: `from enum import Enum


class Phase(Enum):
    IDLE = 1
    FILLING = 2
    WASHING = 3
    RINSING = 4
    SPINNING = 5
    DONE = 6
    PAUSED = 7

    @property
    def ticks(self) -> int:
        return _TICKS.get(self, 0)

    def next(self) -> "Phase":
        return _NEXT.get(self, self)

    def running(self) -> bool:
        return self.ticks > 0

    def door_may_open(self) -> bool:
        return self in (Phase.IDLE, Phase.PAUSED, Phase.DONE)


# Declared after the enum so the table can name the members.
_TICKS = {Phase.FILLING: 2, Phase.WASHING: 5, Phase.RINSING: 3, Phase.SPINNING: 2}
_NEXT = {Phase.FILLING: Phase.WASHING, Phase.WASHING: Phase.RINSING,
         Phase.RINSING: Phase.SPINNING, Phase.SPINNING: Phase.DONE}


class Washer:
    def __init__(self) -> None:
        self._phase = Phase.IDLE
        self._resume_to = Phase.IDLE
        self._remaining = 0
        self._resume_remaining = 0
        self._door_open = False

    def start(self) -> None:
        if self._phase is not Phase.IDLE or self._door_open:
            door = "open" if self._door_open else "closed"
            print(f"cannot start ({self._phase.name}, door {door})")
            return
        self._go(Phase.FILLING, Phase.FILLING.ticks)

    def tick(self) -> None:
        if not self._phase.running():  # paused/idle/done: time does not move
            return
        self._remaining -= 1
        if self._remaining == 0:
            n = self._phase.next()
            self._go(n, n.ticks)

    def pause(self) -> None:
        if not self._phase.running():
            return
        self._resume_to, self._resume_remaining = self._phase, self._remaining  # history
        self._go(Phase.PAUSED, 0)

    def resume(self) -> None:
        if self._phase is not Phase.PAUSED or self._door_open:
            print("cannot resume")
            return
        self._go(self._resume_to, self._resume_remaining)

    def open_door(self) -> None:
        if self._phase.door_may_open():
            self._door_open = True
        else:
            print(f"door locked during {self._phase.name}")

    def close_door(self) -> None:
        self._door_open = False

    def _go(self, p: Phase, ticks: int) -> None:
        print(f"{self._phase.name} -> {p.name}" + (f" ({ticks} ticks)" if ticks > 0 else ""))
        self._phase = p
        self._remaining = ticks


if __name__ == "__main__":
    w = Washer()
    w.start()
    for _ in range(4):
        w.tick()  # FILLING done, 2 ticks into WASHING
    w.pause(); w.open_door(); w.close_door(); w.resume()  # WASHING (3 ticks)
    for _ in range(4):
        w.tick()  # -> RINSING, 1 tick in
    w.open_door()  # refused
    for _ in range(10):
        w.tick()  # -> SPINNING -> DONE
    w.start()  # refused: cycle already finished
    w.resume()  # refused: not paused
    w2 = Washer()
    w2.open_door()
    w2.start()  # refused: door open` },
          { lang: 'ts', code: `type Phase = "IDLE" | "FILLING" | "WASHING" | "RINSING" | "SPINNING" | "DONE" | "PAUSED";

// Per-phase data in one table: how long it runs and what follows.
const PHASES: Record<Phase, { ticks: number; next: Phase | null }> = {
  IDLE: { ticks: 0, next: null },
  FILLING: { ticks: 2, next: "WASHING" },
  WASHING: { ticks: 5, next: "RINSING" },
  RINSING: { ticks: 3, next: "SPINNING" },
  SPINNING: { ticks: 2, next: "DONE" },
  DONE: { ticks: 0, next: null },
  PAUSED: { ticks: 0, next: null },
};
const ticks = (p: Phase): number => PHASES[p].ticks;
const next = (p: Phase): Phase => PHASES[p].next ?? p;
const running = (p: Phase): boolean => ticks(p) > 0;
const doorMayOpen = (p: Phase): boolean => p === "IDLE" || p === "PAUSED" || p === "DONE";

class Washer {
  private phase: Phase = "IDLE";
  private resumeTo: Phase = "IDLE";
  private remaining = 0;
  private resumeRemaining = 0;
  private doorOpen = false;

  start(): void {
    if (this.phase !== "IDLE" || this.doorOpen) {
      console.log(\`cannot start (\${this.phase}, door \${this.doorOpen ? "open" : "closed"})\`);
      return;
    }
    this.go("FILLING", ticks("FILLING"));
  }
  tick(): void {
    if (!running(this.phase)) return; // paused/idle/done: time does not move
    if (--this.remaining === 0) {
      const n = next(this.phase);
      this.go(n, ticks(n));
    }
  }
  pause(): void {
    if (!running(this.phase)) return;
    this.resumeTo = this.phase; this.resumeRemaining = this.remaining; // history
    this.go("PAUSED", 0);
  }
  resume(): void {
    if (this.phase !== "PAUSED" || this.doorOpen) { console.log("cannot resume"); return; }
    this.go(this.resumeTo, this.resumeRemaining);
  }
  openDoor(): void {
    if (doorMayOpen(this.phase)) this.doorOpen = true;
    else console.log(\`door locked during \${this.phase}\`);
  }
  closeDoor(): void { this.doorOpen = false; }
  private go(p: Phase, t: number): void {
    console.log(\`\${this.phase} -> \${p}\` + (t > 0 ? \` (\${t} ticks)\` : ""));
    this.phase = p;
    this.remaining = t;
  }
}

const w = new Washer();
w.start();
for (let i = 0; i < 4; i++) w.tick(); // FILLING done, 2 ticks into WASHING
w.pause(); w.openDoor(); w.closeDoor(); w.resume(); // WASHING (3 ticks)
for (let i = 0; i < 4; i++) w.tick(); // -> RINSING, 1 tick in
w.openDoor(); // refused
for (let i = 0; i < 10; i++) w.tick(); // -> SPINNING -> DONE
w.start(); // refused: cycle already finished
w.resume(); // refused: not paused
const w2 = new Washer();
w2.openDoor();
w2.start(); // refused: door open` },
          { lang: 'cpp', code: `enum class Phase { IDLE, FILLING, WASHING, RINSING, SPINNING, DONE, PAUSED };

const char* name(Phase p) {
    static const char* names[] = {"IDLE", "FILLING", "WASHING", "RINSING", "SPINNING", "DONE", "PAUSED"};
    return names[static_cast<int>(p)];
}

// Per-phase data: how long it runs, and what follows (itself when it is a resting phase).
int ticks(Phase p) {
    static const int t[] = {0, 2, 5, 3, 2, 0, 0};
    return t[static_cast<int>(p)];
}
Phase next(Phase p) {
    static const Phase n[] = {Phase::IDLE, Phase::WASHING, Phase::RINSING, Phase::SPINNING, Phase::DONE, Phase::DONE, Phase::PAUSED};
    return n[static_cast<int>(p)];
}
bool running(Phase p) { return ticks(p) > 0; }
bool doorMayOpen(Phase p) { return p == Phase::IDLE || p == Phase::PAUSED || p == Phase::DONE; }

class Washer {
    Phase phase_ = Phase::IDLE, resumeTo_ = Phase::IDLE;
    int remaining_ = 0, resumeRemaining_ = 0;
    bool doorOpen_ = false;

    void go(Phase p, int t) {
        cout << name(phase_) << " -> " << name(p);
        if (t > 0) cout << " (" << t << " ticks)";
        cout << "\\n";
        phase_ = p;
        remaining_ = t;
    }

public:
    void start() {
        if (phase_ != Phase::IDLE || doorOpen_) {
            cout << "cannot start (" << name(phase_) << ", door " << (doorOpen_ ? "open" : "closed") << ")\\n";
            return;
        }
        go(Phase::FILLING, ticks(Phase::FILLING));
    }
    void tick() {
        if (!running(phase_)) return;  // paused/idle/done: time does not move
        if (--remaining_ == 0) {
            Phase n = next(phase_);
            go(n, ticks(n));
        }
    }
    void pause() {
        if (!running(phase_)) return;
        resumeTo_ = phase_; resumeRemaining_ = remaining_;  // history
        go(Phase::PAUSED, 0);
    }
    void resume() {
        if (phase_ != Phase::PAUSED || doorOpen_) { cout << "cannot resume\\n"; return; }
        go(resumeTo_, resumeRemaining_);
    }
    void openDoor() {
        if (doorMayOpen(phase_)) doorOpen_ = true;
        else cout << "door locked during " << name(phase_) << "\\n";
    }
    void closeDoor() { doorOpen_ = false; }
};

int main() {
    Washer w;
    w.start();
    for (int i = 0; i < 4; i++) w.tick();  // FILLING done, 2 ticks into WASHING
    w.pause(); w.openDoor(); w.closeDoor(); w.resume();  // WASHING (3 ticks)
    for (int i = 0; i < 4; i++) w.tick();  // -> RINSING, 1 tick in
    w.openDoor();  // refused
    for (int i = 0; i < 10; i++) w.tick();  // -> SPINNING -> DONE
    w.start();   // refused: cycle already finished
    w.resume();  // refused: not paused
    Washer w2;
    w2.openDoor();
    w2.start();  // refused: door open
}` },
  { lang: 'csharp', code: `
using System;

enum Phase { IDLE, FILLING, WASHING, RINSING, SPINNING, DONE, PAUSED }

static class PhaseExt {
    public static int Ticks(this Phase p) {
        switch (p) { case Phase.FILLING: return 2; case Phase.WASHING: return 5; case Phase.RINSING: return 3; case Phase.SPINNING: return 2; default: return 0; }
    }
    public static Phase Next(this Phase p) {
        switch (p) { case Phase.FILLING: return Phase.WASHING; case Phase.WASHING: return Phase.RINSING; case Phase.RINSING: return Phase.SPINNING; case Phase.SPINNING: return Phase.DONE; default: return p; }
    }
    public static bool Running(this Phase p) { return p.Ticks() > 0; }
    public static bool DoorMayOpen(this Phase p) { return p == Phase.IDLE || p == Phase.PAUSED || p == Phase.DONE; }
}

class Washer {
    private Phase phase = Phase.IDLE, resumeTo;
    private int remaining, resumeRemaining;
    private bool doorOpen;

    public void Start() {
        if (phase != Phase.IDLE || doorOpen) { Console.WriteLine("cannot start (" + phase + ", door " + (doorOpen ? "open" : "closed") + ")"); return; }
        Go(Phase.FILLING, Phase.FILLING.Ticks());
    }
    public void Tick() {
        if (!phase.Running()) return;                       // paused/idle/done: time does not move
        if (--remaining == 0) { Phase n = phase.Next(); Go(n, n.Ticks()); }
    }
    public void Pause() {
        if (!phase.Running()) return;
        resumeTo = phase; resumeRemaining = remaining;      // history
        Go(Phase.PAUSED, 0);
    }
    public void Resume() {
        if (phase != Phase.PAUSED || doorOpen) { Console.WriteLine("cannot resume"); return; }
        Go(resumeTo, resumeRemaining);
    }
    public void OpenDoor()  { if (phase.DoorMayOpen()) doorOpen = true; else Console.WriteLine("door locked during " + phase); }
    public void CloseDoor() { doorOpen = false; }
    private void Go(Phase p, int ticks) { Console.WriteLine(phase + " -> " + p + (ticks > 0 ? " (" + ticks + " ticks)" : "")); phase = p; remaining = ticks; }

    static void Main() {
        Washer w = new Washer();
        w.Start();
        for (int i = 0; i < 4; i++) w.Tick();               // FILLING done, 2 ticks into WASHING
        w.Pause(); w.OpenDoor(); w.CloseDoor(); w.Resume();  // WASHING (3 ticks)
        for (int i = 0; i < 4; i++) w.Tick();               // -> RINSING, 1 tick in
        w.OpenDoor();                                        // refused
        for (int i = 0; i < 10; i++) w.Tick();              // -> SPINNING -> DONE
        w.Start();                                           // refused: cycle already finished
        w.Resume();                                          // refused: not paused
        Washer w2 = new Washer();
        w2.OpenDoor();
        w2.Start();                                          // refused: door open
    }
}` }
        ],
      complexity: `<p>O(1) per event and tick. A new program (e.g. "quick wash") = different durations; a new phase = one enum constant.</p>`,
      followUps: ['Power cut: persist (phase, remaining) and resume after restart.', 'Different programs (cotton, wool): Strategy for durations, same state machine.']
    }
  });

  practice.push({
    title: 'Vending Machine: Add Card/UPI Payment (AUTHORIZING state)', level: 'Medium', tags: ['add-a-state', 'idempotency', 'async callback'], companies: ['PhonePe', 'Razorpay', 'Amazon'],
    statement: `<p>Extend a vending machine (IDLE → SELECTED → … ) with card/UPI payment. After <code>select(slot)</code> the user taps <code>payByCard()</code> → <b>AUTHORIZING</b> with a fresh <code>authId</code>. The payment gateway later calls <code>onAuthResult(authId, approved)</code> — possibly <b>twice</b> (retries) or <b>late</b> (after a timeout). Approved → DISPENSING → IDLE; declined → SELECTED; <code>timeout()</code> → IDLE and the auth must be voided. Duplicate or stale callbacks must not dispense twice.</p>`,
    constraints: `Callbacks may arrive on another thread. A callback for an old authId is ignored (and voided if it was an approval).`,
    example: `<p>select A1, payByCard → AUTHORIZING (auth-1). onAuthResult(auth-1, true) → ${H.c('g', 'dispense')}. Duplicate onAuthResult(auth-1, true) → ${H.c('b', 'ignored')}. Next: select B2, payByCard (auth-2), timeout → IDLE; late onAuthResult(auth-2, true) → ${H.c('y', 'void auth-2, nothing dispensed')}.</p>`,
    brute: { why: `<p>A boolean <code>waitingForCard</code> and a callback that just does <code>if (approved) dispense()</code>. Duplicate callbacks dispense twice; a late approval after a timeout dispenses to whoever is standing there now (or charges a customer who already walked away).</p>`, code: { lang: 'java', code: `class NaiveCardVending {
    boolean waiting; int dispensed;
    void payByCard() { waiting = true; }
    void onAuthResult(boolean approved) {
        if (approved) dispensed++;            // duplicate callback -> dispensed twice; late callback -> free item
        waiting = false;
    }
}`, alt: [{ lang: 'python', code: "class NaiveCardVending:\n    def __init__(self):\n        self.waiting, self.dispensed = False, 0\n\n    def pay_by_card(self): self.waiting = True\n\n    def on_auth_result(self, approved):\n        if approved: self.dispensed += 1     # duplicate callback -> dispensed twice; late callback -> free item\n        self.waiting = False\n" }, { lang: 'ts', code: "class NaiveCardVending {\n  waiting = false; dispensed = 0;\n  payByCard(): void { this.waiting = true; }\n  onAuthResult(approved: boolean): void {\n    if (approved) this.dispensed++;          // duplicate callback -> dispensed twice; late callback -> free item\n    this.waiting = false;\n  }\n}\n" }, { lang: 'cpp', code: "class NaiveCardVending {\npublic:\n    bool waiting = false; int dispensed = 0;\n    void payByCard() { waiting = true; }\n    void onAuthResult(bool approved) {\n        if (approved) dispensed++;           // duplicate callback -> dispensed twice; late callback -> free item\n        waiting = false;\n    }\n};\n" }, { lang: 'csharp', code: "class NaiveCardVending {\n    public bool Waiting; public int Dispensed;\n    public void PayByCard() { Waiting = true; }\n    public void OnAuthResult(bool approved) {\n        if (approved) Dispensed++;            // duplicate callback -> dispensed twice; late callback -> free item\n        Waiting = false;\n    }\n}\n" }] } },
    mcq: { q: 'A gateway retries the same approval callback. What makes the second one harmless?', options: ['Accept a callback only if the machine is AUTHORIZING and authId equals the current pending id; then clear the pending id', 'Use a bigger timeout', 'Synchronize the method only', 'Dispense twice and refund later'], answer: 0, explain: 'Matching on the pending authId plus state makes the transition happen once; after it, the id no longer matches.' },
    hints: [`<p>Hint 1: AUTHORIZING is a real state because the machine waits for an outside answer that may never come. Store <code>pendingAuthId</code> when entering it.</p>`, `<p>Hint 2: onAuthResult: if state != AUTHORIZING or authId != pending → stale/duplicate: if approved, call <code>gateway.voidAuth(authId)</code> (unless it was already captured); return.</p>`, `<p>Hint 3: Make every public method take the machine lock (callbacks come from another thread). Track captured ids in a set so you never void a payment you used.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "dispensing A1 (auth-1)\nduplicate auth-1 ignored\npayment timed out\ngateway: void auth-2\nstale auth-2 voided\nselect first\nbusy\ndeclined, try again\nduplicate auth-3 ignored\ndispensing C3 (auth-4)\nitems dispensed: 2\n" }] },
      solution: {
      approach: `<p>Add one state (AUTHORIZING) and a pending authId. Transitions out of AUTHORIZING happen only for the matching id; anything else is a duplicate (already captured → ignore) or stale (→ void). Methods take the machine lock because the gateway calls back on its own thread.</p>`,
      code: `import java.util.*;

enum VState { IDLE, SELECTED, AUTHORIZING, DISPENSING }

interface Gateway { void voidAuth(String authId); }

class CardVending {
    private VState state = VState.IDLE;
    private String slot, pendingAuth;
    private int seq = 0, dispensed = 0;
    private final Set<String> captured = new HashSet<>();
    private final Gateway gateway;
    CardVending(Gateway g) { gateway = g; }

    synchronized void select(String s) {
        if (state != VState.IDLE && state != VState.SELECTED) { System.out.println("busy"); return; }
        slot = s; state = VState.SELECTED;
    }
    synchronized String payByCard() {
        if (state != VState.SELECTED) { System.out.println("select first"); return null; }
        pendingAuth = "auth-" + (++seq);
        state = VState.AUTHORIZING;
        return pendingAuth;
    }
    synchronized void onAuthResult(String authId, boolean approved) {
        boolean current = state == VState.AUTHORIZING && authId.equals(pendingAuth);
        if (!current) {                                              // duplicate or stale
            if (approved && !captured.contains(authId)) { gateway.voidAuth(authId); System.out.println("stale " + authId + " voided"); }
            else System.out.println("duplicate " + authId + " ignored");
            return;
        }
        pendingAuth = null;
        if (!approved) { state = VState.SELECTED; System.out.println("declined, try again"); return; }
        captured.add(authId);
        state = VState.DISPENSING;
        dispensed++;
        System.out.println("dispensing " + slot + " (" + authId + ")");
        state = VState.IDLE;
    }
    synchronized void timeout() {
        if (state != VState.AUTHORIZING) return;
        System.out.println("payment timed out");
        pendingAuth = null;                                          // a late approval will now be stale
        state = VState.IDLE;
    }
    synchronized int dispensed() { return dispensed; }

    public static void main(String[] args) {
        CardVending vm = new CardVending(id -> System.out.println("gateway: void " + id));
        vm.select("A1");
        String a1 = vm.payByCard();
        vm.onAuthResult(a1, true);
        vm.onAuthResult(a1, true);                 // duplicate
        vm.select("B2");
        String a2 = vm.payByCard();
        vm.timeout();
        vm.onAuthResult(a2, true);                 // late -> void
        vm.payByCard();                            // select first
        vm.select("C3");
        String a3 = vm.payByCard();
        vm.select("D4");                           // busy while authorizing
        vm.onAuthResult(a3, false);                // declined -> back to SELECTED
        vm.onAuthResult(a3, false);                // duplicate decline
        String a4 = vm.payByCard();
        vm.onAuthResult(a4, true);
        System.out.println("items dispensed: " + vm.dispensed());   // 2
    }
}`, alt: [
          { lang: 'python', code: `import threading
from enum import Enum
from typing import Callable, Optional


class VState(Enum):
    IDLE = 1
    SELECTED = 2
    AUTHORIZING = 3
    DISPENSING = 4


Gateway = Callable[[str], None]  # void_auth(auth_id): a one-method interface is just a callable


class CardVending:
    def __init__(self, gateway: Gateway) -> None:
        self._state = VState.IDLE
        self._slot = ""
        self._pending_auth: Optional[str] = None
        self._seq = 0
        self._dispensed = 0
        self._captured: set[str] = set()
        self._gateway = gateway
        self._lock = threading.RLock()  # plays the role of Java's synchronized

    def select(self, s: str) -> None:
        with self._lock:
            if self._state not in (VState.IDLE, VState.SELECTED):
                print("busy")
                return
            self._slot = s
            self._state = VState.SELECTED

    def pay_by_card(self) -> Optional[str]:
        with self._lock:
            if self._state is not VState.SELECTED:
                print("select first")
                return None
            self._seq += 1
            self._pending_auth = f"auth-{self._seq}"
            self._state = VState.AUTHORIZING
            return self._pending_auth

    def on_auth_result(self, auth_id: str, approved: bool) -> None:
        with self._lock:
            current = self._state is VState.AUTHORIZING and auth_id == self._pending_auth
            if not current:  # duplicate or stale
                if approved and auth_id not in self._captured:
                    self._gateway(auth_id)
                    print(f"stale {auth_id} voided")
                else:
                    print(f"duplicate {auth_id} ignored")
                return
            self._pending_auth = None
            if not approved:
                self._state = VState.SELECTED
                print("declined, try again")
                return
            self._captured.add(auth_id)
            self._state = VState.DISPENSING
            self._dispensed += 1
            print(f"dispensing {self._slot} ({auth_id})")
            self._state = VState.IDLE

    def timeout(self) -> None:
        with self._lock:
            if self._state is not VState.AUTHORIZING:
                return
            print("payment timed out")
            self._pending_auth = None  # a late approval will now be stale
            self._state = VState.IDLE

    def dispensed(self) -> int:
        with self._lock:
            return self._dispensed


if __name__ == "__main__":
    vm = CardVending(lambda auth_id: print(f"gateway: void {auth_id}"))
    vm.select("A1")
    a1 = vm.pay_by_card()
    vm.on_auth_result(a1, True)
    vm.on_auth_result(a1, True)  # duplicate
    vm.select("B2")
    a2 = vm.pay_by_card()
    vm.timeout()
    vm.on_auth_result(a2, True)  # late -> void
    vm.pay_by_card()  # select first
    vm.select("C3")
    a3 = vm.pay_by_card()
    vm.select("D4")  # busy while authorizing
    vm.on_auth_result(a3, False)  # declined -> back to SELECTED
    vm.on_auth_result(a3, False)  # duplicate decline
    a4 = vm.pay_by_card()
    vm.on_auth_result(a4, True)
    print("items dispensed:", vm.dispensed())  # 2` },
          { lang: 'ts', code: `type VState = "IDLE" | "SELECTED" | "AUTHORIZING" | "DISPENSING";

interface Gateway {
  voidAuth(authId: string): void;
}

// All calls run on one thread, so each method is already atomic; a multi-threaded runtime would lock here.
class CardVending {
  private state: VState = "IDLE";
  private slot = "";
  private pendingAuth: string | null = null;
  private seq = 0;
  private count = 0;
  private readonly captured = new Set<string>();

  constructor(private readonly gateway: Gateway) {}

  select(s: string): void {
    if (this.state !== "IDLE" && this.state !== "SELECTED") { console.log("busy"); return; }
    this.slot = s;
    this.state = "SELECTED";
  }
  payByCard(): string | null {
    if (this.state !== "SELECTED") { console.log("select first"); return null; }
    this.pendingAuth = "auth-" + ++this.seq;
    this.state = "AUTHORIZING";
    return this.pendingAuth;
  }
  onAuthResult(authId: string, approved: boolean): void {
    const current = this.state === "AUTHORIZING" && authId === this.pendingAuth;
    if (!current) { // duplicate or stale
      if (approved && !this.captured.has(authId)) {
        this.gateway.voidAuth(authId);
        console.log(\`stale \${authId} voided\`);
      } else console.log(\`duplicate \${authId} ignored\`);
      return;
    }
    this.pendingAuth = null;
    if (!approved) { this.state = "SELECTED"; console.log("declined, try again"); return; }
    this.captured.add(authId);
    this.state = "DISPENSING";
    this.count++;
    console.log(\`dispensing \${this.slot} (\${authId})\`);
    this.state = "IDLE";
  }
  timeout(): void {
    if (this.state !== "AUTHORIZING") return;
    console.log("payment timed out");
    this.pendingAuth = null; // a late approval will now be stale
    this.state = "IDLE";
  }
  dispensed(): number { return this.count; }
}

const vm = new CardVending({ voidAuth: (id) => console.log(\`gateway: void \${id}\`) });
vm.select("A1");
const a1 = vm.payByCard()!;
vm.onAuthResult(a1, true);
vm.onAuthResult(a1, true); // duplicate
vm.select("B2");
const a2 = vm.payByCard()!;
vm.timeout();
vm.onAuthResult(a2, true); // late -> void
vm.payByCard(); // select first
vm.select("C3");
const a3 = vm.payByCard()!;
vm.select("D4"); // busy while authorizing
vm.onAuthResult(a3, false); // declined -> back to SELECTED
vm.onAuthResult(a3, false); // duplicate decline
const a4 = vm.payByCard()!;
vm.onAuthResult(a4, true);
console.log("items dispensed: " + vm.dispensed()); // 2` },
          { lang: 'cpp', code: `enum class VState { IDLE, SELECTED, AUTHORIZING, DISPENSING };

struct Gateway {
    virtual ~Gateway() = default;
    virtual void voidAuth(const string& authId) = 0;
};

class CardVending {
    VState state_ = VState::IDLE;
    string slot_;
    optional<string> pendingAuth_;
    int seq_ = 0, dispensed_ = 0;
    set<string> captured_;
    Gateway& gateway_;
    mutable recursive_mutex mu_;  // plays the role of Java's synchronized

public:
    explicit CardVending(Gateway& g) : gateway_(g) {}

    void select(const string& s) {
        lock_guard g(mu_);
        if (state_ != VState::IDLE && state_ != VState::SELECTED) { cout << "busy\\n"; return; }
        slot_ = s;
        state_ = VState::SELECTED;
    }
    optional<string> payByCard() {
        lock_guard g(mu_);
        if (state_ != VState::SELECTED) { cout << "select first\\n"; return nullopt; }
        pendingAuth_ = "auth-" + to_string(++seq_);
        state_ = VState::AUTHORIZING;
        return pendingAuth_;
    }
    void onAuthResult(const string& authId, bool approved) {
        lock_guard g(mu_);
        bool current = state_ == VState::AUTHORIZING && pendingAuth_ == authId;
        if (!current) {  // duplicate or stale
            if (approved && !captured_.count(authId)) {
                gateway_.voidAuth(authId);
                cout << "stale " << authId << " voided\\n";
            } else {
                cout << "duplicate " << authId << " ignored\\n";
            }
            return;
        }
        pendingAuth_.reset();
        if (!approved) { state_ = VState::SELECTED; cout << "declined, try again\\n"; return; }
        captured_.insert(authId);
        state_ = VState::DISPENSING;
        dispensed_++;
        cout << "dispensing " << slot_ << " (" << authId << ")\\n";
        state_ = VState::IDLE;
    }
    void timeout() {
        lock_guard g(mu_);
        if (state_ != VState::AUTHORIZING) return;
        cout << "payment timed out\\n";
        pendingAuth_.reset();  // a late approval will now be stale
        state_ = VState::IDLE;
    }
    int dispensed() const { lock_guard g(mu_); return dispensed_; }
};

struct PrintingGateway final : Gateway {
    void voidAuth(const string& id) override { cout << "gateway: void " << id << "\\n"; }
};

int main() {
    PrintingGateway gw;
    CardVending vm(gw);
    vm.select("A1");
    string a1 = *vm.payByCard();
    vm.onAuthResult(a1, true);
    vm.onAuthResult(a1, true);  // duplicate
    vm.select("B2");
    string a2 = *vm.payByCard();
    vm.timeout();
    vm.onAuthResult(a2, true);  // late -> void
    vm.payByCard();             // select first
    vm.select("C3");
    string a3 = *vm.payByCard();
    vm.select("D4");            // busy while authorizing
    vm.onAuthResult(a3, false); // declined -> back to SELECTED
    vm.onAuthResult(a3, false); // duplicate decline
    string a4 = *vm.payByCard();
    vm.onAuthResult(a4, true);
    cout << "items dispensed: " << vm.dispensed() << "\\n";  // 2
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

enum VState { IDLE, SELECTED, AUTHORIZING, DISPENSING }

delegate void Gateway(string authId);          // VoidAuth(authId)

class CardVending {
    private VState state = VState.IDLE;
    private string slot, pendingAuth;
    private int seq = 0, dispensed = 0;
    private readonly HashSet<string> captured = new HashSet<string>();
    private readonly Gateway gateway;
    private readonly object gate = new object();
    public CardVending(Gateway g) { gateway = g; }

    public void Select(string s) {
        lock (gate) {
            if (state != VState.IDLE && state != VState.SELECTED) { Console.WriteLine("busy"); return; }
            slot = s; state = VState.SELECTED;
        }
    }
    public string PayByCard() {
        lock (gate) {
            if (state != VState.SELECTED) { Console.WriteLine("select first"); return null; }
            pendingAuth = "auth-" + (++seq);
            state = VState.AUTHORIZING;
            return pendingAuth;
        }
    }
    public void OnAuthResult(string authId, bool approved) {
        lock (gate) {
            bool current = state == VState.AUTHORIZING && authId == pendingAuth;
            if (!current) {                                              // duplicate or stale
                if (approved && !captured.Contains(authId)) { gateway(authId); Console.WriteLine("stale " + authId + " voided"); }
                else Console.WriteLine("duplicate " + authId + " ignored");
                return;
            }
            pendingAuth = null;
            if (!approved) { state = VState.SELECTED; Console.WriteLine("declined, try again"); return; }
            captured.Add(authId);
            state = VState.DISPENSING;
            dispensed++;
            Console.WriteLine("dispensing " + slot + " (" + authId + ")");
            state = VState.IDLE;
        }
    }
    public void Timeout() {
        lock (gate) {
            if (state != VState.AUTHORIZING) return;
            Console.WriteLine("payment timed out");
            pendingAuth = null;                                          // a late approval will now be stale
            state = VState.IDLE;
        }
    }
    public int Dispensed() { lock (gate) return dispensed; }

    static void Main() {
        CardVending vm = new CardVending(id => Console.WriteLine("gateway: void " + id));
        vm.Select("A1");
        string a1 = vm.PayByCard();
        vm.OnAuthResult(a1, true);
        vm.OnAuthResult(a1, true);                 // duplicate
        vm.Select("B2");
        string a2 = vm.PayByCard();
        vm.Timeout();
        vm.OnAuthResult(a2, true);                 // late -> void
        vm.PayByCard();                            // select first
        vm.Select("C3");
        string a3 = vm.PayByCard();
        vm.Select("D4");                           // busy while authorizing
        vm.OnAuthResult(a3, false);                // declined -> back to SELECTED
        vm.OnAuthResult(a3, false);                // duplicate decline
        string a4 = vm.PayByCard();
        vm.OnAuthResult(a4, true);
        Console.WriteLine("items dispensed: " + vm.Dispensed());   // 2
    }
}` }
        ],
      complexity: `<p>O(1) per event; the captured-id set grows with sales (prune by age in production).</p>`,
      followUps: ['The approval arrives, but the motor jams: refund via the gateway — which state handles that?', 'Persist pendingAuth so a reboot during AUTHORIZING can reconcile with the gateway.']
    }
  });

  practice.push({
    title: 'Parking Exit Gate Machine (mini machine-coding)', level: 'Medium', tags: ['state pattern', 'payments', 'machine coding'], companies: ['Uber', 'Flipkart', 'Paytm'],
    statement: `<p>Design the exit gate of a parking lot. States: <b>WAITING</b> (no car), <b>TICKET_SCANNED</b> (fee computed), <b>PAID</b>, <b>GATE_OPEN</b>. Events: <code>scan(ticketId, now)</code>, <code>lostTicket()</code> (flat fee ₹500), <code>pay(amount)</code>, <code>vehiclePassed()</code>, <code>cancel()</code>. Fee: first hour ₹50, each extra started hour ₹30, free within 10 minutes. A free exit opens the gate immediately. The gate must close only after the vehicle-passed sensor fires. A ticket can be used to exit only once.</p>`,
    constraints: `Times in minutes. Overpayment returns change. Underpayment keeps the state and shows the amount due.`,
    example: `<p>Entry at 0, scan at 130 min → 3 started hours → 50 + 30 + 30 = ${H.c('b', '₹110')}. pay 100 → ${H.c('r', 'due 10')}; pay 20 → ${H.c('g', 'change 10, GATE_OPEN')}; vehiclePassed → WAITING. Scanning the same ticket again → ${H.c('r', 'already used')}.</p>`,
    brute: { why: `<p>One <code>handle(String event)</code> with nested ifs and booleans <code>paid</code>, <code>gateOpen</code>, <code>scanned</code>. The gate opens on payment but nothing prevents a second car from tailgating while it is open; reusing a ticket is not detected; the lost-ticket path is pasted into the scan branch.</p>`, code: { lang: 'java', code: `class NaiveGate {
    boolean scanned, paid, open; int due;
    void scan(int minutes) { scanned = true; due = minutes <= 10 ? 0 : 50 + 30 * ((minutes - 1) / 60); }   // ticket reuse not checked
    void pay(int amt) { if (scanned && amt >= due) { paid = true; open = true; } }
    void passed() { open = false; scanned = false; paid = false; }
}`, alt: [{ lang: 'python', code: "class NaiveGate:\n    def __init__(self):\n        self.scanned = self.paid = self.open = False\n        self.due = 0\n\n    def scan(self, minutes):                 # ticket reuse not checked\n        self.scanned = True\n        self.due = 0 if minutes <= 10 else 50 + 30 * ((minutes - 1) // 60)\n\n    def pay(self, amt):\n        if self.scanned and amt >= self.due: self.paid = self.open = True\n\n    def passed(self): self.open = self.scanned = self.paid = False\n" }, { lang: 'ts', code: "class NaiveGate {\n  scanned = false; paid = false; open = false; due = 0;\n  scan(minutes: number): void { this.scanned = true; this.due = minutes <= 10 ? 0 : 50 + 30 * Math.floor((minutes - 1) / 60); }   // ticket reuse not checked\n  pay(amt: number): void { if (this.scanned && amt >= this.due) { this.paid = true; this.open = true; } }\n  passed(): void { this.open = false; this.scanned = false; this.paid = false; }\n}\n" }, { lang: 'cpp', code: "class NaiveGate {\npublic:\n    bool scanned = false, paid = false, open = false; int due = 0;\n    void scan(int minutes) { scanned = true; due = minutes <= 10 ? 0 : 50 + 30 * ((minutes - 1) / 60); }   // ticket reuse not checked\n    void pay(int amt) { if (scanned && amt >= due) { paid = true; open = true; } }\n    void passed() { open = false; scanned = false; paid = false; }\n};\n" }, { lang: 'csharp', code: "class NaiveGate {\n    public bool Scanned, Paid, Open; public int Due;\n    public void Scan(int minutes) { Scanned = true; Due = minutes <= 10 ? 0 : 50 + 30 * ((minutes - 1) / 60); }   // ticket reuse not checked\n    public void Pay(int amt) { if (Scanned && amt >= Due) { Paid = true; Open = true; } }\n    public void Passed() { Open = false; Scanned = false; Paid = false; }\n}\n" }] } },
    mcq: { q: 'The fee for a stay of exactly 60 minutes with this pricing is…', options: ['₹50 (one started hour)', '₹80', '₹0', '₹30'], answer: 0, explain: '60 minutes is one started hour: ceil(60/60) = 1 → ₹50. 61 minutes would be ₹80.' },
    hints: [`<p>Hint 1: Fee logic is a pure function (a Strategy) separate from the gate's state machine: <code>fee(minutes)</code> with ceiling division for started hours.</p>`, `<p>Hint 2: States: WAITING accepts scan/lostTicket; TICKET_SCANNED accepts pay/cancel; GATE_OPEN accepts only vehiclePassed. PAID can be skipped by going straight to GATE_OPEN after full payment.</p>`, `<p>Hint 3: Keep a set of used ticket ids (or mark the ticket record) and reject reuse at scan time. Track <code>due</code> in the context; partial payments reduce it.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "[TICKET_SCANNED] fee Rs 110\n[TICKET_SCANNED] due Rs 10\n[TICKET_SCANNED] change Rs 10\n[GATE_OPEN] gate open\n[WAITING] gate closed\n[WAITING] ticket already used\n[TICKET_SCANNED] fee Rs 0\n[GATE_OPEN] gate open\n[WAITING] gate closed\n[WAITING] unknown ticket\n[WAITING] nothing to pay\n[WAITING] ALERT: sensor without open gate\n[TICKET_SCANNED] lost ticket fee Rs 500\n[TICKET_SCANNED] finish current exit first\n[TICKET_SCANNED] cancelled, collect your money\n[TICKET_SCANNED] lost ticket fee Rs 500\n[GATE_OPEN] gate open\n[WAITING] gate closed\n" }] },
      solution: {
      approach: `<p>Enum-driven state checks in a small context class (the machine is small and linear, so an enum + guards is clearer than many classes), with fee calculation as a separate pure strategy. Used tickets are recorded when the gate opens, not when scanned, so a cancelled scan can be retried.</p>`,
      code: `import java.util.*;
import java.util.function.*;

enum GateState { WAITING, TICKET_SCANNED, GATE_OPEN }

class ExitGate {
    private GateState state = GateState.WAITING;
    private final Map<String, Integer> entryMinute = new HashMap<>();
    private final Set<String> used = new HashSet<>();
    private final IntUnaryOperator fee;                   // pricing strategy
    private String ticket;
    private int due;

    ExitGate(IntUnaryOperator fee) { this.fee = fee; }
    void issue(String id, int minute) { entryMinute.put(id, minute); }

    void scan(String id, int now) {
        if (state != GateState.WAITING) { say("finish current exit first"); return; }
        if (!entryMinute.containsKey(id)) { say("unknown ticket"); return; }
        if (used.contains(id)) { say("ticket already used"); return; }
        ticket = id;
        due = fee.applyAsInt(now - entryMinute.get(id));
        state = GateState.TICKET_SCANNED;
        say("fee Rs " + due);
        if (due == 0) open();
    }
    void lostTicket() {
        if (state != GateState.WAITING) { say("busy"); return; }
        ticket = null; due = 500; state = GateState.TICKET_SCANNED;
        say("lost ticket fee Rs 500");
    }
    void pay(int amount) {
        if (state != GateState.TICKET_SCANNED) { say("nothing to pay"); return; }
        due -= amount;
        if (due > 0) { say("due Rs " + due); return; }
        if (due < 0) say("change Rs " + (-due));
        open();
    }
    void cancel() { if (state == GateState.TICKET_SCANNED) { say("cancelled, collect your money"); state = GateState.WAITING; } }
    void vehiclePassed() {
        if (state != GateState.GATE_OPEN) { say("ALERT: sensor without open gate"); return; }
        state = GateState.WAITING;
        say("gate closed");
    }
    private void open() { if (ticket != null) used.add(ticket); state = GateState.GATE_OPEN; say("gate open"); }
    private void say(String s) { System.out.println("[" + state + "] " + s); }

    static int standardFee(int minutes) {
        if (minutes <= 10) return 0;
        int hours = (minutes + 59) / 60;                  // started hours
        return 50 + 30 * (hours - 1);
    }

    public static void main(String[] args) {
        ExitGate g = new ExitGate(ExitGate::standardFee);
        g.issue("T1", 0);
        g.scan("T1", 130);          // Rs 110
        g.pay(100); g.pay(20);      // change 10, open
        g.vehiclePassed();
        g.scan("T1", 140);          // already used
        g.issue("T2", 100);
        g.scan("T2", 105);          // free exit within 10 minutes
        g.vehiclePassed();
        g.scan("T9", 1);            // unknown ticket
        g.pay(5);                   // nothing to pay
        g.vehiclePassed();          // sensor without an open gate
        g.lostTicket();
        g.scan("T1", 1);            // must finish the current exit
        g.cancel();
        g.lostTicket();
        g.pay(500);                 // exact payment, no ticket to mark used
        g.vehiclePassed();
    }
}`, alt: [
          { lang: 'python', code: `from enum import Enum
from typing import Callable, Optional


class GateState(Enum):
    WAITING = 1
    TICKET_SCANNED = 2
    GATE_OPEN = 3


class ExitGate:
    def __init__(self, fee: Callable[[int], int]) -> None:  # pricing strategy
        self._fee = fee
        self._state = GateState.WAITING
        self._entry_minute: dict[str, int] = {}
        self._used: set[str] = set()
        self._ticket: Optional[str] = None
        self._due = 0

    def issue(self, ticket_id: str, minute: int) -> None:
        self._entry_minute[ticket_id] = minute

    def scan(self, ticket_id: str, now: int) -> None:
        if self._state is not GateState.WAITING:
            self._say("finish current exit first")
            return
        if ticket_id not in self._entry_minute:
            self._say("unknown ticket")
            return
        if ticket_id in self._used:
            self._say("ticket already used")
            return
        self._ticket = ticket_id
        self._due = self._fee(now - self._entry_minute[ticket_id])
        self._state = GateState.TICKET_SCANNED
        self._say(f"fee Rs {self._due}")
        if self._due == 0:
            self._open()

    def lost_ticket(self) -> None:
        if self._state is not GateState.WAITING:
            self._say("busy")
            return
        self._ticket, self._due, self._state = None, 500, GateState.TICKET_SCANNED
        self._say("lost ticket fee Rs 500")

    def pay(self, amount: int) -> None:
        if self._state is not GateState.TICKET_SCANNED:
            self._say("nothing to pay")
            return
        self._due -= amount
        if self._due > 0:
            self._say(f"due Rs {self._due}")
            return
        if self._due < 0:
            self._say(f"change Rs {-self._due}")
        self._open()

    def cancel(self) -> None:
        if self._state is GateState.TICKET_SCANNED:
            self._say("cancelled, collect your money")
            self._state = GateState.WAITING

    def vehicle_passed(self) -> None:
        if self._state is not GateState.GATE_OPEN:
            self._say("ALERT: sensor without open gate")
            return
        self._state = GateState.WAITING
        self._say("gate closed")

    def _open(self) -> None:
        if self._ticket is not None:
            self._used.add(self._ticket)
        self._state = GateState.GATE_OPEN
        self._say("gate open")

    def _say(self, s: str) -> None:
        print(f"[{self._state.name}] {s}")


def standard_fee(minutes: int) -> int:
    if minutes <= 10:
        return 0
    hours = (minutes + 59) // 60  # started hours
    return 50 + 30 * (hours - 1)


if __name__ == "__main__":
    g = ExitGate(standard_fee)
    g.issue("T1", 0)
    g.scan("T1", 130)  # Rs 110
    g.pay(100); g.pay(20)  # change 10, open
    g.vehicle_passed()
    g.scan("T1", 140)  # already used
    g.issue("T2", 100)
    g.scan("T2", 105)  # free exit within 10 minutes
    g.vehicle_passed()
    g.scan("T9", 1)  # unknown ticket
    g.pay(5)  # nothing to pay
    g.vehicle_passed()  # sensor without an open gate
    g.lost_ticket()
    g.scan("T1", 1)  # must finish the current exit
    g.cancel()
    g.lost_ticket()
    g.pay(500)  # exact payment, no ticket to mark used
    g.vehicle_passed()` },
          { lang: 'ts', code: `type GateState = "WAITING" | "TICKET_SCANNED" | "GATE_OPEN";
type FeePolicy = (minutes: number) => number; // pricing strategy

class ExitGate {
  private state: GateState = "WAITING";
  private readonly entryMinute = new Map<string, number>();
  private readonly used = new Set<string>();
  private ticket: string | null = null;
  private due = 0;

  constructor(private readonly fee: FeePolicy) {}

  issue(id: string, minute: number): void { this.entryMinute.set(id, minute); }

  scan(id: string, now: number): void {
    if (this.state !== "WAITING") { this.say("finish current exit first"); return; }
    const entered = this.entryMinute.get(id);
    if (entered === undefined) { this.say("unknown ticket"); return; }
    if (this.used.has(id)) { this.say("ticket already used"); return; }
    this.ticket = id;
    this.due = this.fee(now - entered);
    this.state = "TICKET_SCANNED";
    this.say(\`fee Rs \${this.due}\`);
    if (this.due === 0) this.open();
  }
  lostTicket(): void {
    if (this.state !== "WAITING") { this.say("busy"); return; }
    this.ticket = null; this.due = 500; this.state = "TICKET_SCANNED";
    this.say("lost ticket fee Rs 500");
  }
  pay(amount: number): void {
    if (this.state !== "TICKET_SCANNED") { this.say("nothing to pay"); return; }
    this.due -= amount;
    if (this.due > 0) { this.say(\`due Rs \${this.due}\`); return; }
    if (this.due < 0) this.say(\`change Rs \${-this.due}\`);
    this.open();
  }
  cancel(): void {
    if (this.state === "TICKET_SCANNED") { this.say("cancelled, collect your money"); this.state = "WAITING"; }
  }
  vehiclePassed(): void {
    if (this.state !== "GATE_OPEN") { this.say("ALERT: sensor without open gate"); return; }
    this.state = "WAITING";
    this.say("gate closed");
  }
  private open(): void {
    if (this.ticket !== null) this.used.add(this.ticket);
    this.state = "GATE_OPEN";
    this.say("gate open");
  }
  private say(s: string): void { console.log(\`[\${this.state}] \${s}\`); }

  static standardFee(minutes: number): number {
    if (minutes <= 10) return 0;
    const hours = Math.floor((minutes + 59) / 60); // started hours
    return 50 + 30 * (hours - 1);
  }
}

const g = new ExitGate(ExitGate.standardFee);
g.issue("T1", 0);
g.scan("T1", 130); // Rs 110
g.pay(100); g.pay(20); // change 10, open
g.vehiclePassed();
g.scan("T1", 140); // already used
g.issue("T2", 100);
g.scan("T2", 105); // free exit within 10 minutes
g.vehiclePassed();
g.scan("T9", 1); // unknown ticket
g.pay(5); // nothing to pay
g.vehiclePassed(); // sensor without an open gate
g.lostTicket();
g.scan("T1", 1); // must finish the current exit
g.cancel();
g.lostTicket();
g.pay(500); // exact payment, no ticket to mark used
g.vehiclePassed();` },
          { lang: 'cpp', code: `enum class GateState { WAITING, TICKET_SCANNED, GATE_OPEN };

const char* name(GateState s) {
    static const char* names[] = {"WAITING", "TICKET_SCANNED", "GATE_OPEN"};
    return names[static_cast<int>(s)];
}

class ExitGate {
    GateState state_ = GateState::WAITING;
    map<string, int> entryMinute_;
    set<string> used_;
    function<int(int)> fee_;  // pricing strategy
    optional<string> ticket_;
    int due_ = 0;

    void open() {
        if (ticket_) used_.insert(*ticket_);
        state_ = GateState::GATE_OPEN;
        say("gate open");
    }
    void say(const string& s) const { cout << "[" << name(state_) << "] " << s << "\\n"; }

public:
    explicit ExitGate(function<int(int)> fee) : fee_(move(fee)) {}

    void issue(const string& id, int minute) { entryMinute_[id] = minute; }

    void scan(const string& id, int now) {
        if (state_ != GateState::WAITING) { say("finish current exit first"); return; }
        auto it = entryMinute_.find(id);
        if (it == entryMinute_.end()) { say("unknown ticket"); return; }
        if (used_.count(id)) { say("ticket already used"); return; }
        ticket_ = id;
        due_ = fee_(now - it->second);
        state_ = GateState::TICKET_SCANNED;
        say("fee Rs " + to_string(due_));
        if (due_ == 0) open();
    }
    void lostTicket() {
        if (state_ != GateState::WAITING) { say("busy"); return; }
        ticket_.reset(); due_ = 500; state_ = GateState::TICKET_SCANNED;
        say("lost ticket fee Rs 500");
    }
    void pay(int amount) {
        if (state_ != GateState::TICKET_SCANNED) { say("nothing to pay"); return; }
        due_ -= amount;
        if (due_ > 0) { say("due Rs " + to_string(due_)); return; }
        if (due_ < 0) say("change Rs " + to_string(-due_));
        open();
    }
    void cancel() {
        if (state_ == GateState::TICKET_SCANNED) { say("cancelled, collect your money"); state_ = GateState::WAITING; }
    }
    void vehiclePassed() {
        if (state_ != GateState::GATE_OPEN) { say("ALERT: sensor without open gate"); return; }
        state_ = GateState::WAITING;
        say("gate closed");
    }

    static int standardFee(int minutes) {
        if (minutes <= 10) return 0;
        int hours = (minutes + 59) / 60;  // started hours
        return 50 + 30 * (hours - 1);
    }
};

int main() {
    ExitGate g(ExitGate::standardFee);
    g.issue("T1", 0);
    g.scan("T1", 130);  // Rs 110
    g.pay(100); g.pay(20);  // change 10, open
    g.vehiclePassed();
    g.scan("T1", 140);  // already used
    g.issue("T2", 100);
    g.scan("T2", 105);  // free exit within 10 minutes
    g.vehiclePassed();
    g.scan("T9", 1);    // unknown ticket
    g.pay(5);           // nothing to pay
    g.vehiclePassed();  // sensor without an open gate
    g.lostTicket();
    g.scan("T1", 1);    // must finish the current exit
    g.cancel();
    g.lostTicket();
    g.pay(500);         // exact payment, no ticket to mark used
    g.vehiclePassed();
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

enum GateState { WAITING, TICKET_SCANNED, GATE_OPEN }

class ExitGate {
    private GateState state = GateState.WAITING;
    private readonly Dictionary<string, int> entryMinute = new Dictionary<string, int>();
    private readonly HashSet<string> used = new HashSet<string>();
    private readonly Func<int, int> fee;                  // pricing strategy
    private string ticket;
    private int due;

    public ExitGate(Func<int, int> fee) { this.fee = fee; }
    public void Issue(string id, int minute) { entryMinute[id] = minute; }

    public void Scan(string id, int now) {
        if (state != GateState.WAITING) { Say("finish current exit first"); return; }
        if (!entryMinute.ContainsKey(id)) { Say("unknown ticket"); return; }
        if (used.Contains(id)) { Say("ticket already used"); return; }
        ticket = id;
        due = fee(now - entryMinute[id]);
        state = GateState.TICKET_SCANNED;
        Say("fee Rs " + due);
        if (due == 0) Open();
    }
    public void LostTicket() {
        if (state != GateState.WAITING) { Say("busy"); return; }
        ticket = null; due = 500; state = GateState.TICKET_SCANNED;
        Say("lost ticket fee Rs 500");
    }
    public void Pay(int amount) {
        if (state != GateState.TICKET_SCANNED) { Say("nothing to pay"); return; }
        due -= amount;
        if (due > 0) { Say("due Rs " + due); return; }
        if (due < 0) Say("change Rs " + (-due));
        Open();
    }
    public void Cancel() { if (state == GateState.TICKET_SCANNED) { Say("cancelled, collect your money"); state = GateState.WAITING; } }
    public void VehiclePassed() {
        if (state != GateState.GATE_OPEN) { Say("ALERT: sensor without open gate"); return; }
        state = GateState.WAITING;
        Say("gate closed");
    }
    private void Open() { if (ticket != null) used.Add(ticket); state = GateState.GATE_OPEN; Say("gate open"); }
    private void Say(string s) { Console.WriteLine("[" + state + "] " + s); }

    public static int StandardFee(int minutes) {
        if (minutes <= 10) return 0;
        int hours = (minutes + 59) / 60;                  // started hours
        return 50 + 30 * (hours - 1);
    }

    static void Main() {
        ExitGate g = new ExitGate(StandardFee);
        g.Issue("T1", 0);
        g.Scan("T1", 130);          // Rs 110
        g.Pay(100); g.Pay(20);      // change 10, open
        g.VehiclePassed();
        g.Scan("T1", 140);          // already used
        g.Issue("T2", 100);
        g.Scan("T2", 105);          // free exit within 10 minutes
        g.VehiclePassed();
        g.Scan("T9", 1);            // unknown ticket
        g.Pay(5);                   // nothing to pay
        g.VehiclePassed();          // sensor without an open gate
        g.LostTicket();
        g.Scan("T1", 1);            // must finish the current exit
        g.Cancel();
        g.LostTicket();
        g.Pay(500);                 // exact payment, no ticket to mark used
        g.VehiclePassed();
    }
}` }
        ],
      complexity: `<p>O(1) per event; O(T) memory for issued/used tickets (expire them daily in production).</p>`,
      followUps: ['Add a monthly-pass flow (scan pass → open, no fee) as another event.', 'Two exit gates share the used-ticket set: make it thread-safe or move it to a database with a unique constraint.']
    }
  });

  /* ======================= PRACTICE: HARD ======================= */
  practice.push({
    title: 'Multi-Elevator System (full machine-coding round)', level: 'Hard', tags: ['elevator', 'dispatcher', 'state', 'strategy', 'simulation'], companies: ['Amazon', 'Microsoft', 'Uber', 'Walmart', 'Atlassian'],
    statement: `<p>Implement an elevator system for a building with <b>N cars</b> and floors 0..F. Requirements: hall calls (floor + direction) are assigned by a pluggable <b>DispatchStrategy</b>; car calls go to that car; each car runs a LOOK-style state machine (IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN) on <code>tick()</code>; cars in MAINTENANCE get no calls; <code>status()</code> prints every car. The code should be runnable in 60–90 minutes and extensible (new strategy, new state) without rewrites.</p>`,
    constraints: `N ≤ 16, F ≤ 200. Door stays open 1 tick. Ticks are driven by the caller. Deterministic output for tests.`,
    example: `<p>3 cars at 0, 5, 9 (all idle). Car 1 (at 5) goes into maintenance. Hall 7▼ → ${H.c('b', 'car@9')} (distance 2; car@5 would be closest but is out of service). Hall 1▲ → ${H.c('b', 'car@0')}. Hall 4▲ → ${H.c('b', 'car@0')} (cost 4 + 1 stop = 5 vs car@9: 5 + 1 = 6), never the car in maintenance. After enough ticks every request is served and all cars are IDLE.</p>`,
    brute: { why: `<p>A single <code>Elevator</code> class with a global FIFO queue that every car pops from, booleans for moving/doors, and dispatch by "first free car". Cars cross the building for calls next to another car, a car under maintenance still pops requests, and adding zoning means rewriting the queue logic.</p>`, code: { lang: 'java', code: `import java.util.*;
class GlobalQueueElevators {
    final Deque<Integer> queue = new ArrayDeque<>();
    final int[] pos;
    GlobalQueueElevators(int n) { pos = new int[n]; }
    void call(int floor) { queue.add(floor); }
    void step() {
        for (int i = 0; i < pos.length && !queue.isEmpty(); i++) pos[i] = queue.poll();   // teleports, FIFO, ignores distance & maintenance
    }
}`, alt: [{ lang: 'python', code: "from collections import deque\n\nclass GlobalQueueElevators:\n    def __init__(self, n):\n        self.queue = deque()\n        self.pos = [0] * n\n\n    def call(self, floor): self.queue.append(floor)\n\n    def step(self):\n        for i in range(len(self.pos)):\n            if not self.queue: break\n            self.pos[i] = self.queue.popleft()      # teleports, FIFO, ignores distance & maintenance\n" }, { lang: 'ts', code: "class GlobalQueueElevators {\n  private queue: number[] = [];\n  private pos: number[];\n  constructor(n: number) { this.pos = new Array<number>(n).fill(0); }\n  call(floor: number): void { this.queue.push(floor); }\n  step(): void {\n    for (let i = 0; i < this.pos.length && this.queue.length > 0; i++) this.pos[i] = this.queue.shift()!;   // teleports, FIFO, ignores distance & maintenance\n  }\n}\n" }, { lang: 'cpp', code: "class GlobalQueueElevators {\n    deque<int> queue;\n    vector<int> pos;\npublic:\n    GlobalQueueElevators(int n) : pos(n, 0) {}\n    void call(int floor) { queue.push_back(floor); }\n    void step() {\n        for (int i = 0; i < (int)pos.size() && !queue.empty(); i++) { pos[i] = queue.front(); queue.pop_front(); }   // teleports, FIFO, ignores distance & maintenance\n    }\n};\n" }, { lang: 'csharp', code: "using System.Collections.Generic;\nclass GlobalQueueElevators {\n    public readonly Queue<int> Pending = new Queue<int>();\n    public readonly int[] Pos;\n    public GlobalQueueElevators(int n) { Pos = new int[n]; }\n    public void Call(int floor) { Pending.Enqueue(floor); }\n    public void Step() {\n        for (int i = 0; i < Pos.Length && Pending.Count > 0; i++) Pos[i] = Pending.Dequeue();   // teleports, FIFO, ignores distance & maintenance\n    }\n}\n" }] } },
    mcq: { q: 'Which pieces should be swappable Strategies in this design?', options: ['Hall-call dispatch (nearest/zoning) and, optionally, per-car next-stop selection', 'The car states', 'The tick loop', 'The Request value object'], answer: 0, explain: 'What changes by building/time-of-day is the dispatch policy; the car state machine is stable.' },
    hints: [`<p>Hint 1: Classes: <code>Building</code> (owns cars + dispatcher), <code>Car</code> (state machine + sorted stop set + direction), <code>DispatchStrategy</code> (choose car), records for calls. Start with one car working end-to-end.</p>`, `<p>Hint 2: Car.tick by state: IDLE → serve here / pick direction (LOOK); MOVING → move one floor, stop if floor is a stop; DOORS_OPEN → close → IDLE. Cost function: idle → distance; moving toward the caller in the same direction → distance; else distance + 2·F.</p>`, `<p>Hint 3: Make MAINTENANCE return "infinite" cost so the dispatcher skips it. Keep printing in <code>status()</code> only, so tests can assert on state. Run the simulation until all cars are idle.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "7 DOWN -> car2\n1 UP   -> car0\n4 UP   -> car0\nall served after 13 ticks\ncar0@4 IDLE stops=[]\ncar1@5 MAINTENANCE stops=[]\ncar2@0 IDLE stops=[]\nrejected: no car in service\n3 UP   -> car1\n" }] },
      solution: {
      approach: `<p>Building = composition of cars + a DispatchStrategy. Each Car is an enum-state machine with a sorted stop set and LOOK direction choice. The default strategy uses a direction-aware cost; maintenance cars report MAX cost. Everything is deterministic and driven by <code>tickAll()</code>, so a test can replay scenarios.</p>`,
      code: `import java.util.*;

enum CarMode { IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, MAINTENANCE }
record Hall(int floor, boolean up) {}

class Lift {
    final int id, top;
    int floor;
    CarMode mode = CarMode.IDLE;
    boolean goingUp = true;
    final TreeSet<Integer> stops = new TreeSet<>();
    Lift(int id, int floor, int top) { this.id = id; this.floor = floor; this.top = top; }

    void addStop(int f) { if (mode != CarMode.MAINTENANCE) stops.add(f); }

    int cost(Hall h) {
        if (mode == CarMode.MAINTENANCE) return Integer.MAX_VALUE;
        int d = Math.abs(floor - h.floor());
        boolean toward = (mode == CarMode.MOVING_UP && h.up() && h.floor() >= floor)
                || (mode == CarMode.MOVING_DOWN && !h.up() && h.floor() <= floor);
        return (mode == CarMode.IDLE || mode == CarMode.DOORS_OPEN || toward) ? d + stops.size() : d + 2 * top + stops.size();
    }

    void tick() {
        switch (mode) {
            case IDLE -> {
                if (stops.remove(floor)) { mode = CarMode.DOORS_OPEN; return; }
                Integer above = stops.higher(floor), below = stops.lower(floor);
                if (above != null && (goingUp || below == null)) { goingUp = true; mode = CarMode.MOVING_UP; }
                else if (below != null) { goingUp = false; mode = CarMode.MOVING_DOWN; }
            }
            case MOVING_UP, MOVING_DOWN -> {
                floor += mode == CarMode.MOVING_UP ? 1 : -1;
                if (stops.remove(floor)) mode = CarMode.DOORS_OPEN;
            }
            case DOORS_OPEN -> mode = CarMode.IDLE;
            case MAINTENANCE -> { }
        }
    }
    @Override public String toString() { return "car" + id + "@" + floor + " " + mode + " stops=" + stops; }
}

interface DispatchStrategy { Lift choose(List<Lift> cars, Hall h); }

class CostDispatch implements DispatchStrategy {
    public Lift choose(List<Lift> cars, Hall h) {
        Lift best = null;
        for (Lift c : cars) if (best == null || c.cost(h) < best.cost(h)) best = c;   // ties -> lower id
        return best == null || best.cost(h) == Integer.MAX_VALUE ? null : best;
    }
}

class LiftBuilding {
    private final List<Lift> cars = new ArrayList<>();
    private DispatchStrategy strategy = new CostDispatch();
    LiftBuilding(int top, int... starts) { for (int i = 0; i < starts.length; i++) cars.add(new Lift(i, starts[i], top)); }

    void setStrategy(DispatchStrategy s) { strategy = s; }
    Lift hallCall(int floor, boolean up) {
        Lift c = strategy.choose(cars, new Hall(floor, up));
        if (c == null) throw new IllegalStateException("no car in service");
        c.addStop(floor);
        return c;
    }
    void carCall(int car, int floor) { cars.get(car).addStop(floor); }
    void maintenance(int car, boolean on) {
        Lift c = cars.get(car);
        if (on) { c.stops.clear(); c.mode = CarMode.MAINTENANCE; } else c.mode = CarMode.IDLE;
    }
    void tickAll() { cars.forEach(Lift::tick); }
    boolean allIdle() { return cars.stream().allMatch(c -> c.stops.isEmpty() && (c.mode == CarMode.IDLE || c.mode == CarMode.MAINTENANCE)); }
    void status() { cars.forEach(System.out::println); }

    public static void main(String[] args) {
        LiftBuilding b = new LiftBuilding(9, 0, 5, 9);
        b.maintenance(1, true);                            // car1 out of service before the calls
        System.out.println("7 DOWN -> car" + b.hallCall(7, false).id);   // car2 (car1 skipped)
        System.out.println("1 UP   -> car" + b.hallCall(1, true).id);    // car0
        System.out.println("4 UP   -> car" + b.hallCall(4, true).id);    // car0
        b.carCall(2, 0);
        int t = 0;
        do { b.tickAll(); t++; } while (!b.allIdle() && t < 100);
        System.out.println("all served after " + t + " ticks");
        b.status();
        b.maintenance(0, true); b.maintenance(2, true);    // every car out of service
        try { b.hallCall(3, true); }
        catch (IllegalStateException e) { System.out.println("rejected: " + e.getMessage()); }
        b.maintenance(1, false);                            // car1 comes back
        System.out.println("3 UP   -> car" + b.hallCall(3, true).id);    // car1
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional

MAX_COST = 2**31 - 1  # "infinite": a car in maintenance is never chosen


class CarMode(Enum):
    IDLE = 1
    MOVING_UP = 2
    MOVING_DOWN = 3
    DOORS_OPEN = 4
    MAINTENANCE = 5


@dataclass(frozen=True)
class Hall:
    floor: int
    up: bool


class Lift:
    def __init__(self, id: int, floor: int, top: int) -> None:
        self.id = id
        self.top = top
        self.floor = floor
        self.mode = CarMode.IDLE
        self.going_up = True
        self.stops: set[int] = set()

    def add_stop(self, f: int) -> None:
        if self.mode is not CarMode.MAINTENANCE:
            self.stops.add(f)

    def cost(self, h: Hall) -> int:
        if self.mode is CarMode.MAINTENANCE:
            return MAX_COST
        d = abs(self.floor - h.floor)
        toward = (self.mode is CarMode.MOVING_UP and h.up and h.floor >= self.floor) or \\
                 (self.mode is CarMode.MOVING_DOWN and not h.up and h.floor <= self.floor)
        if self.mode in (CarMode.IDLE, CarMode.DOORS_OPEN) or toward:
            return d + len(self.stops)
        return d + 2 * self.top + len(self.stops)

    def tick(self) -> None:
        match self.mode:
            case CarMode.IDLE:
                if self.floor in self.stops:
                    self.stops.discard(self.floor)
                    self.mode = CarMode.DOORS_OPEN
                    return
                above = any(s > self.floor for s in self.stops)
                below = any(s < self.floor for s in self.stops)
                if above and (self.going_up or not below):
                    self.going_up = True
                    self.mode = CarMode.MOVING_UP
                elif below:
                    self.going_up = False
                    self.mode = CarMode.MOVING_DOWN
            case CarMode.MOVING_UP | CarMode.MOVING_DOWN:
                self.floor += 1 if self.mode is CarMode.MOVING_UP else -1
                if self.floor in self.stops:
                    self.stops.discard(self.floor)
                    self.mode = CarMode.DOORS_OPEN
            case CarMode.DOORS_OPEN:
                self.mode = CarMode.IDLE
            case CarMode.MAINTENANCE:
                pass

    def __str__(self) -> str:
        stops = "[" + ", ".join(str(s) for s in sorted(self.stops)) + "]"
        return f"car{self.id}@{self.floor} {self.mode.name} stops={stops}"


class DispatchStrategy(ABC):
    @abstractmethod
    def choose(self, cars: list[Lift], h: Hall) -> Optional[Lift]: ...


class CostDispatch(DispatchStrategy):
    def choose(self, cars: list[Lift], h: Hall) -> Optional[Lift]:
        best: Optional[Lift] = None
        for c in cars:
            if best is None or c.cost(h) < best.cost(h):  # ties -> lower id
                best = c
        return None if best is None or best.cost(h) == MAX_COST else best


class LiftBuilding:
    def __init__(self, top: int, *starts: int) -> None:
        self._cars = [Lift(i, s, top) for i, s in enumerate(starts)]
        self._strategy: DispatchStrategy = CostDispatch()

    def set_strategy(self, s: DispatchStrategy) -> None:
        self._strategy = s

    def hall_call(self, floor: int, up: bool) -> Lift:
        c = self._strategy.choose(self._cars, Hall(floor, up))
        if c is None:
            raise RuntimeError("no car in service")
        c.add_stop(floor)
        return c

    def car_call(self, car: int, floor: int) -> None:
        self._cars[car].add_stop(floor)

    def maintenance(self, car: int, on: bool) -> None:
        c = self._cars[car]
        if on:
            c.stops.clear()
            c.mode = CarMode.MAINTENANCE
        else:
            c.mode = CarMode.IDLE

    def tick_all(self) -> None:
        for c in self._cars:
            c.tick()

    def all_idle(self) -> bool:
        return all(not c.stops and c.mode in (CarMode.IDLE, CarMode.MAINTENANCE) for c in self._cars)

    def status(self) -> None:
        for c in self._cars:
            print(c)


if __name__ == "__main__":
    b = LiftBuilding(9, 0, 5, 9)
    b.maintenance(1, True)  # car1 out of service before the calls
    print("7 DOWN -> car", b.hall_call(7, False).id, sep="")  # car2 (car1 skipped)
    print("1 UP   -> car", b.hall_call(1, True).id, sep="")  # car0
    print("4 UP   -> car", b.hall_call(4, True).id, sep="")  # car0
    b.car_call(2, 0)
    t = 0
    while True:
        b.tick_all()
        t += 1
        if b.all_idle() or t >= 100:
            break
    print(f"all served after {t} ticks")
    b.status()
    b.maintenance(0, True); b.maintenance(2, True)  # every car out of service
    try:
        b.hall_call(3, True)
    except RuntimeError as e:
        print("rejected:", e)
    b.maintenance(1, False)  # car1 comes back
    print("3 UP   -> car", b.hall_call(3, True).id, sep="")  # car1` },
          { lang: 'ts', code: `type CarMode = "IDLE" | "MOVING_UP" | "MOVING_DOWN" | "DOORS_OPEN" | "MAINTENANCE";
interface Hall { readonly floor: number; readonly up: boolean }

const MAX_COST = 2 ** 31 - 1; // "infinite": a car in maintenance is never chosen

class Lift {
  mode: CarMode = "IDLE";
  goingUp = true;
  readonly stops = new Set<number>();

  constructor(readonly id: number, public floor: number, readonly top: number) {}

  addStop(f: number): void { if (this.mode !== "MAINTENANCE") this.stops.add(f); }

  cost(h: Hall): number {
    if (this.mode === "MAINTENANCE") return MAX_COST;
    const d = Math.abs(this.floor - h.floor);
    const toward = (this.mode === "MOVING_UP" && h.up && h.floor >= this.floor)
      || (this.mode === "MOVING_DOWN" && !h.up && h.floor <= this.floor);
    return (this.mode === "IDLE" || this.mode === "DOORS_OPEN" || toward)
      ? d + this.stops.size
      : d + 2 * this.top + this.stops.size;
  }

  tick(): void {
    switch (this.mode) {
      case "IDLE": {
        if (this.stops.delete(this.floor)) { this.mode = "DOORS_OPEN"; return; }
        const above = [...this.stops].some((s) => s > this.floor);
        const below = [...this.stops].some((s) => s < this.floor);
        if (above && (this.goingUp || !below)) { this.goingUp = true; this.mode = "MOVING_UP"; }
        else if (below) { this.goingUp = false; this.mode = "MOVING_DOWN"; }
        break;
      }
      case "MOVING_UP":
      case "MOVING_DOWN":
        this.floor += this.mode === "MOVING_UP" ? 1 : -1;
        if (this.stops.delete(this.floor)) this.mode = "DOORS_OPEN";
        break;
      case "DOORS_OPEN":
        this.mode = "IDLE";
        break;
      case "MAINTENANCE":
        break;
    }
  }

  toString(): string {
    return \`car\${this.id}@\${this.floor} \${this.mode} stops=[\${[...this.stops].sort((a, b) => a - b).join(", ")}]\`;
  }
}

interface DispatchStrategy { choose(cars: Lift[], h: Hall): Lift | null }

class CostDispatch implements DispatchStrategy {
  choose(cars: Lift[], h: Hall): Lift | null {
    let best: Lift | null = null;
    for (const c of cars) if (best === null || c.cost(h) < best.cost(h)) best = c; // ties -> lower id
    return best === null || best.cost(h) === MAX_COST ? null : best;
  }
}

class LiftBuilding {
  private readonly cars: Lift[];
  private strategy: DispatchStrategy = new CostDispatch();

  constructor(top: number, ...starts: number[]) {
    this.cars = starts.map((s, i) => new Lift(i, s, top));
  }

  setStrategy(s: DispatchStrategy): void { this.strategy = s; }
  hallCall(floor: number, up: boolean): Lift {
    const c = this.strategy.choose(this.cars, { floor, up });
    if (c === null) throw new Error("no car in service");
    c.addStop(floor);
    return c;
  }
  carCall(car: number, floor: number): void { this.cars[car].addStop(floor); }
  maintenance(car: number, on: boolean): void {
    const c = this.cars[car];
    if (on) { c.stops.clear(); c.mode = "MAINTENANCE"; } else c.mode = "IDLE";
  }
  tickAll(): void { this.cars.forEach((c) => c.tick()); }
  allIdle(): boolean {
    return this.cars.every((c) => c.stops.size === 0 && (c.mode === "IDLE" || c.mode === "MAINTENANCE"));
  }
  status(): void { this.cars.forEach((c) => console.log(String(c))); }
}

const b = new LiftBuilding(9, 0, 5, 9);
b.maintenance(1, true); // car1 out of service before the calls
console.log("7 DOWN -> car" + b.hallCall(7, false).id); // car2 (car1 skipped)
console.log("1 UP   -> car" + b.hallCall(1, true).id); // car0
console.log("4 UP   -> car" + b.hallCall(4, true).id); // car0
b.carCall(2, 0);
let t = 0;
do { b.tickAll(); t++; } while (!b.allIdle() && t < 100);
console.log(\`all served after \${t} ticks\`);
b.status();
b.maintenance(0, true); b.maintenance(2, true); // every car out of service
try { b.hallCall(3, true); }
catch (e) { console.log("rejected: " + (e as Error).message); }
b.maintenance(1, false); // car1 comes back
console.log("3 UP   -> car" + b.hallCall(3, true).id); // car1` },
          { lang: 'cpp', code: `enum class CarMode { IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, MAINTENANCE };
struct Hall { int floor; bool up; };

const char* name(CarMode m) {
    static const char* names[] = {"IDLE", "MOVING_UP", "MOVING_DOWN", "DOORS_OPEN", "MAINTENANCE"};
    return names[static_cast<int>(m)];
}

constexpr int MAX_COST = INT_MAX;  // "infinite": a car in maintenance is never chosen

class Lift {
public:
    const int id, top;
    int floor;
    CarMode mode = CarMode::IDLE;
    bool goingUp = true;
    set<int> stops;

    Lift(int id, int floor, int top) : id(id), top(top), floor(floor) {}

    void addStop(int f) { if (mode != CarMode::MAINTENANCE) stops.insert(f); }

    int cost(const Hall& h) const {
        if (mode == CarMode::MAINTENANCE) return MAX_COST;
        int d = abs(floor - h.floor);
        bool toward = (mode == CarMode::MOVING_UP && h.up && h.floor >= floor)
                   || (mode == CarMode::MOVING_DOWN && !h.up && h.floor <= floor);
        int n = stops.size();
        return (mode == CarMode::IDLE || mode == CarMode::DOORS_OPEN || toward) ? d + n : d + 2 * top + n;
    }

    void tick() {
        switch (mode) {
            case CarMode::IDLE: {
                if (stops.erase(floor)) { mode = CarMode::DOORS_OPEN; return; }
                bool above = stops.upper_bound(floor) != stops.end();
                bool below = !stops.empty() && *stops.begin() < floor;
                if (above && (goingUp || !below)) { goingUp = true; mode = CarMode::MOVING_UP; }
                else if (below) { goingUp = false; mode = CarMode::MOVING_DOWN; }
                break;
            }
            case CarMode::MOVING_UP:
            case CarMode::MOVING_DOWN:
                floor += mode == CarMode::MOVING_UP ? 1 : -1;
                if (stops.erase(floor)) mode = CarMode::DOORS_OPEN;
                break;
            case CarMode::DOORS_OPEN:
                mode = CarMode::IDLE;
                break;
            case CarMode::MAINTENANCE:
                break;
        }
    }

    string toString() const {
        string s = "car" + to_string(id) + "@" + to_string(floor) + " " + name(mode) + " stops=[";
        bool first = true;
        for (int f : stops) { s += (first ? "" : ", ") + to_string(f); first = false; }
        return s + "]";
    }
};

struct DispatchStrategy {
    virtual ~DispatchStrategy() = default;
    virtual Lift* choose(const vector<unique_ptr<Lift>>& cars, const Hall& h) const = 0;
};

struct CostDispatch final : DispatchStrategy {
    Lift* choose(const vector<unique_ptr<Lift>>& cars, const Hall& h) const override {
        Lift* best = nullptr;
        for (const auto& c : cars) if (!best || c->cost(h) < best->cost(h)) best = c.get();  // ties -> lower id
        return !best || best->cost(h) == MAX_COST ? nullptr : best;
    }
};

class LiftBuilding {
    vector<unique_ptr<Lift>> cars_;
    unique_ptr<DispatchStrategy> strategy_ = make_unique<CostDispatch>();

public:
    LiftBuilding(int top, initializer_list<int> starts) {
        int i = 0;
        for (int s : starts) cars_.push_back(make_unique<Lift>(i++, s, top));
    }

    void setStrategy(unique_ptr<DispatchStrategy> s) { strategy_ = move(s); }
    Lift& hallCall(int floor, bool up) {
        Lift* c = strategy_->choose(cars_, Hall{floor, up});
        if (!c) throw runtime_error("no car in service");
        c->addStop(floor);
        return *c;
    }
    void carCall(int car, int floor) { cars_[car]->addStop(floor); }
    void maintenance(int car, bool on) {
        Lift& c = *cars_[car];
        if (on) { c.stops.clear(); c.mode = CarMode::MAINTENANCE; } else c.mode = CarMode::IDLE;
    }
    void tickAll() { for (auto& c : cars_) c->tick(); }
    bool allIdle() const {
        return all_of(cars_.begin(), cars_.end(), [](const auto& c) {
            return c->stops.empty() && (c->mode == CarMode::IDLE || c->mode == CarMode::MAINTENANCE);
        });
    }
    void status() const { for (const auto& c : cars_) cout << c->toString() << "\\n"; }
};

int main() {
    LiftBuilding b(9, {0, 5, 9});
    b.maintenance(1, true);  // car1 out of service before the calls
    cout << "7 DOWN -> car" << b.hallCall(7, false).id << "\\n";  // car2 (car1 skipped)
    cout << "1 UP   -> car" << b.hallCall(1, true).id << "\\n";   // car0
    cout << "4 UP   -> car" << b.hallCall(4, true).id << "\\n";   // car0
    b.carCall(2, 0);
    int t = 0;
    do { b.tickAll(); t++; } while (!b.allIdle() && t < 100);
    cout << "all served after " << t << " ticks\\n";
    b.status();
    b.maintenance(0, true); b.maintenance(2, true);  // every car out of service
    try { b.hallCall(3, true); }
    catch (const runtime_error& e) { cout << "rejected: " << e.what() << "\\n"; }
    b.maintenance(1, false);  // car1 comes back
    cout << "3 UP   -> car" << b.hallCall(3, true).id << "\\n";  // car1
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

enum CarMode { IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, MAINTENANCE }
sealed class Hall { public readonly int Floor; public readonly bool Up; public Hall(int floor, bool up) { Floor = floor; Up = up; } }

class Lift {
    public readonly int Id, Top;
    public int Floor;
    public CarMode Mode = CarMode.IDLE;
    public bool GoingUp = true;
    public readonly SortedSet<int> Stops = new SortedSet<int>();
    public Lift(int id, int floor, int top) { Id = id; Floor = floor; Top = top; }

    public void AddStop(int f) { if (Mode != CarMode.MAINTENANCE) Stops.Add(f); }

    public int Cost(Hall h) {
        if (Mode == CarMode.MAINTENANCE) return int.MaxValue;
        int d = Math.Abs(Floor - h.Floor);
        bool toward = (Mode == CarMode.MOVING_UP && h.Up && h.Floor >= Floor)
                || (Mode == CarMode.MOVING_DOWN && !h.Up && h.Floor <= Floor);
        return (Mode == CarMode.IDLE || Mode == CarMode.DOORS_OPEN || toward) ? d + Stops.Count : d + 2 * Top + Stops.Count;
    }

    public void Tick() {
        switch (Mode) {
            case CarMode.IDLE: {
                if (Stops.Remove(Floor)) { Mode = CarMode.DOORS_OPEN; return; }
                bool above = Stops.GetViewBetween(Floor + 1, int.MaxValue).Count > 0, below = Stops.GetViewBetween(int.MinValue, Floor - 1).Count > 0;
                if (above && (GoingUp || !below)) { GoingUp = true; Mode = CarMode.MOVING_UP; }
                else if (below) { GoingUp = false; Mode = CarMode.MOVING_DOWN; }
                break;
            }
            case CarMode.MOVING_UP:
            case CarMode.MOVING_DOWN:
                Floor += Mode == CarMode.MOVING_UP ? 1 : -1;
                if (Stops.Remove(Floor)) Mode = CarMode.DOORS_OPEN;
                break;
            case CarMode.DOORS_OPEN: Mode = CarMode.IDLE; break;
            case CarMode.MAINTENANCE: break;
        }
    }
    public override string ToString() { return "car" + Id + "@" + Floor + " " + Mode + " stops=[" + string.Join(", ", Stops) + "]"; }
}

interface IDispatchStrategy { Lift Choose(List<Lift> cars, Hall h); }

class CostDispatch : IDispatchStrategy {
    public Lift Choose(List<Lift> cars, Hall h) {
        Lift best = null;
        foreach (Lift c in cars) if (best == null || c.Cost(h) < best.Cost(h)) best = c;   // ties -> lower id
        return best == null || best.Cost(h) == int.MaxValue ? null : best;
    }
}

class LiftBuilding {
    private readonly List<Lift> cars = new List<Lift>();
    private IDispatchStrategy strategy = new CostDispatch();
    public LiftBuilding(int top, params int[] starts) { for (int i = 0; i < starts.Length; i++) cars.Add(new Lift(i, starts[i], top)); }

    public void SetStrategy(IDispatchStrategy s) { strategy = s; }
    public Lift HallCall(int floor, bool up) {
        Lift c = strategy.Choose(cars, new Hall(floor, up));
        if (c == null) throw new InvalidOperationException("no car in service");
        c.AddStop(floor);
        return c;
    }
    public void CarCall(int car, int floor) { cars[car].AddStop(floor); }
    public void Maintenance(int car, bool on) {
        Lift c = cars[car];
        if (on) { c.Stops.Clear(); c.Mode = CarMode.MAINTENANCE; } else c.Mode = CarMode.IDLE;
    }
    public void TickAll() { foreach (Lift c in cars) c.Tick(); }
    public bool AllIdle() { return cars.All(c => c.Stops.Count == 0 && (c.Mode == CarMode.IDLE || c.Mode == CarMode.MAINTENANCE)); }
    public void Status() { foreach (Lift c in cars) Console.WriteLine(c); }

    static void Main() {
        LiftBuilding b = new LiftBuilding(9, 0, 5, 9);
        b.Maintenance(1, true);                            // car1 out of service before the calls
        Console.WriteLine("7 DOWN -> car" + b.HallCall(7, false).Id);   // car2 (car1 skipped)
        Console.WriteLine("1 UP   -> car" + b.HallCall(1, true).Id);    // car0
        Console.WriteLine("4 UP   -> car" + b.HallCall(4, true).Id);    // car0
        b.CarCall(2, 0);
        int t = 0;
        do { b.TickAll(); t++; } while (!b.AllIdle() && t < 100);
        Console.WriteLine("all served after " + t + " ticks");
        b.Status();
        b.Maintenance(0, true); b.Maintenance(2, true);    // every car out of service
        try { b.HallCall(3, true); }
        catch (InvalidOperationException e) { Console.WriteLine("rejected: " + e.Message); }
        b.Maintenance(1, false);                            // car1 comes back
        Console.WriteLine("3 UP   -> car" + b.HallCall(3, true).Id);    // car1
    }
}` }
        ],
      complexity: `<p>Dispatch O(N) per hall call; each tick O(N log S). Simulation of T ticks: O(T · N log S).</p>`,
      followUps: ['Add a zoning strategy for the morning rush and switch strategies by time of day.', 'Re-assign pending hall calls when a car goes into maintenance.', 'Make it thread-safe: one event-loop thread per car, the dispatcher only posts events.']
    }
  });

  practice.push({
    title: 'ATM Withdrawal over a Flaky Network (idempotent, never double-charge)', level: 'Hard', tags: ['atm', 'idempotency', 'retries', 'compensation'], companies: ['Stripe', 'Goldman Sachs', 'Visa', 'Razorpay'],
    statement: `<p>The ATM talks to the bank over a network that can <b>drop requests</b>, <b>drop responses</b> and <b>duplicate messages</b>. Implement <code>withdraw(account, amount)</code> on the ATM side and <code>debit/reverse</code> on the bank side so that, over thousands of random runs, the invariant holds: <b>money dispensed + final balance = initial balance</b>, and the customer is never charged without cash. The ATM retries a request at most 3 times with the same txnId; if it never gets an answer it must reverse.</p>`,
    constraints: `Use a seeded Random for the fake network so runs are reproducible. Bank operations must be idempotent per txnId. Reversal itself may be dropped — keep retrying it (it is safe).`,
    example: `<p>debit(T7) request reaches bank, response dropped → ATM retries debit(T7) → bank sees T7 already applied → ${H.c('b', 'replies approved without charging again')}. If all 3 attempts time out → ATM sends reverse(T7) until acknowledged → ${H.c('g', 'balance restored')}; no cash given.</p>`,
    brute: { why: `<p>Retry with a <b>new</b> request each time (no txnId): a dropped response + retry = two debits, one dispense. Or give up without reversing: the bank debited, the ATM gave nothing. Both are real-world incidents; you only find them with fault injection.</p>`, code: { lang: 'java', code: `class RetryWithoutId {
    long balance = 10_000;
    boolean debit(long amt) { balance -= amt; return true; }      // not idempotent
    void withdraw(long amt) {
        for (int i = 0; i < 3; i++) {
            debit(amt);                                             // response "lost" -> retry -> charged again
        }
    }
}`, alt: [{ lang: 'python', code: "class RetryWithoutId:\n    def __init__(self):\n        self.balance = 10_000\n\n    def debit(self, amt):                            # not idempotent\n        self.balance -= amt\n        return True\n\n    def withdraw(self, amt):\n        for _ in range(3):\n            self.debit(amt)                          # response \"lost\" -> retry -> charged again\n" }, { lang: 'ts', code: "class RetryWithoutId {\n  balance = 10_000;\n  debit(amt: number): boolean { this.balance -= amt; return true; }      // not idempotent\n  withdraw(amt: number): void {\n    for (let i = 0; i < 3; i++) {\n      this.debit(amt);                                                    // response \"lost\" -> retry -> charged again\n    }\n  }\n}\n" }, { lang: 'cpp', code: "class RetryWithoutId {\npublic:\n    long long balance = 10'000;\n    bool debit(long long amt) { balance -= amt; return true; }      // not idempotent\n    void withdraw(long long amt) {\n        for (int i = 0; i < 3; i++) {\n            debit(amt);                                              // response \"lost\" -> retry -> charged again\n        }\n    }\n};\n" }, { lang: 'csharp', code: "class RetryWithoutId {\n    public long Balance = 10000;\n    public bool Debit(long amt) { Balance -= amt; return true; }      // not idempotent\n    public void Withdraw(long amt) {\n        for (int i = 0; i < 3; i++) {\n            Debit(amt);                                                 // response \"lost\" -> retry -> charged again\n        }\n    }\n}\n" }] } },
    mcq: { q: 'The ATM never received any reply to debit(T9). What is the only safe action before showing "transaction failed"?', options: ['Send reverse(T9) (retrying until acknowledged) and do not dispense', 'Dispense anyway, the debit probably worked', 'Retry with a new id T10', 'Do nothing; the bank will notice'], answer: 0, explain: 'Unknown outcome must be resolved to a known one. An idempotent reversal is safe whether or not the debit happened.' },
    hints: [`<p>Hint 1: Bank keeps <code>Map&lt;txnId, status&gt;</code> (DEBITED / REVERSED). debit on a known id returns the stored outcome; reverse on DEBITED restores money; reverse on an unknown id stores a REVERSED tombstone so a late debit is refused.</p>`, `<p>Hint 2: Wrap calls in a fake <code>Network</code> that randomly drops the request (bank never sees it), drops the response (bank applied it), or duplicates the request.</p>`, `<p>Hint 3: ATM: generate txnId once; try debit up to 3 times; approved → dispense; no answer → loop reverse(txnId) until acknowledged. Then check the invariant after 10,000 random runs.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "true true balance 700\nafter reverse 1000, late retry false\ndebit after early reverse: false balance 1000\noverdraw: false\ninvariant violations in 2000 runs: 0\nnaive bank breaks the invariant: true\n" }] },
      solution: {
      approach: `<p>Idempotent bank keyed by txnId with tombstones; ATM generates the id once, retries with the same id, dispenses only after a confirmed approval, and resolves unknown outcomes with an idempotent reversal retried until acknowledged. A seeded fault-injecting network proves the invariant across thousands of runs.</p>`,
      code: `import java.util.*;

interface Bank {
    boolean debit(String id, long amt);
    void reverse(String id, long amt);
    long balance();
}

/** Naive bank: no transaction ids remembered, so a retry or a duplicate charges again. */
class NaiveBank implements Bank {
    private long balance;
    NaiveBank(long balance) { this.balance = balance; }
    public synchronized boolean debit(String id, long amt) { if (balance < amt) return false; balance -= amt; return true; }
    public synchronized void reverse(String id, long amt) { balance += amt; }
    public synchronized long balance() { return balance; }
}

class IdemBank implements Bank {
    enum T { DEBITED, REVERSED }
    long balance;
    private final Map<String, T> txns = new HashMap<>();
    IdemBank(long balance) { this.balance = balance; }
    public synchronized long balance() { return balance; }

    public synchronized boolean debit(String id, long amt) {
        T t = txns.get(id);
        if (t == T.DEBITED) return true;                 // duplicate: same answer, no new charge
        if (t == T.REVERSED) return false;               // tombstone: reversal came first
        if (balance < amt) return false;
        balance -= amt;
        txns.put(id, T.DEBITED);
        return true;
    }
    public synchronized void reverse(String id, long amt) {
        T t = txns.get(id);
        if (t == T.DEBITED) balance += amt;
        txns.put(id, T.REVERSED);                        // also a tombstone for unknown ids
    }
}

/** Fault injection: request lost, response lost, or duplicated. */
class FlakyNet {
    private final Random rnd;
    FlakyNet(long seed) { rnd = new Random(seed); }
    Optional<Boolean> callDebit(Bank bank, String id, long amt) {
        int r = rnd.nextInt(10);
        if (r == 0) return Optional.empty();                         // request lost
        boolean res = bank.debit(id, amt);
        if (r == 1) bank.debit(id, amt);                             // duplicated request
        if (r == 2) return Optional.empty();                         // response lost (bank applied it!)
        return Optional.of(res);
    }
    boolean callReverse(Bank bank, String id, long amt) {
        int r = rnd.nextInt(10);
        if (r == 0) return false;                                    // request lost
        bank.reverse(id, amt);
        return r != 1;                                               // r == 1: ack lost
    }
}

class SafeAtm {
    private int seq = 0;
    long dispensed = 0;

    boolean withdraw(Bank bank, FlakyNet net, long amt) {
        String id = "T" + (++seq);                                   // generated once, reused on retries
        for (int attempt = 0; attempt < 3; attempt++) {
            Optional<Boolean> r = net.callDebit(bank, id, amt);
            if (r.isPresent()) {
                if (!r.get()) return false;                          // declined: nothing to undo
                dispensed += amt;                                    // dispense only after confirmed approval
                return true;
            }
        }
        while (!net.callReverse(bank, id, amt)) { }                  // unknown outcome -> reverse until acked
        return false;
    }

    /** How many of 2000 fault-injected runs end with dispensed + balance != 100000. */
    static int violations(boolean idempotent) {
        int violations = 0;
        for (long seed = 0; seed < 2000; seed++) {
            Bank bank = idempotent ? new IdemBank(100_000) : new NaiveBank(100_000);
            FlakyNet net = new FlakyNet(seed);
            SafeAtm atm = new SafeAtm();
            for (int i = 0; i < 20; i++) atm.withdraw(bank, net, 1_000);
            if (atm.dispensed + bank.balance() != 100_000) violations++;
        }
        return violations;
    }

    public static void main(String[] args) {
        IdemBank b = new IdemBank(1_000);
        System.out.println(b.debit("X", 300) + " " + b.debit("X", 300) + " balance " + b.balance);          // true true balance 700
        b.reverse("X", 300);
        System.out.println("after reverse " + b.balance + ", late retry " + b.debit("X", 300));            // 1000, false
        b.reverse("Y", 300);                                                                                 // reversal arrives before the debit
        System.out.println("debit after early reverse: " + b.debit("Y", 300) + " balance " + b.balance);   // false 1000
        System.out.println("overdraw: " + b.debit("Z", 5_000));                                             // false
        System.out.println("invariant violations in 2000 runs: " + violations(true));                       // 0
        System.out.println("naive bank breaks the invariant: " + (violations(false) > 0));                  // true
    }
}`, alt: [
          { lang: 'python', code: `import random
import threading
from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional


class Bank(ABC):
    @abstractmethod
    def debit(self, txn_id: str, amt: int) -> bool: ...

    @abstractmethod
    def reverse(self, txn_id: str, amt: int) -> None: ...

    @abstractmethod
    def balance(self) -> int: ...


class NaiveBank(Bank):
    """No transaction ids remembered, so a retry or a duplicate charges again."""

    def __init__(self, balance: int) -> None:
        self._balance = balance
        self._lock = threading.Lock()

    def debit(self, txn_id: str, amt: int) -> bool:
        with self._lock:
            if self._balance < amt:
                return False
            self._balance -= amt
            return True

    def reverse(self, txn_id: str, amt: int) -> None:
        with self._lock:
            self._balance += amt

    def balance(self) -> int:
        with self._lock:
            return self._balance


class T(Enum):
    DEBITED = 1
    REVERSED = 2


class IdemBank(Bank):
    def __init__(self, balance: int) -> None:
        self._balance = balance
        self._txns: dict[str, T] = {}
        self._lock = threading.Lock()

    def debit(self, txn_id: str, amt: int) -> bool:
        with self._lock:
            t = self._txns.get(txn_id)
            if t is T.DEBITED:
                return True  # duplicate: same answer, no new charge
            if t is T.REVERSED:
                return False  # tombstone: reversal came first
            if self._balance < amt:
                return False
            self._balance -= amt
            self._txns[txn_id] = T.DEBITED
            return True

    def reverse(self, txn_id: str, amt: int) -> None:
        with self._lock:
            if self._txns.get(txn_id) is T.DEBITED:
                self._balance += amt
            self._txns[txn_id] = T.REVERSED  # also a tombstone for unknown ids

    def balance(self) -> int:
        with self._lock:
            return self._balance


class FlakyNet:
    """Fault injection: request lost, response lost, or duplicated."""

    def __init__(self, seed: int) -> None:
        self._rnd = random.Random(seed)

    def call_debit(self, bank: Bank, txn_id: str, amt: int) -> Optional[bool]:
        r = self._rnd.randrange(10)
        if r == 0:
            return None  # request lost
        res = bank.debit(txn_id, amt)
        if r == 1:
            bank.debit(txn_id, amt)  # duplicated request
        if r == 2:
            return None  # response lost (bank applied it!)
        return res

    def call_reverse(self, bank: Bank, txn_id: str, amt: int) -> bool:
        r = self._rnd.randrange(10)
        if r == 0:
            return False  # request lost
        bank.reverse(txn_id, amt)
        return r != 1  # r == 1: ack lost


class SafeAtm:
    def __init__(self) -> None:
        self._seq = 0
        self.dispensed = 0

    def withdraw(self, bank: Bank, net: FlakyNet, amt: int) -> bool:
        self._seq += 1
        txn_id = f"T{self._seq}"  # generated once, reused on retries
        for _ in range(3):
            r = net.call_debit(bank, txn_id, amt)
            if r is not None:
                if not r:
                    return False  # declined: nothing to undo
                self.dispensed += amt  # dispense only after confirmed approval
                return True
        while not net.call_reverse(bank, txn_id, amt):  # unknown outcome -> reverse until acked
            pass
        return False


def violations(idempotent: bool) -> int:
    """How many of 2000 fault-injected runs end with dispensed + balance != 100000."""
    bad = 0
    for seed in range(2000):
        bank: Bank = IdemBank(100_000) if idempotent else NaiveBank(100_000)
        net = FlakyNet(seed)
        atm = SafeAtm()
        for _ in range(20):
            atm.withdraw(bank, net, 1_000)
        if atm.dispensed + bank.balance() != 100_000:
            bad += 1
    return bad


if __name__ == "__main__":
    b = IdemBank(1_000)
    first, second = b.debit("X", 300), b.debit("X", 300)
    print(str(first).lower(), str(second).lower(), "balance", b.balance())  # true true balance 700
    b.reverse("X", 300)
    after = b.balance()
    print(f"after reverse {after}, late retry {str(b.debit('X', 300)).lower()}")  # 1000, false
    b.reverse("Y", 300)  # reversal arrives before the debit
    ok = b.debit("Y", 300)
    print(f"debit after early reverse: {str(ok).lower()} balance {b.balance()}")  # false 1000
    print("overdraw:", str(b.debit("Z", 5_000)).lower())  # false
    print("invariant violations in 2000 runs:", violations(True))  # 0
    print("naive bank breaks the invariant:", str(violations(False) > 0).lower())  # true` },
          { lang: 'ts', code: `interface Bank {
  debit(id: string, amt: number): boolean;
  reverse(id: string, amt: number): void;
  balance(): number;
}

/** Naive bank: no transaction ids remembered, so a retry or a duplicate charges again. */
class NaiveBank implements Bank {
  constructor(private bal: number) {}
  debit(id: string, amt: number): boolean {
    if (this.bal < amt) return false;
    this.bal -= amt;
    return true;
  }
  reverse(id: string, amt: number): void { this.bal += amt; }
  balance(): number { return this.bal; }
}

type Txn = "DEBITED" | "REVERSED";

class IdemBank implements Bank {
  private readonly txns = new Map<string, Txn>();
  constructor(private bal: number) {}

  debit(id: string, amt: number): boolean {
    const t = this.txns.get(id);
    if (t === "DEBITED") return true; // duplicate: same answer, no new charge
    if (t === "REVERSED") return false; // tombstone: reversal came first
    if (this.bal < amt) return false;
    this.bal -= amt;
    this.txns.set(id, "DEBITED");
    return true;
  }
  reverse(id: string, amt: number): void {
    if (this.txns.get(id) === "DEBITED") this.bal += amt;
    this.txns.set(id, "REVERSED"); // also a tombstone for unknown ids
  }
  balance(): number { return this.bal; }
}

/** Small seeded generator (mulberry32) so every run is reproducible. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fault injection: request lost, response lost, or duplicated. */
class FlakyNet {
  private readonly next: () => number;
  constructor(seed: number) { this.next = seeded(seed); }
  private roll(): number { return Math.floor(this.next() * 10); }

  callDebit(bank: Bank, id: string, amt: number): boolean | null {
    const r = this.roll();
    if (r === 0) return null; // request lost
    const res = bank.debit(id, amt);
    if (r === 1) bank.debit(id, amt); // duplicated request
    if (r === 2) return null; // response lost (bank applied it!)
    return res;
  }
  callReverse(bank: Bank, id: string, amt: number): boolean {
    const r = this.roll();
    if (r === 0) return false; // request lost
    bank.reverse(id, amt);
    return r !== 1; // r == 1: ack lost
  }
}

class SafeAtm {
  private seq = 0;
  dispensed = 0;

  withdraw(bank: Bank, net: FlakyNet, amt: number): boolean {
    const id = "T" + ++this.seq; // generated once, reused on retries
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = net.callDebit(bank, id, amt);
      if (r !== null) {
        if (!r) return false; // declined: nothing to undo
        this.dispensed += amt; // dispense only after confirmed approval
        return true;
      }
    }
    while (!net.callReverse(bank, id, amt)) { /* unknown outcome -> reverse until acked */ }
    return false;
  }
}

/** How many of 2000 fault-injected runs end with dispensed + balance != 100000. */
function violations(idempotent: boolean): number {
  let bad = 0;
  for (let seed = 0; seed < 2000; seed++) {
    const bank: Bank = idempotent ? new IdemBank(100_000) : new NaiveBank(100_000);
    const net = new FlakyNet(seed);
    const atm = new SafeAtm();
    for (let i = 0; i < 20; i++) atm.withdraw(bank, net, 1_000);
    if (atm.dispensed + bank.balance() !== 100_000) bad++;
  }
  return bad;
}

const b = new IdemBank(1_000);
console.log(\`\${b.debit("X", 300)} \${b.debit("X", 300)} balance \${b.balance()}\`); // true true balance 700
b.reverse("X", 300);
console.log(\`after reverse \${b.balance()}, late retry \${b.debit("X", 300)}\`); // 1000, false
b.reverse("Y", 300); // reversal arrives before the debit
console.log(\`debit after early reverse: \${b.debit("Y", 300)} balance \${b.balance()}\`); // false 1000
console.log("overdraw: " + b.debit("Z", 5_000)); // false
console.log("invariant violations in 2000 runs: " + violations(true)); // 0
console.log("naive bank breaks the invariant: " + (violations(false) > 0)); // true` },
          { lang: 'cpp', code: `struct Bank {
    virtual ~Bank() = default;
    virtual bool debit(const string& id, long long amt) = 0;
    virtual void reverse(const string& id, long long amt) = 0;
    virtual long long balance() const = 0;
};

// Naive bank: no transaction ids remembered, so a retry or a duplicate charges again.
class NaiveBank final : public Bank {
    long long balance_;
    mutable mutex mu_;

public:
    explicit NaiveBank(long long balance) : balance_(balance) {}
    bool debit(const string&, long long amt) override {
        lock_guard g(mu_);
        if (balance_ < amt) return false;
        balance_ -= amt;
        return true;
    }
    void reverse(const string&, long long amt) override { lock_guard g(mu_); balance_ += amt; }
    long long balance() const override { lock_guard g(mu_); return balance_; }
};

class IdemBank final : public Bank {
    enum class T { DEBITED, REVERSED };
    long long balance_;
    map<string, T> txns_;
    mutable mutex mu_;

public:
    explicit IdemBank(long long balance) : balance_(balance) {}

    bool debit(const string& id, long long amt) override {
        lock_guard g(mu_);
        auto it = txns_.find(id);
        if (it != txns_.end()) return it->second == T::DEBITED;  // duplicate: same answer; tombstone: refuse
        if (balance_ < amt) return false;
        balance_ -= amt;
        txns_[id] = T::DEBITED;
        return true;
    }
    void reverse(const string& id, long long amt) override {
        lock_guard g(mu_);
        auto it = txns_.find(id);
        if (it != txns_.end() && it->second == T::DEBITED) balance_ += amt;
        txns_[id] = T::REVERSED;  // also a tombstone for unknown ids
    }
    long long balance() const override { lock_guard g(mu_); return balance_; }
};

// Fault injection: request lost, response lost, or duplicated.
class FlakyNet {
    mt19937_64 rnd_;
    int roll() { return uniform_int_distribution<int>(0, 9)(rnd_); }

public:
    explicit FlakyNet(unsigned long long seed) : rnd_(seed) {}

    optional<bool> callDebit(Bank& bank, const string& id, long long amt) {
        int r = roll();
        if (r == 0) return nullopt;  // request lost
        bool res = bank.debit(id, amt);
        if (r == 1) bank.debit(id, amt);  // duplicated request
        if (r == 2) return nullopt;       // response lost (bank applied it!)
        return res;
    }
    bool callReverse(Bank& bank, const string& id, long long amt) {
        int r = roll();
        if (r == 0) return false;  // request lost
        bank.reverse(id, amt);
        return r != 1;             // r == 1: ack lost
    }
};

class SafeAtm {
    int seq_ = 0;

public:
    long long dispensed = 0;

    bool withdraw(Bank& bank, FlakyNet& net, long long amt) {
        string id = "T" + to_string(++seq_);  // generated once, reused on retries
        for (int attempt = 0; attempt < 3; attempt++) {
            optional<bool> r = net.callDebit(bank, id, amt);
            if (r) {
                if (!*r) return false;  // declined: nothing to undo
                dispensed += amt;       // dispense only after confirmed approval
                return true;
            }
        }
        while (!net.callReverse(bank, id, amt)) {}  // unknown outcome -> reverse until acked
        return false;
    }
};

// How many of 2000 fault-injected runs end with dispensed + balance != 100000.
int violations(bool idempotent) {
    int bad = 0;
    for (unsigned long long seed = 0; seed < 2000; seed++) {
        unique_ptr<Bank> bank;
        if (idempotent) bank = make_unique<IdemBank>(100'000);
        else bank = make_unique<NaiveBank>(100'000);
        FlakyNet net(seed);
        SafeAtm atm;
        for (int i = 0; i < 20; i++) atm.withdraw(*bank, net, 1'000);
        if (atm.dispensed + bank->balance() != 100'000) bad++;
    }
    return bad;
}

int main() {
    cout << boolalpha;
    IdemBank b(1'000);
    cout << b.debit("X", 300) << " " << b.debit("X", 300) << " balance " << b.balance() << "\\n";  // true true balance 700
    b.reverse("X", 300);
    cout << "after reverse " << b.balance() << ", late retry " << b.debit("X", 300) << "\\n";       // 1000, false
    b.reverse("Y", 300);  // reversal arrives before the debit
    cout << "debit after early reverse: " << b.debit("Y", 300) << " balance " << b.balance() << "\\n";  // false 1000
    cout << "overdraw: " << b.debit("Z", 5'000) << "\\n";                                           // false
    cout << "invariant violations in 2000 runs: " << violations(true) << "\\n";                    // 0
    cout << "naive bank breaks the invariant: " << (violations(false) > 0) << "\\n";               // true
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IBank {
    bool Debit(string id, long amt);
    void Reverse(string id, long amt);
    long Balance();
}

/// Naive bank: no transaction ids remembered, so a retry or a duplicate charges again.
class NaiveBank : IBank {
    private long balance;
    private readonly object gate = new object();
    public NaiveBank(long balance) { this.balance = balance; }
    public bool Debit(string id, long amt) { lock (gate) { if (balance < amt) return false; balance -= amt; return true; } }
    public void Reverse(string id, long amt) { lock (gate) balance += amt; }
    public long Balance() { lock (gate) return balance; }
}

class IdemBank : IBank {
    enum T { DEBITED, REVERSED }
    public long balance;
    private readonly Dictionary<string, T> txns = new Dictionary<string, T>();
    private readonly object gate = new object();
    public IdemBank(long balance) { this.balance = balance; }
    public long Balance() { lock (gate) return balance; }

    public bool Debit(string id, long amt) {
        lock (gate) {
            T t;
            if (txns.TryGetValue(id, out t)) {
                if (t == T.DEBITED) return true;             // duplicate: same answer, no new charge
                return false;                                // tombstone: reversal came first
            }
            if (balance < amt) return false;
            balance -= amt;
            txns[id] = T.DEBITED;
            return true;
        }
    }
    public void Reverse(string id, long amt) {
        lock (gate) {
            T t;
            if (txns.TryGetValue(id, out t) && t == T.DEBITED) balance += amt;
            txns[id] = T.REVERSED;                           // also a tombstone for unknown ids
        }
    }
}

/// Fault injection: request lost, response lost, or duplicated.
class FlakyNet {
    private readonly Random rnd;
    public FlakyNet(int seed) { rnd = new Random(seed); }
    /// null = no answer came back (request or response lost)
    public bool? CallDebit(IBank bank, string id, long amt) {
        int r = rnd.Next(10);
        if (r == 0) return null;                                     // request lost
        bool res = bank.Debit(id, amt);
        if (r == 1) bank.Debit(id, amt);                             // duplicated request
        if (r == 2) return null;                                     // response lost (bank applied it!)
        return res;
    }
    public bool CallReverse(IBank bank, string id, long amt) {
        int r = rnd.Next(10);
        if (r == 0) return false;                                    // request lost
        bank.Reverse(id, amt);
        return r != 1;                                               // r == 1: ack lost
    }
}

class SafeAtm {
    private int seq = 0;
    public long Dispensed = 0;

    public bool Withdraw(IBank bank, FlakyNet net, long amt) {
        string id = "T" + (++seq);                                   // generated once, reused on retries
        for (int attempt = 0; attempt < 3; attempt++) {
            bool? r = net.CallDebit(bank, id, amt);
            if (r != null) {
                if (!r.Value) return false;                          // declined: nothing to undo
                Dispensed += amt;                                    // dispense only after confirmed approval
                return true;
            }
        }
        while (!net.CallReverse(bank, id, amt)) { }                  // unknown outcome -> reverse until acked
        return false;
    }

    /// How many of 2000 fault-injected runs end with dispensed + balance != 100000.
    static int Violations(bool idempotent) {
        int violations = 0;
        for (int seed = 0; seed < 2000; seed++) {
            IBank bank = idempotent ? (IBank)new IdemBank(100000) : new NaiveBank(100000);
            FlakyNet net = new FlakyNet(seed);
            SafeAtm atm = new SafeAtm();
            for (int i = 0; i < 20; i++) atm.Withdraw(bank, net, 1000);
            if (atm.Dispensed + bank.Balance() != 100000) violations++;
        }
        return violations;
    }

    static string B(bool b) { return b.ToString().ToLower(); }

    static void Main() {
        IdemBank b = new IdemBank(1000);
        Console.WriteLine(B(b.Debit("X", 300)) + " " + B(b.Debit("X", 300)) + " balance " + b.balance);       // true true balance 700
        b.Reverse("X", 300);
        Console.WriteLine("after reverse " + b.balance + ", late retry " + B(b.Debit("X", 300)));           // 1000, false
        b.Reverse("Y", 300);                                                                                 // reversal arrives before the debit
        Console.WriteLine("debit after early reverse: " + B(b.Debit("Y", 300)) + " balance " + b.balance);  // false 1000
        Console.WriteLine("overdraw: " + B(b.Debit("Z", 5000)));                                            // false
        Console.WriteLine("invariant violations in 2000 runs: " + Violations(true));                       // 0
        Console.WriteLine("naive bank breaks the invariant: " + B(Violations(false) > 0));                  // true
    }
}` }
        ],
      complexity: `<p>O(1) expected per withdrawal (bounded retries; the reversal loop ends with probability 1). Bank memory O(transactions) — expire ids after the retry window.</p>`,
      followUps: ['What if the ATM crashes after approval but before dispensing? Add a journal and recovery.', 'Replace the in-memory map with a database table: which unique constraint gives idempotency for free?']
    }
  });

  practice.push({
    title: 'Thread-Safe Vending Machine with Concurrent Buyers', level: 'Hard', tags: ['concurrency', 'locks', 'vending machine', 'invariants'], companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p>A smart vending machine accepts purchases from its keypad <b>and</b> a mobile app at the same time. Implement <code>buy(slot, paidRs)</code> returning a receipt or a refusal, plus <code>restock(slot, qty)</code> and <code>collectCash()</code> from an operator thread. Guarantee under concurrency: never sell more items than stocked, cash in the machine always equals the sum of successful sales, and restocking never interleaves with a half-done sale. Prove it with a stress test.</p>`,
    constraints: `Up to 64 concurrent threads. Per-slot operations should not block other slots longer than necessary, but cash totals must stay consistent.`,
    example: `<p>Slot A1 has 3 items at ₹20. 50 threads try to buy A1 simultaneously → ${H.c('g', 'exactly 3 succeed')}, 47 get "sold out", cash = ₹60. Operator restocks during the burst → still never more sales than total stock.</p>`,
    brute: { why: `<p>Unsynchronized <code>if (stock &gt; 0) { stock--; cash += price; }</code>. Two threads pass the check together → stock goes negative and more items are "sold" than exist; <code>cash += price</code> is a read-modify-write that loses updates, so cash and sales disagree.</p>`, code: { lang: 'java', code: `import java.util.*;
class RacyVending {
    final Map<String, Integer> stock = new HashMap<>(Map.of("A1", 3));
    long cash = 0;
    boolean buy(String slot, int price) {
        int s = stock.get(slot);
        if (s > 0) { stock.put(slot, s - 1); cash += price; return true; }   // check-then-act + lost update
        return false;
    }
}`, alt: [{ lang: 'python', code: "class RacyVending:\n    def __init__(self):\n        self.stock = {\"A1\": 3}\n        self.cash = 0\n\n    def buy(self, slot, price):\n        s = self.stock[slot]\n        if s > 0:                                    # check-then-act + lost update\n            self.stock[slot] = s - 1\n            self.cash += price\n            return True\n        return False\n" }, { lang: 'ts', code: "class RacyVending {\n  stock = new Map<string, number>([[\"A1\", 3]]);\n  cash = 0;\n  buy(slot: string, price: number): boolean {\n    const s = this.stock.get(slot)!;\n    if (s > 0) { this.stock.set(slot, s - 1); this.cash += price; return true; }   // check-then-act + lost update\n    return false;\n  }\n}\n" }, { lang: 'cpp', code: "class RacyVending {\npublic:\n    unordered_map<string, int> stock{{\"A1\", 3}};\n    long long cash = 0;\n    bool buy(const string& slot, int price) {\n        int s = stock[slot];\n        if (s > 0) { stock[slot] = s - 1; cash += price; return true; }   // check-then-act + lost update\n        return false;\n    }\n};\n" }, { lang: 'csharp', code: "using System.Collections.Generic;\nclass RacyVending {\n    public readonly Dictionary<string, int> Stock = new Dictionary<string, int> { { \"A1\", 3 } };\n    public long Cash = 0;\n    public bool Buy(string slot, int price) {\n        int s = Stock[slot];\n        if (s > 0) { Stock[slot] = s - 1; Cash += price; return true; }   // check-then-act + lost update\n        return false;\n    }\n}\n" }] } },
    mcq: { q: 'Why is a single lock around buy/restock/collect an acceptable answer here?', options: ['Each operation is microseconds and the invariant spans stock AND cash, so one lock keeps them consistent with negligible contention', 'Locks are always faster than CAS', 'Because the plain map is thread-safe by itself', 'Only one thread can ever call the machine'], answer: 0, explain: 'When an invariant spans several fields and critical sections are tiny, one lock is the simplest correct design.' },
    hints: [`<p>Hint 1: Identify the invariant: <code>cash == Σ sales × price</code> and <code>stock ≥ 0</code>. Anything touching these fields together must be atomic.</p>`, `<p>Hint 2: Use one lock (<code>ReentrantLock</code>, <code>threading.Lock</code>, <code>std::mutex</code>) for buy/restock/collect. Do the slow work (motor, printing) <b>outside</b> the lock after reserving the item.</p>`, `<p>Hint 3: Stress test: a thread pool and a start latch to release all threads together; count successes with an atomic counter; assert successes ≤ total stock and cash == successes × price.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "sold between 3 and 5: true\ncash matches sales: true\nno such slot\ninsufficient\nok, change 5\nsold out\ncash 15 sales 1\nok, change 0\ncollected 30, cash now 0\n" }] },
      solution: {
      approach: `<p>One lock guards the shared invariant (stock + cash + sales). <code>buy</code> validates and reserves under the lock, then performs the slow physical drop outside it. A latch-started stress test with many threads checks that sales never exceed stock and that cash matches sales exactly.</p>`,
      code: `import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.concurrent.locks.*;

class SafeVending {
    private final ReentrantLock lock = new ReentrantLock();
    private final Map<String, Integer> stock = new HashMap<>(), price = new HashMap<>();
    private long cash = 0, sales = 0;

    void addSlot(String slot, int priceRs, int qty) { lock.lock(); try { price.put(slot, priceRs); stock.put(slot, qty); } finally { lock.unlock(); } }

    String buy(String slot, int paidRs) {
        int change;
        lock.lock();
        try {
            Integer p = price.get(slot);
            if (p == null) return "no such slot";
            if (stock.get(slot) == 0) return "sold out";
            if (paidRs < p) return "insufficient";
            stock.merge(slot, -1, Integer::sum);           // reserve + take money atomically
            cash += p;
            sales++;
            change = paidRs - p;
        } finally {
            lock.unlock();
        }
        dropItem(slot);                                     // slow hardware work outside the lock
        return "ok, change " + change;
    }
    void restock(String slot, int qty) { lock.lock(); try { stock.merge(slot, qty, Integer::sum); } finally { lock.unlock(); } }
    long collectCash() { lock.lock(); try { long c = cash; cash = 0; return c; } finally { lock.unlock(); } }
    long cash()  { lock.lock(); try { return cash; } finally { lock.unlock(); } }
    long sales() { lock.lock(); try { return sales; } finally { lock.unlock(); } }
    private void dropItem(String slot) { Thread.onSpinWait(); }

    public static void main(String[] args) throws Exception {
        SafeVending vm = new SafeVending();
        vm.addSlot("A1", 20, 3);
        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger ok = new AtomicInteger();
        List<Future<?>> fs = new ArrayList<>();
        for (int i = 0; i < 50; i++) fs.add(pool.submit(() -> {
            go.await();
            if (vm.buy("A1", 20).startsWith("ok")) ok.incrementAndGet();
            return null;
        }));
        fs.add(pool.submit(() -> { go.await(); vm.restock("A1", 2); return null; }));   // operator mid-burst
        go.countDown();
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        int sold = ok.get();
        System.out.println("sold between 3 and 5: " + (sold >= 3 && sold <= 5));              // depends on when the restock lands
        System.out.println("cash matches sales: " + (vm.cash() == 20L * sold && vm.sales() == sold));

        SafeVending v2 = new SafeVending();
        v2.addSlot("B1", 15, 1);
        System.out.println(v2.buy("Z9", 50));      // no such slot
        System.out.println(v2.buy("B1", 10));      // insufficient
        System.out.println(v2.buy("B1", 20));      // ok, change 5
        System.out.println(v2.buy("B1", 20));      // sold out
        System.out.println("cash " + v2.cash() + " sales " + v2.sales());
        v2.restock("B1", 1);
        System.out.println(v2.buy("B1", 15));      // ok, change 0
        System.out.println("collected " + v2.collectCash() + ", cash now " + v2.cash());
    }
}`, alt: [
          { lang: 'python', code: `import threading
from concurrent.futures import ThreadPoolExecutor


class SafeVending:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._stock: dict[str, int] = {}
        self._price: dict[str, int] = {}
        self._cash = 0
        self._sales = 0

    def add_slot(self, slot: str, price_rs: int, qty: int) -> None:
        with self._lock:
            self._price[slot] = price_rs
            self._stock[slot] = qty

    def buy(self, slot: str, paid_rs: int) -> str:
        with self._lock:
            p = self._price.get(slot)
            if p is None:
                return "no such slot"
            if self._stock[slot] == 0:
                return "sold out"
            if paid_rs < p:
                return "insufficient"
            self._stock[slot] -= 1  # reserve + take money atomically
            self._cash += p
            self._sales += 1
            change = paid_rs - p
        self._drop_item(slot)  # slow hardware work outside the lock
        return f"ok, change {change}"

    def restock(self, slot: str, qty: int) -> None:
        with self._lock:
            self._stock[slot] = self._stock.get(slot, 0) + qty

    def collect_cash(self) -> int:
        with self._lock:
            c, self._cash = self._cash, 0
            return c

    def cash(self) -> int:
        with self._lock:
            return self._cash

    def sales(self) -> int:
        with self._lock:
            return self._sales

    def _drop_item(self, slot: str) -> None:
        pass  # stands in for the motor; deliberately outside the lock


if __name__ == "__main__":
    vm = SafeVending()
    vm.add_slot("A1", 20, 3)
    go = threading.Event()
    ok = 0
    ok_lock = threading.Lock()

    def buyer() -> None:
        global ok
        go.wait()
        if vm.buy("A1", 20).startswith("ok"):
            with ok_lock:
                ok += 1

    def operator() -> None:
        go.wait()
        vm.restock("A1", 2)  # operator mid-burst

    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = [pool.submit(buyer) for _ in range(50)]
        futures.append(pool.submit(operator))
        go.set()
        for f in futures:
            f.result()
    sold = ok
    print("sold between 3 and 5:", str(3 <= sold <= 5).lower())  # depends on when the restock lands
    print("cash matches sales:", str(vm.cash() == 20 * sold and vm.sales() == sold).lower())

    v2 = SafeVending()
    v2.add_slot("B1", 15, 1)
    print(v2.buy("Z9", 50))  # no such slot
    print(v2.buy("B1", 10))  # insufficient
    print(v2.buy("B1", 20))  # ok, change 5
    print(v2.buy("B1", 20))  # sold out
    print("cash", v2.cash(), "sales", v2.sales())
    v2.restock("B1", 1)
    print(v2.buy("B1", 15))  # ok, change 0
    print("collected", v2.collect_cash(), end=", ")
    print("cash now", v2.cash())` },
          { lang: 'ts', code: `// JavaScript runs one task at a time, so every method here is already atomic between awaits;
// the structure (check, reserve and take money together, then the slow hardware step) is the same
// one a lock-based version needs.
class SafeVending {
  private readonly stock = new Map<string, number>();
  private readonly price = new Map<string, number>();
  private cashRs = 0;
  private salesCount = 0;

  addSlot(slot: string, priceRs: number, qty: number): void {
    this.price.set(slot, priceRs);
    this.stock.set(slot, qty);
  }

  async buy(slot: string, paidRs: number): Promise<string> {
    const p = this.price.get(slot);
    if (p === undefined) return "no such slot";
    if (this.stock.get(slot) === 0) return "sold out";
    if (paidRs < p) return "insufficient";
    this.stock.set(slot, this.stock.get(slot)! - 1); // reserve + take money in one step
    this.cashRs += p;
    this.salesCount++;
    const change = paidRs - p;
    await this.dropItem(); // slow hardware work after the shared state is consistent
    return \`ok, change \${change}\`;
  }

  restock(slot: string, qty: number): void { this.stock.set(slot, (this.stock.get(slot) ?? 0) + qty); }
  collectCash(): number { const c = this.cashRs; this.cashRs = 0; return c; }
  cash(): number { return this.cashRs; }
  sales(): number { return this.salesCount; }
  private dropItem(): Promise<void> { return Promise.resolve(); } // yields to the event loop, like waiting on the motor
}

async function main(): Promise<void> {
  const vm = new SafeVending();
  vm.addSlot("A1", 20, 3);
  let open!: () => void;
  const go = new Promise<void>((resolve) => { open = resolve; });
  let ok = 0;
  const tasks: Promise<void>[] = [];
  for (let i = 0; i < 50; i++) {
    tasks.push(go.then(async () => { if ((await vm.buy("A1", 20)).startsWith("ok")) ok++; }));
  }
  tasks.push(go.then(() => vm.restock("A1", 2))); // operator mid-burst
  open();
  await Promise.all(tasks);
  const sold = ok;
  console.log("sold between 3 and 5: " + (sold >= 3 && sold <= 5)); // depends on when the restock lands
  console.log("cash matches sales: " + (vm.cash() === 20 * sold && vm.sales() === sold));

  const v2 = new SafeVending();
  v2.addSlot("B1", 15, 1);
  console.log(await v2.buy("Z9", 50)); // no such slot
  console.log(await v2.buy("B1", 10)); // insufficient
  console.log(await v2.buy("B1", 20)); // ok, change 5
  console.log(await v2.buy("B1", 20)); // sold out
  console.log(\`cash \${v2.cash()} sales \${v2.sales()}\`);
  v2.restock("B1", 1);
  console.log(await v2.buy("B1", 15)); // ok, change 0
  console.log(\`collected \${v2.collectCash()}, cash now \${v2.cash()}\`);
}

main();` },
          { lang: 'cpp', code: `class SafeVending {
    mutable mutex mu_;
    map<string, int> stock_, price_;
    long long cash_ = 0, sales_ = 0;

    void dropItem(const string&) {}  // stands in for the motor; deliberately outside the lock

public:
    void addSlot(const string& slot, int priceRs, int qty) {
        lock_guard g(mu_);
        price_[slot] = priceRs;
        stock_[slot] = qty;
    }

    string buy(const string& slot, int paidRs) {
        int change;
        {
            lock_guard g(mu_);
            auto p = price_.find(slot);
            if (p == price_.end()) return "no such slot";
            if (stock_[slot] == 0) return "sold out";
            if (paidRs < p->second) return "insufficient";
            stock_[slot]--;  // reserve + take money atomically
            cash_ += p->second;
            sales_++;
            change = paidRs - p->second;
        }
        dropItem(slot);  // slow hardware work outside the lock
        return "ok, change " + to_string(change);
    }

    void restock(const string& slot, int qty) { lock_guard g(mu_); stock_[slot] += qty; }
    long long collectCash() { lock_guard g(mu_); return exchange(cash_, 0LL); }
    long long cash() const { lock_guard g(mu_); return cash_; }
    long long sales() const { lock_guard g(mu_); return sales_; }
};

int main() {
    cout << boolalpha;
    SafeVending vm;
    vm.addSlot("A1", 20, 3);
    latch go(1);
    atomic<int> ok = 0;
    vector<thread> pool;
    for (int i = 0; i < 50; i++) {
        pool.emplace_back([&] {
            go.wait();
            if (vm.buy("A1", 20).rfind("ok", 0) == 0) ok++;
        });
    }
    pool.emplace_back([&] { go.wait(); vm.restock("A1", 2); });  // operator mid-burst
    go.count_down();
    for (auto& t : pool) t.join();
    int sold = ok;
    cout << "sold between 3 and 5: " << (sold >= 3 && sold <= 5) << "\\n";  // depends on when the restock lands
    cout << "cash matches sales: " << (vm.cash() == 20LL * sold && vm.sales() == sold) << "\\n";

    SafeVending v2;
    v2.addSlot("B1", 15, 1);
    cout << v2.buy("Z9", 50) << "\\n";  // no such slot
    cout << v2.buy("B1", 10) << "\\n";  // insufficient
    cout << v2.buy("B1", 20) << "\\n";  // ok, change 5
    cout << v2.buy("B1", 20) << "\\n";  // sold out
    cout << "cash " << v2.cash() << " sales " << v2.sales() << "\\n";
    v2.restock("B1", 1);
    cout << v2.buy("B1", 15) << "\\n";  // ok, change 0
    long long collected = v2.collectCash();
    cout << "collected " << collected << ", cash now " << v2.cash() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Threading;

class SafeVending {
    private readonly object gate = new object();
    private readonly Dictionary<string, int> stock = new Dictionary<string, int>(), price = new Dictionary<string, int>();
    private long cash = 0, sales = 0;

    public void AddSlot(string slot, int priceRs, int qty) { lock (gate) { price[slot] = priceRs; stock[slot] = qty; } }

    public string Buy(string slot, int paidRs) {
        int change;
        lock (gate) {
            int p;
            if (!price.TryGetValue(slot, out p)) return "no such slot";
            if (stock[slot] == 0) return "sold out";
            if (paidRs < p) return "insufficient";
            stock[slot]--;                                  // reserve + take money atomically
            cash += p;
            sales++;
            change = paidRs - p;
        }
        DropItem(slot);                                     // slow hardware work outside the lock
        return "ok, change " + change;
    }
    public void Restock(string slot, int qty) { lock (gate) { int q; stock.TryGetValue(slot, out q); stock[slot] = q + qty; } }
    public long CollectCash() { lock (gate) { long c = cash; cash = 0; return c; } }
    public long Cash()  { lock (gate) return cash; }
    public long Sales() { lock (gate) return sales; }
    private void DropItem(string slot) { Thread.SpinWait(1); }

    static string B(bool b) { return b.ToString().ToLower(); }

    static void Main() {
        SafeVending vm = new SafeVending();
        vm.AddSlot("A1", 20, 3);
        ManualResetEventSlim go = new ManualResetEventSlim(false);
        int ok = 0;
        List<Thread> threads = new List<Thread>();
        for (int i = 0; i < 50; i++) {
            Thread t = new Thread(() => { go.Wait(); if (vm.Buy("A1", 20).StartsWith("ok")) Interlocked.Increment(ref ok); });
            threads.Add(t); t.Start();
        }
        Thread op = new Thread(() => { go.Wait(); vm.Restock("A1", 2); });   // operator mid-burst
        threads.Add(op); op.Start();
        go.Set();
        foreach (Thread t in threads) t.Join();
        int sold = ok;
        Console.WriteLine("sold between 3 and 5: " + B(sold >= 3 && sold <= 5));              // depends on when the restock lands
        Console.WriteLine("cash matches sales: " + B(vm.Cash() == 20L * sold && vm.Sales() == sold));

        SafeVending v2 = new SafeVending();
        v2.AddSlot("B1", 15, 1);
        Console.WriteLine(v2.Buy("Z9", 50));      // no such slot
        Console.WriteLine(v2.Buy("B1", 10));      // insufficient
        Console.WriteLine(v2.Buy("B1", 20));      // ok, change 5
        Console.WriteLine(v2.Buy("B1", 20));      // sold out
        Console.WriteLine("cash " + v2.Cash() + " sales " + v2.Sales());
        v2.Restock("B1", 1);
        Console.WriteLine(v2.Buy("B1", 15));      // ok, change 0
        Console.WriteLine("collected " + v2.CollectCash() + ", cash now " + v2.Cash());
    }
}` }
        ],
      complexity: `<p>O(1) per operation inside a tiny critical section; contention is negligible at vending-machine rates. Holding no lock during the physical drop keeps the machine responsive.</p>`,
      followUps: ['Per-slot locks + an AtomicLong for cash: what invariant could break and how would you restore it?', 'The drop fails after the lock is released: write the compensation (refund + stock +1) safely.']
    }
  });

  practice.push({
    title: 'Hierarchical State Machine: Elevator with EMERGENCY Super-State', level: 'Hard', tags: ['hierarchical state machine', 'statecharts', 'elevator'], companies: ['Google', 'Tesla', 'Siemens', 'Microsoft'],
    statement: `<p>Flat state machines explode when one rule applies to many states. Build a small <b>hierarchical state machine (HSM)</b> engine: each state may have a parent; an event is offered to the current state, and if it does not handle it, to its parent, and so on (like exceptions bubbling up). Model an elevator: parent <b>OPERATIONAL</b> with children <b>IDLE</b>, <b>MOVING</b>, <b>DOORS_OPEN</b>; sibling <b>EMERGENCY</b>. <code>FIRE</code> handled once in OPERATIONAL moves any child to EMERGENCY; <code>RESET</code> in EMERGENCY returns to IDLE. Entry/exit actions must run in the right order when leaving nested states.</p>`,
    constraints: `Depth ≤ 4. Unhandled events are logged, not thrown. Transitions between states with a common ancestor must not exit/enter that ancestor.`,
    example: `<p>IDLE + CALL → MOVING (exit IDLE, enter MOVING). MOVING + FIRE: MOVING does not handle FIRE → bubbles to ${H.c('b', 'OPERATIONAL')}, which transitions to EMERGENCY: ${H.c('y', 'exit MOVING, exit OPERATIONAL, enter EMERGENCY')}. EMERGENCY + CALL → ${H.c('r', 'unhandled (ignored)')}. RESET → enter OPERATIONAL, enter IDLE.</p>`,
    brute: { why: `<p>Flat machine: copy the FIRE transition into IDLE, MOVING and DOORS_OPEN (and into every future child). Forget one and the elevator ignores fire alarms in that state. The number of transitions grows as states × global events.</p>`, code: { lang: 'java', code: `class FlatElevator {
    String state = "IDLE";
    void on(String e) {
        if (state.equals("IDLE") && e.equals("CALL")) state = "MOVING";
        else if (state.equals("IDLE") && e.equals("FIRE")) state = "EMERGENCY";
        else if (state.equals("MOVING") && e.equals("ARRIVE")) state = "DOORS_OPEN";
        else if (state.equals("MOVING") && e.equals("FIRE")) state = "EMERGENCY";
        // DOORS_OPEN + FIRE forgotten -> alarm ignored while doors are open
    }
}`, alt: [{ lang: 'python', code: "class FlatElevator:\n    def __init__(self):\n        self.state = \"IDLE\"\n\n    def on(self, e):\n        if self.state == \"IDLE\" and e == \"CALL\": self.state = \"MOVING\"\n        elif self.state == \"IDLE\" and e == \"FIRE\": self.state = \"EMERGENCY\"\n        elif self.state == \"MOVING\" and e == \"ARRIVE\": self.state = \"DOORS_OPEN\"\n        elif self.state == \"MOVING\" and e == \"FIRE\": self.state = \"EMERGENCY\"\n        # DOORS_OPEN + FIRE forgotten -> alarm ignored while doors are open\n" }, { lang: 'ts', code: "class FlatElevator {\n  state = \"IDLE\";\n  on(e: string): void {\n    if (this.state === \"IDLE\" && e === \"CALL\") this.state = \"MOVING\";\n    else if (this.state === \"IDLE\" && e === \"FIRE\") this.state = \"EMERGENCY\";\n    else if (this.state === \"MOVING\" && e === \"ARRIVE\") this.state = \"DOORS_OPEN\";\n    else if (this.state === \"MOVING\" && e === \"FIRE\") this.state = \"EMERGENCY\";\n    // DOORS_OPEN + FIRE forgotten -> alarm ignored while doors are open\n  }\n}\n" }, { lang: 'cpp', code: "class FlatElevator {\npublic:\n    string state = \"IDLE\";\n    void on(const string& e) {\n        if (state == \"IDLE\" && e == \"CALL\") state = \"MOVING\";\n        else if (state == \"IDLE\" && e == \"FIRE\") state = \"EMERGENCY\";\n        else if (state == \"MOVING\" && e == \"ARRIVE\") state = \"DOORS_OPEN\";\n        else if (state == \"MOVING\" && e == \"FIRE\") state = \"EMERGENCY\";\n        // DOORS_OPEN + FIRE forgotten -> alarm ignored while doors are open\n    }\n};\n" }, { lang: 'csharp', code: "class FlatElevator {\n    public string State = \"IDLE\";\n    public void On(string e) {\n        if (State == \"IDLE\" && e == \"CALL\") State = \"MOVING\";\n        else if (State == \"IDLE\" && e == \"FIRE\") State = \"EMERGENCY\";\n        else if (State == \"MOVING\" && e == \"ARRIVE\") State = \"DOORS_OPEN\";\n        else if (State == \"MOVING\" && e == \"FIRE\") State = \"EMERGENCY\";\n        // DOORS_OPEN + FIRE forgotten -> alarm ignored while doors are open\n    }\n}\n" }] } },
    mcq: { q: 'Leaving MOVING (child of OPERATIONAL) for EMERGENCY (sibling of OPERATIONAL). Which exit/entry order is correct?', options: ['exit MOVING, exit OPERATIONAL, enter EMERGENCY', 'enter EMERGENCY, exit MOVING', 'exit OPERATIONAL only', 'exit MOVING, enter EMERGENCY (OPERATIONAL untouched)'], answer: 0, explain: 'Exit from the innermost state up to (not including) the lowest common ancestor, then enter downward to the target.' },
    hints: [`<p>Hint 1: <code>HState</code> has a name, a parent, and a <code>Map&lt;String, String&gt;</code> of event → target. Dispatch walks from current up the parent chain until some state handles the event.</p>`, `<p>Hint 2: Transition: compute the ancestor chain of source and target; the lowest common ancestor (LCA) is the first shared state. Exit states from current up to the LCA (exclusive), then enter from just below the LCA down to the target.</p>`, `<p>Hint 3: If the target is a composite state (OPERATIONAL), drill into its initial child (IDLE). Log every entry/exit so the test can assert the order.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "exit IDLE\nenter MOVING\n  -> now MOVING\nexit MOVING\nexit OPERATIONAL\nenter EMERGENCY\n  -> now EMERGENCY\nunhandled CALL in EMERGENCY\n  -> now EMERGENCY\nexit EMERGENCY\nenter OPERATIONAL\nenter IDLE\n  -> now IDLE\nexit IDLE\nenter MOVING\n  -> now MOVING\nexit MOVING\nenter DOORS_OPEN\n  -> now DOORS_OPEN\nexit DOORS_OPEN\nexit OPERATIONAL\nenter EMERGENCY\n  -> now EMERGENCY\nexit EMERGENCY\nenter OPERATIONAL\nenter IDLE\n  -> now IDLE\nunhandled RESET in IDLE\n  -> now IDLE\n" }] },
      solution: {
      approach: `<p>A tiny HSM engine: states with parent links and event tables; dispatch bubbles events up the hierarchy; transitions exit up to the lowest common ancestor and enter down to the target, then drill into initial children. The elevator's FIRE rule exists once (on OPERATIONAL) and automatically covers every current and future child.</p>`,
      code: `import java.util.*;

class HState {
    final String name;
    final HState parent;
    HState initialChild;
    final Map<String, HState> on = new HashMap<>();
    HState(String name, HState parent) { this.name = name; this.parent = parent; }
    List<HState> pathFromRoot() {
        LinkedList<HState> p = new LinkedList<>();
        for (HState s = this; s != null; s = s.parent) p.addFirst(s);
        return p;
    }
    public String toString() { return name; }
}

class Hsm {
    private HState current;
    final List<String> log = new ArrayList<>();
    Hsm(HState start) { current = drill(start, null); }

    void dispatch(String event) {
        for (HState s = current; s != null; s = s.parent) {          // bubble up like an exception
            HState target = s.on.get(event);
            if (target != null) { transition(target); return; }
        }
        log.add("unhandled " + event + " in " + current);
    }

    private void transition(HState target) {
        List<HState> from = current.pathFromRoot(), to = target.pathFromRoot();
        int i = 0;
        while (i < from.size() && i < to.size() && from.get(i) == to.get(i) && to.get(i) != target) i++;   // LCA depth
        for (int k = from.size() - 1; k >= i; k--) log.add("exit " + from.get(k));
        for (int k = i; k < to.size(); k++) log.add("enter " + to.get(k));
        current = drill(target, log);
    }
    private HState drill(HState s, List<String> l) {               // composite target -> initial child
        while (s.initialChild != null) { s = s.initialChild; if (l != null) l.add("enter " + s); }
        return s;
    }
    HState current() { return current; }

    public static void main(String[] args) {
        HState root = new HState("ELEVATOR", null);
        HState op = new HState("OPERATIONAL", root), em = new HState("EMERGENCY", root);
        HState idle = new HState("IDLE", op), moving = new HState("MOVING", op), doors = new HState("DOORS_OPEN", op);
        root.initialChild = op; op.initialChild = idle;
        idle.on.put("CALL", moving);
        moving.on.put("ARRIVE", doors);
        doors.on.put("CLOSE", idle);
        op.on.put("FIRE", em);                                      // written ONCE for all children
        em.on.put("RESET", op);

        Hsm m = new Hsm(root);
        for (String e : List.of("CALL", "FIRE", "CALL", "RESET", "CALL", "ARRIVE", "FIRE", "RESET", "RESET")) {
            m.dispatch(e);
            m.log.add("  -> now " + m.current());
        }
        m.log.forEach(System.out::println);
    }
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

from typing import Optional


class HState:
    def __init__(self, name: str, parent: Optional[HState]) -> None:
        self.name = name
        self.parent = parent
        self.initial_child: Optional[HState] = None
        self.on: dict[str, HState] = {}

    def path_from_root(self) -> list[HState]:
        path: list[HState] = []
        s: Optional[HState] = self
        while s is not None:
            path.insert(0, s)
            s = s.parent
        return path

    def __str__(self) -> str:
        return self.name


class Hsm:
    def __init__(self, start: HState) -> None:
        self.log: list[str] = []
        self._current = self._drill(start, None)

    def dispatch(self, event: str) -> None:
        s: Optional[HState] = self._current
        while s is not None:  # bubble up like an exception
            target = s.on.get(event)
            if target is not None:
                self._transition(target)
                return
            s = s.parent
        self.log.append(f"unhandled {event} in {self._current}")

    def _transition(self, target: HState) -> None:
        src, dst = self._current.path_from_root(), target.path_from_root()
        i = 0
        while i < len(src) and i < len(dst) and src[i] is dst[i] and dst[i] is not target:  # LCA depth
            i += 1
        for k in range(len(src) - 1, i - 1, -1):
            self.log.append(f"exit {src[k]}")
        for k in range(i, len(dst)):
            self.log.append(f"enter {dst[k]}")
        self._current = self._drill(target, self.log)

    @staticmethod
    def _drill(s: HState, log: Optional[list[str]]) -> HState:  # composite target -> initial child
        while s.initial_child is not None:
            s = s.initial_child
            if log is not None:
                log.append(f"enter {s}")
        return s

    @property
    def current(self) -> HState:
        return self._current


if __name__ == "__main__":
    root = HState("ELEVATOR", None)
    op, em = HState("OPERATIONAL", root), HState("EMERGENCY", root)
    idle, moving, doors = HState("IDLE", op), HState("MOVING", op), HState("DOORS_OPEN", op)
    root.initial_child = op
    op.initial_child = idle
    idle.on["CALL"] = moving
    moving.on["ARRIVE"] = doors
    doors.on["CLOSE"] = idle
    op.on["FIRE"] = em  # written ONCE for all children
    em.on["RESET"] = op

    m = Hsm(root)
    for e in ["CALL", "FIRE", "CALL", "RESET", "CALL", "ARRIVE", "FIRE", "RESET", "RESET"]:
        m.dispatch(e)
        m.log.append(f"  -> now {m.current}")
    for line in m.log:
        print(line)` },
          { lang: 'ts', code: `class HState {
  initialChild: HState | null = null;
  readonly on = new Map<string, HState>();

  constructor(readonly name: string, readonly parent: HState | null) {}

  pathFromRoot(): HState[] {
    const path: HState[] = [];
    for (let s: HState | null = this; s !== null; s = s.parent) path.unshift(s);
    return path;
  }
  toString(): string { return this.name; }
}

class Hsm {
  readonly log: string[] = [];
  private current: HState;

  constructor(start: HState) { this.current = this.drill(start, null); }

  dispatch(event: string): void {
    for (let s: HState | null = this.current; s !== null; s = s.parent) { // bubble up like an exception
      const target = s.on.get(event);
      if (target !== undefined) { this.transition(target); return; }
    }
    this.log.push(\`unhandled \${event} in \${this.current}\`);
  }

  private transition(target: HState): void {
    const from = this.current.pathFromRoot(), to = target.pathFromRoot();
    let i = 0;
    while (i < from.length && i < to.length && from[i] === to[i] && to[i] !== target) i++; // LCA depth
    for (let k = from.length - 1; k >= i; k--) this.log.push(\`exit \${from[k]}\`);
    for (let k = i; k < to.length; k++) this.log.push(\`enter \${to[k]}\`);
    this.current = this.drill(target, this.log);
  }

  private drill(s: HState, log: string[] | null): HState { // composite target -> initial child
    while (s.initialChild !== null) {
      s = s.initialChild;
      if (log !== null) log.push(\`enter \${s}\`);
    }
    return s;
  }

  currentState(): HState { return this.current; }
}

const root = new HState("ELEVATOR", null);
const op = new HState("OPERATIONAL", root), em = new HState("EMERGENCY", root);
const idle = new HState("IDLE", op), moving = new HState("MOVING", op), doors = new HState("DOORS_OPEN", op);
root.initialChild = op;
op.initialChild = idle;
idle.on.set("CALL", moving);
moving.on.set("ARRIVE", doors);
doors.on.set("CLOSE", idle);
op.on.set("FIRE", em); // written ONCE for all children
em.on.set("RESET", op);

const m = new Hsm(root);
for (const e of ["CALL", "FIRE", "CALL", "RESET", "CALL", "ARRIVE", "FIRE", "RESET", "RESET"]) {
  m.dispatch(e);
  m.log.push(\`  -> now \${m.currentState()}\`);
}
m.log.forEach((line) => console.log(line));` },
          { lang: 'cpp', code: `struct HState {
    string name;
    HState* parent;
    HState* initialChild = nullptr;
    map<string, HState*> on;

    HState(string name, HState* parent) : name(move(name)), parent(parent) {}

    vector<const HState*> pathFromRoot() const {
        vector<const HState*> path;
        for (const HState* s = this; s != nullptr; s = s->parent) path.insert(path.begin(), s);
        return path;
    }
};

class Hsm {
    const HState* current_;

    // composite target -> initial child
    static const HState* drill(const HState* s, vector<string>* log) {
        while (s->initialChild) {
            s = s->initialChild;
            if (log) log->push_back("enter " + s->name);
        }
        return s;
    }

    void transition(const HState* target) {
        auto from = current_->pathFromRoot(), to = target->pathFromRoot();
        size_t i = 0;
        while (i < from.size() && i < to.size() && from[i] == to[i] && to[i] != target) i++;  // LCA depth
        for (size_t k = from.size(); k-- > i;) log.push_back("exit " + from[k]->name);
        for (size_t k = i; k < to.size(); k++) log.push_back("enter " + to[k]->name);
        current_ = drill(target, &log);
    }

public:
    vector<string> log;

    explicit Hsm(const HState* start) : current_(drill(start, nullptr)) {}

    void dispatch(const string& event) {
        for (const HState* s = current_; s != nullptr; s = s->parent) {  // bubble up like an exception
            auto it = s->on.find(event);
            if (it != s->on.end()) { transition(it->second); return; }
        }
        log.push_back("unhandled " + event + " in " + current_->name);
    }
    const HState* current() const { return current_; }
};

int main() {
    // The states live in one vector of unique_ptr; everything else only points at them.
    vector<unique_ptr<HState>> arena;
    auto make = [&](const string& name, HState* parent) {
        arena.push_back(make_unique<HState>(name, parent));
        return arena.back().get();
    };
    HState* root = make("ELEVATOR", nullptr);
    HState *op = make("OPERATIONAL", root), *em = make("EMERGENCY", root);
    HState *idle = make("IDLE", op), *moving = make("MOVING", op), *doors = make("DOORS_OPEN", op);
    root->initialChild = op;
    op->initialChild = idle;
    idle->on["CALL"] = moving;
    moving->on["ARRIVE"] = doors;
    doors->on["CLOSE"] = idle;
    op->on["FIRE"] = em;  // written ONCE for all children
    em->on["RESET"] = op;

    Hsm m(root);
    for (const char* e : {"CALL", "FIRE", "CALL", "RESET", "CALL", "ARRIVE", "FIRE", "RESET", "RESET"}) {
        m.dispatch(e);
        m.log.push_back("  -> now " + m.current()->name);
    }
    for (const auto& line : m.log) cout << line << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class HState {
    public readonly string Name;
    public readonly HState Parent;
    public HState InitialChild;
    public readonly Dictionary<string, HState> On = new Dictionary<string, HState>();
    public HState(string name, HState parent) { Name = name; Parent = parent; }
    public List<HState> PathFromRoot() {
        LinkedList<HState> p = new LinkedList<HState>();
        for (HState s = this; s != null; s = s.Parent) p.AddFirst(s);
        return new List<HState>(p);
    }
    public override string ToString() { return Name; }
}

class Hsm {
    private HState current;
    public readonly List<string> Log = new List<string>();
    public Hsm(HState start) { current = Drill(start, null); }

    public void Dispatch(string ev) {
        for (HState s = current; s != null; s = s.Parent) {          // bubble up like an exception
            HState target;
            if (s.On.TryGetValue(ev, out target)) { Transition(target); return; }
        }
        Log.Add("unhandled " + ev + " in " + current);
    }

    private void Transition(HState target) {
        List<HState> from = current.PathFromRoot(), to = target.PathFromRoot();
        int i = 0;
        while (i < from.Count && i < to.Count && from[i] == to[i] && to[i] != target) i++;   // LCA depth
        for (int k = from.Count - 1; k >= i; k--) Log.Add("exit " + from[k]);
        for (int k = i; k < to.Count; k++) Log.Add("enter " + to[k]);
        current = Drill(target, Log);
    }
    private HState Drill(HState s, List<string> l) {               // composite target -> initial child
        while (s.InitialChild != null) { s = s.InitialChild; if (l != null) l.Add("enter " + s); }
        return s;
    }
    public HState Current() { return current; }

    static void Main() {
        HState root = new HState("ELEVATOR", null);
        HState op = new HState("OPERATIONAL", root), em = new HState("EMERGENCY", root);
        HState idle = new HState("IDLE", op), moving = new HState("MOVING", op), doors = new HState("DOORS_OPEN", op);
        root.InitialChild = op; op.InitialChild = idle;
        idle.On["CALL"] = moving;
        moving.On["ARRIVE"] = doors;
        doors.On["CLOSE"] = idle;
        op.On["FIRE"] = em;                                         // written ONCE for all children
        em.On["RESET"] = op;

        Hsm m = new Hsm(root);
        foreach (string e in new[] { "CALL", "FIRE", "CALL", "RESET", "CALL", "ARRIVE", "FIRE", "RESET", "RESET" }) {
            m.Dispatch(e);
            m.Log.Add("  -> now " + m.Current());
        }
        foreach (string line in m.Log) Console.WriteLine(line);
    }
}` }
        ],
      complexity: `<p>Dispatch O(depth); transition O(depth) for the LCA walk. Adding a child of OPERATIONAL inherits FIRE for free — O(1) new transitions instead of O(children).</p>`,
      followUps: ['Add a history pseudo-state so RESET returns to the child that was active before the fire.', 'Model the door and the motor as parallel (orthogonal) regions — what changes in dispatch?']
    }
  });

  /* ======================= QUIZ ======================= */
  quiz.push(
    { q: 'An object has 6 states and 5 events and is written as one method of nested if/else. Roughly how many branches must you re-check when a new state is added?', options: ['All S × E (about 30) cells, because the logic for every state lives in the same method', 'Only 1', 'Only the new state’s 5 events', 'None — if/else handles it automatically'], answer: 0, explain: 'In the ladder, every handler mixes all states; adding one means reading and possibly editing every branch. With State classes it is one new class plus the states that lead into it.' },
    { q: 'What is the main difference between the State and Strategy patterns?', options: ['State objects change as the object reacts to events (often choosing their successor); a Strategy is chosen by the client and rarely changes itself', 'Strategy uses interfaces, State does not', 'State is only for enums', 'There is no difference'], answer: 0, explain: 'Same class diagram, different intent: who changes the reference and why.' },
    { q: 'Car at floor 5 going up; requests 8, 2, 6, 1, 4; floors 0–9. How many floors does SCAN travel?', options: ['12 (5→6→8→9→4→2→1)', '10', '21', '9'], answer: 0, explain: 'SCAN rides to the end floor 9 before reversing: 1+2+1+5+2+1 = 12. LOOK turns at 8 and travels 10.' },
    { q: 'Which elevator scheduling policy can starve a far-away request?', options: ['SSTF (shortest seek time first)', 'SCAN', 'LOOK', 'C-LOOK'], answer: 0, explain: 'SSTF always picks the nearest request, so a steady stream of nearby calls can postpone a far one indefinitely.' },
    { q: 'A hall call 5▼ is pending while the car goes up past floor 5 to serve a car call at 8. What should a correct collective-control elevator do?', options: ['Not stop at 5 on the way up; serve 5▼ on the down sweep', 'Stop at 5 and take the passenger up to 8', 'Cancel the 5▼ call', 'Reverse immediately'], answer: 0, explain: 'Hall calls carry a direction; picking up a ▼ passenger on an up sweep takes them the wrong way.' },
    { q: 'A vending machine has ₹5×1 and ₹2×3 coins and must return ₹6. Which statement is true?', options: ['Plain greedy fails (takes 5, then needs 1), but 2+2+2 works — so plan change with backtracking/DP before dispensing', 'Greedy always works for Indian coins', 'Change of ₹6 is impossible', 'The machine should round to ₹5'], answer: 0, explain: 'Limited counts break greedy even for canonical coin systems.' },
    { q: 'Why do vending machines keep inserted coins in an escrow until the sale commits?', options: ['So cancel returns the exact coins and nothing is mixed into the coin box before the sale is certain', 'To count coins faster', 'Because coins cannot be stored in the coin box', 'For tax reasons'], answer: 0, explain: 'Escrow makes refund trivial and keeps the box consistent with completed sales only.' },
    { q: 'Correct order of a safe ATM withdrawal?', options: ['validate → plan notes → bank debit with txnId → dispense → confirm (or reverse on failure)', 'dispense → debit → validate', 'debit → validate → dispense', 'plan notes → dispense → debit'], answer: 0, explain: 'Local, side-effect-free checks first; money moves only after approval; failures are compensated with an idempotent reversal.' },
    { q: 'The bank receives debit(T42) twice because the ATM retried after a lost response. What should happen?', options: ['The second call is recognised by txnId and returns the same result without charging again', 'The account is debited twice', 'The bank rejects both', 'The ATM is blocked'], answer: 0, explain: 'Idempotency by a client-generated transaction id is what makes retries safe.' },
    { q: 'An ATM cash chain ₹2000 → ₹500 → ₹200 → ₹100 with stock 500×1, 200×3, 100×0 is asked for ₹600. What does a pure greedy chain do?', options: ['Takes ₹500, gets stuck with ₹100 and fails, although 200×3 works', 'Returns 200×3', 'Returns 500 + 100', 'Dispenses ₹500 only'], answer: 0, explain: 'Greedy with limited stock can fail; each handler must be able to back off (backtracking) or use DP.' },
    { q: 'Two threads both read state=AVAILABLE and both set HELD. What is this bug called, and a lock-free fix?', options: ['A check-then-act race; fix with an immutable snapshot + atomic compare-and-set', 'A deadlock; fix with more threads', 'A memory leak; fix with GC', 'Starvation; fix with SSTF'], answer: 0, explain: 'The check and the act must be atomic. CAS publishes the new snapshot only if nobody changed it since it was read.' },
    { q: 'In a hierarchical state machine, why put the FIRE transition on the OPERATIONAL parent instead of each child?', options: ['Unhandled events bubble up, so one transition covers every current and future child state', 'Children cannot have transitions', 'It makes the elevator move faster', 'Parents run on a separate thread'], answer: 0, explain: 'Hierarchy removes duplicated global transitions — the main cure for state explosion.' },
    { q: 'Which is the best sign that something should be a separate STATE rather than a boolean flag?', options: ['It changes which events are allowed or how they behave, and has its own way out', 'It is a number', 'It is displayed on a screen', 'It is stored in a database'], answer: 0, explain: 'Different behaviour per event + its own exit condition = state. Pure display conditions (like "exact change only") can stay flags.' }
  );

  /* ======================= INTERVIEW ======================= */
  interview.push(
    { q: 'Walk me through how you would start a "design a vending machine" interview.', level: 'I', a: `<p>(1) <b>Clarify</b>: accepted coins/notes, products and slots, change with a limited coin box, cancel/refund, sold-out, operator restock, card payments now or later. (2) <b>Entities</b>: VendingMachine (context), Inventory, Product value object, Coin enum, CoinBox, escrow. (3) <b>Draw the state × event table</b> for IDLE, HAS_MONEY, DISPENSING, SOLD_OUT, MAINTENANCE vs insertCoin/select/cancel/operator. (4) Code one class per state with default-reject methods; the context's public methods are one-line delegations. (5) Walk through the money-safety order in select: slot exists → in stock → enough money → change possible → dispense → commit. (6) Finish with extensions: card payment as an AUTHORIZING state, thread safety, telemetry.</p>`, followUps: ['Where does the change-making algorithm live and why?', 'What happens if the motor jams after you took the money?'] },
    { q: 'When would you NOT use the State pattern?', level: 'I', a: `<p>When there are only 2–3 states, transitions are just "what is next" with no per-state behaviour, and no growth is expected — an <b>enum + transition table (a map)</b> or a small switch is clearer. Also when a condition only affects display or one check (e.g. "exact change only" lamp) — that is a derived flag, not a state. State pays off when states have real behaviour (fees, timers, hardware actions), when the same <code>switch(status)</code> is repeated across many methods, or when new states are expected (maintenance, fire, no-show). Over-patterning a two-state toggle into four classes is a code smell interviewers notice too.</p>`, followUps: ['Show the same machine as an enum table and as State classes.', 'How do sealed types or tagged unions with exhaustive matching change this choice?'] },
    { q: 'Design the elevator car\'s state machine. What states and transitions do you need?', level: 'I', a: `<p>States: <b>IDLE</b>, <b>MOVING_UP</b>, <b>MOVING_DOWN</b>, <b>DOORS_OPEN</b>, <b>MAINTENANCE</b> (later OVERLOADED, FIRE_RECALL). On each tick or sensor event: IDLE serves a stop at the current floor (→ DOORS_OPEN) or picks a direction by LOOK (→ MOVING_*); MOVING moves one floor and stops if the floor is in the stop set for its direction; DOORS_OPEN counts down a door timer, re-opens if the sensor is blocked, then closes (→ IDLE). MAINTENANCE rejects calls. A single state field makes illegal combinations (moving with doors open) unrepresentable, which booleans would allow. Requests are kept in sorted sets (per direction), not a FIFO queue.</p>`, followUps: ['Where does the door-obstruction rule live?', 'How do you add fire recall without touching existing states?'] },
    { q: 'Compare FCFS, SSTF, SCAN and LOOK for elevators. Which would you choose?', level: 'A', a: `<p><b>FCFS</b>: fair but zig-zags, huge travel. <b>SSTF</b>: nearest next, low travel but can starve far floors. <b>SCAN</b>: sweep to the end floor then reverse — bounded waiting, wastes trips to empty ends. <b>LOOK</b>: sweep only as far as the last request, then reverse — bounded waiting and less waste. Example: start 5 ▲, requests 8,2,6,1,4 → FCFS 21 floors, SSTF 10, SCAN 12, LOOK 10. I choose <b>LOOK</b> (collective control) per car, because it bounds waiting to about two sweeps and minimises direction reversals; the choice sits behind a <code>SchedulingStrategy</code> so it can change per building.</p>`, followUps: ['Prove LOOK cannot starve a request.', 'What is C-LOOK and when is it fairer?'] },
    { q: 'How do you assign a hall call when there are multiple elevators?', level: 'A', a: `<p>A <b>dispatcher</b> (Strategy) computes a cost per car and picks the minimum. Cost ≈ estimated time to reach the caller <i>going their way</i>: idle car → distance; car moving toward the caller in the same direction → distance; otherwise → finish the current sweep and come back (distance + sweep penalty); plus a load term (stops already assigned × ~10 s each). Cars in maintenance or full return infinite cost. Advanced: re-assign periodically, zoning in up-peak, destination dispatch (group by destination floor to cut stops), energy-aware costs. The car's state machine stays unchanged — only the dispatch strategy evolves.</p>`, followUps: ['Why is "nearest car by distance" not enough?', 'How would you switch to zoning at 9 am?'] },
    { q: 'How do you make sure an ATM never charges a customer for cash that was not dispensed?', level: 'A', a: `<p>Order and idempotency. Validate locally, <b>plan notes before calling the bank</b>, debit with an ATM-generated <b>txnId</b> written to the ATM journal first, dispense only after a confirmed approval, then confirm. If the dispenser jams or the bank's reply never arrives, send <b>reverse(txnId)</b>, retrying until acknowledged; the bank treats repeated debits/reversals with the same id as no-ops and keeps tombstones so a late debit after a reversal is refused. On crash, the ATM replays its journal and resolves every in-flight transaction. Notes that jam go to a sealed reject bin, reconciled against the journal.</p>`, followUps: ['What exactly must the bank store to be idempotent?', 'What if the reversal message itself is lost?'] },
    { q: 'Where does the "3 wrong PINs → retain card" counter live, and why?', level: 'I', a: `<p>Two places. Locally, in the <b>CARD_INSERTED</b> session state (reset on a new card and on a correct PIN) so the ATM can retain the card immediately. Authoritatively, <b>at the bank per card</b>, counted across all ATMs and channels — otherwise a thief tries two PINs at each of many ATMs. The ATM never verifies the PIN itself; it sends an encrypted PIN block from the encrypting PIN pad. Putting the counter in a long-lived ATM field is a classic bug: the next customer inherits the previous one's failures.</p>`, followUps: ['How do you unblock a card safely?', 'Why is the PIN never kept as a plain string in the ATM software?'] },
    { q: 'Explain the check-then-act race in a state machine and three ways to fix it.', level: 'A', a: `<p>Two threads read the same state (e.g. AVAILABLE / stock 1), both pass the guard, and both apply their transition — double sale, double booking. Fixes: (1) <b>Lock</b> the whole fire() (a mutex, <code>synchronized</code>) — simplest; keep slow I/O outside. (2) <b>CAS</b> on an immutable snapshot (state + data + version) via an atomic compare-and-set (<code>AtomicReference.compareAndSet</code> in Java) — lock-free, losers retry on fresh data; the version also prevents ABA. (3) <b>Single-threaded event loop / actor</b> — all events queue to one thread that owns the state; no shared mutation. In a database, the CAS equivalent is optimistic locking: <code>UPDATE … WHERE id = ? AND version = ?</code> and retry on 0 rows.</p>`, followUps: ['Why must the CAS snapshot be immutable?', 'Which would you use for an elevator car and why?'] },
    { q: 'How would you persist a state machine and recover after a crash?', level: 'A', a: `<p>Store the <b>state name + data + version</b> (e.g. ride: status ARRIVED, driverId, version 7), never the state object. Rehydrate via a factory from the stored name. Transitions use optimistic locking. For side effects (charging, dispensing) move to an <b>intermediate state</b> first (DISPENSING / AUTHORIZING), persist it, perform the effect, then fire a completion event — so after a crash you can find "stuck in DISPENSING" rows and reconcile. Publish domain events via a <b>transactional outbox</b> in the same DB transaction. Alternatively event-source: store events, rebuild state by replaying them through the pure transition function.</p>`, followUps: ['What is the outbox pattern solving?', 'Trade-offs of event sourcing for a vending fleet?'] },
    { q: 'Interviewer: "Now add a MAINTENANCE state to your vending machine." What changes?', level: 'I', a: `<p>With default-reject methods on the state interface: (1) one new class <code>Maintenance</code> overriding <code>restock</code> and <code>finishService</code> (and returning coins on insert); (2) <code>service()</code> added to the state interface with a default "not now"; (3) IDLE and SOLD_OUT override <code>service()</code> to enter maintenance; HAS_MONEY keeps the default (finish or cancel the sale first — never open the machine with a customer’s money in escrow). <code>finishService</code> returns SOLD_OUT if the inventory is still empty, else IDLE. No other state changes; the table gains one row and one column, and table-driven tests cover the new cells.</p>`, followUps: ['Why is service() refused in HAS_MONEY?', 'How do you test all the new cells?'] },
    { q: 'What are hierarchical state machines and when do you need one?', level: 'E', a: `<p>Statecharts (Harel) let states nest: an event not handled by the current state <b>bubbles</b> to its parent. Use them when the flat table explodes because some events apply to many states — e.g. an elevator's FIRE or POWER_FAIL must work from IDLE, MOVING, DOORS_OPEN and any future child. Put FIRE once on the OPERATIONAL parent; transitions exit up to the lowest common ancestor and enter down to the target (entry/exit actions in order). Extras: <b>history states</b> (resume the previous child), <b>orthogonal regions</b> (door and motor as parallel sub-machines). Tools: Spring Statemachine, XState, SCXML, UML. Don't reach for it until the flat machine shows duplication.</p>`, followUps: ['How is the lowest common ancestor used during a transition?', 'Model the washing machine pause as a history state.'] },
    { q: 'How would you test a state-heavy design like an ATM thoroughly?', level: 'A', a: `<p>Layers: (1) <b>Table tests</b> — for every (state, event) cell assert next state and side effects, including all illegal cells. (2) <b>Scenario tests</b> — happy path, 3 wrong PINs, insufficient funds, daily limit, note plan failure. (3) <b>Fault injection</b> with fakes: a bank that drops/duplicates/reorders messages, a dispenser that jams — assert the invariant "charged ⇔ dispensed". (4) <b>Property/randomized tests</b> — thousands of random event sequences checking invariants (never negative stock, menu only after auth). (5) <b>Concurrency stress</b> with latches for shared resources at the bank. Hardware sits behind interfaces (CardReader, Dispenser, Keypad) so all of this runs in milliseconds.</p>`, followUps: ['What invariants would you assert for the vending machine?', 'How does AI help generate these tests, and what do you still check?'] },
    { q: 'An LLM generated an elevator/vending/ATM design for you. What do you review first?', level: 'E', a: `<p>(1) Are states explicit (one field/enum or State classes) or scattered booleans that allow illegal combos? (2) Is there a state × event table — what happens on every illegal event? (3) Money/safety order: change planned before dispensing, notes planned and approval received before cash, door safety before closing. (4) Idempotency and txnIds on every network call; compensation on failure. (5) Concurrency: check-then-act races, mutable objects behind an atomic reference, locks held across I/O. (6) Scheduling: is it SSTF in disguise (a priority queue by distance → starvation)? Do hall calls keep direction? (7) Extensibility: can I add a state or strategy without edits elsewhere? Then I ask the AI for adversarial tests and run them.</p>`, followUps: ['Which of these bugs would not show up in a happy-path demo?', 'How do you turn the review into automated checks?'] }
  );

  registerModule({
    id: 'lld09',
    title: 'State-Heavy Designs: Elevator, Vending Machine, ATM',
    intro: `<p>Some machines are all about <b>"what mode am I in right now?"</b>. A lift that is moving up ignores the button for a floor it already passed. A vending machine with no money in it refuses to drop a snack. An ATM will not show your balance until your PIN is correct. These are <b>state-heavy designs</b>, and they are the most common "machine coding" rounds at Amazon, Microsoft, Uber, Flipkart, Swiggy, Walmart and Goldman Sachs.</p>
<p>This module first takes the <b>State pattern</b> apart properly — the brute-force if/else ladder and exactly why it breaks, enum tables, GoF state classes, closed sets of immutable states (sealed types, tagged unions, variants), guards, entry/exit actions, nested states. Then it builds three full designs end to end: an <b>Elevator system</b> (car state machine plus FCFS/SSTF/SCAN/LOOK scheduling and multi-car dispatch), a <b>Vending Machine</b> (states, inventory, coins and change-making) and an <b>ATM</b> (card/PIN states, withdraw/deposit/balance flows, cash dispensing chain, bank rollback). It ends with production-grade concerns: thread-safe transitions, persistence and testing. Every topic has an animated visualizer — state boxes lighting up, lift cars moving floor by floor, coins flowing in and change flowing out.</p>`,
    goals: [
      'Turn any state-heavy requirement into a <b>state × event table</b> and then into clean code in your language (enum table, State classes or a closed set of immutable states) — and say which one fits and why.',
      'Design a complete <b>Elevator system</b>: entities, car state machine, request handling, and compare FCFS, SSTF, SCAN and LOOK on real request lists; dispatch requests across multiple cars.',
      'Design a complete <b>Vending Machine</b> with states, inventory, coin handling, exact-change problems and refunds, and add new states (maintenance, sold-out) without editing existing ones.',
      'Design an <b>ATM</b>: card and PIN states, lock after 3 wrong PINs, withdraw/deposit/balance flows, cash dispensing with Chain of Responsibility, and safe rollback when cash fails to come out.',
      'Make state machines <b>production-ready</b>: atomic transitions under concurrency (a lock, compare-and-set, single-threaded loop), persistence with versions, and table-driven tests.',
      'Survive the classic interview follow-ups: "add a state", "add a second elevator", "the machine runs out of change", "the network fails mid-withdrawal".'
    ],
    prereqs: `<p>LLD 2 (SOLID — especially Open/Closed), LLD 6 (Behavioral Patterns — Strategy, State, Chain of Responsibility, Command, Observer at a basic level) and LLD 7 (the LLD interview framework). Comfortable Java: interfaces with default methods, enums and <code>EnumMap</code>, records, collections (<code>TreeSet</code>, <code>PriorityQueue</code>). Basic threads help for the last topic.</p>`,
    hours: 16,
    langNotes: {
      java: `<p><b>State objects.</b> An <code>interface</code> with <code>default</code> methods is the cheapest State pattern: every event is rejected by default and each state overrides only what it allows (always add <code>@Override</code>). An <code>enum</code> whose constants have bodies (and an <code>abstract</code> method) gives you a closed set of states with behaviour and no allocation; <code>EnumMap</code> and <code>EnumSet</code> are the natural storage for a state × event table and iterate in declaration order. <code>sealed</code> interfaces with <code>record</code>s and a pattern <code>switch</code> make a pure <code>next(state, event)</code> function whose missing cases are compile errors. <b>Equality and immutability.</b> Records give value <code>equals</code>/<code>hashCode</code> and are shallowly immutable, so a snapshot (state, stock, version) is one record. <code>AtomicReference.compareAndSet</code> compares <b>references</b>, not <code>equals</code>, so publish a new record instead of mutating the old one. <b>Determinism.</b> <code>Map.of</code> and <code>HashMap</code> iteration order is not part of the contract (<code>Map.of</code> changes between runs): use <code>LinkedHashMap</code>, <code>TreeMap</code> or an <code>EnumMap</code> whenever output or a "first missing item" decision depends on order. <b>Concurrency.</b> <code>synchronized</code>/<code>ReentrantLock</code> around the whole transition, slow I/O outside the lock; a plain <code>HashMap</code> is not thread-safe, <code>ConcurrentHashMap</code> plus a lock per entry is the usual fix.</p>`,
      python: `<p><b>State objects.</b> Python has no <code>default</code> methods and no per-member bodies on an <code>Enum</code>. Use a base class (<code>abc.ABC</code>, with <code>@abstractmethod</code> only for <code>name()</code>) whose concrete methods reject every event, and let each state subclass override what it allows; stateless states can be module-level instances. An <code>Enum</code> is fine for small machines: put behaviour in one method that uses <code>match self</code> or a lookup table. Two members with the same value silently become <b>aliases</b> (for example two phases both defined as <code>(0, None)</code>), so give members distinct values and keep data in separate tables. <b>Closed sets and equality.</b> A union of frozen dataclasses (<code>Req | Asg | Done</code>) with <code>match</code> and class patterns is the sealed-type idiom. <code>@dataclass(frozen=True)</code> gives value <code>__eq__</code> and <code>__hash__</code>; use <code>eq=False</code> when identity is what you want to compare, as in a compare-and-set loop. <b>Concurrency.</b> The GIL does not make check-then-act safe, and there is no CAS primitive: wrap get/compare_and_set in a small <code>threading.Lock</code>, or lock the whole transition (<code>RLock</code> if a listener may call back in). <b>Order and time.</b> <code>dict</code> keeps insertion order, so an ordered "first missing ingredient" rule is deterministic; <code>datetime.date</code> plus <code>timedelta</code> handles calendar arithmetic. Printing booleans as <code>true</code>/<code>false</code> needs an explicit <code>str(x).lower()</code>.</p>`,
      js: `<p><b>TypeScript.</b> <b>State objects.</b> Interfaces are erased and cannot hold default methods, so share the "reject every event" defaults in an <code>abstract class</code> that your states extend (turn on <code>noImplicitOverride</code> and write <code>override</code>), or build states as object literals typed by the interface with a small factory function. A union of string literals is the lightest enum (<code>type Phase = "IDLE" | "FILLING"</code>), and a <code>Record&lt;Phase, ...&gt;</code> table must list every phase or the compiler complains. <b>Closed sets.</b> A discriminated union (<code>kind: "Req" | "Asg"</code>) with a <code>switch</code> and no <code>default</code> is checked for exhaustiveness. <b>Equality.</b> Objects compare by identity with <code>===</code>, which is exactly what a compare-and-set needs; there is no built-in value equality, so compare fields or use a string key. <b>Concurrency.</b> JavaScript runs one task at a time: a synchronous method is already atomic, and races appear only across an <code>await</code> (check, <code>await</code>, act). Keep the check and the act in the same synchronous step, or queue events through one async loop. <b>Order and time.</b> <code>Map</code> and <code>Set</code> keep insertion order. Use UTC (<code>Date.UTC</code>) or ISO date strings for calendar days so the time zone cannot move a date. Template literals call <code>toString()</code>, so give state classes one.</p>`,
      cpp: `<p><b>State objects.</b> An interface is a class of pure virtual functions with a <b>virtual destructor</b>; mark every implementation <code>override</code> (and <code>final</code> where it ends the hierarchy). "Reject everything by default" is a virtual member with a body in the base class, defined after the context class when it needs the context. Stateless states can be shared singletons (<code>inline const Idle Idle::I;</code>) with the context holding a non-owning pointer; states that carry data are returned as <code>std::unique_ptr&lt;State&gt;</code> (<code>nullptr</code> meaning "stay"). When a state method asks the context to replace the state, the old state is destroyed: do not touch its members after that call. <code>enum class</code> plus a <code>switch</code> is the right size for small machines, and <code>std::variant</code> with <code>std::visit</code> is the closed set of states. <b>Ownership.</b> A chain of handlers owns its next link with <code>unique_ptr</code>; observers and strategies are held by reference or raw non-owning pointer. <b>Concurrency.</b> Use <code>std::atomic&lt;std::shared_ptr&lt;const Snap&gt;&gt;</code> (C++20) with <code>compare_exchange_strong</code> for lock-free transitions on immutable snapshots, <code>std::mutex</code> with <code>lock_guard</code> otherwise (<code>recursive_mutex</code> if a callback re-enters), and <code>std::latch</code> to release test threads together. <b>Order and time.</b> <code>std::map</code> iterates in key order (like <code>TreeMap</code>); <code>unordered_map</code> does not. <code>std::chrono::sys_days</code> gives calendar-day arithmetic. Since C++17 the operands of <code>&lt;&lt;</code> are evaluated left to right, so chained output with side effects prints in the order you wrote it.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
