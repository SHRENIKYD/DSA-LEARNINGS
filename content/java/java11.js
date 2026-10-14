(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function esc(s) { return H.esc(String(s)); }
  function clean(input) { return String(input === undefined || input === null ? '' : input).trim(); }
  function note(html, label) { return { type: 'text', label: label || 'Why', html: html }; }
  function out(text) {
    return { type: 'text', label: 'Console output', html: text ? '<code>' + esc(text).replace(/\n/g, '<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  function lineHl(lines, cls) { var h = {}; [].concat(lines === undefined || lines === null ? [] : lines).forEach(function (n) { h[n] = cls || 'cur'; }); return h; }
  /* single code listing stepped line by line.
     step = { l, cls, v, hv, vl, out, extra, narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var parts = [{ type: 'code', label: label || 'Code (highlighted line = running now)', lang: 'java', code: code, hl: lineHl(s.l, s.cls) }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      (s.extra || []).forEach(function (p) { parts.push(p); });
      if (s.out !== undefined) parts.push(out(s.out));
      return { narr: s.narr, parts: parts };
    });
  }
  /* two threads side by side.
     step = { a: lineA, b: lineB, ca, cb, sa: 'state A', sb: 'state B', v: {shared}, hv, vl, extra, out, narr } */
  function twoThreads(codeA, codeB, steps, names) {
    names = names || ['Thread A', 'Thread B'];
    return steps.map(function (s) {
      var parts = [
        { type: 'code', label: names[0] + (s.sa ? ' — ' + s.sa : ''), lang: 'java', code: codeA, hl: lineHl(s.a, s.ca) },
        { type: 'code', label: names[1] + (s.sb ? ' — ' + s.sb : ''), lang: 'java', code: codeB, hl: lineHl(s.b, s.cb) }
      ];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Shared memory (heap)', vals: s.v, hl: s.hv || {} });
      (s.extra || []).forEach(function (p) { parts.push(p); });
      if (s.out !== undefined) parts.push(out(s.out));
      return { narr: s.narr, parts: parts };
    });
  }
  /* Thread.State machine drawn as boxes. where = {STATE: 'T1, T2'} puts tags under boxes. */
  function stateGraph(cur, ehl, where, label) {
    var hl = {};
    [].concat(cur || []).forEach(function (c) { hl[c] = 'cur'; });
    return {
      type: 'graph', label: label || 'Thread.State machine (java.lang.Thread.State)', directed: true, height: 74,
      nodes: [
        { id: 'NEW', x: 9, y: 34, shape: 'box' }, { id: 'RUNNABLE', x: 40, y: 34, shape: 'box' },
        { id: 'BLOCKED', x: 80, y: 8, shape: 'box' }, { id: 'WAITING', x: 80, y: 34, shape: 'box' },
        { id: 'TIMED_WAITING', x: 80, y: 60, shape: 'box' }, { id: 'TERMINATED', x: 40, y: 64, shape: 'box' }
      ],
      edges: [
        ['NEW', 'RUNNABLE', 'start()'], ['RUNNABLE', 'BLOCKED', 'lock busy'], ['BLOCKED', 'RUNNABLE', 'got lock'],
        ['RUNNABLE', 'WAITING', 'wait()/join()'], ['WAITING', 'RUNNABLE', 'notify/done'],
        ['RUNNABLE', 'TIMED_WAITING', 'sleep(ms)'], ['TIMED_WAITING', 'RUNNABLE', 'time up'],
        ['RUNNABLE', 'TERMINATED', 'run() ends']
      ],
      hl: hl, ehl: ehl || {}, tags: where || {}
    };
  }

  /* ======================================================================
     TOPIC 1 — Threads 101: Runnable vs Thread, start() vs run(), join, lifecycle
     ====================================================================== */
  var LIFE_CODE = [
    'Runnable task = () -> {',
    '    System.out.println("hi from " + Thread.currentThread().getName());',
    '    try { Thread.sleep(100); } catch (InterruptedException e) { return; }',
    '};',
    'Thread t = new Thread(task, "worker");',
    'System.out.println(t.getState());   // NEW',
    't.start();',
    'System.out.println(t.getState());   // RUNNABLE or TIMED_WAITING',
    't.join();                            // main waits here',
    'System.out.println(t.getState());   // TERMINATED'
  ].join('\n');

  topics.push({
    title: 'Threads 101: Runnable vs Thread, start() vs run(), join() & the Thread Lifecycle',
    analogy: `<p>Picture a restaurant kitchen. A <b>thread</b> is a <b>cook</b>. A ${C('Runnable')} is a <b>recipe card</b> — just instructions, it cooks nothing by itself. ${C('new Thread(recipe)')} is <b>hiring</b> a cook and handing over the card (the cook is hired but standing still: state <b>NEW</b>). ${C('start()')} is saying <b>"go!"</b> — now the cook works at their own station while you keep doing your own work. If you call ${C('run()')} yourself, <i>you</i> read the card and cook it with your own hands — no second cook, nothing in parallel. ${C('join()')} is the head chef standing at the pass, waiting until that cook says "done" before the plate goes out.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A running Java program is one <b>process</b>. Inside it you can have many <b>threads</b>: independent "workers" that run code at the same time (on different CPU cores) or take turns (on one core). All threads in a process <b>share the heap</b> (objects, static fields) but each has its <b>own stack</b> (local variables, method calls) and its own "where am I in the code" pointer.</p>
<p><b>Two ways to give a thread work:</b></p>
<ul>
<li><b>Implement ${C('Runnable')}</b> (or write a lambda) and pass it to ${C('new Thread(task)')}. ✅ Preferred: the <i>task</i> is separate from the <i>worker</i>, your class can still extend something else, and the same task can later go to a thread pool.</li>
<li><b>Extend ${C('Thread')}</b> and override ${C('run()')}. Works, but uses up your one "extends" slot and glues the job to the worker.</li>
</ul>
<p><b>${C('start()')} vs ${C('run()')}</b> — the #1 beginner interview question:</p>
${H.table(['call', 'what happens', 'new thread?', 'printed thread name'], [
  [C('t.start()'), 'JVM asks the OS for a new thread; that thread calls run()', '<span class="c-g">yes</span>', 'worker'],
  [C('t.run()'), 'plain method call on the current stack', '<span class="c-r">no</span>', 'main'],
  [C('t.start()') + ' twice', 'IllegalThreadStateException — a thread starts only once', '—', '—']
])}
<p><b>${C('join()')}</b> makes the caller wait until that thread finishes. ${C('Thread.sleep(ms)')} pauses the <i>current</i> thread. Neither releases locks it holds (more on that later).</p>
<p><b>The six states</b> (${C('Thread.State')}), which you will see in every thread dump:</p>
${H.table(['state', 'meaning', 'how you get there'], [
  ['<b>NEW</b>', 'created, not started', C('new Thread(..)')],
  ['<b class="c-g">RUNNABLE</b>', 'running OR ready to run (Java does not separate them)', C('start()') + ', lock acquired, woken up'],
  ['<b class="c-r">BLOCKED</b>', 'waiting to enter a ' + C('synchronized') + ' block someone else holds', 'monitor busy'],
  ['<b class="c-y">WAITING</b>', 'waiting forever for another thread to act', C('wait()') + ', ' + C('join()') + ', ' + C('LockSupport.park()')],
  ['<b class="c-y">TIMED_WAITING</b>', 'waiting with a timeout', C('sleep(ms)') + ', ' + C('wait(ms)') + ', ' + C('join(ms)')],
  ['<b class="c-m">TERMINATED</b>', 'run() returned or threw', 'end of run()']
])}
<p>Rule of thumb: <b>BLOCKED = stuck at a lock door</b>; <b>WAITING = sitting in a waiting room until someone calls you</b>.</p>`,
    clues: [
      '"What is the difference between <b>start()</b> and <b>run()</b>?" → only start() creates a new thread',
      '"Run these N tasks in parallel and <b>wait for all</b> of them" → start each, then join each (or an executor — next module)',
      '"Thread dump shows <b>BLOCKED</b> vs <b>WAITING</b>" → lock contention vs wait()/join()/park',
      '"Can you call start() twice?" → IllegalThreadStateException',
      '"Why prefer <b>Runnable</b> over extending Thread?" → composition, single inheritance, reusable with pools',
      '"Program does not exit" → a non-daemon thread is still alive',
      '"How do you stop a thread?" → cooperative: interrupt() or a volatile flag, never Thread.stop()'
    ],
    code: [`
public class ThreadBasics {
    // Way 1: implement Runnable — the TASK is separate from the WORKER (preferred)
    static class PrintTask implements Runnable {
        private final String msg;
        PrintTask(String msg) { this.msg = msg; }
        @Override public void run() {
            System.out.println(msg + " on " + Thread.currentThread().getName());
        }
    }

    // Way 2: extend Thread — works, but burns your single "extends" slot
    static class PrintThread extends Thread {
        PrintThread(String name) { super(name); }
        @Override public void run() {
            System.out.println("subclass running on " + getName());
        }
    }

    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(new PrintTask("runnable"), "worker-1");
        Thread t2 = new PrintThread("worker-2");
        Thread t3 = new Thread(() -> System.out.println("lambda on " + Thread.currentThread().getName()), "worker-3");
        // Java 21 builder API (platform thread; Thread.ofVirtual() is covered next module)
        Thread t4 = Thread.ofPlatform().name("worker-4").unstarted(() -> System.out.println("builder on worker-4"));

        System.out.println(t1.getState());           // NEW
        t1.start(); t2.start(); t3.start(); t4.start();  // the four lines may print in ANY order
        t1.join(); t2.join(); t3.join(); t4.join();      // wait for all four
        System.out.println(t1.getState());           // TERMINATED
        System.out.println("main done");             // always last: we joined everyone
    }
}`, `
public class InterruptDemo {
    public static void main(String[] args) throws InterruptedException {
        Thread sleeper = new Thread(() -> {
            try {
                Thread.sleep(10_000);                     // TIMED_WAITING for up to 10 s
                System.out.println("woke up normally");
            } catch (InterruptedException e) {
                // sleep() cleared the interrupt flag when it threw; restore it so callers can see it
                Thread.currentThread().interrupt();
                System.out.println("interrupted, flag restored = " + Thread.currentThread().isInterrupted());
            }
        }, "sleeper");
        sleeper.start();
        Thread.sleep(50);                                 // give it time to fall asleep
        System.out.println(sleeper.getState());           // TIMED_WAITING (almost always)
        sleeper.interrupt();                              // polite "please stop" — wakes the sleep
        sleeper.join();
        System.out.println(sleeper.getState());           // TERMINATED
    }
}`],
    codeTitle: ['Four ways to create & start a thread', 'Interrupting a sleeping thread (cooperative cancellation)'],
    viz: [{
      title: 'One program, two stacks: watching the lifecycle step by step',
      gen: function () {
        var st = function (main, worker) { return [{ type: 'stack', label: 'main thread stack', items: main }, { type: 'stack', label: 'worker thread stack', items: worker }]; };
        var steps = [
          { l: [1, 2, 3, 4], v: { t: '(not created)', 'task': 'lambda object on heap' }, out: '', extra: st(['main()'], []).concat([stateGraph([], {}, {})]), narr: 'Lines 1–4 only <b>create a Runnable object</b> (a recipe card). Nothing runs yet — a lambda is just data until someone calls its run().' },
          { l: 5, v: { t: 'Thread "worker"', 'worker state': 'NEW' }, hv: { 'worker state': 'cur' }, out: '', extra: st(['main()'], []).concat([stateGraph('NEW', {}, { NEW: 'worker' })]), narr: '<b>new Thread(task, "worker")</b> builds a Thread object. No OS thread exists yet, no stack yet. State = <b>NEW</b>.' },
          { l: 6, v: { t: 'Thread "worker"', 'worker state': 'NEW' }, out: 'NEW', extra: st(['main()', 'println()'], []).concat([stateGraph('NEW', {}, { NEW: 'worker', RUNNABLE: 'main' })]), narr: 'main prints <b>NEW</b>. main itself is RUNNABLE the whole time it executes code.' },
          { l: 7, cls: 'ok', v: { t: 'Thread "worker"', 'worker state': 'RUNNABLE' }, hv: { 'worker state': 'ok' }, out: 'NEW', extra: st(['main()'], ['run()']).concat([stateGraph('RUNNABLE', { 'NEW-RUNNABLE': 'ok' }, { RUNNABLE: 'main, worker' })]), narr: '<b>start()</b>: the JVM asks the OS for a real thread with its <b>own stack</b>, which will call task.run(). start() returns immediately — main does not wait.' },
          { l: 2, v: { t: 'Thread "worker"', 'worker state': 'RUNNABLE' }, out: 'NEW\nhi from worker', extra: st(['main()'], ['run()', 'println()']).concat([stateGraph('RUNNABLE', {}, { RUNNABLE: 'main, worker' })]), narr: 'On the <b>worker\'s</b> stack, line 2 runs and prints "hi from worker". (The highlighted line belongs to the worker now — both threads are in the same source file but on different stacks.)' },
          { l: 3, cls: 'win', v: { t: 'Thread "worker"', 'worker state': 'TIMED_WAITING' }, hv: { 'worker state': 'cur' }, out: 'NEW\nhi from worker', extra: st(['main()'], ['run()', 'Thread.sleep(100)']).concat([stateGraph('TIMED_WAITING', { 'RUNNABLE-TIMED_WAITING': 'cur' }, { RUNNABLE: 'main', TIMED_WAITING: 'worker' })]), narr: 'Worker calls <b>sleep(100)</b> → <b>TIMED_WAITING</b>. It uses no CPU; the OS will wake it after ~100 ms.' },
          { l: 8, v: { t: 'Thread "worker"', 'worker state': 'TIMED_WAITING' }, out: 'NEW\nhi from worker\nTIMED_WAITING', extra: st(['main()', 'println()'], ['run()', 'Thread.sleep(100)']).concat([stateGraph('TIMED_WAITING', {}, { RUNNABLE: 'main', TIMED_WAITING: 'worker' })]), narr: 'main prints the worker\'s state. It is a <b>race</b>: if the worker had not reached sleep yet, this would print RUNNABLE. Both outputs are legal — never assert on this in a test.' },
          { l: 9, cls: 'win', v: { t: 'Thread "worker"', 'worker state': 'TIMED_WAITING', 'main state': 'WAITING' }, hv: { 'main state': 'cur' }, out: 'NEW\nhi from worker\nTIMED_WAITING', extra: st(['main()', 't.join()'], ['run()', 'Thread.sleep(100)']).concat([stateGraph(['WAITING', 'TIMED_WAITING'], { 'RUNNABLE-WAITING': 'cur' }, { WAITING: 'main', TIMED_WAITING: 'worker' })]), narr: '<b>t.join()</b>: main has nothing to do until worker finishes, so main goes to <b>WAITING</b>. Two threads, zero CPU used.' },
          { l: 3, cls: 'ok', v: { t: 'Thread "worker"', 'worker state': 'RUNNABLE', 'main state': 'WAITING' }, out: 'NEW\nhi from worker\nTIMED_WAITING', extra: st(['main()', 't.join()'], ['run()']).concat([stateGraph(['RUNNABLE', 'WAITING'], { 'TIMED_WAITING-RUNNABLE': 'ok' }, { WAITING: 'main', RUNNABLE: 'worker' })]), narr: 'Time is up: worker goes back to <b>RUNNABLE</b>, sleep returns, run() reaches its end.' },
          { l: 4, cls: 'done', v: { t: 'Thread "worker"', 'worker state': 'TERMINATED', 'main state': 'RUNNABLE' }, hv: { 'worker state': 'done', 'main state': 'ok' }, out: 'NEW\nhi from worker\nTIMED_WAITING', extra: st(['main()'], []).concat([stateGraph(['TERMINATED', 'RUNNABLE'], { 'RUNNABLE-TERMINATED': 'ok', 'WAITING-RUNNABLE': 'ok' }, { TERMINATED: 'worker', RUNNABLE: 'main' })]), narr: 'run() returned → worker is <b>TERMINATED</b>, its stack is freed. That wakes main from join(). Bonus: join() is a <b>happens-before</b> edge, so everything worker wrote is now visible to main.' },
          { l: 10, cls: 'ok', v: { t: 'Thread "worker"', 'worker state': 'TERMINATED', 'main state': 'RUNNABLE' }, out: 'NEW\nhi from worker\nTIMED_WAITING\nTERMINATED', extra: st(['main()', 'println()'], []).concat([stateGraph(['TERMINATED', 'RUNNABLE'], {}, { TERMINATED: 'worker', RUNNABLE: 'main' })]), narr: 'main prints <b>TERMINATED</b>. A terminated thread can never be restarted — calling start() again throws IllegalThreadStateException.' }
        ];
        return codeFrames(LIFE_CODE, steps, 'Program (highlight = the line being run by whichever thread the narration names)');
      }
    }, {
      title: 'start() vs run(): try both',
      input: 'start',
      inputLabel: 'Type start or run',
      gen: function (input) {
        var mode = clean(input).toLowerCase();
        if (mode !== 'start' && mode !== 'run') throw new Error('Type exactly: start  or  run');
        var code = ['Thread t = new Thread(() ->', '    System.out.println("A: " + Thread.currentThread().getName()), "worker");', 't.' + mode + '();', 'System.out.println("B: " + Thread.currentThread().getName());'].join('\n');
        var f = [];
        f.push({ narr: 'We build a thread named "worker" whose task prints the name of <b>whichever thread is running it</b>.', parts: [{ type: 'code', lang: 'java', code: code, hl: { 1: 'cur', 2: 'cur' } }, { type: 'stack', label: 'main stack', items: ['main()'] }, { type: 'stack', label: 'worker stack', items: [] }, out('')] });
        if (mode === 'run') {
          f.push({ narr: '<b>t.run()</b> is an ordinary method call. It is pushed onto <b>main\'s own stack</b>. No OS thread is created; the Thread object stays <b>NEW</b> forever.', parts: [{ type: 'code', lang: 'java', code: code, hl: { 3: 'bad' } }, { type: 'stack', label: 'main stack', items: ['main()', 'Thread.run()', 'lambda.run()'], hl: { 2: 'cur' } }, { type: 'stack', label: 'worker stack', items: [] }, out('')] });
          f.push({ narr: 'The lambda asks "which thread am I?" → <b>main</b>. Surprise for many candidates!', parts: [{ type: 'code', lang: 'java', code: code, hl: { 2: 'cur' } }, { type: 'stack', label: 'main stack', items: ['main()', 'Thread.run()', 'lambda.run()', 'println()'], hl: { 3: 'cur' } }, { type: 'stack', label: 'worker stack', items: [] }, out('A: main')] });
          f.push({ narr: 'run() returns, then line 4 prints. Order is <b>always A then B</b>, because there was only one thread doing everything in sequence.', parts: [{ type: 'code', lang: 'java', code: code, hl: { 4: 'cur' } }, { type: 'stack', label: 'main stack', items: ['main()', 'println()'] }, { type: 'stack', label: 'worker stack', items: [] }, out('A: main\nB: main')] });
          f.push({ narr: '<b>Verdict:</b> run() = no concurrency at all. Possible outputs: exactly one — "A: main" then "B: main". Change the input to <b>start</b> to compare.', parts: [{ type: 'table', label: 'All possible outputs', columns: ['#', 'line 1', 'line 2'], rows: [['1', 'A: main', 'B: main']], hl: { 0: 'sel' } }] });
        } else {
          f.push({ narr: '<b>t.start()</b> creates a real thread with its <b>own stack</b>, then returns at once. Now two threads race.', parts: [{ type: 'code', lang: 'java', code: code, hl: { 3: 'ok' } }, { type: 'stack', label: 'main stack', items: ['main()'] }, { type: 'stack', label: 'worker stack', items: ['Thread.run()', 'lambda.run()'], hl: { 1: 'ok' } }, out('')] });
          f.push({ narr: 'Schedule 1: main keeps going and prints B first (very common — starting a thread takes tens of microseconds).', parts: [{ type: 'code', lang: 'java', code: code, hl: { 4: 'cur' } }, { type: 'stack', label: 'main stack', items: ['main()', 'println()'], hl: { 1: 'cur' } }, { type: 'stack', label: 'worker stack', items: ['Thread.run()', 'lambda.run()'] }, out('B: main')] });
          f.push({ narr: 'Then the worker prints A — and it says <b>worker</b>, because it really runs on the new thread.', parts: [{ type: 'code', lang: 'java', code: code, hl: { 2: 'cur' } }, { type: 'stack', label: 'main stack', items: [] }, { type: 'stack', label: 'worker stack', items: ['Thread.run()', 'lambda.run()', 'println()'], hl: { 2: 'cur' } }, out('B: main\nA: worker')] });
          f.push({ narr: '<b>Verdict:</b> two outputs are possible. Without a join() or other synchronization, <b>no order is guaranteed</b>. Change the input to <b>run</b> to compare.', parts: [{ type: 'table', label: 'All possible outputs', columns: ['#', 'line 1', 'line 2'], rows: [['1', 'B: main', 'A: worker'], ['2', 'A: worker', 'B: main']], hl: { 0: 'sel', 1: 'sel' } }] });
        }
        return f;
      }
    }],
    examples: [
      { title: 'start() twice blows up', html: `<p>A Thread object is single-use. The second ${C('start()')} throws ${C('IllegalThreadStateException')} even if the first run already finished. If you need to run the task again, create a new Thread (or better, submit the Runnable to an executor).</p>`, code: `
Thread t = new Thread(() -> System.out.println("hello"));
t.start();
t.join();
try {
    t.start();                                   // second start
} catch (IllegalThreadStateException e) {
    System.out.println("cannot restart: " + e);  // this line prints
}` },
      { title: 'What can this print? Two printers without join', html: `<p>Main starts two threads that print <b>A</b> and <b>B</b>, then prints <b>end</b> without joining. Every one of the 3! = <b>6 orders</b> is possible — even "end" first or "end" in the middle. Add ${C('t1.join(); t2.join();')} before the last line and "end" is guaranteed last, but A/B can still swap.</p>
${H.table(['joins?', 'possible outputs'], [['none', 'ABend, BAend, AendB, BendA, endAB, endBA'], ['both joined', 'ABend, BAend']])}`, code: `
Thread t1 = new Thread(() -> System.out.print("A"));
Thread t2 = new Thread(() -> System.out.print("B"));
t1.start();
t2.start();
t1.join();      // remove these two joins and "end" can appear anywhere
t2.join();
System.out.println("end");` },
      { title: 'Daemon threads die with the JVM', html: `<p>The JVM exits when the last <b>non-daemon</b> thread ends. A <b>daemon</b> thread (background helper, e.g. a cache cleaner) does not keep the JVM alive, and its ${C('finally')} blocks may never run at exit. You must call ${C('setDaemon(true)')} <b>before</b> ${C('start()')}, otherwise you get ${C('IllegalThreadStateException')}. Classic bug: "my program never exits" → someone created a non-daemon thread with an infinite loop.</p>`, code: `
Thread heartbeat = new Thread(() -> {
    for (int i = 0; i < 3; i++) {
        System.out.println("beat " + i);
        try { Thread.sleep(10); } catch (InterruptedException e) { return; }
    }
}, "heartbeat");
heartbeat.setDaemon(true);       // must be called before start()
heartbeat.start();
heartbeat.join(100);             // wait at most 100 ms, then main may exit
System.out.println("main exits; daemon would be killed if still alive");` },
      { title: 'BLOCKED vs WAITING in a thread dump', html: `<p>In ${C('jstack')} output, ${C('BLOCKED (on object monitor)')} means "I want to enter a synchronized block, someone else owns it" — that is <b>contention</b>. ${C('WAITING (on object monitor)')} means "I called wait() and am waiting for notify()". ${C('WAITING (parking)')} usually means a ${C('java.util.concurrent')} lock or queue. A thread doing blocking socket I/O shows <b>RUNNABLE</b> — the JVM does not know the OS has parked it. So "100 threads RUNNABLE but CPU is idle" often means they are all waiting on the network.</p>` }
    ],
    deepDive: `<p><b>🟣 What start() really does.</b> ${C('Thread.start()')} checks the state is NEW, adds the thread to its group and calls the native ${C('start0()')}, which (on Linux) calls ${C('pthread_create')}. A <b>platform thread</b> maps 1:1 to an OS thread, reserves a stack (default ~1 MB on 64-bit Linux, tune with ${C('-Xss')}) and costs on the order of tens of microseconds to create. That is why "one thread per task" does not scale to 10,000 tasks and why pools (and Java 21 <b>virtual threads</b>) exist — next module.</p>
<p><b>Memory-model gifts.</b> The JMM guarantees: everything the parent did <b>before</b> ${C('t.start()')} is visible to ${C('t')}; everything ${C('t')} did is visible to a thread that returns from ${C('t.join()')} (or sees ${C('isAlive() == false')}). That is why the "partial results array + join" pattern is safe without any locks.</p>
<p><b>Stopping threads.</b> ${C('Thread.stop()')}, ${C('suspend()')} and ${C('resume()')} are unsafe (they could kill a thread mid-update, leaving objects half-changed or locks held) and since JDK 20 they throw ${C('UnsupportedOperationException')}. Cancellation in Java is <b>cooperative</b>: call ${C('interrupt()')}, and the target either gets an ${C('InterruptedException')} from blocking calls (${C('sleep')}, ${C('wait')}, ${C('join')}, blocking queues) or checks ${C('Thread.currentThread().isInterrupted()')} in its loop. Catching InterruptedException clears the flag — so either rethrow, or restore it with ${C('Thread.currentThread().interrupt()')}. Swallowing it silently is a classic code-review rejection.</p>
<p><b>Uncaught exceptions</b> kill only that thread; the default handler prints the stack trace to stderr and the rest of the program continues — a silent failure in production. Set ${C('Thread.setDefaultUncaughtExceptionHandler')} or use executors and inspect Futures. <b>Priorities</b> (1–10) are only hints to the OS and are mostly ignored on Linux — never rely on them for correctness. ${C('getState()')} is a snapshot that may be stale the instant it returns; it is for monitoring, not for synchronization.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> assistants produce thread boilerplate instantly, and they can read a 3,000-line thread dump and group threads by state and stack in seconds — a real superpower during incidents. <b>Use AI as a partner:</b> <code>Here is a jstack dump. Group threads by state and top frame, and tell me which lock most BLOCKED threads are waiting for.</code> or <code>List every way this program's output can be ordered; do not fix it.</code></p>
<p><b>Where AI goes wrong:</b> it happily writes ${C('extends Thread')}, calls ${C('run()')} in tests "to make them deterministic" (which removes the concurrency you wanted to test), forgets ${C('join()')}, writes ${C('catch (InterruptedException e) {}')}, or spawns a raw thread per request in server code. <b>What you must still own:</b> knowing which states mean contention vs idle waiting, choosing raw threads vs a pool vs virtual threads, and proving that results are visible to the reader (start/join happens-before). Interviewers increasingly paste AI-written concurrent code and ask you to find the bug — this module is that skill.</p>`,
    problems: [{
      title: 'Parallel Maximum with K Threads',
      level: 'Easy', tags: ['threads', 'join', 'partitioning'], companies: ['Amazon', 'Infosys', 'Goldman Sachs'],
      statement: `<p>Given an int array ${C('a')} (non-empty) and a number ${C('k')}, find the maximum element using <b>k platform threads</b>. Split the array into k contiguous chunks, let each thread find its chunk's max, then combine. Return the overall maximum. Use only ${C('Thread')}, ${C('start()')} and ${C('join()')} — no locks.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>7</sup>, 1 ≤ k ≤ 64, values fit in int. If k &gt; n, use n threads.`,
      example: `<p>a = [3, 9, -2, 7, 11, 4, 8], k = 3 → chunks ${H.c('b', '[3,9,-2]')} ${H.c('g', '[7,11,4]')} ${H.c('y', '[8]')} → local maxima 9, 11, 8 → answer <b>11</b>.</p>`,
      brute: {
        why: `<p>The tempting "parallel" version lets every thread update one <b>shared</b> ${C('max')} field: ${C('if (a[i] > max) max = a[i];')}. That is a <b>check-then-act race</b>: two threads can both read 9, one writes 11, the other then writes 10 over it — the 11 is lost. It is also slow: every thread hammers the same field, bouncing its cache line between cores. A plain sequential loop would be correct but uses one core.</p>`,
        code: `
class RacyMax {
    static int max = Integer.MIN_VALUE;           // shared, unprotected: BROKEN
    static int parallelMax(int[] a, int k) throws InterruptedException {
        Thread[] ts = new Thread[k];
        int chunk = (a.length + k - 1) / k;
        for (int t = 0; t < k; t++) {
            int lo = t * chunk, hi = Math.min(a.length, lo + chunk);
            ts[t] = new Thread(() -> {
                for (int i = lo; i < hi; i++)
                    if (a[i] > max) max = a[i];   // read-check-write: another thread can sneak in between
            });
            ts[t].start();
        }
        for (Thread t : ts) t.join();
        return max;
    }
}`
      },
      mcq: { q: 'Each worker writes its answer into <code>partial[id]</code> (its own slot), and main reads the slots after <code>join()</code>. Why is no lock needed?', options: ['Arrays are thread-safe in Java', 'Each slot has exactly one writer, and join() creates a happens-before edge so main sees the writes', 'Because int writes are atomic, visibility is automatic', 'It is actually broken; you need volatile on the array'], answer: 1, explain: 'No two threads write the same slot (no race), and the JMM guarantees that everything a thread did is visible to a thread that successfully returns from join() on it. Atomic int writes alone do NOT give visibility.' },
      hints: [
        `<p>Hint 1: give every thread its <b>own</b> place to store an answer, so threads never touch the same variable. A ${C('int[] partial = new int[k]')} works.</p>`,
        `<p>Hint 2: chunk size = ceil(n / k) = ${C('(n + k - 1) / k')}. Thread t handles ${C('[t*chunk, min(n, t*chunk+chunk))')}. Lambdas need effectively-final copies of ${C('t')}, ${C('lo')}, ${C('hi')}.</p>`,
        `<p>Hint 3: recipe — clamp k to [1, n]; create &amp; start all threads first (do not join inside the creation loop, that would serialize them!); then join each and fold ${C('Math.max')}. Empty chunks leave MIN_VALUE, which never wins.</p>`
      ],
      solution: {
        approach: `<p><b>Partition, compute locally, publish via join.</b> Each worker loops over its own chunk with a local variable (fast, in a register), writes one result into its private slot, and exits. Main joins each worker; join's happens-before guarantee makes the slot visible. No shared mutable state is written by two threads, so there is nothing to lock.</p>`,
        code: `
class ParallelMax {
    static int parallelMax(int[] a, int k) throws InterruptedException {
        if (a.length == 0) throw new IllegalArgumentException("empty array");
        k = Math.max(1, Math.min(k, a.length));        // never more threads than elements
        int[] partial = new int[k];                     // one private slot per thread
        Thread[] workers = new Thread[k];
        int chunk = (a.length + k - 1) / k;             // ceil(n / k)
        for (int t = 0; t < k; t++) {
            final int id = t, lo = t * chunk, hi = Math.min(a.length, lo + chunk);
            workers[t] = new Thread(() -> {
                int best = Integer.MIN_VALUE;           // local variable: lives on this thread's stack
                for (int i = lo; i < hi; i++) best = Math.max(best, a[i]);
                partial[id] = best;                     // single writer per slot: no race
            }, "max-" + t);
            workers[t].start();                         // start ALL before joining any
        }
        int ans = Integer.MIN_VALUE;
        for (int t = 0; t < k; t++) {
            workers[t].join();                          // happens-before: partial[t] is now visible
            ans = Math.max(ans, partial[t]);
        }
        return ans;
    }

    public static void main(String[] args) throws InterruptedException {
        System.out.println(parallelMax(new int[]{3, 9, -2, 7, 11, 4, 8}, 3));  // 11
        System.out.println(parallelMax(new int[]{-5}, 8));                     // -5 (k clamped to 1)
    }
}`,
        dry: { head: ['thread', 'range [lo,hi)', 'chunk values', 'partial[id]', 'main after join'], rows: [
          ['max-0', '[0,3)', '3, 9, -2', '9', 'ans = 9'],
          ['max-1', '[3,6)', '7, 11, 4', '11', 'ans = max(9,11) = 11'],
          ['max-2', '[6,7)', '8', '8', '<span class="c-g">ans = 11</span>']
        ] },
        complexity: `<p>Work O(n) total; with k cores the wall time is about O(n/k) plus thread start cost (~tens of µs each). Extra space O(k). For tiny arrays the thread overhead dominates — measure before parallelizing.</p>`,
        followUps: ['What breaks if you call join() inside the creation loop?', 'How would you do this with an ExecutorService and Futures?', 'Why might adjacent partial[] slots cause false sharing, and does it matter here?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Race conditions: read-modify-write and check-then-act
     ====================================================================== */
  var INC_CODE = [
    'for (int i = 0; i < 2; i++) {   // count++ is really 3 steps:',
    '    int r = count;               // LOAD  shared -> my register',
    '    r = r + 1;                   // ADD   only in my register',
    '    count = r;                   // STORE my register -> shared',
    '}'
  ].join('\n');

  topics.push({
    title: 'Race Conditions: Why count++ Is Not One Step (Read-Modify-Write & Check-Then-Act)',
    analogy: `<p>Two flatmates share a whiteboard that says <b>"Milk: 5"</b>. Both buy one carton. Each reads "5" in the morning, thinks "now it is 6", and later walks to the board and writes <b>6</b>. Two cartons were added, but the board says 6, not 7 — one update was <b>lost</b>. Nobody did anything "wrong" alone; the bug only exists because they <b>read, thought, and wrote</b> in overlapping time. That gap between reading and writing is a <b>race condition</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A <b>race condition</b> is when the correctness of your program depends on <b>lucky timing</b> between threads. The two shapes you must recognise instantly:</p>
<ol>
<li><b>Read-modify-write</b>: ${C('count++')}, ${C('total += x')}, ${C('map.put(k, map.get(k) + 1)')}. Looks like one action, but is really <b>LOAD → ADD → STORE</b>. If another thread stores in between, one update is overwritten.</li>
<li><b>Check-then-act</b>: ${C('if (seats > 0) seats--;')}, ${C('if (instance == null) instance = new X();')}, ${C('if (!list.contains(x)) list.add(x);')}. The fact you checked can become false before you act.</li>
</ol>
<p>Here is what the JVM really runs for ${C('count++')} on a field (bytecode):</p>
${H.table(['bytecode', 'plain English', 'can another thread interrupt after it?'], [
  [C('getfield count'), 'copy count into my operand stack / register', '<span class="c-r">yes</span>'],
  [C('iconst_1; iadd'), 'add 1 — privately, nobody else sees it', '<span class="c-r">yes</span>'],
  [C('putfield count'), 'write my private result back', '—']
])}
<p>Two threads, each doing ${C('count++')} once, starting at 0:</p>
${H.table(['time', 'Thread A', 'Thread B', 'count'], [
  ['1', 'LOAD → r=0', '', '0'],
  ['2', '', 'LOAD → r=0', '0'],
  ['3', 'ADD → r=1', 'ADD → r=1', '0'],
  ['4', 'STORE 1', '', '1'],
  ['5', '', 'STORE 1  ' + H.c('r', '(overwrites A!)'), '<b class="c-r">1</b>']
])}
<p><b>Key words.</b> <b>Atomic</b> = "all or nothing, nobody sees a half-done state, nobody sneaks in between". A class is <b>thread-safe</b> if it behaves correctly when used by many threads, with no extra coordination from callers. The three honest fixes: <b>don't share</b> (thread confinement, local variables), <b>don't mutate</b> (immutable objects), or <b>coordinate</b> (${C('synchronized')} — next topic; atomics — next module).</p>
<p><b>Warning:</b> races are timing-dependent, so tests usually pass on your laptop and fail under production load. You prove absence of races by <b>reasoning</b>, not by running the test 10 times.</p>`,
    clues: [
      '"Multiple threads <b>increment a shared counter</b>" → read-modify-write race',
      '"Totals are <b>occasionally wrong</b> under load / works in tests, fails in prod" → race condition',
      '"<b>Oversold</b> inventory / double-booked seat / duplicate order" → check-then-act race',
      '"<b>Lazy initialization</b>" or "create if absent" → check-then-act; need atomic get-or-create',
      '"Each method of the collection is synchronized, so my code is safe, right?" → compound actions are still racy',
      '"What values can count have after two threads each do count++ N times?" → anything from 2 to 2N (N ≥ 2)'
    ],
    code: [`
public class LostUpdates {
    static int count = 0;                       // shared, unprotected

    public static void main(String[] args) throws InterruptedException {
        Runnable job = () -> {
            for (int i = 0; i < 100_000; i++) count++;   // LOAD, ADD, STORE — three separate steps
        };
        Thread a = new Thread(job), b = new Thread(job);
        a.start(); b.start();
        a.join(); b.join();
        // Expected 200000. On a multi-core machine you will usually see less, e.g. 137512,
        // and a different number on every run. That is a lost update.
        System.out.println("count = " + count);
    }
}`, `
// Check-then-act: the classic "last seat" bug and its fix.
class Seats {
    private int free = 1;

    boolean bookUnsafe() {                  // RACY
        if (free > 0) {                     // check: both threads can see free == 1 here ...
            free--;                         // act:   ... and both decrement → free == -1 (oversold)
            return true;
        }
        return false;
    }

    synchronized boolean bookSafe() {       // check + act inside ONE lock = one atomic step
        if (free > 0) { free--; return true; }
        return false;
    }
}`],
    codeTitle: ['Watch updates disappear (run it a few times)', 'Check-then-act and the fix'],
    viz: [{
      title: 'You are the scheduler: interleave count++ and watch updates get lost',
      input: 'A A B B B A A A B B B A',
      inputLabel: 'Schedule: which thread runs its next micro-step (A or B)',
      gen: function (input) {
        var s = clean(input).toUpperCase().replace(/[\s,]+/g, '');
        if (!/^[AB]*$/.test(s)) throw new Error('Use only the letters A and B, e.g. A A B B B A');
        if (s.length > 40) throw new Error('Use at most 40 letters');
        var OPS = ['LOAD', 'ADD', 'STORE'], LINES = [2, 3, 4], TOTAL = 6;
        var th = { A: { pc: 0, r: '-', seen: null, line: null }, B: { pc: 0, r: '-', seen: null, line: null } };
        var count = 0, lost = 0, log = [], frames = [];
        function snap(narr, who, cls, extraHl) {
          var hv = {}; if (extraHl) hv.count = extraHl;
          var rows = log.slice(-8);
          var step = {
            a: th.A.pc >= TOTAL ? 5 : th.A.line, b: th.B.pc >= TOTAL ? 5 : th.B.line,
            ca: who === 'A' ? cls : 'done', cb: who === 'B' ? cls : 'done',
            sa: th.A.pc >= TOTAL ? 'finished' : 'next: ' + OPS[th.A.pc % 3], sb: th.B.pc >= TOTAL ? 'finished' : 'next: ' + OPS[th.B.pc % 3],
            v: { count: count, 'expected so far': (Math.floor(th.A.pc / 3) + Math.floor(th.B.pc / 3)), 'lost updates': lost }, hv: hv,
            extra: [
              { type: 'vars', label: 'Private registers (each thread\'s own copy)', vals: { 'A.r': th.A.r, 'A.i': Math.min(2, Math.floor(th.A.pc / 3)), 'B.r': th.B.r, 'B.i': Math.min(2, Math.floor(th.B.pc / 3)) }, hl: who ? one(who + '.r', cls === 'bad' ? 'bad' : 'cur') : {} },
              { type: 'table', label: 'Timeline (latest 8 micro-steps)', columns: ['#', 'thread', 'step', 'register', 'count after'], rows: rows.length ? rows.map(function (r) { return r.slice(0, 5); }) : [['-', '-', '-', '-', '0']], hl: rows.length && rows[rows.length - 1][5] ? one(rows.length - 1, rows[rows.length - 1][5]) : {} }
            ],
            narr: narr
          };
          frames.push(twoThreads(INC_CODE, INC_CODE, [step])[0]);
        }
        function exec(who) {
          var t = th[who];
          if (t.pc >= TOTAL) { snap('<b>' + who + '</b> has already finished both increments, so this letter is skipped.', null, 'done'); return; }
          var op = t.pc % 3, narr, cls = 'cur', mark = '';
          t.line = LINES[op];
          if (op === 0) { t.r = count; t.seen = count; narr = '<b>' + who + '</b> LOADs count = <b>' + count + '</b> into its private register. From now on it will not notice changes made by the other thread.'; }
          else if (op === 1) { t.r = t.r + 1; narr = '<b>' + who + '</b> ADDs 1 in its register → r = <b>' + t.r + '</b>. Shared count is still ' + count + ' — nobody else can see this new value yet.'; }
          else {
            var overwrote = count !== t.seen;
            if (overwrote) { lost += (count - t.seen) > 0 ? (count - t.seen) : 0; cls = 'bad'; mark = 'bad'; narr = '<b>' + who + '</b> STOREs r = ' + t.r + ', but count had already changed from ' + t.seen + ' to ' + count + ' since ' + who + ' loaded it. <span class="c-r">The other thread\'s update is overwritten — LOST.</span>'; }
            else { cls = 'ok'; mark = 'ok'; narr = '<b>' + who + '</b> STOREs r = ' + t.r + ' into count. Nobody changed count since ' + who + ' loaded it, so this increment is safe.'; }
            count = t.r;
          }
          log.push([String(log.length + 1), who, OPS[op], String(t.r), String(count), mark]);
          t.pc++;
          snap(narr, who, cls, op === 2 ? (cls === 'bad' ? 'bad' : 'ok') : '');
        }
        snap('Two threads each run <b>count++ twice</b>. count++ is three micro-steps: LOAD, ADD, STORE. Your input decides who runs the next micro-step. Correct answer would be <b>4</b>.', null, 'done');
        for (var i = 0; i < s.length; i++) exec(s[i]);
        if (th.A.pc < TOTAL || th.B.pc < TOTAL) {
          frames.push({ narr: 'Your schedule ended early, so we let A finish, then B finish (no more overlap).', parts: [note('Remaining steps run in order: A first, then B.', 'Finishing up')] });
          while (th.A.pc < TOTAL) exec('A');
          while (th.B.pc < TOTAL) exec('B');
        }
        frames.push({ narr: count === 4 ? '<span class="c-g">Final count = 4. This schedule happened not to overlap a LOAD…STORE window, so no update was lost.</span> Try <b>A B A B A B A B A B A B</b>.' : '<span class="c-r">Final count = ' + count + ', expected 4. ' + (4 - count) + ' update(s) lost.</span> Every lost update came from a STORE that overwrote a value it never saw.', parts: [
          { type: 'vars', label: 'Result', vals: { 'final count': count, expected: 4, lost: 4 - count }, hl: { 'final count': count === 4 ? 'ok' : 'bad' } },
          { type: 'table', label: 'Full timeline', columns: ['#', 'thread', 'step', 'register', 'count after'], rows: log.map(function (r) { return r.slice(0, 5); }), hl: (function () { var h = {}; log.forEach(function (r, k) { if (r[5]) h[k] = r[5]; }); return h; })() },
          note('Fix: make LOAD-ADD-STORE one indivisible step — <code>synchronized</code> (next topic) or <code>AtomicInteger.incrementAndGet()</code> (next module). Then no schedule can lose an update.', 'Lesson')
        ] });
        return frames;
      }
    }, {
      title: 'Check-then-act: two fans, one last seat',
      gen: function () {
        var A = ['if (free > 0) {      // check', '    free--;            // act', '    return true;', '}', 'return false;'].join('\n');
        return twoThreads(A, A, [
          { v: { free: 1 }, sa: 'about to book', sb: 'about to book', narr: 'One seat left. Fan A and fan B both call <b>bookUnsafe()</b> at the same moment.' },
          { a: 1, v: { free: 1 }, sa: 'checked: true', narr: 'A checks <b>free &gt; 0</b> → true. A is about to decrement… and the OS pauses A right here (its time slice ended).' },
          { a: 1, ca: 'done', b: 1, v: { free: 1 }, sa: 'paused', sb: 'checked: true', narr: 'B runs and checks <b>free &gt; 0</b> → still true, because A has not acted yet. The "fact" A checked is about to become stale.' },
          { a: 1, ca: 'done', b: [2, 3], cb: 'ok', v: { free: 0 }, hv: { free: 'ok' }, sa: 'paused', sb: 'booked', narr: 'B decrements: free = 0, returns true. B got the last seat legitimately.' },
          { a: [2, 3], ca: 'bad', b: 3, cb: 'done', v: { free: -1 }, hv: { free: 'bad' }, sa: 'booked (WRONG)', sb: 'done', narr: 'A resumes <b>after</b> its check and decrements anyway: free = <b>-1</b>. Two tickets sold for one seat. <span class="c-r">Oversold!</span>' },
          { v: { free: 0 }, hv: { free: 'ok' }, sa: 'with synchronized', sb: 'with synchronized', narr: 'Fix: put the check <b>and</b> the act inside one ' + C('synchronized') + ' method. Then B cannot even start checking until A has finished acting, so B sees free = 0 and returns false.', extra: [{ type: 'table', label: 'Safe version: possible outcomes', columns: ['who runs first', 'A returns', 'B returns', 'free'], rows: [['A', 'true', 'false', '0'], ['B', 'false', 'true', '0']], hl: { 0: 'ok', 1: 'ok' } }] }
        ], ['Fan A: bookUnsafe()', 'Fan B: bookUnsafe()']);
      }
    }],
    examples: [
      { title: 'What can this print? Two threads, 1000 increments each', html: `<p>Possible values: <b>any integer from 2 to 2000</b>. 2000 when no overlap; typically something like 1400–1990 on a multi-core laptop; and the surprising minimum of <b>2</b> exists (see the Hard practice problem for the exact schedule). It can even print exactly 2000 a hundred times in a row and still be broken. Adding a ${C('System.out.println')} inside the loop often "fixes" it — because println takes a lock and slows things down, hiding the race. That is a <b>Heisenbug</b>.</p>`, code: `
int[] count = {0};                                  // array so the lambda can mutate it
Runnable job = () -> { for (int i = 0; i < 1000; i++) count[0]++; };
Thread t1 = new Thread(job), t2 = new Thread(job);
t1.start(); t2.start(); t1.join(); t2.join();
System.out.println(count[0]);                       // anywhere in [2, 2000]` },
      { title: 'Word counting with a shared HashMap', html: `<p>${C('map.put(w, map.getOrDefault(w, 0) + 1)')} is read-modify-write on a <b>map entry</b>: counts get lost. Worse, plain ${C('HashMap')} is not safe for concurrent writes at all — a concurrent resize can lose whole entries (and in Java 7 could even create a cycle and spin a CPU at 100% forever). Fix: ${C('ConcurrentHashMap.merge(w, 1, Integer::sum)')}, which performs the read-modify-write atomically per key.</p>`, code: `
Map<String, Integer> counts = new ConcurrentHashMap<>();
String[] words = {"to", "be", "or", "not", "to", "be"};
Thread t1 = new Thread(() -> { for (String w : words) counts.merge(w, 1, Integer::sum); });
Thread t2 = new Thread(() -> { for (String w : words) counts.merge(w, 1, Integer::sum); });
t1.start(); t2.start(); t1.join(); t2.join();
System.out.println(counts);   // to=4, be=4, or=2, not=2 — every time (order may vary)` },
      { title: '"But I used a synchronized list!"', html: `<p>${C('Collections.synchronizedList')} makes <b>each call</b> atomic, but ${C('if (!list.contains(x)) list.add(x)')} is <b>two</b> calls. Another thread can add ${C('x')} between them → duplicates. Fix: hold the list's own lock around the pair (the synchronized wrapper uses itself as the lock, so client-side locking works), or use a ${C('Set')}.</p>`, code: `
List<String> users = Collections.synchronizedList(new ArrayList<>());
String name = "asha";
synchronized (users) {                 // same lock the wrapper uses internally
    if (!users.contains(name)) users.add(name);
}
System.out.println(users);` },
      { title: 'Lazy initialization race', html: `<p>${C('if (cache == null) cache = loadExpensiveCache();')} — two threads can both see null and both load. At best you waste work; at worst two threads hold <b>different</b> "singleton" instances and one thread's updates vanish. Fixes: initialise eagerly, use a ${C('synchronized')} getter, the holder-class idiom, or ${C('volatile')} + double-checked locking (topic 5).</p>` }
    ],
    deepDive: `<p><b>🟣 Data race vs race condition — not the same thing.</b> The JLS defines a <b>data race</b> precisely: two threads access the same variable, at least one access is a write, and the accesses are not ordered by <b>happens-before</b>. A <b>race condition</b> is a higher-level logic bug: the result depends on timing. You can have a race condition with zero data races (e.g. ${C('if (atomic.get() > 0) atomic.decrementAndGet();')} — each call is atomic, the pair is not), and a data race that is intentionally benign (${C('String.hashCode()')} caches its hash in a non-volatile field; a race just recomputes the same value).</p>
<p><b>Why lost updates are so common in practice.</b> The JIT may keep ${C('count')} in a CPU register for many loop iterations and store it back later (it is allowed to for a non-volatile field), so the overlap window is not three instructions but potentially the <b>whole loop</b>. That is why two threads × 100,000 increments often lands far below 200,000. On a single core you still lose updates, just less often, because a context switch can land between LOAD and STORE.</p>
<p><b>The minimum is 2, not N.</b> With two threads doing N ≥ 2 increments each, the final value can be as small as 2: A loads 0 and stalls; B does N−1 full increments; A stores 1 (wiping B's work); B loads 1 and stalls; A does its remaining N−1 increments; B stores 2. Interviewers love this because it shows you reason about <b>all</b> interleavings, not the typical ones.</p>
<p><b>Testing races.</b> Unit tests rarely catch them. Use stress tests with many threads and a ${C('CountDownLatch')} start gate, run on many-core machines, and for low-level code use <b>OpenJDK jcstress</b>, which runs litmus tests billions of times and reports every observed outcome. Tools like ThreadSanitizer-style detectors exist for native code; for Java, static analysis (SpotBugs "inconsistent synchronization", Error Prone ${C('@GuardedBy')}) catches many mistakes at compile time.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> AI is good at spotting the textbook shapes — ${C('count++')} on a shared field, ${C('if (x == null) x = new ...')} — and at writing a stress test harness in seconds. <b>Use AI as a partner:</b> <code>List every read-modify-write and check-then-act sequence on shared state in this class, with line numbers. Don't fix anything yet.</code> Then reason about each one yourself.</p>
<p><b>Where AI goes wrong:</b> it "fixes" races by adding ${C('volatile')} (visibility only — count++ is still broken), by switching to ${C('Collections.synchronizedMap')} while leaving the compound get-then-put, or by sprinkling ${C('synchronized')} on some methods but not the readers. It also tends to write tests that pass by luck. <b>What you must still own:</b> identifying the <b>invariant</b> (e.g. "sold + free == capacity") and making every code path that touches it atomic under one lock — that judgment is what interviews test.</p>`,
    problems: [{
      title: 'Ticket Counter That Never Oversells',
      level: 'Medium', tags: ['race condition', 'check-then-act', 'synchronized'], companies: ['BookMyShow', 'Amazon', 'Flipkart'],
      statement: `<p>Implement ${C('TicketCounter(int seats)')} with ${C('boolean tryBook(int n)')} that books ${C('n')} seats if (and only if) at least ${C('n')} are available, plus ${C('available()')} and ${C('sold()')}. Many threads call ${C('tryBook')} concurrently. Invariant: ${C('sold + available == seats')} and ${C('available ≥ 0')} at all times, as seen by any thread.</p>`,
      constraints: `Up to 64 threads, up to 10<sup>6</sup> calls in total, 1 ≤ seats ≤ 10<sup>9</sup>. n ≤ 0 must return false.`,
      example: `<p>seats = 100; 8 threads each try ${C('tryBook(1)')} 50 times (400 attempts). Output must always be ${H.c('g', 'sold=100 available=0')} — never sold=101, never available=-1.</p>`,
      brute: {
        why: `<p>The naive version checks ${C('n <= available')} and then subtracts, without a lock. Two threads can pass the check on the last seat together and both subtract → <b>available = -1</b>. Also ${C('sold += n')} and ${C('available -= n')} are separate read-modify-writes, so lost updates break the invariant even without overselling.</p>`,
        code: `
class UnsafeTicketCounter {
    private int available, sold;
    UnsafeTicketCounter(int seats) { available = seats; }
    boolean tryBook(int n) {
        if (n > 0 && n <= available) {   // CHECK: two threads both see 1 seat ...
            available -= n;              // ACT:   ... both subtract → -1 (oversold)
            sold += n;                   // and this read-modify-write can lose updates
            return true;
        }
        return false;
    }
}`
      },
      mcq: { q: 'Which change alone makes <code>tryBook</code> correct?', options: ['Mark <code>available</code> and <code>sold</code> as <code>volatile</code>', 'Make <code>tryBook</code>, <code>available()</code> and <code>sold()</code> all <code>synchronized</code> on the same object', 'Use <code>Thread.yield()</code> between check and act', 'Make only <code>tryBook</code> synchronized; getters do not need it'], answer: 1, explain: 'The check and the act must be one atomic step (synchronized), and readers must use the same lock to see an up-to-date, consistent pair. volatile gives visibility, not atomicity; unsynchronized getters may see stale values.' },
      hints: [
        `<p>Hint 1: name the invariant first: ${C('sold + available == seats')}, ${C('available >= 0')}. Any code that reads or changes these fields must do so while no other thread is mid-update.</p>`,
        `<p>Hint 2: one lock (the object itself via ${C('synchronized')} methods) guards both fields. Check and act go in the same synchronized method.</p>`,
        `<p>Hint 3: recipe — synchronized tryBook: reject n ≤ 0 or n &gt; available; else available -= n; sold += n; return true. Synchronized getters too (visibility + a consistent view).</p>`
      ],
      solution: {
        approach: `<p><b>Make the invariant's guard explicit.</b> Both fields are "guarded by this". The check and the act happen inside one synchronized method, so from every other thread's point of view a booking is a single indivisible event. Getters are synchronized so they see the latest values (the unlock-lock happens-before rule).</p>`,
        code: `
class TicketCounter {
    private int available;          // guarded by "this"
    private int sold;               // guarded by "this"

    TicketCounter(int seats) { this.available = seats; }

    // Check AND act under one lock: no other thread can slip in between.
    synchronized boolean tryBook(int n) {
        if (n <= 0 || n > available) return false;   // check
        available -= n;                               // act
        sold += n;
        return true;
    }

    synchronized int available() { return available; }
    synchronized int sold() { return sold; }

    public static void main(String[] args) throws InterruptedException {
        TicketCounter counter = new TicketCounter(100);
        Thread[] fans = new Thread[8];
        for (int f = 0; f < fans.length; f++) {
            fans[f] = new Thread(() -> {
                for (int i = 0; i < 50; i++) counter.tryBook(1);   // 400 attempts for 100 seats
            });
            fans[f].start();
        }
        for (Thread t : fans) t.join();
        System.out.println("sold=" + counter.sold() + " available=" + counter.available()); // sold=100 available=0
    }
}`,
        dry: { head: ['event', 'thread', 'lock owner', 'available', 'sold', 'result'], rows: [
          ['tryBook(1)', 'T1', 'T1', '1 → 0', '99 → 100', '<span class="c-g">true</span>'],
          ['tryBook(1)', 'T2 (was BLOCKED)', 'T2', '0', '100', '<span class="c-r">false</span> (check fails)'],
          ['tryBook(0)', 'T3', 'T3', '0', '100', 'false (invalid n)'],
          ['sold()', 'main', 'main', '0', '100', '100']
        ] },
        complexity: `<p>O(1) per call. Throughput is limited by lock contention: all threads serialize on one monitor (fine for thousands of ops/sec; for millions use striping or ${C('AtomicInteger')} CAS loops — next module).</p>`,
        followUps: ['How would you support cancelling a booking?', 'Implement it lock-free with AtomicInteger.compareAndSet.', 'Seats are now per-section with 1,000 sections — how do you avoid one global lock?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — synchronized and intrinsic locks (monitors)
     ====================================================================== */
  var MON_CODE = [
    'class Account {',
    '  private int balance;                    // guarded by "this"',
    '  synchronized void deposit(int amt) {    // enter: lock(this)',
    '    int b = balance;',
    '    balance = b + amt;',
    '    audit();                              // re-enters the SAME lock',
    '  }                                       // exit: unlock(this)',
    '  synchronized void audit() { /* reads balance */ }',
    '}'
  ].join('\n');

  topics.push({
    title: 'synchronized & Intrinsic Locks: Monitors, Reentrancy, Lock Objects',
    analogy: `<p>Every Java object comes with a <b>single-occupancy bathroom key</b> hanging on it (its <b>monitor</b>, or intrinsic lock). ${C('synchronized (obj) { ... }')} means "take obj's key, do your business, hang the key back". While you hold it, everyone else who wants <b>that same key</b> queues at the door (state BLOCKED). People waiting for a <i>different</i> object's key are not affected at all. And if you, already inside, need the same key again (calling another synchronized method on the same object) — you already have it, so you just walk in: that is <b>reentrancy</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> ${C('synchronized')} turns a block of code into a <b>critical section</b>: at most one thread at a time can be inside any block guarded by the same lock object. It gives you three things at once:</p>
<ol>
<li><b>Mutual exclusion</b> — only the lock owner runs the guarded code, so compound actions (check-then-act, read-modify-write) become atomic.</li>
<li><b>Visibility</b> — everything a thread wrote before releasing a lock is visible to the next thread that acquires the <b>same</b> lock.</li>
<li><b>Ordering</b> — the compiler/CPU cannot move reads/writes out of the critical section in a way that breaks 1 and 2.</li>
</ol>
<p><b>Which lock does it use?</b> This is the most-tested detail:</p>
${H.table(['you write', 'lock object', 'blocks whom?'], [
  [C('synchronized void m()'), C('this') + ' (the instance)', 'other synchronized instance methods on the <b>same</b> object'],
  [C('static synchronized void s()'), C('MyClass.class') + ' (the Class object)', 'other static synchronized methods of that class'],
  [C('synchronized (lock) { }'), 'whatever ' + C('lock') + ' refers to', 'anyone synchronizing on that same object'],
  ['instance method vs static method', '<span class="c-r">two different locks</span>', 'they do <b>not</b> exclude each other!']
])}
<p><b>Rules that make synchronized actually work:</b></p>
<ul>
<li><b>Every access</b> to the shared state — reads too — must hold the <b>same</b> lock. Locking only the writer is a classic bug (the reader may see stale or half-updated data).</li>
<li><b>Reentrant:</b> the owner can re-acquire a lock it holds; the JVM keeps a <b>hold count</b> and really releases when it drops to 0. Without this, a synchronized method calling another synchronized method on ${C('this')} would deadlock with itself.</li>
<li>The lock is released <b>automatically</b> when the block exits — normally or by an exception. You can never "forget to unlock" (unlike ${C('ReentrantLock')}, next module).</li>
<li>Prefer a <b>private final lock object</b> (${C('private final Object lock = new Object();')}) over locking ${C('this')}: outside code cannot grab your lock and accidentally block you.</li>
<li><b>Never lock on</b> string literals (interned and shared JVM-wide), boxed values like ${C('Integer')} (cached −128..127, and ${C('count++')} replaces the object!), or a field that gets reassigned.</li>
<li>Keep critical sections <b>short</b>: no I/O, no sleeping, no calls to unknown code ("alien methods") while holding the lock.</li>
</ul>`,
    clues: [
      '"Make this class <b>thread-safe</b>" with several related fields → one lock guarding all of them',
      '"Does a <b>static synchronized</b> method block an instance synchronized method?" → no: Class object vs this',
      '"Can a synchronized method call another synchronized method on the same object?" → yes, <b>reentrant</b>',
      '"Thread dump: many threads <b>BLOCKED on</b> the same monitor" → lock contention, shrink the critical section',
      '"Why not <b>synchronized("lock")</b> or synchronized on an Integer?" → shared / replaced objects',
      '"Is the lock released if an exception is thrown?" → yes, always',
      '"Readers see stale values although writes are synchronized" → readers must lock too'
    ],
    code: [`
public class SafeCounter {
    private final Object lock = new Object();   // private: no outsider can lock it
    private long count;                          // guarded by lock

    public void increment() {
        synchronized (lock) {                    // LOAD-ADD-STORE becomes one atomic step
            count++;
        }
    }

    public long get() {
        synchronized (lock) {                    // readers lock too → they see the latest value
            return count;
        }
    }

    public static void main(String[] args) throws InterruptedException {
        SafeCounter c = new SafeCounter();
        Runnable job = () -> { for (int i = 0; i < 100_000; i++) c.increment(); };
        Thread a = new Thread(job), b = new Thread(job);
        a.start(); b.start(); a.join(); b.join();
        System.out.println(c.get());             // always 200000
    }
}`, `
class LockFlavours {
    private static int globalHits;   // guarded by LockFlavours.class
    private int hits;                // guarded by this

    synchronized void hit() {        // same as synchronized (this) { ... }
        hits++;
        log();                       // reentrant: we already own "this"
    }

    synchronized void log() { System.out.println("hits=" + hits); }

    static synchronized void globalHit() {   // same as synchronized (LockFlavours.class) { ... }
        globalHits++;
    }

    void hitBoth() {
        synchronized (this) { hits++; }                       // instance lock
        synchronized (LockFlavours.class) { globalHits++; }   // class lock — a DIFFERENT lock
    }
}`],
    codeTitle: ['Thread-safe counter with a private lock object', 'Instance lock vs class lock vs reentrancy'],
    viz: [{
      title: 'Lock ownership: owner, hold count and the entry set',
      input: 'A B C',
      inputLabel: 'Threads calling deposit(10), in arrival order (2–5 names)',
      gen: function (input) {
        var names = clean(input).split(/[\s,]+/).filter(function (x) { return x; });
        if (names.length < 2 || names.length > 5 || names.some(function (n) { return !/^[A-Za-z0-9]{1,6}$/.test(n); })) throw new Error('Enter 2 to 5 short thread names, e.g. A B C');
        var seen = {};
        names.forEach(function (n) { if (seen[n]) throw new Error('Thread names must be different'); seen[n] = 1; });
        var owner = '-', hold = 0, balance = 0, entry = [], st = {}, frames = [];
        names.forEach(function (n) { st[n] = 'RUNNABLE'; });
        function fr(line, cls, narr, hv) {
          frames.push({ narr: narr, parts: [
            { type: 'code', label: 'Shared Account object', lang: 'java', code: MON_CODE, hl: line ? lineHl(line, cls) : {} },
            { type: 'vars', label: 'Monitor of the Account object', vals: { owner: owner, holdCount: hold, balance: balance }, hl: hv || {} },
            { type: 'queue', label: 'Entry set (threads BLOCKED on this monitor)', items: entry.slice(), frontLabel: 'waiting', backLabel: 'latest' },
            { type: 'table', label: 'Thread states', columns: ['thread', 'state'], rows: names.map(function (n) { return [n, st[n]]; }), hl: (function () { var h = {}; names.forEach(function (n, i) { if (st[n] === 'BLOCKED') h[i] = 'bad'; else if (n === owner) h[i] = 'cur'; else if (st[n] === 'TERMINATED') h[i] = 'done'; }); return h; })() }
          ] });
        }
        function acquire(n, first) {
          owner = n; hold = 1; st[n] = 'RUNNABLE';
          fr(3, 'ok', first ? '<b>' + n + '</b> calls deposit(10). The monitor is free, so ' + n + ' becomes the <b>owner</b>, hold count = 1.' : 'The JVM hands the free monitor to <b>' + n + '</b> (BLOCKED → RUNNABLE). Note: synchronized makes <b>no fairness promise</b> — it need not be the thread that waited longest.', { owner: 'ok', holdCount: 'ok' });
        }
        function body(n, detailed) {
          var b = balance;
          if (detailed) {
            fr(4, 'cur', n + ' reads balance = ' + b + ' into a local. No other thread can change balance now — they would need the lock first.');
            balance = b + 10;
            fr(5, 'ok', n + ' writes balance = ' + balance + '. This read-modify-write is safe because it is inside the critical section.', { balance: 'ok' });
            hold = 2;
            fr(8, 'win', n + ' calls <b>audit()</b>, another synchronized method on the same object. It already owns the lock, so it walks straight in: <b>reentrancy</b>, hold count = 2. (A non-reentrant lock would deadlock right here.)', { holdCount: 'cur' });
            hold = 1;
            fr(6, 'cur', 'audit() returns: hold count back to 1. The lock is <b>still held</b> — it is only released when the count reaches 0.', { holdCount: 'cur' });
          } else {
            balance = b + 10;
            fr([4, 5, 6], 'ok', n + ' reads ' + b + ', writes ' + balance + ', and re-enters via audit() (hold count briefly 2, then 1). All while the others wait.', { balance: 'ok' });
          }
          hold = 0; owner = '-'; st[n] = 'TERMINATED';
          fr(7, 'done', n + ' leaves deposit(): hold count 0 → lock <b>released</b>. Release also <b>publishes</b> its writes: the next owner is guaranteed to see balance = ' + balance + '.', { owner: 'cur', holdCount: 'cur' });
        }
        fr(null, '', 'All threads share ONE Account object and therefore ONE monitor (intrinsic lock). Each will call <b>deposit(10)</b>. Expected final balance = ' + (names.length * 10) + '.');
        acquire(names[0], true);
        for (var i = 1; i < names.length; i++) {
          entry.push(names[i]); st[names[i]] = 'BLOCKED';
          fr(3, 'bad', '<b>' + names[i] + '</b> calls deposit(10) but ' + names[0] + ' owns the monitor, so ' + names[i] + ' is <b>BLOCKED</b> and joins the entry set. It uses no CPU while it waits.', { owner: 'cur' });
        }
        body(names[0], true);
        var k = 0;
        while (entry.length) {
          var next = k % 2 === 0 ? entry.pop() : entry.shift();   // arbitrary order: synchronized is not FIFO
          acquire(next, false);
          body(next, false);
          k++;
        }
        frames.push({ narr: '<span class="c-g">Final balance = ' + balance + ' = ' + names.length + ' × 10.</span> No update was lost because every read-modify-write happened while holding the same lock.', parts: [
          { type: 'vars', label: 'Result', vals: { balance: balance, expected: names.length * 10 }, hl: { balance: 'ok' } },
          note('Three takeaways: (1) one lock object → one thread inside at a time; (2) reentrancy uses a hold count; (3) the order in which BLOCKED threads get the lock is unspecified — if you need FIFO fairness, use <code>new ReentrantLock(true)</code> (next module).', 'Lesson')
        ] });
        return frames;
      }
    }, {
      title: 'Puzzle: static field, instance lock → still racy',
      gen: function () {
        var code = ['class Counter {', '  static int total;              // ONE copy for all Counters', '  synchronized void inc() {      // locks THIS instance only', '    total++;', '  }', '}'].join('\n');
        function g(hl, ehl, tags) {
          return { type: 'graph', label: 'Who holds which lock', directed: true, height: 52,
            nodes: [{ id: 'T1', x: 10, y: 12 }, { id: 'T2', x: 10, y: 40 }, { id: 'c1', label: 'monitor of c1', x: 42, y: 12, shape: 'box' }, { id: 'c2', label: 'monitor of c2', x: 42, y: 40, shape: 'box' }, { id: 'cls', label: 'Counter.class monitor', x: 42, y: 26, shape: 'box' }, { id: 'tot', label: 'static total', x: 84, y: 26, shape: 'box' }],
            edges: [['T1', 'c1', 'owns'], ['T2', 'c2', 'owns'], ['c1', 'tot', 'total++'], ['c2', 'tot', 'total++'], ['T1', 'cls'], ['T2', 'cls']], hl: hl, ehl: ehl, tags: tags || {} };
        }
        return [
          { narr: 'Two threads, two different Counter objects: T1 calls <b>c1.inc()</b>, T2 calls <b>c2.inc()</b>. Both bump the <b>static</b> total. Is it safe?', parts: [{ type: 'code', lang: 'java', code: code, hl: { 2: 'cur', 3: 'cur' } }, g({}, {}, {}), { type: 'vars', vals: { total: 0 } }] },
          { narr: 'T1 enters c1.inc(): an instance synchronized method locks <b>this = c1</b>.', parts: [{ type: 'code', lang: 'java', code: code, hl: { 3: 'ok' } }, g({ c1: 'ok', T1: 'cur' }, { 'T1-c1': 'ok' }, { c1: 'owner T1' }), { type: 'vars', vals: { total: 0 } }] },
          { narr: 'T2 enters c2.inc(): it needs <b>c2\'s</b> monitor, which is free. <b>T2 is NOT blocked</b> — different lock!', parts: [{ type: 'code', lang: 'java', code: code, hl: { 3: 'ok' } }, g({ c1: 'ok', c2: 'ok', T1: 'cur', T2: 'cur' }, { 'T1-c1': 'ok', 'T2-c2': 'ok' }, { c1: 'owner T1', c2: 'owner T2' }), { type: 'vars', vals: { total: 0 } }] },
          { narr: 'Both run <b>total++</b> at the same time on the one shared static field → the lost-update race from topic 2 is back. Both store 1.', parts: [{ type: 'code', lang: 'java', code: code, hl: { 4: 'bad' } }, g({ tot: 'bad' }, { 'c1-tot': 'bad', 'c2-tot': 'bad' }, { tot: 'lost update' }), { type: 'vars', vals: { total: 1, expected: 2 }, hl: { total: 'bad' } }] },
          { narr: 'Fix: guard static state with a static lock — ' + C('static synchronized void inc()') + ' or ' + C('synchronized (Counter.class)') + '. Now both threads need the <b>same</b> Counter.class monitor and run one at a time.', parts: [{ type: 'code', lang: 'java', code: code.replace('  synchronized void inc() {      // locks THIS instance only', '  static synchronized void inc() { // locks Counter.class'), hl: { 3: 'ok' } }, g({ cls: 'ok', T1: 'cur', T2: 'bad' }, { 'T1-cls': 'ok', 'T2-cls': 'bad' }, { cls: 'owner T1', T2: 'BLOCKED' }), { type: 'vars', vals: { total: 2, expected: 2 }, hl: { total: 'ok' } }] }
        ];
      }
    }],
    examples: [
      { title: 'Locking on a boxed Integer — a lock that keeps changing', html: `<p>${C('Integer count')} is immutable; ${C('count++')} creates a <b>new</b> Integer object and assigns it. Thread A locks the old object, thread B locks the new one — both are "inside" at once. Static analysers flag this ("synchronization on a boxed primitive"); since JDK 16 javac also warns with ${C('-Xlint:synchronization')} for value-based classes. Always lock on a <b>final</b> field that is never reassigned.</p>`, code: `
class BadLock {
    private Integer count = 0;
    void inc() {
        synchronized (count) {   // BUG: count is replaced on every increment
            count++;             // new Integer → next thread locks a different object
        }
    }
}
class GoodLock {
    private final Object lock = new Object();
    private int count;
    void inc() { synchronized (lock) { count++; } }
}` },
      { title: 'What can this print? Exception inside synchronized', html: `<p>T1 throws inside the synchronized block. Because the monitor is released on <b>any</b> exit, T2 still gets in. Output (order fixed by join): ${C('T1 failed')} then ${C('T2 got the lock')}. The danger is different: T1 may leave the <b>data</b> half-updated, and the next thread will see it. Keep invariants intact before any statement that can throw.</p>`, code: `
Object lock = new Object();
Thread t1 = new Thread(() -> {
    try {
        synchronized (lock) { throw new IllegalStateException("boom"); }
    } catch (IllegalStateException e) { System.out.println("T1 failed"); }
});
Thread t2 = new Thread(() -> { synchronized (lock) { System.out.println("T2 got the lock"); } });
t1.start(); t1.join();
t2.start(); t2.join();` },
      { title: 'Synchronized getter matters', html: `<p>If ${C('setBalance')} is synchronized but ${C('getBalance')} is not, a reader thread has <b>no happens-before</b> relation with the writer, so it may see a stale value forever (a cached copy) — and for a ${C('long')}/${C('double')} field it may even see a "torn" value made of half the old and half the new bits (JLS 17.7). Rule: <b>same lock for every access</b>.</p>` },
      { title: 'Shrinking a critical section', html: `<p>Holding a lock while doing slow work (I/O, network, JSON parsing) makes every other thread wait. Copy what you need under the lock, then do the slow part outside.</p>`, code: `
class Reporter {
    private final Object lock = new Object();
    private final List<String> events = new ArrayList<>();   // guarded by lock
    void record(String e) { synchronized (lock) { events.add(e); } }
    void flush() {
        List<String> batch;
        synchronized (lock) {                 // short: just swap the data out
            batch = new ArrayList<>(events);
            events.clear();
        }
        for (String e : batch) System.out.println("sending " + e);   // slow part, no lock held
    }
}` }
    ],
    deepDive: `<p><b>🟣 How the JVM implements monitors.</b> Every object header has a <b>mark word</b>. HotSpot uses a tiered scheme: an uncontended lock is a cheap <b>thin/lightweight lock</b> (a CAS on the mark word, a few nanoseconds); under contention it <b>inflates</b> to a full ${C('ObjectMonitor')} with an owner, recursion count, an <b>entry list</b> (BLOCKED threads) and a <b>wait set</b> (threads in ${C('wait()')}). <b>Biased locking</b> was deprecated in JDK 15 and removed in JDK 18 — modern CPUs made plain CAS cheap enough. Newer JDKs (opt-in in 21, default since 23) use a new "lightweight locking" scheme that no longer displaces the header, preparing for compact object headers.</p>
<p><b>Bytecode.</b> A synchronized <b>block</b> compiles to ${C('monitorenter')} / ${C('monitorexit')}, plus an exception-table entry that runs a second ${C('monitorexit')} on any throw — that is how release-on-exception is guaranteed. A synchronized <b>method</b> just has the ${C('ACC_SYNCHRONIZED')} flag; the JVM locks on entry and unlocks on any exit.</p>
<p><b>JIT optimisations.</b> <b>Lock elision</b>: if escape analysis proves the lock object never leaves the thread (e.g. a local ${C('StringBuffer')}), the lock is removed entirely. <b>Lock coarsening</b>: adjacent blocks on the same lock are merged to avoid repeated enter/exit. That is why micro-benchmarks of "synchronized cost" are so misleading — use JMH.</p>
<p><b>Fairness &amp; performance.</b> Intrinsic locks allow <b>barging</b>: a newly arriving thread can grab a just-released lock before a long-waiting one, which maximises throughput but permits starvation. The cost that actually hurts is <b>contention</b> (context switches, cache-line ping-pong), not the uncontended lock itself — so reduce lock hold time, split one lock into several (lock <b>striping</b>, as old ${C('ConcurrentHashMap')} did with 16 segments), or use immutable/thread-confined data. <b>Virtual threads (Java 21):</b> a virtual thread blocking inside ${C('synchronized')} used to <b>pin</b> its carrier thread; JDK 24 (JEP 491) removed that limitation, but on Java 21 prefer ${C('ReentrantLock')} around blocking I/O in virtual-thread code.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> AI writes correct-looking synchronized classes quickly and is decent at adding ${C('@GuardedBy("lock")')} annotations and explaining which monitor a method uses. <b>Use AI as a partner:</b> <code>For each field in this class, tell me which lock guards it on every read and write path, and flag any access that holds no lock or a different lock.</code> That turns AI into a fast lock-discipline auditor.</p>
<p><b>Where AI goes wrong:</b> mixing static and instance locks for the same data, synchronizing the setter but not the getter, locking on ${C('this')} in a public class, holding a lock across a network call, and "fixing" contention by removing synchronization from reads. It also over-synchronizes everything, which hides design problems and can create deadlocks. <b>What you must still own:</b> deciding the <b>guarding policy</b> (which lock protects which invariant), keeping critical sections small, and knowing when synchronized is the wrong tool (need timeouts, fairness, or try-lock → ${C('ReentrantLock')}).</p>`,
    problems: [{
      title: 'Thread-Safe Running Statistics (One Lock, Many Fields)',
      level: 'Medium', tags: ['synchronized', 'invariants', 'consistent snapshot'], companies: ['Google', 'Uber', 'Atlassian'],
      statement: `<p>Build ${C('RunningStats')} with ${C('add(int x)')} and ${C('long[] snapshot()')} returning ${C('{count, sum, min, max}')}, plus ${C('double mean()')}. Many threads call ${C('add')} while monitoring threads call ${C('snapshot')}. Every snapshot must be <b>consistent</b>: it must reflect exactly some prefix of completed ${C('add')} calls (never a count from one moment and a sum from another).</p>`,
      constraints: `Up to 32 writer threads, 10<sup>7</sup> adds total. Empty stats: count = 0, mean = 0.0, min = Integer.MAX_VALUE, max = Integer.MIN_VALUE.`,
      example: `<p>Thread A adds 1..1000, thread B adds −1..−1000. Final snapshot: ${H.c('g', '[2000, 0, -1000, 1000]')}, mean 0.0. A snapshot taken mid-way could be [3, 2, -1, 2] (A added 1 and 2, B added −1) — but never count = 3 paired with the sum of only 2 adds.</p>`,
      brute: {
        why: `<p>Making each field ${C('volatile')} gives visibility, but ${C('count++')} and ${C('sum += x')} are still non-atomic (lost updates), and there is no way to read all four fields as one unit — ${C('mean()')} can divide a new sum by an old count. Using four separate ${C('AtomicLong')}s fixes lost updates but <b>still</b> not the consistency of the snapshot.</p>`,
        code: `
class BrokenStats {
    private volatile long count, sum;        // visible, but not updated together
    void add(int x) {
        count++;                             // still a read-modify-write race
        sum += x;                            // a reader can run between these two lines
    }
    double mean() {
        return count == 0 ? 0 : (double) sum / count;   // may mix old sum with new count
    }
}`
      },
      mcq: { q: 'Why is one lock for all four fields better than four AtomicLongs here?', options: ['AtomicLong is slower than synchronized in every case', 'The fields form one invariant; only a single lock can update and read them together atomically', 'AtomicLong does not provide visibility', 'There is no difference'], answer: 1, explain: 'Atomics make each field individually atomic, but a snapshot of several fields needs them to change and be read as a unit — that requires one lock (or one immutable object swapped atomically).' },
      hints: [
        `<p>Hint 1: the four fields together form <b>one</b> piece of state. Ask: "which fields must change together?" → all of them → one lock.</p>`,
        `<p>Hint 2: use a ${C('private final Object lock')}; ${C('add')} updates all four fields inside ${C('synchronized (lock)')}; ${C('snapshot')} copies all four inside the same lock.</p>`,
        `<p>Hint 3: compute derived values (mean) from the <b>copied snapshot</b>, outside the lock, to keep the critical section tiny. Use long for sum (int would overflow at 10<sup>7</sup> adds of 10<sup>9</sup>).</p>`
      ],
      solution: {
        approach: `<p><b>One guard per invariant.</b> All mutable fields are guarded by one private lock. Writers update them together; readers copy them together. Because both sides use the same monitor, the snapshot is atomic (no half-applied add) and visible (unlock → lock happens-before). Derived values are computed from the copy, so the lock is held for only a few nanoseconds.</p>`,
        code: `
class RunningStats {
    private final Object lock = new Object();   // private: outsiders cannot grab it
    private long count, sum;                     // all guarded by lock
    private int min = Integer.MAX_VALUE, max = Integer.MIN_VALUE;

    void add(int x) {
        synchronized (lock) {                    // all four fields change as ONE step
            count++;
            sum += x;
            if (x < min) min = x;
            if (x > max) max = x;
        }
    }

    /** {count, sum, min, max} — one consistent snapshot. */
    long[] snapshot() {
        synchronized (lock) {                    // same lock → consistent + visible
            return new long[]{count, sum, min, max};
        }
    }

    double mean() {
        long[] s = snapshot();                   // compute outside the lock
        return s[0] == 0 ? 0.0 : (double) s[1] / s[0];
    }

    public static void main(String[] args) throws InterruptedException {
        RunningStats st = new RunningStats();
        Thread a = new Thread(() -> { for (int i = 1; i <= 1000; i++) st.add(i); });
        Thread b = new Thread(() -> { for (int i = 1; i <= 1000; i++) st.add(-i); });
        a.start(); b.start(); a.join(); b.join();
        System.out.println(Arrays.toString(st.snapshot()) + " mean=" + st.mean()); // [2000, 0, -1000, 1000] mean=0.0
    }
}`,
        dry: { head: ['call', 'thread', 'count', 'sum', 'min', 'max'], rows: [
          ['add(5)', 'A', '1', '5', '5', '5'],
          ['add(-3)', 'B (waited BLOCKED)', '2', '2', '-3', '5'],
          ['snapshot()', 'monitor', '2', '2', '-3', '5'],
          ['mean()', 'monitor', '—', '—', '—', '<span class="c-g">2 / 2 = 1.0</span>']
        ] },
        complexity: `<p>O(1) per add and per snapshot. All writers serialize on one lock; at very high rates use per-thread accumulators merged on read (the idea behind ${C('LongAdder')}) — but then snapshots are no longer exactly consistent, a trade-off worth naming.</p>`,
        followUps: ['How would you add a variance (Welford) field?', 'Make reads lock-free by publishing an immutable Stats record through a volatile field.', 'How does LongAdder trade consistency for throughput?']
      }
    }]
  });
registerModule({ id: 'java11', title: 'Concurrency I', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
