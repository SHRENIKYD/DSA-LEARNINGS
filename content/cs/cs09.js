(function () {
var topics = [], practice = [], quiz = [], interview = [];
function P(title, level, tags, companies, statement, constraints, example, bruteWhy, mcq, hints, approach, complexity, followUps) {
  return { title: title, level: level, tags: tags, companies: companies, statement: statement, constraints: constraints, example: example,
    brute: { why: bruteWhy }, mcq: mcq, hints: hints,
    solution: { approach: approach, complexity: complexity, followUps: followUps } };
}
function num(s, d) { var n = parseInt(s, 10); return isNaN(n) ? d : n; }

// ---------------- Topic 1: hypervisors, VT-x, VMs vs containers ----------------
topics.push({
  title: 'Hypervisors, Hardware Virtualization & VMs vs Containers',
  analogy: `<p>A <b>VM</b> is a separate <b>house</b> built inside a big apartment complex: its own walls, plumbing and front door (its own kernel). A <b>container</b> is a <b>room in a shared flat</b>: each tenant has a lockable door and their own shelf space, but everyone shares one kitchen and one plumbing system (the host kernel). Houses are safer but cost more to build; rooms are quick and cheap.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A <b>hypervisor</b> (also called a VMM, virtual machine monitor) is the program that lets many operating systems share one physical machine. Each guest OS <i>thinks</i> it owns the hardware.</p>
  <ul><li><b>Type 1 (bare metal)</b>: the hypervisor runs directly on the hardware. Examples: Xen, VMware ESXi, Hyper-V, KVM (the Linux kernel itself becomes the hypervisor). Used in clouds.</li>
  <li><b>Type 2 (hosted)</b>: the hypervisor is an ordinary app on a normal OS. Examples: VirtualBox, VMware Workstation, Parallels. Good for laptops, slower because of the extra OS layer.</li></ul>
  <p><b>Hardware virtualization.</b> A CPU can run guest code at full speed, but when the guest does something risky (touch a device, read a special register) the CPU must hand control to the hypervisor. Intel <b>VT-x</b> (AMD-V) adds a new CPU mode: guest code runs in "non-root mode" and a sensitive instruction causes a <b>VM exit</b> to the hypervisor ("root mode"). The hypervisor handles it and does a <b>VM entry</b> to resume the guest.</p>
  <p>Memory has the same problem: the guest has its own page tables (guest-virtual to guest-physical), but guest-physical is not real RAM. <b>EPT</b> (Intel, AMD calls it NPT) lets the CPU walk <i>two</i> tables in hardware: guest page table, then the hypervisor's EPT (guest-physical to host-physical). No more slow software "shadow page tables".</p>
  ${H.table(['', 'VM', 'Container'], [['Has its own kernel?', 'Yes (guest OS)', 'No - shares host kernel'], ['Isolation', 'Hardware boundary (strong)', 'Kernel features (weaker; kernel bug = escape)'], ['Startup', 'seconds to minutes (boot an OS)', 'milliseconds (start a process)'], ['Density per host', 'tens', 'hundreds to thousands'], ['Image size', 'GBs', 'MBs'], ['Run other OS?', 'Yes (Windows on Linux)', 'No - same kernel only']])}
  <p><b>Rule of thumb:</b> containers for "pack many trusted-ish apps"; VMs when tenants do not trust each other. Modern hybrids (Firecracker, Kata Containers, gVisor) give container speed with VM-like walls.</p>`,
  clues: ['"Run Windows and Linux on the same server" → VM (different kernels)', '"Start in milliseconds / thousands per host / scale-to-zero" → containers or microVMs', '"Multi-tenant, untrusted code" (Lambda, Fargate) → microVM (Firecracker) not plain containers', '"Is a container a VM?" → no: no guest kernel, it is a process with namespaces + cgroups', '"Type 1 vs Type 2" → where does the hypervisor run: on bare metal or inside a host OS?', '"Why is nested paging needed / what is EPT?" → hardware two-level address translation'],
  code: [{ lang: 'bash', check: false, title: 'Is my machine ready for KVM? (Linux)', code: `# CPU flag vmx = Intel VT-x, svm = AMD-V
grep -E -o 'vmx|svm' /proc/cpuinfo | sort | uniq -c
# EPT / NPT support shows up as flags too
grep -o -w -E 'ept|npt' /proc/cpuinfo | sort -u
# /dev/kvm exists when the kvm kernel module is loaded
ls -l /dev/kvm
# Am I myself inside a VM? (prints the hypervisor vendor)
systemd-detect-virt` }],
  codeTitle: ['Checking virtualization support'],
  viz: {
    title: 'VM exit: which instructions run natively, which trap to the hypervisor?',
    input: 'add mov cpuid add out page-fault add',
    inputLabel: 'Guest instructions (space separated: add, mov, cpuid, out, in, hlt, page-fault, ...)',
    gen: function (input) {
      var ins = String(input).trim().split(/[\s,]+/).filter(Boolean);
      if (!ins.length) throw new Error('Type a few instructions such as: add mov cpuid out');
      if (ins.length > 12) throw new Error('Use at most 12 instructions');
      var sens = { cpuid: 'CPU feature query', out: 'device I/O port write', 'in': 'device I/O port read', hlt: 'guest idles the CPU', rdmsr: 'special register read', wrmsr: 'special register write', 'page-fault': 'EPT violation (guest-physical page not mapped yet)', vmcall: 'hypercall to hypervisor' };
      var nodes = [{ id: 'G', label: 'Guest OS / app', x: 14, y: 12, shape: 'box', w: 22 }, { id: 'CPU', label: 'CPU (VT-x)', x: 50, y: 12, shape: 'box', w: 20 }, { id: 'HV', label: 'Hypervisor (root mode)', x: 84, y: 12, shape: 'box', w: 28 }];
      var frames = [], exits = 0, native = 0;
      frames.push({ narr: 'The guest runs inside <b>non-root mode</b>. Plain instructions run on the real CPU at full speed. Only <i>sensitive</i> ones cause a <b>VM exit</b>.', parts: [{ type: 'graph', height: 28, directed: true, nodes: nodes, edges: [['G', 'CPU', 'runs'], ['CPU', 'HV', 'exit?']] }] });
      for (var i = 0; i < ins.length; i++) {
        var k = ins[i].toLowerCase();
        if (sens[k]) {
          exits++;
          frames.push({ narr: '<code>' + H.esc(k) + '</code> (' + sens[k] + ') → <span class="c-r">VM exit</span>. The CPU saves guest state, switches to root mode and the hypervisor emulates it, then does a <b>VM entry</b>. Cost: roughly 1-2 microseconds, ~1000+ cycles.', parts: [
            { type: 'graph', height: 28, directed: true, nodes: nodes, edges: [['G', 'CPU', k], ['CPU', 'HV', 'VM exit']], hl: { HV: 'bad', G: 'cur' }, ehl: { 'CPU-HV': 'bad' } },
            { type: 'vars', vals: { native: native, 'vm exits': exits }, hl: { 'vm exits': 'bad' } }] });
        } else {
          native++;
          frames.push({ narr: '<code>' + H.esc(k) + '</code> is an ordinary instruction → <span class="c-g">runs natively</span> on the CPU, no hypervisor involved. This is why VMs are near bare-metal speed for compute.', parts: [
            { type: 'graph', height: 28, directed: true, nodes: nodes, edges: [['G', 'CPU', k], ['CPU', 'HV', 'exit?']], hl: { CPU: 'ok', G: 'cur' }, ehl: { 'G-CPU': 'ok' } },
            { type: 'vars', vals: { native: native, 'vm exits': exits }, hl: { native: 'ok' } }] });
        }
      }
      frames.push({ narr: 'Summary: <b>' + native + '</b> instructions ran natively, <b>' + exits + '</b> caused VM exits. Hypervisor tuning = reduce exits (virtio paravirtual drivers, huge pages, posted interrupts).', parts: [{ type: 'vars', vals: { native: native, 'vm exits': exits, 'exit share %': Math.round(100 * exits / ins.length) } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Reading the stacks: type 1 vs type 2 vs containers', html: `<p>Bottom to top:</p>
      ${H.table(['Layer', 'Type 1 (KVM/ESXi)', 'Type 2 (VirtualBox)', 'Containers (Docker)'], [['1', 'Hardware', 'Hardware', 'Hardware'], ['2', 'Hypervisor', 'Host OS', 'Host OS kernel'], ['3', 'Guest OS per VM', 'Hypervisor app', 'Container runtime (runc)'], ['4', 'Apps', 'Guest OS per VM', 'Apps in containers (no OS)'], ['5', '-', 'Apps', '-']])}
      <p>Count the kernels: type 1 = N guest kernels (+hypervisor), type 2 = host kernel + N guest kernels, containers = <b>one</b> kernel total. That single number explains density and startup.</p>` },
    { title: 'Why EPT matters (counting memory references)', html: `<p>A guest virtual address needs a 4-level guest page walk. With nested paging each of those 4 guest-table pointers is itself a guest-physical address that must be translated by a 4-level EPT walk. Worst case ≈ (4+1)×(4+1) − 1 = <b>24 memory references</b> on a TLB miss, versus 4 natively. The TLB caches the final result, so hot code is fine, and huge pages (2 MB) shrink the walks a lot. Pre-EPT "shadow page tables" avoided the 24 but trapped on every guest page-table write - much worse.</p>` },
    { title: 'Startup time budget', html: `<p>Boot a full Linux VM: firmware + kernel + init ≈ 5-30 s. Firecracker microVM (minimal kernel, no BIOS): ≈ 125 ms. Container start: create namespaces, mount overlay, exec the process ≈ 50-300 ms (mostly image pull the first time). A warm container is just <code>fork+exec</code>-class cost.</p>` }
  ],
  deepDive: `<p><b>🟣 Internals.</b> VT-x keeps per-vCPU state in a <b>VMCS</b> (VM control structure; AMD calls it VMCB). The hypervisor decides which events cause exits (bitmaps for I/O ports, MSRs, interrupts). KVM turns Linux into a type-1-style hypervisor: <code>/dev/kvm</code> gives each VM an fd, each vCPU is a <b>normal Linux thread</b> that loops on <code>ioctl(KVM_RUN)</code>; QEMU emulates the devices in userspace. So the line between "type 1" and "type 2" is blurry - KVM is in the host kernel but the host is a full OS.</p>
  <p><b>Paravirtualization.</b> Emulating a real network card costs many exits per packet. <b>virtio</b> instead uses shared-memory rings (virtqueues) designed for VMs, so the guest batches work and kicks the host once. SR-IOV and PCI passthrough (VFIO, IOMMU) hand a real device slice straight to a guest for near-native speed. <b>Memory ballooning</b>, KSM page dedup and overcommit raise density but add noisy-neighbour risk.</p>
  <p><b>Container security reality.</b> All containers share one kernel attack surface (~350 syscalls). Defences: seccomp filters, dropped capabilities, AppArmor/SELinux, user namespaces, read-only rootfs. High-risk multi-tenancy (running customers' code) uses <b>microVMs</b> (AWS Lambda/Fargate use Firecracker) or user-space kernels (gVisor intercepts syscalls). Spectre/Meltdown-class bugs also cross VM boundaries on shared cores, which is why clouds disable SMT sharing across tenants.</p>
  <p><b>Interview trap:</b> "containers are lightweight VMs" is wrong. A container is just a process (or process tree) with restricted views (namespaces) and budgets (cgroups). <code>ps</code> on the host shows the container's processes.</p>`,
  aiEra: `<p><b>What AI changes:</b> GPU clusters made virtualization interesting again. Training jobs want <i>bare-metal-like</i> speed: GPUs are passed through to VMs (VFIO) or shared into containers via the NVIDIA container toolkit; MIG slices one GPU into hardware-isolated pieces. Inference platforms run model servers in containers for fast scale-up, but untrusted <b>AI-generated code</b> (agent sandboxes, code interpreters) is usually run inside <b>microVMs or gVisor</b> because a container escape would be fatal.</p>
  <p><b>Use AI as a partner:</b> <code>Draw the exit path for a guest writing to a virtio-net queue and count VM exits</code>, or ask it to compare Firecracker vs gVisor vs Kata for a given threat model. <b>Where AI goes wrong:</b> it often says "containers virtualize the OS" without mentioning the shared kernel risk, or confuses type 1/2 with KVM. <b>You still own:</b> the threat model (who do you trust?), and the cost/density maths.</p>`,
  problems: [
    P('Pick the isolation: SaaS that runs customer scripts', 'Medium', ['virtualization', 'security'], ['AWS', 'Google'],
      `<p>You are building a platform where customers upload Python functions and you run them on shared hosts. Cold start must be under 300 ms. Choose between plain Docker containers, full VMs, and microVMs, and justify.</p>`,
      `Untrusted tenants, thousands of functions per host, p99 cold start ≤ 300 ms.`,
      `<p>Answer: <b>microVM</b> (Firecracker/Kata) per tenant, optionally with a warm pool. Why: separate kernel per tenant, ~125 ms boot.</p>`,
      `<p>Plain containers start fast but all tenants share one kernel, so one kernel exploit breaks every tenant. Full VMs with a general OS boot in many seconds and eat GBs of RAM.</p>`,
      { q: 'Which gives the best isolation-per-millisecond for untrusted code?', options: ['Docker container with default settings', 'Firecracker microVM', 'Type 2 hypervisor on a laptop', 'chroot'], answer: 1, explain: 'A microVM has its own guest kernel behind a hardware boundary yet boots in ~100 ms.' },
      ['<p>Hint 1: ask who you trust. Untrusted tenants means the kernel itself must not be shared.</p>', '<p>Hint 2: shrink the VM - a minimal kernel, no BIOS, virtio devices only.</p>', '<p>Hint 3: hide the cold start with a pool of pre-booted microVMs plus snapshot/restore; kill the VM after use.</p>'],
      `<p>Use one microVM per tenant (or per function sandbox) managed by Firecracker on KVM. The guest kernel is minimal, boots in about 125 ms, and the hardware virtualization boundary (VT-x + EPT) separates tenants, so a kernel exploit inside the guest does not reach other tenants. Keep a warm pool of pre-booted VMs and use snapshots (restore a memory image in ~10-30 ms) to meet the 300 ms cold-start target. Inside the microVM, still apply seccomp/cgroups to the function process, run the VMM itself with a jailer (seccomp + chroot + cgroup), and disable cross-tenant SMT. Containers alone are rejected because of the shared kernel; full VMs because of boot time and memory per tenant.</p>`,
      `<p>Cost: RAM per microVM ≈ 5-30 MB overhead; density thousands per host.</p>`,
      ['What if tenants are all your own teams?', 'How does snapshot restore work and what is risky about it (duplicate RNG state)?'])
  ]
});

// ---------------- Topic 2: namespaces ----------------
topics.push({
  title: 'Linux Namespaces: Giving a Process its Own View',
  analogy: `<p>Imagine a hotel where each guest wears special glasses. Through the glasses, guest A sees only room numbers 1-5, guest B sees a <i>different</i> set also numbered 1-5. Same building, different <b>views</b>. A namespace is a pair of glasses for one kind of resource: process IDs, network interfaces, mounts, hostname...</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A namespace wraps a global system resource so that processes inside see their <i>own private copy</i>. It hides things; it does not limit usage (that is cgroups). Each process belongs to exactly one namespace of each type.</p>
  ${H.table(['Namespace', 'Flag', 'What it isolates', 'Visible effect'], [['pid', 'CLONE_NEWPID', 'Process IDs', 'First process inside is PID 1; cannot see host processes'], ['net', 'CLONE_NEWNET', 'Network devices, IPs, routes, ports, iptables', 'Own <code>eth0</code>, own port 80'], ['mnt', 'CLONE_NEWNS', 'Mount points', 'Own root filesystem (<code>/</code>)'], ['uts', 'CLONE_NEWUTS', 'Hostname and domain', '<code>hostname</code> differs'], ['ipc', 'CLONE_NEWIPC', 'SysV IPC, POSIX message queues', 'Own shared-memory ids'], ['user', 'CLONE_NEWUSER', 'User and group ids', 'uid 0 inside = unprivileged uid outside'], ['cgroup', 'CLONE_NEWCGROUP', 'View of the cgroup tree', '<code>/proc/self/cgroup</code> looks like root']])}
  <p>You create them with three system calls: <code>clone()</code> (new process with flags), <code>unshare()</code> (move <i>myself</i> into new ones), <code>setns()</code> (join an existing one - this is how <code>docker exec</code> works). Look at <code>/proc/&lt;pid&gt;/ns/*</code> to see namespace ids.</p>
  <p><b>Key facts.</b> The PID namespace makes the first process PID 1: it must reap zombies and signals to it are special (hence <code>tini</code>/<code>--init</code>). The <b>user namespace</b> is what enables <b>rootless</b> containers: you are "root" inside but powerless outside. A <b>net</b> namespace starts with only a loopback; a <code>veth</code> pair (virtual cable) connects it to a bridge on the host.</p>`,
  clues: ['"Why does the container see itself as PID 1?" → pid namespace', '"Two containers both listen on port 80, no conflict" → net namespace per container', '"Run Docker without root" → user namespace uid mapping', '"What does docker exec do?" → <code>setns()</code> into the container namespaces', '"Isolation vs resource limits" → namespaces hide, cgroups limit', '"Share the network between two containers (sidecar, Kubernetes pod)" → join the same net namespace'],
  code: [{ lang: 'bash', check: false, title: 'Poking at namespaces by hand', code: `# New PID + mount + UTS namespaces, remap me to root, then look around
sudo unshare --fork --pid --mount-proc --uts --net /bin/bash
hostname sandbox       # changes the hostname ONLY inside
ps aux                 # just bash (PID 1) and ps
ip link                # only 'lo' (down) - a fresh net namespace
exit

# Compare namespace ids of two processes
readlink /proc/self/ns/pid /proc/1/ns/pid
# Same string = same namespace, different = isolated

# Join a running container's namespaces from the host (what docker exec does)
sudo nsenter --target 12345 --mount --uts --ipc --net --pid /bin/sh` },
  { lang: 'cpp', title: 'unshare() and clone() flags in C++ (compile-checked)', code: `#include <sched.h>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/mount.h>
#include <cstdio>
#include <cstdlib>

// Child runs in fresh PID + UTS + mount namespaces.
static int child(void *) {
    sethostname("sandbox", 7);          // only visible inside the UTS ns
    // Make mounts private so we do not leak into the host, then remount /proc
    mount(nullptr, "/", nullptr, MS_REC | MS_PRIVATE, nullptr);
    mount("proc", "/proc", "proc", 0, nullptr);
    std::printf("inside: my pid is %d (expect 1)\\n", (int)getpid());
    execlp("sh", "sh", "-c", "hostname; ps", (char *)nullptr);
    return 1;
}

int main() {
    static char stack[1024 * 1024];     // child stack (grows down on x86)
    int flags = CLONE_NEWPID | CLONE_NEWUTS | CLONE_NEWNS | SIGCHLD;
    pid_t p = clone(child, stack + sizeof(stack), flags, nullptr);
    if (p < 0) { std::perror("clone (need root or CAP_SYS_ADMIN)"); return 1; }
    waitpid(p, nullptr, 0);
    return 0;
}` }],
  codeTitle: ['unshare / nsenter from the shell', 'clone() with namespace flags'],
  viz: {
    title: 'Namespaces as isolated views: host vs container',
    input: 'pid net mnt uts user',
    inputLabel: 'Namespaces to enable, in order (pid net mnt uts ipc user cgroup)',
    gen: function (input) {
      var order = String(input).trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
      var all = ['pid', 'net', 'mnt', 'uts', 'ipc', 'user', 'cgroup'];
      if (!order.length) throw new Error('Enter some of: ' + all.join(' '));
      for (var i = 0; i < order.length; i++) if (all.indexOf(order[i]) < 0) throw new Error('Unknown namespace "' + order[i] + '". Use: ' + all.join(' '));
      var view = { pid: ['Process list (ps)', '4 ,812 processes', 'just 2 (PID 1 = app)'], net: ['Network interfaces', 'eth0, docker0, veth..', 'lo, eth0 (172.17.0.2)'], mnt: ['Root filesystem /', 'host disk /dev/sda1', 'overlay (image layers)'], uts: ['hostname', 'build-server-7', 'a1b2c3d4e5f6'], ipc: ['Shared memory ids', 'all host segments', 'empty'], user: ['uid of the process', 'uid 100000 (unprivileged)', 'uid 0 (root inside only)'], cgroup: ['/proc/self/cgroup', '/system.slice/docker-a1b2.scope', '/ (looks like root)'] };
      view.pid[1] = '4812 processes';
      var frames = [], enabled = {};
      function rows() { return all.map(function (n) { return [n, view[n][0], view[n][1], enabled[n] ? view[n][2] : view[n][1] + ' (shared)']; }); }
      function hl() { var h = {}; all.forEach(function (n, idx) { if (enabled[n]) h[idx] = 'ok'; }); return h; }
      frames.push({ narr: 'A normal process: it shares <b>every</b> namespace with the host, so it sees the same processes, network, mounts - everything.', parts: [{ type: 'table', label: 'What the process sees', columns: ['namespace', 'resource', 'host sees', 'process sees'], rows: rows(), hl: {} }] });
      order.forEach(function (n) {
        enabled[n] = true;
        var h = hl(); h[all.indexOf(n)] = 'sel';
        frames.push({ narr: 'Add the <b>' + n + '</b> namespace (<code>unshare --' + n + '</code> or a <code>CLONE_NEW*</code> flag). Now this resource is <span class="c-g">isolated</span>: the process sees its own private version. Everything not yet enabled is still shared.', parts: [{ type: 'table', label: 'After enabling ' + n, columns: ['namespace', 'resource', 'host sees', 'process sees'], rows: rows(), hl: h }] });
      });
      var cnt = Object.keys(enabled).length;
      frames.push({ narr: '<b>' + cnt + ' of 7</b> namespaces isolated. <code>docker run</code> enables pid, net, mnt, uts and ipc by default (user and cgroup are opt-in or version-dependent). Note: still <b>no resource limits</b> - for that you need cgroups.', parts: [{ type: 'table', columns: ['namespace', 'resource', 'host sees', 'process sees'], rows: rows(), hl: hl() }] });
      return frames;
    }
  },
  examples: [
    { title: '<code>docker run</code> → what actually happens (namespaces part)', html: `<ol><li>runc calls <code>clone()</code> with <code>CLONE_NEWPID|NEWNET|NEWNS|NEWUTS|NEWIPC</code> (plus NEWUSER/NEWCGROUP if configured).</li><li>A <b>veth pair</b> is created: one end in the container net namespace (<code>eth0</code>), the other on the host <code>docker0</code> bridge. iptables NAT handles <code>-p 8080:80</code>.</li><li>Inside the new mount namespace, runc does <code>pivot_root</code> into the overlay rootfs and mounts <code>/proc</code>, <code>/sys</code>, <code>/dev</code>.</li><li>Hostname is set (UTS), capabilities dropped, seccomp loaded, then <code>exec</code> of your entrypoint as PID 1.</li></ol>` },
    { title: 'Kubernetes pod = shared namespaces', html: `<p>A pod's containers share the <b>net</b> (and optionally ipc/pid) namespace held open by a tiny "pause" container, so they talk over <code>localhost</code>, but keep separate <b>mnt</b> namespaces (different images). That is namespaces used as Lego bricks.</p>` },
    { title: 'Rootless containers via the user namespace', html: `<p>Mapping file: <code>0 100000 65536</code> means "inside uid 0 → host uid 100000, a range of 65536 ids". Inside you can be root and install packages, but on the host you are just user 100000, so a breakout gets no real privileges. Limits: cannot bind ports below 1024 (sysctl <code>net.ipv4.ip_unprivileged_port_start</code>), no raw devices.</p>` }
  ],
  deepDive: `<p><b>🟣 Internals.</b> Every task has an <code>nsproxy</code> pointing to its set of namespaces; a namespace is kept alive by a reference (a process, an open fd on <code>/proc/pid/ns/x</code>, or a bind mount of it - that is how <code>ip netns add</code> persists a net namespace with no process). PID namespaces nest: a process has a different PID in each ancestor namespace, and killing PID 1 of a namespace kills the whole namespace. A <b>time namespace</b> (offsets for monotonic/boottime clocks) also exists since Linux 5.6.</p>
  <p><b>Gotchas.</b> (1) <code>/proc</code> is not namespaced by itself; you must mount a new procfs in the new pid namespace or <code>ps</code> shows host processes. (2) Namespaces do not hide <code>/sys</code> or kernel-wide things unless masked (<code>/proc/kcore</code>, <code>/sys/firmware</code> are masked by runtimes). (3) Not everything is namespaced: the kernel keyring, system time (before time ns), kernel modules, and <code>dmesg</code> are global - a container with <code>CAP_SYS_ADMIN</code> or <code>--privileged</code> can escape. (4) Memory/CPU reporting (<code>/proc/meminfo</code>, <code>nproc</code>) shows the <b>host</b> numbers inside a container unless lxcfs or cgroup-aware runtimes are used - classic source of JVM/Go sizing bugs.</p>
  <p><b>Perf:</b> creating a namespace costs microseconds; net namespace with veth+iptables dominates container start. Many containers = many conntrack entries and iptables rules (why Kubernetes moved to IPVS/eBPF).</p>`,
  aiEra: `<p><b>What AI changes:</b> agent platforms spawn thousands of short-lived sandboxes per minute; namespaces (plus seccomp, Landlock, gVisor) are the cheap first layer, with microVMs as the second. Tools like <code>bubblewrap</code> and <code>nsjail</code> wrap exactly the calls above for "run this model-written script safely".</p>
  <p><b>Use AI as a partner:</b> ask <code>Write an unshare command that gives me a throwaway PID, net and mount namespace, and explain each flag</code>, then try it on a disposable VM. <b>Where AI goes wrong:</b> it will happily suggest <code>--privileged</code> or mounting <code>/var/run/docker.sock</code> "to fix permissions", which hands out root on the host. <b>You still own:</b> knowing which resources are <i>not</i> isolated and what each capability grants.</p>`,
  problems: [
    P('Explain: two containers, same port 80, no conflict', 'Easy', ['namespaces', 'networking'], ['Amazon'],
      `<p>An interviewer asks: "Containers A and B both run nginx on port 80 on the same host. Why does it work, and how does a client reach each one?" Answer with the namespace and bridge mechanics.</p>`,
      `Single host, default bridge networking.`,
      `<p>Answer: each has its own <b>net namespace</b> and IP (172.17.0.2, .3); host publishes different ports (8081→A:80, 8082→B:80) with NAT.</p>`,
      `<p>Without net namespaces both would bind to the same host port 80 and one would fail with "address already in use".</p>`,
      { q: 'Which namespace lets both containers bind port 80?', options: ['pid', 'net', 'mnt', 'uts'], answer: 1, explain: 'Port numbers belong to a network namespace; each namespace has its own port space.' },
      ['<p>Hint 1: ports are a property of a network stack, not of the host as a whole.</p>', '<p>Hint 2: each container gets its own stack with a veth pair to a bridge.</p>', '<p>Hint 3: from outside, you must map distinct host ports to container port 80 (DNAT in iptables/nftables).</p>'],
      `<p>Each container is started in its own network namespace, which has a private network stack: its own interfaces, IP address, routing table, iptables rules and, crucially, its own set of port numbers. A veth pair connects the container's eth0 to the docker0 bridge on the host. Both nginx processes bind 0.0.0.0:80 inside their own namespace, so there is no conflict. For outside clients, <code>docker run -p 8081:80</code> adds a DNAT rule from host port 8081 to container A's IP:80, and 8082 to B. Inside the host, containers on the same bridge reach each other directly by IP.</p>`,
      `<p>Namespace creation is O(1) microseconds; NAT rules add per-packet conntrack cost.</p>`,
      ['What if we use --network host?', 'How would a Kubernetes Service change this?'])
  ]
});
// ---------------- Topic 3: cgroups v2 ----------------
topics.push({
  title: 'cgroups v2: CPU & Memory Limits, and the OOM Killer',
  analogy: `<p>Namespaces are the walls of an apartment; <b>cgroups are the electricity and water meters with a cap</b>. A family can be told "max 300 kWh a month". Use more and the lights get dimmed (CPU throttling) or, for something that cannot be dimmed like RAM, the building manager removes a tenant to save the building (the OOM killer).</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A <b>cgroup</b> (control group) is a folder-like group of processes with <b>resource budgets</b>. In <b>cgroups v2</b> there is a single tree under <code>/sys/fs/cgroup</code>; you create a directory, write limits into files, and move PIDs into <code>cgroup.procs</code>. Docker/Kubernetes do exactly this for every container.</p>
  ${H.table(['File', 'Meaning', 'Example'], [['cpu.max', 'quota period (hard CPU cap)', '<code>50000 100000</code> = 0.5 CPU'], ['cpu.weight', 'relative share when contended (1-10000, default 100)', '<code>200</code> = twice a default group'], ['memory.max', 'hard limit; exceed → reclaim, then OOM kill', '<code>536870912</code> = 512 MiB'], ['memory.high', 'soft limit; throttle + reclaim above it', '<code>400M</code>'], ['memory.current', 'usage right now (read-only)', ''], ['memory.swap.max', 'swap allowance', '<code>0</code> = no swap'], ['memory.events', 'counters: high, max, oom, oom_kill', ''], ['pids.max', 'fork-bomb guard', '<code>512</code>'], ['io.max', 'disk bandwidth / IOPS caps', '']])}
  <p><b>CPU vs memory behave differently.</b> CPU is <i>compressible</i>: over the quota, the group is <b>throttled</b> (paused until the next 100 ms period) - slow but alive. Memory is <i>incompressible</i>: when usage reaches <code>memory.max</code> the kernel first tries to reclaim page cache, then swap; if that fails, the <b>OOM killer</b> kills a process in that cgroup. Docker shows exit code <b>137</b> (128+SIGKILL 9) and <code>OOMKilled: true</code>.</p>
  <p><b>Sizing a limit</b> (a recipe): (1) measure steady-state RSS and the peak (p99) under load; (2) add headroom for page cache you want to keep, thread stacks, and native/off-heap memory; (3) set <code>request</code> ≈ typical, <code>limit</code> ≈ peak + 10-25%; (4) for managed runtimes tell the runtime about the limit (JVM <code>-XX:MaxRAMPercentage=75</code>, Go <code>GOMEMLIMIT</code>), because heap + metaspace + threads + buffers must fit <i>inside</i> the cgroup, not just the heap.</p>`,
  clues: ['"Container exits with code 137" → SIGKILL, most likely OOM killed (check <code>dmesg</code>/<code>memory.events</code>)', '"Service is slow but not crashing under load, CPU shows only 50%" → cfs quota throttling (<code>nr_throttled</code>)', '"Java app killed though heap is below -Xmx" → off-heap/metaspace/threads exceed cgroup limit', '"Noisy neighbour" / "fair share" → cpu.weight; "hard cap" → cpu.max', '"Kubernetes requests vs limits" → requests drive scheduling and cpu.weight; limits become cpu.max / memory.max', '"Pod evicted vs OOMKilled" → node pressure eviction by kubelet vs cgroup limit hit'],
  code: [{ lang: 'bash', check: false, title: 'Make a cgroup v2 by hand', code: `# Needs root and cgroup v2 (check: stat -fc %T /sys/fs/cgroup  -> cgroup2fs)
cd /sys/fs/cgroup
echo "+cpu +memory +pids" > cgroup.subtree_control   # enable controllers for children
mkdir demo && cd demo

echo "50000 100000" > cpu.max        # 50 ms of CPU per 100 ms = half a core
echo 268435456      > memory.max     # 256 MiB hard limit
echo 0              > memory.swap.max
echo 128            > pids.max

echo $$ > cgroup.procs               # move this shell into the group
# Allocate more than 256 MiB -> the OOM killer ends the hog, not the machine
python3 -c "x = bytearray(400*1024*1024); print('survived')"
cat memory.events                    # oom_kill 1 shows what happened
cat cpu.stat                         # nr_throttled / throttled_usec

# The Docker equivalents
# docker run --cpus=0.5 --memory=256m --memory-swap=256m --pids-limit=128 myimg` }],
  codeTitle: ['cgroup v2 files in action'],
  viz: {
    title: 'Memory usage vs limit: when the OOM killer fires',
    input: 'limit=256 alloc=80,70,60,50,40',
    inputLabel: 'limit in MiB, then allocations in MiB (comma separated)',
    gen: function (input) {
      var m = String(input).match(/limit\s*=\s*(\d+)\s+alloc\s*=\s*([\d,\s]+)/i);
      if (!m) throw new Error('Format: limit=256 alloc=80,70,60');
      var limit = parseInt(m[1], 10), allocs = m[2].split(',').map(function (x) { return parseInt(x, 10); }).filter(function (x) { return !isNaN(x); });
      if (!allocs.length || allocs.length > 12 || limit < 1 || limit > 100000) throw new Error('Use 1-12 allocations and a sensible limit');
      var frames = [], used = 0, high = Math.floor(limit * 0.9);
      frames.push({ narr: 'A container with <code>memory.max = ' + limit + ' MiB</code>. The bars show <b>usage</b> (left) and the <b>limit</b> (right). <code>memory.high</code> (soft) is set at ' + high + ' MiB.', parts: [{ type: 'bars', label: 'MiB', values: [0, limit], texts: ['used 0', 'limit ' + limit], idxLabels: ['usage', 'memory.max'], hl: { 1: 'win' } }] });
      for (var i = 0; i < allocs.length; i++) {
        var want = used + allocs[i];
        if (want > limit) {
          frames.push({ narr: 'Allocation of <b>' + allocs[i] + ' MiB</b> would make usage <b>' + want + ' MiB &gt; ' + limit + '</b>. Kernel reclaims page cache/swap first - nothing left to free (anonymous memory). Result: <span class="c-r">OOM kill</span> of the biggest process in the cgroup (SIGKILL, exit 137). The <i>host</i> is fine.', parts: [
            { type: 'bars', label: 'MiB', values: [want, limit], texts: ['wanted ' + want, 'limit ' + limit], idxLabels: ['usage', 'memory.max'], hl: { 0: 'bad', 1: 'win' } },
            { type: 'vars', vals: { 'memory.current': used, 'oom_kill': 1, exit_code: 137 }, hl: { oom_kill: 'bad', exit_code: 'bad' } }] });
          frames.push({ narr: 'After the kill the memory is returned: usage drops to 0. If the container has a restart policy it starts again and, if the leak is real, repeats - <b>CrashLoopBackOff</b>.', parts: [{ type: 'bars', label: 'MiB', values: [0, limit], texts: ['used 0', 'limit ' + limit], idxLabels: ['usage', 'memory.max'], hl: { 1: 'win' } }] });
          return frames;
        }
        used = want;
        var soft = used > high;
        frames.push({ narr: 'Allocate <b>' + allocs[i] + ' MiB</b> → usage <b>' + used + ' MiB</b> (' + Math.round(100 * used / limit) + '% of limit). ' + (soft ? '<span class="c-y">Above memory.high: the kernel throttles the allocator and reclaims aggressively</span> - the app gets slow before it dies.' : 'Fine, still under the soft limit.'), parts: [
          { type: 'bars', label: 'MiB', values: [used, limit], texts: ['used ' + used, 'limit ' + limit], idxLabels: ['usage', 'memory.max'], hl: { 0: soft ? 'cur' : 'ok', 1: 'win' } }] });
      }
      frames.push({ narr: 'All allocations fit: peak usage ' + used + ' MiB of ' + limit + ' MiB. Headroom = <b>' + (limit - used) + ' MiB</b>. A safe limit usually leaves 10-25% headroom above the measured peak.', parts: [{ type: 'bars', label: 'MiB', values: [used, limit], texts: ['used ' + used, 'limit ' + limit], idxLabels: ['usage', 'memory.max'], hl: { 0: 'ok', 1: 'win' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Why was my pod OOM-killed? (diagnosis checklist)', html: `<ol><li><code>kubectl describe pod</code> → <code>Last State: Terminated, Reason: OOMKilled, Exit Code: 137</code>.</li><li>Compare the limit with working-set memory: <code>container_memory_working_set_bytes</code> (this is what is checked, <b>not</b> just RSS - it includes page cache that cannot be reclaimed fast).</li><li>For a JVM: heap (-Xmx) + metaspace + code cache + thread stacks (1 MB × threads) + direct buffers. Example: -Xmx 1 GiB + 256 MiB other = needs ≥ 1.4 GiB limit.</li><li>Node-level OOM (host ran out) vs cgroup OOM: check <code>dmesg | grep -i "killed process"</code>: "Memory cgroup out of memory" = cgroup limit.</li></ol>` },
    { title: 'CPU quota arithmetic: why 2 threads of 100% become slow under a 0.5 CPU limit', html: `<p><code>cpu.max = 50000 100000</code>. Each 100 ms period the group may burn 50 ms of CPU <i>total across all threads</i>. A 4-thread app burning 4 cores uses its whole 50 ms in 12.5 ms of wall time, then is <b>frozen for 87.5 ms</b>. Latency spikes in multiples of 100 ms even though average CPU looks low. Fix: raise the limit, drop the CPU limit and keep only requests (weights), or shrink the thread count.</p>` },
    { title: 'Sizing quick maths', html: `<p>Service steady 300 MiB, p99 peak 420 MiB, 40 MiB of page cache wanted. Limit = 420 × 1.2 + 40 ≈ <b>544 → round to 576 MiB (or 640)</b>. Request = 350 MiB. If requests are far below limits on many pods the node is <i>overcommitted</i>: cheap, but a correlated spike triggers node eviction.</p>` }
  ],
  deepDive: `<p><b>🟣 Internals.</b> v2 enforces the <b>no internal processes</b> rule: a non-leaf cgroup cannot hold processes while delegating controllers to children, which keeps accounting clean (v1 had one hierarchy per controller and was a mess). Memory charges include anonymous pages, page cache, kernel memory (slab, stacks) and socket buffers, tracked per cgroup. The OOM killer picks a victim by <code>oom_score</code> (RSS-based, adjustable with <code>oom_score_adj</code>). <code>memory.oom.group = 1</code> kills the whole cgroup together (all-or-nothing, good for containers); <code>memory.min</code>/<code>memory.low</code> protect memory from reclaim. <b>PSI</b> (pressure stall information, <code>memory.pressure</code>) tells you "tasks stalled 12% of the last 10 s on memory" - the best early-warning signal; systemd-oomd and Meta's oomd act on it before the kernel OOM.</p>
  <p><b>CPU.</b> CFS bandwidth control gives a quota per period; unused quota is handed out in slices to per-CPU runqueues, which creates throttling on many-core hosts even when average load is low (kernel fixes landed in 5.4 and later, but the effect is real). <code>cpu.weight</code> is work-conserving (idle CPU can be used by anyone) while <code>cpu.max</code> is a hard ceiling. <b>cpusets</b> pin to cores/NUMA nodes for latency-critical work. Container-unaware runtimes read host core counts: Go's <code>GOMAXPROCS</code> and JVM thread pools can oversubscribe a 2-CPU quota on a 64-core node (newer runtimes read the cgroup).</p>
  <p><b>Swap and page cache.</b> Disk-heavy containers legitimately fill page cache up to the limit; that is reclaimable and is not a leak, but <code>working_set</code> metrics may still approach the limit. Tmpfs / <code>emptyDir: medium: Memory</code> counts against the container memory.</p>`,
  aiEra: `<p><b>What AI changes:</b> model servers are memory-hungry and spiky. Loading a 14 GB checkpoint with <code>mmap</code> can fill page cache against the cgroup, KV caches grow with concurrent requests, and a CPU-side tokenizer plus Python workers multiply RSS. GPU memory is <i>not</i> controlled by cgroup memory limits (separate: NVIDIA MIG, device plugins, per-process GPU quotas), so an inference pod can be OOM-killed on host RAM while the GPU is half empty. Autoscalers increasingly use PSI and queue depth instead of raw CPU.</p>
  <p><b>Use AI as a partner:</b> paste your <code>kubectl describe</code> output, <code>memory.stat</code> and a heap summary and ask for the likely contributors, then verify each claim with a real measurement. <b>Where AI goes wrong:</b> it suggests "just double the limit" or "set limit = request" without knowing p99 usage; it also forgets that CPU limits throttle but memory limits kill. <b>You still own:</b> measuring the peak, deciding a failure mode (throttle vs kill), and the cost of overcommit.</p>`,
  problems: [
    P('Why was the container OOM-killed with heap well under -Xmx?', 'Medium', ['cgroups', 'OOM', 'java'], ['Google', 'Uber'],
      `<p>A Java service in Kubernetes has <code>limits.memory: 1Gi</code> and <code>-Xmx768m</code>. Heap never exceeds 700 MiB in dashboards, yet pods are OOMKilled (exit 137) about once a day under load. List the likely causes and how to fix and size it.</p>`,
      `1 GiB cgroup limit, 200 threads, Netty direct buffers in use.`,
      `<p>Memory = heap 700 + metaspace ~100 + thread stacks 200 × 1 MiB = 200 + direct buffers ~100 + code cache ~50 = ~1150 MiB &gt; 1024 MiB limit → OOM.</p>`,
      `<p>Assuming "heap limit = process limit" ignores everything outside the heap that is charged to the same cgroup.</p>`,
      { q: 'What is the best first fix?', options: ['Raise -Xmx to 1 GiB', 'Set -XX:MaxRAMPercentage ~60-70 and raise the limit or cut threads/direct buffers', 'Remove memory limits', 'Disable swap'], answer: 1, explain: 'Leave headroom for non-heap memory; heap is only part of the footprint.' },
      ['<p>Hint 1: the cgroup counts the whole process, not the Java heap.</p>', '<p>Hint 2: add up heap + metaspace + thread stacks + direct memory + code cache.</p>', '<p>Hint 3: measure with Native Memory Tracking (<code>-XX:NativeMemoryTracking=summary</code>) and compare to <code>memory.current</code>.</p>'],
      `<p>The cgroup limit applies to the whole process memory, not just the Java heap. Footprint = heap (up to 768 MiB) + metaspace + code cache + thread stacks (about 1 MiB each, 200 threads = 200 MiB) + direct/native buffers + GC structures, which easily passes 1 GiB at peak. Diagnose with NMT and <code>memory.stat</code>/<code>memory.events</code> (oom_kill counter). Fix by sizing the heap as a percentage of the limit (<code>MaxRAMPercentage=60-70</code>), reducing thread counts and <code>-Xss</code>, capping direct memory (<code>-XX:MaxDirectMemorySize</code>), then raising the limit to measured peak + 15-25%. Add an alert on working-set / limit above 85% and on <code>memory.high</code> events or PSI.</p>`,
      `<p>No algorithmic cost; the lesson is accounting: limit ≥ heap + non-heap + headroom.</p>`,
      ['How would memory.high help here?', 'How do requests vs limits change scheduling?'])
  ]
});

// ---------------- Topic 4: overlay filesystems ----------------
topics.push({
  title: 'Union / Overlay Filesystems: Image Layers & Copy-Up',
  analogy: `<p>Think of stacked <b>transparent plastic sheets</b> on an overhead projector. The bottom sheets hold the printed lesson (read-only). You write notes on the top sheet only. Looking down through the pile you see everything merged. To "erase" a printed line you cannot touch the lower sheet, so you stick a sticky note on top that says "hidden" (a whiteout).</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A Docker image is a stack of read-only <b>layers</b> (one per Dockerfile step). Running a container adds a thin <b>writable layer</b> on top. <b>OverlayFS</b> is the Linux filesystem that merges them into one view.</p>
  ${H.table(['Overlay term', 'Meaning', 'In Docker'], [['lowerdir', 'one or more read-only directories (colon separated, topmost first)', 'image layers'], ['upperdir', 'the single writable directory', 'container layer (<code>diff</code>)'], ['workdir', 'scratch dir on the same fs as upperdir, used for atomic ops', 'internal'], ['merged', 'the union view that processes see', 'the container <code>/</code>']])}
  <pre>mount -t overlay overlay -o lowerdir=/l2:/l1,upperdir=/up,workdir=/work /merged</pre>
  <p><b>Rules.</b> <b>Read</b>: look in upper, then each lower from top down; first hit wins. <b>Write to an existing lower file</b>: the whole file is first <b>copied up</b> into upperdir, then modified there (the lower stays untouched, so other containers sharing that image are unaffected). <b>Create</b>: goes straight into upper. <b>Delete a lower file</b>: a <b>whiteout</b> (a char device 0/0 with the same name) is created in upper so the file looks gone. <b>Delete a lower directory</b>: an <b>opaque</b> directory marker.</p>
  <p><b>Why it matters:</b> (1) 100 containers from one image share one copy of the layers - tiny disk use and fast start. (2) Copy-up of a big file (a 2 GB database file touched by one byte) is slow and doubles space. (3) The writable layer is <b>ephemeral</b>: delete the container, lose the data - use <b>volumes</b> (bind mounts that bypass overlay) for databases. (4) Layers are cached by content hash, so order Dockerfile steps from least to most changing.</p>`,
  clues: ['"Why is the first write to a big file in a container slow?" → copy-up', '"Container data disappeared after restart/recreate" → writable layer is ephemeral; use a volume', '"Image size grew even though I deleted the file in a later RUN" → deleted in upper = whiteout, bytes still in lower layer', '"Many containers share the same image, how is disk saved?" → shared read-only lowerdirs', '"Heavy write workload / database in a container" → volume, not overlay (copy-up + extra latency)', '"Layer caching / rebuild is slow" → Dockerfile ordering, COPY deps before source'],
  code: [{ lang: 'bash', check: false, title: 'Build an overlay mount by hand', code: `mkdir -p /tmp/ov/{lower1,lower2,upper,work,merged}
echo "base config"   > /tmp/ov/lower1/app.conf
echo "from layer 2"   > /tmp/ov/lower2/readme.txt
echo "to be deleted"  > /tmp/ov/lower1/old.log

sudo mount -t overlay overlay \\
  -o lowerdir=/tmp/ov/lower2:/tmp/ov/lower1,upperdir=/tmp/ov/upper,workdir=/tmp/ov/work \\
  /tmp/ov/merged

cat /tmp/ov/merged/app.conf            # read falls through to lower1
echo "tuned" >> /tmp/ov/merged/app.conf  # write -> COPY-UP into upper
ls /tmp/ov/upper                        # app.conf is now here
cat /tmp/ov/lower1/app.conf             # untouched: still "base config"

rm /tmp/ov/merged/old.log               # creates a WHITEOUT in upper
ls -l /tmp/ov/upper/old.log             # c--------- 0, 0 (character device)
ls /tmp/ov/merged                       # old.log is hidden

# Docker: see the real mount for a container
docker inspect --format '{{ .GraphDriver.Data }}' mycontainer` },
  { lang: 'python', run: true, title: 'Overlay copy-up simulator (stdlib only)', code: `# Simulates lowerdir/upperdir/merged with read, write (copy-up), create, delete (whiteout).
WHITEOUT = object()

class Overlay:
    def __init__(self, lowers):
        self.lowers = lowers          # list of dicts, TOP lower first
        self.upper = {}               # writable layer
        self.log = []

    def _find_lower(self, path):
        for i, layer in enumerate(self.lowers):
            if path in layer:
                return i
        return None

    def read(self, path):
        if path in self.upper:
            v = self.upper[path]
            if v is WHITEOUT:
                self.log.append(f"read   {path}: whiteout in upper -> not found")
                return None
            self.log.append(f"read   {path}: hit in upper")
            return v
        i = self._find_lower(path)
        if i is None:
            self.log.append(f"read   {path}: not found")
            return None
        self.log.append(f"read   {path}: hit in lower[{i}]")
        return self.lowers[i][path]

    def write(self, path, data):
        if path in self.upper and self.upper[path] is not WHITEOUT:
            self.upper[path] = data
            self.log.append(f"write  {path}: already in upper, in-place")
            return
        i = self._find_lower(path)
        if i is not None and self.upper.get(path) is not WHITEOUT:
            size = len(self.lowers[i][path])
            self.log.append(f"write  {path}: COPY-UP {size} bytes from lower[{i}] -> upper, then modify")
        else:
            self.log.append(f"write  {path}: new file created directly in upper")
        self.upper[path] = data

    def delete(self, path):
        if self._find_lower(path) is not None:
            self.upper[path] = WHITEOUT
            self.log.append(f"delete {path}: lower copy remains, WHITEOUT added to upper")
        else:
            self.upper.pop(path, None)
            self.log.append(f"delete {path}: removed from upper")

    def merged(self):
        view = {}
        for layer in reversed(self.lowers):
            view.update(layer)
        for p, v in self.upper.items():
            if v is WHITEOUT:
                view.pop(p, None)
            else:
                view[p] = v
        return view

base = {"/etc/app.conf": "port=80;" * 4, "/bin/app": "X" * 50, "/var/log/old.log": "old" * 10}
extra = {"/etc/readme": "hello"}
ov = Overlay([extra, base])           # extra is the higher lower layer

ov.read("/etc/app.conf")
ov.write("/etc/app.conf", "port=8080;")      # copy-up!
ov.write("/etc/app.conf", "port=9090;")      # second write: no copy-up
ov.write("/data/new.txt", "fresh")
ov.delete("/var/log/old.log")                # whiteout
ov.read("/var/log/old.log")
ov.read("/bin/app")

for line in ov.log:
    print(line)
print("upper :", {k: ("<WHITEOUT>" if v is WHITEOUT else v) for k, v in ov.upper.items()})
print("merged:", sorted(ov.merged()))
print("lower base untouched:", base["/etc/app.conf"][:16], "...")` }],
  codeTitle: ['Overlay mount by hand', 'Copy-up simulator (runnable)'],
  viz: {
    title: 'Overlay layers: lower / upper / merged, with copy-up highlighted',
    input: 'read app.conf; write app.conf; delete old.log; create new.txt',
    inputLabel: 'Operations separated by ; (read|write|delete|create <file>) - files: app.conf bin.sh old.log',
    gen: function (input) {
      var ops = String(input).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!ops.length || ops.length > 10) throw new Error('Use 1-10 operations like: write app.conf; delete old.log');
      var lower = ['app.conf', 'bin.sh', 'old.log'], upper = [], white = [];
      var frames = [];
      function merged() { var v = lower.filter(function (f) { return white.indexOf(f) < 0; }); upper.forEach(function (f) { if (v.indexOf(f) < 0) v.push(f); }); return v; }
      function parts(hlU, hlM, hlL) {
        var uItems = upper.concat(white.map(function (w) { return w + ' (whiteout)'; }));
        return [{ type: 'stack', label: 'merged (what the container sees)', items: merged(), hl: hlM || {} },
          { type: 'stack', label: 'upperdir (writable)', items: uItems.length ? uItems : ['(empty)'], hl: hlU || {} },
          { type: 'stack', label: 'lowerdir (read-only image layer)', items: lower, hl: hlL || {} }];
      }
      frames.push({ narr: 'Start: the image layer (lowerdir) holds 3 files. The writable upperdir is empty. The merged view = lower + upper.', parts: parts() });
      ops.forEach(function (op) {
        var w = op.split(/\s+/), cmd = (w[0] || '').toLowerCase(), f = w[1];
        if (!f) throw new Error('Each operation needs a file name, e.g. write app.conf');
        var li = lower.indexOf(f), ui = upper.indexOf(f), mi = merged().indexOf(f);
        if (cmd === 'read') {
          if (mi < 0) frames.push({ narr: 'read <b>' + H.esc(f) + '</b>: not in upper, not in lower (or whiteout) → <span class="c-r">ENOENT</span>.', parts: parts() });
          else { var hu = {}, hm = {}, hll = {}; if (ui >= 0) hu[ui] = 'cur'; else hll[li] = 'cur'; hm[mi] = 'cur'; frames.push({ narr: 'read <b>' + H.esc(f) + '</b>: search upper first, then lower. Found in <b>' + (ui >= 0 ? 'upper' : 'lower') + '</b>. No copy needed - reads never copy.', parts: parts(hu, hm, hll) }); }
        } else if (cmd === 'write') {
          if (ui >= 0) { var h2 = {}; h2[ui] = 'cur'; frames.push({ narr: 'write <b>' + H.esc(f) + '</b>: already in upper → modified in place, fast.', parts: parts(h2, {}, {}) }); }
          else if (li >= 0) {
            var wi = white.indexOf(f); if (wi >= 0) white.splice(wi, 1);
            frames.push({ narr: 'write <b>' + H.esc(f) + '</b>: it lives only in the read-only lower layer, so the kernel must <span class="c-y">COPY-UP</span> the <i>whole file</i> into upperdir first.', parts: parts({}, {}, (function () { var o = {}; o[li] = 'cur'; return o; })()) });
            upper.push(f);
            var hu2 = {}; hu2[upper.length - 1] = 'sel';
            frames.push({ narr: 'Copy-up done: <b>' + H.esc(f) + '</b> is now in upperdir (highlighted) and the change is applied there. The lower copy is untouched, so other containers on this image are unaffected.', parts: parts(hu2, {}, {}) });
          } else { upper.push(f); var h3 = {}; h3[upper.length - 1] = 'ok'; frames.push({ narr: 'write <b>' + H.esc(f) + '</b>: a new file → created straight in upper (no copy-up).', parts: parts(h3, {}, {}) }); }
        } else if (cmd === 'create') {
          if (merged().indexOf(f) >= 0) throw new Error(f + ' already exists; use write');
          upper.push(f); var h4 = {}; h4[upper.length - 1] = 'ok'; frames.push({ narr: 'create <b>' + H.esc(f) + '</b>: new file lands directly in upperdir.', parts: parts(h4, {}, {}) });
        } else if (cmd === 'delete') {
          if (mi < 0) throw new Error(f + ' does not exist');
          if (ui >= 0) upper.splice(ui, 1);
          if (li >= 0) { white.push(f); frames.push({ narr: 'delete <b>' + H.esc(f) + '</b>: the file exists in a read-only layer, so it cannot be removed. A <span class="c-r">whiteout</span> entry is written to upper to hide it. <b>The bytes still occupy the image layer</b> - image size does not shrink!', parts: parts((function () { var o = {}; o[upper.length + white.length - 1] = 'bad'; return o; })(), {}, (function () { var o = {}; o[li] = 'bad'; return o; })()) }); }
          else frames.push({ narr: 'delete <b>' + H.esc(f) + '</b>: existed only in upper → simply removed.', parts: parts() });
        } else throw new Error('Unknown operation "' + cmd + '". Use read, write, create or delete.');
      });
      frames.push({ narr: 'Final merged view has <b>' + merged().length + '</b> files. Remember: the writable layer vanishes with the container; keep durable data in a volume.', parts: parts() });
      return frames;
    }
  },
  examples: [
    { title: 'Dockerfile layer trap', html: `<pre>RUN wget big.tar.gz &amp;&amp; tar xf big.tar.gz   # layer A: +500 MB
RUN rm big.tar.gz                          # layer B: whiteout only, still 500 MB total!</pre><p>Fix: do both in <b>one</b> <code>RUN</code> (or use a multi-stage build and <code>COPY --from</code> only the result). Order also matters: <code>COPY package.json</code> + install deps <i>before</i> <code>COPY . .</code> so the dependency layer stays cached when source changes.</p>` },
    { title: 'Copy-up cost of a database file', html: `<p>A 4 GB SQLite file inside the image, touched by one write: overlay copies all 4 GB into upperdir first (seconds of I/O, +4 GB disk). Newer kernels reduce cost with metadata-only copy-up, but data copy-up is still whole-file. Move write-heavy data to a volume.</p>` },
    { title: 'Density math', html: `<p>Image 400 MB, 200 containers each writing 5 MB: disk ≈ 400 + 200 × 5 = <b>1.4 GB</b>, not 80 GB. Page cache is shared too, because all containers read the same underlying lower files.</p>` }
  ],
  deepDive: `<p><b>🟣 Internals.</b> Containerd's <b>snapshotter</b> abstraction (overlayfs is the default; also btrfs, zfs, devmapper, stargz/lazy-pull) turns image layers into mounts. Layers are content-addressed tarballs (sha256 digests) described by a manifest, so identical layers across images are stored once. Overlay names: <code>overlay2</code> in Docker. Limits: ~128 lower layers; kernel option <code>index=</code>, <code>redirect_dir</code>, <code>metacopy</code> and <code>xino</code> for hardlink and inode-number consistency. Renaming a directory that exists in a lower layer returns EXDEV unless redirect_dir is on (tools fall back to copy).</p>
  <p><b>Performance reality.</b> First open + write of a lower file: copy-up latency. Lookups walk each layer (many layers = slower lookups, mitigated by dentry cache). <code>fsync</code> semantics go to the upper filesystem (ext4/xfs), so durability is that of the backing fs. Page cache sharing between containers works for lower files. With <code>userns</code>, idmapped mounts avoid recursive chown. <b>Lazy image pulling</b> (estargz, SOCI, Nydus) starts containers before the full image downloads - a big win for multi-GB ML images.</p>
  <p><b>Whiteouts in image format:</b> OCI layer tarballs encode deletes as files named <code>.wh.&lt;name&gt;</code> and opaque dirs as <code>.wh..wh..opq</code>; the snapshotter translates these into overlay's 0/0 char devices.</p>`,
  aiEra: `<p><b>What AI changes:</b> ML images are huge (CUDA + PyTorch = 5-15 GB). Layer design and lazy pulling decide whether a GPU node starts serving in 20 seconds or 5 minutes, and model weights should live in a volume or object-store mount, <b>not</b> baked into overlay layers that get copied or re-pulled. Notebook and agent sandboxes use overlay snapshots as cheap "undo": clone a base image, let the agent write, discard the upper layer.</p>
  <p><b>Use AI as a partner:</b> have it rewrite a Dockerfile for better layer caching and a multi-stage build, then compare sizes with <code>docker history</code>. <b>Where AI goes wrong:</b> it often puts <code>rm</code> in a separate layer and claims the image shrank, or bakes secrets into an early <code>ENV</code>/<code>COPY</code> layer where they stay forever in lower layers. <b>You still own:</b> verifying the final size and scanning layers for secrets.</p>`,
  problems: [
    P('Predict the disk usage after writes and deletes', 'Easy', ['overlayfs', 'docker'], ['Docker'],
      `<p>Image layers total 300 MB. A container (a) appends 1 KB to a 100 MB file that is in the image, (b) deletes a different 50 MB image file, (c) creates a 10 MB new file. How much disk does the container's writable layer use, and how much does the image take?</p>`,
      `overlay2, whole-file copy-up.`,
      `<p>Writable layer: 100 MB (copy-up of the whole file) + ~0 (whiteout) + 10 MB = <b>about 110 MB</b>. Image stays 300 MB.</p>`,
      `<p>Thinking "append of 1 KB costs 1 KB" forgets that copy-up copies the entire file; thinking "delete frees 50 MB" forgets the lower layer is read-only.</p>`,
      { q: 'What does deleting an image file do to disk usage?', options: ['Frees the space', 'Adds a tiny whiteout; space is not freed', 'Copies the file up', 'Corrupts the layer'], answer: 1, explain: 'Lower layers are read-only; a whiteout in upper just hides the file.' },
      ['<p>Hint 1: lower layers never change, they are read-only.</p>', '<p>Hint 2: first write to a lower file copies the entire file up.</p>', '<p>Hint 3: deletes become whiteouts (about 0 bytes), creates go straight to upper.</p>'],
      `<p>Walk each operation against the three overlay rules. (a) Appending to an existing lower file triggers a full copy-up: the entire 100 MB file is copied into upperdir, then 1 KB is appended, so the writable layer grows by about 100 MB. (b) Deleting a lower file creates a whiteout entry (a 0-byte character device) in upper, so the writable layer grows by almost nothing and the 50 MB remains in the image layer, which is read-only and shared. (c) A brand new file is written directly into upper: +10 MB. Total writable layer ≈ 110 MB; the image is unchanged at 300 MB and still shared with other containers. Lesson: move large mutable files to volumes and avoid deleting in later layers.</p>`,
      `<p>Copy-up is O(file size) once per file; whiteouts are O(1).</p>`,
      ['What if metacopy=on?', 'How does a second container on the same image differ?'])
  ]
});
// ---------------- Topic 5: select / poll / epoll ----------------
topics.push({
  title: 'select vs poll vs epoll: Level vs Edge Triggering',
  analogy: `<p>You run a restaurant with 10,000 tables. <b>select/poll</b>: every few seconds a waiter walks past <i>all</i> tables asking "need anything?" - cost grows with the number of tables, even if only 2 are waving. <b>epoll</b>: each table has a bell wired to a board at the front desk; the waiter only reads the board's list of tables that rang - cost grows with the number of <i>ringing</i> tables.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A network server must wait on thousands of sockets without one thread per socket (the "C10K" problem). Instead, one thread asks the kernel "which of these file descriptors are <b>ready</b> (readable/writable)?" and then handles only those.</p>
  ${H.table(['', 'select', 'poll', 'epoll'], [['Interface', 'bitmask <code>fd_set</code>', 'array of <code>pollfd</code>', 'kernel object; <code>epoll_ctl</code> add/mod/del'], ['Max fds', '1024 (FD_SETSIZE)', 'no fixed limit', 'no fixed limit'], ['Per call, you pass', 'whole set (copied in/out)', 'whole array (copied)', 'nothing - set lives in kernel'], ['Kernel work per call', 'O(n) scan', 'O(n) scan', 'O(ready) - kernel keeps a ready list'], ['Userspace work', 'rescan n bits', 'rescan n entries', 'loop only over returned events'], ['Portability', 'POSIX everywhere', 'POSIX', 'Linux only (BSD: kqueue, Windows: IOCP)']])}
  <p><b>Level-triggered (LT, default)</b>: epoll reports an fd <i>as long as</i> it is still ready (data remains unread). Forgiving: if you read only part, you are told again. <b>Edge-triggered (ET, <code>EPOLLET</code>)</b>: you are told only when the state <i>changes</i> (new data arrived). Fewer wake-ups, but you <b>must drain</b>: read/accept in a loop <b>until <code>EAGAIN</code></b> and use <b>non-blocking</b> sockets, otherwise leftover bytes sit there and you are never notified again - a classic hang.</p>
  <p><b>Which to choose?</b> LT is safer and fine for most code (default in libuv/Java NIO-style loops, nginx uses ET). ET shines when you want minimal syscalls and can guarantee draining. Use <code>EPOLLONESHOT</code>/<code>EPOLLEXCLUSIVE</code> for multi-threaded loops to stop several threads waking for the same fd.</p>`,
  clues: ['"10K / 100K concurrent connections on one machine" → epoll (event loop), not thread-per-connection', '"select is O(n)" / "fd limit 1024" → poll/epoll', '"Edge-triggered … must read until EAGAIN" → non-blocking + drain loop', '"Why does my ET server hang after the first message?" → read once instead of draining', '"Thundering herd on accept()" → EPOLLEXCLUSIVE or SO_REUSEPORT', '"Does epoll work on regular files?" → no (always ready); use thread pool or io_uring'],
  code: [{ lang: 'cpp', title: 'epoll echo-server skeleton (edge-triggered, drain until EAGAIN)', code: `#include <sys/epoll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>
#include <cstring>
#include <cstdio>

// Put an fd in non-blocking mode: mandatory with edge-triggered epoll.
static int set_nonblock(int fd) {
    int fl = fcntl(fd, F_GETFL, 0);
    return fcntl(fd, F_SETFL, fl | O_NONBLOCK);
}

static void add_fd(int ep, int fd, uint32_t events) {
    epoll_event ev{};
    ev.events = events;
    ev.data.fd = fd;
    epoll_ctl(ep, EPOLL_CTL_ADD, fd, &ev);
}

int main() {
    int lfd = socket(AF_INET, SOCK_STREAM, 0);
    int one = 1;
    setsockopt(lfd, SOL_SOCKET, SO_REUSEADDR, &one, sizeof one);
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr.sin_port = htons(9000);
    if (bind(lfd, (sockaddr *)&addr, sizeof addr) < 0) { perror("bind"); return 1; }
    listen(lfd, 1024);
    set_nonblock(lfd);

    int ep = epoll_create1(0);
    add_fd(ep, lfd, EPOLLIN | EPOLLET);       // edge-triggered listener

    epoll_event events[128];
    char buf[4096];
    for (;;) {
        int n = epoll_wait(ep, events, 128, -1);   // sleeps; wakes with only READY fds
        if (n < 0) { if (errno == EINTR) continue; perror("epoll_wait"); break; }
        for (int i = 0; i < n; i++) {
            int fd = events[i].data.fd;
            if (fd == lfd) {
                // ET rule: accept until EAGAIN, or pending connections are never reported again.
                for (;;) {
                    int cfd = accept(lfd, nullptr, nullptr);
                    if (cfd < 0) {
                        if (errno == EAGAIN || errno == EWOULDBLOCK) break;   // drained
                        perror("accept"); break;
                    }
                    set_nonblock(cfd);
                    add_fd(ep, cfd, EPOLLIN | EPOLLET | EPOLLRDHUP);
                }
            } else {
                bool closed = (events[i].events & (EPOLLRDHUP | EPOLLHUP | EPOLLERR)) != 0;
                // ET rule: read until EAGAIN so no bytes are left behind.
                for (;;) {
                    ssize_t r = read(fd, buf, sizeof buf);
                    if (r > 0) {
                        // Echo back. A real server queues unsent bytes and waits for EPOLLOUT.
                        ssize_t off = 0;
                        while (off < r) {
                            ssize_t w = write(fd, buf + off, r - off);
                            if (w < 0) { if (errno == EAGAIN) break; closed = true; break; }
                            off += w;
                        }
                    } else if (r == 0) { closed = true; break; }              // peer closed
                    else { if (errno != EAGAIN && errno != EWOULDBLOCK) closed = true; break; }
                }
                if (closed) { epoll_ctl(ep, EPOLL_CTL_DEL, fd, nullptr); close(fd); }
            }
        }
    }
    close(ep); close(lfd);
    return 0;
}` },
  { lang: 'python', run: true, title: 'select-scan vs epoll-ready-list cost simulation', code: `# Count the "work units" each approach does per wake-up as connections grow.
import random

def select_cost(n_fds, ready):
    # select/poll: copy the set to the kernel (n), kernel checks every fd (n),
    # user rescans the result (n) to find ready ones.
    return n_fds * 3

def epoll_cost(n_fds, ready):
    # epoll: set lives in the kernel; wait returns only ready events,
    # user loops over 'ready' items only.
    return ready * 2

random.seed(7)
print(f"{'fds':>8} {'ready':>6} {'select/poll':>12} {'epoll':>8} {'speedup':>8}")
for n in (100, 1_000, 10_000, 100_000, 1_000_000):
    ready = max(1, int(n * 0.002))          # ~0.2% active at any moment (typical: most are idle)
    s, e = select_cost(n, ready), epoll_cost(n, ready)
    print(f"{n:>8} {ready:>6} {s:>12} {e:>8} {s / e:>7.0f}x")

# Level vs edge: simulate a socket with 10 bytes pending and a handler that reads 4 bytes.
def run(mode, handler_drains):
    pending, notifications, rounds = 10, 0, 0
    notified_for_new_data = True          # data just arrived: one edge
    while pending > 0 and rounds < 10:
        rounds += 1
        report = (mode == "LT" and pending > 0) or (mode == "ET" and notified_for_new_data)
        if not report:
            break                           # nobody wakes us: bytes stuck forever (the ET bug)
        notifications += 1
        notified_for_new_data = False
        pending -= pending if handler_drains else min(4, pending)
    return pending, notifications

for mode in ("LT", "ET"):
    for drains in (False, True):
        left, notes = run(mode, drains)
        status = "OK" if left == 0 else f"STUCK with {left} bytes"
        print(f"{mode} handler {'drains to EAGAIN' if drains else 'reads 4 bytes once'}: wakeups={notes} -> {status}")` }],
  codeTitle: ['epoll echo server (edge-triggered)', 'Readiness cost + LT/ET simulation'],
  viz: {
    title: 'select scans every fd; epoll hands you only the ready ones',
    input: 'n=12 ready=3,8',
    inputLabel: 'n fds (≤ 16) and which are ready (comma separated, 0-based)',
    gen: function (input) {
      var m = String(input).match(/n\s*=\s*(\d+)\s+ready\s*=\s*([\d,\s]*)/i);
      if (!m) throw new Error('Format: n=12 ready=3,8');
      var n = parseInt(m[1], 10), ready = m[2].split(',').map(function (x) { return parseInt(x, 10); }).filter(function (x) { return !isNaN(x) && x >= 0 && x < n; });
      if (n < 2 || n > 16) throw new Error('n must be between 2 and 16');
      ready = ready.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      var vals = [], i;
      for (i = 0; i < n; i++) vals.push(ready.indexOf(i) >= 0 ? 'R' : '.');
      var frames = [], checks = 0, found = [];
      frames.push({ narr: n + ' connections; <b>' + ready.length + '</b> have data (R). Idle ones are "."', parts: [{ type: 'array', label: 'fd states', values: vals, showIdx: true, hl: (function () { var h = {}; ready.forEach(function (r) { h[r] = 'ok'; }); return h; })() }] });
      for (i = 0; i < n; i++) {
        checks++;
        var isR = ready.indexOf(i) >= 0; if (isR) found.push(i);
        var p = {}; p[i] = 'scan';
        var h2 = {}; h2[i] = isR ? 'ok' : 'cur'; found.forEach(function (f) { h2[f] = 'ok'; });
        frames.push({ narr: '<b>select()</b>: kernel (and then your code) checks fd ' + i + ' → ' + (isR ? '<span class="c-g">ready</span>' : 'not ready') + '. Checks so far: <b>' + checks + '</b>. Every fd is visited, ready or not.', parts: [{ type: 'array', label: 'select scan (O(n))', values: vals, ptr: p, showIdx: true, hl: h2 }, { type: 'vars', vals: { 'fds checked': checks, 'ready found': found.length }, hl: { 'fds checked': 'cur' } }] });
      }
      frames.push({ narr: 'select finished: <b>' + checks + '</b> checks to find <b>' + ready.length + '</b> ready fds. With 100,000 idle connections this is 100,000 checks every wake-up.', parts: [{ type: 'vars', vals: { 'select checks': checks, 'ready found': ready.length }, hl: { 'select checks': 'bad' } }] });
      var q = [];
      frames.push({ narr: '<b>epoll</b>: fds were registered once with <code>epoll_ctl</code>. When data arrives, the kernel callback appends the fd to the <b>ready list</b>. Nothing scans idle fds.', parts: [{ type: 'array', label: 'registered fds (idle ones cost nothing)', values: vals, showIdx: true }, { type: 'queue', label: 'epoll ready list', items: ['(empty)'], frontLabel: 'oldest', backLabel: 'newest' }] });
      ready.forEach(function (r, k) {
        q.push('fd ' + r);
        var h3 = {}; h3[r] = 'ok';
        frames.push({ narr: 'Packet arrives on fd ' + r + ' → the kernel adds it to the ready list (O(1)).', parts: [{ type: 'array', label: 'registered fds', values: vals, showIdx: true, hl: h3 }, { type: 'queue', label: 'epoll ready list', items: q.slice(), frontLabel: 'oldest', backLabel: 'newest', hl: (function () { var o = {}; o[k] = 'ok'; return o; })() }] });
      });
      frames.push({ narr: '<b>epoll_wait()</b> returns just these <b>' + ready.length + '</b> events. Work = O(ready) = ' + ready.length + ' vs select\'s ' + checks + '. The gap widens as idle connections grow.', parts: [{ type: 'queue', label: 'returned events', items: q.length ? q.slice() : ['(none)'], frontLabel: 'first', backLabel: 'last' }, { type: 'vars', vals: { 'select checks': checks, 'epoll events': ready.length }, hl: { 'epoll events': 'ok', 'select checks': 'bad' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'The ET hang, step by step', html: `<ol><li>Client sends 10 bytes. Edge: epoll reports the fd readable once.</li><li>Handler calls <code>read(fd, buf, 4)</code> and returns. 6 bytes remain.</li><li>No new data arrives, so no new edge. <code>epoll_wait</code> never reports the fd again → the 6 bytes (and the connection) are stuck.</li></ol><p>Fix: <code>while ((r = read(...)) &gt; 0) {...}</code> until <code>-1</code> with <code>errno == EAGAIN</code>. Same for <code>accept()</code> on the listener and for <code>write()</code> until the send buffer is full.</p>` },
    { title: 'Choosing LT vs ET', html: `${H.table(['Situation', 'Pick'], [['Simple server, many developers, partial reads (parsers, TLS libs)', 'LT'], ['Hot path, tuned buffers, you control a drain loop', 'ET'], ['Multi-threaded loop, one fd per event, avoid double wake-up', 'ET + EPOLLONESHOT or LT + EPOLLEXCLUSIVE'], ['Throttling a slow client (apply back-pressure)', 'LT: just stop reading; with ET remove EPOLLIN or buffer']])}` },
    { title: 'Why select cannot go beyond 1024 and why O(n) hurts', html: `<p>An <code>fd_set</code> is a fixed 1024-bit mask. With 50,000 connections, 49,990 idle, each call copies a big set, the kernel polls every fd's driver, and user code scans bits again: cost ∝ <i>total</i> connections. At 10 wake-ups per ms this burns a full core just on idle sockets. epoll stores interest in a red-black tree in the kernel and keeps a ready list: cost ∝ <i>active</i> connections.</p>` }
  ],
  deepDive: `<p><b>🟣 Internals.</b> <code>epoll_create1</code> makes an <code>eventpoll</code> object: a red-black tree of registered <code>epitem</code>s (keyed by fd+file) plus a linked ready list. <code>epoll_ctl(ADD)</code> hooks a wait-queue callback onto the file; when the device (e.g. the TCP stack on packet arrival) wakes that queue, the callback links the epitem into the ready list and wakes <code>epoll_wait</code>. Hence O(1) per event, O(log n) per add/remove. There is also a subtle point: epoll is keyed by (fd, open file description), so <code>dup()</code>-ed fds and closing an fd without <code>EPOLL_CTL_DEL</code> can leave ghost registrations (the entry lives until all duplicates close) - a source of weird events.</p>
  <p><b>Reality check.</b> epoll tells you readiness, not completion: you still do a <code>read()</code> syscall per ready fd, so very high-rate servers pay one syscall per I/O. That is the gap io_uring fills. At 1M idle connections the real cost is memory (socket buffers, ~few KB each) and timers, not epoll. Also: epoll does not work for regular files/directories (always "ready"), so disk I/O needs threads (libuv does this) or io_uring. Edge cases: <code>EPOLLRDHUP</code> detects half-close; <code>EPOLLHUP</code>/<code>EPOLLERR</code> are always reported; with ET and <code>EPOLLOUT</code> you get an edge when the send buffer goes from full to non-full. Busy-polling (<code>SO_BUSY_POLL</code>, <code>epoll busy poll</code>), SO_REUSEPORT per-core loops and thread-per-core designs (Seastar, nginx workers) are the production patterns.</p>
  <p><b>Cross-platform names:</b> BSD/macOS <code>kqueue</code>, Windows IOCP (completion-based, like io_uring), Solaris event ports; libuv/libevent/Netty/Tokio hide them.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM gateways and inference servers hold <i>many long-lived streaming connections</i> (Server-Sent Events / WebSockets / gRPC streams) that are mostly idle between tokens - the ideal epoll workload, which is why Python <code>asyncio</code> (selectors/epoll), Rust Tokio and Node/libuv power them. Token streaming is thousands of tiny writes per second, so write batching and back-pressure (stop reading when a slow client cannot keep up) matter more than raw accept speed.</p>
  <p><b>Use AI as a partner:</b> ask <code>Review my edge-triggered epoll loop for missing EAGAIN drains, partial writes and fd leaks</code>; it is good at spotting those. <b>Where AI goes wrong:</b> generated servers often use ET with blocking sockets, ignore partial <code>write()</code>, or forget <code>EPOLL_CTL_DEL</code>/<code>close</code> ordering. <b>You still own:</b> the state machine per connection, back-pressure policy and load testing (e.g. with <code>wrk</code>, <code>ss -s</code>, <code>perf</code>).</p>`,
  problems: [
    P('Server hangs after the first request - find the bug', 'Medium', ['epoll', 'edge-triggered', 'debugging'], ['Cloudflare', 'Meta'],
      `<p>Your epoll server uses <code>EPOLLIN | EPOLLET</code>. In the handler you call <code>read(fd, buf, 1024)</code> once and echo the result. Small messages work, but a client that sends 5 KB makes the connection stall. Explain why and fix it. Also say what changes if you use level-triggered mode.</p>`,
      `Non-blocking sockets, single thread, requests can be larger than the buffer.`,
      `<p>5 KB arrives (one edge). Handler reads 1 KB, 4 KB remain unread. No new edge → never woken again.</p>`,
      `<p>A single read per notification works only when every message fits in the buffer; any larger message hangs under ET.</p>`,
      { q: 'What is the correct ET read pattern?', options: ['One read per event', 'Read in a loop until EAGAIN (or 0 for EOF)', 'Use blocking sockets', 'Sleep then read again'], answer: 1, explain: 'Edge-triggered reports only state changes; you must drain the buffer completely.' },
      ['<p>Hint 1: how many times will epoll tell you about the same unread data in ET mode?</p>', '<p>Hint 2: drain in a loop; socket must be non-blocking so the last read returns EAGAIN instead of blocking.</p>', '<p>Hint 3: treat read()==0 as peer closed, and handle partial write() by buffering and arming EPOLLOUT.</p>'],
      `<p>With edge-triggered epoll, the kernel notifies you only when the readiness state changes (for example new data arrives on an empty buffer). Reading just 1 KB of a 5 KB message leaves 4 KB sitting in the socket buffer, but no new edge occurs, so epoll_wait never returns this fd again and the connection appears frozen. The fix is to loop: call read until it returns -1 with errno EAGAIN (buffer empty), or 0 (EOF, close the connection). The socket must be non-blocking, or the final read would block the whole event loop. Handle partial writes similarly: write in a loop, and when you get EAGAIN, store the remainder and register EPOLLOUT. In level-triggered mode the same single read would still work correctly, because epoll keeps reporting the fd while any data remains; it would just take 5 wake-ups for 5 KB. That is why LT is more forgiving and ET is faster but needs discipline.</p>`,
      `<p>Per event O(bytes/buf) syscalls; epoll_wait O(ready).</p>`,
      ['How do you stop one chatty client starving the others in an ET loop?', 'What is EPOLLONESHOT for?'])
  ]
});

// ---------------- Topic 6: io_uring ----------------
topics.push({
  title: 'io_uring: Shared Rings, Batching & Fewer Syscalls',
  analogy: `<p>The old way: you walk to the post office counter for every single parcel. <b>io_uring</b>: you drop a pile of parcels into an <b>outbox tray</b> (submission ring) that both you and the clerk can see, ring the bell <i>once</i>, and later pick finished receipts from an <b>inbox tray</b> (completion ring). Sometimes the clerk watches the tray all day (SQPOLL) and you never need to ring at all.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> <code>io_uring</code> (Linux 5.1+) is an asynchronous I/O interface built on <b>two ring buffers shared between your program and the kernel</b> (memory-mapped, no copying):</p>
  <ul><li><b>SQ - submission queue</b>: you write <b>SQEs</b> (submission queue entries: "read 4 KB from fd 7 into this buffer") and advance the <b>tail</b>. The kernel consumes from the <b>head</b>.</li>
  <li><b>CQ - completion queue</b>: the kernel writes <b>CQEs</b> (result code + your <code>user_data</code> tag) at its tail; you consume from the CQ head.</li></ul>
  <p>One <code>io_uring_enter()</code> syscall can <b>submit many</b> operations and <b>wait for many</b> completions. With <b>SQPOLL</b> a kernel thread polls the SQ, so submitting needs <i>zero</i> syscalls.</p>
  ${H.table(['Model', 'Tells you…', 'Syscalls for 100 reads', 'Works for files?'], [['blocking read()', 'nothing; thread sleeps', '100', 'yes (blocks)'], ['epoll + read()', 'fd is READY', '100 reads + epoll_waits', 'no (files always ready)'], ['io_uring', 'operation COMPLETED', '1 (or 0 with SQPOLL)', 'yes, truly async']])}
  <p><b>Power features:</b> registered buffers/files (skip per-op mapping and refcount cost), linked SQEs (op B runs after A), multishot accept/recv, fixed-size buffer rings, zero-copy send (<code>SEND_ZC</code>). It covers network <i>and</i> disk (O_DIRECT NVMe) with one API.</p>
  <p><b>When it helps:</b> very high IOPS (NVMe databases, storage engines), many small ops where syscall overhead (~100-200 ns plus mitigations on older CPUs) dominates, mixing disk and network in one loop. <b>When it does not:</b> low-rate servers (epoll is fine), code that is bound by the network or the application logic, or sandboxes where io_uring is disabled for security.</p>`,
  clues: ['"Reduce syscall overhead / context switches for millions of IOPS" → io_uring (batching, SQPOLL)', '"Truly asynchronous file I/O on Linux" → io_uring (epoll cannot do files; POSIX AIO is weak)', '"Readiness vs completion model" → epoll = readiness, io_uring/IOCP = completion', '"Shared memory ring buffers between user and kernel" → SQ/CQ', '"Container blocks io_uring" → seccomp default profile / sysctl <code>io_uring_disabled</code> for security', '"Thread-per-core storage engine" → io_uring (Seastar, RocksDB experiments, TigerBeetle)'],
  code: [{ lang: 'cpp', check: false, title: 'io_uring (liburing) - read a file with one submit', code: `// Build: g++ -std=c++20 read_uring.cpp -luring   (needs liburing + Linux >= 5.6)
#include <liburing.h>
#include <fcntl.h>
#include <cstdio>
#include <cstring>
#include <vector>

int main(int argc, char **argv) {
    if (argc < 2) { std::puts("usage: read_uring <file>"); return 1; }
    io_uring ring;
    if (io_uring_queue_init(8, &ring, 0) < 0) { std::puts("queue_init failed"); return 1; }  // SQ=8 entries

    int fd = open(argv[1], O_RDONLY);
    std::vector<char> buf(4096);

    // 1) Fill a submission entry (nothing enters the kernel yet).
    io_uring_sqe *sqe = io_uring_get_sqe(&ring);
    io_uring_prep_read(sqe, fd, buf.data(), buf.size(), 0);
    io_uring_sqe_set_data64(sqe, 42);          // our tag, returned in the completion

    // 2) ONE syscall submits everything queued so far (could be hundreds of SQEs).
    io_uring_submit(&ring);

    // 3) Reap the completion from the CQ ring.
    io_uring_cqe *cqe;
    io_uring_wait_cqe(&ring, &cqe);
    std::printf("tag=%llu bytes=%d\\n", (unsigned long long)cqe->user_data, cqe->res);
    io_uring_cqe_seen(&ring, cqe);             // advance CQ head: slot is free again

    io_uring_queue_exit(&ring);
    return 0;
}` }],
  codeTitle: ['liburing: submit and reap (not compile-checked: liburing is an external library)'],
  viz: {
    title: 'io_uring rings: SQ head/tail and CQ head/tail',
    input: '4',
    inputLabel: 'Number of operations to submit in a batch (1-6)',
    gen: function (input) {
      var k = parseInt(String(input).trim(), 10);
      if (isNaN(k) || k < 1 || k > 6) throw new Error('Enter a number from 1 to 6');
      var SZ = 8, sq = [], cq = [], i;
      for (i = 0; i < SZ; i++) { sq.push('-'); cq.push('-'); }
      var sqHead = 0, sqTail = 0, cqHead = 0, cqTail = 0, frames = [];
      function ptr(h, t) { var p = {}; if (h === t) p[h] = ['H', 'T']; else { p[h] = 'H'; p[t] = 'T'; } return p; }
      function snap(hs, hc, extra) { return [{ type: 'array', label: 'SQ ring (app writes at T, kernel reads at H)', values: sq.slice(), ptr: ptr(sqHead, sqTail), hl: hs || {}, showIdx: true }, { type: 'array', label: 'CQ ring (kernel writes at T, app reads at H)', values: cq.slice(), ptr: ptr(cqHead, cqTail), hl: hc || {}, showIdx: true }].concat(extra || []); }
      frames.push({ narr: 'Two shared rings of ' + SZ + ' slots, both empty (head = tail). The app and the kernel both see them through <b>shared memory</b>: no copy between them.', parts: snap() });
      for (i = 0; i < k; i++) {
        sq[sqTail % SZ] = 'R' + i; var h = {}; h[sqTail % SZ] = 'ok'; sqTail++;
        frames.push({ narr: 'App fills SQE <b>R' + i + '</b> ("read file block ' + i + '") and bumps the SQ tail. <b>No syscall yet</b> - just memory writes.', parts: snap(h, {}, [{ type: 'vars', vals: { syscalls: 0, 'queued SQEs': sqTail - sqHead } }]) });
      }
      frames.push({ narr: 'App calls <code>io_uring_enter()</code> <b>once</b>. That single syscall tells the kernel "there are ' + k + ' new entries". With <b>SQPOLL</b> even this call disappears.', parts: snap({}, {}, [{ type: 'vars', vals: { syscalls: 1, 'queued SQEs': sqTail - sqHead }, hl: { syscalls: 'cur' } }]) });
      for (i = 0; i < k; i++) {
        var hs = {}; hs[sqHead % SZ] = 'cur'; var op = sq[sqHead % SZ];
        sq[sqHead % SZ] = '-'; sqHead++;
        cq[cqTail % SZ] = op + ':ok'; var hc = {}; hc[cqTail % SZ] = 'ok'; cqTail++;
        frames.push({ narr: 'Kernel consumes <b>' + op + '</b> (SQ head moves), performs the I/O, and posts a CQE <b>' + op + ':ok</b> at the CQ tail. Completions may arrive in <i>any</i> order.', parts: snap(hs, hc, [{ type: 'vars', vals: { syscalls: 1, 'SQ pending': sqTail - sqHead, 'CQ ready': cqTail - cqHead } }]) });
      }
      for (i = 0; i < k; i++) {
        var hr = {}; hr[cqHead % SZ] = 'sel'; var c = cq[cqHead % SZ];
        cq[cqHead % SZ] = '-'; cqHead++;
        frames.push({ narr: 'App reads completion <b>' + c + '</b> straight from shared memory and advances the CQ head (<code>io_uring_cqe_seen</code>) - <b>no syscall</b>.', parts: snap({}, hr, [{ type: 'vars', vals: { syscalls: 1, 'CQ ready': cqTail - cqHead } }]) });
      }
      frames.push({ narr: 'Done: <b>' + k + '</b> I/O operations used <b>1</b> syscall. Classic blocking I/O would have used <b>' + k + '</b> (one <code>read()</code> each); epoll+read would use ' + k + ' reads plus epoll_waits.', parts: snap({}, {}, [{ type: 'vars', vals: { 'uring syscalls': 1, 'read() syscalls': k }, hl: { 'uring syscalls': 'ok', 'read() syscalls': 'bad' } }]) });
      return frames;
    }
  },
  examples: [
    { title: 'Syscall math', html: `<p>NVMe doing 1 M random 4 KB reads/s. With one <code>pread</code> per I/O = 1 M syscalls/s. At ~0.3 µs each (with mitigations) that is 0.3 s of CPU per second = 30% of a core just crossing the user/kernel boundary, plus a context switch if the thread blocks. io_uring with batch 32: ~31 K submit syscalls/s. With SQPOLL: ~0. This is why storage engines adopt it.</p>` },
    { title: 'Readiness vs completion model', html: `${H.table(['', 'epoll (readiness)', 'io_uring (completion)'], [['Question answered', '"Can I read now without blocking?"', '"Here is the data you asked for."'], ['Your code then…', 'calls read() yourself', 'just uses the finished buffer'], ['Disk files', 'not supported', 'supported'], ['Buffer ownership', 'you supply at read time', 'must stay valid until completion (lifetime bugs!)']])}` },
    { title: 'Linked ops: copy a file with one submit', html: `<p>Chain <code>READ → WRITE</code> with <code>IOSQE_IO_LINK</code>: the write runs only if the read succeeded. Add <code>FIXED_FILE</code> + registered buffers and the kernel skips per-op fd lookups and page pinning. For network: <code>multishot accept</code> posts a CQE for every new connection from <i>one</i> SQE.</p>` }
  ],
  deepDive: `<p><b>🟣 Internals.</b> The rings are mmap'ed regions with producer/consumer indices updated using acquire/release ordering (lock-free, single producer single consumer per ring). Entries in the SQ are indexed through an indirection array; CQEs are 16 bytes (or 32 with <code>CQE32</code>). If the CQ overflows, the kernel parks completions in an overflow list (flag <code>IORING_SQ_CQ_OVERFLOW</code>) - size the CQ larger (default 2× SQ). Operations that can complete inline (cached data) do; ones that would block are punted to <b>io-wq</b> kernel worker threads (for buffered file reads) or use native async paths (O_DIRECT, sockets with poll arming). Modes: default (you call enter), <b>SQPOLL</b> (kernel thread burns a core for lowest latency), <b>IOPOLL</b> (busy-poll NVMe completions, requires O_DIRECT), <b>COOP_TASKRUN/DEFER_TASKRUN</b> (reduce IPIs, run completion work in your thread).</p>
  <p><b>Security &amp; ops.</b> io_uring had a steady stream of kernel vulnerabilities and a large attack surface (it implements many ops itself), so Docker's default seccomp profile blocks it since 2023, Google disabled it for sandboxed workloads and ChromeOS, and the sysctl <code>kernel.io_uring_disabled</code> (0/1/2) lets admins turn it off. Check before designing around it. <b>Pitfalls:</b> buffers must outlive the request; cancellation needs <code>ASYNC_CANCEL</code>; fixed buffers count against <code>RLIMIT_MEMLOCK</code>; unbounded SQE submission can exhaust memory; kernel version matrix is wide (feature probing with <code>io_uring_register_probe</code>). Alternatives: Windows IOCP / IoRing, macOS Grand Central Dispatch I/O.</p>`,
  aiEra: `<p><b>What AI changes:</b> training data loaders and checkpoint writers push multi-GB/s through NVMe arrays; io_uring (with O_DIRECT) cuts CPU overhead and avoids page-cache double buffering, and storage stacks for vector databases and KV-cache offload (to NVMe) increasingly use it. Frameworks such as PyTorch rely on thread pools today, but io_uring-backed async readers are appearing in data loaders (e.g. via liburing bindings, GDS-style GPU-direct paths for the GPU side).</p>
  <p><b>Use AI as a partner:</b> ask it to translate a blocking-read loop into SQE batching, or to list which opcodes your kernel version supports. <b>Where AI goes wrong:</b> it writes code that frees or reuses a buffer before the CQE arrives (use-after-free), forgets <code>io_uring_cqe_seen</code>, or assumes completions are in order. <b>You still own:</b> measuring (flame graphs, <code>perf trace -s</code>) whether syscalls are actually your bottleneck, and the security stance of your platform.</p>`,
  problems: [
    P('Should we move our event loop from epoll to io_uring?', 'Hard', ['io_uring', 'design', 'performance'], ['Netflix', 'Cloudflare', 'Databricks'],
      `<p>A proxy handles 40 K requests/s on 16 cores using epoll + read/write; CPU profile shows 22% in the kernel on syscall entry/exit and the rest in TLS and parsing. A teammate proposes rewriting to io_uring. Make a recommendation with numbers, risks and an experiment plan.</p>`,
      `Linux 6.x hosts; shared Kubernetes cluster with default seccomp profile; team of 4.`,
      `<p>Estimate: at most the 22% syscall share can be reduced (maybe half) → ~10% gain. Rewrite cost is high and io_uring may be blocked by seccomp.</p>`,
      `<p>Rewriting everything for a hoped-for big win ignores Amdahl's law and the platform's security policy.</p>`,
      { q: 'What bounds the possible speedup here?', options: ['Number of CPU cores', 'The ~22% of time spent in syscall overhead (Amdahl)', 'TCP congestion window', 'Nothing'], answer: 1, explain: 'io_uring can only shrink syscall/crossing overhead, not TLS or parsing time.' },
      ['<p>Hint 1: how much time could possibly be saved at best?</p>', '<p>Hint 2: is io_uring even allowed on the target nodes?</p>', '<p>Hint 3: prototype the hot path only (multishot recv + batched sends) and benchmark under real traffic.</p>'],
      `<p>Recommendation: do not rewrite the proxy yet; run a time-boxed experiment. By Amdahl's law the ceiling is the 22% kernel entry/exit share, and io_uring batching only removes part of it (the actual network stack work and copies remain), so a realistic gain is roughly 5-12% CPU. TLS and HTTP parsing dominate and are unaffected. First cheaper wins: enable SO_REUSEPORT per-core loops, batch writes with writev/sendmmsg, use kTLS/sendfile for bodies, tune epoll maxevents, and check mitigations. Check platform constraints: Docker/Kubernetes default seccomp blocks io_uring, and security teams may forbid it. Experiment plan: (1) benchmark a prototype with multishot recv, provided buffer rings and batched submit on one worker, A/B under replayed production traffic, measure p99 latency, CPU per request and syscalls/s via perf; (2) go/no-go if CPU per request improves more than ~10% and the security review passes; (3) keep an epoll fallback for older kernels or blocked environments with the same connection state machine behind an interface.</p>`,
      `<p>Syscalls/s drops from ~N per request to ~N/batch; correctness risks are buffer lifetimes and cancellation.</p>`,
      ['What changes for disk-heavy workloads?', 'How would you handle kernels without multishot?'])
  ]
});

// ---------------- Topic 7: zero-copy ----------------
topics.push({
  title: 'Zero-Copy I/O: sendfile, splice, mmap vs read+write',
  analogy: `<p>You want to mail a book from the library (disk) to a friend (network). <b>read+write</b>: borrow the book, carry it home (user space), photocopy it, then walk to the post office and hand over the copy - two trips and two copies. <b>sendfile</b>: tell the librarian "post this book directly" - it never comes to your house.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Serving a file over a socket with plain <code>read()</code> then <code>write()</code> moves the same bytes around several times:</p>
  <ol><li><b>DMA</b> disk → kernel <b>page cache</b> (copy 1, done by the disk controller, no CPU)</li><li><code>read()</code>: page cache → user buffer (copy 2, <b>CPU copy</b>)</li><li><code>write()</code>: user buffer → kernel <b>socket buffer</b> (copy 3, <b>CPU copy</b>)</li><li>DMA socket buffer → NIC (copy 4, no CPU)</li></ol>
  <p><b>4 copies, 4 context switches</b> (2 syscalls × user→kernel→user), and 2 of the copies burn CPU and cache. The app never even looks at the data - pure waste.</p>
  ${H.table(['Method', 'CPU copies', 'DMA copies', 'Syscalls', 'Notes'], [['read + write', '2', '2', '2', 'general, lets you inspect/modify data'], ['mmap + write', '1', '2', '2 (+ page faults)', 'skips read copy; risky if file shrinks (SIGBUS)'], ['sendfile', '1 (page cache → socket buffer)', '2', '1', 'file → socket only'], ['sendfile + NIC scatter-gather', '0', '2', '1', 'only descriptors are appended to the socket buffer'], ['splice (via pipe)', '0', '2', '2 (pipe in, pipe out)', 'any fd ↔ pipe ↔ any fd, moves page references'], ['io_uring SEND_ZC / MSG_ZEROCOPY', '0', '2', 'batched', 'completion notifies when buffer is reusable']])}
  <p><b>Rule of thumb:</b> if you do not need to touch the bytes (static files, proxying, file copy), use <code>sendfile</code>/<code>splice</code>. If you must modify them (encryption in userspace, compression, parsing), a user-space copy is unavoidable - unless the kernel does it: <b>kTLS</b> encrypts inside the kernel so sendfile still works over HTTPS.</p>`,
  clues: ['"Serve static files efficiently / why is nginx fast at files" → sendfile, page cache', '"Kafka brokers' + "'" + ' throughput" → sendfile from page cache to socket (zero-copy consumers)', '"Count the copies / context switches in read+write" → 4 copies (2 CPU), 4 context switches', '"Proxy data between two sockets without touching it" → splice through a pipe', '"mmap vs read" → fewer copies but page-fault cost and SIGBUS on truncation', '"Large messages over TCP, CPU-bound on memcpy" → MSG_ZEROCOPY / SEND_ZC (only wins for ≥ ~10 KB)'],
  code: [{ lang: 'cpp', title: 'sendfile(): file to socket without a user-space buffer', code: `#include <sys/sendfile.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>
#include <cstdio>

// Send the whole file 'path' over the connected socket 'sock'.
// Returns bytes sent, or -1 on error.
long send_whole_file(int sock, const char *path) {
    int fd = open(path, O_RDONLY);
    if (fd < 0) { perror("open"); return -1; }

    struct stat st;
    if (fstat(fd, &st) < 0) { perror("fstat"); close(fd); return -1; }

    off_t offset = 0;                       // kernel advances this for us
    while (offset < st.st_size) {
        // One syscall: kernel moves page-cache pages to the socket.
        // The data never enters user space.
        ssize_t n = sendfile(sock, fd, &offset, st.st_size - offset);
        if (n < 0) {
            if (errno == EINTR) continue;
            if (errno == EAGAIN) continue;   // non-blocking socket: real code waits for EPOLLOUT
            perror("sendfile"); close(fd); return -1;
        }
        if (n == 0) break;                   // file shrank under us
    }
    close(fd);
    return (long)offset;
}

// For contrast: the classic copy-heavy way (2 syscalls and 2 CPU copies per chunk).
long send_file_read_write(int sock, const char *path) {
    int fd = open(path, O_RDONLY);
    if (fd < 0) return -1;
    char buf[64 * 1024];
    long total = 0;
    ssize_t r;
    while ((r = read(fd, buf, sizeof buf)) > 0) {      // copy: page cache -> buf
        ssize_t off = 0;
        while (off < r) {
            ssize_t w = write(sock, buf + off, r - off); // copy: buf -> socket buffer
            if (w < 0) { close(fd); return -1; }
            off += w;
        }
        total += r;
    }
    close(fd);
    return total;
}

int main() {
    // Demo wiring: copy a file to stdout-like fd to show the call shape.
    int fds[2];
    if (socketpair(AF_UNIX, SOCK_STREAM, 0, fds) < 0) return 1;
    std::printf("see send_whole_file(sock, path) usage in a server loop\\n");
    close(fds[0]); close(fds[1]);
    return 0;
}` },
  { lang: 'python', run: true, title: 'Copy and context-switch calculator for I/O paths', code: `# Count data copies and user/kernel crossings for sending a file of a given size.
def analyze(method, size_kb, chunk_kb=64):
    chunks = max(1, -(-size_kb // chunk_kb))          # ceil division
    # per chunk: (cpu_copies, dma_copies, syscalls)
    table = {
        "read+write":          (2, 2, 2),
        "mmap+write":          (1, 2, 1),   # mmap once; one write per chunk
        "sendfile":            (1, 2, 1),
        "sendfile+sg-dma":     (0, 2, 1),   # NIC gathers straight from page cache
        "splice":              (0, 2, 2),   # file->pipe, pipe->socket
    }
    cpu, dma, sc = table[method]
    syscalls = chunks * sc + (1 if method == "mmap+write" else 0)
    ctx_switches = syscalls * 2                     # enter + return per syscall
    cpu_bytes_copied_kb = chunks * chunk_kb * cpu if size_kb >= chunk_kb else size_kb * cpu
    return {"chunks": chunks, "cpu_copies": cpu, "dma_copies": dma,
            "syscalls": syscalls, "ctx_switches": ctx_switches,
            "cpu_copied_MB": round(cpu_bytes_copied_kb / 1024, 2)}

size_kb = 100 * 1024          # a 100 MB file
print(f"Sending a {size_kb // 1024} MB file, 64 KB chunks")
print(f"{'method':<18}{'cpuCopy':>8}{'dma':>5}{'syscalls':>10}{'ctxSw':>8}{'CPU-copied MB':>15}")
base = None
for m in ("read+write", "mmap+write", "sendfile", "sendfile+sg-dma", "splice"):
    r = analyze(m, size_kb)
    base = base or r
    print(f"{m:<18}{r['cpu_copies']:>8}{r['dma_copies']:>5}{r['syscalls']:>10}{r['ctx_switches']:>8}{r['cpu_copied_MB']:>15}")
print()
rw, sf = analyze("read+write", size_kb), analyze("sendfile+sg-dma", size_kb)
print("sendfile+SG removes", rw["cpu_copied_MB"], "MB of CPU memcpy and",
      rw["syscalls"] - sf["syscalls"], "syscalls vs read+write")` }],
  codeTitle: ['sendfile vs read+write (compile-checked C++)', 'Copy/context-switch calculator (runnable)'],
  viz: {
    title: 'Where the bytes travel: read+write vs sendfile',
    input: 'read+write',
    inputLabel: 'Method: read+write, sendfile, or sendfile+sg',
    gen: function (input) {
      var mth = String(input).trim().toLowerCase();
      if (['read+write', 'sendfile', 'sendfile+sg'].indexOf(mth) < 0) throw new Error('Type read+write, sendfile or sendfile+sg');
      var nodes = [{ id: 'D', label: 'Disk', x: 8, y: 36, shape: 'box', w: 12 }, { id: 'PC', label: 'Page cache (kernel)', x: 32, y: 36, shape: 'box', w: 22 }, { id: 'U', label: 'User buffer', x: 32, y: 6, shape: 'box', w: 20 }, { id: 'SB', label: 'Socket buffer (kernel)', x: 66, y: 36, shape: 'box', w: 24 }, { id: 'N', label: 'NIC', x: 92, y: 36, shape: 'box', w: 10 }];
      function g(edges, ehl, hl) { return { type: 'graph', height: 44, directed: true, nodes: nodes, edges: edges, ehl: ehl || {}, hl: hl || {} }; }
      var frames = [], cpu = 0, dma = 0, sw = 0;
      function stats() { return { type: 'vars', vals: { 'CPU copies': cpu, 'DMA copies': dma, 'context switches': sw }, hl: { 'CPU copies': cpu > 0 ? 'bad' : 'ok' } }; }
      if (mth === 'read+write') {
        frames.push({ narr: 'App calls <code>read(file, buf)</code>: <span class="c-r">context switch 1</span> user → kernel.', parts: [g([['D', 'PC', ''], ['PC', 'U', ''], ['U', 'SB', ''], ['SB', 'N', '']], {}, { U: 'cur' }), stats()] });
        dma++; sw++;
        frames.push({ narr: 'Copy 1 (DMA): disk controller writes the file blocks into the <b>page cache</b>. No CPU involved.', parts: [g([['D', 'PC', 'DMA'], ['PC', 'U', ''], ['U', 'SB', ''], ['SB', 'N', '']], { 'D-PC': 'ok' }, { PC: 'ok' }), stats()] });
        cpu++; sw++;
        frames.push({ narr: 'Copy 2 (CPU): kernel copies page cache → user buffer; <code>read</code> returns: <span class="c-r">context switch 2</span> kernel → user.', parts: [g([['D', 'PC', ''], ['PC', 'U', 'CPU copy'], ['U', 'SB', ''], ['SB', 'N', '']], { 'PC-U': 'bad' }, { U: 'ok' }), stats()] });
        cpu++; sw += 2;
        frames.push({ narr: 'App calls <code>write(sock, buf)</code>: <span class="c-r">context switch 3</span>. Copy 3 (CPU): user buffer → socket buffer. The app never changed a byte.', parts: [g([['D', 'PC', ''], ['PC', 'U', ''], ['U', 'SB', 'CPU copy'], ['SB', 'N', '']], { 'U-SB': 'bad' }, { SB: 'ok' }), stats()] });
        dma++; sw++;
        frames.push({ narr: 'Copy 4 (DMA): socket buffer → NIC. <code>write</code> returns: <span class="c-r">context switch 4</span>. Total: <b>4 copies (2 by CPU), 4 context switches.</b>', parts: [g([['D', 'PC', ''], ['PC', 'U', ''], ['U', 'SB', ''], ['SB', 'N', 'DMA']], { 'SB-N': 'ok' }, { N: 'ok' }), stats()] });
      } else {
        frames.push({ narr: 'App calls <code>sendfile(sock, file, ...)</code>: <span class="c-r">context switch 1</span>. The user buffer is not used at all.', parts: [g([['D', 'PC', ''], ['PC', 'SB', ''], ['SB', 'N', '']], {}, {}), stats()] });
        dma++; sw++;
        frames.push({ narr: 'Copy 1 (DMA): disk → page cache.', parts: [g([['D', 'PC', 'DMA'], ['PC', 'SB', ''], ['SB', 'N', '']], { 'D-PC': 'ok' }, { PC: 'ok' }), stats()] });
        if (mth === 'sendfile') {
          cpu++;
          frames.push({ narr: 'Copy 2 (CPU): page cache → socket buffer, entirely inside the kernel (no trip through user space).', parts: [g([['D', 'PC', ''], ['PC', 'SB', 'CPU copy'], ['SB', 'N', '']], { 'PC-SB': 'bad' }, { SB: 'ok' }), stats()] });
        } else {
          frames.push({ narr: 'With NIC <b>scatter-gather DMA</b> the kernel only appends small <i>descriptors</i> (address + length) to the socket buffer: <span class="c-g">0 CPU copies</span>.', parts: [g([['D', 'PC', ''], ['PC', 'SB', 'descriptors only'], ['SB', 'N', '']], { 'PC-SB': 'ok' }, { SB: 'ok' }), stats()] });
        }
        dma++; sw++;
        frames.push({ narr: 'Copy 3 (DMA): the NIC gathers the data from page cache pages and sends it. <code>sendfile</code> returns: <span class="c-g">context switch 2</span>. Total: <b>' + (cpu + dma) + ' copies (' + cpu + ' by CPU), ' + sw + ' context switches.</b>', parts: [g([['D', 'PC', ''], ['PC', 'SB', ''], ['SB', 'N', 'DMA']], { 'SB-N': 'ok' }, { N: 'ok' }), stats()] });
      }
      frames.push({ narr: 'Compare: read+write = 4 copies / 4 switches; sendfile = ' + (mth === 'read+write' ? '3' : '3') + ' copies / 2 switches; with scatter-gather the CPU copies drop to 0. Fewer copies = less CPU, less cache pollution, more throughput.', parts: [stats()] });
      return frames;
    }
  },
  examples: [
    { title: 'Counting for a 10 GB/s file server', html: `<p>At 10 GB/s, read+write forces ~20 GB/s of CPU memcpy (2 copies) - more than one socket's memory bandwidth budget for other work, and all of it pollutes CPU caches. sendfile+SG: 0 CPU memcpy; the CPU only orchestrates. This is why CDN edges and Kafka brokers do >10 Gb/s on modest CPUs.</p>` },
    { title: 'When zero-copy does NOT help', html: `<ul><li>You compress/encrypt/transform in userspace (TLS in user space, gzip on the fly) → bytes must enter user space. Use <b>kTLS</b> or pre-compressed files.</li><li>Small payloads (&lt; ~10 KB): setup overhead of MSG_ZEROCOPY/page pinning exceeds the memcpy it saves.</li><li>Data not in page cache: the disk read dominates anyway.</li><li>mmap'ed file truncated by another process → <code>SIGBUS</code>.</li></ul>` },
    { title: 'Proxying with splice', html: `<p><code>splice(sockA → pipe)</code> then <code>splice(pipe → sockB)</code> moves page <i>references</i> through a kernel pipe buffer: a zero-CPU-copy TCP proxy (HAProxy uses this for TCP mode). Two syscalls per chunk, and the pipe size (default 64 KB, <code>F_SETPIPE_SZ</code>) sets the chunk.</p>`, code: { lang: 'cpp', title: 'splice socket to socket via a pipe', code: `#define _GNU_SOURCE 1
#include <fcntl.h>
#include <unistd.h>
#include <cerrno>

// Move bytes from in_fd to out_fd without entering user space.
// Returns total bytes moved, 0 on EOF, -1 on error.
long proxy_splice(int in_fd, int out_fd) {
    int p[2];
    if (pipe(p) < 0) return -1;
    long total = 0;
    for (;;) {
        // socket -> pipe: moves page references, no memcpy to user space
        ssize_t n = splice(in_fd, nullptr, p[1], nullptr, 65536, SPLICE_F_MOVE);
        if (n <= 0) { if (n < 0 && errno == EINTR) continue; break; }
        // pipe -> socket
        ssize_t left = n;
        while (left > 0) {
            ssize_t w = splice(p[0], nullptr, out_fd, nullptr, left, SPLICE_F_MOVE);
            if (w < 0) { if (errno == EINTR) continue; close(p[0]); close(p[1]); return -1; }
            left -= w;
        }
        total += n;
    }
    close(p[0]); close(p[1]);
    return total;
}` } }
  ],
  deepDive: `<p><b>🟣 Internals.</b> sendfile moves <i>page cache pages</i> into skbs (socket buffers) as fragments (<code>skb_frag</code>), so with a NIC that does scatter-gather and checksum offload the CPU never touches the payload. <code>splice</code> is the general mechanism: a pipe is a ring of <code>pipe_buffer</code>s that hold page references, and <code>sendfile</code> is essentially an internal splice. <code>vmsplice</code> maps user pages into a pipe (dangerous: the user must not modify them until consumed). <code>MSG_ZEROCOPY</code> pins user pages for <code>send</code> and delivers a completion notification on the socket error queue when pages may be reused - complex, wins for large sends. <code>copy_file_range</code> and reflinks (<code>FICLONE</code>) copy files with no data movement at all (or in-kernel/server-side on NFS). <b>mmap</b>: read via page faults (mapping the page cache into your address space); cost = fault + TLB overhead, with <code>MAP_POPULATE</code>/<code>madvise</code> to prefetch; good for random access to big files, poor for one-pass streaming.</p>
  <p><b>Page cache and eviction.</b> Zero-copy only helps when the data is hot in page cache; Kafka relies on the OS cache (not its own heap) for this reason - consumers that keep up read straight from cache while lagging consumers cause disk reads. <b>Security/TLS:</b> classic user-space TLS prevents sendfile because encryption needs the bytes; <code>kTLS</code> (<code>setsockopt(TCP_ULP,"tls")</code>) lets the kernel (or the NIC) encrypt so sendfile works again. <b>Direct I/O</b> (<code>O_DIRECT</code>) bypasses the page cache (one DMA from disk to user buffer) - used by databases that run their own buffer pool; combined with RDMA/GPUDirect it avoids the CPU entirely.</p>`,
  aiEra: `<p><b>What AI changes:</b> moving data is the bottleneck in AI systems. <b>GPUDirect Storage</b> DMAs from NVMe straight into GPU memory (skipping the CPU bounce buffer), <b>GPUDirect RDMA</b> moves tensors NIC → GPU for distributed training, and model loading uses <code>mmap</code> (safetensors, llama.cpp) so weights are paged in lazily and shared across processes via the page cache. Inference gateways stream tokens with many tiny writes where zero-copy does not matter - copies matter for big tensors and checkpoints.</p>
  <p><b>Use AI as a partner:</b> ask it to count copies and syscalls in your data path, to propose sendfile/splice/kTLS alternatives, and to write a microbenchmark you can run with <code>perf stat</code>. <b>Where AI goes wrong:</b> it claims "zero-copy" for paths that still do CPU copies (always ask "which copies are by CPU, which by DMA?"), or recommends mmap for streaming writes. <b>You still own:</b> measuring on your hardware and kernel (NIC features via <code>ethtool -k</code>) before and after.</p>`,
  problems: [
    P('Count copies and context switches', 'Easy', ['zero-copy', 'sendfile'], ['Apple', 'Oracle'],
      `<p>A web server sends a 1 MB static file to a client using <code>read()</code> into a 64 KB buffer then <code>write()</code> to the socket, repeated. (a) How many copies and context switches per chunk? (b) How do they change with <code>sendfile()</code>? (c) How many syscalls for the entire file in each case?</p>`,
      `1 MB file = 16 chunks of 64 KB, file already in page cache.`,
      `<p>With page cache hot: per chunk read: 1 CPU copy, write: 1 CPU copy + 1 DMA = 2 CPU copies, 1 DMA; 2 syscalls = 4 context switches. 16 chunks = 32 syscalls. sendfile: 1 syscall (or a few), 1 CPU copy (0 with SG).</p>`,
      `<p>The naive path copies every byte twice by CPU and crosses into the kernel twice per 64 KB.</p>`,
      { q: 'With sendfile and a scatter-gather NIC, how many CPU copies remain?', options: ['2', '1', '0', '3'], answer: 2, explain: 'Only descriptors are queued; the NIC DMA-gathers from the page cache.' },
      ['<p>Hint 1: classify each copy as CPU or DMA.</p>', '<p>Hint 2: each syscall = 2 context switches (in and out).</p>', '<p>Hint 3: the file is hot in page cache, so the disk DMA copy is skipped for repeat requests.</p>'],
      `<p>(a) For each 64 KB chunk with read+write: the data goes page cache → user buffer (CPU copy), then user buffer → socket buffer (CPU copy), then socket buffer → NIC (DMA copy). That is two CPU copies and one DMA copy when the file is already cached (four copies if it must first be read from disk by DMA). There are two syscalls, so four context switches per chunk. (b) With sendfile the user buffer disappears: page cache → socket buffer (one CPU copy, or none with scatter-gather where only descriptors are appended), then DMA to the NIC; there is a single syscall, two context switches. (c) read+write: 16 chunks × 2 syscalls = 32 syscalls and 64 context switches; sendfile: 1 syscall (the kernel loops internally up to its limit of about 2 GB per call) and 2 context switches. Result: a large reduction in CPU time and cache pollution.</p>`,
      `<p>Syscalls drop from 2·ceil(size/chunk) to about 1; CPU memcpy from 2×size to 0-1×size.</p>`,
      ['What if the server must gzip on the fly?', 'What does kTLS change?'])
  ]
});
// ---------------- Practice ----------------
practice.push(P('Is a container a VM?', 'Easy', ['containers', 'virtualization'], ['Amazon', 'Microsoft'],
  `<p>Explain in under a minute what a container is, how it differs from a VM, and what exactly <code>docker run</code> creates on the host.</p>`, `Interview warm-up; no code needed.`,
  `<p>Expected: "A container is a regular Linux process (tree) with namespaces for its view, cgroups for its limits and an overlay filesystem for its root. No guest kernel."</p>`,
  `<p>"A lightweight VM" is the weak answer - it hides the shared kernel and the security implications.</p>`,
  { q: 'Which statement is true?', options: ['Containers run their own kernel', 'Container processes are visible in the host ps output', 'Containers need a hypervisor', 'Containers cannot be limited'], answer: 1, explain: 'A container is a process on the host, just with restricted views and budgets.' },
  ['<p>Hint 1: count how many kernels run in each case.</p>', '<p>Hint 2: namespaces = what you see; cgroups = what you can use.</p>', '<p>Hint 3: add the rootfs (overlay) and the security filters (seccomp, capabilities).</p>'],
  `<p>A container is an ordinary process on the host kernel, packaged with a filesystem and wrapped in kernel features. Namespaces (pid, net, mnt, uts, ipc, user, cgroup) give it a private view of processes, network, mounts and hostname; cgroups v2 give it limits for CPU, memory, pids and IO; an overlayfs merges read-only image layers with a thin writable layer to form its root; seccomp, capabilities and LSMs shrink what it may do. A VM, in contrast, has a guest kernel on virtual hardware provided by a hypervisor using VT-x and EPT. Hence containers start in milliseconds and pack densely but share a kernel attack surface, while VMs are heavier but have stronger isolation and can run a different OS.</p>`,
  `<p>Mental-model question, no complexity.</p>`, ['Why is the first process PID 1 and why does it matter?']));

practice.push(P('Map docker run to kernel primitives', 'Easy', ['docker', 'namespaces', 'cgroups', 'overlayfs'], ['Google', 'Red Hat'],
  `<p>For <code>docker run -d --name web --memory=256m --cpus=0.5 -p 8080:80 -v data:/var/lib/app nginx</code>, list which kernel mechanism implements each flag or part.</p>`, `Answer as a table.`,
  `${H.table(['Part', 'Mechanism'], [['image nginx', 'overlayfs lowerdirs + writable upperdir'], ['--memory=256m', 'cgroup v2 memory.max = 268435456'], ['--cpus=0.5', 'cpu.max = "50000 100000"'], ['-p 8080:80', 'net ns + veth + iptables DNAT'], ['-v data:/var/lib/app', 'bind mount of a host dir into the mount ns (bypasses overlay)'], ['isolation', 'pid/net/mnt/uts/ipc namespaces']])}`,
  `<p>Answering "Docker does it" shows no understanding of the kernel features.</p>`,
  { q: 'Which flag changes cgroup files?', options: ['-p', '-v', '--memory', '--name'], answer: 2, explain: '--memory writes memory.max for the container cgroup.' },
  ['<p>Hint 1: split flags into "what it sees" and "what it may use".</p>', '<p>Hint 2: volumes are mounts, not overlay.</p>', '<p>Hint 3: -p is NAT rules, not a namespace.</p>'],
  `<p>The image nginx is a stack of read-only layers mounted as overlayfs lowerdirs with a per-container upperdir and workdir; the merged directory becomes the root via pivot_root in a new mount namespace. --memory=256m writes 268435456 to the container cgroup's memory.max; --cpus=0.5 writes "50000 100000" to cpu.max. The container gets new pid, net, uts, ipc and mnt namespaces; a veth pair joins its network namespace to the docker0 bridge and -p 8080:80 installs a DNAT rule (plus proxy fallback) from host port 8080 to the container IP port 80. -v data:/var/lib/app bind-mounts a named volume directory from the host so writes bypass copy-up and survive container removal. Finally runc applies capability drops and the default seccomp profile before exec of nginx as PID 1.</p>`,
  `<p>Conceptual answer: no algorithmic cost, the value is in the accuracy of the mental model.</p>`, ['Where would you look for each piece on the host (/sys/fs/cgroup, ip netns, mount)?']));

practice.push(P('Exit code 137: what happened?', 'Easy', ['OOM', 'debugging'], ['Uber'],
  `<p>A container exits with code 137 about every 6 hours. Name the most likely cause and the first three commands/metrics you would check.</p>`, `Kubernetes or plain Docker.`,
  `<p>137 = 128 + 9 (SIGKILL). Most often the cgroup OOM killer. Check <code>docker inspect</code> OOMKilled, <code>memory.events</code>, working-set metrics.</p>`,
  `<p>Restarting and hoping hides a leak or undersized limit.</p>`,
  { q: 'Exit code 137 means…', options: ['Segfault', 'SIGKILL (128+9)', 'Normal exit', 'SIGTERM'], answer: 1, explain: '128 + signal number 9.' },
  ['<p>Hint 1: subtract 128 from 137 to get the signal number.</p>', '<p>Hint 2: who sends SIGKILL without being asked: OOM killer, or kubelet after a failed liveness probe grace.</p>', '<p>Hint 3: read memory.events (oom_kill), dmesg and the working-set graph.</p>'],
  `<p>137 is 128 plus signal 9, so the process was SIGKILLed. The common sender is the kernel OOM killer when the container cgroup hit memory.max and could not reclaim. Confirm with docker inspect (State.OOMKilled true) or kubectl describe pod (Reason OOMKilled), the oom_kill counter in the cgroup memory.events, and dmesg lines "Memory cgroup out of memory: Killed process". Then look at container_memory_working_set_bytes over time: a sawtooth that climbs for 6 hours points to a leak, a spike at load points to an undersized limit or a burst such as a big batch. Rule out the other SIGKILL source (liveness probe failure causing kubelet to kill after the grace period, or a node eviction). Fix by finding the real peak, sizing limit above it, bounding caches and buffers, and capping runtime heap relative to the limit.</p>`,
  `<p>Conceptual answer: no algorithmic cost, the value is in the accuracy of the mental model.</p>`, ['How do you tell node eviction from cgroup OOM?']));

practice.push(P('Which polling API for 5 fds, 50K fds, and files?', 'Easy', ['epoll', 'select', 'io'], ['Amazon', 'Bloomberg'],
  `<p>Choose select, poll, epoll or io_uring for: (a) a tool watching 5 fds portably across Linux/macOS, (b) a chat server with 50,000 mostly idle sockets on Linux, (c) a database reading NVMe files at 1M IOPS.</p>`, `One-line justification each.`,
  `<p>(a) poll (or select) - portable, tiny n. (b) epoll. (c) io_uring (epoll cannot do regular files).</p>`,
  `<p>Choosing epoll everywhere ignores portability and the files limitation.</p>`,
  { q: 'Which is O(ready) rather than O(n) per wait?', options: ['select', 'poll', 'epoll', 'read'], answer: 2, explain: 'epoll keeps a kernel ready list.' },
  ['<p>Hint 1: how large is n, and how many are active at once?</p>', '<p>Hint 2: is the target always Linux, or also macOS?</p>', '<p>Hint 3: do regular files support readiness notifications?</p>'],
  `<p>(a) For five descriptors on Linux and macOS use poll (or select if you need ancient portability): the O(n) cost is irrelevant at n=5 and epoll does not exist on macOS (kqueue). (b) For 50,000 mostly idle sockets use epoll, because select caps at 1024 descriptors and both select and poll scan every fd per call; epoll's cost scales with active connections, with level-triggered mode for simplicity or edge-triggered plus drain loop for fewer wake-ups. (c) For NVMe at one million IOPS use io_uring: regular files are always reported ready by epoll, so epoll cannot give real async disk I/O, and batching submissions removes syscall overhead; consider O_DIRECT, registered buffers and polling mode.</p>`,
  `<p>select/poll O(n), epoll O(ready), io_uring O(1) amortized submission.</p>`, ['What about Windows?']));

practice.push(P('Size cgroup limits for a service', 'Medium', ['cgroups', 'capacity', 'kubernetes'], ['Google', 'Airbnb'],
  `<p>A Go service shows steady 180 MiB RSS, p99 peak 260 MiB, and uses 0.3 CPU average with bursts to 1.8 CPUs lasting about 200 ms. Propose Kubernetes requests/limits and explain the trade-offs. Also say what to set in the runtime.</p>`, `Cluster is overcommitted by design (requests sum &lt; limits sum).`,
  `<p>Memory: request 200Mi, limit 320Mi. CPU: request 300m, limit none or 2000m. GOMEMLIMIT ≈ 80% of the memory limit.</p>`,
  `<p>Setting CPU limit = average (300m) would throttle every burst for ~100 ms periods and wreck p99 latency.</p>`,
  { q: 'Why can a low CPU limit hurt latency without high average CPU?', options: ['Memory leaks', 'CFS throttling pauses all threads once the period quota is used', 'More context switches', 'Bad DNS'], answer: 1, explain: 'Quota is per 100 ms period; bursts exhaust it early and the group is frozen.' },
  ['<p>Hint 1: memory is incompressible (kill), CPU is compressible (throttle).</p>', '<p>Hint 2: bursts of 1.8 CPU for 200 ms need quota of ~36 ms per 100 ms... check what a 300m limit gives.</p>', '<p>Hint 3: use requests for scheduling and weight; set limits where the failure mode is acceptable.</p>'],
  `<p>Memory: the limit is a kill threshold, so it must clear the measured p99 peak (260 MiB) with headroom for growth and page cache; choose a limit of about 320 MiB (peak + ~20%) and a request near typical working set, 200 MiB. Set GOMEMLIMIT to roughly 80% of the limit (about 256 MiB) so the garbage collector works harder before the kernel kills the process. CPU: the average is 0.3, but bursts to 1.8 CPUs for 200 ms need much more quota than a 300m limit provides: with cpu.max 30000/100000 the group could only run 30 ms per period, so a burst would be throttled for most of every period and latency would jump by tens of ms. Therefore set request 300m (guaranteed weight, scheduling) and either no CPU limit or a generous 2000m limit; also set GOMAXPROCS from the quota (automaxprocs) to avoid more threads than allowed CPUs. Monitor nr_throttled, working-set/limit ratio and OOM kills, and revisit after a week.</p>`,
  `<p>Cost: overcommit raises density; risk is node-level memory pressure if many pods peak together.</p>`, ['What is Guaranteed vs Burstable vs BestEffort QoS?', 'Vertical Pod Autoscaler?']));

practice.push(P('Overlay: why is the image still large?', 'Medium', ['docker', 'overlayfs', 'build'], ['Docker', 'Shopify'],
  `<p>A Dockerfile downloads a 400 MB archive, extracts 100 MB of binaries, and deletes the archive in a later RUN. The image is 520 MB. Explain why and give two ways to fix it.</p>`, `Docker BuildKit, overlay2 snapshotter.`,
  `<p>The delete is a whiteout in a new layer; the archive bytes stay in the earlier layer. Fix: same RUN, or multi-stage build.</p>`,
  `<p>Believing rm shrinks the image reveals a wrong model of layers.</p>`,
  { q: 'Where do the 400 MB of the deleted archive live?', options: ['Nowhere', 'Still in the earlier read-only layer', 'In RAM', 'In the writable layer'], answer: 1, explain: 'Layers are immutable; a later layer can only hide files.' },
  ['<p>Hint 1: layers are immutable and additive.</p>', '<p>Hint 2: one Dockerfile instruction = one layer.</p>', '<p>Hint 3: combine download+extract+delete into one RUN, or copy only the output from a build stage.</p>'],
  `<p>Each RUN creates a new immutable layer, and a layer stores only the diff from the one below. The RUN that downloads and extracts adds about 500 MB (archive plus extracted files). The following RUN rm only writes whiteout entries for the archive, which hides it in the merged view but leaves the original bytes in the earlier layer, so a pull still transfers them and docker images reports the sum of layers. Fix one: perform download, extract and deletion inside a single RUN so the archive never gets committed into any layer (the layer only contains the final 100 MB). Fix two: use a multi-stage build where the first stage downloads and extracts, and the final stage does COPY --from=build /out/bin /usr/local/bin, giving a layer with just the binaries and no leftovers; also use a .dockerignore and a slim base. Verify with docker history and tools like dive.</p>`,
  `<p>Conceptual answer: no algorithmic cost, the value is in the accuracy of the mental model.</p>`, ['How do secrets leak through layers?', 'How does BuildKit cache mounts help?']));

practice.push(P('Edge-triggered echo loop: write it safely', 'Medium', ['epoll', 'edge-triggered', 'implementation'], ['Meta', 'Cloudflare'],
  `<p>Describe the exact state you need per connection to implement a correct edge-triggered epoll server that handles partial writes. Include what to do on <code>EAGAIN</code> for reads and writes and when to enable <code>EPOLLOUT</code>.</p>`, `Single thread, non-blocking sockets.`,
  `<p>Per connection: an output buffer. Read until EAGAIN; try writing; if short write, keep leftover and add EPOLLOUT; on EPOLLOUT flush and remove EPOLLOUT.</p>`,
  `<p>Dropping unsent bytes or spinning on EAGAIN burns CPU or loses data.</p>`,
  { q: 'When should EPOLLOUT be enabled?', options: ['Always', 'Only when a write was short / returned EAGAIN and data is pending', 'Never', 'Before accept'], answer: 1, explain: 'Otherwise a writable socket would fire constantly (LT) or is pointless.' },
  ['<p>Hint 1: reads and accepts: loop until EAGAIN.</p>', '<p>Hint 2: writes: try immediately; only wait for EPOLLOUT if the kernel buffer is full.</p>', '<p>Hint 3: bound the output buffer; if a peer is too slow, stop reading from it (back-pressure) or close it.</p>'],
  `<p>Keep a Conn struct per fd with an input buffer (for partial frames), an output queue and a flag saying whether EPOLLOUT is armed. On an EPOLLIN edge, loop read() until it returns -1/EAGAIN, treating 0 as EOF and other errors as close; append bytes to the parser, process complete messages and append responses to the output queue. After processing, try write() immediately in a loop; if it makes progress keep going, if it returns EAGAIN (or a short count) stop and keep the remainder, then register EPOLLOUT via epoll_ctl MOD. On the EPOLLOUT event flush the queue; when empty, remove EPOLLOUT so you are not woken constantly. Cap the output buffer per connection and stop reading from a client whose output backlog is above a threshold (back-pressure), or disconnect it. Handle EPOLLRDHUP/EPOLLHUP/EPOLLERR by closing, calling close() (which also removes the fd from the epoll set if no dup exists). For multi-threading use EPOLLONESHOT and re-arm after handling.</p>`,
  `<p>Each event costs O(bytes) with a bounded number of syscalls.</p>`, ['What breaks with dup()ed fds?', 'How do timeouts fit in (timerfd)?']));

practice.push(P('Zero-copy file server design', 'Medium', ['sendfile', 'zero-copy', 'design'], ['Netflix', 'Akamai'],
  `<p>Design the data path for a server that serves large videos over HTTPS. How do you keep CPU copies low even though TLS must encrypt the data?</p>`, `Linux, 100 Gb/s NICs, files hot in page cache.`,
  `<p>Use kTLS so encryption happens in the kernel (or on the NIC), then sendfile from page cache; user space only does the handshake and headers.</p>`,
  `<p>User-space TLS: read file into buffer, encrypt, write - 3+ memcpys per byte and heavy cache pollution.</p>`,
  { q: 'Why does user-space TLS block sendfile?', options: ['Sockets are non-blocking', 'The bytes must be encrypted in user space first', 'TLS uses UDP', 'Page cache is disabled'], answer: 1, explain: 'sendfile moves plaintext pages; encryption needs the data in the crypto code, so you need kTLS.' },
  ['<p>Hint 1: where must the encryption happen?</p>', '<p>Hint 2: after the handshake, give the session keys to the kernel.</p>', '<p>Hint 3: NIC TLS offload can encrypt on the device.</p>'],
  `<p>Do the TLS handshake in user space (OpenSSL/BoringSSL), then enable kernel TLS: setsockopt TCP_ULP "tls" and TLS_TX with the negotiated keys so the kernel encrypts records. From then on, send headers with write/send and the body with sendfile from the page cache: the kernel encrypts directly while moving data to the socket buffer, so user space never touches the video bytes (one crypto pass instead of two copies plus encryption). With a NIC that supports TLS inline offload, even that pass moves to hardware, leaving zero CPU data touches. Keep the hot set in page cache (enough RAM, readahead tuning, posix_fadvise), use one worker per core with SO_REUSEPORT, large TCP buffers, and TSO/GSO. Netflix serves ~400 Gb/s per FreeBSD box this way.</p>`,
  `<p>Memory bandwidth per byte falls from about 4-5 crossings to about 2 (disk/cache read + NIC DMA).</p>`, ['What if the content is dynamically personalised?', 'What are the failure modes if keys rotate?']));

practice.push(P('Namespaces: what would you NOT isolate?', 'Medium', ['namespaces', 'security'], ['Palo Alto', 'Microsoft'],
  `<p>List five things that are shared between a container and its host even with all namespaces enabled, and the security consequence of each.</p>`, `Think kernel-global state.`,
  `<p>The kernel itself, kernel modules, keyrings, dmesg (unless restricted), clock (pre time-ns), devices, sysctls not namespaced.</p>`,
  `<p>Saying "namespaces make containers fully isolated" is the classic wrong answer.</p>`,
  { q: 'Which is not isolated by the standard seven namespaces?', options: ['Hostname', 'Process IDs', 'The kernel and its syscall surface', 'Mount points'], answer: 2, explain: 'All containers share the host kernel; a kernel bug is a container escape.' },
  ['<p>Hint 1: namespaces wrap specific views, not the kernel.</p>', '<p>Hint 2: anything global to the kernel remains shared.</p>', '<p>Hint 3: think of what hardening adds: seccomp, caps, LSM, user ns, read-only paths.</p>'],
  `<p>Shared with the host: (1) the kernel code and syscall interface itself, so a kernel vulnerability is a direct escape - mitigated by seccomp filters, gVisor or microVMs; (2) kernel modules and some sysctls - containers with CAP_SYS_MODULE can load modules, so drop capabilities; (3) the kernel keyring and some /proc and /sys entries (kcore, firmware) - runtimes mask or make them read-only; (4) devices - /dev nodes granted with --device or --privileged expose hardware; (5) resources not covered by cgroups (kernel memory in some forms, inode tables, entropy, noisy-neighbour effects on caches and memory bandwidth) and side channels like Spectre. Also the system clock (before the time namespace, which only offsets monotonic and boottime), and UID 0 unless the user namespace remaps it. Mitigations: user namespaces, rootless mode, dropping all capabilities, seccomp default profile, AppArmor/SELinux, read-only rootfs, no docker.sock mounts.</p>`,
  `<p>Conceptual answer: no algorithmic cost, the value is in the accuracy of the mental model.</p>`, ['How does gVisor change the answer?', 'What does --privileged add?']));

practice.push(P('Design the I/O stack for a 1M-connection push gateway', 'Hard', ['epoll', 'scalability', 'design'], ['WhatsApp', 'Slack', 'Google'],
  `<p>A push gateway keeps 1,000,000 mostly idle TCP connections (WebSocket) per machine and fans out messages. Design the Linux I/O model, kernel/OS tuning, memory budget and cgroup sizing.</p>`, `32 cores, 128 GB RAM, one 25 Gb NIC; ~2% of connections active per second.`,
  `<p>Thread-per-core epoll event loops with SO_REUSEPORT, small per-connection state, tuned limits; memory ≈ 1M × (socket buffers + app state).</p>`,
  `<p>Thread-per-connection: 1M threads × 8 MB virtual stacks, scheduler thrash - impossible. select: capped at 1024 and O(n).</p>`,
  { q: 'Dominant cost of 1M idle connections?', options: ['epoll_wait CPU', 'Memory per connection (buffers, TLS state, timers)', 'accept syscalls', 'DNS'], answer: 1, explain: 'Idle epoll costs nothing; kernel and app memory per socket dominates.' },
  ['<p>Hint 1: idle connections cost memory, not CPU, with epoll.</p>', '<p>Hint 2: budget per connection: kernel socket (~2-4 KB min) + send/recv buffers (autotuned) + TLS + app object.</p>', '<p>Hint 3: raise fd limits, conntrack, port-range (client side), and use one loop per core.</p>'],
  `<p>Model: N worker threads (one per core, pinned) each running an epoll loop, accepting via SO_REUSEPORT so the kernel balances new connections across listeners and no accept thundering herd exists. Use level-triggered epoll for simplicity or edge-triggered with strict drain loops; keep per-connection state tiny (hundreds of bytes plus small buffers allocated on demand from pools; shrink buffers when idle). Memory budget: kernel socket structures ~3-4 KB, TCP buffers kept small with tcp_rmem/tcp_wmem minimums (autotune grows only for active sockets), TLS state ~10-30 KB per connection (or terminate TLS at an offload tier), app state ~1 KB: about 20-40 KB × 1M = 20-40 GB, which fits in 128 GB with headroom. OS tuning: fs.nr_open and ulimit -n above 1M, net.core.somaxconn, tcp_max_syn_backlog, nf_conntrack_max or bypass conntrack, tcp_keepalive tuned plus application heartbeats, timer wheel for idle timeouts. Fan-out uses batching (writev, sendmmsg, io_uring batched sends) and per-core queues with back-pressure. Run in a container with memory.max set to the measured peak plus 20% and a pids limit; cpu weight rather than a hard quota to avoid throttling. Load-test with ramped connection storms, test reconnection storms after a restart (jittered backoff).</p>`,
  `<p>CPU is proportional to the active 2% (20K conns/s of events), not the 1M.</p>`, ['Reconnect storm after deploy?', 'How would io_uring change the picture?']));

practice.push(P('Debug: p99 latency spikes every 100 ms in a container', 'Hard', ['cgroups', 'cpu', 'debugging'], ['Netflix', 'Stripe'],
  `<p>A multi-threaded service in a container with <code>cpu.max = 200000 100000</code> (2 CPUs) on a 64-core node shows average CPU 120% yet latency spikes of ~80 ms periodically. Diagnose and fix.</p>`, `Runtime sizes thread pool by host cores (64).`,
  `<p>64 runnable threads burn the 200 ms quota in ~3 ms of wall time, then are throttled for the remaining ~97 ms of the period.</p>`,
  `<p>Looking only at average CPU hides throttling; adding more replicas without fixing thread counts does not help.</p>`,
  { q: 'Which counter proves this diagnosis?', options: ['memory.events oom_kill', 'cpu.stat nr_throttled / throttled_usec', 'io.stat', 'pids.current'], answer: 1, explain: 'Growing nr_throttled and throttled time show CFS bandwidth throttling.' },
  ['<p>Hint 1: quota is shared by all threads in the cgroup per 100 ms period.</p>', '<p>Hint 2: check cpu.stat and container_cpu_cfs_throttled_periods_total.</p>', '<p>Hint 3: fix thread counts to match the quota, or relax the limit.</p>'],
  `<p>Symptoms match CFS bandwidth throttling. The cgroup is allowed 200 ms of CPU time per 100 ms period (2 CPUs). If the runtime created about 64 worker threads from the host core count and a burst of work wakes many of them at once, they consume the 200 ms of quota in only about 3 ms of wall time (200 ms / 64 threads), after which every thread in the group is stopped until the next period starts, causing stalls near 97 ms even though the average CPU usage over a second is only ~120%. Confirm by reading cpu.stat (nr_periods, nr_throttled, throttled_usec) or the Prometheus metric container_cpu_cfs_throttled_periods_total, and by checking the thread count. Fixes: make the runtime respect the quota (GOMAXPROCS via automaxprocs, JVM container support -XX:ActiveProcessorCount, tune Tokio/worker pools), raise the CPU limit or remove it in favour of requests (cpu.weight) so bursts can use idle CPU, use a shorter cfs period (cpu.max period 10000) to reduce stall length, or pin the workload with a cpuset (static CPU manager policy for Guaranteed pods) so it gets dedicated cores with no quota.</p>`,
  `<p>Conceptual answer: no algorithmic cost, the value is in the accuracy of the mental model.</p>`, ['Why is cpuset different from quota?', 'How does burst (cpu.max.burst) help?']));

practice.push(P('io_uring vs epoll vs threads for a log-ingest storage engine', 'Hard', ['io_uring', 'storage', 'design'], ['Databricks', 'Snowflake', 'ScyllaDB'],
  `<p>You are building a log ingestion node that appends to NVMe at 2 GB/s, serves reads from many clients over TCP, and must keep p99 under 5 ms. Choose the I/O strategy: blocking threads, epoll plus thread pool for disk, or io_uring. Justify with syscall counts, buffer ownership, failure modes and security constraints.</p>`, `Linux 6.x; NVMe; 4 KB-1 MB records; running in Kubernetes.`,
  `<p>Choice: thread-per-core with io_uring (O_DIRECT writes, batched submit, multishot recv), falling back to epoll + pool where io_uring is blocked.</p>`,
  `<p>Thread pool for disk: context switches per I/O, queue contention, tail latency from scheduler jitter; epoll alone cannot async-write files.</p>`,
  { q: 'Main advantage of io_uring here?', options: ['Prettier code', 'One API for async disk and network with batched submission', 'No kernel involvement', 'Free encryption'], answer: 1, explain: 'It removes the file-vs-socket split and cuts syscalls per I/O.' },
  ['<p>Hint 1: which parts of the workload does epoll NOT handle?</p>', '<p>Hint 2: compute I/Os per second and syscall overhead for each design.</p>', '<p>Hint 3: check security policy (seccomp) and kernel version; plan a fallback and an experiment.</p>'],
  `<p>Recommended: thread-per-core engine, each core owning an io_uring (with COOP_TASKRUN or DEFER_TASKRUN to avoid IPIs), a partition of the log and its connections. Appends are issued as O_DIRECT writes with registered buffers and registered files (batched; use linked write plus fsync/FUA, or batch group commit), reads use buffered or direct reads served via the same ring, and sockets use multishot recv with a provided-buffer ring and batched sends; a single io_uring_enter per loop iteration handles tens of operations, so at 2 GB/s with 256 KB writes (8K IOPS) and many small network ops syscall overhead is small relative to the thread-pool alternative which needs a wake-up and context switch per I/O and has tail latency from scheduler jitter. Buffer ownership rules: buffers stay pinned until the CQE; use pools with generation tags to avoid use-after-free; handle short writes, ENOSPC, and CQ overflow by sizing the CQ larger and applying back-pressure. Durability: choose fsync or O_DSYNC with group commit; measure real device flush cost. Security and platform: Kubernetes default seccomp may block io_uring, so provision a custom seccomp profile or dedicated nodes, track kernel CVEs, and keep an epoll plus worker-thread fallback behind the same storage interface. Validate with fio (io_uring engine) and replayed traffic, tracking p99, CPU/IO and syscalls/s.</p>`,
  `<p>Syscalls per I/O: threads 1+ (plus wake-ups), epoll+pool 2+, io_uring about 1/batch.</p>`, ['How does SQPOLL change CPU accounting in cgroups?', 'What about NVMe passthrough (uring_cmd)?']));

// ---------------- Quiz ----------------
quiz.push({ q: 'What mainly separates a Type 1 from a Type 2 hypervisor?', options: ['Type 1 runs directly on hardware; Type 2 runs as an app inside a host OS', 'Type 1 only runs Linux', 'Type 2 needs no CPU support', 'Type 1 shares the guest kernel'], answer: 0, explain: 'Bare metal (ESXi, Xen, Hyper-V) vs hosted (VirtualBox, VMware Workstation).' });
quiz.push({ q: 'What does EPT (nested paging) provide?', options: ['Faster disk I/O', 'Hardware translation guest-physical → host-physical, avoiding shadow page tables', 'Encryption of VM memory', 'A second CPU'], answer: 1, explain: 'The CPU walks the guest page table and the hypervisor EPT in hardware.' });
quiz.push({ q: 'A VM exit happens when…', options: ['Any instruction executes', 'The guest executes a sensitive operation the hypervisor must handle (e.g. CPUID, I/O port)', 'The guest finishes booting', 'A container starts'], answer: 1, explain: 'Plain instructions run natively; sensitive ones trap to root mode.' });
quiz.push({ q: 'Which namespace makes the first process inside see itself as PID 1?', options: ['net', 'uts', 'pid', 'ipc'], answer: 2, explain: 'The PID namespace gives its own PID numbering starting at 1.' });
quiz.push({ q: 'What does the user namespace enable?', options: ['Separate hostnames', 'Mapping container root to an unprivileged host uid (rootless containers)', 'More CPU', 'Faster networking'], answer: 1, explain: 'uid 0 inside maps to a high unprivileged uid outside.' });
quiz.push({ q: 'In cgroups v2, what happens when a group exceeds memory.max and nothing can be reclaimed?', options: ['The process is throttled forever', 'The OOM killer kills a process in that cgroup', 'The host reboots', 'Memory is swapped without limit'], answer: 1, explain: 'Memory is incompressible; the kernel kills within the cgroup (exit 137).' });
quiz.push({ q: 'What does exceeding cpu.max cause?', options: ['OOM kill', 'Throttling until the next period', 'Container deletion', 'Higher priority'], answer: 1, explain: 'CPU is compressible; the group is paused for the rest of the period.' });
quiz.push({ q: 'In OverlayFS, the first write to a file that exists only in a lower layer causes…', options: ['An error', 'A copy-up of the entire file to upperdir', 'A change to the lower layer', 'A whiteout'], answer: 1, explain: 'The lower is read-only; the whole file is copied up and then modified.' });
quiz.push({ q: 'How is a deleted lower-layer file represented in upperdir?', options: ['Removed from lowerdir', 'As a whiteout (char device 0/0) hiding it', 'As a symlink', 'It cannot be deleted'], answer: 1, explain: 'Lower layers are immutable; a whiteout masks the name.' });
quiz.push({ q: 'Why is epoll faster than select at 100K mostly idle connections?', options: ['It uses UDP', 'Its cost scales with ready fds; the kernel keeps a ready list instead of scanning all fds', 'It avoids sockets', 'It uses more threads'], answer: 1, explain: 'select/poll are O(n) per call; epoll is O(ready).' });
quiz.push({ q: 'With edge-triggered epoll you must…', options: ['Use blocking sockets', 'Read/accept until EAGAIN using non-blocking fds', 'Call epoll_wait twice', 'Never use EPOLLIN'], answer: 1, explain: 'Otherwise remaining bytes never generate a new edge.' });
quiz.push({ q: 'Which statement about io_uring is correct?', options: ['It is a readiness API like epoll', 'It uses shared SQ and CQ rings so many operations need one (or zero) syscalls', 'It only works for sockets', 'It copies every request twice'], answer: 1, explain: 'Shared-memory rings plus batching reduce syscalls; it covers files and sockets and reports completions.' });
quiz.push({ q: 'read()+write() of a cached file to a socket involves…', options: ['0 CPU copies', '2 CPU copies and 4 context switches per chunk', '1 DMA only', 'No syscalls'], answer: 1, explain: 'Page cache → user buffer → socket buffer are CPU copies; two syscalls = 4 switches.' });
quiz.push({ q: 'Why can plain user-space TLS not use sendfile?', options: ['sendfile is deprecated', 'The data must pass through user-space crypto code; kTLS moves encryption into the kernel', 'TLS is UDP only', 'Page cache cannot hold TLS'], answer: 1, explain: 'kTLS lets the kernel encrypt so sendfile works over HTTPS.' });

// ---------------- Interview ----------------
interview.push({ q: 'Explain the difference between a container and a VM, including isolation and performance.', level: 'B', a: `<p>A VM virtualizes <b>hardware</b>: a hypervisor (using VT-x/EPT) presents virtual CPUs, RAM and devices, and each VM boots its <b>own kernel</b>. A container virtualizes the <b>OS view</b>: it is a normal process on the host kernel whose visible world is restricted by namespaces, whose resources are capped by cgroups, and whose root is an overlay of image layers. Consequences: containers start in ms, use MBs and pack by the hundreds, with near-zero runtime overhead; VMs cost seconds, GBs, and CPU-level overhead for exits and I/O virtualization (virtio helps). Isolation: VM boundary is a small hardware-enforced interface; containers share the kernel's big syscall surface, so a kernel bug can break all containers. For untrusted multi-tenant code use microVMs (Firecracker, Kata) or gVisor.</p>`, followUps: ['When would you run containers inside VMs (as clouds do)?', 'What is a microVM?'] });
interview.push({ q: 'What happens, step by step, when you run <code>docker run</code>?', level: 'I', a: `<p>The CLI calls dockerd/containerd, which pulls and unpacks image layers (content-addressed tar layers) via a snapshotter. It creates an overlay mount: image layers as lowerdirs plus a new upperdir/workdir. containerd calls runc with an OCI spec. runc <code>clone()</code>s into new namespaces (pid, net, mnt, uts, ipc, optional user/cgroup), creates the container cgroup (v2) and writes limits (<code>memory.max</code>, <code>cpu.max</code>, <code>pids.max</code>), sets up networking (veth pair to the docker0 bridge, IP, iptables NAT for published ports), does <code>pivot_root</code> into the overlay and mounts /proc, /sys, /dev, applies capability bounding, seccomp and AppArmor/SELinux, then execs the entrypoint as PID 1. Logs/stdio are wired to the shim; volumes are bind mounts.</p>`, followUps: ['Where is each piece visible on the host?', 'What changes with rootless mode?'] });
interview.push({ q: 'What is the difference between namespaces and cgroups?', level: 'B', a: `<p>Namespaces control <b>what a process can see</b> (its own PID tree, network stack, mounts, hostname, IPC, user ids, cgroup root). They give an illusion of a private machine but impose no usage limits. Cgroups control <b>how much a group may use</b> and account for it: CPU time, memory, IO bandwidth, pids, devices. Together plus a root filesystem they form a container. Example: a process in a new pid + net namespace can still eat all host RAM unless a cgroup caps it, and a cgroup-limited process can still see all host processes unless a pid namespace hides them.</p>`, followUps: ['Which one prevents a fork bomb?', 'Can you use one without the other?'] });
interview.push({ q: 'A container keeps getting OOM-killed. How do you investigate and fix it?', level: 'I', a: `<p>Confirm: exit code 137, <code>OOMKilled: true</code>, cgroup <code>memory.events</code> (oom_kill counter) and <code>dmesg</code> "Memory cgroup out of memory". Distinguish container-level OOM from node-level (kubelet eviction, host OOM). Measure: working-set memory over time, <code>memory.stat</code> breakdown (anon vs file cache vs kernel), runtime-specific tools (JVM NMT, Go pprof heap + GOMEMLIMIT, Python tracemalloc). Decide: leak (sawtooth rising) vs undersized limit (spike under load) vs non-heap memory (threads, direct buffers, mmaps, tmpfs). Fix: remove the leak, bound caches/queues, size heap as a percentage of the limit, set limit above p99 peak + 15-25% headroom, use memory.high or PSI-based alerts for early warning, and set <code>oom.group</code> semantics intentionally. Add a runbook and alerts at 85% of limit.</p>`, followUps: ['Why does page cache count toward the limit?', 'What is PSI?'] });
interview.push({ q: 'Why did my latency spike although CPU utilisation is low in a container with a CPU limit?', level: 'A', a: `<p>CFS bandwidth throttling. The limit is a quota per period (default 100 ms): all threads in the cgroup share it. Bursty or highly-threaded workloads burn the quota early in the period and are frozen until the next one, so tail latency jumps by tens of ms while the average utilisation stays low. Diagnose with <code>cpu.stat</code> (<code>nr_throttled</code>, <code>throttled_usec</code>) or the container_cpu_cfs_throttled metrics. Fix by matching thread pools to the quota (GOMAXPROCS, JVM ActiveProcessorCount), raising or removing the limit and relying on requests/cpu.weight, shortening the period, or using cpuset (dedicated cores via the static CPU manager) for latency-critical pods.</p>`, followUps: ['Why does a multi-core node make it worse?', 'What does cpu.weight do instead?'] });
interview.push({ q: 'How does OverlayFS work, and what is copy-up?', level: 'I', a: `<p>OverlayFS merges a stack of read-only <code>lowerdir</code>s with one writable <code>upperdir</code> (plus a <code>workdir</code> for atomic operations) into a single <code>merged</code> view. Lookups check upper then lowers top-down. Reads of lower files use the lower directly. A write to a file that exists only in a lower layer triggers <b>copy-up</b>: the file (whole, though newer kernels can copy metadata only for chmod/chown) is copied to upper and modified there. Deleting a lower file creates a whiteout; deleting a lower directory makes an opaque dir. Docker images are such layers, so many containers share lowerdirs. Implications: first-write latency for big files, writable layer is ephemeral, use volumes for databases, and deleting files in a later Dockerfile layer does not shrink the image.</p>`, followUps: ['What are lazy-pulling snapshotters?', 'Why can rename of a directory give EXDEV?'] });
interview.push({ q: 'Compare select, poll and epoll.', level: 'B', a: `<p>select takes bitmask sets limited to FD_SETSIZE (1024), is modified in place so must be rebuilt each call, and the kernel scans all n fds: O(n). poll uses an array of pollfd structures with no fixed limit, but still copies and scans all n each call. epoll registers interest once (<code>epoll_ctl</code>) in a kernel red-black tree and keeps a ready list filled by wake-up callbacks, so <code>epoll_wait</code> returns only ready events: O(ready) plus O(log n) per add/remove. epoll is Linux-only (BSD has kqueue, Windows IOCP). For few fds or portability poll/select are fine; for thousands of fds epoll wins.</p>`, followUps: ['Why does epoll not work on regular files?', 'What is EPOLLEXCLUSIVE?'] });
interview.push({ q: 'Level-triggered vs edge-triggered epoll: when do you pick which, and what is the rule for ET?', level: 'I', a: `<p>LT reports an fd every time you call epoll_wait while it is still ready; partial reads are safe because you will be told again. ET reports only on a state transition (new data arrived), so you must consume everything: non-blocking fds and loop on read/accept/write until <code>EAGAIN</code>, otherwise remaining data is stuck until new data arrives. ET reduces wake-ups and duplicates in multi-threaded loops (combine with EPOLLONESHOT), but is harder to get right and needs per-connection buffering for partial reads and writes plus fairness limits so one busy fd cannot starve others. Default to LT; choose ET when profiling shows epoll wake-ups matter and you can guarantee a drain loop.</p>`, followUps: ['How do you avoid starving other fds in an ET drain loop?', 'What happens with ET and EPOLLOUT?'] });
interview.push({ q: 'What problem does io_uring solve that epoll does not?', level: 'A', a: `<p>epoll is a readiness mechanism: it says "you may read now" and you still make one syscall per operation, and it cannot do asynchronous regular-file I/O. io_uring is a completion mechanism: you submit operations (read, write, accept, recv, send, fsync, ...) into a shared submission ring, the kernel performs them and posts results into a completion ring. Batching amortises syscall cost (1 enter for many ops, or 0 with SQPOLL), registered files/buffers cut per-op overhead, linked SQEs express dependencies, and it unifies disk and network. It matters at high IOPS (NVMe, storage engines, proxies at extreme rates). Trade-offs: buffer lifetime management, a large and historically bug-prone kernel attack surface (often blocked in container sandboxes), and kernel-version feature differences.</p>`, followUps: ['What is SQPOLL and its cost?', 'How do you size the CQ?'] });
interview.push({ q: 'Walk through the copies and context switches in read()+write() vs sendfile().', level: 'I', a: `<p>read+write (file hot in cache): page cache → user buffer (CPU copy #1), user buffer → socket buffer (CPU copy #2), socket buffer → NIC (DMA); two syscalls = four user/kernel crossings. If the file is cold, add a DMA disk → page cache first (four copies total, two by CPU). sendfile: page cache → socket buffer inside the kernel (one CPU copy, or none with NIC scatter-gather where only descriptors are queued), then DMA to NIC; one syscall = two crossings. splice moves page references via a pipe with two syscalls, mmap removes the read copy but adds page-fault costs and SIGBUS risk. Zero-copy is only useful when you do not need to inspect/transform the data; otherwise use kTLS or accept the copy.</p>`, followUps: ['Why does Kafka use sendfile?', 'What breaks sendfile with TLS and how does kTLS fix it?'] });
interview.push({ q: 'Why is user-space TLS at odds with zero-copy, and what are the options?', level: 'A', a: `<p>sendfile and splice move plaintext pages from page cache to the socket without user-space involvement, but TLS requires encrypting every record, which in a user-space library (OpenSSL) means the bytes must be copied into a buffer, encrypted, and written: back to read+write with extra CPU work. Options: kernel TLS (kTLS) where user space does the handshake and then hands session keys to the kernel via the tls ULP so sendfile works with in-kernel encryption; NIC TLS offload for inline encryption in hardware (zero CPU data touches); or terminate TLS at a dedicated tier. Netflix OpenConnect uses kTLS+sendfile (and NIC offload) to push hundreds of Gb/s per server. Trade-offs: kernel version and cipher support, key update handling, and observability.</p>`, followUps: ['What about HTTP/3 (QUIC) and zero-copy?', 'How do you handle compressed responses?'] });
interview.push({ q: 'Type 1 vs Type 2 hypervisors, and where does KVM fit?', level: 'B', a: `<p>Type 1 runs on bare metal and manages hardware itself (ESXi, Xen, Hyper-V); Type 2 runs as a process on a general-purpose host OS (VirtualBox, VMware Workstation). KVM is a Linux kernel module that exposes hardware virtualization (VT-x/AMD-V, EPT/NPT) through <code>/dev/kvm</code>; each vCPU is a normal thread and QEMU emulates devices in user space. The host kernel then acts as the hypervisor, so KVM is generally classed as Type 1 (the hypervisor is in the kernel on bare metal) even though it lives in a full OS - a good answer says the classification is about where the hypervisor runs and how much sits between it and hardware. Public clouds use KVM-based stacks (Nitro uses a minimal KVM plus hardware offload cards).</p>`, followUps: ['What are virtio and SR-IOV?', 'What is nested virtualization?'] });
interview.push({ q: 'How would you secure containers that run untrusted, AI-generated code?', level: 'E', a: `<p>Defence in depth, starting from the threat model: assume the code attempts kernel exploits, network exfiltration, resource exhaustion and escape. Layer 1: run each job in a microVM (Firecracker/Kata) or a user-space kernel (gVisor), so the shared host kernel surface is removed or shrunk. Layer 2 inside: unprivileged user (user namespace, rootless), all capabilities dropped, strict seccomp allow-list, read-only rootfs with a small tmpfs, no host mounts or sockets. Layer 3 resources: cgroup limits (memory.max, cpu.max, pids.max, io.max), wall-clock timeouts, disk quotas. Layer 4 network: default deny egress, allow-list proxies, no metadata service access. Layer 5 hygiene: ephemeral sandboxes (fresh overlay or snapshot per run), no secrets in the image or env, audit logging, and patched hosts. Test escapes regularly and monitor syscalls with eBPF.</p>`, followUps: ['Why is io_uring often blocked in these sandboxes?', 'Cost of one microVM per request vs a warm pool?'] });
interview.push({ q: 'You need to serve 1M idle WebSocket connections on one Linux box. What do you tune?', level: 'E', a: `<p>Architecture: thread-per-core epoll loops with SO_REUSEPORT, non-blocking I/O, tiny per-connection state, timer wheel for idle timeouts. Memory is the cost: ~20-40 KB per connection (kernel socket + buffers + TLS + app), so budget 20-40 GB; keep tcp_rmem/tcp_wmem minimums low and let autotuning grow only active sockets; free buffers when idle. Limits: ulimit -n and fs.nr_open above 1M, somaxconn/backlog, conntrack table size (or bypass), ephemeral ports on the client side, kernel keepalive plus app heartbeats. Put the process in a cgroup sized at measured peak + headroom, use cpu.weight rather than a hard quota, and watch PSI. Operational: jittered client reconnect backoff to survive restart storms, graceful drain on deploy, load tests with realistic idle/active ratios, and observability (ss -s, /proc/net/sockstat, per-core event loop lag).</p>`, followUps: ['How would you shard users across machines?', 'What dominates when 2% become active at once?'] });
registerModule({
  id: 'cs09',
  title: 'Containers, Virtualization & High-Performance I/O',
  lang: 'cpp',
  intro: `<p>This module explains what is really underneath <b>virtual machines, containers and fast servers</b>. You will see how a hypervisor tricks an OS into thinking it owns the hardware, how Linux builds a "container" out of <b>namespaces, cgroups and overlay filesystems</b>, and how high-performance servers use <b>epoll, io_uring and zero-copy</b> to serve huge numbers of connections. Each idea starts with an everyday analogy, then moves to real commands, compiling C++ code and runnable Python simulations, then to expert-level details, and finally to how AI workloads change the picture. It is a favourite area for senior systems, SRE and infrastructure interviews.</p>`,
  goals: [
    'Explain Type 1 vs Type 2 hypervisors, VT-x VM exits and EPT, and choose between VMs, containers and microVMs for a threat model',
    'Map every part of <code>docker run</code> to namespaces, cgroups v2 and overlayfs, and diagnose OOM kills and CPU throttling with real numbers',
    'Choose select, poll, epoll (LT vs ET with the drain-until-EAGAIN rule) or io_uring for a workload and justify it by cost',
    'Count copies and context switches for read+write, mmap, sendfile and splice, and decide when zero-copy applies'
  ],
  prereqs: `CS Core earlier modules on processes, virtual memory and sockets (system calls, page cache, TCP basics). Comfort reading small C/C++ snippets helps.`,
  hours: 12,
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
