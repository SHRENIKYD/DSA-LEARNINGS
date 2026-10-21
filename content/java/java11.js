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
      tests: { sig: 'int[] int -> int', fn: 'parallelMax', cases: [
          [[[3, 9, -2, 7, 11, 4, 8], 3], 11],
          [[[-5], 8], -5],
          [[[-3, -9, -1, -7], 2], -1],
          [[[4, 2, 6], 1], 6],
          [[[1, 2, 3, 4, 5], 5], 5],
          [[[5, 4, 3, 2, 1], 64], 5],
          [[[7, 7, 7, 7], 3], 7],
          [[[-2147483648, -2147483648], 2], -2147483648],
          [[[1, 2, 3, 4, 5], 4], 5],
          [[{ $range: [0, 10000000] }, 64], 9999999],
          [[{ $range: [10000000, 0, -1] }, 7], 10000000]
        ] },
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
      tests: { sig: 'int int int int -> int[]', fn: 'chk', harness: { java: `
class Check {
  static int[] chk(int seats, int threads, int attempts, int n) throws Exception {
    TicketCounter c = new TicketCounter(seats);
    Thread[] ts = new Thread[threads];
    for (int i = 0; i < threads; i++) { ts[i] = new Thread(() -> { for (int k = 0; k < attempts; k++) c.tryBook(n); }); ts[i].start(); }
    for (Thread t : ts) t.join();
    return new int[]{ c.sold(), c.available() };
  }
}` }, cases: [
          [[100, 8, 50, 1], [100, 0]],
          [[100, 8, 50, 3], [99, 1]],
          [[10, 4, 1, 1], [4, 6]],
          [[5, 2, 10, 0], [0, 5]],
          [[5, 2, 10, -1], [0, 5]],
          [[10, 4, 5, 11], [0, 10]],
          [[10, 4, 5, 10], [10, 0]],
          [[1, 1, 1, 1], [1, 0]],
          [[1000000000, 64, 15000, 1000], [960000000, 40000000]]
        ] },
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
      tests: { sig: 'string int int -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String kind, int writers, int n) throws Exception {
    RunningStats st = new RunningStats();
    AtomicBoolean done = new AtomicBoolean(), bad = new AtomicBoolean();
    boolean ones = kind.equals("ones");
    Thread mon = new Thread(() -> {
      while (!done.get()) {
        long[] s = st.snapshot();
        if (s[0] == 0 ? (s[1] != 0 || s[2] != Integer.MAX_VALUE || s[3] != Integer.MIN_VALUE) : s[2] > s[3]) bad.set(true);
        if (ones && s[0] != s[1]) bad.set(true);
      }
    });
    mon.start();
    Thread[] ts = new Thread[writers];
    for (int w = 0; w < writers; w++) {
      final int id = w;
      ts[w] = new Thread(() -> { for (int i = 1; i <= n; i++) st.add(ones ? 1 : (id % 2 == 0 ? i : -i)); });
      ts[w].start();
    }
    for (Thread t : ts) t.join();
    done.set(true); mon.join();
    return new String[]{ bad.get() ? "torn" : "ok", Arrays.toString(st.snapshot()), String.valueOf(st.mean()) };
  }
}` }, cases: [
          [['pm', 2, 1000], ['ok', '[2000, 0, -1000, 1000]', '0.0']],
          [['ones', 8, 10000], ['ok', '[80000, 80000, 1, 1]', '1.0']],
          [['ones', 1, 1], ['ok', '[1, 1, 1, 1]', '1.0']],
          [['pm', 1, 5], ['ok', '[5, 15, 1, 5]', '3.0']],
          [['ones', 0, 0], ['ok', '[0, 0, 2147483647, -2147483648]', '0.0']],
          [['pm', 3, 3], ['ok', '[9, 6, -3, 3]', '0.6666666666666666']],
          [['pm', 32, 10000], ['ok', '[320000, 0, -10000, 10000]', '0.0']],
          [['ones', 16, 600000], ['ok', '[9600000, 9600000, 1, 1]', '1.0']]
        ] },
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

  /* ======================================================================
     TOPIC 4 — volatile: visibility vs atomicity
     ====================================================================== */
  function cpuGraph(hl, ehl, tags) {
    return {
      type: 'graph', label: 'Where the value of stop lives', directed: true, height: 62,
      nodes: [
        { id: 'C1', label: 'Core 1: main (writer)', x: 18, y: 8, shape: 'box' }, { id: 'C2', label: 'Core 2: worker (reader)', x: 82, y: 8, shape: 'box' },
        { id: 'B1', label: 'store buffer / L1', x: 18, y: 30, shape: 'box' }, { id: 'B2', label: 'register / L1', x: 82, y: 30, shape: 'box' },
        { id: 'M', label: 'main memory (L3 / RAM)', x: 50, y: 52, shape: 'box' }
      ],
      edges: [['C1', 'B1', 'write'], ['B1', 'M', 'flush'], ['M', 'B2', 'load'], ['B2', 'C2', 'read']],
      hl: hl || {}, ehl: ehl || {}, tags: tags || {}
    };
  }
  var VW = ['// main thread, ~1 second later', 'stop = true;'].join('\n');
  var VR = ['while (!stop) {', '    work++;', '}', 'System.out.println("stopped");'].join('\n');

  topics.push({
    title: 'volatile: Visibility vs Atomicity (and Why a Loop Can Spin Forever)',
    analogy: `<p>You and a colleague each keep a <b>photocopy</b> of the team schedule on your desk because walking to the notice board is slow. Your colleague updates the <b>board</b>: "Meeting cancelled". You keep reading your desk copy and walk into an empty room. That is a <b>visibility</b> bug: the update happened, you just never looked at the board again. Marking the schedule ${C('volatile')} is the rule <b>"always read the notice board, never your photocopy, and pin your changes to the board immediately"</b>. But note: it does not stop two people from scribbling on the board at the same time — that is <b>atomicity</b>, a different problem.</p>`,
    explain: `<p><b>🟢 Three separate problems</b> hide behind "thread safety". Keep them apart in your head:</p>
${H.table(['problem', 'question it answers', 'example bug'], [
  ['<b>Visibility</b>', 'Will another thread <b>see</b> my write — ever? when?', 'worker loops forever on a stop flag'],
  ['<b>Atomicity</b>', 'Can another thread see or interfere with a <b>half-done</b> compound action?', 'count++ loses updates'],
  ['<b>Ordering</b>', 'Can my writes appear to other threads in a <b>different order</b> than I wrote them?', 'reader sees ready = true but data = 0']
])}
<p><b>Why visibility breaks.</b> Each core has registers, store buffers and caches; the JIT compiler is also allowed to keep a field in a register. If nothing tells them that a variable is shared, a thread can keep using its private copy indefinitely. The JIT can even rewrite ${C('while (!stop) work++;')} into ${C('if (!stop) while (true) work++;')} — "hoisting" the read out of the loop, which is perfectly legal for a non-volatile field.</p>
<p><b>What ${C('volatile')} gives you:</b></p>
<ul>
<li>Every read goes to "the board" (fresh value), every write is published immediately — <b>visibility</b>.</li>
<li>The JIT/CPU cannot reorder normal reads/writes around a volatile access in harmful ways; a volatile write <b>publishes everything written before it</b> to any thread that later reads that volatile and sees the value — <b>ordering</b> (the happens-before rule, next topic).</li>
<li>Reads and writes of volatile ${C('long')}/${C('double')} are atomic (plain ones may tear into two 32-bit halves).</li>
</ul>
<p><b>What volatile does NOT give you:</b> atomic compound actions. ${C('volatile int count; count++;')} still loses updates — it is still LOAD, ADD, STORE.</p>
${H.table(['tool', 'visibility', 'atomic single read/write', 'atomic count++ / check-then-act', 'can block?'], [
  [C('volatile'), '<span class="c-g">yes</span>', '<span class="c-g">yes</span>', '<span class="c-r">no</span>', 'no'],
  [C('synchronized'), '<span class="c-g">yes</span>', '<span class="c-g">yes</span>', '<span class="c-g">yes</span>', 'yes'],
  [C('AtomicInteger') + ' (next module)', '<span class="c-g">yes</span>', '<span class="c-g">yes</span>', '<span class="c-g">single-variable ops only</span>', 'no (CAS)']
])}
<p><b>When volatile alone is enough</b> (memorise these three conditions): (1) writes do not depend on the current value, <b>or</b> only one thread ever writes; (2) the variable is not part of an invariant with other variables; (3) you do not need to hold a lock while reading it for another reason. Typical uses: <b>stop/shutdown flags</b>, <b>status</b> fields, a <b>"last updated at"</b> timestamp written by one thread, and <b>publishing a reference to an immutable object</b> (swap the whole config at once).</p>`,
    clues: [
      '"The worker thread <b>never stops</b> even though we set running = false" → missing volatile (visibility)',
      '"Works in debug mode / with a println, hangs in production" → JIT hoisting a non-volatile read',
      '"Is <b>volatile</b> enough to make count++ thread-safe?" → no: visibility ≠ atomicity',
      '"<b>One writer, many readers</b> of a flag / config / status" → volatile is the right tool',
      '"Reader sees a <b>half-updated</b> object" → publish an immutable object via one volatile reference',
      '"64-bit long read looks garbled on a 32-bit JVM" → word tearing; volatile long is atomic'
    ],
    code: [`
public class StopFlag {
    // Remove "volatile" and this program may spin forever on a server JVM,
    // because the JIT may hoist the read of 'running' out of the loop.
    private static volatile boolean running = true;

    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            long work = 0;
            while (running) {          // volatile read: re-checked on every iteration
                work++;
            }
            System.out.println("worker saw running=false after " + work + " iterations");
        });
        worker.start();
        Thread.sleep(100);
        running = false;               // volatile write: published immediately
        worker.join();
        System.out.println("main done");
    }
}`, `
// volatile is NOT atomicity: this still loses updates.
public class VolatileIsNotAtomic {
    private static volatile int count = 0;

    public static void main(String[] args) throws InterruptedException {
        Runnable job = () -> { for (int i = 0; i < 100_000; i++) count++; };  // LOAD, ADD, STORE
        Thread a = new Thread(job), b = new Thread(job);
        a.start(); b.start(); a.join(); b.join();
        System.out.println(count);     // often < 200000 on a multi-core machine; varies per run
    }
}`],
    codeTitle: ['volatile stop flag (the right use)', 'volatile count++ (the wrong use)'],
    viz: [{
      title: 'Plain vs volatile flag: where does the write go, and does the reader ever look?',
      input: 'plain',
      inputLabel: 'Type plain or volatile',
      gen: function (input) {
        var mode = clean(input).toLowerCase();
        if (mode !== 'plain' && mode !== 'volatile') throw new Error('Type exactly: plain  or  volatile');
        var decl = (mode === 'volatile' ? 'static volatile boolean stop = false;' : 'static boolean stop = false;   // plain field');
        var names = ['main thread (writer)', 'worker thread (reader)'];
        var base = function (s) { s.extra = [cpuGraph(s.g || {}, s.ge || {}, s.gt || {})].concat(s.more || []); return s; };
        var steps = [
          base({ v: { 'declaration': decl, 'stop in main memory': 'false' }, gt: { M: 'stop=false' }, narr: 'Field: <b>' + esc(decl) + '</b>. The worker spins in a loop until it sees stop == true. main will set it later.' }),
          base({ b: 1, v: { 'stop in main memory': 'false', 'worker copy': 'false' }, g: { B2: 'cur' }, ge: { 'M-B2': 'cur' }, gt: { M: 'stop=false', B2: 'stop=false' }, narr: 'The worker reads stop (false) — it now has a copy close to its core.' })
        ];
        if (mode === 'plain') {
          steps.push(base({ b: [1, 2], cb: 'bad', v: { 'stop in main memory': 'false', 'worker copy': 'false (in a register)' }, g: { C2: 'bad' }, gt: { M: 'stop=false', B2: 'stop=false' }, narr: 'After a few thousand iterations the JIT compiles the loop. Since <b>stop</b> is a plain field and nothing in the loop writes it or synchronizes, the JIT may legally assume it never changes and <b>hoist</b> the read out of the loop.', more: [{ type: 'code', label: 'What the JIT is allowed to turn the loop into', lang: 'java', code: 'if (!stop) {\n    while (true) { work++; }   // stop is never read again\n}', hl: { 2: 'bad' } }] }));
          steps.push(base({ a: 2, ca: 'ok', b: [1, 2], cb: 'bad', v: { 'stop in main memory': 'false', 'main copy': 'true (store buffer)', 'worker copy': 'false' }, g: { B1: 'ok' }, ge: { 'C1-B1': 'ok' }, gt: { B1: 'stop=true', M: 'stop=false', B2: 'stop=false' }, narr: 'main sets <b>stop = true</b>. The write lands in Core 1\'s store buffer / cache first. Hardware will push it out soon…' }));
          steps.push(base({ a: 2, ca: 'done', b: [1, 2], cb: 'bad', v: { 'stop in main memory': 'true', 'worker copy': 'false (never re-read)' }, hv: { 'worker copy': 'bad' }, g: { M: 'ok', C2: 'bad' }, ge: { 'B1-M': 'ok' }, gt: { M: 'stop=true', B2: 'stop=false' }, narr: '…and cache coherence eventually makes memory say true. <b>But the compiled loop never reads stop again.</b> The hardware is fine; the problem is the compiler had permission to not look.' }));
          steps.push(base({ a: 2, ca: 'done', b: [1, 2], cb: 'bad', v: { result: 'worker may spin FOREVER' }, hv: { result: 'bad' }, g: { C2: 'bad' }, gt: { M: 'stop=true', B2: 'stop=false', C2: 'spinning' }, narr: '<span class="c-r">Possible outcome: the program never ends.</span> It is not guaranteed to hang either — that is what makes it nasty: it may work in your IDE (interpreted) and hang in production (JIT-compiled). Try the input <b>volatile</b>.' }));
        } else {
          steps.push(base({ b: [1, 2], cb: 'ok', v: { 'stop in main memory': 'false', 'worker copy': 're-read every iteration' }, g: { B2: 'cur' }, ge: { 'M-B2': 'cur' }, gt: { M: 'stop=false' }, narr: 'Because stop is <b>volatile</b>, the JIT must perform a real read on every iteration. Hoisting is forbidden. (On x86 a volatile read is just a normal load that cannot be cached in a register — almost free.)' }));
          steps.push(base({ a: 2, ca: 'ok', b: [1, 2], v: { 'stop in main memory': 'true', 'worker copy': 'false (old)' }, hv: { 'stop in main memory': 'ok' }, g: { M: 'ok', B1: 'ok' }, ge: { 'C1-B1': 'ok', 'B1-M': 'ok' }, gt: { M: 'stop=true' }, narr: 'main writes <b>stop = true</b>. A volatile write is followed by a memory fence (on x86 a <code>lock</code>-prefixed instruction) that drains the store buffer, so the value becomes globally visible right away.' }));
          steps.push(base({ a: 2, ca: 'done', b: 1, cb: 'ok', v: { 'stop in main memory': 'true', 'worker copy': 'true' }, hv: { 'worker copy': 'ok' }, g: { B2: 'ok', C2: 'ok' }, ge: { 'M-B2': 'ok', 'B2-C2': 'ok' }, gt: { M: 'stop=true', B2: 'stop=true' }, narr: 'On its next iteration the worker reads stop again and sees <b>true</b>. The loop condition fails.' }));
          steps.push(base({ a: 2, ca: 'done', b: 4, cb: 'ok', v: { result: 'worker stops promptly' }, hv: { result: 'ok' }, gt: { M: 'stop=true', C2: 'exited' }, out: 'stopped', narr: '<span class="c-g">Guaranteed: the worker stops.</span> Bonus guarantee: anything main wrote <b>before</b> the volatile write is also visible to the worker after it reads true. That is the happens-before rule you will meet next.' }));
        }
        return twoThreads(VW, VR, steps, names);
      }
    }, {
      title: 'volatile does not make count++ atomic',
      gen: function () {
        var A = ['// volatile int count;', 'int r = count;     // volatile LOAD (fresh)', 'r = r + 1;', 'count = r;         // volatile STORE (published)'].join('\n');
        return twoThreads(A, A, [
          { v: { count: 5 }, narr: '<b>volatile int count = 5</b>. Both threads call count++. Volatile guarantees each LOAD sees the latest value and each STORE is published at once.' },
          { a: 2, v: { count: 5, 'A.r': 5 }, narr: 'A does a volatile LOAD: r = 5 (fresh — volatile did its job).' },
          { a: 2, ca: 'done', b: 2, v: { count: 5, 'A.r': 5, 'B.r': 5 }, narr: 'B does a volatile LOAD: also 5. Also fresh! A has not stored yet, so 5 really is the latest value.' },
          { a: [3, 4], ca: 'ok', b: 2, cb: 'done', v: { count: 6, 'A.r': 6, 'B.r': 5 }, hv: { count: 'ok' }, narr: 'A adds and stores 6. Published immediately to everyone…' },
          { a: 4, ca: 'done', b: [3, 4], cb: 'bad', v: { count: 6, 'A.r': 6, 'B.r': 6 }, hv: { count: 'bad' }, narr: '…but B already holds its old register value 5 → stores 6. <span class="c-r">One increment lost.</span> Volatile made every single read and write correct; it cannot make the <b>three-step sequence</b> indivisible. Use synchronized or AtomicInteger.' }
        ], ['Thread A: count++', 'Thread B: count++']);
      }
    }],
    examples: [
      { title: 'What can this print? Stop flag without volatile', html: `<p>Possible behaviours: prints "stopped" after ~1 s, <b>or never prints and never exits</b>. Both are allowed by the Java Memory Model. On HotSpot with the C2 compiler the hang is reproducible on most machines because of loop hoisting. Adding ${C('System.out.println(work)')} inside the loop usually "fixes" it — println synchronizes internally and calls code the JIT cannot see through, so it re-reads the field. That accidental fix is not a guarantee.</p>`, code: `
class MaybeForever {
    static boolean stop;                     // NOT volatile
    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(() -> { long w = 0; while (!stop) w++; System.out.println("stopped"); });
        t.setDaemon(true);                   // daemon so this demo can still exit if the loop never ends
        t.start();
        Thread.sleep(1000);
        stop = true;
        t.join(2000);                        // wait at most 2 s
        System.out.println(t.isAlive() ? "worker still spinning (visibility bug)" : "worker stopped");
    }
}` },
      { title: 'Independent observation: last heartbeat', html: `<p>One thread records "last time I heard from the server"; monitoring threads read it. Single writer, value does not depend on the old value, no invariant with other fields → <b>volatile is exactly right</b>, and cheaper than a lock. Note ${C('long')}: without volatile a 32-bit JVM could tear the 64-bit write.</p>`, code: `
class Heartbeat {
    private volatile long lastBeatNanos = System.nanoTime();   // single writer
    void onBeat() { lastBeatNanos = System.nanoTime(); }        // writer thread only
    boolean isAlive(long timeoutNanos) {                        // any thread
        return System.nanoTime() - lastBeatNanos < timeoutNanos;
    }
}` },
      { title: 'The "cheap read-write lock" pattern', html: `<p>Reads are far more common than writes? Make the field volatile for <b>lock-free reads</b>, and synchronize only the <b>writes</b> (because a write is a read-modify-write). Readers always see a fully updated value; writers never lose updates.</p>`, code: `
class CheapCounter {
    private volatile int value;                        // reads: just a volatile read
    public int get() { return value; }
    public synchronized int increment() { return ++value; }  // writes: under a lock
}` },
      { title: 'Volatile reference ≠ volatile contents', html: `<p>${C('volatile int[] arr')} makes the <b>reference</b> volatile. ${C('arr[3] = 7')} is a plain write to an element — not volatile, no visibility guarantee. Same for ${C('volatile List<...>')}: list.add() is not made safe. For volatile elements use ${C('AtomicIntegerArray')} or ${C('VarHandle')}; for collections use concurrent collections or publish an immutable copy.</p>` }
    ],
    deepDive: `<p><b>🟣 What volatile compiles to.</b> The JMM is specified abstractly, but HotSpot implements volatile with barriers: on x86 (TSO, which only allows store→load reordering) a volatile <b>read</b> is a plain ${C('mov')} that cannot be cached or reordered by the compiler, and a volatile <b>write</b> is a ${C('mov')} followed by a ${C('lock addl $0,(rsp)')} (a full StoreLoad fence, ~tens of cycles). On ARM64 (AWS Graviton, Apple Silicon) volatile uses ${C('ldar')} / ${C('stlr')} acquire/release instructions. So "volatile is free" is roughly true for reads and false for writes in a hot loop.</p>
<p><b>Word tearing.</b> JLS 17.7: writes to non-volatile ${C('long')} and ${C('double')} may be split into two 32-bit writes, so a racing reader might see the high half of the new value and the low half of the old one. All 64-bit HotSpot JVMs write them atomically in practice, but only ${C('volatile')} (or a lock) makes it a guarantee.</p>
<p><b>Finer control (Java 9+).</b> ${C('VarHandle')} exposes access modes weaker than volatile: <b>opaque</b> (no hoisting, eventually visible, no ordering), <b>acquire/release</b> (one-way ordering — enough for message passing and cheaper than full volatile on ARM), and volatile (sequentially consistent). Library authors use these; application code should stick to volatile, locks and ${C('java.util.concurrent')}.</p>
<p><b>False sharing.</b> Two unrelated volatile fields written by different threads but sitting on the same 64-byte cache line force the line to ping-pong between cores. JDK internals use ${C('@jdk.internal.vm.annotation.Contended')} padding (e.g. in ${C('LongAdder')} cells). It is a performance issue, not a correctness one — measure with JMH before padding anything.</p>
<p><b>Spin loops.</b> If you must busy-wait on a volatile, call ${C('Thread.onSpinWait()')} (Java 9) inside the loop — it emits a CPU hint (${C('PAUSE')} on x86) that saves power and helps the sibling hyper-thread. Prefer blocking (wait/notify, latches) for anything longer than microseconds.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> AI assistants know the "add volatile to the stop flag" fix and will usually get it right. They are also good at explaining JIT hoisting if you ask. <b>Use AI as a partner:</b> <code>For each shared field in this class, classify it as: needs visibility only, needs atomicity, or part of a multi-field invariant. Justify each.</code> That classification is exactly the reasoning interviewers want.</p>
<p><b>Where AI goes wrong:</b> it reaches for volatile as a universal "make it thread-safe" keyword — on counters, on collections (${C('volatile Map')}), on fields that are part of a two-field invariant. It may also claim volatile "flushes the whole cache" (folk wisdom — the real guarantee is happens-before). <b>What you must still own:</b> the three-problem split (visibility / atomicity / ordering) and the three conditions under which volatile alone is sufficient. If you cannot state them, you cannot review AI-written concurrent code.</p>`,
    problems: [{
      title: 'Hot-Reloadable Config (Publish an Immutable Snapshot)',
      level: 'Medium', tags: ['volatile', 'immutability', 'safe publication'], companies: ['Netflix', 'Microsoft', 'Razorpay'],
      statement: `<p>A service has many request threads reading its config (${C('host, port, timeoutMs')}) on every request, and one admin thread that occasionally reloads it. Design ${C('ConfigHolder')} with ${C('get()')}, ${C('reload(host, port, timeoutMs)')} and ${C('bumpTimeout(extraMs)')}. Readers must <b>never</b> see a mix of old and new values (e.g. new host with old port), must see a reload promptly, and reads must not take a lock.</p>`,
      constraints: `Reads: millions per second. Writes: rare. bumpTimeout may be called by several admin threads concurrently and must not lose updates.`,
      example: `<p>Config is (localhost, 8080, 1000). Admin calls ${C('reload("db.internal", 5432, 2000)')}. A reader then calls ${C('get()')} and must see either the whole old config or the whole new one — ${H.c('r', 'never ("db.internal", 8080, ...)')}.</p>`,
      brute: {
        why: `<p>A mutable ${C('Config')} object whose three fields are set one after another: a reader can run between the setters and see a half-updated config. Without volatile/locks the reader may also never see the update. Putting ${C('synchronized')} on every getter would fix it but makes millions of reads contend on one lock.</p>`,
        code: `
class MutableConfigHolder {
    private String host = "localhost";   // plain fields, updated one by one
    private int port = 8080;
    private int timeoutMs = 1000;
    void reload(String h, int p, int t) {
        host = h;                         // a reader here sees NEW host + OLD port
        port = p;
        timeoutMs = t;
    }
    String host() { return host; }
    int port() { return port; }
}`
      },
      mcq: { q: 'Readers do <code>Config c = holder.get();</code> then read <code>c.host()</code> and <code>c.port()</code>. Why can they never see a mixed config?', options: ['Because the reader reads the volatile field only once and Config is immutable, so c is one fully-built snapshot', 'Because volatile makes all fields of Config volatile', 'Because records are synchronized', 'They can; you still need a lock'], answer: 0, explain: 'One volatile read returns one reference. The object it points to was fully constructed before the volatile write published it (happens-before), and it can never change afterwards — so all of its fields belong to the same version.' },
      hints: [
        `<p>Hint 1: instead of changing three fields, build a <b>new immutable object</b> holding all three and swap <b>one reference</b>.</p>`,
        `<p>Hint 2: a ${C('record Config(String host, int port, int timeoutMs)')} plus ${C('private volatile Config current')}. Reads = one volatile read, no lock.</p>`,
        `<p>Hint 3: ${C('bumpTimeout')} reads the current config and writes a new one — a read-modify-write — so writers must be mutually exclusive: make the writer methods ${C('synchronized')} (or use ${C('AtomicReference.updateAndGet')}).</p>`
      ],
      tests: { sig: 'string[] -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String[] ops) throws Exception {
    ConfigHolder h = new ConfigHolder();
    List<String> out = new ArrayList<>();
    for (String op : ops) {
      String[] p = op.split(":");
      switch (p[0]) {
        case "get": out.add(h.get().toString()); break;
        case "reload": h.reload(p[1], Integer.parseInt(p[2]), Integer.parseInt(p[3])); break;
        case "bump": h.bumpTimeout(Integer.parseInt(p[1])); break;
        case "par": {
          int T = Integer.parseInt(p[1]), N = Integer.parseInt(p[2]);
          Thread[] ts = new Thread[T];
          for (int i = 0; i < T; i++) { ts[i] = new Thread(() -> { for (int k = 0; k < N; k++) h.bumpTimeout(1); }); ts[i].start(); }
          for (Thread t : ts) t.join();
          break;
        }
        case "tear": {
          int N = Integer.parseInt(p[1]);
          AtomicBoolean done = new AtomicBoolean(), torn = new AtomicBoolean();
          Thread[] readers = new Thread[4];
          for (int i = 0; i < readers.length; i++) {
            readers[i] = new Thread(() -> {
              while (!done.get()) {
                ConfigHolder.Config c = h.get();
                boolean a = c.host().equals("a") && c.port() == 1 && c.timeoutMs() == 10;
                boolean b = c.host().equals("b") && c.port() == 2 && c.timeoutMs() == 20;
                boolean init = c.host().equals("localhost") && c.port() == 8080 && c.timeoutMs() == 1000;
                if (!a && !b && !init) torn.set(true);
              }
            });
            readers[i].start();
          }
          for (int k = 0; k < N; k++) { if (k % 2 == 0) h.reload("a", 1, 10); else h.reload("b", 2, 20); }
          done.set(true);
          for (Thread t : readers) t.join();
          out.add(torn.get() ? "torn" : "ok");
          break;
        }
      }
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
          [[['get']], ['Config[host=localhost, port=8080, timeoutMs=1000]']],
          [[['reload:db.internal:5432:2000', 'get', 'bump:500', 'get']], ['Config[host=db.internal, port=5432, timeoutMs=2000]', 'Config[host=db.internal, port=5432, timeoutMs=2500]']],
          [[['bump:0', 'bump:-1000', 'get']], ['Config[host=localhost, port=8080, timeoutMs=0]']],
          [[['par:4:1', 'get']], ['Config[host=localhost, port=8080, timeoutMs=1004]']],
          [[['par:8:50000', 'get']], ['Config[host=localhost, port=8080, timeoutMs=401000]']],
          [[['reload:x:1:1', 'par:16:10000', 'reload:y:2:2', 'bump:5', 'get']], ['Config[host=y, port=2, timeoutMs=7]']],
          [[['tear:200000']], ['ok']],
          [[['reload:h:0:0', 'get', 'reload:h2:65535:2147483647', 'get']], ['Config[host=h, port=0, timeoutMs=0]', 'Config[host=h2, port=65535, timeoutMs=2147483647]']]
        ] },
      solution: {
        approach: `<p><b>Copy-on-write with a volatile reference.</b> The config is an immutable record. Writers build a complete new record and publish it with a single volatile write; readers do a single volatile read and then use that snapshot. Immutability gives consistency, volatile gives visibility and safe publication. Writers are synchronized among themselves because "read current, write modified" is a read-modify-write. This is the same idea as ${C('CopyOnWriteArrayList')} and many config libraries.</p>`,
        code: `
class ConfigHolder {
    // Immutable snapshot: all fields final, can never be seen half-built once published
    record Config(String host, int port, int timeoutMs) {}

    private volatile Config current = new Config("localhost", 8080, 1000);

    Config get() { return current; }                    // one volatile read, no lock

    synchronized void reload(String host, int port, int timeoutMs) {
        current = new Config(host, port, timeoutMs);    // build fully, then publish with ONE volatile write
    }

    synchronized void bumpTimeout(int extraMs) {        // read-modify-write → writers must be exclusive
        Config c = current;
        current = new Config(c.host(), c.port(), c.timeoutMs() + extraMs);
    }

    public static void main(String[] args) throws InterruptedException {
        ConfigHolder h = new ConfigHolder();
        Thread reader = new Thread(() -> {
            Config seen = h.get();
            while (seen.port() == 8080) {               // volatile read each time → sees the reload
                Thread.onSpinWait();
                seen = h.get();
            }
            System.out.println("reader saw " + seen);   // Config[host=db.internal, port=5432, timeoutMs=2000]
        });
        reader.start();
        Thread.sleep(20);
        h.reload("db.internal", 5432, 2000);
        reader.join();
        h.bumpTimeout(500);
        System.out.println(h.get().timeoutMs());        // 2500
    }
}`,
        dry: { head: ['time', 'admin thread', 'current (volatile)', 'reader does', 'reader sees'], rows: [
          ['t0', '—', 'Config(localhost, 8080, 1000)', 'c = get()', 'whole old config'],
          ['t1', 'builds new Config(db.internal, 5432, 2000) privately', 'still old', 'c = get()', 'whole old config'],
          ['t2', 'current = new config (volatile write)', 'new', '—', '—'],
          ['t3', '—', 'new', 'c = get()', '<span class="c-g">whole new config</span>'],
          ['t4', 'bumpTimeout(500) under lock', 'Config(db.internal, 5432, 2500)', 'c = get()', 'whole newest config']
        ] },
        complexity: `<p>Reads O(1), lock-free (one volatile load). Writes O(size of config) to copy, serialized by a lock — fine because writes are rare. Memory: old snapshots are garbage-collected once no reader holds them.</p>`,
        followUps: ['Replace the synchronized writers with AtomicReference.updateAndGet — what changes?', 'A reader reads get() twice in one request and gets two different versions. How do you prevent that?', 'How would you notify listeners on every reload without holding the lock during callbacks?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — The Java Memory Model & happens-before
     ====================================================================== */
  var LITMUS = {
    SB: {
      name: 'Store Buffering (Dekker)', init: { x: 0, y: 0 },
      t1: [['w', 'x', 1], ['r', 'y', 'r1']], t2: [['w', 'y', 1], ['r', 'x', 'r2']],
      why: 'Each core puts its write into its private <b>store buffer</b> and immediately reads the other variable from memory, where the other core\'s write has not arrived yet. Even x86 does this (it is the one reordering x86 allows: a later load passing an earlier store). The JIT may also simply swap the two independent statements.',
      fix: 'Make <b>x and y volatile</b>. All volatile accesses form one total order consistent with each thread\'s program order, so whichever write comes first in that order is seen by the other thread\'s later read — (0, 0) becomes impossible.'
    },
    MP: {
      name: 'Message Passing (data + ready flag)', init: { data: 0, ready: 0 },
      t1: [['w', 'data', 42], ['w', 'ready', 1]], t2: [['r', 'ready', 'r1'], ['r', 'data', 'r2']],
      why: 'Without volatile, the JIT or an ARM/POWER CPU may make <b>ready = 1</b> visible before <b>data = 42</b> (two independent stores), or the reader may read data before ready. The reader then sees the flag but stale data.',
      fix: 'Make <b>ready volatile</b> (data can stay plain). The volatile write of ready publishes every earlier write of T1; a volatile read that sees ready == 1 is guaranteed to see data == 42. (r1, r2) = (1, 0) becomes impossible.'
    }
  };
  function opText(op) { return op[0] === 'w' ? op[1] + ' = ' + op[2] + ';' : op[2] + ' = ' + op[1] + ';'; }
  function runLitmus(L, order, p1, p2) {
    var mem = {}, regs = {}, ia = 0, ib = 0, trace = [];
    Object.keys(L.init).forEach(function (k) { mem[k] = L.init[k]; });
    for (var i = 0; i < order.length; i++) {
      var who = order[i], op = who === 'A' ? p1[ia++] : p2[ib++];
      if (op[0] === 'w') mem[op[1]] = op[2]; else regs[op[2]] = mem[op[1]];
      trace.push([String(i + 1), who === 'A' ? 'T1' : 'T2', opText(op) + (op[0] === 'r' ? '  → ' + regs[op[2]] : ''), Object.keys(mem).map(function (k) { return k + '=' + mem[k]; }).join(', ')]);
    }
    return { key: '(r1, r2) = (' + regs.r1 + ', ' + regs.r2 + ')', trace: trace };
  }

  topics.push({
    title: 'The Java Memory Model: Reordering & the happens-before Rules',
    analogy: `<p>Think of two friends texting from places with bad signal. You send "I bought the tickets" and then "meet at gate 3". Your friend might receive them <b>in the other order</b>, or get the second one first and the first one an hour later. Each phone keeps its own messages in order, but nobody promised the <b>other</b> person sees them in that order. The Java Memory Model is the contract that says exactly <b>which messages are guaranteed to arrive, and in what order</b>: if you send them through certain "registered post" channels (a lock, a volatile, start/join), the order and delivery are guaranteed. Those channels are the <b>happens-before</b> rules.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> To run fast, the compiler, the JIT and the CPU all <b>reorder and cache</b> memory operations. Inside one thread you can never tell (the "as-if-serial" rule: your own thread always sees its own program order). But <b>another</b> thread may observe your writes late, or in a different order. The <b>Java Memory Model (JMM)</b>, rewritten in Java 5 (JSR-133), defines when one thread is <b>guaranteed</b> to see another's writes. The central idea is the <b>happens-before</b> (HB) relation:</p>
<blockquote>If action A <b>happens-before</b> action B, then everything A wrote is visible to B, and A appears to B as having happened earlier. If two conflicting accesses (one is a write) are <b>not</b> ordered by HB, you have a <b>data race</b> and almost anything (within the rules) can be observed.</blockquote>
<p><b>The rules to memorise</b> (each creates an HB edge):</p>
${H.table(['#', 'rule', 'edge'], [
  ['1', '<b>Program order</b>', 'each action in a thread HB every later action in that same thread'],
  ['2', '<b>Monitor lock</b>', 'an <b>unlock</b> of monitor M HB every later <b>lock</b> of M'],
  ['3', '<b>Volatile</b>', 'a <b>write</b> to volatile v HB every later <b>read</b> of v (that sees it)'],
  ['4', '<b>Thread start</b>', C('t.start()') + ' HB every action inside t'],
  ['5', '<b>Thread termination</b>', 'every action in t HB another thread returning from ' + C('t.join()') + ' (or seeing ' + C('isAlive() == false') + ')'],
  ['6', '<b>Interruption</b>', C('t.interrupt()') + ' HB t detecting the interrupt'],
  ['7', '<b>Transitivity</b>', 'A HB B and B HB C ⇒ A HB C'],
  ['+', '<b>final fields</b>', 'after a constructor finishes, other threads see correctly-initialized final fields (if ' + C('this') + ' did not escape)']
])}
<p><b>Transitivity is the superpower.</b> Writes to <i>plain</i> fields become visible if they are "carried" by a later HB edge: T1 writes ${C('data = 42')} (plain) and then ${C('ready = true')} (volatile); T2 reads ${C('ready')} and sees true, then reads ${C('data')}. Chain: data-write → (program order) → ready-write → (volatile rule) → ready-read → (program order) → data-read. So T2 must see 42.</p>
<p><b>Safe publication</b> = making a newly built object visible to other threads together with its contents. The standard ways: initialise it in a <b>static initializer</b>; store it into a <b>volatile</b> field or ${C('AtomicReference')}; store it into a <b>final</b> field of a properly constructed object; store it into a field guarded by a <b>lock</b>; or put it into a <b>concurrent collection</b> (${C('ConcurrentHashMap')}, ${C('BlockingQueue')}). Everything else is a data race.</p>
<p><b>Important:</b> happens-before is about <b>visibility guarantees</b>, not wall-clock time. "A happened earlier in real time" does <b>not</b> imply A happens-before B.</p>`,
    clues: [
      '"Explain the <b>Java Memory Model</b> / <b>happens-before</b>" → list the rules + transitivity + an example',
      '"<b>Double-checked locking</b> — is it broken? how to fix?" → needs volatile (or holder idiom)',
      '"Can this print <b>(0, 0)</b>?" → yes for plain fields (reordering / store buffers); no if all volatile',
      '"Reader sees the <b>flag set but stale data</b>" → missing HB edge; make the flag volatile',
      '"Works on my <b>x86</b> laptop, fails on <b>ARM</b> servers" → weaker hardware memory model exposes a data race',
      '"Object seen with <b>default values</b> in some fields" → unsafe publication / this-escape in constructor'
    ],
    code: [`
public class MessagePassing {
    static int data = 0;                       // plain field
    static volatile boolean ready = false;     // the "registered post" channel

    public static void main(String[] args) throws InterruptedException {
        Thread writer = new Thread(() -> {
            data = 42;                         // (1) plain write
            ready = true;                      // (2) volatile write: publishes (1) as well
        });
        Thread reader = new Thread(() -> {
            while (!ready) Thread.onSpinWait(); // (3) volatile read that sees true
            System.out.println(data);          // (4) guaranteed 42: 1 → 2 → 3 → 4 by transitivity
        });
        reader.start(); writer.start();
        writer.join(); reader.join();
    }
}`, `
final class Point {
    private final int x, y;                    // final fields: safely visible after construction
    Point(int x, int y) { this.x = x; this.y = y; }
    int x() { return x; }
    int y() { return y; }
}

class Publisher {
    static Point shared;                       // NOT volatile: publishing via a data race
    static void publish() { shared = new Point(1, 2); }
    static void read() {
        Point p = shared;
        if (p != null) {
            // Because x and y are final, a reader that sees p is guaranteed to see 1 and 2.
            // If they were NOT final, it could legally see 0 for either field.
            System.out.println(p.x() + "," + p.y());
        }
    }
}`],
    codeTitle: ['Message passing with a volatile flag', 'final-field guarantee (immutable objects survive racy publication)'],
    viz: [{
      title: 'Litmus test: enumerate every interleaving, then add reordering',
      input: 'SB',
      inputLabel: 'Type SB (store buffering) or MP (message passing)',
      gen: function (input) {
        var k = clean(input).toUpperCase();
        var L = LITMUS[k];
        if (!L) throw new Error('Type SB or MP');
        var c1 = L.t1.map(opText).join('\n'), c2 = L.t2.map(opText).join('\n');
        var orders = ['AABB', 'ABAB', 'ABBA', 'BAAB', 'BABA', 'BBAA'];
        var frames = [], results = [], sc = {};
        var initTxt = Object.keys(L.init).map(function (v) { return v + ' = 0'; }).join(', ');
        frames.push({ narr: '<b>' + L.name + '.</b> Shared fields start as ' + initTxt + ' (plain, not volatile). r1 and r2 are local variables. First, assume the simple mental model: statements run <b>in program order</b>, interleaved in any way (called <b>sequential consistency</b>).', parts: [
          { type: 'code', label: 'Thread T1', lang: 'java', code: c1 }, { type: 'code', label: 'Thread T2', lang: 'java', code: c2 },
          { type: 'vars', label: 'Shared memory', vals: L.init }
        ] });
        orders.forEach(function (o, idx) {
          var r = runLitmus(L, o, L.t1, L.t2);
          var isNew = !sc[r.key]; sc[r.key] = true;
          results.push(['#' + (idx + 1), o.replace(/A/g, '1').replace(/B/g, '2').split('').join(' '), r.key]);
          frames.push({ narr: 'Interleaving #' + (idx + 1) + ': run order (thread numbers) <b>' + results[idx][1] + '</b> → ' + r.key + (isNew ? ' <span class="c-g">(new outcome)</span>' : ' (seen before)') + '.', parts: [
            { type: 'table', label: 'Step by step', columns: ['step', 'thread', 'statement', 'memory after'], rows: r.trace },
            { type: 'table', label: 'Outcomes so far (sequential consistency)', columns: ['#', 'order', 'result'], rows: results.slice(), hl: one(idx, isNew ? 'ok' : 'done') }
          ] });
        });
        var scKeys = Object.keys(sc);
        frames.push({ narr: 'Under sequential consistency only these outcomes exist: <b>' + scKeys.join(' · ') + '</b>. Many developers stop thinking here. The JMM does <b>not</b> promise sequential consistency for programs with data races.', parts: [
          { type: 'set', label: 'Possible outcomes with NO reordering', items: scKeys },
          { type: 'table', label: 'All 6 interleavings', columns: ['#', 'order', 'result'], rows: results }
        ] });
        var swap = function (p) { return [p[1], p[0]]; };
        var variants = [[L.t1, L.t2, 'none'], [swap(L.t1), L.t2, 'T1 swapped'], [L.t1, swap(L.t2), 'T2 swapped'], [swap(L.t1), swap(L.t2), 'both swapped']];
        var extra = null, all = {};
        variants.forEach(function (vv) {
          orders.forEach(function (o) {
            var r = runLitmus(L, o, vv[0], vv[1]);
            all[r.key] = true;
            if (!sc[r.key] && !extra) extra = { r: r, how: vv[2], p1: vv[0], p2: vv[1] };
          });
        });
        if (extra) {
          frames.push({ narr: 'Now allow what compilers and CPUs really do: each thread\'s two statements touch <b>different</b> variables, so either may become visible first. One such execution (' + extra.how + '): ' + L.why, parts: [
            { type: 'code', label: 'T1 as other threads may observe it', lang: 'java', code: extra.p1.map(opText).join('\n'), hl: extra.how.indexOf('T1') >= 0 || extra.how === 'both swapped' ? { 1: 'bad', 2: 'bad' } : {} },
            { type: 'code', label: 'T2 as other threads may observe it', lang: 'java', code: extra.p2.map(opText).join('\n'), hl: extra.how.indexOf('T2') >= 0 || extra.how === 'both swapped' ? { 1: 'bad', 2: 'bad' } : {} },
            { type: 'table', label: 'The surprising execution', columns: ['step', 'thread', 'statement', 'memory after'], rows: extra.r.trace },
            { type: 'vars', label: 'Result', vals: { outcome: extra.r.key }, hl: { outcome: 'bad' } }
          ] });
        }
        var allKeys = Object.keys(all);
        frames.push({ narr: 'With reordering allowed, the possible outcomes are: <b>' + allKeys.join(' · ') + '</b>. The extra one' + (extra ? ' (' + extra.r.key + ')' : '') + ' is <span class="c-r">legal for this racy program</span> and really happens on real hardware.', parts: [
          { type: 'set', label: 'Possible outcomes for the RACY program', items: allKeys, hl: extra ? one(extra.r.key, 'bad') : {} }
        ] });
        frames.push({ narr: '<b>The fix:</b> ' + L.fix + ' Programs with no data races get sequential consistency back for free — the <b>DRF-SC</b> guarantee.', parts: [
          { type: 'set', label: 'Possible outcomes after the fix', items: scKeys, hl: (function () { var h = {}; scKeys.forEach(function (x) { h[x] = 'ok'; }); return h; })() },
          note('Try the other litmus test: type <b>' + (k === 'SB' ? 'MP' : 'SB') + '</b>.', 'Next')
        ] });
        return frames;
      }
    }, {
      title: 'Building the happens-before chain for a volatile flag',
      gen: function () {
        function g(ehl, hl, edges, tags) {
          return { type: 'graph', label: 'Happens-before graph (po = program order, sw = synchronizes-with)', directed: true, height: 70,
            nodes: [{ id: 'a1', label: 'T1: data = 42', x: 24, y: 10, shape: 'box' }, { id: 'a2', label: 'T1: ready = true (vW)', x: 24, y: 42, shape: 'box' },
              { id: 'b1', label: 'T2: ready == true (vR)', x: 76, y: 42, shape: 'box' }, { id: 'b2', label: 'T2: print(data)', x: 76, y: 64, shape: 'box' }],
            edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        var po1 = ['a1', 'a2', 'po'], sw = ['a2', 'b1', 'sw'], po2 = ['b1', 'b2', 'po'], hb = ['a1', 'b2', 'hb'];
        return [
          { narr: 'Four actions. data is plain, ready is <b>volatile</b>. Question: when T2 prints data after seeing ready == true, must it print 42?', parts: [g({}, {}, [], {})] },
          { narr: '<b>Program order</b> in T1: the write of data HB the volatile write of ready (same thread, earlier in code).', parts: [g({ 'a1-a2': 'ok' }, { a1: 'cur', a2: 'cur' }, [po1])] },
          { narr: '<b>Volatile rule</b>: the volatile write of ready <b>synchronizes-with</b> the volatile read in T2 that sees true. This is the cross-thread edge.', parts: [g({ 'a2-b1': 'ok' }, { a2: 'cur', b1: 'cur' }, [po1, sw])] },
          { narr: '<b>Program order</b> in T2: the read of ready HB the read of data.', parts: [g({ 'b1-b2': 'ok' }, { b1: 'cur', b2: 'cur' }, [po1, sw, po2])] },
          { narr: '<b>Transitivity</b>: data = 42 HB print(data). So T2 is guaranteed to print <b>42</b>, even though data itself is not volatile.', parts: [g({ 'a1-b2': 'sel' }, { a1: 'ok', b2: 'ok' }, [po1, sw, po2, hb], { b2: 'prints 42' })] },
          { narr: 'Remove <b>volatile</b> from ready and the sw edge disappears. With no path from data = 42 to print(data), the read of data is a <b>data race</b>: printing 0 is legal (and the loop waiting for ready may not even terminate).', parts: [g({ 'a2-b1': 'bad' }, { b2: 'bad' }, [po1, ['a2', 'b1', 'no sw!'], po2], { b2: '0 or 42' })] },
          { narr: 'Other ways to get a cross-thread edge, all used daily without noticing.', parts: [{ type: 'table', label: 'Synchronizes-with sources', columns: ['release side', 'acquire side'], rows: [['unlock(M) / leaving synchronized', 'later lock(M)'], ['volatile write v', 'volatile read of v'], ['t.start()', 'first action in t'], ['last action in t', 't.join() returns'], ['queue.put(x) (BlockingQueue)', 'queue.take() returns x'], ['future completes', 'future.get() returns'], ['map.put(k, v) (ConcurrentHashMap)', 'map.get(k) returns v']] }] }
        ];
      }
    }],
    examples: [
      { title: 'What can this print? (store buffering)', html: `<p>Plain ${C('x, y')}. T1: ${C('x = 1; r1 = y;')} T2: ${C('y = 1; r2 = x;')}. Possible results: (0,1), (1,0), (1,1) — <b>and (0,0)</b>. The last one is observed on real x86 machines millions of times per billion runs. With ${C('volatile int x, y')} the set shrinks to (0,1), (1,0), (1,1).</p>`, code: `
class StoreBuffering {
    static int x, y, r1, r2;                    // plain: (0,0) is a legal outcome
    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(() -> { x = 1; r1 = y; });
        Thread t2 = new Thread(() -> { y = 1; r2 = x; });
        t1.start(); t2.start(); t1.join(); t2.join();   // join: we can safely read r1, r2 now
        System.out.println("(" + r1 + ", " + r2 + ")");
    }
}` },
      { title: '"this" escaping the constructor', html: `<p>Registering ${C('this')} as a listener (or starting a thread with it) inside the constructor lets another thread see the object <b>before</b> the constructor finished — even final fields lose their guarantee. Fix: a private constructor plus a static factory that registers after construction.</p>`, code: `
class EventBus { final List<Object> listeners = new CopyOnWriteArrayList<>(); void register(Object l) { listeners.add(l); } }

class SafeListener {
    private final int threshold;
    private SafeListener(int threshold) { this.threshold = threshold; }   // nothing escapes here
    static SafeListener create(EventBus bus, int threshold) {
        SafeListener l = new SafeListener(threshold);   // fully constructed first
        bus.register(l);                                // then published via a thread-safe collection
        return l;
    }
    int threshold() { return threshold; }
}` },
      { title: 'Piggybacking on a BlockingQueue', html: `<p>The producer fills a plain ${C('ArrayList')} and puts it on a ${C('BlockingQueue')}; the consumer takes it and reads the list — no volatile, no lock in your code, still correct. ${C('java.util.concurrent')} documents memory-consistency effects: actions before ${C('put')} HB actions after the matching ${C('take')}. The rule: after handing an object off, the producer must <b>never touch it again</b>.</p>`, code: `
BlockingQueue<List<Integer>> q = new ArrayBlockingQueue<>(1);
Thread producer = new Thread(() -> {
    List<Integer> batch = new ArrayList<>(List.of(1, 2, 3));   // plain, unsynchronized list
    try { q.put(batch); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
});
producer.start();
List<Integer> got = q.take();     // HB edge: sees [1, 2, 3] fully
System.out.println(got);
producer.join();` },
      { title: 'Happens-before is not "happened earlier"', html: `<p>T1 writes plain ${C('x = 1')} at 10:00:00.000; T2 reads ${C('x')} at 10:00:05.000 (five seconds later by the wall clock). Without an HB edge, T2 may still read 0 — the JMM simply does not talk about time. Conversely, an HB edge says nothing about which thread "ran first" in real time; it only constrains what each read is allowed to return.</p>` }
    ],
    deepDive: `<p><b>🟣 DRF-SC: the one theorem to know.</b> If a program is <b>data-race-free</b> (every pair of conflicting accesses is ordered by happens-before) in all sequentially consistent executions, then all its executions appear sequentially consistent. So the practical rule is simple: <b>eliminate data races and you may reason with simple interleavings again.</b> Only lock-free library authors need to reason below that line.</p>
<p><b>Why the JMM is weaker than SC.</b> Compilers do common-subexpression elimination, loop hoisting, dead-store elimination and instruction scheduling; CPUs have store buffers, invalidation queues and out-of-order execution. x86 is relatively strong (TSO: only a later load may overtake an earlier store), but ARM64 and POWER allow store-store and load-load reordering too. A race that "never happens" on an Intel laptop can appear immediately on Graviton or Apple Silicon — a real migration hazard in 2026 as fleets move to ARM.</p>
<p><b>Double-checked locking history.</b> Pre-Java 5, DCL was broken even with volatile, because the old memory model allowed the reference write to be reordered before the constructor's field writes. JSR-133 (Java 5) strengthened volatile so that a volatile write publishes all prior writes; DCL with a <b>volatile</b> field is correct since then. Without volatile it is still broken: a reader may see a non-null reference to a partially constructed object. The <b>initialization-on-demand holder</b> idiom avoids the question entirely — class initialization is guarded by a JVM lock and gives HB for free, lazily.</p>
<p><b>final-field semantics</b> add a "freeze" at the end of the constructor: any thread that obtains the reference after construction (even racily) sees the final fields and everything reachable through them as of the freeze — provided ${C('this')} did not escape. That is why immutable objects (${C('String')}, records with final fields, ${C('List.of')}) are safe to share without synchronization. Non-final fields have no such guarantee.</p>
<p><b>Out-of-thin-air.</b> The JMM's causality rules forbid values appearing "from nowhere" (e.g. a racy program printing 42 when 42 is never written). These rules are notoriously subtle and are still an active research area; the practical takeaway is again DRF-SC. For finer-grained library work, Java 9's ${C('VarHandle')} memory modes (plain, opaque, acquire/release, volatile) map closely to the C++11 memory model.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> AI can draw HB graphs, explain the litmus tests and generate jcstress tests from a code snippet — great for learning and for reviewing lock-free code. <b>Use AI as a partner:</b> <code>For the read of field X on line 42, show me the happens-before path from every write of X, or tell me there is none.</code> If it cannot produce a path, you have probably found a data race.</p>
<p><b>Where AI goes wrong:</b> confidently explaining memory visibility in terms of "flushing caches to main memory" (a hardware folk model that gets edge cases wrong), claiming x86 behaviour is what Java guarantees, writing DCL without volatile, or saying ${C('final')} makes a field's <i>referenced</i> mutable object thread-safe. <b>What you must still own:</b> the HB rules, transitivity, and safe publication idioms. In interviews, "it works because of happens-before via the volatile write" is the sentence that separates senior from mid-level answers.</p>`,
    problems: [{
      title: 'Fix Double-Checked Locking',
      level: 'Medium', tags: ['happens-before', 'volatile', 'safe publication', 'singleton'], companies: ['Goldman Sachs', 'Oracle', 'JP Morgan', 'Amazon'],
      statement: `<p>A lazily-created, expensive ${C('Registry')} singleton must be created at most once, be safely visible to all threads, and the fast path (instance already exists) must not take a lock. The current code uses double-checked locking without ${C('volatile')}. Explain the bug and fix it; then give a simpler lazy alternative.</p>`,
      constraints: `Thousands of threads call getInstance() concurrently at startup; afterwards millions of calls per second. Construction may take 100 ms.`,
      example: `<p>Threads A and B call ${C('getInstance()')} together. Correct: both get the <b>same</b> object, constructed exactly once, with all fields initialized (e.g. ${C('get("region")')} returns ${H.c('g', '"ap-south-1"')}, never null).</p>`,
      brute: {
        why: `<p>Without ${C('volatile')}, ${C('instance = new Registry()')} is allocation + constructor + reference write, and the JIT/CPU may make the <b>reference</b> visible before the constructor's writes. Thread B on the unsynchronized fast path sees ${C('instance != null')}, skips the lock, and uses a half-built object (empty map → NPE or wrong data). B never takes the lock, so there is no HB edge to save it. The "simplest" alternative — synchronizing the whole method — is correct but makes every call contend on one lock forever.</p>`,
        code: `
final class BrokenRegistry {
    private static BrokenRegistry instance;           // NOT volatile → data race on the fast path
    private final Map<String, String> entries = new HashMap<>();
    private BrokenRegistry() { entries.put("region", "ap-south-1"); }
    static BrokenRegistry getInstance() {
        if (instance == null) {                        // racy read, no lock
            synchronized (BrokenRegistry.class) {
                if (instance == null) instance = new BrokenRegistry();   // may be published half-built
            }
        }
        return instance;
    }
}`
      },
      mcq: { q: 'Why does adding <code>volatile</code> to <code>instance</code> fix double-checked locking?', options: ['It makes the constructor run atomically', 'The volatile write of instance happens-before any volatile read that sees it, so the reader also sees every write the constructor made', 'It forces all threads to take the lock', 'It prevents the constructor from being called twice'], answer: 1, explain: 'Construction writes → (program order) → volatile write of instance → (volatile rule) → reader\'s volatile read seeing non-null → reader\'s use of the fields. Transitivity guarantees a fully built object. Creating it once is already ensured by the lock + second check.' },
      hints: [
        `<p>Hint 1: there are two concerns: <b>create once</b> (the lock + second null-check handles that) and <b>publish safely</b> (the fast-path reader takes no lock — so who gives it an HB edge?).</p>`,
        `<p>Hint 2: make the field ${C('volatile')}. Read it into a local variable so the fast path does only <b>one</b> volatile read.</p>`,
        `<p>Hint 3: simpler lazy alternative: a private static nested ${C('Holder')} class with ${C('static final Registry INSTANCE = new Registry();')} — the JVM initializes it on first access, under its own class-init lock, with HB guarantees. (An ${C('enum')} singleton also works.)</p>`
      ],
      tests: { sig: 'int string -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(int threads, String key) throws Exception {
    Registry first = Registry.getInstance();
    Registry[] seen = new Registry[threads];
    String[] vals = new String[threads];
    Thread[] ts = new Thread[threads];
    for (int i = 0; i < threads; i++) {
      final int id = i;
      ts[i] = new Thread(() -> { Registry r = Registry.getInstance(); seen[id] = r; vals[id] = r.get(key); });
      ts[i].start();
    }
    boolean same = true, valuesEqual = true;
    for (int i = 0; i < threads; i++) {
      ts[i].join();
      if (seen[i] != first) same = false;
      if (!String.valueOf(vals[i]).equals(String.valueOf(first.get(key)))) valuesEqual = false;
    }
    return new String[]{ String.valueOf(same), String.valueOf(valuesEqual), String.valueOf(first.get(key)) };
  }
}` }, cases: [
          [[2, 'region'], ['true', 'true', 'ap-south-1']],
          [[1, 'tier'], ['true', 'true', 'gold']],
          [[1, 'missing'], ['true', 'true', 'null']],
          [[0, 'region'], ['true', 'true', 'ap-south-1']],
          [[64, 'region'], ['true', 'true', 'ap-south-1']],
          [[1000, 'tier'], ['true', 'true', 'gold']],
          [[5000, 'region'], ['true', 'true', 'ap-south-1']]
        ] },
      solution: {
        approach: `<p><b>Volatile + local variable.</b> The first check reads the volatile once into ${C('local')}; if non-null, we are done with a single volatile load (cheap). Otherwise, take the class lock, re-check (another thread may have created it while we waited), construct, and publish with one volatile write. The constructor's writes happen-before the volatile write, which happens-before any read that sees it. For most code, prefer the <b>holder idiom</b> shown in the alternative: lazy, lock-free on the fast path, and impossible to get wrong.</p>`,
        code: `
final class Registry {
    private static volatile Registry instance;          // volatile is the whole fix
    private final Map<String, String> entries = new HashMap<>();

    private Registry() {                                 // expensive setup
        entries.put("region", "ap-south-1");
        entries.put("tier", "gold");
    }

    static Registry getInstance() {
        Registry local = instance;                       // ONE volatile read on the fast path
        if (local == null) {
            synchronized (Registry.class) {
                local = instance;                        // re-check under the lock
                if (local == null) {
                    local = new Registry();              // build fully...
                    instance = local;                    // ...then publish with one volatile write
                }
            }
        }
        return local;
    }

    String get(String key) { return entries.get(key); }

    public static void main(String[] args) throws InterruptedException {
        Registry[] seen = new Registry[2];
        Thread a = new Thread(() -> seen[0] = getInstance());
        Thread b = new Thread(() -> seen[1] = getInstance());
        a.start(); b.start(); a.join(); b.join();
        System.out.println((seen[0] == seen[1]) + " " + seen[0].get("region"));   // true ap-south-1
    }
}`,
        alt: [{ lang: 'java', title: 'Holder idiom (preferred lazy singleton)', code: `
final class LazyRegistry {
    private final Map<String, String> entries = new HashMap<>();
    private LazyRegistry() { entries.put("region", "ap-south-1"); }

    private static final class Holder {                  // not loaded until getInstance() touches it
        static final LazyRegistry INSTANCE = new LazyRegistry();   // JVM class-init lock gives HB + once-only
    }

    static LazyRegistry getInstance() { return Holder.INSTANCE; }
    String get(String key) { return entries.get(key); }
}` }],
        dry: { head: ['time', 'Thread A', 'Thread B', 'instance', 'note'], rows: [
          ['t1', 'local = instance → null', 'local = instance → null', 'null', 'both miss the fast path'],
          ['t2', 'locks Registry.class, re-check null', 'BLOCKED on Registry.class', 'null', ''],
          ['t3', 'construct, then volatile write', 'BLOCKED', '<span class="c-g">R1</span>', 'constructor writes HB the volatile write'],
          ['t4', 'unlock, return R1', 'locks, re-check → R1 (not null)', 'R1', 'second check prevents a 2nd construction'],
          ['t5', '—', 'returns R1', 'R1', 'later callers: one volatile read, no lock']
        ] },
        complexity: `<p>Fast path: one volatile read (on x86 ≈ a normal load). Slow path once: lock + construction. The holder idiom has the same costs with zero hand-written synchronization.</p>`,
        followUps: ['Why read the volatile into a local variable instead of reading instance twice?', 'Why is the enum singleton also serialization- and reflection-safe?', 'What would break if the Registry had a public non-final mutable field?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — wait / notify / notifyAll: guarded blocks & producer-consumer
     ====================================================================== */
  var BUF_CODE = [
    'synchronized void put(int x) throws InterruptedException {',
    '    while (count == CAP) wait();     // full  → release lock & sleep',
    '    buf.addLast(x); count++;',
    '    notifyAll();                     // wake every waiter to re-check',
    '}',
    'synchronized int take() throws InterruptedException {',
    '    while (count == 0) wait();       // empty → release lock & sleep',
    '    int x = buf.removeFirst(); count--;',
    '    notifyAll();',
    '    return x;',
    '}'
  ].join('\n');

  topics.push({
    title: 'wait(), notify() & notifyAll(): Guarded Blocks and Producer-Consumer',
    analogy: `<p>A tiny bakery counter fits only <b>2 trays</b>. The counter is the lock: one person at a time stands at it. A baker (producer) arrives with a tray but the counter is full — instead of standing there blocking everyone, the baker <b>steps into the waiting room</b> (${C('wait()')}) and leaves the counter free. A customer (consumer) takes a tray and shouts <b>"something changed!"</b> into the waiting room (${C('notifyAll()')}). Everyone in the waiting room gets up and <b>queues for the counter again</b>; when each one gets their turn, they <b>look again</b> ("is there space now?") because someone else may have filled the gap first. That "look again" is the famous <b>while loop</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Sometimes a thread must wait until some <b>condition</b> on shared state becomes true ("queue not empty", "stage == 2", "count == 0"). Spinning in a loop wastes CPU and — without volatile — may never see the change. Java's built-in solution is the <b>guarded block</b>, using three methods every object inherits from ${C('Object')}:</p>
${H.table(['method', 'what it does'], [
  [C('wait()'), 'must hold the object\'s lock. <b>Atomically releases the lock</b> and parks the thread in the object\'s <b>wait set</b> (state WAITING). On wake-up, it must <b>re-acquire</b> the lock before wait() returns.'],
  [C('wait(ms)'), 'same, but gives up after ms milliseconds (TIMED_WAITING).'],
  [C('notify()'), 'wakes <b>one arbitrary</b> thread from this object\'s wait set (must hold the lock).'],
  [C('notifyAll()'), 'wakes <b>all</b> threads in the wait set; they then compete for the lock one by one.']
])}
<p><b>The one idiom to write from memory:</b></p>
${P(`synchronized (lock) {
    while (!condition) {      // WHILE, never if
        lock.wait();
    }
    // condition is true AND we hold the lock: act on it
}

// the other side:
synchronized (lock) {
    changeStateSoConditionMayBeTrue();
    lock.notifyAll();
}`)}
<p><b>Why ${C('while')} and not ${C('if')}?</b> Three reasons: (1) <b>spurious wake-ups</b> — the JVM is allowed to return from wait() for no reason; (2) <b>stolen condition</b> — between the notify and you re-acquiring the lock, another thread may have consumed the item; (3) with ${C('notifyAll')} you are woken even if your particular condition is still false.</p>
<p><b>Rules that trip people up:</b></p>
<ul>
<li>Calling ${C('wait/notify')} without holding <b>that object's</b> monitor throws ${C('IllegalMonitorStateException')} — e.g. ${C('synchronized (a) { b.wait(); }')}.</li>
<li>${C('notify')} does <b>not</b> release the lock; the woken thread proceeds only after the notifier exits its synchronized block.</li>
<li>Notifications are <b>not remembered</b>: a notify with nobody waiting is lost. That is harmless <b>only</b> if waiters check a state variable before waiting (the while loop does that) — never wait "for a notify", always wait <b>for a condition</b>.</li>
<li>${C('sleep()')} keeps the lock; ${C('wait()')} releases it.</li>
</ul>
<p><b>notify vs notifyAll:</b> use ${C('notifyAll')} by default. ${C('notify')} is safe only when (a) all waiters wait for the <b>same</b> condition, and (b) each notification lets <b>at most one</b> waiter proceed. A bounded buffer with producers and consumers waiting on the same object violates (a) — a notify can wake the wrong kind of thread and stall everybody (see the second visualizer).</p>`,
    clues: [
      '"Implement a <b>producer-consumer</b> / bounded buffer / blocking queue <b>without java.util.concurrent</b>" → wait/notifyAll',
      '"Print in order / alternate threads / <b>FooBar</b> / <b>ZeroEvenOdd</b> / H2O" → shared state + guarded waits',
      '"Why must wait() be called in a <b>loop</b>?" → spurious wake-ups + stolen condition',
      '"Difference between <b>sleep()</b> and <b>wait()</b>?" → wait releases the monitor, needs it held, woken by notify',
      '"<b>IllegalMonitorStateException</b>" → calling wait/notify without holding that object\'s lock',
      '"notify vs notifyAll — which and why?" → notifyAll unless waiters are uniform and one-in-one-out',
      '"Thread waits forever although the event happened" → lost notification: wait without checking state'
    ],
    code: [`
public class BoundedBuffer {
    private final Deque<Integer> buf = new ArrayDeque<>();   // guarded by "this"
    private final int capacity;

    public BoundedBuffer(int capacity) { this.capacity = capacity; }

    public synchronized void put(int x) throws InterruptedException {
        while (buf.size() == capacity) wait();   // full: release the lock and sleep
        buf.addLast(x);
        notifyAll();                             // state changed: let waiters re-check
    }

    public synchronized int take() throws InterruptedException {
        while (buf.isEmpty()) wait();            // empty: release the lock and sleep
        int x = buf.removeFirst();
        notifyAll();
        return x;
    }

    public static void main(String[] args) throws InterruptedException {
        BoundedBuffer b = new BoundedBuffer(2);
        Thread producer = new Thread(() -> {
            try { for (int i = 1; i <= 5; i++) { b.put(i); System.out.println("put " + i); } }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        Thread consumer = new Thread(() -> {
            try { for (int i = 1; i <= 5; i++) System.out.println("took " + b.take()); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        producer.start(); consumer.start();
        producer.join(); consumer.join();        // "took" lines always come out as 1, 2, 3, 4, 5
    }
}`, `
// sleep vs wait, side by side
class SleepVsWait {
    private final Object lock = new Object();
    private boolean ready;                       // guarded by lock

    void sleeper() throws InterruptedException {
        synchronized (lock) {
            Thread.sleep(100);                   // keeps holding the lock: everyone else is BLOCKED
        }
    }

    void waiter() throws InterruptedException {
        synchronized (lock) {
            while (!ready) lock.wait(100);       // releases the lock while waiting (TIMED_WAITING)
        }
    }

    void signal() {
        synchronized (lock) { ready = true; lock.notifyAll(); }
    }
}`],
    codeTitle: ['Bounded buffer with wait/notifyAll', 'sleep() keeps the lock, wait() releases it'],
    viz: [{
      title: 'Bounded buffer (capacity 2): wait set, entry set and the while loop',
      input: 'C P P P P C C C',
      inputLabel: 'Threads arriving in order: P = producer put(), C = consumer take()',
      gen: function (input) {
        var toks = clean(input).toUpperCase().split(/[\s,]+/).filter(function (x) { return x; });
        if (!toks.length || toks.length > 12 || toks.some(function (t) { return !/^[PC]\d{0,2}$/.test(t); })) throw new Error('Use 1–12 tokens like P C P (optionally numbered: P1 C2)');
        var CAP = 2, buf = [], waitSet = [], entry = [], frames = [], item = 0, nP = 0, nC = 0, states = {}, order = [];
        var th = toks.map(function (t) {
          var kind = t[0], name = t.length > 1 ? t : (kind === 'P' ? 'P' + (++nP) : 'C' + (++nC));
          return { kind: kind, name: name };
        });
        var names = {}; th.forEach(function (t) { if (names[t.name]) throw new Error('Duplicate thread name ' + t.name); names[t.name] = 1; });
        function fr(line, cls, narr, hlBuf) {
          frames.push({ narr: narr, parts: [
            { type: 'code', label: 'BoundedBuffer methods (CAP = 2)', lang: 'java', code: BUF_CODE, hl: line ? lineHl(line, cls) : {} },
            { type: 'queue', label: 'buf (count = ' + buf.length + ' / ' + CAP + ')', items: buf.slice(), frontLabel: 'take here', backLabel: 'put here', hl: hlBuf || {} },
            { type: 'set', label: 'Wait set (WAITING — lock released)', items: waitSet.slice() },
            { type: 'queue', label: 'Entry set (BLOCKED — woken, need the lock again)', items: entry.slice() },
            { type: 'table', label: 'Thread states', columns: ['thread', 'state'], rows: order.map(function (n) { return [n, states[n]]; }), hl: (function () { var h = {}; order.forEach(function (n, i) { if (states[n] === 'WAITING') h[i] = 'win'; else if (states[n] === 'BLOCKED') h[i] = 'bad'; else if (states[n].indexOf('done') === 0) h[i] = 'done'; }); return h; })() }
          ] });
        }
        function canGo(t) { return t.kind === 'P' ? buf.length < CAP : buf.length > 0; }
        function act(t) {
          var hb = {};
          if (t.kind === 'P') { item++; buf.push(item); hb[buf.length - 1] = 'ok'; states[t.name] = 'done (put ' + item + ')'; fr(3, 'ok', '<b>' + t.name + '</b> puts item ' + item + '. count = ' + buf.length + '.', hb); }
          else { var x = buf.shift(); states[t.name] = 'done (took ' + x + ')'; fr(8, 'ok', '<b>' + t.name + '</b> takes item ' + x + '. count = ' + buf.length + '.'); }
          if (waitSet.length) {
            waitSet.forEach(function (n) { entry.push(n); states[n] = 'BLOCKED'; });
            waitSet = [];
            fr(t.kind === 'P' ? 4 : 9, 'win', '<b>notifyAll()</b>: every thread in the wait set moves to the entry set (BLOCKED). They cannot run yet — ' + t.name + ' still holds the lock until it leaves the method.');
          } else {
            fr(t.kind === 'P' ? 4 : 9, 'done', '<b>notifyAll()</b> with an empty wait set does nothing (the notification is not remembered). ' + t.name + ' returns and releases the lock.');
          }
        }
        function arrive(t) {
          states[t.name] = 'RUNNABLE'; order.push(t.name);
          var ln = t.kind === 'P' ? 1 : 6;
          fr(ln, 'cur', '<b>' + t.name + '</b> arrives and calls ' + (t.kind === 'P' ? 'put()' : 'take()') + ': it acquires the lock (nobody else is inside).');
          if (!canGo(t)) {
            waitSet.push(t.name); states[t.name] = 'WAITING';
            fr(t.kind === 'P' ? 2 : 7, 'bad', '<b>' + t.name + '</b> checks the guard: buffer is ' + (t.kind === 'P' ? 'FULL' : 'EMPTY') + ' → calls <b>wait()</b>: releases the lock and joins the wait set. It uses no CPU now.');
            return;
          }
          fr(t.kind === 'P' ? 2 : 7, 'ok', '<b>' + t.name + '</b> checks the guard: ' + (t.kind === 'P' ? 'space available' : 'an item is available') + ', so no waiting needed.');
          act(t);
          drain();
        }
        function drain() {
          while (entry.length) {
            var n = entry.shift(), t = th.filter(function (x) { return x.name === n; })[0];
            states[n] = 'RUNNABLE';
            fr(t.kind === 'P' ? 2 : 7, 'cur', '<b>' + n + '</b> re-acquires the lock and returns from wait() — then the <b>while</b> loop re-checks the guard.');
            if (!canGo(t)) {
              waitSet.push(n); states[n] = 'WAITING';
              fr(t.kind === 'P' ? 2 : 7, 'bad', 'Guard is still false for <b>' + n + '</b> (' + (t.kind === 'P' ? 'still full' : 'someone else took the item first') + '), so it waits again. <span class="c-y">With <code>if</code> instead of <code>while</code> it would have ' + (t.kind === 'P' ? 'overfilled the buffer' : 'removed from an empty buffer and crashed') + '.</span>');
            } else {
              act(t);
            }
          }
        }
        fr(null, '', 'A buffer with capacity 2. Threads arrive one at a time in the order you typed: <b>' + th.map(function (t) { return t.name; }).join(', ') + '</b>. Watch where each thread sits: inside (owner), wait set, or entry set.');
        th.forEach(arrive);
        var stuck = order.filter(function (n) { return states[n] === 'WAITING'; });
        frames.push({ narr: stuck.length ? 'All arrivals processed. Still waiting: <b>' + stuck.join(', ') + '</b> — they would wake when a matching ' + (th.filter(function (t) { return t.name === stuck[0]; })[0].kind === 'P' ? 'consumer' : 'producer') + ' arrives. Nothing is lost: they will re-check the state.' : '<span class="c-g">All threads finished.</span> Every waiter was woken by notifyAll and re-checked its guard in the while loop.', parts: [
          { type: 'queue', label: 'Final buffer', items: buf.slice() },
          { type: 'table', label: 'Final thread states', columns: ['thread', 'state'], rows: order.map(function (n) { return [n, states[n]]; }) },
          note('Try <b>C C P</b> (two consumers, one item: one of them must wait again) or <b>P P P P P</b> (producers pile up in the wait set).', 'Experiment')
        ] });
        return frames;
      }
    }, {
      title: 'Why notify() can freeze a producer-consumer (capacity 1)',
      gen: function () {
        var rows = function (r) { return { type: 'table', label: 'Thread states', columns: ['thread', 'kind', 'state'], rows: r }; };
        return [
          { narr: 'Same buffer, but capacity <b>1</b> and the code uses <b>notify()</b> instead of notifyAll(). Two consumers C1, C2 arrive first: buffer empty, both wait.', parts: [{ type: 'queue', label: 'buf (cap 1)', items: [] }, { type: 'set', label: 'Wait set', items: ['C1', 'C2'] }, rows([['C1', 'consumer', 'WAITING'], ['C2', 'consumer', 'WAITING'], ['P1', 'producer', 'not started'], ['P2', 'producer', 'not started']])] },
          { narr: 'P1 puts item 1 and calls <b>notify()</b>: the JVM picks one waiter — C1. Good so far.', parts: [{ type: 'queue', label: 'buf (cap 1)', items: [1], hl: { 0: 'ok' } }, { type: 'set', label: 'Wait set', items: ['C2'] }, rows([['C1', 'consumer', 'BLOCKED (woken)'], ['C2', 'consumer', 'WAITING'], ['P1', 'producer', 'done'], ['P2', 'producer', 'not started']])] },
          { narr: 'Before C1 gets the lock, P2 arrives: buffer is full → P2 waits. The wait set now holds <b>one consumer and one producer</b> — mixed conditions on one object.', parts: [{ type: 'queue', label: 'buf (cap 1)', items: [1] }, { type: 'set', label: 'Wait set', items: ['C2', 'P2'], hl: { P2: 'cur' } }, rows([['C1', 'consumer', 'BLOCKED (woken)'], ['C2', 'consumer', 'WAITING'], ['P1', 'producer', 'done'], ['P2', 'producer', 'WAITING']])] },
          { narr: 'C1 gets the lock, takes item 1 and calls <b>notify()</b>. The right thread to wake is P2 (there is space now). But notify picks <b>any</b> waiter… it picks <b>C2</b>.', parts: [{ type: 'queue', label: 'buf (cap 1)', items: [] }, { type: 'set', label: 'Wait set', items: ['P2'], hl: { P2: 'bad' } }, rows([['C1', 'consumer', 'done (took 1)'], ['C2', 'consumer', 'BLOCKED (woken — wrong one!)'], ['P1', 'producer', 'done'], ['P2', 'producer', 'WAITING']])] },
          { narr: 'C2 re-checks its while loop: buffer empty → waits again. It does not notify anyone (it changed nothing).', parts: [{ type: 'queue', label: 'buf (cap 1)', items: [] }, { type: 'set', label: 'Wait set', items: ['C2', 'P2'], hl: { C2: 'bad', P2: 'bad' } }, rows([['C1', 'consumer', 'done'], ['C2', 'consumer', 'WAITING'], ['P1', 'producer', 'done'], ['P2', 'producer', 'WAITING']])] },
          { narr: '<span class="c-r">Stuck:</span> P2 waits although there is space; C2 waits for an item only P2 could produce. Nobody is left to notify. The program hangs with an empty buffer. (Not a deadlock in the lock-cycle sense — a <b>lost wake-up</b>.)', parts: [{ type: 'queue', label: 'buf (cap 1)', items: [] }, { type: 'set', label: 'Wait set (forever)', items: ['C2', 'P2'], hl: { C2: 'bad', P2: 'bad' } }, note('Fix options: (1) use <b>notifyAll()</b> — P2 would also wake and succeed; (2) use separate conditions for "not full" and "not empty" with <b>ReentrantLock</b> + two <b>Condition</b> objects (that is how ArrayBlockingQueue works) so signal() always wakes the right kind of thread.', 'Fix')] }
        ];
      }
    }],
    examples: [
      { title: 'IllegalMonitorStateException', html: `<p>${C('wait')}/${C('notify')} require holding the monitor of the object you call them on. Holding a <i>different</i> lock is not enough. This is checked at runtime, not compile time.</p>`, code: `
Object a = new Object(), b = new Object();
try {
    synchronized (a) {
        b.notify();                  // we hold a's monitor, not b's
    }
} catch (IllegalMonitorStateException e) {
    System.out.println("caught: " + e.getClass().getSimpleName());
}` },
      { title: 'What can this print? if instead of while', html: `<p>Two consumers wait with ${C('if (queue.isEmpty()) wait();')}. A producer adds <b>one</b> item and calls ${C('notifyAll')}. Consumer 1 wakes, takes the item. Consumer 2 wakes next, does <b>not</b> re-check (it was an if), and calls ${C('removeFirst()')} on an empty deque → ${C('NoSuchElementException')}. Possible outputs: one "took 1" plus a crash in the other thread — or, if consumer 2 happened to wake first, the same crash in consumer 1. With ${C('while')}, the late consumer simply waits again.</p>` },
      { title: 'Lost notification: waiting for a signal instead of a condition', html: `<p>If thread B calls ${C('lock.notify()')} <b>before</b> thread A reaches ${C('lock.wait()')}, and A waits unconditionally, A sleeps forever: notifications are not queued. The cure is always the same — keep a state variable (${C('boolean done')}) and wait only <b>while</b> it is false. Then order does not matter.</p>`, code: `
class OneShotSignal {
    private boolean fired;                         // the condition, guarded by this
    synchronized void fire() { fired = true; notifyAll(); }
    synchronized void await() throws InterruptedException {
        while (!fired) wait();                     // if fire() already happened, we never wait
    }
}` },
      { title: 'Ping-pong with one shared turn variable', html: `<p>Two threads alternate printing "ping" and "pong" 3 times. Each waits <b>while</b> it is not its turn, prints, flips the turn and calls ${C('notifyAll')}. Output is deterministic: ping pong ping pong ping pong.</p>`, code: `
class PingPong {
    private boolean pingTurn = true;               // guarded by this
    synchronized void play(boolean isPing, int times) throws InterruptedException {
        for (int i = 0; i < times; i++) {
            while (pingTurn != isPing) wait();
            System.out.println(isPing ? "ping" : "pong");
            pingTurn = !pingTurn;
            notifyAll();
        }
    }
}` }
    ],
    deepDive: `<p><b>🟣 What wait() really does</b> (JLS 17.2): the thread must own the monitor; it records its recursion count, <b>fully releases</b> the monitor (even if held reentrantly several times), and is added to the wait set. It leaves the wait set on notify, notifyAll, interrupt, timeout, or a <b>spurious wake-up</b>. It then competes for the monitor like any other thread (it is BLOCKED in a thread dump at that point) and restores its recursion count before returning. If it was interrupted, ${C('wait')} throws ${C('InterruptedException')} and clears the interrupt flag. The JLS also guarantees that a notification is not lost if the chosen thread is concurrently interrupted — another waiter will be woken instead.</p>
<p><b>Thundering herd.</b> ${C('notifyAll')} with 1,000 waiters wakes all of them; 999 re-acquire the lock one by one just to discover they must wait again — O(n) context switches per state change. This is why ${C('java.util.concurrent')} uses ${C('Condition')} objects (several wait sets per lock: "notFull", "notEmpty") and ${C('signal()')}: it wakes exactly one thread of the right kind. ${C('ArrayBlockingQueue')} is literally a bounded buffer with one ${C('ReentrantLock')} and two Conditions.</p>
<p><b>Nested monitor lockout.</b> Calling ${C('inner.wait()')} while also holding an <b>outer</b> lock releases only the inner monitor. The thread that would notify you needs the outer lock first → it blocks forever. Never wait while holding more than one lock.</p>
<p><b>Visibility comes free.</b> Because guarded blocks run inside ${C('synchronized')}, the state variables need no ${C('volatile')}: the notifier's unlock happens-before the waiter's re-lock. That is a frequent interview follow-up ("does the turn flag need to be volatile?" → no, it is always accessed under the same lock).</p>
<p><b>In modern code</b> you rarely write wait/notify directly: use ${C('BlockingQueue')}, ${C('CountDownLatch')}, ${C('Semaphore')}, ${C('CompletableFuture')} (next module). But interviewers still ask for it because it proves you understand monitors, and the LeetCode concurrency set (1114–1117, 1195, 1226) is solvable with nothing else.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> the LeetCode concurrency problems and "bounded buffer with wait/notify" are thoroughly memorised by every assistant — producing the code is no longer impressive. What still matters is explaining <b>why</b> each line is there. <b>Use AI as a partner:</b> <code>Here is my wait/notify solution. Generate an adversarial schedule (thread order + spurious wake-ups) that breaks it, or argue why none exists.</code></p>
<p><b>Where AI goes wrong:</b> ${C('if')} instead of ${C('while')} in less common variants, ${C('notify')} where waiters are heterogeneous, calling ${C('wait')} on the wrong object (e.g. ${C('this.wait()')} inside ${C('synchronized (lock)')}), swallowing ${C('InterruptedException')}, or mixing ${C('Thread.sleep')} polling with locks. It may also suggest wait/notify where a ${C('CountDownLatch')} or ${C('BlockingQueue')} is clearly better. <b>What you must still own:</b> the guarded-block idiom, the notify-vs-notifyAll rule, and recognising when to stop hand-rolling and use ${C('java.util.concurrent')}.</p>`,
    problems: [{
      title: 'Build a CountDownLatch from wait/notifyAll',
      level: 'Medium', tags: ['wait/notify', 'guarded block', 'synchronizer'], companies: ['Microsoft', 'Adobe', 'Walmart'],
      statement: `<p>Implement ${C('SimpleLatch(int count)')} with ${C('countDown()')}, ${C('await()')} and ${C('getCount()')}. ${C('await')} blocks until the count reaches zero (returns immediately if already zero); ${C('countDown')} decrements (never below zero) and releases <b>all</b> waiters when it hits zero. Use only ${C('synchronized')}, ${C('wait')} and ${C('notifyAll')}.</p>`,
      constraints: `0 ≤ count ≤ 10<sup>6</sup>; any number of awaiting threads; countDown may be called more times than count (extra calls are no-ops). await must respond to interruption.`,
      example: `<p>Latch(3). Main calls ${C('await()')} → WAITING. Workers W1, W2, W3 each call ${C('countDown()')} → 2, 1, ${H.c('g', '0 → main wakes')}. A thread that calls ${C('await()')} later returns immediately.</p>`,
      brute: {
        why: `<p>Busy-waiting on a plain ${C('int')}: ${C('while (count > 0) {}')}. Burns a full core per waiter, and since ${C('count')} is not volatile the JIT may hoist the read so the waiter <b>never</b> sees zero. ${C('count--')} from several workers is also a lost-update race, so the count may never reach zero at all.</p>`,
        code: `
class SpinLatch {
    private int count;                               // plain, unsynchronized
    SpinLatch(int count) { this.count = count; }
    void countDown() { if (count > 0) count--; }     // check-then-act + read-modify-write race
    void await() { while (count > 0) { } }           // may spin forever (hoisted read), wastes a core
}`
      },
      mcq: { q: 'Inside <code>await()</code> the thread calls <code>wait()</code> while holding the latch\'s lock. How can workers call the synchronized <code>countDown()</code> at the same time?', options: ['They cannot — this deadlocks', 'wait() releases the latch\'s monitor while waiting and re-acquires it before returning', 'countDown does not need the lock', 'Java lets two threads own a monitor during wait()'], answer: 1, explain: 'wait() atomically releases the monitor and parks the thread; that is exactly what lets the notifier enter. When woken, the waiter must re-acquire the monitor before wait() returns.' },
      hints: [
        `<p>Hint 1: the condition waiters care about is ${C('count == 0')}. It is a single int guarded by the latch's own monitor.</p>`,
        `<p>Hint 2: ${C('await')}: ${C('while (count > 0) wait();')}. ${C('countDown')}: if count &gt; 0, decrement; if it just became 0, ${C('notifyAll()')}.</p>`,
        `<p>Hint 3: ${C('notifyAll')}, not ${C('notify')}: <b>every</b> waiter must be released, not one. A ${C('notify')} when count is still positive is wasted work — only notify on the 1 → 0 transition. Let InterruptedException propagate from await.</p>`
      ],
      tests: { sig: 'int string[] -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(int count, String[] ops) throws Exception {
    SimpleLatch latch;
    try { latch = new SimpleLatch(count); } catch (IllegalArgumentException e) { return new String[]{ "IAE" }; }
    List<String> out = new ArrayList<>();
    List<Thread> waiters = new ArrayList<>();
    AtomicInteger finished = new AtomicInteger(), interrupted = new AtomicInteger();
    for (String op : ops) {
      String[] p = op.split(":");
      switch (p[0]) {
        case "down": latch.countDown(); break;
        case "count": out.add(String.valueOf(latch.getCount())); break;
        case "await": latch.await(); out.add("returned"); break;
        case "wait": {
          int n = Integer.parseInt(p[1]);
          for (int i = 0; i < n; i++) {
            Thread t = new Thread(() -> {
              try { latch.await(); finished.incrementAndGet(); } catch (InterruptedException e) { interrupted.incrementAndGet(); }
            });
            waiters.add(t); t.start();
          }
          long end = System.nanoTime() + 20_000_000_000L;
          boolean all;
          do {
            all = true;
            for (Thread t : waiters) if (t.getState() != Thread.State.WAITING) all = false;
            if (!all) Thread.onSpinWait();
          } while (!all && System.nanoTime() < end);
          int w = 0; for (Thread t : waiters) if (t.getState() == Thread.State.WAITING) w++;
          out.add("waiting:" + w);
          break;
        }
        case "release": for (Thread t : waiters) t.join(); out.add("released:" + finished.get()); break;
        case "interrupt": { Thread t = waiters.get(0); t.interrupt(); t.join(); out.add("interrupted:" + (interrupted.get() == 1)); break; }
      }
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
          [[3, ['wait:2', 'count', 'down', 'down', 'count', 'down', 'release']], ['waiting:2', '3', '1', 'released:2']],
          [[0, ['await', 'count']], ['returned', '0']],
          [[1, ['down', 'down', 'down', 'count']], ['0']],
          [[5, ['wait:1', 'interrupt', 'count']], ['waiting:1', 'interrupted:true', '5']],
          [[-1, []], ['IAE']],
          [[1, ['down', 'await', 'count']], ['returned', '0']],
          [[2, ['wait:50', 'down', 'down', 'release']], ['waiting:50', 'released:50']],
          [[1000000, { $concat: [{ $rep: 'down', n: 999999 }, ['count', 'down', 'count']] }], ['1', '0']]
        ] },
      solution: {
        approach: `<p><b>Guarded block on one int.</b> All access to ${C('count')} is under the latch's monitor, so no volatile is needed. Waiters loop on the guard ${C('count > 0')} (protecting against spurious wake-ups). The thread that moves the count from 1 to 0 calls ${C('notifyAll')}, waking every waiter; each re-acquires the monitor, sees 0, and returns. Once at zero the latch stays open forever (no reset), matching ${C('java.util.concurrent.CountDownLatch')}.</p>`,
        code: `
class SimpleLatch {
    private int count;                                  // guarded by "this"

    SimpleLatch(int count) {
        if (count < 0) throw new IllegalArgumentException("count < 0");
        this.count = count;
    }

    synchronized void countDown() {
        if (count > 0 && --count == 0) notifyAll();     // only the 1 → 0 transition opens the gate
    }

    synchronized void await() throws InterruptedException {
        while (count > 0) wait();                       // while: spurious wake-ups are allowed
    }

    synchronized int getCount() { return count; }

    public static void main(String[] args) throws InterruptedException {
        SimpleLatch latch = new SimpleLatch(3);
        for (int i = 1; i <= 3; i++) {
            final int id = i;
            new Thread(() -> {
                System.out.println("worker " + id + " ready");
                latch.countDown();
            }).start();
        }
        latch.await();                                  // returns only after all three counted down
        System.out.println("all workers ready, count=" + latch.getCount());   // always the last line
    }
}`,
        dry: { head: ['event', 'thread', 'count before → after', 'action', 'main state'], rows: [
          ['await()', 'main', '3', 'guard true → wait() (lock released)', 'WAITING'],
          ['countDown()', 'W2', '3 → 2', 'not zero: no notify', 'WAITING'],
          ['countDown()', 'W1', '2 → 1', 'not zero: no notify', 'WAITING'],
          ['countDown()', 'W3', '1 → 0', '<span class="c-g">notifyAll()</span>', 'BLOCKED → RUNNABLE'],
          ['wait() returns', 'main', '0', 'guard false → return', 'RUNNABLE']
        ] },
        complexity: `<p>countDown O(1); await O(1) apart from waiting; the final notifyAll wakes all W waiters, costing O(W) lock hand-offs once.</p>`,
        followUps: ['Add await(long timeout, TimeUnit unit) returning boolean.', 'How would you make it reusable (a cyclic barrier)?', 'Why does the real CountDownLatch use AQS instead of a monitor?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Deadlock, livelock, starvation
     ====================================================================== */
  topics.push({
    title: 'Deadlock, Livelock & Starvation: Diagnose, Prevent, Recover',
    analogy: `<p><b>Deadlock</b>: two cars meet on a one-lane bridge from opposite ends; each waits for the other to reverse; neither ever does — total silence. <b>Livelock</b>: two very polite people in a corridor both step left, then both step right, then both left… they are <b>busy moving</b> but nobody gets past. <b>Starvation</b>: at a busy bar, the bartender always serves whoever shouts loudest; the quiet customer is never served even though the bar is working fine for everyone else.</p>`,
    explain: `<p><b>🟢 Three ways concurrent code stops making progress:</b></p>
${H.table(['problem', 'threads are…', 'CPU', 'progress', 'thread dump shows'], [
  ['<b class="c-r">Deadlock</b>', 'blocked forever, each waiting for a lock another holds', 'idle', 'none (for those threads)', 'BLOCKED + "Found one Java-level deadlock"'],
  ['<b class="c-y">Livelock</b>', 'running, retrying, reacting to each other', 'busy', 'none', 'RUNNABLE, stacks keep changing'],
  ['<b class="c-p">Starvation</b>', 'some get the resource repeatedly, one never does', 'busy', 'system yes, victim no', 'victim BLOCKED/WAITING a long time']
])}
<p><b>The four Coffman conditions</b> — a deadlock is possible only if <b>all four</b> hold. Break any one and deadlock is impossible:</p>
${H.table(['condition', 'meaning', 'how to break it in Java'], [
  ['Mutual exclusion', 'a lock is held by one thread at a time', 'use lock-free / immutable data where possible'],
  ['Hold and wait', 'a thread holds one lock while waiting for another', 'acquire everything at once (one coarse lock), or release before acquiring'],
  ['No preemption', 'nobody can take a lock away from its holder', C('tryLock(timeout)') + ': give up and release what you hold (ReentrantLock, next module)'],
  ['Circular wait', 'T1 waits for T2 waits for … T1', '<b>global lock ordering</b> — always acquire locks in the same order (most common fix)']
])}
<p><b>The classic lock-ordering deadlock</b>: ${C('transfer(a, b)')} locks a then b; at the same moment ${C('transfer(b, a)')} locks b then a. Each holds one and waits for the other forever. The order looks fixed in the source code ("from then to") but depends on the <b>arguments</b> — a <b>dynamic</b> lock-order deadlock. Fix: order by something stable and unique (account id, ${C('System.identityHashCode')} with a tie-breaker lock).</p>
<p><b>Other sources:</b> calling an <b>alien method</b> (listener, callback, overridable method) while holding a lock — it might take another lock in the opposite order. Rule: make <b>open calls</b> (call out with no lock held). Also <b>resource deadlocks</b>: a task in a single-thread executor that submits and waits for another task in the <b>same</b> executor waits forever (thread-starvation deadlock); JDBC connection pools of size N with N threads each needing two connections.</p>
<p><b>Livelock</b> usually comes from symmetric retry logic: "if I can't get the second lock, release the first and retry immediately". If both threads do this in lockstep, they retry forever. Fix: <b>randomized back-off</b> (jitter) breaks the symmetry — the same trick Ethernet and distributed systems use.</p>
<p><b>Starvation</b> comes from unfair scheduling: ${C('synchronized')} is not fair (barging allowed), a reader-preferring read-write lock can starve writers, a thread that holds a lock for a long time starves others, and thread priorities can (on some OSes) starve low-priority threads. Fixes: fair locks (${C('new ReentrantLock(true)')}), FIFO queues, shorter critical sections, writer preference.</p>`,
    clues: [
      '"Application <b>hangs</b>, CPU near 0%, threads BLOCKED" → deadlock; take a thread dump (jstack)',
      '"<b>Bank transfer</b> between two accounts with two locks" → lock ordering by account id',
      '"CPU at 100% but <b>no progress</b>, logs show endless retries" → livelock; add randomized back-off',
      '"One thread <b>never gets</b> its turn" / writers never get the RW lock → starvation; fairness',
      '"<b>Dining philosophers</b>" → break circular wait (ordering) or limit diners (semaphore)',
      '"Name the <b>4 conditions</b> for deadlock" → Coffman: mutual exclusion, hold-and-wait, no preemption, circular wait',
      '"How do you <b>detect</b> a deadlock in production?" → jstack / jcmd Thread.print / ThreadMXBean.findDeadlockedThreads / JFR'
    ],
    code: [`
import java.lang.management.*;

public class DeadlockDemo {
    static final Object A = new Object(), B = new Object();

    static void pause(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(() -> {
            synchronized (A) {
                pause(50);                                  // makes the bad interleaving near-certain
                synchronized (B) { System.out.println("t1 got both"); }
            }
        }, "t1");
        Thread t2 = new Thread(() -> {
            synchronized (B) {                              // OPPOSITE order → circular wait
                pause(50);
                synchronized (A) { System.out.println("t2 got both"); }
            }
        }, "t2");
        t1.setDaemon(true); t2.setDaemon(true);             // lets this demo exit although they are stuck
        t1.start(); t2.start();
        Thread.sleep(300);

        ThreadMXBean mx = ManagementFactory.getThreadMXBean();
        long[] ids = mx.findDeadlockedThreads();            // null when there is no deadlock
        if (ids == null) { System.out.println("no deadlock this time (lucky timing)"); return; }
        for (ThreadInfo info : mx.getThreadInfo(ids)) {
            System.out.println(info.getThreadName() + " is " + info.getThreadState()
                + ", waiting for " + info.getLockName() + " held by " + info.getLockOwnerName());
        }
    }
}`, `
// Livelock-safe retry with randomized back-off (uses tryLock from java.util.concurrent.locks)
class PoliteMover {
    static boolean moveBoth(ReentrantLock first, ReentrantLock second, Runnable action) throws InterruptedException {
        while (true) {
            if (first.tryLock()) {
                try {
                    if (second.tryLock()) {
                        try { action.run(); return true; }
                        finally { second.unlock(); }
                    }
                } finally {
                    first.unlock();
                }
            }
            // Without jitter, two threads can release and retry in perfect lockstep forever (livelock).
            Thread.sleep(ThreadLocalRandom.current().nextInt(1, 10));
        }
    }
}`],
    codeTitle: ['Deadlock on purpose + detection with ThreadMXBean (exits on its own)', 'tryLock + random back-off avoids both deadlock and livelock'],
    viz: [{
      title: 'Wait-for graph: give each thread a lock order and see if they deadlock',
      input: 'T1: A B; T2: B A',
      inputLabel: 'Per thread, the locks it takes in order (e.g. T1: A B; T2: B C; T3: C A)',
      gen: function (input) {
        var specs = clean(input).split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
        var hint = 'Format: T1: A B; T2: B A  (2–4 threads, 1–4 distinct single-letter locks each)';
        if (specs.length < 2 || specs.length > 4) throw new Error(hint);
        var threads = specs.map(function (s) {
          var m = s.match(/^([A-Za-z0-9]{1,4})\s*:\s*(.+)$/);
          if (!m) throw new Error(hint);
          var locks = m[2].trim().toUpperCase().split(/[\s,]+/);
          if (!locks.length || locks.length > 4 || locks.some(function (l) { return !/^[A-Z]$/.test(l); })) throw new Error(hint);
          var seenL = {}; locks.forEach(function (l) { if (seenL[l]) throw new Error('A thread cannot list the same lock twice'); seenL[l] = 1; });
          return { name: m[1], locks: locks, idx: 0, held: [], status: 'running', waitOn: null };
        });
        var tn = {}; threads.forEach(function (t) { if (tn[t.name]) throw new Error('Thread names must be different'); tn[t.name] = 1; });
        var allLocks = [];
        threads.forEach(function (t) { t.locks.forEach(function (l) { if (allLocks.indexOf(l) < 0) allLocks.push(l); }); });
        allLocks.sort();
        var holder = {}, frames = [];
        function graph(cycleEdges, hlNodes) {
          var H_ = 64, nodes = [], edges = [], ehl = {}, hl = {}, tags = {};
          threads.forEach(function (t, i) { nodes.push({ id: 't' + i, label: t.name, x: 14, y: threads.length === 1 ? 32 : 8 + i * (H_ - 16) / (threads.length - 1) }); tags['t' + i] = t.status === 'waiting' ? 'waits ' + t.waitOn : t.status; });
          allLocks.forEach(function (l, j) { nodes.push({ id: 'l' + l, label: 'lock ' + l, x: 76, y: allLocks.length === 1 ? 32 : 8 + j * (H_ - 16) / (allLocks.length - 1), shape: 'box' }); });
          allLocks.forEach(function (l) { if (holder[l] !== undefined) { edges.push(['l' + l, 't' + holder[l], 'held by']); } });
          threads.forEach(function (t, i) { if (t.status === 'waiting') edges.push(['t' + i, 'l' + t.waitOn, 'waits']); });
          (cycleEdges || []).forEach(function (k) { ehl[k] = 'bad'; });
          (hlNodes || []).forEach(function (k) { hl[k[0]] = k[1]; });
          return { type: 'graph', label: 'Wait-for graph (lock → holder, thread → lock it waits for)', directed: true, height: H_, nodes: nodes, edges: edges, ehl: ehl, hl: hl, tags: tags };
        }
        function table() {
          return { type: 'table', label: 'Threads', columns: ['thread', 'lock order', 'holds', 'status'], rows: threads.map(function (t) { return [t.name, t.locks.join(' → '), t.held.join(', ') || '—', t.status === 'waiting' ? 'BLOCKED on ' + t.waitOn : t.status]; }),
            hl: (function () { var h = {}; threads.forEach(function (t, i) { h[i] = t.status === 'waiting' ? 'bad' : t.status === 'done' ? 'done' : ''; }); return h; })() };
        }
        function fr(narr, cyc, hlN) { frames.push({ narr: narr, parts: [graph(cyc, hlN), table()] }); }
        fr('Each thread acquires its locks <b>in the listed order</b>, holds them all, does its work, then releases everything. The scheduler runs them round-robin, one lock attempt per turn — the most dangerous interleaving.');
        var guard = 0;
        while (guard++ < 40) {
          threads.forEach(function (t, i) {
            if (t.status === 'done') return;
            if (t.idx === t.locks.length) {
              t.held.forEach(function (l) { delete holder[l]; });
              var rel = t.held.join(', '); t.held = []; t.status = 'done';
              threads.forEach(function (o) { if (o.status === 'waiting' && holder[o.waitOn] === undefined) { o.status = 'running'; } });
              fr('<b>' + t.name + '</b> holds all its locks, does its work and <b>releases ' + rel + '</b>. Any thread blocked on those locks can now try again.', [], [['t' + i, 'ok']]);
              return;
            }
            var L = t.locks[t.idx];
            if (holder[L] === undefined) {
              holder[L] = i; t.held.push(L); t.idx++; t.status = 'running'; t.waitOn = null;
              fr('<b>' + t.name + '</b> acquires <b>lock ' + L + '</b> (it was free).', [], [['t' + i, 'cur'], ['l' + L, 'ok']]);
            } else if (t.status !== 'waiting' || t.waitOn !== L) {
              t.status = 'waiting'; t.waitOn = L;
              fr('<b>' + t.name + '</b> wants <b>lock ' + L + '</b>, but ' + threads[holder[L]].name + ' holds it → ' + t.name + ' is <b>BLOCKED</b>' + (t.held.length ? ' <i>while still holding ' + t.held.join(', ') + '</i> (hold-and-wait)' : '') + '.', [], [['t' + i, 'bad'], ['l' + L, 'cur']]);
            }
          });
          var active = threads.filter(function (t) { return t.status !== 'done'; });
          if (!active.length) break;
          if (active.every(function (t) { return t.status === 'waiting'; })) {
            // follow wait-for pointers from the first waiting thread to find the cycle
            var start = threads.indexOf(active[0]), seenT = {}, path = [], cur = start;
            while (seenT[cur] === undefined) { seenT[cur] = path.length; path.push(cur); cur = holder[threads[cur].waitOn]; }
            var cyc = path.slice(seenT[cur]), cycEdges = [], hlN = [];
            cyc.forEach(function (ti) { var l = threads[ti].waitOn; cycEdges.push('t' + ti + '-l' + l); cycEdges.push('l' + l + '-t' + holder[l]); hlN.push(['t' + ti, 'bad']); hlN.push(['l' + l, 'bad']); });
            fr('<span class="c-r"><b>DEADLOCK.</b></span> Every remaining thread is blocked, and the red edges form a <b>cycle</b>: ' + cyc.map(function (ti) { return threads[ti].name + ' waits for ' + threads[ti].waitOn; }).join(' → ') + ' → back to the start. No one will ever release anything. All four Coffman conditions hold.', cycEdges, hlN);
            frames.push({ narr: 'Fix: impose a <b>global order</b>. If every thread takes locks in alphabetical order (e.g. <b>' + threads.map(function (t) { return t.name + ': ' + t.locks.slice().sort().join(' '); }).join('; ') + '</b>), a cycle is impossible: a thread holding lock X only ever waits for a lock "greater" than X, and you cannot go "up" forever and come back. Try that input!', parts: [note('Ordering breaks <b>circular wait</b>. Alternatives: tryLock with timeout (breaks no-preemption), one coarse lock (breaks hold-and-wait).', 'How to break it')] });
            return frames;
          }
        }
        frames.push({ narr: '<span class="c-g">No deadlock:</span> every thread finished. With this lock order there is no way to form a cycle' + (threads.every(function (t) { return t.locks.join('') === t.locks.slice().sort().join(''); }) ? ' — all threads acquire locks in the same global (alphabetical) order.' : ' for this schedule (but check other orders before trusting it!).'), parts: [table(), note('Change one thread to take its locks in the reverse order to watch a deadlock form.', 'Experiment')] });
        return frames;
      }
    }, {
      title: 'Livelock: two polite threads in lockstep, then jitter',
      gen: function () {
        var cols = ['round', 'T1 (holds A, wants B)', 'T2 (holds B, wants A)', 'progress'];
        var r = [];
        var f = [];
        function fr(narr, hl, extra) { f.push({ narr: narr, parts: [{ type: 'table', label: 'What each thread does', columns: cols, rows: r.slice(), hl: hl || {} }].concat(extra || []) }); }
        r.push(['1', 'lock A ✓ · tryLock B ✗ · release A', 'lock B ✓ · tryLock A ✗ · release B', 'none']);
        fr('Both use "tryLock the second lock; if it fails, release the first and retry". Round 1: each grabs its first lock at the same instant, fails on the second, politely releases.', { 0: 'bad' });
        r.push(['2', 'lock A ✓ · tryLock B ✗ · release A', 'lock B ✓ · tryLock A ✗ · release B', 'none']);
        fr('Round 2: they retry <b>immediately</b>, in the same rhythm, and collide again. No deadlock (nobody is BLOCKED, they release!), yet nobody progresses.', { 1: 'bad' });
        r.push(['3…∞', 'same', 'same', 'none — CPU 100%']);
        fr('<b>Livelock:</b> threads are RUNNABLE and busy, logs fill with retries, throughput is zero. Harder to spot than deadlock because a thread dump shows "healthy" running threads.', { 2: 'bad' }, [{ type: 'vars', label: 'Symptoms', vals: { CPU: '100%', 'thread states': 'RUNNABLE', progress: 0 }, hl: { progress: 'bad' } }]);
        r.push(['4', 'back off 7 ms (random)', 'back off 2 ms (random)', '—']);
        fr('Fix: after a failed attempt, sleep a <b>random</b> short time. The two threads now retry at different moments.', { 3: 'cur' });
        r.push(['5', 'still sleeping', 'lock B ✓ · lock A ✓ · work · release', '<span class="c-g">T2 done</span>']);
        fr('T2 wakes first and finds both locks free — it completes its work.', { 4: 'ok' });
        r.push(['6', 'lock A ✓ · lock B ✓ · work · release', 'done', '<span class="c-g">T1 done</span>']);
        fr('<span class="c-g">Both finish.</span> Randomized (often exponential) back-off breaks the symmetry — the same idea used by Ethernet collisions, Raft election timeouts and HTTP client retries with jitter.', { 5: 'ok' });
        return f;
      }
    }],
    examples: [
      { title: 'What can this print? The two-lock demo', html: `<p>For the ${C('DeadlockDemo')} above without the sleeps, possible outcomes: "t1 got both" then "t2 got both"; the reverse; or <b>nothing at all</b> (deadlock). With the 50 ms sleeps, deadlock is almost certain. The program still exits only because the threads are daemons — with normal threads it would hang forever and ${C('jstack <pid>')} would print:</p>${P(`Found one Java-level deadlock:
=============================
"t1": waiting to lock monitor 0x... (object 0x...B, a java.lang.Object),
  which is held by "t2"
"t2": waiting to lock monitor 0x... (object 0x...A, a java.lang.Object),
  which is held by "t1"`)}` },
      { title: 'Alien method called under a lock', html: `<p>${C('notifyListeners()')} runs unknown code while holding ${C('this')}. If a listener calls back into another object that locks in the opposite order, you get a deadlock nobody can see by reading one class. Fix: copy the listener list under the lock, then call listeners <b>outside</b> it (an <b>open call</b>).</p>`, code: `
class Thermostat {
    private final List<Consumer<Integer>> listeners = new ArrayList<>();   // guarded by this
    private int temp;

    synchronized void addListener(Consumer<Integer> l) { listeners.add(l); }

    void setTemp(int t) {
        List<Consumer<Integer>> snapshot;
        synchronized (this) {
            temp = t;
            snapshot = new ArrayList<>(listeners);   // copy under the lock
        }
        for (Consumer<Integer> l : snapshot) l.accept(t);   // open call: no lock held
    }
}` },
      { title: 'Thread-starvation deadlock in a single-thread pool', html: `<p>A task running in a single-thread executor submits a second task to the <b>same</b> executor and waits for its result. The second task can never start (the only thread is busy waiting), so the first never finishes. No locks involved — a <b>resource</b> deadlock. Fix: never block on tasks in the same bounded pool; use a separate pool or compose asynchronously (CompletableFuture, next module). The code below uses a timeout so it does not hang.</p>`, code: `
ExecutorService single = Executors.newSingleThreadExecutor();
Future<String> outer = single.submit(() -> {
    Future<String> inner = single.submit(() -> "inner result");   // queued behind us forever
    try {
        return inner.get(200, TimeUnit.MILLISECONDS);             // would block forever without a timeout
    } catch (TimeoutException e) {
        return "starvation deadlock detected (inner never ran)";
    }
});
System.out.println(outer.get());
single.shutdownNow();` },
      { title: 'Starvation with an unfair lock, and the fair fix', html: `<p>A greedy thread re-acquires a lock in a tight loop. Because intrinsic locks allow <b>barging</b>, the greedy thread often wins again immediately and a waiting thread can wait a very long time. A fair ${C('ReentrantLock(true)')} grants the lock to the longest-waiting thread (FIFO), trading throughput for predictability.</p>`, code: `
ReentrantLock fair = new ReentrantLock(true);   // FIFO hand-off, no barging
Runnable greedy = () -> {
    for (int i = 0; i < 1000; i++) {
        fair.lock();
        try { Thread.onSpinWait(); } finally { fair.unlock(); }
    }
};
Thread g = new Thread(greedy);
Thread polite = new Thread(() -> {
    fair.lock();
    try { System.out.println("polite thread got its turn"); } finally { fair.unlock(); }
});
g.start(); polite.start(); g.join(); polite.join();` }
    ],
    deepDive: `<p><b>🟣 Why ordering works (proof sketch).</b> Give every lock a rank. If threads only ever request a lock with a <b>higher</b> rank than every lock they hold, then along any wait-for chain T1 → T2 → … the rank of the requested lock strictly increases. A cycle would need it to come back to a lower rank — impossible. When objects have no natural key, order by ${C('System.identityHashCode')} and, for the rare tie, take an extra global "tie-breaker" lock first (the technique in <i>Java Concurrency in Practice</i>).</p>
<p><b>Recovering.</b> Intrinsic-lock deadlocks are <b>unrecoverable</b> in Java: you cannot interrupt a thread out of a BLOCKED state, and there is no timeout on ${C('synchronized')}. The only cure is restarting the process. That is a strong reason to use ${C('ReentrantLock.tryLock(timeout)')} or ${C('lockInterruptibly()')} in code paths where ordering is hard to guarantee. Databases take the opposite approach: they run a wait-for-graph cycle detector and abort a victim transaction — exactly the graph in the visualizer.</p>
<p><b>Detection in production.</b> ${C('jstack <pid>')} or ${C('jcmd <pid> Thread.print')} print deadlocks involving monitors <b>and</b> ${C('java.util.concurrent')} ownable synchronizers. ${C('ThreadMXBean.findDeadlockedThreads()')} does the same programmatically — some services run it on a watchdog thread and alert. JDK Flight Recorder records ${C('jdk.JavaMonitorBlocked')} events (contention hot spots). Note that deadlocks on ${C('wait/notify')} logic (lost wake-ups) and on external resources (DB rows, connection pools) are <b>invisible</b> to these tools — they just look like WAITING threads.</p>
<p><b>Starvation in detail.</b> Fair locks have much lower throughput (every hand-off is a context switch; no barging), so most code accepts unfairness. Read-write locks need a policy: reader-preference starves writers under constant reads; writer-preference can starve readers. Thread priorities map to OS priorities only with special flags on Linux, so "raise the priority" is rarely a fix. With virtual threads (Java 21), a few long CPU-bound tasks can monopolise the carrier threads, starving thousands of virtual threads — keep CPU-heavy work on a bounded platform pool.</p>
<p><b>Distributed echo.</b> The same three failures appear across services: two services each holding a DB row lock and calling the other (distributed deadlock, broken by timeouts), retry storms without jitter (livelock), and a hot tenant starving others (fair queuing, rate limits). Interviewers love candidates who connect these.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> paste a thread dump into an assistant and it will find the deadlock cycle and name the two code paths in seconds — genuinely useful at 3 a.m. It will also propose the standard lock-ordering fix. <b>Use AI as a partner:</b> <code>List every place in this module where a second lock is acquired while a first is held, with the order of acquisition. Flag any pair acquired in both orders.</code> — a static lock-order audit that is tedious by hand.</p>
<p><b>Where AI goes wrong:</b> it "fixes" deadlocks by deleting a lock (introducing a race), adds ${C('tryLock')} retry loops <b>without</b> back-off (turning deadlock into livelock), orders locks by ${C('hashCode()')} (not unique, can change), or misses deadlocks that span an alien callback. It cannot see production timing, pool sizes or DB lock waits unless you show it. <b>What you must still own:</b> the Coffman conditions, a lock-ordering policy for your codebase, the habit of open calls, and reading a thread dump yourself to verify the AI's story.</p>`,
    problems: [{
      title: 'Deadlock-Free Money Transfer',
      level: 'Medium', tags: ['deadlock', 'lock ordering', 'synchronized'], companies: ['Goldman Sachs', 'PayPal', 'Stripe', 'Morgan Stanley'],
      statement: `<p>Implement ${C('static boolean transfer(Account from, Account to, long amount)')}. It must move money atomically (no thread ever sees money "in flight": the total across all accounts is constant whenever both locks are free), refuse overdrafts and non-positive amounts, and <b>never deadlock</b>, even when one thread calls ${C('transfer(a, b)')} while another calls ${C('transfer(b, a)')}. Each ${C('Account')} has a unique immutable ${C('long id')}.</p>`,
      constraints: `Up to 10<sup>5</sup> accounts, 64 threads, arbitrary concurrent transfers in both directions. Transfer to self returns false.`,
      example: `<p>A(id 1, 100) and B(id 2, 100). Thread X runs transfer(A→B, 1) 10,000 times; thread Y runs transfer(B→A, 1) 10,000 times. Program finishes, and ${H.c('g', 'A + B == 200')}.</p>`,
      brute: {
        why: `<p>Locking ${C('from')} then ${C('to')} looks fixed but depends on the arguments. X holds A and waits for B; Y holds B and waits for A → <b>circular wait</b>, both BLOCKED forever. Using one global lock for all transfers is deadlock-free but serializes the whole bank.</p>`,
        code: `
class NaiveBank {
    static final class Account { final long id; long balance; Account(long id, long b) { this.id = id; balance = b; } }
    static boolean transfer(Account from, Account to, long amount) {
        synchronized (from) {            // X: locks A   |  Y: locks B
            synchronized (to) {          // X: waits B   |  Y: waits A   → deadlock
                if (from.balance < amount) return false;
                from.balance -= amount;
                to.balance += amount;
                return true;
            }
        }
    }
}`
      },
      mcq: { q: 'Which Coffman condition does "always lock the smaller id first" break?', options: ['Mutual exclusion', 'Hold and wait', 'No preemption', 'Circular wait'], answer: 3, explain: 'Threads still hold one lock while waiting for another, and locks still cannot be taken away — but every thread requests locks in increasing id order, so a cycle of waits is impossible.' },
      hints: [
        `<p>Hint 1: the problem is not two locks, it is two locks taken in an <b>argument-dependent</b> order. Make the order depend on something global instead.</p>`,
        `<p>Hint 2: compute ${C('first = from.id < to.id ? from : to')} and ${C('second')} the other; lock first, then second. Do the overdraft check inside both locks.</p>`,
        `<p>Hint 3: edge cases — ${C('from == to')} (would lock the same monitor twice; reentrant, but the transfer is meaningless → return false); ${C('amount <= 0')} → false; readers of balance must also synchronize on the account.</p>`
      ],
      tests: { sig: 'long[] string[] -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(long[] init, String[] ops) throws Exception {
    Bank.Account[] acc = new Bank.Account[init.length];
    for (int i = 0; i < init.length; i++) acc[i] = new Bank.Account(i + 1, init[i]);
    List<String> out = new ArrayList<>();
    for (String op : ops) {
      String[] p = op.split(":");
      switch (p[0]) {
        case "t": out.add(String.valueOf(Bank.transfer(acc[Integer.parseInt(p[1])], acc[Integer.parseInt(p[2])], Long.parseLong(p[3])))); break;
        case "bal": out.add(String.valueOf(acc[Integer.parseInt(p[1])].balance())); break;
        case "total": { long s = 0; for (Bank.Account a : acc) s += a.balance(); out.add(String.valueOf(s)); break; }
        case "nonneg": { boolean ok = true; for (Bank.Account a : acc) if (a.balance() < 0) ok = false; out.add(String.valueOf(ok)); break; }
        case "par": {
          int T = Integer.parseInt(p[1]), N = Integer.parseInt(p[2]), a = Integer.parseInt(p[3]), b = Integer.parseInt(p[4]);
          Thread[] ts = new Thread[T];
          for (int i = 0; i < T; i++) {
            final boolean fwd = i % 2 == 0;
            ts[i] = new Thread(() -> { for (int k = 0; k < N; k++) { if (fwd) Bank.transfer(acc[a], acc[b], 1); else Bank.transfer(acc[b], acc[a], 1); } });
            ts[i].start();
          }
          for (Thread t : ts) t.join();
          break;
        }
        case "ring": {
          int N = Integer.parseInt(p[1]), K = acc.length;
          Thread[] ts = new Thread[K];
          for (int i = 0; i < K; i++) {
            final int from = i, to = (i + 1) % K;
            ts[i] = new Thread(() -> { for (int k = 0; k < N; k++) Bank.transfer(acc[from], acc[to], 1); });
            ts[i].start();
          }
          for (Thread t : ts) t.join();
          break;
        }
        case "mix": {
          int T = Integer.parseInt(p[1]), N = Integer.parseInt(p[2]), K = acc.length;
          Thread[] ts = new Thread[T];
          for (int t = 0; t < T; t++) {
            final int id = t;
            ts[t] = new Thread(() -> { for (int i = 0; i < N; i++) Bank.transfer(acc[(i + id) % K], acc[(i * 7 + id + 1) % K], 1); });
            ts[t].start();
          }
          for (Thread t : ts) t.join();
          break;
        }
      }
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
          [[[100, 100], ['par:2:10000:0:1', 'total', 'nonneg']], ['200', 'true']],
          [[[1000000000, 1000000000], ['par:2:10000:0:1', 'bal:0', 'bal:1']], ['1000000000', '1000000000']],
          [[[100, 50], ['t:0:1:30', 'bal:0', 'bal:1', 't:0:1:71', 't:1:0:80', 'bal:0', 'bal:1']], ['true', '70', '80', 'false', 'true', '150', '0']],
          [[[100, 0], ['t:0:0:5', 't:0:1:0', 't:0:1:-5', 't:0:1:101', 'total']], ['false', 'false', 'false', 'false', '100']],
          [[[10, 0], ['t:0:1:10', 'bal:0', 'bal:1', 't:0:1:1']], ['true', '0', '10', 'false']],
          [[[1000000000, 1000000000, 1000000000], ['ring:20000', 'total', 'bal:0', 'bal:1', 'bal:2']], ['3000000000', '1000000000', '1000000000', '1000000000']],
          [[{ $rep: 1000, n: 100 }, ['mix:64:20000', 'total', 'nonneg']], ['100000', 'true']],
          [[[5, 5], ['par:8:50000:1:0', 'total', 'nonneg']], ['10', 'true']]
        ] },
      solution: {
        approach: `<p><b>Global lock ordering by a unique, immutable key.</b> Every transfer locks the account with the smaller id first. Whatever pair of accounts and directions threads use, they all climb the same id ladder, so no cycle can form. Both locks are held during check + debit + credit, so the move is atomic and the bank total is invariant.</p>`,
        code: `
class Bank {
    static final class Account {
        final long id;                       // unique + immutable → safe global lock order
        private long balance;                // guarded by this account's monitor
        Account(long id, long balance) { this.id = id; this.balance = balance; }
        synchronized long balance() { return balance; }
    }

    static boolean transfer(Account from, Account to, long amount) {
        if (from == to || amount <= 0) return false;
        Account first = from.id < to.id ? from : to;    // always lock the smaller id first
        Account second = (first == from) ? to : from;
        synchronized (first) {
            synchronized (second) {
                if (from.balance < amount) return false; // overdraft check inside both locks
                from.balance -= amount;
                to.balance += amount;
                return true;
            }
        }
    }

    public static void main(String[] args) throws InterruptedException {
        Account a = new Account(1, 100), b = new Account(2, 100);
        Thread x = new Thread(() -> { for (int i = 0; i < 10_000; i++) transfer(a, b, 1); });
        Thread y = new Thread(() -> { for (int i = 0; i < 10_000; i++) transfer(b, a, 1); });
        x.start(); y.start(); x.join(); y.join();       // always finishes
        System.out.println(a.balance() + b.balance()); // 200
    }
}`,
        dry: { head: ['time', 'Thread X: transfer(A→B)', 'Thread Y: transfer(B→A)', 'locks held'], rows: [
          ['t1', 'first = A (id 1) → lock A', 'first = A (id 1) → wants A: BLOCKED', 'A: X'],
          ['t2', 'lock B, move 1, unlock B, unlock A', 'BLOCKED (holds nothing!)', 'A: X, B: X'],
          ['t3', 'returns true', 'lock A, then lock B', 'A: Y, B: Y'],
          ['t4', '—', 'move 1, unlock both, returns true', '—'],
          ['end', '', '', '<span class="c-g">no cycle possible; total stays 200</span>']
        ] },
        complexity: `<p>O(1) per transfer. Two different pairs of accounts proceed in parallel; only transfers sharing an account contend. Without unique ids, order by ${C('System.identityHashCode')} with a global tie-breaker lock for equal hashes.</p>`,
        followUps: ['Transfers involving 3+ accounts (a batch)? Sort all ids, lock in order.', 'Rewrite with ReentrantLock.tryLock(timeout) and random back-off.', 'How would a database implement the same transfer, and how does it detect deadlocks?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Fix the Lost-Update Counter',
    level: 'Easy', tags: ['race condition', 'synchronized', 'atomicity'], companies: ['TCS', 'Infosys', 'Amazon'],
    statement: `<p>Two threads each call ${C('increment()')} 100,000 times on a shared ${C('Counter')}. The program prints numbers like 131,442 instead of 200,000. Make ${C('Counter')} thread-safe so the result is <b>always</b> 200,000, and make ${C('get()')} return an up-to-date value.</p>`,
    constraints: `2–16 threads, up to 10<sup>7</sup> increments total.`,
    example: `<p>Before: ${H.c('r', '131442, 158003, 200000, 119876 …')} (changes every run). After: ${H.c('g', '200000')} every run.</p>`,
    brute: {
      why: `<p>${C('count++')} is LOAD, ADD, STORE. Two threads interleaving between LOAD and STORE overwrite each other's work. The broken version also has no visibility guarantee for ${C('get()')}.</p>`,
      code: `
class Counter {
    private int count;
    void increment() { count++; }      // read-modify-write race
    int get() { return count; }         // may also read a stale value
}`
    },
    mcq: { q: 'Which fix is NOT sufficient on its own?', options: ['Make increment() and get() synchronized', 'Use AtomicInteger.incrementAndGet()', 'Declare count volatile', 'Guard count with a private lock object in both methods'], answer: 2, explain: 'volatile gives visibility, not atomicity: count++ on a volatile is still three steps and still loses updates.' },
    hints: [
      `<p>Hint 1: the bug is atomicity — LOAD, ADD, STORE must become one indivisible step.</p>`,
      `<p>Hint 2: ${C('synchronized')} on both methods (same lock: ${C('this')}).</p>`,
      `<p>Hint 3: the getter needs the lock too, for visibility. Alternative: ${C('AtomicInteger')} (lock-free CAS).</p>`
    ],
    tests: { sig: 'int int -> int', fn: 'chk', harness: { java: `
class Check {
  static int chk(int threads, int n) throws Exception {
    SafeCounter c = new SafeCounter();
    Thread[] ts = new Thread[threads];
    for (int i = 0; i < threads; i++) { ts[i] = new Thread(() -> { for (int k = 0; k < n; k++) c.increment(); }); ts[i].start(); }
    for (Thread t : ts) t.join();
    return c.get();
  }
}` }, cases: [
        [[2, 100000], 200000],
        [[1, 1], 1],
        [[16, 625000], 10000000],
        [[0, 5], 0],
        [[8, 0], 0],
        [[3, 33333], 99999],
        [[4, 1], 4]
      ] },
    solution: {
      approach: `<p>Guard the field with one lock and use it on every access. The increment becomes atomic; the getter sees the latest value via the unlock → lock happens-before edge.</p>`,
      code: `
class SafeCounter {
    private int count;                               // guarded by "this"
    synchronized void increment() { count++; }
    synchronized int get() { return count; }

    public static void main(String[] args) throws InterruptedException {
        SafeCounter c = new SafeCounter();
        Runnable job = () -> { for (int i = 0; i < 100_000; i++) c.increment(); };
        Thread t1 = new Thread(job), t2 = new Thread(job);
        t1.start(); t2.start(); t1.join(); t2.join();
        System.out.println(c.get());                 // always 200000
    }
}`,
      alt: [{ lang: 'java', title: 'Lock-free alternative', code: `
class AtomicCounter {
    private final AtomicInteger count = new AtomicInteger();
    void increment() { count.incrementAndGet(); }    // CAS loop: atomic without a lock
    int get() { return count.get(); }                // volatile read semantics
}` }],
      dry: { head: ['time', 'T1', 'T2', 'count'], rows: [['1', 'lock, 0 → 1, unlock', 'BLOCKED', '1'], ['2', 'BLOCKED', 'lock, 1 → 2, unlock', '2'], ['…', '…', '…', '<span class="c-g">200000</span>']] },
      complexity: `<p>O(1) per call; contention serializes increments. For very hot counters, ${C('LongAdder')} spreads updates across cells.</p>`,
      followUps: ['When would LongAdder beat AtomicInteger?', 'Why is get() synchronized even though reading an int is atomic?']
    }
  });

  practice.push({
    title: 'Stop a Worker Thread Gracefully',
    level: 'Easy', tags: ['volatile', 'interrupt', 'visibility'], companies: ['Microsoft', 'Zoho', 'Cisco'],
    statement: `<p>A ${C('Worker')} runs a loop doing small units of work. Add a ${C('stop()')} method that another thread can call so the worker finishes its current unit and exits <b>promptly</b>. The current code sometimes never stops. Also make it respond to ${C('Thread.interrupt()')}.</p>`,
    constraints: `Single worker thread, any thread may call stop(). The worker must exit within a few milliseconds of stop().`,
    example: `<p>main starts the worker, sleeps 50 ms, calls ${C('stop()')}, then ${C('join(1000)')}. Expected: ${H.c('g', '"worker stopped cleanly after N units"')} and ${C('isAlive() == false')}.</p>`,
    brute: {
      why: `<p>A plain ${C('boolean running')} gives no visibility guarantee; the JIT may hoist the read out of the loop and the worker spins forever. ${C('Thread.stop()')} is not an option: it is unsafe and throws ${C('UnsupportedOperationException')} since JDK 20.</p>`,
      code: `
class BrokenWorker implements Runnable {
    private boolean running = true;               // NOT volatile
    public void run() { long n = 0; while (running) n++; System.out.println("stopped " + n); }
    void stop() { running = false; }              // worker may never see this
}`
    },
    mcq: { q: 'The worker sometimes blocks for a long time in <code>queue.take()</code>. Which stop mechanism reliably wakes it?', options: ['Setting the volatile flag', 'thread.interrupt()', 'Thread.yield()', 'Lowering its priority'], answer: 1, explain: 'A flag is only checked when the loop comes around. interrupt() makes blocking calls like take(), sleep() and wait() throw InterruptedException right away.' },
    hints: [
      `<p>Hint 1: the problem is visibility of the flag, not atomicity — a single writer sets it once.</p>`,
      `<p>Hint 2: ${C('private volatile boolean running')}; loop on ${C('running && !Thread.currentThread().isInterrupted()')}.</p>`,
      `<p>Hint 3: if the loop body blocks (sleep/wait/take), catch ${C('InterruptedException')}, restore the flag and exit.</p>`
    ],
    tests: { sig: 'string -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(String mode) throws Exception {
    int n = mode.equals("many") ? 10 : 1;
    Worker[] ws = new Worker[n]; Thread[] ts = new Thread[n];
    for (int i = 0; i < n; i++) { ws[i] = new Worker(); ts[i] = new Thread(ws[i], "worker-" + i); }
    if (mode.equals("preStop")) ws[0].stop();
    for (Thread t : ts) t.start();
    for (Thread t : ts) while (!t.isAlive() && t.getState() == Thread.State.NEW) Thread.onSpinWait();
    for (int i = 0; i < n; i++) {
      if (mode.equals("interrupt")) ts[i].interrupt();
      else if (mode.equals("both")) { ws[i].stop(); ts[i].interrupt(); }
      else if (mode.equals("stopTwice")) { ws[i].stop(); ws[i].stop(); }
      else ws[i].stop();
    }
    boolean alive = false;
    for (Thread t : ts) { t.join(5000); if (t.isAlive()) alive = true; }
    return "alive=" + alive;
  }
}` }, cases: [
        [['stop'], 'alive=false'],
        [['interrupt'], 'alive=false'],
        [['preStop'], 'alive=false'],
        [['both'], 'alive=false'],
        [['stopTwice'], 'alive=false'],
        [['many'], 'alive=false']
      ] },
    solution: {
      approach: `<p>Cooperative cancellation: a volatile flag for visibility, plus interrupt support for blocking calls. The worker checks both on each iteration and exits cleanly, leaving no half-done work.</p>`,
      code: `
class Worker implements Runnable {
    private volatile boolean running = true;     // volatile: the stop request becomes visible
    private long processed;                      // only the worker thread touches this

    public void run() {
        while (running && !Thread.currentThread().isInterrupted()) {
            processed++;                         // one unit of work
            if (processed % 1_000 == 0) Thread.onSpinWait();
        }
        System.out.println("worker stopped cleanly after " + processed + " units");
    }

    void stop() { running = false; }

    public static void main(String[] args) throws InterruptedException {
        Worker w = new Worker();
        Thread t = new Thread(w, "worker");
        t.start();
        Thread.sleep(50);
        w.stop();                                // or t.interrupt() if it may be blocked
        t.join(1_000);
        System.out.println("alive after stop? " + t.isAlive());   // false
    }
}`,
      dry: { head: ['time', 'main', 'worker', 'running'], rows: [['0 ms', 'start()', 'looping', 'true'], ['50 ms', 'stop() (volatile write)', 'looping', 'false'], ['50.01 ms', 'join()', 'reads false → exits loop, prints', 'false'], ['end', 'prints alive=false', 'TERMINATED', '—']] },
      complexity: `<p>O(1) to stop; worst-case latency = one loop iteration.</p>`,
      followUps: ['Why must you restore the interrupt flag after catching InterruptedException?', 'How does ExecutorService.shutdownNow() stop its workers?']
    }
  });

  practice.push({
    title: 'What Can This Print? start() vs run()',
    level: 'Easy', tags: ['threads', 'start', 'output prediction'], companies: ['Capgemini', 'Accenture', 'Wipro'],
    statement: `<p>Predict <b>every</b> possible output of the snippet below, then change it so the task really runs on the "worker" thread and "main done" is always printed <b>after</b> the task's line.</p>${P(`Thread t = new Thread(() ->
    System.out.println("in " + Thread.currentThread().getName()), "worker");
t.run();
System.out.println("main done");`)}`,
    constraints: `Standard JVM, single invocation from main.`,
    example: `<p>Original: always ${H.c('y', 'in main')} then ${H.c('y', 'main done')} (only one possible output). Fixed: always ${H.c('g', 'in worker')} then ${H.c('g', 'main done')}.</p>`,
    brute: {
      why: `<p>${C('t.run()')} is an ordinary method call on main's stack: no thread is created, the Thread object stays NEW, and ${C('currentThread()')} is main. Many candidates answer "in worker" — that is the trap.</p>`,
      code: `
class RunTrap {
    public static void main(String[] args) {
        Thread t = new Thread(() -> System.out.println("in " + Thread.currentThread().getName()), "worker");
        t.run();                                  // plain call: prints "in main"
        System.out.println("main done");
        System.out.println(t.getState());         // NEW — it never started
    }
}`
    },
    mcq: { q: 'If we only replace run() with start() (no join), how many different outputs are possible?', options: ['1', '2', '3', '4'], answer: 1, explain: '"in worker" / "main done" can appear in either order, so 2 outputs. join() pins the order to 1.' },
    hints: [
      `<p>Hint 1: only ${C('start()')} asks the JVM to create a new thread; ${C('run()')} is just the method the new thread will call.</p>`,
      `<p>Hint 2: after ${C('start()')} the two prints race — order is not guaranteed.</p>`,
      `<p>Hint 3: ${C('t.join()')} before the last print forces ordering (and makes the worker's writes visible).</p>`
    ],
    tests: { io: true, cases: [
        { stdin: '', stdout: 'in worker\nmain done\nTERMINATED' }
      ] },
    solution: {
      approach: `<p>Use ${C('start()')} to get real concurrency, then ${C('join()')} to wait for completion before printing. join gives both ordering and a happens-before edge.</p>`,
      code: `
class RunFixed {
    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(() -> System.out.println("in " + Thread.currentThread().getName()), "worker");
        t.start();                                // new OS thread, its own stack
        t.join();                                 // wait for it to finish
        System.out.println("main done");          // always after "in worker"
        System.out.println(t.getState());         // TERMINATED
    }
}`,
      dry: { head: ['version', 'line 1', 'line 2', '#outputs'], rows: [['run()', 'in main', 'main done', '1'], ['start(), no join', 'in worker / main done', 'main done / in worker', '2'], ['start() + join()', 'in worker', 'main done', '1']] },
      complexity: `<p>Constant time; the point is semantics, not cost (thread creation ≈ tens of µs).</p>`,
      followUps: ['What does t.start() after t.run() do? (Works — the thread was still NEW.)', 'What does a second t.start() do?']
    }
  });

  practice.push({
    title: 'Make a Lazy Price Cache Thread-Safe',
    level: 'Easy', tags: ['check-then-act', 'synchronized', 'HashMap'], companies: ['Flipkart', 'Swiggy', 'Amazon'],
    statement: `<p>${C('PriceCache.get(sku)')} returns a cached price or loads it with a slow ${C('loader')} and caches it. Under concurrency the slow loader is called several times for the same SKU, and occasionally entries vanish. Make it thread-safe so each SKU is loaded <b>at most once</b>, and report the number of loads.</p>`,
    constraints: `Up to 32 threads, 10<sup>4</sup> distinct SKUs; loader takes ~5 ms and is a pure function.`,
    example: `<p>8 threads all call ${C('get("sku-1")')} at once → loader called ${H.c('g', 'exactly 1')} time, every thread gets the same price.</p>`,
    brute: {
      why: `<p>${C('get → null → load → put')} is check-then-act: several threads see null and all load. Plain ${C('HashMap')} is also not safe for concurrent writes — concurrent resizes can drop entries.</p>`,
      code: `
class UnsafePriceCache {
    private final Map<String, Long> cache = new HashMap<>();
    private final Function<String, Long> loader;
    UnsafePriceCache(Function<String, Long> loader) { this.loader = loader; }
    long get(String sku) {
        Long v = cache.get(sku);                 // check
        if (v == null) {
            v = loader.apply(sku);               // several threads load the same sku
            cache.put(sku, v);                   // concurrent puts can corrupt the HashMap
        }
        return v;
    }
}`
    },
    mcq: { q: 'Which ConcurrentHashMap call performs "get or load once" atomically per key?', options: ['putIfAbsent(k, loader.apply(k))', 'computeIfAbsent(k, loader)', 'get then put', 'containsKey then put'], answer: 1, explain: 'computeIfAbsent runs the mapping function at most once per absent key, atomically. putIfAbsent(k, loader.apply(k)) calls the loader before the check — every thread still loads.' },
    hints: [
      `<p>Hint 1: name the race — check (get null) then act (load + put).</p>`,
      `<p>Hint 2: simplest: make ${C('get')} synchronized so check + load + put is one step.</p>`,
      `<p>Hint 3: that serializes all SKUs; per-key atomicity with ${C('ConcurrentHashMap.computeIfAbsent')} lets different SKUs load in parallel (keep the loader short and non-recursive).</p>`
    ],
    tests: { sig: 'int int int -> int[]', fn: 'chk', harness: { java: `
class Check {
  static int[] chk(int threads, int skus, int calls) throws Exception {
    PriceCache pc = new PriceCache(sku -> Long.parseLong(sku.substring(4)) * 10 + 7);
    AtomicInteger bad = new AtomicInteger();
    Thread[] ts = new Thread[threads];
    for (int t = 0; t < threads; t++) {
      final int id = t;
      ts[t] = new Thread(() -> {
        for (int j = 0; j < calls; j++) {
          int k = (id + j) % skus;
          if (pc.get("sku-" + k) != k * 10L + 7) bad.incrementAndGet();
        }
      });
      ts[t].start();
    }
    for (Thread t : ts) t.join();
    return new int[]{ pc.loads(), bad.get() };
  }
}` }, cases: [
        [[8, 1, 1], [1, 0]],
        [[1, 5, 5], [5, 0]],
        [[32, 10000, 1], [32, 0]],
        [[32, 10000, 100], [131, 0]],
        [[4, 3, 10], [3, 0]],
        [[16, 1, 1000], [1, 0]],
        [[0, 5, 5], [0, 0]],
        [[32, 10000, 10000], [10000, 0]]
      ] },
    solution: {
      approach: `<p>Version 1: one lock around check-load-put (correct, simple, but loads of different SKUs wait for each other). Version 2 (alt): ${C('computeIfAbsent')} on a ConcurrentHashMap gives per-key atomicity — the standard production answer.</p>`,
      code: `
class PriceCache {
    private final Map<String, Long> cache = new HashMap<>();   // guarded by "this"
    private final Function<String, Long> loader;
    private int loads;                                          // guarded by "this"

    PriceCache(Function<String, Long> loader) { this.loader = loader; }

    synchronized long get(String sku) {
        Long v = cache.get(sku);              // check ...
        if (v == null) {
            v = loader.apply(sku);            // ... and act under the same lock: loads at most once
            loads++;
            cache.put(sku, v);
        }
        return v;
    }

    synchronized int loads() { return loads; }
}`,
      alt: [{ lang: 'java', title: 'Per-key atomic version', code: `
class ConcurrentPriceCache {
    private final ConcurrentHashMap<String, Long> cache = new ConcurrentHashMap<>();
    private final AtomicInteger loads = new AtomicInteger();
    private final Function<String, Long> loader;

    ConcurrentPriceCache(Function<String, Long> loader) { this.loader = loader; }

    long get(String sku) {
        return cache.computeIfAbsent(sku, k -> {   // runs at most once per absent key
            loads.incrementAndGet();
            return loader.apply(k);
        });
    }

    int loads() { return loads.get(); }
}` }],
      dry: { head: ['time', 'T1', 'T2', 'loads'], rows: [['1', 'get(sku-1): miss → load', 'BLOCKED', '1'], ['2', 'put, unlock', 'get(sku-1): hit', '1'], ['3', '—', 'returns cached price', '<span class="c-g">1</span>']] },
      complexity: `<p>Synchronized version: O(1) + loader time, fully serialized. computeIfAbsent: only threads asking for the <b>same</b> missing key wait.</p>`,
      followUps: ['What happens if the loader throws?', 'Why must the computeIfAbsent function not modify the same map?']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Print in Order (LeetCode 1114)',
    level: 'Medium', tags: ['wait/notify', 'ordering', 'LeetCode concurrency'], companies: ['Microsoft', 'Apple', 'Bloomberg'],
    statement: `<p>One ${C('Foo')} instance is shared by three threads: A calls ${C('first()')}, B calls ${C('second()')}, C calls ${C('third()')} — started in <b>any</b> order. Guarantee the output is always "firstsecondthird".</p>`,
    constraints: `Threads may start in any order; each method is called exactly once.`,
    example: `<p>Start order C, A, B → output ${H.c('g', 'firstsecondthird')}. C must wait until second has run; B must wait until first has run.</p>`,
    brute: {
      why: `<p>Spin on a plain int ${C('stage')}: wastes CPU and, without volatile, the spinning thread may never see the update (hoisted read) — it can hang.</p>`,
      code: `
class FooSpin {
    private int stage = 1;                                   // NOT volatile
    public void first(Runnable r) { r.run(); stage = 2; }
    public void second(Runnable r) { while (stage != 2) { } r.run(); stage = 3; }
    public void third(Runnable r) { while (stage != 3) { } r.run(); }
}`
    },
    mcq: { q: 'Is notify() enough instead of notifyAll() here?', options: ['Yes, always', 'No: the woken thread might be the wrong one (third waiting while second should go) and the right one would sleep forever', 'Only if stage is volatile', 'Only on x86'], answer: 1, explain: 'Waiters wait for different conditions (stage 2 vs stage 3). notify() could wake the thread whose condition is still false; it re-waits and nobody wakes the right one.' },
    hints: [
      `<p>Hint 1: shared state: ${C('int stage')} = which method may run next.</p>`,
      `<p>Hint 2: second: ${C('while (stage != 2) wait();')}; first sets stage = 2 then ${C('notifyAll()')}.</p>`,
      `<p>Hint 3: all methods synchronized on the same instance so stage needs no volatile.</p>`
    ],
    tests: { sig: 'string int -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(String order, int rounds) throws Exception {
    for (int r = 0; r < rounds; r++) {
      Foo foo = new Foo();
      StringBuffer sb = new StringBuffer();
      Thread[] ts = new Thread[3];
      for (int i = 0; i < 3; i++) {
        char c = order.charAt(i);
        ts[i] = new Thread(() -> {
          try {
            if (c == 'A') foo.first(() -> sb.append("first"));
            else if (c == 'B') foo.second(() -> sb.append("second"));
            else foo.third(() -> sb.append("third"));
          } catch (InterruptedException e) { }
        });
      }
      for (Thread t : ts) t.start();
      for (Thread t : ts) t.join();
      if (!sb.toString().equals("firstsecondthird")) return "bad:" + sb;
    }
    return "ok";
  }
}` }, cases: [
        [['ABC', 1], 'ok'],
        [['ACB', 1], 'ok'],
        [['BAC', 1], 'ok'],
        [['BCA', 1], 'ok'],
        [['CAB', 1], 'ok'],
        [['CBA', 1], 'ok'],
        [['CBA', 3000], 'ok'],
        [['BCA', 3000], 'ok']
      ] },
    solution: {
      approach: `<p>A guarded block per stage. Each method waits until it is its turn, runs, advances the stage, and wakes everyone so the next stage's thread can re-check its guard.</p>`,
      code: `
class Foo {
    private int stage = 1;                       // which method may run next; guarded by this

    public synchronized void first(Runnable printFirst) throws InterruptedException {
        printFirst.run();
        stage = 2;
        notifyAll();
    }

    public synchronized void second(Runnable printSecond) throws InterruptedException {
        while (stage != 2) wait();
        printSecond.run();
        stage = 3;
        notifyAll();
    }

    public synchronized void third(Runnable printThird) throws InterruptedException {
        while (stage != 3) wait();
        printThird.run();
    }
}`,
      dry: { head: ['event', 'stage', 'effect'], rows: [['C: third()', '1', 'waits'], ['A: first()', '1 → 2', 'prints first, notifyAll'], ['C wakes', '2', 'still ≠ 3 → waits again'], ['B: second()', '2 → 3', 'prints second, notifyAll'], ['C wakes', '3', '<span class="c-g">prints third</span>']] },
      complexity: `<p>O(1) work per method; at most a few wake-ups.</p>`,
      followUps: ['Solve it with two CountDownLatches.', 'Solve it with Semaphores initialised to 0.']
    }
  });

  practice.push({
    title: 'Odd-Even Printer with Two Threads',
    level: 'Medium', tags: ['wait/notify', 'alternation'], companies: ['Amazon', 'Paytm', 'Oracle'],
    statement: `<p>Two threads, "odd" and "even", must print the numbers 1..n in order, alternating: odd prints 1, even prints 2, odd prints 3… Both threads must terminate when done.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>6</sup>. Must work for odd and even n; no busy-waiting.`,
    example: `<p>n = 5 → ${H.c('b', 'odd: 1')}, ${H.c('g', 'even: 2')}, ${H.c('b', 'odd: 3')}, ${H.c('g', 'even: 4')}, ${H.c('b', 'odd: 5')}; both threads exit.</p>`,
    brute: {
      why: `<p>Spinning with ${C('Thread.yield()')} on a volatile counter works but burns two cores. Using ${C('if')} instead of ${C('while')} around wait, or forgetting to wake the partner at the end, causes wrong output or a thread that never exits.</p>`,
      code: `
class SpinOddEven {
    private volatile int next = 1;
    void run(boolean odd, int n) {
        while (next <= n) {
            if ((next % 2 == 1) == odd) { System.out.println(next); next++; }   // only one writer at a time by turn
            else Thread.yield();                                                // burns CPU
        }
    }
}`
    },
    mcq: { q: 'n = 4. After even prints 4, why must it call notifyAll() before exiting?', options: ['It does not need to', 'The odd thread may be waiting for its turn; it must wake to see next > n and exit, or it waits forever', 'To release the lock', 'To print a newline'], answer: 1, explain: 'The waiter re-checks the guard only when woken. If nobody wakes it after the last number, the odd thread stays in WAITING and join() hangs.' },
    hints: [
      `<p>Hint 1: shared ${C('int next')} guarded by one lock; a thread may print only when ${C('next')}'s parity matches it.</p>`,
      `<p>Hint 2: wait while ${C('next <= n')} and it is not my turn; then if ${C('next > n')}, wake partner and exit.</p>`,
      `<p>Hint 3: print, ${C('next++')}, ${C('notifyAll()')}, loop.</p>`
    ],
    tests: { sig: 'int -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(int n) throws Exception {
    PrintStream old = System.out;
    ByteArrayOutputStream buf = new ByteArrayOutputStream();
    System.setOut(new PrintStream(buf, true));
    try {
      OddEvenPrinter p = new OddEvenPrinter(n);
      Thread odd = new Thread(() -> { try { p.run(true); } catch (InterruptedException e) { } }, "odd");
      Thread even = new Thread(() -> { try { p.run(false); } catch (InterruptedException e) { } }, "even");
      odd.start(); even.start(); odd.join(); even.join();
    } finally { System.setOut(old); }
    String[] lines = buf.toString().split("\\n");
    if (buf.size() == 0) lines = new String[0];
    if (n <= 10) return String.join("|", lines);
    boolean ok = lines.length == n;
    for (int i = 0; ok && i < lines.length; i++) ok = lines[i].trim().equals((((i + 1) % 2 == 1) ? "odd" : "even") + ": " + (i + 1));
    return lines.length + " lines ok=" + ok;
  }
}` }, cases: [
        [[5], 'odd: 1|even: 2|odd: 3|even: 4|odd: 5'],
        [[1], 'odd: 1'],
        [[2], 'odd: 1|even: 2'],
        [[4], 'odd: 1|even: 2|odd: 3|even: 4'],
        [[10], 'odd: 1|even: 2|odd: 3|even: 4|odd: 5|even: 6|odd: 7|even: 8|odd: 9|even: 10'],
        [[0], ''],
        [[11], '11 lines ok=true'],
        [[100000], '100000 lines ok=true']
      ] },
    solution: {
      approach: `<p>One monitor, one turn variable. Each thread waits for its parity, prints, advances, and notifies. The termination check is part of the guard so both threads leave cleanly for any n.</p>`,
      code: `
class OddEvenPrinter {
    private final int n;
    private int next = 1;                                       // guarded by this
    OddEvenPrinter(int n) { this.n = n; }

    void run(boolean odd) throws InterruptedException {
        synchronized (this) {
            while (true) {
                while (next <= n && (next % 2 == 1) != odd) wait();   // not my turn yet
                if (next > n) { notifyAll(); return; }                // done: let the partner exit too
                System.out.println(Thread.currentThread().getName() + ": " + next);
                next++;
                notifyAll();
            }
        }
    }

    public static void main(String[] args) throws InterruptedException {
        OddEvenPrinter p = new OddEvenPrinter(5);
        Thread odd = new Thread(() -> { try { p.run(true); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } }, "odd");
        Thread even = new Thread(() -> { try { p.run(false); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } }, "even");
        odd.start(); even.start();
        odd.join(); even.join();
    }
}`,
      dry: { head: ['next', 'odd thread', 'even thread'], rows: [['1', 'prints 1', 'waits'], ['2', 'waits', 'prints 2'], ['3', 'prints 3', 'waits'], ['…', '…', '…'], ['6 (n=5)', 'sees next &gt; n → exits', 'woken → exits']] },
      complexity: `<p>O(n) prints, about n context switches (each number hands the lock to the other thread).</p>`,
      followUps: ['Generalise to k threads printing round-robin.', 'Replace wait/notify with two Semaphores.']
    }
  });

  practice.push({
    title: 'Design a Bounded Blocking Queue (LeetCode 1188)',
    level: 'Medium', tags: ['wait/notify', 'producer-consumer', 'circular buffer'], companies: ['LinkedIn', 'Uber', 'Google'],
    statement: `<p>Implement ${C('BoundedBlockingQueue(int capacity)')} with ${C('enqueue(int)')} (blocks while full), ${C('dequeue()')} (blocks while empty) and ${C('size()')}. Multiple producers and consumers call concurrently. Use a fixed array (no ${C('java.util.concurrent')}).</p>`,
    constraints: `1 ≤ capacity ≤ 30, up to 8 producers and 8 consumers, 40 operations each.`,
    example: `<p>capacity 2: enqueue 1, enqueue 2, enqueue 3 ${H.c('y', '(blocks)')}, dequeue → 1 ${H.c('g', '(unblocks the producer)')}, dequeue → 2, dequeue → 3. FIFO order is preserved.</p>`,
    brute: {
      why: `<p>Using ${C('if')} + ${C('notify')}: a woken consumer may find the queue already emptied by another consumer and read garbage; notify may wake a producer when a consumer was needed, stalling everyone (lost wake-up).</p>`,
      code: `
class FlakyQueue {
    private final Deque<Integer> q = new ArrayDeque<>();
    private final int cap;
    FlakyQueue(int cap) { this.cap = cap; }
    synchronized void enqueue(int x) throws InterruptedException {
        if (q.size() == cap) wait();      // if: wrong after spurious/stolen wake-ups
        q.addLast(x);
        notify();                          // may wake the wrong kind of thread
    }
    synchronized int dequeue() throws InterruptedException {
        if (q.isEmpty()) wait();
        int x = q.removeFirst();           // NoSuchElementException possible
        notify();
        return x;
    }
}`
    },
    mcq: { q: 'What does a circular array buy you over an ArrayDeque here?', options: ['Thread safety', 'A hard, preallocated capacity with O(1) enqueue/dequeue and no resizing', 'Fairness', 'Nothing'], answer: 1, explain: 'Thread safety comes from the monitor either way; the array makes the bound explicit and avoids allocation, like ArrayBlockingQueue.' },
    hints: [
      `<p>Hint 1: state = array, head, tail, size — all guarded by ${C('this')}.</p>`,
      `<p>Hint 2: enqueue: ${C('while (size == cap) wait();')} write at tail, tail = (tail+1) % cap, size++, notifyAll.</p>`,
      `<p>Hint 3: dequeue mirrors it with ${C('while (size == 0)')}. size() is synchronized too.</p>`
    ],
    tests: { sig: 'int int int int -> long[]', fn: 'chk', harness: { java: `
class Check {
  static long[] chk(int cap, int producers, int consumers, int perP) throws Exception {
    BoundedBlockingQueue q = new BoundedBlockingQueue(cap);
    int total = producers * perP, perC = total / consumers;
    AtomicLong sum = new AtomicLong(); AtomicInteger count = new AtomicInteger(), orderBad = new AtomicInteger();
    Thread[] ts = new Thread[producers + consumers];
    for (int p = 0; p < producers; p++) {
      final int id = p;
      ts[p] = new Thread(() -> { try { for (int k = 0; k < perP; k++) q.enqueue(id * perP + k); } catch (InterruptedException e) { } });
    }
    for (int c = 0; c < consumers; c++) {
      ts[producers + c] = new Thread(() -> {
        int[] last = new int[producers];
        Arrays.fill(last, -1);
        try {
          for (int k = 0; k < perC; k++) {
            int v = q.dequeue();
            sum.addAndGet(v); count.incrementAndGet();
            int prod = v / perP, idx = v % perP;
            if (idx <= last[prod]) orderBad.incrementAndGet();
            last[prod] = idx;
          }
        } catch (InterruptedException e) { }
      });
    }
    for (Thread t : ts) t.start();
    for (Thread t : ts) t.join();
    return new long[]{ count.get(), sum.get(), orderBad.get(), q.size() };
  }
}` }, cases: [
        [[2, 1, 1, 3], [3, 3, 0, 0]],
        [[1, 1, 1, 1000], [1000, 499500, 0, 0]],
        [[30, 8, 8, 40], [320, 51040, 0, 0]],
        [[1, 8, 8, 40], [320, 51040, 0, 0]],
        [[5, 3, 1, 30], [90, 4005, 0, 0]],
        [[5, 1, 3, 30], [30, 435, 0, 0]],
        [[2, 4, 2, 5], [20, 190, 0, 0]],
        [[3, 8, 8, 500], [4000, 7998000, 0, 0]]
      ] },
    solution: {
      approach: `<p>Classic monitor-based bounded buffer over a ring array. Two guards share one wait set, so ${C('notifyAll')} is required for correctness; the while loops make spurious and stolen wake-ups harmless.</p>`,
      code: `
class BoundedBlockingQueue {
    private final int[] items;
    private int head, tail, size;                 // guarded by this

    public BoundedBlockingQueue(int capacity) { items = new int[capacity]; }

    public synchronized void enqueue(int element) throws InterruptedException {
        while (size == items.length) wait();      // full
        items[tail] = element;
        tail = (tail + 1) % items.length;
        size++;
        notifyAll();
    }

    public synchronized int dequeue() throws InterruptedException {
        while (size == 0) wait();                 // empty
        int x = items[head];
        head = (head + 1) % items.length;
        size--;
        notifyAll();
        return x;
    }

    public synchronized int size() { return size; }
}`,
      dry: { head: ['op', 'head', 'tail', 'size', 'array'], rows: [['enqueue 1', '0', '1', '1', '[1, _]'], ['enqueue 2', '0', '0', '2', '[1, 2]'], ['enqueue 3', '—', '—', '2', 'producer waits'], ['dequeue → 1', '1', '0', '1', '[_, 2] + notifyAll'], ['enqueue 3 (resumes)', '1', '1', '2', '[3, 2]']] },
      complexity: `<p>O(1) per operation; notifyAll may cause extra wake-ups under heavy contention (two Conditions fix that).</p>`,
      followUps: ['Rewrite with ReentrantLock and notFull/notEmpty Conditions.', 'Add offer(x, timeout) that gives up after the timeout.']
    }
  });

  practice.push({
    title: 'Find the Deadlock in a Lock Snapshot',
    level: 'Medium', tags: ['deadlock', 'wait-for graph', 'cycle detection'], companies: ['Oracle', 'Databricks', 'Atlassian'],
    statement: `<p>You get a snapshot from a monitoring tool: ${C('holder')} maps each lock to the thread holding it, and ${C('waitsFor')} maps each blocked thread to the single lock it is waiting for. Return the threads of one deadlock cycle (in wait order, starting anywhere), or an empty list if there is none.</p>`,
    constraints: `Up to 10<sup>5</sup> threads and locks. A thread waits for at most one lock; a lock has at most one holder.`,
    example: `<p>holder = {A: T1, B: T2, C: T3}, waitsFor = {T1: B, T2: C, T3: A} → ${H.c('r', '[T1, T2, T3]')} (T1 → T2 → T3 → T1). With waitsFor = {T1: B} only → ${H.c('g', '[]')}.</p>`,
    brute: {
      why: `<p>From every thread, walk the wait chain up to N steps and see if you return to the start: O(N²) in the worst case (long chains walked again and again). Fine for 100 threads, too slow for 10<sup>5</sup>.</p>`,
      code: `
class SlowDetector {
    static List<String> find(Map<String, String> holder, Map<String, String> waitsFor) {
        for (String start : waitsFor.keySet()) {
            List<String> path = new ArrayList<>();
            String t = start;
            for (int step = 0; step <= waitsFor.size() && t != null; step++) {
                path.add(t);
                String lock = waitsFor.get(t);
                t = lock == null ? null : holder.get(lock);
                if (start.equals(t)) return path;            // came back to start
            }
        }
        return List.of();
    }
}`
    },
    mcq: { q: 'Each thread has at most one outgoing wait-for edge. What structure is the wait-for graph then?', options: ['A tree', 'A functional graph: each component has at most one cycle, so a single pointer walk with colours finds it in O(N)', 'A DAG always', 'A complete graph'], answer: 1, explain: 'Out-degree ≤ 1 means following pointers is deterministic; marking nodes visited on the current path vs finished gives linear-time cycle detection.' },
    hints: [
      `<p>Hint 1: edge T → holder(waitsFor(T)). Deadlock ⇔ a cycle in this thread-to-thread graph.</p>`,
      `<p>Hint 2: three colours: unvisited, on current path, finished. Walk from each unvisited thread; stop at null or a non-unvisited node.</p>`,
      `<p>Hint 3: if you stop at a node "on current path", the cycle is the path suffix from that node. Mark the path finished otherwise, so no node is walked twice → O(N).</p>`
    ],
    tests: { sig: 'string[] string[] -> list<string>', fn: 'chk', harness: { java: `
class Check {
  static List<String> chk(String[] h, String[] w) {
    Map<String, String> holder = new HashMap<>(), waits = new HashMap<>();
    if (h.length == 1 && h[0].startsWith("ring:") || h.length == 1 && h[0].startsWith("chain:")) {
      boolean ring = h[0].startsWith("ring:");
      int n = Integer.parseInt(h[0].substring(h[0].indexOf(':') + 1));
      for (int i = 0; i < n; i++) {
        holder.put("L" + i, "T" + i);
        if (ring || i < n - 1) waits.put("T" + i, "L" + ((i + 1) % n));
      }
    } else {
      for (String s : h) { String[] p = s.split(":"); holder.put(p[0], p[1]); }
      for (String s : w) { String[] p = s.split(":"); waits.put(p[0], p[1]); }
    }
    List<String> cyc = new ArrayList<>(DeadlockDetector.findDeadlock(holder, waits));
    if (cyc.isEmpty()) return cyc;
    int m = 0;
    for (int i = 1; i < cyc.size(); i++) if (cyc.get(i).compareTo(cyc.get(m)) < 0) m = i;
    List<String> rot = new ArrayList<>();
    for (int i = 0; i < cyc.size(); i++) rot.add(cyc.get((m + i) % cyc.size()));
    if (rot.size() > 10) return List.of(String.valueOf(rot.size()), rot.get(0), rot.get(1), rot.get(2));
    return rot;
  }
}` }, cases: [
        [[['A:T1', 'B:T2', 'C:T3'], ['T1:B', 'T2:C', 'T3:A']], ['T1', 'T2', 'T3']],
        [[['A:T1', 'B:T2', 'C:T3'], ['T1:B']], []],
        [[[], []], []],
        [[['A:T1'], ['T1:A']], ['T1']],
        [[['A:T1', 'B:T2'], ['T1:B', 'T2:A']], ['T1', 'T2']],
        [[['A:T1', 'B:T2'], ['T0:A', 'T1:B', 'T2:A']], ['T1', 'T2']],
        [[['A:T1', 'B:T2'], ['T1:Z', 'T2:A']], []],
        [[['A:T1', 'B:T2', 'C:T3', 'D:T4'], ['T1:B', 'T3:D']], []],
        [[['ring:100000'], []], ['100000', 'T0', 'T1', 'T2']],
        [[['chain:100000'], []], []]
      ] },
    solution: {
      approach: `<p>Pointer-walking cycle detection on a functional graph with path colouring — exactly what ${C('ThreadMXBean.findDeadlockedThreads')} and database deadlock detectors do conceptually.</p>`,
      code: `
class DeadlockDetector {
    static List<String> findDeadlock(Map<String, String> holder, Map<String, String> waitsFor) {
        Map<String, Integer> state = new HashMap<>();          // absent = new, 1 = on path, 2 = finished
        for (String start : waitsFor.keySet()) {
            if (state.containsKey(start)) continue;
            List<String> path = new ArrayList<>();
            String t = start;
            while (t != null && !state.containsKey(t)) {
                state.put(t, 1);
                path.add(t);
                String lock = waitsFor.get(t);
                t = lock == null ? null : holder.get(lock);    // edge: t → owner of the lock it wants
            }
            if (t != null && state.get(t) == 1) {              // returned to a node on THIS path → cycle
                return new ArrayList<>(path.subList(path.indexOf(t), path.size()));
            }
            for (String p : path) state.put(p, 2);
        }
        return List.of();
    }

    public static void main(String[] args) {
        Map<String, String> holder = Map.of("A", "T1", "B", "T2", "C", "T3");
        Map<String, String> waits = Map.of("T1", "B", "T2", "C", "T3", "A");
        System.out.println(findDeadlock(holder, waits).size());        // 3
        System.out.println(findDeadlock(holder, Map.of("T1", "B")));   // []
    }
}`,
      dry: { head: ['step', 't', 'waits for', 'held by', 'state'], rows: [['1', 'T1', 'B', 'T2', 'T1 on path'], ['2', 'T2', 'C', 'T3', 'T2 on path'], ['3', 'T3', 'A', 'T1', 'T3 on path'], ['4', 'T1', '—', '—', '<span class="c-r">already on path → cycle [T1, T2, T3]</span>']] },
      complexity: `<p>O(N) time and space: each thread is put on a path once and finished once.</p>`,
      followUps: ['Return all deadlock cycles, not just one.', 'Support read-write locks where a lock can have several holders (out-degree &gt; 1 → general DFS).']
    }
  });

  practice.push({
    title: 'Fair Ticket Lock (No Starvation)',
    level: 'Medium', tags: ['starvation', 'fairness', 'wait/notify'], companies: ['Intel', 'Nvidia', 'Goldman Sachs'],
    statement: `<p>${C('synchronized')} is unfair: a newly arriving thread can grab the lock ahead of threads that have waited for seconds. Implement ${C('TicketLock')} with ${C('lock()')} / ${C('unlock()')} that grants the lock in strict <b>arrival (FIFO) order</b>, like a deli counter "take a number". Only the owner may unlock.</p>`,
    constraints: `Up to 64 threads. lock() is not reentrant. A thread interrupted while waiting must not break the queue for others.`,
    example: `<p>T1 holds the lock; T2, T3, T4 call lock() in that order → after T1 unlocks, the lock goes to ${H.c('g', 'T2, then T3, then T4')} — never T4 before T2.</p>`,
    brute: {
      why: `<p>A boolean mutex with ${C('while (locked) wait()')} is correct but unfair: after ${C('notifyAll')}, whichever woken (or brand-new) thread grabs the monitor first wins; an unlucky thread can lose every race — starvation.</p>`,
      code: `
class UnfairMutex {
    private boolean locked;
    synchronized void lock() throws InterruptedException {
        while (locked) wait();             // whoever wins the race gets in: no order
        locked = true;
    }
    synchronized void unlock() { locked = false; notifyAll(); }
}`
    },
    mcq: { q: 'Why must a waiting thread NOT simply give up (throw) when interrupted in this design?', options: ['Interrupts are ignored by wait()', 'Its ticket number would never be served, so every later ticket waits forever', 'Because unlock() would throw', 'It is fine to give up'], answer: 1, explain: 'nowServing only advances on unlock by the owner. If ticket k is abandoned, nowServing reaches k and stops; all tickets after k starve. Either wait uninterruptibly or implement ticket cancellation.' },
    hints: [
      `<p>Hint 1: two counters: ${C('nextTicket')} (handed out on arrival) and ${C('nowServing')}.</p>`,
      `<p>Hint 2: lock(): ${C('my = nextTicket++')}; ${C('while (my != nowServing) wait();')}. unlock(): ${C('nowServing++')}; ${C('notifyAll()')}.</p>`,
      `<p>Hint 3: track the owner thread to reject foreign unlocks; on interrupt, keep waiting but remember to restore the interrupt flag afterwards.</p>`
    ],
    tests: { sig: 'string -> string[]', fn: 'chk', harness: { java: `
class Check {
  static void waitingState(Thread t) {
    long end = System.nanoTime() + 20_000_000_000L;
    while (t.getState() != Thread.State.WAITING && System.nanoTime() < end) Thread.onSpinWait();
  }
  static String[] chk(String mode) throws Exception {
    TicketLock lock = new TicketLock();
    String[] p = mode.split(":");
    switch (p[0]) {
      case "fifo": {
        int K = Integer.parseInt(p[1]);
        List<Integer> order = Collections.synchronizedList(new ArrayList<>());
        lock.lock();
        Thread[] ts = new Thread[K];
        for (int i = 0; i < K; i++) {
          final int id = i + 1;
          ts[i] = new Thread(() -> { lock.lock(); order.add(id); lock.unlock(); });
          ts[i].start();
          waitingState(ts[i]);
        }
        lock.unlock();
        for (Thread t : ts) t.join();
        StringBuilder sb = new StringBuilder();
        for (int x : order) { if (sb.length() > 0) sb.append(','); sb.append(x); }
        return new String[]{ sb.toString() };
      }
      case "mutex": {
        int T = Integer.parseInt(p[1]), N = Integer.parseInt(p[2]);
        int[] counter = {0};
        Thread[] ts = new Thread[T];
        for (int i = 0; i < T; i++) { ts[i] = new Thread(() -> { for (int k = 0; k < N; k++) { lock.lock(); counter[0]++; lock.unlock(); } }); ts[i].start(); }
        for (Thread t : ts) t.join();
        return new String[]{ String.valueOf(counter[0]) };
      }
      case "notOwner": {
        String a, b;
        try { lock.unlock(); a = "no exception"; } catch (IllegalMonitorStateException e) { a = "IMSE"; }
        lock.lock(); lock.unlock();
        try { lock.unlock(); b = "no exception"; } catch (IllegalMonitorStateException e) { b = "IMSE"; }
        return new String[]{ a, b };
      }
      default: {
        boolean[] flag = new boolean[1];
        lock.lock();
        Thread t = new Thread(() -> { lock.lock(); flag[0] = Thread.currentThread().isInterrupted(); lock.unlock(); });
        t.start(); waitingState(t);
        t.interrupt();
        lock.unlock();
        t.join();
        return new String[]{ "acquired interrupted=" + flag[0] };
      }
    }
  }
}` }, cases: [
        [['fifo:4'], ['1,2,3,4']],
        [['fifo:1'], ['1']],
        [['fifo:2'], ['1,2']],
        [['fifo:64'], ['1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64']],
        [['mutex:8:20000'], ['160000']],
        [['mutex:1:1'], ['1']],
        [['notOwner'], ['IMSE', 'IMSE']],
        [['interrupted'], ['acquired interrupted=true']]
      ] },
    solution: {
      approach: `<p>A ticket lock: the order is fixed the moment a thread takes its number, inside the monitor. Unlock advances "now serving" and wakes all; only the thread holding that exact ticket passes its guard. Interrupts are deferred so no ticket is ever abandoned.</p>`,
      code: `
class TicketLock {
    private long nextTicket = 0;        // next number handed out at the door; guarded by this
    private long nowServing = 0;        // number allowed in; guarded by this
    private Thread owner;               // guarded by this

    public synchronized void lock() {
        long my = nextTicket++;          // FIFO position decided here
        boolean interrupted = false;
        while (my != nowServing) {
            try { wait(); } catch (InterruptedException e) { interrupted = true; }   // never abandon a ticket
        }
        owner = Thread.currentThread();
        if (interrupted) Thread.currentThread().interrupt();                           // restore the flag
    }

    public synchronized void unlock() {
        if (owner != Thread.currentThread()) throw new IllegalMonitorStateException("not the owner");
        owner = null;
        nowServing++;
        notifyAll();                     // everyone checks; exactly one ticket matches
    }
}`,
      dry: { head: ['event', 'nextTicket', 'nowServing', 'who may enter'], rows: [['T1 lock (ticket 0)', '1', '0', 'T1'], ['T2 lock (ticket 1)', '2', '0', 'T2 waits'], ['T3 lock (ticket 2)', '3', '0', 'T3 waits'], ['T1 unlock', '3', '1', '<span class="c-g">T2</span> (T3 re-waits)'], ['T2 unlock', '3', '2', '<span class="c-g">T3</span>']] },
      complexity: `<p>O(1) per lock/unlock, but each unlock wakes all W waiters (O(W) wake-ups). Production fair locks (AQS) wake only the next in queue.</p>`,
      followUps: ['Why do fair locks have lower throughput than unfair ones?', 'Make it reentrant with a hold count.']
    }
  });

  practice.push({
    title: 'Build a Counting Semaphore from wait/notify',
    level: 'Medium', tags: ['semaphore', 'wait/notify', 'resource limiting'], companies: ['Amazon', 'VMware', 'Salesforce'],
    statement: `<p>Implement ${C('SimpleSemaphore(int permits)')} with ${C('acquire()')} (blocks until a permit is available, then takes it), ${C('tryAcquire()')} (non-blocking), and ${C('release()')}. Use it to let at most 2 of 5 threads use a "database connection" at the same time.</p>`,
    constraints: `0 ≤ permits ≤ 10<sup>4</sup>; any number of threads. acquire must respond to interruption.`,
    example: `<p>permits = 2, five threads each acquire → work 20 ms → release. The observed maximum number of threads inside is ${H.c('g', 'exactly 2')}, never 3.</p>`,
    brute: {
      why: `<p>Spinning on an ${C('AtomicInteger')} with ${C('decrementAndGet')} and "undo" on failure can briefly drive permits negative and wastes CPU; spinning on a plain int is a race (two threads both see 1 and both take it).</p>`,
      code: `
class SpinSemaphore {
    private int permits;
    SpinSemaphore(int permits) { this.permits = permits; }
    void acquire() {
        while (permits == 0) { }   // spins, may never see a release (no visibility)
        permits--;                 // two threads can both pass the check → permits = -1
    }
    void release() { permits++; }
}`
    },
    mcq: { q: 'Why is notify() (not notifyAll) acceptable in release() here?', options: ['It never is', 'All waiters wait for the same condition (permits &gt; 0) and one released permit can satisfy exactly one waiter', 'Because permits is volatile', 'Because only one thread ever waits'], answer: 1, explain: 'Uniform waiters + one-in-one-out are the two conditions for safe notify(). The JLS also guarantees a notification is not lost if the chosen waiter is concurrently interrupted.' },
    hints: [
      `<p>Hint 1: the guard is ${C('permits > 0')}; the state is one int guarded by the semaphore's monitor.</p>`,
      `<p>Hint 2: acquire: ${C('while (permits == 0) wait(); permits--;')}. release: ${C('permits++; notify();')}</p>`,
      `<p>Hint 3: tryAcquire is the same check without waiting. Demo: track "inside" and "maxInside" under a separate lock.</p>`
    ],
    tests: { sig: 'string int int -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String kind, int permits, int threads) throws Exception {
    if (kind.equals("neg")) {
      try { new SimpleSemaphore(permits); return new String[]{ "no exception" }; } catch (IllegalArgumentException e) { return new String[]{ "IAE" }; }
    }
    SimpleSemaphore sem = new SimpleSemaphore(permits);
    if (kind.equals("try")) {
      int ok1 = 0, ok2 = 0;
      for (int i = 0; i < threads; i++) if (sem.tryAcquire()) ok1++;
      sem.release(); sem.release();
      for (int i = 0; i < 3; i++) if (sem.tryAcquire()) ok2++;
      return new String[]{ String.valueOf(ok1), String.valueOf(ok2) };
    }
    if (kind.equals("interrupt")) {
      boolean[] got = new boolean[1];
      Thread t = new Thread(() -> { try { sem.acquire(); } catch (InterruptedException e) { got[0] = true; } });
      t.start();
      long end = System.nanoTime() + 20_000_000_000L;
      while (t.getState() != Thread.State.WAITING && System.nanoTime() < end) Thread.onSpinWait();
      t.interrupt(); t.join();
      return new String[]{ got[0] ? "interrupted" : "not interrupted" };
    }
    int expected = Math.min(permits, threads);
    AtomicInteger inside = new AtomicInteger(), max = new AtomicInteger();
    AtomicBoolean reached = new AtomicBoolean();
    Thread[] ts = new Thread[threads];
    for (int i = 0; i < threads; i++) {
      ts[i] = new Thread(() -> {
        try {
          sem.acquire();
          try {
            int now = inside.incrementAndGet();
            max.accumulateAndGet(now, Math::max);
            if (now >= expected) reached.set(true);
            long end = System.nanoTime() + 20_000_000_000L;
            while (!reached.get() && System.nanoTime() < end) Thread.onSpinWait();
            inside.decrementAndGet();
          } finally { sem.release(); }
        } catch (InterruptedException e) { }
      });
      ts[i].start();
    }
    for (Thread t : ts) t.join();
    return new String[]{ String.valueOf(max.get()) };
  }
}` }, cases: [
        [['max', 2, 5], ['2']],
        [['max', 1, 8], ['1']],
        [['max', 3, 2], ['2']],
        [['max', 5, 5], ['5']],
        [['max', 64, 64], ['64']],
        [['max', 10000, 3], ['3']],
        [['try', 3, 5], ['3', '2']],
        [['try', 0, 4], ['0', '2']],
        [['interrupt', 0, 0], ['interrupted']],
        [['neg', -1, 0], ['IAE']]
      ] },
    solution: {
      approach: `<p>A guarded counter. acquire waits for a positive count and decrements under the lock; release increments and wakes one waiter. Because all waiters are interchangeable, a single notify is enough (notifyAll would also be correct, just noisier).</p>`,
      code: `
class SimpleSemaphore {
    private int permits;                                  // guarded by this

    SimpleSemaphore(int permits) {
        if (permits < 0) throw new IllegalArgumentException("permits < 0");
        this.permits = permits;
    }

    synchronized void acquire() throws InterruptedException {
        while (permits == 0) wait();
        permits--;
    }

    synchronized boolean tryAcquire() {
        if (permits == 0) return false;
        permits--;
        return true;
    }

    synchronized void release() {
        permits++;
        notify();                                         // uniform waiters, one permit → one waiter
    }

    static int inside, maxInside;                         // demo bookkeeping, guarded by SimpleSemaphore.class

    public static void main(String[] args) throws InterruptedException {
        SimpleSemaphore sem = new SimpleSemaphore(2);
        Thread[] ts = new Thread[5];
        for (int i = 0; i < ts.length; i++) {
            ts[i] = new Thread(() -> {
                try {
                    sem.acquire();
                    try {
                        synchronized (SimpleSemaphore.class) { inside++; maxInside = Math.max(maxInside, inside); }
                        Thread.sleep(20);                 // "use the DB connection"
                        synchronized (SimpleSemaphore.class) { inside--; }
                    } finally {
                        sem.release();                    // always give the permit back
                    }
                } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            });
            ts[i].start();
        }
        for (Thread t : ts) t.join();
        synchronized (SimpleSemaphore.class) { System.out.println("max inside = " + maxInside); }   // 2
    }
}`,
      dry: { head: ['event', 'permits', 'waiting'], rows: [['T1 acquire', '2 → 1', '—'], ['T2 acquire', '1 → 0', '—'], ['T3 acquire', '0', 'T3'], ['T1 release + notify', '0 → 1 → 0 (T3 takes it)', '—'], ['…', '…', '<span class="c-g">max inside = 2</span>']] },
      complexity: `<p>O(1) per call. java.util.concurrent.Semaphore adds fairness options, timeouts and bulk permits via AQS.</p>`,
      followUps: ['Add acquire(int n) for multiple permits — is notify still safe?', 'How does a binary semaphore differ from a mutex?']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Print Zero Even Odd (LeetCode 1116)',
    level: 'Hard', tags: ['wait/notify', 'three-way coordination', 'LeetCode concurrency'], companies: ['Microsoft', 'Bloomberg', 'Nvidia'],
    statement: `<p>One ${C('ZeroEvenOdd(n)')} instance is shared by three threads: A calls ${C('zero(printNumber)')}, B calls ${C('even(printNumber)')}, C calls ${C('odd(printNumber)')}. Together they must print ${C('0102030405…0n')}: a zero before every number, numbers in increasing order, evens printed only by B and odds only by C.</p>`,
    constraints: `1 ≤ n ≤ 1000. Threads start in any order. ${C('printNumber')} is an ${C('IntConsumer')}.`,
    example: `<p>n = 5 → ${H.c('g', '0102030405')}. n = 2 → ${H.c('g', '0102')} (odd prints 1, even prints 2).</p>`,
    brute: {
      why: `<p>A single boolean "zero's turn / number's turn" is not enough: after a zero, both even and odd wake up, and without checking the parity of the next number the wrong one may print (e.g. even prints 1). Spinning on volatiles works but burns three cores.</p>`,
      code: `
class ZeroEvenOddBroken {
    private final int n;
    private boolean zeroTurn = true;
    private int i = 1;
    ZeroEvenOddBroken(int n) { this.n = n; }
    synchronized void numberTurn(IntConsumer p) throws InterruptedException {
        while (zeroTurn) wait();          // BUG: ignores parity — even may print an odd number
        p.accept(i++);
        zeroTurn = true;
        notifyAll();
    }
}`
    },
    mcq: { q: 'What is the minimal shared state that makes every guard decidable?', options: ['One boolean', 'A boolean zeroTurn plus the next number i (parity tells odd/even whose turn it is)', 'Three semaphores only', 'A queue of strings'], answer: 1, explain: 'zeroTurn says whether a zero is due; when it is false, i % 2 decides between even and odd. Each thread\'s guard reads only these two fields.' },
    hints: [
      `<p>Hint 1: state = ${C('boolean zeroTurn')}, ${C('int i')} (next number). zero waits for zeroTurn; even waits for !zeroTurn && i even; odd waits for !zeroTurn && i odd.</p>`,
      `<p>Hint 2: each method loops exactly as many times as it must print: zero n times, even ⌊n/2⌋ times, odd ⌈n/2⌉ times.</p>`,
      `<p>Hint 3: after printing, flip zeroTurn (and i++ for numbers), then notifyAll — waiters have different guards so notify() is unsafe.</p>`
    ],
    tests: { sig: 'int string int -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(int n, String order, int rounds) throws Exception {
    String last = "";
    for (int r = 0; r < rounds; r++) {
      ZeroEvenOdd z = new ZeroEvenOdd(n);
      StringBuffer sb = new StringBuffer();
      IntConsumer pr = x -> sb.append(x);
      Thread[] ts = new Thread[3];
      for (int i = 0; i < 3; i++) {
        char c = order.charAt(i);
        ts[i] = new Thread(() -> {
          try {
            if (c == 'A') z.zero(pr); else if (c == 'B') z.even(pr); else z.odd(pr);
          } catch (InterruptedException e) { }
        });
      }
      for (Thread t : ts) t.start();
      for (Thread t : ts) t.join();
      String cur = sb.toString();
      if (r > 0 && !cur.equals(last)) return "inconsistent";
      last = cur;
    }
    return n <= 20 ? last : n + " len=" + last.length() + " hash=" + last.hashCode();
  }
}` }, cases: [
        [[5, 'ABC', 1], '0102030405'],
        [[2, 'CBA', 1], '0102'],
        [[1, 'BCA', 1], '01'],
        [[5, 'CAB', 300], '0102030405'],
        [[2, 'BAC', 300], '0102'],
        [[3, 'ACB', 1], '010203'],
        [[100, 'CBA', 1], '100 len=292 hash=1559263995'],
        [[1000, 'ABC', 1], '1000 len=3893 hash=280371649']
      ] },
    solution: {
      approach: `<p>One monitor, two state variables, three guards. Every print is followed by a state change and notifyAll; each thread re-checks its own guard in a while loop. Loop counts are fixed up front, so all threads terminate.</p>`,
      code: `
class ZeroEvenOdd {
    private final int n;
    private int i = 1;                 // next number to print; guarded by this
    private boolean zeroTurn = true;   // guarded by this

    public ZeroEvenOdd(int n) { this.n = n; }

    public synchronized void zero(IntConsumer printNumber) throws InterruptedException {
        for (int k = 0; k < n; k++) {
            while (!zeroTurn) wait();
            printNumber.accept(0);
            zeroTurn = false;
            notifyAll();
        }
    }

    public synchronized void even(IntConsumer printNumber) throws InterruptedException {
        for (int k = 2; k <= n; k += 2) {
            while (zeroTurn || i % 2 != 0) wait();
            printNumber.accept(i++);
            zeroTurn = true;
            notifyAll();
        }
    }

    public synchronized void odd(IntConsumer printNumber) throws InterruptedException {
        for (int k = 1; k <= n; k += 2) {
            while (zeroTurn || i % 2 != 1) wait();
            printNumber.accept(i++);
            zeroTurn = true;
            notifyAll();
        }
    }
}`,
      dry: { head: ['zeroTurn', 'i', 'who passes its guard', 'prints'], rows: [['true', '1', 'zero', '0'], ['false', '1', 'odd', '1'], ['true', '2', 'zero', '0'], ['false', '2', 'even', '2'], ['true', '3', 'zero', '0 … and so on']] },
      complexity: `<p>O(n) prints; each print triggers a notifyAll waking at most 2 other threads.</p>`,
      followUps: ['Solve with three Semaphores (zero=1, odd=0, even=0).', 'Why is holding the monitor for the entire for-loop fine here?']
    }
  });

  practice.push({
    title: 'Building H2O (LeetCode 1117)',
    level: 'Hard', tags: ['wait/notify', 'barrier', 'grouping'], companies: ['Apple', 'Google', 'Amazon'],
    statement: `<p>Hydrogen threads call ${C('hydrogen(releaseHydrogen)')} and oxygen threads call ${C('oxygen(releaseOxygen)')}. Threads must be released in groups forming a water molecule: each consecutive group of 3 releases contains exactly <b>two H and one O</b> (any order within the group). A thread must wait until it can be part of the current molecule.</p>`,
    constraints: `Total input has exactly 2m H threads and m O threads, 1 ≤ m ≤ 20, arriving in any order.`,
    example: `<p>Arrivals "OOHHHH" → valid outputs include ${H.c('g', 'HHOHHO')}, ${H.c('g', 'HOHHHO')}, ${H.c('g', 'OHHOHH')}; invalid: ${H.c('r', 'HHHOOH')} (first triple has 3 H).</p>`,
    brute: {
      why: `<p>Releasing H whenever fewer than 2 H are "pending" and O whenever fewer than 1 O is pending, but never resetting per molecule, lets a third H slip into the current group once the counters are decremented in the wrong place. Using a global ordering ("two H then one O") is too strict and can make threads wait needlessly — and ${C('if')}-based waits break under spurious wake-ups.</p>`,
      code: `
class H2OBroken {
    private int h, o;
    synchronized void hydrogen(Runnable r) throws InterruptedException {
        if (h == 2) wait();          // if: a woken H may proceed when h is still 2
        r.run(); h++;
        notify();                    // may wake the wrong atom; nobody ever resets h and o
    }
    synchronized void oxygen(Runnable r) throws InterruptedException {
        if (o == 1) wait();
        r.run(); o++;
        notify();
    }
}`
    },
    mcq: { q: 'When should the per-molecule counters (h, o) be reset to zero?', options: ['After every release', 'Exactly when the third atom of the molecule is released (h == 2 && o == 1)', 'Never', 'When an oxygen arrives'], answer: 1, explain: 'The counters describe the molecule being assembled. Only when it is complete may the next molecule\'s atoms start being released.' },
    hints: [
      `<p>Hint 1: track the molecule under construction: ${C('h')} = H released so far (0..2), ${C('o')} = O released (0..1).</p>`,
      `<p>Hint 2: H waits while h == 2; O waits while o == 1. After releasing, increment.</p>`,
      `<p>Hint 3: if h == 2 and o == 1 the molecule is complete → reset both to 0. Always notifyAll (H and O wait for different conditions).</p>`
    ],
    tests: { sig: 'string -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(String arrivals) throws Exception {
    for (int round = 0; round < 20; round++) {
      H2O w = new H2O();
      StringBuffer sb = new StringBuffer();
      Thread[] ts = new Thread[arrivals.length()];
      for (int i = 0; i < ts.length; i++) {
        boolean h = arrivals.charAt(i) == 'H';
        ts[i] = new Thread(() -> {
          try { if (h) w.hydrogen(() -> sb.append('H')); else w.oxygen(() -> sb.append('O')); } catch (InterruptedException e) { }
        });
      }
      for (Thread t : ts) t.start();
      for (Thread t : ts) t.join();
      String s = sb.toString();
      if (s.length() != arrivals.length()) return "bad length " + s;
      for (int i = 0; i < s.length(); i += 3) {
        String g = s.substring(i, i + 3);
        long hs = g.chars().filter(c -> c == 'H').count();
        if (hs != 2) return "invalid:" + s;
      }
    }
    return "valid";
  }
}` }, cases: [
        [['OOHHHH'], 'valid'],
        [['HHHHOO'], 'valid'],
        [['HOHOHH'], 'valid'],
        [['HHO'], 'valid'],
        [['OHH'], 'valid'],
        [['HOH'], 'valid'],
        [[{ $rep: 'HHO', n: 20 }], 'valid'],
        [[{ $concat: [{ $rep: 'O', n: 20 }, { $rep: 'H', n: 40 }] }], 'valid'],
        [[{ $concat: [{ $rep: 'H', n: 40 }, { $rep: 'O', n: 20 }] }], 'valid']
      ] },
    solution: {
      approach: `<p>A monitor that admits at most two H and one O into the current "slot". The atom that completes the molecule resets the slot. Because every group of three consecutive releases fills exactly one slot, the output is always valid.</p>`,
      code: `
class H2O {
    private int h = 0, o = 0;          // atoms released into the current molecule; guarded by this

    public synchronized void hydrogen(Runnable releaseHydrogen) throws InterruptedException {
        while (h == 2) wait();          // this molecule already has both hydrogens
        releaseHydrogen.run();
        h++;
        completeIfFull();
    }

    public synchronized void oxygen(Runnable releaseOxygen) throws InterruptedException {
        while (o == 1) wait();          // this molecule already has its oxygen
        releaseOxygen.run();
        o++;
        completeIfFull();
    }

    private void completeIfFull() {     // called with the monitor held
        if (h == 2 && o == 1) { h = 0; o = 0; }   // molecule done: open the next slot
        notifyAll();
    }
}`,
      dry: { head: ['arrival', 'h', 'o', 'action', 'output'], rows: [['O', '0 → 0', '0 → 1', 'released', 'O'], ['O', '0', '1', 'waits (o == 1)', 'O'], ['H', '0 → 1', '1', 'released', 'OH'], ['H', '1 → 2 → 0', '1 → 0', 'released, molecule complete, reset', 'OHH'], ['(waiting O)', '0', '0 → 1', 'wakes, released', 'OHHO']] },
      complexity: `<p>O(1) per atom plus wake-ups; notifyAll may wake several waiting atoms that re-wait.</p>`,
      followUps: ['Solve with Semaphore(2) for H, Semaphore(1) for O and a CyclicBarrier(3).', 'Generalise to a molecule with a H, b O atoms.']
    }
  });

  practice.push({
    title: 'The Dining Philosophers (LeetCode 1226)',
    level: 'Hard', tags: ['deadlock', 'lock ordering', 'resource hierarchy'], companies: ['Google', 'Microsoft', 'Oracle'],
    statement: `<p>Five philosophers (0..4) sit at a round table with one fork between each pair. Philosopher p needs forks p and (p+1) % 5 to eat. Implement ${C('wantsToEat(p, pickLeft, pickRight, eat, putLeft, putRight)')} so that no two neighbours use a fork at the same time and the system <b>never deadlocks</b>, no matter how calls interleave.</p>`,
    constraints: `Each philosopher calls wantsToEat 1–60 times, all concurrently.`,
    example: `<p>If all five pick up their left fork simultaneously, the naive version deadlocks: ${H.c('r', 'everyone holds one fork and waits for the right one forever')}. A correct solution always completes.</p>`,
    brute: {
      why: `<p>Everyone locks left then right. If all grab left at once, each waits for the right fork held by the neighbour — a 5-thread circular wait. Coffman's four conditions all hold.</p>`,
      code: `
class NaiveDiners {
    private final Object[] forks = { new Object(), new Object(), new Object(), new Object(), new Object() };
    void wantsToEat(int p, Runnable eat) {
        synchronized (forks[p]) {                  // left
            synchronized (forks[(p + 1) % 5]) {    // right — all five can be stuck here
                eat.run();
            }
        }
    }
}`
    },
    mcq: { q: 'With "lower-numbered fork first", what does philosopher 4 do differently?', options: ['Nothing', 'Picks fork 0 (its right) before fork 4 (its left), breaking the symmetry that formed the cycle', 'Never eats', 'Uses a timeout'], answer: 1, explain: 'Philosopher 4 needs forks 4 and 0; ordering by number makes it take 0 first. Now the wait chain can no longer wrap around the table.' },
    hints: [
      `<p>Hint 1: give forks a global order (their index). Which Coffman condition does that break?</p>`,
      `<p>Hint 2: ${C('first = min(left, right)')}, ${C('second = max(left, right)')}; lock first then second.</p>`,
      `<p>Hint 3: alternatives: allow at most 4 philosophers to try at once (Semaphore(4)), or tryLock with random back-off.</p>`
    ],
    tests: { sig: 'int[] -> int[]', fn: 'chk', harness: { java: `
class Check {
  static int[] chk(int[] calls) throws Exception {
    DiningPhilosophers dp = new DiningPhilosophers();
    AtomicBoolean[] inUse = new AtomicBoolean[5];
    for (int i = 0; i < 5; i++) inUse[i] = new AtomicBoolean();
    AtomicInteger violations = new AtomicInteger();
    int[] eaten = new int[5];
    Thread[] ts = new Thread[5];
    for (int p = 0; p < 5; p++) {
      final int id = p, left = p, right = (p + 1) % 5;
      ts[p] = new Thread(() -> {
        try {
          for (int k = 0; k < calls[id]; k++) {
            dp.wantsToEat(id,
              () -> { if (!inUse[left].compareAndSet(false, true)) violations.incrementAndGet(); },
              () -> { if (!inUse[right].compareAndSet(false, true)) violations.incrementAndGet(); },
              () -> { eaten[id]++; },
              () -> inUse[left].set(false),
              () -> inUse[right].set(false));
          }
        } catch (InterruptedException e) { }
      });
      ts[p].start();
    }
    for (Thread t : ts) t.join();
    return new int[]{ eaten[0], eaten[1], eaten[2], eaten[3], eaten[4], violations.get() };
  }
}` }, cases: [
        [[[1, 1, 1, 1, 1]], [1, 1, 1, 1, 1, 0]],
        [[[60, 60, 60, 60, 60]], [60, 60, 60, 60, 60, 0]],
        [[[1, 0, 0, 0, 0]], [1, 0, 0, 0, 0, 0]],
        [[[0, 0, 0, 0, 0]], [0, 0, 0, 0, 0, 0]],
        [[[10, 20, 30, 40, 50]], [10, 20, 30, 40, 50, 0]],
        [[[60, 0, 60, 0, 60]], [60, 0, 60, 0, 60, 0]],
        [[[0, 0, 0, 0, 60]], [0, 0, 0, 0, 60, 0]],
        [[[5000, 5000, 5000, 5000, 5000]], [5000, 5000, 5000, 5000, 5000, 0]]
      ] },
    solution: {
      approach: `<p>Resource hierarchy (Dijkstra): always acquire the lower-numbered fork first. Circular wait becomes impossible, so deadlock is impossible. Neighbours still exclude each other because they share a fork object.</p>`,
      code: `
class DiningPhilosophers {
    private final Object[] forks = new Object[5];

    public DiningPhilosophers() {
        for (int i = 0; i < 5; i++) forks[i] = new Object();
    }

    public void wantsToEat(int philosopher, Runnable pickLeftFork, Runnable pickRightFork,
                           Runnable eat, Runnable putLeftFork, Runnable putRightFork) throws InterruptedException {
        int left = philosopher, right = (philosopher + 1) % 5;
        int first = Math.min(left, right), second = Math.max(left, right);   // global order breaks the cycle
        synchronized (forks[first]) {
            synchronized (forks[second]) {
                pickLeftFork.run();
                pickRightFork.run();
                eat.run();
                putLeftFork.run();
                putRightFork.run();
            }
        }
    }
}`,
      dry: { head: ['philosopher', 'left, right', 'locks first', 'then'], rows: [['0', '0, 1', '0', '1'], ['1', '1, 2', '1', '2'], ['2', '2, 3', '2', '3'], ['3', '3, 4', '3', '4'], ['4', '4, 0', '<span class="c-g">0</span>', '4 (symmetry broken)']] },
      complexity: `<p>O(1) per meal. Throughput: up to 2 philosophers eat at once (5 forks / 2). Starvation is theoretically possible with unfair intrinsic locks; fair ReentrantLocks remove it.</p>`,
      followUps: ['Prove there is no deadlock with the ordering argument.', 'Implement the Semaphore(4) "waiter" solution — which condition does it break?']
    }
  });

  practice.push({
    title: 'Read-Write Lock with Writer Preference',
    level: 'Hard', tags: ['starvation', 'read-write lock', 'wait/notify'], companies: ['Amazon', 'Databricks', 'Meta'],
    statement: `<p>Implement ${C('lockRead/unlockRead/lockWrite/unlockWrite')}. Many readers may hold the lock together; a writer needs exclusive access. Under a constant stream of readers, a reader-preferring lock <b>starves writers</b> forever. Your lock must prefer writers: once a writer is waiting, new readers must queue behind it. Handle interruption of a waiting writer without stranding readers.</p>`,
    constraints: `Up to 100 readers and 10 writers concurrently. Not reentrant. Misuse (unlock without lock) throws IllegalMonitorStateException.`,
    example: `<p>Readers R1, R2 hold the lock; writer W arrives and waits; reader R3 arrives → ${H.c('y', 'R3 waits')} (writer preference). R1, R2 unlock → ${H.c('g', 'W writes')} → W unlocks → R3 reads.</p>`,
    brute: {
      why: `<p>The simple version lets a reader in whenever no writer is <b>active</b>. With overlapping readers there is never a moment with zero readers, so a waiting writer never enters — classic starvation. It also cannot express "a writer is waiting".</p>`,
      code: `
class ReaderPreferringRW {
    private int readers;
    private boolean writing;
    synchronized void lockRead() throws InterruptedException { while (writing) wait(); readers++; }
    synchronized void unlockRead() { if (--readers == 0) notifyAll(); }
    synchronized void lockWrite() throws InterruptedException {
        while (writing || readers > 0) wait();   // starves while readers keep overlapping
        writing = true;
    }
    synchronized void unlockWrite() { writing = false; notifyAll(); }
}`
    },
    mcq: { q: 'A waiting writer is interrupted and leaves. Why must it call notifyAll() on its way out?', options: ['It must not', 'Readers may be waiting only because waitingWriters &gt; 0; after decrementing, they must be woken to re-check, or they wait forever', 'To release the monitor', 'To wake other writers only'], answer: 1, explain: 'Readers\' guard includes waitingWriters > 0. Changing that state without notifying can leave readers waiting for an event that will never come (a lost wake-up).' },
    hints: [
      `<p>Hint 1: state: ${C('readers')} (active), ${C('writing')} (active writer?), ${C('waitingWriters')}.</p>`,
      `<p>Hint 2: readers wait while ${C('writing || waitingWriters > 0')}; writers increment waitingWriters, wait while ${C('writing || readers > 0')}, decrement, then set writing.</p>`,
      `<p>Hint 3: on InterruptedException in lockWrite: decrement waitingWriters, notifyAll, rethrow. Unlocks validate state and notifyAll.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'chk', harness: { java: `
class Check {
  static class Actor {
    final String name; final boolean writer; final WriterPreferringRWLock lock;
    volatile String state = "start"; final Semaphore go = new Semaphore(0); Thread thread;
    Actor(String n, boolean w, WriterPreferringRWLock l) { name = n; writer = w; lock = l; }
    void start() {
      thread = new Thread(() -> {
        try {
          if (writer) lock.lockWrite(); else lock.lockRead();
          state = "acq";
          go.acquire();
          if (writer) lock.unlockWrite(); else lock.unlockRead();
          state = "done";
        } catch (InterruptedException e) { state = "intr"; }
      });
      thread.start();
    }
  }
  static void settle(Collection<Actor> all) {
    long end = System.nanoTime() + 20_000_000_000L;
    boolean stable;
    do {
      stable = true;
      for (Actor a : all) {
        boolean ok = a.state.equals("acq") || a.state.equals("done") || a.state.equals("intr") || a.thread.getState() == Thread.State.WAITING;
        if (!ok) stable = false;
      }
      if (!stable) Thread.onSpinWait();
    } while (!stable && System.nanoTime() < end);
  }
  static String status(Map<String, Actor> actors) {
    StringBuilder sb = new StringBuilder();
    for (Actor a : actors.values()) {
      if (sb.length() > 0) sb.append(' ');
      sb.append(a.name).append(':').append(a.state.equals("start") ? "wait" : a.state);
    }
    return sb.toString();
  }
  static String[] chk(String[] ops) throws Exception {
    WriterPreferringRWLock lock = new WriterPreferringRWLock();
    Map<String, Actor> actors = new TreeMap<>();
    List<String> out = new ArrayList<>();
    for (String op : ops) {
      String[] p = op.split(":");
      switch (p[0]) {
        case "R": case "W": { Actor a = new Actor(p[1], p[0].equals("W"), lock); actors.put(a.name, a); a.start(); settle(actors.values()); break; }
        case "U": { Actor a = actors.get(p[1]); a.go.release(); a.thread.join(); settle(actors.values()); break; }
        case "I": { Actor a = actors.get(p[1]); a.thread.interrupt(); a.thread.join(); settle(actors.values()); break; }
        case "status": out.add(status(actors)); break;
        case "badR": try { lock.unlockRead(); out.add("no exception"); } catch (IllegalMonitorStateException e) { out.add("IMSE"); } break;
        case "badW": try { lock.unlockWrite(); out.add("no exception"); } catch (IllegalMonitorStateException e) { out.add("IMSE"); } break;
        case "stress": {
          int R = Integer.parseInt(p[1]), W = Integer.parseInt(p[2]), N = Integer.parseInt(p[3]);
          AtomicInteger readers = new AtomicInteger(), writers = new AtomicInteger(), bad = new AtomicInteger();
          List<Thread> ts = new ArrayList<>();
          for (int i = 0; i < R; i++) ts.add(new Thread(() -> {
            try { for (int k = 0; k < N; k++) { lock.lockRead(); readers.incrementAndGet(); if (writers.get() != 0) bad.incrementAndGet(); readers.decrementAndGet(); lock.unlockRead(); } } catch (InterruptedException e) { }
          }));
          for (int i = 0; i < W; i++) ts.add(new Thread(() -> {
            try { for (int k = 0; k < N; k++) { lock.lockWrite(); if (writers.incrementAndGet() != 1 || readers.get() != 0) bad.incrementAndGet(); writers.decrementAndGet(); lock.unlockWrite(); } } catch (InterruptedException e) { }
          }));
          for (Thread t : ts) t.start();
          for (Thread t : ts) t.join();
          out.add(bad.get() == 0 ? "ok" : "violations");
          break;
        }
      }
    }
    for (Actor a : actors.values()) { if (a.state.equals("acq")) { a.go.release(); a.thread.join(); } }
    return out.toArray(new String[0]);
  }
}` }, cases: [
        [[['R:R1', 'R:R2', 'W:W', 'R:R3', 'status', 'U:R1', 'U:R2', 'status', 'U:W', 'status']], ['R1:acq R2:acq R3:wait W:wait', 'R1:done R2:done R3:wait W:acq', 'R1:done R2:done R3:acq W:done']],
        [[['R:a', 'R:b', 'R:c', 'status']], ['a:acq b:acq c:acq']],
        [[['W:w1', 'W:w2', 'R:r', 'status', 'U:w1', 'status', 'U:w2', 'status']], ['r:wait w1:acq w2:wait', 'r:wait w1:done w2:acq', 'r:acq w1:done w2:done']],
        [[['R:r1', 'W:w', 'R:r2', 'status', 'I:w', 'status']], ['r1:acq r2:wait w:wait', 'r1:acq r2:acq w:intr']],
        [[['badR', 'badW']], ['IMSE', 'IMSE']],
        [[['W:w', 'U:w', 'R:r', 'status']], ['r:acq w:done']],
        [[['R:r', 'U:r', 'badR', 'W:w', 'U:w', 'badW']], ['IMSE', 'IMSE']],
        [[['stress:100:10:200']], ['ok']]
      ] },
    solution: {
      approach: `<p>One monitor, three counters. "A writer is waiting" becomes part of the readers' guard, so writers cannot be starved by overlapping readers. Every state change that might make some guard true is followed by notifyAll. (Trade-off: a constant stream of writers can now starve readers — production locks like ${C('ReentrantReadWriteLock(true)')} use a FIFO queue to be fair to both.)</p>`,
      code: `
class WriterPreferringRWLock {
    private int readers = 0;          // active readers; guarded by this
    private boolean writing = false;  // active writer?
    private int waitingWriters = 0;   // queued writers → new readers must wait

    public synchronized void lockRead() throws InterruptedException {
        while (writing || waitingWriters > 0) wait();
        readers++;
    }

    public synchronized void unlockRead() {
        if (readers <= 0) throw new IllegalMonitorStateException("no read lock held");
        if (--readers == 0) notifyAll();                 // last reader out lets a writer in
    }

    public synchronized void lockWrite() throws InterruptedException {
        waitingWriters++;
        try {
            while (writing || readers > 0) wait();
        } catch (InterruptedException e) {
            waitingWriters--;                            // leaving the queue changes the readers' guard
            notifyAll();                                 // so wake them to re-check
            throw e;
        }
        waitingWriters--;
        writing = true;
    }

    public synchronized void unlockWrite() {
        if (!writing) throw new IllegalMonitorStateException("no write lock held");
        writing = false;
        notifyAll();
    }
}`,
      dry: { head: ['event', 'readers', 'writing', 'waitingWriters', 'note'], rows: [['R1, R2 lockRead', '2', 'false', '0', ''], ['W lockWrite', '2', 'false', '1', 'W waits'], ['R3 lockRead', '2', 'false', '1', '<span class="c-y">R3 waits (writer preference)</span>'], ['R1, R2 unlockRead', '0', 'false', '1', 'notifyAll'], ['W enters', '0', 'true', '0', 'R3 still waits (writing)'], ['W unlockWrite', '1', 'false', '0', 'R3 reads']] },
      complexity: `<p>O(1) per operation plus notifyAll wake-ups. Readers run in parallel when no writer is active or waiting.</p>`,
      followUps: ['Make it fair to both sides with a ticket queue.', 'Support lock downgrading (write → read) like ReentrantReadWriteLock.', 'Why is upgrading read → write deadlock-prone?']
    }
  });

  practice.push({
    title: 'Lost Updates: Smallest Possible Final Count',
    level: 'Hard', tags: ['race condition', 'interleavings', 'model checking', 'output prediction'], companies: ['Jane Street', 'Two Sigma', 'Google'],
    statement: `<p>Two threads each execute ${C('count++')} exactly ${C('n')} times on a shared plain ${C('int')} starting at 0, where ${C('count++')} = LOAD (r = count), ADD (r = r + 1), STORE (count = r). Over <b>all</b> possible interleavings of the 6n micro-steps, what are the minimum and maximum final values? Write a program that computes both exactly, and explain the minimum by hand.</p>`,
    constraints: `1 ≤ n ≤ 6 (state space must be explored exhaustively).`,
    example: `<p>n = 1 → min ${H.c('r', '1')}, max ${H.c('g', '2')}. n = 2 → min ${H.c('r', '2')}, max ${H.c('g', '4')}. For every n ≥ 2 the minimum is 2 — not n, as most people guess.</p>`,
    brute: {
      why: `<p>Enumerate every interleaving recursively without remembering states: the number of interleavings is C(6n, 3n) — about 2.7 million for n = 4 and about 9 billion for n = 6. The same (pcA, pcB, registers, count) state is re-explored many times.</p>`,
      code: `
class BruteInterleavings {
    static int n, min = Integer.MAX_VALUE, max = Integer.MIN_VALUE;
    static void go(int pa, int pb, int ra, int rb, int count) {
        int end = 3 * n;
        if (pa == end && pb == end) { min = Math.min(min, count); max = Math.max(max, count); return; }
        if (pa < end) {
            if (pa % 3 == 0) go(pa + 1, pb, count, rb, count);
            else if (pa % 3 == 1) go(pa + 1, pb, ra + 1, rb, count);
            else go(pa + 1, pb, ra, rb, ra);
        }
        if (pb < end) {
            if (pb % 3 == 0) go(pa, pb + 1, ra, count, count);
            else if (pb % 3 == 1) go(pa, pb + 1, ra, rb + 1, count);
            else go(pa, pb + 1, ra, rb, rb);
        }
    }
}`
    },
    mcq: { q: 'Which schedule produces 2 for n = 3?', options: ['A and B alternate micro-steps strictly', 'A loads 0 and stalls; B does 2 full increments; A stores 1; B loads 1 and stalls; A does its last 2 increments; B stores 2', 'B runs fully, then A', 'Impossible — the minimum is 3'], answer: 1, explain: 'A\'s stale store wipes B\'s first n−1 increments; B\'s stale store (of 1 + 1) wipes A\'s last n−1 increments. Each thread contributes exactly one surviving increment.' },
    hints: [
      `<p>Hint 1: a state is (pcA, pcB, rA, rB, count). The future depends only on the state, not on how you got there → memoize.</p>`,
      `<p>Hint 2: DFS returns {min, max} final count reachable from a state; combine the results of stepping A or B.</p>`,
      `<p>Hint 3: values stay ≤ 2n + 1 and pcs ≤ 3n, so pack the state into one long (6 bits per field) as the memo key.</p>`
    ],
    tests: { sig: 'int -> int[]', fn: 'chk', harness: { java: `
class Check {
  static int[] chk(int n) { return new LostUpdateExplorer(n).explore(); }
}` }, cases: [
        [[1], [1, 2]],
        [[2], [2, 4]],
        [[3], [2, 6]],
        [[4], [2, 8]],
        [[5], [2, 10]],
        [[6], [2, 12]]
      ] },
    solution: {
      approach: `<p><b>Explicit-state model checking with memoization.</b> This is how tools like jcstress' cousins and TLA+ reason about concurrency: enumerate reachable states, not paths. Each state is solved once. Hand proof of the minimum: every STORE writes at least 1. For n ≥ 2, the very last STORE belongs to a thread whose last LOAD came <i>after</i> its own earlier STORE, so it loaded ≥ 1 and stores ≥ 2. The schedule in the MCQ reaches exactly 2, so the minimum is 2 (for n = 1 both threads can load 0 and store 1).</p>`,
      code: `
class LostUpdateExplorer {
    private final int n;                                  // increments per thread
    private final Map<Long, int[]> memo = new HashMap<>();

    LostUpdateExplorer(int n) {
        if (n < 1 || n > 6) throw new IllegalArgumentException("1 <= n <= 6");
        this.n = n;
    }

    /** {min, max} final value of count over ALL interleavings. */
    int[] explore() { return dfs(0, 0, 0, 0, 0); }

    // pc = micro-steps done (0..3n): pc % 3 == 0 → LOAD, 1 → ADD, 2 → STORE
    private int[] dfs(int pa, int pb, int ra, int rb, int count) {
        int end = 3 * n;
        if (pa == end && pb == end) return new int[]{count, count};
        long key = ((((long) pa * 64 + pb) * 64 + ra) * 64 + rb) * 64 + count;
        int[] cached = memo.get(key);
        if (cached != null) return cached;
        int lo = Integer.MAX_VALUE, hi = Integer.MIN_VALUE;
        if (pa < end) {
            int[] r = switch (pa % 3) {
                case 0 -> dfs(pa + 1, pb, count, rb, count);    // A: LOAD
                case 1 -> dfs(pa + 1, pb, ra + 1, rb, count);   // A: ADD (private)
                default -> dfs(pa + 1, pb, ra, rb, ra);         // A: STORE
            };
            lo = Math.min(lo, r[0]); hi = Math.max(hi, r[1]);
        }
        if (pb < end) {
            int[] r = switch (pb % 3) {
                case 0 -> dfs(pa, pb + 1, ra, count, count);    // B: LOAD
                case 1 -> dfs(pa, pb + 1, ra, rb + 1, count);   // B: ADD
                default -> dfs(pa, pb + 1, ra, rb, rb);         // B: STORE
            };
            lo = Math.min(lo, r[0]); hi = Math.max(hi, r[1]);
        }
        int[] res = {lo, hi};
        memo.put(key, res);
        return res;
    }

    public static void main(String[] args) {
        for (int n = 1; n <= 5; n++) {
            int[] r = new LostUpdateExplorer(n).explore();
            System.out.println("n=" + n + " min=" + r[0] + " max=" + r[1]);   // n=1 min=1 max=2, then min=2 max=2n
        }
    }
}`,
      dry: { head: ['step (n = 2)', 'A', 'B', 'count'], rows: [['1', 'LOAD r=0', '', '0'], ['2', '', '1 full increment (LOAD 0, ADD, STORE 1)', '1'], ['3', 'ADD r=1, STORE 1 (wipes B)', '', '1'], ['4', '', 'LOAD r=1', '1'], ['5', '1 full increment (1 → 2)', '', '2'], ['6', '', 'ADD r=2, STORE 2 (wipes A)', '<span class="c-r">2</span>']] },
      complexity: `<p>States ≤ (3n+1)² · (2n+2)³ — under a million for n = 6; each solved once, O(1) work → effectively linear in the state count, versus C(6n, 3n) paths for brute force.</p>`,
      followUps: ['Apply partial-order reduction: ADD is thread-local, so merge it with LOAD. How much smaller is the state space?', 'With three threads, what is the minimum?', 'How does jcstress discover such outcomes empirically?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: `${C('Thread t = new Thread(() -> System.out.println(Thread.currentThread().getName()), "worker"); t.run();')} — what is printed (called from main)?`, options: ['worker', 'main', 'Thread-0', 'Nothing; run() throws'], answer: 1, explain: 'run() is an ordinary method call on the current (main) thread. Only start() creates a new thread that would print "worker".' },
    { q: 'A thread is trying to enter a <code>synchronized</code> block whose monitor another thread holds. What does <code>getState()</code> report?', options: ['WAITING', 'TIMED_WAITING', 'BLOCKED', 'RUNNABLE'], answer: 2, explain: 'BLOCKED means "waiting to acquire a monitor". WAITING is for wait()/join()/park() without timeout.' },
    { q: 'Two threads each run <code>count++</code> 1,000 times on a <code>volatile int count = 0</code>. Which statement is true?', options: ['The result is always 2000 because volatile is atomic', 'The result can be less than 2000', 'The program throws ConcurrentModificationException', 'The result is always exactly 1000'], answer: 1, explain: 'volatile guarantees visibility of each read and write, but count++ is still LOAD-ADD-STORE; interleavings lose updates.' },
    { q: 'Thread 1 is inside <code>static synchronized void a()</code> of class X. Can thread 2 enter <code>synchronized void b()</code> on an instance of X at the same time?', options: ['No, the class is locked', 'Yes — a() locks X.class, b() locks the instance: different monitors', 'Only if b() is final', 'Only after a() calls wait()'], answer: 1, explain: 'Static synchronized methods lock the Class object; instance synchronized methods lock this. They do not exclude each other.' },
    { q: 'A synchronized method <code>outer()</code> calls another synchronized method <code>inner()</code> on the same object. What happens?', options: ['Deadlock with itself', 'IllegalMonitorStateException', 'It proceeds: intrinsic locks are reentrant (hold count becomes 2)', 'inner() runs without any lock'], answer: 2, explain: 'The owner can re-acquire its own monitor; the JVM tracks a recursion count and releases only when it returns to 0.' },
    { q: 'Why must <code>wait()</code> be called inside a <code>while</code> loop that re-checks the condition?', options: ['Because wait() returns immediately the first time', 'Spurious wake-ups are allowed, and another thread may change the state between notify and re-acquiring the lock', 'To avoid IllegalMonitorStateException', 'It is only a style convention'], answer: 1, explain: 'A thread returning from wait() has no guarantee its condition holds: spurious wake-ups, stolen conditions, and notifyAll waking everyone all require a re-check.' },
    { q: 'What happens when a thread calls <code>lock.notifyAll()</code> without holding <code>lock</code>\'s monitor?', options: ['Nothing; the call is ignored', 'All waiters wake up anyway', 'IllegalMonitorStateException is thrown', 'Compile error'], answer: 2, explain: 'wait/notify/notifyAll require owning the target object\'s monitor; this is checked at runtime.' },
    { q: 'Which of these does NOT create a happens-before edge between two threads?', options: ['Unlocking a monitor, then another thread locking it', 'Writing a volatile, then another thread reading that value', '<code>t.join()</code> returning', 'The writer calling <code>Thread.sleep(1000)</code> before the reader reads a plain field'], answer: 3, explain: 'sleep() and yield() have no synchronization semantics (JLS 17.3). Waiting a long time is not a memory-visibility guarantee.' },
    { q: 'Plain fields x = y = 0. T1: <code>x = 1; r1 = y;</code> T2: <code>y = 1; r2 = x;</code> Which outcome surprises people but is legal?', options: ['r1 = 0, r2 = 1', 'r1 = 1, r2 = 0', 'r1 = 1, r2 = 1', 'r1 = 0, r2 = 0'], answer: 3, explain: 'Store buffers (even on x86) and compiler reordering allow both reads to happen before either write is visible. Making x and y volatile forbids (0, 0).' },
    { q: 'Always acquiring locks in a single global order prevents deadlock by breaking which Coffman condition?', options: ['Mutual exclusion', 'Hold and wait', 'No preemption', 'Circular wait'], answer: 3, explain: 'With a total order on locks, a chain of waiting threads can only go "upward" and can never close into a cycle.' },
    { q: 'Your service shows 100% CPU, threads are RUNNABLE, logs are full of "retrying", and no request completes. Most likely?', options: ['Deadlock', 'Livelock', 'Starvation of one thread', 'GC pause'], answer: 1, explain: 'Livelock: threads keep reacting to each other (retry without back-off) and burn CPU without progress. A deadlock would show BLOCKED threads and idle CPU.' },
    { q: 'Why does double-checked locking need <code>volatile</code> on the instance field?', options: ['To make the constructor synchronized', 'So the fast-path reader, which takes no lock, gets a happens-before edge and never sees a partially constructed object', 'To prevent two instances from being created', 'Because static fields are not visible across threads'], answer: 1, explain: 'Creating once is guaranteed by the lock + re-check. Safe publication to lock-free readers needs the volatile write/read pair.' },
    { q: 'An immutable object with only <code>final</code> fields is published through a plain (non-volatile) static field. A reader that sees the reference…', options: ['may see default values in its final fields', 'is guaranteed to see the constructor\'s values of the final fields (if this did not escape)', 'throws NullPointerException', 'must synchronize to read any field'], answer: 1, explain: 'final-field semantics (JLS 17.5) guarantee correctly initialized final fields to any thread that obtains the reference after construction — even through a data race.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { level: 'B', q: 'What is the difference between a process and a thread? What do threads share?', a: `<p>A <b>process</b> is a running program with its own address space (memory), file handles and at least one thread. A <b>thread</b> is an independent path of execution <b>inside</b> a process. Threads of one JVM share the <b>heap</b> (all objects, static fields, class metadata) but each has its own <b>stack</b> (locals, call frames) and program counter. Sharing makes communication cheap — just read a field — but it is also why races exist. Switching threads is cheaper than switching processes, and a crash (uncaught exception) kills one thread, while a native crash kills the whole process.</p>`, followUps: ['Where do local variables captured by a lambda live?', 'How much memory does a platform thread stack use by default?'] },
    { level: 'B', q: 'start() vs run(), and Runnable vs extending Thread?', a: `<p>${C('start()')} asks the JVM to create a new OS thread, which then calls ${C('run()')}; it returns immediately and can be called only once (second call → ${C('IllegalThreadStateException')}). Calling ${C('run()')} directly is an ordinary method call on the <b>current</b> thread — no concurrency at all. Prefer implementing ${C('Runnable')} (or a lambda): it separates the task from the worker, keeps your single inheritance slot free, and the same task can be submitted to an executor or a virtual thread. Extend ${C('Thread')} only if you truly customise thread behaviour.</p>`, followUps: ['What prints if you call run() on a Thread named "worker" from main?', 'How do you return a value from a thread? (Callable/Future — next module)'] },
    { level: 'I', q: 'Explain the six thread states. What is the difference between BLOCKED and WAITING?', a: `<p>${C('NEW')} (created), ${C('RUNNABLE')} (running or ready — Java does not distinguish; also shown for threads in native blocking I/O), ${C('BLOCKED')} (waiting to <b>acquire a monitor</b> for synchronized), ${C('WAITING')} (waiting indefinitely for another thread: ${C('wait()')}, ${C('join()')}, ${C('LockSupport.park()')}), ${C('TIMED_WAITING')} (same with a timeout, incl. ${C('sleep')}), ${C('TERMINATED')}. <b>BLOCKED</b> = lock contention: "the door is locked, I'm queuing". <b>WAITING</b> = voluntary: "I'm in the waiting room until someone notifies me". After notify, a waiting thread moves to BLOCKED until it re-acquires the monitor. ${C('ReentrantLock')} waiters show as WAITING (parking), not BLOCKED.</p>`, followUps: ['Which state is a thread in during Thread.sleep()?', 'Many threads RUNNABLE but CPU idle — what is going on?'] },
    { level: 'I', q: 'What exactly does synchronized guarantee, and which object does it lock?', a: `<p>Three guarantees: <b>mutual exclusion</b> (one thread at a time per monitor), <b>visibility</b> (an unlock happens-before every later lock of the same monitor, so the next owner sees all writes), and <b>ordering</b> (accesses cannot leak out of the critical section). An instance synchronized method locks ${C('this')}; a static one locks the ${C('Class')} object; a block locks the expression given. It is <b>reentrant</b> (hold count) and released on any exit including exceptions. It does not offer timeouts, interruptible acquisition or fairness — that is what ${C('ReentrantLock')} adds. Best practice: lock a private final object, guard all accesses (reads too) with the same lock, keep critical sections short.</p>`, followUps: ['Does a static synchronized method block an instance synchronized method?', 'Why is synchronized(someString) dangerous?'] },
    { level: 'I', q: 'volatile vs synchronized — when is volatile enough?', a: `<p>${C('volatile')} gives <b>visibility</b> and <b>ordering</b> (a volatile write publishes all prior writes to a thread that reads the value) plus atomic reads/writes even for long/double. It does <b>not</b> make compound actions (count++, check-then-act) atomic, and never blocks. ${C('synchronized')} gives visibility <b>and</b> atomicity of whole blocks. Volatile alone is enough when: (1) writes don't depend on the current value or only one thread writes, (2) the variable is not part of an invariant with other variables, (3) no locking is needed for other reasons. Classic uses: stop flags, status fields, a single-writer timestamp, publishing an immutable object (config snapshot), DCL instance field.</p>`, followUps: ['Is volatile int[] arr making the elements volatile?', 'Show the "cheap read-write lock" pattern.'] },
    { level: 'A', q: 'Explain happens-before and give the main rules with an example.', a: `<p>Happens-before (HB) is the JMM's partial order that defines visibility: if A HB B, B sees A's effects. If two conflicting accesses are not HB-ordered, it is a <b>data race</b> and reads may return stale or reordered values. Rules: program order within a thread; monitor unlock HB later lock of the same monitor; volatile write HB later read of that variable; ${C('Thread.start()')} HB actions of the started thread; a thread's actions HB another thread's return from ${C('join()')}; interrupt HB detection; final-field freeze at end of constructor; and <b>transitivity</b>. Example: T1 ${C('data = 42; ready = true;')} (ready volatile), T2 ${C('if (ready) print(data)')} — chain via program order → volatile → program order guarantees 42. java.util.concurrent classes document similar edges (put HB take, future completion HB get). HB is about visibility, not wall-clock time.</p>`, followUps: ['What is the DRF-SC guarantee?', 'Name five ways to safely publish an object.'] },
    { level: 'A', q: 'Why was double-checked locking broken, and how do you fix it today?', a: `<p>${C('instance = new X()')} is allocate → run constructor → store reference, and without synchronization the compiler/CPU may make the reference visible before the constructor's writes. A thread on the unsynchronized fast path sees non-null and uses a half-built object; since it never takes the lock, nothing gives it an HB edge. Fix since Java 5 (JSR-133): declare the field ${C('volatile')} — the volatile write publishes the fully constructed object; read it into a local to do a single volatile read on the fast path. Simpler alternatives: the <b>holder idiom</b> (static nested class with a static final field — lazy, thread-safe via class-init locking, zero synchronization in your code) or an <b>enum</b> singleton (also serialization- and reflection-safe).</p>`, followUps: ['Why read the volatile into a local variable?', 'Does making all fields of X final fix DCL without volatile?'] },
    { level: 'I', q: 'wait() vs sleep(); why the while loop; notify() vs notifyAll()?', a: `<p>${C('wait()')} is an Object method: must hold that object's monitor, <b>releases it</b>, waits until notify/notifyAll/interrupt/timeout/spurious wake-up, then re-acquires before returning. ${C('sleep()')} is a static Thread method: pauses the current thread for a time and <b>keeps</b> every lock it holds. Always wait in ${C('while (!condition)')}: spurious wake-ups, conditions stolen by other threads, and notifyAll waking threads whose condition is still false. Use ${C('notifyAll()')} by default; ${C('notify()')} is safe only if all waiters wait for the same condition and each notification lets exactly one proceed (e.g. a semaphore permit). Otherwise notify can wake the wrong thread and lose the wake-up, freezing the system.</p>`, followUps: ['What is a lost notification and how does the condition variable prevent it?', 'How do Condition objects improve on notifyAll?'] },
    { level: 'A', q: 'Implement a producer-consumer bounded buffer without java.util.concurrent. Walk me through it.', a: `<p>State: a ring array (or deque), count, capacity — all guarded by the buffer's monitor. ${C('put')}: synchronized; ${C('while (count == capacity) wait();')} insert; ${C('notifyAll()')}. ${C('take')}: synchronized; ${C('while (count == 0) wait();')} remove; ${C('notifyAll()')}; return. Why it works: the monitor makes each operation atomic and visible; wait releases the lock so the other side can make progress; while loops make spurious/stolen wake-ups harmless; notifyAll is needed because producers and consumers share one wait set with different conditions. InterruptedException propagates so callers can cancel. In production use ${C('ArrayBlockingQueue')}, which is the same design with one ReentrantLock and two Conditions (notFull, notEmpty) to avoid waking the wrong side.</p>`, followUps: ['What breaks with if instead of while?', 'How would you add a timeout to put?'] },
    { level: 'I', q: 'What is a deadlock? How do you prevent, detect and recover from it in Java?', a: `<p>Threads blocked forever, each waiting for a lock held by another — a cycle in the wait-for graph. It needs all four <b>Coffman conditions</b>: mutual exclusion, hold-and-wait, no preemption, circular wait. <b>Prevent</b>: global lock ordering (e.g. by account id) breaks circular wait; ${C('tryLock(timeout)')} with back-off breaks no-preemption; a single coarse lock breaks hold-and-wait; open calls (no alien methods under a lock). <b>Detect</b>: ${C('jstack')}/${C('jcmd Thread.print')} print "Found one Java-level deadlock"; ${C('ThreadMXBean.findDeadlockedThreads()')} programmatically; JFR. <b>Recover</b>: intrinsic-lock deadlocks are unrecoverable (BLOCKED threads cannot be interrupted) — restart; hence prefer ordering or timed locks in risky paths.</p>`, followUps: ['Write a deadlock-free transfer(a, b).', 'What is a thread-starvation deadlock in an executor?'] },
    { level: 'A', q: 'Explain livelock and starvation with real examples and fixes.', a: `<p><b>Livelock</b>: threads stay active but make no progress because they keep reacting to each other — two threads that tryLock a second lock, fail, release, and retry in lockstep; message handlers that keep rolling back each other's transactions. Symptoms: high CPU, RUNNABLE threads, endless retries. Fix: randomized/exponential back-off with jitter, or a deterministic tie-breaker (ordering). <b>Starvation</b>: a thread never gets a resource although others progress — unfair locks with barging, a reader-preferring RW lock under constant reads starving writers, a thread holding a lock for long periods, CPU-bound tasks hogging virtual-thread carriers. Fixes: fair locks (${C('ReentrantLock(true)')}), writer preference / FIFO queues, shorter critical sections, separate pools for CPU-heavy work.</p>`, followUps: ['Why are fair locks slower?', 'How do retry storms in microservices relate to livelock?'] },
    { level: 'A', q: 'What is the difference between a race condition and a data race?', a: `<p>A <b>data race</b> (JLS definition) is two accesses to the same variable from different threads, at least one a write, not ordered by happens-before. It is a memory-model concept; its consequence is that reads may see stale or reordered values. A <b>race condition</b> is a correctness bug where the outcome depends on timing — e.g. check-then-act or read-modify-write without atomicity. They overlap but neither implies the other: ${C('if (atomic.get() > 0) atomic.decrementAndGet()')} has no data race but is a race condition; a benign data race like ${C('String.hashCode')}'s cached hash is not a race condition because every thread computes the same value. Fixing data races (locks/volatile) gives visibility; fixing race conditions requires making the whole compound action atomic.</p>`, followUps: ['Give a race condition built entirely from thread-safe collection calls.', 'Why is String.hashCode caching safe without volatile?'] },
    { level: 'E', q: 'How does HotSpot implement synchronized, and what changed in recent JDKs?', a: `<p>Each object header has a mark word. Uncontended locking uses a <b>lightweight/thin lock</b>: a CAS installs a lock record, costing a few nanoseconds. On contention (or wait/notify) the lock <b>inflates</b> to an ${C('ObjectMonitor')} with owner, recursion count, entry list (BLOCKED threads) and wait set; threads spin adaptively before parking. Bytecode: blocks use ${C('monitorenter/monitorexit')} plus an exception handler; methods use the ${C('ACC_SYNCHRONIZED')} flag. <b>Biased locking</b> was deprecated in JDK 15 and removed in JDK 18 (CAS got cheap, revocation was costly). A new lightweight-locking scheme (opt-in in 21, default in 23) avoids displacing the header, enabling compact object headers. JIT optimisations: lock elision via escape analysis and lock coarsening. With virtual threads, synchronized pinned the carrier in Java 21; JEP 491 (JDK 24) fixed that.</p>`, followUps: ['What is lock coarsening and when can it hurt latency?', 'How would you find the most contended monitor in production? (JFR jdk.JavaMonitorEnter)'] },
    { level: 'E', q: 'Concurrent code passes all tests on Intel laptops but fails on ARM servers. Why, and how do you make it robust?', a: `<p>x86 has a strong hardware memory model (TSO): it only lets a later load overtake an earlier store, so many data races happen to "work". ARM64 (Graviton, Apple Silicon) and POWER allow store-store and load-load reordering, so a plain ready-flag pattern can expose the flag before the data. The JIT is also allowed to reorder on any platform. The code has a <b>data race</b> that x86 masked. Fix the program, not the platform: establish happens-before with volatile, locks, or java.util.concurrent hand-offs; publish immutable objects; and test with jcstress on ARM CI runners. Because of DRF-SC, once the program is data-race-free it behaves identically on every architecture.</p>`, followUps: ['What do volatile reads and writes compile to on ARM64 (ldar/stlr)?', 'When would you use VarHandle acquire/release instead of volatile?'] },
    { level: 'A', q: 'How do you stop a thread correctly? What is the right way to handle InterruptedException?', a: `<p>Java cancellation is <b>cooperative</b>. ${C('Thread.stop()')} was unsafe (it could leave objects half-updated) and throws ${C('UnsupportedOperationException')} since JDK 20. Use ${C('thread.interrupt()')}: blocking methods (sleep, wait, join, BlockingQueue.take, lockInterruptibly) throw ${C('InterruptedException')}, and loops check ${C('Thread.currentThread().isInterrupted()')}. A volatile "running" flag works for loops that never block. When you catch InterruptedException you must either propagate it (declare ${C('throws')}) or restore the flag with ${C('Thread.currentThread().interrupt()')} — swallowing it hides the cancellation request from callers, so executors' ${C('shutdownNow()')} and timeouts stop working. Clean up (finally blocks) and exit promptly.</p>`, followUps: ['Why does catching InterruptedException clear the interrupt flag?', 'How do you cancel a thread blocked in non-interruptible socket I/O?'] }
  );

  registerModule({
    id: 'java11',
    title: 'Concurrency I: Threads & the Java Memory Model',
    intro: `<p>Your laptop has 8–16 cores and every backend server handles thousands of requests at once — so every serious Java job, and almost every senior Java interview, tests <b>concurrency</b>. This module builds it from the ground up, using plain Java only: what a thread really is and how it moves through its <b>lifecycle</b>; why ${C('count++')} silently loses updates (<b>race conditions</b>); how ${C('synchronized')} and <b>intrinsic locks</b> fix them; why a loop can spin forever without ${C('volatile')} (<b>visibility vs atomicity</b>); the <b>Java Memory Model</b> and its <b>happens-before</b> rules; coordinating threads with <b>wait/notify</b>; and how systems freeze through <b>deadlock, livelock and starvation</b>.</p>
<p>Every topic has a visualizer where you play the scheduler — interleave two threads step by step, watch shared variables, lock owners, wait sets and the thread state machine change — plus "<b>what can this print?</b>" puzzles, because interviewers love asking for <i>all</i> possible outputs. The next module (Concurrency II) builds on this with ${C('java.util.concurrent')}: executors, atomics, locks, CompletableFuture and virtual threads.</p>`,
    goals: [
      'Create, start, join and interrupt threads correctly, and read any thread state (NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED) in a thread dump',
      'Spot read-modify-write and check-then-act races in code and list every possible output of small concurrent programs',
      'Make classes thread-safe with synchronized, choosing the right lock object and guarding every access to an invariant',
      'Explain visibility vs atomicity vs ordering, and state exactly when volatile alone is enough',
      'Use happens-before rules (locks, volatile, start/join, final fields) to prove code correct, and fix double-checked locking',
      'Write guarded blocks with wait/notifyAll (bounded buffer, latch, semaphore, LeetCode 1114–1117 style problems)',
      'Prevent deadlock with lock ordering, detect it with jstack/ThreadMXBean, and recognise livelock and starvation'
    ],
    prereqs: `Java 3–4 (classes, objects, static, interfaces), Java 9 (lambdas — used to write Runnables), and comfort with Java 7 (collections). Helpful: Java 10 (Collections Internals) for the ConcurrentHashMap remarks. No prior concurrency knowledge needed.`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
