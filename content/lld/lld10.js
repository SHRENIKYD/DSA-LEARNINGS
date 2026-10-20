(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- tiny helpers shared by all visualizers ---------- */
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function TXT(html, label) { var p = { type: 'text', html: html }; if (label) p.label = label; return p; }
  function VARS(label, vals, hl) { return { type: 'vars', label: label, vals: clone(vals), hl: hl || {} }; }
  function CODE(label, code, hl, alt) { var p = { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; if (alt) p.alt = alt; return p; }
  var COUNT_PY = [
    "reg = count    # READ",
    "reg = reg + 1  # ADD",
    "count = reg    # WRITE"
  ].join('\n');
  var COUNT_TS = [
    "let reg = count;   // READ",
    "reg = reg + 1;     // ADD",
    "count = reg;       // WRITE"
  ].join('\n');
  var COUNT_CPP = [
    "int reg = count;   // READ",
    "reg = reg + 1;     // ADD",
    "count = reg;       // WRITE"
  ].join('\n');
  var COUNT_ALT = { python: { code: COUNT_PY, map: {} }, js: { lang: 'ts', code: COUNT_TS, map: {} }, cpp: { code: COUNT_CPP, map: {} } };
  var COUNTL_PY = [
    "with lock:            # only one thread inside",
    "    reg = count       # READ",
    "    reg = reg + 1     # ADD",
    "    count = reg       # WRITE"
  ].join('\n');
  var COUNTL_TS = [
    "await mutex.runExclusive(async () => {   // only one thread inside",
    "  let reg = count;      // READ",
    "  reg = reg + 1;        // ADD",
    "  count = reg;          // WRITE",
    "});"
  ].join('\n');
  var COUNTL_CPP = [
    "{ lock_guard<mutex> g(m);   // only one thread inside",
    "  int reg = count;      // READ",
    "  reg = reg + 1;        // ADD",
    "  count = reg;          // WRITE",
    "}"
  ].join('\n');
  var COUNTL_ALT = { python: { code: COUNTL_PY, map: {} }, js: { lang: 'ts', code: COUNTL_TS, map: {} }, cpp: { code: COUNTL_CPP, map: {} } };
  var REGA_PY = [
    "prev = users.setdefault(name, me)   # ONE atomic call",
    "return prev is me   # True = I own it"
  ].join('\n');
  var REGA_TS = [
    "const owned = !users.has(name) && (users.set(name, me), true);   // ONE step, no await between",
    "return owned;   // true = I own it"
  ].join('\n');
  var REGA_CPP = [
    "auto [it, inserted] = users.try_emplace(name, me);   // ONE atomic call (under the lock)",
    "return inserted;   // true = I own it"
  ].join('\n');
  var REGA_ALT = { python: { code: REGA_PY, map: {} }, js: { lang: 'ts', code: REGA_TS, map: {} }, cpp: { code: REGA_CPP, map: {} } };
  var REGP_PY = [
    "if name not in users:     # CHECK (lock held only inside this call)",
    "    users[name] = me      # ACT   (lock taken again)",
    "    return True",
    "return False"
  ].join('\n');
  var REGP_TS = [
    "if (!users.has(name)) {   // CHECK (lock held only inside this call)",
    "    users.set(name, me);  // ACT   (lock taken again)",
    "    return true;",
    "}",
    "return false;"
  ].join('\n');
  var REGP_CPP = [
    "if (!users.count(name)) {   // CHECK (lock held only inside this call)",
    "    users[name] = me;     // ACT   (lock taken again)",
    "    return true;",
    "}",
    "return false;"
  ].join('\n');
  var REGP_ALT = { python: { code: REGP_PY, map: {"5":4} }, js: { lang: 'ts', code: REGP_TS, map: {} }, cpp: { code: REGP_CPP, map: {} } };
  var Q_PY = [
    "def put(x):",
    "    with lock: not_full.wait_for(lambda: not full()); enqueue(x); not_empty.notify()",
    "def take():",
    "    with lock: not_empty.wait_for(lambda: not empty()); x = dequeue(); not_full.notify(); return x"
  ].join('\n');
  var Q_TS = [
    "async put(x) { await lock.acquire(); while (full) await notFull.wait(); enqueue(x); notEmpty.signal(); lock.release(); }",
    "async take() { await lock.acquire(); while (empty) await notEmpty.wait(); const x = dequeue(); notFull.signal(); lock.release(); return x; }"
  ].join('\n');
  var Q_CPP = [
    "void put(x) { unique_lock lk(m); notFull.wait(lk, [&] { return !full(); });  enqueue(x); notEmpty.notify_one(); }",
    "int take()  { unique_lock lk(m); notEmpty.wait(lk, [&] { return !empty(); }); x = dequeue(); notFull.notify_one(); return x; }"
  ].join('\n');
  var Q_ALT = { python: { code: Q_PY, map: {"1":2,"2":4} }, js: { lang: 'ts', code: Q_TS, map: {} }, cpp: { code: Q_CPP, map: {} } };
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
}`, alt: [
          { lang: 'python', code: `import threading
from abc import ABC, abstractmethod


class Counter(ABC):
    @abstractmethod
    def increment(self) -> None: ...

    @abstractmethod
    def get(self) -> int: ...


class UnsafeCounter(Counter):                       # BRUTE FORCE: no coordination at all
    def __init__(self) -> None:
        self._count = 0

    def increment(self) -> None:
        self._count += 1                            # LOAD, ADD, STORE: the GIL can switch threads in between (rare, never impossible)

    def get(self) -> int:
        return self._count


class SyncCounter(Counter):                         # monitor pattern: a private lock guards _count
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._count = 0                             # guarded by _lock

    def increment(self) -> None:
        with self._lock:
            self._count += 1

    def get(self) -> int:
        with self._lock:
            return self._count


class AdderCounter(Counter):                        # best for write-heavy stats: one cell per thread, summed on read
    def __init__(self) -> None:
        self._local = threading.local()
        self._cells: list[list[int]] = []
        self._register = threading.Lock()           # taken once per thread, not once per increment

    def increment(self) -> None:
        cell = getattr(self._local, "cell", None)
        if cell is None:
            cell = self._local.cell = [0]
            with self._register:
                self._cells.append(cell)
        cell[0] += 1                                # only this thread ever writes this cell

    def get(self) -> int:
        with self._register:
            return sum(c[0] for c in self._cells)


def hammer(c: Counter, threads: int, per_thread: int) -> int:
    start = threading.Event()                       # release all threads at the same moment

    def work() -> None:
        start.wait()
        for _ in range(per_thread):
            c.increment()

    ts = [threading.Thread(target=work) for _ in range(threads)]
    for t in ts:
        t.start()
    start.set()
    for t in ts:
        t.join()                                    # join = wait for them AND see their writes
    return c.get()


if __name__ == "__main__":
    threads, per = 4, 100_000
    for c in (UnsafeCounter(), SyncCounter(), AdderCounter()):
        got = hammer(c, threads, per)
        verdict = "OK" if got == threads * per else "LOST UPDATES"
        print(f"{type(c).__name__:<14} expected={threads * per} got={got} {verdict}")` },
          { lang: 'ts', code: `// JavaScript has no threads that share variables, so a lost update needs an await between read and write.
// Mutex: lock() resolves with an unlock function once every earlier holder is done.
class Mutex {
  private tail: Promise<void> = Promise.resolve();

  lock(): Promise<() => void> {
    let release!: () => void;
    const mine = new Promise<void>((resolve) => (release = resolve));
    const previous = this.tail;
    this.tail = previous.then(() => mine);
    return previous.then(() => release);
  }
}

interface Counter {
  increment(worker: number): Promise<void>;
  get(): number;
}

class UnsafeCounter implements Counter {           // BRUTE FORCE: no coordination at all
  private count = 0;
  async increment(): Promise<void> {
    const seen = this.count;                       // READ
    await Promise.resolve();                       // another task runs here ...
    this.count = seen + 1;                         // ... WRITE a stale value
  }
  get(): number {
    return this.count;
  }
}

class SyncCounter implements Counter {             // a mutex makes read-await-write one critical section
  private readonly mutex = new Mutex();
  private count = 0;
  async increment(): Promise<void> {
    const unlock = await this.mutex.lock();
    try {
      const seen = this.count;
      await Promise.resolve();
      this.count = seen + 1;
    } finally {
      unlock();
    }
  }
  get(): number {
    return this.count;
  }
}

class AtomicCounter implements Counter {           // Atomics works on shared memory (needed once Workers are involved)
  private readonly cell = new Int32Array(new SharedArrayBuffer(4));
  async increment(): Promise<void> {
    Atomics.add(this.cell, 0, 1);
  }
  get(): number {
    return Atomics.load(this.cell, 0);
  }
}

class AdderCounter implements Counter {            // striped cells: each worker owns one, summed on read
  private readonly cells: number[];
  constructor(stripes: number) {
    this.cells = new Array<number>(stripes).fill(0);
  }
  async increment(worker: number): Promise<void> {
    this.cells[worker % this.cells.length]++;
  }
  get(): number {
    return this.cells.reduce((a, b) => a + b, 0);
  }
}

async function hammer(c: Counter, workers: number, perWorker: number): Promise<number> {
  await Promise.all(
    Array.from({ length: workers }, async (_, id) => {
      for (let k = 0; k < perWorker; k++) await c.increment(id);
    }),
  );
  return c.get();
}

async function main(): Promise<void> {
  const workers = 4;
  const per = 100_000;
  const all: Counter[] = [new UnsafeCounter(), new SyncCounter(), new AtomicCounter(), new AdderCounter(workers)];
  for (const c of all) {
    const got = await hammer(c, workers, per);
    const verdict = got === workers * per ? "OK" : "LOST UPDATES";
    console.log(c.constructor.name.padEnd(14) + " expected=" + workers * per + " got=" + got + " " + verdict);
  }
}

main();` },
          { lang: 'cpp', code: `class Counter {
public:
    virtual ~Counter() = default;
    virtual void increment() = 0;
    virtual long long get() = 0;
};

class UnsafeCounter : public Counter {              // BRUTE FORCE: a data race, which is undefined behaviour in C++
    long long count_ = 0;
public:
    void increment() override { count_++; }         // LOAD, ADD, STORE: not atomic
    long long get() override { return count_; }
};

class SyncCounter : public Counter {                // monitor pattern: a private mutex guards count_
    mutex mu_;
    long long count_ = 0;                           // guarded by mu_
public:
    void increment() override { lock_guard lk(mu_); count_++; }
    long long get() override { lock_guard lk(mu_); return count_; }
};

class AtomicCounter : public Counter {              // lock-free: one atomic read-modify-write
    atomic<long long> count_{0};
public:
    void increment() override { count_.fetch_add(1, memory_order_relaxed); }
    long long get() override { return count_.load(); }
};

class AdderCounter : public Counter {               // striped cells: threads spread over separate cache lines
    struct alignas(64) Cell { atomic<long long> v{0}; };
    array<Cell, 8> cells_;
public:
    void increment() override {
        size_t i = hash<thread::id>{}(this_thread::get_id()) % cells_.size();
        cells_[i].v.fetch_add(1, memory_order_relaxed);
    }
    long long get() override {
        long long sum = 0;
        for (auto& c : cells_) sum += c.v.load();
        return sum;
    }
};

long long hammer(Counter& c, int threads, int perThread) {
    latch start(1);                                 // release all threads at the same moment
    {
        vector<jthread> ts;                         // jthread joins in its destructor
        for (int i = 0; i < threads; i++)
            ts.emplace_back([&] {
                start.wait();
                for (int k = 0; k < perThread; k++) c.increment();
            });
        start.count_down();
    }
    return c.get();
}

int main() {
    int threads = 4, per = 100000;
    vector<pair<string, unique_ptr<Counter>>> all;
    all.emplace_back("UnsafeCounter", make_unique<UnsafeCounter>());
    all.emplace_back("SyncCounter", make_unique<SyncCounter>());
    all.emplace_back("AtomicCounter", make_unique<AtomicCounter>());
    all.emplace_back("AdderCounter", make_unique<AdderCounter>());
    for (auto& [name, c] : all) {
        long long got = hammer(*c, threads, per);
        cout << left << setw(14) << name << " expected=" << static_cast<long long>(threads) * per << " got=" << got << " "
             << (got == static_cast<long long>(threads) * per ? "OK" : "LOST UPDATES") << "\\n";
    }
}` }
        ] }, { lang: 'java', title: 'The three cures in code: lock an invariant, go immutable, confine to a thread', code: `// CURE 3 (coordinate): an invariant spanning TWO fields (lower <= upper).
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
}`, alt: [
          { lang: 'python', code: `import threading
from dataclasses import dataclass
from io import StringIO


# CURE 3 (coordinate): an invariant spanning TWO fields (lower <= upper).
# Two separate counters could NOT protect it - check and act must happen under ONE lock.
class NumberRange:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._lower, self._upper = 0, 10             # both guarded by _lock

    def set_lower(self, v: int) -> None:
        with self._lock:
            if v > self._upper:
                raise ValueError("lower > upper")
            self._lower = v

    def set_upper(self, v: int) -> None:
        with self._lock:
            if v < self._lower:
                raise ValueError("upper < lower")
            self._upper = v

    def contains(self, x: int) -> bool:
        with self._lock:
            return self._lower <= x <= self._upper


# CURE 2 (don't mutate): immutable value object. Share it with 1000 threads, no lock needed.
@dataclass(frozen=True)
class Money:
    paise: int
    currency: str

    def __post_init__(self) -> None:
        if self.paise < 0:
            raise ValueError("negative amount")

    def plus(self, o: "Money") -> "Money":
        if self.currency != o.currency:
            raise ValueError("currency mismatch")
        return Money(self.paise + o.paise, self.currency)   # a NEW object; this one never changes

    def __str__(self) -> str:
        return f"Money[paise={self.paise}, currency={self.currency}]"


# CURE 1 (don't share): each thread gets its own copy of a non-thread-safe helper.
_local = threading.local()


def label(user: str, n: int) -> str:
    buf = getattr(_local, "buf", None)
    if buf is None:
        buf = _local.buf = StringIO()               # this thread's private builder
    buf.seek(0)
    buf.truncate()
    buf.write(f"{user}#{n}")
    return buf.getvalue()


if __name__ == "__main__":
    r = NumberRange()
    r.set_upper(20)
    print(str(r.contains(15)).lower())                          # true
    print(Money(500, "INR").plus(Money(250, "INR")))            # Money[paise=750, currency=INR]
    print(label("asha", 7))                                     # asha#7` },
          { lang: 'ts', code: `// CURE 3 (coordinate): an invariant spanning TWO fields (lower <= upper).
// Every method is synchronous, so the check and the update cannot be split by another task.
// (If a method awaited between them, you would need a mutex again.)
class NumberRange {
  private lower = 0;
  private upper = 10;

  setLower(v: number): void {
    if (v > this.upper) throw new Error("lower > upper");
    this.lower = v;
  }

  setUpper(v: number): void {
    if (v < this.lower) throw new Error("upper < lower");
    this.upper = v;
  }

  contains(x: number): boolean {
    return this.lower <= x && x <= this.upper;
  }
}

// CURE 2 (don't mutate): immutable value object. Share it freely.
class Money {
  constructor(readonly paise: number, readonly currency: string) {
    if (paise < 0) throw new Error("negative amount");
    Object.freeze(this); // readonly is compile-time only; freeze enforces it at run time
  }

  plus(o: Money): Money {
    if (this.currency !== o.currency) throw new Error("currency mismatch");
    return new Money(this.paise + o.paise, this.currency); // a NEW object; this one never changes
  }

  toString(): string {
    return "Money[paise=" + this.paise + ", currency=" + this.currency + "]";
  }
}

// CURE 1 (don't share): a local builder belongs to one call, so tasks never share it.
// (For per-request context that must follow a chain of awaits, Node has AsyncLocalStorage.)
function label(user: string, n: number): string {
  const parts: string[] = [];
  parts.push(user, "#", String(n));
  return parts.join("");
}

const r = new NumberRange();
r.setUpper(20);
console.log(r.contains(15)); // true
console.log(String(new Money(500, "INR").plus(new Money(250, "INR")))); // Money[paise=750, currency=INR]
console.log(label("asha", 7)); // asha#7` },
          { lang: 'cpp', code: `// CURE 3 (coordinate): an invariant spanning TWO fields (lower <= upper).
// Two separate atomics could NOT protect it - check and act must happen under ONE lock.
class NumberRange {
    mutex mu_;
    int lower_ = 0, upper_ = 10;                   // both guarded by mu_

public:
    void setLower(int v) {
        lock_guard lk(mu_);
        if (v > upper_) throw invalid_argument("lower > upper");
        lower_ = v;
    }
    void setUpper(int v) {
        lock_guard lk(mu_);
        if (v < lower_) throw invalid_argument("upper < lower");
        upper_ = v;
    }
    bool contains(int x) {
        lock_guard lk(mu_);
        return lower_ <= x && x <= upper_;
    }
};

// CURE 2 (don't mutate): immutable value object. const members: no setter can even be written.
class Money {
    const long long paise_;
    const string currency_;

public:
    Money(long long paise, string currency) : paise_(paise), currency_(std::move(currency)) {
        if (paise_ < 0) throw invalid_argument("negative amount");
    }
    Money plus(const Money& o) const {
        if (currency_ != o.currency_) throw invalid_argument("currency mismatch");
        return Money(paise_ + o.paise_, currency_);    // a NEW object; this one never changes
    }
    string str() const { return "Money[paise=" + to_string(paise_) + ", currency=" + currency_ + "]"; }
};

// CURE 1 (don't share): each thread gets its own copy of a non-thread-safe helper.
string label(const string& user, int n) {
    thread_local string buf;                       // this thread's private builder
    buf.clear();
    buf += user;
    buf += '#';
    buf += to_string(n);
    return buf;
}

int main() {
    NumberRange r;
    r.setUpper(20);
    cout << boolalpha << r.contains(15) << "\\n";                          // true
    cout << Money(500, "INR").plus(Money(250, "INR")).str() << "\\n";      // Money[paise=750, currency=INR]
    cout << label("asha", 7) << "\\n";                                     // asha#7
}` }
        ] }],
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
            CODE('Code each thread runs', src, codeHl.code || {}, lock ? COUNTL_ALT : COUNT_ALT)
          ]));
        }
        snapshot('Shared <b>count = 0</b>. Thread A and Thread B each want to add 1 (' + expected + ' increment' + (expected > 1 ? 's' : '') + ' total, so the right answer is <b>' + expected + '</b>). ' + (lock ? 'This time every increment is wrapped in a lock (<code>synchronized</code> / <code>with lock</code> / <code>lock_guard</code>).' : 'There is <b>no lock</b>, so the CPU may switch threads between any two steps.'), {}, {});
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
}`, alt: [
          { lang: 'python', code: `import threading


class Config:
    def __init__(self) -> None:
        print("loading config once")

    # BROKEN: check-then-act without a lock
    _unsafe: "Config | None" = None

    @classmethod
    def get_unsafe(cls) -> "Config":
        if cls._unsafe is None:
            cls._unsafe = Config()                  # two threads can both see None
        return cls._unsafe

    # SAFE and lazy: double-checked locking (the lock is taken only until the first publish)
    _safe: "Config | None" = None
    _lock = threading.Lock()

    @classmethod
    def get(cls) -> "Config":
        inst = cls._safe
        if inst is None:
            with cls._lock:
                inst = cls._safe
                if inst is None:
                    inst = cls._safe = Config()
        return inst` },
          { lang: 'ts', code: `const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

class Config {
  private constructor() {
    console.log("loading config once");
  }

  // BROKEN: check-then-act with an await in between (a plain synchronous check is safe in JS)
  private static unsafe?: Config;
  static async getUnsafe(): Promise<Config> {
    if (!Config.unsafe) {
      await sleep(1); // loading takes time; a second caller arrives meanwhile and also sees undefined
      Config.unsafe = new Config();
    }
    return Config.unsafe;
  }

  // SAFE and lazy: store the PROMISE before awaiting, so every caller shares one load
  private static pending?: Promise<Config>;
  static get(): Promise<Config> {
    return (Config.pending ??= sleep(1).then(() => new Config()));
  }
}` },
          { lang: 'cpp', code: `class Config {
    Config() { cout << "loading config once\\n"; }

    // BROKEN: check-then-act without a lock (a data race: undefined behaviour)
    static inline Config* unsafe_ = nullptr;

public:
    static Config& getUnsafe() {
        if (unsafe_ == nullptr) unsafe_ = new Config();   // two threads can both see nullptr
        return *unsafe_;
    }

    // SAFE and lazy: since C++11 a function-local static is initialised exactly once, even under contention
    static Config& get() {
        static Config instance;
        return instance;
    }
};` }
        ] },
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
}`, alt: [
          { lang: 'python', code: `import threading
import time


class Worker:
    def __init__(self) -> None:
        self.running = True                         # CPython's GIL publishes writes; other runtimes need an Event
        self.ticks = 0

    def run(self) -> None:
        while self.running:
            self.ticks += 1
        print(f"stopped after {'some' if self.ticks > 0 else 'zero'} ticks")

    def stop(self) -> None:
        self.running = False


if __name__ == "__main__":
    w = Worker()
    t = threading.Thread(target=w.run)
    t.start()
    time.sleep(0.05)
    w.stop()
    t.join(2)                                       # bounded wait so a demo can never hang
    print(f"worker alive? {str(t.is_alive()).lower()}")` },
          { lang: 'ts', code: `// A Web/Node Worker would need a SharedArrayBuffer flag read with Atomics.load for the same visibility guarantee.
// Inside one event loop a flag read after an await always sees the latest write.
class SpinWorker {
  private running = true;
  private ticks = 0;

  async run(): Promise<void> {
    while (this.running) {
      this.ticks++;
      await new Promise((r) => setTimeout(r, 0)); // yield to the timer queue, or stop() could never run
    }
    console.log("stopped after " + (this.ticks > 0 ? "some" : "zero") + " ticks");
  }

  stop(): void {
    this.running = false;
  }
}

async function main(): Promise<void> {
  const w = new SpinWorker();
  const done = w.run();
  await new Promise((r) => setTimeout(r, 50));
  w.stop();
  await done;
  console.log("worker alive? false");
}

main();` },
          { lang: 'cpp', code: `class Worker {
    atomic<bool> running_{true};                   // a plain bool would be a data race: the loop may never re-read it
    long long ticks_ = 0;

public:
    void run() {
        while (running_.load(memory_order_acquire)) ticks_++;
        cout << "stopped after " << (ticks_ > 0 ? "some" : "zero") << " ticks\\n";
    }
    void stop() { running_.store(false, memory_order_release); }
};

int main() {
    Worker w;
    thread t(&Worker::run, &w);
    this_thread::sleep_for(50ms);
    w.stop();
    t.join();                                      // join = wait for it AND see its writes
    cout << boolalpha << "worker alive? " << t.joinable() << "\\n";
}` }
        ] },
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
      brute: { why: `<p><b>Unsynchronized HashMap:</b> lost updates (two threads read 41, both write 42) and, worse, two threads resizing the table at once can corrupt buckets — older JDKs could even form a cycle and spin forever (the 100% CPU freeze). <b>Global lock (<code>synchronized</code> on every method):</b> correct, but all 200 threads queue on one monitor even for different pages, and <code>top(k)</code> holds that lock while sorting thousands of entries, stalling every writer.</p>`, code: { lang: 'java', code: `class NaivePageViews {
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
}`, alt: [{ lang: 'python', code: "import threading\n\nclass NaivePageViews:\n    def __init__(self):\n        self.views = {}\n        self.lock = threading.Lock()\n\n    # BRUTE 1: race - get then set is two steps (a thread can be switched out in between)\n    def record_view_unsafe(self, page):\n        self.views[page] = self.views.get(page, 0) + 1\n\n    # BRUTE 2: correct but every thread waits on ONE lock, even for unrelated pages\n    def record_view(self, page):\n        with self.lock:\n            self.views[page] = self.views.get(page, 0) + 1\n\n    def top(self, k):                                  # sorts while holding the lock\n        with self.lock:\n            return sorted(self.views.items(), key=lambda kv: -kv[1])[:k]\n" }, { lang: 'ts', code: "import { Mutex } from \"async-mutex\";\n\nclass NaivePageViews {\n  private views = new Map<string, number>();\n  private mutex = new Mutex();\n\n  // BRUTE 1: race - get then set is two steps (workers sharing the map, or an await in between)\n  recordViewUnsafe(page: string): void {\n    this.views.set(page, (this.views.get(page) ?? 0) + 1);\n  }\n\n  // BRUTE 2: correct but every caller waits on ONE lock, even for unrelated pages\n  recordView(page: string): Promise<void> {\n    return this.mutex.runExclusive(() => { this.views.set(page, (this.views.get(page) ?? 0) + 1); });\n  }\n  top(k: number): Promise<[string, number][]> {         // sorts while holding the lock\n    return this.mutex.runExclusive(() => [...this.views].sort((a, b) => b[1] - a[1]).slice(0, k));\n  }\n}\n" }, { lang: 'cpp', code: "class NaivePageViews {\n    unordered_map<string, int> views;\n    mutex m;\npublic:\n    // BRUTE 1: race - find then assign is two steps; unordered_map itself is not thread-safe\n    void recordViewUnsafe(const string& page) {\n        views[page] = views[page] + 1;\n    }\n\n    // BRUTE 2: correct but every thread waits on ONE lock, even for unrelated pages\n    void recordView(const string& page) {\n        lock_guard<mutex> g(m);\n        views[page] = views[page] + 1;\n    }\n    vector<pair<string, int>> top(int k) {               // sorts while holding the lock\n        lock_guard<mutex> g(m);\n        vector<pair<string, int>> all(views.begin(), views.end());\n        sort(all.begin(), all.end(), [](auto& a, auto& b) { return a.second > b.second; });\n        all.resize(min<size_t>(k, all.size()));\n        return all;\n    }\n};\n" }] } },
      mcq: { q: 'You switch to <code>ConcurrentHashMap&lt;String, Integer&gt;</code> but keep <code>map.put(p, map.getOrDefault(p, 0) + 1)</code>. Is it fixed?', options: ['Yes — ConcurrentHashMap is thread-safe', 'No — each call is safe, but get-then-put is still two separate steps, so updates are still lost', 'No — ConcurrentHashMap does not allow Integer values', 'Yes, as long as the JVM has more than one core'], answer: 1, explain: 'A thread-safe collection makes each <i>single</i> call atomic. A compound action built from two calls is not. Use <code>merge(p, 1, Integer::sum)</code>, <code>compute</code>, or <code>computeIfAbsent(p, k -&gt; new LongAdder()).increment()</code>.' },
      hints: [`<p>Hint 1: The bug is a <b>read-modify-write</b> on a shared map entry. You need the "add one" to be a single atomic step per key.</p>`, `<p>Hint 2: <code>ConcurrentHashMap</code> gives per-key atomic <code>computeIfAbsent</code>; <code>LongAdder</code> gives a contention-friendly counter. Combine them: one adder per page.</p>`, `<p>Hint 3: For <code>top(k)</code>, take a <b>snapshot</b> (copy page → sum into a list) without any global lock, then sort the copy. Writers keep running; the report is a few ms stale, which the constraints allow.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "[/home=20000, /cart=10000, /pay=10000]\nhome=20000 missing=0 top0=[]\n" }] },
      solution: {
        approach: `<p>Replace "one lock for everything" with <b>per-key atomicity</b>. <code>computeIfAbsent</code> creates exactly one <code>LongAdder</code> per page even when many threads see the page for the first time together. <code>LongAdder.increment()</code> is lock-free and spreads contention across internal cells, so a hot page like <code>/home</code> does not become a bottleneck. Reports build a <b>weakly consistent snapshot</b> by iterating the map (CHM iterators never throw <code>ConcurrentModificationException</code>) and sort the private copy.</p>
<p><b>In Python, TypeScript and C++.</b> Python has no per-key adder, so one short <code>Lock</code> guards a <code>dict</code> (increment inside the lock; copy under the lock, sort outside it). C++ keeps an <code>unordered_map&lt;string, atomic&lt;long long&gt;&gt;</code> behind a <code>shared_mutex</code>: a shared lock finds an existing page and does <code>fetch_add</code>, an exclusive lock is taken only to insert a new page. TypeScript needs no lock at all, because a method with no <code>await</code> inside cannot be interleaved with another task; the race returns the moment an <code>await</code> sits between the read and the write.</p>`,
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
        snap.sort((x, y) -> {                                // most views first, ties by page name
            int c = Long.compare(y.getValue(), x.getValue());
            return c != 0 ? c : x.getKey().compareTo(y.getKey());
        });
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
        System.out.println(c.top(3));                      // [/home=20000, /cart=10000, /pay=10000]
        System.out.println("home=" + c.views("/home") + " missing=" + c.views("/missing") + " top0=" + c.top(0));
    }
}`, alt: [
          { lang: 'python', code: `import threading
from concurrent.futures import ThreadPoolExecutor


class PageViewCounter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._views: dict[str, int] = {}

    def record_view(self, page: str) -> None:
        # d[k] += 1 is read-modify-write even under the GIL: keep it inside the lock
        with self._lock:
            self._views[page] = self._views.get(page, 0) + 1

    def views(self, page: str) -> int:
        with self._lock:
            return self._views.get(page, 0)

    def top(self, k: int) -> list[tuple[str, int]]:
        with self._lock:
            snap = list(self._views.items())     # tiny copy under the lock ...
        snap.sort(key=lambda e: (-e[1], e[0]))   # ... the sort runs outside it
        return snap[:max(k, 0)]


def fmt(entries: list[tuple[str, int]]) -> str:
    return "[" + ", ".join(f"{p}={n}" for p, n in entries) + "]"


def main() -> None:
    c = PageViewCounter()
    pages = ["/home", "/cart", "/home", "/pay"]
    with ThreadPoolExecutor(max_workers=8) as pool:
        for t in range(8):
            pool.submit(lambda t=t: [c.record_view(pages[i % 4]) for i in range(t, 40_000, 8)])
    print(fmt(c.top(3)))
    print(f"home={c.views('/home')} missing={c.views('/missing')} top0={fmt(c.top(0))}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `// JavaScript runs one task at a time: a method with no await inside is already atomic.
// Races only appear when a read and its write are split by an await.
class PageViewCounter {
  private readonly counts = new Map<string, number>();

  recordView(page: string): void {
    this.counts.set(page, (this.counts.get(page) ?? 0) + 1);
  }

  views(page: string): number {
    return this.counts.get(page) ?? 0;
  }

  top(k: number): Array<[string, number]> {
    const snap = [...this.counts.entries()];
    snap.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return snap.slice(0, Math.max(k, 0));
  }
}

const fmt = (entries: Array<[string, number]>): string =>
  "[" + entries.map(([p, n]) => p + "=" + n).join(", ") + "]";

async function main(): Promise<void> {
  const c = new PageViewCounter();
  const pages = ["/home", "/cart", "/home", "/pay"];
  const worker = async (w: number): Promise<void> => {
    for (let i = w; i < 40_000; i += 8) {
      await Promise.resolve();                 // yield: other workers interleave here
      c.recordView(pages[i % 4]);
    }
  };
  await Promise.all(Array.from({ length: 8 }, (_, w) => worker(w)));
  console.log(fmt(c.top(3)));
  console.log("home=" + c.views("/home") + " missing=" + c.views("/missing") + " top0=" + fmt(c.top(0)));
}

main();` },
          { lang: 'cpp', code: `class PageViewCounter {
    mutable shared_mutex mu_;                                   // guards the map's shape, not the counts
    unordered_map<string, atomic<long long>> views_;            // element references survive rehashing

public:
    void recordView(const string& page) {
        {
            shared_lock lk(mu_);                                // hot path: many writers share the lock
            auto it = views_.find(page);
            if (it != views_.end()) { it->second.fetch_add(1, memory_order_relaxed); return; }
        }
        unique_lock lk(mu_);                                    // first view of a page: insert exclusively
        views_[page].fetch_add(1, memory_order_relaxed);
    }

    long long views(const string& page) const {
        shared_lock lk(mu_);
        auto it = views_.find(page);
        return it == views_.end() ? 0 : it->second.load();
    }

    vector<pair<string, long long>> top(int k) const {
        vector<pair<string, long long>> snap;
        {
            shared_lock lk(mu_);
            for (const auto& [p, n] : views_) snap.emplace_back(p, n.load());
        }
        sort(snap.begin(), snap.end(), [](const auto& a, const auto& b) {
            return a.second != b.second ? a.second > b.second : a.first < b.first;
        });
        if (k < 0) k = 0;
        if (snap.size() > static_cast<size_t>(k)) snap.resize(k);
        return snap;
    }
};

string fmt(const vector<pair<string, long long>>& entries) {
    string s = "[";
    for (size_t i = 0; i < entries.size(); i++) {
        if (i) s += ", ";
        s += entries[i].first + "=" + to_string(entries[i].second);
    }
    return s + "]";
}

int main() {
    PageViewCounter c;
    const vector<string> pages = {"/home", "/cart", "/home", "/pay"};
    vector<thread> pool;
    for (int t = 0; t < 8; t++)
        pool.emplace_back([&, t] { for (int i = t; i < 40000; i += 8) c.recordView(pages[i % 4]); });
    for (auto& th : pool) th.join();
    cout << fmt(c.top(3)) << "\\n";
    cout << "home=" << c.views("/home") << " missing=" << c.views("/missing") << " top0=" << fmt(c.top(0)) << "\\n";
}` }
        ],
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
}`, alt: [
          { lang: 'python', code: `import threading
import time
from collections.abc import Callable
from typing import Generic, TypeVar

K = TypeVar("K")
V = TypeVar("V")


class SynchronizedDict(Generic[K, V]):
    """Every single call takes the lock - the Python twin of Collections.synchronizedMap."""

    def __init__(self) -> None:
        self._d: dict[K, V] = {}
        self._lock = threading.Lock()

    def contains(self, k: K) -> bool:
        with self._lock:
            return k in self._d

    def put(self, k: K, v: V) -> None:
        with self._lock:
            self._d[k] = v

    def put_if_absent(self, k: K, v: V) -> bool:      # the fix: check AND act in one lock hold
        with self._lock:
            if k in self._d:
                return False
            self._d[k] = v
            return True


def run_twice(task: Callable[[], None]) -> None:
    """Runs the same task on 2 threads at once (the race shows up only on unlucky timings)."""
    ts = [threading.Thread(target=task, name=n) for n in ("A", "B")]
    for t in ts:
        t.start()
    for t in ts:
        t.join()


if __name__ == "__main__":
    # ---- Trap 1: check-then-act on a synchronized map ----
    sync: SynchronizedDict[str, str] = SynchronizedDict()
    winners = [0]
    count_lock = threading.Lock()

    def racy() -> None:
        if not sync.contains("neo"):                  # CHECK  (lock taken and released)
            time.sleep(0)                             # widen the gap so the race is easy to see
            sync.put("neo", threading.current_thread().name)   # ACT (lock taken again)
            with count_lock:
                winners[0] += 1

    run_twice(racy)
    print(f"synchronizedMap, check-then-act winners: {winners[0]} (1 is correct)")

    # Fix: one atomic call
    fixed: SynchronizedDict[str, str] = SynchronizedDict()
    winners2 = [0]

    def safe() -> None:
        if fixed.put_if_absent("neo", threading.current_thread().name):
            with count_lock:
                winners2[0] += 1

    run_twice(safe)
    print(f"putIfAbsent winners: {winners2[0]}")

    # ---- Trap 2: iterating a shared list needs client-side locking ----
    items = [1, 2, 3]
    items_lock = threading.Lock()
    with items_lock:                                   # hold the lock for the WHOLE loop
        total = sum(items)
    print(f"sum = {total}")

    # Or: iterate a private snapshot, so the loop can never see the list change under it
    cow = [1, 2, 3]
    for x in tuple(cow):                               # the snapshot
        if x == 2:
            cow.append(99)                             # safe: the loop sees the old snapshot
    print("cow = [" + ", ".join(map(str, cow)) + "]")  # [1, 2, 3, 99]` },
          { lang: 'ts', code: `const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// A plain Map is "synchronized" for free: each call finishes before another task runs.
// The race appears when an await sits between the check and the act.
class Demo {
  static async main(): Promise<void> {
    // ---- Trap 1: check-then-act across an await ----
    const shared = new Map<string, string>();
    let winners = 0;
    const racy = async (name: string): Promise<void> => {
      if (!shared.has("neo")) { // CHECK
        await sleep(1); // widen the gap: every task passes the check before any task acts
        shared.set("neo", name); // ACT
        winners++;
      }
    };
    await Promise.all([racy("A"), racy("B")]);
    console.log("check-then-act winners: " + winners + " (1 is correct)");

    // Fix: check and act in one synchronous step
    const fixed = new Map<string, string>();
    let winners2 = 0;
    const putIfAbsent = (k: string, v: string): boolean => {
      if (fixed.has(k)) return false;
      fixed.set(k, v);
      return true;
    };
    const safe = async (name: string): Promise<void> => {
      await sleep(1);
      if (putIfAbsent("neo", name)) winners2++;
    };
    await Promise.all([safe("A"), safe("B")]);
    console.log("putIfAbsent winners: " + winners2);

    // ---- Trap 2: mutating an array while iterating it ----
    const items = [1, 2, 3];
    let sum = 0;
    for (const x of items) sum += x; // no lock exists or is needed: nothing else runs inside the loop
    console.log("sum = " + sum);

    // Iterate a private snapshot when the loop body itself changes the list
    const cow = [1, 2, 3];
    for (const x of [...cow]) if (x === 2) cow.push(99); // safe: the loop sees the old snapshot
    console.log("cow = [" + cow.join(", ") + "]"); // [1, 2, 3, 99]
  }
}

Demo.main();` },
          { lang: 'cpp', code: `template <class K, class V>
class SynchronizedMap {                              // every single call takes the lock
    unordered_map<K, V> m_;
    mutex mu_;

public:
    bool contains(const K& k) { lock_guard lk(mu_); return m_.count(k) > 0; }
    void put(const K& k, const V& v) { lock_guard lk(mu_); m_[k] = v; }
    bool putIfAbsent(const K& k, const V& v) {       // the fix: check AND act in one lock hold
        lock_guard lk(mu_);
        return m_.try_emplace(k, v).second;
    }
};

// runs the same task on 2 threads at once (the race shows up only on unlucky timings)
void runTwice(const function<void(const string&)>& task) {
    thread a(task, "A"), b(task, "B");
    a.join();
    b.join();
}

int main() {
    // ---- Trap 1: check-then-act on a synchronized map ----
    SynchronizedMap<string, string> sync;
    atomic<int> winners{0};
    runTwice([&](const string& name) {
        if (!sync.contains("neo")) {                 // CHECK  (lock taken and released)
            this_thread::yield();                    // widen the gap so the race is easy to see
            sync.put("neo", name);                   // ACT (lock taken again)
            winners++;
        }
    });
    cout << "synchronizedMap, check-then-act winners: " << winners << " (1 is correct)\\n";

    // Fix: one atomic call
    SynchronizedMap<string, string> fixed;
    atomic<int> winners2{0};
    runTwice([&](const string& name) { if (fixed.putIfAbsent("neo", name)) winners2++; });
    cout << "putIfAbsent winners: " << winners2 << "\\n";

    // ---- Trap 2: iterating a shared vector needs client-side locking ----
    vector<int> list = {1, 2, 3};
    mutex listMu;
    int sum = 0;
    {
        lock_guard lk(listMu);                       // hold the lock for the WHOLE loop
        for (int x : list) sum += x;
    }
    cout << "sum = " << sum << "\\n";

    // Or: iterate a private snapshot (push_back on the live vector would invalidate its iterators)
    vector<int> cow = {1, 2, 3};
    const vector<int> snapshot = cow;
    for (int x : snapshot) if (x == 2) cow.push_back(99);   // safe: the loop sees the old snapshot
    cout << "cow = [";
    for (size_t i = 0; i < cow.size(); i++) cout << (i ? ", " : "") << cow[i];
    cout << "]\\n";                                   // [1, 2, 3, 99]
}` }
        ] }, { lang: 'java', title: 'ConcurrentHashMap atomic-operation cheat sheet', code: `class ChmCheatSheet {
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
}`, alt: [
          { lang: 'python', code: `import threading
from collections import deque


class ChmCheatSheet:
    """Python dicts make single operations atomic under the GIL; compound ones still need a lock."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.hits: dict[str, int] = {}
        self.inbox: dict[str, deque[str]] = {}
        self.stock: dict[str, int] = {}

    def hit(self, page: str) -> None:
        with self._lock:                                  # read-modify-write on one key
            self.hits[page] = self.hits.get(page, 0) + 1

    def deliver(self, user: str, msg: str) -> None:
        with self._lock:
            # setdefault creates the queue once; the VALUE must also be thread-safe:
            # deque.append is atomic, a plain list shared between threads is the thing to avoid
            q = self.inbox.setdefault(user, deque())
        q.append(msg)

    def reserve_one(self, sku: str) -> bool:
        with self._lock:                                  # check stock AND decrement in one step
            qty = self.stock.get(sku)
            if qty is None or qty <= 0:
                return False
            self.stock[sku] = qty - 1
            return True

    def cas_price(self, sku: str, expected: int, new: int) -> bool:
        with self._lock:
            if self.stock.get(sku) != expected:           # succeeds only if the value is still "expected"
                return False
            self.stock[sku] = new
            return True


if __name__ == "__main__":
    c = ChmCheatSheet()
    c.hit("/home")
    c.hit("/home")
    c.deliver("asha", "hi")
    c.deliver("asha", "lunch?")
    c.stock["tee"] = 1
    hits = "{" + ", ".join(f"{k}={v}" for k, v in c.hits.items()) + "}"
    inbox = "{" + ", ".join(f"{u}=[{', '.join(q)}]" for u, q in c.inbox.items()) + "}"
    first, second = c.reserve_one("tee"), c.reserve_one("tee")
    print(hits, inbox, str(first).lower(), str(second).lower())
    # {/home=2} {asha=[hi, lunch?]} true false` },
          { lang: 'ts', code: `// No lock is needed: each method is synchronous, so a compound step finishes before another task starts.
class ChmCheatSheet {
  readonly hits = new Map<string, number>();
  readonly inbox = new Map<string, string[]>();
  readonly stock = new Map<string, number>();

  hit(page: string): void {
    this.hits.set(page, (this.hits.get(page) ?? 0) + 1); // atomic counter per key
  }

  deliver(user: string, msg: string): void {
    let q = this.inbox.get(user);
    if (!q) this.inbox.set(user, (q = [])); // created once
    q.push(msg);
  }

  reserveOne(sku: string): boolean {
    const qty = this.stock.get(sku);
    if (qty === undefined || qty <= 0) return false; // check stock AND decrement in one step
    this.stock.set(sku, qty - 1);
    return true;
  }

  casPrice(sku: string, expected: number, next: number): boolean {
    if (this.stock.get(sku) !== expected) return false; // succeeds only if the value is still "expected"
    this.stock.set(sku, next);
    return true;
  }
}

const c = new ChmCheatSheet();
c.hit("/home");
c.hit("/home");
c.deliver("asha", "hi");
c.deliver("asha", "lunch?");
c.stock.set("tee", 1);
const hits = "{" + [...c.hits].map(([k, v]) => k + "=" + v).join(", ") + "}";
const inbox = "{" + [...c.inbox].map(([u, q]) => u + "=[" + q.join(", ") + "]").join(", ") + "}";
const first = c.reserveOne("tee");
const second = c.reserveOne("tee");
console.log(hits, inbox, first, second);
// {/home=2} {asha=[hi, lunch?]} true false` },
          { lang: 'cpp', code: `class ChmCheatSheet {
    mutex mu_;                                            // one lock; ConcurrentHashMap locks per bin instead

public:
    unordered_map<string, long long> hits;
    unordered_map<string, deque<string>> inbox;
    unordered_map<string, int> stock;

    void hit(const string& page) {
        lock_guard lk(mu_);
        hits[page]++;                                     // atomic counter per key (under the lock)
    }

    void deliver(const string& user, const string& msg) {
        lock_guard lk(mu_);
        inbox[user].push_back(msg);                       // operator[] creates the deque once; push under the same lock
    }

    bool reserveOne(const string& sku) {
        lock_guard lk(mu_);                               // check stock AND decrement in one step
        auto it = stock.find(sku);
        if (it == stock.end() || it->second <= 0) return false;
        it->second--;
        return true;
    }

    bool casPrice(const string& sku, int expected, int next) {
        lock_guard lk(mu_);
        auto it = stock.find(sku);
        if (it == stock.end() || it->second != expected) return false;   // only if still "expected"
        it->second = next;
        return true;
    }
};

int main() {
    ChmCheatSheet c;
    c.hit("/home"); c.hit("/home");
    c.deliver("asha", "hi"); c.deliver("asha", "lunch?");
    c.stock["tee"] = 1;
    bool first = c.reserveOne("tee");
    bool second = c.reserveOne("tee");
    cout << "{/home=" << c.hits["/home"] << "} {asha=[" << c.inbox["asha"][0] << ", " << c.inbox["asha"][1] << "]} "
         << boolalpha << first << " " << second << "\\n";   // {/home=2} {asha=[hi, lunch?]} true false
}` }
        ] }],
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
          TABLE('Timeline', ['t', 'Thread A (Asha)', 'Thread B (Bala)', 'map["neo"]'], rows), mapPart(), CODE('register(name, me)', src, {}, atomic ? REGA_ALT : REGP_ALT)]));
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
          frames.push(F(narr, [TABLE('Timeline', ['t', 'Thread A (Asha)', 'Thread B (Bala)', 'map["neo"]'], rows, h), mapPart(mh), CODE('register(name, me)', src, ch, atomic ? REGA_ALT : REGP_ALT)]));
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
}`, alt: [
          { lang: 'python', code: `import threading
from collections.abc import Callable


class EventBus:
    def __init__(self) -> None:
        self._listeners: tuple[Callable[[str], None], ...] = ()   # copy-on-write: replaced, never edited
        self._lock = threading.Lock()

    def subscribe(self, listener: Callable[[str], None]) -> None:
        with self._lock:
            self._listeners = (*self._listeners, listener)        # copies the tuple: rare, fine

    def publish(self, event: str) -> None:
        for listener in self._listeners:                          # snapshot iteration, lock-free
            listener(event)` },
          { lang: 'ts', code: `class EventBus {
  private listeners: readonly ((event: string) => void)[] = []; // copy-on-write: replaced, never edited

  subscribe(l: (event: string) => void): void {
    this.listeners = [...this.listeners, l]; // copies the array: rare, fine
  }

  publish(event: string): void {
    for (const l of this.listeners) l(event); // iterates the array as it was when the loop began
  }
}` },
          { lang: 'cpp', code: `class EventBus {
    using Listener = function<void(const string&)>;
    shared_ptr<const vector<Listener>> listeners_ = make_shared<const vector<Listener>>();
    mutex mu_;

public:
    void subscribe(Listener l) {                             // copies the vector: rare, fine
        lock_guard lk(mu_);
        auto next = make_shared<vector<Listener>>(*listeners_);
        next->push_back(std::move(l));
        listeners_ = std::move(next);
    }

    void publish(const string& event) {
        shared_ptr<const vector<Listener>> snap;
        {
            lock_guard lk(mu_);
            snap = listeners_;                               // snapshot iteration: later changes build a new vector
        }
        for (const auto& l : *snap) l(event);
    }
};` }
        ] },
      { title: 'Vector is not magic: isEmpty then remove', html: `<p><code>Vector&lt;Job&gt; jobs</code>, two workers run <code>if (!jobs.isEmpty()) jobs.remove(0);</code>. One job left: both see "not empty", first removes it, second gets ${H.c('r', 'ArrayIndexOutOfBoundsException')}. The fix is either a lock around both calls or, better, the right abstraction: a <code>BlockingQueue</code> whose <code>poll()</code> returns <code>null</code> atomically when empty.</p>`, code: `class Workers {
    private final BlockingQueue<String> jobs = new LinkedBlockingQueue<>(List.of("j1"));
    String next() { return jobs.poll(); }   // atomic "take if present", null when empty
}`, alt: [
          { lang: 'python', code: `import queue


class Workers:
    def __init__(self) -> None:
        self._jobs: queue.Queue[str] = queue.Queue()
        self._jobs.put("j1")

    def next(self) -> str | None:
        try:
            return self._jobs.get_nowait()     # atomic "take if present"
        except queue.Empty:
            return None                        # empty: no check-then-act race` },
          { lang: 'ts', code: `class Workers {
  private readonly jobs: string[] = ["j1"];

  next(): string | undefined {
    return this.jobs.shift(); // one synchronous step: "take if present", undefined when empty
  }
}` },
          { lang: 'cpp', code: `class Workers {
    deque<string> jobs_{"j1"};
    mutex mu_;

public:
    optional<string> next() {                  // "take if present" under one lock hold, nullopt when empty
        lock_guard lk(mu_);
        if (jobs_.empty()) return nullopt;
        string j = std::move(jobs_.front());
        jobs_.pop_front();
        return j;
    }
};` }
        ] },
      { title: 'computeIfAbsent with a non-thread-safe value', html: `<p><code>map.computeIfAbsent(user, u -&gt; new ArrayList&lt;&gt;()).add(order)</code> on a CHM: the map entry is created once, safely. But then two threads call <code>add</code> on the <b>same ArrayList</b> with no lock → lost elements or a corrupted array. Thread safety must hold at <i>every level</i>: use <code>ConcurrentLinkedQueue</code> / <code>CopyOnWriteArrayList</code> as the value, or do the add <i>inside</i> <code>compute</code> so it runs under the bin lock.</p>`, code: `class Orders {
    final ConcurrentHashMap<String, List<String>> byUser = new ConcurrentHashMap<>();
    void add(String user, String order) {
        byUser.compute(user, (u, list) -> {          // runs under the bin lock
            List<String> l = (list == null) ? new ArrayList<>() : list;
            l.add(order);
            return l;
        });
    }
}`, alt: [
          { lang: 'python', code: `import threading


class Orders:
    def __init__(self) -> None:
        self.by_user: dict[str, list[str]] = {}
        self._lock = threading.Lock()

    def add(self, user: str, order: str) -> None:
        with self._lock:                       # create-or-get AND append in one critical section
            self.by_user.setdefault(user, []).append(order)` },
          { lang: 'ts', code: `class Orders {
  readonly byUser = new Map<string, string[]>();

  add(user: string, order: string): void {
    const list = this.byUser.get(user) ?? []; // create-or-get AND append in one synchronous step
    list.push(order);
    this.byUser.set(user, list);
  }
}` },
          { lang: 'cpp', code: `class Orders {
    mutex mu_;

public:
    unordered_map<string, vector<string>> byUser;

    void add(const string& user, const string& order) {
        lock_guard lk(mu_);                    // create-or-get AND append in one critical section
        byUser[user].push_back(order);
    }
};` }
        ] },
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
}</pre>
<p>The listing is Java; the same check-then-act shape appears with a Python <code>dict</code>, a C++ <code>unordered_map</code>, or a TypeScript <code>Map</code> when an <code>await</code> sits between the check and the write.</p>`,
      constraints: `<p>Thousands of sign-ups per second, many different usernames. Exactly one owner per username, ever. <code>all()</code> may be slightly stale.</p>`,
      example: `<p>Asha and Bala both call <code>register("neo", …)</code> at once → ${H.c('r', 'both get true')} today. After the fix: ${H.c('g', 'one true, one false')}. Also: <code>rename</code> can let a third user steal <code>newN</code> between its check and put, and <code>users.get(oldN) == id</code> throws <code>NullPointerException</code> if <code>oldN</code> was removed concurrently (unboxing null).</p>`,
      brute: { why: `<p>The given code is the "unsynchronized compound action" brute force: every single call is locked, but <b>register</b> (check-then-put), <b>rename</b> (check-then-remove-then-put) and <b>all</b> (unlocked iteration) all break. The other brute force — mark every method <code>synchronized</code> — is correct but serializes every sign-up in the company through one monitor, and <code>all()</code> blocks sign-ups while it copies.</p>`, code: { lang: 'java', code: `class RegistryGlobalLock {
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
}`, alt: [{ lang: 'python', code: "import threading\n\nclass RegistryGlobalLock:\n    def __init__(self):\n        self.users = {}\n        self.lock = threading.Lock()\n\n    def register(self, name, id_):\n        with self.lock:\n            if name in self.users: return False\n            self.users[name] = id_\n            return True\n\n    def rename(self, old_n, new_n, id_):\n        with self.lock:\n            cur = self.users.get(old_n)\n            if cur is None or cur != id_ or new_n in self.users: return False\n            del self.users[old_n]\n            self.users[new_n] = id_\n            return True\n\n    def all(self):\n        with self.lock:\n            return list(self.users)\n" }, { lang: 'ts', code: "import { Mutex } from \"async-mutex\";\n\nclass RegistryGlobalLock {\n  private users = new Map<string, number>();\n  private mutex = new Mutex();\n\n  register(name: string, id: number): Promise<boolean> {\n    return this.mutex.runExclusive(() => {\n      if (this.users.has(name)) return false;\n      this.users.set(name, id);\n      return true;\n    });\n  }\n  rename(oldN: string, newN: string, id: number): Promise<boolean> {\n    return this.mutex.runExclusive(() => {\n      const cur = this.users.get(oldN);\n      if (cur === undefined || cur !== id || this.users.has(newN)) return false;\n      this.users.delete(oldN);\n      this.users.set(newN, id);\n      return true;\n    });\n  }\n  all(): Promise<string[]> { return this.mutex.runExclusive(() => [...this.users.keys()]); }\n}\n" }, { lang: 'cpp', code: "class RegistryGlobalLock {\n    unordered_map<string, long long> users;\n    mutex m;\npublic:\n    bool registerUser(const string& name, long long id) {\n        lock_guard<mutex> g(m);\n        if (users.count(name)) return false;\n        users[name] = id;\n        return true;\n    }\n    bool rename(const string& oldN, const string& newN, long long id) {\n        lock_guard<mutex> g(m);\n        auto it = users.find(oldN);\n        if (it == users.end() || it->second != id || users.count(newN)) return false;\n        users.erase(it);\n        users[newN] = id;\n        return true;\n    }\n    vector<string> all() {\n        lock_guard<mutex> g(m);\n        vector<string> out;\n        for (auto& kv : users) out.push_back(kv.first);\n        return out;\n    }\n};\n" }] } },
      mcq: { q: 'For <code>rename</code>, which order of atomic steps is safe without a global lock?', options: ['remove(old) first, then putIfAbsent(new)', 'putIfAbsent(new, id) first; if it succeeds, remove(old, id)', 'put(new, id) then remove(old)', 'containsKey(new) then put(new, id)'], answer: 1, explain: 'Claim the new name atomically first; if someone else owns it you have changed nothing. Removing old first could leave the user with no name if the claim then fails. <code>remove(old, id)</code> only removes if old still maps to this user.' },
      hints: [`<p>Hint 1: Look for any place two map calls must agree with each other — those are the races. There are three.</p>`, `<p>Hint 2: <code>ConcurrentHashMap</code> has single-call versions: <code>putIfAbsent</code> (register), <code>remove(key, value)</code> (conditional delete), and iteration that never throws.</p>`, `<p>Hint 3: For rename, do the step that can fail <b>first</b> (claim new name), then the step that cannot conflict (conditional remove of old). Returning a copy of <code>keySet()</code> is a cheap weakly consistent snapshot.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "owners of neo: 1\nrename neo->trinity: true\nregister trinity again: false\nrename by non-owner: false\nrename into taken name: false\nnames: [morpheus, trinity]\n" }] },
      solution: {
        approach: `<p>Swap to <code>ConcurrentHashMap</code> and express every operation as <b>atomic single calls</b>. <code>register</code> → <code>putIfAbsent(name, id) == null</code>. <code>rename</code> → verify ownership with <code>get</code> (a hint only), atomically claim <code>newN</code> with <code>putIfAbsent</code>, then <code>remove(oldN, id)</code>; if that conditional remove fails (someone deleted the account meanwhile), roll back the claim with <code>remove(newN, id)</code>. <code>all()</code> → <code>new ArrayList&lt;&gt;(users.keySet())</code>, a weakly consistent copy that never throws. No global lock: different usernames never contend.</p>
<p><b>In Python, TypeScript and C++.</b> Python wraps each compound step (<code>register</code>, <code>rename</code>) in one <code>Lock</code>; a bare <code>dict</code> only makes single operations atomic. C++ does the same with a <code>mutex</code> and uses <code>try_emplace(...).second</code> as the check-and-insert in one call (the method is called <code>register_</code> because <code>register</code> is a C++ keyword). In TypeScript a synchronous <code>has</code>-then-<code>set</code> is already atomic; the duplicate-username bug only exists if an <code>await</code> separates them.</p>`,
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
        System.out.println("rename neo->trinity: " + r.rename("neo", "trinity", owner));       // true
        System.out.println("register trinity again: " + r.register("trinity", 777));          // false
        r.register("morpheus", 7);
        System.out.println("rename by non-owner: " + r.rename("morpheus", "oracle", 8));      // false
        System.out.println("rename into taken name: " + r.rename("morpheus", "trinity", 7));  // false
        List<String> names = r.all();
        Collections.sort(names);
        System.out.println("names: " + names);                                                // [morpheus, trinity]
    }
}`, alt: [
          { lang: 'python', code: `import threading
from concurrent.futures import ThreadPoolExecutor


class Registry:
    def __init__(self) -> None:
        self._users: dict[str, int] = {}
        self._lock = threading.Lock()      # every compound action below is one critical section

    def register(self, name: str, user_id: int) -> bool:
        with self._lock:
            if name in self._users:        # check + insert are one step
                return False
            self._users[name] = user_id
            return True

    def rename(self, old: str, new: str, user_id: int) -> bool:
        with self._lock:
            if self._users.get(old) != user_id or new in self._users:
                return False               # not yours, or the new name is taken
            del self._users[old]
            self._users[new] = user_id
            return True

    def owner_of(self, name: str) -> int | None:
        with self._lock:
            return self._users.get(name)

    def all(self) -> list[str]:
        with self._lock:
            return list(self._users)       # a copy: callers never see a dict changing under them


def main() -> None:
    r = Registry()
    with ThreadPoolExecutor(max_workers=8) as pool:
        wins = sum(pool.map(lambda i: r.register("neo", i), range(100)))
    print(f"owners of neo: {wins}")
    owner = r.owner_of("neo")
    assert owner is not None
    print(f"rename neo->trinity: {str(r.rename('neo', 'trinity', owner)).lower()}")
    print(f"register trinity again: {str(r.register('trinity', 777)).lower()}")
    r.register("morpheus", 7)
    print(f"rename by non-owner: {str(r.rename('morpheus', 'oracle', 8)).lower()}")
    print(f"rename into taken name: {str(r.rename('morpheus', 'trinity', 7)).lower()}")
    print("names: [" + ", ".join(sorted(r.all())) + "]")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `// One event-loop thread: each method below runs to completion, so check-then-insert needs no lock.
// It would race only if an await sat between the check and the insert.
class Registry {
  private readonly users = new Map<string, number>();

  register(name: string, id: number): boolean {
    if (this.users.has(name)) return false;
    this.users.set(name, id);
    return true;
  }

  rename(oldName: string, newName: string, id: number): boolean {
    if (this.users.get(oldName) !== id || this.users.has(newName)) return false;
    this.users.delete(oldName);
    this.users.set(newName, id);
    return true;
  }

  ownerOf(name: string): number | undefined {
    return this.users.get(name);
  }

  all(): string[] {
    return [...this.users.keys()];
  }
}

async function main(): Promise<void> {
  const r = new Registry();
  const attempts = Array.from({ length: 100 }, async (_, id) => {
    await Promise.resolve();                // 100 sign-ups interleave at this point
    return r.register("neo", id);
  });
  const wins = (await Promise.all(attempts)).filter(Boolean).length;
  console.log("owners of neo: " + wins);
  const owner = r.ownerOf("neo") as number;
  console.log("rename neo->trinity: " + r.rename("neo", "trinity", owner));
  console.log("register trinity again: " + r.register("trinity", 777));
  r.register("morpheus", 7);
  console.log("rename by non-owner: " + r.rename("morpheus", "oracle", 8));
  console.log("rename into taken name: " + r.rename("morpheus", "trinity", 7));
  console.log("names: [" + r.all().sort().join(", ") + "]");
}

main();` },
          { lang: 'cpp', code: `class Registry {
    unordered_map<string, long long> users_;
    mutable mutex mu_;                       // every compound action holds it for its whole duration

public:
    bool register_(const string& name, long long id) {     // "register" is a C++ keyword
        lock_guard lk(mu_);
        return users_.try_emplace(name, id).second;         // check + insert in one call
    }

    bool rename(const string& oldName, const string& newName, long long id) {
        lock_guard lk(mu_);
        auto it = users_.find(oldName);
        if (it == users_.end() || it->second != id || users_.count(newName)) return false;
        users_.erase(it);
        users_.emplace(newName, id);
        return true;
    }

    optional<long long> ownerOf(const string& name) const {
        lock_guard lk(mu_);
        auto it = users_.find(name);
        if (it == users_.end()) return nullopt;
        return it->second;
    }

    vector<string> all() const {
        lock_guard lk(mu_);
        vector<string> names;
        for (const auto& [n, id] : users_) names.push_back(n);
        return names;                        // a copy, safe to use after the lock is gone
    }
};

const char* yn(bool b) { return b ? "true" : "false"; }

int main() {
    Registry r;
    atomic<int> wins{0};
    vector<thread> pool;
    for (int t = 0; t < 8; t++)
        pool.emplace_back([&, t] { for (int i = t; i < 100; i += 8) if (r.register_("neo", i)) wins++; });
    for (auto& th : pool) th.join();
    cout << "owners of neo: " << wins << "\\n";
    long long owner = *r.ownerOf("neo");
    cout << "rename neo->trinity: " << yn(r.rename("neo", "trinity", owner)) << "\\n";
    cout << "register trinity again: " << yn(r.register_("trinity", 777)) << "\\n";
    r.register_("morpheus", 7);
    cout << "rename by non-owner: " << yn(r.rename("morpheus", "oracle", 8)) << "\\n";
    cout << "rename into taken name: " << yn(r.rename("morpheus", "trinity", 7)) << "\\n";
    auto names = r.all();
    sort(names.begin(), names.end());
    cout << "names: [";
    for (size_t i = 0; i < names.size(); i++) cout << (i ? ", " : "") << names[i];
    cout << "]\\n";
}` }
        ],
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
}`, alt: [
          { lang: 'python', code: `import math
import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor


class TokenBucket:
    def __init__(self, capacity: int, tokens_per_second: float, clock: Callable[[], int]) -> None:
        if capacity <= 0 or tokens_per_second <= 0:
            raise ValueError("bad limits")
        self._capacity = capacity
        self._refill_per_nano = tokens_per_second / 1_000_000_000
        self._clock = clock                  # time.monotonic_ns in production, a fake clock in tests
        self._lock = threading.Lock()
        self._tokens = float(capacity)       # guarded by _lock; start full: allows an initial burst
        self._last_refill = clock()          # guarded by _lock

    def try_acquire(self, permits: int) -> bool:
        """Refill + check + take happen under ONE lock hold: no two threads can take the same token."""
        if permits <= 0 or permits > self._capacity:
            raise ValueError("permits")
        with self._lock:
            self._refill()
            if self._tokens >= permits:
                self._tokens -= permits
                return True
            return False

    def nanos_until(self, permits: int) -> int:
        """How long until \`permits\` tokens will exist (for a Retry-After header)."""
        with self._lock:
            self._refill()
            return 0 if self._tokens >= permits else math.ceil((permits - self._tokens) / self._refill_per_nano)

    def _refill(self) -> None:               # lazy: no background thread, O(1)
        now = self._clock()
        elapsed = now - self._last_refill
        if elapsed > 0:
            self._tokens = min(self._capacity, self._tokens + elapsed * self._refill_per_nano)
            self._last_refill = now


def main() -> None:
    fake_now = [0]                           # we control time: no sleeping
    b = TokenBucket(4, 2.0, lambda: fake_now[0])   # burst 4, 2 per second
    print("t=0.0: " + " ".join("Y" if b.try_acquire(1) else "N" for _ in range(5)))   # Y Y Y Y N
    fake_now[0] = 500_000_000                # +0.5 s => +1 token
    first, second = b.try_acquire(1), b.try_acquire(1)
    print(f"t=0.5: {str(first).lower()} then {str(second).lower()}")             # true then false
    print(f"retry after ms: {b.nanos_until(1) // 1_000_000}")                      # 500

    # concurrency check: 8 threads x 100 attempts at a frozen time => exactly 4 succeed
    shared = TokenBucket(4, 2.0, lambda: 0)
    with ThreadPoolExecutor(max_workers=8) as pool:
        granted = sum(pool.map(lambda _: shared.try_acquire(1), range(800)))
    print(f"granted under contention: {granted}")                                  # 4


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `class TokenBucket {
  private readonly refillPerNano: number;
  private tokens: number;
  private lastRefill: number;

  // clock: performance.now() * 1e6 in production, a fake clock in tests
  constructor(private readonly capacity: number, tokensPerSecond: number, private readonly clock: () => number) {
    if (capacity <= 0 || tokensPerSecond <= 0) throw new Error("bad limits");
    this.refillPerNano = tokensPerSecond / 1_000_000_000;
    this.tokens = capacity; // start full: allows an initial burst
    this.lastRefill = clock();
  }

  // refill + check + take is one synchronous step: no two tasks can take the same token
  tryAcquire(permits: number): boolean {
    if (permits <= 0 || permits > this.capacity) throw new Error("permits");
    this.refill();
    if (this.tokens >= permits) {
      this.tokens -= permits;
      return true;
    }
    return false;
  }

  // how long until "permits" tokens will exist (for a Retry-After header)
  nanosUntil(permits: number): number {
    this.refill();
    return this.tokens >= permits ? 0 : Math.ceil((permits - this.tokens) / this.refillPerNano);
  }

  private refill(): void {
    // lazy: no timer, O(1)
    const now = this.clock();
    const elapsed = now - this.lastRefill;
    if (elapsed > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerNano);
      this.lastRefill = now;
    }
  }
}

async function main(): Promise<void> {
  let fakeNow = 0; // we control time: no sleeping
  const b = new TokenBucket(4, 2.0, () => fakeNow); // burst 4, 2 per second
  let line = "t=0.0: ";
  for (let i = 0; i < 5; i++) line += b.tryAcquire(1) ? "Y " : "N ";
  console.log(line); // Y Y Y Y N
  fakeNow = 500_000_000; // +0.5 s => +1 token
  const first = b.tryAcquire(1);
  const second = b.tryAcquire(1);
  console.log("t=0.5: " + first + " then " + second); // true then false
  console.log("retry after ms: " + Math.floor(b.nanosUntil(1) / 1_000_000)); // 500

  // concurrency check: 800 attempts at a frozen time => exactly 4 succeed
  const shared = new TokenBucket(4, 2.0, () => 0);
  const results = await Promise.all(
    Array.from({ length: 800 }, async () => {
      await Promise.resolve();
      return shared.tryAcquire(1);
    }),
  );
  console.log("granted under contention: " + results.filter(Boolean).length); // 4
}

main();` },
          { lang: 'cpp', code: `class TokenBucket {
    long long capacity_;
    double refillPerNano_;
    function<long long()> clock_;      // steady_clock nanoseconds in production, a fake clock in tests
    mutex mu_;
    double tokens_;                    // guarded by mu_
    long long lastRefill_;             // guarded by mu_

    void refill() {                    // lazy: no background thread, O(1); caller holds mu_
        long long now = clock_();
        long long elapsed = now - lastRefill_;
        if (elapsed > 0) {
            tokens_ = min<double>(capacity_, tokens_ + elapsed * refillPerNano_);
            lastRefill_ = now;
        }
    }

public:
    TokenBucket(long long capacity, double tokensPerSecond, function<long long()> clock)
        : capacity_(capacity), refillPerNano_(tokensPerSecond / 1'000'000'000.0), clock_(std::move(clock)) {
        if (capacity <= 0 || tokensPerSecond <= 0) throw invalid_argument("bad limits");
        tokens_ = capacity;            // start full: allows an initial burst
        lastRefill_ = clock_();
    }

    // refill + check + take happen under ONE lock hold: no two threads can take the same token
    bool tryAcquire(int permits) {
        if (permits <= 0 || permits > capacity_) throw invalid_argument("permits");
        lock_guard lk(mu_);
        refill();
        if (tokens_ >= permits) { tokens_ -= permits; return true; }
        return false;
    }

    // how long until "permits" tokens will exist (for a Retry-After header)
    long long nanosUntil(int permits) {
        lock_guard lk(mu_);
        refill();
        return tokens_ >= permits ? 0 : static_cast<long long>(ceil((permits - tokens_) / refillPerNano_));
    }
};

int main() {
    atomic<long long> fakeNow{0};                             // we control time: no sleeping
    TokenBucket b(4, 2.0, [&] { return fakeNow.load(); });    // burst 4, 2 per second
    string line = "t=0.0: ";
    for (int i = 0; i < 5; i++) line += b.tryAcquire(1) ? "Y " : "N ";
    cout << line << "\\n";                                     // Y Y Y Y N
    fakeNow = 500'000'000;                                    // +0.5 s => +1 token
    bool first = b.tryAcquire(1), second = b.tryAcquire(1);
    cout << boolalpha << "t=0.5: " << first << " then " << second << "\\n";   // true then false
    cout << "retry after ms: " << b.nanosUntil(1) / 1'000'000 << "\\n";        // 500

    // concurrency check: 8 threads x 100 attempts at a frozen time => exactly 4 succeed
    TokenBucket shared(4, 2.0, [] { return 0LL; });
    atomic<int> ok{0};
    {
        vector<jthread> pool;
        for (int t = 0; t < 8; t++)
            pool.emplace_back([&] { for (int i = 0; i < 100; i++) if (shared.tryAcquire(1)) ok++; });
    }
    cout << "granted under contention: " << ok << "\\n";                           // 4
}` }
        ] }, { lang: 'java', title: 'Lock-free variant (CAS on an immutable state) + per-client limiter', code: `class CasTokenBucket {
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
}`, alt: [
          { lang: 'python', code: `import threading
from collections.abc import Callable
from typing import Generic, NamedTuple, TypeVar

T = TypeVar("T")


class AtomicReference(Generic[T]):
    """CPython has no hardware compare-and-set, so this emulates one with a tiny lock.
    The retry-loop SHAPE below is what matters; on the JVM or in C++ it is a real CAS."""

    def __init__(self, value: T) -> None:
        self._value = value
        self._lock = threading.Lock()

    def get(self) -> T:
        return self._value

    def compare_and_set(self, expected: T, new: T) -> bool:
        with self._lock:
            if self._value is expected:      # identity, like Java's ==
                self._value = new
                return True
            return False


class State(NamedTuple):                     # immutable snapshot of both fields
    tokens: float
    last: int


class CasTokenBucket:
    def __init__(self, capacity: float, per_second: float, clock: Callable[[], int]) -> None:
        self._capacity = capacity
        self._per_nano = per_second / 1e9
        self._clock = clock
        self._state = AtomicReference(State(capacity, clock()))

    def try_acquire(self) -> bool:
        while True:                          # classic CAS retry loop
            s = self._state.get()
            now = max(self._clock(), s.last)
            t = min(self._capacity, s.tokens + (now - s.last) * self._per_nano)
            if t < 1:
                return False
            if self._state.compare_and_set(s, State(t - 1, now)):
                return True
            # another thread changed the state between get() and CAS: recompute and retry


class RateLimiter:
    def __init__(self, capacity: float, per_second: float, clock: Callable[[], int]) -> None:
        self._buckets: dict[str, CasTokenBucket] = {}
        self._lock = threading.Lock()
        self._capacity, self._per_second, self._clock = capacity, per_second, clock

    def allow(self, client_id: str) -> bool:
        with self._lock:                     # one bucket per client, created exactly once
            bucket = self._buckets.get(client_id)
            if bucket is None:
                bucket = self._buckets[client_id] = CasTokenBucket(self._capacity, self._per_second, self._clock)
        return bucket.try_acquire()


if __name__ == "__main__":
    rl = RateLimiter(2, 1, lambda: 0)
    a, b, c, d = rl.allow("asha"), rl.allow("asha"), rl.allow("asha"), rl.allow("bala")
    print(f"{str(a).lower()} {str(b).lower()} {str(c).lower()} | bala: {str(d).lower()}")   # true true false | bala: true` },
          { lang: 'ts', code: `// One event-loop thread: a CAS is only needed if an await sits between get() and the update.
// The retry-loop shape is kept because it is the pattern to recognise (and needed with Atomics + Workers).
class AtomicReference<T> {
  constructor(private value: T) {}

  get(): T {
    return this.value;
  }

  compareAndSet(expected: T, next: T): boolean {
    if (this.value !== expected) return false; // reference equality, like Java's ==
    this.value = next;
    return true;
  }
}

interface State {
  readonly tokens: number; // immutable snapshot of both fields
  readonly last: number;
}

class CasTokenBucket {
  private readonly state: AtomicReference<State>;
  private readonly perNano: number;

  constructor(private readonly capacity: number, perSecond: number, private readonly clock: () => number) {
    this.perNano = perSecond / 1e9;
    this.state = new AtomicReference<State>({ tokens: capacity, last: clock() });
  }

  tryAcquire(): boolean {
    while (true) {
      // classic CAS retry loop
      const s = this.state.get();
      const now = Math.max(this.clock(), s.last);
      const t = Math.min(this.capacity, s.tokens + (now - s.last) * this.perNano);
      if (t < 1) return false;
      if (this.state.compareAndSet(s, { tokens: t - 1, last: now })) return true;
      // someone changed the state between get() and CAS: recompute and retry
    }
  }
}

class RateLimiter {
  private readonly buckets = new Map<string, CasTokenBucket>();

  constructor(private readonly capacity: number, private readonly perSecond: number, private readonly clock: () => number) {}

  allow(clientId: string): boolean {
    let b = this.buckets.get(clientId); // one bucket per client, created exactly once
    if (!b) this.buckets.set(clientId, (b = new CasTokenBucket(this.capacity, this.perSecond, this.clock)));
    return b.tryAcquire();
  }
}

const rl = new RateLimiter(2, 1, () => 0);
const a = rl.allow("asha");
const b = rl.allow("asha");
const c = rl.allow("asha");
const d = rl.allow("bala");
console.log(a + " " + b + " " + c + " | bala: " + d); // true true false | bala: true` },
          { lang: 'cpp', code: `class CasTokenBucket {
    struct State {                                   // immutable snapshot of both fields
        double tokens;
        long long last;
    };
    atomic<shared_ptr<const State>> state_;
    double capacity_, perNano_;
    function<long long()> clock_;

public:
    CasTokenBucket(double capacity, double perSecond, function<long long()> clock)
        : capacity_(capacity), perNano_(perSecond / 1e9), clock_(std::move(clock)) {
        state_.store(make_shared<const State>(State{capacity, clock_()}));
    }

    bool tryAcquire() {
        while (true) {                               // classic CAS retry loop
            shared_ptr<const State> s = state_.load();
            long long now = max(clock_(), s->last);
            double t = min(capacity_, s->tokens + (now - s->last) * perNano_);
            if (t < 1) return false;
            if (state_.compare_exchange_weak(s, make_shared<const State>(State{t - 1, now}))) return true;
            // another thread changed the state between load() and CAS: recompute and retry
        }
    }
};

class RateLimiter {
    unordered_map<string, shared_ptr<CasTokenBucket>> buckets_;
    mutex mu_;
    double capacity_, perSecond_;
    function<long long()> clock_;

public:
    RateLimiter(double capacity, double perSecond, function<long long()> clock)
        : capacity_(capacity), perSecond_(perSecond), clock_(std::move(clock)) {}

    bool allow(const string& clientId) {
        shared_ptr<CasTokenBucket> b;
        {
            lock_guard lk(mu_);                      // one bucket per client, created exactly once
            auto& slot = buckets_[clientId];
            if (!slot) slot = make_shared<CasTokenBucket>(capacity_, perSecond_, clock_);
            b = slot;
        }
        return b->tryAcquire();
    }
};

int main() {
    RateLimiter rl(2, 1, [] { return 0LL; });
    bool a = rl.allow("asha"), b = rl.allow("asha"), c = rl.allow("asha"), d = rl.allow("bala");
    cout << boolalpha << a << " " << b << " " << c << " | bala: " << d << "\\n";   // true true false | bala: true
}` }
        ] }],
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
}`, alt: [
          { lang: 'python', code: `import threading
import time


class TeamQuota:
    def __init__(self) -> None:
        self._capacity = 90_000.0
        self._per_nano = 1_500 / 1e9                 # 90k tokens per minute
        self._tokens = self._capacity                # guarded by _lock
        self._last = time.monotonic_ns()             # guarded by _lock
        self._lock = threading.Lock()

    def admit(self, estimated_tokens: int) -> bool:
        """The same token bucket, but each request costs \`estimated_tokens\` permits."""
        with self._lock:
            now = time.monotonic_ns()
            self._tokens = min(self._capacity, self._tokens + (now - self._last) * self._per_nano)
            self._last = now
            if self._tokens < estimated_tokens:
                return False                         # caller answers 429
            self._tokens -= estimated_tokens
            return True

    def refund(self, unused_tokens: int) -> None:
        """After the response reports real usage, give back what we over-reserved."""
        with self._lock:
            self._tokens = min(self._capacity, self._tokens + unused_tokens)` },
          { lang: 'ts', code: `class TeamQuota {
  private readonly capacity = 90_000;
  private readonly perNano = 1_500 / 1e9; // 90k tokens per minute
  private tokens = this.capacity;
  private last = performance.now() * 1e6; // nanoseconds

  // the same token bucket, but each request costs "estimatedTokens" permits
  admit(estimatedTokens: number): boolean {
    const now = performance.now() * 1e6;
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.last) * this.perNano);
    this.last = now;
    if (this.tokens < estimatedTokens) return false; // caller answers 429
    this.tokens -= estimatedTokens;
    return true;
  }

  // after the response reports real usage, give back what we over-reserved
  refund(unusedTokens: number): void {
    this.tokens = Math.min(this.capacity, this.tokens + unusedTokens);
  }
}` },
          { lang: 'cpp', code: `class TeamQuota {
    static constexpr double capacity_ = 90'000;
    static constexpr double perNano_ = 1'500 / 1e9;      // 90k tokens per minute
    double tokens_ = capacity_;                           // guarded by mu_
    chrono::steady_clock::time_point last_ = chrono::steady_clock::now();   // guarded by mu_
    mutex mu_;

public:
    // the same token bucket, but each request costs "estimatedTokens" permits
    bool admit(int estimatedTokens) {
        lock_guard lk(mu_);
        auto now = chrono::steady_clock::now();
        double nanos = chrono::duration<double, nano>(now - last_).count();
        tokens_ = min(capacity_, tokens_ + nanos * perNano_);
        last_ = now;
        if (tokens_ < estimatedTokens) return false;      // caller answers 429
        tokens_ -= estimatedTokens;
        return true;
    }

    // after the response reports real usage, give back what we over-reserved
    void refund(int unusedTokens) {
        lock_guard lk(mu_);
        tokens_ = min(capacity_, tokens_ + unusedTokens);
    }
};` }
        ] },
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
}`, alt: [
          { lang: 'python', code: `import threading
import time


class PacedClient:
    def __init__(self, per_second: float) -> None:
        self._per_nano = per_second / 1e9
        self._next_free = time.monotonic_ns()        # guarded by _lock: earliest time the next permit is free
        self._lock = threading.Lock()

    def acquire(self) -> None:
        with self._lock:                             # short critical section: just arithmetic
            now = time.monotonic_ns()
            start = max(now, self._next_free)
            wait_nanos = start - now
            self._next_free = start + int(1 / self._per_nano)   # reserve our slot
        if wait_nanos > 0:
            time.sleep(wait_nanos / 1e9)             # sleep OUTSIDE the lock` },
          { lang: 'ts', code: `class PacedClient {
  private readonly perNano: number;
  private nextFree = performance.now() * 1e6; // earliest time (ns) the next permit is free

  constructor(perSecond: number) {
    this.perNano = perSecond / 1e9;
  }

  async acquire(): Promise<void> {
    // reserve the slot synchronously: no other task can interleave with this arithmetic
    const now = performance.now() * 1e6;
    const start = Math.max(now, this.nextFree);
    const waitNanos = start - now;
    this.nextFree = start + Math.trunc(1 / this.perNano); // reserve our slot
    if (waitNanos > 0) await new Promise((r) => setTimeout(r, waitNanos / 1e6)); // waiting blocks nobody
  }
}` },
          { lang: 'cpp', code: `class PacedClient {
    using Clock = chrono::steady_clock;
    double perNano_;
    Clock::time_point nextFree_ = Clock::now();   // guarded by mu_: earliest time the next permit is free
    mutex mu_;

public:
    explicit PacedClient(double perSecond) : perNano_(perSecond / 1e9) {}

    void acquire() {
        Clock::time_point start;
        {
            lock_guard lk(mu_);                   // short critical section: just arithmetic
            auto now = Clock::now();
            start = max(now, nextFree_);
            nextFree_ = start + chrono::nanoseconds(static_cast<long long>(1 / perNano_));   // reserve our slot
        }
        this_thread::sleep_until(start);          // sleep OUTSIDE the lock (returns at once if start is past)
    }
};` }
        ] },
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
      brute: { why: `<p>Brute force A: a single <code>HashMap&lt;String, int[]&gt;</code> with no locks — the map itself can corrupt, and two threads can take the last token. Brute force B: <code>synchronized allow()</code> on the whole limiter plus a scheduled task that refills every bucket every second — correct, but one global lock serializes 100k req/s, the refill task walks a million buckets every second while holding that same lock, and refill granularity is a coarse 1 s step.</p>`, code: { lang: 'java', code: `class GlobalLockLimiter {
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
}`, alt: [{ lang: 'python', code: "import threading, time\n\nclass GlobalLockLimiter:\n    def __init__(self, capacity):\n        self.tokens = {}\n        self.capacity = capacity\n        self.lock = threading.Lock()\n        # walks EVERY client every second while holding the global lock\n        threading.Thread(target=self._refill_loop, daemon=True).start()\n\n    def allow(self, client):                          # every request in the service waits here\n        with self.lock:\n            t = self.tokens.get(client, self.capacity)\n            if t == 0: return False\n            self.tokens[client] = t - 1\n            return True\n\n    def _refill_loop(self):\n        while True:\n            time.sleep(1)\n            with self.lock:\n                for k in self.tokens: self.tokens[k] = min(self.capacity, self.tokens[k] + 1)\n" }, { lang: 'ts', code: "import { Mutex } from \"async-mutex\";\n\nclass GlobalLockLimiter {\n  private tokens = new Map<string, number>();\n  private mutex = new Mutex();\n  constructor(private capacity: number) {\n    // walks EVERY client every second while holding the global lock\n    setInterval(() => this.refillAll(), 1000);\n  }\n  allow(client: string): Promise<boolean> {           // every request in the service waits here\n    return this.mutex.runExclusive(() => {\n      const t = this.tokens.get(client) ?? this.capacity;\n      if (t === 0) return false;\n      this.tokens.set(client, t - 1);\n      return true;\n    });\n  }\n  private refillAll(): Promise<void> {\n    return this.mutex.runExclusive(() => {\n      for (const [k, v] of this.tokens) this.tokens.set(k, Math.min(this.capacity, v + 1));\n    });\n  }\n}\n" }, { lang: 'cpp', code: "class GlobalLockLimiter {\n    unordered_map<string, int> tokens;\n    int capacity;\n    mutex m;\n    void refillAll() {\n        lock_guard<mutex> g(m);\n        for (auto& kv : tokens) kv.second = min(capacity, kv.second + 1);\n    }\npublic:\n    GlobalLockLimiter(int capacity) : capacity(capacity) {\n        // walks EVERY client every second while holding the global lock\n        thread([this] { while (true) { this_thread::sleep_for(chrono::seconds(1)); refillAll(); } }).detach();\n    }\n    bool allow(const string& client) {                 // every request in the service waits here\n        lock_guard<mutex> g(m);\n        auto it = tokens.try_emplace(client, capacity).first;\n        if (it->second == 0) return false;\n        it->second--;\n        return true;\n    }\n};\n" }] } },
      mcq: { q: 'Two threads call <code>allow("asha")</code> for the first time at the same instant. With <code>buckets.computeIfAbsent(id, k -&gt; new Bucket())</code>, how many buckets exist for asha afterwards?', options: ['Two — each thread creates one', 'Exactly one — computeIfAbsent runs the factory at most once per key and both threads get the same bucket', 'Zero until the next refill', 'It depends on the hash code'], answer: 1, explain: 'CHM.computeIfAbsent is atomic per key. A <code>get</code>, then <code>if null put(new)</code> sequence would race and could hand the two threads different buckets — each would get a full burst.' },
      hints: [`<p>Hint 1: Separate the problem: (a) find-or-create the client's bucket atomically, (b) make one bucket's refill+check+take atomic. Different clients should never share a lock.</p>`, `<p>Hint 2: <code>ConcurrentHashMap.computeIfAbsent</code> for (a); a small <code>synchronized</code> method on the bucket for (b). Refill lazily from elapsed nanoTime.</p>`, `<p>Hint 3: Inject a clock for testing. retryAfter = ceil((1 − tokens) / rate). Edge cases: elapsed ≤ 0, idle client must not exceed capacity, permits &gt; capacity is invalid.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "YYYN retry=1000ms bala=true\nafter 1s: true retry=1000ms unknown=0ms\ntracked=2\ntracked after idle=0\nadmitted=3\n" }] },
      solution: {
        approach: `<p>Per-client <b>lazy-refill token bucket</b> stored in a <code>ConcurrentHashMap</code>. Lock scope = one bucket, so contention only happens among a single client's own concurrent requests. Each bucket holds <code>tokens</code> and <code>lastRefill</code> under its monitor; <code>allow</code> refills from elapsed time, checks, and decrements in one critical section. Idle buckets can be evicted safely because a bucket idle for ≥ capacity/rate seconds is indistinguishable from a new one. (A request that fetched the bucket a microsecond before eviction still spends from the evicted copy, so at most the in-flight requests at that instant can slip through — fine for a limiter; if it is not, evict inside <code>computeIfPresent</code> and re-check in <code>allow</code>.)</p>
<p><b>In Python, TypeScript and C++.</b> The structure is the same everywhere: a map from client to bucket, and a lock (or none) scoped to one bucket. Python gives each <code>Bucket</code> its own <code>Lock</code> and guards the dict with a second, short-lived one. C++ stores <code>shared_ptr&lt;Bucket&gt;</code> so a bucket that <code>evictIdle</code> erases stays alive for a request that already holds it. TypeScript buckets need no lock because refill, check and take run in one synchronous step.</p>`,
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

    int tracked() { return buckets.size(); }

    // call from a single housekeeping thread now and then: drop buckets that are full again
    void evictIdle() {
        long now = clock.getAsLong();
        buckets.forEach((id, b) -> { if (b.isFullAt(now)) buckets.remove(id, b); });
    }
}

class RateLimiterDemo {
    public static void main(String[] args) throws InterruptedException {
        AtomicLong now = new AtomicLong();
        ClientRateLimiter rl = new ClientRateLimiter(3, 1, now::get);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 4; i++) sb.append(rl.allow("asha") ? "Y" : "N");
        System.out.println(sb + " retry=" + rl.retryAfterMillis("asha") + "ms bala=" + rl.allow("bala")); // YYYN retry=1000ms bala=true

        now.set(1_000_000_000L);                                   // one second later: one token has refilled
        System.out.println("after 1s: " + rl.allow("asha") + " retry=" + rl.retryAfterMillis("asha")
                + "ms unknown=" + rl.retryAfterMillis("zed") + "ms");
        System.out.println("tracked=" + rl.tracked());
        now.set(10_000_000_000L);                                  // long idle: every bucket is full again
        rl.evictIdle();
        System.out.println("tracked after idle=" + rl.tracked());

        // 50 threads hammer one client at frozen time: exactly 3 admitted
        AtomicInteger ok = new AtomicInteger();
        ClientRateLimiter rl2 = new ClientRateLimiter(3, 1, () -> 0L);
        ExecutorService pool = Executors.newFixedThreadPool(50);
        for (int i = 0; i < 500; i++) pool.execute(() -> { if (rl2.allow("hot")) ok.incrementAndGet(); });
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("admitted=" + ok.get());   // 3
    }
}`, alt: [
          { lang: 'python', code: `import math
import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor


class Bucket:
    def __init__(self, capacity: float, per_second: float, now: int) -> None:
        self._capacity = capacity
        self._per_nano = per_second / 1e9
        self._tokens = capacity
        self._last = now
        self._lock = threading.Lock()       # one lock per client: other clients never wait on it

    def _refill(self, now: int) -> None:
        if now > self._last:
            self._tokens = min(self._capacity, self._tokens + (now - self._last) * self._per_nano)
            self._last = now

    def take(self, now: int) -> bool:
        with self._lock:
            self._refill(now)
            if self._tokens >= 1:
                self._tokens -= 1
                return True
            return False

    def retry_after_nanos(self, now: int) -> int:
        with self._lock:
            self._refill(now)
            return 0 if self._tokens >= 1 else math.ceil((1 - self._tokens) / self._per_nano)

    def is_full_at(self, now: int) -> bool:
        with self._lock:
            self._refill(now)
            return self._tokens >= self._capacity


class ClientRateLimiter:
    def __init__(self, capacity: float, per_second: float, clock: Callable[[], int]) -> None:
        self._capacity = capacity
        self._per_second = per_second
        self._clock = clock                  # nanoseconds; injectable so tests can freeze time
        self._buckets: dict[str, Bucket] = {}
        self._map_lock = threading.Lock()    # guards only the dict, held for a lookup

    def _bucket(self, client_id: str, now: int) -> Bucket:
        with self._map_lock:
            b = self._buckets.get(client_id)
            if b is None:
                b = self._buckets[client_id] = Bucket(self._capacity, self._per_second, now)
            return b

    def allow(self, client_id: str) -> bool:
        now = self._clock()
        return self._bucket(client_id, now).take(now)

    def retry_after_millis(self, client_id: str) -> int:
        with self._map_lock:
            b = self._buckets.get(client_id)
        return 0 if b is None else b.retry_after_nanos(self._clock()) // 1_000_000

    def tracked(self) -> int:
        with self._map_lock:
            return len(self._buckets)

    def evict_idle(self) -> None:
        """Call from a housekeeping thread: drop buckets that are full again."""
        now = self._clock()
        with self._map_lock:
            for client_id, b in list(self._buckets.items()):
                if b.is_full_at(now):
                    del self._buckets[client_id]


def main() -> None:
    now = [0]
    rl = ClientRateLimiter(3, 1, lambda: now[0])
    seq = "".join("Y" if rl.allow("asha") else "N" for _ in range(4))
    print(f"{seq} retry={rl.retry_after_millis('asha')}ms bala={str(rl.allow('bala')).lower()}")

    now[0] = 1_000_000_000                   # one second later: one token has refilled
    print(f"after 1s: {str(rl.allow('asha')).lower()} retry={rl.retry_after_millis('asha')}ms "
          f"unknown={rl.retry_after_millis('zed')}ms")
    print(f"tracked={rl.tracked()}")
    now[0] = 10_000_000_000                  # long idle: every bucket is full again
    rl.evict_idle()
    print(f"tracked after idle={rl.tracked()}")

    # 50 threads hammer one client at frozen time: exactly 3 admitted
    rl2 = ClientRateLimiter(3, 1, lambda: 0)
    with ThreadPoolExecutor(max_workers=50) as pool:
        admitted = sum(pool.map(lambda _: rl2.allow("hot"), range(500)))
    print(f"admitted={admitted}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `type Clock = () => number; // nanoseconds, injectable so tests can freeze time

class Bucket {
  private tokens: number;
  private last: number;
  private readonly perNano: number;

  constructor(private readonly capacity: number, perSecond: number, now: number) {
    this.perNano = perSecond / 1e9;
    this.tokens = capacity;
    this.last = now;
  }

  private refill(now: number): void {
    if (now > this.last) {
      this.tokens = Math.min(this.capacity, this.tokens + (now - this.last) * this.perNano);
      this.last = now;
    }
  }

  // No lock needed: refill-then-take runs to completion before any other task starts.
  take(now: number): boolean {
    this.refill(now);
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  retryAfterNanos(now: number): number {
    this.refill(now);
    return this.tokens >= 1 ? 0 : Math.ceil((1 - this.tokens) / this.perNano);
  }

  isFullAt(now: number): boolean {
    this.refill(now);
    return this.tokens >= this.capacity;
  }
}

class ClientRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly capacity: number,
    private readonly perSecond: number,
    private readonly clock: Clock,
  ) {}

  allow(clientId: string): boolean {
    const now = this.clock();
    let b = this.buckets.get(clientId);
    if (!b) {
      b = new Bucket(this.capacity, this.perSecond, now);
      this.buckets.set(clientId, b);
    }
    return b.take(now);
  }

  retryAfterMillis(clientId: string): number {
    const b = this.buckets.get(clientId);
    return b ? Math.floor(b.retryAfterNanos(this.clock()) / 1_000_000) : 0;
  }

  tracked(): number {
    return this.buckets.size;
  }

  // Call from a timer now and then: drop buckets that are full again.
  evictIdle(): void {
    const now = this.clock();
    for (const [id, b] of this.buckets) if (b.isFullAt(now)) this.buckets.delete(id);
  }
}

async function main(): Promise<void> {
  let now = 0;
  const rl = new ClientRateLimiter(3, 1, () => now);
  let seq = "";
  for (let i = 0; i < 4; i++) seq += rl.allow("asha") ? "Y" : "N";
  console.log(seq + " retry=" + rl.retryAfterMillis("asha") + "ms bala=" + rl.allow("bala"));

  now = 1_000_000_000; // one second later: one token has refilled
  console.log("after 1s: " + rl.allow("asha") + " retry=" + rl.retryAfterMillis("asha") +
    "ms unknown=" + rl.retryAfterMillis("zed") + "ms");
  console.log("tracked=" + rl.tracked());
  now = 10_000_000_000; // long idle: every bucket is full again
  rl.evictIdle();
  console.log("tracked after idle=" + rl.tracked());

  // 500 concurrent requests for one client at frozen time: exactly 3 admitted
  const rl2 = new ClientRateLimiter(3, 1, () => 0);
  const results = await Promise.all(
    Array.from({ length: 500 }, async () => {
      await Promise.resolve();
      return rl2.allow("hot");
    }),
  );
  console.log("admitted=" + results.filter(Boolean).length);
}

main();` },
          { lang: 'cpp', code: `using Clock = function<long long()>;               // nanoseconds, injectable so tests can freeze time

class Bucket {
    double capacity_, perNano_, tokens_;
    long long last_;
    mutex mu_;                                     // one lock per client

    void refill(long long now) {
        if (now > last_) {
            tokens_ = min(capacity_, tokens_ + (now - last_) * perNano_);
            last_ = now;
        }
    }

public:
    Bucket(double capacity, double perSecond, long long now)
        : capacity_(capacity), perNano_(perSecond / 1e9), tokens_(capacity), last_(now) {}

    bool take(long long now) {
        lock_guard lk(mu_);
        refill(now);
        if (tokens_ >= 1) { tokens_ -= 1; return true; }
        return false;
    }
    long long retryAfterNanos(long long now) {
        lock_guard lk(mu_);
        refill(now);
        return tokens_ >= 1 ? 0 : static_cast<long long>(ceil((1 - tokens_) / perNano_));
    }
    bool isFullAt(long long now) {
        lock_guard lk(mu_);
        refill(now);
        return tokens_ >= capacity_;
    }
};

class ClientRateLimiter {
    unordered_map<string, shared_ptr<Bucket>> buckets_;
    mutex mapMu_;                                  // guards only the map, held for a lookup
    double capacity_, perSecond_;
    Clock clock_;

public:
    ClientRateLimiter(double capacity, double perSecond, Clock clock)
        : capacity_(capacity), perSecond_(perSecond), clock_(std::move(clock)) {}

    bool allow(const string& clientId) {
        long long now = clock_();
        shared_ptr<Bucket> b;
        {
            lock_guard lk(mapMu_);
            auto& slot = buckets_[clientId];
            if (!slot) slot = make_shared<Bucket>(capacity_, perSecond_, now);
            b = slot;                              // keep it alive even if evictIdle erases it
        }
        return b->take(now);
    }

    long long retryAfterMillis(const string& clientId) {
        shared_ptr<Bucket> b;
        {
            lock_guard lk(mapMu_);
            auto it = buckets_.find(clientId);
            if (it == buckets_.end()) return 0;
            b = it->second;
        }
        return b->retryAfterNanos(clock_()) / 1'000'000;
    }

    size_t tracked() {
        lock_guard lk(mapMu_);
        return buckets_.size();
    }

    void evictIdle() {                             // call from a housekeeping thread
        long long now = clock_();
        lock_guard lk(mapMu_);
        for (auto it = buckets_.begin(); it != buckets_.end();)
            it = it->second->isFullAt(now) ? buckets_.erase(it) : next(it);
    }
};

int main() {
    atomic<long long> now{0};
    ClientRateLimiter rl(3, 1, [&] { return now.load(); });
    string seq;
    for (int i = 0; i < 4; i++) seq += rl.allow("asha") ? "Y" : "N";
    cout << seq << " retry=" << rl.retryAfterMillis("asha") << "ms bala=" << boolalpha << rl.allow("bala") << "\\n";

    now = 1'000'000'000;                           // one second later: one token has refilled
    cout << "after 1s: " << rl.allow("asha") << " retry=" << rl.retryAfterMillis("asha")
         << "ms unknown=" << rl.retryAfterMillis("zed") << "ms\\n";
    cout << "tracked=" << rl.tracked() << "\\n";
    now = 10'000'000'000;                          // long idle: every bucket is full again
    rl.evictIdle();
    cout << "tracked after idle=" << rl.tracked() << "\\n";

    // 50 threads hammer one client at frozen time: exactly 3 admitted
    ClientRateLimiter rl2(3, 1, [] { return 0LL; });
    atomic<int> ok{0};
    vector<thread> pool;
    for (int t = 0; t < 50; t++)
        pool.emplace_back([&] { for (int i = 0; i < 10; i++) if (rl2.allow("hot")) ok++; });
    for (auto& th : pool) th.join();
    cout << "admitted=" << ok << "\\n";
}` }
        ],
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
}`, alt: [
          { lang: 'python', code: `import threading
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, field


@dataclass
class Log:
    lock: threading.Lock = field(default_factory=threading.Lock)   # guards only this key's log
    times: deque[int] = field(default_factory=deque)               # timestamps of ACCEPTED requests, oldest first


class SlidingWindowLogLimiter:
    def __init__(self, limit: int, window_seconds: float, clock: Callable[[], int]) -> None:
        self._limit = limit
        self._window_nanos = int(window_seconds * 1_000_000_000)
        self._clock = clock
        self._logs: dict[str, Log] = {}
        self._map_lock = threading.Lock()

    def allow(self, key: str) -> bool:
        with self._map_lock:
            log = self._logs.setdefault(key, Log())
        with log.lock:                                    # lock ONLY this key's log
            now = self._clock()
            while log.times and log.times[0] <= now - self._window_nanos:
                log.times.popleft()                       # slide out
            if len(log.times) < self._limit:
                log.times.append(now)
                return True
            return False                                  # rejected requests are NOT logged


if __name__ == "__main__":
    t = [0]
    rl = SlidingWindowLogLimiter(3, 10, lambda: t[0])
    out = []
    for s in (1, 2, 3, 8, 11, 12, 13, 14, 25):
        t[0] = s * 1_000_000_000
        out.append(f"{s}:{'Y' if rl.allow('u1') else 'N'}")
    print(" ".join(out))   # 1:Y 2:Y 3:Y 8:N 11:Y 12:Y 13:Y 14:N 25:Y` },
          { lang: 'ts', code: `class SlidingWindowLogLimiter {
  // key -> timestamps of ACCEPTED requests, oldest first
  private readonly logs = new Map<string, number[]>();
  private readonly windowNanos: number;

  constructor(private readonly limit: number, windowSeconds: number, private readonly clock: () => number) {
    this.windowNanos = windowSeconds * 1e9;
  }

  allow(key: string): boolean {
    let log = this.logs.get(key);
    if (!log) this.logs.set(key, (log = []));
    const now = this.clock();
    let drop = 0;
    while (drop < log.length && log[drop] <= now - this.windowNanos) drop++; // slide out
    if (drop > 0) log.splice(0, drop);
    if (log.length < this.limit) {
      log.push(now);
      return true;
    }
    return false; // rejected requests are NOT logged
  }
}

let t = 0;
const rl = new SlidingWindowLogLimiter(3, 10, () => t);
const out: string[] = [];
for (const s of [1, 2, 3, 8, 11, 12, 13, 14, 25]) {
  t = s * 1e9;
  out.push(s + (rl.allow("u1") ? ":Y" : ":N"));
}
console.log(out.join(" ")); // 1:Y 2:Y 3:Y 8:N 11:Y 12:Y 13:Y 14:N 25:Y` },
          { lang: 'cpp', code: `class SlidingWindowLogLimiter {
    struct Log {
        mutex mu;                                      // guards only this key's log
        deque<long long> times;                        // timestamps of ACCEPTED requests, oldest first
    };
    int limit_;
    long long windowNanos_;
    function<long long()> clock_;
    unordered_map<string, shared_ptr<Log>> logs_;
    mutex mapMu_;

public:
    SlidingWindowLogLimiter(int limit, long long windowSeconds, function<long long()> clock)
        : limit_(limit), windowNanos_(windowSeconds * 1'000'000'000LL), clock_(std::move(clock)) {}

    bool allow(const string& key) {
        shared_ptr<Log> log;
        {
            lock_guard lk(mapMu_);
            auto& slot = logs_[key];
            if (!slot) slot = make_shared<Log>();
            log = slot;
        }
        lock_guard lk(log->mu);                        // lock ONLY this key's log
        long long now = clock_();
        while (!log->times.empty() && log->times.front() <= now - windowNanos_) log->times.pop_front();   // slide out
        if (static_cast<int>(log->times.size()) < limit_) { log->times.push_back(now); return true; }
        return false;                                  // rejected requests are NOT logged
    }
};

int main() {
    atomic<long long> t{0};
    SlidingWindowLogLimiter rl(3, 10, [&] { return t.load(); });
    string out;
    for (long long s : {1, 2, 3, 8, 11, 12, 13, 14, 25}) {
        t = s * 1'000'000'000LL;
        out += to_string(s) + (rl.allow("u1") ? ":Y " : ":N ");
    }
    cout << out << "\\n";   // 1:Y 2:Y 3:Y 8:N 11:Y 12:Y 13:Y 14:N 25:Y
}` }
        ] }, { lang: 'java', title: 'Sliding window COUNTER limiter: O(1) memory per key', code: `class SlidingWindowCounterLimiter {
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
}`, alt: [
          { lang: 'python', code: `import threading
from collections.abc import Callable
from dataclasses import dataclass, field


@dataclass
class Window:                                           # guarded by its own lock
    start: int                                          # start of the current fixed window
    prev: int = 0
    curr: int = 0
    lock: threading.Lock = field(default_factory=threading.Lock)


class SlidingWindowCounterLimiter:
    def __init__(self, limit: int, window_nanos: int, clock: Callable[[], int]) -> None:
        self._limit = limit
        self._w = window_nanos
        self._clock = clock
        self._windows: dict[str, Window] = {}
        self._map_lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = self._clock()
        with self._map_lock:
            win = self._windows.get(key)
            if win is None:
                win = self._windows[key] = Window(now - now % self._w)
        with win.lock:
            current_start = now - now % self._w
            if current_start != win.start:               # roll forward
                win.prev = win.curr if current_start - win.start == self._w else 0   # gap of 2+ windows => 0
                win.curr = 0
                win.start = current_start
            weight_prev = 1.0 - (now - win.start) / self._w
            estimate = win.prev * weight_prev + win.curr
            if estimate + 1 <= self._limit:
                win.curr += 1
                return True
            return False


if __name__ == "__main__":
    t = [0]
    sec = 1_000_000_000
    rl = SlidingWindowCounterLimiter(3, 10 * sec, lambda: t[0])
    out = []
    for s in (8, 9, 9, 10, 11, 16, 19):
        t[0] = s * sec
        out.append(f"{s}:{'Y' if rl.allow('u') else 'N'}")
    print(" ".join(out))   # 8:Y 9:Y 9:Y 10:N 11:N 16:Y 19:Y  (no boundary burst at 10-11)` },
          { lang: 'ts', code: `interface WindowState {
  start: number; // start of the current fixed window
  prev: number;
  curr: number;
}

class SlidingWindowCounterLimiter {
  private readonly windows = new Map<string, WindowState>();

  constructor(private readonly limit: number, private readonly w: number, private readonly clock: () => number) {}

  allow(key: string): boolean {
    const now = this.clock();
    const currentStart = now - (now % this.w);
    let win = this.windows.get(key);
    if (!win) {
      win = { start: currentStart, prev: 0, curr: 0 };
      this.windows.set(key, win);
    }
    if (currentStart !== win.start) {
      // roll forward
      win.prev = currentStart - win.start === this.w ? win.curr : 0; // gap of 2+ windows => 0
      win.curr = 0;
      win.start = currentStart;
    }
    const weightPrev = 1.0 - (now - win.start) / this.w;
    const estimate = win.prev * weightPrev + win.curr;
    if (estimate + 1 <= this.limit) {
      win.curr++;
      return true;
    }
    return false;
  }
}

let t = 0;
const sec = 1_000_000_000;
const rl = new SlidingWindowCounterLimiter(3, 10 * sec, () => t);
const out: string[] = [];
for (const s of [8, 9, 9, 10, 11, 16, 19]) {
  t = s * sec;
  out.push(s + (rl.allow("u") ? ":Y" : ":N"));
}
console.log(out.join(" ")); // 8:Y 9:Y 9:Y 10:N 11:N 16:Y 19:Y  (no boundary burst at 10-11)` },
          { lang: 'cpp', code: `class SlidingWindowCounterLimiter {
    struct Window {                                    // guarded by its own mutex
        mutex mu;
        long long start = 0;                           // start of the current fixed window
        int prev = 0, curr = 0;
    };
    int limit_;
    long long w_;                                      // window length in nanos
    function<long long()> clock_;
    unordered_map<string, shared_ptr<Window>> windows_;
    mutex mapMu_;

public:
    SlidingWindowCounterLimiter(int limit, long long windowNanos, function<long long()> clock)
        : limit_(limit), w_(windowNanos), clock_(std::move(clock)) {}

    bool allow(const string& key) {
        long long now = clock_();
        shared_ptr<Window> win;
        {
            lock_guard lk(mapMu_);
            auto& slot = windows_[key];
            if (!slot) { slot = make_shared<Window>(); slot->start = now - now % w_; }
            win = slot;
        }
        lock_guard lk(win->mu);
        long long currentStart = now - now % w_;
        if (currentStart != win->start) {              // roll forward
            win->prev = (currentStart - win->start == w_) ? win->curr : 0;   // gap of 2+ windows => 0
            win->curr = 0;
            win->start = currentStart;
        }
        double weightPrev = 1.0 - static_cast<double>(now - win->start) / w_;
        double estimate = win->prev * weightPrev + win->curr;
        if (estimate + 1 <= limit_) { win->curr++; return true; }
        return false;
    }
};

int main() {
    atomic<long long> t{0};
    const long long sec = 1'000'000'000LL;
    SlidingWindowCounterLimiter rl(3, 10 * sec, [&] { return t.load(); });
    string out;
    for (long long s : {8, 9, 9, 10, 11, 16, 19}) {
        t = s * sec;
        out += to_string(s) + (rl.allow("u") ? ":Y " : ":N ");
    }
    cout << out << "\\n";   // 8:Y 9:Y 9:Y 10:N 11:N 16:Y 19:Y  (no boundary burst at 10-11)
}` }
        ] }],
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
}`, alt: [
          { lang: 'python', code: `import threading


class FixedWindowLimiter:
    def __init__(self, limit: int, window_millis: int) -> None:
        self._counts: dict[str, int] = {}
        self._limit = limit
        self._window = window_millis
        self._lock = threading.Lock()

    def allow(self, client: str, now_millis: int) -> bool:
        key = f"{client}:{now_millis // self._window}"
        with self._lock:                                   # atomic per key: no lost increments
            after = self._counts.get(key, 0) + 1
            self._counts[key] = after
        return after <= self._limit    # note: still counts rejected hits (fine for fixed window)` },
          { lang: 'ts', code: `class FixedWindowLimiter {
  private readonly counts = new Map<string, number>();

  constructor(private readonly limit: number, private readonly windowMillis: number) {}

  allow(client: string, nowMillis: number): boolean {
    const key = client + ":" + Math.floor(nowMillis / this.windowMillis);
    const after = (this.counts.get(key) ?? 0) + 1; // read + write in one synchronous step: no lost increments
    this.counts.set(key, after);
    return after <= this.limit; // note: still counts rejected hits (fine for fixed window)
  }
}` },
          { lang: 'cpp', code: `class FixedWindowLimiter {
    unordered_map<string, int> counts_;
    int limit_;
    long long windowMillis_;
    mutex mu_;

public:
    FixedWindowLimiter(int limit, long long windowMillis) : limit_(limit), windowMillis_(windowMillis) {}

    bool allow(const string& client, long long nowMillis) {
        string key = client + ":" + to_string(nowMillis / windowMillis_);
        int after;
        {
            lock_guard lk(mu_);                            // atomic per key: no lost increments
            after = ++counts_[key];
        }
        return after <= limit_;     // note: still counts rejected hits (fine for fixed window)
    }
};` }
        ] },
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
      brute: { why: `<p><b>Unsynchronized</b> <code>HashMap&lt;String, List&lt;Long&gt;&gt;</code>: the map and lists can corrupt, and concurrent resends all see "2 sent" and all send — a security bug. <b>Global lock</b>: correct, but every phone number in the country waits on one monitor. <b>Fixed window</b>: wrong spec (boundary burst sends 6 OTPs in 2 seconds).</p>`, code: { lang: 'java', code: `class OtpLimiterBrute {
    private final Map<String, List<Long>> sent = new HashMap<>();   // not thread-safe at all

    // BRUTE: no locking; removeIf + size + add are separate steps on a shared list
    boolean trySend(String phone, long nowSec) {
        List<Long> l = sent.computeIfAbsent(phone, p -> new ArrayList<>());
        l.removeIf(t -> t <= nowSec - 600);
        if (l.size() >= 3) return false;
        l.add(nowSec);
        return true;
    }
}`, alt: [{ lang: 'python', code: "class OtpLimiterBrute:\n    def __init__(self):\n        self.sent = {}                                # not thread-safe at all\n\n    # BRUTE: no locking; the purge + length check + append are separate steps on a shared list\n    def try_send(self, phone, now_sec):\n        l = self.sent.setdefault(phone, [])\n        l[:] = [t for t in l if t > now_sec - 600]\n        if len(l) >= 3: return False\n        l.append(now_sec)\n        return True\n" }, { lang: 'ts', code: "class OtpLimiterBrute {\n  private sent = new Map<string, number[]>();          // not safe once workers or awaits interleave\n\n  // BRUTE: no locking; the purge + length check + push are separate steps on a shared array\n  trySend(phone: string, nowSec: number): boolean {\n    if (!this.sent.has(phone)) this.sent.set(phone, []);\n    const l = this.sent.get(phone)!;\n    for (let i = l.length - 1; i >= 0; i--) if (l[i] <= nowSec - 600) l.splice(i, 1);\n    if (l.length >= 3) return false;\n    l.push(nowSec);\n    return true;\n  }\n}\n" }, { lang: 'cpp', code: "class OtpLimiterBrute {\n    unordered_map<string, vector<long long>> sent;     // not thread-safe at all\npublic:\n    // BRUTE: no locking; erase + size + push_back are separate steps on a shared vector\n    bool trySend(const string& phone, long long nowSec) {\n        auto& l = sent[phone];\n        l.erase(remove_if(l.begin(), l.end(), [&](long long t) { return t <= nowSec - 600; }), l.end());\n        if (l.size() >= 3) return false;\n        l.push_back(nowSec);\n        return true;\n    }\n};\n" }] } },
      mcq: { q: 'A user is rejected at 0:05 and keeps retrying every second until 0:12. When is the next send allowed with a correct sliding log?', options: ['Never — the retries keep the log full', 'At 0:10:00 exactly (0:00 is evicted when ts ≤ now − 600)', 'At 0:15', 'Only after a manual reset'], answer: 1, explain: 'Only accepted sends are logged, so the log is [0:00, 0:01, 0:02]. At 0:10:00, 0:00 ≤ 0:10:00 − 10 min, so it slides out and a slot opens.' },
      hints: [`<p>Hint 1: "Any rolling window" + "exact" = keep the timestamps of accepted sends, not a counter.</p>`, `<p>Hint 2: <code>ConcurrentHashMap&lt;String, ArrayDeque&lt;Long&gt;&gt;</code> with <code>computeIfAbsent</code>, then <code>synchronized (deque)</code> around evict + check + append.</p>`, `<p>Hint 3: secondsUntilNext = 0 if size &lt; 3, else (oldest + window − now). Don't log rejections. Inject the clock for tests.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "YYYN wait=300s\nunknown number wait=0s\nat 10:00 -> true\nconcurrent sends allowed: 3\n" }] },
      solution: {
        approach: `<p>Sliding window log with a <b>per-phone lock</b>. The map lookup is lock-free; the critical section touches one small deque (at most 3 entries), so contention exists only between the same user's concurrent resend clicks — and that contention is exactly what must be serialized to keep the limit exact.</p>
<p><b>In Python, TypeScript and C++.</b> Python and C++ keep one log per phone number (<code>deque</code> plus its own lock) and a small map lock only for find-or-create, so two numbers never wait on each other. TypeScript uses a plain array per number: the evict-check-append sequence is synchronous, so concurrent resend clicks (async tasks) are serialized for free. The log stays tiny (at most 3 timestamps) in every language.</p>`,
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
        System.out.println("unknown number wait=" + lim.secondsUntilNext("00zz") + "s");   // 0s
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
}`, alt: [
          { lang: 'python', code: `import threading
from collections import deque
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field


@dataclass
class SendLog:
    lock: threading.Lock = field(default_factory=threading.Lock)   # one lock per phone number
    times: deque[int] = field(default_factory=deque)


class OtpLimiter:
    LIMIT = 3

    def __init__(self, window_sec: int, clock_sec: Callable[[], int]) -> None:
        self._window = window_sec
        self._clock = clock_sec
        self._sent: dict[str, SendLog] = {}
        self._map_lock = threading.Lock()

    def _log(self, phone: str) -> SendLog:
        with self._map_lock:
            return self._sent.setdefault(phone, SendLog())

    def _evict(self, log: SendLog, now: int) -> None:
        while log.times and log.times[0] <= now - self._window:
            log.times.popleft()

    def try_send(self, phone: str) -> bool:
        log = self._log(phone)
        with log.lock:
            now = self._clock()
            self._evict(log, now)
            if len(log.times) >= self.LIMIT:
                return False                      # rejected: NOT recorded
            log.times.append(now)
            return True

    def seconds_until_next(self, phone: str) -> int:
        with self._map_lock:
            log = self._sent.get(phone)
        if log is None:
            return 0
        with log.lock:
            now = self._clock()
            self._evict(log, now)
            return 0 if len(log.times) < self.LIMIT else log.times[0] + self._window - now


def main() -> None:
    now = [0]
    lim = OtpLimiter(600, lambda: now[0])
    seq = ""
    for t in (0, 60, 120, 300):
        now[0] = t
        seq += "Y" if lim.try_send("98xx") else "N"
    print(f"{seq} wait={lim.seconds_until_next('98xx')}s")
    print(f"unknown number wait={lim.seconds_until_next('00zz')}s")
    now[0] = 600
    print(f"at 10:00 -> {str(lim.try_send('98xx')).lower()}")

    # 40 concurrent resend clicks from a fresh number at the same instant: exactly 3 pass
    with ThreadPoolExecutor(max_workers=16) as pool:
        ok = sum(pool.map(lambda _: lim.try_send("97yy"), range(40)))
    print(f"concurrent sends allowed: {ok}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `class OtpLimiter {
  private static readonly LIMIT = 3;
  private readonly sent = new Map<string, number[]>();

  constructor(private readonly windowSec: number, private readonly clockSec: () => number) {}

  // Runs to completion between awaits, so the check and the append cannot interleave.
  trySend(phone: string): boolean {
    let log = this.sent.get(phone);
    if (!log) this.sent.set(phone, (log = []));
    const now = this.clockSec();
    this.evict(log, now);
    if (log.length >= OtpLimiter.LIMIT) return false; // rejected: NOT recorded
    log.push(now);
    return true;
  }

  secondsUntilNext(phone: string): number {
    const log = this.sent.get(phone);
    if (!log) return 0;
    const now = this.clockSec();
    this.evict(log, now);
    return log.length < OtpLimiter.LIMIT ? 0 : log[0] + this.windowSec - now;
  }

  private evict(log: number[], now: number): void {
    let drop = 0;
    while (drop < log.length && log[drop] <= now - this.windowSec) drop++;
    log.splice(0, drop); // timestamps are appended in order, so the oldest are in front
  }
}

async function main(): Promise<void> {
  let now = 0;
  const lim = new OtpLimiter(600, () => now);
  let seq = "";
  for (const t of [0, 60, 120, 300]) {
    now = t;
    seq += lim.trySend("98xx") ? "Y" : "N";
  }
  console.log(seq + " wait=" + lim.secondsUntilNext("98xx") + "s");
  console.log("unknown number wait=" + lim.secondsUntilNext("00zz") + "s");
  now = 600;
  console.log("at 10:00 -> " + lim.trySend("98xx"));

  // 40 concurrent resend clicks from a fresh number at the same instant: exactly 3 pass
  const results = await Promise.all(
    Array.from({ length: 40 }, async () => {
      await Promise.resolve();
      return lim.trySend("97yy");
    }),
  );
  console.log("concurrent sends allowed: " + results.filter(Boolean).length);
}

main();` },
          { lang: 'cpp', code: `class OtpLimiter {
    struct SendLog {
        mutex mu;                                  // one lock per phone number
        deque<long long> times;
    };
    static constexpr size_t LIMIT = 3;
    long long windowSec_;
    function<long long()> clockSec_;
    unordered_map<string, shared_ptr<SendLog>> sent_;
    mutex mapMu_;

    void evict(SendLog& log, long long now) {
        while (!log.times.empty() && log.times.front() <= now - windowSec_) log.times.pop_front();
    }

public:
    OtpLimiter(long long windowSec, function<long long()> clockSec)
        : windowSec_(windowSec), clockSec_(std::move(clockSec)) {}

    bool trySend(const string& phone) {
        shared_ptr<SendLog> log;
        {
            lock_guard lk(mapMu_);
            auto& slot = sent_[phone];
            if (!slot) slot = make_shared<SendLog>();
            log = slot;
        }
        lock_guard lk(log->mu);
        long long now = clockSec_();
        evict(*log, now);
        if (log->times.size() >= LIMIT) return false;   // rejected: NOT recorded
        log->times.push_back(now);
        return true;
    }

    long long secondsUntilNext(const string& phone) {
        shared_ptr<SendLog> log;
        {
            lock_guard lk(mapMu_);
            auto it = sent_.find(phone);
            if (it == sent_.end()) return 0;
            log = it->second;
        }
        lock_guard lk(log->mu);
        long long now = clockSec_();
        evict(*log, now);
        return log->times.size() < LIMIT ? 0 : log->times.front() + windowSec_ - now;
    }
};

int main() {
    atomic<long long> now{0};
    OtpLimiter lim(600, [&] { return now.load(); });
    string seq;
    for (long long t : {0, 60, 120, 300}) {
        now = t;
        seq += lim.trySend("98xx") ? "Y" : "N";
    }
    cout << seq << " wait=" << lim.secondsUntilNext("98xx") << "s\\n";
    cout << "unknown number wait=" << lim.secondsUntilNext("00zz") << "s\\n";
    now = 600;
    cout << "at 10:00 -> " << boolalpha << lim.trySend("98xx") << "\\n";

    // 40 concurrent resend clicks from a fresh number at the same instant: exactly 3 pass
    atomic<int> ok{0};
    vector<thread> pool;
    for (int t = 0; t < 16; t++)
        pool.emplace_back([&, t] { for (int i = t; i < 40; i += 16) if (lim.trySend("97yy")) ok++; });
    for (auto& th : pool) th.join();
    cout << "concurrent sends allowed: " << ok << "\\n";
}` }
        ],
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
}`, alt: [
          { lang: 'python', code: `import queue
import threading
from typing import NamedTuple


class Order(NamedTuple):
    id: int
    item: str


POISON = Order(-1, "STOP")                           # sentinel, compared by identity


def main() -> None:
    q: queue.Queue[Order] = queue.Queue(maxsize=5)   # bounded => backpressure
    producers, consumers, per_producer = 2, 3, 6
    processed = [0]
    counter_lock = threading.Lock()

    def produce(base: int) -> None:
        for i in range(1, per_producer + 1):
            q.put(Order(base + i, f"item{i}"))       # blocks when full

    def consume() -> None:
        while (o := q.get()) is not POISON:          # blocks when empty; POISON means closing time
            with counter_lock:
                processed[0] += 1

    prods = [threading.Thread(target=produce, args=(p * 100,), name=f"producer-{p}") for p in range(producers)]
    cons = [threading.Thread(target=consume, name=f"consumer-{c}") for c in range(consumers)]
    for t in prods + cons:
        t.start()

    for t in prods:
        t.join()                                     # all real orders are queued
    for _ in range(consumers):
        q.put(POISON)                                # ONE pill per consumer
    for t in cons:
        t.join(5)                                    # bounded wait

    print(f"processed {processed[0]} of {producers * per_producer}")   # 12 of 12


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `// A bounded async queue: put() waits while full (backpressure), take() waits while empty.
class AsyncQueue<T> {
  private readonly items: T[] = [];
  private readonly notFull: Array<() => void> = [];
  private readonly notEmpty: Array<() => void> = [];

  constructor(private readonly capacity: number) {}

  async put(x: T): Promise<void> {
    while (this.items.length >= this.capacity) await new Promise<void>((r) => this.notFull.push(r));
    this.items.push(x);
    this.notEmpty.shift()?.();
  }

  async take(): Promise<T> {
    while (this.items.length === 0) await new Promise<void>((r) => this.notEmpty.push(r));
    const x = this.items.shift() as T;
    this.notFull.shift()?.();
    return x;
  }
}

interface Order {
  readonly id: number;
  readonly item: string;
}

const POISON: Order = { id: -1, item: "STOP" }; // sentinel, compared by identity

async function main(): Promise<void> {
  const queue = new AsyncQueue<Order>(5); // bounded => backpressure
  const producers = 2;
  const consumers = 3;
  const perProducer = 6;
  let processed = 0;

  const produce = async (base: number): Promise<void> => {
    for (let i = 1; i <= perProducer; i++) await queue.put({ id: base + i, item: "item" + i }); // waits when full
  };
  const consume = async (): Promise<void> => {
    for (let o = await queue.take(); o !== POISON; o = await queue.take()) processed++; // waits when empty
  };

  const prods = Array.from({ length: producers }, (_, p) => produce(p * 100));
  const cons = Array.from({ length: consumers }, () => consume());
  await Promise.all(prods); // all real orders are queued
  for (let c = 0; c < consumers; c++) await queue.put(POISON); // ONE pill per consumer
  await Promise.all(cons);

  console.log("processed " + processed + " of " + producers * perProducer); // 12 of 12
}

main();` },
          { lang: 'cpp', code: `template <class T>
class BoundedQueue {                                 // bounded: put() blocks when full = backpressure
    deque<T> items_;
    size_t capacity_;
    mutex mu_;
    condition_variable notFull_, notEmpty_;

public:
    explicit BoundedQueue(size_t capacity) : capacity_(capacity) {}

    void put(T x) {
        unique_lock lk(mu_);
        notFull_.wait(lk, [&] { return items_.size() < capacity_; });
        items_.push_back(std::move(x));
        notEmpty_.notify_one();
    }

    T take() {
        unique_lock lk(mu_);
        notEmpty_.wait(lk, [&] { return !items_.empty(); });
        T x = std::move(items_.front());
        items_.pop_front();
        notFull_.notify_one();
        return x;
    }
};

struct Order {
    int id;
    string item;
};

int main() {
    BoundedQueue<optional<Order>> queue(5);          // nullopt is the poison pill
    const int producers = 2, consumers = 3, perProducer = 6;
    atomic<int> processed{0};

    vector<jthread> prods, cons;
    for (int p = 0; p < producers; p++)
        prods.emplace_back([&, base = p * 100] {
            for (int i = 1; i <= perProducer; i++) queue.put(Order{base + i, "item" + to_string(i)});   // blocks when full
        });
    for (int c = 0; c < consumers; c++)
        cons.emplace_back([&] {
            while (queue.take()) processed++;        // blocks when empty; nullopt means closing time
        });

    for (auto& t : prods) t.join();                  // all real orders are queued
    for (int c = 0; c < consumers; c++) queue.put(nullopt);   // ONE pill per consumer
    for (auto& t : cons) t.join();

    cout << "processed " << processed << " of " << producers * perProducer << "\\n";   // 12 of 12
}` }
        ] }, { lang: 'java', title: 'Bounded buffer from scratch: ReentrantLock + two Conditions', code: `class BoundedBuffer<T> {
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
}`, alt: [
          { lang: 'python', code: `import threading
from typing import Generic, TypeVar

T = TypeVar("T")


class BoundedBuffer(Generic[T]):
    def __init__(self, capacity: int) -> None:
        self._items: list[T | None] = [None] * capacity
        self._head = self._tail = self._count = 0     # all guarded by the lock
        lock = threading.Lock()
        self._not_full = threading.Condition(lock)   # two conditions share ONE lock
        self._not_empty = threading.Condition(lock)

    def put(self, x: T) -> None:
        with self._not_full:                          # always released, even on exceptions
            while self._count == len(self._items):    # WHILE, not if: re-check after waking
                self._not_full.wait()
            self._items[self._tail] = x
            self._tail = (self._tail + 1) % len(self._items)
            self._count += 1
            self._not_empty.notify()                  # wake ONE waiting consumer

    def take(self) -> T:
        with self._not_empty:
            while self._count == 0:
                self._not_empty.wait()
            x = self._items[self._head]
            self._items[self._head] = None            # let the GC reclaim it
            self._head = (self._head + 1) % len(self._items)
            self._count -= 1
            self._not_full.notify()                   # wake ONE waiting producer
            return x  # type: ignore[return-value]


if __name__ == "__main__":
    buf: BoundedBuffer[int] = BoundedBuffer(2)

    def consume() -> None:
        for _ in range(5):
            print(f"took {buf.take()}")

    consumer = threading.Thread(target=consume)
    consumer.start()
    for i in range(1, 6):
        buf.put(i)                                    # blocks whenever 2 items are waiting
    consumer.join(5)` },
          { lang: 'ts', code: `class BoundedBuffer<T> {
  private readonly items: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private count = 0;
  private readonly notFull: Array<() => void> = []; // two wait lists, like two Conditions
  private readonly notEmpty: Array<() => void> = [];

  constructor(capacity: number) {
    this.items = new Array<T | undefined>(capacity).fill(undefined);
  }

  async put(x: T): Promise<void> {
    while (this.count === this.items.length) await new Promise<void>((r) => this.notFull.push(r)); // WHILE: re-check after waking
    this.items[this.tail] = x;
    this.tail = (this.tail + 1) % this.items.length;
    this.count++;
    this.notEmpty.shift()?.(); // wake ONE waiting consumer
  }

  async take(): Promise<T> {
    while (this.count === 0) await new Promise<void>((r) => this.notEmpty.push(r));
    const x = this.items[this.head] as T;
    this.items[this.head] = undefined; // let the GC reclaim it
    this.head = (this.head + 1) % this.items.length;
    this.count--;
    this.notFull.shift()?.(); // wake ONE waiting producer
    return x;
  }
}

async function main(): Promise<void> {
  const buf = new BoundedBuffer<number>(2);
  const consumer = (async (): Promise<void> => {
    for (let i = 0; i < 5; i++) console.log("took " + (await buf.take()));
  })();
  for (let i = 1; i <= 5; i++) await buf.put(i); // waits whenever 2 items are waiting
  await consumer;
}

main();` },
          { lang: 'cpp', code: `template <class T>
class BoundedBuffer {
    vector<optional<T>> items_;
    size_t head_ = 0, tail_ = 0, count_ = 0;       // all guarded by mu_
    mutex mu_;
    condition_variable notFull_, notEmpty_;        // two conditions share ONE mutex

public:
    explicit BoundedBuffer(size_t capacity) : items_(capacity) {}

    void put(T x) {
        unique_lock lk(mu_);                       // unlocks in its destructor, even on exceptions
        notFull_.wait(lk, [&] { return count_ < items_.size(); });   // predicate = WHILE loop
        items_[tail_] = std::move(x);
        tail_ = (tail_ + 1) % items_.size();
        count_++;
        notEmpty_.notify_one();                    // wake ONE waiting consumer
    }

    T take() {
        unique_lock lk(mu_);
        notEmpty_.wait(lk, [&] { return count_ > 0; });
        T x = std::move(*items_[head_]);
        items_[head_].reset();                     // release the slot's contents
        head_ = (head_ + 1) % items_.size();
        count_--;
        notFull_.notify_one();                     // wake ONE waiting producer
        return x;
    }
};

int main() {
    BoundedBuffer<int> buf(2);
    jthread consumer([&] {
        for (int i = 0; i < 5; i++) cout << "took " << buf.take() << "\\n";
    });
    for (int i = 1; i <= 5; i++) buf.put(i);       // blocks whenever 2 items are waiting
}                                                  // the jthread joins here` }
        ] }],
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
            CODE('Inside the queue', src, codeHl || {}, Q_ALT)
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
}`, alt: [
          { lang: 'python', code: `import threading


class MonitorBuffer:
    def __init__(self) -> None:
        self._buf = [0] * 4
        self._head = self._tail = self._count = 0
        self._monitor = threading.Condition()        # ONE condition for everybody, like a Java monitor

    def put(self, x: int) -> None:
        with self._monitor:
            while self._count == len(self._buf):     # releases the monitor while waiting
                self._monitor.wait()
            self._buf[self._tail] = x
            self._tail = (self._tail + 1) % len(self._buf)
            self._count += 1
            self._monitor.notify_all()               # wake everyone; each re-checks its while loop

    def take(self) -> int:
        with self._monitor:
            while self._count == 0:
                self._monitor.wait()
            x = self._buf[self._head]
            self._head = (self._head + 1) % len(self._buf)
            self._count -= 1
            self._monitor.notify_all()
            return x` },
          { lang: 'ts', code: `class MonitorBuffer {
  private readonly buf: number[] = new Array<number>(4).fill(0);
  private head = 0;
  private tail = 0;
  private count = 0;
  private waiters: Array<() => void> = []; // ONE wait set for producers AND consumers, like a Java monitor

  // suspends the caller until the next notifyAll()
  private wait(): Promise<void> {
    return new Promise<void>((r) => this.waiters.push(r));
  }

  private notifyAll(): void {
    const all = this.waiters;
    this.waiters = [];
    for (const wake of all) wake(); // wake everyone; each re-checks its while loop
  }

  async put(x: number): Promise<void> {
    while (this.count === this.buf.length) await this.wait();
    this.buf[this.tail] = x;
    this.tail = (this.tail + 1) % this.buf.length;
    this.count++;
    this.notifyAll();
  }

  async take(): Promise<number> {
    while (this.count === 0) await this.wait();
    const x = this.buf[this.head];
    this.head = (this.head + 1) % this.buf.length;
    this.count--;
    this.notifyAll();
    return x;
  }
}` },
          { lang: 'cpp', code: `class MonitorBuffer {
    int buf_[4] = {0, 0, 0, 0};
    int head_ = 0, tail_ = 0, count_ = 0;
    mutex mu_;
    condition_variable monitor_;                   // ONE condition for everybody, like a Java monitor

public:
    void put(int x) {
        unique_lock lk(mu_);
        while (count_ == 4) monitor_.wait(lk);     // releases the mutex while waiting
        buf_[tail_] = x; tail_ = (tail_ + 1) % 4; count_++;
        monitor_.notify_all();                     // wake everyone; each re-checks its while loop
    }

    int take() {
        unique_lock lk(mu_);
        while (count_ == 0) monitor_.wait(lk);
        int x = buf_[head_]; head_ = (head_ + 1) % 4; count_--;
        monitor_.notify_all();
        return x;
    }
};` }
        ] },
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
}`, alt: [
          { lang: 'python', code: `import queue
import threading
import time


class AsyncLogger:
    def __init__(self) -> None:
        self._q: queue.Queue[str] = queue.Queue(maxsize=1024)
        self._dropped = 0
        self._dropped_lock = threading.Lock()
        self._closed = threading.Event()
        self._writer = threading.Thread(target=self._drain, name="log-writer", daemon=True)

    # start the thread AFTER construction so "self" never escapes half-built
    @classmethod
    def start(cls) -> "AsyncLogger":
        logger = cls()
        logger._writer.start()
        return logger

    def debug(self, m: str) -> None:                  # never blocks
        try:
            self._q.put_nowait(m)
        except queue.Full:
            with self._dropped_lock:
                self._dropped += 1

    def error(self, m: str) -> None:                  # must not be lost: blocks until there is room
        self._q.put("ERROR " + m)

    def _drain(self) -> None:
        while not self._closed.is_set() or not self._q.empty():
            try:
                print(self._q.get(timeout=0.1))       # wake up to notice close
            except queue.Empty:
                pass

    def close(self) -> None:
        self._closed.set()
        self._writer.join(2)` },
          { lang: 'ts', code: `const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

class AsyncLogger {
  private readonly queue: string[] = [];
  private dropped = 0;
  private closed = false;
  private readonly writer: Promise<void>;

  private constructor(private readonly capacity: number) {
    this.writer = this.drain();
  }

  // start the loop AFTER construction state is set, so it never sees a half-built logger
  static start(): AsyncLogger {
    return new AsyncLogger(1024);
  }

  debug(m: string): void {
    // never waits
    if (this.queue.length < this.capacity) this.queue.push(m);
    else this.dropped++;
  }

  async error(m: string): Promise<void> {
    // must not be lost: waits until there is room
    while (this.queue.length >= this.capacity) await sleep(1);
    this.queue.push("ERROR " + m);
  }

  private async drain(): Promise<void> {
    while (!this.closed || this.queue.length > 0) {
      const m = this.queue.shift();
      if (m !== undefined) console.log(m);
      else await sleep(10); // idle: wake up to notice close
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.writer;
  }
}` },
          { lang: 'cpp', code: `class AsyncLogger {
    deque<string> q_;
    static constexpr size_t kCapacity = 1024;
    mutex mu_;
    condition_variable notFull_, notEmpty_;
    atomic<long long> dropped_{0};
    bool closed_ = false;                             // guarded by mu_
    jthread writer_;

    void drain() {
        unique_lock lk(mu_);
        while (!closed_ || !q_.empty()) {
            if (!notEmpty_.wait_for(lk, 100ms, [&] { return !q_.empty(); })) continue;   // wake up to notice close
            string m = std::move(q_.front());
            q_.pop_front();
            notFull_.notify_one();
            lk.unlock();
            cout << m << "\\n";
            lk.lock();
        }
    }

public:
    AsyncLogger() : writer_([this] { drain(); }) {}   // all members are built before the thread starts
    ~AsyncLogger() { close(); }

    void debug(const string& m) {                     // never blocks
        lock_guard lk(mu_);
        if (q_.size() < kCapacity) { q_.push_back(m); notEmpty_.notify_one(); }
        else dropped_++;
    }

    void error(const string& m) {                     // must not be lost: blocks until there is room
        unique_lock lk(mu_);
        notFull_.wait(lk, [&] { return q_.size() < kCapacity; });
        q_.push_back("ERROR " + m);
        notEmpty_.notify_one();
    }

    void close() {
        {
            lock_guard lk(mu_);
            closed_ = true;
        }
        notEmpty_.notify_all();
        if (writer_.joinable()) writer_.join();
    }
};` }
        ] },
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
}`, alt: [
          { lang: 'python', code: `import queue
import threading


class HandOff:
    """Python's closest thing to a SynchronousQueue: a one-slot queue plus join(), which waits for task_done()."""

    def __init__(self) -> None:
        self._slot: queue.Queue[str] = queue.Queue(maxsize=1)

    def put(self, item: str) -> None:
        self._slot.put(item)
        self._slot.join()                             # returns only once the taker has taken it

    def take(self) -> str:
        item = self._slot.get()
        self._slot.task_done()
        return item


if __name__ == "__main__":
    baton = HandOff()
    runner = threading.Thread(target=lambda: print(f"got {baton.take()}"))
    runner.start()
    baton.put("baton")
    runner.join(2)` },
          { lang: 'ts', code: `// put() resolves only once a take() has received the value: a zero-capacity hand-off.
class SynchronousQueue<T> {
  private readonly takers: Array<(x: T) => void> = [];
  private readonly putters: Array<{ x: T; taken: () => void }> = [];

  put(x: T): Promise<void> {
    const taker = this.takers.shift();
    if (taker) {
      taker(x); // a consumer is already waiting: hand over directly
      return Promise.resolve();
    }
    return new Promise<void>((taken) => this.putters.push({ x, taken })); // wait for a consumer
  }

  take(): Promise<T> {
    const putter = this.putters.shift();
    if (putter) {
      putter.taken();
      return Promise.resolve(putter.x);
    }
    return new Promise<T>((resolve) => this.takers.push(resolve));
  }
}

async function main(): Promise<void> {
  const baton = new SynchronousQueue<string>();
  const runner = baton.take().then((x) => console.log("got " + x));
  await baton.put("baton"); // returns only once the runner has taken it
  await runner;
}

main();` },
          { lang: 'cpp', code: `template <class T>
class SynchronousQueue {                              // no slots: put() returns only once a take() has the item
    optional<T> slot_;
    mutex mu_;
    condition_variable cv_;

public:
    void put(T x) {
        unique_lock lk(mu_);
        cv_.wait(lk, [&] { return !slot_.has_value(); });   // another putter's baton is still in flight
        slot_ = std::move(x);
        cv_.notify_all();
        cv_.wait(lk, [&] { return !slot_.has_value(); });   // wait until a consumer took it
    }

    T take() {
        unique_lock lk(mu_);
        cv_.wait(lk, [&] { return slot_.has_value(); });
        T x = std::move(*slot_);
        slot_.reset();
        cv_.notify_all();
        return x;
    }
};

int main() {
    SynchronousQueue<string> baton;
    jthread runner([&] { cout << "got " << baton.take() << "\\n"; });
    baton.put("baton");                               // returns only once the runner has taken it
}` }
        ] },
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
      statement: `<p>Implement <code>BoundedBlockingQueue(int capacity)</code> with <code>void enqueue(int x)</code> (blocks while full), <code>int dequeue()</code> (blocks while empty) and <code>int size()</code>. Multiple producer and consumer threads call it concurrently. Do not use a ready-made blocking queue (the <code>java.util.concurrent</code> collections in Java, <code>queue.Queue</code> in Python) — only a lock with condition variables (or the object monitor in Java). TypeScript has no threads, so build it from promises that wait to be woken.</p>`,
      constraints: `<p>1 ≤ capacity ≤ 30; up to 8 producers and 8 consumers; every enqueued element is dequeued exactly once, in FIFO order; no busy waiting.</p>`,
      example: `<p>capacity 2. Producer: enqueue 1, 2, 3. Consumer: dequeue ×3. The producer ${H.c('y', 'blocks on 3')} until the consumer takes 1. Output order ${H.c('g', '1, 2, 3')}; final size 0.</p>`,
      brute: { why: `<p><b>Spin-wait</b> on an unsynchronized <code>LinkedList</code>: <code>while (list.size() == cap) {}</code> burns a CPU core per waiting thread, and without a lock two producers can both see "one slot left" and both add (overflow), or the JIT can hoist <code>size()</code> and spin forever. <b>Global synchronized + <code>if (full) wait()</code> + <code>notify()</code></b>: a woken producer does not re-check, and <code>notify</code> may wake the wrong kind of thread → over-capacity or deadlock-like hangs.</p>`, code: { lang: 'java', code: `class SpinQueue {
    private final LinkedList<Integer> list = new LinkedList<>();
    private final int cap;
    SpinQueue(int cap) { this.cap = cap; }

    // BRUTE: busy-wait + no lock => burns CPU and races (two producers fill the last slot)
    void enqueue(int x) { while (list.size() >= cap) { Thread.onSpinWait(); } list.addLast(x); }
    int dequeue()       { while (list.isEmpty())     { Thread.onSpinWait(); } return list.removeFirst(); }
}`, alt: [{ lang: 'python', code: "import time\nfrom collections import deque\n\nclass SpinQueue:\n    def __init__(self, cap):\n        self.items = deque()\n        self.cap = cap\n\n    # BRUTE: busy-wait + no lock => burns CPU and races (two producers fill the last slot)\n    def enqueue(self, x):\n        while len(self.items) >= self.cap: time.sleep(0)\n        self.items.append(x)\n\n    def dequeue(self):\n        while not self.items: time.sleep(0)\n        return self.items.popleft()\n" }, { lang: 'ts', code: "class SpinQueue {\n  private list: number[] = [];\n  constructor(private cap: number) {}\n\n  // BRUTE: busy-wait + no lock => burns CPU (and the event loop never runs the other side)\n  enqueue(x: number): void { while (this.list.length >= this.cap) { } this.list.push(x); }\n  dequeue(): number     { while (this.list.length === 0)         { } return this.list.shift()!; }\n}\n" }, { lang: 'cpp', code: "class SpinQueue {\n    list<int> items;\n    int cap;\npublic:\n    SpinQueue(int cap) : cap(cap) {}\n\n    // BRUTE: busy-wait + no lock => burns CPU and races (two producers fill the last slot)\n    void enqueue(int x) { while ((int)items.size() >= cap) { this_thread::yield(); } items.push_back(x); }\n    int dequeue() {\n        while (items.empty()) { this_thread::yield(); }\n        int x = items.front(); items.pop_front(); return x;\n    }\n};\n" }] } },
      mcq: { q: 'Why must <code>await()</code> be inside <code>while (count == capacity)</code> rather than <code>if</code>?', options: ['Because await() might return early (spurious wakeup) or another producer may fill the slot before we reacquire the lock', 'Because if is slower than while', 'Because await() never returns otherwise', 'It is only a style preference'], answer: 0, explain: 'Waking up only means "the condition might be true now". Between the signal and re-acquiring the lock, another thread can change the state, and the spec allows spurious wakeups. Re-check every time.' },
      hints: [`<p>Hint 1: You need two "waiting rooms": producers wait for "not full", consumers wait for "not empty". One lock protects the array and counters.</p>`, `<p>Hint 2: <code>ReentrantLock</code> + <code>newCondition()</code> ×2, a circular array with head/tail/count. Unlock in <code>finally</code>.</p>`, `<p>Hint 3: Recipe — enqueue: lock; while full await notFull; write at tail; count++; signal notEmpty; unlock. Dequeue mirrors it. size() also takes the lock (visibility).</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "sum=500500 expected=500500 size=0\ncapacity 0 rejected: capacity must be positive\nblocked consumer cancelled: true\n" }] },
      solution: {
        approach: `<p>Classic monitor with <b>two condition variables</b>. All state (array, head, tail, count) is guarded by one <code>ReentrantLock</code>. Waiting happens in <code>while</code> loops that release the lock (no CPU burn). Each successful operation signals the <i>opposite</i> condition, waking exactly one useful waiter. FIFO comes from the circular array.</p>
<p><b>In Python, TypeScript and C++.</b> Python builds the two waiting rooms with <code>threading.Condition</code> objects sharing one <code>Lock</code> and uses <code>wait_for(predicate, timeout)</code>, which loops for you; Python threads cannot be interrupted, so a timeout is the way out of a blocked <code>dequeue</code>. C++ uses <code>condition_variable_any</code> with a <code>std::stop_token</code> (<code>jthread</code>) for cooperative cancellation. TypeScript keeps two lists of waiting promises, re-checks in a <code>while</code> loop after waking, and cancels with an <code>AbortSignal</code>.</p>`,
        code: `class BoundedBlockingQueue {
    private final int[] a;
    private int head, tail, count;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();

    BoundedBlockingQueue(int capacity) {
        if (capacity <= 0) throw new IllegalArgumentException("capacity must be positive");   // 0 would block forever
        a = new int[capacity];
    }

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

        try { new BoundedBlockingQueue(0); }
        catch (IllegalArgumentException e) { System.out.println("capacity 0 rejected: " + e.getMessage()); }

        BoundedBlockingQueue empty = new BoundedBlockingQueue(1);
        boolean[] cancelled = new boolean[1];
        Thread blocked = new Thread(() -> {
            try { empty.dequeue(); } catch (InterruptedException e) { cancelled[0] = true; }
        });
        blocked.start();
        Thread.sleep(50);                       // let it block on the empty queue
        blocked.interrupt();                    // Java's way to cancel a blocked thread
        blocked.join(2000);
        System.out.println("blocked consumer cancelled: " + cancelled[0]);
    }
}`, alt: [
          { lang: 'python', code: `import threading
import time


class BoundedBlockingQueue:
    def __init__(self, capacity: int) -> None:
        if capacity <= 0:
            raise ValueError("capacity must be positive")    # 0 would block forever
        self._buf = [0] * capacity
        self._head = self._tail = self._count = 0
        lock = threading.Lock()
        self._not_full = threading.Condition(lock)           # two conditions, ONE lock
        self._not_empty = threading.Condition(lock)

    def enqueue(self, x: int) -> None:
        with self._not_full:
            self._not_full.wait_for(lambda: self._count < len(self._buf))   # re-checks in a loop
            self._buf[self._tail] = x
            self._tail = (self._tail + 1) % len(self._buf)
            self._count += 1
            self._not_empty.notify()

    def dequeue(self, timeout: float | None = None) -> int:
        """Blocks while empty. Python threads cannot be interrupted, so a timeout is the way out."""
        with self._not_empty:
            if not self._not_empty.wait_for(lambda: self._count > 0, timeout):
                raise TimeoutError("dequeue timed out")
            x = self._buf[self._head]
            self._head = (self._head + 1) % len(self._buf)
            self._count -= 1
            self._not_full.notify()
            return x

    def size(self) -> int:
        with self._not_full:
            return self._count


def main() -> None:
    q = BoundedBlockingQueue(2)
    n = 1000
    total = [0]

    def produce() -> None:
        for i in range(1, n + 1):
            q.enqueue(i)

    def consume() -> None:
        for _ in range(n):
            total[0] += q.dequeue()

    prod, cons = threading.Thread(target=produce), threading.Thread(target=consume)
    prod.start()
    cons.start()
    prod.join(5)
    cons.join(5)
    print(f"sum={total[0]} expected={n * (n + 1) // 2} size={q.size()}")

    try:
        BoundedBlockingQueue(0)
    except ValueError as e:
        print(f"capacity 0 rejected: {e}")

    empty = BoundedBlockingQueue(1)
    cancelled = [False]

    def blocked() -> None:
        try:
            empty.dequeue(timeout=0.05)          # gives up after 50 ms
        except TimeoutError:
            cancelled[0] = True

    t = threading.Thread(target=blocked)
    t.start()
    t.join(2)
    print(f"blocked consumer cancelled: {str(cancelled[0]).lower()}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `type Waiter = () => void;

class BoundedBlockingQueue {
  private readonly buf: number[];
  private head = 0;
  private tail = 0;
  private count = 0;
  private readonly notFull: Waiter[] = [];  // producers waiting for a free slot
  private readonly notEmpty: Waiter[] = []; // consumers waiting for an item

  constructor(capacity: number) {
    if (capacity <= 0) throw new Error("capacity must be positive"); // 0 would wait forever
    this.buf = new Array<number>(capacity).fill(0);
  }

  // Suspends the caller until someone wakes it; an AbortSignal is the cancellation hook.
  private wait(list: Waiter[], signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const onAbort = (): void => {
        const i = list.indexOf(wake);
        if (i >= 0) list.splice(i, 1);
        reject(new Error("cancelled"));
      };
      const wake = (): void => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      };
      if (signal?.aborted) return reject(new Error("cancelled"));
      signal?.addEventListener("abort", onAbort);
      list.push(wake);
    });
  }

  async enqueue(x: number, signal?: AbortSignal): Promise<void> {
    while (this.count === this.buf.length) await this.wait(this.notFull, signal); // re-check after waking
    this.buf[this.tail] = x;
    this.tail = (this.tail + 1) % this.buf.length;
    this.count++;
    this.notEmpty.shift()?.();
  }

  async dequeue(signal?: AbortSignal): Promise<number> {
    while (this.count === 0) await this.wait(this.notEmpty, signal);
    const x = this.buf[this.head];
    this.head = (this.head + 1) % this.buf.length;
    this.count--;
    this.notFull.shift()?.();
    return x;
  }

  size(): number {
    return this.count;
  }
}

async function main(): Promise<void> {
  const q = new BoundedBlockingQueue(2);
  const n = 1000;
  let sum = 0;
  const produce = async (): Promise<void> => {
    for (let i = 1; i <= n; i++) await q.enqueue(i);
  };
  const consume = async (): Promise<void> => {
    for (let i = 0; i < n; i++) sum += await q.dequeue();
  };
  await Promise.all([produce(), consume()]);
  console.log("sum=" + sum + " expected=" + (n * (n + 1)) / 2 + " size=" + q.size());

  try {
    new BoundedBlockingQueue(0);
  } catch (e) {
    console.log("capacity 0 rejected: " + (e as Error).message);
  }

  const empty = new BoundedBlockingQueue(1);
  const ctl = new AbortController();
  let cancelled = false;
  const blocked = empty.dequeue(ctl.signal).catch(() => {
    cancelled = true;
    return -1;
  });
  await new Promise((r) => setTimeout(r, 50)); // let it block on the empty queue
  ctl.abort();                                  // AbortController cancels a pending wait
  await blocked;
  console.log("blocked consumer cancelled: " + cancelled);
}

main();` },
          { lang: 'cpp', code: `class BoundedBlockingQueue {
    vector<int> buf_;
    size_t head_ = 0, tail_ = 0, count_ = 0;
    mutex mu_;
    condition_variable_any notFull_, notEmpty_;      // _any can wait with a stop_token

public:
    explicit BoundedBlockingQueue(int capacity) {
        if (capacity <= 0) throw invalid_argument("capacity must be positive");   // 0 would block forever
        buf_.assign(capacity, 0);
    }

    void enqueue(int x) {
        unique_lock lk(mu_);
        notFull_.wait(lk, [&] { return count_ < buf_.size(); });   // predicate form = while loop
        buf_[tail_] = x;
        tail_ = (tail_ + 1) % buf_.size();
        count_++;
        notEmpty_.notify_one();
    }

    // nullopt means the wait was cancelled through the stop_token
    optional<int> dequeue(stop_token st = {}) {
        unique_lock lk(mu_);
        if (!notEmpty_.wait(lk, st, [&] { return count_ > 0; })) return nullopt;
        int x = buf_[head_];
        head_ = (head_ + 1) % buf_.size();
        count_--;
        notFull_.notify_one();
        return x;
    }

    size_t size() {
        lock_guard lk(mu_);
        return count_;
    }
};

int main() {
    BoundedBlockingQueue q(2);
    const int n = 1000;
    long long sum = 0;
    {
        jthread prod([&] { for (int i = 1; i <= n; i++) q.enqueue(i); });
        jthread cons([&] { for (int i = 0; i < n; i++) sum += *q.dequeue(); });
    }                                                  // jthread joins in its destructor
    cout << "sum=" << sum << " expected=" << static_cast<long long>(n) * (n + 1) / 2 << " size=" << q.size() << "\\n";

    try { BoundedBlockingQueue bad(0); }
    catch (const invalid_argument& e) { cout << "capacity 0 rejected: " << e.what() << "\\n"; }

    BoundedBlockingQueue empty(1);
    bool cancelled = false;
    jthread blocked([&](stop_token st) { cancelled = !empty.dequeue(st).has_value(); });
    this_thread::sleep_for(50ms);                      // let it block on the empty queue
    blocked.request_stop();                            // cooperative cancellation
    blocked.join();
    cout << "blocked consumer cancelled: " << boolalpha << cancelled << "\\n";
}` }
        ],
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
}`, alt: [
          { lang: 'python', code: `import random
import threading
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from typing import Generic, TypeVar

K = TypeVar("K")
V = TypeVar("V")


class ConcurrentLRUCache(Generic[K, V]):
    def __init__(self, capacity: int) -> None:
        if capacity <= 0:
            raise ValueError("capacity")
        self._capacity = capacity
        # OrderedDict is the hash map + doubly linked list in one: the last key is the most recent
        self._map: OrderedDict[K, V] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: K) -> V | None:
        with self._lock:                       # EXCLUSIVE even for reads: get() reorders the entries
            if key not in self._map:
                return None
            self._map.move_to_end(key)
            return self._map[key]

    def put(self, key: K, val: V) -> None:
        with self._lock:
            if key in self._map:
                self._map[key] = val
                self._map.move_to_end(key)
                return
            if len(self._map) == self._capacity:       # evict in the SAME critical section
                self._map.popitem(last=False)          # the least recently used
            self._map[key] = val

    def size(self) -> int:
        with self._lock:
            return len(self._map)

    def consistent(self) -> bool:
        """Invariant check: never more entries than capacity."""
        with self._lock:
            return len(self._map) <= self._capacity


def main() -> None:
    cache: ConcurrentLRUCache[int, int] = ConcurrentLRUCache(10)

    def hammer(seed: int) -> None:
        rng = random.Random(seed)
        for _ in range(20_000):
            k = rng.randrange(100)
            if rng.random() < 0.5:
                cache.put(k, k * k)
            else:
                cache.get(k)

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(hammer, range(8)))
    print(f"size={cache.size()} consistent={str(cache.consistent()).lower()}")   # size=10 consistent=true


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `class ConcurrentLRUCache<K, V> {
  // a Map iterates in insertion order: the first key is the least recently used
  private readonly map = new Map<K, V>();

  constructor(private readonly capacity: number) {
    if (capacity <= 0) throw new Error("capacity");
  }

  // Synchronous, so get() relinking the order is never interleaved with another call.
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const v = this.map.get(key) as V;
    this.map.delete(key); // re-insert = move to the most-recent end
    this.map.set(key, v);
    return v;
  }

  put(key: K, val: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size === this.capacity) {
      // evict in the SAME step
      const lru = this.map.keys().next().value as K;
      this.map.delete(lru);
    }
    this.map.set(key, val);
  }

  size(): number {
    return this.map.size;
  }

  consistent(): boolean {
    return this.map.size <= this.capacity; // never more entries than capacity
  }
}

async function main(): Promise<void> {
  const cache = new ConcurrentLRUCache<number, number>(10);
  const worker = async (): Promise<void> => {
    for (let i = 0; i < 20_000; i++) {
      if (i % 500 === 0) await Promise.resolve(); // let the other workers interleave
      const k = Math.floor(Math.random() * 100);
      if (Math.random() < 0.5) cache.put(k, k * k);
      else cache.get(k);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log("size=" + cache.size() + " consistent=" + cache.consistent()); // size=10 consistent=true
}

main();` },
          { lang: 'cpp', code: `template <class K, class V>
class ConcurrentLRUCache {
    using Entry = pair<K, V>;
    size_t capacity_;
    list<Entry> order_;                                         // doubly linked list: front = MRU, back = LRU
    unordered_map<K, typename list<Entry>::iterator> map_;      // guarded by mu_
    mutable mutex mu_;

public:
    explicit ConcurrentLRUCache(size_t capacity) : capacity_(capacity) {
        if (capacity == 0) throw invalid_argument("capacity");
    }

    optional<V> get(const K& key) {
        lock_guard lk(mu_);                                     // EXCLUSIVE even for reads: get() relinks the list
        auto it = map_.find(key);
        if (it == map_.end()) return nullopt;
        order_.splice(order_.begin(), order_, it->second);      // O(1) move to the front
        return it->second->second;
    }

    void put(const K& key, const V& val) {
        lock_guard lk(mu_);
        auto it = map_.find(key);
        if (it != map_.end()) {
            it->second->second = val;
            order_.splice(order_.begin(), order_, it->second);
            return;
        }
        if (map_.size() == capacity_) {                         // evict in the SAME critical section
            map_.erase(order_.back().first);
            order_.pop_back();
        }
        order_.emplace_front(key, val);
        map_[key] = order_.begin();
    }

    size_t size() const {
        lock_guard lk(mu_);
        return map_.size();
    }

    // invariant check: the list and the map describe the same set of keys
    bool consistent() const {
        lock_guard lk(mu_);
        size_t count = 0;
        for (auto it = order_.begin(); it != order_.end(); ++it, ++count) {
            auto m = map_.find(it->first);
            if (m == map_.end() || m->second != it) return false;
        }
        return count == map_.size() && count <= capacity_;
    }
};

int main() {
    ConcurrentLRUCache<int, int> cache(10);
    {
        vector<jthread> pool;
        for (int t = 0; t < 8; t++)
            pool.emplace_back([&cache, t] {
                mt19937 rng(t);
                for (int i = 0; i < 20000; i++) {
                    int k = rng() % 100;
                    if (rng() % 2) cache.put(k, k * k); else cache.get(k);
                }
            });
    }
    cout << "size=" << cache.size() << " consistent=" << boolalpha << cache.consistent() << "\\n";   // size=10 consistent=true
}` }
        ] }, { lang: 'java', title: 'Shortcuts: synchronized LinkedHashMap, and a striped LRU for more throughput', code: `class SimpleLRU<K, V> {
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
}`, alt: [
          { lang: 'python', code: `import threading
from collections import OrderedDict
from typing import Generic, TypeVar

K = TypeVar("K")
V = TypeVar("V")


class SimpleLRU(Generic[K, V]):
    def __init__(self, capacity: int) -> None:
        self._capacity = capacity
        self._map: OrderedDict[K, V] = OrderedDict()   # move_to_end on get => get MUTATES the map
        self._lock = threading.Lock()                  # every call, including get, takes the lock

    def get(self, k: K) -> V | None:
        with self._lock:
            if k not in self._map:
                return None
            self._map.move_to_end(k)
            return self._map[k]

    def put(self, k: K, v: V) -> None:
        with self._lock:
            self._map[k] = v
            self._map.move_to_end(k)
            if len(self._map) > self._capacity:
                self._map.popitem(last=False)


def java_hash(s: str) -> int:
    """Java's String.hashCode, so the same keys land on the same stripes in every language."""
    h = 0
    for ch in s:
        h = (31 * h + ord(ch)) & 0xFFFFFFFF
    return h


# N independent LRUs; a key always maps to the same stripe. Threads on different stripes never wait.
# Trade-off: eviction is LRU *within a stripe*, so globally it is approximate.
class StripedLRU(Generic[V]):
    def __init__(self, stripe_count: int, capacity_per_stripe: int) -> None:
        self._stripes: list[SimpleLRU[str, V]] = [SimpleLRU(capacity_per_stripe) for _ in range(stripe_count)]

    def _stripe(self, key: str) -> SimpleLRU[str, V]:
        h = java_hash(key)
        h ^= h >> 16                                   # spread high bits like HashMap does
        return self._stripes[h % len(self._stripes)]

    def get(self, k: str) -> V | None:
        return self._stripe(k).get(k)

    def put(self, k: str, v: V) -> None:
        self._stripe(k).put(k, v)


if __name__ == "__main__":
    c: StripedLRU[int] = StripedLRU(4, 2)
    for s in ["a", "b", "c", "d", "e", "f"]:
        c.put(s, len(s))
    print(c.get("a"), c.get("f"))   # values (or None if evicted from its stripe)` },
          { lang: 'ts', code: `class SimpleLRU<K, V> {
  private readonly map = new Map<K, V>(); // insertion order: first key = least recently used

  constructor(private readonly capacity: number) {}

  get(k: K): V | undefined {
    if (!this.map.has(k)) return undefined;
    const v = this.map.get(k) as V;
    this.map.delete(k); // get MUTATES the order: re-insert at the most-recent end
    this.map.set(k, v);
    return v;
  }

  put(k: K, v: V): void {
    this.map.delete(k);
    this.map.set(k, v);
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value as K);
  }
}

// Java's String.hashCode, so the same keys land on the same stripes in every language.
function javaHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

// N independent LRUs; a key always maps to the same stripe. (Across Workers, stripes are what lets them avoid one big lock.)
// Trade-off: eviction is LRU *within a stripe*, so globally it is approximate.
class StripedLRU<V> {
  private readonly stripes: SimpleLRU<string, V>[] = [];

  constructor(stripeCount: number, capacityPerStripe: number) {
    for (let i = 0; i < stripeCount; i++) this.stripes.push(new SimpleLRU(capacityPerStripe));
  }

  private stripe(key: string): SimpleLRU<string, V> {
    let h = javaHash(key);
    h ^= h >>> 16; // spread high bits like HashMap does
    return this.stripes[((h % this.stripes.length) + this.stripes.length) % this.stripes.length];
  }

  get(k: string): V | undefined {
    return this.stripe(k).get(k);
  }

  put(k: string, v: V): void {
    this.stripe(k).put(k, v);
  }
}

const c = new StripedLRU<number>(4, 2);
for (const s of ["a", "b", "c", "d", "e", "f"]) c.put(s, s.length);
console.log(c.get("a"), c.get("f")); // values (or undefined if evicted from its stripe)` },
          { lang: 'cpp', code: `template <class K, class V>
class SimpleLRU {
    size_t capacity_;
    list<pair<K, V>> order_;                                  // front = most recent
    unordered_map<K, typename list<pair<K, V>>::iterator> map_;
    mutex mu_;                                                // every call, including get, takes the lock

public:
    explicit SimpleLRU(size_t capacity) : capacity_(capacity) {}

    optional<V> get(const K& k) {
        lock_guard lk(mu_);
        auto it = map_.find(k);
        if (it == map_.end()) return nullopt;
        order_.splice(order_.begin(), order_, it->second);    // get MUTATES the order
        return it->second->second;
    }

    void put(const K& k, const V& v) {
        lock_guard lk(mu_);
        auto it = map_.find(k);
        if (it != map_.end()) { it->second->second = v; order_.splice(order_.begin(), order_, it->second); return; }
        order_.emplace_front(k, v);
        map_[k] = order_.begin();
        if (map_.size() > capacity_) { map_.erase(order_.back().first); order_.pop_back(); }
    }
};

// Java's String.hashCode, so the same keys land on the same stripes in every language.
uint32_t javaHash(const string& s) {
    uint32_t h = 0;
    for (unsigned char ch : s) h = 31 * h + ch;
    return h;
}

// N independent LRUs; a key always maps to the same stripe. Threads on different stripes never wait.
// Trade-off: eviction is LRU *within a stripe*, so globally it is approximate.
template <class V>
class StripedLRU {
    vector<unique_ptr<SimpleLRU<string, V>>> stripes_;        // SimpleLRU holds a mutex, so it is not movable

    SimpleLRU<string, V>& stripe(const string& key) {
        uint32_t h = javaHash(key);
        h ^= (h >> 16);                                       // spread high bits like HashMap does
        return *stripes_[h % stripes_.size()];
    }

public:
    StripedLRU(int stripeCount, int capacityPerStripe) {
        for (int i = 0; i < stripeCount; i++) stripes_.push_back(make_unique<SimpleLRU<string, V>>(capacityPerStripe));
    }
    optional<V> get(const string& k) { return stripe(k).get(k); }
    void put(const string& k, const V& v) { stripe(k).put(k, v); }
};

int main() {
    StripedLRU<int> c(4, 2);
    for (const char* s : {"a", "b", "c", "d", "e", "f"}) c.put(s, static_cast<int>(strlen(s)));
    auto a = c.get("a"), f = c.get("f");
    cout << (a ? to_string(*a) : "null") << " " << (f ? to_string(*f) : "null") << "\\n";   // values (or null if evicted)
}` }
        ] }],
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
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from typing import Generic, TypeVar

K = TypeVar("K")
V = TypeVar("V")


@dataclass
class ClockSlot(Generic[K, V]):
    key: K
    value: V
    referenced: bool = False     # set on every hit: a cheap write, no relinking` },
          { lang: 'ts', code: `class ClockSlot<K, V> {
  referenced = false; // set on every hit: a cheap write, no relinking

  constructor(readonly key: K, public value: V) {}
}` },
          { lang: 'cpp', code: `template <class K, class V>
struct ClockSlot {
    K key;
    atomic<V> value;                  // readers and the clock hand touch these without a lock
    atomic<bool> referenced{false};   // set on every hit: a cheap write, no relinking
    ClockSlot(K k, V v) : key(std::move(k)), value(v) {}
};` }
        ] },
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
      brute: { why: `<p><b>Global lock with load inside</b>: correct and stampede-free, but every hit waits behind every miss's 20 ms DB call — at 64 threads latency explodes. <b>Unsynchronized check-then-load</b>: no waiting, but 100 simultaneous misses fire 100 DB queries (stampede) and the unsynchronized LRU corrupts.</p>`, code: { lang: 'java', code: `class LoadingLRUBrute<K, V> {
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
}`, alt: [{ lang: 'python', code: "import threading\nfrom collections import OrderedDict\n\nclass LoadingLRUBrute:\n    def __init__(self, capacity, loader):\n        self.capacity, self.loader = capacity, loader\n        self.map = OrderedDict()                      # insertion order = recency order\n        self.lock = threading.Lock()\n\n    # BRUTE: the slow loader runs while holding the ONLY lock => hits queue behind DB calls\n    def get(self, key):\n        with self.lock:\n            if key in self.map:\n                self.map.move_to_end(key)\n                return self.map[key]\n            v = self.loader(key)\n            self.map[key] = v\n            if len(self.map) > self.capacity: self.map.popitem(last=False)\n            return v\n" }, { lang: 'ts', code: "import { Mutex } from \"async-mutex\";\n\nclass LoadingLRUBrute<K, V> {\n  private map = new Map<K, V>();                      // insertion order = recency order\n  private mutex = new Mutex();\n  constructor(private capacity: number, private loader: (k: K) => Promise<V>) {}\n\n  // BRUTE: the slow loader runs while holding the ONLY lock => hits queue behind DB calls\n  get(key: K): Promise<V> {\n    return this.mutex.runExclusive(async () => {\n      let v = this.map.get(key);\n      if (v !== undefined) this.map.delete(key);      // re-inserted below as most recent\n      else v = await this.loader(key);\n      this.map.set(key, v);\n      if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value as K);\n      return v;\n    });\n  }\n}\n" }, { lang: 'cpp', code: "template <class K, class V>\nclass LoadingLRUBrute {\n    list<pair<K, V>> order;                           // front = most recently used\n    unordered_map<K, typename list<pair<K, V>>::iterator> map;\n    function<V(const K&)> loader;\n    size_t capacity;\n    mutex m;\npublic:\n    LoadingLRUBrute(size_t capacity, function<V(const K&)> loader) : loader(loader), capacity(capacity) {}\n\n    // BRUTE: the slow loader runs while holding the ONLY lock => hits queue behind DB calls\n    V get(const K& key) {\n        lock_guard<mutex> g(m);\n        auto it = map.find(key);\n        if (it != map.end()) { order.splice(order.begin(), order, it->second); return it->second->second; }\n        V v = loader(key);\n        order.emplace_front(key, v);\n        map[key] = order.begin();\n        if (order.size() > capacity) { map.erase(order.back().first); order.pop_back(); }\n        return v;\n    }\n};\n" }] } },
      mcq: { q: 'Why not just call <code>chm.computeIfAbsent(key, loader)</code> on a ConcurrentHashMap and be done?', options: ['It has no eviction (unbounded), and the slow loader runs while holding that key\'s bin lock, blocking other keys in the same bin', 'computeIfAbsent may call the loader twice for one key', 'computeIfAbsent is not thread-safe', 'It cannot store null values, which is fine, so it is perfect'], answer: 0, explain: 'computeIfAbsent does give single-flight, but the function runs under the bin lock (other keys hashing to that bin wait), it must not touch the map, and there is no capacity bound or LRU order. Combine an LRU (under a short lock) with a separate in-flight map of futures.' },
      hints: [`<p>Hint 1: Separate two concerns: (1) the LRU structure — fast ops under a short lock; (2) loading — slow, must happen with <b>no</b> lock held.</p>`, `<p>Hint 2: Keep a <code>ConcurrentHashMap&lt;K, CompletableFuture&lt;V&gt;&gt; inFlight</code>. The thread whose <code>putIfAbsent</code> wins does the load; everyone else <code>join()</code>s the winner's future.</p>`, `<p>Hint 3: Winner: re-check the LRU (someone may have just finished), load, put into LRU, complete the future (or completeExceptionally), and finally <code>inFlight.remove(key, future)</code> so the next miss can retry.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "db calls=1 distinct results=[value-of-p42]\nsmall cache loads=4\nloader failed: db down\nloader failed: db down\nloads after failures=6 (failures are not cached)\n" }] },
      solution: {
        approach: `<p><b>Two-level design.</b> The LRU (HashMap + DLL or synchronized access-ordered LinkedHashMap) is touched only for O(1) get/put under its lock — hits never wait for I/O. Misses go through a <b>single-flight</b> map of futures: <code>putIfAbsent</code> elects exactly one loader per key; others block on <code>join()</code> without holding any lock. Errors propagate to all waiters and the in-flight entry is removed in <code>finally</code>, so a later call retries. The conditional <code>remove(key, f)</code> ensures we never delete a newer flight.</p>
<p><b>In Python, TypeScript and C++.</b> Single-flight maps to each language's future type: Python stores a <code>concurrent.futures.Future</code> per key, C++ a <code>shared_future</code> (an exception set on the promise reaches every waiter), TypeScript simply stores the in-flight <code>Promise</code> and deletes it in <code>finally</code>. The LRU part is an <code>OrderedDict</code> (Python), a <code>list</code> plus <code>unordered_map</code> of iterators (C++) or a <code>Map</code> that iterates in insertion order (TypeScript).</p>`,
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

        AtomicInteger loads = new AtomicInteger();
        LoadingLRU<String, String> small = new LoadingLRU<>(2, k -> {
            loads.incrementAndGet();
            if (k.equals("bad")) throw new IllegalStateException("db down");
            return k.toUpperCase();
        });
        small.get("a"); small.get("b"); small.get("a");      // a is a hit and becomes most recent
        small.get("c");                                      // evicts b, the least recently used
        small.get("b");                                      // b must be loaded again (evicts a)
        System.out.println("small cache loads=" + loads.get());                      // 4
        for (int i = 0; i < 2; i++) {
            try { small.get("bad"); }
            catch (IllegalStateException e) { System.out.println("loader failed: " + e.getMessage()); }
        }
        System.out.println("loads after failures=" + loads.get() + " (failures are not cached)");   // 6
    }
}`, alt: [
          { lang: 'python', code: `import threading
import time
from collections import OrderedDict
from collections.abc import Callable, Hashable
from concurrent.futures import Future, ThreadPoolExecutor
from typing import Generic, TypeVar

K = TypeVar("K", bound=Hashable)
V = TypeVar("V")
_MISS = object()


class LoadingLRU(Generic[K, V]):
    def __init__(self, capacity: int, loader: Callable[[K], V]) -> None:
        self._capacity = capacity
        self._loader = loader
        self._lru: OrderedDict[K, V] = OrderedDict()
        self._lru_lock = threading.Lock()              # short critical sections only
        self._in_flight: dict[K, Future[V]] = {}
        self._flight_lock = threading.Lock()

    def _lookup(self, key: K) -> object:
        with self._lru_lock:
            if key in self._lru:
                self._lru.move_to_end(key)             # a hit refreshes recency
                return self._lru[key]
            return _MISS

    def _store(self, key: K, value: V) -> None:
        with self._lru_lock:
            self._lru[key] = value
            self._lru.move_to_end(key)
            if len(self._lru) > self._capacity:
                self._lru.popitem(last=False)          # evict the least recently used

    def get(self, key: K) -> V:
        hit = self._lookup(key)                        # hit: O(1), never waits on I/O
        if hit is not _MISS:
            return hit  # type: ignore[return-value]

        with self._flight_lock:
            existing = self._in_flight.get(key)
            mine: Future[V] = Future()
            if existing is None:
                self._in_flight[key] = mine
        if existing is not None:
            return existing.result()                   # someone else is loading: wait for it

        try:
            again = self._lookup(key)                  # a load may have finished just now
            loaded = again if again is not _MISS else self._loader(key)   # slow call, NO lock held
            self._store(key, loaded)  # type: ignore[arg-type]
            mine.set_result(loaded)  # type: ignore[arg-type]
            return loaded  # type: ignore[return-value]
        except Exception as e:
            mine.set_exception(e)                      # every waiter sees the failure
            raise
        finally:
            with self._flight_lock:
                if self._in_flight.get(key) is mine:   # only remove OUR flight
                    del self._in_flight[key]


def main() -> None:
    db_calls = [0]
    calls_lock = threading.Lock()

    def db(k: str) -> str:
        with calls_lock:
            db_calls[0] += 1
        time.sleep(0.02)
        return "value-of-" + k

    cache: LoadingLRU[str, str] = LoadingLRU(100, db)
    go = threading.Event()

    def reader(_: int) -> str:
        go.wait()
        return cache.get("p42")

    with ThreadPoolExecutor(max_workers=32) as pool:
        futures = [pool.submit(reader, i) for i in range(32)]
        time.sleep(0.05)
        go.set()
        results = {f.result() for f in futures}
    print(f"db calls={db_calls[0]} distinct results=[{', '.join(sorted(results))}]")

    loads = [0]

    def flaky(k: str) -> str:
        loads[0] += 1
        if k == "bad":
            raise RuntimeError("db down")
        return k.upper()

    small: LoadingLRU[str, str] = LoadingLRU(2, flaky)
    small.get("a")
    small.get("b")
    small.get("a")                                     # a is a hit and becomes most recent
    small.get("c")                                     # evicts b, the least recently used
    small.get("b")                                     # b must be loaded again (evicts a)
    print(f"small cache loads={loads[0]}")
    for _ in range(2):
        try:
            small.get("bad")
        except RuntimeError as e:
            print(f"loader failed: {e}")
    print(f"loads after failures={loads[0]} (failures are not cached)")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `class LoadingLRU<K, V> {
  private readonly lru = new Map<K, V>(); // Map keeps insertion order: first key = least recently used
  private readonly inFlight = new Map<K, Promise<V>>();

  constructor(private readonly capacity: number, private readonly loader: (key: K) => Promise<V>) {}

  async get(key: K): Promise<V> {
    if (this.lru.has(key)) {
      const v = this.lru.get(key) as V;
      this.lru.delete(key); // re-insert to make it the most recent
      this.lru.set(key, v);
      return v; // hit: never waits on I/O
    }
    const existing = this.inFlight.get(key);
    if (existing) return existing; // someone else is loading: share their promise

    const flight = this.load(key).finally(() => {
      if (this.inFlight.get(key) === flight) this.inFlight.delete(key); // only remove OUR flight
    });
    this.inFlight.set(key, flight);
    return flight; // a rejection reaches every waiter, and nothing is cached
  }

  private async load(key: K): Promise<V> {
    const loaded = await this.loader(key); // slow call; the event loop keeps serving other keys
    this.lru.set(key, loaded);
    if (this.lru.size > this.capacity) {
      const eldest = this.lru.keys().next().value as K;
      this.lru.delete(eldest);
    }
    return loaded;
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  let dbCalls = 0;
  const cache = new LoadingLRU<string, string>(100, async (k) => {
    dbCalls++;
    await sleep(20);
    return "value-of-" + k;
  });
  const results = await Promise.all(Array.from({ length: 100 }, () => cache.get("p42")));
  console.log("db calls=" + dbCalls + " distinct results=[" + [...new Set(results)].join(", ") + "]");

  let loads = 0;
  const small = new LoadingLRU<string, string>(2, async (k) => {
    loads++;
    if (k === "bad") throw new Error("db down");
    return k.toUpperCase();
  });
  await small.get("a");
  await small.get("b");
  await small.get("a"); // a is a hit and becomes most recent
  await small.get("c"); // evicts b, the least recently used
  await small.get("b"); // b must be loaded again (evicts a)
  console.log("small cache loads=" + loads);
  for (let i = 0; i < 2; i++) {
    try {
      await small.get("bad");
    } catch (e) {
      console.log("loader failed: " + (e as Error).message);
    }
  }
  console.log("loads after failures=" + loads + " (failures are not cached)");
}

main();` },
          { lang: 'cpp', code: `template <class K, class V>
class LoadingLRU {
    size_t capacity_;
    function<V(const K&)> loader_;
    list<pair<K, V>> order_;                                      // front = most recent
    unordered_map<K, typename list<pair<K, V>>::iterator> index_;
    mutex lruMu_;                                                 // short critical sections only
    unordered_map<K, shared_future<V>> inFlight_;
    mutex flightMu_;

    optional<V> lookup(const K& key) {
        lock_guard lk(lruMu_);
        auto it = index_.find(key);
        if (it == index_.end()) return nullopt;
        order_.splice(order_.begin(), order_, it->second);        // a hit refreshes recency
        return it->second->second;
    }

    void store(const K& key, const V& value) {
        lock_guard lk(lruMu_);
        auto it = index_.find(key);
        if (it != index_.end()) { it->second->second = value; order_.splice(order_.begin(), order_, it->second); return; }
        order_.emplace_front(key, value);
        index_[key] = order_.begin();
        if (index_.size() > capacity_) {                          // evict the least recently used
            index_.erase(order_.back().first);
            order_.pop_back();
        }
    }

    void landed(const K& key) {
        lock_guard lk(flightMu_);
        inFlight_.erase(key);
    }

public:
    LoadingLRU(size_t capacity, function<V(const K&)> loader) : capacity_(capacity), loader_(std::move(loader)) {}

    V get(const K& key) {
        if (auto hit = lookup(key)) return *hit;                  // hit: O(1), never waits on I/O

        promise<V> mine;
        shared_future<V> existing;
        bool owner = false;
        {
            lock_guard lk(flightMu_);
            auto it = inFlight_.find(key);
            if (it != inFlight_.end()) existing = it->second;
            else { inFlight_.emplace(key, mine.get_future().share()); owner = true; }
        }
        if (!owner) return existing.get();                        // someone else is loading: wait for it

        try {
            auto again = lookup(key);                             // a load may have finished just now
            V loaded = again ? *again : loader_(key);             // slow call, NO lock held
            store(key, loaded);
            mine.set_value(loaded);
            landed(key);
            return loaded;
        } catch (...) {
            mine.set_exception(current_exception());              // every waiter sees the failure
            landed(key);
            throw;
        }
    }
};

int main() {
    atomic<int> dbCalls{0};
    LoadingLRU<string, string> cache(100, [&](const string& k) {
        dbCalls++;
        this_thread::sleep_for(20ms);
        return "value-of-" + k;
    });
    set<string> results;
    mutex resMu;
    {
        vector<jthread> pool;
        for (int i = 0; i < 32; i++)
            pool.emplace_back([&] {
                string v = cache.get("p42");
                lock_guard lk(resMu);
                results.insert(v);
            });
    }
    cout << "db calls=" << dbCalls << " distinct results=[";
    for (auto it = results.begin(); it != results.end(); ++it) cout << (it == results.begin() ? "" : ", ") << *it;
    cout << "]\\n";

    int loads = 0;
    LoadingLRU<string, string> small(2, [&](const string& k) -> string {
        loads++;
        if (k == "bad") throw runtime_error("db down");
        string up = k;
        for (char& c : up) c = static_cast<char>(toupper(c));
        return up;
    });
    small.get("a");
    small.get("b");
    small.get("a");                                               // a is a hit and becomes most recent
    small.get("c");                                               // evicts b, the least recently used
    small.get("b");                                               // b must be loaded again (evicts a)
    cout << "small cache loads=" << loads << "\\n";
    for (int i = 0; i < 2; i++) {
        try { small.get("bad"); }
        catch (const runtime_error& e) { cout << "loader failed: " << e.what() << "\\n"; }
    }
    cout << "loads after failures=" << loads << " (failures are not cached)\\n";
}` }
        ],
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
}`, alt: [
          { lang: 'python', code: `import enum
import threading
from concurrent.futures import ThreadPoolExecutor


class Status(enum.Enum):
    AVAILABLE = 0
    BOOKED = 1


class Show:
    def __init__(self, n: int) -> None:
        self._seats = [Status.AVAILABLE] * n
        self._owner: list[str | None] = [None] * n
        self._locks = [threading.Lock() for _ in range(n)]       # one lock per seat

    def book(self, user: str, *wanted: int) -> bool:
        """Returns True only if ALL requested seats were booked for this user."""
        ids = sorted(set(wanted))                                # GLOBAL ORDER => no circular wait
        locked: list[threading.Lock] = []
        try:
            for i in ids:
                if not self._locks[i].acquire(timeout=0.2):      # bounded wait, back off
                    return False
                locked.append(self._locks[i])
            if any(self._seats[i] is not Status.AVAILABLE for i in ids):   # check ALL first
                return False
            for i in ids:                                        # then act on ALL
                self._seats[i] = Status.BOOKED
                self._owner[i] = user
            return True
        finally:
            for lock in reversed(locked):                        # release what we took
                lock.release()

    def owner_of(self, seat: int) -> str | None:
        with self._locks[seat]:
            return self._owner[seat]


def main() -> None:
    for rnd in range(200):
        s = Show(6)
        with ThreadPoolExecutor(max_workers=2) as pool:
            a = pool.submit(s.book, "asha", 3, 4)
            b = pool.submit(s.book, "bala", 4, 3)                # opposite click order
            ra, rb = a.result(2), b.result(2)
        if ra == rb:
            raise RuntimeError(f"exactly one must win, round {rnd}")
        if s.owner_of(3) != s.owner_of(4):
            raise RuntimeError("split booking")
    print("200 rounds: always exactly one winner, never a deadlock, never a split booking")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `// A mutex for tasks. tryLock gives up after a timeout, like ReentrantLock.tryLock(time, unit).
class Mutex {
  private tail: Promise<void> = Promise.resolve();

  lock(): Promise<() => void> {
    let release!: () => void;
    const mine = new Promise<void>((resolve) => (release = resolve));
    const previous = this.tail;
    this.tail = previous.then(() => mine);
    return previous.then(() => release);
  }

  async tryLock(timeoutMs: number): Promise<(() => void) | null> {
    const pending = this.lock();
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
    const got = await Promise.race([pending, timeout]);
    if (got === null) void pending.then((unlock) => unlock()); // we gave up: hand the lock back if it ever arrives
    return got;
  }
}

enum Status {
  Available,
  Booked,
}

class Show {
  private readonly seats: Status[];
  private readonly owner: (string | null)[];
  private readonly locks: Mutex[]; // one lock per seat

  constructor(n: number) {
    this.seats = new Array<Status>(n).fill(Status.Available);
    this.owner = new Array<string | null>(n).fill(null);
    this.locks = Array.from({ length: n }, () => new Mutex());
  }

  // returns true only if ALL requested seats were booked for this user
  async book(user: string, ...wanted: number[]): Promise<boolean> {
    const ids = [...new Set(wanted)].sort((a, b) => a - b); // GLOBAL ORDER => no circular wait
    const unlocks: Array<() => void> = [];
    try {
      for (const id of ids) {
        const unlock = await this.locks[id].tryLock(200); // bounded wait, back off
        if (unlock === null) return false;
        unlocks.push(unlock);
      }
      if (ids.some((id) => this.seats[id] !== Status.Available)) return false; // check ALL first
      for (const id of ids) {
        // then act on ALL
        this.seats[id] = Status.Booked;
        this.owner[id] = user;
      }
      return true;
    } finally {
      for (const unlock of unlocks.reverse()) unlock(); // release what we took
    }
  }

  ownerOf(id: number): string | null {
    return this.owner[id];
  }
}

async function main(): Promise<void> {
  for (let round = 0; round < 200; round++) {
    const s = new Show(6);
    const [ra, rb] = await Promise.all([s.book("asha", 3, 4), s.book("bala", 4, 3)]); // opposite click order
    if (ra === rb) throw new Error("exactly one must win, round " + round);
    if (s.ownerOf(3) !== s.ownerOf(4)) throw new Error("split booking");
  }
  console.log("200 rounds: always exactly one winner, never a deadlock, never a split booking");
}

main();` },
          { lang: 'cpp', code: `class Show {
    enum class Status { AVAILABLE, BOOKED };
    vector<Status> seats_;
    vector<string> owner_;
    vector<timed_mutex> locks_;                         // one lock per seat

public:
    explicit Show(int n) : seats_(n, Status::AVAILABLE), owner_(n), locks_(n) {}

    // returns true only if ALL requested seats were booked for this user
    bool book(const string& user, vector<int> wanted) {
        sort(wanted.begin(), wanted.end());             // GLOBAL ORDER => no circular wait
        wanted.erase(unique(wanted.begin(), wanted.end()), wanted.end());
        vector<unique_lock<timed_mutex>> held;          // released automatically, in reverse order of declaration
        for (int id : wanted) {
            unique_lock lk(locks_[id], defer_lock);
            if (!lk.try_lock_for(200ms)) return false;  // bounded wait, back off
            held.push_back(std::move(lk));
        }
        for (int id : wanted) if (seats_[id] != Status::AVAILABLE) return false;   // check ALL first
        for (int id : wanted) { seats_[id] = Status::BOOKED; owner_[id] = user; }   // then act on ALL
        return true;
    }

    string ownerOf(int id) {
        lock_guard lk(locks_[id]);
        return owner_[id];
    }
};

int main() {
    for (int round = 0; round < 200; round++) {
        Show s(6);
        bool ra = false, rb = false;
        {
            jthread a([&] { ra = s.book("asha", {3, 4}); });
            jthread b([&] { rb = s.book("bala", {4, 3}); });   // opposite click order
        }
        if (ra == rb) throw runtime_error("exactly one must win, round " + to_string(round));
        if (s.ownerOf(3) != s.ownerOf(4)) throw runtime_error("split booking");
    }
    cout << "200 rounds: always exactly one winner, never a deadlock, never a split booking\\n";
}` }
        ] }, { lang: 'java', title: 'Optimistic: CAS seat holds with expiry and rollback', code: `class SeatHolds {
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
}`, alt: [
          { lang: 'python', code: `import threading
from collections.abc import Callable
from typing import NamedTuple


class Hold(NamedTuple):
    user: str
    expires_at: int
    confirmed: bool


class SeatHolds:
    def __init__(self, n: int, hold_millis: int, clock_millis: Callable[[], int]) -> None:
        self._seats: list[Hold | None] = [None] * n    # None = AVAILABLE
        self._cas_lock = threading.Lock()              # CPython has no CAS on a list cell: emulate it
        self._hold_millis = hold_millis
        self._clock = clock_millis

    def _get(self, i: int) -> Hold | None:
        return self._seats[i]

    def _compare_and_set(self, i: int, expected: Hold | None, new: Hold | None) -> bool:
        with self._cas_lock:
            if self._seats[i] is not expected:         # identity, like a real CAS
                return False
            self._seats[i] = new
            return True

    @staticmethod
    def _is_free(h: Hold | None, now: int) -> bool:
        return h is None or (not h.confirmed and h.expires_at <= now)

    def hold(self, user: str, *ids: int) -> bool:
        """All-or-nothing hold; never blocks on a seat, never deadlocks."""
        now = self._clock()
        mine = Hold(user, now + self._hold_millis, False)
        taken: list[int] = []
        for i in sorted(set(ids)):
            cur = self._get(i)
            # CAS succeeds only if nobody changed this seat since we read it
            if not self._is_free(cur, now) or not self._compare_and_set(i, cur, mine):
                for t in taken:
                    self._compare_and_set(t, mine, None)   # roll back our holds
                return False
            taken.append(i)
        return True

    def confirm(self, user: str, *ids: int) -> bool:
        """Payment succeeded: HELD(user) -> BOOKED(user), only if our hold is still live."""
        now = self._clock()
        for i in ids:
            h = self._get(i)
            if h is None or h.user != user or h.confirmed or h.expires_at <= now:
                return False
        for i in ids:
            if not self._compare_and_set(i, self._get(i), Hold(user, 2**63 - 1, True)):
                return False
        return True


def yn(b: bool) -> str:
    return str(b).lower()


if __name__ == "__main__":
    now = [0]
    show = SeatHolds(10, 600_000, lambda: now[0])          # 10-minute holds
    print("asha holds 3,4:", yn(show.hold("asha", 3, 4)))  # true
    print("bala holds 4,5:", yn(show.hold("bala", 4, 5)))  # false (4 is held), 5 rolled back
    print("bala holds 5:  ", yn(show.hold("bala", 5)))     # true: rollback freed it
    now[0] = 700_000                                       # asha never paid: hold expired
    print("asha confirms: ", yn(show.confirm("asha", 3, 4)))   # false
    print("bala holds 4:  ", yn(show.hold("bala", 4)))     # true: expired seat reusable
    print("bala confirms: ", yn(show.confirm("bala", 4)))  # true` },
          { lang: 'ts', code: `interface Hold {
  readonly user: string;
  readonly expiresAt: number;
  readonly confirmed: boolean;
}

class SeatHolds {
  private readonly seats: (Hold | null)[]; // null = AVAILABLE

  constructor(n: number, private readonly holdMillis: number, private readonly clock: () => number) {
    this.seats = new Array<Hold | null>(n).fill(null);
  }

  // Compare-and-set on a cell. With one event-loop thread it is trivially atomic;
  // it stays here because the all-or-nothing + rollback shape is the pattern.
  private compareAndSet(i: number, expected: Hold | null, next: Hold | null): boolean {
    if (this.seats[i] !== expected) return false;
    this.seats[i] = next;
    return true;
  }

  private static isFree(h: Hold | null, now: number): boolean {
    return h === null || (!h.confirmed && h.expiresAt <= now);
  }

  // all-or-nothing hold; never blocks, never deadlocks
  hold(user: string, ...ids: number[]): boolean {
    const now = this.clock();
    const mine: Hold = { user, expiresAt: now + this.holdMillis, confirmed: false };
    const taken: number[] = [];
    for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
      const cur = this.seats[id];
      // succeeds only if nobody changed this seat since we read it
      if (!SeatHolds.isFree(cur, now) || !this.compareAndSet(id, cur, mine)) {
        for (const t of taken) this.compareAndSet(t, mine, null); // roll back our holds
        return false;
      }
      taken.push(id);
    }
    return true;
  }

  // payment succeeded: HELD(user) -> BOOKED(user), only if our hold is still live
  confirm(user: string, ...ids: number[]): boolean {
    const now = this.clock();
    for (const id of ids) {
      const h = this.seats[id];
      if (h === null || h.user !== user || h.confirmed || h.expiresAt <= now) return false;
    }
    for (const id of ids) {
      if (!this.compareAndSet(id, this.seats[id], { user, expiresAt: Number.MAX_SAFE_INTEGER, confirmed: true })) return false;
    }
    return true;
  }
}

let now = 0;
const show = new SeatHolds(10, 600_000, () => now); // 10-minute holds
console.log("asha holds 3,4: " + show.hold("asha", 3, 4)); // true
console.log("bala holds 4,5: " + show.hold("bala", 4, 5)); // false (4 is held), 5 rolled back
console.log("bala holds 5:   " + show.hold("bala", 5)); // true: rollback freed it
now = 700_000; // asha never paid: hold expired
console.log("asha confirms:  " + show.confirm("asha", 3, 4)); // false
console.log("bala holds 4:   " + show.hold("bala", 4)); // true: expired seat reusable
console.log("bala confirms:  " + show.confirm("bala", 4)); // true` },
          { lang: 'cpp', code: `class SeatHolds {
    struct Hold {
        string user;
        long long expiresAt;
        bool confirmed;
    };
    using HoldPtr = shared_ptr<const Hold>;             // null = AVAILABLE
    vector<atomic<HoldPtr>> seats_;
    function<long long()> clock_;
    long long holdMillis_;

    static bool isFree(const HoldPtr& h, long long now) { return !h || (!h->confirmed && h->expiresAt <= now); }

public:
    SeatHolds(int n, long long holdMillis, function<long long()> clockMillis)
        : seats_(n), clock_(std::move(clockMillis)), holdMillis_(holdMillis) {}

    // all-or-nothing hold; never blocks, never deadlocks
    bool hold(const string& user, vector<int> ids) {
        long long now = clock_();
        HoldPtr mine = make_shared<const Hold>(Hold{user, now + holdMillis_, false});
        sort(ids.begin(), ids.end());
        ids.erase(unique(ids.begin(), ids.end()), ids.end());
        vector<int> taken;
        for (int id : ids) {
            HoldPtr cur = seats_[id].load();
            // CAS succeeds only if nobody changed this seat since we read it
            if (!isFree(cur, now) || !seats_[id].compare_exchange_strong(cur, mine)) {
                for (int t : taken) { HoldPtr m = mine; seats_[t].compare_exchange_strong(m, nullptr); }   // roll back
                return false;
            }
            taken.push_back(id);
        }
        return true;
    }

    // payment succeeded: HELD(user) -> BOOKED(user), only if our hold is still live
    bool confirm(const string& user, const vector<int>& ids) {
        long long now = clock_();
        for (int id : ids) {
            HoldPtr h = seats_[id].load();
            if (!h || h->user != user || h->confirmed || h->expiresAt <= now) return false;
        }
        for (int id : ids) {
            HoldPtr h = seats_[id].load();
            if (!seats_[id].compare_exchange_strong(h, make_shared<const Hold>(Hold{user, LLONG_MAX, true}))) return false;
        }
        return true;
    }
};

int main() {
    atomic<long long> now{0};
    SeatHolds show(10, 600'000, [&] { return now.load(); });   // 10-minute holds
    cout << boolalpha;
    cout << "asha holds 3,4: " << show.hold("asha", {3, 4}) << "\\n";    // true
    cout << "bala holds 4,5: " << show.hold("bala", {4, 5}) << "\\n";    // false (4 is held), 5 rolled back
    cout << "bala holds 5:   " << show.hold("bala", {5}) << "\\n";       // true: rollback freed it
    now = 700'000;                                                      // asha never paid: hold expired
    cout << "asha confirms:  " << show.confirm("asha", {3, 4}) << "\\n"; // false
    cout << "bala holds 4:   " << show.hold("bala", {4}) << "\\n";       // true: expired seat reusable
    cout << "bala confirms:  " << show.confirm("bala", {4}) << "\\n";    // true
}` }
        ] }],
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
}`, alt: [
          { lang: 'python', code: `import threading


class ShowSeats:
    def __init__(self, n: int) -> None:
        self._booked = [False] * n
        self._lock = threading.Lock()                   # lock = this show only

    def book(self, *ids: int) -> bool:
        with self._lock:
            if any(self._booked[i] for i in ids):
                return False
            for i in ids:
                self._booked[i] = True
            return True


class Theater:
    def __init__(self) -> None:
        self._shows: dict[str, ShowSeats] = {}
        self._lock = threading.Lock()

    def book(self, show_id: str, *ids: int) -> bool:
        with self._lock:                                # held only to look the show up
            show = self._shows.setdefault(show_id, ShowSeats(100))
        return show.book(*ids)` },
          { lang: 'ts', code: `class ShowSeats {
  private readonly booked: boolean[];

  constructor(n: number) {
    this.booked = new Array<boolean>(n).fill(false);
  }

  book(...ids: number[]): boolean {
    // synchronous: check-all-then-book-all cannot be interleaved
    if (ids.some((id) => this.booked[id])) return false;
    for (const id of ids) this.booked[id] = true;
    return true;
  }
}

class Theater {
  private readonly shows = new Map<string, ShowSeats>();

  book(showId: string, ...ids: number[]): boolean {
    let show = this.shows.get(showId);
    if (!show) this.shows.set(showId, (show = new ShowSeats(100)));
    return show.book(...ids);
  }
}` },
          { lang: 'cpp', code: `class Theater {
    class ShowSeats {
        vector<bool> booked_;
        mutex mu_;                                      // lock = this show only

    public:
        explicit ShowSeats(int n) : booked_(n, false) {}
        bool book(const vector<int>& ids) {
            lock_guard lk(mu_);
            for (int id : ids) if (booked_[id]) return false;
            for (int id : ids) booked_[id] = true;
            return true;
        }
    };

    unordered_map<string, shared_ptr<ShowSeats>> shows_;
    mutex mu_;

public:
    bool book(const string& showId, const vector<int>& ids) {
        shared_ptr<ShowSeats> show;
        {
            lock_guard lk(mu_);                         // held only to look the show up
            auto& slot = shows_[showId];
            if (!slot) slot = make_shared<ShowSeats>(100);
            show = slot;
        }
        return show->book(ids);
    }
};` }
        ] },
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
}`, alt: [
          { lang: 'python', code: `import threading


class FlashSale:
    def __init__(self) -> None:
        self._stock = 100
        self._lock = threading.Lock()

    def buy(self) -> bool:
        with self._lock:                  # check AND decrement as one step: stock can never go below zero
            if self._stock == 0:
                return False              # sold out: fail fast
            self._stock -= 1
            return True` },
          { lang: 'ts', code: `class FlashSale {
  private stock = 100;

  buy(): boolean {
    if (this.stock === 0) return false; // sold out: fail fast
    this.stock--; // check and decrement are one synchronous step: stock can never go below zero
    return true;
  }
}` },
          { lang: 'cpp', code: `class FlashSale {
    atomic<int> stock_{100};

public:
    bool buy() {
        int s = stock_.load();
        while (true) {
            if (s == 0) return false;                         // sold out: fail fast
            if (stock_.compare_exchange_weak(s, s - 1)) return true;   // on failure s is reloaded: retry
        }
    }
};` }
        ] },
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
      brute: { why: `<p><b>No lock:</b> two threads both scan the room's list, see no overlap, and both add → overlapping meetings. Also <code>ArrayList</code>/<code>TreeMap</code> corrupt under concurrent writes. <b>One global lock:</b> correct, but every booking in a 10k-room campus waits for every other, and the O(n) list scan happens inside that lock.</p>`, code: { lang: 'java', code: `class RoomBookerBrute {
    private final Map<String, List<int[]>> rooms = new HashMap<>();

    // correct only because EVERYTHING is serialized on one monitor; O(n) scan inside the lock
    synchronized boolean book(String roomId, int start, int end, String user) {
        List<int[]> list = rooms.computeIfAbsent(roomId, r -> new ArrayList<>());
        for (int[] b : list) if (start < b[1] && b[0] < end) return false;   // overlap test
        list.add(new int[]{start, end});
        return true;
    }
}`, alt: [{ lang: 'python', code: "import threading\n\nclass RoomBookerBrute:\n    def __init__(self):\n        self.rooms = {}\n        self.lock = threading.Lock()\n\n    # correct only because EVERYTHING is serialized on one lock; O(n) scan inside the lock\n    def book(self, room_id, start, end, user):\n        with self.lock:\n            lst = self.rooms.setdefault(room_id, [])\n            for s, e in lst:\n                if start < e and s < end: return False       # overlap test\n            lst.append((start, end))\n            return True\n" }, { lang: 'ts', code: "import { Mutex } from \"async-mutex\";\n\nclass RoomBookerBrute {\n  private rooms = new Map<string, number[][]>();\n  private mutex = new Mutex();\n\n  // correct only because EVERYTHING is serialized on one lock; O(n) scan inside the lock\n  book(roomId: string, start: number, end: number, user: string): Promise<boolean> {\n    return this.mutex.runExclusive(() => {\n      if (!this.rooms.has(roomId)) this.rooms.set(roomId, []);\n      const list = this.rooms.get(roomId)!;\n      for (const b of list) if (start < b[1] && b[0] < end) return false;   // overlap test\n      list.push([start, end]);\n      return true;\n    });\n  }\n}\n" }, { lang: 'cpp', code: "class RoomBookerBrute {\n    unordered_map<string, vector<pair<int, int>>> rooms;\n    mutex m;\npublic:\n    // correct only because EVERYTHING is serialized on one mutex; O(n) scan inside the lock\n    bool book(const string& roomId, int start, int end, const string& user) {\n        lock_guard<mutex> g(m);\n        auto& list = rooms[roomId];\n        for (auto& b : list) if (start < b.second && b.first < end) return false;   // overlap test\n        list.push_back({start, end});\n        return true;\n    }\n};\n" }] } },
      mcq: { q: 'In <code>bookAny</code>, why must you <b>not</b> lock all candidate rooms first and then pick one?', options: ['Locking many rooms blocks unrelated bookers and, without a global order, can deadlock with another bookAny using a different list order', 'Because a thread can hold only one lock at a time', 'Because TreeMap is not thread-safe', 'It is fine and the fastest approach'], answer: 0, explain: 'Each room\'s booking is independent, so try rooms one at a time: lock room, check, book or move on. You hold at most one lock at any moment, which makes deadlock impossible and keeps contention low.' },
      hints: [`<p>Hint 1: The unit of conflict is a <b>room</b>. Give each room its own lock and its own sorted structure.</p>`, `<p>Hint 2: A <code>TreeMap&lt;Integer, Integer&gt;</code> (start → end) per room: the only intervals that can overlap [s, e) are <code>floorEntry(s)</code> (must end ≤ s) and <code>ceilingEntry(s)</code> (must start ≥ e). O(log n).</p>`, `<p>Hint 3: <code>ConcurrentHashMap.computeIfAbsent</code> creates each Room once; <code>synchronized</code> methods on Room do check + insert atomically. bookAny = loop over rooms, call room.book, stop at the first success — never hold two room locks.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "false false true\nempty interval rejected: empty interval\nbookAny: true R3 bookings=1\nbookAny only R1: false\nwinners for R2 [700,760): 1\n" }] },
      solution: {
        approach: `<p><b>Lock per room</b> + <b>TreeMap interval check</b>. The room registry is a <code>ConcurrentHashMap</code> (lock-free lookups, atomic room creation). Each <code>Room</code> guards its <code>TreeMap</code> with its own monitor; <code>book</code> performs the floor/ceiling overlap check and the insert inside one critical section, so no other booking for that room can slip in between. <code>bookAny</code> tries rooms one at a time and never holds more than one lock, so it cannot deadlock and does not block unrelated rooms.</p>
<p><b>In Python, TypeScript and C++.</b> A sorted structure per room replaces <code>TreeMap</code>: Python uses <code>bisect</code> on a sorted list of start times, C++ uses <code>std::map</code> with <code>lower_bound</code> (floor and ceiling are one step either side of it), TypeScript uses a sorted array with a binary search. Each room has its own <code>Lock</code> / <code>mutex</code>; TypeScript needs none because <code>book</code> is synchronous. <code>bookAny</code> holds at most one room at a time in every language.</p>`,
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

    int bookingsIn(String roomId) { return room(roomId).count(); }
}

class RoomBookerDemo {
    public static void main(String[] args) throws InterruptedException {
        RoomBooker rb = new RoomBooker();
        rb.book("R1", 600, 660, "dev");
        System.out.println(rb.book("R1", 630, 700, "asha") + " " + rb.book("R1", 650, 720, "bala")
                + " " + rb.book("R1", 660, 720, "chen"));                 // false false true

        try { rb.book("R1", 700, 700, "zed"); }
        catch (IllegalArgumentException e) { System.out.println("empty interval rejected: " + e.getMessage()); }
        System.out.println("bookAny: " + rb.bookAny(List.of("R1", "R3"), 600, 660, "dana")      // R1 is busy -> falls to R3
                + " R3 bookings=" + rb.bookingsIn("R3"));
        System.out.println("bookAny only R1: " + rb.bookAny(List.of("R1"), 610, 620, "eve"));   // false

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
}`, alt: [
          { lang: 'python', code: `import threading
from bisect import bisect_left, bisect_right, insort
from concurrent.futures import ThreadPoolExecutor


class Room:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._starts: list[int] = []             # sorted start times, guarded by _lock
        self._ends: dict[int, int] = {}          # start -> end
        self._owners: dict[int, str] = {}        # start -> user

    def book(self, start: int, end: int, user: str) -> bool:
        if start >= end:
            raise ValueError("empty interval")
        with self._lock:
            i = bisect_right(self._starts, start)
            if i > 0 and self._ends[self._starts[i - 1]] > start:
                return False                     # previous meeting runs into us
            j = bisect_left(self._starts, start)
            if j < len(self._starts) and self._starts[j] < end:
                return False                     # next meeting starts before we end
            insort(self._starts, start)
            self._ends[start] = end
            self._owners[start] = user
            return True

    def count(self) -> int:
        with self._lock:
            return len(self._starts)


class RoomBooker:
    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}
        self._map_lock = threading.Lock()

    def _room(self, room_id: str) -> Room:
        with self._map_lock:
            return self._rooms.setdefault(room_id, Room())

    def book(self, room_id: str, start: int, end: int, user: str) -> bool:
        return self._room(room_id).book(start, end, user)

    def book_any(self, room_ids: list[str], start: int, end: int, user: str) -> bool:
        # holds at most ONE room lock at a time => no deadlock, minimal blocking
        return any(self._room(r).book(start, end, user) for r in room_ids)

    def bookings_in(self, room_id: str) -> int:
        return self._room(room_id).count()


def main() -> None:
    rb = RoomBooker()
    rb.book("R1", 600, 660, "dev")
    flags = [rb.book("R1", 630, 700, "asha"), rb.book("R1", 650, 720, "bala"), rb.book("R1", 660, 720, "chen")]
    print(" ".join(str(f).lower() for f in flags))
    try:
        rb.book("R1", 700, 700, "zed")
    except ValueError as e:
        print(f"empty interval rejected: {e}")
    print(f"bookAny: {str(rb.book_any(['R1', 'R3'], 600, 660, 'dana')).lower()} R3 bookings={rb.bookings_in('R3')}")
    print(f"bookAny only R1: {str(rb.book_any(['R1'], 610, 620, 'eve')).lower()}")

    # 64 threads race for the same slot in R2: exactly one wins
    with ThreadPoolExecutor(max_workers=16) as pool:
        wins = sum(pool.map(lambda i: rb.book("R2", 700, 760, f"u{i}"), range(64)))
    print(f"winners for R2 [700,760): {wins}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `class Room {
  private starts: number[] = []; // sorted start times
  private readonly ends = new Map<number, number>();
  private readonly owners = new Map<number, string>();

  // first index whose start is >= x
  private lowerBound(x: number): number {
    let lo = 0;
    let hi = this.starts.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.starts[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  // Synchronous, so the overlap check and the insert are one indivisible step.
  book(start: number, end: number, user: string): boolean {
    if (start >= end) throw new Error("empty interval");
    const j = this.lowerBound(start);
    if (j < this.starts.length && this.starts[j] === start) return false; // same start: always overlaps
    if (j > 0 && (this.ends.get(this.starts[j - 1]) as number) > start) return false; // previous runs into us
    if (j < this.starts.length && this.starts[j] < end) return false; // next starts before we end
    this.starts.splice(j, 0, start);
    this.ends.set(start, end);
    this.owners.set(start, user);
    return true;
  }

  count(): number {
    return this.starts.length;
  }
}

class RoomBooker {
  private readonly rooms = new Map<string, Room>();

  private room(id: string): Room {
    let r = this.rooms.get(id);
    if (!r) this.rooms.set(id, (r = new Room()));
    return r;
  }

  book(roomId: string, start: number, end: number, user: string): boolean {
    return this.room(roomId).book(start, end, user);
  }

  bookAny(roomIds: string[], start: number, end: number, user: string): boolean {
    return roomIds.some((id) => this.room(id).book(start, end, user));
  }

  bookingsIn(roomId: string): number {
    return this.room(roomId).count();
  }
}

async function main(): Promise<void> {
  const rb = new RoomBooker();
  rb.book("R1", 600, 660, "dev");
  console.log(
    [rb.book("R1", 630, 700, "asha"), rb.book("R1", 650, 720, "bala"), rb.book("R1", 660, 720, "chen")].join(" "),
  );
  try {
    rb.book("R1", 700, 700, "zed");
  } catch (e) {
    console.log("empty interval rejected: " + (e as Error).message);
  }
  console.log("bookAny: " + rb.bookAny(["R1", "R3"], 600, 660, "dana") + " R3 bookings=" + rb.bookingsIn("R3"));
  console.log("bookAny only R1: " + rb.bookAny(["R1"], 610, 620, "eve"));

  // 64 tasks race for the same slot in R2: exactly one wins
  const results = await Promise.all(
    Array.from({ length: 64 }, async (_, i) => {
      await Promise.resolve();
      return rb.book("R2", 700, 760, "u" + i);
    }),
  );
  console.log("winners for R2 [700,760): " + results.filter(Boolean).length);
}

main();` },
          { lang: 'cpp', code: `class Room {
    map<int, int> bookings_;                         // start -> end, guarded by mu_
    map<int, string> owners_;                        // start -> user
    mutable mutex mu_;

public:
    bool book(int start, int end, const string& user) {
        if (start >= end) throw invalid_argument("empty interval");
        lock_guard lk(mu_);
        auto next = bookings_.lower_bound(start);                        // ceiling entry
        if (next != bookings_.end() && next->first == start) return false;
        if (next != bookings_.begin() && prev(next)->second > start) return false;   // previous runs into us
        if (next != bookings_.end() && next->first < end) return false;  // next starts before we end
        bookings_[start] = end;
        owners_[start] = user;
        return true;
    }
    size_t count() const {
        lock_guard lk(mu_);
        return bookings_.size();
    }
};

class RoomBooker {
    unordered_map<string, shared_ptr<Room>> rooms_;
    mutex mapMu_;

    shared_ptr<Room> room(const string& id) {
        lock_guard lk(mapMu_);
        auto& slot = rooms_[id];
        if (!slot) slot = make_shared<Room>();
        return slot;
    }

public:
    bool book(const string& roomId, int start, int end, const string& user) {
        return room(roomId)->book(start, end, user);
    }

    // holds at most ONE room lock at a time => no deadlock, minimal blocking
    bool bookAny(const vector<string>& roomIds, int start, int end, const string& user) {
        for (const auto& id : roomIds)
            if (room(id)->book(start, end, user)) return true;
        return false;
    }

    size_t bookingsIn(const string& roomId) { return room(roomId)->count(); }
};

int main() {
    RoomBooker rb;
    cout << boolalpha;
    rb.book("R1", 600, 660, "dev");
    bool a = rb.book("R1", 630, 700, "asha"), b = rb.book("R1", 650, 720, "bala"), c = rb.book("R1", 660, 720, "chen");
    cout << a << " " << b << " " << c << "\\n";
    try { rb.book("R1", 700, 700, "zed"); }
    catch (const invalid_argument& e) { cout << "empty interval rejected: " << e.what() << "\\n"; }
    bool any = rb.bookAny({"R1", "R3"}, 600, 660, "dana");
    cout << "bookAny: " << any << " R3 bookings=" << rb.bookingsIn("R3") << "\\n";
    cout << "bookAny only R1: " << rb.bookAny({"R1"}, 610, 620, "eve") << "\\n";

    // 64 threads race for the same slot in R2: exactly one wins
    atomic<int> wins{0};
    vector<thread> pool;
    for (int t = 0; t < 16; t++)
        pool.emplace_back([&, t] {
            for (int i = t; i < 64; i += 16) if (rb.book("R2", 700, 760, "u" + to_string(i))) wins++;
        });
    for (auto& th : pool) th.join();
    cout << "winners for R2 [700,760): " << wins << "\\n";
}` }
        ],
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
    brute: { why: `<p><b>Unsynchronized</b>: check-then-act race creates two instances; without a happens-before edge another thread may even see a half-constructed object. <b><code>synchronized getInstance()</code></b>: correct, but every one of millions of calls takes a lock forever, just to protect a one-time event.</p>`, code: { lang: 'java', code: `class MetricsRegistryBrute {
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
}`, alt: [{ lang: 'python', code: "import threading\n\nclass MetricsRegistryBrute:\n    _instance = None\n    _lock = threading.Lock()\n\n    @staticmethod\n    def get_unsafe():                                  # race: two threads both see None\n        if MetricsRegistryBrute._instance is None: MetricsRegistryBrute._instance = MetricsRegistryBrute()\n        return MetricsRegistryBrute._instance\n\n    @staticmethod\n    def get_locked():                                  # correct, but locks on EVERY call\n        with MetricsRegistryBrute._lock:\n            if MetricsRegistryBrute._instance is None: MetricsRegistryBrute._instance = MetricsRegistryBrute()\n            return MetricsRegistryBrute._instance\n" }, { lang: 'ts', code: "import { Mutex } from \"async-mutex\";\n\nclass MetricsRegistryBrute {\n  private static instance: MetricsRegistryBrute | undefined;\n  private static mutex = new Mutex();\n  private constructor() { }\n  private static async create(): Promise<MetricsRegistryBrute> { return new MetricsRegistryBrute(); }   // async set-up\n\n  static async getUnsafe(): Promise<MetricsRegistryBrute> {   // race: two callers both see undefined across the await\n    if (!MetricsRegistryBrute.instance) MetricsRegistryBrute.instance = await MetricsRegistryBrute.create();\n    return MetricsRegistryBrute.instance;\n  }\n  static getLocked(): Promise<MetricsRegistryBrute> {         // correct, but locks on EVERY call\n    return MetricsRegistryBrute.mutex.runExclusive(async () => {\n      if (!MetricsRegistryBrute.instance) MetricsRegistryBrute.instance = await MetricsRegistryBrute.create();\n      return MetricsRegistryBrute.instance;\n    });\n  }\n}\n" }, { lang: 'cpp', code: "class MetricsRegistryBrute {\n    static MetricsRegistryBrute* instance;\n    static mutex m;\n    MetricsRegistryBrute() { }\npublic:\n    static MetricsRegistryBrute* getUnsafe() {         // race: two threads both see nullptr\n        if (instance == nullptr) instance = new MetricsRegistryBrute();\n        return instance;\n    }\n    static MetricsRegistryBrute* getLocked() {         // correct, but locks on EVERY call\n        lock_guard<mutex> g(m);\n        if (instance == nullptr) instance = new MetricsRegistryBrute();\n        return instance;\n    }\n};\nMetricsRegistryBrute* MetricsRegistryBrute::instance = nullptr;\nmutex MetricsRegistryBrute::m;\n" }] } },
    mcq: { q: 'In double-checked locking, why must the field be <code>volatile</code>?', options: ['Without it, another thread may see a non-null reference to an object whose constructor writes are not yet visible', 'volatile makes the constructor run faster', 'Without it the code does not compile', 'volatile is needed only on 32-bit JVMs'], answer: 0, explain: 'The JIT/CPU may publish the reference before the constructor\'s field writes are visible. volatile adds the happens-before edge from the write of the reference to the unsynchronized read.' },
    hints: [`<p>Hint 1: You need "initialize exactly once" plus "every thread sees a fully built object".</p>`, `<p>Hint 2: The runtime may already guarantee one-time, thread-safe initialization: Java class loading, a C++ function-local <code>static</code>, a Python module import.</p>`, `<p>Hint 3: Holder idiom: a private static nested class with a <code>static final</code> field. Alternative: enum singleton, or double-checked locking with a <code>volatile</code> field.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "same object: true\nholder distinct=1 constructed=1\ndcl distinct=1 constructed=2\n" }] },
    solution: {
      approach: `<p><b>Initialization-on-demand holder.</b> The nested <code>Holder</code> class is not initialized until <code>getInstance()</code> first touches it; JVM class initialization is lazy, runs exactly once, and is safely published to all threads. After that, <code>getInstance()</code> is a plain static field read with no lock. Double-checked locking with <code>volatile</code> is shown as an alternative when you need constructor arguments.</p>
<p><b>In Python, TypeScript and C++.</b> Python gets a lazy, once-only singleton from the import system (a module-level instance is built once under the import lock) or from double-checked locking with a <code>Lock</code>. C++ guarantees that a function-local <code>static</code> is initialised exactly once, even when many threads arrive together (the "Meyers singleton"), which is the holder idiom's counterpart. TypeScript runs one task at a time, so <code>??=</code> on a static field is already safe.</p>`,
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
}

class MetricsRegistryDemo {
    public static void main(String[] args) throws InterruptedException {
        System.out.println("same object: " + (MetricsRegistry.getInstance() == MetricsRegistry.getInstance()));
        System.out.println("holder " + stress(MetricsRegistry::getInstance));        // distinct=1 constructed=1
        System.out.println("dcl " + stress(MetricsRegistry::getDcl));                // distinct=1 constructed=2 (the DCL instance)
    }

    static String stress(Supplier<MetricsRegistry> accessor) throws InterruptedException {
        Set<MetricsRegistry> seen = ConcurrentHashMap.newKeySet();
        ExecutorService pool = Executors.newFixedThreadPool(16);
        for (int i = 0; i < 1000; i++) pool.execute(() -> seen.add(accessor.get()));
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        return "distinct=" + seen.size() + " constructed=" + MetricsRegistry.constructed.get();
    }
}`, alt: [
          { lang: 'python', code: `import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor


class MetricsRegistry:
    constructed = 0
    _dcl: "MetricsRegistry | None" = None
    _dcl_lock = threading.Lock()

    def __init__(self) -> None:
        MetricsRegistry.constructed += 1       # only ever called once per instance, under a lock or at import

    @staticmethod
    def get_instance() -> "MetricsRegistry":
        return _HOLDER                         # a module is initialised once, under the import lock

    @classmethod
    def get_dcl(cls) -> "MetricsRegistry":
        inst = cls._dcl                        # fast path: no lock once published
        if inst is None:
            with cls._dcl_lock:
                inst = cls._dcl
                if inst is None:
                    inst = cls._dcl = cls()
        return inst


_HOLDER = MetricsRegistry()


def stress(accessor: Callable[[], MetricsRegistry]) -> str:
    with ThreadPoolExecutor(max_workers=16) as pool:
        seen = {id(r) for r in pool.map(lambda _: accessor(), range(1000))}
    return f"distinct={len(seen)} constructed={MetricsRegistry.constructed}"


def main() -> None:
    print(f"same object: {str(MetricsRegistry.get_instance() is MetricsRegistry.get_instance()).lower()}")
    print("holder", stress(MetricsRegistry.get_instance))
    print("dcl", stress(MetricsRegistry.get_dcl))


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `// The event loop never runs two tasks at once, so "check, then create" is already atomic here.
// Volatile, double-checked locking and holder classes solve Java-memory-model problems JS does not have.
class MetricsRegistry {
  static constructed = 0;
  private static holder?: MetricsRegistry;
  private static dcl?: MetricsRegistry;

  private constructor() {
    MetricsRegistry.constructed++;
  }

  static getInstance(): MetricsRegistry {
    return (MetricsRegistry.holder ??= new MetricsRegistry()); // lazy, created once
  }

  static getDcl(): MetricsRegistry {
    return (MetricsRegistry.dcl ??= new MetricsRegistry());
  }
}

async function stress(accessor: () => MetricsRegistry): Promise<string> {
  const results = await Promise.all(
    Array.from({ length: 1000 }, async () => {
      await Promise.resolve(); // 1000 tasks interleave here
      return accessor();
    }),
  );
  return "distinct=" + new Set(results).size + " constructed=" + MetricsRegistry.constructed;
}

async function main(): Promise<void> {
  console.log("same object: " + (MetricsRegistry.getInstance() === MetricsRegistry.getInstance()));
  console.log("holder " + (await stress(() => MetricsRegistry.getInstance())));
  console.log("dcl " + (await stress(() => MetricsRegistry.getDcl())));
}

main();` },
          { lang: 'cpp', code: `class MetricsRegistry {
    inline static atomic<int> constructed_{0};
    MetricsRegistry() { constructed_++; }

public:
    MetricsRegistry(const MetricsRegistry&) = delete;
    MetricsRegistry& operator=(const MetricsRegistry&) = delete;

    static int constructed() { return constructed_; }

    // Meyers singleton: the standard guarantees a function-local static is initialised exactly once
    static MetricsRegistry& getInstance() {
        static MetricsRegistry instance;
        return instance;
    }

    // alternative: double-checked locking (the atomic pointer needs acquire/release)
    static MetricsRegistry* getDcl() {
        static atomic<MetricsRegistry*> published{nullptr};
        static mutex mu;
        static unique_ptr<MetricsRegistry> owner;
        MetricsRegistry* r = published.load(memory_order_acquire);   // fast path: no lock once published
        if (!r) {
            lock_guard lk(mu);
            r = published.load(memory_order_relaxed);
            if (!r) {
                owner.reset(new MetricsRegistry());
                r = owner.get();
                published.store(r, memory_order_release);
            }
        }
        return r;
    }
};

string stress(function<const MetricsRegistry*()> accessor) {
    set<const MetricsRegistry*> seen;
    mutex mu;
    vector<thread> pool;
    for (int t = 0; t < 16; t++)
        pool.emplace_back([&, t] {
            for (int i = t; i < 1000; i += 16) {
                const MetricsRegistry* r = accessor();
                lock_guard lk(mu);
                seen.insert(r);
            }
        });
    for (auto& th : pool) th.join();
    return "distinct=" + to_string(seen.size()) + " constructed=" + to_string(MetricsRegistry::constructed());
}

int main() {
    cout << "same object: " << boolalpha << (&MetricsRegistry::getInstance() == &MetricsRegistry::getInstance()) << "\\n";
    cout << "holder " << stress([] { return &MetricsRegistry::getInstance(); }) << "\\n";
    cout << "dcl " << stress([] { return MetricsRegistry::getDcl(); }) << "\\n";
}` }
        ],
      complexity: `<p>O(1) per call; zero lock acquisitions after initialization.</p>`,
      followUps: ['Why is an enum singleton also safe (and serialization-proof)?', 'What if the constructor throws? (holder: NoClassDefFoundError on later calls; DCL: retries).']
    }
  });

  practice.push({
    title: 'Unique Order ID Generator', level: 'Easy', tags: ['atomics', 'read-modify-write'], companies: ['Flipkart', 'Swiggy', 'Shopify'],
    statement: `<p><code>OrderIdGenerator.next()</code> returns <code>"ORD-" + (++counter)</code> using a plain <code>long</code>. During a sale, two orders got the <b>same ID</b> and the payment system merged them. Make <code>next()</code> return unique, increasing IDs from any number of threads.</p>`,
    constraints: `<p>~20k IDs/sec from 200 threads. IDs must be unique within the process; gaps are acceptable.</p>`,
    example: `<p>8 threads × 10,000 calls. Broken: ${H.c('r', 'set size 79,6xx (duplicates)')}. Fixed: ${H.c('g', '80,000 distinct IDs')}.</p>`,
    brute: { why: `<p><code>++counter</code> is read-add-write; two threads read 41 and both return ORD-42. Making it <code>volatile</code> does not help (visibility, not atomicity). Wrapping in <code>synchronized</code> works but is heavier than needed for one variable.</p>`, code: { lang: 'java', code: `class OrderIdBrute {
    private long counter;                       // volatile would NOT fix it
    String next() { return "ORD-" + (++counter); }  // lost updates => duplicate IDs
}`, alt: [{ lang: 'python', code: "class OrderIdBrute:\n    def __init__(self):\n        self.counter = 0                              # a plain int: += is read, add, write\n\n    def next(self):\n        self.counter += 1                             # lost updates => duplicate IDs\n        return f\"ORD-{self.counter}\"\n" }, { lang: 'ts', code: "class OrderIdBrute {\n  private counter = 0;                                // a plain number: ++ is read, add, write\n  next(): string { return \"ORD-\" + (++this.counter); }   // lost updates across workers => duplicate IDs\n}\n" }, { lang: 'cpp', code: "class OrderIdBrute {\n    long long counter = 0;                            // volatile would NOT fix it\npublic:\n    string next() { return \"ORD-\" + to_string(++counter); }   // lost updates => duplicate IDs\n};\n" }] } },
    mcq: { q: 'Which single call makes the increment atomic?', options: ['<code>counter.incrementAndGet()</code> on an AtomicLong', '<code>counter++</code> on a volatile long', '<code>Thread.yield()</code> before ++', '<code>Math.addExact(counter, 1)</code>'], answer: 0, explain: 'AtomicLong.incrementAndGet performs read-add-write as one hardware atomic operation (lock xadd / CAS loop).' },
    hints: [`<p>Hint 1: The shared state is one number; the race is read-modify-write.</p>`, `<p>Hint 2: <code>java.util.concurrent.atomic.AtomicLong</code>.</p>`, `<p>Hint 3: Format the string after getting the number — building the string does not need to be atomic, only the increment does.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "distinct ids: 80000\nnext id: ORD-80001\n" }] },
    solution: {
      approach: `<p>Replace the field with an <code>AtomicLong</code> and use <code>incrementAndGet()</code>: lock-free, unique, increasing. Only the counter step is atomic; formatting happens on the thread's own copy of the number. For multi-server uniqueness you would add a node id (Snowflake-style: timestamp | node | sequence).</p>
<p><b>In Python, TypeScript and C++.</b> C++ has the same primitive as Java: <code>std::atomic&lt;long long&gt;::fetch_add</code>. Python has no atomic integer, so a <code>Lock</code> guards <code>+= 1</code> (the GIL does not make <code>+=</code> atomic). In TypeScript <code>++counter</code> cannot be interrupted; use <code>Atomics.add</code> on a <code>SharedArrayBuffer</code> only when Worker threads share the counter.</p>`,
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
        System.out.println("next id: " + g.next());             // ORD-80001, no gaps and no repeats
    }
}`, alt: [
          { lang: 'python', code: `import threading


class OrderIdGenerator:
    def __init__(self) -> None:
        self._counter = 0
        self._lock = threading.Lock()          # += is read, add, write: three steps even under the GIL

    def next(self) -> str:
        with self._lock:
            self._counter += 1
            return f"ORD-{self._counter}"


def main() -> None:
    g = OrderIdGenerator()
    ids: set[str] = set()
    ids_lock = threading.Lock()

    def work() -> None:
        mine = [g.next() for _ in range(10_000)]
        with ids_lock:
            ids.update(mine)

    threads = [threading.Thread(target=work) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    print(f"distinct ids: {len(ids)}")
    print(f"next id: {g.next()}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `class OrderIdGenerator {
  private counter = 0;

  // No await inside: the increment and the read cannot be split by another task.
  next(): string {
    return "ORD-" + ++this.counter;
  }
}

async function main(): Promise<void> {
  const g = new OrderIdGenerator();
  const ids = new Set<string>();
  const worker = async (): Promise<void> => {
    for (let k = 0; k < 10_000; k++) {
      if (k % 1000 === 0) await Promise.resolve(); // let the other workers interleave
      ids.add(g.next());
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log("distinct ids: " + ids.size);
  console.log("next id: " + g.next());
}

main();` },
          { lang: 'cpp', code: `class OrderIdGenerator {
    atomic<long long> counter_{0};

public:
    string next() { return "ORD-" + to_string(counter_.fetch_add(1) + 1); }   // one atomic read-modify-write
};

int main() {
    OrderIdGenerator g;
    set<string> ids;
    mutex idsMu;
    vector<thread> threads;
    for (int t = 0; t < 8; t++)
        threads.emplace_back([&] {
            vector<string> mine;
            for (int k = 0; k < 10000; k++) mine.push_back(g.next());
            lock_guard lk(idsMu);
            ids.insert(mine.begin(), mine.end());
        });
    for (auto& th : threads) th.join();
    cout << "distinct ids: " << ids.size() << "\\n";
    cout << "next id: " << g.next() << "\\n";
}` }
        ],
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
}</pre><p>(Java listing; the shape is the same for a Python <code>dict</code> or a C++ <code>unordered_map</code>.) Called from all request threads. Sometimes it returns <code>null</code> for a key that exists, and the file is read many times.</p>`,
    constraints: `<p>A few hundred keys; loading a key is fast (&lt; 1 ms) and idempotent.</p>`,
    example: `<p>Two threads ask for "db.url" at once: both see "absent", both load and put; a concurrent resize of the HashMap can make <code>get</code> miss an entry → ${H.c('r', 'null')}. Fixed version: ${H.c('g', 'one load, always the value')}.</p>`,
    brute: { why: `<p>Three bugs: (1) <code>HashMap</code> is not thread-safe (concurrent put during resize corrupts it); (2) <code>containsKey</code> then <code>put</code> is check-then-act → duplicate loads; (3) <code>put</code> then <code>get</code> are separate → can return a different/missing value. A <code>synchronized get</code> fixes all three but serializes every lookup forever.</p>`, code: { lang: 'java', code: `class ConfigCacheLocked {
    private final Map<String, String> cache = new HashMap<>();
    synchronized String get(String key) {                  // correct but every read takes the lock
        if (!cache.containsKey(key)) cache.put(key, "value-of-" + key);
        return cache.get(key);
    }
}`, alt: [{ lang: 'python', code: "import threading\n\nclass ConfigCacheLocked:\n    def __init__(self):\n        self.cache = {}\n        self.lock = threading.Lock()\n\n    def get(self, key):                               # correct but every read takes the lock\n        with self.lock:\n            if key not in self.cache: self.cache[key] = \"value-of-\" + key\n            return self.cache[key]\n" }, { lang: 'ts', code: "import { Mutex } from \"async-mutex\";\n\nclass ConfigCacheLocked {\n  private cache = new Map<string, string>();\n  private mutex = new Mutex();\n  get(key: string): Promise<string> {                 // correct but every read takes the lock\n    return this.mutex.runExclusive(() => {\n      if (!this.cache.has(key)) this.cache.set(key, \"value-of-\" + key);\n      return this.cache.get(key)!;\n    });\n  }\n}\n" }, { lang: 'cpp', code: "class ConfigCacheLocked {\n    unordered_map<string, string> cache;\n    mutex m;\npublic:\n    string get(const string& key) {                   // correct but every read takes the lock\n        lock_guard<mutex> g(m);\n        if (!cache.count(key)) cache[key] = \"value-of-\" + key;\n        return cache[key];\n    }\n};\n" }] } },
    mcq: { q: 'Which is the best fix here?', options: ['<code>ConcurrentHashMap.computeIfAbsent(key, this::load)</code>', 'Make the map field volatile', 'Use Collections.synchronizedMap and keep the same code', 'Use Hashtable'], answer: 0, explain: 'computeIfAbsent is atomic per key: one load, value returned from the same call, lock-free reads afterwards. A synchronized wrapper keeps the check-then-act race.' },
    hints: [`<p>Hint 1: Count the separate map calls in <code>get</code>. Each gap is a race window.</p>`, `<p>Hint 2: Collapse "check, load, put, read" into one atomic call.</p>`, `<p>Hint 3: Because the load is fast and doesn't touch the map, it is safe inside <code>computeIfAbsent</code>.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "value-of-db.url loads=1\nfailed: no such key: missing.x\nfailed: no such key: missing.x\nloads=3 (a failed load is not cached)\n" }] },
    solution: {
      approach: `<p>Use <code>ConcurrentHashMap.computeIfAbsent</code>: atomic per key, loads exactly once, returns the stored value from the same call. Reads after the first are lock-free. Safe because the loader is short and does not modify the map (a slow loader would need the single-flight pattern from the LRU topic).</p>
<p><b>In Python, TypeScript and C++.</b> C++ expresses "load once per key" with a per-key <code>std::call_once</code>; if the loader throws, the flag stays unset and the next call retries. Python uses a lock per key (so loading one key never blocks another) with a re-check after acquiring it. TypeScript stores the <code>Promise</code> of the load in the map before awaiting it, and deletes the entry if it rejects.</p>`,
      code: `class ConfigCache {
    private final ConcurrentHashMap<String, String> cache = new ConcurrentHashMap<>();
    final AtomicInteger loads = new AtomicInteger();

    private String loadFromFile(String key) {
        loads.incrementAndGet();
        if (key.startsWith("missing.")) throw new NoSuchElementException("no such key: " + key);   // a failed load stores nothing
        return "value-of-" + key;
    }

    String get(String key) { return cache.computeIfAbsent(key, this::loadFromFile); }

    public static void main(String[] args) throws InterruptedException {
        ConfigCache c = new ConfigCache();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int i = 0; i < 1000; i++) pool.execute(() -> c.get("db.url"));
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println(c.get("db.url") + " loads=" + c.loads.get());   // value-of-db.url loads=1
        for (int i = 0; i < 2; i++) {
            try { c.get("missing.x"); }
            catch (NoSuchElementException e) { System.out.println("failed: " + e.getMessage()); }
        }
        System.out.println("loads=" + c.loads.get() + " (a failed load is not cached)");   // 3
    }
}`, alt: [
          { lang: 'python', code: `import threading
from concurrent.futures import ThreadPoolExecutor


class ConfigCache:
    def __init__(self) -> None:
        self._cache: dict[str, str] = {}
        self._key_locks: dict[str, threading.Lock] = {}
        self._meta = threading.Lock()          # guards only the table of per-key locks
        self.loads = 0
        self._loads_lock = threading.Lock()

    def _load_from_file(self, key: str) -> str:
        with self._loads_lock:
            self.loads += 1
        if key.startswith("missing."):
            raise KeyError(f"no such key: {key}")   # a failed load stores nothing
        return "value-of-" + key

    def get(self, key: str) -> str:
        value = self._cache.get(key)           # fast path: a single dict read
        if value is not None:
            return value
        with self._meta:
            lock = self._key_locks.setdefault(key, threading.Lock())
        with lock:                             # loads of OTHER keys are not blocked
            value = self._cache.get(key)       # another thread may have loaded it while we waited
            if value is None:
                value = self._cache[key] = self._load_from_file(key)
            return value


def main() -> None:
    c = ConfigCache()
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(lambda _: c.get("db.url"), range(1000)))
    print(f"{c.get('db.url')} loads={c.loads}")
    for _ in range(2):
        try:
            c.get("missing.x")
        except KeyError as e:
            print(f"failed: {e.args[0]}")
    print(f"loads={c.loads} (a failed load is not cached)")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `class ConfigCache {
  private readonly cache = new Map<string, Promise<string>>();
  loads = 0;

  private async loadFromFile(key: string): Promise<string> {
    this.loads++;
    await Promise.resolve(); // pretend file I/O
    if (key.startsWith("missing.")) throw new Error("no such key: " + key);
    return "value-of-" + key;
  }

  // Store the promise BEFORE awaiting it: later callers share the same load.
  get(key: string): Promise<string> {
    let p = this.cache.get(key);
    if (!p) {
      p = this.loadFromFile(key);
      this.cache.set(key, p);
      p.catch(() => this.cache.delete(key)); // a failed load stores nothing
    }
    return p;
  }
}

async function main(): Promise<void> {
  const c = new ConfigCache();
  await Promise.all(Array.from({ length: 1000 }, () => c.get("db.url")));
  console.log((await c.get("db.url")) + " loads=" + c.loads);
  for (let i = 0; i < 2; i++) {
    try {
      await c.get("missing.x");
    } catch (e) {
      console.log("failed: " + (e as Error).message);
    }
  }
  console.log("loads=" + c.loads + " (a failed load is not cached)");
}

main();` },
          { lang: 'cpp', code: `class ConfigCache {
    struct Entry {
        once_flag once;                        // call_once runs the loader at most once per key
        string value;
    };
    unordered_map<string, shared_ptr<Entry>> entries_;
    mutex mu_;                                 // guards only the table of entries

    string loadFromFile(const string& key) {
        loads_++;
        if (key.rfind("missing.", 0) == 0) throw out_of_range("no such key: " + key);   // flag stays unset
        return "value-of-" + key;
    }

public:
    atomic<int> loads_{0};

    string get(const string& key) {
        shared_ptr<Entry> e;
        {
            lock_guard lk(mu_);
            auto& slot = entries_[key];
            if (!slot) slot = make_shared<Entry>();
            e = slot;
        }
        call_once(e->once, [&] { e->value = loadFromFile(key); });   // other keys are not blocked
        return e->value;
    }
};

int main() {
    ConfigCache c;
    {
        vector<jthread> pool;
        for (int t = 0; t < 8; t++)
            pool.emplace_back([&] { for (int i = 0; i < 125; i++) c.get("db.url"); });
    }
    cout << c.get("db.url") << " loads=" << c.loads_ << "\\n";
    for (int i = 0; i < 2; i++) {
        try { c.get("missing.x"); }
        catch (const out_of_range& e) { cout << "failed: " << e.what() << "\\n"; }
    }
    cout << "loads=" << c.loads_ << " (a failed load is not cached)\\n";
}` }
        ],
      complexity: `<p>O(1) average; one load per key.</p>`,
      followUps: ['Config changes on disk: add reload with an immutable snapshot swap.', 'What if loading can throw? (computeIfAbsent stores nothing; next call retries).']
    }
  });

  practice.push({
    title: 'Race Bug Hunt: The Worker That Never Stops', level: 'Easy', tags: ['visibility', 'volatile', 'interrupt'], companies: ['Oracle', 'Goldman Sachs'],
    statement: `<p>A background <code>Poller</code> loops <code>while (!stopped) { pollOnce(); }</code> with <code>boolean stopped</code>. <code>shutdown()</code> sets <code>stopped = true</code> from the main thread, but in production the poller sometimes keeps running and the program never exits. Explain and fix it. Also make shutdown work while the poller is <b>sleeping</b> between polls.</p>`,
    constraints: `<p>Poll interval 1 s; shutdown must complete within ~100 ms.</p>`,
    example: `<p>Broken: JIT hoists the read of <code>stopped</code> out of the loop → ${H.c('r', 'infinite loop')}; or the poller sleeps 1 s before noticing. Fixed: ${H.c('g', 'stops promptly, join() returns')}.</p>`,
    brute: { why: `<p>No happens-before edge between the write in <code>shutdown()</code> and the read in the loop, so the poller may never see it. Even with visibility, <code>Thread.sleep(1000)</code> delays shutdown by up to a second. Busy-polling with a short sleep wastes CPU.</p>`, code: { lang: 'java', code: `class PollerBrute implements Runnable {
    private boolean stopped;                 // not volatile: the loop may never see "true"
    public void run() {
        while (!stopped) {
            try { Thread.sleep(1000); } catch (InterruptedException ignored) { }   // swallows interrupt!
        }
    }
    void shutdown() { stopped = true; }
}`, alt: [{ lang: 'python', code: "import threading, time\n\nclass PollerBrute:\n    def __init__(self):\n        self.stopped = False                          # a plain flag; no way to wake the sleeping loop\n\n    def run(self):\n        while not self.stopped:\n            try: time.sleep(1)\n            except Exception: pass                    # swallows errors/interrupts!\n\n    def shutdown(self): self.stopped = True           # takes up to a second to be noticed\n" }, { lang: 'ts', code: "class PollerBrute {\n  private stopped = false;                            // a plain flag; the loop only checks it between sleeps\n  async run(): Promise<void> {\n    while (!this.stopped) {\n      try { await new Promise((r) => setTimeout(r, 1000)); } catch { }   // swallows errors!\n    }\n  }\n  shutdown(): void { this.stopped = true; }           // takes up to a second to be noticed\n}\n" }, { lang: 'cpp', code: "class PollerBrute {\n    bool stopped = false;                             // not atomic: the loop may never see \"true\"\npublic:\n    void run() {\n        while (!stopped) {\n            this_thread::sleep_for(chrono::seconds(1));   // shutdown is noticed up to a second late\n        }\n    }\n    void shutdown() { stopped = true; }\n};\n" }] } },
    mcq: { q: 'What does <code>volatile</code> fix here, and what does it NOT fix?', options: ['It makes the flag visible; it does not wake a sleeping thread — use interrupt for that', 'It makes the loop atomic and wakes sleeping threads', 'It fixes nothing; only synchronized works', 'It prevents the thread from sleeping'], answer: 0, explain: 'volatile guarantees the next read sees the write. Interrupting the thread makes sleep() throw InterruptedException immediately, so shutdown is prompt.' },
    hints: [`<p>Hint 1: Two problems: visibility of the flag, and latency while sleeping.</p>`, `<p>Hint 2: <code>volatile</code> for the flag; <code>Thread.interrupt()</code> to cut the sleep short.</p>`, `<p>Hint 3: In the catch block, restore the interrupt status and exit the loop — never swallow it.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "stopped promptly=true alive=false polls=1\nrepeated and early shutdown are safe\n" }] },
    solution: {
      approach: `<p>Declare the flag <code>volatile</code> (visibility), and have <code>shutdown()</code> also <b>interrupt</b> the worker thread so a sleeping/blocked poller wakes immediately. The loop checks both the flag and the interrupt status, and the catch block restores the interrupt and exits. <code>join(timeout)</code> confirms termination.</p>
<p><b>In Python, TypeScript and C++.</b> Python's <code>threading.Event</code> is the flag and the interruptible sleep in one object (<code>wait(1.0)</code> returns as soon as it is set). C++20 offers the same with <code>std::jthread</code>, <code>stop_token</code> and <code>condition_variable_any::wait_for</code>; a plain <code>bool</code> would be a data race, so use <code>atomic&lt;bool&gt;</code> if you roll your own. TypeScript wakes its sleep by clearing the timer.</p>`,
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
        if (worker == null) return;   // never started: nothing to wake or join
        worker.interrupt();      // wakes it from sleep immediately
        worker.join(2000);
    }

    public static void main(String[] args) throws InterruptedException {
        Poller p = new Poller();
        p.start();
        Thread.sleep(50);
        long t0 = System.nanoTime();
        p.shutdown();
        long ms = (System.nanoTime() - t0) / 1_000_000;
        System.out.println("stopped promptly=" + (ms < 500) + " alive=" + p.worker.isAlive() + " polls=" + p.polls.get());
        p.shutdown();                      // a second call is harmless
        new Poller().shutdown();           // so is stopping one that never started
        System.out.println("repeated and early shutdown are safe");
    }
}`, alt: [
          { lang: 'python', code: `import threading
import time


class Poller:
    def __init__(self) -> None:
        self._stop = threading.Event()         # the flag AND the sleep in one object
        self.polls = 0
        self.worker: threading.Thread | None = None

    def _run(self) -> None:
        while not self._stop.is_set():
            self.polls += 1                    # poll_once()
            self._stop.wait(1.0)               # sleeps up to 1 s but wakes the instant stop is set

    def start(self) -> None:
        self.worker = threading.Thread(target=self._run, name="poller")
        self.worker.start()

    def shutdown(self) -> None:
        self._stop.set()
        if self.worker is not None:            # never started: nothing to join
            self.worker.join(2)


def main() -> None:
    p = Poller()
    p.start()
    time.sleep(0.05)
    t0 = time.monotonic()
    p.shutdown()
    ms = (time.monotonic() - t0) * 1000
    assert p.worker is not None
    print(f"stopped promptly={str(ms < 500).lower()} alive={str(p.worker.is_alive()).lower()} polls={p.polls}")
    p.shutdown()                               # a second call is harmless
    Poller().shutdown()                        # so is stopping one that never started
    print("repeated and early shutdown are safe")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `class Poller {
  polls = 0;
  private stopped = false;
  private wake: (() => void) | null = null;
  private loop: Promise<void> | null = null;
  private running = false;

  // Sleeps up to ms, but shutdown() can cut the sleep short.
  private sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      this.wake = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }

  private async run(): Promise<void> {
    this.running = true;
    while (!this.stopped) {
      this.polls++; // pollOnce()
      await this.sleep(1000);
    }
    this.running = false;
  }

  start(): void {
    this.loop = this.run();
  }

  isAlive(): boolean {
    return this.running;
  }

  async shutdown(): Promise<void> {
    this.stopped = true;
    this.wake?.(); // wake it from its sleep immediately
    if (this.loop) await this.loop; // never started: nothing to wait for
  }
}

async function main(): Promise<void> {
  const p = new Poller();
  p.start();
  await new Promise((r) => setTimeout(r, 50));
  const t0 = Date.now();
  await p.shutdown();
  const ms = Date.now() - t0;
  console.log("stopped promptly=" + (ms < 500) + " alive=" + p.isAlive() + " polls=" + p.polls);
  await p.shutdown(); // a second call is harmless
  await new Poller().shutdown(); // so is stopping one that never started
  console.log("repeated and early shutdown are safe");
}

main();` },
          { lang: 'cpp', code: `class Poller {
    mutex mu_;
    condition_variable_any cv_;
    jthread worker_;
    atomic<int> polls_{0};

    void run(stop_token st) {
        while (!st.stop_requested()) {
            polls_++;                                              // pollOnce()
            unique_lock lk(mu_);
            cv_.wait_for(lk, st, 1s, [] { return false; });        // sleeps up to 1 s, wakes on stop
        }
    }

public:
    void start() { worker_ = jthread([this](stop_token st) { run(st); }); }

    void shutdown() {
        worker_.request_stop();                                    // no-op when there is no thread
        if (worker_.joinable()) worker_.join();
    }

    bool alive() const { return worker_.joinable(); }
    int polls() const { return polls_; }
};

int main() {
    Poller p;
    p.start();
    this_thread::sleep_for(50ms);
    auto t0 = chrono::steady_clock::now();
    p.shutdown();
    auto ms = chrono::duration_cast<chrono::milliseconds>(chrono::steady_clock::now() - t0).count();
    cout << boolalpha << "stopped promptly=" << (ms < 500) << " alive=" << p.alive() << " polls=" << p.polls() << "\\n";
    p.shutdown();                                                  // a second call is harmless
    Poller never;
    never.shutdown();                                              // so is stopping one that never started
    cout << "repeated and early shutdown are safe\\n";
}` }
        ],
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
    brute: { why: `<p>Iterating a synchronized list without holding its lock is unsafe (fail-fast iterator). Wrapping the loop in <code>synchronized (listeners)</code> stops the CME from other threads, but (a) every subscriber waits while all callbacks run, (b) a listener that unsubscribes itself inside the loop still causes CME (same thread modifies during iteration), and (c) a callback that calls into another lock can deadlock.</p>`, code: { lang: 'java', code: `class EventBusBrute {
    private final List<Consumer<String>> listeners = Collections.synchronizedList(new ArrayList<>());
    void subscribe(Consumer<String> l) { listeners.add(l); }
    void unsubscribe(Consumer<String> l) { listeners.remove(l); }
    void publish(String e) {
        synchronized (listeners) {                       // blocks subscribers during ALL callbacks
            for (Consumer<String> l : listeners) l.accept(e);   // self-unsubscribe => CME anyway
        }
    }
}`, alt: [{ lang: 'python', code: "import threading\n\nclass EventBusBrute:\n    def __init__(self):\n        self.listeners = []\n        self.lock = threading.RLock()\n\n    def subscribe(self, l):\n        with self.lock: self.listeners.append(l)\n\n    def unsubscribe(self, l):\n        with self.lock: self.listeners.remove(l)\n\n    def publish(self, e):\n        with self.lock:                               # blocks subscribers during ALL callbacks\n            for l in self.listeners: l(e)             # self-unsubscribe mutates the list mid-loop: callbacks skipped\n" }, { lang: 'ts', code: "class EventBusBrute {\n  private listeners: Array<(e: string) => void> = [];\n  subscribe(l: (e: string) => void): void { this.listeners.push(l); }\n  unsubscribe(l: (e: string) => void): void { this.listeners.splice(this.listeners.indexOf(l), 1); }\n  publish(e: string): void {\n    for (const l of this.listeners) l(e);             // self-unsubscribe mutates the array mid-loop: callbacks skipped\n  }\n}\n" }, { lang: 'cpp', code: "class EventBusBrute {\n    vector<function<void(const string&)>> listeners;\n    mutex m;\npublic:\n    void subscribe(function<void(const string&)> l) { lock_guard<mutex> g(m); listeners.push_back(l); }\n    void publish(const string& e) {\n        lock_guard<mutex> g(m);                       // blocks subscribers during ALL callbacks\n        for (auto& l : listeners) l(e);               // self-unsubscribe => iterator invalidation (undefined behaviour)\n    }\n};\n" }] } },
    mcq: { q: 'Why is CopyOnWriteArrayList a good fit here but a bad fit for an event <i>log</i> that appends 10k entries/sec?', options: ['Each write copies the whole array: cheap when writes are rare, very expensive when writes are frequent', 'It cannot be iterated', 'It is not thread-safe for writes', 'It loses elements under contention'], answer: 0, explain: 'COW makes reads/iteration lock-free snapshots by paying O(n) per write. Listener lists are read-mostly; logs are write-heavy.' },
    hints: [`<p>Hint 1: Publishing is read-mostly; changes are rare. Iteration should see a stable snapshot.</p>`, `<p>Hint 2: <code>CopyOnWriteArrayList</code> iterators are snapshots that never throw CME, even if the same thread modifies the list.</p>`, `<p>Hint 3: Catch exceptions per listener so one bad listener cannot stop the others.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "listener failed: boom\nlistener failed: boom\n[L1:a, L2:a, L1:b]\n" }] },
    solution: {
      approach: `<p>Store listeners in a <code>CopyOnWriteArrayList</code>. <code>publish</code> iterates a snapshot without any lock, so slow callbacks never block subscribers, and modifications (including self-unsubscribe) create a new array that the current loop does not see. Each callback is isolated with try/catch.</p>
<p><b>In Python, TypeScript and C++.</b> The copy-on-write idea is the same everywhere: replace the whole collection instead of editing it. Python swaps an immutable <code>tuple</code> under a lock, TypeScript replaces a <code>readonly</code> array, and C++ swaps a <code>shared_ptr&lt;const vector&gt;</code> (<code>std::function</code> cannot be compared, so C++ subscribers get an id to unsubscribe with). Readers copy the reference once and iterate it.</p>`,
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
        bus.subscribe(e -> { throw new IllegalStateException("boom"); });   // one bad listener must not stop the rest
        bus.publish("a");
        bus.publish("b");
        System.out.println(got);   // [L1:a, L2:a, L1:b], after two 'listener failed: boom' lines
    }
}`, alt: [
          { lang: 'python', code: `import threading
from collections.abc import Callable

Listener = Callable[[str], None]


class EventBus:
    def __init__(self) -> None:
        self._listeners: tuple[Listener, ...] = ()   # immutable snapshot, replaced on every change
        self._lock = threading.Lock()                # serialises the writers only

    def subscribe(self, listener: Listener) -> None:
        with self._lock:
            self._listeners = (*self._listeners, listener)

    def unsubscribe(self, listener: Listener) -> None:
        with self._lock:
            items = list(self._listeners)
            if listener in items:
                items.remove(listener)
            self._listeners = tuple(items)

    def publish(self, event: str) -> None:
        for listener in self._listeners:             # one read; iterating a tuple can never raise
            try:
                listener(event)
            except Exception as ex:
                print(f"listener failed: {ex}")


def main() -> None:
    bus = EventBus()
    got: list[str] = []
    bus.subscribe(lambda e: got.append(f"L1:{e}"))

    def one_shot(e: str) -> None:
        got.append(f"L2:{e}")
        bus.unsubscribe(one_shot)

    def bad(e: str) -> None:
        raise RuntimeError("boom")

    bus.subscribe(one_shot)
    bus.subscribe(bad)                               # one bad listener must not stop the rest
    bus.publish("a")
    bus.publish("b")
    print("[" + ", ".join(got) + "]")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `type Listener = (event: string) => void;

class EventBus {
  private listeners: readonly Listener[] = []; // replaced, never edited in place

  subscribe(l: Listener): void {
    this.listeners = [...this.listeners, l];
  }

  unsubscribe(l: Listener): void {
    this.listeners = this.listeners.filter((x) => x !== l);
  }

  publish(event: string): void {
    for (const l of this.listeners) {
      // iterating the old array: changes made by a listener show up on the next publish
      try {
        l(event);
      } catch (ex) {
        console.log("listener failed: " + (ex as Error).message);
      }
    }
  }
}

function main(): void {
  const bus = new EventBus();
  const got: string[] = [];
  bus.subscribe((e) => got.push("L1:" + e));
  const oneShot: Listener = (e) => {
    got.push("L2:" + e);
    bus.unsubscribe(oneShot);
  };
  bus.subscribe(oneShot);
  bus.subscribe(() => {
    throw new Error("boom"); // one bad listener must not stop the rest
  });
  bus.publish("a");
  bus.publish("b");
  console.log("[" + got.join(", ") + "]");
}

main();` },
          { lang: 'cpp', code: `class EventBus {
public:
    using Listener = function<void(const string&)>;

    int subscribe(Listener l) {                      // std::function has no ==, so subscribers get an id
        lock_guard lk(mu_);
        auto next = make_shared<Snapshot>(*snapshot_);
        int id = ++lastId_;
        next->emplace_back(id, std::move(l));
        snapshot_ = std::move(next);
        return id;
    }

    void unsubscribe(int id) {
        lock_guard lk(mu_);
        auto next = make_shared<Snapshot>();
        for (const auto& entry : *snapshot_)
            if (entry.first != id) next->push_back(entry);
        snapshot_ = std::move(next);
    }

    void publish(const string& event) {
        shared_ptr<const Snapshot> snap;
        {
            lock_guard lk(mu_);
            snap = snapshot_;                        // the copy keeps this version alive while we iterate
        }
        for (const auto& entry : *snap) {
            try { entry.second(event); }
            catch (const exception& ex) { cout << "listener failed: " << ex.what() << "\\n"; }
        }
    }

private:
    using Snapshot = vector<pair<int, Listener>>;
    shared_ptr<const Snapshot> snapshot_ = make_shared<const Snapshot>();
    mutex mu_;                                       // serialises the writers and the pointer swap
    int lastId_ = 0;
};

int main() {
    EventBus bus;
    vector<string> got;
    bus.subscribe([&](const string& e) { got.push_back("L1:" + e); });
    auto id = make_shared<int>(0);
    *id = bus.subscribe([&, id](const string& e) {   // one-shot: removes itself
        got.push_back("L2:" + e);
        bus.unsubscribe(*id);
    });
    bus.subscribe([](const string&) { throw runtime_error("boom"); });   // must not stop the rest
    bus.publish("a");
    bus.publish("b");
    cout << "[";
    for (size_t i = 0; i < got.size(); i++) cout << (i ? ", " : "") << got[i];
    cout << "]\\n";
}` }
        ],
      complexity: `<p>publish O(L) lock-free; subscribe/unsubscribe O(L) copy.</p>`,
      followUps: ['Deliver events asynchronously per listener (a queue per listener).', 'Use weak references so forgotten listeners do not leak.']
    }
  });

  practice.push({
    title: 'Two Threads Print Odd and Even Alternately', level: 'Medium', tags: ['Semaphore', 'coordination', 'wait/notify'], companies: ['Amazon', 'Microsoft', 'Walmart'],
    statement: `<p>Thread <b>ODD</b> prints 1, 3, 5, … and thread <b>EVEN</b> prints 2, 4, 6, … Together they must print <b>1 to N in order</b>, strictly alternating, with no busy-waiting. Both threads must terminate.</p>`,
    constraints: `<p>1 ≤ N ≤ 10<sup>5</sup>.</p>`,
    example: `<p>N = 6 → ${H.c('g', 'ODD:1 EVEN:2 ODD:3 EVEN:4 ODD:5 EVEN:6')}.</p>`,
    brute: { why: `<p>Unsynchronized threads print in random order. A spin loop on a shared <code>volatile int turn</code> is correct but burns two CPU cores spinning. A single <code>synchronized</code> + <code>wait/notify</code> works if written carefully (while loops, notifyAll, termination condition) but is easy to get wrong — a forgotten final notify leaves the other thread waiting forever.</p>`, code: { lang: 'java', code: `class OddEvenSpin {
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
}`, alt: [{ lang: 'python', code: "import time\n\nclass OddEvenSpin:\n    def __init__(self):\n        self.next = 1\n\n    # correct but wastes CPU: each thread spins while it is not its turn\n    def run(self, n, parity):\n        while True:\n            v = self.next\n            if v > n: return\n            if v % 2 == parity:\n                print(v)\n                self.next = v + 1\n            else:\n                time.sleep(0)\n" }, { lang: 'ts', code: "class OddEvenSpin {\n  // backed by a SharedArrayBuffer so two workers can see each other's writes\n  constructor(private shared: Int32Array) { Atomics.store(shared, 0, 1); }\n\n  // correct but wastes CPU: each worker spins while it is not its turn\n  run(n: number, parity: number): void {\n    while (true) {\n      const v = Atomics.load(this.shared, 0);\n      if (v > n) return;\n      if (v % 2 === parity) { console.log(v); Atomics.store(this.shared, 0, v + 1); }\n    }\n  }\n}\n" }, { lang: 'cpp', code: "class OddEvenSpin {\n    atomic<int> next{1};\npublic:\n    // correct but wastes CPU: each thread spins while it is not its turn\n    void run(int n, int parity) {\n        while (true) {\n            int v = next.load();\n            if (v > n) return;\n            if (v % 2 == parity) { cout << v << endl; next = v + 1; }\n            else this_thread::yield();\n        }\n    }\n};\n" }] } },
    mcq: { q: 'With two semaphores <code>odd = new Semaphore(1)</code> and <code>even = new Semaphore(0)</code>, what does ODD do after printing?', options: ['<code>even.release()</code> — hand the turn to EVEN', '<code>odd.release()</code>', '<code>even.acquire()</code>', 'Nothing'], answer: 0, explain: 'Each thread acquires its own semaphore (waits for its turn), prints, then releases the other thread\'s semaphore (passes the baton).' },
    hints: [`<p>Hint 1: Think of a baton passed back and forth: you may print only while holding it.</p>`, `<p>Hint 2: Two semaphores, one per thread. Start with ODD's permit = 1, EVEN's = 0.</p>`, `<p>Hint 3: Loop: acquire mine → print → release the other's. Compute how many numbers each thread prints so both loops end.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "n=7 -> ODD:1 EVEN:2 ODD:3 EVEN:4 ODD:5 EVEN:6 ODD:7\nn=2 -> ODD:1 EVEN:2\nn=0 -> (nothing)\n" }] },
    solution: {
      approach: `<p><b>Baton passing with two semaphores.</b> ODD starts with the only permit. Each thread waits on its own semaphore, prints its number, and releases the other's semaphore. Each thread prints a fixed count (⌈N/2⌉ odds, ⌊N/2⌋ evens), so both terminate. Waiting threads sleep, no CPU spin.</p>
<p><b>In Python, TypeScript and C++.</b> Python uses <code>threading.Semaphore</code>, C++20 <code>std::binary_semaphore</code>. JavaScript has no semaphore, so the TypeScript version builds a tiny promise-based <code>Semaphore</code> with a queue of waiters; the two async loops alternate exactly like the two threads.</p>`,
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

    static String run(int n) throws InterruptedException {
        OddEvenPrinter p = new OddEvenPrinter();
        Thread odd = new Thread(() -> { try { p.printOdds(n); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } });
        Thread even = new Thread(() -> { try { p.printEvens(n); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } });
        odd.start(); even.start();
        odd.join(2000); even.join(2000);
        return p.out.toString().trim();
    }

    public static void main(String[] args) throws InterruptedException {
        for (int n : new int[]{7, 2, 0}) {
            String s = run(n);
            System.out.println("n=" + n + " -> " + (s.isEmpty() ? "(nothing)" : s));   // n=7 -> ODD:1 EVEN:2 ... ODD:7
        }
    }
}`, alt: [
          { lang: 'python', code: `import threading


class OddEvenPrinter:
    def __init__(self) -> None:
        self._odd_turn = threading.Semaphore(1)
        self._even_turn = threading.Semaphore(0)
        self._out: list[str] = []              # only one thread runs between a pair of semaphore calls

    def print_odds(self, n: int) -> None:
        for v in range(1, n + 1, 2):
            self._odd_turn.acquire()
            self._out.append(f"ODD:{v}")
            self._even_turn.release()

    def print_evens(self, n: int) -> None:
        for v in range(2, n + 1, 2):
            self._even_turn.acquire()
            self._out.append(f"EVEN:{v}")
            self._odd_turn.release()

    def output(self) -> str:
        return " ".join(self._out)


def run(n: int) -> str:
    p = OddEvenPrinter()
    odd = threading.Thread(target=p.print_odds, args=(n,))
    even = threading.Thread(target=p.print_evens, args=(n,))
    odd.start()
    even.start()
    odd.join(2)
    even.join(2)
    return p.output()


def main() -> None:
    for n in (7, 2, 0):
        s = run(n)
        print(f"n={n} -> {s if s else '(nothing)'}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `// A semaphore for tasks: acquire() suspends until a permit is available.
class Semaphore {
  private readonly waiters: Array<() => void> = [];

  constructor(private permits: number) {}

  acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.waiters.push(resolve));
  }

  release(): void {
    const next = this.waiters.shift();
    if (next) next(); // hand the permit straight to the oldest waiter
    else this.permits++;
  }
}

class OddEvenPrinter {
  private readonly oddTurn = new Semaphore(1);
  private readonly evenTurn = new Semaphore(0);
  private readonly out: string[] = [];

  async printOdds(n: number): Promise<void> {
    for (let v = 1; v <= n; v += 2) {
      await this.oddTurn.acquire();
      this.out.push("ODD:" + v);
      this.evenTurn.release();
    }
  }

  async printEvens(n: number): Promise<void> {
    for (let v = 2; v <= n; v += 2) {
      await this.evenTurn.acquire();
      this.out.push("EVEN:" + v);
      this.oddTurn.release();
    }
  }

  output(): string {
    return this.out.join(" ");
  }
}

async function run(n: number): Promise<string> {
  const p = new OddEvenPrinter();
  await Promise.all([p.printEvens(n), p.printOdds(n)]); // start order does not matter
  return p.output();
}

async function main(): Promise<void> {
  for (const n of [7, 2, 0]) {
    const s = await run(n);
    console.log("n=" + n + " -> " + (s === "" ? "(nothing)" : s));
  }
}

main();` },
          { lang: 'cpp', code: `class OddEvenPrinter {
    binary_semaphore oddTurn_{1}, evenTurn_{0};
    vector<string> out_;                       // only one thread runs between a pair of semaphore calls

public:
    void printOdds(int n) {
        for (int v = 1; v <= n; v += 2) {
            oddTurn_.acquire();
            out_.push_back("ODD:" + to_string(v));
            evenTurn_.release();
        }
    }
    void printEvens(int n) {
        for (int v = 2; v <= n; v += 2) {
            evenTurn_.acquire();
            out_.push_back("EVEN:" + to_string(v));
            oddTurn_.release();
        }
    }
    string output() const {
        string s;
        for (size_t i = 0; i < out_.size(); i++) s += (i ? " " : "") + out_[i];
        return s;
    }
};

string run(int n) {
    OddEvenPrinter p;
    {
        jthread odd([&] { p.printOdds(n); });
        jthread even([&] { p.printEvens(n); });
    }                                          // both joined here
    return p.output();
}

int main() {
    for (int n : {7, 2, 0}) {
        string s = run(n);
        cout << "n=" << n << " -> " << (s.empty() ? "(nothing)" : s) << "\\n";
    }
}` }
        ],
      complexity: `<p>O(N) total, two context switches per number; no busy waiting.</p>`,
      followUps: ['Three threads printing 1,2,3,1,2,3… (three semaphores in a ring).', 'Same with ReentrantLock + Conditions.']
    }
  });

  practice.push({
    title: 'Race Bug Hunt: Deadlocking Bank Transfers', level: 'Medium', tags: ['deadlock', 'lock ordering', 'invariants'], companies: ['JPMorgan', 'Goldman Sachs', 'Razorpay'],
    statement: `<p>The transfer method does <code>synchronized (from) { synchronized (to) { from.balance -= amt; to.balance += amt; } }</code>. Under load, threads freeze. Explain the deadlock and fix it so that (1) money is never created or lost, (2) transfers between different account pairs run in parallel, (3) no deadlock is possible, (4) overdrafts are rejected.</p>`,
    constraints: `<p>10<sup>5</sup> accounts, 32 threads doing random transfers. Total money must be invariant.</p>`,
    example: `<p>Thread 1: transfer(A → B), Thread 2: transfer(B → A). T1 locks A, T2 locks B, each waits for the other → ${H.c('r', 'deadlock')}. Fixed: both lock min(id) first → ${H.c('g', 'one waits, then proceeds')}.</p>`,
    brute: { why: `<p><b>Nested locks in argument order</b> deadlock whenever two transfers go in opposite directions (circular wait). <b>One global bank lock</b> is deadlock-free and keeps the total invariant, but serializes all 32 threads even for unrelated accounts.</p>`, code: { lang: 'java', code: `class BankGlobalLock {
    private final long[] balance;
    BankGlobalLock(int n, long init) { balance = new long[n]; Arrays.fill(balance, init); }
    // correct, deadlock-free, but only ONE transfer in the whole bank at a time
    synchronized boolean transfer(int from, int to, long amt) {
        if (balance[from] < amt) return false;
        balance[from] -= amt; balance[to] += amt;
        return true;
    }
}`, alt: [{ lang: 'python', code: "import threading\n\nclass BankGlobalLock:\n    def __init__(self, n, init):\n        self.balance = [init] * n\n        self.lock = threading.Lock()\n\n    # correct, deadlock-free, but only ONE transfer in the whole bank at a time\n    def transfer(self, from_, to, amt):\n        with self.lock:\n            if self.balance[from_] < amt: return False\n            self.balance[from_] -= amt; self.balance[to] += amt\n            return True\n" }, { lang: 'ts', code: "import { Mutex } from \"async-mutex\";\n\nclass BankGlobalLock {\n  private balance: number[];\n  private mutex = new Mutex();\n  constructor(n: number, init: number) { this.balance = new Array<number>(n).fill(init); }\n  // correct, deadlock-free, but only ONE transfer in the whole bank at a time\n  transfer(from: number, to: number, amt: number): Promise<boolean> {\n    return this.mutex.runExclusive(() => {\n      if (this.balance[from] < amt) return false;\n      this.balance[from] -= amt; this.balance[to] += amt;\n      return true;\n    });\n  }\n}\n" }, { lang: 'cpp', code: "class BankGlobalLock {\n    vector<long long> balance;\n    mutex m;\npublic:\n    BankGlobalLock(int n, long long init) : balance(n, init) {}\n    // correct, deadlock-free, but only ONE transfer in the whole bank at a time\n    bool transfer(int from, int to, long long amt) {\n        lock_guard<mutex> g(m);\n        if (balance[from] < amt) return false;\n        balance[from] -= amt; balance[to] += amt;\n        return true;\n    }\n};\n" }] } },
    mcq: { q: 'Which change alone removes the deadlock?', options: ['Always lock the account with the smaller id first', 'Make balance volatile', 'Use AtomicLong for each balance and no locks', 'Lock "to" before "from"'], answer: 0, explain: 'A global order on lock acquisition makes a cycle in the wait-for graph impossible. Atomics per account would break the two-account invariant (money briefly missing; overdraft checks race).' },
    hints: [`<p>Hint 1: Draw the wait-for graph for A→B and B→A at the same time.</p>`, `<p>Hint 2: Break circular wait with a global order: lock by account id, not by role (from/to).</p>`, `<p>Hint 3: Handle from == to (reject or no-op), check balance inside both locks, and verify with a stress test that the total never changes.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "move 300 from 0 to 1: true\nmove 800 from 0 to 1: false\nmove 50 from 2 to 2: false\nmove -5 from 1 to 2: false\nbalances: 700 1300 1000 total=3000\nfinished=true total=10000\n" }] },
    solution: {
      approach: `<p>Each account has its own lock. A transfer locks both accounts in <b>ascending id order</b> regardless of direction, so no cycle can form. The overdraft check and both updates happen while holding both locks, so the "total money" invariant is never visible broken. Transfers on disjoint pairs proceed in parallel.</p>
<p><b>In Python, TypeScript and C++.</b> Lock ordering by id is the same in every language: Python uses <code>with first.lock, second.lock</code>, C++ takes two <code>lock_guard</code>s in order (<code>std::scoped_lock(a.mu, b.mu)</code> is the library's own deadlock-avoiding alternative). TypeScript has no threads, but async tasks that <code>await</code> a second mutex while holding the first can deadlock in exactly the same way, so the same ordering rule applies.</p>`,
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

    long balance(int id) {
        Account x = accounts[id];
        x.lock.lock();
        try { return x.balance; } finally { x.lock.unlock(); }
    }

    long total() {                                   // lock all in order for a consistent snapshot
        for (Account x : accounts) x.lock.lock();
        try { long s = 0; for (Account x : accounts) s += x.balance; return s; }
        finally { for (int i = accounts.length - 1; i >= 0; i--) accounts[i].lock.unlock(); }
    }
}

class BankDemo {
    public static void main(String[] args) throws InterruptedException {
        Bank small = new Bank(3, 1000);
        System.out.println("move 300 from 0 to 1: " + small.transfer(0, 1, 300));    // true
        System.out.println("move 800 from 0 to 1: " + small.transfer(0, 1, 800));    // false: only 700 left
        System.out.println("move 50 from 2 to 2: " + small.transfer(2, 2, 50));      // false: same account
        System.out.println("move -5 from 1 to 2: " + small.transfer(1, 2, -5));      // false: bad amount
        System.out.println("balances: " + small.balance(0) + " " + small.balance(1) + " " + small.balance(2)
                + " total=" + small.total());

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
}`, alt: [
          { lang: 'python', code: `import random
import threading
from concurrent.futures import ThreadPoolExecutor, wait


class Account:
    def __init__(self, account_id: int, balance: int) -> None:
        self.id = account_id
        self.balance = balance
        self.lock = threading.Lock()


class Bank:
    def __init__(self, n: int, init: int) -> None:
        self.accounts = [Account(i, init) for i in range(n)]

    def transfer(self, src: int, dst: int, amount: int) -> bool:
        if src == dst or amount <= 0:
            return False
        a, b = self.accounts[src], self.accounts[dst]
        first, second = (a, b) if a.id < b.id else (b, a)    # GLOBAL ORDER
        with first.lock, second.lock:
            if a.balance < amount:
                return False
            a.balance -= amount
            b.balance += amount
            return True

    def balance(self, account_id: int) -> int:
        acct = self.accounts[account_id]
        with acct.lock:
            return acct.balance

    def total(self) -> int:
        """Lock every account in order for a consistent snapshot."""
        for acct in self.accounts:
            acct.lock.acquire()
        try:
            return sum(acct.balance for acct in self.accounts)
        finally:
            for acct in reversed(self.accounts):
                acct.lock.release()


def main() -> None:
    small = Bank(3, 1000)
    print(f"move 300 from 0 to 1: {str(small.transfer(0, 1, 300)).lower()}")
    print(f"move 800 from 0 to 1: {str(small.transfer(0, 1, 800)).lower()}")   # only 700 left
    print(f"move 50 from 2 to 2: {str(small.transfer(2, 2, 50)).lower()}")     # same account
    print(f"move -5 from 1 to 2: {str(small.transfer(1, 2, -5)).lower()}")     # bad amount
    print(f"balances: {small.balance(0)} {small.balance(1)} {small.balance(2)} total={small.total()}")

    bank = Bank(10, 1000)

    def task(_: int) -> None:
        bank.transfer(random.randrange(10), random.randrange(10), random.randrange(1, 50))

    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = [pool.submit(task, i) for i in range(30_000)]
        _, not_done = wait(futures, timeout=20)
    print(f"finished={str(not not_done).lower()} total={bank.total()}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `// A mutex for tasks: lock() resolves with an unlock function once every earlier holder is done.
class Mutex {
  private tail: Promise<void> = Promise.resolve();

  lock(): Promise<() => void> {
    let release!: () => void;
    const mine = new Promise<void>((resolve) => (release = resolve));
    const previous = this.tail;
    this.tail = previous.then(() => mine);
    return previous.then(() => release);
  }
}

class Account {
  balance: number;
  readonly mutex = new Mutex();

  constructor(readonly id: number, balance: number) {
    this.balance = balance;
  }
}

class Bank {
  readonly accounts: Account[];

  constructor(n: number, init: number) {
    this.accounts = Array.from({ length: n }, (_, i) => new Account(i, init));
  }

  async transfer(from: number, to: number, amount: number): Promise<boolean> {
    if (from === to || amount <= 0) return false;
    const a = this.accounts[from];
    const b = this.accounts[to];
    const [first, second] = a.id < b.id ? [a, b] : [b, a]; // GLOBAL ORDER
    const unlockFirst = await first.mutex.lock();
    try {
      const unlockSecond = await second.mutex.lock(); // other transfers interleave at each await
      try {
        if (a.balance < amount) return false;
        a.balance -= amount;
        b.balance += amount;
        return true;
      } finally {
        unlockSecond();
      }
    } finally {
      unlockFirst();
    }
  }

  async balance(id: number): Promise<number> {
    const unlock = await this.accounts[id].mutex.lock();
    try {
      return this.accounts[id].balance;
    } finally {
      unlock();
    }
  }

  // Lock every account in order for a consistent snapshot.
  async total(): Promise<number> {
    const unlocks: Array<() => void> = [];
    for (const x of this.accounts) unlocks.push(await x.mutex.lock());
    try {
      return this.accounts.reduce((s, x) => s + x.balance, 0);
    } finally {
      for (const u of unlocks.reverse()) u();
    }
  }
}

async function main(): Promise<void> {
  const small = new Bank(3, 1000);
  console.log("move 300 from 0 to 1: " + (await small.transfer(0, 1, 300)));
  console.log("move 800 from 0 to 1: " + (await small.transfer(0, 1, 800))); // only 700 left
  console.log("move 50 from 2 to 2: " + (await small.transfer(2, 2, 50))); // same account
  console.log("move -5 from 1 to 2: " + (await small.transfer(1, 2, -5))); // bad amount
  console.log(
    "balances: " + (await small.balance(0)) + " " + (await small.balance(1)) + " " + (await small.balance(2)) +
      " total=" + (await small.total()),
  );

  const bank = new Bank(10, 1000);
  const jobs: Promise<boolean>[] = [];
  for (let i = 0; i < 30_000; i++) {
    const from = Math.floor(Math.random() * 10);
    const to = Math.floor(Math.random() * 10);
    jobs.push(bank.transfer(from, to, 1 + Math.floor(Math.random() * 49)));
  }
  await Promise.all(jobs);
  console.log("finished=true total=" + (await bank.total()));
}

main();` },
          { lang: 'cpp', code: `class Bank {
    struct Account {
        int id = 0;
        long long balance = 0;
        mutex mu;
    };
    vector<Account> accounts_;

public:
    Bank(int n, long long init) : accounts_(n) {
        for (int i = 0; i < n; i++) { accounts_[i].id = i; accounts_[i].balance = init; }
    }

    bool transfer(int from, int to, long long amount) {
        if (from == to || amount <= 0) return false;
        Account &a = accounts_[from], &b = accounts_[to];
        Account &first = a.id < b.id ? a : b, &second = a.id < b.id ? b : a;   // GLOBAL ORDER
        lock_guard l1(first.mu);
        lock_guard l2(second.mu);                  // scoped_lock(a.mu, b.mu) would also avoid the deadlock
        if (a.balance < amount) return false;
        a.balance -= amount;
        b.balance += amount;
        return true;
    }

    long long balance(int id) {
        lock_guard lk(accounts_[id].mu);
        return accounts_[id].balance;
    }

    long long total() {                            // lock all in order for a consistent snapshot
        vector<unique_lock<mutex>> held;
        for (auto& x : accounts_) held.emplace_back(x.mu);
        long long s = 0;
        for (auto& x : accounts_) s += x.balance;
        return s;                                  // the locks are released when \`held\` is destroyed
    }
};

int main() {
    Bank small(3, 1000);
    cout << boolalpha;
    cout << "move 300 from 0 to 1: " << small.transfer(0, 1, 300) << "\\n";
    cout << "move 800 from 0 to 1: " << small.transfer(0, 1, 800) << "\\n";   // only 700 left
    cout << "move 50 from 2 to 2: " << small.transfer(2, 2, 50) << "\\n";     // same account
    cout << "move -5 from 1 to 2: " << small.transfer(1, 2, -5) << "\\n";     // bad amount
    cout << "balances: " << small.balance(0) << " " << small.balance(1) << " " << small.balance(2)
         << " total=" << small.total() << "\\n";

    Bank bank(10, 1000);
    {
        vector<jthread> pool;
        for (int t = 0; t < 16; t++)
            pool.emplace_back([&bank, t] {
                mt19937 rng(t);
                for (int i = 0; i < 6250; i++)
                    bank.transfer(rng() % 10, rng() % 10, 1 + rng() % 49);
            });
    }
    cout << "finished=true total=" << bank.total() << "\\n";
}` }
        ],
      complexity: `<p>O(1) per transfer; contention only between transfers sharing an account.</p>`,
      followUps: ['Use tryLock with timeout and retry instead of ordering.', 'Transfers across two databases (sagas / two-phase commit).']
    }
  });

  practice.push({
    title: 'Fixed-Window Quota per API Key', level: 'Medium', tags: ['rate limiter', 'fixed window', 'ConcurrentHashMap.compute'], companies: ['Postman', 'RapidAPI', 'Stripe'],
    statement: `<p>Each API key may make at most <b>L calls per calendar minute</b> (the business explicitly wants resets at :00 for billing). Implement <code>boolean allow(String apiKey, long nowMillis)</code> thread-safely, with O(1) memory per key (no growing map of old minutes), and <code>int used(String apiKey, long nowMillis)</code>.</p>`,
    constraints: `<p>10<sup>5</sup> keys, 64 threads. Exactly L allowed per key per minute even under concurrent calls.</p>`,
    example: `<p>L = 3. Key k1 at 10:00:10 ×4 → ${H.c('g', 'Y Y Y')} ${H.c('r', 'N')}. At 10:01:00 → ${H.c('g', 'Y')} (new window, count reset).</p>`,
    brute: { why: `<p>Brute A: <code>HashMap&lt;String, int[]{window, count}&gt;</code> with "if window changed, reset; if count &lt; L, count++" — three unsynchronized steps; concurrent calls exceed L and two threads can both reset. Brute B: key the map by <code>key + minute</code> — atomic with <code>merge</code> but leaks one entry per key per minute forever.</p>`, code: { lang: 'java', code: `class QuotaBrute {
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
}`, alt: [{ lang: 'python', code: "class QuotaBrute:\n    def __init__(self, limit):\n        self.state = {}                               # key -> [window_id, count], unsynchronized\n        self.limit = limit\n\n    def allow(self, key, now_millis):\n        w = now_millis // 60_000\n        s = self.state.setdefault(key, [w, 0])\n        if s[0] != w: s[0] = w; s[1] = 0              # racy reset\n        if s[1] >= self.limit: return False           # racy check\n        s[1] += 1                                     # racy increment\n        return True\n" }, { lang: 'ts', code: "class QuotaBrute {\n  private state = new Map<string, number[]>();       // key -> [windowId, count], unsynchronized\n  constructor(private limit: number) {}\n  allow(key: string, nowMillis: number): boolean {\n    const w = Math.floor(nowMillis / 60_000);\n    if (!this.state.has(key)) this.state.set(key, [w, 0]);\n    const s = this.state.get(key)!;\n    if (s[0] !== w) { s[0] = w; s[1] = 0; }           // racy reset\n    if (s[1] >= this.limit) return false;             // racy check\n    s[1]++;                                           // racy increment\n    return true;\n  }\n}\n" }, { lang: 'cpp', code: "class QuotaBrute {\n    unordered_map<string, array<long long, 2>> state;   // {windowId, count}, unsynchronized\n    int limit;\npublic:\n    QuotaBrute(int limit) : limit(limit) {}\n    bool allow(const string& key, long long nowMillis) {\n        long long w = nowMillis / 60'000;\n        auto s = state.try_emplace(key, array<long long, 2>{w, 0}).first;\n        auto& v = s->second;\n        if (v[0] != w) { v[0] = w; v[1] = 0; }          // racy reset\n        if (v[1] >= limit) return false;                // racy check\n        v[1]++;                                         // racy increment\n        return true;\n    }\n};\n" }] } },
    mcq: { q: 'Why store an <b>immutable</b> record (window, count) and replace it inside <code>compute</code>?', options: ['compute runs atomically per key, and an immutable value means no thread can observe a half-updated pair', 'Records are faster than arrays', 'compute only accepts records', 'It avoids the need for a limit'], answer: 0, explain: 'The window id and count form one invariant. Replacing the whole value under the per-key lock keeps them consistent and safely published.' },
    hints: [`<p>Hint 1: Per key, the state is (windowId, count). Both must update together.</p>`, `<p>Hint 2: <code>ConcurrentHashMap.compute(key, (k, old) -&gt; ...)</code> runs atomically for that key.</p>`, `<p>Hint 3: Inside compute: if old is null or from an older window → new (w, 1); else if count &lt; L → (w, count+1); else keep old and remember "rejected" in a local holder.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "allowed=100 used=100\n101st request: false\nother key: true\nnext minute: true\nlate request after rollover: true used now=2\n" }] },
    solution: {
      approach: `<p>One entry per key holding an immutable <code>Window(id, count)</code>. <code>compute</code> performs the reset-check-increment atomically per key; different keys never contend. The decision is passed out of the lambda via a one-element array (the lambda runs on the calling thread). Memory stays O(keys) because each key's entry is overwritten each minute.</p>
<p><b>In Python, TypeScript and C++.</b> Python and C++ keep the (window, count) pair in a map guarded by one short lock and replace the whole pair in a single step; TypeScript does the same without a lock because the method is synchronous. The same fix applies to all of them: a late timestamp from a skewed clock is counted in the current window and never moves it backwards.</p>`,
      code: `class MinuteQuota {
    record QuotaWindow(long id, int count) {}
    private final ConcurrentHashMap<String, QuotaWindow> state = new ConcurrentHashMap<>();
    private final int limit;
    MinuteQuota(int limit) { this.limit = limit; }

    boolean allow(String key, long nowMillis) {
        long w = nowMillis / 60_000;
        boolean[] ok = new boolean[1];
        state.compute(key, (k, old) -> {
            if (old == null || old.id() < w) { ok[0] = true; return new QuotaWindow(w, 1); }   // newer minute: reset
            // a late request (old.id() > w, clock skew) is counted in the current window, never resets it
            if (old.count() < limit) { ok[0] = true; return new QuotaWindow(old.id(), old.count() + 1); }
            return old;                                                                    // rejected
        });
        return ok[0];
    }

    int used(String key, long nowMillis) {
        QuotaWindow win = state.get(key);
        return (win == null || win.id() != nowMillis / 60_000) ? 0 : win.count();
    }
}

class MinuteQuotaDemo {
    public static void main(String[] args) throws InterruptedException {
        MinuteQuota q = new MinuteQuota(100);
        AtomicInteger ok = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(32);
        for (int i = 0; i < 1000; i++) pool.execute(() -> { if (q.allow("k1", 10_000)) ok.incrementAndGet(); });
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("allowed=" + ok.get() + " used=" + q.used("k1", 10_000));            // 100 100
        System.out.println("101st request: " + q.allow("k1", 10_000));                            // false
        System.out.println("other key: " + q.allow("k2", 10_000));                                // true
        System.out.println("next minute: " + q.allow("k1", 60_000));                              // true
        System.out.println("late request after rollover: " + q.allow("k1", 10_000)
                + " used now=" + q.used("k1", 60_000));                                          // true used now=2
    }
}`, alt: [
          { lang: 'python', code: `import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass


@dataclass(frozen=True)
class QuotaWindow:
    id: int
    count: int


class MinuteQuota:
    def __init__(self, limit: int) -> None:
        self._limit = limit
        self._state: dict[str, QuotaWindow] = {}
        self._lock = threading.Lock()          # the whole read-decide-write below is one critical section

    def allow(self, key: str, now_millis: int) -> bool:
        w = now_millis // 60_000
        with self._lock:
            old = self._state.get(key)
            if old is None or old.id < w:      # newer minute: reset
                self._state[key] = QuotaWindow(w, 1)
                return True
            # a late request (old.id > w, clock skew) is counted in the current window, never resets it
            if old.count < self._limit:
                self._state[key] = QuotaWindow(old.id, old.count + 1)
                return True
            return False                       # rejected

    def used(self, key: str, now_millis: int) -> int:
        with self._lock:
            win = self._state.get(key)
        return 0 if win is None or win.id != now_millis // 60_000 else win.count


def main() -> None:
    q = MinuteQuota(100)
    with ThreadPoolExecutor(max_workers=32) as pool:
        ok = sum(pool.map(lambda _: q.allow("k1", 10_000), range(1000)))
    print(f"allowed={ok} used={q.used('k1', 10_000)}")
    print(f"101st request: {str(q.allow('k1', 10_000)).lower()}")
    print(f"other key: {str(q.allow('k2', 10_000)).lower()}")
    print(f"next minute: {str(q.allow('k1', 60_000)).lower()}")
    print(f"late request after rollover: {str(q.allow('k1', 10_000)).lower()} used now={q.used('k1', 60_000)}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `interface QuotaWindow {
  readonly id: number;
  readonly count: number;
}

class MinuteQuota {
  private readonly state = new Map<string, QuotaWindow>();

  constructor(private readonly limit: number) {}

  // Read, decide and write happen in one synchronous step, so no lock is needed.
  allow(key: string, nowMillis: number): boolean {
    const w = Math.floor(nowMillis / 60_000);
    const old = this.state.get(key);
    if (!old || old.id < w) {
      this.state.set(key, { id: w, count: 1 }); // newer minute: reset
      return true;
    }
    // a late request (old.id > w, clock skew) is counted in the current window, never resets it
    if (old.count < this.limit) {
      this.state.set(key, { id: old.id, count: old.count + 1 });
      return true;
    }
    return false; // rejected
  }

  used(key: string, nowMillis: number): number {
    const win = this.state.get(key);
    return !win || win.id !== Math.floor(nowMillis / 60_000) ? 0 : win.count;
  }
}

async function main(): Promise<void> {
  const q = new MinuteQuota(100);
  const results = await Promise.all(
    Array.from({ length: 1000 }, async () => {
      await Promise.resolve();
      return q.allow("k1", 10_000);
    }),
  );
  console.log("allowed=" + results.filter(Boolean).length + " used=" + q.used("k1", 10_000));
  console.log("101st request: " + q.allow("k1", 10_000));
  console.log("other key: " + q.allow("k2", 10_000));
  console.log("next minute: " + q.allow("k1", 60_000));
  console.log("late request after rollover: " + q.allow("k1", 10_000) + " used now=" + q.used("k1", 60_000));
}

main();` },
          { lang: 'cpp', code: `class MinuteQuota {
    struct QuotaWindow { long long id; int count; };
    unordered_map<string, QuotaWindow> state_;
    mutex mu_;                                     // the whole read-decide-write is one critical section
    int limit_;

public:
    explicit MinuteQuota(int limit) : limit_(limit) {}

    bool allow(const string& key, long long nowMillis) {
        long long w = nowMillis / 60'000;
        lock_guard lk(mu_);
        auto it = state_.find(key);
        if (it == state_.end() || it->second.id < w) {      // newer minute: reset
            state_[key] = {w, 1};
            return true;
        }
        // a late request (id > w, clock skew) is counted in the current window, never resets it
        if (it->second.count < limit_) { it->second.count++; return true; }
        return false;                                       // rejected
    }

    int used(const string& key, long long nowMillis) {
        lock_guard lk(mu_);
        auto it = state_.find(key);
        return (it == state_.end() || it->second.id != nowMillis / 60'000) ? 0 : it->second.count;
    }
};

int main() {
    MinuteQuota q(100);
    atomic<int> ok{0};
    {
        vector<jthread> pool;
        for (int t = 0; t < 32; t++)
            pool.emplace_back([&] { for (int i = 0; i < 32; i++) if (q.allow("k1", 10'000)) ok++; });
    }
    // 32 x 32 = 1024 attempts
    cout << boolalpha;
    cout << "allowed=" << ok << " used=" << q.used("k1", 10'000) << "\\n";
    cout << "101st request: " << q.allow("k1", 10'000) << "\\n";
    cout << "other key: " << q.allow("k2", 10'000) << "\\n";
    cout << "next minute: " << q.allow("k1", 60'000) << "\\n";
    bool late = q.allow("k1", 10'000);
    cout << "late request after rollover: " << late << " used now=" << q.used("k1", 60'000) << "\\n";
}` }
        ],
      complexity: `<p>O(1) per call; O(keys) memory.</p>`,
      followUps: ['Explain the boundary burst to the product team and offer a sliding counter.', 'Bill overage instead of rejecting (count past L, flag overage).']
    }
  });

  practice.push({
    title: 'Read-Mostly Config Store with Hot Reload', level: 'Medium', tags: ['immutability', 'volatile snapshot', 'ReadWriteLock'], companies: ['Netflix', 'LinkedIn', 'Uber'],
    statement: `<p>A <code>FeatureFlags</code> store is read on every request (<code>isEnabled(flag, userId)</code>, ~10<sup>6</sup>/s) and reloaded every 30 s from a config service by one background thread (<code>reload(Map&lt;String, Integer&gt; rolloutPercents)</code>). Readers must never see a <b>half-applied</b> reload (some flags new, some old), and must never block.</p>`,
    constraints: `<p>~500 flags. Reload replaces the whole set. Reads vastly outnumber writes.</p>`,
    example: `<p>Reload changes "newCheckout" 10% → 50% and "darkMode" 0% → 100% together. A reader must see either ${H.c('b', 'both old')} or ${H.c('g', 'both new')} — never newCheckout=50% with darkMode=0%.</p>`,
    brute: { why: `<p><b>Mutating a shared HashMap in place</b> (clear + putAll): readers see an empty or partial map, and HashMap may corrupt. <b>ReadWriteLock</b>: correct and readers can share, but every one of the million reads/sec still pays lock bookkeeping (a CAS on shared reader count → cache-line contention), and a long reload blocks all readers.</p>`, code: { lang: 'java', code: `class FlagsInPlace {
    private final Map<String, Integer> flags = new HashMap<>();
    // BRUTE: readers can see an empty or half-filled map during reload; HashMap is not thread-safe
    void reload(Map<String, Integer> fresh) { flags.clear(); flags.putAll(fresh); }
    boolean isEnabled(String f, long user) { return Math.floorMod(user, 100) < flags.getOrDefault(f, 0); }
}`, alt: [{ lang: 'python', code: "class FlagsInPlace:\n    def __init__(self):\n        self.flags = {}\n\n    # BRUTE: readers can see an empty or half-filled dict during reload; no synchronization at all\n    def reload(self, fresh):\n        self.flags.clear(); self.flags.update(fresh)\n\n    def is_enabled(self, f, user): return user % 100 < self.flags.get(f, 0)\n" }, { lang: 'ts', code: "class FlagsInPlace {\n  private flags = new Map<string, number>();\n  // BRUTE: readers can see an empty or half-filled map during reload (another worker, or an await mid-reload)\n  reload(fresh: Map<string, number>): void { this.flags.clear(); fresh.forEach((v, k) => this.flags.set(k, v)); }\n  isEnabled(f: string, user: number): boolean { return ((user % 100) + 100) % 100 < (this.flags.get(f) ?? 0); }\n}\n" }, { lang: 'cpp', code: "class FlagsInPlace {\n    unordered_map<string, int> flags;\npublic:\n    // BRUTE: readers can see an empty or half-filled map during reload; unordered_map is not thread-safe\n    void reload(const unordered_map<string, int>& fresh) { flags.clear(); flags.insert(fresh.begin(), fresh.end()); }\n    bool isEnabled(const string& f, long long user) {\n        auto it = flags.find(f);\n        return ((user % 100) + 100) % 100 < (it == flags.end() ? 0 : it->second);\n    }\n};\n" }] } },
    mcq: { q: 'Why does a <code>volatile</code> reference to an <b>immutable</b> map give atomic reloads?', options: ['Readers read one reference: they get either the old whole map or the new whole map; volatile makes the new map\'s contents visible', 'volatile locks the map during reads', 'Immutable maps are faster to iterate', 'It doesn\'t; you need synchronized'], answer: 0, explain: 'The switch is a single reference write. Build the new map fully, freeze it (Map.copyOf), then publish via the volatile write — happens-before guarantees readers see the fully built contents.' },
    hints: [`<p>Hint 1: Instead of changing the map, build a new one and swap.</p>`, `<p>Hint 2: Hold the current snapshot in a <code>volatile</code> field (or <code>AtomicReference</code>) pointing to an immutable map.</p>`, `<p>Hint 3: Readers copy the reference into a local once per request so all checks in that request use the same snapshot.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "torn reads: 0, user 42 newCheckout: false\nuser 5 newCheckout: true, unknown flag: false, user -1 darkMode: false\n" }] },
    solution: {
      approach: `<p><b>Copy-on-write snapshot swap.</b> Reload builds a brand-new immutable map (<code>Map.copyOf</code>) and publishes it with one volatile write. Readers do one volatile read and then plain lookups — no locks, no contention, and always a complete, consistent version. Same idea as CopyOnWriteArrayList, but for a whole config.</p>
<p><b>In Python, TypeScript and C++.</b> Python swaps a read-only <code>MappingProxyType</code> in one attribute assignment; TypeScript swaps a reference to a fresh <code>Map</code>; C++ publishes a <code>shared_ptr&lt;const map&gt;</code> through <code>std::atomic&lt;std::shared_ptr&gt;</code> (C++20), so a reader holds a complete version alive for as long as it uses it.</p>`,
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
        System.out.println("user 5 newCheckout: " + ff.isEnabled("newCheckout", 5)             // 5 < 10 -> true
                + ", unknown flag: " + ff.isEnabled("noSuchFlag", 5)                          // not configured -> off
                + ", user -1 darkMode: " + ff.isEnabled("darkMode", -1));                      // floorMod keeps buckets 0..99
    }
}`, alt: [
          { lang: 'python', code: `import threading
from collections.abc import Mapping
from types import MappingProxyType


class FeatureFlags:
    def __init__(self) -> None:
        self._snapshot: Mapping[str, int] = MappingProxyType({})   # read-only view, swapped whole

    def reload(self, fresh: Mapping[str, int]) -> None:
        # build fully, then publish with ONE attribute assignment (atomic in every Python)
        self._snapshot = MappingProxyType(dict(fresh))

    def is_enabled(self, flag: str, user_id: int) -> bool:
        s = self._snapshot                     # one read; use s for the whole decision
        return user_id % 100 < s.get(flag, 0)  # Python's % is already non-negative here

    def current(self) -> Mapping[str, int]:
        return self._snapshot


def main() -> None:
    ff = FeatureFlags()
    ff.reload({"newCheckout": 10, "darkMode": 0})
    torn = [0]

    def reader() -> None:
        for _ in range(200_000):
            s = ff.current()
            old_set = s["newCheckout"] == 10 and s["darkMode"] == 0
            new_set = s["newCheckout"] == 50 and s["darkMode"] == 100
            if not old_set and not new_set:
                torn[0] += 1

    t = threading.Thread(target=reader)
    t.start()
    for i in range(1000):
        ff.reload({"newCheckout": 50, "darkMode": 100} if i % 2 == 0 else {"newCheckout": 10, "darkMode": 0})
    t.join(5)
    print(f"torn reads: {torn[0]}, user 42 newCheckout: {str(ff.is_enabled('newCheckout', 42)).lower()}")
    print(f"user 5 newCheckout: {str(ff.is_enabled('newCheckout', 5)).lower()}, "
          f"unknown flag: {str(ff.is_enabled('noSuchFlag', 5)).lower()}, "
          f"user -1 darkMode: {str(ff.is_enabled('darkMode', -1)).lower()}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `type Flags = ReadonlyMap<string, number>;

class FeatureFlags {
  private snapshot: Flags = new Map();

  reload(fresh: Flags): void {
    this.snapshot = new Map(fresh); // build a private copy, then swap the reference in one assignment
  }

  isEnabled(flag: string, userId: number): boolean {
    const s = this.snapshot; // one read; use s for the whole decision
    const bucket = ((userId % 100) + 100) % 100; // JS % keeps the sign of the dividend, so fix negatives
    return bucket < (s.get(flag) ?? 0);
  }

  current(): Flags {
    return this.snapshot;
  }
}

async function main(): Promise<void> {
  const ff = new FeatureFlags();
  ff.reload(new Map([["newCheckout", 10], ["darkMode", 0]]));
  let torn = 0;
  const reader = async (): Promise<void> => {
    for (let i = 0; i < 200_000; i++) {
      if (i % 1000 === 0) await Promise.resolve(); // let the reloader run in between
      const s = ff.current();
      const oldSet = s.get("newCheckout") === 10 && s.get("darkMode") === 0;
      const newSet = s.get("newCheckout") === 50 && s.get("darkMode") === 100;
      if (!oldSet && !newSet) torn++;
    }
  };
  const reloader = async (): Promise<void> => {
    for (let i = 0; i < 1000; i++) {
      ff.reload(i % 2 === 0 ? new Map([["newCheckout", 50], ["darkMode", 100]]) : new Map([["newCheckout", 10], ["darkMode", 0]]));
      if (i % 10 === 0) await Promise.resolve();
    }
  };
  await Promise.all([reader(), reloader()]);
  console.log("torn reads: " + torn + ", user 42 newCheckout: " + ff.isEnabled("newCheckout", 42));
  console.log(
    "user 5 newCheckout: " + ff.isEnabled("newCheckout", 5) +
      ", unknown flag: " + ff.isEnabled("noSuchFlag", 5) +
      ", user -1 darkMode: " + ff.isEnabled("darkMode", -1),
  );
}

main();` },
          { lang: 'cpp', code: `class FeatureFlags {
public:
    using Flags = unordered_map<string, int>;

    void reload(Flags fresh) {                     // build fully, then publish with ONE atomic store
        snapshot_.store(make_shared<const Flags>(std::move(fresh)));
    }

    bool isEnabled(const string& flag, long long userId) const {
        shared_ptr<const Flags> s = snapshot_.load();      // one read; s stays valid for the whole decision
        auto it = s->find(flag);
        long long bucket = ((userId % 100) + 100) % 100;   // C++ % keeps the sign of the dividend
        return bucket < (it == s->end() ? 0 : it->second);
    }

    shared_ptr<const Flags> current() const { return snapshot_.load(); }

private:
    atomic<shared_ptr<const Flags>> snapshot_{make_shared<const Flags>()};
};

int main() {
    FeatureFlags ff;
    ff.reload({{"newCheckout", 10}, {"darkMode", 0}});
    atomic<int> torn{0};
    jthread reader([&] {
        for (int i = 0; i < 200000; i++) {
            auto s = ff.current();
            bool oldSet = s->at("newCheckout") == 10 && s->at("darkMode") == 0;
            bool newSet = s->at("newCheckout") == 50 && s->at("darkMode") == 100;
            if (!oldSet && !newSet) torn++;
        }
    });
    for (int i = 0; i < 1000; i++)
        ff.reload(i % 2 == 0 ? FeatureFlags::Flags{{"newCheckout", 50}, {"darkMode", 100}}
                             : FeatureFlags::Flags{{"newCheckout", 10}, {"darkMode", 0}});
    reader.join();
    cout << boolalpha << "torn reads: " << torn << ", user 42 newCheckout: " << ff.isEnabled("newCheckout", 42) << "\\n";
    cout << "user 5 newCheckout: " << ff.isEnabled("newCheckout", 5)
         << ", unknown flag: " << ff.isEnabled("noSuchFlag", 5)
         << ", user -1 darkMode: " << ff.isEnabled("darkMode", -1) << "\\n";
}` }
        ],
      complexity: `<p>Read O(1) lock-free; reload O(F) to copy F flags.</p>`,
      followUps: ['Two background reloaders racing: use AtomicReference.compareAndSet with a version number.', 'When would a ReadWriteLock be better? (large structure, frequent partial updates).']
    }
  });

  practice.push({
    title: 'Concurrent Web Crawler with a Visited Set', level: 'Medium', tags: ['ConcurrentHashMap.newKeySet', 'ExecutorService', 'termination'], companies: ['Google', 'Anthropic', 'Bloomberg'],
    statement: `<p>Crawl all pages reachable from a start URL that share its host, using a pool of 8 threads (LeetCode 1242 style). The "web" is given as <code>Map&lt;String, List&lt;String&gt;&gt; links</code> (call it like a slow network fetch). Each page must be fetched <b>exactly once</b>, and <code>crawl()</code> must return only when all work is done.</p>`,
    constraints: `<p>Up to 10<sup>4</sup> pages; fetch latency 1–10 ms; 8 worker threads.</p>`,
    example: `<p>Start <code>http://a.com/</code> links to /x and /y; /x links to /y and <code>http://b.com/</code>. Result: ${H.c('g', '{a.com/, a.com/x, a.com/y}')} — /y fetched once even though two pages link to it; b.com skipped (other host).</p>`,
    brute: { why: `<p>Brute A: shared <code>HashSet visited</code> + <code>if (!visited.contains(u)) { visited.add(u); submit(u); }</code> — check-then-act fetches pages twice and HashSet corrupts. Brute B: single-threaded BFS — correct but 8× slower on I/O-bound fetches. Brute C: <code>pool.shutdown()</code> right after submitting the start URL — workers still need to submit children, so they get <code>RejectedExecutionException</code>; or <code>Thread.sleep(5000)</code> "until done" — flaky.</p>`, code: { lang: 'java', code: `class CrawlerBrute {
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
}`, alt: [{ lang: 'python', code: "from collections import deque\n\nclass CrawlerBrute:\n    # correct but single-threaded: every fetch waits for the previous one\n    def crawl(self, start, web):\n        seen = {start: None}                           # dict keeps insertion order\n        q = deque([start])\n        host = start.split(\"/\")[2]\n        while q:\n            for n in web.get(q.popleft(), []):\n                if n.split(\"/\")[2] == host and n not in seen:\n                    seen[n] = None\n                    q.append(n)\n        return list(seen)\n" }, { lang: 'ts', code: "class CrawlerBrute {\n  // correct but single-threaded: every fetch waits for the previous one\n  crawl(start: string, web: Map<string, string[]>): Set<string> {\n    const seen = new Set<string>([start]);\n    const q: string[] = [start];\n    const host = start.split(\"/\")[2];\n    while (q.length) {\n      for (const n of web.get(q.shift()!) ?? [])\n        if (n.split(\"/\")[2] === host && !seen.has(n)) { seen.add(n); q.push(n); }\n    }\n    return seen;\n  }\n}\n" }, { lang: 'cpp', code: "class CrawlerBrute {\n    static string host(const string& url) { size_t a = url.find(\"//\") + 2; return url.substr(a, url.find('/', a) - a); }\npublic:\n    // correct but single-threaded: every fetch waits for the previous one\n    vector<string> crawl(const string& start, const unordered_map<string, vector<string>>& web) {\n        vector<string> order{start};\n        unordered_set<string> seen{start};\n        deque<string> q{start};\n        string h = host(start);\n        while (!q.empty()) {\n            string u = q.front(); q.pop_front();\n            auto it = web.find(u);\n            if (it == web.end()) continue;\n            for (auto& n : it->second)\n                if (host(n) == h && seen.insert(n).second) { order.push_back(n); q.push_back(n); }\n        }\n        return order;\n    }\n};\n" }] } },
    mcq: { q: 'How do you know the crawl is finished when workers keep discovering new URLs?', options: ['Count pending tasks: increment before each submit, decrement when a task ends; when it reaches 0, signal done', 'Wait until the queue is empty once', 'Call awaitTermination right after the first submit', 'Sleep for a fixed time'], answer: 0, explain: 'A task may be running (about to submit children) while the queue is momentarily empty. A pending counter that is incremented before submit and decremented after the task finishes reaches zero only when no task can create more work.' },
    hints: [`<p>Hint 1: "Exactly once" = an atomic test-and-add on a concurrent set: <code>visited.add(u)</code> returns false if already present.</p>`, `<p>Hint 2: Use <code>ConcurrentHashMap.newKeySet()</code> and an <code>ExecutorService</code>.</p>`, `<p>Hint 3: Track outstanding tasks with an <code>AtomicInteger</code>; the task that brings it to 0 counts down a latch. Then shut the pool down.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "[http://a.com/, http://a.com/dead, http://a.com/x, http://a.com/y, http://a.com/z]\n[http://zzz.com/]\n" }] },
    solution: {
      approach: `<p><code>visited.add(url)</code> on a concurrent key set is an atomic claim — only the thread that gets <code>true</code> submits the fetch. A <code>pending</code> counter is incremented <b>before</b> each submit and decremented in <code>finally</code> after the task (which may have submitted children first), so it can only hit zero when no work remains; that thread releases a latch, and the main thread shuts the pool down.</p>
<p><b>In Python, TypeScript and C++.</b> Python mirrors the Java design with a <code>ThreadPoolExecutor</code>, a pending counter and an <code>Event</code>. C++ uses 8 worker threads over a shared queue and stops when the pending count reaches zero. TypeScript needs no pool: each page is an async task, the <code>visited</code> check-and-add happens before any <code>await</code>, and <code>Promise.all</code> on the children finishes only when the whole subtree is done.</p>`,
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
}

class CrawlerDemo {
    public static void main(String[] args) throws InterruptedException {
        Map<String, List<String>> web = Map.of(
            "http://a.com/", List.of("http://a.com/x", "http://a.com/y"),
            "http://a.com/x", List.of("http://a.com/y", "http://b.com/", "http://a.com/dead"),   // b.com: other host; dead: not in the map
            "http://a.com/y", List.of("http://a.com/", "http://a.com/z"));
        System.out.println(new TreeSet<>(new Crawler(web).crawl("http://a.com/")));
        System.out.println(new TreeSet<>(new Crawler(web).crawl("http://zzz.com/")));     // unknown start: just itself
    }
}`, alt: [
          { lang: 'python', code: `import threading
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit


class Crawler:
    def __init__(self, web: dict[str, list[str]]) -> None:
        self._web = web

    def _fetch(self, url: str) -> list[str]:          # pretend network call
        time.sleep(0.002)
        return self._web.get(url, [])

    def crawl(self, start: str) -> set[str]:
        host = urlsplit(start).netloc
        visited = {start}
        lock = threading.Lock()                       # guards visited and pending
        pending = 1                                   # tasks submitted but not finished
        done = threading.Event()

        def task(url: str) -> None:
            nonlocal pending
            try:
                for nxt in self._fetch(url):
                    if urlsplit(nxt).netloc != host:
                        continue
                    with lock:
                        fresh = nxt not in visited    # atomic claim
                        if fresh:
                            visited.add(nxt)
                            pending += 1              # BEFORE submit
                    if fresh:
                        pool.submit(task, nxt)
            finally:
                with lock:
                    pending -= 1
                    if pending == 0:
                        done.set()

        with ThreadPoolExecutor(max_workers=8) as pool:
            pool.submit(task, start)
            done.wait(10)
        return visited


def main() -> None:
    web = {
        "http://a.com/": ["http://a.com/x", "http://a.com/y"],
        "http://a.com/x": ["http://a.com/y", "http://b.com/", "http://a.com/dead"],   # b.com: other host
        "http://a.com/y": ["http://a.com/", "http://a.com/z"],
    }
    print("[" + ", ".join(sorted(Crawler(web).crawl("http://a.com/"))) + "]")
    print("[" + ", ".join(sorted(Crawler(web).crawl("http://zzz.com/"))) + "]")   # unknown start: just itself


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

class Crawler {
  constructor(private readonly web: ReadonlyMap<string, string[]>) {}

  private async fetchLinks(url: string): Promise<string[]> {
    await sleep(2); // pretend network call
    return this.web.get(url) ?? [];
  }

  private static host(url: string): string {
    return url.split("/")[2];
  }

  // I/O is non-blocking in JS, so no thread pool: every page is a task and all of them overlap.
  async crawl(start: string): Promise<Set<string>> {
    const visited = new Set<string>([start]);
    const h = Crawler.host(start);
    const visit = async (url: string): Promise<void> => {
      const next: string[] = [];
      for (const link of await this.fetchLinks(url)) {
        if (Crawler.host(link) === h && !visited.has(link)) {
          visited.add(link); // claim before any await: no other task can sneak in between
          next.push(link);
        }
      }
      await Promise.all(next.map(visit)); // finishes when the whole subtree is done: no counter needed
    };
    await visit(start);
    return visited;
  }
}

async function main(): Promise<void> {
  const web = new Map<string, string[]>([
    ["http://a.com/", ["http://a.com/x", "http://a.com/y"]],
    ["http://a.com/x", ["http://a.com/y", "http://b.com/", "http://a.com/dead"]], // b.com: other host
    ["http://a.com/y", ["http://a.com/", "http://a.com/z"]],
  ]);
  console.log("[" + [...(await new Crawler(web).crawl("http://a.com/"))].sort().join(", ") + "]");
  console.log("[" + [...(await new Crawler(web).crawl("http://zzz.com/"))].sort().join(", ") + "]"); // unknown start: just itself
}

main();` },
          { lang: 'cpp', code: `class Crawler {
    const map<string, vector<string>>& web_;

    vector<string> fetch(const string& url) const {      // pretend network call
        this_thread::sleep_for(2ms);
        auto it = web_.find(url);
        return it == web_.end() ? vector<string>{} : it->second;
    }
    static string host(const string& url) {
        size_t a = url.find("//") + 2;
        return url.substr(a, url.find('/', a) - a);
    }

public:
    explicit Crawler(const map<string, vector<string>>& web) : web_(web) {}

    set<string> crawl(const string& start) const {
        string h = host(start);
        set<string> visited{start};
        deque<string> queue{start};
        int pending = 1;                                  // queued or being fetched
        mutex mu;                                         // guards visited, queue and pending
        condition_variable cv;
        {
            vector<jthread> workers;
            for (int w = 0; w < 8; w++)
                workers.emplace_back([&] {
                    unique_lock lk(mu);
                    while (true) {
                        cv.wait(lk, [&] { return !queue.empty() || pending == 0; });
                        if (queue.empty()) return;        // nothing queued and nothing running: finished
                        string url = queue.front();
                        queue.pop_front();
                        lk.unlock();
                        vector<string> links = fetch(url);   // slow call, NO lock held
                        lk.lock();
                        for (const auto& next : links)
                            if (host(next) == h && visited.insert(next).second) {   // atomic claim
                                queue.push_back(next);
                                pending++;                // BEFORE anyone can pop it
                            }
                        pending--;
                        cv.notify_all();
                    }
                });
        }                                                 // jthreads join here
        return visited;
    }
};

void print(const set<string>& s) {
    cout << "[";
    for (auto it = s.begin(); it != s.end(); ++it) cout << (it == s.begin() ? "" : ", ") << *it;
    cout << "]\\n";
}

int main() {
    map<string, vector<string>> web = {
        {"http://a.com/", {"http://a.com/x", "http://a.com/y"}},
        {"http://a.com/x", {"http://a.com/y", "http://b.com/", "http://a.com/dead"}},   // b.com: other host
        {"http://a.com/y", {"http://a.com/", "http://a.com/z"}},
    };
    print(Crawler(web).crawl("http://a.com/"));
    print(Crawler(web).crawl("http://zzz.com/"));          // unknown start: just itself
}` }
        ],
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
    brute: { why: `<p><b>Unsynchronized O(1) LFU</b>: three structures (values, freq buckets, minFreq) updated in several steps — concurrent ops leave a key in two buckets, an empty minFreq bucket, or size above capacity (NPE on eviction). <b>Global lock around an O(n) LFU</b> (scan all keys for the minimum frequency on every eviction): correct but each eviction holds the lock for O(n), stalling every thread.</p>`, code: { lang: 'java', code: `class LfuScanBrute {
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
}`, alt: [{ lang: 'python', code: "import threading\n\nclass LfuScanBrute:\n    def __init__(self, cap):\n        self.m = {}                                    # key -> [value, freq, last_used_tick]\n        self.cap, self.tick = cap, 0\n        self.lock = threading.Lock()\n\n    def get(self, k):\n        with self.lock:\n            e = self.m.get(k)\n            if e is None: return None\n            e[1] += 1; self.tick += 1; e[2] = self.tick\n            return e[0]\n\n    def put(self, k, v):\n        with self.lock:\n            if k in self.m:\n                e = self.m[k]; e[0] = v; e[1] += 1; self.tick += 1; e[2] = self.tick\n                return\n            if len(self.m) == self.cap:                # O(n) scan while holding the lock\n                victim = min(self.m, key=lambda key: (self.m[key][1], self.m[key][2]))\n                del self.m[victim]\n            self.tick += 1\n            self.m[k] = [v, 1, self.tick]\n" }, { lang: 'ts', code: "import { Mutex } from \"async-mutex\";\n\nclass LfuScanBrute {\n  private m = new Map<number, number[]>();             // key -> [value, freq, lastUsedTick]\n  private tick = 0;\n  private mutex = new Mutex();\n  constructor(private cap: number) {}\n\n  get(k: number): Promise<number | null> {\n    return this.mutex.runExclusive(() => {\n      const e = this.m.get(k);\n      if (!e) return null;\n      e[1]++; e[2] = ++this.tick;\n      return e[0];\n    });\n  }\n  put(k: number, v: number): Promise<void> {\n    return this.mutex.runExclusive(() => {\n      const e = this.m.get(k);\n      if (e) { e[0] = v; e[1]++; e[2] = ++this.tick; return; }\n      if (this.m.size === this.cap) {                  // O(n) scan while holding the lock\n        let victim = -1; let best: number[] | null = null;\n        for (const [key, cur] of this.m) {\n          if (best === null || cur[1] < best[1] || (cur[1] === best[1] && cur[2] < best[2])) { best = cur; victim = key; }\n        }\n        this.m.delete(victim);\n      }\n      this.m.set(k, [v, 1, ++this.tick]);\n    });\n  }\n}\n" }, { lang: 'cpp', code: "class LfuScanBrute {\n    unordered_map<int, array<int, 3>> m;               // key -> {value, freq, lastUsedTick}\n    int cap, tick = 0;\n    mutex mu;\npublic:\n    LfuScanBrute(int cap) : cap(cap) {}\n    optional<int> get(int k) {\n        lock_guard<mutex> g(mu);\n        auto it = m.find(k);\n        if (it == m.end()) return nullopt;\n        it->second[1]++; it->second[2] = ++tick;\n        return it->second[0];\n    }\n    void put(int k, int v) {\n        lock_guard<mutex> g(mu);\n        auto it = m.find(k);\n        if (it != m.end()) { it->second[0] = v; it->second[1]++; it->second[2] = ++tick; return; }\n        if ((int)m.size() == cap) {                    // O(n) scan while holding the lock\n            int victim = -1; array<int, 3>* best = nullptr;\n            for (auto& [key, e] : m) {\n                if (best == nullptr || e[1] < (*best)[1] || (e[1] == (*best)[1] && e[2] < (*best)[2])) { best = &e; victim = key; }\n            }\n            m.erase(victim);\n        }\n        m[k] = {v, 1, ++tick};\n    }\n};\n" }] } },
    mcq: { q: 'After inserting a brand-new key into a full LFU cache, what is minFreq?', options: ['1 — the new key has frequency 1, which is the smallest possible', 'Unchanged', 'The evicted key\'s frequency + 1', '0'], answer: 0, explain: 'Every new key starts at frequency 1, and nothing can be lower, so minFreq resets to 1.' },
    hints: [`<p>Hint 1: Three maps: key → value, key → freq, freq → LinkedHashSet of keys (insertion order = recency within the same freq). Plus an int minFreq.</p>`, `<p>Hint 2: get: move key from bucket f to f+1; if bucket f is now empty and f == minFreq, minFreq++. put new: if full, evict the first key of bucket minFreq; insert with freq 1; minFreq = 1.</p>`, `<p>Hint 3: These are invariants across several fields → wrap each whole operation in one ReentrantLock (get too — it mutates). Stress-test with a consistency check.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "null 3\nnull 3 4\ncapacity 0: null\nupdate keeps one entry: 11 null 30\ntie broken by age: null 2 3\nconsistent after stress: true\n" }] },
    solution: {
      approach: `<p>Standard O(1) LFU (value map, freq map, frequency buckets of <code>LinkedHashSet</code>, <code>minFreq</code>) behind <b>one lock</b>, because a single logical operation changes several structures that must agree. Critical sections are tiny (a few hash ops), so one lock sustains millions of ops/sec; stripe by key if that is not enough (approximate LFU per stripe).</p>
<p><b>In Python, TypeScript and C++.</b> The frequency buckets are insertion-ordered sets: <code>OrderedDict</code> in Python, <code>Set</code> in TypeScript (iterates in insertion order), and a <code>list&lt;int&gt;</code> with an iterator per key in C++ for O(1) removal. One lock around every operation (none in TypeScript, where each method is synchronous) keeps the three structures in agreement.</p>`,
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

        ConcurrentLFUCache zero = new ConcurrentLFUCache(0);
        zero.put(1, 1);                                           // capacity 0 stores nothing
        System.out.println("capacity 0: " + zero.get(1));         // null

        ConcurrentLFUCache u = new ConcurrentLFUCache(2);
        u.put(1, 10); u.put(1, 11);                               // an update, not a second entry
        u.put(2, 20); u.put(3, 30);                               // key 1 has frequency 2, key 2 only 1 -> key 2 goes
        System.out.println("update keeps one entry: " + u.get(1) + " " + u.get(2) + " " + u.get(3));   // 11 null 30

        ConcurrentLFUCache ties = new ConcurrentLFUCache(2);
        ties.put(1, 1); ties.put(2, 2); ties.put(3, 3);                    // tie at frequency 1: the OLDEST key goes
        System.out.println("tie broken by age: " + ties.get(1) + " " + ties.get(2) + " " + ties.get(3));         // null 2 3

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
}`, alt: [
          { lang: 'python', code: `import random
import threading
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor


class ConcurrentLFUCache:
    def __init__(self, capacity: int) -> None:
        self._capacity = capacity
        self._vals: dict[int, int] = {}
        self._freq: dict[int, int] = {}
        self._buckets: dict[int, OrderedDict[int, None]] = {}   # freq -> keys, oldest first
        self._min_freq = 0
        self._lock = threading.Lock()

    def get(self, key: int) -> int | None:
        with self._lock:
            if key not in self._vals:
                return None
            self._touch(key)
            return self._vals[key]

    def put(self, key: int, value: int) -> None:
        if self._capacity <= 0:
            return
        with self._lock:
            if key in self._vals:
                self._vals[key] = value
                self._touch(key)
                return
            if len(self._vals) == self._capacity:
                victim, _ = self._buckets[self._min_freq].popitem(last=False)   # oldest key, lowest frequency
                del self._vals[victim], self._freq[victim]
            self._vals[key] = value
            self._freq[key] = 1
            self._buckets.setdefault(1, OrderedDict())[key] = None
            self._min_freq = 1

    def _touch(self, key: int) -> None:                # caller holds the lock
        f = self._freq[key]
        bucket = self._buckets[f]
        del bucket[key]
        if not bucket and f == self._min_freq:
            self._min_freq += 1
        self._freq[key] = f + 1
        self._buckets.setdefault(f + 1, OrderedDict())[key] = None

    def consistent(self) -> bool:
        with self._lock:
            in_buckets = 0
            for f, keys in self._buckets.items():
                for k in keys:
                    if self._freq[k] != f:
                        return False
                    in_buckets += 1
            return in_buckets == len(self._vals) and len(self._vals) <= self._capacity


def show(v: int | None) -> str:
    return "null" if v is None else str(v)


def main() -> None:
    c = ConcurrentLFUCache(2)
    c.put(1, 1)
    c.put(2, 2)
    c.get(1)
    c.put(3, 3)
    print(show(c.get(2)), show(c.get(3)))
    c.put(4, 4)
    print(show(c.get(1)), show(c.get(3)), show(c.get(4)))

    zero = ConcurrentLFUCache(0)
    zero.put(1, 1)                                      # capacity 0 stores nothing
    print(f"capacity 0: {show(zero.get(1))}")

    u = ConcurrentLFUCache(2)
    u.put(1, 10)
    u.put(1, 11)                                        # an update, not a second entry
    u.put(2, 20)
    u.put(3, 30)                                        # key 1 has frequency 2, key 2 only 1 -> key 2 goes
    print(f"update keeps one entry: {show(u.get(1))} {show(u.get(2))} {show(u.get(3))}")

    t = ConcurrentLFUCache(2)
    t.put(1, 1)
    t.put(2, 2)
    t.put(3, 3)                                         # tie at frequency 1: the OLDEST key goes
    print(f"tie broken by age: {show(t.get(1))} {show(t.get(2))} {show(t.get(3))}")

    big = ConcurrentLFUCache(50)

    def hammer(seed: int) -> None:
        rng = random.Random(seed)
        for i in range(5000):
            k = rng.randrange(200)
            if rng.random() < 0.5:
                big.put(k, i)
            else:
                big.get(k)

    with ThreadPoolExecutor(max_workers=16) as pool:
        list(pool.map(hammer, range(16)))
    print(f"consistent after stress: {str(big.consistent()).lower()}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `class ConcurrentLFUCache {
  private readonly vals = new Map<number, number>();
  private readonly freq = new Map<number, number>();
  private readonly buckets = new Map<number, Set<number>>(); // a Set iterates in insertion order: oldest first
  private minFreq = 0;

  constructor(private readonly capacity: number) {}

  // Every method is synchronous, so the three structures always change together.
  get(key: number): number | null {
    if (!this.vals.has(key)) return null;
    this.touch(key);
    return this.vals.get(key) as number;
  }

  put(key: number, value: number): void {
    if (this.capacity <= 0) return;
    if (this.vals.has(key)) {
      this.vals.set(key, value);
      this.touch(key);
      return;
    }
    if (this.vals.size === this.capacity) {
      const bucket = this.buckets.get(this.minFreq) as Set<number>;
      const victim = bucket.values().next().value as number; // oldest key at the lowest frequency
      bucket.delete(victim);
      this.vals.delete(victim);
      this.freq.delete(victim);
    }
    this.vals.set(key, value);
    this.freq.set(key, 1);
    this.bucket(1).add(key);
    this.minFreq = 1;
  }

  private bucket(f: number): Set<number> {
    let b = this.buckets.get(f);
    if (!b) this.buckets.set(f, (b = new Set()));
    return b;
  }

  private touch(key: number): void {
    const f = this.freq.get(key) as number;
    const b = this.bucket(f);
    b.delete(key);
    if (b.size === 0 && f === this.minFreq) this.minFreq++;
    this.freq.set(key, f + 1);
    this.bucket(f + 1).add(key);
  }

  consistent(): boolean {
    let inBuckets = 0;
    for (const [f, keys] of this.buckets)
      for (const k of keys) {
        if (this.freq.get(k) !== f) return false;
        inBuckets++;
      }
    return inBuckets === this.vals.size && this.vals.size <= this.capacity;
  }
}

const show = (v: number | null): string => (v === null ? "null" : String(v));

async function main(): Promise<void> {
  const c = new ConcurrentLFUCache(2);
  c.put(1, 1);
  c.put(2, 2);
  c.get(1);
  c.put(3, 3);
  console.log(show(c.get(2)) + " " + show(c.get(3)));
  c.put(4, 4);
  console.log(show(c.get(1)) + " " + show(c.get(3)) + " " + show(c.get(4)));

  const zero = new ConcurrentLFUCache(0);
  zero.put(1, 1); // capacity 0 stores nothing
  console.log("capacity 0: " + show(zero.get(1)));

  const u = new ConcurrentLFUCache(2);
  u.put(1, 10);
  u.put(1, 11); // an update, not a second entry
  u.put(2, 20);
  u.put(3, 30); // key 1 has frequency 2, key 2 only 1 -> key 2 goes
  console.log("update keeps one entry: " + show(u.get(1)) + " " + show(u.get(2)) + " " + show(u.get(3)));

  const t = new ConcurrentLFUCache(2);
  t.put(1, 1);
  t.put(2, 2);
  t.put(3, 3); // tie at frequency 1: the OLDEST key goes
  console.log("tie broken by age: " + show(t.get(1)) + " " + show(t.get(2)) + " " + show(t.get(3)));

  const big = new ConcurrentLFUCache(50);
  const worker = async (): Promise<void> => {
    for (let i = 0; i < 20_000; i++) {
      if (i % 500 === 0) await Promise.resolve();
      const k = Math.floor(Math.random() * 200);
      if (Math.random() < 0.5) big.put(k, i);
      else big.get(k);
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker));
  console.log("consistent after stress: " + big.consistent());
}

main();` },
          { lang: 'cpp', code: `class ConcurrentLFUCache {
    int capacity_;
    unordered_map<int, int> vals_, freq_;
    unordered_map<int, list<int>> buckets_;                          // freq -> keys, oldest first
    unordered_map<int, list<int>::iterator> pos_;                    // key -> its place in its bucket
    int minFreq_ = 0;
    mutex mu_;

    void touch(int key) {                                            // caller holds the lock
        int f = freq_[key];
        auto& b = buckets_[f];
        b.erase(pos_[key]);
        if (b.empty() && f == minFreq_) minFreq_++;
        freq_[key] = f + 1;
        auto& nb = buckets_[f + 1];
        nb.push_back(key);
        pos_[key] = prev(nb.end());
    }

public:
    explicit ConcurrentLFUCache(int capacity) : capacity_(capacity) {}

    optional<int> get(int key) {
        lock_guard lk(mu_);
        if (!vals_.count(key)) return nullopt;
        touch(key);
        return vals_[key];
    }

    void put(int key, int value) {
        if (capacity_ <= 0) return;
        lock_guard lk(mu_);
        if (vals_.count(key)) { vals_[key] = value; touch(key); return; }
        if (static_cast<int>(vals_.size()) == capacity_) {
            auto& b = buckets_[minFreq_];
            int victim = b.front();                                  // oldest key at the lowest frequency
            b.pop_front();
            vals_.erase(victim); freq_.erase(victim); pos_.erase(victim);
        }
        vals_[key] = value;
        freq_[key] = 1;
        auto& b1 = buckets_[1];
        b1.push_back(key);
        pos_[key] = prev(b1.end());
        minFreq_ = 1;
    }

    bool consistent() {
        lock_guard lk(mu_);
        size_t inBuckets = 0;
        for (const auto& [f, keys] : buckets_)
            for (int k : keys) {
                if (freq_.at(k) != f) return false;
                inBuckets++;
            }
        return inBuckets == vals_.size() && static_cast<int>(vals_.size()) <= capacity_;
    }
};

string show(const optional<int>& v) { return v ? to_string(*v) : "null"; }

int main() {
    ConcurrentLFUCache c(2);
    c.put(1, 1); c.put(2, 2); c.get(1); c.put(3, 3);
    cout << show(c.get(2)) << " " << show(c.get(3)) << "\\n";
    c.put(4, 4);
    cout << show(c.get(1)) << " " << show(c.get(3)) << " " << show(c.get(4)) << "\\n";

    ConcurrentLFUCache zero(0);
    zero.put(1, 1);                                                  // capacity 0 stores nothing
    cout << "capacity 0: " << show(zero.get(1)) << "\\n";

    ConcurrentLFUCache u(2);
    u.put(1, 10); u.put(1, 11);                                      // an update, not a second entry
    u.put(2, 20); u.put(3, 30);                                      // key 1 has frequency 2, key 2 only 1 -> key 2 goes
    cout << "update keeps one entry: " << show(u.get(1)) << " " << show(u.get(2)) << " " << show(u.get(3)) << "\\n";

    ConcurrentLFUCache t(2);
    t.put(1, 1); t.put(2, 2); t.put(3, 3);                           // tie at frequency 1: the OLDEST key goes
    cout << "tie broken by age: " << show(t.get(1)) << " " << show(t.get(2)) << " " << show(t.get(3)) << "\\n";

    ConcurrentLFUCache big(50);
    {
        vector<jthread> pool;
        for (int th = 0; th < 16; th++)
            pool.emplace_back([&big, th] {
                mt19937 rng(th);
                for (int i = 0; i < 20000; i++) {
                    int k = rng() % 200;
                    if (rng() % 2) big.put(k, i); else big.get(k);
                }
            });
    }
    cout << "consistent after stress: " << boolalpha << big.consistent() << "\\n";
}` }
        ],
      complexity: `<p>O(1) per op; O(capacity) memory; one short critical section per op.</p>`,
      followUps: ['Add frequency aging (halve all counts every N ops) so old hot keys can leave.', 'Compare with W-TinyLFU (Caffeine): admission filter + sketch.']
    }
  });

  practice.push({
    title: 'Delayed Job Scheduler with Cancellation', level: 'Hard', tags: ['DelayQueue', 'producer-consumer', 'shutdown'], companies: ['Uber', 'Airbnb', 'Atlassian'],
    statement: `<p>Build <code>JobScheduler</code> with <code>long schedule(Runnable job, long delayMillis)</code> (returns a job id), <code>boolean cancel(long id)</code>, and <code>void shutdown()</code>. A fixed pool of worker threads runs each job <b>no earlier than</b> its due time. Many threads schedule and cancel concurrently. A cancelled job must never run (unless it already started). Shutdown must stop the workers promptly; jobs not yet due are dropped.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> pending jobs, 4 workers, delays from 0 ms to hours.</p>`,
    example: `<p>schedule(A, 50), schedule(B, 10), schedule(C, 30), cancel(C) → runs ${H.c('g', 'B then A')}; ${H.c('r', 'C never runs')}.</p>`,
    brute: { why: `<p>Brute A: one <code>new Thread(() -&gt; { sleep(delay); job.run(); })</code> per job — 10<sup>5</sup> sleeping platform threads, and cancel needs an interrupt race. Brute B: a <code>synchronized List</code> scanned by workers every 10 ms for due jobs — O(n) per scan, up to 10 ms late, burns CPU when idle. Brute C: cancellation via <code>list.remove(job)</code> while a worker has already taken it → the job runs anyway, or two workers run the same job.</p>`, code: { lang: 'java', code: `class ThreadPerJobScheduler {
    // BRUTE: one sleeping thread per job; 100k jobs = 100k threads
    void schedule(Runnable job, long delayMillis) {
        new Thread(() -> {
            try { Thread.sleep(delayMillis); job.run(); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }).start();
    }
}`, alt: [{ lang: 'python', code: "import threading, time\n\nclass ThreadPerJobScheduler:\n    # BRUTE: one sleeping thread per job; 100k jobs = 100k threads\n    def schedule(self, job, delay_millis):\n        def run():\n            time.sleep(delay_millis / 1000)\n            job()\n        threading.Thread(target=run).start()\n" }, { lang: 'ts', code: "import { Worker } from \"worker_threads\";\n\nclass ThreadPerJobScheduler {\n  // BRUTE: one sleeping worker thread per job; 100k jobs = 100k threads\n  schedule(job: () => void, delayMillis: number): void {\n    const w = new Worker(\n      \"const { parentPort, workerData } = require('worker_threads');\" +\n      \"Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, workerData); parentPort.postMessage('due');\",\n      { eval: true, workerData: delayMillis });\n    w.once(\"message\", () => { job(); w.terminate(); });\n  }\n}\n" }, { lang: 'cpp', code: "class ThreadPerJobScheduler {\npublic:\n    // BRUTE: one sleeping thread per job; 100k jobs = 100k threads\n    void schedule(function<void()> job, long long delayMillis) {\n        thread([job, delayMillis] {\n            this_thread::sleep_for(chrono::milliseconds(delayMillis));\n            job();\n        }).detach();\n    }\n};\n" }] } },
    mcq: { q: 'How do you make "cancel vs. start" race-free for a job?', options: ['Give each job an AtomicInteger state SCHEDULED → RUNNING/CANCELLED changed by CAS; only the winner of the CAS proceeds', 'Remove it from the queue and hope no worker took it', 'Mark a non-volatile boolean cancelled', 'Synchronize the whole scheduler'], answer: 0, explain: 'The worker CASes SCHEDULED→RUNNING before running; cancel CASes SCHEDULED→CANCELLED. Exactly one succeeds, so a job either runs or is cancelled, never both.' },
    hints: [`<p>Hint 1: A <code>DelayQueue</code> hands out an element only when its delay has expired — workers just <code>take()</code>.</p>`, `<p>Hint 2: Each job object carries an atomic state. Cancel = CAS to CANCELLED (and optionally remove from the queue to free memory).</p>`, `<p>Hint 3: Shutdown: set a flag and interrupt workers (take() throws InterruptedException); join them with a timeout.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "cancel C: true\ncancel C again: false\ncancel unknown: false\njob 4 failed: boom\nran: [B, A]\nschedule after shutdown rejected: scheduler is shut down\n" }] },
    solution: {
      approach: `<p>Jobs implement <code>Delayed</code> and sit in a <code>DelayQueue</code> (a priority heap ordered by due time, with leader-follower waiting so only one thread sleeps until the earliest deadline). Workers loop on <code>take()</code>, then CAS the job's state from SCHEDULED to RUNNING; <code>cancel</code> CASes SCHEDULED to CANCELLED. Exactly one wins. A concurrent map from id to job supports cancel by id. Shutdown interrupts workers.</p>
<p><b>In Python, TypeScript and C++.</b> Python keeps a <code>heapq</code> of jobs behind one <code>Condition</code> and sleeps with <code>wait(timeout)</code> until the earliest due time; cancelled jobs are skipped when they surface. C++ does the same with <code>priority_queue</code> and <code>condition_variable_any::wait_until</code>, and the state is an <code>atomic&lt;int&gt;</code> flipped with <code>compare_exchange_strong</code>. In TypeScript the event loop's timer queue is the delay queue and the single worker: <code>setTimeout</code> schedules, <code>clearTimeout</code> cancels.</p>`,
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
                try { j.task.run(); } catch (RuntimeException e) { System.out.println("job " + j.id + " failed: " + e.getMessage()); }
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
}

class JobSchedulerDemo {
    public static void main(String[] args) throws InterruptedException {
        JobScheduler s = new JobScheduler(2);
        s.start();
        List<String> ran = Collections.synchronizedList(new ArrayList<>());
        CountDownLatch twoDone = new CountDownLatch(2);
        s.schedule(() -> { ran.add("A"); twoDone.countDown(); }, 60);
        s.schedule(() -> { ran.add("B"); twoDone.countDown(); }, 10);
        long c = s.schedule(() -> ran.add("C"), 30);
        s.schedule(() -> { throw new IllegalStateException("boom"); }, 20);     // job 4 fails; the workers survive
        System.out.println("cancel C: " + s.cancel(c));                          // true
        System.out.println("cancel C again: " + s.cancel(c));                    // false: already cancelled
        System.out.println("cancel unknown: " + s.cancel(99));                   // false
        twoDone.await(2, TimeUnit.SECONDS);
        Thread.sleep(50);                          // give a wrongly-uncancelled C time to show up
        s.shutdown();
        System.out.println("ran: " + ran);         // [B, A]
        try { s.schedule(() -> { }, 1); }
        catch (IllegalStateException e) { System.out.println("schedule after shutdown rejected: " + e.getMessage()); }
    }
}`, alt: [
          { lang: 'python', code: `import enum
import heapq
import itertools
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field


class State(enum.Enum):
    SCHEDULED = 0
    RUNNING = 1
    CANCELLED = 2


@dataclass(order=True)
class Job:
    due: float
    id: int
    task: Callable[[], object] = field(compare=False)
    state: State = field(default=State.SCHEDULED, compare=False)


class JobScheduler:
    def __init__(self, n_workers: int) -> None:
        self._heap: list[Job] = []                  # min-heap ordered by due time
        self._jobs: dict[int, Job] = {}
        self._cv = threading.Condition()            # one lock + "something changed" signal
        self._ids = itertools.count(1)
        self._shut = False
        self._workers = [threading.Thread(target=self._work_loop, name=f"worker-{i}") for i in range(n_workers)]

    def start(self) -> None:
        for w in self._workers:
            w.start()

    def schedule(self, task: Callable[[], object], delay_millis: int) -> int:
        with self._cv:
            if self._shut:
                raise RuntimeError("scheduler is shut down")
            job = Job(time.monotonic() + delay_millis / 1000, next(self._ids), task)
            self._jobs[job.id] = job
            heapq.heappush(self._heap, job)
            self._cv.notify_all()                   # the new job may be due before the one workers sleep on
            return job.id

    def cancel(self, job_id: int) -> bool:
        with self._cv:
            job = self._jobs.get(job_id)
            if job is None or job.state is not State.SCHEDULED:
                return False                        # too late or unknown
            job.state = State.CANCELLED             # workers skip it when it surfaces
            del self._jobs[job_id]
            return True

    def _next_job(self) -> Job | None:
        with self._cv:
            while not self._shut:
                if not self._heap:
                    self._cv.wait()
                    continue
                wait = self._heap[0].due - time.monotonic()
                if wait > 0:
                    self._cv.wait(wait)             # sleeps until due, a new job, or shutdown
                    continue
                job = heapq.heappop(self._heap)
                if job.state is not State.SCHEDULED:
                    continue                        # was cancelled
                job.state = State.RUNNING
                del self._jobs[job.id]
                return job
            return None

    def _work_loop(self) -> None:
        while (job := self._next_job()) is not None:
            try:
                job.task()                          # runs with NO lock held
            except Exception as e:
                print(f"job {job.id} failed: {e}")

    def shutdown(self) -> None:
        with self._cv:
            self._shut = True
            self._cv.notify_all()
        for w in self._workers:
            w.join(2)


def main() -> None:
    s = JobScheduler(2)
    s.start()
    ran: list[str] = []
    two_done = threading.Semaphore(0)

    def run(name: str) -> Callable[[], None]:
        def job() -> None:
            ran.append(name)
            two_done.release()
        return job

    def boom() -> None:
        raise RuntimeError("boom")

    s.schedule(run("A"), 60)
    s.schedule(run("B"), 10)
    c = s.schedule(lambda: ran.append("C"), 30)
    s.schedule(boom, 20)                            # job 4 fails; the workers survive
    print(f"cancel C: {str(s.cancel(c)).lower()}")
    print(f"cancel C again: {str(s.cancel(c)).lower()}")
    print(f"cancel unknown: {str(s.cancel(99)).lower()}")
    two_done.acquire(timeout=2)
    two_done.acquire(timeout=2)
    time.sleep(0.05)                                # give a wrongly-uncancelled C time to show up
    s.shutdown()
    print("ran: [" + ", ".join(ran) + "]")
    try:
        s.schedule(lambda: None, 1)
    except RuntimeError as e:
        print(f"schedule after shutdown rejected: {e}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `enum State {
  Scheduled,
  Running,
  Cancelled,
}

interface Job {
  state: State;
  timer: ReturnType<typeof setTimeout>;
}

// The event loop's timer queue plays the part of the DelayQueue AND of the worker threads:
// one thread, so a task never runs in parallel with another.
class JobScheduler {
  private readonly jobs = new Map<number, Job>();
  private lastId = 0;
  private shut = false;

  schedule(task: () => unknown, delayMillis: number): number {
    if (this.shut) throw new Error("scheduler is shut down");
    const id = ++this.lastId;
    const job: Job = {
      state: State.Scheduled,
      timer: setTimeout(() => {
        if (job.state !== State.Scheduled) return; // was cancelled
        job.state = State.Running;
        this.jobs.delete(id);
        try {
          task();
        } catch (e) {
          console.log("job " + id + " failed: " + (e as Error).message); // the loop survives
        }
      }, delayMillis),
    };
    this.jobs.set(id, job);
    return id;
  }

  cancel(id: number): boolean {
    const job = this.jobs.get(id);
    if (!job || job.state !== State.Scheduled) return false; // too late or unknown
    job.state = State.Cancelled;
    clearTimeout(job.timer);
    this.jobs.delete(id);
    return true;
  }

  shutdown(): void {
    this.shut = true;
    for (const job of this.jobs.values()) clearTimeout(job.timer);
    this.jobs.clear();
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const s = new JobScheduler();
  const ran: string[] = [];
  let remaining = 2;
  let finished!: () => void;
  const twoDone = new Promise<void>((resolve) => (finished = resolve));
  const done = (name: string) => (): void => {
    ran.push(name);
    if (--remaining === 0) finished();
  };

  s.schedule(done("A"), 60);
  s.schedule(done("B"), 10);
  const c = s.schedule(() => ran.push("C"), 30);
  s.schedule(() => {
    throw new Error("boom"); // job 4 fails; the loop survives
  }, 20);
  console.log("cancel C: " + s.cancel(c));
  console.log("cancel C again: " + s.cancel(c));
  console.log("cancel unknown: " + s.cancel(99));
  await Promise.race([twoDone, sleep(2000)]);
  await sleep(50); // give a wrongly-uncancelled C time to show up
  s.shutdown();
  console.log("ran: [" + ran.join(", ") + "]");
  try {
    s.schedule(() => undefined, 1);
  } catch (e) {
    console.log("schedule after shutdown rejected: " + (e as Error).message);
  }
}

main();` },
          { lang: 'cpp', code: `class JobScheduler {
    enum State { SCHEDULED, RUNNING, CANCELLED };
    using Clock = chrono::steady_clock;

    struct Job {
        long long id;
        Clock::time_point due;
        function<void()> task;
        atomic<int> state{SCHEDULED};
    };
    struct Later {                                       // makes priority_queue a min-heap on due time
        bool operator()(const shared_ptr<Job>& a, const shared_ptr<Job>& b) const { return a->due > b->due; }
    };

    priority_queue<shared_ptr<Job>, vector<shared_ptr<Job>>, Later> heap_;
    unordered_map<long long, shared_ptr<Job>> jobs_;
    mutex mu_;
    condition_variable_any cv_;
    long long lastId_ = 0;
    atomic<bool> shut_{false};
    vector<jthread> workers_;
    int nWorkers_;

    void workLoop(stop_token st) {
        unique_lock lk(mu_);
        while (!st.stop_requested()) {
            if (heap_.empty()) { cv_.wait(lk, st, [&] { return !heap_.empty(); }); continue; }
            shared_ptr<Job> job = heap_.top();
            if (job->due > Clock::now()) {                // sleep until due, a new job, or shutdown
                cv_.wait_until(lk, st, job->due, [] { return false; });
                continue;
            }
            heap_.pop();
            int expected = SCHEDULED;
            if (!job->state.compare_exchange_strong(expected, RUNNING)) continue;   // was cancelled
            jobs_.erase(job->id);
            lk.unlock();
            try { job->task(); }                          // runs with NO lock held
            catch (const exception& e) { cout << "job " << job->id << " failed: " << e.what() << "\\n"; }
            lk.lock();
        }
    }

public:
    explicit JobScheduler(int nWorkers) : nWorkers_(nWorkers) {}
    ~JobScheduler() { shutdown(); }

    void start() {
        for (int i = 0; i < nWorkers_; i++) workers_.emplace_back([this](stop_token st) { workLoop(st); });
    }

    long long schedule(function<void()> task, long long delayMillis) {
        if (shut_) throw runtime_error("scheduler is shut down");
        lock_guard lk(mu_);
        auto job = make_shared<Job>();
        job->id = ++lastId_;
        job->due = Clock::now() + chrono::milliseconds(delayMillis);
        job->task = std::move(task);
        jobs_[job->id] = job;
        heap_.push(job);
        cv_.notify_all();                                 // the new job may be due before the one workers sleep on
        return job->id;
    }

    bool cancel(long long id) {
        lock_guard lk(mu_);
        auto it = jobs_.find(id);
        if (it == jobs_.end()) return false;
        int expected = SCHEDULED;
        if (!it->second->state.compare_exchange_strong(expected, CANCELLED)) return false;   // too late
        jobs_.erase(it);                                  // the heap entry is skipped when it surfaces
        return true;
    }

    void shutdown() {
        shut_ = true;
        for (auto& w : workers_) w.request_stop();
        for (auto& w : workers_) if (w.joinable()) w.join();
        workers_.clear();
    }
};

int main() {
    JobScheduler s(2);
    s.start();
    vector<string> ran;
    mutex ranMu;
    counting_semaphore<8> twoDone{0};
    auto add = [&](const string& name) { lock_guard lk(ranMu); ran.push_back(name); };

    s.schedule([&] { add("A"); twoDone.release(); }, 60);
    s.schedule([&] { add("B"); twoDone.release(); }, 10);
    long long c = s.schedule([&] { add("C"); }, 30);
    s.schedule([] { throw runtime_error("boom"); }, 20);   // job 4 fails; the workers survive
    cout << boolalpha;
    cout << "cancel C: " << s.cancel(c) << "\\n";
    cout << "cancel C again: " << s.cancel(c) << "\\n";
    cout << "cancel unknown: " << s.cancel(99) << "\\n";
    twoDone.try_acquire_for(2s);
    twoDone.try_acquire_for(2s);
    this_thread::sleep_for(50ms);                          // give a wrongly-uncancelled C time to show up
    s.shutdown();
    cout << "ran: [";
    for (size_t i = 0; i < ran.size(); i++) cout << (i ? ", " : "") << ran[i];
    cout << "]\\n";
    try { s.schedule([] {}, 1); }
    catch (const runtime_error& e) { cout << "schedule after shutdown rejected: " << e.what() << "\\n"; }
}` }
        ],
      complexity: `<p>schedule O(log n), cancel O(n) for <code>queue.remove</code> (or O(1) if you skip removal and let workers discard), take O(log n). Idle workers use no CPU.</p>`,
      followUps: ['Recurring jobs (reschedule after run with the next due time).', 'Persist jobs so a restart does not lose them (outbox table + poller).', 'Compare with ScheduledThreadPoolExecutor and its setRemoveOnCancelPolicy.']
    }
  });

  practice.push({
    title: 'Two-Stage Pipeline with Graceful Shutdown', level: 'Hard', tags: ['producer-consumer', 'poison pill', 'backpressure'], companies: ['Databricks', 'Confluent', 'Bloomberg'],
    statement: `<p>Build a pipeline: a <b>reader</b> thread emits N log lines → <b>stage 1</b> (3 parser threads) parses each line into a record → <b>stage 2</b> (2 writer threads) "writes" records (adds them to a sink). Stages are connected by <b>bounded</b> queues. When the reader finishes, the pipeline must drain completely (every line written exactly once) and <b>all threads must exit</b> — no hangs, no lost items, no sleeps-as-synchronization.</p>`,
    constraints: `<p>N up to 10<sup>6</sup>; queue capacity 100; the number of threads per stage is configurable.</p>`,
    example: `<p>N = 1000 → sink contains ${H.c('g', '1000 records')}, all 6 threads have terminated, <code>run()</code> returns.</p>`,
    brute: { why: `<p>Brute A: unbounded queues + <code>Thread.sleep(1000)</code> then exit — loses items if processing is slow and wastes time when fast. Brute B: reader puts <b>one</b> poison pill into stage 1's queue — one parser exits, the other two block on <code>take()</code> forever; or every parser forwards a pill to stage 2 immediately, so writers stop while other parsers are still producing records → lost records.</p>`, code: { lang: 'java', code: `class PipelineBrute {
    static final String POISON = "EOF";
    // BRUTE: only ONE pill for THREE parsers => two parsers block on take() forever; JVM never exits
    static void readerPutsOnePill(BlockingQueue<String> lines, int n) throws InterruptedException {
        for (int i = 0; i < n; i++) lines.put("line-" + i);
        lines.put(POISON);
    }
}`, alt: [{ lang: 'python', code: "class PipelineBrute:\n    POISON = \"EOF\"\n\n    # BRUTE: only ONE pill for THREE parsers => two parsers block on get() forever; the process never exits\n    @staticmethod\n    def reader_puts_one_pill(lines, n):\n        for i in range(n): lines.put(f\"line-{i}\")\n        lines.put(PipelineBrute.POISON)\n" }, { lang: 'ts', code: "class PipelineBrute {\n  static readonly POISON = \"EOF\";\n  // BRUTE: only ONE pill for THREE parsers => two parsers await take() forever; the process never exits\n  static async readerPutsOnePill(lines: { put(x: string): Promise<void> }, n: number): Promise<void> {\n    for (let i = 0; i < n; i++) await lines.put(\"line-\" + i);\n    await lines.put(PipelineBrute.POISON);\n  }\n}\n" }, { lang: 'cpp', code: "struct PipelineBrute {\n    static constexpr const char* POISON = \"EOF\";\n    // BRUTE: only ONE pill for THREE parsers => two parsers block on pop() forever; the process never exits\n    template <class Queue>\n    static void readerPutsOnePill(Queue& lines, int n) {\n        for (int i = 0; i < n; i++) lines.push(\"line-\" + to_string(i));\n        lines.push(POISON);\n    }\n};\n" }] } },
    mcq: { q: 'When is it safe to send poison pills to stage 2?', options: ['Only after ALL stage-1 threads have finished (e.g. the last parser to exit sends one pill per writer)', 'As soon as the first parser sees a pill', 'Immediately after the reader finishes', 'Never — writers should be interrupted'], answer: 0, explain: 'Stage 2 must not stop while any parser may still emit records. A countdown of live parsers lets the last one out forward the pills.' },
    hints: [`<p>Hint 1: Each stage needs one pill per thread in that stage, and pills must follow all real items.</p>`, `<p>Hint 2: Track live parsers with an <code>AtomicInteger</code> (or a <code>CountDownLatch</code> plus a coordinator).</p>`, `<p>Hint 3: The parser that decrements the live count to 0 puts W pills into the writer queue. join() everything with timeouts; use bounded <code>ArrayBlockingQueue</code>s for backpressure.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "records=10000 distinct=10000 all threads exited\nmessy input: kept=2 dropped=3 all threads exited\nempty input: records=0 all threads exited\n" }] },
    solution: {
      approach: `<p>Bounded queues give backpressure. Shutdown cascades stage by stage: the reader puts <b>P</b> pills (one per parser). Each parser exits on its pill and decrements a live-parser counter; the <b>last</b> parser to exit puts <b>W</b> pills into stage 2 (one per writer). Every real item precedes every pill in FIFO order, so nothing is lost, and every thread consumes exactly one pill, so everyone exits.</p>
<p><b>In Python, TypeScript and C++.</b> The pill logic is identical: one pill per consumer, and the last parser to exit forwards one pill per writer. Python uses <code>queue.Queue(maxsize=100)</code>, C++ a small bounded queue of <code>optional</code> values (<code>nullopt</code> is the pill), and TypeScript a bounded async queue; <code>Promise.all</code> on every stage resolves only when all of them have exited. A malformed line is dropped in every language so one bad record cannot leave the writers waiting forever.</p>`,
      code: `class TwoStagePipeline {
    record Rec(int id, String text) {}
    static final String LINE_PILL = new String("EOF");        // unique identity
    static final Rec REC_PILL = new Rec(-1, "EOF");

    static List<Rec> run(int n, int parsers, int writers) throws InterruptedException {
        List<String> input = new ArrayList<>();
        for (int i = 0; i < n; i++) input.add("line-" + i);
        return run(input, parsers, writers);
    }

    static List<Rec> run(List<String> input, int parsers, int writers) throws InterruptedException {
        BlockingQueue<String> lines = new ArrayBlockingQueue<>(100);
        BlockingQueue<Rec> recs = new ArrayBlockingQueue<>(100);
        List<Rec> sink = Collections.synchronizedList(new ArrayList<>());
        AtomicInteger liveParsers = new AtomicInteger(parsers);
        List<Thread> all = new ArrayList<>();

        all.add(new Thread(() -> {                                   // reader
            try {
                for (String line : input) lines.put(line);
                for (int p = 0; p < parsers; p++) lines.put(LINE_PILL);   // one pill per parser
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }, "reader"));

        for (int p = 0; p < parsers; p++) all.add(new Thread(() -> {   // stage 1
            try {
                while (true) {
                    String line = lines.take();
                    if (line == LINE_PILL) break;
                    Rec rec;
                    try { rec = new Rec(Integer.parseInt(line.substring(5)), line.toUpperCase()); }
                    catch (RuntimeException bad) { continue; }          // malformed line: drop it, keep the thread alive
                    recs.put(rec);
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
}

class PipelineDemo {
    public static void main(String[] args) throws InterruptedException {
        List<TwoStagePipeline.Rec> out = TwoStagePipeline.run(10_000, 3, 2);
        long distinct = out.stream().mapToInt(TwoStagePipeline.Rec::id).distinct().count();
        System.out.println("records=" + out.size() + " distinct=" + distinct + " all threads exited");

        List<String> messy = List.of("line-1", "garbage", "line-x", "line-7", "");
        List<TwoStagePipeline.Rec> good = TwoStagePipeline.run(messy, 3, 2);
        System.out.println("messy input: kept=" + good.size() + " dropped=" + (messy.size() - good.size()) + " all threads exited");
        System.out.println("empty input: records=" + TwoStagePipeline.run(0, 3, 2).size() + " all threads exited");
    }
}`, alt: [
          { lang: 'python', code: `import queue
import threading
from typing import NamedTuple

LINE_PILL = object()                              # unique identity: no real line can equal it


class Rec(NamedTuple):
    id: int
    text: str


REC_PILL = Rec(-1, "EOF")


class TwoStagePipeline:
    @staticmethod
    def run(source: int | list[str], parsers: int, writers: int) -> list[Rec]:
        input_lines = [f"line-{i}" for i in range(source)] if isinstance(source, int) else source
        lines: queue.Queue[object] = queue.Queue(maxsize=100)   # bounded: put() blocks = backpressure
        recs: queue.Queue[Rec] = queue.Queue(maxsize=100)
        sink: list[Rec] = []
        sink_lock = threading.Lock()
        live = [parsers]
        live_lock = threading.Lock()

        def reader() -> None:
            for line in input_lines:
                lines.put(line)
            for _ in range(parsers):
                lines.put(LINE_PILL)               # one pill per parser

        def parser() -> None:
            while (line := lines.get()) is not LINE_PILL:
                try:
                    rec = Rec(int(line[5:]), line.upper())  # type: ignore[index, union-attr]
                except ValueError:
                    continue                       # malformed line: drop it, keep the thread alive
                recs.put(rec)
            with live_lock:
                live[0] -= 1
                last = live[0] == 0                # LAST parser out
            if last:
                for _ in range(writers):
                    recs.put(REC_PILL)

        def writer() -> None:
            while (rec := recs.get()) is not REC_PILL:
                with sink_lock:
                    sink.append(rec)

        threads = [threading.Thread(target=reader, name="reader")]
        threads += [threading.Thread(target=parser, name=f"parser-{p}") for p in range(parsers)]
        threads += [threading.Thread(target=writer, name=f"writer-{w}") for w in range(writers)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(10)
        alive = sum(t.is_alive() for t in threads)
        if alive:
            raise RuntimeError(f"{alive} threads still alive")
        return sink


def main() -> None:
    out = TwoStagePipeline.run(10_000, 3, 2)
    print(f"records={len(out)} distinct={len({r.id for r in out})} all threads exited")

    messy = ["line-1", "garbage", "line-x", "line-7", ""]
    good = TwoStagePipeline.run(messy, 3, 2)
    print(f"messy input: kept={len(good)} dropped={len(messy) - len(good)} all threads exited")
    print(f"empty input: records={len(TwoStagePipeline.run(0, 3, 2))} all threads exited")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `// A bounded async queue: put() waits while full (backpressure), take() waits while empty.
class AsyncQueue<T> {
  private readonly items: T[] = [];
  private readonly notFull: Array<() => void> = [];
  private readonly notEmpty: Array<() => void> = [];

  constructor(private readonly capacity: number) {}

  async put(x: T): Promise<void> {
    while (this.items.length >= this.capacity) await new Promise<void>((r) => this.notFull.push(r));
    this.items.push(x);
    this.notEmpty.shift()?.();
  }

  async take(): Promise<T> {
    while (this.items.length === 0) await new Promise<void>((r) => this.notEmpty.push(r));
    const x = this.items.shift() as T;
    this.notFull.shift()?.();
    return x;
  }
}

interface Rec {
  readonly id: number;
  readonly text: string;
}

const LINE_PILL = Symbol("EOF"); // unique identity: no real line can equal it
const REC_PILL: Rec = { id: -1, text: "EOF" };

class TwoStagePipeline {
  static async run(source: number | string[], parsers: number, writers: number): Promise<Rec[]> {
    const input = typeof source === "number" ? Array.from({ length: source }, (_, i) => "line-" + i) : source;
    const lines = new AsyncQueue<string | symbol>(100);
    const recs = new AsyncQueue<Rec>(100);
    const sink: Rec[] = [];
    let liveParsers = parsers;

    const reader = async (): Promise<void> => {
      for (const line of input) await lines.put(line);
      for (let p = 0; p < parsers; p++) await lines.put(LINE_PILL); // one pill per parser
    };

    const parser = async (): Promise<void> => {
      for (let line = await lines.take(); line !== LINE_PILL; line = await lines.take()) {
        const text = line as string;
        const id = Number(text.slice(5));
        if (text.length <= 5 || !Number.isInteger(id)) continue; // malformed line: drop it, keep the task alive
        await recs.put({ id, text: text.toUpperCase() });
      }
      if (--liveParsers === 0) for (let w = 0; w < writers; w++) await recs.put(REC_PILL); // LAST parser out
    };

    const writer = async (): Promise<void> => {
      for (let r = await recs.take(); r !== REC_PILL; r = await recs.take()) sink.push(r);
    };

    const tasks = [reader()];
    for (let p = 0; p < parsers; p++) tasks.push(parser());
    for (let w = 0; w < writers; w++) tasks.push(writer());
    await Promise.all(tasks); // resolves only when every stage has drained and exited
    return sink;
  }
}

async function main(): Promise<void> {
  const out = await TwoStagePipeline.run(10_000, 3, 2);
  console.log("records=" + out.length + " distinct=" + new Set(out.map((r) => r.id)).size + " all threads exited");

  const messy = ["line-1", "garbage", "line-x", "line-7", ""];
  const good = await TwoStagePipeline.run(messy, 3, 2);
  console.log("messy input: kept=" + good.length + " dropped=" + (messy.length - good.length) + " all threads exited");
  console.log("empty input: records=" + (await TwoStagePipeline.run(0, 3, 2)).length + " all threads exited");
}

main();` },
          { lang: 'cpp', code: `// Bounded blocking queue; std::nullopt is the poison pill.
template <class T>
class BlockingQueue {
    deque<optional<T>> items_;
    size_t capacity_;
    mutex mu_;
    condition_variable notFull_, notEmpty_;

public:
    explicit BlockingQueue(size_t capacity) : capacity_(capacity) {}

    void put(optional<T> x) {
        unique_lock lk(mu_);
        notFull_.wait(lk, [&] { return items_.size() < capacity_; });
        items_.push_back(std::move(x));
        notEmpty_.notify_one();
    }

    optional<T> take() {
        unique_lock lk(mu_);
        notEmpty_.wait(lk, [&] { return !items_.empty(); });
        optional<T> x = std::move(items_.front());
        items_.pop_front();
        notFull_.notify_one();
        return x;
    }
};

struct Rec {
    int id;
    string text;
};

class TwoStagePipeline {
public:
    static vector<Rec> run(int n, int parsers, int writers) {
        vector<string> input;
        for (int i = 0; i < n; i++) input.push_back("line-" + to_string(i));
        return run(input, parsers, writers);
    }

    static vector<Rec> run(const vector<string>& input, int parsers, int writers) {
        BlockingQueue<string> lines(100);                // bounded: put() blocks = backpressure
        BlockingQueue<Rec> recs(100);
        vector<Rec> sink;
        mutex sinkMu;
        atomic<int> liveParsers{parsers};
        {
            vector<jthread> all;                          // joined when this scope ends
            all.emplace_back([&] {                        // reader
                for (const auto& line : input) lines.put(line);
                for (int p = 0; p < parsers; p++) lines.put(nullopt);   // one pill per parser
            });
            for (int p = 0; p < parsers; p++)
                all.emplace_back([&] {                    // stage 1
                    while (auto line = lines.take()) {
                        try {
                            size_t used = 0;
                            string digits = line->size() > 5 ? line->substr(5) : "";
                            int id = stoi(digits, &used);
                            if (used != digits.size()) continue;
                            string up = *line;
                            for (char& c : up) c = static_cast<char>(toupper(c));
                            recs.put(Rec{id, up});
                        } catch (const logic_error&) {
                            continue;                     // malformed line: drop it, keep the thread alive
                        }
                    }
                    if (--liveParsers == 0)               // LAST parser out
                        for (int w = 0; w < writers; w++) recs.put(nullopt);
                });
            for (int w = 0; w < writers; w++)
                all.emplace_back([&] {                    // stage 2
                    while (auto r = recs.take()) {
                        lock_guard lk(sinkMu);
                        sink.push_back(std::move(*r));
                    }
                });
        }
        return sink;
    }
};

int main() {
    auto out = TwoStagePipeline::run(10000, 3, 2);
    set<int> ids;
    for (const auto& r : out) ids.insert(r.id);
    cout << "records=" << out.size() << " distinct=" << ids.size() << " all threads exited\\n";

    vector<string> messy = {"line-1", "garbage", "line-x", "line-7", ""};
    auto good = TwoStagePipeline::run(messy, 3, 2);
    cout << "messy input: kept=" << good.size() << " dropped=" << messy.size() - good.size() << " all threads exited\\n";
    cout << "empty input: records=" << TwoStagePipeline::run(0, 3, 2).size() << " all threads exited\\n";
}` }
        ],
      complexity: `<p>O(N) total work; memory bounded by queue capacities (≈200 items in flight).</p>`,
      followUps: ['A parser throws on a bad line: route it to a dead-letter queue instead of killing the thread.', 'Preserve input order in the sink with sequence numbers and a reorder buffer.', 'Rewrite with virtual threads or CompletableFuture stages.']
    }
  });

  practice.push({
    title: 'Hierarchical Rate Limiter: Per-User AND Global', level: 'Hard', tags: ['rate limiter', 'token bucket', 'atomic multi-resource', 'refund'], companies: ['OpenAI', 'Anthropic', 'Stripe', 'Cloudflare'],
    statement: `<p>An AI gateway must enforce <b>two</b> limits on every call: each user ≤ <b>U</b> requests/sec (burst U), and the whole gateway ≤ <b>G</b> requests/sec (burst G) to protect the upstream model provider. Implement <code>boolean allow(String user)</code>. A request is admitted only if <b>both</b> limits have capacity, and a rejected request must not consume <b>either</b> limit. Thread-safe, no global lock across all users.</p>`,
    constraints: `<p>10<sup>5</sup> users, 64 threads, G much smaller than the sum of all users' U.</p>`,
    example: `<p>U = 2, G = 3 (frozen time). asha, asha, asha, bala, chen → ${H.c('g', 'Y Y')} ${H.c('r', 'N')} (asha's bucket empty) ${H.c('g', 'Y')} (bala; global now 0) ${H.c('r', 'N')} (chen: user ok, but global empty — and chen's token is refunded, so chen still has 2).</p>`,
    brute: { why: `<p>Brute A: check user bucket, then global bucket, decrementing each as you go — a request that passes the user check but fails global has <b>already burned</b> a user token (users get punished for global overload). Brute B: lock user bucket then global bucket for every request — correct, but the global bucket lock is held while acquiring user locks (lock nesting + a hot global lock). Brute C: one synchronized <code>allow</code> — every request in the gateway serializes.</p>`, code: { lang: 'java', code: `class LeakyHierarchyBrute {
    private final Map<String, Integer> userTokens = new ConcurrentHashMap<>();
    private final AtomicInteger globalTokens = new AtomicInteger(3);
    // BRUTE: takes the user token, then fails on global => the user token is lost; also check-then-act races
    boolean allow(String user) {
        int u = userTokens.getOrDefault(user, 2);
        if (u == 0) return false;
        userTokens.put(user, u - 1);                 // consumed even if global rejects below
        return globalTokens.getAndDecrement() > 0;   // can also drive the counter negative
    }
}`, alt: [{ lang: 'python', code: "import threading\n\nclass LeakyHierarchyBrute:\n    def __init__(self):\n        self.user_tokens = {}\n        self.global_tokens = 3\n\n    # BRUTE: takes the user token, then fails on global => the user token is lost; also check-then-act races\n    def allow(self, user):\n        u = self.user_tokens.get(user, 2)\n        if u == 0: return False\n        self.user_tokens[user] = u - 1                 # consumed even if global rejects below\n        self.global_tokens -= 1                        # can also drive the counter negative\n        return self.global_tokens + 1 > 0\n" }, { lang: 'ts', code: "class LeakyHierarchyBrute {\n  private userTokens = new Map<string, number>();\n  private globalTokens = 3;\n  // BRUTE: takes the user token, then fails on global => the user token is lost; also check-then-act races\n  allow(user: string): boolean {\n    const u = this.userTokens.get(user) ?? 2;\n    if (u === 0) return false;\n    this.userTokens.set(user, u - 1);                  // consumed even if global rejects below\n    return this.globalTokens-- > 0;                    // can also drive the counter negative\n  }\n}\n" }, { lang: 'cpp', code: "class LeakyHierarchyBrute {\n    unordered_map<string, int> userTokens;\n    mutex m;                                           // guards the map only, not the check-then-act\n    atomic<int> globalTokens{3};\n    int getUser(const string& u) { lock_guard<mutex> g(m); auto it = userTokens.find(u); return it == userTokens.end() ? 2 : it->second; }\n    void putUser(const string& u, int v) { lock_guard<mutex> g(m); userTokens[u] = v; }\npublic:\n    // BRUTE: takes the user token, then fails on global => the user token is lost; also check-then-act races\n    bool allow(const string& user) {\n        int u = getUser(user);\n        if (u == 0) return false;\n        putUser(user, u - 1);                          // consumed even if global rejects below\n        return globalTokens.fetch_sub(1) > 0;          // can also drive the counter negative\n    }\n};\n" }] } },
    mcq: { q: 'Which ordering keeps "rejected requests consume nothing" without holding two locks at once?', options: ['Take from the user bucket; then try the global bucket; if global fails, refund the user token', 'Take global first and never refund', 'Hold the global lock while checking every user bucket', 'Check both without taking, then take both without checking'], answer: 0, explain: 'Acquire-then-compensate: each bucket operation is individually atomic; on partial failure, undo the part that succeeded. Refund must cap at capacity. The tiny window where the user token is "borrowed" is harmless.' },
    hints: [`<p>Hint 1: Treat each bucket as an independent atomic object with <code>tryAcquire()</code> and <code>refund()</code>.</p>`, `<p>Hint 2: Order: the narrow, low-contention bucket first (user), the hot shared bucket second (global). On global failure, refund the user.</p>`, `<p>Hint 3: Make the global bucket lock-free (CAS on an immutable state) since every request touches it; refund = add a token back, capped at capacity.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "YYNYN chenTokens=2.00\nrefill: YNY\nadmitted=50 (global cap 50)\n" }] },
    solution: {
      approach: `<p>Two levels of token buckets, each individually atomic. Per-user buckets live in a <code>ConcurrentHashMap</code> (contention only within a user). The single global bucket uses a CAS loop on an immutable state record (no lock convoy). <code>allow</code> does <b>acquire-then-compensate</b>: take a user token; try the global; if global fails, refund the user token. Never holds two locks, never leaks capacity on rejection. Refunds are capped at capacity.</p>
<p><b>In Python, TypeScript and C++.</b> Each bucket is atomic on its own. Java and C++ use a compare-and-swap loop on an immutable state (<code>atomic&lt;shared_ptr&lt;const State&gt;&gt;</code> in C++20); Python uses a small lock per bucket because it has no hardware CAS; TypeScript needs nothing because refill-then-change is synchronous. The order is the same everywhere: take the narrow user token first, then the shared global token, and refund the user token if the global one is missing.</p>`,
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
}

class HierarchicalLimiterDemo {
    public static void main(String[] args) throws InterruptedException {
        HierarchicalLimiter h = new HierarchicalLimiter(2, 2, 3, 3, () -> 0L);   // frozen clock
        StringBuilder sb = new StringBuilder();
        for (String u : List.of("asha", "asha", "asha", "bala", "chen")) sb.append(h.allow(u) ? "Y" : "N");
        System.out.println(sb + " chenTokens=" + String.format("%.2f", h.userTokens("chen")));   // YYNYN chenTokens=2.00

        AtomicLong now = new AtomicLong();
        HierarchicalLimiter h3 = new HierarchicalLimiter(1, 1, 1, 1, now::get);
        String refill = (h3.allow("a") ? "Y" : "N") + (h3.allow("b") ? "Y" : "N");           // global bucket is empty for b
        now.set(1_000_000_000L);                                                              // one second later it has refilled
        refill += h3.allow("b") ? "Y" : "N";
        System.out.println("refill: " + refill);                                              // YNY

        HierarchicalLimiter h2 = new HierarchicalLimiter(5, 5, 50, 50, () -> 0L);
        AtomicInteger ok = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(32);
        for (int i = 0; i < 2000; i++) { String u = "u" + (i % 40); pool.execute(() -> { if (h2.allow(u)) ok.incrementAndGet(); }); }
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("admitted=" + ok.get() + " (global cap 50)");          // 50
    }
}`, alt: [
          { lang: 'python', code: `import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor


class Bucket:
    def __init__(self, cap: float, per_sec: float, clock: Callable[[], int]) -> None:
        self._cap = cap
        self._per_nano = per_sec / 1e9
        self._clock = clock
        self._tokens = cap
        self._last = clock()
        self._lock = threading.Lock()

    def _refill(self) -> None:                      # caller holds the lock
        now = max(self._clock(), self._last)
        self._tokens = min(self._cap, self._tokens + (now - self._last) * self._per_nano)
        self._last = now

    def try_acquire(self) -> bool:
        with self._lock:
            self._refill()
            if self._tokens < 1:
                return False
            self._tokens -= 1
            return True

    def refund(self) -> None:
        with self._lock:
            self._refill()
            self._tokens = min(self._cap, self._tokens + 1)

    def tokens(self) -> float:
        with self._lock:
            self._refill()
            return self._tokens


class HierarchicalLimiter:
    def __init__(self, user_cap: float, user_rate: float, global_cap: float, global_rate: float,
                 clock: Callable[[], int]) -> None:
        self._users: dict[str, Bucket] = {}
        self._users_lock = threading.Lock()         # guards only the dict
        self._user_cap, self._user_rate, self._clock = user_cap, user_rate, clock
        self._global = Bucket(global_cap, global_rate, clock)

    def _user(self, user: str) -> Bucket:
        with self._users_lock:
            b = self._users.get(user)
            if b is None:
                b = self._users[user] = Bucket(self._user_cap, self._user_rate, self._clock)
            return b

    def allow(self, user: str) -> bool:
        u = self._user(user)
        if not u.try_acquire():
            return False                            # user over limit: nothing consumed
        if self._global.try_acquire():
            return True                             # both OK
        u.refund()                                  # global full: give the user token back
        return False

    def user_tokens(self, user: str) -> float:
        with self._users_lock:
            b = self._users.get(user)
        return self._user_cap if b is None else b.tokens()


def main() -> None:
    h = HierarchicalLimiter(2, 2, 3, 3, lambda: 0)   # frozen clock
    seq = "".join("Y" if h.allow(u) else "N" for u in ["asha", "asha", "asha", "bala", "chen"])
    print(f"{seq} chenTokens={h.user_tokens('chen'):.2f}")

    now = [0]
    h3 = HierarchicalLimiter(1, 1, 1, 1, lambda: now[0])
    refill = ("Y" if h3.allow("a") else "N") + ("Y" if h3.allow("b") else "N")   # global bucket is empty for b
    now[0] = 1_000_000_000                           # one second later it has refilled
    refill += "Y" if h3.allow("b") else "N"
    print(f"refill: {refill}")

    h2 = HierarchicalLimiter(5, 5, 50, 50, lambda: 0)
    with ThreadPoolExecutor(max_workers=32) as pool:
        ok = sum(pool.map(lambda i: h2.allow(f"u{i % 40}"), range(2000)))
    print(f"admitted={ok} (global cap 50)")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `type Clock = () => number; // nanoseconds

class Bucket {
  private tokens: number;
  private last: number;
  private readonly perNano: number;

  constructor(private readonly cap: number, perSec: number, private readonly clock: Clock) {
    this.perNano = perSec / 1e9;
    this.tokens = cap;
    this.last = clock();
  }

  // Each method is synchronous, so refill-then-change is one indivisible step: no CAS loop needed.
  private refill(): void {
    const now = Math.max(this.clock(), this.last);
    this.tokens = Math.min(this.cap, this.tokens + (now - this.last) * this.perNano);
    this.last = now;
  }

  tryAcquire(): boolean {
    this.refill();
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  refund(): void {
    this.refill();
    this.tokens = Math.min(this.cap, this.tokens + 1);
  }

  available(): number {
    this.refill();
    return this.tokens;
  }
}

class HierarchicalLimiter {
  private readonly users = new Map<string, Bucket>();
  private readonly global: Bucket;

  constructor(
    private readonly userCap: number,
    private readonly userRate: number,
    globalCap: number,
    globalRate: number,
    private readonly clock: Clock,
  ) {
    this.global = new Bucket(globalCap, globalRate, clock);
  }

  allow(user: string): boolean {
    let u = this.users.get(user);
    if (!u) this.users.set(user, (u = new Bucket(this.userCap, this.userRate, this.clock)));
    if (!u.tryAcquire()) return false; // user over limit: nothing consumed
    if (this.global.tryAcquire()) return true; // both OK
    u.refund(); // global full: give the user token back
    return false;
  }

  userTokens(user: string): number {
    const b = this.users.get(user);
    return b ? b.available() : this.userCap;
  }
}

async function main(): Promise<void> {
  const h = new HierarchicalLimiter(2, 2, 3, 3, () => 0); // frozen clock
  const seq = ["asha", "asha", "asha", "bala", "chen"].map((u) => (h.allow(u) ? "Y" : "N")).join("");
  console.log(seq + " chenTokens=" + h.userTokens("chen").toFixed(2));

  let now = 0;
  const h3 = new HierarchicalLimiter(1, 1, 1, 1, () => now);
  let refill = (h3.allow("a") ? "Y" : "N") + (h3.allow("b") ? "Y" : "N"); // global bucket is empty for b
  now = 1_000_000_000; // one second later it has refilled
  refill += h3.allow("b") ? "Y" : "N";
  console.log("refill: " + refill);

  const h2 = new HierarchicalLimiter(5, 5, 50, 50, () => 0);
  const results = await Promise.all(
    Array.from({ length: 2000 }, async (_, i) => {
      await Promise.resolve();
      return h2.allow("u" + (i % 40));
    }),
  );
  console.log("admitted=" + results.filter(Boolean).length + " (global cap 50)");
}

main();` },
          { lang: 'cpp', code: `using Clock = function<long long()>;                    // nanoseconds

class Bucket {
    struct State {                                       // immutable: a change builds a new one
        double tokens;
        long long last;
    };
    double cap_, perNano_;
    Clock clock_;
    atomic<shared_ptr<const State>> st_;

    State refilled(const State& s) const {
        long long now = max(clock_(), s.last);
        return {min(cap_, s.tokens + (now - s.last) * perNano_), now};
    }

public:
    Bucket(double cap, double perSec, Clock clock)
        : cap_(cap), perNano_(perSec / 1e9), clock_(std::move(clock)) {
        st_.store(make_shared<const State>(State{cap, clock_()}));
    }

    bool tryAcquire() {
        while (true) {
            auto s = st_.load();
            State r = refilled(*s);
            if (r.tokens < 1) return false;
            if (st_.compare_exchange_weak(s, make_shared<const State>(State{r.tokens - 1, r.last}))) return true;
        }
    }

    void refund() {
        while (true) {
            auto s = st_.load();
            State r = refilled(*s);
            if (st_.compare_exchange_weak(s, make_shared<const State>(State{min(cap_, r.tokens + 1), r.last}))) return;
        }
    }

    double tokens() const { return refilled(*st_.load()).tokens; }
};

class HierarchicalLimiter {
    unordered_map<string, shared_ptr<Bucket>> users_;
    mutex usersMu_;                                      // guards only the map
    double userCap_, userRate_;
    Clock clock_;
    Bucket global_;

    shared_ptr<Bucket> user(const string& name) {
        lock_guard lk(usersMu_);
        auto& slot = users_[name];
        if (!slot) slot = make_shared<Bucket>(userCap_, userRate_, clock_);
        return slot;
    }

public:
    HierarchicalLimiter(double userCap, double userRate, double globalCap, double globalRate, Clock clock)
        : userCap_(userCap), userRate_(userRate), clock_(clock), global_(globalCap, globalRate, clock) {}

    bool allow(const string& name) {
        auto u = user(name);
        if (!u->tryAcquire()) return false;              // user over limit: nothing consumed
        if (global_.tryAcquire()) return true;           // both OK
        u->refund();                                     // global full: give the user token back
        return false;
    }

    double userTokens(const string& name) {
        shared_ptr<Bucket> b;
        {
            lock_guard lk(usersMu_);
            auto it = users_.find(name);
            if (it == users_.end()) return userCap_;
            b = it->second;
        }
        return b->tokens();
    }
};

int main() {
    HierarchicalLimiter h(2, 2, 3, 3, [] { return 0LL; });   // frozen clock
    string seq;
    for (const char* u : {"asha", "asha", "asha", "bala", "chen"}) seq += h.allow(u) ? "Y" : "N";
    cout << seq << " chenTokens=" << fixed << setprecision(2) << h.userTokens("chen") << "\\n";

    atomic<long long> now{0};
    HierarchicalLimiter h3(1, 1, 1, 1, [&] { return now.load(); });
    string refill;
    refill += h3.allow("a") ? "Y" : "N";
    refill += h3.allow("b") ? "Y" : "N";                     // global bucket is empty for b
    now = 1'000'000'000;                                     // one second later it has refilled
    refill += h3.allow("b") ? "Y" : "N";
    cout << "refill: " << refill << "\\n";

    HierarchicalLimiter h2(5, 5, 50, 50, [] { return 0LL; });
    atomic<int> ok{0};
    {
        vector<jthread> pool;
        for (int t = 0; t < 32; t++)
            pool.emplace_back([&, t] {
                for (int i = t; i < 2000; i += 32) if (h2.allow("u" + to_string(i % 40))) ok++;
            });
    }
    cout << "admitted=" << ok << " (global cap 50)\\n";
}` }
        ],
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
    { q: 'In a hand-written bounded buffer, why <code>while (count == 0) notEmpty.wait();</code> (<code>await()</code> in Java) instead of <code>if</code>?', options: ['while is faster', 'After waking, the condition may be false again (another consumer got the item, or a spurious wakeup), so it must be re-checked', 'wait() requires a loop to compile', 'To avoid holding the lock'], answer: 1, explain: 'A signal means "maybe". Between the signal and reacquiring the lock, state can change, and spurious wakeups are allowed.' },
    { q: 'Thread 1 transfers A→B (locks A then B). Thread 2 transfers B→A (locks B then A). Which fix prevents deadlock while keeping per-account locks?', options: ['Always lock the account with the lower id first', 'Make balances volatile', 'Use a fair ReentrantLock', 'Call Thread.yield() between the two locks'], answer: 0, explain: 'A global acquisition order removes circular wait, one of the four necessary conditions for deadlock. Fairness does not prevent deadlock.' },
    { q: 'A seat booking uses <code>AtomicReference</code> per seat and <code>compareAndSet(null, hold)</code>. Request for seats 3 and 4 gets 3 but fails on 4. What must it do?', options: ['Keep seat 3 and retry 4 forever', 'Roll back seat 3 with compareAndSet(hold, null) so the request is all-or-nothing', 'Throw away the hold object and leave seat 3 held', 'Lock all seats globally'], answer: 1, explain: 'Optimistic multi-resource updates need compensation: undo the partial success, then report failure (or retry with backoff).' },
    { q: 'What does <code>ConcurrentHashMap.computeIfAbsent(k, f)</code> guarantee?', options: ['f runs at most once per absent key, atomically with the insert; other threads for that key wait and get the same value', 'f may run many times but only one value is kept', 'Nothing beyond put', 'It never blocks'], answer: 0, explain: 'It is atomic per key — which is why it is great for "create once" (buckets, adders) but dangerous for slow functions: they run while holding that bin\'s lock.' },
    { q: 'Producers are much faster than consumers and you use <code>new LinkedBlockingQueue&lt;&gt;()</code> with no capacity. What eventually happens?', options: ['Producers block automatically', 'The queue grows without bound until OutOfMemoryError — no backpressure', 'Items are dropped silently', 'Consumers speed up'], answer: 1, explain: 'The default capacity is Integer.MAX_VALUE. Always bound queues in front of slower stages and choose a policy for when they are full.' },
    { q: 'Why does a <code>volatile</code> reference to an <i>immutable</i> config map give readers a consistent view during reloads?', options: ['Readers read one reference and get either the whole old map or the whole new one; the volatile write publishes the fully built map', 'volatile locks the map', 'Immutable maps cannot be read concurrently', 'It does not; you need a ReadWriteLock'], answer: 0, explain: 'Copy-on-write snapshot swap: build privately, publish atomically with a single volatile write, never mutate after publishing.' }
  );

  /* ======================= INTERVIEW ======================= */
  interview.push(
    { q: 'What does it mean for a class to be thread-safe? How do you make one?', level: 'B', a: `<p>A class is thread-safe if it behaves correctly — keeps its invariants and honours its contract — when called from many threads at the same time, <b>without the caller adding synchronization</b>. My process: (1) list the <b>shared mutable state</b>; (2) write down the <b>invariants</b> (e.g. "size ≤ capacity", "map and list contain the same keys"); (3) pick a strategy: avoid sharing (confinement), avoid mutation (immutable objects), or coordinate (one lock per invariant, or atomics/concurrent collections for single-variable state); (4) make sure every read and write of guarded state happens under the same lock, and compound actions (check-then-act, read-modify-write) are atomic; (5) prove it with a stress test.</p>`, followUps: ['What is the difference between thread-safe and immutable?', 'Why prefer a private lock object over locking on the object itself (synchronized(this))?'] },
    { q: 'Explain race condition, data race and deadlock with one example each.', level: 'B', a: `<p><b>Race condition</b>: the result depends on timing — two ATMs both read balance 1000 and both write 900 (lost update), or two users both see seat 4 free and both book it. <b>Data race</b> (JMM term): two threads access the same variable, at least one writes, with no happens-before ordering — e.g. a non-volatile <code>running</code> flag; the reader may never see the write. Not all race conditions are data races (a check-then-act on a ConcurrentHashMap has no data race but is still a race condition). <b>Deadlock</b>: threads wait for each other forever — T1 holds lock A and waits for B, T2 holds B and waits for A. It needs mutual exclusion, hold-and-wait, no preemption and circular wait; break any one (usually circular wait, via lock ordering).</p>`, followUps: ['How do you detect a deadlock in a running JVM? (jstack / ThreadMXBean.findDeadlockedThreads)', 'What is a livelock?'] },
    { q: 'synchronized vs ReentrantLock vs atomics — when do you use each?', level: 'I', a: `<p><b>synchronized</b>: simplest, block-scoped, auto-released on exceptions; great default. <b>ReentrantLock</b>: same mutual exclusion plus <code>tryLock</code> (with timeout — useful for deadlock avoidance in booking/transfers), <code>lockInterruptibly</code>, optional fairness, and multiple <code>Condition</code>s (notFull/notEmpty in a bounded buffer); must unlock in <code>finally</code>; on Java 21 it also avoids pinning virtual threads when blocking inside. <b>Atomics</b> (<code>AtomicLong</code>, <code>AtomicReference</code>, <code>LongAdder</code>): lock-free updates of a <i>single</i> variable via CAS — counters, ID generators, swapping an immutable snapshot. They cannot protect an invariant spanning several variables unless you bundle them into one immutable object behind one AtomicReference.</p>`, followUps: ['When is LongAdder better than AtomicLong?', 'What is the ABA problem?'] },
    { q: 'Why are Collections.synchronizedMap and Hashtable considered insufficient? What do you use instead?', level: 'I', a: `<p>They make each <i>individual</i> method atomic using one lock on the whole map. Problems: (1) <b>compound actions</b> like check-then-put or get-then-put still race; (2) <b>iteration</b> must be manually synchronized on the map or it may throw ConcurrentModificationException — and holding the lock for the whole loop blocks writers; (3) <b>one lock</b> means all threads queue. <code>ConcurrentHashMap</code> fixes all three: lock-free reads, per-bin locking/CAS for writes, atomic compound methods (<code>putIfAbsent</code>, <code>computeIfAbsent</code>, <code>compute</code>, <code>merge</code>, <code>remove(k,v)</code>, <code>replace(k,old,new)</code>), and weakly consistent iterators that never throw. You must still express compound logic through those methods.</p>`, followUps: ['Why does ConcurrentHashMap forbid null?', 'What can go wrong inside a compute() lambda?'] },
    { q: 'Design a thread-safe rate limiter class. Which algorithm, and how do you make it safe under concurrency?', level: 'I', a: `<p>Clarify the rule: bursts allowed? exact rolling window? per user/IP/API key? one server or many? Default: <b>token bucket</b> per key (capacity = burst, rate = sustained). Structure: a concurrent map of key to Bucket (<code>ConcurrentHashMap</code> in Java, a dict behind a lock in Python, a mutex-guarded <code>unordered_map</code> in C++); the get-or-create step makes each bucket exactly once (<code>computeIfAbsent</code> in Java). Each bucket keeps <code>tokens</code> and <code>lastRefill</code>; <code>tryAcquire</code> does lazy refill (elapsed × rate, capped), check, and decrement in <b>one critical section</b> (synchronized method, or a CAS loop on an immutable state record). No timer threads; a monotonic clock (<code>System.nanoTime</code> / <code>time.monotonic</code> / <code>steady_clock</code>) behind an injectable clock for tests. Evict buckets idle long enough to be full again. For "exactly N per rolling window", use a sliding window log (deque per key under a per-key lock); for huge key counts, sliding window counter. Multi-server: move the atomic step into Redis via a Lua script.</p>`, followUps: ['How would you return Retry-After?', 'What breaks if you use currentTimeMillis?', 'How do you limit tokens-per-minute for LLM calls?'] },
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
    intro: `<p>Every machine-coding round eventually asks the same follow-up: <b>"Now what happens when 1,000 users hit this at the same time?"</b> This module teaches you to answer it with working code in <b>Java, Python, TypeScript and C++</b> (pick a language on any code block). Each topic is a design you will be asked to build: a <b>thread-safe class</b>, the right <b>concurrent collection</b>, a <b>rate limiter</b> (token bucket and sliding windows), a <b>producer-consumer</b> pipeline, a <b>thread-safe LRU/LFU cache</b>, and <b>concurrent booking</b> that never double-books or deadlocks.</p>
<p>Every topic follows the same path. First the brute force: no locks at all (fast and wrong), or one global lock around everything (correct and slow). Then you <b>watch the race happen</b>, step by step, in a visualizer. Then you narrow the lock down to the smallest correct unit: one per key, one per seat, a single atomic call, or no lock at all with CAS or immutable snapshots. The Java code uses <code>java.util.concurrent</code> (Java 21); the Python, TypeScript and C++ versions use the equivalent tools (<code>threading</code>, promises with <code>async</code>/<code>await</code>, <code>std::mutex</code> and <code>std::atomic</code>), run as written and print the same lines. JavaScript runs one task at a time, so its races hide behind an <code>await</code>: the language notes explain each mapping.</p>`,
    goals: [
      'Spot the three race shapes (read-modify-write, check-then-act, visibility) in any class and fix each with the smallest correct tool',
      'Choose between locked wrappers, the atomic methods of a concurrent map (ConcurrentHashMap in Java), copy-on-write lists and immutable snapshots based on the read/write pattern',
      'Implement thread-safe token bucket, sliding window log and sliding window counter rate limiters with per-key locking and an injectable clock',
      'Build producer-consumer systems with bounded blocking queues or a lock with condition variables, including backpressure and clean poison-pill shutdown',
      'Write thread-safe LRU and LFU caches, explain why LRU get needs an exclusive lock, and prevent cache stampedes with single-flight loading',
      'Design concurrent booking (seats, rooms, stock) that is all-or-nothing, never double-books, and is deadlock-free via lock ordering or CAS with rollback'
    ],
    prereqs: `<p><b>Java 11 (Concurrency I: Threads &amp; the JMM)</b> and <b>Java 12 (Concurrency II: java.util.concurrent)</b> for threads, locks and executors; <b>Java 10 (Collections Internals)</b> for HashMap/LinkedHashMap; <b>LLD 7–8</b> (Parking Lot, BookMyShow case studies) for class modelling. You should already be comfortable writing an LRU cache single-threaded (DSA hashing + linked lists).</p>`,
    hours: 16,
    langNotes: {
      java: `<p><b>Locks, atomics and visibility.</b> <code>synchronized</code> is the default: block-scoped and released on exceptions. Reach for <code>ReentrantLock</code> when you need <code>tryLock</code> with a timeout, several <code>Condition</code>s (notFull / notEmpty) or no virtual-thread pinning; always unlock in <code>finally</code>. <code>volatile</code> gives visibility and ordering, never atomicity (<code>count++</code> on a volatile is still a race). <code>AtomicLong</code>, <code>LongAdder</code> and <code>AtomicReference</code> (compare-and-set on an immutable state record) cover single-variable and snapshot-swap designs. <b>Concurrent collections.</b> <code>ConcurrentHashMap</code> makes each call atomic, so use its compound methods (<code>putIfAbsent</code>, <code>merge</code>, <code>compute</code>, <code>computeIfAbsent</code>) instead of get-then-put, keep the lambda short, and make the stored value thread-safe too. <code>CopyOnWriteArrayList</code> iterates a snapshot. <b>Interfaces, equality, immutability.</b> Program to small interfaces (<code>Counter</code>, <code>Delayed</code>); a map key needs a stable <code>equals</code>/<code>hashCode</code> and must never be mutated while it is in the map. <code>record</code>s and <code>Map.copyOf</code> give immutable values that can be shared with any number of threads, and a <code>volatile</code> reference to one is a complete, lock-free reload. <b>Cancellation and shutdown.</b> Interrupt is the standard way to wake a blocked thread: restore the flag (<code>Thread.currentThread().interrupt()</code>) and leave the loop. Always bound waits (<code>join(timeout)</code>, <code>awaitTermination</code>) in demos. <b>Composition.</b> Inject the clock as a <code>LongSupplier</code>; start threads after construction so <code>this</code> never escapes half-built.</p>`,
      python: `<p><b>The GIL is not a lock for your invariants.</b> It keeps the interpreter's own structures safe, but <code>x += 1</code> and check-then-act on a <code>dict</code> are several bytecodes and can still interleave (and the free-threaded 3.13 build removes the safety net). Protect every compound step with a <code>threading.Lock</code> (<code>with lock:</code> releases on exceptions); use <code>threading.Condition</code> sharing one lock for notFull / notEmpty, and <code>wait_for(predicate)</code> to get the re-check loop for free. <b>Tools.</b> <code>queue.Queue(maxsize)</code> is a ready-made bounded blocking queue; <code>concurrent.futures.ThreadPoolExecutor</code> and <code>Future</code> replace executors and <code>CompletableFuture</code>; <code>threading.Event</code> is a flag plus an interruptible sleep; <code>threading.Semaphore</code> passes batons. Python threads cannot be interrupted, so design blocking calls with a timeout or an Event. There is no hardware compare-and-set, so an "atomic reference" is a small lock. <b>Interfaces, equality, immutability.</b> <code>abc.ABC</code> with <code>@abstractmethod</code> (bodies may be <code>...</code>) or <code>typing.Protocol</code> for the seam; <code>@dataclass(frozen=True)</code> generates <code>__eq__</code> and <code>__hash__</code> for value objects and dictionary keys; copy-on-write means replacing a <code>tuple</code> or a <code>MappingProxyType(dict(...))</code> in one assignment, which is atomic. <b>Composition.</b> Inject the clock as a <code>Callable[[], int]</code>; a lock per object (not one global lock) is the unit of contention.</p>`,
      js: `<p><b>TypeScript.</b> <b>One thread, many tasks.</b> The event loop runs one task at a time, so any method with no <code>await</code> inside is already atomic: a plain <code>Map</code> check-then-set cannot be interleaved. Races return the moment an <code>await</code> sits between a read and its write (lost updates, double booking, duplicate loads); fix them by making the compound step synchronous, by storing the pending <code>Promise</code> in the map before awaiting it (single-flight), or by serialising with a promise-based mutex (a chain of promises). Hand-written locks need the same discipline as threads: a fixed lock order prevents deadlock between tasks too. <b>Blocking and waiting.</b> Never spin or block; wait with promises (<code>Semaphore</code>, bounded async queue, wait lists woken one or all at a time), re-check the condition in a <code>while</code> after waking, and cancel with <code>AbortController</code>. A loop of <code>await Promise.resolve()</code> starves timers; yield with <code>setTimeout(r, 0)</code> when a timer must fire. <b>Real parallelism</b> needs <code>worker_threads</code> and a <code>SharedArrayBuffer</code> read and written through <code>Atomics</code>; ordinary objects are copied, not shared. <b>Interfaces, equality, immutability.</b> <code>interface</code> is erased at run time and structural, so an object literal is a fine fake. <code>Map</code> and <code>Set</code> compare objects by identity, so key by a string, and avoid names that clash with DOM types (<code>Window</code>, <code>Worker</code>). <code>readonly</code> exists only at compile time; <code>Object.freeze</code> enforces it, and replacing a whole <code>readonly</code> array or Map is the copy-on-write idiom. <b>Composition.</b> Inject the clock as <code>() =&gt; number</code>; constructor parameter properties keep classes short.</p>`,
      cpp: `<p><b>Locks and RAII.</b> Take every lock with <code>std::lock_guard</code>, <code>std::unique_lock</code> (needed by <code>condition_variable::wait</code> and <code>try_lock_for</code>) or <code>std::scoped_lock</code>, so unlocking happens on every exit path; lock several mutexes in a fixed order (or let <code>scoped_lock</code> do it). Wait on a <code>condition_variable</code> with a predicate, which is the re-check loop. <code>std::shared_mutex</code> gives many readers or one writer. A data race on a plain variable is <b>undefined behaviour</b>, not just a wrong number: use <code>std::atomic</code> (default <code>seq_cst</code>; <code>relaxed</code> is fine for pure counters) or a mutex. Compile threaded code with <code>-pthread</code>. <b>Ownership and lifetimes.</b> <code>std::jthread</code> joins in its destructor and carries a <code>stop_token</code> (pair it with <code>condition_variable_any</code> for cancellable waits); never capture a local by reference in a thread that outlives it. A mutex is neither copyable nor movable, so hold such objects in <code>unique_ptr</code> / <code>shared_ptr</code> or in a container built with a size. Use <code>shared_ptr</code> when a request may still hold an object (a bucket) after the map erases it, and <code>atomic&lt;shared_ptr&lt;const T&gt;&gt;</code> for lock-free snapshot swaps; references to <code>unordered_map</code> elements survive a rehash, iterators do not. <b>Interfaces, equality, immutability.</b> An interface is a class of pure virtual functions with a virtual destructor and <code>override</code> on implementations; value types are structs with <code>const</code> members. A map key needs <code>std::hash</code> and <code>operator==</code> (or use <code>std::map</code> with <code>operator&lt;</code>). <b>Composition.</b> Inject the clock as <code>std::function&lt;long long()&gt;</code>; <code>register</code>, <code>new</code> and <code>delete</code> are keywords, hence <code>register_</code>.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
