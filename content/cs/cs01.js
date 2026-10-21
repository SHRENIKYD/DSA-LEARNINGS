(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // small helper: a box node for architecture style graphs
  function bx(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 22 }; }

  // ---------------------------------------------------------------- TOPIC 1
  topics.push({
    title: 'What an OS Is For: Resource Manager + Abstraction (and its Services)',
    analogy: `<p>Think of a <b>big hotel</b>. Guests (programs) want rooms, food, Wi-Fi and a quiet night. The <b>hotel manager</b> (the operating system) hands out rooms fairly, stops one guest from breaking into another's room, and hides the messy kitchen and plumbing behind a simple front desk. Guests just say "I want a room" - they never wire the electricity themselves.</p>`,
    explain: `<p>An <b>operating system (OS)</b> is the software that sits between your programs and the hardware. It does <b>two big jobs</b>:</p>
      <ol>
      <li><b>Resource manager</b> - the CPU, memory, disk and network are limited and many programs want them at once. The OS decides <i>who gets what, and for how long</i>, and keeps programs from trampling each other.</li>
      <li><b>Abstraction (a nicer face)</b> - real hardware is ugly: a disk is just numbered blocks, a network card is a pile of registers. The OS gives you clean ideas instead: <b>files</b>, <b>processes</b>, <b>sockets</b>, <b>virtual memory</b>. You write <code>open("a.txt")</code>, not "move disk arm to sector 9120".</li>
      </ol>
      ${H.table(['Raw hardware thing', 'What the OS shows you', 'Resource it manages'], [['CPU cores', 'process / thread', 'CPU time (scheduling)'], ['RAM chips', 'private virtual address space', 'memory (paging)'], ['Disk blocks', 'files and folders', 'storage space + permissions'], ['NIC packets', 'sockets / connections', 'bandwidth + ports'], ['Keyboard, screen, USB', 'devices as files / events', 'device access']])}
      <p>The layers, from top to bottom: <b>applications</b> &rarr; <b>libraries</b> (like libc) &rarr; <b>kernel</b> (the always-running core of the OS) &rarr; <b>hardware</b>. Everything the OS offers to programs is called an <b>OS service</b>: process management, memory management, file systems, device I/O, networking, security/permissions, and error handling/accounting.</p>
      <p>Words to keep straight: the <b>kernel</b> is the core part that runs with full power. The "OS" in everyday talk also includes shells, system tools and libraries shipped with it (Linux = the kernel; Ubuntu = kernel + tools + libs).</p>`,
    clues: ['"What does an operating system do?" - always answer <b>resource manager + abstraction</b>', '"Why can\'t two programs overwrite each other\'s memory?" - protection is an OS job', '"Is the shell / the GUI part of the OS?" - the kernel is the core; shells and GUIs are user programs', '"Define kernel" vs "define operating system" - kernel is the privileged core, OS is the whole bundle', '"List OS services" - processes, memory, files, I/O devices, networking, security, accounting']
    ,
    code: [{ lang: 'cpp', title: 'The same job, with and without OS abstractions (concept)', code: `#include <unistd.h>
#include <fcntl.h>
#include <string.h>

// Thanks to the OS abstraction we write to a "file", not to disk sectors.
// The OS decides which blocks, which cache, which driver - we never see it.
int main() {
    int fd = open("hello.txt", O_CREAT | O_WRONLY | O_TRUNC, 0644); // abstraction: a file
    if (fd < 0) return 1;                       // error handling is an OS service too
    const char* msg = "hi from user space\\n";
    write(fd, msg, strlen(msg));                 // OS schedules the disk write for us
    close(fd);                                   // OS releases the resource
    return 0;
}` }],
    viz: {
      title: 'OS layers: a request travels down and the answer travels back up',
      input: 'save a file',
      inputLabel: 'What does the app want to do?',
      gen: function (input) {
        var act = String(input || 'save a file').trim().slice(0, 30) || 'save a file';
        var base = ['Hardware (CPU, RAM, disk, NIC)', 'Kernel (scheduler, memory, FS, drivers)', 'Libraries (libc, runtime)', 'Applications'];
        function f(narr, cur, ok) {
          var hl = {}; if (cur !== null) hl[cur] = 'cur'; (ok || []).forEach(function (i) { hl[i] = 'ok'; });
          return { narr: narr, parts: [{ type: 'stack', label: 'OS layers (bottom = hardware, top = apps)', items: base.slice(), hl: hl }, { type: 'vars', vals: { request: act, 'asking layer': cur === null ? '-' : base[cur].split(' ')[0] } }] };
        }
        return [
          f('The stack, from the metal at the bottom to your apps at the top. Each layer only talks to its neighbour.', null),
          f('An <b>application</b> wants to <b>' + H.esc(act) + '</b>. It does not know about disks, only about "files".', 3),
          f('The <b>library</b> (libc) turns the friendly call into a plain system call the kernel understands.', 2, [3]),
          f('The <b>kernel</b> checks permissions, finds free space and queues the work. It is the <b>resource manager</b> here.', 1, [3, 2]),
          f('The <b>hardware</b> finally does the real work (move bits to the disk controller).', 0, [3, 2, 1]),
          f('The result climbs back up: hardware &rarr; kernel &rarr; library &rarr; app. The app only sees "success".', 3, [0, 1, 2])
        ];
      }
    },
    examples: [
      { title: 'Resource manager in action: two programs, one CPU', html: `<p>Chrome and a music player both want the CPU. With 1 core, the OS gives each a slice of ~4 ms, switching so fast that both seem to run at once. Without an OS, one program would hog the CPU forever. ${H.arr(['Chrome', 'Music', 'Chrome', 'Music'], { label: 'CPU time slices', hl: { 0: 'b', 2: 'b', 1: 'g', 3: 'g' } })}</p>` },
      { title: 'Abstraction: one idea, many devices', html: `<p><code>read(fd, buf, n)</code> works the same whether <code>fd</code> is a file on an SSD, a USB stick, a keyboard or a network socket. The OS hides the difference - that is the "everything is a file" idea of UNIX.</p>` },
      { title: 'Protection: why one crash does not kill the machine', html: `<p>If your program writes to a bad pointer, the OS kills <i>only your process</i> (segmentation fault). Other programs and the OS itself keep running because each process lives in its own private address space.</p>` },
      { title: 'Kernel vs OS vs shell', html: `<p>${H.kv([['Kernel', 'Linux 6.x (always in memory, privileged)'], ['System tools', 'ls, cp, systemd (user programs shipped with the OS)'], ['Shell', 'bash (a normal user program)'], ['Distribution', 'Ubuntu = kernel + tools + libs + installer']], { label: 'Who is who' })}</p>` }
    ],
    deepDive: `<p><b>Mechanism vs policy.</b> A classic design rule: the OS separates <i>mechanism</i> (how to do something, e.g. "switch to another process") from <i>policy</i> (what to decide, e.g. "which process next"). Good kernels keep mechanisms fixed and let policies be swapped - Linux has several I/O schedulers and CPU scheduling classes for exactly this reason.</p>
      <p><b>Virtualisation of everything.</b> The OS makes one CPU look like many (processes), one RAM look like a huge private space per process (virtual memory), one disk look like a tree of files. Each "illusion" costs a little performance, and a lot of OS research is making the illusion cheaper.</p>
      <p><b>Types of OS.</b> General-purpose (Linux, Windows, macOS), real-time (RTOS such as FreeRTOS, where meeting a deadline matters more than throughput), embedded (tiny, often no virtual memory), mobile (Android is Linux kernel + Android runtime), and hypervisors (a thin OS whose "programs" are whole virtual machines). Some embedded systems have <b>no OS</b> at all ("bare metal").</p>
      <p><b>Scale of the thing.</b> The Linux kernel is ~30+ million lines of code; most are device drivers. Because the kernel runs with full power, a bug in it can corrupt every program - which is why <i>privilege separation</i> (next topic) is the foundation of everything else.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI training and inference jobs are now the biggest "guests" in the hotel. The OS must hand out <b>GPUs</b>, huge pinned memory and fast network links fairly; Linux gained better GPU memory management, and cloud OS images are tuned for accelerators. New "AI-first OS" ideas (agents that call tools) still sit <i>on top of</i> a normal kernel doing the same resource management.</p>
      <p><b>Use AI as a partner:</b> ask <code>Explain the Linux boot or syscall path as a story with a hotel analogy, then quiz me</code>, or paste a <code>strace</code> output and ask what each line means. Ask it to generate "which OS service is involved?" drills.</p>
      <p><b>Where AI goes wrong:</b> it often mixes up <i>kernel</i> and <i>OS</i>, or says "the OS runs your code" when it is the CPU that runs it. It may invent syscall names or numbers.</p>
      <p><b>What you must still own:</b> a clear mental model of layers, what runs in privileged mode and why, and how to verify claims with <code>man 2 syscall_name</code> and <code>strace</code>.</p>`,
    problems: [{
      title: 'Name the OS Service', level: 'Easy', tags: ['os services', 'basics'],
      statement: `<p>For each of these user actions, name the main OS service that makes it possible: (a) running two apps "at the same time", (b) one app cannot read another's variables, (c) saving a document, (d) loading a web page, (e) asking for the current time.</p>`,
      constraints: `One service per action; pick the most direct one.`,
      example: `<p>"Typing in a terminal": <b>device I/O</b> service (keyboard driver delivers characters). ${H.c('g', 'Match action to the resource being managed.')}</p>`,
      brute: { why: `<p>A weak answer says "the OS does it" for everything. That hides the real idea: each action maps to a <i>different resource</i> and a different kernel subsystem.</p>` },
      mcq: { q: 'Which statement best describes an OS?', options: ['A program that only draws windows', 'Software that manages hardware resources and gives programs simple abstractions', 'The same thing as the CPU', 'A compiler'], answer: 1, explain: 'Resource manager + abstraction are the two core jobs.' },
      hints: [`<p>Ask first: which resource is involved - CPU time, memory, disk, network, or a device?</p>`, `<p>Map the resource to a service: CPU -&gt; process management/scheduling, RAM -&gt; memory management, disk -&gt; file system, NIC -&gt; networking.</p>`, `<p>Protection ("cannot read another's data") is memory management + security: separate address spaces enforced by hardware the OS programs.</p>`],
      solution: {
        approach: `<p>(a) <b>Process management / CPU scheduling</b> - time-slices the CPU. (b) <b>Memory management + protection</b> - each process gets a private virtual address space and the MMU blocks outside access. (c) <b>File system</b> - turns "save" into allocated disk blocks, with permissions. (d) <b>Networking</b> (socket + TCP/IP stack) plus device I/O for the network card. (e) <b>A system call</b> such as <code>clock_gettime</code>, answered by the kernel (often via the vDSO fast path without entering the kernel at all). Pattern: identify the resource, name the subsystem.</p>`,
        complexity: `<p>No computation - the skill is mapping each user-visible action to a resource and its kernel subsystem.</p>`
      }
    }]
  });

  // ---------------------------------------------------------------- TOPIC 2
  topics.push({
    title: 'Kernel Mode vs User Mode and Privilege Rings',
    analogy: `<p>A <b>bank</b> has a public lobby and a locked vault. Customers (user programs) wait in the lobby and may only ask the teller for things. Only staff (the kernel) may walk into the vault. A customer cannot just open the vault door - they must ask through the counter, and staff decide.</p>`,
    explain: `<p>The CPU has a <b>mode bit</b> (really a few bits) that says how powerful the running code is.</p>
      <ul>
      <li><b>User mode</b> (restricted): can do normal maths and touch its own memory. It <b>cannot</b> talk to devices, change page tables, turn interrupts off or halt the CPU. If it tries a forbidden instruction, the CPU raises an exception and the OS usually kills the program.</li>
      <li><b>Kernel mode</b> (privileged, "supervisor"): can run <i>every</i> instruction and touch <i>all</i> memory and devices. Only the OS kernel runs here.</li>
      </ul>
      <p>On x86 this is drawn as <b>privilege rings</b>: ring 0 (most powerful, kernel) to ring 3 (least, user apps). Rings 1 and 2 are almost never used by mainstream OSes. ARM calls them <b>exception levels</b> (EL0 user, EL1 kernel, EL2 hypervisor). Modern x86 also has a "ring -1" for hypervisors (VMX root mode).</p>
      ${H.table(['', 'User mode (ring 3)', 'Kernel mode (ring 0)'], [['Who runs here', 'your app, libc, browser', 'kernel + drivers'], ['I/O instructions (in/out)', '<span class="c-r">forbidden</span>', '<span class="c-g">allowed</span>'], ['Edit page tables', '<span class="c-r">no</span>', '<span class="c-g">yes</span>'], ['Disable interrupts', '<span class="c-r">no</span>', '<span class="c-g">yes</span>'], ['Memory reach', 'own virtual space only', 'everything'], ['If it crashes', 'only that process dies', 'whole system (kernel panic / BSOD)']])}
      <p><b>How does a program legally get kernel help?</b> Not by flipping the mode bit itself (that is itself a privileged action). It executes a special instruction (<code>syscall</code> / <code>svc</code> / <code>int 0x80</code>) that makes the <i>hardware</i> switch to kernel mode and jump to a fixed, OS-chosen address. The kernel does the work, then executes a return instruction (<code>sysret</code>/<code>iret</code>) which drops back to user mode. That is the next topic.</p>`,
    clues: ['"Why do we need dual-mode operation?" - protect the OS and other programs from buggy/malicious code', '"Which instructions are privileged?" - I/O, halt, set mode bit, load page table, disable interrupts', '"What is ring 0 / ring 3?" - x86 privilege levels, kernel vs user', '"What happens if user code runs a privileged instruction?" - CPU raises an exception (general protection fault); OS kills the process', '"Mode bit" 0/1 questions - mode bit is 0 for kernel and 1 for user in textbook convention (Silberschatz)'],
    code: [{ lang: 'cpp', title: 'Trying a privileged instruction in user mode (crashes with SIGSEGV)', code: `#include <cstdio>

// HLT stops the CPU. It is a ring-0-only instruction.
// Running this in a normal program makes the CPU raise a general protection
// fault; Linux turns that into SIGSEGV and kills the process.
// This program is only SYNTAX checked by the course tools - do not run it expecting output.
int main() {
    std::puts("about to execute a privileged instruction");
#if defined(__x86_64__)
    asm volatile("hlt");   // privileged: only the kernel may do this
#endif
    std::puts("never printed on x86 - the process was killed");
    return 0;
}` }],
    viz: {
      title: 'User -> kernel -> user: the mode switch on one system call',
      input: 'read',
      inputLabel: 'System call name (read, write, getpid, open)',
      gen: function (input) {
        var sc = String(input || 'read').trim().toLowerCase().replace(/[^a-z_]/g, '').slice(0, 12) || 'read';
        var nodes = [bx('U', 'User code (app)', 14, 12, 24), bx('L', 'libc wrapper', 14, 42, 24), bx('K', 'Kernel handler', 74, 42, 26), bx('H', 'Hardware / device', 74, 12, 26)];
        function f(narr, mode, ehl, hl, ring) {
          return { narr: narr, parts: [
            { type: 'graph', label: 'Where the CPU is executing', directed: true, height: 56, nodes: nodes, edges: [['U', 'L', 'call'], ['L', 'K', 'trap'], ['K', 'H', 'I/O'], ['K', 'L', 'return']], hl: hl, ehl: ehl },
            { type: 'vars', vals: { 'mode bit': mode, ring: ring, syscall: sc + '()' }, hl: { 'mode bit': mode === 'KERNEL' ? 'bad' : 'ok' } }
          ] };
        }
        return [
          f('The app is running its own code in <b>user mode</b> (ring 3). It cannot touch devices.', 'USER', {}, { U: 'cur' }, 3),
          f('The app calls <code>' + sc + '()</code>. This is just a normal function call into the libc wrapper - still <b>user mode</b>.', 'USER', { 'U-L': 'ok' }, { L: 'cur' }, 3),
          f('The wrapper puts the syscall number in a register and runs the <code>syscall</code> instruction. The <b>hardware</b> flips the CPU into <b>kernel mode</b> and jumps to the kernel entry point.', 'KERNEL', { 'L-K': 'ok' }, { K: 'sel' }, 0),
          f('Now in <b>kernel mode</b> (ring 0). The kernel validates arguments and, if needed, talks to the device.', 'KERNEL', { 'K-H': 'ok' }, { K: 'sel', H: 'cur' }, 0),
          f('Work done. The kernel puts the result in a register and runs <code>sysret</code>, which drops the CPU back to <b>user mode</b>.', 'USER', { 'K-L': 'ok' }, { L: 'cur' }, 3),
          f('Back in the app with the return value. That was <b>2 mode switches</b>: user&rarr;kernel and kernel&rarr;user.', 'USER', {}, { U: 'ok' }, 3)
        ];
      }
    },
    examples: [
      { title: 'Which of these is privileged?', html: `<p>${H.table(['Instruction', 'Privileged?'], [['ADD r1, r2', '<span class="c-g">no</span>'], ['IN / OUT (port I/O)', '<span class="c-r">yes</span>'], ['HLT', '<span class="c-r">yes</span>'], ['MOV to CR3 (page-table base)', '<span class="c-r">yes</span>'], ['CLI (disable interrupts)', '<span class="c-r">yes</span>'], ['READ a normal variable', '<span class="c-g">no</span>']])}</p>` },
      { title: 'Why a bug in a driver is scarier than a bug in an app', html: `<p>A driver runs in kernel mode (ring 0). A wild pointer there can overwrite kernel data, so the whole machine crashes (Linux "kernel panic", Windows blue screen). The same bug in an app only kills that app. That is why the 2024 CrowdStrike outage - a faulty kernel-level driver - crashed millions of Windows PCs.</p>` },
      { title: 'Rings in a virtual machine', html: `<p>Inside a VM the guest kernel believes it is in ring 0, but the real machine is in a deeper level controlled by the hypervisor. Intel VT-x / AMD-V add a "root vs non-root" mode so the guest kernel can run natively yet still be contained.</p>`, code: { lang: 'bash', check: false, title: 'See the CPU virtualisation flag', code: `# vmx = Intel VT-x, svm = AMD-V
grep -E -o 'vmx|svm' /proc/cpuinfo | sort -u` } }
    ],
    deepDive: `<p><b>How hardware enforces it.</b> Mode is stored in a CPU register (the low bits of <code>CS</code> on x86 give the Current Privilege Level, CPL). Page-table entries have a <i>user/supervisor</i> bit: a page marked "supervisor only" faults if CPL=3 touches it. The kernel maps its own memory into every process's address space (supervisor bit set) so a syscall does not need to change page tables.</p>
      <p><b>Meltdown (2018) changed this.</b> Speculative execution could leak kernel memory to user code through caches. The fix, <b>KPTI</b> (kernel page-table isolation), removes most kernel mappings while in user mode - but then every syscall must switch page tables (and flush parts of the TLB), making syscalls noticeably slower on affected CPUs. This is a good example of how a hardware detail changes OS performance.</p>
      <p><b>Other protection bits.</b> SMEP/SMAP stop the kernel from executing/reading user memory by accident (blocks a class of exploits); NX bit stops running data as code. Modern kernels also use <b>seccomp</b> to let a process voluntarily shrink the syscalls it may call.</p>
      <p><b>Unikernels and library OSes</b> run app and kernel in one privilege level to avoid the switch cost, trading away isolation - sensible when a whole VM runs only one app.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents that run generated code need strong isolation. Instead of trusting "the agent will behave", platforms run it in a sandbox - a container with seccomp, a microVM (Firecracker), or a user-space kernel (gVisor) - so even malicious code stays in the restricted side of the privilege line. GPU drivers (huge, kernel-level code) are also a prime target and attention for hardening.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 10 instructions and I classify each as privileged or not, then explain my mistakes</code>. Or paste a kernel oops log and ask it to explain which mode crashed.</p>
      <p><b>Where AI goes wrong:</b> it may say "user mode programs cannot access hardware at all" (they can through syscalls or mapped device memory the kernel allowed), or confuse rings with the number of CPU cores.</p>
      <p><b>What you must still own:</b> the reasoning chain "protection needs hardware support, so a mode bit, so privileged instructions, so a controlled gate (the syscall)". Interviewers want that chain.</p>`,
    problems: [{
      title: 'Why Can Users Not Just Set the Mode Bit?', level: 'Easy', tags: ['kernel mode', 'protection'],
      statement: `<p>A student says: "To get kernel privileges my program can just set the mode bit to 0 itself." Explain why this cannot work and what safe mechanism exists instead.</p>`,
      constraints: `Answer in 3-6 sentences; mention privileged instructions and the controlled entry point.`,
      example: `<p>If any program could set the bit, every program would become the kernel. ${H.c('g', 'Changing the mode bit is itself a privileged operation.')}</p>`,
      brute: { why: `<p>Weak answer: "because the OS blocks it". That is circular - it does not say <i>how</i> the OS can block anything once a program is running at full power.</p>` },
      mcq: { q: 'What happens when user code executes a privileged instruction?', options: ['It runs normally', 'The CPU raises an exception and the OS typically terminates the process', 'The computer reboots', 'The instruction is silently ignored forever'], answer: 1, explain: 'Hardware traps; the kernel handler decides, usually killing the process.' },
      hints: [`<p>Think about what "privileged instruction" means: some instructions only work if the current mode is kernel. Writing the mode register is one of them.</p>`, `<p>So the program needs another way in. The hardware offers a special instruction (syscall/trap) that switches mode <i>and</i> jumps to a fixed address.</p>`, `<p>The key: the program cannot choose where it lands. The OS set the entry address at boot, so the user only gets kernel services the OS wrote.</p>`],
      solution: {
        approach: `<p>Setting the mode bit is a <b>privileged operation</b>: the CPU only allows it when already in kernel mode, so a user program that tries gets a protection exception and is killed. Otherwise the whole protection model would be pointless. The safe way in is the <b>system call (trap) instruction</b>: the hardware itself flips to kernel mode and simultaneously jumps to an address the <b>kernel configured at boot</b> (the syscall entry point or a vector-table slot). The user cannot pick the target, cannot keep running its own code in kernel mode, and the kernel validates the arguments. On return, the kernel executes <code>sysret</code>/<code>iret</code>, restoring user mode. So privilege is lent for exactly one controlled, audited trip.</p>`,
        complexity: `<p>Conceptual question. The cost to remember is that each trip costs hundreds of CPU cycles (see the syscall topic).</p>`
      }
    }]
  });

  // ---------------------------------------------------------------- TOPIC 3
  topics.push({
    title: 'System Calls: From printf() down to write() and Back',
    analogy: `<p>A <b>restaurant order</b>. You (the app) cannot walk into the kitchen. You tell the waiter (library wrapper) your order; the waiter writes a ticket with a <b>dish number</b> (syscall number) and hands it through the kitchen window (trap). The chef (kernel) cooks, puts the plate back, and you eat. The window is slow compared with grabbing food yourself - so smart diners order several dishes in one ticket.</p>`,
    explain: `<p>A <b>system call (syscall)</b> is the official doorway from a user program into the kernel. Your code never calls the kernel directly; it calls a normal C function (like <code>write</code>) from libc, which does the special trapping work.</p>
      <p><b>What happens on <code>write(1, "hi\\n", 3)</code>, step by step:</b></p>
      <ol>
      <li><b>Library wrapper:</b> libc puts the syscall number (1 = <code>write</code> on x86-64 Linux) in register <code>rax</code> and the arguments (fd, buffer, length) in <code>rdi, rsi, rdx</code>.</li>
      <li><b>Trap:</b> it runs the <code>syscall</code> instruction. The CPU saves the user's return address, switches to kernel mode and jumps to the kernel's syscall entry.</li>
      <li><b>Dispatch:</b> the kernel uses the number to index the <b>syscall table</b> (an array of function pointers) and calls <code>sys_write</code>.</li>
      <li><b>Validate and work:</b> check the fd is valid, the user buffer is readable (never trust user pointers!), then hand the bytes to the terminal or file driver.</li>
      <li><b>Return:</b> put the result (bytes written, or <code>-errno</code> on error) in <code>rax</code>, run <code>sysret</code>. Back in user mode, libc turns a negative value into <code>errno</code> and returns -1.</li>
      </ol>
      <p><b>The chain for printf:</b> <code>printf("hi\\n")</code> &rarr; formats text into a user-space buffer inside libc &rarr; (when the buffer is flushed: newline on a terminal, or full on a file) &rarr; <code>write(1, buf, n)</code> &rarr; kernel &rarr; terminal driver &rarr; screen.</p>
      ${H.table(['Number (x86-64)', 'Name', 'Typical use'], [['0', 'read', 'read bytes from fd'], ['1', 'write', 'write bytes to fd'], ['2', 'open', 'open a file'], ['3', 'close', 'release an fd'], ['39', 'getpid', 'my process id'], ['57', 'fork', 'clone this process'], ['59', 'execve', 'run a new program'], ['60', 'exit', 'end process']])}
      <p><b>Why are syscalls "expensive"?</b> A syscall is not just a function call. It costs: the mode switch itself (~100-200 cycles), saving/restoring registers, security checks, possibly flushing CPU state (after Meltdown fixes), and worst of all <b>cache and TLB pollution</b> - the kernel code evicts your hot data. A plain function call is ~1-5 ns; a trivial syscall is ~100-500 ns; so avoid one syscall per byte. That is why <code>printf</code> <b>buffers</b> and why we batch with <code>readv</code>, <code>writev</code>, <code>sendmmsg</code> and <code>io_uring</code>.</p>`,
    clues: ['"What happens when you call printf / read in C?" - walk through wrapper &rarr; trap &rarr; table &rarr; handler &rarr; return', '"Why is a system call slower than a function call?" - mode switch, validation, cache/TLB effects', '"Why is printf buffered?" - fewer syscalls', '"How does the kernel know which function to run?" - syscall number indexes a table', '"Count the mode switches" - 2 per syscall (in and out); a loop of N syscalls = 2N switches', '"strace shows..." - strace prints every syscall a program makes']
    ,
    code: [{ lang: 'cpp', title: 'write() and getpid() - real syscalls through libc', code: `#include <unistd.h>
#include <sys/syscall.h>
#include <cstring>
#include <cstdio>

int main() {
    // 1) libc wrapper for the write syscall: fd 1 is stdout.
    const char msg[] = "hello via write()\\n";
    ssize_t n = write(1, msg, sizeof msg - 1);   // user -> kernel -> user (2 mode switches)

    // 2) getpid() through the wrapper...
    pid_t a = getpid();

    // 3) ...and the same call made "by hand" with its number.
    //    syscall() loads the number into rax and executes the CPU trap.
    long b = syscall(SYS_getpid);

    // 4) printf formats in USER space and buffers; the actual write happens
    //    later (at the newline on a terminal) - fewer syscalls than 1 per char.
    std::printf("wrote %zd bytes, pid=%d, pid again=%ld\\n", n, (int)a, b);
    return 0;
}` },
    { lang: 'cpp', title: 'Cost of one syscall per byte vs one buffered syscall', code: `#include <unistd.h>
#include <cstring>

// Slow: strlen(s) system calls (each one a user<->kernel round trip).
void slow_write(const char* s) {
    for (size_t i = 0; i < strlen(s); ++i) write(1, s + i, 1);
}

// Fast: ONE system call for the whole string. Same output, ~N times fewer mode switches.
void fast_write(const char* s) {
    write(1, s, strlen(s));
}

int main() {
    slow_write("slow path\\n");   // 10 syscalls
    fast_write("fast path\\n");   // 1 syscall
    return 0;
}` },
    { lang: 'bash', check: false, title: 'Count a program\'s syscalls with strace', code: `# -c = summary table: calls, errors, time per syscall
strace -c ls > /dev/null
# Typical output (numbers vary):
# % time     seconds  usecs/call     calls    errors syscall
# ------ ----------- ----------- --------- --------- ----------------
#  25.00    0.000100           5        20           mmap
#  18.00    0.000072           4        18           openat
#  (more rows follow)
# Watch only the write syscalls of a tiny program:
strace -e trace=write echo hello` },
    { lang: 'python', run: true, title: 'Simulating a syscall table dispatch (stdlib only)', code: `# A toy "kernel": the syscall number indexes a table of handlers.
mode = "USER"
switches = 0

def sys_read(fd, n):   return "read %d bytes from fd %d" % (n, fd)
def sys_write(fd, s):  return "wrote %r to fd %d" % (s, fd)
def sys_getpid():      return 4242

# The syscall table: index -> handler (like sys_call_table in Linux)
TABLE = {0: sys_read, 1: sys_write, 39: sys_getpid}

def trap(number, *args):
    """What the CPU 'syscall' instruction + kernel entry does."""
    global mode, switches
    mode = "KERNEL"; switches += 1          # hardware flips to kernel mode
    handler = TABLE.get(number)
    if handler is None:
        result = -38                          # -ENOSYS: function not implemented
    else:
        result = handler(*args)               # dispatch via the table
    mode = "USER"; switches += 1              # sysret back to user mode
    return result

print("start mode:", mode)
print(trap(39))
print(trap(1, 1, "hi"))
print(trap(0, 0, 100))
print(trap(999))                              # unknown number
print("total mode switches:", switches)       # 2 per call x 4 calls = 8` }],
    viz: [{
      title: 'Trace printf("hi\\n") all the way to the screen',
      input: 'printf',
      inputLabel: 'Library call to trace (printf, puts)',
      gen: function (input) {
        var fn = /puts/i.test(String(input)) ? 'puts' : 'printf';
        var nodes = [bx('A', 'main()', 10, 8, 18), bx('B', fn + '() in libc', 10, 30, 22), bx('C', 'write() wrapper', 10, 52, 24), bx('D', 'syscall table', 52, 52, 22), bx('E', 'sys_write()', 52, 30, 22), bx('F', 'tty driver', 82, 30, 18), bx('G', 'Screen', 82, 8, 16)];
        var edges = [['A', 'B', 'call'], ['B', 'C', 'flush'], ['C', 'D', 'trap #1'], ['D', 'E', 'index 1'], ['E', 'F', 'bytes'], ['F', 'G', 'pixels']];
        function f(narr, mode, hl, ehl, n) {
          return { narr: narr, parts: [{ type: 'graph', label: 'printf -> write path', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl }, { type: 'vars', vals: { mode: mode, 'syscalls so far': n, 'mode switches': n * 2 > 0 ? (mode === 'KERNEL' ? 1 : 2) : 0 }, hl: { mode: mode === 'KERNEL' ? 'bad' : 'ok' } }] };
        }
        return [
          f('<code>main()</code> calls <code>' + fn + '("hi\\n")</code>. Still in user mode - just a function call.', 'USER', { A: 'cur' }, {}, 0),
          f('libc formats the text and puts it in its own user-space buffer. A newline on a terminal means "flush now".', 'USER', { B: 'cur' }, { 'A-B': 'ok' }, 0),
          f('libc calls the <b>write()</b> wrapper with (fd=1, buf, 3). It loads registers: rax=1, rdi=1, rsi=buf, rdx=3.', 'USER', { C: 'cur' }, { 'A-B': 'ok', 'B-C': 'ok' }, 0),
          f('The <code>syscall</code> instruction traps: CPU enters <b>kernel mode</b> and jumps to the kernel entry.', 'KERNEL', { D: 'sel' }, { 'C-D': 'ok' }, 1),
          f('The kernel indexes the table with <b>1</b> and finds <code>sys_write</code>. It checks fd and buffer pointer.', 'KERNEL', { E: 'sel' }, { 'D-E': 'ok' }, 1),
          f('<code>sys_write</code> hands the 3 bytes to the terminal driver, which draws them (or sends them to the terminal emulator).', 'KERNEL', { F: 'sel', G: 'ok' }, { 'E-F': 'ok', 'F-G': 'ok' }, 1),
          f('<code>sysret</code>: return value 3 goes into rax, CPU returns to <b>user mode</b>, libc returns 3 to ' + fn + ', and main continues. <b>1 syscall = 2 mode switches.</b>', 'USER', { A: 'ok' }, {}, 1)
        ];
      }
    }, {
      title: 'Syscall table lookup',
      input: '1',
      inputLabel: 'Syscall number (0, 1, 2, 3, 39, 57, 59, 60 or any)',
      gen: function (input) {
        var T = [[0, 'read', 'sys_read'], [1, 'write', 'sys_write'], [2, 'open', 'sys_open'], [3, 'close', 'sys_close'], [39, 'getpid', 'sys_getpid'], [57, 'fork', 'sys_fork'], [59, 'execve', 'sys_execve'], [60, 'exit', 'sys_exit']];
        var num = parseInt(String(input).trim(), 10);
        if (isNaN(num) || num < 0 || num > 999) throw new Error('Enter a syscall number between 0 and 999');
        var frames = [];
        function tbl(hlRow) { var h = {}; if (hlRow >= 0) h[hlRow] = 'cur'; return { type: 'table', label: 'sys_call_table (excerpt)', columns: ['rax', 'name', 'kernel function'], rows: T.map(function (r) { return [r[0], r[1], r[2]]; }), hl: h }; }
        frames.push({ narr: 'The kernel keeps a <b>table of handlers</b> indexed by syscall number. A user program only supplies a number.', parts: [tbl(-1), { type: 'vars', vals: { rax: num } }] });
        frames.push({ narr: 'User code ran <code>syscall</code> with <b>rax = ' + num + '</b>. The kernel first checks the number is inside the table size.', parts: [tbl(-1), { type: 'vars', vals: { rax: num, 'table size (real)': '~450' }, hl: { rax: 'cur' } }] });
        var idx = -1; for (var i = 0; i < T.length; i++) if (T[i][0] === num) idx = i;
        if (idx >= 0) {
          frames.push({ narr: 'Lookup <code>table[' + num + ']</code> &rarr; <b>' + T[idx][2] + '</b>. This is an array index, so it is O(1).', parts: [tbl(idx), { type: 'vars', vals: { rax: num, handler: T[idx][2] }, hl: { handler: 'ok' } }] });
          frames.push({ narr: 'The kernel calls <code>' + T[idx][2] + '(...)</code> in kernel mode with the user arguments (after validating them).', parts: [tbl(idx), { type: 'vars', vals: { mode: 'KERNEL', running: T[idx][2] }, hl: { mode: 'bad' } }] });
          frames.push({ narr: 'Result goes in rax and <code>sysret</code> returns to user mode.', parts: [tbl(idx), { type: 'vars', vals: { mode: 'USER', 'return value': 'in rax' }, hl: { mode: 'ok' } }] });
        } else {
          frames.push({ narr: 'Number ' + num + ' is not in this excerpt. A real kernel either has a handler (many numbers exist) or returns <span class="c-r">-ENOSYS</span> ("function not implemented").', parts: [tbl(-1), { type: 'vars', vals: { rax: num, result: '-ENOSYS (38)' }, hl: { result: 'bad' } }] });
          frames.push({ narr: 'Either way the kernel never jumps to an address chosen by the user, only to a table slot it owns. That is the safety property.', parts: [tbl(-1), { type: 'vars', vals: { mode: 'USER (after sysret)' } }] });
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Count the mode switches in a loop', html: `<p>A loop calls <code>read()</code> 1,000 times, each reading 1 byte. That is 1,000 syscalls = <b>2,000 mode switches</b>. If instead you read 4,096 bytes in one call: 1 syscall = 2 mode switches. ${H.table(['Plan', 'Syscalls', 'Mode switches'], [['1 byte x 1000', '1000', '2000'], ['1000 bytes x 1', '1', '2'], ['4096-byte buffer, 10 MB file', '2560', '5120']])}</p>` },
      { title: 'errno and error returns', html: `<p>Kernel returns <code>-errno</code> in rax; libc converts to the C convention: return -1 and set the global <code>errno</code>. So <code>open("nope", O_RDONLY)</code> returns -1 with <code>errno == ENOENT</code> (2). Always check the return value of every syscall.</p>`, code: { lang: 'cpp', title: 'Checking errno', code: `#include <fcntl.h>
#include <unistd.h>
#include <cerrno>
#include <cstring>
#include <cstdio>

int main() {
    int fd = open("/definitely/not/here", O_RDONLY);
    if (fd == -1) {
        // errno was set by the wrapper from the kernel's -ENOENT
        std::printf("open failed: %s (errno=%d)\\n", std::strerror(errno), errno);
        return 1;
    }
    close(fd);
    return 0;
}` } },
      { title: 'vDSO: a syscall that skips the kernel', html: `<p>Calls like <code>gettimeofday</code> and <code>clock_gettime</code> are so frequent that Linux maps a tiny read-only page (the <b>vDSO</b>) into every process. It reads the time from shared memory, so <i>no mode switch happens</i>. Quick check: <code>strace date</code> shows far fewer time syscalls than you would expect.</p>` },
      { title: 'Library wrapper vs raw syscall', html: `<p>You usually call <code>write()</code> (a libc wrapper) not the raw instruction. Wrappers add error handling and portability. Use <code>syscall(SYS_xxx, ...)</code> only for calls libc does not wrap yet.</p>` }
    ],
    deepDive: `<p><b>Entry paths.</b> Old x86 used <code>int 0x80</code> (a software interrupt through the interrupt table, slow). Then <code>sysenter</code>, and on x86-64 the <code>syscall</code>/<code>sysret</code> pair, which skips table lookups in the CPU. ARM64 uses <code>svc #0</code>, RISC-V uses <code>ecall</code>. Windows historically used <code>int 0x2e</code>, now <code>syscall</code>, and apps call <code>ntdll.dll</code> stubs rather than raw numbers (numbers change between Windows versions; Linux's numbers are a stable ABI).</p>
      <p><b>Argument safety.</b> The kernel never dereferences a user pointer directly: it uses <code>copy_from_user</code>/<code>copy_to_user</code>, which handle faults and check the address is in the user range. A missing check = a privilege-escalation bug (these are classic CVEs). Also time-of-check-to-time-of-use (TOCTOU): another thread may change user memory after the kernel validated it, so the kernel copies first, then checks the copy.</p>
      <p><b>Cost model.</b> The raw instruction pair is ~50-100 cycles; with entry/exit bookkeeping and mitigations (KPTI, retpolines, microcode barriers) a null syscall can reach ~0.3-1 microsecond on some servers. The indirect cost (cache/TLB misses after returning) is often larger than the direct cost. Rule of thumb: you can do roughly 1-3 million trivial syscalls per second per core; you can do a billion function calls.</p>
      <p><b>Avoiding syscalls.</b> Buffering (stdio), batching (<code>writev</code>, <code>recvmmsg</code>), memory-mapped files (<code>mmap</code>), user-space networking (DPDK), and asynchronous rings (<code>io_uring</code> submits many operations with one or zero syscalls). Also <b>seccomp-bpf</b> filters syscalls by number for sandboxes and containers.</p>
      <p><b>Blocking syscalls.</b> <code>read</code> on a socket may sleep: the kernel parks your thread and runs something else, then wakes you when data arrives (via an interrupt). "Slow" is therefore not only the mode switch - the thread may wait for the real world.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI services are syscall-heavy (millions of small network reads/writes per second), so inference servers batch requests, use <code>io_uring</code>, zero-copy and kernel-bypass networking. Observability tools now use <b>eBPF</b> to watch syscalls at near-zero cost, and AI-assisted tools read those traces to explain slowness.</p>
      <p><b>Use AI as a partner:</b> paste <code>strace -c</code> output and ask <code>Which syscalls dominate and what code pattern probably causes them?</code> Ask it to rewrite a per-byte loop into buffered I/O and to explain the expected speed-up. Have it write a small benchmark, then run it yourself.</p>
      <p><b>Where AI goes wrong:</b> it may quote wrong syscall numbers or architecture-specific details (x86-64 vs ARM64 numbers differ), claim printf always calls write immediately (it does not - buffering!), or say a syscall costs "microseconds" without context.</p>
      <p><b>What you must still own:</b> measuring (<code>strace -c</code>, <code>perf</code>), explaining the five-step path, and designing code that makes fewer, larger syscalls.</p>`,
    after: `<p>Next, you will see how the CPU gets <i>interrupted</i> by devices and faults - the other way the kernel gets control.</p>`,
    problems: [{
      title: 'Trace a printf Call', level: 'Medium', tags: ['syscall', 'printf', 'write'],
      statement: `<p>Trace what happens, from user code to hardware and back, when a C program runs <code>printf("hi\\n");</code> with stdout connected to a terminal. List each layer, the mode the CPU is in, and how many mode switches occur. Then say what changes if stdout is redirected to a file.</p>`,
      constraints: `Assume x86-64 Linux, glibc, a single printf, no errors.`,
      example: `<p>Terminal: line-buffered &rarr; flush at the newline &rarr; <b>1 write syscall</b> &rarr; <b>2 mode switches</b>. File: fully buffered &rarr; the write happens at <code>exit()</code>/<code>fflush</code>/buffer full (usually 4096 bytes).</p>`,
      brute: { why: `<p>Weak answer: "printf calls the kernel and prints". It skips buffering, the wrapper, the table lookup and the mode switch count - exactly what interviewers probe.</p>` },
      mcq: { q: 'You run printf("a"); printf("b"); printf("c\\n"); to a terminal. How many write syscalls usually occur?', options: ['3', '1', '0', '6'], answer: 1, explain: 'stdout to a terminal is line buffered: all three pieces sit in libc\'s buffer until the newline, then one write.' },
      hints: [`<p>printf does not talk to the kernel for every call: it formats into a user-space buffer first. Ask when that buffer is flushed.</p>`, `<p>When flushed, libc calls the write() wrapper, which loads rax=1 and runs the syscall instruction (user to kernel). The kernel indexes its table, runs sys_write, and returns.</p>`, `<p>Count switches: one syscall = into kernel + out of kernel = 2. Buffering mode depends on the destination: terminal = line buffered, file or pipe = fully buffered.</p>`],
      solution: {
        approach: `<p><b>1. User mode:</b> <code>printf</code> (libc) parses the format string and copies "hi\\n" into the stdout buffer (no kernel yet). <b>2. Flush decision:</b> a terminal means line buffering, so the newline triggers a flush. <b>3. User mode:</b> libc calls its <code>write(1, buf, 3)</code> wrapper which sets rax=1 (write), rdi=1, rsi=buf, rdx=3 and executes <code>syscall</code>. <b>4. Mode switch #1:</b> CPU goes to kernel mode and jumps to the entry point; the kernel saves user registers. <b>5. Kernel mode:</b> the number 1 indexes the syscall table, <code>sys_write</code> looks up fd 1 in the process file table, finds the tty, validates the user buffer with copy_from_user and pushes bytes to the tty driver, which delivers them to the terminal emulator or console. <b>6. Mode switch #2:</b> return value 3 is placed in rax and <code>sysret</code> returns to user mode; libc returns 3 and printf returns 3. Total: 1 syscall, 2 mode switches. If stdout is redirected to a file the buffer is fully buffered (typically 4 KiB), so nothing is written at the newline; the single write happens at fflush, exit or when the buffer fills, which is why output can be lost if the program crashes before flushing.</p>`,
        complexity: `<p>One syscall for the whole line, so cost is O(1) mode switches regardless of printf call count within a line.</p>`
      }
    }]
  });

  // ---------------------------------------------------------------- TOPIC 4
  topics.push({
    title: 'Interrupts and Exceptions: How the CPU Gets Interrupted',
    analogy: `<p>You are reading a book (running a program). The <b>doorbell</b> rings (hardware interrupt) - you put in a bookmark, answer the door, then continue reading from the exact page. If you read a line you cannot understand (a <b>fault</b>, like dividing by zero), you must stop and fix that before going on. And if you deliberately call out "Waiter!" (a <b>trap</b> / syscall), you are choosing to hand control to someone else.</p>`,
    explain: `<p>Without interrupts the CPU would have to keep asking "has the disk finished yet?" (<b>polling</b>), wasting time. With an <b>interrupt</b>, the device taps the CPU on the shoulder only when something happens.</p>
      <p><b>The big picture of what happens (for any interrupt or exception):</b></p>
      <ol>
      <li>CPU finishes (or abandons) the current instruction.</li>
      <li>It <b>saves</b> the current state (program counter and flags) so it can resume later.</li>
      <li>It switches to <b>kernel mode</b> and looks up the handler address in the <b>interrupt vector table</b> (x86: IDT, interrupt descriptor table) using the event's <b>vector number</b>.</li>
      <li>The <b>interrupt handler</b> (ISR) runs, keeps its work short and tells the device "got it".</li>
      <li>A return instruction (<code>iret</code>) restores the saved state; the program continues as if nothing happened (unless the handler decided to kill it or switch to another).</li>
      </ol>
      <p><b>The three families</b> (names vary a little between books):</p>
      ${H.table(['Kind', 'Cause', 'Timing', 'Example', 'Returns to'], [['<b>Interrupt</b> (hardware, asynchronous)', 'a device outside the CPU', 'any time, unrelated to the code', 'timer tick, disk done, key press, NIC packet', 'the <i>next</i> instruction'], ['<b>Trap</b> (software, synchronous, intentional)', 'program asks for it', 'exactly at that instruction', 'syscall, breakpoint (int3)', 'the next instruction'], ['<b>Fault</b> (exception, synchronous, accidental but often fixable)', 'instruction cannot complete', 'at the instruction', 'page fault, divide by zero, invalid opcode', 'the <i>same</i> instruction (retry) or the process is killed'], ['<b>Abort</b>', 'serious hardware error', 'any', 'machine check, double fault', 'never - system halts']])}
      <p>Handy shortcut: <b>Interrupt = from outside, async. Exception = from inside the running instruction, sync</b> (traps, faults, aborts). Traps and faults are called <i>software interrupts / exceptions</i>.</p>
      <p><b>Priorities and masking.</b> Several devices may ring at once. A controller (the old PIC, today's APIC / GIC) ranks them; the CPU can <b>mask</b> (temporarily ignore) interrupts while handling something critical. Non-maskable interrupts (NMI) are for emergencies. Timer interrupts are special: they let the OS take the CPU back from a program that never gives it up - the basis of <b>preemptive scheduling</b>.</p>
      <p><b>Top half / bottom half.</b> To keep interrupts off for as little as possible, Linux does only the urgent part in the handler (the "top half": ack the device, copy a few bytes) and defers the rest (softirq, tasklet, workqueue - the "bottom half").</p>`,
    clues: ['"Interrupt vs trap vs exception vs fault" - hardware async vs software sync; fault is retried', '"How does the CPU know which handler to call?" - vector number indexes the interrupt vector table (IDT)', '"Polling vs interrupt-driven I/O" - interrupts avoid busy waiting', '"How does the OS regain control from an infinite loop?" - timer interrupt', '"Page fault: is it an error?" - usually not; kernel loads the page and retries the instruction', '"Interrupt latency", "ISR must be short", "mask interrupts" - handler design questions']
    ,
    code: [{ lang: 'python', run: true, title: 'Interrupt priority queue (stdlib only)', code: `import heapq

# Lower number = higher priority (like IRQ priority levels).
PRIORITY = {"nmi": 0, "timer": 1, "disk": 2, "network": 3, "keyboard": 4}
# Interrupt vector table: vector -> handler name.
VECTOR = {"nmi": 2, "timer": 32, "disk": 33, "network": 34, "keyboard": 35}

pending = []            # a heap used as the interrupt controller's pending list
arrival = ["keyboard", "disk", "timer", "network", "nmi"]
for order, dev in enumerate(arrival):
    # (priority, arrival_order) so ties are served first-come-first-served
    heapq.heappush(pending, (PRIORITY[dev], order, dev))
    print("arrived:", dev)

print("--- CPU services them ---")
while pending:
    prio, order, dev = heapq.heappop(pending)
    print("vector %3d -> handler_%s (priority %d)" % (VECTOR[dev], dev, prio))` },
    { lang: 'cpp', title: 'A divide-by-zero fault becomes a signal (SIGFPE) - caught safely', code: `#include <csignal>
#include <unistd.h>
#include <cstdlib>

// The CPU raises a divide error (vector 0). The kernel's handler turns it into
// the signal SIGFPE for our process. We install a handler for that signal.
static void on_fpe(int) {
    const char m[] = "caught SIGFPE (CPU fault -> kernel -> signal)\\n";
    write(1, m, sizeof m - 1);      // write() is async-signal-safe; printf is not
    _exit(0);
}

int main(int argc, char**) {
    std::signal(SIGFPE, on_fpe);
    volatile int zero = argc - 1;   // 0 when run without arguments
    volatile int x = 10 / zero;     // hardware fault happens here
    (void)x;
    return 0;
}` }],
    viz: {
      title: 'Interrupts arrive; the controller picks the highest priority; the vector table finds the handler',
      input: 'keyboard, disk, timer, network',
      inputLabel: 'Interrupt sources in arrival order (timer, disk, network, keyboard, nmi)',
      gen: function (input) {
        var PR = { nmi: 0, timer: 1, disk: 2, network: 3, keyboard: 4 }, VEC = { nmi: 2, timer: 32, disk: 33, network: 34, keyboard: 35 };
        var arr = String(input).toLowerCase().split(/[\s,]+/).filter(Boolean);
        if (!arr.length || arr.length > 6) throw new Error('List 1-6 sources from: nmi, timer, disk, network, keyboard');
        arr.forEach(function (a) { if (!(a in PR)) throw new Error('Unknown source "' + a + '". Use: nmi, timer, disk, network, keyboard'); });
        var frames = [], pending = [], done = [];
        var vt = Object.keys(VEC).map(function (k) { return [VEC[k], 'handler_' + k, k]; });
        function vtab(hl) { return { type: 'table', label: 'Interrupt vector table (IDT excerpt)', columns: ['vector', 'handler', 'source'], rows: vt.map(function (r) { return r.slice(); }), hl: hl || {} }; }
        arr.forEach(function (a, i) {
          pending.push(a);
          frames.push({ narr: '<b>' + a + '</b> raises its interrupt line while the CPU runs a user program. It joins the pending list (priority ' + PR[a] + ', lower = more urgent).', parts: [{ type: 'queue', label: 'Pending interrupts (controller)', items: pending.slice(), frontLabel: 'next', backLabel: 'newest', hl: { 0: 'cur' } }, { type: 'vars', vals: { 'CPU mode': 'USER (running app)', pending: pending.length } }] });
        });
        while (pending.length) {
          var best = 0; for (var j = 1; j < pending.length; j++) if (PR[pending[j]] < PR[pending[best]]) best = j;
          var d = pending.splice(best, 1)[0];
          var row = vt.findIndex ? vt.findIndex(function (r) { return r[2] === d; }) : 0, h = {}; h[row] = 'cur';
          frames.push({ narr: 'Highest priority wins: <b>' + d + '</b>. The CPU saves the program counter + flags, switches to <b>kernel mode</b> and reads vector <b>' + VEC[d] + '</b> in the vector table.', parts: [{ type: 'queue', label: 'Still pending', items: pending.length ? pending.slice() : ['(empty)'], frontLabel: 'next', backLabel: 'newest' }, vtab(h), { type: 'vars', vals: { 'CPU mode': 'KERNEL', 'running': 'handler_' + d }, hl: { 'CPU mode': 'bad', running: 'cur' } }] });
          done.push(d);
          frames.push({ narr: '<code>handler_' + d + '</code> does its short job, acknowledges the device, then <code>iret</code> restores the saved state and the program resumes (or the next interrupt is taken).', parts: [{ type: 'queue', label: 'Serviced so far', items: done.slice(), hl: { 0: 'ok' } }, { type: 'vars', vals: { 'CPU mode': pending.length ? 'KERNEL (next interrupt)' : 'USER (resumed)', remaining: pending.length }, hl: { remaining: pending.length ? 'cur' : 'ok' } }] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'Classify the event', html: `<p>${H.table(['Event', 'Class', 'Why'], [['Network card receives a packet', '<span class="c-b">Interrupt</span> (hardware)', 'device outside CPU, asynchronous'], ['Program calls <code>read()</code>', '<span class="c-g">Trap</span> (software)', 'intentional, synchronous, returns to next instruction'], ['Access to a page not in RAM', '<span class="c-y">Fault</span> (page fault)', 'accidental, OS fixes it, then the <i>same</i> instruction retries'], ['<code>x / 0</code> in integer maths', '<span class="c-y">Fault</span> (divide error)', 'cannot complete; usually becomes SIGFPE'], ['Timer chip ticks every 1-4 ms', '<span class="c-b">Interrupt</span>', 'lets the OS preempt programs'], ['Debugger breakpoint (<code>int3</code>)', '<span class="c-g">Trap</span>', 'deliberate; control goes to the debugger'], ['Uncorrectable RAM error', '<span class="c-r">Abort / machine check</span>', 'cannot recover']])}</p>` },
      { title: 'Polling vs interrupts: why interrupts win', html: `<p>Reading a disk block takes ~5 ms (HDD) = ~15 million CPU cycles. Polling wastes all 15 million cycles asking "done yet?". With an interrupt, the CPU runs other programs meanwhile and is taken away for only ~microseconds to handle the completion. (For <i>very fast</i> devices, such as 100 Gb NICs, constant interrupts become the problem, so drivers switch to polling under load: Linux NAPI.)</p>` },
      { title: 'A page fault walk-through', html: `<p>A program touches memory the OS has not yet loaded: (1) CPU raises a page fault, (2) kernel handler checks the address is legal, (3) finds a free frame and reads the page from disk, (4) updates the page table, (5) <code>iret</code> re-executes the same instruction, which now succeeds. The program never knows. Illegal address &rarr; the kernel sends SIGSEGV instead.</p>` }
    ],
    deepDive: `<p><b>Vector layout (x86).</b> Vectors 0-31 are reserved for CPU exceptions (0 divide error, 6 invalid opcode, 13 general protection, 14 page fault); 32-255 are free for hardware IRQs and software use (Linux uses 0x80 for the legacy syscall gate, and 32+ for devices). The IDT has up to 256 entries; the CPU register <code>IDTR</code> points at it, set once at boot.</p>
      <p><b>Interrupt stack and context.</b> On entry the CPU pushes the old SS/RSP/RFLAGS/CS/RIP on a kernel stack (a separate stack per CPU for double faults via IST), then the handler saves the other registers. A handler that sleeps while holding a lock, or runs long, increases <b>interrupt latency</b> for everyone, so it must be short and cannot block; heavy work is deferred (softirq/workqueue), and in real-time Linux (PREEMPT_RT) most handlers run as schedulable threads.</p>
      <p><b>Multicore.</b> Modern chips use APIC/MSI-X: each device queue can interrupt a chosen core (<i>IRQ affinity</i>), spreading network load over cores (<code>/proc/interrupts</code> shows counts). <b>Interrupt coalescing</b> batches several events per interrupt to trade latency for throughput.</p>
      <p><b>Nested/priority.</b> Interrupts that are masked while a handler runs wait in the controller; higher-priority ones may nest. Deadlock risk: a handler that tries to take a spinlock already held by the code it interrupted - so code holding such a lock disables local interrupts (<code>spin_lock_irqsave</code>).</p>
      <p><b>Exceptions to userspace.</b> Faults in user code become <b>signals</b> (SIGSEGV, SIGFPE, SIGILL, SIGBUS); a Windows equivalent is structured exception handling.</p>`,
    aiEra: `<p><b>What AI changes:</b> GPU and NIC-heavy AI servers push interrupt design: RDMA and GPUDirect reduce CPU involvement, and drivers poll to avoid interrupt storms. Edge devices running tiny models rely on timer and sensor interrupts to wake a CPU from deep sleep - power-saving is largely interrupt design.</p>
      <p><b>Use AI as a partner:</b> ask it to <code>generate 15 events and make me classify interrupt/trap/fault, then grade me</code>; paste <code>/proc/interrupts</code> and ask which devices cause the most and whether IRQ affinity could help.</p>
      <p><b>Where AI goes wrong:</b> it often says "an exception is the same as an interrupt" (related but different in who raises it and when), says all faults are fatal (page faults are routine), or claims syscalls are "hardware interrupts" (they are synchronous traps).</p>
      <p><b>What you must still own:</b> the 5-step interrupt sequence, the sync/async split, and why timer interrupts make preemption possible.</p>`,
    problems: [{
      title: 'Classify Interrupt, Trap or Fault', level: 'Easy', tags: ['interrupt', 'trap', 'fault'],
      statement: `<p>Classify each event as <b>interrupt</b>, <b>trap</b>, or <b>fault</b>, and say whether it is hardware- or software-triggered and whether it re-executes the same instruction: (1) mouse click, (2) <code>int 0x80</code>, (3) null pointer dereference, (4) timer expiry, (5) page not present in RAM.</p>`,
      constraints: `Give a one-line reason for each.`,
      example: `${H.table(['Event', 'Class'], [['Disk read finished', 'Interrupt (hardware, async)']])}<p>${H.c('g', 'Rule: from outside the CPU and not tied to an instruction = interrupt.')}</p>`,
      brute: { why: `<p>Calling all five "interrupts" misses the key distinction: only some are triggered by a device; others are caused by the very instruction being executed.</p>` },
      mcq: { q: 'After a page fault is handled, the CPU resumes at...', options: ['the next instruction', 'the same instruction that faulted', 'the start of the program', 'the interrupt vector table'], answer: 1, explain: 'A fault is restartable: once the page is loaded, the faulting instruction runs again.' },
      hints: [`<p>Ask: is the cause a device outside the CPU (asynchronous), or the instruction currently executing (synchronous)?</p>`, `<p>For synchronous events: did the program do it deliberately (trap, returns to next instruction) or by accident (fault, may retry the same instruction)?</p>`, `<p>Null pointer is a fault in a sense (page fault on an illegal address) but the kernel cannot fix it, so it sends SIGSEGV and the process dies.</p>`],
      solution: {
        approach: `<p>(1) <b>Mouse click: interrupt</b> - hardware, asynchronous; resumes at the next instruction. (2) <b><code>int 0x80</code>: trap</b> - software, deliberate and synchronous; resumes at the next instruction after the kernel finishes the syscall. (3) <b>Null pointer dereference: fault</b> (a page fault on an invalid address) - accidental and synchronous; the kernel cannot map the page, so instead of retrying it delivers SIGSEGV and usually kills the process. (4) <b>Timer expiry: interrupt</b> - hardware, asynchronous; the handler may call the scheduler to preempt the running process. (5) <b>Page not in RAM: fault</b> - synchronous; the OS loads the page then <b>re-executes the same instruction</b>. Summary rule: asynchronous and from a device = interrupt; synchronous and intentional = trap; synchronous and accidental = fault (restartable) or abort (unrecoverable).</p>`,
        complexity: `<p>Classification only; no running cost.</p>`
      }
    }]
  });

  // ---------------------------------------------------------------- TOPIC 5
  topics.push({
    title: 'Booting: From Power Button to init/systemd',
    analogy: `<p>Opening a shop in the morning: the <b>night guard</b> (firmware) checks the building and finds the key (bootloader). The key opens the door to the <b>manager</b> (kernel), who wakes up the departments (drivers, memory), and finally the manager calls the <b>first employee</b> (init/systemd), who starts everyone else (services). Each step is small and only knows how to start the next, bigger one - a chain of trust.</p>`,
    explain: `<p>When you press power, RAM is empty and the CPU only knows one trick: start running at a fixed address where the <b>firmware</b> lives. From there it is a chain of stages, each loading a bigger one:</p>
      <ol>
      <li><b>Firmware (BIOS or UEFI)</b> - code on a flash chip on the motherboard. It runs the <b>POST</b> (power-on self-test: is RAM there? is the CPU OK?), starts basic hardware, and finds a boot device. <b>BIOS</b> is the old 16-bit way: reads the first 512-byte sector (the <b>MBR</b>) of the disk. <b>UEFI</b> is modern: it understands file systems, reads an <code>.efi</code> program from the <b>EFI System Partition</b>, supports GPT disks, and can verify signatures (<b>Secure Boot</b>).</li>
      <li><b>Bootloader</b> (GRUB, systemd-boot, Windows Boot Manager) - small program that shows a menu, finds the kernel file on disk, loads it plus an <b>initramfs</b> (a tiny temporary root file system with drivers), and jumps to the kernel.</li>
      <li><b>Kernel</b> - sets up memory management, interrupt table, scheduler and drivers, mounts the real root file system (using the initramfs to find the disk), then starts the first user process.</li>
      <li><b>init / systemd (PID 1)</b> - the first user-space process. It starts everything else: logging, network, ssh, login screen, your services. If PID 1 dies, the kernel panics.</li>
      </ol>
      ${H.table(['Stage', 'Runs from', 'Mode / state', 'Job'], [['1. Firmware (UEFI)', 'flash chip', 'real mode &rarr; 64-bit (UEFI)', 'POST, find boot device'], ['2. Bootloader', 'disk (ESP / MBR)', 'early, minimal', 'load kernel + initramfs'], ['3. Kernel', 'RAM', 'kernel mode', 'init hardware, mount root, start PID 1'], ['4. init/systemd', 'RAM (user space)', 'user mode', 'start services, login']])}
      <p>Why so many stages? Firmware is tiny and fixed; it cannot know every disk and file system. The bootloader can be smarter; the kernel is smarter still. Each stage "bootstraps" the next - hence the word <b>booting</b> (pulling yourself up by your bootstraps).</p>`,
    clues: ['"What happens when you turn on a computer?" - firmware (POST) &rarr; bootloader &rarr; kernel &rarr; init', '"BIOS vs UEFI" - 512-byte MBR/16-bit vs GPT, ESP, Secure Boot, faster', '"What is the first process?" - PID 1 (init/systemd)', '"What is initramfs for?" - drivers needed to reach the real root file system', '"What is Secure Boot?" - each stage verifies the next one\'s signature', '"Order the boot stages" - POST, bootloader, kernel, init, login']
    ,
    code: [{ lang: 'bash', check: false, title: 'Inspect how your Linux machine booted', code: `# Firmware type: this directory exists only if booted via UEFI
[ -d /sys/firmware/efi ] && echo "UEFI boot" || echo "Legacy BIOS boot"

# The exact command line the bootloader passed to the kernel
cat /proc/cmdline

# What is PID 1? (systemd on most distros)
ps -p 1 -o pid,comm

# Time spent in firmware, loader, kernel, userspace
systemd-analyze

# Kernel boot messages (hardware detection, drivers, mounting root)
dmesg | head -20` },
    { lang: 'python', run: true, title: 'Ordering the boot chain (each stage starts the next)', code: `# Each stage: (name, what it loads next)
CHAIN = [
    ("Power on / CPU reset vector", "firmware"),
    ("Firmware: POST + find boot device (UEFI)", "bootloader"),
    ("Bootloader (GRUB): load kernel + initramfs", "kernel"),
    ("Kernel: init memory, IRQs, drivers, mount root", "PID 1"),
    ("init/systemd (PID 1): start services", "login"),
]
loaded = []
for step, (name, nxt) in enumerate(CHAIN, 1):
    loaded.append(name)
    print("%d. %-48s -> next: %s" % (step, name, nxt))
print("stages completed:", len(loaded))` }],
    viz: [{
      title: 'Boot sequence: the current stage lights up',
      input: 'uefi',
      inputLabel: 'Firmware type: uefi or bios',
      gen: function (input) {
        var bios = /bios/i.test(String(input));
        var st = bios
          ? ['Power on', 'BIOS POST', 'Read MBR (512 B)', 'Bootloader (GRUB)', 'Kernel loads', 'Init (PID 1)', 'Login / services']
          : ['Power on', 'UEFI POST', 'Read .efi from ESP', 'Bootloader (GRUB)', 'Kernel loads', 'systemd (PID 1)', 'Login / services'];
        var note = bios
          ? ['The CPU resets and jumps to the firmware address.', '<b>BIOS</b> checks RAM/CPU (POST) and finds a boot disk.', 'BIOS copies the first <b>512-byte sector (MBR)</b> to address 0x7C00 and jumps to it.', 'The small MBR code loads the bigger <b>bootloader</b>, which shows a menu and loads kernel + initramfs.', 'The <b>kernel</b> sets up memory, interrupts, scheduler, drivers and mounts the root file system.', 'The kernel starts the first user process, <b>PID 1</b>.', 'PID 1 starts services; the login prompt appears. Boot done.']
          : ['The CPU resets and jumps to the firmware address.', '<b>UEFI</b> runs POST, initialises hardware and finds the boot entry (NVRAM).', 'UEFI reads the <code>.efi</code> bootloader from the <b>EFI System Partition</b> (FAT) and can check its Secure Boot signature.', 'The <b>bootloader</b> shows a menu and loads the kernel and initramfs into RAM.', 'The <b>kernel</b> sets up memory, interrupts, scheduler, drivers and mounts the root file system.', 'The kernel starts the first user process, <b>PID 1</b> (systemd).', 'systemd starts services in parallel; login appears. Boot done.'];
        return st.map(function (s, i) {
          var hl = {}; for (var k = 0; k < i; k++) hl[k] = 'done'; hl[i] = 'cur';
          return { narr: note[i], parts: [{ type: 'array', label: (bios ? 'BIOS' : 'UEFI') + ' boot stages', values: st, hl: hl, showIdx: true }, { type: 'queue', label: 'Still to run', items: st.slice(i + 1).length ? st.slice(i + 1) : ['(system is up)'], frontLabel: 'next', backLabel: 'last' }, { type: 'vars', vals: { 'current stage': s, 'who is running': i < 4 ? 'firmware / loader' : (i === 4 ? 'kernel (privileged)' : 'user space (PID 1+)') }, hl: { 'current stage': 'cur' } }] };
        });
      }
    }],
    examples: [
      { title: 'Order the stages', html: `<p>Shuffle: <i>kernel, POST, login, bootloader, systemd</i>. Correct order: ${H.chips(['POST', 'bootloader', 'kernel', 'systemd (PID 1)', 'login'], { label: 'boot order' })} Each stage can only run after the one before loaded it.</p>` },
      { title: 'BIOS/MBR vs UEFI/GPT', html: `<p>${H.table(['', 'BIOS + MBR', 'UEFI + GPT'], [['Boot code location', 'first 512 bytes of disk', '.efi file on the ESP partition'], ['Max disk size', '2 TB', '9.4 ZB (practically unlimited)'], ['Partitions', '4 primary', '128 by default'], ['Secure Boot', 'no', '<span class="c-g">yes</span>'], ['Speed', 'slower init', 'faster, drivers in firmware']])}</p>` },
      { title: 'Why does boot need an initramfs?', html: `<p>The kernel must read the root file system from a disk, but the driver for that disk (NVMe, RAID, encrypted LVM) may be a module that lives <i>on that disk</i>. Chicken and egg. The initramfs is a small archive loaded to RAM by the bootloader containing just enough drivers and scripts to find and unlock the real root, then <code>switch_root</code> to it.</p>` },
      { title: 'Containers skip most of this', html: `<p>A Docker container does not boot an OS at all: it starts a process directly in the host's already running kernel. That is why containers start in milliseconds while a VM must boot a whole guest kernel in seconds.</p>` }
    ],
    deepDive: `<p><b>The very first instruction.</b> On x86 the CPU starts in 16-bit real mode at the reset vector <code>0xFFFFFFF0</code>, which maps to the firmware flash. Early firmware (Intel's Boot Guard/ME, AMD PSP) may run <i>before</i> the CPU cores are even released, forming the hardware root of trust. Later stages switch to 32-bit protected and then 64-bit long mode.</p>
      <p><b>Chain of trust.</b> Secure Boot: firmware holds trusted keys, verifies the bootloader's signature, which verifies the kernel, which can verify modules (kernel lockdown, IMA). <b>Measured boot</b> with a TPM records hashes of each stage in PCR registers so a remote server can attest the machine was not tampered with (used by BitLocker, cloud confidential VMs).</p>
      <p><b>Kernel handoff.</b> The bootloader passes the kernel a command line, a memory map and the initramfs location. The kernel decompresses itself, runs <code>start_kernel()</code>, initialises the scheduler, memory allocators, IRQs, mounts root and execs <code>/sbin/init</code>. If init cannot be found: "Kernel panic - not syncing: No working init found".</p>
      <p><b>systemd</b> models boot as a graph of <i>units</i> with dependencies and starts independent ones in parallel (so boot is faster than old sequential SysV init scripts); <code>systemd-analyze blame</code> and <code>critical-chain</code> show where time goes. Alternatives: OpenRC, runit, s6; in containers a tiny init like <code>tini</code> reaps zombies.</p>
      <p><b>Other platforms.</b> ARM boards use ROM code &rarr; SPL &rarr; U-Boot &rarr; kernel (device tree describes hardware). Android: bootloader &rarr; kernel &rarr; <code>init</code> &rarr; zygote. Cloud VMs use fast paths (Firecracker boots a microVM in ~125 ms).</p>`,
    aiEra: `<p><b>What AI changes:</b> GPU servers need long firmware/driver bring-up (loading GPU firmware, NVLink setup); fleet operators automate boot health with AI log triage. Confidential-computing and measured boot matter more because model weights are valuable secrets that must only run on attested machines.</p>
      <p><b>Use AI as a partner:</b> paste <code>dmesg</code> or <code>systemd-analyze blame</code> output and ask <code>Why is my boot slow? Rank by likely win</code>. Ask for a "what could go wrong at each stage" table (no bootable device, bad initramfs, missing root=, failed unit).</p>
      <p><b>Where AI goes wrong:</b> it may give wrong GRUB repair commands that can wipe a partition table, mix up BIOS/UEFI steps, or suggest editing the EFI partition blindly. Never run disk-changing commands you do not understand.</p>
      <p><b>What you must still own:</b> the stage order and each stage's role, the BIOS/UEFI difference, and safe recovery habits (backup first, use a live USB).</p>`,
    problems: [{
      title: 'Boot Stage Ordering and Failure Diagnosis', level: 'Easy', tags: ['boot', 'uefi', 'systemd'],
      statement: `<p>Put these in the correct order and say who runs each: kernel starts PID 1, firmware POST, GRUB loads kernel and initramfs, UEFI reads the EFI System Partition, login prompt. Then diagnose: the screen says "No bootable device found" - which stage failed?</p>`,
      constraints: `Assume a UEFI Linux PC.`,
      example: `${H.chips(['POST', 'ESP .efi', 'GRUB', 'kernel', 'PID 1', 'login'], { label: 'order' })}<p>${H.c('g', 'Each stage loads the next.')}</p>`,
      brute: { why: `<p>Guessing an order from memory without the idea "each stage loads the next" leads to mistakes like putting the kernel before the bootloader.</p>` },
      mcq: { q: 'The first user-space process started by the Linux kernel is...', options: ['the shell', 'PID 1 (init/systemd)', 'GRUB', 'the login prompt'], answer: 1, explain: 'The kernel execs /sbin/init (systemd on most distros) as PID 1.' },
      hints: [`<p>Start at the bottom of the trust chain: what is the first thing that can run when RAM is empty? Only the code in flash.</p>`, `<p>Firmware needs something to load - the bootloader on disk. The bootloader needs a kernel. The kernel needs a first user program.</p>`, `<p>"No bootable device" means firmware finished POST but found no valid boot entry/ESP/MBR, so it never reached the bootloader.</p>`],
      solution: {
        approach: `<p>Order: <b>1. Firmware POST</b> (UEFI on flash). <b>2. UEFI reads the EFI System Partition</b> and runs the bootloader .efi. <b>3. GRUB loads the kernel and initramfs</b> into RAM and jumps to the kernel. <b>4. The kernel</b> initialises hardware, mounts root and <b>starts PID 1</b>. <b>5. systemd (PID 1)</b> starts services. <b>6. Login prompt</b>. Diagnosis: "No bootable device found" is printed by the <b>firmware</b> stage - POST succeeded but it found no valid boot entry (missing/corrupt ESP, wrong boot order, disk not detected, Secure Boot rejecting an unsigned loader). So the bootloader never started; fix by checking firmware boot order, reseating the disk, or reinstalling the bootloader from a live USB. If GRUB's menu appeared, the failure would be later (kernel panic, missing initramfs or root=).</p>`,
        complexity: `<p>Reasoning exercise; remember: each stage loads the next, so a failure message tells you the last stage that ran.</p>`
      }
    }]
  });

  // ---------------------------------------------------------------- TOPIC 6
  topics.push({
    title: 'OS Structure: Monolithic vs Microkernel vs Hybrid',
    analogy: `<p>Two ways to run a restaurant. <b>Monolithic</b>: one huge kitchen where cooks, dishwashers and the cashier all share one room - very fast (they just shout), but if one person starts a fire, the whole place burns. <b>Microkernel</b>: a tiny core kitchen with separate rooms for each job and a message window between them - safer (a fire stays in one room) but every order passes through windows, which costs time. <b>Hybrid</b>: mostly one big kitchen, with a few risky jobs moved to their own rooms.</p>`,
    explain: `<p>The question is: <b>how much of the OS runs in kernel mode?</b></p>
      <ul>
      <li><b>Monolithic kernel</b> - scheduler, memory manager, file systems, network stack and device drivers all live in one big program in kernel mode. Components call each other as plain function calls: <span class="c-g">fast</span>. But a bug in any driver can crash everything and the kernel is huge: <span class="c-r">less safe, harder to maintain</span>. Examples: <b>Linux</b>, classic Unix, BSD. (Linux makes it flexible with <i>loadable kernel modules</i>.)</li>
      <li><b>Microkernel</b> - the kernel keeps only the bare minimum: address spaces, thread scheduling, and <b>IPC (message passing)</b>. File systems, drivers and network stacks run as normal <b>user-space servers</b>. A crashed driver can be restarted without a reboot: <span class="c-g">reliable, small trusted code, easy to verify</span>. But every service request is messages and extra mode switches: <span class="c-r">slower</span>. Examples: <b>QNX</b> (cars, medical), <b>seL4</b> (formally verified), <b>MINIX 3</b>, Google <b>Fuchsia/Zircon</b>, GNU Hurd.</li>
      <li><b>Hybrid kernel</b> - a microkernel-like design that moves some services back into kernel space for speed. Examples: <b>Windows NT</b>, <b>macOS/iOS (XNU = Mach + BSD)</b>. Marketing term, but useful for the middle ground.</li>
      </ul>
      ${H.table(['', 'Monolithic', 'Microkernel', 'Hybrid'], [['In kernel mode', 'everything', 'scheduler, memory, IPC only', 'core + some servers (graphics, FS)'], ['Service call cost', 'function call (cheap)', 'IPC messages (costly)', 'mix'], ['Fault isolation', '<span class="c-r">weak</span>', '<span class="c-g">strong</span>', 'medium'], ['Trusted code size', 'tens of millions of lines', '10-100 thousand lines', 'large'], ['Extensibility', 'modules / recompiling', 'start another server', 'drivers + subsystems'], ['Examples', 'Linux, FreeBSD', 'QNX, seL4, MINIX 3', 'Windows NT, XNU']])}
      <p><b>Which to choose?</b> A phone, laptop, server: raw speed and an enormous driver ecosystem win - monolithic or hybrid. A pacemaker, car brake controller or aircraft system: a small, provable, fault-isolated core wins - microkernel/RTOS. An embedded device with 64 KB of RAM may not even have a kernel/user split (a tiny RTOS or bare metal).</p>
      <p><b>OS services at a glance.</b> No matter the structure, an OS provides: process management, memory management, file systems, device/I/O management, networking, security and protection, user interface (shell/GUI), error detection and accounting. A microkernel moves most of these out of ring 0; a monolithic kernel keeps them in.</p>`,
    clues: ['"Monolithic vs microkernel - trade-offs?" - speed vs isolation/reliability', '"Which OS for a safety-critical embedded system?" - microkernel RTOS (QNX, seL4)', '"Why is Linux monolithic yet flexible?" - loadable kernel modules', '"What does a microkernel contain?" - scheduling, address spaces, IPC; the rest runs in user space', '"Is Windows/macOS a microkernel?" - no, hybrid', '"A driver crashes - what happens?" - monolithic: kernel panic; microkernel: restart the server']
    ,
    code: [{ lang: 'cpp', title: 'Same request, two designs: function call vs message passing (model)', code: `#include <string>
#include <queue>
#include <cstdio>

// MONOLITHIC style: the VFS calls the file system as a plain function.
// One mode context, no copying of messages. Very fast.
std::string fs_read_direct(const std::string& path) {
    return "data of " + path;
}

// MICROKERNEL style: the app sends a message; the kernel only delivers it
// to a user-space file server and delivers the reply back.
struct Msg { int from; std::string text; };
std::queue<Msg> to_fs_server, to_app;

void kernel_ipc_send_to_fs(Msg m) { to_fs_server.push(m); }   // mode switch #1/#2
void fs_server_loop_once() {                                   // runs in USER space
    Msg m = to_fs_server.front(); to_fs_server.pop();
    to_app.push({1, "data of " + m.text});                     // reply via kernel again
}

int main() {
    std::printf("mono: %s\\n", fs_read_direct("/a.txt").c_str());
    kernel_ipc_send_to_fs({0, "/a.txt"});    // app -> kernel -> fs server
    fs_server_loop_once();                   // fs server -> kernel -> app
    std::printf("micro: %s\\n", to_app.front().text.c_str());
    return 0;
}` },
    { lang: 'bash', check: false, title: 'Linux kernel modules: monolithic but extensible', code: `lsmod | head            # modules currently loaded into the (monolithic) kernel
modinfo ext4            # details of one module
sudo modprobe loop      # load a module at runtime - no reboot, but it runs in ring 0
uname -a                # kernel name and version` }],
    viz: {
      title: 'Where do the components live? Monolithic vs microkernel',
      input: 'mono',
      inputLabel: 'Type "mono" first, then "micro" - or any text (both are shown in sequence)',
      gen: function () {
        // layout: user space on the left half, kernel space on the right
        var monoNodes = [bx('APP', 'App (user)', 12, 10, 18), bx('K', 'MONOLITHIC KERNEL (ring 0)', 68, 6, 44), bx('FS', 'File system', 52, 24, 18), bx('NET', 'Network stack', 82, 24, 18), bx('DRV', 'Disk driver', 52, 40, 18), bx('SCH', 'Scheduler + MM', 82, 40, 18)];
        var monoEdges = [['APP', 'K', 'syscall'], ['K', 'FS'], ['K', 'NET'], ['FS', 'DRV', 'call'], ['K', 'SCH']];
        var micNodes = [bx('APP', 'App (user)', 12, 6, 18), bx('FSS', 'FS server (user)', 12, 24, 20), bx('DRVS', 'Disk driver (user)', 12, 42, 22), bx('NETS', 'Net server (user)', 40, 42, 20), bx('MK', 'MICROKERNEL (ring 0): IPC + sched + MM', 78, 24, 40)];
        var micEdges = [['APP', 'MK', 'IPC'], ['MK', 'FSS', 'IPC'], ['FSS', 'MK', 'IPC'], ['MK', 'DRVS', 'IPC'], ['MK', 'NETS']];
        function mono(narr, hl, ehl, v) { return { narr: narr, parts: [{ type: 'graph', label: 'Monolithic: everything in kernel mode', height: 50, directed: true, nodes: monoNodes, edges: monoEdges, hl: hl, ehl: ehl }, { type: 'vars', vals: v }] }; }
        function mic(narr, hl, ehl, v) { return { narr: narr, parts: [{ type: 'graph', label: 'Microkernel: services in user space', height: 54, directed: true, nodes: micNodes, edges: micEdges, hl: hl, ehl: ehl }, { type: 'vars', vals: v }] }; }
        return [
          mono('<b>Monolithic:</b> the file system, network stack, drivers and scheduler all sit inside one big kernel running in ring 0.', { K: 'sel' }, {}, { 'mode switches for a file read': 0 }),
          mono('An app does <code>read()</code>: one syscall enters the kernel (2 mode switches total).', { APP: 'cur', K: 'sel' }, { 'APP-K': 'ok' }, { 'mode switches for a file read': 2 }),
          mono('Inside the kernel, the VFS calls the file system, which calls the disk driver - all <b>ordinary function calls</b>, very fast.', { FS: 'cur', DRV: 'cur' }, { 'K-FS': 'ok', 'FS-DRV': 'ok' }, { 'mode switches for a file read': 2 }),
          mono('Downside: a bug in the disk driver can corrupt scheduler memory - the <span class="c-r">whole system crashes</span> (kernel panic).', { DRV: 'bad', K: 'bad' }, {}, { 'mode switches for a file read': 2, 'driver bug': 'kernel panic' }),
          mic('<b>Microkernel:</b> only IPC, scheduling and memory management are in ring 0. The file system, disk driver and network are separate user-space processes.', { MK: 'sel' }, {}, { 'mode switches for a file read': 0 }),
          mic('The app sends a read request as a message. The microkernel delivers it to the file server (switches in/out).', { APP: 'cur', FSS: 'cur' }, { 'APP-MK': 'ok', 'MK-FSS': 'ok' }, { 'mode switches for a file read': 4 }),
          mic('The file server asks the disk driver (another IPC), gets the data, and replies through the kernel again: <span class="c-r">many more switches and message copies</span>.', { DRVS: 'cur', FSS: 'cur' }, { 'FSS-MK': 'ok', 'MK-DRVS': 'ok' }, { 'mode switches for a file read': 8 }),
          mic('Upside: if the disk driver crashes, only that process dies. The microkernel restarts it and the system lives on - <span class="c-g">fault isolation</span>.', { DRVS: 'bad', MK: 'ok' }, {}, { 'mode switches for a file read': 8, 'driver bug': 'restart the server' })
        ];
      }
    },
    examples: [
      { title: 'Pick the design: embedded vs desktop', html: `<p>${H.table(['Product', 'Pick', 'Reason'], [['Car brake-by-wire controller', 'Microkernel RTOS (QNX / seL4)', 'a driver fault must not stop braking; small verifiable core'], ['Laptop / desktop', 'Monolithic (Linux) or hybrid (Windows, macOS)', 'speed + thousands of drivers'], ['Cloud server', 'Monolithic (Linux)', 'max throughput, huge ecosystem, tooling'], ['Tiny sensor (64 KB RAM)', 'Bare metal / tiny RTOS', 'no room for any big kernel'], ['Smartphone', 'Monolithic Linux (Android) or hybrid XNU (iOS)', 'performance + power + ecosystem']])}</p>` },
      { title: 'Performance cost of IPC (rule of thumb)', html: `<p>A monolithic function call: ~5 ns. A microkernel IPC round trip: the first-generation Mach was slow (tens of microseconds), but modern L4-family kernels achieve about <b>0.1-1 microsecond</b> by passing small messages in registers. The gap shrank a lot - the old "microkernels are too slow" is outdated.</p>` },
      { title: 'Linux pushes things the other way too', html: `<p>Even Linux moves some work to user space for safety/flexibility: <b>FUSE</b> (user-space file systems), <b>libusb</b> and <b>VFIO</b> (user-space drivers), <b>DPDK</b> (user-space networking), eBPF (safe sandboxed code <i>in</i> the kernel). So real systems mix ideas from both camps.</p>` }
    ],
    deepDive: `<p><b>Trusted computing base (TCB).</b> Everything in ring 0 must be trusted: any bug there can break security. Linux's TCB is tens of millions of lines; seL4's is ~10,000 lines of C and has a <b>machine-checked proof</b> that the code matches its specification (no buffer overflows, no null dereferences in the kernel). That is the strongest argument for microkernels.</p>
      <p><b>Why monolithic won on desktops/servers.</b> Early microkernels (Mach) copied messages and switched address spaces a lot, with big overhead; Unix-style kernels were fast and "good enough", and the driver ecosystem grew inside them (the 1992 Torvalds-Tanenbaum debate is the famous interview anecdote). Hybrid designs (NT, XNU) kept microkernel structure but ran performance-critical servers in kernel space.</p>
      <p><b>Other structures.</b> <i>Layered</i> (each layer uses only the one below - clean but slow), <i>modular</i> (monolithic core + loadable modules, Linux), <i>exokernel</i> (kernel only multiplexes hardware; apps bring their own OS library), <i>unikernel</i> (one app + a tiny library OS in one address space - fast boots in the cloud), <i>hypervisor</i> as the lowest "OS" (Xen, KVM).</p>
      <p><b>Real-world trend.</b> Safety standards (ISO 26262 for cars, DO-178C for aircraft) push mixed-criticality systems to use separation kernels. Google's Fuchsia and Apple's growing DriverKit (user-space drivers on macOS) move drivers out of the kernel because driver bugs cause most crashes. Rust in Linux aims at memory-safe drivers while staying monolithic.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI accelerators bring huge, fast-changing driver stacks. Putting these in the kernel increases risk; hence user-space driver models, sandboxed runtimes and confidential computing. AI also helps kernel developers (fuzzing with ML-guided tools such as syzkaller finds crash bugs; AI-assisted code review catches missing bounds checks), while keeping the monolithic design.</p>
      <p><b>Use AI as a partner:</b> ask <code>Compare monolithic and microkernel for (a) an insulin pump, (b) a game console, (c) a cloud host - give a table, then argue the opposite side</code>. Also: <code>explain the Tanenbaum-Torvalds debate fairly</code>.</p>
      <p><b>Where AI goes wrong:</b> it often calls Windows or macOS "microkernel", says microkernels "are always slower" (modern L4 IPC is fast), or labels Linux "not modular" (it has loadable modules though still monolithic).</p>
      <p><b>What you must still own:</b> a reasoned trade-off (speed vs isolation vs trusted code size) tied to the product's needs, with examples.</p>`,
    problems: [{
      title: 'Choose a Kernel Design for Two Products', level: 'Medium', tags: ['monolithic', 'microkernel', 'design'],
      statement: `<p>A company builds (A) an in-car ADAS (driver assistance) controller and (B) a general-purpose developer laptop OS. For each, choose monolithic, microkernel or hybrid, justify using performance, reliability, security and driver ecosystem, and name one risk you accept.</p>`,
      constraints: `Answer both products; discuss at least three criteria for each.`,
      example: `<p>Pick "microkernel for A: a camera driver crash must not stop the braking logic." ${H.c('g', 'Link every choice to a requirement.')}</p>`,
      brute: { why: `<p>"Linux for both because it is popular" ignores that A needs fault isolation, real-time guarantees and certification, while B needs thousands of drivers and top throughput.</p>` },
      mcq: { q: 'Which design runs file systems and device drivers as user-space processes?', options: ['Monolithic', 'Microkernel', 'Bare-metal firmware only', 'Layered with all layers in ring 0'], answer: 1, explain: 'A microkernel keeps only IPC, scheduling and memory management in the kernel.' },
      hints: [`<p>List the requirements first: A = safety-critical, hard real-time, must survive a faulty component. B = performance, hardware breadth, developer tools.</p>`, `<p>Match requirement to property: fault isolation and small trusted code point to a microkernel; raw speed and a huge driver base point to monolithic/hybrid.</p>`, `<p>State the cost of each choice: microkernel = IPC overhead and fewer ready-made drivers; monolithic = one bad driver can take down everything.</p>`],
      solution: {
        approach: `<p><b>(A) ADAS controller: microkernel RTOS</b> (QNX or seL4-class). Reliability: camera, radar and logging drivers run as separate user-space processes, so a crash is contained and the process is restarted while braking logic continues. Security: the small trusted code base (tens of thousands of lines) is easier to certify (ISO 26262, ASIL) and can even be formally verified. Performance: IPC costs a little, but modern microkernel IPC is sub-microsecond and the workload is deterministic latency rather than raw throughput. Accepted risk: smaller driver ecosystem, more engineering for each device and message-passing complexity. <b>(B) Developer laptop: monolithic (Linux) or hybrid (Windows/macOS)</b>. Performance: direct function calls and zero-copy paths give best I/O and graphics speed. Ecosystem: tens of thousands of drivers, tools (perf, eBPF), containers and compilers exist already. Security: accepted weaker isolation inside the kernel, mitigated by modules signing, SELinux/AppArmor, Rust components and sandboxing. Accepted risk: a faulty driver can crash the machine - tolerable on a laptop, not in a car. General rule: choose the structure whose weakness the product can afford.</p>`,
        complexity: `<p>Design trade-off question: no complexity analysis; the grade is on matching each requirement to a structural property.</p>`
      }
    }]
  });

  // ---------------------------------------------------------------- PRACTICE
  function P(title, level, tags, statement, constraints, example, bruteWhy, mcq, hints, approach, complexity, followUps, code) {
    var sol = { approach: approach, complexity: complexity, followUps: followUps };
    if (code) sol.code = code;
    practice.push({ title: title, level: level, tags: tags, companies: ['Google', 'Amazon', 'Microsoft'].slice(0, 2), statement: statement, constraints: constraints, example: example, brute: { why: bruteWhy }, mcq: mcq, hints: hints, solution: sol });
  }

  P('Define the Two Jobs of an OS', 'Easy', ['basics'],
    `<p>In two sentences, state the two main roles of an operating system and give one concrete example of each for a laptop.</p>`,
    `Two roles, one example each.`,
    `<p>Resource manager: shares the CPU between Chrome and Spotify. Abstraction: shows a disk as files and folders. ${H.c('g', 'Both examples tie to a real resource.')}</p>`,
    `<p>"The OS runs programs" is vague and does not mention sharing hardware safely or hiding hardware detail, the two ideas interviewers want.</p>`,
    { q: 'Which is an example of OS abstraction?', options: ['Giving each process a time slice', 'Presenting disk blocks as files', 'Cooling the CPU', 'Overclocking RAM'], answer: 1, explain: 'Abstraction hides raw hardware behind clean concepts like files; time slicing is resource management.' },
    [`<p>Think of the hotel: the manager hands out rooms fairly (resources) and the front desk hides the plumbing (abstraction).</p>`, `<p>For each role, pick one hardware item: CPU, memory, disk or network card and say what the OS does with it.</p>`, `<p>Write one sentence per role. Role 1 has the verb "shares/allocates/protects"; role 2 has "hides/presents as".</p>`],
    `<p>The OS has two jobs. First, it is a <b>resource manager</b>: the CPU, RAM, disk and network are limited, so the OS allocates them fairly and protects programs from each other, for example by time-slicing the CPU between Chrome and Spotify and giving each process a private memory space. Second, it provides <b>abstractions</b>: instead of raw disk sectors and device registers, it presents files, processes, sockets and virtual memory, so a programmer writes open and read instead of driving a disk controller. Together these let many programs share one machine safely and simply, and the same program can run on different hardware without changes.</p>`,
    `<p>No algorithmic cost; a definition question.</p>`, ['Which job does the scheduler belong to?']);

  P('Kernel vs OS vs Shell', 'Easy', ['kernel', 'definitions'],
    `<p>A friend says "Linux is an operating system with bash and ls built in". Correct and refine this statement using the terms kernel, shell, system utilities and distribution.</p>`,
    `Use all four terms.`,
    `<p>Linux = kernel only. Ubuntu = Linux kernel + GNU tools + bash + installer. ${H.c('g', 'Different layers, different names.')}</p>`,
    `<p>Saying "they are all the OS" blurs the privilege boundary. The kernel runs in ring 0; bash and ls are ordinary user programs.</p>`,
    { q: 'bash runs in...', options: ['kernel mode', 'user mode', 'firmware', 'ring 0'], answer: 1, explain: 'The shell is a normal user program; it uses syscalls to ask the kernel for help.' },
    [`<p>Ask: which of these pieces run with full CPU privilege? Only one does.</p>`, `<p>The shell reads commands and starts programs; utilities like ls are small programs. Both call the kernel through syscalls.</p>`, `<p>A distribution bundles the kernel with everything else so people can use it: package manager, desktop, tools.</p>`],
    `<p>Strictly, <b>Linux is the kernel</b>: the privileged core running in ring 0 that manages processes, memory, file systems and devices. <b>bash</b> is a <b>shell</b>, a user-mode program that reads commands and launches other programs, and <b>ls</b> is a <b>system utility</b>, also a user-mode program that calls syscalls such as openat and getdents. A <b>distribution</b> such as Ubuntu or Fedora bundles the Linux kernel with the GNU tools, libc, the init system (systemd), a package manager and often a desktop environment. In casual talk "OS" means the whole bundle, but in an interview separate them by privilege: kernel in kernel mode, everything else in user mode.</p>`,
    `<p>Conceptual definition question; no runtime cost.</p>`, ['Where does libc fit?']);

  P('Mode Switches in a Read Loop', 'Easy', ['syscall', 'cost'],
    `<p>A program copies a 1 MiB file by calling <code>read(fd, buf, 1)</code> then <code>write(out, buf, 1)</code> for every byte. How many syscalls and how many mode switches happen? How many if the buffer is 4096 bytes? Express the reduction.</p>`,
    `1 MiB = 1,048,576 bytes; ignore open/close.`,
    `<p>Byte-wise: 2 x 1,048,576 syscalls = 2,097,152; mode switches = 2 per syscall = 4,194,304. ${H.c('g', 'With 4096-byte buffer: 256 reads + 256 writes = 512 syscalls = 1,024 switches.')}</p>`,
    `<p>Byte-at-a-time I/O pays the full syscall toll for each byte: millions of kernel entries, each flushing cache and TLB state, instead of a few hundred.</p>`,
    { q: 'How many mode switches does ONE syscall cause?', options: ['0', '1', '2', '4'], answer: 2, explain: 'User to kernel on entry and kernel to user on return.' },
    [`<p>Count syscalls first: one read and one write per chunk. Chunks = file size divided by buffer size.</p>`, `<p>Each syscall is 2 mode switches (in and out). Multiply.</p>`, `<p>Compare: 2,097,152 versus 512 syscalls is a 4096x reduction, exactly the buffer size ratio.</p>`],
    `<p><b>Byte-wise:</b> 1,048,576 bytes need 1,048,576 reads and 1,048,576 writes = 2,097,152 syscalls, each causing 2 mode switches, so 4,194,304 switches. <b>4096-byte buffer:</b> 1,048,576 / 4096 = 256 chunks, so 256 reads + 256 writes = 512 syscalls = 1,024 mode switches. The reduction is exactly 4096x, equal to the buffer size, because syscall count scales as file size / buffer size. If each syscall costs ~300 ns plus cache effects, the byte-wise version spends about 0.6 seconds on pure syscall overhead, versus about 0.15 ms for the buffered one. This is why stdio buffers and why cp uses large blocks (often 128 KiB or copy_file_range).</p>`,
    `<p>Syscalls = 2 x N / B. Mode switches = 4 x N / B.</p>`, ['What if you used mmap instead?'],
    `#include <unistd.h>
#include <fcntl.h>

// Copy src to dst using a 4096-byte buffer: 2 syscalls per 4 KiB chunk.
int copy_file(const char* src, const char* dst) {
    int in = open(src, O_RDONLY);
    int out = open(dst, O_CREAT | O_WRONLY | O_TRUNC, 0644);
    if (in < 0 || out < 0) return -1;
    char buf[4096];
    ssize_t n;
    while ((n = read(in, buf, sizeof buf)) > 0) {   // 1 syscall per chunk
        if (write(out, buf, n) != n) return -1;      // 1 syscall per chunk
    }
    close(in); close(out);
    return 0;
}`);

  P('Order the Boot Stages', 'Medium', ['boot'],
    `<p>Arrange in order: (a) systemd starts services, (b) UEFI firmware POST, (c) kernel mounts root file system, (d) GRUB loads kernel and initramfs, (e) kernel starts PID 1, (f) UEFI loads the bootloader from the ESP. Then name the stage in which the CPU first enters a mode where a driver runs with full privilege.</p>`,
    `Linux on a UEFI PC.`,
    `<p>Order: b, f, d, c, e, a. ${H.c('g', 'The kernel is first privileged, OS-controlled code (stage c).')}</p>`,
    `<p>Memorising a list without understanding fails when the question changes (BIOS instead of UEFI). Know why each stage exists.</p>`,
    { q: 'What loads the kernel into RAM?', options: ['The shell', 'The bootloader', 'systemd', 'The login manager'], answer: 1, explain: 'GRUB or similar reads the kernel and initramfs from disk into RAM.' },
    [`<p>Start with whoever runs when RAM is empty: firmware. The last thing that happens is user services.</p>`, `<p>The firmware needs a program on disk, the bootloader. The bootloader needs a kernel to hand over to.</p>`, `<p>The kernel mounts root before it can exec /sbin/init, so (c) comes before (e). Drivers inside the kernel get full privilege from that stage.</p>`],
    `<p>Correct order: <b>(b)</b> UEFI POST, <b>(f)</b> UEFI reads the EFI System Partition and runs the bootloader, <b>(d)</b> GRUB loads the kernel and initramfs into RAM and jumps to the kernel, <b>(c)</b> the kernel sets up memory, interrupts and drivers and mounts the root file system (using the initramfs to find the disk), <b>(e)</b> the kernel executes /sbin/init as PID 1, <b>(a)</b> systemd starts services in parallel. The first stage where OS code (kernel and its drivers) runs in kernel mode with its own interrupt table and page tables is the kernel stage; firmware and bootloader run before the OS has control and have no protection model of their own. With BIOS only (b) and (f) change: POST then the MBR sector is loaded and chains to the bootloader.</p>`,
    `<p>Seven small steps; no algorithm.</p>`, ['Where does Secure Boot verify a signature?']);

  P('Interrupt Dispatch Simulation', 'Medium', ['interrupt', 'priority', 'simulation'],
    `<p>Four interrupts arrive in this order while the CPU runs a user program: keyboard (priority 4), disk (2), timer (1), network (3); lower number = more urgent. All arrive before the CPU takes any of them. In what order are they serviced, and how many mode switches happen if each handler runs once? Write code that does this using a priority queue.</p>`,
    `Ties broken by arrival order; no nesting.`,
    `<p>Service order: timer, disk, network, keyboard. Each interrupt = enter kernel + iret = 2 switches, so 8 total.</p>`,
    `<p>Scanning the whole pending list each time costs O(n) per pick; a heap makes each pick O(log n), which matters on a busy server with thousands of interrupts per second.</p>`,
    { q: 'Which device interrupt lets the OS preempt a CPU-hogging program?', options: ['Keyboard', 'Timer', 'Printer', 'Disk'], answer: 1, explain: 'The periodic timer interrupt forces control back into the kernel scheduler.' },
    [`<p>An interrupt controller picks the pending request with the best priority; that is exactly a min-heap keyed on the priority number.</p>`, `<p>Use (priority, arrival_index) as the key so equal priorities are served first come first served.</p>`, `<p>Each serviced interrupt has an entry (user to kernel) and an iret (kernel to user): 2 mode switches each.</p>`],
    `<p>Push (priority, arrival, name) tuples into a min-heap: keyboard (4,0), disk (2,1), timer (1,2), network (3,3). Pop repeatedly: timer (1), disk (2), network (3), keyboard (4). Each pop models the CPU saving state, switching to kernel mode, using the vector table to run the handler, and returning with iret. With 4 interrupts that is 4 entries + 4 returns = 8 mode switches. Pushing costs O(log n) and popping O(log n), so n interrupts cost O(n log n) in total. Real hardware (the APIC) does this ranking in logic circuits, and the OS can mask low-priority sources while a handler runs. Starvation of a low-priority source is possible if high-priority interrupts keep arriving, which is why real systems limit rates (interrupt coalescing, NAPI polling).</p>`,
    `<p>O(n log n) time, O(n) space for n pending interrupts.</p>`, ['How would you avoid starving the keyboard?', 'What if a higher-priority interrupt arrives during a handler?'],
    `import heapq
PR = {"keyboard": 4, "disk": 2, "timer": 1, "network": 3}
pending = []
for i, dev in enumerate(["keyboard", "disk", "timer", "network"]):
    heapq.heappush(pending, (PR[dev], i, dev))   # (priority, arrival, name)
order, switches = [], 0
while pending:
    _, _, dev = heapq.heappop(pending)
    order.append(dev)
    switches += 2            # enter kernel + iret
print(order, switches)`);
  practice[practice.length - 1].solution.code = { lang: 'python', run: true, code: practice[practice.length - 1].solution.code };

  P('Compare Syscall and Function Call Costs', 'Medium', ['syscall', 'performance'],
    `<p>Explain, with a rough cost breakdown, why a system call is far more expensive than an ordinary function call, and list three techniques programs use to reduce syscall overhead.</p>`,
    `Give approximate orders of magnitude.`,
    `<p>Function call ~1-5 ns; trivial syscall ~100-500 ns (more with mitigations). ${H.c('g', 'Direct cost + indirect cache/TLB cost.')}</p>`,
    `<p>Saying "because it goes to the kernel" is circular. The interviewer wants the actual reasons: privilege switch, register save, validation, cache/TLB disruption, mitigations.</p>`,
    { q: 'Which technique reduces syscalls?', options: ['Writing byte by byte', 'Buffering with a larger block size', 'Calling getpid in a loop', 'Disabling errno'], answer: 1, explain: 'Bigger blocks amortise the fixed cost over more data.' },
    [`<p>List what extra work a syscall does that a normal call does not: privilege change, saving state, argument checks, stack switch.</p>`, `<p>Add the hidden cost: the kernel code and data push your hot data out of the CPU caches and may flush TLB entries (especially with KPTI).</p>`, `<p>Techniques: bigger buffers, batching (writev, io_uring), avoiding the kernel (vDSO, mmap, user-space I/O).</p>`],
    `<p>A normal call is a jump plus a stack push: a few cycles, same privilege, same address space, fully inlinable. A syscall must: (1) execute a trap instruction that switches the CPU to ring 0 and loads a kernel stack (~100 cycles), (2) save and later restore user registers, (3) index the syscall table and run security checks (seccomp, LSM, capability tests), (4) validate and copy user pointers (copy_from_user), (5) after Meltdown, possibly switch page tables (KPTI) and flush TLB entries or use barriers, and (6) on return, resume with cold caches and branch predictors because kernel code evicted user lines. Direct cost is roughly 100-500 ns; the indirect cache and TLB cost can be as large again. Techniques to reduce overhead: <b>buffering</b> (stdio, larger read/write blocks), <b>batching</b> (writev, sendmmsg, io_uring submission queues that can need zero syscalls with SQPOLL), and <b>avoiding the kernel</b> (vDSO for clock_gettime, mmap for files, user-space networking like DPDK).</p>`,
    `<p>Cost per call is constant; total cost scales with the number of calls, so reduce the count, not the work.</p>`, ['What is io_uring SQPOLL?']);

  P('Classify and Explain a Page Fault', 'Medium', ['exception', 'page fault'],
    `<p>A program loads from an address whose page is not in RAM. Describe step by step what the hardware and OS do, which class of event this is, where execution resumes, and how the outcome differs for a valid but swapped-out page versus an invalid address.</p>`,
    `Mention the vector table and the saved program counter.`,
    `<p>Valid page: fault &rarr; load page &rarr; retry same instruction. Invalid address: fault &rarr; SIGSEGV &rarr; process killed.</p>`,
    `<p>Treating every page fault as an error misses that demand paging relies on them; minor faults happen thousands of times per second in healthy programs.</p>`,
    { q: 'Where does the CPU resume after a successfully handled page fault?', options: ['After the faulting instruction', 'At the faulting instruction (it is retried)', 'At main()', 'At the next interrupt'], answer: 1, explain: 'The saved PC points at the faulting instruction; it re-executes now that the page is mapped.' },
    [`<p>Page fault is a synchronous exception raised by the MMU when a translation is missing or forbidden.</p>`, `<p>The CPU saves PC and flags, enters kernel mode and uses vector 14 in the IDT. The handler checks the address against the process memory map.</p>`, `<p>If legal: find or allocate a frame, read from disk if needed, update the page table, then iret to the same instruction. If illegal: signal SIGSEGV.</p>`],
    `<p>The MMU cannot translate the virtual address (page-table entry missing or not present), so the CPU raises a <b>page fault exception (vector 14)</b>. This is a <b>fault</b>: synchronous, caused by the executing instruction, and restartable. Hardware pushes the faulting PC and flags on the kernel stack, switches to kernel mode and jumps through the IDT to the page fault handler, giving it the faulting address (CR2 on x86). The handler looks up the address in the process virtual memory areas. <b>Valid but not present</b> (first touch of anonymous memory, file-backed page, or swapped out): the kernel allocates a free frame, reads the page from disk if required (the process sleeps meanwhile and other processes run), updates the page table entry, and returns with iret to the <b>same instruction</b>, which now succeeds. This is a minor fault if no disk I/O was needed or a major fault if it was. <b>Invalid address or permission violation</b> (null pointer, writing read-only text): the kernel cannot fix it, so it sends SIGSEGV and by default terminates the process, producing a core dump.</p>`,
    `<p>Minor fault: ~1 microsecond; major fault: milliseconds because of disk I/O.</p>`, ['What is thrashing?']);

  P('Why Is the Timer Interrupt Essential?', 'Medium', ['interrupt', 'preemption'],
    `<p>Explain what would happen on a single-core machine without a timer interrupt if a user program enters an infinite loop, and how the timer interrupt together with kernel mode fixes it. Include the role of the interrupt handler and the scheduler.</p>`,
    `Single core, general-purpose OS.`,
    `<p>Without a timer: the loop owns the CPU forever; the system hangs. With a timer: every ~1-4 ms the kernel runs and can pick another process.</p>`,
    `<p>Relying on programs to call yield voluntarily (cooperative multitasking, as in old Windows 3.1 or Mac OS 9) means one buggy program freezes everything.</p>`,
    { q: 'Cooperative multitasking depends on...', options: ['timer interrupts', 'programs voluntarily yielding', 'a microkernel', 'virtual memory'], answer: 1, explain: 'Without a forced interrupt a misbehaving program can hog the CPU.' },
    [`<p>An infinite loop never calls the kernel, so the kernel never gets a chance to run unless the hardware forces it.</p>`, `<p>A hardware timer raises an interrupt at a fixed rate; the CPU must obey, saving state and jumping to the kernel.</p>`, `<p>The tick handler updates accounting; if the process used up its slice, it calls the scheduler to pick another process and context-switch.</p>`],
    `<p>Without a timer interrupt the kernel only gets control when the program voluntarily makes a syscall or triggers an exception. An infinite loop does neither, so the CPU would be owned by that process forever and the machine would appear frozen. With a hardware <b>timer</b> (programmed by the kernel at boot, typically 100-1000 Hz or tickless with one-shot timers) the CPU is forced to enter kernel mode through the interrupt vector table at the next tick, regardless of what user code is doing, because user code cannot disable interrupts (privileged instruction). The handler saves the interrupted context, charges CPU time to the process, and if its time slice has expired it calls the scheduler, which chooses another runnable process and context-switches to it. This is <b>preemptive multitasking</b>: the OS keeps the power to take the CPU back, enabling fair sharing, responsiveness, and the ability to kill a runaway process.</p>`,
    `<p>Overhead of a tick is a few microseconds per ms, i.e. under 1% CPU.</p>`, ['What is a tickless kernel?']);

  P('Monolithic vs Microkernel Crash Scenario', 'Medium', ['kernel design'],
    `<p>A buggy USB driver dereferences a null pointer. Describe what happens in (a) a monolithic kernel, (b) a microkernel, and (c) what the extra cost of (b) is in terms of mode switches for a file read.</p>`,
    `Compare reliability and performance.`,
    `<p>(a) kernel panic. (b) the driver process dies, restarted by a service manager. (c) a read via IPC needs about 8 mode switches vs 2.</p>`,
    `<p>Answering only "the microkernel is better" ignores the real trade-off: isolation costs messages and context switches on every service request.</p>`,
    { q: 'In a microkernel, a crashed disk driver typically...', options: ['panics the kernel', 'can be restarted as a user process', 'corrupts the scheduler', 'deletes the file system'], answer: 1, explain: 'Drivers are ordinary user-space servers, isolated by address spaces.' },
    [`<p>Where does the driver run in each design? Ring 0 versus user mode.</p>`, `<p>A null dereference in ring 0 touches memory that the CPU allows, so the kernel itself may fault or be corrupted. In user mode, the MMU stops it and only that process dies.</p>`, `<p>Count the trips: monolithic read = app to kernel and back (2 switches). Microkernel read = app to kernel to FS server to kernel to driver to kernel to FS to kernel to app (about 8).</p>`],
    `<p><b>(a) Monolithic:</b> the driver runs in ring 0 with access to all kernel memory. A null dereference in kernel mode is an unhandled fault inside the kernel itself ("oops"/panic or blue screen); even if the kernel survives, locks and data structures may be left inconsistent, so the safest result is a crash and reboot. <b>(b) Microkernel:</b> the USB driver is a user-space process in its own address space. The same bug triggers a page fault that the microkernel turns into killing only that process; a reincarnation/service manager restarts the driver (MINIX 3 does this automatically), and the rest of the system continues, possibly with a brief USB glitch. <b>(c) Cost:</b> a monolithic file read is one syscall: 2 mode switches. In a microkernel, app to FS server and FS server to driver are IPC round trips, each costing entries into the kernel and a context switch: roughly 8 switches and message copies for the same read. Modern L4 IPC at ~0.1-1 microsecond per round trip reduces but does not remove this tax.</p>`,
    `<p>Monolithic ~2 switches per service request; microkernel ~2 per hop, i.e. 4-8 or more for chained servers.</p>`, ['How can a microkernel speed up IPC?']);

  P('Trace strace -c Output', 'Hard', ['strace', 'diagnosis'],
    `<p>You run <code>strace -c ./copy big.bin out.bin</code> and see: read 1,048,576 calls, write 1,048,576 calls, openat 2, close 2, with 98% of "system time" in read and write. Diagnose the problem, quantify the expected speed-up of a fix, and write the fix in C++.</p>`,
    `File is 1 MiB; use a 64 KiB buffer in the fix.`,
    `<p>2,097,152 syscalls for 1 MiB means 1 byte per call. With 64 KiB buffers: 16 reads + 16 writes = 32 syscalls, a 65,536x reduction.</p>`,
    `<p>Tuning the disk or buying faster hardware is pointless: the CPU is burning time entering and leaving the kernel, not waiting for the disk.</p>`,
    { q: 'strace -c primarily reports...', options: ['CPU temperature', 'counts and time of each syscall', 'only errors', 'memory leaks'], answer: 1, explain: 'It summarises syscall counts, errors and time.' },
    [`<p>Divide bytes by number of read calls to get bytes per call: 1,048,576 / 1,048,576 = 1.</p>`, `<p>Cost model: total syscall overhead is roughly calls x ~0.3 microseconds; reducing the calls by buffer size B gives a factor-B reduction.</p>`, `<p>Read into a large buffer, then write exactly the number of bytes read. Handle short reads, EINTR and errors. Cap buffer size to cache-friendly 64 KiB to 1 MiB.</p>`],
    `<p><b>Diagnosis:</b> 1,048,576 read calls for a 1,048,576-byte file means each read moves a single byte, and the same for write. The program is syscall-bound: 2.1 million kernel entries, each ~0.3 to 1 microsecond direct plus cache/TLB damage, around 1 second or more of pure overhead for a 1 MiB file. The disk is irrelevant because the page cache already holds the data. <b>Fix:</b> read and write in large blocks (64 KiB). Then there are 1,048,576 / 65,536 = 16 reads and 16 writes: 32 syscalls instead of 2,097,152, a 65,536x reduction in mode switches, and the run time becomes dominated by memcpy and the actual I/O (milliseconds). Handle partial writes in a loop, retry on EINTR, and check every return value. Further tuning: copy_file_range or sendfile to let the kernel copy without bouncing data through user space, or mmap, and use posix_fadvise for read-ahead on big files.</p>`,
    `<p>Syscalls drop from 2N to about 2N/B; user-space copy cost O(N) is unchanged.</p>`, ['When is copy_file_range better?', 'What if the output is a pipe or socket and writes are short?'],
    `#include <unistd.h>
#include <fcntl.h>
#include <cerrno>

static bool write_all(int fd, const char* p, size_t n) {
    while (n > 0) {
        ssize_t w = write(fd, p, n);
        if (w < 0) { if (errno == EINTR) continue; return false; }
        p += w; n -= (size_t)w;               // handle short writes
    }
    return true;
}

int copy_fast(const char* src, const char* dst) {
    int in = open(src, O_RDONLY), out = open(dst, O_CREAT | O_WRONLY | O_TRUNC, 0644);
    if (in < 0 || out < 0) return -1;
    static char buf[64 * 1024];               // 64 KiB: 16 reads for a 1 MiB file
    for (;;) {
        ssize_t r = read(in, buf, sizeof buf);
        if (r == 0) break;                    // EOF
        if (r < 0) { if (errno == EINTR) continue; return -1; }
        if (!write_all(out, buf, (size_t)r)) return -1;
    }
    close(in); close(out);
    return 0;
}`);

  P('Design the Syscall Entry Path Safely', 'Hard', ['syscall', 'security'],
    `<p>You are asked to design how a kernel handles <code>write(fd, user_ptr, len)</code> safely. List the checks and mechanisms needed to prevent a malicious program from crashing or exploiting the kernel, and explain the TOCTOU problem and how it is avoided.</p>`,
    `Cover pointer validation, copying, fd validation, and error reporting.`,
    `<p>A user passes a kernel address as the buffer: the kernel must refuse (EFAULT) and not read kernel secrets back to the user.</p>`,
    `<p>Directly dereferencing user_ptr is the classic vulnerability: user can pass kernel addresses, unmapped pages, or change memory concurrently.</p>`,
    { q: 'Why does the kernel use copy_from_user?', options: ['It is faster', 'To safely validate and fault-handle user pointers', 'To avoid mode switches', 'It encrypts data'], answer: 1, explain: 'It checks the range and handles faults so a bad pointer returns EFAULT instead of crashing or leaking kernel memory.' },
    [`<p>Assume everything from user space is hostile: number, fd, pointer, length.</p>`, `<p>The pointer must lie in the user part of the address space, and accessing it can fault (unmapped page, swapped out). The kernel needs a fault-tolerant copy routine.</p>`, `<p>TOCTOU: user threads can change memory between check and use. Copy first into kernel memory, then validate and act on the copy only.</p>`],
    `<p>The entry stub first bounds-checks the syscall number against the table size (else -ENOSYS) and runs seccomp/audit/ptrace hooks. For write: (1) <b>fd validation</b> - look up fd in the process file table under a reference count; EBADF if absent; check the file was opened for writing. (2) <b>Argument sanity</b> - clamp len (e.g. to MAX_RW_COUNT) to avoid integer overflow in later arithmetic. (3) <b>Pointer validation</b> - check the range [user_ptr, user_ptr+len) lies entirely in the user half of the address space (access_ok); never trust a kernel address coming from user space. (4) <b>Safe copy</b> - use copy_from_user, which has a fixup table so a page fault during the copy returns EFAULT instead of oopsing; SMAP prevents accidental direct access. (5) <b>TOCTOU</b> - a second thread may unmap or modify the buffer after the check; so copy the data once into kernel memory (or pin pages) and only use the copy; validating then re-reading from user memory is a vulnerability (double fetch). (6) <b>Permission and security hooks</b> - LSM (SELinux/AppArmor) and capability checks. (7) <b>Return</b> - bytes written or -errno in rax, never leaking uninitialised kernel stack bytes; then sysret to user mode.</p>`,
    `<p>Constant checks plus O(len) copy.</p>`, ['What is a double-fetch bug?', 'How does SMAP help?']);

  P('Boot Failure Triage', 'Hard', ['boot', 'troubleshooting'],
    `<p>Three boot failures: (1) "No bootable device found", (2) GRUB prompt "grub rescue>", (3) "Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)". For each, name the stage that failed, the likely cause and a safe first fix.</p>`,
    `Linux on a UEFI PC with LVM-encrypted root.`,
    `<p>(1) firmware; (2) bootloader; (3) kernel/initramfs. ${H.c('g', 'The last visible message names the last stage that ran.')}</p>`,
    `<p>Reinstalling the OS for every failure destroys data and teaches nothing. Locating the stage first usually gives a 5-minute fix.</p>`,
    { q: 'A grub rescue> prompt means...', options: ['firmware failed POST', 'GRUB loaded but cannot find its config or kernel', 'systemd crashed', 'login failed'], answer: 1, explain: 'The bootloader started, so firmware worked, but GRUB could not find its files.' },
    [`<p>Use the stage chain: firmware, bootloader, kernel + initramfs, init. Which one printed the message?</p>`, `<p>If firmware ran but found no ESP, case 1; if GRUB started but lost its partition, case 2; if the kernel ran but cannot find or unlock the root device, case 3.</p>`, `<p>Safe first fixes use a live USB: check boot order and ESP, reinstall GRUB or fix its prefix, rebuild initramfs with the missing driver or crypt/LVM modules. Back up before changing partitions.</p>`],
    `<p><b>(1) "No bootable device found"</b> comes from the <b>firmware</b>: POST passed but no boot entry/ESP/MBR was valid. Causes: wrong boot order, disk not detected, deleted or corrupted EFI System Partition, Secure Boot rejecting an unsigned loader. First fix: check firmware boot order and disk detection, then from a live USB mount the ESP and reinstall the bootloader entry (efibootmgr, grub-install). <b>(2) "grub rescue>"</b> means <b>GRUB started</b> (so firmware and ESP worked) but cannot find its /boot files, usually after a partition change or UUID mismatch. First fix: use ls to find the partition, set prefix and root, insmod normal, boot; then run update-grub and grub-install. <b>(3) "Unable to mount root fs on unknown-block(0,0)"</b> is the <b>kernel</b>: it ran but could not find the root device - the initramfs lacks the driver (NVMe, RAID, dm-crypt, LVM) or the root= parameter is wrong. First fix: boot an older kernel entry from the GRUB menu, or use a live USB to chroot and rebuild the initramfs (update-initramfs -u / dracut), verifying root= and crypttab. Always back up first and avoid blind partition commands.</p>`,
    `<p>Triage by stage is O(1) reasoning: the message reveals the last stage that ran.</p>`, ['How would Secure Boot change case 3?']);

  P('Design an OS Structure for a Medical Device', 'Hard', ['kernel design', 'design'],
    `<p>Design the OS architecture for a networked insulin pump with a touch display, Bluetooth, and a dosing controller. Choose the kernel structure, decide what runs in kernel vs user space, and explain how the design keeps a UI or Bluetooth bug from affecting dosing.</p>`,
    `Hard real-time dosing deadline of 10 ms; certified safety class.`,
    `<p>Microkernel RTOS; dosing in an isolated high-priority partition; Bluetooth stack and UI in separate low-priority partitions with IPC-only access.</p>`,
    `<p>One big monolithic firmware where UI, Bluetooth and dosing share memory means a stray pointer in Bluetooth can corrupt dosing variables.</p>`,
    { q: 'Which property most matters for safety-critical separation?', options: ['Number of lines of code', 'Memory and fault isolation between components', 'Having a GUI', 'Using the biggest kernel'], answer: 1, explain: 'Isolation keeps a fault in one component from affecting a critical one.' },
    [`<p>Identify criticality levels: dosing is critical, Bluetooth and display are not. Different levels must not share address spaces.</p>`, `<p>Use a small separation microkernel or RTOS with MMU/MPU partitions, fixed-priority scheduling and bounded IPC. Drivers run in user mode.</p>`, `<p>Add defence in depth: watchdog, memory protection unit, signed boot, and a minimal message interface validated by the dosing partition.</p>`],
    `<p><b>Structure:</b> a verified or certifiable <b>microkernel/separation kernel RTOS</b> (seL4, QNX or a certified RTOS with MPU partitions). Only address spaces, fixed-priority scheduling, IPC and interrupt delivery run in privileged mode (tens of thousands of lines at most). <b>Partitions in user mode:</b> (1) dosing controller at highest priority with a statically allocated memory and a 10 ms periodic deadline, (2) sensor driver, (3) Bluetooth stack (the most exposed, internet-facing component) and (4) UI/touch driver at lower priority. Each partition has its own address space (MMU or MPU) and may only communicate through small, fixed-format IPC messages that the dosing partition validates (range checks on dose limits). <b>Fault containment:</b> a crash or exploit in Bluetooth or UI kills or restarts only that partition; a hardware watchdog restarts the system into a safe state if the dosing task misses its deadline; clamped dose limits enforced inside the dosing partition. <b>Security:</b> secure and measured boot, signed updates, minimal syscalls via capabilities. <b>Trade-off accepted:</b> IPC overhead (microseconds, negligible against a 10 ms budget) and engineering cost of writing drivers for user space, in exchange for provable isolation and certifiability (IEC 62304, ISO 14971).</p>`,
    `<p>Design question: assess by isolation, timing determinism and certifiability.</p>`, ['How would you prove the 10 ms deadline?', 'How do you update firmware safely?']);

  // ---------------------------------------------------------------- QUIZ
  function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
  Q('Which pair best describes the two main jobs of an OS?', ['Compiling and linking', 'Resource management and abstraction', 'Drawing windows and playing sound', 'Booting and shutting down'], 1, 'The OS shares limited hardware among programs and gives them simple abstractions like files and processes.');
  Q('Which instruction can run only in kernel mode?', ['ADD', 'MOV between registers', 'HLT (halt the CPU)', 'JMP within user code'], 2, 'Halting the CPU and I/O port access are privileged; user mode attempts cause a protection fault.');
  Q('How many mode switches does one successful system call cause?', ['1', '2', '3', '0'], 1, 'One into the kernel (trap) and one back to user mode (return).');
  Q('What does the kernel use the syscall number for?', ['As a file descriptor', 'As an index into the syscall table', 'As the process ID', 'As the page size'], 1, 'The number selects a handler function from an array of function pointers.');
  Q('Which is a hardware, asynchronous event?', ['Divide by zero', 'A disk-completion interrupt', 'A syscall instruction', 'A page fault'], 1, 'Devices raise interrupts at any time, unrelated to the current instruction. The other three are caused by the executing instruction.');
  Q('After a page fault is serviced, execution continues at...', ['the next instruction', 'the same instruction, retried', 'main()', 'the previous function'], 1, 'Faults are restartable: the faulting instruction runs again once the page is mapped.');
  Q('What does the interrupt vector table store?', ['Process IDs', 'Addresses of handlers indexed by interrupt number', 'File names', 'Page sizes'], 1, 'The CPU uses the vector number to find the handler (x86: IDT).');
  Q('In which order do the boot stages run on a UEFI PC?', ['Kernel, firmware, bootloader, init', 'Firmware, bootloader, kernel, init', 'Bootloader, firmware, init, kernel', 'Init, kernel, bootloader, firmware'], 1, 'Each stage loads the next: firmware loads the bootloader, which loads the kernel, which starts PID 1.');
  Q('Which is a monolithic kernel?', ['QNX', 'seL4', 'Linux', 'MINIX 3'], 2, 'Linux runs file systems, drivers and networking inside the kernel. QNX, seL4 and MINIX 3 are microkernels.');
  Q('Why are syscalls more expensive than function calls?', ['They use more RAM', 'They involve a privilege switch, validation and cache/TLB side effects', 'They need a compiler', 'They always touch the disk'], 1, 'The mode switch plus bookkeeping and loss of cache locality add up to hundreds of nanoseconds.');
  Q('Which statement about printf to a terminal is true?', ['Every printf call is one write syscall', 'Output is line buffered so a newline triggers the write', 'It never calls write', 'It runs in kernel mode'], 1, 'libc buffers in user space and flushes on newline for terminals, reducing syscalls.');
  Q('What is the first user-space process Linux starts?', ['bash', 'PID 1 (init/systemd)', 'GRUB', 'kthreadd'], 1, 'The kernel executes /sbin/init as PID 1; it starts all other services.');
  Q('Why does the OS rely on a timer interrupt?', ['To keep the clock pretty', 'To regain control from a running program for preemptive scheduling', 'To load drivers', 'To compress memory'], 1, 'Programs cannot disable interrupts, so the timer forces entry into the kernel.');

  // ---------------------------------------------------------------- INTERVIEW
  function I(q, level, a, f) { interview.push({ q: q, level: level, a: a, followUps: f }); }
  I('What does an operating system do?', 'B', `<p>An OS has two core roles. As a <b>resource manager</b> it shares the CPU, memory, storage and network among many programs fairly and safely, enforcing protection so one program cannot damage another. As an <b>abstraction layer</b> it hides raw hardware behind simple concepts like processes, files, sockets and virtual memory. Services include process and memory management, file systems, device I/O, networking, security and accounting.</p>`, ['Is the shell part of the OS?', 'Name an OS service that is not about hardware.']);
  I('Explain kernel mode and user mode. Why do we need both?', 'B', `<p>The CPU has a mode bit. In <b>kernel mode</b> (ring 0) all instructions and all memory are accessible; only the OS kernel runs there. In <b>user mode</b> (ring 3) privileged instructions such as I/O, halting, page-table changes and interrupt masking are forbidden. We need both for <b>protection</b>: a buggy or malicious app can only damage itself, and the OS can enforce fair sharing. Apps reach the kernel only through controlled gates (system calls).</p>`, ['What happens if user code runs a privileged instruction?', 'What are rings 1 and 2 used for?']);
  I('What happens, step by step, when a program calls read()?', 'B', `<p>The libc wrapper places the syscall number and arguments in registers and executes the <code>syscall</code> instruction. The CPU switches to kernel mode and jumps to the kernel entry point. The kernel indexes its syscall table with the number, calls <code>sys_read</code>, validates the fd and user buffer, and fetches data from the page cache or asks the driver (the thread may sleep until a disk interrupt). It copies data to the user buffer with copy_to_user, places the result or -errno in a register and executes <code>sysret</code>, returning to user mode. libc sets errno on failure.</p>`, ['Where could this block?', 'Why must the kernel copy rather than point?']);
  I('Why is a system call more expensive than a normal function call?', 'I', `<p>A function call is a jump in the same privilege level. A syscall needs a privilege transition (about 100+ cycles), saving/restoring registers, a kernel stack switch, argument validation, security hooks (seccomp, LSM), and since Meltdown often page-table switches (KPTI). The biggest hidden cost is cache and TLB pollution: kernel code evicts the user program's working set. Typical numbers: function call a few ns, trivial syscall 100-500 ns. Mitigate by buffering, batching (writev, io_uring) and avoiding the kernel (vDSO, mmap).</p>`, ['What is the vDSO?', 'How does io_uring reduce syscalls?']);
  I('Distinguish interrupts, traps, faults and aborts.', 'I', `<p>An <b>interrupt</b> is asynchronous, raised by hardware outside the CPU (timer, disk, NIC). Exceptions are synchronous, caused by the executing instruction: a <b>trap</b> is intentional (syscall, breakpoint) and returns to the next instruction; a <b>fault</b> is accidental but often recoverable (page fault, divide error) and the instruction is retried or the process killed; an <b>abort</b> is an unrecoverable error (machine check). All use the vector table: save state, switch to kernel mode, run the handler, iret.</p>`, ['Is a syscall an interrupt?', 'Which can be masked?']);
  I('How does the CPU find the right interrupt handler?', 'I', `<p>Each interrupt source or exception has a <b>vector number</b>. The CPU register (IDTR on x86) points to the <b>interrupt descriptor table</b>, an array of gate descriptors holding the handler address, code segment and privilege level. The CPU indexes with the vector, pushes the old state on the kernel stack, loads the handler address into the program counter and runs it in kernel mode. The OS fills this table at boot. Hardware vectors 0-31 are exceptions; 32+ are for devices and software.</p>`, ['What is an interrupt controller (APIC)?', 'What are top and bottom halves?']);
  I('Walk me through what happens from pressing the power button until a login prompt.', 'B', `<p>The CPU starts at the reset vector in firmware (UEFI or BIOS). Firmware runs POST, initialises hardware and finds a boot device. With UEFI it loads the bootloader .efi from the EFI System Partition (BIOS reads the 512-byte MBR). The bootloader (GRUB) loads the kernel and the initramfs into RAM and jumps to the kernel. The kernel initialises memory management, interrupt tables, scheduler and drivers, mounts the root file system and starts PID 1 (systemd), which starts services and finally the login prompt.</p>`, ['What does the initramfs do?', 'How does Secure Boot work?']);
  I('BIOS versus UEFI?', 'I', `<p>BIOS is the legacy 16-bit firmware: it runs POST and loads the first 512-byte MBR sector, limited to 2 TB disks and 4 primary partitions. UEFI is modern: it runs in 32/64-bit mode, understands FAT file systems, loads .efi applications from the EFI System Partition, uses GPT (huge disks, 128 partitions), has a boot manager with NVRAM entries, supports Secure Boot and network boot, and boots faster. UEFI also exposes runtime services to the OS.</p>`, ['What is the ESP?', 'What does Secure Boot protect against?']);
  I('Compare monolithic and microkernel designs.', 'I', `<p>A monolithic kernel (Linux) runs scheduling, memory, file systems, networking and drivers all in kernel mode; calls are cheap function calls so it is fast, but a bug in any driver can crash the system and the trusted code base is huge. A microkernel (QNX, seL4, MINIX 3) keeps only address spaces, scheduling and IPC in the kernel; drivers and servers run in user space, giving fault isolation, easy restarts and a small verifiable TCB at the cost of IPC overhead. Hybrid kernels (Windows NT, XNU) mix both.</p>`, ['Is Linux a microkernel?', 'Why did monolithic designs win on desktops?']);
  I('Is Windows or macOS a microkernel?', 'A', `<p>No, both are usually called <b>hybrid</b>. Windows NT has a microkernel-inspired design (executive layers, subsystem servers, message passing) but runs the executive, file systems, graphics and many drivers in kernel mode for speed. macOS/iOS use XNU, which combines the Mach microkernel with a BSD layer and I/O Kit drivers in one kernel address space, so it is effectively monolithic in practice. Apple is moving drivers to user space (DriverKit) to improve reliability.</p>`, ['What is DriverKit?', 'How does the Windows driver model affect stability?']);
  I('How would you find out why a program is slow because of syscalls?', 'A', `<p>Use <code>strace -c</code> to count and time syscalls per type, and <code>strace -f -tt</code> for a timeline, or low-overhead tools like <code>perf trace</code> and eBPF (bpftrace, bcc syscount). Look for huge counts of tiny reads/writes, repeated stat/open of the same file, futex storms or sleeping in poll. Fix with larger buffers, batching, caching results, mmap, or io_uring. Confirm using the same measurement afterwards, remembering that strace itself slows the program a lot.</p>`, ['Why is strace slow?', 'What is perf trace?']);
  I('What is a page fault and is it always an error?', 'I', `<p>A page fault is an exception raised when the MMU cannot translate an address or the access is not permitted. It is not necessarily an error: demand paging, copy-on-write after fork, memory-mapped files and swapping all depend on page faults. The handler checks the address against the process's memory regions; if valid it supplies the page (minor or major fault) and retries the instruction; if invalid it sends SIGSEGV. Major faults involve disk I/O and are very expensive.</p>`, ['What is copy-on-write?', 'What is thrashing?']);
  I('How did Meltdown and its mitigations change the cost of user/kernel transitions?', 'E', `<p>Meltdown let user code read kernel memory through speculative execution and cache side channels. The main Linux mitigation, KPTI, unmaps most kernel memory from user page tables, so each syscall and interrupt must switch page tables (CR3), and without PCID it flushes the TLB. That raised syscall costs noticeably (from tens to hundreds of cycles extra) and hurt syscall-heavy workloads such as databases. PCID reduces the flush cost, and newer CPUs fixed the flaw in hardware so KPTI is disabled there. It shows that OS performance depends on microarchitecture.</p>`, ['What is PCID?', 'What other mitigations affect syscalls (retpoline, IBRS)?']);

  registerModule({
  langExplain: `<p><b>About the code here.</b> The examples show what the operating system or the network actually does, written in C++ (close to the real system calls) and short Python scripts you can run in the page. Read them to see the mechanism; you do not need to write C++ or Python to follow the lessons, the quiz or the interview questions. The same facilities exist in every language: threads and locks (<code>java.util.concurrent</code>, Python <code>threading</code>, Node worker threads, <code>std::thread</code>), sockets (<code>java.net</code>, Python <code>socket</code>, Node <code>net</code>, POSIX sockets) and files (<code>java.nio</code>, Python <code>open</code>, Node <code>fs</code>, <code>fstream</code>).</p>`,
    id: 'cs01',
    title: 'What an Operating System Does',
    intro: `<p>Every program you write runs on top of an operating system, and almost every interview question about performance, security or "what happens when I call X" comes back to it. In this module you build the mental model: what an OS is for (resource manager + abstraction), why the CPU has kernel and user modes, how a system call really works, how interrupts and exceptions give the kernel control, how a machine boots, and how kernels are structured (monolithic, microkernel, hybrid). Simple analogies first, then the real mechanism, then expert details.</p>`,
    goals: ['Explain the two main roles of an OS and list its services', 'Describe kernel vs user mode and why privileged instructions exist', 'Trace printf to write() through the trap, syscall table and return, and count mode switches', 'Classify events as interrupt, trap, fault or abort and describe handler dispatch', 'Order the boot stages from power-on to init and compare BIOS with UEFI', 'Choose monolithic, microkernel or hybrid for a product and defend the trade-offs'],
    prereqs: `Basic programming (C or C++ helps). No earlier module needed - this is the start of the CS Core track.`,
    hours: 8,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
