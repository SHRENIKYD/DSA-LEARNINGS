(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- tiny helpers shared by all visualizers ---------- */
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function TXT(html, label) { var p = { type: 'text', html: html }; if (label) p.label = label; return p; }
  function VARS(label, vals, hl) { return { type: 'vars', label: label, vals: clone(vals), hl: hl || {} }; }
  function CODE(label, code, hl) { return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; }
  function TABLE(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns, rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }; }
  function clone(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function pick(input, options, hint) {
    var k = String(input === undefined ? '' : input).trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(options, k)) throw new Error(hint);
    return options[k];
  }
  function nums(str, hint) {
    var t = String(str === undefined ? '' : str).trim().split(/[\s,]+/).filter(function (s) { return s.length; });
    var a = t.map(Number);
    if (!a.length || a.some(function (x) { return isNaN(x); })) throw new Error(hint);
    return a;
  }
  function r2(x) { return Math.round(x * 100) / 100; }

  /* ======================= TOPIC 1: THREAD-SAFE DESIGN BASICS ======================= */
  topics.push({
    title: 'Thread-Safe Design: Races, Invariants & the Three Cures',
    analogy: `<p>Picture a <b>cricket scoreboard</b> written on a whiteboard, with <b>two scorers</b>. A run is scored. Scorer A looks at the board: "41". Scorer B also looks: "41". A wipes and writes "42". B wipes and writes "42". Two runs were scored, but the board says <b>one</b>. Nobody was lazy — they just <i>read, thought, and wrote</i> at overlapping moments. That is a <b>race condition</b>.</p>
<p>There are only three real cures: give each scorer their <b>own sheet</b> and add them up at the end (<i>don't share</i>), print the final score on a <b>plaque</b> nobody can change (<i>don't mutate</i>), or keep <b>one marker pen</b> and only the person holding it may touch the board (<i>coordinate with a lock</i>).</p>`,
    explain: `<p><b>Thread</b> = one worker inside your program running code on its own. A web server runs hundreds of them at once, one per request. They all see the same objects in memory. Problems start when two threads touch the <b>same changeable data</b> (shared mutable state) at the same time.</p>
<p><b>Why does <code>count++</code> break?</b> It looks like one step but the CPU does three: ${H.table(['Step', 'What the CPU does', 'Can another thread sneak in after it?'], [['1. READ', 'copy <code>count</code> from memory into a register', H.c('r', 'yes')], ['2. ADD', 'register = register + 1', H.c('r', 'yes')], ['3. WRITE', 'copy register back into <code>count</code>', '—']])}
If thread B does its READ between A's READ and A's WRITE, both write the same number and one increment vanishes. This is the <b>lost update</b>.</p>
<p><b>The three race shapes you will meet in every LLD round:</b></p>
<ul>
<li><b>Read-modify-write</b>: <code>count++</code>, <code>balance -= amount</code>, <code>map.put(k, map.get(k) + 1)</code>.</li>
<li><b>Check-then-act</b>: <code>if (!map.containsKey(k)) map.put(k, v)</code>, <code>if (seat.isFree()) seat.book()</code>, <code>if (instance == null) instance = new X()</code>. The fact you checked can become false before you act.</li>
<li><b>Visibility</b>: thread A sets <code>running = false</code>, thread B keeps looping forever because it never re-reads the field from main memory. Fixed by <code>volatile</code> or a lock.</li>
</ul>
<p><b>What "thread-safe" means</b> (plain words): the class keeps its promises even when many threads call it at once, <i>without the caller adding any locks</i>. Its <b>invariants</b> (rules that must always be true, e.g. "booked seats ≤ capacity", "lower ≤ upper") are never visible in a broken state.</p>
<p><b>The three cures, in order of preference:</b></p>
${H.table(['Cure', 'Idea', 'Java tools', 'Cost'], [
  ['1. Don\'t share', 'each thread has its own copy (<b>thread confinement</b>)', 'local variables, <code>ThreadLocal</code>, one object per request', H.c('g', 'free')],
  ['2. Don\'t mutate', 'objects never change after construction (<b>immutability</b>)', '<code>final</code> fields, <code>record</code>, <code>List.of</code>, <code>String</code>', H.c('g', 'free; new object per change')],
  ['3. Coordinate', 'only one thread at a time touches the state (<b>mutual exclusion</b>) or use a lock-free atomic', '<code>synchronized</code>, <code>ReentrantLock</code>, <code>AtomicLong</code>, <code>ConcurrentHashMap</code>', H.c('y', 'contention, deadlock risk')]
])}
<p><b>Brute force #1 — do nothing:</b> fast and <span class="c-r">wrong</span>. Tests pass on your laptop, production loses money under load.<br>
<b>Brute force #2 — one global lock around everything:</b> <span class="c-g">correct</span> but every thread queues at one door, even threads touching totally unrelated data (different users, different seats). Throughput is stuck at "one thread at a time" no matter how many CPU cores you buy.</p>
<p><b>The real skill</b> in a concurrency LLD round is choosing the <i>smallest</i> correct unit of locking: per object, per key, per seat, or no lock at all thanks to an atomic or an immutable snapshot. That is what the rest of this module drills.</p>`,
    clues: [
      '"Multiple threads / concurrent requests call <code>increment()</code>" → read-modify-write race; reach for <code>AtomicLong</code> / <code>LongAdder</code>.',
      '"Make this class <b>thread-safe</b>" → name the shared mutable state, the invariants, and which lock guards which field.',
      '"Counts are <b>sometimes off by a few</b> under load" / "works in tests, fails in prod" → lost update or check-then-act.',
      '"A background thread <b>never stops</b> after we set the flag" → visibility; <code>volatile</code>.',
      '"Two fields must stay consistent" (min ≤ max, balance and history) → one lock for both; separate atomics are not enough.',
      '"Can you make it <b>faster</b>?" after you put <code>synchronized</code> on everything → reduce lock scope, per-key locks, immutable snapshots.'
    ],
    code: [{ lang: 'java', title: 'Four counters, one stress test (runs in under a second)', code: `// Which counters survive 4 threads x 100_000 increments each?
interface Counter { void increment(); long get(); }

class UnsafeCounter implements Counter {          // BRUTE FORCE: no coordination at all
    private long count;
    public void increment() { count++; }          // READ, ADD, WRITE: three steps, not atomic
    public long get() { return count; }
}

class SyncCounter implements Counter {            // monitor pattern: a private lock guards count
    private final Object lock = new Object();
    private long count;                           // guarded by "lock"
    public void increment() { synchronized (lock) { count++; } }
    public long get() { synchronized (lock) { return count; } }  // reads need the lock too (visibility)
}

class AtomicCounter implements Counter {          // lock-free: compare-and-swap loop inside the JDK
    private final AtomicLong count = new AtomicLong();
    public void increment() { count.incrementAndGet(); }
    public long get() { return count.get(); }
}

class AdderCounter implements Counter {           // best for write-heavy stats: striped cells
    private final LongAdder count = new LongAdder();
    public void increment() { count.increment(); }
    public long get() { return count.sum(); }
}

class Main {
    static long hammer(Counter c, int threads, int perThread) throws InterruptedException {
        Thread[] ts = new Thread[threads];
        CountDownLatch start = new CountDownLatch(1);   // release all threads at the same moment
        for (int i = 0; i < threads; i++) {
            ts[i] = new Thread(() -> {
                try { start.await(); } catch (InterruptedException e) { return; }
                for (int k = 0; k < perThread; k++) c.increment();
            });
            ts[i].start();
        }
        start.countDown();
        for (Thread t : ts) t.join();                   // join = wait for them AND see their writes
        return c.get();
    }

    public static void main(String[] args) throws InterruptedException {
        int threads = 4, per = 100_000;
        List<Counter> all = List.of(new UnsafeCounter(), new SyncCounter(), new AtomicCounter(), new AdderCounter());
        for (Counter c : all) {
            long got = hammer(c, threads, per);
            System.out.printf("%-14s expected=%d got=%d %s%n", c.getClass().getSimpleName(),
                    (long) threads * per, got, got == (long) threads * per ? "OK" : "LOST UPDATES");
        }
    }
}` }, { lang: 'java', title: 'The three cures in code: lock an invariant, go immutable, confine to a thread', code: `// CURE 3 (coordinate): an invariant spanning TWO fields (lower <= upper).
// Two separate AtomicIntegers could NOT protect it - check and act must happen under ONE lock.
class NumberRange {
    private final Object lock = new Object();
    private int lower = 0, upper = 10;            // both guarded by "lock"

    void setLower(int v) {
        synchronized (lock) {
            if (v > upper) throw new IllegalArgumentException("lower > upper");
            lower = v;
        }
    }
    void setUpper(int v) {
        synchronized (lock) {
            if (v < lower) throw new IllegalArgumentException("upper < lower");
            upper = v;
        }
    }
    boolean contains(int x) { synchronized (lock) { return lower <= x && x <= upper; } }
}

// CURE 2 (don't mutate): immutable value object. Share it with 1000 threads, no lock needed.
record Money(long paise, String currency) {
    Money {
        if (paise < 0) throw new IllegalArgumentException("negative amount");
        Objects.requireNonNull(currency);
    }
    Money plus(Money o) {
        if (!currency.equals(o.currency)) throw new IllegalArgumentException("currency mismatch");
        return new Money(paise + o.paise, currency);   // a NEW object; this one never changes
    }
}

// CURE 1 (don't share): each thread gets its own copy of a non-thread-safe helper.
class Formatters {
    private static final ThreadLocal<StringBuilder> BUF = ThreadLocal.withInitial(StringBuilder::new);
    static String label(String user, int n) {
        StringBuilder sb = BUF.get();     // this thread's private builder
        sb.setLength(0);
        return sb.append(user).append('#').append(n).toString();
    }
}

class Demo {
    public static void main(String[] args) {
        NumberRange r = new NumberRange();
        r.setUpper(20);
        System.out.println(r.contains(15));                                   // true
        System.out.println(new Money(500, "INR").plus(new Money(250, "INR"))); // Money[paise=750, currency=INR]
        System.out.println(Formatters.label("asha", 7));                      // asha#7
    }
}` }],
    codeTitle: ['Lost update proven, then fixed three ways', 'Lock / immutable / confined'],
    viz: {
      title: 'Two threads run count++ — watch an update get lost',
      input: 'A B A B A B',
      inputLabel: 'Schedule of A/B steps (3 steps per increment: READ, ADD, WRITE). Prefix "lock:" to add synchronized, e.g. lock: A B A B A B',
      gen: function (input) {
        var raw = String(input === undefined ? '' : input).trim();
        var lock = false;
        if (/^lock\s*:/i.test(raw)) { lock = true; raw = raw.replace(/^lock\s*:/i, ''); }
        var seq = raw.toUpperCase().replace(/[^AB]/g, '').split('').filter(function (s) { return s; });
        var hint = 'Type a schedule of A and B letters like "A B A B A B". Each thread needs 3 letters per increment (READ, ADD, WRITE). Add "lock:" in front to simulate synchronized.';
        if (!seq.length) throw new Error(hint);
        if (seq.length > 24) throw new Error('Use at most 24 steps. ' + hint);
        var need = { A: 0, B: 0 };
        seq.forEach(function (c) { need[c]++; });
        if (need.A % 3 || need.B % 3) throw new Error('Each thread needs a multiple of 3 steps (A has ' + need.A + ', B has ' + need.B + '). ' + hint);
        var STEP = ['READ', 'ADD', 'WRITE'];
        var th = { A: { step: 0, reg: '-', readVal: null, left: need.A }, B: { step: 0, reg: '-', readVal: null, left: need.B } };
        var count = 0, rows = [], frames = [], holder = null, lost = 0, expected = (need.A + need.B) / 3, t = 0;
        var src = lock ? 'synchronized (lock) {   // only one thread inside\n  int reg = count;      // READ\n  reg = reg + 1;        // ADD\n  count = reg;          // WRITE\n}' : 'int reg = count;   // READ\nreg = reg + 1;     // ADD\ncount = reg;       // WRITE';
        function line(step) { return lock ? step + 2 : step + 1; }
        function snapshot(narr, rowHl, codeHl) {
          frames.push(F(narr, [
            TABLE('Timeline (one row per CPU step)', ['t', 'Thread A', 'Thread B', 'count in memory'], rows, rowHl),
            VARS('Registers & lock', { 'A.reg': th.A.reg, 'B.reg': th.B.reg, count: count, expected: expected, lock: lock ? (holder || 'free') : 'none' }, codeHl.vars || {}),
            CODE('Code each thread runs', src, codeHl.code || {})
          ]));
        }
        snapshot('Shared <b>count = 0</b>. Thread A and Thread B each want to add 1 (' + expected + ' increment' + (expected > 1 ? 's' : '') + ' total, so the right answer is <b>' + expected + '</b>). ' + (lock ? 'This time every increment is wrapped in <code>synchronized</code>.' : 'There is <b>no lock</b>, so the CPU may switch threads between any two steps.'), {}, {});
        function doStep(who) {
          var me = th[who], other = who === 'A' ? 'B' : 'A';
          var s = me.step, text, cls = 'cur', narr, vh = {};
          if (lock && s === 0 && holder && holder !== who) {
            t++;
            var r0 = [t, '', '', count]; r0[who === 'A' ? 1 : 2] = '<span class="c-y">BLOCKED (waits for lock)</span>';
            rows.push(r0);
            var h0 = {}; h0[rows.length - 1] = 'cur';
            snapshot('Thread ' + who + ' wants to start, but Thread ' + holder + ' holds the lock. ' + who + ' is <b>parked</b> — it cannot READ a half-finished value. This waiting is the price of correctness.', h0, { vars: { lock: 'cur' } });
            return false;
          }
          if (lock && s === 0) holder = who;
          if (s === 0) { me.readVal = count; me.reg = count; text = 'READ count → reg = ' + me.reg; narr = 'Thread ' + who + ' <b>reads</b> count = ' + count + ' into its private register.'; vh[who + '.reg'] = 'cur'; }
          else if (s === 1) { me.reg = me.reg + 1; text = 'ADD → reg = ' + me.reg; narr = 'Thread ' + who + ' adds 1 <b>in its register</b> (memory still says ' + count + '). Nobody else can see this yet.'; vh[who + '.reg'] = 'cur'; }
          else {
            var clobber = count !== me.readVal;
            count = me.reg; text = 'WRITE reg → count = ' + count; vh.count = clobber ? 'bad' : 'ok';
            if (clobber) { lost++; cls = 'bad'; text = '<span class="c-r">WRITE ' + count + ' (overwrites ' + other + '\'s work!)</span>'; narr = '<span class="c-r">Lost update!</span> Thread ' + who + ' read ' + me.readVal + ' long ago, but memory changed since. It blindly writes ' + count + ' and erases Thread ' + other + '\'s increment.'; }
            else { cls = 'ok'; narr = 'Thread ' + who + ' writes ' + count + '. Memory had not changed since its READ, so this increment is safe.'; }
            if (lock) { holder = null; narr += ' It leaves the synchronized block and <b>releases the lock</b>.'; }
            me.reg = '-';
          }
          me.step = (s + 1) % 3; me.left--;
          t++;
          var row = [t, '', '', count]; row[who === 'A' ? 1 : 2] = text;
          rows.push(row);
          var h = {}; h[rows.length - 1] = cls;
          var ch = {}; ch[line(s)] = cls === 'bad' ? 'bad' : 'cur';
          snapshot(narr, h, { vars: vh, code: ch });
          return true;
        }
        var pending = [];
        seq.forEach(function (who) { if (!doStep(who)) pending.push(who); });
        // in lock mode, blocked steps are retried after the schedule ends
        var guard = 0;
        while ((th.A.left > 0 || th.B.left > 0) && guard++ < 60) {
          var who = holder ? holder : (th.A.left > 0 ? 'A' : 'B');
          if (th[who].left <= 0) who = who === 'A' ? 'B' : 'A';
          doStep(who);
        }
        var ok = count === expected;
        frames.push(F(ok ? '<span class="c-g">Correct: count = ' + count + '.</span> ' + (lock ? 'The lock made READ-ADD-WRITE one indivisible unit, so no thread could read a stale value. Try the same schedule without "lock:" to see the difference.' : 'This schedule happened to run each increment without overlap. Try "A B A B A B" to see a lost update — the bug only appears for unlucky timings, which is why tests miss it.') : '<span class="c-r">Wrong: count = ' + count + ', expected ' + expected + '. ' + lost + ' update(s) lost.</span> Fix with <code>synchronized</code> (try prefixing "lock:"), or <code>AtomicLong.incrementAndGet()</code> which does READ-ADD-WRITE as one hardware CAS.', [
          TABLE('Full timeline', ['t', 'Thread A', 'Thread B', 'count in memory'], rows, {}),
          VARS('Result', { count: count, expected: expected, lostUpdates: lost }, { count: ok ? 'ok' : 'bad', lostUpdates: lost ? 'bad' : 'ok' })
        ]));
        return frames;
      }
    },
    examples: [
      { title: 'Lost update with real numbers', html: `<p>Bank balance ₹1000. Two ATM withdrawals of ₹100 run together, each doing <code>balance = balance - 100</code>:</p>
${H.table(['t', 'ATM-1', 'ATM-2', 'balance'], [['1', 'read 1000', '', '1000'], ['2', '', 'read 1000', '1000'], ['3', 'write 900', '', '900'], ['4', '', H.c('r', 'write 900'), H.c('r', '900 (should be 800)')]])}
<p>The bank handed out ₹200 but only deducted ₹100. Fix: make "read, subtract, write" one atomic unit — <code>synchronized</code> on the account, or <code>AtomicLong.addAndGet(-100)</code>, or in a database <code>UPDATE ... SET balance = balance - 100 WHERE balance &gt;= 100</code>.</p>` },
      { title: 'Check-then-act: the lazy singleton that creates two objects', html: `<p>Thread A sees <code>instance == null</code>, gets paused. Thread B also sees null and creates object #1. A resumes and creates object #2. Two "singletons" — two connection pools, two caches that disagree. The fix is the <b>holder idiom</b>: the JVM guarantees a class is initialised exactly once, safely.</p>`, code: `class Config {
    private Config() { System.out.println("loading config once"); }

    // BROKEN: check-then-act without a lock
    private static Config unsafe;
    static Config getUnsafe() {
        if (unsafe == null) unsafe = new Config();   // two threads can both see null
        return unsafe;
    }

    // SAFE and lazy: the JVM initialises Holder exactly once, on first use
    private static class Holder { static final Config INSTANCE = new Config(); }
    static Config get() { return Holder.INSTANCE; }
}` },
      { title: 'Visibility: the loop that never stops', html: `<p>Without <code>volatile</code>, the JIT compiler may hoist <code>running</code> into a register and the worker loops forever even after <code>stop()</code>. <code>volatile</code> forces every read to see the latest write. Note: volatile fixes <i>visibility</i> only — <code>volatile int count; count++</code> is <span class="c-r">still a race</span>.</p>`, code: `class Worker implements Runnable {
    private volatile boolean running = true;   // remove volatile and the loop may spin forever
    private long ticks;

    public void run() {
        while (running) ticks++;
        System.out.println("stopped after " + (ticks > 0 ? "some" : "zero") + " ticks");
    }
    void stop() { running = false; }

    public static void main(String[] args) throws InterruptedException {
        Worker w = new Worker();
        Thread t = new Thread(w);
        t.start();
        Thread.sleep(50);
        w.stop();
        t.join(2000);                            // bounded wait so a demo can never hang
        System.out.println("worker alive? " + t.isAlive());
    }
}` },
      { title: 'Two atomics do not make one atomic invariant', html: `<p><code>lower</code> and <code>upper</code> as two <code>AtomicInteger</code>s, range (0, 10). Thread A calls <code>setLower(5)</code>: checks 5 ≤ upper(10) ✓. Thread B calls <code>setUpper(4)</code>: checks 4 ≥ lower(0) ✓. Both write. Now the range is (5, 4) — ${H.c('r', 'impossible state')}. Each field was updated atomically, but the <i>rule linking them</i> was not. Whenever an invariant ties several variables together, <b>one lock must guard all of them</b> (see <code>NumberRange</code> above), or bundle them into one immutable object swapped with an <code>AtomicReference</code>.</p>` }
    ],
    deepDive: `<p><b>The Java Memory Model in one paragraph.</b> Without synchronisation, the JVM and CPU may reorder instructions and keep values in caches, so one thread's writes may be invisible or seen out of order by another. The JMM defines <b>happens-before</b> edges that guarantee visibility: unlocking a monitor happens-before every later lock of the same monitor; a <code>volatile</code> write happens-before later reads of that field; <code>Thread.start()</code> happens-before anything in the started thread; everything in a thread happens-before another thread's <code>join()</code> returns; putting into a concurrent collection happens-before taking it out. If no such edge connects a write and a read, you have a <b>data race</b> and almost anything can be observed.</p>
<p><b>Atomicity vs visibility.</b> <code>volatile</code> = visibility + ordering, no atomic compound ops. <code>synchronized</code>/<code>Lock</code> = both. <code>AtomicXxx</code> = both for single variables via CAS (compare-and-swap: "set to new value only if it still equals what I read", retried in a loop).</p>
<p><b>Safe publication.</b> An object is safely published if its reference is stored in a <code>final</code> field, a <code>volatile</code> field, an <code>AtomicReference</code>, a concurrent collection, or under a lock. <code>final</code> fields get a special guarantee: once the constructor finishes (and <code>this</code> did not escape), every thread sees their values. That is why immutable objects are free of races.</p>
<p><b>Lock granularity.</b> Coarse (one lock for the whole service) → simple, low throughput. Fine (one per account/seat/key) → high throughput, deadlock risk when an operation needs several (fix: global lock ordering). <b>Lock striping</b> (N locks, key hash picks one) is the middle ground; old <code>ConcurrentHashMap</code> used 16 segments. <b>Amdahl's law</b>: if 10% of each request runs under one global lock, you can never go faster than 10x no matter how many cores.</p>
<p><b>Costs in 2026 hardware.</b> An uncontended lock is ~20 ns; a contended one parks the thread (microseconds) and causes context switches. CAS under heavy contention spins and burns CPU, which is why <code>LongAdder</code> spreads updates over per-CPU cells and only sums on read. Watch for <b>false sharing</b>: two hot fields on the same 64-byte cache line make cores fight even with no logical sharing (<code>@Contended</code> is JDK-internal; padding is the user-level workaround).</p>
<p><b>Virtual threads (Java 21+).</b> They make blocking cheap, so "one thread per request" is back. In Java 21, blocking <i>inside</i> <code>synchronized</code> pins the carrier thread; JDK 24 (JEP 491) removed most of this pinning. Prefer <code>ReentrantLock</code> on code paths that block for I/O if you still run on 21. Virtual threads do not remove races — they multiply the number of threads hitting your shared state.</p>
<p><b>Documenting the policy.</b> Mark fields with a comment or <code>@GuardedBy("lock")</code> (JCIP annotation, also used by Error Prone) so reviewers can check every access. Use a <b>private final lock object</b> rather than <code>synchronized(this)</code> so outside code cannot grab your lock and deadlock you.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write concurrent Java that <i>compiles and passes single-threaded tests</i> in seconds. Concurrency bugs are exactly the class of bug that unit tests and quick reviews miss, so AI shifts your job from typing <code>synchronized</code> to <b>auditing interleavings</b>.</p>
<p><b>Use AI as a partner:</b> <code>List every field in this class, which lock guards it, and every method that reads or writes it without that lock</code>. <code>Write a jcstress test that tries to observe a lost update in this counter</code>. <code>Give me 3 interleavings of these two methods that break the invariant seats_booked &lt;= capacity</code>. These prompts make the model reason about schedules instead of style.</p>
<p><b>Where AI goes wrong:</b> marks a setter <code>synchronized</code> but leaves the getter unsynchronized (visibility bug); suggests <code>volatile</code> to "fix" <code>count++</code>; swaps <code>HashMap</code> for <code>ConcurrentHashMap</code> and calls it done while keeping <code>get</code>-then-<code>put</code>; uses <code>synchronized(this)</code> in a class exposed to user code; protects two related fields with two different atomics.</p>
<p><b>What you must still own:</b> naming the invariants, choosing the lock granularity, proving there is a happens-before edge for every cross-thread read, and explaining the throughput trade-off out loud in the interview.</p>`,
    problems: [{
      title: 'Page View Counter Under Load', level: 'Easy', tags: ['thread-safety', 'atomics', 'ConcurrentHashMap'], companies: ['Amazon', 'Flipkart', 'Atlassian'],
      statement: `<p>Your analytics service records page views from <b>200 request threads</b>. The current class uses a plain <code>HashMap&lt;String, Integer&gt;</code> with <code>recordView(page)</code> doing <code>views.put(page, views.getOrDefault(page, 0) + 1)</code>. In production the numbers are too low, and once the service froze at 100% CPU. <b>Make it thread-safe and fast</b>: <code>recordView(page)</code>, <code>views(page)</code>, and <code>top(k)</code> (k most viewed pages).</p>`,
      constraints: `<p>~50k recordView calls/sec, thousands of distinct pages, top(k) called once a minute. Readers may see a count that is a few milliseconds stale.</p>`,
      example: `<p>Threads record <code>/home</code> 20,000 times, <code>/cart</code> 10,000, <code>/pay</code> 10,000. Expected <code>top(3)</code> = ${H.c('g', '[/home=20000, /cart=10000, /pay=10000]')}. The broken version prints something like ${H.c('r', '[/home=17312, /cart=9104, /pay=8877]')} — every missing view is a lost update from two threads doing get-then-put on the same key.</p>`,
      brute: { why: `<p><b>Unsynchronized HashMap:</b> lost updates (two threads read 41, both write 42) and, worse, two threads resizing the table at once can corrupt buckets — older JDKs could even form a cycle and spin forever (the 100% CPU freeze). <b>Global lock (<code>synchronized</code> on every method):</b> correct, but all 200 threads queue on one monitor even for different pages, and <code>top(k)</code> holds that lock while sorting thousands of entries, stalling every writer.</p>`, code: `class NaivePageViews {
    private final Map<String, Integer> views = new HashMap<>();

    // BRUTE 1: race - get then put is two steps; HashMap itself is not thread-safe
    void recordViewUnsafe(String page) {
        views.put(page, views.getOrDefault(page, 0) + 1);
    }

    // BRUTE 2: correct but every thread waits on ONE lock, even for unrelated pages
    synchronized void recordView(String page) {
        views.put(page, views.getOrDefault(page, 0) + 1);
    }
    synchronized List<Map.Entry<String, Integer>> top(int k) {   // sorts while holding the lock
        List<Map.Entry<String, Integer>> all = new ArrayList<>(views.entrySet());
        all.sort((a, b) -> b.getValue() - a.getValue());
        return new ArrayList<>(all.subList(0, Math.min(k, all.size())));
    }
}` },
      mcq: { q: 'You switch to <code>ConcurrentHashMap&lt;String, Integer&gt;</code> but keep <code>map.put(p, map.getOrDefault(p, 0) + 1)</code>. Is it fixed?', options: ['Yes — ConcurrentHashMap is thread-safe', 'No — each call is safe, but get-then-put is still two separate steps, so updates are still lost', 'No — ConcurrentHashMap does not allow Integer values', 'Yes, as long as the JVM has more than one core'], answer: 1, explain: 'A thread-safe collection makes each <i>single</i> call atomic. A compound action built from two calls is not. Use <code>merge(p, 1, Integer::sum)</code>, <code>compute</code>, or <code>computeIfAbsent(p, k -&gt; new LongAdder()).increment()</code>.' },
      hints: [`<p>Hint 1: The bug is a <b>read-modify-write</b> on a shared map entry. You need the "add one" to be a single atomic step per key.</p>`, `<p>Hint 2: <code>ConcurrentHashMap</code> gives per-key atomic <code>computeIfAbsent</code>; <code>LongAdder</code> gives a contention-friendly counter. Combine them: one adder per page.</p>`, `<p>Hint 3: For <code>top(k)</code>, take a <b>snapshot</b> (copy page → sum into a list) without any global lock, then sort the copy. Writers keep running; the report is a few ms stale, which the constraints allow.</p>`],
      solution: {
        approach: `<p>Replace "one lock for everything" with <b>per-key atomicity</b>. <code>computeIfAbsent</code> creates exactly one <code>LongAdder</code> per page even when many threads see the page for the first time together. <code>LongAdder.increment()</code> is lock-free and spreads contention across internal cells, so a hot page like <code>/home</code> does not become a bottleneck. Reports build a <b>weakly consistent snapshot</b> by iterating the map (CHM iterators never throw <code>ConcurrentModificationException</code>) and sort the private copy.</p>`,
        code: `class PageViewCounter {
    private final ConcurrentHashMap<String, LongAdder> views = new ConcurrentHashMap<>();

    void recordView(String page) {
        // atomic per key: only ONE LongAdder is ever created for a page
        views.computeIfAbsent(page, k -> new LongAdder()).increment();
    }

    long views(String page) {
        LongAdder a = views.get(page);
        return a == null ? 0 : a.sum();
    }

    // weakly consistent snapshot: no global lock, writers never wait for the report
    List<Map.Entry<String, Long>> top(int k) {
        List<Map.Entry<String, Long>> snap = new ArrayList<>();
        views.forEach((p, a) -> snap.add(Map.entry(p, a.sum())));
        snap.sort((x, y) -> Long.compare(y.getValue(), x.getValue()));
        return new ArrayList<>(snap.subList(0, Math.min(k, snap.size())));
    }

    public static void main(String[] args) throws InterruptedException {
        PageViewCounter c = new PageViewCounter();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        String[] pages = {"/home", "/cart", "/home", "/pay"};
        for (int i = 0; i < 40_000; i++) {
            String p = pages[i % pages.length];
            pool.execute(() -> c.recordView(p));
        }
        pool.shutdown();                                   // no new tasks; finish queued ones
        pool.awaitTermination(10, TimeUnit.SECONDS);       // bounded wait: never hangs
        System.out.println(c.top(3));                      // /home=20000 first
    }
}`,
        dry: { head: ['Step', 'Thread T1', 'Thread T2', 'views["/home"]'], rows: [['1', 'computeIfAbsent("/home") → creates adder', 'computeIfAbsent("/home") waits for that bin', 'adder(0)'], ['2', 'increment()', 'gets the SAME adder', 'adder(1)'], ['3', '—', 'increment()', H.c('g', 'adder(2) — nothing lost')]] },
        complexity: `<p><code>recordView</code>: O(1) average, lock-free on the hot path after the first view. <code>top(k)</code>: O(P log P) for P pages on a private copy. Memory O(P).</p>`,
        followUps: ['Counts per minute instead of all-time (rotate maps per window).', 'Why not <code>AtomicLong</code> instead of <code>LongAdder</code>? (fine for low contention; LongAdder wins for hot keys).', 'How would you make top(k) cheaper with 10M pages? (approximate heavy hitters, Count-Min Sketch).']
      }
    }]
  });

  /* ======================= TOPIC 2: SYNCHRONIZED VS CONCURRENT COLLECTIONS ======================= */
  topics.push({
    title: 'Synchronized Collections vs Concurrent Collections',
    analogy: `<p>A shoe shop has <b>one clerk</b> who answers one question at a time. You ask "Is size 9 in stock?" — "Yes." You turn to grab your wallet, and in that pause another customer says "I'll take the size 9." When you say "I'll buy it", it's gone. Every <i>single sentence</i> with the clerk was orderly, but your <i>two-sentence conversation</i> was not. That is <code>Collections.synchronizedMap</code>.</p>
<p>A modern shop has <b>many counters</b> (one per shelf, so customers for different shoes never wait for each other) and a single command: <b>"Give me size 9 if you still have it."</b> That is <code>ConcurrentHashMap</code> with <code>putIfAbsent</code> / <code>compute</code>.</p>`,
    explain: `<p><b>Two generations of thread-safe collections:</b></p>
${H.table(['Generation', 'Examples', 'How it is protected', 'Main problem'], [
  ['Synchronized (Java 1.0 / 1.2)', '<code>Vector</code>, <code>Hashtable</code>, <code>Collections.synchronizedList/Map/Set(...)</code>', 'every method takes <b>one lock</b> on the whole collection', 'compound actions still race; iteration needs a manual lock; one lock = queue'],
  ['Concurrent (Java 5+)', '<code>ConcurrentHashMap</code>, <code>CopyOnWriteArrayList</code>, <code>ConcurrentLinkedQueue</code>, <code>BlockingQueue</code>s, <code>ConcurrentSkipListMap</code>', 'fine-grained locks / CAS; atomic compound methods built in', 'you must use those atomic methods, not get-then-put']
])}
<p><b>Trap 1 — compound actions.</b> Each method of a synchronized wrapper is atomic, but "check, then act" spans two calls:</p>
<ul><li><code>if (!map.containsKey(k)) map.put(k, v);</code> → two threads both see "absent", both put.</li>
<li><code>if (!list.isEmpty()) list.remove(0);</code> → another thread empties it in between → exception.</li>
<li><code>map.put(k, map.get(k) + 1);</code> → lost update.</li></ul>
<p>Fix with a single atomic call: <code>putIfAbsent</code>, <code>computeIfAbsent</code>, <code>merge</code>, <code>compute</code>, <code>remove(k, expected)</code>, <code>replace(k, old, new)</code> — or hold the collection's own lock around the whole sequence (<code>synchronized (map) { ... }</code>, called <b>client-side locking</b>).</p>
<p><b>Trap 2 — iteration.</b> <code>for (x : syncList)</code> calls <code>iterator()</code>, <code>hasNext()</code>, <code>next()</code> separately. If another thread adds meanwhile, the fail-fast iterator throws <code>ConcurrentModificationException</code>. The Javadoc says you <i>must</i> wrap iteration in <code>synchronized (list)</code> — which blocks every writer for the whole loop. Concurrent collections instead give <b>weakly consistent</b> (CHM) or <b>snapshot</b> (COW) iterators that never throw.</p>
<p><b>Trap 3 — one lock for everything.</b> A synchronized map with 64 threads behaves like a single-lane bridge. <code>ConcurrentHashMap</code> locks only the one bucket being written (and reads take no lock at all), so threads working on different keys run in parallel.</p>
<p><b>Picking the right one:</b></p>
${H.table(['Need', 'Use', 'Why'], [
  ['key → value, many readers and writers', '<code>ConcurrentHashMap</code>', 'lock-free reads, per-bin writes, atomic compute/merge'],
  ['a set', '<code>ConcurrentHashMap.newKeySet()</code>', 'same engine as CHM'],
  ['sorted map / range queries', '<code>ConcurrentSkipListMap</code>', 'O(log n), lock-free, sorted'],
  ['read-mostly list (listeners, config)', '<code>CopyOnWriteArrayList</code>', 'reads lock-free, iteration never throws; writes copy the array'],
  ['hand-off between threads', '<code>ArrayBlockingQueue</code> / <code>LinkedBlockingQueue</code>', 'blocks when empty/full (next topics)'],
  ['non-blocking FIFO', '<code>ConcurrentLinkedQueue</code>', 'lock-free CAS linked list']
])}`,
    clues: [
      '"We wrapped it in <code>Collections.synchronizedMap</code> but still see <b>duplicates</b>" → check-then-act across two calls.',
      '"Random <code>ConcurrentModificationException</code> in a report / listener loop" → unsynchronized iteration; use COW or snapshot.',
      '"Register if not exists", "create once per key", "first writer wins" → <code>putIfAbsent</code> / <code>computeIfAbsent</code>.',
      '"Count per key from many threads" → <code>merge(k, 1, Long::sum)</code> or <code>LongAdder</code> per key.',
      '"<b>Read-heavy</b>, rarely changes (listeners, routing table)" → <code>CopyOnWriteArrayList</code> or immutable snapshot swap.',
      '"<code>Hashtable</code> / <code>Vector</code> in legacy code is slow" → contention on one monitor.'
    ],
    code: [{ lang: 'java', title: 'Synchronized wrapper traps and their fixes (runnable)', code: `class CollectionsDemo {
    public static void main(String[] args) throws Exception {
        // ---- Trap 1: check-then-act on a synchronized map ----
        Map<String, String> sync = Collections.synchronizedMap(new HashMap<>());
        AtomicInteger winners = new AtomicInteger();
        runTwice(() -> {
            if (!sync.containsKey("neo")) {          // CHECK  (lock taken and released)
                Thread.yield();                      // widen the gap so the race is easy to see
                sync.put("neo", Thread.currentThread().getName());   // ACT (lock taken again)
                winners.incrementAndGet();
            }
        });
        System.out.println("synchronizedMap, check-then-act winners: " + winners.get() + " (1 is correct)");

        // Fix: one atomic call
        ConcurrentHashMap<String, String> chm = new ConcurrentHashMap<>();
        AtomicInteger winners2 = new AtomicInteger();
        runTwice(() -> {
            if (chm.putIfAbsent("neo", Thread.currentThread().getName()) == null) winners2.incrementAndGet();
        });
        System.out.println("putIfAbsent winners: " + winners2.get());

        // ---- Trap 2: iterating a synchronized list needs client-side locking ----
        List<Integer> list = Collections.synchronizedList(new ArrayList<>(List.of(1, 2, 3)));
        int sum = 0;
        synchronized (list) {                         // REQUIRED by the Javadoc while iterating
            for (int x : list) sum += x;
        }
        System.out.println("sum = " + sum);

        // Or: a snapshot iterator that can never throw ConcurrentModificationException
        List<Integer> cow = new CopyOnWriteArrayList<>(List.of(1, 2, 3));
        for (int x : cow) if (x == 2) cow.add(99);    // safe: the loop sees the old snapshot
        System.out.println("cow = " + cow);           // [1, 2, 3, 99]
    }

    // runs the same task on 2 threads at once (the race shows up only on unlucky timings)
    static void runTwice(Runnable task) throws InterruptedException {
        Thread a = new Thread(task, "A"), b = new Thread(task, "B");
        a.start(); b.start();
        a.join(); b.join();
    }
}` }, { lang: 'java', title: 'ConcurrentHashMap atomic-operation cheat sheet', code: `class ChmCheatSheet {
    final ConcurrentHashMap<String, Long> hits = new ConcurrentHashMap<>();
    final ConcurrentHashMap<String, Queue<String>> inbox = new ConcurrentHashMap<>();
    final ConcurrentHashMap<String, Integer> stock = new ConcurrentHashMap<>();

    void hit(String page) { hits.merge(page, 1L, Long::sum); }            // atomic counter per key

    void deliver(String user, String msg) {
        // computeIfAbsent is atomic, but the VALUE must also be thread-safe:
        // an ArrayList here would race on add(). Use a concurrent queue.
        inbox.computeIfAbsent(user, u -> new ConcurrentLinkedQueue<>()).add(msg);
    }

    boolean reserveOne(String sku) {
        // compute runs under the bin lock: check stock AND decrement in one step
        boolean[] ok = {false};
        stock.computeIfPresent(sku, (k, qty) -> {
            if (qty <= 0) return qty;
            ok[0] = true;
            return qty - 1;
        });
        return ok[0];
    }

    boolean casPrice(String sku, int expected, int next) {
        return stock.replace(sku, expected, next);      // succeeds only if value is still "expected"
    }

    public static void main(String[] args) {
        ChmCheatSheet c = new ChmCheatSheet();
        c.hit("/home"); c.hit("/home");
        c.deliver("asha", "hi"); c.deliver("asha", "lunch?");
        c.stock.put("tee", 1);
        System.out.println(c.hits + " " + c.inbox + " " + c.reserveOne("tee") + " " + c.reserveOne("tee"));
        // {/home=2} {asha=[hi, lunch?]} true false
    }
}` }],
    codeTitle: ['Traps & fixes', 'CHM atomic methods'],
    viz: {
      title: 'Two users register "neo" at the same time',
      input: 'A B A B',
      inputLabel: 'Schedule: each thread does CHECK then PUT (2 steps). Prefix "atomic:" for putIfAbsent (1 step each), e.g. atomic: A B',
      gen: function (input) {
        var raw = String(input === undefined ? '' : input).trim();
        var atomic = false;
        if (/^atomic\s*:/i.test(raw)) { atomic = true; raw = raw.replace(/^atomic\s*:/i, ''); }
        var seq = raw.toUpperCase().replace(/[^AB]/g, '').split('').filter(function (s) { return s; });
        var per = atomic ? 1 : 2;
        var hint = atomic ? 'In atomic mode type one A and one B, e.g. "atomic: B A".' : 'Type exactly two A and two B letters, e.g. "A B A B" or "A A B B" (each thread: CHECK then PUT). Prefix "atomic:" for putIfAbsent.';
        var cA = seq.filter(function (c) { return c === 'A'; }).length, cB = seq.length - cA;
        if (cA !== per || cB !== per) throw new Error(hint);
        var map = [], rows = [], frames = [], step = { A: 0, B: 0 }, saw = { A: null, B: null }, believes = { A: false, B: false };
        function mapPart(hl) { return { type: 'map', label: atomic ? 'ConcurrentHashMap usernames' : 'Collections.synchronizedMap usernames', entries: map.map(function (e) { return e.slice(); }), hl: hl || {} }; }
        var src = atomic ? 'String prev = users.putIfAbsent(name, me); // ONE atomic call\nreturn prev == null;   // true = I own it' : 'if (!users.containsKey(name)) {   // CHECK (lock held only inside this call)\n    users.put(name, me);          // ACT   (lock taken again)\n    return true;\n}\nreturn false;';
        frames.push(F('Empty registry. Thread A (user Asha) and Thread B (user Bala) both try to claim the username <b>"neo"</b>. ' + (atomic ? 'This time they use <code>putIfAbsent</code> — check and insert happen inside one lock hold.' : 'The map is a <code>synchronizedMap</code>, so <i>each call</i> is locked — but the lock is released between CHECK and PUT.'), [
          TABLE('Timeline', ['t', 'Thread A (Asha)', 'Thread B (Bala)', 'map["neo"]'], rows), mapPart(), CODE('register(name, me)', src)]));
        seq.forEach(function (who, i) {
          var s = step[who]++, text, cls = 'cur', narr, mh = {}, ch = {};
          var cur = map.length ? map[0][1] : '(absent)';
          if (atomic) {
            if (!map.length) { map.push(['neo', who]); believes[who] = true; text = 'putIfAbsent → null: <span class="c-g">I own neo</span>'; cls = 'ok'; mh.neo = 'ok'; narr = 'Thread ' + who + ' calls <code>putIfAbsent</code>. Inside ONE bin lock it sees "absent" and inserts. Returns null → ' + who + ' wins.'; ch[1] = 'ok'; }
            else { text = 'putIfAbsent → "' + map[0][1] + '": taken'; cls = 'sel'; mh.neo = 'sel'; narr = 'Thread ' + who + ' calls <code>putIfAbsent</code>. The key exists, so nothing is written; it gets back "' + map[0][1] + '" and tells the user <b>"username taken"</b>. No overwrite is possible.'; ch[2] = 'cur'; }
          } else if (s === 0) {
            saw[who] = map.length === 0;
            text = 'containsKey("neo") → ' + (saw[who] ? 'false' : 'true');
            narr = 'Thread ' + who + ' takes the map lock, checks, and <b>releases</b> it: neo is ' + (saw[who] ? '<b>free</b>' : 'taken') + '. ' + (saw[who] ? 'It now <i>believes</i> neo is free — but that fact can go stale right now.' : 'It will give up.');
            ch[1] = 'cur';
          } else {
            if (!saw[who]) { text = 'skip (saw taken) → return false'; narr = 'Thread ' + who + ' saw "taken" earlier, so it reports failure. Correct.'; ch[5] = 'cur'; }
            else if (!map.length) { map.push(['neo', who]); believes[who] = true; text = 'put("neo", ' + who + ')'; cls = 'ok'; mh.neo = 'ok'; narr = 'Thread ' + who + ' puts neo → ' + who + ' and returns true.'; ch[2] = 'ok'; }
            else { var victim = map[0][1]; map[0][1] = who; believes[who] = true; text = '<span class="c-r">put("neo", ' + who + ') overwrites ' + victim + '!</span>'; cls = 'bad'; mh.neo = 'bad'; narr = '<span class="c-r">Race!</span> Thread ' + who + ' acts on its stale check and <b>overwrites</b> ' + victim + '. Both users were told "success", but only ' + who + ' owns neo. ' + victim + '\'s account now points nowhere.'; ch[2] = 'bad'; }
          }
          rows.push([i + 1, who === 'A' ? text : '', who === 'B' ? text : '', map.length ? map[0][1] : '(absent)']);
          var h = {}; h[rows.length - 1] = cls;
          frames.push(F(narr, [TABLE('Timeline', ['t', 'Thread A (Asha)', 'Thread B (Bala)', 'map["neo"]'], rows, h), mapPart(mh), CODE('register(name, me)', src, ch)]));
          void cur;
        });
        var both = believes.A && believes.B;
        frames.push(F(both ? '<span class="c-r">Two users were told they own "neo".</span> Each map call was synchronized, yet the <i>conversation</i> CHECK→PUT was not. Fix: <code>putIfAbsent</code> (try input "atomic: A B"), or hold <code>synchronized (users) { ... }</code> around both calls.' : '<span class="c-g">Exactly one owner.</span> ' + (atomic ? 'putIfAbsent made check+insert indivisible, so no schedule can produce two winners.' : 'This schedule got lucky (no overlap between CHECK and PUT). Try "A B A B" to see the bug.'), [
          TABLE('Final timeline', ['t', 'Thread A (Asha)', 'Thread B (Bala)', 'map["neo"]'], rows), mapPart(), VARS('Who believes they own neo?', { Asha: believes.A, Bala: believes.B }, { Asha: both ? 'bad' : (believes.A ? 'ok' : ''), Bala: both ? 'bad' : (believes.B ? 'ok' : '') })]));
        return frames;
      }
    },
    examples: [
      { title: 'ConcurrentModificationException in a report loop', html: `<p>A notification service keeps listeners in <code>Collections.synchronizedList</code>. A loop calls each listener while another thread registers a new one → ${H.c('r', 'ConcurrentModificationException')} (and the add itself was perfectly synchronized!). Options: wrap the loop in <code>synchronized (listeners)</code> (blocks registrations during slow callbacks — bad), copy first (<code>new ArrayList&lt;&gt;(listeners)</code> inside the lock, iterate outside), or use <code>CopyOnWriteArrayList</code> — ideal because listeners are read on every event and changed rarely.</p>`, code: `class EventBus {
    private final List<Consumer<String>> listeners = new CopyOnWriteArrayList<>();
    void subscribe(Consumer<String> l) { listeners.add(l); }      // copies the array: rare, fine
    void publish(String event) {
        for (Consumer<String> l : listeners) l.accept(event);    // snapshot iteration, lock-free
    }
}` },
      { title: 'Vector is not magic: isEmpty then remove', html: `<p><code>Vector&lt;Job&gt; jobs</code>, two workers run <code>if (!jobs.isEmpty()) jobs.remove(0);</code>. One job left: both see "not empty", first removes it, second gets ${H.c('r', 'ArrayIndexOutOfBoundsException')}. The fix is either a lock around both calls or, better, the right abstraction: a <code>BlockingQueue</code> whose <code>poll()</code> returns <code>null</code> atomically when empty.</p>`, code: `class Workers {
    private final BlockingQueue<String> jobs = new LinkedBlockingQueue<>(List.of("j1"));
    String next() { return jobs.poll(); }   // atomic "take if present", null when empty
}` },
      { title: 'computeIfAbsent with a non-thread-safe value', html: `<p><code>map.computeIfAbsent(user, u -&gt; new ArrayList&lt;&gt;()).add(order)</code> on a CHM: the map entry is created once, safely. But then two threads call <code>add</code> on the <b>same ArrayList</b> with no lock → lost elements or a corrupted array. Thread safety must hold at <i>every level</i>: use <code>ConcurrentLinkedQueue</code> / <code>CopyOnWriteArrayList</code> as the value, or do the add <i>inside</i> <code>compute</code> so it runs under the bin lock.</p>`, code: `class Orders {
    final ConcurrentHashMap<String, List<String>> byUser = new ConcurrentHashMap<>();
    void add(String user, String order) {
        byUser.compute(user, (u, list) -> {          // runs under the bin lock
            List<String> l = (list == null) ? new ArrayList<>() : list;
            l.add(order);
            return l;
        });
    }
}` },
      { title: 'Why ConcurrentHashMap refuses null', html: `<p>On a plain <code>HashMap</code>, <code>get(k) == null</code> could mean "absent" or "mapped to null"; you disambiguate with <code>containsKey</code>. On a concurrent map, that second call is a <b>check-then-act</b> — the answer may change between calls. So CHM bans null keys and values: ${H.c('g', 'null always means absent')}, and <code>putIfAbsent</code> returning null always means "you inserted it".</p>` }
    ],
    deepDive: `<p><b>ConcurrentHashMap (Java 8+) internals.</b> A table of bins. Inserting into an <i>empty</i> bin is a single CAS — no lock. Inserting into a non-empty bin does <code>synchronized</code> on that bin's <b>first node</b> only, so writers to other bins proceed in parallel. Reads (<code>get</code>) take no lock at all: node <code>val</code> and <code>next</code> fields are volatile. A bin with more than 8 nodes (and table ≥ 64) becomes a red-black tree. Resizing is <b>cooperative</b>: threads that hit a <code>ForwardingNode</code> help transfer bins. <code>size()</code> sums <code>CounterCell</code>s (same idea as <code>LongAdder</code>) — it is an <i>estimate</i> under concurrent writes; use <code>mappingCount()</code> for long.</p>
<p><b>compute/merge rules.</b> The remapping function runs while holding the bin lock. Keep it short, side-effect free, and <b>never touch the same map</b> inside it (Java 9+ throws <code>IllegalStateException: Recursive update</code>; earlier versions could livelock). Never do I/O inside it.</p>
<p><b>Weakly consistent iterators</b>: reflect some state at or after creation, never throw CME, may or may not show concurrent updates. Aggregates like <code>forEach</code>, <code>reduce</code>, <code>search</code> with a parallelism threshold run on the common ForkJoinPool.</p>
<p><b>CopyOnWriteArrayList</b>: every write copies the whole array under a lock and publishes it via a volatile reference. Reads and iteration are lock-free and see a frozen snapshot. Great for &lt; a few thousand elements that change rarely; terrible for write-heavy lists (O(n) per add, garbage pressure).</p>
<p><b>Synchronized wrappers</b> lock on the wrapper object (<code>mutex = this</code>), which is exactly why client-side <code>synchronized (list) { ... }</code> works with them — and why it does <b>not</b> work with CHM (CHM does not use its own monitor, so locking it protects nothing).</p>
<p><b>Unmodifiable ≠ immutable.</b> <code>Collections.unmodifiableList(x)</code> is a read-only <i>view</i>: if someone mutates <code>x</code>, readers see changes (and races). <code>List.copyOf</code> / <code>List.of</code> are truly immutable and safe to publish.</p>
<p><b>Other members:</b> <code>ConcurrentSkipListMap/Set</code> (sorted, lock-free, O(log n)), <code>ConcurrentLinkedDeque</code>, <code>LinkedTransferQueue</code>, <code>ConcurrentHashMap.newKeySet()</code>. There is no concurrent <code>TreeMap</code> or <code>PriorityQueue</code> except <code>PriorityBlockingQueue</code> (single lock).</p>`,
    aiEra: `<p><b>What AI changes:</b> ask an assistant to "make this map thread-safe" and you will usually get <code>ConcurrentHashMap</code> — the right container, but often with the original <code>containsKey</code>/<code>put</code> logic copied unchanged. The type changed; the race did not.</p>
<p><b>Prompts that work:</b> <code>Find every place this code does two calls on the same collection that must be atomic together</code>; <code>Rewrite using only single atomic CHM methods (merge, compute, putIfAbsent, remove(k,v)) and explain why each is atomic</code>; <code>Is the value object stored in this map itself thread-safe?</code></p>
<p><b>Where AI goes wrong:</b> recommends <code>synchronized (chm) {}</code> (useless), puts I/O or calls back into the same map inside <code>compute</code>, uses <code>size() == 0</code> as a correctness check, or suggests <code>CopyOnWriteArrayList</code> for a write-heavy log.</p>
<p><b>What you own:</b> spotting compound actions, knowing the semantics of each atomic method, and choosing between wrapper, concurrent collection, and immutable snapshot based on the read/write ratio.</p>`,
    problems: [{
      title: 'Bug Hunt: The Username Registry', level: 'Medium', tags: ['race condition', 'check-then-act', 'ConcurrentHashMap'], companies: ['Google', 'Uber', 'Swiggy'],
      statement: `<p>This registry is used by a sign-up endpoint with many threads. Users report two accounts with the same username, and the admin page sometimes crashes with <code>ConcurrentModificationException</code>. <b>Find every race and fix it</b> without one global lock.</p>
<pre>class Registry {
  Map&lt;String,Long&gt; users = Collections.synchronizedMap(new HashMap&lt;&gt;());
  boolean register(String name, long id) {
    if (users.containsKey(name)) return false;
    users.put(name, id); return true;
  }
  boolean rename(String oldN, String newN, long id) {
    if (!users.containsKey(newN) &amp;&amp; users.get(oldN) == id) {
      users.remove(oldN); users.put(newN, id); return true;
    } return false;
  }
  List&lt;String&gt; all() { List&lt;String&gt; r = new ArrayList&lt;&gt;();
    for (String n : users.keySet()) r.add(n); return r; }
}</pre>`,
      constraints: `<p>Thousands of sign-ups per second, many different usernames. Exactly one owner per username, ever. <code>all()</code> may be slightly stale.</p>`,
      example: `<p>Asha and Bala both call <code>register("neo", …)</code> at once → ${H.c('r', 'both get true')} today. After the fix: ${H.c('g', 'one true, one false')}. Also: <code>rename</code> can let a third user steal <code>newN</code> between its check and put, and <code>users.get(oldN) == id</code> throws <code>NullPointerException</code> if <code>oldN</code> was removed concurrently (unboxing null).</p>`,
      brute: { why: `<p>The given code is the "unsynchronized compound action" brute force: every single call is locked, but <b>register</b> (check-then-put), <b>rename</b> (check-then-remove-then-put) and <b>all</b> (unlocked iteration) all break. The other brute force — mark every method <code>synchronized</code> — is correct but serializes every sign-up in the company through one monitor, and <code>all()</code> blocks sign-ups while it copies.</p>`, code: `class RegistryGlobalLock {
    private final Map<String, Long> users = new HashMap<>();
    synchronized boolean register(String name, long id) {
        if (users.containsKey(name)) return false;
        users.put(name, id);
        return true;
    }
    synchronized boolean rename(String oldN, String newN, long id) {
        Long cur = users.get(oldN);
        if (cur == null || cur != id || users.containsKey(newN)) return false;
        users.remove(oldN);
        users.put(newN, id);
        return true;
    }
    synchronized List<String> all() { return new ArrayList<>(users.keySet()); }
}` },
      mcq: { q: 'For <code>rename</code>, which order of atomic steps is safe without a global lock?', options: ['remove(old) first, then putIfAbsent(new)', 'putIfAbsent(new, id) first; if it succeeds, remove(old, id)', 'put(new, id) then remove(old)', 'containsKey(new) then put(new, id)'], answer: 1, explain: 'Claim the new name atomically first; if someone else owns it you have changed nothing. Removing old first could leave the user with no name if the claim then fails. <code>remove(old, id)</code> only removes if old still maps to this user.' },
      hints: [`<p>Hint 1: Look for any place two map calls must agree with each other — those are the races. There are three.</p>`, `<p>Hint 2: <code>ConcurrentHashMap</code> has single-call versions: <code>putIfAbsent</code> (register), <code>remove(key, value)</code> (conditional delete), and iteration that never throws.</p>`, `<p>Hint 3: For rename, do the step that can fail <b>first</b> (claim new name), then the step that cannot conflict (conditional remove of old). Returning a copy of <code>keySet()</code> is a cheap weakly consistent snapshot.</p>`],
      solution: {
        approach: `<p>Swap to <code>ConcurrentHashMap</code> and express every operation as <b>atomic single calls</b>. <code>register</code> → <code>putIfAbsent(name, id) == null</code>. <code>rename</code> → verify ownership with <code>get</code> (a hint only), atomically claim <code>newN</code> with <code>putIfAbsent</code>, then <code>remove(oldN, id)</code>; if that conditional remove fails (someone deleted the account meanwhile), roll back the claim with <code>remove(newN, id)</code>. <code>all()</code> → <code>new ArrayList&lt;&gt;(users.keySet())</code>, a weakly consistent copy that never throws. No global lock: different usernames never contend.</p>`,
        code: `class Registry {
    private final ConcurrentHashMap<String, Long> users = new ConcurrentHashMap<>();

    boolean register(String name, long id) {
        return users.putIfAbsent(name, id) == null;          // check + insert in one step
    }

    boolean rename(String oldN, String newN, long id) {
        Long cur = users.get(oldN);
        if (cur == null || cur != id) return false;          // not yours (fast-path hint)
        if (users.putIfAbsent(newN, id) != null) return false; // claim new name atomically
        if (!users.remove(oldN, id)) {                       // old changed meanwhile?
            users.remove(newN, id);                          // roll back our claim
            return false;
        }
        return true;
    }

    List<String> all() { return new ArrayList<>(users.keySet()); }   // never throws CME

    public static void main(String[] args) throws InterruptedException {
        Registry r = new Registry();
        AtomicInteger wins = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int i = 0; i < 100; i++) {
            long id = i;
            pool.execute(() -> { if (r.register("neo", id)) wins.incrementAndGet(); });
        }
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("owners of neo: " + wins.get());   // always 1
        long owner = r.users.get("neo");
        System.out.println(r.rename("neo", "trinity", owner) + " " + r.all());
    }
}`,
        complexity: `<p>All operations O(1) average; contention only between threads touching the same username's bin. <code>all()</code> O(n) without blocking writers.</p>`,
        followUps: ['Usernames must be case-insensitive (normalize the key before every call).', 'Persist to a DB: what replaces putIfAbsent? (a UNIQUE constraint + INSERT, catch the duplicate-key error).', 'Reserve a name for 10 minutes during checkout (value = reservation with expiry, replace(k, old, new)).']
      }
    }]
  });

  /* ======================= TOPIC 3: TOKEN BUCKET RATE LIMITER ======================= */
  topics.push({
    title: 'Rate Limiter I: Token Bucket (Thread-Safe Implementation)',
    analogy: `<p>Think of a <b>jar of arcade tokens</b> at the entrance of a game zone. The jar holds at most <b>4 tokens</b>. A machine drops in <b>2 new tokens every second</b>, but if the jar is full the extra tokens fall on the floor and are lost. Every player who wants to enter must take one token. If the jar is empty, the player is turned away ("come back in a moment").</p>
<p>A big group arriving together can all get in at once if the jar was full — that is the <b>burst</b>. But over a long time, no more than 2 players per second can enter — that is the <b>steady rate</b>. And nobody needs to stand next to the machine dropping tokens: when a player arrives, you can just ask "how long since the last visit?" and drop that many tokens in at once. That shortcut is the <b>lazy refill</b>.</p>`,
    explain: `<p><b>Rate limiter</b> = a gatekeeper that says "allowed" or "too many requests (HTTP 429)" so one client cannot overload a service, run up your cloud bill, or burn your LLM API quota.</p>
<p><b>Token bucket has two knobs:</b> ${H.kv([['capacity', 'max burst (tokens the bucket can hold)'], ['refillRate', 'tokens added per second = sustained rate']], { label: 'Token bucket settings' })}</p>
<p><b>The algorithm on every request</b> (no timer thread needed):</p>
<ol><li><b>Refill lazily:</b> <code>tokens = min(capacity, tokens + (now − lastRefill) × rate)</code>, then <code>lastRefill = now</code>.</li>
<li>If <code>tokens ≥ 1</code>: take one, return <span class="c-g">ALLOW</span>. Otherwise return <span class="c-r">REJECT</span> (optionally tell the client to retry after <code>(1 − tokens) / rate</code> seconds).</li></ol>
<p><b>Worked numbers</b> (capacity 4, rate 2/s):</p>
${H.table(['time (s)', 'refill', 'tokens before', 'decision', 'tokens after'], [['0.0', 'starts full', '4', H.c('g', 'ALLOW'), '3'], ['0.0', '+0', '3', H.c('g', 'ALLOW'), '2'], ['0.0', '+0', '2 → 1 → 0', H.c('g', 'ALLOW ×2'), '0'], ['0.0', '+0', '0', H.c('r', 'REJECT'), '0'], ['0.5', '0.5 s × 2 = +1', '1', H.c('g', 'ALLOW'), '0'], ['3.0', '2.5 s × 2 = 5, capped to 4', '4', H.c('g', 'ALLOW'), '3']])}
<p><b>Why is this a concurrency problem?</b> "refill, check, decrement" is a <b>read-modify-write</b> on two fields (<code>tokens</code>, <code>lastRefill</code>). With one token left, two threads can both see <code>tokens = 1</code> and both take it → the limit is silently exceeded.</p>
<p><b>Brute force designs and why they fail:</b></p>
<ul><li><b>Unsynchronized bucket</b>: over-admits under load (exactly when the limiter matters most).</li>
<li><b>A background refill thread/timer per user</b>: 1 million users = 1 million scheduled tasks; most users are idle. Lazy refill needs zero threads.</li>
<li><b>One global lock for all users' buckets</b>: correct, but every request in the whole service queues on one lock just to update its own user's counter.</li></ul>
<p><b>The right shape:</b> a <code>ConcurrentHashMap&lt;String, TokenBucket&gt;</code> (one bucket per client key, created with <code>computeIfAbsent</code>) where each bucket protects its own two fields with its own small lock (or a CAS on an immutable state). Users never contend with each other; only requests from the <i>same</i> user touch the same lock. Use <code>System.nanoTime()</code> (monotonic — never jumps backwards when the wall clock is corrected) and inject the clock so tests can control time without sleeping.</p>`,
    clues: [
      '"Allow <b>bursts</b> up to N, but on average R per second" → token bucket (capacity = N, rate = R).',
      '"Design a rate limiter class" / "<code>boolean allow(clientId)</code>" in an LLD round → per-key buckets in a ConcurrentHashMap.',
      '"<b>Tokens per minute</b>" / requests have different costs (LLM prompt sizes, bulk APIs) → <code>tryAcquire(permits)</code> with variable cost.',
      '"Millions of clients, most idle" → lazy refill, no timer threads, evict idle buckets.',
      '"Must be thread-safe under heavy concurrent load" → the refill+check+decrement must be atomic per bucket.',
      '"Return when the client may retry" → compute <code>Retry-After = (permits − tokens) / rate</code>.'
    ],
    code: [{ lang: 'java', title: 'Thread-safe token bucket with lazy refill and an injectable clock', code: `class TokenBucket {
    private final long capacity;
    private final double refillPerNano;
    private final LongSupplier clock;     // System::nanoTime in production, a fake clock in tests
    private double tokens;                // guarded by "this"
    private long lastRefill;              // guarded by "this"

    TokenBucket(long capacity, double tokensPerSecond, LongSupplier clock) {
        if (capacity <= 0 || tokensPerSecond <= 0) throw new IllegalArgumentException("bad limits");
        this.capacity = capacity;
        this.refillPerNano = tokensPerSecond / 1_000_000_000.0;
        this.clock = clock;
        this.tokens = capacity;           // start full: allows an initial burst
        this.lastRefill = clock.getAsLong();
    }

    // refill + check + take happen under ONE lock hold: no two threads can take the same token
    synchronized boolean tryAcquire(int permits) {
        if (permits <= 0 || permits > capacity) throw new IllegalArgumentException("permits");
        refill();
        if (tokens >= permits) { tokens -= permits; return true; }
        return false;
    }

    // how long until "permits" tokens will exist (for a Retry-After header)
    synchronized long nanosUntil(int permits) {
        refill();
        return tokens >= permits ? 0 : (long) Math.ceil((permits - tokens) / refillPerNano);
    }

    private void refill() {               // lazy: no background thread, O(1)
        long now = clock.getAsLong();
        long elapsed = now - lastRefill;
        if (elapsed > 0) {
            tokens = Math.min(capacity, tokens + elapsed * refillPerNano);
            lastRefill = now;
        }
    }
}

class TokenBucketDemo {
    public static void main(String[] args) throws InterruptedException {
        AtomicLong fakeNow = new AtomicLong(0);                 // we control time: no sleeping
        TokenBucket b = new TokenBucket(4, 2.0, fakeNow::get);  // burst 4, 2 per second
        StringBuilder sb = new StringBuilder("t=0.0: ");
        for (int i = 0; i < 5; i++) sb.append(b.tryAcquire(1) ? "Y " : "N ");
        System.out.println(sb);                                 // Y Y Y Y N
        fakeNow.set(500_000_000L);                              // +0.5 s => +1 token
        System.out.println("t=0.5: " + b.tryAcquire(1) + " then " + b.tryAcquire(1));   // true then false
        System.out.println("retry after ms: " + b.nanosUntil(1) / 1_000_000);         // 500

        // concurrency check: 8 threads x 100 attempts at a frozen time => exactly 4 succeed
        TokenBucket shared = new TokenBucket(4, 2.0, () -> 0L);
        AtomicInteger ok = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int i = 0; i < 800; i++) pool.execute(() -> { if (shared.tryAcquire(1)) ok.incrementAndGet(); });
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("granted under contention: " + ok.get());                  // 4
    }
}` }, { lang: 'java', title: 'Lock-free variant (CAS on an immutable state) + per-client limiter', code: `class CasTokenBucket {
    private record State(double tokens, long last) {}       // immutable snapshot of both fields
    private final AtomicReference<State> state;
    private final double capacity, perNano;
    private final LongSupplier clock;

    CasTokenBucket(double capacity, double perSecond, LongSupplier clock) {
        this.capacity = capacity;
        this.perNano = perSecond / 1e9;
        this.clock = clock;
        this.state = new AtomicReference<>(new State(capacity, clock.getAsLong()));
    }

    boolean tryAcquire() {
        while (true) {                                           // classic CAS retry loop
            State s = state.get();
            long now = Math.max(clock.getAsLong(), s.last());
            double t = Math.min(capacity, s.tokens() + (now - s.last()) * perNano);
            if (t < 1) return false;
            if (state.compareAndSet(s, new State(t - 1, now))) return true;
            // another thread changed the state between get() and CAS: recompute and retry
        }
    }
}

class RateLimiter {
    private final ConcurrentHashMap<String, CasTokenBucket> buckets = new ConcurrentHashMap<>();
    private final double capacity, perSecond;
    private final LongSupplier clock;

    RateLimiter(double capacity, double perSecond, LongSupplier clock) {
        this.capacity = capacity; this.perSecond = perSecond; this.clock = clock;
    }

    boolean allow(String clientId) {
        // one bucket per client, created exactly once even under a thundering herd
        return buckets.computeIfAbsent(clientId, id -> new CasTokenBucket(capacity, perSecond, clock))
                      .tryAcquire();
    }

    public static void main(String[] args) {
        RateLimiter rl = new RateLimiter(2, 1, () -> 0L);
        System.out.println(rl.allow("asha") + " " + rl.allow("asha") + " " + rl.allow("asha")
                + " | bala: " + rl.allow("bala"));                // true true false | bala: true
    }
}` }],
    codeTitle: ['Synchronized TokenBucket', 'CAS bucket + per-client map'],
    viz: {
      title: 'Token bucket refilling and draining',
      input: '4 2 ; 0 0 0 0 0 0.5 0.6 1 1 1 3',
      inputLabel: 'capacity rate ; request times in seconds (sorted)',
      gen: function (input) {
        var hint = 'Format: "capacity rate ; request times in seconds", e.g. "4 2 ; 0 0 0 0 0 0.5 1 3". Capacity 1-10, rate 0.1-10/s, up to 16 sorted times.';
        var sp = String(input === undefined ? '' : input).split(';');
        if (sp.length !== 2) throw new Error(hint);
        var cfg = nums(sp[0], hint);
        if (cfg.length !== 2) throw new Error(hint);
        var cap = cfg[0], rate = cfg[1];
        if (cap < 1 || cap > 10 || cap % 1) throw new Error('Capacity must be a whole number 1-10. ' + hint);
        if (rate < 0.1 || rate > 10) throw new Error('Rate must be between 0.1 and 10 tokens/second. ' + hint);
        var times = nums(sp[1], hint);
        if (times.length > 16) throw new Error('At most 16 requests. ' + hint);
        for (var q = 0; q < times.length; q++) { if (times[q] < 0 || (q && times[q] < times[q - 1])) throw new Error('Times must be ≥ 0 and sorted. ' + hint); }
        var tokens = cap, last = 0, frames = [], hist = [], histLbl = [], histHl = {}, log = [], allowed = 0, rejected = 0;
        function slots(hlMap) {
          var v = [], tx = [], lbl = [];
          for (var i = 0; i < cap; i++) { var f = r2(Math.max(0, Math.min(1, tokens - i))); v.push(f); tx.push(f === 1 ? '●' : f === 0 ? '○' : String(f)); lbl.push('slot ' + (i + 1)); }
          return { type: 'bars', label: 'Bucket (each bar = one token slot, height = how full)', values: v, texts: tx, idxLabels: lbl, hl: hlMap || {} };
        }
        function histPart() { return { type: 'bars', label: 'Tokens left after each request', values: hist.slice(), idxLabels: histLbl.slice(), hl: clone(histHl) }; }
        frames.push(F('The bucket starts <b>full</b>: ' + cap + ' tokens. It refills at <b>' + rate + ' token(s)/second</b> but never above ' + cap + '. There is no timer thread — tokens are added <i>lazily</i> when a request arrives.', [
          slots(), VARS('State (guarded by the bucket lock)', { now: 0, lastRefill: 0, tokens: cap, capacity: cap, rate: rate + '/s' }), TABLE('Decisions', ['#', 'time', 'tokens before', 'decision'], log)]));
        for (var i = 0; i < times.length; i++) {
          var t = times[i], elapsed = r2(t - last), room = cap - tokens, add = Math.min(room, (t - last) * rate);
          var before = tokens;
          tokens = tokens + add; last = t;
          var sh = {};
          for (var k = Math.floor(before); k < Math.ceil(tokens - 1e-9); k++) sh[k] = 'ok';
          frames.push(F('Request #' + (i + 1) + ' at <b>t = ' + t + 's</b>. Thread takes the bucket lock, then refills: ' + elapsed + 's elapsed × ' + rate + '/s = ' + r2(elapsed * rate) + ' token(s)' + (elapsed * rate > room + 1e-9 ? ', but only <b>' + r2(room) + '</b> fit (capacity ' + cap + '; the rest spill and are lost)' : '') + '. Tokens: ' + r2(before) + ' → <b>' + r2(tokens) + '</b>.', [
            slots(sh), VARS('State (lock held by this request)', { now: t, lastRefill: last, elapsed: elapsed + 's', added: '+' + r2(add), tokens: r2(tokens) }, { added: add > 0 ? 'ok' : '', tokens: 'cur' }), TABLE('Decisions', ['#', 'time', 'tokens before', 'decision'], log)]));
          var ok = tokens >= 1 - 1e-9, dh = {};
          if (ok) { tokens = Math.max(0, tokens - 1); allowed++; dh[Math.floor(tokens + 1e-9)] = 'cur'; }
          else rejected++;
          var retry = ok ? '' : r2((1 - tokens) / rate);
          log.push([i + 1, t + 's', r2(ok ? tokens + 1 : tokens), ok ? '<span class="c-g">ALLOW</span>' : '<span class="c-r">REJECT 429, retry in ' + retry + 's</span>']);
          hist.push(r2(tokens)); histLbl.push('#' + (i + 1)); histHl[hist.length - 1] = ok ? 'ok' : 'bad';
          var lh = {}; lh[log.length - 1] = ok ? 'ok' : 'bad';
          frames.push(F(ok ? '<span class="c-g">ALLOW.</span> At least one whole token exists, so this request takes it (tokens now ' + r2(tokens) + ') and the lock is released. Because refill + check + take happened in <i>one</i> lock hold, no other thread could grab the same token.' : '<span class="c-r">REJECT.</span> Only ' + r2(tokens) + ' token(s) — not enough. The client gets HTTP 429 with <code>Retry-After ≈ ' + retry + 's</code> (time for the bucket to reach 1 token at ' + rate + '/s). Nothing is consumed.', [
            slots(dh), histPart(), TABLE('Decisions', ['#', 'time', 'tokens before', 'decision'], log, lh)]));
        }
        frames.push(F('Done: <b>' + allowed + '</b> allowed, <b>' + rejected + '</b> rejected. Notice the pattern — an initial burst up to the capacity, then admissions slow to the refill rate. Long idle gaps cannot "bank" more than ' + cap + ' tokens.', [
          slots(), histPart(), VARS('Totals', { allowed: allowed, rejected: rejected, capacity: cap, rate: rate + '/s' }, { allowed: 'ok', rejected: rejected ? 'bad' : '' })]));
        return frames;
      }
    },
    examples: [
      { title: 'Two threads, one token: the over-admit race', html: `<p>Unsynchronized bucket with <code>tokens = 1</code>. Requests from the same user land on two server threads:</p>
${H.table(['t', 'Thread 1', 'Thread 2', 'tokens'], [['1', 'refill; read tokens = 1 ≥ 1 ✓', '', '1'], ['2', '', 'refill; read tokens = 1 ≥ 1 ✓', '1'], ['3', 'tokens = 1 − 1 = 0 → ALLOW', '', '0'], ['4', '', H.c('r', 'tokens = 1 − 1 = 0 → ALLOW'), H.c('r', '0 (2 admitted on 1 token)')]])}
<p>Under a traffic spike there are dozens of threads, so the "limit" can be exceeded many times over — the limiter fails exactly when it is needed. Making <code>tryAcquire</code> <code>synchronized</code> (or CAS on an immutable state) fixes it.</p>` },
      { title: 'Variable cost: an LLM token-per-minute limiter', html: `<p>An AI gateway allows each team <b>90,000 tokens/minute</b> (rate = 1,500/s) with bursts up to 90,000. A request with a 6,000-token prompt calls <code>tryAcquire(6000)</code>. Same bucket, same lock, only the permit count changes. Tip: reserve an estimate up front and refund the difference after the response returns the real usage.</p>`, code: `class TeamQuota {
    private final double capacity = 90_000, perNano = 1_500 / 1e9;   // 90k tokens per minute
    private double tokens = capacity;                                  // guarded by this
    private long last = System.nanoTime();                             // guarded by this

    // the same token bucket, but each request costs "estimatedTokens" permits
    synchronized boolean admit(int estimatedTokens) {
        long now = System.nanoTime();
        tokens = Math.min(capacity, tokens + (now - last) * perNano);
        last = now;
        if (tokens < estimatedTokens) return false;    // caller answers 429
        tokens -= estimatedTokens;
        return true;
    }

    // after the response reports real usage, give back what we over-reserved
    synchronized void refund(int unusedTokens) { tokens = Math.min(capacity, tokens + unusedTokens); }
}` },
      { title: 'Blocking acquire without holding the lock while sleeping', html: `<p>Sometimes a client should <b>wait</b> instead of being rejected (a batch job calling a partner API). The naive version sleeps inside <code>synchronized</code> — every other thread is blocked for the whole sleep. The better pattern (used by Guava's <code>RateLimiter</code>) is <b>reservation</b>: under the lock, compute your wait time and take the tokens "on credit" (tokens may go negative); release the lock; then sleep.</p>`, code: `class PacedClient {
    private final double perNano;
    private long nextFree;                 // guarded by this: earliest time the next permit is free

    PacedClient(double perSecond) { this.perNano = perSecond / 1e9; this.nextFree = System.nanoTime(); }

    void acquire() throws InterruptedException {
        long waitNanos;
        synchronized (this) {              // short critical section: just arithmetic
            long now = System.nanoTime();
            long start = Math.max(now, nextFree);
            waitNanos = start - now;
            nextFree = start + (long) (1 / perNano);   // reserve our slot
        }
        if (waitNanos > 0) TimeUnit.NANOSECONDS.sleep(waitNanos);   // sleep OUTSIDE the lock
    }
}` },
      { title: 'The integer-refill starvation bug', html: `<p>A common hand-written refill: <code>long add = (now - last) / 1000 * rate; tokens += add; last = now;</code> with millisecond time and rate 1/s. If a client calls every 400 ms, each call computes <code>400 / 1000 = 0</code> tokens <i>and still resets <code>last</code></i>. The bucket ${H.c('r', 'never refills')} for a steady caller. Fixes: keep fractional tokens (double, or tokens scaled ×10⁹), or only advance <code>last</code> by the time that was actually converted into tokens.</p>` }
    ],
    deepDive: `<p><b>Exactness of lazy refill.</b> Refilling on demand gives exactly the same answers as a perfect background timer, because tokens are a pure function of elapsed time — capped at capacity. That is why production limiters (Guava, Bucket4j, Resilience4j, Envoy local rate limit) never run a thread per key.</p>
<p><b>Time source.</b> Use <code>System.nanoTime()</code>: monotonic within one JVM. <code>currentTimeMillis()</code> follows the wall clock, which NTP can step backwards → negative elapsed → negative tokens or a stalled bucket. Guard with <code>if (elapsed &gt; 0)</code> anyway. Inject the clock (<code>LongSupplier</code>, <code>InstantSource</code> in Java 17+) so tests are deterministic and never sleep.</p>
<p><b>Precision.</b> A <code>double</code> holds fractions fine for realistic rates. For billing-grade exactness store <b>nano-tokens</b> in a <code>long</code> (1 token = 10⁹ units) and refill with integer math; check overflow when multiplying elapsed by rate.</p>
<p><b>Synchronized vs CAS.</b> Per-key buckets are rarely contended (one user's concurrent requests), so a plain monitor is simplest and fast. A single <b>global</b> bucket (e.g. "max 50k req/s to the DB") is a hotspot: CAS retries burn CPU under contention; consider sharding capacity across N sub-buckets chosen by thread or hash (approximate but scalable).</p>
<p><b>Memory.</b> A bucket per IP/user grows forever. Evict buckets idle long enough to be full again (idle ≥ capacity / rate seconds) — a full bucket is identical to a freshly created one, so eviction is invisible to clients. Use <code>map.remove(key, bucket)</code> so you do not remove a bucket another thread just replaced; or use Caffeine with <code>expireAfterAccess</code>.</p>
<p><b>Distributed version.</b> Many app servers → the bucket lives in Redis. The read-refill-decrement must be atomic there too: a Lua script (<code>EVALSHA</code>) storing <code>tokens</code> and <code>ts</code> in a hash, or <b>GCRA</b> (Generic Cell Rate Algorithm), which stores a single "theoretical arrival time" per key and is equivalent to a token bucket. Clock skew between servers matters — use Redis server time (<code>TIME</code>) inside the script.</p>
<p><b>Leaky bucket vs token bucket.</b> Leaky bucket (as a queue) <i>smooths</i> output to a constant rate and adds latency; token bucket allows bursts and decides instantly. "Leaky bucket as a meter" is mathematically the same as a token bucket. HTTP: respond <code>429 Too Many Requests</code> with <code>Retry-After</code>; many APIs also send <code>RateLimit-Limit/Remaining/Reset</code>-style headers.</p>`,
    aiEra: `<p><b>What AI changes:</b> rate limiting is now a <i>client-side</i> problem too. AI agents fan out dozens of parallel LLM and tool calls; providers enforce requests-per-minute <b>and</b> tokens-per-minute. A token bucket with variable permits in front of your LLM client turns a storm of 429s into smooth throughput.</p>
<p><b>Use AI as a partner:</b> <code>Generate a table of request times and expected allow/reject for capacity 3, rate 1/s, including an idle gap that would overflow the bucket</code> — then feed it to your fake-clock test. <code>Rewrite this limiter's refill so steady callers can never starve</code>.</p>
<p><b>Where AI goes wrong:</b> uses <code>currentTimeMillis</code>; writes integer refill that starves frequent callers; refills with a <code>ScheduledExecutorService</code> per user; forgets the capacity cap so idle clients bank unlimited burst; makes <code>allow</code> synchronized on the whole limiter (global lock); writes tests with <code>Thread.sleep</code> that are slow and flaky.</p>
<p><b>What you own:</b> picking the algorithm from the requirements (burst allowed? exact window?), the per-key locking design, the eviction story, and the jump to a distributed atomic script when there is more than one server.</p>`,
    problems: [{
      title: 'Per-Client Token Bucket Rate Limiter', level: 'Medium', tags: ['rate limiter', 'token bucket', 'ConcurrentHashMap'], companies: ['Stripe', 'Amazon', 'Razorpay', 'Cloudflare'],
      statement: `<p>Design and implement <code>RateLimiter</code> with <code>boolean allow(String clientId)</code> and <code>long retryAfterMillis(String clientId)</code>. Each client may burst up to <b>capacity</b> requests and sustain <b>refillPerSecond</b> requests per second. It is called concurrently from a request thread pool. Different clients must not slow each other down.</p>`,
      constraints: `<p>Up to 10<sup>6</sup> distinct clients, most idle. 10<sup>5</sup> calls/sec total. No background thread per client. Must never admit more than the limit for a client, even when that client's requests arrive on 50 threads at once.</p>`,
      example: `<p>capacity 3, rate 1/s. Client "asha" at t=0 sends 4 requests → ${H.c('g', 'Y Y Y')} ${H.c('r', 'N')}; retryAfter = 1000 ms. At t=1.0 → ${H.c('g', 'Y')}. Client "bala" at t=0 → ${H.c('g', 'Y')} (separate bucket).</p>`,
      brute: { why: `<p>Brute force A: a single <code>HashMap&lt;String, int[]&gt;</code> with no locks — the map itself can corrupt, and two threads can take the last token. Brute force B: <code>synchronized allow()</code> on the whole limiter plus a scheduled task that refills every bucket every second — correct, but one global lock serializes 100k req/s, the refill task walks a million buckets every second while holding that same lock, and refill granularity is a coarse 1 s step.</p>`, code: `class GlobalLockLimiter {
    private final Map<String, Integer> tokens = new HashMap<>();
    private final int capacity;
    GlobalLockLimiter(int capacity, ScheduledExecutorService timer) {
        this.capacity = capacity;
        // walks EVERY client every second while holding the global lock
        timer.scheduleAtFixedRate(this::refillAll, 1, 1, TimeUnit.SECONDS);
    }
    synchronized boolean allow(String client) {          // every request in the service waits here
        int t = tokens.getOrDefault(client, capacity);
        if (t == 0) return false;
        tokens.put(client, t - 1);
        return true;
    }
    private synchronized void refillAll() {
        tokens.replaceAll((k, v) -> Math.min(capacity, v + 1));
    }
}` },
      mcq: { q: 'Two threads call <code>allow("asha")</code> for the first time at the same instant. With <code>buckets.computeIfAbsent(id, k -&gt; new Bucket())</code>, how many buckets exist for asha afterwards?', options: ['Two — each thread creates one', 'Exactly one — computeIfAbsent runs the factory at most once per key and both threads get the same bucket', 'Zero until the next refill', 'It depends on the hash code'], answer: 1, explain: 'CHM.computeIfAbsent is atomic per key. A <code>get</code>, then <code>if null put(new)</code> sequence would race and could hand the two threads different buckets — each would get a full burst.' },
      hints: [`<p>Hint 1: Separate the problem: (a) find-or-create the client's bucket atomically, (b) make one bucket's refill+check+take atomic. Different clients should never share a lock.</p>`, `<p>Hint 2: <code>ConcurrentHashMap.computeIfAbsent</code> for (a); a small <code>synchronized</code> method on the bucket for (b). Refill lazily from elapsed nanoTime.</p>`, `<p>Hint 3: Inject a clock for testing. retryAfter = ceil((1 − tokens) / rate). Edge cases: elapsed ≤ 0, idle client must not exceed capacity, permits &gt; capacity is invalid.</p>`],
      solution: {
        approach: `<p>Per-client <b>lazy-refill token bucket</b> stored in a <code>ConcurrentHashMap</code>. Lock scope = one bucket, so contention only happens among a single client's own concurrent requests. Each bucket holds <code>tokens</code> and <code>lastRefill</code> under its monitor; <code>allow</code> refills from elapsed time, checks, and decrements in one critical section. Idle buckets can be evicted safely because a bucket idle for ≥ capacity/rate seconds is indistinguishable from a new one. (A request that fetched the bucket a microsecond before eviction still spends from the evicted copy, so at most the in-flight requests at that instant can slip through — fine for a limiter; if it is not, evict inside <code>computeIfPresent</code> and re-check in <code>allow</code>.)</p>`,
        code: `class ClientRateLimiter {
    static final class Bucket {
        private final double capacity, perNano;
        private double tokens;
        private long last;
        Bucket(double capacity, double perSecond, long now) {
            this.capacity = capacity; this.perNano = perSecond / 1e9; this.tokens = capacity; this.last = now;
        }
        synchronized boolean take(long now) {
            refill(now);
            if (tokens >= 1) { tokens -= 1; return true; }
            return false;
        }
        synchronized long retryAfterNanos(long now) {
            refill(now);
            return tokens >= 1 ? 0 : (long) Math.ceil((1 - tokens) / perNano);
        }
        synchronized boolean isFullAt(long now) { refill(now); return tokens >= capacity; }
        private void refill(long now) {
            if (now > last) { tokens = Math.min(capacity, tokens + (now - last) * perNano); last = now; }
        }
    }

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final double capacity, perSecond;
    private final LongSupplier clock;

    ClientRateLimiter(double capacity, double perSecond, LongSupplier clock) {
        this.capacity = capacity; this.perSecond = perSecond; this.clock = clock;
    }

    boolean allow(String clientId) {
        long now = clock.getAsLong();
        return buckets.computeIfAbsent(clientId, id -> new Bucket(capacity, perSecond, now)).take(now);
    }

    long retryAfterMillis(String clientId) {
        Bucket b = buckets.get(clientId);
        return b == null ? 0 : b.retryAfterNanos(clock.getAsLong()) / 1_000_000;
    }

    // call from a single housekeeping thread now and then: drop buckets that are full again
    void evictIdle() {
        long now = clock.getAsLong();
        buckets.forEach((id, b) -> { if (b.isFullAt(now)) buckets.remove(id, b); });
    }

    public static void main(String[] args) throws InterruptedException {
        AtomicLong now = new AtomicLong();
        ClientRateLimiter rl = new ClientRateLimiter(3, 1, now::get);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 4; i++) sb.append(rl.allow("asha") ? "Y" : "N");
        System.out.println(sb + " retry=" + rl.retryAfterMillis("asha") + "ms bala=" + rl.allow("bala")); // YYYN retry=1000ms bala=true

        // 50 threads hammer one client at frozen time: exactly 3 admitted
        AtomicInteger ok = new AtomicInteger();
        ClientRateLimiter rl2 = new ClientRateLimiter(3, 1, () -> 0L);
        ExecutorService pool = Executors.newFixedThreadPool(50);
        for (int i = 0; i < 500; i++) pool.execute(() -> { if (rl2.allow("hot")) ok.incrementAndGet(); });
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("admitted=" + ok.get());   // 3
    }
}`,
        dry: { head: ['time', 'client', 'tokens before (after refill)', 'result', 'tokens after'], rows: [['0.0', 'asha', '3', 'Y', '2'], ['0.0', 'asha', '2 → 1', 'Y, Y', '0'], ['0.0', 'asha', '0', H.c('r', 'N (retry 1000 ms)'), '0'], ['0.0', 'bala', '3 (new bucket)', 'Y', '2'], ['1.0', 'asha', '0 + 1×1 = 1', 'Y', '0']] },
        complexity: `<p>O(1) per call; memory O(active clients). Contention only between a client's own concurrent requests. Eviction is O(n) but runs off the hot path and never blocks requests globally.</p>`,
        followUps: ['Different tiers (free = 10/s, pro = 100/s): pass a policy into the bucket factory.', 'Make it work across 20 servers (Redis + Lua / GCRA).', 'Why is <code>remove(id, b)</code> safer than <code>remove(id)</code> in eviction?']
      }
    }]
  });

  /* ======================= TOPIC 4: SLIDING WINDOW RATE LIMITERS ======================= */
  topics.push({
    title: 'Rate Limiter II: Fixed Window, Sliding Window Log & Sliding Window Counter',
    analogy: `<p>A gym has a rule: <b>"at most 3 entries per member in any 10 minutes."</b></p>
<ul><li>The lazy guard uses a <b>wall clock</b>: he resets his tally sheet at 10:00, 10:10, 10:20 (<b>fixed window</b>). A member can enter 3 times at 10:09 and 3 more times at 10:10 — six entries in two minutes, and the guard is happy.</li>
<li>The strict guard keeps a <b>notebook of exact entry times</b> for each member. When you arrive he crosses out times older than 10 minutes and counts what is left (<b>sliding window log</b>). Perfectly fair, but the notebook grows with traffic.</li>
<li>The clever guard keeps just <b>two numbers</b>: entries in the previous 10-minute block and in the current one, and estimates "how many of the previous block still overlap the last 10 minutes" (<b>sliding window counter</b>). Almost exact, tiny memory.</li></ul>`,
    explain: `<p>Token bucket controls <i>average rate + burst</i>. Many product rules are instead phrased as <b>"at most N requests in any window of W seconds"</b> (login attempts, OTP sends, API tiers). Three implementations:</p>
${H.table(['Algorithm', 'State per key', 'Accuracy', 'Main weakness'], [
  ['Fixed window counter', 'window id + count', 'up to <b>2N</b> in a short span across a boundary', 'boundary burst'],
  ['Sliding window log', 'deque of accepted timestamps (≤ N)', H.c('g', 'exact'), 'memory O(N) per key, O(evicted) work'],
  ['Sliding window counter', 'prev count, current count, window start', 'approximate (assumes prev window was evenly spread)', 'can be slightly off at edges']
])}
<p><b>Fixed window boundary burst</b> (N = 3 per 10 s): requests at t = 8, 9, 9.5 (window [0,10)) and t = 10, 10.5, 11 (window [10,20)) → ${H.c('r', 'all 6 allowed within 3 seconds')}.</p>
<p><b>Sliding window log, step by step:</b> on each request at time <code>now</code>:</p>
<ol><li>Pop timestamps from the front of the deque while <code>ts ≤ now − W</code> (they have slid out of the window).</li>
<li>If <code>deque.size() &lt; N</code>: push <code>now</code> to the back, <span class="c-g">ALLOW</span>. Otherwise <span class="c-r">REJECT</span> — and do <b>not</b> record the rejected request (otherwise a client that keeps retrying stays blocked forever).</li></ol>
<p><b>Sliding window counter formula:</b> <code>estimate = prevCount × (1 − elapsedInCurrent / W) + currCount</code>. Example: W = 60 s, prev = 10, curr = 4, we are 15 s into the current window → <code>10 × 0.75 + 4 = 11.5</code>. With N = 12 → allow.</p>
<p><b>Thread-safety:</b> each algorithm is a read-modify-write on per-key state ("evict, count, append"). <code>ArrayDeque</code> is not thread-safe, and even a <code>ConcurrentLinkedDeque</code> would not make "size check + add" atomic. So: <code>ConcurrentHashMap</code> to find the key's state, then a <b>lock per key</b> around the whole evict-check-append. Brute force alternatives — no lock (deque corrupts, over-admits) or one global lock (all keys serialize) — fail for the same reasons as in the token bucket.</p>`,
    clues: [
      '"At most N requests in <b>any</b> W-second window" / "<b>rolling</b> window" → sliding window (log for exact, counter for cheap).',
      '"Users exploit the <b>reset at the top of the minute</b>" → fixed window boundary burst; switch to sliding.',
      '"Exact limit required (OTP / login attempts / payouts)" → sliding window log.',
      '"Huge number of keys, memory is tight, small error OK" → sliding window counter (two ints per key).',
      '"Rejected requests should not extend the lockout" → never log rejected requests.',
      '"Thread-safe" + deque/list per user → per-key lock around evict + check + append.'
    ],
    code: [{ lang: 'java', title: 'Sliding window LOG limiter: exact, per-key lock', code: `class SlidingWindowLogLimiter {
    private final int limit;
    private final long windowNanos;
    private final LongSupplier clock;
    // key -> timestamps of ACCEPTED requests, oldest first. Each deque is guarded by itself.
    private final ConcurrentHashMap<String, ArrayDeque<Long>> logs = new ConcurrentHashMap<>();

    SlidingWindowLogLimiter(int limit, long window, TimeUnit unit, LongSupplier clock) {
        this.limit = limit;
        this.windowNanos = unit.toNanos(window);
        this.clock = clock;
    }

    boolean allow(String key) {
        ArrayDeque<Long> log = logs.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (log) {                                 // lock ONLY this key's log
            long now = clock.getAsLong();
            while (!log.isEmpty() && log.peekFirst() <= now - windowNanos) log.pollFirst(); // slide out
            if (log.size() < limit) { log.addLast(now); return true; }
            return false;                                    // rejected requests are NOT logged
        }
    }

    public static void main(String[] args) {
        AtomicLong t = new AtomicLong();
        SlidingWindowLogLimiter rl = new SlidingWindowLogLimiter(3, 10, TimeUnit.SECONDS, t::get);
        long[] times = {1, 2, 3, 8, 11, 12, 13, 14, 25};
        StringBuilder sb = new StringBuilder();
        for (long s : times) {
            t.set(TimeUnit.SECONDS.toNanos(s));
            sb.append(s).append(rl.allow("u1") ? ":Y " : ":N ");
        }
        System.out.println(sb);   // 1:Y 2:Y 3:Y 8:N 11:Y 12:Y 13:Y 14:N 25:Y
    }
}` }, { lang: 'java', title: 'Sliding window COUNTER limiter: O(1) memory per key', code: `class SlidingWindowCounterLimiter {
    private static final class Window {          // guarded by its own monitor
        long start;                             // start of the current fixed window
        int prev, curr;
    }
    private final int limit;
    private final long w;                       // window length in nanos
    private final LongSupplier clock;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    SlidingWindowCounterLimiter(int limit, long windowNanos, LongSupplier clock) {
        this.limit = limit; this.w = windowNanos; this.clock = clock;
    }

    boolean allow(String key) {
        long now = clock.getAsLong();
        Window win = windows.computeIfAbsent(key, k -> { Window x = new Window(); x.start = now - Math.floorMod(now, w); return x; });
        synchronized (win) {
            long currentStart = now - Math.floorMod(now, w);
            if (currentStart != win.start) {                 // roll forward
                win.prev = (currentStart - win.start == w) ? win.curr : 0;  // gap of 2+ windows => 0
                win.curr = 0;
                win.start = currentStart;
            }
            double weightPrev = 1.0 - (double) (now - win.start) / w;
            double estimate = win.prev * weightPrev + win.curr;
            if (estimate + 1 <= limit) { win.curr++; return true; }
            return false;
        }
    }

    public static void main(String[] args) {
        AtomicLong t = new AtomicLong();
        long sec = 1_000_000_000L;
        SlidingWindowCounterLimiter rl = new SlidingWindowCounterLimiter(3, 10 * sec, t::get);
        StringBuilder sb = new StringBuilder();
        for (long s : new long[]{8, 9, 9, 10, 11, 16, 19}) {
            t.set(s * sec);
            sb.append(s).append(rl.allow("u") ? ":Y " : ":N ");
        }
        System.out.println(sb);   // 8:Y 9:Y 9:Y 10:N 11:N 16:Y 19:Y  (no boundary burst at 10-11)
    }
}` }],
    codeTitle: ['Exact: sliding log', 'Cheap: sliding counter'],
    viz: [{
      title: 'Sliding window log: the window slides, old timestamps fall out',
      input: '3 10 ; 1 2 3 8 11 12 13 14 25',
      inputLabel: 'limit window ; request times (sorted)',
      gen: function (input) {
        var hint = 'Format: "limit windowSeconds ; times", e.g. "3 10 ; 1 2 3 8 11 12 13 14 25". limit 1-8, window 1-100, up to 14 sorted times.';
        var sp = String(input === undefined ? '' : input).split(';');
        if (sp.length !== 2) throw new Error(hint);
        var cfg = nums(sp[0], hint);
        if (cfg.length !== 2) throw new Error(hint);
        var N = cfg[0], W = cfg[1];
        if (N < 1 || N > 8 || N % 1) throw new Error('limit must be 1-8. ' + hint);
        if (W < 1 || W > 100) throw new Error('window must be 1-100. ' + hint);
        var times = nums(sp[1], hint);
        if (times.length > 14) throw new Error('At most 14 requests. ' + hint);
        for (var q = 1; q < times.length; q++) if (times[q] < times[q - 1]) throw new Error('Times must be sorted. ' + hint);
        var status = [], dq = [], frames = [], allowed = 0;
        function arrPart(i, lo) {
          var hl = {};
          for (var k = 0; k <= i; k++) hl[k] = status[k] === 'Y' ? (k >= lo && dq.indexOf(k) >= 0 ? 'ok' : 'done') : status[k] === 'N' ? 'bad' : 'cur';
          var ptr = {}; ptr[i] = 'now';
          var lbl = times.map(function (_, k) { return '#' + (k + 1); });
          return { type: 'array', label: 'All arrivals (green = accepted & still in window, red = rejected, faded = slid out)', values: times.slice(), hl: hl, ptr: ptr, range: [lo, i], idxLabels: lbl };
        }
        function qPart(hl) { return { type: 'queue', label: 'Deque of accepted timestamps (per-key, guarded by its lock)', items: dq.map(function (k) { return times[k]; }), hl: hl || {}, frontLabel: 'oldest', backLabel: 'newest' }; }
        frames.push(F('Rule: at most <b>' + N + '</b> requests in any <b>' + W + 's</b> window. For each key we keep a deque of the times of <i>accepted</i> requests. Every request locks the key, evicts expired times, counts, and maybe appends — all in one critical section.', [
          { type: 'array', label: 'All arrivals', values: times.slice(), idxLabels: times.map(function (_, k) { return '#' + (k + 1); }) }, qPart(), VARS('Settings', { limit: N, window: W + 's' })]));
        for (var i = 0; i < times.length; i++) {
          var now = times[i], cut = now - W, evicted = [];
          status[i] = '?';
          while (dq.length && times[dq[0]] <= cut) evicted.push(times[dq.shift()]);
          var lo = 0; while (lo < i && times[lo] <= cut) lo++;
          frames.push(F('Request #' + (i + 1) + ' at <b>t = ' + now + '</b>. Window is (' + cut + ', ' + now + ']. ' + (evicted.length ? 'Evict from the front: <b>' + evicted.join(', ') + '</b> (≤ ' + cut + ', slid out of the window).' : 'Nothing to evict — the oldest accepted time is still inside the window.'), [
            arrPart(i, lo), qPart(), VARS('Check (lock held)', { now: now, windowStart: '> ' + cut, inWindow: dq.length, limit: N }, { inWindow: 'cur' })]));
          var ok = dq.length < N;
          status[i] = ok ? 'Y' : 'N';
          if (ok) { dq.push(i); allowed++; }
          var qh = {}; if (ok) qh[dq.length - 1] = 'ok';
          frames.push(F(ok ? '<span class="c-g">ALLOW.</span> Only ' + (dq.length - 1) + ' accepted request(s) in the window (&lt; ' + N + '), so append ' + now + ' to the back.' : '<span class="c-r">REJECT.</span> Already ' + N + ' accepted in (' + cut + ', ' + now + ']. The rejected time is <b>not</b> appended — next slot frees up at t = ' + (times[dq[0]] + W) + ' when ' + times[dq[0]] + ' slides out.', [
            arrPart(i, lo), qPart(qh), VARS('Decision', { now: now, inWindow: dq.length, limit: N, decision: ok ? 'ALLOW' : 'REJECT' }, { decision: ok ? 'ok' : 'bad' })]));
        }
        frames.push(F('Finished: <b>' + allowed + '</b> of ' + times.length + ' allowed. In <i>every</i> ' + W + 's span at most ' + N + ' requests got through — no boundary trick works against a log. Cost: the deque holds up to ' + N + ' timestamps per key.', [arrPart(times.length - 1, 0), qPart(), VARS('Totals', { allowed: allowed, rejected: times.length - allowed }, { allowed: 'ok' })]));
        return frames;
      }
    }, {
      title: 'Fixed window vs sliding window counter at a boundary',
      input: '3 10 ; 8 9 9 10 11 16 19 25',
      inputLabel: 'limit window ; request times (sorted)',
      gen: function (input) {
        var hint = 'Format: "limit window ; times", e.g. "3 10 ; 8 9 9 10 11 16 19". limit 1-8, window 2-100, up to 14 sorted times.';
        var sp = String(input === undefined ? '' : input).split(';');
        if (sp.length !== 2) throw new Error(hint);
        var cfg = nums(sp[0], hint);
        if (cfg.length !== 2) throw new Error(hint);
        var N = cfg[0], W = cfg[1];
        if (N < 1 || N > 8 || N % 1 || W < 2 || W > 100) throw new Error(hint);
        var times = nums(sp[1], hint);
        if (times.length > 14) throw new Error('At most 14 requests. ' + hint);
        for (var q = 1; q < times.length; q++) if (times[q] < times[q - 1]) throw new Error('Times must be sorted. ' + hint);
        var fx = { id: null, count: 0 }, sl = { start: null, prev: 0, curr: 0 }, rows = [], frames = [], fixedOk = 0, slideOk = 0;
        frames.push(F('Same traffic, two limiters, limit <b>' + N + ' per ' + W + 's</b>. Fixed window resets its counter at multiples of ' + W + '. Sliding counter blends the previous window\'s count by how much of it still overlaps the last ' + W + 's.', [
          TABLE('Decisions', ['t', 'fixed: window/count', 'fixed', 'sliding: prev×weight + curr', 'sliding'], rows), VARS('State', { fixedWindow: '-', fixedCount: 0, slidePrev: 0, slideCurr: 0 })]));
        for (var i = 0; i < times.length; i++) {
          var t = times[i], id = Math.floor(t / W);
          if (fx.id !== id) { fx.id = id; fx.count = 0; }
          var fOk = fx.count < N; if (fOk) { fx.count++; fixedOk++; }
          var start = id * W;
          if (sl.start === null) sl.start = start;
          if (start !== sl.start) { sl.prev = (start - sl.start === W) ? sl.curr : 0; sl.curr = 0; sl.start = start; }
          var weight = 1 - (t - start) / W, est = sl.prev * weight + sl.curr;
          var sOk = est + 1 <= N + 1e-9; if (sOk) { sl.curr++; slideOk++; }
          rows.push([t, '[' + start + ',' + (start + W) + ') ' + fx.count + (fOk ? '' : ' (full)'), fOk ? '<span class="c-g">Y</span>' : '<span class="c-r">N</span>', sl.prev + '×' + r2(weight) + ' + ' + (sOk ? sl.curr - 1 : sl.curr) + ' = ' + r2(est), sOk ? '<span class="c-g">Y</span>' : '<span class="c-r">N</span>']);
          var h = {}; h[rows.length - 1] = fOk && !sOk ? 'bad' : 'cur';
          frames.push(F('t = <b>' + t + '</b>. Fixed window [' + start + ', ' + (start + W) + ') count → ' + fx.count + ': ' + (fOk ? 'allow' : 'reject') + '. Sliding estimate = ' + sl.prev + ' × ' + r2(weight) + ' + ' + (sOk ? sl.curr - 1 : sl.curr) + ' = ' + r2(est) + (sOk ? ' → +1 fits under ' + N + ', allow.' : ' → +1 exceeds ' + N + ', reject.') + (fOk && !sOk ? ' <span class="c-r">The fixed window just let a boundary burst through.</span>' : ''), [
            TABLE('Decisions', ['t', 'fixed: window/count', 'fixed', 'sliding: prev×weight + curr', 'sliding'], rows, h),
            { type: 'bars', label: 'Sliding counter inputs', values: [r2(sl.prev * weight), sl.curr], texts: ['prev×w=' + r2(sl.prev * weight), 'curr=' + sl.curr], idxLabels: ['previous (weighted)', 'current'], hl: { 0: 'win', 1: sOk ? 'ok' : 'bad' } },
            VARS('State', { fixedWindow: '[' + start + ',' + (start + W) + ')', fixedCount: fx.count, slidePrev: sl.prev, slideCurr: sl.curr, weight: r2(weight) })]));
        }
        frames.push(F('Totals — fixed window allowed <b>' + fixedOk + '</b>, sliding counter allowed <b>' + slideOk + '</b>. The fixed window can admit up to 2×' + N + ' requests around a reset; the sliding counter smooths that out with just two integers per key.', [
          TABLE('Decisions', ['t', 'fixed: window/count', 'fixed', 'sliding: prev×weight + curr', 'sliding'], rows), VARS('Totals', { fixedAllowed: fixedOk, slidingAllowed: slideOk }, { fixedAllowed: fixedOk > slideOk ? 'bad' : '', slidingAllowed: 'ok' })]));
        return frames;
      }
    }],
    examples: [
      { title: 'Fixed window counter (brute force) and its boundary burst', html: `<p>Simplest possible limiter: a counter keyed by <code>clientId + ":" + (now / W)</code>. Thread-safe with <code>merge</code>, O(1), but a client can send N requests in the last second of a window and N more in the first second of the next — ${H.c('r', '2N in two seconds')}. Also old window keys pile up unless you clean them.</p>`, code: `class FixedWindowLimiter {
    private final ConcurrentHashMap<String, Integer> counts = new ConcurrentHashMap<>();
    private final int limit; private final long windowMillis;
    FixedWindowLimiter(int limit, long windowMillis) { this.limit = limit; this.windowMillis = windowMillis; }

    boolean allow(String client, long nowMillis) {
        String key = client + ":" + (nowMillis / windowMillis);
        int[] after = new int[1];
        counts.compute(key, (k, c) -> {                 // atomic per key: no lost increments
            int next = (c == null) ? 1 : c + 1;
            after[0] = next;
            return next;
        });
        return after[0] <= limit;     // note: still counts rejected hits (fine for fixed window)
    }
}` },
      { title: 'Why rejected requests must not be logged', html: `<p>Limit 3 per 10 s; a bot retries every second. If rejected attempts were appended to the log, the deque always contains ~10 recent entries, the count never drops below 3, and the client is ${H.c('r', 'locked out forever')} — even though it should be allowed again 10 s after its third accepted request. Only <b>accepted</b> requests consume capacity.</p>` },
      { title: 'Sliding counter worked by hand', html: `<p>Limit 100/min. Previous minute: 84 requests. We are 18 s into the current minute with 36 requests so far.</p>
${H.table(['piece', 'value'], [['weight of previous', '1 − 18/60 = 0.7'], ['previous contribution', '84 × 0.7 = 58.8'], ['current', '36'], ['estimate', H.c('b', '94.8')], ['new request fits? (94.8 + 1 ≤ 100)', H.c('g', 'yes → allow, curr = 37')]])}
<p>The approximation assumes the previous minute's 84 requests were evenly spread. Cloudflare reported this style of counter being wrong for a tiny fraction of requests in production while using two numbers per key instead of a list.</p>` },
      { title: 'Thread-safety bug: ConcurrentLinkedDeque does not save you', html: `<p>Someone replaces <code>ArrayDeque</code> with <code>ConcurrentLinkedDeque</code> and removes the lock. Each call is now thread-safe, but <code>if (log.size() &lt; limit) log.addLast(now)</code> is still check-then-act: 5 threads can all see size 2 &lt; 3 and all append → ${H.c('r', '7 requests in the window')}. Also <code>ConcurrentLinkedDeque.size()</code> is O(n). The per-key lock around the <i>whole</i> evict-check-append is what makes the limit hold.</p>` }
    ],
    deepDive: `<p><b>Complexity.</b> Log: amortized O(1) per request (each timestamp is appended once and evicted once), memory O(limit) per active key — a 1000/hour limit costs up to 1000 longs per user. Counter: O(1) time and memory. Fixed: O(1), but needs cleanup of old window keys (or store window id inside the value and reset in <code>compute</code>).</p>
<p><b>Lock choice.</b> <code>synchronized (deque)</code> uses the deque object as the per-key lock — fine because the deque never escapes the limiter. The lock must protect <i>all three steps</i>. If one key is extremely hot (a shared API key used by 500 threads), its lock becomes a convoy; the counter variant has a much shorter critical section, or shard the key ("key#threadId mod 4" with limit/4 each) for approximate fairness.</p>
<p><b>Eviction of idle keys.</b> A key whose newest timestamp is older than W has an empty effective window — removing it is invisible. Use <code>logs.computeIfPresent(key, (k, d) -&gt; d.isEmpty() ? null : d)</code> under the same lock discipline, or a cache library with expire-after-access.</p>
<p><b>Distributed versions.</b> Redis sorted set per key: <code>ZREMRANGEBYSCORE key 0 now-W</code>, <code>ZCARD</code>, <code>ZADD now</code>, <code>EXPIRE</code> — must run as one Lua script or <code>MULTI</code> (otherwise the same check-then-act race appears across servers). The counter variant maps to two <code>INCR</code> keys per window with TTLs.</p>
<p><b>Choosing in an interview:</b> burst-friendly API quotas → token bucket. "Exactly N per rolling window" for security (OTP, password tries) → sliding log. Massive scale, approximate OK → sliding counter. Simplest dashboard quota → fixed window. Always state the trade-off (accuracy vs memory vs burstiness) and the thread-safety story (per-key atomic update).</p>
<p><b>Time edge cases.</b> Use a monotonic clock; decide whether the window is (now−W, now] or [now−W, now) and be consistent (the code above evicts <code>ts ≤ now − W</code>). For multi-server deployments clock skew can shift windows — rely on the store's clock.</p>`,
    aiEra: `<p><b>What AI changes:</b> "write a sliding window rate limiter in Java" produces plausible code instantly. The differences that matter in production — logging rejected requests, unsynchronized <code>ArrayDeque</code>, a global <code>synchronized</code> on <code>allow</code>, integer division in the counter weight — are exactly what reviewers miss.</p>
<p><b>Prompts that help:</b> <code>Produce a timeline where this limiter admits more than the limit in some window</code>; <code>Convert this limiter to a Redis Lua script and explain why each step must be inside the script</code>; <code>Compare memory use of log vs counter for 10M keys at limit 1000/hour</code>.</p>
<p><b>Where AI goes wrong:</b> uses <code>(now - start) / W</code> with longs (always 0 → weight 1), forgets the "gap of 2+ windows means prev = 0" case, mixes seconds and millis, or chooses the log for a per-IP limiter at internet scale without noticing the memory cost.</p>
<p><b>What you own:</b> mapping the business rule to an algorithm, proving the bound ("at most N in any W") holds under concurrency, and the scaling/memory story.</p>`,
    problems: [{
      title: 'Exact Rolling-Window Limiter for OTP Sends', level: 'Medium', tags: ['rate limiter', 'sliding window log', 'per-key lock'], companies: ['PhonePe', 'Paytm', 'Twilio', 'Google'],
      statement: `<p>An OTP service must enforce: <b>at most 3 OTPs per phone number in any 10-minute rolling window</b>. Implement <code>boolean trySend(String phone)</code> and <code>long secondsUntilNext(String phone)</code>. Called from many threads; the limit must be <b>exact</b> (security rule) and different phone numbers must not block each other.</p>`,
      constraints: `<p>10<sup>5</sup> active numbers, bursts of concurrent retries from the same number (users mashing "resend"). No fixed-window resets. Rejected attempts must not extend the lockout.</p>`,
      example: `<p>Sends at 0:00, 0:01, 0:02 → ${H.c('g', 'Y Y Y')}. At 0:05 → ${H.c('r', 'N')}, secondsUntilNext = 300 (0:00 slides out at 0:10). At 0:10:01 → ${H.c('g', 'Y')}. A fixed 10-minute window would wrongly allow 3 more sends at 0:10:00 even if three were sent at 0:09:59.</p>`,
      brute: { why: `<p><b>Unsynchronized</b> <code>HashMap&lt;String, List&lt;Long&gt;&gt;</code>: the map and lists can corrupt, and concurrent resends all see "2 sent" and all send — a security bug. <b>Global lock</b>: correct, but every phone number in the country waits on one monitor. <b>Fixed window</b>: wrong spec (boundary burst sends 6 OTPs in 2 seconds).</p>`, code: `class OtpLimiterBrute {
    private final Map<String, List<Long>> sent = new HashMap<>();   // not thread-safe at all

    // BRUTE: no locking; removeIf + size + add are separate steps on a shared list
    boolean trySend(String phone, long nowSec) {
        List<Long> l = sent.computeIfAbsent(phone, p -> new ArrayList<>());
        l.removeIf(t -> t <= nowSec - 600);
        if (l.size() >= 3) return false;
        l.add(nowSec);
        return true;
    }
}` },
      mcq: { q: 'A user is rejected at 0:05 and keeps retrying every second until 0:12. When is the next send allowed with a correct sliding log?', options: ['Never — the retries keep the log full', 'At 0:10:00 exactly (0:00 is evicted when ts ≤ now − 600)', 'At 0:15', 'Only after a manual reset'], answer: 1, explain: 'Only accepted sends are logged, so the log is [0:00, 0:01, 0:02]. At 0:10:00, 0:00 ≤ 0:10:00 − 10 min, so it slides out and a slot opens.' },
      hints: [`<p>Hint 1: "Any rolling window" + "exact" = keep the timestamps of accepted sends, not a counter.</p>`, `<p>Hint 2: <code>ConcurrentHashMap&lt;String, ArrayDeque&lt;Long&gt;&gt;</code> with <code>computeIfAbsent</code>, then <code>synchronized (deque)</code> around evict + check + append.</p>`, `<p>Hint 3: secondsUntilNext = 0 if size &lt; 3, else (oldest + window − now). Don't log rejections. Inject the clock for tests.</p>`],
      solution: {
        approach: `<p>Sliding window log with a <b>per-phone lock</b>. The map lookup is lock-free; the critical section touches one small deque (at most 3 entries), so contention exists only between the same user's concurrent resend clicks — and that contention is exactly what must be serialized to keep the limit exact.</p>`,
        code: `class OtpLimiter {
    private static final int LIMIT = 3;
    private final long windowSec;
    private final LongSupplier clockSec;
    private final ConcurrentHashMap<String, ArrayDeque<Long>> sent = new ConcurrentHashMap<>();

    OtpLimiter(long windowSec, LongSupplier clockSec) { this.windowSec = windowSec; this.clockSec = clockSec; }

    boolean trySend(String phone) {
        ArrayDeque<Long> log = sent.computeIfAbsent(phone, p -> new ArrayDeque<>());
        synchronized (log) {
            long now = clockSec.getAsLong();
            evict(log, now);
            if (log.size() >= LIMIT) return false;   // rejected: NOT recorded
            log.addLast(now);
            return true;
        }
    }

    long secondsUntilNext(String phone) {
        ArrayDeque<Long> log = sent.get(phone);
        if (log == null) return 0;
        synchronized (log) {
            long now = clockSec.getAsLong();
            evict(log, now);
            return log.size() < LIMIT ? 0 : log.peekFirst() + windowSec - now;
        }
    }

    private void evict(ArrayDeque<Long> log, long now) {
        while (!log.isEmpty() && log.peekFirst() <= now - windowSec) log.pollFirst();
    }

    public static void main(String[] args) throws InterruptedException {
        AtomicLong now = new AtomicLong(0);
        OtpLimiter lim = new OtpLimiter(600, now::get);
        StringBuilder sb = new StringBuilder();
        for (long t : new long[]{0, 60, 120, 300}) { now.set(t); sb.append(lim.trySend("98xx") ? "Y" : "N"); }
        System.out.println(sb + " wait=" + lim.secondsUntilNext("98xx") + "s");   // YYYN wait=300s
        now.set(600);
        System.out.println("at 10:00 -> " + lim.trySend("98xx"));                // true

        // 40 concurrent resend clicks from a fresh number at the same instant: exactly 3 pass
        AtomicInteger ok = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(16);
        for (int i = 0; i < 40; i++) pool.execute(() -> { if (lim.trySend("97yy")) ok.incrementAndGet(); });
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("concurrent sends allowed: " + ok.get());              // 3
    }
}`,
        dry: { head: ['now (s)', 'log before', 'evicted', 'decision', 'log after'], rows: [['0', '[]', '-', 'Y', '[0]'], ['60, 120', '[0] → [0,60]', '-', 'Y, Y', '[0,60,120]'], ['300', '[0,60,120]', '-', H.c('r', 'N (wait 300)'), '[0,60,120]'], ['600', '[0,60,120]', '0', H.c('g', 'Y'), '[60,120,600]']] },
        complexity: `<p>Amortized O(1) per call, O(3) memory per active phone. Lock scope: one phone number.</p>`,
        followUps: ['Also limit 10 OTPs per day per number (two logs or a second counter, both under the same lock).', 'Run it on 30 servers (Redis ZSET + Lua).', 'Clean up numbers that have not sent in 10 minutes.']
      }
    }]
  });

  /* ======================= TOPIC 5: PRODUCER-CONSUMER ======================= */
  topics.push({
    title: 'Producer-Consumer: Bounded Buffers, Blocking Queues & Clean Shutdown',
    analogy: `<p>A busy restaurant has a <b>pass counter</b> between the kitchen and the dining room with room for <b>3 plates</b>. Cooks (<b>producers</b>) put finished plates on it; waiters (<b>consumers</b>) pick them up. If the counter is <b>full</b>, a cook must wait — no stacking plates on the floor. If it is <b>empty</b>, a waiter waits instead of running back and forth asking "anything yet?" every second. When a plate lands, a <b>bell</b> rings so a waiting waiter wakes up; when a plate is picked up, the cooks hear there is space again.</p>
<p>At closing time the head chef puts a special <b>"KITCHEN CLOSED" card</b> on the counter. A waiter who picks it up goes home. That card is the <b>poison pill</b>.</p>`,
    explain: `<p><b>Producer-consumer</b> = some threads create work, others process it, and a <b>queue in the middle</b> decouples them. It is the backbone of logging frameworks, thread pools (<code>ThreadPoolExecutor</code> is literally workers taking from a <code>BlockingQueue</code>), order pipelines, web crawlers, and Kafka consumers.</p>
<p><b>Why a bounded queue?</b> If producers are faster than consumers, an unbounded queue grows until the JVM dies with <code>OutOfMemoryError</code>. A bound gives <b>backpressure</b>: when full, producers slow down (block, time out, or get rejected) instead of drowning the system.</p>
<p><b>The <code>BlockingQueue</code> API — four behaviours when the queue can't proceed:</b></p>
${H.table(['', 'Throws', 'Special value', 'Blocks', 'Times out'], [['Insert', '<code>add(e)</code>', '<code>offer(e)</code> → false', '<code>put(e)</code>', '<code>offer(e, t, unit)</code>'], ['Remove', '<code>remove()</code>', '<code>poll()</code> → null', '<code>take()</code>', '<code>poll(t, unit)</code>']])}
<p><b>Which queue?</b></p>
${H.table(['Queue', 'Bound', 'Locking', 'Use it for'], [
  ['<code>ArrayBlockingQueue</code>', 'fixed, required', 'one lock, two conditions', 'classic bounded buffer, predictable memory'],
  ['<code>LinkedBlockingQueue</code>', 'optional (default <b>Integer.MAX_VALUE</b>!)', 'two locks (put / take)', 'higher throughput; always pass a capacity'],
  ['<code>SynchronousQueue</code>', 'zero', 'direct hand-off', 'producer waits until a consumer takes (cached thread pools)'],
  ['<code>PriorityBlockingQueue</code>', 'unbounded', 'one lock', 'most urgent job first'],
  ['<code>DelayQueue</code>', 'unbounded', 'one lock', 'items become available after a delay (schedulers, retries)']
])}
<p><b>Building one by hand</b> (a favourite interview ask): a lock, two <b>condition variables</b> (<code>notFull</code>, <code>notEmpty</code>), and the golden rule — <b>always wait in a <code>while</code> loop</b>, never an <code>if</code>. A woken thread must re-check the condition because (a) another thread may have grabbed the slot first, and (b) <b>spurious wakeups</b> are allowed by the JVM spec.</p>
<p><b>Brute force designs and why they fail:</b> (1) a plain <code>LinkedList</code> with a <code>while (list.isEmpty()) {}</code> spin — burns a full CPU core per idle consumer and races on the list; (2) <code>Thread.sleep(100)</code> polling — wastes CPU and adds up to 100 ms latency; (3) <code>wait/notify</code> with <code>if</code> and single <code>notify()</code> — lost or wrong wakeups cause hangs; (4) an unbounded queue — no backpressure, OOM under load.</p>
<p><b>Clean shutdown</b> is part of the design: <b>poison pill</b> (one sentinel per consumer, placed after all real items), <b>interrupt</b> (<code>take()</code> throws <code>InterruptedException</code>; restore the flag and exit), or let an <code>ExecutorService</code> own the workers and call <code>shutdown()</code> + <code>awaitTermination</code>.</p>`,
    clues: [
      '"Decouple a fast producer from a slow consumer" / "buffer between stages" → BlockingQueue.',
      '"Design a <b>bounded blocking queue</b>" (LeetCode 1188) → lock + notFull/notEmpty conditions + while loops.',
      '"Logger / email sender must not slow down the request thread" → async producer-consumer with a bounded queue and a drop/block policy.',
      '"Memory blows up when downstream is slow" → missing bound / backpressure.',
      '"Workers hang at shutdown" → missing poison pill per consumer or swallowed interrupt.',
      '"Process jobs by priority" / "retry after delay" → <code>PriorityBlockingQueue</code> / <code>DelayQueue</code>.'
    ],
    code: [{ lang: 'java', title: 'Two producers, three consumers, poison pills (terminates cleanly)', code: `class OrderPipeline {
    record Order(int id, String item) {}
    static final Order POISON = new Order(-1, "STOP");        // sentinel, compared by identity

    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<Order> queue = new ArrayBlockingQueue<>(5); // bounded => backpressure
        int producers = 2, consumers = 3, perProducer = 6;
        AtomicInteger processed = new AtomicInteger();
        CountDownLatch producersDone = new CountDownLatch(producers);

        List<Thread> threads = new ArrayList<>();
        for (int p = 0; p < producers; p++) {
            int base = p * 100;
            threads.add(new Thread(() -> {
                try {
                    for (int i = 1; i <= perProducer; i++) queue.put(new Order(base + i, "item" + i)); // blocks when full
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    producersDone.countDown();
                }
            }, "producer-" + p));
        }
        for (int c = 0; c < consumers; c++) {
            threads.add(new Thread(() -> {
                try {
                    while (true) {
                        Order o = queue.take();                     // blocks when empty
                        if (o == POISON) return;                     // closing time
                        processed.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();              // restore flag, then exit
                }
            }, "consumer-" + c));
        }
        threads.forEach(Thread::start);

        producersDone.await();                                       // all real orders are queued
        for (int c = 0; c < consumers; c++) queue.put(POISON);       // ONE pill per consumer
        for (Thread t : threads) t.join(5000);                       // bounded wait

        System.out.println("processed " + processed.get() + " of " + producers * perProducer); // 12 of 12
    }
}` }, { lang: 'java', title: 'Bounded buffer from scratch: ReentrantLock + two Conditions', code: `class BoundedBuffer<T> {
    private final Object[] items;
    private int head, tail, count;                 // all guarded by lock
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();

    BoundedBuffer(int capacity) { items = new Object[capacity]; }

    void put(T x) throws InterruptedException {
        lock.lock();
        try {
            while (count == items.length) notFull.await();   // WHILE, not if: re-check after waking
            items[tail] = x;
            tail = (tail + 1) % items.length;
            count++;
            notEmpty.signal();                              // wake ONE waiting consumer
        } finally {
            lock.unlock();                                  // always unlock in finally
        }
    }

    @SuppressWarnings("unchecked")
    T take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) notEmpty.await();
            T x = (T) items[head];
            items[head] = null;                             // let GC reclaim it
            head = (head + 1) % items.length;
            count--;
            notFull.signal();                               // wake ONE waiting producer
            return x;
        } finally {
            lock.unlock();
        }
    }

    public static void main(String[] args) throws InterruptedException {
        BoundedBuffer<Integer> buf = new BoundedBuffer<>(2);
        Thread consumer = new Thread(() -> {
            try { for (int i = 0; i < 5; i++) System.out.println("took " + buf.take()); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        consumer.start();
        for (int i = 1; i <= 5; i++) buf.put(i);   // blocks whenever 2 items are waiting
        consumer.join(5000);
    }
}` }],
    codeTitle: ['BlockingQueue pipeline', 'Hand-made bounded buffer'],
    viz: {
      title: 'Bounded queue: producers block when full, consumers block when empty',
      input: '3 ; P P P P C P C C C C C P',
      inputLabel: 'capacity ; sequence of P (a producer arrives) and C (a consumer arrives)',
      gen: function (input) {
        var hint = 'Format: "capacity ; P/C sequence", e.g. "3 ; P P P P C C C C C P". Capacity 1-6, up to 20 actions.';
        var sp = String(input === undefined ? '' : input).split(';');
        if (sp.length !== 2) throw new Error(hint);
        var cap = Number(String(sp[0]).trim());
        if (!(cap >= 1 && cap <= 6) || cap % 1) throw new Error(hint);
        var acts = String(sp[1]).toUpperCase().replace(/[^PC]/g, '').split('').filter(function (s) { return s; });
        if (!acts.length || acts.length > 20) throw new Error(hint);
        var q = [], wp = [], wc = [], frames = [], log = [], made = 0, eaten = [], pN = 0, cN = 0;
        var src = 'put(x):  lock; while (full)  notFull.await();  enqueue(x); notEmpty.signal(); unlock\ntake():  lock; while (empty) notEmpty.await(); x = dequeue(); notFull.signal();  unlock';
        function snap(narr, qhl, codeHl, vh) {
          frames.push(F(narr, [
            { type: 'queue', label: 'ArrayBlockingQueue (capacity ' + cap + ')', items: q.slice(), hl: qhl || {}, frontLabel: 'take() here', backLabel: 'put() here' },
            VARS('Monitor state', { size: q.length + '/' + cap, waitingProducers: wp.length ? wp.map(function (w) { return w.who + '(' + w.item + ')'; }).join(', ') : 'none', waitingConsumers: wc.length ? wc.join(', ') : 'none', consumed: eaten.length ? eaten.join(', ') : '-' }, vh || {}),
            CODE('Inside the queue', src, codeHl || {})
          ]));
        }
        snap('An empty queue with room for <b>' + cap + '</b>. Producers call <code>put()</code>, consumers call <code>take()</code>. Both go through one lock with two condition queues: <b>notFull</b> (where producers sleep) and <b>notEmpty</b> (where consumers sleep).', {}, {});
        acts.forEach(function (a) {
          if (a === 'P') {
            var who = 'P' + (++pN), item = 'o' + (++made);
            if (q.length < cap) {
              q.push(item);
              var h = {}; h[q.length - 1] = 'ok';
              snap(who + ' calls <code>put(' + item + ')</code>. There is space (' + (q.length - 1) + '/' + cap + '), so it enqueues at the back and calls <code>notEmpty.signal()</code>.', h, { 1: 'ok' }, { size: 'ok' });
              if (wc.length) {
                var c = wc.shift(), got = q.shift(); eaten.push(got);
                snap('The signal wakes sleeping consumer <b>' + c + '</b>. It re-checks <code>while (empty)</code> — not empty now — and takes <b>' + got + '</b> from the front. No CPU was burned while it waited.', {}, { 2: 'ok' }, { waitingConsumers: 'ok' });
              }
            } else {
              wp.push({ who: who, item: item });
              snap('<span class="c-y">' + who + ' calls put(' + item + ') but the queue is FULL.</span> It releases the lock and sleeps on <b>notFull</b>. This is <b>backpressure</b>: the producer is slowed down instead of growing memory without limit.', { 0: 'win' }, { 1: 'bad' }, { waitingProducers: 'bad' });
            }
          } else {
            var cw = 'C' + (++cN);
            if (q.length) {
              var x = q.shift(); eaten.push(x);
              snap(cw + ' calls <code>take()</code> and gets <b>' + x + '</b> from the front, then calls <code>notFull.signal()</code>.', {}, { 2: 'ok' }, { consumed: 'ok' });
              if (wp.length) {
                var w = wp.shift(); q.push(w.item);
                var h2 = {}; h2[q.length - 1] = 'ok';
                snap('That signal wakes sleeping producer <b>' + w.who + '</b>. It re-checks <code>while (full)</code> — there is a free slot — and finally enqueues <b>' + w.item + '</b>.', h2, { 1: 'ok' }, { waitingProducers: 'ok' });
              }
            } else {
              wc.push(cw);
              snap('<span class="c-y">' + cw + ' calls take() but the queue is EMPTY.</span> It sleeps on <b>notEmpty</b> (no busy-waiting, 0% CPU) until a producer signals.', {}, { 2: 'bad' }, { waitingConsumers: 'bad' });
            }
          }
        });
        snap('End of the sequence. Queue holds ' + q.length + ' item(s); ' + wp.length + ' producer(s) and ' + wc.length + ' consumer(s) still asleep. In a real app, shutdown would send one <b>poison pill</b> per consumer (or interrupt them) so nobody sleeps forever. Order of consumption: ' + (eaten.length ? eaten.join(' → ') : 'nothing') + ' — FIFO, nothing lost, nothing duplicated.', {}, {}, {});
        return frames;
      }
    },
    examples: [
      { title: 'The classic wait/notify version (and its two traps)', html: `<p>Before <code>java.util.concurrent</code>, you used the object's monitor. Trap 1: <code>if (count == 0) wait();</code> — after waking, another consumer may already have taken the item → ${H.c('r', 'take from empty buffer')}. Use <code>while</code>. Trap 2: with a single monitor, producers and consumers wait on the <b>same</b> wait set. <code>notify()</code> might wake another producer instead of a consumer; if that producer goes back to sleep, nobody wakes the consumer → ${H.c('r', 'everyone asleep (lost wakeup)')}. Use <code>notifyAll()</code> (or two Conditions, as above).</p>`, code: `class MonitorBuffer {
    private final int[] buf = new int[4];
    private int head, tail, count;

    synchronized void put(int x) throws InterruptedException {
        while (count == buf.length) wait();      // releases the monitor while waiting
        buf[tail] = x; tail = (tail + 1) % buf.length; count++;
        notifyAll();                             // wake everyone; each re-checks its while loop
    }
    synchronized int take() throws InterruptedException {
        while (count == 0) wait();
        int x = buf[head]; head = (head + 1) % buf.length; count--;
        notifyAll();
        return x;
    }
}` },
      { title: 'Async logger: never block the request thread', html: `<p>Request threads call <code>log(msg)</code>; one background thread writes to disk. If the disk is slow and the queue is full, what should <code>log</code> do? Options: block (<code>put</code>) — safe but slows requests; drop and count (<code>offer</code> returns false) — keeps latency low; drop oldest. Log4j2's async appender and Logback's <code>AsyncAppender</code> expose exactly this choice. Here we drop DEBUG when full and block for ERROR.</p>`, code: `class AsyncLogger implements AutoCloseable {
    private final BlockingQueue<String> q = new ArrayBlockingQueue<>(1024);
    private final LongAdder dropped = new LongAdder();
    private final Thread writer = new Thread(this::drain, "log-writer");
    private volatile boolean closed;

    private AsyncLogger() { writer.setDaemon(true); }
    // start the thread AFTER construction so "this" never escapes half-built
    static AsyncLogger start() { AsyncLogger l = new AsyncLogger(); l.writer.start(); return l; }

    void debug(String m) { if (!q.offer(m)) dropped.increment(); }        // never blocks
    void error(String m) throws InterruptedException { q.put("ERROR " + m); } // must not be lost

    private void drain() {
        try {
            while (!closed || !q.isEmpty()) {
                String m = q.poll(100, TimeUnit.MILLISECONDS);           // wake up to notice close
                if (m != null) System.out.println(m);
            }
        } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    public void close() throws InterruptedException { closed = true; writer.join(2000); }
}` },
      { title: 'SynchronousQueue: zero-capacity hand-off', html: `<p>A <code>SynchronousQueue</code> has no slots. <code>put</code> blocks until a consumer calls <code>take</code> — like handing a baton directly. <code>Executors.newCachedThreadPool()</code> uses one: a task is handed to an idle thread, or a new thread is created. Great for latency, dangerous for bursty load (unbounded thread creation).</p>`, code: `class HandOff {
    public static void main(String[] args) throws InterruptedException {
        SynchronousQueue<String> baton = new SynchronousQueue<>();
        Thread runner = new Thread(() -> {
            try { System.out.println("got " + baton.take()); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        runner.start();
        baton.put("baton");          // returns only once the runner has taken it
        runner.join(2000);
    }
}` },
      { title: 'Executor = producer-consumer you do not have to write', html: `<p><code>new ThreadPoolExecutor(4, 4, 0, SECONDS, new ArrayBlockingQueue&lt;&gt;(100), new ThreadPoolExecutor.CallerRunsPolicy())</code>: submitters are producers, the 4 workers are consumers, the queue is bounded, and <b>CallerRunsPolicy</b> is backpressure (when full, the submitting thread runs the task itself, which slows the producer). Avoid <code>Executors.newFixedThreadPool</code> for untrusted load — its <code>LinkedBlockingQueue</code> is unbounded.</p>` }
    ],
    deepDive: `<p><b>Inside <code>ArrayBlockingQueue</code>:</b> a circular array, one <code>ReentrantLock</code>, conditions <code>notEmpty</code> and <code>notFull</code> — exactly our hand-made buffer. <b><code>LinkedBlockingQueue</code></b> uses <b>two locks</b> (<code>putLock</code>, <code>takeLock</code>) plus an <code>AtomicInteger count</code>, so a producer and a consumer can work at the same time on opposite ends ("two-lock queue", Michael &amp; Scott); it signals across locks only on empty↔non-empty and full↔not-full transitions.</p>
<p><b>Why signal() is enough with two conditions.</b> Each condition has only one kind of waiter, so waking one is always useful. With a single monitor (<code>wait/notify</code>) both kinds share one wait set, which is why <code>notifyAll</code> is required there. <code>signal</code> must be called while holding the lock; the woken thread must re-acquire the lock before returning from <code>await</code>, which is another reason the condition can be false again.</p>
<p><b>Interruption contract.</b> <code>put/take/await</code> throw <code>InterruptedException</code> and clear the flag. Either propagate it or call <code>Thread.currentThread().interrupt()</code> to restore it — never swallow it, or <code>shutdownNow()</code> cannot stop your workers.</p>
<p><b>Poison pill details.</b> Need one pill <i>per consumer</i>, and pills must go in <i>after</i> all producers finish (use a <code>CountDownLatch</code> or join the producers). With multiple producers, a <code>Phaser</code> or counter tells you when the last one is done. In a priority queue, the pill must sort last.</p>
<p><b>Batching.</b> <code>drainTo(list, max)</code> takes many items in one lock acquisition — much higher throughput for loggers and DB writers (batch insert). The <b>LMAX Disruptor</b> pushes this further with a pre-allocated ring buffer and sequence counters (no locks, mechanical-sympathy).</p>
<p><b>Sizing.</b> Little's law: items in queue ≈ arrival rate × wait time. A bound should hold a few seconds of burst, not minutes — a huge queue just hides overload and adds latency (bufferbloat). Monitor queue depth and rejection counts.</p>
<p><b>Virtual threads.</b> With Java 21, blocking <code>take()</code> on a virtual thread is cheap (it unmounts), so "one virtual thread per consumer" scales to thousands. The bound and backpressure policy still matter: virtual threads remove thread cost, not memory or downstream limits.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking for "a producer-consumer in Java" yields a <code>BlockingQueue</code> example almost every time — good. The weak spots are the <i>edges</i>: shutdown, interruption, unbounded defaults and what happens when consumers die.</p>
<p><b>Prompts that help:</b> <code>How does every thread in this program terminate? List each exit path</code>; <code>What happens if a consumer throws a RuntimeException mid-loop?</code>; <code>Replace polling with blocking and add a capacity and a rejection policy</code>.</p>
<p><b>Where AI goes wrong:</b> <code>if</code> instead of <code>while</code> around <code>wait()</code>; <code>notify</code> on a shared monitor; one poison pill for N consumers; <code>catch (InterruptedException e) {}</code>; <code>Executors.newFixedThreadPool</code> with an unbounded queue in front of a slow API; demos that never exit because non-daemon workers block forever on <code>take()</code>.</p>
<p><b>What you own:</b> choosing the queue type and bound, the overload policy (block, drop, caller-runs), and a shutdown story you can prove terminates.</p>`,
    problems: [{
      title: 'Design a Bounded Blocking Queue', level: 'Medium', tags: ['producer-consumer', 'Condition', 'ReentrantLock'], companies: ['Microsoft', 'Amazon', 'Bloomberg', 'LinkedIn'],
      statement: `<p>Implement <code>BoundedBlockingQueue(int capacity)</code> with <code>void enqueue(int x)</code> (blocks while full), <code>int dequeue()</code> (blocks while empty) and <code>int size()</code>. Multiple producer and consumer threads call it concurrently. Do not use any class from <code>java.util.concurrent</code> collections — only locks/conditions or the object monitor.</p>`,
      constraints: `<p>1 ≤ capacity ≤ 30; up to 8 producers and 8 consumers; every enqueued element is dequeued exactly once, in FIFO order; no busy waiting.</p>`,
      example: `<p>capacity 2. Producer: enqueue 1, 2, 3. Consumer: dequeue ×3. The producer ${H.c('y', 'blocks on 3')} until the consumer takes 1. Output order ${H.c('g', '1, 2, 3')}; final size 0.</p>`,
      brute: { why: `<p><b>Spin-wait</b> on an unsynchronized <code>LinkedList</code>: <code>while (list.size() == cap) {}</code> burns a CPU core per waiting thread, and without a lock two producers can both see "one slot left" and both add (overflow), or the JIT can hoist <code>size()</code> and spin forever. <b>Global synchronized + <code>if (full) wait()</code> + <code>notify()</code></b>: a woken producer does not re-check, and <code>notify</code> may wake the wrong kind of thread → over-capacity or deadlock-like hangs.</p>`, code: `class SpinQueue {
    private final LinkedList<Integer> list = new LinkedList<>();
    private final int cap;
    SpinQueue(int cap) { this.cap = cap; }

    // BRUTE: busy-wait + no lock => burns CPU and races (two producers fill the last slot)
    void enqueue(int x) { while (list.size() >= cap) { Thread.onSpinWait(); } list.addLast(x); }
    int dequeue()       { while (list.isEmpty())     { Thread.onSpinWait(); } return list.removeFirst(); }
}` },
      mcq: { q: 'Why must <code>await()</code> be inside <code>while (count == capacity)</code> rather than <code>if</code>?', options: ['Because await() might return early (spurious wakeup) or another producer may fill the slot before we reacquire the lock', 'Because if is slower than while', 'Because await() never returns otherwise', 'It is only a style preference'], answer: 0, explain: 'Waking up only means "the condition might be true now". Between the signal and re-acquiring the lock, another thread can change the state, and the spec allows spurious wakeups. Re-check every time.' },
      hints: [`<p>Hint 1: You need two "waiting rooms": producers wait for "not full", consumers wait for "not empty". One lock protects the array and counters.</p>`, `<p>Hint 2: <code>ReentrantLock</code> + <code>newCondition()</code> ×2, a circular array with head/tail/count. Unlock in <code>finally</code>.</p>`, `<p>Hint 3: Recipe — enqueue: lock; while full await notFull; write at tail; count++; signal notEmpty; unlock. Dequeue mirrors it. size() also takes the lock (visibility).</p>`],
      solution: {
        approach: `<p>Classic monitor with <b>two condition variables</b>. All state (array, head, tail, count) is guarded by one <code>ReentrantLock</code>. Waiting happens in <code>while</code> loops that release the lock (no CPU burn). Each successful operation signals the <i>opposite</i> condition, waking exactly one useful waiter. FIFO comes from the circular array.</p>`,
        code: `class BoundedBlockingQueue {
    private final int[] a;
    private int head, tail, count;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();

    BoundedBlockingQueue(int capacity) { a = new int[capacity]; }

    void enqueue(int x) throws InterruptedException {
        lock.lock();
        try {
            while (count == a.length) notFull.await();
            a[tail] = x; tail = (tail + 1) % a.length; count++;
            notEmpty.signal();
        } finally { lock.unlock(); }
    }

    int dequeue() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) notEmpty.await();
            int x = a[head]; head = (head + 1) % a.length; count--;
            notFull.signal();
            return x;
        } finally { lock.unlock(); }
    }

    int size() { lock.lock(); try { return count; } finally { lock.unlock(); } }

    public static void main(String[] args) throws InterruptedException {
        BoundedBlockingQueue q = new BoundedBlockingQueue(2);
        int n = 1000;
        long[] sum = new long[1];
        Thread prod = new Thread(() -> {
            try { for (int i = 1; i <= n; i++) q.enqueue(i); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        Thread cons = new Thread(() -> {
            try { for (int i = 1; i <= n; i++) sum[0] += q.dequeue(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        prod.start(); cons.start();
        prod.join(5000); cons.join(5000);
        System.out.println("sum=" + sum[0] + " expected=" + (long) n * (n + 1) / 2 + " size=" + q.size());
    }
}`,
        dry: { head: ['step', 'thread', 'action', 'buffer', 'waiting'], rows: [['1', 'P', 'enqueue 1', '[1]', '-'], ['2', 'P', 'enqueue 2', '[1,2]', '-'], ['3', 'P', 'enqueue 3 → full → await notFull', '[1,2]', 'P on notFull'], ['4', 'C', 'dequeue → 1, signal notFull', '[2]', '-'], ['5', 'P', 'wakes, re-checks, enqueue 3', '[2,3]', '-']] },
        complexity: `<p>O(1) per operation; O(capacity) memory. Threads waiting use no CPU.</p>`,
        followUps: ['Add <code>offer(x, timeout)</code> using <code>notFull.awaitNanos</code>.', 'Use two locks like LinkedBlockingQueue for higher throughput.', 'Add a <code>close()</code> that wakes all waiters and makes further calls throw.']
      }
    }]
  });

  /* ======================= TOPIC 6: THREAD-SAFE LRU / LFU CACHE ======================= */
  topics.push({
    title: 'Thread-Safe LRU & LFU Caches',
    analogy: `<p>Your desk has a small shelf that holds only <b>3 books</b>. Whenever you read a book you put it at the <b>front</b>. When the shelf is full and you need a new book, the one at the <b>back</b> — the one you have not touched for the longest time — goes back to the library. That is <b>LRU</b> (Least Recently Used).</p>
<p>Now imagine <b>five colleagues share that shelf</b>. If two of them rearrange it at the same moment — one pulling a book to the front while the other is removing the last one — books fall on the floor and the shelf's order makes no sense. So there is a rule: <b>only the person holding the shelf key may touch it</b>. And note: even <i>reading</i> a book means <i>moving</i> it to the front, so readers need the key too.</p>
<p><b>LFU</b> (Least Frequently Used) is a shelf where each book has a <b>tally of how often it was read</b>; the least-read book leaves first (oldest wins a tie).</p>`,
    explain: `<p><b>Single-threaded LRU recap:</b> a <code>HashMap&lt;K, Node&gt;</code> for O(1) lookup + a <b>doubly linked list</b> in recency order (head = most recent, tail = least recent). <code>get</code> = find node, move it to head. <code>put</code> = update-and-move, or insert at head and, if over capacity, unlink the tail and remove it from the map. Both O(1).</p>
<p><b>The concurrency trap:</b> in LRU, <span class="c-r"><code>get</code> is a write</span>. It rewrites four pointers to move the node. So:</p>
<ul><li>Using <code>ReadWriteLock</code> and letting <code>get</code> take the <i>read</i> lock is <b>wrong</b> — two "readers" relink the list at the same time and corrupt it.</li>
<li><code>LinkedHashMap(cap, 0.75f, true)</code> (access order) is also mutated by <code>get</code> — the Javadoc calls this a structural modification.</li></ul>
<p><b>Designs from naive to production:</b></p>
${H.table(['Design', 'Correct?', 'Throughput', 'Notes'], [
  ['Unsynchronized LinkedHashMap / HashMap+DLL', H.c('r', 'no'), 'high until it breaks', 'broken links, NPEs, size over capacity, infinite loops'],
  ['One lock around every op (<code>synchronized</code> or <code>ReentrantLock</code>)', H.c('g', 'yes'), 'one thread at a time', 'the honest interview answer; keep the critical section tiny (no I/O inside!)'],
  ['ReadWriteLock with get under read lock', H.c('r', 'no'), '—', 'get mutates the list'],
  ['Striped / segmented LRU (N small LRUs by key hash)', H.c('g', 'yes'), '≈ N× better', 'eviction is per segment → approximate global LRU'],
  ['ConcurrentHashMap + buffered recency updates (Caffeine)', H.c('g', 'yes'), 'near CHM speed', 'reads recorded in lossy ring buffers and replayed in batches under a lock; W-TinyLFU policy']
])}
<p><b>LFU in O(1):</b> <code>key → (value, freq)</code>, <code>freq → LinkedHashSet of keys</code> (insertion order breaks ties = least recently used among equals), and <code>minFreq</code>. <code>get</code> bumps a key from bucket f to f+1 (and bumps <code>minFreq</code> if bucket f emptied and f was the min). <code>put</code> on a full cache evicts the first key in bucket <code>minFreq</code>, inserts the new key with freq 1, and sets <code>minFreq = 1</code>. Three structures must change together → one lock guards all three (an invariant across fields!).</p>
<p><b>Don't hold the lock while loading.</b> On a miss you fetch from the DB (10 ms). If that happens inside the cache lock, every other thread — including hits for unrelated keys — waits 10 ms. Load outside the lock, and use a per-key in-flight <code>CompletableFuture</code> so 100 concurrent misses for the same key cause <b>one</b> DB call (no <b>cache stampede</b>).</p>`,
    clues: [
      '"Design an LRU cache that works with <b>multiple threads</b>" → HashMap + DLL behind one lock; then discuss striping / Caffeine.',
      '"Can we use a ReadWriteLock since reads dominate?" → trap: LRU <code>get</code> mutates order.',
      '"Evict the least <b>frequently</b> used, ties by recency" → LFU with freq buckets + minFreq, all under one lock.',
      '"Hot key expires and the DB gets hammered" → stampede; single-flight loading with per-key futures.',
      '"Very high read QPS, approximate LRU is fine" → segmented LRU or Caffeine-style buffered access recording.',
      '"Cache must never exceed N entries" → eviction inside the same critical section as insertion.'
    ],
    code: [{ lang: 'java', title: 'Thread-safe LRU: HashMap + doubly linked list + one ReentrantLock', code: `class ConcurrentLRUCache<K, V> {
    private final class Node {
        final K key; V val; Node prev, next;
        Node(K k, V v) { key = k; val = v; }
    }
    private final int capacity;
    private final Map<K, Node> map = new HashMap<>();            // guarded by lock
    private final Node head = new Node(null, null);             // sentinel: head.next = MRU
    private final Node tail = new Node(null, null);             // sentinel: tail.prev = LRU
    private final ReentrantLock lock = new ReentrantLock();

    ConcurrentLRUCache(int capacity) {
        if (capacity <= 0) throw new IllegalArgumentException("capacity");
        this.capacity = capacity;
        head.next = tail; tail.prev = head;
    }

    V get(K key) {
        lock.lock();                       // EXCLUSIVE even for reads: get() relinks the list
        try {
            Node n = map.get(key);
            if (n == null) return null;
            unlink(n); addFront(n);
            return n.val;
        } finally { lock.unlock(); }
    }

    void put(K key, V val) {
        lock.lock();
        try {
            Node n = map.get(key);
            if (n != null) { n.val = val; unlink(n); addFront(n); return; }
            if (map.size() == capacity) {                   // evict in the SAME critical section
                Node lru = tail.prev;
                unlink(lru);
                map.remove(lru.key);
            }
            n = new Node(key, val);
            map.put(key, n);
            addFront(n);
        } finally { lock.unlock(); }
    }

    int size() { lock.lock(); try { return map.size(); } finally { lock.unlock(); } }

    // invariant check: the list and the map describe the same set of keys
    boolean consistent() {
        lock.lock();
        try {
            int count = 0;
            for (Node n = head.next; n != tail; n = n.next) { if (map.get(n.key) != n) return false; count++; }
            return count == map.size() && count <= capacity;
        } finally { lock.unlock(); }
    }

    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addFront(Node n) { n.next = head.next; n.prev = head; head.next.prev = n; head.next = n; }

    public static void main(String[] args) throws InterruptedException {
        ConcurrentLRUCache<Integer, Integer> cache = new ConcurrentLRUCache<>(10);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int t = 0; t < 8; t++) {
            pool.execute(() -> {
                ThreadLocalRandom r = ThreadLocalRandom.current();
                for (int i = 0; i < 20_000; i++) {
                    int k = r.nextInt(100);
                    if (r.nextBoolean()) cache.put(k, k * k); else cache.get(k);
                }
            });
        }
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);
        System.out.println("size=" + cache.size() + " consistent=" + cache.consistent()); // size=10 consistent=true
    }
}` }, { lang: 'java', title: 'Shortcuts: synchronized LinkedHashMap, and a striped LRU for more throughput', code: `class SimpleLRU<K, V> {
    private final Map<K, V> map;

    SimpleLRU(int capacity) {
        // accessOrder = true => get() moves the entry to the end (so get MUTATES the map)
        LinkedHashMap<K, V> lhm = new LinkedHashMap<>(16, 0.75f, true) {
            @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) { return size() > capacity; }
        };
        this.map = Collections.synchronizedMap(lhm);   // every call, including get, takes the lock
    }
    V get(K k) { return map.get(k); }
    void put(K k, V v) { map.put(k, v); }
}

// N independent LRUs; a key always maps to the same stripe. Threads on different stripes never wait.
// Trade-off: eviction is LRU *within a stripe*, so globally it is approximate.
class StripedLRU<K, V> {
    private final List<SimpleLRU<K, V>> stripes = new ArrayList<>();

    StripedLRU(int stripeCount, int capacityPerStripe) {
        for (int i = 0; i < stripeCount; i++) stripes.add(new SimpleLRU<>(capacityPerStripe));
    }
    private SimpleLRU<K, V> stripe(K key) {
        int h = key.hashCode();
        h ^= (h >>> 16);                                  // spread high bits like HashMap does
        return stripes.get(Math.floorMod(h, stripes.size()));
    }
    V get(K k) { return stripe(k).get(k); }
    void put(K k, V v) { stripe(k).put(k, v); }

    public static void main(String[] args) {
        StripedLRU<String, Integer> c = new StripedLRU<>(4, 2);
        for (String s : List.of("a", "b", "c", "d", "e", "f")) c.put(s, s.length());
        System.out.println(c.get("a") + " " + c.get("f"));   // values (or null if evicted from its stripe)
    }
}` }],
    codeTitle: ['ConcurrentLRUCache', 'LinkedHashMap + striping'],
    viz: [{
      title: 'LRU under a lock: list + map, two threads taking turns',
      input: '3 ; A put a, B put b, A put c, B get a, A put d, B get b, A get c, B put a',
      inputLabel: 'capacity ; ops like "A put x" or "B get x", comma separated',
      gen: function (input) {
        var hint = 'Format: "capacity ; A put a, B get a, ..." (capacity 1-6, up to 12 ops; thread = one word, op = put/get, key = short word).';
        var sp = String(input === undefined ? '' : input).split(';');
        if (sp.length !== 2) throw new Error(hint);
        var cap = Number(String(sp[0]).trim());
        if (!(cap >= 1 && cap <= 6) || cap % 1) throw new Error(hint);
        var ops = String(sp[1]).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; }).map(function (s) {
          var t = s.split(/\s+/);
          if (t.length !== 3 || !/^(put|get)$/i.test(t[1]) || t[0].length > 4 || t[2].length > 4) throw new Error('Bad op "' + s + '". ' + hint);
          return { who: t[0].toUpperCase(), op: t[1].toLowerCase(), key: t[2] };
        });
        if (!ops.length || ops.length > 12) throw new Error(hint);
        var order = [], vals = {}, frames = [], ver = 0, hits = 0, misses = 0;
        function listPart(hl) {
          var ptr = {};
          if (order.length) { ptr[0] = 'MRU'; ptr[order.length - 1] = order.length > 1 ? 'LRU' : 'MRU/LRU'; }
          return { type: 'list', label: 'Doubly linked list (head = most recent → tail = least recent)', values: order.map(function (k) { return k + '=' + vals[k]; }), ptr: ptr, hl: hl || {} };
        }
        function mapPart(hl) { return { type: 'map', label: 'HashMap key → node', entries: order.slice().sort().map(function (k) { return [k, 'node(' + k + '=' + vals[k] + ')']; }), hl: hl || {} }; }
        function lockVars(owner, waiting, hl) { return VARS('Lock & stats', { lockOwner: owner, waiting: waiting, size: order.length + '/' + cap, hits: hits, misses: misses }, hl || {}); }
        frames.push(F('Empty LRU cache, capacity <b>' + cap + '</b>, protected by <b>one ReentrantLock</b>. Every operation — even <code>get</code> — takes the lock, because a get moves its node to the front of the list.', [listPart(), mapPart(), lockVars('free', 'none')]));
        ops.forEach(function (o, i) {
          var next = ops[i + 1], waiting = next && next.who !== o.who ? next.who + ' (parked on lock)' : 'none';
          var idx = order.indexOf(o.key), lh = {}, mh = {};
          var narr1 = 'Thread <b>' + o.who + '</b> calls <code>' + o.op + '(' + o.key + ')</code> and acquires the lock' + (waiting !== 'none' ? '; thread ' + next.who + ' arrives and must wait' : '') + '. ';
          if (o.op === 'get') {
            if (idx >= 0) { lh[idx] = 'cur'; mh[o.key] = 'cur'; narr1 += 'Map lookup: <span class="c-g">hit</span> — node found at position ' + (idx + 1) + ' of the list.'; }
            else narr1 += 'Map lookup: <span class="c-r">miss</span>.';
          } else {
            if (idx >= 0) { lh[idx] = 'cur'; mh[o.key] = 'cur'; narr1 += 'Key exists → will update its value and move it to the front.'; }
            else if (order.length === cap) { lh[order.length - 1] = 'bad'; mh[order[order.length - 1]] = 'bad'; narr1 += 'New key and the cache is full → the tail <b>' + order[order.length - 1] + '</b> (least recently used) must be evicted first.'; }
            else narr1 += 'New key, there is room.';
          }
          frames.push(F(narr1, [listPart(lh), mapPart(mh), lockVars(o.who, waiting, { lockOwner: 'cur', waiting: waiting !== 'none' ? 'bad' : '' })]));
          var narr2, lh2 = {}, mh2 = {};
          if (o.op === 'get') {
            if (idx >= 0) { hits++; order.splice(idx, 1); order.unshift(o.key); lh2[0] = 'ok'; mh2[o.key] = 'ok'; narr2 = 'Return ' + vals[o.key] + ' and <b>move ' + o.key + ' to the front</b> (4 pointer writes). This is why a get under a <i>read</i> lock would corrupt the list.'; }
            else { misses++; narr2 = 'Return null (a real cache would load it — <i>outside</i> this lock).'; }
          } else {
            ver++;
            if (idx >= 0) { vals[o.key] = 'v' + ver; order.splice(idx, 1); order.unshift(o.key); narr2 = 'Updated ' + o.key + ' = v' + ver + ' and moved it to the front.'; }
            else {
              var ev = '';
              if (order.length === cap) { var victim = order.pop(); delete vals[victim]; ev = 'Evicted <span class="c-r">' + victim + '</span> from list AND map (same critical section, so size never exceeds ' + cap + '). '; }
              vals[o.key] = 'v' + ver; order.unshift(o.key);
              narr2 = ev + 'Inserted ' + o.key + ' = v' + ver + ' at the front.';
            }
            lh2[0] = 'ok'; mh2[o.key] = 'ok';
          }
          narr2 += ' Unlock' + (waiting !== 'none' ? ' → ' + next.who + ' wakes up and gets the lock next.' : '.');
          frames.push(F(narr2, [listPart(lh2), mapPart(mh2), lockVars('free', 'none', {})]));
        });
        frames.push(F('Done. Hits: <b>' + hits + '</b>, misses: <b>' + misses + '</b>. List and map always agree because every change to both happened while one thread held the lock. To scale beyond one lock: stripe into N segments, or record reads in a buffer and replay them in batches (Caffeine).', [listPart(), mapPart(), lockVars('free', 'none')]));
        return frames;
      }
    }, {
      title: 'LFU: frequency buckets + minFreq (all updated under one lock)',
      input: '2 ; put a, put b, get a, put c, get b, get c, get c, put d, get a',
      inputLabel: 'capacity ; ops (put x / get x), comma separated',
      gen: function (input) {
        var hint = 'Format: "capacity ; put a, get a, ..." (capacity 1-5, up to 14 ops).';
        var sp = String(input === undefined ? '' : input).split(';');
        if (sp.length !== 2) throw new Error(hint);
        var cap = Number(String(sp[0]).trim());
        if (!(cap >= 1 && cap <= 5) || cap % 1) throw new Error(hint);
        var ops = String(sp[1]).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; }).map(function (s) {
          var t = s.split(/\s+/);
          if (t.length !== 2 || !/^(put|get)$/i.test(t[0]) || t[1].length > 4) throw new Error('Bad op "' + s + '". ' + hint);
          return { op: t[0].toLowerCase(), key: t[1] };
        });
        if (!ops.length || ops.length > 14) throw new Error(hint);
        var val = {}, freq = {}, buckets = {}, minF = 0, frames = [], ver = 0;
        function keysPart(hl) { return { type: 'map', label: 'key → (value, freq)', entries: Object.keys(val).sort().map(function (k) { return [k, val[k] + ', f=' + freq[k]]; }), hl: hl || {} }; }
        function bucketPart(hl) { return { type: 'map', label: 'freq → keys (oldest first)', entries: Object.keys(buckets).map(Number).sort(function (a, b) { return a - b; }).filter(function (f) { return buckets[f].length; }).map(function (f) { return ['f=' + f, buckets[f].join(', ')]; }), hl: hl || {} }; }
        function st(hl) { return VARS('LFU state (one lock guards all three structures)', { minFreq: minF || '-', size: Object.keys(val).length + '/' + cap }, hl || {}); }
        function bump(k) {
          var f = freq[k], b = buckets[f];
          b.splice(b.indexOf(k), 1);
          if (!b.length && minF === f) minF = f + 1;
          freq[k] = f + 1;
          (buckets[f + 1] = buckets[f + 1] || []).push(k);
          return f;
        }
        frames.push(F('Empty LFU cache, capacity <b>' + cap + '</b>. Three structures must always agree: the key map, the frequency buckets, and <b>minFreq</b>. That is an invariant across several fields, so all of them live under <b>one lock</b>.', [keysPart(), bucketPart(), st()]));
        ops.forEach(function (o) {
          if (o.op === 'get') {
            if (!(o.key in val)) { frames.push(F('get(' + o.key + '): <span class="c-r">miss</span>. Nothing changes.', [keysPart(), bucketPart(), st()])); return; }
            var f0 = bump(o.key), kh = {}, bh = {}; kh[o.key] = 'ok'; bh['f=' + (f0 + 1)] = 'ok';
            frames.push(F('get(' + o.key + ') → ' + val[o.key] + '. Move ' + o.key + ' from bucket f=' + f0 + ' to f=' + (f0 + 1) + '. minFreq is now <b>' + minF + '</b>' + (minF === f0 + 1 ? ' (bucket f=' + f0 + ' emptied and it was the minimum)' : '') + '.', [keysPart(kh), bucketPart(bh), st({ minFreq: 'cur' })]));
          } else {
            ver++;
            if (o.key in val) {
              val[o.key] = 'v' + ver; var f1 = bump(o.key), kh1 = {}; kh1[o.key] = 'ok';
              frames.push(F('put(' + o.key + ') on an existing key: update value to v' + ver + ' and count it as a use (f=' + f1 + ' → ' + (f1 + 1) + ').', [keysPart(kh1), bucketPart(), st()]));
              return;
            }
            if (Object.keys(val).length === cap) {
              var victim = buckets[minF][0], kh2 = {}, bh2 = {}; kh2[victim] = 'bad'; bh2['f=' + minF] = 'bad';
              frames.push(F('put(' + o.key + '): cache full. Victim = first (oldest) key in bucket minFreq = ' + minF + ' → <span class="c-r">' + victim + '</span>' + (buckets[minF].length > 1 ? ' (tie broken by recency: it has waited longest at this frequency)' : '') + '.', [keysPart(kh2), bucketPart(bh2), st({ minFreq: 'cur' })]));
              buckets[minF].shift(); delete val[victim]; delete freq[victim];
            }
            val[o.key] = 'v' + ver; freq[o.key] = 1; (buckets[1] = buckets[1] || []).push(o.key); minF = 1;
            var kh3 = {}; kh3[o.key] = 'ok';
            frames.push(F('Insert ' + o.key + ' = v' + ver + ' with freq 1, and reset <b>minFreq = 1</b> (a brand-new key is always the least frequent).', [keysPart(kh3), bucketPart({ 'f=1': 'ok' }), st({ minFreq: 'ok' })]));
          }
        });
        frames.push(F('Done. Every operation was O(1): hash lookups plus moving one key between two LinkedHashSet buckets. Under concurrency, one lock around each whole operation keeps map, buckets and minFreq consistent.', [keysPart(), bucketPart(), st()]));
        return frames;
      }
    }],
    examples: [
      { title: 'The ReadWriteLock trap, as a timeline', html: `<p>List: a ⇄ b ⇄ c (head → tail). Two threads call <code>get(b)</code> and <code>get(c)</code> under a <b>read</b> lock (both allowed in at once):</p>
${H.table(['t', 'Thread 1: get(b) → move b to front', 'Thread 2: get(c) → move c to front'], [['1', 'unlink b: a.next = c', ''], ['2', '', 'unlink c: b.next = null (reads stale b)'], ['3', 'b.next = head.next (a)', ''], ['4', '', H.c('r', 'c.next = head.next (a) — now two nodes claim to be first')], ['5', H.c('r', 'list has a cycle / lost node; size ≠ map.size()'), '']])}
<p>Rule: if the "read" path writes shared state, it is not a read. Use the exclusive lock, or don't reorder on read (e.g. CLOCK/second-chance: set a volatile "referenced" bit instead of relinking).</p>` },
      { title: 'Cache stampede: 100 misses, 1 DB call', html: `<p>A popular product's entry expires; 100 request threads miss at once. Naive code: each calls the DB → 100 identical queries spike the database. Fix: <b>single flight</b> — the first thread puts a <code>CompletableFuture</code> into an in-flight map with <code>putIfAbsent</code> and loads; the other 99 find that future and <code>join()</code> it. Same idea as <code>ConcurrentHashMap.computeIfAbsent</code>, but without holding a bin lock during a slow load (see the guided problem).</p>` },
      { title: 'CLOCK: an LRU approximation with cheap reads', html: `<p>Instead of moving nodes on every get, keep entries in a circular array with a <code>referenced</code> bit. <code>get</code> just sets the bit (a volatile write, no list surgery, can run under a read lock or none). On eviction a "clock hand" sweeps: if bit = 1, clear it and move on (second chance); if bit = 0, evict. Operating systems use this for page replacement; it trades a little accuracy for much less contention.</p>`, code: `class ClockSlot<K, V> {
    final K key;
    volatile V value;
    volatile boolean referenced;      // set on every hit: a cheap write, no relinking
    ClockSlot(K key, V value) { this.key = key; this.value = value; }
}` },
      { title: 'Choosing the policy in practice', html: `${H.table(['Workload', 'Good policy', 'Why'], [['session data, recency matters', 'LRU', 'recent users come back soon'], ['product catalog with steady hot items', 'LFU / TinyLFU', 'popular items stay even after a scan'], ['one-off big scans (reports)', 'LRU fails (scan pollution)', 'TinyLFU admission filter rejects one-hit wonders'], ['need O(1) and huge QPS in Java', 'Caffeine (W-TinyLFU)', 'near-optimal hit rate, concurrent by design']])}` }
    ],
    deepDive: `<p><b>Why one lock is often fine.</b> The critical section of a well-written LRU op is ~50–100 ns (a hash lookup and a few pointer writes). One lock sustains millions of ops/sec. It becomes a problem at very high core counts or when someone puts I/O, logging, or value serialization inside the lock. First move the slow work out; then consider striping.</p>
<p><b>Striping math.</b> With S stripes and uniform keys, contention drops roughly S×. Cost: each stripe has capacity/S, so a skewed key distribution can evict hot keys from a crowded stripe while another stripe has room — global hit rate drops slightly. Choose S ≈ a small multiple of core count.</p>
<p><b>How Caffeine scales.</b> Data lives in a <code>ConcurrentHashMap</code> (lock-free reads). Each read appends the entry to a striped, <b>lossy</b> ring buffer (if the buffer is full the event is dropped — it only affects recency accuracy, not correctness). Writes go to a bounded write buffer. A single maintenance task drains buffers under a lock and updates the eviction policy (W-TinyLFU: small LRU "window" + segmented LRU main space + a Count-Min Sketch frequency filter that decides admission). This is the "batch the bookkeeping" idea from databases (buffer pool) applied to caches.</p>
<p><b>Memory visibility of values.</b> If you hand out mutable value objects from the cache, callers can mutate shared state without any lock. Cache immutable values, or defensive copies.</p>
<p><b>Expiry (TTL).</b> Lazy expiry (check timestamp on get) + periodic cleanup, or a timer wheel (Caffeine) for O(1) scheduling. Expiry checks must be in the same critical section as the read that relies on them, or you can return an entry that just expired.</p>
<p><b>LFU subtleties.</b> Pure LFU never forgets: an item hot last week stays forever. Real systems <b>age</b> frequencies (halve all counters periodically — TinyLFU's "reset"). Counters can overflow — cap them (Caffeine uses 4-bit counters in the sketch).</p>
<p><b>Lock choice.</b> <code>ReentrantLock</code> vs <code>synchronized</code>: same speed today; <code>ReentrantLock</code> adds <code>tryLock</code> (timeouts), fairness, and avoids virtual-thread pinning on Java 21. A <b>fair</b> lock prevents starvation but costs throughput — rarely needed for a cache.</p>`,
    aiEra: `<p><b>What AI changes:</b> "thread-safe LRU cache in Java" is one of the most-generated snippets on the internet, so assistants produce it fluently — including the popular <b>wrong</b> version: <code>ReentrantReadWriteLock</code> with <code>get</code> under the read lock on top of an access-ordered <code>LinkedHashMap</code>.</p>
<p><b>Prompts that help:</b> <code>Which methods of this cache mutate shared state, including reads?</code>; <code>Write a stress test with 8 threads that checks list/map consistency and size ≤ capacity after the run</code>; <code>Move the loader call out of the critical section and add single-flight per key</code>.</p>
<p><b>Where AI goes wrong:</b> read lock for LRU get; calling the loader inside <code>computeIfAbsent</code> or inside the lock (blocking everyone, or recursive update); LFU that forgets to reset <code>minFreq = 1</code> on insert; eviction outside the lock so size briefly exceeds capacity; "just use ConcurrentHashMap" with no eviction at all (a memory leak).</p>
<p><b>What you own:</b> spotting that reads write, picking lock granularity, knowing when to stop hand-rolling and use Caffeine, and explaining hit-rate vs contention trade-offs.</p>`,
    problems: [{
      title: 'Thread-Safe LRU with Single-Flight Loading', level: 'Hard', tags: ['LRU', 'cache stampede', 'CompletableFuture', 'lock scope'], companies: ['Amazon', 'Netflix', 'Meta', 'Zomato'],
      statement: `<p>Build <code>LoadingLRU&lt;K, V&gt;(capacity, loader)</code> with <code>V get(K key)</code>: return the cached value, or load it with <code>loader.apply(key)</code> (a slow DB call, ~20 ms), cache it, and return it. Requirements: thread-safe; never more than <code>capacity</code> entries; <b>hits must not wait for anyone's DB call</b>; when N threads miss the <b>same</b> key at once, the loader runs <b>once</b> and all N get that result; if the loader throws, all waiters see the exception and the next call retries.</p>`,
      constraints: `<p>capacity ≤ 10<sup>5</sup>, 64 request threads, hit ratio ~95%, loader 5–50 ms.</p>`,
      example: `<p>100 threads call <code>get("p42")</code> at the same moment on an empty cache → loader called ${H.c('g', '1 time')}, all 100 return the same value. Meanwhile <code>get("p7")</code> (already cached) returns ${H.c('g', 'immediately')} — it does not wait 20 ms behind the load.</p>`,
      brute: { why: `<p><b>Global lock with load inside</b>: correct and stampede-free, but every hit waits behind every miss's 20 ms DB call — at 64 threads latency explodes. <b>Unsynchronized check-then-load</b>: no waiting, but 100 simultaneous misses fire 100 DB queries (stampede) and the unsynchronized LRU corrupts.</p>`, code: `class LoadingLRUBrute<K, V> {
    private final LinkedHashMap<K, V> map;
    private final Function<K, V> loader;
    LoadingLRUBrute(int capacity, Function<K, V> loader) {
        this.loader = loader;
        this.map = new LinkedHashMap<>(16, 0.75f, true) {
            @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > capacity; }
        };
    }
    // BRUTE: the slow loader runs while holding the ONLY lock => hits queue behind DB calls
    synchronized V get(K key) {
        V v = map.get(key);
        if (v == null) { v = loader.apply(key); map.put(key, v); }
        return v;
    }
}` },
      mcq: { q: 'Why not just call <code>chm.computeIfAbsent(key, loader)</code> on a ConcurrentHashMap and be done?', options: ['It has no eviction (unbounded), and the slow loader runs while holding that key\'s bin lock, blocking other keys in the same bin', 'computeIfAbsent may call the loader twice for one key', 'computeIfAbsent is not thread-safe', 'It cannot store null values, which is fine, so it is perfect'], answer: 0, explain: 'computeIfAbsent does give single-flight, but the function runs under the bin lock (other keys hashing to that bin wait), it must not touch the map, and there is no capacity bound or LRU order. Combine an LRU (under a short lock) with a separate in-flight map of futures.' },
      hints: [`<p>Hint 1: Separate two concerns: (1) the LRU structure — fast ops under a short lock; (2) loading — slow, must happen with <b>no</b> lock held.</p>`, `<p>Hint 2: Keep a <code>ConcurrentHashMap&lt;K, CompletableFuture&lt;V&gt;&gt; inFlight</code>. The thread whose <code>putIfAbsent</code> wins does the load; everyone else <code>join()</code>s the winner's future.</p>`, `<p>Hint 3: Winner: re-check the LRU (someone may have just finished), load, put into LRU, complete the future (or completeExceptionally), and finally <code>inFlight.remove(key, future)</code> so the next miss can retry.</p>`],
      solution: {
        approach: `<p><b>Two-level design.</b> The LRU (HashMap + DLL or synchronized access-ordered LinkedHashMap) is touched only for O(1) get/put under its lock — hits never wait for I/O. Misses go through a <b>single-flight</b> map of futures: <code>putIfAbsent</code> elects exactly one loader per key; others block on <code>join()</code> without holding any lock. Errors propagate to all waiters and the in-flight entry is removed in <code>finally</code>, so a later call retries. The conditional <code>remove(key, f)</code> ensures we never delete a newer flight.</p>`,
        code: `class LoadingLRU<K, V> {
    private final Map<K, V> lru;                                         // short critical sections only
    private final ConcurrentHashMap<K, CompletableFuture<V>> inFlight = new ConcurrentHashMap<>();
    private final Function<K, V> loader;

    LoadingLRU(int capacity, Function<K, V> loader) {
        this.loader = loader;
        this.lru = Collections.synchronizedMap(new LinkedHashMap<K, V>(16, 0.75f, true) {
            @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > capacity; }
        });
    }

    V get(K key) {
        V v = lru.get(key);                                   // hit: O(1), never waits on I/O
        if (v != null) return v;

        CompletableFuture<V> mine = new CompletableFuture<>();
        CompletableFuture<V> existing = inFlight.putIfAbsent(key, mine);
        if (existing != null) return existing.join();          // someone else is loading: wait for it

        try {
            V again = lru.get(key);                           // a load may have finished just now
            V loaded = (again != null) ? again : loader.apply(key);   // slow call, NO lock held
            lru.put(key, loaded);
            mine.complete(loaded);
            return loaded;
        } catch (RuntimeException e) {
            mine.completeExceptionally(e);                     // every waiter sees the failure
            throw e;
        } finally {
            inFlight.remove(key, mine);                        // only remove OUR flight
        }
    }

    public static void main(String[] args) throws InterruptedException {
        AtomicInteger dbCalls = new AtomicInteger();
        LoadingLRU<String, String> cache = new LoadingLRU<>(100, k -> {
            dbCalls.incrementAndGet();
            try { Thread.sleep(20); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            return "value-of-" + k;
        });
        ExecutorService pool = Executors.newFixedThreadPool(32);
        CountDownLatch go = new CountDownLatch(1);
        Set<String> results = ConcurrentHashMap.newKeySet();
        for (int i = 0; i < 100; i++) {
            pool.execute(() -> {
                try { go.await(); } catch (InterruptedException e) { return; }
                results.add(cache.get("p42"));
            });
        }
        go.countDown();
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);
        System.out.println("db calls=" + dbCalls.get() + " distinct results=" + results);  // db calls=1
    }
}`,
        complexity: `<p>Hit: O(1) under a ~100 ns lock. Miss: one loader call per key per flight; waiters block only on their key's future. Memory: O(capacity + keys currently loading).</p>`,
        followUps: ['Add TTL: store (value, expiresAt) and treat expired as a miss.', 'Refresh-ahead: serve the stale value while one thread reloads in the background.', 'Why can a waiter not simply call <code>loader</code> itself after a timeout? (thundering herd returns).']
      }
    }]
  });

  /* ======================= TOPIC 7: CONCURRENT BOOKING ======================= */
  topics.push({
    title: 'Concurrent Booking: No Double-Booking, No Deadlock',
    analogy: `<p>A cinema has <b>two ticket counters</b> and one paper seat chart <i>per counter</i>. Asha at counter 1 asks for seats 3 and 4; Bala at counter 2 asks for seats 4 and 3. Both clerks look at their chart: free! Both sell. Two people now hold tickets for seat 4 — a <b>double booking</b>.</p>
<p>Fix attempt: put a <b>padlock on each seat</b>. Asha's clerk padlocks seat 3, Bala's clerk padlocks seat 4. Now Asha's clerk waits for seat 4's padlock and Bala's clerk waits for seat 3's padlock. They wait forever — a <b>deadlock</b>. The real fix is a house rule: <b>always padlock seats in seat-number order</b>. Both clerks reach for seat 3 first; one waits at the very first lock while holding nothing, so no circle of waiting can ever form.</p>`,
    explain: `<p><b>Booking</b> (seats, rooms, tickets, cabs, flash-sale stock) is the most common concurrency LLD question because the race is obvious and costly: two customers pay for the same seat.</p>
<p><b>Requirements to say out loud:</b> (1) a seat is never sold twice; (2) multi-seat requests are <b>all-or-nothing</b>; (3) requests for <i>different</i> seats/shows should not block each other; (4) <b>holds</b> during payment expire automatically; (5) no deadlocks, bounded waiting.</p>
<p><b>Seat lifecycle</b> (state pattern): ${H.chips(['AVAILABLE', 'HELD(user, until)', 'BOOKED(user)'], { hl: { 0: 'g', 1: 'y', 2: 'b' } })} — AVAILABLE → HELD on select, HELD → BOOKED on payment, HELD → AVAILABLE on cancel or expiry.</p>
<p><b>Designs from brute force to scalable:</b></p>
${H.table(['Design', 'Double booking?', 'Deadlock?', 'Concurrency'], [
  ['No lock: check all free, then mark', H.c('r', 'yes'), 'no', 'full, but wrong'],
  ['One global lock (<code>synchronized book()</code> on the system)', H.c('g', 'no'), 'no', H.c('r', 'one booking at a time, all shows')],
  ['Lock per show', H.c('g', 'no'), 'no', 'parallel across shows; a blockbuster show is serialized'],
  ['Lock per seat, in <b>click order</b>', H.c('g', 'no'), H.c('r', 'yes — A holds 3 wants 4, B holds 4 wants 3'), 'high'],
  ['Lock per seat, <b>sorted by seat id</b> (+ <code>tryLock</code> timeout)', H.c('g', 'no'), H.c('g', 'no — no circular wait'), 'high'],
  ['Optimistic CAS per seat (AVAILABLE → HELD), roll back on failure', H.c('g', 'no'), H.c('g', 'no locks at all'), 'highest; fails fast instead of waiting']
])}
<p><b>Deadlock needs four conditions at once</b> (Coffman): mutual exclusion, hold-and-wait, no preemption, <b>circular wait</b>. Sorting lock acquisition by a global order kills circular wait. <code>tryLock(timeout)</code> kills hold-and-wait (give up everything and retry). CAS with rollback holds nothing while "waiting", so it cannot deadlock (but can <b>livelock</b> if two clients keep colliding and retrying in lockstep — add jittered backoff).</p>
<p><b>Real systems</b> persist bookings in a database, where the same ideas reappear: <code>SELECT ... FOR UPDATE</code> (pessimistic row locks, ordered by seat id), a <b>version column</b> (<code>UPDATE seat SET status='HELD', version=version+1 WHERE id=? AND version=?</code> — optimistic), or a <b>unique constraint</b> on (show_id, seat_id) in a bookings table that makes the second insert fail. In-memory locks protect one JVM; with several app servers the source of truth must be the database (or a distributed lock with fencing tokens).</p>`,
    clues: [
      '"Design BookMyShow / ticket booking / hotel rooms / parking slots" + "<b>concurrent users</b>" → per-seat state machine with atomic transitions.',
      '"Book <b>multiple seats</b> atomically" → all-or-nothing: ordered locks or CAS with rollback.',
      '"Two users must never get the same seat" → no check-then-act; atomic conditional update.',
      '"Hold seats for 10 minutes during payment" → HELD state with expiry, released lazily or by a sweeper.',
      '"System hangs under load when two users pick overlapping seats" → deadlock from unordered locking.',
      '"Flash sale: 100 items, 1M users" → atomic decrement / CAS on stock, fail fast, no global lock.'
    ],
    code: [{ lang: 'java', title: 'Per-seat locks acquired in sorted order (all-or-nothing, deadlock-free)', code: `class Show {
    enum Status { AVAILABLE, BOOKED }
    private final Status[] seats;
    private final String[] owner;
    private final ReentrantLock[] locks;                 // one lock per seat

    Show(int n) {
        seats = new Status[n]; owner = new String[n]; locks = new ReentrantLock[n];
        for (int i = 0; i < n; i++) { seats[i] = Status.AVAILABLE; locks[i] = new ReentrantLock(); }
    }

    // returns true only if ALL requested seats were booked for this user
    boolean book(String user, int... wanted) throws InterruptedException {
        int[] ids = Arrays.stream(wanted).distinct().sorted().toArray();   // GLOBAL ORDER => no circular wait
        int locked = 0;
        try {
            for (int id : ids) {
                if (!locks[id].tryLock(200, TimeUnit.MILLISECONDS)) return false; // bounded wait, back off
                locked++;
            }
            for (int id : ids) if (seats[id] != Status.AVAILABLE) return false;  // check ALL first
            for (int id : ids) { seats[id] = Status.BOOKED; owner[id] = user; }  // then act on ALL
            return true;
        } finally {
            for (int i = locked - 1; i >= 0; i--) locks[ids[i]].unlock();      // release what we took
        }
    }

    String ownerOf(int id) { locks[id].lock(); try { return owner[id]; } finally { locks[id].unlock(); } }

    public static void main(String[] args) throws Exception {
        for (int round = 0; round < 200; round++) {
            Show s = new Show(6);
            ExecutorService pool = Executors.newFixedThreadPool(2);
            Future<Boolean> a = pool.submit(() -> s.book("asha", 3, 4));
            Future<Boolean> b = pool.submit(() -> s.book("bala", 4, 3));   // opposite click order
            boolean ra = a.get(2, TimeUnit.SECONDS), rb = b.get(2, TimeUnit.SECONDS);
            pool.shutdown();
            if (ra == rb) throw new IllegalStateException("exactly one must win, round " + round);
            if (!Objects.equals(s.ownerOf(3), s.ownerOf(4))) throw new IllegalStateException("split booking");
        }
        System.out.println("200 rounds: always exactly one winner, never a deadlock, never a split booking");
    }
}` }, { lang: 'java', title: 'Optimistic: CAS seat holds with expiry and rollback', code: `class SeatHolds {
    record Hold(String user, long expiresAt, boolean confirmed) {}
    private final AtomicReferenceArray<Hold> seats;      // null = AVAILABLE
    private final LongSupplier clock;
    private final long holdMillis;

    SeatHolds(int n, long holdMillis, LongSupplier clockMillis) {
        this.seats = new AtomicReferenceArray<>(n);
        this.holdMillis = holdMillis;
        this.clock = clockMillis;
    }

    private boolean isFree(Hold h, long now) { return h == null || (!h.confirmed() && h.expiresAt() <= now); }

    // all-or-nothing hold; never blocks, never deadlocks
    boolean hold(String user, int... ids) {
        long now = clock.getAsLong();
        Hold mine = new Hold(user, now + holdMillis, false);
        int[] sorted = Arrays.stream(ids).distinct().sorted().toArray();
        List<Integer> taken = new ArrayList<>();
        for (int id : sorted) {
            Hold cur = seats.get(id);
            // CAS succeeds only if nobody changed this seat since we read it
            if (!isFree(cur, now) || !seats.compareAndSet(id, cur, mine)) {
                for (int t : taken) seats.compareAndSet(t, mine, null);   // roll back our holds
                return false;
            }
            taken.add(id);
        }
        return true;
    }

    // payment succeeded: HELD(user) -> BOOKED(user), only if our hold is still live
    boolean confirm(String user, int... ids) {
        long now = clock.getAsLong();
        for (int id : ids) {
            Hold h = seats.get(id);
            if (h == null || !h.user().equals(user) || h.confirmed() || h.expiresAt() <= now) return false;
        }
        for (int id : ids) {
            Hold h = seats.get(id);
            if (!seats.compareAndSet(id, h, new Hold(user, Long.MAX_VALUE, true))) return false;
        }
        return true;
    }

    public static void main(String[] args) {
        AtomicLong now = new AtomicLong(0);
        SeatHolds show = new SeatHolds(10, 600_000, now::get);         // 10-minute holds
        System.out.println("asha holds 3,4: " + show.hold("asha", 3, 4));   // true
        System.out.println("bala holds 4,5: " + show.hold("bala", 4, 5));   // false (4 is held), 5 rolled back
        System.out.println("bala holds 5:   " + show.hold("bala", 5));      // true: rollback freed it
        now.set(700_000);                                               // asha never paid: hold expired
        System.out.println("asha confirms:  " + show.confirm("asha", 3, 4)); // false
        System.out.println("bala holds 4:   " + show.hold("bala", 4));      // true: expired seat reusable
        System.out.println("bala confirms:  " + show.confirm("bala", 4));   // true
    }
}` }],
    codeTitle: ['Ordered per-seat locks', 'CAS holds + expiry'],
    viz: {
      title: 'Asha wants seats 3+4, Bala wants 4+3: four designs',
      input: 'naive',
      inputLabel: 'Mode: naive | unordered | ordered | cas',
      gen: function (input) {
        var mode = pick(input, { naive: 'naive', unordered: 'unordered', ordered: 'ordered', cas: 'cas' }, 'Type one mode: naive, unordered, ordered or cas');
        var seats = ['free', 'free', 'free', 'free', 'free', 'free'], lbl = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
        var rows = [], frames = [], lockOwner = { S3: 'free', S4: 'free' };
        function seatPart(hl) { return { type: 'array', label: 'Seat chart (Asha wants S3+S4, Bala wants S4+S3)', values: seats.slice(), idxLabels: lbl, hl: hl || {} }; }
        function tl(hl) { return TABLE('Timeline', ['t', 'Asha (thread A)', 'Bala (thread B)'], rows, hl || {}); }
        function step(a, b, narr, shl, extra, cls) {
          rows.push([rows.length + 1, a, b]);
          var h = {}; h[rows.length - 1] = cls || 'cur';
          frames.push(F(narr, [seatPart(shl), tl(h)].concat(extra || [])));
        }
        function locks(hl) { return VARS('Seat locks', { 'lock(S3)': lockOwner.S3, 'lock(S4)': lockOwner.S4 }, hl || {}); }
        function waitGraph(cycle) {
          return { type: 'graph', label: 'Wait-for graph (arrow = "waits for" / "is held by")', directed: true, height: 50, nodes: [{ id: 'A', label: 'Asha', x: 15, y: 25, shape: 'box' }, { id: 'S4', label: 'lock S4', x: 50, y: 8, shape: 'box' }, { id: 'B', label: 'Bala', x: 85, y: 25, shape: 'box' }, { id: 'S3', label: 'lock S3', x: 50, y: 42, shape: 'box' }],
            edges: [['A', 'S4', 'waits'], ['S4', 'B', 'held by'], ['B', 'S3', 'waits'], ['S3', 'A', 'held by']], hl: cycle ? { A: 'bad', B: 'bad' } : {}, ehl: cycle ? { 'A-S4': 'bad', 'S4-B': 'bad', 'B-S3': 'bad', 'S3-A': 'bad' } : {} };
        }
        if (mode === 'naive') {
          frames.push(F('<b>Naive design:</b> no locks. Each request checks that all its seats are free, then marks them. Two requests overlap on S4 (and S3).', [seatPart(), tl()]));
          step('check S3, S4: both free ✓', '', 'Asha\'s thread reads the chart: S3 and S4 are free. It is about to mark them, but the CPU switches threads.', { 2: 'cur', 3: 'cur' });
          step('', 'check S4, S3: both free ✓', 'Bala\'s thread reads the chart too: still free — Asha has not written yet. Both now hold a <b>stale "free" fact</b>.', { 2: 'cur', 3: 'cur' });
          seats[2] = 'Asha'; seats[3] = 'Asha';
          step('mark S3, S4 = Asha → "Confirmed!"', '', 'Asha marks both seats and gets a confirmation email.', { 2: 'ok', 3: 'ok' }, [], 'ok');
          seats[2] = 'Bala'; seats[3] = 'Bala';
          step('', '<span class="c-r">mark S4, S3 = Bala → "Confirmed!"</span>', '<span class="c-r">Double booking!</span> Bala\'s thread acts on its stale check and overwrites Asha. Both customers paid; both have tickets for the same seats. Check-then-act without atomicity.', { 2: 'bad', 3: 'bad' }, [], 'bad');
          frames.push(F('Summary: the race window is the gap between <i>check</i> and <i>mark</i>. Try mode <b>unordered</b> to see what happens when we add per-seat locks naively.', [seatPart({ 2: 'bad', 3: 'bad' }), tl(), VARS('Outcome', { ashaToldConfirmed: true, balaToldConfirmed: true, seatsActuallyOwnedBy: 'Bala' }, { ashaToldConfirmed: 'bad', balaToldConfirmed: 'bad' })]));
        } else if (mode === 'unordered') {
          frames.push(F('<b>Per-seat locks, taken in click order.</b> Asha clicked S3 then S4; Bala clicked S4 then S3. Each thread locks its seats one by one, then checks and books.', [seatPart(), tl(), locks()]));
          lockOwner.S3 = 'Asha';
          step('lock(S3) ✓', '', 'Asha locks S3.', { 2: 'cur' }, [locks({ 'lock(S3)': 'cur' })]);
          lockOwner.S4 = 'Bala';
          step('', 'lock(S4) ✓', 'Bala locks S4 at the same time (different lock, no conflict yet).', { 3: 'cur' }, [locks({ 'lock(S4)': 'cur' })]);
          step('lock(S4) … <span class="c-y">waiting for Bala</span>', '', 'Asha now needs S4, which Bala holds. Asha blocks — <b>while still holding S3</b> (hold-and-wait).', { 2: 'cur', 3: 'win' }, [locks({ 'lock(S4)': 'bad' })]);
          step('', 'lock(S3) … <span class="c-y">waiting for Asha</span>', 'Bala needs S3, which Asha holds. Bala blocks while holding S4.', { 2: 'win', 3: 'win' }, [locks({ 'lock(S3)': 'bad', 'lock(S4)': 'bad' }), waitGraph(false)]);
          frames.push(F('<span class="c-r">Deadlock.</span> Asha waits for Bala, Bala waits for Asha — a <b>cycle</b> in the wait-for graph. With plain <code>lock()</code> neither will ever wake; both request threads are stuck forever, and as more users pick these seats, the thread pool drains. Fix: sort the seat ids (mode <b>ordered</b>) or use <code>tryLock</code> with a timeout.', [seatPart({ 2: 'bad', 3: 'bad' }), tl(), waitGraph(true)]));
        } else if (mode === 'ordered') {
          frames.push(F('<b>Per-seat locks, always in ascending seat order.</b> Both requests sort their seats: Asha → [S3, S4], Bala → [S3, S4]. Everyone reaches for S3 first.', [seatPart(), tl(), locks()]));
          lockOwner.S3 = 'Asha';
          step('lock(S3) ✓', '', 'Asha locks S3.', { 2: 'cur' }, [locks({ 'lock(S3)': 'cur' })]);
          step('', 'lock(S3) … <span class="c-y">waits (holding nothing)</span>', 'Bala also starts with S3 and waits. Crucially, Bala holds <b>no</b> lock while waiting, so no cycle can form.', { 2: 'cur' }, [locks({ 'lock(S3)': 'bad' })]);
          lockOwner.S4 = 'Asha';
          step('lock(S4) ✓', '', 'Asha takes S4 freely — nobody else holds it.', { 2: 'cur', 3: 'cur' }, [locks({ 'lock(S4)': 'cur' })]);
          seats[2] = 'Asha'; seats[3] = 'Asha';
          step('check both free ✓ → BOOK S3, S4', '', 'Under both locks Asha checks <i>all</i> seats, then books <i>all</i> — all-or-nothing.', { 2: 'ok', 3: 'ok' }, [locks()], 'ok');
          lockOwner.S4 = 'free'; lockOwner.S3 = 'Bala';
          step('unlock S4, S3', 'lock(S3) ✓ (wakes up)', 'Asha releases (reverse order). Bala wakes up holding S3.', { 2: 'ok', 3: 'ok' }, [locks({ 'lock(S3)': 'cur' })]);
          lockOwner.S4 = 'Bala';
          step('', 'lock(S4) ✓ → check: S3 BOOKED ✗', 'Bala takes S4 and checks: S3 and S4 are already booked. Nothing is written.', { 2: 'bad', 3: 'bad' }, [locks()], 'bad');
          lockOwner.S3 = 'free'; lockOwner.S4 = 'free';
          step('', 'unlock; reply "seats taken, pick others"', 'Bala releases and gets a clean failure. Exactly one winner, no double booking, no deadlock.', { 2: 'ok', 3: 'ok' }, [locks()], 'sel');
        } else {
          frames.push(F('<b>Optimistic CAS, no locks.</b> Each seat is an <code>AtomicReference</code>: null = free, otherwise a Hold. <code>compareAndSet(seat, null, myHold)</code> succeeds only if the seat is <i>still</i> free at that instant.', [seatPart(), tl()]));
          seats[2] = 'held:A';
          step('CAS S3: free → held(A) ✓', '', 'Asha\'s CAS on S3 succeeds.', { 2: 'cur' });
          seats[3] = 'held:B';
          step('', 'CAS S4: free → held(B) ✓', 'Bala\'s CAS on S4 succeeds at the same moment.', { 3: 'cur' });
          step('CAS S4: free → held(A) ✗ (held:B)', '', 'Asha\'s CAS on S4 fails — it is no longer null. Asha does <b>not wait</b>; it gives up immediately.', { 3: 'bad' }, [], 'bad');
          seats[2] = 'free';
          step('rollback: CAS S3: held(A) → free', '', 'Asha rolls back the hold it got (CAS from its own hold back to null), so the request is all-or-nothing.', { 2: 'ok' });
          seats[2] = 'held:B';
          step('', 'CAS S3: free → held(B) ✓', 'Bala\'s CAS on S3 now succeeds — Bala holds both seats.', { 2: 'cur', 3: 'cur' });
          seats[2] = 'Bala'; seats[3] = 'Bala';
          step('reply "seats taken" (may retry others)', 'payment ok → CAS held(B) → BOOKED(B)', 'Bala pays and confirms. No thread ever blocked, so deadlock is impossible. Risk: two clients colliding and retrying in lockstep (<b>livelock</b>) — cure with sorted order and random backoff.', { 2: 'ok', 3: 'ok' }, [], 'ok');
        }
        return frames;
      }
    },
    examples: [
      { title: 'Lock per show: the easy upgrade from a global lock', html: `<p>One <code>ConcurrentHashMap&lt;String, Show&gt;</code>; each <code>Show</code> object has its own <code>synchronized book(...)</code>. Bookings for different shows run in parallel; bookings for the same show are serialized (simple and often fast enough: a critical section of a few microseconds handles hundreds of thousands of bookings/sec). Mention this first, then offer per-seat locks or CAS when the interviewer says "the Avengers premiere gets 50k requests in the first minute".</p>`, code: `class Theater {
    static final class ShowSeats {
        private final boolean[] booked;
        ShowSeats(int n) { booked = new boolean[n]; }
        synchronized boolean book(int... ids) {          // lock = this show only
            for (int id : ids) if (booked[id]) return false;
            for (int id : ids) booked[id] = true;
            return true;
        }
    }
    private final ConcurrentHashMap<String, ShowSeats> shows = new ConcurrentHashMap<>();
    boolean book(String showId, int... ids) {
        return shows.computeIfAbsent(showId, s -> new ShowSeats(100)).book(ids);
    }
}` },
      { title: 'Flash sale: never oversell 100 units', html: `<p>One counter, a million buyers. A global lock works but convoys; <code>if (stock.get() &gt; 0) stock.decrementAndGet()</code> ${H.c('r', 'oversells')} (check-then-act across two atomic calls). Use a single conditional atomic update that can never go below zero.</p>`, code: `class FlashSale {
    private final AtomicInteger stock = new AtomicInteger(100);

    boolean buy() {
        while (true) {
            int s = stock.get();
            if (s == 0) return false;                       // sold out: fail fast
            if (stock.compareAndSet(s, s - 1)) return true;  // succeeds only if nobody changed it
        }
    }
    // equivalent one-liner: stock.getAndUpdate(s -> s > 0 ? s - 1 : 0) > 0
}` },
      { title: 'The same race in SQL, and its fixes', html: `<p>Race: <code>SELECT status FROM seat WHERE id=4</code> → 'FREE' (two sessions), then both <code>UPDATE seat SET status='BOOKED'</code>. Fixes:</p>
${H.table(['Technique', 'SQL', 'Behaviour'], [['Conditional update', "<code>UPDATE seat SET status='HELD', user_id=? WHERE id=? AND status='FREE'</code>", 'check+act in one statement; rows-affected = 0 means you lost'], ['Pessimistic', '<code>SELECT ... WHERE id IN (3,4) ORDER BY id FOR UPDATE</code>', 'row locks in id order (no deadlock), released at commit'], ['Optimistic version', '<code>... WHERE id=? AND version=?</code>', 'retry on conflict; great when conflicts are rare'], ['Unique constraint', '<code>UNIQUE(show_id, seat_id)</code> on bookings', 'second INSERT fails with a duplicate-key error']])}` },
      { title: 'Hold expiry without a timer per seat', html: `<p>A hold stores <code>expiresAt</code>. Instead of scheduling a task per hold, treat an expired hold as free <b>at read time</b> (lazy expiry, as in <code>SeatHolds.isFree</code>). A background sweeper can clean up for display purposes, but correctness never depends on it. Confirming payment must re-check the hold is still yours and unexpired <i>in the same atomic step</i> as the transition to BOOKED — otherwise a payment that lands at 10:00:01 could book a seat someone else grabbed at 10:00:00.</p>` }
    ],
    deepDive: `<p><b>Proving "never double-booked".</b> The invariant is "each seat has at most one owner". Every transition that changes a seat's owner must be a single atomic step conditioned on the current state: a CAS from the observed value, or a write performed while holding that seat's lock after re-checking. If any path writes the owner without that condition, the invariant is unprotected.</p>
<p><b>Ordered locking in general.</b> Any multi-resource operation (bank transfer between two accounts, booking several seats, moving an item between two inventories) must acquire locks in a <b>global total order</b> — by id, or by <code>System.identityHashCode</code> with a tie-breaker lock. Release order does not matter for deadlock, but reverse order is conventional.</p>
<p><b>tryLock with timeout</b> turns a potential deadlock into a retryable failure. Combine with randomized backoff to avoid livelock. <code>lockInterruptibly</code> lets shutdown cancel waiting requests.</p>
<p><b>Optimistic vs pessimistic.</b> Optimistic (CAS/versions) wins when conflicts are rare — most seat selections don't overlap. Pessimistic wins when conflicts are frequent (the last 10 seats of a sold-out show), since retries waste work. Many systems do optimistic holds at the seat level and pessimistic (DB transaction) at payment confirmation.</p>
<p><b>ABA in CAS.</b> Seat goes HELD(A) → free → HELD(A') with an equal-looking value; a stale CAS could succeed wrongly. Using a <b>new object per hold</b> (identity comparison) or a version stamp (<code>AtomicStampedReference</code>) avoids it — the <code>SeatHolds</code> code allocates a fresh <code>Hold</code> each time.</p>
<p><b>Beyond one JVM.</b> With N app servers, in-memory locks are per server — two servers can still double-book. Make the database (or Redis with Lua) the arbiter: conditional updates, row locks, or a unique constraint. Distributed locks (Redis Redlock, ZooKeeper, etcd) need <b>fencing tokens</b>: a lock holder paused by GC may wake up after its lease expired and must be rejected by the storage layer.</p>
<p><b>Fairness and UX.</b> Holding seats during a slow payment ties up inventory; keep hold TTL short (5–10 min), show a countdown, and release on cancel. Queue-based admission ("virtual waiting room") is the HLD answer for hyped launches — it is producer-consumer again, at the edge.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI will happily generate a full BookMyShow class model in a minute. The hard part it often gets subtly wrong is the <b>booking transaction</b>: <code>synchronized</code> on the wrong object (the request DTO, a new lock per call), per-seat locks in list order, or "check availability" and "book" as two service calls.</p>
<p><b>Prompts that help:</b> <code>Show two concurrent calls to bookSeats with overlapping seats in opposite order and trace the locks</code>; <code>Rewrite this booking as a single conditional SQL UPDATE and explain how rows-affected signals failure</code>; <code>What happens if payment confirmation arrives after the hold expired?</code></p>
<p><b>Where AI goes wrong:</b> locks a local variable (<code>synchronized (new Object())</code>) which protects nothing; uses <code>@Transactional</code> and assumes it prevents double-booking at READ COMMITTED (it does not without row locks or a conditional update); forgets rollback of partial holds; schedules a timer thread per hold.</p>
<p><b>What you own:</b> the state machine, the atomic transition for each edge, the lock ordering proof, and the decision of where the source of truth lives once there is more than one server.</p>`,
    problems: [{
      title: 'Concurrent Meeting-Room Booking', level: 'Hard', tags: ['booking', 'per-resource lock', 'TreeMap', 'interval overlap'], companies: ['Microsoft', 'Google', 'Atlassian', 'Uber'],
      statement: `<p>Implement <code>RoomBooker</code> for an office with many rooms: <code>boolean book(String roomId, int start, int end, String user)</code> books the half-open interval [start, end) if it does not overlap any existing booking in that room; <code>boolean bookAny(List&lt;String&gt; rooms, int start, int end, String user)</code> books the first room in the list that is free. Hundreds of threads call it concurrently. Two bookings in the same room must never overlap; bookings in different rooms must not block each other.</p>`,
      constraints: `<p>10<sup>4</sup> rooms, up to 10<sup>3</sup> bookings per room per day, 0 ≤ start &lt; end ≤ 1440 (minutes in a day).</p>`,
      example: `<p>Room R1 has [600, 660). Concurrent requests [630, 700) by Asha and [650, 720) by Bala → ${H.c('r', 'both rejected')} (overlap). [660, 720) by Chen → ${H.c('g', 'booked')} (touching endpoints is fine). Two threads racing for [700, 760) in R2 → ${H.c('g', 'exactly one wins')}.</p>`,
      brute: { why: `<p><b>No lock:</b> two threads both scan the room's list, see no overlap, and both add → overlapping meetings. Also <code>ArrayList</code>/<code>TreeMap</code> corrupt under concurrent writes. <b>One global lock:</b> correct, but every booking in a 10k-room campus waits for every other, and the O(n) list scan happens inside that lock.</p>`, code: `class RoomBookerBrute {
    private final Map<String, List<int[]>> rooms = new HashMap<>();

    // correct only because EVERYTHING is serialized on one monitor; O(n) scan inside the lock
    synchronized boolean book(String roomId, int start, int end, String user) {
        List<int[]> list = rooms.computeIfAbsent(roomId, r -> new ArrayList<>());
        for (int[] b : list) if (start < b[1] && b[0] < end) return false;   // overlap test
        list.add(new int[]{start, end});
        return true;
    }
}` },
      mcq: { q: 'In <code>bookAny</code>, why must you <b>not</b> lock all candidate rooms first and then pick one?', options: ['Locking many rooms blocks unrelated bookers and, without a global order, can deadlock with another bookAny using a different list order', 'Because Java limits a thread to one lock', 'Because TreeMap is not thread-safe', 'It is fine and the fastest approach'], answer: 0, explain: 'Each room\'s booking is independent, so try rooms one at a time: lock room, check, book or move on. You hold at most one lock at any moment, which makes deadlock impossible and keeps contention low.' },
      hints: [`<p>Hint 1: The unit of conflict is a <b>room</b>. Give each room its own lock and its own sorted structure.</p>`, `<p>Hint 2: A <code>TreeMap&lt;Integer, Integer&gt;</code> (start → end) per room: the only intervals that can overlap [s, e) are <code>floorEntry(s)</code> (must end ≤ s) and <code>ceilingEntry(s)</code> (must start ≥ e). O(log n).</p>`, `<p>Hint 3: <code>ConcurrentHashMap.computeIfAbsent</code> creates each Room once; <code>synchronized</code> methods on Room do check + insert atomically. bookAny = loop over rooms, call room.book, stop at the first success — never hold two room locks.</p>`],
      solution: {
        approach: `<p><b>Lock per room</b> + <b>TreeMap interval check</b>. The room registry is a <code>ConcurrentHashMap</code> (lock-free lookups, atomic room creation). Each <code>Room</code> guards its <code>TreeMap</code> with its own monitor; <code>book</code> performs the floor/ceiling overlap check and the insert inside one critical section, so no other booking for that room can slip in between. <code>bookAny</code> tries rooms one at a time and never holds more than one lock, so it cannot deadlock and does not block unrelated rooms.</p>`,
        code: `class RoomBooker {
    static final class Room {
        private final TreeMap<Integer, Integer> bookings = new TreeMap<>();   // start -> end, guarded by this
        private final Map<Integer, String> owners = new HashMap<>();          // start -> user, guarded by this

        synchronized boolean book(int start, int end, String user) {
            if (start >= end) throw new IllegalArgumentException("empty interval");
            Map.Entry<Integer, Integer> before = bookings.floorEntry(start);
            if (before != null && before.getValue() > start) return false;   // previous meeting runs into us
            Map.Entry<Integer, Integer> after = bookings.ceilingEntry(start);
            if (after != null && after.getKey() < end) return false;          // next meeting starts before we end
            bookings.put(start, end);
            owners.put(start, user);
            return true;
        }
        synchronized int count() { return bookings.size(); }
    }

    private final ConcurrentHashMap<String, Room> rooms = new ConcurrentHashMap<>();

    private Room room(String id) { return rooms.computeIfAbsent(id, r -> new Room()); }

    boolean book(String roomId, int start, int end, String user) { return room(roomId).book(start, end, user); }

    // holds at most ONE room lock at a time => no deadlock, minimal blocking
    boolean bookAny(List<String> roomIds, int start, int end, String user) {
        for (String id : roomIds) if (room(id).book(start, end, user)) return true;
        return false;
    }

    public static void main(String[] args) throws InterruptedException {
        RoomBooker rb = new RoomBooker();
        rb.book("R1", 600, 660, "dev");
        System.out.println(rb.book("R1", 630, 700, "asha") + " " + rb.book("R1", 650, 720, "bala")
                + " " + rb.book("R1", 660, 720, "chen"));                 // false false true

        // 64 threads race for the same slot in R2: exactly one wins
        AtomicInteger wins = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(16);
        for (int i = 0; i < 64; i++) {
            String u = "u" + i;
            pool.execute(() -> { if (rb.book("R2", 700, 760, u)) wins.incrementAndGet(); });
        }
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("winners for R2 [700,760): " + wins.get());   // 1
    }
}`,
        dry: { head: ['request', 'floorEntry(start)', 'ceilingEntry(start)', 'result'], rows: [['[630,700) asha', '600→660 (660 &gt; 630)', '-', H.c('r', 'overlap → false')], ['[650,720) bala', '600→660 (660 &gt; 650)', '-', H.c('r', 'false')], ['[660,720) chen', '600→660 (660 ≤ 660 ok)', 'none', H.c('g', 'book → true')]] },
        complexity: `<p>book: O(log b) for b bookings in that room, under that room's lock only. bookAny: O(r log b) worst case, holding one lock at a time. Memory O(total bookings).</p>`,
        followUps: ['Cancel a booking (only by its owner) — same lock, remove from both maps.', 'Book a room AND a projector atomically (two resources → ordered locking).', 'Recurring weekly meetings: check all occurrences under the room lock before inserting any.']
      }
    }]
  });

  /* ======================= PRACTICE: EASY ======================= */
  practice.push({
    title: 'Make This Lazy Singleton Thread-Safe', level: 'Easy', tags: ['singleton', 'check-then-act', 'safe publication'], companies: ['Infosys', 'TCS', 'Amazon'],
    statement: `<p>A <code>MetricsRegistry</code> is expensive to build, so it is created lazily: <code>if (instance == null) instance = new MetricsRegistry(); return instance;</code>. Under load, logs show the constructor running <b>twice</b> and some metrics vanish (they went to the "other" registry). Make <code>getInstance()</code> thread-safe and lazy, with <b>no locking cost after initialization</b>.</p>`,
    constraints: `<p>getInstance() is called millions of times per minute from all request threads.</p>`,
    example: `<p>Two threads call <code>getInstance()</code> at startup. Broken: ${H.c('r', 'two different objects')}. Fixed: ${H.c('g', 'the same object, constructor runs once')}.</p>`,
    brute: { why: `<p><b>Unsynchronized</b>: check-then-act race creates two instances; without a happens-before edge another thread may even see a half-constructed object. <b><code>synchronized getInstance()</code></b>: correct, but every one of millions of calls takes a lock forever, just to protect a one-time event.</p>`, code: `class MetricsRegistryBrute {
    private static MetricsRegistryBrute instance;
    private MetricsRegistryBrute() { }
    static MetricsRegistryBrute getUnsafe() {                // race: two threads both see null
        if (instance == null) instance = new MetricsRegistryBrute();
        return instance;
    }
    static synchronized MetricsRegistryBrute getLocked() {   // correct, but locks on EVERY call
        if (instance == null) instance = new MetricsRegistryBrute();
        return instance;
    }
}` },
    mcq: { q: 'In double-checked locking, why must the field be <code>volatile</code>?', options: ['Without it, another thread may see a non-null reference to an object whose constructor writes are not yet visible', 'volatile makes the constructor run faster', 'Without it the code does not compile', 'volatile is needed only on 32-bit JVMs'], answer: 0, explain: 'The JIT/CPU may publish the reference before the constructor\'s field writes are visible. volatile adds the happens-before edge from the write of the reference to the unsynchronized read.' },
    hints: [`<p>Hint 1: You need "initialize exactly once" plus "every thread sees a fully built object".</p>`, `<p>Hint 2: The JVM already guarantees class initialization happens once, thread-safely, on first use.</p>`, `<p>Hint 3: Holder idiom: a private static nested class with a <code>static final</code> field. Alternative: enum singleton, or double-checked locking with a <code>volatile</code> field.</p>`],
    solution: {
      approach: `<p><b>Initialization-on-demand holder.</b> The nested <code>Holder</code> class is not initialized until <code>getInstance()</code> first touches it; JVM class initialization is lazy, runs exactly once, and is safely published to all threads. After that, <code>getInstance()</code> is a plain static field read with no lock. Double-checked locking with <code>volatile</code> is shown as an alternative when you need constructor arguments.</p>`,
      code: `class MetricsRegistry {
    static final AtomicInteger constructed = new AtomicInteger();
    private MetricsRegistry() { constructed.incrementAndGet(); }

    private static class Holder { static final MetricsRegistry INSTANCE = new MetricsRegistry(); }
    static MetricsRegistry getInstance() { return Holder.INSTANCE; }      // lazy, once, lock-free reads

    // alternative: double-checked locking (field MUST be volatile)
    private static volatile MetricsRegistry dcl;
    static MetricsRegistry getDcl() {
        MetricsRegistry r = dcl;                        // one volatile read on the fast path
        if (r == null) {
            synchronized (MetricsRegistry.class) {
                r = dcl;
                if (r == null) dcl = r = new MetricsRegistry();
            }
        }
        return r;
    }

    public static void main(String[] args) throws InterruptedException {
        Set<MetricsRegistry> seen = ConcurrentHashMap.newKeySet();
        ExecutorService pool = Executors.newFixedThreadPool(16);
        for (int i = 0; i < 1000; i++) pool.execute(() -> seen.add(getInstance()));
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("distinct=" + seen.size() + " constructed=" + constructed.get());   // 1 1
    }
}`,
      complexity: `<p>O(1) per call; zero lock acquisitions after initialization.</p>`,
      followUps: ['Why is an enum singleton also safe (and serialization-proof)?', 'What if the constructor throws? (holder: NoClassDefFoundError on later calls; DCL: retries).']
    }
  });

  practice.push({
    title: 'Unique Order ID Generator', level: 'Easy', tags: ['atomics', 'read-modify-write'], companies: ['Flipkart', 'Swiggy', 'Shopify'],
    statement: `<p><code>OrderIdGenerator.next()</code> returns <code>"ORD-" + (++counter)</code> using a plain <code>long</code>. During a sale, two orders got the <b>same ID</b> and the payment system merged them. Make <code>next()</code> return unique, increasing IDs from any number of threads.</p>`,
    constraints: `<p>~20k IDs/sec from 200 threads. IDs must be unique within the process; gaps are acceptable.</p>`,
    example: `<p>8 threads × 10,000 calls. Broken: ${H.c('r', 'set size 79,6xx (duplicates)')}. Fixed: ${H.c('g', '80,000 distinct IDs')}.</p>`,
    brute: { why: `<p><code>++counter</code> is read-add-write; two threads read 41 and both return ORD-42. Making it <code>volatile</code> does not help (visibility, not atomicity). Wrapping in <code>synchronized</code> works but is heavier than needed for one variable.</p>`, code: `class OrderIdBrute {
    private long counter;                       // volatile would NOT fix it
    String next() { return "ORD-" + (++counter); }  // lost updates => duplicate IDs
}` },
    mcq: { q: 'Which single call makes the increment atomic?', options: ['<code>counter.incrementAndGet()</code> on an AtomicLong', '<code>counter++</code> on a volatile long', '<code>Thread.yield()</code> before ++', '<code>Math.addExact(counter, 1)</code>'], answer: 0, explain: 'AtomicLong.incrementAndGet performs read-add-write as one hardware atomic operation (lock xadd / CAS loop).' },
    hints: [`<p>Hint 1: The shared state is one number; the race is read-modify-write.</p>`, `<p>Hint 2: <code>java.util.concurrent.atomic.AtomicLong</code>.</p>`, `<p>Hint 3: Format the string after getting the number — building the string does not need to be atomic, only the increment does.</p>`],
    solution: {
      approach: `<p>Replace the field with an <code>AtomicLong</code> and use <code>incrementAndGet()</code>: lock-free, unique, increasing. Only the counter step is atomic; formatting happens on the thread's own copy of the number. For multi-server uniqueness you would add a node id (Snowflake-style: timestamp | node | sequence).</p>`,
      code: `class OrderIdGenerator {
    private final AtomicLong counter = new AtomicLong();
    String next() { return "ORD-" + counter.incrementAndGet(); }

    public static void main(String[] args) throws InterruptedException {
        OrderIdGenerator g = new OrderIdGenerator();
        Set<String> ids = ConcurrentHashMap.newKeySet();
        Thread[] ts = new Thread[8];
        for (int i = 0; i < ts.length; i++) {
            ts[i] = new Thread(() -> { for (int k = 0; k < 10_000; k++) ids.add(g.next()); });
            ts[i].start();
        }
        for (Thread t : ts) t.join();
        System.out.println("distinct ids: " + ids.size());    // 80000
    }
}`,
      complexity: `<p>O(1) per ID, lock-free.</p>`,
      followUps: ['Make IDs unique across 50 servers without coordination (Snowflake).', 'Why might <code>LongAdder</code> be wrong here? (sum() is not a unique sequence).']
    }
  });

  practice.push({
    title: 'Race Bug Hunt: The Lazy Config Cache', level: 'Easy', tags: ['bug hunt', 'check-then-act', 'computeIfAbsent'], companies: ['Atlassian', 'Adobe'],
    statement: `<p>Find and fix the race:</p><pre>class ConfigCache {
  private final Map&lt;String,String&gt; cache = new HashMap&lt;&gt;();
  String get(String key) {
    if (!cache.containsKey(key)) cache.put(key, loadFromFile(key));
    return cache.get(key);
  }
}</pre><p>Called from all request threads. Sometimes it returns <code>null</code> for a key that exists, and the file is read many times.</p>`,
    constraints: `<p>A few hundred keys; loading a key is fast (&lt; 1 ms) and idempotent.</p>`,
    example: `<p>Two threads ask for "db.url" at once: both see "absent", both load and put; a concurrent resize of the HashMap can make <code>get</code> miss an entry → ${H.c('r', 'null')}. Fixed version: ${H.c('g', 'one load, always the value')}.</p>`,
    brute: { why: `<p>Three bugs: (1) <code>HashMap</code> is not thread-safe (concurrent put during resize corrupts it); (2) <code>containsKey</code> then <code>put</code> is check-then-act → duplicate loads; (3) <code>put</code> then <code>get</code> are separate → can return a different/missing value. A <code>synchronized get</code> fixes all three but serializes every lookup forever.</p>`, code: `class ConfigCacheLocked {
    private final Map<String, String> cache = new HashMap<>();
    synchronized String get(String key) {                  // correct but every read takes the lock
        if (!cache.containsKey(key)) cache.put(key, "value-of-" + key);
        return cache.get(key);
    }
}` },
    mcq: { q: 'Which is the best fix here?', options: ['<code>ConcurrentHashMap.computeIfAbsent(key, this::load)</code>', 'Make the map field volatile', 'Use Collections.synchronizedMap and keep the same code', 'Use Hashtable'], answer: 0, explain: 'computeIfAbsent is atomic per key: one load, value returned from the same call, lock-free reads afterwards. A synchronized wrapper keeps the check-then-act race.' },
    hints: [`<p>Hint 1: Count the separate map calls in <code>get</code>. Each gap is a race window.</p>`, `<p>Hint 2: Collapse "check, load, put, read" into one atomic call.</p>`, `<p>Hint 3: Because the load is fast and doesn't touch the map, it is safe inside <code>computeIfAbsent</code>.</p>`],
    solution: {
      approach: `<p>Use <code>ConcurrentHashMap.computeIfAbsent</code>: atomic per key, loads exactly once, returns the stored value from the same call. Reads after the first are lock-free. Safe because the loader is short and does not modify the map (a slow loader would need the single-flight pattern from the LRU topic).</p>`,
      code: `class ConfigCache {
    private final ConcurrentHashMap<String, String> cache = new ConcurrentHashMap<>();
    final AtomicInteger loads = new AtomicInteger();

    private String loadFromFile(String key) { loads.incrementAndGet(); return "value-of-" + key; }

    String get(String key) { return cache.computeIfAbsent(key, this::loadFromFile); }

    public static void main(String[] args) throws InterruptedException {
        ConfigCache c = new ConfigCache();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int i = 0; i < 1000; i++) pool.execute(() -> c.get("db.url"));
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println(c.get("db.url") + " loads=" + c.loads.get());   // value-of-db.url loads=1
    }
}`,
      complexity: `<p>O(1) average; one load per key.</p>`,
      followUps: ['Config changes on disk: add reload with an immutable snapshot swap.', 'What if loading can throw? (computeIfAbsent stores nothing; next call retries).']
    }
  });

  practice.push({
    title: 'Race Bug Hunt: The Worker That Never Stops', level: 'Easy', tags: ['visibility', 'volatile', 'interrupt'], companies: ['Oracle', 'Goldman Sachs'],
    statement: `<p>A background <code>Poller</code> loops <code>while (!stopped) { pollOnce(); }</code> with <code>boolean stopped</code>. <code>shutdown()</code> sets <code>stopped = true</code> from the main thread, but in production the poller sometimes keeps running and the JVM never exits. Explain and fix it. Also make shutdown work while the poller is <b>sleeping</b> between polls.</p>`,
    constraints: `<p>Poll interval 1 s; shutdown must complete within ~100 ms.</p>`,
    example: `<p>Broken: JIT hoists the read of <code>stopped</code> out of the loop → ${H.c('r', 'infinite loop')}; or the poller sleeps 1 s before noticing. Fixed: ${H.c('g', 'stops promptly, join() returns')}.</p>`,
    brute: { why: `<p>No happens-before edge between the write in <code>shutdown()</code> and the read in the loop, so the poller may never see it. Even with visibility, <code>Thread.sleep(1000)</code> delays shutdown by up to a second. Busy-polling with a short sleep wastes CPU.</p>`, code: `class PollerBrute implements Runnable {
    private boolean stopped;                 // not volatile: the loop may never see "true"
    public void run() {
        while (!stopped) {
            try { Thread.sleep(1000); } catch (InterruptedException ignored) { }   // swallows interrupt!
        }
    }
    void shutdown() { stopped = true; }
}` },
    mcq: { q: 'What does <code>volatile</code> fix here, and what does it NOT fix?', options: ['It makes the flag visible; it does not wake a sleeping thread — use interrupt for that', 'It makes the loop atomic and wakes sleeping threads', 'It fixes nothing; only synchronized works', 'It prevents the thread from sleeping'], answer: 0, explain: 'volatile guarantees the next read sees the write. Interrupting the thread makes sleep() throw InterruptedException immediately, so shutdown is prompt.' },
    hints: [`<p>Hint 1: Two problems: visibility of the flag, and latency while sleeping.</p>`, `<p>Hint 2: <code>volatile</code> for the flag; <code>Thread.interrupt()</code> to cut the sleep short.</p>`, `<p>Hint 3: In the catch block, restore the interrupt status and exit the loop — never swallow it.</p>`],
    solution: {
      approach: `<p>Declare the flag <code>volatile</code> (visibility), and have <code>shutdown()</code> also <b>interrupt</b> the worker thread so a sleeping/blocked poller wakes immediately. The loop checks both the flag and the interrupt status, and the catch block restores the interrupt and exits. <code>join(timeout)</code> confirms termination.</p>`,
      code: `class Poller implements Runnable {
    private volatile boolean stopped;
    private final AtomicInteger polls = new AtomicInteger();
    private Thread worker;

    public void run() {
        while (!stopped && !Thread.currentThread().isInterrupted()) {
            polls.incrementAndGet();                   // pollOnce()
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();    // restore and leave the loop
            }
        }
    }

    void start() { worker = new Thread(this, "poller"); worker.start(); }

    void shutdown() throws InterruptedException {
        stopped = true;          // visible thanks to volatile
        worker.interrupt();      // wakes it from sleep immediately
        worker.join(2000);
    }

    public static void main(String[] args) throws InterruptedException {
        Poller p = new Poller();
        p.start();
        Thread.sleep(50);
        long t0 = System.nanoTime();
        p.shutdown();
        System.out.println("stopped in ms: " + (System.nanoTime() - t0) / 1_000_000 + ", alive=" + p.worker.isAlive());
    }
}`,
      complexity: `<p>O(1); shutdown latency ≈ time to deliver the interrupt.</p>`,
      followUps: ['Rewrite with ScheduledExecutorService and shutdownNow().', 'Why is catching InterruptedException and ignoring it harmful in libraries?']
    }
  });

  /* ======================= PRACTICE: MEDIUM ======================= */
  practice.push({
    title: 'Fix the ConcurrentModificationException in a Listener Registry', level: 'Medium', tags: ['CopyOnWriteArrayList', 'iteration', 'synchronized collections'], companies: ['Microsoft', 'Salesforce'],
    statement: `<p>An <code>EventBus</code> stores listeners in <code>Collections.synchronizedList(new ArrayList&lt;&gt;())</code>. <code>publish(event)</code> loops over listeners and calls them; listeners may <b>unsubscribe themselves</b> during the callback, and other threads subscribe at any time. Production sees <code>ConcurrentModificationException</code>. Fix it so publish never throws, never blocks subscribers for the duration of slow callbacks, and listeners can unsubscribe inside a callback.</p>`,
    constraints: `<p>~50 listeners, thousands of events/sec, subscribe/unsubscribe a few times per minute.</p>`,
    example: `<p>Listener L2 calls <code>unsubscribe(this)</code> inside <code>onEvent</code>. Broken: ${H.c('r', 'CME on the next iteration')}. Fixed: ${H.c('g', 'the current publish finishes with the old snapshot; L2 gets no further events')}.</p>`,
    brute: { why: `<p>Iterating a synchronized list without holding its lock is unsafe (fail-fast iterator). Wrapping the loop in <code>synchronized (listeners)</code> stops the CME from other threads, but (a) every subscriber waits while all callbacks run, (b) a listener that unsubscribes itself inside the loop still causes CME (same thread modifies during iteration), and (c) a callback that calls into another lock can deadlock.</p>`, code: `class EventBusBrute {
    private final List<Consumer<String>> listeners = Collections.synchronizedList(new ArrayList<>());
    void subscribe(Consumer<String> l) { listeners.add(l); }
    void unsubscribe(Consumer<String> l) { listeners.remove(l); }
    void publish(String e) {
        synchronized (listeners) {                       // blocks subscribers during ALL callbacks
            for (Consumer<String> l : listeners) l.accept(e);   // self-unsubscribe => CME anyway
        }
    }
}` },
    mcq: { q: 'Why is CopyOnWriteArrayList a good fit here but a bad fit for an event <i>log</i> that appends 10k entries/sec?', options: ['Each write copies the whole array: cheap when writes are rare, very expensive when writes are frequent', 'It cannot be iterated', 'It is not thread-safe for writes', 'It loses elements under contention'], answer: 0, explain: 'COW makes reads/iteration lock-free snapshots by paying O(n) per write. Listener lists are read-mostly; logs are write-heavy.' },
    hints: [`<p>Hint 1: Publishing is read-mostly; changes are rare. Iteration should see a stable snapshot.</p>`, `<p>Hint 2: <code>CopyOnWriteArrayList</code> iterators are snapshots that never throw CME, even if the same thread modifies the list.</p>`, `<p>Hint 3: Catch exceptions per listener so one bad listener cannot stop the others.</p>`],
    solution: {
      approach: `<p>Store listeners in a <code>CopyOnWriteArrayList</code>. <code>publish</code> iterates a snapshot without any lock, so slow callbacks never block subscribers, and modifications (including self-unsubscribe) create a new array that the current loop does not see. Each callback is isolated with try/catch.</p>`,
      code: `class EventBus {
    private final List<Consumer<String>> listeners = new CopyOnWriteArrayList<>();
    void subscribe(Consumer<String> l) { listeners.add(l); }
    void unsubscribe(Consumer<String> l) { listeners.remove(l); }

    void publish(String event) {
        for (Consumer<String> l : listeners) {           // snapshot iteration: lock-free, never CME
            try { l.accept(event); }
            catch (RuntimeException ex) { System.out.println("listener failed: " + ex.getMessage()); }
        }
    }

    public static void main(String[] args) {
        EventBus bus = new EventBus();
        List<String> got = new ArrayList<>();
        bus.subscribe(e -> got.add("L1:" + e));
        bus.subscribe(new Consumer<String>() {
            public void accept(String e) { got.add("L2:" + e); bus.unsubscribe(this); }   // one-shot
        });
        bus.publish("a");
        bus.publish("b");
        System.out.println(got);   // [L1:a, L2:a, L1:b]
    }
}`,
      complexity: `<p>publish O(L) lock-free; subscribe/unsubscribe O(L) copy.</p>`,
      followUps: ['Deliver events asynchronously per listener (a queue per listener).', 'Use weak references so forgotten listeners do not leak.']
    }
  });

  practice.push({
    title: 'Two Threads Print Odd and Even Alternately', level: 'Medium', tags: ['Semaphore', 'coordination', 'wait/notify'], companies: ['Amazon', 'Microsoft', 'Walmart'],
    statement: `<p>Thread <b>ODD</b> prints 1, 3, 5, … and thread <b>EVEN</b> prints 2, 4, 6, … Together they must print <b>1 to N in order</b>, strictly alternating, with no busy-waiting. Both threads must terminate.</p>`,
    constraints: `<p>1 ≤ N ≤ 10<sup>5</sup>.</p>`,
    example: `<p>N = 6 → ${H.c('g', 'ODD:1 EVEN:2 ODD:3 EVEN:4 ODD:5 EVEN:6')}.</p>`,
    brute: { why: `<p>Unsynchronized threads print in random order. A spin loop on a shared <code>volatile int turn</code> is correct but burns two CPU cores spinning. A single <code>synchronized</code> + <code>wait/notify</code> works if written carefully (while loops, notifyAll, termination condition) but is easy to get wrong — a forgotten final notify leaves the other thread waiting forever.</p>`, code: `class OddEvenSpin {
    private volatile int next = 1;
    // correct but wastes CPU: each thread spins while it is not its turn
    void run(int n, int parity) {
        while (true) {
            int v = next;
            if (v > n) return;
            if (v % 2 == parity) { System.out.println(v); next = v + 1; }
            else Thread.onSpinWait();
        }
    }
}` },
    mcq: { q: 'With two semaphores <code>odd = new Semaphore(1)</code> and <code>even = new Semaphore(0)</code>, what does ODD do after printing?', options: ['<code>even.release()</code> — hand the turn to EVEN', '<code>odd.release()</code>', '<code>even.acquire()</code>', 'Nothing'], answer: 0, explain: 'Each thread acquires its own semaphore (waits for its turn), prints, then releases the other thread\'s semaphore (passes the baton).' },
    hints: [`<p>Hint 1: Think of a baton passed back and forth: you may print only while holding it.</p>`, `<p>Hint 2: Two semaphores, one per thread. Start with ODD's permit = 1, EVEN's = 0.</p>`, `<p>Hint 3: Loop: acquire mine → print → release the other's. Compute how many numbers each thread prints so both loops end.</p>`],
    solution: {
      approach: `<p><b>Baton passing with two semaphores.</b> ODD starts with the only permit. Each thread waits on its own semaphore, prints its number, and releases the other's semaphore. Each thread prints a fixed count (⌈N/2⌉ odds, ⌊N/2⌋ evens), so both terminate. Waiting threads sleep, no CPU spin.</p>`,
      code: `class OddEvenPrinter {
    private final Semaphore oddTurn = new Semaphore(1), evenTurn = new Semaphore(0);
    private final StringBuffer out = new StringBuffer();     // thread-safe builder for the demo

    void printOdds(int n) throws InterruptedException {
        for (int v = 1; v <= n; v += 2) {
            oddTurn.acquire();
            out.append("ODD:").append(v).append(' ');
            evenTurn.release();
        }
    }
    void printEvens(int n) throws InterruptedException {
        for (int v = 2; v <= n; v += 2) {
            evenTurn.acquire();
            out.append("EVEN:").append(v).append(' ');
            oddTurn.release();
        }
    }

    public static void main(String[] args) throws InterruptedException {
        OddEvenPrinter p = new OddEvenPrinter();
        int n = 7;
        Thread odd = new Thread(() -> { try { p.printOdds(n); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } });
        Thread even = new Thread(() -> { try { p.printEvens(n); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } });
        odd.start(); even.start();
        odd.join(2000); even.join(2000);
        System.out.println(p.out.toString().trim());   // ODD:1 EVEN:2 ... ODD:7
    }
}`,
      complexity: `<p>O(N) total, two context switches per number; no busy waiting.</p>`,
      followUps: ['Three threads printing 1,2,3,1,2,3… (three semaphores in a ring).', 'Same with ReentrantLock + Conditions.']
    }
  });

  practice.push({
    title: 'Race Bug Hunt: Deadlocking Bank Transfers', level: 'Medium', tags: ['deadlock', 'lock ordering', 'invariants'], companies: ['JPMorgan', 'Goldman Sachs', 'Razorpay'],
    statement: `<p>The transfer method does <code>synchronized (from) { synchronized (to) { from.balance -= amt; to.balance += amt; } }</code>. Under load, threads freeze. Explain the deadlock and fix it so that (1) money is never created or lost, (2) transfers between different account pairs run in parallel, (3) no deadlock is possible, (4) overdrafts are rejected.</p>`,
    constraints: `<p>10<sup>5</sup> accounts, 32 threads doing random transfers. Total money must be invariant.</p>`,
    example: `<p>Thread 1: transfer(A → B), Thread 2: transfer(B → A). T1 locks A, T2 locks B, each waits for the other → ${H.c('r', 'deadlock')}. Fixed: both lock min(id) first → ${H.c('g', 'one waits, then proceeds')}.</p>`,
    brute: { why: `<p><b>Nested locks in argument order</b> deadlock whenever two transfers go in opposite directions (circular wait). <b>One global bank lock</b> is deadlock-free and keeps the total invariant, but serializes all 32 threads even for unrelated accounts.</p>`, code: `class BankGlobalLock {
    private final long[] balance;
    BankGlobalLock(int n, long init) { balance = new long[n]; Arrays.fill(balance, init); }
    // correct, deadlock-free, but only ONE transfer in the whole bank at a time
    synchronized boolean transfer(int from, int to, long amt) {
        if (balance[from] < amt) return false;
        balance[from] -= amt; balance[to] += amt;
        return true;
    }
}` },
    mcq: { q: 'Which change alone removes the deadlock?', options: ['Always lock the account with the smaller id first', 'Make balance volatile', 'Use AtomicLong for each balance and no locks', 'Lock "to" before "from"'], answer: 0, explain: 'A global order on lock acquisition makes a cycle in the wait-for graph impossible. Atomics per account would break the two-account invariant (money briefly missing; overdraft checks race).' },
    hints: [`<p>Hint 1: Draw the wait-for graph for A→B and B→A at the same time.</p>`, `<p>Hint 2: Break circular wait with a global order: lock by account id, not by role (from/to).</p>`, `<p>Hint 3: Handle from == to (reject or no-op), check balance inside both locks, and verify with a stress test that the total never changes.</p>`],
    solution: {
      approach: `<p>Each account has its own lock. A transfer locks both accounts in <b>ascending id order</b> regardless of direction, so no cycle can form. The overdraft check and both updates happen while holding both locks, so the "total money" invariant is never visible broken. Transfers on disjoint pairs proceed in parallel.</p>`,
      code: `class Bank {
    static final class Account {
        final int id; long balance; final ReentrantLock lock = new ReentrantLock();
        Account(int id, long b) { this.id = id; this.balance = b; }
    }
    final Account[] accounts;
    Bank(int n, long init) { accounts = new Account[n]; for (int i = 0; i < n; i++) accounts[i] = new Account(i, init); }

    boolean transfer(int from, int to, long amt) {
        if (from == to || amt <= 0) return false;
        Account a = accounts[from], b = accounts[to];
        Account first = a.id < b.id ? a : b, second = a.id < b.id ? b : a;   // GLOBAL ORDER
        first.lock.lock();
        try {
            second.lock.lock();
            try {
                if (a.balance < amt) return false;
                a.balance -= amt;
                b.balance += amt;
                return true;
            } finally { second.lock.unlock(); }
        } finally { first.lock.unlock(); }
    }

    long total() {                                   // lock all in order for a consistent snapshot
        for (Account x : accounts) x.lock.lock();
        try { long s = 0; for (Account x : accounts) s += x.balance; return s; }
        finally { for (int i = accounts.length - 1; i >= 0; i--) accounts[i].lock.unlock(); }
    }

    public static void main(String[] args) throws InterruptedException {
        Bank bank = new Bank(10, 1000);
        ExecutorService pool = Executors.newFixedThreadPool(16);
        for (int i = 0; i < 100_000; i++) {
            pool.execute(() -> {
                ThreadLocalRandom r = ThreadLocalRandom.current();
                bank.transfer(r.nextInt(10), r.nextInt(10), r.nextInt(1, 50));
            });
        }
        pool.shutdown();
        System.out.println("finished=" + pool.awaitTermination(20, TimeUnit.SECONDS) + " total=" + bank.total()); // total=10000
    }
}`,
      complexity: `<p>O(1) per transfer; contention only between transfers sharing an account.</p>`,
      followUps: ['Use tryLock with timeout and retry instead of ordering.', 'Transfers across two databases (sagas / two-phase commit).']
    }
  });

  practice.push({
    title: 'Fixed-Window Quota per API Key', level: 'Medium', tags: ['rate limiter', 'fixed window', 'ConcurrentHashMap.compute'], companies: ['Postman', 'RapidAPI', 'Stripe'],
    statement: `<p>Each API key may make at most <b>L calls per calendar minute</b> (the business explicitly wants resets at :00 for billing). Implement <code>boolean allow(String apiKey, long nowMillis)</code> thread-safely, with O(1) memory per key (no growing map of old minutes), and <code>int used(String apiKey, long nowMillis)</code>.</p>`,
    constraints: `<p>10<sup>5</sup> keys, 64 threads. Exactly L allowed per key per minute even under concurrent calls.</p>`,
    example: `<p>L = 3. Key k1 at 10:00:10 ×4 → ${H.c('g', 'Y Y Y')} ${H.c('r', 'N')}. At 10:01:00 → ${H.c('g', 'Y')} (new window, count reset).</p>`,
    brute: { why: `<p>Brute A: <code>HashMap&lt;String, int[]{window, count}&gt;</code> with "if window changed, reset; if count &lt; L, count++" — three unsynchronized steps; concurrent calls exceed L and two threads can both reset. Brute B: key the map by <code>key + minute</code> — atomic with <code>merge</code> but leaks one entry per key per minute forever.</p>`, code: `class QuotaBrute {
    private final Map<String, long[]> state = new HashMap<>();   // {windowId, count}, unsynchronized
    private final int limit;
    QuotaBrute(int limit) { this.limit = limit; }
    boolean allow(String key, long nowMillis) {
        long w = nowMillis / 60_000;
        long[] s = state.computeIfAbsent(key, k -> new long[]{w, 0});
        if (s[0] != w) { s[0] = w; s[1] = 0; }                 // racy reset
        if (s[1] >= limit) return false;                        // racy check
        s[1]++;                                                 // racy increment
        return true;
    }
}` },
    mcq: { q: 'Why store an <b>immutable</b> record (window, count) and replace it inside <code>compute</code>?', options: ['compute runs atomically per key, and an immutable value means no thread can observe a half-updated pair', 'Records are faster than arrays', 'compute only accepts records', 'It avoids the need for a limit'], answer: 0, explain: 'The window id and count form one invariant. Replacing the whole value under the per-key lock keeps them consistent and safely published.' },
    hints: [`<p>Hint 1: Per key, the state is (windowId, count). Both must update together.</p>`, `<p>Hint 2: <code>ConcurrentHashMap.compute(key, (k, old) -&gt; ...)</code> runs atomically for that key.</p>`, `<p>Hint 3: Inside compute: if old is null or from an older window → new (w, 1); else if count &lt; L → (w, count+1); else keep old and remember "rejected" in a local holder.</p>`],
    solution: {
      approach: `<p>One entry per key holding an immutable <code>Window(id, count)</code>. <code>compute</code> performs the reset-check-increment atomically per key; different keys never contend. The decision is passed out of the lambda via a one-element array (the lambda runs on the calling thread). Memory stays O(keys) because each key's entry is overwritten each minute.</p>`,
      code: `class MinuteQuota {
    record Window(long id, int count) {}
    private final ConcurrentHashMap<String, Window> state = new ConcurrentHashMap<>();
    private final int limit;
    MinuteQuota(int limit) { this.limit = limit; }

    boolean allow(String key, long nowMillis) {
        long w = nowMillis / 60_000;
        boolean[] ok = new boolean[1];
        state.compute(key, (k, old) -> {
            if (old == null || old.id() != w) { ok[0] = true; return new Window(w, 1); }   // new minute
            if (old.count() < limit) { ok[0] = true; return new Window(w, old.count() + 1); }
            return old;                                                                    // rejected
        });
        return ok[0];
    }

    int used(String key, long nowMillis) {
        Window win = state.get(key);
        return (win == null || win.id() != nowMillis / 60_000) ? 0 : win.count();
    }

    public static void main(String[] args) throws InterruptedException {
        MinuteQuota q = new MinuteQuota(100);
        AtomicInteger ok = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(32);
        for (int i = 0; i < 1000; i++) pool.execute(() -> { if (q.allow("k1", 10_000)) ok.incrementAndGet(); });
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("allowed=" + ok.get() + " used=" + q.used("k1", 10_000) + " nextMinute=" + q.allow("k1", 60_000)); // 100 100 true
    }
}`,
      complexity: `<p>O(1) per call; O(keys) memory.</p>`,
      followUps: ['Explain the boundary burst to the product team and offer a sliding counter.', 'Bill overage instead of rejecting (count past L, flag overage).']
    }
  });

  practice.push({
    title: 'Read-Mostly Config Store with Hot Reload', level: 'Medium', tags: ['immutability', 'volatile snapshot', 'ReadWriteLock'], companies: ['Netflix', 'LinkedIn', 'Uber'],
    statement: `<p>A <code>FeatureFlags</code> store is read on every request (<code>isEnabled(flag, userId)</code>, ~10<sup>6</sup>/s) and reloaded every 30 s from a config service by one background thread (<code>reload(Map&lt;String, Integer&gt; rolloutPercents)</code>). Readers must never see a <b>half-applied</b> reload (some flags new, some old), and must never block.</p>`,
    constraints: `<p>~500 flags. Reload replaces the whole set. Reads vastly outnumber writes.</p>`,
    example: `<p>Reload changes "newCheckout" 10% → 50% and "darkMode" 0% → 100% together. A reader must see either ${H.c('b', 'both old')} or ${H.c('g', 'both new')} — never newCheckout=50% with darkMode=0%.</p>`,
    brute: { why: `<p><b>Mutating a shared HashMap in place</b> (clear + putAll): readers see an empty or partial map, and HashMap may corrupt. <b>ReadWriteLock</b>: correct and readers can share, but every one of the million reads/sec still pays lock bookkeeping (a CAS on shared reader count → cache-line contention), and a long reload blocks all readers.</p>`, code: `class FlagsInPlace {
    private final Map<String, Integer> flags = new HashMap<>();
    // BRUTE: readers can see an empty or half-filled map during reload; HashMap is not thread-safe
    void reload(Map<String, Integer> fresh) { flags.clear(); flags.putAll(fresh); }
    boolean isEnabled(String f, long user) { return Math.floorMod(user, 100) < flags.getOrDefault(f, 0); }
}` },
    mcq: { q: 'Why does a <code>volatile</code> reference to an <b>immutable</b> map give atomic reloads?', options: ['Readers read one reference: they get either the old whole map or the new whole map; volatile makes the new map\'s contents visible', 'volatile locks the map during reads', 'Immutable maps are faster to iterate', 'It doesn\'t; you need synchronized'], answer: 0, explain: 'The switch is a single reference write. Build the new map fully, freeze it (Map.copyOf), then publish via the volatile write — happens-before guarantees readers see the fully built contents.' },
    hints: [`<p>Hint 1: Instead of changing the map, build a new one and swap.</p>`, `<p>Hint 2: Hold the current snapshot in a <code>volatile</code> field (or <code>AtomicReference</code>) pointing to an immutable map.</p>`, `<p>Hint 3: Readers copy the reference into a local once per request so all checks in that request use the same snapshot.</p>`],
    solution: {
      approach: `<p><b>Copy-on-write snapshot swap.</b> Reload builds a brand-new immutable map (<code>Map.copyOf</code>) and publishes it with one volatile write. Readers do one volatile read and then plain lookups — no locks, no contention, and always a complete, consistent version. Same idea as CopyOnWriteArrayList, but for a whole config.</p>`,
      code: `class FeatureFlags {
    private volatile Map<String, Integer> snapshot = Map.of();   // immutable, swapped atomically

    void reload(Map<String, Integer> fresh) {
        snapshot = Map.copyOf(fresh);          // build fully, then publish with ONE volatile write
    }

    boolean isEnabled(String flag, long userId) {
        Map<String, Integer> s = snapshot;     // one read; use s for the whole decision
        return Math.floorMod(userId, 100) < s.getOrDefault(flag, 0);
    }

    Map<String, Integer> current() { return snapshot; }

    public static void main(String[] args) throws InterruptedException {
        FeatureFlags ff = new FeatureFlags();
        ff.reload(Map.of("newCheckout", 10, "darkMode", 0));
        AtomicInteger torn = new AtomicInteger();
        Thread reader = new Thread(() -> {
            for (int i = 0; i < 200_000; i++) {
                Map<String, Integer> s = ff.current();
                boolean oldSet = s.get("newCheckout") == 10 && s.get("darkMode") == 0;
                boolean newSet = s.get("newCheckout") == 50 && s.get("darkMode") == 100;
                if (!oldSet && !newSet) torn.incrementAndGet();
            }
        });
        reader.start();
        for (int i = 0; i < 1000; i++) {
            ff.reload(i % 2 == 0 ? Map.of("newCheckout", 50, "darkMode", 100) : Map.of("newCheckout", 10, "darkMode", 0));
        }
        reader.join(5000);
        System.out.println("torn reads: " + torn.get() + ", user 42 newCheckout: " + ff.isEnabled("newCheckout", 42));
    }
}`,
      complexity: `<p>Read O(1) lock-free; reload O(F) to copy F flags.</p>`,
      followUps: ['Two background reloaders racing: use AtomicReference.compareAndSet with a version number.', 'When would a ReadWriteLock be better? (large structure, frequent partial updates).']
    }
  });

  practice.push({
    title: 'Concurrent Web Crawler with a Visited Set', level: 'Medium', tags: ['ConcurrentHashMap.newKeySet', 'ExecutorService', 'termination'], companies: ['Google', 'Anthropic', 'Bloomberg'],
    statement: `<p>Crawl all pages reachable from a start URL that share its host, using a pool of 8 threads (LeetCode 1242 style). The "web" is given as <code>Map&lt;String, List&lt;String&gt;&gt; links</code> (call it like a slow network fetch). Each page must be fetched <b>exactly once</b>, and <code>crawl()</code> must return only when all work is done.</p>`,
    constraints: `<p>Up to 10<sup>4</sup> pages; fetch latency 1–10 ms; 8 worker threads.</p>`,
    example: `<p>Start <code>http://a.com/</code> links to /x and /y; /x links to /y and <code>http://b.com/</code>. Result: ${H.c('g', '{a.com/, a.com/x, a.com/y}')} — /y fetched once even though two pages link to it; b.com skipped (other host).</p>`,
    brute: { why: `<p>Brute A: shared <code>HashSet visited</code> + <code>if (!visited.contains(u)) { visited.add(u); submit(u); }</code> — check-then-act fetches pages twice and HashSet corrupts. Brute B: single-threaded BFS — correct but 8× slower on I/O-bound fetches. Brute C: <code>pool.shutdown()</code> right after submitting the start URL — workers still need to submit children, so they get <code>RejectedExecutionException</code>; or <code>Thread.sleep(5000)</code> "until done" — flaky.</p>`, code: `class CrawlerBrute {
    // correct but single-threaded: every fetch waits for the previous one
    Set<String> crawl(String start, Map<String, List<String>> web) {
        Set<String> seen = new LinkedHashSet<>(List.of(start));
        Deque<String> q = new ArrayDeque<>(List.of(start));
        String host = start.split("/")[2];
        while (!q.isEmpty()) {
            for (String n : web.getOrDefault(q.poll(), List.of()))
                if (n.split("/")[2].equals(host) && seen.add(n)) q.add(n);
        }
        return seen;
    }
}` },
    mcq: { q: 'How do you know the crawl is finished when workers keep discovering new URLs?', options: ['Count pending tasks: increment before each submit, decrement when a task ends; when it reaches 0, signal done', 'Wait until the queue is empty once', 'Call awaitTermination right after the first submit', 'Sleep for a fixed time'], answer: 0, explain: 'A task may be running (about to submit children) while the queue is momentarily empty. A pending counter that is incremented before submit and decremented after the task finishes reaches zero only when no task can create more work.' },
    hints: [`<p>Hint 1: "Exactly once" = an atomic test-and-add on a concurrent set: <code>visited.add(u)</code> returns false if already present.</p>`, `<p>Hint 2: Use <code>ConcurrentHashMap.newKeySet()</code> and an <code>ExecutorService</code>.</p>`, `<p>Hint 3: Track outstanding tasks with an <code>AtomicInteger</code>; the task that brings it to 0 counts down a latch. Then shut the pool down.</p>`],
    solution: {
      approach: `<p><code>visited.add(url)</code> on a concurrent key set is an atomic claim — only the thread that gets <code>true</code> submits the fetch. A <code>pending</code> counter is incremented <b>before</b> each submit and decremented in <code>finally</code> after the task (which may have submitted children first), so it can only hit zero when no work remains; that thread releases a latch, and the main thread shuts the pool down.</p>`,
      code: `class Crawler {
    private final Map<String, List<String>> web;
    Crawler(Map<String, List<String>> web) { this.web = web; }

    private List<String> fetch(String url) {                 // pretend network call
        try { Thread.sleep(2); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        return web.getOrDefault(url, List.of());
    }
    private static String host(String url) { return url.split("/")[2]; }

    Set<String> crawl(String start) throws InterruptedException {
        Set<String> visited = ConcurrentHashMap.newKeySet();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        AtomicInteger pending = new AtomicInteger();
        CountDownLatch done = new CountDownLatch(1);
        String h = host(start);

        class Task implements Runnable {
            final String url;
            Task(String url) { this.url = url; }
            public void run() {
                try {
                    for (String next : fetch(url)) {
                        if (host(next).equals(h) && visited.add(next)) {   // atomic claim
                            pending.incrementAndGet();                     // BEFORE submit
                            pool.execute(new Task(next));
                        }
                    }
                } finally {
                    if (pending.decrementAndGet() == 0) done.countDown();
                }
            }
        }
        visited.add(start);
        pending.incrementAndGet();
        pool.execute(new Task(start));
        done.await(10, TimeUnit.SECONDS);
        pool.shutdown();
        return visited;
    }

    public static void main(String[] args) throws InterruptedException {
        Map<String, List<String>> web = Map.of(
            "http://a.com/", List.of("http://a.com/x", "http://a.com/y"),
            "http://a.com/x", List.of("http://a.com/y", "http://b.com/"),
            "http://a.com/y", List.of("http://a.com/", "http://a.com/z"));
        System.out.println(new TreeSet<>(new Crawler(web).crawl("http://a.com/")));
    }
}`,
      complexity: `<p>O(V + E) fetch work spread over 8 threads; O(V) memory.</p>`,
      followUps: ['Politeness: at most 2 concurrent fetches per host (Semaphore per host).', 'Respect a max depth; persist the frontier for restarts.']
    }
  });

  /* ======================= PRACTICE: HARD ======================= */
  practice.push({
    title: 'Thread-Safe LFU Cache in O(1)', level: 'Hard', tags: ['LFU', 'cache', 'invariants', 'ReentrantLock'], companies: ['Amazon', 'Google', 'Uber', 'Adobe'],
    statement: `<p>Implement <code>LFUCache(capacity)</code> with <code>Integer get(int key)</code> and <code>void put(int key, int value)</code>, both O(1). Evict the least frequently used key; ties go to the least recently used among them. It will be shared by many request threads: it must never exceed capacity and its internal structures must never disagree.</p>`,
    constraints: `<p>capacity ≤ 10<sup>4</sup>; 16 threads; 10<sup>6</sup> ops total.</p>`,
    example: `<p>cap 2: put(1,1), put(2,2), get(1) → 1 (f1=2), put(3,3) evicts ${H.c('r', 'key 2')} (f=1), get(2) → null, get(3) → 3, put(4,4): keys 1 (f=2) and 3 (f=2) tie → evict ${H.c('r', 'key 1')} (used less recently).</p>`,
    brute: { why: `<p><b>Unsynchronized O(1) LFU</b>: three structures (values, freq buckets, minFreq) updated in several steps — concurrent ops leave a key in two buckets, an empty minFreq bucket, or size above capacity (NPE on eviction). <b>Global lock around an O(n) LFU</b> (scan all keys for the minimum frequency on every eviction): correct but each eviction holds the lock for O(n), stalling every thread.</p>`, code: `class LfuScanBrute {
    private final Map<Integer, int[]> m = new HashMap<>();   // key -> {value, freq, lastUsedTick}
    private final int cap; private int tick;
    LfuScanBrute(int cap) { this.cap = cap; }
    synchronized Integer get(int k) {
        int[] e = m.get(k);
        if (e == null) return null;
        e[1]++; e[2] = ++tick;
        return e[0];
    }
    synchronized void put(int k, int v) {
        if (m.containsKey(k)) { int[] e = m.get(k); e[0] = v; e[1]++; e[2] = ++tick; return; }
        if (m.size() == cap) {                                   // O(n) scan while holding the lock
            int victim = -1; int[] best = null;
            for (Map.Entry<Integer, int[]> en : m.entrySet()) {
                int[] e = en.getValue();
                if (best == null || e[1] < best[1] || (e[1] == best[1] && e[2] < best[2])) { best = e; victim = en.getKey(); }
            }
            m.remove(victim);
        }
        m.put(k, new int[]{v, 1, ++tick});
    }
}` },
    mcq: { q: 'After inserting a brand-new key into a full LFU cache, what is minFreq?', options: ['1 — the new key has frequency 1, which is the smallest possible', 'Unchanged', 'The evicted key\'s frequency + 1', '0'], answer: 0, explain: 'Every new key starts at frequency 1, and nothing can be lower, so minFreq resets to 1.' },
    hints: [`<p>Hint 1: Three maps: key → value, key → freq, freq → LinkedHashSet of keys (insertion order = recency within the same freq). Plus an int minFreq.</p>`, `<p>Hint 2: get: move key from bucket f to f+1; if bucket f is now empty and f == minFreq, minFreq++. put new: if full, evict the first key of bucket minFreq; insert with freq 1; minFreq = 1.</p>`, `<p>Hint 3: These are invariants across several fields → wrap each whole operation in one ReentrantLock (get too — it mutates). Stress-test with a consistency check.</p>`],
    solution: {
      approach: `<p>Standard O(1) LFU (value map, freq map, frequency buckets of <code>LinkedHashSet</code>, <code>minFreq</code>) behind <b>one lock</b>, because a single logical operation changes several structures that must agree. Critical sections are tiny (a few hash ops), so one lock sustains millions of ops/sec; stripe by key if that is not enough (approximate LFU per stripe).</p>`,
      code: `class ConcurrentLFUCache {
    private final int capacity;
    private final Map<Integer, Integer> vals = new HashMap<>(), freq = new HashMap<>();
    private final Map<Integer, LinkedHashSet<Integer>> buckets = new HashMap<>();
    private int minFreq;
    private final ReentrantLock lock = new ReentrantLock();

    ConcurrentLFUCache(int capacity) { this.capacity = capacity; }

    Integer get(int key) {
        lock.lock();
        try {
            if (!vals.containsKey(key)) return null;
            touch(key);
            return vals.get(key);
        } finally { lock.unlock(); }
    }

    void put(int key, int value) {
        if (capacity <= 0) return;
        lock.lock();
        try {
            if (vals.containsKey(key)) { vals.put(key, value); touch(key); return; }
            if (vals.size() == capacity) {
                LinkedHashSet<Integer> b = buckets.get(minFreq);
                int victim = b.iterator().next();              // oldest key at the lowest frequency
                b.remove(victim);
                vals.remove(victim); freq.remove(victim);
            }
            vals.put(key, value);
            freq.put(key, 1);
            buckets.computeIfAbsent(1, f -> new LinkedHashSet<>()).add(key);
            minFreq = 1;
        } finally { lock.unlock(); }
    }

    private void touch(int key) {                              // caller holds the lock
        int f = freq.get(key);
        LinkedHashSet<Integer> b = buckets.get(f);
        b.remove(key);
        if (b.isEmpty() && f == minFreq) minFreq++;
        freq.put(key, f + 1);
        buckets.computeIfAbsent(f + 1, x -> new LinkedHashSet<>()).add(key);
    }

    boolean consistent() {
        lock.lock();
        try {
            int inBuckets = 0;
            for (Map.Entry<Integer, LinkedHashSet<Integer>> e : buckets.entrySet())
                for (int k : e.getValue()) { if (freq.get(k) != e.getKey().intValue()) return false; inBuckets++; }
            return inBuckets == vals.size() && vals.size() <= capacity;
        } finally { lock.unlock(); }
    }

    public static void main(String[] args) throws InterruptedException {
        ConcurrentLFUCache c = new ConcurrentLFUCache(2);
        c.put(1, 1); c.put(2, 2); c.get(1); c.put(3, 3);
        System.out.println(c.get(2) + " " + c.get(3));           // null 3
        c.put(4, 4);
        System.out.println(c.get(1) + " " + c.get(3) + " " + c.get(4));   // null 3 4

        ConcurrentLFUCache big = new ConcurrentLFUCache(50);
        ExecutorService pool = Executors.newFixedThreadPool(16);
        for (int t = 0; t < 16; t++) pool.execute(() -> {
            ThreadLocalRandom r = ThreadLocalRandom.current();
            for (int i = 0; i < 20_000; i++) { int k = r.nextInt(200); if (r.nextBoolean()) big.put(k, i); else big.get(k); }
        });
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);
        System.out.println("consistent after stress: " + big.consistent());
    }
}`,
      complexity: `<p>O(1) per op; O(capacity) memory; one short critical section per op.</p>`,
      followUps: ['Add frequency aging (halve all counts every N ops) so old hot keys can leave.', 'Compare with W-TinyLFU (Caffeine): admission filter + sketch.']
    }
  });

  practice.push({
    title: 'Delayed Job Scheduler with Cancellation', level: 'Hard', tags: ['DelayQueue', 'producer-consumer', 'shutdown'], companies: ['Uber', 'Airbnb', 'Atlassian'],
    statement: `<p>Build <code>JobScheduler</code> with <code>long schedule(Runnable job, long delayMillis)</code> (returns a job id), <code>boolean cancel(long id)</code>, and <code>void shutdown()</code>. A fixed pool of worker threads runs each job <b>no earlier than</b> its due time. Many threads schedule and cancel concurrently. A cancelled job must never run (unless it already started). Shutdown must stop the workers promptly; jobs not yet due are dropped.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> pending jobs, 4 workers, delays from 0 ms to hours.</p>`,
    example: `<p>schedule(A, 50), schedule(B, 10), schedule(C, 30), cancel(C) → runs ${H.c('g', 'B then A')}; ${H.c('r', 'C never runs')}.</p>`,
    brute: { why: `<p>Brute A: one <code>new Thread(() -&gt; { sleep(delay); job.run(); })</code> per job — 10<sup>5</sup> sleeping platform threads, and cancel needs an interrupt race. Brute B: a <code>synchronized List</code> scanned by workers every 10 ms for due jobs — O(n) per scan, up to 10 ms late, burns CPU when idle. Brute C: cancellation via <code>list.remove(job)</code> while a worker has already taken it → the job runs anyway, or two workers run the same job.</p>`, code: `class ThreadPerJobScheduler {
    // BRUTE: one sleeping thread per job; 100k jobs = 100k threads
    void schedule(Runnable job, long delayMillis) {
        new Thread(() -> {
            try { Thread.sleep(delayMillis); job.run(); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }).start();
    }
}` },
    mcq: { q: 'How do you make "cancel vs. start" race-free for a job?', options: ['Give each job an AtomicInteger state SCHEDULED → RUNNING/CANCELLED changed by CAS; only the winner of the CAS proceeds', 'Remove it from the queue and hope no worker took it', 'Mark a non-volatile boolean cancelled', 'Synchronize the whole scheduler'], answer: 0, explain: 'The worker CASes SCHEDULED→RUNNING before running; cancel CASes SCHEDULED→CANCELLED. Exactly one succeeds, so a job either runs or is cancelled, never both.' },
    hints: [`<p>Hint 1: A <code>DelayQueue</code> hands out an element only when its delay has expired — workers just <code>take()</code>.</p>`, `<p>Hint 2: Each job object carries an atomic state. Cancel = CAS to CANCELLED (and optionally remove from the queue to free memory).</p>`, `<p>Hint 3: Shutdown: set a flag and interrupt workers (take() throws InterruptedException); join them with a timeout.</p>`],
    solution: {
      approach: `<p>Jobs implement <code>Delayed</code> and sit in a <code>DelayQueue</code> (a priority heap ordered by due time, with leader-follower waiting so only one thread sleeps until the earliest deadline). Workers loop on <code>take()</code>, then CAS the job's state from SCHEDULED to RUNNING; <code>cancel</code> CASes SCHEDULED to CANCELLED. Exactly one wins. A concurrent map from id to job supports cancel by id. Shutdown interrupts workers.</p>`,
      code: `class JobScheduler {
    static final int SCHEDULED = 0, RUNNING = 1, CANCELLED = 2;

    static final class Job implements Delayed {
        final long id, dueNanos; final Runnable task;
        final AtomicInteger state = new AtomicInteger(SCHEDULED);
        Job(long id, long dueNanos, Runnable task) { this.id = id; this.dueNanos = dueNanos; this.task = task; }
        public long getDelay(TimeUnit unit) { return unit.convert(dueNanos - System.nanoTime(), TimeUnit.NANOSECONDS); }
        public int compareTo(Delayed o) { return Long.compare(dueNanos, ((Job) o).dueNanos); }
    }

    private final DelayQueue<Job> queue = new DelayQueue<>();
    private final ConcurrentHashMap<Long, Job> jobs = new ConcurrentHashMap<>();
    private final AtomicLong ids = new AtomicLong();
    private final List<Thread> workers = new ArrayList<>();
    private volatile boolean shut;

    JobScheduler(int nWorkers) {
        for (int i = 0; i < nWorkers; i++) workers.add(new Thread(this::workLoop, "worker-" + i));
    }
    void start() { workers.forEach(Thread::start); }      // start after construction (no "this" escape)

    long schedule(Runnable task, long delayMillis) {
        if (shut) throw new IllegalStateException("scheduler is shut down");
        Job j = new Job(ids.incrementAndGet(), System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(delayMillis), task);
        jobs.put(j.id, j);
        queue.put(j);
        return j.id;
    }

    boolean cancel(long id) {
        Job j = jobs.get(id);
        if (j == null || !j.state.compareAndSet(SCHEDULED, CANCELLED)) return false;   // too late or unknown
        queue.remove(j);          // free memory early; workers would skip it anyway
        jobs.remove(id);
        return true;
    }

    private void workLoop() {
        try {
            while (!shut) {
                Job j = queue.take();                                  // waits until a job is due
                if (!j.state.compareAndSet(SCHEDULED, RUNNING)) continue;   // was cancelled
                jobs.remove(j.id);
                try { j.task.run(); } catch (RuntimeException e) { System.out.println("job " + j.id + " failed: " + e); }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();                        // shutdown path
        }
    }

    void shutdown() throws InterruptedException {
        shut = true;
        workers.forEach(Thread::interrupt);
        for (Thread w : workers) w.join(2000);
    }

    public static void main(String[] args) throws InterruptedException {
        JobScheduler s = new JobScheduler(2);
        s.start();
        List<String> ran = Collections.synchronizedList(new ArrayList<>());
        CountDownLatch twoDone = new CountDownLatch(2);
        s.schedule(() -> { ran.add("A"); twoDone.countDown(); }, 60);
        s.schedule(() -> { ran.add("B"); twoDone.countDown(); }, 10);
        long c = s.schedule(() -> ran.add("C"), 30);
        System.out.println("cancel C: " + s.cancel(c));
        twoDone.await(2, TimeUnit.SECONDS);
        Thread.sleep(50);                          // give a wrongly-uncancelled C time to show up
        s.shutdown();
        System.out.println("ran: " + ran);         // [B, A]
    }
}`,
      complexity: `<p>schedule O(log n), cancel O(n) for <code>queue.remove</code> (or O(1) if you skip removal and let workers discard), take O(log n). Idle workers use no CPU.</p>`,
      followUps: ['Recurring jobs (reschedule after run with the next due time).', 'Persist jobs so a restart does not lose them (outbox table + poller).', 'Compare with ScheduledThreadPoolExecutor and its setRemoveOnCancelPolicy.']
    }
  });

  practice.push({
    title: 'Two-Stage Pipeline with Graceful Shutdown', level: 'Hard', tags: ['producer-consumer', 'poison pill', 'backpressure'], companies: ['Databricks', 'Confluent', 'Bloomberg'],
    statement: `<p>Build a pipeline: a <b>reader</b> thread emits N log lines → <b>stage 1</b> (3 parser threads) parses each line into a record → <b>stage 2</b> (2 writer threads) "writes" records (adds them to a sink). Stages are connected by <b>bounded</b> queues. When the reader finishes, the pipeline must drain completely (every line written exactly once) and <b>all threads must exit</b> — no hangs, no lost items, no sleeps-as-synchronization.</p>`,
    constraints: `<p>N up to 10<sup>6</sup>; queue capacity 100; the number of threads per stage is configurable.</p>`,
    example: `<p>N = 1000 → sink contains ${H.c('g', '1000 records')}, all 6 threads have terminated, <code>run()</code> returns.</p>`,
    brute: { why: `<p>Brute A: unbounded queues + <code>Thread.sleep(1000)</code> then exit — loses items if processing is slow and wastes time when fast. Brute B: reader puts <b>one</b> poison pill into stage 1's queue — one parser exits, the other two block on <code>take()</code> forever; or every parser forwards a pill to stage 2 immediately, so writers stop while other parsers are still producing records → lost records.</p>`, code: `class PipelineBrute {
    static final String POISON = "EOF";
    // BRUTE: only ONE pill for THREE parsers => two parsers block on take() forever; JVM never exits
    static void readerPutsOnePill(BlockingQueue<String> lines, int n) throws InterruptedException {
        for (int i = 0; i < n; i++) lines.put("line-" + i);
        lines.put(POISON);
    }
}` },
    mcq: { q: 'When is it safe to send poison pills to stage 2?', options: ['Only after ALL stage-1 threads have finished (e.g. the last parser to exit sends one pill per writer)', 'As soon as the first parser sees a pill', 'Immediately after the reader finishes', 'Never — writers should be interrupted'], answer: 0, explain: 'Stage 2 must not stop while any parser may still emit records. A countdown of live parsers lets the last one out forward the pills.' },
    hints: [`<p>Hint 1: Each stage needs one pill per thread in that stage, and pills must follow all real items.</p>`, `<p>Hint 2: Track live parsers with an <code>AtomicInteger</code> (or a <code>CountDownLatch</code> plus a coordinator).</p>`, `<p>Hint 3: The parser that decrements the live count to 0 puts W pills into the writer queue. join() everything with timeouts; use bounded <code>ArrayBlockingQueue</code>s for backpressure.</p>`],
    solution: {
      approach: `<p>Bounded queues give backpressure. Shutdown cascades stage by stage: the reader puts <b>P</b> pills (one per parser). Each parser exits on its pill and decrements a live-parser counter; the <b>last</b> parser to exit puts <b>W</b> pills into stage 2 (one per writer). Every real item precedes every pill in FIFO order, so nothing is lost, and every thread consumes exactly one pill, so everyone exits.</p>`,
      code: `class TwoStagePipeline {
    record Rec(int id, String text) {}
    static final String LINE_PILL = new String("EOF");        // unique identity
    static final Rec REC_PILL = new Rec(-1, "EOF");

    static List<Rec> run(int n, int parsers, int writers) throws InterruptedException {
        BlockingQueue<String> lines = new ArrayBlockingQueue<>(100);
        BlockingQueue<Rec> recs = new ArrayBlockingQueue<>(100);
        List<Rec> sink = Collections.synchronizedList(new ArrayList<>());
        AtomicInteger liveParsers = new AtomicInteger(parsers);
        List<Thread> all = new ArrayList<>();

        all.add(new Thread(() -> {                                   // reader
            try {
                for (int i = 0; i < n; i++) lines.put("line-" + i);
                for (int p = 0; p < parsers; p++) lines.put(LINE_PILL);   // one pill per parser
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }, "reader"));

        for (int p = 0; p < parsers; p++) all.add(new Thread(() -> {   // stage 1
            try {
                while (true) {
                    String line = lines.take();
                    if (line == LINE_PILL) break;
                    recs.put(new Rec(Integer.parseInt(line.substring(5)), line.toUpperCase()));
                }
                if (liveParsers.decrementAndGet() == 0)                  // LAST parser out
                    for (int w = 0; w < writers; w++) recs.put(REC_PILL);
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }, "parser-" + p));

        for (int w = 0; w < writers; w++) all.add(new Thread(() -> {   // stage 2
            try {
                while (true) {
                    Rec r = recs.take();
                    if (r == REC_PILL) return;
                    sink.add(r);
                }
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }, "writer-" + w));

        all.forEach(Thread::start);
        for (Thread t : all) t.join(10_000);
        long alive = all.stream().filter(Thread::isAlive).count();
        if (alive > 0) throw new IllegalStateException(alive + " threads still alive");
        return sink;
    }

    public static void main(String[] args) throws InterruptedException {
        List<Rec> out = run(10_000, 3, 2);
        long distinct = out.stream().mapToInt(Rec::id).distinct().count();
        System.out.println("records=" + out.size() + " distinct=" + distinct + " all threads exited");
    }
}`,
      complexity: `<p>O(N) total work; memory bounded by queue capacities (≈200 items in flight).</p>`,
      followUps: ['A parser throws on a bad line: route it to a dead-letter queue instead of killing the thread.', 'Preserve input order in the sink with sequence numbers and a reorder buffer.', 'Rewrite with virtual threads or CompletableFuture stages.']
    }
  });

  practice.push({
    title: 'Hierarchical Rate Limiter: Per-User AND Global', level: 'Hard', tags: ['rate limiter', 'token bucket', 'atomic multi-resource', 'refund'], companies: ['OpenAI', 'Anthropic', 'Stripe', 'Cloudflare'],
    statement: `<p>An AI gateway must enforce <b>two</b> limits on every call: each user ≤ <b>U</b> requests/sec (burst U), and the whole gateway ≤ <b>G</b> requests/sec (burst G) to protect the upstream model provider. Implement <code>boolean allow(String user)</code>. A request is admitted only if <b>both</b> limits have capacity, and a rejected request must not consume <b>either</b> limit. Thread-safe, no global lock across all users.</p>`,
    constraints: `<p>10<sup>5</sup> users, 64 threads, G much smaller than the sum of all users' U.</p>`,
    example: `<p>U = 2, G = 3 (frozen time). asha, asha, asha, bala, chen → ${H.c('g', 'Y Y')} ${H.c('r', 'N')} (asha's bucket empty) ${H.c('g', 'Y')} (bala; global now 0) ${H.c('r', 'N')} (chen: user ok, but global empty — and chen's token is refunded, so chen still has 2).</p>`,
    brute: { why: `<p>Brute A: check user bucket, then global bucket, decrementing each as you go — a request that passes the user check but fails global has <b>already burned</b> a user token (users get punished for global overload). Brute B: lock user bucket then global bucket for every request — correct, but the global bucket lock is held while acquiring user locks (lock nesting + a hot global lock). Brute C: one synchronized <code>allow</code> — every request in the gateway serializes.</p>`, code: `class LeakyHierarchyBrute {
    private final Map<String, Integer> userTokens = new ConcurrentHashMap<>();
    private final AtomicInteger globalTokens = new AtomicInteger(3);
    // BRUTE: takes the user token, then fails on global => the user token is lost; also check-then-act races
    boolean allow(String user) {
        int u = userTokens.getOrDefault(user, 2);
        if (u == 0) return false;
        userTokens.put(user, u - 1);                 // consumed even if global rejects below
        return globalTokens.getAndDecrement() > 0;   // can also drive the counter negative
    }
}` },
    mcq: { q: 'Which ordering keeps "rejected requests consume nothing" without holding two locks at once?', options: ['Take from the user bucket; then try the global bucket; if global fails, refund the user token', 'Take global first and never refund', 'Hold the global lock while checking every user bucket', 'Check both without taking, then take both without checking'], answer: 0, explain: 'Acquire-then-compensate: each bucket operation is individually atomic; on partial failure, undo the part that succeeded. Refund must cap at capacity. The tiny window where the user token is "borrowed" is harmless.' },
    hints: [`<p>Hint 1: Treat each bucket as an independent atomic object with <code>tryAcquire()</code> and <code>refund()</code>.</p>`, `<p>Hint 2: Order: the narrow, low-contention bucket first (user), the hot shared bucket second (global). On global failure, refund the user.</p>`, `<p>Hint 3: Make the global bucket lock-free (CAS on an immutable state) since every request touches it; refund = add a token back, capped at capacity.</p>`],
    solution: {
      approach: `<p>Two levels of token buckets, each individually atomic. Per-user buckets live in a <code>ConcurrentHashMap</code> (contention only within a user). The single global bucket uses a CAS loop on an immutable state record (no lock convoy). <code>allow</code> does <b>acquire-then-compensate</b>: take a user token; try the global; if global fails, refund the user token. Never holds two locks, never leaks capacity on rejection. Refunds are capped at capacity.</p>`,
      code: `class HierarchicalLimiter {
    static final class Bucket {
        private record State(double tokens, long last) {}
        private final AtomicReference<State> st;
        private final double cap, perNano;
        private final LongSupplier clock;
        Bucket(double cap, double perSec, LongSupplier clock) {
            this.cap = cap; this.perNano = perSec / 1e9; this.clock = clock;
            st = new AtomicReference<>(new State(cap, clock.getAsLong()));
        }
        private State refilled(State s) {
            long now = Math.max(clock.getAsLong(), s.last());
            return new State(Math.min(cap, s.tokens() + (now - s.last()) * perNano), now);
        }
        boolean tryAcquire() {
            while (true) {
                State s = st.get(), r = refilled(s);
                if (r.tokens() < 1) return false;
                if (st.compareAndSet(s, new State(r.tokens() - 1, r.last()))) return true;
            }
        }
        void refund() {
            while (true) {
                State s = st.get(), r = refilled(s);
                if (st.compareAndSet(s, new State(Math.min(cap, r.tokens() + 1), r.last()))) return;
            }
        }
        double tokens() { return refilled(st.get()).tokens(); }
    }

    private final ConcurrentHashMap<String, Bucket> users = new ConcurrentHashMap<>();
    private final Bucket global;
    private final double userCap, userRate;
    private final LongSupplier clock;

    HierarchicalLimiter(double userCap, double userRate, double globalCap, double globalRate, LongSupplier clock) {
        this.userCap = userCap; this.userRate = userRate; this.clock = clock;
        this.global = new Bucket(globalCap, globalRate, clock);
    }

    boolean allow(String user) {
        Bucket u = users.computeIfAbsent(user, k -> new Bucket(userCap, userRate, clock));
        if (!u.tryAcquire()) return false;          // user over limit: nothing consumed
        if (global.tryAcquire()) return true;       // both OK
        u.refund();                                 // global full: give the user token back
        return false;
    }

    double userTokens(String user) { Bucket b = users.get(user); return b == null ? userCap : b.tokens(); }

    public static void main(String[] args) throws InterruptedException {
        HierarchicalLimiter h = new HierarchicalLimiter(2, 2, 3, 3, () -> 0L);   // frozen clock
        StringBuilder sb = new StringBuilder();
        for (String u : List.of("asha", "asha", "asha", "bala", "chen")) sb.append(h.allow(u) ? "Y" : "N");
        System.out.println(sb + " chenTokens=" + h.userTokens("chen"));          // YYNYN chenTokens=2.0

        HierarchicalLimiter h2 = new HierarchicalLimiter(5, 5, 50, 50, () -> 0L);
        AtomicInteger ok = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(32);
        for (int i = 0; i < 2000; i++) { String u = "u" + (i % 40); pool.execute(() -> { if (h2.allow(u)) ok.incrementAndGet(); }); }
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("admitted=" + ok.get() + " (global cap 50)");          // 50
    }
}`,
      complexity: `<p>O(1) amortized per request; CAS retries only under contention on the global bucket. Memory O(active users).</p>`,
      followUps: ['Weighted requests (LLM tokens) — tryAcquire(permits)/refund(permits).', 'Fairness: one heavy user can starve others of global capacity — add per-tier global sub-buckets.', 'Distributed: global bucket in Redis, user buckets local with periodic sync.']
    }
  });

  /* ======================= QUIZ ======================= */
  quiz.push(
    { q: 'Two threads each run <code>count++</code> once on a shared <code>int count = 0</code> with no synchronization. Which final values are possible?', options: ['Only 2', '1 or 2', '0, 1 or 2', 'Any value'], answer: 1, explain: 'count++ is READ, ADD, WRITE. If both READ 0 before either WRITEs, both write 1 (lost update). Otherwise 2. It can never be 0 because each thread writes at least once.' },
    { q: 'Which statement about <code>volatile</code> is correct?', options: ['It guarantees visibility and ordering, but not atomicity of compound actions like count++', 'It makes any operation on the field atomic', 'It is the same as synchronized', 'It only matters on multi-socket servers'], answer: 0, explain: 'volatile creates happens-before edges between a write and later reads, so threads see the latest value. A read-modify-write still has a race window between its steps.' },
    { q: 'Code: <code>Map m = Collections.synchronizedMap(new HashMap&lt;&gt;()); if (!m.containsKey(k)) m.put(k, v);</code>. What is wrong?', options: ['Nothing — the map is synchronized', 'Check-then-act across two calls: two threads can both see "absent" and both put', 'synchronizedMap does not allow put', 'containsKey is not synchronized'], answer: 1, explain: 'Each call is atomic, the pair is not. Use putIfAbsent (on CHM) or synchronized (m) { ... } around both calls.' },
    { q: 'You iterate a <code>CopyOnWriteArrayList</code> and another thread adds an element during the loop. What happens?', options: ['ConcurrentModificationException', 'The loop sees a snapshot taken when the iterator was created; no exception', 'The loop includes the new element immediately', 'The add blocks until the loop ends'], answer: 1, explain: 'COW iterators traverse the array that existed at creation. The add creates a new array; the running loop is unaffected.' },
    { q: 'Token bucket with capacity 5 and refill 1 token/s is idle for 60 seconds. How many requests can it admit instantly?', options: ['60', '5', '1', '0'], answer: 1, explain: 'Refill is capped at capacity. Idle time cannot be "banked" beyond the burst size.' },
    { q: 'Sliding window log, limit 3 per 10 s, accepted at t = 1, 2, 3. A request arrives at t = 11. What happens?', options: ['Rejected — 3 requests in the window', 'Allowed — t = 1 slid out (1 ≤ 11 − 10), leaving 2 in the window', 'Allowed only if t = 12', 'Rejected because rejected requests are counted'], answer: 1, explain: 'Evict timestamps ≤ now − W = 1. The deque becomes [2, 3], size 2 &lt; 3, so the request is allowed and 11 is appended.' },
    { q: 'Why is a <code>ReadWriteLock</code> with <code>get()</code> under the read lock wrong for an LRU cache?', options: ['Read locks are slower than write locks', 'LRU get moves the entry to the front — it mutates the list, so concurrent "readers" corrupt it', 'ReadWriteLock cannot be used with HashMap', 'It is fine'], answer: 1, explain: 'A read lock allows many threads in at once. LRU get rewrites linked-list pointers, so it is a write and needs exclusive access (or a design that does not reorder on read).' },
    { q: 'In a hand-written bounded buffer, why <code>while (count == 0) notEmpty.await();</code> instead of <code>if</code>?', options: ['while is faster', 'After waking, the condition may be false again (another consumer got the item, or a spurious wakeup), so it must be re-checked', 'await() requires a loop to compile', 'To avoid holding the lock'], answer: 1, explain: 'A signal means "maybe". Between the signal and reacquiring the lock, state can change, and spurious wakeups are allowed.' },
    { q: 'Thread 1 transfers A→B (locks A then B). Thread 2 transfers B→A (locks B then A). Which fix prevents deadlock while keeping per-account locks?', options: ['Always lock the account with the lower id first', 'Make balances volatile', 'Use a fair ReentrantLock', 'Call Thread.yield() between the two locks'], answer: 0, explain: 'A global acquisition order removes circular wait, one of the four necessary conditions for deadlock. Fairness does not prevent deadlock.' },
    { q: 'A seat booking uses <code>AtomicReference</code> per seat and <code>compareAndSet(null, hold)</code>. Request for seats 3 and 4 gets 3 but fails on 4. What must it do?', options: ['Keep seat 3 and retry 4 forever', 'Roll back seat 3 with compareAndSet(hold, null) so the request is all-or-nothing', 'Throw away the hold object and leave seat 3 held', 'Lock all seats globally'], answer: 1, explain: 'Optimistic multi-resource updates need compensation: undo the partial success, then report failure (or retry with backoff).' },
    { q: 'What does <code>ConcurrentHashMap.computeIfAbsent(k, f)</code> guarantee?', options: ['f runs at most once per absent key, atomically with the insert; other threads for that key wait and get the same value', 'f may run many times but only one value is kept', 'Nothing beyond put', 'It never blocks'], answer: 0, explain: 'It is atomic per key — which is why it is great for "create once" (buckets, adders) but dangerous for slow functions: they run while holding that bin\'s lock.' },
    { q: 'Producers are much faster than consumers and you use <code>new LinkedBlockingQueue&lt;&gt;()</code> with no capacity. What eventually happens?', options: ['Producers block automatically', 'The queue grows without bound until OutOfMemoryError — no backpressure', 'Items are dropped silently', 'Consumers speed up'], answer: 1, explain: 'The default capacity is Integer.MAX_VALUE. Always bound queues in front of slower stages and choose a policy for when they are full.' },
    { q: 'Why does a <code>volatile</code> reference to an <i>immutable</i> config map give readers a consistent view during reloads?', options: ['Readers read one reference and get either the whole old map or the whole new one; the volatile write publishes the fully built map', 'volatile locks the map', 'Immutable maps cannot be read concurrently', 'It does not; you need a ReadWriteLock'], answer: 0, explain: 'Copy-on-write snapshot swap: build privately, publish atomically with a single volatile write, never mutate after publishing.' }
  );

  /* ======================= INTERVIEW ======================= */
  interview.push(
    { q: 'What does it mean for a class to be thread-safe? How do you make one?', level: 'B', a: `<p>A class is thread-safe if it behaves correctly — keeps its invariants and honours its contract — when called from many threads at the same time, <b>without the caller adding synchronization</b>. My process: (1) list the <b>shared mutable state</b>; (2) write down the <b>invariants</b> (e.g. "size ≤ capacity", "map and list contain the same keys"); (3) pick a strategy: avoid sharing (confinement), avoid mutation (immutable objects), or coordinate (one lock per invariant, or atomics/concurrent collections for single-variable state); (4) make sure every read and write of guarded state happens under the same lock, and compound actions (check-then-act, read-modify-write) are atomic; (5) prove it with a stress test.</p>`, followUps: ['What is the difference between thread-safe and immutable?', 'Why prefer a private lock object over synchronized(this)?'] },
    { q: 'Explain race condition, data race and deadlock with one example each.', level: 'B', a: `<p><b>Race condition</b>: the result depends on timing — two ATMs both read balance 1000 and both write 900 (lost update), or two users both see seat 4 free and both book it. <b>Data race</b> (JMM term): two threads access the same variable, at least one writes, with no happens-before ordering — e.g. a non-volatile <code>running</code> flag; the reader may never see the write. Not all race conditions are data races (a check-then-act on a ConcurrentHashMap has no data race but is still a race condition). <b>Deadlock</b>: threads wait for each other forever — T1 holds lock A and waits for B, T2 holds B and waits for A. It needs mutual exclusion, hold-and-wait, no preemption and circular wait; break any one (usually circular wait, via lock ordering).</p>`, followUps: ['How do you detect a deadlock in a running JVM? (jstack / ThreadMXBean.findDeadlockedThreads)', 'What is a livelock?'] },
    { q: 'synchronized vs ReentrantLock vs atomics — when do you use each?', level: 'I', a: `<p><b>synchronized</b>: simplest, block-scoped, auto-released on exceptions; great default. <b>ReentrantLock</b>: same mutual exclusion plus <code>tryLock</code> (with timeout — useful for deadlock avoidance in booking/transfers), <code>lockInterruptibly</code>, optional fairness, and multiple <code>Condition</code>s (notFull/notEmpty in a bounded buffer); must unlock in <code>finally</code>; on Java 21 it also avoids pinning virtual threads when blocking inside. <b>Atomics</b> (<code>AtomicLong</code>, <code>AtomicReference</code>, <code>LongAdder</code>): lock-free updates of a <i>single</i> variable via CAS — counters, ID generators, swapping an immutable snapshot. They cannot protect an invariant spanning several variables unless you bundle them into one immutable object behind one AtomicReference.</p>`, followUps: ['When is LongAdder better than AtomicLong?', 'What is the ABA problem?'] },
    { q: 'Why are Collections.synchronizedMap and Hashtable considered insufficient? What do you use instead?', level: 'I', a: `<p>They make each <i>individual</i> method atomic using one lock on the whole map. Problems: (1) <b>compound actions</b> like check-then-put or get-then-put still race; (2) <b>iteration</b> must be manually synchronized on the map or it may throw ConcurrentModificationException — and holding the lock for the whole loop blocks writers; (3) <b>one lock</b> means all threads queue. <code>ConcurrentHashMap</code> fixes all three: lock-free reads, per-bin locking/CAS for writes, atomic compound methods (<code>putIfAbsent</code>, <code>computeIfAbsent</code>, <code>compute</code>, <code>merge</code>, <code>remove(k,v)</code>, <code>replace(k,old,new)</code>), and weakly consistent iterators that never throw. You must still express compound logic through those methods.</p>`, followUps: ['Why does ConcurrentHashMap forbid null?', 'What can go wrong inside a compute() lambda?'] },
    { q: 'Design a thread-safe rate limiter class. Which algorithm, and how do you make it safe under concurrency?', level: 'I', a: `<p>Clarify the rule: bursts allowed? exact rolling window? per user/IP/API key? one server or many? Default: <b>token bucket</b> per key (capacity = burst, rate = sustained). Structure: <code>ConcurrentHashMap&lt;String, Bucket&gt;</code>; <code>computeIfAbsent</code> creates each bucket exactly once. Each bucket keeps <code>tokens</code> and <code>lastRefill</code>; <code>tryAcquire</code> does lazy refill (elapsed × rate, capped), check, and decrement in <b>one critical section</b> (synchronized method, or a CAS loop on an immutable state record). No timer threads; <code>System.nanoTime</code> with an injectable clock for tests. Evict buckets idle long enough to be full again. For "exactly N per rolling window", use a sliding window log (deque per key under a per-key lock); for huge key counts, sliding window counter. Multi-server: move the atomic step into Redis via a Lua script.</p>`, followUps: ['How would you return Retry-After?', 'What breaks if you use currentTimeMillis?', 'How do you limit tokens-per-minute for LLM calls?'] },
    { q: 'Compare fixed window, sliding window log and sliding window counter.', level: 'I', a: `<p><b>Fixed window</b>: one counter per key per window; O(1), but a client can send N at the end of one window and N at the start of the next (2N in a short span). <b>Sliding window log</b>: store timestamps of accepted requests; evict those older than W, allow if fewer than N remain. Exact, but O(N) memory per key. <b>Sliding window counter</b>: keep previous and current window counts; estimate = prev × (1 − elapsed/W) + curr. O(1) memory, close to exact, assumes the previous window was uniform. All three need the per-key update to be atomic (CHM.compute or a per-key lock). Rejected requests must not be recorded in the log, or retrying clients stay blocked forever.</p>`, followUps: ['Which would you choose for OTP sends? For a public API at internet scale?', 'How does the sliding counter behave after an idle gap of two windows?'] },
    { q: 'Implement producer-consumer. What can go wrong with wait/notify?', level: 'I', a: `<p>Prefer <code>ArrayBlockingQueue</code>: producers <code>put</code> (block when full — backpressure), consumers <code>take</code> (block when empty). Shut down with one <b>poison pill per consumer</b> after all producers finish, or by interrupting consumers. By hand: one lock, two conditions (notFull, notEmpty), circular array; <b>wait in a while loop</b>, signal the opposite condition after each change, unlock in finally. Classic wait/notify bugs: (1) <code>if</code> instead of <code>while</code> → acting on a stale condition or spurious wakeup; (2) <code>notify()</code> on a shared monitor wakes the wrong kind of thread → everyone sleeps (lost wakeup) — use notifyAll; (3) calling wait/notify without holding the monitor → IllegalMonitorStateException; (4) swallowing InterruptedException → threads cannot be stopped.</p>`, followUps: ['Why does LinkedBlockingQueue use two locks?', 'How do you choose the queue capacity?'] },
    { q: 'How do you build a thread-safe LRU cache, and how would you scale it?', level: 'A', a: `<p>Core: <code>HashMap&lt;K, Node&gt;</code> + doubly linked list with sentinels; get moves the node to the head, put inserts at head and evicts the tail when over capacity. Concurrency: <b>get is a write</b> (it relinks), so every operation takes an exclusive lock — a ReadWriteLock with get under the read lock corrupts the list. Keep the critical section tiny: no I/O, no loading inside the lock; load outside with single-flight per key (in-flight <code>CompletableFuture</code> map) to avoid stampedes. Scaling: (1) <b>striping</b> — N independent LRUs chosen by key hash, ~N× throughput, approximate global LRU; (2) <b>CLOCK</b> — set a referenced bit on read instead of relinking; (3) <b>Caffeine</b> — ConcurrentHashMap for data, lossy ring buffers record reads, a maintenance task replays them under a lock, W-TinyLFU for hit rate. In production I would use Caffeine and explain the hand-rolled version in the interview.</p>`, followUps: ['How would you add TTL?', 'What is a cache stampede and how do you prevent it?'] },
    { q: 'Design LFU with O(1) operations. What changes when it must be thread-safe?', level: 'A', a: `<p>Structures: key → value, key → freq, freq → LinkedHashSet of keys (insertion order breaks ties by recency), and <code>minFreq</code>. get: move key from bucket f to f+1; if bucket f became empty and f == minFreq, increment minFreq. put existing: update value and touch. put new: if full, evict the first key in bucket minFreq; insert with freq 1; minFreq = 1. Thread safety: one logical operation changes up to four structures that must agree — an invariant across fields — so the whole operation runs under one lock (get included). Atomics per structure would not help. For scale: stripe by key (LFU per stripe), or switch to TinyLFU with a probabilistic frequency sketch and periodic aging so old popularity decays.</p>`, followUps: ['Why does pure LFU need aging?', 'How would you verify consistency in a stress test?'] },
    { q: 'Design concurrent seat booking for a movie theater (BookMyShow).', level: 'A', a: `<p>Requirements: no double booking, all-or-nothing multi-seat requests, holds that expire during payment, high concurrency on hot shows, no deadlocks. Model: <code>Show</code> → seats with state AVAILABLE / HELD(user, expiresAt) / BOOKED. Options: (1) lock per show (simple, often enough); (2) lock per seat, <b>acquired in sorted seat-id order</b> with <code>tryLock(timeout)</code>, check all then mark all; (3) optimistic <code>AtomicReferenceArray</code> per seat — CAS AVAILABLE→HELD in sorted order, roll back on any failure, so no locks and no deadlocks. Expiry is lazy: an expired hold counts as free in the CAS precondition. Confirm after payment re-checks ownership and expiry atomically. With multiple app servers the database is the arbiter: conditional UPDATE ... WHERE status='FREE' (rows affected tells you who won), SELECT ... FOR UPDATE ordered by id, or a unique constraint on (show, seat).</p>`, followUps: ['How do you handle a payment callback that arrives after the hold expired?', 'What is ABA and does it affect the CAS design?', 'How would you run a virtual waiting room for a hyped release?'] },
    { q: 'How do you prevent deadlocks in an LLD design, and how do you detect them?', level: 'A', a: `<p>Prevention: (1) <b>global lock ordering</b> — whenever an operation needs several locks, acquire them in a fixed order (by id); (2) <b>tryLock with timeout</b> and back off (release everything, retry with jitter); (3) <b>hold one lock at a time</b> where possible (bookAny tries rooms sequentially); (4) never call unknown code (listeners, callbacks, loaders) while holding a lock — copy what you need, release, then call; (5) prefer lock-free designs (CAS + rollback) or message passing (single-threaded owner + queue). Detection: thread dumps (<code>jstack</code>, <code>jcmd Thread.print</code>) report "Found one Java-level deadlock"; <code>ThreadMXBean.findDeadlockedThreads()</code> programmatically; JFR events for long monitor waits.</p>`, followUps: ['Can CAS-based code deadlock? Livelock?', 'Why is calling a listener inside synchronized risky?'] },
    { q: 'What changes with virtual threads (Java 21+) for these designs?', level: 'E', a: `<p>Virtual threads make blocking cheap: thousands of threads can block on <code>take()</code>, locks or I/O without exhausting OS threads, so "thread per request" and simple blocking producer-consumer code scale again. What does <b>not</b> change: races, invariants, deadlocks and the need for bounded queues and rate limiters — in fact more concurrency means races show up more often. Caveats: in Java 21, blocking while holding a <code>synchronized</code> monitor pins the carrier thread (JDK 24's JEP 491 removed most pinning), so prefer <code>ReentrantLock</code> around blocking calls if you run on 21; <code>ThreadLocal</code> caches multiply per virtual thread (consider scoped values); do not pool virtual threads — limit concurrency to a downstream with a <code>Semaphore</code> instead.</p>`, followUps: ['How would you cap concurrent calls to an LLM provider from virtual threads?', 'Does a virtual thread make synchronized slower?'] },
    { q: 'How would you test concurrent code so that races are actually caught?', level: 'E', a: `<p>(1) <b>Stress tests</b> with a start latch so threads collide, many iterations, then assert invariants (total money constant, size ≤ capacity, exactly one winner, list/map consistent). (2) <b>Deterministic tests</b> with an injected clock instead of sleeping (rate limiters, holds). (3) <b>jcstress</b> (OpenJDK harness) for low-level visibility/atomicity questions — it explores interleavings and reports forbidden outcomes. (4) Tools: thread dumps for hangs, JFR for lock contention, static analysis (Error Prone <code>@GuardedBy</code>, SpotBugs) for unguarded access. (5) Model checking for tricky protocols (TLA+, or Lincheck on the JVM for linearizability). And always bound joins/awaits in tests so a bug produces a failure, not a hung CI job.</p>`, followUps: ['What is linearizability?', 'Why can a passing stress test still hide a race?'] }
  );

  registerModule({
    id: 'lld10',
    title: 'Concurrency in LLD',
    intro: `<p>Every machine-coding round eventually asks the same follow-up: <b>"Now what happens when 1,000 users hit this at the same time?"</b> This module teaches you to answer it with working Java. Each topic is a design you will be asked to build: a <b>thread-safe class</b>, the right <b>concurrent collection</b>, a <b>rate limiter</b> (token bucket and sliding windows), a <b>producer-consumer</b> pipeline, a <b>thread-safe LRU/LFU cache</b>, and <b>concurrent booking</b> that never double-books or deadlocks.</p>
<p>Every topic follows the same path. First the brute force: no locks at all (fast and wrong), or one global lock around everything (correct and slow). Then you <b>watch the race happen</b>, step by step, in a visualizer. Then you narrow the lock down to the smallest correct unit: one per key, one per seat, a single atomic call, or no lock at all with CAS or immutable snapshots. All the code uses <code>java.util.concurrent</code>, compiles on Java 21, and finishes when you run it.</p>`,
    goals: [
      'Spot the three race shapes (read-modify-write, check-then-act, visibility) in any class and fix each with the smallest correct tool',
      'Choose between synchronized wrappers, ConcurrentHashMap atomic methods, CopyOnWriteArrayList and immutable snapshots based on the read/write pattern',
      'Implement thread-safe token bucket, sliding window log and sliding window counter rate limiters with per-key locking and an injectable clock',
      'Build producer-consumer systems with bounded BlockingQueues or Lock + Conditions, including backpressure and clean poison-pill shutdown',
      'Write thread-safe LRU and LFU caches, explain why LRU get needs an exclusive lock, and prevent cache stampedes with single-flight loading',
      'Design concurrent booking (seats, rooms, stock) that is all-or-nothing, never double-books, and is deadlock-free via lock ordering or CAS with rollback'
    ],
    prereqs: `<p><b>Java 11 (Concurrency I: Threads &amp; the JMM)</b> and <b>Java 12 (Concurrency II: java.util.concurrent)</b> for threads, locks and executors; <b>Java 10 (Collections Internals)</b> for HashMap/LinkedHashMap; <b>LLD 7–8</b> (Parking Lot, BookMyShow case studies) for class modelling. You should already be comfortable writing an LRU cache single-threaded (DSA hashing + linked lists).</p>`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
