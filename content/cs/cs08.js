(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes in shell/C++/Python code stay as typed
  // Compact problem builder (keeps the problem shape identical everywhere)
  function P(o) {
    return {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || 'Any mainstream Linux distro with GNU coreutils (bash 5, GNU sed/awk/find).', example: o.ex,
      brute: { why: o.bw, code: o.bc },
      mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, code: o.code, complexity: o.cx, followUps: o.f }
    };
  }
  function words(s) { return String(s).trim().split(/\s+/).filter(Boolean); }
  // ───────────────────────── Topic 1: processes & signals ─────────────────────────
  topics.push({
    title: 'Processes and Signals: kill, trap, SIGTERM vs SIGKILL',
    analogy: `<p>A process is a <b>worker in an office</b>. A signal is a <b>sticky note on their desk</b> that the building manager (the kernel) delivers. The worker can have a rule for each kind of note: "if the note says <i>please wrap up</i>, finish my paperwork, then leave" (a <b>handler</b>), "ignore this kind of note", or just follow the default company rule ("a note saying <i>leave now</i> means walk out"). One special note, <b>SIGKILL</b>, is the manager pulling the fire alarm: the worker never even reads it - security removes them on the spot.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> Every running program is a <b>process</b> with a number called the <b>PID</b>. You can see them with <code>ps</code> or <code>top</code>. A <b>signal</b> is a tiny message (just a number) the kernel delivers to a process: "someone pressed Ctrl+C", "your child exited", "you were asked to stop".</p>
      ${H.table(['Signal', 'Number', 'Default action', 'Can you catch it?', 'Typical source'], [
        ['<b>SIGHUP</b>', '1', 'terminate', 'yes', 'terminal closed; daemons reuse it as "reload config"'],
        ['<b>SIGINT</b>', '2', 'terminate', 'yes', 'you press <kbd>Ctrl+C</kbd>'],
        ['<b>SIGQUIT</b>', '3', 'terminate + core dump', 'yes', '<kbd>Ctrl+\\</kbd>'],
        ['<b>SIGKILL</b>', '9', 'terminate (instantly)', '<span class="c-r">NO - never</span>', '<code>kill -9</code>, the OOM killer'],
        ['<b>SIGTERM</b>', '15', 'terminate', 'yes', '<code>kill PID</code> (the default!), systemd stop, Kubernetes'],
        ['<b>SIGCHLD</b>', '17', 'ignore', 'yes', 'a child process exited or stopped'],
        ['<b>SIGSTOP</b> / SIGCONT', '19 / 18', 'pause / resume', 'SIGSTOP: <span class="c-r">NO</span>', '<kbd>Ctrl+Z</kbd> sends SIGTSTP (catchable cousin)'],
        ['<b>SIGUSR1</b> / SIGUSR2', '10 / 12', 'terminate', 'yes', 'whatever your app decides']
      ])}
      <p>🔵 <b>SIGTERM vs SIGKILL - the one rule.</b> <code>kill PID</code> sends <b>SIGTERM</b> ("please stop"). A well-written program catches it, finishes in-flight requests, flushes files, closes sockets, then exits. <code>kill -9 PID</code> sends <b>SIGKILL</b>: the kernel tears the process down immediately, no cleanup code runs. So the polite order is: <b>TERM first, wait a few seconds, KILL only if it is stuck</b>. Using <code>-9</code> as a habit leaves half-written files, stale lock files and orphaned child processes.</p>
      <p>🔵 <b>Shell tools.</b></p>
      <ul>
        <li><code>kill -l</code> lists signal names; <code>kill -TERM 1234</code>, <code>kill -s HUP 1234</code>, <code>kill -0 1234</code> (sends nothing - just tests "does this PID exist and may I signal it?").</li>
        <li><code>pkill -f name</code> / <code>pgrep -f name</code> match by command line; <code>killall name</code> matches by exact process name.</li>
        <li><b>Job control:</b> <kbd>Ctrl+C</kbd> = SIGINT to the foreground job, <kbd>Ctrl+Z</kbd> = pause it, <code>bg</code> resumes in background, <code>fg</code> brings it back, <code>jobs</code> lists them, <code>cmd &amp;</code> starts in background, <code>nohup cmd &amp;</code> survives the terminal closing (ignores SIGHUP).</li>
        <li><b>trap</b> is the shell's way to install a handler: <code>trap 'echo bye; rm -f /tmp/lock' EXIT</code> or <code>trap cleanup SIGINT SIGTERM</code>.</li>
      </ul>
      <p>🔵 <b>Zombies and SIGCHLD.</b> When a child exits, the kernel keeps a tiny record (its exit code) until the parent calls <code>wait()</code>. Until then the child is a <b>zombie</b> (<code>Z</code> in <code>ps</code>). A zombie uses no CPU or memory - just a PID slot - but thousands of them exhaust the PID table. The fix is to make the parent <code>wait()</code> (usually inside a SIGCHLD handler), or kill the parent so that PID 1 adopts and reaps them. You cannot kill a zombie: it is already dead.</p>`,
    clues: [
      '"graceful shutdown" / "drain connections before exit" → catch <b>SIGTERM</b>, set a flag, finish work, exit 0',
      '"process will not die" / "kill does nothing" → it ignores TERM or is in uninterruptible sleep (<code>D</code> state) - only <b>SIGKILL</b>, or fixing the I/O, helps',
      '"reload config without restarting" → <b>SIGHUP</b> convention (nginx, sshd, rsyslog)',
      '"defunct" / "&lt;defunct&gt;" / state <code>Z</code> in ps → zombie: parent never called <code>wait()</code>',
      '"script leaves temp files after Ctrl+C" → missing <code>trap ... EXIT INT TERM</code>',
      '"Kubernetes gives the pod 30 s then kills it" → SIGTERM, <code>terminationGracePeriodSeconds</code>, then SIGKILL',
      '"container ignores SIGTERM" → your app is PID 1 with no handler (kernel gives PID 1 no default signal actions) → use <code>tini</code>/<code>--init</code>'
    ],
    code: [
      { lang: 'cpp', code: R`// signal_demo.cpp - a polite C++ service: catch SIGTERM/SIGINT, finish, exit cleanly.
#include <signal.h>
#include <unistd.h>
#include <cstdio>
#include <cstring>

// A handler may only do "async-signal-safe" things. The safest job is to set a flag.
// volatile sig_atomic_t is the one type guaranteed to be written atomically.
static volatile sig_atomic_t g_stop = 0;
static volatile sig_atomic_t g_reload = 0;

static void on_term(int)  { g_stop = 1; }      // SIGTERM / SIGINT -> leave the main loop
static void on_hup(int)   { g_reload = 1; }    // SIGHUP -> re-read config at a safe moment

int main() {
    struct sigaction sa;
    memset(&sa, 0, sizeof sa);
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART;                  // restart slow syscalls (read/accept) after the handler

    sa.sa_handler = on_term;
    sigaction(SIGTERM, &sa, nullptr);          // prefer sigaction() over old signal(): portable semantics
    sigaction(SIGINT,  &sa, nullptr);

    sa.sa_handler = on_hup;
    sigaction(SIGHUP,  &sa, nullptr);

    signal(SIGPIPE, SIG_IGN);                  // writing to a closed socket should return EPIPE, not kill us
    // SIGKILL and SIGSTOP cannot be caught or ignored - sigaction() on them fails.

    printf("pid=%d  try: kill -HUP %d   then   kill %d\n", getpid(), getpid(), getpid());
    fflush(stdout);

    int ticks = 0;
    while (!g_stop && ticks < 600) {           // main loop = "the real work"
        if (g_reload) { g_reload = 0; printf("reloading config...\n"); fflush(stdout); }
        sleep(1);                              // a signal interrupts sleep() early, so we react quickly
        ++ticks;
    }
    printf("SIGTERM received: flushing buffers, closing sockets, bye\n");
    return 0;                                  // exit code 0 = clean shutdown
}` },
      { lang: 'cpp', code: R`// reap_children.cpp - avoid zombies by reaping inside a SIGCHLD handler.
#include <signal.h>
#include <sys/wait.h>
#include <unistd.h>
#include <cstdio>
#include <cstring>
#include <cerrno>

static void on_chld(int) {
    int saved = errno;                         // handlers must not clobber errno of the interrupted code
    // One SIGCHLD can stand for several dead children (signals are not queued), so loop.
    while (waitpid(-1, nullptr, WNOHANG) > 0) { /* reaped one child */ }
    errno = saved;
}

int main() {
    struct sigaction sa;
    memset(&sa, 0, sizeof sa);
    sa.sa_handler = on_chld;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART | SA_NOCLDSTOP;   // do not wake us when a child is merely stopped
    sigaction(SIGCHLD, &sa, nullptr);

    for (int i = 0; i < 3; ++i) {
        pid_t pid = fork();
        if (pid == 0) { _exit(i); }            // child: exits at once with code i
    }
    sleep(1);                                  // while we sleep, SIGCHLD fires and the handler reaps all 3
    printf("no zombies left - check with: ps -o pid,stat,cmd --ppid %d\n", getpid());
    return 0;
}` },
      R`#!/usr/bin/env bash
# graceful.sh - a shell script that cleans up after itself on Ctrl+C, kill, or normal exit.
set -u
WORKDIR=$(mktemp -d)                 # private temp dir
echo "work dir: $WORKDIR  pid: $$"

cleanup() {
  echo "cleanup: removing $WORKDIR"
  rm -rf "$WORKDIR"
}
# EXIT fires on every way out (normal end, exit N, and after the signal traps below).
trap cleanup EXIT
# For signals we exit with 128+signal-number, the shell convention; EXIT then runs cleanup.
trap 'echo "got SIGINT";  exit 130' INT
trap 'echo "got SIGTERM"; exit 143' TERM
trap 'echo "got SIGHUP: reloading"' HUP   # no exit -> the script keeps running

while true; do
  date >> "$WORKDIR/heartbeat.log"
  sleep 1 &                          # sleep in background...
  wait $!                            # ...and wait: a trap can only run between commands, and 'wait' returns at once on a signal
done`
    ],
    codeTitle: ['C++: catch SIGTERM / SIGINT / SIGHUP with sigaction', 'C++: reap children in a SIGCHLD handler (no zombies)', 'Bash: trap for graceful shutdown + cleanup'],
    viz: {
      title: 'Signal delivery: handler vs default action',
      input: 'SIGTERM handler',
      inputLabel: 'signal + "handler" or "default" (e.g. SIGTERM handler, SIGKILL handler, SIGINT default, SIGCHLD default)',
      gen: function (input) {
        var w = words(input);
        var sig = (w[0] || 'SIGTERM').toUpperCase();
        if (sig.indexOf('SIG') !== 0) sig = 'SIG' + sig;
        var mode = (w[1] || 'handler').toLowerCase();
        var known = { SIGHUP: 'terminate', SIGINT: 'terminate', SIGQUIT: 'terminate and dump core', SIGKILL: 'terminate', SIGTERM: 'terminate', SIGCHLD: 'ignore', SIGUSR1: 'terminate', SIGUSR2: 'terminate', SIGSTOP: 'stop (pause)', SIGCONT: 'continue' };
        if (!known[sig] || (mode !== 'handler' && mode !== 'default')) throw new Error('Try: SIGTERM handler | SIGKILL handler | SIGINT default | SIGCHLD default');
        var uncatchable = sig === 'SIGKILL' || sig === 'SIGSTOP';
        var nodes = [
          { id: 'S', label: 'sender (kill / Ctrl+C / kernel)', x: 14, y: 10, shape: 'box', w: 26 },
          { id: 'K', label: 'KERNEL', x: 50, y: 10, shape: 'box', w: 14 },
          { id: 'P', label: 'PROCESS', x: 86, y: 10, shape: 'box', w: 16 },
          { id: 'H', label: 'your handler()', x: 86, y: 30, shape: 'box', w: 20 },
          { id: 'D', label: 'default action', x: 50, y: 30, shape: 'box', w: 20 }
        ];
        var edges = [['S', 'K', 'kill()'], ['K', 'P', 'deliver'], ['P', 'H', 'call'], ['K', 'D', 'apply']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'who talks to whom', directed: true, height: 40, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        function q(items, hl) { return { type: 'queue', label: 'pending signals of the process', items: items, hl: hl || {}, frontLabel: 'next to deliver', backLabel: '' }; }
        var f = [];
        f.push({ narr: 'A process is running normally. It has a <b>disposition table</b>: for each signal, "default", "ignore" or "my handler". Here we study <b>' + sig + '</b> with mode <b>' + mode + '</b>.', parts: [g({ P: 'ok' }), q([]), { type: 'text', html: 'Default action for ' + sig + ': <b>' + known[sig] + '</b>. Can it be caught? <b>' + (uncatchable ? 'NO' : 'yes') + '</b>.' }] });
        f.push({ narr: 'Someone sends <b>' + sig + '</b> (for example <code>kill -' + sig.slice(3) + ' PID</code>). The request goes to the kernel - only the kernel can touch another process.', parts: [g({ S: 'cur', K: 'cur' }, { 'S-K': 'cur' }), q([])] });
        f.push({ narr: 'The kernel checks permission (same user, or root) and then sets a bit in the process\'s <b>pending set</b>. Note: pending signals are a <i>set</i>, not a queue, so 5 SIGCHLDs in a row may collapse into one.', parts: [g({ K: 'cur', P: 'win' }, { 'K-P': 'cur' }), q([sig], { 0: 'cur' })] });
        f.push({ narr: 'The process is not interrupted mid-instruction. The kernel acts when the process is about to <b>return to user mode</b> (after a syscall or timer tick). It looks up the disposition for ' + sig + '.', parts: [g({ P: 'cur', K: 'win' }), q([sig], { 0: 'cur' })] });
        if (uncatchable) {
          f.push({ narr: '<span class="c-r">' + sig + ' cannot be caught, blocked or ignored.</span> Even though you "installed a handler", <code>sigaction()</code> for it would have failed. The kernel goes straight to the default action - your cleanup code never runs.', parts: [g({ K: 'bad', D: 'bad' }, { 'K-D': 'bad' }), q([sig], { 0: 'bad' })] });
          f.push({ narr: sig === 'SIGKILL' ? 'The process is destroyed: memory freed, files closed, parent gets SIGCHLD. No flush, no lock-file removal, no goodbye. This is why SIGKILL is the <b>last</b> resort.' : 'The process is frozen (state <code>T</code>). It stays in memory until someone sends SIGCONT.', parts: [g({ P: 'bad', D: 'bad' }), q([]), { type: 'text', html: sig === 'SIGKILL' ? '<b>Process gone.</b> Children are re-parented to PID 1.' : '<b>Process stopped.</b> Resume with <code>kill -CONT PID</code>.' }] });
          f.push({ narr: 'Lesson: use SIGTERM for "please stop", wait (systemd waits 90 s by default, Kubernetes 30 s), and only then SIGKILL.', parts: [g({}), q([])] });
        } else if (mode === 'handler') {
          f.push({ narr: 'A handler is registered, so the kernel <b>pauses the normal code</b>, saves its registers, and jumps into <code>handler(' + sig.slice(3) + ')</code>.', parts: [g({ P: 'cur', H: 'ok' }, { 'P-H': 'ok' }), q([sig], { 0: 'ok' })] });
          f.push({ narr: 'The handler runs. Good handlers do almost nothing: set a flag like <code>g_stop = 1</code>. They must not call <code>malloc</code> or <code>printf</code> (not async-signal-safe).', parts: [g({ H: 'cur' }), q([]), { type: 'vars', label: 'shared state', vals: { g_stop: 1 }, hl: { g_stop: 'ok' } }] });
          f.push({ narr: 'The handler returns; the kernel restores the saved registers and the interrupted code <b>continues exactly where it stopped</b>. The signal is no longer pending.', parts: [g({ P: 'ok' }), q([])] });
          f.push({ narr: 'The main loop sees the flag, finishes in-flight work, flushes buffers, and calls <code>exit(0)</code> - a <b>graceful</b> shutdown. ' + (sig === 'SIGCHLD' ? 'For SIGCHLD the handler would call waitpid() to reap the child.' : ''), parts: [g({ P: 'sel' }), q([]), { type: 'text', html: '<span class="c-g">Clean exit, exit code 0.</span>' }] });
        } else {
          f.push({ narr: 'No handler installed, so the kernel applies the <b>default action</b>: <b>' + known[sig] + '</b>.', parts: [g({ K: 'cur', D: 'cur' }, { 'K-D': 'cur' }), q([sig], { 0: 'cur' })] });
          var ign = known[sig] === 'ignore', cont = known[sig] === 'continue';
          f.push({ narr: ign ? 'The signal is simply discarded. The process never notices. (That is why SIGCHLD does nothing unless you wait() for the child yourself.)' : cont ? 'The process resumes if it was stopped; otherwise nothing happens.' : 'The process is terminated at once - no cleanup code runs, exactly like SIGKILL as far as your program is concerned. Exit status seen by the parent: 128 + signal number.', parts: [g({ D: ign || cont ? 'ok' : 'bad', P: ign || cont ? 'ok' : 'bad' }), q([]), { type: 'text', html: ign || cont ? '<span class="c-g">Process keeps running.</span>' : '<span class="c-r">Process dead.</span> <code>echo $?</code> in the parent shows ' + (128 + ({ SIGHUP: 1, SIGINT: 2, SIGQUIT: 3, SIGTERM: 15, SIGUSR1: 10, SIGUSR2: 12 }[sig] || 0)) + '.' }] });
          f.push({ narr: 'Takeaway: with <b>default</b> disposition SIGTERM and SIGINT already kill you - but abruptly. Install a handler (or <code>trap</code> in shell) when you need cleanup.', parts: [g({}), q([])] });
        }
        return f;
      }
    },
    examples: [
      { title: 'Stop a stubborn process politely, then firmly', html: `<p>Standard escalation ladder used by every ops person. Each step gives the program time to clean up.</p>`, code: `PID=$(pgrep -f myserver | head -1)
kill -TERM "$PID"            # 1. ask nicely (same as: kill $PID)
sleep 10                      # 2. give it time to drain connections
if kill -0 "$PID" 2>/dev/null; then   # 3. still alive? (kill -0 sends nothing, just tests)
  echo "still running, forcing"
  kill -KILL "$PID"           # 4. last resort
fi` },
      { title: 'Foreground, background, and surviving logout', html: `<p>Run a long job, pause it, push it to the background, and make a second one that survives closing your SSH session. <code>nohup</code> makes the process ignore <b>SIGHUP</b>, the signal a terminal sends to its children when it hangs up.</p>`, code: `sleep 300            # runs in foreground; press Ctrl+Z -> "[1]+ Stopped"
bg                   # resume it in the background
jobs                 # [1]+ Running  sleep 300 &
fg %1                # bring it back; Ctrl+C kills it with SIGINT
nohup ./train.sh > train.log 2>&1 &   # survives logout; output goes to train.log
disown -h %1         # alternative for a job you already started` },
      { title: 'Find and clear zombies', html: `<p>Zombies show state <code>Z</code>. Killing the zombie does nothing; you must deal with its <b>parent</b>.</p>`, code: `ps -eo pid,ppid,stat,cmd | awk '$3 ~ /^Z/'     # list zombies with their parent PID
ps -o pid,cmd -p 4321                           # who is the parent (PPID 4321)?
kill -CHLD 4321                                 # sometimes nudges a buggy parent to wait()
kill 4321                                       # else end the parent; PID 1 adopts + reaps the zombies` }
    ],
    deepDive: `<p>🟣 <b>Delivery rules.</b> Signals are delivered when a thread returns from kernel to user mode. <b>Standard signals do not queue</b>: if SIGCHLD arrives 5 times while one is pending, you get one handler call - which is why SIGCHLD handlers loop on <code>waitpid(-1, ..., WNOHANG)</code>. Real-time signals (SIGRTMIN..SIGRTMAX) do queue and carry a payload via <code>sigqueue()</code>.</p>
      <p><b>Async-signal-safety.</b> A handler can interrupt <i>any</i> instruction, even the middle of <code>malloc</code>. If the handler also calls <code>malloc</code> or <code>printf</code> it can deadlock on a lock the interrupted code already holds. Only the POSIX "async-signal-safe" list (<code>write</code>, <code>_exit</code>, <code>waitpid</code>, <code>kill</code> ...) is allowed. The robust pattern: handler sets a <code>volatile sig_atomic_t</code> flag, or writes one byte to a <b>self-pipe / signalfd / eventfd</b> that the main <code>poll/epoll</code> loop watches.</p>
      <p><b>Race in the classic loop.</b> <code>while(!flag) pause();</code> has a window: a signal arriving between the test and <code>pause()</code> is lost and you sleep forever. The correct tools are <code>sigsuspend()</code> (atomically unblock + wait) or <code>ppoll</code>/<code>signalfd</code>. In multithreaded programs block signals in all threads except one dedicated thread that calls <code>sigwait()</code>.</p>
      <p><b>Exit statuses.</b> A process killed by signal N is reported by the shell as <code>128+N</code> (SIGKILL → 137, SIGTERM → 143, SIGINT → 130, SIGSEGV → 139). "Exit code 137" in a container log almost always means <b>OOM-killed</b> (or a SIGKILL after the grace period).</p>
      <p><b>PID 1 is special.</b> The kernel gives PID 1 of a PID namespace <i>no default actions</i>: signals with default disposition are ignored for it. A Node/Python app running as PID 1 in a container without a handler ignores SIGTERM, and Docker waits 10 s and then SIGKILLs it. Use <code>docker run --init</code>, <code>tini</code>, or install handlers. Also, PID 1 must reap orphaned zombies.</p>
      <p><b>Process groups and sessions.</b> Ctrl+C goes to the whole <b>foreground process group</b>, not one PID. <code>kill -TERM -1234</code> (negative PID) signals the entire group 1234 - useful to kill a pipeline and all its helpers. A <b>daemon</b> detaches with <code>setsid()</code> so a closing terminal cannot HUP it.</p>
      <p><b>D state.</b> A process in uninterruptible sleep (<code>D</code>, usually waiting for a dead NFS server or failing disk) ignores even SIGKILL until the I/O returns. Signals are checked on return from the syscall.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Assistants generate shutdown code and Dockerfiles in seconds, and they are usually right about the happy path (<code>trap cleanup EXIT</code>). <b>Where they go wrong:</b> they love <code>kill -9</code> as "the fix", they call <code>printf</code>/<code>std::cout</code> inside a signal handler (undefined behaviour), they forget <code>exec</code> in entrypoint scripts so the real app is not PID 1 and never sees SIGTERM, and they write <code>while(!flag) pause();</code> races.</p>
      <p><b>Use AI as a partner:</b> paste your handler and ask "<i>list every function in this handler that is not async-signal-safe</i>", or ask for a test plan: "<i>how do I prove my service drains requests on SIGTERM?</i>" (answer: send TERM during a load test and count failed requests). <b>What you must still own:</b> knowing the TERM → grace → KILL ladder, why exit code 137/143 happens, and how your orchestrator (systemd, Kubernetes) sequences signals. Agents that run shell commands for you also use <code>kill</code> - review any command containing <code>kill -9</code>, <code>pkill -f</code> or <code>killall</code> before approving, because a loose pattern can kill the wrong process (including your own session).</p>`,
    problems: [
      P({
        t: 'Graceful shutdown with trap', l: 'Medium', tags: ['trap', 'signals', 'bash'], co: ['Google', 'Amazon'],
        s: `<p>Write a bash script that creates a temp directory and a lock file <code>/tmp/job.lock</code>, loops forever doing "work" (append a line to a log every second), and on <b>SIGINT, SIGTERM, or normal exit</b> prints a message, deletes the lock file and temp dir, and exits. SIGTERM must give exit code 143 and SIGINT 130.</p>`,
        ex: `<p>Run <code>./job.sh &amp;</code> then <code>kill $!</code>.</p><p>Output: <span class="c-g">got SIGTERM</span> then <span class="c-g">cleanup done</span>; <code>echo $?</code> after <code>wait</code> shows <b>143</b> = 128 + 15. The lock file is gone.</p>`,
        bw: `<p>No trap at all: Ctrl+C or <code>kill</code> kills the shell instantly, so the lock file stays forever and the next run says "already running". Also <code>kill -9</code> habit teaches nothing. The wasted work is humans deleting stale locks by hand.</p>`,
        bc: `#!/bin/bash
touch /tmp/job.lock
while true; do date >> /tmp/job.log; sleep 1; done
# Ctrl+C -> script dies, /tmp/job.lock is left behind`,
        q: ['Where should rm -f of the lock file live?', ['In a trap on EXIT (plus INT/TERM that call exit)', 'Only after the while loop', 'In a trap on SIGKILL', 'In ~/.bashrc'], 0, 'Code after an infinite loop never runs, and SIGKILL cannot be trapped. EXIT fires on every normal path; INT/TERM traps call exit so EXIT then runs the cleanup.'],
        h: ['<p>Hint 1: a trap runs a command when a signal arrives; the pseudo-signal <code>EXIT</code> runs when the shell is about to leave for any reason.</p>', '<p>Hint 2: put cleanup in a function, <code>trap cleanup EXIT</code>, and give INT and TERM their own small traps that print and call <code>exit 130</code> / <code>exit 143</code>.</p>', '<p>Hint 3: a bash trap only runs between commands. If the loop is stuck in a long <code>sleep 60</code>, the trap waits. Use <code>sleep 1 &amp; wait $!</code> so <code>wait</code> returns immediately on a signal.</p>'],
        a: `<p>Define <code>cleanup()</code> to remove the lock file and temp dir. Register <code>trap cleanup EXIT</code>, then <code>trap 'echo got SIGINT; exit 130' INT</code> and the same for TERM with 143. When a signal arrives, the INT/TERM trap runs, calls <code>exit</code>, and that triggers the EXIT trap, so cleanup runs exactly once. Use <code>sleep 1 &amp; wait $!</code> inside the loop so the shell reacts at once.</p>`,
        code: `#!/usr/bin/env bash
LOCK=/tmp/job.lock
WORK=$(mktemp -d)
touch "$LOCK"

cleanup() { echo "cleanup done"; rm -f "$LOCK"; rm -rf "$WORK"; }
trap cleanup EXIT
trap 'echo got SIGINT;  exit 130' INT
trap 'echo got SIGTERM; exit 143' TERM

while true; do
  date >> "$WORK/log"
  sleep 1 &
  wait $!
done`,
        cx: `<p>O(1) per signal. The key idea is ordering: signal trap → exit → EXIT trap → cleanup.</p>`,
        f: ['What if cleanup itself is interrupted by a second Ctrl+C?', 'How would you also stop a background child the script started?']
      })
    ]
  });
  // ───────────────────────── Topic 2: permissions ─────────────────────────
  topics.push({
    title: 'File Permissions: rwx, Octal, umask, setuid and the Sticky Bit',
    analogy: `<p>Think of a file as a <b>room in an office building</b>. Three groups of people may be at the door: the <b>owner</b> (whoever has the key cut for them), the <b>group</b> (their department) and <b>other</b> (everyone else). For each group the door sign has three switches: <b>r</b> (may look inside), <b>w</b> (may change things), <b>x</b> (may walk through / run it). Nine switches in total - nine bits. Setuid is a "borrowed key" rule: whoever runs this program temporarily gets the owner's key. The sticky bit is the rule on a shared notice board: anyone may pin a note, but you may only take down <i>your own</i>.</p>`,
    explain: `<p>🟢 <b>Reading <code>ls -l</code>.</b> The line <code>-rwxr-xr-- 1 alice dev 4096 Jan 3 run.sh</code> starts with 10 characters: the first is the type (<code>-</code> file, <code>d</code> directory, <code>l</code> symlink), then three triples <b>owner / group / other</b>.</p>
      ${H.table(['Triple', 'Letters', 'Binary', 'Octal', 'Meaning'], [
        ['owner (alice)', 'rwx', '111', '<b>7</b>', 'read + write + execute'],
        ['group (dev)', 'r-x', '101', '<b>5</b>', 'read + execute, no write'],
        ['other (world)', 'r--', '100', '<b>4</b>', 'read only']
      ])}
      <p>So <code>rwxr-xr--</code> = <b>754</b>. The trick: <b>r=4, w=2, x=1</b>, add them per group. 7=4+2+1, 6=4+2, 5=4+1, 4=read only, 0=nothing.</p>
      <p>🔵 <b>What r/w/x mean differs for directories</b> - a classic interview trap:</p>
      ${H.table(['Bit', 'On a file', 'On a directory'], [
        ['r', 'read contents', 'list names (<code>ls</code>)'],
        ['w', 'modify contents', 'create / delete / rename entries inside (needs x too)'],
        ['x', 'execute as a program', '<b>enter</b> it (<code>cd</code>) and reach files by name']
      ])}
      <p>A directory with <code>r--</code> but no <code>x</code> lets you list names but not open anything. A file's own permissions do <b>not</b> stop someone deleting it: deletion is controlled by <b>write on the parent directory</b>.</p>
      <p>🔵 <b>Changing permissions.</b> Two styles:</p>
      <ul>
        <li><b>Octal:</b> <code>chmod 755 deploy.sh</code> (set everything at once). <code>chmod 600 ~/.ssh/id_ed25519</code> (private key: only you; ssh refuses looser).</li>
        <li><b>Symbolic:</b> <code>chmod u+x file</code>, <code>chmod g-w file</code>, <code>chmod o= file</code>, <code>chmod a+r file</code>, <code>chmod -R u=rwX,go=rX dir</code> (capital <b>X</b> = execute only for directories and files already executable).</li>
        <li>Ownership: <code>chown alice:dev file</code>, <code>chgrp dev file</code>, <code>chown -R app: /srv/app</code>.</li>
      </ul>
      <p>🔵 <b>umask - the default filter.</b> New files start from 666 (files are never executable by default) and new directories from 777; the <b>umask</b> removes bits. Common <code>umask 022</code> → files <b>644</b>, dirs <b>755</b>. <code>umask 077</code> → files 600, dirs 700 (private). Formula: <code>mode = base AND NOT umask</code>.</p>
      <p>🔵 <b>The three special bits</b> (a fourth octal digit in front):</p>
      ${H.table(['Bit', 'Octal', 'Shown as', 'Effect'], [
        ['<b>setuid</b>', '4000', '<code>s</code> in owner x slot', 'program runs with the <b>file owner\'s</b> identity (e.g. <code>passwd</code> is root-owned so you can edit /etc/shadow)'],
        ['<b>setgid</b>', '2000', '<code>s</code> in group x slot', 'program runs with the file\'s group; on a <b>directory</b>, new files inherit the directory\'s group (great for team folders)'],
        ['<b>sticky</b>', '1000', '<code>t</code> in other x slot', 'on a directory: only the file\'s owner (or dir owner / root) may delete or rename inside. <code>/tmp</code> is <code>drwxrwxrwt</code>']
      ])}
      <p>If the underlying x bit is missing the letter is capital (<code>S</code>, <code>T</code>) - usually a mistake. <code>chmod 4755 prog</code>, <code>chmod u+s prog</code>, <code>chmod +t dir</code>, <code>chmod 1777 /shared</code>. Find dangerous binaries: <code>find / -perm -4000 -type f 2&gt;/dev/null</code>.</p>`,
    clues: [
      '"permission denied" on a script → missing <code>x</code> bit (<code>chmod +x</code>) or on a directory in the path',
      '"make the deploy script runnable by the owner and group but not the world" → <b>750</b>',
      '"SSH says UNPROTECTED PRIVATE KEY FILE" → <code>chmod 600</code> the key, <code>700</code> for <code>~/.ssh</code>',
      '"shared folder: everyone can add files but not delete others\'" → sticky bit <code>1777</code>',
      '"new files in a team directory should belong to the team group" → setgid on the directory <code>2775</code>',
      '"program must edit a root-owned file for a normal user" → setuid (and a security warning!)',
      '"what permission do new files get?" → 666 minus umask → usually 644'
    ],
    code: [
      { lang: 'python', run: true, title: 'chmod octal ↔ rwx converter (with setuid/setgid/sticky and umask)', code: R`# Convert between octal modes and ls-style strings, including special bits.
def octal_to_rwx(mode, kind="-"):
    """0o755 -> '-rwxr-xr-x'; handles setuid(4)/setgid(2)/sticky(1) in the 4th octal digit."""
    special = (mode >> 9) & 0b111          # the leading digit: 4=setuid 2=setgid 1=sticky
    out = []
    for shift in (6, 3, 0):                # owner, group, other
        bits = (mode >> shift) & 0b111
        r = "r" if bits & 4 else "-"
        w = "w" if bits & 2 else "-"
        x = "x" if bits & 1 else "-"
        out.append([r, w, x])
    if special & 4: out[0][2] = "s" if out[0][2] == "x" else "S"   # setuid shows in owner x slot
    if special & 2: out[1][2] = "s" if out[1][2] == "x" else "S"   # setgid shows in group x slot
    if special & 1: out[2][2] = "t" if out[2][2] == "x" else "T"   # sticky shows in other x slot
    return kind + "".join("".join(t) for t in out)

def rwx_to_octal(s):
    """'rwxr-xr--' (9 chars) or '-rwxr-xr--' (10 chars) -> '754' (4 digits if special bits set)."""
    s = s[-9:]
    if len(s) != 9:
        raise ValueError("need 9 permission characters")
    mode, special = 0, 0
    for i, ch in enumerate(s):
        shift = 6 - 3 * (i // 3)           # which triple
        pos = i % 3                        # r, w or x slot
        on = ch not in "-"                 # s S t T r w x all mean "something is set"
        if pos == 0 and ch == "r": mode |= 4 << shift
        if pos == 1 and ch == "w": mode |= 2 << shift
        if pos == 2:
            if ch in "xst": mode |= 1 << shift          # lowercase = x is also set
            if ch in "sS": special |= 4 if i < 3 else 2    # s/S in owner or group slot
            if ch in "tT": special |= 1
    return ("%d%03o" % (special, mode)) if special else ("%03o" % mode)

def apply_umask(umask, is_dir=False):
    base = 0o777 if is_dir else 0o666      # files never start executable
    return base & ~umask

for m in (0o755, 0o644, 0o600, 0o750, 0o4755, 0o2775, 0o1777):
    print("%5o  %s" % (m, octal_to_rwx(m)))
print("---- back to octal ----")
for s in ("rwxr-xr--", "rw-r--r--", "rwsr-xr-x", "rwxrwxrwt", "rwxrwsr-x"):
    print("%-10s -> %s" % (s, rwx_to_octal(s)))
print("---- umask ----")
for um in (0o022, 0o002, 0o077):
    print("umask %03o: new file %o, new dir %o" % (um, apply_umask(um), apply_umask(um, True)))
` },
      `# Deploy-script permissions, step by step
ls -l deploy.sh                 # -rw-r--r-- 1 alice dev ... deploy.sh   (not executable yet)
chmod 750 deploy.sh             # owner rwx, group r-x, others nothing
ls -l deploy.sh                 # -rwxr-x--- 1 alice dev ...
chmod u+x,g+x,o-rwx deploy.sh   # same result written symbolically
stat -c '%a %A %U:%G %n' deploy.sh   # 750 -rwxr-x--- alice:dev deploy.sh
./deploy.sh                     # works for alice and members of dev; "Permission denied" for others
# A shared upload dir: team group inherits, only owners delete their own files
sudo mkdir /srv/uploads && sudo chgrp dev /srv/uploads
sudo chmod 3775 /srv/uploads    # 3 = setgid(2) + sticky(1)
ls -ld /srv/uploads             # drwxrwsr-t ... dev ... /srv/uploads`
    ],
    codeTitle: ['Python: octal ↔ rwx converter (runnable)', 'Bash: chmod for a deploy script and a shared directory'],
    viz: [
      {
        title: 'Permission bits: octal → 9 bits → who can do what',
        input: '754',
        inputLabel: 'Octal mode, 3 digits (e.g. 755, 644, 600, 750, 777)',
        gen: function (input) {
          var s = String(input).trim();
          if (!/^[0-7]{3}$/.test(s)) throw new Error('Enter exactly 3 octal digits, e.g. 754');
          var d = [Number(s[0]), Number(s[1]), Number(s[2])];
          var v = d[0] * 64 + d[1] * 8 + d[2];
          function rwx(n) { return (n & 4 ? 'r' : '-') + (n & 2 ? 'w' : '-') + (n & 1 ? 'x' : '-'); }
          var names = ['owner', 'group', 'other'], hlsets = [{ 8: 'cur', 7: 'cur', 6: 'cur' }, { 5: 'cur', 4: 'cur', 3: 'cur' }, { 2: 'cur', 1: 'cur', 0: 'cur' }];
          var f = [];
          f.push({ narr: 'Mode <b>' + s + '</b> is three octal digits. Each digit is 3 bits: 9 bits in total, most significant first: owner, group, other.', parts: [{ type: 'bits', label: 'mode ' + s, value: v, width: 9, dec: s + ' (octal)' }] });
          for (var i = 0; i < 3; i++) {
            var rows = [];
            for (var j = 0; j <= i; j++) rows.push([names[j], d[j], d[j].toString(2).padStart(3, '0'), rwx(d[j])]);
            f.push({ narr: 'The <b>' + names[i] + '</b> digit is <b>' + d[i] + '</b> = binary ' + d[i].toString(2).padStart(3, '0') + '. Bits mean r=4, w=2, x=1, so ' + [d[i] & 4 ? 'read' : '', d[i] & 2 ? 'write' : '', d[i] & 1 ? 'execute' : ''].filter(Boolean).join(' + ') + (d[i] ? '' : 'nothing') + ' → <code>' + rwx(d[i]) + '</code>.', parts: [{ type: 'bits', label: 'mode ' + s, value: v, width: 9, hl: hlsets[i], dec: s }, { type: 'table', label: 'digits decoded so far', columns: ['who', 'digit', 'bits', 'letters'], rows: rows, hl: (function () { var h = {}; h[i] = 'cur'; return h; })() }] });
          }
          var full = rwx(d[0]) + rwx(d[1]) + rwx(d[2]);
          f.push({ narr: 'Put it together: <code>ls -l</code> shows <b>-' + full + '</b>. Now see what each kind of user may do to a regular file.', parts: [{ type: 'bits', label: 'mode ' + s, value: v, width: 9, dec: '-' + full }, { type: 'table', label: 'who can do what', columns: ['who', 'read', 'write', 'execute'], rows: [0, 1, 2].map(function (k) { return [names[k], d[k] & 4 ? 'yes' : 'no', d[k] & 2 ? 'yes' : 'no', d[k] & 1 ? 'yes' : 'no']; }), hl: { 0: 'ok' } }] });
          var notes = [];
          if (d[0] & 1 && !(d[1] & 1) && !(d[2] & 1)) notes.push('only the owner can run it');
          if (d[2] & 2) notes.push('<span class="c-r">world-writable: anyone can modify it - almost always a security bug</span>');
          if (d[2] === 0) notes.push('others have no access at all (private)');
          if (d[1] & 2) notes.push('group members can modify it');
          if (!(d[0] & 4)) notes.push('even the owner cannot read it');
          if (!notes.length) notes.push('a common, sensible setting');
          f.push({ narr: 'Reading the result in plain words: ' + notes.join('; ') + '. Command to set it: <code>chmod ' + s + ' FILE</code>.', parts: [{ type: 'text', html: '<b>chmod ' + s + '</b> = <code>-' + full + '</code><br>' + notes.join('<br>') }] });
          return f;
        }
      },
      {
        title: 'umask: base permissions minus the mask',
        input: '022',
        inputLabel: 'umask, 3 octal digits (e.g. 022, 002, 077)',
        gen: function (input) {
          var s = String(input).trim();
          if (!/^[0-7]{3}$/.test(s)) throw new Error('Enter 3 octal digits, e.g. 022');
          var um = parseInt(s, 8), ff = 0x1b6 & ~um, dd = 0x1ff & ~um; // 0o666 = 438 (0x1b6), 0o777 = 511 (0x1ff)
          var o = function (n) { return n.toString(8).padStart(3, '0'); };
          return [
            { narr: 'When a program creates a file it asks for <b>666</b> (rw-rw-rw-). For directories it asks for <b>777</b>. Files never start executable, so a downloaded script is safe until you chmod it.', parts: [{ type: 'bits', label: 'requested for a new FILE', value: 438, width: 9, dec: '666' }, { type: 'bits', label: 'requested for a new DIRECTORY', value: 511, width: 9, dec: '777' }] },
            { narr: 'Your shell has a <b>umask</b> of <b>' + s + '</b>. Every 1 bit in the umask is a permission that will be <b>removed</b>.', parts: [{ type: 'bits', label: 'umask ' + s, value: um, width: 9, dec: s, hl: (function () { var h = {}; for (var i = 0; i < 9; i++) if (um & (1 << i)) h[i] = 'bad'; return h; })() }] },
            { narr: 'Flip the mask (NOT umask), then AND it with the request. Bits that survive are the real permissions. File: 666 AND NOT ' + s + ' = <b>' + o(ff) + '</b>.', parts: [{ type: 'bits', label: 'NOT umask', value: ~um & 511, width: 9, dec: o(~um & 511) }, { type: 'bits', label: 'new FILE = 666 AND NOT umask', value: ff, width: 9, dec: o(ff), hl: { 8: 'ok', 7: 'ok', 6: 'ok', 5: 'ok', 4: 'ok', 3: 'ok', 2: 'ok', 1: 'ok', 0: 'ok' } }] },
            { narr: 'Directory: 777 AND NOT ' + s + ' = <b>' + o(dd) + '</b>. Directories keep their x bits because you need x to enter them.', parts: [{ type: 'bits', label: 'new DIRECTORY = 777 AND NOT umask', value: dd, width: 9, dec: o(dd) }] },
            { narr: 'Summary table for umask ' + s + '. Check yours with <code>umask</code>; set it in a script with <code>umask 077</code> to keep secrets private.', parts: [{ type: 'table', label: 'result', columns: ['kind', 'requested', 'umask', 'created as'], rows: [['file', '666', s, o(ff)], ['directory', '777', s, o(dd)]], hl: { 0: 'sel' } }] }
          ];
        }
      }
    ],
    examples: [
      { title: 'Decode a mode by hand', html: `<p><code>-rwxr-x---</code> → owner <code>rwx</code>=4+2+1=7, group <code>r-x</code>=4+0+1=5, other <code>---</code>=0 → <b>750</b>. The deploy team can run it, the world cannot even see inside.</p>${H.table(['rwx', 'r-x', '---'], [['7', '5', '0']])}`, code: `stat -c '%a' deploy.sh     # prints 750` },
      { title: 'Why can I delete a file I cannot even read?', html: `<p>Deleting means removing a <i>name</i> from a directory, so what matters is <b>write + execute on the directory</b>, not the file's own bits. That is exactly the problem the sticky bit solves for <code>/tmp</code>: with <code>t</code> set, write access on the directory is not enough - you must also own the file.</p>`, code: `ls -ld /tmp          # drwxrwxrwt  -> everyone can create, only owners can delete
touch /tmp/mine && chmod 000 /tmp/mine
rm /tmp/mine         # allowed: you own it and have w+x on /tmp (rm may ask to confirm)` },
      { title: 'setuid in the wild: passwd', html: `<p>Normal users must change their own password, but <code>/etc/shadow</code> is root-only. The trick: <code>/usr/bin/passwd</code> is owned by root with the setuid bit, so while it runs its <b>effective UID is 0</b>. The program itself decides what you may change. This is powerful, so every setuid program is a security target - keep the list short and never setuid a shell script (the kernel ignores it for scripts on purpose).</p>`, code: `ls -l /usr/bin/passwd      # -rwsr-xr-x 1 root root ...   (the s = setuid)
find / -xdev -perm -4000 -type f 2>/dev/null   # audit every setuid binary
id                        # uid=1000(alice) ...  vs  the effective uid inside passwd = 0` }
    ],
    deepDive: `<p>🟣 <b>Real vs effective IDs.</b> Each process has a real UID (who you are), an <b>effective UID</b> (whose permissions the kernel checks) and a saved UID. Setuid sets effective = file owner. <code>sudo</code> is just a setuid-root program that checks <code>/etc/sudoers</code>. Good setuid code <b>drops privileges</b> as soon as the privileged step is done (<code>seteuid(getuid())</code>).</p>
      <p><b>Linux capabilities</b> split root into ~40 small powers (<code>CAP_NET_BIND_SERVICE</code> to bind port 80, <code>CAP_SYS_TIME</code>...). Prefer <code>setcap cap_net_bind_service=+ep ./server</code> over setuid-root, and in containers drop all capabilities you do not need. <b>ACLs</b> (<code>setfacl -m u:bob:rw file</code>, <code>getfacl</code>) handle "alice and bob but not the group" which plain rwx cannot express. <b>Mount options</b> <code>noexec</code>, <code>nosuid</code>, <code>nodev</code> on /tmp and uploads folders block whole classes of attacks. <b>Attributes</b>: <code>chattr +i file</code> makes a file immutable even for root.</p>
      <p><b>Path traversal of permissions.</b> To open <code>/a/b/c.txt</code> you need <code>x</code> on <code>/</code>, <code>/a</code>, <code>/a/b</code> and <code>r</code> on the file. "Permission denied" on a file whose bits look fine is nearly always a missing <code>x</code> on a parent directory (<code>namei -l /a/b/c.txt</code> shows every component).</p>
      <p><b>Root bypass and SELinux/AppArmor.</b> Root ignores rwx checks (capability <code>CAP_DAC_OVERRIDE</code>), but mandatory access control (SELinux, AppArmor) can still deny. "Permission denied even as root" → check <code>getenforce</code>, <code>ausearch -m avc</code>, or whether the filesystem is mounted read-only/immutable.</p>
      <p><b>Octal gotchas.</b> In C, a leading 0 means octal: <code>chmod(path, 0755)</code> vs <code>755</code> (decimal, wrong!). In Python write <code>0o755</code>. In Docker/Kubernetes YAML <code>defaultMode: 0755</code> in YAML 1.1 is octal but <code>755</code> is decimal - a frequent misconfiguration. Recursive <code>chmod -R 777</code> is the classic "make the error go away" anti-pattern that also kills ssh's StrictModes and exposes secrets.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Ask an assistant "why is this script not running?" and it will usually answer <code>chmod +x</code> correctly. The risk is the <b>lazy fix</b>: models, pasted Stack Overflow answers and agent tools often suggest <code>chmod -R 777</code> or <code>sudo chmod</code> on the wrong path (including <code>/</code> or your home). An agent with shell access can break SSH logins (<code>~/.ssh</code> too open) or lock itself out of <code>/usr/bin/sudo</code> in a single command.</p>
      <p><b>Use AI as a partner:</b> have it explain an <code>ls -l</code> or <code>stat</code> output, convert between octal and symbolic, or audit a Dockerfile for files left world-writable. Ask for the <i>least</i> permission that works: "<i>give me the minimal chmod/chown for a web server user to read this folder and write only to uploads/</i>". <b>What you must own:</b> the principle of least privilege, knowing the directory-vs-file meaning, and reviewing every <code>chmod/chown -R</code> before an agent runs it. Treat secrets that AI tools can read (<code>.env</code>, keys) as 600 and keep them out of prompts.</p>`,
    problems: [
      P({
        t: 'chmod for a deploy script and release folder', l: 'Easy', tags: ['chmod', 'permissions', 'ops'], co: ['Atlassian', 'Cisco'],
        s: `<p>User <code>alice</code> (group <code>deploy</code>) owns <code>/srv/app/deploy.sh</code>. Requirements: alice and members of <code>deploy</code> can run it; alice alone can edit it; nobody else can read, write or run it. The folder <code>/srv/app/releases</code> must be writable by the group, new files in it must belong to group <code>deploy</code>, and members must not be able to delete each other's files. Give the exact commands.</p>`,
        ex: `<p>Script: <b>750</b> → <code>-rwxr-x---</code> (owner rwx, group r-x, other none).</p><p>Folder: <b>3770</b> → <code>drwxrws--T</code>: setgid keeps the group, sticky protects each user's files.</p>`,
        bw: `<p><code>chmod 777 -R /srv/app</code> "so nothing breaks". Everyone, including the web user and any compromised service, can edit the deploy script - a direct route to running arbitrary code as the deployer. The wasted effort is the incident later.</p>`,
        bc: `chmod -R 777 /srv/app      # works, but world-writable and world-executable`,
        q: ['Which digit group gives "owner rwx, group r-x, other nothing"?', ['750', '705', '570', '075'], 0, 'Owner 7 (rwx), group 5 (r-x), other 0. The order is always owner, group, other.'],
        h: ['<p>Hint 1: write the three triples as letters first: owner rwx, group r-x, other ---, then convert each to a digit.</p>', '<p>Hint 2: for the folder you need the group to have rwx (7), others nothing (0), plus special bits setgid (2) and sticky (1) in a leading digit.</p>', '<p>Hint 3: leading digit = 2 + 1 = 3, so 3770. Use <code>chgrp deploy</code> first so the setgid directory hands that group to new files.</p>'],
        a: `<p>Script: <code>chown alice:deploy /srv/app/deploy.sh &amp;&amp; chmod 750 /srv/app/deploy.sh</code>. Alice has rwx so she can edit and run; the group has r-x so members can run (and read) but not modify; others get nothing. Folder: <code>chgrp deploy /srv/app/releases &amp;&amp; chmod 3770 /srv/app/releases</code>. The 7 for group lets members create files; setgid (2) makes new files inherit group deploy; sticky (1) stops one member deleting another's files. Verify with <code>stat -c '%a %A %U:%G' ...</code> and by testing as a second user with <code>sudo -u bob</code>.</p>`,
        code: `sudo chown alice:deploy /srv/app/deploy.sh
sudo chmod 750 /srv/app/deploy.sh
sudo chgrp deploy /srv/app/releases
sudo chmod 3770 /srv/app/releases
stat -c '%a %A %U:%G %n' /srv/app/deploy.sh /srv/app/releases`,
        cx: `<p>O(1) commands. The skill is mapping words to bits: rwx = 4+2+1, special digit = setuid 4 + setgid 2 + sticky 1.</p>`,
        f: ['How would you grant just one extra user read access without changing the group? (setfacl)', 'Why is a setuid bit on a shell script ignored?']
      })
    ]
  });
  // ───────────────────────── Topic 3: file descriptors & redirection ─────────────────────────
  topics.push({
    title: 'File Descriptors 0/1/2, Redirection and Here-docs',
    analogy: `<p>Every process gets a small <b>desk with numbered phone lines</b>: line <b>0</b> is the one it listens on (stdin), line <b>1</b> is the loudspeaker for normal talk (stdout), line <b>2</b> is a second loudspeaker for complaints (stderr). Redirection does not change the program at all - the <i>shell rewires the phone lines before the program starts</i>. <code>&gt; out</code> means "plug line 1 into this file". <code>2&gt;&amp;1</code> means "plug line 2 into <i>wherever line 1 is plugged right now</i>" - a copy of the current cable, not a promise to follow it later. That "right now" is the whole secret of the famous ordering puzzle.</p>`,
    explain: `<p>🟢 <b>The basics.</b> In Unix, "everything is a file": files, terminals, pipes, sockets. When a process opens one, the kernel returns a small integer, a <b>file descriptor (fd)</b>. Three exist before your program's first line:</p>
      ${H.table(['fd', 'name', 'default', 'C++ / Python'], [['0', 'stdin', 'keyboard', '<code>std::cin</code> / <code>sys.stdin</code>'], ['1', 'stdout', 'screen', '<code>std::cout</code> / <code>print</code>'], ['2', 'stderr', 'screen', '<code>std::cerr</code> / <code>sys.stderr</code>']])}
      <p>Why two output lines? So you can <b>separate results from errors</b>: save the data to a file, still see problems on screen (or send them to a log).</p>
      <p>🔵 <b>Redirection operators</b> (the shell sets them up, left to right):</p>
      ${H.table(['Syntax', 'Meaning'], [
        ['<code>cmd &gt; f</code>', 'stdout → file f (create/<b>truncate</b>)'],
        ['<code>cmd &gt;&gt; f</code>', 'stdout → append to f'],
        ['<code>cmd &lt; f</code>', 'stdin ← read from f'],
        ['<code>cmd 2&gt; f</code>', 'stderr → file f'],
        ['<code>cmd &gt; f 2&gt;&amp;1</code>', 'both → f  (stdout first, <b>then</b> copy it to stderr)'],
        ['<code>cmd 2&gt;&amp;1 &gt; f</code>', '<span class="c-r">stderr → <i>old</i> stdout (screen); only stdout → f</span>'],
        ['<code>cmd &amp;&gt; f</code>', 'bash shortcut for "both → f"'],
        ['<code>cmd &gt; /dev/null 2&gt;&amp;1</code>', 'throw everything away (silence a cron job)'],
        ['<code>cmd 2&gt;&amp;1 | other</code>', 'both streams into the pipe (see next topic)'],
        ['<code>cmd &lt;&lt;EOF ... EOF</code>', '<b>here-doc</b>: lines until EOF become stdin'],
        ['<code>cmd &lt;&lt;&lt; "text"</code>', '<b>here-string</b>: one string becomes stdin']
      ])}
      <p>🔵 <b>Order matters: <code>cmd &gt; out 2&gt;&amp;1</code> vs <code>cmd 2&gt;&amp;1 &gt; out</code>.</b> The shell reads left to right and handles each redirect <i>as it sees it</i>:</p>
      <ul>
        <li><code>cmd &gt; out 2&gt;&amp;1</code> → step 1 fd1 = out. Step 2 "fd2 becomes a copy of fd1" → fd2 = out. <b>Both go to the file.</b></li>
        <li><code>cmd 2&gt;&amp;1 &gt; out</code> → step 1 "fd2 becomes a copy of fd1" while fd1 is still the screen → fd2 = screen. Step 2 fd1 = out. <b>Only stdout goes to the file; errors still hit the screen.</b></li>
      </ul>
      <p>Read <code>2&gt;&amp;1</code> as "point 2 where 1 points <i>now</i>". It is the single most asked shell question in interviews.</p>
      <p>🔵 <b>Here-docs</b> feed multi-line text to a command without a temp file. Quote the delimiter (<code>&lt;&lt;'EOF'</code>) to stop the shell expanding <code>$variables</code> inside; use <code>&lt;&lt;-EOF</code> to allow tab-indented text.</p>
      <p>🔵 <b>Other fd tricks.</b> Open your own descriptors with <code>exec 3&gt; log.txt</code> then <code>echo hi &gt;&amp;3</code> and close with <code>exec 3&gt;&amp;-</code>. Swap streams with <code>3&gt;&amp;1 1&gt;&amp;2 2&gt;&amp;3</code>. <code>tee</code> copies stdin to a file <i>and</i> stdout. <code>&gt;(cmd)</code> and <code>&lt;(cmd)</code> are process substitutions that look like filenames (<code>diff &lt;(sort a) &lt;(sort b)</code>).</p>`,
    clues: [
      '"redirect both stdout and stderr to a file" → <code>&gt; file 2&gt;&amp;1</code> (that order!) or <code>&amp;&gt; file</code>',
      '"why does 2&gt;&amp;1 &gt; file still print errors?" → copies happen left to right',
      '"silence a cron job" → <code>&gt; /dev/null 2&gt;&amp;1</code>',
      '"log shows output but not errors" / "errors appear but file empty" → check which fd is redirected',
      '"write multi-line config from a script" → here-doc; "contains $ signs" → quote the delimiter',
      '"too many open files" → fd leak; <code>ulimit -n</code>, <code>ls /proc/PID/fd</code>',
      '"deleted a log but the disk is still full" → a process still holds the fd open (<code>lsof +L1</code>)'
    ],
    code: [
      { lang: 'python', run: true, title: 'fd-table redirection simulator (shows the 2>&1 ordering effect)', code: R`import re

# Simulate how a shell rewires file descriptors for  cmd <redirections>.
# Every redirect is applied LEFT TO RIGHT; "n>&m" copies where m points RIGHT NOW.
def simulate(cmd):
    fd = {0: "keyboard", 1: "screen", 2: "screen"}
    log = [("start", dict(fd))]
    # an optional fd digit, an operator, then a target (file name or fd number)
    for m in re.finditer(r"(\d*)(>>|>&|>|<)\s*(\S+)", cmd):
        num, op, target = m.groups()
        text = m.group(0).replace(" ", "")
        if op == "<":
            fd[int(num or 0)] = target
        elif op == ">&":                         # duplicate: fd[n] becomes a copy of fd[target]
            fd[int(num or 1)] = fd[int(target)]
        else:                                    # > or >> to a file
            fd[int(num or 1)] = target + (" (append)" if op == ">>" else "")
        log.append((text, dict(fd)))
    return log

def show(cmd):
    print("$ " + cmd)
    for step, table in simulate(cmd):
        print("   after %-8s  0=%-8s 1=%-10s 2=%s" % (step, table[0], table[1], table[2]))
    final = simulate(cmd)[-1][1]
    print("   stdout 'hello' goes to: " + final[1])
    print("   stderr 'oops'  goes to: " + final[2])
    both = final[1] == final[2] and final[1] != "screen"
    print("   => both in the file? " + ("YES" if both else "NO") + "\n")

show("cmd > out 2>&1")      # fd1->out, then fd2 copies fd1 -> both in out
show("cmd 2>&1 > out")      # fd2 copies fd1 (screen) FIRST, then fd1->out -> errors still on screen
show("cmd >> log 2>&1")
show("cmd 2> err.log < in.txt")
` },
      `# --- redirection cheat sheet you can paste into a terminal ---
ls /etc /nonexistent                 # prints a listing AND an error (two streams, both on screen)
ls /etc /nonexistent > out.txt       # error still on screen; out.txt has the listing
ls /etc /nonexistent 2> err.txt      # listing on screen; err.txt has the error
ls /etc /nonexistent > all.txt 2>&1  # both streams in all.txt  (the correct order)
ls /etc /nonexistent 2>&1 > all2.txt # error STILL on screen; all2.txt has only the listing
ls /etc /nonexistent &> all3.txt     # bash shortcut for the correct order
cmd >> app.log 2>&1                  # append instead of overwrite (keep history)
cmd > /dev/null 2>&1                 # discard everything (cron)
cmd 2>&1 | tee run.log               # watch live AND save both streams
wc -l < /etc/passwd                  # stdin from file: prints a bare number (no filename)
set -o noclobber; echo hi > out.txt  # now > refuses to overwrite; use >| to force`,
      `# --- here-docs, here-strings and custom fds ---
cat > /tmp/app.conf <<EOF
name=$USER
home=$HOME
EOF
# Quoted delimiter: nothing is expanded, $USER stays literal (good for generating scripts)
cat > /tmp/run.sh <<'EOF'
#!/bin/sh
echo "user is $USER"
EOF
grep -c root <<< "root:x:0:0"        # here-string: one-line stdin
ssh host 'bash -s' <<'EOF'            # send a whole script over ssh
uptime
df -h /
EOF
exec 3> /tmp/audit.log               # open fd 3 for writing
echo "started" >&3                   # write via fd 3
exec 3>&-                            # close it
diff <(sort a.txt) <(sort b.txt)     # process substitution: no temp files`
    ],
    codeTitle: ['Python: fd-table simulator (runnable)', 'Bash: redirection cheat sheet', 'Bash: here-docs, here-strings, custom fds'],
    viz: {
      title: 'Watch the fd table change as the shell applies redirects',
      input: 'cmd 2>&1 > out',
      inputLabel: 'command with redirects (try: cmd > out 2>&1 | cmd 2>&1 > out | cmd 2> err.log | cmd >> log 2>&1 | cmd < in.txt > out)',
      gen: function (input) {
        var cmd = String(input).trim();
        if (!cmd) throw new Error('Type something like: cmd > out 2>&1');
        if (cmd.length > 80) throw new Error('Keep it under 80 characters');
        var fd = ['keyboard', 'screen', 'screen'], names = ['stdin', 'stdout', 'stderr'];
        var re = /(\d*)(>>|>&|>|<)\s*(\S+)/g, m, steps = [];
        function rows() { return [0, 1, 2].map(function (i) { return [i, names[i], fd[i]]; }); }
        var f = [{ narr: 'A new process starts with 3 descriptors, all attached to your terminal. The <b>shell</b> now reads your redirections <b>from left to right</b> and rewires the table <i>before</i> running the program.', parts: [{ type: 'table', label: 'fd table of  ' + cmd.split(/\s+/)[0], columns: ['fd', 'name', 'points to'], rows: rows(), hl: {} }] }];
        while ((m = re.exec(cmd))) {
          var num = m[1], op = m[2], target = m[3], n, text = m[0].replace(/\s+/g, ''), why;
          if (op === '<') { n = Number(num || 0); fd[n] = target; why = 'Open <code>' + H.esc(target) + '</code> for reading and make fd ' + n + ' point at it.'; }
          else if (op === '>&') {
            n = Number(num || 1); var src = Number(target);
            if (!(src >= 0 && src <= 2)) throw new Error('Only fd numbers 0, 1, 2 are supported after >&');
            fd[n] = fd[src];
            why = '<code>' + H.esc(text) + '</code> means "make fd ' + n + ' a <b>copy of fd ' + src + ' as it is right now</b>". fd ' + src + ' currently points to <b>' + H.esc(fd[src]) + '</b>, so fd ' + n + ' now points there too.';
          } else { n = Number(num || 1); fd[n] = target + (op === '>>' ? ' (append)' : ' (truncate)'); why = 'Open <code>' + H.esc(target) + '</code> (' + (op === '>>' ? 'append mode' : 'created or emptied') + ') and point fd ' + n + ' at it.'; }
          if (n > 2) throw new Error('Only fds 0, 1, 2 are supported in this demo');
          steps.push(n);
          f.push({ narr: 'Step ' + steps.length + ': <b>' + H.esc(text) + '</b>. ' + why, parts: [{ type: 'table', label: 'fd table after ' + text, columns: ['fd', 'name', 'points to'], rows: rows(), hl: (function () { var h = {}; h[n] = 'cur'; return h; })() }] });
        }
        if (!steps.length) throw new Error('No redirection found. Use > >> < 2> 2>&1 etc.');
        var outF = fd[1], errF = fd[2];
        var same = outF === errF && outF !== 'screen';
        f.push({ narr: 'Now the program runs and just does <code>write(1, ...)</code> and <code>write(2, ...)</code>. It has no idea about files - the table decides where bytes land.', parts: [{ type: 'table', label: 'final routing', columns: ['program writes to', 'bytes land in'], rows: [['stdout (fd 1) "hello"', outF], ['stderr (fd 2) "oops"', errF]], hl: { 0: 'ok', 1: errF === 'screen' ? 'bad' : 'ok' } }] });
        f.push({ narr: same ? '<span class="c-g">Both streams end in the same file.</span> This is the usual intent of <code>&gt; file 2&gt;&amp;1</code>.' : (errF === 'screen' && outF !== 'screen' ? '<span class="c-r">Gotcha: stderr still goes to the screen.</span> It copied fd 1 while fd 1 was still the screen. Put <code>2&gt;&amp;1</code> AFTER the <code>&gt; file</code>.' : 'Streams go to different places - fine if that is what you wanted (e.g. <code>2&gt; err.log</code> keeps errors separate).'), parts: [{ type: 'text', html: '<b>stdout → ' + H.esc(outF) + '</b><br><b>stderr → ' + H.esc(errF) + '</b>' }] });
        return f;
      }
    },
    examples: [
      { title: 'Separate results from errors', html: `<p>You scan a big tree for <code>*.conf</code>. Thousands of "Permission denied" lines bury the useful ones. Send errors to the void and keep results; or keep both in separate files.</p>`, code: `find / -name '*.conf' 2>/dev/null                      # only results on screen
find / -name '*.conf' > found.txt 2> denied.txt        # two files
find / -name '*.conf' 2>&1 | grep -v 'Permission denied'   # merge, then filter` },
      { title: 'Cron job: silent but safe', html: `<p>A cron line that emails you every night is annoying; one that hides failures is dangerous. Middle road: append everything to a log and keep the exit status visible.</p>`, code: `# crontab -e
0 2 * * * /opt/backup.sh >> /var/log/backup.log 2>&1 || echo "backup failed $(date)" >> /var/log/backup.err` },
      { title: 'Find the open fds of a running process', html: `<p>Each process's descriptor table is visible as symlinks under <code>/proc/PID/fd</code>. You can see exactly where a running program's fd 1 points.</p>`, code: `ls -l /proc/$$/fd                 # $$ = this shell's PID: 0,1,2 -> /dev/pts/N
ls -l /proc/$(pgrep -n nginx)/fd | head
lsof -p $(pgrep -n nginx) | head        # same data, friendlier columns
ulimit -n                               # per-process limit on open fds (often 1024)` }
    ],
    deepDive: `<p>🟣 <b>What an fd really is.</b> It is an index into the process's <b>file descriptor table</b>. Each entry points to a system-wide <b>open file description</b> (offset, flags, pointer to the inode). <code>dup2(old, new)</code> makes two entries share one description - that is exactly what <code>2&gt;&amp;1</code> compiles to in the shell: <code>dup2(1, 2)</code>. Because they share the description they share the file offset, so interleaved writes to the same file do not overwrite each other. Opening the same file twice (<code>&gt; out</code> and, separately, <code>2&gt; out</code>) creates two descriptions with <i>independent offsets</i> and the writes clobber each other - another reason to use <code>2&gt;&amp;1</code>.</p>
      <p><b>fork/exec inheritance.</b> The shell forks, the child runs the <code>dup2</code> calls, then <code>exec</code>s the program; descriptors survive exec unless marked close-on-exec (<code>O_CLOEXEC</code>/<code>FD_CLOEXEC</code>). Forgetting close-on-exec leaks secrets/sockets into child processes.</p>
      <p><b>Buffering surprises.</b> libc makes stdout <i>line-buffered on a terminal</i> but <i>fully buffered when redirected to a file or pipe</i>, while stderr is unbuffered. So <code>prog &gt; out 2&gt;&amp;1</code> may show errors before earlier normal output in the file. Fixes: <code>stdbuf -oL prog</code>, <code>python -u</code>, <code>fflush</code>, or flush explicitly. This is why "my log lines appear in the wrong order / only after the program exits".</p>
      <p><b>Limits and leaks.</b> The per-process limit is <code>RLIMIT_NOFILE</code> (<code>ulimit -n</code>; systemd <code>LimitNOFILE=</code>); system-wide <code>/proc/sys/fs/file-max</code>. "Too many open files" usually means a leak (unclosed sockets/files) - watch <code>ls /proc/PID/fd | wc -l</code> grow. <b>Deleted-but-open files:</b> <code>rm big.log</code> only removes the name; the inode and disk space stay until the last fd closes. Check with <code>lsof +L1</code>; free space without a restart by truncating through the fd: <code>: &gt; /proc/PID/fd/4</code>.</p>
      <p><b>Portability notes.</b> <code>&amp;&gt;</code> and <code>&lt;&lt;&lt;</code> are bash/zsh features - in POSIX <code>sh</code> (dash, Alpine ash) use <code>&gt; f 2&gt;&amp;1</code>. <code>|&amp;</code> in bash is shorthand for <code>2&gt;&amp;1 |</code>. Here-docs with tabs use <code>&lt;&lt;-</code>. <code>exec &gt; file</code> with no command redirects the shell itself for the rest of the script.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Log pipelines, "capture the output of this tool" and CI snippets are now often generated for you. Models are good at the common cases (<code>&gt; /dev/null 2&gt;&amp;1</code>) but sometimes write <code>2&gt;&amp;1 &gt; file</code> in new code, or assume <code>&amp;&gt;</code> works in <code>#!/bin/sh</code> scripts (in dash it silently means "run in background"). LLM-driven agents also read command output through exactly these streams: if a tool writes errors to stderr and your wrapper only captures stdout, the agent never sees the failure.</p>
      <p><b>Use AI as a partner:</b> "<i>explain what each file descriptor points to after this line, step by step</i>" is a great learning prompt; also paste a redirect chain and ask it to write the equivalent <code>dup2</code> C code. <b>What you must own:</b> predicting results with the left-to-right rule, deciding whether logs need both streams, and keeping secrets out of captured output - agent transcripts and CI logs capture stdout <i>and</i> stderr, so a <code>set -x</code> that echoes a token ends up in a log forever.</p>`,
    problems: [
      P({
        t: 'Why do cmd > out 2>&1 and cmd 2>&1 > out differ?', l: 'Medium', tags: ['redirection', 'file descriptors', 'bash'], co: ['Amazon', 'Google', 'Red Hat'],
        s: `<p><code>ls /etc /nonexistent</code> writes a listing to stdout and an error to stderr. Explain the final destination of each stream for (a) <code>ls /etc /nonexistent &gt; out 2&gt;&amp;1</code> and (b) <code>ls /etc /nonexistent 2&gt;&amp;1 &gt; out</code>. Draw the fd table after each redirect and say which one you would use in a script, and how to get a pipeline version.</p>`,
        ex: `<p>(a) after <code>&gt; out</code>: fd1=out, fd2=screen; after <code>2&gt;&amp;1</code>: fd2=out. Both in <b>out</b>.</p><p>(b) after <code>2&gt;&amp;1</code>: fd2=screen (copy of fd1 which is the screen); after <code>&gt; out</code>: fd1=out. Listing in <b>out</b>, error on <b>screen</b>.</p>`,
        bw: `<p>Memorising "always put 2&gt;&amp;1 last" without understanding. Then you fail on variants such as swapping streams or pipelines. The wasted work is guessing and testing by trial and error each time.</p>`,
        bc: `# guess-and-check
ls /etc /nonexistent 2>&1 > out ; cat out | head -2   # surprised the error is on screen`,
        q: ['In "cmd 2>&1 > out", what does 2>&1 copy?', ['The screen (where fd 1 pointed at that moment)', 'The file out', 'The keyboard', 'Nothing - it is a no-op'], 0, 'Redirects are evaluated left to right. When 2>&1 runs, fd 1 still points at the terminal, so fd 2 becomes the terminal; the later > out only changes fd 1.'],
        h: ['<p>Hint 1: draw a 3-row table fd 0, 1, 2 and write what each points to initially (keyboard, screen, screen).</p>', '<p>Hint 2: <code>n&gt;&amp;m</code> means "make fd n point to the same place fd m points to <b>right now</b>" - a copy of the pointer, like <code>dup2(m, n)</code>.</p>', '<p>Hint 3: apply redirects strictly left to right and update the table after each one. For pipelines, remember the pipe is connected <b>before</b> redirects run, so <code>cmd 2&gt;&amp;1 | grep x</code> sends stderr into the pipe (fd 1 is the pipe at that moment).</p>'],
        a: `<p>Process redirects left to right, updating the fd table each time. Start: 1=screen, 2=screen. (a) <code>&gt; out</code> sets 1=out; <code>2&gt;&amp;1</code> copies fd 1's target so 2=out; both streams land in the file. (b) <code>2&gt;&amp;1</code> copies fd 1's current target (screen) so 2=screen; then <code>&gt; out</code> sets 1=out; stderr is still on screen. Use (a) (or bash <code>&amp;&gt; out</code>) in scripts. For a pipeline, <code>cmd 2&gt;&amp;1 | grep x</code> works as intended because the pipe is already fd 1 when 2&gt;&amp;1 runs; to send only stderr into the pipe use <code>cmd 2&gt;&amp;1 &gt;/dev/null | grep x</code> - first point 2 at the pipe, then send stdout to /dev/null.</p>`,
        code: `ls /etc /nonexistent > out 2>&1     # (a) both in out
ls /etc /nonexistent 2>&1 > out     # (b) error on screen, listing in out
ls /etc /nonexistent 2>&1 >/dev/null | wc -l   # only stderr flows through the pipe`,
        cx: `<p>O(number of redirects). The mental model is "copy of the pointer at that moment", exactly <code>dup2</code>.</p>`,
        f: ['What would 3>&1 1>&2 2>&3 do?', 'Why can stderr text appear before stdout text in out when both are redirected?']
      })
    ]
  });
  // ───────────────────────── Topic 4: pipes & essential commands ─────────────────────────
  topics.push({
    title: 'Pipes and the Essential Toolbox: grep, sed, awk, find, xargs, sort, uniq, cut, tar, curl',
    analogy: `<p>A pipe is a <b>conveyor belt between workers in a factory</b>. One worker only filters (grep), the next only chops columns (cut), the next sorts, the next counts. Nobody waits for the whole pile: as soon as one item leaves worker 1 it can reach worker 2, so all stations work at the same time. The belt holds only a small buffer; if the next worker is slow, the belt fills and the earlier worker is paused automatically. The Unix idea: <i>many tiny tools that each do one job well, connected by belts</i>, beat one giant program.</p>`,
    explain: `<p>🟢 <b>The pipe.</b> <code>A | B</code> connects A's stdout (fd 1) to B's stdin (fd 0). The shell starts <b>both programs at once</b>; data streams through a kernel buffer (64 KiB on Linux). Nothing is written to disk. Exit status of the pipeline is the <i>last</i> command's unless you set <code>set -o pipefail</code>.</p>
      <p>🔵 <b>The 12 commands you must know cold</b> (each reads lines, writes lines):</p>
      ${H.table(['Command', 'Job', 'Everyday use'], [
        ['<b>grep</b>', 'keep lines that match', '<code>grep -E &#39;ERROR|WARN&#39; app.log</code>, <code>-v</code> invert, <code>-c</code> count, <code>-r</code> recurse, <code>-i</code> ignore case, <code>-o</code> only match, <code>-n</code> line numbers'],
        ['<b>cut</b>', 'take columns', '<code>cut -d&#39; &#39; -f1</code> first space-separated field; <code>-d, -f2,4</code> CSV columns'],
        ['<b>sort</b>', 'order lines', '<code>-n</code> numeric, <code>-r</code> reverse, <code>-k2</code> by field 2, <code>-t,</code> separator, <code>-u</code> unique, <code>-h</code> human sizes (2K 3M)'],
        ['<b>uniq</b>', 'collapse <i>adjacent</i> duplicates', '<code>uniq -c</code> count; <b>always sort first</b>'],
        ['<b>head / tail</b>', 'first / last N lines', '<code>head -5</code>, <code>tail -n 100</code>, <code>tail -f app.log</code> follow live, <code>tail -F</code> survives log rotation'],
        ['<b>wc</b>', 'count', '<code>wc -l</code> lines, <code>-w</code> words, <code>-c</code> bytes'],
        ['<b>sed</b>', 'stream editor', '<code>sed &#39;s/old/new/g&#39;</code>, <code>sed -n &#39;5,10p&#39;</code>, <code>sed &#39;/^#/d&#39;</code>, <code>sed -i.bak ...</code> edit in place'],
        ['<b>awk</b>', 'columns + logic', '<code>awk &#39;{print $1, $NF}&#39;</code>, <code>awk -F, &#39;$3&gt;100&#39;</code>, <code>awk &#39;{s+=$2} END{print s}&#39;</code>, <code>awk &#39;{c[$1]++} END{for(k in c)print k,c[k]}&#39;</code>'],
        ['<b>find</b>', 'search the file tree', '<code>find . -name &#39;*.log&#39; -mtime +7</code>, <code>-type f</code>, <code>-size +100M</code>, <code>-newer</code>, <code>-delete</code>, <code>-exec cmd {} +</code>'],
        ['<b>xargs</b>', 'turn lines into arguments', '<code>... | xargs rm</code>, <code>-0</code> with <code>find -print0</code>, <code>-P4</code> parallel, <code>-n1</code> one at a time'],
        ['<b>tar</b>', 'bundle / compress files', '<code>tar czf a.tgz dir/</code> create, <code>tar xzf a.tgz -C /dest</code> extract, <code>tar tf</code> list'],
        ['<b>curl</b>', 'talk HTTP', '<code>curl -fsSL URL</code>, <code>-o file</code>, <code>-X POST -H &#39;Content-Type: application/json&#39; -d &#39;{...}&#39;</code>, <code>-I</code> headers, <code>-w &#39;%{http_code}&#39;</code>']
      ])}
      <p>🔵 <b>Compose, don't memorise.</b> Build a pipeline one stage at a time and look at the output after each <code>|</code>. The canonical question "<b>top 10 IP addresses in an access log</b>":</p>
      <pre>awk '{print $1}' access.log | sort | uniq -c | sort -nr | head -10</pre>
      <p>Why <b>sort</b> before <b>uniq -c</b>? <code>uniq</code> only compares neighbouring lines, so equal IPs must be next to each other. Why a second <b>sort -nr</b>? The first sort orders by IP text; the second orders by the count column, numerically (<code>-n</code>), biggest first (<code>-r</code>).</p>
      <p>🔵 <b>Find + delete old files safely.</b> <code>find /var/log/app -type f -name '*.log' -mtime +7 -print</code> first (dry run!), then change <code>-print</code> to <code>-delete</code>. <code>-mtime +7</code> means "modified more than 7 <i>full days</i> ago". With spaces in filenames use <code>find ... -print0 | xargs -0 rm -f</code>.</p>
      <p>🔵 <b>Quoting.</b> Single quotes <code>'...'</code> keep everything literal (use for awk/sed programs and globs you want the tool, not the shell, to see: <code>find -name '*.log'</code>). Double quotes expand <code>$vars</code> but keep spaces together: always write <code>"$file"</code>.</p>`,
    clues: [
      '"top N most frequent X in a log" → <code>sort | uniq -c | sort -nr | head -N</code>',
      '"count lines / unique values" → <code>wc -l</code>, <code>sort -u | wc -l</code>',
      '"delete files older than N days" → <code>find -mtime +N -delete</code> (dry-run with <code>-print</code> first)',
      '"filenames with spaces" → <code>-print0 | xargs -0</code>',
      '"sum a column" / "group by" in shell → <code>awk &#39;{s[$1]+=$2} END{...}&#39;</code>',
      '"replace text in many files" → <code>grep -rl old . | xargs sed -i &#39;s/old/new/g&#39;</code>',
      '"follow a log live" → <code>tail -F</code>; "why does my pipe hang?" → a stage waits for EOF (e.g. <code>sort</code> needs all input)'
    ],
    code: [
      { lang: 'python', run: true, title: 'mini log pipeline: grep | cut | sort | uniq -c | sort -nr | head (in Python)', code: R`from itertools import groupby

# Sample nginx-style access log lines (IP - - [time] "METHOD path HTTP" status bytes)
LOG = [
    '203.0.113.7 - - [10/Oct/2026:13:55:01 +0000] "GET /index.html HTTP/1.1" 200 2326',
    '198.51.100.4 - - [10/Oct/2026:13:55:02 +0000] "GET /api/users HTTP/1.1" 500 120',
    '203.0.113.7 - - [10/Oct/2026:13:55:03 +0000] "GET /about HTTP/1.1" 200 1500',
    '192.0.2.99 - - [10/Oct/2026:13:55:04 +0000] "POST /login HTTP/1.1" 200 310',
    '198.51.100.4 - - [10/Oct/2026:13:55:05 +0000] "GET /api/users HTTP/1.1" 200 4020',
    '203.0.113.7 - - [10/Oct/2026:13:55:06 +0000] "GET /missing HTTP/1.1" 404 90',
    '198.51.100.4 - - [10/Oct/2026:13:55:07 +0000] "GET /index.html HTTP/1.1" 200 2326',
    '192.0.2.99 - - [10/Oct/2026:13:55:08 +0000] "GET /index.html HTTP/1.1" 200 2326',
    '203.0.113.7 - - [10/Oct/2026:13:55:09 +0000] "GET /index.html HTTP/1.1" 200 2326',
    '198.51.100.4 - - [10/Oct/2026:13:55:10 +0000] "GET /api/orders HTTP/1.1" 200 800',
]

# Each function = one Unix tool. A "pipe" is just feeding one list into the next.
def grep(lines, text):            # grep ' 200 '
    return [l for l in lines if text in l]

def cut(lines, delim, field):     # cut -d' ' -f1   (fields are 1-based like the real cut)
    return [l.split(delim)[field - 1] for l in lines]

def sort(lines):                  # sort
    return sorted(lines)

def uniq_c(lines):                # uniq -c : counts ADJACENT equal lines only (that is why we sort first)
    return [(len(list(g)), k) for k, g in groupby(lines)]

def sort_nr(pairs):               # sort -nr : by the number, biggest first
    return sorted(pairs, key=lambda p: p[0], reverse=True)

def head(items, n):               # head -n N
    return items[:n]

s1 = grep(LOG, ' 200 ')
s2 = cut(s1, ' ', 1)
s3 = sort(s2)
s4 = uniq_c(s3)
s5 = sort_nr(s4)
s6 = head(s5, 3)
print("lines in:", len(LOG), "| after grep ' 200 ':", len(s1))
print("after cut   :", s2)
print("after sort  :", s3)
print("after uniq-c:", s4)
print("after sort  :", s5)
print("TOP 3 IPs:")
for count, ip in s6:
    print("%6d %s" % (count, ip))

# Skip the sort and uniq -c gives WRONG answers - the classic beginner bug:
print("uniq -c WITHOUT sort:", uniq_c(s2))
# Real-world shortcut: one pass with a hash map (awk '{c[$1]++}') is O(n) instead of O(n log n)
counts = {}
for ip in s2:
    counts[ip] = counts.get(ip, 0) + 1
print("hash-map count:", sorted(counts.items(), key=lambda kv: -kv[1]))
` },
      `# --- Essential one-liners ---
grep -rn "FIXME" src/                       # find text recursively with line numbers
grep -E "ERROR|FATAL" app.log | wc -l      # how many bad lines?
grep -v '^#' conf | grep -v '^$'           # config without comments and blank lines
cut -d: -f1 /etc/passwd | sort | head      # all usernames, alphabetical
sed 's/foo/bar/g' in.txt > out.txt         # replace every foo (use -i to edit in place)
sed -n '10,20p' big.log                    # print only lines 10 to 20
awk '{print $1, $NF}' file                 # first and last column
awk -F, 'NR>1 {sum+=$3} END {print sum}' sales.csv     # sum column 3, skip header
awk '{c[$1]++} END {for (k in c) print c[k], k}' f | sort -nr | head   # group-by count, O(n)
sort -t, -k2,2nr data.csv | head -3        # sort CSV by column 2, numeric, descending
wc -l *.log | sort -n | tail -3            # biggest files by line count`,
      `# --- Top 10 client IPs in an access log (the classic) ---
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10
# Same with cut when the log is space-separated
cut -d' ' -f1 access.log | sort | uniq -c | sort -nr | head -10
# Only successful requests, top 5 URLs
awk '$9 == 200 {print $7}' access.log | sort | uniq -c | sort -nr | head -5
# Requests per minute (timestamp field 4 looks like [10/Oct/2026:13:55:01)
awk '{print substr($4, 2, 17)}' access.log | sort | uniq -c | tail
# Count status codes
awk '{print $9}' access.log | sort | uniq -c | sort -nr
# Fastest awk-only version, no sort of the whole file needed
awk '{c[$1]++} END {for (ip in c) print c[ip], ip}' access.log | sort -nr | head -10`,
      R`# --- find / xargs / tar / curl ---
find /var/log/app -type f -name '*.log' -mtime +7 -print          # 1) dry run: what WOULD go?
find /var/log/app -type f -name '*.log' -mtime +7 -delete         # 2) then delete
find . -name '*.tmp' -print0 | xargs -0 rm -f                     # spaces/newlines in names are safe
find . -type f -size +100M -exec ls -lh {} +                      # batch many files per ls
find src -name '*.js' -print0 | xargs -0 -P4 -n10 eslint          # run 4 jobs in parallel
tar czf backup-$(date +%F).tgz /etc /srv/app                       # create gzip archive
tar tzf backup-2026-10-15.tgz | head                               # list without extracting
tar xzf backup-2026-10-15.tgz -C /restore                          # extract into /restore
curl -fsSL https://example.com/data.json -o data.json              # fail on HTTP error, silent, follow redirects
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' https://example.com   # status + latency
curl -X POST https://api.example.com/v1/items -H 'Content-Type: application/json' -d '{"name":"x"}'
curl --retry 3 --max-time 10 https://example.com/health            # production-safe options`
    ],
    codeTitle: ['Python: mini log pipeline (runnable)', 'Bash: everyday one-liners', 'Bash: top IPs and other log questions', 'Bash: find, xargs, tar, curl'],
    viz: {
      title: 'Data flowing through grep | cut | sort | uniq -c | sort -nr | head',
      input: '200 3',
      inputLabel: 'status to keep, and how many to show (e.g. "200 3", "500 2", "404 1")',
      gen: function (input) {
        var w = words(input);
        var code = w[0] || '200', topN = Number(w[1] || 3);
        if (!/^\d{3}$/.test(code) || !(topN >= 1 && topN <= 6)) throw new Error('Use: STATUS N  e.g. 200 3 (N between 1 and 6)');
        var raw = ['10.0.0.5 200', '10.0.0.9 500', '10.0.0.5 200', '10.0.0.7 200', '10.0.0.9 200', '10.0.0.5 404', '10.0.0.7 500', '10.0.0.5 200', '10.0.0.7 200', '10.0.0.9 500'];
        var names = ['grep', 'cut', 'sort', 'uniq -c', 'sort -nr', 'head'];
        var nodes = names.map(function (n, i) { return { id: 's' + i, label: n, x: 9 + i * 16.4, y: 12, shape: 'box', w: 13 }; });
        var edges = []; for (var i = 0; i < 5; i++) edges.push(['s' + i, 's' + (i + 1)]);
        function g(idx) { var hl = {}, eh = {}; if (idx >= 0) hl['s' + idx] = 'cur'; if (idx > 0) eh['s' + (idx - 1) + '-s' + idx] = 'ok'; return { type: 'graph', label: 'pipeline (all stages run at the same time; data flows left to right)', directed: true, height: 24, nodes: nodes, edges: edges, hl: hl, ehl: eh }; }
        function q(label, items, hl) { return { type: 'queue', label: label, items: items, hl: hl || {}, frontLabel: 'first line', backLabel: 'last line' }; }
        var f = [], a1 = raw.filter(function (l) { return l.split(' ')[1] === code; });
        f.push({ narr: 'The input: 10 log lines "IP STATUS". Goal: <b>which IPs made the most requests with status ' + code + '?</b> Each stage is a tiny program; the pipe passes text between them.', parts: [g(-1), q('stdin (raw log)', raw)] });
        f.push({ narr: '<b>grep \' ' + code + '\'</b> keeps only lines containing the status. ' + a1.length + ' of 10 lines survive; the rest are dropped here and never travel further.', parts: [g(0), q('after grep', a1, a1.reduce(function (h, _, k) { h[k] = 'ok'; return h; }, {}))] });
        if (!a1.length) { f.push({ narr: 'Nothing matched this status, so every later stage receives an empty stream and prints nothing.', parts: [g(5), q('final output', [])] }); f.push({ narr: 'Try another status such as 200.', parts: [g(-1), q('empty', [])] }); return f; }
        var a2 = a1.map(function (l) { return l.split(' ')[0]; });
        f.push({ narr: '<b>cut -d\' \' -f1</b> keeps only column 1 (the IP). We threw away the status; we no longer need it.', parts: [g(1), q('after cut', a2, a2.reduce(function (h, _, k) { h[k] = 'win'; return h; }, {}))] });
        var a3 = a2.slice().sort();
        f.push({ narr: '<b>sort</b> puts equal IPs next to each other. <code>sort</code> must see <i>all</i> input before it prints the first line, so this stage waits for upstream to finish.', parts: [g(2), q('after sort (equal IPs adjacent)', a3, a3.reduce(function (h, v, k) { h[k] = 'sel'; return h; }, {}))] });
        var a4 = [], k;
        for (k = 0; k < a3.length;) { var j = k; while (j < a3.length && a3[j] === a3[k]) j++; a4.push([j - k, a3[k]]); k = j; }
        f.push({ narr: '<b>uniq -c</b> collapses each run of equal neighbours into one line prefixed with its count. (Without the sort, equal IPs that are far apart would be counted separately.)', parts: [g(3), q('after uniq -c', a4.map(function (p) { return p[0] + ' ' + p[1]; }), {}) , { type: 'table', label: 'same data as a table', columns: ['count', 'ip'], rows: a4.map(function (p) { return [p[0], p[1]]; }) }] });
        var a5 = a4.slice().sort(function (x, y) { return y[0] - x[0] || (x[1] < y[1] ? -1 : 1); });
        f.push({ narr: '<b>sort -nr</b> sorts by the number at the start of the line (<b>n</b>umeric, <b>r</b>everse = biggest first).', parts: [g(4), { type: 'table', label: 'after sort -nr', columns: ['count', 'ip'], rows: a5.map(function (p) { return [p[0], p[1]]; }), hl: { 0: 'sel' } }] });
        var a6 = a5.slice(0, topN);
        f.push({ narr: '<b>head -' + topN + '</b> prints the first ' + topN + ' line(s) and exits. When <code>head</code> exits, upstream gets SIGPIPE on its next write and stops early - that is how pipelines avoid useless work.', parts: [g(5), { type: 'table', label: 'FINAL OUTPUT', columns: ['count', 'ip'], rows: a6.map(function (p) { return [p[0], p[1]]; }), hl: a6.reduce(function (h, _, i) { h[i] = 'ok'; return h; }, {}) }] });
        f.push({ narr: 'Whole command: <code>grep \' ' + code + '\' log | cut -d\' \' -f1 | sort | uniq -c | sort -nr | head -' + topN + '</code>. Memory use stays small because each stage streams its lines.', parts: [g(-1), { type: 'text', html: '<b>Pattern to remember:</b> filter → extract → sort → count → sort by count → take top N.' }] });
        return f;
      }
    },
    examples: [
      { title: 'Top 10 IPs from an access log', html: `<p>The most asked log question. Build it left to right and check each stage: <code>awk '{print $1}' log | head</code> (are those IPs?), then add <code>| sort | uniq -c | head</code> (counts sensible?), then the final <code>sort -nr | head -10</code>. Interviewers often add "<i>now only for status 500</i>" (insert <code>awk '$9==500'</code> first) or "<i>do it without sorting the whole file</i>" (awk hash map).</p>`, code: `awk '{print $1}' access.log | sort | uniq -c | sort -nr | head -10
#   1832 203.0.113.7
#    977 198.51.100.4
#    551 192.0.2.99` },
      { title: 'Delete files older than 7 days (safely)', html: `<p>Two habits that save careers: <b>(1)</b> run with <code>-print</code> before <code>-delete</code>; <b>(2)</b> restrict with <code>-type f</code> and a precise <code>-name</code>/directory so a typo cannot hit <code>/</code>. <code>-mtime +7</code> = older than 7 full 24h periods; <code>-mmin +60</code> for minutes. Put it in cron and log the result.</p>`, code: `find /var/backups -type f -name '*.tgz' -mtime +7 -print     # review the list
find /var/backups -type f -name '*.tgz' -mtime +7 -delete    # then remove
# Spaces in names, or want to run another command instead of delete:
find /data/tmp -type f -mtime +7 -print0 | xargs -0 -r rm -f   # -r: do nothing if no input` },
      { title: 'Bulk replace across a code base', html: `<p>Combine <code>grep -l</code> (list files) with <code>xargs sed -i</code>. On macOS BSD sed needs <code>sed -i ''</code>. Always commit first so <code>git diff</code> shows what changed, and prefer <code>-w</code>/word boundaries so <code>user</code> doesn't hit <code>username</code>.</p>`, code: `grep -rlw 'oldName' src/ | xargs sed -i 's/\\boldName\\b/newName/g'
git diff --stat      # check the damage before you commit` },
      { title: 'Pipes can fail silently - pipefail', html: `<p>In <code>curl -f $URL | tar xz</code>, if curl fails, the pipeline's exit status is tar's. With <code>set -o pipefail</code> the pipeline fails if <i>any</i> stage fails, and <code>PIPESTATUS</code> shows each exit code.</p>`, code: `set -euo pipefail           # strict mode for scripts
false | true; echo "plain: $?"                    # 0 (hides the failure)
set -o pipefail; false | true; echo "pipefail: $?"   # 1
cmd1 | cmd2 | cmd3; echo "\${PIPESTATUS[@]}"       # e.g. 0 1 0 : which stage failed?` }
    ],
    deepDive: `<p>🟣 <b>How a pipe works.</b> <code>pipe(fds)</code> returns two descriptors: write end, read end. The shell forks one process per stage, wires <code>dup2(write_end, 1)</code> in the left child and <code>dup2(read_end, 0)</code> in the right, then execs. The kernel buffer is 64 KiB by default (<code>fcntl F_SETPIPE_SZ</code> can grow it up to <code>/proc/sys/fs/pipe-max-size</code>). A <code>write</code> to a full pipe <b>blocks</b> - that is the backpressure that keeps memory bounded. A <code>read</code> on an empty pipe blocks until data or until <b>all write ends close</b> (EOF). If the reader exits first, the writer gets <b>SIGPIPE</b> (default: die quietly) - why <code>yes | head -1</code> ends. Forgetting to close unused pipe ends in a C program is the classic "my reader never sees EOF" hang.</p>
      <p><b>Streaming vs buffering stages.</b> <code>grep</code>, <code>cut</code>, <code>sed</code>, <code>awk</code> stream line by line (O(1) memory). <code>sort</code> must read everything (it spills to temporary files for huge inputs; <code>-S 2G</code>, <code>-T /big/tmp</code>, <code>--parallel</code>). That is why <code>tail -f x | sort</code> prints nothing. When the input of a stage is a pipe, libc switches stdout to <b>block buffering</b>, so <code>tail -f log | grep x | cut ...</code> can look frozen: use <code>grep --line-buffered</code>.</p>
      <p><b>Performance.</b> <code>sort | uniq -c</code> is O(n log n) and disk-friendly; awk's associative array is O(n) but holds all distinct keys in RAM - great until a billion unique keys. Setting <code>LC_ALL=C</code> makes sort and grep several times faster (byte compare, no locale tables) - but ordering differs from your locale. For multi-GB logs use <code>zcat</code>/<code>xz -dc</code> into the pipe, <code>xargs -P</code>/GNU <code>parallel</code> for CPU-bound work, or move to a real tool (ClickHouse, DuckDB: <code>SELECT ip, count(*) FROM 'log.csv' GROUP BY 1 ORDER BY 2 DESC LIMIT 10</code>).</p>
      <p><b>Gotchas.</b> (1) <code>cmd | while read x; do ...; done</code> runs the loop in a <b>subshell</b>, so variables set inside vanish; use <code>while read ...; done &lt; &lt;(cmd)</code>. (2) Filenames may contain spaces, quotes, newlines: use <code>-print0 | xargs -0</code>, or <code>find -exec ... {} +</code>. (3) <code>xargs</code> with no input still runs once on BSD; GNU needs <code>-r</code>. (4) <code>echo $var</code> splits and globs - quote <code>"$var"</code>. (5) <code>find -delete</code> processes depth-first and implies <code>-depth</code>; place <code>-delete</code> <i>last</i> after all tests or it deletes everything it visits. (6) <code>grep</code> exit code 1 means "no match", not error - dangerous under <code>set -e</code> (<code>grep ... || true</code>). (7) <code>tar</code> extracting untrusted archives can write outside the target (<code>../</code>, absolute paths): use <code>--no-absolute-names</code> or check with <code>tar tf</code>.</p>
      <p><b>curl in scripts.</b> <code>-f</code> makes HTTP 4xx/5xx a failing exit code (without it curl "succeeds" on a 500 page); <code>-sS</code> hides the progress bar but still shows errors; <code>-L</code> follows redirects; <code>--retry 3 --retry-connrefused</code>; <code>-m</code> overall timeout; <code>--fail-with-body</code> (7.76+) keeps the error body. Never pipe <code>curl | sudo bash</code> without reading the script first.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Describing a log question in English and getting a working one-liner is now routine, and models are good at <code>awk</code>/<code>sed</code> syntax you would otherwise google. Typical mistakes to catch: forgetting <code>sort</code> before <code>uniq -c</code>, using GNU-only flags on macOS (<code>sed -i</code> without <code>''</code>), unquoted variables, <code>-delete</code> placed before the filters, and <code>rm -rf $DIR/</code> where <code>$DIR</code> can be empty (becomes <code>rm -rf /</code>).</p>
      <p><b>Use AI as a partner:</b> ask "<i>explain this pipeline stage by stage and show sample output after each |</i>", "<i>make it safe for filenames with spaces</i>", and "<i>give me a dry-run version first</i>". Always test on a copy of the data. For big data, ask whether DuckDB/jq/ripgrep is a better fit than a 6-stage pipeline. <b>What you must own:</b> understanding each stage's input and output so you can debug it, knowing which stages stream and which buffer, and a dry-run discipline before any destructive command. Treat pasted <code>curl ... | bash</code> install lines (from AI or the web) as untrusted code: download, read, then run.</p>`,
    problems: [
      P({
        t: 'Top 10 client IPs from an access log', l: 'Easy', tags: ['pipes', 'awk', 'sort', 'uniq', 'logs'], co: ['Amazon', 'Cloudflare', 'Akamai'],
        s: `<p>You have an nginx access log (<code>/var/log/nginx/access.log</code>, space separated, client IP is field 1, HTTP status is field 9). Print the ten most frequent client IPs with their request counts, highest first. Then print the ten most frequent IPs among <b>500</b> responses only.</p>`,
        ex: `<p>Input lines: <code>203.0.113.7 ... 200</code> x3, <code>198.51.100.4 ... 500</code> x2, <code>192.0.2.99</code> x1.</p><p>Output:</p><pre>      3 203.0.113.7
      2 198.51.100.4
      1 192.0.2.99</pre><p>Count first, then sort by count: that is the shape <b>count → sort -nr → head</b>.</p>`,
        bw: `<p>Open the file in an editor and count by eye, or loop in bash: <code>for ip in $(cut -d' ' -f1 log | sort -u); do grep -c "^$ip" log; done</code> - this rescans the whole file once per unique IP: O(unique x n). On a 5 GB log with 50k IPs that is hours.</p>`,
        bc: `for ip in $(cut -d' ' -f1 access.log | sort -u); do
  echo "$(grep -c "^$ip " access.log) $ip"
done | sort -nr | head -10`,
        q: ['Why must sort run before uniq -c?', ['uniq only merges adjacent equal lines', 'uniq needs numeric input', 'sort removes duplicates itself', 'uniq -c is a no-op without it'], 0, 'uniq compares each line only with the previous one. Sorting groups equal IPs together so each IP forms one run and gets one total.'],
        h: ['<p>Hint 1: you need a frequency table: extract the IP column, group equal IPs, count each group.</p>', '<p>Hint 2: <code>awk \'{print $1}\'</code> (or <code>cut -d\' \' -f1</code>) → <code>sort</code> → <code>uniq -c</code> gives "count ip". Then order by the count column.</p>', '<p>Hint 3: finish with <code>sort -nr | head -10</code>. For the 500s add a filter first: <code>awk \'$9==500 {print $1}\'</code>. Check each stage with <code>| head</code> while building.</p>'],
        a: `<p>Stream the file once: extract field 1, sort so equal IPs are adjacent, <code>uniq -c</code> to count each run, <code>sort -nr</code> to order by the count numerically and descending, <code>head -10</code> to cut off the list. For 500 responses only, filter inside awk with the status column: <code>awk '$9==500 {print $1}'</code>. It uses O(n log n) time and bounded memory because sort spills to disk. An awk associative array is a one-pass O(n) alternative when the number of distinct IPs fits in RAM.</p>`,
        code: `# all requests
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10
# only 500 responses
awk '$9 == 500 {print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10
# one-pass hash-map version
awk '{c[$1]++} END {for (ip in c) print c[ip], ip}' /var/log/nginx/access.log | sort -nr | head -10`,
        cx: `<p>Time O(n log n) for the sort-based version, O(n + k log k) for awk with k distinct IPs. Space: sort spills to disk; awk keeps k keys in RAM.</p>`,
        f: ['How would you make it work on rotated, gzipped logs? (zcat access.log*.gz | ...)', 'How would you show the top IP per hour?']
      }),
      P({
        t: 'Find and delete files older than 7 days', l: 'Easy', tags: ['find', 'xargs', 'cleanup', 'cron'], co: ['Microsoft', 'VMware'],
        s: `<p>The directory <code>/var/tmp/uploads</code> fills the disk with temporary files, some with spaces in their names. Write the command that deletes <b>regular files</b> older than 7 days, but first shows what it would delete. Then show how to also remove directories that became empty.</p>`,
        ex: `<p>Files: <code>a.tmp</code> (9 days old), <code>my report.pdf</code> (10 days), <code>b.tmp</code> (1 day).</p><p>Dry run lists <code>a.tmp</code> and <code>my report.pdf</code>. After the real run only <code>b.tmp</code> is left. The name with a space is handled correctly.</p>`,
        bw: `<p><code>rm $(find ... -mtime +7)</code> breaks on spaces (the name is split in two words and could delete the wrong thing), fails with "argument list too long" for thousands of files, and runs even when find found nothing.</p>`,
        bc: `rm $(find /var/tmp/uploads -mtime +7)    # splits "my report.pdf" into two arguments`,
        q: ['What does -mtime +7 mean?', ['Modified more than 7 full days ago', 'Modified exactly 7 days ago', 'Modified within the last 7 days', 'Created more than 7 days ago'], 0, '+7 means strictly more than 7 full 24-hour periods (so 8 days or older once rounded down). -7 means less than 7 days; 7 alone means exactly 7.'],
        h: ['<p>Hint 1: <code>find DIR -type f -mtime +7</code> lists the candidates. Always run it with <code>-print</code> first.</p>', '<p>Hint 2: two safe ways to delete: <code>-delete</code> (built in, put it last) or <code>-print0 | xargs -0 rm</code>.</p>', '<p>Hint 3: for empty directories run a second pass: <code>find DIR -mindepth 1 -type d -empty -delete</code> (files first, directories second).</p>'],
        a: `<p>Restrict the search with <code>-type f</code> and the exact directory. Run <code>find /var/tmp/uploads -type f -mtime +7 -print</code> to review. When happy, replace <code>-print</code> with <code>-delete</code>; because find itself unlinks files, spaces, newlines and huge file counts are not a problem. Afterwards remove empty directories with <code>find /var/tmp/uploads -mindepth 1 -type d -empty -delete</code>. Put it in cron or a systemd timer, redirect output to a log, and never build the path from an unset variable.</p>`,
        code: `find /var/tmp/uploads -type f -mtime +7 -print            # dry run
find /var/tmp/uploads -type f -mtime +7 -delete           # real run
find /var/tmp/uploads -mindepth 1 -type d -empty -delete  # prune empty dirs
# alternative with xargs (also fine for spaces)
find /var/tmp/uploads -type f -mtime +7 -print0 | xargs -0 -r rm -f`,
        cx: `<p>O(files visited). One tree walk; -delete avoids spawning rm per file.</p>`,
        f: ['How do you delete by size instead (>100 MB)?', 'How do you do the same safely with systemd-tmpfiles?']
      })
    ]
  });
  // ───────────────────────── Topic 5: /proc ─────────────────────────
  topics.push({
    title: 'The /proc Filesystem: Reading the Kernel Like Files',
    analogy: `<p>/proc is the <b>dashboard of a car, disguised as a folder</b>. There is no real data on disk: every time you open a "file" the kernel instantly fills in the current numbers - speed, fuel, engine temperature. Each running process gets its own sub-folder named after its PID (its licence plate), and the folder shows what that process is doing right now: its open files, its memory, its command line. Tools like <code>ps</code>, <code>top</code>, <code>free</code> and <code>lsof</code> are mostly just friendly readers of these files.</p>`,
    explain: `<p>🟢 <b>What it is.</b> <code>/proc</code> is a <b>virtual filesystem</b> (type <code>proc</code>). Files report size 0 and cost no disk space; reading them runs kernel code that prints live state. You inspect the system with plain <code>cat</code> and <code>ls</code> - no special API.</p>
      <p>🔵 <b>Per-process directory <code>/proc/&lt;pid&gt;/</code></b> (and <code>/proc/self</code> = "me"):</p>
      ${H.table(['Path', 'What you learn', 'Try'], [
        ['<code>cmdline</code>', 'exact command + arguments (NUL separated)', '<code>tr &#39;\\0&#39; &#39; &#39; &lt; /proc/$$/cmdline</code>'],
        ['<code>status</code>', 'state (R/S/D/Z/T), PPID, UID, <b>VmRSS</b> (RAM actually used), <b>Threads</b>, context switches', '<code>grep -E &#39;State|VmRSS|Threads&#39; /proc/PID/status</code>'],
        ['<code>fd/</code>', 'one symlink per open file/socket/pipe', '<code>ls -l /proc/PID/fd</code>'],
        ['<code>cwd</code>, <code>exe</code>, <code>root</code>', 'symlinks to working dir, binary, root dir', '<code>readlink /proc/PID/exe</code>'],
        ['<code>environ</code>', 'its environment variables (secrets!)', '<code>tr &#39;\\0&#39; &#39;\\n&#39; &lt; /proc/PID/environ</code>'],
        ['<code>maps</code> / <code>smaps</code>', 'memory map: heap, stack, shared libs', '<code>head /proc/PID/maps</code>'],
        ['<code>limits</code>', 'ulimits that apply to this process', '<code>cat /proc/PID/limits</code>'],
        ['<code>io</code>', 'bytes read/written, syscalls count', '<code>cat /proc/PID/io</code>'],
        ['<code>stat</code>, <code>wchan</code>', 'raw numbers for ps/top; kernel function it sleeps in', '<code>cat /proc/PID/wchan</code>'],
        ['<code>cgroup</code>, <code>ns/</code>', 'container membership and namespaces', '<code>cat /proc/PID/cgroup</code>']
      ])}
      <p>🔵 <b>System-wide files</b> directly under /proc:</p>
      ${H.table(['File', 'Meaning'], [
        ['<code>meminfo</code>', 'RAM details; use <b>MemAvailable</b> (what new programs can really get), not MemFree'],
        ['<code>cpuinfo</code>', 'one block per logical CPU'],
        ['<code>loadavg</code>', '1/5/15 minute load averages + running/total tasks + last PID'],
        ['<code>uptime</code>, <code>version</code>', 'seconds since boot; kernel version string'],
        ['<code>stat</code>, <code>vmstat</code>, <code>diskstats</code>', 'raw counters (CPU ticks, page faults, disk I/O) that vmstat/iostat compute from'],
        ['<code>mounts</code>, <code>net/tcp</code>', 'mounted filesystems; TCP sockets in hex (what <code>ss</code> prints nicely)'],
        ['<code>sys/</code>', '<b>tunable kernel parameters</b> you can write: <code>sysctl vm.swappiness</code> ≡ <code>/proc/sys/vm/swappiness</code>']
      ])}
      <p>🔵 <b>Tuning with sysctl.</b> Read: <code>sysctl net.core.somaxconn</code>. Change until reboot: <code>sudo sysctl -w net.core.somaxconn=4096</code> (or <code>echo 4096 | sudo tee /proc/sys/net/core/somaxconn</code>). Make permanent: put <code>net.core.somaxconn = 4096</code> in <code>/etc/sysctl.d/90-app.conf</code> and run <code>sudo sysctl --system</code>.</p>
      <p>🔵 <b>Process states</b> you see in <code>ps</code>/<code>status</code>: <b>R</b> running or runnable, <b>S</b> sleeping (waiting for an event, interruptible), <b>D</b> uninterruptible sleep (usually disk/NFS I/O; cannot be killed), <b>T</b> stopped (Ctrl+Z / SIGSTOP), <b>Z</b> zombie. A box with many <code>D</code> processes and a high load average but idle CPU is I/O-bound.</p>
      <p><b>/proc vs /sys.</b> /proc grew organically (processes + everything); <b>/sys</b> is the tidy newer view of devices and drivers (<code>/sys/class/net/eth0/speed</code>, <code>/sys/block/sda/queue/scheduler</code>, cgroup v2 at <code>/sys/fs/cgroup</code>).</p>`,
    clues: [
      '"which files does process X have open?" → <code>ls -l /proc/PID/fd</code> (or <code>lsof -p</code>)',
      '"how much memory does it really use?" → <b>VmRSS</b> in /proc/PID/status (not VSZ)',
      '"what is the exact command line / environment of a running process?" → <code>/proc/PID/cmdline</code>, <code>environ</code>',
      '"load average is high but CPU idle" → look for <code>D</code> state processes (I/O wait)',
      '"change a kernel setting without reboot" → <code>sysctl -w</code> or write under <code>/proc/sys</code>; persist in <code>/etc/sysctl.d/</code>',
      '"how does ps/top/free get its numbers?" → they parse /proc files',
      '"recover a deleted but still-open file" → <code>cp /proc/PID/fd/N /safe/place</code>'
    ],
    code: [
      `# --- Tour of /proc (replace PID with a real process id, $$ = your shell) ---
cat /proc/loadavg                       # 0.52 0.40 0.35 2/312 48211   (1,5,15 min load, running/total, last pid)
head -3 /proc/meminfo                   # MemTotal / MemFree / MemAvailable in kB
grep -E 'MemAvailable|SwapFree' /proc/meminfo
nproc; grep -c '^processor' /proc/cpuinfo   # number of CPUs two ways
cat /proc/uptime                        # seconds up, seconds idle (summed over CPUs)
ls /proc | grep -E '^[0-9]+$' | wc -l   # how many processes exist right now

PID=$$
tr '\\0' ' ' < /proc/$PID/cmdline; echo   # command line (arguments are NUL-separated)
grep -E '^(Name|State|PPid|Threads|VmRSS)' /proc/$PID/status
ls -l /proc/$PID/fd                     # 0,1,2 -> /dev/pts/N plus anything else it opened
readlink /proc/$PID/exe                 # which binary is this, really?
readlink /proc/$PID/cwd                 # its current directory
cat /proc/$PID/limits | head -5         # per-process ulimits
cat /proc/$PID/io                       # rchar / wchar / read_bytes / write_bytes

# kernel tunables
sysctl vm.swappiness                    # same as: cat /proc/sys/vm/swappiness
sudo sysctl -w vm.swappiness=10         # until reboot
echo 'vm.swappiness = 10' | sudo tee /etc/sysctl.d/90-swap.conf   # persistent
sudo sysctl --system                    # reload all sysctl files`,
      { lang: 'cpp', code: R`// proc_rss.cpp - read your own memory use from /proc/self/status (what top/ps do internally)
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

// Return the kB value of a "Key:   123 kB" line from /proc/self/status, or -1 if missing.
long read_status_kb(const std::string& key) {
    std::ifstream f("/proc/self/status");           // a virtual file: the kernel fills it on each open
    std::string line;
    while (std::getline(f, line)) {
        if (line.compare(0, key.size(), key) == 0) {  // line starts with the key, e.g. "VmRSS:"
            return std::stol(line.substr(key.size()));  // stol skips leading spaces and stops at " kB"
        }
    }
    return -1;
}

int main() {
    std::cout << "VmRSS before: " << read_status_kb("VmRSS:") << " kB\n";
    std::vector<char> big(50 * 1024 * 1024, 1);       // allocate and TOUCH 50 MB so pages become resident
    std::cout << "VmRSS after : " << read_status_kb("VmRSS:") << " kB (about +51200)\n";
    std::cout << "VmSize      : " << read_status_kb("VmSize:") << " kB (virtual, always >= RSS)\n";
    return big[123] == 1 ? 0 : 1;                      // keep 'big' alive
}` },
      `# --- Real tasks done through /proc ---
# 1) Which program is hogging memory? (VmRSS, biggest first)
for p in /proc/[0-9]*; do
  rss=$(awk '/VmRSS/ {print $2}' "$p/status" 2>/dev/null)
  [ -n "$rss" ] && echo "$rss $(basename "$p") $(tr '\\0' ' ' < "$p/cmdline" | cut -c1-60)"
done | sort -nr | head -5

# 2) Recover a file that was deleted while a process still has it open
ls -l /proc/4321/fd | grep deleted        # ... /var/log/app.log (deleted)
cp /proc/4321/fd/7 /root/app.log.recovered

# 3) Is this process stuck waiting on disk? (D state + kernel function)
grep State /proc/4321/status; cat /proc/4321/wchan; echo

# 4) How many fds does it have vs its limit? (fd leak check)
ls /proc/4321/fd | wc -l; grep 'open files' /proc/4321/limits`
    ],
    codeTitle: ['Bash: guided tour of /proc and sysctl', 'C++: read VmRSS from /proc/self/status', 'Bash: real troubleshooting tasks'],
    viz: {
      title: 'Navigate the /proc tree to the file you need',
      input: 'fd',
      inputLabel: 'what do you want to know? (fd, tty, socket, vmrss, state, meminfo, memavailable, swappiness, somaxconn)',
      gen: function (input) {
        var arr = ['/proc', '<pid>/', 'system-wide files', 'fd/', 'status', 'meminfo', 'sys/', '0 -> /dev/pts/1', '3 -> socket:[8812]', 'VmRSS: 52000 kB', 'State: S (sleeping)', 'MemAvailable: 6.1 GB', 'SwapFree', 'vm/swappiness', 'net/core/somaxconn'];
        var goals = {
          fd: [3, 'the list of everything this process has open', 'ls -l /proc/PID/fd'],
          tty: [7, 'fd 0 (stdin) is a terminal device', 'ls -l /proc/PID/fd/0'],
          socket: [8, 'fd 3 is a network socket; match its inode with ss/lsof', 'ls -l /proc/PID/fd | grep socket'],
          vmrss: [9, 'RAM this process really occupies right now', "grep VmRSS /proc/PID/status"],
          state: [10, 'R/S/D/Z/T state of the process', "grep State /proc/PID/status"],
          meminfo: [5, 'overall RAM accounting for the machine', 'cat /proc/meminfo'],
          memavailable: [11, 'memory new programs can still get without swapping (use this, not MemFree)', "grep MemAvailable /proc/meminfo"],
          swappiness: [13, 'how eagerly the kernel swaps; a tunable you can write', 'sysctl vm.swappiness'],
          somaxconn: [14, 'maximum listen() backlog; raise for busy servers', 'sysctl net.core.somaxconn']
        };
        var key = String(input).trim().toLowerCase().replace(/[^a-z]/g, '');
        if (!goals[key]) throw new Error('Try: fd, tty, socket, vmrss, state, meminfo, memavailable, swappiness, somaxconn');
        var target = goals[key][0], path = [], n = target;
        while (n > 0) { path.unshift(n); n = (n - 1) >> 1; }
        path.unshift(0);
        var desc = { 0: 'The root of the virtual filesystem. Nothing here is stored on disk.', 1: 'One directory per running process, named by its PID. <code>/proc/self</code> always means "the process that is looking".', 2: 'Files that describe the whole machine, not one process.', 3: 'Each entry is a symlink to something the process has open: file, pipe, socket, device.', 4: 'Human-readable summary: name, state, memory, threads, uid.', 5: 'The memory ledger: total, free, available, cached, swap.', 6: 'Kernel settings. Writing to files here changes live behaviour (this is what <code>sysctl</code> edits).' };
        var f = [];
        f.push({ narr: 'Goal: find <b>' + goals[key][1] + '</b>. In /proc everything is a path, so we just walk down the tree.', parts: [{ type: 'tree', label: '/proc (example)', arr: arr, hl: { 0: 'cur' } }] });
        for (var i = 1; i < path.length; i++) {
          var hl = {}; for (var j = 0; j < i; j++) hl[path[j]] = 'done'; hl[path[i]] = path[i] === target ? 'sel' : 'cur';
          var isLeaf = path[i] === target;
          f.push({ narr: 'Step ' + i + ': go to <b>' + H.esc(arr[path[i]]) + '</b>. ' + (desc[path[i]] || (isLeaf ? 'This is the value (or file) we were looking for.' : '')), parts: [{ type: 'tree', label: '/proc (example)', arr: arr, hl: hl }, { type: 'text', html: '<code>' + H.esc(path.slice(1, i + 1).map(function (p) { return arr[p].replace('<pid>/', 'PID/').replace('system-wide files', ''); }).join('')) + '</code>' }] });
        }
        var hlf = {}; path.forEach(function (p) { hlf[p] = 'done'; }); hlf[target] = 'sel';
        f.push({ narr: 'Done. The shell command that reads it: <code>' + H.esc(goals[key][2]) + '</code>. Replace <code>PID</code> with a real process id (or use <code>self</code>).', parts: [{ type: 'tree', label: '/proc (example)', arr: arr, hl: hlf }, { type: 'text', html: '<b>' + H.esc(goals[key][2]) + '</b><br>→ ' + goals[key][1] }] });
        return f;
      }
    },
    examples: [
      { title: 'Which process uses the most RAM - without ps', html: `<p>Because <code>ps</code> only prints /proc data, you can build the same view with a loop. This is also what you do inside a minimal container image that has no <code>ps</code>. RSS (resident set size) counts pages really in RAM; VSZ counts all reserved address space, including memory never touched, so VSZ looks scary but means little.</p>`, code: `for p in /proc/[0-9]*; do
  awk '/^Name|^VmRSS/ {printf "%s ", $2} END {print ""}' "$p/status" 2>/dev/null
done | sort -k2 -nr | head -5     # "name rss_kB" biggest first` },
      { title: 'Load average high, CPU idle?', html: `<p>Load average counts runnable <b>plus</b> uninterruptible (D-state) tasks. If it is 20 on a 4-core box but <code>top</code> shows 95% idle, tasks are stuck waiting for I/O (slow disk, NFS hang). Prove it by counting D-state processes and finding what they wait on.</p>`, code: `cat /proc/loadavg
ps -eo state,pid,wchan:20,cmd | awk '$1=="D"'      # who is stuck, and in which kernel function
grep -E 'procs_running|procs_blocked' /proc/stat   # runnable vs blocked right now` },
      { title: 'Tune a busy web server\'s accept queue', html: `<p>Clients see "connection refused / resets" at traffic spikes while CPU is low. The listen backlog (<code>net.core.somaxconn</code>, default 4096 on new kernels, 128 on old) caps queued connections; the application's own <code>listen(fd, backlog)</code> value is capped by it. Check the drops with <code>nstat -az TcpExtListenOverflows</code> then raise both.</p>`, code: `sysctl net.core.somaxconn net.ipv4.tcp_max_syn_backlog
sudo sysctl -w net.core.somaxconn=8192
printf 'net.core.somaxconn = 8192\\n' | sudo tee /etc/sysctl.d/91-web.conf
sudo sysctl --system` }
    ],
    deepDive: `<p>🟣 <b>How it works.</b> /proc is implemented by the kernel's <code>procfs</code>; each file has read (and sometimes write) callbacks - <code>seq_file</code> generators that format kernel structures as text at read time. That's why a file may show size 0 and why two reads a second apart differ. Many numbers are cumulative counters (CPU ticks in <code>/proc/stat</code>, bytes in <code>/proc/net/dev</code>): tools like <code>vmstat</code> and <code>top</code> read twice and subtract. <code>strace -e openat ps</code> shows <code>ps</code> opening <code>/proc/&lt;pid&gt;/stat</code> for every process.</p>
      <p><b>Memory vocabulary.</b> <b>VSZ</b> = virtual size, <b>RSS</b> = resident pages (counts shared library pages in every process that maps them, so summing RSS over-counts), <b>PSS</b> = proportional share (<code>/proc/PID/smaps_rollup</code>; split shared pages fairly - the right metric for "how much do all my workers cost"), <b>USS</b> = unique pages. <b>MemAvailable</b> in /proc/meminfo estimates reclaimable cache; "free memory is low" is normal on Linux because it uses spare RAM as page cache. Real trouble = MemAvailable near zero plus swap-in/out activity (<code>vmstat si/so</code>) or the OOM killer (<code>dmesg | grep -i oom</code>; scores in <code>/proc/PID/oom_score</code>, adjust with <code>oom_score_adj</code>).</p>
      <p><b>Load average semantics.</b> Exponentially damped averages of (runnable + D-state) tasks over 1/5/15 min. Compare against CPU count: load 8 on 8 cores = fully busy, on 2 cores = overloaded. Use <code>/proc/pressure/cpu|memory|io</code> (PSI, kernel 4.20+) for a better signal: "percent of time tasks were stalled".</p>
      <p><b>Containers.</b> Inside a container /proc/PID is PID-namespaced, but <code>/proc/meminfo</code>, <code>/proc/cpuinfo</code>, <code>/proc/uptime</code> still show the <b>host</b> (unless lxcfs or newer runtimes virtualise them). So an app that sizes its thread pool from <code>nproc</code>/cpuinfo or its heap from meminfo can over-allocate versus the cgroup limit (<code>/sys/fs/cgroup/memory.max</code>, <code>cpu.max</code>). Modern JVM/Go/.NET read the cgroup files - older ones do not.</p>
      <p><b>Security.</b> <code>environ</code>, <code>cmdline</code> and <code>fd/</code> expose secrets, so never pass passwords as command-line arguments (any user can run <code>ps aux</code>). Mount options <code>hidepid=2,gid=...</code> hide other users' processes. <code>/proc/PID/mem</code>, <code>ptrace</code> and <code>/proc/kcore</code> require privileges (and Yama <code>ptrace_scope</code>). Writing to <code>/proc/sys/kernel/*</code> needs root; in containers most of it is read-only.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Pasting <code>cat /proc/meminfo</code>, <code>/proc/PID/status</code> or <code>/proc/pressure/memory</code> output into an assistant and asking "<i>what does this say is wrong?</i>" is a very effective triage move; models know the field meanings well. Observability agents (eBPF-based, Datadog/Grafana/OpenTelemetry collectors) are, underneath, readers of /proc and /sys plus kernel tracing.</p>
      <p><b>Where AI goes wrong:</b> it confuses VSZ with RSS, tells you to "free up memory" when MemAvailable is fine (page cache is not a leak), recommends magic sysctl values copied from old blog posts (<code>vm.swappiness=0</code>, huge <code>somaxconn</code>) without measuring, and suggests <code>echo 3 &gt; /proc/sys/vm/drop_caches</code> as a fix (it only slows the system down afterwards). <b>What you must own:</b> reading the right counter for the question, changing one knob at a time with before/after measurements, and persisting changes in <code>/etc/sysctl.d</code>. Also be careful what you paste: <code>environ</code> and <code>cmdline</code> can contain tokens - redact before sharing with any AI tool.</p>`,
    problems: []
  });
  // ───────────────────────── Topic 6: systemd & journalctl ─────────────────────────
  topics.push({
    title: 'systemd Units, systemctl and journalctl',
    analogy: `<p>systemd is the <b>building manager</b> of the machine (it is process number 1). You give it a short <b>job description card</b> (a <i>unit file</i>) for each service: "run this program, as this user, start it after the network is up, and if it collapses, bring it back after 3 seconds." The manager then starts services in the right order, keeps a <b>logbook</b> of everything they say (the <i>journal</i>), and puts every service and all its helper processes in its own <b>fenced yard</b> (a cgroup) so that when you say "stop", nothing is left running.</p>`,
    explain: `<p>🟢 <b>Why systemd.</b> Old init scripts started things one by one and could not restart crashed services. systemd (PID 1 on nearly every mainstream distro) starts units in parallel, tracks them, restarts them, and collects logs. Core words:</p>
      <ul>
        <li><b>unit</b> - anything systemd manages: <code>.service</code> (a program), <code>.timer</code> (cron replacement), <code>.socket</code> (start on first connection), <code>.mount</code>, <code>.target</code> (a group like <code>multi-user.target</code> ≈ old "runlevel 3").</li>
        <li>Unit files live in <code>/etc/systemd/system/</code> (yours, wins) and <code>/usr/lib/systemd/system/</code> (packages). After editing: <code>sudo systemctl daemon-reload</code>.</li>
      </ul>
      <p>🔵 <b>A minimal service unit</b> has three sections:</p>
      <pre>[Unit]
Description=My API
After=network-online.target
Wants=network-online.target

[Service]
User=app
WorkingDirectory=/opt/api
ExecStart=/opt/api/bin/server --port 8080
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target</pre>
      <p><b>[Unit]</b> = description + dependencies/ordering. <b>[Service]</b> = how to run it. <b>[Install]</b> = what <code>enable</code> does (symlink it into <code>multi-user.target.wants/</code> so it starts at boot).</p>
      <p>🔵 <b>Everyday systemctl:</b></p>
      ${H.table(['Command', 'Meaning'], [
        ['<code>systemctl status api</code>', 'state, main PID, last log lines, cgroup tree'],
        ['<code>sudo systemctl start|stop|restart|reload api</code>', 'run / stop (SIGTERM, then SIGKILL) / stop+start / re-read config (<code>ExecReload</code>, often SIGHUP)'],
        ['<code>sudo systemctl enable --now api</code>', 'start at every boot <b>and</b> start right now'],
        ['<code>systemctl is-active api</code>, <code>is-enabled api</code>', 'script-friendly answers (exit code)'],
        ['<code>systemctl --failed</code>', 'list units that failed'],
        ['<code>sudo systemctl daemon-reload</code>', 'tell systemd to re-read unit files after you edit them'],
        ['<code>sudo systemctl edit api</code>', 'create a drop-in override without touching the original file'],
        ['<code>systemctl cat api</code>', 'print the final unit including drop-ins'],
        ['<code>systemctl list-timers</code>', 'scheduled timer units (cron-like)'],
        ['<code>systemd-analyze blame</code>', 'what slowed the boot']
      ])}
      <p>🔵 <b>journalctl - the log reader.</b> systemd captures each service's stdout/stderr and syslog into a binary journal, so your app can simply <code>print</code> and still get timestamps, per-unit filtering and rotation for free.</p>
      <pre>journalctl -u api -f                  # follow one service live (like tail -f)
journalctl -u api -n 100 --no-pager   # last 100 lines
journalctl -u api --since "1 hour ago" -p err   # errors only
journalctl -b -1                      # the previous boot (crash investigation)
journalctl -k                         # kernel messages (like dmesg)
journalctl --disk-usage; sudo journalctl --vacuum-time=7d</pre>
      <p>🔵 <b>The service lifecycle</b> (see the visualizer): <b>inactive → activating → active (running) → deactivating → inactive</b>, and <b>failed</b> when the process exits non-zero, is killed, or times out. With <code>Restart=</code> set, systemd moves <i>failed → activating</i> again after <code>RestartSec</code>.</p>
      <p>🔵 <b>Restart policies:</b> <code>no</code> (default), <code>on-failure</code> (non-zero exit, signal, timeout - the usual choice), <code>always</code> (even a clean exit), <code>on-abnormal</code>. A deliberate <code>systemctl stop</code> is never restarted.</p>`,
    clues: [
      '"run my app as a service / start on boot / restart on crash" → a <code>.service</code> unit with <code>Restart=on-failure</code> + <code>enable</code>',
      '"service starts before the network is ready" → <code>After=network-online.target</code> <b>and</b> <code>Wants=</code>',
      '"where are the logs of my service?" → <code>journalctl -u name</code>',
      '"changed the unit file but nothing changed" → missing <code>daemon-reload</code> (then restart)',
      '"start request repeated too quickly / start-limit-hit" → crash loop faster than <code>StartLimitBurst</code>',
      '"cron replacement with logging and missed-run catch-up" → <code>.timer</code> with <code>Persistent=true</code>',
      '"stop takes 90 seconds" → app ignores SIGTERM; <code>TimeoutStopSec</code> then SIGKILL'
    ],
    code: [
      { lang: 'text', title: '/etc/systemd/system/api.service - production-style service unit', code: `[Unit]
Description=Orders API
Documentation=https://wiki.example.com/orders-api
# Ordering (After) and dependency (Wants/Requires) are separate ideas: we want the network, started first.
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=orders
Group=orders
WorkingDirectory=/opt/orders
EnvironmentFile=/etc/orders/env
ExecStartPre=/opt/orders/bin/check-config
ExecStart=/opt/orders/bin/server --port 8080
# $MAINPID is the PID of ExecStart; most servers reload config on SIGHUP
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=3
# Stop: SIGTERM first, wait up to 30 s for graceful drain, then SIGKILL
TimeoutStopSec=30
KillMode=mixed
LimitNOFILE=65536
MemoryMax=1G
# Hardening: cheap, big security win
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/orders

[Install]
WantedBy=multi-user.target
` },
      `# --- Install and operate the service ---
sudo cp api.service /etc/systemd/system/api.service
sudo systemctl daemon-reload                 # re-read unit files
sudo systemctl enable --now api              # boot-start + start now
systemctl status api --no-pager              # Active: active (running) since ...
journalctl -u api -n 50 --no-pager           # last log lines
sudo systemctl restart api                   # stop (SIGTERM) then start
systemctl is-active api && echo "up"         # exit code 0 when active
systemctl show api -p MainPID -p NRestarts -p ActiveState -p Result
sudo systemctl kill -s HUP api               # send a signal to the unit's main process
# Change one setting without editing the packaged file:
sudo systemctl edit api                      # opens an override.conf drop-in
#   [Service]
#   Environment=LOG_LEVEL=debug
sudo systemctl revert api                    # drop the overrides again`,
      { lang: 'text', title: 'A timer instead of cron: nightly-backup.timer + .service', code: `# /etc/systemd/system/nightly-backup.service
[Unit]
Description=Nightly backup

[Service]
Type=oneshot
ExecStart=/opt/backup.sh

# /etc/systemd/system/nightly-backup.timer
[Unit]
Description=Run backup every night

[Timer]
OnCalendar=*-*-* 02:30:00
RandomizedDelaySec=300
Persistent=true

[Install]
WantedBy=timers.target

# enable with:  sudo systemctl enable --now nightly-backup.timer
# inspect with: systemctl list-timers ; journalctl -u nightly-backup
` },
      { lang: 'python', run: true, title: 'tiny unit-file linter (parses sections and flags common mistakes)', code: R`# A systemd unit is an INI-like file. This stdlib-only linter shows what to double-check.
UNIT = """
[Unit]
Description=Orders API
After=network.target

[Service]
ExecStart=./server --port 8080
Restart=always
User=root
"""

def parse(text):
    sections, cur = {}, None
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("[") and line.endswith("]"):
            cur = line[1:-1]
            sections[cur] = {}
        elif "=" in line and cur:
            k, v = line.split("=", 1)
            sections[cur].setdefault(k.strip(), []).append(v.strip())
    return sections

def lint(sections):
    problems = []
    svc = sections.get("Service", {})
    if "Service" not in sections:
        problems.append("no [Service] section")
    exe = svc.get("ExecStart", [""])[0]
    if not exe:
        problems.append("ExecStart missing")
    elif not exe.startswith("/"):
        problems.append("ExecStart must be an ABSOLUTE path (got %r)" % exe)
    if "Restart" in svc and "RestartSec" not in svc:
        problems.append("Restart= without RestartSec= : a crash loop will hit the start limit quickly")
    if svc.get("Restart") == ["always"]:
        problems.append("Restart=always also restarts after a clean exit; on-failure is usually what you want")
    if "User" not in svc or svc["User"] == ["root"]:
        problems.append("runs as root: add a dedicated User= and hardening (NoNewPrivileges, ProtectSystem)")
    if "Install" not in sections:
        problems.append("no [Install] section: 'systemctl enable' will have no effect")
    after = sections.get("Unit", {}).get("After", [""])[0]
    if "network.target" in after and "network-online" not in after:
        problems.append("After=network.target does not wait for connectivity; use network-online.target + Wants=")
    return problems

s = parse(UNIT)
print("sections found:", list(s))
for i, p in enumerate(lint(s), 1):
    print("%d. %s" % (i, p))
` }
    ],
    codeTitle: ['Unit file: api.service', 'Bash: install and operate the service', 'Unit files: timer replacing cron', 'Python: unit-file linter (runnable)'],
    viz: {
      title: 'systemd service lifecycle states',
      input: 'crash',
      inputLabel: 'scenario: start | stop | crash | hang (stop that ignores SIGTERM)',
      gen: function (input) {
        var sc = String(input).trim().toLowerCase();
        var nodes = [
          { id: 'inactive', label: 'inactive (dead)', x: 12, y: 14, shape: 'box', w: 20 },
          { id: 'activating', label: 'activating (start)', x: 38, y: 14, shape: 'box', w: 22 },
          { id: 'active', label: 'active (running)', x: 66, y: 14, shape: 'box', w: 22 },
          { id: 'deactivating', label: 'deactivating (stop)', x: 66, y: 46, shape: 'box', w: 24 },
          { id: 'failed', label: 'failed', x: 36, y: 46, shape: 'box', w: 14 }
        ];
        var edges = [['inactive', 'activating', 'start'], ['activating', 'active', 'ready'], ['active', 'deactivating', 'stop'], ['deactivating', 'inactive', 'exited'], ['active', 'failed', 'crash'], ['failed', 'activating', 'Restart='], ['activating', 'failed', 'exec error'], ['deactivating', 'failed', 'timeout']];
        function G(cur, edge, tag) { var hl = {}, eh = {}, tg = {}; if (cur) hl[cur] = 'cur'; if (edge) eh[edge] = 'ok'; if (cur && tag) tg[cur] = tag; return { type: 'graph', label: 'unit state machine', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: eh, tags: tg }; }
        function T(a, s, res) { return { type: 'table', label: 'systemctl show', columns: ['ActiveState', 'SubState', 'Result'], rows: [[a, s, res]], hl: { 0: a === 'failed' ? 'bad' : (a === 'active' ? 'ok' : 'cur') } }; }
        var f;
        if (sc === 'start') f = [
          { narr: 'Nothing is running. The unit is <b>inactive</b>. We run <code>sudo systemctl start api</code>.', parts: [G('inactive', '', ''), T('inactive', 'dead', 'success')] },
          { narr: 'systemd moves to <b>activating</b>: it creates a fresh cgroup, runs <code>ExecStartPre</code>, then forks and execs <code>ExecStart</code> as the configured User.', parts: [G('activating', 'inactive-activating', 'forking'), T('activating', 'start', 'success')] },
          { narr: 'For <code>Type=simple</code> the unit counts as started as soon as the process is exec\'d. (<code>Type=notify</code> waits until the app calls <code>sd_notify("READY=1")</code> - better for slow startups.)', parts: [G('activating', '', 'exec'), { type: 'text', html: 'Type=simple: ready right after exec<br>Type=notify: ready when the app says so<br>Type=forking: ready when the parent exits' }] },
          { narr: 'The unit is now <b>active (running)</b>. Its stdout/stderr flow into the journal. <code>systemctl status</code> shows the main PID and the cgroup tree.', parts: [G('active', 'activating-active', 'MainPID 4242'), T('active', 'running', 'success')] }
        ];
        else if (sc === 'stop') f = [
          { narr: 'The service is <b>active (running)</b> and serving traffic. We run <code>sudo systemctl stop api</code>.', parts: [G('active', '', 'MainPID 4242'), T('active', 'running', 'success')] },
          { narr: 'State becomes <b>deactivating</b>. systemd runs <code>ExecStop</code> if any, then sends <b>SIGTERM</b> to the main process (and, with default <code>KillMode=control-group</code>, to every process in the cgroup).', parts: [G('deactivating', 'active-deactivating', 'SIGTERM sent'), T('deactivating', 'stop-sigterm', 'success')] },
          { narr: 'A well-behaved app catches SIGTERM, finishes in-flight requests, closes connections and exits with status 0 well before <code>TimeoutStopSec</code>.', parts: [G('deactivating', '', 'draining'), { type: 'text', html: 'app: <i>"SIGTERM received - draining 3 requests..."</i>' }] },
          { narr: 'The process is gone, the cgroup is empty: the unit is <b>inactive (dead)</b>, Result = success.', parts: [G('inactive', 'deactivating-inactive', ''), T('inactive', 'dead', 'success')] }
        ];
        else if (sc === 'crash') f = [
          { narr: 'The service is <b>active (running)</b>. The unit has <code>Restart=on-failure</code> and <code>RestartSec=3</code>.', parts: [G('active', '', 'MainPID 4242'), T('active', 'running', 'success')] },
          { narr: 'The app hits a bug and dies (exit code 1, or killed by the OOM killer = SIGKILL). systemd notices because it is the parent and gets SIGCHLD.', parts: [G('active', '', 'exit status 1'), { type: 'text', html: 'journal: <code>api.service: Main process exited, code=exited, status=1/FAILURE</code>' }] },
          { narr: 'State: <b>failed</b> (Result = exit-code). Because Restart= applies to this result, systemd schedules a restart.', parts: [G('failed', 'active-failed', 'exit-code'), T('failed', 'failed', 'exit-code')] },
          { narr: 'After <code>RestartSec=3</code> it goes <b>failed → activating</b> again. A new PID is created; <code>NRestarts</code> increases. (Too many restarts in <code>StartLimitIntervalSec</code> = <code>start-limit-hit</code>: systemd gives up.)', parts: [G('activating', 'failed-activating', 'NRestarts=1'), T('activating', 'auto-restart', 'exit-code')] },
          { narr: 'The service is <b>active (running)</b> again with a new PID - the crash was healed without a human. Read <code>journalctl -u api</code> afterwards to fix the root cause.', parts: [G('active', 'activating-active', 'MainPID 4310'), T('active', 'running', 'success')] }
        ];
        else if (sc === 'hang') f = [
          { narr: 'The service is active, but this version ignores SIGTERM (no handler, or it is a shell script that did not <code>exec</code> the real program). We run <code>systemctl stop api</code>.', parts: [G('active', '', 'MainPID 4242'), T('active', 'running', 'success')] },
          { narr: '<b>deactivating</b>: systemd sends SIGTERM and starts a timer of <code>TimeoutStopSec</code> (default 90 s).', parts: [G('deactivating', 'active-deactivating', 'SIGTERM, timer 90s'), T('deactivating', 'stop-sigterm', 'success')] },
          { narr: 'Nothing happens - the app is still alive. The timer runs out; journal: <code>State \'stop-sigterm\' timed out. Killing.</code>', parts: [G('deactivating', '', 'timeout!'), T('deactivating', 'stop-sigterm', 'timeout')] },
          { narr: 'systemd sends <b>SIGKILL</b> to the whole cgroup (no cleanup possible). Sub-state <code>stop-sigkill</code>.', parts: [G('deactivating', '', 'SIGKILL'), T('deactivating', 'stop-sigkill', 'timeout')] },
          { narr: 'Everything is dead, but the unit is marked <b>failed</b> with Result=timeout so you notice. Fix the app (install a SIGTERM handler) or shorten <code>TimeoutStopSec</code>; use <code>systemctl reset-failed api</code> to clear.', parts: [G('failed', 'deactivating-failed', 'timeout'), T('failed', 'failed', 'timeout')] }
        ];
        else throw new Error('Choose: start | stop | crash | hang');
        return f;
      }
    },
    examples: [
      { title: 'Service keeps dying: read the journal', html: `<p>Standard crash investigation: status gives the last lines and exit status; the journal gives the full story around the failure; <code>-p err</code> trims noise; <code>-o short-precise</code> gives microseconds.</p>`, code: `systemctl status api --no-pager
journalctl -u api --since "10 min ago" --no-pager | tail -40
journalctl -u api -p err -b                 # errors since boot
systemctl show api -p ExecMainStatus -p Result -p NRestarts
coredumpctl list api                        # did it segfault? (if systemd-coredump is installed)` },
      { title: 'Run a one-off command as a managed, limited service', html: `<p><code>systemd-run</code> turns any command into a transient unit with cgroup limits and journal logging - perfect for "run this migration with only 2 GB RAM" or testing a unit's environment.</p>`, code: `sudo systemd-run --unit=migrate-test -p MemoryMax=2G -p CPUQuota=50% /opt/app/migrate.sh
journalctl -u migrate-test -f
systemd-run --user --on-active=10m echo "ten minutes passed"   # one-shot timer without cron` },
      { title: 'Why the unit starts but the app cannot reach the database', html: `<p><code>After=</code> only orders startup; it does not wait for the database to <i>accept connections</i>, and <code>network.target</code> does not mean "network is up". Use <code>network-online.target</code> plus <code>Wants=</code>, <code>Requires=postgresql.service</code> if a hard dependency, and make the app retry connections with back-off - because the database can also restart later.</p>`, code: `systemctl list-dependencies api            # what does it pull in?
systemd-analyze critical-chain api.service # what delayed it at boot?` }
    ],
    deepDive: `<p>🟣 <b>PID 1 and cgroups.</b> systemd is the first process the kernel starts; it adopts orphans and reaps zombies. Each service runs in its own <b>cgroup</b> (<code>/sys/fs/cgroup/system.slice/api.service</code>), which is how systemd knows <i>all</i> descendants (even double-forked daemons), kills them reliably (<code>KillMode=control-group</code>), and enforces <code>MemoryMax=</code>, <code>CPUQuota=</code>, <code>TasksMax=</code>, <code>IOWeight=</code>. This is the same kernel machinery containers use.</p>
      <p><b>Ordering vs dependency.</b> <code>After=/Before=</code> only order; <code>Wants=</code> (soft) and <code>Requires=</code> (hard: if it fails, I fail) pull units in. You normally need both. <code>BindsTo=</code>, <code>PartOf=</code>, <code>Conflicts=</code> refine it. <b>Targets</b> are sync points (<code>network-online.target</code>, <code>multi-user.target</code>, <code>graphical.target</code>); <code>systemctl get-default</code>.</p>
      <p><b>Service types.</b> <code>simple</code> (default; the process stays in the foreground), <code>exec</code> (like simple but ready only after exec succeeded), <code>forking</code> (old-style daemon forks and parent exits; set <code>PIDFile=</code>), <code>oneshot</code> (runs to completion, for scripts; <code>RemainAfterExit=yes</code>), <code>notify</code> (app sends <code>READY=1</code> via <code>sd_notify</code>; pairs with <code>WatchdogSec=</code> for hung-app detection), <code>dbus</code>, <code>idle</code>. Use <b>foreground</b> programs; don't daemonize them yourself.</p>
      <p><b>Crash loops.</b> Defaults <code>StartLimitIntervalSec=10s</code>, <code>StartLimitBurst=5</code>: more than 5 starts in 10 s → <code>start-limit-hit</code> and no further automatic restarts (reset with <code>reset-failed</code>). <code>RestartSec=</code> plus <code>RestartSteps=</code>/<code>RestartMaxDelaySec=</code> (v254+) give exponential back-off. Exit codes treated as "success" can be tuned with <code>SuccessExitStatus=143</code> (SIGTERM from a JVM) and <code>RestartPreventExitStatus=</code>.</p>
      <p><b>Socket activation</b> lets systemd own the listening socket: it starts the service on the first connection, can restart the app with <b>zero dropped connections</b>, and supports privileged ports without root. <b>Timers</b> beat cron by logging to the journal, being dependency-aware, supporting <code>Persistent=true</code> (run missed jobs after downtime) and <code>RandomizedDelaySec</code> (avoid thundering herds).</p>
      <p><b>Journal internals.</b> Binary, indexed, structured (<code>journalctl -o json-pretty</code>, fields like <code>_SYSTEMD_UNIT</code>, <code>PRIORITY</code>, <code>_PID</code>). By default <b>volatile</b> (<code>/run/log/journal</code>, lost on reboot) unless <code>/var/log/journal</code> exists or <code>Storage=persistent</code> in <code>/etc/systemd/journald.conf</code>. Cap disk with <code>SystemMaxUse=1G</code>. Rate limits can silently drop bursts of lines (<code>RateLimitBurst</code>). In containers there is usually no systemd - the orchestrator plays this role (Kubernetes restartPolicy ≈ <code>Restart=</code>, liveness probe ≈ watchdog, preStop + terminationGracePeriod ≈ <code>ExecStop</code> + <code>TimeoutStopSec</code>).</p>
      <p><b>Security hardening.</b> <code>systemd-analyze security api</code> scores a unit. Cheap wins: <code>NoNewPrivileges</code>, <code>ProtectSystem=strict</code>, <code>PrivateTmp</code>, <code>ProtectHome</code>, <code>PrivateDevices</code>, <code>CapabilityBoundingSet=</code>, <code>RestrictAddressFamilies</code>, <code>SystemCallFilter=@system-service</code>, <code>DynamicUser=yes</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Writing a unit file from a description ("run this Node app as a service with restart and logs") is something assistants do well, and they can also explain <code>systemd-analyze security</code> output or turn a cron line into a timer. <b>Where they go wrong:</b> relative <code>ExecStart</code> paths, <code>Type=forking</code> for a program that stays in the foreground (service hangs in <i>activating</i>), <code>After=network.target</code> when the app needs real connectivity, <code>Restart=always</code> without <code>RestartSec</code> (hammering a dead database), running everything as root, and forgetting <code>daemon-reload</code>. They also invent directives that do not exist or that need a newer systemd than your distro ships - check <code>man systemd.service</code> and <code>systemd --version</code>.</p>
      <p><b>Use AI as a partner:</b> paste <code>systemctl status</code> and the last 50 <code>journalctl</code> lines and ask for ranked causes; ask it to review your unit with <code>systemd-analyze verify</code> in mind; have it draft a hardened version, then test with <code>systemd-analyze security</code>. Services that run AI inference or agents deserve limits (<code>MemoryMax</code>, <code>CPUQuota</code>, <code>TasksMax</code>) and a non-root user - a runaway model process should not take the host down. <b>What you must own:</b> the lifecycle (what SIGTERM→SIGKILL timing your app needs), dependency vs ordering, restart policy trade-offs, and keeping secrets in <code>EnvironmentFile</code> with mode 600 or <code>LoadCredential=</code>, never in the unit text.</p>`,
    problems: [
      P({
        t: 'Write a systemd service unit for a web app', l: 'Medium', tags: ['systemd', 'service', 'restart', 'ops'], co: ['Red Hat', 'Canonical', 'Datadog'],
        s: `<p>Your team ships a binary <code>/opt/shop/bin/shop-server</code> that listens on port 8080 and logs to stdout. Write a unit file that: runs as an unprivileged user <code>shop</code>; starts after the network is online; restarts automatically 5 seconds after a crash but <b>not</b> after a manual stop; allows 20 seconds for a graceful shutdown; reads secrets from <code>/etc/shop/env</code>; starts at boot. Then give the commands to install, start, check logs, and the command to prove the restart works.</p>`,
        ex: `<p>After <code>sudo kill -9 $(systemctl show -p MainPID --value shop)</code> the status shows a new PID within ~5 s, <code>NRestarts=1</code>, and the journal contains <code>Main process exited, code=killed, status=9/KILL</code> followed by <code>Scheduled restart job</code>.</p>`,
        bw: `<p>Start it by hand in a tmux session or with <code>nohup ./shop-server &amp;</code>. It dies on reboot or crash with nobody noticing, logs go to a file nobody rotates, and it runs as the human's own user (often root).</p>`,
        bc: `nohup /opt/shop/bin/shop-server >> /var/log/shop.log 2>&1 &
# no restart, no boot start, no limits, no log rotation`,
        q: ['Which setting restarts the process after a crash but not after systemctl stop?', ['Restart=on-failure', 'Restart=no', 'Type=oneshot', 'WantedBy=multi-user.target'], 0, 'on-failure restarts on non-zero exit, signal death or timeout; an explicit stop is never restarted regardless of the policy. WantedBy only controls boot-time enablement.'],
        h: ['<p>Hint 1: three sections - [Unit] (description, ordering), [Service] (user, command, restart), [Install] (WantedBy for boot).</p>', '<p>Hint 2: network ordering needs both <code>After=network-online.target</code> and <code>Wants=network-online.target</code>. Restart behaviour: <code>Restart=on-failure</code> + <code>RestartSec=5</code>. Graceful stop: <code>TimeoutStopSec=20</code>.</p>', '<p>Hint 3: use an absolute <code>ExecStart</code>, <code>User=shop</code>, <code>EnvironmentFile=/etc/shop/env</code> (chmod 600), then <code>daemon-reload</code>, <code>enable --now</code>. Verify with <code>journalctl -u shop -f</code> and kill -9 the main PID.</p>'],
        a: `<p>Create <code>/etc/systemd/system/shop.service</code> with [Unit] Description, <code>After=network-online.target</code> and <code>Wants=network-online.target</code>; [Service] <code>User=shop</code>, <code>EnvironmentFile=/etc/shop/env</code>, absolute <code>ExecStart=/opt/shop/bin/shop-server</code>, <code>Restart=on-failure</code>, <code>RestartSec=5</code>, <code>TimeoutStopSec=20</code>, plus hardening such as <code>NoNewPrivileges=true</code>; [Install] <code>WantedBy=multi-user.target</code>. Run <code>sudo systemctl daemon-reload</code>, <code>sudo systemctl enable --now shop</code>, check <code>systemctl status shop</code> and <code>journalctl -u shop -f</code>. Prove resilience by killing the main PID with -9 and watching a new PID appear after about 5 seconds, while <code>systemctl stop shop</code> stays stopped.</p>`,
        code: {
          lang: 'text', code: `[Unit]
Description=Shop server
After=network-online.target
Wants=network-online.target

[Service]
User=shop
EnvironmentFile=/etc/shop/env
ExecStart=/opt/shop/bin/shop-server
Restart=on-failure
RestartSec=5
TimeoutStopSec=20
NoNewPrivileges=true
ProtectSystem=strict
PrivateTmp=true

[Install]
WantedBy=multi-user.target
`
        },
        cx: `<p>O(1) configuration; the cost is in testing the failure paths (crash, stop, reboot).</p>`,
        f: ['How would you make it start only after PostgreSQL accepted connections?', 'How would you limit it to 512 MB and 50% of one CPU?']
      })
    ]
  });
  // ───────────────────────── Topic 7: debugging toolkit ─────────────────────────
  topics.push({
    title: 'Debugging Toolkit: strace, top/htop, lsof, ss/netstat, vmstat/iostat, dmesg',
    analogy: `<p>A sick server is like a sick patient, and each tool is a different <b>medical instrument</b>. <code>top</code> is the <b>thermometer and pulse</b> (is anything burning CPU or memory?). <code>vmstat</code>/<code>iostat</code> are the <b>blood tests</b> (is the problem CPU, memory, or disk?). <code>lsof</code> and <code>ss</code> are the <b>phone records</b> (who has which files and connections open?). <code>strace</code> is the <b>stethoscope on the chest</b> - it listens to every request the program makes to the kernel, so you hear exactly where it is stuck. <code>dmesg</code> is the <b>hospital's incident log</b> - what the kernel itself complained about (out of memory, disk errors). Good doctors don't run every test: they pick the next one based on the symptom.</p>`,
    explain: `<p>🟢 <b>A calm method (works for any slowdown or hang).</b> 1) What is the symptom? 2) Which resource is short - <b>CPU, memory, disk, network</b>? (the "USE" check: Utilisation, Saturation, Errors per resource). 3) Which process? 4) What is it doing? 5) What did the kernel say? Always start with the cheap, safe tools.</p>
      ${H.table(['Question', 'Tool', 'Look at'], [
        ['Is it CPU, memory or disk?', '<code>vmstat 1</code>', '<b>r</b> (runnable) vs CPUs, <b>b</b> (blocked), <b>si/so</b> (swap), <b>wa</b> (I/O wait), <b>st</b> (stolen by hypervisor)'],
        ['Which process?', '<code>top</code> / <code>htop</code>', 'sort by <kbd>P</kbd> (CPU) or <kbd>M</kbd> (memory); <kbd>H</kbd> shows threads; state <code>D</code> = stuck on I/O; %Cpu <code>wa</code>, <code>st</code>'],
        ['Is the disk the bottleneck?', '<code>iostat -xz 1</code>', '<b>%util</b> near 100 (spinning disks), <b>await</b> (ms per request), <b>aqu-sz</b> (queue)'],
        ['What files/sockets does it hold?', '<code>lsof -p PID</code>', 'regular files, sockets, <code>(deleted)</code> files, pipes'],
        ['Who owns port 8080?', '<code>ss -ltnp</code>, <code>lsof -i :8080</code>', 'LISTEN row with <code>users:(("java",pid=1234,fd=45))</code>'],
        ['How many connections, in what state?', '<code>ss -s</code>, <code>ss -tan</code>', 'ESTAB, TIME-WAIT, CLOSE-WAIT (app forgot to close), SYN-RECV'],
        ['What is a hung process doing?', '<code>strace -p PID</code>', 'last syscall: <code>futex</code> (lock), <code>read</code>/<code>recvfrom</code> (waiting for peer), <code>connect</code>, <code>wait4</code>'],
        ['Why did the kernel kill/complain?', '<code>dmesg -T</code>, <code>journalctl -k</code>', '"Out of memory: Killed process", "I/O error", "segfault at", "link down"']
      ])}
      <p>🔵 <b>top in 30 seconds.</b> Header: <code>load average</code> (1/5/15 min), <code>Tasks</code> (watch <i>zombie</i>), <code>%Cpu(s): us sy ni id wa hi si st</code> (user, kernel, nice, idle, <b>iowait</b>, interrupts, <b>steal</b>), <code>MiB Mem</code> (use "avail Mem"). Columns: <code>VIRT</code> (reserved), <code>RES</code> (real RAM), <code>SHR</code>, <code>S</code> (state), <code>%CPU</code>. Keys: <kbd>1</kbd> per-CPU, <kbd>c</kbd> full command, <kbd>H</kbd> threads, <kbd>k</kbd> kill, <kbd>q</kbd> quit. Scripts: <code>top -b -n1 | head -15</code>. <b>htop</b> adds colours, mouse, <kbd>F5</kbd> tree view, <kbd>F4</kbd> filter, <kbd>F9</kbd> signal.</p>
      <p>🔵 <b>strace in 30 seconds.</b> It prints every system call a process makes: <code>strace -f -tt -T -o trace.txt CMD</code> (follow forks, timestamps, time spent per call), or attach to a running one: <code>sudo strace -f -p PID</code>. Useful filters: <code>-e trace=openat,connect</code>, <code>-e trace=network</code>, <code>-e trace=file</code>, and the summary <code>-c</code>. Read it like this:</p>
      <pre>openat(AT_FDCWD, "/etc/myapp.conf", O_RDONLY) = -1 ENOENT (No such file or directory)   &larr; missing config!
connect(5, {sa_family=AF_INET, sin_port=htons(5432), ...}, 16) = ... (hangs)         &larr; waiting on database
futex(0x7f3c0c0010a0, FUTEX_WAIT_PRIVATE, 2, NULL   &larr; blocked on a lock (deadlock? contention?)
read(7, </pre>
      <p>🔵 <b>Port 8080 is already in use - who has it?</b> <code>sudo ss -ltnp 'sport = :8080'</code> (modern) or <code>sudo lsof -i :8080</code> or <code>sudo fuser -v 8080/tcp</code> or the old <code>sudo netstat -tulpn | grep 8080</code>. Then <code>ps -fp PID</code> to see the owner and decide: stop its service (<code>systemctl stop</code>), or <code>kill PID</code> (TERM first). Without sudo you cannot see other users' processes.</p>
      <p>🔵 <b>vmstat/iostat decoding.</b> <code>vmstat 1</code>: <b>r &gt; CPU count</b> → CPU saturated. <b>b &gt; 0</b> with high <b>wa</b> → waiting for disk. <b>si/so &gt; 0</b> continuously → swapping (memory pressure). <b>cs</b> huge → too many context switches (lock contention or thread storm). <code>iostat -xz 1</code>: <b>await</b> in tens of ms on an SSD is bad; <b>%util</b> ~100 is saturation on HDD (NVMe handles parallel queues, look at await and aqu-sz instead).</p>
      <p>🔵 <b>dmesg</b> reads the kernel ring buffer: <code>sudo dmesg -T | tail -50</code> (human timestamps), <code>dmesg -w</code> follow, <code>dmesg --level=err,warn</code>. The three lines every engineer must recognise: <code>Out of memory: Killed process 3121 (java)</code> (OOM killer), <code>blk_update_request: I/O error</code> / <code>EXT4-fs error</code> (failing disk), <code>app[1234]: segfault at ...</code> (crash with address).</p>`,
    clues: [
      '"process hangs / not responding but CPU is 0%" → <code>strace -p</code> (blocked in futex/read/connect) + <code>lsof -p</code>',
      '"Address already in use" / "who is using port X" → <code>ss -ltnp</code> / <code>lsof -i :X</code>',
      '"load average high but CPU idle" → <code>vmstat</code> <b>wa</b>/<b>b</b>, <code>iostat -x</code>, D-state processes',
      '"process disappeared with exit 137" / "killed" → <code>dmesg | grep -i oom</code>',
      '"too many CLOSE_WAIT connections" → application is not closing sockets: <code>ss -tanp state close-wait</code>',
      '"app says file not found but the file exists" → <code>strace -e openat</code> shows the real path it tried',
      '"disk full but du shows less" → deleted-but-open file: <code>lsof +L1</code>; or inodes: <code>df -i</code>'
    ],
    code: [
      `# --- strace: see what a program asks the kernel ---
strace -f -tt -T -o /tmp/trace.txt ./myapp           # trace from the start, with timestamps and per-call time
strace -e trace=openat ./myapp 2>&1 | grep ENOENT    # which files could it NOT find?
sudo strace -f -p 1234                               # attach to a running (hung?) process; Ctrl+C to detach
sudo strace -c -p 1234                               # after Ctrl+C: table of syscalls by count and time
sudo strace -e trace=network -p 1234                 # only socket calls (connect, sendto, recvfrom)
sudo strace -f -e trace=write -s 200 -p 1234         # see written text up to 200 bytes (log lines!)
# What the output of a hung process often looks like and means:
#   futex(0x7f..., FUTEX_WAIT_PRIVATE, 2, NULL   -> waiting for a lock held by another thread
#   epoll_wait(4, ...                           -> idle event loop, waiting for work (normal)
#   read(9,                                     -> waiting for data on fd 9 (look: ls -l /proc/PID/fd/9)
#   connect(5, {sin_port=htons(5432)...}        -> stuck connecting to the database`,
      `# --- Who is using port 8080? ---
sudo ss -ltnp 'sport = :8080'          # LISTEN sockets with owning process
#   State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
#   LISTEN 0      4096   0.0.0.0:8080        0.0.0.0:*        users:(("java",pid=2231,fd=47))
sudo lsof -i :8080                     # same answer in lsof style (COMMAND PID USER ...)
sudo fuser -v 8080/tcp                 # shortest
sudo netstat -tulpn | grep :8080       # legacy (net-tools); ss replaces it
ps -fp 2231                            # who started it, with which arguments
systemctl status 2231                  # which service owns this PID?
kill 2231                              # polite stop (SIGTERM); only then kill -9 if needed
# connections by state, and a summary
ss -tan | awk 'NR>1 {c[$1]++} END {for (s in c) print c[s], s}' | sort -nr
ss -s`,
      `# --- CPU / memory / disk triage (run each for 5-10 seconds) ---
uptime                                 # load average vs nproc
vmstat 1 5                             # r b swpd free si so bi bo in cs us sy id wa st
top -b -n1 | head -15                  # snapshot: top consumers
top -H -p 2231                         # threads of one process (which thread burns CPU?)
mpstat -P ALL 1 3                      # per-CPU view (one core at 100%? single-threaded bottleneck)
pidstat -d 1 3                         # per-process disk I/O
iostat -xz 1 3                         # per-disk await / %util / queue
free -m                                # look at "available", not "free"
df -h; df -i                           # space AND inodes
lsof +L1                               # deleted files still held open (hidden disk usage)
dmesg -T | grep -iE 'oom|killed process|I/O error|segfault' | tail   # kernel complaints`,
      { lang: 'python', run: true, title: 'vmstat triage: classify the bottleneck from sample lines (runnable)', code: R`# Columns of "vmstat 1":  r b swpd free buff cache si so bi bo in cs us sy id wa st
CPUS = 4
SAMPLES = {
    "busy CPU":    "9  0 0 812000 90000 1200000 0 0   10   20 4200 9000 85 12  3  0 0",
    "disk bound":  "1  6 0 150000 40000  900000 0 0 8200 7600  900 1500  4  3 20 73 0",
    "swapping":    "2  3 4800000 20000 5000 90000 3100 2900 3000 2800 1500 3000 10 15 15 60 0",
    "healthy":     "1  0 0 2400000 120000 3000000 0 0 12 30 300 600 6 2 92 0 0",
    "noisy VM":    "2  0 0 2000000 100000 2500000 0 0 5 10 500 900 30 5 40 0 25",
}

def diagnose(line):
    r, b, swpd, free, buff, cache, si, so, bi, bo, inn, cs, us, sy, idle, wa, st = map(int, line.split())
    findings = []
    if r > CPUS:
        findings.append("CPU saturated: %d runnable tasks on %d CPUs -> find the hot process with top/pidstat" % (r, CPUS))
    if wa > 20 or b > 2:
        findings.append("I/O wait %d%% and %d blocked tasks -> run iostat -xz 1 and pidstat -d" % (wa, b))
    if si > 0 or so > 0:
        findings.append("swapping (si=%d so=%d) -> memory pressure; check free -m, top -o %%MEM, dmesg for OOM" % (si, so))
    if st > 10:
        findings.append("steal %d%% -> the hypervisor/neighbour is taking CPU; move or resize the VM" % st)
    if us + sy > 80 and r <= CPUS:
        findings.append("CPU busy (%d%% user+sys) but not oversubscribed -> may simply be at capacity" % (us + sy))
    return findings or ["no obvious bottleneck: look at the application, network or locks"]

for name, line in SAMPLES.items():
    print("== " + name)
    for finding in diagnose(line):
        print("   - " + finding)
` }
    ],
    codeTitle: ['Bash: strace cookbook', 'Bash: find the owner of port 8080', 'Bash: CPU / memory / disk triage commands', 'Python: vmstat bottleneck classifier (runnable)'],
    viz: {
      title: 'Pick the next tool from the symptom',
      input: 'hung',
      inputLabel: 'symptom: hung | port | cpu | disk | oom | net',
      gen: function (input) {
        var S = {
          hung: {
            sym: 'App hung, 0% CPU',
            steps: [
              { tool: 'ps / top', cmd: 'ps -o pid,stat,wchan:20,cmd -p 4242', out: 'PID STAT WCHAN  CMD\n4242 Sl   futex_wait_queue  ./server', meaning: 'Alive, state S (sleeping), waiting in futex_wait: it is blocked, not busy. Not a CPU problem.' },
              { tool: 'strace', cmd: 'sudo strace -f -p 4242', out: 'futex(0x7f3c0c0010a0, FUTEX_WAIT_PRIVATE, 2, NULL', meaning: 'Stuck on a lock/condition variable. Which thread holds it? (A deadlock or a thread waiting on a slow call.)' },
              { tool: 'lsof', cmd: 'sudo lsof -p 4242 -a -i', out: 'server 4242 app 9u IPv4 TCP 10.0.0.5:51834->10.0.0.9:5432 (ESTABLISHED)', meaning: 'It holds an open connection to port 5432 (the database). Suspect: the DB call never returns.' },
              { tool: 'ss', cmd: 'ss -tnop dst :5432', out: 'ESTAB 0 0 10.0.0.5:51834 10.0.0.9:5432 timer:(keepalive,119min)', meaning: 'Connection is open but idle: the database is not answering. Check DB locks; add a query/connect timeout in the app.' }
            ], fix: 'Root cause: no timeout on a DB call. Fix: set connect/read timeouts, then restart. Take a thread dump first (jstack / py-spy dump / gdb) if you need proof.'
          },
          port: {
            sym: '"Address already in use :8080"',
            steps: [
              { tool: 'ss', cmd: "sudo ss -ltnp 'sport = :8080'", out: 'LISTEN 0 4096 0.0.0.0:8080 0.0.0.0:* users:(("java",pid=2231,fd=47))', meaning: 'Process java with PID 2231 listens on 8080. (Need sudo to see processes of other users.)' },
              { tool: 'lsof', cmd: 'sudo lsof -i :8080', out: 'java 2231 alice 47u IPv6 TCP *:8080 (LISTEN)', meaning: 'Cross-check: same PID, owned by alice. Two tools agreeing = confidence.' },
              { tool: 'ps', cmd: 'ps -fp 2231', out: 'alice 2231 1 0 09:12 ? java -jar old-build.jar', meaning: 'It is a forgotten old build started this morning (parent 1 = systemd or orphaned).' },
              { tool: 'kill', cmd: 'kill 2231   # then: kill -9 only if it ignores SIGTERM', out: '(port 8080 is free again)', meaning: 'Polite SIGTERM first. If it belongs to a service, prefer systemctl stop so it is not restarted.' }
            ], fix: 'Port freed. Also check the new app is not binding twice (reuse of the same port in config).'
          },
          cpu: {
            sym: 'Server slow, CPU at 100%',
            steps: [
              { tool: 'vmstat', cmd: 'vmstat 1 3', out: ' r  b ... us sy id wa st\n 9  0 ... 88 10  2  0  0', meaning: 'r=9 runnable on 4 CPUs, us+sy=98%: CPU-bound, not I/O-bound.' },
              { tool: 'top', cmd: 'top -b -n1 -o %CPU | head -12', out: '4242 app 20 0 3.2g 800m ... R 392.0 ... server', meaning: 'One process uses ~4 cores. Press H (or top -H -p 4242) for the hot thread.' },
              { tool: 'strace -c', cmd: 'sudo strace -c -f -p 4242  # Ctrl+C after 10 s', out: '% time seconds calls syscall\n 80.1 1.9 480000 futex', meaning: 'Mostly lock traffic (futex): heavy contention, not real work. User-space hot spots need perf/py-spy/pprof next.' },
              { tool: 'perf top', cmd: 'sudo perf top -p 4242', out: '41% libc: pthread_mutex_lock', meaning: 'The CPU burns time spinning on a mutex. Fix the lock (shard it, shorten the critical section).' }
            ], fix: 'Cause: lock contention under load. Fix the code path or reduce threads; confirm the load average falls.'
          },
          disk: {
            sym: 'Slow, load 15 but CPU idle',
            steps: [
              { tool: 'vmstat', cmd: 'vmstat 1 3', out: ' r  b ... id wa\n 1  7 ... 15 70', meaning: 'b=7 blocked, wa=70%: processes wait for disk. Not CPU.' },
              { tool: 'iostat', cmd: 'iostat -xz 1 2', out: 'Device  r/s  w/s  await  %util\nsda    90  400  180.0   99.8', meaning: 'await 180 ms and %util ~100: the disk is saturated.' },
              { tool: 'pidstat', cmd: 'pidstat -d 1 3', out: 'PID kB_rd/s kB_wr/s Command\n7788 100 52000 backup.sh', meaning: 'A backup job writes 50 MB/s and starves the app.' },
              { tool: 'lsof / df', cmd: 'df -h /var; df -i /var; lsof +L1', out: '/var 100% used ... 1 file (deleted) 12G', meaning: 'Also free space: a deleted-but-open log holds 12 GB. Restart or truncate via /proc/PID/fd.' }
            ], fix: 'Throttle the backup (ionice -c3, off-peak) and fix log rotation so deleted files are closed.'
          },
          oom: {
            sym: 'Process vanished, exit code 137',
            steps: [
              { tool: 'echo $? / status', cmd: 'systemctl status api | grep -E "status|Result"', out: 'Main process exited, code=killed, status=9/KILL', meaning: 'Killed by SIGKILL (137 = 128 + 9). Nobody ran kill -9? Suspect the OOM killer.' },
              { tool: 'dmesg', cmd: "sudo dmesg -T | grep -iE 'out of memory|killed process'", out: 'Out of memory: Killed process 4242 (java) total-vm:9GB, anon-rss:7.5GB', meaning: 'Confirmed: kernel OOM killer picked java (largest RSS).' },
              { tool: 'free / vmstat', cmd: 'free -m; vmstat 1 3', out: 'Mem: 8000 total, 150 available; si/so > 0', meaning: 'Little available memory plus swapping: real memory pressure.' },
              { tool: 'cgroup limit', cmd: 'cat /sys/fs/cgroup/system.slice/api.service/memory.max /memory.events', out: '1073741824   oom_kill 1', meaning: 'If a cgroup limit exists, oom_kill counts kills by that limit even when the host has free RAM.' }
            ], fix: 'Raise the limit or reduce heap (-Xmx), fix the leak, add memory alerts. Keep exit-137 in runbooks.'
          },
          net: {
            sym: 'Clients time out / refused',
            steps: [
              { tool: 'ss -s', cmd: 'ss -s', out: 'TCP: 48211 (estab 900, closed 46000, timewait 45800)', meaning: 'Huge TIME-WAIT count: many short connections. Maybe port exhaustion on the client side.' },
              { tool: 'ss -ltn', cmd: 'ss -ltn \'sport = :443\'', out: 'LISTEN 4097 4096 0.0.0.0:443', meaning: 'Recv-Q 4097 > backlog 4096: the accept queue is full, new connections are dropped.' },
              { tool: 'nstat', cmd: 'nstat -az TcpExtListenOverflows TcpExtListenDrops', out: 'TcpExtListenOverflows 1873', meaning: 'The kernel counted overflows: the app accepts too slowly or the backlog is too small.' },
              { tool: 'dmesg / sysctl', cmd: 'dmesg -T | grep -i conntrack; sysctl net.core.somaxconn', out: 'nf_conntrack: table full, dropping packet', meaning: 'Another classic: connection-tracking table full. Raise nf_conntrack_max or avoid tracking.' }
            ], fix: 'Raise accept/backlog and conntrack limits, speed up accept loops, use keep-alive and connection pools.'
          }
        };
        var key = String(input).trim().toLowerCase();
        if (!S[key]) throw new Error('Choose: hung | port | cpu | disk | oom | net');
        var sc = S[key], n = sc.steps.length;
        var nodes = [{ id: 'sym', label: sc.sym.length > 22 ? sc.sym.slice(0, 20) + '..' : sc.sym, x: 10, y: 12, shape: 'box', w: 17 }];
        sc.steps.forEach(function (s, i) { nodes.push({ id: 't' + i, label: s.tool, x: 10 + (i + 1) * (80 / n), y: 12, shape: 'box', w: 14 }); });
        var edges = []; for (var i = 0; i < n; i++) edges.push([i === 0 ? 'sym' : 't' + (i - 1), 't' + i]);
        function G(cur) { var hl = {}, eh = {}; hl.sym = 'done'; for (var k = 0; k < n; k++) { if (k < cur) hl['t' + k] = 'done'; } if (cur >= 0) { hl['t' + cur] = 'cur'; eh[(cur === 0 ? 'sym' : 't' + (cur - 1)) + '-t' + cur] = 'ok'; } return { type: 'graph', label: 'investigation path', directed: true, height: 26, nodes: nodes, edges: edges, hl: hl, ehl: eh }; }
        var f = [{ narr: 'Symptom: <b>' + H.esc(sc.sym) + '</b>. Do not guess - choose the cheapest tool that narrows the cause, read its output, then decide the next tool.', parts: [{ type: 'graph', label: 'investigation path', directed: true, height: 26, nodes: nodes, edges: edges, hl: { sym: 'cur' }, ehl: {} }] }];
        sc.steps.forEach(function (s, i) {
          f.push({ narr: 'Step ' + (i + 1) + ': use <b>' + H.esc(s.tool) + '</b>. ' + H.esc(s.meaning), parts: [G(i), { type: 'text', html: '<b>$ ' + H.esc(s.cmd) + '</b><br><code>' + H.esc(s.out).replace(/\n/g, '<br>') + '</code>' }] });
        });
        f.push({ narr: 'Conclusion. ' + H.esc(sc.fix), parts: [G(n - 1), { type: 'text', html: '<b>Method:</b> symptom → resource (CPU / memory / disk / network) → process → what it is doing → what the kernel says.' }] });
        return f;
      }
    },
    examples: [
      { title: 'Debug a hung process with strace', html: `<p>A worker stopped answering. <code>top</code> shows 0% CPU, so it is <i>waiting</i>, not computing. Attach strace: the last line tells what it waits for. If it is <code>read(9, </code>, translate fd 9 with <code>ls -l /proc/PID/fd/9</code> - often a socket to a slow dependency. If it is <code>futex</code>, take a thread dump to see which lock. Detach with Ctrl+C; the process keeps running (strace slows the target a lot, so don't leave it attached on prod).</p>`, code: `sudo strace -f -tt -p 4242 2>&1 | head -20
#   09:41:07.118 read(9,          <- blocked here
ls -l /proc/4242/fd/9             # lrwx------ 9 -> socket:[88123]
sudo ss -tnp | grep 4242          # which peer? 10.0.0.9:5432 (database)
cat /proc/4242/wchan; echo        # kernel function it sleeps in` },
      { title: 'Find which process holds port 8080 (and free it)', html: `<p>The server fails to start with <code>bind: Address already in use</code>. Three equivalent answers; know all because production boxes may lack one. Then decide <b>stop the owner properly</b> instead of blindly killing: it may be a systemd service that restarts, or a Docker proxy (<code>docker-proxy</code> → find the container with <code>docker ps</code>).</p>`, code: `sudo ss -ltnp | grep ':8080'
sudo lsof -iTCP:8080 -sTCP:LISTEN
sudo fuser -v 8080/tcp
ps -o pid,user,lstart,cmd -p $(sudo lsof -t -iTCP:8080 -sTCP:LISTEN)
sudo systemctl stop old-shop       # preferred over kill if it is a unit` },
      { title: 'The OOM killer story', html: `<p>"The app restarts every few hours and the log just ends." No stack trace: SIGKILL cannot be caught, so the app never logs anything. The evidence is only in the kernel log and cgroup counters. Always add <code>dmesg | grep -i oom</code> to your checklist for mysterious exits with code 137.</p>`, code: `sudo dmesg -T | grep -iE 'out of memory|oom-kill|killed process'
journalctl -k -b | grep -i oom
cat /sys/fs/cgroup/system.slice/api.service/memory.events    # oom_kill counter
cat /proc/4242/oom_score /proc/4242/oom_score_adj            # how attractive a victim is` }
    ],
    deepDive: `<p>🟣 <b>How strace works.</b> It uses <code>ptrace(2)</code> to stop the target at each syscall entry and exit and read its registers - two context switches per call, so slowdowns of 10-100x are normal and a tight loop of cheap syscalls suffers most. On production use <code>strace -c</code> briefly, or better low-overhead tracers: <code>perf trace</code>, <code>bpftrace</code>/<code>bcc</code> (e.g. <code>opensnoop</code>, <code>tcpconnect</code>, <code>biolatency</code>), <code>ltrace</code> for library calls. ptrace needs <code>CAP_SYS_PTRACE</code> or same-user plus Yama <code>ptrace_scope</code> 0/1; in Docker add <code>--cap-add SYS_PTRACE</code> (and a profile that allows ptrace). A process can be attached to by only one tracer, so a debugger blocks strace.</p>
      <p><b>Reading load and states correctly.</b> <code>top</code>'s <code>wa</code> only means "CPU idle <i>while</i> I/O is outstanding" - it can be low while processes starve. Use <code>b</code> in vmstat, D-state counts, PSI files (<code>/proc/pressure/io</code>) and <code>await</code> in iostat. <b>st</b> (steal) matters on cloud VMs: noisy neighbours or throttled burstable instances (T-series credits) show here, not in your process. <b>sy</b> high with low <b>us</b> → time in the kernel (syscalls, network stack, page faults, lock contention); <b>si</b> (softirq) high → packet-processing storm; check <code>/proc/softirqs</code> and IRQ affinity.</p>
      <p><b>Sockets vs files.</b> <code>ss</code> reads kernel netlink (fast, even with 100k sockets) while <code>netstat</code> parses <code>/proc/net/tcp</code> (slow, deprecated). <b>CLOSE_WAIT</b> piling up = <i>your</i> program received FIN but never called <code>close()</code> (a leak, fix the code). <b>TIME_WAIT</b> piling up is normal after many short connections (the closer waits 60 s); fix with keep-alive/pooling, not with dangerous tuning like <code>tcp_tw_recycle</code> (removed). Recv-Q on a LISTEN socket = current accept-queue length, Send-Q = its backlog. For established sockets <code>ss -ti</code> shows rtt, cwnd, retransmits - the first stop for "network is slow".</p>
      <p><b>lsof tricks.</b> <code>lsof -nP -i</code> (no DNS, no port names) is fast; <code>lsof +D dir</code> shows who blocks an unmount ("target is busy"); <code>lsof +L1</code> finds unlinked files; <code>lsof -c nginx -a -i</code> combines filters with <code>-a</code> (AND). <code>lsof</code> can be slow on huge trees; prefer <code>/proc/PID/fd</code> when you know the PID. <b>dmesg caveats.</b> The ring buffer is finite (old lines fall off; use <code>journalctl -k -b -1</code> for earlier boots), may need root (<code>kernel.dmesg_restrict</code>), and timestamps with <code>-T</code> can drift after suspend. Kernel messages also reveal hardware faults: <code>nvme</code> resets, <code>EXT4-fs error</code>, <code>NETDEV WATCHDOG</code>, MCE/ECC memory errors.</p>
      <p><b>Postmortem hygiene.</b> Capture evidence <i>before</i> restarting: <code>ps</code>, <code>top -b -n1</code>, <code>ss -tanp</code>, <code>lsof -p</code>, <code>/proc/PID/{status,stack,wchan}</code>, thread dumps (<code>jstack</code>, <code>py-spy dump</code>, <code>gdb -p PID -batch -ex "thread apply all bt"</code>), <code>gcore</code>. A restart fixes the symptom and destroys the proof.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Pasting a <code>vmstat</code>/<code>iostat</code> block, a strace excerpt, or <code>dmesg</code> lines into an assistant and asking "<i>what is the bottleneck and which command should I run next?</i>" is genuinely useful: models know the column meanings and common signatures (futex waits, ENOENT config paths, OOM lines). AIOps agents now run exactly these commands for you and correlate them with metrics and deploys.</p>
      <p><b>Where AI goes wrong:</b> it jumps to a favourite cause without evidence ("increase the heap"), misreads <code>%util</code> on NVMe, treats low "free" memory as a problem, or proposes <code>kill -9</code>/<code>drop_caches</code>/<code>tcp_tw_reuse</code> tweaks that mask the issue. Agents with shell access may run <code>strace -p</code> on production processes (slowing them 50x) or <code>kill</code> a PID they mis-parsed. <b>Use AI as a partner:</b> give it raw output (redact secrets and IPs), ask it for <i>ranked hypotheses with the one command that would confirm or reject each</i>. <b>What you must own:</b> the USE method, choosing low-overhead tools in production, reading outputs yourself before approving a destructive command, and capturing evidence before restarting. LLM-serving boxes add new classics: GPU memory OOM (<code>nvidia-smi</code>), pinned-memory limits, and processes stuck in D state on network file systems holding model weights.</p>`,
    problems: [
      P({
        t: 'Which process holds port 8080 and how do you free it?', l: 'Easy', tags: ['ss', 'lsof', 'ports', 'debugging'], co: ['Amazon', 'Uber', 'Flipkart'],
        s: `<p>Your service fails at start-up with <code>listen tcp :8080: bind: address already in use</code>. Using only standard Linux tools, find which process (PID, user and command line) is listening on TCP port 8080, explain how to be sure it is a listener (not just a client connected to port 8080), and how to stop it safely - including the case where it is a systemd service that keeps coming back.</p>`,
        ex: `<p>Output of <code>sudo ss -ltnp 'sport = :8080'</code>:</p><pre>LISTEN 0 4096 0.0.0.0:8080 0.0.0.0:* users:(("java",pid=2231,fd=47))</pre><p>PID <b>2231</b>, command <b>java</b>. <code>ps -fp 2231</code> shows the owner and arguments.</p>`,
        bw: `<p>Trying random ports, rebooting the machine, or running <code>pkill -9 java</code> - which also kills unrelated Java programs and does not tell you why the old process existed. If systemd restarts it, you "fix" nothing.</p>`,
        bc: `pkill -9 java      # kills EVERY java process on the box, including the wrong ones`,
        q: ['Why does "ss -ltnp" need sudo to show the process column for every socket?', ['Process info of other users\' sockets is protected', 'ss only works as root', 'It would show UDP instead', 'It needs the network to be up'], 0, 'The kernel reveals the owning PID only for sockets of processes you may inspect. As a normal user you see your own processes; use sudo to see all.'],
        h: ['<p>Hint 1: a listening socket is state LISTEN. <code>ss -l</code> lists listening sockets, <code>-t</code> TCP, <code>-n</code> numeric, <code>-p</code> shows the process.</p>', '<p>Hint 2: filter with <code>\'sport = :8080\'</code> or <code>grep :8080</code>. Cross-check with <code>lsof -i :8080 -sTCP:LISTEN</code> or <code>fuser -v 8080/tcp</code>.</p>', '<p>Hint 3: once you have the PID run <code>ps -fp PID</code> and <code>systemctl status PID</code>. If it is a unit, stop the unit; otherwise <code>kill PID</code> (SIGTERM) and verify with <code>ss</code> again.</p>'],
        a: `<p>Run <code>sudo ss -ltnp 'sport = :8080'</code>. The LISTEN row's <code>users:((name,pid=...))</code> field gives the process; confirm with <code>sudo lsof -iTCP:8080 -sTCP:LISTEN</code> (the <code>-sTCP:LISTEN</code> filter excludes mere clients). Inspect it using <code>ps -fp PID</code> (user, start time, arguments) and <code>systemctl status PID</code> (which unit owns it, via cgroup). If it is a service, stop it properly with <code>sudo systemctl stop name</code> (and disable it if it should never run) so it does not respawn; otherwise send SIGTERM with <code>kill PID</code>, wait, and use SIGKILL only if it ignores TERM. Verify the port is free with <code>ss -ltn | grep 8080</code>. If a container publishes the port, <code>docker ps</code> shows it and the owner is docker-proxy.</p>`,
        code: `sudo ss -ltnp 'sport = :8080'
sudo lsof -iTCP:8080 -sTCP:LISTEN
PID=$(sudo lsof -t -iTCP:8080 -sTCP:LISTEN | head -1)
ps -fp "$PID"
systemctl status "$PID" --no-pager | head -3     # which unit owns it?
sudo kill "$PID"                                  # polite; escalate only if needed
sleep 2; ss -ltn | grep ':8080' || echo "port 8080 is free"`,
        cx: `<p>O(1) commands; the skill is knowing LISTEN vs ESTABLISHED and the TERM-before-KILL order.</p>`,
        f: ['What if the port is held by a process in another network namespace (container)?', 'What does it mean when ss shows the port in TIME-WAIT but no process?']
      }),
      P({
        t: 'Debug a hung process with strace', l: 'Medium', tags: ['strace', 'hang', 'debugging', 'proc'], co: ['Google', 'Meta', 'Databricks'],
        s: `<p>A batch worker (PID 4242) has printed nothing for 20 minutes and uses 0% CPU. Describe, step by step, how you determine <i>what it is waiting for</i> without restarting it, which output lines mean "waiting for a lock", "waiting for the network" and "idle", how you identify the peer it waits on, and what you collect before deciding to kill it.</p>`,
        ex: `<p><code>sudo strace -f -p 4242</code> prints <code>read(9, </code> and nothing more. <code>ls -l /proc/4242/fd/9</code> → <code>socket:[88123]</code>; <code>ss -tnp</code> shows the socket connected to <code>10.0.0.9:5432</code>. Conclusion: it waits for the database.</p>`,
        bw: `<p>Kill it and restart, hoping it works. You lose the evidence, the bug returns, and half-processed work may be corrupted. Adding print statements and redeploying is the slow version of the same guess.</p>`,
        bc: `kill -9 4242 && ./worker &     # symptom hidden, cause unknown`,
        q: ['A process shows 0% CPU and its last syscall is futex(..., FUTEX_WAIT, ...). What is most likely?', ['It is waiting on a lock/condition held by another thread', 'It is reading from the disk', 'It is computing a hash', 'It has crashed'], 0, 'futex WAIT blocks until another thread wakes it. A permanent wait with no progress suggests a deadlock or a lost wake-up; take thread dumps to see who holds the lock.'],
        h: ['<p>Hint 1: 0% CPU means it is waiting, not working. Find out <i>for what</i>: ask the kernel with <code>ps -o stat,wchan</code> and with <code>strace -p</code>.</p>', '<p>Hint 2: interpret the last syscall: <code>read/recvfrom/poll</code> = waiting for I/O on some fd, <code>connect</code> = waiting for a peer, <code>futex</code> = lock, <code>epoll_wait</code> = idle loop, <code>wait4</code> = waiting for a child.</p>', '<p>Hint 3: map the fd to a thing with <code>ls -l /proc/PID/fd/N</code> and <code>ss -tnp</code>/<code>lsof -p PID</code>. Collect thread dumps and <code>/proc/PID/stack</code> before killing; then use TERM before KILL.</p>'],
        a: `<p>First confirm it is waiting: <code>ps -o pid,stat,wchan:30 -p 4242</code> and <code>top -H -p 4242</code> (all threads sleeping, no CPU). Attach <code>sudo strace -f -tt -p 4242</code> (-f for all threads). Read the last call: a <code>read</code>/<code>recvfrom</code>/<code>poll</code> on an fd means waiting on I/O; <code>connect</code> means waiting to reach a peer; <code>futex(... FUTEX_WAIT ...)</code> means waiting for a lock or condition; <code>epoll_wait</code> with no events is an idle event loop. Translate the fd with <code>ls -l /proc/4242/fd/N</code>; if it is a socket, use <code>ss -tnop</code> or <code>lsof -p 4242 -i</code> to find the remote address and port, which names the dependency (database, queue, API). Before killing, capture evidence: strace excerpt, thread dump (<code>py-spy dump</code>, <code>jstack</code>, or <code>gdb -batch -ex 'thread apply all bt'</code>), <code>/proc/4242/status</code>, and logs of the peer. Then stop with SIGTERM, and SIGKILL only if it ignores it. Fix the root cause by adding timeouts and retries.</p>`,
        code: `ps -o pid,stat,wchan:30,cmd -p 4242          # state + kernel wait function
sudo strace -f -tt -T -p 4242 2>&1 | head -30   # Ctrl+C detaches; process keeps running
ls -l /proc/4242/fd/9                          # what is fd 9? -> socket:[88123]
sudo ss -tnop | grep 4242                      # peer address of that socket
sudo cat /proc/4242/stack                      # kernel stack (root), shows where in the kernel
kill -TERM 4242; sleep 10; kill -0 4242 2>/dev/null && kill -KILL 4242`,
        cx: `<p>O(1) investigation with low overhead if you detach quickly; strace slows the target while attached.</p>`,
        f: ['How would you do this inside a container without SYS_PTRACE?', 'What can you learn from /proc/PID/stack and wchan without strace?']
      })
    ]
  });
  // ───────────────────────── Practice problems (Easy → Medium → Hard) ─────────────────────────
  practice.push(P({
    t: 'Octal to rwx and back, with umask', l: 'Easy', tags: ['chmod', 'umask', 'permissions'], co: ['Cisco', 'Oracle'],
    s: `<p>(a) Convert <b>640</b>, <b>755</b> and <b>4755</b> to <code>ls -l</code> notation. (b) Convert <code>rw-r-----</code> and <code>rwxrwxrwt</code> to octal. (c) With <code>umask 027</code>, what mode does a newly created <i>file</i> get, and a new <i>directory</i>?</p>`,
    ex: `<p>(a) 640 → <code>rw-r-----</code>; 755 → <code>rwxr-xr-x</code>; 4755 → <code>rwsr-xr-x</code> (setuid). (b) <b>640</b>; <b>1777</b>. (c) file 666 &amp; ~027 = <b>640</b>; directory 777 &amp; ~027 = <b>750</b>.</p>`,
    bw: `<p>Memorising a table of common modes. It fails the moment a question uses an unusual number such as 2750 or asks what a umask produces.</p>`,
    q: ['What is rwxr-x--- in octal?', ['750', '705', '570', '755'], 0, 'rwx=7, r-x=5, ---=0, so 750.'],
    h: ['<p>Hint 1: each triple is r=4, w=2, x=1; add the values of the letters that are present.</p>', '<p>Hint 2: the optional fourth leading digit is setuid 4, setgid 2, sticky 1 and shows as s, s or t in the x position of owner, group or other.</p>', '<p>Hint 3: for umask, take the base (666 for files, 777 for directories) and clear every bit that is set in the umask: base AND NOT umask.</p>'],
    a: `<p>Work per triple. 640: owner 6 = rw-, group 4 = r--, other 0 = --- giving rw-r-----. 755 is rwxr-xr-x. 4755 adds setuid, which turns the owner's x into s: rwsr-xr-x. In reverse, rw-r----- is 4+2, 4, 0 = 640, and rwxrwxrwt is 777 plus the sticky bit (t in the last slot, so the leading 1) = 1777. With umask 027 the mask clears nothing from owner, w from group, and everything from other. A file starts at 666, so 666 minus those bits = 640; a directory starts at 777, giving 750. You can verify on any box with <code>umask 027; touch f; mkdir d; stat -c '%a %n' f d</code> and run the Python converter from the topic for a self-check.</p>`,
    code: `umask 027; touch f; mkdir d
stat -c '%a %A %n' f d          # 640 -rw-r----- f   and   750 drwxr-x--- d
chmod 4755 prog && ls -l prog   # -rwsr-xr-x`,
    cx: `<p>O(1). Pure arithmetic on 3-bit groups.</p>`,
    f: ['Why can a new regular file never start out executable?', 'How does the default ACL (setfacl -d) interact with umask?']
  }));

  practice.push(P({
    t: 'Count distinct values in a CSV column', l: 'Easy', tags: ['cut', 'sort', 'uniq', 'wc'], co: ['Walmart', 'Infosys'],
    s: `<p><code>orders.csv</code> has a header row and columns <code>id,customer,country,amount</code>. Using only standard shell tools, print (1) the number of data rows, (2) the number of distinct countries, and (3) each country with the number of orders, most frequent first. Assume no commas inside fields.</p>`,
    ex: `<pre>id,customer,country,amount
1,asha,IN,120
2,ben,US,80
3,chi,IN,40</pre><p>(1) <b>3</b> rows, (2) <b>2</b> countries, (3) <code>2 IN</code> then <code>1 US</code>.</p>`,
    bw: `<p>Open the file in a spreadsheet and use a pivot table, or loop in bash calling <code>grep -c</code> per country - works but does not scale to 10 GB files or to automation.</p>`,
    bc: `for c in IN US; do echo "$c $(grep -c ",$c," orders.csv)"; done    # you must already know the countries`,
    q: ['Which command prints distinct values of column 3?', ['cut -d, -f3 file | sort -u', 'cut -d, -f3 file | uniq', 'sort file | cut -f3', 'uniq -d file'], 0, 'uniq alone only removes adjacent duplicates, so values must be sorted first; sort -u does both steps in one.'],
    h: ['<p>Hint 1: skip the header with <code>tail -n +2</code> before counting rows.</p>', '<p>Hint 2: extract the column with <code>cut -d, -f3</code>; <code>sort -u | wc -l</code> counts distinct values.</p>', '<p>Hint 3: frequencies are <code>sort | uniq -c | sort -nr</code>. In awk: <code>awk -F, \'NR&gt;1 {c[$3]++} END {for (k in c) print c[k], k}\'</code>.</p>'],
    a: `<p>Strip the header with <code>tail -n +2</code> so it is not counted as data. Rows: <code>tail -n +2 orders.csv | wc -l</code>. Distinct countries: <code>tail -n +2 orders.csv | cut -d, -f3 | sort -u | wc -l</code>. Frequency table: extract the column, <code>sort</code> so equal values become neighbours, <code>uniq -c</code> to count each run, then <code>sort -nr</code> to put the most frequent first. For a single pass without sorting everything, use awk with an associative array keyed by country. If fields can contain quoted commas, cut and awk -F, are wrong and you need a CSV-aware tool (csvkit, Python csv, DuckDB).</p>`,
    code: `tail -n +2 orders.csv | wc -l
tail -n +2 orders.csv | cut -d, -f3 | sort -u | wc -l
tail -n +2 orders.csv | cut -d, -f3 | sort | uniq -c | sort -nr`,
    cx: `<p>O(n log n) with sort, O(n) with the awk hash map.</p>`,
    f: ['How would you handle quoted commas?', 'How would you compute revenue per country?']
  }));

  practice.push(P({
    t: 'Stop a process politely, then forcefully', l: 'Easy', tags: ['kill', 'signals', 'pgrep'], co: ['Amazon', 'IBM'],
    s: `<p>A service named <code>report-worker</code> must be stopped. Write the safest shell sequence: find it by name (without matching your own grep), send SIGTERM, wait up to 10 seconds, and only if it is still running send SIGKILL. Also explain why <code>kill -9</code> as the first step is risky.</p>`,
    ex: `<p><code>pgrep -f report-worker</code> prints <code>5120</code>. <code>kill 5120</code>; 3 seconds later <code>kill -0 5120</code> fails (process gone), so no SIGKILL is sent.</p>`,
    bw: `<p><code>ps aux | grep report-worker | awk '{print $2}' | xargs kill -9</code>: the grep matches itself, kill -9 skips cleanup so temp files and locks remain, and you may kill an unrelated process with a similar name.</p>`,
    bc: `ps aux | grep report-worker | awk '{print $2}' | xargs kill -9`,
    q: ['What does kill -0 PID do?', ['Checks whether the process exists and can be signalled, without sending a signal', 'Kills the process silently', 'Sends SIGHUP', 'Resets the process priority'], 0, 'Signal 0 performs the existence and permission checks only, which makes it the idiom for "is it still alive?".'],
    h: ['<p>Hint 1: <code>pgrep</code> finds PIDs by name without the self-match problem of <code>ps | grep</code>.</p>', '<p>Hint 2: send <code>kill -TERM</code> (the default of plain kill), then poll with <code>kill -0</code> in a loop for 10 seconds.</p>', '<p>Hint 3: if the loop ends and the process is still alive, send <code>kill -KILL</code>. Prefer <code>systemctl stop</code> if it is a unit - systemd implements exactly this ladder.</p>'],
    a: `<p>Use <code>pgrep -f report-worker</code> (exact match with <code>-x</code> when you know the process name) to get the PID. Send SIGTERM so the worker can finish its current job, flush buffers and remove lock files. Poll once per second with <code>kill -0 "$pid"</code> for up to 10 iterations. If the process is still alive afterwards, escalate with <code>kill -KILL "$pid"</code>. SIGKILL cannot be caught, so cleanup code never runs: partial files, stale locks, half-committed work and orphaned children can remain, which is why it is the last resort. If the process is managed by systemd, use <code>systemctl stop</code>, which sends TERM, waits TimeoutStopSec and then KILLs the entire cgroup.</p>`,
    code: `pid=$(pgrep -f -o report-worker) || { echo "not running"; exit 0; }
kill -TERM "$pid"
for i in $(seq 1 10); do
  kill -0 "$pid" 2>/dev/null || { echo "stopped after $i s"; exit 0; }
  sleep 1
done
echo "still alive, forcing"
kill -KILL "$pid"`,
    cx: `<p>O(1) work; bounded by the 10-second grace period.</p>`,
    f: ['How would you kill the whole process group?', 'What if the PID was reused between the checks?']
  }));

  practice.push(P({
    t: 'Silence a cron job but keep failures', l: 'Easy', tags: ['redirection', 'cron', 'stderr'], co: ['Adobe', 'Zoho'],
    s: `<p>A nightly cron entry <code>/opt/sync.sh</code> mails a huge output every day. Rewrite it so normal output is discarded, errors are appended to <code>/var/log/sync.err</code> with a timestamp line, and the job never mails anyone. Explain each redirection.</p>`,
    ex: `<p><code>0 3 * * * /opt/sync.sh &gt;/dev/null 2&gt;&gt;/var/log/sync.err</code>: stdout goes to the void, stderr is appended to the error log. Add <code>MAILTO=""</code> at the top of the crontab to stop mail.</p>`,
    bw: `<p><code>&gt; /dev/null 2&gt;&amp;1</code> makes the job silent but also hides failures completely: when sync breaks nobody finds out for weeks.</p>`,
    bc: `0 3 * * * /opt/sync.sh > /dev/null 2>&1     # silent, but also blind`,
    q: ['In "cmd >/dev/null 2>>err.log", where does stderr go?', ['Appended to err.log', 'To /dev/null', 'To the terminal', 'To stdout'], 0, '2>> targets fd 2 only, in append mode. The earlier >/dev/null only changed fd 1.'],
    h: ['<p>Hint 1: stdout is fd 1 and stderr is fd 2; they can go to different places.</p>', '<p>Hint 2: <code>&gt;/dev/null</code> handles stdout; <code>2&gt;&gt;file</code> appends stderr.</p>', '<p>Hint 3: to add a timestamp, wrap the command in a small script or use <code>|| echo "$(date) sync failed" &gt;&gt; file</code> to record the failure exit status as well.</p>'],
    a: `<p>Redirect each stream independently: <code>&gt;/dev/null</code> discards stdout (fd 1), and <code>2&gt;&gt;/var/log/sync.err</code> appends anything written to stderr (fd 2). Because the shell evaluates redirections left to right and the two target different descriptors, their order does not matter here. Set <code>MAILTO=""</code> at the top of the crontab so cron does not mail even if something slips through. For real monitoring add <code>|| echo "$(date -Is) sync failed rc=$?" &gt;&gt;/var/log/sync.err</code> so a non-zero exit status is logged even when the script printed nothing to stderr, and alert on that file or use a systemd timer so the journal keeps everything.</p>`,
    code: `MAILTO=""
0 3 * * * /opt/sync.sh >/dev/null 2>>/var/log/sync.err || echo "$(date -Is) sync failed rc=$?" >>/var/log/sync.err`,
    cx: `<p>O(1). Correctness depends only on which fd is redirected where.</p>`,
    f: ['Why is a systemd timer easier to monitor than cron?', 'How would you rotate /var/log/sync.err?']
  }));

  practice.push(P({
    t: 'Show output live and save it, with the right exit code', l: 'Medium', tags: ['tee', 'pipefail', 'redirection'], co: ['Atlassian', 'Stripe'],
    s: `<p>A CI step runs <code>./build.sh</code>. You want stdout and stderr both printed live <b>and</b> saved to <code>build.log</code>, but the CI step must still <b>fail</b> when <code>build.sh</code> fails. Show the command and explain why the naive version reports success.</p>`,
    ex: `<p><code>./build.sh 2&gt;&amp;1 | tee build.log</code> exits with the status of <code>tee</code> (0) even if the build failed. With <code>set -o pipefail</code> the pipeline returns the first non-zero status, so CI turns red.</p>`,
    bw: `<p>Run the build twice (once to see, once to save) or check <code>build.log</code> for the word "error". Doubling the work and parsing text are both slow and unreliable.</p>`,
    bc: `./build.sh > build.log 2>&1; cat build.log     # no live output, and exit code is easy to lose`,
    q: ['Why does "cmd | tee log" return 0 when cmd fails?', ['A pipeline returns the status of its last command', 'tee swallows signals', 'cmd never ran', 'tee runs first'], 0, 'By default the exit status of a pipeline is that of the last stage. pipefail (or PIPESTATUS) exposes earlier failures.'],
    h: ['<p>Hint 1: <code>tee</code> copies stdin to stdout and to a file - exactly "show and save".</p>', '<p>Hint 2: merge stderr into the pipe first: <code>cmd 2&gt;&amp;1 | tee file</code> (stdout is the pipe at that moment).</p>', '<p>Hint 3: fix the exit status with <code>set -o pipefail</code> or read the first element of <code>PIPESTATUS</code> right after the pipeline (bash only).</p>'],
    a: `<p>Use <code>set -o pipefail; ./build.sh 2&gt;&amp;1 | tee build.log</code>. The <code>2&gt;&amp;1</code> comes before the pipe so both streams enter the pipe; tee prints them live and writes the file. Without pipefail the pipeline status is tee's, which is almost always 0, so a failed build looks green. With pipefail the status is the rightmost non-zero status, which is the build's. Alternatively keep the default and check <code>PIPESTATUS[0]</code> immediately after the pipeline. Remember that stdout becomes block-buffered when it is a pipe, so a program that does not flush may show output in bursts; use <code>stdbuf -oL</code> or the program's unbuffered flag for live logs.</p>`,
    code: `set -o pipefail
./build.sh 2>&1 | tee build.log
echo "build exit code: $?"          # non-zero if build.sh failed`,
    cx: `<p>O(output size); tee copies each byte once more.</p>`,
    f: ['What changes with process substitution: ./build.sh > >(tee build.log) 2>&1 ?', 'How do you append instead of overwrite?']
  }));

  practice.push(P({
    t: 'Archive old logs, verify, then delete', l: 'Medium', tags: ['find', 'tar', 'xargs', 'cleanup'], co: ['Dropbox', 'Salesforce'],
    s: `<p>Create one compressed archive <code>logs-YYYY-MM-DD.tgz</code> containing all <code>*.log</code> files in <code>/var/log/app</code> older than 14 days, verify the archive is readable, and only then delete exactly the archived files. Names may contain spaces.</p>`,
    ex: `<p>Candidates: <code>old one.log</code> (20 days), <code>b.log</code> (15 days), <code>today.log</code> (0 days). Archive contains the first two; after verification only <code>today.log</code> remains.</p>`,
    bw: `<p>Run <code>find ... | xargs tar czf</code> then <code>find ... -delete</code> separately: if new files cross the 14-day threshold between the two commands you delete files that were never archived, and xargs may split into several tar runs that overwrite each other.</p>`,
    bc: `find /var/log/app -name '*.log' -mtime +14 | xargs tar czf logs.tgz
find /var/log/app -name '*.log' -mtime +14 -delete    # list may have changed in between!`,
    q: ['Why save the file list first?', ['So the delete step removes exactly what was archived', 'tar needs a list file', 'find cannot delete', 'To speed up gzip'], 0, 'Running find twice can return different sets. A single saved list makes archive and delete operate on the same files.'],
    h: ['<p>Hint 1: generate the list once into a temp file with NUL separators: <code>find ... -print0 &gt; list</code>.</p>', '<p>Hint 2: <code>tar --null -T list -czf archive</code> reads the names from that list (safe for spaces).</p>', '<p>Hint 3: verify with <code>tar tzf archive &gt;/dev/null</code> (exit code 0 = readable) and delete with <code>xargs -0 rm -f &lt; list</code> only if the check passed.</p>'],
    a: `<p>Do it in three controlled steps using one saved, NUL-delimited file list. (1) <code>find /var/log/app -type f -name '*.log' -mtime +14 -print0 &gt; /tmp/list</code>. (2) <code>tar --null -T /tmp/list -czf logs-$(date +%F).tgz</code> and verify with <code>tar tzf logs-*.tgz &gt; /dev/null</code>; also compare counts with <code>tr -cd '\\0' &lt; /tmp/list | wc -c</code>. (3) Only if both succeed, <code>xargs -0 -r rm -f &lt; /tmp/list</code>. Using one list guarantees that exactly the archived files are deleted even if other files age past 14 days in the meantime, and the NUL separators make names with spaces or newlines safe. Chain the steps with <code>&amp;&amp;</code> or <code>set -e</code> so a failed archive never reaches the delete.</p>`,
    code: `set -euo pipefail
LIST=$(mktemp)
find /var/log/app -type f -name '*.log' -mtime +14 -print0 > "$LIST"
ARCH="logs-$(date +%F).tgz"
tar --null -T "$LIST" -czf "$ARCH"
tar tzf "$ARCH" > /dev/null          # verify it can be read back
xargs -0 -r rm -f < "$LIST"          # delete exactly what was archived
rm -f "$LIST"`,
    cx: `<p>O(files + bytes). One tree walk, one compression pass.</p>`,
    f: ['What if tar is interrupted halfway?', 'How would you store the archive off-box before deleting?']
  }));

  practice.push(P({
    t: 'Shared team directory with setgid, sticky bit and an ACL', l: 'Medium', tags: ['permissions', 'setgid', 'sticky', 'acl'], co: ['Red Hat', 'SUSE'],
    s: `<p>Create <code>/srv/teamdata</code> for group <code>analytics</code>. Requirements: members read and write; files created inside automatically belong to group <code>analytics</code>; members cannot delete each other's files; user <code>audit</code> (not in the group) may only read; everyone else has no access. Give the commands and the resulting <code>ls -ld</code>.</p>`,
    ex: `<p><code>ls -ld /srv/teamdata</code> → <code>drwxrws--T+ 2 root analytics ...</code>. The <code>s</code> is setgid, <code>T</code> is sticky without other-x, <code>+</code> means an ACL exists. <code>getfacl</code> lists <code>user:audit:r-x</code>.</p>`,
    bw: `<p><code>chmod 777 /srv/teamdata</code>: everybody including unrelated users can read, write and delete anything; files get random primary groups so teammates can't edit each other's work.</p>`,
    bc: `chmod -R 777 /srv/teamdata`,
    q: ['What does setgid on a directory do?', ['New files inherit the directory\'s group', 'Files become executable', 'Only owners can delete files', 'It hides the directory'], 0, 'On directories setgid makes new files and subdirectories inherit the directory\'s group (and subdirectories inherit setgid itself). Sticky bit is what restricts deletion.'],
    h: ['<p>Hint 1: set owner/group first: <code>chgrp analytics</code>; then base mode for group access and no access for others.</p>', '<p>Hint 2: the special leading digit is setgid 2 + sticky 1 = 3, so <code>chmod 3770</code>.</p>', '<p>Hint 3: a read-only extra person who is not in the group needs an ACL: <code>setfacl -m u:audit:rx dir</code> and a default ACL (<code>-d</code>) so new files also grant audit read access.</p>'],
    a: `<p>Run <code>sudo mkdir /srv/teamdata; sudo chgrp analytics /srv/teamdata; sudo chmod 3770 /srv/teamdata</code>. The 7 gives the group rwx, 0 closes the door for others, the setgid bit (2) makes new files belong to analytics, and the sticky bit (1) restricts deletion and rename to the file owner, directory owner or root. For the auditor use ACLs because plain permissions cannot express "one more user, read only": <code>sudo setfacl -m u:audit:rx /srv/teamdata</code> and <code>sudo setfacl -d -m u:audit:rX /srv/teamdata</code> for future files. Also set <code>umask 007</code> or 002 for team members so their new files are group writable. Check with <code>ls -ld</code>, <code>getfacl</code> and by testing as another member with <code>sudo -u bob touch</code> and <code>rm</code>.</p>`,
    code: `sudo mkdir -p /srv/teamdata
sudo chgrp analytics /srv/teamdata
sudo chmod 3770 /srv/teamdata
sudo setfacl -m  u:audit:rx  /srv/teamdata     # existing directory
sudo setfacl -d -m u:audit:rX /srv/teamdata    # default for new files
ls -ld /srv/teamdata; getfacl /srv/teamdata`,
    cx: `<p>O(1) commands; effort is in verifying with a second user.</p>`,
    f: ['Why does the ACL mask change the displayed group bits?', 'How does umask 002 vs 022 affect team editing?']
  }));

  practice.push(P({
    t: 'Disk is full but du shows little: reclaim space', l: 'Medium', tags: ['lsof', 'df', 'proc', 'fd'], co: ['Netflix', 'Shopify'],
    s: `<p><code>df -h /var</code> says 100% used but <code>du -sh /var</code> shows only 30% of the size. Find the cause, identify the process, and free the space <b>without restarting</b> the service. Also check the other classic reason for a "full" disk.</p>`,
    ex: `<p><code>lsof +L1</code> shows <code>java 2231 ... /var/log/app.log (deleted) 12G</code>. Truncating through <code>/proc/2231/fd/7</code> releases 12 GB immediately.</p>`,
    bw: `<p>Reboot or restart the service to get the space back. That causes downtime, loses the evidence, and the next log rotation repeats the incident because nobody fixed it.</p>`,
    bc: `systemctl restart app      # space returns, but only until the next rotation`,
    q: ['Why doesn\'t rm give the space back here?', ['A process still holds the file open, so the inode is not freed', 'rm only hides files', 'The filesystem is read-only', 'The journal is full'], 0, 'Space is freed only when the last name AND the last open file descriptor of the inode are gone.'],
    h: ['<p>Hint 1: du walks names; df asks the filesystem about used blocks. Files with no name but still open are counted only by df.</p>', '<p>Hint 2: <code>lsof +L1</code> lists open files with link count below 1 (deleted); <code>/proc/PID/fd</code> shows the same with "(deleted)".</p>', '<p>Hint 3: truncate via the fd: <code>: &gt; /proc/PID/fd/N</code> (or <code>truncate -s 0</code>). Also check inodes with <code>df -i</code>, and fix logrotate to use copytruncate or send the app a reopen signal.</p>'],
    a: `<p>The gap between df and du means space is held by deleted-but-open files. Find them with <code>sudo lsof +L1</code> or <code>sudo ls -l /proc/*/fd 2&gt;/dev/null | grep deleted</code>; note the PID and fd number. Reclaim space without a restart by truncating through the descriptor: <code>sudo sh -c ': &gt; /proc/2231/fd/7'</code>, which empties the inode; the space is freed at once and the process keeps writing to the (now small) file. Then fix the root cause: configure logrotate with <code>copytruncate</code>, or <code>postrotate</code> that sends the daemon SIGHUP/USR1 so it reopens its log, or ship logs to the journal. Also rule out inode exhaustion (<code>df -i</code>), mount points hiding data underneath (<code>mount --bind / /mnt/x; du /mnt/x</code>) and reserved blocks.</p>`,
    code: `df -h /var; du -xsh /var                 # mismatch => deleted-but-open files
sudo lsof +L1 | head                     # who holds deleted files, and their size
ls -l /proc/2231/fd | grep deleted
sudo sh -c ': > /proc/2231/fd/7'         # truncate the deleted file in place
df -h /var                               # space is back
df -i /var                               # also check inodes`,
    cx: `<p>O(1) investigation. No downtime if you truncate instead of restart.</p>`,
    f: ['What other cause makes df and du differ? (mounts over a populated directory)', 'How does logrotate copytruncate lose data?']
  }));

  practice.push(P({
    t: 'Swap stdout and stderr, and pipe only the errors', l: 'Medium', tags: ['file descriptors', 'redirection', 'pipes'], co: ['Google', 'Arista'],
    s: `<p>Given a program <code>app</code> that writes results to stdout and diagnostics to stderr: (a) run it so that only its <b>stderr</b> is piped into <code>grep -c WARN</code> while stdout still goes to the terminal; (b) run it with stdout and stderr <b>swapped</b>.</p>`,
    ex: `<p>(a) <code>app 3&gt;&amp;1 1&gt;&amp;2 2&gt;&amp;3 3&gt;&amp;- | grep -c WARN</code> - the classic swap, then pipe. Or send stdout elsewhere: <code>app 2&gt;&amp;1 &gt;/dev/null | grep -c WARN</code> if you don't need stdout. (b) the same swap without the pipe.</p>`,
    bw: `<p>Redirect stderr to a temp file and then grep the file: extra disk I/O, the file can fill the disk, and live processing is impossible.</p>`,
    bc: `app 2> /tmp/err.txt; grep -c WARN /tmp/err.txt`,
    q: ['In "cmd 3>&1 1>&2 2>&3", what is fd 3 used for?', ['A temporary holder of the original stdout while 1 and 2 are swapped', 'A new log file', 'The keyboard', 'Nothing'], 0, 'fd 3 saves where stdout points, then 1 takes the stderr target and 2 takes the saved stdout target - a swap using a temporary variable.'],
    h: ['<p>Hint 1: swapping two variables needs a temporary. File descriptors are the same: use fd 3 as the temporary.</p>', '<p>Hint 2: apply left to right: <code>3&gt;&amp;1</code> (save stdout), <code>1&gt;&amp;2</code> (stdout now goes where stderr goes), <code>2&gt;&amp;3</code> (stderr goes to the saved stdout).</p>', '<p>Hint 3: when a pipe follows, the pipe is already fd 1 before redirections run, so <code>cmd 2&gt;&amp;1 &gt;/dev/null | grep</code> sends only stderr into the pipe.</p>'],
    a: `<p>A swap of two descriptors needs a temporary, so use fd 3. <code>app 3&gt;&amp;1 1&gt;&amp;2 2&gt;&amp;3 3&gt;&amp;-</code> evaluates left to right: fd 3 becomes a copy of stdout (the terminal, or the pipe when one follows); fd 1 becomes a copy of fd 2; fd 2 becomes a copy of fd 3, which is the original stdout; finally fd 3 is closed. When the command is followed by a pipe, the original stdout is the pipe, so after the swap the pipe carries stderr and the terminal receives stdout, which answers (a): <code>app 3&gt;&amp;1 1&gt;&amp;2 2&gt;&amp;3 3&gt;&amp;- | grep -c WARN</code>. For (b) just omit the pipe. If stdout isn't needed at all, the shorter <code>app 2&gt;&amp;1 &gt;/dev/null | grep -c WARN</code> works: 2 copies the pipe first, then 1 is pointed at /dev/null. Remember that stderr is unbuffered but stdout may be block-buffered, so ordering between streams is not guaranteed.</p>`,
    code: `app 3>&1 1>&2 2>&3 3>&- | grep -c WARN     # stderr -> pipe, stdout -> terminal
app 3>&1 1>&2 2>&3 3>&-                    # plain swap
app 2>&1 >/dev/null | grep -c WARN         # only stderr, stdout discarded`,
    cx: `<p>O(1). Pure descriptor bookkeeping, evaluated left to right.</p>`,
    f: ['What does bash process substitution 2> >(grep WARN) do differently?', 'How do you do this in a systemd unit? (StandardError=)']
  }));

  practice.push(P({
    t: 'Per-minute request rate and 5xx rate with awk', l: 'Medium', tags: ['awk', 'logs', 'sort'], co: ['Cloudflare', 'Datadog'],
    s: `<p>From an nginx access log (<code>$4</code> = <code>[10/Oct/2026:13:55:01</code>, <code>$9</code> = status, <code>$7</code> = URL), print (1) requests per minute for the last 5 minutes present in the log and (2) the 5 URLs with the highest 5xx error <b>ratio</b> among URLs with at least 20 requests.</p>`,
    ex: `<p>(1) <code>13:55 412</code>, <code>13:56 398</code> ... (2) <code>/api/checkout 0.18</code>, <code>/api/cart 0.07</code>: the ratio is errors / total for that URL, filtered by volume so one-off 500s don't dominate.</p>`,
    bw: `<p>Run <code>grep</code> once per minute and per URL in a shell loop: hundreds of full-file scans. Or load into a spreadsheet: breaks at millions of lines.</p>`,
    bc: `for m in 13:55 13:56 13:57; do echo "$m $(grep -c "2026:$m" access.log)"; done`,
    q: ['Why filter by minimum request count before ranking error ratios?', ['A URL with 1 request and 1 error has ratio 100% but is statistically meaningless', 'awk cannot divide small numbers', 'It makes sort faster', 'It is required by nginx'], 0, 'Small samples produce extreme ratios. A volume threshold keeps the ranking meaningful.'],
    h: ['<p>Hint 1: use substrings of the timestamp field as keys: <code>substr($4, 2, 17)</code> gives minute resolution when you cut the seconds.</p>', '<p>Hint 2: keep two associative arrays keyed by URL: total[$7]++ and err[$7]++ if $9 &gt;= 500.</p>', '<p>Hint 3: print in END, filter total &gt;= 20, compute err/total, then <code>sort -k2 -nr | head -5</code>. For the per-minute part pipe through <code>sort | uniq -c | tail -5</code>.</p>'],
    a: `<p>(1) Extract the minute: <code>awk '{print substr($4, 2, 14)}' access.log | sort | uniq -c | tail -5</code> (field 4 starts with a bracket; characters 2 to 15 give <code>10/Oct/2026:13:55</code>). Because log lines are chronological you can also avoid the sort and count with an array in awk. (2) One awk pass with two associative arrays: <code>total[$7]++</code> for every line and <code>err[$7]++</code> when <code>$9 &gt;= 500</code>. In the END block print URL, total and err/total for URLs with total at least 20, then <code>sort -k3 -nr | head -5</code>. The whole thing is O(n) in time and O(distinct URLs) in memory, with one read of the file. Mention the caveat that query strings create many distinct URLs, so normalise with <code>sub(/\\?.*/, "", $7)</code> first.</p>`,
    code: `# (1) requests per minute, last 5 minutes in the file
awk '{print substr($4, 2, 14)}' access.log | sort | uniq -c | tail -5

# (2) worst 5xx ratios among URLs with >= 20 requests
awk '{ sub(/\\?.*/, "", $7); total[$7]++; if ($9 >= 500) err[$7]++ }
     END { for (u in total) if (total[u] >= 20) printf "%s %d %.3f\\n", u, total[u], err[u]/total[u] }' access.log \\
  | sort -k3 -nr | head -5`,
    cx: `<p>O(n) time, O(U) memory for U distinct URLs; the final sort is over U lines only.</p>`,
    f: ['How would you do the same on 1 TB of logs?', 'How would you compute p99 latency per URL?']
  }));

  practice.push(P({
    t: 'Write a tiny supervisor: reap children and forward SIGTERM (C++)', l: 'Hard', tags: ['signals', 'sigaction', 'fork', 'zombies', 'c++'], co: ['Google', 'Docker'],
    s: `<p>Write a minimal "init-like" C++ program: it forks <code>N</code> worker children that run <code>sleep</code>; it reaps every child that exits (no zombies); and when it receives SIGTERM or SIGINT it forwards SIGTERM to all children, waits for them, and exits with code 0. Only async-signal-safe calls may be used inside handlers.</p>`,
    ex: `<p>Start it, run <code>ps --ppid $PID -o pid,stat</code> (3 sleeping workers). <code>kill -TERM $PID</code>: the supervisor prints "stopping", the workers die, no <code>Z</code> entries remain, exit status 0.</p>`,
    bw: `<p>Call <code>wait()</code> in the main loop only. While blocked in <code>wait()</code> you cannot react to SIGTERM quickly, and if the main thread is busy zombies accumulate. Calling <code>printf</code>/<code>kill</code> bookkeeping with locks inside handlers risks deadlock.</p>`,
    bc: { lang: 'cpp', code: `#include <sys/wait.h>
#include <unistd.h>
int main() {
    for (int i = 0; i < 3; ++i) if (fork() == 0) { sleep(1000); _exit(0); }
    for (;;) wait(nullptr);     // blocks; no signal handling, SIGTERM kills only the parent, orphaning workers
}` },
    q: ['Why loop on waitpid(-1, ..., WNOHANG) inside a SIGCHLD handler?', ['Standard signals do not queue, so one SIGCHLD may represent several exited children', 'waitpid only returns one PID per signal by design', 'WNOHANG blocks until all children exit', 'The loop is needed for performance only'], 0, 'If three children exit while SIGCHLD is already pending, the handler runs once. Looping until waitpid returns 0 or -1 reaps all of them.'],
    h: ['<p>Hint 1: use <code>sigaction</code> for SIGCHLD with <code>waitpid(-1, nullptr, WNOHANG)</code> in a loop, and save/restore errno.</p>', '<p>Hint 2: handlers for SIGTERM and SIGINT should only set a <code>volatile sig_atomic_t</code> flag. The main loop does the real work.</p>', '<p>Hint 3: in the main loop wait with <code>sigsuspend</code> (or a short <code>sleep</code>) so the flag is noticed; on stop, <code>kill(pid, SIGTERM)</code> each child and then <code>waitpid</code> until none remain. Block SIGCHLD during the critical bookkeeping to avoid races.</p>'],
    a: `<p>Install three handlers with sigaction. The SIGCHLD handler preserves errno and loops <code>while (waitpid(-1, nullptr, WNOHANG) &gt; 0) {}</code>, which reaps every exited child even if several signals were merged into one. The SIGTERM and SIGINT handlers only set an atomic flag <code>g_stop = 1</code>. The main loop records the PIDs returned by <code>fork</code>, then idles using <code>sigsuspend</code> with the original mask (so a signal arriving between the flag check and the sleep cannot be lost). When the flag is set, it sends SIGTERM to each recorded child with <code>kill</code>, then waits until <code>waitpid(-1, ...)</code> reports ECHILD, prints a message from normal (non-handler) context and returns 0. Block SIGCHLD and SIGTERM with <code>sigprocmask</code> around the check-then-sleep sequence to make it race-free. This is the essence of what tini or dumb-init do as container PID 1.</p>`,
    code: { lang: 'cpp', code: `#include <signal.h>
#include <sys/wait.h>
#include <unistd.h>
#include <cerrno>
#include <cstdio>
#include <cstring>
#include <vector>

static volatile sig_atomic_t g_stop = 0;

static void on_term(int) { g_stop = 1; }                  // only set a flag
static void on_chld(int) {
    int saved = errno;
    while (waitpid(-1, nullptr, WNOHANG) > 0) {}          // reap all exited children
    errno = saved;
}

int main() {
    const int N = 3;
    // Block the signals first so none can arrive between the flag test and sigsuspend().
    sigset_t block, old;
    sigemptyset(&block);
    sigaddset(&block, SIGCHLD); sigaddset(&block, SIGTERM); sigaddset(&block, SIGINT);
    sigprocmask(SIG_BLOCK, &block, &old);

    struct sigaction sa;
    memset(&sa, 0, sizeof sa);
    sigemptyset(&sa.sa_mask);
    sa.sa_handler = on_term;  sigaction(SIGTERM, &sa, nullptr); sigaction(SIGINT, &sa, nullptr);
    sa.sa_handler = on_chld;  sa.sa_flags = SA_RESTART | SA_NOCLDSTOP; sigaction(SIGCHLD, &sa, nullptr);

    std::vector<pid_t> kids;
    for (int i = 0; i < N; ++i) {
        pid_t p = fork();
        if (p == 0) {                                      // child: restore the mask, then work
            sigprocmask(SIG_SETMASK, &old, nullptr);
            execlp("sleep", "sleep", "1000", (char*)nullptr);
            _exit(127);
        }
        kids.push_back(p);
    }
    printf("supervisor pid=%d with %d workers\\n", getpid(), N);
    fflush(stdout);

    while (!g_stop) sigsuspend(&old);                      // atomically unblock + sleep: no lost wake-ups

    printf("stopping workers\\n");
    for (pid_t p : kids) kill(p, SIGTERM);                 // forward the polite stop
    sigprocmask(SIG_SETMASK, &old, nullptr);
    while (waitpid(-1, nullptr, 0) > 0 || errno == EINTR) {} // wait until ECHILD (all gone)
    printf("all workers exited, bye\\n");
    return 0;
}` },
    cx: `<p>O(N) per shutdown. Each signal costs O(1); the SIGCHLD handler reaps in O(exited children).</p>`,
    f: ['Why use sigsuspend instead of pause()?', 'What extra duty does PID 1 in a container have, and what does tini add?']
  }));

  practice.push(P({
    t: '"Too many open files": find the leak and fix the limit', l: 'Hard', tags: ['fd', 'ulimit', 'proc', 'systemd'], co: ['Netflix', 'LinkedIn'],
    s: `<p>A Go/Java service logs <code>accept: too many open files</code> every evening and then stops accepting connections. Walk through diagnosis and the fix: how to see the limit and usage of the live process, how to decide <i>leak</i> versus <i>limit too low</i>, how to change the limit for a systemd service permanently, and what other limits could be involved.</p>`,
    ex: `<p><code>grep 'open files' /proc/2231/limits</code> → <code>Max open files 1024 1024</code>; <code>ls /proc/2231/fd | wc -l</code> → <code>1023</code>. Breakdown with <code>lsof -p 2231 | awk '{print $5}' | sort | uniq -c</code> shows 900 <code>IPv4</code> sockets mostly in CLOSE_WAIT: a leak.</p>`,
    bw: `<p>Set <code>ulimit -n 1000000</code> in the shell and restart. It does not apply to systemd services at all, and if the cause was a leak the service just takes longer to crash.</p>`,
    bc: `ulimit -n 1000000 && ./service     # not used by the systemd-managed process; masks a leak`,
    q: ['Many sockets in CLOSE_WAIT are usually a sign of…', ['The local application not closing sockets after the peer closed', 'A remote server outage', 'Normal TCP teardown that clears in 60 seconds', 'A firewall rule'], 0, 'CLOSE_WAIT means the kernel received the peer\'s FIN and is waiting for the local app to call close(). They accumulate only if the app forgets - a leak.'],
    h: ['<p>Hint 1: read the effective limit and current usage of the running process from /proc/PID/limits and /proc/PID/fd, not from your shell.</p>', '<p>Hint 2: classify the descriptors (files vs sockets) and the TCP states with lsof and ss; growth over time that never falls = leak, a flat plateau at the limit under load = limit too low.</p>', '<p>Hint 3: for a systemd service set <code>LimitNOFILE=</code> in the unit (or a drop-in), daemon-reload and restart; also consider fs.file-max, the container runtime limit and per-user limits in limits.conf. Fix leaks with try-with-resources / defer close and connection pooling.</p>'],
    a: `<p>1) Measure on the live process: <code>grep 'open files' /proc/PID/limits</code> for soft/hard limit, <code>ls /proc/PID/fd | wc -l</code> for use, repeated every minute to see the trend. 2) Classify: <code>ls -l /proc/PID/fd | awk '{print $NF}' | sed 's/[0-9]*//g' | sort | uniq -c</code> or <code>lsof -p PID</code>; <code>ss -tanp | grep pid=PID</code> grouped by state. Many CLOSE_WAIT sockets or the same file opened over and over means a leak: fix the code (close in finally/defer, pool clients, set timeouts). A count that rises with traffic and plateaus below any bug but near 1024 means the limit is simply too low for the concurrency. 3) Raise the limit properly: shell <code>ulimit</code> does not affect services; put <code>LimitNOFILE=65536</code> in the unit (or <code>systemctl edit</code>), run <code>daemon-reload</code> and restart, then confirm in /proc/PID/limits. Containers need <code>--ulimit nofile=65536:65536</code>; check the system-wide <code>fs.file-max</code> and <code>fs.nr_open</code> too. 4) Add an alert on fd usage as a percentage of the limit.</p>`,
    code: `PID=$(pgrep -o -f myservice)
grep 'open files' /proc/$PID/limits              # soft and hard limit
ls /proc/$PID/fd | wc -l                         # current usage (run repeatedly: trend?)
sudo lsof -p $PID | awk '{print $5}' | sort | uniq -c | sort -nr   # types: IPv4, REG, FIFO...
sudo ss -tanp | grep "pid=$PID" | awk '{print $1}' | sort | uniq -c   # TCP states (CLOSE-WAIT?)
sudo systemctl edit myservice                    # add:  [Service]  LimitNOFILE=65536
sudo systemctl daemon-reload && sudo systemctl restart myservice
grep 'open files' /proc/$(pgrep -o -f myservice)/limits    # verify`,
    cx: `<p>O(1) diagnosis commands; the real work is the leak fix and a long-term alert.</p>`,
    f: ['How do per-process, per-user and system-wide limits interact?', 'What does EMFILE vs ENFILE mean?']
  }));

  practice.push(P({
    t: 'Container ignores SIGTERM and takes 10 s to stop', l: 'Hard', tags: ['signals', 'docker', 'pid1', 'exec'], co: ['Docker', 'Google', 'Amazon'],
    s: `<p><code>docker stop web</code> always takes exactly 10 seconds and the app logs nothing about shutdown. The Dockerfile uses <code>CMD ./start.sh</code> and <code>start.sh</code> ends with <code>node server.js</code>. Explain why, show how you prove it, and give two different fixes.</p>`,
    ex: `<p><code>docker top web</code> shows PID 1 = <code>/bin/sh -c ./start.sh</code> and node as its child. <code>docker stop</code> sends SIGTERM to PID 1 (the shell), which does not forward it; after 10 s Docker sends SIGKILL. Exit code <b>137</b>.</p>`,
    bw: `<p>Increase <code>--stop-timeout</code> or add <code>sleep</code>. That only delays the SIGKILL; the app still never drains requests and in-flight work is lost.</p>`,
    bc: `docker stop -t 60 web     # waits longer for nothing`,
    q: ['Why does a shell script as PID 1 often swallow SIGTERM?', ['The shell does not forward signals to its child and PID 1 has no default signal actions', 'Shell scripts cannot receive signals', 'Docker sends SIGINT only', 'node blocks SIGTERM'], 0, 'PID 1 receives only signals it handles; sh runs the child but does not propagate TERM unless the script uses exec or a trap. Without exec the real app is not PID 1.'],
    h: ['<p>Hint 1: check which process is PID 1 inside the container (<code>docker exec web ps -o pid,args</code> or <code>docker top</code>). Is it your app?</p>', '<p>Hint 2: PID 1 in a PID namespace gets no default signal behaviour; a signal with default action is ignored unless the process installed a handler. Shells do not forward.</p>', '<p>Hint 3: fixes: <code>exec node server.js</code> in the script and exec-form <code>CMD ["node","server.js"]</code>; or run a tiny init (<code>docker run --init</code> / tini) that forwards signals and reaps zombies; and make the app handle SIGTERM (server.close(), drain).</p>'],
    a: `<p>Cause: Docker sends SIGTERM only to PID 1 of the container. With the shell form <code>CMD ./start.sh</code>, PID 1 is <code>/bin/sh -c ./start.sh</code> and node is a child; the shell does not forward signals, and in a PID namespace PID 1 receives no default signal action, so the TERM is ignored. After the grace period (10 s) Docker sends SIGKILL, hence the fixed delay and exit code 137. Prove it with <code>docker top web</code>, <code>docker exec web cat /proc/1/status | grep -E 'Sig(Cgt|Ign)'</code> and by timing <code>docker stop</code>. Fix 1: make the app PID 1 and let it handle the signal: use exec form <code>CMD ["node","server.js"]</code>, or end the script with <code>exec node server.js</code>, and install a SIGTERM handler that stops accepting connections, drains, then exits 0. Fix 2: add an init such as tini (<code>ENTRYPOINT ["/sbin/tini","--"]</code> or <code>docker run --init</code>), which forwards signals to the child and reaps zombies. In Kubernetes the equivalent knobs are the exec-form command, <code>terminationGracePeriodSeconds</code> and a preStop hook.</p>`,
    code: `# Dockerfile (before): CMD ./start.sh     -> PID 1 is sh, node is a child
# Dockerfile (fix A):  CMD ["node", "server.js"]       # exec form, node is PID 1
# start.sh (fix A'):   exec node server.js             # replace the shell instead of forking
# fix B: let an init forward signals + reap zombies
#   docker run --init ...    or    ENTRYPOINT ["/sbin/tini", "--"]   CMD ["node", "server.js"]
docker top web                        # who is PID 1?
time docker stop web                  # 10 s => SIGKILL; ~1 s => graceful
docker inspect web --format '{{.State.ExitCode}}'     # 137 = killed, 0 = clean`,
    cx: `<p>O(1). The graceful path ends in under a second; the broken path costs the full timeout on every deploy.</p>`,
    f: ['What changes with a Node app that handles SIGTERM but not SIGINT?', 'How does Kubernetes sequence preStop, SIGTERM and SIGKILL?']
  }));

  practice.push(P({
    t: 'Service flaps and hits start-limit: investigate from journal evidence', l: 'Hard', tags: ['systemd', 'journalctl', 'crash loop', 'debugging'], co: ['Red Hat', 'Google SRE'],
    s: `<p><code>systemctl status api</code> shows <code>Active: failed (Result: start-limit-hit)</code>. The unit has <code>Restart=always</code> and no <code>RestartSec</code>. Describe how you find <b>why</b> it fails, why systemd stopped restarting, how to recover safely, and how to harden the unit so a future crash loop doesn't hammer dependencies.</p>`,
    ex: `<p><code>journalctl -u api -b</code> shows: <code>api.service: Main process exited, code=exited, status=1/FAILURE</code> repeated 5 times in under 2 seconds, then <code>Start request repeated too quickly</code> and <code>Failed with result 'start-limit-hit'</code>.</p>`,
    bw: `<p>Run <code>systemctl restart api</code> repeatedly until it works, or set <code>StartLimitIntervalSec=0</code> to remove the limit. The first hides the cause; the second turns a failed start into a tight infinite loop that burns CPU and hammers the database.</p>`,
    bc: `while ! systemctl restart api; do sleep 1; done     # hammering; no diagnosis`,
    q: ['What does Result=start-limit-hit mean?', ['The unit was (re)started more than StartLimitBurst times within StartLimitIntervalSec so systemd stopped trying', 'The unit file has a syntax error', 'The disk is full', 'The unit was masked'], 0, 'systemd rate-limits start attempts (default 5 in 10 s). Beyond that it refuses further starts until you run reset-failed, protecting the machine from tight crash loops.'],
    h: ['<p>Hint 1: the status line only shows the last few lines. Read the whole story with <code>journalctl -u api -b --no-pager</code> and look at the <b>first</b> failure, not the last.</p>', '<p>Hint 2: find the exit reason: <code>systemctl show api -p ExecMainStatus -p ExecMainCode -p Result</code>; run the <code>ExecStart</code> command by hand as the service user to see the error.</p>', '<p>Hint 3: recover with <code>systemctl reset-failed api</code> after fixing; harden with <code>RestartSec=5</code>, <code>Restart=on-failure</code>, back-off (<code>RestartSteps</code>/<code>RestartMaxDelaySec</code>), and ordering/health checks for dependencies.</p>'],
    a: `<p>Why it stopped: with <code>Restart=always</code> and no delay the service crashed immediately and was restarted more than StartLimitBurst (default 5) times within StartLimitIntervalSec (default 10 s), so systemd marked it failed with start-limit-hit and refuses further starts. Find the cause from evidence: <code>journalctl -u api -b --no-pager | head -50</code> shows the first error (missing config, bad credentials, port already in use, permissions); <code>systemctl show -p ExecMainStatus,Result api</code> gives the exit code, and running the exact ExecStart as the service user (<code>sudo -u orders /opt/orders/bin/server</code>) reproduces it in the foreground. Fix the root cause (for example the port is held: use <code>ss -ltnp</code>), then run <code>systemctl reset-failed api</code> and start. Harden: <code>Restart=on-failure</code>, <code>RestartSec=5</code> (or exponential back-off with <code>RestartSteps</code> and <code>RestartMaxDelaySec</code> in recent systemd), <code>ExecStartPre</code> config checks, <code>After=</code>/<code>Wants=</code> for dependencies, and an alert on <code>NRestarts</code> or on failed units. Do not disable the limit.</p>`,
    code: `systemctl status api --no-pager
journalctl -u api -b --no-pager | head -40            # first failure, not just the last
systemctl show api -p ExecMainStatus -p Result -p NRestarts
sudo -u orders /opt/orders/bin/server --port 8080     # reproduce in the foreground as the service user
sudo ss -ltnp 'sport = :8080'                         # port conflict?
sudo systemctl reset-failed api && sudo systemctl start api
# hardened settings in [Service]:
#   Restart=on-failure
#   RestartSec=5
#   StartLimitIntervalSec=300
#   StartLimitBurst=5`,
    cx: `<p>O(1) commands. The value is in reading the first error and fixing the cause, not the restart policy.</p>`,
    f: ['How do you alert when NRestarts increases?', 'When is Restart=always the right choice?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: 'Which signal can a process NOT catch, block or ignore?', options: ['SIGKILL', 'SIGTERM', 'SIGINT', 'SIGHUP'], answer: 0, explain: 'SIGKILL (and SIGSTOP) are handled entirely by the kernel, so a process can never run cleanup code for them. TERM, INT and HUP can all be caught.' });
  quiz.push({ q: 'What does <code>kill 1234</code> (no signal name) send?', options: ['SIGTERM (15)', 'SIGKILL (9)', 'SIGINT (2)', 'SIGHUP (1)'], answer: 0, explain: 'The default signal of kill(1) is SIGTERM, a polite request to terminate that the program may catch to clean up.' });
  quiz.push({ q: 'A file has mode <code>-rwxr-x---</code>. What is it in octal?', options: ['750', '705', '755', '570'], answer: 0, explain: 'rwx = 7 for the owner, r-x = 5 for the group, --- = 0 for others, so 750.' });
  quiz.push({ q: 'With <code>umask 022</code>, what mode does a newly created regular file get?', options: ['644', '755', '666', '600'], answer: 0, explain: 'Files start at 666 and the umask removes write for group and other: 666 AND NOT 022 = 644. Directories get 755.' });
  quiz.push({ q: 'What does the sticky bit on a directory such as /tmp do?', options: ['Only a file\'s owner (or the directory owner or root) can delete or rename it', 'Makes files inside executable', 'Hides the directory from ls', 'Makes new files inherit the group'], answer: 0, explain: 'Sticky (t) restricts deletion and renaming inside a directory to the file owner, directory owner or root, even though the directory is world-writable. Group inheritance is setgid.' });
  quiz.push({ q: 'Where does stderr of <code>cmd 2&gt;&amp;1 &gt; out</code> go?', options: ['To the terminal (the old stdout)', 'To the file out', 'To /dev/null', 'It is closed'], answer: 0, explain: 'Redirections are applied left to right: 2>&1 copies fd 1 while it still points to the terminal; only afterwards is fd 1 pointed at out.' });
  quiz.push({ q: 'Why must you run <code>sort</code> before <code>uniq -c</code> when counting values?', options: ['uniq only merges adjacent duplicate lines', 'uniq cannot read pipes', 'sort converts text to numbers', 'uniq -c requires a file name'], answer: 0, explain: 'uniq compares each line only with the previous one, so equal lines must be next to each other; sorting guarantees that.' });
  quiz.push({ q: 'Which command safely finds files older than 7 days to delete, including names with spaces?', options: ['find DIR -type f -mtime +7 -print0 | xargs -0 rm', 'rm $(find DIR -mtime +7)', 'ls -l DIR | grep 7 | rm', 'find DIR -mtime 7 | rm'], answer: 0, explain: '-print0 with xargs -0 uses NUL separators so spaces and newlines in names are safe. Command substitution splits on whitespace and can delete the wrong things.' });
  quiz.push({ q: 'Which /proc file shows how much RAM a process really occupies (resident)?', options: ['/proc/PID/status, field VmRSS', '/proc/PID/cmdline', '/proc/PID/environ', '/proc/loadavg'], answer: 0, explain: 'VmRSS is the resident set size in /proc/PID/status. VmSize is virtual address space and says little about actual RAM use.' });
  quiz.push({ q: 'You edited <code>/etc/systemd/system/api.service</code>. What must you run before restarting?', options: ['systemctl daemon-reload', 'systemctl enable --now', 'journalctl --rotate', 'sysctl --system'], answer: 0, explain: 'systemd caches unit files; daemon-reload tells it to re-read them. Without it restart uses the old definition.' });
  quiz.push({ q: '<code>Restart=on-failure</code> restarts a service in which case?', options: ['It exits with a non-zero status or is killed by a signal, but not after a manual systemctl stop', 'Only on a clean exit with status 0', 'Always, including after systemctl stop', 'Never'], answer: 0, explain: 'on-failure covers non-zero exits, signals and timeouts. A deliberate stop is never restarted; Restart=always would also restart after clean exits.' });
  quiz.push({ q: 'The command <code>ss -ltnp</code> is best described as…', options: ['List listening TCP sockets with numeric ports and the owning process', 'List all UDP traffic with packet counts', 'Show routing table', 'Trace system calls of a process'], answer: 0, explain: '-l listening, -t TCP, -n numeric, -p process. It replaces the older netstat -tlnp.' });
  quiz.push({ q: 'A hung process shows 0% CPU and its last syscall is <code>read(9, </code>. What is it most likely doing?', options: ['Waiting for data on file descriptor 9', 'Computing in a tight loop', 'Waiting for a mutex', 'Reaping a child'], answer: 0, explain: 'A blocking read with no result means it waits for input on fd 9, often a socket. Use ls -l /proc/PID/fd/9 and ss -tnp to find the peer.' });
  quiz.push({ q: 'Exit code 137 from a container most often means…', options: ['The process was killed by SIGKILL (128 + 9), commonly the OOM killer', 'Clean exit', 'Segmentation fault', 'Permission denied'], answer: 0, explain: 'Shells report death by signal N as 128 + N; 9 is SIGKILL. In containers that is typically an OOM kill or the forced kill after the stop timeout. SIGSEGV would be 139.' });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ level: 'B', q: 'What is the difference between SIGTERM and SIGKILL, and which should you use first?', a: `<p><b>SIGTERM (15)</b> is a request to terminate: the process can catch it, finish current work, flush buffers, release locks and exit cleanly. <b>SIGKILL (9)</b> is enforced by the kernel and cannot be caught, blocked or ignored, so no cleanup runs; it also cannot save a process stuck in uninterruptible I/O (state D). Always send TERM first, wait a reasonable grace period (systemd defaults to 90 s, Kubernetes to 30 s), and escalate to KILL only if the process doesn't exit. Habitual <code>kill -9</code> leaves stale lock files, half-written data and orphaned children.</p>`, followUps: ['Why does exit code 143 mean SIGTERM?', 'What does it mean if even kill -9 does not remove a process?', 'How does Kubernetes sequence preStop, SIGTERM and SIGKILL?'] });
  interview.push({ level: 'B', q: 'Explain Linux file permissions 755 and 644. What do r, w and x mean for a directory?', a: `<p>Each digit is owner, group, other and is the sum r=4, w=2, x=1. <b>755</b> = rwxr-xr-x: owner full control, everyone else can read and execute (typical for programs and directories). <b>644</b> = rw-r--r--: owner reads and writes, others read only (typical for regular files). For directories, <b>r</b> lets you list names, <b>w</b> lets you create, delete and rename entries (and requires x), and <b>x</b> lets you enter (cd) and reach entries by name. Deleting a file depends on write permission of its parent directory, not on the file's own bits.</p>`, followUps: ['What does umask do?', 'How is chmod 600 on an SSH key enforced?', 'What happens with r but no x on a directory?'] });
  interview.push({ level: 'B', q: 'What are file descriptors 0, 1 and 2, and what does <code>cmd &gt; out 2&gt;&amp;1</code> do?', a: `<p>0, 1 and 2 are the standard input, output and error descriptors every process starts with, normally attached to the terminal. <code>&gt; out</code> points fd 1 at the file out (truncating it). <code>2&gt;&amp;1</code> then makes fd 2 a copy of whatever fd 1 points to at that moment - the file - so both streams go to out. The shell applies redirections left to right, so <code>cmd 2&gt;&amp;1 &gt; out</code> is different: stderr copies the terminal first, and only stdout goes to the file. In bash <code>&amp;&gt; out</code> is a shorthand for the first form.</p>`, followUps: ['How would you pipe only stderr to grep?', 'Why can stderr text appear before earlier stdout text in a file?', 'What does dup2 have to do with this?'] });
  interview.push({ level: 'B', q: 'Give the pipeline for the top 10 client IPs in an access log and explain each stage.', a: `<p><code>awk '{print $1}' access.log | sort | uniq -c | sort -nr | head -10</code>. awk extracts the first field (client IP). The first <code>sort</code> groups identical IPs together because <code>uniq</code> only collapses adjacent duplicates. <code>uniq -c</code> prefixes each distinct IP with its count. The second sort is numeric (<code>-n</code>) and reversed (<code>-r</code>) to put the biggest counts first, and <code>head -10</code> keeps the top ten. Time is O(n log n) and memory is bounded because sort spills to disk; an awk associative array does the counting in O(n) if the distinct keys fit in RAM.</p>`, followUps: ['How would you restrict it to status 500?', 'How would you do it for gzipped rotated logs?', 'What if the log is 1 TB?'] });
  interview.push({ level: 'I', q: 'How do you handle graceful shutdown in a bash script and in a C++ service?', a: `<p>In bash use <code>trap</code>: register a cleanup function on <code>EXIT</code> and small traps on INT and TERM that call <code>exit 130</code>/<code>exit 143</code> so the EXIT trap runs once; use <code>sleep &amp; wait</code> so traps fire promptly. In C++ install handlers with <code>sigaction</code> for SIGTERM and SIGINT that only set a <code>volatile sig_atomic_t</code> flag (or write to a self-pipe/eventfd/signalfd), because only async-signal-safe calls are allowed in handlers. The main loop checks the flag, stops accepting new work, drains in-flight requests, flushes, closes sockets and exits 0 within the orchestrator's grace period. Ignore SIGPIPE so broken sockets return EPIPE.</p>`, followUps: ['Why is printf unsafe in a handler?', 'What is the race with while(!flag) pause()?', 'What changes when the process is PID 1 in a container?'] });
  interview.push({ level: 'I', q: 'What is a zombie process, why does it exist, and how do you get rid of it?', a: `<p>A zombie is a child that has exited but whose parent has not yet called <code>wait()</code>/<code>waitpid()</code>. The kernel keeps a small record (PID, exit status, resource usage) so the parent can learn how the child ended. Zombies use no CPU or memory beyond the process-table entry, but many of them can exhaust PIDs. You cannot kill a zombie; you fix the parent: make it reap children (waitpid in a SIGCHLD handler with WNOHANG in a loop, or set SIGCHLD to SIG_IGN / SA_NOCLDWAIT), or terminate the parent so that PID 1 adopts and reaps them. In containers use an init such as tini because a naive app as PID 1 doesn't reap orphans.</p>`, followUps: ['How does an orphan differ from a zombie?', 'Why loop in the SIGCHLD handler?', 'How do you list zombies with ps?'] });
  interview.push({ level: 'I', q: 'setuid, setgid and the sticky bit - what do they do and what are the security risks?', a: `<p><b>setuid</b> on an executable makes it run with the file owner's effective UID (e.g. <code>passwd</code>, <code>sudo</code>); <b>setgid</b> does the same for the group, and on a directory makes new files inherit the directory's group; the <b>sticky bit</b> on a directory restricts deletion and renaming to the file owner, directory owner or root (<code>/tmp</code>). Setuid-root programs are high-value attack targets: bugs, unsafe environment handling or PATH tricks become privilege escalation, and the kernel ignores setuid on scripts for that reason. Keep the list small (<code>find / -perm -4000</code>), mount untrusted filesystems <code>nosuid</code>, drop privileges early, and prefer capabilities (<code>setcap</code>) for narrow needs.</p>`, followUps: ['Why is setuid ignored on shell scripts?', 'What are Linux capabilities?', 'How do you audit setuid binaries?'] });
  interview.push({ level: 'I', q: 'A server shows high load average but the CPU is idle. How do you investigate?', a: `<p>Load average counts runnable tasks plus tasks in uninterruptible sleep (D), so idle CPU with high load usually means tasks are blocked on I/O. Check <code>vmstat 1</code> (b column, wa) and <code>top</code> (wa, D states), then <code>iostat -xz 1</code> for await and %util, <code>pidstat -d 1</code> to find the process, and <code>ps -eo state,pid,wchan:20,cmd | awk '$1=="D"'</code> to see what they wait for (disk, NFS, a hung mount). Look at PSI in <code>/proc/pressure/io</code>, <code>dmesg</code> for I/O errors and <code>df -h; df -i</code>. Fix the slow device, throttle the noisy job (ionice), or repair the stuck network filesystem.</p>`, followUps: ['What does the steal column mean?', 'Why does NFS cause unkillable processes?', 'What is PSI?'] });
  interview.push({ level: 'I', q: 'How do you find which process is using port 8080 and what can go wrong with the answer?', a: `<p>Use <code>sudo ss -ltnp 'sport = :8080'</code> (or <code>sudo lsof -iTCP:8080 -sTCP:LISTEN</code>, <code>sudo fuser -v 8080/tcp</code>, legacy <code>netstat -tulpn</code>). The <code>users:((name,pid=...))</code> field names the owner. Pitfalls: without sudo you do not see other users' processes; a port can be held by <code>docker-proxy</code> or in another network namespace so you must look inside the container (<code>nsenter -t PID -n ss -ltnp</code>); a service manager may restart whatever you kill, so stop the unit instead; IPv6 wildcard <code>:::8080</code> also blocks IPv4; and a client connected <i>to</i> 8080 isn't the listener, so filter on LISTEN.</p>`, followUps: ['What does SO_REUSEPORT change?', 'How do you tell TIME_WAIT from a real listener?', 'How would you find the owner in Kubernetes?'] });
  interview.push({ level: 'A', q: 'Explain what /proc is and how tools like ps, top and lsof use it.', a: `<p>/proc is a virtual filesystem implemented by the kernel: no data is stored on disk, reading a file runs kernel code that formats live state. Each process has /proc/PID with <code>status</code>, <code>stat</code>, <code>cmdline</code>, <code>environ</code>, <code>fd/</code>, <code>maps</code>, <code>limits</code>, <code>io</code>, <code>cgroup</code> and <code>ns/</code>; the root has system-wide files (<code>meminfo</code>, <code>cpuinfo</code>, <code>loadavg</code>, <code>stat</code>, <code>net/</code>, <code>sys/</code>). ps, top, free, uptime and lsof are mostly parsers of these files (strace <code>ps</code> shows it opening /proc/PID/stat for every process); rate tools like vmstat and top read cumulative counters twice and subtract. /proc/sys is writable and is what sysctl edits. In containers per-PID data is namespaced but meminfo, cpuinfo and uptime still show the host unless virtualised.</p>`, followUps: ['VSZ vs RSS vs PSS?', 'Why can environ leak secrets?', 'How does /proc differ from /sys?'] });
  interview.push({ level: 'A', q: 'How does strace work, what does it cost, and what are safer alternatives in production?', a: `<p>strace uses the <code>ptrace(2)</code> system call: the kernel stops the tracee at every syscall entry and exit, and strace reads its registers and memory to decode arguments and return values. That means two extra context switches per syscall, so slowdowns of 10-100x are common; it can destabilise latency-sensitive services, and only one tracer can attach at a time. It needs ptrace permission (same user and Yama ptrace_scope, or CAP_SYS_PTRACE; in Docker add the capability). For production prefer short <code>strace -c</code> samples, <code>perf trace</code>, or eBPF tools (<code>bpftrace</code>, bcc's opensnoop/tcpconnect/biolatency, <code>perf</code>), which filter in the kernel with much lower overhead. Use strace for ENOENT config hunts and diagnosing hangs, then detach.</p>`, followUps: ['What does a futex wait tell you?', 'How would you trace only file opens?', 'What is ltrace?'] });
  interview.push({ level: 'A', q: 'Walk through how systemd runs and supervises a service, from unit file to process exit.', a: `<p>systemd (PID 1) loads units from /etc/systemd/system and /usr/lib/systemd/system. On start it computes dependencies and ordering (Wants/Requires, After/Before), creates a cgroup for the unit, runs ExecStartPre, then forks and execs ExecStart as the configured User with the sandbox options (namespaces, capabilities, filters). With Type=simple the unit is active immediately, with notify it waits for sd_notify READY=1. stdout/stderr go to journald. When the main process exits, systemd gets SIGCHLD, records Result (success, exit-code, signal, timeout), and applies Restart= after RestartSec, subject to StartLimitBurst. On stop it runs ExecStop, sends SIGTERM (KillMode=control-group signals the whole cgroup), waits TimeoutStopSec, then sends SIGKILL to everything left in the cgroup. cgroup limits (MemoryMax, CPUQuota, TasksMax) apply throughout.</p>`, followUps: ['Type=simple vs forking vs notify vs oneshot?', 'Wants vs Requires vs After?', 'How does socket activation avoid dropped connections?'] });
  interview.push({ level: 'A', q: 'A process exits with code 137 and logs nothing. How do you prove why?', a: `<p>137 = 128 + 9: the process died from SIGKILL, which can't be caught, hence no log. Candidates: the kernel OOM killer, a cgroup memory limit (container or systemd MemoryMax), a manual kill -9, or an orchestrator's forced kill after the stop timeout. Check <code>dmesg -T | grep -iE 'out of memory|killed process'</code> or <code>journalctl -k</code> for the OOM report (victim, RSS), <code>memory.events</code> (oom_kill) in the unit's or container's cgroup, <code>systemctl show -p Result,ExecMainStatus</code>, and the orchestrator events (<code>kubectl describe pod</code> shows OOMKilled). If it's the stop path, look for "State 'stop-sigterm' timed out" in the journal. Fix by raising limits, reducing memory (heap size), repairing leaks, or handling SIGTERM within the grace period.</p>`, followUps: ['How does oom_score_adj influence the victim?', 'How do cgroup OOM kills differ from host OOM?', 'How would you alert on this before it happens?'] });
  interview.push({ level: 'E', q: 'Design a safe, repeatable way to run shell-based cleanup (delete old files, rotate logs) on a fleet, and name the failure modes.', a: `<p>Prefer declarative, idempotent mechanisms: <code>systemd-tmpfiles</code>/logrotate or a systemd timer with <code>Persistent=true</code> over hand-written cron. Script rules: <code>set -euo pipefail</code>, quoted variables, absolute paths, <code>-type f</code> and a narrow <code>-name</code>, a mandatory dry-run mode that prints the list, a hard guard against empty or root-like variables (the <code>:?</code> parameter-expansion guard, which aborts when DIR is unset or empty), a single saved NUL-delimited file list used for both archive and delete, <code>flock</code> to avoid overlapping runs, logging to the journal, and alerting on non-zero exit or on large deletions. Failure modes: unset variable expanding to <code>/</code>, spaces in names, clock skew changing mtime logic, mount missing so the wrong filesystem is cleaned, deleting files a process still has open (space not freed), and permissions or SELinux denying silently. Roll out gradually (canary hosts) and test with disposable fixtures.</p>`, followUps: ['How does flock prevent overlap?', 'Why is rm -rf "$DIR/" dangerous when DIR is empty?', 'How would you audit what was deleted?'] });
  interview.push({ level: 'E', q: 'How do AI coding agents with shell access change how you think about Unix permissions and process control?', a: `<p>An agent that can run commands acts with your user's authority, so the principles are least privilege and containment. Run it in a container or VM, as a dedicated unprivileged user, with a read-only mount for source it should not modify, a small writable workspace, <code>no-new-privileges</code>, dropped capabilities, limited network egress, and cgroup limits (<code>MemoryMax</code>, <code>TasksMax</code>, CPU quota) so a runaway or fork-bomb can't take the host down. Secrets should not be in its environment (<code>/proc/PID/environ</code> and logs expose them). Gate destructive commands (<code>rm -rf</code>, <code>chmod -R</code>, <code>kill -9</code>, <code>pkill -f</code>, <code>curl | sh</code>) behind human approval or allow-lists, prefer dry-runs, log every command, and handle SIGTERM so long tasks stop cleanly. Humans still own the review: pattern-based kills and recursive chmod/chown are exactly where models make confident, expensive mistakes.</p>`, followUps: ['What would a sandbox profile for an agent contain?', 'How do you stop prompt injection from running dangerous shell commands?', 'How would you audit agent actions afterwards?'] });

  // ───────────────────────── Module registration ─────────────────────────
  registerModule({
    id: 'cs08',
    title: 'Linux Internals & Shell for Engineers',
    lang: 'bash',
    intro: `<p>This module turns the OS theory from earlier modules (processes, signals, file descriptors, memory, scheduling) into the <b>hands-on Linux skills</b> that interviews and on-call shifts really test: stopping a process properly, reading permission bits, predicting what <code>2&gt;&amp;1</code> does, building a pipeline that answers a log question, looking inside a running process through <code>/proc</code>, writing a systemd service, and debugging a hung or slow box with <code>strace</code>, <code>ss</code>, <code>lsof</code>, <code>vmstat</code> and <code>dmesg</code>. Every topic starts with an analogy, shows a step-by-step visualizer, and ends with practice problems and the AI-era view: what assistants do well and where a careful engineer must still check.</p>`,
    goals: [
      'Explain SIGTERM vs SIGKILL vs SIGINT vs SIGHUP vs SIGCHLD and write a correct signal handler (C++) and <code>trap</code> (bash) for graceful shutdown',
      'Read and set permissions in rwx and octal, predict umask results, and use setuid, setgid and the sticky bit correctly',
      'Predict where stdout and stderr go for any redirection chain (<code>&gt; f 2&gt;&amp;1</code> vs <code>2&gt;&amp;1 &gt; f</code>), use here-docs and pipes',
      'Compose grep, sed, awk, find, xargs, sort, uniq, cut, tar and curl into reliable one-liners (top-N IPs, delete old files safely)',
      'Navigate <code>/proc</code> to inspect processes, memory, fds and kernel settings; tune with sysctl',
      'Write, install and debug a systemd service unit and read its logs with journalctl',
      'Diagnose hangs, port conflicts, CPU/memory/disk problems and OOM kills with strace, top, lsof, ss, vmstat, iostat and dmesg'
    ],
    prereqs: `CS Core modules on Processes &amp; Threads, Memory Management and File Systems &amp; I/O. Basic comfort typing commands in a terminal helps; everything else is taught here.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
