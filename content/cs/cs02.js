(function () {
var topics = [], practice = [], quiz = [], interview = [];
// helper to build problems compactly (code optional in the cs track)
function P(title, level, tags, statement, example, bruteWhy, mcq, hints, approach, complexity, followUps, companies) {
  return {
    title: title, level: level, tags: tags, companies: companies || ['Google', 'Amazon', 'Microsoft'],
    statement: statement, constraints: 'Think in terms of a typical Linux / POSIX system. State any assumption you make.',
    example: example,
    brute: { why: bruteWhy },
    mcq: mcq, hints: hints,
    solution: { approach: approach, complexity: complexity, followUps: followUps || [] }
  };
}
function Q(q, options, answer, explain) { return { q: q, options: options, answer: answer, explain: explain }; }
function I(q, level, a, followUps) { return { q: q, level: level, a: a, followUps: followUps }; }

/* ===================== TOPIC 1: program vs process, memory layout ===================== */
topics.push({
  title: 'Program vs Process and the Memory Layout',
  analogy: `<p>A <b>program</b> is a recipe printed in a cookbook: it just sits on the shelf. A <b>process</b> is a cook actually making the dish right now: with a kitchen counter (memory), a half-chopped onion (data in progress), a timer running (CPU state) and a note saying "I am on step 4" (program counter). The same recipe can be cooked by ten cooks at once, and each cook is a separate process.</p>`,
  explain: `<p>🟢 <b>Program</b> = a file on disk (for example <code>/bin/ls</code>) holding instructions and starting data. It does nothing by itself. <b>Process</b> = a program that the OS has loaded and is running, together with everything it owns: memory, open files, a process id (PID) and CPU state.</p>
  <p>Every process gets its own private <b>virtual address space</b>, split into four classic parts:</p>
  ${H.table(['Segment', 'What lives here', 'Grows?', 'Example'], [
    ['<b>Text (code)</b>', 'machine instructions, read-only', 'no', 'your compiled functions'],
    ['<b>Data / BSS</b>', 'global and static variables (BSS = zero-initialised)', 'no', '<code>int counter;</code> at file level'],
    ['<b>Heap</b>', 'memory you ask for at run time', 'up, towards high addresses', '<code>malloc</code>, <code>new</code>'],
    ['<b>Stack</b>', 'function calls: locals, parameters, return addresses', 'down, towards low addresses', 'local <code>int x;</code>']
  ])}
  <p>Heap and stack grow towards each other with a big empty gap between them. Running out of stack = <b>stack overflow</b> (usually runaway recursion). Forgetting to free heap memory = <b>memory leak</b>.</p>
  <p>Two processes running the same program have separate data, heap and stack. The read-only text can be shared in physical RAM, but each process still thinks it owns the whole address space.</p>`,
  clues: ['"What is the difference between a program and a process?" - passive file vs active running instance', '"Where is this variable stored?" - local = stack, malloc/new = heap, global/static = data/BSS', '"Stack overflow" / "segfault on deep recursion" - stack segment is limited (often 8 MB on Linux)', '"Why does each process think it has all the memory?" - virtual address space, one per process', '"Two copies of the same program running" - same text, different processes (different PIDs)'],
  code: [{ lang: 'cpp', title: 'Where does each variable live?', code: `#include <cstdio>
#include <cstdlib>

int g_counter = 5;          // initialised global  -> DATA segment
int g_zero;                 // uninitialised global -> BSS (zero-filled)
const char* msg = "hello";  // the pointer is in DATA, the string literal is in read-only TEXT/rodata

int square(int n) {         // function body itself lives in TEXT
    int result = n * n;     // 'n' and 'result' live in this call's STACK frame
    return result;
}

int main() {
    int local = 3;                          // STACK
    int* heap_int = (int*)malloc(sizeof(int)); // pointer 'heap_int' on STACK, the 4 bytes it points to on HEAP
    *heap_int = square(local);
    printf("data=%p bss=%p stack=%p heap=%p\\n", (void*)&g_counter, (void*)&g_zero, (void*)&local, (void*)heap_int);
    free(heap_int);                         // give the heap block back
    return 0;
}` }],
  codeTitle: ['Segments in a tiny C program'],
  viz: {
    title: 'Process memory layout and the call stack growing',
    input: 'main square helper',
    inputLabel: 'Call chain (function names, space separated, max 6)',
    gen: function (input) {
      var fns = String(input).trim().split(/[\s,>]+/).filter(Boolean);
      if (!fns.length) throw new Error('Type a call chain like: main square helper');
      if (fns.length > 6) throw new Error('Use at most 6 function names');
      var seg = ['STACK (grows down)', '... free gap ...', 'HEAP (grows up)', 'BSS (zero globals)', 'DATA (init globals)', 'TEXT (code)'];
      var frames = [];
      // stack part: bottom -> top. Bottom = low address, so TEXT first.
      var layout = ['TEXT (code, read-only)', 'DATA (initialised globals)', 'BSS (zero globals)', 'HEAP (grows up)', '... free gap ...', 'STACK (grows down)'];
      frames.push({ narr: 'A <b>program</b> on disk is just a file. When the OS starts it, it builds a <b>process</b> with this address space. Low addresses at the bottom, high at the top.', parts: [{ type: 'stack', label: 'Virtual address space (low to high)', items: layout, hl: { 0: 'sel' } }] });
      frames.push({ narr: 'The <b>text</b> segment holds the machine code. It is read-only so a bug cannot overwrite your own instructions. Copies of the same program can share it in RAM.', parts: [{ type: 'stack', label: 'Virtual address space', items: layout, hl: { 0: 'cur' } }] });
      frames.push({ narr: '<b>Data</b> and <b>BSS</b> hold global and static variables. BSS is the zero-filled part, so it takes no space in the file on disk, only a size.', parts: [{ type: 'stack', label: 'Virtual address space', items: layout, hl: { 1: 'cur', 2: 'cur' } }] });
      var st = [];
      for (var i = 0; i < fns.length; i++) {
        st.push(fns[i] + '() frame: locals + return address');
        frames.push({ narr: 'Call <b>' + fns[i] + '()</b>: a new <b>stack frame</b> is pushed (locals, arguments, where to return). The stack grows <b>down</b> in memory but we draw newest on top.', parts: [
          { type: 'stack', label: 'Virtual address space', items: layout, hl: { 5: 'cur' } },
          { type: 'stack', label: 'Call stack (bottom = oldest call)', items: st.slice(), hl: (function () { var h = {}; h[st.length - 1] = 'cur'; return h; })() }] });
      }
      frames.push({ narr: 'Now <code>malloc</code>/<code>new</code> is called: a block appears on the <b>heap</b>. Heap grows up, stack grows down, the gap in between shrinks.', parts: [
        { type: 'stack', label: 'Virtual address space', items: layout, hl: { 3: 'ok', 4: 'done' } },
        { type: 'stack', label: 'Call stack', items: st.slice() }] });
      while (st.length) {
        var gone = st.pop();
        frames.push({ narr: '<b>' + gone.split('()')[0] + '()</b> returns: its frame is popped and the memory is instantly reusable. Locals die here, heap data does <b>not</b> die until freed.', parts: [
          { type: 'stack', label: 'Virtual address space', items: layout, hl: { 5: 'ok' } },
          { type: 'stack', label: 'Call stack', items: st.slice(), hl: st.length ? (function () { var h = {}; h[st.length - 1] = 'cur'; return h; })() : {} }] });
      }
      return frames;
    }
  },
  examples: [
    { title: 'Same program, two processes', html: `<p>Open two terminals and run <code>./game</code> in each. Two PIDs, one program file. Change a variable in one and the other is unaffected, because each has its own data/heap/stack.</p>` },
    { title: 'Where does it live? A quick table', html: `${H.table(['Declaration', 'Segment'], [['<code>int a = 5;</code> (global)', 'DATA'], ['<code>static int b;</code> (file level)', 'BSS'], ['<code>int c;</code> inside a function', 'STACK'], ['<code>int* d = new int[100];</code>', 'pointer on STACK, 400 bytes on HEAP'], ['<code>"abc"</code> literal', 'read-only (TEXT/rodata)']])}` },
    { title: 'Why deep recursion crashes but a big malloc does not', html: `<p>The stack is capped (typically 8 MB; check with <code>ulimit -s</code>). A recursion 100,000 levels deep with 100-byte frames needs 10 MB, so it crashes with a segfault. The heap can grow until RAM plus swap is exhausted, so a 100 MB <code>malloc</code> usually works.</p>`, code: { lang: 'cpp', title: 'Overflowing the stack on purpose (do not run in production!)', code: `// Each call adds a frame; with no base case the stack segment runs out.
int boom(int n) {
    char pad[1024];          // make each frame fat
    pad[0] = (char)n;
    return boom(n + 1) + pad[0];
}` } }
  ],
  deepDive: `<p>🟣 <b>Real layout.</b> On Linux x86-64 you can see it in <code>/proc/&lt;pid&gt;/maps</code>: text, data, [heap], mmap region (shared libraries and big allocations), [stack] near the top, then the kernel half. <b>ASLR</b> (address space layout randomisation) shifts these bases every run so exploits cannot hardcode addresses.</p>
  <p><b>Lazy allocation.</b> The heap grows via <code>brk</code>/<code>sbrk</code> or <code>mmap</code>. The OS hands out <i>virtual</i> pages and only attaches real RAM when a page is first touched (a page fault). That is why a process can "allocate" 10 GB and show tiny RSS. <b>VSZ</b> is the virtual size, <b>RSS</b> is what is really in RAM.</p>
  <p><b>Stack details.</b> A frame holds the return address, saved frame pointer, arguments that did not fit in registers, locals and saved registers. Overwriting the return address through a buffer overflow is the classic exploit; stack canaries and non-executable stack (NX) are the defences. Each <i>thread</i> has its own stack, typically 8 MB reserved virtually (1 MB on Windows), which is why thousands of threads cost real address space.</p>
  <p><b>Allocator reality.</b> <code>malloc</code> is a user-space library (glibc, jemalloc, tcmalloc, mimalloc) that carves blocks from memory obtained from the kernel; <code>free</code> usually does not return memory to the OS immediately. Fragmentation and per-thread arenas are real production concerns.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> an assistant will happily explain "stack vs heap" and generate code, but it often repeats the myth that "objects are always on the heap" or "malloc always calls the OS". The truth depends on language and allocator.</p>
  <p><b>Use AI as a partner:</b> paste the output of <code>cat /proc/self/maps</code> or a crash backtrace and ask "label each region and explain what grew". Ask for a small program that prints addresses from each segment, then <i>run it yourself</i> and check.</p>
  <p><b>Where AI goes wrong:</b> it invents exact addresses and sizes, and it may say a leak is on the stack. LLM inference servers are also processes: model weights are mmap'd into the address space (shared across processes via the page cache), while the KV cache lives in GPU memory. Knowing virtual vs resident memory is what lets you read those memory dashboards.</p>
  <p><b>What you must still own:</b> being able to say precisely where each variable lives and why a crash is a stack overflow and not a heap problem.</p>`,
  problems: [
    P('Locate the Variable', 'Easy', ['memory layout'],
      `<p>For the code below, say which segment (text, data, BSS, stack, heap) holds each of: <code>a</code>, <code>b</code>, <code>c</code>, <code>d</code>, <code>*d</code>.</p><pre>int a = 7;           // file scope
static int b;         // file scope
void f() { int c = 1; int* d = new int(9); }</pre>`,
      `<p>Answer: ${H.c('g', 'a = DATA')}, ${H.c('g', 'b = BSS')}, ${H.c('g', 'c = STACK')}, ${H.c('g', 'd (the pointer) = STACK')}, ${H.c('g', '*d (the int 9) = HEAP')}.</p>`,
      `<p>Guessing "everything with new is on the heap, everything else on the stack" is wrong for globals: it ignores data/BSS.</p>`,
      { q: 'Which segment holds an uninitialised global int?', options: ['Stack', 'Heap', 'BSS', 'Text'], answer: 2, explain: 'Uninitialised (zero-filled) globals go to BSS.' },
      ['<p>Hint 1: ask "does it live inside a function call, or for the whole program?"</p>', '<p>Hint 2: initialised globals = data, uninitialised = BSS, allocated at run time = heap.</p>', '<p>Hint 3: a pointer variable and the memory it points to can be in different segments.</p>'],
      `<p><b>a</b> is an initialised global so it sits in the DATA segment. <b>b</b> is a static with no initialiser, so the loader zero-fills it: BSS. <b>c</b> is a local variable, so it is part of f's stack frame and disappears when f returns. <b>d</b> is also a local (a pointer, 8 bytes on a 64-bit machine) so it is on the stack, but the integer it points to was created by new, so <b>*d</b> lives on the heap. Note the leak: f never deletes it, and when f returns the only pointer is gone while the heap block remains until the process exits.</p>`,
      `<p>O(1) to answer; the lesson is the mental model.</p>`),
    ]
});
/* ===================== TOPIC 2: PCB + states ===================== */
topics.push({
  title: 'The PCB and Process States',
  analogy: `<p>Think of a hospital. Every patient has a <b>chart</b> at the foot of the bed: name, ID number, what they are being treated for, where they are in the queue, what they are waiting for. The nurses (OS) do not remember patients, they read the chart. That chart is the <b>Process Control Block (PCB)</b>. And a patient is always in one state: <i>registered, waiting room, in the doctor's office, waiting for a lab result, discharged</i>. Those are the five process states.</p>`,
  explain: `<p>🟢 The kernel keeps one <b>PCB</b> (in Linux: <code>struct task_struct</code>) per process. It is the OS's complete record so that it can pause a process and resume it later as if nothing happened.</p>
  ${H.table(['PCB field', 'What it stores'], [
    ['PID / PPID', 'my id, my parent\'s id'],
    ['State', 'new, ready, running, waiting, terminated'],
    ['Program counter + registers', 'where I stopped and my CPU values (saved on a switch)'],
    ['Scheduling info', 'priority, time used, which queue I am in'],
    ['Memory info', 'page-table pointer, segment limits'],
    ['I/O + files', 'table of open file descriptors'],
    ['Accounting + credentials', 'CPU time used, owner (UID), signals pending']
  ])}
  <p><b>The five states</b> and how a process moves between them:</p>
  <ul><li><b>New</b>: being created, PCB being built.</li><li><b>Ready</b>: has everything it needs except the CPU. Sits in the <i>ready queue</i>.</li><li><b>Running</b>: instructions executing on a CPU core. At most one process per core.</li><li><b>Waiting (blocked)</b>: cannot continue until something happens (disk read, network packet, lock, <code>sleep</code>).</li><li><b>Terminated</b>: finished; resources freed but the PCB stays briefly until the parent reads the exit status (this is a <i>zombie</i>, next topic).</li></ul>
  <p>The legal arrows: new→ready (admitted), ready→running (scheduler dispatch), running→ready (time slice over or pre-empted), running→waiting (asks for I/O), waiting→ready (I/O done), running→terminated (exit). Note: <b>waiting→running is illegal</b>. A woken-up process must first queue as ready.</p>`,
  clues: ['"List the process states and the transitions" - draw the 5-circle diagram', '"Can a process go from waiting directly to running?" - No, it goes waiting to ready first', '"What does the OS save when switching?" - the PCB (registers, PC, stack pointer)', '"Which queue is the process in when waiting for disk?" - the device (wait) queue, not the ready queue', '"CPU-bound vs I/O-bound" - I/O-bound processes spend most time in waiting'],
  code: [{ lang: 'python', run: true, title: 'Process state machine simulator (runnable)', code: `# Legal transitions of the classic 5-state model
LEGAL = {
    ("new", "admit"): "ready",
    ("ready", "dispatch"): "running",
    ("running", "timeout"): "ready",       # pre-empted: time slice used up
    ("running", "io_wait"): "waiting",     # asked for disk/network
    ("waiting", "io_done"): "ready",       # NOT running directly!
    ("running", "exit"): "terminated",
}

class PCB:
    def __init__(self, pid):
        self.pid, self.state, self.cpu_ticks = pid, "new", 0

    def fire(self, event):
        nxt = LEGAL.get((self.state, event))
        if nxt is None:
            print(f"  PID {self.pid}: ILLEGAL '{event}' while {self.state}")
            return
        if self.state == "running":
            self.cpu_ticks += 1
        print(f"  PID {self.pid}: {self.state:10s} --{event}--> {nxt}")
        self.state = nxt

p = PCB(101)
for ev in ["admit", "dispatch", "io_wait", "dispatch", "io_done", "dispatch", "timeout", "dispatch", "exit"]:
    p.fire(ev)
print("final state:", p.state, "| times it left the CPU:", p.cpu_ticks)` }, { lang: 'cpp', title: 'A PCB sketched as a C++ struct', code: `#include <cstdint>
#include <string>
#include <vector>

enum class State { New, Ready, Running, Waiting, Terminated };

struct Registers { uint64_t pc, sp, rax, rbx, rflags; };   // saved on context switch

struct PCB {
    int pid;                       // my id
    int ppid;                      // my parent's id
    State state = State::New;      // current state
    Registers regs{};              // CPU snapshot while not running
    int priority = 20;             // scheduler input
    uint64_t cpu_ticks = 0;        // accounting
    uint64_t page_table_root = 0;  // memory-management info (CR3 on x86)
    std::vector<int> open_fds;     // file descriptor table (simplified)
    int exit_code = 0;             // kept until the parent calls wait()
};` }],
  codeTitle: ['Simulating the state machine', 'PCB as a struct'],
  viz: [{
    title: 'PCB fields filling in as a process is created',
    input: '4242',
    inputLabel: 'PID (a number)',
    gen: function (input) {
      var pid = parseInt(String(input).trim(), 10);
      if (isNaN(pid) || pid < 1 || pid > 99999) throw new Error('Enter a PID between 1 and 99999');
      var e = [], frames = [];
      function snap(narr, key) { var hl = {}; if (key) hl[key] = 'ok'; frames.push({ narr: narr, parts: [{ type: 'map', label: 'PCB of PID ' + pid, entries: e.map(function (x) { return x.slice(); }), hl: hl }] }); }
      e.push(['pid', pid]); e.push(['ppid', 1]);
      snap('The kernel allocates a PCB and gives the new process a unique <b>PID</b>. Its parent (here PID 1, the init process) is recorded too.', 'pid');
      e.push(['state', 'new']); snap('State starts as <b>new</b> while the OS is still building the process.', 'state');
      e.push(['page_table', '0x7f3a000']); snap('Memory info: the pointer to this process\'s <b>page table</b>. It decides which virtual addresses map to which RAM.', 'page_table');
      e.push(['open_fds', '0,1,2']); snap('Open files: every process starts with stdin (0), stdout (1) and stderr (2).', 'open_fds');
      e.push(['priority', 20]); snap('Scheduling info: a default priority. The scheduler reads this when choosing who runs next.', 'priority');
      e[2][1] = 'ready'; snap('Admitted! State changes to <b>ready</b>: the process now waits in the ready queue for a CPU.', 'state');
      e[2][1] = 'running'; e.push(['pc', '0x401000']); e.push(['sp', '0x7ffd1000']);
      snap('Dispatched: state is <b>running</b>. The registers (<b>pc</b>, <b>sp</b>) are live in the CPU now.', 'state');
      e[2][1] = 'waiting'; e.push(['saved_pc', '0x401a2c']);
      snap('It calls <code>read()</code> on a slow disk. The OS <b>saves the PC</b> into the PCB, marks it <b>waiting</b> and picks someone else.', 'saved_pc');
      return frames;
    }
  }, {
    title: 'State diagram: which arrow fires?',
    input: 'admit dispatch io_wait io_done dispatch exit',
    inputLabel: 'Events (admit dispatch timeout io_wait io_done exit)',
    gen: function (input) {
      var evs = String(input).trim().split(/[\s,]+/).filter(Boolean);
      if (!evs.length) throw new Error('Type events such as: admit dispatch io_wait');
      if (evs.length > 14) throw new Error('Use at most 14 events');
      var L = { 'new|admit': 'ready', 'ready|dispatch': 'running', 'running|timeout': 'ready', 'running|io_wait': 'waiting', 'waiting|io_done': 'ready', 'running|exit': 'terminated' };
      var nodes = [{ id: 'new', label: 'new', x: 8, y: 20 }, { id: 'ready', label: 'ready', x: 32, y: 20 }, { id: 'running', label: 'running', x: 62, y: 20 }, { id: 'waiting', label: 'waiting', x: 47, y: 50 }, { id: 'terminated', label: 'term', x: 90, y: 20 }];
      var edges = [['new', 'ready', 'admit'], ['ready', 'running', 'dispatch'], ['running', 'ready', 'timeout'], ['running', 'waiting', 'io_wait'], ['waiting', 'ready', 'io_done'], ['running', 'terminated', 'exit']];
      var cur = 'new', frames = [];
      function g(hl, ehl) { return { type: 'graph', label: 'Process states', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
      var h0 = {}; h0[cur] = 'cur';
      frames.push({ narr: 'Start in <b>new</b>. The amber circle is the process\'s current state.', parts: [g(h0)] });
      for (var i = 0; i < evs.length; i++) {
        var key = cur + '|' + evs[i], nx = L[key];
        if (!nx) {
          var hb = {}; hb[cur] = 'bad';
          frames.push({ narr: '<span class="c-r">Illegal:</span> <code>' + H.esc(evs[i]) + '</code> cannot happen in state <b>' + cur + '</b>. (For example a waiting process cannot be dispatched until it becomes ready.)', parts: [g(hb)] });
          return frames;
        }
        var eh = {}; eh[cur + '-' + nx] = 'ok'; var h = {}; h[nx] = 'cur';
        frames.push({ narr: 'Event <b>' + evs[i] + '</b>: ' + cur + ' &rarr; <b>' + nx + '</b>.', parts: [g(h, eh)] });
        cur = nx;
        if (cur === 'terminated') { frames.push({ narr: 'Process <b>terminated</b>. Its PCB lingers until the parent calls <code>wait()</code>.', parts: [g((function () { var q = {}; q[cur] = 'sel'; return q; })())] }); break; }
      }
      return frames;
    }
  }],
  examples: [
    { title: 'A text editor over a day', html: `<p>Most of the time the editor is <b>waiting</b> for a key press. You type: the keyboard interrupt makes it <b>ready</b>, the scheduler makes it <b>running</b> for a few microseconds, it redraws, then it is <b>waiting</b> again. That is an I/O-bound process.</p>` },
    { title: 'A video encoder', html: `<p>A CPU-bound process rarely waits. It alternates <b>running</b> and <b>ready</b>: it runs until its time slice ends (timeout), goes to the back of the ready queue, and gets dispatched again.</p>` },
    { title: 'Reading the state letters in ps', html: `${H.table(['STAT', 'Meaning'], [['R', 'running or ready (runnable)'], ['S', 'sleeping, interruptible wait'], ['D', 'uninterruptible sleep (usually disk I/O)'], ['T', 'stopped (Ctrl+Z / SIGSTOP)'], ['Z', 'zombie (terminated, not yet reaped)']])}<p>Run <code>ps aux</code> and look at the STAT column.</p>` }
  ],
  deepDive: `<p>🟣 <b>Real systems have more states.</b> Linux tracks TASK_RUNNING (covers both ready and running), TASK_INTERRUPTIBLE (waiting, wakes on signals), TASK_UNINTERRUPTIBLE (the "D" state: even <code>kill -9</code> cannot wake it until the I/O finishes, which is why a hung NFS mount makes processes unkillable), TASK_STOPPED, and EXIT_ZOMBIE. Operating-system textbooks add <b>suspended-ready</b> and <b>suspended-wait</b> for processes swapped out to disk.</p>
  <p><b>Queues, not magic.</b> The ready queue is a data structure of PCB pointers (per-CPU run queues, a red-black tree in CFS). Each device or lock has its own wait queue. A state change is literally moving a PCB from one queue to another.</p>
  <p><b>The PCB in Linux.</b> <code>task_struct</code> is several kilobytes and holds pointers to <code>mm_struct</code> (memory), <code>files_struct</code> (fd table), <code>signal_struct</code>, credentials and more. A thread is also a <code>task_struct</code>; that is why Linux calls everything a "task". Load average counts tasks in R and D states, a classic interview trap: high load with idle CPU means many tasks stuck in D (I/O).</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI agents are processes too. An agent loop spends most of its life <b>waiting</b> (on an LLM API call or a tool), so one machine can host hundreds of them: they are I/O-bound, like web servers.</p>
  <p><b>Use AI as a partner:</b> paste a <code>ps -eo pid,stat,wchan,cmd</code> or <code>top</code> screenshot and ask "which of these are blocked and on what?". Ask it to generate a state-machine test for your own scheduler simulator, then review the illegal transitions.</p>
  <p><b>Where AI goes wrong:</b> models often draw the diagram with a waiting-to-running arrow or forget that a running process can be pre-empted back to ready. They also mix up "blocked" and "zombie".</p>
  <p><b>What you must still own:</b> the exact set of legal transitions and the reasoning behind each, since every scheduling and synchronisation question in later modules builds on them.</p>`,
  problems: [
    P('Which Transition?', 'Easy', ['process states'],
      `<p>A process is running and calls <code>read()</code> on a file whose data is not in memory. The disk finishes after 5 ms. Write the sequence of states the process passes through until it is running again.</p>`,
      `<p>${H.c('g', 'running &rarr; waiting &rarr; ready &rarr; running')}. The middle step "ready" is the one students forget.</p>`,
      `<p>Answer "running, waiting, running" skips the ready queue. Even if the CPU is idle, the scheduler still has to dispatch the process.</p>`,
      { q: 'After the disk interrupt, the process goes to:', options: ['Running directly', 'Ready', 'New', 'Terminated'], answer: 1, explain: 'It becomes ready and waits for the scheduler.' },
      ['<p>Hint 1: who has the CPU while the disk is busy?</p>', '<p>Hint 2: the disk interrupt only says "data is here", it does not choose who runs.</p>', '<p>Hint 3: waiting to ready (io_done), then ready to running (dispatch).</p>'],
      `<p>When read() needs the disk, the kernel starts the I/O, puts the process into the device wait queue and marks it <b>waiting</b>; the scheduler gives the CPU to another ready process. When the disk raises an interrupt, the handler moves the PCB from the wait queue to the ready queue, so the state becomes <b>ready</b>. Only when the scheduler picks it does it become <b>running</b> again. So: running, waiting, ready, running. The ready step can take microseconds on an idle machine or many milliseconds on a busy one, which is why latency is not just disk time.</p>`,
      `<p>No computation; understanding of 3 transitions.</p>`)
  ]
});

/* ===================== TOPIC 3: fork/exec/wait ===================== */
topics.push({
  title: 'fork, exec, wait: Zombies and Orphans',
  analogy: `<p><b>fork()</b> is a photocopier: it photocopies the whole worker (a clone with the same memory and the same place in the script). <b>exec()</b> is giving the clone a brand-new job description: it forgets its old script and starts a different one. <b>wait()</b> is a parent collecting the clone's final report card. If the clone finishes and the parent never collects the report, the clone is a ghost still on the payroll: a <b>zombie</b>. If the parent quits first, the clone is an <b>orphan</b> and gets adopted by the company (init/systemd).</p>`,
  explain: `<p>🟢 In Unix every process (except the first) is created by another process using <code>fork()</code>.</p>
  <ul><li><b>fork()</b> creates a child that is an almost exact copy of the parent: same code, same variables, same open files, same next line to run. It returns <b>twice</b>: in the parent it returns the child's PID; in the child it returns <b>0</b>; on failure it returns -1 (in the parent only).</li>
  <li><b>exec()</b> family (<code>execl</code>, <code>execvp</code>...) <i>replaces</i> the current process image with a new program. Same PID, new code, data, heap, stack. It only returns if it fails.</li>
  <li><b>wait() / waitpid()</b> makes the parent block until a child ends and then collects its exit status.</li></ul>
  <p>The shell does exactly this for every command you type: fork, child execs <code>ls</code>, parent waits.</p>
  <p><b>Zombie</b> = child has terminated but the parent has not called wait yet. It uses no CPU or memory except its PCB entry (shows as <code>Z</code>/<code>&lt;defunct&gt;</code>). Fix: call <code>wait</code>/<code>waitpid</code>, or ignore <code>SIGCHLD</code>. <b>Orphan</b> = parent died while the child is still running; the kernel re-parents it to PID 1, which will reap it.</p>
  <p><b>How many processes?</b> Calling fork() n times in a row, with all processes continuing, creates <b>2<sup>n</sup></b> processes in total, so 2<sup>n</sup> − 1 new children. Each fork doubles the number of processes that are alive.</p>`,
  clues: ['"How many processes are created by this code?" - count forks: n unconditional forks = 2<sup>n</sup> total', '"fork returns 0 in ..." - child; positive PID - parent; -1 - error', '"defunct" / "Z" in ps - zombie; parent forgot wait()', '"Child keeps running after parent exits" - orphan, adopted by init/systemd', '"Output appears twice" - stdout buffer was copied by fork before flushing'],
  code: [{ lang: 'cpp', title: 'fork + exec + waitpid (what a shell does)', code: `#include <cstdio>
#include <cstdlib>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    pid_t pid = fork();                 // clone this process
    if (pid < 0) {                      // fork failed (out of processes/memory)
        perror("fork");
        return 1;
    }
    if (pid == 0) {
        // ---- CHILD: replace myself with "ls -l" ----
        execlp("ls", "ls", "-l", (char*)nullptr);
        perror("execlp");               // only reached if exec FAILED
        _exit(127);                     // _exit: do not flush the parent's copied buffers
    }
    // ---- PARENT: wait for that child and read how it ended ----
    int status = 0;
    pid_t done = waitpid(pid, &status, 0);   // blocks; also reaps the zombie
    if (done == pid && WIFEXITED(status))
        printf("child %d exited with code %d\\n", (int)done, WEXITSTATUS(status));
    return 0;
}` }, { lang: 'cpp', title: 'Zombie and the fix', code: `#include <cstdio>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    pid_t pid = fork();
    if (pid == 0) {            // child finishes instantly
        _exit(0);
    }
    // BUG VERSION: parent sleeps without wait() -> child is a zombie (<defunct>) for 30 s
    // sleep(30);

    // FIX 1: reap the child (blocking)
    waitpid(pid, nullptr, 0);

    // FIX 2 (for servers with many children): loop and reap without blocking
    // while (waitpid(-1, nullptr, WNOHANG) > 0) { }

    sleep(1);                  // now 'ps' shows no zombie
    return 0;
}` }, { lang: 'cpp', title: 'fork in a loop - how many processes?', code: `#include <cstdio>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    for (int i = 0; i < 3; i++) {
        fork();                // every existing process forks: 1 -> 2 -> 4 -> 8
    }
    printf("hello from %d\\n", (int)getpid());   // printed 2^3 = 8 times
    while (wait(nullptr) > 0) {}                 // each process reaps its own children
    return 0;
}` }, { lang: 'python', run: true, title: 'Count a fork tree without forking (runnable)', code: `# Simulate: for i in range(n): fork()  -> every live process forks each round.
def fork_loop(n):
    procs = ["P0"]                 # names of live processes
    parent_of = {}
    counter = 1
    for i in range(n):
        for p in list(procs):      # snapshot: each existing process forks once
            child = "P%d" % counter
            counter += 1
            parent_of[child] = p
            procs.append(child)
        print("after fork #%d: %2d processes alive" % (i + 1, len(procs)))
    return procs, parent_of

def fork_if_child_check(n):
    # Common trap: "if (fork() == 0) ..." only the PARENT keeps looping
    total = 1
    for _ in range(n):
        total += 1                 # parent forks one child; the child leaves the loop
    return total

procs, par = fork_loop(4)
print("total:", len(procs), "= 2^4 =", 2 ** 4)
print("children of P0:", [c for c, p in par.items() if p == "P0"])
print("with if(fork()==0) break:", fork_if_child_check(4), "processes (n+1)")` }],
  codeTitle: ['Shell-style fork/exec/wait', 'Reaping zombies', 'Fork inside a loop', 'Fork-tree counter'],
  viz: [{
    title: 'fork() in a loop: the process tree doubles',
    input: '3',
    inputLabel: 'Loop count n (1 to 3)',
    gen: function (input) {
      var n = parseInt(String(input).trim(), 10);
      if (isNaN(n) || n < 1 || n > 3) throw new Error('Enter n between 1 and 3');
      var frames = [], names = [];
      // level-order binary tree: node k splits into 2k+1 (parent continues) and 2k+2 (new child)
      var total = Math.pow(2, n + 1) - 1;
      function label(k) { return 'p' + k; }
      frames.push({ narr: 'Code: <code>for (i=0; i&lt;' + n + '; i++) fork();</code>. We start with ONE process.', parts: [{ type: 'tree', label: 'Process tree (left = parent continues, right = new child)', arr: ['P'], hl: { 0: 'cur' } }] });
      for (var lvl = 1; lvl <= n; lvl++) {
        var cnt = Math.pow(2, lvl + 1) - 1, arr = [], hl = {}, ehl = {};
        for (var k = 0; k < cnt; k++) { arr.push(k === 0 ? 'P' : (k % 2 === 1 ? 'par' : 'kid')); }
        var firstNew = Math.pow(2, lvl) - 1;
        for (var j = firstNew; j < cnt; j++) { hl[j] = 'ok'; }
        for (var q = 0; q < Math.pow(2, lvl) - 1; q++) { hl[q] = 'done'; }
        frames.push({ narr: 'Iteration <b>i=' + (lvl - 1) + '</b>: every live process calls <code>fork()</code>. Each one stays (left) and spawns a child (right), so the count goes from <b>' + Math.pow(2, lvl - 1) + '</b> to <b>' + Math.pow(2, lvl) + '</b>.', parts: [
          { type: 'tree', label: 'Process tree after fork #' + lvl, arr: arr, hl: hl },
          { type: 'vars', vals: { 'alive': Math.pow(2, lvl), 'children created so far': Math.pow(2, lvl) - 1 }, hl: { alive: 'ok' } }] });
      }
      frames.push({ narr: 'After the loop <b>' + Math.pow(2, n) + ' processes</b> (the leaves) each run the line after the loop. Formula: 2<sup>n</sup> total, 2<sup>n</sup> &minus; 1 children.', parts: [{ type: 'vars', vals: { n: n, 'total processes': Math.pow(2, n), 'new children': Math.pow(2, n) - 1 }, hl: { 'total processes': 'sel' } }] });
      return frames;
    }
  }, {
    title: 'fork + printf buffering: why "hello" prints twice',
    input: 'tty',
    inputLabel: 'Output goes to: tty or pipe',
    gen: function (input) {
      var mode = String(input).trim().toLowerCase();
      if (mode !== 'tty' && mode !== 'pipe') throw new Error('Type tty or pipe');
      var tty = mode === 'tty', frames = [];
      var code = 'printf("hello");   // no newline\nfork();\nprintf("world\\n");';
      function parts(pbuf, cbuf, out, hl) { return [{ type: 'code', label: 'Program', lang: 'cpp', code: code, hl: hl || {} }, { type: 'map', label: 'stdout buffers', entries: [['parent buffer', pbuf], ['child buffer', cbuf]] }, { type: 'text', html: '<b>Terminal / file shows:</b> <code>' + out + '</code>' }]; }
      frames.push({ narr: 'Output is going to a <b>' + (tty ? 'terminal (line-buffered)' : 'pipe or file (fully buffered)') + '</b>. This changes everything.', parts: parts('(empty)', '(no child yet)', '', {}) });
      if (tty) {
        frames.push({ narr: '<code>printf("hello")</code> has no newline, so even a terminal keeps "hello" in the buffer.', parts: parts('hello', '(no child yet)', '', { 1: 'cur' }) });
        frames.push({ narr: '<b>fork()</b> copies the process <b>including the unflushed buffer</b>. Now BOTH have "hello" waiting.', parts: parts('hello', 'hello', '', { 2: 'cur' }) });
        frames.push({ narr: '<code>printf("world\\n")</code> in each process adds "world" and the newline flushes the line.', parts: parts('(flushed)', '(flushed)', 'helloworld  helloworld', { 3: 'ok' }) });
        frames.push({ narr: 'Result: <b>helloworld</b> printed twice. The "hello" was duplicated because it was still sitting in the buffer at fork time. Fix: <code>fflush(stdout)</code> before fork().', parts: parts('(empty)', '(empty)', 'helloworld  helloworld', {}) });
      } else {
        frames.push({ narr: 'With a pipe or file, stdout is <b>fully buffered</b> (4 KB or so): nothing is written until the buffer fills or the program exits.', parts: parts('hello', '(no child yet)', '', { 1: 'cur' }) });
        frames.push({ narr: '<b>fork()</b> copies the buffer. Both contain "hello".', parts: parts('hello', 'hello', '', { 2: 'cur' }) });
        frames.push({ narr: 'Both print "world\\n" - still no flush because a newline does not flush a fully-buffered stream.', parts: parts('helloworld\\n', 'helloworld\\n', '', { 3: 'cur' }) });
        frames.push({ narr: 'At exit each process flushes its own copy: the output has <b>helloworld</b> twice, never interleaved mid-word. Same visible answer, but only because of the exit flush.', parts: parts('(flushed at exit)', '(flushed at exit)', 'helloworld  helloworld', { 3: 'ok' }) });
      }
      return frames;
    }
  }],
  examples: [
    { title: 'Predict the output', html: `<p>What does this print?</p><pre>printf("A\\n");
if (fork() == 0) printf("B\\n");
else printf("C\\n");
printf("D\\n");</pre><p>"A" once (before the fork). Then parent prints C, D and child prints B, D. So A, then {B,D} and {C,D} in two streams: the order between parent and child is <b>not guaranteed</b> (the scheduler decides). Valid: A C D B D, A B D C D, A B C D D...</p>` },
    { title: 'fork bomb in one line', html: `<p><code>:(){ :|:&amp; };:</code> in bash defines a function that calls itself twice in the background: exponential growth, until the process table is full. Defence: <code>ulimit -u</code> (max user processes) and cgroups' <code>pids.max</code>.</p>` },
    { title: 'Orphan adoption', html: `<p>Parent prints its PID and exits immediately while the child sleeps 10 s. Run <code>ps -o pid,ppid,cmd</code> in the meantime: the child's PPID is now <b>1</b> (or a "subreaper"). Nothing is wrong; the child continues normally.</p>`, code: { lang: 'cpp', title: 'Make an orphan', code: `#include <cstdio>
#include <unistd.h>

int main() {
    if (fork() == 0) {
        sleep(10);                                   // child outlives parent
        printf("child's parent is now %d\\n", (int)getppid());  // usually 1
        return 0;
    }
    return 0;                                        // parent exits at once
}` } },
    { title: 'Shell redirection is just dup2 between fork and exec', html: `<p>For <code>ls &gt; out.txt</code> the shell forks, the child opens <code>out.txt</code>, calls <code>dup2(fd, 1)</code> so stdout points at the file, then calls <code>exec("ls")</code>. The exec keeps the open files, so <code>ls</code> writes to the file without knowing.</p>` }
  ],
  deepDive: `<p>🟣 <b>Copy-on-write (COW).</b> Copying gigabytes at fork would be absurd. Modern kernels copy only the page tables and mark all pages read-only and shared. The first write by either process triggers a page fault and the kernel copies just that one page. That is why fork+exec of a huge process is fast, and why Redis' background save (<code>fork</code> then write snapshot) works: the child sees a frozen snapshot while the parent keeps changing data, paying memory only for the pages that change.</p>
  <p><b>vfork / posix_spawn / clone.</b> When the child will immediately exec, <code>posix_spawn</code> (or <code>vfork</code>) avoids even copying page tables. Linux implements fork, vfork and thread creation all on <code>clone()</code>, with flags choosing what is shared (memory, files, signal handlers).</p>
  <p><b>Zombie details.</b> A zombie holds only the PCB, PID and exit status. You cannot <code>kill</code> it because it is already dead; you fix it by making the parent wait, or by killing the parent so init adopts and reaps it. Servers install a <code>SIGCHLD</code> handler or set <code>SA_NOCLDWAIT</code>. Containers: PID 1 inside a container must reap orphans; otherwise zombies pile up. Use <code>tini</code> / <code>docker run --init</code>.</p>
  <p><b>Safety.</b> In a multithreaded program, only async-signal-safe functions may be used between fork and exec in the child (another thread may have held the malloc lock at fork time, leaving it locked forever in the child). Also mixing fork with stdio buffering as shown can duplicate output; <code>_exit</code> in the child avoids flushing copied buffers.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI coding agents run your tests and tools by spawning subprocesses all day (<code>subprocess.run</code>, shell commands). Knowing fork/exec/wait explains their failure modes: leftover zombies, hung children, lost exit codes, and processes outliving a cancelled job.</p>
  <p><b>Use AI as a partner:</b> ask it to "write 5 different fork-in-a-loop snippets and give the process count; I will predict first, then you check". Or paste <code>ps</code> output with <code>&lt;defunct&gt;</code> and ask for the likely missing <code>wait</code>.</p>
  <p><b>Where AI goes wrong:</b> it frequently miscounts processes when a loop contains <code>if (fork()==0) break;</code> or an <code>&amp;&amp;</code> condition (<code>fork() &amp;&amp; fork()</code> is a favourite trap, giving 3 processes in total, not 4), and it forgets buffering effects. Always draw the tree.</p>
  <p><b>What you must still own:</b> reasoning about return values (0 vs PID), COW, and cleanup (wait, process groups, signals) for any agent or sandbox that spawns children.</p>`,
  problems: [
    P('Count the Processes', 'Medium', ['fork', 'process tree'],
      `<p>How many processes (including the original) exist after this runs, and how many lines "X" are printed?</p><pre>fork();
fork();
if (fork() == 0) fork();
printf("X\\n");</pre>`,
      `<p>Start 1 &rarr; after first fork 2 &rarr; after second fork 4 &rarr; third fork: 8 processes, then only the 4 new children (return value 0) fork again: +4 = <b>12</b> processes, so <b>12</b> lines "X".</p>`,
      `<p>Trying to run it and count lines is fine, but you must be able to reason it out: guessing 2<sup>4</sup> = 16 forgets that the last fork is conditional.</p>`,
      { q: 'fork(); fork(); fork(); creates how many processes in total?', options: ['3', '6', '8', '9'], answer: 2, explain: '2^3 = 8 including the original.' },
      ['<p>Hint 1: each unconditional fork doubles the number of live processes.</p>', '<p>Hint 2: the condition fork()==0 is true only in the newly created children of the third fork.</p>', '<p>Hint 3: after 3 forks there are 8 processes, 4 of them are third-fork children; those 4 fork again, giving 8 + 4.</p>'],
      `<p>Track the number of live processes line by line. After the first <code>fork()</code> there are 2 processes (parent and child). After the second, every one of them forks, so 4. The third fork is also done by all 4, so 8 processes now exist, and each of the 4 new ones got return value 0 while the 4 older ones got a positive PID. The statement <code>if (fork() == 0) fork();</code> therefore makes only the 4 children (the ones with 0) fork once more, adding 4 more processes. Every one of the 12 processes then executes the printf, so "X" is printed 12 times. Total new children: 11.</p>`,
      `<p>Counting is O(number of forks); the tree has at most 12 nodes.</p>`,
      ['What if the printf was inside the if?', 'How would you make parent print last?'])
  ]
});
/* ===================== TOPIC 4: threads vs processes ===================== */
topics.push({
  title: 'Threads vs Processes: What Is Shared, What Is Private',
  analogy: `<p>A process is a <b>house</b>; threads are the <b>people living in it</b>. All of them share the kitchen, the fridge and the Wi-Fi (heap, globals, open files), but each person has their own bedroom and diary (stack and registers). Two people in one house cooperate cheaply (just shout across the room) but one person setting the kitchen on fire hurts everyone. Different houses (processes) are safe from each other, but talking requires a phone call (IPC).</p>`,
  explain: `<p>🟢 A <b>thread</b> is one independent path of execution inside a process. Every process starts with one thread (the main thread) and can create more.</p>
  ${H.table(['', 'Shared by all threads of a process', 'Private to each thread'], [
    ['Memory', 'code (text), global/static data, <b>heap</b>', 'its own <b>stack</b>, thread-local storage'],
    ['CPU state', '-', 'program counter, registers, stack pointer, thread id'],
    ['OS resources', 'open files, sockets, signal handlers, PID, current directory', 'signal mask, errno, scheduling priority']
  ])}
  <p><b>Processes vs threads at a glance:</b></p>
  ${H.table(['', 'Process', 'Thread'], [
    ['Creation cost', 'heavy (new address space, PCB, page tables)', 'light (new stack + small control block)'],
    ['Communication', 'needs IPC (pipes, sockets, shared memory)', 'just read/write shared variables (needs locks!)'],
    ['Isolation', 'strong: a crash stays inside', 'weak: one bad pointer can kill all threads'],
    ['Context switch', 'slower (switch address space, TLB flush)', 'faster (same address space)']
  ])}
  <p>The big danger of threads: because they share memory, two threads touching the same variable can corrupt it (<b>race condition</b>). Locks fix that, but bring their own problems (deadlock, contention), covered in the Synchronization module.</p>
  <p><b>Choosing:</b> a <b>web server</b> handling thousands of short connections often uses threads (or an event loop) since requests share caches and connection pools cheaply. A <b>browser</b> uses a process per tab so that a crashing or malicious page cannot take down the other tabs or read their data: isolation matters more than memory savings.</p>`,
  clues: ['"Which is lighter: process or thread?" - thread; shares address space', '"What do threads of the same process share?" - code, data, heap, files; not stacks/registers', '"Why does Chrome use a process per tab?" - isolation and security, crash containment', '"Shared counter gives wrong total" - race condition, needs a mutex or atomic', '"Need to use all CPU cores in C++/Java" - threads (or multiple processes in Python because of the GIL)'],
  code: [{ lang: 'cpp', title: 'std::thread: shared counter, private locals', code: `#include <thread>
#include <mutex>
#include <vector>
#include <cstdio>

int shared_total = 0;          // lives in DATA: visible to every thread
std::mutex m;                  // protects shared_total

void worker(int id, int n) {
    int local = 0;             // lives on THIS thread's private stack
    for (int i = 0; i < n; i++) local++;
    std::lock_guard<std::mutex> lock(m);   // without this, += races
    shared_total += local;
    printf("thread %d added %d\\n", id, local);
}

int main() {
    std::vector<std::thread> pool;
    for (int id = 0; id < 4; id++) pool.emplace_back(worker, id, 1000);
    for (auto& t : pool) t.join();         // wait for all, like waitpid for processes
    printf("total = %d\\n", shared_total);  // always 4000 with the mutex
    return 0;
}` }, { lang: 'cpp', title: 'The same idea with pthreads (POSIX)', code: `#include <pthread.h>
#include <cstdio>

static int counter = 0;                                   // shared global
static pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;

void* work(void* arg) {
    int n = *(int*)arg;                                   // arg points into main's stack
    for (int i = 0; i < n; i++) {
        pthread_mutex_lock(&lock);
        counter++;
        pthread_mutex_unlock(&lock);
    }
    return nullptr;
}

int main() {
    pthread_t t1, t2;
    int n = 5000;
    pthread_create(&t1, nullptr, work, &n);
    pthread_create(&t2, nullptr, work, &n);
    pthread_join(t1, nullptr);
    pthread_join(t2, nullptr);
    printf("counter = %d\\n", counter);                    // 10000
    return 0;
}` }, { lang: 'python', run: true, title: 'Race condition simulated deterministically (runnable)', code: `# Real threads are not available in the browser, so we replay the exact interleaving
# of "counter += 1" = LOAD, ADD, STORE for two threads to show the lost update.
counter = 0
steps = [("A", "load"), ("B", "load"), ("A", "add"), ("B", "add"), ("A", "store"), ("B", "store")]
reg = {"A": 0, "B": 0}
for who, op in steps:
    if op == "load":
        reg[who] = counter
    elif op == "add":
        reg[who] += 1
    else:
        counter = reg[who]
    print(f"thread {who}: {op:5s} -> reg={reg[who]} shared counter={counter}")
print("expected 2 but got", counter, "(lost update!)")` }],
  codeTitle: ['std::thread with mutex', 'pthread version', 'Why a lock is needed'],
  viz: [{
    title: 'Threads share the heap, own their stacks',
    input: '3',
    inputLabel: 'Number of threads (1 to 4)',
    gen: function (input) {
      var n = parseInt(String(input).trim(), 10);
      if (isNaN(n) || n < 1 || n > 4) throw new Error('Enter 1 to 4 threads');
      var cols = ['Process-wide'], i;
      for (i = 1; i <= n; i++) cols.push('Thread ' + i);
      var rowHead = ['Code (text)', 'Globals / heap', 'Open files', 'Stack', 'Registers + PC'];
      function row(a, b, c, d, e) { return [a, b, c, d, e]; }
      function mk(stage) {
        var rows = [];
        for (var r = 0; r < 5; r++) rows.push([]);
        // col 0: process-wide
        rows[0].push('one copy'); rows[1].push(stage >= 2 ? 'x = 42' : 'x = 0'); rows[2].push('fd 0,1,2,5'); rows[3].push('-'); rows[4].push('-');
        for (var t = 1; t <= n; t++) {
          rows[0].push('shared'); rows[1].push('shared'); rows[2].push('shared');
          rows[3].push(stage >= 1 ? 'own: t' + t + ' locals' : 'own'); rows[4].push('own: pc/sp ' + t);
        }
        return rows;
      }
      var hl = {};
      function H1(rs) { var h = {}; rs.forEach(function (c) { h[c] = 'ok'; }); return h; }
      var frames = [];
      frames.push({ narr: 'One process, <b>' + n + '</b> threads. Columns are the process and each thread. Read across a row to see if something is shared.', parts: [{ type: 'grid', label: 'Who owns what', rowHead: rowHead, colHead: cols, rows: mk(0), hl: {} }] });
      var h2 = {}; for (i = 1; i <= n; i++) { h2['0,' + i] = 'ok'; h2['1,' + i] = 'ok'; h2['2,' + i] = 'ok'; }
      frames.push({ narr: 'Green cells are <b>shared</b>: same code, same globals and heap, same open files. All threads see the very same bytes.', parts: [{ type: 'grid', label: 'Who owns what', rowHead: rowHead, colHead: cols, rows: mk(0), hl: h2 }] });
      var h3 = {}; for (i = 1; i <= n; i++) { h3['3,' + i] = 'sel'; h3['4,' + i] = 'sel'; }
      frames.push({ narr: 'Purple cells are <b>private</b>: every thread has its own stack (locals, call chain) and its own registers and program counter. That is what makes them separate flows of control.', parts: [{ type: 'grid', label: 'Who owns what', rowHead: rowHead, colHead: cols, rows: mk(1), hl: h3 }] });
      var h4 = { '1,0': 'cur', '1,1': 'cur' };
      frames.push({ narr: 'Thread 1 executes <code>x = 42</code>. Because <code>x</code> is in shared memory, the change is immediately visible to thread ' + (n > 1 ? '2' : '1') + ' too. No copy, no message: this is why threads cooperate cheaply... and why you need locks.', parts: [{ type: 'grid', label: 'Who owns what', rowHead: rowHead, colHead: cols, rows: mk(2), hl: h4 }] });
      var nodes = [{ id: 'P', label: 'Process', x: 10, y: 25, shape: 'box' }, { id: 'H', label: 'Heap + globals (shared)', x: 50, y: 6, shape: 'box', w: 30 }];
      var edges = [['P', 'H']];
      for (i = 1; i <= n; i++) { nodes.push({ id: 'T' + i, label: 'Thread ' + i + ' (own stack)', x: 55, y: 6 + i * 11, shape: 'box', w: 26 }); edges.push(['P', 'T' + i]); edges.push(['T' + i, 'H']); }
      frames.push({ narr: 'Same picture as a diagram: every thread arrow points to the same heap, but each thread carries its own stack.', parts: [{ type: 'graph', label: 'Threads and the shared heap', directed: true, height: 62, nodes: nodes, edges: edges, hl: { H: 'sel' } }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Web server: threads or processes?', html: `<p>Many short requests, all needing the same in-memory cache and DB connection pool: <b>threads</b> (or an async event loop). Old Apache "prefork" used one process per connection: safer, but memory hungry. Nginx uses a few single-threaded worker processes each with an event loop.</p>` },
    { title: 'Browser: process per tab', html: `<p>Chrome gives each site its own renderer process plus a GPU process and a network process. If a tab hits a bug or runs hostile JavaScript, the OS-level wall keeps it away from your banking tab. The cost: more RAM per tab. A threaded design would be lighter but a single memory corruption could expose everything.</p>` },
    { title: 'Counting the stacks', html: `<p>A process with 100 threads reserves 100 stacks. At 8 MB virtual each that is 800 MB of address space (not RAM, since pages are lazy). With 10,000 threads you hit limits; that is why high-concurrency servers move to event loops or lightweight tasks (goroutines, virtual threads).</p>` }
  ],
  deepDive: `<p>🟣 <b>On Linux a thread is a process that shares things.</b> <code>pthread_create</code> calls <code>clone()</code> with <code>CLONE_VM | CLONE_FILES | CLONE_FS | CLONE_SIGHAND | CLONE_THREAD</code>. There is no separate "thread" concept in the kernel, just tasks that happen to share an <code>mm_struct</code>. Threads of one process share the same TGID (what <code>getpid()</code> returns) but each has its own TID.</p>
  <p><b>Costs people forget.</b> Thread creation is roughly 10-50 microseconds; process creation with fork+exec several hundred microseconds to milliseconds. Even more important: shared writes to the same cache line by different cores cause <b>false sharing</b> and cache-line ping-pong, so more threads can be slower.</p>
  <p><b>Language runtimes.</b> Python's GIL means threads do not run Python bytecode in parallel (use multiprocessing for CPU work); Java 21 virtual threads multiplex millions of cheap tasks over a few OS threads; Go goroutines are M:N scheduled (next topic). Node.js uses one main thread plus worker threads and a libuv pool.</p>
  <p><b>Failure modes.</b> A segfault in any thread kills the whole process. Calling <code>fork()</code> in a multithreaded program duplicates only the calling thread, a classic source of deadlocks. Thread-local storage (<code>thread_local</code>) gives each thread its own copy of a global.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> inference servers are an excellent threads-vs-processes case study. Model weights are huge, so serving stacks run <b>one process per GPU</b> with many threads or async tasks handling requests inside it; weights stay loaded once. Training frameworks use a process per GPU (data parallel) and communicate by NCCL, a form of IPC.</p>
  <p><b>Use AI as a partner:</b> ask "review this C++ for data races and tell me which variables are shared between threads"; run ThreadSanitizer (<code>-fsanitize=thread</code>) to confirm every claim.</p>
  <p><b>Where AI goes wrong:</b> generated multithreaded code often looks right but forgets a lock on one path, or captures a loop variable by reference into a detached thread. It also says "threads are always faster", which is false for CPU work in Python or with heavy lock contention.</p>
  <p><b>What you must still own:</b> deciding the isolation boundary (thread vs process vs container) from the failure and security requirements, and proving shared state is protected.</p>`,
  problems: [
    P('Thread or Process?', 'Medium', ['design', 'threads vs processes'],
      `<p>For each system, choose threads, processes or a mix and justify: (a) an image-resizing service that handles uploads in parallel, (b) a PDF viewer plug-in sandbox that opens untrusted files, (c) a game with physics, AI and audio running at once, (d) a Python CPU-heavy data job.</p>`,
      `<p>(a) threads or a worker pool; (b) separate low-privilege process; (c) threads sharing the world state; (d) multiple processes (GIL).</p>`,
      `<p>"Always use threads because they are lighter" ignores isolation (b) and the Python GIL (d).</p>`,
      { q: 'Untrusted file parsing should run in:', options: ['A thread of the main app', 'A separate sandboxed process', 'The kernel', 'The same stack'], answer: 1, explain: 'A crash or exploit stays inside the process boundary.' },
      ['<p>Hint 1: ask "what is shared and do I want it shared?"</p>', '<p>Hint 2: untrusted or crash-prone code wants a process boundary.</p>', '<p>Hint 3: CPU-bound Python needs processes because of the GIL; C++ game loops want shared memory and low latency.</p>'],
      `<p>(a) The resizer is CPU and I/O mixed, tasks are independent and short. A thread pool (sized near the number of cores) shares configuration and a small cache with little overhead; if each resize uses a native library that might crash, run workers as processes for containment. (b) Use a separate process with reduced privileges (seccomp, no network, no file access beyond the input), exactly like browser renderers: if the parser is exploited, the attacker only owns that sandbox. (c) A game wants physics, AI and audio to read the same world state with microsecond latency, so threads in one process, with careful synchronisation or message queues between subsystems. (d) In CPython the GIL prevents parallel bytecode execution, so use multiprocessing (or native code that releases the GIL) to use all cores; share big arrays through shared memory. The general rule: threads for cooperation and speed, processes for isolation and fault containment.</p>`,
      `<p>Not algorithmic; reasoning about trade-offs.</p>`, ['How would the answer change with containers?', 'What if (a) must survive one image crashing the worker?'])
  ]
});

/* ===================== TOPIC 5: user vs kernel threads ===================== */
topics.push({
  title: 'User vs Kernel Threads: 1:1, N:1, M:N',
  analogy: `<p>Imagine a restaurant. <b>Kernel threads</b> are the real waiters the manager (OS) knows about and assigns to tables on different floors. <b>User threads</b> are tasks a single waiter juggles in their head ("table 5 wants water, table 6 wants the bill") using their own notes - the manager does not even know those tasks exist. If that one waiter gets stuck in the kitchen waiting for a dish, <i>all</i> the tasks in their head freeze, even if other waiters are idle.</p>`,
  explain: `<p>🟢 Who manages the thread: the OS kernel or a library in user space?</p>
  <ul><li><b>Kernel-level threads (KLT)</b>: the kernel knows each thread and schedules it on a CPU core. Real parallelism on multiple cores; if one thread blocks in a system call, others keep running. Creating and switching costs a system call.</li>
  <li><b>User-level threads (ULT)</b>: a library (green threads, fibers, coroutines) switches between threads entirely in user space by saving/restoring registers. Super cheap switches, no kernel entry. But the kernel sees just <b>one</b> thread, so no multi-core parallelism and one blocking system call can freeze everything.</li></ul>
  <p><b>Mapping models</b> (user threads : kernel threads):</p>
  ${H.table(['Model', 'Mapping', 'Pros', 'Cons', 'Examples'], [
    ['<b>1:1</b>', 'each user thread = one kernel thread', 'true parallelism, blocking is safe', 'heavier; limit on thread count', 'Linux pthreads, Windows, Java platform threads, C++ std::thread'],
    ['<b>N:1</b>', 'many user threads on one kernel thread', 'very cheap switches', 'no parallelism; one block stalls all', 'old GNU Pth, early Java green threads'],
    ['<b>M:N</b>', 'M user threads multiplexed on N kernel threads', 'cheap and parallel', 'complex scheduler', 'Go goroutines, Erlang processes, Java 21 virtual threads, Tokio tasks']
  ])}
  <p>Today's rule of thumb: the OS gives you <b>1:1</b>, and modern runtimes build a cheap <b>M:N</b> layer on top for huge concurrency.</p>`,
  clues: ['"What happens if a user-level thread makes a blocking system call?" - whole process blocks (N:1)', '"Many-to-many" / "M:N" - goroutines, virtual threads', '"Millions of concurrent tasks" - user-level scheduling, not 1:1 OS threads', '"Thread creation needs a system call" - kernel threads; library call only - user threads', '"True parallelism on multi-core" - needs kernel-visible threads'],
  code: [{ lang: 'cpp', title: 'Cheap user-level switching with ucontext (cooperative)', code: `#include <ucontext.h>
#include <cstdio>

static ucontext_t main_ctx, task_ctx;
static char task_stack[64 * 1024];            // its own tiny stack, allocated by us

void task() {
    printf("task: step 1\\n");
    swapcontext(&task_ctx, &main_ctx);        // yield: save my registers, resume main (no syscall to the scheduler)
    printf("task: step 2\\n");
}                                             // returning resumes uc_link (main)

int main() {
    getcontext(&task_ctx);
    task_ctx.uc_stack.ss_sp = task_stack;
    task_ctx.uc_stack.ss_size = sizeof(task_stack);
    task_ctx.uc_link = &main_ctx;
    makecontext(&task_ctx, task, 0);

    printf("main: start task\\n");
    swapcontext(&main_ctx, &task_ctx);        // run task until it yields
    printf("main: task yielded, doing other work\\n");
    swapcontext(&main_ctx, &task_ctx);        // let it finish
    printf("main: done\\n");
    return 0;
}` }, { lang: 'python', run: true, title: 'M:N scheduling idea with generators (runnable)', code: `# 6 user-level "tasks" (generators) multiplexed on 2 "kernel threads" (workers).
# A task yields when it would block; the runtime then runs another task on that worker.
def task(name, steps):
    for s in range(steps):
        yield f"{name} step {s + 1}"        # yield = voluntary switch (cheap!)

tasks = [task(f"T{i}", 2) for i in range(6)]
workers = {"W1": [], "W2": []}
queue = list(tasks)
turn = 0
while queue:
    t = queue.pop(0)
    w = "W1" if turn % 2 == 0 else "W2"      # round-robin placement on 2 workers
    try:
        out = next(t)
        workers[w].append(out)
        queue.append(t)                       # not finished: back of the queue
    except StopIteration:
        pass
    turn += 1
for w, log in workers.items():
    print(w, "ran:", ", ".join(log))` }],
  codeTitle: ['User-level context switch (ucontext)', 'M:N multiplexing sketch'],
  viz: {
    title: 'Thread mapping models and what a blocking call does',
    input: 'N:1',
    inputLabel: 'Model: 1:1, N:1 or M:N',
    gen: function (input) {
      var m = String(input).trim().toUpperCase();
      if (['1:1', 'N:1', 'M:N'].indexOf(m) < 0) throw new Error('Type 1:1, N:1 or M:N');
      var nodes = [], edges = [], u = ['U1', 'U2', 'U3'], k, i;
      u.forEach(function (id, idx) { nodes.push({ id: id, label: id + ' (user)', x: 15, y: 6 + idx * 16, shape: 'box', w: 22 }); });
      if (m === '1:1') { k = ['K1', 'K2', 'K3']; for (i = 0; i < 3; i++) edges.push([u[i], k[i]]); }
      else if (m === 'N:1') { k = ['K1']; for (i = 0; i < 3; i++) edges.push([u[i], 'K1']); }
      else { k = ['K1', 'K2']; edges.push(['U1', 'K1']); edges.push(['U2', 'K1']); edges.push(['U2', 'K2']); edges.push(['U3', 'K2']); }
      k.forEach(function (id, idx) { nodes.push({ id: id, label: id + ' (kernel)', x: 65, y: 6 + idx * (k.length === 1 ? 0 : 16) + (k.length === 1 ? 16 : 0), shape: 'box', w: 24 }); });
      function g(hl, tags) { return { type: 'graph', label: 'Model ' + m, directed: false, height: 56, nodes: nodes, edges: edges, hl: hl || {}, tags: tags || {} }; }
      var frames = [];
      frames.push({ narr: 'Model <b>' + m + '</b>: user threads on the left, kernel threads (what the OS schedules) on the right. Lines show the mapping.', parts: [g({})] });
      frames.push({ narr: 'The kernel only sees the <b>' + k.length + '</b> kernel thread(s). That is the maximum number of CPU cores this process can use at once.', parts: [g((function () { var h = {}; k.forEach(function (x) { h[x] = 'sel'; }); return h; })())] });
      var h2 = { U1: 'bad' }, tg = { U1: 'blocked in read()' };
      if (m === '1:1') {
        h2.K1 = 'bad';
        frames.push({ narr: 'U1 makes a <b>blocking system call</b>. Only its own kernel thread K1 sleeps. U2 and U3 keep running on K2 and K3. <span class="c-g">Safe.</span>', parts: [g(h2, tg)] });
      } else if (m === 'N:1') {
        h2.K1 = 'bad'; h2.U2 = 'bad'; h2.U3 = 'bad';
        frames.push({ narr: 'U1 blocks, so its only kernel thread K1 sleeps - and with it <b>U2 and U3 freeze too</b>, though they were ready. <span class="c-r">The N:1 weakness.</span>', parts: [g(h2, tg)] });
      } else {
        h2.K1 = 'bad';
        frames.push({ narr: 'U1 blocks and K1 sleeps. A good M:N runtime notices and moves U2 over to K2 (or starts another kernel thread). U2 and U3 continue. <span class="c-g">Works, but needs smart runtime support.</span>', parts: [g(h2, tg)] });
      }
      frames.push({ narr: m === '1:1' ? 'Cost: 3 kernel threads = 3 kernel stacks and PCBs; creating 100,000 is too heavy.' : m === 'N:1' ? 'Benefit: switching between U1/U2/U3 never enters the kernel; costs only a few nanoseconds. Drawback: no multi-core.' : 'Benefit: thousands of cheap user tasks over a few kernel threads, using all cores. This is Go, Erlang, Tokio and Java virtual threads.', parts: [g({})] });
      return frames;
    }
  },
  examples: [
    { title: 'Why Go can run a million goroutines', html: `<p>A goroutine starts with a ~2 KB growable stack and is scheduled in user space on a pool of OS threads (M:N). When a goroutine blocks on a network read, the runtime parks it and runs another goroutine on the same OS thread. An OS thread needs ~8 MB of stack address space and a kernel object, so a million of them is impractical.</p>` },
    { title: 'Old green threads', html: `<p>Early Java (JDK 1.1 on some platforms) used N:1 green threads: one slow file read froze every thread, and a 16-core box used one core. Java moved to 1:1 native threads, and in Java 21 re-added cheap user-mode <b>virtual threads</b> on top (M:N).</p>` },
    { title: 'Blocking call in an event loop', html: `<p>Node.js is basically N:1 for JavaScript: one thread runs all callbacks. A heavy sync loop or <code>fs.readFileSync</code> freezes <i>all</i> requests. Fix: async I/O (the kernel or the libuv pool does the waiting) and worker threads for CPU work.</p>` }
  ],
  deepDive: `<p>🟣 <b>Scheduler activations / "when is the runtime told about a block?"</b> M:N is hard because the user-space scheduler does not automatically learn that its kernel thread blocked. Solutions: wrap blocking syscalls and use non-blocking I/O + epoll so tasks never really block (Go, Tokio); detach the stuck kernel thread and spawn a replacement (Go's sysmon, handing off the P); research designs like scheduler activations (kernel up-calls the runtime). Linux's NPTL uses 1:1 because that was simpler and fast enough after the kernel got the futex and O(1)/CFS schedulers.</p>
  <p><b>Cost model.</b> A user-level switch is a few dozen to a few hundred nanoseconds (save callee-saved registers, swap stack pointer). A kernel thread switch costs on the order of 1-5 microseconds including the trap, scheduler and cache effects. A process switch adds page-table switch and TLB effects.</p>
  <p><b>Stackless vs stackful.</b> Async/await in Rust, C# and JavaScript compiles coroutines into state machines (stackless, tiny, but "colouring" of functions), while goroutines and virtual threads keep a real, small, growable stack (stackful, simple to write, blocking-style code). Preemption: goroutines became asynchronously preemptible in Go 1.14 via signals; cooperative-only tasks can starve others.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI backends are enormously I/O-bound: thousands of concurrent requests waiting on model APIs, vector DBs and tools. That is exactly where M:N tasks (async Python, Go, Tokio, virtual threads) shine, while the model itself runs on GPUs in few heavy processes.</p>
  <p><b>Use AI as a partner:</b> ask it to translate a thread-per-request server into async or virtual-thread style, then benchmark both with a load tool. Ask for the "what blocks the event loop" audit.</p>
  <p><b>Where AI goes wrong:</b> it mixes sync libraries (blocking <code>requests</code>, JDBC) into async code, silently serialising everything, or recommends <code>async</code> for CPU-bound work where it gives no speedup.</p>
  <p><b>What you must still own:</b> knowing which layer blocks, and how many real OS threads and cores your runtime actually uses.</p>`,
  problems: [
    P('Which Model Freezes?', 'Medium', ['user vs kernel threads'],
      `<p>A program creates 4 threads. One calls <code>read()</code> on a socket that never receives data. For each model (1:1, N:1, M:N with 2 kernel threads and no blocking-aware runtime) say how many of the other 3 threads can still make progress.</p>`,
      `<p>1:1 &rarr; 3 progress; N:1 &rarr; 0; M:N (naive) &rarr; depends on placement: if the blocked thread shares its kernel thread, those on it freeze.</p>`,
      `<p>Saying "threads are independent so all others proceed" is only true when each has its own kernel thread.</p>`,
      { q: 'In N:1, a blocking system call by one user thread:', options: ['Blocks only that thread', 'Blocks the whole process', 'Is impossible', 'Starts a new kernel thread'], answer: 1, explain: 'The only kernel thread sleeps.' },
      ['<p>Hint 1: what does the kernel see?</p>', '<p>Hint 2: count the kernel threads.</p>', '<p>Hint 3: for M:N, think about which user threads share the blocked kernel thread.</p>'],
      `<p>In a 1:1 model every user thread has its own kernel thread, so only the one calling <code>read()</code> sleeps; the other three keep running on their own cores, so 3 make progress. In N:1 there is a single kernel thread. The kernel puts it to sleep, and since all four user threads live on it, none of them can run, so 0 progress even though three of them are ready. In M:N with two kernel threads and a naive runtime, the blocked thread takes its kernel thread to sleep: any user threads queued on that kernel thread also stall, while the ones on the other kernel thread continue. A blocking-aware runtime (non-blocking I/O + epoll, or handing off the kernel thread) would let all three continue. This is why Go and Tokio avoid blocking system calls on their worker threads.</p>`,
      `<p>Conceptual.</p>`)
  ]
});
/* ===================== TOPIC 6: context switching ===================== */
topics.push({
  title: 'Context Switching and Its Cost',
  analogy: `<p>You are reading a book and a friend asks for help with homework. You slip in a <b>bookmark</b> (save your place), clear your desk, open their notebook and start. When done, you reopen your book at the bookmark. The bookmark is the saved context. Switching is not free: you spend time bookmarking, tidying and getting your head back into the story, and your desk (the CPU cache) is now full of the wrong things.</p>`,
  explain: `<p>🟢 A <b>context switch</b> is when the CPU stops running one process/thread and starts another. The OS must:</p>
  <ol><li><b>Save</b> the state of the old one into its PCB: program counter, stack pointer, general registers, flags.</li><li>Run the <b>scheduler</b> to pick the next ready task.</li><li><b>Load</b> the new task's saved state from its PCB (and, if it is a different process, switch the page-table pointer).</li><li>Jump to the saved program counter: the new task continues exactly where it stopped.</li></ol>
  <p><b>When does it happen?</b> (1) time slice expires (timer interrupt), (2) the task blocks on I/O, a lock or sleep, (3) a higher-priority task becomes ready, (4) the task calls <code>yield</code> or exits.</p>
  <p><b>Direct cost</b> (saving/loading, scheduler code): about 1-5 microseconds on a modern server. <b>Hidden cost</b>: the new task starts with a "cold" CPU cache and, for a new process, a flushed or partly-useless <b>TLB</b> (the cache of address translations). The hidden cost can be bigger than the direct one.</p>
  <p>A quick estimate: if a switch costs ~3 µs and a time slice is 4 ms, overhead is 3 / 4000 = about 0.08%. But if you switch every 50 µs (too many threads, constant blocking) overhead is 6%, plus cache misses. More threads is not always faster.</p>
  <p><b>Thread vs process switch:</b> switching between threads of the same process skips the address-space change, so it is cheaper (no TLB flush). Mode switch (user to kernel for a system call) is also <i>not</i> a context switch: it is cheaper because the same task continues.</p>`,
  clues: ['"What is saved during a context switch?" - PC, SP, registers, flags (the PCB)', '"Why is a thread switch cheaper than a process switch?" - same address space, no TLB flush', '"Context switch is pure overhead" - no useful work done while switching', '"Too many threads, high CPU but low throughput" - context-switch thrashing; check vmstat cs', '"Mode switch vs context switch" - mode switch stays in the same task'],
  code: [{ lang: 'cpp', title: 'Measure a context switch with two processes and two pipes (ping-pong)', code: `#include <unistd.h>
#include <sys/wait.h>
#include <chrono>
#include <cstdio>

int main() {
    int a[2], b[2];                    // a: parent->child, b: child->parent
    pipe(a); pipe(b);
    const int N = 100000;
    char c = 'x';
    if (fork() == 0) {
        for (int i = 0; i < N; i++) {  // child: wait for byte, echo it back
            read(a[0], &c, 1);
            write(b[1], &c, 1);
        }
        _exit(0);
    }
    auto t0 = std::chrono::steady_clock::now();
    for (int i = 0; i < N; i++) {      // parent: send, then block until the echo returns
        write(a[1], &c, 1);
        read(b[0], &c, 1);
    }
    auto t1 = std::chrono::steady_clock::now();
    waitpid(-1, nullptr, 0);
    double us = std::chrono::duration<double, std::micro>(t1 - t0).count();
    // each round trip contains TWO context switches (parent->child, child->parent)
    printf("approx %.2f us per context switch (includes pipe syscalls)\\n", us / (2.0 * N));
    return 0;
}` }, { lang: 'python', run: true, title: 'Estimate switching overhead (runnable)', code: `# Overhead = switches_per_second * cost_per_switch
def overhead(slice_us, switch_us):
    useful = slice_us
    return switch_us / (useful + switch_us) * 100

for slice_us in (10000, 4000, 1000, 100, 20):
    pct = overhead(slice_us, 3.0)          # assume 3 microseconds per switch
    print(f"time slice {slice_us:6d} us -> overhead {pct:6.2f} %")

# with a cache-refill penalty the real cost per switch can be 10x bigger
print("with 30 us effective cost and 100 us slice:", round(overhead(100, 30), 1), "% lost")` }],
  codeTitle: ['Benchmark switching with pipes', 'Overhead arithmetic'],
  viz: {
    title: 'Context switch: save A, load B',
    input: 'A B',
    inputLabel: 'Two process names',
    gen: function (input) {
      var nm = String(input).trim().split(/[\s,]+/).filter(Boolean);
      if (nm.length !== 2) throw new Error('Type exactly two names, e.g. A B');
      var A = nm[0], B = nm[1];
      var cols = ['Register', 'CPU now', 'PCB ' + A, 'PCB ' + B];
      var reg = ['PC', 'SP', 'RAX', 'FLAGS', 'Page table (CR3)'];
      var va = ['0x4010', '0x7f10', '17', 'Z=0', 'ptA'], vb = ['0x8820', '0x7e90', '4', 'Z=1', 'ptB'];
      function rows(cpu, pa, pb) { var r = []; for (var i = 0; i < 5; i++) r.push([reg[i], cpu[i], pa[i], pb[i]]); return r; }
      var stale = ['(old)', '(old)', '(old)', '(old)', '(old)'];
      var frames = [];
      frames.push({ narr: '<b>' + A + '</b> is running: its values are live in the CPU registers. <b>' + B + '</b> waits as ready; its saved values sit in its PCB.', parts: [{ type: 'table', label: 'Registers', columns: cols, rows: rows(va, stale, vb), hl: { 0: 'cur' } }, { type: 'vars', vals: { running: A, ready: B }, hl: { running: 'ok' } }] });
      frames.push({ narr: 'An <b>interrupt</b> arrives (timer says ' + A + '\'s slice is over). The CPU jumps into the kernel and the hardware pushes PC and flags.', parts: [{ type: 'table', label: 'Registers', columns: cols, rows: rows(va, stale, vb), hl: { 0: 'bad', 3: 'bad' } }, { type: 'vars', vals: { event: 'timer interrupt', mode: 'kernel' }, hl: { event: 'bad' } }] });
      frames.push({ narr: '<b>Step 1: save.</b> The kernel copies every register into <b>' + A + '\'s PCB</b>, so ' + A + ' can resume later exactly here.', parts: [{ type: 'table', label: 'Registers', columns: cols, rows: rows(va, va, vb), hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' } }, { type: 'vars', vals: { step: 'save ' + A }, hl: { step: 'ok' } }] });
      frames.push({ narr: '<b>Step 2: schedule.</b> The scheduler looks at the ready queue and picks <b>' + B + '</b>. No registers change yet; this is pure policy.', parts: [{ type: 'queue', label: 'Ready queue', items: [B, A], hl: { 0: 'sel' }, frontLabel: 'next', backLabel: 'last' }, { type: 'vars', vals: { chosen: B }, hl: { chosen: 'sel' } }] });
      frames.push({ narr: '<b>Step 3: load.</b> ' + B + '\'s saved values are copied from its PCB into the CPU. The page-table register changes too: a different address space!', parts: [{ type: 'table', label: 'Registers', columns: cols, rows: rows(vb, va, vb), hl: { 0: 'cur', 1: 'cur', 2: 'cur', 3: 'cur', 4: 'sel' } }, { type: 'vars', vals: { step: 'load ' + B }, hl: { step: 'cur' } }] });
      frames.push({ narr: '<b>Step 4: resume.</b> The kernel returns from the interrupt and the CPU continues at ' + B + '\'s PC. ' + B + ' has no idea it was ever paused.', parts: [{ type: 'table', label: 'Registers', columns: cols, rows: rows(vb, va, vb), hl: { 0: 'ok' } }, { type: 'vars', vals: { running: B, ready: A }, hl: { running: 'ok' } }] });
      frames.push({ narr: '<b>Hidden cost:</b> the CPU caches and the <b>TLB</b> still hold ' + A + '\'s data and translations. ' + B + ' starts with cache misses and TLB misses until they warm up. This often costs more than the register swap itself.', parts: [{ type: 'table', label: 'Cost breakdown (typical)', columns: ['Part', 'Time'], rows: [['save/load registers', '~0.1 us'], ['scheduler decision', '~0.5-1 us'], ['page table switch + TLB', '~0.5-2 us'], ['cold cache refill (hidden)', 'up to tens of us']], hl: { 3: 'bad' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Estimating overhead', html: `<p>A server has 200 busy threads on 4 cores and each switches about 1,000 times per second. That is 200 x 1000 = 200,000 switches/s. At ~3 µs each = 0.6 s of CPU per second, i.e. <b>15% of the 4 cores</b> (4 s available) spent just switching - before counting cache misses. Fewer threads or an event loop reduces it.</p>` },
    { title: 'Reading vmstat', html: `<p><code>vmstat 1</code> has a <code>cs</code> column (context switches per second) and <code>in</code> (interrupts). Tens of thousands per core per second with low useful CPU hints at thrashing between too many runnable threads, or lock contention making threads sleep and wake.</p>` },
    { title: 'Voluntary vs involuntary', html: `<p>In <code>/proc/&lt;pid&gt;/status</code>, <code>voluntary_ctxt_switches</code> means the task blocked itself (I/O, lock). <code>nonvoluntary_ctxt_switches</code> means it was pre-empted while still wanting the CPU. A CPU-bound task shows mostly non-voluntary; an I/O-bound one shows mostly voluntary.</p>` }
  ],
  deepDive: `<p>🟣 <b>What exactly is saved.</b> Callee-saved registers (rbx, rbp, r12-r15 on x86-64), stack pointer, instruction pointer, and for FP/SIMD state either eager save or <b>lazy</b> save (only if the task used the FPU/AVX). The kernel switches kernel stacks, then (if the address space differs) loads CR3. With <b>PCID/ASID</b> tags the TLB entries of different address spaces can coexist, avoiding full flushes. Meltdown mitigations (KPTI) made every system call and switch more expensive until PCID hardware support.</p>
  <p><b>Cache and NUMA effects.</b> The scheduler prefers to wake a task on the CPU it last ran on (<b>cache affinity</b>) and you can pin with <code>taskset</code> / <code>sched_setaffinity</code>. Migrating across NUMA nodes makes memory slower. High-frequency trading and databases pin threads to cores.</p>
  <p><b>Avoiding switches.</b> Batch work, use async I/O, spin briefly before sleeping on a lock (adaptive mutexes), use a thread-per-core design, <code>io_uring</code> to cut syscalls, or user-space scheduling. Measuring: <code>perf stat -e context-switches,cpu-migrations</code>, <code>pidstat -w</code>, eBPF <code>runqlat</code> for run-queue latency.</p>
  <p><b>Lower bound intuition.</b> A syscall alone costs ~100-200 ns; a thread switch ~1-2 µs; process switch ~2-5 µs; a switch where caches are evicted may cost 10-100 µs of lost throughput.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> GPU inference has its own "context switch": swapping which model or LoRA adapter is resident costs seconds, so servers batch requests and keep models pinned instead of switching. CPU-side tokenisers and request routers still suffer classic switch overhead when thread pools are oversized.</p>
  <p><b>Use AI as a partner:</b> give it <code>vmstat</code>, <code>pidstat -w</code> and <code>perf stat</code> output and ask for a hypothesis list ("what could cause 80k switches/s?"). Then test one hypothesis at a time.</p>
  <p><b>Where AI goes wrong:</b> it quotes a single number ("context switch = 1 µs") as fact. Real costs vary by CPU, kernel, mitigations and cache state; always measure on your hardware.</p>
  <p><b>What you must still own:</b> separating direct and hidden costs, and knowing that adding threads past the core count helps only if work blocks.</p>`,
  problems: [
    P('Estimate the Overhead', 'Medium', ['context switch', 'estimation'],
      `<p>A 8-core machine runs a CPU-bound service with 64 threads. Round-robin time slice is 2 ms, a switch costs 4 µs. What fraction of CPU time goes to switching? What if the slice is dropped to 100 µs to improve latency?</p>`,
      `<p>2 ms slice: 4 / (2000 + 4) = <b>0.2%</b>. 100 µs slice: 4 / 104 = <b>3.8%</b>, before cache effects.</p>`,
      `<p>Multiplying by thread count (64 x 4 µs) is wrong: only switches per core matter, and each switch is paired with a slice of useful work.</p>`,
      { q: 'Shorter time slices usually give:', options: ['Lower latency but more overhead', 'Higher throughput always', 'No change', 'Fewer context switches'], answer: 0, explain: 'More frequent switches: responsive but more overhead.' },
      ['<p>Hint 1: per core, one switch happens every slice.</p>', '<p>Hint 2: overhead = switch / (slice + switch).</p>', '<p>Hint 3: mention that the cache refill penalty could multiply the cost.</p>'],
      `<p>On each core, the CPU alternates: run for one time slice, then spend one switch cost. Overhead fraction is switch / (slice + switch). With a 2 ms slice and 4 µs switch that is 4 / 2004, about 0.2%, negligible. Shrinking the slice to 100 µs gives 4 / 104, about 3.8%. If each switch also causes 20 µs of cache and TLB refill, effective cost is 24 µs and the 100 µs slice loses 24 / 124, about 19%. The eight cores and the 64 threads do not change the fraction, since each core is independent; having 64 threads on 8 cores just means each runs a queue of 8. The trade-off: shorter slices improve response time for interactive tasks but waste CPU; CPU-bound batch jobs prefer long slices.</p>`,
      `<p>O(1) arithmetic.</p>`)
  ]
});

/* ===================== TOPIC 7: IPC ===================== */
topics.push({
  title: 'Inter-Process Communication: Pipes, Shared Memory, Queues, Signals, Sockets',
  analogy: `<p>Processes live in separate houses with locked doors. To talk they need a channel. A <b>pipe</b> is a pneumatic tube between two offices: one stuffs messages in, the other pulls them out in order. <b>Shared memory</b> is a whiteboard in a window both can see: super fast, but you must agree who writes when. A <b>message queue</b> is a mailbox with labelled letters. A <b>signal</b> is a doorbell: it carries almost no information ("something happened!"). A <b>socket</b> is a telephone: works across the street or across the world.</p>`,
  explain: `<p>🟢 Because each process has a private address space, they cannot just read each other's variables. The OS offers <b>IPC (inter-process communication)</b> mechanisms:</p>
  ${H.table(['Mechanism', 'How it works', 'Good for', 'Watch out'], [
    ['<b>Pipe</b> (anonymous)', 'one-way byte stream in a kernel buffer; created with <code>pipe()</code>; related processes (parent/child)', 'shell pipelines <code>ls | grep x</code>, parent-child', 'one direction; blocks when full/empty; bytes, not messages'],
    ['<b>Named pipe (FIFO)</b>', 'a pipe with a file name (<code>mkfifo</code>)', 'unrelated processes on one machine', 'still one-way and a byte stream'],
    ['<b>Shared memory</b>', 'both map the same physical pages (<code>shm_open</code> + <code>mmap</code>)', 'big data, lowest latency (no copies)', 'you must synchronise (mutex/semaphore) yourself'],
    ['<b>Message queue</b>', 'kernel keeps discrete messages with types/priorities', 'structured messages, decoupling', 'size limits; kernel copies data'],
    ['<b>Signal</b>', 'async notification with a number (SIGINT, SIGTERM, SIGCHLD, SIGUSR1)', 'stop/terminate, "something happened"', 'no payload; handler restrictions; can be lost if merged'],
    ['<b>Socket</b>', 'two-way endpoint; Unix-domain (local) or TCP/UDP (network)', 'client-server, anywhere, different machines', 'more setup; protocol framing is your problem']
  ])}
  <p><b>How to choose:</b> one-way stream between parent and child: <b>pipe</b>. Huge arrays between two local workers: <b>shared memory + a semaphore</b>. Tell a daemon to reload or stop: <b>signal</b>. Might become distributed later: <b>sockets</b>. Decoupled structured messages: <b>message queue</b>.</p>
  <p>Two models behind them all: <b>shared memory</b> (fast, you synchronise) and <b>message passing</b> (safer, copies data, easier to reason about, and it scales to networks).</p>`,
  clues: ['"Parent and child need to send data one way" - anonymous pipe', '"Unrelated processes on the same host, fastest possible" - shared memory + semaphore', '"Notify a process to terminate / reload config" - signal (SIGTERM / SIGHUP)', '"Across machines" - sockets (TCP/UDP) or a message broker', '"Pipe is full and writer hangs" - kernel buffer (64 KB on Linux) full; writer blocks', '"Messages must keep boundaries" - message queue / datagram socket, not a byte-stream pipe'],
  code: [{ lang: 'cpp', title: 'Parent writes, child reads through a pipe', code: `#include <cstdio>
#include <cstring>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    int fd[2];                       // fd[0] = read end, fd[1] = write end
    if (pipe(fd) < 0) { perror("pipe"); return 1; }

    pid_t pid = fork();              // the child inherits BOTH ends
    if (pid == 0) {
        close(fd[1]);                // child only reads: close the unused write end
        char buf[64];
        ssize_t n = read(fd[0], buf, sizeof(buf) - 1);   // blocks until data or EOF
        if (n > 0) { buf[n] = '\\0'; printf("child got: %s\\n", buf); }
        close(fd[0]);
        _exit(0);
    }
    close(fd[0]);                    // parent only writes
    const char* msg = "hello via pipe";
    write(fd[1], msg, strlen(msg));
    close(fd[1]);                    // closing the write end gives the reader EOF
    waitpid(pid, nullptr, 0);
    return 0;
}` }, { lang: 'cpp', title: 'Signals: catch SIGINT/SIGTERM safely', code: `#include <csignal>
#include <cstdio>
#include <unistd.h>

volatile sig_atomic_t stop = 0;       // the only safe thing to set from a handler

void on_signal(int) { stop = 1; }     // keep handlers tiny: set a flag, return

int main() {
    struct sigaction sa{};
    sa.sa_handler = on_signal;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGINT, &sa, nullptr);  // Ctrl+C
    sigaction(SIGTERM, &sa, nullptr); // 'kill <pid>'
    while (!stop) {
        pause();                      // sleep until some signal arrives
    }
    printf("clean shutdown\\n");       // do the real cleanup outside the handler
    return 0;
}` }, { lang: 'cpp', title: 'Shared memory between parent and child (anonymous mmap)', code: `#include <sys/mman.h>
#include <sys/wait.h>
#include <unistd.h>
#include <cstdio>

int main() {
    // MAP_SHARED | MAP_ANONYMOUS: pages stay shared after fork (unlike normal copy-on-write memory)
    int* shared = (int*)mmap(nullptr, sizeof(int), PROT_READ | PROT_WRITE,
                             MAP_SHARED | MAP_ANONYMOUS, -1, 0);
    *shared = 0;
    if (fork() == 0) {
        *shared = 42;               // child writes ...
        _exit(0);
    }
    wait(nullptr);                  // wait doubles as our synchronisation here
    printf("parent sees %d\\n", *shared);   // ... parent sees 42
    munmap(shared, sizeof(int));
    return 0;
}` }, { lang: 'python', run: true, title: 'Bounded pipe buffer simulation (runnable)', code: `from collections import deque

CAP = 5                       # tiny pipe buffer (real Linux pipe: 64 KB)
pipe = deque()
data = list("HELLOWORLD")     # what the writer wants to send
got = []

tick = 0
while data or pipe:
    tick += 1
    # writer: writes if there is room, else BLOCKS
    if data:
        if len(pipe) < CAP:
            pipe.append(data.pop(0))
            w = "wrote"
        else:
            w = "BLOCKED (pipe full)"
    else:
        w = "done"
    # reader only wakes up every 3rd tick (slow consumer)
    if tick % 3 == 0 and pipe:
        got.append(pipe.popleft()); r = "read"
    else:
        r = "idle" if pipe else "BLOCKED (pipe empty)"
    print(f"t={tick:2d} writer {w:20s} reader {r:20s} buf={''.join(pipe)}")
print("reader received:", "".join(got))` }],
  codeTitle: ['Pipe between parent and child', 'Signal handling', 'Shared memory with mmap', 'Pipe backpressure simulation'],
  viz: {
    title: 'Pipe data flow with a small buffer',
    input: 'HELLO WORLD',
    inputLabel: 'Text the writer sends (max 14 chars)',
    gen: function (input) {
      var txt = String(input).replace(/\s+/g, '_');
      if (!txt.length) throw new Error('Type some text');
      if (txt.length > 14) throw new Error('Use at most 14 characters');
      var CAP = 4, data = txt.split(''), buf = [], got = [], frames = [], tick = 0;
      function parts(ws, rs, hlq) {
        return [
          { type: 'graph', label: 'Writer to Reader', directed: true, height: 34, nodes: [{ id: 'W', label: 'Writer process', x: 14, y: 17, shape: 'box', w: 24 }, { id: 'K', label: 'Kernel pipe buffer', x: 50, y: 17, shape: 'box', w: 26 }, { id: 'R', label: 'Reader process', x: 86, y: 17, shape: 'box', w: 24 }], edges: [['W', 'K', 'write()'], ['K', 'R', 'read()']], hl: { W: ws, R: rs }, ehl: {} },
          { type: 'queue', label: 'Pipe buffer (capacity ' + CAP + ' bytes)', items: buf.slice(), hl: hlq || {}, frontLabel: 'read from here', backLabel: 'write here' },
          { type: 'text', html: 'Still to send: <code>' + (data.join('') || '-') + '</code> &nbsp; Reader has: <code>' + (got.join('') || '-') + '</code>' }
        ];
      }
      frames.push({ narr: 'A pipe is a <b>FIFO byte queue inside the kernel</b>. The writer pushes bytes in at the back, the reader pulls them out of the front. Capacity here is just <b>' + CAP + '</b> to show what happens when it fills.', parts: parts('', '') });
      while ((data.length || buf.length) && tick < 40) {
        tick++;
        var ws = '', rs = '', note = '';
        if (data.length) {
          if (buf.length < CAP) { var ch = data.shift(); buf.push(ch); ws = 'ok'; note += 'Writer <b>write()</b>s "' + ch + '". '; }
          else { ws = 'bad'; note += 'Buffer <b>full</b>: writer <span class="c-r">blocks</span> (sleeps) until the reader makes room. This is backpressure. '; }
        }
        if (tick % 2 === 0) {
          if (buf.length) { var c2 = buf.shift(); got.push(c2); rs = 'ok'; note += 'Reader <b>read()</b>s "' + c2 + '". '; }
          else { rs = 'bad'; note += 'Buffer empty: reader <span class="c-r">blocks</span> waiting for data. '; }
        } else { note += 'Reader is busy elsewhere. '; }
        var hq = {}; if (buf.length) hq[buf.length - 1] = ws === 'ok' ? 'ok' : 'cur';
        frames.push({ narr: note, parts: parts(ws, rs, hq) });
      }
      frames.push({ narr: 'All bytes delivered in the same order: <b>' + got.join('') + '</b>. When the writer closes its end, the reader gets EOF (read returns 0).', parts: parts('', 'sel') });
      return frames;
    }
  },
  examples: [
    { title: 'Shell pipeline = pipes + fork', html: `<p><code>cat log | grep ERROR | wc -l</code>: the shell creates two pipes, forks three children, uses <code>dup2</code> to wire stdout of each to the write end and stdin of the next to the read end, then execs the three programs. They run <b>at the same time</b>; the pipe buffers make them a streaming pipeline.</p>` },
    { title: 'Pick the IPC', html: `${H.table(['Scenario', 'Best choice', 'Why'], [['Video decoder hands 4K frames to renderer on same host', 'shared memory + semaphore', 'avoid copying 30 MB per frame'], ['systemd stops a service', 'SIGTERM signal', 'tiny "please quit" notification'], ['Chrome browser process to renderer', 'Unix-domain sockets / Mojo', 'two-way messages with ids'], ['Microservices on different hosts', 'TCP sockets (HTTP/gRPC) or broker', 'must cross machines'], ['Parent sends config to one child once', 'pipe', 'simplest one-way stream']])}` },
    { title: 'Why signals are tricky', html: `<p>A signal handler can interrupt your code at any instruction, so only async-signal-safe functions (like <code>write</code>, not <code>printf</code> or <code>malloc</code>) may be called. Standard signals are not queued: 5 SIGCHLD arriving together may be seen as one, so a SIGCHLD handler must loop <code>waitpid(-1, ..., WNOHANG)</code>.</p>`, code: { lang: 'cpp', title: 'Reap all finished children in a SIGCHLD handler', code: `#include <csignal>
#include <sys/wait.h>
#include <cerrno>

void on_child(int) {
    int saved = errno;                                  // handlers must preserve errno
    while (waitpid(-1, nullptr, WNOHANG) > 0) { }       // several children may have died
    errno = saved;
}` } }
  ],
  deepDive: `<p>🟣 <b>Pipe internals.</b> A pipe is a kernel ring buffer (16 pages = 64 KB by default on Linux, tunable with <code>fcntl(F_SETPIPE_SZ)</code>). Writes up to <code>PIPE_BUF</code> (4096 bytes) are atomic: they will not interleave with other writers. Bigger writes can interleave. When all read ends close, a write raises <b>SIGPIPE</b> (so <code>yes | head</code> terminates). Unrelated processes use <code>mkfifo</code> or Unix-domain sockets.</p>
  <p><b>Shared memory reality.</b> POSIX <code>shm_open</code> creates a file in <code>/dev/shm</code> (tmpfs); each process <code>mmap</code>s it; the same physical pages appear in each page table. No copying, no system call per access, but you need process-shared mutexes (<code>PTHREAD_PROCESS_SHARED</code>) or semaphores, and pointers inside the region must be offsets, because the base address may differ per process. <b>Zero-copy</b> designs (Kafka's <code>sendfile</code>, DPDK, shared ring buffers like LMAX Disruptor) build on this.</p>
  <p><b>Sockets.</b> Unix-domain sockets (AF_UNIX) are the workhorse for local services (Docker daemon, X11, databases) and can pass file descriptors between processes with <code>SCM_RIGHTS</code>. TCP sockets are the same API over a network, covered in the Networks modules. D-Bus, gRPC, Mojo and Binder (Android) are higher-level layers on top.</p>
  <p><b>Message queues.</b> POSIX (<code>mq_open</code>) and System V (<code>msgget</code>) queues are old-fashioned; most modern systems use sockets or external brokers (Redis, RabbitMQ, Kafka) that add persistence and fan-out. Trade-off summary: shared memory = fastest, hardest; message passing = slower, safer, location-transparent.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI systems are IPC-heavy: an agent talks to tool servers over <b>stdio pipes</b> (the Model Context Protocol commonly launches a local server as a child process and speaks JSON over its stdin/stdout, or over HTTP). Multi-GPU training uses shared memory and NCCL for gradients; inference servers use shared memory or sockets between the HTTP front end and model workers; vLLM-style systems pass tensors via shared memory to avoid copies.</p>
  <p><b>Use AI as a partner:</b> ask for a skeleton of a parent that spawns a worker with pipes and handles worker death, then test with <code>strace -f</code> and check every <code>close()</code> yourself.</p>
  <p><b>Where AI goes wrong:</b> forgetting to close unused pipe ends (reader never sees EOF so the program hangs), calling <code>printf</code> inside signal handlers, and assuming a message arrives in one <code>read()</code> (a byte stream needs framing).</p>
  <p><b>What you must still own:</b> choosing the mechanism from latency, size, direction and trust requirements, and designing for blocking, backpressure and cleanup.</p>`,
  problems: [
    P('Choose the IPC', 'Medium', ['IPC', 'design'],
      `<p>Pick an IPC mechanism and justify it for each: (a) a log forwarder sends lines to a compressor process on the same host, (b) a camera process shares 8 MB frames at 60 fps with an ML process, (c) an admin wants a daemon to reload its config without restart, (d) two services on different data-centres exchange requests.</p>`,
      `<p>(a) pipe; (b) shared memory with synchronisation; (c) SIGHUP; (d) TCP sockets / RPC.</p>`,
      `<p>Using one mechanism (say sockets) for everything works but copies 480 MB/s of frames in case (b) and adds needless overhead.</p>`,
      { q: 'Which IPC needs no kernel copy of the payload after setup?', options: ['Pipe', 'Message queue', 'Shared memory', 'Signal'], answer: 2, explain: 'Both processes map the same pages.' },
      ['<p>Hint 1: classify by direction, data size, and locality.</p>', '<p>Hint 2: huge, frequent data = shared memory; tiny notifications = signals.</p>', '<p>Hint 3: across machines only sockets (or something built on them) work.</p>'],
      `<p>(a) A pipe (or the stdout of the forwarder piped into the compressor) is ideal: a one-way ordered byte stream with automatic backpressure, so a slow compressor makes the forwarder wait instead of using unbounded memory. (b) 8 MB x 60 = 480 MB/s; copying through a pipe or socket wastes CPU and memory bandwidth, so use shared memory (e.g. a ring of frame buffers) with a semaphore or eventfd to signal "frame ready" and "frame consumed"; remember to synchronise to avoid reading half-written frames. (c) A signal such as SIGHUP is the Unix convention for reload; the daemon's handler sets a flag and the main loop re-reads the config. (d) Processes on different machines cannot share memory or pipes, so use TCP sockets, typically wrapped by HTTP/gRPC with timeouts and retries. The theme: match the mechanism to direction, size, locality and failure semantics.</p>`,
      `<p>Conceptual.</p>`)
  ]
});
/* ===================== PRACTICE ===================== */
var H3 = function (a, b, c) { return ['<p>Hint 1: ' + a + '</p>', '<p>Hint 2: ' + b + '</p>', '<p>Hint 3: ' + c + '</p>']; };

practice.push(P('Program or Process?', 'Easy', ['basics'],
  `<p>You double-click a game and then open it a second time. How many programs and how many processes are involved? What differs between the two processes?</p>`,
  `<p>${H.c('g', '1 program (one file), 2 processes')}. They differ in PID, data, heap, stack and PCB; the code (text) pages can be shared in RAM.</p>`,
  `<p>Saying "one process because it is the same game" confuses the file with the running instance.</p>`,
  Q('A program becomes a process when:', ['It is compiled', 'It is saved to disk', 'The OS loads it and starts executing it', 'It is installed'], 2, 'A process is a program in execution.'),
  H3('one file on disk, how many running instances?', 'what does each instance own privately?', 'the read-only code may be shared physically'),
  `<p>There is one program: the executable file on disk. Each double-click makes the OS create a new process: it allocates a PCB and a PID, builds a fresh virtual address space (text mapped from the file, new data, heap and stack), opens stdin/out/err and queues the process as ready. So two processes exist. Their globals, heap and stack are separate, so changing the score in one window cannot affect the other. To save RAM the kernel maps the same physical pages for the read-only code in both, which is why running two copies costs less than twice the memory. They also have separate PIDs, so you can kill one without the other.</p>`,
  `<p>Conceptual.</p>`));

practice.push(P('Order the States', 'Easy', ['process states'],
  `<p>Put these events in a valid order for a process that is created, reads a file, uses the CPU, and exits: <i>dispatch, admit, io_done, io_wait, exit, dispatch</i>.</p>`,
  `<p>${H.c('g', 'admit, dispatch, io_wait, io_done, dispatch, exit')}.</p>`,
  `<p>Placing io_done directly before exit forgets that the process must be dispatched again.</p>`,
  Q('Which transition is NOT allowed?', ['ready to running', 'running to waiting', 'waiting to running', 'running to ready'], 2, 'A waiting process must pass through ready.'),
  H3('start at new', 'a process can only exit while running', 'after I/O finishes it is ready, not running'),
  `<p>New process: admit moves new to ready. Dispatch moves it to running. It calls read, so io_wait moves it to waiting. When the disk finishes, io_done moves it to ready (never straight to running). Dispatch again moves it to running, where it computes and finally calls exit which moves it to terminated. The sequence is therefore admit, dispatch, io_wait, io_done, dispatch, exit. You can test your answer against the state machine simulator in the topic: any illegal step is reported.</p>`,
  `<p>Conceptual.</p>`));

practice.push(P('fork Return Values', 'Easy', ['fork'],
  `<p>What does <code>fork()</code> return to the parent, to the child, and on failure? Write a two-line check that prints "child" only in the child.</p>`,
  `<p>Parent: child's PID (&gt;0). Child: 0. Failure: -1 in the parent, no child created.</p><pre>if (fork() == 0) printf("child\\n");</pre>`,
  `<p>Comparing to getpid() or assuming only the parent runs after fork shows a misunderstanding of the "returns twice" idea.</p>`,
  Q('fork() returns 0 in:', ['the parent', 'the child', 'both', 'neither'], 1, 'Child gets 0 so it can tell it is the child.'),
  H3('the two processes must be able to tell themselves apart', 'the parent needs the child pid for waitpid', 'handle -1'),
  `<p>fork() returns twice, once in each process, with different values so the code can branch. In the parent the return value is the PID of the new child, which the parent needs for <code>waitpid</code> or <code>kill</code>. In the child it is 0 (the child can still learn its own PID with getpid and its parent's with getppid). If the kernel cannot create a process (limit reached, out of memory) it returns -1 in the parent and sets errno; no child exists, so always check for it. The guard <code>if (fork() == 0)</code> is therefore true only in the child.</p>`,
  `<p>O(1).</p>`));

practice.push(P('Spot the Zombie', 'Easy', ['zombie', 'wait'],
  `<p><code>ps</code> shows a process with state Z and name <code>&lt;defunct&gt;</code>. What is it, why does <code>kill -9</code> not remove it, and how do you really get rid of it?</p>`,
  `<p>A terminated child whose parent has not called wait(). Fix the parent (call waitpid / handle SIGCHLD) or kill the parent so PID 1 adopts and reaps it.</p>`,
  `<p>Repeating kill -9 on the zombie does nothing: it is already dead, only its PCB entry remains.</p>`,
  Q('A zombie process still holds:', ['its memory and CPU', 'only its PCB entry and exit status', 'open sockets', 'a running thread'], 1, 'All other resources are freed.'),
  H3('who reads the exit status?', 'it is already dead', 'think about adoption by init'),
  `<p>A zombie is a process that has finished running (it called exit) but whose parent has not yet collected its exit status with wait or waitpid. The kernel keeps a small PCB entry (PID, status, usage) so the parent can still read how the child ended. It uses no CPU or RAM beyond that, but it occupies a PID slot, and thousands can exhaust the PID table. kill -9 has no effect because the process is already dead; there is nothing left to kill. The fix is in the parent: call waitpid (blocking or in a SIGCHLD handler with WNOHANG), or set SIGCHLD to SIG_IGN. If the parent is buggy, killing the parent re-parents the zombie to init (PID 1 or a subreaper) which reaps it immediately.</p>`,
  `<p>O(1).</p>`));

practice.push(P('fork() && fork() Count', 'Medium', ['fork', 'process tree'],
  `<p>How many processes in total, and how many "Y" lines, for <code>if (fork() &amp;&amp; fork()) {} printf("Y\\n");</code>?</p>`,
  `<p>${H.c('g', '3 processes, 3 lines')}. Original forks; child (0) short-circuits; parent (nonzero) forks again.</p>`,
  `<p>Assuming both forks always run gives 4. Short-circuit means the child of the first fork never evaluates the second.</p>`,
  Q('In A && B, B is evaluated when:', ['A is false', 'A is true', 'always', 'never'], 1, 'Short-circuit AND.'),
  H3('which process sees 0 from the first fork?', '0 is false so && stops', 'only the original process runs the second fork'),
  `<p>Start with process P. The first fork creates child C1. In C1 the call returns 0, which is false, so the &amp;&amp; short-circuits and C1 skips the second fork and goes straight to printf. In P the return value is C1's PID, which is true, so P evaluates the second fork and creates C2. Total processes: P, C1, C2 = 3, and each prints once, so 3 lines. Contrast with <code>fork(); fork();</code> which gives 4. For <code>fork() || fork()</code>: the child (0) goes on to fork again, the parent short-circuits: also 3 processes. Drawing the tree and marking the return value at each node avoids mistakes.</p>`,
  `<p>O(forks).</p>`));

practice.push(P('Predict the Buffered Output', 'Medium', ['fork', 'stdio'],
  `<p>Predict the output when stdout is a pipe: <code>printf("A"); fork(); printf("B");</code> then each process exits normally.</p>`,
  `<p>${H.c('g', 'ABAB')}: "A" sits in the buffer when fork copies it, so both processes eventually print AB. On a terminal also ABAB, since no newline flushed it. With fflush before fork: ABB.</p>`,
  `<p>Answering "AB B" (A once) forgets that the unflushed buffer is duplicated in the child.</p>`,
  Q('fflush(stdout) before fork() prevents:', ['zombies', 'duplicated buffered output', 'orphans', 'deadlock'], 1, 'The buffer is empty when copied.'),
  H3('is anything flushed before fork?', 'buffers live in user memory, which fork copies', 'each process flushes its own copy at exit'),
  `<p>printf("A") only copies "A" into stdout's user-space buffer; there is no newline, so even line-buffered terminals do not flush. fork() duplicates the whole address space, including that buffer, so the child also holds "A" pending. Both then add "B". At exit each process flushes its buffer, giving AB from the parent and AB from the child, which the pipe shows as ABAB (or AABB depending on timing of the writes, but each stream is "AB"). If we call fflush(stdout) right before fork, the "A" is written once and both buffers are empty, producing A then B twice: ABB. This is the classic reason to flush before fork and to use _exit in children after a failed exec.</p>`,
  `<p>O(1).</p>`));

practice.push(P('Fix the Server Zombies', 'Medium', ['zombie', 'servers'],
  `<p>A TCP server forks a child per connection and never waits. After a day <code>ps</code> shows 40,000 defunct processes. Give two fixes and compare them.</p>`,
  `<p>Fix A: SIGCHLD handler looping <code>waitpid(-1, 0, WNOHANG)</code>. Fix B: <code>signal(SIGCHLD, SIG_IGN)</code> (kernel auto-reaps). Alternative: double fork or a thread/process pool.</p>`,
  `<p>Calling blocking wait() in the accept loop stops the server from accepting new connections while a child runs.</p>`,
  Q('Why loop with WNOHANG in a SIGCHLD handler?', ['signals may merge so one signal can mean several dead children', 'to sleep', 'to create children', 'to kill children'], 0, 'Standard signals are not queued.'),
  H3('who should collect the exit status?', 'blocking wait in the main loop is a bad idea', 'signals can coalesce'),
  `<p>Each finished child stays a zombie until the parent reaps it. Fix A: install a SIGCHLD handler (via sigaction with SA_RESTART) that loops <code>while (waitpid(-1, nullptr, WNOHANG) &gt; 0) {}</code>; the loop is needed because several SIGCHLDs arriving together can be delivered as one. Fix B: tell the kernel you do not care about exit codes with SIG_IGN or SA_NOCLDWAIT for SIGCHLD; children are then reaped automatically (you lose the exit status). Fix C: use a fixed pool of worker processes or threads (pre-fork model, or a thread pool) which avoids per-connection fork cost altogether. Calling blocking wait() before accept would serialise the server, so avoid that. Also keep the handler async-signal-safe and preserve errno.</p>`,
  `<p>O(1) per child.</p>`));

practice.push(P('Threads Sharing a Counter', 'Medium', ['threads', 'race'],
  `<p>Four threads each do <code>counter++</code> 100,000 times on a shared <code>int</code> without a lock. Why is the final value below 400,000? Give two fixes.</p>`,
  `<p>${H.c('r', 'counter++ is load, add, store')}: interleavings lose updates (see the runnable simulation). Fixes: <code>std::mutex</code> or <code>std::atomic&lt;int&gt;</code>.</p>`,
  `<p>Locking around the whole loop is correct but serialises the threads; atomics or per-thread partial sums scale better.</p>`,
  Q('Best scalable fix for a shared counter?', ['Global mutex per increment', 'Per-thread local sums combined at the end', 'sleep()', 'Volatile'], 1, 'No sharing in the hot loop.'),
  H3('is ++ one machine instruction?', 'two threads can both load the same old value', 'avoid sharing in the hot path'),
  `<p>The increment compiles to three steps: load the variable into a register, add 1, store it back. If thread A and B both load 7, both add 1 and both store 8, one increment is lost. This is a data race, which in C++ is also undefined behaviour. Fix 1: protect with a mutex (lock_guard around the increment); correct but every increment pays lock cost and contention. Fix 2: <code>std::atomic&lt;int&gt;</code> with fetch_add, a single atomic hardware instruction. Fix 3 (fastest): each thread counts in its own local variable (private stack), and adds its total once at the end under a lock or with one atomic add. Reduction of shared writes also avoids cache-line ping-pong between cores.</p>`,
  `<p>Time O(N) work; correctness is the point.</p>`));

practice.push(P('Design Browser Isolation', 'Medium', ['threads vs processes', 'design'],
  `<p>Explain why a browser uses a process per site but threads inside each renderer. What would break with one process and many threads, and with a process per iframe/script?</p>`,
  `<p>Process = security/crash boundary (OS enforces separate memory); threads inside = cheap cooperation on shared DOM/JS heap.</p>`,
  `<p>"Threads are faster so use only threads" ignores that one exploit in any page could read every other tab.</p>`,
  Q('Main reason for a process per tab?', ['Isolation and crash containment', 'Less memory', 'Faster startup', 'Simpler code'], 0, 'OS-enforced memory separation.'),
  H3('what is the security boundary the OS enforces?', 'what must be shared inside one page?', 'what is the memory cost of more processes?'),
  `<p>Web pages run untrusted code. A memory-safety bug in the JavaScript engine or renderer lets an attacker read or write memory in that address space. If all tabs were threads of one process, that would expose passwords and sessions from every other tab. Separate processes use separate page tables, so the OS prevents cross-reads even after an exploit, and a crash only closes one tab. Inside one renderer, the DOM, JS heap and layout data are tightly interlinked and mutated constantly, so cooperating threads (main, compositor, raster, worker threads) sharing memory is efficient; splitting it into processes would force serialising data over IPC. Site isolation puts cross-origin iframes into other processes to defend against Spectre-style leaks, trading higher RAM use. So processes for trust boundaries, threads for tightly coupled work.</p>`,
  `<p>Design reasoning.</p>`, ['What is the memory price of site isolation?']));

practice.push(P('Context Switch Budget', 'Medium', ['context switch', 'estimation'],
  `<p>A service handles 50,000 requests/s with a thread-per-request model; each request blocks twice (DB and cache) causing 4 switches per request. At 5 µs per switch on 16 cores, what share of total CPU goes to switching? What design change would cut it?</p>`,
  `<p>50,000 x 4 = 200,000 switches/s x 5 µs = 1 CPU-second of 16 = <b>6.25%</b> (more with cache misses). Use async I/O/event loop or a smaller pool.</p>`,
  `<p>Ignoring the cache penalty underestimates; ignoring that work is spread over 16 cores overestimates.</p>`,
  Q('200,000 switches/s at 5 us each costs:', ['0.1 core', '1 core', '10 cores', '100 cores'], 1, '200,000 x 5us = 1 s per second.'),
  H3('switches per second times cost per switch', 'divide by total CPU seconds per second (16)', 'think about async/event-loop designs'),
  `<p>Total switches per second: 50,000 requests x 4 = 200,000. Time spent: 200,000 x 5 µs = 1,000,000 µs = 1 second of CPU every second, i.e. one full core. The machine offers 16 core-seconds per second, so 1/16 = 6.25% of capacity goes to switching, before counting cache and TLB refill, which could double or triple it. To reduce: use non-blocking I/O with an event loop or virtual threads/coroutines so a "wait" is a user-space switch instead of a kernel one; batch DB calls to reduce blocks per request; avoid oversubscribing threads versus cores; pin hot threads. Measure first with vmstat cs and perf stat context-switches before redesigning.</p>`,
  `<p>O(1) arithmetic.</p>`));

practice.push(P('Pipeline Without Deadlock', 'Hard', ['pipe', 'dup2', 'shell'],
  `<p>Implement <code>ls | wc -l</code> yourself with fork, pipe, dup2 and exec. List every file descriptor that must be closed in each process and say what hangs if one is left open.</p>`,
  `<p>Parent creates pipe; child1 dup2(write end, 1); child2 dup2(read end, 0); each closes both original ends; parent closes both and waits for both.</p>`,
  `<p>Forgetting to close the parent's copy of the write end means wc never sees EOF and hangs forever.</p>`,
  Q('wc hangs waiting for input. Likely cause:', ['a write end of the pipe is still open somewhere', 'the pipe is empty forever by design', 'ls crashed', 'SIGPIPE'], 0, 'EOF only arrives when ALL write ends are closed.'),
  H3('EOF needs every write end closed', 'dup2 duplicates; the original fd still exists', 'close in parent too'),
  `<p>Recipe: <code>pipe(fd)</code>; fork child 1: <code>dup2(fd[1], 1); close(fd[0]); close(fd[1]); execlp("ls","ls",nullptr);</code>. Fork child 2: <code>dup2(fd[0], 0); close(fd[0]); close(fd[1]); execlp("wc","wc","-l",nullptr);</code>. Parent: <code>close(fd[0]); close(fd[1]); waitpid</code> both children. Why every close matters: a reader receives EOF only when every write end of the pipe, in all processes, is closed. After dup2 the child has two descriptors for the same write end (fd[1] and 1), so it must close fd[1]; the parent also holds one from the pipe() call and must close it too. If wc's own process still held fd[1] open it would be waiting for itself. A forgotten read end has a different failure: the writer will not get SIGPIPE if some process keeps a read end open, so it blocks forever once the buffer fills. Finally waitpid for both so neither becomes a zombie.</p>`,
  `<p>O(1) syscalls; data streams through the kernel buffer.</p>`));

practice.push(P('Fork Tree with Conditions', 'Hard', ['fork', 'process tree'],
  `<p>Count the total processes: <code>for (int i=0;i&lt;3;i++) { if (fork()==0) { continue; } else { break; } }</code>. Then count for the version where the child breaks and the parent continues.</p>`,
  `<p>Child continues, parent breaks: chain of 4 processes (each child continues the loop, parent stops). Child breaks, parent continues: parent makes 3 children: 4 processes.</p>`,
  `<p>Applying the 2<sup>n</sup> rule blindly gives 8; it applies only when every process forks every iteration.</p>`,
  Q('Parent loops, child breaks, 5 iterations: total processes?', ['6', '10', '32', '5'], 0, 'One parent plus 5 children.'),
  H3('the 2^n rule needs everyone to keep forking', 'mark who exits the loop at each step', 'draw the tree for i=0,1,2'),
  `<p>Case 1 (child continues, parent breaks): iteration 0: P forks C1; P (nonzero) breaks out of the loop. C1 (zero) continues to i=1 and forks C2, then its parent role breaks; C2 continues to i=2 and forks C3 who continues out of the loop after i=2. The tree is a chain P, C1, C2, C3: 4 processes. Case 2 (child breaks, parent continues): P forks C1 at each of three iterations; each child leaves the loop immediately, so only P keeps forking: P plus 3 children = 4 processes. Both give n+1 processes, linear, because only one process in each iteration forks. Exponential growth needs every process to fork every round. Sketching the tree and marking which branch continues is the reliable method for any such puzzle.</p>`,
  `<p>Linear: n+1 processes.</p>`));

practice.push(P('Design a Safe Worker Sandbox', 'Hard', ['design', 'IPC', 'fork/exec'],
  `<p>Design a service that runs untrusted user scripts (like an online judge). Choose process/thread structure, IPC between supervisor and worker, how you limit and kill runaway workers, and how you avoid zombies.</p>`,
  `<p>Supervisor forks a child per job; child sets rlimits/seccomp/cgroup then execs the interpreter; stdin/stdout via pipes; supervisor enforces a wall-clock timeout with SIGKILL and reaps via waitpid.</p>`,
  `<p>Running scripts as threads of the server lets a bad script read secrets or crash the whole service.</p>`,
  Q('Best way to stop an infinite-loop worker?', ['Ask it politely', 'SIGKILL from the supervisor after a timeout', 'wait()', 'Increase its priority'], 1, 'SIGKILL cannot be caught or ignored.'),
  H3('isolation requires a process (or stronger) boundary', 'limit resources before exec: rlimit, cgroups, seccomp', 'supervisor owns timeouts and reaping'),
  `<p>Structure: a long-lived supervisor accepts jobs and, for each, does fork then exec of a worker (or posix_spawn). Between fork and exec the child applies limits: <code>setrlimit</code> for CPU time, address space, file size and process count (prevents fork bombs), drops privileges (setuid to a nobody user), joins a cgroup, new PID/network/mount namespaces and a seccomp filter that allows only the system calls the interpreter needs. IPC: pipes (or a Unix socket) for stdin/stdout/stderr, with the supervisor reading with a size cap so output cannot fill memory. Time limit: supervisor uses a timer or poll with timeout; on expiry it sends SIGKILL to the whole process group (kill(-pgid)) so grandchildren die too, then calls waitpid to reap and read exit status, and WIFSIGNALED to report "time limit exceeded". Memory kill shows up as SIGKILL from the cgroup OOM killer. Zombies are avoided by always waiting; a pool of pre-forked sandboxes cuts latency.</p>`,
  `<p>Per job O(1) setup plus script runtime.</p>`));

practice.push(P('Why Is Load High but CPU Idle?', 'Hard', ['process states', 'debugging'],
  `<p>A server shows load average 40 on 8 cores but CPU is 90% idle. Explain with process states, list the commands you would run, and name likely causes.</p>`,
  `<p>Load counts tasks in R and D (uninterruptible) states. Many tasks stuck in D (I/O: slow disk, NFS, locks) raise load without using CPU.</p>`,
  `<p>Assuming high load always means busy CPU leads to adding cores, which does nothing here.</p>`,
  Q('Linux load average counts tasks that are:', ['only running', 'runnable plus in uninterruptible sleep', 'only sleeping', 'zombies'], 1, 'R and D states.'),
  H3('what do R and D mean in ps?', 'idle CPU means the tasks are not computing', 'look at wchan and iostat'),
  `<p>Linux load average is the average number of tasks that are runnable (R) or in uninterruptible sleep (D). With the CPU 90% idle, the load must come from D-state tasks: they are blocked in the kernel waiting for I/O that cannot be interrupted, for example a slow or failing disk, an unresponsive NFS or network storage mount, or heavy swapping. Investigation: <code>ps -eo pid,stat,wchan:30,cmd | awk '$2 ~ /D/'</code> to list the D tasks and what they wait on; <code>iostat -x 1</code> for device latency and utilisation; <code>vmstat 1</code> (b column = blocked, wa = I/O wait, si/so swap); <code>dmesg</code> for I/O errors or hung task warnings; <code>cat /proc/&lt;pid&gt;/stack</code> or <code>perf</code>/<code>bpftrace</code> to see kernel stacks; check mounts with <code>mount</code> and <code>nfsstat</code>. Fix the storage problem; adding CPU would not help, and kill -9 cannot remove D-state tasks until the I/O returns.</p>`,
  `<p>Diagnosis, not algorithmic.</p>`));

practice.push(P('Design a Million-Connection Server', 'Hard', ['threads', 'design', 'context switch'],
  `<p>You must hold 1,000,000 mostly-idle connections. Compare thread-per-connection, process-per-connection and event-driven/M:N designs by memory, switching cost and failure isolation, and recommend one.</p>`,
  `<p>Thread-per-connection: 1M x 8 MB virtual stacks plus kernel structures is infeasible. Event loop (epoll) or M:N tasks: small per-connection state, few OS threads, one loop per core.</p>`,
  `<p>Process-per-connection costs even more memory and context switches than threads.</p>`,
  Q('Best fit for 1M idle connections?', ['Process per connection', 'Thread per connection', 'Event loop / M:N tasks per core', 'One blocking thread'], 2, 'Idle connections should cost bytes, not stacks.'),
  H3('what does an idle connection need to cost?', 'estimate stack memory per thread', 'workers = number of cores'),
  `<p>Thread per connection: each OS thread reserves a stack (default 8 MB of address space, with at least tens of KB really touched) plus kernel task structures, so 1M threads need tens of GB of RAM, hit PID and thread limits, and every wakeup is a kernel context switch with cache damage. Process per connection is worse (page tables, PCB, copy of runtime). The scalable design is event-driven: one thread (or a few) per core, each running an epoll or io_uring loop that handles thousands of sockets with small per-connection state (a few KB: buffers and a state machine), or M:N user-level tasks (goroutines, Tokio, virtual threads) that look like blocking code but cost ~2-8 KB. Context switches become cheap user-space switches. Trade-offs: CPU-heavy handlers must be moved to worker pools or they stall the loop; isolation is weaker, so use several worker processes (like Nginx) to contain crashes and use all cores. Also tune file descriptor limits and kernel socket memory.</p>`,
  `<p>Memory per connection a few KB; O(1) per event.</p>`, ['What breaks at the kernel level (fd limits, conntrack)?']));

/* ===================== QUIZ ===================== */
quiz.push(Q('Which segment holds local variables of a function?', ['Heap', 'Stack', 'Text', 'BSS'], 1, 'Each call pushes a stack frame with its locals.'));
quiz.push(Q('A process in the waiting state is waiting for:', ['the CPU', 'an event such as I/O completion', 'its parent to exit', 'a PID'], 1, 'Waiting/blocked means waiting for an event, not the CPU.'));
quiz.push(Q('What does fork() return in the child?', ['The parent PID', '0', '-1', 'The child PID'], 1, 'The child sees 0; the parent sees the child PID.'));
quiz.push(Q('exec() creates a new process.', ['True', 'False: it replaces the current process image'], 1, 'Same PID, new program. fork creates processes.'));
quiz.push(Q('How many processes exist after three consecutive unconditional fork() calls (counting the original)?', ['3', '6', '8', '9'], 2, '2^3 = 8.'));
quiz.push(Q('A zombie process is:', ['running with no parent', 'terminated but not yet reaped by its parent', 'a stopped process', 'a thread without a stack'], 1, 'Its PCB entry stays until the parent calls wait.'));
quiz.push(Q('Threads of the same process do NOT share:', ['Heap', 'Open files', 'Stack', 'Global variables'], 2, 'Each thread has its own stack and registers.'));
quiz.push(Q('In a many-to-one model, a blocking system call by one user thread:', ['blocks only that thread', 'blocks the whole process', 'is ignored', 'creates a kernel thread'], 1, 'There is only one kernel thread.'));
quiz.push(Q('Which is the main hidden cost of a context switch?', ['Saving 16 registers', 'Cold CPU caches and TLB for the new task', 'Printing a log', 'Disk access'], 1, 'The cache/TLB warm-up usually dominates.'));
quiz.push(Q('Fastest IPC mechanism for large local data sharing:', ['Pipe', 'Signal', 'Shared memory', 'Message queue'], 2, 'No kernel copy; but needs synchronisation.'));
quiz.push(Q('Which can carry a payload of data?', ['Signal (standard)', 'Pipe', 'Neither', 'Both are payload-free'], 1, 'Pipes carry byte streams; signals just carry a number.'));
quiz.push(Q('When does a reader on a pipe get EOF?', ['when the buffer is empty', 'when all write ends are closed and the buffer is drained', 'after 1 second', 'when the writer calls wait'], 1, 'EOF requires every write end to be closed.'));
quiz.push(Q('A thread context switch is usually cheaper than a process switch because:', ['it saves no registers', 'the address space (page tables) stays the same', 'threads never block', 'threads have no stacks'], 1, 'No page-table switch or TLB flush.'));
quiz.push(Q('A child whose parent exited is:', ['a zombie', 'an orphan, adopted by init/systemd', 'killed automatically', 'a thread'], 1, 'The kernel re-parents it to PID 1.'));

/* ===================== INTERVIEW ===================== */
interview.push(I('What is the difference between a program and a process?', 'B', `<p>A program is a passive file on disk: instructions plus initial data. A process is a program in execution: the OS has loaded it, given it a PID, a private virtual address space (text, data, heap, stack), a PCB, open files and CPU state. One program can have many processes at once, each with its own memory. A process also has a lifecycle (new, ready, running, waiting, terminated) while a program does not.</p>`, ['Where does each part of the address space come from?', 'Can two processes share the same code pages?']));
interview.push(I('Describe the process states and the legal transitions.', 'B', `<p>New (being created), ready (waiting for CPU), running (on a CPU), waiting/blocked (waiting for I/O or an event), terminated. Transitions: new to ready on admission; ready to running on dispatch; running to ready on pre-emption (time slice expiry or higher priority); running to waiting on I/O request or blocking call; waiting to ready when the event completes; running to terminated on exit. Waiting never goes straight to running because the scheduler must pick it.</p>`, ['What is the difference between blocked and ready?', 'What are suspended states?']));
interview.push(I('What does a PCB contain?', 'B', `<p>PID and parent PID, state, saved program counter and registers, stack pointer, scheduling data (priority, queue pointers, CPU time used), memory management info (page table pointer, limits), open file table, credentials (UID/GID), signal state, accounting and the exit status. In Linux it is <code>task_struct</code>. It lets the OS stop a process and resume it later exactly where it was.</p>`, ['Which fields are saved on a context switch?', 'Is there a PCB per thread?']));
interview.push(I('Explain fork(), exec() and wait(). How does a shell run a command?', 'B', `<p>fork clones the calling process; returns 0 in the child and the child PID in the parent. exec replaces the current process image with a new program (same PID); it returns only on error. wait/waitpid blocks the parent until a child terminates and returns its status, which also reaps the zombie. A shell forks, the child sets up redirection (dup2) and execs the command, and the parent waits (unless the command runs in the background).</p>`, ['Why fork then exec rather than one spawn call?', 'What is copy-on-write?']));
interview.push(I('What are zombie and orphan processes and how do you deal with them?', 'I', `<p>A zombie has terminated but its parent has not read its exit status, so the PCB stays (state Z, defunct). It cannot be killed; fix by making the parent call wait/waitpid (often from a SIGCHLD handler with WNOHANG), ignore SIGCHLD, or kill the parent so init reaps it. An orphan is a running process whose parent died; the kernel re-parents it to PID 1 (or a subreaper). Orphans are harmless; many zombies exhaust the PID table. In containers PID 1 must reap, so use an init like tini.</p>`, ['How would you find zombies?', 'What happens to a daemon you start with nohup &?']));
interview.push(I('How many processes does a loop of n fork() calls create?', 'B', `<p>If every process continues the loop and forks each iteration, the number of processes doubles each time: 2<sup>n</sup> total including the original, so 2<sup>n</sup> - 1 children. If the child breaks out or only one process forks (conditions on the return value), growth is linear (n + 1). Always draw the tree and track what each process does with the return value. Example: fork() &amp;&amp; fork() gives 3 processes.</p>`, ['What about fork inside nested loops?', 'How does this relate to a fork bomb?']));
interview.push(I('Threads versus processes: what is shared, what is private, and when would you choose each?', 'I', `<p>Threads share code, globals, heap, open files and signal handlers; each has its own stack, registers, program counter and thread-local storage. Threads are cheaper to create and switch and communicate through memory, but a bug or exploit in one affects all and shared state needs synchronisation. Processes have separate address spaces: stronger isolation and fault containment, but heavier and need IPC. Choose threads for tightly coupled, latency-sensitive work (game loop, DB worker pool); processes for untrusted or crash-prone work (browser tabs, sandboxes) and for CPU parallelism in languages with a GIL.</p>`, ['How are threads implemented in Linux?', 'What happens if one thread segfaults?']));
interview.push(I('Explain user-level vs kernel-level threads and the 1:1, N:1, M:N models.', 'I', `<p>Kernel threads are scheduled by the OS: true parallelism, and a blocking call only blocks its own thread, but creation and switching need system calls. User threads are managed by a runtime library: very cheap, but the kernel sees one thread, so no multi-core use and a blocking call can stall all of them. 1:1 maps each user thread to a kernel thread (Linux pthreads, Java platform threads); N:1 maps many to one; M:N multiplexes M user tasks over N kernel threads (Go, Erlang, Java virtual threads), giving cheap tasks with parallelism but needing a runtime scheduler that handles blocking.</p>`, ['How does Go handle a goroutine blocking in a system call?', 'Why did Linux choose 1:1?']));
interview.push(I('What happens during a context switch and what does it cost?', 'I', `<p>On a timer interrupt, a block, or a pre-emption, the kernel saves the running task's registers, program counter and stack pointer into its PCB, the scheduler picks the next task, and the kernel loads that task's saved state, switching page tables if it is a different process, then returns to user mode. Direct cost is roughly 1-5 microseconds; the larger hidden cost is cold CPU caches and TLB misses afterwards. Switching between threads of one process is cheaper. Too many threads or too short time slices can make a system spend a noticeable share of CPU just switching.</p>`, ['How do you measure context switches on Linux?', 'What is the difference between a mode switch and a context switch?']));
interview.push(I('List the IPC mechanisms and when you would use each.', 'I', `<p>Pipes: one-way byte streams between related processes (shell pipelines). Named pipes: same for unrelated processes. Shared memory: fastest, for big local data, needs semaphores or mutexes. Message queues: discrete messages with priorities, decoupled. Signals: asynchronous notifications without payload (SIGTERM, SIGHUP, SIGCHLD). Sockets: two-way, local (Unix-domain) or networked (TCP/UDP), the basis of client-server systems. The trade-off is speed and complexity (shared memory) versus safety and distribution (message passing and sockets).</p>`, ['How do you synchronise access to shared memory?', 'Why can writers to a pipe block?']));
interview.push(I('Why do pipes block, and what is SIGPIPE?', 'A', `<p>A pipe is a bounded kernel buffer (64 KB by default on Linux). A writer blocks when it is full, and a reader blocks when it is empty: natural backpressure. If every read end is closed, a write generates SIGPIPE (and EPIPE), which by default terminates the writer; that is why <code>yes | head</code> ends. A reader gets EOF only when every write end is closed, so unused ends must be closed after fork/dup2, otherwise programs hang. Writes up to PIPE_BUF (4096) are atomic.</p>`, ['How would you make a pipe non-blocking?', 'How do you size it?']));
interview.push(I('Why does printf output sometimes appear twice after fork()?', 'I', `<p>stdio buffers output in user memory. If a process has unflushed data when fork() runs, the child gets a copy of that buffer, and both processes later flush it. A terminal is line-buffered (flushes on newline) but pipes and files are fully buffered, so redirected output shows duplicates more often. Fixes: end printf with a newline when on a terminal, call fflush(stdout) before fork, and use _exit in a child after a failed exec so it does not flush inherited buffers.</p>`, ['Why use _exit after exec fails?', 'How does this relate to copy-on-write?']));
interview.push(I('How does copy-on-write make fork() fast, and where does it hurt?', 'A', `<p>fork duplicates the page tables, not the memory: all pages are marked read-only and shared between parent and child. A write by either triggers a page fault, and the kernel copies just that page. So fork of a huge process followed by exec is cheap, and Redis can snapshot a multi-GB dataset by forking. Costs: copying page tables of huge processes still takes milliseconds, and in the snapshot case write-heavy workloads cause many page copies and memory growth, up to double. vfork or posix_spawn avoid even the page-table copy when exec follows immediately.</p>`, ['What is a minor vs major page fault?', 'How does Redis limit the memory blow-up?']));
interview.push(I('A multithreaded program calls fork(). What can go wrong?', 'E', `<p>Only the calling thread exists in the child, but memory is a copy of everything. If another thread held a lock (for example the malloc lock or a stdio lock) at that instant, that lock stays locked forever in the child because the owner thread does not exist there: deadlock. Between fork and exec the child should call only async-signal-safe functions. Solutions: fork before creating threads, exec immediately, use posix_spawn, or register pthread_atfork handlers to reinitialise locks.</p>`, ['What does pthread_atfork do?', 'Why do Python multiprocessing and CUDA recommend spawn over fork?']));

registerModule({
  id: 'cs02',
  title: 'Processes & Threads',
  intro: `<p>Every program you run, every tab you open and every server request is built from <b>processes</b> and <b>threads</b>. This module explains them in plain words: what a process really is in memory, the PCB the OS keeps about it, the five process states, how <code>fork</code>, <code>exec</code> and <code>wait</code> create and clean up processes (and why zombies and orphans appear), how threads differ from processes, user versus kernel threads, what a context switch costs, and the six basic ways processes talk to each other. Each topic has a step-by-step visualizer, runnable C++ and Python, and interview-style practice.</p>`,
  goals: ['Draw the process memory layout and say which segment holds any variable', 'Draw the 5-state diagram, name every legal transition and say why waiting never goes straight to running', 'Predict how many processes a fork() loop creates and what fork plus printf buffering prints', 'Write fork/exec/waitpid and pipe code in C++, and fix zombies', 'Compare threads vs processes and 1:1, N:1, M:N models, and pick one for a given system', 'Estimate context-switch overhead and choose the right IPC mechanism for a scenario'],
  prereqs: `CS 1 (What an Operating System Does): kernel vs user mode and system calls. Basic C/C++ pointers and functions.`,
  hours: 9,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
