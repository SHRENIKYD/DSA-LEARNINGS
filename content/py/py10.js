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
        snap('<b>Finished in ' + tick + ' ms.</b> Total Python work = ' + cpuWork + ' ms and it can never overlap (one GIL), so wall time ≥ ' + cpuWork + ' ms. The ' + ioWork + ' ms of I/O waiting <b>did</b> overlap with other threads\' work. Lesson: threads help I/O-bound code, not CPU-bound Python code.' + (toks.indexOf('cpu') >= 0 && toks.indexOf('io') >= 0 ? ' Also notice the io thread queued behind cpu threads for the GIL even though it only needed 1 ms — the <b>convoy effect</b>, which adds latency to I/O threads in mixed workloads.' : ''), -1);
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

# On CPython 3.10+ "unsafe" often prints 800000 anyway, because the GIL is only
# handed over at certain points (calls, loop back-edges). That is luck, not safety:
# older versions, other code shapes and free-threaded builds DO lose updates.
print("unsafe:", run(unsafe), "expected", 4 * N)
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

  /* ================= TOPIC 3: multiprocessing ================= */
  topics.push({
    title: 'multiprocessing for CPU Work: Processes, Pools, Pickling and Start Methods',
    analogy: `<p>Your one kitchen has only one knife (GIL). So you <b>rent more kitchens</b> across the street. Each kitchen has its own knife, so cooks really chop at the same time. The catch: kitchens do <b>not share a fridge</b>. To give a cook ingredients you must <b>pack them in a box</b> (pickle), carry the box over (IPC), and carry the finished dish back the same way. Renting a kitchen and carrying boxes takes time, so it only pays off when the cooking is big compared to the carrying.</p>`,
    explain: `<p>🟢 <b>A process</b> is a separate running program with its <b>own memory and its own Python interpreter (and GIL)</b>. N processes can use N CPU cores at once, which is the standard way to make <b>CPU-bound</b> pure-Python code faster.</p>
<pre>from multiprocessing import Pool

def square(x):            # must be a top-level function (it is sent by name)
    return x * x

if __name__ == "__main__":         # REQUIRED with spawn/forkserver start methods
    with Pool(processes=4) as pool:
        print(pool.map(square, range(10)))   # [0, 1, 4, 9, ...] in input order</pre>
<p>🔵 <b>How data travels.</b> Arguments and return values are <b>pickled</b> (turned into bytes), sent through a pipe, and unpickled on the other side. So:</p>
<ul>
<li>Functions must be importable by name: top-level <code>def</code>s work; <b>lambdas, nested functions and bound methods of unpicklable objects fail</b>.</li>
<li>Big arguments are expensive: sending a 500 MB DataFrame to 8 workers copies it 8 times. Send <b>small descriptions</b> (file paths, row ranges) and let workers load the data.</li>
<li>Changing a global inside a worker does <b>not</b> change it in the parent — separate memory.</li>
</ul>
${H.table(['Start method', 'How the child is created', 'Default on', 'Notes'], [['<code>fork</code>', 'copy of the parent process (copy-on-write)', 'Linux up to 3.13', 'fast; unsafe if the parent has threads (locks copied in a held state)'], ['<code>spawn</code>', 'fresh interpreter that re-imports your main module', 'Windows, macOS (3.8+)', 'slowest start; needs the <code>__main__</code> guard'], ['<code>forkserver</code>', 'a clean server process forks children on request', 'Linux/POSIX from 3.14', 'safe with threads, fast enough']])}
<p><b>Pool methods you should know:</b> <code>map</code> (ordered, waits for all), <code>imap</code> (ordered, lazy — results stream in), <code>imap_unordered</code> (fastest-first), <code>starmap</code> (multiple args), <code>apply_async</code> (one call, returns an AsyncResult). The <code>chunksize</code> argument sends several items per trip to cut pickling/IPC overhead for many tiny tasks.</p>
<p><b>Talking between processes:</b> <code>multiprocessing.Queue</code> and <code>Pipe</code> (message passing), <code>Value</code>/<code>Array</code> (small shared C values, with a lock), <code>shared_memory.SharedMemory</code> (zero-copy big buffers, great with NumPy), <code>Manager()</code> (proxy dicts/lists — convenient but slow because every access is an IPC call).</p>
<p>🟣 <b>Today</b> most code uses <code>concurrent.futures.ProcessPoolExecutor</code> (next topic) instead of <code>Pool</code> — same idea, nicer Future-based API. Use raw <code>multiprocessing</code> when you need its extras: <code>maxtasksperchild</code>, <code>imap_unordered</code> with chunksize, explicit Queues or shared memory.</p>`,
    clues: [
      '"pure-Python, CPU-heavy, many independent items" (image resize, hashing, simulations) → process pool',
      '"Can\'t pickle &lt;lambda&gt;" / "AttributeError: Can\'t get attribute" → worker function not top-level or not picklable',
      '"works on Linux but on macOS/Windows spawns endlessly / RuntimeError about bootstrapping" → missing <code>if __name__ == "__main__":</code>',
      '"millions of tiny tasks are slower in parallel" → IPC/pickling overhead → use chunksize or batch the work',
      '"workers need a big read-only dataset" → load once per worker with an initializer, or shared memory, not as an argument per task',
      '"memory keeps growing in long-running workers" → maxtasksperchild to recycle workers'
    ],
    code: [{ lang: 'python', title: 'What can cross a process boundary? (runnable)', run: true, code: `import pickle

def top_level(x):
    return x + 1

def make_nested():
    def nested(x):
        return x * 2
    return nested

candidates = {
    "int / str / dict": {"a": 1, "b": "two"},
    "top-level function": top_level,
    "lambda": lambda x: x,
    "nested function": make_nested(),
    "generator": (i for i in range(3)),
}

for name, obj in candidates.items():
    try:
        data = pickle.dumps(obj)
        print(f"OK    {name:20s} -> {len(data)} bytes")
    except Exception as e:
        print(f"FAIL  {name:20s} -> {type(e).__name__}")

# A function is pickled BY NAME (module + qualified name), not by its code:
print(pickle.dumps(top_level)[:40])
` }, { lang: 'python', title: 'Pool with initializer, chunksize and imap_unordered (run locally)', code: `import os
from multiprocessing import Pool

WORDS = None   # per-worker global, filled once by the initializer

def init_worker(words):
    global WORDS
    WORDS = set(words)          # loaded once per process, not once per task

def count_hits(line):
    return sum(1 for w in line.split() if w in WORDS), os.getpid()

if __name__ == "__main__":
    lines = ["the cat sat", "a dog ran", "the end"] * 10_000
    with Pool(processes=4, initializer=init_worker, initargs=(["the", "cat", "end"],)) as pool:
        total, pids = 0, set()
        for hits, pid in pool.imap_unordered(count_hits, lines, chunksize=500):
            total += hits
            pids.add(pid)
    print("hits:", total, "worker processes used:", len(pids))
` }, { lang: 'python', title: 'Sharing a big array with shared_memory (zero copy)', code: `from multiprocessing import Process, shared_memory
import array

def worker(name, start, stop):
    shm = shared_memory.SharedMemory(name=name)        # attach, no copy
    view = shm.buf.cast("q")                           # signed 64-bit ints
    for i in range(start, stop):
        view[i] = i * i                                # each worker writes its own slice
    del view
    shm.close()

if __name__ == "__main__":
    n = 1_000
    shm = shared_memory.SharedMemory(create=True, size=n * 8)
    try:
        half = n // 2
        ps = [Process(target=worker, args=(shm.name, 0, half)),
              Process(target=worker, args=(shm.name, half, n))]
        for p in ps:
            p.start()
        for p in ps:
            p.join()
        result = array.array("q", bytes(shm.buf[: n * 8]))
        print(result[:5], result[-1])                  # [0, 1, 4, 9, 16] 998001
    finally:
        shm.close()
        shm.unlink()                                   # free the OS segment
` }],
    codeTitle: ['Picklability check', 'Pool tricks', 'Shared memory'],
    viz: {
      title: 'Process pool: main → task queue → worker processes → results',
      input: '3: 4 2 7 1 3 5',
      inputLabel: 'workers (1-4) : task costs (1-9 each, up to 8 tasks)',
      gen: function (input) {
        var s = String(input || '3: 4 2 7 1 3 5');
        var parts = s.split(':');
        if (parts.length !== 2) throw new Error('Format: workers : costs, e.g. 3: 4 2 7 1 3 5');
        var W = Number(parts[0].trim());
        if (!(W >= 1 && W <= 4) || Math.floor(W) !== W) throw new Error('workers must be 1-4');
        var cost = nums(parts[1], 8, 'Task costs must be whole numbers 1-9, e.g. 3: 4 2 7 1 3 5');
        var total = cost.reduce(function (a, b) { return a + b; }, 0);
        var tasks = cost.map(function (c, i) { return 'x' + i; });
        var pending = tasks.map(function (t, i) { return i; });
        var workers = range(W, function () { return { task: -1, end: 0 }; });
        var gantt = range(W, function () { return []; }), finished = [], frames = [], t = 0;
        function nodes() {
          var ns = [{ id: 'M', label: 'Main process', x: 8, y: 30, shape: 'box' }, { id: 'Q', label: 'Task queue', x: 32, y: 30, shape: 'box' }, { id: 'R', label: 'Result queue', x: 90, y: 30, shape: 'box' }];
          for (var i = 0; i < W; i++) ns.push({ id: 'W' + i, label: 'Worker ' + (i + 1) + ' (own GIL)', x: 61, y: W === 1 ? 30 : 6 + i * (48 / (W - 1)), shape: 'box' });
          return ns;
        }
        function edges() {
          var e = [['M', 'Q', 'pickle args']];
          for (var i = 0; i < W; i++) { e.push(['Q', 'W' + i]); e.push(['W' + i, 'R']); }
          return e;
        }
        function snap(narr, ehl, hl) {
          var tags = {}, h = hl || {};
          workers.forEach(function (w, i) { tags['W' + i] = w.task >= 0 ? 'running ' + tasks[w.task] : 'idle'; if (!h['W' + i]) h['W' + i] = w.task >= 0 ? 'cur' : 'done'; });
          var ps = [{ type: 'graph', directed: true, height: 60, nodes: nodes(), edges: edges(), hl: h, ehl: ehl || {}, tags: tags },
            { type: 'queue', label: 'Tasks not started yet (cost in brackets)', items: pending.map(function (i) { return tasks[i] + ' [' + cost[i] + ']'; }), frontLabel: 'next', backLabel: 'last' }];
          if (gantt[0].length) {
            var ghl = {};
            gantt.forEach(function (r, i) { r.forEach(function (c, j) { ghl[i + ',' + j] = c === '' ? 'done' : (j === gantt[0].length - 1 ? 'cur' : 'ok'); }); });
            ps.push({ type: 'grid', label: 'Gantt chart: which task each worker runs per time unit', rows: gantt.map(function (r) { return r.slice(); }), rowHead: range(W, function (i) { return 'W' + (i + 1); }), colHead: range(gantt[0].length, function (j) { return String(j); }), hl: ghl });
          }
          ps.push({ type: 'table', label: 'Results as they arrive (finish order)', columns: ['task', 'cost', 'finished at', 'result'], rows: finished.map(function (i) { return [tasks[i], cost[i], workers.length ? String(fin[i]) : '', 'f(' + tasks[i] + ')']; }) });
          frames.push(fr(narr, ps));
        }
        var fin = {};
        snap('<b>' + W + ' worker processes</b> start (each is a full Python interpreter with its own GIL). Total work = ' + total + ' units. Serial time would be <b>' + total + '</b>; the best possible with ' + W + ' workers is about <b>' + Math.ceil(total / W) + '</b>.', {}, { M: 'cur' });
        var guard = 0;
        while ((pending.length || workers.some(function (w) { return w.task >= 0; })) && guard++ < 100) {
          var ehl = {}, hl = {}, notes = [];
          workers.forEach(function (w, i) {
            if (w.task >= 0 && w.end === t) { finished.push(w.task); fin[w.task] = t; notes.push('Worker ' + (i + 1) + ' finished <b>' + tasks[w.task] + '</b> → result pickled back to the result queue.'); ehl['W' + i + '-R'] = 'ok'; hl.R = 'ok'; w.task = -1; }
          });
          workers.forEach(function (w, i) {
            if (w.task < 0 && pending.length) { var k = pending.shift(); w.task = k; w.end = t + cost[k]; notes.push('Idle worker ' + (i + 1) + ' pulls <b>' + tasks[k] + '</b> (cost ' + cost[k] + ').'); ehl['Q-W' + i] = 'cur'; hl.Q = 'cur'; }
          });
          if (notes.length) snap('<b>t = ' + t + '.</b> ' + notes.join(' '), ehl, hl);
          if (!pending.length && !workers.some(function (w) { return w.task >= 0; })) break;
          workers.forEach(function (w, i) { gantt[i].push(w.task >= 0 ? tasks[w.task] : ''); });
          t++;
        }
        var ordered = tasks.map(function (x, i) { return x; }).join(', ');
        snap('<b>All done at t = ' + t + '</b> (serial would be ' + total + ', speed-up ≈ ' + (total / t).toFixed(2) + '×). Results arrived in finish order <b>' + finished.map(function (i) { return tasks[i]; }).join(', ') + '</b>, but <code>pool.map</code> still returns them in <b>input order</b> (' + ordered + '). <code>imap_unordered</code> would hand them over in finish order instead. Idle gaps at the end come from uneven task sizes — split work into more, smaller chunks to balance it.', { 'R': 'ok' }, { M: 'ok' });
        return frames;
      }
    },
    examples: [
      { title: 'Forgetting the __main__ guard', html: `<p>With <code>spawn</code> (Windows, macOS) and <code>forkserver</code> (Linux 3.14+) each child <b>re-imports your script</b>. If pool creation sits at module level, every child tries to create its own pool. Python detects this and raises <code>RuntimeError: An attempt has been made to start a new process before the current process has finished its bootstrapping phase</code>.</p>${H.table(['Code at top level', 'Result'], [['<code>pool = Pool(4)</code>', H.c('r', 'RuntimeError on spawn / forkserver')], ['<code>if __name__ == "__main__": pool = Pool(4)</code>', H.c('g', 'works everywhere')]])}` },
      { title: 'When multiprocessing makes things slower', html: `<p>Squaring 1,000,000 small ints with <code>pool.map(square, data)</code>: each item is pickled, piped, unpickled, computed (~50 ns), pickled back… The overhead (~10–50 µs per item without batching) dwarfs the work. Fixes: <code>chunksize=10_000</code>, or do the whole thing in NumPy (<code>arr * arr</code>) which is faster than any pool. ${H.c('y', 'Rule: per-task work should be at least ~1 ms before a pool pays off.')}</p>` },
      { title: 'Globals are not shared', html: `<p>Each worker gets its <b>own copy</b>:</p>${H.table(['Step', 'Parent counter', 'Child counter'], [['start', '0', '0 (copied or re-imported)'], ['child does counter += 5', '0', '5'], ['child exits', H.c('r', '0 — unchanged'), 'gone']])}<p>Return the value (or use a Queue / Value / shared_memory) to get data back.</p>`, code: `from multiprocessing import Process, Value

def add_five(shared):
    with shared.get_lock():          # Value comes with its own lock
        shared.value += 5

if __name__ == "__main__":
    total = Value("i", 0)            # a C int living in shared memory
    ps = [Process(target=add_five, args=(total,)) for _ in range(4)]
    for p in ps: p.start()
    for p in ps: p.join()
    print(total.value)               # 20` },
      { title: 'fork + threads = surprise deadlock', html: `<p><code>fork</code> copies the whole memory, including locks — but only the forking thread survives in the child. If another thread held the logging lock at that instant, the child inherits a lock <b>nobody will ever release</b>; the first <code>logging.info</code> in the child hangs. Python 3.12 warns (<code>DeprecationWarning</code>) when you fork a multi-threaded process, and 3.14 switched the Linux default to <code>forkserver</code>. Use <code>multiprocessing.get_context("spawn")</code> or <code>"forkserver"</code> when in doubt.</p>` }
    ],
    deepDive: `<p><b>Pool internals.</b> A <code>multiprocessing.Pool</code> runs three helper threads in the parent: one feeds tasks from an internal queue into a pipe (in chunks), one reads results back, one maintains workers (replacing those that exit due to <code>maxtasksperchild</code>). <code>map</code> splits the iterable into chunks — default <code>chunksize ≈ len / (4 × workers)</code> — so it must consume the whole iterable up front; <code>imap</code> does not, which matters for huge or infinite inputs.</p>
<p><b>Costs you can estimate.</b> Spawn start-up: 50–300 ms per worker (imports re-run). Fork: ~1–10 ms. Pickling: roughly 100 MB/s–1 GB/s depending on data; pickle protocol 5 supports out-of-band buffers for zero-copy NumPy. Each worker is a full interpreter: 15–40 MB baseline RSS plus whatever it imports — 32 workers that each import pandas can use several GB. With fork, copy-on-write is partly defeated by reference counting (touching an object writes its refcount, copying the page) — Instagram famously added <code>gc.freeze()</code> to keep pages shared.</p>
<p><b>Exceptions and crashes.</b> An exception in a worker is pickled and re-raised in the parent when you fetch that result. A worker that <b>dies</b> (segfault, OOM-kill) is different: <code>ProcessPoolExecutor</code> raises <code>BrokenProcessPool</code> for all pending futures; old <code>Pool.map</code> could hang forever. Long-running services prefer executors or task queues (Celery, RQ, Dramatiq, Ray) which handle retries and dead workers.</p>
<p><b>Alternatives in 2026.</b> For numeric work, vectorise first (NumPy, Polars release the GIL and use SIMD). For true shared-memory parallel Python, try the free-threaded 3.14t build with a <code>ThreadPoolExecutor</code>. Sub-interpreters (<code>InterpreterPoolExecutor</code>, 3.14) sit in between: one process, many interpreters, each with its own GIL, cheaper than processes but still no shared Python objects. For clusters, Ray or Dask scale the same map-style code across machines.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating a <code>Pool</code> wrapper is trivial; deciding <b>whether</b> to parallelise and how to <b>partition</b> data is not. AI often parallelises the wrong level (per row instead of per file) or ships a giant object to every task.</p>
<p><b>Use AI as a partner:</b> <code>Estimate per-task compute time vs pickling size for this function and recommend a chunksize</code>; <code>Rewrite this to load the model once per worker using an initializer</code>; <code>Convert this Pool code to ProcessPoolExecutor and make it handle BrokenProcessPool</code>.</p>
<p><b>Where AI goes wrong:</b> lambdas passed to <code>pool.map</code>, missing <code>__main__</code> guard, assuming a global mutated in a worker is visible in the parent, using <code>Manager().dict()</code> in a hot loop (each access is an IPC round-trip), or forgetting <code>shm.unlink()</code> so shared memory leaks.</p>
<p><b>What you must still own:</b> Amdahl-style reasoning (serial parts, start-up cost), memory budgeting per worker, and knowing when the right answer is "vectorise" or "use a job queue" instead of a process pool.</p>`,
    problems: [{
      title: 'Parallel Word Count (Map-Reduce on One Machine)', level: 'Medium', tags: ['multiprocessing', 'map-reduce', 'Counter'], companies: ['Google', 'Meta', 'Databricks'],
      statement: `<p>Given a list of text lines, return the <b>k most common words</b> (lower-cased, split on whitespace) as a list of <code>(word, count)</code> pairs sorted by count descending, then word ascending. Use multiple processes: each worker counts a <b>chunk</b> of lines, and the parent merges the partial counts.</p>`,
      constraints: `<p>Up to 10<sup>7</sup> lines, 1 ≤ k ≤ 100, workers = <code>os.cpu_count()</code>. Must not send one line per task (too much overhead).</p>`,
      example: `<p>lines = ${H.c('b', '["the cat", "The dog", "a cat"]')}, k = 2, 2 workers.<br>Chunk 1 → {the: 1, cat: 1}; chunk 2 → {the: 1, dog: 1, a: 1, cat: 1}. Merge → {the: 2, cat: 2, dog: 1, a: 1}. Output ${H.c('g', '[("cat", 2), ("the", 2)]')} — tie on 2, so alphabetical order puts "cat" first.</p>`,
      brute: { why: `<p>Single process: correct but uses one core; at 10<sup>7</sup> lines that is tens of seconds of pure-Python string work. A naive parallel version sends <b>one line per task</b> — pickling overhead then dominates and it is slower than serial.</p>`, code: `from collections import Counter

def top_k_serial(lines, k):
    c = Counter()
    for line in lines:
        c.update(line.lower().split())
    return sorted(c.items(), key=lambda kv: (-kv[1], kv[0]))[:k]

print(top_k_serial(["the cat", "The dog", "a cat"], 2))` },
      mcq: { q: 'What is the best unit of work to send to each worker?', options: ['One line', 'One word', 'A chunk of thousands of lines', 'The whole list to every worker'], answer: 2, explain: 'Chunks amortise pickling/IPC overhead while still giving several chunks per worker for load balancing. Sending everything to everyone duplicates work and memory.' },
      hints: [`<p>Hint 1: Counting is <b>associative</b>: count each chunk separately, then add the Counters. That is map-reduce.</p>`, `<p>Hint 2: <code>ProcessPoolExecutor.map(count_chunk, chunks)</code> where <code>count_chunk</code> is top-level and returns a <code>Counter</code>. Merge with <code>total.update(partial)</code> (or <code>+=</code>).</p>`, `<p>Hint 3: Chunk size ≈ len(lines) / (workers × 4). Final ordering: <code>sorted(items, key=lambda kv: (-kv[1], kv[0]))[:k]</code> or <code>heapq.nsmallest(k, items, key=…)</code>. Edge cases: empty input, k larger than distinct words.</p>`],
      solution: {
        approach: `<p><b>Map:</b> split lines into chunks; each worker builds a Counter for its chunk (pure CPU work, its own GIL). <b>Reduce:</b> parent adds the Counters. <b>Select:</b> sort by (−count, word) and take k. Only chunks of strings go out and compact Counters come back, so IPC is small relative to work.</p>`,
        code: `import os
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
import heapq

def count_chunk(chunk):
    """Map step: runs inside a worker process."""
    c = Counter()
    for line in chunk:
        c.update(line.lower().split())
    return c

def top_k_words(lines, k, workers=None):
    workers = workers or os.cpu_count() or 2
    if not lines:
        return []
    size = max(1, len(lines) // (workers * 4))
    chunks = [lines[i:i + size] for i in range(0, len(lines), size)]
    total = Counter()
    with ProcessPoolExecutor(max_workers=workers) as ex:
        for partial in ex.map(count_chunk, chunks):   # reduce as results arrive
            total.update(partial)
    return heapq.nsmallest(k, total.items(), key=lambda kv: (-kv[1], kv[0]))

if __name__ == "__main__":
    print(top_k_words(["the cat", "The dog", "a cat"], 2, workers=2))   # [('cat', 2), ('the', 2)]`,
        dry: { head: ['step', 'chunk / data', 'worker', 'partial result', 'running total'], rows: [['map 1', '["the cat"]', 'P1', '{the:1, cat:1}', '{the:1, cat:1}'], ['map 2', '["The dog"]', 'P2', '{the:1, dog:1}', '{the:2, cat:1, dog:1}'], ['map 3', '["a cat"]', 'P1', '{a:1, cat:1}', '{the:2, cat:2, dog:1, a:1}'], ['select', 'k = 2', 'parent', 'key (−count, word)', '[(cat,2), (the,2)]']] },
        complexity: `<p>Work O(total words) split across W cores; merge O(W' · distinct words) where W' = number of chunks; selection O(D log k). Memory: one Counter per in-flight chunk plus the total.</p>`,
        followUps: ['The file is 200 GB — how do you avoid loading it in the parent? (send byte offsets; workers seek and read)', 'How would you do this across 50 machines?', 'Why might threads be fine if you used a C-accelerated tokenizer?']
      }
    }]
  });

  /* ================= TOPIC 4: concurrent.futures ================= */
  topics.push({
    title: 'concurrent.futures: Executors, Futures, map, as_completed and wait',
    analogy: `<p>At a busy café you order at the counter and get a <b>buzzer</b> (a <b>Future</b>). You don't stand at the coffee machine — you can sit down, chat, order something else. The buzzer lets you <b>check</b> if your order is ready, <b>wait</b> for it, or <b>cancel</b> if they haven't started. The baristas are the <b>executor</b>: a fixed team that takes orders from a line. A <b>thread pool</b> is baristas sharing one coffee machine; a <b>process pool</b> is baristas each with their own café.</p>`,
    explain: `<p>🟢 <code>concurrent.futures</code> gives <b>one simple API</b> for running functions in the background, whether on threads or processes:</p>
<pre>from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

with ThreadPoolExecutor(max_workers=8) as ex:     # swap in ProcessPoolExecutor for CPU work
    fut = ex.submit(fetch, "https://a.example")   # returns immediately with a Future
    print(fut.result(timeout=5))                  # block until done (or raise TimeoutError)</pre>
<p>🔵 <b>The four ways to collect results:</b></p>
${H.table(['API', 'Order you get results', 'Use when'], [['<code>ex.map(fn, items)</code>', '<b>input order</b> (waits for item 0 first)', 'you need results lined up with inputs'], ['<code>as_completed(futures)</code>', '<b>finish order</b> (fastest first)', 'show progress, act on each result ASAP'], ['<code>wait(futures, return_when=FIRST_COMPLETED)</code>', 'returns (done, not_done) sets', 'first-wins races, custom scheduling loops'], ['<code>fut.result()</code> one by one', 'whatever order you ask', 'small fixed sets of calls']])}
<p><b>A Future's life:</b> <code>PENDING</code> (in the queue) → <code>RUNNING</code> → <code>FINISHED</code> (with a result or an exception), or <code>CANCELLED</code> if you called <code>cancel()</code> before it started. Running work <b>cannot</b> be cancelled by the executor.</p>
<p><b>Exceptions don't vanish — but they do hide.</b> If the function raises, the exception is stored inside the Future and re-raised when you call <code>result()</code>. If you never call <code>result()</code>, you never see it. With <code>ex.map</code>, the exception is raised when the iterator reaches that item, and the remaining results are lost from that loop.</p>
<p><b>Shutdown:</b> leaving the <code>with</code> block calls <code>shutdown(wait=True)</code>. Use <code>shutdown(cancel_futures=True)</code> (3.9+) to drop queued work quickly.</p>
<p><b>Default pool sizes:</b> threads: <code>min(32, cpu_count + 4)</code> (3.13+ uses the CPUs this process may use); processes: number of usable CPUs. Python 3.14 added a third executor, <code>InterpreterPoolExecutor</code>, which runs each worker in its own sub-interpreter with its own GIL inside one process.</p>
<p>🟣 <b>Bridge to asyncio:</b> <code>await loop.run_in_executor(pool, fn, arg)</code> or <code>await asyncio.to_thread(fn, arg)</code> turns blocking work into something an event loop can await without freezing.</p>`,
    clues: [
      '"run these N independent calls in parallel and collect results" → executor.map / submit + as_completed',
      '"process results as soon as each one is ready" / "progress bar" → as_completed',
      '"return the first successful response, cancel the rest" (hedged requests) → wait(FIRST_COMPLETED) or as_completed + cancel',
      '"overall deadline of 2 s for all calls" → as_completed(timeout=…) / wait(timeout=…)',
      '"the background task failed silently" → exception stored in the Future, never retrieved',
      '"same code should run on threads or processes" → Executor interface, swap the class'
    ],
    code: [{ lang: 'python', title: 'A Future is just a box with a state machine (runnable, no threads needed)', run: true, code: `from concurrent.futures import Future

def on_done(f):
    # Callbacks run when the future finishes (in the thread that finished it)
    if f.cancelled():
        print("callback: cancelled")
    elif f.exception():
        print("callback: failed with", repr(f.exception()))
    else:
        print("callback: result =", f.result())

ok = Future()
print("state:", ok._state)            # PENDING (private attribute, peek only)
ok.add_done_callback(on_done)
ok.set_running_or_notify_cancel()     # what an executor does when a worker picks it up
print("running?", ok.running())
ok.set_result(42)                      # what an executor does when fn returns
print("done?", ok.done(), "result:", ok.result())

bad = Future()
bad.add_done_callback(on_done)
bad.set_running_or_notify_cancel()
bad.set_exception(ValueError("boom"))  # stored, not raised yet
try:
    bad.result()                       # raised HERE, when you ask for the result
except ValueError as e:
    print("caught on result():", e)

never = Future()
never.add_done_callback(on_done)
print("cancel pending future:", never.cancel())   # True: it had not started
` }, { lang: 'python', title: 'map vs as_completed vs wait (run locally)', code: `import time
from concurrent.futures import ThreadPoolExecutor, as_completed, wait, FIRST_COMPLETED

def job(name, secs):
    time.sleep(secs)                 # I/O-like wait
    return f"{name} ({secs}s)"

work = [("A", 0.3), ("B", 0.1), ("C", 0.2)]

with ThreadPoolExecutor(max_workers=3) as ex:
    print("map:         ", list(ex.map(lambda w: job(*w), work)))      # input order

    futs = {ex.submit(job, n, s): n for n, s in work}
    print("as_completed:", [f.result() for f in as_completed(futs)])  # finish order

    futs = [ex.submit(job, n, s) for n, s in work]
    done, not_done = wait(futs, return_when=FIRST_COMPLETED)
    print("first done:  ", [f.result() for f in done], "still running:", len(not_done))
` }],
    codeTitle: ['Future state machine', 'Collecting results'],
    viz: {
      title: 'Executor timeline: submit order vs as_completed order vs map order',
      input: '2: 3 1 2 4',
      inputLabel: 'max_workers (1-3) : task durations (1-9 each, up to 6)',
      gen: function (input) {
        var s = String(input || '2: 3 1 2 4'), sp = s.split(':');
        if (sp.length !== 2) throw new Error('Format: workers : durations, e.g. 2: 3 1 2 4');
        var W = Number(sp[0].trim());
        if (!(W >= 1 && W <= 3) || Math.floor(W) !== W) throw new Error('max_workers must be 1-3');
        var d = nums(sp[1], 6, 'Durations must be whole numbers 1-9, e.g. 2: 3 1 2 4');
        var n = d.length, state = d.map(function () { return 'PENDING'; }), endAt = d.map(function () { return -1; }), worker = d.map(function () { return '-'; });
        var free = range(W, function (i) { return i; }), queue = range(n), asc = [], mapOut = [], mapNext = 0, frames = [], t = 0;
        function snap(narr, hlRow) {
          var hl = {};
          if (hlRow !== undefined) hl[hlRow] = 'cur';
          frames.push(fr(narr, [
            { type: 'table', label: 'Futures (one per submit call)', columns: ['future', 'duration', 'state', 'worker', 'finished at'], rows: d.map(function (x, i) { return ['f' + i, x + 's', state[i], worker[i], endAt[i] >= 0 && state[i] === 'FINISHED' ? 't=' + endAt[i] : '']; }), hl: hl },
            { type: 'queue', label: 'Executor work queue (not started)', items: queue.map(function (i) { return 'f' + i; }), frontLabel: 'next', backLabel: 'last' },
            { type: 'queue', label: 'as_completed() has yielded (finish order)', items: asc.slice(), frontLabel: 'first', backLabel: 'latest' },
            { type: 'queue', label: 'ex.map() has yielded (input order)', items: mapOut.slice(), frontLabel: 'first', backLabel: 'latest' },
            vp({ clock: t + 's', 'idle workers': free.length + ' of ' + W }, 'clock', 'cur')
          ]));
        }
        snap('We call <code>submit()</code> ' + n + ' times. Each call returns a <b>Future</b> instantly in state PENDING and puts the job on the executor\'s queue. Only <b>' + W + '</b> worker(s) exist, so the rest wait.');
        var guard = 0;
        while (guard++ < 80) {
          var notes = [];
          for (var i = 0; i < n; i++) if (state[i] === 'RUNNING' && endAt[i] === t) { state[i] = 'FINISHED'; free.push(Number(worker[i].slice(1)) - 1); free.sort(); asc.push('f' + i); notes.push('<b>f' + i + '</b> finished → <code>as_completed</code> yields it right away.'); }
          while (mapNext < n && state[mapNext] === 'FINISHED') { mapOut.push('f' + mapNext); notes.push('<code>map</code> can now yield <b>f' + mapNext + '</b>.'); mapNext++; }
          if (mapNext < n && state[mapNext] !== 'FINISHED' && asc.length > mapOut.length) notes.push('<span class="c-y">map is stuck waiting for f' + mapNext + '</span> even though later futures are done (head-of-line blocking).');
          while (free.length && queue.length) { var k = queue.shift(), w = free.shift(); state[k] = 'RUNNING'; worker[k] = 'W' + (w + 1); endAt[k] = t + d[k]; notes.push('Worker W' + (w + 1) + ' starts <b>f' + k + '</b> (needs ' + d[k] + 's).'); }
          if (notes.length) snap('<b>t = ' + t + 's.</b> ' + notes.join(' '));
          if (state.every(function (x) { return x === 'FINISHED'; })) break;
          t++;
        }
        snap('<b>All finished at t = ' + t + 's.</b> as_completed order: <b>' + asc.join(', ') + '</b> (fastest first — good for progress bars and early reactions). map order: <b>' + mapOut.join(', ') + '</b> (always input order — good when results must line up with inputs). Same work, same total time; only the <i>delivery order</i> differs.');
        return frames;
      }
    },
    examples: [
      { title: 'Hidden exception: the job "succeeded" silently', html: `<p><code>ex.submit(save_to_db, row)</code> in a loop, never calling <code>result()</code>. A DB error is stored inside each Future and garbage-collected — no log, no crash. ${H.c('g', 'Fix:')} iterate <code>as_completed(futs)</code> and call <code>f.result()</code> (or check <code>f.exception()</code>) for every future, or add a done-callback that logs failures.</p>`, code: `from concurrent.futures import ThreadPoolExecutor, as_completed

def save(row):
    if row == 3:
        raise ValueError(f"row {row} is invalid")
    return row

with ThreadPoolExecutor(4) as ex:
    futs = {ex.submit(save, r): r for r in range(5)}
    for f in as_completed(futs):
        try:
            f.result()
        except Exception as e:
            print("FAILED", futs[f], "->", e)` },
      { title: 'Overall deadline with as_completed(timeout)', html: `<p>Ask 5 price services, but answer the user within 1 s with whatever arrived:</p>${H.table(['service', 'latency', 'included?'], [['A', '0.2 s', H.c('g', 'yes')], ['B', '0.6 s', H.c('g', 'yes')], ['C', '3.0 s', H.c('r', 'no — TimeoutError at 1 s')]])}<p>Catch <code>TimeoutError</code> from the <code>as_completed</code> loop, then <code>cancel()</code> what has not started. Already-running calls keep running in the background (threads cannot be killed), so the underlying client should also have its own timeout.</p>` },
      { title: 'Choosing max_workers', html: `${H.table(['Work', 'Executor', 'Rule of thumb'], [['HTTP / DB calls', 'Thread', '10–100; limited by the remote side, connection pools and rate limits'], ['pure-Python CPU', 'Process', '= number of cores (more just adds context switching)'], ['NumPy / C that releases the GIL', 'Thread', '≈ cores'], ['mixed', 'both', 'thread pool for I/O feeding a process pool for CPU']])}<p>Little's law helps: workers needed ≈ request rate × latency. 200 req/s × 0.25 s = <b>50</b> concurrent calls.</p>` }
    ],
    deepDive: `<p><b>How ThreadPoolExecutor works inside.</b> <code>submit</code> wraps your call in a <code>_WorkItem</code> holding a new Future, puts it on an unbounded <code>queue.SimpleQueue</code>, and lazily starts another thread if fewer than <code>max_workers</code> exist and none is idle. Workers loop on <code>queue.get()</code>, call <code>future.set_running_or_notify_cancel()</code> (returns False if it was cancelled → skip), run the function, then <code>set_result</code>/<code>set_exception</code>, which fires callbacks <b>in the worker thread</b>. Because the queue is unbounded, submitting 10 million items holds 10 million work items in memory — bound it yourself with a <code>Semaphore</code> released in a done-callback, or submit in batches.</p>
<p><b>ProcessPoolExecutor</b> adds a management thread that moves work items into a <code>multiprocessing</code> call queue (sized just above <code>max_workers</code>), plus pickling. Since 3.11 it supports <code>max_tasks_per_child</code>. If a worker dies abruptly, every pending future fails with <code>BrokenProcessPool</code> and the pool must be recreated. <code>map</code> on a process pool accepts <code>chunksize</code>; on a thread pool it is ignored.</p>
<p><b>as_completed and wait</b> install a waiter object on every future (a small Event-like structure), so they block efficiently without polling. <code>ex.map</code> submits <b>everything immediately</b> (it is not lazy about submission, only about yielding) — beware infinite generators. Python 3.14 added a <code>buffersize</code> argument to <code>Executor.map</code> that limits how many tasks are submitted ahead, making it safe for huge or endless inputs.</p>
<p><b>Context and cleanup.</b> Executors do not propagate <code>contextvars</code>; wrap with <code>contextvars.copy_context().run</code> when you need request-scoped data (trace IDs) in workers. At interpreter exit, Python joins thread-pool workers, so a stuck task can make your program hang on exit — always give blocking calls timeouts.</p>`,
    aiEra: `<p><b>What AI changes:</b> "parallelise this loop" becomes a one-line request, and assistants usually reach for <code>ThreadPoolExecutor</code> + <code>as_completed</code>. That is often right for I/O. You add value by checking <b>error handling, ordering, bounded submission and timeouts</b>.</p>
<p><b>Use AI as a partner:</b> <code>Wrap this loop in a ThreadPoolExecutor, keep results in input order, log every failure with the input that caused it, and enforce a 10 s overall deadline</code>; then ask <code>What happens to tasks that are still running when the deadline hits?</code></p>
<p><b>Where AI goes wrong:</b> uses <code>ProcessPoolExecutor</code> with a lambda; calls <code>fut.result()</code> right after each <code>submit</code> (accidentally sequential!); ignores exceptions from <code>map</code>; assumes <code>cancel()</code> stops running work; or submits millions of tasks at once.</p>
<p><b>What you must still own:</b> sizing pools from latency and rate limits, the failure semantics you promise to callers (partial results? fail fast?), and making sure background work cannot hang shutdown.</p>`,
    problems: [{
      title: 'Hedged Request: Fastest Mirror Wins', level: 'Medium', tags: ['concurrent.futures', 'wait', 'cancellation'], companies: ['Google', 'Netflix', 'Uber'],
      statement: `<p>A file is available on several mirrors. Write <code>fetch_fastest(mirrors, fetch, timeout)</code> that requests all mirrors at once with a thread pool and returns <code>(mirror, data)</code> from the <b>first successful</b> response. Failed responses are ignored unless <b>all</b> fail, in which case raise <code>RuntimeError</code> listing the errors. If nothing succeeds within <code>timeout</code> seconds, raise <code>TimeoutError</code>. Do not wait for slow mirrors after a winner is found.</p>`,
      constraints: `<p>1 ≤ len(mirrors) ≤ 20; fetch is blocking I/O; timeout ≤ 30 s.</p>`,
      example: `<p>mirrors ${H.c('b', 'eu (0.30 s, ok), us (0.10 s, raises), asia (0.20 s, ok)')} → us fails first (ignored), asia succeeds at 0.20 s → return ${H.c('g', '("asia", data)')} without waiting for eu.</p>`,
      brute: { why: `<p>Trying mirrors one by one costs the <b>sum</b> of latencies in the worst case and always pays the latency of the first mirror even if it is the slowest. Waiting on <code>ex.map</code> is also wrong: it returns in input order, so a slow first mirror blocks you.</p>`, code: `def fetch_fastest_slow(mirrors, fetch):
    errors = []
    for m in mirrors:
        try:
            return m, fetch(m)
        except Exception as e:
            errors.append(f"{m}: {e}")
    raise RuntimeError("; ".join(errors))

print(fetch_fastest_slow(["a", "b"], str.upper))` },
      mcq: { q: 'Which call lets you react to whichever request finishes first, while keeping the others running?', options: ['ex.map(fetch, mirrors)', 'wait(futs, return_when=FIRST_COMPLETED) in a loop', 'futs[0].result()', 'ex.shutdown(wait=True)'], answer: 1, explain: 'wait(FIRST_COMPLETED) returns as soon as any future is done, giving (done, not_done). You inspect done; if it failed, loop again on not_done.' },
      hints: [`<p>Hint 1: This is a <b>race</b>: submit everything, then react to completions in finish order.</p>`, `<p>Hint 2: Loop: <code>done, pending = wait(pending, timeout=remaining, return_when=FIRST_COMPLETED)</code>. For each done future, if it has no exception → winner. Track remaining time with <code>time.monotonic()</code>.</p>`, `<p>Hint 3: On a winner, <code>cancel()</code> the pending ones and shut the executor down with <code>wait=False, cancel_futures=True</code> so you don't block on slow mirrors (they finish in the background). Empty <code>done</code> after wait → timeout.</p>`],
      solution: {
        approach: `<p>Submit all requests, then repeatedly wait for the <b>first completed</b> future among those still pending. A success wins immediately; a failure is recorded and we keep waiting. A deadline computed with <code>time.monotonic()</code> bounds the total wait. The executor is shut down without waiting so stragglers do not delay the caller.</p>`,
        code: `import time
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED

def fetch_fastest(mirrors, fetch, timeout):
    ex = ThreadPoolExecutor(max_workers=len(mirrors))
    futs = {ex.submit(fetch, m): m for m in mirrors}
    pending, errors = set(futs), []
    deadline = time.monotonic() + timeout
    try:
        while pending:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError(f"no mirror answered within {timeout}s")
            done, pending = wait(pending, timeout=remaining, return_when=FIRST_COMPLETED)
            if not done:
                raise TimeoutError(f"no mirror answered within {timeout}s")
            for f in done:
                if f.exception() is None:
                    return futs[f], f.result()          # winner
                errors.append(f"{futs[f]}: {f.exception()}")
        raise RuntimeError("all mirrors failed: " + "; ".join(errors))
    finally:
        for f in pending:
            f.cancel()                                  # drop anything not started
        ex.shutdown(wait=False, cancel_futures=True)    # don't wait for stragglers

LAT = {"eu": (0.30, True), "us": (0.10, False), "asia": (0.20, True)}

def fake_fetch(m):
    secs, ok = LAT[m]
    time.sleep(secs)
    if not ok:
        raise ConnectionError("reset")
    return f"data from {m}"

if __name__ == "__main__":
    print(fetch_fastest(["eu", "us", "asia"], fake_fetch, timeout=1.0))   # ('asia', 'data from asia')`,
        dry: { head: ['time', 'event', 'done set', 'pending', 'action'], rows: [['0.00 s', 'submit eu, us, asia', '{}', 'eu, us, asia', 'wait FIRST_COMPLETED'], ['0.10 s', 'us raises', '{us}', 'eu, asia', 'record error, wait again'], ['0.20 s', 'asia ok', '{asia}', 'eu', '<span class="c-g">return ("asia", data)</span>'], ['finally', 'cancel / shutdown(wait=False)', '', 'eu finishes in background', 'caller already has answer']] },
        complexity: `<p>Latency = min over successful mirrors (plus small overhead), bounded by timeout. Threads: len(mirrors). Cost: extra load on servers — production systems often send the second request only after a short delay (e.g. the p95 latency) to limit waste.</p>`,
        followUps: ['How would you implement a delayed hedge (send the 2nd request only after 50 ms)?', 'Write the asyncio version with asyncio.wait and task.cancel().', 'Why can the losing thread not be killed, and what does that mean for resource use?']
      }
    }]
  });

  /* ================= TOPIC 5: asyncio event loop ================= */
  topics.push({
    title: 'The asyncio Event Loop and async/await: One Thread, Many Waiting Tasks',
    analogy: `<p>A single <b>waiter</b> serves ten tables. She takes table 1's order, gives it to the kitchen, and <b>instead of standing there waiting</b>, walks to table 2. When the kitchen rings the bell, she picks up the dish and carries it out. One waiter, many tables, nobody idle. The waiter is the <b>event loop</b>, each table is a <b>task</b>, "give the order and walk away" is <code>await</code>, and the kitchen bell is the operating system saying "your data has arrived". The one rule: a waiter who stops to <b>cook a three-course meal herself</b> (CPU work or a blocking call) freezes the whole restaurant.</p>`,
    explain: `<p>🟢 <b>asyncio</b> runs many I/O tasks <b>concurrently on a single thread</b>. There is no GIL fight and no locking of every variable, because only one task runs at a time and it only switches at <code>await</code> points you can see.</p>
<pre>import asyncio

async def brew(name, secs):          # "async def" makes a coroutine function
    print(name, "start")
    await asyncio.sleep(secs)        # pause HERE, let other tasks run
    print(name, "done")
    return name

async def main():
    results = await asyncio.gather(brew("tea", 2), brew("coffee", 1))
    print(results)                   # ['tea', 'coffee'] after ~2 s, not 3

asyncio.run(main())                  # create a loop, run main(), close the loop</pre>
<p>🔵 <b>The words, plainly:</b></p>
${H.table(['Word', 'Meaning'], [['<b>coroutine function</b>', 'a function defined with <code>async def</code>'], ['<b>coroutine object</b>', 'what calling it returns — <b>nothing runs yet</b>! It is a paused recipe'], ['<code>await x</code>', '"run x; if it has to wait, pause me and let the loop run others"'], ['<b>awaitable</b>', 'anything you can await: coroutines, Tasks, Futures'], ['<b>Task</b>', 'a coroutine scheduled on the loop to run on its own (<code>asyncio.create_task</code>)'], ['<b>event loop</b>', 'the scheduler: runs ready tasks, waits for I/O and timers, wakes tasks up']])}
<p><b>What the loop does, over and over:</b></p>
<ol>
<li>Take each task from the <b>ready queue</b> and run it until its next <code>await</code> that really has to wait.</li>
<li>That task is now <b>parked</b>: waiting on a timer, a socket, or another Future.</li>
<li>When the ready queue is empty, ask the OS (<code>epoll</code>/<code>kqueue</code>/IOCP via <code>selectors</code>): "which sockets are ready? sleep until the next timer at most".</li>
<li>Move the woken tasks back to the ready queue. Repeat.</li>
</ol>
<p><b>Cooperative, not preemptive:</b> a task keeps the thread until it awaits. That makes reasoning easier (no surprise switches between two lines without an <code>await</code>), but one slow function blocks everyone.</p>
${H.table(['', 'Threads', 'asyncio'], [['who switches', 'OS/interpreter, any time', 'only at <code>await</code>'], ['cost per unit', '~8 MB virtual stack, OS thread', '~2 KB coroutine object'], ['practical count', 'hundreds–low thousands', 'tens of thousands+'], ['works with blocking libs (requests)', H.c('g', 'yes'), H.c('r', 'no — need async libs (httpx, aiohttp, asyncpg) or to_thread')], ['shared-state bugs', 'anywhere', 'only across awaits']])}
<p>🟣 <b>Also know:</b> <code>async with</code> (async context managers: connections, locks), <code>async for</code> (async iterators: streaming responses), <code>asyncio.sleep(0)</code> = "yield to others right now". Production servers (FastAPI/Uvicorn) often swap in <b>uvloop</b>, a faster loop written on libuv.</p>`,
    clues: [
      '"handle 10,000 concurrent connections / websockets / chat clients" → asyncio (cheap tasks, one thread)',
      '"call 100 APIs concurrently using httpx / aiohttp" → asyncio + gather/TaskGroup',
      '"RuntimeWarning: coroutine was never awaited" → you called an async function without await or create_task',
      '"what does await actually do?" → suspend this coroutine, return control to the event loop until the awaitable is done',
      '"single-threaded but concurrent" / "cooperative multitasking" → event loop',
      '"output order puzzle with asyncio.sleep" → trace ready queue + timers by hand'
    ],
    code: [{ lang: 'python', title: 'A coroutine is a pausable object — drive one by hand (runnable)', run: true, code: `import types

@types.coroutine
def pause(reason):
    """A tiny awaitable: yields a message up to whoever drives the coroutine."""
    reply = yield reason          # this is exactly how asyncio Futures suspend
    return reply

async def order_coffee():
    print("  coroutine: placing order")
    size = await pause("need cup size")
    print("  coroutine: got size", size)
    temp = await pause("need temperature")
    print("  coroutine: got temp", temp)
    return f"{size} {temp} coffee"

coro = order_coffee()             # NOTHING runs yet - it's just an object
print("created:", type(coro).__name__)

msg = coro.send(None)             # start it; runs until the first await pauses
print("driver got:", msg)
msg = coro.send("large")          # resume with a value
print("driver got:", msg)
try:
    coro.send("hot")              # resume again; this time it returns
except StopIteration as done:
    print("finished with:", done.value)
` }, { lang: 'python', title: 'The classic interleaving puzzle (run locally)', code: `import asyncio
import time

async def task(name, delay):
    print(f"{time.perf_counter() - T0:.1f}s {name} start")
    await asyncio.sleep(delay)            # parks the task on a timer
    print(f"{time.perf_counter() - T0:.1f}s {name} end")
    return name

async def main():
    # create_task schedules all three immediately; gather waits for all
    results = await asyncio.gather(task("A", 2), task("B", 1), task("C", 3))
    print("results in argument order:", results)

T0 = time.perf_counter()
asyncio.run(main())
# 0.0s A start / 0.0s B start / 0.0s C start
# 1.0s B end / 2.0s A end / 3.0s C end
# results in argument order: ['A', 'B', 'C']   total ≈ 3 s, not 6 s
` }],
    codeTitle: ['Hand-driven coroutine', 'Interleaving demo'],
    viz: {
      title: 'Inside the event loop: ready queue, sleeping tasks, and the clock',
      input: 'A:2 B:1 C:3',
      inputLabel: 'tasks as name:sleepSeconds (up to 5, seconds 0-9)',
      gen: function (input) {
        var toks = words(input || 'A:2 B:1 C:3');
        if (!toks.length || toks.length > 5) throw new Error('Give 1-5 tasks like A:2 B:1 C:3');
        var tasks = toks.map(function (t) {
          var m = /^([A-Za-z]\w{0,5}):(\d)$/.exec(t);
          if (!m) throw new Error('Each task must look like A:2 (name:seconds 0-9)');
          return { name: m[1], d: Number(m[2]), stage: 0, wake: -1 };
        });
        var code = 'async def worker(name, secs):\n    print(name, "start")\n    await asyncio.sleep(secs)\n    print(name, "end")\n    return name';
        var ready = tasks.map(function (t, i) { return i; }), sleeping = [], out = [], clock = 0, frames = [], seq = 0;
        function snap(narr, line, cls, running) {
          var hl = {}; if (line) hl[line] = cls || 'cur';
          sleeping.sort(function (a, b) { return tasks[a].wake - tasks[b].wake || tasks[a].seq - tasks[b].seq; });
          frames.push(fr(narr, [
            cp(code, hl, running !== undefined ? 'Running now: task ' + tasks[running].name : 'Coroutine code'),
            { type: 'queue', label: 'Ready queue (will run next, in order)', items: ready.map(function (i) { return tasks[i].name; }), frontLabel: 'next', backLabel: 'last' },
            { type: 'table', label: 'Parked tasks: waiting on a timer (heap ordered by wake time)', columns: ['task', 'awaiting', 'wakes at'], rows: sleeping.map(function (i) { return [tasks[i].name, 'sleep(' + tasks[i].d + ')', tasks[i].wake + 's']; }), hl: sleeping.length ? { 0: 'win' } : {} },
            vp({ 'loop clock': clock + 's', 'running task': running !== undefined ? tasks[running].name : '(loop itself)', 'tasks finished': tasks.filter(function (t) { return t.stage === 2; }).length + ' / ' + tasks.length }, 'loop clock', 'cur'),
            outBox(out)
          ]));
        }
        snap('<code>asyncio.gather</code> wraps each coroutine in a <b>Task</b>. New tasks go to the back of the <b>ready queue</b>. Nothing has run yet — the loop starts its first pass.');
        var guard = 0;
        while (guard++ < 60) {
          if (ready.length) {
            var i = ready.shift(), t = tasks[i];
            if (t.stage === 0) {
              out.push(clock + 's ' + t.name + ' start');
              snap('Loop pops <b>' + t.name + '</b> from the ready queue and runs it. It prints "' + t.name + ' start".', 2, 'cur', i);
              t.stage = 1; t.wake = clock + t.d; t.seq = seq++;
              if (t.d === 0) {
                ready.push(i);
                snap('<code>await asyncio.sleep(0)</code> is special: it just <b>yields</b> — ' + t.name + ' goes straight to the back of the ready queue so others get a turn.', 3, 'cur', i);
              } else {
                sleeping.push(i);
                snap('<b>' + t.name + '</b> hits <code>await asyncio.sleep(' + t.d + ')</code>. The loop sets a timer for t=' + t.wake + 's and <b>parks</b> the task. Control returns to the loop instantly — no thread is blocked.', 3, 'win', i);
              }
            } else {
              out.push(clock + 's ' + t.name + ' end');
              t.stage = 2;
              snap('Loop resumes <b>' + t.name + '</b> right after its await. It prints "' + t.name + ' end" and returns → the Task is <b>done</b> and its result is stored for gather.', 5, 'ok', i);
            }
          } else if (sleeping.length) {
            sleeping.sort(function (a, b) { return tasks[a].wake - tasks[b].wake || tasks[a].seq - tasks[b].seq; });
            var nextWake = tasks[sleeping[0]].wake, woke = [];
            var waitFor = nextWake - clock;
            clock = nextWake;
            while (sleeping.length && tasks[sleeping[0]].wake === clock) { var w = sleeping.shift(); ready.push(w); woke.push(tasks[w].name); }
            snap('Ready queue is empty, so the loop calls the OS selector: "wake me when a socket is ready, or in ' + waitFor + 's at most" (the nearest timer). The thread sleeps using 0% CPU. Clock jumps to <b>' + clock + 's</b>; timer(s) for <b>' + woke.join(', ') + '</b> fire → moved to the ready queue.', 3, 'ok');
          } else break;
        }
        snap('<b>All tasks done at t = ' + clock + 's.</b> Sequential code would take ' + tasks.reduce(function (s, t) { return s + t.d; }, 0) + 's. Concurrency here = the waits overlapped; total = the longest single wait. gather returns results in <b>argument order</b>: [' + tasks.map(function (t) { return "'" + t.name + "'"; }).join(', ') + '].');
        return frames;
      }
    },
    examples: [
      { title: 'Calling without await does nothing', html: `<p><code>brew("tea", 1)</code> on its own line just creates a coroutine object and throws it away. Python warns: <code>RuntimeWarning: coroutine 'brew' was never awaited</code>. Nothing printed, nothing brewed.</p>${H.table(['You wrote', 'What happens'], [['<code>brew("tea", 1)</code>', H.c('r', 'object created, never run')], ['<code>await brew("tea", 1)</code>', H.c('g', 'runs now, you wait for it')], ['<code>asyncio.create_task(brew("tea", 1))</code>', H.c('g', 'runs in the background; keep the task reference!')]])}` },
      { title: 'await one-by-one is still sequential', html: `<p>This takes <b>3 s</b>, not 2 s:</p><pre>await brew("tea", 2)      # waits 2 s
await brew("coffee", 1)   # only starts after tea finishes</pre><p>Awaiting a coroutine directly runs it to completion before moving on. To overlap, schedule them first (<code>gather</code>, <code>TaskGroup</code>, or <code>create_task</code>), then await. That is the #1 "my async code isn't faster" bug.</p>` },
      { title: 'Order puzzle with sleep(0)', html: `<p>Tasks X and Y each print twice with <code>await asyncio.sleep(0)</code> between prints. Output: <b>X1 Y1 X2 Y2</b>. <code>sleep(0)</code> puts X at the back of the ready queue, so Y gets its turn. Without the sleep, X would print X1 X2 before Y ever ran — there is no await, so no switch.</p>`, code: `import asyncio

async def show(name):
    print(name + "1")
    await asyncio.sleep(0)     # yield to the loop
    print(name + "2")

async def main():
    await asyncio.gather(show("X"), show("Y"))

asyncio.run(main())   # X1 Y1 X2 Y2` },
      { title: 'async with and async for', html: `<p>Async context managers and iterators let setup/teardown and each "next item" await I/O:</p><pre>async with httpx.AsyncClient() as client:        # opens/closes a connection pool
    r = await client.get(url)

async for chunk in response.aiter_bytes():        # each chunk may wait on the network
    sink.write(chunk)</pre><p>Under the hood these call <code>__aenter__</code>/<code>__aexit__</code> and <code>__aiter__</code>/<code>__anext__</code>, which return awaitables.</p>` }
    ],
    deepDive: `<p><b>Coroutines are generators in disguise.</b> A native coroutine is implemented with the same frame-suspension machinery as generators. <code>await x</code> calls <code>x.__await__()</code> and delegates to it like <code>yield from</code>. At the bottom of every await chain sits an <code>asyncio.Future</code> whose <code>__await__</code> literally <code>yield</code>s itself to the Task driving the coroutine. The Task (a Future subclass) then adds a done-callback to that Future: "when you're done, schedule my <code>__step</code> again". That callback goes into the loop's <code>_ready</code> deque. <b>That is the whole trick.</b></p>
<p><b>One loop iteration (<code>_run_once</code>):</b> compute timeout = 0 if <code>_ready</code> is non-empty, else time until the earliest timer in the <code>_scheduled</code> heap; call <code>selector.select(timeout)</code> and add callbacks for ready file descriptors; pop all due timers into <code>_ready</code>; then run exactly the callbacks that are in <code>_ready</code> <b>at this moment</b> (new ones wait for the next iteration — this prevents starvation). <code>asyncio.sleep(d)</code> = create a Future + <code>loop.call_later(d, fut.set_result, None)</code>.</p>
<p><b>Thread safety.</b> The loop is <b>not</b> thread-safe. From another thread use <code>loop.call_soon_threadsafe(cb)</code> (writes to a self-pipe to wake the selector) or <code>asyncio.run_coroutine_threadsafe(coro, loop)</code>, which returns a <code>concurrent.futures.Future</code>. Each thread has at most one running loop; <code>asyncio.run</code> refuses to start inside a running loop (that's why Jupyter users use top-level <code>await</code> instead).</p>
<p><b>Performance reality.</b> A task switch costs a few microseconds; a pure-asyncio loop can do roughly tens of thousands of simple network round-trips per second per core; uvloop is ~2–4× faster. Python 3.12 added <code>asyncio.eager_task_factory</code> (start running a task synchronously until its first real suspension, saving a loop round-trip), and 3.14 added <code>python -m asyncio ps PID</code> / <code>pstree</code> to inspect the tasks of a running process. Beyond one core you run several processes, each with its own loop (e.g. <code>uvicorn --workers 4</code>).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes async endpoints and clients fluently, and modern LLM SDKs (Anthropic, OpenAI) ship async clients, so fan-out of many model calls with asyncio is now everyday code. Your job is to make sure the code is <b>actually concurrent</b> and <b>never blocks the loop</b>.</p>
<p><b>Use AI as a partner:</b> <code>Mark every line in this async function where the event loop could switch tasks</code>; <code>Find blocking calls (requests, time.sleep, open(), heavy JSON) inside async def</code>; <code>Predict the output order of this asyncio snippet and explain using the ready queue</code> — then verify by running it.</p>
<p><b>Where AI goes wrong:</b> sequential <code>await</code>s in a loop where it meant to overlap work; calling <code>asyncio.run()</code> inside an already-running loop (Jupyter, FastAPI handlers); mixing <code>requests</code> into async code; inventing APIs like <code>asyncio.run_all</code>.</p>
<p><b>What you must still own:</b> the event-loop mental model (ready queue, parked tasks, selector), predicting interleavings, and deciding between asyncio, threads and processes for a given workload.</p>`,
    problems: [{
      title: 'Build a Mini Event Loop with Generators', level: 'Hard', tags: ['generators', 'event loop', 'scheduling', 'heapq'], companies: ['Google', 'Jane Street', 'Meta'],
      statement: `<p>Implement <code>run(tasks)</code>, a tiny cooperative scheduler. Each task is a <b>generator</b> that can <code>yield ("sleep", secs)</code> to pause for simulated seconds, or <code>yield None</code> to just give others a turn. Use a <b>simulated clock</b> (no real waiting). Tasks that are ready run in FIFO order; when none are ready, jump the clock to the earliest wake-up. Return the log of <code>(time, message)</code> pairs the tasks produced via a <code>log</code> helper.</p>`,
      constraints: `<p>Up to 10<sup>4</sup> tasks, up to 10<sup>5</sup> yields total. Ties in wake-up time are resolved by the order the sleeps were requested.</p>`,
      example: `<p>Task A: log "A1", sleep 2, log "A2". Task B: log "B1", sleep 1, log "B2".<br>Output: ${H.c('g', '[(0, A1), (0, B1), (1, B2), (2, A2)]')} — both start at t=0; B wakes first at t=1; A wakes at t=2. Exactly what asyncio prints for the same sleeps.</p>`,
      brute: { why: `<p>Running each generator to completion one after another ignores sleeps as concurrency points: B can't start until A finishes, so time adds up (A's 2 s + B's 1 s) and the log order is wrong.</p>`, code: `def run_sequential(tasks):
    clock, log = 0, []
    for name, gen in tasks:
        for req in gen(log, lambda: clock):
            if req and req[0] == "sleep":
                clock += req[1]
    return log

print(run_sequential([]))` },
      mcq: { q: 'The ready queue is empty and two tasks are sleeping until t=5 and t=3. What should the loop do?', options: ['Busy-loop, incrementing the clock by 1', 'Jump the clock to 3 and wake that task', 'Wake both tasks now', 'Stop: nothing is ready'], answer: 1, explain: 'A real loop asks the OS to sleep until the nearest timer (or I/O). In simulation we jump the clock straight to the earliest wake time — a min-heap gives it in O(log n).' },
      hints: [`<p>Hint 1: You need two structures: a FIFO <b>ready deque</b> and a <b>min-heap</b> of sleepers keyed by (wake_time, sequence_number).</p>`, `<p>Hint 2: To run a task one step: <code>req = next(gen)</code> inside try/except StopIteration. If req is ("sleep", s) push (clock + s, seq, gen) on the heap; if None, append back to the ready deque.</p>`, `<p>Hint 3: Main loop: while ready or heap: if ready → step one task; else pop the earliest sleeper, set clock to its time, and also move every other sleeper with the same time (keeping seq order). The sequence counter breaks ties and avoids comparing generators.</p>`],
      solution: {
        approach: `<p>This is asyncio's core in 30 lines: a ready deque (like <code>loop._ready</code>), a timer heap (like <code>loop._scheduled</code>), and a "step" that resumes a coroutine until its next yield. The simulated clock replaces <code>selector.select(timeout)</code>.</p>`,
        code: { lang: 'python', run: true, code: `import heapq
from collections import deque

def run(tasks):
    """tasks: list of (name, generator_function(log, now))."""
    clock = 0
    log = []
    ready = deque()
    sleepers = []                       # heap of (wake_time, seq, gen)
    seq = 0

    def now():
        return clock

    for name, fn in tasks:
        ready.append(fn(lambda msg: log.append((clock, msg)), now))

    while ready or sleepers:
        if not ready:                   # nothing runnable: jump to next timer
            wake, _, gen = heapq.heappop(sleepers)
            clock = wake
            ready.append(gen)
            while sleepers and sleepers[0][0] == clock:
                ready.append(heapq.heappop(sleepers)[2])
            continue
        gen = ready.popleft()
        try:
            req = next(gen)             # run until the task's next yield
        except StopIteration:
            continue                    # task finished
        if req is None:
            ready.append(gen)           # like await asyncio.sleep(0)
        elif req[0] == "sleep":
            heapq.heappush(sleepers, (clock + req[1], seq, gen))
            seq += 1
    return log

def task_a(log, now):
    log("A1")
    yield ("sleep", 2)
    log("A2")

def task_b(log, now):
    log("B1")
    yield ("sleep", 1)
    log("B2")
    yield None
    log("B3 at t=" + str(now()))

print(run([("A", task_a), ("B", task_b)]))
# [(0, 'A1'), (0, 'B1'), (1, 'B2'), (1, 'B3 at t=1'), (2, 'A2')]
` },
        dry: { head: ['clock', 'ready deque', 'sleepers heap', 'action', 'log'], rows: [['0', 'A, B', '[]', 'step A → sleep 2', 'A1'], ['0', 'B', '[(2,A)]', 'step B → sleep 1', 'A1, B1'], ['1', 'B', '[(2,A)]', 'jump clock; step B → yield None; step B → done', '+ B2, B3'], ['2', 'A', '[]', 'jump clock; step A → done', '+ A2']] },
        complexity: `<p>Each yield costs O(1) for a ready requeue or O(log S) for a heap push, where S = number of sleepers. Total O(Y log S) for Y yields; memory O(T) for T tasks.</p>`,
        followUps: ['Add I/O readiness: tasks yield ("read", fd) and you use selectors.select(timeout).', 'Add a join: a task yields ("wait", other_task) and resumes when it finishes.', 'How does asyncio avoid starving timers when tasks keep yielding None?']
      }
    }]
  });

  /* ================= TOPIC 6: Tasks, gather, TaskGroup ================= */
  topics.push({
    title: 'Tasks, gather, TaskGroup, Timeouts, Cancellation and Rate Limiting',
    analogy: `<p>You are a <b>tour guide</b> with a group. <code>gather</code> is "everyone go explore, meet me here" — if one tourist gets lost, you hear about it, but the others <b>keep wandering</b> and you may forget about them. <code>TaskGroup</code> is a <b>strict school trip</b>: if one kid gets hurt, the teacher <b>calls everyone back</b> immediately, waits until all are on the bus, then reports what happened. A <b>timeout</b> is "the bus leaves at 5 pm, ready or not". A <b>Semaphore</b> is a museum that only lets <b>3 of your group</b> inside at once.</p>`,
    explain: `<p>🟢 <b>Getting things to overlap.</b> A coroutine only runs concurrently once it is wrapped in a <b>Task</b>. Three common ways:</p>
<pre>t = asyncio.create_task(fetch(a))          # start now in the background; await t later
results = await asyncio.gather(fetch(a), fetch(b))   # run all, results in argument order
async with asyncio.TaskGroup() as tg:      # 3.11+: structured concurrency
    t1 = tg.create_task(fetch(a))
    t2 = tg.create_task(fetch(b))
# here both are finished (or everything was cancelled and an ExceptionGroup is raised)</pre>
<p>🔵 <b>What happens when one task fails?</b></p>
${H.table(['Tool', 'One task raises…', 'Other tasks', 'You get'], [['<code>gather(...)</code>', 'first exception is raised to the awaiter right away', H.c('r', 'keep running, unwatched'), 'that one exception'], ['<code>gather(..., return_exceptions=True)</code>', 'nothing raised', 'keep running', 'a list mixing results and exception objects'], ['<code>TaskGroup</code>', 'group cancels all siblings', H.c('g', 'cancelled and awaited'), '<code>ExceptionGroup</code> (catch with <code>except*</code>)']])}
<p><b>Timeouts:</b> <code>async with asyncio.timeout(2):</code> (3.11+) or <code>await asyncio.wait_for(coro, 2)</code>. When time runs out the inner task is <b>cancelled</b> and you get <code>TimeoutError</code>.</p>
<p><b>Cancellation</b> works by throwing <code>asyncio.CancelledError</code> <b>into the task at its current await</b>. That lets <code>try/finally</code> and <code>async with</code> clean up (close sockets, release locks). Rules: don't swallow <code>CancelledError</code> (re-raise it after cleanup); <code>asyncio.shield(x)</code> protects an inner operation from an outer cancel.</p>
<p><b>Limiting concurrency:</b> firing 10,000 requests at once gets you rate-limited or banned. Use <code>asyncio.Semaphore(k)</code>:</p>
<pre>sem = asyncio.Semaphore(10)
async def limited(url):
    async with sem:                 # at most 10 bodies inside at once
        return await fetch(url)</pre>
<p>…or a fixed pool of <b>worker tasks</b> reading from an <code>asyncio.Queue</code> — better for very large or endless inputs because you don't create a task per item up front.</p>
<p>🟣 <b>More tools:</b> <code>asyncio.as_completed(aws)</code> (finish order), <code>asyncio.wait(tasks, return_when=FIRST_COMPLETED)</code>, <code>asyncio.Event</code>, <code>asyncio.Lock</code> (protects state <b>across awaits</b>), <code>asyncio.Queue</code> (with <code>shutdown()</code> in 3.13+), <code>asyncio.Barrier</code> (3.11).</p>`,
    clues: [
      '"run N async calls concurrently and collect results" → gather / TaskGroup',
      '"if any call fails, cancel the rest" / "no orphan tasks" → TaskGroup (structured concurrency)',
      '"at most K requests in flight" / "respect a rate limit" → asyncio.Semaphore or K worker tasks + Queue',
      '"each call must finish within 2 s" → asyncio.timeout / wait_for',
      '"collect partial results even if some fail" → gather(return_exceptions=True)',
      '"stream results as they arrive" → asyncio.as_completed',
      '"process an endless stream with bounded memory" → asyncio.Queue(maxsize) + worker tasks'
    ],
    code: [{ lang: 'python', title: 'gather vs TaskGroup on failure (run locally)', code: `import asyncio

async def job(name, secs, fail=False):
    try:
        await asyncio.sleep(secs)
        if fail:
            raise ValueError(f"{name} failed")
        print("  finished", name)
        return name
    except asyncio.CancelledError:
        print("  cancelled", name)
        raise                                  # always re-raise after cleanup

async def with_gather():
    try:
        await asyncio.gather(job("A", 0.2), job("B", 0.1, fail=True), job("C", 0.3))
    except ValueError as e:
        print("gather raised:", e)             # A and C are STILL running here
    await asyncio.sleep(0.3)                   # ...and they finish on their own

async def with_taskgroup():
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(job("A", 0.2))
            tg.create_task(job("B", 0.1, fail=True))
            tg.create_task(job("C", 0.3))
    except* ValueError as eg:                  # ExceptionGroup handling (3.11+)
        print("TaskGroup raised:", [str(e) for e in eg.exceptions])

print("--- gather"); asyncio.run(with_gather())
print("--- TaskGroup"); asyncio.run(with_taskgroup())
` }, { lang: 'python', title: 'Semaphore + timeout + as_completed (run locally)', code: `import asyncio
import random

async def fetch(i):
    await asyncio.sleep(random.uniform(0.05, 0.3))   # pretend network call
    return i * 10

async def main():
    sem = asyncio.Semaphore(3)                        # max 3 in flight
    in_flight = peak = 0

    async def limited(i):
        nonlocal in_flight, peak
        async with sem:
            in_flight += 1
            peak = max(peak, in_flight)
            try:
                async with asyncio.timeout(1.0):      # per-call deadline
                    return await fetch(i)
            finally:
                in_flight -= 1

    tasks = [asyncio.create_task(limited(i)) for i in range(10)]
    for coro in asyncio.as_completed(tasks):          # finish order
        print("got", await coro)
    print("peak concurrency:", peak)                  # never above 3

asyncio.run(main())
` }],
    codeTitle: ['Failure semantics', 'Limits and deadlines'],
    viz: {
      title: 'Sequential vs gather vs TaskGroup when one task fails',
      input: '3 1x 2',
      inputLabel: 'task durations in seconds (1-9); add x to make one fail, e.g. 3 1x 2',
      gen: function (input) {
        var toks = words(input || '3 1x 2');
        if (!toks.length || toks.length > 4) throw new Error('Give 1-4 durations like 3 1x 2');
        var T = toks.map(function (t, i) {
          var m = /^(\d)(x?)$/i.exec(t);
          if (!m || m[1] === '0') throw new Error('Each item is a digit 1-9, optionally followed by x (fails), e.g. 3 1x 2');
          return { name: String.fromCharCode(65 + i), d: Number(m[1]), fail: !!m[2] };
        });
        var frames = [];
        function sim(mode) {
          var start = T.map(function () { return mode === 'seq' ? null : 0; }), end = [], failAt = null, horizon = 0, i;
          if (mode === 'seq') {
            var acc = 0;
            for (i = 0; i < T.length; i++) { start[i] = acc; acc += T[i].d; if (T[i].fail) { failAt = acc; break; } }
          } else {
            T.forEach(function (t) { if (t.fail && (failAt === null || t.d < failAt)) failAt = t.d; });
          }
          T.forEach(function (t, k) {
            if (start[k] === null) { end[k] = { s: 'never', at: 0 }; return; }
            var finish = start[k] + t.d;
            if (mode === 'tg' && failAt !== null && finish > failAt) end[k] = { s: 'cancel', at: failAt };
            else end[k] = { s: t.fail ? 'fail' : 'ok', at: finish };
            horizon = Math.max(horizon, end[k].at);
          });
          return { start: start, end: end, horizon: horizon, failAt: failAt };
        }
        var modes = [['seq', 'Sequential awaits', 'await a(); await b(); await c()'], ['gather', 'asyncio.gather', 'await asyncio.gather(a(), b(), c())'], ['tg', 'asyncio.TaskGroup', 'async with TaskGroup() as tg: tg.create_task(...) x3']];
        var summary = [];
        modes.forEach(function (md) {
          var r = sim(md[0]), H2 = Math.max(1, r.horizon);
          var grid = T.map(function () { return []; });
          frames.push(fr('<b>' + md[1] + '</b>: <code>' + md[2] + '</code>. Tasks: ' + T.map(function (t) { return t.name + ' (' + t.d + 's' + (t.fail ? ', raises' : '') + ')'; }).join(', ') + '. Watch the timeline second by second.', [tx('<b>' + md[1] + '</b> — legend: <b>run</b> = awaiting I/O, ✓ = finished in that second, ✗ = raised, ⊘ = cancelled, · = not started, — = already over', 'Mode')]));
          for (var s = 0; s < H2; s++) {
            var events = [];
            T.forEach(function (t, i) {
              var st = r.start[i], e = r.end[i];
              var cell = '·';
              if (st !== null && s >= st && s < e.at - 1) cell = 'run';
              else if (st !== null && s === e.at - 1) cell = e.s === 'ok' ? 'run ✓' : e.s === 'fail' ? 'run ✗' : 'run ⊘';
              else if (st !== null && s >= e.at) cell = '—';
              if (st !== null && s === e.at - 1) {
                if (e.s === 'ok') events.push(t.name + ' finishes at ' + e.at + 's');
                if (e.s === 'fail') events.push('<span class="c-r">' + t.name + ' raises at ' + e.at + 's</span>');
              }
              if (e.s === 'cancel' && s === e.at - 1) events.push('<span class="c-y">' + t.name + ' gets CancelledError at ' + e.at + 's</span>');
              grid[i].push(cell);
            });
            var hl = {};
            grid.forEach(function (row, i) { row.forEach(function (c, j) { hl[i + ',' + j] = c === 'run' ? (j === s ? 'cur' : 'win') : c === 'run ✓' ? 'ok' : c === 'run ✗' ? 'bad' : c === 'run ⊘' ? 'sel' : 'done'; }); });
            var extra = '';
            if (r.failAt !== null && s === r.failAt - 1) {
              if (md[0] === 'seq') extra = ' The exception propagates out of the function: later awaits <b>never start</b>.';
              if (md[0] === 'gather') extra = ' <code>gather</code> raises to the caller <b>now</b> — but the other tasks are <b>not cancelled</b>; they keep running with nobody watching.';
              if (md[0] === 'tg') extra = ' The TaskGroup <b>cancels every sibling</b>, waits for them to unwind, then raises an <code>ExceptionGroup</code>.';
            }
            frames.push(fr('<b>' + md[1] + ', t = ' + s + '→' + (s + 1) + 's.</b> ' + (events.length ? events.join('; ') + '.' : 'Tasks are awaiting I/O.') + extra, [
              { type: 'grid', label: md[1] + ' timeline (columns = seconds)', rows: grid.map(function (g) { return g.slice(); }), rowHead: T.map(function (t) { return t.name; }), colHead: range(grid[0].length, function (j) { return j + '-' + (j + 1) + 's'; }), hl: hl }
            ]));
          }
          var caller = r.failAt !== null ? 'caller sees the error at ' + r.failAt + 's' : 'caller gets all results at ' + r.horizon + 's';
          summary.push([md[1], r.horizon + 's', caller, md[0] === 'gather' && r.failAt !== null ? 'yes — siblings ran on unwatched' : md[0] === 'tg' && r.failAt !== null ? 'no — siblings cancelled' : md[0] === 'seq' && r.failAt !== null ? 'later tasks never ran' : 'none']);
        });
        frames.push(fr('<b>Compare.</b> Sequential is slowest. <code>gather</code> overlaps the waits but can leave <b>orphan tasks</b> after a failure. <code>TaskGroup</code> overlaps the waits <b>and</b> guarantees that when the block exits, no child task is still running. Prefer TaskGroup in new code; use <code>gather(return_exceptions=True)</code> when you want partial results.', [
          { type: 'table', label: 'Summary', columns: ['mode', 'last activity ends', 'caller', 'orphans?'], rows: summary, hl: { 2: 'ok' } }
        ]));
        return frames;
      }
    },
    examples: [
      { title: 'The lost-task bug: create_task without keeping a reference', html: `<p><code>asyncio.create_task(send_email())</code> on its own line: the loop keeps only a <b>weak</b> reference to tasks, so a task with no other reference can be garbage-collected mid-flight and silently disappear (the docs warn about this). ${H.c('g', 'Fix:')} keep tasks in a set and discard them when done — or better, use a TaskGroup.</p>`, code: `import asyncio

background = set()

def fire_and_forget(coro):
    task = asyncio.create_task(coro)
    background.add(task)                       # strong reference
    task.add_done_callback(background.discard) # remove when finished
    return task` },
      { title: 'Timeouts that clean up properly', html: `<p>With <code>asyncio.timeout(2)</code>, the inner await receives <code>CancelledError</code> at 2 s; <code>finally</code> blocks run; then the context manager converts it to <code>TimeoutError</code> for you.</p>${H.table(['t', 'event'], [['0 s', 'enter timeout(2), start download'], ['2 s', 'deadline → CancelledError thrown into the await'], ['2 s', '<code>finally:</code> closes the connection'], ['2 s', H.c('r', 'TimeoutError raised to your code')]])}`, code: `import asyncio

async def slow():
    try:
        await asyncio.sleep(10)
    finally:
        print("cleanup ran")          # runs on cancellation too

async def main():
    try:
        async with asyncio.timeout(0.1):
            await slow()
    except TimeoutError:
        print("timed out")

asyncio.run(main())` },
      { title: 'Worker pool with asyncio.Queue (bounded memory)', html: `<p>For 1,000,000 URLs, creating 1,000,000 tasks costs memory. Instead: a queue with <code>maxsize=100</code>, <b>K worker tasks</b> that loop on <code>await q.get()</code>, and a producer that <code>await q.put()</code>s (pausing when the queue is full — back-pressure). Finish with <code>await q.join()</code> and cancel the workers, or use <code>q.shutdown()</code> on 3.13+.</p>`, code: `import asyncio

async def worker(name, q, results):
    while True:
        n = await q.get()
        try:
            await asyncio.sleep(0.01)          # pretend I/O
            results.append(n * n)
        finally:
            q.task_done()

async def main():
    q = asyncio.Queue(maxsize=5)
    results = []
    workers = [asyncio.create_task(worker(f"w{i}", q, results)) for i in range(3)]
    for n in range(20):
        await q.put(n)                         # waits when the queue is full
    await q.join()                             # every item processed
    for w in workers:
        w.cancel()
    await asyncio.gather(*workers, return_exceptions=True)
    print(len(results), "results")

asyncio.run(main())` }
    ],
    deepDive: `<p><b>How cancellation really works.</b> <code>task.cancel()</code> sets a flag and, at the task's next step, the Task calls <code>coro.throw(CancelledError)</code> at the current <code>await</code>. If the awaited thing is itself a Task/Future it is cancelled too, so cancellation flows <b>down</b> the await chain. Since 3.11 tasks track a cancel <b>count</b> (<code>task.cancelling()</code>, <code>task.uncancel()</code>) so <code>asyncio.timeout</code> and TaskGroup can tell "my own cancellation" from "someone cancelled the outer task" — which is why swallowing <code>CancelledError</code> breaks them. <code>CancelledError</code> inherits from <code>BaseException</code> (3.8+) so a plain <code>except Exception</code> won't catch it by accident.</p>
<p><b>gather's sharp edges.</b> If the gather Future itself is cancelled, all children are cancelled. But if a child fails (without <code>return_exceptions</code>), the others continue, and their later exceptions go to the "Task exception was never retrieved" log at garbage-collection time. TaskGroup (inspired by Trio's nurseries) fixes this with <b>structured concurrency</b>: a child's lifetime is bounded by the <code>async with</code> block, like a function call. Python 3.11 also added <code>ExceptionGroup</code> and <code>except*</code> for exactly this.</p>
<p><b>Rate limiting vs concurrency limiting.</b> A Semaphore caps <b>in-flight</b> requests; it does not cap <b>requests per second</b>. For "100 requests/minute" use a token bucket (refill tokens over time with <code>loop.time()</code>) or a library like <code>aiolimiter</code>, and honour <code>Retry-After</code> headers with exponential backoff + jitter. LLM APIs typically limit both requests and tokens per minute — you often need both a Semaphore and a token bucket.</p>
<p><b>Tasks and memory.</b> A Task costs roughly 1–2 KB plus its coroutine frame. 100k tasks are fine; 10M is not. <code>asyncio.as_completed</code> in 3.13+ can also be used with <code>async for</code> and yields the original tasks. <code>asyncio.wait</code> requires Tasks/Futures (not bare coroutines) since 3.11.</p>`,
    aiEra: `<p><b>What AI changes:</b> fan-out to many LLM calls ("summarise these 5,000 documents") is now a daily task, and it is exactly TaskGroup + Semaphore + timeout + retries. AI writes that skeleton quickly; you must verify the <b>failure semantics</b> and the <b>limits</b>.</p>
<p><b>Use AI as a partner:</b> <code>Rewrite this gather to a TaskGroup and explain what changes when one call fails</code>; <code>Add a semaphore of 8, a 30 s per-call timeout and 3 retries with jittered backoff that respects Retry-After</code>; <code>Write a test that proves no more than 8 calls are ever in flight</code>.</p>
<p><b>Where AI goes wrong:</b> creating tasks without keeping references, catching <code>CancelledError</code> and continuing, treating a Semaphore as a requests-per-second limit, using <code>wait_for</code> on a coroutine in a loop and recreating it on retry incorrectly, or forgetting that <code>gather</code> doesn't cancel siblings.</p>
<p><b>What you must still own:</b> choosing all-or-nothing vs partial-results semantics, setting limits from the provider's quotas, and making cancellation and shutdown clean.</p>`,
    problems: [{
      title: 'Bounded Concurrent Fetcher with Timeouts (Order Preserved)', level: 'Medium', tags: ['asyncio', 'Semaphore', 'timeout', 'gather'], companies: ['Stripe', 'Anthropic', 'Airbnb'],
      statement: `<p>Write <code>async def fetch_all(urls, fetch, limit, per_call_timeout)</code>. It must call <code>await fetch(url)</code> for every URL with <b>at most <code>limit</code> calls in flight</b>, give each call at most <code>per_call_timeout</code> seconds, and return a list <b>in the same order as urls</b> where each entry is either the result or the string <code>"timeout"</code> / <code>"error: &lt;msg&gt;"</code>. One failure must not stop the others.</p>`,
      constraints: `<p>1 ≤ len(urls) ≤ 10<sup>5</sup>, 1 ≤ limit ≤ 200, timeout in seconds (float).</p>`,
      example: `<p>urls = ${H.c('b', '[u0 (0.1 s), u1 (5 s), u2 (raises)]')}, limit = 2, timeout = 1 → ${H.c('g', '["R0", "timeout", "error: boom"]')}. u2 waits for a free slot (only 2 at a time) and then fails; order still matches input.</p>`,
      brute: { why: `<p>A plain <code>for</code> loop with <code>await fetch(u)</code> is sequential (sum of latencies). An unbounded <code>gather</code> of all 10<sup>5</sup> calls opens 10<sup>5</sup> sockets at once → rate limits, exhausted file descriptors, and one exception aborts the whole gather.</p>`, code: `import asyncio

async def fetch_all_naive(urls, fetch):
    return await asyncio.gather(*(fetch(u) for u in urls))   # unbounded, fails fast

async def demo(u):
    return u.upper()

print(asyncio.run(fetch_all_naive(["a", "b"], demo)))` },
      mcq: { q: 'Where should the timeout go so that time spent waiting for a semaphore slot does NOT count against a call?', options: ['Around the whole gather', 'Inside "async with sem", around await fetch(url)', 'Outside "async with sem"', 'Timeouts cannot be combined with semaphores'], answer: 1, explain: 'The per-call budget should start when the call actually starts, i.e. after acquiring the slot. Wrapping outside would let queueing time eat the budget.' },
      hints: [`<p>Hint 1: Write a small wrapper <code>one(url)</code> that does everything for one URL and <b>never raises</b> — it returns a result or an error string.</p>`, `<p>Hint 2: Inside it: <code>async with sem:</code> then <code>async with asyncio.timeout(t): return await fetch(url)</code>; catch <code>TimeoutError</code> and <code>Exception</code> separately. Don't catch <code>CancelledError</code>.</p>`, `<p>Hint 3: <code>await asyncio.gather(*(one(u) for u in urls))</code> keeps input order. For 10<sup>5</sup> URLs this creates 10<sup>5</sup> tasks (fine, ~100–200 MB worst case); for millions, switch to a Queue + workers.</p>`],
      solution: {
        approach: `<p>Wrap each URL in a coroutine that (1) waits for a semaphore slot, (2) applies the per-call timeout, (3) converts errors into values. Because each wrapper never raises, <code>gather</code> cannot fail fast, and it returns results in argument order.</p>`,
        code: `import asyncio

async def fetch_all(urls, fetch, limit, per_call_timeout):
    sem = asyncio.Semaphore(limit)

    async def one(url):
        async with sem:                                   # wait for a free slot
            try:
                async with asyncio.timeout(per_call_timeout):
                    return await fetch(url)
            except TimeoutError:
                return "timeout"
            except Exception as e:                        # CancelledError is not an Exception
                return f"error: {e}"

    return await asyncio.gather(*(one(u) for u in urls))

async def fake_fetch(url):
    delays = {"u0": 0.1, "u1": 5, "u2": 0.05}
    await asyncio.sleep(delays[url])
    if url == "u2":
        raise ValueError("boom")
    return "R" + url[1:]

if __name__ == "__main__":
    print(asyncio.run(fetch_all(["u0", "u1", "u2"], fake_fetch, 2, 1.0)))
    # ['R0', 'timeout', 'error: boom']`,
        dry: { head: ['time', 'slots used', 'u0', 'u1', 'u2'], rows: [['0.0 s', '2/2', 'running', 'running', 'waiting for slot'], ['0.1 s', '2/2', '<span class="c-g">R0</span>, slot freed', 'running', 'gets slot, running'], ['0.15 s', '1/2', 'done', 'running', '<span class="c-r">error: boom</span>'], ['1.0 s', '0/2', 'done', '<span class="c-y">timeout</span>', 'done']] },
        complexity: `<p>Wall time ≈ (N / limit) × typical latency, capped per call by the timeout. Memory O(N) for tasks + results. At most <code>limit</code> open connections.</p>`,
        followUps: ['Add retries with exponential backoff only for timeouts and 5xx errors.', 'Change it to a requests-per-second limit (token bucket).', 'Make it cancel everything if more than 10% of calls fail.']
      }
    }]
  });

  /* ================= TOPIC 7: Async pitfalls ================= */
  topics.push({
    title: 'Async Pitfalls: Blocking the Loop, Forgotten Awaits, Lost Tasks and Races Across await',
    analogy: `<p>Back to our single waiter. Pitfall 1: she stops to <b>wash every dish herself</b> (a blocking call) — every table freezes. Pitfall 2: she writes an order on a pad but <b>never hands it to the kitchen</b> (a coroutine never awaited). Pitfall 3: she gives an order to a trainee and <b>forgets the trainee exists</b> (a task with no reference) — it may silently vanish. Pitfall 4: she tells two tables "yes, one slice of cake left!" <b>before walking to the fridge</b>, and both get a yes (a race across <code>await</code>).</p>`,
    explain: `<p>🟢 asyncio is fast <b>only if every task awaits quickly and often</b>. Most production async bugs come from a short list:</p>
${H.table(['Pitfall', 'Symptom', 'Fix'], [['<b>Blocking call in async def</b> (<code>time.sleep</code>, <code>requests.get</code>, sync DB driver, big file read)', 'all requests slow down together; heartbeats late; p99 latency spikes', 'async library (httpx, aiohttp, asyncpg, aiofiles) or <code>await asyncio.to_thread(fn, …)</code>'], ['<b>CPU-heavy work in the loop</b> (hashing, parsing a 50 MB JSON, image work)', 'same as above, plus 100% of one core', '<code>await loop.run_in_executor(process_pool, fn, …)</code>'], ['<b>Forgot await</b>', '"coroutine was never awaited" warning; nothing happens', 'add <code>await</code> or <code>create_task</code>'], ['<b>Sequential awaits in a loop</b>', 'async code no faster than sync', 'gather / TaskGroup / as_completed'], ['<b>Fire-and-forget task without reference</b>', 'task silently disappears; "Task exception was never retrieved"', 'keep a set of tasks, or a TaskGroup'], ['<b>Swallowing CancelledError</b>', 'timeouts and shutdown hang', 're-raise after cleanup'], ['<b>Race across await</b> (check-then-act)', 'oversold stock, double-charged user', '<code>asyncio.Lock</code> around the whole check + update'], ['<b>threading.Lock in async code</b>', 'whole loop freezes (or deadlocks)', '<code>asyncio.Lock</code>'], ['<b>asyncio.run() inside a running loop</b>', '"cannot be called from a running event loop"', 'just <code>await</code> (Jupyter), or run in another thread'], ['<b>No timeouts / unbounded fan-out</b>', 'hangs forever; rate-limited; out of sockets', '<code>asyncio.timeout</code> + Semaphore']])}
<p>🔵 <b>Why "async" does not mean "safe from races".</b> Between two lines with no <code>await</code>, nothing else runs — that part is safe. But any <code>await</code> is a door where other tasks walk in. If you <b>read</b> state, <b>await</b> something, then <b>write</b> based on what you read, another task may have changed it in between.</p>
<pre>async def withdraw(amount):
    global balance
    if balance >= amount:          # check
        await audit_log(amount)    # ← other tasks run here!
        balance -= amount          # act on a stale check</pre>
<p><b>The escape hatches:</b> <code>asyncio.to_thread(fn, *args)</code> (3.9+) runs a blocking function in the default thread pool and gives you an awaitable; <code>loop.run_in_executor(executor, fn, *args)</code> lets you pick a <code>ProcessPoolExecutor</code> for CPU work.</p>
<p>🟣 <b>Find them early:</b> run with <code>asyncio.run(main(), debug=True)</code> or <code>PYTHONASYNCIODEBUG=1</code>: the loop logs any callback that holds it longer than <code>loop.slow_callback_duration</code> (100 ms default), warns about never-awaited coroutines, and checks thread-safety of calls.</p>`,
    clues: [
      '"our async API gets slow for everyone when one endpoint is called" → blocking call or CPU work inside the event loop',
      '"we switched to async but it\'s not faster" → sequential awaits, or a sync library under the hood',
      '"RuntimeWarning: coroutine ... was never awaited" → missing await',
      '"Task was destroyed but it is pending" / "Task exception was never retrieved" → lost or unwatched tasks',
      '"inventory went negative under load" in async code → check-then-act across an await → asyncio.Lock',
      '"RuntimeError: asyncio.run() cannot be called from a running event loop" → already inside a loop (Jupyter/FastAPI)',
      '"Future attached to a different loop" → object created under one loop used in another (global clients created at import time)'
    ],
    code: [{ lang: 'python', title: 'Measure loop lag: blocking vs non-blocking (run locally)', code: `import asyncio
import time

async def heartbeat(lags):
    loop = asyncio.get_running_loop()
    for _ in range(6):
        expected = loop.time() + 0.1
        await asyncio.sleep(0.1)
        lags.append(round(loop.time() - expected, 3))   # how late did we wake?

def legacy_blocking_call():
    time.sleep(0.3)               # e.g. requests.get or a sync DB driver
    return "data"

async def bad_handler():
    return legacy_blocking_call()                        # blocks the loop!

async def good_handler():
    return await asyncio.to_thread(legacy_blocking_call)  # runs in a worker thread

async def trial(handler):
    lags = []
    await asyncio.gather(heartbeat(lags), handler())
    return max(lags)

print("worst heartbeat lag, blocking:   ", asyncio.run(trial(bad_handler)), "s")   # ~0.2-0.3
print("worst heartbeat lag, to_thread:  ", asyncio.run(trial(good_handler)), "s")  # ~0.0
` }, { lang: 'python', title: 'Race across await and the asyncio.Lock fix (run locally)', code: `import asyncio

stock = 1
lock = asyncio.Lock()

async def buy_unsafe(user):
    global stock
    if stock > 0:                      # check
        await asyncio.sleep(0.01)      # payment call: other tasks run here
        stock -= 1                     # act on a stale check
        return f"{user}: bought"
    return f"{user}: sold out"

async def buy_safe(user):
    global stock
    async with lock:                   # check + act are now one critical section
        if stock > 0:
            await asyncio.sleep(0.01)
            stock -= 1
            return f"{user}: bought"
        return f"{user}: sold out"

async def main():
    global stock
    stock = 1
    print(await asyncio.gather(buy_unsafe("ann"), buy_unsafe("bob")), "stock =", stock)  # -1!
    stock = 1
    print(await asyncio.gather(buy_safe("ann"), buy_safe("bob")), "stock =", stock)      # 0

asyncio.run(main())
` }],
    codeTitle: ['Loop lag', 'Race across await'],
    viz: [{
      title: 'Blocking the loop: heartbeat timeline with time.sleep vs asyncio.sleep vs to_thread',
      input: 'time.sleep',
      inputLabel: 'handler uses: time.sleep, asyncio.sleep, or to_thread',
      gen: function (input) {
        var mode = String(input || 'time.sleep').trim().toLowerCase().replace(/^asyncio\.to_thread$/, 'to_thread');
        if (['time.sleep', 'asyncio.sleep', 'to_thread'].indexOf(mode) < 0) throw new Error('Type one of: time.sleep, asyncio.sleep, to_thread');
        var N = 7, rows = [[], [], [], []], frames = [], beats = [], nextBeat = 0, blockedUntil = -1, handlerDone = null;
        var heads = ['event loop thread', 'heartbeat task (every 1 s)', 'handler task (needs a 3 s wait)', 'worker thread (to_thread pool)'];
        var code = mode === 'time.sleep' ? 'async def handler():\n    time.sleep(3)              # BLOCKS the loop thread\n    return "ok"' : mode === 'asyncio.sleep' ? 'async def handler():\n    await asyncio.sleep(3)     # parks the task, loop stays free\n    return "ok"' : 'async def handler():\n    await asyncio.to_thread(blocking_call)  # 3 s in a worker thread\n    return "ok"';
        for (var t = 0; t < N; t++) {
          var notes = [], loopCell = 'idle', hbCell = '', hCell = '', wCell = '';
          // handler arrives at t=1
          if (t === 1) {
            if (mode === 'time.sleep') { blockedUntil = 4; notes.push('A request arrives; the handler calls <code>time.sleep(3)</code>. <span class="c-r">The loop thread is stuck inside it — nothing else can run until t=4.</span>'); }
            else if (mode === 'asyncio.sleep') notes.push('A request arrives; the handler <code>await</code>s a 3 s timer and is parked. The loop is free immediately.');
            else notes.push('A request arrives; the handler hands the blocking call to a <b>worker thread</b> and awaits it. The loop is free immediately.');
          }
          var blocked = t >= 1 && t < blockedUntil;
          if (blocked) { loopCell = 'BLOCKED'; hCell = 'time.sleep'; }
          else if (t >= 1 && t < 4) { hCell = mode === 'asyncio.sleep' ? 'awaiting timer' : 'awaiting thread'; }
          if (mode === 'to_thread' && t >= 1 && t < 4) wCell = 'blocking_call()';
          if (t === 4) { hCell = 'returns ok'; handlerDone = 4; notes.push('Handler finishes at t=4 (3 s of waiting, as expected).'); }
          // heartbeat due at nextBeat
          if (!blocked && t >= nextBeat) {
            var late = t - nextBeat;
            beats.push(late);
            hbCell = late ? 'tick (late ' + late + 's)' : 'tick';
            if (late) notes.push('<span class="c-y">Heartbeat finally runs at t=' + t + ', ' + late + ' s late</span> — its timer fired long ago but the loop could not run it.');
            else notes.push('Heartbeat ticks on time at t=' + t + '.');
            nextBeat = t + 1;
            loopCell = loopCell === 'idle' ? 'running callbacks' : loopCell;
          } else if (blocked && t >= nextBeat) { hbCell = 'due, starving'; notes.push('<span class="c-r">Heartbeat is due but cannot run</span>: the only thread is inside time.sleep.'); }
          rows[0].push(loopCell); rows[1].push(hbCell || '·'); rows[2].push(hCell || '·'); rows[3].push(wCell || '·');
          var hl = {};
          rows.forEach(function (r, i) { r.forEach(function (c, j) { hl[i + ',' + j] = c === 'BLOCKED' || c === 'time.sleep' || c === 'due, starving' ? 'bad' : c.indexOf('late') >= 0 ? 'cur' : c === 'tick' || c === 'returns ok' ? 'ok' : c === '·' || c === 'idle' ? 'done' : 'win'; }); });
          frames.push(fr('<b>t = ' + t + 's.</b> ' + (notes.length ? notes.join(' ') : 'Loop waits in the selector for the next timer.'), [
            cp(code, { 2: mode === 'time.sleep' ? 'bad' : 'ok' }, 'Handler (' + mode + ')'),
            { type: 'grid', label: 'Timeline (columns = seconds)', rows: rows.map(function (r) { return r.slice(); }), rowHead: heads, colHead: range(rows[0].length, function (j) { return 't' + j; }), hl: hl }
          ]));
        }
        var worst = Math.max.apply(null, beats);
        frames.push(fr('<b>Result with ' + mode + ':</b> heartbeat ran ' + beats.length + ' times in ' + N + ' s; worst lateness = <b>' + worst + ' s</b>. ' + (mode === 'time.sleep' ? '<span class="c-r">One blocking call froze every task on the loop — in a web server, every other user\'s request.</span> Fix: <code>await asyncio.sleep</code> for waits, an async client for I/O, or <code>await asyncio.to_thread(...)</code> for unavoidable blocking calls.' : '<span class="c-g">The loop stayed responsive</span> — other tasks kept running while the handler waited.'), [
          { type: 'table', label: 'Heartbeat lateness per tick (seconds)', columns: beats.map(function (b, i) { return 'tick ' + (i + 1); }), rows: [beats.map(String)] }
        ]));
        return frames;
      }
    }, {
      title: 'Race across await: two buyers, one item left (type nolock or lock)',
      input: 'nolock',
      inputLabel: 'nolock or lock',
      gen: function (input) {
        var mode = String(input || 'nolock').trim().toLowerCase().replace(/[\s_-]/g, '');
        if (mode !== 'nolock' && mode !== 'lock') throw new Error('Type nolock or lock');
        var L = mode === 'lock';
        var code = L ? 'async with lock:\n    if stock > 0:\n        await pay()\n        stock -= 1' : 'if stock > 0:\n    await pay()\n    stock -= 1';
        var o = L ? 1 : 0, st = { stock: 1, ann: '-', bob: '-', 'lock owner': L ? '(free)' : 'none used' }, frames = [];
        function f(narr, a, b, ac, bc, k, cls) { var ha = {}, hb = {}; if (a) ha[a] = ac || 'cur'; if (b) hb[b] = bc || 'cur'; frames.push(fr(narr, [cp(code, ha, 'Task ann'), cp(code, hb, 'Task bob'), vp(st, k || '', cls || 'cur', 'Shared state')])); }
        f('One item in stock. Two buyer tasks run concurrently on the same loop.', 0, 0);
        if (!L) {
          st.ann = 'check ok'; f('ann checks <code>stock &gt; 0</code> → true.', 1, 0, 'ok', '', 'ann');
          f('ann hits <code>await pay()</code> → <b>parks</b>. The loop runs the next ready task: bob.', 2, 0, 'win', '');
          st.bob = 'check ok'; f('bob checks <code>stock &gt; 0</code> → <span class="c-r">still true</span>, because ann hasn\'t decremented yet.', 2, 1, 'win', 'bad', 'bob', 'bad');
          f('bob also awaits pay() and parks.', 2, 2, 'win', 'win');
          st.stock = 0; st.ann = 'bought'; f('ann resumes: stock -= 1 → 0.', 3, 2, 'ok', 'win', 'stock');
          st.stock = -1; st.bob = 'bought'; f('bob resumes: stock -= 1 → <span class="c-r">-1. Oversold!</span>', 3, 3, 'done', 'bad', 'stock', 'bad');
          frames.push(fr('<span class="c-r"><b>Both bought one item that existed once.</b></span> No threads involved — the <code>await</code> between check and act was the door. Try <b>lock</b>.', [vp(st, 'stock', 'bad', 'Final state')]));
        } else {
          st['lock owner'] = 'ann'; f('ann acquires the asyncio.Lock (free).', 1, 0, 'ok', '', 'lock owner');
          st.ann = 'check ok'; f('ann checks stock → 1, ok.', 2, 0, 'ok', '', 'ann');
          f('ann awaits pay() and parks — <b>still holding the lock</b>.', 3, 0, 'win', '');
          f('bob runs: <code>async with lock</code> → lock is taken → bob <b>awaits the lock</b> (parks; the loop is NOT blocked).', 3, 1, 'win', 'bad', 'lock owner');
          st.stock = 0; st.ann = 'bought'; st['lock owner'] = 'bob'; f('ann resumes, stock → 0, exits the block → lock passes to bob.', 4, 1, 'ok', 'ok', 'stock');
          st.bob = 'sold out'; st['lock owner'] = '(free)'; f('bob checks stock → 0 → "sold out". Correct!', 0, 2, '', 'ok', 'bob', 'ok');
          frames.push(fr('<span class="c-g"><b>Correct: stock = 0, exactly one sale.</b></span> asyncio.Lock makes check + await + act one critical section. Never use <code>threading.Lock</code> here — blocking on it would freeze the whole loop.', [vp(st, 'stock', 'ok', 'Final state')]));
        }
        return frames;
      }
    }],
    examples: [
      { title: 'A hidden blocker: a "simple" sync SDK call', html: `<p>An async FastAPI endpoint calls <code>boto3.client("s3").get_object(...)</code>. boto3 is synchronous. Each call blocks the loop ~80 ms. At 50 requests/s on one worker, the loop is blocked 4 s every second — impossible — so latency explodes for <b>every</b> endpoint. ${H.c('g', 'Fixes:')} <code>await asyncio.to_thread(s3.get_object, …)</code>, an async SDK (aioboto3), or declare the endpoint with plain <code>def</code> so FastAPI runs it in its thread pool.</p>` },
      { title: 'Calling async code from sync code (and back)', html: `${H.table(['From', 'To', 'Use'], [['sync script / main()', 'async', '<code>asyncio.run(main())</code> — once, at the top'], ['async', 'blocking sync function', '<code>await asyncio.to_thread(fn, *args)</code>'], ['async', 'CPU-heavy function', '<code>await loop.run_in_executor(proc_pool, fn, *args)</code>'], ['another thread', 'coroutine on a running loop', '<code>asyncio.run_coroutine_threadsafe(coro, loop).result()</code>'], ['Jupyter cell', 'async', 'top-level <code>await main()</code> (a loop is already running)']])}` },
      { title: 'The one-character bug', html: `<p>Missing <code>await</code> on a coroutine that returns a value:</p><pre>user = get_user(42)        # forgot await
print(user["name"])        # TypeError: 'coroutine' object is not subscriptable</pre><p>Type checkers (mypy, pyright) catch this: <code>get_user</code> returns <code>Coroutine[Any, Any, dict]</code>, not <code>dict</code>. Linters help too: Ruff's flake8-async (ASYNC) rules flag <code>time.sleep</code> and blocking HTTP calls inside <code>async def</code>.</p>` }
    ],
    deepDive: `<p><b>Why blocking hurts more than you think.</b> With threads, a slow call delays only its own thread. With asyncio, the event loop <b>is</b> the only thread, so a 200 ms blocking call adds 200 ms to <b>every in-flight request</b> on that worker, and work queues up behind it (head-of-line blocking). Latency percentiles (p99) degrade first. Monitoring: export "event loop lag" (schedule a callback every 100 ms, measure lateness — exactly our heartbeat) as a metric; alert when it exceeds ~50 ms.</p>
<p><b>to_thread is not free.</b> It uses the loop's default <code>ThreadPoolExecutor</code> (size <code>min(32, cpus + 4)</code>). If 500 requests all call a slow blocking function, 32 run and the rest queue silently. Size a dedicated executor with <code>loop.set_default_executor</code> or pass your own to <code>run_in_executor</code>, and add timeouts. Remember that cancelling the awaiting task does <b>not</b> stop the thread — the blocking function keeps running.</p>
<p><b>Loop-bound objects.</b> Many asyncio primitives and clients bind to the loop that was running when they were first used. Creating an <code>aiohttp.ClientSession</code> at import time and then calling <code>asyncio.run()</code> twice gives "attached to a different loop". Create clients inside the running loop (e.g. in an app lifespan hook) and close them there. <code>asyncio.run</code> also cancels leftover tasks and shuts down async generators and the default executor on exit.</p>
<p><b>Shutdown and signals.</b> On SIGTERM a well-behaved service stops accepting work, cancels or drains tasks with a deadline, awaits them (<code>gather(*tasks, return_exceptions=True)</code>), closes clients, then exits. <code>loop.add_signal_handler</code> (Unix) lets you trigger this from the loop. Swallowed <code>CancelledError</code>s, blocking calls in <code>finally</code> blocks, and tasks without timeouts are the usual reasons shutdown hangs and Kubernetes has to SIGKILL the pod.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated async code very often <b>looks</b> async but calls sync libraries (requests, sync Redis/DB clients, the sync version of an LLM SDK) inside <code>async def</code>. Reviewing for loop-blocking calls is now one of the highest-value review skills.</p>
<p><b>Use AI as a partner:</b> <code>List every call in this async module that could block the event loop and propose the async or to_thread replacement</code>; <code>Find check-then-act sequences separated by await</code>; <code>Add an event-loop-lag metric and a debug-mode test that fails if any callback exceeds 50 ms</code>.</p>
<p><b>Where AI goes wrong:</b> uses <code>threading.Lock</code> in coroutines; wraps everything in <code>to_thread</code> (hiding a missing async client and exhausting the pool); adds <code>except Exception: pass</code> that hides errors; suggests <code>nest_asyncio</code> as a fix for "loop already running" instead of restructuring.</p>
<p><b>What you must still own:</b> the review checklist (blocking calls, awaits, task ownership, timeouts, cancellation, locks across awaits) and production observability (loop lag, task counts, slow-callback logs).</p>`,
    problems: [{
      title: 'Unfreeze the Event Loop', level: 'Medium', tags: ['asyncio', 'to_thread', 'run_in_executor', 'debugging'], companies: ['Microsoft', 'Shopify', 'Datadog'],
      statement: `<p>This async handler serves a login endpoint. Under load, <b>all</b> endpoints become slow. It (1) calls <code>legacy_user_lookup(name)</code>, a blocking function that sleeps ~0.2 s, and (2) calls <code>slow_hash(password)</code>, pure-Python CPU work of ~0.2 s. Rewrite <code>login</code> so the event loop is never blocked, while keeping the same return value. Show that a heartbeat task stays on time.</p>`,
      constraints: `<p>You cannot change <code>legacy_user_lookup</code> or <code>slow_hash</code>. Up to 100 concurrent logins per worker process.</p>`,
      example: `<p>Before: heartbeat every 0.1 s shows lateness ${H.c('r', '≈ 0.4 s')} during a login. After: lateness ${H.c('g', '≈ 0.00–0.01 s')} and <code>login("ann", "pw")</code> still returns <code>{"user": "ann", "hash": …}</code>.</p>`,
      brute: { why: `<p>Calling both functions directly inside <code>async def</code> runs them on the loop thread: 0.4 s during which no other coroutine (other users, heartbeats, health checks) can run.</p>`, code: `import time
import hashlib

def legacy_user_lookup(name):
    time.sleep(0.2)
    return {"user": name}

def slow_hash(pw):
    h = pw.encode()
    for _ in range(20_000):
        h = hashlib.sha256(h).digest()
    return h.hex()[:16]

async def login_blocking(name, pw):
    user = legacy_user_lookup(name)     # blocks the loop
    user["hash"] = slow_hash(pw)        # blocks the loop (CPU)
    return user` },
      mcq: { q: 'Which pairing is right?', options: ['Both via asyncio.to_thread', 'Lookup via to_thread; hash via run_in_executor with a ProcessPoolExecutor', 'Both via a ProcessPoolExecutor', 'Wrap both in asyncio.wait_for'], answer: 1, explain: 'The lookup waits (releases the GIL) → a thread is enough. The hash is pure-Python CPU work → in a thread it would still compete for the GIL with the loop thread, so a process pool is better. (hashlib on large buffers releases the GIL, but many tiny calls mostly do not.) wait_for does not unblock anything.' },
      hints: [`<p>Hint 1: Classify each call: waiting (I/O-like) or computing (CPU)?</p>`, `<p>Hint 2: I/O → <code>await asyncio.to_thread(legacy_user_lookup, name)</code>. CPU → <code>await loop.run_in_executor(POOL, slow_hash, pw)</code> with a module-level <code>ProcessPoolExecutor</code> created once (not per request).</p>`, `<p>Hint 3: The two calls are independent, so run them concurrently with <code>asyncio.gather</code>. Measure with a heartbeat that records <code>loop.time()</code> lateness. Guard process-pool creation with <code>if __name__ == "__main__":</code>.</p>`],
      solution: {
        approach: `<p>Move blocking I/O to a thread and CPU work to a process, and await both concurrently. The loop thread only schedules and resumes, so it stays responsive. Create the process pool once at startup — spawning processes per request would be far slower than the hash itself.</p>`,
        code: `import asyncio
import hashlib
import time
from concurrent.futures import ProcessPoolExecutor

def legacy_user_lookup(name):
    time.sleep(0.2)                         # blocking I/O we can't change
    return {"user": name}

def slow_hash(pw):
    h = pw.encode()
    for _ in range(20_000):                 # CPU work (many small hashes)
        h = hashlib.sha256(h).digest()
    return h.hex()[:16]

async def login(name, pw, pool):
    loop = asyncio.get_running_loop()
    user, digest = await asyncio.gather(
        asyncio.to_thread(legacy_user_lookup, name),   # I/O → thread
        loop.run_in_executor(pool, slow_hash, pw),     # CPU → process
    )
    user["hash"] = digest
    return user

async def heartbeat(lags, stop):
    loop = asyncio.get_running_loop()
    while not stop.is_set():
        expected = loop.time() + 0.05
        await asyncio.sleep(0.05)
        lags.append(loop.time() - expected)

async def main(pool):
    lags, stop = [], asyncio.Event()
    hb = asyncio.create_task(heartbeat(lags, stop))
    print(await login("ann", "pw", pool))
    stop.set()
    await hb
    print(f"worst heartbeat lag: {max(lags):.3f}s")   # stays near 0

if __name__ == "__main__":
    with ProcessPoolExecutor(max_workers=2) as pool:
        asyncio.run(main(pool))`,
        dry: { head: ['time', 'loop thread', 'worker thread', 'worker process', 'heartbeat'], rows: [['0.00 s', 'schedules both, awaits gather', 'lookup sleeping', 'hashing', 'on time'], ['0.10 s', 'idle in selector', 'sleeping', 'hashing', 'on time'], ['0.20 s', 'wakes for thread result', 'returns {user}', 'hashing / done', 'on time'], ['~0.25 s', 'resumes login, returns', '-', 'result pickled back', 'worst lag ≈ 0.00 s']] },
        complexity: `<p>Login latency ≈ max(0.2, hash time) instead of their sum; loop lag ≈ 0. Throughput is bounded by thread-pool size for lookups and number of processes for hashing — size both from expected load.</p>`,
        followUps: ['What happens if 200 logins arrive at once with the default to_thread pool?', 'How would you add a timeout without leaking the thread work?', 'Would the free-threaded 3.14t build change the choice for slow_hash?']
      }
    }]
  });

  /* ================= TOPIC 8: Choosing a model + design ================= */
  topics.push({
    title: 'Choosing the Right Model and Designing Concurrent Systems in Python',
    analogy: `<p>Moving house: for <b>waiting jobs</b> (waiting for the internet company, the delivery van) one organised person with a phone can juggle all of them — that's <b>asyncio</b>. For <b>heavy lifting</b> (carrying 200 boxes) you need <b>more bodies</b> — that's <b>processes</b>. A couple of friends who each wait on a different phone line is <b>threads</b>. Big moves mix all three: one coordinator (event loop) on the phone, a crew of movers (process pool) lifting boxes, and a <b>conveyor belt</b> (queue) between them so nobody gets swamped.</p>`,
    explain: `<p>🟢 <b>The 30-second decision recipe:</b></p>
<ol>
<li><b>Is concurrency even the problem?</b> Profile first. An N+1 database query or a missing index beats any thread pool.</li>
<li><b>Waiting or computing?</b> Waiting on network/disk → <b>I/O-bound</b>. Busy CPU → <b>CPU-bound</b>.</li>
<li><b>I/O-bound:</b> many connections (hundreds+) with async libraries available → <b>asyncio</b>. A few dozen calls, or only blocking libraries (requests, boto3, sync DB drivers) → <b>ThreadPoolExecutor</b>.</li>
<li><b>CPU-bound:</b> can it be vectorised (NumPy/Polars) or is there a C/Rust library? → do that (it releases the GIL). Otherwise → <b>ProcessPoolExecutor</b> (or try the free-threaded 3.14t build with threads).</li>
<li><b>Bigger than one machine, or must survive restarts?</b> → a job queue (Celery, RQ, Dramatiq, Arq) or a distributed engine (Ray, Dask, Spark).</li>
</ol>
${H.table(['Model', 'Parallel CPU?', 'Scale (concurrent units)', 'Memory each', 'Shares memory?', 'Best for'], [['threads', 'no (yes on 3.14t)', '10s–1000s', '~MB stack (virtual)', 'yes — needs locks', 'blocking I/O libraries'], ['asyncio', 'no', '10,000s+', '~KB', 'yes, but switches only at await', 'many sockets, async clients, LLM fan-out'], ['processes', 'yes', '≈ cores', '10s of MB', 'no — pickle/IPC', 'pure-Python CPU work'], ['sub-interpreters (3.14)', 'yes', '≈ cores', 'smaller than processes', 'no Python objects shared', 'CPU work in one process (still maturing)']])}
<p>🔵 <b>Design patterns you will reuse:</b></p>
<ul>
<li><b>Fan-out / fan-in:</b> start N tasks, collect results (gather/TaskGroup/as_completed).</li>
<li><b>Worker pool + queue:</b> fixed number of workers pull from a bounded queue → bounded memory and concurrency.</li>
<li><b>Pipeline:</b> stage 1 (fetch, async) → queue → stage 2 (parse, process pool) → queue → stage 3 (write, batched). Each stage sized independently.</li>
<li><b>Back-pressure:</b> bounded queues make fast producers wait for slow consumers instead of eating RAM.</li>
<li><b>Limits:</b> Semaphore for in-flight count, token bucket for rate, timeouts on every external call, retries with exponential backoff + jitter.</li>
<li><b>Graceful shutdown:</b> stop intake → drain or cancel with a deadline → close resources.</li>
</ul>
<p>🟣 <b>Combining models is normal:</b> a FastAPI service runs N <b>processes</b> (uvicorn workers) each with one <b>event loop</b>, using a <b>thread pool</b> for blocking SDKs and maybe a <b>process pool</b> for CPU-heavy endpoints.</p>`,
    clues: [
      '"design a web crawler / scraper" → asyncio worker pool + queue + seen-set + per-host limits',
      '"process a 100 GB file / millions of records" → chunked pipeline, process pool or job queue, bounded queues',
      '"call an LLM for 50k documents within rate limits" → asyncio + Semaphore + token bucket + retries + checkpointing',
      '"real-time chat / websockets for 100k users" → asyncio (many processes behind a load balancer)',
      '"should I use threads, processes or asyncio?" → ask: waiting or computing? how many? which libraries?',
      '"must survive crashes / restarts" → durable queue (Redis/SQS/Kafka) + idempotent workers, not in-memory pools'
    ],
    code: [{ lang: 'python', title: 'A decision helper you can tweak (runnable)', run: true, code: `def choose_model(kind, concurrent_units=10, async_libs=True, vectorizable=False, multi_machine=False):
    """Return a recommended Python concurrency model and the reason."""
    if multi_machine:
        return "job queue / distributed engine", "work must outlive one process or machine"
    if kind == "cpu":
        if vectorizable:
            return "NumPy/Polars (vectorise)", "C code releases the GIL and uses SIMD"
        return "ProcessPoolExecutor", "pure-Python CPU work needs one GIL per core"
    if kind == "io":
        if concurrent_units >= 200 and async_libs:
            return "asyncio", "cheap tasks scale to many sockets on one thread"
        return "ThreadPoolExecutor", "blocking libraries release the GIL while waiting"
    if kind == "mixed":
        return "asyncio + ProcessPoolExecutor", "loop for I/O, processes for CPU stages"
    raise ValueError("kind must be cpu, io or mixed")

cases = [
    ("resize 10k images (Pillow, Python loop)", dict(kind="cpu")),
    ("matrix stats on 1e8 floats", dict(kind="cpu", vectorizable=True)),
    ("call 30 internal APIs with requests", dict(kind="io", concurrent_units=30, async_libs=False)),
    ("10k websocket clients", dict(kind="io", concurrent_units=10_000)),
    ("crawl + parse heavy HTML", dict(kind="mixed")),
    ("nightly ETL across a cluster", dict(kind="cpu", multi_machine=True)),
]
for label, kw in cases:
    model, why = choose_model(**kw)
    print(f"{label:42s} -> {model:32s} ({why})")
` }, { lang: 'python', title: 'Pipeline: async fetch stage → process-pool parse stage (run locally)', code: `import asyncio
from concurrent.futures import ProcessPoolExecutor

def parse(html: str) -> int:
    """CPU-heavy stage (pretend): count words."""
    return len(html.split())

async def fetch(i: int) -> str:
    await asyncio.sleep(0.05)                 # network wait
    return "word " * (i + 1)

async def main():
    loop = asyncio.get_running_loop()
    pages: asyncio.Queue = asyncio.Queue(maxsize=10)   # back-pressure between stages
    results = []

    async def producer():
        async with asyncio.TaskGroup() as tg:
            for i in range(20):
                tg.create_task(fetch_into(i))

    async def fetch_into(i):
        await pages.put(await fetch(i))

    async def parser(pool):
        while True:
            html = await pages.get()
            try:
                results.append(await loop.run_in_executor(pool, parse, html))
            finally:
                pages.task_done()

    with ProcessPoolExecutor(max_workers=2) as pool:
        parsers = [asyncio.create_task(parser(pool)) for _ in range(2)]
        await producer()
        await pages.join()
        for p in parsers:
            p.cancel()
        await asyncio.gather(*parsers, return_exceptions=True)
    print(len(results), "pages parsed, total words:", sum(results))

if __name__ == "__main__":
    asyncio.run(main())
` }],
    codeTitle: ['Decision helper', 'Mixed pipeline'],
    viz: {
      title: 'Decision walk: which concurrency model fits this workload?',
      input: 'io-many',
      inputLabel: 'workload: cpu, cpu-numpy, io-many, io-few, io-blocking-lib, mixed, cluster',
      gen: function (input) {
        var w = String(input || 'io-many').trim().toLowerCase();
        var valid = ['cpu', 'cpu-numpy', 'io-many', 'io-few', 'io-blocking-lib', 'mixed', 'cluster'];
        if (valid.indexOf(w) < 0) throw new Error('Choose one of: ' + valid.join(', '));
        var nodes = [
          { id: 'start', label: 'Profiled? It\'s concurrency', x: 50, y: 4, shape: 'box', w: 28 },
          { id: 'multi', label: 'Beyond 1 machine / durable?', x: 50, y: 18, shape: 'box', w: 28 },
          { id: 'jobq', label: 'Job queue / Ray / Dask', x: 88, y: 18, shape: 'box', w: 22 },
          { id: 'kind', label: 'Waiting or computing?', x: 50, y: 32, shape: 'box', w: 24 },
          { id: 'vec', label: 'Vectorisable / C lib?', x: 18, y: 46, shape: 'box', w: 22 },
          { id: 'numpy', label: 'NumPy / Polars', x: 6, y: 60, shape: 'box', w: 16 },
          { id: 'proc', label: 'ProcessPoolExecutor', x: 30, y: 60, shape: 'box', w: 22 },
          { id: 'many', label: 'Many conns + async libs?', x: 80, y: 46, shape: 'box', w: 26 },
          { id: 'aio', label: 'asyncio', x: 92, y: 60, shape: 'box', w: 14 },
          { id: 'thr', label: 'ThreadPoolExecutor', x: 70, y: 60, shape: 'box', w: 22 },
          { id: 'mix', label: 'asyncio + process pool', x: 50, y: 60, shape: 'box', w: 22 }
        ];
        var edges = [['start', 'multi'], ['multi', 'jobq', 'yes'], ['multi', 'kind', 'no'], ['kind', 'vec', 'CPU'], ['kind', 'many', 'I/O'], ['kind', 'mix', 'both'], ['vec', 'numpy', 'yes'], ['vec', 'proc', 'no'], ['many', 'aio', 'yes'], ['many', 'thr', 'no']];
        var paths = {
          'cluster': [['start', 'Profiling shows the bottleneck really is throughput of independent jobs.'], ['multi', 'The work (nightly ETL, millions of jobs) must survive crashes and use several machines → <b>yes</b>.'], ['jobq', '<b>Use a durable job queue</b> (Celery/RQ/Dramatiq with Redis/SQS) or Ray/Dask. Inside each worker you can still use the models below.']],
          'cpu': [['start', 'Profiler shows 100% of one core in a pure-Python loop.'], ['multi', 'Fits on one machine → <b>no</b>.'], ['kind', 'It is <b>computing</b>, not waiting.'], ['vec', 'The loop does custom object logic, not array math → <b>no</b>.'], ['proc', '<b>ProcessPoolExecutor</b>: one GIL per core. Send small inputs, use chunks. (On 3.14t free-threaded builds, threads become an option.)']],
          'cpu-numpy': [['start', 'Profiler shows a hot numeric loop.'], ['multi', 'One machine → <b>no</b>.'], ['kind', '<b>Computing</b>.'], ['vec', 'It is array math → <b>yes</b>.'], ['numpy', '<b>Vectorise with NumPy/Polars</b>: often 10–100× faster than any pool, and the C code releases the GIL.']],
          'io-many': [['start', 'Time is spent waiting on 10,000 sockets.'], ['multi', 'One machine → <b>no</b>.'], ['kind', '<b>Waiting</b> (I/O).'], ['many', 'Thousands of connections and async clients exist (httpx, asyncpg) → <b>yes</b>.'], ['aio', '<b>asyncio</b> with TaskGroup + Semaphore + timeouts. Scale further with several processes.']],
          'io-few': [['start', 'A script calls 20 APIs one after another.'], ['multi', '<b>no</b>.'], ['kind', '<b>Waiting</b>.'], ['many', 'Only 20 calls; rewriting to async is not worth it → <b>no</b>.'], ['thr', '<b>ThreadPoolExecutor(max_workers=20)</b> + as_completed: 5 lines, works with your existing code.']],
          'io-blocking-lib': [['start', 'Calls go through a vendor SDK that only has a blocking API.'], ['multi', '<b>no</b>.'], ['kind', '<b>Waiting</b>.'], ['many', 'No async client exists → <b>no</b>.'], ['thr', '<b>Threads</b> (or <code>asyncio.to_thread</code> if the rest of the app is async). The SDK releases the GIL while waiting on sockets.']],
          'mixed': [['start', 'Crawler: fetch pages (waiting) then parse heavy HTML (computing).'], ['multi', '<b>no</b>.'], ['kind', '<b>Both</b>.'], ['mix', '<b>asyncio for fetching + ProcessPoolExecutor for parsing</b>, joined by a bounded queue (pipeline with back-pressure).']]
        };
        var p = paths[w], frames = [], seen = [];
        p.forEach(function (step, i) {
          seen.push(step[0]);
          var hl = {}, ehl = {};
          seen.forEach(function (id, j) { hl[id] = j === seen.length - 1 ? (i === p.length - 1 ? 'sel' : 'cur') : 'done'; if (j > 0) ehl[seen[j - 1] + '-' + id] = 'ok'; });
          frames.push(fr('<b>Step ' + (i + 1) + '.</b> ' + step[1], [{ type: 'graph', directed: true, height: 66, nodes: nodes, edges: edges, hl: hl, ehl: ehl }]));
        });
        frames.push(fr('<b>Answer for "' + w + '":</b> ' + p[p.length - 1][1] + ' Try another workload in the input box to see a different path.', [{ type: 'graph', directed: true, height: 66, nodes: nodes, edges: edges, hl: (function () { var h = {}; h[p[p.length - 1][0]] = 'sel'; return h; })() }, tx('Interview tip: say the questions out loud in this order — <b>is it concurrency? one machine? waiting or computing? how many? which libraries?</b> — then name the tool and its limits.', 'How to present it')]));
        return frames;
      }
    },
    examples: [
      { title: 'Design: summarise 50,000 documents with an LLM API', html: `<p>Limits: 500 requests/min, 200k tokens/min, ~5 s per call. Little's law: in-flight ≈ rate × latency = (500/60) × 5 ≈ <b>42</b>.</p>${H.table(['Concern', 'Choice'], [['concurrency model', 'asyncio + async SDK client'], ['in-flight cap', '<code>Semaphore(40)</code>'], ['rate', 'token bucket for requests <b>and</b> tokens per minute'], ['failures', 'retry 429/5xx with exponential backoff + jitter, honour Retry-After'], ['crash safety', 'write results to disk/DB as they finish; skip done IDs on restart (idempotent)'], ['time', '50,000 / 500 per min = <b>100 min</b> minimum — the rate limit, not code, is the bottleneck']])}` },
      { title: 'Design: image thumbnailer for an upload service', html: `<p>Uploads arrive via an async web API. Resizing is CPU-heavy. Don't resize in the request handler (blocks the loop) and don't spin up a process per upload. Instead: handler stores the original, pushes a job onto a durable queue (SQS/Redis), returns <code>202 Accepted</code>. A separate worker service runs a <b>process pool</b> sized to cores, pulls jobs, writes thumbnails, acks the job. Scale workers horizontally; jobs survive crashes; the web tier stays fast.</p>` },
      { title: 'Measure, then decide: a tiny benchmark table', html: `${H.table(['Workload (100 units)', 'serial', '8 threads', '8 processes', 'asyncio'], [['HTTP calls, 100 ms each', '10.0 s', '1.3 s', '1.4 s (+start-up)', '0.15 s'], ['pure-Python math, 50 ms each', '5.0 s', '5.3 s', '0.8 s', '5.0 s'], ['NumPy matmul, 50 ms each', '5.0 s', '~1 s*', '~1.2 s', '5.0 s']])}<p>* BLAS may already use several cores per call. Illustrative numbers on an 8-core laptop — always measure your own.</p>` }
    ],
    deepDive: `<p><b>Little's law</b> (L = λ × W) sizes everything: concurrent work L = arrival rate λ × time in system W. 300 req/s × 0.2 s latency = 60 in flight → a pool of ~60 threads, or a Semaphore(60), or 60 connections in the DB pool. If W grows (slow dependency), L grows — without a cap you run out of sockets/memory; with a cap, requests queue and you need timeouts and load shedding.</p>
<p><b>Back-pressure end to end.</b> Every unbounded buffer is a future out-of-memory: unbounded <code>asyncio.Queue()</code>, unbounded executor queues, creating a task per incoming message. Bound queues, apply <code>maxsize</code>, and decide what happens when full: wait (back-pressure), drop (sampling), or reject (HTTP 429/503). Kafka/SQS consumers should only fetch as many messages as they can process concurrently.</p>
<p><b>Correctness under retries.</b> Concurrency + failures ⇒ duplicates. Make handlers <b>idempotent</b> (dedupe by job ID, upserts, idempotency keys for payments). Use <b>exponential backoff with jitter</b> (e.g. <code>sleep = random.uniform(0, base * 2**attempt)</code>) to avoid synchronized retry storms. Add a <b>circuit breaker</b> when a dependency is down so you fail fast instead of piling up waiting tasks.</p>
<p><b>The 2026 landscape.</b> Free-threaded CPython (3.14t) makes thread pools viable for CPU-bound Python when your dependencies support it; check <code>sys._is_gil_enabled()</code> at runtime and benchmark — single-thread speed is a bit lower and memory higher. Sub-interpreters (<code>concurrent.interpreters</code>, <code>InterpreterPoolExecutor</code>) offer process-like isolation with lower overhead but limited data sharing (queues of simple objects / memoryviews). For async, the ecosystem has standardised on <code>TaskGroup</code>-style structured concurrency; AnyIO lets libraries run on both asyncio and Trio.</p>`,
    aiEra: `<p><b>What AI changes:</b> concurrency design is now often about <b>orchestrating AI calls</b>: fan-out to models and tools, agents running tool calls in parallel, streaming tokens over websockets. These are I/O-bound, rate-limited and expensive — asyncio + limits + retries + caching is the default architecture.</p>
<p><b>Use AI as a partner:</b> <code>Given these numbers (rate limits, latency, volume), compute the required concurrency with Little's law and propose a design with bounded queues</code>; <code>Review this design for unbounded buffers, missing timeouts and non-idempotent retries</code>; <code>Generate a load-test script that ramps to 2× expected traffic</code>.</p>
<p><b>Where AI goes wrong:</b> picks a model by fashion ("use asyncio everywhere") instead of workload; ignores provider rate limits; forgets idempotency on retry; proposes a per-request process pool; or overlooks that the slowest dependency, not Python, sets the ceiling.</p>
<p><b>What you must still own:</b> the numbers (throughput, latency, limits), the failure model, and a clear explanation of trade-offs — exactly what interviewers probe in concurrency design rounds.</p>`,
    problems: [{
      title: 'Design and Build an Async Web Crawler', level: 'Hard', tags: ['asyncio', 'Queue', 'design', 'BFS'], companies: ['Google', 'Amazon', 'OpenAI'],
      statement: `<p>Write <code>async def crawl(start, get_links, max_pages, workers)</code>. <code>await get_links(url)</code> fetches a page and returns the URLs it links to (may raise). Crawl breadth-first from <code>start</code>, visit each URL <b>at most once</b>, fetch at most <code>max_pages</code> pages, run at most <code>workers</code> fetches at once, and return the set of visited URLs. Failures are skipped. The crawl must terminate even when the graph has cycles.</p>`,
      constraints: `<p>max_pages ≤ 10<sup>5</sup>, workers ≤ 100. Graph may contain cycles and dead links. Assume all URLs are on allowed hosts.</p>`,
      example: `<p>Graph ${H.c('b', 'a→[b,c], b→[a,d], c→[d], d→[]')}, max_pages = 10, workers = 2 → visited ${H.c('g', '{a, b, c, d}')}. The cycle a↔b doesn't loop forever because "a" is already in <code>seen</code>.</p>`,
      brute: { why: `<p>Recursive sequential crawling (fetch, then recurse into each link) waits for each page one at a time and, without a <code>seen</code> set, loops forever on cycles. Spawning a task per discovered link without a cap explodes into thousands of simultaneous requests.</p>`, code: `import asyncio

async def crawl_naive(url, get_links, seen=None):
    seen = seen if seen is not None else set()
    if url in seen:
        return seen
    seen.add(url)
    for nxt in await get_links(url):      # one page at a time
        await crawl_naive(nxt, get_links, seen)
    return seen` },
      mcq: { q: 'When should a URL be added to the seen set?', options: ['After it is fetched successfully', 'When it is put on the queue', 'When a worker takes it off the queue', 'Never — dedupe the results at the end'], answer: 1, explain: 'Marking at enqueue time guarantees each URL is queued at most once, even if many pages link to it before it is fetched. Marking later lets duplicates pile up in the queue.' },
      hints: [`<p>Hint 1: It's BFS with a queue, but the queue is an <code>asyncio.Queue</code> and several worker tasks consume it concurrently.</p>`, `<p>Hint 2: Shared state: <code>seen</code> (marked at enqueue), <code>visited</code> (successful fetches), counter. No lock needed for simple set operations — there is no await between check and add.</p>`, `<p>Hint 3: Termination: <code>await q.join()</code> returns when every queued URL got <code>task_done()</code>. Then cancel workers. To respect <code>max_pages</code>, skip fetching when the budget is used up but still call <code>task_done()</code>.</p>`],
      solution: {
        approach: `<p>Worker-pool BFS: an <code>asyncio.Queue</code> of URLs, <code>workers</code> tasks pulling from it, a <code>seen</code> set updated at enqueue time (no await between check and add, so no race), and a page budget that is reserved <b>before</b> the fetch's await (so concurrent workers can't overshoot it). <code>q.join()</code> detects completion even with cycles because each URL is enqueued once. Workers are cancelled at the end; <code>try/finally</code> guarantees <code>task_done()</code> even on fetch errors.</p>`,
        code: `import asyncio

async def crawl(start, get_links, max_pages, workers):
    q = asyncio.Queue()
    seen = {start}
    visited = set()
    budget = max_pages
    await q.put(start)

    async def worker():
        nonlocal budget
        while True:
            url = await q.get()
            try:
                if budget <= 0:
                    continue                         # budget used up: just drain the queue
                budget -= 1                          # reserve BEFORE awaiting → exact cap
                try:
                    links = await asyncio.wait_for(get_links(url), timeout=5)
                except Exception:
                    continue                         # dead link / timeout: skip
                visited.add(url)
                for nxt in links:
                    if nxt not in seen:              # check + add with no await between
                        seen.add(nxt)
                        q.put_nowait(nxt)
            finally:
                q.task_done()

    tasks = [asyncio.create_task(worker()) for _ in range(workers)]
    await q.join()                                   # every enqueued URL handled
    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    return visited

GRAPH = {"a": ["b", "c"], "b": ["a", "d"], "c": ["d", "x"], "d": []}

async def fake_get_links(url):
    await asyncio.sleep(0.01)
    if url not in GRAPH:
        raise ConnectionError("404")
    return GRAPH[url]

if __name__ == "__main__":
    print(sorted(asyncio.run(crawl("a", fake_get_links, max_pages=10, workers=2))))
    # ['a', 'b', 'c', 'd']   ('x' is a dead link)`,
        dry: { head: ['step', 'worker', 'url', 'links found', 'queue after', 'seen'], rows: [['1', 'w0', 'a', 'b, c', 'b, c', 'a b c'], ['2', 'w0 / w1', 'b, c', 'a, d / d, x', 'd, x', 'a b c d x'], ['3', 'w0 / w1', 'd, x', '[] / 404', '(empty)', 'a b c d x'], ['4', 'main', 'q.join() returns', '', 'cancel workers', 'visited = a b c d']] },
        complexity: `<p>O(V + E) set/queue operations for V pages and E links; wall time ≈ (V / workers) × fetch latency. Memory O(V) for seen + queue.</p>`,
        followUps: ['Add per-host politeness: max 2 concurrent requests per host and a 1 s delay.', 'Respect robots.txt and add a depth limit.', 'Make it resumable after a crash (persist the frontier and seen set).', 'Move HTML parsing to a process pool — where does the queue go?']
      }
    }]
  });

  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'Print in Order (LeetCode 1114)', level: 'Easy', tags: ['threading', 'Event', 'ordering'], companies: ['Microsoft', 'Apple', 'Bloomberg'],
    statement: `<p>Three threads call <code>first()</code>, <code>second()</code> and <code>third()</code> on the same <code>Foo</code> object, in <b>any</b> order. Make sure the output is always "firstsecondthird".</p>`,
    constraints: `<p>Each method is called exactly once by a different thread; thread start order is arbitrary. No busy-waiting.</p>`,
    example: `<p>Threads start in order ${H.c('b', '[3, 1, 2]')} (third first). Output must still be ${H.c('g', '"firstsecondthird"')} — third() has to <b>wait</b> until second() is done, which waits until first() is done.</p>`,
    brute: { why: `<p>Spinning on a boolean (<code>while not self.done1: pass</code>) burns 100% of a core and, because of the GIL, slows down the very thread you're waiting for.</p>`, code: `class FooSpin:
    def __init__(self):
        self.done1 = self.done2 = False
    def first(self, printFirst):
        printFirst(); self.done1 = True
    def second(self, printSecond):
        while not self.done1:
            pass                      # busy-wait: wastes CPU
        printSecond(); self.done2 = True
    def third(self, printThird):
        while not self.done2:
            pass
        printThird()` },
    mcq: { q: 'Which primitive lets a thread sleep until another thread says "done"?', options: ['threading.Lock', 'threading.Event', 'queue.Queue.empty()', 'time.sleep(0.01) polling'], answer: 1, explain: 'Event.wait() blocks without using CPU until another thread calls set(). It is the simplest one-shot signal.' },
    hints: [`<p>Hint 1: You need two "gates": one opened when first finishes, one when second finishes.</p>`, `<p>Hint 2: Use two <code>threading.Event</code> objects. <code>second</code> waits on gate 1; <code>third</code> waits on gate 2.</p>`, `<p>Hint 3: Set the event <b>after</b> printing. Events stay set, so calling wait() after set() returns immediately — order of thread start doesn't matter.</p>`],
    solution: {
      approach: `<p>Two Events act as one-way gates. first prints then opens gate 1; second waits for gate 1, prints, opens gate 2; third waits for gate 2. Waiting threads sleep in the OS without holding the GIL.</p>`,
      code: `import threading

class Foo:
    def __init__(self):
        self.first_done = threading.Event()
        self.second_done = threading.Event()

    def first(self, printFirst: "Callable[[], None]") -> None:
        printFirst()
        self.first_done.set()          # open gate 1

    def second(self, printSecond: "Callable[[], None]") -> None:
        self.first_done.wait()         # sleep until gate 1 opens
        printSecond()
        self.second_done.set()         # open gate 2

    def third(self, printThird: "Callable[[], None]") -> None:
        self.second_done.wait()
        printThird()

if __name__ == "__main__":
    foo, out = Foo(), []
    calls = {1: lambda: foo.first(lambda: out.append("first")),
             2: lambda: foo.second(lambda: out.append("second")),
             3: lambda: foo.third(lambda: out.append("third"))}
    ts = [threading.Thread(target=calls[i]) for i in (3, 1, 2)]
    for t in ts: t.start()
    for t in ts: t.join()
    print("".join(out))                # firstsecondthird`,
      complexity: `<p>O(1) work per call; waiting threads use no CPU.</p>`,
      followUps: ['Solve it with two Semaphores initialised to 0.', 'Solve it with one Condition and a step counter.']
    }
  });

  practice.push({
    title: 'Thread-Safe Counter Class', level: 'Easy', tags: ['threading', 'Lock', 'race condition'], companies: ['Amazon', 'Goldman Sachs'],
    statement: `<p>Implement <code>Counter</code> with <code>increment(n=1)</code>, <code>decrement(n=1)</code> and a <code>value</code> property, safe to call from many threads at once. 8 threads each calling <code>increment()</code> 10,000 times must always end at exactly 80,000.</p>`,
    constraints: `<p>Up to 64 threads. Operations must be O(1). Must be correct on any CPython build (with or without GIL).</p>`,
    example: `<p>8 threads × 10,000 increments → ${H.c('g', 'value == 80000')}. Without a lock you may get ${H.c('r', '79,4xx')} on some versions/builds because two threads read the same old value.</p>`,
    brute: { why: `<p><code>self._v += n</code> without a lock is load-add-store; a thread switch between load and store loses an update. It may look fine in a quick test and fail in production under load or on a free-threaded build.</p>`, code: `class UnsafeCounter:
    def __init__(self):
        self._v = 0
    def increment(self, n=1):
        self._v += n          # not atomic
    @property
    def value(self):
        return self._v` },
    mcq: { q: 'Does reading self._v for the value property need the lock?', options: ['No, never', 'Yes, to get a consistent value and memory visibility on all builds', 'Only on Windows', 'Only if n > 1'], answer: 1, explain: 'A single int read is atomic in CPython, but taking the lock makes the class correct by construction (and keeps it correct if value later combines several fields).' },
    hints: [`<p>Hint 1: The critical section is the read-modify-write of <code>_v</code>.</p>`, `<p>Hint 2: Create one <code>threading.Lock()</code> in <code>__init__</code> and wrap every access in <code>with self._lock:</code>.</p>`, `<p>Hint 3: Keep the locked block tiny — no I/O or logging inside. Test with 8 threads and an assertion on the final value.</p>`],
    solution: {
      approach: `<p>One lock guards the integer. Every mutation and read happens inside <code>with self._lock</code>, so read-modify-write sequences can't interleave.</p>`,
      code: `import threading

class Counter:
    def __init__(self):
        self._v = 0
        self._lock = threading.Lock()

    def increment(self, n=1):
        with self._lock:
            self._v += n

    def decrement(self, n=1):
        with self._lock:
            self._v -= n

    @property
    def value(self):
        with self._lock:
            return self._v

if __name__ == "__main__":
    c = Counter()
    def work():
        for _ in range(10_000):
            c.increment()
    ts = [threading.Thread(target=work) for _ in range(8)]
    for t in ts: t.start()
    for t in ts: t.join()
    print(c.value)        # 80000`,
      complexity: `<p>O(1) per operation; contention grows with thread count — for very hot counters use per-thread counters summed at the end, or <code>itertools.count()</code> (next() is atomic in CPython) for ID generation.</p>`,
      followUps: ['How would you build a counter that 32 threads update millions of times per second with low contention?', 'Is itertools.count() thread-safe? On which builds?']
    }
  });

  practice.push({
    title: 'Run Coroutines Concurrently and Prove It', level: 'Easy', tags: ['asyncio', 'gather', 'timing'], companies: ['Meta', 'Shopify'],
    statement: `<p>Write <code>async def run_all(delays)</code>. For each delay <code>d</code>, a coroutine waits <code>d</code> seconds (<code>asyncio.sleep</code>) and returns <code>d * 10</code>. Run them <b>concurrently</b> and return <code>(results_in_input_order, elapsed_seconds)</code>. Elapsed should be ≈ max(delays), not their sum.</p>`,
    constraints: `<p>1 ≤ len(delays) ≤ 1000, 0 ≤ d ≤ 2. Use <code>time.perf_counter()</code> for timing.</p>`,
    example: `<p>delays = ${H.c('b', '[0.3, 0.1, 0.2]')} → results ${H.c('g', '[3.0, 1.0, 2.0]')}, elapsed ≈ ${H.c('g', '0.30 s')} (sequential would be 0.60 s).</p>`,
    brute: { why: `<p>Awaiting each coroutine in a for loop runs them one after another: elapsed = sum of delays. It "uses async" but gets zero concurrency.</p>`, code: `import asyncio, time

async def run_all_sequential(delays):
    start = time.perf_counter()
    out = []
    for d in delays:
        await asyncio.sleep(d)
        out.append(d * 10)
    return out, time.perf_counter() - start` },
    mcq: { q: 'Why does asyncio.gather return results in input order even though tasks finish in a different order?', options: ['It sorts them', 'It stores each result at its argument index', 'It runs tasks sequentially', 'It is random'], answer: 1, explain: 'gather wraps each awaitable in a Task and places each result in the slot matching its position in the argument list.' },
    hints: [`<p>Hint 1: Create all coroutines first, then wait for them together.</p>`, `<p>Hint 2: <code>await asyncio.gather(*(job(d) for d in delays))</code>.</p>`, `<p>Hint 3: Measure with <code>time.perf_counter()</code> before and after the gather; round when printing. Edge: empty list → gather returns [].</p>`],
    solution: {
      approach: `<p>Schedule every coroutine at once with <code>gather</code>; the event loop overlaps all the sleeps, so elapsed time is the longest single delay.</p>`,
      code: `import asyncio
import time

async def job(d):
    await asyncio.sleep(d)
    return d * 10

async def run_all(delays):
    start = time.perf_counter()
    results = await asyncio.gather(*(job(d) for d in delays))
    return results, time.perf_counter() - start

if __name__ == "__main__":
    res, secs = asyncio.run(run_all([0.3, 0.1, 0.2]))
    print(res, f"{secs:.2f}s")     # [3.0, 1.0, 2.0] 0.30s`,
      complexity: `<p>Elapsed ≈ max(delays); memory O(n) tasks.</p>`,
      followUps: ['Rewrite with TaskGroup.', 'Print each result as soon as it is ready (as_completed).']
    }
  });

  practice.push({
    title: 'Safe Parallel Map (Order Kept, Errors Captured)', level: 'Easy', tags: ['ThreadPoolExecutor', 'futures', 'error handling'], companies: ['Stripe', 'Atlassian'],
    statement: `<p>Write <code>parallel_map(fn, items, workers)</code> that applies <code>fn</code> to every item using a thread pool and returns a list in <b>input order</b> of <code>("ok", value)</code> or <code>("err", "ExceptionType: message")</code>. One failing item must not hide the others' results.</p>`,
    constraints: `<p>len(items) ≤ 10<sup>4</sup>, workers ≤ 64, fn is I/O-bound.</p>`,
    example: `<p>fn = <code>lambda x: 10 // x</code>, items = ${H.c('b', '[5, 0, 2]')} → ${H.c('g', '[("ok", 2), ("err", "ZeroDivisionError: integer division or modulo by zero"), ("ok", 5)]')}.</p>`,
    brute: { why: `<p><code>list(ex.map(fn, items))</code> raises at the first failing item while iterating, so you lose every later result (they were computed but never collected).</p>`, code: `from concurrent.futures import ThreadPoolExecutor

def parallel_map_fragile(fn, items, workers):
    with ThreadPoolExecutor(workers) as ex:
        return list(ex.map(fn, items))     # first exception aborts the list` },
    mcq: { q: 'How do you keep input order while still catching errors per item?', options: ['as_completed and sort by finish time', 'submit each item, keep the futures in a list, then read them in list order', 'Use ex.map and catch around list()', 'Use a global results dict without keys'], answer: 1, explain: 'A list of futures in submission order preserves input order; calling result() inside try/except per future isolates failures.' },
    hints: [`<p>Hint 1: <code>submit</code> returns a Future per item — keep them in a list.</p>`, `<p>Hint 2: Loop over the list; wrap <code>f.result()</code> in try/except and build the tuple.</p>`, `<p>Hint 3: Format errors as <code>f"{type(e).__name__}: {e}"</code>. Empty input → empty list.</p>`],
    solution: {
      approach: `<p>Submit everything, keep futures in input order, then resolve them one by one with per-future exception handling. Execution is parallel; collection order is deterministic.</p>`,
      code: `from concurrent.futures import ThreadPoolExecutor

def parallel_map(fn, items, workers=8):
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = [ex.submit(fn, x) for x in items]
        out = []
        for f in futures:                       # input order
            try:
                out.append(("ok", f.result()))
            except Exception as e:
                out.append(("err", f"{type(e).__name__}: {e}"))
        return out

if __name__ == "__main__":
    print(parallel_map(lambda x: 10 // x, [5, 0, 2], workers=3))`,
      complexity: `<p>Wall time ≈ ⌈n / workers⌉ × per-item latency; O(n) memory.</p>`,
      followUps: ['Add a per-item timeout.', 'Make it lazy for an infinite generator of items.']
    }
  });

  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'Print FooBar Alternately (LeetCode 1115)', level: 'Medium', tags: ['threading', 'Semaphore', 'ping-pong'], companies: ['Microsoft', 'Uber'],
    statement: `<p>Thread A calls <code>foo()</code>, which prints "foo" n times; thread B calls <code>bar()</code>, which prints "bar" n times. Make the output exactly "foobar" repeated n times, regardless of scheduling.</p>`,
    constraints: `<p>1 ≤ n ≤ 1000. No busy waiting.</p>`,
    example: `<p>n = 2 → ${H.c('g', '"foobarfoobar"')}. If B starts first it must wait; after each "foo" the turn passes to B, after each "bar" back to A.</p>`,
    brute: { why: `<p>A shared <code>turn</code> variable polled in a loop works but spins the CPU and fights for the GIL; a single Lock doesn't enforce <i>alternation</i>, only exclusion.</p>`, code: `class FooBarSpin:
    def __init__(self, n):
        self.n, self.turn = n, "foo"
    def foo(self, printFoo):
        for _ in range(self.n):
            while self.turn != "foo":
                pass
            printFoo(); self.turn = "bar"
    def bar(self, printBar):
        for _ in range(self.n):
            while self.turn != "bar":
                pass
            printBar(); self.turn = "foo"` },
    mcq: { q: 'Initial values for the two semaphores (foo_sem, bar_sem)?', options: ['(0, 0)', '(1, 0)', '(1, 1)', '(0, 1)'], answer: 1, explain: 'foo goes first, so it starts with one permit; bar starts blocked. Each side releases the other after printing — a token passed back and forth.' },
    hints: [`<p>Hint 1: Think of a single "turn token" passed between two threads.</p>`, `<p>Hint 2: Two semaphores: foo acquires foo_sem, prints, releases bar_sem; bar acquires bar_sem, prints, releases foo_sem.</p>`, `<p>Hint 3: Start foo_sem at 1, bar_sem at 0. Each method loops n times.</p>`],
    solution: {
      approach: `<p>Two semaphores model whose turn it is. Exactly one permit exists across both at any time, so the threads strictly alternate.</p>`,
      code: `import threading

class FooBar:
    def __init__(self, n):
        self.n = n
        self.foo_sem = threading.Semaphore(1)   # foo may go first
        self.bar_sem = threading.Semaphore(0)   # bar must wait

    def foo(self, printFoo: "Callable[[], None]") -> None:
        for _ in range(self.n):
            self.foo_sem.acquire()
            printFoo()
            self.bar_sem.release()              # hand the turn to bar

    def bar(self, printBar: "Callable[[], None]") -> None:
        for _ in range(self.n):
            self.bar_sem.acquire()
            printBar()
            self.foo_sem.release()              # hand the turn back

if __name__ == "__main__":
    fb, out = FooBar(3), []
    tb = threading.Thread(target=fb.bar, args=(lambda: out.append("bar"),))
    ta = threading.Thread(target=fb.foo, args=(lambda: out.append("foo"),))
    tb.start(); ta.start(); ta.join(); tb.join()
    print("".join(out))                         # foobarfoobarfoobar`,
      dry: { head: ['step', 'foo_sem', 'bar_sem', 'printed'], rows: [['start', '1', '0', ''], ['A acquires foo', '0', '1', 'foo'], ['B acquires bar', '1', '0', 'foobar'], ['A acquires foo', '0', '1', 'foobarfoo']] },
      complexity: `<p>O(n) prints, two context switches per pair.</p>`,
      followUps: ['Generalise to k threads printing in a ring.', 'Solve it with asyncio.Event in one thread.']
    }
  });

  practice.push({
    title: 'Print Zero Even Odd (LeetCode 1116)', level: 'Medium', tags: ['threading', 'Semaphore', 'coordination'], companies: ['Microsoft', 'Bloomberg'],
    statement: `<p>Three threads share a <code>ZeroEvenOdd(n)</code> object: one calls <code>zero()</code>, one <code>even()</code>, one <code>odd()</code>. Together they must print "0102030405…" up to n: a zero before every number, numbers in increasing order.</p>`,
    constraints: `<p>1 ≤ n ≤ 1000. Each method receives <code>printNumber(x)</code>.</p>`,
    example: `<p>n = 5 → ${H.c('g', '"0102030405"')}. zero prints 0 then wakes odd for 1; odd wakes zero; zero wakes even for 2; and so on.</p>`,
    brute: { why: `<p>One Lock and a shared "next" counter checked in loops leads to busy-waiting and tricky off-by-one bugs; nobody is told when it is their turn.</p>`, code: `class ZeroEvenOddSpin:
    def __init__(self, n):
        self.n, self.state, self.k = n, "zero", 1
    def zero(self, printNumber):
        for _ in range(self.n):
            while self.state != "zero":
                pass
            printNumber(0)
            self.state = "odd" if self.k % 2 else "even"` },
    mcq: { q: 'Who decides whether odd() or even() runs next?', options: ['odd and even race for it', 'zero(), based on the next number\'s parity', 'A random choice', 'The OS scheduler'], answer: 1, explain: 'zero knows the next number i; it releases the odd semaphore if i is odd, otherwise the even one. That makes the hand-off deterministic.' },
    hints: [`<p>Hint 1: Three semaphores: zero_sem=1, odd_sem=0, even_sem=0.</p>`, `<p>Hint 2: zero loops i = 1..n: acquire zero_sem, print 0, release odd_sem if i odd else even_sem.</p>`, `<p>Hint 3: odd loops over 1,3,5…: acquire odd_sem, print, release zero_sem. even loops over 2,4,6… similarly. Loop counts must match exactly or a thread waits forever.</p>`],
    solution: {
      approach: `<p>zero is the conductor: after each 0 it signals the thread that owns the next number. That thread prints and hands control back to zero.</p>`,
      code: `import threading

class ZeroEvenOdd:
    def __init__(self, n):
        self.n = n
        self.zero_sem = threading.Semaphore(1)
        self.odd_sem = threading.Semaphore(0)
        self.even_sem = threading.Semaphore(0)

    def zero(self, printNumber: "Callable[[int], None]") -> None:
        for i in range(1, self.n + 1):
            self.zero_sem.acquire()
            printNumber(0)
            (self.odd_sem if i % 2 else self.even_sem).release()

    def even(self, printNumber: "Callable[[int], None]") -> None:
        for i in range(2, self.n + 1, 2):
            self.even_sem.acquire()
            printNumber(i)
            self.zero_sem.release()

    def odd(self, printNumber: "Callable[[int], None]") -> None:
        for i in range(1, self.n + 1, 2):
            self.odd_sem.acquire()
            printNumber(i)
            self.zero_sem.release()

if __name__ == "__main__":
    z, out = ZeroEvenOdd(5), []
    p = lambda x: out.append(str(x))
    ts = [threading.Thread(target=f, args=(p,)) for f in (z.even, z.odd, z.zero)]
    for t in ts: t.start()
    for t in ts: t.join()
    print("".join(out))      # 0102030405`,
      complexity: `<p>O(n) prints, 2n hand-offs.</p>`,
      followUps: ['What happens if even() loops one time too many?', 'Rewrite using a single Condition and a state variable.']
    }
  });

  practice.push({
    title: 'Design a Bounded Blocking Queue (LeetCode 1188)', level: 'Medium', tags: ['threading', 'Condition', 'producer-consumer'], companies: ['Google', 'LinkedIn', 'Rubrik'],
    statement: `<p>Implement <code>BoundedBlockingQueue(capacity)</code> with <code>enqueue(x)</code> (blocks while full), <code>dequeue()</code> (blocks while empty) and <code>size()</code>. Many producer and consumer threads use it at once. Do <b>not</b> use <code>queue.Queue</code>.</p>`,
    constraints: `<p>1 ≤ capacity ≤ 30; up to 50 threads; up to 10<sup>4</sup> operations.</p>`,
    example: `<p>capacity 2: enqueue 1, enqueue 2, enqueue 3 → ${H.c('r', 'blocks')}; another thread dequeues → returns ${H.c('g', '1')} and wakes the blocked producer, which inserts 3.</p>`,
    brute: { why: `<p>Polling with <code>while len(q) == cap: time.sleep(0.01)</code> wastes CPU, adds up to 10 ms latency per wait, and the check-then-append is still racy without a lock.</p>`, code: `import time
from collections import deque

class PollingQueue:
    def __init__(self, cap):
        self.cap, self.q = cap, deque()
    def enqueue(self, x):
        while len(self.q) >= self.cap:
            time.sleep(0.01)       # polling + race between check and append
        self.q.append(x)` },
    mcq: { q: 'Why must Condition.wait() be called inside a while loop, not an if?', options: ['wait() is slow', 'Another thread may grab the item between notify and wake-up (and spurious wake-ups exist)', 'Python requires it syntactically', 'To release the lock'], answer: 1, explain: 'After waking you must re-check the predicate: another consumer may have taken the item first. while not predicate: wait() is the standard pattern (or wait_for).' },
    hints: [`<p>Hint 1: One lock, two Conditions sharing it: <code>not_full</code> and <code>not_empty</code>.</p>`, `<p>Hint 2: enqueue: <code>with not_full: while full: not_full.wait()</code>; append; <code>not_empty.notify()</code>. dequeue is the mirror image.</p>`, `<p>Hint 3: Use a <code>deque</code> for O(1) popleft. <code>notify()</code> (not notify_all) is enough because each operation frees exactly one slot / adds one item.</p>`],
    solution: {
      approach: `<p>Exactly how <code>queue.Queue</code> is built: a mutex plus two condition variables on it. Producers wait on "not full", consumers on "not empty"; each successful operation notifies the other side.</p>`,
      code: `import threading
from collections import deque

class BoundedBlockingQueue:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.items = deque()
        lock = threading.Lock()
        self.not_full = threading.Condition(lock)
        self.not_empty = threading.Condition(lock)

    def enqueue(self, element: int) -> None:
        with self.not_full:
            while len(self.items) >= self.cap:
                self.not_full.wait()
            self.items.append(element)
            self.not_empty.notify()        # wake one consumer

    def dequeue(self) -> int:
        with self.not_empty:
            while not self.items:
                self.not_empty.wait()
            x = self.items.popleft()
            self.not_full.notify()         # wake one producer
            return x

    def size(self) -> int:
        with self.not_full:
            return len(self.items)

if __name__ == "__main__":
    q, got = BoundedBlockingQueue(2), []
    prod = [threading.Thread(target=lambda i=i: q.enqueue(i)) for i in range(6)]
    cons = [threading.Thread(target=lambda: got.append(q.dequeue())) for _ in range(6)]
    for t in prod + cons: t.start()
    for t in prod + cons: t.join()
    print(sorted(got), q.size())           # [0, 1, 2, 3, 4, 5] 0`,
      dry: { head: ['op', 'items', 'blocked'], rows: [['enqueue 0', '[0]', '-'], ['enqueue 1', '[0, 1]', '-'], ['enqueue 2', '[0, 1]', 'producer waits on not_full'], ['dequeue → 0', '[1] then [1, 2]', 'producer woken, appends 2']] },
      complexity: `<p>O(1) per operation; blocked threads use no CPU.</p>`,
      followUps: ['Add timeouts to enqueue/dequeue.', 'Write the asyncio version with asyncio.Condition.', 'How would you add a close() that wakes everyone?']
    }
  });

  practice.push({
    title: 'Building H2O (LeetCode 1117)', level: 'Medium', tags: ['threading', 'Barrier', 'Semaphore'], companies: ['Uber', 'Microsoft'],
    statement: `<p>Hydrogen and oxygen threads arrive in any order. Group them into water molecules: each group of 3 must contain exactly 2 H and 1 O, and all three must "bond" (print) before any thread of the next molecule prints.</p>`,
    constraints: `<p>Total threads 3n, n ≤ 20; input like "HOH", "OOHHHH".</p>`,
    example: `<p>Input ${H.c('b', '"OOHHHH"')} → valid outputs include ${H.c('g', '"HHOHHO"')}, ${H.c('g', '"HOHHHO"')} — each consecutive triple has 2 H and 1 O.</p>`,
    brute: { why: `<p>Counting H and O under one lock and releasing threads when counts hit 2 and 1 needs careful reset logic; it's easy to let a third H slip into a molecule or deadlock when counts reset early.</p>`, code: `import threading

class H2OCounting:
    def __init__(self):
        self.lock = threading.Lock()
        self.h = self.o = 0          # fragile manual bookkeeping
    def hydrogen(self, releaseHydrogen):
        with self.lock:
            self.h += 1
        releaseHydrogen()` },
    mcq: { q: 'What does threading.Barrier(3) contribute here?', options: ['Limits H to 2', 'Makes the three members of one molecule wait for each other before bonding', 'Prints the output', 'Prevents deadlock automatically'], answer: 1, explain: 'Semaphores (2 for H, 1 for O) choose WHO is in the molecule; the barrier makes them proceed TOGETHER.' },
    hints: [`<p>Hint 1: Separate two concerns: admission (who joins the current molecule) and rendezvous (wait for all three).</p>`, `<p>Hint 2: <code>Semaphore(2)</code> for H, <code>Semaphore(1)</code> for O, <code>Barrier(3)</code> for the meet-up.</p>`, `<p>Hint 3: Acquire your semaphore, wait at the barrier, release your atom, then release the semaphore — releasing only after printing keeps the next molecule from overtaking.</p>`],
    solution: {
      approach: `<p>The semaphores admit at most 2 H and 1 O into the "bonding room"; the barrier makes the three admitted threads release together. Because permits are returned only after printing, the next molecule cannot complete its barrier until the current one has printed.</p>`,
      code: `import threading

class H2O:
    def __init__(self):
        self.h_slots = threading.Semaphore(2)
        self.o_slots = threading.Semaphore(1)
        self.barrier = threading.Barrier(3)

    def hydrogen(self, releaseHydrogen: "Callable[[], None]") -> None:
        with self.h_slots:              # at most 2 H in the current molecule
            self.barrier.wait()         # wait for partners
            releaseHydrogen()

    def oxygen(self, releaseOxygen: "Callable[[], None]") -> None:
        with self.o_slots:              # exactly 1 O
            self.barrier.wait()
            releaseOxygen()

if __name__ == "__main__":
    w, out, lock = H2O(), [], threading.Lock()
    def emit(c):
        with lock:
            out.append(c)
    ts = [threading.Thread(target=(w.hydrogen if c == "H" else w.oxygen), args=(lambda c=c: emit(c),)) for c in "OOHHHH"]
    for t in ts: t.start()
    for t in ts: t.join()
    s = "".join(out)
    print(s, all(sorted(s[i:i + 3]) == ["H", "H", "O"] for i in range(0, len(s), 3)))`,
      complexity: `<p>O(1) per thread; each molecule costs one barrier cycle.</p>`,
      followUps: ['Generalise to molecules like CH4.', 'What breaks if you release the semaphore before calling releaseHydrogen?']
    }
  });

  practice.push({
    title: 'Dining Philosophers Without Deadlock (LeetCode 1226)', level: 'Medium', tags: ['threading', 'deadlock', 'lock ordering'], companies: ['Google', 'Microsoft', 'Oracle'],
    statement: `<p>Five philosophers sit at a round table with one fork between each pair. To eat, a philosopher needs both adjacent forks. Implement <code>wantsToEat(philosopher, pickLeftFork, pickRightFork, eat, putLeftFork, putRightFork)</code> so that no deadlock can occur, and explain which deadlock condition you broke.</p>`,
    constraints: `<p>5 philosophers, each wants to eat n times (1 ≤ n ≤ 60), called from 5 threads.</p>`,
    example: `<p>Naive: all 5 pick up their left fork simultaneously → each waits for the right fork forever → ${H.c('r', 'deadlock')}. With ordered acquisition (always lower-numbered fork first) philosopher 4 reaches for fork 0 first, breaking the cycle → ${H.c('g', 'everyone eventually eats')}.</p>`,
    brute: { why: `<p>"Pick left, then right" creates a circular wait: P0 waits for P1's fork, …, P4 waits for P0's fork. All four Coffman conditions hold (mutual exclusion, hold-and-wait, no preemption, circular wait), so it can deadlock.</p>`, code: `import threading

class NaiveTable:
    def __init__(self):
        self.forks = [threading.Lock() for _ in range(5)]
    def wantsToEat(self, p, pickL, pickR, eat, putL, putR):
        left, right = self.forks[p], self.forks[(p + 1) % 5]
        with left:            # everyone grabs left first...
            with right:       # ...and may wait here forever
                pickL(); pickR(); eat(); putL(); putR()` },
    mcq: { q: 'Acquiring forks in global numeric order breaks which deadlock condition?', options: ['Mutual exclusion', 'Hold and wait', 'No preemption', 'Circular wait'], answer: 3, explain: 'With a total order on locks, a cycle of waiting threads is impossible: someone always holds the highest-numbered lock they need and can proceed.' },
    hints: [`<p>Hint 1: Deadlock needs a cycle of "holds A, waits for B". Remove the cycle.</p>`, `<p>Hint 2: Number forks 0–4. Each philosopher locks <code>min(left, right)</code> first, then <code>max(left, right)</code>.</p>`, `<p>Hint 3: Alternatives: a <code>Semaphore(4)</code> so at most 4 philosophers try at once (breaks circular wait too), or a single table lock (correct but no parallel eating).</p>`],
    solution: {
      approach: `<p><b>Resource ordering.</b> Every philosopher acquires the lower-numbered fork first. Philosopher 4 (forks 4 and 0) therefore reaches for fork 0 first, which breaks the circular wait. Two non-adjacent philosophers can still eat in parallel.</p>`,
      code: `import threading

class DiningPhilosophers:
    def __init__(self):
        self.forks = [threading.Lock() for _ in range(5)]

    def wantsToEat(self, philosopher: int, pickLeftFork, pickRightFork, eat,
                   putLeftFork, putRightFork) -> None:
        left, right = philosopher, (philosopher + 1) % 5
        first, second = sorted((left, right))      # global order → no cycle
        with self.forks[first], self.forks[second]:
            pickLeftFork()
            pickRightFork()
            eat()
            putLeftFork()
            putRightFork()

if __name__ == "__main__":
    table, meals = DiningPhilosophers(), [0] * 5
    def diner(p):
        for _ in range(50):
            table.wantsToEat(p, lambda: None, lambda: None,
                             lambda: meals.__setitem__(p, meals[p] + 1),
                             lambda: None, lambda: None)
    ts = [threading.Thread(target=diner, args=(p,)) for p in range(5)]
    for t in ts: t.start()
    for t in ts: t.join()
    print(meals)          # [50, 50, 50, 50, 50] — no deadlock`,
      complexity: `<p>O(1) per meal; up to 2 philosophers eat concurrently.</p>`,
      followUps: ['Is the solution starvation-free? How would you guarantee fairness?', 'Implement the Semaphore(4) "waiter" variant.', 'Where does lock ordering appear in real systems (DB row locks, bank transfers)?']
    }
  });

  practice.push({
    title: 'Async Retry with Exponential Backoff and Jitter', level: 'Medium', tags: ['asyncio', 'retries', 'resilience'], companies: ['AWS', 'Anthropic', 'Netflix'],
    statement: `<p>Write <code>async def retry(op, attempts=5, base=0.1, cap=2.0, retry_on=(ConnectionError, TimeoutError))</code> that awaits <code>op()</code>, retrying only on the listed exceptions, waiting a random delay between 0 and <code>min(cap, base · 2<sup>i</sup>)</code> before attempt i+1 ("full jitter"). Re-raise the last error after the final attempt. Other exceptions propagate immediately.</p>`,
    constraints: `<p>attempts ≤ 10. Must not swallow <code>CancelledError</code>. Delays must be awaited (not time.sleep).</p>`,
    example: `<p>op fails with ConnectionError twice, then returns "ok" → result ${H.c('g', '"ok"')} after waits in ${H.c('b', '[0, 0.1]')} and ${H.c('b', '[0, 0.2]')}. If op raises ValueError → ${H.c('r', 'raised immediately')}, no retry.</p>`,
    brute: { why: `<p>A fixed <code>time.sleep(1)</code> retry loop blocks the event loop, retries non-retryable errors (bugs), and makes thousands of clients retry at the same instant (a "thundering herd") after an outage.</p>`, code: `import time

async def retry_naive(op, attempts=5):
    for i in range(attempts):
        try:
            return await op()
        except Exception:
            time.sleep(1)          # blocks the loop; retries everything
    return None` },
    mcq: { q: 'Why add random jitter to the backoff?', options: ['To make tests slower', 'To spread retries out so many clients don\'t hit the server at the same moment', 'Because asyncio requires it', 'To avoid CancelledError'], answer: 1, explain: 'Without jitter, all clients that failed together retry together, recreating the overload. Full jitter (uniform 0..delay) spreads them out.' },
    hints: [`<p>Hint 1: Loop over attempt index i; try <code>return await op()</code>.</p>`, `<p>Hint 2: <code>except retry_on as e:</code> remember it; if it was the last attempt, raise; else <code>await asyncio.sleep(random.uniform(0, min(cap, base * 2 ** i)))</code>.</p>`, `<p>Hint 3: Don't catch broad <code>Exception</code> (bugs should surface) and never catch <code>CancelledError</code>. Accept a <code>sleep</code> parameter to make it testable.</p>`],
    solution: {
      approach: `<p>Bounded attempts, selective exceptions, exponential growth capped at <code>cap</code>, full jitter, and non-blocking <code>asyncio.sleep</code>. Cancellation passes straight through because <code>CancelledError</code> isn't in <code>retry_on</code>.</p>`,
      code: `import asyncio
import random

async def retry(op, attempts=5, base=0.1, cap=2.0,
                retry_on=(ConnectionError, TimeoutError), sleep=asyncio.sleep):
    for i in range(attempts):
        try:
            return await op()
        except retry_on:
            if i == attempts - 1:
                raise                                   # out of attempts
            delay = random.uniform(0, min(cap, base * 2 ** i))
            await sleep(delay)                          # non-blocking wait

if __name__ == "__main__":
    calls = 0
    async def flaky():
        global calls
        calls += 1
        if calls < 3:
            raise ConnectionError("reset")
        return "ok"
    print(asyncio.run(retry(flaky, base=0.01)), "after", calls, "calls")   # ok after 3 calls`,
      complexity: `<p>At most <code>attempts</code> calls; expected total wait ≈ ½ · Σ min(cap, base·2<sup>i</sup>).</p>`,
      followUps: ['Honour a Retry-After header from a 429 response.', 'Add a total deadline across all attempts.', 'When should you NOT retry (non-idempotent POST without idempotency key)?']
    }
  });

  practice.push({
    title: 'Async Token-Bucket Rate Limiter', level: 'Medium', tags: ['asyncio', 'rate limiting', 'token bucket'], companies: ['Stripe', 'Cloudflare', 'OpenAI'],
    statement: `<p>Implement <code>TokenBucket(rate, capacity)</code> with <code>async acquire()</code>. Tokens refill continuously at <code>rate</code> per second up to <code>capacity</code>. <code>acquire()</code> takes one token, waiting (without blocking the loop) if none is available. Many tasks may call it concurrently; they must be served in arrival order.</p>`,
    constraints: `<p>rate ≤ 10<sup>4</sup>/s, capacity ≤ 10<sup>4</sup>, up to 10<sup>4</sup> waiting tasks.</p>`,
    example: `<p>rate = 20/s, capacity = 5, 10 tasks call acquire at t=0 → the first ${H.c('g', '5 pass instantly')} (burst), then one every ${H.c('b', '0.05 s')}: total ≈ ${H.c('g', '0.25 s')}.</p>`,
    brute: { why: `<p>A Semaphore limits <b>concurrency</b>, not <b>rate</b>: 5 slots with fast calls can still do thousands per second. A "sleep 1/rate after each call" approach ignores bursts and drifts.</p>`, code: `import asyncio

class NaiveLimiter:
    def __init__(self, rate):
        self.rate = rate
    async def acquire(self):
        await asyncio.sleep(1 / self.rate)    # every caller sleeps in parallel → no real limit` },
    mcq: { q: 'Why hold an asyncio.Lock while a caller sleeps for its token?', options: ['To block the event loop', 'So waiting callers are served one at a time in FIFO order and token math isn\'t raced', 'Locks make sleeping faster', 'It is not needed in asyncio'], answer: 1, explain: 'asyncio.Lock is FIFO-fair. Holding it serialises the refill-check-sleep-consume sequence, which spans an await and would otherwise race.' },
    hints: [`<p>Hint 1: Store <code>tokens</code> (float) and <code>last</code> refill time (<code>loop.time()</code>, monotonic).</p>`, `<p>Hint 2: Refill: <code>tokens = min(capacity, tokens + (now - last) * rate)</code>. If tokens ≥ 1 → take one. Else sleep <code>(1 - tokens) / rate</code> and refill again.</p>`, `<p>Hint 3: Wrap the whole thing in <code>async with self._lock</code> so callers queue fairly. Start full (capacity tokens) to allow an initial burst.</p>`],
    solution: {
      approach: `<p>Lazy refill on each call (no background task), monotonic time, and an asyncio.Lock to make the check-sleep-consume sequence atomic and FIFO. The loop stays free while callers sleep.</p>`,
      code: `import asyncio
import time

class TokenBucket:
    def __init__(self, rate: float, capacity: int):
        self.rate, self.capacity = rate, capacity
        self.tokens = float(capacity)
        self.last = None
        self._lock = asyncio.Lock()

    def _refill(self, now):
        if self.last is not None:
            self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now

    async def acquire(self):
        loop = asyncio.get_running_loop()
        async with self._lock:                         # FIFO for waiters
            self._refill(loop.time())
            while self.tokens < 1:
                await asyncio.sleep((1 - self.tokens) / self.rate)
                self._refill(loop.time())
            self.tokens -= 1

async def main():
    bucket = TokenBucket(rate=20, capacity=5)
    start = time.perf_counter()
    stamps = []
    async def call(i):
        await bucket.acquire()
        stamps.append(round(time.perf_counter() - start, 2))
    await asyncio.gather(*(call(i) for i in range(10)))
    print(stamps)          # ~[0.0 x5, 0.05, 0.1, 0.15, 0.2, 0.25]

if __name__ == "__main__":
    asyncio.run(main())`,
      complexity: `<p>O(1) per acquire plus waiting; memory O(1) + queued waiters in the lock.</p>`,
      followUps: ['Support acquire(n) for token-weighted limits (LLM tokens per minute).', 'Share the limit across processes (Redis + Lua script).', 'Compare with a sliding-window counter.']
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Writer-Preferring Read-Write Lock', level: 'Hard', tags: ['threading', 'Condition', 'read-write lock', 'starvation'], companies: ['Google', 'Databricks', 'Oracle'],
    statement: `<p>Implement <code>RWLock</code> with context managers <code>read()</code> and <code>write()</code>. Many readers may hold the lock together; a writer needs exclusive access. It must be <b>writer-preferring</b>: once a writer is waiting, new readers must wait, so a steady stream of readers can't starve writers.</p>`,
    constraints: `<p>Up to 100 threads; reads are 10× more frequent than writes. Python has no built-in RW lock.</p>`,
    example: `<p>Readers R1, R2 are reading. Writer W arrives → waits. Reader R3 arrives → ${H.c('y', 'must wait')} (W is waiting). R1, R2 finish → ${H.c('g', 'W writes alone')} → then R3 reads.</p>`,
    brute: { why: `<p>One plain Lock for everything is correct but serialises readers, losing all read parallelism. A reader-preferring RW lock (readers enter whenever no writer is <i>active</i>) lets continuous readers starve writers forever.</p>`, code: `import threading
from contextlib import contextmanager

class ReaderPreferring:
    def __init__(self):
        self.cond = threading.Condition()
        self.readers, self.writer = 0, False
    @contextmanager
    def read(self):
        with self.cond:
            while self.writer:              # ignores WAITING writers → starvation
                self.cond.wait()
            self.readers += 1
        try:
            yield
        finally:
            with self.cond:
                self.readers -= 1
                self.cond.notify_all()` },
    mcq: { q: 'Which extra piece of state makes the lock writer-preferring?', options: ['A count of active readers', 'A count of WAITING writers that readers check before entering', 'A second Lock for readers', 'A timeout on read()'], answer: 1, explain: 'Readers wait while writer_active OR waiting_writers > 0. Writers announce themselves by incrementing waiting_writers before waiting.' },
    hints: [`<p>Hint 1: State under one Condition: <code>readers</code> (active), <code>writer</code> (bool active), <code>waiting_writers</code>.</p>`, `<p>Hint 2: read-enter waits while <code>writer or waiting_writers</code>; write-enter increments waiting_writers, waits while <code>writer or readers</code>, then decrements and sets writer=True.</p>`, `<p>Hint 3: On every exit, <code>notify_all()</code> (both readers and writers may be waiting on different predicates). Use <code>try/finally</code> in the context managers so exceptions don't leak the lock.</p>`],
    solution: {
      approach: `<p>A single Condition guards three counters. Readers defer to both active and waiting writers; writers wait only for active users. <code>notify_all</code> on release wakes everyone to re-check their predicate. Readers can still be delayed by a steady stream of writers (the opposite trade-off), which is usually acceptable because writes are rare.</p>`,
      code: `import threading
import time
from contextlib import contextmanager

class RWLock:
    def __init__(self):
        self._cond = threading.Condition()
        self._readers = 0
        self._writer = False
        self._waiting_writers = 0

    @contextmanager
    def read(self):
        with self._cond:
            while self._writer or self._waiting_writers:
                self._cond.wait()
            self._readers += 1
        try:
            yield
        finally:
            with self._cond:
                self._readers -= 1
                if self._readers == 0:
                    self._cond.notify_all()

    @contextmanager
    def write(self):
        with self._cond:
            self._waiting_writers += 1
            while self._writer or self._readers:
                self._cond.wait()
            self._waiting_writers -= 1
            self._writer = True
        try:
            yield
        finally:
            with self._cond:
                self._writer = False
                self._cond.notify_all()

if __name__ == "__main__":
    lock, log = RWLock(), []
    data = {"v": 0}
    def reader(i):
        with lock.read():
            log.append(f"R{i} sees {data['v']}")
            time.sleep(0.02)
    def writer():
        with lock.write():
            data["v"] += 1
            log.append("W wrote")
    ts = [threading.Thread(target=reader, args=(i,)) for i in range(3)]
    ts.insert(2, threading.Thread(target=writer))
    for t in ts:
        t.start()
        time.sleep(0.005)
    for t in ts: t.join()
    print(log)`,
      dry: { head: ['event', 'readers', 'writer', 'waiting_writers', 'who waits'], rows: [['R0, R1 enter', '2', 'F', '0', '-'], ['W arrives', '2', 'F', '1', 'W'], ['R2 arrives', '2', 'F', '1', 'W, R2 (writer waiting)'], ['R0, R1 leave → W enters', '0', 'T', '0', 'R2'], ['W leaves → R2 enters', '1', 'F', '0', '-']] },
      complexity: `<p>O(1) per acquire/release plus wake-ups; notify_all can cause a thundering herd with many waiters — acceptable at ~100 threads.</p>`,
      followUps: ['Make it fair (FIFO) between readers and writers.', 'Support upgrading a read lock to a write lock — why is that deadlock-prone?', 'Write the asyncio version.']
    }
  });

  practice.push({
    title: 'Async Priority Job Scheduler with Limits and Cancellation', level: 'Hard', tags: ['asyncio', 'PriorityQueue', 'cancellation', 'design'], companies: ['Airbnb', 'Datadog', 'Anthropic'],
    statement: `<p>Build <code>Scheduler(limit)</code> for async jobs. <code>submit(fn, priority)</code> (lower number = more urgent) returns <code>(job_id, future)</code>. At most <code>limit</code> jobs run at once; the most urgent waiting job starts next (FIFO among equal priorities). <code>cancel(job_id)</code> works for both waiting and running jobs and must <b>not</b> kill the worker. <code>close()</code> shuts everything down cleanly.</p>`,
    constraints: `<p>limit ≤ 100, up to 10<sup>5</sup> jobs, Python 3.11+.</p>`,
    example: `<p>limit = 1. Submit A(p=5), B(p=1), C(p=1), D(p=9); cancel C before it starts → run order ${H.c('g', 'B, A, D')}; C's future is ${H.c('r', 'cancelled')}. (B and C tie on priority, so submission order breaks the tie.)</p>`,
    brute: { why: `<p>Calling <code>asyncio.create_task</code> for every job ignores priority and limits (all start at once). A Semaphore adds a limit but wakes waiters in FIFO order, not priority order, and cancelling a job by cancelling the worker task loses the worker.</p>`, code: `import asyncio

class NaiveScheduler:
    def __init__(self, limit):
        self.sem = asyncio.Semaphore(limit)
    def submit(self, fn, priority=10):
        async def run():
            async with self.sem:              # FIFO, priority ignored
                return await fn()
        return asyncio.create_task(run())` },
    mcq: { q: 'How should a worker tell "the job was cancelled" from "I (the worker) am being shut down" when it catches CancelledError?', options: ['Check fut.done()', 'asyncio.current_task().cancelling() > 0 means the worker itself is being cancelled', 'Catch Exception instead', 'It cannot tell'], answer: 1, explain: 'Since 3.11 a task tracks pending cancel requests. If the worker\'s own cancelling() count is non-zero, the cancel was aimed at the worker → re-raise. Otherwise only the inner job was cancelled → mark its future and keep looping.' },
    hints: [`<p>Hint 1: <code>asyncio.PriorityQueue</code> of <code>(priority, seq, job_id, fn)</code>; the increasing <code>seq</code> gives FIFO ties and avoids comparing functions.</p>`, `<p>Hint 2: Start exactly <code>limit</code> worker tasks. Each loops: get job → if its future is cancelled, skip → run <code>fn()</code> as its own Task (so it can be cancelled separately) → set the future's result/exception.</p>`, `<p>Hint 3: <code>cancel()</code>: if running, cancel the job's Task; if waiting, cancel the Future (worker skips it). <code>close()</code>: cancel workers and gather them with <code>return_exceptions=True</code>.</p>`],
    solution: {
      approach: `<p>A priority queue feeds a fixed pool of worker tasks (the concurrency limit). Each job runs in its own Task so it can be cancelled independently; the worker distinguishes job cancellation from its own shutdown via <code>cancelling()</code>. Futures give callers a handle for results, exceptions and cancellation.</p>`,
      code: `import asyncio
import itertools

class Scheduler:
    def __init__(self, limit):
        self._q = asyncio.PriorityQueue()
        self._seq = itertools.count()
        self._futures = {}
        self._running = {}
        self._workers = [asyncio.create_task(self._worker()) for _ in range(limit)]

    def submit(self, fn, priority=10):
        job_id = next(self._seq)
        fut = asyncio.get_running_loop().create_future()
        self._futures[job_id] = fut
        self._q.put_nowait((priority, job_id, fn))
        return job_id, fut

    def cancel(self, job_id):
        fut = self._futures.get(job_id)
        if fut is None or fut.done():
            return False
        task = self._running.get(job_id)
        if task is not None:
            task.cancel()                   # running: cancel the job's own task
        else:
            fut.cancel()                    # waiting: worker will skip it
        return True

    async def _worker(self):
        while True:
            _, job_id, fn = await self._q.get()
            fut = self._futures[job_id]
            try:
                if fut.cancelled():
                    continue
                task = asyncio.create_task(fn())
                self._running[job_id] = task
                try:
                    result = await task
                    if not fut.done():
                        fut.set_result(result)
                except asyncio.CancelledError:
                    fut.cancel()
                    if asyncio.current_task().cancelling():
                        task.cancel()
                        raise               # the WORKER is shutting down
                except Exception as e:
                    if not fut.done():
                        fut.set_exception(e)
                finally:
                    self._running.pop(job_id, None)
            finally:
                self._futures.pop(job_id, None)
                self._q.task_done()

    async def close(self):
        for w in self._workers:
            w.cancel()
        await asyncio.gather(*self._workers, return_exceptions=True)

async def main():
    order = []
    def job(name, secs):
        async def run():
            order.append(name)
            await asyncio.sleep(secs)
            return name
        return run
    s = Scheduler(limit=1)
    _, fa = s.submit(job("A", 0.01), priority=5)
    _, fb = s.submit(job("B", 0.01), priority=1)
    c_id, fc = s.submit(job("C", 0.01), priority=1)
    _, fd = s.submit(job("D", 0.5), priority=9)
    s.cancel(c_id)                                  # cancel while waiting
    print(await fb, await fa)                       # B A
    await asyncio.sleep(0.05)
    print("D running:", order[-1] == "D", "cancel D:", s.cancel(3))
    await asyncio.sleep(0.01)
    print("order:", order, "C cancelled:", fc.cancelled(), "D cancelled:", fd.cancelled())
    await s.close()

if __name__ == "__main__":
    asyncio.run(main())`,
      complexity: `<p>submit O(log n), dispatch O(log n); at most <code>limit</code> jobs running. Memory O(n) for queued jobs and futures.</p>`,
      followUps: ['Add aging so low-priority jobs eventually run (avoid starvation).', 'Add per-job timeouts and retries.', 'Persist the queue so jobs survive a restart.']
    }
  });

  practice.push({
    title: 'Graceful Shutdown of an Async Worker Service', level: 'Hard', tags: ['asyncio', 'shutdown', 'signals', 'Queue'], companies: ['Google', 'Spotify', 'Shopify'],
    statement: `<p>An async service accepts jobs into a queue and processes them with N worker tasks. When a stop signal arrives (SIGTERM in production; simulate it with a timer) it must: (1) stop accepting new jobs, (2) give in-flight and queued jobs up to <code>drain_timeout</code> seconds to finish, (3) cancel whatever is left, (4) return a report <code>{"done": d, "dropped": k, "drained": bool}</code>. No task may be left running.</p>`,
    constraints: `<p>N ≤ 50 workers, job durations 0–1 s, drain_timeout ≤ 30 s (Kubernetes default grace period is 30 s).</p>`,
    example: `<p>20 jobs arriving every 10 ms, each taking 50 ms, 3 workers, stop after 0.1 s, drain_timeout 1 s → about ${H.c('b', '10 jobs accepted')}, all ${H.c('g', 'finished during drain')}, ${H.c('r', '~10 never accepted')} (counted as dropped), drained = True.</p>`,
    brute: { why: `<p>Exiting immediately (or <code>sys.exit</code> in a signal handler) kills in-flight work mid-way. Waiting forever for the queue can exceed the grace period, and then the orchestrator sends SIGKILL anyway — with no cleanup at all.</p>`, code: `import asyncio

async def run_service_abrupt(jobs, workers):
    q = asyncio.Queue()
    for j in jobs:
        q.put_nowait(j)
    async def worker():
        while True:
            await asyncio.sleep(await q.get())
    tasks = [asyncio.create_task(worker()) for _ in range(workers)]
    await asyncio.sleep(0.1)       # "signal" arrives
    for t in tasks:
        t.cancel()                 # in-flight jobs lost, no report` },
    mcq: { q: 'What should happen FIRST when the stop signal arrives?', options: ['Cancel all workers', 'Stop accepting new work (close intake)', 'Clear the queue', 'Call sys.exit()'], answer: 1, explain: 'Close the intake so the backlog stops growing, then drain with a deadline, then cancel leftovers, then close resources.' },
    hints: [`<p>Hint 1: Use an <code>asyncio.Event</code> as the stop flag; in production, <code>loop.add_signal_handler(signal.SIGTERM, stop.set)</code>.</p>`, `<p>Hint 2: After <code>await stop.wait()</code>: cancel the intake task, then <code>async with asyncio.timeout(drain_timeout): await q.join()</code>; catch <code>TimeoutError</code> → drained = False.</p>`, `<p>Hint 3: Workers must call <code>task_done()</code> in <code>finally</code>. Finally cancel workers and <code>gather(..., return_exceptions=True)</code> so nothing is left pending. Dropped = total − done.</p>`],
    solution: {
      approach: `<p>Three phases: <b>stop intake</b> (cancel the producer), <b>drain with a deadline</b> (<code>q.join()</code> under <code>asyncio.timeout</code>), <b>force stop</b> (cancel workers, await them). Everything is awaited, so the loop closes with no pending tasks and a truthful report.</p>`,
      code: `import asyncio

async def run_service(jobs, workers=3, drain_timeout=1.0, stop_after=0.1):
    q = asyncio.Queue()
    stop = asyncio.Event()
    done = []

    async def worker():
        while True:
            job = await q.get()
            try:
                await asyncio.sleep(job)          # pretend to process
                done.append(job)
            finally:
                q.task_done()

    async def intake():
        for job in jobs:
            await q.put(job)
            await asyncio.sleep(0.01)             # jobs arrive over time

    loop = asyncio.get_running_loop()
    # Production: loop.add_signal_handler(signal.SIGTERM, stop.set)
    loop.call_later(stop_after, stop.set)

    pool = [asyncio.create_task(worker()) for _ in range(workers)]
    producer = asyncio.create_task(intake())

    await stop.wait()
    producer.cancel()                             # 1. stop accepting work
    drained = True
    try:
        async with asyncio.timeout(drain_timeout):
            await q.join()                        # 2. drain with a deadline
    except TimeoutError:
        drained = False
    for t in pool:                                # 3. force-stop leftovers
        t.cancel()
    await asyncio.gather(producer, *pool, return_exceptions=True)
    return {"done": len(done), "dropped": len(jobs) - len(done), "drained": drained}

if __name__ == "__main__":
    print(asyncio.run(run_service([0.05] * 20)))
    print(asyncio.run(run_service([0.5] * 20, drain_timeout=0.2)))   # drained False`,
      complexity: `<p>Shutdown time ≤ drain_timeout + one cancellation round-trip; O(N) tasks cancelled.</p>`,
      followUps: ['Persist undrained jobs (put them back on a durable queue) instead of dropping them.', 'Expose a readiness probe that turns false as soon as stop is set.', 'How do Uvicorn/Gunicorn implement graceful worker shutdown?']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push(
    { q: 'You run a pure-Python CPU-heavy function on 4 threads on standard CPython 3.13 (GIL build). Roughly what speed-up do you expect?', options: ['About 4×', 'About 1× (or slightly worse)', 'About 2×', 'It depends only on the switch interval'], answer: 1, explain: 'Only the GIL holder runs Python bytecode, so CPU-bound threads take turns. Handoff overhead often makes it a little slower than serial.' },
    { q: 'Why do threads still speed up downloading 100 web pages?', options: ['The GIL is disabled for network code', 'Blocking socket calls release the GIL while waiting, so waits overlap', 'Threads use more cores for parsing', 'Python batches network calls automatically'], answer: 1, explain: 'C-level blocking calls wrap the wait in Py_BEGIN_ALLOW_THREADS, releasing the GIL. Other threads run while one waits on the network.' },
    { q: 'Is <code>counter += 1</code> on a shared global safe without a lock?', options: ['Yes, the GIL makes it atomic', 'No — it is load, add, store; a switch between them can lose an update', 'Yes, but only for ints', 'Only on Linux'], answer: 1, explain: 'It compiles to several bytecodes. Even if a given CPython version rarely switches there, correctness must not depend on it — and free-threaded builds will lose updates.' },
    { q: 'What happens with <code>pool.map(lambda x: x * 2, data)</code> on a multiprocessing Pool?', options: ['Works fine', 'Fails: lambdas cannot be pickled to send to worker processes', 'Runs in the parent only', 'Runs but returns None'], answer: 1, explain: 'Functions are pickled by qualified name; a lambda has no importable name. Use a top-level def.' },
    { q: 'Which start method became the default on Linux in Python 3.14?', options: ['fork', 'spawn', 'forkserver', 'thread'], answer: 2, explain: '3.14 switched POSIX platforms (other than macOS, which uses spawn) from fork to forkserver, because fork is unsafe in processes that have threads.' },
    { q: 'You need results in the same order as the inputs. Which is simplest?', options: ['as_completed', 'executor.map', 'wait(FIRST_COMPLETED)', 'add_done_callback'], answer: 1, explain: 'executor.map yields in input order (it waits for item 0, then 1, …). as_completed yields in finish order.' },
    { q: 'What does calling an <code>async def</code> function without <code>await</code> do?', options: ['Runs it in the background', 'Runs it synchronously', 'Creates a coroutine object that does not run (and warns "never awaited")', 'Raises SyntaxError'], answer: 2, explain: 'Calling a coroutine function just builds a coroutine object. It runs only when awaited or wrapped in a Task.' },
    { q: 'Three tasks <code>sleep(2)</code>, <code>sleep(1)</code>, <code>sleep(3)</code> are run with <code>asyncio.gather</code>. Total time and result order?', options: ['6 s; finish order', '3 s; argument order', '3 s; finish order', '2 s; argument order'], answer: 1, explain: 'The sleeps overlap so total ≈ the longest (3 s). gather places each result at its argument position.' },
    { q: 'In <code>gather(a(), b(), c())</code>, b raises after 1 s. What happens to a and c?', options: ['They are cancelled', 'They keep running; the caller sees b\'s exception immediately', 'They are restarted', 'gather waits for them, then raises'], answer: 1, explain: 'Without return_exceptions, gather propagates the first exception right away but does not cancel the others. TaskGroup is the tool that cancels siblings.' },
    { q: 'An async web handler calls <code>requests.get(url)</code>. What is the effect?', options: ['Nothing — requests is async-aware', 'The event loop is blocked for the whole request; every other task waits', 'It raises an error', 'It automatically runs in a thread'], answer: 1, explain: 'requests is synchronous. Inside async def it blocks the single loop thread. Use httpx/aiohttp, or await asyncio.to_thread(requests.get, url).' },
    { q: 'Which statement about <code>asyncio.Semaphore(10)</code> is true?', options: ['It limits requests per second to 10', 'It limits how many tasks are inside the guarded block at once to 10', 'It blocks the event loop when full', 'It only works with threads'], answer: 1, explain: 'A semaphore caps concurrency (in-flight count). For requests per second you need a token bucket or similar rate limiter.' },
    { q: 'Two coroutines do: check <code>stock &gt; 0</code>, <code>await pay()</code>, <code>stock -= 1</code>. Stock starts at 1. What can happen?', options: ['Nothing bad: asyncio is single-threaded', 'Both pass the check before either decrements → stock becomes -1', 'A deadlock', 'A RuntimeError'], answer: 1, explain: 'The await lets the other task run between check and act. Protect the whole sequence with an asyncio.Lock.' },
    { q: 'What does <code>sys._is_gil_enabled()</code> returning False tell you?', options: ['The program has no threads', 'You are on a free-threaded build with the GIL actually disabled, so threads can run Python in parallel', 'asyncio is disabled', 'The interpreter is PyPy'], answer: 1, explain: 'On free-threaded builds (3.13t/3.14t) the GIL can be off; importing an extension that does not support it may turn it back on, which this function reveals.' }
  );

  /* ================= INTERVIEW ================= */
  interview.push(
    { q: 'What is the GIL, why does CPython have it, and what does it mean for my code?', level: 'I', a: `<p>The Global Interpreter Lock is a mutex that a thread must hold to execute Python bytecode in CPython, so only one thread runs Python code at a time per interpreter. It exists mainly because of <b>reference counting</b>: every object's refcount is updated constantly, and making each update atomic or individually locked was historically slower for single-threaded code and complicated the C-API. Consequences: threads help <b>I/O-bound</b> work (the GIL is released while blocking) and C code that releases it (NumPy), but not pure-Python <b>CPU-bound</b> work — use processes there. The GIL does not make your own multi-step operations thread-safe. Since 3.13 there is an optional free-threaded build (officially supported in 3.14) without a GIL.</p>`, followUps: ['When exactly is the GIL released?', 'What did PEP 703 have to change to remove it?', 'Does PyPy have a GIL?'] },
    { q: 'Concurrency vs parallelism — explain with a Python example of each.', level: 'B', a: `<p><b>Concurrency</b> is structuring a program so multiple tasks make progress with overlapping lifetimes — they may take turns on one core. <b>Parallelism</b> is tasks literally executing at the same instant on multiple cores. asyncio fetching 1,000 URLs on one thread is concurrent but not parallel: one task runs at a time, the waits overlap. A <code>ProcessPoolExecutor</code> computing hashes on 8 cores is parallel. Threads in CPython (GIL build) give concurrency for Python code and parallelism only for GIL-releasing C code. The question to ask first is "is my program waiting or computing?" — concurrency helps waiting, parallelism helps computing.</p>`, followUps: ['Can you have parallelism without concurrency?', 'Which one does Little\'s law describe?'] },
    { q: 'How do you choose between threading, multiprocessing and asyncio?', level: 'I', a: `<p>Start with the bottleneck. <b>CPU-bound pure Python</b> → processes (<code>ProcessPoolExecutor</code>), or vectorise with NumPy/Polars, or (3.14t) free-threaded threads. <b>I/O-bound with many concurrent connections and async libraries available</b> → asyncio: tasks cost KBs, scale to tens of thousands, switch only at awaits. <b>I/O-bound with blocking libraries or modest concurrency</b> → a thread pool: least code change. <b>Mixed</b> → asyncio for I/O plus a process pool via <code>run_in_executor</code>. <b>Beyond one machine or needs durability</b> → a job queue (Celery/RQ) or Ray/Dask. I'd also mention memory per unit, debugging complexity, and that many services combine models (N processes × 1 event loop × a thread pool).</p>`, followUps: ['What if the library only has a sync API but you need 10k connections?', 'How does the free-threaded build change this?'] },
    { q: 'What is a race condition? Show one in Python and fix it.', level: 'B', a: `<p>A race condition is when the result depends on the timing of concurrent operations. Classic: two threads run <code>balance += amount</code> — it's load, add, store, so both can load 100, both store 110, and one deposit is lost. Fix: make the read-modify-write a critical section with a <code>threading.Lock</code> (<code>with lock: balance += amount</code>), or avoid shared state by sending updates through a <code>queue.Queue</code> to one owner thread. In asyncio the same bug happens across <code>await</code>: check, await, act — fix with <code>asyncio.Lock</code> around the whole sequence.</p>`, followUps: ['How would you test for a race that only appears 1 in 10,000 runs?', 'What is a data race vs a race condition?'] },
    { q: 'Explain deadlock and how you prevent it in practice.', level: 'I', a: `<p>Deadlock: a set of threads each holds a resource and waits for one held by another, forming a cycle — everyone waits forever. It needs four conditions (Coffman): mutual exclusion, hold-and-wait, no preemption, circular wait. Prevention in practice: <b>global lock ordering</b> (e.g., always lock the lower account id first in a transfer) to break circular wait; <b>acquire with timeouts</b> (<code>lock.acquire(timeout=…)</code>) and back off; keep critical sections tiny and never call unknown code (callbacks, I/O) while holding a lock; prefer message passing via queues. Diagnose hangs with <code>faulthandler.dump_traceback_later</code> or <code>py-spy dump</code> to see where each thread is stuck.</p>`, followUps: ['What is livelock?', 'Can asyncio code deadlock?'] },
    { q: 'Walk me through what the asyncio event loop does on each iteration.', level: 'A', a: `<p>The loop keeps a <b>ready queue</b> of callbacks (deque), a <b>heap of timers</b>, and a <b>selector</b> (epoll/kqueue/IOCP). Each iteration: compute a timeout — zero if callbacks are ready, else until the earliest timer; call <code>selector.select(timeout)</code> and schedule callbacks for ready sockets; move due timers to the ready queue; run the callbacks that were ready at the start of this iteration. A Task's callback is its <code>__step</code>: it resumes the coroutine with <code>send()</code> until the coroutine yields a Future it's waiting on; the Task registers a done-callback on that Future to schedule itself again. So <code>await</code> ultimately means "yield a Future to the loop and get rescheduled when it completes".</p>`, followUps: ['How is asyncio.sleep implemented?', 'Why does the loop only run callbacks that were ready at the start of the iteration?', 'What does uvloop replace?'] },
    { q: 'gather vs TaskGroup vs wait vs as_completed — when do you use each?', level: 'A', a: `<p><b>gather</b>: run awaitables concurrently and get results in argument order; on first exception it raises immediately but does not cancel the others (use <code>return_exceptions=True</code> for partial results). <b>TaskGroup</b> (3.11+): structured concurrency — if one child fails, siblings are cancelled and all errors come as an <code>ExceptionGroup</code>; no orphan tasks. Default for new code. <b>wait</b>: low-level, returns (done, pending) with FIRST_COMPLETED / FIRST_EXCEPTION / ALL_COMPLETED — ideal for races and hedged requests. <b>as_completed</b>: iterate results in finish order — progress reporting, reacting to the fastest.</p>`, followUps: ['How do you get partial results from a TaskGroup?', 'What is except* and why was it added?'] },
    { q: 'How does cancellation work in asyncio, and what are the common mistakes?', level: 'A', a: `<p><code>task.cancel()</code> requests cancellation; at the task's next resume, <code>CancelledError</code> is thrown into the coroutine at its current <code>await</code>, and it propagates down to any awaited Task/Future. This lets <code>finally</code> and <code>async with</code> clean up. Timeouts (<code>asyncio.timeout</code>, <code>wait_for</code>) and TaskGroup are built on it. Mistakes: catching and swallowing <code>CancelledError</code> (breaks timeouts and shutdown; since 3.11 tasks count cancel requests via <code>cancelling()</code>), doing slow blocking work in <code>finally</code>, assuming cancelling the awaiting task stops a thread started with <code>to_thread</code> (it doesn't), and not awaiting cancelled tasks before closing the loop.</p>`, followUps: ['What does asyncio.shield do and when is it dangerous?', 'Why is CancelledError a BaseException?'] },
    { q: 'Your FastAPI service gets slow for all endpoints under load. CPU on one core is 100%. What do you check?', level: 'A', a: `<p>Suspect the event loop is blocked. Steps: enable asyncio debug mode or measure <b>loop lag</b> (a periodic callback measuring lateness); run <code>py-spy top</code>/<code>dump</code> on the worker to see which function holds the loop; look for sync calls in <code>async def</code> endpoints (requests, sync DB drivers, boto3, <code>time.sleep</code>, big JSON parsing, password hashing). Fixes: async clients, <code>await asyncio.to_thread(...)</code> for blocking I/O, <code>run_in_executor(ProcessPool)</code> for CPU work, or define the endpoint as plain <code>def</code> so FastAPI runs it in its thread pool. Then scale with more worker processes, since one loop uses one core.</p>`, followUps: ['What is the default size of the to_thread pool?', 'How would you alert on loop lag?'] },
    { q: 'What gets pickled when you use a ProcessPoolExecutor, and how do you reduce the cost?', level: 'I', a: `<p>The function (by importable qualified name — so it must be top-level), its arguments, and the return value are pickled, sent through a pipe, and unpickled in the other process. Exceptions are pickled back too. Costs grow with data size. Reduce them by: sending small descriptions (paths, offsets, IDs) instead of big objects; loading heavy read-only data once per worker with an <code>initializer</code>; batching tiny tasks (<code>chunksize</code>); using <code>shared_memory</code> or memory-mapped files for large arrays (zero-copy); returning aggregates (counts) rather than raw data. Also remember spawn/forkserver re-import the main module, so guard entry code with <code>if __name__ == "__main__":</code>.</p>`, followUps: ['What is BrokenProcessPool?', 'How does fork interact with copy-on-write and refcounts?'] },
    { q: 'Design a system to call an LLM API for 1 million documents under a rate limit of 3,000 requests/minute.', level: 'E', a: `<p>Throughput is capped by the provider: 1M / 3,000 per min ≈ 5.6 hours — say so first. Design: an asyncio worker using the async SDK; a <b>token bucket</b> for requests/min and another for tokens/min; a <b>Semaphore</b> sized by Little's law (rate 50/s × ~6 s latency ≈ 300 in flight, bounded by connection limits); <code>asyncio.timeout</code> per call; retries on 429/5xx with exponential backoff + jitter honouring Retry-After; idempotent writes keyed by document ID to a DB so restarts skip finished work; a bounded queue fed from storage for back-pressure; metrics (in-flight, error rate, 429s, cost); graceful shutdown on SIGTERM. Consider the provider's batch API, which trades latency for higher limits and lower cost, and multiple processes only if parsing becomes CPU-bound.</p>`, followUps: ['How do you avoid paying twice for a document after a crash?', 'How would you share the rate limit across 10 machines?'] },
    { q: 'What changed in Python 3.13/3.14 for concurrency?', level: 'E', a: `<p><b>3.13</b>: experimental free-threaded build (PEP 703, <code>python3.13t</code>) with <code>sys._is_gil_enabled()</code>; <code>Queue.shutdown()</code> for <code>queue.Queue</code> and <code>asyncio.Queue</code>; default executor sizes based on <code>os.process_cpu_count()</code>. <b>3.14</b>: free-threading becomes officially supported though not the default (PEP 779); <code>concurrent.interpreters</code> and <code>InterpreterPoolExecutor</code> expose sub-interpreters, each with its own GIL (PEP 734); the default multiprocessing start method on Linux moved from fork to forkserver; asyncio gained introspection (<code>python -m asyncio ps/pstree</code>); <code>Executor.map</code> got a <code>buffersize</code> argument. Earlier milestones worth naming: 3.11 TaskGroup, asyncio.timeout, ExceptionGroup; 3.12 per-interpreter GIL and eager task factory.</p>`, followUps: ['Would you deploy the free-threaded build today? What would you check?', 'How do sub-interpreters share data?'] },
    { q: 'Implement a thread-safe producer–consumer pipeline. How do you shut it down cleanly?', level: 'I', a: `<p>Use <code>queue.Queue(maxsize=N)</code>: producers <code>put()</code> (blocking when full → back-pressure), consumers loop on <code>get()</code> and call <code>task_done()</code> in a <code>finally</code>. Shutdown options: (1) after producing, put one <b>sentinel</b> (e.g. <code>None</code>) per consumer; each consumer exits when it sees one; (2) on 3.13+, call <code>q.shutdown()</code> so blocked <code>get()</code>s raise <code>queue.ShutDown</code> once the queue is drained (or immediately with <code>immediate=True</code>); (3) an <code>Event</code> plus <code>get(timeout=…)</code>. Then <code>join()</code> every thread. Avoid daemon threads for real work — they're killed abruptly at exit. For multi-stage pipelines, size each stage's workers and queue independently.</p>`, followUps: ['Why is "while not q.empty(): q.get()" wrong?', 'What changes for multiprocessing.Queue?'] },
    { q: 'How would you debug a Python program that hangs with multiple threads?', level: 'A', a: `<p>Get stack traces of all threads: <code>py-spy dump --pid PID</code> (no code changes), or <code>faulthandler.dump_traceback_later(timeout)</code> / <code>faulthandler.register(signal.SIGUSR1)</code> built in. Look for threads blocked in <code>acquire</code> (deadlock — compare which locks each holds), in <code>Queue.get</code> with no producer left (missing sentinel/task_done), in <code>join()</code> on a thread that's waiting on the joiner, or in a C call that never releases the GIL. For asyncio, <code>asyncio.all_tasks()</code> with <code>task.print_stack()</code>, debug mode for slow callbacks, and in 3.14 <code>python -m asyncio pstree PID</code>. Then fix with consistent lock ordering, timeouts and explicit shutdown protocols, and add a regression stress test.</p>`, followUps: ['How do you make race conditions reproducible in tests?', 'What is the danger of fork() in a threaded program?'] }
  );

  registerModule({
    id: 'py10',
    title: 'Concurrency: GIL, Threads, Processes & asyncio',
    intro: `<p>Modern Python programs spend most of their life <b>waiting</b> — on networks, databases, disks and AI APIs — or <b>crunching</b> numbers. This module teaches you to tell those two apart in seconds and to pick the right tool: <b>threads</b> for blocking I/O, <b>processes</b> for CPU work, and <b>asyncio</b> for thousands of concurrent connections on one thread.</p>
<p>You will see <i>why</i> the GIL exists and when it is released (with a timeline visualizer), break and fix race conditions, push work through process pools, read the <code>concurrent.futures</code> API like a pro, and step inside the asyncio event loop to watch the ready queue and parked tasks. Then you will learn the pitfalls that hurt real services (blocking the loop, lost tasks, races across <code>await</code>) and how to design concurrent systems with limits, timeouts, retries and graceful shutdown — including what changed with the free-threaded 3.13t/3.14t builds and sub-interpreters.</p>
<p><small>Note: the ▶ Run button uses Pyodide (Python in your browser), which has <b>one thread and no child processes</b>. Snippets marked runnable work there; thread, process and <code>asyncio.run</code> examples are meant to be run on your own machine with <code>python3 file.py</code>.</small></p>`,
    goals: [
      'Classify any workload as I/O-bound or CPU-bound and choose threads, processes, asyncio (or vectorisation) with a one-sentence justification',
      'Explain the GIL precisely: why it exists, when it is released, what it does and does not protect, and what the free-threaded build changes',
      'Write correct thread code with Lock, Event, Condition, Semaphore and queue.Queue, and avoid races and deadlocks',
      'Use multiprocessing / ProcessPoolExecutor safely: pickling rules, start methods, the __main__ guard, chunking and shared memory',
      'Trace the asyncio event loop by hand and use tasks, gather, TaskGroup, timeouts, cancellation, Semaphores and Queues correctly',
      'Spot and fix async pitfalls (blocking calls, missing awaits, lost tasks, races across await) and design rate-limited, gracefully-stoppable concurrent services'
    ],
    prereqs: `Python 7 (Iterators, Generators & Context Managers) — generators explain how coroutines work; Python 6 (Closures & Decorators); Python 9 (Errors, Type Hints & Testing) for exception handling. Basic idea of what a process and a CPU core are.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
