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

registerModule({ id: 'py10', title: 'Concurrency', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
