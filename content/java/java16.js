(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function note(label, html) { return { type: 'text', label: label, html: html }; }
  function copyObj(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function tokens(input, re, hint) {
    var t = String(input === undefined ? '' : input).trim().split(re || /[\s,]+/).filter(function (x) { return x.length; });
    if (!t.length) throw new Error(hint || 'Please type something');
    return t;
  }
  function codePart(code, lines, cls, label) {
    var hl = {};
    [].concat(lines === undefined || lines === null ? [] : lines).forEach(function (n) { hl[n] = cls || 'cur'; });
    return { type: 'code', label: label || 'Code (highlighted = running now)', lang: 'java', code: code, hl: hl };
  }

  /* ======================================================================
     TOPIC 1 — Entity mapping and lifecycle states
     ====================================================================== */
  var LIFE_NODES = [
    { id: 'TRANSIENT', label: 'Transient (new)', x: 12, y: 30, shape: 'box', w: 20 },
    { id: 'MANAGED', label: 'Managed', x: 50, y: 10, shape: 'box', w: 18 },
    { id: 'DETACHED', label: 'Detached', x: 88, y: 30, shape: 'box', w: 18 },
    { id: 'REMOVED', label: 'Removed', x: 50, y: 52, shape: 'box', w: 18 }
  ];
  var LIFE_EDGES = [['TRANSIENT', 'MANAGED', 'persist'], ['MANAGED', 'DETACHED', 'detach/clear/commit'], ['MANAGED', 'REMOVED', 'remove'], ['REMOVED', 'MANAGED', 'persist'], ['REMOVED', 'TRANSIENT', 'commit'], ['DETACHED', 'MANAGED', 'merge (copy!)']];

  topics.push({
    title: 'Entity Mapping and the Four Lifecycle States',
    analogy: `<p>Think of a <b>hotel guest list</b>. A person walking in off the street is a stranger (<b>transient</b>): the hotel has no record of them. Once they check in, the front desk is <b>watching</b> them (<b>managed</b>): any change to their room order is noted and billed at checkout. When they check out but keep the old key card, they are <b>detached</b>: they still look like a guest, but the desk no longer tracks what they do. If they ask to cancel, they are marked for removal (<b>removed</b>) and their record is deleted at the end of the day (commit). "Merge" is the desk making a <b>fresh</b> record from the old key card; the person holding the old card is still not tracked.</p>`,
    explain: `<p><b>Plain idea:</b> an <b>entity</b> is a plain Java class whose objects are rows in a table. Jakarta Persistence (JPA 3.x, package ${C('jakarta.persistence')}) is the standard; Hibernate 6 is the most used implementation. You describe the mapping with annotations, and the ${C('EntityManager')} (Hibernate's ${C('Session')}) moves objects between memory and the database.</p>
<h4>1. The core mapping annotations</h4>
${H.table(['Annotation', 'Meaning', 'Interview detail'], [
  [C('@Entity'), 'this class is a table row type', 'needs a no-arg constructor (can be protected) and must not be final if you want lazy proxies'],
  [C('@Id + @GeneratedValue'), 'primary key and how it is made', C('IDENTITY') + ' disables JDBC insert batching; ' + C('SEQUENCE') + ' with a pooled optimizer is preferred'],
  [C('@Column / @Table'), 'names, nullability, length', 'only affect DDL generation and SQL names, not validation'],
  [C('@Enumerated(STRING)'), 'store enum by name', 'the default ORDINAL breaks when someone reorders constants'],
  [C('@Embedded / @Embeddable'), 'value object in the same row', 'no identity of its own, e.g. Address, Money'],
  [C('@ManyToOne / @OneToMany(mappedBy)'), 'associations', 'the side holding the foreign key is the <b>owning</b> side; mappedBy is the inverse (ignored for writes)'],
  [C('@Version'), 'optimistic lock counter', 'covered in the locking topic']
])}
<h4>2. The four states</h4>
${H.table(['State', 'In the persistence context?', 'Has a DB row?', 'Changes saved automatically?'], [
  ['Transient (new)', 'no', 'no', 'no'],
  ['Managed', H.c('g', 'yes'), 'yes (or will at flush)', H.c('g', 'yes, by dirty checking')],
  ['Detached', 'no', 'yes', H.c('r', 'no')],
  ['Removed', 'yes, scheduled for DELETE', 'until flush', 'DELETE at flush']
])}
<p>${C('persist(e)')} makes <i>that same object</i> managed. ${C('merge(e)')} copies the state of <code>e</code> onto a managed instance and <b>returns that other instance</b>; <code>e</code> itself stays detached. This is the number-one lifecycle bug: changing <code>e</code> after merge does nothing.</p>`,
    clues: ['"What is the difference between persist and merge?"', '"detached entity passed to persist" in a stack trace', '"I changed the object but nothing was saved" → it is detached, or you kept the argument of merge instead of the returned copy', '"Which side of the relationship owns the foreign key?" → owning side vs mappedBy', '"Why is batch insert not working?" → IDENTITY generation', '"How should equals/hashCode be written for an entity?"'],
    code: [{ lang: 'java', check: false, title: 'Order and OrderLine entities (Jakarta Persistence 3, Hibernate 6)', code: `import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "order_seq")
    @SequenceGenerator(name = "order_seq", sequenceName = "order_seq", allocationSize = 50) // pooled: 1 DB call per 50 ids
    private Long id;

    @Version                       // optimistic locking counter
    private int version;

    @Enumerated(EnumType.STRING)   // never ORDINAL
    private Status status = Status.NEW;

    @Embedded
    private Address shipTo;        // value object, columns live in the orders table

    // Inverse side: the FK order_id lives in order_line, owned by OrderLine.order
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderLine> lines = new ArrayList<>();

    protected Order() { }          // JPA needs a no-arg constructor

    // Helper keeps BOTH sides in sync; only the owning side is written to the DB
    public void addLine(OrderLine l) { lines.add(l); l.setOrder(this); }
    public void removeLine(OrderLine l) { lines.remove(l); l.setOrder(null); }

    // equals/hashCode safe across all lifecycle states (id is null before persist)
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Order other)) return false;
        return id != null && id.equals(other.id);
    }
    @Override public int hashCode() { return Order.class.hashCode(); } // constant: never changes when id is assigned
}

@Entity
class OrderLine {
    @Id @GeneratedValue Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) // owning side; override the EAGER default
    @JoinColumn(name = "order_id")
    private Order order;
    private BigDecimal price;
    void setOrder(Order o) { this.order = o; }
}` }, { lang: 'java', check: false, title: 'Lifecycle in code: persist vs merge', code: `EntityManager em = emf.createEntityManager();
em.getTransaction().begin();
Order o = new Order();            // TRANSIENT
em.persist(o);                    // MANAGED (same object), INSERT queued until flush
em.getTransaction().commit();     // flush + commit
em.close();                       // o is now DETACHED

o.setStatus(Status.PAID);         // nobody is watching: no UPDATE

EntityManager em2 = emf.createEntityManager();
em2.getTransaction().begin();
Order managed = em2.merge(o);     // SELECT by id, copy state onto a managed copy
System.out.println(managed == o); // false!  o stays detached
managed.setStatus(Status.SHIPPED);// tracked: UPDATE at commit
em2.remove(managed);              // REMOVED: DELETE at flush
em2.getTransaction().commit();` }],
    codeTitle: ['Entity mapping with the important choices commented', 'persist vs merge on a detached object'],
    viz: {
      title: 'Lifecycle state machine: follow one object',
      input: 'persist commit merge persist',
      inputLabel: 'ops: persist remove detach merge commit (space separated)',
      gen: function (input) {
        var ops = tokens(input, /[\s,]+/, 'Type ops like: persist commit merge').slice(0, 14);
        var s = 'TRANSIENT', frames = [];
        function snap(narr, eh, bad) {
          var hl = one(s, bad ? 'bad' : 'cur');
          frames.push({ narr: narr, parts: [
            { type: 'graph', label: 'States of the object e', directed: true, height: 62, nodes: LIFE_NODES, edges: LIFE_EDGES, hl: hl, ehl: eh || {} },
            { type: 'vars', label: 'Reference e', vals: { state: s, tracked: s === 'MANAGED' || s === 'REMOVED' ? 'yes' : 'no' }, hl: { state: bad ? 'bad' : 'cur' } }
          ] });
        }
        snap('<code>new Order()</code> is just a Java object: <b>transient</b>. Hibernate has never heard of it.');
        ops.forEach(function (op) {
          var from = s, err = null;
          if (op === 'persist') { if (s === 'DETACHED') err = 'detached entity passed to persist: it already has a row, use merge'; else s = 'MANAGED'; }
          else if (op === 'remove') { if (s === 'DETACHED') err = 'removing a detached instance (IllegalArgumentException): find or merge it first'; else if (s === 'MANAGED') s = 'REMOVED'; }
          else if (op === 'detach') { if (s === 'MANAGED' || s === 'REMOVED') s = 'DETACHED'; }
          else if (op === 'merge') { if (s === 'REMOVED') err = 'merge of a removed entity (IllegalArgumentException)'; }
          else if (op === 'commit') { if (s === 'MANAGED') s = 'DETACHED'; else if (s === 'REMOVED') s = 'TRANSIENT'; }
          else throw new Error('Unknown op "' + op + '". Use persist remove detach merge commit');
          if (err) { snap('<b>' + op + '</b> in state ' + from + ' → <span class="c-r">error: ' + err + '</span>. State is unchanged.', {}, true); return; }
          var why = {
            persist: from === 'MANAGED' ? 'already managed: persist is a no-op (it may still cascade).' : 'the <b>same object</b> joins the persistence context. INSERT waits in the action queue until flush.',
            remove: from === 'TRANSIENT' ? 'a transient object has no row: remove is ignored.' : (from === 'REMOVED' ? 'already scheduled for DELETE.' : 'scheduled for DELETE at flush; still in the context until then.'),
            detach: 'the context forgets it; later changes are not saved.',
            merge: from === 'DETACHED' || from === 'TRANSIENT' ? 'merge returns a <b>different, managed copy</b>. <i>This</i> reference e stays ' + s + '. Use the returned object!' : 'already managed: merge returns e itself.',
            commit: from === 'MANAGED' ? 'transaction-scoped context closes: e becomes <b>detached</b>.' : (from === 'REMOVED' ? 'the DELETE ran; e is now an ordinary object with no row (like transient).' : 'nothing tracked, nothing to do.')
          }[op];
          var eh = {}; if (from !== s) eh[from + '-' + s] = 'ok';
          snap('<b>' + op + '</b>: ' + from + ' → <b>' + s + '</b>. ' + why, eh);
        });
        snap('Final state: <b>' + s + '</b>. Try <code>persist detach persist</code> or <code>persist remove persist commit</code>.');
        return frames;
      }
    },
    examples: [
      { title: 'The lost update after merge', html: `<p>A REST controller receives a detached ${C('Customer')} from JSON and calls ${C('em.merge(c)')}, then ${C('c.setTier(GOLD)')}. The tier is never saved because <code>c</code> is still detached; only the <b>returned</b> instance is tracked. Fix: ${C('c = em.merge(c);')} before changing it, or better, load the entity by id and copy the allowed fields from a DTO.</p>` },
      { title: 'Why IDENTITY kills batch inserts', html: `<p>With ${C('GenerationType.IDENTITY')} the database creates the id during the INSERT, so Hibernate must run each INSERT <b>immediately</b> at persist time to learn the id. JDBC batching is turned off for that entity. Inserting 10,000 rows = 10,000 round trips. With ${C('SEQUENCE')} and ${C('allocationSize = 50')}, Hibernate asks the sequence once per 50 ids and can send INSERTs in batches of ${C('hibernate.jdbc.batch_size')} (say 50): about 200 sequence calls + 200 batches.</p>` },
      { title: 'equals/hashCode in a HashSet', html: `<p>If hashCode uses the generated id, a new entity put into a ${C('HashSet')} has hash of <code>null</code>; after persist and flush the id becomes 42 and the hash changes, so ${C('set.contains(e)')} returns ${H.c('r', 'false')} for the very object inside it. Safe patterns: use a natural business key (ISBN, email) that never changes, or compare by id only when it is non-null and return a <b>constant</b> hashCode (for example ${C('Book.class.hashCode()')}; avoid getClass() because a proxy is a subclass).</p>` },
      { title: 'Owning side decides what is written', html: `<p>${C('order.getLines().add(line)')} without ${C('line.setOrder(order)')} writes <b>nothing</b> to <code>order_line.order_id</code>, because the collection is the inverse side (${C('mappedBy')}). Hibernate only reads the owning ${C('@ManyToOne')} field when building SQL. Always use helper methods that set both sides.</p>` }
    ],
    deepDive: `<p><b>What persist really does.</b> Hibernate fires a PersistEvent, generates the id (sequence: from the in-memory pool; IDENTITY: by running the INSERT now), copies the entity's state into a <b>loaded-state snapshot</b> array, registers an ${C('EntityEntry')} with status MANAGED in the persistence context, and adds an ${C('EntityInsertAction')} to the ${C('ActionQueue')}. Cascades (${C('CascadeType.PERSIST/ALL')}) walk the associations in the same pass.</p>
<p><b>merge internals.</b> merge looks up the id in the persistence context; if absent it runs a SELECT (or treats the object as new if the id is null or the version says unsaved). It then copies every property onto the managed instance. That SELECT is why Spring Data's ${C('save()')} on an entity with an assigned id (not generated) runs SELECT + INSERT: ${C('isNew()')} returns false because the id is set, so it calls merge. Fix: implement ${C('Persistable<ID>')} or use a ${C('@Version')} field (a null version means new).</p>
<p><b>Hibernate 6 notes.</b> Packages moved from ${C('javax.persistence')} to ${C('jakarta.persistence')}. The default id generator for ${C('@GeneratedValue')} with AUTO is SEQUENCE when the database supports it. ${C('@ManyToOne')} and ${C('@OneToOne')} still default to EAGER per the spec; always set ${C('fetch = LAZY')}. Lazy loading uses <b>bytecode-generated proxies</b> (ByteBuddy), so entity classes and their methods must not be final.</p>
<p><b>Production reality:</b> do not expose entities in REST responses (lazy proxies, cycles, accidental writes); map to DTOs. Keep ${C('hibernate.hbm2ddl.auto')} at ${C('validate')} or ${C('none')} in production and run Flyway/Liquibase migrations instead.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate entity classes in seconds, but they copy common mistakes: ${C('@Data')} from Lombok on entities (equals/hashCode over all fields, toString that triggers lazy loading), ${C('FetchType.EAGER')} everywhere, ${C('IDENTITY')} on PostgreSQL, bidirectional relations without sync helpers, and ${C('javax')} imports from old tutorials. Treat the output as a draft and review it against a checklist: ids and generators, owning side, fetch types, equals/hashCode, cascades and orphan removal. Ask the AI "<i>which state is this object in on each line?</i>" — it is a good way to make it reason about merge bugs. Hibernate's own logging (${C('org.hibernate.SQL')}) is still the ground truth; read the SQL, not the code.</p>`,
    problems: [{
      title: 'Track an Entity Through the Lifecycle',
      level: 'Easy', tags: ['jpa', 'lifecycle', 'state-machine'], companies: ['TCS', 'Infosys', 'Accenture'],
      statement: `<p>Model the JPA lifecycle of <b>one object reference</b> <code>e</code> with a transaction-scoped persistence context. It starts <b>TRANSIENT</b>. Apply each operation and return the state after it (or an error) as a ${C('String[]')}:</p>
<ul><li><code>persist</code>: TRANSIENT/REMOVED/MANAGED → MANAGED; DETACHED → error <code>detached entity passed to persist</code></li>
<li><code>remove</code>: MANAGED → REMOVED; TRANSIENT and REMOVED unchanged; DETACHED → error <code>removing a detached instance</code></li>
<li><code>detach</code>: MANAGED or REMOVED → DETACHED; otherwise unchanged</li>
<li><code>merge</code>: never changes <code>e</code> (the managed copy is a different object); REMOVED → error <code>merge of a removed entity</code></li>
<li><code>commit</code>: MANAGED → DETACHED, REMOVED → TRANSIENT, others unchanged</li></ul>
<p>An error is reported as <code>"error:" + message</code> and leaves the state unchanged.</p>`,
      constraints: `0 ≤ ops ≤ 1000; every op is one of the five words.`,
      example: `<p>${C('["persist","commit","merge","remove"]')} → ${H.c('g', '["MANAGED","DETACHED","DETACHED","error:removing a detached instance"]')}. After commit the context is closed, merge returns a copy (e stays detached), and removing a detached instance is illegal.</p>`,
      brute: { why: `<p>A chain of string comparisons with the state also kept as a string works, but every rule is spread over nested ifs, typos in state names compile fine, and it is easy to forget a case. An enum plus one switch keeps each rule in one place.</p>`, code: `
static String[] trackBrute(String[] ops) {
    String s = "TRANSIENT";
    String[] out = new String[ops.length];
    for (int i = 0; i < ops.length; i++) {
        String op = ops[i];
        if (op.equals("persist") && s.equals("DETACHED")) { out[i] = "error:detached entity passed to persist"; continue; }
        if (op.equals("persist")) s = "MANAGED";
        if (op.equals("remove") && s.equals("DETACHED")) { out[i] = "error:removing a detached instance"; continue; }
        if (op.equals("remove") && s.equals("MANAGED")) s = "REMOVED";
        if (op.equals("detach") && (s.equals("MANAGED") || s.equals("REMOVED"))) s = "DETACHED";
        if (op.equals("merge") && s.equals("REMOVED")) { out[i] = "error:merge of a removed entity"; continue; }
        if (op.equals("commit") && s.equals("MANAGED")) s = "DETACHED";
        else if (op.equals("commit") && s.equals("REMOVED")) s = "TRANSIENT";
        out[i] = s;
    }
    return out;
}` },
      mcq: { q: 'After <code>Order m = em.merge(detached);</code> which object will Hibernate save changes from?', options: ['detached', 'm', 'both', 'neither until you call persist(m)'], answer: 1, explain: 'merge copies the state onto a managed instance and returns it. The argument stays detached.' },
      hints: [`<p>Hint 1: there are only four states and five operations, so the whole problem is a small transition table.</p>`, `<p>Hint 2: use an ${C('enum State')} and a switch on the operation; compute an optional error message, then either record the error or the new state.</p>`, `<p>Hint 3: remember the two "do nothing" cases: merge never changes <code>e</code>, and remove on a transient object is ignored. An empty input returns an empty array.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'track', cases: [
        [[['persist', 'commit']], ['MANAGED', 'DETACHED']],
        [[['persist', 'remove', 'commit']], ['MANAGED', 'REMOVED', 'TRANSIENT']],
        [[['persist', 'detach', 'persist']], ['MANAGED', 'DETACHED', 'error:detached entity passed to persist']],
        [[['remove']], ['TRANSIENT']],
        [[['persist', 'remove', 'persist']], ['MANAGED', 'REMOVED', 'MANAGED']],
        [[['persist', 'commit', 'merge', 'remove']], ['MANAGED', 'DETACHED', 'DETACHED', 'error:removing a detached instance']],
        [[['persist', 'remove', 'merge']], ['MANAGED', 'REMOVED', 'error:merge of a removed entity']],
        [[[]], []],
        [[['merge', 'persist', 'detach', 'detach', 'commit']], ['TRANSIENT', 'MANAGED', 'DETACHED', 'DETACHED', 'DETACHED']]
      ] },
      solution: {
        approach: `<p>Keep the state in an enum. For each operation compute either a new state or an error message using a switch expression. Errors leave the state unchanged. This mirrors how Hibernate's event listeners check the ${C('EntityEntry')} status before acting.</p>`,
        code: `
public class Lifecycle {
    enum State { TRANSIENT, MANAGED, DETACHED, REMOVED }

    static String[] track(String[] ops) {
        State s = State.TRANSIENT;
        String[] out = new String[ops.length];
        for (int i = 0; i < ops.length; i++) {
            String err = null;
            switch (ops[i]) {
                case "persist" -> {
                    if (s == State.DETACHED) err = "detached entity passed to persist";
                    else s = State.MANAGED;                 // transient, removed or managed
                }
                case "remove" -> {
                    if (s == State.DETACHED) err = "removing a detached instance";
                    else if (s == State.MANAGED) s = State.REMOVED;
                }
                case "detach" -> {
                    if (s == State.MANAGED || s == State.REMOVED) s = State.DETACHED;
                }
                case "merge" -> {                           // returns a copy; e itself never changes
                    if (s == State.REMOVED) err = "merge of a removed entity";
                }
                case "commit" -> {                          // transaction-scoped context closes
                    if (s == State.MANAGED) s = State.DETACHED;
                    else if (s == State.REMOVED) s = State.TRANSIENT;
                }
                default -> err = "unknown operation " + ops[i];
            }
            out[i] = err == null ? s.name() : "error:" + err;
        }
        return out;
    }

    public static void main(String[] args) {
        System.out.println(String.join(",", track(new String[]{"persist", "commit", "merge", "remove"})));
    }
}`,
        dry: { head: ['op', 'state before', 'rule', 'output'], rows: [
          ['persist', 'TRANSIENT', 'joins the context', 'MANAGED'],
          ['commit', 'MANAGED', 'context closes', 'DETACHED'],
          ['merge', 'DETACHED', 'copy is managed, e is not', 'DETACHED'],
          ['remove', 'DETACHED', 'illegal on detached', 'error:removing a detached instance']
        ] },
        complexity: `<p>O(n) time for n operations, O(n) for the output array.</p>`,
        followUps: ['Add a "find" operation that returns a managed instance: is it the same object as e?', 'How does an extended persistence context (Spring Webflow, stateful beans) change the commit rule?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Persistence context, dirty checking and flush
     ====================================================================== */
  // JS twin of the guided solution, used by the visualizer.
  function pcRun(dbList, ops, onStep) {
    var db = {}, pc = {}, order = [], removed = [], out = [];
    dbList.forEach(function (r) { var kv = r.split('='); db[kv[0]] = kv[1]; });
    ops.forEach(function (line) {
      var p = line.split(' '), op = p[0], id = p[1], sql = [];
      if (op === 'find') {
        if (!pc[id]) { sql.push('SELECT ' + id); if (db[id] !== undefined) { pc[id] = { cur: db[id], snap: db[id], isNew: false, removed: false }; order.push(id); } }
      } else if (op === 'set') {
        if (pc[id] && !pc[id].removed) pc[id].cur = p[2]; else sql.push('error:' + id + ' is not managed');
      } else if (op === 'persist') {
        pc[id] = { cur: p[2], snap: p[2], isNew: true, removed: false }; order.push(id);
      } else if (op === 'remove') {
        if (pc[id] && !pc[id].removed && !pc[id].isNew) { pc[id].removed = true; removed.push(id); } else sql.push('error:' + id + ' is not managed');
      } else if (op === 'flush') {
        order.forEach(function (k) { if (pc[k] && pc[k].isNew) { sql.push('INSERT ' + k + ' ' + pc[k].snap); db[k] = pc[k].snap; } });
        order.forEach(function (k) { var e = pc[k]; if (e && !e.removed && e.cur !== e.snap) { sql.push('UPDATE ' + k + ' ' + e.cur); db[k] = e.cur; } });
        removed.forEach(function (k) { sql.push('DELETE ' + k); delete db[k]; delete pc[k]; });
        order = order.filter(function (k) { return pc[k]; });
        order.forEach(function (k) { pc[k].snap = pc[k].cur; pc[k].isNew = false; });
        removed = [];
      } else if (op === 'clear') { pc = {}; order = []; removed = []; }
      else throw new Error('Unknown op "' + op + '". Use find/set/persist/remove/flush/clear');
      out = out.concat(sql);
      if (onStep) onStep(line, sql, pc, order, db);
    });
    return out;
  }

  topics.push({
    title: 'The Persistence Context: Identity Map, Snapshots and Dirty Checking',
    analogy: `<p>A persistence context is like a <b>shop assistant's clipboard</b> during one customer visit. The first time you ask about an item, the assistant walks to the store room (a SELECT) and writes the item on the clipboard, together with a <b>photo of how it looked</b>. Ask again and they just read the clipboard (no walk). If you scribble on an item, nothing happens yet. At checkout (flush) the assistant compares each item with its photo and only sends the store room the ones that changed (UPDATE), plus new items (INSERT) and returns (DELETE). Throw the clipboard away (clear) and all unsent scribbles are lost.</p>`,
    explain: `<p><b>Plain idea:</b> every ${C('EntityManager')} owns a <b>persistence context</b> (PC), a map from <code>(entity type, id)</code> to exactly one Java object. It is also called the <b>first-level cache</b>. It gives three guarantees:</p>
<ul><li><b>Identity:</b> ${C('em.find(Order.class, 1) == em.find(Order.class, 1)')} is true inside one PC. The second call runs no SQL.</li>
<li><b>Automatic dirty checking:</b> when an entity is loaded, Hibernate stores a <b>snapshot</b> (a copy of its column values). At flush it compares current values with the snapshot and writes an UPDATE only for changed entities. There is no ${C('update()')} method in JPA, and you never need ${C('save()')} for a managed entity.</li>
<li><b>Write-behind:</b> SQL is delayed until <b>flush</b>, which lets Hibernate batch statements and skip writes that cancel out.</li></ul>
<h4>When does flush happen?</h4>
${H.table(['Trigger', 'FlushModeType.AUTO (default)', 'COMMIT'], [
  ['transaction commit', H.c('g', 'yes'), H.c('g', 'yes')],
  ['JPQL/HQL query on a table with pending changes', H.c('g', 'yes (so the query sees your changes)'), 'no'],
  ['native SQL query', 'Hibernate 6 native API: yes for JPA-compliant mode; safest to flush manually', 'no'],
  [C('em.flush()'), 'yes', 'yes']
])}
<h4>Flush order (Hibernate's ActionQueue)</h4>
<p>Not the order you wrote the code in: ${H.c('b', 'orphan removals → INSERTs → UPDATEs → collection changes → DELETEs')}. So "delete user with email x, then insert a new user with email x" fails on a unique constraint, because the INSERT runs first. Call ${C('em.flush()')} after the delete.</p>`,
    clues: ['"I never called save() but the row was updated"', '"Why does find() twice only run one query?"', '"Unique constraint violation even though I deleted the old row first" → flush order', '"OutOfMemoryError while importing 1M rows with JPA" → flush and clear in batches', '"What does readOnly = true on @Transactional actually do?"', '"When does Hibernate send the SQL?"'],
    code: [{ lang: 'java', check: false, title: 'Dirty checking and flush in a Spring service', code: `@Service
public class PriceService {
    @PersistenceContext EntityManager em;

    @Transactional
    public void raise(long id, BigDecimal pct) {
        Product p = em.find(Product.class, id);      // SELECT, snapshot stored
        Product same = em.find(Product.class, id);   // no SQL: identity map
        assert p == same;
        p.setPrice(p.getPrice().multiply(pct));      // just a Java field write
        // no save() call: at commit Hibernate compares p with its snapshot and issues UPDATE
    }

    @Transactional
    public void importAll(List<ProductDto> rows) {
        for (int i = 0; i < rows.size(); i++) {
            em.persist(Product.from(rows.get(i)));
            if (i % 50 == 49) {          // match hibernate.jdbc.batch_size
                em.flush();              // send the batched INSERTs
                em.clear();              // drop entities + snapshots: memory stays flat
            }
        }
    }

    @Transactional(readOnly = true)      // Spring sets FlushMode.MANUAL and read-only session:
    public List<Product> list() {        // no snapshots kept, no dirty checking at the end
        return em.createQuery("select p from Product p", Product.class).getResultList();
    }
}` }],
    codeTitle: 'find twice, dirty checking, batch import with flush/clear, read-only transactions',
    viz: {
      title: 'Persistence context: snapshots vs current values, SQL at flush',
      input: 'find 1 | find 1 | set 1 Ann | find 2 | remove 2 | persist 3 Carl | set 3 Cara | flush',
      inputLabel: 'DB starts with 1=Alice 2=Bob. Ops separated by | : find id, set id value, persist id value, remove id, flush, clear',
      gen: function (input) {
        var ops = String(input).split('|').map(function (s) { return s.trim().replace(/\s+/g, ' '); }).filter(function (s) { return s; }).slice(0, 14);
        if (!ops.length) throw new Error('Type ops like: find 1 | set 1 Ann | flush');
        var frames = [], sqlAll = [];
        function snap(narr, pc, order, db, hlKey) {
          var rows = order.filter(function (k) { return pc[k]; }).map(function (k) { var e = pc[k]; return [k, e.snap, e.cur, e.isNew ? 'NEW (insert pending)' : e.removed ? 'REMOVED' : (e.cur !== e.snap ? 'DIRTY' : 'clean')]; });
          var hl = {}; rows.forEach(function (r, i) { if (r[0] === hlKey) hl[i] = 'cur'; });
          frames.push({ narr: narr, parts: [
            { type: 'table', label: 'Persistence context (identity map)', columns: ['id', 'snapshot', 'current', 'status'], rows: rows, hl: hl },
            { type: 'map', label: 'Database rows', entries: Object.keys(db).map(function (k) { return [k, db[k]]; }), hl: {} },
            { type: 'queue', label: 'SQL sent so far', items: sqlAll.slice(), hl: {} }
          ] });
        }
        snap('Empty context. The database holds 1=Alice and 2=Bob.', {}, [], { 1: 'Alice', 2: 'Bob' });
        pcRun(['1=Alice', '2=Bob'], ops, function (line, sql, pc, order, db) {
          sqlAll = sqlAll.concat(sql);
          var op = line.split(' ')[0], id = line.split(' ')[1], why;
          if (op === 'find') why = sql.length ? 'not in the context → <b>SELECT</b>, store a snapshot copy.' : 'already in the context → <span class="c-g">no SQL</span>, same Java object returned.';
          else if (op === 'set') why = sql.length ? '<span class="c-r">not managed</span>: changes would be ignored.' : 'only a field write. Nothing is sent yet; the row is marked DIRTY because current ≠ snapshot.';
          else if (op === 'persist') why = 'new entity joins the context; INSERT waits in the action queue.';
          else if (op === 'remove') why = sql.length ? '<span class="c-r">not managed</span>.' : 'scheduled for DELETE at flush.';
          else if (op === 'flush') why = sql.length ? 'compare every entity with its snapshot. Order: INSERTs, then UPDATEs, then DELETEs: ' + sql.join(', ') + '. Snapshots now equal current values.' : 'nothing changed since the last flush: no SQL.';
          else why = 'context discarded: unflushed changes are <span class="c-r">lost</span>.';
          snap('<b>' + line + '</b>: ' + why, pc, order, db, id);
        });
        frames[frames.length - 1].narr += ' <i>Try: find 1 | set 1 Zed | set 1 Alice | flush (no UPDATE), or persist 3 C | set 3 D | flush (INSERT then UPDATE).</i>';
        return frames;
      }
    },
    examples: [
      { title: 'Change it back: no UPDATE', html: `<p>Load product 7 with price 100. Set the price to 120, then back to 100. At flush, current (100) equals the snapshot (100), so ${H.c('g', 'no UPDATE')} is sent. Dirty checking compares values, not "was a setter called".</p>` },
      { title: 'The delete-then-insert unique key trap', html: `<p>${C('em.remove(oldUser); em.persist(new User("a@x.com"));')} with a unique email. The ActionQueue runs INSERT before DELETE, so the database sees two rows with the same email for a moment and throws ${H.c('r', 'ConstraintViolationException')}. Fix: ${C('em.flush()')} between the two calls, or update the existing row instead.</p>` },
      { title: 'Memory blow-up in a batch job', html: `<p>Importing 1,000,000 rows in one transaction keeps 1,000,000 entities <b>and</b> 1,000,000 snapshots in the context, and every flush re-checks all of them (O(n) per flush, O(n²) overall if AUTO flush fires on queries). Flush and ${C('clear()')} every 50 rows, or use a ${C('StatelessSession')} (no context, no dirty checking, no cascades).</p>` },
      { title: 'AUTO flush before a query', html: `<p>You persist a new Order, then run ${C('select count(o) from Order o')} in the same transaction. Hibernate flushes the INSERT first, so the count includes the new order. With ${C('FlushModeType.COMMIT')} the count would miss it. That AUTO flush is also why a query inside a loop can be surprisingly slow: each one triggers a dirty check of the whole context.</p>` }
    ],
    deepDive: `<p><b>How dirty checking is implemented.</b> On load, Hibernate keeps an ${C('Object[] loadedState')} inside the ${C('EntityEntry')}. At flush the ${C('DefaultFlushEntityEventListener')} reads the current property values and asks each property's type ${C('isDirty(old, new)')}. Cost is O(entities × properties) per flush. With <b>bytecode enhancement</b> (${C('hibernate-enhance-maven-plugin')}, ${C('enableDirtyTracking')}), setters record changed attribute names, so flush skips the full comparison.</p>
<p><b>${C('@DynamicUpdate')}.</b> By default the UPDATE sets <i>all</i> columns (one cached statement per entity, good for JDBC batching). ${C('@DynamicUpdate')} writes only changed columns: smaller statements, fewer index updates, and fewer lost-update conflicts on different columns, at the cost of statement caching.</p>
<p><b>Mutable types trap.</b> A ${C('java.util.Date')} or a JSON column mapped to a mutable object is compared with ${C('equals')}; if you mutate it in place, Hibernate compares it with a deep copy kept in the snapshot. Custom types must implement proper ${C('deepCopy')} or changes are silently lost.</p>
<p><b>Read-only optimizations.</b> ${C('@Transactional(readOnly = true)')} in Spring 5.1+ sets the Hibernate session to read-only (no snapshots stored, less memory) and flush mode MANUAL; Spring can also route to a replica. Per query: ${C('setHint("org.hibernate.readOnly", true)')}.</p>
<p><b>Open Session in View</b> (Spring Boot's ${C('spring.jpa.open-in-view=true')} default, with a warning) keeps the context open during view rendering, hiding lazy-loading problems and holding a connection longer. Most teams turn it off.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated service code often calls ${C('repository.save(entity)')} after modifying a managed entity. It works, but it shows the author does not know dirty checking, and with assigned ids it causes an extra merge SELECT. Ask your assistant to explain "what SQL runs at commit for this method" and compare with the real log (${C('spring.jpa.show-sql')} is not enough: use ${C('logging.level.org.hibernate.SQL=debug')} plus ${C('org.hibernate.orm.jdbc.bind=trace')} in Hibernate 6). AI is also good at writing the boring flush/clear batching loop, but you must choose the batch size to match ${C('hibernate.jdbc.batch_size')} and enable ${C('order_inserts')}/${C('order_updates')} yourself.</p>`,
    problems: [{
      title: 'Build a Mini Persistence Context with Dirty Checking',
      level: 'Medium', tags: ['persistence-context', 'dirty-checking', 'flush', 'simulation'], companies: ['Amazon', 'Atlassian', 'Walmart'],
      statement: `<p>Simulate one persistence context. ${C('db')} holds rows as <code>"id=value"</code>. Process ${C('ops')} and return every SQL statement (and error) in order:</p>
<ul><li><code>find id</code>: if the id is in the context, no SQL. Otherwise emit <code>SELECT id</code>; if the row exists, it becomes managed with snapshot = current = row value.</li>
<li><code>set id v</code>: change the current value of a managed (not removed) entity; otherwise emit <code>error:id is not managed</code>.</li>
<li><code>persist id v</code>: a new entity enters the context; its INSERT uses the value <b>at persist time</b>.</li>
<li><code>remove id</code>: a loaded (not new, not removed) managed entity is scheduled for delete; otherwise the same error.</li>
<li><code>flush</code>: emit <code>INSERT id v</code> for new entities, then <code>UPDATE id v</code> for every non-removed entity whose current value differs from its snapshot (including just-inserted ones changed after persist), then <code>DELETE id</code> in remove order. Within INSERT and UPDATE groups use the order in which entities entered the context. Afterwards the database reflects the changes, snapshots equal current values and deleted entities leave the context.</li>
<li><code>clear</code>: forget the whole context (unflushed changes are lost).</li></ul>`,
      constraints: `0 ≤ ops ≤ 10<sup>4</sup>; ids are positive integers; values contain no spaces; a persisted id is never already in the database or the context.`,
      example: `<p>db = ["1=Alice","2=Bob"], ops = ["find 2","remove 2","persist 3 Carl","find 1","set 1 Al","flush"] → ${H.c('g', '["SELECT 2","SELECT 1","INSERT 3 Carl","UPDATE 1 Al","DELETE 2"]')}. The DELETE was requested first but runs last: INSERTs, then UPDATEs, then DELETEs.</p>`,
      brute: { why: `<p>Writing SQL immediately for every operation ("UPDATE on every set") is what a naive active-record layer does: it sends redundant UPDATEs (set twice → two statements), cannot detect "changed back" and ignores the identity map (find twice → two SELECTs).</p>`, code: `
static List<String> eagerWrites(String[] ops) {
    List<String> sql = new ArrayList<>();
    for (String op : ops) {
        String[] p = op.split(" ");
        if (p[0].equals("find")) sql.add("SELECT " + p[1]);                 // no identity map
        else if (p[0].equals("set")) sql.add("UPDATE " + p[1] + " " + p[2]); // no dirty check
        else if (p[0].equals("persist")) sql.add("INSERT " + p[1] + " " + p[2]);
        else if (p[0].equals("remove")) sql.add("DELETE " + p[1]);
    }
    return sql;
}` },
      mcq: { q: 'Load a row, set name "B", then set it back to the original "A", then commit. How many UPDATEs?', options: ['0', '1', '2', 'Depends on @DynamicUpdate'], answer: 0, explain: 'Dirty checking compares the current state with the snapshot at flush; they are equal, so no UPDATE is sent.' },
      hints: [`<p>Hint 1: each managed entity needs two values (snapshot and current) plus flags for "new" and "removed". A ${C('LinkedHashMap<String, Entry>')} keeps the order entities entered the context.</p>`, `<p>Hint 2: flush is three passes over the map: new entities → INSERT with the snapshot value; non-removed with current ≠ snapshot → UPDATE; the remove list → DELETE. Then reset snapshots.</p>`, `<p>Hint 3: a persisted entity changed before flush gives INSERT (old value) then UPDATE (new value). Find on a missing row still costs a SELECT but adds nothing. Clear empties both the map and the remove list.</p>`],
      tests: { sig: 'string[] string[] -> string[]', fn: 'run', cases: [
        [[['1=Alice', '2=Bob'], ['find 1', 'find 1', 'set 1 Ann', 'flush']], ['SELECT 1', 'UPDATE 1 Ann']],
        [[['1=Alice', '2=Bob'], ['find 1', 'set 1 Zed', 'set 1 Alice', 'flush']], ['SELECT 1']],
        [[['1=Alice', '2=Bob'], ['find 2', 'remove 2', 'persist 3 Carl', 'find 1', 'set 1 Al', 'flush']], ['SELECT 2', 'SELECT 1', 'INSERT 3 Carl', 'UPDATE 1 Al', 'DELETE 2']],
        [[['1=Alice'], ['persist 5 Eve', 'set 5 Eva', 'flush']], ['INSERT 5 Eve', 'UPDATE 5 Eva']],
        [[['1=Alice'], ['find 1', 'set 1 X', 'clear', 'find 1', 'flush']], ['SELECT 1', 'SELECT 1']],
        [[['1=Alice', '2=Bob'], ['set 2 Q', 'remove 1']], ['error:2 is not managed', 'error:1 is not managed']],
        [[['1=Alice'], ['find 9', 'set 9 Z', 'flush']], ['SELECT 9', 'error:9 is not managed']],
        [[['1=Alice'], ['find 1', 'set 1 B', 'flush', 'flush']], ['SELECT 1', 'UPDATE 1 B']],
        [[['1=Alice', '2=Bob'], ['find 2', 'remove 2', 'find 2', 'flush', 'find 2']], ['SELECT 2', 'DELETE 2', 'SELECT 2']],
        [[[], []], []],
        [[['1=A', '2=B'], ['find 2', 'find 1', 'set 1 X', 'set 2 Y', 'persist 4 D', 'flush', 'clear', 'find 4', 'find 1']], ['SELECT 2', 'SELECT 1', 'INSERT 4 D', 'UPDATE 2 Y', 'UPDATE 1 X', 'SELECT 4', 'SELECT 1']]
      ] },
      solution: {
        approach: `<p>Keep a ${C('LinkedHashMap')} from id to an entry {snapshot, current, isNew, removed} and a list of removed ids. Operations only change memory. Flush walks the map three times in the ActionQueue order (inserts, updates, deletes), writes to the fake database, then resets snapshots and drops deleted entries. This is exactly Hibernate's identity map + loaded-state snapshot + write-behind design, minus the reflection.</p>`,
        code: `
public class MiniPersistenceContext {
    static final class Entry {
        String snapshot, current;
        boolean isNew, removed;
        Entry(String v, boolean isNew) { snapshot = v; current = v; this.isNew = isNew; }
    }

    static String[] run(String[] dbRows, String[] ops) {
        Map<String, String> db = new HashMap<>();
        for (String r : dbRows) { String[] kv = r.split("="); db.put(kv[0], kv[1]); }
        Map<String, Entry> pc = new LinkedHashMap<>();   // identity map, keeps entry order
        List<String> removeOrder = new ArrayList<>();
        List<String> sql = new ArrayList<>();
        for (String line : ops) {
            String[] p = line.split(" ");
            String id = p.length > 1 ? p[1] : null;
            Entry e = id == null ? null : pc.get(id);
            switch (p[0]) {
                case "find" -> {
                    if (e == null) {                                   // first-level cache miss
                        sql.add("SELECT " + id);
                        if (db.containsKey(id)) pc.put(id, new Entry(db.get(id), false));
                    }
                }
                case "set" -> {
                    if (e != null && !e.removed) e.current = p[2];     // just memory: no SQL
                    else sql.add("error:" + id + " is not managed");
                }
                case "persist" -> pc.put(id, new Entry(p[2], true));
                case "remove" -> {
                    if (e != null && !e.removed && !e.isNew) { e.removed = true; removeOrder.add(id); }
                    else sql.add("error:" + id + " is not managed");
                }
                case "flush" -> {
                    for (Map.Entry<String, Entry> me : pc.entrySet())  // 1. INSERTs (value at persist time)
                        if (me.getValue().isNew) {
                            sql.add("INSERT " + me.getKey() + " " + me.getValue().snapshot);
                            db.put(me.getKey(), me.getValue().snapshot);
                        }
                    for (Map.Entry<String, Entry> me : pc.entrySet()) { // 2. UPDATEs via dirty checking
                        Entry x = me.getValue();
                        if (!x.removed && !x.current.equals(x.snapshot)) {
                            sql.add("UPDATE " + me.getKey() + " " + x.current);
                            db.put(me.getKey(), x.current);
                        }
                    }
                    for (String rid : removeOrder) {                   // 3. DELETEs last
                        sql.add("DELETE " + rid);
                        db.remove(rid);
                        pc.remove(rid);
                    }
                    removeOrder.clear();
                    for (Entry x : pc.values()) { x.snapshot = x.current; x.isNew = false; }
                }
                case "clear" -> { pc.clear(); removeOrder.clear(); }
                default -> sql.add("error:unknown op " + p[0]);
            }
        }
        return sql.toArray(new String[0]);
    }

    public static void main(String[] args) {
        String[] out = run(new String[]{"1=Alice", "2=Bob"},
            new String[]{"find 2", "remove 2", "persist 3 Carl", "find 1", "set 1 Al", "flush"});
        System.out.println(String.join(" | ", out));
    }
}`,
        dry: { head: ['op', 'context after', 'SQL emitted'], rows: [
          ['find 2', '2: Bob/Bob', 'SELECT 2'],
          ['remove 2', '2: REMOVED', '-'],
          ['persist 3 Carl', '3: NEW Carl', '-'],
          ['find 1 / set 1 Al', '1: snap Alice, cur Al (dirty)', 'SELECT 1'],
          ['flush', '1: Al/Al, 3: Carl/Carl', 'INSERT 3 Carl, UPDATE 1 Al, DELETE 2']
        ] },
        complexity: `<p>Each op is O(1) except flush, which is O(size of the context): the same O(entities) cost that makes huge contexts slow in real Hibernate.</p>`,
        followUps: ['Add per-column snapshots and emit only changed columns (@DynamicUpdate)', 'What changes if flush mode is COMMIT and a query runs in the middle?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Lazy loading, proxies and the N+1 cures
     ====================================================================== */
  function nPlusOne(n, strategy, batch) {
    if (strategy === 'lazy' || strategy === 'eager') return 1 + n;
    if (strategy === 'fetchjoin' || strategy === 'entitygraph') return 1;
    if (strategy === 'batch') return 1 + Math.ceil(n / Math.max(1, batch));
    if (strategy === 'subselect') return n === 0 ? 1 : 2;
    throw new Error('unknown strategy');
  }

  topics.push({
    title: 'Lazy Loading, Proxies and the N+1 Cures: Fetch Joins, Entity Graphs, Batch Fetching',
    analogy: `<p>You order a box of 50 books online. <b>Lazy</b> loading is the shop sending the box with 50 <b>IOUs</b> (proxies); each time you open an IOU, a courier drives out with that one book: 50 trips (N+1). A <b>fetch join</b> is asking for everything in one big box (one trip, but the box may be huge and duplicated if you also ask for other items). <b>Batch fetching</b> is the courier bringing 10 books per trip when you open the first IOU: 5 trips. <b>Subselect</b> fetching is "bring me every book for every IOU in this order" on the first open: 1 extra trip.</p>`,
    explain: `<p><b>Plain idea:</b> associations are loaded either now (<b>EAGER</b>) or on first access (<b>LAZY</b>). Lazy single-valued associations (${C('@ManyToOne(fetch = LAZY)')}) become a <b>proxy</b>: a generated subclass holding only the id. Lazy collections become a ${C('PersistentBag')}/${C('PersistentSet')} wrapper. Touching them runs a SELECT, which needs an open persistence context; after it closes you get ${C('LazyInitializationException')}.</p>
<p>You already know the N+1 shape from backend data access (1 query for the parents, then 1 per parent). Here are the tools Hibernate gives you and what each one costs:</p>
${H.table(['Strategy', 'How to ask for it', 'Queries for 100 authors', 'Watch out for'], [
  ['Lazy, touched in a loop', 'default for collections', H.c('r', '101'), 'the classic N+1'],
  ['EAGER mapping', C('@OneToMany(fetch = EAGER)'), H.c('r', '101 with JPQL'), 'JPQL ignores the mapping\'s join; loads it everywhere, even when not needed'],
  ['Fetch join', C('select a from Author a join fetch a.books'), H.c('g', '1'), 'row duplication; only one bag (List) per query; no SQL paging with collections'],
  ['Entity graph', C('@EntityGraph(attributePaths = "books")'), H.c('g', '1'), 'same SQL as a fetch join, but declared per use case'],
  ['Batch fetching', C('@BatchSize(size = 25)') + ' or ' + C('hibernate.default_batch_fetch_size'), H.c('y', '1 + ⌈100/25⌉ = 5'), 'still lazy, works with paging, great default'],
  ['Subselect', C('@Fetch(FetchMode.SUBSELECT)'), H.c('y', '2'), 're-runs the original query as a subquery']
])}
<p>Rule of thumb used by Hibernate experts: map everything <b>LAZY</b>, set a global ${C('default_batch_fetch_size')} (16–100) as a safety net, and fetch exactly what each use case needs with a fetch join, entity graph or DTO projection.</p>`,
    clues: ['"The page lists 50 orders and the log shows 51 queries"', '"MultipleBagFetchException: cannot simultaneously fetch multiple bags"', '"firstResult/maxResults specified with collection fetch; applying in memory" (HHH90003004)', '"LazyInitializationException: could not initialize proxy - no Session"', '"Should @ManyToOne be EAGER?" → no, LAZY plus fetch where needed', '"Fetch a page of parents with their children efficiently"'],
    code: [{ lang: 'java', check: false, title: 'Every N+1 cure side by side (Hibernate 6 / Spring Data JPA)', code: `public interface AuthorRepository extends JpaRepository<Author, Long> {

    // 1 query: JOIN FETCH. Hibernate 6 removes duplicate parents automatically (no DISTINCT needed)
    @Query("select a from Author a join fetch a.books where a.country = :c")
    List<Author> findWithBooks(@Param("c") String country);

    // 1 query, declared per use case; type LOAD keeps other attributes at their mapped fetch type
    @EntityGraph(attributePaths = {"books", "books.publisher"}, type = EntityGraph.EntityGraphType.LOAD)
    List<Author> findByCountry(String country);

    // Paging + collection: page the ids first, then fetch the graph for just those ids (2 queries)
    @Query("select a.id from Author a order by a.name")
    Page<Long> pageIds(Pageable p);

    @Query("select a from Author a join fetch a.books where a.id in :ids order by a.name")
    List<Author> fetchByIds(@Param("ids") List<Long> ids);
}

@Entity
class Author {
    @Id Long id;
    String name, country;

    @OneToMany(mappedBy = "author")
    @BatchSize(size = 25)                 // lazy, but initialised 25 collections per SELECT ... WHERE author_id IN (...)
    Set<Book> books = new HashSet<>();    // a Set (not a bag) allows fetching two collections, but beware the Cartesian product

    @OneToMany(mappedBy = "author")
    @Fetch(FetchMode.SUBSELECT)           // first access loads awards for ALL authors of the original query
    List<Award> awards = new ArrayList<>();
}` }],
    codeTitle: 'Fetch join, entity graph, two-step paging, @BatchSize and SUBSELECT',
    viz: {
      title: 'Count the SELECTs for each fetch strategy',
      input: '20 5',
      inputLabel: 'number of authors N and batch size (e.g. 20 5)',
      gen: function (input) {
        var m = String(input).match(/\d+/g);
        if (!m || m.length < 2) throw new Error('Format: authors batchSize, e.g. 20 5');
        var n = Math.min(+m[0], 200), b = Math.max(1, Math.min(+m[1], 200));
        var names = ['lazy', 'eager', 'batch', 'subselect', 'fetchjoin', 'entitygraph'];
        var why = {
          lazy: '1 query for authors, then each <code>author.getBooks().size()</code> initialises one collection: 1 + N.',
          eager: 'EAGER on the mapping does not help a JPQL query: Hibernate runs the query, then a secondary SELECT per author to honour EAGER. Still 1 + N, and now on every screen.',
          batch: 'touching the first uninitialised collection loads up to ' + b + ' of them with <code>where author_id in (?, ?, ...)</code> (Hibernate 6 can bind them as one array parameter): 1 + ⌈N/' + b + '⌉.',
          subselect: 'the first touch loads books for every author from the original query: <code>where author_id in (select id from author where ...)</code>. 2 queries total (1 if N = 0).',
          fetchjoin: 'one SQL join returns author+book rows; Hibernate de-duplicates the authors. 1 query, but N × books rows travel over the wire.',
          entitygraph: 'the graph tells Hibernate to add the same left join: 1 query, chosen per repository method.'
        };
        var vals = [], frames = [];
        frames.push({ narr: 'We load <b>' + n + '</b> authors and print how many books each has. Let us count queries per strategy (batch size ' + b + ').', parts: [{ type: 'bars', label: 'Queries', values: [0, 0, 0, 0, 0, 0], idxLabels: names, hl: {} }] });
        names.forEach(function (s, i) {
          vals[i] = nPlusOne(n, s, b);
          var bars = names.map(function (_, j) { return j <= i ? vals[j] : 0; });
          frames.push({ narr: '<b>' + s + '</b> → ' + vals[i] + ' queries. ' + why[s], parts: [
            { type: 'bars', label: 'Queries', values: bars, idxLabels: names, hl: one(i, vals[i] > 2 ? 'bad' : vals[i] === 1 ? 'ok' : 'cur') },
            { type: 'vars', label: 'Formula', vals: { strategy: s, N: n, batch: b, queries: vals[i] }, hl: { queries: 'cur' } }
          ] });
        });
        frames.push({ narr: 'Fewer queries is not automatically better: a fetch join over two collections multiplies rows (Cartesian product), and it cannot page in SQL. Batch fetching is the safe default; fetch joins and entity graphs are per-use-case tools.', parts: [{ type: 'bars', label: 'Queries', values: vals, idxLabels: names, hl: { 4: 'ok', 5: 'ok', 0: 'bad', 1: 'bad' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'MultipleBagFetchException', html: `<p>${C('select p from Post p join fetch p.comments join fetch p.tags')} where both are ${C('List')}s (bags) fails: Hibernate cannot tell duplicate rows from genuine duplicates in two unordered bags. Changing them to ${C('Set')} compiles but produces a <b>Cartesian product</b>: 10 comments × 10 tags = 100 rows per post. Better: fetch one collection per query (two queries in the same transaction; the persistence context stitches them together) or rely on batch fetching for the second.</p>` },
      { title: 'Paging with a collection fetch', html: `<p>${C('join fetch a.books')} with ${C('setMaxResults(20)')}: SQL LIMIT would cut rows, not authors, so Hibernate fetches <b>all</b> rows and pages in memory, logging HHH90003004. On a 1M-row table that is an outage. Set ${C('hibernate.query.fail_on_pagination_over_collection_fetch=true')} to make it fail fast, and use the two-step pattern: page ids, then fetch by ids.</p>` },
      { title: 'Proxy surprises', html: `<p>${C('em.getReference(Author.class, 7)')} returns a proxy without SQL; ${C('getId()')} does not initialise it, but ${C('getName()')} does. ${C('proxy.getClass()')} is a generated subclass, so ${C('getClass() != other.getClass()')} in equals breaks; use ${C('instanceof')} or ${C('Hibernate.getClass(obj)')}. Use ${C('Hibernate.isInitialized(x)')} in tests to assert what was fetched.</p>` },
      { title: 'Numbers: batch size choice', html: `<p>200 authors on a page: lazy = 201 queries; ${C('@BatchSize(25)')} = 1 + 8 = 9; batch 100 = 3. Larger batches mean longer IN lists and more distinct SQL plans; values like 16–64 are a common sweet spot. Hibernate 6 on PostgreSQL can send the ids as one array parameter (${C('= any(?)')}), so the statement text stays the same.</p>` }
    ],
    deepDive: `<p><b>Proxy mechanics.</b> Hibernate 6 uses ByteBuddy to generate a subclass whose methods call ${C('LazyInitializer.initialize()')}, which needs the owning ${C('Session')}. That is why entity classes and their getters must not be ${C('final')}. With bytecode enhancement (${C('enableLazyInitialization')}) Hibernate can make even ${C('@Basic')} fields and the inverse side of ${C('@OneToOne')} lazy, which otherwise is always eagerly loaded because Hibernate must know whether to put null or a proxy there.</p>
<p><b>Fetch graph vs load graph.</b> JPA defines ${C('jakarta.persistence.fetchgraph')} (attributes in the graph are eager, everything else is treated as lazy) and ${C('jakarta.persistence.loadgraph')} (graph attributes eager, others keep their mapped fetch type). Hibernate cannot make basic attributes lazy without enhancement, so in practice they mostly differ for associations.</p>
<p><b>Hibernate 6 changes.</b> HQL ${C('join fetch')} results are de-duplicated automatically, so ${C('distinct')} is no longer needed for that purpose (and is not passed to SQL just for de-duplication). The SQM query engine reads results by position rather than column alias, and batch fetching can use array parameters on databases that support them.</p>
<p><b>Detecting N+1 automatically.</b> In tests, count statements: Hibernate's ${C('Statistics.getPrepareStatementCount()')}, datasource-proxy, or libraries such as Hypersistence Utils / quickperf assert "this endpoint runs ≤ 3 queries". This turns a performance problem into a failing unit test.</p>`,
    aiEra: `<p><b>What AI changes:</b> asked to "fix the N+1", assistants often slap ${C('FetchType.EAGER')} on the mapping. That makes things worse globally and does not even fix JPQL queries. Better prompts: "<i>rewrite this repository method with an entity graph and show the SQL</i>" or "<i>add @BatchSize and explain how many queries 200 rows need</i>". Feed it the real SQL log of a request; LLMs are good at spotting the repeated statement shape. Then verify with a statement-count test in CI so the fix stays fixed.</p>`,
    problems: [{
      title: 'Count the Queries for Each Fetch Strategy',
      level: 'Easy', tags: ['n+1', 'fetching', 'batch-size'], companies: ['Flipkart', 'Swiggy', 'Booking.com'],
      statement: `<p>A JPQL query loads <code>n</code> authors, then the code touches every author's ${C('books')} collection. Return how many SQL statements run for the given <code>strategy</code>:</p>
<ul><li><code>lazy</code> and <code>eager</code> (EAGER mapping, secondary selects): 1 + n</li>
<li><code>fetchjoin</code> and <code>entitygraph</code>: 1</li>
<li><code>batch</code> with batch size <code>b</code>: 1 + ⌈n / b⌉</li>
<li><code>subselect</code>: 2, or 1 when n = 0 (no collection is ever touched)</li></ul>`,
      constraints: `0 ≤ n ≤ 10<sup>6</sup>; 1 ≤ b ≤ 1000 for <code>batch</code> (ignored otherwise).`,
      example: `<p>n = 10, batch 4 → 1 + ⌈10/4⌉ = ${H.c('g', '4')}: the authors query, then collections 1–4, 5–8 and 9–10.</p>`,
      brute: { why: `<p>Simulating the loop and counting each initialisation works but is O(n) per call and hides the formula you need in an interview ("how many queries for 1,000 rows with batch size 50?").</p>`, code: `
static int simulate(int n, String strategy, int b) {
    int q = 1;                                   // the authors query
    if (strategy.equals("fetchjoin") || strategy.equals("entitygraph")) return q;
    boolean subselectDone = false;
    int loadedUpTo = 0;                          // collections initialised so far (batch)
    for (int i = 0; i < n; i++) {
        if (strategy.equals("lazy") || strategy.equals("eager")) q++;
        else if (strategy.equals("subselect") && !subselectDone) { q++; subselectDone = true; }
        else if (strategy.equals("batch") && i >= loadedUpTo) { q++; loadedUpTo = i + b; }
    }
    return q;
}` },
      mcq: { q: '250 authors, <code>@BatchSize(size = 50)</code>, each author\'s books touched. How many queries?', options: ['2', '6', '51', '251'], answer: 1, explain: '1 for authors + ⌈250/50⌉ = 5 batch loads = 6.' },
      hints: [`<p>Hint 1: every strategy starts with the one query that loads the authors.</p>`, `<p>Hint 2: batch fetching is ceiling division: ${C('(n + b - 1) / b')} extra queries.</p>`, `<p>Hint 3: subselect only fires if at least one collection is touched, so n = 0 gives 1. Use a switch on the strategy string.</p>`],
      tests: { sig: 'int string int -> int', fn: 'queries', cases: [
        [[10, 'lazy', 0], 11], [[0, 'lazy', 0], 1], [[10, 'batch', 4], 4], [[8, 'batch', 4], 3], [[1, 'batch', 16], 2], [[0, 'batch', 16], 1],
        [[10, 'subselect', 0], 2], [[0, 'subselect', 0], 1], [[500, 'fetchjoin', 0], 1], [[100, 'eager', 0], 101], [[100, 'entitygraph', 0], 1],
        [[1000, 'batch', 1], 1001], [[1000000, 'batch', 1000], 1001]
      ] },
      solution: {
        approach: `<p>Closed-form per strategy. The interview value is in knowing each formula: N+1 for lazy and EAGER-via-JPQL, 1 for joins/graphs, 1 + ⌈n/b⌉ for batch fetching, 2 for subselect.</p>`,
        code: `
public class FetchMath {
    static int queries(int n, String strategy, int b) {
        return switch (strategy) {
            case "lazy", "eager" -> 1 + n;                 // one per collection initialisation
            case "fetchjoin", "entitygraph" -> 1;          // single joined SELECT
            case "batch" -> 1 + (n + b - 1) / b;           // ceil(n / b) IN-list loads
            case "subselect" -> n == 0 ? 1 : 2;            // one subquery-based load
            default -> throw new IllegalArgumentException(strategy);
        };
    }

    public static void main(String[] args) {
        System.out.println(queries(10, "batch", 4)); // 4
    }
}`,
        dry: { head: ['n', 'strategy', 'b', 'work', 'answer'], rows: [
          ['10', 'lazy', '-', '1 + 10', '11'],
          ['10', 'batch', '4', '1 + ⌈10/4⌉ = 1 + 3', '4'],
          ['0', 'subselect', '-', 'nothing touched', '1'],
          ['500', 'fetchjoin', '-', 'one joined query', '1']
        ] },
        complexity: `<p>O(1) time and space.</p>`,
        followUps: ['Add a second collection: what does a fetch join of two Sets cost in rows?', 'How many queries if only half the authors\' collections are touched with batch size b?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — First-level, second-level and query caches
     ====================================================================== */
  topics.push({
    title: 'First-Level, Second-Level and Query Caches',
    analogy: `<p>The <b>first-level cache</b> is the notepad on your own desk: private, thrown away when you go home (end of the session). The <b>second-level cache</b> is the shared whiteboard in the office corridor: every colleague (session) can read it, so it saves trips to the archive (database), but someone must wipe an entry when the archive changes or people copy stale numbers. The <b>query cache</b> is a sticky note saying "the answer to question X was items 3, 7 and 9"; it is only useful if the whiteboard also has items 3, 7 and 9, and it becomes useless the moment anyone touches the archive shelf it came from.</p>`,
    explain: `<p><b>Plain idea:</b> Hibernate has three caching layers with very different scopes.</p>
${H.table(['Cache', 'Scope', 'On by default?', 'What it stores', 'Invalidation'], [
  ['First-level (persistence context)', 'one EntityManager / transaction', H.c('g', 'always, cannot disable'), 'live entity objects', 'clear(), close(), detach()'],
  ['Second-level (L2)', 'the whole EntityManagerFactory (all sessions, one JVM or a cluster)', H.c('r', 'no'), 'dehydrated entity state (arrays of column values), not objects', 'Hibernate updates/evicts on writes it knows about; external writes are invisible'],
  ['Query cache', 'factory-wide', H.c('r', 'no'), 'query + parameters → list of ids (and scalar values)', 'any write to a table used by the query invalidates it (timestamps region)']
])}
<p>Lookup order for ${C('em.find(Product.class, 7)')}: ${H.c('b', 'L1 → L2 → database')}. A database hit fills both. JPQL queries always go to the database (unless the query cache is on); only <b>find by id</b>, lazy association loading by id and natural-id lookups use L2.</p>
<h4>Turning on L2 (JCache + e.g. Ehcache 3, Caffeine or Infinispan)</h4>
<p>Set ${C('hibernate.cache.use_second_level_cache=true')}, a region factory (${C('jcache')}), ${C('jakarta.persistence.sharedCache.mode=ENABLE_SELECTIVE')}, then mark entities ${C('@Cacheable')} and choose a concurrency strategy with ${C('@Cache(usage = ...)')}:</p>
${H.table(['Strategy', 'Use for', 'Guarantee'], [
  [C('READ_ONLY'), 'reference data that never changes (countries, currencies)', 'fastest; updating such an entity throws'],
  [C('NONSTRICT_READ_WRITE'), 'rarely updated, staleness acceptable', 'invalidates after commit; small stale window'],
  [C('READ_WRITE'), 'read-mostly data that is updated', 'soft locks during the write; strong enough for most apps'],
  [C('TRANSACTIONAL'), 'JTA + a transactional cache (Infinispan)', 'cache updates are part of the XA transaction']
])}`,
    clues: ['"Does Hibernate cache queries by default?" → no, only the first-level cache is on', '"We cache entities but the endpoint still hits the DB" → it runs JPQL, not find by id', '"Another service updates the table directly" → L2 goes stale', '"Reference data read on every request" → READ_ONLY L2 region', '"Cache works on one node but not across the cluster"', '"What is the difference between the first- and second-level cache?"'],
    code: [{ lang: 'java', check: false, title: 'Configuring the second-level and query caches', code: `// application.yml (Spring Boot 3, Hibernate 6, JCache with Ehcache 3)
// spring.jpa.properties.hibernate.cache.use_second_level_cache: true
// spring.jpa.properties.hibernate.cache.region.factory_class: jcache
// spring.jpa.properties.hibernate.cache.use_query_cache: true
// spring.jpa.properties.jakarta.persistence.sharedCache.mode: ENABLE_SELECTIVE
// spring.jpa.properties.hibernate.generate_statistics: true   // hit/miss counters

@Entity
@Cacheable
@org.hibernate.annotations.Cache(usage = CacheConcurrencyStrategy.READ_ONLY, region = "country")
public class Country {
    @Id String code;          // "IN", "US"
    String name;
}

@Entity
@Cacheable
@org.hibernate.annotations.Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
public class Product {
    @Id Long id;
    String name;
    @ManyToOne(fetch = FetchType.LAZY) Country origin;   // resolved by id: an L2 hit, no SQL

    @OneToMany(mappedBy = "product")
    @org.hibernate.annotations.Cache(usage = CacheConcurrencyStrategy.READ_WRITE) // collections are cached separately (ids only)
    Set<Review> reviews;
}

// Query cache: opt in per query. Stores only ids, so Product must be L2-cached too
List<Product> top = em.createQuery("select p from Product p where p.featured = true", Product.class)
        .setHint("org.hibernate.cacheable", true)
        .getResultList();

// Inspect effectiveness
Statistics st = emf.unwrap(SessionFactory.class).getStatistics();
System.out.println(st.getSecondLevelCacheHitCount() + " hits / " + st.getSecondLevelCacheMissCount() + " misses");` }],
    codeTitle: 'L2 configuration, concurrency strategies, collection cache and query cache',
    viz: {
      title: 'Where does each find() come from: L1, L2 or the database?',
      input: 'session find 1 find 1 session find 1 find 2 evict 1 session find 1 find 2',
      inputLabel: 'ops: session | find X | evict X | native (space separated, "find" and "evict" take an id)',
      gen: function (input) {
        var t = tokens(input, /\s+/, 'Type: session find 1 find 1 session find 1');
        var l1 = [], l2 = [], dbHits = 0, frames = [], sess = 0, log = [];
        function snap(narr, hl1, hl2) {
          frames.push({ narr: narr, parts: [
            { type: 'set', label: 'L1: session #' + sess + ' (private)', items: l1.slice(), hl: hl1 || {} },
            { type: 'set', label: 'L2: shared by all sessions', items: l2.slice(), hl: hl2 || {} },
            { type: 'vars', label: 'Counters', vals: { 'DB queries': dbHits, 'last results': log.slice(-6).join(' ') || '-' }, hl: {} }
          ] });
        }
        snap('Two caches start empty. L1 belongs to one session; L2 belongs to the EntityManagerFactory.');
        for (var i = 0; i < t.length && frames.length < 30; i++) {
          var op = t[i];
          if (op === 'session') { l1 = []; sess++; snap('New session #' + sess + ': L1 is empty again, L2 survives.'); }
          else if (op === 'native') { l2 = []; snap('A native/bulk UPDATE ran. Hibernate cannot tell which rows changed, so it <span class="c-r">evicts the whole region</span> (all regions if it cannot tell the tables).'); }
          else if (op === 'find' || op === 'evict') {
            var id = t[++i];
            if (id === undefined) throw new Error(op + ' needs an id');
            if (op === 'evict') { l2 = l2.filter(function (x) { return x !== id; }); snap('<code>emf.getCache().evict(Product.class, ' + id + ')</code>: removed from L2 only. L1 still has it if loaded in this session.'); continue; }
            if (sess === 0) sess = 1;
            if (l1.indexOf(id) >= 0) { log.push('L1'); snap('find ' + id + ': found in <b>L1</b>, the same Java object, no SQL, no copying.', one(id, 'ok')); }
            else if (l2.indexOf(id) >= 0) { l1.push(id); log.push('L2'); snap('find ' + id + ': L1 miss, <b>L2 hit</b>: Hibernate rebuilds a new object from the cached column values (assembling) and puts it into L1. No SQL.', one(id, 'cur'), one(id, 'ok')); }
            else { l1.push(id); l2.push(id); dbHits++; log.push('DB'); snap('find ' + id + ': miss in both → <span class="c-r">SELECT</span>. The row is stored in L2 (as values) and the object in L1.', one(id, 'cur'), one(id, 'cur')); }
          } else throw new Error('Unknown op "' + op + '"');
        }
        if (frames.length < 4) snap('Add more operations to see L2 hits across sessions.');
        return frames;
      }
    },
    examples: [
      { title: 'Why the L2 cache did not help', html: `<p>A product page calls ${C('productRepository.findBySku(sku)')}. That is a JPQL query, so it always hits the database even though Product is ${C('@Cacheable')}. Options: look up by id, use ${C('@NaturalId')} with ${C('session.bySimpleNaturalId(Product.class).load(sku)')} (natural-id cache), or enable the query cache for that query.</p>` },
      { title: 'Query cache gone wrong', html: `<p>A cached query ${C('from Order o where o.status = :s')} on a table with 200 writes per second: every write updates the table's timestamp, so the cached result is invalid almost immediately. The query cache now costs extra work (store, then discard) and lock contention on the timestamps region. Rule: the query cache only pays off for read-mostly tables.</p>` },
      { title: 'Stale data from another writer', html: `<p>A nightly ETL job updates prices with plain SQL. The Java app has Product in L2 with a 1-hour TTL, so customers see old prices for up to an hour. Fixes: short TTL, evict the region after the job (an admin endpoint calling ${C('emf.getCache().evict(Product.class)')}), or do not cache data that other systems write.</p>` },
      { title: 'L1 cache as a correctness tool', html: `<p>Inside one transaction you load customer 5 twice through different code paths (a service and a validator). Both get the <b>same object</b>, so a change made by one is visible to the other, and only one UPDATE is sent. This "repeatable read inside the application" is a guarantee, not just an optimisation.</p>` }
    ],
    deepDive: `<p><b>What L2 really stores.</b> Entries are disassembled state (${C('CacheEntry')}: arrays of primitive values and ids, plus version), keyed by entity name + id (+ tenant). On a hit Hibernate assembles a fresh object, so two sessions never share a mutable instance. Associations are stored as ids; a collection cache entry is a list of child ids, so the children should be cached too or you get N database loads after a "hit".</p>
<p><b>READ_WRITE soft locks.</b> When a transaction updates a cached entity, Hibernate puts a soft lock into the entry before the update. Readers that see the lock go to the database. After commit, the lock is replaced with the new value (if the lock timestamp still matches); on rollback the lock simply expires. This prevents a concurrent reader from re-caching old data during the write.</p>
<p><b>Clusters.</b> A local cache per node (Ehcache, Caffeine) is fine for READ_ONLY data but other nodes keep stale copies of updated entities. Use a replicated/invalidation cache (Infinispan, Hazelcast) or short TTLs. A Spring ${C('@Cacheable')} method cache (Redis) is a different layer: it caches whatever the method returns (often DTOs), with your own invalidation rules.</p>
<p><b>Measure before caching.</b> The database's own buffer pool already caches hot pages; a primary key lookup is often under 1 ms. L2 helps most for reference data and for resolving many ${C('@ManyToOne')} associations by id. Watch ${C('Statistics')}: a hit ratio below ~80% usually means the cache costs more than it saves.</p>`,
    aiEra: `<p><b>What AI changes:</b> "add caching" is a favourite AI suggestion, and it will happily annotate every entity with ${C('@Cacheable')} and turn on the query cache. Push back with questions an interviewer would ask: who else writes this table, how stale may it be, how big is the region, what is the hit ratio? Ask the assistant to produce a <b>cache plan table</b> (entity, write rate, strategy, TTL, invalidation path) instead of code. Then load-test with statistics enabled; data beats intuition, human or AI.</p>`,
    problems: [{
      title: 'Simulate L1 and L2 Lookups',
      level: 'Medium', tags: ['second-level-cache', 'first-level-cache', 'simulation'], companies: ['Oracle', 'Adobe', 'Expedia'],
      statement: `<p>Simulate Hibernate's two entity caches. Operations:</p>
<ul><li><code>session</code>: start a new session (L1 becomes empty). Operations before the first <code>session</code> belong to an implicit first session.</li>
<li><code>find X</code>: output <code>L1</code> if X is in L1; else <code>L2</code> if in L2 (and put X into L1); else <code>DB</code> (put X into both).</li>
<li><code>evict X</code>: remove X from L2 only.</li>
<li><code>native</code>: a native bulk update clears all of L2.</li></ul>
<p>Return one output per <code>find</code>, in order.</p>`,
      constraints: `0 ≤ ops ≤ 10<sup>5</sup>; ids are short strings without spaces. Each op is one array element, e.g. "find 7".`,
      example: `<p>["session","find 1","find 2","session","find 2","find 1","find 3"] → ${H.c('g', '["DB","DB","L2","L2","DB"]')}: the second session's L1 is empty, but L2 remembers 1 and 2.</p>`,
      brute: { why: `<p>Keeping a list of every past (session, id) load and scanning it on each find gives the right answer but costs O(history) per lookup. Two hash sets, one replaced on every new session, give O(1).</p>`, code: `
static List<String> brute(String[] ops) {
    List<String[]> history = new ArrayList<>();     // {session, id, inL2}
    List<String> out = new ArrayList<>();
    int session = 0;
    Set<String> l2Removed = new HashSet<>();
    for (String op : ops) {
        String[] p = op.split(" ");
        if (p[0].equals("session")) session++;
        else if (p[0].equals("evict")) l2Removed.add(p[1]);
        else if (p[0].equals("native")) for (String[] h : history) l2Removed.add(h[1]);
        else {
            boolean inL1 = false, everLoaded = false;
            for (String[] h : history) {
                if (h[1].equals(p[1]) && h[0].equals(String.valueOf(session))) inL1 = true;
                if (h[1].equals(p[1])) everLoaded = true;
            }
            String r = inL1 ? "L1" : (everLoaded && !l2Removed.contains(p[1])) ? "L2" : "DB";
            if (r.equals("DB")) l2Removed.remove(p[1]);
            out.add(r);
            history.add(new String[]{String.valueOf(session), p[1]});
        }
    }
    return out;
}` },
      mcq: { q: 'Product is @Cacheable (L2). A new session runs <code>select p from Product p where p.id = 5</code> (JPQL) right after another session loaded product 5. Where does the data come from?', options: ['L1', 'L2', 'The database', 'The query cache'], answer: 2, explain: 'JPQL queries go to the database unless the query cache is enabled for that query. L2 serves find by id and association resolution by id.' },
      hints: [`<p>Hint 1: model each cache as a ${C('HashSet<String>')}. L2 lives for the whole run; L1 is replaced on every <code>session</code>.</p>`, `<p>Hint 2: the lookup order is L1 → L2 → DB, and a miss fills every cache above where the data was found.</p>`, `<p>Hint 3: <code>evict</code> and <code>native</code> touch only L2, never L1: an entity already in this session's L1 is still served from L1.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'lookups', cases: [
        [[['session', 'find 1', 'find 1', 'session', 'find 1']], ['DB', 'L1', 'L2']],
        [[['session', 'find 1', 'find 2', 'session', 'find 2', 'find 1', 'find 3']], ['DB', 'DB', 'L2', 'L2', 'DB']],
        [[['session', 'find 1', 'evict 1', 'find 1', 'session', 'find 1']], ['DB', 'L1', 'DB']],
        [[['session', 'find 1', 'find 2', 'native', 'session', 'find 1', 'find 2']], ['DB', 'DB', 'DB', 'DB']],
        [[[]], []],
        [[['find 5', 'find 5']], ['DB', 'L1']],
        [[['session', 'find 1', 'session', 'find 1', 'session', 'find 1']], ['DB', 'L2', 'L2']],
        [[['session', 'find 1', 'session', 'evict 1', 'find 1', 'find 1']], ['DB', 'DB', 'L1']],
        [[['find a', 'native', 'find a', 'session', 'find a', 'session', 'find a']], ['DB', 'L1', 'DB', 'L2']]
      ] },
      solution: {
        approach: `<p>Two sets. A new session replaces L1. Find checks L1, then L2, then counts a database load and fills both. Evict and native only touch L2. This is the exact lookup chain of ${C('DefaultLoadEventListener')}: persistence context, then second-level cache, then the datasource.</p>`,
        code: `
public class CacheLayers {
    static String[] lookups(String[] ops) {
        Set<String> l1 = new HashSet<>();          // per session
        Set<String> l2 = new HashSet<>();          // per EntityManagerFactory
        List<String> out = new ArrayList<>();
        for (String op : ops) {
            String[] p = op.split(" ");
            switch (p[0]) {
                case "session" -> l1 = new HashSet<>();
                case "evict" -> l2.remove(p[1]);
                case "native" -> l2.clear();               // region invalidation
                case "find" -> {
                    String id = p[1];
                    if (l1.contains(id)) out.add("L1");
                    else if (l2.contains(id)) { l1.add(id); out.add("L2"); }
                    else { l1.add(id); l2.add(id); out.add("DB"); }
                }
                default -> throw new IllegalArgumentException(op);
            }
        }
        return out.toArray(new String[0]);
    }

    public static void main(String[] args) {
        System.out.println(String.join(",", lookups(new String[]{"session", "find 1", "find 1", "session", "find 1"})));
    }
}`,
        dry: { head: ['op', 'L1', 'L2', 'output'], rows: [
          ['session', '{}', '{}', '-'],
          ['find 1', '{1}', '{1}', 'DB'],
          ['find 1', '{1}', '{1}', 'L1'],
          ['session', '{}', '{1}', '-'],
          ['find 1', '{1}', '{1}', 'L2']
        ] },
        complexity: `<p>O(1) average per operation (O(size of L2) for <code>native</code> clear), O(distinct ids) space.</p>`,
        followUps: ['Add a capacity to L2 with LRU eviction (LinkedHashMap with accessOrder = true)', 'Add a query cache that stores id lists and is invalidated by any update to its table']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — @Transactional propagation and isolation
     ====================================================================== */
  function txOutcome(prop, innerThrows, outerCatches, selfCall, outerFailsAfter) {
    var joins = selfCall || prop === 'REQUIRED' || prop === 'SUPPORTS' || prop === 'MANDATORY';
    var never = !selfCall && prop === 'NEVER';
    var excFromInner = never || innerThrows;
    var uncaught = (excFromInner && !outerCatches) || outerFailsAfter;
    if (joins) {
      if (uncaught) return 'outer=ROLLBACK inner=ROLLBACK';
      if (!selfCall && innerThrows) return 'outer=ROLLBACK inner=ROLLBACK UnexpectedRollbackException';
      return 'outer=COMMIT inner=COMMIT';
    }
    var outer = uncaught ? 'ROLLBACK' : 'COMMIT';
    if (never) return 'outer=' + outer + ' inner=NONE';
    if (prop === 'REQUIRES_NEW') return 'outer=' + outer + ' inner=' + (innerThrows ? 'ROLLBACK' : 'COMMIT');
    if (prop === 'NESTED') return 'outer=' + outer + ' inner=' + (innerThrows ? 'ROLLBACK' : outer);
    throw new Error('Propagation must be REQUIRED, SUPPORTS, MANDATORY, REQUIRES_NEW, NESTED or NEVER');
  }

  topics.push({
    title: '@Transactional: Proxies, Propagation, Rollback Rules and Isolation',
    analogy: `<p>A transaction is a <b>shopping trip with one receipt</b>. ${C('REQUIRED')}: "join my trip if I am already shopping, else start one" — if anyone in the group drops a jar, the whole basket goes back. ${C('REQUIRES_NEW')}: "pause the group, go to a separate till, pay on your own receipt" — your purchase stays even if the group later abandons theirs. ${C('NESTED')}: "same receipt, but put a divider on the belt" (a savepoint) — you can take back just your part. And the Spring proxy is the <b>shop door</b>: the rules are only checked when you walk in through the door; calling a colleague who is already inside (self-invocation) skips the door entirely.</p>`,
    explain: `<p><b>Plain idea:</b> Spring wraps your bean in a <b>proxy</b>. When a caller invokes an ${C('@Transactional')} method <i>through the proxy</i>, the ${C('TransactionInterceptor')} asks the ${C('PlatformTransactionManager')} (${C('JpaTransactionManager')}) to begin, join or suspend a transaction, runs your method, then commits or rolls back.</p>
${H.table(['Propagation', 'Existing transaction', 'No transaction', 'Typical use'], [
  [C('REQUIRED') + ' (default)', 'join it', 'start one', 'normal service methods'],
  [C('REQUIRES_NEW'), 'suspend it, start an independent one (new connection)', 'start one', 'audit log that must survive a rollback'],
  [C('NESTED'), 'savepoint inside it (JDBC savepoints; JpaTransactionManager supports it only for JDBC-level savepoints, not Hibernate entity state)', 'start one', 'retry one step of a batch'],
  [C('SUPPORTS'), 'join', 'run without', 'read helpers'],
  [C('MANDATORY'), 'join', H.c('r', 'throw IllegalTransactionStateException'), 'methods that must be called inside a transaction'],
  [C('NOT_SUPPORTED'), 'suspend, run without', 'run without', 'slow non-transactional work'],
  [C('NEVER'), H.c('r', 'throw IllegalTransactionStateException'), 'run without', 'guard rails']
])}
<h4>Rollback rules (a classic trick question)</h4>
<p>By default Spring rolls back on ${C('RuntimeException')} and ${C('Error')} only. A checked exception (e.g. ${C('IOException')}) <b>commits</b> unless you write ${C('@Transactional(rollbackFor = Exception.class)')}. If an inner ${C('REQUIRED')} method throws and the outer method catches it, the shared transaction is already marked <b>rollback-only</b>, so the outer commit fails with ${C('UnexpectedRollbackException')}.</p>
<h4>Isolation</h4>
${H.table(['Level', 'Dirty read', 'Non-repeatable read', 'Phantom', 'Note'], [
  ['READ_UNCOMMITTED', 'possible', 'possible', 'possible', 'PostgreSQL treats it as READ COMMITTED'],
  ['READ_COMMITTED', 'no', 'possible', 'possible', 'PostgreSQL, Oracle, SQL Server default'],
  ['REPEATABLE_READ', 'no', 'no', 'possible by the standard (prevented in PostgreSQL snapshots and mostly by MySQL InnoDB gap locks)', 'MySQL InnoDB default'],
  ['SERIALIZABLE', 'no', 'no', 'no', 'may abort with serialization failures: retry']
])}
<p>${C('@Transactional(isolation = ...)')} sets it on the JDBC connection for that transaction. Lost updates are not prevented by READ COMMITTED; that is what ${C('@Version')} or row locks are for (next topic).</p>`,
    clues: ['"I annotated a private method / called it from the same class and no transaction started"', '"UnexpectedRollbackException: Transaction silently rolled back because it has been marked as rollback-only"', '"The audit row must be saved even if the business operation fails" → REQUIRES_NEW', '"A checked exception was thrown but the data was committed"', '"Which isolation level prevents non-repeatable reads?"', '"REQUIRES_NEW and the connection pool is exhausted" → each nested call holds a second connection'],
    code: [{ lang: 'java', check: false, title: 'Propagation in practice (Spring 6, Spring Boot 3)', code: `@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orders;
    private final AuditService audit;            // separate bean: calls go through ITS proxy

    @Transactional                              // REQUIRED
    public void placeOrder(OrderDto dto) {
        orders.save(Order.from(dto));
        audit.record("ORDER_PLACED", dto.id()); // REQUIRES_NEW: commits on its own connection
        if (dto.total().signum() <= 0) throw new IllegalArgumentException("bad total"); // order rolls back, audit row stays
        sendEmail(dto);                          // self-invocation: @Transactional on sendEmail is IGNORED
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendEmail(OrderDto dto) { /* runs in placeOrder's transaction, not a new one */ }

    @Transactional(rollbackFor = Exception.class, isolation = Isolation.REPEATABLE_READ, timeout = 5)
    public void importFile(Path p) throws IOException { /* checked exceptions now roll back too */ }
}

@Service
class AuditService {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String type, long id) { /* INSERT INTO audit ... committed immediately */ }
}` }],
    codeTitle: 'REQUIRES_NEW audit, self-invocation trap, rollbackFor and isolation',
    viz: {
      title: 'Outer REQUIRED method calls inner: who commits?',
      input: 'REQUIRED throw catch',
      inputLabel: 'propagation [throw] [catch] [self] [fail-after], e.g. REQUIRES_NEW throw catch',
      gen: function (input) {
        var t = tokens(input, /\s+/, 'Type e.g.: REQUIRED throw catch').map(function (x) { return x.toUpperCase(); });
        var prop = t[0], thr = t.indexOf('THROW') >= 0, cat = t.indexOf('CATCH') >= 0, self = t.indexOf('SELF') >= 0, fail = t.indexOf('FAIL-AFTER') >= 0;
        var res = txOutcome(prop, thr, cat, self, fail);
        var code = '@Transactional\npublic void outer() {\n  repo.save(a);                 // outer write\n  try {\n    ' + (self ? 'this.inner();   // self call: no proxy!' : 'other.inner();  // through the proxy') + '\n  } catch (RuntimeException e) { ' + (cat ? '/* swallowed */' : 'throw e;') + ' }\n  ' + (fail ? 'throw new IllegalStateException();' : '// return normally') + '\n}\n\n@Transactional(propagation = ' + prop + ')\npublic void inner() {\n  repo.save(b);                 // inner write\n  ' + (thr ? 'throw new RuntimeException();' : '// ok') + '\n}';
        var frames = [];
        function f(narr, line, vals, bad) { frames.push({ narr: narr, parts: [codePart(code, line, bad ? 'bad' : 'cur'), { type: 'vars', label: 'Transactions', vals: vals, hl: {} }] }); }
        f('The caller enters <code>outer()</code> through the proxy: REQUIRED and no transaction yet → <b>T1 begins</b> (a connection is taken from the pool).', 2, { T1: 'active', inner: '-' });
        f('Outer writes row a (pending in T1).', 3, { T1: 'active, a pending', inner: '-' });
        var innerTx = self ? 'no proxy: runs inside T1' : ({ REQUIRED: 'joins T1', SUPPORTS: 'joins T1', MANDATORY: 'joins T1', REQUIRES_NEW: 'T1 suspended, T2 begins (2nd connection)', NESTED: 'SAVEPOINT sp1 inside T1', NEVER: 'IllegalTransactionStateException: a transaction exists!' }[prop] || 'unknown');
        f('Calling inner(): ' + innerTx, 5, { T1: 'active', inner: innerTx }, prop === 'NEVER' && !self);
        if (!(prop === 'NEVER' && !self)) {
          f('Inner writes row b' + (thr ? ', then <span class="c-r">throws a RuntimeException</span>.' : ' and returns normally.'), thr ? [12, 13] : 12, { T1: 'active', inner: innerTx }, thr);
          if (thr && !self) f('The inner proxy sees the exception: ' + ({ REQUIRES_NEW: 'T2 rolls back, T1 resumes.', NESTED: 'roll back to savepoint sp1 (b is undone, a is kept).' }[prop] || '<b>marks T1 rollback-only</b> (it cannot roll back a transaction it only joined).'), 5, { T1: (prop === 'REQUIRES_NEW' || prop === 'NESTED') ? 'active' : 'ROLLBACK-ONLY', inner: 'failed' }, true);
        }
        f(cat ? 'Outer catches and swallows the exception (if any).' : 'Outer rethrows (if there was an exception).', 6, { T1: 'deciding', inner: '-' });
        if (fail) f('Outer then fails with an exception of its own.', 7, { T1: 'will roll back', inner: '-' }, true);
        f('Result: <b>' + res + '</b>. ' + (res.indexOf('Unexpected') >= 0 ? 'Outer tried to commit, but T1 was rollback-only, so Spring rolls back and throws UnexpectedRollbackException to the caller.' : ''), 8, { result: res }, res.indexOf('ROLLBACK') >= 0);
        return frames;
      }
    },
    examples: [
      { title: 'Self-invocation', html: `<p>${C('placeOrder()')} calls ${C('this.sendEmail()')} which is annotated ${C('REQUIRES_NEW')}. The call never passes through the proxy, so the annotation is ignored: no new transaction, no rollback rules. The same happens with ${C('private')} methods (Spring 6 proxies only intercept public and, with class proxies, protected/package methods). Fixes: move the method to another bean, inject the bean into itself lazily, or use ${C('TransactionTemplate')} programmatically.</p>` },
      { title: 'Checked exception commits', html: `<p>${C('@Transactional public void pay() throws PaymentException')} where ${C('PaymentException extends Exception')}. The debit row was saved, then the exception is thrown: Spring <b>commits</b>, leaving a debit with no payment. Add ${C('rollbackFor = PaymentException.class')} or make it a runtime exception.</p>` },
      { title: 'REQUIRES_NEW pool deadlock', html: `<p>Pool size 10, 10 concurrent requests each hold a connection in T1 and call a ${C('REQUIRES_NEW')} method that needs a <b>second</b> connection. All 10 wait for a free connection that never comes: the pool times out after ${C('connectionTimeout')} (30 s by default in HikariCP). Size pools for nested transactions or avoid REQUIRES_NEW on hot paths.</p>` },
      { title: 'Programmatic control', html: `<p>${C('TransactionTemplate tt; tt.execute(status -> { ...; if (bad) status.setRollbackOnly(); return x; })')} gives explicit boundaries, works for self-calls, and makes the transaction scope obvious in code reviews. Useful for loops where each item gets its own transaction.</p>` }
    ],
    deepDive: `<p><b>How the interceptor works.</b> ${C('TransactionInterceptor.invokeWithinTransaction')} reads the ${C('TransactionAttribute')}, calls ${C('getTransaction(definition)')}, binds the ${C('EntityManagerHolder')} and connection to the current thread via ${C('TransactionSynchronizationManager')} (thread-locals), runs the method, and calls ${C('commitTransactionAfterReturning')} or ${C('completeTransactionAfterThrowing')}. Because state lives in thread-locals, a transaction <b>does not follow</b> work into another thread (${C('@Async')}, ${C('CompletableFuture')}, parallel streams).</p>
<p><b>Commit order with JPA.</b> Commit = Hibernate flush (dirty checking, SQL) + JDBC commit. Constraint violations therefore surface at commit time, outside your method, unless you call ${C('flush()')} earlier. ${C('TransactionSynchronization.afterCommit')} (or ${C('@TransactionalEventListener(phase = AFTER_COMMIT)')}) is the right place to send emails or Kafka events so they are not sent for rolled-back data (and the outbox pattern when you need atomicity).</p>
<p><b>readOnly and timeout.</b> ${C('readOnly = true')} is a hint: Hibernate skips snapshots and flush, PostgreSQL gets ${C('SET TRANSACTION READ ONLY')} via the JDBC driver, and routing data sources can send it to a replica. ${C('timeout')} sets a deadline checked by Hibernate before each statement (and the JDBC query timeout).</p>
<p><b>Isolation in practice.</b> Most apps run READ COMMITTED and handle the write anomalies explicitly (versions, ${C('SELECT ... FOR UPDATE')}, unique constraints). SERIALIZABLE in PostgreSQL (SSI) is great for correctness but needs a retry loop around the whole transaction because commits can fail with SQLSTATE 40001.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code sprinkles ${C('@Transactional')} on controllers, private methods and repository interfaces, and often catches exceptions inside a REQUIRED call chain. An AI assistant is useful for drawing the call graph of a request and labelling where each transaction starts and ends; ask it to "<i>mark every method call that passes through a Spring proxy</i>". Then check with logs: ${C('logging.level.org.springframework.orm.jpa.JpaTransactionManager=debug')} prints "Creating new transaction", "Participating in existing transaction" and "Suspending current transaction" lines, which settle any argument quickly.</p>`,
    problems: [{
      title: 'Predict the Outcome of Nested @Transactional Calls',
      level: 'Hard', tags: ['transactions', 'propagation', 'spring'], companies: ['Goldman Sachs', 'JPMorgan', 'PayPal'],
      statement: `<p>An outer method with ${C('REQUIRED')} writes row <i>a</i>, then calls an inner method (propagation <code>prop</code>) that writes row <i>b</i>. Return <code>"outer=X inner=Y"</code> where X/Y is <code>COMMIT</code>, <code>ROLLBACK</code> or (for an inner method that never ran) <code>NONE</code>. Append <code>" UnexpectedRollbackException"</code> when the outer commit fails because the transaction was marked rollback-only.</p>
<ul><li><code>innerThrows</code>: inner throws a RuntimeException after writing b.</li>
<li><code>outerCatches</code>: outer catches and swallows any exception from the call.</li>
<li><code>selfCall</code>: outer calls <code>this.inner()</code>, so inner's annotation is ignored and it runs inside the outer transaction.</li>
<li><code>outerFailsAfter</code>: after the call returns (or its exception is swallowed), outer throws its own RuntimeException.</li>
<li><code>prop</code> ∈ REQUIRED, SUPPORTS, MANDATORY (join), REQUIRES_NEW (independent), NESTED (savepoint), NEVER (throws IllegalTransactionStateException before inner runs).</li></ul>`,
      constraints: `All combinations of the four flags are valid input.`,
      example: `<p>(REQUIRED, throws, catches, no self call, no later failure) → ${H.c('r', '"outer=ROLLBACK inner=ROLLBACK UnexpectedRollbackException"')}: the inner proxy marked the shared transaction rollback-only even though outer swallowed the exception.</p>`,
      brute: { why: `<p>A hard-coded table of all 6 × 16 combinations would work but is unreadable and wrong the moment you add a rule. Derive the outcome from three facts: does inner join, does an exception escape outer, and did a joined inner method fail through the proxy.</p>`, code: `
static String lookup(String prop, boolean t, boolean c, boolean s, boolean f) {
    String key = prop + (t ? "1" : "0") + (c ? "1" : "0") + (s ? "1" : "0") + (f ? "1" : "0");
    Map<String, String> table = new HashMap<>();
    table.put("REQUIRED0000", "outer=COMMIT inner=COMMIT");
    table.put("REQUIRED1100", "outer=ROLLBACK inner=ROLLBACK UnexpectedRollbackException");
    table.put("REQUIRES_NEW1100", "outer=COMMIT inner=ROLLBACK");
    // ... 90 more lines that nobody can review
    return table.getOrDefault(key, "unknown");
}` },
      mcq: { q: 'Inner is REQUIRES_NEW and succeeds; afterwards the outer REQUIRED method throws. What happens to inner\'s row?', options: ['Rolled back with outer', 'Committed: it was a separate transaction', 'Rolled back to a savepoint', 'UnexpectedRollbackException'], answer: 1, explain: 'REQUIRES_NEW committed on its own connection before outer resumed; the outer rollback cannot undo it. With NESTED it would be rolled back.' },
      hints: [`<p>Hint 1: first decide whether inner <b>joins</b> the outer transaction: self call, REQUIRED, SUPPORTS or MANDATORY.</p>`, `<p>Hint 2: an exception "escapes" outer if (inner threw or NEVER rejected the call) and outer did not catch it, or outer fails afterwards. An escaping exception means outer rolls back.</p>`, `<p>Hint 3: joined + inner threw through the proxy + nothing escaped → UnexpectedRollbackException. REQUIRES_NEW: inner's result is independent. NESTED: inner rolls back if it threw, otherwise it shares outer's fate.</p>`],
      tests: { sig: 'string bool bool bool bool -> string', fn: 'outcome', cases: [
        [['REQUIRED', false, false, false, false], 'outer=COMMIT inner=COMMIT'],
        [['REQUIRED', true, true, false, false], 'outer=ROLLBACK inner=ROLLBACK UnexpectedRollbackException'],
        [['REQUIRED', true, false, false, false], 'outer=ROLLBACK inner=ROLLBACK'],
        [['REQUIRES_NEW', true, true, false, false], 'outer=COMMIT inner=ROLLBACK'],
        [['REQUIRES_NEW', false, false, false, true], 'outer=ROLLBACK inner=COMMIT'],
        [['NESTED', false, false, false, true], 'outer=ROLLBACK inner=ROLLBACK'],
        [['NESTED', true, true, false, false], 'outer=COMMIT inner=ROLLBACK'],
        [['REQUIRES_NEW', true, true, true, false], 'outer=COMMIT inner=COMMIT'],
        [['REQUIRED', true, false, true, false], 'outer=ROLLBACK inner=ROLLBACK'],
        [['NEVER', false, true, false, false], 'outer=COMMIT inner=NONE'],
        [['NEVER', false, false, false, false], 'outer=ROLLBACK inner=NONE'],
        [['MANDATORY', true, true, false, false], 'outer=ROLLBACK inner=ROLLBACK UnexpectedRollbackException'],
        [['REQUIRES_NEW', true, false, false, false], 'outer=ROLLBACK inner=ROLLBACK'],
        [['NESTED', false, false, false, false], 'outer=COMMIT inner=COMMIT'],
        [['REQUIRED', true, true, false, true], 'outer=ROLLBACK inner=ROLLBACK']
      ] },
      solution: {
        approach: `<p>Compute three booleans: <b>joins</b> (shares the outer transaction), <b>escapes</b> (an exception leaves outer), and whether a joined inner failure went through a proxy (marks rollback-only). Then apply the rule for the propagation. This is the same decision tree as ${C('AbstractPlatformTransactionManager.handleExistingTransaction')} plus the interceptor's rollback handling.</p>`,
        code: `
public class Propagation {
    static String outcome(String prop, boolean innerThrows, boolean outerCatches,
                          boolean selfCall, boolean outerFailsAfter) {
        boolean joins = selfCall || prop.equals("REQUIRED") || prop.equals("SUPPORTS") || prop.equals("MANDATORY");
        boolean never = !selfCall && prop.equals("NEVER");          // proxy rejects the call
        boolean excFromInner = never || innerThrows;
        boolean escapes = (excFromInner && !outerCatches) || outerFailsAfter;

        if (joins) {
            if (escapes) return "outer=ROLLBACK inner=ROLLBACK";
            if (!selfCall && innerThrows)                                // proxy marked rollback-only
                return "outer=ROLLBACK inner=ROLLBACK UnexpectedRollbackException";
            return "outer=COMMIT inner=COMMIT";
        }
        String outer = escapes ? "ROLLBACK" : "COMMIT";
        return switch (prop) {
            case "NEVER" -> "outer=" + outer + " inner=NONE";
            case "REQUIRES_NEW" -> "outer=" + outer + " inner=" + (innerThrows ? "ROLLBACK" : "COMMIT");
            case "NESTED" -> "outer=" + outer + " inner=" + (innerThrows ? "ROLLBACK" : outer); // savepoint
            default -> throw new IllegalArgumentException(prop);
        };
    }

    public static void main(String[] args) {
        System.out.println(outcome("REQUIRED", true, true, false, false));
    }
}`,
        dry: { head: ['prop', 'throws/catches/self/failAfter', 'joins', 'escapes', 'result'], rows: [
          ['REQUIRED', 'T/T/F/F', 'yes', 'no', 'ROLLBACK both + UnexpectedRollbackException'],
          ['REQUIRES_NEW', 'F/F/F/T', 'no', 'yes', 'outer ROLLBACK, inner COMMIT'],
          ['NESTED', 'F/F/F/T', 'no', 'yes', 'both ROLLBACK (savepoint is part of T1)'],
          ['REQUIRES_NEW', 'T/T/T/F', 'yes (self call)', 'no', 'both COMMIT']
        ] },
        complexity: `<p>O(1): a fixed number of boolean checks per call.</p>`,
        followUps: ['Add NOT_SUPPORTED: what happens to b if the JPA EntityManager has no transaction?', 'Model a checked exception with and without rollbackFor']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Optimistic and pessimistic locking in JPA
     ====================================================================== */
  topics.push({
    title: 'Locking in JPA: @Version, LockModeType, NOWAIT and SKIP LOCKED',
    analogy: `<p><b>Optimistic</b> locking is a shared Google Doc with a revision number: you edit freely, and when you press save the system checks "is it still revision 7?". If someone saved revision 8 meanwhile, your save is rejected and you must reload and redo. <b>Pessimistic</b> locking is taking the only physical key to the room: nobody else can enter until you give it back, which is safe but makes others queue (or, with <b>NOWAIT</b>, walk away immediately, or with <b>SKIP LOCKED</b>, go to the next free room).</p>`,
    explain: `<p><b>Plain idea:</b> two transactions read the same row, both change it, the second write silently overwrites the first: a <b>lost update</b>. READ COMMITTED does not stop it. JPA gives two tools.</p>
<h4>Optimistic: ${C('@Version')}</h4>
<p>Add ${C('@Version int version')} (or long, or a timestamp). Every UPDATE Hibernate generates becomes</p>
${H.table(['Step', 'SQL', 'Rows affected'], [
  ['T1 and T2 read', C('select ..., version from account where id=1') + ' → version 7', '-'],
  ['T1 commits first', C('update account set balance=?, version=8 where id=1 and version=7'), H.c('g', '1')],
  ['T2 commits', C('update account set balance=?, version=8 where id=1 and version=7'), H.c('r', '0 → OptimisticLockException')]
])}
<p>No database locks are held between read and write, so it scales well when conflicts are rare. Spring translates the exception to ${C('ObjectOptimisticLockingFailureException')}; the usual reaction is to <b>retry the whole transaction</b> (reload, reapply) or return HTTP 409/412 to the user.</p>
<h4>Explicit lock modes</h4>
${H.table(['LockModeType', 'What Hibernate does', 'SQL (PostgreSQL)'], [
  [C('OPTIMISTIC'), 'checks the version again at commit even if the entity was only read', C('select version ... where id=?') + ' at commit'],
  [C('OPTIMISTIC_FORCE_INCREMENT'), 'bumps the version even without changes (lock an aggregate root when a child changes)', C('update ... set version=version+1')],
  [C('PESSIMISTIC_READ'), 'shared row lock', C('select ... for share')],
  [C('PESSIMISTIC_WRITE'), 'exclusive row lock until commit', C('select ... for update')],
  [C('PESSIMISTIC_FORCE_INCREMENT'), 'exclusive lock + version bump', C('for update') + ' + version update']
])}
<p>Lock timeout hint ${C('jakarta.persistence.lock.timeout')}: milliseconds to wait; ${C('0')} means ${C('NOWAIT')} (fail immediately with ${C('LockTimeoutException')}/${C('PessimisticLockException')}); Hibernate's ${C('LockOptions.SKIP_LOCKED')} (−2) adds ${C('SKIP LOCKED')}, perfect for job queues where many workers grab different rows.</p>`,
    clues: ['"Two admins edit the same product and one change disappears" → lost update → @Version', '"Users must not double-book the last seat" → pessimistic lock or a constraint', '"Workers pick jobs from a table without blocking each other" → FOR UPDATE SKIP LOCKED', '"OptimisticLockException in the logs under load" → retry, or reduce contention', '"How do you prevent lost updates across an HTTP edit form?" → version in the form / ETag + If-Match', '"Changing an order line should conflict with another edit of the same order" → OPTIMISTIC_FORCE_INCREMENT on the root'],
    code: [{ lang: 'java', check: false, title: 'Optimistic, pessimistic and SKIP LOCKED with Spring Data JPA', code: `@Entity
public class Seat {
    @Id Long id;
    boolean booked;
    @Version long version;                       // UPDATE ... WHERE id = ? AND version = ?
}

public interface SeatRepository extends JpaRepository<Seat, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)        // SELECT ... FOR UPDATE
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "2000")) // wait max 2 s
    @Query("select s from Seat s where s.id = :id")
    Optional<Seat> lockById(@Param("id") long id);

    // Job queue: each worker takes up to 10 unclaimed jobs, skipping rows other workers locked
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2")) // Hibernate: SKIP LOCKED
    @Query("select j from Job j where j.status = 'NEW' order by j.id")
    List<Job> claimBatch(Pageable tenRows);
}

@Service
class BookingService {
    @Retryable(retryFor = ObjectOptimisticLockingFailureException.class, maxAttempts = 3,
               backoff = @Backoff(delay = 50, multiplier = 2))   // spring-retry: whole tx is retried
    @Transactional
    public void book(long seatId) {
        Seat s = seats.findById(seatId).orElseThrow();
        if (s.booked) throw new IllegalStateException("taken");
        s.booked = true;                          // version check happens at flush/commit
    }
}` }],
    codeTitle: '@Version, PESSIMISTIC_WRITE with timeout, SKIP LOCKED job claiming, retry',
    viz: {
      title: 'Two transactions, one row: version check at UPDATE time',
      input: 'A read, B read, A write 90, B write 80, B read, B write 80',
      inputLabel: 'ops separated by commas: X read | X write value (row starts value=100, version=0)',
      gen: function (input) {
        var ops = String(input).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; }).slice(0, 14);
        if (!ops.length) throw new Error('Type ops like: A read, B read, A write 90');
        var row = { value: 100, version: 0 }, seen = {}, frames = [], log = [];
        function snap(narr, who, bad) {
          var tx = {}; Object.keys(seen).forEach(function (k) { tx[k + ' saw version'] = seen[k]; });
          frames.push({ narr: narr, parts: [
            { type: 'table', label: 'account row', columns: ['id', 'balance', 'version'], rows: [[1, row.value, row.version]], hl: bad === undefined ? {} : { 0: bad ? 'bad' : 'ok' } },
            { type: 'vars', label: 'What each transaction read', vals: Object.keys(tx).length ? tx : { none: '-' }, hl: who ? one(who + ' saw version', 'cur') : {} },
            { type: 'queue', label: 'SQL log', items: log.slice(-5), hl: {} }
          ] });
        }
        snap('Row 1 has balance 100 and version 0. No locks are taken by reads.');
        ops.forEach(function (o) {
          var p = o.split(/\s+/), x = p[0];
          if (p[1] === 'read') { seen[x] = row.version; log.push(x + ': select ... version=' + row.version); snap(x + ' reads balance ' + row.value + ' with <b>version ' + row.version + '</b>.', x); }
          else if (p[1] === 'write') {
            if (seen[x] === undefined) { snap(x + ' must read the row before writing it.', x, true); return; }
            var sql = x + ': update set balance=' + p[2] + ', version=' + (seen[x] + 1) + ' where id=1 and version=' + seen[x];
            if (seen[x] === row.version) { row.value = +p[2]; row.version++; seen[x] = row.version; log.push(sql + ' → 1 row'); snap('<span class="c-g">1 row updated</span>: the version still matched, so ' + x + ' wins and the version becomes ' + row.version + '.', x, false); }
            else { log.push(sql + ' → 0 rows'); snap('<span class="c-r">0 rows updated</span>: ' + x + ' read version ' + seen[x] + ' but the row is at ' + row.version + '. Hibernate throws <b>OptimisticLockException</b>; the transaction rolls back. Reload and retry.', x, true); }
          } else throw new Error('Use "X read" or "X write value"');
        });
        if (frames.length < 4) snap('Add more steps, e.g. "A read, B read, A write 90, B write 80".');
        return frames;
      }
    },
    examples: [
      { title: 'Edit form across two HTTP requests', html: `<p>GET /products/7 returns version 12 (as a hidden field or ${C('ETag: "12"')}). PUT /products/7 with ${C('If-Match: "12"')} loads the entity, compares versions and fails with 412 if it changed. If you just copy the DTO's version onto a freshly loaded managed entity, Hibernate ignores it (it uses its own loaded version), so compare explicitly or use ${C('merge')} of a detached entity that carries the old version.</p>` },
      { title: 'Seat booking with FOR UPDATE', html: `<p>200 users click "book" on the last seat. With ${C('PESSIMISTIC_WRITE')} the first transaction locks the row; the others wait, then read ${C('booked = true')} and fail cleanly. With only ${C('@Version')} all 200 read "free", one commits and 199 get OptimisticLockException: correct, but much wasted work. High contention favours pessimistic locks or an atomic SQL update (${C('update seat set booked = true where id = ? and booked = false')}, check row count).</p>` },
      { title: 'Job queue with SKIP LOCKED', html: `<p>4 workers each run ${C('select ... where status = \'NEW\' order by id limit 10 for update skip locked')}. Worker 1 gets jobs 1–10, worker 2 skips those locked rows and gets 11–20, and so on. No waiting, no double processing. Without SKIP LOCKED all workers queue on job 1.</p>` },
      { title: 'Deadlock from lock order', html: `<p>Transfer A→B locks account A then B; a concurrent transfer B→A locks B then A. Each waits for the other: the database kills one with a deadlock error. Fix: always lock rows in a fixed order (for example by ascending id), or lock both with one query ${C('where id in (:a, :b) order by id for update')}.</p>` }
    ],
    deepDive: `<p><b>Where Hibernate checks the version.</b> In ${C('AbstractEntityPersister.update')} the generated UPDATE includes ${C('and version = ?')}; the JDBC row count is verified, and 0 rows means ${C('StaleObjectStateException')} (wrapped as JPA ${C('OptimisticLockException')}). With JDBC batching, the driver must report per-statement counts for the check to work. For deletes the same predicate is added. A versionless alternative is ${C('@OptimisticLocking(type = DIRTY)')} with ${C('@DynamicUpdate')}: the WHERE clause compares the old values of changed columns, so edits to different columns do not conflict.</p>
<p><b>Version increments you may not expect.</b> Changing an owned collection (e.g. adding to a ${C('@ManyToMany')} or a unidirectional ${C('@OneToMany')}) bumps the owner's version. Use ${C('@OptimisticLock(excluded = true)')} on attributes that should not.</p>
<p><b>Pessimistic details.</b> ${C('PESSIMISTIC_WRITE')} with a fetch join may lock rows in joined tables too (PostgreSQL ${C('FOR UPDATE')} locks all joined rows unless you use ${C('FOR UPDATE OF')}). ${C('em.lock(entity, mode)')} on an already loaded entity issues a separate ${C('select ... for update')} and checks the version. Locks are held until commit, so keep these transactions short and never call remote services while holding them.</p>
<p><b>Retries.</b> Retry the whole transaction, not just the flush: the entity in a failed persistence context is stale and the context must be discarded. Use a bounded count with jittered backoff; log conflicts as a metric, because rising conflict rates often mean a hot row that needs redesign (sharded counters, append-only events).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants often suggest ${C('synchronized')} on a service method to "fix" a race condition. That only works within one JVM; with 3 pods behind a load balancer it does nothing. Ask instead for "<i>the SQL that each concurrent request sends</i>" and reason about the database. LLMs are good at writing a concurrency test (two threads, a latch, two transactions) to reproduce a lost update; use it to prove your @Version or lock fix before shipping.</p>`,
    problems: [{
      title: 'Simulate @Version Checks for Concurrent Writers',
      level: 'Medium', tags: ['optimistic-locking', 'version', 'concurrency'], companies: ['Stripe', 'Shopify', 'Zalando'],
      statement: `<p>One row starts with value <code>start</code> and version 0. Transactions are named by a word. Process ops and return one line per op:</p>
<ul><li><code>X read</code>: X remembers the current version → <code>"X read v=&lt;version&gt; value=&lt;value&gt;"</code>.</li>
<li><code>X write n</code>: like ${C('UPDATE ... WHERE version = seen')}. If X never read → <code>"X error:no read"</code>. If X's remembered version equals the row's version, set the value, increment the version, X now remembers the new version → <code>"X ok v=&lt;new version&gt;"</code>. Otherwise → <code>"X OptimisticLockException"</code> (row unchanged; X must read again).</li></ul>`,
      constraints: `0 ≤ ops ≤ 10<sup>5</sup>; values fit in int.`,
      example: `<p>start 100, ["A read","B read","A write 90","B write 80"] → ${H.c('g', '["A read v=0 value=100","B read v=0 value=100","A ok v=1","B OptimisticLockException"]')}. B's UPDATE says <code>where version = 0</code> but the row is at 1.</p>`,
      brute: { why: `<p>"Last write wins" (just overwrite the value) is what you get without a version: B silently erases A's change. That lost update is exactly the bug being prevented.</p>`, code: `
static String[] lastWriteWins(int start, String[] ops) {
    int value = start;
    String[] out = new String[ops.length];
    for (int i = 0; i < ops.length; i++) {
        String[] p = ops[i].split(" ");
        if (p[1].equals("write")) { value = Integer.parseInt(p[2]); out[i] = p[0] + " ok"; } // overwrites blindly
        else out[i] = p[0] + " read value=" + value;
    }
    return out;
}` },
      mcq: { q: 'What does Hibernate add to the UPDATE for an entity with @Version?', options: ['FOR UPDATE', 'AND version = ? in the WHERE clause, and version + 1 in SET', 'A trigger', 'SERIALIZABLE isolation'], answer: 1, explain: 'The version check is a compare-and-set in SQL: WHERE id = ? AND version = ?, with the incremented version in SET. 0 affected rows means someone else won.' },
      hints: [`<p>Hint 1: keep the row (value, version) and a map from transaction name to the version it last saw.</p>`, `<p>Hint 2: a write is a compare-and-set: compare the remembered version with the row's version.</p>`, `<p>Hint 3: after a successful write the writer remembers the new version (its entity was updated). After a failure the row and the remembered version stay as they were.</p>`],
      tests: { sig: 'int string[] -> string[]', fn: 'run', cases: [
        [[100, ['A read', 'B read', 'A write 90', 'B write 80']], ['A read v=0 value=100', 'B read v=0 value=100', 'A ok v=1', 'B OptimisticLockException']],
        [[100, ['A read', 'A write 5', 'A write 6']], ['A read v=0 value=100', 'A ok v=1', 'A ok v=2']],
        [[100, ['A write 1']], ['A error:no read']],
        [[100, ['A read', 'B read', 'A write 90', 'B read', 'B write 80']], ['A read v=0 value=100', 'B read v=0 value=100', 'A ok v=1', 'B read v=1 value=90', 'B ok v=2']],
        [[7, []], []],
        [[100, ['A read', 'B read', 'B write 7', 'A write 8', 'A read', 'A write 9']], ['A read v=0 value=100', 'B read v=0 value=100', 'B ok v=1', 'A OptimisticLockException', 'A read v=1 value=7', 'A ok v=2']],
        [[0, ['X read', 'Y read', 'Z read', 'Z write 3', 'Y write 2', 'X write 1']], ['X read v=0 value=0', 'Y read v=0 value=0', 'Z read v=0 value=0', 'Z ok v=1', 'Y OptimisticLockException', 'X OptimisticLockException']],
        [[-5, ['A read', 'A write -6', 'B write 1', 'B read']], ['A read v=0 value=-5', 'A ok v=1', 'B error:no read', 'B read v=1 value=-6']]
      ] },
      solution: {
        approach: `<p>The row is two ints. A ${C('HashMap<String, Integer>')} stores each transaction's read version. A write succeeds only when the versions match, which is exactly the "rows affected == 1" check Hibernate does after its versioned UPDATE.</p>`,
        code: `
public class VersionCheck {
    static String[] run(int start, String[] ops) {
        int value = start, version = 0;
        Map<String, Integer> seen = new HashMap<>();   // tx -> version it read
        String[] out = new String[ops.length];
        for (int i = 0; i < ops.length; i++) {
            String[] p = ops[i].split(" ");
            String tx = p[0];
            if (p[1].equals("read")) {
                seen.put(tx, version);
                out[i] = tx + " read v=" + version + " value=" + value;
            } else if (!seen.containsKey(tx)) {
                out[i] = tx + " error:no read";
            } else if (seen.get(tx) == version) {      // UPDATE ... WHERE version = seen -> 1 row
                value = Integer.parseInt(p[2]);
                version++;
                seen.put(tx, version);
                out[i] = tx + " ok v=" + version;
            } else {                                   // 0 rows affected
                out[i] = tx + " OptimisticLockException";
            }
        }
        return out;
    }

    public static void main(String[] args) {
        System.out.println(String.join(" | ", run(100, new String[]{"A read", "B read", "A write 90", "B write 80"})));
    }
}`,
        dry: { head: ['op', 'row (value, version)', 'seen', 'output'], rows: [
          ['A read', '(100, 0)', 'A=0', 'A read v=0 value=100'],
          ['B read', '(100, 0)', 'A=0, B=0', 'B read v=0 value=100'],
          ['A write 90', '(90, 1)', 'A=1, B=0', 'A ok v=1'],
          ['B write 80', '(90, 1)', 'B=0 ≠ 1', 'B OptimisticLockException']
        ] },
        complexity: `<p>O(1) average per op, O(transactions) space.</p>`,
        followUps: ['Add a retry policy: a failed writer re-reads and retries up to k times', 'Model @OptimisticLocking(type = DIRTY) with two columns: when do two writers not conflict?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Spring Data JPA repositories and projections
     ====================================================================== */
  topics.push({
    title: 'Spring Data JPA: Repositories, Derived Queries, @Query, Projections and Paging',
    analogy: `<p>Spring Data is a <b>restaurant that cooks from the dish name</b>. You write "${C('findByCityAndAgeGreaterThan')}" on the order slip, and the kitchen (the query-method parser) knows the recipe: where city = ? and age &gt; ?. For anything unusual you hand over your own recipe card (${C('@Query')}). A <b>projection</b> is ordering "just the soup" instead of the full menu: the kitchen only cooks (selects) the columns you asked for. And ${C('Page')} vs ${C('Slice')} is asking the waiter "how many dishes are there in total?" (an extra trip to count) versus "is there at least one more?" (just peek).</p>`,
    explain: `<p><b>Plain idea:</b> you declare an interface; Spring creates a proxy backed by ${C('SimpleJpaRepository')} at startup.</p>
${H.table(['Interface', 'Adds'], [
  [C('Repository<T, ID>'), 'marker only: expose exactly the methods you declare'],
  [C('CrudRepository / ListCrudRepository'), 'save, findById, findAll, delete, count (List variants since Spring Data 3)'],
  [C('PagingAndSortingRepository'), 'findAll(Pageable), findAll(Sort)'],
  [C('JpaRepository'), 'flush, saveAndFlush, deleteAllInBatch, getReferenceById']
])}
<h4>Three ways to write a query</h4>
<ul><li><b>Derived:</b> ${C('List<Person> findTop3ByLastNameAndAgeGreaterThanOrderByAgeDesc(String n, int a)')} is parsed once at startup (${C('PartTree')}); a typo in a property name fails the boot, which is a feature.</li>
<li><b>${C('@Query')}:</b> JPQL (or ${C('nativeQuery = true')}). Updates need ${C('@Modifying')}; add ${C('clearAutomatically = true')} because bulk updates bypass the persistence context and leave stale managed entities.</li>
<li><b>Specifications / Querydsl / Criteria</b> for dynamic filters.</li></ul>
<h4>Projections: select less</h4>
${H.table(['Kind', 'Example', 'SQL selects'], [
  ['Closed interface', C('interface NameOnly { String getFirstName(); String getLastName(); }'), H.c('g', 'only first_name, last_name')],
  ['Open interface', C('@Value("#{target.firstName + \' \' + target.lastName}") String getFullName();'), H.c('r', 'the whole entity (SpEL needs it)')],
  ['DTO class / record', C('record PersonDto(String firstName, int age)'), H.c('g', 'only constructor arguments')],
  ['Dynamic', C('<T> List<T> findByCity(String c, Class<T> type)'), 'depends on the type passed']
])}
<p>Projections return plain data, not managed entities: no dirty checking, no lazy loading surprises, and far less memory. For read-only screens they are usually the best answer to "how do you make this endpoint faster?".</p>`,
    clues: ['"Write a repository method that finds the 3 oldest people in a city"', '"save() runs a SELECT before the INSERT" → assigned id, isNew() is false, merge', '"The bulk update ran but the entity still shows the old value" → @Modifying(clearAutomatically = true)', '"Page is slow on a big table" → the count query; use Slice or keyset/scroll', '"Return only the name and email for a listing" → projection', '"Filters are optional and combinable" → Specification / Querydsl'],
    code: [{ lang: 'java', check: false, title: 'A realistic repository (Spring Data JPA 3.x)', code: `public interface PersonRepository extends JpaRepository<Person, Long>, JpaSpecificationExecutor<Person> {

    // Derived: where last_name = ?1 and age > ?2 order by age desc limit 3
    List<Person> findTop3ByLastNameAndAgeGreaterThanOrderByAgeDesc(String lastName, int age);

    boolean existsByEmailIgnoreCase(String email);            // select ... limit 1
    long countByCityAndActiveTrue(String city);

    // Closed interface projection: SELECT first_name, last_name only
    interface NameView { String getFirstName(); String getLastName(); }
    List<NameView> findByCity(String city);

    // DTO projection with a constructor expression
    record CityCount(String city, long people) { }
    @Query("select new com.acme.PersonRepository$CityCount(p.city, count(p)) from Person p group by p.city")
    List<CityCount> countPerCity();

    // Slice: fetches size + 1 rows, no count query
    Slice<NameView> findByActiveTrue(Pageable page);

    // Bulk update: bypasses dirty checking and the persistence context
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Person p set p.active = false where p.lastLogin < :cutoff")
    int deactivateBefore(@Param("cutoff") Instant cutoff);

    // Keyset scrolling (Spring Data 3.1+): no OFFSET, stable under inserts
    Window<Person> findFirst50ByCityOrderByIdAsc(String city, ScrollPosition position);
}

// Dynamic filters with a Specification
static Specification<Person> livesIn(String city) {
    return (root, q, cb) -> city == null ? null : cb.equal(root.get("city"), city); // null = no filter
}` }],
    codeTitle: 'Derived queries, projections, Slice, @Modifying, Window scrolling and Specifications',
    viz: {
      title: 'How Spring Data parses a derived query method name',
      input: 'findTop3ByLastNameAndAgeGreaterThanOrderByAgeDesc',
      inputLabel: 'a derived query method name (find/count/exists ... By ... [OrderBy ...])',
      gen: function (input) {
        var m = String(input).trim();
        var by = m.indexOf('By');
        if (by < 0 || !/^(find|read|get|query|stream|count|exists)/.test(m)) throw new Error('Name must start with find/count/exists... and contain By');
        var head = m.slice(0, by), rest = m.slice(by + 2), ob = rest.indexOf('OrderBy');
        var crit = ob >= 0 ? rest.slice(0, ob) : rest, order = ob >= 0 ? rest.slice(ob + 7) : '';
        var parts = crit ? crit.split(/(?=(?:And|Or)[A-Z])/) : [];
        var frames = [];
        function f(narr, hl, extra) { frames.push({ narr: narr, parts: [{ type: 'array', label: 'Method name pieces', values: [head, 'By'].concat(parts).concat(order ? ['OrderBy', order] : []), hl: hl }, { type: 'vars', label: 'Query so far', vals: extra, hl: {} }] }); }
        var kind = /^count/.test(head) ? 'select count(e)' : (head.indexOf('Distinct') >= 0 ? 'select distinct e' : 'select e');
        var lim = (head.match(/(Top|First)(\d*)/) || null);
        f('The <b>subject</b> before "By" decides the query type: <code>' + head + '</code> → ' + kind + (lim ? ', limit ' + (lim[2] || 1) : '') + (/^exists/.test(head) ? ', limit 1 (exists)' : '') + '.', { 0: 'cur' }, { select: kind });
        var n = 1;
        parts.forEach(function (p, i) {
          var conj = /^And/.test(p) ? 'and ' : /^Or/.test(p) ? 'or ' : '';
          var body = p.replace(/^(And|Or)/, '');
          f('Predicate ' + (i + 1) + ': <code>' + body + '</code>. Spring strips a known operator suffix (GreaterThan, Between, IsNull, In, StartingWith...) and the rest is a property path, checked against the entity at startup. ' + (conj ? 'Joined with <b>' + conj + '</b>(And binds tighter than Or).' : ''), one(i + 2, 'cur'), { predicate: conj + body, nextParam: '?' + n });
          n += /Between/.test(body) ? 2 : /(Null|True|False)$/.test(body) ? 0 : 1;
        });
        if (order) f('<code>OrderBy' + order + '</code> → each property followed by Asc/Desc (default asc) becomes an ORDER BY item.', one(parts.length + 3, 'cur'), { orderBy: order });
        f('The parsed PartTree is turned into a JPA Criteria query once, at startup, and reused for every call. Unknown property → the application fails to start (<code>PropertyReferenceException</code>).', {}, { parameters: n - 1 });
        return frames;
      }
    },
    examples: [
      { title: 'save() and the extra SELECT', html: `<p>${C('SimpleJpaRepository.save(e)')} calls ${C('persist')} if ${C('entityInformation.isNew(e)')} else ${C('merge')}. isNew means "id is null" (or version is null for a wrapper-type ${C('@Version')}). With assigned ids (UUIDs created in Java, natural keys), every save is a merge: SELECT then INSERT. Fix with ${C('Persistable<ID>')} (an ${C('isNew')} flag set in ${C('@PostLoad/@PostPersist')}) or a nullable ${C('@Version Long')}.</p>` },
      { title: 'Page vs Slice in numbers', html: `<p>Table with 5,000,000 rows, page size 20. ${C('Page<T>')} runs the content query <b>and</b> ${C('select count(*) ...')} with the same filters, often the slowest part. ${C('Slice<T>')} asks for 21 rows and sets ${C('hasNext()')} if the 21st exists. Deep pages with OFFSET 4,000,000 are slow either way; keyset scrolling (${C('ScrollPosition.keyset()')}) stays fast.</p>` },
      { title: 'Closed vs open projection SQL', html: `<p>Closed ${C('NameView')} gives ${C('select p.first_name, p.last_name from person p where p.city=?')}. Adding one ${C('@Value')} SpEL getter makes it open: Spring cannot know which columns the expression needs, so it loads the full entity and wraps it. Prefer a default method on the interface (${C('default String fullName() { return getFirstName() + " " + getLastName(); }')}) to stay closed.</p>` },
      { title: 'deleteBy is not a bulk delete', html: `<p>${C('long deleteByCity(String city)')} loads every matching entity and calls ${C('remove')} on each (so cascades and lifecycle callbacks run): 10,000 rows = 1 SELECT + 10,000 DELETEs (batched if configured). For true bulk deletes use ${C('@Modifying @Query("delete from Person p where p.city = :c")')} and accept that cascades and callbacks are skipped.</p>` }
    ],
    deepDive: `<p><b>Startup work.</b> For each repository method, the ${C('QueryLookupStrategy')} (default ${C('CREATE_IF_NOT_FOUND')}) looks for ${C('@Query')}, then a named query (${C('Person.findByX')}), then derives one from the name. Derived and ${C('@Query')} JPQL is validated when the context starts, so broken queries fail fast. Native queries are not validated.</p>
<p><b>Transactions in repositories.</b> ${C('SimpleJpaRepository')} is annotated ${C('@Transactional(readOnly = true)')} at class level, with ${C('@Transactional')} on write methods. Calling a repository from a non-transactional service therefore opens and closes a short transaction per call, and entities come back detached: a common source of LazyInitializationException. Put ${C('@Transactional')} on the service method that defines the unit of work.</p>
<p><b>Projections internals.</b> Interface projections are backed by a ${C('TupleBackedMap')} or a proxy over the entity; DTO projections for derived queries use a JPQL constructor expression. Nested closed projections (${C('AddressView getAddress()')}) for to-one associations become joins; for collections Spring Data falls back to loading entities, so check the SQL.</p>
<p><b>Paging details.</b> When the first page is smaller than the page size, or a non-empty later page is not full, Spring computes the total from the content and skips the count query (${C('PageableExecutionUtils')}). ${C('@Query')} with joins may need an explicit ${C('countQuery')}, because the auto-derived count of a fetch join query is wrong or fails.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate derived method names quickly, sometimes absurdly long (${C('findByStatusAndCreatedAtBetweenAndCustomerRegionInOrderByCreatedAtDesc')}). Anything beyond two or three predicates reads better as ${C('@Query')} or a Specification. A good workflow: describe the screen ("list orders for a region, newest first, 20 per page, just id, total and status") and ask the AI for a repository method <i>with a projection and Slice</i>, then check the generated SQL in the log and the plan with ${C('EXPLAIN')}. AI also writes excellent ${C('@DataJpaTest')} tests with Testcontainers, which is where these queries should be proven.</p>`,
    problems: [{
      title: 'Turn a Derived Query Method Name into JPQL',
      level: 'Hard', tags: ['spring-data', 'parsing', 'strings'], companies: ['VMware', 'Microsoft', 'Atlassian'],
      statement: `<p>Write ${C('String derive(String entity, String method)')} that converts a Spring Data method name into a query string with alias <code>e</code>:</p>
<ul><li><b>Subject</b> (text before the first <code>By</code>): starts with <code>count</code> → <code>select count(e)</code>; otherwise <code>select e</code>, or <code>select distinct e</code> if it contains <code>Distinct</code>. <code>TopN</code>/<code>FirstN</code> → <code> limit N</code>; bare <code>Top</code>/<code>First</code> or an <code>exists</code> prefix → <code> limit 1</code>.</li>
<li><b>Predicates</b> (after By, before an optional <code>OrderBy</code>): split on <code>And</code>/<code>Or</code> followed by an uppercase letter; join with <code> and </code>/<code> or </code>. Property = name with first letter lowercased. Suffixes: <code>IsNotNull</code>/<code>NotNull</code> → <code>is not null</code>; <code>IsNull</code>/<code>Null</code> → <code>is null</code>; <code>GreaterThanEqual</code> <code>&gt;=</code>; <code>LessThanEqual</code> <code>&lt;=</code>; <code>GreaterThan</code> <code>&gt;</code>; <code>LessThan</code> <code>&lt;</code>; <code>Between</code> → <code>between ?i and ?j</code>; <code>StartingWith</code> → <code>like concat(?i, '%')</code>; <code>Containing</code> → <code>like concat('%', ?i, '%')</code>; <code>Like</code>; <code>NotIn</code>; <code>In</code>; <code>Not</code> → <code>&lt;&gt;</code>; <code>True</code>/<code>False</code> → <code>= true/false</code>; otherwise equality (a trailing <code>Is</code> or <code>Equals</code> is dropped). Parameters are numbered ?1, ?2 … left to right.</li>
<li><b>OrderBy</b>: properties each followed by <code>Asc</code>/<code>Desc</code> (followed by an uppercase letter or the end); the last may omit it (asc) → <code> order by e.a desc, e.b asc</code>.</li></ul>
<p>Format: <code>select … from Entity e[ where …][ order by …][ limit n]</code>.</p>`,
      constraints: `Method names are valid; property names do not themselves end in an operator keyword or contain And/Or followed by an uppercase letter.`,
      example: `<p>("Person", "findTop3ByAgeBetweenOrderByAgeDescNameAsc") → ${H.c('g', '"select e from Person e where e.age between ?1 and ?2 order by e.age desc, e.name asc limit 3"')}.</p>`,
      brute: { why: `<p>Hard-coding a regex per known method shape (one for "findByX", one for "findByXAndY"...) explodes combinatorially. Treat the name as a tiny grammar: subject, predicate list, order list, and parse each piece with suffix tables.</p>`, code: `
static String deriveBrute(String entity, String method) {
    if (method.startsWith("findBy") && !method.contains("And") && !method.contains("Or")) {
        String p = method.substring(6);
        return "select e from " + entity + " e where e." + Character.toLowerCase(p.charAt(0)) + p.substring(1) + " = ?1";
    }
    return "unsupported";   // every new shape needs another branch
}` },
      mcq: { q: 'Why does Spring Data fail at startup when a derived method name has a typo like <code>findByLastNmae</code>?', options: ['The JVM checks method names', 'PartTree parsing validates each property path against the entity metamodel when the repository is created', 'Hibernate validates SQL on the first call', 'It does not fail; it returns an empty list'], answer: 1, explain: 'Repository proxies are created at startup; derived queries are parsed and property paths resolved then, throwing PropertyReferenceException.' },
      hints: [`<p>Hint 1: cut the string in three: subject (before the first "By"), criteria, and the order part after "OrderBy".</p>`, `<p>Hint 2: for criteria, scan left to right and split where "And"/"Or" is followed by an uppercase letter. For each part try suffixes from the longest/most specific first (IsNotNull before NotNull before Null, NotIn before In).</p>`, `<p>Hint 3: keep a running parameter counter: Between uses two, Null/True/False use none. For OrderBy, repeatedly find the earliest "Asc"/"Desc" followed by uppercase or the end.</p>`],
      tests: { sig: 'string string -> string', fn: 'derive', cases: [
        [['Person', 'findByLastName'], 'select e from Person e where e.lastName = ?1'],
        [['Person', 'findByLastNameAndAgeGreaterThan'], 'select e from Person e where e.lastName = ?1 and e.age > ?2'],
        [['Person', 'findDistinctByCityOrCountryOrderByNameAsc'], 'select distinct e from Person e where e.city = ?1 or e.country = ?2 order by e.name asc'],
        [['Person', 'countByActiveTrue'], 'select count(e) from Person e where e.active = true'],
        [['Person', 'existsByEmail'], 'select e from Person e where e.email = ?1 limit 1'],
        [['Person', 'findTop3ByAgeBetweenOrderByAgeDescNameAsc'], 'select e from Person e where e.age between ?1 and ?2 order by e.age desc, e.name asc limit 3'],
        [['Order', 'findByShippedAtIsNullAndStatusIn'], 'select e from Order e where e.shippedAt is null and e.status in ?1'],
        [['Book', 'findFirstByTitleStartingWithOrderByDescription'], "select e from Book e where e.title like concat(?1, '%') order by e.description asc limit 1"],
        [['Person', 'findByAgeGreaterThanEqualAndAgeLessThanEqual'], 'select e from Person e where e.age >= ?1 and e.age <= ?2'],
        [['Person', 'findByNameNotAndManagerIsNotNull'], 'select e from Person e where e.name <> ?1 and e.manager is not null'],
        [['Person', 'findByOrderByNameDesc'], 'select e from Person e order by e.name desc'],
        [['Book', 'countByTitleContainingOrIsbnNotIn'], "select count(e) from Book e where e.title like concat('%', ?1, '%') or e.isbn not in ?2"],
        [['User', 'findByActiveIsFalseAndNameIsAndAgeLessThan'], 'select e from User e where e.active = false and e.name = ?1 and e.age < ?2'],
        [['User', 'readTop10ByScoreGreaterThanOrderByScoreDescCreatedAt'], 'select e from User e where e.score > ?1 order by e.score desc, e.createdAt asc limit 10']
      ] },
      solution: {
        approach: `<p>Three small parsers. Subject: prefix and flags. Criteria: manual split on And/Or + suffix table (ordered so longer keywords win) + a parameter counter. Order: repeatedly find the earliest Asc/Desc that ends a word. This is a simplified version of Spring Data's ${C('PartTree')} / ${C('Part.Type')} keyword table.</p>`,
        code: `
public class DerivedQuery {
    // suffix, template (%1$s = property, %2$d = first param, %3$d = second param), params used
    static final String[][] OPS = {
        {"IsNotNull", "%1$s is not null", "0"}, {"NotNull", "%1$s is not null", "0"},
        {"IsNull", "%1$s is null", "0"}, {"Null", "%1$s is null", "0"},
        {"GreaterThanEqual", "%1$s >= ?%2$d", "1"}, {"LessThanEqual", "%1$s <= ?%2$d", "1"},
        {"GreaterThan", "%1$s > ?%2$d", "1"}, {"LessThan", "%1$s < ?%2$d", "1"},
        {"Between", "%1$s between ?%2$d and ?%3$d", "2"},
        {"StartingWith", "%1$s like concat(?%2$d, '%%')", "1"},
        {"Containing", "%1$s like concat('%%', ?%2$d, '%%')", "1"},
        {"Like", "%1$s like ?%2$d", "1"}, {"NotIn", "%1$s not in ?%2$d", "1"}, {"In", "%1$s in ?%2$d", "1"},
        {"Not", "%1$s <> ?%2$d", "1"}, {"True", "%1$s = true", "0"}, {"False", "%1$s = false", "0"}
    };

    static String derive(String entity, String method) {
        int by = method.indexOf("By");
        String head = method.substring(0, by), rest = method.substring(by + 2);
        StringBuilder q = new StringBuilder();
        if (head.startsWith("count")) q.append("select count(e)");
        else q.append(head.contains("Distinct") ? "select distinct e" : "select e");
        q.append(" from ").append(entity).append(" e");

        int ob = rest.indexOf("OrderBy");
        String crit = ob >= 0 ? rest.substring(0, ob) : rest;
        String order = ob >= 0 ? rest.substring(ob + 7) : "";

        if (!crit.isEmpty()) {
            q.append(" where ");
            int param = 1, start = 0;
            String conj = "";
            for (int i = 1; i <= crit.length(); i++) {
                boolean end = i == crit.length();
                String sep = end ? null : crit.startsWith("And", i) ? "And" : crit.startsWith("Or", i) ? "Or" : null;
                if (sep != null && (i + sep.length() >= crit.length() || !Character.isUpperCase(crit.charAt(i + sep.length())))) sep = null;
                if (end || sep != null) {
                    q.append(conj);
                    param = predicate(crit.substring(start, i), param, q);
                    if (!end) { conj = sep.equals("And") ? " and " : " or "; start = i + sep.length(); i = start; }
                }
            }
        }
        if (!order.isEmpty()) {
            q.append(" order by ");
            int start = 0;
            boolean first = true;
            while (start < order.length()) {
                int best = -1; String dir = "asc";
                for (String d : new String[]{"Asc", "Desc"}) {
                    for (int j = order.indexOf(d, start + 1); j >= 0; j = order.indexOf(d, j + 1)) {
                        int after = j + d.length();
                        if (after == order.length() || Character.isUpperCase(order.charAt(after))) {
                            if (best < 0 || j < best) { best = j; dir = d.toLowerCase(); }
                            break;
                        }
                    }
                }
                String prop = best < 0 ? order.substring(start) : order.substring(start, best);
                if (!first) q.append(", ");
                q.append("e.").append(lower(prop)).append(' ').append(best < 0 ? "asc" : dir);
                first = false;
                start = best < 0 ? order.length() : best + (dir.equals("asc") ? 3 : 4);
            }
        }
        int limit = 0;
        int t = Math.max(head.indexOf("Top"), head.indexOf("First"));
        if (t >= 0) {
            int k = t + (head.startsWith("Top", t) ? 3 : 5), n = 0;
            while (k < head.length() && Character.isDigit(head.charAt(k))) n = n * 10 + (head.charAt(k++) - '0');
            limit = n == 0 ? 1 : n;
        }
        if (head.startsWith("exists")) limit = 1;
        if (limit > 0) q.append(" limit ").append(limit);
        return q.toString();
    }

    // Appends one predicate and returns the next parameter number.
    static int predicate(String part, int param, StringBuilder q) {
        for (String[] op : OPS) {
            if (part.endsWith(op[0]) && part.length() > op[0].length()) {
                String prop = strip(part.substring(0, part.length() - op[0].length()));
                q.append(String.format(op[1], "e." + lower(prop), param, param + 1));
                return param + Integer.parseInt(op[2]);
            }
        }
        q.append("e.").append(lower(strip(part))).append(" = ?").append(param);
        return param + 1;
    }

    static String strip(String p) {               // drop a trailing Is / Equals
        if (p.endsWith("Equals") && p.length() > 6) return p.substring(0, p.length() - 6);
        if (p.endsWith("Is") && p.length() > 2) return p.substring(0, p.length() - 2);
        return p;
    }

    static String lower(String p) { return Character.toLowerCase(p.charAt(0)) + p.substring(1); }

    public static void main(String[] args) {
        System.out.println(derive("Person", "findTop3ByAgeBetweenOrderByAgeDescNameAsc"));
    }
}`,
        dry: { head: ['piece', 'parsed as', 'output so far'], rows: [
          ['findTop3', 'select e, limit 3', 'select e from Person e'],
          ['AgeBetween', 'between, params ?1 ?2', '... where e.age between ?1 and ?2'],
          ['OrderBy AgeDesc', 'e.age desc', '... order by e.age desc'],
          ['NameAsc', 'e.name asc', '..., e.name asc limit 3']
        ] },
        complexity: `<p>O(L × K) for a name of length L and K operator keywords; tiny in practice and done once at startup in the real framework.</p>`,
        followUps: ['Add IgnoreCase (upper(e.x) = upper(?1)) and AllIgnoreCase', 'Support nested property paths like AddressCity → e.address.city using the entity metamodel']
      }
    }]
  });

  /* ======================================================================
     PRACTICE ARENA — Easy
     ====================================================================== */
  practice.push({
    title: 'Count SELECTs with Proxies and getReference',
    level: 'Easy', tags: ['proxy', 'first-level-cache', 'getReference'], companies: ['Infosys', 'Cognizant', 'SAP'],
    statement: `<p>Count the SELECT statements one persistence context runs. Each id is either absent, an <b>uninitialised proxy</b>, or a <b>loaded</b> entity. Operations:</p>
<ul><li><code>find X</code>: absent → SELECT, loaded; proxy → SELECT (find initialises the proxy and returns it); loaded → nothing.</li>
<li><code>ref X</code> (${C('getReference')}): absent → becomes a proxy, no SQL; otherwise nothing.</li>
<li><code>id X</code>: calling ${C('getId()')} on the reference never needs SQL.</li>
<li><code>touch X</code>: reading another property: proxy → SELECT, loaded; loaded → nothing. (X is always present.)</li>
<li><code>clear</code>: the context becomes empty.</li></ul>`,
    constraints: `0 ≤ ops ≤ 10<sup>5</sup>.`,
    example: `<p>["ref 1","ref 2","ref 3","touch 2","find 3","id 1"] → ${H.c('g', '2')}: touching proxy 2 loads it, find on proxy 3 loads it, ${C('getId()')} on proxy 1 is free.</p>`,
    brute: { why: `<p>Counting one SELECT per find/touch ignores the identity map and proxies: it overcounts every repeated access, which is exactly the misunderstanding that makes people fear "too many queries" where there are none.</p>`, code: `
static int selectsBrute(String[] ops) {
    int n = 0;
    for (String op : ops) if (op.startsWith("find") || op.startsWith("touch")) n++; // ignores caching
    return n;
}` },
    mcq: { q: 'Which call does NOT initialise a Hibernate proxy?', options: ['proxy.getName()', 'proxy.getId()', 'Hibernate.initialize(proxy)', 'em.find(Type.class, id) for the same id'], answer: 1, explain: 'The proxy already knows its identifier, so getId() is answered without SQL (with property access or the default Hibernate 6 behaviour).' },
    hints: [`<p>Hint 1: a map from id to a tiny state ("proxy" or "loaded") is all you need.</p>`, `<p>Hint 2: only two transitions cost a SELECT: absent → loaded (find) and proxy → loaded (find or touch).</p>`, `<p>Hint 3: <code>ref</code> and <code>id</code> never cost anything; <code>clear</code> resets the map.</p>`],
    tests: { sig: 'string[] -> int', fn: 'selects', cases: [
      [[['find 1', 'find 1']], 1], [[['ref 1', 'id 1']], 0], [[['ref 1', 'touch 1', 'touch 1']], 1], [[['ref 1', 'find 1']], 1],
      [[['find 1', 'ref 1', 'touch 1']], 1], [[['find 1', 'clear', 'find 1', 'ref 2', 'find 2', 'touch 2']], 3], [[[]], 0],
      [[['ref 1', 'ref 2', 'ref 3', 'touch 2', 'find 3', 'id 1']], 2]
    ] },
    solution: {
      approach: `<p>Track each id's state in a ${C('HashMap<String, Boolean>')} (false = proxy, true = loaded). Count a SELECT whenever an id moves to loaded from absent or proxy.</p>`,
      code: `
public class ProxyCounter {
    static int selects(String[] ops) {
        Map<String, Boolean> pc = new HashMap<>();   // id -> loaded? (false = uninitialised proxy)
        int selects = 0;
        for (String op : ops) {
            String[] p = op.split(" ");
            switch (p[0]) {
                case "find", "touch" -> {
                    Boolean loaded = pc.get(p[1]);
                    if (loaded == null || !loaded) { selects++; pc.put(p[1], true); }
                }
                case "ref" -> pc.putIfAbsent(p[1], false);
                case "id" -> { }                         // identifier is inside the proxy
                case "clear" -> pc.clear();
                default -> throw new IllegalArgumentException(op);
            }
        }
        return selects;
    }

    public static void main(String[] args) {
        System.out.println(selects(new String[]{"ref 1", "ref 2", "ref 3", "touch 2", "find 3", "id 1"})); // 2
    }
}`,
      complexity: `<p>O(n) time, O(distinct ids) space.</p>`,
      followUps: ['Model touch after clear: what exception does real Hibernate throw?', 'When is getReference better than find (e.g. setting a @ManyToOne by id)?']
    }
  });

  practice.push({
    title: 'Entity equals and hashCode That Survive persist()',
    level: 'Easy', tags: ['equals', 'hashCode', 'entity', 'hashset'], companies: ['Amazon', 'ThoughtWorks', 'Wipro'],
    statement: `<p>Write class ${C('Book')} with fields ${C('Long id')} (null until persisted) and ${C('String isbn')}, a constructor ${C('Book(Long id, String isbn)')}, and ${C('equals')}/${C('hashCode')} that follow the safe JPA pattern:</p>
<ul><li>an object equals itself;</li><li>two different objects are equal only if both ids are non-null and equal;</li><li>it works with Hibernate proxy subclasses (use ${C('instanceof')}, not ${C('getClass()')} equality);</li><li>a Book put into a ${C('HashSet')} before persist is still found after the id is assigned.</li></ul>`,
    constraints: `Tests also create a subclass ${C('BookProxy extends Book')} to imitate a Hibernate proxy.`,
    example: `<p>${C('Book b = new Book(null, "x"); set.add(b); b.id = 1L; set.contains(b)')} → ${H.c('g', 'true')} with a constant hashCode; ${H.c('r', 'false')} with ${C('Objects.hash(id)')}.</p>`,
    brute: { why: `<p>${C('Objects.hash(id)')} changes when the id is generated, so the object sits in the wrong HashSet bucket and ${C('contains')} fails. Lombok's ${C('@EqualsAndHashCode')} over all fields is worse: it also touches lazy collections.</p>`, code: `
class BookBrute {
    Long id; String isbn;
    BookBrute(Long id, String isbn) { this.id = id; this.isbn = isbn; }
    @Override public boolean equals(Object o) {
        return o instanceof BookBrute b && Objects.equals(id, b.id);   // two new books are "equal"!
    }
    @Override public int hashCode() { return Objects.hash(id); }      // changes after persist
}` },
    mcq: { q: 'Why is <code>getClass() != o.getClass()</code> risky in an entity equals?', options: ['It is slow', 'A Hibernate proxy is a generated subclass, so a proxy and the real entity would never be equal', 'getClass can return null', 'It breaks serialization'], answer: 1, explain: 'Proxies are subclasses created by ByteBuddy. Use instanceof (or Hibernate.getClass) so a proxy equals the entity with the same id.' },
    hints: [`<p>Hint 1: the hash code must not change during the object's life, so it cannot depend on the generated id.</p>`, `<p>Hint 2: a constant like ${C('getClass().hashCode()')} or ${C('31')} is correct; all books share a bucket, which is fine for the small sets entities live in.</p>`, `<p>Hint 3: in equals: same reference → true; not a Book → false; otherwise ${C('id != null && id.equals(other.id)')}.</p>`],
    tests: { sig: 'string -> bool', fn: 'chk', harness: { java: `
class BookProxy extends Book {
  BookProxy(Long id) { super(id, null); }
}
class Check {
  static boolean chk(String s) {
    switch (s) {
      case "set-after-persist": { Set<Book> set = new HashSet<>(); Book b = new Book(null, "x"); set.add(b); b.id = 1L; return set.contains(b); }
      case "two-new": return new Book(null, "a").equals(new Book(null, "a"));
      case "same-id": return new Book(5L, "a").equals(new Book(5L, "b"));
      case "diff-id": return new Book(5L, "a").equals(new Book(6L, "a"));
      case "self-new": { Book b = new Book(null, "q"); return b.equals(b); }
      case "null": return new Book(1L, "a").equals(null);
      case "set-two-new": { Set<Book> set = new HashSet<>(); set.add(new Book(null, "a")); set.add(new Book(null, "a")); return set.size() == 2; }
      case "proxy": return new Book(9L, "z").equals(new BookProxy(9L)) && new BookProxy(9L).equals(new Book(9L, "z"));
      case "hash-stable": { Book b = new Book(null, "h"); int h = b.hashCode(); b.id = 77L; return h == b.hashCode(); }
      default: throw new IllegalArgumentException(s);
    }
  }
}` }, cases: [
      [['set-after-persist'], true], [['two-new'], false], [['same-id'], true], [['diff-id'], false], [['self-new'], true],
      [['null'], false], [['set-two-new'], true], [['proxy'], true], [['hash-stable'], true]
    ] },
    solution: {
      approach: `<p>Identity-based equality with a null guard, plus a constant hash code. Equal objects always share the constant hash, so the contract holds, and the hash never changes when Hibernate assigns the id.</p>`,
      code: `
class Book {
    Long id;            // generated by the database/sequence on persist
    String isbn;

    Book(Long id, String isbn) { this.id = id; this.isbn = isbn; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;                 // same object, even before persist
        if (!(o instanceof Book other)) return false; // instanceof accepts proxy subclasses
        return id != null && id.equals(other.id);   // two new books are never equal
    }

    @Override
    public int hashCode() {
        return Book.class.hashCode();               // constant: stable across persist
    }
}`,
      complexity: `<p>O(1) per call. A constant hash makes large HashSets of entities degrade to O(n) lookups, which is acceptable because entity collections are small; for big sets prefer a natural key.</p>`,
      followUps: ['Rewrite equals using the immutable ISBN as a natural (business) key, and annotate it with @NaturalId', 'Why does Book.class.hashCode() behave better than getClass().hashCode() with proxies?']
    }
  });

  practice.push({
    title: 'Default Fetch Types by Annotation',
    level: 'Easy', tags: ['fetch-type', 'mapping', 'jpa-spec'], companies: ['TCS', 'HCL', 'Capgemini'],
    statement: `<p>Return the JPA <b>default</b> fetch type for a mapping annotation name: ${C('ManyToOne')}, ${C('OneToOne')}, ${C('OneToMany')}, ${C('ManyToMany')}, ${C('ElementCollection')}, ${C('Basic')}. Return ${C('"UNKNOWN"')} for anything else.</p>`,
    constraints: `Input is a single annotation name without the @ sign.`,
    example: `<p>"ManyToOne" → ${H.c('y', '"EAGER"')}: to-one associations are eager by default, which is why experts set ${C('fetch = LAZY')} on every one of them.</p>`,
    brute: { why: `<p>Guessing "everything is lazy" is the most common wrong answer: the spec makes to-one associations and basic attributes EAGER. A lookup keeps the rule explicit and testable.</p>`, code: `
static String guess(String a) {
    return "LAZY";   // wrong for ManyToOne, OneToOne and Basic
}` },
    mcq: { q: 'Which mapping is EAGER by default in Jakarta Persistence?', options: ['@OneToMany', '@ManyToMany', '@ManyToOne', '@ElementCollection'], answer: 2, explain: 'The spec defaults to-one associations (@ManyToOne, @OneToOne) to EAGER and collections to LAZY.' },
    hints: [`<p>Hint 1: the rule is "to-one and basic → EAGER, collections → LAZY".</p>`, `<p>Hint 2: a switch expression with grouped case labels is the cleanest code.</p>`, `<p>Hint 3: anything not in the list falls into the default branch.</p>`],
    tests: { sig: 'string -> string', fn: 'defaultFetch', cases: [
      [['ManyToOne'], 'EAGER'], [['OneToOne'], 'EAGER'], [['OneToMany'], 'LAZY'], [['ManyToMany'], 'LAZY'],
      [['ElementCollection'], 'LAZY'], [['Basic'], 'EAGER'], [['Embedded'], 'UNKNOWN'], [[''], 'UNKNOWN']
    ] },
    solution: {
      approach: `<p>Encode the spec table in a switch: to-one and basic are EAGER, collection-valued mappings are LAZY.</p>`,
      code: `
public class FetchDefaults {
    static String defaultFetch(String annotation) {
        return switch (annotation) {
            case "ManyToOne", "OneToOne", "Basic" -> "EAGER";               // spec defaults
            case "OneToMany", "ManyToMany", "ElementCollection" -> "LAZY";
            default -> "UNKNOWN";
        };
    }
}`,
      complexity: `<p>O(1): one switch on a short string.</p>`,
      followUps: ['Why is the inverse side of @OneToOne effectively always eager without bytecode enhancement?', 'How do you make a @Basic @Lob column lazy in Hibernate 6?']
    }
  });

  /* ======================================================================
     PRACTICE ARENA — Medium
     ====================================================================== */
  practice.push({
    title: 'Generate the UPDATE Statement (with and without @DynamicUpdate)',
    level: 'Medium', tags: ['dirty-checking', 'dynamic-update', 'sql'], companies: ['Oracle', 'Intuit', 'Salesforce'],
    statement: `<p>Given a table, its columns, the snapshot values and the current values, return the UPDATE Hibernate would send at flush: <code>"update T set c1=?, c2=? where id=?"</code>. Without ${C('@DynamicUpdate')} (<code>dynamic = false</code>) every column is in the SET list; with it, only changed columns are. Return ${C('""')} when nothing changed.</p>`,
    constraints: `0 ≤ columns ≤ 100; the three arrays have equal length; values are compared as strings.`,
    example: `<p>product, [name, price, stock], [Pen, 10, 5] → [Pen, 12, 5]: static → ${H.c('b', '"update product set name=?, price=?, stock=? where id=?"')}; dynamic → ${H.c('g', '"update product set price=? where id=?"')}.</p>`,
    brute: { why: `<p>Always writing all columns, even when nothing changed, sends useless UPDATEs (and fires triggers, bumps versions, causes replication traffic). Dirty checking exists to skip them.</p>`, code: `
static String always(String table, String[] cols) {
    return "update " + table + " set " + String.join("=?, ", cols) + "=? where id=?"; // even if unchanged
}` },
    mcq: { q: 'Why is a full-column UPDATE the Hibernate default?', options: ['It is required by JDBC', 'One prepared statement per entity can be cached and batched', 'It prevents lost updates', 'Databases cannot update single columns'], answer: 1, explain: 'A fixed SQL string per entity is generated once, reused, and batches well. @DynamicUpdate trades that for smaller statements.' },
    hints: [`<p>Hint 1: first collect the indexes where before ≠ after.</p>`, `<p>Hint 2: if that list is empty return "" in both modes.</p>`, `<p>Hint 3: build the SET list from either all columns or the changed ones, joined with ", ".</p>`],
    tests: { sig: 'string string[] string[] string[] bool -> string', fn: 'updateSql', cases: [
      [['product', ['name', 'price', 'stock'], ['Pen', '10', '5'], ['Pen', '12', '5'], false], 'update product set name=?, price=?, stock=? where id=?'],
      [['product', ['name', 'price', 'stock'], ['Pen', '10', '5'], ['Pen', '12', '5'], true], 'update product set price=? where id=?'],
      [['product', ['name', 'price'], ['Pen', '10'], ['Pen', '10'], false], ''],
      [['product', ['name', 'price'], ['Pen', '10'], ['Pen', '10'], true], ''],
      [['t', ['a', 'b'], ['1', '2'], ['3', '4'], true], 'update t set a=?, b=? where id=?'],
      [['t', ['a'], ['x'], ['y'], true], 'update t set a=? where id=?'],
      [['t', [], [], [], false], ''],
      [['product', ['name', 'price', 'stock'], ['Pen', '10', '5'], ['Ink', '10', '6'], true], 'update product set name=?, stock=? where id=?']
    ] },
    solution: {
      approach: `<p>One pass to find changed columns, an early return for "not dirty", then a ${C('StringJoiner')} over the chosen columns.</p>`,
      code: `
public class UpdateBuilder {
    static String updateSql(String table, String[] cols, String[] before, String[] after, boolean dynamic) {
        List<String> changed = new ArrayList<>();
        for (int i = 0; i < cols.length; i++)
            if (!before[i].equals(after[i])) changed.add(cols[i]);   // dirty check
        if (changed.isEmpty()) return "";                            // not dirty: no UPDATE at all
        StringJoiner set = new StringJoiner(", ");
        for (String c : dynamic ? changed : Arrays.asList(cols)) set.add(c + "=?");
        return "update " + table + " set " + set + " where id=?";
    }
}`,
      complexity: `<p>O(columns) time and space for the changed list and the SQL string.</p>`,
      followUps: ['Add a version column: what does the WHERE clause become?', 'How does @DynamicUpdate interact with @OptimisticLocking(type = DIRTY)?']
    }
  });

  practice.push({
    title: 'Row Lock Manager: Wait, NOWAIT and SKIP LOCKED',
    level: 'Medium', tags: ['pessimistic-locking', 'skip-locked', 'simulation'], companies: ['Uber', 'DoorDash', 'Grab'],
    statement: `<p>Simulate ${C('PESSIMISTIC_WRITE')} row locks. Ops: <code>"T lock r"</code> (wait if needed), <code>"T lock r nowait"</code>, <code>"T lock r skip"</code>, <code>"T commit"</code>. Return an event list:</p>
<ul><li>free row, or already owned by T → <code>"T acquired r"</code></li>
<li>owned by another: default → <code>"T waits r"</code> (FIFO queue); nowait → <code>"T PessimisticLockException r"</code>; skip → <code>"T skipped r"</code></li>
<li>commit → <code>"T commit"</code>, then T's rows are released in ascending row order; each released row goes to the first waiter → <code>"W acquired r"</code></li></ul>`,
    constraints: `A waiting transaction issues no ops until it acquires its lock. Rows are non-negative ints.`,
    example: `<p>["A lock 2","A lock 1","B lock 1","C lock 2","A commit"] → ${H.c('g', '["A acquired 2","A acquired 1","B waits 1","C waits 2","A commit","B acquired 1","C acquired 2"]')}.</p>`,
    brute: { why: `<p>Scanning every past op to recompute who owns a row on each request is O(n²). A map from row to owner plus a queue per row makes every op O(1) except commit, which is O(rows held).</p>`, code: `
static String ownerOf(List<String> history, int row) {
    String owner = null;
    for (String h : history) {                          // replay everything each time
        String[] p = h.split(" ");
        if (p[1].equals("acquired") && Integer.parseInt(p[2]) == row) owner = p[0];
        if (p[1].equals("commit") && p[0].equals(owner)) owner = null;
    }
    return owner;
}` },
    mcq: { q: 'Many workers poll a jobs table. Which lock option lets each worker take different rows without waiting?', options: ['PESSIMISTIC_READ', 'NOWAIT', 'SKIP LOCKED', 'OPTIMISTIC_FORCE_INCREMENT'], answer: 2, explain: 'FOR UPDATE SKIP LOCKED silently skips rows locked by others, so workers spread across free rows.' },
    hints: [`<p>Hint 1: keep ${C('Map<Integer, String> owner')} and ${C('Map<Integer, Deque<String>> waiters')}.</p>`, `<p>Hint 2: on commit, collect the rows owned by T, sort them, remove T as owner, and hand each row to ${C('waiters.poll()')} if any.</p>`, `<p>Hint 3: re-locking a row you already own succeeds (locks are re-entrant inside one transaction).</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'locks', cases: [
      [[['A lock 1', 'B lock 1', 'A commit', 'B commit']], ['A acquired 1', 'B waits 1', 'A commit', 'B acquired 1', 'B commit']],
      [[['A lock 1', 'B lock 1 nowait']], ['A acquired 1', 'B PessimisticLockException 1']],
      [[['A lock 1', 'B lock 1 skip', 'B lock 2 skip']], ['A acquired 1', 'B skipped 1', 'B acquired 2']],
      [[['A lock 2', 'A lock 1', 'B lock 1', 'C lock 2', 'A commit']], ['A acquired 2', 'A acquired 1', 'B waits 1', 'C waits 2', 'A commit', 'B acquired 1', 'C acquired 2']],
      [[['A lock 1', 'A lock 1']], ['A acquired 1', 'A acquired 1']],
      [[['A lock 1', 'B lock 1', 'C lock 1', 'A commit', 'B commit', 'C commit']], ['A acquired 1', 'B waits 1', 'C waits 1', 'A commit', 'B acquired 1', 'B commit', 'C acquired 1', 'C commit']],
      [[[]], []],
      [[['A commit']], ['A commit']]
    ] },
    solution: {
      approach: `<p>Owner map + FIFO queue per row. Requests check the owner; commit releases in sorted order and promotes the head of each queue. This is a toy version of a database lock table.</p>`,
      code: `
public class RowLocks {
    static String[] locks(String[] ops) {
        Map<Integer, String> owner = new HashMap<>();
        Map<Integer, Deque<String>> waiters = new HashMap<>();
        List<String> out = new ArrayList<>();
        for (String op : ops) {
            String[] p = op.split(" ");
            String tx = p[0];
            if (p[1].equals("commit")) {
                out.add(tx + " commit");
                List<Integer> mine = new ArrayList<>();
                for (Map.Entry<Integer, String> e : owner.entrySet()) if (e.getValue().equals(tx)) mine.add(e.getKey());
                Collections.sort(mine);
                for (int row : mine) {
                    owner.remove(row);
                    Deque<String> q = waiters.get(row);
                    if (q != null && !q.isEmpty()) {
                        String next = q.poll();
                        owner.put(row, next);
                        out.add(next + " acquired " + row);
                    }
                }
                continue;
            }
            int row = Integer.parseInt(p[2]);
            String mode = p.length > 3 ? p[3] : "wait";
            String cur = owner.get(row);
            if (cur == null || cur.equals(tx)) { owner.put(row, tx); out.add(tx + " acquired " + row); }
            else if (mode.equals("nowait")) out.add(tx + " PessimisticLockException " + row);
            else if (mode.equals("skip")) out.add(tx + " skipped " + row);
            else { waiters.computeIfAbsent(row, k -> new ArrayDeque<>()).add(tx); out.add(tx + " waits " + row); }
        }
        return out.toArray(new String[0]);
    }
}`,
      complexity: `<p>O(1) per lock request; commit is O(locks in the table) here (O(locks held) with a per-transaction index).</p>`,
      followUps: ['Add lock timeouts: a waiter gives up after k other operations', 'Add deadlock detection (see the Hard problem)']
    }
  });

  practice.push({
    title: 'Optimistic Retries Under Real Concurrency',
    level: 'Medium', tags: ['optimistic-locking', 'retry', 'threads'], companies: ['Stripe', 'Coinbase', 'Revolut'],
    statement: `<p>Write a versioned row with ${C('read()')} → <code>{value, version}</code> and ${C('update(expectedVersion, newValue)')} that succeeds only if the version still matches (then increments it). Start <code>threads</code> threads; each performs <code>increments</code> increments using read → compute → update, <b>retrying</b> on a version conflict, exactly like a service retrying on ${C('OptimisticLockException')}. Join all threads and return <code>{value, version}</code>.</p>`,
    constraints: `1 ≤ threads ≤ 16, 0 ≤ increments ≤ 10<sup>5</sup>, threads × increments ≤ 10<sup>5</sup>.`,
    example: `<p>4 threads × 1000 increments → ${H.c('g', '[4000, 4000]')}: no increment is lost, and every successful update bumped the version once. The number of retries varies per run, the totals never do.</p>`,
    brute: { why: `<p>Read, add one, then write <b>without</b> checking the version: two threads read 41, both write 42, one increment is lost. Under contention the final value is far below threads × increments.</p>`, code: `
static long lostUpdates(int threads, int increments) throws InterruptedException {
    long[] value = {0};
    Thread[] ts = new Thread[threads];
    for (int t = 0; t < threads; t++) {
        ts[t] = new Thread(() -> {
            for (int k = 0; k < increments; k++) {
                long v;
                synchronized (value) { v = value[0]; }       // read
                synchronized (value) { value[0] = v + 1; }   // blind write: lost updates
            }
        });
        ts[t].start();
    }
    for (Thread t : ts) t.join();
    return value[0];
}` },
    mcq: { q: 'After an OptimisticLockException in a Spring service, what should the retry do?', options: ['Call flush() again', 'Re-run the whole transaction: reload the entity and reapply the change', 'Set the version field manually and save', 'Switch isolation to READ_UNCOMMITTED'], answer: 1, explain: 'The failed persistence context holds stale state and the transaction is rolled back; only a fresh transaction with a fresh read can succeed.' },
    hints: [`<p>Hint 1: make ${C('read')} and ${C('update')} ${C('synchronized')} so each is atomic, like single SQL statements; the gap between them is where conflicts happen.</p>`, `<p>Hint 2: each increment is a loop: read, try update with the version you read, break on success.</p>`, `<p>Hint 3: start all threads, then ${C('join')} every one before reading the final state. Never sleep to wait.</p>`],
    tests: { sig: 'int int -> long[]', fn: 'run', cases: [
      [[1, 1], [1, 1]], [[4, 1000], [4000, 4000]], [[8, 500], [4000, 4000]], [[2, 0], [0, 0]],
      [[1, 100000], [100000, 100000]], [[16, 100], [1600, 1600]], [[16, 6250], [100000, 100000]]
    ] },
    solution: {
      approach: `<p>The row's compare-and-set update mirrors ${C('UPDATE ... WHERE version = ?')}. Each worker retries until its CAS succeeds, so every increment is applied exactly once; the version counts successful writes.</p>`,
      code: `
public class OptimisticRetry {
    static final class VersionedRow {
        private long value, version;
        synchronized long[] read() { return new long[]{value, version}; }          // SELECT value, version
        synchronized boolean update(long expectedVersion, long newValue) {          // UPDATE ... WHERE version = ?
            if (version != expectedVersion) return false;                           // 0 rows affected
            value = newValue;
            version++;
            return true;
        }
    }

    static long[] run(int threads, int increments) throws InterruptedException {
        VersionedRow row = new VersionedRow();
        Thread[] ts = new Thread[threads];
        for (int t = 0; t < threads; t++) {
            ts[t] = new Thread(() -> {
                for (int k = 0; k < increments; k++) {
                    while (true) {                                  // retry loop
                        long[] s = row.read();
                        if (row.update(s[1], s[0] + 1)) break;      // conflict -> read again
                    }
                }
            });
            ts[t].start();
        }
        for (Thread t : ts) t.join();
        return row.read();
    }

    public static void main(String[] args) throws InterruptedException {
        System.out.println(Arrays.toString(run(4, 1000))); // [4000, 4000]
    }
}`,
      complexity: `<p>O(threads × increments) successful updates plus retries; retries grow with contention, which is why hot rows suit pessimistic locks or atomic SQL increments better.</p>`,
      followUps: ['Count conflicts with an AtomicLong and compare 2 vs 16 threads', 'Replace the retry with a single atomic SQL statement: update counter set v = v + 1 where id = ?']
    }
  });

  practice.push({
    title: 'Page vs Slice: How Many Queries and What Metadata?',
    level: 'Medium', tags: ['spring-data', 'pagination', 'page', 'slice'], companies: ['LinkedIn', 'Zomato', 'Meesho'],
    statement: `<p>A table has <code>total</code> matching rows. Page numbers start at 0. Content size = rows on that page (0 … size). Return:</p>
<ul><li><code>kind = "page"</code> → <code>[queries, contentSize, totalPages]</code> where totalPages = ⌈total/size⌉. Spring Data skips the count query (queries = 1) when the offset is 0 and the content is smaller than size, or when the offset is &gt; 0 and the content is non-empty but smaller than size; otherwise it runs it (queries = 2).</li>
<li><code>kind = "slice"</code> → <code>[1, contentSize, hasNext ? 1 : 0]</code> (Slice fetches size + 1 rows; hasNext means more rows exist after this page).</li></ul>`,
    constraints: `0 ≤ total ≤ 10<sup>9</sup>, 0 ≤ page ≤ 10<sup>6</sup>, 1 ≤ size ≤ 1000. Use long arithmetic for page × size.`,
    example: `<p>(95, 4, 20, "page") → offset 80, content 15 &lt; 20 and non-empty → total = 80 + 15 is known without counting → ${H.c('g', '[1, 15, 5]')}.</p>`,
    brute: { why: `<p>Always issuing the count query is what a naive implementation does; on large tables the <code>count(*)</code> with the same filters is often slower than the page query itself.</p>`, code: `
static int[] alwaysCount(int total, int page, int size) {
    int content = Math.max(0, Math.min(size, total - page * size));   // also overflows for big pages
    return new int[]{2, content, (total + size - 1) / size};
}` },
    mcq: { q: 'Which return type avoids the COUNT query entirely?', options: ['Page&lt;T&gt;', 'Slice&lt;T&gt;', 'List&lt;T&gt; with Pageable is impossible', 'Stream&lt;T&gt; always counts'], answer: 1, explain: 'Slice reads size + 1 rows to know if there is a next slice; it never counts. (List&lt;T&gt; with a Pageable also skips the count.)' },
    hints: [`<p>Hint 1: offset = page × size (as long); content = clamp(total − offset, 0, size).</p>`, `<p>Hint 2: the two "count skipped" conditions come from Spring's ${C('PageableExecutionUtils.getPage')}: in both cases the total can be computed as offset + content.</p>`, `<p>Hint 3: Slice: hasNext ⇔ total &gt; offset + size. Watch the empty page beyond the end: content 0 means the count is needed for a Page.</p>`],
    tests: { sig: 'int int int string -> int[]', fn: 'pageMeta', cases: [
      [[95, 0, 20, 'page'], [2, 20, 5]], [[95, 4, 20, 'page'], [1, 15, 5]], [[15, 0, 20, 'page'], [1, 15, 1]], [[100, 5, 20, 'page'], [2, 0, 5]],
      [[95, 0, 20, 'slice'], [1, 20, 1]], [[95, 4, 20, 'slice'], [1, 15, 0]], [[100, 4, 20, 'slice'], [1, 20, 0]], [[0, 0, 10, 'page'], [1, 0, 0]],
      [[40, 1, 20, 'page'], [2, 20, 2]], [[1000000000, 1000000, 1000, 'slice'], [1, 0, 0]], [[1000000000, 999999, 1000, 'page'], [2, 1000, 1000000]]
    ] },
    solution: {
      approach: `<p>Compute offset and content with longs, then apply Spring's two shortcut rules for Page, or the size + 1 look-ahead for Slice.</p>`,
      code: `
public class PagingMath {
    static int[] pageMeta(int total, int page, int size, String kind) {
        long offset = (long) page * size;
        int content = (int) Math.max(0, Math.min(size, total - offset));
        if (kind.equals("slice")) {
            boolean hasNext = total > offset + size;                 // the (size + 1)-th row exists
            return new int[]{1, content, hasNext ? 1 : 0};
        }
        boolean skipCount = (offset == 0 && content < size)          // first page not full
                || (offset > 0 && content > 0 && content < size);    // last, partial page
        int totalPages = (int) ((total + (long) size - 1) / size);
        return new int[]{skipCount ? 1 : 2, content, totalPages};
    }
}`,
      complexity: `<p>O(1): pure arithmetic, no loops.</p>`,
      followUps: ['How does keyset scrolling (Window, ScrollPosition) avoid deep OFFSET costs?', 'When is an approximate count (e.g. from pg_class.reltuples) acceptable?']
    }
  });

  practice.push({
    title: 'Which Ids Does @BatchSize Load Together?',
    level: 'Medium', tags: ['batch-fetching', 'lazy-loading', 'simulation'], companies: ['Booking.com', 'Expedia', 'Agoda'],
    statement: `<p>A query loaded owners in order <code>loaded</code>; each has an uninitialised lazy collection. The code then touches collections in order <code>access</code>. With batch size <code>size</code>, touching an uninitialised collection loads it <b>plus</b> the next uninitialised ones in load order (skipping the touched one) until the batch is full. Return one string per SQL batch: the loaded ids sorted ascending and joined with commas. Touching an initialised collection costs nothing.</p>`,
    constraints: `0 ≤ loaded ≤ 10<sup>5</sup> distinct ids; every accessed id is in <code>loaded</code>; 1 ≤ size ≤ 1000.`,
    example: `<p>loaded [1..5], access [3, 1, 5], size 2 → touch 3 loads {3, 1} → "1,3"; touch 1 is free; touch 5 loads {5, 2} → "2,5".</p>`,
    brute: { why: `<p>Loading one collection per touch is plain lazy loading (N+1). Re-scanning the whole loaded list for every touch to find uninitialised ids is O(n²); a ${C('LinkedHashSet')} that removes ids as they load keeps it linear.</p>`, code: `
static List<String> oneByOne(int[] loaded, int[] access) {
    Set<Integer> done = new HashSet<>();
    List<String> out = new ArrayList<>();
    for (int id : access) if (done.add(id)) out.add(String.valueOf(id)); // N+1: one SELECT per owner
    return out;
}` },
    mcq: { q: 'What does hibernate.default_batch_fetch_size change?', options: ['How many rows a fetch join returns', 'How many lazy proxies/collections are initialised per SELECT when one is touched', 'The JDBC insert batch size', 'The page size of Spring Data'], answer: 1, explain: 'It is the global default for @BatchSize: one touch initialises up to that many pending proxies or collections with an IN (or array) query.' },
    hints: [`<p>Hint 1: keep the uninitialised ids in a ${C('LinkedHashSet')} so you keep load order and can remove in O(1).</p>`, `<p>Hint 2: on a touch of a pending id, remove it, then take more ids from the front of the set with an iterator until the batch is full.</p>`, `<p>Hint 3: sort each batch before joining; skip touches of ids already loaded.</p>`],
    tests: { sig: 'int[] int[] int -> string[]', fn: 'batches', cases: [
      [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4], ['1,2,3,4', '5,6,7,8', '9,10']],
      [[[1, 2, 3, 4, 5], [3, 1, 5], 2], ['1,3', '2,5']],
      [[[7, 8], [8, 7, 8], 1], ['8', '7']],
      [[[], [], 3], []],
      [[[4, 2, 9], [9], 10], ['2,4,9']],
      [[[1, 2, 3], [2, 2, 2], 1], ['2']],
      [[[1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1], 3], ['1,2,6', '3,4,5']]
    ] },
    solution: {
      approach: `<p>A ${C('LinkedHashSet')} acts as Hibernate's batch-fetch queue: pending keys in registration order. Each touch of a pending key drains up to <code>size</code> keys.</p>`,
      code: `
public class BatchFetchQueue {
    static String[] batches(int[] loaded, int[] access, int size) {
        LinkedHashSet<Integer> pending = new LinkedHashSet<>();
        for (int id : loaded) pending.add(id);
        List<String> out = new ArrayList<>();
        for (int id : access) {
            if (!pending.remove(id)) continue;                // already initialised: no SQL
            List<Integer> batch = new ArrayList<>();
            batch.add(id);
            Iterator<Integer> it = pending.iterator();
            while (batch.size() < size && it.hasNext()) { batch.add(it.next()); it.remove(); }
            Collections.sort(batch);
            StringJoiner sj = new StringJoiner(",");
            for (int b : batch) sj.add(String.valueOf(b));
            out.add(sj.toString());                           // ... where owner_id in (batch)
        }
        return out.toArray(new String[0]);
    }
}`,
      complexity: `<p>O(n + total batch sorting) ≈ O(n log size) time, O(n) space.</p>`,
      followUps: ['How many batches for n owners all touched in order? (⌈n/size⌉)', 'Why might Hibernate pad batches to fixed sizes in older versions (legacy batch fetch style)?']
    }
  });

  /* ======================================================================
     PRACTICE ARENA — Hard
     ====================================================================== */
  practice.push({
    title: 'Cascade and orphanRemoval at Flush Time',
    level: 'Hard', tags: ['cascade', 'orphan-removal', 'flush-order'], companies: ['Atlassian', 'Workday', 'ServiceNow'],
    statement: `<p>A managed parent has a ${C('@OneToMany(cascade = ALL)')} collection whose children <code>existing</code> are already in the database. Process ops and return the SQL:</p>
<ul><li><code>add c</code>: a new child joins the collection (persisted by cascade at flush).</li>
<li><code>remove c</code>: take c out of the collection (the helper also clears c.parent). If c is not in the collection → <code>"error:c not in collection"</code>. Removing a child added since the last flush simply cancels it.</li>
<li><code>flush</code>: with <code>orphanRemoval</code>: <code>DELETE c</code> for removed persisted children <b>first</b> (Hibernate runs orphan removals before inserts), then <code>INSERT c</code> for added children. Without it: inserts first, then <code>UPDATE c parent=null</code> for removed persisted children. Use the order of the operations within each group.</li></ul>`,
    constraints: `Child names are unique; a name is never added twice. 0 ≤ ops ≤ 10<sup>5</sup>.`,
    example: `<p>existing [a, b], ["add c","remove a","flush"]: orphanRemoval → ${H.c('g', '["DELETE a","INSERT c"]')}; without → ${H.c('y', '["INSERT c","UPDATE a parent=null"]')} (a stays in the table as an orphan row).</p>`,
    brute: { why: `<p>Emitting SQL immediately for each add/remove ignores write-behind: an add followed by a remove before flush would INSERT then DELETE a row that never needed to exist, and the order would not match Hibernate's ActionQueue.</p>`, code: `
static List<String> immediate(String[] ops, boolean orphanRemoval) {
    List<String> sql = new ArrayList<>();
    for (String op : ops) {
        String[] p = op.split(" ");
        if (p[0].equals("add")) sql.add("INSERT " + p[1]);
        else if (p[0].equals("remove")) sql.add(orphanRemoval ? "DELETE " + p[1] : "UPDATE " + p[1] + " parent=null");
    }
    return sql;
}` },
    mcq: { q: 'Without orphanRemoval, what happens when you remove a child from a mappedBy collection and clear child.parent?', options: ['The child row is deleted', 'The child row stays with parent_id set to NULL', 'Nothing at all is written', 'Hibernate throws an exception'], answer: 1, explain: 'The owning side (child.parent) changed, so Hibernate updates the FK to NULL. Only orphanRemoval = true (or CascadeType.REMOVE on parent delete) deletes it.' },
    hints: [`<p>Hint 1: track three things: names currently in the collection, names that exist in the database, and the pending added/removed lists since the last flush.</p>`, `<p>Hint 2: removing a name that is not yet in the database just takes it out of the pending adds.</p>`, `<p>Hint 3: flush order depends on the flag: orphan DELETEs → INSERTs, or INSERTs → UPDATEs. Clear both pending lists afterwards.</p>`],
    tests: { sig: 'string[] string[] bool -> string[]', fn: 'flushChildren', cases: [
      [[['a', 'b'], ['add c', 'remove a', 'flush'], true], ['DELETE a', 'INSERT c']],
      [[['a', 'b'], ['add c', 'remove a', 'flush'], false], ['INSERT c', 'UPDATE a parent=null']],
      [[['a', 'b'], ['add c', 'remove c', 'flush'], true], []],
      [[['a', 'b'], ['remove x'], true], ['error:x not in collection']],
      [[['a', 'b'], ['remove a', 'remove b', 'add d', 'add e', 'flush', 'remove d', 'flush'], true], ['DELETE a', 'DELETE b', 'INSERT d', 'INSERT e', 'DELETE d']],
      [[[], [], false], []],
      [[['a', 'b'], ['add c', 'flush', 'remove c', 'flush'], false], ['INSERT c', 'UPDATE c parent=null']],
      [[[], ['add z', 'flush', 'flush'], true], ['INSERT z']],
      [[['a'], ['remove a', 'remove a', 'flush'], false], ['error:a not in collection', 'UPDATE a parent=null']]
    ] },
    solution: {
      approach: `<p>Model write-behind: memory changes until flush, with pending adds and removes. At flush apply the ActionQueue order (orphan removals before insertions; FK nulling updates after insertions).</p>`,
      code: `
public class CascadeFlush {
    static String[] flushChildren(String[] existing, String[] ops, boolean orphanRemoval) {
        Set<String> collection = new LinkedHashSet<>(Arrays.asList(existing));
        Set<String> inDb = new HashSet<>(Arrays.asList(existing));
        List<String> added = new ArrayList<>(), removed = new ArrayList<>(), sql = new ArrayList<>();
        for (String op : ops) {
            String[] p = op.split(" ");
            switch (p[0]) {
                case "add" -> { collection.add(p[1]); added.add(p[1]); }
                case "remove" -> {
                    if (!collection.remove(p[1])) { sql.add("error:" + p[1] + " not in collection"); break; }
                    if (inDb.contains(p[1])) removed.add(p[1]);
                    else added.remove(p[1]);                          // never flushed: just cancel
                }
                case "flush" -> {
                    if (orphanRemoval) for (String r : removed) { sql.add("DELETE " + r); inDb.remove(r); }
                    for (String a : added) { sql.add("INSERT " + a); inDb.add(a); }   // cascade PERSIST
                    if (!orphanRemoval) for (String r : removed) { sql.add("UPDATE " + r + " parent=null"); inDb.remove(r); }
                    added.clear();
                    removed.clear();
                }
                default -> throw new IllegalArgumentException(op);
            }
        }
        return sql.toArray(new String[0]);
    }
}`,
      complexity: `<p>O(1) average per op except cancelling a pending add (O(pending adds)) and flush (O(pending changes)).</p>`,
      followUps: ['Model "remove then re-add the same persisted child" before flush: what does Hibernate do?', 'Why can orphan removal running first help with unique constraints?']
    }
  });

  practice.push({
    title: 'Detect N+1 Patterns in a SQL Log',
    level: 'Hard', tags: ['n+1', 'string-processing', 'observability'], companies: ['Datadog', 'New Relic', 'Shopify'],
    statement: `<p>Given SQL statements as logged (with literal values), normalise each one by replacing every quoted string <code>'...'</code> with <code>?</code> and every numeric literal with <code>?</code>. A numeric literal is a run of digits (optionally with a decimal part like <code>9.99</code>) that does <b>not</b> follow a letter, digit or underscore (so <code>t2</code> and <code>a1</code> stay). Count identical normalised statements and return <code>"count x statement"</code> for those seen at least <code>threshold</code> times, ordered by first appearance.</p>`,
    constraints: `0 ≤ log ≤ 10<sup>5</sup> lines, each ≤ 2000 chars; quoted strings contain no quotes inside.`,
    example: `<p>["select * from author", "select * from book where author_id=1", "…=2", "…=3"], threshold 3 → ${H.c('r', '["3 x select * from book where author_id=?"]')}: the classic N+1 shape.</p>`,
    brute: { why: `<p>Comparing every pair of raw statements for "equal except numbers" is O(n² × length) and fiddly. Normalising each statement once into a canonical key and counting in a hash map is linear.</p>`, code: `
static boolean sameShape(String a, String b) {
    return a.replaceAll("[0-9]+", "?").equals(b.replaceAll("[0-9]+", "?")); // also breaks identifiers like t2
}` },
    mcq: { q: 'How do tools like Hypersistence Optimizer or datasource-proxy flag N+1 at test time?', options: ['By parsing Java bytecode', 'By intercepting JDBC statements and asserting counts / repeated statement shapes', 'By reading the database log only', 'They cannot; only APM can'], answer: 1, explain: 'A JDBC proxy sees every statement; tests assert the expected statement count, or that no statement shape repeats per row.' },
    hints: [`<p>Hint 1: write a normaliser that walks the string once with an index; handle quotes and numbers separately.</p>`, `<p>Hint 2: a number starts at a digit whose previous char is not a letter, digit or underscore; consume digits and a ".digits" part.</p>`, `<p>Hint 3: a ${C('LinkedHashMap<String, Integer>')} counts and keeps first-appearance order in one structure.</p>`],
    tests: { sig: 'string[] int -> string[]', fn: 'detect', cases: [
      [[['select * from author', 'select * from book where author_id=1', 'select * from book where author_id=2', 'select * from book where author_id=3'], 3], ['3 x select * from book where author_id=?']],
      [[['select * from author', 'select * from book where author_id=1', 'select * from book where author_id=2', 'select * from book where author_id=3'], 4], []],
      [[["select * from t where name='bob'", "select * from t where name='al'"], 2], ['2 x select * from t where name=?']],
      [[['select a1 from t2 where id=10'], 1], ['1 x select a1 from t2 where id=?']],
      [[[], 1], []],
      [[['select 1', 'select 2', 'update x set v=3 where id=4', 'update x set v=5 where id=6', 'select 3'], 2], ['3 x select ?', '2 x update x set v=? where id=?']],
      [[['select * from t where id in (1,2,3)', 'select * from t where id in (4,5,6)'], 2], ['2 x select * from t where id in (?,?,?)']],
      [[['select * from t where price>9.99', 'select * from t where price>10.5', 'select * from t_1 where x_2=7'], 2], ['2 x select * from t where price>?']]
    ] },
    solution: {
      approach: `<p>Single-pass normaliser (quotes → ?, standalone numbers → ?), then counting with insertion order. This is the core of N+1 detectors that group statements by "shape".</p>`,
      code: `
public class NPlusOneDetector {
    static String normalize(String s) {
        StringBuilder b = new StringBuilder();
        int i = 0, n = s.length();
        while (i < n) {
            char c = s.charAt(i);
            if (c == '\\'') {                                     // string literal
                int j = s.indexOf('\\'', i + 1);
                b.append('?');
                i = j < 0 ? n : j + 1;
            } else if (Character.isDigit(c) && (i == 0 || !isWord(s.charAt(i - 1)))) {
                int j = i;
                while (j < n && (Character.isDigit(s.charAt(j))
                        || (s.charAt(j) == '.' && j + 1 < n && Character.isDigit(s.charAt(j + 1))))) j++;
                b.append('?');                                     // numeric literal
                i = j;
            } else {
                b.append(c);
                i++;
            }
        }
        return b.toString();
    }

    static boolean isWord(char c) { return Character.isLetterOrDigit(c) || c == '_'; }

    static String[] detect(String[] log, int threshold) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String line : log) counts.merge(normalize(line), 1, Integer::sum);
        List<String> out = new ArrayList<>();
        for (Map.Entry<String, Integer> e : counts.entrySet())
            if (e.getValue() >= threshold) out.add(e.getValue() + " x " + e.getKey());
        return out.toArray(new String[0]);
    }
}`,
      complexity: `<p>O(total characters) time, O(distinct shapes × length) space.</p>`,
      followUps: ['Only flag shapes that repeat consecutively (a loop) rather than across the whole request', 'Collapse IN lists of different lengths into one shape: in (?,?) and in (?,?,?)']
    }
  });

  practice.push({
    title: 'Lock Manager with Deadlock Detection',
    level: 'Hard', tags: ['pessimistic-locking', 'deadlock', 'graphs'], companies: ['Google', 'Microsoft', 'Oracle'],
    statement: `<p>Extend a row-lock manager with deadlock detection. Ops: <code>"T lock r"</code> and <code>"T commit"</code>. Events:</p>
<ul><li>free or own row → <code>"T acquired r"</code>;</li>
<li>row owned by U: follow the wait-for chain from U (U waits for a row, owned by V, who waits for …). If the chain reaches T, granting the wait would close a cycle → <code>"T deadlock"</code>: T is rolled back (releases all its rows exactly like a commit, without a "commit" line). Otherwise → <code>"T waits r"</code> (FIFO).</li>
<li><code>"T commit"</code>, then T's rows released in ascending order; each goes to the first waiter → <code>"W acquired r"</code>.</li></ul>`,
    constraints: `A waiting transaction issues no ops until it gets its lock. 0 ≤ ops ≤ 10<sup>4</sup>.`,
    example: `<p>["A lock 1","B lock 2","A lock 2","B lock 1"] → ${H.c('r', '["A acquired 1","B acquired 2","A waits 2","B deadlock","A acquired 2"]')}: B would wait for A, who waits for B. B is the victim, its row 2 goes to A.</p>`,
    brute: { why: `<p>Without detection both transactions wait forever (real databases detect this, typically within about a second in PostgreSQL's ${C('deadlock_timeout')}, and abort one). Building the full wait-for graph and running a DFS for cycles on every request also works, but because each transaction waits for at most one row, the graph is a set of chains: following one pointer chain is enough.</p>`, code: `
static boolean hasCycleBrute(Map<String, String> waitsFor) {
    for (String start : waitsFor.keySet()) {            // O(n^2): walk from every node
        Set<String> seen = new HashSet<>();
        for (String x = start; x != null; x = waitsFor.get(x)) if (!seen.add(x)) return true;
    }
    return false;
}` },
    mcq: { q: 'Two transfers lock accounts in opposite order and deadlock. The most robust prevention is:', options: ['Increase the lock timeout', 'Always acquire row locks in a global order (e.g. ascending id)', 'Use READ_UNCOMMITTED', 'Retry forever'], answer: 1, explain: 'A consistent lock order makes a cycle in the wait-for graph impossible. Timeouts and retries only recover after the fact.' },
    hints: [`<p>Hint 1: keep owner per row, a FIFO of waiters per row, and ${C('waitingOn')}: transaction → row it waits for.</p>`, `<p>Hint 2: cycle check: x = owner(r); while x ≠ null: if x == T → deadlock; x = owner(waitingOn(x)) (stop if x is not waiting).</p>`, `<p>Hint 3: rollback and commit share one release routine: sorted rows, promote the first waiter, and remove the promoted one from ${C('waitingOn')}.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run', cases: [
      [[['A lock 1', 'B lock 2', 'A lock 2', 'B lock 1']], ['A acquired 1', 'B acquired 2', 'A waits 2', 'B deadlock', 'A acquired 2']],
      [[['A lock 1', 'B lock 1', 'A commit', 'B commit']], ['A acquired 1', 'B waits 1', 'A commit', 'B acquired 1', 'B commit']],
      [[['A lock 1', 'B lock 2', 'C lock 3', 'A lock 2', 'B lock 3', 'C lock 1']], ['A acquired 1', 'B acquired 2', 'C acquired 3', 'A waits 2', 'B waits 3', 'C deadlock', 'B acquired 3']],
      [[[]], []],
      [[['A lock 1', 'A lock 1', 'A commit']], ['A acquired 1', 'A acquired 1', 'A commit']],
      [[['A lock 1', 'B lock 2', 'C lock 1', 'B lock 1', 'A commit']], ['A acquired 1', 'B acquired 2', 'C waits 1', 'B waits 1', 'A commit', 'C acquired 1']],
      [[['A lock 1', 'B lock 1', 'C lock 2', 'A lock 2', 'C lock 1']], ['A acquired 1', 'B waits 1', 'C acquired 2', 'A waits 2', 'C deadlock', 'A acquired 2']]
    ] },
    solution: {
      approach: `<p>Each transaction waits for at most one row, so the wait-for graph is a forest of chains. Before enqueuing a waiter, walk the chain from the row's owner; reaching the requester means a cycle, so the requester is the victim and is rolled back through the same release routine as commit.</p>`,
      code: `
public class DeadlockDetector {
    static Map<Integer, String> owner;
    static Map<Integer, Deque<String>> waiters;
    static Map<String, Integer> waitingOn;
    static List<String> out;

    static String[] run(String[] ops) {
        owner = new HashMap<>(); waiters = new HashMap<>(); waitingOn = new HashMap<>(); out = new ArrayList<>();
        for (String op : ops) {
            String[] p = op.split(" ");
            String tx = p[0];
            if (p[1].equals("commit")) { out.add(tx + " commit"); release(tx); continue; }
            int row = Integer.parseInt(p[2]);
            String cur = owner.get(row);
            if (cur == null || cur.equals(tx)) { owner.put(row, tx); out.add(tx + " acquired " + row); continue; }
            boolean cycle = false;
            for (String x = cur; x != null; ) {                  // follow the wait-for chain
                if (x.equals(tx)) { cycle = true; break; }
                Integer w = waitingOn.get(x);
                x = w == null ? null : owner.get(w);
            }
            if (cycle) { out.add(tx + " deadlock"); release(tx); }   // victim rolls back
            else {
                waiters.computeIfAbsent(row, k -> new ArrayDeque<>()).add(tx);
                waitingOn.put(tx, row);
                out.add(tx + " waits " + row);
            }
        }
        return out.toArray(new String[0]);
    }

    static void release(String tx) {
        List<Integer> mine = new ArrayList<>();
        for (Map.Entry<Integer, String> e : owner.entrySet()) if (e.getValue().equals(tx)) mine.add(e.getKey());
        Collections.sort(mine);
        for (int row : mine) {
            owner.remove(row);
            Deque<String> q = waiters.get(row);
            if (q != null && !q.isEmpty()) {
                String next = q.poll();
                owner.put(row, next);
                waitingOn.remove(next);
                out.add(next + " acquired " + row);
            }
        }
    }
}`,
      complexity: `<p>Lock request O(chain length) ≤ O(transactions); release O(rows in the table) here.</p>`,
      followUps: ['Choose the victim with the least work done instead of the requester', 'How do PostgreSQL and MySQL InnoDB detect deadlocks, and what does the application see?']
    }
  });

  practice.push({
    title: 'Count JDBC Batches at Flush',
    level: 'Hard', tags: ['jdbc-batching', 'order-inserts', 'identity'], companies: ['Flipkart', 'Walmart', 'Target'],
    statement: `<p>Hibernate sends INSERTs at flush using JDBC batches of at most <code>size</code> statements; a batch only holds consecutive statements with the same SQL (same entity). Given entity names in persist order, return how many database round trips the inserts need:</p>
<ul><li>names starting with <code>*</code> use ${C('IDENTITY')} ids: each is executed immediately at persist time (1 round trip each) and does not take part in flush batching;</li>
<li><code>orderInserts = false</code>: batch consecutive runs of the same entity (after removing IDENTITY ones), each run costs ⌈run/size⌉;</li>
<li><code>orderInserts = true</code> (${C('hibernate.order_inserts')}): inserts are grouped by entity (groups in first-appearance order), each group costs ⌈count/size⌉.</li></ul>`,
    constraints: `0 ≤ inserts ≤ 10<sup>6</sup>, 1 ≤ size ≤ 1000.`,
    example: `<p>["Post","Comment","Post","Comment"], size 10: unordered → 4 round trips (runs of 1); ordered → ${H.c('g', '2')} (all Posts, then all Comments).</p>`,
    brute: { why: `<p>Counting one round trip per insert is what you get with IDENTITY everywhere or without batching configured: 10,000 rows = 10,000 round trips, at ~0.5 ms each that is 5 s of pure network latency.</p>`, code: `
static int noBatching(String[] inserts) {
    return inserts.length;   // one round trip per row
}` },
    mcq: { q: 'Why does GenerationType.IDENTITY disable JDBC insert batching in Hibernate?', options: ['IDENTITY columns cannot be indexed', 'Hibernate must execute the INSERT immediately to learn the generated id for the persistence context', 'JDBC forbids batching with auto-increment', 'It does not; it only disables update batching'], answer: 1, explain: 'The id is the persistence-context key. With IDENTITY it only exists after the INSERT, so persist() executes the INSERT right away instead of queuing it.' },
    hints: [`<p>Hint 1: count and remove IDENTITY entities first; they each cost exactly one round trip.</p>`, `<p>Hint 2: unordered: walk the list counting run lengths; ordered: a ${C('LinkedHashMap<String, Integer>')} of counts.</p>`, `<p>Hint 3: ceiling division ${C('(k + size - 1) / size')}; an empty list costs 0.</p>`],
    tests: { sig: 'string[] int bool -> int', fn: 'roundTrips', cases: [
      [[['Post', 'Comment', 'Post', 'Comment'], 10, false], 4], [[['Post', 'Comment', 'Post', 'Comment'], 10, true], 2],
      [[['Post', 'Post', 'Post'], 2, false], 2], [[[], 5, true], 0],
      [[['A', 'A', 'B', 'B', 'A'], 2, false], 3], [[['A', 'A', 'B', 'B', 'A'], 2, true], 3],
      [[['A', 'B', 'A', 'B', 'A', 'B'], 3, true], 2], [[['A', 'B', 'A', 'B', 'A', 'B'], 3, false], 6],
      [[['X'], 1, false], 1], [[['*Log', 'Post', '*Log', 'Post'], 10, false], 3], [[['*A', '*A'], 5, true], 2],
      [[{ $rep: 'Row', n: 100000 }, 50, false], 2000]
    ] },
    solution: {
      approach: `<p>Split IDENTITY inserts out (one trip each), then count batches either over consecutive runs or over per-entity groups, using ceiling division.</p>`,
      code: `
public class InsertBatches {
    static int roundTrips(String[] inserts, int size, boolean orderInserts) {
        int trips = 0;
        List<String> queued = new ArrayList<>();
        for (String e : inserts) {
            if (e.startsWith("*")) trips++;            // IDENTITY: executed at persist() time
            else queued.add(e);
        }
        if (orderInserts) {
            Map<String, Integer> groups = new LinkedHashMap<>();
            for (String e : queued) groups.merge(e, 1, Integer::sum);
            for (int k : groups.values()) trips += (k + size - 1) / size;
        } else {
            int i = 0;
            while (i < queued.size()) {
                int j = i;
                while (j < queued.size() && queued.get(j).equals(queued.get(i))) j++;
                trips += (j - i + size - 1) / size;    // one run of identical SQL
                i = j;
            }
        }
        return trips;
    }
}`,
      complexity: `<p>O(n) time, O(n) space for the queued list (O(distinct entities) for the ordered map).</p>`,
      followUps: ['Why does order_inserts respect parent/child foreign keys when sorting?', 'Add hibernate.order_updates and versioned updates: what must the JDBC driver report for batching to stay safe?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: `What does ${C('Order m = em.merge(o)')} do when <code>o</code> is detached?`, options: ['Makes o managed and returns it', 'Copies o\'s state onto a managed instance and returns that instance; o stays detached', 'Inserts a new row every time', 'Throws because o is detached'], answer: 1, explain: `merge never attaches its argument. It loads (or finds) the managed instance with the same id, copies state onto it and returns it. Keep using <code>m</code>.` },
    { q: `Inside one transaction you call ${C('em.find(User.class, 5)')} twice. How many SELECTs run?`, options: ['0', '1', '2', 'Depends on the second-level cache only'], answer: 1, explain: `The first call loads the row and puts the entity in the persistence context; the second returns the same object from this identity map.` },
    { q: `Which statement order does Hibernate use at flush?`, options: ['Exactly the order your code called persist/remove', 'DELETEs, then UPDATEs, then INSERTs', 'Orphan removals, INSERTs, UPDATEs, collection changes, then DELETEs', 'Alphabetical by table name'], answer: 2, explain: `The ActionQueue executes in a fixed order. That is why deleting and re-inserting the same unique key needs an explicit flush in between.` },
    { q: `A managed entity's field is changed and then set back to its original value before commit. What happens?`, options: ['No UPDATE is sent', 'One UPDATE is sent', 'Two UPDATEs are sent', 'An exception is thrown'], answer: 0, explain: `Dirty checking compares current values with the load-time snapshot at flush. They are equal, so the entity is not dirty.` },
    { q: `100 authors are loaded with JPQL; their books collection is mapped ${C('fetch = EAGER')} with no fetch join. How many queries?`, options: ['1', '2', '101', '200'], answer: 2, explain: `JPQL does not apply the mapping's join. Hibernate runs the query, then loads each eager collection with a secondary select: N+1 on every use.` },
    { q: `What causes ${C('MultipleBagFetchException')}?`, options: ['Fetching two List (bag) collections in one query with join fetch', 'Using @BatchSize on two collections', 'Calling find twice', 'A lazy @ManyToOne'], answer: 0, explain: `Two unordered bags joined in one result produce a Cartesian product Hibernate cannot reliably split. Fetch them in separate queries or rely on batch fetching.` },
    { q: `What does the second-level cache store?`, options: ['Live entity objects shared across threads', 'Disassembled entity state (column values and ids) keyed by entity and id', 'Full SQL result sets', 'HTTP responses'], answer: 1, explain: `L2 entries are dehydrated arrays. On a hit Hibernate assembles a new object for the session, so sessions never share mutable instances.` },
    { q: `Which lookups can be served by the second-level cache without the query cache?`, options: ['Any JPQL query', 'find by id and resolving associations by id', 'Native SQL queries', 'Aggregates like count(*)'], answer: 1, explain: `L2 is keyed by id. Queries go to the database unless the query cache is enabled for them (and then they only cache id lists).` },
    { q: `A ${C('@Transactional')} method calls another public ${C('@Transactional(propagation = REQUIRES_NEW)')} method on <code>this</code>. What happens?`, options: ['A new transaction starts', 'The annotation is ignored because the call bypasses the Spring proxy', 'Spring throws IllegalTransactionStateException', 'The outer transaction is suspended'], answer: 1, explain: `Transaction rules are applied by the proxy. A self-call goes straight to the target object, so the inner method runs in the outer transaction.` },
    { q: `By default, which exception makes a Spring ${C('@Transactional')} method roll back?`, options: ['Any Exception', 'Only checked exceptions', 'RuntimeException and Error', 'Only SQLException'], answer: 2, explain: `Checked exceptions commit unless listed in rollbackFor. This mirrors the old EJB convention.` },
    { q: `What SQL does Hibernate generate for an UPDATE on an entity with ${C('@Version')}?`, options: ['UPDATE ... WHERE id = ?', 'UPDATE ... SET version = version + 1, ... WHERE id = ? AND version = ?', 'SELECT ... FOR UPDATE then UPDATE', 'UPDATE with SERIALIZABLE isolation'], answer: 1, explain: `The version predicate is a compare-and-set; zero affected rows raises OptimisticLockException.` },
    { q: `What does a lock timeout hint of 0 (${C('jakarta.persistence.lock.timeout = 0')}) usually translate to?`, options: ['Wait forever', 'NOWAIT: fail immediately if the row is locked', 'SKIP LOCKED', 'Disable locking'], answer: 1, explain: `0 means do not wait. Hibernate renders NOWAIT where the dialect supports it. SKIP LOCKED uses Hibernate's special value -2.` },
    { q: `Which Spring Data projection makes the SQL select only the needed columns?`, options: ['An open interface projection with @Value SpEL', 'A closed interface projection or a DTO record', 'Returning the entity and mapping in Java', 'A projection never changes the SQL'], answer: 1, explain: `Closed interfaces and DTO constructor expressions tell Spring exactly which properties are needed. Open projections need the whole entity.` },
    { q: `Why does ${C('repository.save(entity)')} run a SELECT before the INSERT when the id is assigned in Java?`, options: ['Spring validates uniqueness', 'isNew() is false because the id is non-null, so save() calls merge, which loads the row', 'Hibernate always selects before insert', 'The database requires it'], answer: 1, explain: `SimpleJpaRepository decides persist vs merge with isNew(). Implement Persistable or use a nullable @Version to mark new entities.` },
    { q: `Which return type avoids the count query when paging?`, options: ['Page&lt;T&gt;', 'Slice&lt;T&gt;', 'Iterable&lt;T&gt; with findAll()', 'Optional&lt;T&gt;'], answer: 1, explain: `Slice fetches size + 1 rows to know whether a next slice exists and never runs count(*).` }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: `Explain the four entity lifecycle states and the difference between persist and merge.`, level: 'I', a: `<p><b>Transient</b>: a new object, unknown to JPA. <b>Managed</b>: in a persistence context; changes are tracked and flushed. <b>Detached</b>: has a row but its context closed (or detach/clear was called); changes are ignored. <b>Removed</b>: managed but scheduled for DELETE at flush.</p><p>${C('persist(e)')} makes <i>that object</i> managed and is meant for new entities (a detached one throws "detached entity passed to persist"). ${C('merge(e)')} copies the state of e onto a managed instance (loading it if needed) and returns that instance; e itself stays detached. Typical bug: calling merge and continuing to modify the argument.</p>`, followUps: [`What does Spring Data's save() call, and how does it decide?`, `What happens if you merge an entity whose id does not exist in the database?`] },
    { q: `What is the persistence context, and what guarantees does it give?`, level: 'I', a: `<p>It is the per-EntityManager map of (entity type, id) → managed object, also called the first-level cache. Guarantees: (1) <b>identity</b> — one Java object per row inside the context, so find twice returns the same instance and runs one SELECT; (2) <b>automatic dirty checking</b> — snapshots taken at load are compared at flush and only changed entities are updated; (3) <b>write-behind</b> — SQL is delayed until flush so statements can be ordered and batched. It is typically scoped to a transaction in Spring. Costs: memory for entities plus snapshots, and O(n) dirty checking per flush, so batch jobs must flush and clear periodically.</p>`, followUps: [`When does Hibernate flush automatically?`, `How does @Transactional(readOnly = true) change the persistence context's behaviour?`] },
    { q: `How does Hibernate's dirty checking work, and how can you make it cheaper?`, level: 'A', a: `<p>When an entity is loaded, Hibernate stores a copy of its property values (loaded state) in the EntityEntry. At flush, for each managed entity it reads current values and calls each type's isDirty against the snapshot; dirty entities get an UPDATE (all columns by default). This is O(entities × properties) per flush, and AUTO flush can run before every query.</p><p>Cheaper options: keep contexts small (flush/clear in batches), use read-only transactions or query hints (no snapshots), DTO projections for reads, bytecode enhancement with dirty tracking (setters record changed attributes, no full comparison), StatelessSession for bulk work, and @DynamicUpdate when tables are wide and only a few columns change.</p>`, followUps: [`Why can a mutable custom type lose changes?`, `What is the trade-off of @DynamicUpdate?`] },
    { q: `A page shows 50 orders with their customer and items. The log shows 101 queries. Walk through how you fix it.`, level: 'A', a: `<p>Diagnose: 1 query for orders, 50 for lazy customers (@ManyToOne) and 50 for items collections: N+1 twice. Fixes, by use case: (1) a fetch join or entity graph for the customer (to-one joins do not multiply rows); (2) for items, a second query with join fetch for the same order ids, or @BatchSize/default_batch_fetch_size so 50 collections load in ⌈50/size⌉ queries; avoid joining two collections at once (MultipleBagFetchException or a Cartesian product). (3) If the page needs paging, page ids first, then fetch the graph by ids, because SQL LIMIT with a collection fetch is applied in memory. (4) If the page only displays fields, use a DTO projection. Finally, lock it in with a statement-count assertion in a test.</p>`, followUps: [`Why is switching to EAGER the wrong fix?`, `How would you detect N+1 regressions in CI?`] },
    { q: `Compare fetch joins, entity graphs, batch fetching and SUBSELECT fetching.`, level: 'A', a: `<p><b>Fetch join</b>: one SQL with joins, per query; best for to-one and a single collection; cannot paginate collections in SQL; multiple bags fail. <b>Entity graph</b>: same SQL as a fetch join but declared per repository method (fetchgraph vs loadgraph semantics), so it keeps queries reusable. <b>Batch fetching</b> (@BatchSize, default_batch_fetch_size): stays lazy, but initialising one proxy/collection loads up to N pending ones with an IN/array query: 1 + ⌈n/N⌉ queries, works with paging and is a great global safety net. <b>SUBSELECT</b>: first access loads the collection for all owners of the original query using it as a subquery: 2 queries, but re-runs the possibly expensive original query.</p>`, followUps: [`What is the difference between fetchgraph and loadgraph?`, `Why does Hibernate 6 no longer need DISTINCT for fetch joins?`] },
    { q: `Explain LazyInitializationException and the right and wrong ways to fix it.`, level: 'I', a: `<p>A lazy proxy or collection is touched after its persistence context closed (for example in a controller or JSON serializer after the service transaction ended), so Hibernate has no session to load it. <b>Right fixes</b>: fetch what the use case needs inside the transaction (fetch join, entity graph, Hibernate.initialize), or return DTOs built inside the transaction. <b>Wrong fixes</b>: making the association EAGER (loads it everywhere), enabling open-session-in-view (hides the problem, holds connections longer, N+1 in views) or ${C('hibernate.enable_lazy_load_no_trans')} (opens a new session and connection per lazy load).</p>`, followUps: [`What does spring.jpa.open-in-view do and why do teams disable it?`, `How do you serialize entities with Jackson safely?`] },
    { q: `First-level vs second-level vs query cache: when would you enable L2, and what can go wrong?`, level: 'A', a: `<p>L1 is the persistence context: per transaction, always on. L2 is shared by all sessions of an EntityManagerFactory and stores dehydrated state by id; it helps for read-mostly entities loaded by id or resolved through associations (reference data, configuration, catalog items). The query cache maps query + parameters to id lists, and is invalidated by any write to the involved tables.</p><p>Risks: stale data when other systems write the database, cluster nodes with separate local caches, memory pressure, cached collections whose elements are not cached (N loads after a "hit"), and query caches on write-heavy tables that cost more than they save. Choose the concurrency strategy (READ_ONLY, NONSTRICT_READ_WRITE, READ_WRITE, TRANSACTIONAL) per entity and measure hit ratios with Statistics.</p>`, followUps: [`How does the READ_WRITE strategy avoid caching stale data during an update?`, `Why do bulk/native updates evict whole regions?`] },
    { q: `Walk through what happens when a REQUIRED method calls another REQUIRED method that throws, and the caller catches the exception.`, level: 'A', a: `<p>Both methods participate in one physical transaction. When the inner method's proxy sees a RuntimeException, it cannot roll back a transaction it did not start, so it marks the transaction <b>rollback-only</b>. The outer method catches the exception and returns normally; its proxy tries to commit, finds the rollback-only flag, rolls back and throws ${C('UnexpectedRollbackException')}. So nothing is saved and the caller gets an exception it did not expect. Options: let the exception propagate, make the inner work REQUIRES_NEW or NESTED if it is truly independent, use ${C('noRollbackFor')} for expected business exceptions, or validate before calling instead of using exceptions for control flow.</p>`, followUps: [`What changes with REQUIRES_NEW? With NESTED?`, `Why can REQUIRES_NEW exhaust the connection pool?`] },
    { q: `Why does @Transactional sometimes do nothing?`, level: 'I', a: `<p>Because it is implemented by a proxy. It is ignored for self-invocation (this.method()), for methods not visible to the proxy (private; final methods with CGLIB proxies), for beans not managed by Spring (created with new), when the exception is checked and no rollbackFor is set (it commits), when the exception is caught inside the method, when the work is done on another thread (@Async, CompletableFuture), and when the wrong transaction manager is used with several data sources. Debug by enabling ${C('JpaTransactionManager')} debug logs, or check ${C('TransactionSynchronizationManager.isActualTransactionActive()')}.</p>`, followUps: [`How do you call a transactional method on the same class correctly?`, `What is TransactionTemplate and when is it clearer?`] },
    { q: `How would you prevent lost updates in an "edit product" feature used by many admins?`, level: 'A', a: `<p>Add ${C('@Version')} to the entity. Send the version to the client (hidden field or ETag); on save, require it (If-Match) and compare with the current version, or merge a detached entity carrying it, so Hibernate's UPDATE has ${C('WHERE version = ?')}. A conflict raises OptimisticLockException; return HTTP 409/412 and let the user reload and reapply, or merge non-conflicting fields. For automated writers (background jobs) retry the whole transaction with backoff. Pessimistic locks are a poor fit here because they would have to be held across user think time.</p>`, followUps: [`What does @OptimisticLocking(type = DIRTY) change?`, `Why must the retry reload the entity in a new transaction?`] },
    { q: `When do you choose pessimistic locking, and how do you use it safely in JPA?`, level: 'A', a: `<p>When conflicts are frequent and retrying is expensive or unacceptable: booking the last seat, decrementing stock under flash-sale load, workers claiming jobs. Use ${C('LockModeType.PESSIMISTIC_WRITE')} (SELECT ... FOR UPDATE), always with a lock timeout hint so requests do not hang; NOWAIT (timeout 0) to fail fast; SKIP LOCKED for queues. Keep the transaction short, lock rows in a consistent order (ascending id) to avoid deadlocks, never call remote services while holding locks, and handle PessimisticLockException/LockTimeoutException. Often an atomic conditional UPDATE (set stock = stock - 1 where id = ? and stock &gt; 0) is simpler than any lock.</p>`, followUps: [`What does FOR UPDATE lock when the query has joins?`, `How do databases detect deadlocks and what does the application see?`] },
    { q: `How do Spring Data derived queries work, and when would you use @Query, projections or Specifications instead?`, level: 'I', a: `<p>At startup Spring parses each method name into a PartTree (subject like find/count/exists/TopN, predicates joined by And/Or with keywords such as GreaterThan, Between, In, IsNull, and an OrderBy clause), validates property paths against the entity and builds a Criteria query. Use them for short, obvious queries. Switch to ${C('@Query')} when the name gets long, needs joins, fetch joins or aggregates; to <b>projections</b> (closed interfaces or DTO records) when the caller only needs some columns; to <b>Specifications</b>/Querydsl when filters are optional and combinable; to ${C('@Modifying')} queries for bulk updates (with clearAutomatically); and to Slice or keyset Window scrolling for large result sets.</p>`, followUps: [`Why can deleteByX be slow?`, `What does Page do that Slice does not?`] },
    { q: `Your batch import of 2 million rows with Spring Data JPA takes an hour. How do you speed it up?`, level: 'E', a: `<p>Check the basics first: (1) id generation — IDENTITY disables JDBC batching; switch to a SEQUENCE with a pooled optimizer (allocationSize 50+). (2) Enable ${C('hibernate.jdbc.batch_size')} (e.g. 50), ${C('order_inserts')} and ${C('order_updates')}; for PostgreSQL add ${C('reWriteBatchedInserts=true')} on the JDBC URL. (3) Flush and clear the EntityManager every batch so the persistence context and dirty checking stay small. (4) Avoid saveAll on entities with assigned ids (merge SELECTs): implement Persistable. (5) Disable L2 cache interaction (CacheMode.IGNORE) and cascades you do not need. (6) For pure loading, a StatelessSession, JdbcTemplate batchUpdate or the database's COPY/LOAD DATA is often 10× faster. Measure with Hibernate statistics and the database's view of statements per second.</p>`, followUps: [`Why does flush/clear matter for both memory and CPU?`, `How do you make the import restartable after a failure halfway?`] }
  );

  registerModule({
    id: 'java16',
    title: 'JPA & Hibernate Deep Dive',
    intro: `<p>Backend Data Access taught you how an ORM maps rows to objects and how to spot an N+1 query in a log. This module opens the hood of <b>Jakarta Persistence 3 and Hibernate 6</b>, the stack behind almost every Spring Boot service. You will learn exactly what happens between ${C('em.persist()')} and the SQL that reaches the database: the four lifecycle states, the <b>persistence context</b> and its snapshots, <b>dirty checking</b> and flush order, proxies and lazy loading, the three cures for N+1 (fetch joins, entity graphs, batch fetching), the first- and second-level caches, ${C('@Transactional')} propagation and isolation (and why self-invocation silently ignores it), optimistic ${C('@Version')} checks and pessimistic row locks, and Spring Data JPA repositories, derived queries and projections.</p>
<p>Frameworks cannot run in this sandbox, so JPA and Spring snippets are marked as illustrative, while every exercise models the mechanism in <b>plain Java</b> you can run and test: a persistence context with dirty checking, a query counter for fetch strategies, a cache simulator, a propagation table, version checks and a derived-query parser. Interviewers at product companies ask exactly these "what SQL runs here?" questions.</p>`,
    goals: [
      'Name the lifecycle state of an entity on any line of code and explain persist vs merge, owning side vs mappedBy, and safe equals/hashCode',
      'Explain the persistence context as an identity map with snapshots, predict which INSERT/UPDATE/DELETE statements a flush produces and in what order',
      'Count the queries for lazy loading, EAGER, fetch joins, entity graphs, @BatchSize and SUBSELECT, and pick the right fix for an N+1 or a MultipleBagFetchException',
      'Configure the second-level and query caches correctly and explain when they help or hurt',
      'Predict commit/rollback outcomes for REQUIRED, REQUIRES_NEW, NESTED and self-invocation, and choose isolation levels for real anomalies',
      'Implement optimistic locking with @Version and retries, and pessimistic locks with timeouts, NOWAIT and SKIP LOCKED',
      'Write Spring Data JPA repositories with derived queries, @Query, projections and pagination that run the minimum SQL'
    ],
    prereqs: `Java 15 and SQL 5 on the path; Backend Data Access (be03, be08) helps: JDBC, transactions, basic ORM mapping, N+1 basics and locking basics. Comfortable with Java collections, generics and annotations.`,
    hours: 16,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
