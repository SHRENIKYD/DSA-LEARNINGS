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
  function CODE(label, code, hl) { return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; }
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
    return CODE('Method that runs: ' + cls + '.' + ev + '()', body, hl);
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
<li><b>Sealed interface + records + pattern-matching switch (Java 21)</b> — a pure function <code>next(state, event)</code>; the compiler checks you handled every state.</li>
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
}` }, { lang: 'java', title: 'Enum + EnumMap transition table (when states carry little behaviour)', code: `import java.util.*;

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
}` }, { lang: 'java', title: 'Java 21: sealed states + records + exhaustive pattern switch (pure function)', code: `import java.util.*;

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
}` }],
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
        frames.push(F('This is the <b>brute-force</b> design: one <code>handle()</code> method that asks "which state am I in?" and then "which event is this?". It works for 6 states × 5 events, but every question is answered by walking the ladder from the top.', [CODE('Ride.handle() — the if/else ladder', code, {}), VARS('cost so far', { state: cur, conditionsChecked: 0 })]));
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
            CODE('Ride.handle()', code, hl),
            VARS('cost so far', { state: next, conditionsChecked: total, statePatternCalls: frames.length }, { conditionsChecked: 'cur' })
          ]));
          cur = next;
        });
        var addHl = {}; [2, 5, 6, 9, 10, 13, 14, 16, 17].forEach(function (l) { addHl[l] = 'bad'; });
        frames.push(F('<b>Now product asks for a NO_SHOW state</b> (driver waited 5 minutes, rider never came; charge ₹100). In the ladder you must add a new <code>else if (state == NO_SHOW)</code> block, add a <i>timeout</i> branch inside ARRIVED, re-check every <code>else reject</code> line (red), and re-test the whole method. One method, edited by everyone, merge conflicts every sprint. ' + H.c('r', 'That is why the ladder breaks: change is not local.'), [
          CODE('Lines you must read/edit to add NO_SHOW', code, addHl),
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
      { title: 'Add-a-state follow-up: NO_SHOW', html: `<p>Interviewer: "If the rider does not come out within 5 minutes, mark NO_SHOW and charge ₹100." With State objects: ${H.c('g', '(1) new class NoShow')}; ${H.c('g', '(2) one new method timeout() on the interface with a default reject')}; ${H.c('g', '(3) Arrived overrides timeout()')}. Requested, Assigned, InTrip, Completed are untouched. That is the Open/Closed principle in action.</p>`, code: `interface RideState2 {
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
}` },
      { title: 'Who decides the next state? Three valid answers', html: `<p>${H.table(['Style', 'Where the transition lives', 'Good for'], [['State-driven', 'Inside each State class (<code>r.transitionTo(new X())</code>)', 'behaviour-rich states, GoF classic'], ['Context-driven', 'Context switches based on what the state returns', 'states as stateless singletons; easy logging'], ['Table-driven', 'An EnumMap / config file', 'many simple states, rules owned by product/ops']])}</p><p>A popular middle ground: each state method <b>returns</b> the next state (<code>RideState start()</code>), and the context does <code>state = state.start()</code>. States stay free of setters, and the context is the only place that writes the field — perfect for logging and locking.</p>` },
      { title: 'State vs Strategy: identical class diagram, different story', html: `<p>Both have a context holding an interface reference. The difference is <b>who changes it and why</b>. ${H.c('b', 'Strategy')}: the <i>client</i> picks an algorithm (pay by card or UPI) and it rarely changes during the object’s life. ${H.c('p', 'State')}: the object changes its <i>own</i> state as events arrive (REQUESTED → ASSIGNED → …), and states usually know their successors. If an interviewer asks "isn't that just Strategy?", answer with this.</p>` },
      { title: 'Entry and exit actions', html: `<p>Some work belongs to <b>entering</b> or <b>leaving</b> a state, not to a specific event. Entering IN_TRIP starts the fare meter; leaving it stops the meter. Put these in <code>onEnter()</code>/<code>onExit()</code> and call them from <code>transitionTo()</code>. Otherwise you copy "start meter" into every event that leads to IN_TRIP — and forget one. Elevators use this heavily: entering DOORS_OPEN starts a 3-second timer; leaving it cancels the timer.</p>` }
    ],
    deepDive: `<p><b>1. State objects: shared or per-context?</b> If a state has no fields (Requested, InTrip) you can make it a singleton (<code>static final INSTANCE</code>) and share it across a million rides — that is the Flyweight idea. If a state carries data (Assigned has the driver name), create a new instance per transition. Mixing both is fine.</p>
<p><b>2. Invalid-event policy</b> is a design decision you must state out loud: <i>ignore</i> (UI buttons — pressing pause twice is harmless), <i>reject with error</i> (APIs — return 409 Conflict), or <i>throw</i> (programming bug — should never happen). Elevators ignore duplicate hall calls; ATMs return an error screen; payment ledgers throw.</p>
<p><b>3. Guards.</b> A transition may need a condition: "start only if the OTP matches". Put the guard in the state method (<code>if (!otpOk) { r.reject("bad OTP"); return; }</code>) or in the table as a <code>Predicate</code>. UML statecharts write it as <code>start [otp ok] / startMeter</code>: <i>event [guard] / action</i>.</p>
<p><b>4. Hierarchical (nested) states.</b> An elevator in EMERGENCY must ignore all hall calls whether it was MOVING or IDLE. Instead of adding "if emergency" to every state, model a parent state <b>OPERATIONAL</b> with children IDLE/MOVING/DOORS_OPEN, and a sibling EMERGENCY. Events not handled by a child bubble up to the parent (like exceptions bubbling up the call stack). Spring Statemachine, XState and SCXML all support this.</p>
<p><b>5. Persistence.</b> State objects are not stored in a database; their <b>name</b> is. Save <code>status = 'ARRIVED'</code> plus the data (driver id), and rehydrate with a factory: <code>switch (status) { case "ARRIVED" -> new Arrived(driver); … }</code>. Add a <code>version</code> column so two servers cannot both apply a transition (optimistic locking: <code>UPDATE ride SET status='IN_TRIP', version=8 WHERE id=? AND version=7</code>).</p>
<p><b>6. Concurrency.</b> "Check current state, then write next state" is a <b>check-then-act</b> race. Two threads can both see ARRIVED and both start the trip. Make transitions atomic: <code>synchronized</code> on the context, an <code>AtomicReference.compareAndSet(old, next)</code>, or a single-threaded event loop (actor model) — the elevator and ATM topics use these.</p>
<p><b>7. Testing.</b> A state machine is perfect for table-driven tests: for every (state, event) cell, assert the next state and the side effects. 6 × 5 = 30 parameterized cases cover the whole behaviour — including all the "—" rejections that hand-written tests usually forget.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask an assistant for "a vending machine in Java" and you will very often get the if/else ladder or a <code>switch(status)</code> repeated in every method, because that is the most common code online. Your value is spotting that the requirement is <i>state-heavy</i> and asking for the right shape: "Give me a state × event table first, then one class per state with default-reject methods."</p>
<p><b>Use AI as a partner:</b> <code>Here is my transition table. List every (state, event) pair I have not specified and suggest a sensible behaviour for each.</code> LLMs are good at enumerating the missing cells — exactly the edge cases interviewers poke at. Also: <code>Generate JUnit 5 @ParameterizedTest cases for every cell of this table.</code></p>
<p><b>AI agents ARE state machines.</b> LangGraph, OpenAI Agents SDK handoffs and most "agent workflow" tools model an agent as nodes (states) and edges (transitions) with guards ("if tool call failed, go to RETRY"). Knowing State deeply lets you design reliable agent flows: explicit terminal states, retry limits, and no "LLM decides to jump anywhere".</p>
<p><b>Where AI goes wrong:</b> forgets terminal states (allows <i>cancel</i> after COMPLETED), mixes state checks into the context again, creates new state objects on every call in hot paths, and ignores concurrency (two threads transitioning at once). <b>What you must still own:</b> drawing the table, choosing the invalid-event policy, and explaining why the design survives the "add a state" follow-up.</p>`,
    problems: [{
      title: 'Document Approval Workflow (add-a-state ready)', level: 'Medium', tags: ['state pattern', 'workflow', 'open-closed'], companies: ['Atlassian', 'Microsoft', 'Google'],
      statement: `<p>Design the lifecycle of a document in a wiki. States: <b>DRAFT</b>, <b>IN_REVIEW</b>, <b>APPROVED</b>, <b>PUBLISHED</b>. Events: <code>submit()</code> (DRAFT → IN_REVIEW), <code>approve(reviewer)</code> (IN_REVIEW → APPROVED, reviewer must not be the author), <code>reject(reason)</code> (IN_REVIEW → DRAFT, keep the reason), <code>publish()</code> (APPROVED → PUBLISHED), <code>edit()</code> (allowed only in DRAFT; editing an APPROVED doc sends it back to DRAFT). Any other event in any state must be rejected with a message, not crash. <b>Follow-up:</b> add an <b>ARCHIVED</b> state reachable only from PUBLISHED, touching as few classes as possible.</p>`,
      constraints: `Single-threaded is fine for the base version. Keep a history log of transitions. Author and reviewer are plain strings.`,
      example: `<p>Author "asha". Events: ${H.c('b', 'submit')} → IN_REVIEW; ${H.c('r', 'approve("asha")')} → rejected (self-approval); ${H.c('b', 'approve("ben")')} → APPROVED; ${H.c('b', 'edit')} → back to DRAFT (approval is void because content changed); ${H.c('b', 'submit, approve("ben"), publish')} → PUBLISHED; ${H.c('r', 'edit')} → rejected (published docs are frozen).</p>`,
      brute: { why: `<p>A <code>String status</code> field and five methods, each with its own <code>if/else</code> on status. The rule "edit in APPROVED goes back to DRAFT" hides inside <code>edit()</code>; the rule "no self-approval" hides inside <code>approve()</code>. Adding ARCHIVED means editing all five methods (each needs a new branch saying "not allowed"), and a typo like <code>"APPROVD"</code> compiles fine and silently breaks the flow.</p>`, code: `class NaiveDoc {
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
}` },
      mcq: { q: 'You add ARCHIVED with the State pattern and default-reject methods. Which classes must change?', options: ['The interface (new archive() with default reject), Published (override archive), and a new Archived class', 'Every state class', 'Only the Document context', 'Draft and Published only'], answer: 0, explain: 'The default method means states that do not allow archive() need no change. Only the state that leads to ARCHIVED overrides it, plus the new class.' },
      hints: [`<p>Hint 1: Draw the state × event table: 4 states × 5 events. Most cells are "reject". Only 6 cells move the document.</p>`, `<p>Hint 2: <code>interface DocState</code> with one default method per event that calls <code>doc.reject(event)</code>. Each concrete state overrides only its allowed events. The guard "reviewer ≠ author" lives in <code>InReview.approve</code>.</p>`, `<p>Hint 3: Keep the reason from reject() in the Document (data), not in a static field. Recipe: Document(context) → transitionTo(next) logs "A → B" → states as stateless singletons except where they need data → default-reject → ARCHIVED = new class + override in Published.</p>`],
      solution: {
        approach: `<p>The Document is the context: it holds author, content, last rejection reason, history and the current <code>DocState</code>. Each event method on Document is one line: <code>state.submit(this)</code>. States are stateless, so we share singletons. Invalid events fall to the interface's default methods, which log a rejection. The ARCHIVED follow-up adds one interface method with a default, one override in <code>Published</code>, and one new class.</p>`,
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
}`,
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
  ['<code>HallCall</code> / car call', 'floor (+ direction for hall calls)', 'immutable record — the "request"'],
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
}` },
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
      { title: 'Hall call vs car call: two kinds of request', html: `<p>${H.table(['', 'Hall call', 'Car call'], [['Pressed', 'on the floor (▲/▼)', 'inside the car (a floor number)'], ['Data', '(floor, direction)', '(car id, floor)'], ['Who decides the car?', 'the controller (dispatcher)', 'already decided — it is that car'], ['Example', 'Floor 4, ▲', 'Car B, go to 9']])}</p><p>Modelling both as one <code>Request</code> class with a nullable direction is a common mistake; the dispatcher only ever handles hall calls. Two small records keep each rule obvious.</p>`, code: `record HallRequest(int floor, boolean up) {}
record CarRequest(int carId, int floor) {}` },
      { title: 'Why a set of stops, not a FIFO queue', html: `<p>Calls arrive: 7, 2, 6 while the car is at 0. A FIFO queue forces 0→7→2→6 = 7 + 5 + 4 = <b>16 floors</b>. A sorted set lets the car serve 2 and 6 on the way up: 0→2→6→7 = <b>7 floors</b>. Also, pressing 6 three times must not create three stops — a set ignores duplicates for free. ${H.c('g', 'TreeSet&lt;Integer&gt; gives higher(f)/lower(f) in O(log n)')}, exactly the "next stop above/below me" questions a lift asks.</p>` },
      { title: 'Door obstruction: the safety self-loop', html: `<p>In DOORS_OPEN, each tick checks the door sensor first. Blocked → reset timer, stay open. This rule lives in exactly one place (<code>DOORS_OPEN.onTick</code>). With flags, you would have to remember to check <code>doorBlocked</code> everywhere doors might close — and an elevator closing on a child is not a bug you get to fix later.</p>` },
      { title: 'Add-a-state follow-up: OVERLOADED', html: `<p>"If load exceeds 680 kg, keep doors open and beep." Add <b>OVERLOADED</b>: DOORS_OPEN → OVERLOADED when the weight sensor trips; OVERLOADED → DOORS_OPEN when weight drops. IDLE/MOVING states are untouched because only DOORS_OPEN can lead there — a car cannot become overloaded with closed doors.</p>`, code: `enum CarState2 {
    DOORS_OPEN { CarState2 onTick(Car2 c) { return c.loadKg() > 680 ? OVERLOADED : DOORS_OPEN; } },
    OVERLOADED { CarState2 onTick(Car2 c) { c.beep(); return c.loadKg() > 680 ? OVERLOADED : DOORS_OPEN; } };
    abstract CarState2 onTick(Car2 c);
}
class Car2 {
    int load = 700;
    int loadKg() { return load; }
    void beep() { System.out.println("BEEP: overloaded"); }
}` },
      { title: 'Display as an Observer of the car', html: `<p>Each floor has a display "▲ 5". Instead of the car calling every display, displays <b>subscribe</b> to the car: <code>car.addListener(display)</code>; on every state change the car notifies listeners with (floor, direction). New listeners (a mobile app, a building-management dashboard, a logger) plug in without changing <code>ElevatorCar</code>. State + Observer is the standard combination in elevator designs.</p>` }
    ],
    deepDive: `<p><b>Tick-driven vs event-driven.</b> Our car advances on a clock tick — easy to simulate and test deterministically (great in a machine-coding round). Real controllers are <b>event-driven</b>: sensors fire "floor 4 reached", "door closed", "weight changed"; each event is fed to the current state. Both are the same state machine; only the trigger differs. Say this out loud in interviews.</p>
<p><b>Single thread of control.</b> Buttons are pressed from many threads (floors, cars, network). Never let them mutate the car directly. Put every input into a <code>BlockingQueue&lt;Event&gt;</code> consumed by one controller thread per car (the <b>actor</b> or event-loop model). Then the state machine needs no locks, and events are applied in a clear order. If you must share, make <code>addStop</code> and <code>tick</code> <code>synchronized</code> on the car.</p>
<p><b>Illegal states must be unrepresentable.</b> With flags (isMoving, isDoorOpen) there are 2 × 2 = 4 combinations and one of them (moving with doors open) is deadly. With one <code>CarState</code> field there are exactly 5 legal states. Real lift firmware is verified exactly this way — every state has a defined door status and motor status.</p>
<p><b>Stops data structure.</b> <code>TreeSet</code> gives O(log n) for add/remove/higher/lower; with only ~100 floors a <code>boolean[] up, down</code> pair indexed by floor is O(1) and even simpler. Many production designs keep <b>two sets</b>: stops to serve while going up, stops while going down — this is how a hall call "5▼" is <i>not</i> served by a car passing 5 on its way up (the person wants to go down; picking them up now would take them the wrong way).</p>
<p><b>Timers.</b> In production, DOORS_OPEN uses a <code>ScheduledExecutorService</code> to schedule a <code>DoorTimeout</code> event; leaving the state (exit action) cancels the scheduled future. A forgotten timer that fires in the wrong state is a classic bug — the state machine protects you because DOORS_OPEN is the only state that handles DoorTimeout; every other state ignores it.</p>
<p><b>Safety vs efficiency hierarchy.</b> Fire service &gt; maintenance &gt; door safety &gt; overload &gt; normal scheduling. Model this as a <b>hierarchical state machine</b>: a top-level FIRE_SERVICE state overrides everything; NORMAL_OPERATION contains IDLE/MOVING/DOORS_OPEN as sub-states.</p>`,
    aiEra: `<p><b>What AI changes:</b> an LLM will produce a 200-line elevator in seconds — usually a single <code>Elevator</code> class with <code>isMoving</code> and <code>doorOpen</code> booleans and a <code>PriorityQueue</code> of requests. It runs, so juniors stop there. Your job is to review it like a senior: "Which combinations of these flags are illegal? Where is the door-safety rule? What happens to a hall call for 5▼ while the car goes up past 5?"</p>
<p><b>Use AI as a partner:</b> <code>Here is my CarState enum and transitions. Generate a randomized simulation that presses 1000 random buttons and asserts: doors never open while moving, every request is eventually served, the car never goes outside floors 0-9.</code> Property-based tests like this find bugs no hand-written test does — and AI is very good at writing them.</p>
<p><b>Modern buildings:</b> destination dispatch (you type your floor in the lobby and the screen says "take car C"), occupancy prediction from badge-in data, and ML models tuning dispatch weights by time of day (morning up-peak, lunch, evening down-peak). The state machine stays the same; the dispatcher gets smarter.</p>
<p><b>What you must still own:</b> the state × event table, the safety ordering, the single-thread-of-control decision, and explaining trade-offs (tick vs event, TreeSet vs arrays) in your own words.</p>`,
    problems: [{
      title: 'Fire Recall Mode for an Elevator (add-a-state)', level: 'Medium', tags: ['state pattern', 'elevator', 'add-a-state'], companies: ['Amazon', 'Microsoft', 'Otis', 'Uber'],
      statement: `<p>You have a working elevator car with states IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN. Add <b>fire recall</b>: when the building's fire alarm triggers, the car must (1) drop all pending stops, (2) if doors are open, close them as soon as the door is not blocked, (3) travel non-stop to the lobby (floor 0), (4) open doors and stay parked, ignoring every call, until the alarm is reset — then return to IDLE. Implement it without adding <code>if (fire)</code> checks to the existing states.</p>`,
      constraints: `Floors 0–20. Tick-based simulation. Existing states may change only where they must react to the alarm event.`,
      example: `<p>Car at floor 6 moving up to 9. ${H.c('r', 'Alarm!')} Stops {9} cleared → state ${H.c('y', 'FIRE_RECALL')} → moves 6→5→…→0 (ignores a car call for 3 pressed on the way) → ${H.c('b', 'FIRE_PARKED')} with doors open. Hall calls rejected. ${H.c('g', 'Alarm reset')} → IDLE.</p>`,
      brute: { why: `<p>Add a boolean <code>fireMode</code> and sprinkle checks: in addStop (reject), in IDLE (go to 0), in MOVING_UP (reverse!), in MOVING_DOWN (do not stop), in DOORS_OPEN (close faster). Five places to edit; forgetting one (say MOVING_DOWN still stops at floor 3 for a car call) is a safety bug. And the combination <code>fireMode && maintenance</code> is undefined.</p>`, code: `class FlagCar {
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
}` },
      mcq: { q: 'A passenger presses "3" inside the car during FIRE_RECALL. With the State pattern, where is this handled?', options: ['FIRE_RECALL.acceptsCalls() returns false, so addStop() rejects it — no other code changes', 'MOVING_DOWN must check a fire flag', 'The controller must filter it', 'It cannot be handled'], answer: 0, explain: 'The new states declare their own policy for calls. The context asks the current state; existing states do not know fire mode exists.' },
      hints: [`<p>Hint 1: Fire recall is really <b>two</b> new states: FIRE_RECALL (travelling to the lobby) and FIRE_PARKED (doors open, waiting for reset).</p>`, `<p>Hint 2: The alarm is an <b>outside event</b> that can arrive in any state. Handle it once in the car: <code>onFireAlarm()</code> clears stops and sets the state to FIRE_RECALL — the existing states do not need to know.</p>`, `<p>Hint 3: FIRE_RECALL.onTick: if doors open and not blocked → close; else if floor &gt; 0 → move down; else → FIRE_PARKED. Both new states override <code>acceptsCalls()</code> to false. Reset: only FIRE_PARKED → IDLE.</p>`],
      solution: {
        approach: `<p>Model the alarm as an outside event handled by the context: it clears the stop set and jumps to <b>FIRE_RECALL</b> (doors close safely, then the car moves down without stopping). On reaching floor 0 it becomes <b>FIRE_PARKED</b> (doors open). Both new enum constants override <code>acceptsCalls()</code> to return false, so <code>addStop</code> rejects calls without any flag. Reset is accepted only in FIRE_PARKED. The original four states are unchanged.</p>`,
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
    }
}`,
        complexity: `<p>Each tick is O(log n) for the TreeSet operations; recall takes at most (current floor + 1) ticks. Adding the mode cost 2 new enum constants and 2 context methods; the four existing states were not edited.</p>`,
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
}` }, { lang: 'java', title: 'Multi-car dispatcher with a direction-aware cost function', code: `import java.util.*;

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
}` }],
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
      { title: 'Directional hall calls in the stop sets', html: `<p>Car at 2 going ▲ with car call 8. Hall calls: 5▲ and 5▼. With two sets: <code>upStops = {5, 8}</code>, <code>downStops = {5}</code>. Going up it stops at 5 for the ▲ caller only; the ▼ caller is served on the way back down. Passing a floor serves it only if the floor is in the set for the <b>current direction</b>.</p>`, code: `import java.util.*;
class DirectionalStops {
    final TreeSet<Integer> up = new TreeSet<>(), down = new TreeSet<>();
    void hallCall(int floor, boolean wantsUp) { (wantsUp ? up : down).add(floor); }
    /** Should a car moving in direction 'goingUp' stop at 'floor'? */
    boolean shouldStop(int floor, boolean goingUp) { return goingUp ? up.contains(floor) : down.contains(floor); }
}` },
      { title: 'Estimating wait time for the dispatcher', html: `<p>Our cost uses floors, but production systems estimate <b>seconds</b>: travel ≈ floors × 1.5 s + stops on the way × 10 s (doors + boarding). A car 3 floors away with 4 stops in between (≈ 44 s) loses to an idle car 7 floors away (≈ 10 s). The structure stays the same — only the cost function (a Strategy) gets smarter.</p>` }
    ],
    deepDive: `<p><b>Offline vs online.</b> Textbook FCFS/SSTF/SCAN/LOOK assume all requests are known (offline). Real elevators are <b>online</b>: requests keep arriving. The correct implementation is not "compute a route once" but "on every tick, ask: is my current floor in the stop set for my direction? Is there anything ahead? If not, reverse or go idle." That is LOOK expressed as a state machine — exactly the <code>chooseDirection()</code> in the previous topic.</p>
<p><b>Complexity.</b> With a <code>TreeSet</code> per direction, adding a stop and finding the next stop ahead (<code>ceiling</code>/<code>floor</code>) are O(log F); with F ≤ 200 floors a <code>boolean[]</code> scan is also fine. SSTF over N pending requests is O(N) per decision with a list, O(log N) with a sorted set (nearest = floor/ceiling of the current position).</p>
<p><b>Starvation proof for LOOK.</b> A request at floor f is reached at most after the car finishes its current sweep and one sweep in the opposite direction — at most 2·(top − bottom) floors of travel, regardless of new arrivals, because the car never reverses while requests remain ahead. SSTF has no such bound.</p>
<p><b>Dispatch is an assignment problem.</b> Assigning calls one at a time greedily (what we do) is standard. Modern controllers <b>re-assign</b> periodically (a call may move to a newly idle car), and destination-dispatch systems group passengers by destination so a car makes fewer stops — fewer stops is the biggest win, since each stop costs ~10 seconds.</p>
<p><b>Traffic modes as Strategy swaps.</b> Up-peak (morning): send idle cars to the lobby. Down-peak (evening): park cars at the top. Inter-floor (midday): spread cars across zones. Night: park one car at the lobby, put others in energy-save. A <code>TrafficModeStrategy</code> chosen by time-of-day or by measured traffic keeps all this out of the car code.</p>
<p><b>Energy and comfort.</b> Fewer direction reversals = less energy and fewer jerks; LOOK minimises reversals. Some systems penalise reversals in the cost function and cap the number of stops per trip.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking "which elevator algorithm is best?" gets a confident generic answer. The better use is <b>simulation</b>: <code>Write a Java simulator that replays 10,000 random requests (Poisson arrivals, 70% from the lobby at 9 am) through FCFS, SSTF and LOOK and reports average and 99th-percentile wait.</code> Data beats opinions, and AI writes simulators fast.</p>
<p><b>ML in real dispatch:</b> modern controllers learn traffic patterns (badge-ins, calendar, weather) and tune dispatch weights or pre-position idle cars. Reinforcement learning has been studied for dispatch for decades; in practice it usually tunes a <b>cost function</b> inside a classic, verifiable controller rather than replacing it, because safety rules must stay deterministic.</p>
<p><b>Where AI goes wrong:</b> LLM-written elevators often use one <code>PriorityQueue</code> ordered by distance — that is SSTF with starvation — or ignore hall-call direction. They also mix scheduling into the state machine with if/else. <b>What you must still own:</b> naming the trade-off (throughput vs fairness), proving bounded waiting, and keeping scheduling as a swappable Strategy separate from the car's State.</p>`,
    problems: [{
      title: 'LOOK Service Order and Distance', level: 'Medium', tags: ['elevator', 'scheduling', 'treeset'], companies: ['Amazon', 'Microsoft', 'Adobe', 'Goldman Sachs'],
      statement: `<p>An elevator is at floor <code>start</code> moving in direction <code>dir</code> (UP or DOWN). Pending requests are given as a list of floors (may contain duplicates). Using the <b>LOOK</b> policy, return the order in which the floors are served and the total floors travelled. Then implement a <code>LookScheduler</code> class that supports <b>online</b> use: <code>addRequest(floor)</code> at any time and <code>nextStop()</code> that returns the next floor to go to (or -1 if idle), updating its direction.</p>`,
      constraints: `0 ≤ floors ≤ 10<sup>6</sup>, up to 10<sup>5</sup> requests; a request at the current floor is served immediately.`,
      example: `<p>start = 5, dir = UP, requests = [8, 2, 6, 1, 4, 6]. Up sweep: ${H.c('g', '6, 8')}; reverse at 8 (last request above); down sweep: ${H.c('b', '4, 2, 1')}. Order = [6, 8, 4, 2, 1]; distance = 1 + 2 + 4 + 2 + 1 = <b>10</b>. The duplicate 6 is served once.</p>`,
      brute: { why: `<p>Simulate floor by floor: at each floor scan every pending request to see if one is here, and to see if anything remains ahead. That is O(F × N) — 10<sup>6</sup> floors × 10<sup>5</sup> requests = 10<sup>11</sup> steps. All the work spent "checking empty floors" is wasted; a sorted structure can jump straight to the next stop.</p>`, code: `import java.util.*;
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
}` },
      mcq: { q: 'The car is at 5 going UP, with requests at 3 and 7. A new request for 6 arrives when the car is at 5.5 (between 5 and 6). What does LOOK do?', options: ['Stops at 6, then 7, then reverses to 3', 'Goes to 7 first because it was earlier', 'Reverses to 3 immediately because 3 is closer to 5 than 7', 'Ignores 6 until the next sweep'], answer: 0, explain: 'LOOK serves everything ahead in the current direction in floor order, including late arrivals ahead of the car.' },
      hints: [`<p>Hint 1: LOOK = "everything at or above me in ascending order, then everything below me in descending order" (for UP). Duplicates do not matter — use a set.</p>`, `<p>Hint 2: A <code>TreeSet</code> gives <code>tailSet(start, true)</code> and <code>headSet(start, false).descendingSet()</code>. For the online version, <code>ceiling(pos)</code> / <code>floor(pos)</code> give the next stop in each direction in O(log N).</p>`, `<p>Hint 3: Online <code>nextStop()</code>: if direction is UP and <code>ceiling(pos)</code> exists → go there; else flip to DOWN and try <code>floor(pos)</code>; if neither, return -1 (idle). Remove the floor when served, update pos.</p>`],
      solution: {
        approach: `<p>Offline: put requests in a TreeSet; for UP take the tail set (≥ start) ascending, then the head set (&lt; start) descending; the mirror for DOWN. Distance is the sum of absolute gaps. Online: keep the TreeSet and the current direction; <code>nextStop</code> looks ahead with <code>ceiling</code>/<code>floor</code> and flips only when nothing remains ahead — that is exactly the LOOK rule, and it avoids starvation.</p>`,
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
    }
}`,
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
  ['<code>Product</code> (record)', 'code, name, price — immutable'],
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
}` },
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
      { title: 'Add-a-state: CARD_AUTHORIZING for UPI/card payment', html: `<p>New requirement: pay by card. Add a <b>PaymentMethod</b> Strategy (Cash, Card, UPI) and one new state <b>AUTHORIZING</b>: HAS_SELECTION → AUTHORIZING (waiting for the bank) → DISPENSING on approval, → IDLE on decline/timeout. Cash flow is untouched. Because authorization is <i>slow and can fail</i>, it deserves its own state — while authorizing, coin inserts are rejected and cancel sends a "void" to the bank.</p>`, code: `interface PaymentMethod { boolean authorize(int amountRs); void voidAuth(); }
class UpiPayment implements PaymentMethod {
    public boolean authorize(int amountRs) { return amountRs <= 2000; }   // stub: UPI-lite limit
    public void voidAuth() { System.out.println("UPI authorization voided"); }
}` },
      { title: 'Dispense failure: the snack gets stuck', html: `<p>The motor turns but the drop sensor sees nothing (the classic stuck packet). A good design has the DISPENSING state wait for a <b>drop-sensor</b> event: success → commit; timeout → retry the motor once, then <b>refund</b> (or offer another item) and mark the slot faulty. That is why DISPENSING is a real state and not just a method call — it is where hardware can fail.</p>` }
    ],
    deepDive: `<p><b>Commit ordering = money safety.</b> The safest order is: validate everything (slot, stock, balance, change plan) → <b>reserve</b> (mark the item and change coins as taken) → physically dispense → on drop-sensor success <b>commit</b> (stock −1, escrow → box, change out) → on failure <b>release</b> the reservation and refund. It is a tiny two-phase commit between software and hardware.</p>
<p><b>Change-making complexity.</b> Largest-first with backtracking is fine for 5 denominations and small counts. For "fewest coins with limited counts", use bounded-knapsack DP: <code>dp[a]</code> = fewest coins for amount a, processing each denomination with its count (binary splitting keeps it O(D · A · log C)). Amounts are small (≤ ₹2000) so this is microseconds.</p>
<p><b>"Exact change only" mode.</b> When the coin box runs low, real machines light an "EXACT CHANGE" lamp. That is a derived condition (<code>coinBox.canMakeAnyChangeUpTo(maxOverpay)</code>), better shown as a display flag than a full state, because it does not change which events are allowed — only which <i>sales</i> succeed. Knowing when <i>not</i> to make something a state is part of the skill.</p>
<p><b>Thread safety.</b> A physical machine has one customer, but a "smart" machine also receives remote events (operator app, telemetry, card terminal callbacks). Run all events through one thread (an event queue) or make the context methods <code>synchronized</code>; never let a card callback and a coin insert transition the state at the same time.</p>
<p><b>Inventory at scale.</b> A fleet of 10,000 machines reports stock and coin levels to a backend (IoT telemetry) so trucks restock before SOLD_OUT. The machine's state machine stays local and works offline; the backend is an Observer of state changes.</p>
<p><b>Money as integers.</b> Store paise/rupees as <code>int</code>/<code>long</code>, never <code>double</code> — 0.1 + 0.2 ≠ 0.3 in floating point, and a machine that is off by a paisa per sale fails audits.</p>`,
    aiEra: `<p><b>What AI changes:</b> "vending machine in Java" is one of the most generated LLD answers on the internet, so AI output looks polished. Typical gaps: no escrow (cancel refunds from the coin box), change computed <i>after</i> dispensing, greedy change with limited coins, <code>double</code> for money, and no DISPENSING failure path. Use those as your review checklist.</p>
<p><b>Use AI as a partner:</b> <code>Generate 20 adversarial event sequences for my vending machine (cancel mid-dispense, coins during maintenance, exact-change edge cases) and the expected final inventory and coin box for each.</code> Then run them as tests. Also: <code>Prove or disprove: greedy change is optimal for coins {1, 3, 4}.</code> (It is not: 6 = 3+3, greedy gives 4+1+1.)</p>
<p><b>Real-world 2026:</b> machines take UPI/QR and tap-to-pay; the payment callback arrives asynchronously from a network — the state machine gains an AUTHORIZING state and idempotent handling of duplicate callbacks. <b>What you must still own:</b> the state table, the money-safety ordering and the failure paths — the parts that cost real money when wrong.</p>`,
    problems: [{
      title: 'Exact Change from a Limited Coin Box', level: 'Medium', tags: ['vending machine', 'dp', 'change-making'], companies: ['Amazon', 'Walmart', 'Flipkart'],
      statement: `<p>A vending machine must return <code>amount</code> rupees of change using its coin box, where <code>denoms[i]</code> has <code>counts[i]</code> coins available. Return the change using the <b>fewest coins</b> as a map denomination → count, or report that it is impossible (so the machine can refuse the sale <i>before</i> dispensing). Explain why greedy is not enough.</p>`,
      constraints: `1 ≤ denominations ≤ 10, 0 ≤ amount ≤ 10<sup>4</sup>, counts ≤ 10<sup>3</sup>.`,
      example: `<p>denoms = [1, 2, 5, 10], counts = [0, 3, 1, 1], amount = 6. Greedy: 5 → remaining 1 → ${H.c('r', 'no ₹1 coin, fails')}. Correct: ${H.c('g', '{2: 3}')} (3 coins). amount = 17 → ${H.c('g', '{10:1, 5:1, 2:1}')}. amount = 3 → ${H.c('r', 'impossible')} (only even coins and a 5/10).</p>`,
      brute: { why: `<p>Try every combination of counts for every denomination: (c<sub>1</sub>+1) × (c<sub>2</sub>+1) × … combinations — with 4 denominations of 1000 coins each that is 10<sup>12</sup>. Plain greedy is fast but wrong with limited counts (example above).</p>`, code: `import java.util.*;
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
}` },
      mcq: { q: 'Coins {1, 3, 4}, unlimited counts, amount 6. What does greedy give vs optimal?', options: ['Greedy 4+1+1 (3 coins), optimal 3+3 (2 coins)', 'Both give 3+3', 'Greedy fails entirely', 'Both give 4+1+1'], answer: 0, explain: 'Greedy is only guaranteed optimal for canonical coin systems with unlimited coins; {1,3,4} is not canonical.' },
      hints: [`<p>Hint 1: This is a <b>bounded</b> knapsack: each denomination can be used at most counts[i] times; minimise the number of coins.</p>`, `<p>Hint 2: <code>dp[a]</code> = fewest coins to make a. Process denominations one by one; for each, use it k = 1..counts[i] times on top of the previous layer (iterate a from high to low or keep a copy of the previous layer).</p>`, `<p>Hint 3: To return the coins, store for each (denomination, amount) how many of that coin were used, then walk back. dp[0] = 0, others = ∞; answer impossible if dp[amount] = ∞.</p>`],
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
    }
}`,
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
}` },
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
      { title: 'Transactions as Command objects', html: `<p>Each user choice becomes an object (<code>WithdrawTxn(2700)</code>) with an id. Benefits: the AUTHENTICATED state has one method <code>choose(Transaction t)</code> instead of one per menu item; each transaction is written to the <b>journal</b> before running (crash recovery); and adding "mini statement" or "PIN change" is a new class, nothing else.</p>`, code: `interface Txn { String run(); }
record MiniStatement(String account) implements Txn {
    public String run() { return "Last 5 transactions for " + account; }   // new feature = new class
}` },
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
      brute: { why: `<p>A single method with hard-coded <code>if (amount &gt;= 2000) … if (amount &gt;= 500) …</code> greedy steps. It fails on limited stock (₹600 case), and adding ₹50 means editing the method. Trying all combinations of all counts (2001<sup>4</sup>) is far too slow.</p>`, code: `class HardCodedDispenser {
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
}` },
      mcq: { q: 'Why does the plan step come before calling the bank in a withdrawal?', options: ['So the customer is never charged for an amount the ATM cannot physically dispense', 'Because the bank needs the note breakdown', 'To make the transaction faster', 'It does not matter'], answer: 0, explain: 'Planning is local and side-effect free; if it fails, nothing needs undoing. Debit-then-discover-you-cannot-dispense forces a reversal.' },
      hints: [`<p>Hint 1: Make each denomination a <b>handler</b> that knows its note value, its stock and the next handler. The chain order (big → small) is set up once at construction.</p>`, `<p>Hint 2: Plain "take as many as you can" fails on limited stock. Let each handler try <code>use = max … 0</code> and ask the next handler to solve the remainder; return true on the first success (backtracking). Write into the plan only on success.</p>`, `<p>Hint 3: Keep <code>plan()</code> pure (no stock changes) and a separate <code>commit(plan)</code> that walks the chain subtracting counts. Adding ₹50 = link one more handler.</p>`],
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

    public static void main(String[] args) {
        Cassette c2000 = new Cassette(2000, 1);
        c2000.link(new Cassette(500, 1)).link(new Cassette(200, 3)).link(new Cassette(100, 0));
        Dispenser d = new Dispenser(c2000);
        System.out.println(d.plan(600));      // Optional[{200=3}]
        System.out.println(d.plan(2700));     // Optional[{2000=1, 500=1, 200=1}]
        System.out.println(d.plan(300));      // Optional.empty -> refuse before calling the bank

        Cassette big = new Cassette(2000, 2);  // adding a Rs 50 cassette = one more link()
        big.link(new Cassette(500, 10)).link(new Cassette(200, 10)).link(new Cassette(100, 10)).link(new Cassette(50, 4));
        Dispenser d2 = new Dispenser(big);
        Map<Integer, Integer> p = d2.plan(2750).orElseThrow();
        d2.dispense(p);
        System.out.println(p);                // {2000=1, 500=1, 200=1, 50=1}
    }
}`,
        complexity: `<p>Greedy-feasible cases run in O(D) (no backtracking). Worst case backtracking explores O(∏ counts) branches, but with 4–5 denominations, the descending order and early success it is tiny in practice; for guaranteed bounds use bounded-knapsack DP, O(D · A/100). Space O(D) recursion.</p>`,
        followUps: ['Prefer to keep ₹100 notes for small withdrawals: change the preference order without breaking correctness.', 'A cassette reports a fault mid-day: how does the chain skip it?', 'Customer asks for "₹2000 in ₹500 notes": how would you add a note-preference option?']
      }
    }]
  });

  registerModule({
    id: 'lld09',
    title: 'State-Heavy Designs: Elevator, Vending Machine, ATM',
    intro: `<p>Some machines are all about <b>"what mode am I in right now?"</b>. A lift that is moving up ignores the button for a floor it already passed. A vending machine with no money in it refuses to drop a snack. An ATM will not show your balance until your PIN is correct. These are <b>state-heavy designs</b>, and they are the most common "machine coding" rounds at Amazon, Microsoft, Uber, Flipkart, Swiggy, Walmart and Goldman Sachs.</p>
<p>This module first takes the <b>State pattern</b> apart properly — the brute-force if/else ladder and exactly why it breaks, enum tables, GoF state classes, sealed records, guards, entry/exit actions, nested states. Then it builds three full designs end to end: an <b>Elevator system</b> (car state machine plus FCFS/SSTF/SCAN/LOOK scheduling and multi-car dispatch), a <b>Vending Machine</b> (states, inventory, coins and change-making) and an <b>ATM</b> (card/PIN states, withdraw/deposit/balance flows, cash dispensing chain, bank rollback). It ends with production-grade concerns: thread-safe transitions, persistence and testing. Every topic has an animated visualizer — state boxes lighting up, lift cars moving floor by floor, coins flowing in and change flowing out.</p>`,
    goals: [
      'Turn any state-heavy requirement into a <b>state × event table</b> and then into clean Java (enum table, State classes or sealed records) — and say which one fits and why.',
      'Design a complete <b>Elevator system</b>: entities, car state machine, request handling, and compare FCFS, SSTF, SCAN and LOOK on real request lists; dispatch requests across multiple cars.',
      'Design a complete <b>Vending Machine</b> with states, inventory, coin handling, exact-change problems and refunds, and add new states (maintenance, sold-out) without editing existing ones.',
      'Design an <b>ATM</b>: card and PIN states, lock after 3 wrong PINs, withdraw/deposit/balance flows, cash dispensing with Chain of Responsibility, and safe rollback when cash fails to come out.',
      'Make state machines <b>production-ready</b>: atomic transitions under concurrency (synchronized, CAS, single-threaded loop), persistence with versions, and table-driven tests.',
      'Survive the classic interview follow-ups: "add a state", "add a second elevator", "the machine runs out of change", "the network fails mid-withdrawal".'
    ],
    prereqs: `<p>LLD 2 (SOLID — especially Open/Closed), LLD 6 (Behavioral Patterns — Strategy, State, Chain of Responsibility, Command, Observer at a basic level) and LLD 7 (the LLD interview framework). Comfortable Java: interfaces with default methods, enums and <code>EnumMap</code>, records, collections (<code>TreeSet</code>, <code>PriorityQueue</code>). Basic threads help for the last topic.</p>`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
