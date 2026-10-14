(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (py10) ---------- */
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function cp(code, hl, label) { return { type: 'code', label: label || 'Python code (current line highlighted)', lang: 'python', code: code, hl: hl || {} }; }
  function vp(obj, hlKeys, cls, label) {
    var vals = {}, hl = {};
    Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); });
    if (hlKeys) String(hlKeys).split(',').forEach(function (k) { hl[k] = cls || 'ok'; });
    return { type: 'vars', label: label || 'State', vals: vals, hl: hl };
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function words(s) { return String(s === undefined || s === null ? '' : s).trim().split(/[\s,]+/).filter(function (x) { return x.length; }); }
  function nums(s, max, hint) {
    var a = words(s).map(Number);
    if (!a.length || a.some(function (x) { return isNaN(x) || x <= 0 || Math.floor(x) !== x; })) throw new Error(hint || 'Enter positive whole numbers separated by spaces, e.g. 3 1 2');
    if (a.length > (max || 6)) throw new Error('Use at most ' + (max || 6) + ' numbers');
    if (a.some(function (x) { return x > 9; })) throw new Error('Keep each number between 1 and 9 so the timeline fits');
    return a;
  }
  function range(n, f) { var r = []; for (var i = 0; i < n; i++) r.push(f ? f(i) : i); return r; }
  function outBox(lines, label) { return tx(lines.length ? '<pre>' + lines.map(esc).join('\n') + '</pre>' : '<i>(nothing printed yet)</i>', label || 'Printed output'); }

  /* ================= TOPIC 1: The GIL ================= */
  topics.push({
    title: 'Concurrency vs Parallelism and the GIL: Why Only One Python Thread Runs at a Time',
    analogy: `<p>Picture a busy kitchen with <b>several cooks</b> (threads) but only <b>one chef's knife</b> (the GIL — Global Interpreter Lock). A cook may only chop while holding the knife. When a cook puts a pot on the stove and has to <b>wait for water to boil</b> (I/O), they hand the knife to someone else — so waiting overlaps nicely and the kitchen feels fast. But if <b>every cook only wants to chop</b> (CPU work), they just pass the knife around: more cooks do <b>not</b> chop faster, they only add handover time. Want true parallel chopping? Open <b>more kitchens</b> (processes), each with its own knife.</p>`,
    explain: `<p>🟢 <b>Two words people mix up.</b></p>
<ul>
<li><b>Concurrency</b> = <i>dealing</i> with many things at once: tasks take turns and their lifetimes overlap. One cook juggling three dishes is concurrent.</li>
<li><b>Parallelism</b> = <i>doing</i> many things at the same instant on different CPU cores. Three cooks chopping at the same moment is parallel.</li>
</ul>
<p>Every concurrency question starts with one question: <b>what is the program waiting on?</b></p>
${H.table(['Kind of work', 'What it waits on', 'Examples', 'Best Python tool'], [['<b>I/O-bound</b>', 'network, disk, database, sleep', 'downloading 500 URLs, calling an LLM API, reading files', '<code>asyncio</code> or <code>threading</code>'], ['<b>CPU-bound</b>', 'the processor itself', 'resizing images, parsing big JSON, counting primes, pure-Python math', '<code>multiprocessing</code> / <code>ProcessPoolExecutor</code> (or NumPy, which releases the GIL)'], ['<b>Mixed</b>', 'both', 'web scraper that also parses HTML heavily', 'asyncio for fetching + process pool for parsing']])}
<p>🔵 <b>What is the GIL?</b> CPython (the normal <code>python</code> you install) has one <b>mutex</b> — a lock only one thread can hold — called the <b>Global Interpreter Lock</b>. A thread must hold it to run Python bytecode. So inside one process, <b>only one thread executes Python code at any instant</b>, even on a 16-core laptop.</p>
<p><b>Why does it exist?</b> Every Python object carries a <b>reference count</b> (how many names point at it). When it hits zero, the object is freed. If two threads changed the same count at the same time without protection, the count could go wrong → memory freed too early (crash) or never (leak). One big lock was the simple, fast-for-single-thread fix chosen in the 1990s, and it also made writing C extensions easy.</p>
<p><b>When is the GIL handed over?</b></p>
<ol>
<li><b>Voluntarily</b>, when a thread starts a blocking call: socket reads, file I/O, <code>time.sleep()</code>, waiting on a lock. That is why threads <b>do</b> speed up I/O-bound code.</li>
<li><b>Forcibly</b>, every <b>switch interval</b> (default <code>5 ms</code>, see <code>sys.getswitchinterval()</code>): if another thread is waiting, the running thread is asked to drop the GIL at the next safe point.</li>
<li><b>By C code</b> that does long work without touching Python objects: NumPy, <code>hashlib</code> on big buffers, <code>zlib</code>, many image libraries release the GIL and really do run in parallel.</li>
</ol>
<p><b>The GIL does NOT make your code thread-safe.</b> It protects CPython's own internals, not your logic. <code>counter += 1</code> is several bytecode steps (load, add, store); a switch can happen between them, so updates get lost. You still need locks.</p>
<p>🟣 <b>2026 status — the GIL is becoming optional.</b> PEP 703 added a <b>free-threaded build</b> (often installed as <code>python3.13t</code> / <code>python3.14t</code>) where the GIL is removed and threads run Python code in true parallel. It was experimental in 3.13 and became <b>officially supported</b> (not default) in 3.14 (PEP 779). Check with <code>sys._is_gil_enabled()</code>. Single-threaded code runs a little slower on that build, and some C extensions still re-enable the GIL. Separately, 3.12 gave each <b>sub-interpreter</b> its own GIL (PEP 684) and 3.14 exposed them in the standard library as <code>concurrent.interpreters</code> plus <code>InterpreterPoolExecutor</code>.</p>`,
    clues: [
      '"I added threads but my CPU-heavy code got no faster (or slower)" → GIL; switch to processes or a GIL-releasing library',
      '"download / call 1,000 APIs / read many files" → I/O-bound → threads or asyncio, the GIL is released while waiting',
      '"use all 8 cores for pure-Python computation" → multiprocessing / ProcessPoolExecutor (or free-threaded 3.14t)',
      '"is <code>x += 1</code> thread-safe because of the GIL?" → no — read-modify-write is several bytecodes; use a Lock',
      '"why does Python have a GIL?" → reference counting safety + simple C-extension API + fast single-thread speed',
      '"concurrency vs parallelism" → overlapping lifetimes vs simultaneous execution on several cores'
    ],
    code: [{ lang: 'python', title: 'Inspect the GIL settings and estimate speed-ups (runnable)', run: true, code: `import sys

# How often (in seconds) a running thread is asked to give up the GIL
print("switch interval:", sys.getswitchinterval(), "s")

# On 3.13+ this tells you whether the GIL is on (free-threaded builds can turn it off)
gil_check = getattr(sys, "_is_gil_enabled", None)
print("GIL enabled:", gil_check() if gil_check else "yes (Python older than 3.13)")

def amdahl(parallel_fraction, workers):
    """Best possible speed-up when only part of the job can run in parallel."""
    serial = 1 - parallel_fraction
    return 1 / (serial + parallel_fraction / workers)

for p in (0.5, 0.9, 0.99):
    row = [f"{amdahl(p, n):5.2f}x" for n in (2, 4, 8, 64)]
    print(f"{int(p * 100):3d}% parallel ->", "  ".join(row))
` }, { lang: 'python', title: 'CPU-bound: threads vs processes (run on your own machine)', code: `import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

def burn(n: int) -> int:
    """Pure-Python CPU work: holds the GIL the whole time."""
    total = 0
    for i in range(n):
        total += i * i
    return total

def timed(label, executor_cls):
    start = time.perf_counter()
    with executor_cls(max_workers=4) as ex:
        list(ex.map(burn, [3_000_000] * 4))
    print(f"{label:10s} {time.perf_counter() - start:.2f}s")

if __name__ == "__main__":          # required for process pools on spawn/forkserver
    start = time.perf_counter()
    for _ in range(4):
        burn(3_000_000)
    print(f"{'serial':10s} {time.perf_counter() - start:.2f}s")
    timed("threads", ThreadPoolExecutor)     # about the same as serial (GIL)
    timed("processes", ProcessPoolExecutor)  # ~4x faster on 4+ cores
` }],
    codeTitle: ['Runnable: switch interval + Amdahl', 'Local benchmark'],
    viz: {
      title: 'GIL handoff timeline: who holds the knife each millisecond?',
      input: 'cpu cpu io',
      inputLabel: '1-4 threads, each "cpu" or "io" (e.g. cpu io io)',
      gen: function (input) {
        var toks = words(input || 'cpu cpu io');
        if (toks.length < 1 || toks.length > 4) throw new Error('Give 1 to 4 threads, e.g. "cpu io io"');
        var SW = 3;
        var th = toks.map(function (t, i) {
          t = t.toLowerCase();
          if (t !== 'cpu' && t !== 'io') throw new Error('Each thread must be the word cpu or io, e.g. "cpu io io"');
          return { name: 'T' + (i + 1) + ' ' + t, type: t, script: t === 'cpu' ? 'RRRRRR' : 'RIIIRIIIR', pc: 0, ran: 0 };
        });
        var holder = -1, waitQ = [], rows = th.map(function () { return []; }), frames = [], tick = 0, gilTicks = 0;
        function done(t) { return t.pc >= t.script.length; }
        function snap(narr, curCol) {
          var hl = {};
          rows.forEach(function (r, i) {
            r.forEach(function (c, j) {
              var cls = c === 'RUN' ? 'ok' : c === 'wait' ? 'bad' : c === 'I/O' ? 'win' : 'done';
              if (j === curCol && c === 'RUN') cls = 'sel';
              hl[i + ',' + j] = cls;
            });
          });
          var parts = [];
          if (rows[0].length) parts.push({ type: 'grid', label: 'Timeline (1 column = 1 ms; green = running Python with the GIL, red = waiting for GIL, blue = blocked on I/O without the GIL)', rows: rows.map(function (r) { return r.slice(); }), rowHead: th.map(function (t) { return t.name; }), colHead: range(rows[0].length, function (j) { return 't' + j; }), hl: hl });
          parts.push({ type: 'queue', label: 'Threads waiting for the GIL', items: waitQ.map(function (i) { return th[i].name; }), frontLabel: 'next', backLabel: 'last' });
          parts.push(vp({ 'time (ms)': tick, 'GIL holder': holder >= 0 ? th[holder].name : '(free)', 'holder ran (ms)': holder >= 0 ? th[holder].ran : 0, 'switch interval': SW + ' ms (real default 5 ms)' }, 'GIL holder'));
          frames.push(fr(narr, parts));
        }
        snap('Threads: <b>' + th.map(function (t) { return t.name; }).join(', ') + '</b>. A <b>cpu</b> thread needs 6 ms of Python work. An <b>io</b> thread does 1 ms of Python, waits 3 ms for the network (no GIL needed), and repeats. Only the GIL holder may run Python.', -1);
        while (tick < 40 && th.some(function (t) { return !done(t); })) {
          var why = [];
          th.forEach(function (t, i) { if (i !== holder && !done(t) && t.script[t.pc] === 'R' && waitQ.indexOf(i) < 0) waitQ.push(i); });
          if (holder >= 0) {
            var h = th[holder];
            if (done(h)) { why.push(h.name + ' finished and released the GIL.'); holder = -1; }
            else if (h.script[h.pc] === 'I') { why.push(h.name + ' started a blocking I/O call, so it <b>voluntarily released</b> the GIL.'); holder = -1; }
            else if (h.ran >= SW && waitQ.length) { why.push(h.name + ' used its ' + SW + ' ms switch interval while others waited → <b>forced drop</b>; it joins the back of the line.'); waitQ.push(holder); holder = -1; }
          }
          if (holder === -1 && waitQ.length) { holder = waitQ.shift(); th[holder].ran = 0; why.push(th[holder].name + ' <b>acquires the GIL</b>.'); }
          th.forEach(function (t, i) {
            if (i === holder) { rows[i].push('RUN'); t.pc++; t.ran++; gilTicks++; }
            else if (done(t)) rows[i].push('✓');
            else if (t.script[t.pc] === 'I') { rows[i].push('I/O'); t.pc++; }
            else rows[i].push('wait');
          });
          var waiting = th.filter(function (t, i) { return i !== holder && !done(t) && rows[i][rows[i].length - 1] === 'wait'; }).length;
          snap('<b>t = ' + tick + ' ms.</b> ' + (why.length ? why.join(' ') + ' ' : '') + (holder >= 0 ? th[holder].name + ' runs Python bytecode. ' : 'Nobody needs the GIL right now. ') + (waiting ? '<span class="c-r">' + waiting + ' thread(s) are stuck waiting for the GIL.</span>' : '') , tick);
          tick++;
        }
        var cpuWork = th.reduce(function (s, t) { return s + t.script.split('').filter(function (c) { return c === 'R'; }).length; }, 0);
        var ioWork = th.reduce(function (s, t) { return s + t.script.split('').filter(function (c) { return c === 'I'; }).length; }, 0);
        snap('<b>Finished in ' + tick + ' ms.</b> Total Python work = ' + cpuWork + ' ms and it can never overlap (one GIL), so wall time ≥ ' + cpuWork + ' ms. The ' + ioWork + ' ms of I/O waiting <b>did</b> overlap with other threads\' work. Lesson: threads help I/O-bound code, not CPU-bound Python code.', -1);
        return frames;
      }
    },
    examples: [
      { title: 'Two CPU threads take as long as doing the work one after the other', html: `<p>Each thread needs 6 ms of pure-Python work. Serial: 6 + 6 = <b>12 ms</b>. With two threads they just alternate the GIL every switch interval:</p>${H.table(['ms', '0-2', '3-5', '6-8', '9-11'], [['T1', H.c('g', 'RUN'), H.c('r', 'wait'), H.c('g', 'RUN'), '✓'], ['T2', H.c('r', 'wait'), H.c('g', 'RUN'), H.c('r', 'wait'), H.c('g', 'RUN')]])}<p>Still <b>12 ms</b> — plus real-world overhead from lock handoffs and cache misses, so it is often a bit <b>slower</b>. That is the famous "threads made my Python slower" surprise.</p>` },
      { title: '100 HTTP calls of 200 ms each: threads win big', html: `<p>Each request spends ~1 ms in Python (building the request, parsing JSON) and ~199 ms waiting on the network with the GIL <b>released</b>.</p>${H.table(['Approach', 'Wall time', 'Why'], [['Sequential', '100 × 200 ms = <b>20 s</b>', 'waits one after another'], ['20 threads', '≈ 5 batches × 200 ms = <b>~1 s</b>', 'waiting overlaps; Python work is tiny'], ['asyncio, 100 tasks', '<b>~0.2–0.3 s</b>', 'all waits overlap on one thread (if the server allows it)']])}<p>The GIL barely matters because the threads are almost always waiting, not computing.</p>` },
      { title: 'Amdahl\'s law: the serial part caps your speed-up', html: `<p>If 90% of a job can run in parallel and 10% cannot, then with infinite workers the best speed-up is 1 / 0.10 = <b>10×</b>. With 8 workers: 1 / (0.10 + 0.90/8) = 1 / 0.2125 ≈ <b>4.7×</b>. Run the snippet above to see the table. This is why "just add more processes" stops helping, and why interviewers like hearing you ask "how much of this is actually parallel?"</p>` },
      { title: 'NumPy really runs in parallel inside threads', html: `<p><code>numpy.dot</code> on two large matrices drops the GIL while its C/BLAS code runs, so 4 threads each doing a big matrix multiply can keep 4 cores busy. The rule: <b>the GIL only serialises Python bytecode</b>. Code running in C that has released the GIL is free to run alongside others. (BLAS libraries are often multi-threaded themselves, so you may already be using all cores without any threads of your own.)</p>` }
    ],
    deepDive: `<p><b>How the "new GIL" (Python 3.2+) works.</b> A waiting thread does a timed wait on a condition variable for the switch interval. If it times out and the GIL is still held, it sets a <code>gil_drop_request</code> flag in the interpreter's <b>eval breaker</b>. The running thread checks the eval breaker between bytecodes (at loop back-edges and function calls), sees the request, releases the GIL and signals; with <code>FORCE_SWITCHING</code> it waits until another thread actually grabs it, which prevents the same thread from instantly re-acquiring (the old 3.1 "convoy" problem). A long-running C call that never returns to the eval loop and does not release the GIL (a slow regex on a huge string, a C extension's tight loop) blocks <b>all</b> other threads — including signal handling in the main thread.</p>
<p><b>Atomicity myths.</b> Single bytecodes that call into C on built-in types are effectively atomic under the GIL (<code>list.append</code>, <code>dict[k] = v</code>, <code>deque.popleft</code>). Compound operations are not: <code>x += 1</code>, <code>if k not in d: d[k] = v</code>, <code>lst[i] = lst[i] + 1</code>. Never rely on implementation-level atomicity for correctness — on the free-threaded build, built-in containers use per-object locks so single operations stay safe, but your multi-step invariants still need your own locks.</p>
<p><b>Free-threaded build internals (PEP 703).</b> Removing the GIL required: <b>biased reference counting</b> (the owning thread updates a fast non-atomic count; other threads use an atomic shared count), <b>immortal objects</b> (PEP 683: <code>None</code>, small ints and interned strings never change refcount), deferred refcounting for some objects, the <code>mimalloc</code> allocator, and per-object locks for <code>list</code>/<code>dict</code>. Cost: roughly 5–10% single-thread slowdown in 3.14 and more memory. C extensions must declare support (<code>Py_mod_gil</code>); importing one that does not will re-enable the GIL at runtime with a warning unless you set <code>PYTHON_GIL=0</code>.</p>
<p><b>Production reality.</b> Web servers (Gunicorn, Uvicorn) scale with <b>multiple worker processes</b>, each with its own GIL, plus threads or an event loop inside each. Data pipelines push hot loops into NumPy, Polars, PyArrow or Rust extensions, which release the GIL. Measuring before choosing matters: use <code>time.perf_counter()</code> and watch CPU usage — 100% of one core with several threads screams "GIL-bound".</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants happily write <code>ThreadPoolExecutor</code> around CPU-heavy pure-Python functions because "parallel" sounds faster. Your job is to spot the work type in seconds and say "this is CPU-bound — threads won't help, use processes, vectorise, or the free-threaded build".</p>
<p><b>Use AI as a partner:</b> ask <code>Classify each function in this file as CPU-bound or I/O-bound and justify each in one line</code>, or <code>Write a benchmark comparing serial, thread pool and process pool for this function, using perf_counter</code>. Then run the benchmark yourself — numbers beat opinions.</p>
<p><b>Where AI goes wrong:</b> outdated claims ("Python can never run threads in parallel" — false on 3.13t/3.14t and for GIL-releasing C code), claiming <code>+=</code> is atomic "because of the GIL", or forgetting the <code>if __name__ == "__main__":</code> guard for process pools. It also tends to mix up asyncio (one thread) with parallelism.</p>
<p><b>What you must still own:</b> the mental model (what holds the GIL, when it is released), the ability to read a CPU graph and a timing table, and the judgement of whether concurrency is even the bottleneck (often it is an N+1 query or a missing index).</p>`,
    problems: [{
      title: 'Speed Up a CPU-Bound Prime Counter', level: 'Medium', tags: ['GIL', 'multiprocessing', 'ProcessPoolExecutor'], companies: ['Google', 'Amazon', 'Bloomberg'],
      statement: `<p>A teammate wrote <code>count_primes_threaded(limit, workers)</code> that splits <code>[2, limit)</code> into chunks and counts primes in each chunk with a <code>ThreadPoolExecutor</code>. On an 8-core machine it is <b>no faster</b> than the serial version. Explain why, then write <code>count_primes_parallel(limit, workers)</code> that actually uses several cores and returns the same answer.</p>`,
      constraints: `<p>2 ≤ limit ≤ 5·10<sup>6</sup>, 1 ≤ workers ≤ 32. The counting function must be pure Python (no NumPy). Must work on Linux, macOS and Windows.</p>`,
      example: `<p>limit = 100, split into 4 chunks → ${H.c('b', '[2,26) [26,50) [50,74) [74,100)')} → counts ${H.c('g', '9 + 6 + 6 + 4')} = <b>25</b> (there are 25 primes below 100). Same answer as serial, but each chunk runs in its own process with its own GIL.</p>`,
      brute: { why: `<p>Threads split the work, but every chunk is pure-Python bytecode, so only the GIL holder runs. Total time ≈ serial time + handoff overhead. The waste is 7 idle cores.</p>`, code: `from concurrent.futures import ThreadPoolExecutor

def count_in_range(lo, hi):
    count = 0
    for n in range(max(lo, 2), hi):
        if all(n % d for d in range(2, int(n ** 0.5) + 1)):
            count += 1
    return count

def count_primes_threaded(limit, workers):
    step = (limit + workers - 1) // workers
    bounds = [(i, min(i + step, limit)) for i in range(0, limit, step)]
    with ThreadPoolExecutor(workers) as ex:
        return sum(ex.map(lambda b: count_in_range(*b), bounds))

print(count_primes_threaded(100, 4))` },
      mcq: { q: 'The job is pure-Python arithmetic. Which change gives a real multi-core speed-up on standard CPython?', options: ['More threads', 'ProcessPoolExecutor with a top-level worker function', 'asyncio.gather over the chunks', 'Lowering sys.setswitchinterval'], answer: 1, explain: 'Each process has its own interpreter and GIL, so chunks truly run in parallel. Threads and asyncio stay on one GIL; the switch interval only changes how often threads trade the GIL.' },
      hints: [`<p>Hint 1: Ask "what is this code waiting on?" — nothing but the CPU. Threads only help when the GIL is released during waits.</p>`, `<p>Hint 2: Use <code>ProcessPoolExecutor</code>. The worker function must be defined at module top level (it gets <b>pickled by name</b>), and arguments/results must be picklable — a lambda is not.</p>`, `<p>Hint 3: Recipe: build chunk bounds → <code>ex.map(count_in_range, los, his)</code> → <code>sum</code>. Guard the entry point with <code>if __name__ == "__main__":</code>. Balance work: higher numbers are costlier, so use more chunks than workers (e.g. workers × 4).</p>`],
      solution: {
        approach: `<p>Same chunking idea, but run chunks in <b>separate processes</b>. Each process has its own GIL, so 8 processes can keep 8 cores busy. Use more chunks than workers so that a slow chunk (large numbers) does not leave other cores idle at the end. Only small integers cross the process boundary, so pickling cost is tiny compared to the work.</p>`,
        code: `from concurrent.futures import ProcessPoolExecutor

def count_in_range(lo: int, hi: int) -> int:
    """Count primes in [lo, hi). Top-level so it can be pickled by name."""
    count = 0
    for n in range(max(lo, 2), hi):
        if n < 4:
            count += 1          # 2 and 3
            continue
        if n % 2 == 0:
            continue
        d, ok = 3, True
        while d * d <= n:
            if n % d == 0:
                ok = False
                break
            d += 2
        count += ok
    return count

def count_primes_parallel(limit: int, workers: int) -> int:
    chunks = workers * 4                       # extra chunks = better load balance
    step = max(1, (limit + chunks - 1) // chunks)
    los = list(range(0, limit, step))
    his = [min(lo + step, limit) for lo in los]
    with ProcessPoolExecutor(max_workers=workers) as ex:
        return sum(ex.map(count_in_range, los, his))

if __name__ == "__main__":
    print(count_primes_parallel(100, 4))        # 25
    print(count_primes_parallel(200_000, 4))    # 17984`,
        dry: { head: ['chunk', 'lo', 'hi', 'process', 'primes found'], rows: [['0', '0', '7', 'P1', '2, 3, 5 = 3'], ['1', '7', '14', 'P2', '7, 11, 13 = 3'], ['…', '…', '…', 'P3/P4 in parallel', '…'], ['sum', '', '', 'main process', '25 for limit 100']] },
        complexity: `<p>Work O(N√N) total, divided across W cores → wall time ≈ O(N√N / W) + process start-up (~50–200 ms with spawn) + tiny pickling cost. Memory: one interpreter per worker (~20–40 MB each).</p>`,
        followUps: ['How would you pick chunk size if task costs vary a lot?', 'Would a sieve with NumPy beat this? (Usually yes — vectorised and GIL-free.)', 'What changes on the free-threaded 3.14t build?']
      }
    }]
  });

  /* ================= TOPIC 2: threading ================= */
  topics.push({
    title: 'threading for I/O: Threads, Race Conditions, Locks, Events and Queues',
    analogy: `<p>A <b>shared whiteboard</b> in an office shows "Cookies left: 5". Two people walk up at the same time, both read 5, both eat one, both write 4. One cookie vanished from the count. That is a <b>race condition</b>. The fix is a <b>marker pen that only one person may hold</b> (a <b>Lock</b>): whoever holds the pen reads, updates and writes, then hands it over. A <b>queue</b> is like the office <b>in-tray</b>: people drop jobs in, workers pick them out, and the tray itself makes sure no job is taken twice.</p>`,
    explain: `<p>🟢 <b>A thread</b> is a separate line of execution inside the same program. All threads share the <b>same memory</b> (globals, objects), which is handy and dangerous at the same time. Because of the GIL, Python threads shine for <b>I/O-bound</b> work: while one thread waits for the network, another runs.</p>
<pre>import threading, time

def download(name):
    time.sleep(1)                # stands in for a network call (GIL released while waiting)
    print("done", name)

threads = [threading.Thread(target=download, args=(f"file{i}",)) for i in range(3)]
for t in threads: t.start()      # start = begin running in the background
for t in threads: t.join()       # join = wait until that thread finishes
# total ≈ 1 s, not 3 s</pre>
<p>🔵 <b>The toolbox</b> (all in <code>threading</code> / <code>queue</code>):</p>
${H.table(['Tool', 'Plain meaning', 'Typical use'], [['<code>Lock</code>', 'only one thread inside at a time', 'protect a shared counter / dict update'], ['<code>RLock</code>', 'a lock the <b>same</b> thread may take again', 'recursive functions that lock'], ['<code>Semaphore(n)</code>', 'at most n threads inside', 'limit to 5 DB connections'], ['<code>Event</code>', 'a flag threads can wait on', '"stop now" signal, "config loaded"'], ['<code>Condition</code>', 'wait until some state is true, get woken by notify', 'bounded buffer, custom queues'], ['<code>Barrier(n)</code>', 'everyone waits until n arrive', 'phased simulations'], ['<code>queue.Queue</code>', 'thread-safe FIFO with blocking put/get', 'producer–consumer pipelines (the default answer!)'], ['<code>threading.local()</code>', 'each thread sees its own copy', 'per-thread DB session']])}
<p><b>Race condition</b> = the result depends on the timing of threads. <code>counter += 1</code> is really <b>load → add → store</b>. If a thread switch happens between load and store, an update is lost. Wrap the whole read-modify-write in a lock:</p>
<pre>lock = threading.Lock()
with lock:            # acquire … release, even if an exception happens
    counter += 1</pre>
<p><b>Deadlock</b> = two threads each hold one lock and wait forever for the other's lock. Fix: always take locks in the <b>same global order</b>, keep critical sections tiny, or use <code>lock.acquire(timeout=…)</code>.</p>
<p><b>Daemon threads</b> (<code>daemon=True</code>) are killed abruptly when the main program exits — fine for background heartbeats, bad for anything that writes files. Prefer an <code>Event</code> for clean shutdown and always <code>join()</code>.</p>
<p>🟣 <b>Rule of thumb:</b> share data by <b>passing messages through a <code>queue.Queue</code></b> instead of sharing variables plus locks. Fewer locks = fewer bugs. Python 3.13 added <code>Queue.shutdown()</code> so consumers wake up with <code>ShutDown</code> instead of needing sentinel values.</p>`,
    clues: [
      '"make 200 API calls / scrape pages / read files faster" with blocking libraries (requests, boto3, JDBC-style drivers) → threads (usually via ThreadPoolExecutor)',
      '"the final count is sometimes less than expected" → race condition on read-modify-write → Lock',
      '"producer–consumer" / "pipeline stages" / "bounded buffer" → queue.Queue(maxsize=…)',
      '"program hangs forever and CPU is 0%" → deadlock (lock ordering) or a consumer waiting on an empty queue with no sentinel',
      '"limit to N concurrent connections" → Semaphore(N) or a pool with N workers',
      '"signal all workers to stop gracefully" → threading.Event + join()',
      '"print in order / alternate between threads" (LeetCode concurrency) → Event, Semaphore or Condition'
    ],
    code: [{ lang: 'python', title: 'See why += is not atomic: the bytecode (runnable)', run: true, code: `import dis

counter = 0

def increment():
    global counter
    counter += 1       # looks like one step...

# ...but it is several bytecode instructions. A thread switch can happen between them.
for ins in dis.get_instructions(increment):
    if ins.opname.startswith(("LOAD", "BINARY", "STORE")):
        print(f"{ins.opname:15s} {ins.argrepr}")
print("LOAD -> ADD -> STORE: another thread can sneak in between LOAD and STORE")
` }, { lang: 'python', title: 'Lost updates and the Lock fix (run locally; browser Python has no threads)', code: `import threading

N = 200_000
counter = 0
lock = threading.Lock()

def unsafe():
    global counter
    for _ in range(N):
        counter += 1                 # read-modify-write, not atomic

def safe():
    global counter
    for _ in range(N):
        with lock:                   # only one thread in here at a time
            counter += 1

def run(fn):
    global counter
    counter = 0
    ts = [threading.Thread(target=fn) for _ in range(4)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    return counter

print("unsafe:", run(unsafe), "expected", 4 * N)   # may be lower (varies by version/luck)
print("safe:  ", run(safe), "expected", 4 * N)     # always 800000
` }, { lang: 'python', title: 'Producer–consumer with queue.Queue and sentinels', code: `import queue
import threading
import time

q: "queue.Queue[str | None]" = queue.Queue(maxsize=3)   # bounded = back-pressure
SENTINEL = None
NUM_CONSUMERS = 2

def producer():
    for i in range(6):
        q.put(f"job-{i}")          # blocks while the queue is full
        print("produced", i)
    for _ in range(NUM_CONSUMERS):
        q.put(SENTINEL)            # one "stop" pill per consumer

def consumer(name):
    while True:
        item = q.get()             # blocks while the queue is empty
        if item is SENTINEL:
            q.task_done()
            break
        time.sleep(0.05)           # pretend to do I/O
        print(name, "handled", item)
        q.task_done()

threads = [threading.Thread(target=producer)]
threads += [threading.Thread(target=consumer, args=(f"C{i}",)) for i in range(NUM_CONSUMERS)]
for t in threads:
    t.start()
q.join()                           # wait until every item got task_done()
for t in threads:
    t.join()
print("all done")
` }],
    codeTitle: ['Bytecode of +=', 'Race + Lock', 'Producer–consumer'],
    viz: [{
      title: 'Race condition: two threads increment counter (type lock or nolock)',
      input: 'nolock',
      inputLabel: 'Mode: nolock or lock',
      gen: function (input) {
        var mode = String(input || 'nolock').trim().toLowerCase().replace(/[\s_-]/g, '');
        if (mode !== 'nolock' && mode !== 'lock') throw new Error('Type nolock or lock');
        var L = mode === 'lock';
        var code = L ? 'with lock:\n    tmp = counter      # LOAD\n    tmp = tmp + 1      # ADD\n    counter = tmp      # STORE' : 'tmp = counter          # LOAD\ntmp = tmp + 1          # ADD\ncounter = tmp          # STORE';
        var off = L ? 1 : 0;
        var st = { counter: 0, 'A.tmp': '-', 'B.tmp': '-', 'lock owner': L ? '(free)' : 'no lock used' };
        var frames = [];
        function f(narr, aLine, bLine, aCls, bCls, hlk) {
          var ha = {}, hb = {};
          if (aLine) ha[aLine] = aCls || 'cur';
          if (bLine) hb[bLine] = bCls || 'cur';
          frames.push(fr(narr, [cp(code, ha, 'Thread A'), cp(code, hb, 'Thread B'), vp(st, hlk || '', hlk === 'counter' ? 'ok' : 'cur', 'Shared memory + each thread\'s local tmp')]));
        }
        f('Both threads run the same code. counter starts at <b>0</b>. After both finish we <b>expect 2</b>.', 0, 0);
        if (L) { st['lock owner'] = 'A'; f('Thread A <b>acquires the lock</b>. The lock was free so it gets it immediately.', 1, 0, 'ok', '', 'lock owner'); }
        st['A.tmp'] = 0; f('Thread A runs <b>LOAD</b>: tmp = counter → A.tmp = 0.', 1 + off, 0, 'cur', '', 'A.tmp');
        if (!L) {
          f('<span class="c-y">Switch interval expires</span> — the OS/interpreter hands the GIL to Thread B <b>in the middle</b> of A\'s read-modify-write.', 1, 1, 'done', 'cur');
          st['B.tmp'] = 0; f('Thread B runs <b>LOAD</b>: it also sees counter = 0 (A has not stored yet!).', 1, 1, 'done', 'cur', 'B.tmp');
          st['B.tmp'] = 1; f('Thread B runs <b>ADD</b>: B.tmp = 1.', 1, 2, 'done', 'cur', 'B.tmp');
          st.counter = 1; f('Thread B runs <b>STORE</b>: counter = 1. B is done.', 1, 3, 'done', 'ok', 'counter');
          st['A.tmp'] = 1; f('Back to Thread A. It continues from where it was: <b>ADD</b> on its <i>stale</i> tmp → A.tmp = 1.', 2, 0, 'cur', '');
          st.counter = 1; f('Thread A runs <b>STORE</b>: counter = 1. <span class="c-r">It overwrote B\'s update!</span>', 3, 0, 'bad', '', 'counter');
          frames.push(fr('<span class="c-r"><b>Final counter = 1, expected 2. One update was lost.</b></span> This is a <b>race condition</b>: the answer depends on when the switch happened. Run it again with <b>lock</b> to see the fix.', [cp(code, { 1: 'bad', 2: 'bad', 3: 'bad' }, 'The unprotected read-modify-write'), vp(st, 'counter', 'bad', 'Final shared memory')]));
        } else {
          f('<span class="c-y">Switch interval expires</span> — Thread B gets the GIL now.', 2, 1, 'done', 'cur');
          f('Thread B tries to <b>acquire the lock</b>, but A owns it → <span class="c-r">B blocks</span> (and releases the GIL while waiting).', 2, 1, 'done', 'bad', 'lock owner');
          st['A.tmp'] = 1; f('Thread A resumes: <b>ADD</b> → A.tmp = 1.', 3, 1, 'cur', 'bad', 'A.tmp');
          st.counter = 1; f('Thread A: <b>STORE</b> → counter = 1.', 4, 1, 'ok', 'bad', 'counter');
          st['lock owner'] = 'B'; f('A leaves the <code>with</code> block → lock released → B wakes up and <b>acquires</b> it.', 0, 1, '', 'ok', 'lock owner');
          st['B.tmp'] = 1; f('Thread B: <b>LOAD</b> sees the fresh value 1.', 0, 2, '', 'cur', 'B.tmp');
          st['B.tmp'] = 2; f('Thread B: <b>ADD</b> → 2.', 0, 3, '', 'cur', 'B.tmp');
          st.counter = 2; st['lock owner'] = '(free)'; f('Thread B: <b>STORE</b> → counter = 2, then releases the lock.', 0, 4, '', 'ok', 'counter');
          frames.push(fr('<span class="c-g"><b>Final counter = 2 — correct.</b></span> The lock made LOAD-ADD-STORE behave like one indivisible step (a <b>critical section</b>). Cost: B had to wait, so keep critical sections short.', [cp(code, { 1: 'ok' }, 'Protected critical section'), vp(st, 'counter', 'ok', 'Final shared memory')]));
        }
        return frames;
      }
    }, {
      title: 'Bounded queue: fast producer, slow consumer, sentinel shutdown',
      input: '5 2',
      inputLabel: 'number of items (1-8) and queue maxsize (1-4)',
      gen: function (input) {
        var a = words(input || '5 2').map(Number);
        if (a.length !== 2 || a.some(isNaN)) throw new Error('Enter two numbers: items and maxsize, e.g. 5 2');
        var n = a[0], cap = a[1];
        if (n < 1 || n > 8 || cap < 1 || cap > 4) throw new Error('items must be 1-8 and maxsize 1-4');
        var q = [], produced = 0, consumed = [], frames = [], t = 0, busy = 0, cur = null, sentPut = false, pState = 'running', cState = 'idle';
        function snap(narr) {
          frames.push(fr(narr, [
            { type: 'graph', directed: true, height: 40, nodes: [{ id: 'P', label: 'Producer', x: 12, y: 20, shape: 'box' }, { id: 'Q', label: 'Queue (max ' + cap + ')', x: 50, y: 20, shape: 'box' }, { id: 'C', label: 'Consumer', x: 88, y: 20, shape: 'box' }], edges: [['P', 'Q', 'put()'], ['Q', 'C', 'get()']], hl: { P: pState === 'BLOCKED' ? 'bad' : pState === 'done' ? 'done' : 'ok', C: cState === 'BLOCKED' ? 'bad' : cState === 'exited' ? 'done' : 'cur', Q: q.length === cap ? 'bad' : 'win' }, tags: { P: pState, C: cState } },
            { type: 'queue', label: 'queue.Queue contents', items: q.slice(), frontLabel: 'get()', backLabel: 'put()' },
            vp({ tick: t, produced: produced, 'consumer working on': cur === null ? '-' : cur, handled: consumed.join(', ') || '-' }, '')
          ]));
        }
        snap('Producer makes 1 item per tick; consumer needs <b>2 ticks</b> per item. The queue holds at most <b>' + cap + '</b> items, which gives <b>back-pressure</b>: a fast producer cannot flood memory.');
        while (t < 40) {
          t++;
          var notes = [];
          // consumer progress
          if (cur !== null) { busy--; if (busy === 0) { consumed.push(cur); notes.push('Consumer finished <b>' + cur + '</b> (task_done).'); cur = null; } }
          if (cur === null && cState !== 'exited') {
            if (q.length) {
              var it = q.shift();
              if (it === 'None') { cState = 'exited'; notes.push('Consumer got the <b>None sentinel</b> → breaks out of its loop and exits cleanly.'); }
              else { cur = it; busy = 2; cState = 'working'; notes.push('Consumer <b>get()</b> → ' + it + '.'); }
            } else { cState = 'BLOCKED'; notes.push('<span class="c-r">Queue empty → consumer blocks in get()</span> (sleeps, uses no CPU).'); }
          }
          // producer
          if (pState !== 'done') {
            var next = produced < n ? 'job' + produced : 'None';
            if (q.length < cap) {
              q.push(next); pState = 'running';
              if (next === 'None') { pState = 'done'; sentPut = true; notes.push('Producer is out of work → <b>put(None)</b> as a stop signal, then exits.'); }
              else { produced++; notes.push('Producer <b>put()</b> ' + next + '.'); }
            } else { pState = 'BLOCKED'; notes.push('<span class="c-r">Queue full → producer blocks in put()</span> until the consumer makes room.'); }
          }
          if (!notes.length) notes.push('Consumer is still busy with <b>' + cur + '</b>; the producer ' + (pState === 'done' ? 'has already finished.' : 'is waiting.'));
          snap('<b>Tick ' + t + '.</b> ' + notes.join(' '));
          if (cState === 'exited') break;
        }
        snap('<b>Done.</b> All ' + n + ' items handled in order: ' + consumed.join(', ') + '. Notice how the producer kept getting blocked: the bounded queue automatically slowed it to the consumer\'s pace. ' + (sentPut ? 'The sentinel let the consumer know there will be no more work.' : ''));
        return frames;
      }
    }],
    examples: [
      { title: 'Ten "downloads" of 0.5 s with 10 threads take ~0.5 s', html: `<p><code>time.sleep</code> and socket reads release the GIL, so all ten waits overlap:</p>${H.table(['Threads', 'Expected wall time'], [['1 (sequential)', '10 × 0.5 = 5.0 s'], ['5', '2 rounds × 0.5 = 1.0 s'], ['10', '≈ 0.5 s']])}<p>Thread start-up costs ~50–100 µs each and ~8 MB of <i>virtual</i> stack, so hundreds of threads are fine, tens of thousands are not — that is where asyncio wins.</p>`, code: `import threading, time

def fake_download(i, results):
    time.sleep(0.5)               # GIL released while sleeping
    results[i] = f"page {i}"      # each thread writes its own slot: no lock needed

results = [None] * 10
start = time.perf_counter()
ts = [threading.Thread(target=fake_download, args=(i, results)) for i in range(10)]
for t in ts: t.start()
for t in ts: t.join()
print(f"{time.perf_counter() - start:.2f}s", results[:3])` },
      { title: 'Deadlock with two locks, and the lock-ordering fix', html: `<p>Thread 1 does <code>with a: with b:</code>; Thread 2 does <code>with b: with a:</code>. If T1 grabs <code>a</code> and T2 grabs <code>b</code> at the same moment, each waits forever for the other. ${H.c('r', 'Hang, 0% CPU.')} Fix: give every lock a rank and always acquire in rank order (e.g. sort accounts by id before locking both for a transfer).</p>`, code: `import threading

class Account:
    def __init__(self, id_, balance):
        self.id, self.balance, self.lock = id_, balance, threading.Lock()

def transfer(src, dst, amount):
    first, second = sorted((src, dst), key=lambda a: a.id)   # global order → no deadlock
    with first.lock, second.lock:
        if src.balance >= amount:
            src.balance -= amount
            dst.balance += amount

a, b = Account(1, 100), Account(2, 50)
t1 = threading.Thread(target=transfer, args=(a, b, 30))
t2 = threading.Thread(target=transfer, args=(b, a, 10))
t1.start(); t2.start(); t1.join(); t2.join()
print(a.balance, b.balance)   # 80 70` },
      { title: 'Graceful stop with an Event', html: `<p>A background "heartbeat" thread should stop when the program shuts down. <code>stop.wait(1.0)</code> sleeps up to 1 s but returns <b>immediately</b> when <code>stop.set()</code> is called — much better than <code>time.sleep</code> in a loop, which would delay shutdown by up to a full second.</p>`, code: `import threading

stop = threading.Event()

def heartbeat():
    beats = 0
    while not stop.wait(0.1):     # returns True as soon as stop is set
        beats += 1
    print("heartbeat stopped after", beats, "beats")

t = threading.Thread(target=heartbeat)
t.start()
threading.Timer(0.35, stop.set).start()   # ask it to stop after ~0.35 s
t.join()` },
      { title: 'Lock vs RLock in one picture', html: `${H.table(['Call pattern', 'Lock', 'RLock'], [['same thread acquires twice', H.c('r', 'deadlocks itself'), H.c('g', 'OK (counts depth)')], ['another thread releases it', 'allowed (but a bug)', H.c('r', 'RuntimeError')], ['speed', 'faster', 'slightly slower']])}<p>Use <code>RLock</code> when a locked method calls another locked method of the same object; otherwise a plain <code>Lock</code>.</p>` }
    ],
    deepDive: `<p><b>What really happens at a blocking call.</b> C functions such as <code>socket.recv</code> wrap the system call in <code>Py_BEGIN_ALLOW_THREADS … Py_END_ALLOW_THREADS</code>, which releases the GIL before blocking and reacquires it afterwards. That is the entire reason threads help with I/O. Python threads are real OS threads (pthreads on Linux), scheduled by the kernel; the GIL just decides which of them may run bytecode.</p>
<p><b>Condition variables properly.</b> Always wait in a loop: <code>with cond: while not predicate(): cond.wait()</code>, or use <code>cond.wait_for(predicate)</code>. Spurious wake-ups and "someone else got there first" are real. <code>notify()</code> wakes one waiter, <code>notify_all()</code> wakes all; you must hold the condition's lock to call either. <code>queue.Queue</code> itself is built from one mutex and three Conditions (<code>not_empty</code>, <code>not_full</code>, <code>all_tasks_done</code>).</p>
<p><b>Memory and visibility.</b> Under the GIL, a write by one thread is visible to others after the GIL handoff. On the free-threaded build, CPython keeps built-in operations sequentially consistent for Python-level code, but the safest rule for both builds is: share state only through locks, queues, or Events, which provide clear happens-before ordering.</p>
<p><b>Signals and KeyboardInterrupt</b> are only delivered to the <b>main thread</b>. A main thread blocked in <code>t.join()</code> without a timeout historically could not be interrupted on some platforms; long-running services usually loop on <code>join(timeout)</code> or wait on an <code>Event</code>. Daemon threads are killed mid-statement at interpreter shutdown — they may leave files half-written.</p>
<p><b>Thread-local and context.</b> <code>threading.local()</code> gives each thread its own attributes (used by DB session libraries). <code>contextvars</code> is the modern alternative that also works with asyncio tasks; <code>ThreadPoolExecutor</code> does not copy context automatically — use <code>contextvars.copy_context().run</code> if you need request IDs to follow work into a pool.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes threading boilerplate instantly, but concurrency bugs are timing-dependent and rarely show up in the one run you try. Your value is <b>reasoning about interleavings</b>: "what if a switch happens right here?"</p>
<p><b>Use AI as a partner:</b> <code>List every shared mutable variable in this code and which lock protects it</code>; <code>Find possible deadlocks by listing the lock acquisition order on each path</code>; <code>Write a stress test that runs this 1,000 times with sys.setswitchinterval(1e-6) to surface races</code>.</p>
<p><b>Where AI goes wrong:</b> uses a bare <code>while queue.empty()</code> check followed by <code>get()</code> (a race), forgets <code>task_done()</code> so <code>q.join()</code> hangs forever, nests locks in inconsistent order, marks worker threads <code>daemon=True</code> to "fix" a hang (hiding lost work), or adds locks around everything, killing throughput.</p>
<p><b>What you must still own:</b> choosing message passing over shared state, defining the shutdown protocol (sentinels, Events, <code>Queue.shutdown()</code>), and proving there is no lock-order cycle.</p>`,
    problems: [{
      title: 'Thread-Pool Downloader with a Work Queue', level: 'Medium', tags: ['threading', 'queue', 'producer-consumer'], companies: ['Dropbox', 'Stripe', 'Microsoft'],
      statement: `<p>Write <code>download_all(urls, fetch, num_workers)</code> that downloads every URL using exactly <code>num_workers</code> threads pulling from a shared <code>queue.Queue</code>. <code>fetch(url)</code> is a blocking function that returns a string or raises. Return a dict <code>{url: result}</code>, where a failed URL maps to <code>"ERROR: &lt;message&gt;"</code>. All threads must exit cleanly.</p>`,
      constraints: `<p>1 ≤ len(urls) ≤ 10<sup>4</sup>, 1 ≤ num_workers ≤ 64. Each fetch takes 50–500 ms (I/O). No busy-waiting.</p>`,
      example: `<p>urls = ${H.c('b', '["a", "b", "boom", "c"]')}, workers = 2, <code>fetch</code> raises on "boom".<br>Output: ${H.c('g', '{"a": "A", "b": "B", "boom": "ERROR: bad url", "c": "C"}')} — one bad URL must not kill a worker, otherwise the remaining URLs would never be processed.</p>`,
      brute: { why: `<p>A plain loop calls <code>fetch</code> one URL at a time: 10,000 × 200 ms = 33 minutes, and the CPU sits idle almost the whole time waiting on the network.</p>`, code: `def download_all_slow(urls, fetch):
    out = {}
    for u in urls:
        try:
            out[u] = fetch(u)
        except Exception as e:
            out[u] = f"ERROR: {e}"
    return out

print(download_all_slow(["a", "b"], str.upper))` },
      mcq: { q: 'How should idle workers learn that there is no more work?', options: ['Loop while not q.empty() and then call q.get()', 'Put one sentinel (None) per worker after the real items', 'Mark them daemon and let the program exit', 'Call q.get(timeout=1) and exit on Empty'], answer: 1, explain: 'One sentinel per worker gives a deterministic shutdown. empty() + get() is a race; daemon threads may lose work; timeouts are a guess and slow down shutdown (3.13+ can also use q.shutdown()).' },
      hints: [`<p>Hint 1: This is a <b>producer–consumer</b> problem. The main thread produces URLs; workers consume them.</p>`, `<p>Hint 2: Put all URLs, then one <code>None</code> per worker. Each worker loops: <code>item = q.get()</code>; break on None. Writing <code>results[url] = …</code> from many threads is safe in CPython (single dict store), but a Lock makes the intent explicit and stays correct everywhere.</p>`, `<p>Hint 3: Wrap <code>fetch</code> in try/except inside the loop so one failure doesn't kill the worker. Join all threads at the end. Edge cases: empty URL list, more workers than URLs, duplicate URLs (last write wins).</p>`],
      solution: {
        approach: `<p>Classic worker pool: a shared queue of URLs, N worker threads, one sentinel per worker for shutdown, a lock-protected results dict, and per-item exception handling. Because <code>fetch</code> blocks on the network (GIL released), N threads give close to N× speed-up until you hit bandwidth or server limits.</p>`,
        code: `import queue
import threading
import time

def download_all(urls, fetch, num_workers):
    q = queue.Queue()
    results = {}
    lock = threading.Lock()

    for u in urls:
        q.put(u)
    for _ in range(num_workers):
        q.put(None)                       # one stop pill per worker

    def worker():
        while True:
            url = q.get()
            if url is None:               # sentinel → exit cleanly
                return
            try:
                value = fetch(url)
            except Exception as e:        # one bad URL must not kill the worker
                value = f"ERROR: {e}"
            with lock:
                results[url] = value

    threads = [threading.Thread(target=worker, name=f"w{i}") for i in range(num_workers)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return results

def fake_fetch(url):
    time.sleep(0.05)                      # pretend network wait
    if url == "boom":
        raise ValueError("bad url")
    return url.upper()

if __name__ == "__main__":
    print(download_all(["a", "b", "boom", "c"], fake_fetch, 2))`,
        dry: { head: ['time', 'w0', 'w1', 'queue (front→back)', 'results'], rows: [['0 ms', 'get a', 'get b', 'boom, c, None, None', '{}'], ['50 ms', 'store A, get boom', 'store B, get c', 'None, None', 'a, b'], ['100 ms', 'store ERROR, get None → exit', 'store C, get None → exit', '(empty)', 'a, b, boom, c'], ['join', 'done', 'done', '', '4 entries']] },
        complexity: `<p>Wall time ≈ ⌈len(urls) / N⌉ × avg fetch time. Memory O(len(urls)). Thread count fixed at N regardless of input size.</p>`,
        followUps: ['How would you add a per-host limit of 2 concurrent requests?', 'Rewrite it with ThreadPoolExecutor in 6 lines.', 'How would you add retries with exponential backoff?']
      }
    }]
  });

registerModule({ id: 'py10', title: 'Concurrency', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
