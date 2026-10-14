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
