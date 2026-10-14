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
        System.out.println(count);     // usually < 200000
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
registerModule({ id: 'java11', title: 'Concurrency I', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
