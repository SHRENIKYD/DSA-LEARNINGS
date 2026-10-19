(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes in shell code stay exactly as typed
  var LAB = 'Your own Linux machine, WSL, or a throwaway container (<code>docker run -it --rm ubuntu:24.04 bash</code>). No cloud account needed.';
  // Compact problem builder: every problem has the same shape; all code is bash.
  function P(o) {
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || LAB, example: o.ex,
      brute: { why: o.bw },
      mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, code: { lang: 'bash', code: o.code }, complexity: o.cx, followUps: o.f }
    };
    if (o.bc) p.brute.code = { lang: 'bash', code: o.bc };
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function one(k, v) { var h = {}; h[k] = v; return h; }

  // ───────────────────────── Topic 1: filesystem layout ─────────────────────────
  topics.push({
    title: 'Filesystem Layout and Navigation: Where Things Live and What Fills the Disk',
    analogy: `<p>A Linux server is a <b>well-run hotel</b>. <code>/etc</code> is the manager's office with all the rule books (config). <code>/var</code> is the laundry and storage room: things that grow every day (logs, caches, databases). <code>/home</code> holds the guest rooms. <code>/usr</code> is the kitchen equipment the hotel bought (installed programs). <code>/tmp</code> is the lobby table anyone may leave things on. Once you know the floor plan, you know where to look when the laundry room overflows.</p>`,
    explain: `<p>🟢 <b>One tree, one root.</b> Linux has no <code>C:</code> or <code>D:</code> drive. Everything hangs off a single root <code>/</code>. Extra disks are <b>mounted</b> onto a folder inside that tree (for example a cloud data disk at <code>/data</code>). This layout is called the <b>Filesystem Hierarchy Standard (FHS)</b>, and every mainstream distro follows it.</p>
      ${H.table(['Path', 'What lives there', 'Cloud-support reason to care'], [
        ['<code>/etc</code>', 'system-wide config files (text)', 'nginx, sshd, cron, fstab - most fixes are an edit here'],
        ['<code>/var/log</code>', 'log files (syslog, auth.log, nginx/)', 'first stop when something breaks; also the #1 disk filler'],
        ['<code>/var/lib</code>', 'app state: docker images, databases, package DB', 'Docker images can quietly eat 50 GB here'],
        ['<code>/home</code>, <code>/root</code>', 'users\' home folders; root\'s home', 'SSH keys live in <code>~/.ssh</code>'],
        ['<code>/usr/bin</code>, <code>/usr/lib</code>', 'programs and libraries from packages', 'never hand-edit; the package manager owns it'],
        ['<code>/opt</code>, <code>/usr/local</code>', 'software you installed by hand', 'vendor agents (monitoring, backup) often land here'],
        ['<code>/tmp</code>', 'scratch space, often cleared on reboot', 'world-writable, sticky bit; can be RAM-backed (tmpfs)'],
        ['<code>/proc</code>, <code>/sys</code>', 'virtual files the kernel generates live', 'no disk space used; see CS Core 8'],
        ['<code>/dev</code>', 'devices: disks (<code>/dev/nvme0n1</code>, <code>/dev/xvda</code>), <code>/dev/null</code>', 'which disk is which when you attach a volume'],
        ['<code>/mnt</code>, <code>/media</code>, <code>/data</code>', 'mount points for extra disks', 'a full root disk is often fixed by moving data to a new volume']
      ])}
      <p>🟢 <b>Getting around.</b> <code>pwd</code> prints where you are. <code>cd /var/log</code> uses an <b>absolute</b> path (starts with <code>/</code>). <code>cd nginx</code> is <b>relative</b> to where you are now. <code>..</code> means "one level up", <code>.</code> means "here", <code>~</code> means your home folder and <code>cd -</code> jumps back to the previous folder. <code>ls -lah</code> lists everything, including hidden dot-files, with human sizes.</p>
      <p>🔵 <b>Finding things.</b> <code>find /etc -name '*.conf'</code> searches by name. <code>find /var -type f -size +500M</code> finds big files. <code>which nginx</code> shows which program runs when you type a command. <code>file x</code> tells you what kind of file <code>x</code> is.</p>
      <p>🔵 <b>Space questions - the two commands everyone uses.</b> <code>df -h</code> answers "how full is each <b>filesystem</b>?" <code>du -sh DIR</code> answers "how much space does this <b>folder</b> use?" The everyday recipe for <i>"the disk is full"</i> is: <code>df -h</code> to see which filesystem, then <code>du</code> sorted by size to walk down into the biggest folder, until you find the culprit (usually a log, a core dump, old Docker images or a forgotten backup).</p>
      ${H.table(['Symptom', 'Command', 'What it tells you'], [
        ['"No space left on device"', '<code>df -h</code>', 'which mount is at 100%'],
        ['but df shows free space', '<code>df -i</code>', 'out of <b>inodes</b> (too many tiny files)'],
        ['deleted a 20 GB log, df did not change', '<code>sudo lsof +L1</code>', 'a process still holds the deleted file open'],
        ['which folder is big', '<code>sudo du -xh --max-depth=1 / | sort -h</code>', 'biggest top-level folders on this disk only']
      ])}`,
    clues: [
      '"No space left on device" / "disk 100% full" / "the app stopped writing logs" → <code>df -h</code> then <code>du</code> drill-down',
      '"df says full but du adds up to much less" → a deleted file is still open: <code>lsof +L1</code>, then restart or truncate',
      '"df -h shows space but cannot create files" → inode exhaustion: <code>df -i</code>, find the folder with millions of small files',
      '"where is the config for X" → <code>/etc/X</code>; "where are the logs" → <code>/var/log</code> or <code>journalctl</code>',
      '"attached a new EBS / managed disk but cannot see it" → <code>lsblk</code>, make a filesystem, mount it, add to <code>/etc/fstab</code>',
      '"command not found but it is installed" → check <code>PATH</code>, <code>which</code>, <code>/usr/local/bin</code> vs <code>/usr/bin</code>'
    ],
    code: [R`# Lab: run inside 'docker run -it --rm ubuntu:24.04 bash' or any Linux shell.
# 1. Where am I, and what is around me?
pwd                       # print working directory, e.g. /root
cd /var/log && ls -lah    # absolute path, long listing, hidden files, human sizes
cd ..                     # up one level -> /var
cd -                      # back to the previous folder (/var/log)
cd ~                      # home folder

# 2. How full are the filesystems? (-h = human readable, -T = show type)
df -hT
df -i                     # inode usage: "files" can run out before "bytes"

# 3. Which top-level folders are biggest? -x = stay on this filesystem
sudo du -xh --max-depth=1 / 2>/dev/null | sort -h | tail -n 10

# 4. Drill into the winner, one level at a time
sudo du -xh --max-depth=1 /var 2>/dev/null | sort -h | tail -n 5

# 5. Find single big files (over 200 MB) and show the 10 largest
sudo find / -xdev -type f -size +200M -printf '%s %p\n' 2>/dev/null | sort -n | tail -n 10

# 6. Disks and mounts: what is plugged in and where it is mounted
lsblk -f                  # block devices, filesystems, mount points
findmnt /                 # what is mounted at /`],
    codeTitle: ['Navigation and disk-space toolkit'],
    viz: [{
      title: 'Disk is full: df then du drill-down',
      input: 'var=18 usr=6 home=3 opt=2 tmp=1',
      inputLabel: 'top-level folders as name=GB (disk size is 32 GB)',
      gen: function (input) {
        var parts = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        if (!parts.length || parts.length > 8) throw new Error('Give 1-8 folders like: var=18 usr=6 home=3');
        var dirs = parts.map(function (p) {
          var m = p.match(/^([a-z0-9_.-]+)=(\d+(?:\.\d+)?)$/i);
          if (!m) throw new Error('Use name=GB, e.g. var=18 usr=6 home=3');
          return { name: '/' + m[1], gb: Number(m[2]) };
        });
        var total = dirs.reduce(function (s, d) { return s + d.gb; }, 0);
        var disk = 32;
        if (total > 64) throw new Error('Keep the total under 64 GB for this demo');
        if (total > disk) disk = Math.ceil(total);
        var pct = Math.round(total / disk * 100);
        var f = [];
        f.push({ narr: 'An alert fires: <b>"No space left on device"</b>. Step 1 is always <code>df -h</code>. It shows each <b>filesystem</b>, not each folder. The root filesystem <code>/</code> is <b>' + pct + '%</b> full.', parts: [
          { type: 'table', label: 'df -h', columns: ['Filesystem', 'Size', 'Used', 'Avail', 'Use%', 'Mounted on'], rows: [['/dev/nvme0n1p1', disk + 'G', total + 'G', (disk - total) + 'G', pct + '%', '/'], ['tmpfs', '2G', '0', '2G', '0%', '/dev/shm']], hl: { 0: pct >= 90 ? 'bad' : 'cur' } },
          { type: 'bars', label: 'disk usage % of /', values: [pct], texts: [pct + '%'], hl: { 0: pct >= 90 ? 'bad' : 'cur' } }
        ] });
        var sorted = dirs.slice().sort(function (a, b) { return a.gb - b.gb; });
        f.push({ narr: 'Step 2: <code>sudo du -xh --max-depth=1 / | sort -h</code>. <code>-x</code> keeps du on this one disk, so it skips <code>/proc</code> and other mounts. <code>sort -h</code> understands sizes like 6G and 512M, so the biggest folder ends up <b>last</b>.', parts: [
          { type: 'bars', label: 'du per top-level folder (GB)', values: sorted.map(function (d) { return d.gb; }), idxLabels: sorted.map(function (d) { return d.name; }) }
        ] });
        var big = sorted[sorted.length - 1];
        f.push({ narr: 'The biggest is <b>' + big.name + '</b> with ' + big.gb + ' GB. That is ' + Math.round(big.gb / total * 100) + '% of everything used. We only dig into the winner - checking every folder wastes time during an outage.', parts: [
          { type: 'bars', label: 'du per top-level folder (GB)', values: sorted.map(function (d) { return d.gb; }), idxLabels: sorted.map(function (d) { return d.name; }), hl: one(sorted.length - 1, 'bad') }
        ] });
        var sub = big.name === '/var' ? ['log', 'lib', 'cache'] : big.name === '/home' ? ['deploy', 'alice', 'bob'] : ['data', 'lib', 'share'];
        var split = [0.78, 0.17, 0.05].map(function (r) { return Math.round(big.gb * r * 10) / 10; });
        f.push({ narr: 'Step 3: repeat one level down: <code>sudo du -xh --max-depth=1 ' + big.name + ' | sort -h</code>. Again one child dominates: <b>' + big.name + '/' + sub[0] + '</b>.', parts: [
          { type: 'bars', label: 'inside ' + big.name + ' (GB)', values: split.slice().reverse(), idxLabels: sub.slice().reverse().map(function (s) { return big.name + '/' + s; }), hl: one(2, 'bad') }
        ] });
        var culprit = big.name === '/var' ? '/var/log/app/debug.log' : big.name + '/' + sub[0] + '/backup-old.tar.gz';
        f.push({ narr: 'Step 4: find the single big file: <code>sudo find ' + big.name + '/' + sub[0] + ' -xdev -type f -size +1G</code>. The culprit is <b>' + culprit + '</b> (' + split[0] + ' GB). ' + (big.name === '/var' ? 'Classic: someone left DEBUG logging on and there is no log rotation.' : 'Classic: an old backup nobody remembered.'), parts: [
          { type: 'table', label: 'find output', columns: ['size', 'path'], rows: [[split[0] + 'G', culprit]], hl: { 0: 'bad' } }
        ] });
        f.push({ narr: 'Step 5: free space <b>safely</b>. If a running process writes the file, do <b>not</b> <code>rm</code> it: the process keeps the space until it restarts. Empty it in place with <code>sudo truncate -s 0 ' + culprit + '</code>, then fix the cause (log level, logrotate). If it is an old archive, move it to object storage, then delete.', parts: [
          { type: 'code', label: 'safe fix', lang: 'bash', code: 'sudo lsof ' + culprit + '   # is anyone writing it?\nsudo truncate -s 0 ' + culprit + '\ndf -h /', hl: { 2: 'ok' } }
        ] });
        var after = Math.round((total - split[0]) / disk * 100);
        f.push({ narr: 'Step 6: confirm with <code>df -h /</code>. Usage dropped from ' + pct + '% to <b>' + after + '%</b>. Last step: write down the root cause and add a guard (logrotate rule or a disk alert at 80%) so it does not happen again at 3 a.m.', parts: [
          { type: 'bars', label: 'disk usage % of / (before, after)', values: [pct, after], idxLabels: ['before', 'after'], hl: { 0: 'bad', 1: 'ok' } }
        ] });
        return f;
      }
    }, {
      title: 'cd step by step: absolute, relative, .., ~ and -',
      input: 'cd /var/log; cd nginx; cd ..; cd ../../etc; cd ~; cd -',
      inputLabel: 'cd commands separated by ; (start is /home/deploy)',
      gen: function (input) {
        var cmds = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!cmds.length || cmds.length > 10) throw new Error('Give 1-10 cd commands separated by ;');
        var home = '/home/deploy', cwd = home, old = home;
        function norm(path) {
          var out = [];
          path.split('/').forEach(function (seg) {
            if (!seg || seg === '.') return;
            if (seg === '..') { out.pop(); return; }
            out.push(seg);
          });
          return '/' + out.join('/');
        }
        var f = [{ narr: 'You just logged in by SSH, so you start in your <b>home folder</b>. <code>pwd</code> prints it. The shell also remembers the previous folder in <code>OLDPWD</code> so <code>cd -</code> can jump back.', parts: [{ type: 'vars', label: 'shell state', vals: { PWD: cwd, OLDPWD: old, HOME: home } }] }];
        cmds.forEach(function (c) {
          var m = c.match(/^cd(?:\s+(\S+))?$/);
          if (!m) throw new Error('Each step must look like: cd PATH (got "' + c + '")');
          var arg = m[1] || '~', target, why;
          if (arg === '~' || arg === '') { target = home; why = '<code>~</code> (or plain <code>cd</code>) always means your home folder.'; }
          else if (arg === '-') { target = old; why = '<code>cd -</code> swaps to <code>OLDPWD</code>, the folder you were in before.'; }
          else if (arg.charAt(0) === '/') { target = norm(arg); why = 'It starts with <code>/</code>, so it is an <b>absolute</b> path: where you are now does not matter.'; }
          else if (arg.charAt(0) === '~') { target = norm(home + arg.slice(1)); why = '<code>~/x</code> means "x inside my home folder".'; }
          else { target = norm(cwd + '/' + arg); why = 'No leading <code>/</code>, so it is <b>relative</b> to the current folder <code>' + cwd + '</code>. Each <code>..</code> removes one folder from the end.'; }
          old = cwd; cwd = target;
          f.push({ narr: '<code>' + H.esc(c) + '</code>: ' + why + ' New location: <b>' + cwd + '</b>.', parts: [
            { type: 'vars', label: 'shell state', vals: { PWD: cwd, OLDPWD: old, HOME: home }, hl: { PWD: 'ok', OLDPWD: 'cur' } },
            { type: 'array', label: 'path pieces from /', values: ['/'].concat(cwd.split('/').filter(Boolean)), hl: one(cwd.split('/').filter(Boolean).length, 'ok') }
          ] });
        });
        f.push({ narr: 'Done. Tip: when a runbook says "go to the app folder", prefer absolute paths in scripts (they work from anywhere) and relative paths only when typing by hand.', parts: [{ type: 'vars', label: 'final shell state', vals: { PWD: cwd, OLDPWD: old }, hl: { PWD: 'sel' } }] });
        if (f.length < 4) f.push({ narr: 'Add more cd steps to see how OLDPWD and relative paths move you around.', parts: [{ type: 'text', html: 'Try: <code>cd /etc; cd ssh; cd ..; cd -</code>' }] });
        return f;
      }
    }],
    examples: [
      { title: 'Ticket: "Website down, disk full" on a small VM', html: `<p>A customer's 20 GB VM stopped serving pages. nginx error log says <code>No space left on device</code>. You run <code>df -h</code>: <code>/</code> is ${H.c('r', '100%')}. <code>du</code> drill-down points to <code>/var/log/nginx/access.log</code> at 14 GB because log rotation was disabled. You truncate it in place (nginx keeps the file open), re-enable logrotate, and the site is back. Root cause: missing rotation, not "too small a disk".</p>`, code: `df -h /
sudo du -xh --max-depth=1 /var | sort -h | tail -n 3
sudo du -h /var/log/nginx/* | sort -h | tail -n 3
sudo truncate -s 0 /var/log/nginx/access.log   # empty in place; nginx keeps writing
sudo logrotate -f /etc/logrotate.d/nginx       # force one rotation to test the rule
df -h /` },
      { title: 'Deleted the big file but df did not change', html: `<p>Someone ran <code>rm /var/log/app.log</code> (8 GB) but <code>df</code> still shows 100%. On Linux a file's space is only freed when the <b>last</b> open handle closes. The app still has it open. <code>lsof +L1</code> lists open files with zero links (deleted). Restart the app (or truncate via <code>/proc/PID/fd/N</code>) and the space comes back.</p>`, code: `sudo lsof +L1 | head                     # look for "(deleted)" with a big SIZE
# COMMAND  PID  USER  FD  TYPE  SIZE/OFF    NLINK  NAME
# java     2211 app   7w  REG   8589934592  0      /var/log/app.log (deleted)
sudo systemctl restart app               # closing the handle frees the space
df -h /` },
      { title: 'Plenty of GB free, yet "No space left"', html: `<p><code>df -h</code> says 40% used, but creating a file fails. Check <b>inodes</b>: every file needs one, and a filesystem has a fixed number. <code>df -i</code> shows ${H.c('r', 'IUse% 100%')}. A PHP session folder had 3 million tiny files. Count files per folder to find it, then clean them up with <code>find -delete</code>.</p>`, code: `df -i /
# Count files per top-level folder under /var (biggest last)
for d in /var/*; do echo "$(sudo find "$d" -xdev -type f 2>/dev/null | wc -l) $d"; done | sort -n | tail -n 3
sudo find /var/lib/php/sessions -type f -mtime +2 -delete   # remove sessions older than 2 days` },
      { title: 'Attach and mount a new data disk', html: `<p>The fix for a growing database is often a separate volume. After attaching a disk in the cloud console it shows up as a raw block device. You make a filesystem, mount it, and add it to <code>/etc/fstab</code> by UUID (device names can change across reboots). <code>nofail</code> stops a missing disk from blocking boot. Practise this on a loop file inside a VM, never on a disk that holds data.</p>`, code: `lsblk                                   # new disk appears, e.g. nvme1n1 with no MOUNTPOINT
sudo mkfs.ext4 /dev/nvme1n1             # ONLY on a new, empty disk: this erases it
sudo mkdir -p /data
sudo mount /dev/nvme1n1 /data
UUID=$(sudo blkid -s UUID -o value /dev/nvme1n1)
echo "UUID=$UUID /data ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
sudo mount -a && df -h /data            # mount -a tests fstab before the next reboot does` }
    ],
    deepDive: `<p>🟣 <b>What df and du really measure.</b> <code>df</code> asks the filesystem for its block counters (fast, includes deleted-but-open files and filesystem metadata). <code>du</code> walks the directory tree and adds up file sizes (slow on huge trees, cannot see deleted-but-open files, and double-counts nothing because it tracks hard links). So "df &gt; du" means hidden usage: open deleted files, files hidden <i>underneath</i> a mount point (data written to <code>/data</code> before the disk was mounted there), or reserved blocks. ext4 reserves 5% for root by default so root can still log in on a full disk; <code>tune2fs -m 1</code> lowers it on big data disks.</p>
      <p><b>Inodes.</b> An inode stores a file's metadata (owner, mode, size, block pointers) - everything except its name. Names live in directories, which map name → inode number. That is why a hard link is just a second name for the same inode, and why <code>rm</code> only removes a name: the data goes when the link count and the open-handle count both reach zero. ext4 fixes the inode count at <code>mkfs</code> time; XFS (default on RHEL and Amazon Linux) allocates them dynamically, so inode exhaustion is mostly an ext4 problem.</p>
      <p><b>Mount points and cloud disks.</b> Device names differ by platform: Xen-era AWS used <code>/dev/xvda</code>, Nitro instances show <code>/dev/nvme0n1</code>, Azure shows <code>/dev/sda</code> plus a temporary <code>/dev/sdb</code> (resource disk, wiped on redeploy - never keep data there). Always mount by <code>UUID=</code> or label in <code>/etc/fstab</code>. A wrong fstab line can stop the VM from booting, so test with <code>sudo mount -a</code> and use <code>nofail</code> for non-root disks. Growing a disk is two steps: grow the partition (<code>growpart</code>), then grow the filesystem (<code>resize2fs</code> for ext4, <code>xfs_growfs</code> for XFS).</p>
      <p><b>Performance of the hunt.</b> <code>du</code> on a tree with millions of files can take minutes and hammer the disk. On a live production box, prefer <code>--max-depth=1</code> plus <code>-x</code>, run it with <code>ionice -c3 nice</code>, and look at the obvious suspects first: <code>/var/log</code>, <code>/var/lib/docker</code>, <code>/var/cache</code>, <code>/tmp</code>, home folders and core dumps (<code>coredumpctl list</code>). <code>ncdu</code> is a friendly interactive du if you can install it.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> paste a <code>df -h</code> and <code>du</code> output into an assistant and it will spot the culprit and draft a logrotate rule in seconds. That is genuinely useful during an outage. <b>Where it goes wrong:</b> assistants happily suggest <code>rm -rf /var/log/*</code> (destroys audit evidence and does not free space held by open files), <code>docker system prune -a</code> on a shared host (deletes images other teams need), or <code>mkfs</code> on the wrong device name. They also mix up Ubuntu and RHEL paths.</p>
      <p><b>Use AI as a partner:</b> ask "<i>explain each flag in this du command</i>" or "<i>write a script that reports the 5 biggest folders under /var without crossing filesystems</i>", then read it before running. <b>What you must still own:</b> the mental model (filesystem vs folder, inode vs block, open handles keep space), and the judgement of what is safe to delete on someone else's server. Destructive commands should always be reviewed by a human, and preferably tested in a container first.</p>`,
    problems: [P({
      t: 'Root disk 100% full on a web server', l: 'Easy', tags: ['df', 'du', 'disk', 'logs'], co: ['AWS Support', 'Rackspace'],
      s: `<p>A customer reports their Ubuntu web VM returns HTTP 500 and the app log ends with <code>No space left on device</code>. You have SSH access with sudo. Find what filled the disk, free space <b>without breaking the running app</b>, and make sure it does not happen again.</p>`,
      ex: `<p><code>df -h /</code> → ${H.c('r', '/dev/nvme0n1p1 20G 20G 0 100% /')}. Drill-down: <code>/var</code> 15G → <code>/var/log</code> 14G → <code>/var/log/myapp/app.log</code> ${H.c('r', '13G')}. Truncate it in place, add a logrotate rule, and <code>df</code> drops to ${H.c('g', '35%')}.</p>`,
      bw: `<p>Guessing and deleting: <code>sudo rm -rf /var/log/*</code>. It destroys logs you need for the root cause, may not free space at all (the app still holds <code>app.log</code> open), and can break services that expect their log folders to exist.</p>`,
      bc: `sudo rm -rf /var/log/*     # loses evidence; space held by open files is NOT freed
df -h /                     # often still 100%`,
      q: ['The 13 GB file is still being written by the app. What is the safest way to free its space now?', ['<code>sudo truncate -s 0 app.log</code>', '<code>sudo rm app.log</code>', '<code>sudo mv app.log /tmp/</code>', 'Reboot the server'], 0, 'truncate empties the file in place, so the app keeps writing to the same inode and the space is released at once. rm only removes the name while the app holds the space; mv to /tmp on the same disk frees nothing; a reboot works but causes downtime and hides the cause.'],
      h: ['<p>Hint 1: start with the filesystem view (<code>df -h</code>), not the folder view. You need to know <i>which</i> mount is full first.</p>', '<p>Hint 2: walk down with <code>du -xh --max-depth=1 DIR | sort -h</code> and only follow the biggest child each time.</p>', '<p>Hint 3: before deleting, check <code>lsof FILE</code>. If a process writes it, truncate instead of rm. Then fix the cause: a logrotate rule and an alert at 80%.</p>'],
      a: `<p>1) <code>df -h</code> confirms <code>/</code> is full. 2) <code>du -xh --max-depth=1</code> from <code>/</code>, then <code>/var</code>, then <code>/var/log</code>, each time following the biggest folder. 3) <code>find</code> shows <code>/var/log/myapp/app.log</code> at 13 GB. 4) <code>lsof</code> shows the app has it open, so <code>truncate -s 0</code> empties it in place (optionally keep the last lines first with <code>tail -n 5000</code> for the incident notes). 5) Prevent a repeat: add <code>/etc/logrotate.d/myapp</code> with daily rotation, compression and <code>copytruncate</code> (the app does not reopen its log), test it with <code>logrotate -d</code>, and suggest a disk-usage alert at 80%. Tell the customer the root cause in one sentence.</p>`,
      code: `# 1. Which filesystem is full?
df -h /
# 2. Drill down one level at a time, staying on this disk (-x)
sudo du -xh --max-depth=1 / 2>/dev/null | sort -h | tail -n 3
sudo du -xh --max-depth=1 /var/log 2>/dev/null | sort -h | tail -n 3
# 3. Find big single files
sudo find /var/log -xdev -type f -size +1G -exec ls -lh {} \\;
# 4. Keep the last lines for the incident notes, then empty the file in place
sudo tail -n 5000 /var/log/myapp/app.log > ~/app-log-tail.txt
sudo lsof /var/log/myapp/app.log          # confirms the app still has it open
sudo truncate -s 0 /var/log/myapp/app.log
df -h /
# 5. Prevent a repeat with a logrotate rule
sudo tee /etc/logrotate.d/myapp > /dev/null <<'EOF'
/var/log/myapp/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
EOF
sudo logrotate -d /etc/logrotate.d/myapp   # dry run: shows what it would do`,
      cx: `<p>About 5 minutes of commands. <code>du</code> cost grows with the number of files, so limit depth and stay on one filesystem. Risk: low, because nothing is deleted blindly.</p>`,
      f: ['What would you check if df still showed 100% after the truncate?', 'Why might copytruncate lose a few log lines, and what is the alternative?']
    })]
  });

  // ───────────────────────── Topic 2: permissions & ownership ─────────────────────────
  topics.push({
    title: 'Permissions and Ownership in Practice: chmod, chown, umask and the 403 on a Web Root',
    analogy: `<p>Getting to a file is like walking to a <b>desk deep inside an office building</b>. You need permission to pass <b>every door on the way</b> (each folder in the path), not just the desk at the end. If the third-floor door is locked for you, it does not matter that the desk itself says "everyone welcome". Most "Permission denied" tickets are a locked door halfway down the corridor.</p>`,
    explain: `<p>🟢 <b>Quick recap (full detail in CS Core 8).</b> Every file has an <b>owner</b>, a <b>group</b> and nine permission bits: <code>rwx</code> for owner, group and other. Octal digits add up r=4, w=2, x=1, so <code>755</code> = <code>rwxr-xr-x</code> and <code>640</code> = <code>rw-r-----</code>. Here we focus on <b>using</b> them to fix real tickets.</p>
      <p>🟢 <b>What the bits mean on a folder.</b> This is where most people trip:</p>
      ${H.table(['Bit', 'On a file', 'On a directory'], [
        ['<b>r</b>', 'read the contents', 'list the names inside (<code>ls</code>)'],
        ['<b>w</b>', 'change the contents', 'create, delete, rename entries inside'],
        ['<b>x</b>', 'run it as a program', '<b>enter / pass through</b> it (<code>cd</code>, open files inside)']
      ])}
      <p>So a web server needs <b>x on every directory</b> from <code>/</code> down to the site, and <b>r on the file</b> it serves. Missing x on one parent folder gives <code>403 Forbidden</code> in nginx and <code>Permission denied</code> in the error log.</p>
      <p>🔵 <b>The four commands.</b></p>
      ${H.table(['Command', 'Example', 'Effect'], [
        ['<code>chmod</code> (octal)', '<code>chmod 640 app.conf</code>', 'set all nine bits at once'],
        ['<code>chmod</code> (symbolic)', '<code>chmod u+x,g-w,o= deploy.sh</code>', 'add / remove / set bits for u, g, o, a'],
        ['<code>chown</code>', '<code>sudo chown -R deploy:www-data /var/www/site</code>', 'change owner and group (root only)'],
        ['<code>chgrp</code>', '<code>chgrp www-data uploads</code>', 'change only the group (you must be in it)'],
        ['<code>umask</code>', '<code>umask 027</code>', 'bits to <b>remove</b> from every new file (666) and folder (777)']
      ])}
      <p>🔵 <b>Diagnose before you change.</b> <code>namei -l /var/www/site/index.html</code> prints owner, group and mode of <b>every</b> folder in the path, so the locked door jumps out. <code>stat -c '%A %U:%G %n' file</code> gives one file's details. <code>sudo -u www-data cat /var/www/site/index.html</code> tests access <i>as the web server user</i> - the most honest test there is.</p>
      <p>🔵 <b>Safe defaults for a web root:</b> folders <code>755</code> (or <code>750</code> with the web server's group), files <code>644</code> (or <code>640</code>), owned by a <b>deploy</b> user, group <code>www-data</code> (Ubuntu) or <code>nginx</code>/<code>apache</code> (RHEL). Only an uploads folder gets group write. <span class="c-r">Never</span> "fix" it with <code>chmod -R 777</code>: that lets any process on the box rewrite your site.</p>`,
    clues: [
      '"nginx 403 Forbidden" + "Permission denied" in error.log → missing <b>x</b> on a parent folder or <b>r</b> on the file: <code>namei -l</code>',
      '"works as root but not as the app user" → test with <code>sudo -u USER</code>; ownership or group is wrong',
      '"script: Permission denied" when running <code>./deploy.sh</code> → missing execute bit: <code>chmod u+x</code> (or the disk is mounted <code>noexec</code>)',
      '"new files created by the app are not readable by the web server" → umask too strict, or wrong group: set <code>UMask=</code> in the unit or a setgid folder',
      '"someone did chmod -R 777 to fix it" → security finding; restore 755/644 and correct ownership',
      '"Operation not permitted" even as root → immutable flag (<code>lsattr</code>/<code>chattr -i</code>) or SELinux/AppArmor, not plain rwx'
    ],
    code: [R`# Lab: run in a container: docker run -it --rm ubuntu:24.04 bash
# Set up a fake web root and a web-server-like user
useradd --system --no-create-home --shell /usr/sbin/nologin web
mkdir -p /srv/site && echo '<h1>hi</h1>' > /srv/site/index.html
chmod 700 /srv/site                      # deliberately break it: only root may enter

# 1. Reproduce the bug as the web user
su -s /bin/sh web -c 'cat /srv/site/index.html'   # -> Permission denied

# 2. Find the locked door: mode, owner, group of every component
apt-get update -qq && apt-get install -y -qq util-linux > /dev/null   # namei lives here
namei -l /srv/site/index.html

# 3. Fix with least privilege: group access for the web user, nothing for others
groupadd -f webgrp && usermod -aG webgrp web
chown -R root:webgrp /srv/site
chmod 750 /srv/site                      # rwx owner, r-x group, nothing for others
chmod 640 /srv/site/index.html           # rw- owner, r-- group
su -s /bin/sh web -c 'cat /srv/site/index.html'   # -> <h1>hi</h1>

# 4. Symbolic chmod for small, targeted changes
chmod u+x,g-w,o-rwx /srv/site/index.html
stat -c '%A %a %U:%G %n' /srv/site/index.html

# 5. umask: what will new files get?
umask                                    # e.g. 0022
(umask 027; touch /tmp/a; mkdir /tmp/b; stat -c '%a %n' /tmp/a /tmp/b)   # 640 and 750`],
    codeTitle: ['Reproduce and fix a web-root permission error'],
    viz: [{
      title: 'Path walk: can this user open the file?',
      input: 'www-data:www-data | / root root 755 | /var root root 755 | /var/www root root 755 | /var/www/site deploy deploy 750 | index.html deploy deploy 644',
      inputLabel: 'user:group1,group2 | then each path part as: name owner group mode (last part = the file)',
      gen: function (input) {
        var segs = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
        if (segs.length < 2 || segs.length > 9) throw new Error('Format: user:groups | / root root 755 | ... | file owner group mode');
        var ug = segs[0].split(':');
        var user = ug[0], groups = (ug[1] || ug[0]).split(',').map(function (g) { return g.trim(); });
        if (!/^[a-z_][a-z0-9_-]*$/i.test(user)) throw new Error('Start with a user name, e.g. www-data:www-data');
        var comps = segs.slice(1).map(function (s) {
          var w = s.split(/\s+/);
          if (w.length !== 4 || !/^[0-7]{3}$/.test(w[3])) throw new Error('Each part needs: name owner group mode (mode like 755), got "' + s + '"');
          return { name: w[0], owner: w[1], group: w[2], mode: w[3] };
        });
        var rows = [], f = [];
        f.push({ narr: 'User <b>' + user + '</b> (groups: ' + groups.join(', ') + ') wants to read the last item. The kernel checks <b>every</b> folder on the way: each one needs <b>x</b> (pass through). The file itself needs <b>r</b>. ' + (user === 'root' ? 'Root skips these checks for read/write.' : ''), parts: [
          { type: 'table', label: 'namei -l (what we will check)', columns: ['mode', 'owner', 'group', 'name'], rows: comps.map(function (c) { return [c.mode, c.owner, c.group, c.name]; }) }
        ] });
        var ok = true, failAt = -1;
        for (var i = 0; i < comps.length; i++) {
          var c = comps[i], last = i === comps.length - 1;
          var cls = user === c.owner ? 'owner' : groups.indexOf(c.group) >= 0 ? 'group' : 'other';
          var digit = Number(c.mode.charAt(cls === 'owner' ? 0 : cls === 'group' ? 1 : 2));
          var need = last ? 4 : 1, needName = last ? 'r' : 'x';
          var pass = user === 'root' || (digit & need) !== 0;
          rows.push([c.name, cls, String(digit), needName, pass ? 'OK' : 'DENIED']);
          var narr = '<b>' + c.name + '</b> (' + c.owner + ':' + c.group + ' ' + c.mode + '). ' + user + ' is <b>' + (cls === 'other' ? 'other' : 'the ' + cls) + '</b> here' + (cls === 'group' ? ' (member of ' + c.group + ')' : '') + ', so only the <b>' + cls + '</b> digit counts: <b>' + digit + '</b>. Linux uses the first class that matches and never falls back to another. Needs <b>' + needName + '</b> → ' + (pass ? '<span class="c-g">allowed</span>.' : '<span class="c-r">denied</span>.');
          f.push({ narr: narr, parts: [{ type: 'table', label: 'access check, one component at a time', columns: ['component', 'user is', 'digit', 'needs', 'result'], rows: rows.slice(), hl: one(i, pass ? 'ok' : 'bad') }] });
          if (!pass) { ok = false; failAt = i; break; }
        }
        if (ok) {
          f.push({ narr: '<span class="c-g">Every door opened.</span> nginx can serve the file and returns <b>200 OK</b>.', parts: [{ type: 'table', label: 'result', columns: ['component', 'user is', 'digit', 'needs', 'result'], rows: rows.slice(), hl: one(rows.length - 1, 'sel') }, { type: 'text', html: '<code>sudo -u ' + user + ' cat ' + comps[comps.length - 1].name + '</code> would succeed.' }] });
          f.push({ narr: 'Tip: try changing a folder mode to <b>700</b> or the file to <b>600</b> in the input box and watch where the walk stops.', parts: [{ type: 'text', html: 'Rule of thumb for web roots: folders <b>755</b>/<b>750</b>, files <b>644</b>/<b>640</b>.' }] });
        } else {
          var bad = comps[failAt];
          var lastBad = failAt === comps.length - 1;
          f.push({ narr: 'The walk stops at <b>' + bad.name + '</b>. Nothing after it is even looked at. nginx logs <code>open() "...' + comps[comps.length - 1].name + '" failed (13: Permission denied)</code> and the browser sees <b>403 Forbidden</b>.', parts: [{ type: 'table', label: 'result', columns: ['component', 'user is', 'digit', 'needs', 'result'], rows: rows.slice(), hl: one(failAt, 'bad') }] });
          f.push({ narr: 'Least-privilege fix: give the web server <b>group</b> access, not "everyone". Keep others at 0 where possible. <span class="c-r">Do not</span> run chmod -R 777.', parts: [{ type: 'code', label: 'fix', lang: 'bash', code: 'sudo chgrp ' + groups[0] + ' ' + bad.name + '\nsudo chmod g+' + (lastBad ? 'r' : 'rx') + ' ' + bad.name + '\nsudo -u ' + user + ' cat FILE   # re-test as the real user', hl: { 1: 'ok', 2: 'ok' } }] });
        }
        return f;
      }
    }, {
      title: 'Symbolic chmod: apply u/g/o changes to a mode',
      input: '644 u+x,g+w,o-r',
      inputLabel: 'start mode (octal) then a symbolic change list, e.g. 644 u+x,g+w,o-r or 777 go-w',
      gen: function (input) {
        var w = String(input || '').trim().split(/\s+/);
        if (w.length !== 2 || !/^[0-7]{3}$/.test(w[0])) throw new Error('Format: 644 u+x,g-w');
        var mode = parseInt(w[0], 8);
        var changes = w[1].split(',');
        if (changes.length > 6) throw new Error('At most 6 changes');
        function rwx(m) { var s = ''; for (var i = 8; i >= 0; i--) s += (m >> i) & 1 ? 'rwx'.charAt((8 - i) % 3) : '-'; return s; }
        function oct(m) { return ('00' + m.toString(8)).slice(-3); }
        var f = [{ narr: 'Start: <b>' + oct(mode) + '</b> = <code>' + rwx(mode) + '</code>. Bits from left to right: owner rwx, group rwx, other rwx. Symbolic chmod changes only the bits you name and leaves the rest alone - safer than retyping a full octal number.', parts: [{ type: 'bits', label: 'mode', value: mode, width: 9, dec: oct(mode) + '  ' + rwx(mode) }] }];
        changes.forEach(function (ch) {
          var m = ch.match(/^([ugoa]*)([+\-=])([rwx]*)$/);
          if (!m) throw new Error('Each change looks like u+x, go-w, a=r, o= (got "' + ch + '")');
          var who = m[1] || 'a'; if (who.indexOf('a') >= 0) who = 'ugo';
          var bits = 0; if (m[3].indexOf('r') >= 0) bits |= 4; if (m[3].indexOf('w') >= 0) bits |= 2; if (m[3].indexOf('x') >= 0) bits |= 1;
          var before = mode, hl = {};
          ['u', 'g', 'o'].forEach(function (cls, k) {
            if (who.indexOf(cls) < 0) return;
            var shift = (2 - k) * 3;
            if (m[2] === '+') mode |= bits << shift;
            else if (m[2] === '-') mode &= ~(bits << shift);
            else mode = (mode & ~(7 << shift)) | (bits << shift);
            for (var b = 0; b < 3; b++) hl[shift + b] = 'cur';
          });
          f.push({ narr: '<code>' + H.esc(ch) + '</code>: for <b>' + who.split('').map(function (c) { return { u: 'owner', g: 'group', o: 'other' }[c]; }).join(', ') + '</b> ' + (m[2] === '+' ? 'add' : m[2] === '-' ? 'remove' : 'set exactly') + ' <b>' + (m[3] || 'nothing') + '</b>. ' + oct(before) + ' → <b>' + oct(mode) + '</b>.', parts: [{ type: 'bits', label: 'mode after ' + H.esc(ch), value: mode, width: 9, dec: oct(mode) + '  ' + rwx(mode), hl: hl }] });
        });
        f.push({ narr: 'Result: <code>chmod ' + H.esc(w[1]) + '</code> on a <b>' + w[0] + '</b> file gives <b>' + oct(mode) + '</b> (<code>' + rwx(mode) + '</code>). ' + ((mode & 2) ? '<span class="c-r">Warning: other has write - anyone on the box can change this file.</span>' : 'No world-write: good.'), parts: [{ type: 'bits', label: 'final mode', value: mode, width: 9, dec: oct(mode), hl: (mode & 2) ? { 1: 'bad' } : {} }, { type: 'text', html: 'Same result in octal: <code>chmod ' + oct(mode) + ' file</code>' }] });
        if (f.length < 4) f.push({ narr: 'Add another change (for example <code>,o-r</code>) to see more steps.', parts: [{ type: 'text', html: 'Try <code>600 g+r,o+r</code>' }] });
        return f;
      }
    }],
    examples: [
      { title: 'nginx 403 after a deploy to a home folder', html: `<p>A developer pointed nginx at <code>/home/deploy/site</code>. Pages return 403. <code>namei -l</code> shows <code>/home/deploy</code> is ${H.c('r', 'drwxr-x---')} (750, Ubuntu 21.04+ default for new homes). <code>www-data</code> is "other" there, so it cannot pass through. The clean fix is not to open the home folder but to move the site to <code>/var/www/site</code> with the right group.</p>`, code: `namei -l /home/deploy/site/index.html
# drwxr-xr-x root   root   /
# drwxr-xr-x root   root   home
# drwxr-x--- deploy deploy deploy     <- www-data is "other": no x, walk stops
sudo mkdir -p /var/www/site
sudo rsync -a /home/deploy/site/ /var/www/site/
sudo chown -R deploy:www-data /var/www/site
sudo find /var/www/site -type d -exec chmod 750 {} +
sudo find /var/www/site -type f -exec chmod 640 {} +
sudo -u www-data cat /var/www/site/index.html > /dev/null && echo OK` },
      { title: 'Uploads folder the app can write but users cannot browse', html: `<p>The PHP app runs as <code>www-data</code> and must write user uploads. Give only that folder group write, and set the <b>setgid</b> bit (<code>2</code> in front) so new files inherit the folder's group instead of the creator's main group.</p>`, code: `sudo chown deploy:www-data /var/www/site/uploads
sudo chmod 2770 /var/www/site/uploads     # setgid + rwx owner + rwx group, nothing for others
ls -ld /var/www/site/uploads              # drwxrws--- : the s shows setgid` },
      { title: 'Fixing a chmod -R 777 mess', html: `<p>A teammate ran <code>chmod -R 777 /var/www</code> to "fix" an error. Everything is world-writable now, a real security hole. Reset folders and files separately with <code>find</code> - a single <code>chmod -R 644</code> would remove x from folders and break the site.</p>`, code: `sudo find /var/www -type d -perm -o+w -exec chmod 755 {} +   # folders: 755
sudo find /var/www -type f -perm -o+w -exec chmod 644 {} +   # files: 644
sudo find /var/www -perm -o+w | head                        # should print nothing now` },
      { title: 'Service creates log files nobody else can read', html: `<p>A systemd service writes logs with mode 600, so the log-shipping agent (group <code>adm</code>) cannot read them. Rather than chmod after the fact, set the service's umask in its unit file. <code>UMask=0027</code> means files 640, folders 750.</p>`, code: `sudo systemctl edit myapp       # opens a drop-in override file
# add these two lines in the editor:
#   [Service]
#   UMask=0027
sudo systemctl restart myapp
stat -c '%a %U:%G %n' /var/log/myapp/*.log` }
    ],
    deepDive: `<p>🟣 <b>How the check really works.</b> For each path component the kernel picks exactly <b>one</b> class: if your effective UID equals the owner, only the owner bits count; else if any of your groups matches, only the group bits; else the other bits. It does not "fall through", so a file with mode <code>066</code> is unreadable by its own owner. Root (UID 0, or a process with <code>CAP_DAC_OVERRIDE</code>) bypasses read/write checks, and gets execute if <i>any</i> x bit is set.</p>
      <p><b>Group membership is captured at login.</b> After <code>usermod -aG www-data deploy</code> the deploy user's existing sessions still have the old group list. Log out and in, run <code>newgrp www-data</code>, or restart the service. Many "I added the group but it still fails" tickets are just this.</p>
      <p><b>Beyond rwx.</b> <b>ACLs</b> (<code>setfacl -m u:alice:rx dir</code>, view with <code>getfacl</code>) give per-user exceptions; a <code>+</code> after the mode in <code>ls -l</code> means an ACL exists. <b>Default ACLs</b> on a folder are inherited by new files, a stronger tool than umask for shared folders. <b>File attributes</b>: <code>chattr +i</code> makes a file immutable even for root; <code>lsattr</code> reveals it. <b>Mandatory access control</b>: SELinux (RHEL, Amazon Linux, Fedora) and AppArmor (Ubuntu) can deny access even when rwx allows it. On RHEL a 403 with perfect permissions is often an SELinux label: check <code>ls -Z</code> and <code>ausearch -m avc</code>, fix with <code>restorecon -Rv /var/www</code>, and <b>never</b> "fix" it by disabling SELinux.</p>
      <p><b>Mount options and cloud storage.</b> A filesystem mounted <code>noexec</code> (common for <code>/tmp</code> on hardened images) makes <code>./script.sh</code> fail with Permission denied regardless of the x bit. NFS/EFS maps UIDs by number, so <code>deploy</code> as UID 1001 on one server and 1002 on another see different owners - keep UIDs consistent across a fleet. Containers add their own twist: a bind-mounted folder shows the host's numeric UIDs inside the container.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant can read a <code>namei -l</code> output and tell you which folder blocks access, and it can write the <code>find ... -exec chmod</code> commands for you. <b>Where it goes wrong:</b> the most common AI "fix" for any permission error is <code>chmod -R 777</code> or <code>sudo</code> everything; it also forgets that groups need a re-login, ignores SELinux on RHEL family systems, and sometimes runs <code>chmod -R 644</code> over a tree (removing x from folders).</p>
      <p><b>Use AI as a partner:</b> paste the exact error and the <code>namei -l</code> output and ask "<i>what is the least-privilege fix?</i>". Ask it to explain why. <b>What you must still own:</b> the rule that every parent folder needs x, the owner → group → other order, and the security judgement that world-writable is never the answer. In interviews, saying "I would reproduce it with <code>sudo -u www-data</code> first" is exactly the signal they want.</p>`,
    problems: [P({
      t: 'nginx returns 403 for a freshly deployed site', l: 'Easy', tags: ['permissions', 'nginx', 'namei', 'chown'], co: ['Microsoft Azure Support', 'DigitalOcean'],
      s: `<p>You deployed a static site to <code>/srv/shop</code>. nginx (running as <code>www-data</code>) returns <b>403 Forbidden</b>. <code>/var/log/nginx/error.log</code> shows <code>open() "/srv/shop/index.html" failed (13: Permission denied)</code>. The files were copied by root with <code>umask 077</code>. Find and fix the problem with least privilege.</p>`,
      ex: `<p><code>namei -l /srv/shop/index.html</code> shows ${H.c('r', 'drwx------ root root shop')} and ${H.c('r', '-rw------- root root index.html')}. www-data is "other" on both and has no access. After the fix: folders ${H.c('g', '750 root:www-data')}, files ${H.c('g', '640 root:www-data')}, and <code>curl -I localhost</code> returns ${H.c('g', '200 OK')}.</p>`,
      bw: `<p><code>sudo chmod -R 777 /srv/shop</code>. The 403 goes away, but now any user or compromised process on the server can replace your pages (defacement, malware). It also marks every file as executable. Security scanners will flag it, and it hides the real lesson: the umask during the copy.</p>`,
      bc: `sudo chmod -R 777 /srv/shop    # "works", but world-writable and executable`,
      q: ['<code>/srv/shop</code> is <code>drwx------ root root</code>. What does www-data lack?', ['x (and r) on the folder, so it cannot pass through it', 'Only w on the folder', 'Nothing; only the file matters', 'The setuid bit'], 0, 'To open a file inside a folder you need x on that folder. With 700 and root ownership, www-data falls into "other" and has no bits at all, so the walk stops at /srv/shop.'],
      h: ['<p>Hint 1: reproduce as the real user: <code>sudo -u www-data cat /srv/shop/index.html</code>. If that fails, it is file-system permissions, not nginx config.</p>', '<p>Hint 2: <code>namei -l</code> shows every component. Look for the first folder where www-data has no x.</p>', '<p>Hint 3: give access through the <b>group</b>: chgrp to www-data, folders 750, files 640, using <code>find -type d</code> and <code>find -type f</code> separately.</p>'],
      a: `<p>Reproduce with <code>sudo -u www-data</code>, then read <code>namei -l</code>: the folder and file are 700/600 owned by root because the copy ran with umask 077. Fix with least privilege: make the group <code>www-data</code>, give folders <code>750</code> (group may enter and list) and files <code>640</code> (group may read). Others get nothing. Re-test as www-data and with <code>curl -I</code>. To prevent a repeat, deploy with <code>rsync --chmod=D750,F640 --chown=root:www-data</code> or set <code>umask 027</code> in the deploy script. On RHEL-family systems also check the SELinux label with <code>ls -Z</code> and <code>restorecon</code> if needed.</p>`,
      code: `# 1. Reproduce as the web server user
sudo -u www-data cat /srv/shop/index.html          # Permission denied
# 2. Find the first locked door
namei -l /srv/shop/index.html
# 3. Least-privilege fix: group access for www-data, nothing for others
sudo chgrp -R www-data /srv/shop
sudo find /srv/shop -type d -exec chmod 750 {} +
sudo find /srv/shop -type f -exec chmod 640 {} +
# 4. Verify as the real user and over HTTP
sudo -u www-data cat /srv/shop/index.html > /dev/null && echo "file readable"
curl -sI http://localhost/ | head -n 1             # HTTP/1.1 200 OK
# 5. RHEL family only: fix SELinux labels if a 403 remains
command -v restorecon > /dev/null && sudo restorecon -Rv /srv/shop
# 6. Prevent a repeat: deploy with explicit modes
# rsync -a --chown=root:www-data --chmod=D750,F640 ./build/ /srv/shop/`,
      cx: `<p>A handful of commands; <code>find -exec ... +</code> batches files so it is fast even for thousands of files. Risk: low, permissions only get tighter for "other".</p>`,
      f: ['Why does <code>chmod -R 640 /srv/shop</code> break the site?', 'How would SELinux change your diagnosis on Amazon Linux or RHEL?']
    })]
  });

  // ───────────────────────── Topic 3: users, groups, sudo ─────────────────────────
  topics.push({
    title: 'Users, Groups and sudo: Who You Are and What You May Do',
    analogy: `<p>A server is a <b>company building with ID badges</b>. Each person (user) has a badge with a number on it (UID). Badges carry <b>team stickers</b> (groups): "web team", "docker", "admins". Doors check stickers, not names. <b>sudo</b> is the front desk: you show your badge, prove it is you (password), and the desk checks a list (<code>/etc/sudoers</code>) to see if you may borrow the master key for one task. Every borrow is written in the visitor log.</p>`,
    explain: `<p>🟢 <b>Users are numbers.</b> To the kernel a user is just a <b>UID</b> (root = 0) and a group is a <b>GID</b>. Names are a lookup in three text files:</p>
      ${H.table(['File', 'One line looks like', 'Who can read it'], [
        ['<code>/etc/passwd</code>', '<code>deploy:x:1001:1001:Deploy User:/home/deploy:/bin/bash</code>', 'everyone (no passwords inside)'],
        ['<code>/etc/shadow</code>', '<code>deploy:$y$j9T$...:19800:0:99999:7:::</code>', 'root only: password hashes and expiry'],
        ['<code>/etc/group</code>', '<code>www-data:x:33:deploy,alice</code>', 'everyone: group name, GID, extra members']
      ])}
      <p>🟢 <b>Two kinds of users.</b> <b>Humans</b> (UID ≥ 1000 on most distros) log in and have a home and a shell. <b>Service accounts</b> (system users, UID &lt; 1000) such as <code>www-data</code>, <code>nginx</code>, <code>postgres</code> run one program, have no password and use the shell <code>/usr/sbin/nologin</code> so nobody can log in as them. Running each service as its own user limits the damage if it gets hacked.</p>
      <p>🔵 <b>Everyday commands.</b></p>
      ${H.table(['Task', 'Command'], [
        ['who am I, which groups', '<code>id</code>, <code>whoami</code>, <code>groups deploy</code>'],
        ['add a human user with a home', '<code>sudo useradd -m -s /bin/bash -c "Alice" alice</code> (or the friendlier Debian <code>adduser alice</code>)'],
        ['add a service user', '<code>sudo useradd --system --no-create-home -s /usr/sbin/nologin myapp</code>'],
        ['add a user to an extra group', '<code>sudo usermod -aG docker alice</code> (<b>-a</b> = append; without it you replace all groups!)'],
        ['set / lock a password', '<code>sudo passwd alice</code>, <code>sudo passwd -l alice</code>, <code>sudo usermod -L alice</code>'],
        ['expire an account', '<code>sudo chage -E 0 alice</code>; view rules with <code>chage -l alice</code>'],
        ['remove a user', '<code>sudo userdel -r alice</code> (-r also removes the home)'],
        ['become another user', '<code>sudo -i</code> (root shell), <code>sudo -u postgres psql</code>, <code>su - alice</code>']
      ])}
      <p>🔵 <b>sudo in one minute.</b> sudo checks <code>/etc/sudoers</code> and files in <code>/etc/sudoers.d/</code>. On Ubuntu members of group <code>sudo</code> may run anything; on RHEL/Amazon Linux it is group <code>wheel</code>. Edit only with <code>sudo visudo</code> (or <code>visudo -f /etc/sudoers.d/name</code>): it checks the syntax before saving, and a broken sudoers file can lock everyone out of root. Cloud images usually give the default user (<code>ubuntu</code>, <code>ec2-user</code>, <code>azureuser</code>) password-less sudo through a file in <code>/etc/sudoers.d/</code>. Every sudo call is logged (<code>/var/log/auth.log</code> or <code>/var/log/secure</code>, and <code>journalctl _COMM=sudo</code>).</p>`,
    clues: [
      '"I added the user to the group but it still says permission denied" → group list is read at login: log out/in, <code>newgrp</code>, or restart the service',
      '"after usermod the user lost sudo / docker access" → used <code>-G</code> without <code>-a</code>, which replaced the group list',
      '"onboard a new engineer to 50 servers" → do not hand-create users; use config management or central identity (SSO, LDAP, cloud OS Login)',
      '"service should not be able to log in" → system user with <code>/usr/sbin/nologin</code> and no password',
      '"sudo: unable to resolve host" or "user is not in the sudoers file" → hostname in <code>/etc/hosts</code>, or missing sudo/wheel group',
      '"who ran this command as root last night?" → <code>/var/log/auth.log</code> / <code>/var/log/secure</code>, <code>journalctl _COMM=sudo</code>, <code>last</code>'
    ],
    code: [R`# Lab: docker run -it --rm ubuntu:24.04 bash   (you are root inside)
apt-get update -qq && apt-get install -y -qq sudo > /dev/null

# 1. A human user and a service user
useradd -m -s /bin/bash -c "Alice Admin" alice
useradd --system --no-create-home --shell /usr/sbin/nologin myapp
getent passwd alice myapp          # getent reads passwd (and LDAP/SSSD if configured)
id alice; id myapp

# 2. Groups: create, append, verify
groupadd developers
usermod -aG developers alice       # -a = APPEND. Without -a, -G REPLACES every group.
id alice                           # groups=1001(alice),1002(developers)

# 3. A narrow sudo rule: alice may only restart nginx, nothing else
echo 'alice ALL=(root) NOPASSWD: /usr/bin/systemctl restart nginx' > /etc/sudoers.d/alice-nginx
chmod 440 /etc/sudoers.d/alice-nginx
visudo -cf /etc/sudoers.d/alice-nginx   # syntax check: "parsed OK"
sudo -l -U alice                        # what may alice run?

# 4. Lock and remove when the person leaves
passwd -l alice                    # lock password login
usermod -s /usr/sbin/nologin alice # no shell either
userdel -r alice                   # finally remove user and home`],
    codeTitle: ['Users, groups and a least-privilege sudo rule'],
    viz: [{
      title: 'Read an /etc/passwd line field by field',
      input: 'deploy:x:1001:1001:Deploy User:/home/deploy:/bin/bash',
      inputLabel: 'one /etc/passwd line (7 fields separated by :)',
      gen: function (input) {
        var line = String(input || '').trim();
        var fs = line.split(':');
        if (fs.length !== 7) throw new Error('A passwd line has exactly 7 fields separated by ":"');
        if (!/^\d+$/.test(fs[2]) || !/^\d+$/.test(fs[3])) throw new Error('Fields 3 and 4 (UID, GID) must be numbers');
        var names = ['user name', 'password', 'UID', 'GID (primary group)', 'GECOS (comment)', 'home folder', 'login shell'];
        var uid = Number(fs[2]);
        var notes = [
          'The name people type. Must be unique. Tools translate it to the UID.',
          fs[1] === 'x' ? '<b>x</b> means "the real password hash is in /etc/shadow", which only root can read. Old systems stored the hash here, readable by everyone.' : 'Not "x": the hash is stored here (very old style) or the field is empty. Investigate - this is a security smell.',
          uid === 0 ? '<span class="c-r">UID 0 = root.</span> Any account with UID 0 is root, whatever its name. A second UID-0 user is a classic backdoor.' : uid < 1000 ? 'UID below 1000: a <b>system / service account</b> created by a package or by <code>useradd --system</code>.' : 'UID 1000 or more: a <b>human</b> account. File ownership is stored as this number, not the name.',
          'The primary group. New files the user creates get this group (unless the folder is setgid). Extra groups are listed in /etc/group.',
          'Free text, usually the full name. <code>chfn</code> changes it.',
          'Where <code>~</code> points. SSH looks for <code>' + fs[5] + '/.ssh/authorized_keys</code> here.',
          /nologin|false/.test(fs[6]) ? 'A <b>nologin</b> shell: nobody can get an interactive session as this user. Right for service accounts.' : 'The program started when this user logs in. A real shell means interactive logins are possible.'
        ];
        var f = [{ narr: 'Every line of <code>/etc/passwd</code> is one account, with 7 fields split by colons. Let us read them one at a time.', parts: [{ type: 'array', label: 'fields', values: fs.map(function (x) { return x || '(empty)'; }), idxLabels: names.map(function (n, i) { return String(i + 1); }) }] }];
        for (var i = 0; i < 7; i++) {
          f.push({ narr: '<b>Field ' + (i + 1) + ' - ' + names[i] + '</b> = <code>' + H.esc(fs[i] || '(empty)') + '</code>. ' + notes[i], parts: [
            { type: 'array', label: 'fields', values: fs.map(function (x) { return x || '(empty)'; }), hl: one(i, uid === 0 && i === 2 ? 'bad' : 'cur'), idxLabels: names.map(function (n, k) { return String(k + 1); }) }
          ] });
        }
        f.push({ narr: 'Summary: <b>' + H.esc(fs[0]) + '</b> is a ' + (uid === 0 ? '<span class="c-r">root-level</span>' : uid < 1000 ? 'service' : 'human') + ' account. Check yours with <code>getent passwd ' + H.esc(fs[0]) + '</code> and <code>id ' + H.esc(fs[0]) + '</code>.', parts: [{ type: 'map', label: 'decoded', entries: names.map(function (n, k) { return [n, fs[k] || '(empty)']; }) }] });
        return f;
      }
    }, {
      title: 'usermod -G vs usermod -aG (the classic mistake)',
      input: 'docker,sudo + www-data',
      inputLabel: 'current extra groups (comma list) + group to add',
      gen: function (input) {
        var m = String(input || '').match(/^\s*([\w,-]*)\s*\+\s*([\w-]+)\s*$/);
        if (!m) throw new Error('Format: docker,sudo + www-data');
        var cur = m[1] ? m[1].split(',').filter(Boolean) : [];
        var add = m[2];
        if (cur.length > 8) throw new Error('At most 8 groups');
        var f = [];
        f.push({ narr: 'User <b>deploy</b> has primary group <b>deploy</b> and extra groups <b>' + (cur.join(', ') || 'none') + '</b>. We want to add <b>' + add + '</b> so the deploy user can write to the web root.', parts: [{ type: 'set', label: 'deploy\'s extra groups now', items: cur.slice() }] });
        f.push({ narr: '<span class="c-r">Wrong:</span> <code>sudo usermod -G ' + add + ' deploy</code>. <b>-G</b> on its own means "set the extra groups to exactly this list".', parts: [{ type: 'code', label: 'command', lang: 'bash', code: 'sudo usermod -G ' + add + ' deploy', hl: { 1: 'bad' } }, { type: 'set', label: 'before', items: cur.slice() }] });
        var hl = {}; cur.forEach(function (g) { hl[g] = 'bad'; }); hl[add] = 'ok';
        f.push({ narr: 'Result: every old group is <b>gone</b>. ' + (cur.indexOf('sudo') >= 0 || cur.indexOf('wheel') >= 0 ? '<span class="c-r">deploy just lost sudo</span> - on a cloud VM where this was the only admin user, you may have locked yourself out of root.' : 'Things that relied on those groups break silently.'), parts: [{ type: 'set', label: 'after usermod -G (old groups removed)', items: cur.concat([add]), hl: hl }] });
        var hl2 = {}; hl2[add] = 'ok';
        var right = cur.indexOf(add) >= 0 ? cur.slice() : cur.concat([add]);
        f.push({ narr: '<span class="c-g">Right:</span> <code>sudo usermod -aG ' + add + ' deploy</code>. <b>-a</b> = append: keep the existing groups and add one. (Alternative: <code>sudo gpasswd -a deploy ' + add + '</code>.)', parts: [{ type: 'code', label: 'command', lang: 'bash', code: 'sudo usermod -aG ' + add + ' deploy', hl: { 1: 'ok' } }, { type: 'set', label: 'after usermod -aG', items: right, hl: hl2 }] });
        f.push({ narr: 'One more trap: the change is written to <code>/etc/group</code> now, but deploy\'s <b>running</b> sessions still carry the old list. <code>id</code> in a new login shows it; the current shell does not until you log out and in (or run <code>newgrp ' + add + '</code>). Services must be restarted.', parts: [{ type: 'table', label: 'what each session sees', columns: ['where', 'groups'], rows: [['old SSH session', cur.join(',') || '(none)'], ['new SSH session', right.join(',')]], hl: { 0: 'cur', 1: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Onboard a contractor with only the access they need', html: `<p>A contractor must read app logs on one VM, nothing else. Create a user, add them to group <code>adm</code> (which can read <code>/var/log</code> on Ubuntu), install their <b>public</b> key, and give no sudo. Set an expiry date so access ends automatically.</p>`, code: `sudo useradd -m -s /bin/bash -c "Contractor Raj" raj
sudo usermod -aG adm raj
sudo install -d -m 700 -o raj -g raj /home/raj/.ssh
sudo install -m 600 -o raj -g raj ./raj.pub /home/raj/.ssh/authorized_keys   # their PUBLIC key file
sudo chage -E 2026-12-31 raj          # account expires at year end
sudo chage -l raj` },
      { title: 'Who has root on this box?', html: `<p>An audit asks who can become root. Check UID 0 accounts, members of the admin groups, and every sudoers rule. Anything unexpected is a finding.</p>`, code: `awk -F: '$3 == 0 {print "UID 0:", $1}' /etc/passwd
getent group sudo wheel
sudo grep -rhv '^#' /etc/sudoers /etc/sudoers.d/ | grep -v '^$'
sudo grep -h 'sudo:' /var/log/auth.log 2>/dev/null | tail -n 5   # recent sudo use (Ubuntu)` },
      { title: 'Docker says "permission denied while trying to connect to the Docker daemon socket"', html: `<p>The socket <code>/var/run/docker.sock</code> is <code>srw-rw---- root docker</code>. The user is not in the <code>docker</code> group. Add them with <code>-aG</code> and start a new session. Note: docker group membership is effectively root, so only give it to trusted admins.</p>`, code: `ls -l /var/run/docker.sock        # srw-rw---- 1 root docker
sudo usermod -aG docker deploy
# log out and back in, then:
id deploy | grep -o docker && docker ps` },
      { title: 'Offboarding: remove access without deleting evidence', html: `<p>An engineer left. Lock first (instant, reversible), remove their key, kill their sessions, and only delete the account after any files they own are handed over. <code>find / -user</code> lists what they own.</p>`, code: `sudo usermod -L -e 1 -s /usr/sbin/nologin bob   # lock password, expire, no shell
sudo rm -f /home/bob/.ssh/authorized_keys
sudo pkill -KILL -u bob                          # end running sessions and processes
sudo find / -xdev -user bob -not -path '/home/bob/*' 2>/dev/null | head
# later, after handover:
# sudo userdel -r bob` }
    ],
    deepDive: `<p>🟣 <b>Real, effective and saved IDs.</b> A process carries a <b>real UID</b> (who started it), an <b>effective UID</b> (what permission checks use) and a saved UID. sudo is a setuid-root program: it starts with effective UID 0, checks your rights, then runs your command as the target user. That is why a bug in sudo is so serious, and why the sudoers file must be root-owned and mode 440.</p>
      <p><b>Name service switch.</b> <code>/etc/nsswitch.conf</code> decides where user lookups go: <code>files</code> (the local passwd file), then maybe <code>sss</code> or <code>ldap</code>. In companies, humans usually come from a directory (Active Directory, FreeIPA, Okta via SSSD), or from cloud features such as Google OS Login or AWS SSM Session Manager, so <code>getent passwd alice</code> finds users that are not in <code>/etc/passwd</code>. That is why <code>getent</code> is better than <code>grep /etc/passwd</code>.</p>
      <p><b>sudoers details that bite.</b> Rules read <code>who where=(as_whom) commands</code>. The <b>last matching rule wins</b>, so a broad rule later in the file can undo a narrow one. Allowing editors, pagers or interpreters (<code>vim</code>, <code>less</code>, <code>python</code>, <code>find</code>) gives a full root shell via their "run a command" features - see GTFOBins. Prefer allowing exact commands with exact arguments. <code>Defaults use_pty, logfile=...</code> and central log shipping help audits.</p>
      <p><b>Password hashing.</b> Modern distros store yescrypt (<code>$y$</code>) or SHA-512 (<code>$6$</code>) hashes in shadow. On cloud servers human passwords are mostly disabled for SSH anyway (keys only), but local passwords still matter for <code>sudo</code> prompts and the serial console. Account hygiene at scale - no shared accounts, automatic expiry, offboarding scripts - is a frequent audit topic in support roles.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants write <code>useradd</code> lines and sudoers rules quickly, and can audit a pasted <code>/etc/group</code> for surprises. <b>Where it goes wrong:</b> it often writes <code>usermod -G</code> without <code>-a</code>, suggests <code>ALL=(ALL) NOPASSWD: ALL</code> as a quick fix, edits <code>/etc/sudoers</code> with <code>echo &gt;&gt;</code> instead of visudo (one typo locks out root), and forgets that new groups need a new login.</p>
      <p><b>Use AI as a partner:</b> ask "<i>write the narrowest sudoers rule that lets the deploy user restart only nginx</i>" and then check it with <code>visudo -c</code> and <code>sudo -l -U deploy</code>. <b>What you must still own:</b> least privilege as a habit, the difference between humans and service accounts, and the audit trail. AI agents themselves should run as a dedicated low-privilege user, never as root with password-less sudo.</p>`,
    problems: [P({
      t: 'New teammate cannot deploy to the shared web folder', l: 'Medium', tags: ['users', 'groups', 'usermod', 'setgid'], co: ['IBM', 'Infosys'],
      s: `<p>Two people, <code>alice</code> and <code>raj</code>, must both be able to upload files into <code>/var/www/app</code>, and nginx (<code>www-data</code>) must be able to read them. Today alice owns the folder with mode 755 and raj gets <code>Permission denied</code>. Files raj creates must also be editable by alice later. Set this up properly.</p>`,
      ex: `<p>Before: ${H.c('r', 'drwxr-xr-x alice alice /var/www/app')} → raj is "other": no w. After: ${H.c('g', 'drwxrws--- root webdev /var/www/app')} with alice, raj and www-data in <code>webdev</code>. A file raj creates is ${H.c('g', 'raj:webdev 664')}, so alice can edit it and nginx can read it.</p>`,
      bw: `<p>Make the folder 777, or give raj sudo so he can copy files as root. Both "work" but give far more power than needed: 777 lets any process change the site; sudo gives raj the whole machine. Also files would still end up with mixed owners and groups.</p>`,
      bc: `sudo chmod 777 /var/www/app    # anyone on the box can now change the site
sudo usermod -aG sudo raj       # raj is now effectively root`,
      q: ['Why set the <b>setgid</b> bit on the shared folder?', ['New files inherit the folder\'s group instead of the creator\'s primary group', 'It makes files executable', 'It lets the folder be deleted only by root', 'It runs files as the folder owner'], 0, 'With setgid on a directory, every new file and subfolder gets the directory\'s group. Combined with a group-friendly umask (002), all team files stay group-writable.'],
      h: ['<p>Hint 1: the people share a <b>role</b>, so model it as a group (for example <code>webdev</code>) instead of per-user permissions.</p>', '<p>Hint 2: <code>usermod -aG</code> each person into the group (append!), chgrp the folder and give the group <code>rwx</code>; others none.</p>', '<p>Hint 3: add setgid (<code>chmod 2770</code>) so new files keep the group, and set <code>umask 002</code> for the team so new files are group-writable. Remember a new login is needed.</p>'],
      a: `<p>Create a group <code>webdev</code> and append alice, raj and www-data to it. Make the folder owned by <code>root:webdev</code> with mode <code>2770</code>: owner and group can do everything, others nothing, and the setgid bit makes new files inherit <code>webdev</code>. Fix existing files with find (folders 2770, files 660 or 664). Set <code>umask 002</code> for the two users (for example in <code>/etc/profile.d/webdev-umask.sh</code> guarded by group membership) so their new files are group-writable. Tell both users to log out and back in so the new group applies, and restart nginx so www-data picks up the group. Verify with <code>sudo -u raj touch</code> and <code>sudo -u www-data cat</code>. For finer control, default ACLs (<code>setfacl -d -m g:webdev:rwX</code>) do the same job without relying on umask.</p>`,
      code: `# 1. One group for the role, everyone appended (-a!)
sudo groupadd -f webdev
for u in alice raj www-data; do sudo usermod -aG webdev "$u"; done
# 2. Folder: root-owned, group webdev, setgid so new files keep the group
sudo chown -R root:webdev /var/www/app
sudo find /var/www/app -type d -exec chmod 2770 {} +
sudo find /var/www/app -type f -exec chmod 660 {} +
# 3. Group-writable new files for the team (umask 002)
echo 'id -nG | grep -qw webdev && umask 002' | sudo tee /etc/profile.d/webdev-umask.sh
# 4. Pick up the new group: users re-login; nginx restarts
sudo systemctl restart nginx
# 5. Verify as each identity
sudo -u raj touch /var/www/app/test-raj.html
sudo -u alice sh -c 'echo edit >> /var/www/app/test-raj.html'
sudo -u www-data cat /var/www/app/test-raj.html
ls -l /var/www/app/test-raj.html          # -rw-rw---- raj webdev`,
      cx: `<p>Setup takes minutes. Ongoing cost is zero: new team members are one <code>usermod -aG</code> away. Risk: low, others lose access they should not have had.</p>`,
      f: ['How would you do the same with default ACLs?', 'What changes if the team is 200 people on 50 servers?']
    })]
  });

  // ───────────────────────── Topic 4: processes & services ─────────────────────────
  topics.push({
    title: 'Processes and Services: ps, top, kill, systemctl and journalctl on Call',
    analogy: `<p>Think of a restaurant kitchen. <b>Processes</b> are the cooks working right now. <code>ps</code> is a photo of the kitchen; <code>top</code> is a live video showing who is busiest. <code>kill</code> is tapping a cook on the shoulder ("please finish up", or with <code>-9</code>, "out, now"). <b>systemd</b> is the head chef with the staff rota: it knows which cooks must always be on duty (<b>services</b>), starts them in the morning, replaces one who collapses, and writes everything in the kitchen diary (<b>the journal</b>).</p>`,
    explain: `<p>🟢 <b>Processes.</b> Every running program is a process with a <b>PID</b>, an owner, a parent and a state. The two snapshots you will use daily:</p>
      ${H.table(['Command', 'What it answers'], [
        ['<code>ps aux</code>', 'every process: user, PID, %CPU, %MEM, RSS (real memory), state, command'],
        ['<code>ps aux --sort=-%mem | head</code>', 'top memory users (use <code>-%cpu</code> for CPU)'],
        ['<code>ps -ef --forest</code> / <code>pstree -p</code>', 'parent/child tree: which master spawned which workers'],
        ['<code>pgrep -a nginx</code>', 'PIDs and command lines matching a name'],
        ['<code>top</code> (or <code>htop</code>)', 'live view; press <kbd>P</kbd> sort by CPU, <kbd>M</kbd> by memory, <kbd>1</kbd> per-CPU, <kbd>q</kbd> quit']
      ])}
      <p>🟢 <b>Reading the top header.</b> <code>load average: 3.10, 1.20, 0.50</code> = average number of tasks running or waiting over 1, 5 and 15 minutes; compare it with the CPU count (<code>nproc</code>). <code>%Cpu(s): us</code> = your apps, <code>sy</code> = kernel, <code>wa</code> = waiting for disk, <code>st</code> = <b>steal</b> (the cloud host gave your vCPU to someone else - common on burstable instances that ran out of CPU credits). <code>MiB Mem ... avail</code> is the number that matters, not "free": Linux uses spare RAM as disk cache.</p>
      <p>🟢 <b>Stopping things.</b> <code>kill PID</code> sends SIGTERM (polite). Wait a few seconds. Only if it is stuck, <code>kill -9 PID</code>. <code>pkill -f pattern</code> matches by command line - double-check the pattern with <code>pgrep -af pattern</code> first. For a service, do not kill it by hand at all: use <code>systemctl stop</code>, or systemd will just restart it. (Signal internals are in CS Core 8.)</p>
      <p>🔵 <b>Services with systemctl.</b></p>
      ${H.table(['Command', 'Meaning'], [
        ['<code>systemctl status nginx</code>', 'running or not, main PID, last log lines - <b>always start here</b>'],
        ['<code>sudo systemctl start | stop | restart nginx</code>', 'change it <b>now</b>'],
        ['<code>sudo systemctl reload nginx</code>', 're-read config without dropping connections (if the service supports it)'],
        ['<code>sudo systemctl enable --now nginx</code>', 'start at every boot <b>and</b> start now'],
        ['<code>systemctl is-active nginx</code>, <code>is-enabled</code>', 'one-word answers for scripts'],
        ['<code>systemctl --failed</code>', 'every unit that has failed'],
        ['<code>journalctl -u nginx -n 50 --no-pager</code>', 'last 50 log lines of that service'],
        ['<code>journalctl -u nginx --since "10 min ago" -f</code>', 'recent logs, then follow live'],
        ['<code>journalctl -p err -b</code>', 'only errors since this boot']
      ])}
      <p>🔵 <b>The "service won't start" recipe.</b> 1) <code>systemctl status</code>: read the exit code and last lines. 2) <code>journalctl -u NAME -n 100</code>: find the <b>first</b> error, not the last. 3) Test the config with the app's own checker (<code>nginx -t</code>, <code>sshd -t</code>, <code>apachectl configtest</code>). 4) Check the usual suspects: port already in use (<code>ss -ltnp</code>), permissions on files it reads, a missing folder, disk full. 5) Fix, <code>restart</code>, confirm <code>active (running)</code> and test the real thing with <code>curl</code>.</p>
      <p class="c-m">Lab note: plain Docker containers do not run systemd, so practise <code>ps</code>/<code>top</code>/<code>kill</code> in a container and <code>systemctl</code> on a VM, a laptop install, or WSL with systemd enabled (<code>[boot] systemd=true</code> in <code>/etc/wsl.conf</code>).</p>`,
    clues: [
      '"service failed to start" / "Job for X failed" → <code>systemctl status X</code> then <code>journalctl -u X</code>, first error wins',
      '"address already in use" / "bind() to 0.0.0.0:80 failed" → another process owns the port: <code>sudo ss -ltnp \'sport = :80\'</code>',
      '"server is slow" → <code>top</code>: high <code>us</code> = app CPU, high <code>wa</code> = disk, high <code>st</code> = noisy neighbour or CPU credits',
      '"process keeps coming back after kill" → it is a systemd service with <code>Restart=</code>; use <code>systemctl stop</code>',
      '"works until reboot" → service not enabled: <code>systemctl enable</code>',
      '"Out of memory" / process vanished with no log → <code>journalctl -k | grep -i oom</code>, <code>dmesg -T</code>'
    ],
    code: [R`# --- Part A: processes (works in 'docker run -it --rm ubuntu:24.04 bash') ---
apt-get update -qq && apt-get install -y -qq procps psmisc > /dev/null
sleep 600 &                              # start a harmless background "app"
APP=$!
ps -o pid,ppid,user,stat,etime,cmd -p "$APP"
ps aux --sort=-%mem | head -n 5          # biggest memory users
pgrep -a sleep                           # find by name
top -b -n 1 | head -n 15                 # one batch-mode snapshot of top
kill "$APP"                              # SIGTERM first
sleep 1
kill -0 "$APP" 2>/dev/null && kill -9 "$APP"   # only if still alive

# --- Part B: services (needs systemd: a VM, laptop, or WSL with systemd) ---
sudo apt-get install -y nginx
systemctl status nginx --no-pager        # Active: active (running)
sudo systemctl stop nginx
systemctl is-active nginx                # inactive
sudo systemctl enable --now nginx        # start now and at every boot
journalctl -u nginx -n 20 --no-pager     # its recent log lines
sudo nginx -t                            # test config before any restart
sudo systemctl reload nginx              # apply config without dropping connections
systemctl --failed                       # anything broken on this machine?`],
    codeTitle: ['Process and service toolkit'],
    viz: [{
      title: 'Why won\'t the service start? systemctl start, step by step',
      input: 'port-in-use',
      inputLabel: 'scenario: ok | port-in-use | bad-config | permission | missing-dir',
      gen: function (input) {
        var sc = String(input || 'ok').trim().toLowerCase();
        var S = {
          'ok': null,
          'port-in-use': { at: 'B', log: 'nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)', check: "sudo ss -ltnp 'sport = :80'", find: 'users:(("apache2",pid=812,fd=4))', fix: 'sudo systemctl disable --now apache2\nsudo systemctl start nginx', why: 'Only one process can listen on a port. An old apache2 install still owns port 80.' },
          'bad-config': { at: 'C', log: 'nginx: [emerg] unknown directive "servr_name" in /etc/nginx/sites-enabled/shop:3', check: 'sudo nginx -t', find: 'configuration file /etc/nginx/nginx.conf test failed', fix: 'sudo nano /etc/nginx/sites-enabled/shop   # fix the typo on line 3\nsudo nginx -t && sudo systemctl start nginx', why: 'A typo in a config file. The app refuses to start rather than guess.' },
          'permission': { at: 'C', log: 'nginx: [emerg] open() "/etc/ssl/private/shop.key" failed (13: Permission denied)', check: 'namei -l /etc/ssl/private/shop.key', find: '-rw------- deploy deploy shop.key', fix: 'sudo chown root:root /etc/ssl/private/shop.key\nsudo chmod 600 /etc/ssl/private/shop.key\nsudo systemctl start nginx', why: 'The master process (root) could not open the key because the file was owned by someone else with 600, or the parent folder blocked it.' },
          'missing-dir': { at: 'C', log: 'nginx: [emerg] open() "/var/log/nginx/shop.access.log" failed (2: No such file or directory)', check: 'ls -ld /var/log/nginx', find: 'ls: cannot access \'/var/log/nginx\': No such file or directory', fix: 'sudo install -d -m 755 -o root -g adm /var/log/nginx\nsudo systemctl start nginx', why: 'Someone deleted the log folder while "cleaning up disk space".' }
        };
        if (!(sc in S)) throw new Error('Choose: ok | port-in-use | bad-config | permission | missing-dir');
        var nodes = [box('U', 'you: systemctl start', 12, 8, 22), box('SD', 'systemd (PID 1)', 45, 8, 18), box('A', 'nginx master', 80, 8, 16), box('C', 'read config + files', 80, 28, 22), box('B', 'bind port :80', 45, 28, 16), box('J', 'journal', 12, 28, 12)];
        var edges = [['U', 'SD', 'D-Bus'], ['SD', 'A', 'fork+exec'], ['A', 'C', '1'], ['A', 'B', '2'], ['A', 'J', 'stderr'], ['SD', 'J', 'status']];
        function g(hl, ehl) { return { type: 'graph', label: 'what happens on start', directed: true, height: 38, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} }; }
        var f = [];
        f.push({ narr: 'You run <code>sudo systemctl start nginx</code>. systemctl does not start anything itself: it asks <b>systemd</b> (PID 1) to do it.', parts: [g({ U: 'cur', SD: 'cur' }, { 'U-SD': 'cur' })] });
        f.push({ narr: 'systemd reads the unit file (<code>/lib/systemd/system/nginx.service</code>), runs <code>ExecStartPre</code> (for nginx: <code>nginx -t</code>), then forks and runs <code>ExecStart</code>. Output of the program goes to the <b>journal</b>.', parts: [g({ SD: 'cur', A: 'cur' }, { 'SD-A': 'cur' })] });
        var s = S[sc];
        if (!s) {
          f.push({ narr: 'nginx reads its config and certificate files - all good.', parts: [g({ A: 'ok', C: 'ok' }, { 'A-C': 'ok' })] });
          f.push({ narr: 'It binds port 80 and starts workers. systemd marks the unit <b>active (running)</b>.', parts: [g({ A: 'ok', B: 'ok', SD: 'ok' }, { 'A-B': 'ok' }), { type: 'code', label: 'systemctl status nginx', lang: 'text', code: 'Active: active (running) since Mon 09:12:01 UTC; 3s ago\nMain PID: 1534 (nginx)', hl: { 1: 'ok' } }] });
          f.push({ narr: 'Never stop at "it says running". Test the real thing: <code>curl -I http://localhost</code> → <b>200 OK</b>, and <code>systemctl is-enabled nginx</code> → enabled, so it survives a reboot.', parts: [g({ A: 'sel' }), { type: 'text', html: '<span class="c-g">Healthy.</span> Try the other scenarios in the input box.' }] });
          return f;
        }
        var bad = {}; bad[s.at] = 'bad'; bad.A = 'bad';
        var be = {}; be['A-' + s.at] = 'bad';
        f.push({ narr: 'nginx ' + (s.at === 'B' ? 'reads its config fine, then tries to <b>bind port 80</b>' : 'reads its config and the files it points to') + ' and fails. It prints one error line to stderr and exits with status 1.', parts: [g(bad, be)] });
        f.push({ narr: 'systemd sees the non-zero exit and marks the unit <b>failed</b>. Your terminal only shows the useless summary <code>Job for nginx.service failed because the control process exited with error code</code>.', parts: [g({ SD: 'bad', U: 'bad' }, { 'U-SD': 'bad' }), { type: 'code', label: 'systemctl status nginx', lang: 'text', code: 'Active: failed (Result: exit-code)\nProcess: 1601 ExecStartPre=/usr/sbin/nginx -t (code=exited, status=1/FAILURE)', hl: { 1: 'bad' } }] });
        f.push({ narr: 'Read the journal: <code>journalctl -u nginx -n 30 --no-pager</code>. Look for the <b>first</b> <code>[emerg]</code> or <code>error</code> line - that is the cause; later lines are consequences.', parts: [g({ J: 'cur' }, { 'A-J': 'cur' }), { type: 'code', label: 'journalctl -u nginx', lang: 'text', code: s.log, hl: { 1: 'bad' } }] });
        f.push({ narr: 'Confirm the cause with one targeted command: <code>' + H.esc(s.check) + '</code>. ' + s.why, parts: [{ type: 'code', label: 'check', lang: 'bash', code: s.check + '\n# ' + s.find, hl: { 2: 'cur' } }] });
        f.push({ narr: 'Fix the cause, start again, and verify with <code>systemctl status</code> plus a real request (<code>curl -I localhost</code>).', parts: [{ type: 'code', label: 'fix', lang: 'bash', code: s.fix, hl: { 1: 'ok' } }, g({ SD: 'ok', A: 'ok', B: 'ok', C: 'ok' })] });
        return f;
      }
    }, {
      title: 'Reading top: is it CPU, disk, memory or the cloud host?',
      input: 'us=12 sy=3 wa=55 st=0 load=6.2 cpus=2 availMB=900',
      inputLabel: 'us= sy= wa= st= (percent), load=, cpus=, availMB=',
      gen: function (input) {
        var v = {};
        String(input || '').trim().split(/\s+/).forEach(function (p) { var m = p.match(/^(\w+)=(\d+(?:\.\d+)?)$/); if (m) v[m[1]] = Number(m[2]); });
        ['us', 'sy', 'wa', 'st', 'load', 'cpus', 'availMB'].forEach(function (k) { if (!(k in v)) throw new Error('Missing ' + k + '=. Example: us=12 sy=3 wa=55 st=0 load=6.2 cpus=2 availMB=900'); });
        if (v.us + v.sy + v.wa + v.st > 100) throw new Error('us+sy+wa+st cannot exceed 100');
        if (v.cpus < 1 || v.cpus > 256) throw new Error('cpus must be 1-256');
        var idle = 100 - v.us - v.sy - v.wa - v.st;
        var bars = [v.us, v.sy, v.wa, v.st, idle];
        var lab = ['us (apps)', 'sy (kernel)', 'wa (disk wait)', 'st (steal)', 'idle'];
        var f = [];
        f.push({ narr: 'The top header for one moment. Each CPU percentage tells you <b>where time goes</b>. We read it like a doctor reads vital signs: one number at a time.', parts: [{ type: 'bars', label: '%Cpu(s)', values: bars, idxLabels: lab }, { type: 'vars', label: 'other vitals', vals: { 'load (1 min)': v.load, CPUs: v.cpus, 'avail MiB': v.availMB } }] });
        var per = Math.round(v.load / v.cpus * 100) / 100;
        f.push({ narr: 'Load average <b>' + v.load + '</b> on <b>' + v.cpus + '</b> CPUs = <b>' + per + '</b> per CPU. ' + (per > 1 ? '<span class="c-r">More than 1 means work is queuing.</span> But load also counts tasks waiting for disk, so check <b>wa</b> next.' : 'Under 1 per CPU: the box is not overloaded.'), parts: [{ type: 'bars', label: 'load per CPU (1.0 = full)', values: [per, 1], idxLabels: ['now', 'limit'], hl: { 0: per > 1 ? 'bad' : 'ok' } }] });
        var k = bars.slice(0, 4).indexOf(Math.max(v.us, v.sy, v.wa, v.st));
        var diag = [
          'High <b>us</b>: your application code is burning CPU. Sort top by CPU (<kbd>P</kbd>), find the process, then look at its logs or profile it. Fix: optimise, add instances, or a bigger instance type.',
          'High <b>sy</b>: the kernel is busy - lots of syscalls, network packets or context switches. Look at the process with most CPU and what it is doing (<code>strace -c -p PID</code>, CS Core 8).',
          'High <b>wa</b>: CPUs are idle <b>waiting for the disk</b>. Run <code>iostat -xz 1</code> (package sysstat) to see which disk is at 100% util. In the cloud, check the volume\'s IOPS/throughput limits and burst balance.',
          'High <b>st</b> (steal): the hypervisor is giving your vCPU time to other tenants, or a burstable instance (t3/t4g, B-series) ran out of CPU credits. Nothing inside the VM fixes it: change instance type or enable unlimited mode.'
        ][k];
        var hl = {}; hl[k] = 'bad';
        f.push({ narr: 'Biggest non-idle slice: <b>' + lab[k] + '</b> at ' + bars[k] + '%. ' + diag, parts: [{ type: 'bars', label: '%Cpu(s)', values: bars, idxLabels: lab, hl: hl }] });
        f.push({ narr: 'Memory: <b>avail ' + v.availMB + ' MiB</b>. ' + (v.availMB < 200 ? '<span class="c-r">Very low.</span> Expect swapping or the OOM killer. Check <code>ps aux --sort=-%mem | head</code> and <code>journalctl -k | grep -i oom</code>.' : 'Fine. Ignore "free" - Linux fills spare RAM with disk cache and gives it back when apps need it.'), parts: [{ type: 'vars', label: 'memory', vals: { 'avail MiB': v.availMB, status: v.availMB < 200 ? 'LOW' : 'ok' }, hl: { status: v.availMB < 200 ? 'bad' : 'ok' } }] });
        f.push({ narr: 'Write the finding as one sentence for the ticket, for example: "Load ' + v.load + ' on ' + v.cpus + ' vCPUs, mostly ' + lab[k] + '; next step: ' + ['identify the hot process', 'trace the busy process', 'check disk IOPS limits', 'review instance type / CPU credits'][k] + '." Clear notes help the next engineer.', parts: [{ type: 'text', html: 'Diagnosis: <b>' + lab[k] + '</b> bound.' }] });
        return f;
      }
    }],
    examples: [
      { title: 'Who is using port 8080?', html: `<p>A Java app fails with <code>Address already in use: 8080</code>. <code>ss</code> shows the listener and its PID; <code>ps</code> shows what it is and who started it. Here an old copy of the same app never stopped. Stop it the right way (its service if it has one), then start the new one.</p>`, code: `sudo ss -ltnp 'sport = :8080'
# LISTEN 0 100 *:8080 *:* users:(("java",pid=4120,fd=31))
ps -o pid,user,etime,cmd -p 4120          # how long it ran and its full command
systemctl status 4120 --no-pager          # systemd tells you which unit owns this PID, if any
sudo kill 4120                            # if it is a stray process: TERM first
sudo systemctl start myapp` },
      { title: 'A service that dies at boot but starts fine by hand', html: `<p>After a reboot the app is down; <code>systemctl start</code> works. The journal for the boot (<code>-b</code>) shows it started before the network or the data disk was ready. The fix is ordering in a drop-in: <code>After=network-online.target</code> plus <code>Wants=</code>, or <code>RequiresMountsFor=/data</code>.</p>`, code: `journalctl -u myapp -b --no-pager | head -n 20     # logs from this boot only
systemctl is-enabled myapp
sudo systemctl edit myapp
# in the editor add:
#   [Unit]
#   Wants=network-online.target
#   After=network-online.target
#   RequiresMountsFor=/data
sudo systemctl daemon-reload` },
      { title: 'Runaway process eating CPU', html: `<p>CPU alert at 100%. <code>top</code> sorted by CPU shows a <code>php</code> worker stuck in a loop for 3 hours. Look at it before killing so the developers get evidence, then send TERM and let the service manager start a fresh worker.</p>`, code: `top -b -n 1 -o %CPU | head -n 12
ps -o pid,ppid,etime,%cpu,cmd -p 9911
sudo cat /proc/9911/status | grep -E 'State|Threads|VmRSS'
sudo timeout 5 strace -c -p 9911            # 5-second syscall summary for the devs
sudo kill 9911` },
      { title: 'Hunt for the OOM killer', html: `<p>A process vanished with no error in its own log. When the kernel runs out of memory it kills the biggest process with SIGKILL, which cannot be logged by the victim. The kernel log keeps the evidence.</p>`, code: `journalctl -k --since "2 hours ago" | grep -i -E 'out of memory|oom-kill'
# Out of memory: Killed process 2211 (java) total-vm:8123456kB, anon-rss:3900000kB
systemctl status myapp --no-pager | grep -i -E 'oom|signal'   # systemd notes "oom-kill" too
free -m` }
    ],
    deepDive: `<p>🟣 <b>Process states in ps.</b> <code>R</code> running, <code>S</code> sleeping (waiting for something, normal), <code>D</code> uninterruptible sleep (waiting for disk/NFS; cannot be killed until the I/O returns), <code>T</code> stopped, <code>Z</code> zombie (exited, parent has not collected it). A pile of <code>D</code> processes plus high load and idle CPU almost always means storage trouble - on cloud, a throttled or detached volume, or a hung network filesystem.</p>
      <p><b>How systemd supervises.</b> Each service lives in its own <b>cgroup</b>, so systemd can find and stop every child, even ones that double-forked. <code>systemctl stop</code> sends SIGTERM to the main process (configurable with <code>KillMode=</code>), waits <code>TimeoutStopSec</code> (90 s default) then SIGKILLs the rest. <code>Restart=on-failure</code> with <code>RestartSec=</code> brings it back; <code>StartLimitBurst</code> stops a crash loop after N tries, after which the unit stays failed until <code>systemctl reset-failed</code>. Edits go in drop-ins (<code>systemctl edit</code>) so package upgrades do not overwrite them, and need <code>daemon-reload</code> (systemctl edit does that for you). See CS Core 8 for writing full unit files.</p>
      <p><b>The journal.</b> journald stores structured, indexed logs: you can filter by unit (<code>-u</code>), priority (<code>-p warning</code>), time (<code>--since</code>/<code>--until</code>), boot (<code>-b -1</code> = previous boot), PID (<code>_PID=</code>) and output JSON (<code>-o json</code>). If <code>/var/log/journal</code> does not exist, logs are kept only in RAM and lost on reboot - set <code>Storage=persistent</code> in <code>journald.conf</code>. Limit its size with <code>SystemMaxUse=</code>; <code>journalctl --disk-usage</code> and <code>--vacuum-size=500M</code> manage it on a full disk.</p>
      <p><b>Cloud-specific signals.</b> High <code>st</code> on burstable instances, a CPU credit balance metric at zero, and EBS/managed-disk burst balance are cloud facts that no command inside the VM will fix. Good support engineers look at both sides: the OS (<code>top</code>, <code>iostat</code>, journal) and the provider's metrics (CloudWatch, Azure Monitor). A VM that keeps restarting a service may also be getting killed by an external agent or an auto-scaling health check.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> journal output is long and noisy; an assistant is good at pointing to the first real error in 200 lines and explaining a cryptic message like <code>status=203/EXEC</code> (binary not found or not executable). Ops tools increasingly add AI summaries of incidents. <b>Where it goes wrong:</b> it jumps to <code>kill -9</code> or "just reboot", invents <code>systemctl</code> flags, and sometimes reads the <i>last</i> error instead of the first. It also cannot see your cloud metrics unless you give them.</p>
      <p><b>Use AI as a partner:</b> paste <code>systemctl status</code> and <code>journalctl -u X -n 100</code> and ask "<i>what is the first error and which single command would confirm the cause?</i>". <b>What you must still own:</b> the recipe (status → journal → config test → suspects → fix → verify), reading top's CPU split, and judging whether a restart will lose data. Never paste logs containing tokens, passwords or customer data into a public AI tool - redact first.</p>`,
    problems: [P({
      t: 'nginx will not start after a server migration', l: 'Medium', tags: ['systemctl', 'journalctl', 'ss', 'ports'], co: ['AWS Support', 'Accenture'],
      s: `<p>A customer moved their site to a new Ubuntu VM. <code>sudo systemctl start nginx</code> prints <code>Job for nginx.service failed because the control process exited with error code</code>. The VM was built from an old image that also had Apache installed. Diagnose and fix so nginx serves on port 80 and keeps doing so after a reboot.</p>`,
      ex: `<p><code>journalctl -u nginx</code> → ${H.c('r', 'bind() to 0.0.0.0:80 failed (98: Address already in use)')}. <code>ss -ltnp</code> → ${H.c('r', 'apache2 pid=812 on :80')}. After disabling Apache and starting nginx: ${H.c('g', 'Active: active (running)')} and <code>curl -I localhost</code> → ${H.c('g', '200 OK')}.</p>`,
      bw: `<p>Reboot and hope, or <code>sudo kill -9</code> the PID on port 80. Apache is an enabled service, so it comes back on the next boot (or systemd restarts it at once), and nginx fails again at 3 a.m. You also never read the log, so you would miss a config error if that was the cause.</p>`,
      bc: `sudo kill -9 812           # apache2 is restarted by systemd or comes back at boot
sudo systemctl start nginx  # works today, fails after the next reboot`,
      q: ['The journal says <code>Address already in use</code> for port 80. Which command shows the process holding it?', ['<code>sudo ss -ltnp \'sport = :80\'</code>', '<code>ps aux | grep 80</code>', '<code>systemctl list-units</code>', '<code>df -h</code>'], 0, 'ss -l lists listening sockets, -t TCP, -n numeric ports, -p the owning process (needs sudo). grep 80 on ps would match any command containing the digits 80.'],
      h: ['<p>Hint 1: the terminal message is a summary. The real reason is in <code>systemctl status nginx</code> and <code>journalctl -u nginx</code>.</p>', '<p>Hint 2: "Address already in use" means another listener. Find it with <code>ss -ltnp</code>, then ask systemd which unit owns that PID.</p>', '<p>Hint 3: stop <b>and disable</b> the other service (or move one of them to another port), then start and enable nginx, and verify with <code>curl</code> and <code>is-enabled</code>.</p>'],
      a: `<p>Read <code>systemctl status nginx</code> and <code>journalctl -u nginx -n 50</code>: the first error is <code>bind() to 0.0.0.0:80 failed (98: Address already in use)</code>. Run <code>sudo nginx -t</code> to rule out config errors. <code>sudo ss -ltnp 'sport = :80'</code> shows apache2 listening; <code>systemctl status 812</code> confirms it belongs to <code>apache2.service</code>. Since the customer wants nginx, run <code>systemctl disable --now apache2</code> (optionally <code>apt purge apache2</code> after confirming nothing else uses it, or <code>systemctl mask</code> to stop anything starting it). Then <code>systemctl enable --now nginx</code>, check it is active, <code>curl -I http://localhost</code>, and confirm <code>is-enabled</code>. Tell the customer the cause: two web servers fighting for port 80.</p>`,
      code: `# 1. Read the real error
systemctl status nginx --no-pager
journalctl -u nginx -n 50 --no-pager | grep -E 'emerg|error'
sudo nginx -t                                  # rule out config problems
# 2. Who holds port 80?
sudo ss -ltnp 'sport = :80'
APACHE_PID=$(sudo ss -ltnpH 'sport = :80' | grep -o 'pid=[0-9]*' | head -n 1 | cut -d= -f2)
systemctl status "$APACHE_PID" --no-pager | head -n 3   # which unit owns it
# 3. Stop it now AND at boot
sudo systemctl disable --now apache2
# 4. Start nginx now and at boot, then verify for real
sudo systemctl enable --now nginx
systemctl is-active nginx && systemctl is-enabled nginx
curl -sI http://localhost/ | head -n 1`,
      cx: `<p>Two minutes once you read the journal. The cost of skipping the journal is guessing. Risk: disabling apache2 is safe only after you confirm it serves nothing else.</p>`,
      f: ['What would <code>status=203/EXEC</code> in systemctl status tell you?', 'How would you run both web servers on one VM if both are really needed?']
    })]
  });

  // ───────────────────────── Topic 5: text tools for logs ─────────────────────────
  topics.push({
    title: 'Text Tools for Log Detective Work: grep, cut, awk, sort, uniq and sed',
    analogy: `<p>A log file is a <b>giant pile of receipts</b>. You never read them all. You use a row of helpers at a long table: the first one throws away every receipt that is not a refund (<b>grep</b>), the next one cuts out just the shop name (<b>cut</b> or <b>awk</b>), the next sorts them into piles (<b>sort</b>), the next counts each pile (<b>uniq -c</b>), and the last one points to the tallest pile (<b>sort -rn | head</b>). Each helper does one tiny job and passes the result along the table: that is a <b>pipe</b> (<code>|</code>).</p>`,
    explain: `<p>🟢 <b>Why this matters in cloud support.</b> Most first answers to "what happened?" come from text: <code>/var/log/nginx/access.log</code>, <code>/var/log/auth.log</code>, <code>journalctl</code> output, CSV exports. Being fast with five tools beats opening a 2 GB file in an editor (which may crash the server). CS Core 8 covers how pipes work; here we build the investigation habits.</p>
      <p>🟢 <b>A sample access-log line</b> (nginx "combined" format, simplified):</p>
      <pre>203.0.113.9 - - [12/Oct/2026:10:15:32 +0000] "GET /api/cart HTTP/1.1" 500 512 "-" "curl/8.5"</pre>
      <p>Split on spaces, awk sees field <code>$1</code> = client IP, <code>$7</code> = path, <code>$9</code> = status code, <code>$10</code> = bytes.</p>
      ${H.table(['Tool', 'One job', 'Most-used forms'], [
        ['<b>grep</b>', 'keep lines that match', '<code>-i</code> ignore case, <code>-v</code> invert, <code>-c</code> count, <code>-E</code> regex, <code>-r</code> folders, <code>-n</code> line no., <code>-A3 -B3</code> context, <code>-o</code> only the match'],
        ['<b>cut</b>', 'pick columns by a delimiter', '<code>cut -d: -f1,7 /etc/passwd</code>, <code>cut -d, -f3 data.csv</code>'],
        ['<b>awk</b>', 'fields + conditions + maths', '<code>awk \'$9 &gt;= 500 {print $1}\'</code>, <code>awk \'{s += $10} END {print s}\'</code>, <code>-F:</code> for another separator'],
        ['<b>sort</b>', 'order lines', '<code>-n</code> numbers, <code>-r</code> reverse, <code>-h</code> sizes like 2G, <code>-k2</code> by column 2, <code>-t,</code> separator, <code>-u</code> unique'],
        ['<b>uniq</b>', 'collapse <b>adjacent</b> duplicates', '<code>-c</code> count them; always <code>sort</code> first'],
        ['<b>sed</b>', 'find and replace / delete lines', '<code>sed \'s/old/new/g\'</code>, <code>sed -n \'10,20p\'</code>, <code>sed -i.bak</code> edit a file in place with backup'],
        ['<b>head / tail / wc</b>', 'first, last, count', '<code>tail -n 100</code>, <code>tail -F</code> follow across rotation, <code>wc -l</code>']
      ])}
      <p>🔵 <b>The investigation pattern.</b> 1) Narrow by <b>time</b> first (only the last hour). 2) Narrow by <b>what</b> (status 5xx, "error", one user). 3) <b>Extract</b> the field you care about. 4) <b>Count</b> with <code>sort | uniq -c | sort -rn</code>. 5) Look at a few full raw lines to make sure the summary means what you think. The pattern <code>sort | uniq -c | sort -rn | head</code> is worth memorising - it is the "top N" of the command line.</p>
      <p>🔵 <b>Live logs.</b> <code>tail -F /var/log/nginx/error.log</code> follows a file even when logrotate replaces it. <code>journalctl -u app -f | grep --line-buffered -i error</code> filters a live stream (without <code>--line-buffered</code> grep may hold lines back when piped further). Compressed old logs: <code>zgrep</code>, <code>zcat</code>.</p>`,
    clues: [
      '"which IPs / users / URLs caused the most X" → <code>awk \'{print $N}\' | sort | uniq -c | sort -rn | head</code>',
      '"how many 5xx errors in the last hour" → filter by time, then <code>awk \'$9 ~ /^5/\' | wc -l</code>',
      '"brute-force SSH attempts" → <code>grep "Failed password" /var/log/auth.log</code> + extract IP + count',
      '"change a setting in 40 config files" → <code>sed -i.bak \'s/old/new/\'</code> after testing without <code>-i</code>',
      '"the log file is 5 GB" → never open it in an editor: <code>tail</code>, <code>grep -c</code>, <code>awk</code> stream it line by line',
      '"old logs are .gz" → <code>zgrep</code> / <code>zcat file.gz | ...</code>'
    ],
    code: [R`# Lab: build a small sample log, then investigate it like an on-call engineer.
cat > /tmp/access.log <<'EOF'
203.0.113.9 - - [12/Oct/2026:10:15:32 +0000] "GET /api/cart HTTP/1.1" 500 512 "-" "curl/8.5"
198.51.100.4 - - [12/Oct/2026:10:15:33 +0000] "GET / HTTP/1.1" 200 1024 "-" "Mozilla/5.0"
203.0.113.9 - - [12/Oct/2026:10:15:35 +0000] "POST /api/cart HTTP/1.1" 500 512 "-" "curl/8.5"
192.0.2.77 - - [12/Oct/2026:10:16:01 +0000] "GET /login HTTP/1.1" 404 128 "-" "Mozilla/5.0"
203.0.113.9 - - [12/Oct/2026:10:16:02 +0000] "GET /api/cart HTTP/1.1" 502 256 "-" "curl/8.5"
198.51.100.4 - - [12/Oct/2026:10:16:09 +0000] "GET /api/items HTTP/1.1" 200 2048 "-" "Mozilla/5.0"
EOF

# 1. How many lines, how many server errors (status field $9 starts with 5)?
wc -l < /tmp/access.log
awk '$9 ~ /^5/' /tmp/access.log | wc -l                     # -> 3

# 2. Top client IPs among the 5xx errors
awk '$9 ~ /^5/ {print $1}' /tmp/access.log | sort | uniq -c | sort -rn | head -n 5

# 3. Which paths fail most? (-o prints only the matched part)
awk '$9 >= 500 {print $7}' /tmp/access.log | sort | uniq -c | sort -rn

# 4. Status code histogram
awk '{print $9}' /tmp/access.log | sort | uniq -c | sort -k2n

# 5. Total bytes sent
awk '{bytes += $10} END {print bytes, "bytes"}' /tmp/access.log

# 6. Only one minute of traffic, with 1 line of context after each 404
grep '12/Oct/2026:10:16' /tmp/access.log | grep -A1 '" 404 '

# 7. cut on a colon-separated file: user name and shell of every account
cut -d: -f1,7 /etc/passwd | head -n 5

# 8. sed: preview a change, then apply in place with a backup
printf 'Port 22\nPasswordAuthentication yes\n' > /tmp/sshd_demo.conf
sed 's/^PasswordAuthentication yes/PasswordAuthentication no/' /tmp/sshd_demo.conf   # preview only
sed -i.bak 's/^PasswordAuthentication yes/PasswordAuthentication no/' /tmp/sshd_demo.conf
diff /tmp/sshd_demo.conf.bak /tmp/sshd_demo.conf`],
    codeTitle: ['Log investigation toolkit on a sample access log'],
    viz: [{
      title: 'Pipeline: top IPs causing server errors',
      input: '203.0.113.9 GET /api/cart 500; 198.51.100.4 GET / 200; 203.0.113.9 POST /api/cart 500; 192.0.2.77 GET /login 404; 203.0.113.9 GET /api/cart 502; 10.0.0.5 GET /api/pay 503; 10.0.0.5 GET /api/pay 500; 198.51.100.4 GET /api/items 200',
      inputLabel: 'log lines "ip method path status" separated by ;',
      gen: function (input) {
        var lines = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (lines.length < 2 || lines.length > 14) throw new Error('Give 2-14 lines like: 10.0.0.1 GET /api 500');
        var rows = lines.map(function (l) {
          var w = l.split(/\s+/);
          if (w.length !== 4 || !/^\d{3}$/.test(w[3])) throw new Error('Each line: ip method path status (3-digit), got "' + l + '"');
          return w;
        });
        var f = [];
        f.push({ narr: 'The raw log. We want: <b>which client IPs cause the most 5xx (server) errors?</b> We will run <code>awk \'$4 ~ /^5/ {print $1}\' | sort | uniq -c | sort -rn | head -3</code> and watch each stage. (In this simplified log the status is field 4; in real nginx logs it is <code>$9</code>.)', parts: [{ type: 'table', label: 'access.log', columns: ['$1 ip', '$2 method', '$3 path', '$4 status'], rows: rows }] });
        var hl = {}; rows.forEach(function (r, i) { hl[i] = r[3].charAt(0) === '5' ? 'ok' : 'done'; });
        f.push({ narr: 'Stage 1 - awk checks each line: does field 4 start with 5? Green lines pass, faded ones are dropped. awk reads one line at a time, so this works the same on a 10 GB file.', parts: [{ type: 'table', label: "awk '$4 ~ /^5/'", columns: ['$1 ip', '$2 method', '$3 path', '$4 status'], rows: rows, hl: hl }] });
        var ips = rows.filter(function (r) { return r[3].charAt(0) === '5'; }).map(function (r) { return r[0]; });
        if (!ips.length) {
          f.push({ narr: 'No line has a 5xx status, so the rest of the pipeline gets nothing. Good news for the service!', parts: [{ type: 'array', label: 'output', values: ['(empty)'] }] });
          f.push({ narr: 'Try adding a line like <code>10.0.0.9 GET /x 500</code> in the input.', parts: [{ type: 'text', html: 'No server errors found.' }] });
          return f;
        }
        f.push({ narr: 'Still in awk: <code>{print $1}</code> keeps only the IP column. The pipe passes these ' + ips.length + ' lines to the next tool.', parts: [{ type: 'array', label: 'after awk', values: ips.slice() }] });
        var sorted = ips.slice().sort();
        f.push({ narr: 'Stage 2 - <code>sort</code> puts equal IPs next to each other. This matters because <code>uniq</code> only merges <b>adjacent</b> duplicates.', parts: [{ type: 'array', label: 'after sort', values: sorted.slice() }] });
        var counts = [];
        sorted.forEach(function (ip) { if (counts.length && counts[counts.length - 1][1] === ip) counts[counts.length - 1][0]++; else counts.push([1, ip]); });
        f.push({ narr: 'Stage 3 - <code>uniq -c</code> collapses each run of equal lines into one, with a count in front.', parts: [{ type: 'table', label: 'after uniq -c', columns: ['count', 'ip'], rows: counts.map(function (c) { return [String(c[0]), c[1]]; }) }] });
        var byCount = counts.slice().sort(function (a, b) { return b[0] - a[0] || (a[1] < b[1] ? -1 : 1); });
        f.push({ narr: 'Stage 4 - <code>sort -rn</code>: numeric (<b>-n</b>, so 10 comes after 9, not after 1) and reversed (<b>-r</b>, biggest first).', parts: [{ type: 'bars', label: 'after sort -rn', values: byCount.map(function (c) { return c[0]; }), idxLabels: byCount.map(function (c) { return c[1]; }), hl: { 0: 'bad' } }] });
        var top = byCount.slice(0, 3);
        f.push({ narr: 'Stage 5 - <code>head -3</code> keeps the top three. <b>' + top[0][1] + '</b> caused ' + top[0][0] + ' of the ' + ips.length + ' server errors. Next step: grep that IP to see full lines - is it one broken client, a bot, or one bad endpoint?', parts: [{ type: 'table', label: 'final answer', columns: ['count', 'ip'], rows: top.map(function (c) { return [String(c[0]), c[1]]; }), hl: { 0: 'sel' } }, { type: 'code', label: 'next command', lang: 'bash', code: "grep '^" + top[0][1] + " ' access.log | tail -n 20" }] });
        return f;
      }
    }, {
      title: 'sed s/old/new/: what changes and what does not',
      input: 'PasswordAuthentication yes | #PasswordAuthentication yes | PasswordAuthentication yes # set by cloud-init | PermitRootLogin yes',
      inputLabel: 'config lines separated by |  (rule: s/^PasswordAuthentication yes/PasswordAuthentication no/)',
      gen: function (input) {
        var lines = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lines.length || lines.length > 10) throw new Error('Give 1-10 config lines separated by |');
        var re = /^PasswordAuthentication yes/;
        var f = [{ narr: 'We want to switch SSH password logins off with <code>sed \'s/^PasswordAuthentication yes/PasswordAuthentication no/\'</code>. The <code>^</code> anchors the match to the <b>start of the line</b>, so comments are left alone.', parts: [{ type: 'table', label: 'before', columns: ['#', 'line'], rows: lines.map(function (l, i) { return [String(i + 1), l]; }) }] }];
        var out = [];
        lines.forEach(function (l, i) {
          var hit = re.test(l);
          var nl = hit ? l.replace(re, 'PasswordAuthentication no') : l;
          out.push(nl);
          f.push({ narr: 'Line ' + (i + 1) + ': <code>' + H.esc(l) + '</code> ' + (hit ? '<span class="c-g">matches</span> at the start, so the matched part is replaced. Anything after it (like a trailing comment) stays.' : (l.indexOf('PasswordAuthentication yes') >= 0 ? 'contains the text but <b>not at the start</b> (it is commented out), so <code>^</code> stops the match. Good: we do not want to edit comments.' : 'does not match at all, so sed prints it unchanged.')), parts: [{ type: 'table', label: 'sed output so far', columns: ['#', 'line'], rows: out.map(function (x, k) { return [String(k + 1), x]; }), hl: one(i, hit ? 'ok' : 'done') }] });
        });
        if (lines.length < 2) f.push({ narr: 'Only one line was given. Real config files have many lines; sed applies the same rule to each line independently, top to bottom, in one streaming pass.', parts: [{ type: 'text', html: 'Try adding <code>| #PasswordAuthentication yes</code> to see a comment being skipped.' }] });
        f.push({ narr: 'Without <code>-i</code> sed only <b>prints</b> the result - a free preview. When happy, run <code>sudo sed -i.bak ...</code> to edit the file and keep a <code>.bak</code> copy. For sshd, always run <code>sudo sshd -t</code> before reloading, and keep your current session open in case you lock yourself out. Note that on Ubuntu, files in <code>/etc/ssh/sshd_config.d/</code> can override the main file.', parts: [{ type: 'code', label: 'safe apply', lang: 'bash', code: "sudo sed -i.bak 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config\nsudo sshd -t && sudo systemctl reload ssh", hl: { 2: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Is someone brute-forcing SSH?', html: `<p>A security alert says many failed logins. <code>auth.log</code> (Ubuntu) or <code>/var/log/secure</code> (RHEL) records each failure with the source IP right after the word "from". Count per IP. Hundreds from a few IPs is a typical bot; the fix is key-only SSH, fail2ban, and a security group that only allows your office/VPN range.</p>`, code: `sudo grep 'Failed password' /var/log/auth.log | awk '{for (i = 1; i <= NF; i++) if ($i == "from") print $(i + 1)}' | sort | uniq -c | sort -rn | head
# On journald-only systems:
sudo journalctl -u ssh --since today | grep -c 'Failed password'` },
      { title: 'Errors in the last 15 minutes only', html: `<p>Customers complain "since 10:00". Filter by time first so old noise does not mislead you. journald understands time natively; for files, grep on the timestamp prefix.</p>`, code: `journalctl -u myapp --since "15 min ago" -p err --no-pager
grep -E '12/Oct/2026:10:(0|1)[0-9]' /var/log/nginx/access.log | awk '$9 >= 500' | wc -l` },
      { title: 'Slowest requests (needs $request_time in the log format)', html: `<p>If nginx logs request time as the last field, awk and sort find the slowest URLs. <code>sort -k1,1nr</code> sorts by the first column, numeric, reversed.</p>`, code: `awk '{print $NF, $7}' /var/log/nginx/access.log | sort -k1,1nr | head -n 10
# average response time per path
awk '{t[$7] += $NF; n[$7]++} END {for (p in t) printf "%.3f %s\\n", t[p] / n[p], p}' /var/log/nginx/access.log | sort -rn | head` },
      { title: 'Search all logs, including rotated .gz files', html: `<p>An order ID from a customer email: find every line mentioning it, in current and compressed old logs, with the file name. <code>zgrep</code> handles both plain and gzipped files.</p>`, code: `sudo zgrep -H 'order=88412' /var/log/myapp/app.log* | head
sudo grep -rn --include='*.log' 'order=88412' /var/log/myapp/` }
    ],
    deepDive: `<p>🟣 <b>Streaming is the superpower.</b> grep, awk, sed, cut and uniq read one line, act, and forget it, so they use constant memory on any file size. <code>sort</code> is the exception: it must see everything, so on huge inputs it spills to temp files (control with <code>-S 1G</code> and <code>-T /bigdisk</code>). Put filters <b>before</b> sort to shrink the data first. <code>LC_ALL=C sort</code> and <code>LC_ALL=C grep</code> are often several times faster because they compare bytes instead of locale rules.</p>
      <p><b>Regex flavours.</b> grep defaults to basic regex (BRE) where <code>+ ? | ( )</code> need backslashes; <code>grep -E</code> (extended) treats them as operators. <code>grep -F</code> matches fixed strings (fastest, and safe for text with dots like IPs: <code>grep -F 10.0.0.1</code> otherwise matches 10a0b0c1). <code>grep -P</code> gives Perl regex on GNU systems. sed uses BRE unless <code>-E</code>. Quote patterns in single quotes so the shell does not expand <code>$</code> or <code>*</code>.</p>
      <p><b>awk is a small language.</b> Fields <code>$1..$NF</code>, <code>NR</code> line number, <code>-F</code> separator, associative arrays (<code>count[$1]++</code>) and an <code>END</code> block let one awk replace a whole <code>sort | uniq -c</code> chain, and it handles the "IP is the word after <i>from</i>" case where column positions vary. When the format is messy (JSON logs), switch to <code>jq</code>: <code>jq -r 'select(.level=="error") | .msg'</code>.</p>
      <p><b>sed -i safety.</b> <code>sed -i</code> writes a new file and renames it over the old one, so it changes the inode, drops hard links and may reset ownership if run as a different user; on macOS/BSD the syntax is <code>sed -i ''</code>. For config at scale, Ansible's <code>lineinfile</code> or a template is more reliable than sed (covered later in this track). Always test the expression without <code>-i</code> and keep a backup suffix.</p>
      <p><b>When to stop using grep.</b> Across 50 servers, shipping logs to a central system (CloudWatch Logs, Azure Monitor, Loki, Elasticsearch) and querying there beats SSHing into each box. But the same thinking - filter by time, filter by condition, group, count, check raw lines - carries over directly to those query languages.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "give me a one-liner for the top 10 IPs with 5xx in the last hour" is a perfect AI request, and assistants are good at awk. They are also good at explaining a pipeline someone else wrote. <b>Where it goes wrong:</b> wrong field numbers for <i>your</i> log format, forgetting <code>sort</code> before <code>uniq</code>, <code>grep 10.0.0.1</code> without <code>-F</code>, <code>sed -i</code> without a backup, and GNU-only flags on macOS.</p>
      <p><b>Use AI as a partner:</b> paste 3 real sample lines (redacted) with your question, so it can count the fields correctly, then run the pipeline on a small sample first and spot-check raw lines. <b>What you must still own:</b> the filter → extract → count pattern, the meaning of each flag, and the judgement that logs can contain personal data and secrets - redact before sharing them with any external tool.</p>`,
    problems: [P({
      t: 'Find which endpoint and clients are behind a 5xx spike', l: 'Medium', tags: ['grep', 'awk', 'sort', 'uniq', 'logs'], co: ['Google Cloud Support', 'Cloudflare'],
      s: `<p>Monitoring shows 5xx errors jumped at 10:00 UTC today. Using <code>/var/log/nginx/access.log</code> (combined format: IP is <code>$1</code>, timestamp in <code>$4</code>, path <code>$7</code>, status <code>$9</code>), report: (1) how many 5xx responses happened between 10:00 and 10:59, (2) the top 3 failing paths, (3) the top 3 client IPs, and (4) whether one upstream error message dominates in <code>error.log</code>.</p>`,
      ex: `<p>Result: ${H.c('r', '1,284')} errors in the hour; paths ${H.c('r', '/api/checkout (1,201)')}, /api/cart (60), /login (23); clients spread over many IPs (not one bot); error.log dominated by ${H.c('r', 'upstream timed out (110) while reading response header from upstream')}. Conclusion: the checkout backend is slow, not an attack.</p>`,
      bw: `<p>Open the 4 GB log in <code>vim</code> or <code>less</code> and scroll. It is slow, can exhaust memory on a small VM, and you end up guessing from the few lines you saw. Or <code>grep 500</code>, which also matches byte counts and URLs containing "500".</p>`,
      bc: `vim /var/log/nginx/access.log      # 4 GB file on a 1 GB-RAM VM: painful
grep 500 /var/log/nginx/access.log  # also matches "/item/1500" and sizes like 5000`,
      q: ['Why use <code>awk \'$9 ~ /^5/\'</code> instead of <code>grep 500</code>?', ['It checks only the status field, so numbers elsewhere in the line do not match, and it also catches 502/503/504', 'awk is always faster than grep', 'grep cannot read log files', 'It hides 500 errors'], 0, 'Matching the exact field avoids false positives (paths, byte counts, timestamps containing 500) and the regex ^5 counts every server error class, not only 500.'],
      h: ['<p>Hint 1: narrow by time first: the timestamp field contains <code>DD/Mon/YYYY:10:</code> for the 10 o\'clock hour.</p>', '<p>Hint 2: then filter the status field with awk and extract <code>$7</code> or <code>$1</code>; feed into <code>sort | uniq -c | sort -rn | head -3</code>.</p>', '<p>Hint 3: for error.log, strip the variable parts (timestamps, IPs, request IDs) with sed or cut before counting, otherwise every line looks unique.</p>'],
      a: `<p>Save the hour's 5xx lines once into a temp file so every later question is fast. Use the time prefix from <code>date</code> so the command works on any day. Count lines for (1). For (2) and (3) extract <code>$7</code> and <code>$1</code> and run the top-N pattern. For (4) grep error.log for the same hour, remove the leading timestamp and the varying client/request parts with sed, and count the remaining message text. Interpret: one path dominating plus many different IPs plus "upstream timed out" means a slow backend for that endpoint, so the next step is that service's logs and metrics. One IP dominating would suggest a bot or a broken client instead.</p>`,
      code: `LOG=/var/log/nginx/access.log
HOUR=$(date -u +%d/%b/%Y):10:            # e.g. 12/Oct/2026:10:
TMP=$(mktemp)
# Filter once: this hour AND status 5xx (field 9)
grep -F "[$HOUR" "$LOG" | awk '$9 ~ /^5/' > "$TMP"
echo "5xx this hour: $(wc -l < "$TMP")"
echo "Top failing paths:"
awk '{print $7}' "$TMP" | sort | uniq -c | sort -rn | head -n 3
echo "Top client IPs:"
awk '{print $1}' "$TMP" | sort | uniq -c | sort -rn | head -n 3
echo "Most common upstream errors:"
grep -F "$(date -u +%Y/%m/%d) 10:" /var/log/nginx/error.log \\
  | sed -E 's/^[0-9\\/]+ [0-9:]+ //; s/, client: .*//' \\
  | sort | uniq -c | sort -rn | head -n 3
rm -f "$TMP"`,
      cx: `<p>One streaming pass over the log (O(lines)), then sorting only the small filtered set. Seconds even on multi-GB files. Risk: none, read-only.</p>`,
      f: ['How would you produce a per-minute count to see exactly when it started?', 'How would the same question look in CloudWatch Logs Insights?']
    })]
  });

  // ───────────────────────── Topic 6: package managers ─────────────────────────
  topics.push({
    title: 'Package Managers: apt, dnf and Keeping Servers Patched',
    analogy: `<p>A package manager is an <b>app store with a very strict librarian</b>. You ask for one book (nginx); the librarian checks the catalogue (<b>repository index</b>), sees it needs two other books first (<b>dependencies</b>), checks every book's seal (<b>GPG signature</b>), shelves them in the right places, and writes it all down so it can remove them cleanly later. <code>apt update</code> is fetching the latest catalogue; <code>apt upgrade</code> is swapping old editions for new ones.</p>`,
    explain: `<p>🟢 <b>Two big families.</b> Ubuntu and Debian use <b>.deb</b> packages with <code>apt</code> (high level) on top of <code>dpkg</code> (low level). RHEL, Rocky, AlmaLinux, Fedora and Amazon Linux 2023 use <b>.rpm</b> packages with <code>dnf</code> (older: <code>yum</code>) on top of <code>rpm</code>. Alpine (popular for small containers) uses <code>apk</code>. Same ideas, different words:</p>
      ${H.table(['Task', 'Ubuntu / Debian', 'RHEL / Amazon Linux 2023'], [
        ['refresh the catalogue', '<code>sudo apt update</code>', '<code>sudo dnf makecache</code> (dnf refreshes automatically)'],
        ['install', '<code>sudo apt install -y nginx</code>', '<code>sudo dnf install -y nginx</code>'],
        ['upgrade everything', '<code>sudo apt upgrade -y</code>', '<code>sudo dnf upgrade -y</code>'],
        ['security fixes only', '<code>unattended-upgrades</code>', '<code>sudo dnf upgrade --security</code>'],
        ['remove', '<code>sudo apt remove nginx</code> (<code>purge</code> also deletes config)', '<code>sudo dnf remove nginx</code>'],
        ['search', '<code>apt search redis</code>', '<code>dnf search redis</code>'],
        ['info / versions', '<code>apt show nginx</code>, <code>apt policy nginx</code>', '<code>dnf info nginx</code>, <code>dnf list --showduplicates nginx</code>'],
        ['installed?', '<code>dpkg -l | grep nginx</code>', '<code>rpm -q nginx</code>'],
        ['which package owns a file', '<code>dpkg -S /usr/sbin/nginx</code>', '<code>rpm -qf /usr/sbin/nginx</code>'],
        ['which package provides a command', '<code>apt-file search bin/dig</code>', '<code>dnf provides \'*/bin/dig\'</code>'],
        ['history / undo', '<code>/var/log/apt/history.log</code>', '<code>dnf history</code>, <code>dnf history undo N</code>']
      ])}
      <p>🟢 <b>Know which family you are on.</b> <code>cat /etc/os-release</code> tells you the distro and version. Answering a ticket with apt commands on an Amazon Linux box is a classic first-week mistake.</p>
      <p>🔵 <b>Repositories.</b> Packages come from repos listed in <code>/etc/apt/sources.list.d/</code> (Ubuntu 24.04 uses the <code>ubuntu.sources</code> format) or <code>/etc/yum.repos.d/*.repo</code>. Each repo is signed: the package manager refuses packages whose signature does not match a trusted key. Third-party repos (Docker, PostgreSQL, Node) add their own key - <b>only from the vendor's official instructions</b>, and on Debian/Ubuntu into <code>/etc/apt/keyrings/</code> with <code>signed-by=</code> (the old <code>apt-key</code> is deprecated). Cloud images point at a nearby mirror (for example an in-region mirror on AWS/Azure/GCP), so updates are fast and do not cost internet egress.</p>
      <p>🔵 <b>Patching is a support job.</b> "Is this server vulnerable to CVE-X?" is answered by checking the <b>installed version</b> against the distro's security notice (vendors backport fixes, so the version number may look old but be patched). Kernel and glibc updates need a <b>reboot</b> to take effect: Ubuntu writes <code>/var/run/reboot-required</code>; on RHEL <code>dnf needs-restarting -r</code> tells you. At fleet scale you patch with tools (SSM Patch Manager, Azure Update Manager, Ansible) or replace instances from a freshly built image.</p>`,
    clues: [
      '"command not found" for a common tool → find the package that provides it (<code>apt-file</code>, <code>dnf provides</code>) and install it',
      '"Could not get lock /var/lib/dpkg/lock-frontend" → another apt (often unattended-upgrades at boot) is running: wait, do not delete the lock',
      '"Unable to locate package" → you skipped <code>apt update</code>, the name differs per distro, or the repo is missing',
      '"is this server patched against CVE-..." → <code>apt policy</code> / <code>rpm -q --changelog</code> vs the vendor security notice',
      '"an upgrade broke the app" → pin or hold the version (<code>apt-mark hold</code>, <code>dnf versionlock</code>) and roll back',
      '"NO_PUBKEY" / "GPG check FAILED" → the repo\'s signing key is missing or rotated: re-add it from the vendor\'s official docs'
    ],
    code: [R`# Lab (Ubuntu): docker run -it --rm ubuntu:24.04 bash
cat /etc/os-release | head -n 3          # which distro family am I on?
apt-get update                           # refresh the catalogue first
apt-cache policy nginx                   # candidate version and which repo it comes from
apt-get install -y --no-install-recommends nginx
dpkg -l nginx                            # ii = installed OK
dpkg -S /usr/sbin/nginx                  # which package owns this file
dpkg -L nginx | head                     # files this package installed
apt-get install -y apt-file > /dev/null && apt-file update > /dev/null
apt-file search bin/dig                  # which package gives me 'dig'? -> bind9-dnsutils
apt-mark hold nginx                      # freeze this version during upgrades
apt-mark showhold
apt-get -s upgrade | head                # -s = simulate: shows what WOULD change
tail -n 20 /var/log/apt/history.log      # what was installed, when, by which command

# Lab (RHEL family): docker run -it --rm rockylinux:9 bash   or  amazonlinux:2023
# dnf install -y nginx
# rpm -qf /usr/sbin/nginx
# dnf provides '*/bin/dig'
# dnf history
# dnf upgrade --security --assumeno      # list security updates without applying`],
    codeTitle: ['Package manager toolkit (apt and dnf)'],
    viz: [{
      title: 'What apt install really does',
      input: 'nginx',
      inputLabel: 'package: nginx | htop | docker.io | curl | nothere',
      gen: function (input) {
        var name = String(input || '').trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9.+-]{0,40}$/.test(name)) throw new Error('Type one package name, e.g. nginx');
        var deps = { nginx: ['nginx-common', 'libssl3t64', 'libpcre2-8-0'], htop: ['libncursesw6', 'libnl-3-200'], 'docker.io': ['containerd', 'runc', 'iptables', 'pigz'], curl: ['libcurl4t64', 'ca-certificates'] };
        var nodes = [box('U', 'apt install ' + name, 12, 8, 24), box('I', 'local index (apt update)', 50, 8, 26), box('R', 'repo mirror', 88, 8, 16), box('G', 'GPG check', 88, 30, 14), box('D', 'dpkg unpack', 50, 30, 16), box('S', 'postinst / service', 12, 30, 20)];
        var edges = [['U', 'I', 'look up'], ['I', 'R', 'download'], ['R', 'G', '.deb'], ['G', 'D', 'verified'], ['D', 'S', 'configure']];
        function g(hl, ehl) { return { type: 'graph', label: 'install pipeline', directed: true, height: 38, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} }; }
        var f = [];
        f.push({ narr: 'You run <code>sudo apt install ' + H.esc(name) + '</code>. apt first looks in its <b>local copy of the catalogue</b> in <code>/var/lib/apt/lists</code>, made by the last <code>apt update</code>. It does not ask the internet "do you have ' + H.esc(name) + '?" each time.', parts: [g({ U: 'cur', I: 'cur' }, { 'U-I': 'cur' })] });
        if (!deps[name]) {
          f.push({ narr: '<span class="c-r">Not in the index.</span> apt says <code>E: Unable to locate package ' + H.esc(name) + '</code>. Three usual reasons: you never ran <code>apt update</code> (fresh containers have an empty index), the name is different on this distro, or it lives in a repo you have not added.', parts: [g({ I: 'bad' }), { type: 'code', label: 'fix attempts in order', lang: 'bash', code: 'sudo apt update\napt search ' + name + '\napt-file search bin/' + name, hl: { 1: 'cur' } }] });
          f.push({ narr: 'If search finds nothing, check the vendor\'s official install page - many tools (for example HashiCorp, Docker CE) ship their own signed repo.', parts: [g({ R: 'cur' }), { type: 'text', html: 'Never install random .deb files from forums on a production server.' }] });
          f.push({ narr: 'Try <b>nginx</b>, <b>curl</b> or <b>docker.io</b> in the input to see a successful install.', parts: [{ type: 'text', html: 'Unknown package: nothing changed on the system. Safe.' }] });
          return f;
        }
        var all = deps[name].concat([name]);
        f.push({ narr: 'Found. apt resolves <b>dependencies</b>: ' + H.esc(name) + ' needs ' + deps[name].join(', ') + '. It computes the full set, checks nothing conflicts, and shows you the plan before doing anything.', parts: [g({ I: 'ok' }), { type: 'table', label: 'The following NEW packages will be installed', columns: ['package', 'why'], rows: all.map(function (p) { return [p, p === name ? 'you asked' : 'dependency']; }), hl: one(all.length - 1, 'sel') }] });
        f.push({ narr: 'apt downloads each <code>.deb</code> from the mirror into <code>/var/cache/apt/archives</code>. In the cloud this mirror is usually in your region.', parts: [g({ I: 'ok', R: 'cur' }, { 'I-R': 'cur' }), { type: 'queue', label: 'download queue', items: all.slice(), frontLabel: 'next', backLabel: '' }] });
        f.push({ narr: 'Every file is checked against the <b>signed</b> index: the repo\'s Release file is signed with a GPG key you trust, and it lists the hash of every package. A tampered package fails here and is refused.', parts: [g({ R: 'ok', G: 'cur' }, { 'R-G': 'cur' })] });
        f.push({ narr: '<code>dpkg</code> unpacks files into place (<code>/usr/sbin</code>, <code>/etc/' + H.esc(name.split('.')[0]) + '</code>, <code>/lib/systemd/system</code>) and records every file in its database (<code>dpkg -L</code> lists them).', parts: [g({ G: 'ok', D: 'cur' }, { 'G-D': 'cur' }), { type: 'stack', label: 'installed (dependencies first)', items: all.slice() }] });
        f.push({ narr: 'Finally each package\'s <b>postinst</b> script runs. ' + (name === 'nginx' || name === 'docker.io' ? 'On Ubuntu this <b>enables and starts the service</b> right away - note it, because an unexpected service may now listen on a port.' : 'For a plain tool like ' + H.esc(name) + ' it just finishes setup.'), parts: [g({ D: 'ok', S: name === 'nginx' || name === 'docker.io' ? 'cur' : 'ok' }, { 'D-S': 'ok' })] });
        f.push({ narr: 'Done. Verify: <code>dpkg -l ' + H.esc(name) + '</code> shows <b>ii</b>, and the install is logged in <code>/var/log/apt/history.log</code> with the date and your command - handy when a customer asks "what changed?".', parts: [g({ U: 'ok', I: 'ok', R: 'ok', G: 'ok', D: 'ok', S: 'ok' }), { type: 'code', label: 'verify', lang: 'bash', code: 'dpkg -l ' + name + '\ngrep -A3 "install ' + name + '" /var/log/apt/history.log' }] });
        return f;
      }
    }],
    examples: [
      { title: '"dig: command not found" on a fresh VM', html: `<p>You need <code>dig</code> to debug DNS but it is missing. The package name is not "dig". Ask the package manager which package ships that file, then install it.</p>`, code: `cat /etc/os-release | grep ^ID=
# Ubuntu / Debian
sudo apt update && sudo apt install -y bind9-dnsutils
# RHEL / Amazon Linux 2023
# sudo dnf install -y bind-utils
dig +short example.com` },
      { title: 'apt is stuck: "Could not get lock"', html: `<p>Right after boot, cloud images run <code>unattended-upgrades</code> and cloud-init package steps. Your apt command fails with a lock error. <b>Do not delete lock files</b> - that can corrupt the package database. Find who holds the lock and wait for it.</p>`, code: `sudo lsof /var/lib/dpkg/lock-frontend          # which process holds it?
ps -o pid,etime,cmd -C unattended-upgr,apt,apt-get,dpkg
# wait until it finishes, then retry
while sudo fuser /var/lib/dpkg/lock-frontend > /dev/null 2>&1; do sleep 5; done
sudo apt install -y nginx` },
      { title: 'Check whether a CVE is fixed on this server', html: `<p>Security asks if OpenSSH is patched for a new CVE. Look at the installed version and compare it with the distro's security notice (Ubuntu USN / Red Hat RHSA), not with upstream's version - distros backport fixes. On RHEL the package changelog mentions CVE numbers directly.</p>`, code: `# Ubuntu
apt policy openssh-server | head -n 3
zgrep -i 'CVE-2024-6387' /usr/share/doc/openssh-server/changelog.Debian.gz | head -n 3
# RHEL family
# rpm -q openssh-server
# rpm -q --changelog openssh-server | grep -i 'CVE-2024-6387'
[ -f /var/run/reboot-required ] && cat /var/run/reboot-required` },
      { title: 'An upgrade broke the app: hold and roll back', html: `<p>After <code>apt upgrade</code>, a library update broke the app. Check what changed in the history log, install the previous version explicitly (apt keeps old versions in the repo for a while), then <b>hold</b> it until the app is fixed. dnf has <code>history undo</code> for the same job.</p>`, code: `grep -A4 'Start-Date' /var/log/apt/history.log | tail -n 12
apt list --all-versions libfoo2 2>/dev/null
sudo apt install -y --allow-downgrades libfoo2=2.4.1-1ubuntu1
sudo apt-mark hold libfoo2
# RHEL: sudo dnf history list; sudo dnf history undo 42` }
    ],
    deepDive: `<p>🟣 <b>Package database and states.</b> dpkg keeps state in <code>/var/lib/dpkg/status</code>; <code>dpkg -l</code> flags like <code>ii</code> (installed), <code>rc</code> (removed, config left), <code>iU</code>/<code>iF</code> (half-configured) show trouble. A killed upgrade leaves packages half-configured; <code>sudo dpkg --configure -a</code> then <code>sudo apt -f install</code> finishes the job. rpm keeps a database in <code>/var/lib/rpm</code>; <code>rpm -V pkg</code> verifies installed files against it (spotting hand-edited or tampered binaries).</p>
      <p><b>Config files are special.</b> Package-owned config in <code>/etc</code> is marked as a "conffile": on upgrade, if you edited it, dpkg asks whether to keep yours (or writes <code>.dpkg-dist</code>); rpm writes <code>.rpmnew</code>/<code>.rpmsave</code>. In automation use <code>-o Dpkg::Options::=--force-confold</code> and <code>DEBIAN_FRONTEND=noninteractive</code> so upgrades never hang on a prompt. Prefer drop-in folders (<code>conf.d/</code>) to editing the main file, so upgrades merge cleanly.</p>
      <p><b>Trust chain.</b> Repos sign a metadata file (InRelease / repomd.xml) that lists the hash of every package. Adding a third-party repo means trusting its key for <b>every</b> package it ships, so scope keys with <code>signed-by=</code> to that one repo. <code>curl ... | sudo bash</code> install scripts skip all of this: read them first, or use the vendor's repo instead.</p>
      <p><b>Immutable vs patched servers.</b> Long-lived "pet" servers are patched in place on a schedule (maintenance window, reboot, verify). Modern cloud setups often prefer <b>immutable</b> infrastructure: bake a new image with patches (Packer, EC2 Image Builder), roll out new instances, retire old ones. Containers follow the same idea: rebuild the image from an updated base rather than running <code>apt upgrade</code> inside a running container. Either way, <b>pin versions</b> in automation (<code>nginx=1.24.0-2ubuntu7</code>) so two servers built a week apart are identical. Other package sources you will meet: <b>snap</b> (Ubuntu, self-contained, auto-updating), <b>flatpak</b>, language managers (pip, npm) - keep those out of the system Python (<code>pip install --user</code>, venvs, <code>pipx</code>).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants know package names across distros (bind9-dnsutils vs bind-utils) and write install steps quickly. Vulnerability scanners with AI summaries now tell you which packages to patch first. <b>Where it goes wrong:</b> they mix apt and dnf, recommend deprecated <code>apt-key add</code>, invent package names, suggest <code>rm /var/lib/dpkg/lock*</code> to "fix" locks, and paste <code>curl | sudo bash</code> from unknown sites.</p>
      <p><b>Use AI as a partner:</b> tell it your exact distro (paste <code>/etc/os-release</code>) and ask for official-repo instructions; cross-check against the vendor's docs. <b>What you must still own:</b> knowing your distro family, the trust model of signed repos, how to roll back, and when a reboot is required. Supply-chain attacks are real: an AI-suggested package with a slightly wrong name (typosquatting) is exactly how malware gets in.</p>`,
    problems: [P({
      t: 'Patch a server for a critical OpenSSL fix', l: 'Medium', tags: ['apt', 'dnf', 'patching', 'cve'], co: ['Red Hat', 'Oracle Cloud'],
      s: `<p>Security sends a notice: a critical OpenSSL vulnerability is fixed in the latest distro packages. You own one Ubuntu 24.04 VM running nginx and one Amazon Linux 2023 VM running a Java app. For each: check whether it is affected, apply <b>only</b> the needed update with minimal downtime, make sure running services actually use the new library, and record what you did.</p>`,
      ex: `<p>Ubuntu: <code>apt policy libssl3t64</code> shows installed ${H.c('r', '3.0.13-0ubuntu3.1')}, candidate ${H.c('g', '3.0.13-0ubuntu3.4')} from <code>noble-security</code> → affected. After <code>apt install --only-upgrade</code> and restarting the processes that still map the old library, <code>lsof | grep DEL | grep libssl</code> prints ${H.c('g', 'nothing')}.</p>`,
      bw: `<p>Run <code>sudo apt upgrade -y</code> / <code>dnf upgrade -y</code> on both and walk away. It upgrades hundreds of unrelated packages (bigger risk of breaking the app), and the running nginx and Java processes keep the <b>old</b> OpenSSL loaded in memory until restarted - so the box is still vulnerable even though the package is new.</p>`,
      bc: `sudo apt upgrade -y        # upgrades everything, not just openssl
# nginx keeps the old libssl in memory until it restarts -> still vulnerable`,
      q: ['After upgrading the OpenSSL package, why are you not done yet?', ['Running processes still have the old library loaded until they restart', 'apt needs a second apt update', 'OpenSSL updates always need a new kernel', 'The package is only downloaded, not installed'], 0, 'Shared libraries are mapped into a process when it starts. A new file on disk does not change running processes; restart them (or reboot). needrestart (Ubuntu) and dnf needs-restarting help find them.'],
      h: ['<p>Hint 1: first prove you are affected: compare the installed version with the candidate from the security repo (<code>apt policy</code>, <code>dnf updateinfo</code>).</p>', '<p>Hint 2: upgrade only the affected packages: <code>apt install --only-upgrade PKG</code> or <code>dnf upgrade --advisory=ID</code> / <code>dnf upgrade openssl-libs</code>.</p>', '<p>Hint 3: find processes still using deleted (old) library files and restart them; on RHEL use <code>dnf needs-restarting</code>. Record versions before/after in the ticket.</p>'],
      a: `<p>Identify the distro (<code>/etc/os-release</code>) and the package names: on Ubuntu 24.04 the library is <code>libssl3t64</code> plus the <code>openssl</code> tool; on Amazon Linux 2023 it is <code>openssl-libs</code>. Check installed vs candidate: if the candidate comes from the security pocket and is newer, you are affected. Upgrade only those packages. Then find processes that still map the old, now-deleted library (<code>lsof</code> shows <code>DEL</code>, or <code>needrestart -r l</code> / <code>dnf needs-restarting</code>) and restart those services in a quiet moment (nginx can <code>reload</code>-style restart quickly; the Java app may need a rolling restart behind its load balancer). Re-check that nothing maps the old file, confirm the services are healthy with curl, and note before/after versions in the ticket. For a fleet, do the same through a patch tool or bake a new image.</p>`,
      code: `# ---------- Ubuntu 24.04 ----------
grep -E '^(ID|VERSION_ID)=' /etc/os-release
sudo apt update
apt policy libssl3t64 openssl | grep -E 'libssl|openssl|Installed|Candidate'
sudo apt install -y --only-upgrade libssl3t64 openssl
# Processes still using the old (deleted) library file:
sudo lsof -n 2>/dev/null | grep -E 'DEL.*libssl' | awk '{print $1, $2}' | sort -u
sudo systemctl restart nginx
sudo lsof -n 2>/dev/null | grep -E 'DEL.*libssl' || echo "no process uses the old libssl"
curl -sI http://localhost/ | head -n 1

# ---------- Amazon Linux 2023 ----------
# sudo dnf updateinfo list --security | grep -i openssl
# sudo dnf upgrade -y openssl-libs openssl
# sudo dnf needs-restarting -s          # services that must restart
# sudo systemctl restart myjavaapp
# rpm -q openssl-libs                   # record the new version in the ticket`,
      cx: `<p>Minutes per server plus a short restart. Upgrading one package keeps the change small, which keeps risk small. For many servers, use a patch tool or a new image instead of SSH.</p>`,
      f: ['When would you reboot instead of restarting services?', 'How would you patch 300 servers safely without SSHing into each?']
    })]
  });

  // ───────────────────────── Topic 7: SSH and keys ─────────────────────────
  topics.push({
    title: 'SSH and Keys: Logging In Safely and Fixing "Permission denied (publickey)"',
    analogy: `<p>An SSH key pair is a <b>padlock and its only key</b>. The <b>public key</b> is the open padlock: you can hand out copies to every server you want to enter, and nobody can do harm with it. The <b>private key</b> is the one key that opens those padlocks: it never leaves your pocket. When you log in, the server says "prove you can open this padlock" and your laptop proves it <i>without ever handing the key over</i>. Lose the key, or leave it lying around, and anyone can walk into every server with that padlock.</p>`,
    explain: `<p>🟢 <b>What SSH gives you.</b> <code>ssh user@host</code> opens an encrypted remote shell. It is how you reach nearly every Linux VM in the cloud. Two halves: the <b>client</b> on your machine (<code>ssh</code>, <code>scp</code>, <code>sftp</code>) and the <b>server daemon</b> <code>sshd</code> on the VM, listening on TCP port 22.</p>
      <p>🟢 <b>Keys, not passwords.</b> Passwords can be guessed by bots that try thousands per hour. Keys cannot. Cloud VMs are created key-only: you choose or upload a key pair at launch, and cloud-init writes the public key into <code>~/.ssh/authorized_keys</code> of the default user (<code>ubuntu</code> on Ubuntu, <code>ec2-user</code> on Amazon Linux, the user you named on Azure).</p>
      ${H.table(['File (on…)', 'What it is', 'Permissions'], [
        ['<code>~/.ssh/id_ed25519</code> (your laptop)', '<b>private</b> key - never share, never commit, never paste', '<b class="c-r">600</b> (owner read/write only)'],
        ['<code>~/.ssh/id_ed25519.pub</code> (your laptop)', 'public key - safe to share', '644'],
        ['<code>~/.ssh/</code> (both sides)', 'the folder', '<b class="c-r">700</b>'],
        ['<code>~/.ssh/authorized_keys</code> (server)', 'public keys allowed to log in as this user, one per line', '600'],
        ['<code>~/.ssh/known_hosts</code> (laptop)', 'fingerprints of servers you have trusted', '644'],
        ['<code>~/.ssh/config</code> (laptop)', 'shortcuts: host aliases, users, key files, jump hosts', '600'],
        ['<code>/etc/ssh/sshd_config</code> (server)', 'server rules (ports, password login, root login)', '644, root-owned']
      ])}
      <p>🔵 <b>Make and use a key.</b> <code>ssh-keygen -t ed25519 -C "you@laptop"</code> creates the pair; give it a <b>passphrase</b> so a stolen file is useless alone, and load it once per session with <code>ssh-agent</code>/<code>ssh-add</code>. Install the public half on a server with <code>ssh-copy-id user@host</code> (or paste the <code>.pub</code> line into <code>authorized_keys</code>). For cloud VMs, the provider usually does this for you at launch.</p>
      <p>🔵 <b>Why permissions matter so much.</b> sshd has a rule called <code>StrictModes</code> (on by default): if your home folder, <code>~/.ssh</code> or <code>authorized_keys</code> is writable by group or others, it <b>ignores the keys</b> and you get <code>Permission denied (publickey)</code>. The client is strict too: a private key readable by others is refused with <code>UNPROTECTED PRIVATE KEY FILE!</code>. So <b>700</b> for folders, <b>600</b> for private keys and authorized_keys.</p>
      <p>🔵 <b>Debug in this order.</b> 1) <code>ssh -v user@host</code> (more <code>v</code>s = more detail): which keys did the client offer, what did the server answer? 2) Right user name? (ubuntu vs ec2-user vs azureuser). 3) Right key (<code>-i</code>)? 4) On the server (through the cloud console's serial console / browser SSH / SSM if you are locked out): <code>journalctl -u ssh</code> (Ubuntu; <code>sshd</code> on RHEL) shows the real reason, such as <code>Authentication refused: bad ownership or modes for directory /home/deploy</code>. 5) Network: <code>Connection timed out</code> means a firewall/security group, not keys.</p>
      <p class="c-r"><b>Safety rules:</b> never paste a private key into chat, tickets, email, AI tools or Git. Never share a key between people. If a private key leaks, remove its public line from every <code>authorized_keys</code> and make a new pair.</p>`,
    clues: [
      '"Permission denied (publickey)" → wrong user, wrong key, or bad permissions on <code>~</code>, <code>~/.ssh</code>, <code>authorized_keys</code>: <code>ssh -v</code> + server journal',
      '"UNPROTECTED PRIVATE KEY FILE" / "bad permissions" → <code>chmod 600 ~/.ssh/id_ed25519</code>',
      '"Connection timed out" vs "Connection refused" → timeout = firewall/security group/no route; refused = host reachable but nothing on port 22',
      '"REMOTE HOST IDENTIFICATION HAS CHANGED" → server rebuilt (new host key) or a real man-in-the-middle: verify, then <code>ssh-keygen -R host</code>',
      '"lost the private key for my EC2 instance" → you cannot recover it; add a new public key via SSM, EC2 Instance Connect, serial console, or by attaching the root volume to another instance',
      '"harden SSH" → keys only (<code>PasswordAuthentication no</code>), <code>PermitRootLogin no</code>, restrict source IPs in the security group, consider SSM/bastion instead of open port 22'
    ],
    code: [R`# Lab: everything below works inside two terminals of 'docker run -it --rm ubuntu:24.04 bash'
# or on your own machine (server = localhost). No cloud account needed.
apt-get update -qq && apt-get install -y -qq openssh-client openssh-server > /dev/null

# 1. Create a key pair for a test user. -N '' = no passphrase ONLY because this is a throwaway lab.
useradd -m -s /bin/bash deploy
su - deploy -c "mkdir -p -m 700 ~/.ssh && ssh-keygen -t ed25519 -C 'deploy@lab' -f ~/.ssh/id_ed25519 -N ''"
ls -l /home/deploy/.ssh/            # id_ed25519 is -rw------- (600), .pub is 644

# 2. Authorise that public key for logins as deploy, with strict permissions
su - deploy -c 'cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys'
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# 3. Start sshd (containers have no systemd, so start it directly) and log in with the key
mkdir -p /run/sshd && /usr/sbin/sshd
su - deploy -c "ssh -o StrictHostKeyChecking=accept-new -o BatchMode=yes deploy@localhost 'whoami; hostname'"

# 4. Break it on purpose: group-writable home -> sshd StrictModes refuses the key
chmod 775 /home/deploy
su - deploy -c "ssh -o BatchMode=yes deploy@localhost true" || echo "refused, as expected"
chmod 755 /home/deploy              # fix it again

# 5. Look at the fingerprint (what you compare when a server asks "are you sure?")
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`],
    codeTitle: ['Generate, install and test an SSH key (safe local lab)'],
    viz: [{
      title: 'SSH public-key login, and where it fails',
      input: 'ok',
      inputLabel: 'scenario: ok | bad-perms | wrong-user | wrong-key | firewall',
      gen: function (input) {
        var sc = String(input || 'ok').trim().toLowerCase();
        var known = ['ok', 'bad-perms', 'wrong-user', 'wrong-key', 'firewall'];
        if (known.indexOf(sc) < 0) throw new Error('Choose: ' + known.join(' | '));
        var nodes = [box('C', 'your laptop (ssh client)', 14, 10, 26), box('K', 'private key ~/.ssh/id_ed25519', 14, 34, 28), box('FW', 'security group / firewall', 50, 10, 24), box('S', 'sshd on the VM :22', 86, 10, 20), box('A', '~user/.ssh/authorized_keys', 86, 34, 26)];
        var edges = [['C', 'FW', 'TCP 22'], ['FW', 'S', ''], ['S', 'A', 'look up'], ['K', 'C', 'sign']];
        function g(hl, ehl) { return { type: 'graph', label: 'ssh deploy@vm', directed: true, height: 44, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} }; }
        var f = [];
        f.push({ narr: 'You type <code>ssh -i ~/.ssh/id_ed25519 deploy@vm</code>. First the client opens a TCP connection to port 22.', parts: [g({ C: 'cur' }, { 'C-FW': 'cur' })] });
        if (sc === 'firewall') {
          f.push({ narr: 'The security group only allows port 22 from the office IP range, and you are at home. Packets are silently dropped, so the client waits... and waits.', parts: [g({ FW: 'bad' }, { 'C-FW': 'bad' })] });
          f.push({ narr: 'After about a minute: <code>ssh: connect to host vm port 22: Connection timed out</code>. <b>Timed out</b> = nothing answered at all, so this is network, not keys. (<b>Connection refused</b> would mean the host answered but nothing listens on 22.)', parts: [g({ FW: 'bad', C: 'bad' }), { type: 'code', label: 'client output', lang: 'text', code: 'ssh: connect to host vm port 22: Connection timed out', hl: { 1: 'bad' } }] });
          f.push({ narr: 'Fix: add your current public IP (<code>curl -s https://checkip.amazonaws.com</code>) as a /32 to the security group for port 22, or better, use a bastion, VPN or a keyless method like AWS SSM Session Manager so port 22 need not be open at all.', parts: [g({ FW: 'ok' }), { type: 'text', html: 'Never open port 22 to <code>0.0.0.0/0</code> "just to test".' }] });
          return f;
        }
        f.push({ narr: 'The firewall allows it. Client and server agree on encryption and the server shows its <b>host key</b>. The client checks it against <code>known_hosts</code> - this protects you from talking to an impostor server.', parts: [g({ FW: 'ok', S: 'cur' }, { 'FW-S': 'ok' }), { type: 'text', html: 'First visit: "<i>The authenticity of host ... can\'t be established. ED25519 key fingerprint is SHA256:...</i>" - compare it with the fingerprint from the cloud console output.' }] });
        f.push({ narr: 'The client says: "I want to log in as <b>' + (sc === 'wrong-user' ? 'root' : 'deploy') + '</b> and I can prove I own this public key." It sends only the <b>public</b> key.', parts: [g({ C: 'cur', S: 'cur' }, { 'C-FW': 'cur', 'FW-S': 'cur' })] });
        if (sc === 'wrong-user') {
          f.push({ narr: 'The image\'s default user is <b>deploy</b> (or ubuntu / ec2-user / azureuser), not root. Root login is disabled and <code>/root/.ssh/authorized_keys</code> does not contain your key (some images put a "please log in as ubuntu" command there).', parts: [g({ A: 'bad', S: 'bad' }, { 'S-A': 'bad' })] });
          f.push({ narr: 'Result: <code>Permission denied (publickey)</code>. Fix: use the right user. <code>ssh -v</code> shows "Offering public key" then "Authentications that can continue: publickey" - the key was offered but not accepted for that user.', parts: [g({ C: 'bad' }), { type: 'code', label: 'fix', lang: 'bash', code: 'ssh -i ~/.ssh/id_ed25519 deploy@vm', hl: { 1: 'ok' } }] });
          return f;
        }
        if (sc === 'bad-perms') {
          f.push({ narr: 'sshd looks at <code>/home/deploy/.ssh/authorized_keys</code>. But first <b>StrictModes</b> checks ownership and modes: someone ran <code>chmod 775 /home/deploy</code> (group-writable). A group member could replace your authorized_keys, so sshd refuses to trust the file.', parts: [g({ A: 'bad' }, { 'S-A': 'bad' }), { type: 'code', label: 'server: journalctl -u ssh', lang: 'text', code: 'Authentication refused: bad ownership or modes for directory /home/deploy', hl: { 1: 'bad' } }] });
          f.push({ narr: 'Client sees only <code>Permission denied (publickey)</code> - the real reason is <b>only in the server log</b>. Get in another way (cloud serial console, browser-based SSH, SSM) and fix the modes.', parts: [g({ C: 'bad', S: 'bad' }), { type: 'code', label: 'fix on the server', lang: 'bash', code: 'sudo chmod 755 /home/deploy        # or 750; never group/other writable\nsudo chmod 700 /home/deploy/.ssh\nsudo chmod 600 /home/deploy/.ssh/authorized_keys\nsudo chown -R deploy:deploy /home/deploy/.ssh', hl: { 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' } }] });
          return f;
        }
        if (sc === 'wrong-key') {
          f.push({ narr: 'sshd reads <code>authorized_keys</code>: the public key you offered is <b>not in the list</b>. Common causes: you created the VM with a different key pair, or the line was pasted with a line break in the middle.', parts: [g({ A: 'bad' }, { 'S-A': 'bad' }), { type: 'table', label: 'compare fingerprints', columns: ['where', 'fingerprint'], rows: [['your key (ssh-keygen -lf id_ed25519.pub)', 'SHA256:Qm4x...e1'], ['authorized_keys line 1', 'SHA256:9fT2...b7']], hl: { 0: 'cur', 1: 'bad' } }] });
          f.push({ narr: 'Result: <code>Permission denied (publickey)</code>. Fix: offer the right key with <code>-i</code>, or add your <b>public</b> key to the server through a trusted channel (cloud console key reset, SSM, an admin). Compare with <code>ssh-keygen -lf</code> on both sides.', parts: [g({ C: 'bad' }), { type: 'code', label: 'fix', lang: 'bash', code: 'ssh -v -i ~/.ssh/the_right_key deploy@vm 2>&1 | grep -i offering', hl: { 1: 'ok' } }] });
          return f;
        }
        f.push({ narr: 'sshd finds a matching line in <code>authorized_keys</code> (permissions are 700/600, so StrictModes is happy). It sends a <b>challenge</b>: random data bound to this session.', parts: [g({ S: 'ok', A: 'ok' }, { 'S-A': 'ok' })] });
        f.push({ narr: 'Your laptop <b>signs</b> the challenge with the private key (unlocked by your passphrase or ssh-agent). The private key itself never leaves your laptop.', parts: [g({ K: 'cur', C: 'cur' }, { 'K-C': 'cur' })] });
        f.push({ narr: 'sshd checks the signature with the public key. Valid → you are in. <code>deploy@vm:~$</code>. The login is logged in the server journal with the key fingerprint - useful for audits.', parts: [g({ C: 'ok', FW: 'ok', S: 'ok', A: 'ok', K: 'ok' }), { type: 'code', label: 'server log', lang: 'text', code: 'Accepted publickey for deploy from 198.51.100.7 port 51522 ssh2: ED25519 SHA256:Qm4x...e1', hl: { 1: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Your first key and a tidy ~/.ssh/config', html: `<p>Create an ed25519 key with a passphrase, add it to the agent once, and define short aliases so you type <code>ssh web1</code> instead of a long command. The config also pins the key per host, so the client does not offer every key you own.</p>`, code: `ssh-keygen -t ed25519 -C "priya@laptop"     # press Enter for the default path, then set a passphrase
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519                   # asks for the passphrase once per session
cat >> ~/.ssh/config <<'EOF'
Host web1
    HostName 203.0.113.25
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh web1` },
      { title: '"WARNING: UNPROTECTED PRIVATE KEY FILE!"', html: `<p>You downloaded the cloud provider's <code>.pem</code> key to your Downloads folder; it is mode 644. The client refuses to use a key others could read. Move it into <code>~/.ssh</code> and lock it down. On Windows (OpenSSH) fix it through file Properties → Security so only your user has access.</p>`, code: `mv ~/Downloads/mykey.pem ~/.ssh/
chmod 600 ~/.ssh/mykey.pem
ssh -i ~/.ssh/mykey.pem ec2-user@203.0.113.40` },
      { title: 'Harden sshd on a new server', html: `<p>Once your key login works, turn off passwords and direct root login. Put settings in a drop-in file, <b>test the config</b>, reload, and <b>keep your current session open</b> while you test a new login in a second terminal - if you broke something you can still fix it.</p>`, code: `sudo tee /etc/ssh/sshd_config.d/60-hardening.conf > /dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
sudo sshd -t && sudo systemctl reload ssh      # unit is "sshd" on RHEL family
sudo sshd -T | grep -E 'passwordauthentication|permitrootlogin'
# now, from a SECOND terminal: ssh web1` },
      { title: 'Copy files and reach a private server through a bastion', html: `<p><code>scp</code> and <code>rsync</code> reuse SSH for file copies. Private servers (no public IP) are reached through a <b>bastion/jump host</b> with <code>-J</code>; your private key stays on your laptop the whole time, which is safer than copying it to the bastion.</p>`, code: `scp ./app.tar.gz web1:/tmp/
rsync -avz --progress ./site/ web1:/var/www/site/
ssh -J ubuntu@bastion.example.com ubuntu@10.0.2.15        # hop through the bastion
scp -J ubuntu@bastion.example.com ./app.tar.gz ubuntu@10.0.2.15:/tmp/` }
    ],
    deepDive: `<p>🟣 <b>What happens under the hood.</b> The SSH transport first does a key exchange (modern OpenSSH defaults to a post-quantum hybrid: <code>sntrup761x25519</code> since 9.0 and <code>mlkem768x25519-sha256</code> since 10.0) to agree on session keys; the server proves its identity by signing with its <b>host key</b>, which the client checks against <code>known_hosts</code>. Then user authentication: for public keys the client signs data that includes the unique session identifier, so a captured signature cannot be replayed on another connection. Agent forwarding (<code>-A</code>) lets a remote host ask <i>your</i> agent to sign - anyone with root on that host can use your agent while you are connected, so prefer <code>-J</code>/ProxyJump.</p>
      <p><b>Key types.</b> <b>ed25519</b> is the modern default: small, fast, safe. RSA keys should be 3072+ bits, and old <code>ssh-rsa</code> SHA-1 signatures are disabled in current OpenSSH (old clients/servers then fail with "no mutual signature algorithm"). Hardware-backed keys (<code>ed25519-sk</code> with a FIDO2 security key) make the private key impossible to copy. Some old managed services still only accept RSA - know how to make one (<code>ssh-keygen -t rsa -b 4096</code>).</p>
      <p><b>authorized_keys options.</b> A line can be restricted: <code>from="10.0.0.0/8",no-port-forwarding,command="/usr/local/bin/backup" ssh-ed25519 AAAA... backup@ci</code> limits a CI key to one command from one network. At scale, managing keys in files gets messy; organisations move to <b>SSH certificates</b> (a CA signs short-lived user keys; servers trust the CA via <code>TrustedUserCAKeys</code>), or to identity-aware access: AWS SSM Session Manager and EC2 Instance Connect, Azure Bastion with Entra ID login, GCP OS Login and IAP. These remove long-lived keys and give central audit logs, and they let you keep port 22 closed.</p>
      <p><b>Locked out?</b> Typical cloud recovery paths: serial console (needs a local password or the provider's feature), SSM agent (if the instance role allows it), EC2 Instance Connect (pushes a temporary key), or stop the VM, attach its disk to a rescue VM, fix <code>authorized_keys</code> or permissions there, and reattach. Knowing these calmly is a very common support-interview question. Also remember <code>fail2ban</code> or the provider's network rules for bot traffic, and that changing the SSH port only reduces log noise; it is not security.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants are good at reading <code>ssh -vvv</code> output - long and cryptic - and naming the step that failed. They write <code>~/.ssh/config</code> blocks and hardening drop-ins in seconds. <b>Where it goes wrong:</b> it may tell you to <code>chmod 777 ~/.ssh</code>, set <code>StrictHostKeyChecking no</code> globally (removes man-in-the-middle protection), enable root login or password auth "temporarily", or use agent forwarding by default.</p>
      <p><b>Use AI as a partner, carefully:</b> paste <code>ssh -v</code> output - it contains only public fingerprints - but <b>never</b> paste a private key, a <code>.pem</code> file, or <code>~/.ssh</code> contents. If you ever did, treat the key as leaked: remove it from every server and rotate. AI coding agents that run commands for you should use their own narrowly-scoped key or short-lived credentials, never your personal admin key. <b>What you must still own:</b> the public/private model, the 700/600 rule, the timeout vs refused vs publickey distinction, and safe recovery paths.</p>`,
    problems: [P({
      t: 'Locked out: "Permission denied (publickey)" after a change', l: 'Hard', tags: ['ssh', 'permissions', 'authorized_keys', 'recovery'], co: ['AWS Support', 'Microsoft Azure Support', 'Google Cloud Support'],
      s: `<p>A customer ran a "permissions cleanup" script on their Ubuntu VM and now nobody can SSH in: <code>ssh -i key.pem ubuntu@vm</code> returns <code>Permission denied (publickey)</code>. The same key worked yesterday. They still have access to the provider's <b>serial console / browser-based console</b> with a root shell. Explain how you prove the cause from the client side, fix it on the server, and verify - without opening password login.</p>`,
      ex: `<p>Client: <code>ssh -v</code> shows ${H.c('y', 'Offering public key: key.pem ED25519 SHA256:Qm4x...')} then ${H.c('r', 'Authentications that can continue: publickey')} → the key is offered but rejected. Server journal: ${H.c('r', 'Authentication refused: bad ownership or modes for directory /home/ubuntu/.ssh')}. <code>stat</code> shows <code>.ssh</code> is ${H.c('r', '777')}. After resetting to 755/700/600 and correct owner: ${H.c('g', 'Accepted publickey for ubuntu')}.</p>`,
      bw: `<p>Enable <code>PasswordAuthentication yes</code>, set a password, and log in that way "for now". It opens the VM to internet brute force, often stays that way forever, and does not fix the real problem. Or delete and recreate the VM, losing data and hours.</p>`,
      bc: `sudo sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo passwd ubuntu            # bots start guessing within minutes`,
      q: ['The client offers the right key but is rejected, and the server log says "bad ownership or modes". What is wrong?', ['The home folder, ~/.ssh or authorized_keys is writable by group/others or owned by the wrong user', 'The private key is too long', 'Port 22 is blocked', 'The host key changed'], 0, 'sshd StrictModes refuses to read authorized_keys when it or any parent folder could be modified by someone other than the user (or root). Fix ownership to the user and modes to 755 (or 700) / 700 / 600.'],
      h: ['<p>Hint 1: from the client, <code>ssh -v</code> tells you if the key was offered and rejected (auth problem) vs never reaching the server (network problem).</p>', '<p>Hint 2: the precise reason is only in the <b>server</b> log: <code>journalctl -u ssh</code> (or <code>/var/log/auth.log</code>). Use the serial console to read it.</p>', '<p>Hint 3: check owner and mode of <code>/home/ubuntu</code>, <code>.ssh</code> and <code>authorized_keys</code> with <code>stat</code> or <code>namei -l</code>; fix to user-owned, 755/700/600; test with <code>sshd -t</code>; re-login from a new terminal.</p>'],
      a: `<p>On the client, <code>ssh -v</code> shows the key is offered and the server answers "Authentications that can continue: publickey", so the network and sshd are fine and the key is being rejected. On the server via serial console, <code>journalctl -u ssh -n 30</code> shows <code>bad ownership or modes</code> for the <code>.ssh</code> folder. <code>namei -l /home/ubuntu/.ssh/authorized_keys</code> shows the script made it 777 (and maybe changed the owner to root). StrictModes is doing its job. Restore: owner <code>ubuntu:ubuntu</code> for the home and <code>.ssh</code> tree, home 755 (or 750), <code>.ssh</code> 700, <code>authorized_keys</code> 600. Check the file still contains the expected public key (compare fingerprints with <code>ssh-keygen -lf</code>). Run <code>sshd -t</code>, then retry from the client; the journal should show <code>Accepted publickey</code>. Finally, fix or remove the cleanup script and tell the customer why it broke SSH. Password login stays off throughout.</p>`,
      code: `# ---- On your laptop: is the key offered and rejected? ----
ssh -v -i ~/.ssh/key.pem ubuntu@vm 2>&1 | grep -E 'Offering|Authentications that can continue|denied'
ssh-keygen -lf ~/.ssh/key.pem            # fingerprint of the key you are offering

# ---- On the VM, through the provider's serial / browser console ----
sudo journalctl -u ssh -n 30 --no-pager | grep -iE 'refused|modes|ownership'
namei -l /home/ubuntu/.ssh/authorized_keys
# Restore ownership and modes that sshd StrictModes accepts
sudo chown ubuntu:ubuntu /home/ubuntu
sudo chown -R ubuntu:ubuntu /home/ubuntu/.ssh
sudo chmod 755 /home/ubuntu
sudo chmod 700 /home/ubuntu/.ssh
sudo chmod 600 /home/ubuntu/.ssh/authorized_keys
sudo ssh-keygen -lf /home/ubuntu/.ssh/authorized_keys   # should list your key's fingerprint
sudo sshd -t && echo "sshd config OK"

# ---- Back on the laptop, in a NEW terminal ----
ssh -i ~/.ssh/key.pem ubuntu@vm 'echo logged in as $(whoami)'`,
      cx: `<p>Ten minutes with console access. Without console access, the fallback is a rescue VM (attach disk, fix modes, reattach): about 30 minutes, plus downtime. Risk: low, no new attack surface opened.</p>`,
      f: ['What would you do if the provider had no serial console?', 'How would you prevent a script like this from breaking SSH on a whole fleet?']
    })]
  });

  // ───────────────────────── Practice: Easy ─────────────────────────
  practice.push(P({
    t: 'Deploy script says "Permission denied"', l: 'Easy', tags: ['chmod', 'execute bit', 'scripts'], co: ['TCS', 'Wipro'],
    s: `<p>A developer copied <code>deploy.sh</code> to the server and runs <code>./deploy.sh</code>. Bash answers <code>bash: ./deploy.sh: Permission denied</code>. <code>cat deploy.sh</code> works fine. Explain the cause, fix it, and name one other reason this message can appear even after the fix.</p>`,
    ex: `<p><code>ls -l deploy.sh</code> → ${H.c('r', '-rw-r--r-- deploy deploy deploy.sh')} (no x). After <code>chmod u+x</code> → ${H.c('g', '-rwxr--r--')} and the script runs. If the folder is on a filesystem mounted ${H.c('y', 'noexec')} (common for <code>/tmp</code>), it still fails.</p>`,
    bw: `<p><code>sudo chmod 777 deploy.sh</code>, or always running it with <code>sudo</code>. Both hide the real cause and give everyone write access to a script that deploys to production.</p>`,
    q: ['Which bit lets you run <code>./deploy.sh</code>?', ['x (execute) for your class (owner/group/other)', 'w (write)', 'the sticky bit', 'r alone is enough'], 0, 'Running a file as a program needs the execute bit for whichever class you fall into. Reading needs r; a shell script needs both r and x when run directly.'],
    h: ['<p>Hint 1: reading works, running does not, so look at the <b>x</b> bit in <code>ls -l</code>.</p>', '<p>Hint 2: add execute for the owner only with symbolic chmod: <code>chmod u+x</code>.</p>', '<p>Hint 3: if it still fails, check the mount options with <code>findmnt -T .</code>; on noexec you can still run <code>bash deploy.sh</code>, or move it elsewhere.</p>'],
    a: `<p>Files created by copying or downloading never get the execute bit, because new files start from mode 666 minus the umask. Running <code>./deploy.sh</code> asks the kernel to execute the file, which needs the x bit. Fix with <code>chmod u+x deploy.sh</code> (owner only) - no need for 777. Also check the first line is a valid shebang such as <code>#!/usr/bin/env bash</code>. A second cause: the file lives on a filesystem mounted <code>noexec</code>, where the kernel refuses to execute anything regardless of bits; <code>findmnt -T</code> shows the options. Running <code>bash deploy.sh</code> bypasses the x requirement because bash only <i>reads</i> the file.</p>`,
    code: `ls -l deploy.sh                  # -rw-r--r-- : no x bit
head -n 1 deploy.sh              # should be a shebang, e.g. #!/usr/bin/env bash
chmod u+x deploy.sh              # execute for the owner only
ls -l deploy.sh                  # -rwxr--r--
./deploy.sh
# Still "Permission denied"? Check the mount options of the folder:
findmnt -T . -o TARGET,OPTIONS | grep -o noexec && echo "on a noexec mount: run it as 'bash deploy.sh' or move it"`,
    cx: `<p>One command. The lesson is to change the smallest number of bits (u+x) rather than 777.</p>`,
    f: ['Why does <code>bash deploy.sh</code> work without the x bit?', 'What does a "bad interpreter: No such file or directory" error usually mean?']
  }));

  practice.push(P({
    t: 'Who is using port 8080?', l: 'Easy', tags: ['ss', 'lsof', 'ports', 'processes'], co: ['AWS Support', 'Oracle'],
    s: `<p>A new Node.js app will not start: <code>Error: listen EADDRINUSE: address already in use :::8080</code>. Find which process holds port 8080, who started it and whether it belongs to a systemd service, then free the port the right way.</p>`,
    ex: `<p><code>sudo ss -ltnp 'sport = :8080'</code> → ${H.c('r', 'users:(("node",pid=3301,fd=19))')}. <code>ps</code> shows it was started 9 days ago by user <code>deploy</code> as <code>node old-api/server.js</code>; <code>systemctl status 3301</code> shows it belongs to ${H.c('y', 'old-api.service')}. Stop and disable that unit; port 8080 is free.</p>`,
    bw: `<p><code>sudo kill -9 $(sudo lsof -t -i:8080)</code>. If the process is a service with <code>Restart=always</code>, systemd starts it again within seconds, and you may have killed something important without knowing what it was.</p>`,
    bc: `sudo kill -9 "$(sudo lsof -t -i:8080)"   # blind; systemd may restart it anyway`,
    q: ['Why use <code>sudo</code> with <code>ss -ltnp</code>?', ['Without root, ss cannot show the process name and PID for sockets owned by other users', 'ss needs root to list ports at all', 'sudo makes it faster', 'It is not needed'], 0, 'Any user can see listening ports, but the -p process column is only filled for your own processes unless you are root.'],
    h: ['<p>Hint 1: <code>ss -l</code> lists listening sockets; add <code>-t</code> TCP, <code>-n</code> numeric, <code>-p</code> process. A filter like <code>\'sport = :8080\'</code> narrows it.</p>', '<p>Hint 2: with the PID, use <code>ps -o user,etime,cmd -p PID</code> and <code>systemctl status PID</code> to learn what it is.</p>', '<p>Hint 3: if a unit owns it, <code>systemctl stop</code> (and <code>disable</code> if it should not come back); otherwise <code>kill</code> (TERM) first.</p>'],
    a: `<p>Run <code>sudo ss -ltnp 'sport = :8080'</code> (alternatives: <code>sudo lsof -iTCP:8080 -sTCP:LISTEN</code>, <code>sudo fuser 8080/tcp</code>). Take the PID and identify it with <code>ps -o pid,user,etime,cmd</code>. Ask systemd whether a unit owns the PID: <code>systemctl status PID</code> prints the unit name. If it is an old service, <code>systemctl disable --now old-api</code>. If it is a stray process, send SIGTERM and only escalate to -9 if it ignores you. Then start the new app and confirm with ss again. If both apps are needed, change one of them to another port instead.</p>`,
    code: `sudo ss -ltnp 'sport = :8080'
PID=$(sudo ss -ltnpH 'sport = :8080' | grep -o 'pid=[0-9]*' | head -n 1 | cut -d= -f2)
ps -o pid,user,etime,cmd -p "$PID"
systemctl status "$PID" --no-pager | head -n 3      # shows the owning unit, if any
# If a unit owns it:
#   sudo systemctl disable --now old-api
# If it is a stray process:
sudo kill "$PID"; sleep 3
sudo ss -ltn 'sport = :8080' | grep -q LISTEN && echo "still busy" || echo "port 8080 is free"`,
    cx: `<p>Seconds. ss reads kernel socket tables directly, so it is fast even with thousands of connections.</p>`,
    f: ['What is the difference between listening on 127.0.0.1:8080 and 0.0.0.0:8080?', 'How would you check from another machine whether port 8080 is reachable?']
  }));

  practice.push(P({
    t: 'Which config file sets this value?', l: 'Easy', tags: ['grep', 'config', '/etc'], co: ['Rackspace', 'HCL'],
    s: `<p>Uploads bigger than 1 MB fail with <code>413 Request Entity Too Large</code>. The customer says they set <code>client_max_body_size 50m;</code> "somewhere in nginx". Find every place the setting appears under <code>/etc/nginx</code>, figure out which one wins, fix it, and apply safely.</p>`,
    ex: `<p><code>grep -rn client_max_body_size /etc/nginx</code> → ${H.c('y', 'sites-available/shop.bak:12: client_max_body_size 50m;')} (a backup file, not loaded) and nothing in the enabled site. nginx default is 1m. Add it to the active <code>server</code> block, <code>nginx -t</code>, reload → uploads work.</p>`,
    bw: `<p>Open files one by one in an editor and guess. Or edit <code>sites-available</code> without checking whether the file is actually linked in <code>sites-enabled</code>. You can spend an hour editing a file nginx never reads.</p>`,
    q: ['Why can <code>nginx -T</code> be better than grep for this?', ['It prints the full configuration nginx actually loads, after includes', 'It reloads nginx', 'It searches the whole disk', 'It shows logs'], 0, 'nginx -T tests the config and dumps every file that is really included. Grep also finds backups and disabled files, which do not count.'],
    h: ['<p>Hint 1: <code>grep -rn PATTERN /etc/nginx</code> searches every file with line numbers.</p>', '<p>Hint 2: only files that are included count. <code>sudo nginx -T</code> prints the loaded config; grep that output.</p>', '<p>Hint 3: edit the active server block, run <code>nginx -t</code>, then <code>reload</code> (not restart) to apply without dropping connections.</p>'],
    a: `<p>Search with <code>grep -rn</code> to find every mention, including backups and disabled sites. Then check what nginx really loads: <code>sudo nginx -T | grep -n client_max_body_size</code>. Here it shows no active setting, so the 1 MB default applies. Add <code>client_max_body_size 50m;</code> inside the active server block (the file linked from <code>sites-enabled</code>), test with <code>nginx -t</code>, and <code>systemctl reload nginx</code>. Verify with a test upload or curl. Remove or rename stray <code>.bak</code> files to avoid future confusion. The same approach (grep the folder, then ask the program for its effective config, for example <code>sshd -T</code>, <code>php -i</code>) works for every service.</p>`,
    code: `sudo grep -rn 'client_max_body_size' /etc/nginx/
ls -l /etc/nginx/sites-enabled/                  # which site files are really active (symlinks)
sudo nginx -T 2>/dev/null | grep -n 'client_max_body_size' || echo "not set: default 1m applies"
# Add the directive to the active server block (after the server_name line)
sudo sed -i.bak '/server_name shop.example.com;/a\\    client_max_body_size 50m;' /etc/nginx/sites-available/shop
sudo nginx -t && sudo systemctl reload nginx
sudo nginx -T 2>/dev/null | grep -n 'client_max_body_size'`,
    cx: `<p>Grep is linear in the size of <code>/etc/nginx</code> (tiny). Reload keeps existing connections, so there is no downtime.</p>`,
    f: ['Which value wins if it is set in both http and server blocks?', 'What is the sshd equivalent of nginx -T?']
  }));

  practice.push(P({
    t: 'The app is down after every reboot', l: 'Easy', tags: ['systemctl', 'enable', 'boot'], co: ['Accenture', 'Capgemini'],
    s: `<p>After the monthly patch reboot, the customer's <code>myapp</code> service is always down until someone logs in and runs <code>sudo systemctl start myapp</code>. Find out why and fix it so the service starts on boot. Prove it without waiting for next month.</p>`,
    ex: `<p><code>systemctl is-enabled myapp</code> → ${H.c('r', 'disabled')}. <code>systemctl is-active myapp</code> → ${H.c('g', 'active')} (because someone started it by hand). After <code>systemctl enable myapp</code> → ${H.c('g', 'enabled')}, a test reboot leaves it running.</p>`,
    bw: `<p>Add <code>systemctl start myapp</code> to <code>/etc/rc.local</code> or a <code>@reboot</code> cron job. It works by accident, ignores ordering (network, disks), and nobody will find it later.</p>`,
    q: ['What is the difference between <code>start</code> and <code>enable</code>?', ['start runs it now; enable makes it start at boot', 'They are the same', 'enable runs it now only', 'start makes it start at boot'], 0, 'start changes the current state; enable creates the symlink from the target (e.g. multi-user.target.wants) so it starts on every boot. enable --now does both.'],
    h: ['<p>Hint 1: <code>systemctl is-enabled</code> and <code>is-active</code> answer two different questions.</p>', '<p>Hint 2: <code>enable</code> needs an <code>[Install]</code> section with <code>WantedBy=multi-user.target</code> in the unit file.</p>', '<p>Hint 3: check the previous boot\'s log (<code>journalctl -u myapp -b -1</code>) to make sure it did not try to start and fail.</p>'],
    a: `<p>Check both states: active now (someone started it) but disabled. A disabled unit is never started at boot. Confirm with the previous boot's journal that it did not even try (<code>journalctl -u myapp -b -1</code> is empty); if it tried and failed, it is an ordering or dependency problem instead. Make sure the unit has <code>[Install] WantedBy=multi-user.target</code>, then <code>sudo systemctl enable myapp</code>. Verify with <code>is-enabled</code>; schedule a test reboot in a quiet window, or at least <code>systemctl list-dependencies multi-user.target | grep myapp</code>.</p>`,
    code: `systemctl is-active myapp; systemctl is-enabled myapp      # active / disabled
journalctl -u myapp -b -1 --no-pager | head -n 5             # did it try at last boot?
systemctl cat myapp | grep -A2 '^\\[Install\\]'                # needs WantedBy=multi-user.target
sudo systemctl enable myapp
systemctl is-enabled myapp                                   # enabled
systemctl list-dependencies multi-user.target | grep myapp
# optional proof in a maintenance window:
# sudo reboot`,
    cx: `<p>One command to fix. Proving it needs a reboot or a dependency check; both are quick.</p>`,
    f: ['What does <code>systemctl mask</code> do and when would you use it?', 'Why might journalctl -b -1 show nothing at all, even for system logs?']
  }));

  // ───────────────────────── Practice: Medium ─────────────────────────
  practice.push(P({
    t: 'The app restarted at 03:12 last night. Why?', l: 'Medium', tags: ['journalctl', 'oom', 'logs'], co: ['Google Cloud Support', 'Datadog'],
    s: `<p>Monitoring shows <code>myapp</code> had 2 minutes of downtime at 03:12 UTC and is fine now. Nobody was logged in. Use the journal to build a short timeline: did the service crash, was it killed, did the whole machine reboot? Give the commands and what each would show.</p>`,
    ex: `<p><code>journalctl -u myapp --since "03:00" --until "03:20"</code> → ${H.c('r', 'myapp.service: A process of this unit has been killed by the OOM killer.')} then ${H.c('g', 'Scheduled restart job, restart counter is at 1')}. Kernel log at 03:12:07 → ${H.c('r', 'Out of memory: Killed process 2211 (java) anon-rss:3.7G')}. <code>last -x reboot</code> shows no reboot. Timeline: memory leak → OOM kill → systemd restart.</p>`,
    bw: `<p>Read <code>/var/log/syslog</code> top to bottom, or restart the app "to be safe". You lose the evidence, miss the kernel message, and the leak will hit again tomorrow at the same hour.</p>`,
    q: ['The app\'s own log has no error before it stopped. What is the most likely reason?', ['It was killed with SIGKILL (e.g. by the OOM killer), which cannot be caught or logged by the app', 'The log file was full', 'journalctl is broken', 'The app exited cleanly'], 0, 'SIGKILL ends a process instantly, so it cannot write a last message. The kernel (dmesg / journalctl -k) and systemd record the kill instead.'],
    h: ['<p>Hint 1: narrow by time with <code>--since</code> and <code>--until</code>, and by unit with <code>-u</code>.</p>', '<p>Hint 2: the kernel log (<code>journalctl -k</code>) records OOM kills; <code>journalctl --list-boots</code> or <code>last -x reboot</code> shows reboots.</p>', '<p>Hint 3: systemd itself logs "Main process exited, code=killed, status=9/KILL" and restart attempts; read those lines in order to build a timeline.</p>'],
    a: `<p>Start with the unit's journal around the time window. Look for systemd lines: "Main process exited, code=killed, status=9/KILL" or "killed by the OOM killer", then "Scheduled restart job". Check the kernel log for the same minute: an "Out of memory: Killed process" line names the victim and its memory use. Check whether the machine rebooted (<code>journalctl --list-boots</code>, <code>last -x reboot</code>, <code>uptime -s</code>); here it did not. Look for a pattern: a nightly job at 03:00 (cron, backups) might push memory over the edge - <code>journalctl --since 02:55 --until 03:12 -p warning</code> across all units shows what else ran. Write the timeline, then recommend a memory limit and alert, and send the heap evidence to developers.</p>`,
    code: `# 1. What did systemd record for the unit in that window?
journalctl -u myapp --since "03:00" --until "03:20" --no-pager
# 2. Did the kernel kill something for memory?
journalctl -k --since "03:00" --until "03:20" --no-pager | grep -iE 'out of memory|oom'
# 3. Did the whole machine reboot?
journalctl --list-boots --no-pager | tail -n 3
uptime -s
# 4. What else ran just before? (cron jobs, backups)
journalctl --since "02:55" --until "03:12" --no-pager -p warning
journalctl --since "02:55" --until "03:12" --no-pager _COMM=cron
# 5. Restart count and memory now
systemctl show myapp -p NRestarts -p MemoryCurrent`,
    cx: `<p>A few journal queries; journald indexes by time and unit, so each query takes well under a second. Risk: none, read-only.</p>`,
    f: ['How would you cap the service\'s memory so it restarts cleanly instead of triggering a host-wide OOM?', 'What if journald is not persistent and the box rebooted?']
  }));

  practice.push(P({
    t: '"No space left on device" with 60% disk used', l: 'Medium', tags: ['df', 'inodes', 'find'], co: ['IBM', 'DigitalOcean'],
    s: `<p>A PHP app cannot write session files: <code>No space left on device</code>. But <code>df -h</code> shows <code>/</code> at only 60%. Find the real cause, clean up safely, and prevent a repeat.</p>`,
    ex: `<p><code>df -i /</code> → ${H.c('r', 'IUse% 100%')}. Counting files per folder points to <code>/var/lib/php/sessions</code> with ${H.c('r', '2,400,000')} files: the session cleanup job was broken. Deleting sessions older than 1 day frees inodes: ${H.c('g', 'IUse% 18%')}.</p>`,
    bw: `<p><code>rm -rf /var/lib/php/sessions/*</code>. The shell expands <code>*</code> into millions of names and fails with "Argument list too long"; and if it worked it would log out every current user. Or grow the disk, which does not add inodes on ext4.</p>`,
    bc: `sudo rm -rf /var/lib/php/sessions/*   # "Argument list too long"; logs everyone out if it works`,
    q: ['What does <code>df -i</code> report?', ['Inodes: how many files the filesystem can still hold', 'Disk speed', 'Folder sizes', 'Open files'], 0, 'Every file needs one inode. ext4 sets the number at creation time. Millions of tiny files can exhaust inodes while bytes remain free.'],
    h: ['<p>Hint 1: if bytes are free but writes fail, check inodes with <code>df -i</code>.</p>', '<p>Hint 2: count files per folder (<code>find DIR -xdev -type f | wc -l</code>, or <code>du --inodes</code>) and drill down like with du.</p>', '<p>Hint 3: delete with <code>find ... -mtime +1 -delete</code>, which streams and avoids argument limits; then fix the cleanup job.</p>'],
    a: `<p>Confirm with <code>df -i</code>. Find the folder with the most files: <code>du --inodes -x -d1 /var | sort -n</code> (GNU du) and drill down, landing on the sessions folder. Do not <code>rm *</code>: use <code>find -mtime +1 -delete</code> so active sessions survive and the deletion streams. Check <code>df -i</code> again. Then fix the cause: PHP on Debian/Ubuntu relies on a systemd timer (<code>phpsessionclean.timer</code>) instead of PHP's own garbage collection - make sure it is enabled, or move sessions to Redis. Add an inode alert next to the disk alert. On new disks for this kind of workload, XFS or a larger inode count avoids the issue.</p>`,
    code: `df -h /; df -i /
# Which folder holds the most files? (GNU du counts inodes with --inodes)
sudo du --inodes -x -d1 /var 2>/dev/null | sort -n | tail -n 3
sudo du --inodes -x -d1 /var/lib/php 2>/dev/null | sort -n | tail -n 3
# Delete old sessions without "Argument list too long"; keeps today's sessions
sudo find /var/lib/php/sessions -xdev -type f -name 'sess_*' -mtime +1 -delete
df -i /
# Fix the cause: the cleanup timer
systemctl list-timers --all | grep -i phpsession
sudo systemctl enable --now phpsessionclean.timer`,
    cx: `<p>find walks the folder once (O(files)); deleting millions of files takes minutes, so run it with <code>ionice -c3</code> on a busy box. Risk: low, only old sessions removed.</p>`,
    f: ['Why does making the disk bigger not help on ext4?', 'How else could you store sessions to avoid this entirely?']
  }));

  practice.push(P({
    t: 'Deleted a huge log, but the disk is still full', l: 'Medium', tags: ['lsof', 'deleted files', 'disk'], co: ['Amazon', 'Rackspace'],
    s: `<p>A junior engineer deleted <code>/var/log/myapp/app.log</code> (12 GB) to fix a full disk. <code>du</code> now shows <code>/var/log</code> as small, but <code>df -h /</code> is still 98%. Explain what happened and get the space back with minimal disruption.</p>`,
    ex: `<p><code>sudo lsof +L1</code> → ${H.c('r', 'java 2211 app 7w REG 12884901888 0 /var/log/myapp/app.log (deleted)')}. Truncating via <code>/proc/2211/fd/7</code> releases it at once: <code>df</code> drops to ${H.c('g', '40%')}, no restart needed.</p>`,
    bw: `<p>Reboot the server. It frees the space but causes downtime for every service on the box, and it hides the lesson that rm does not free space a process still has open.</p>`,
    q: ['Why is the space not freed after <code>rm</code>?', ['A process still has the file open; data is freed only when the last open handle closes', 'rm only moves files to a trash folder', 'df caches old numbers for an hour', 'The file was hard-linked to /tmp'], 0, 'rm removes the name (link). The inode and its blocks stay until the link count AND the count of open file descriptors both reach zero.'],
    h: ['<p>Hint 1: <code>lsof +L1</code> lists open files whose link count is below 1, i.e. deleted but still open.</p>', '<p>Hint 2: every open file appears under <code>/proc/PID/fd/</code>. Writing nothing into it (truncate) frees the blocks while the process keeps running.</p>', '<p>Hint 3: alternatively restart just that service. Then set up logrotate so nobody needs rm again.</p>'],
    a: `<p>On Linux a file's blocks are released only when no name points to it <b>and</b> no process holds it open. The app still has file descriptor 7 open for writing, so the 12 GB are still allocated but invisible to du (which walks names). <code>lsof +L1</code> finds it. Two fixes: restart the service (closes the fd), or truncate the open file through <code>/proc/PID/fd/FD</code>, which frees the space instantly with no restart. The app keeps writing into the now-empty, nameless file, so its logs are lost until it reopens a log - schedule a restart or a log reopen signal (many apps reopen on SIGHUP or SIGUSR1). Then add logrotate (<code>copytruncate</code> or a postrotate reload).</p>`,
    code: `df -h /
sudo lsof +L1 2>/dev/null | awk 'NR == 1 || $7 > 1000000000'   # deleted-but-open files over 1 GB
# Example line: java 2211 app 7w REG ... 12884901888 0 /var/log/myapp/app.log (deleted)
PID=2211; FD=7
sudo ls -l /proc/$PID/fd/$FD                  # -> /var/log/myapp/app.log (deleted)
sudo truncate -s 0 /proc/$PID/fd/$FD          # frees the blocks now, no restart
df -h /
# Later, in a quiet moment, let the app reopen a fresh log file
sudo systemctl restart myapp`,
    cx: `<p>Instant once you find the fd. lsof scans every process's fd table, which takes a second or two on a busy host.</p>`,
    f: ['Why does du not see this file but df does?', 'Which logrotate options avoid this problem for an app that never reopens its log?']
  }));

  practice.push(P({
    t: 'Run an app as a dedicated service account', l: 'Medium', tags: ['useradd', 'systemd', 'least privilege'], co: ['Red Hat', 'Infosys'],
    s: `<p>A Python API at <code>/opt/orders</code> currently runs as <b>root</b> from a tmux session. Make it a proper service: its own system user with no login, files owned correctly, a systemd unit that starts at boot, restarts on failure, and can write only to <code>/var/lib/orders</code> and <code>/var/log/orders</code>.</p>`,
    ex: `<p>After: ${H.c('g', 'orders:x:995:995::/var/lib/orders:/usr/sbin/nologin')}; <code>ps -o user,cmd -C python3</code> shows ${H.c('g', 'orders')}; <code>systemctl status orders</code> is active and enabled; <code>sudo -u orders touch /opt/orders/x</code> fails (code is read-only for the app).</p>`,
    bw: `<p>Keep running it as root in tmux. Any bug or vulnerability in the API gives an attacker root on the box; it does not start after reboot; logs disappear with the tmux session.</p>`,
    q: ['Why give a service account the shell <code>/usr/sbin/nologin</code>?', ['So nobody can get an interactive login as that user, even with a key or password', 'It makes the app faster', 'systemd requires it', 'It hides the user from ps'], 0, 'Service accounts only run one program. A nologin shell blocks SSH and su sessions for them, reducing what an attacker can do with a leaked credential.'],
    h: ['<p>Hint 1: <code>useradd --system --home-dir /var/lib/orders --shell /usr/sbin/nologin orders</code>.</p>', '<p>Hint 2: code owned by root and readable (755/644); data and log folders owned by the service user (750).</p>', '<p>Hint 3: in the unit use <code>User=orders</code>, <code>Restart=on-failure</code>, <code>WantedBy=multi-user.target</code>, and hardening like <code>ProtectSystem=strict</code> with <code>ReadWritePaths=</code>.</p>'],
    a: `<p>Create a system user with no login and a home at its data folder. Keep the code owned by root (the app must not be able to rewrite itself) and make only the data and log folders writable by the service user. Write a unit in <code>/etc/systemd/system/orders.service</code> with <code>User=orders</code>, the absolute path to the virtualenv's Python, <code>Restart=on-failure</code>, and sandboxing: <code>ProtectSystem=strict</code> makes the whole filesystem read-only except <code>ReadWritePaths</code>, <code>NoNewPrivileges=yes</code> blocks setuid tricks, <code>PrivateTmp=yes</code> gives a private /tmp. Then <code>daemon-reload</code>, <code>enable --now</code>, kill the old tmux copy, and verify the user in <code>ps</code> and the logs in <code>journalctl -u orders</code>. If the app must listen on a port below 1024, use <code>AmbientCapabilities=CAP_NET_BIND_SERVICE</code> rather than root.</p>`,
    code: `sudo useradd --system --home-dir /var/lib/orders --shell /usr/sbin/nologin orders
sudo install -d -m 750 -o orders -g orders /var/lib/orders /var/log/orders
sudo chown -R root:root /opt/orders
sudo find /opt/orders -type d -exec chmod 755 {} +
sudo find /opt/orders -type f -exec chmod 644 {} +
sudo tee /etc/systemd/system/orders.service > /dev/null <<'EOF'
[Unit]
Description=Orders API
After=network-online.target
Wants=network-online.target

[Service]
User=orders
Group=orders
WorkingDirectory=/opt/orders
ExecStart=/opt/orders/venv/bin/python -m orders.server --port 8080
Restart=on-failure
RestartSec=3
ProtectSystem=strict
ReadWritePaths=/var/lib/orders /var/log/orders
PrivateTmp=yes
NoNewPrivileges=yes

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now orders
ps -o user,pid,cmd -C python | grep orders
sudo -u orders touch /opt/orders/x 2>&1 | grep -q 'Permission denied' && echo "code is read-only for the app"`,
    cx: `<p>About 15 minutes. Big security win: a compromised API now has the rights of one unprivileged user inside a sandbox, not root.</p>`,
    f: ['What does <code>systemd-analyze security orders</code> report?', 'How would you pass secrets (DB password) to this service without putting them in the unit file?']
  }));

  practice.push(P({
    t: 'Report SSH brute-force attempts and shut them out', l: 'Medium', tags: ['grep', 'awk', 'ssh', 'security'], co: ['Cloudflare', 'Microsoft'],
    s: `<p>A security alert says an internet-facing Ubuntu VM has "lots of failed SSH logins". Produce a short report: total failed attempts today, top 5 source IPs, top 5 user names tried, and whether <b>any</b> login succeeded from those IPs. Then list the hardening steps.</p>`,
    ex: `<p>${H.c('r', '8,942')} failures today; top IP ${H.c('r', '198.51.100.23 (3,110)')}; top users tried: root, admin, ubuntu, test, oracle. No <code>Accepted</code> line from any of those IPs ${H.c('g', '(no compromise seen)')}. Next: keys only, security group restricted to the office IP, fail2ban.</p>`,
    bw: `<p>Change the SSH port to 2222 and call it done. It reduces log noise but is not security: password login is still on, and scanners find other ports quickly.</p>`,
    q: ['What matters most in this report?', ['Whether any login succeeded from the attacking IPs', 'The exact count of failures', 'The country of each IP', 'How fast the attempts were'], 0, 'Failed attempts are background noise on any public IP. A successful login from a brute-forcing IP means a possible compromise and changes the response completely.'],
    h: ['<p>Hint 1: failures look like <code>Failed password for [invalid user] NAME from IP port N ssh2</code>; successes like <code>Accepted publickey|password for NAME from IP</code>.</p>', '<p>Hint 2: the IP is the word after "from" and the user the word after "for" (skip "invalid user"). awk with a loop over fields handles both shapes.</p>', '<p>Hint 3: save the top IPs to a file and use <code>grep -F -f</code> to search Accepted lines for any of them.</p>'],
    a: `<p>Read today's sshd messages from the journal (works whether or not auth.log exists). Count failure lines. Extract IPs and users with awk by locating the words "from" and "for" (the "invalid user" variant shifts positions, so searching for the keyword is more robust than fixed columns). Run the top-N pattern. Save the top IPs and grep "Accepted" lines for them; any hit means investigate that account immediately (sessions, authorized_keys, sudo log). Hardening: <code>PasswordAuthentication no</code> and <code>PermitRootLogin no</code> in a drop-in, <code>sshd -t</code> and reload; restrict port 22 in the cloud security group to known IPs or close it and use SSM/bastion; optionally fail2ban for remaining exposure.</p>`,
    code: `TODAY_LOG=$(mktemp)
sudo journalctl -u ssh --since today --no-pager > "$TODAY_LOG"
echo "Failed attempts today: $(grep -c 'Failed password' "$TODAY_LOG")"
echo "Top source IPs:"
grep 'Failed password' "$TODAY_LOG" \\
  | awk '{for (i = 1; i < NF; i++) if ($i == "from") print $(i + 1)}' \\
  | sort | uniq -c | sort -rn | head -n 5 | tee /tmp/top-ips.txt
echo "Top user names tried:"
grep 'Failed password' "$TODAY_LOG" \\
  | awk '{for (i = 1; i < NF; i++) if ($i == "for") {u = $(i + 1); if (u == "invalid") u = $(i + 3); print u; break}}' \\
  | sort | uniq -c | sort -rn | head -n 5
echo "Successful logins from those IPs (should be empty):"
awk '{print $2}' /tmp/top-ips.txt > /tmp/ips-only.txt
grep 'Accepted' "$TODAY_LOG" | grep -F -f /tmp/ips-only.txt || echo "none"
rm -f "$TODAY_LOG"`,
    cx: `<p>One pass over today's journal per question; seconds. Risk: none until the hardening step, which needs the usual "keep a session open" care.</p>`,
    f: ['If one of those IPs did log in successfully, what are your next five steps?', 'Why is closing port 22 entirely better than fail2ban?']
  }));

  practice.push(P({
    t: 'Change a setting in 30 config files safely', l: 'Medium', tags: ['sed', 'find', 'config', 'backup'], co: ['Accenture', 'Deloitte'],
    s: `<p>An internal API moved from <code>http://old-api.internal:8080</code> to <code>https://api.internal</code>. About 30 files under <code>/etc/myapps/</code> (various <code>.conf</code> and <code>.env</code> files) contain the old URL. Replace it everywhere, keep backups, show a diff for review, and restart only the services whose config changed.</p>`,
    ex: `<p>${H.c('y', 'grep -rl')} finds 27 files. Preview with sed (no <code>-i</code>) and diff, then apply with <code>-i.bak</code>. Re-grep shows ${H.c('g', '0')} files with the old URL. Three services restarted, the rest untouched.</p>`,
    bw: `<p><code>sed -i 's/old-api.internal:8080/api.internal/g' /etc/myapps/*</code> with no preview or backup. The unescaped dots match any character, the <code>http://</code> stays as http, sub-folders are missed, and if the expression is wrong you have no copy to restore.</p>`,
    bc: `sudo sed -i 's/old-api.internal:8080/api.internal/g' /etc/myapps/*   # no backup, no preview, http stays`,
    q: ['Why use a different delimiter like <code>s|old|new|</code> here?', ['The URLs contain slashes, which would end a s/// expression early', 'It is faster', 'Pipes are required for -i', 'It enables regex'], 0, 'sed lets any character be the delimiter. With URLs full of /, using | avoids escaping every slash.'],
    h: ['<p>Hint 1: <code>grep -rlF OLD /etc/myapps</code> lists exactly which files contain the fixed string.</p>', '<p>Hint 2: preview by running sed without <code>-i</code> into a temp file and <code>diff -u</code>; escape dots in the pattern; use <code>|</code> as the delimiter.</p>', '<p>Hint 3: apply with <code>sed -i.bak</code> only to the listed files, re-grep to confirm zero, then map changed files to services and restart those.</p>'],
    a: `<p>Find the files first with a fixed-string grep. For each, produce a preview with sed (no -i) and show a unified diff, so a reviewer can approve. The expression uses <code>|</code> as the delimiter and escapes the dots so <code>.</code> matches only a dot. Apply with <code>sed -i.bak</code> on exactly those files. Re-grep for the old URL to prove zero remain, and grep for the new one to prove the count matches. Then restart only affected services (here derived from the file names) and check each with <code>systemctl is-active</code> and its health URL. Keep the .bak files until the change is verified, then remove them. For anything repeated, move to config management templates.</p>`,
    code: `OLD='http://old-api\\.internal:8080'
NEW='https://api.internal'
FILES=$(sudo grep -rlE "$OLD" /etc/myapps)
echo "$FILES" | wc -l
# 1. Preview: diff each file against its proposed new version
for f in $FILES; do
  sudo sed -E "s|$OLD|$NEW|g" "$f" | diff -u "$f" - | head -n 20
done
# 2. Apply with a backup next to each file
for f in $FILES; do sudo sed -E -i.bak "s|$OLD|$NEW|g" "$f"; done
# 3. Prove it
sudo grep -rlE "$OLD" /etc/myapps | wc -l            # 0
sudo grep -rlF "$NEW" /etc/myapps | wc -l            # same count as before
# 4. Restart only services whose file changed (file name = service name here)
for f in $FILES; do
  svc=$(basename "$f" | cut -d. -f1)
  systemctl list-unit-files "$svc.service" > /dev/null 2>&1 && sudo systemctl restart "$svc" && systemctl is-active "$svc"
done`,
    cx: `<p>Linear in the number of files; the preview step costs one extra pass and saves you from a fleet-wide typo.</p>`,
    f: ['How would you roll back using the .bak files in one loop?', 'Why do file names with spaces break <code>for f in $FILES</code>, and how would you fix it?']
  }));

  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'High load, idle CPU: find the real bottleneck', l: 'Hard', tags: ['top', 'iostat', 'D state', 'performance'], co: ['AWS Support', 'Netflix'],
    s: `<p>A 4-vCPU database VM shows <code>load average: 18.4, 17.9, 15.2</code>, users complain queries are slow, yet <code>top</code> shows CPU mostly idle. Explain how load can be high with idle CPUs, find the bottleneck with standard tools, and say what you would check on the cloud provider side.</p>`,
    ex: `<p><code>top</code>: ${H.c('y', 'us 4 sy 2 wa 71 st 0')}. <code>ps</code> shows 15 postgres processes in state ${H.c('r', 'D')}. <code>iostat -xz 1</code>: <code>nvme1n1</code> at ${H.c('r', '%util 100, r_await 45 ms')}. Provider metrics: the volume is at its ${H.c('r', '3,000 IOPS')} limit. Fix: raise provisioned IOPS (or gp3 throughput) and look for the query doing full scans.</p>`,
    bw: `<p>"Load is 18, add more CPUs" and resize to a bigger instance. CPUs were idle, so this changes nothing (except the bill). The disk limit stays the same, or is tied to volume settings that a CPU resize does not touch.</p>`,
    q: ['Linux load average counts which tasks?', ['Runnable tasks plus tasks in uninterruptible sleep (D), usually waiting on I/O', 'Only tasks using CPU', 'Only sleeping tasks', 'Network connections'], 0, 'Linux includes D-state tasks in load. Many processes blocked on a slow disk raise load even when CPUs are idle; the wa column in top confirms it.'],
    h: ['<p>Hint 1: in top, look at <code>wa</code> (I/O wait) and <code>st</code> (steal). High wa = waiting for disk.</p>', '<p>Hint 2: list processes in D state: <code>ps -eo state,pid,cmd | awk \'$1 == "D"\'</code>. Then <code>iostat -xz 1</code> (sysstat) to see which device has %util near 100 and high await.</p>', '<p>Hint 3: in the cloud, a volume has IOPS and throughput limits (and burst credits on some types). Compare iostat numbers with the provider\'s volume metrics.</p>'],
    a: `<p>Load average on Linux counts runnable <b>and</b> uninterruptible (D) tasks, so many processes stuck waiting on storage give a high load with idle CPUs. Confirm with top's <code>wa</code>, then list D-state processes and the device that is saturated (<code>iostat -xz 1</code>: <code>%util</code> near 100, high <code>r_await/w_await</code>). <code>iotop</code> or <code>pidstat -d 1</code> shows which processes do the I/O. Map the device to its mount (<code>lsblk</code>) to know which volume it is. On the provider side check the volume's IOPS/throughput metrics against its limits, burst balance, and the instance's own EBS/disk bandwidth limit (small instance types cap total disk throughput). Short term: raise the volume's IOPS or move to a faster type; long term: fix the query or add caching. Write it up with numbers.</p>`,
    code: `nproc; uptime                                       # load vs number of CPUs
top -b -n 1 | head -n 5                             # look at wa and st in %Cpu(s)
# Processes stuck in uninterruptible sleep (usually waiting for I/O)
ps -eo state,pid,user,cmd | awk '$1 == "D"' | head
# Which device is saturated? (package sysstat)
sudo apt-get install -y sysstat > /dev/null 2>&1 || sudo dnf install -y sysstat > /dev/null 2>&1
iostat -xz 1 5                                       # watch %util and r_await / w_await
pidstat -d 1 5                                       # which processes read/write most
lsblk -o NAME,SIZE,MOUNTPOINT                        # map nvme1n1 to its mount point
# Then compare with the provider's volume metrics (IOPS, throughput, burst balance)`,
    cx: `<p>Five minutes of measurement. The cost of guessing wrong (resizing CPU) is real money and no improvement.</p>`,
    f: ['How would high <code>st</code> change your diagnosis?', 'What does a D-state process that never leaves D usually point to on a VM with an NFS/EFS mount?']
  }));

  practice.push(P({
    t: 'A private key leaked: rotate and audit access', l: 'Hard', tags: ['ssh', 'authorized_keys', 'incident', 'audit'], co: ['Google', 'Okta'],
    s: `<p>An engineer accidentally pushed their private key <code>id_ed25519</code> to a public Git repo. Its public half may be in <code>authorized_keys</code> of several users on the 5 servers you manage. Describe and script the response: find every place the key is authorised, remove it, check whether it was used by anyone else, and issue a new key - without locking anyone out.</p>`,
    ex: `<p>Leaked key fingerprint ${H.c('r', 'SHA256:Qm4x...e1')}. Found in ${H.c('r', '/home/priya/.ssh/authorized_keys')} on 4 servers and in ${H.c('r', '/home/deploy/.ssh/authorized_keys')} on 2. Journal shows ${H.c('y', '"Accepted publickey ... SHA256:Qm4x..." from an unknown IP 203.0.113.99')} on one server → escalate as a security incident.</p>`,
    bw: `<p>Delete the file from Git and push again. The key is in Git history and was likely scraped by bots within minutes of the push. Removing it from the repo does not revoke anything; every server that trusts the public key is still open.</p>`,
    q: ['What is the only real fix for a leaked private key?', ['Remove its public key from every authorized_keys (revoke) and use a new key pair', 'Delete the commit from Git', 'Change the passphrase', 'Change the SSH port'], 0, 'Once a private key is public, you must assume others have it. Revocation means removing the matching public key everywhere it is trusted. A new passphrase only protects your copy of the file.'],
    h: ['<p>Hint 1: identify the key by its <b>fingerprint</b> (<code>ssh-keygen -lf key.pub</code>), not by the comment, which anyone can change.</p>', '<p>Hint 2: on each server, list every <code>authorized_keys</code> file (<code>/root/.ssh</code> and <code>/home/*/.ssh</code>), compute fingerprints per line, and remove matching lines - with a backup.</p>', '<p>Hint 3: search sshd logs for "Accepted publickey" with that fingerprint to see if it was used, and from where. Install the new public key <b>before</b> removing the old one for the owner so they are not locked out.</p>'],
    a: `<p>Treat it as an incident. 1) Get the fingerprint of the leaked public key. 2) The owner creates a new key pair (with passphrase) and you add the new <b>public</b> key first. 3) On every server, scan all authorized_keys files; for each line compute its fingerprint and drop lines that match, keeping a backup and the correct owner/mode (600). 4) Search the journal (and auth.log/secure for older data) for <code>Accepted publickey</code> lines with the leaked fingerprint; any login from an unexpected IP means escalate: check that user's sessions, sudo use, new keys, cron jobs. 5) Ask the repo owner to purge history and enable secret scanning, but the revocation is what protects you. Script it so it runs identically on all servers (SSH loop with the new key, or SSM/Ansible). Afterwards, consider short-lived SSH certificates or SSM so keys matter less.</p>`,
    code: `#!/usr/bin/env bash
# revoke-key.sh FINGERPRINT  -- run with sudo on each server
set -euo pipefail
FP="$1"                                    # e.g. SHA256:Qm4x...  (from: ssh-keygen -lf leaked.pub)
for ak in /root/.ssh/authorized_keys /home/*/.ssh/authorized_keys; do
  [ -f "$ak" ] || continue
  owner=$(stat -c '%U:%G' "$ak")
  tmp=$(mktemp)
  removed=0
  while IFS= read -r line; do
    # empty lines and comments are kept as they are
    if [ -n "$line" ] && [ "$(printf '%s\\n' "$line" | ssh-keygen -lf - 2>/dev/null | awk '{print $2}')" = "$FP" ]; then
      removed=$((removed + 1))
      continue
    fi
    printf '%s\\n' "$line" >> "$tmp"
  done < "$ak"
  if [ "$removed" -gt 0 ]; then
    cp -p "$ak" "$ak.bak.$(date +%s)"
    install -m 600 -o "$(echo "$owner" | cut -d: -f1)" -g "$(echo "$owner" | cut -d: -f2)" "$tmp" "$ak"
    echo "removed $removed line(s) from $ak"
  fi
  rm -f "$tmp"
done
# Was the key used? Look for logins with this fingerprint
journalctl -u ssh -u sshd --since "-30 days" --no-pager 2>/dev/null | grep -F "Accepted publickey" | grep -F "$FP" || echo "no logins with this key in the journal"`,
    cx: `<p>The scan is O(lines in all authorized_keys files) per server: milliseconds. The hard part is coordination across servers; run the same script everywhere through your automation tool.</p>`,
    f: ['How do SSH certificates with short lifetimes reduce the blast radius of a leak like this?', 'What would you change in the engineer\'s workflow so it cannot happen again?']
  }));

  practice.push(P({
    t: 'An unattended upgrade broke production overnight', l: 'Hard', tags: ['apt', 'rollback', 'hold', 'history'], co: ['Canonical', 'Shopify'],
    s: `<p>At 06:25 unattended-upgrades updated packages on an Ubuntu VM. Since then the PHP app returns HTTP 500 with <code>undefined symbol</code> errors from a PHP extension. Find exactly what changed, roll back the responsible package(s) to the previous version, stop it happening again until the app is fixed, and keep security updates for everything else.</p>`,
    ex: `<p><code>/var/log/apt/history.log</code> at 06:25: ${H.c('y', 'Upgrade: php8.3-common:amd64 (8.3.6-0ubuntu0.24.04.1, 8.3.6-0ubuntu0.24.04.2), libxyz1 (...)')}. The vendor extension was built against the old version. Downgrade the PHP packages to <code>...04.1</code>, hold them, restart php-fpm → HTTP ${H.c('g', '200')}.</p>`,
    bw: `<p>Disable unattended-upgrades entirely and run <code>apt upgrade</code> manually "sometime". The server then misses security fixes for months - a bigger risk than the outage. Or restore the whole VM from last night's snapshot, losing any data written since.</p>`,
    q: ['Which file tells you exactly which packages unattended-upgrades changed and from which version to which?', ['<code>/var/log/apt/history.log</code> (and <code>/var/log/unattended-upgrades/</code>)', '<code>/etc/apt/sources.list</code>', '<code>/var/lib/dpkg/lock</code>', '<code>~/.bash_history</code>'], 0, 'history.log records each apt run with Start-Date, the command line and every Install/Upgrade/Remove with old and new versions. The unattended-upgrades folder has its own detailed log.'],
    h: ['<p>Hint 1: match the time of the first 500 error with an entry in <code>/var/log/apt/history.log</code>; it lists old and new versions.</p>', '<p>Hint 2: <code>apt-cache policy PKG</code> / <code>apt list --all-versions</code> shows whether the old version is still available; install it explicitly with <code>PKG=VERSION</code> and <code>--allow-downgrades</code>.</p>', '<p>Hint 3: <code>apt-mark hold</code> stops all upgrades of those packages (unattended-upgrades respects holds); or add them to <code>Unattended-Upgrade::Package-Blacklist</code>. Set a reminder to unhold.</p>'],
    a: `<p>Correlate: the app's first error time and the apt history entry at 06:25. The history lists each package with old and new versions; the PHP packages are the suspects because the error is a symbol mismatch in a PHP extension. Check the old version is still downloadable (Ubuntu keeps the release and previous security/updates versions; if not, <code>/var/cache/apt/archives</code> may still have the .deb). Downgrade all packages from the same source package together (mismatched php8.3-* versions cause more errors), restart php-fpm, verify with curl and the error log. Hold those packages so unattended-upgrades skips them, while every other package keeps receiving security fixes. Open a ticket for the vendor/app team to rebuild the extension, and set a date to remove the hold. Longer term: stage updates on a test VM first, or bake and test images before rollout.</p>`,
    code: `# 1. What changed, and when?
grep -B1 -A6 'Start-Date: 2026-10-19  06:2' /var/log/apt/history.log
sudo tail -n 50 /var/log/unattended-upgrades/unattended-upgrades.log
# 2. Which versions exist for the suspect packages?
apt list --all-versions 'php8.3-*' 2>/dev/null | grep -E 'php8.3-(common|cli|fpm|mysql)'
# 3. Roll back the whole PHP set to the previous version, together
OLD=8.3.6-0ubuntu0.24.04.1
PKGS=$(dpkg -l 'php8.3-*' | awk '/^ii/ {print $2}')
sudo apt-get install -y --allow-downgrades $(for p in $PKGS; do printf '%s=%s ' "$p" "$OLD"; done)
# 4. Freeze them; everything else keeps getting security updates
sudo apt-mark hold $PKGS
apt-mark showhold
# 5. Verify
sudo systemctl restart php8.3-fpm
curl -s -o /dev/null -w '%{http_code}\\n' http://localhost/
sudo tail -n 20 /var/log/php8.3-fpm.log`,
    cx: `<p>15-30 minutes. Holding only the affected packages keeps the security exposure small. Downgrades are riskier than upgrades, so test the app fully afterwards.</p>`,
    f: ['How would you have caught this before production?', 'What would you do if the old version was no longer in any repository?']
  }));

  practice.push(P({
    t: 'Onboard users from a CSV, safely and repeatably', l: 'Hard', tags: ['bash', 'useradd', 'ssh keys', 'idempotent'], co: ['Atlassian', 'TCS'],
    s: `<p>HR sends <code>users.csv</code> with lines <code>username,full name,group,public_key</code>. Write a bash script that, for each line, creates the user if missing (bash shell, home folder), adds them to the group (creating the group if needed), installs their <b>public</b> key with correct ownership and permissions, and can be re-run without errors or duplicate keys. Skip and report invalid lines.</p>`,
    ex: `<p>Input line ${H.c('b', 'asha,Asha Rao,developers,ssh-ed25519 AAAAC3... asha@laptop')}. First run: ${H.c('g', 'created asha; added to developers; key installed')}. Second run: ${H.c('g', 'asha exists; already in developers; key already present')}. A line with a bad user name like ${H.c('r', 'Asha Rao!,...')} is skipped with a warning.</p>`,
    bw: `<p>A loop that runs <code>useradd</code> and <code>echo KEY &gt;&gt; authorized_keys</code> for every line. The second run fails on existing users and appends duplicate keys; names with spaces or a missing field break it silently; and one wrong permission locks the user out of SSH.</p>`,
    bc: `while IFS=, read -r u n g k; do
  useradd -m "$u"                                  # fails on re-run
  echo "$k" >> "/home/$u/.ssh/authorized_keys"     # folder may not exist; duplicates on re-run
done < users.csv`,
    q: ['What makes a script <b>idempotent</b>?', ['Running it again leaves the system in the same state without errors or duplicates', 'It runs only once', 'It uses sudo', 'It runs faster each time'], 0, 'Idempotent steps check before acting (does the user exist? is the key already there?) so re-runs are safe. This is the core idea behind configuration management tools.'],
    h: ['<p>Hint 1: read with <code>while IFS=, read -r user name group key</code>; the key is the last field and contains spaces but no commas, so it stays whole.</p>', '<p>Hint 2: check before acting: <code>id -u USER</code> for users, <code>getent group G</code> for groups, <code>grep -qxF KEY file</code> for keys. Validate the user name with a regex and the key with <code>ssh-keygen -lf</code>.</p>', '<p>Hint 3: create <code>~/.ssh</code> with <code>install -d -m 700 -o U -g U</code> and the key file with mode 600, owned by the user. Use <code>set -euo pipefail</code> and report a summary at the end.</p>'],
    a: `<p>Read the CSV line by line with <code>IFS=,</code> and <code>read -r</code>, skipping a header and blank lines. Validate each user name against the common Linux pattern and validate the key by asking <code>ssh-keygen -lf</code> to parse it - this also guarantees a private key pasted by mistake (which does not parse as a single public key line) is rejected. For each step, check first: create the group only if <code>getent</code> does not know it, the user only if <code>id</code> fails, add to the group with <code>usermod -aG</code> (harmless if already a member), create the .ssh folder with <code>install -d</code> (sets mode and owner in one go) and append the key only if <code>grep -qxF</code> does not find the exact line. Finish with counts of created, unchanged and skipped. Run it on a test container first. At scale, the same logic belongs in Ansible's <code>user</code> and <code>authorized_key</code> modules.</p>`,
    code: `#!/usr/bin/env bash
# onboard.sh users.csv  -- run as root; safe to run many times
set -euo pipefail
CSV="$1"
created=0; unchanged=0; skipped=0
while IFS=, read -r user name group key || [ -n "$user" ]; do
  [ -z "$user" ] && continue                           # blank line
  [ "$user" = "username" ] && continue                 # header line
  if ! [[ "$user" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]]; then
    echo "SKIP invalid user name: $user" >&2; skipped=$((skipped + 1)); continue
  fi
  if ! printf '%s\\n' "$key" | ssh-keygen -lf - > /dev/null 2>&1; then
    echo "SKIP $user: not a valid public key" >&2; skipped=$((skipped + 1)); continue
  fi
  getent group "$group" > /dev/null || groupadd "$group"
  if id -u "$user" > /dev/null 2>&1; then
    unchanged=$((unchanged + 1))
  else
    useradd -m -s /bin/bash -c "$name" "$user"
    created=$((created + 1))
    echo "created $user"
  fi
  usermod -aG "$group" "$user"                         # -a: append, keeps other groups
  home=$(getent passwd "$user" | cut -d: -f6)
  install -d -m 700 -o "$user" -g "$user" "$home/.ssh"
  ak="$home/.ssh/authorized_keys"
  [ -f "$ak" ] || install -m 600 -o "$user" -g "$user" /dev/null "$ak"
  if ! grep -qxF "$key" "$ak"; then
    printf '%s\\n' "$key" >> "$ak"
    echo "key installed for $user"
  fi
done < "$CSV"
echo "done: $created created, $unchanged already existed, $skipped skipped"`,
    cx: `<p>O(users × keys per user) - trivial. Re-running is safe, which is the whole point: the script describes a desired state rather than a list of one-time actions.</p>`,
    f: ['How would you also <b>offboard</b> users who disappeared from the CSV?', 'Why is Ansible (or cloud identity) a better long-term home for this logic?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: 'An app reports "No space left on device". Which command do you run first?', options: ['<code>df -h</code>', '<code>du -sh /*</code>', '<code>rm -rf /tmp/*</code>', '<code>reboot</code>'], answer: 0, explain: 'df shows which filesystem is full. Only then does du help you find which folder on that filesystem is big. Deleting or rebooting before diagnosing loses evidence.' });
  quiz.push({ q: 'You deleted a 10 GB log file but <code>df</code> shows no change. What is the most likely reason?', options: ['A running process still has the file open', 'df updates only once per hour', 'The file went to a trash folder', 'The disk is read-only'], answer: 0, explain: 'Space is freed only when no name and no open file descriptor refer to the inode. <code>lsof +L1</code> lists deleted-but-open files; restart the process or truncate via /proc/PID/fd.' });
  quiz.push({ q: 'nginx (user www-data) gets 403 on <code>/srv/site/index.html</code>. The file is 644, but <code>/srv/site</code> is <code>drwx------ root root</code>. What is missing?', options: ['x on /srv/site for www-data (it cannot pass through the folder)', 'w on index.html', 'The setuid bit on nginx', 'Nothing, the file is readable'], answer: 0, explain: 'To open a file you need x on every directory in its path. www-data is "other" on /srv/site and has no bits there, so the walk stops before reaching the file.' });
  quiz.push({ q: 'With <code>umask 027</code>, what modes do a new file and a new directory get?', options: ['640 and 750', '644 and 755', '600 and 700', '666 and 777'], answer: 0, explain: 'Files start from 666 and directories from 777; the umask removes w for group (2) and everything for other (7): 666 → 640, 777 → 750.' });
  quiz.push({ q: 'What does <code>sudo usermod -G docker alice</code> (without <code>-a</code>) do?', options: ['Replaces all of alice\'s extra groups with just docker', 'Adds docker to alice\'s groups', 'Makes docker alice\'s primary group', 'Creates a group named alice'], answer: 0, explain: '-G sets the full list of supplementary groups. Without -a (append) every other extra group, including sudo, is removed. Always use usermod -aG.' });
  quiz.push({ q: 'Which account setup is right for a service like an API process?', options: ['A system user with no password and shell /usr/sbin/nologin', 'Run it as root for simplicity', 'Use the ubuntu default user', 'A human account with sudo'], answer: 0, explain: 'A dedicated system user limits damage if the service is compromised, and nologin prevents interactive logins as that user.' });
  quiz.push({ q: 'After a reboot your service is down, but <code>systemctl start</code> fixes it. Which command makes it start on boot?', options: ['<code>sudo systemctl enable myapp</code>', '<code>sudo systemctl reload myapp</code>', '<code>sudo systemctl daemon-reload</code>', '<code>sudo systemctl restart myapp</code>'], answer: 0, explain: 'enable hooks the unit into a boot target (via its [Install] section). start, restart and reload only change the current state.' });
  quiz.push({ q: 'In top you see <code>%Cpu(s): 5 us, 2 sy, 70 wa, 0 st</code> and a load of 12 on 4 CPUs. What is the bottleneck?', options: ['Disk I/O - processes are waiting for storage', 'CPU - the apps need more cores', 'The hypervisor is stealing CPU', 'Network bandwidth'], answer: 0, explain: 'wa is time CPUs sit idle waiting for I/O. Linux load includes tasks blocked on I/O (D state), so load is high while CPUs are idle. Next step: iostat -xz 1.' });
  quiz.push({ q: 'Which pipeline gives the top 3 client IPs in an nginx access log?', options: ['<code>awk \'{print $1}\' access.log | sort | uniq -c | sort -rn | head -3</code>', '<code>uniq -c access.log | head -3</code>', '<code>sort access.log | head -3</code>', '<code>grep -c ip access.log</code>'], answer: 0, explain: 'Extract the IP field, sort so equal IPs are adjacent, count runs with uniq -c, sort counts numerically descending, keep the top 3.' });
  quiz.push({ q: 'Which command tells you which package installed <code>/usr/bin/dig</code> on Ubuntu?', options: ['<code>dpkg -S /usr/bin/dig</code>', '<code>apt update dig</code>', '<code>which -p dig</code>', '<code>rpm -qf /usr/bin/dig</code>'], answer: 0, explain: 'dpkg -S searches the installed package database for a file path. rpm -qf is the RHEL-family equivalent; apt-file search finds packages that are not installed yet.' });
  quiz.push({ q: 'You fixed a critical OpenSSL vulnerability with apt. Why might nginx still be vulnerable?', options: ['The running nginx still has the old library loaded until it restarts', 'apt installs to a temp folder first', 'nginx bundles its own kernel', 'The fix only applies after apt update'], answer: 0, explain: 'Shared libraries are mapped when a process starts. Restart affected services (needrestart / dnf needs-restarting help find them) or reboot.' });
  quiz.push({ q: 'What permissions does sshd expect for <code>~/.ssh</code> and <code>~/.ssh/authorized_keys</code>?', options: ['700 and 600, owned by the user', '777 and 666', '755 and 777', 'Any, as long as root owns them'], answer: 0, explain: 'With StrictModes (the default), sshd ignores authorized_keys if it, ~/.ssh or the home folder are writable by group or others, giving "Permission denied (publickey)".' });
  quiz.push({ q: '<code>ssh</code> fails with "Connection timed out". What does that usually point to?', options: ['A firewall or security group dropping traffic, or no network route', 'A wrong private key', 'A wrong user name', 'Bad permissions on authorized_keys'], answer: 0, explain: 'Timed out means nothing answered at all. Key or user problems give "Permission denied (publickey)", and a reachable host with no sshd gives "Connection refused".' });
  quiz.push({ q: 'Which file of a key pair may you share with a server or colleague?', options: ['Only the <code>.pub</code> public key', 'Only the private key', 'Both', 'Neither; keys are never shared'], answer: 0, explain: 'The public key is designed to be shared and placed in authorized_keys. The private key must stay with its owner (mode 600, passphrase) and is never pasted anywhere.' });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ level: 'B', q: 'A customer says their Linux VM\'s disk is full. Walk me through what you do.', a: `<p>First I confirm and scope it: <code>df -h</code> to see which filesystem is full, and <code>df -i</code> in case it is inodes rather than bytes. Then I drill down with <code>sudo du -xh --max-depth=1 / | sort -h</code>, following only the biggest folder each time, and <code>find -size +1G</code> for single big files. The usual suspects are logs in <code>/var/log</code>, Docker data in <code>/var/lib/docker</code>, caches, core dumps and forgotten backups. Before deleting I check whether a process has the file open (<code>lsof</code>): if it does, I truncate instead of removing. If df and du disagree, I look for deleted-but-open files with <code>lsof +L1</code>. After freeing space I fix the cause (logrotate, log level, cleanup timer) and suggest an alert at 80%, and I tell the customer the root cause in plain words.</p>`, followUps: ['When would you grow the disk instead?', 'How do you grow a cloud volume and its filesystem without a reboot?'] });
  interview.push({ level: 'B', q: 'Explain Linux permissions and how you would fix a 403 from nginx.', a: `<p>Each file has an owner, a group and nine bits: read, write, execute for owner, group and other, often written in octal (r=4, w=2, x=1, so 755 or 644). The kernel picks one class - owner, else group, else other - and uses only those bits. On a directory, x means "may pass through" and r means "may list". For a 403 I reproduce as the web user with <code>sudo -u www-data cat FILE</code>, then run <code>namei -l</code> on the path to find the first folder without x or a file without r for that user. I fix it with least privilege: group ownership to the web server group, folders 750/755, files 640/644 using <code>find -type d</code> and <code>-type f</code> separately. Never chmod 777. On RHEL-family systems I also check SELinux labels with <code>ls -Z</code> and <code>restorecon</code>.</p>`, followUps: ['What does umask do?', 'What is the setgid bit on a directory used for?'] });
  interview.push({ level: 'B', q: 'What is the difference between a user, a group and a service account? How do you add someone to a group?', a: `<p>A user is an identity (a UID) that owns processes and files. A group (GID) is a set of users that can share access; files have one owning group. Human users log in with SSH keys and a shell. Service accounts are system users (low UIDs) that run one program, have no password and a nologin shell, so a compromised service does not get a login or root. To add someone to a group I use <code>sudo usermod -aG GROUP USER</code> - the <b>-a</b> is critical, because <code>-G</code> alone replaces all their groups and can remove sudo access. The change applies to new logins, so the user must log out and back in, or services must restart. I verify with <code>id USER</code>.</p>`, followUps: ['Where are users and password hashes stored?', 'How would you give someone permission to restart only one service?'] });
  interview.push({ level: 'B', q: 'How do you check whether a service is running and read its logs?', a: `<p>With systemd I run <code>systemctl status NAME</code>: it shows active/failed, the main PID, how long it has run, and the last log lines. <code>systemctl is-active</code> and <code>is-enabled</code> give one-word answers for scripts. For logs I use <code>journalctl -u NAME -n 100 --no-pager</code>, add <code>--since "30 min ago"</code> to limit time, <code>-p err</code> for errors only, <code>-f</code> to follow live, and <code>-b -1</code> for the previous boot. Many services also write their own files under <code>/var/log</code> (for example nginx's access and error logs). I always look for the <b>first</b> error in a sequence, then confirm the service really works with a request such as <code>curl -I localhost</code>, not just "active".</p>`, followUps: ['What is the difference between restart and reload?', 'Why might journalctl show nothing from before the last reboot?'] });
  interview.push({ level: 'B', q: 'How do you set up SSH key login to a new server, and how do you keep the key safe?', a: `<p>I create a key pair on my machine with <code>ssh-keygen -t ed25519 -C "me@laptop"</code>, protected by a passphrase, and load it into <code>ssh-agent</code> so I type it once per session. I give the server only the public key: <code>ssh-copy-id user@host</code>, or the cloud provider injects it at launch into <code>~/.ssh/authorized_keys</code>. Permissions: <code>~/.ssh</code> 700, private key and authorized_keys 600, owned by the user - otherwise SSH refuses them. The private key never leaves my machine: not in chat, tickets, AI tools or Git. If it ever leaks, I remove its public key from every server and create a new pair. On the server I then disable password logins and root login, and restrict port 22 to known IPs or use a bastion or SSM.</p>`, followUps: ['Why ed25519 over RSA?', 'What is agent forwarding and why is it risky?'] });
  interview.push({ level: 'I', q: 'A service fails to start. What is your systematic approach?', a: `<p>1) <code>systemctl status NAME</code> for the result and exit code (for example <code>status=203/EXEC</code> means the binary is missing or not executable, <code>status=1</code> is an app error). 2) <code>journalctl -u NAME -n 100</code> and find the first real error. 3) Run the app's own config test (<code>nginx -t</code>, <code>sshd -t</code>, <code>apachectl configtest</code>). 4) Check the usual suspects: port already in use (<code>ss -ltnp</code>), permissions on files and folders it needs (<code>namei -l</code>, <code>sudo -u USER</code>), missing directories, a full disk, missing environment variables, or ordering at boot (network or mounts not ready). 5) Fix one thing, start again, and verify with a real request. 6) If I changed the unit, <code>daemon-reload</code>. Finally I write down the cause, because "restarted and it worked" is not a root cause.</p>`, followUps: ['What does a crash loop look like in systemd, and how do you stop it?', 'How do you override a unit setting without editing the vendor file?'] });
  interview.push({ level: 'I', q: 'How do you find which process is listening on a port and stop it correctly?', a: `<p>I use <code>sudo ss -ltnp 'sport = :8080'</code> (listening TCP sockets with process names; sudo is needed to see other users' processes); <code>lsof -iTCP:8080 -sTCP:LISTEN</code> or <code>fuser 8080/tcp</code> also work. Then I identify the PID: <code>ps -o user,etime,cmd -p PID</code>, and <code>systemctl status PID</code> tells me which unit owns it. If it is a service, I stop and possibly disable it with systemctl, because killing it by hand just triggers a restart. If it is a stray process, I send SIGTERM first and only use SIGKILL if it ignores it, since -9 skips cleanup. I also check the bind address: 127.0.0.1 is local only, 0.0.0.0 or :: is every interface, which matters for security groups too.</p>`, followUps: ['How would you check if the port is reachable from outside the VM?', 'What does "Connection refused" mean compared to a timeout?'] });
  interview.push({ level: 'I', q: 'Give an example of using grep, awk, sort and uniq to answer a question from logs.', a: `<p>To find which client IPs cause most server errors in an nginx access log: <code>awk '$9 ~ /^5/ {print $1}' access.log | sort | uniq -c | sort -rn | head</code>. awk filters on the status field (more precise than grepping for "500", which matches byte counts or paths) and prints the IP; sort groups identical IPs; uniq -c counts adjacent duplicates; sort -rn orders by count; head keeps the top. I always narrow by time first (grep the timestamp prefix or use journalctl <code>--since</code>), and then look at a few raw lines for the top result to make sure the summary means what I think. For compressed rotated logs I use zgrep, and for JSON logs jq. On big files these tools stream, so they are safe on a small VM where opening the file in an editor is not.</p>`, followUps: ['Why must sort come before uniq -c?', 'How would you count errors per minute?'] });
  interview.push({ level: 'I', q: 'How do you patch a Linux server, and how do you know a reboot is needed?', a: `<p>I check the distro (<code>/etc/os-release</code>), then refresh and review: <code>apt update</code> and <code>apt list --upgradable</code>, or <code>dnf check-update</code> / <code>dnf updateinfo list --security</code>. For a targeted fix I upgrade only the needed packages; for routine patching I apply all updates in a maintenance window, ideally after testing on a staging VM. Services using updated libraries must restart to load them - <code>needrestart</code> on Ubuntu or <code>dnf needs-restarting -s</code> list them. A kernel, glibc or systemd update needs a reboot: Ubuntu creates <code>/var/run/reboot-required</code>, and <code>dnf needs-restarting -r</code> reports it. I verify the app afterwards and record versions. At scale I use a patch service (SSM Patch Manager, Azure Update Manager) or rebuild images, and pin or hold packages that must not move.</p>`, followUps: ['How do you roll back a bad update?', 'What is the risk of unattended upgrades, and why use them anyway?'] });
  interview.push({ level: 'I', q: 'A user gets "Permission denied (publickey)". How do you troubleshoot?', a: `<p>From the client I run <code>ssh -v user@host</code> to see which keys are offered and whether the server rejects them; that rules out network problems (those give a timeout or refused). Then the common causes in order: wrong user name for the image (ubuntu, ec2-user, azureuser), wrong key (compare <code>ssh-keygen -lf</code> fingerprints with the authorized key), or the client refusing a private key with loose permissions. If the key is offered and rejected, the server log tells the real reason: <code>journalctl -u ssh</code> or <code>/var/log/auth.log</code> - often "bad ownership or modes" because home, <code>~/.ssh</code> or <code>authorized_keys</code> is group/world writable. If I am locked out I use the provider's serial console, SSM or EC2 Instance Connect, or attach the disk to a rescue VM. I never fix it by enabling password authentication.</p>`, followUps: ['What is StrictModes?', 'How do you recover if you lost the private key for an instance?'] });
  interview.push({ level: 'A', q: 'Load average is high but CPU is idle. Explain and diagnose.', a: `<p>On Linux, load average counts tasks that are runnable <b>and</b> tasks in uninterruptible sleep (state D), which usually wait for disk or network storage. So many blocked tasks give a high load while CPUs idle. In top I check <code>wa</code> (I/O wait) and <code>st</code> (steal). I list D-state processes with <code>ps -eo state,pid,cmd | awk '$1=="D"'</code>, then <code>iostat -xz 1</code> to find the device with %util near 100 and high await, and <code>pidstat -d</code> or <code>iotop</code> for which process drives it. In the cloud I compare with the volume's IOPS and throughput limits, burst credits and the instance's disk bandwidth cap; NFS/EFS hangs also show as D state. Fixes range from raising provisioned IOPS or changing volume type to fixing the query that scans too much. Adding CPUs would not help.</p>`, followUps: ['What would high steal time tell you?', 'How do you tell a slow disk from a hung NFS mount?'] });
  interview.push({ level: 'A', q: 'How would you manage SSH access for 50 engineers across 200 servers?', a: `<p>Not with hand-edited authorized_keys files. Options, from simplest to best: configuration management (Ansible's user and authorized_key modules driven from a reviewed list in Git, so onboarding and offboarding are pull requests); centrally managed identity (SSSD with LDAP/AD, or cloud OS Login) so accounts come from one directory; and short-lived <b>SSH certificates</b> signed by a CA after SSO login (servers trust the CA with <code>TrustedUserCAKeys</code>, so there are no long-lived keys to leak or forget). Often the best answer is keyless access such as AWS SSM Session Manager, Azure Bastion with Entra ID or GCP IAP: port 22 stays closed, access is controlled by IAM, and sessions are logged centrally. Regardless: per-person identities (no shared accounts), least-privilege sudo rules, MFA at the identity provider, audit logs shipped off the box, and automatic expiry for contractors.</p>`, followUps: ['How does a certificate-based setup handle revocation?', 'What breaks if UIDs differ across servers?'] });
  interview.push({ level: 'A', q: 'A process vanished overnight with nothing in its own log. How do you prove what happened?', a: `<p>A silent death usually means SIGKILL, which the process cannot catch or log. Candidates: the kernel OOM killer, a cgroup memory limit (systemd <code>MemoryMax</code> or a container limit), someone running kill -9, or a reboot. I check the unit journal for systemd's view (<code>code=killed, status=9/KILL</code> or "killed by the OOM killer"), the kernel log (<code>journalctl -k</code> or <code>dmesg -T</code>) for "Out of memory: Killed process", reboots (<code>journalctl --list-boots</code>, <code>last -x</code>), and the audit or sudo logs for manual kills. If journald is not persistent, evidence before a reboot is gone, so I make it persistent. Then I look at memory trends to find the leak, set a memory limit with a clean restart policy, and add alerts on memory and restart counts.</p>`, followUps: ['Why does the OOM killer pick the process it does?', 'What exit code would a shell show for a SIGKILLed process?'] });
  interview.push({ level: 'E', q: 'How do AI assistants change Linux troubleshooting for cloud support, and where must you be careful?', a: `<p>They are excellent at reading long, noisy output - journalctl dumps, <code>ssh -vvv</code>, strace summaries - pointing at the first real error and explaining cryptic codes, and at drafting one-liners, sudoers rules or logrotate configs. That speeds up the first ten minutes of an incident. The risks: they suggest dangerous shortcuts (<code>chmod -R 777</code>, <code>kill -9</code>, disabling SELinux, enabling password SSH, deleting lock files), mix up distro families, and invent flags. Data handling is a hard rule: logs can contain customer data and tokens, and private keys must never be pasted anywhere, so I redact and use approved internal tools. AI agents that execute commands should run with a low-privilege identity in a sandbox, with human review for destructive commands. The skill that remains mine is the mental model and judgement: what is safe on someone else's production server.</p>`, followUps: ['How would you review an AI-proposed remediation before running it?', 'What guardrails would you put on an agent with shell access?'] });

  // ───────────────────────── Module registration ─────────────────────────
  registerModule({
    id: 'devops01',
    title: 'Linux for the Cloud',
    lang: 'bash',
    intro: `<p>Almost every cloud server you will ever touch runs Linux, and most cloud-support tickets end with someone typing commands into an SSH session. This module teaches the <b>everyday Linux skills of a Cloud Support Engineer or junior admin</b>: finding your way around the filesystem, working out why the disk is full, fixing permission errors on a web root, managing users and sudo, checking processes and services, reading logs with <code>journalctl</code> and <code>grep</code>, installing and patching packages, and logging in safely with SSH keys.</p>
      <p>Every topic starts from a real ticket ("the site returns 403", "nginx will not start", "who is using port 8080?") and ends with a calm, repeatable recipe. All labs run on <b>your own machine, WSL or a throwaway container</b> (<code>docker run -it --rm ubuntu:24.04 bash</code>) - no cloud account and no real secrets needed. Where Ubuntu and RHEL/Amazon Linux differ, both commands are shown.</p>`,
    goals: [
      'Navigate the Linux filesystem with confidence, know what lives in <code>/etc</code>, <code>/var</code>, <code>/home</code> and friends, and find what filled a disk with <code>df</code>, <code>du</code>, <code>find</code> and <code>lsof</code>',
      'Diagnose and fix "Permission denied" and nginx 403 errors with <code>namei</code>, <code>chmod</code>, <code>chown</code> and <code>umask</code> using least privilege (never 777)',
      'Create and remove users, groups and service accounts, add group membership safely (<code>usermod -aG</code>) and write narrow sudo rules',
      'Inspect processes with <code>ps</code> and <code>top</code>, stop them properly, and run the status → journal → config test → fix → verify recipe for a failing systemd service',
      'Answer log questions (top IPs, error spikes, brute-force attempts) with grep, cut, awk, sort, uniq and sed pipelines',
      'Install, inspect, patch, hold and roll back packages with apt and dnf, and know when a restart or reboot is required',
      'Generate and protect SSH keys (700/600), configure <code>~/.ssh/config</code>, harden sshd and troubleshoot "Permission denied (publickey)" and timeouts'
    ],
    prereqs: `No prior Linux administration needed. Helpful: <b>CS Core 1</b> (What an Operating System Does) for kernel vs user space, and <b>CS Core 8</b> (Linux Internals &amp; Shell) for signals, file descriptors, redirection and systemd unit files in depth - this module builds on them with hands-on cloud-support scenarios instead of repeating them.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
