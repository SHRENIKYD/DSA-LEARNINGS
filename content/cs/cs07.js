(function () {
var topics = [], practice = [], quiz = [], interview = [];
var R = String.raw;

// ---------- shared helpers for visualizers ----------
function human(n) {
  var u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'], i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (Math.round(n * 100) / 100) + ' ' + u[i];
}
function nums(s, name) {
  var a = String(s).trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
  if (!a.length || a.some(function (x) { return isNaN(x); })) throw new Error('Enter ' + name + ' as numbers separated by spaces');
  return a;
}

// =====================================================================
// TOPIC 1: files, directories, inodes
// =====================================================================
topics.push({
  title: 'Files, Directories & Inodes (and the Max File Size Formula)',
  analogy: `<p>Think of a <b>library</b>. The books on the shelves are the <b>data blocks</b>. The <b>card catalogue</b> says where each book is, who owns it and how thick it is: that card is the <b>inode</b>. The <b>name</b> you search by ("Harry Potter") is only a label in the <b>directory</b>, a special book whose pages say "this name → card #4711". Change the label and the book does not move. Two labels can even point at the same card.</p>`,
  explain: `<p>A <b>file</b> is just a named bag of bytes. The OS needs two things to find those bytes: <i>where they are</i> and <i>facts about them</i>. Unix keeps both in one small record called an <b>inode</b> (index node). The inode stores: owner, permissions, size, timestamps, link count and <b>pointers to the data blocks</b>. It does <b>not</b> store the file name.</p>
  <p>A <b>directory</b> is itself a file whose content is a list of <code>(name → inode number)</code> pairs. Path lookup of <code>/home/ana/a.txt</code> walks: root inode → read its directory data → find "home" → inode of home → read it → find "ana" → ... → inode of a.txt. Each hop is a disk read (the page cache hides most of them).</p>
  <p><b>How does a small inode point to a huge file?</b> It holds only 15 pointers (classic ext2/ext3 layout): <b>12 direct</b> pointers straight to data blocks, then <b>1 single-indirect</b> (points to a block full of pointers), <b>1 double-indirect</b> (pointer to a block of pointers to blocks of pointers) and <b>1 triple-indirect</b>. Small files (most files!) need no extra reads; giant files pay a few extra hops.</p>
  <p><b>The formula.</b> With block size <code>B</code> and pointer size <code>P</code>, one pointer block holds <code>K = B / P</code> pointers. Then:</p>
  ${H.table(['Part', 'Blocks reachable', 'Bytes (B=4KB, P=4 → K=1024)'], [
    ['12 direct', '12', '12 × 4KB = 48 KB'],
    ['single indirect', 'K = 1024', '1024 × 4KB = 4 MB'],
    ['double indirect', 'K² = 1,048,576', 'K² × 4KB = 4 GB'],
    ['triple indirect', 'K³ = 1,073,741,824', 'K³ × 4KB = 4 TB'],
    ['<b>Total max</b>', '≈ K³ + K² + K + 12', '<b>≈ 4 TB + 4 GB + 4 MB + 48 KB</b>']
  ])}
  <p>Memory trick: every extra level multiplies by <b>K</b>. To read byte offset X: block number = X / B; if it is &lt; 12 use a direct pointer; else subtract 12 and see if it fits in K, else subtract K and check K², and so on.</p>`,
  clues: [
    '"inode", "file metadata", "where is the file name stored?" → the name lives in the <b>directory</b>, not the inode',
    '"12 direct + single/double/triple indirect, block size 4KB" → <b>maximum file size</b> arithmetic with K = B / P',
    '"how many disk reads to read byte at offset X" → count the pointer levels you must walk + 1 data block',
    '"ran out of inodes but disk has free space" (df -i) → millions of tiny files exhausted the fixed inode table',
    '"ls -l shows size but du shows less" → sparse file: holes have no blocks',
    '"what is stored in a directory?" → name-to-inode map; "why is rename atomic?" → one directory entry change'
  ],
  code: [
    { lang: 'cpp', title: 'stat(): read the inode from C++', code: R`// Print inode facts for a path: this is exactly what "ls -li" shows.
#include <sys/stat.h>
#include <unistd.h>
#include <fcntl.h>
#include <cstdio>

int main(int argc, char** argv) {
    const char* path = argc > 1 ? argv[1] : "/etc/hostname";
    struct stat st;                          // filled in from the inode
    if (stat(path, &st) != 0) { perror("stat"); return 1; }
    printf("inode number : %lu\n", (unsigned long)st.st_ino);
    printf("size (bytes) : %ld\n", (long)st.st_size);
    printf("blocks (512B): %ld\n", (long)st.st_blocks);   // real disk usage / 512
    printf("link count   : %lu\n", (unsigned long)st.st_nlink);
    printf("mode (octal) : %o\n", (unsigned)(st.st_mode & 0777));
    printf("is directory : %s\n", S_ISDIR(st.st_mode) ? "yes" : "no");
    return 0;
}` },
    { lang: 'python', run: true, title: 'Inode max-size calculator (runnable)', code: R`# Max file size for the classic inode: 12 direct + single/double/triple indirect.
def human(n):
    for unit in ["B", "KB", "MB", "GB", "TB", "PB"]:
        if n < 1024 or unit == "PB":
            return f"{n:.2f} {unit}"
        n /= 1024

def max_file_size(block=4096, ptr=4, direct=12):
    k = block // ptr                      # pointers that fit in one block
    parts = {
        "direct": direct * block,
        "single": k * block,
        "double": k * k * block,
        "triple": k * k * k * block,
    }
    return k, parts

for block, ptr in [(4096, 4), (1024, 4), (4096, 8)]:
    k, parts = max_file_size(block, ptr)
    print(f"block={block} ptr={ptr} -> K={k} pointers per block")
    for name, size in parts.items():
        print(f"   {name:7s} {human(size)}")
    print(f"   TOTAL   {human(sum(parts.values()))}")

# Which pointer level holds byte offset X? (block size 4096, K = 1024)
def level_of(offset, block=4096, k=1024, direct=12):
    b = offset // block
    if b < direct: return "direct"
    b -= direct
    if b < k: return "single indirect"
    b -= k
    if b < k * k: return "double indirect"
    return "triple indirect"

for off in [0, 49151, 49152, 5_000_000, 5_000_000_000]:
    print(off, "->", level_of(off))` }
  ],
  codeTitle: ['C++ stat()', 'Python calculator'],
  viz: {
    title: 'Inode pointers: how big a file can one inode describe?',
    input: '4096 4 12',
    inputLabel: 'block bytes, pointer bytes, direct pointers',
    gen: function (input) {
      var a = nums(input, 'block size, pointer size, direct count');
      var B = a[0], P = a[1], D = a.length > 2 ? a[2] : 12;
      if (B < 512 || B > 65536 || P < 2 || P > 8 || D < 1 || D > 20) throw new Error('Try "4096 4 12" (block 512..65536, pointer 2..8, direct 1..20)');
      var K = Math.floor(B / P), frames = [], total = 0;
      var tree = ['inode', null, null, null, null, null, null, null, null, null, null, null, null, null, null];
      function tr(upto, cur) {
        var t = ['inode', 'direct x' + D, 'indirect ptrs', null, null, 'single', 'multi-level', null, null, null, null, null, null, 'double', 'triple'];
        var keep = { 0: 1, 1: upto >= 1, 2: upto >= 2, 5: upto >= 2, 6: upto >= 3, 13: upto >= 3, 14: upto >= 4 };
        var out = t.map(function (v, i) { return keep[i] === undefined ? null : (keep[i] ? v : null); });
        var hl = {}; if (cur !== undefined) hl[cur] = 'cur';
        return { type: 'tree', label: 'Inode pointer layout', arr: out, hl: hl };
      }
      frames.push({ narr: 'An inode has to describe a whole file with only a handful of pointers. Block = <b>' + B + ' B</b>, pointer = <b>' + P + ' B</b>, so one pointer block holds <b>K = ' + B + '/' + P + ' = ' + K + '</b> pointers.', parts: [tr(1, 0), { type: 'vars', vals: { K: K, blockBytes: B, total: '0 B' } }] });
      var s1 = D * B; total += s1;
      frames.push({ narr: '<b>' + D + ' direct pointers</b> each point at one data block: ' + D + ' × ' + B + ' = <b>' + human(s1) + '</b>. Tiny files never need anything else (fast path).', parts: [tr(1, 1), { type: 'bars', label: 'bytes reachable so far (log scale not used)', values: [s1], texts: [human(s1)] }, { type: 'vars', vals: { added: human(s1), total: human(total) }, hl: { total: 'ok' } }] });
      var s2 = K * B; total += s2;
      frames.push({ narr: '<b>Single indirect</b>: one pointer → a block of ' + K + ' pointers → ' + K + ' data blocks = ' + K + ' × ' + B + ' = <b>' + human(s2) + '</b>. One extra disk read per far-away block.', parts: [tr(2, 5), { type: 'vars', vals: { added: human(s2), total: human(total) }, hl: { total: 'ok' } }] });
      var s3 = K * K * B; total += s3;
      frames.push({ narr: '<b>Double indirect</b>: pointer → block of ' + K + ' pointers → each to a block of ' + K + ' pointers → data. ' + K + '² × ' + B + ' = <b>' + human(s3) + '</b>. Two extra reads.', parts: [tr(3, 13), { type: 'vars', vals: { added: human(s3), total: human(total) }, hl: { total: 'ok' } }] });
      var s4 = K * K * K * B; total += s4;
      frames.push({ narr: '<b>Triple indirect</b>: K³ × ' + B + ' = <b>' + human(s4) + '</b>. Three extra reads. Each level multiplies reach by K.', parts: [tr(4, 14), { type: 'vars', vals: { added: human(s4), total: human(total) }, hl: { total: 'ok' } }] });
      frames.push({ narr: 'Total max file size = <b>' + human(total) + '</b> (' + total + ' bytes). Notice the triple level is 99.9% of the total: bigger K or bigger blocks matter far more than the direct pointers.', parts: [tr(4, 0), { type: 'table', label: 'Summary', columns: ['level', 'reach'], rows: [['direct', human(s1)], ['single', human(s2)], ['double', human(s3)], ['triple', human(s4)], ['TOTAL', human(total)]], hl: { 4: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Max file size, 4 KB block, 4-byte pointers (the classic)', html: `<p>K = 4096 / 4 = 1024. Direct 12 × 4 KB = 48 KB. Single = 1024 × 4 KB = 4 MB. Double = 1024² × 4 KB = 4 GB. Triple = 1024³ × 4 KB = 4 TB.</p><p>Total = <b>4 TB + 4 GB + 4 MB + 48 KB ≈ 4 TB</b>. In an interview say "about 4 TB, dominated by the triple-indirect term".</p>` },
    { title: 'Smaller blocks shrink the limit fast', html: `<p>Block = 1 KB, pointer = 4 B → K = 256. Direct = 12 KB. Single = 256 KB. Double = 256² KB = 64 MB. Triple = 256³ KB = 16 GB. Total ≈ <b>16 GB + 64 MB + 256 KB + 12 KB</b>. Same design, 256× smaller ceiling, because the triple term scales as <b>B<sup>4</sup>/P<sup>3</sup></b>.</p>` },
    { title: 'Which level holds byte offset 5,000,000?', html: `<p>Block index = 5,000,000 / 4096 = 1220 (integer part). 1220 ≥ 12 so subtract 12 → 1208. 1208 ≥ 1024 so it is not single. Subtract 1024 → 184, which is &lt; K² → it lives in the <b>double-indirect</b> tree. Cost: inode (cached) + 2 pointer-block reads + 1 data read = 3 disk reads when cold.</p>`, code: { lang: 'python', run: true, code: R`block, k, direct = 4096, 1024, 12
off = 5_000_000
b = off // block
print("block index", b)
b -= direct
print("after direct", b, "single?", b < k)
b -= k
print("after single", b, "double? ", b < k * k)
print("slot in L1 block:", b // k, " slot in L2 block:", b % k)` } },
    { title: 'Directory = a file of (name, inode) pairs', html: `<p>A directory block may look like: <code>(".", 2) (".." , 2) ("home", 131073) ("etc", 262145)</code>. <code>ls</code> reads these pairs. <code>mv a b</code> inside one directory rewrites one entry, which is why rename is atomic on POSIX. Deleting a file removes the entry and decrements the inode link count; the inode and its blocks are freed only when the count hits 0 <i>and</i> nobody has it open.</p>` }
  ],
  deepDive: `<p><b>Why this design?</b> The 12-direct choice comes from measurement: in real systems the vast majority of files are under ~48 KB, so one inode read gets you everything, zero indirection. Rare giant files pay with extra reads. Modern ext4 replaced block pointers with <b>extents</b>: one entry (start block, length) describes a whole contiguous run, so a 1 GB contiguous file needs a few extents instead of 262,144 pointers. XFS and Btrfs use B-trees of extents. Extents also cut metadata I/O and fragmentation.</p>
  <p><b>Real limits</b> are not only the pointer maths. ext2/3 stored the block count in 512-byte units in a 32-bit field, so the practical single-file limit was ~2 TB despite the 4 TB formula. ext4 with extents reaches 16 TB (4 KB blocks); XFS 8 EiB. Interviewers love "the formula says 4 TB, why is real life different?"</p>
  <p><b>Inode count is fixed at mkfs time</b> in ext*: roughly one inode per 16 KB of space by default. A mail server with 50 million 1 KB files can hit "No space left on device" with 80% of bytes free. Check with <code>df -i</code>. XFS and Btrfs allocate inodes dynamically.</p>
  <p><b>Sparse files</b>: pointers can be 0 meaning "hole, reads as zeros, no block allocated". <code>st_size</code> is the logical length; <code>st_blocks</code> is what is really allocated. Disk images and databases rely on this. <b>Small file inlining</b>: ext4 can store a tiny file's bytes inside the inode itself (inline_data).</p>
  <p><b>Path lookup cost</b>: the kernel caches name→inode results in the <i>dentry cache</i>, so repeated <code>open("/a/b/c")</code> rarely touches disk. That is why renaming a directory with a million files is instant but <code>cp -r</code> is slow.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI data pipelines create <i>millions of small files</i> (image shards, tokenized samples, checkpoints per step). That is the worst case for inode tables, directory lookups and metadata servers, so teams pack samples into big shard files (WebDataset, TFRecord, Parquet) and use object stores with parallel file systems (Lustre, GPFS) for training clusters.</p>
  <p><b>Work with AI:</b> ask an assistant "walk me through offset 5,000,000 in a 4 KB-block inode, showing each subtraction" and check the arithmetic yourself. It is a great way to build a mental table.</p>
  <p><b>Where AI goes wrong:</b> it often says "inodes store the filename" or forgets that ext4 uses extents, or quotes the 4 TB formula as if it were the real limit. It also mixes up K (pointers per block) with block size.</p>
  <p><b>You must still own:</b> the formula, the unit conversions (KB vs KiB), and the reason for the design (small files dominate).</p>`,
  problems: [{
    title: 'Max File Size with Indirect Blocks',
    level: 'Medium', tags: ['inode', 'math'], companies: ['Google', 'Microsoft'],
    statement: `<p>A Unix file system uses <b>8 KB blocks</b> and <b>8-byte</b> block pointers. Each inode holds <b>10 direct</b> pointers plus one single-, one double- and one triple-indirect pointer. What is the maximum file size? How many disk reads (excluding the inode) are needed to read the last byte in the file when nothing is cached?</p>`,
    constraints: `All sizes are powers of two. Ignore the 32-bit size-field limits.`,
    example: `<p>Pointers per block K = 8192 / 8 = <b>1024</b>.</p>${H.table(['Level', 'Blocks', 'Bytes'], [['10 direct', '10', '80 KB'], ['single', '1,024', '8 MB'], ['double', '1,048,576', '8 GB'], ['triple', '1,073,741,824', '8 TB']])}<p>Max ≈ <b>8 TB + 8 GB + 8 MB + 80 KB</b>.</p>`,
    brute: { why: `<p>Brute force: "just multiply pointers by block size": 13 × 8 KB = 104 KB. This forgets that an indirect pointer points at a <i>block of pointers</i>, not a data block, and that each level multiplies by K.</p>` },
    mcq: { q: 'In a triple-indirect read, how many pointer blocks are read before the data block?', options: ['1', '2', '3', '4'], answer: 2, explain: 'Level-1 block, level-2 block, level-3 block, then the data block: 3 pointer reads + 1 data read.' },
    hints: [`<p>Hint 1: compute K = block / pointer first. It drives every term.</p>`, `<p>Hint 2: each level adds K<sup>level</sup> data blocks; direct adds a fixed count.</p>`, `<p>Hint 3: for the last byte you walk the triple-indirect chain: 3 pointer blocks + 1 data block = 4 reads.</p>`],
    solution: {
      approach: `<p>K = 8192 / 8 = 1024. Data blocks addressable = 10 + K + K² + K³ = 10 + 1,024 + 1,048,576 + 1,073,741,824 = 1,074,791,434. Multiply by 8 KB: about 8 TB + 8 GB + 8 MB + 80 KB. The last byte sits in the triple-indirect tree, so cold reads = 3 pointer blocks + 1 data block = <b>4 disk reads</b> (plus the inode itself, which is usually already cached when the file is open).</p>`,
      dry: { head: ['Level', 'Pointers used', 'Blocks', 'Bytes'], rows: [['direct', '10', '10', '80 KB'], ['single', '1024', '1,024', '8 MB'], ['double', '1024²', '1,048,576', '8 GB'], ['triple', '1024³', '1,073,741,824', '8 TB']] },
      complexity: `<p>Constant-time arithmetic. Read cost is O(levels) pointer-block reads, at most 3 extra reads.</p>`,
      followUps: ['What changes with ext4 extents?', 'What if pointer size doubles to 16 bytes?']
    }
  }]
});
// =====================================================================
// TOPIC 2: hard vs soft links
// =====================================================================
topics.push({
  title: 'Hard Links vs Soft (Symbolic) Links',
  analogy: `<p>A person (the inode) can have <b>two names</b>: "Robert" on the passport and "Bob" with friends. Both names truly point at the same person; if you stop using "Robert", Bob is still there. That is a <b>hard link</b>. A <b>soft link</b> is a sticky note saying "Bob lives at 12 Oak Street". If Bob moves out and the house is demolished, the note still exists but leads nowhere: a <b>dangling link</b>.</p>`,
  explain: `<p>Since a name is just a directory entry that maps to an inode number, you can add a second entry for the same inode. That is a <b>hard link</b> (<code>ln a b</code>). The inode keeps a <b>link count</b>; deleting a name (<code>rm</code> = <code>unlink</code>) lowers the count, and the data is freed only when the count reaches <b>0</b> (and no process still has it open).</p>
  <p>A <b>soft link</b> (<code>ln -s target link</code>) is a <i>new tiny file with its own inode</i> whose content is just the <b>path string</b> of the target. Opening it makes the kernel read that path and look it up again.</p>
  ${H.table(['Question', 'Hard link', 'Soft link'], [
    ['Has own inode?', 'No, shares the same inode', 'Yes, a new inode of type "symlink"'],
    ['Delete original name', '<span class="c-g">Still works</span> (count 2 → 1)', '<span class="c-r">Dangling</span>, reads fail with ENOENT'],
    ['Cross file systems?', 'No (inode numbers are per-FS)', 'Yes (it is just a path)'],
    ['Link to a directory?', 'Normally forbidden (loops)', 'Allowed'],
    ['Size', 'Same as file', 'Length of the path string'],
    ['Relative to?', 'n/a', 'Link\'s directory if path is relative']
  ])}
  <p><b>The classic quiz.</b> File <code>a</code> (inode 7) with content "hi". You run <code>ln a h</code> and <code>ln -s a s</code>, then <code>rm a</code>. Now <code>cat h</code> prints "hi" (inode 7 still has count 1) but <code>cat s</code> fails: "No such file or directory", because the path "a" no longer resolves.</p>`,
  clues: [
    '"after deleting the original file, can you still read it?" → hard link yes, symlink no',
    '"link count", "nlink", "ls -l second column" → hard links to the inode',
    '"link across partitions / to a directory" → only symbolic links can',
    '"dangling", "broken symlink", "ELOOP" → soft link problems',
    '"why can\'t you hard link directories?" → cycles break reference-count freeing and tree walks',
    '"du counts a file twice?" → hard links share blocks; du tracks inodes seen'
  ],
  code: [
    { lang: 'cpp', title: 'link(), symlink(), unlink() in C++', code: R`// Create a file, add a hard link and a symlink, delete the original name.
#include <unistd.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <cstdio>
#include <cstring>

static void show(const char* p) {
    struct stat st;
    if (stat(p, &st) == 0)      // stat() FOLLOWS symlinks; lstat() would not
        printf("%-8s inode=%lu nlink=%lu size=%ld\n", p, (unsigned long)st.st_ino,
               (unsigned long)st.st_nlink, (long)st.st_size);
    else
        printf("%-8s -> stat failed (dangling?)\n", p);
}

int main() {
    int fd = open("a.txt", O_CREAT | O_WRONLY | O_TRUNC, 0644);
    if (fd < 0) { perror("open"); return 1; }
    const char* msg = "hi\n";
    if (write(fd, msg, strlen(msg)) < 0) perror("write");
    close(fd);

    link("a.txt", "hard.txt");        // 2nd directory entry, SAME inode
    symlink("a.txt", "soft.txt");     // new inode whose content is the string "a.txt"
    show("a.txt"); show("hard.txt"); show("soft.txt");

    unlink("a.txt");                  // remove the original NAME
    show("hard.txt");                 // still fine: nlink dropped 2 -> 1
    show("soft.txt");                 // dangling: path "a.txt" no longer exists

    unlink("hard.txt"); unlink("soft.txt");   // cleanup
    return 0;
}` }
  ],
  codeTitle: ['C++ links'],
  viz: {
    title: 'Delete the original: hard link vs soft link',
    input: 'hard',
    inputLabel: 'type "hard" or "soft"',
    gen: function (input) {
      var mode = String(input).trim().toLowerCase();
      if (mode !== 'hard' && mode !== 'soft') throw new Error('Type hard or soft');
      var hard = mode === 'hard', frames = [];
      function g(nodes, edges, hl, tags, ehl) {
        return { type: 'graph', label: hard ? 'Hard link' : 'Soft link', directed: true, height: 70, nodes: nodes, edges: edges, hl: hl || {}, tags: tags || {}, ehl: ehl || {} };
      }
      var nA = { id: 'A', label: 'name "a"', x: 10, y: 15, shape: 'box' };
      var nB = { id: 'L', label: hard ? 'name "link"' : 'symlink "link"', x: 10, y: 52, shape: 'box' };
      var nI = { id: 'I', label: 'inode 7', x: 50, y: 15, shape: 'box' };
      var nD = { id: 'D', label: 'data "hi"', x: 85, y: 15, shape: 'box' };
      var nS = { id: 'S', label: 'inode 9 (symlink)', x: 50, y: 52, shape: 'box' };
      frames.push({ narr: 'File <b>a</b> exists: name "a" → inode 7 → data. Link count = <b>1</b>.', parts: [g([nA, nI, nD], [['A', 'I'], ['I', 'D']], { I: 'ok' }, { I: 'nlink=1' })] });
      if (hard) {
        frames.push({ narr: '<code>ln a link</code> adds a <b>second name</b> pointing at the <b>same inode 7</b>. Link count becomes <b>2</b>. No data copied.', parts: [g([nA, nB, nI, nD], [['A', 'I'], ['L', 'I'], ['I', 'D']], { L: 'ok' }, { I: 'nlink=2' })] });
        frames.push({ narr: '<code>rm a</code> removes only the name "a" and lowers the count to <b>1</b>. The inode and data stay because "link" still references them.', parts: [g([nB, nI, nD], [['L', 'I'], ['I', 'D']], { I: 'cur' }, { I: 'nlink=1' })] });
        frames.push({ narr: '<code>cat link</code> works: name → inode 7 → "hi". <span class="c-g">Data survives.</span> Only when the last name is removed (count 0) are blocks freed.', parts: [g([nB, nI, nD], [['L', 'I'], ['I', 'D']], { D: 'ok' }, { I: 'nlink=1' }, { 'L-I': 'ok', 'I-D': 'ok' })] });
      } else {
        frames.push({ narr: '<code>ln -s a link</code> creates a <b>new inode 9</b> whose content is the text "a". Inode 7 link count stays <b>1</b>.', parts: [g([nA, nB, nI, nD, nS], [['A', 'I'], ['I', 'D'], ['L', 'S'], ['S', 'A', 'path "a"']], { S: 'ok' }, { I: 'nlink=1' })] });
        frames.push({ narr: '<code>rm a</code>: count drops to <b>0</b>, so inode 7 and the data are <b>freed</b>. The symlink inode 9 still holds the text "a".', parts: [g([nB, nS], [['L', 'S']], { S: 'cur' }, { S: 'text: a' })] });
        frames.push({ narr: '<code>cat link</code>: kernel reads "a", looks it up, finds nothing → <span class="c-r">ENOENT (dangling link)</span>. If you later create a new file called "a", the link works again, because it is just a path.', parts: [g([nB, nS, { id: 'X', label: '"a" missing', x: 85, y: 52, shape: 'box' }], [['L', 'S'], ['S', 'X', 'lookup']], { X: 'bad' }, { S: 'text: a' })] });
      }
      return frames;
    }
  },
  examples: [
    { title: 'Backups with hard links (rsync --link-dest)', html: `<p>Daily snapshots: unchanged files are hard-linked to yesterday's copy, so 30 snapshots of a 100 GB tree with 1 GB of changes per day cost ≈ 130 GB, not 3 TB. Deleting an old snapshot only drops link counts; shared files survive.</p>` },
    { title: 'Symlinks for versioned deployments', html: `<p><code>/app/current → /app/releases/2026-10-15</code>. Deploy = create the new release dir, then swap the symlink atomically (<code>ln -sfn</code> then <code>mv -T</code>). Rollback = point it back. Hard links can't do this because the target is a directory.</p>` },
    { title: 'Reading the link count', html: `<p><code>ls -l</code> second column: a regular file has 1 per name. A directory starts at <b>2</b> ("." and its parent's entry) plus 1 for each subdirectory (each child's ".."). So a directory with 3 subdirs shows <b>5</b>.</p>` }
  ],
  deepDive: `<p><b>Open files keep inodes alive.</b> Freeing needs <i>two</i> conditions: link count = 0 <b>and</b> open-file count = 0. That is why you can <code>rm</code> a huge log that a daemon still writes to and see no disk space come back: the inode lives until the process closes it (find with <code>lsof +L1</code>). It is also a standard trick for temp files: <code>open</code> then <code>unlink</code>, and the OS cleans up on crash.</p>
  <p><b>Symlink details.</b> Short targets (&lt; ~60 bytes) are stored inside the inode ("fast symlink"); longer ones use a data block. The kernel limits symlink chains (40 on Linux) and returns <code>ELOOP</code> beyond it. <code>stat()</code> follows symlinks, <code>lstat()</code> does not. Permissions on the symlink itself are ignored; the target's permissions apply. Relative symlinks resolve against the <i>link's directory</i>, not the current directory, a classic bug.</p>
  <p><b>Hard link pitfalls.</b> Editing through either name changes both (same inode). Editors that write a new file and rename over the old one <i>break</i> the hard link, a surprise. Security: attackers with symlink races (TOCTOU) trick privileged programs, which is why <code>O_NOFOLLOW</code> and <code>fs.protected_symlinks</code> exist.</p>
  <p><b>Windows/NTFS and macOS.</b> NTFS has both hard links and symlinks/junctions; APFS supports hard links but they are expensive on directories (Time Machine used directory hard links on HFS+). Container image layers rely on hard links and copy-on-write to share bytes.</p>`,
  aiEra: `<p><b>What AI changes:</b> model checkpoints and datasets are huge and mostly duplicated across experiments. Tools like DVC, git-lfs caches and Hugging Face's cache directory use <b>symlinks and hard links</b> so ten experiments share one 20 GB weights file. Package managers (pnpm, uv) do the same for dependencies.</p>
  <p><b>Work with AI:</b> prompt it with "I ran ln, ln -s, rm a. Predict the output of cat for each name and the link count after each command" then run it in a scratch directory to verify.</p>
  <p><b>Where AI goes wrong:</b> it often claims a symlink "points to the inode" (it points to a path), or says hard links can cross mounts. Also watch for AI-generated scripts that <code>rm -rf</code> through a symlink into a real directory.</p>
  <p><b>You must still own:</b> reasoning about reference counts, reproducible deployments (atomic symlink swap) and safe deletion of AI-generated artefact trees.</p>`
});

// =====================================================================
// TOPIC 3: allocation methods + free-space management
// =====================================================================
topics.push({
  title: 'Allocation Methods (Contiguous, Linked/FAT, Indexed) & Free-Space Bitmap',
  analogy: `<p>A hotel gives you rooms for a school trip. <b>Contiguous</b>: "we need 5 rooms side by side", easy to find a friend, but the hotel gets gaps and sometimes cannot seat you even with 6 empty rooms scattered about. <b>Linked</b>: each room has a note "next room is 214": no gaps problem, but you must walk room to room. <b>Indexed</b>: the front desk holds one sheet listing all your rooms, so you can jump to any room directly. The <b>bitmap</b> is the board at reception: one light per room, green = free.</p>`,
  explain: `<p>The disk is cut into fixed-size <b>blocks</b>. A file system must decide <i>which blocks</i> belong to a file. Three classic answers:</p>
  ${H.table(['Method', 'Idea', 'Good', 'Bad'], [
    ['<b>Contiguous</b>', 'File = start block + length', 'Fast sequential AND random access (math only); tiny metadata', '<span class="c-r">External fragmentation</span>; file growth is hard; must know size ahead'],
    ['<b>Linked</b>', 'Each block stores the number of the next block', 'No external fragmentation; files grow easily', '<span class="c-r">Random access = walk the chain</span> (O(n) reads); one broken pointer loses the tail; pointer space inside every block'],
    ['<b>Linked with FAT</b>', 'Move all "next" pointers into one table in memory (File Allocation Table)', 'Random access walks memory, not disk; simple (USB sticks, SD cards: FAT32/exFAT)', 'FAT must be cached (big disks = big table); the FAT is a single point of failure so it is stored twice'],
    ['<b>Indexed</b>', 'An index block lists every data block (the inode idea from topic 1)', 'Direct random access, no external fragmentation', 'Index block overhead; big files need multi-level index']
  ])}
  <p><b>FAT example.</b> File A starts at block 4. FAT[4] = 7, FAT[7] = 2, FAT[2] = EOF. So A = 4 → 7 → 2. Free blocks have FAT value 0. To read block #2 of A we follow two FAT entries in <i>memory</i>, then do one disk read.</p>
  <p><b>Free-space management with a bitmap.</b> Keep 1 bit per block: 0 = free, 1 = used (or reverse). To find a free block, scan for a 0. To allocate <i>n contiguous</i> blocks, scan for n zeros in a row. Size math: a 1 TB disk with 4 KB blocks has 2<sup>28</sup> blocks = 268,435,456 bits = <b>32 MB</b> of bitmap. Alternatives: free-list (linked list of free blocks), grouping, counting (start, count) and B-tree of free extents.</p>`,
  clues: [
    '"external fragmentation", "need 5 contiguous blocks but free space is scattered" → contiguous allocation',
    '"random access is slow", "pointer inside each block" → linked allocation; "FAT" fixes it by moving pointers to a table',
    '"how many disk accesses to reach block i" → contiguous 1, linked i+1, FAT 1 (table cached), indexed 2 (index + data)',
    '"size of the bitmap for X GB disk" → blocks = size / blocksize; bits / 8 = bytes',
    '"USB stick / camera card file system" → FAT32 / exFAT (linked via table)',
    '"how does the OS find a free block fast" → bitmap, free list, extents tree'
  ],
  code: [
    { lang: 'python', run: true, title: 'Bitmap allocator + FAT chain (runnable)', code: R`# Free-space bitmap (1 = used) and a tiny FAT to follow a file's chain.
N = 16
bitmap = [0] * N
for b in (2, 3, 7, 10, 11):          # blocks already used by other files
    bitmap[b] = 1

def alloc_contiguous(n):
    """first-fit: find n zeros in a row, else fail (external fragmentation)"""
    run = 0
    for i in range(N):
        run = run + 1 if bitmap[i] == 0 else 0
        if run == n:
            start = i - n + 1
            for j in range(start, i + 1):
                bitmap[j] = 1
            return list(range(start, i + 1))
    return None

def alloc_scattered(n):
    """linked/indexed style: take any free blocks"""
    got = [i for i in range(N) if bitmap[i] == 0][:n]
    if len(got) < n:
        return None
    for b in got:
        bitmap[b] = 1
    return got

free = bitmap.count(0)
print("free blocks:", free, "bitmap:", "".join(map(str, bitmap)))
print("contiguous 6 ->", alloc_contiguous(6))   # longest free run is only 4 blocks
print("scattered  6 ->", alloc_scattered(6))     # works: no external fragmentation

# FAT: next[block] = next block, -1 = EOF, 0 = free
fat = {4: 7, 7: 2, 2: -1}
def chain(start):
    out, b = [], start
    while b != -1:
        out.append(b)
        b = fat[b]
    return out
print("file starting at 4 ->", chain(4))
print("bitmap bytes for 1 TB disk with 4 KB blocks:", (1 << 40) // 4096 // 8 // (1 << 20), "MB")` }
  ],
  codeTitle: ['Python: bitmap + FAT'],
  viz: {
    title: 'Disk of 16 blocks: place files with each method',
    input: 'contiguous 3 5 4',
    inputLabel: 'method (contiguous | linked | indexed) then file sizes in blocks',
    gen: function (input) {
      var parts = String(input).trim().split(/[\s,]+/);
      var mode = parts[0].toLowerCase();
      if (['contiguous', 'linked', 'indexed'].indexOf(mode) < 0) throw new Error('Start with contiguous, linked or indexed, then sizes e.g. "linked 3 5 4"');
      var sizes = parts.slice(1).map(Number);
      if (!sizes.length || sizes.some(function (x) { return isNaN(x) || x < 1 || x > 12; }) || sizes.length > 4) throw new Error('Give 1 to 4 file sizes between 1 and 12');
      var N = 16, used = { 2: 1, 3: 1, 7: 1, 10: 1, 11: 1 }, disk = [], i, frames = [];
      for (i = 0; i < N; i++) disk.push(used[i] ? 'old' : '·');
      function bm() { return disk.map(function (v) { return v === '·' ? 0 : 1; }); }
      function snapshot(hl) { return [{ type: 'array', label: 'disk blocks (old = other files)', values: disk.slice(), hl: hl || {}, showIdx: true }, { type: 'array', label: 'free-space bitmap (0 free, 1 used)', values: bm() }]; }
      frames.push({ narr: 'Empty-ish disk: 5 blocks belong to old files (<code>old</code>), 11 are free. The bitmap shows the same thing as 0/1. Method: <b>' + mode + '</b>.', parts: snapshot() });
      var names = ['A', 'B', 'C', 'D'];
      sizes.forEach(function (n, fi) {
        var nm = names[fi], got = [], free = [];
        for (i = 0; i < N; i++) if (disk[i] === '·') free.push(i);
        if (mode === 'contiguous') {
          var run = 0, st = -1;
          for (i = 0; i < N; i++) { run = disk[i] === '·' ? run + 1 : 0; if (run === n) { st = i - n + 1; break; } }
          if (st < 0) {
            frames.push({ narr: 'File ' + nm + ' needs <b>' + n + ' blocks in a row</b>, but only ' + free.length + ' blocks are free in total and no run is long enough. <span class="c-r">External fragmentation: allocation FAILS.</span>', parts: snapshot() });
            return;
          }
          for (i = st; i < st + n; i++) got.push(i);
        } else {
          var need = mode === 'indexed' ? n + 1 : n;
          if (free.length < need) { frames.push({ narr: 'Not enough free blocks for file ' + nm + '.', parts: snapshot() }); return; }
          got = free.slice(0, need);
        }
        var hl = {};
        if (mode === 'indexed') {
          disk[got[0]] = nm + '-idx'; hl[got[0]] = 'sel';
          for (i = 1; i < got.length; i++) { disk[got[i]] = nm + (i - 1); hl[got[i]] = 'ok'; }
          frames.push({ narr: 'File ' + nm + ': take 1 <b>index block</b> (#' + got[0] + ') that lists data blocks <b>' + got.slice(1).join(', ') + '</b>. Any block is reachable in 2 reads: index + data.', parts: snapshot(hl) });
        } else {
          for (i = 0; i < got.length; i++) { disk[got[i]] = nm + i; hl[got[i]] = 'ok'; }
          var how = mode === 'contiguous' ? 'Only <b>start=' + got[0] + ', length=' + n + '</b> needs storing.' : 'Chain: ' + got.join(' → ') + ' → EOF. Reaching block ' + (n - 1) + ' needs ' + n + ' reads (or a FAT lookup in memory).';
          frames.push({ narr: 'File ' + nm + ' (' + n + ' blocks) placed. ' + how, parts: snapshot(hl) });
        }
      });
      var fr = bm().filter(function (x) { return x === 0; }).length;
      frames.push({ narr: 'Done. Free blocks left: <b>' + fr + '</b>. Contiguous leaves odd holes (try "contiguous 6 6"); linked and indexed use every free block.', parts: snapshot() });
      return frames;
    }
  },
  examples: [
    { title: 'Bitmap size for a 1 TB disk, 4 KB blocks', html: `<p>Blocks = 2<sup>40</sup> / 2<sup>12</sup> = 2<sup>28</sup>. One bit each → 2<sup>28</sup> bits = 2<sup>25</sup> bytes = <b>32 MB</b>. With 1 KB blocks it is 128 MB. A free-list alternative stores 4 B per free block, much bigger when the disk is empty.</p>` },
    { title: 'FAT chain', html: `<p>FAT = {4→7, 7→2, 2→EOF, 5→9, 9→EOF}. File 1 starts at 4: blocks 4, 7, 2. File 2 starts at 5: blocks 5, 9. To read the 3rd block of file 1: FAT lookups 4→7→2 happen in RAM, then <b>1 disk read</b> of block 2. With on-disk linked allocation it would be 3 disk reads.</p>` },
    { title: 'Reads to access block 50 of a file', html: `<p>Contiguous: 1 read (address = start + 50). Linked (no FAT): 51 reads. FAT with cached table: 1 disk read. Indexed: 2 reads (index block, then data) or 1 if the index is cached.</p>` },
    { title: 'FAT32 size limit', html: `<p>FAT32 uses 32-bit entries (28 bits used); with 4 KB clusters that is ~2<sup>28</sup> × 4 KB ≈ 1 TB volumes; files are limited to 4 GB − 1 by the 32-bit size field. That is why big videos fail to copy to an old pen drive; exFAT lifts it.</p>` }
  ],
  deepDive: `<p><b>Internal vs external fragmentation.</b> External = free space exists but is scattered (contiguous allocation). Internal = the last block is partly empty: a 1-byte file still uses a full 4 KB block, so 1 million tiny files waste ~4 GB. Small block size cuts internal waste but raises metadata and seek counts.</p>
  <p><b>What modern file systems do.</b> ext4/XFS/NTFS use <b>extents</b>: "start, length" runs, giving contiguous-like speed with indexed flexibility. They add <b>delayed allocation</b>: decide block placement only at flush time, when the final file size is known, so the allocator can pick one long run. <b>Preallocation</b> (<code>fallocate</code>, <code>posix_fallocate</code>) lets databases reserve contiguous space. Copy-on-write file systems (ZFS, Btrfs, APFS) never overwrite in place and use B-trees plus free-space maps.</p>
  <p><b>Bitmap trade-offs.</b> Bitmaps are compact and make "find n contiguous free" easy, but scanning a huge bitmap is slow, so ext4 splits the disk into <b>block groups</b>, each with its own bitmap, inode table and descriptor, keeping a file's inode, directory and data close (less seeking on HDD). XFS keeps free space in two B+trees (by start and by size) for O(log n) best-fit.</p>
  <p><b>SSD note.</b> On flash there are no seeks, but erase blocks and write amplification matter; <b>TRIM/discard</b> tells the SSD which blocks the bitmap marks free so it can garbage-collect.</p>`,
  aiEra: `<p><b>What AI changes:</b> training clusters read petabytes of data. File systems are tuned for it: large block/stripe sizes (1 to 16 MB) and extents for sequential streaming, with NVMe SSD caches in front of object storage. Allocation policy still decides whether a checkpoint write is one fast sequential stream or thousands of scattered pieces.</p>
  <p><b>Work with AI:</b> give it a FAT table and ask for the chain and the number of disk reads, then ask it to explain the <i>same file</i> under indexed allocation. Comparing the two answers exposes mistakes quickly.</p>
  <p><b>Where AI goes wrong:</b> it mixes up internal and external fragmentation, treats FAT as "the filesystem" instead of "linked allocation with a table", and forgets the 4 GB FAT32 limit.</p>
  <p><b>You must still own:</b> the access-cost table (1 / n+1 / 1 / 2), bitmap size arithmetic, and justifying why extents won.</p>`,
  problems: [{
    title: 'Bitmap Size and Block Reads Under FAT',
    level: 'Easy', tags: ['allocation', 'bitmap'], companies: ['Oracle'],
    statement: `<p>A 512 GB disk uses 4 KB blocks. (a) How large is the free-space bitmap? (b) A file occupies the chain 9 → 14 → 3 → 21 → EOF in a FAT that is cached in memory. How many <i>disk</i> reads are needed to fetch the 4th block, with and without the FAT?</p>`,
    constraints: `1 bit per block. 1 GB = 2<sup>30</sup> bytes.`,
    example: `<p>Blocks = 2<sup>39</sup> / 2<sup>12</sup> = 2<sup>27</sup>. Bits = 2<sup>27</sup> → bytes = 2<sup>24</sup> = <b>16 MB</b>. 4th block is #21: with cached FAT = <b>1</b> disk read; plain linked = <b>4</b>.</p>`,
    brute: { why: `<p>Naive: store the number of every free block in a list. That costs ~4 bytes per free block, up to 2<sup>27</sup> × 4 B = 512 MB on an empty disk, 32× more than a bitmap.</p>` },
    mcq: { q: 'Which method gives O(1) disk reads for random access AND has no external fragmentation?', options: ['Contiguous', 'Plain linked', 'Indexed (or FAT with cached table)', 'None'], answer: 2, explain: 'Indexed lists block addresses directly; FAT turns pointer chasing into memory lookups.' },
    hints: [`<p>Hint 1: number of blocks = disk size / block size, one bit each.</p>`, `<p>Hint 2: bits / 8 = bytes; use powers of two.</p>`, `<p>Hint 3: FAT chain walking costs memory time; only fetching the final data block touches disk.</p>`],
    solution: {
      approach: `<p>(a) 512 GB = 2<sup>39</sup> B; block = 2<sup>12</sup> B; blocks = 2<sup>27</sup> = 134,217,728; bitmap = 2<sup>27</sup> bits = 2<sup>24</sup> B = 16 MB. (b) The 4th block of the chain 9→14→3→21 is block 21. With the FAT cached, walking 9→14→3→21 costs three memory lookups and then 1 disk read of block 21. Without a FAT (pointers inside blocks) you must read blocks 9, 14, 3 and then 21: 4 disk reads.</p>`,
      dry: { head: ['Step', 'Block', 'Source of next pointer', 'Disk reads so far (with FAT)'], rows: [['1', '9', 'FAT[9] = 14 (RAM)', '0'], ['2', '14', 'FAT[14] = 3 (RAM)', '0'], ['3', '3', 'FAT[3] = 21 (RAM)', '0'], ['4', '21', 'read data', '1']] },
      complexity: `<p>Bitmap scan O(blocks/wordsize). FAT walk O(position) in memory + O(1) disk.</p>`
    }
  }]
});
// =====================================================================
// TOPIC 4: journaling
// =====================================================================
topics.push({
  title: 'Journaling: Write-Ahead Logs, Metadata vs Data, Crash Recovery',
  analogy: `<p>A chef about to rearrange the whole pantry first writes on a pad: "move flour to shelf 2, move sugar to shelf 3, <b>DONE</b>". Then he moves things. If the power goes out mid-way, he reads the pad: if it says DONE he finishes the moves, if the note is incomplete he ignores it. The kitchen is never left half-rearranged without a record. The pad is the <b>journal</b>.</p>`,
  explain: `<p><b>The problem.</b> Creating one file touches several disk blocks: the <b>inode bitmap</b> (mark inode used), the <b>inode</b> itself, the <b>directory block</b> (add name) and the <b>data blocks / block bitmap</b>. A crash after only some of these writes leaves the file system <i>inconsistent</i>: e.g. a bitmap says "used" but no inode points to it (a leaked block), or a directory entry points to an unwritten inode (garbage file). Old fix: <code>fsck</code> scans the whole disk at boot, which takes hours on large disks.</p>
  <p><b>The journal idea (write-ahead logging).</b> Before touching the real locations, write the planned changes to a small circular log area:</p>
  ${H.table(['Step', 'What happens', 'If crash right after...'], [
    ['1. Journal write', 'Write TxBegin + the new blocks to the journal', '<span class="c-y">No commit record → transaction ignored. Disk unchanged. Old state is intact.</span>'],
    ['2. Journal commit', 'Write TxEnd (commit) record; flush', '<span class="c-g">Committed but not applied → on reboot REPLAY it from the journal.</span>'],
    ['3. Checkpoint', 'Copy the blocks to their home locations', '<span class="c-g">Partly applied → replay again (idempotent), result is the same.</span>'],
    ['4. Free', 'Mark the journal entry free for reuse', 'Everything done; nothing to replay.']
  ])}
  <p>Recovery is <b>fast</b>: read only the journal (a few MB), replay committed transactions, discard uncommitted ones. Time depends on journal size, not disk size.</p>
  <p><b>What gets journaled? (ext3/ext4 modes)</b></p>
  ${H.table(['Mode', 'Journals', 'Safety', 'Speed'], [
    ['<b>journal</b> (full data)', 'Metadata AND file data', 'Highest: data and metadata consistent', 'Slowest: data written twice'],
    ['<b>ordered</b> (ext4 default)', 'Metadata only, but data blocks are forced to disk <i>before</i> the metadata commit', 'Good: no stale-data exposure; file content may be old/new but never garbage', 'Medium'],
    ['<b>writeback</b>', 'Metadata only, data in any order', 'Weakest: after a crash a file may contain old garbage or zeros (but the FS structure is consistent)', 'Fastest']
  ])}
  <p>Journaling guarantees <b>file system consistency</b>, not that your last write survived. For application-level durability you still need <code>fsync</code> (topic 7).</p>`,
  clues: [
    '"system crashed during file creation / rename / append, what state is the disk in?"',
    '"fsck takes hours" → journaling, "recovery time proportional to journal not disk"',
    '"write-ahead log", "WAL", "redo log", "commit record" → journal (same idea as database WAL)',
    '"metadata journaling vs data journaling", "ext4 ordered mode"',
    '"idempotent replay", "checkpoint", "transaction begin/commit"',
    '"copy-on-write file system (ZFS/Btrfs) needs no journal" → different way to stay consistent'
  ],
  code: [
    { lang: 'python', run: true, title: 'Write-ahead journal with crash + replay (runnable)', code: R`# A toy disk and a journal. We crash at different points and replay on "reboot".
def make_disk():
    return {"inode_bitmap": "0", "inode5": None, "dir": []}

def create_file(disk, journal, crash_after):
    # the transaction = what create("a.txt") wants to change
    tx = [("inode_bitmap", "1"), ("inode5", "size=0"), ("dir", ["a.txt->5"])]
    steps = []
    journal.append(("BEGIN",))
    steps.append("journal BEGIN")
    if crash_after == 1: return steps
    for blk, val in tx:
        journal.append(("WRITE", blk, val))
    steps.append("journal blocks written")
    if crash_after == 2: return steps
    journal.append(("COMMIT",))
    steps.append("journal COMMIT")
    if crash_after == 3: return steps
    for i, (blk, val) in enumerate(tx):          # checkpoint to home locations
        disk[blk] = val
        steps.append("checkpoint " + blk)
        if crash_after == 4 + i: return steps
    journal.clear()                               # free journal space
    steps.append("journal freed")
    return steps

def recover(disk, journal):
    """Replay only transactions that have a COMMIT record."""
    committed, pending = [], []
    for rec in journal:
        if rec[0] == "BEGIN": pending = []
        elif rec[0] == "WRITE": pending.append(rec)
        elif rec[0] == "COMMIT": committed = pending[:]
    for _, blk, val in committed:                 # writing the same value twice is harmless
        disk[blk] = val
    return len(committed)

for crash in [1, 2, 3, 4, 5, 99]:
    disk, journal = make_disk(), []
    steps = create_file(disk, journal, crash)
    before = dict(disk)
    replayed = recover(disk, journal)
    print(f"crash_after={crash:>2} last step: {steps[-1]!r}")
    print(f"    disk before recovery: {before}")
    print(f"    blocks replayed: {replayed}; disk after: {disk}")` },
    { lang: 'cpp', title: 'A minimal redo-log record format (C++)', code: R`// Shape of a journal record and the recovery rule, in C++.
#include <cstdint>
#include <vector>
#include <map>
#include <string>

enum class Kind : uint8_t { Begin, Write, Commit };

struct Rec {
    Kind kind;
    uint64_t txid;
    uint64_t block;           // home block number (for Write)
    std::string payload;      // new contents (for Write)
};

// Replay every transaction that has a Commit record; ignore the rest.
std::map<uint64_t, std::string> recover(const std::vector<Rec>& log) {
    std::map<uint64_t, std::vector<const Rec*>> pending;
    std::map<uint64_t, std::string> disk;           // block -> contents
    for (const Rec& r : log) {
        if (r.kind == Kind::Write) pending[r.txid].push_back(&r);
        else if (r.kind == Kind::Commit)
            for (auto* w : pending[r.txid]) disk[w->block] = w->payload;  // idempotent redo
    }
    return disk;   // uncommitted writes never reach the disk
}` }
  ],
  codeTitle: ['Python: crash and replay', 'C++: recovery rule'],
  viz: {
    title: 'Journal commit and crash recovery',
    input: 'ordered 3',
    inputLabel: 'mode (full | ordered | writeback) + crash after step 0..5',
    gen: function (input) {
      var p = String(input).trim().split(/[\s,]+/), mode = p[0].toLowerCase(), crash = p.length > 1 ? Number(p[1]) : 99;
      if (['full', 'ordered', 'writeback'].indexOf(mode) < 0 || isNaN(crash)) throw new Error('Try "ordered 3" (mode full/ordered/writeback, crash step 0-5, 99 = no crash)');
      var steps = [
        'Data blocks written to home location (ordered mode forces this FIRST)',
        'Journal: TxBegin + inode-bitmap, inode, dir-block images',
        'Journal: COMMIT record (flush barrier)',
        'Checkpoint: bitmap + inode copied to home locations',
        'Checkpoint: directory block copied to home location',
        'Journal entry freed'
      ];
      if (mode === 'writeback') steps[0] = 'Data blocks queued; may reach disk at ANY time (writeback)';
      if (mode === 'full') steps[0] = 'Journal: data blocks ALSO go into the journal (double write)';
      var frames = [], jq = [], home = ['bitmap:old', 'inode:old', 'dir:old'], hl, i;
      function view(note, jhl) {
        return [{ type: 'queue', label: 'Journal (oldest at front)', items: jq.slice(), frontLabel: 'replay from here', backLabel: 'newest', hl: jhl || {} },
          { type: 'array', label: 'Home locations on disk', values: home.slice(), hl: { 0: home[0] === 'bitmap:new' ? 'ok' : '', 1: home[1] === 'inode:new' ? 'ok' : '', 2: home[2] === 'dir:new' ? 'ok' : '' } },
          { type: 'text', html: note }];
      }
      frames.push({ narr: 'Goal: <b>create a file</b>. Needs 3 metadata blocks changed (bitmap, inode, directory). Mode <b>' + mode + '</b>. ' + (crash < 99 ? 'We will crash after step <b>' + crash + '</b>.' : 'No crash this time.'), parts: view('Disk is consistent, journal empty.') });
      var crashed = (crash === 0), dataIn = false;
      for (i = 0; i < steps.length && !crashed; i++) {
        var item = null, note = '';
        if (i === 0) { dataIn = mode !== 'writeback'; }
        if (i === 1) { jq.push('TxBegin'); jq.push('bitmap'); jq.push('inode'); jq.push('dir'); }
        if (i === 2) { jq.push('COMMIT'); }
        if (i === 3) { home[0] = 'bitmap:new'; home[1] = 'inode:new'; }
        if (i === 4) { home[2] = 'dir:new'; }
        if (i === 5) { jq = []; }
        frames.push({ narr: 'Step ' + (i + 1) + ': ' + steps[i], parts: view('Journal items: ' + (jq.length ? jq.join(', ') : '(empty)'), jq.length ? { 0: 'cur' } : {}) });
        if (i + 1 === crash) crashed = true;
      }
      if (crashed) {
        var committed = jq.indexOf('COMMIT') >= 0;
        var result;
        if (committed) {
          result = '<span class="c-g">COMMIT found → replay all 3 blocks to home → file exists, FS consistent.</span>';
          home = ['bitmap:new', 'inode:new', 'dir:new'];
        } else if (jq.length) {
          result = '<span class="c-y">No COMMIT → transaction discarded. The file simply does not exist. FS consistent.</span>';
        } else {
          result = '<span class="c-y">Journal empty: nothing was started. File does not exist.</span>';
        }
        var extra = '';
        if (mode === 'writeback' && crash >= 3) extra = ' <br><span class="c-r">Writeback caveat: file data may not have reached disk, so the file can exist but contain zeros/old bytes.</span>';
        if (mode === 'ordered' && crash >= 1) extra = ' <br>Ordered: data was written before the metadata commit, so the file shows real data (or the file does not exist at all).';
        if (mode === 'full') extra = ' <br>Full journal: data is replayed from the journal too, so even the contents are exactly right.';
        frames.push({ narr: '<span class="c-r">CRASH after step ' + crash + '!</span> Reboot: kernel reads the journal. ' + result + extra, parts: [
          { type: 'queue', label: 'Journal at reboot', items: jq.slice(), hl: committed ? { 0: 'ok' } : { 0: 'bad' } },
          { type: 'array', label: 'Home locations after recovery', values: home.slice(), hl: { 0: committed ? 'ok' : 'bad', 1: committed ? 'ok' : 'bad', 2: committed ? 'ok' : 'bad' } }] });
      } else {
        frames.push({ narr: 'No crash: all steps finished. The file exists, journal space is free again. Try crash step 1, 2, 3, 4 and compare the result.', parts: view('Consistent and durable (once the disk cache is flushed).') });
      }
      return frames;
    }
  },
  examples: [
    { title: 'Crash BEFORE the commit record', html: `<p>Journal holds TxBegin and two of three block images, no COMMIT. On reboot recovery sees an incomplete transaction and <b>ignores it</b>. Home locations were never touched, so the disk is exactly the old state: the new file is simply not there. Safe, but you lost the last operation (that is normal; journaling is about consistency).</p>` },
    { title: 'Crash AFTER commit, during checkpoint', html: `<p>Bitmap and inode were copied home, the directory block was not. Without a journal: inode used but no name points to it (an <b>orphan</b>). With the journal: COMMIT is present, recovery replays all three images, the directory gets its entry, <b>file appears</b>. Writing the same block twice is harmless, which is why replay is <b>idempotent</b>.</p>` },
    { title: 'Without journaling: what survives?', html: `<p>Same crash, ext2-style: only whatever writes happened to reach disk. Typical outcomes: leaked blocks, two files owning the same block, directory entries pointing at free inodes. Boot runs <code>fsck</code>, which walks every inode and directory (hours for TBs) and may put damaged files in <code>lost+found</code>.</p>`, code: { lang: 'bash', check: false, code: R`# Typical recovery tools
sudo fsck -f /dev/sdb1     # full consistency scan (unmounted FS)
dumpe2fs -h /dev/sdb1 | grep -i journal   # ext journal info
tune2fs -o journal_data_ordered /dev/sdb1 # choose ext data mode` } }
  ],
  deepDive: `<p><b>Why a commit record + barrier.</b> The disk and its cache may <i>reorder</i> writes. If the COMMIT block lands before the journal blocks it describes, recovery will replay garbage. ext4/jbd2 therefore uses write barriers / FUA / cache flushes between "journal blocks" and "commit block" (and optionally a checksum over the transaction, <code>journal_checksum</code>, so the commit can be written without the extra flush). Disks that lie about flushing are a notorious source of corruption.</p>
  <p><b>Ordered-mode subtlety.</b> Data blocks are written before the metadata that points to them. Hence you never see a file that includes another user's stale blocks. But an <i>overwrite in place</i> of existing data is not atomic: a crash can leave half old, half new data. That is why databases bring their own WAL and use <code>fsync</code>/<code>O_DSYNC</code>.</p>
  <p><b>Journal geometry.</b> The journal is a circular buffer (default 128 MB for large ext4). Transactions are batched (commit every ~5 s or when it fills), so many operations share one commit: <i>group commit</i>, much faster than one flush per syscall. Tail-checkpointing frees space when the oldest transaction's blocks are home.</p>
  <p><b>Alternatives.</b> <b>Copy-on-write</b> (ZFS, Btrfs, APFS): never overwrite live blocks; build a new tree and atomically flip one root pointer, so no replay is needed. <b>Log-structured</b> (F2FS, LFS): the whole disk is the log. <b>Soft updates</b> (FFS): order writes so fsck only needs to fix leaks. XFS journals metadata (logical, not block images) and NTFS journals metadata via $LogFile.</p>
  <p><b>Limits.</b> Journaling does not protect against disk bit-rot, bad firmware, or app-level semantics (you wrote half a config file). ZFS-style end-to-end checksums address silent corruption.</p>`,
  aiEra: `<p><b>What AI changes:</b> training runs write multi-hundred-GB checkpoints. A crash mid-write must never leave a corrupt "latest" checkpoint, so frameworks use the same ideas: write to <code>ckpt.tmp</code>, <code>fsync</code>, then atomic <code>rename</code> (the directory entry flip is the "commit"). Databases behind AI apps (vector stores, Postgres, RocksDB) run on WAL for exactly this reason.</p>
  <p><b>Work with AI:</b> ask it to enumerate "every possible crash point in this 4-step sequence and the on-disk state after each". Then check each case against the journal rules above; it makes a good adversarial tester.</p>
  <p><b>Where AI goes wrong:</b> it claims journaling "prevents data loss" (it only keeps the FS consistent), confuses ordered vs writeback mode, or suggests <code>rename</code> without <code>fsync</code> of the file and its directory.</p>
  <p><b>You must still own:</b> the exact crash-state analysis and picking the right durability level (fsync, O_DIRECT, replication) for the data's value.</p>`,
  problems: [{
    title: 'What Survives the Crash?',
    level: 'Medium', tags: ['journaling', 'crash'], companies: ['Amazon', 'NetApp'],
    statement: `<p>A file system appends one block to file F. The operation needs: (1) write new data block D, (2) update inode I (size + pointer), (3) update block bitmap B. It uses <b>ordered-mode metadata journaling</b>: D is written first, then journal entries for I and B, then COMMIT, then checkpoint. For each crash point list the state of F after reboot: (a) after D written, (b) after journal entries but before COMMIT, (c) after COMMIT before checkpoint, (d) after checkpoint of I but not B.</p>`,
    constraints: `Assume no disk cache reordering.`,
    example: `<p>(a) F unchanged (D is an unreferenced block, bitmap says free, harmless). (b) F unchanged. (c) F has the new block (replayed). (d) F has the new block (replay rewrites I and B).</p>`,
    brute: { why: `<p>With no journal, case (d) is the dangerous one: inode points to a block that the bitmap still calls free, so the block can be given to another file later (<b>two files share one block</b>). A full fsck is needed to detect it.</p>` },
    mcq: { q: 'In ordered mode, why write the data block BEFORE the journal commit?', options: ['So metadata never points at unwritten/garbage data', 'To make the journal smaller', 'To avoid replay', 'Because bitmaps are slow'], answer: 0, explain: 'If the commit were durable but data was not, the inode would reference a block with stale content (possibly another user\'s old data).' },
    hints: [`<p>Hint 1: the only thing that makes a transaction "real" is the COMMIT record.</p>`, `<p>Hint 2: before COMMIT = discard, after COMMIT = replay everything.</p>`, `<p>Hint 3: replay is idempotent, so a partly checkpointed transaction is simply redone fully.</p>`],
    solution: {
      approach: `<p>Rule: recovery replays a transaction iff its COMMIT record is intact in the journal. (a) D is on disk but no journal entry exists, so no committed transaction: file F is exactly as before, the new block is unreferenced and still marked free in the bitmap; nothing is leaked or corrupted. (b) Journal has entries without COMMIT: recovery discards them; F unchanged. (c) COMMIT is present, so replay writes I and B to their home locations; F now includes the appended block and its data (which ordered mode already forced to disk). (d) Again COMMIT is present; replay rewrites I (harmless duplicate) and B; the result is the same as (c). Final answer: in (a) and (b) the append is lost but the FS is consistent; in (c) and (d) the append survives.</p>`,
      dry: { head: ['Crash point', 'COMMIT durable?', 'Recovery action', 'F after reboot'], rows: [['(a) after D', 'no', 'nothing to replay', 'old size, no append'], ['(b) before COMMIT', 'no', 'discard tx', 'old size, no append'], ['(c) after COMMIT', 'yes', 'replay I and B', '<span class="c-g">appended</span>'], ['(d) I checkpointed', 'yes', 'replay again (idempotent)', '<span class="c-g">appended</span>']] },
      complexity: `<p>Recovery time is O(size of journal), independent of disk size.</p>`
    }
  }]
});
// =====================================================================
// TOPIC 5: disk scheduling
// =====================================================================
function diskPath(head, q, algo, max, dir) {
  // returns [{p: position, s: true if a request is served here}], jumps are counted in total
  var path = [], rest = q.slice(), flip = dir === 'down';
  function f(x) { return flip ? max - x : x; }       // mirror so we can always think "up"
  var hd = f(head), qq = q.map(f), i, out = [];
  if (algo === 'FCFS') qq.forEach(function (x) { out.push({ p: x, s: true }); });
  else if (algo === 'SSTF') {
    var cur = hd, left = qq.slice();
    while (left.length) {
      var bi = 0;
      for (i = 1; i < left.length; i++) if (Math.abs(left[i] - cur) < Math.abs(left[bi] - cur)) bi = i;
      cur = left.splice(bi, 1)[0]; out.push({ p: cur, s: true });
    }
  } else {
    var up = qq.filter(function (x) { return x >= hd; }).sort(function (a, b) { return a - b; });
    var low = qq.filter(function (x) { return x < hd; }).sort(function (a, b) { return a - b; });
    up.forEach(function (x) { out.push({ p: x, s: true }); });
    if (algo === 'SCAN') {
      if (low.length) { if (!up.length || up[up.length - 1] !== max) out.push({ p: max, s: false }); for (i = low.length - 1; i >= 0; i--) out.push({ p: low[i], s: true }); }
    } else if (algo === 'C-SCAN') {
      if (low.length) { if (!up.length || up[up.length - 1] !== max) out.push({ p: max, s: false }); out.push({ p: 0, s: false }); low.forEach(function (x) { out.push({ p: x, s: true }); }); }
    } else if (algo === 'LOOK') {
      for (i = low.length - 1; i >= 0; i--) out.push({ p: low[i], s: true });
    } else if (algo === 'C-LOOK') {
      low.forEach(function (x) { out.push({ p: x, s: true }); });
    }
  }
  var prev = head, total = 0;
  out.forEach(function (o) { var real = f(o.p); total += Math.abs(real - prev); prev = real; path.push({ p: real, s: o.s, d: total }); });
  return { path: path, total: total };
}

topics.push({
  title: 'Disk Scheduling: FCFS, SSTF, SCAN, C-SCAN, LOOK (Head Movement Math)',
  analogy: `<p>An <b>elevator</b> with people waiting on floors 98, 183, 37, 122 ... FCFS serves them in the order they pressed the button: zig-zag chaos. SSTF always goes to the nearest floor: quick but people on far floors may wait forever. SCAN is the real elevator: go all the way up serving whoever is on the way, then come down serving the rest. C-SCAN is an elevator that only picks up going up and teleports back to the ground floor. LOOK is a smart elevator that turns around at the highest <i>requested</i> floor, not the top of the building.</p>`,
  explain: `<p>A hard disk (HDD) reads data with a head on an arm that moves between cylinders (tracks). <b>Seek time</b> (moving the arm) is the slowest part, ~4 to 10 ms, versus ~2 ms average rotational delay at 15k RPM and microseconds for transfer. So the OS reorders pending requests to cut total head movement. (On SSDs there are no seeks, so schedulers like <code>none</code> or <code>mq-deadline</code> matter only for fairness.)</p>
  <p><b>Standard exam setup:</b> disk with cylinders 0 to 199, head at <b>53</b>, queue <b>98, 183, 37, 122, 14, 124, 65, 67</b>.</p>
  ${H.table(['Algorithm', 'Rule', 'Service order (head 53, moving up)', 'Total movement'], [
    ['<b>FCFS</b>', 'In arrival order', '98 183 37 122 14 124 65 67', '<b>640</b>'],
    ['<b>SSTF</b>', 'Nearest request next', '65 67 37 14 98 122 124 183', '<b>236</b>'],
    ['<b>SCAN</b> (elevator)', 'Go to the END of disk, then reverse', '65 67 98 122 124 183 (→199) 37 14', '(199−53) + (199−14) = <b>331</b>'],
    ['<b>C-SCAN</b>', 'Go to end, jump to 0, continue up', '65 67 98 122 124 183 (→199→0) 14 37', '146 + 199 + 37 = <b>382</b> (jump counted)'],
    ['<b>LOOK</b>', 'Like SCAN but reverse at the last request', '65 67 98 122 124 183 37 14', '(183−53) + (183−14) = <b>299</b>'],
    ['<b>C-LOOK</b>', 'Like C-SCAN, jump to lowest request', '65 67 98 122 124 183 (→14) 37', '130 + 169 + 23 = <b>322</b>']
  ])}
  <p><b>How to compute:</b> add absolute differences between consecutive stops, starting at the head. FCFS: |98−53|=45, |183−98|=85, |37−183|=146, |122−37|=85, |14−122|=108, |124−14|=110, |65−124|=59, |67−65|=2 → 640. Always state your convention: some books do not count C-SCAN's return jump as "movement" (then 382−199 = 183) because it is a fast seek with no service.</p>
  <p><b>Trade-offs.</b> FCFS: fair, no starvation, worst throughput. SSTF: great throughput, can <b>starve</b> far requests. SCAN/LOOK: bounded wait, middle tracks get better service than edge tracks. C-SCAN/C-LOOK: more uniform wait times (each request waits at most one sweep) and are preferred under heavy load.</p>`,
  clues: [
    '"head at 53, queue 98 183 37 122 14 124 65 67, total head movement?" → apply the algorithm, sum absolute differences',
    '"starvation of far requests" → SSTF; "uniform wait time" → C-SCAN / C-LOOK',
    '"elevator algorithm" → SCAN; "does not go to the end if no requests" → LOOK',
    '"minimize seek time" → greedy nearest (SSTF) or sweep (SCAN)',
    '"disk is an SSD" → seek ordering is pointless, use none / mq-deadline / kyber',
    '"head moving toward 0 initially" → mirror the direction before sweeping'
  ],
  code: [
    { lang: 'python', run: true, title: 'Disk scheduling simulator (runnable)', code: R`# Prints the service order and total head movement for each algorithm.
def schedule(head, queue, algo, max_cyl=199, direction="up"):
    flip = direction == "down"
    f = (lambda x: max_cyl - x) if flip else (lambda x: x)   # mirror trick: always think "up"
    h, q = f(head), [f(x) for x in queue]
    out = []                                                  # (position, is_request)
    if algo == "FCFS":
        out = [(x, True) for x in q]
    elif algo == "SSTF":
        left, cur = q[:], h
        while left:
            nxt = min(left, key=lambda x: abs(x - cur))      # nearest request
            left.remove(nxt); out.append((nxt, True)); cur = nxt
    else:
        up = sorted(x for x in q if x >= h)
        low = sorted(x for x in q if x < h)
        out = [(x, True) for x in up]
        if algo == "SCAN" and low:
            if not up or up[-1] != max_cyl: out.append((max_cyl, False))
            out += [(x, True) for x in reversed(low)]
        elif algo == "C-SCAN" and low:
            if not up or up[-1] != max_cyl: out.append((max_cyl, False))
            out.append((0, False))                            # the long return jump
            out += [(x, True) for x in low]
        elif algo == "LOOK":
            out += [(x, True) for x in reversed(low)]
        elif algo == "C-LOOK":
            out += [(x, True) for x in low]
    path = [f(p) for p, _ in out]
    order = [f(p) for p, is_req in out if is_req]
    total, prev = 0, head
    for p in path:
        total += abs(p - prev); prev = p
    return order, total

HEAD, Q = 53, [98, 183, 37, 122, 14, 124, 65, 67]
print("head =", HEAD, "queue =", Q)
for algo in ["FCFS", "SSTF", "SCAN", "C-SCAN", "LOOK", "C-LOOK"]:
    order, total = schedule(HEAD, Q, algo)
    print(f"{algo:7s} total={total:4d}  order={order}")` },
    { lang: 'cpp', title: 'SSTF and SCAN total movement in C++', code: R`// Total head movement for SSTF and SCAN (moving up first).
#include <vector>
#include <algorithm>
#include <cstdlib>
#include <cstdio>

int sstf(int head, std::vector<int> q) {
    int total = 0;
    while (!q.empty()) {
        auto it = std::min_element(q.begin(), q.end(), [&](int a, int b) {
            return std::abs(a - head) < std::abs(b - head);   // nearest first
        });
        total += std::abs(*it - head);
        head = *it;
        q.erase(it);
    }
    return total;
}

int scan(int head, std::vector<int> q, int maxCyl) {
    std::sort(q.begin(), q.end());
    int total = 0, pos = head;
    bool anyBelow = false, anyAbove = false;
    for (int x : q) { if (x < head) anyBelow = true; else anyAbove = true; }
    if (anyAbove || anyBelow) { total += std::abs(maxCyl - pos); pos = maxCyl; }  // sweep to the end
    if (anyBelow) { total += pos - q.front(); }                                    // come back to lowest request
    return total;
}

int main() {
    std::vector<int> q = {98, 183, 37, 122, 14, 124, 65, 67};
    printf("SSTF = %d\n", sstf(53, q));        // 236
    printf("SCAN = %d\n", scan(53, q, 199));   // 331
}` }
  ],
  codeTitle: ['Python simulator', 'C++ SSTF + SCAN'],
  viz: {
    title: 'Disk head movement',
    input: '53; 98 183 37 122 14 124 65 67; SCAN',
    inputLabel: 'head; queue; algorithm (FCFS SSTF SCAN C-SCAN LOOK C-LOOK); optional max cylinder; optional up/down',
    gen: function (input) {
      var seg = String(input).split(';').map(function (s) { return s.trim(); });
      if (seg.length < 3) throw new Error('Format: head; requests; algorithm  e.g. 53; 98 183 37 122 14 124 65 67; SCAN');
      var head = Number(seg[0]), q = nums(seg[1], 'requests'), algo = seg[2].toUpperCase();
      var max = seg[3] ? Number(seg[3]) : 199, dir = (seg[4] || 'up').toLowerCase();
      if (isNaN(head) || ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'].indexOf(algo) < 0) throw new Error('Algorithm must be FCFS, SSTF, SCAN, C-SCAN, LOOK or C-LOOK');
      if (q.length > 12 || isNaN(max) || max < 10 || max > 5000 || head < 0 || head > max || q.some(function (x) { return x < 0 || x > max; })) throw new Error('Use up to 12 requests, all between 0 and the max cylinder (default 199)');
      var r = diskPath(head, q, algo, max, dir), frames = [], seq = [head], texts = ['start'];
      var pending = q.slice();
      frames.push({ narr: 'Head starts at cylinder <b>' + head + '</b> (disk 0..' + max + '). Algorithm <b>' + algo + '</b>, direction ' + dir + '. Pending requests are listed below; we add the distance of each move.', parts: [
        { type: 'bars', label: 'head positions over time', values: seq.slice(), texts: ['start ' + head], ptr: { 0: 'cur' } },
        { type: 'array', label: 'pending requests', values: pending.slice() },
        { type: 'vars', vals: { head: head, moved: 0 } }] });
      var prev = head;
      r.path.forEach(function (st, k) {
        var d = Math.abs(st.p - prev);
        seq.push(st.p); texts.push((st.s ? '' : 'edge ') + st.p);
        var note;
        if (st.s) { var ix = pending.indexOf(st.p); if (ix >= 0) pending.splice(ix, 1); note = 'serve <b>' + st.p + '</b>'; }
        else note = 'travel to the <b>' + (st.p === 0 ? '0 end' : 'far end ' + st.p) + '</b> (no request there)';
        var ptr = {}; ptr[seq.length - 1] = 'cur';
        var hl = {}; hl[seq.length - 1] = st.s ? 'cur' : 'bad';
        frames.push({ narr: 'Move ' + prev + ' → ' + st.p + ' = <b>' + d + '</b> cylinders, ' + note + '. Running total = <b>' + st.d + '</b>.', parts: [
          { type: 'bars', label: 'head positions over time', values: seq.slice(), texts: texts.slice(), ptr: ptr, hl: hl },
          { type: 'array', label: 'pending requests', values: pending.length ? pending.slice() : ['(none)'] },
          { type: 'vars', vals: { head: st.p, step: d, moved: st.d }, hl: { moved: 'ok' } }] });
        prev = st.p;
      });
      frames.push({ narr: '<b>Total head movement = ' + r.total + ' cylinders</b> for ' + algo + '. Try the other algorithms on the same queue to compare (FCFS 640, SSTF 236, SCAN 331, C-SCAN 382, LOOK 299, C-LOOK 322 for the default).', parts: [{ type: 'vars', vals: { algorithm: algo, total: r.total, requests: q.length }, hl: { total: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'FCFS step by step', html: `<p>Head 53. Moves: 45, 85, 146, 85, 108, 110, 59, 2. Sum: 45+85=130, +146=276, +85=361, +108=469, +110=579, +59=638, +2=<b>640</b>. The zig-zag between 14 and 183 is the wasted work.</p>` },
    { title: 'SSTF picks 65, 67, then 37 (not 98)', html: `<p>From 53: distances: 65→12, 37→16, 67→14, 98→45. Take 65. From 65: 67→2. From 67: 37→30, 98→31, so 37. From 37: 14→23. Then from 14 the nearest is 98 (84). Then 122 (24), 124 (2), 183 (59). Sum 12+2+30+23+84+24+2+59 = <b>236</b>. A steady stream of new requests near 53 could starve the one at 183.</p>` },
    { title: 'SCAN vs LOOK vs C-SCAN, head moving up', html: `<p>SCAN: 53→199 (146) then back down to 14 (185) = 331. LOOK stops at 183: 130 + 169 = 299, saving 32. C-SCAN: 53→199 (146), jump 199→0 (199), 0→37 (37) = 382; the requests are served in order 65 67 98 122 124 183 14 37, giving every request one-sweep waiting.</p>` },
    { title: 'Head moving DOWN first', html: `<p>If the head at 53 starts toward 0: SCAN = 53→0 (53) then 0→183 (183) = 236. LOOK = 53→14 (39) then 14→183 (169) = 208. The initial direction matters; exam questions state it.</p>` }
  ],
  deepDive: `<p><b>Why seek time dominates.</b> A 7200 RPM disk rotates in 8.3 ms (avg rotational latency 4.2 ms); seek ranges 1 ms (adjacent track) to ~15 ms (full stroke), with avg ~8-9 ms. Transfer of 4 KB at 150 MB/s is ~0.03 ms. So random 4 KB I/O is ~100 IOPS vs 150 MB/s sequential, a 1000× gap. Scheduling only gets you a constant factor (maybe 2×) at deep queues, but that is large.</p>
  <p><b>Real systems.</b> The disk's own firmware does <b>NCQ/TCQ</b> (native command queueing), reordering by <i>rotational position</i> too, which the OS cannot see (it does not know the real geometry; LBA numbers are logical and remapped). Linux schedulers: <code>mq-deadline</code> (per-request deadlines to stop starvation, reads before writes), <code>bfq</code> (fair per-process budgets, good for desktops/HDD), <code>kyber</code> (latency targets for fast devices), <code>none</code> (NVMe: hardware queues do the work). CFQ was the old fair-queuing scheduler.</p>
  <p><b>Starvation fix.</b> Deadline/aging: give each request an expiry; SSTF + aging is "SSTF with a limit". Writes can be batched (write coalescing) and the elevator merges adjacent requests into bigger ones (<i>request merging</i>), which beats any seek trick.</p>
  <p><b>Convention differences.</b> C-SCAN movement counts: some textbooks count the return jump; some do not; SCAN may or may not travel to the physical edge (if "LOOK" is meant, say so). In interviews always state: "I count the return travel; if you don't, subtract 199." Ties in SSTF: pick the lower cylinder, state it.</p>
  <p><b>On SSDs.</b> Random reads cost the same everywhere, so ordering by LBA is useless. What matters is parallelism: queue depth across many NAND channels (NVMe has up to 64K queues × 64K entries).</p>`,
  aiEra: `<p><b>What AI changes:</b> the heavy readers are GPU nodes pulling shuffled training samples: effectively random reads. That pushes teams to NVMe SSDs, large sequential shards and prefetching so the loader never waits on seeks. Disk-scheduling theory still explains why "shuffle buffer over big sequential shards" beats "random file per sample" on spinning-disk object stores.</p>
  <p><b>Work with AI:</b> paste your head and queue and ask it to produce a step table, then write your own 20-line simulator (like the Python above) and compare. Disagreements usually reveal a convention (jump counted? edge visited?).</p>
  <p><b>Where AI goes wrong:</b> it often mixes SCAN with LOOK (forgetting travel to the disk edge), mishandles SSTF ties, or sums |difference| from the wrong starting point. It also may state HDD schedulers matter for NVMe.</p>
  <p><b>You must still own:</b> the exact arithmetic and the stated conventions, and recognising when the whole question is moot (SSD, NCQ).</p>`,
  problems: [{
    title: 'Compute Head Movement for All Six Algorithms',
    level: 'Medium', tags: ['disk scheduling', 'math'], companies: ['Oracle', 'Cisco', 'Samsung'],
    statement: `<p>Disk cylinders 0 to 199. Head at <b>53</b> moving toward higher cylinders. Request queue: <b>98, 183, 37, 122, 14, 124, 65, 67</b>. Compute total head movement for FCFS, SSTF, SCAN, C-SCAN (count the return jump), LOOK and C-LOOK (count the jump). Which is best and which can starve requests?</p>`,
    constraints: `Treat the jump from one end to the other as normal head movement.`,
    example: `${H.table(['Algorithm', 'Total'], [['FCFS', '640'], ['SSTF', '236'], ['SCAN', '331'], ['C-SCAN', '382'], ['LOOK', '299'], ['C-LOOK', '322']])}<p>SSTF is smallest here but can starve far requests. LOOK is the best of the elevator family.</p>`,
    brute: { why: `<p>Doing only FCFS (serving in arrival order) gives 640 because the head keeps crossing the disk (183 → 37 → 122 → 14). Most of that distance is avoidable by serving nearby requests together.</p>` },
    mcq: { q: 'Why can SSTF starve a request?', options: ['New nearby requests can keep arriving and always win', 'It ignores requests above the head', 'It only serves reads', 'It reverses direction randomly'], answer: 0, explain: 'A far request never becomes the nearest while closer ones keep arriving.' },
    hints: [`<p>Hint 1: total = sum of |next − current| along the path, starting at the head.</p>`, `<p>Hint 2: sort the requests: 14 37 | 53 | 65 67 98 122 124 183. Those below 53 are 14 and 37; above are the other six.</p>`, `<p>Hint 3: SCAN/C-SCAN visit the disk end (199); LOOK/C-LOOK stop at the last request (183 and 14).</p>`],
    solution: {
      approach: `<p>Sorted: lower side {14, 37}, upper side {65, 67, 98, 122, 124, 183}. FCFS: 45+85+146+85+108+110+59+2 = 640. SSTF: 53→65→67→37→14→98→122→124→183 = 12+2+30+23+84+24+2+59 = 236. SCAN: 53→183 serving upper side, continue to 199, reverse to 14: (199−53) + (199−14) = 146+185 = 331. C-SCAN: 146 to reach 199, jump 199 to 0 = 199, then 0 to 37 = 37, total 382. LOOK: (183−53) + (183−14) = 130+169 = 299. C-LOOK: 130 to 183, jump to 14 = 169, then 14 to 37 = 23, total 322. Best raw total is SSTF 236, but it can starve; LOOK (299) is the best starvation-free choice here.</p>`,
      dry: { head: ['Algorithm', 'Path (cylinders)', 'Moves', 'Total'], rows: [
        ['FCFS', '53→98→183→37→122→14→124→65→67', '45,85,146,85,108,110,59,2', '640'],
        ['SSTF', '53→65→67→37→14→98→122→124→183', '12,2,30,23,84,24,2,59', '236'],
        ['SCAN', '53→65→67→98→122→124→183→199→37→14', '12,2,31,24,2,59,16,162,23', '331'],
        ['C-SCAN', '53→…→183→199→0→14→37', '130,16,199,14,23', '382'],
        ['LOOK', '53→65→67→98→122→124→183→37→14', '12,2,31,24,2,59,146,23', '299'],
        ['C-LOOK', '53→…→183→14→37', '130,169,23', '322']] },
      complexity: `<p>O(n log n) to sort for the sweep algorithms; SSTF naive O(n²).</p>`,
      followUps: ['Redo it with the head moving toward 0 first', 'Which algorithm gives the lowest variance in wait time?']
    }
  }]
});
// =====================================================================
// TOPIC 6: RAID
// =====================================================================
topics.push({
  title: 'RAID 0/1/5/6/10: Capacity, Fault Tolerance & XOR Parity Rebuild',
  analogy: `<p>Group project with 4 friends copying a long textbook. <b>RAID 0</b>: each copies different pages, so you finish 4× faster, but if one friend loses their pages the book is ruined. <b>RAID 1</b>: two friends copy the <i>same</i> pages: safe, but you used two people for one book's worth. <b>RAID 5</b>: three copy pages and a fourth keeps a "checksum sheet" so that if anyone loses theirs, it can be recomputed from the others plus the checksum.</p>`,
  explain: `<p><b>RAID</b> = Redundant Array of Independent Disks. Disks fail (typical annual failure rate 1 to 2%), and one disk is slow, so we combine several. Data is cut into <b>stripes</b> (chunks, e.g. 64 KB) laid across disks.</p>
  ${H.table(['Level', 'Layout', 'Usable capacity (n disks of size S)', 'Survives', 'Notes'], [
    ['<b>RAID 0</b>', 'Stripe, no redundancy', 'n × S', '<span class="c-r">0 failures</span> (any failure loses everything)', 'Fast read and write; scratch space'],
    ['<b>RAID 1</b>', 'Mirror (copy)', 'S (n=2) ', '1 of 2 (n−1 in general)', 'Simple, fast reads, 50% overhead'],
    ['<b>RAID 5</b>', 'Stripe + 1 rotating parity', '(n−1) × S, n ≥ 3', '<b>1 disk</b>', 'Small writes cost 4 I/Os (read-modify-write)'],
    ['<b>RAID 6</b>', 'Stripe + 2 parities (P and Q)', '(n−2) × S, n ≥ 4', '<b>2 disks</b>', 'Safer for large disks, 6 I/Os per small write'],
    ['<b>RAID 10</b>', 'Stripe of mirrors', 'n/2 × S, n even ≥ 4', '1 per mirror pair (up to n/2 if lucky)', 'Fast and safe; 50% overhead']
  ])}
  <p><b>XOR parity in one line.</b> Parity P = D0 ⊕ D1 ⊕ D2. XOR is its own inverse (a ⊕ a = 0), so if D1 dies: D1 = D0 ⊕ D2 ⊕ P. Example with 3-bit numbers: D0=5 (101), D1=3 (011), D2=6 (110) → P = 101 ⊕ 011 ⊕ 110 = <b>000 = 0</b>. Lose D1: 5 ⊕ 6 ⊕ 0 = 011 = <b>3</b> ✓.</p>
  <p>${H.bits(5, 3, { label: 'D0' })}${H.bits(3, 3, { label: 'D1 (lost)', hl: { 0: 'r', 1: 'r', 2: 'r' } })}${H.bits(6, 3, { label: 'D2' })}${H.bits(0, 3, { label: 'P = D0^D1^D2', hl: { 0: 'g', 1: 'g', 2: 'g' } })}</p>
  <p><b>Parity rotates</b> in RAID 5 (a different disk holds P for each stripe), so no disk is a write bottleneck. <b>Worked capacity:</b> five 4 TB disks: RAID 0 = 20 TB, RAID 5 = 16 TB, RAID 6 = 12 TB, RAID 10 (four disks) = 8 TB, RAID 1 (two) = 4 TB.</p>`,
  clues: [
    '"usable capacity of 6 disks of 2 TB in RAID 5/6/10" → (n−1)S, (n−2)S, (n/2)S',
    '"how many disk failures can it survive" → 0 / 1 / 1 / 2 / one per mirror',
    '"rebuild a failed disk", "XOR of the remaining disks" → RAID 5 parity',
    '"write penalty", "read-modify-write", "small random writes" → RAID 5/6 are slow, RAID 10 better',
    '"database, high write IOPS, needs redundancy" → RAID 10; "archive/read-mostly" → RAID 6',
    '"second disk fails during rebuild" → RAID 5 data loss, motivates RAID 6 / erasure coding'
  ],
  code: [
    { lang: 'python', run: true, title: 'RAID-5 XOR parity rebuild demo (runnable)', code: R`# 4-disk RAID 5, parity rotates. Kill one disk and rebuild it using XOR.
from functools import reduce
from operator import xor

N, STRIPES = 4, 4
def data_val(s, j):               # made-up data byte for stripe s, data slot j
    return (s * 37 + j * 91 + 11) % 256

disks = [[None] * STRIPES for _ in range(N)]
for s in range(STRIPES):
    pdisk = (N - 1 - s) % N       # parity rotates: stripe 0 -> disk 3, stripe 1 -> disk 2, ...
    vals, j = [], 0
    for d in range(N):
        if d == pdisk:
            continue
        disks[d][s] = data_val(s, j); vals.append(disks[d][s]); j += 1
    disks[pdisk][s] = reduce(xor, vals)    # P = D0 ^ D1 ^ D2

def show(title):
    print(title)
    for s in range(STRIPES):
        print("  stripe", s, [("X" if disks[d][s] is None else disks[d][s]) for d in range(N)])

show("healthy:")
original = [row[:] for row in disks]

FAILED = 1
disks[FAILED] = [None] * STRIPES                  # disk 1 dies
show(f"after disk {FAILED} fails:")

for s in range(STRIPES):                          # rebuild: XOR of ALL surviving cells in the stripe
    survivors = [disks[d][s] for d in range(N) if d != FAILED]
    disks[FAILED][s] = reduce(xor, survivors)
show("rebuilt:")
print("rebuild correct:", disks == original)

# capacity table for 6 disks of 4 TB
n, size = 6, 4
print({"RAID0": n * size, "RAID1(2 disks)": size, "RAID5": (n - 1) * size, "RAID6": (n - 2) * size, "RAID10": n // 2 * size}, "TB")` },
    { lang: 'cpp', title: 'XOR parity of blocks in C++', code: R`// Parity block = XOR of all data blocks; same function rebuilds a lost block.
#include <vector>
#include <cstdint>
#include <cstdio>

using Block = std::vector<uint8_t>;

// XOR any number of equal-sized blocks together.
Block xorBlocks(const std::vector<Block>& blocks) {
    Block out(blocks.at(0).size(), 0);
    for (const Block& b : blocks)
        for (size_t i = 0; i < out.size(); ++i) out[i] ^= b[i];
    return out;
}

int main() {
    Block d0 = {1, 2, 3}, d1 = {9, 8, 7}, d2 = {4, 4, 4};
    Block parity = xorBlocks({d0, d1, d2});          // written to the parity disk
    Block rebuiltD1 = xorBlocks({d0, d2, parity});   // disk 1 died: recompute it
    for (uint8_t v : rebuiltD1) printf("%d ", v);    // prints 9 8 7
    printf("\n");
}` }
  ],
  codeTitle: ['Python: XOR rebuild', 'C++: xor parity'],
  viz: {
    title: 'RAID striping, parity and rebuild',
    input: '5 4 1',
    inputLabel: 'RAID level (0 1 5 6 10), number of disks, failed disk index (0-based)',
    gen: function (input) {
      var a = nums(input, 'level, disks, failed disk');
      var lvl = a[0], n = a[1], f = a[2], rows = 4, s, c;
      if ([0, 1, 5, 6, 10].indexOf(lvl) < 0) throw new Error('Level must be 0, 1, 5, 6 or 10');
      if (lvl === 1) n = 2;
      if ((lvl === 5 && n < 3) || (lvl === 6 && n < 4) || (lvl === 10 && (n < 4 || n % 2)) || (lvl === 0 && n < 2) || n > 8) throw new Error('Disks: RAID0 >=2, RAID5 >=3, RAID6 >=4, RAID10 even >=4 (max 8)');
      if (isNaN(f) || f < 0 || f >= n) throw new Error('Failed disk index must be 0..' + (n - 1));
      function val(st, j) { return ((st * 5 + j * 3 + 1) % 7) + 1; }
      var cell = [];
      for (s = 0; s < rows; s++) {
        var row = [], xr = 0, j = 0, pd = (n - 1 - (s % n)), qd = (pd + n - 1) % n;
        if (lvl === 5 || lvl === 6) {
          var d = []; for (c = 0; c < n; c++) { if (c === pd || (lvl === 6 && c === qd)) continue; d.push(val(s, d.length)); }
          d.forEach(function (v) { xr ^= v; });
          for (c = 0; c < n; c++) {
            if (c === pd) row.push({ k: 'P', v: xr });
            else if (lvl === 6 && c === qd) row.push({ k: 'Q', v: -1 });
            else row.push({ k: 'D', v: d[j++] });
          }
        } else if (lvl === 0) { for (c = 0; c < n; c++) row.push({ k: 'D', v: val(s, c) }); }
        else if (lvl === 1) { for (c = 0; c < n; c++) row.push({ k: 'D', v: val(s, 0) }); }
        else { for (c = 0; c < n; c++) row.push({ k: 'D', v: val(s, Math.floor(c / 2)) }); }
        cell.push(row);
      }
      function txt(x) { return x.k === 'P' ? 'P=' + x.v : x.k === 'Q' ? 'Q' : 'd=' + x.v; }
      var colHead = [], rowHead = [];
      for (c = 0; c < n; c++) colHead.push('Disk ' + c);
      for (s = 0; s < rows; s++) rowHead.push('stripe ' + s);
      var shown = cell.map(function (r) { return r.map(txt); });
      var cap = { 0: n + ' × S', 1: '1 × S (mirror)', 5: (n - 1) + ' × S', 6: (n - 2) + ' × S', 10: (n / 2) + ' × S' }[lvl];
      var tol = { 0: 'none', 1: '1 disk', 5: '1 disk', 6: '2 disks', 10: '1 per mirror pair' }[lvl];
      var frames = [];
      frames.push({ narr: '<b>RAID ' + lvl + '</b> with <b>' + n + '</b> disks. Rows are stripes. <code>d=</code> data, <code>P=</code> parity (XOR of the stripe\'s data)' + (lvl === 6 ? ', <code>Q</code> second parity' : '') + '. Usable capacity <b>' + cap + '</b>, survives <b>' + tol + '</b>.', parts: [{ type: 'grid', label: 'healthy array', rows: shown, rowHead: rowHead, colHead: colHead }] });
      var hl = {}; for (s = 0; s < rows; s++) hl[s + ',' + f] = 'bad';
      var broken = shown.map(function (r) { return r.map(function (x, ci) { return ci === f ? 'X' : x; }); });
      frames.push({ narr: '<span class="c-r">Disk ' + f + ' fails.</span> Its whole column is gone. ' + (lvl === 0 ? 'RAID 0 has no redundancy: every stripe lost a piece, <b>all data is lost</b>.' : 'The array keeps running in <b>degraded mode</b> (reads of lost blocks are computed on the fly, slower).'), parts: [{ type: 'grid', label: 'degraded array', rows: broken, rowHead: rowHead, colHead: colHead, hl: hl }] });
      var cur = broken.map(function (r) { return r.slice(); }), okhl = JSON.parse(JSON.stringify(hl));
      for (s = 0; s < rows; s++) {
        var x = cell[s][f], how;
        if (lvl === 0) { how = 'no copy and no parity exists → <span class="c-r">cannot rebuild</span>.'; }
        else if (lvl === 1 || lvl === 10) { var mate = lvl === 1 ? (f === 0 ? 1 : 0) : (f ^ 1); how = 'copy from mirror partner disk ' + mate + ': value <b>' + x.v + '</b>.'; cur[s][f] = txt(x); okhl[s + ',' + f] = 'ok'; }
        else if (x.k === 'Q') { how = 'this was the Q parity: recompute Q from the data blocks.'; cur[s][f] = 'Q'; okhl[s + ',' + f] = 'ok'; }
        else {
          var others = [], xv = 0;
          cell[s].forEach(function (y, ci) { if (ci !== f && y.k !== 'Q') { others.push(y.k === 'P' ? 'P(' + y.v + ')' : String(y.v)); xv ^= y.v; } });
          how = (x.k === 'P' ? 'recompute parity = ' : 'lost block = ') + others.join(' ⊕ ') + ' = <b>' + xv + '</b>' + (xv === x.v ? ' ✓' : '') + '.';
          cur[s][f] = txt(x); okhl[s + ',' + f] = 'ok';
        }
        frames.push({ narr: 'Rebuild stripe ' + s + ': ' + how, parts: [{ type: 'grid', label: 'rebuilding onto replacement disk ' + f, rows: cur.map(function (r) { return r.slice(); }), rowHead: rowHead, colHead: colHead, hl: JSON.parse(JSON.stringify(okhl)) }] });
      }
      frames.push({ narr: lvl === 0 ? 'RAID 0 cannot recover. Use it only for data you can regenerate.' : 'Array healthy again. Danger window: until the rebuild ends (hours for multi-TB disks), RAID ' + lvl + (lvl === 5 ? ' is one failure from data loss; this is why RAID 6 exists.' : ' has reduced redundancy.'), parts: [{ type: 'vars', vals: { level: lvl, disks: n, usable: cap, tolerates: tol }, hl: { usable: 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Usable capacity: 6 disks × 4 TB', html: `<p>RAID 0 = 24 TB (0 failures). RAID 5 = (6−1)×4 = 20 TB (1 failure). RAID 6 = (6−2)×4 = 16 TB (2 failures). RAID 10 = 3 mirror pairs × 4 = 12 TB (1 failure guaranteed, up to 3 if each in a different pair). Parity overhead shrinks as you add disks (RAID 5: 1/n), mirror overhead is always 50%.</p>` },
    { title: 'RAID 5 rebuild by XOR', html: `<p>Stripe: D0=5 (101), D1=lost, D2=6 (110), P=0 (000). D1 = 5 ⊕ 6 ⊕ 0 = 101 ⊕ 110 = 011 = <b>3</b>. The rebuild reads <i>every</i> surviving disk fully (for a 4-disk, 8 TB array that is 24 TB of reads), writes the new disk, and runs for hours or days.</p>` },
    { title: 'Small-write penalty in RAID 5', html: `<p>Updating one block D1 → D1': read old D1, read old P, compute P' = P ⊕ D1 ⊕ D1', write D1' and write P'. That is <b>4 I/Os</b> for 1 logical write (RAID 6: 6, RAID 10: 2, RAID 1: 2). A full-stripe write avoids the reads entirely.</p>`, code: { lang: 'python', run: true, code: R`old_d, new_d, old_p = 3, 7, 5
new_p = old_p ^ old_d ^ new_d      # no need to read the other data disks
print("new parity:", new_p)
# check against recomputing from scratch with other disks d0=4, d2=1
d0, d2 = 4, 1
print(old_p == d0 ^ old_d ^ d2, new_p == d0 ^ new_d ^ d2)` } },
    { title: 'RAID 10 vs RAID 0+1', html: `<p>RAID 10 = stripe across mirrors. RAID 0+1 = mirror two stripes. With 4 disks, after one failure RAID 10 survives a second failure if it hits the other pair (2 of 3 cases), but RAID 0+1 loses redundancy of a whole stripe set and fails on any second failure on the other side (1 of 3 cases survives). Prefer RAID 10.</p>` }
  ],
  deepDive: `<p><b>URE danger (unrecoverable read errors).</b> A consumer disk has a URE rate ~1 per 10<sup>14</sup> bits (~12.5 TB). Rebuilding a RAID 5 of 8 TB disks means reading tens of TB: the chance of hitting a URE during rebuild is high, and with no remaining parity that block (or the stripe) is lost. This is the textbook reason large-disk arrays use RAID 6 or erasure coding, and why enterprise drives quote 1 per 10<sup>15</sup> or 10<sup>16</sup>.</p>
  <p><b>RAID 6 math.</b> P is plain XOR; Q is a Reed-Solomon style sum over the finite field GF(2<sup>8</sup>) with a different coefficient per disk: Q = g<sup>0</sup>D0 ⊕ g<sup>1</sup>D1 ⊕ ... Two equations (P and Q) let you solve for two unknown blocks. Modern CPUs use SIMD (AVX2/AVX-512, GFNI) to compute it at memory speed.</p>
  <p><b>Write hole.</b> If power fails between updating data and parity, the stripe is inconsistent and a later disk failure silently corrupts data. Fixes: a battery-backed write cache (BBU) on hardware RAID, an intent bitmap/journal in Linux md (<code>--write-journal</code>), or copy-on-write systems (ZFS RAID-Z uses variable stripe width, closing the hole).</p>
  <p><b>Hardware vs software RAID.</b> Linux <code>md</code> and ZFS are mature and portable. Hardware controllers offload XOR and hide disks from the OS but add a vendor-lock and a controller as a single point of failure. <b>RAID is not a backup</b>: it does not protect against deletion, ransomware, bugs or fire. Beyond RAID: <b>erasure coding</b> (e.g. 10+4 across nodes in Ceph, S3, HDFS EC) generalises RAID 6 to k data + m parity across machines, trading CPU for far less overhead than 3× replication (1.4× vs 3×).</p>
  <p><b>Performance rule of thumb.</b> RAID 0/10: reads n× single disk. RAID 5 sequential reads (n−1)×, random writes ~n/4 of raw IOPS. Chunk size (stripe unit) tuning: small chunks spread a request over more disks (good for big sequential I/O), large chunks keep a small request on one disk (good for random IOPS).</p>`,
  aiEra: `<p><b>What AI changes:</b> big training clusters rarely use classic RAID. Data sits in distributed object stores with <b>erasure coding</b> (the same XOR/Reed-Solomon maths across racks), while local NVMe drives are RAID 0 striped for scratch speed since checkpoints can be regenerated. Model weights are often replicated, not erasure-coded, for read bandwidth. Vector DBs and feature stores use RAID 10 or cloud block storage with built-in replication.</p>
  <p><b>Work with AI:</b> ask for capacity and fault-tolerance tables for 5 disk counts and verify with the formulas above. Ask it to generate a random 4-disk RAID 5 stripe and make you rebuild it by hand.</p>
  <p><b>Where AI goes wrong:</b> it says RAID 1 capacity scales with n, says "RAID is a backup", mixes up RAID 10 and 0+1, or forgets the rebuild-time risk with big drives. It may also quote an obsolete "RAID 5 is fine for 10 TB disks" rule.</p>
  <p><b>You must still own:</b> choosing a redundancy level from the failure model and the write pattern, and testing restores, not just rebuilds.</p>`,
  problems: [{
    title: 'RAID 5 Capacity and Rebuild',
    level: 'Medium', tags: ['RAID', 'XOR'], companies: ['NetApp', 'Dell EMC', 'Amazon'],
    statement: `<p>Five 6 TB disks are in <b>RAID 5</b>. (a) Usable capacity? (b) In one stripe, the three data blocks on disks 0, 2 and 3 hold 0b1010, 0b0110 and 0b1001, parity P (on disk 4) is stored, and disk 1 holds the 4th data block D1 and has failed. First compute P that was written (assume the missing D1 = 0b0011), then show how to rebuild D1 from the survivors. (c) What is the chance-based risk if a second disk fails during rebuild?</p>`,
    constraints: `4-bit blocks for the demo. Parity is XOR over the four data blocks.`,
    example: `<p>Capacity (5−1)×6 = <b>24 TB</b>. P = 1010 ⊕ 0011 ⊕ 0110 ⊕ 1001 = <b>0110</b>. Rebuild D1 = 1010 ⊕ 0110 ⊕ 1001 ⊕ 0110 = <b>0011</b> ✓.</p>`,
    brute: { why: `<p>Keeping a full copy of everything (RAID 1 on 5 disks) would give only 6 TB usable. Parity gives 24 TB for the same hardware at the cost of rebuild work and the small-write penalty.</p>` },
    mcq: { q: 'During a RAID 5 rebuild a second disk fails. What happens?', options: ['Data on the array is lost (beyond parity)', 'Parity auto-heals', 'Only the newest files lost', 'Nothing, RAID 5 tolerates 2 failures'], answer: 0, explain: 'One parity block can solve for only one missing block per stripe; two missing blocks are unsolvable.' },
    hints: [`<p>Hint 1: usable = (n − 1) × disk size.</p>`, `<p>Hint 2: XOR is its own inverse: XOR everything that survives, parity included.</p>`, `<p>Hint 3: align the 4-bit values in columns and XOR column by column (count the 1s: odd → 1).</p>`],
    solution: {
      approach: `<p>(a) Five disks, one disk's worth of parity spread across all of them: (5−1)×6 TB = 24 TB. (b) When the stripe was written, the four data blocks were D0=1010, D1=0011, D2=0110, D3=1001, so P = 1010 ⊕ 0011 ⊕ 0110 ⊕ 1001: 1010 ⊕ 0011 = 1001; 1001 ⊕ 0110 = 1111; 1111 ⊕ 1001 = 0110, so P = 0110. After disk 1 dies, D1 = D0 ⊕ D2 ⊕ D3 ⊕ P = 1010 ⊕ 0110 ⊕ 1001 ⊕ 0110 = 0011, exactly the lost block. (c) While rebuilding, the array has zero redundancy: any second failure, or an unrecoverable read error on a surviving disk, loses data for the affected stripes. With 6 TB disks the rebuild reads 24 TB, so a URE is a realistic risk; use RAID 6, hot spares and backups.</p>`,
      dry: { head: ['Step', 'Operation', 'Binary result'], rows: [['P when written', '1010 ⊕ 0011', '1001'], ['', '1001 ⊕ 0110', '1111'], ['', '1111 ⊕ 1001', '0110 = P'], ['rebuild D1', '1010 ⊕ 0110 ⊕ 1001 ⊕ 0110', '0011 = D1']] },
      complexity: `<p>Rebuild reads (n−1) blocks per stripe: O(n × stripes); small write costs 4 I/Os.</p>`
    }
  }]
});
// =====================================================================
// TOPIC 7: buffering, page cache, fsync
// =====================================================================
topics.push({
  title: 'Buffering, the Page Cache & fsync (When Is Data Really Safe?)',
  analogy: `<p>You hand a letter to a hotel receptionist. She says "Sent!" but she only dropped it in the outgoing tray; the postman comes every 30 seconds. If the hotel burns down at second 10, the letter is gone even though you were told "sent". <code>write()</code> is the tray. <code>fsync()</code> is standing at the counter until the postman signs for the letter. The <b>page cache</b> is the tray: it makes everything fast, and makes "done" mean "probably done".</p>`,
  explain: `<p>Disks are ~100,000× slower than RAM. So the kernel keeps recently used file data in unused RAM: the <b>page cache</b> (shown as "buff/cache" in <code>free -h</code>). Effects:</p>
  <ul><li><b>Reads:</b> <code>read()</code> first checks the cache. A <b>hit</b> is a memory copy (~µs). A miss reads from disk and keeps the pages. The kernel also does <b>read-ahead</b> for sequential patterns.</li>
  <li><b>Writes:</b> <code>write()</code> copies bytes into a cache page, marks it <b>dirty</b> and returns immediately. A background flusher writes dirty pages later (Linux: after ~30 s, or when dirty memory exceeds a threshold). This is <b>write-back caching</b>.</li>
  <li><b>Durability:</b> after <code>write()</code> returns, your data is only in RAM. Power loss now = data lost. <code>fsync(fd)</code> blocks until that file's dirty data <i>and</i> metadata reach stable storage (and the disk's own cache is flushed). <code>fdatasync</code> skips non-essential metadata (like mtime) so it is cheaper.</li></ul>
  ${H.table(['Call / flag', 'What it does', 'Cost'], [
    ['<code>write()</code>', 'Copy into page cache, mark dirty', 'microseconds'],
    ['<code>fsync(fd)</code>', 'Flush file data + metadata to disk, wait', '0.1 to 10 ms on SSD, 5 to 20 ms on HDD'],
    ['<code>fdatasync(fd)</code>', 'Flush data + size-changing metadata only', 'a bit cheaper'],
    ['<code>O_SYNC / O_DSYNC</code>', 'Every write behaves like write + fsync / fdatasync', 'slow, simple'],
    ['<code>O_DIRECT</code>', 'Bypass the page cache (DMA straight to/from user buffer; aligned I/O)', 'used by databases that manage their own cache'],
    ['<code>sync</code> / <code>syncfs</code>', 'Flush everything / one file system', 'whole-system']
  ])}
  <p><b>Safe file replace recipe</b> (atomic update): write new content to <code>file.tmp</code>, <code>fsync(file.tmp)</code>, <code>rename(file.tmp, file)</code>, then <code>fsync</code> the <b>directory</b> so the rename itself is durable.</p>
  <p><b>Buffering in user space</b> is a separate layer: C <code>printf/fwrite</code> collects bytes in a user buffer (e.g. 4 KB) before calling <code>write()</code>; <code>fflush</code> empties it into the kernel (but is <i>not</i> fsync). So there are three places data can hide: <b>user buffer → page cache → disk write cache → platter/NAND</b>.</p>`,
  clues: [
    '"write returned success but data lost after power failure" → page cache + missing fsync',
    '"how do databases guarantee durability" → WAL + fsync (group commit), maybe O_DIRECT',
    '"fsync is slow" → it waits for the physical device; batch commits, use NVMe with power-loss protection',
    '"atomic file update" → write temp, fsync, rename, fsync directory',
    '"free shows little free memory but system is fine" → RAM is used as page cache',
    '"fflush vs fsync" → fflush = user buffer to kernel, fsync = kernel to disk'
  ],
  code: [
    { lang: 'cpp', title: 'open / write / fsync / read / stat in C++', code: R`// Durable write of a small file, then read it back and inspect it.
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
#include <cstdio>
#include <cstring>
#include <cerrno>

int main() {
    const char* path = "demo.txt";
    const char* text = "hello page cache\n";

    // 1) open: O_CREAT makes it, O_TRUNC empties it, 0644 = rw-r--r--
    int fd = open(path, O_CREAT | O_WRONLY | O_TRUNC, 0644);
    if (fd < 0) { perror("open"); return 1; }

    // 2) write: only copies into the kernel page cache and returns
    ssize_t n = write(fd, text, strlen(text));
    if (n < 0) { perror("write"); return 1; }
    printf("wrote %zd bytes (still in page cache)\n", n);

    // 3) fsync: wait until the data AND metadata are on stable storage
    if (fsync(fd) != 0) { perror("fsync"); return 1; }
    printf("fsync done: data is durable\n");
    close(fd);

    // 4) stat: look at the inode we just wrote
    struct stat st;
    if (stat(path, &st) == 0)
        printf("size=%ld bytes, inode=%lu, blocks(512B)=%ld\n",
               (long)st.st_size, (unsigned long)st.st_ino, (long)st.st_blocks);

    // 5) read it back (this read is served from the page cache: no disk I/O)
    char buf[64] = {0};
    fd = open(path, O_RDONLY);
    if (fd < 0) { perror("open"); return 1; }
    ssize_t r = read(fd, buf, sizeof(buf) - 1);
    printf("read %zd bytes: %s", r, buf);
    close(fd);

    unlink(path);   // remove the demo file
    return 0;
}` },
    { lang: 'cpp', title: 'Atomic durable replace (temp + fsync + rename)', code: R`// Replace a config file so a crash leaves either the old or the new version, never half.
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
#include <cstdio>
#include <cstring>
#include <string>

bool atomicReplace(const std::string& dir, const std::string& name, const std::string& data) {
    std::string tmp = dir + "/" + name + ".tmp", fin = dir + "/" + name;
    int fd = open(tmp.c_str(), O_CREAT | O_WRONLY | O_TRUNC, 0644);
    if (fd < 0) return false;
    if (write(fd, data.data(), data.size()) != (ssize_t)data.size()) { close(fd); return false; }
    if (fsync(fd) != 0) { close(fd); return false; }        // new bytes are durable
    close(fd);
    if (rename(tmp.c_str(), fin.c_str()) != 0) return false; // atomic directory-entry flip
    int dfd = open(dir.c_str(), O_RDONLY | O_DIRECTORY);
    if (dfd < 0) return false;
    bool ok = fsync(dfd) == 0;                               // make the rename itself durable
    close(dfd);
    return ok;
}

int main() { return atomicReplace(".", "app.conf", "mode=fast\n") ? 0 : 1; }` }
  ],
  codeTitle: ['C++ POSIX I/O', 'C++ atomic replace'],
  viz: {
    title: 'What survives a power cut? (page cache vs disk)',
    input: 'write write fsync write crash',
    inputLabel: 'commands: write, fsync, flush (background flusher), crash',
    gen: function (input) {
      var cmds = String(input).trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
      if (!cmds.length || cmds.length > 10 || cmds.some(function (c) { return ['write', 'fsync', 'flush', 'crash'].indexOf(c) < 0; })) throw new Error('Use up to 10 commands from: write fsync flush crash');
      var cache = [], disk = [], n = 0, frames = [];
      function parts(extra) {
        return [
          { type: 'queue', label: 'Page cache: dirty pages (RAM, volatile)', items: cache.length ? cache.slice() : ['(none)'], frontLabel: 'oldest', backLabel: 'newest', hl: cache.length ? { 0: 'cur' } : {} },
          { type: 'array', label: 'Disk (durable)', values: disk.length ? disk.slice() : ['(empty)'], hl: disk.length ? (function () { var h = {}; disk.forEach(function (x, i) { h[i] = 'ok'; }); return h; })() : {} },
          { type: 'text', html: extra }];
      }
      frames.push({ narr: 'Start: the app is about to issue <b>' + cmds.join(' → ') + '</b>. RAM page cache is empty, disk is empty.', parts: parts('Rule: only what is on the <b>Disk</b> row survives a crash.') });
      for (var i = 0; i < cmds.length; i++) {
        var c = cmds[i];
        if (c === 'write') { n++; cache.push('P' + n); frames.push({ narr: '<code>write()</code> #' + n + ' returns instantly: bytes copied into the page cache and marked <b>dirty</b>. The app thinks it is saved.', parts: parts('Cache now holds ' + cache.length + ' dirty page(s). Disk unchanged.') }); }
        else if (c === 'fsync') { disk = disk.concat(cache); cache = []; frames.push({ narr: '<code>fsync()</code> blocks until every dirty page of the file is written to the device and its cache flushed. <span class="c-g">Now durable.</span>', parts: parts('All earlier writes are on disk.') }); }
        else if (c === 'flush') { if (cache.length) { disk.push(cache.shift()); } frames.push({ narr: 'The kernel\'s <b>background flusher</b> wrote the oldest dirty page to disk (this happens by itself every few seconds). Not under your control.', parts: parts('Oldest page moved to disk.') }); }
        else {
          var lost = cache.slice();
          cache = [];
          frames.push({ narr: '<span class="c-r">POWER CUT!</span> RAM is wiped. ' + (lost.length ? 'Lost forever: <b>' + lost.join(', ') + '</b> (writes that returned success but were never flushed).' : 'Nothing was dirty, so nothing lost.') + ' Survivors on disk: <b>' + (disk.length ? disk.join(', ') : 'none') + '</b>.', parts: parts('After reboot only the Disk row exists.') });
          break;
        }
      }
      frames.push({ narr: 'Lesson: a successful <code>write()</code> means "in RAM", a successful <code>fsync()</code> means "on stable storage". Databases call fsync at every commit.', parts: parts('Try: "write fsync crash" (safe) vs "write write crash" (lost).') });
      return frames;
    }
  },
  examples: [
    { title: 'The lost-write scenario', html: `<p>Editor saves "report.docx" with <code>write()</code> and exits. Ten seconds later the laptop loses power. The file is empty or old: the dirty pages never left RAM. Good editors do the temp + fsync + rename recipe.</p>` },
    { title: 'Why databases batch fsync (group commit)', html: `<p>One fsync ≈ 1 ms on a good SSD ⇒ 1,000 commits/s if each commit syncs alone. If 50 transactions arrive during that 1 ms and share one fsync, throughput becomes ~50,000 commits/s with the same durability for each. Postgres, MySQL and Kafka all do this.</p>` },
    { title: 'Reading: hit vs miss', html: `<p>Read 1 GB file twice. First time: ~2 s at 500 MB/s (cache misses, with read-ahead). Second time: ~0.3 s at memory-copy speed (hits). Drop caches to test cold: <code>echo 3 | sudo tee /proc/sys/vm/drop_caches</code>. Benchmarks that forget this measure RAM, not the disk.</p>` },
    { title: 'fflush is not fsync', html: `<p><code>fprintf(f, ...); fflush(f);</code> moves bytes from the C library buffer into the kernel page cache. You still need <code>fsync(fileno(f))</code> for durability. Three layers: user buffer, page cache, device cache.</p>` }
  ],
  deepDive: `<p><b>The fsyncgate lesson.</b> If a background write fails (disk error), Linux historically reported the error to only one <code>fsync</code> caller and then marked the pages clean, so the next fsync "succeeded" while data was lost. PostgreSQL discovered this in 2018 and now treats an fsync error as fatal (PANIC) and recovers from WAL. Error handling on <code>fsync</code> and <code>close</code> is not optional.</p>
  <p><b>Device caches lie.</b> SSDs have volatile write caches. <code>fsync</code> must send a <i>FLUSH CACHE</i> (or use FUA writes). Enterprise SSDs have capacitors (power-loss protection) so flush is nearly free; consumer ones may take milliseconds or be dishonest. This one detail explains why a cheap SSD benchmark with fsync is 100× slower than an enterprise one.</p>
  <p><b>Writeback tuning.</b> Linux: <code>vm.dirty_background_ratio</code> (start flushing at ~10% of RAM), <code>vm.dirty_ratio</code> (~20%: writers get throttled/blocked), <code>vm.dirty_expire_centisecs</code> (30 s). Huge dirty backlogs cause latency spikes when the kernel finally throttles writers: "stalls during big copies".</p>
  <p><b>mmap vs read.</b> <code>mmap</code> maps page-cache pages directly into your address space (no copy); page faults replace syscalls. Durable with <code>msync</code>. Databases are split: LMDB loves mmap; others (Postgres, MySQL, RocksDB) run their own buffer pool with O_DIRECT or fadvise to avoid double caching.</p>
  <p><b>Journal interplay.</b> fsync on ext4 forces a journal commit; with many apps calling fsync, all share the same journal and can slow each other down (the 2009 ext4 "zero-length files" controversy came from delayed allocation + missing fsync).</p>`,
  aiEra: `<p><b>What AI changes:</b> checkpointing is the new durability problem. A 1 TB checkpoint is written by hundreds of ranks; frameworks use async checkpointing (copy to RAM, write in a background thread) and must still fsync + rename a manifest last so a crash never leaves a half-written "latest". Inference servers lean on the page cache: model weights are <code>mmap</code>ed (safetensors, GGUF), so a second process or a restart loads in milliseconds when the pages are warm.</p>
  <p><b>Work with AI:</b> ask it to review your save path: "list every failure point between write() and the bytes on NAND". Compare with the three layers above.</p>
  <p><b>Where AI goes wrong:</b> AI-generated code frequently calls <code>write</code> then <code>close</code> and claims "safely persisted", forgets to check return values of <code>fsync</code>/<code>close</code>, or fsyncs the file but not the directory after a rename.</p>
  <p><b>You must still own:</b> deciding the durability contract (what may be lost? how many ms of data?) and testing it with real crash/pull-the-plug experiments.</p>`,
  problems: [{
    title: 'What Survives the Power Cut?',
    level: 'Easy', tags: ['fsync', 'page cache'], companies: ['Google', 'Meta'],
    statement: `<p>An app does: <code>write(A); write(B); fsync(); write(C); write(D);</code> and then power fails before the kernel's 30 s flush timer. Also the kernel flusher happened to write D alone just before the cut. Which of A, B, C, D are on disk after reboot?</p>`,
    constraints: `Assume an honest disk (flush works) and a journaled file system.`,
    example: `<p>A and B: <span class="c-g">safe</span> (fsync returned). C: lost. D: it reached disk, but C did not, so the file has a hole or stale bytes where C belongs. Order is not guaranteed without fsync.</p>`,
    brute: { why: `<p>A weak answer says "C and D are lost because the power failed". It misses that background writeback can persist some later pages and not others (no ordering promise), so the on-disk state can be D without C.</p>` },
    mcq: { q: 'After write() returns successfully, the data is…', options: ['In the kernel page cache, not necessarily on disk', 'Guaranteed on disk', 'In the CPU cache only', 'Lost'], answer: 0, explain: 'write() hands bytes to the kernel; durability needs fsync/fdatasync/O_SYNC.' },
    hints: [`<p>Hint 1: what exactly does fsync promise, and for which writes?</p>`, `<p>Hint 2: writes after the fsync have no durability promise at all.</p>`, `<p>Hint 3: the flusher can persist pages in any order; mention it.</p>`],
    solution: {
      approach: `<p>fsync returned, so everything written before it (A and B) is durable: both data and the metadata needed to find it. C and D were written after the fsync, so the file system promised nothing. C sat in the page cache and is lost. D happened to be flushed, so it is on disk; since the kernel is free to write dirty pages in any order, the file can contain D but not C (and the file size may or may not cover D, depending on the journal commit). A correct application that needs C and D to be all-or-nothing must call fsync again, or use a write-ahead log with checksums so partial tail records are detected and ignored at recovery.</p>`,
      dry: { head: ['Operation', 'Where the bytes are', 'Survive power cut?'], rows: [['write(A), write(B)', 'page cache', 'not yet'], ['fsync()', 'A and B flushed to disk', '<span class="c-g">yes</span>'], ['write(C)', 'page cache only', '<span class="c-r">no</span>'], ['write(D) + lucky flush', 'on disk', 'yes (but C missing)']] },
      complexity: `<p>fsync cost is dominated by device flush latency (ms), not by data size.</p>`
    }
  }]
});

// =====================================================================
// TOPIC 8: blocking vs non-blocking vs async I/O
// =====================================================================
topics.push({
  title: 'Blocking vs Non-blocking vs Multiplexed vs Async I/O',
  analogy: `<p>You order a pizza. <b>Blocking</b>: you stand at the counter doing nothing until it is ready. <b>Non-blocking</b>: you ask "ready yet?" every few seconds (busy polling, annoying). <b>Multiplexing (epoll)</b>: you give your phone number, do other things, get called "something of yours is ready", then pick it up yourself. <b>Async (io_uring/AIO)</b>: the shop <i>delivers</i> the pizza to your table and tells you "done"; you never carry it.</p>`,
  explain: `<p>An I/O call has two phases: <b>(1) wait</b> until data is ready (network packet arrives, disk read finishes) and <b>(2) copy</b> it from the kernel buffer into your buffer. The models differ in who waits and who copies.</p>
  ${H.table(['Model', 'Wait phase', 'Copy phase', 'Thread during wait', 'Example'], [
    ['<b>Blocking</b>', 'thread sleeps in the syscall', 'kernel copies, then returns', 'Blocked (can\'t do other work)', '<code>read(fd)</code> default'],
    ['<b>Non-blocking</b>', 'returns <code>EAGAIN</code> at once if not ready', 'you copy when a later call succeeds', 'Free but burns CPU polling', '<code>O_NONBLOCK</code> + loop'],
    ['<b>I/O multiplexing</b>', '<code>select/poll/epoll_wait</code> blocks on MANY fds', 'you call read when told ready', 'Blocked, but one thread watches thousands of sockets', 'Nginx, Redis, Node.js'],
    ['<b>Asynchronous</b>', 'kernel/device does it in background', 'kernel copies into your buffer for you', 'Fully free; notified on completion', '<code>io_uring</code>, Windows IOCP, POSIX AIO']
  ])}
  <p><b>Important vocabulary.</b> <i>Blocking/non-blocking</i> = does the call wait? <i>Sync/async</i> = who completes the data transfer? epoll is non-blocking-ish + readiness notification but still <b>synchronous</b> (you do the read). True async means you get a <b>completion</b> event with data already in your buffer.</p>
  <p><b>Regular files vs sockets:</b> Linux regular files are always "ready", so <code>O_NONBLOCK</code> and <code>epoll</code> don't help; disk reads block on a page-cache miss. That is why Node.js uses a thread pool for file I/O and why io_uring was created (real async file I/O).</p>`,
  clues: [
    '"10,000 concurrent connections", "C10K" → multiplexing (epoll) or async, not thread-per-connection',
    '"read returns EAGAIN / EWOULDBLOCK" → non-blocking mode',
    '"select vs poll vs epoll" → O(n) scans vs O(1)/ready-list; epoll scales',
    '"readiness vs completion notification" → epoll vs io_uring/IOCP',
    '"thread blocked on disk I/O" → blocking; scale with a thread pool or io_uring',
    '"event loop stalls" → a blocking call inside the single-threaded loop'
  ],
  code: [
    { lang: 'cpp', title: 'Non-blocking read + poll() in C++', code: R`// Wait for stdin with poll(), then read without ever blocking on a data-less fd.
#include <fcntl.h>
#include <unistd.h>
#include <poll.h>
#include <cerrno>
#include <cstdio>

int main() {
    // switch fd 0 (stdin) to non-blocking mode
    int flags = fcntl(0, F_GETFL, 0);
    fcntl(0, F_SETFL, flags | O_NONBLOCK);

    char buf[128];
    ssize_t n = read(0, buf, sizeof(buf));          // may fail immediately
    if (n < 0 && (errno == EAGAIN || errno == EWOULDBLOCK))
        printf("nothing yet (EAGAIN): do other work instead of sleeping\n");

    struct pollfd p;
    p.fd = 0; p.events = POLLIN; p.revents = 0;     // "tell me when readable"
    int ready = poll(&p, 1, 1000);                  // wait up to 1000 ms for ANY of our fds
    if (ready > 0 && (p.revents & POLLIN)) {
        n = read(0, buf, sizeof(buf));              // now this read will not block
        printf("got %zd bytes\n", n);
    } else if (ready == 0) {
        printf("timeout, no data in 1 s\n");
    }
    return 0;
}` },
    { lang: 'python', run: true, title: 'Blocking vs overlapped waits (runnable)', code: R`# Three "disk reads" that each take 0.2 s. Blocking = sequential, overlapped = concurrent.
import time, threading

def slow_read(name, results):
    time.sleep(0.2)                    # pretend the device takes 200 ms
    results.append(name)

t0 = time.time()
r1 = []
for n in ["a", "b", "c"]:              # blocking style: wait for each in turn
    slow_read(n, r1)
blocking = time.time() - t0

t0 = time.time()
r2, ths = [], []
for n in ["a", "b", "c"]:              # async style: start all, then collect completions
    th = threading.Thread(target=slow_read, args=(n, r2)); th.start(); ths.append(th)
for th in ths:
    th.join()
overlap = time.time() - t0

print(f"blocking total  ~{blocking:.1f}s (3 x 0.2)")
print(f"overlapped total ~{overlap:.1f}s (waits overlap)")
print("sorted completions:", sorted(r2))` }
  ],
  codeTitle: ['C++ O_NONBLOCK + poll', 'Python overlap demo'],
  viz: {
    title: 'Timeline of one read under each I/O model',
    input: 'blocking',
    inputLabel: 'blocking | nonblocking | multiplexed | async',
    gen: function (input) {
      var m = String(input).trim().toLowerCase();
      var T = {
        blocking: [['read()', 'sleeping', 'sleeping', 'sleeping', 'sleeping', 'use data', 'work', 'work'], ['wait device', 'wait device', 'wait device', 'data ready', 'copy to user', '', '', '']],
        nonblocking: [['read EAGAIN', 'read EAGAIN', 'read EAGAIN', 'read EAGAIN', 'read OK+copy', 'use data', 'work', 'work'], ['wait device', 'wait device', 'wait device', 'data ready', 'copy to user', '', '', '']],
        multiplexed: [['epoll_wait', 'blocked (many fds)', 'blocked (many fds)', 'blocked (many fds)', 'ready! read()', 'use data', 'epoll_wait', 'blocked'], ['wait device', 'wait device', 'wait device', 'data ready', 'copy to user', '', '', '']],
        async: [['submit', 'other work', 'other work', 'other work', 'other work', 'completion event', 'use data', 'other work'], ['accept', 'wait device', 'wait device', 'data ready', 'copy to user buf', 'post completion', '', '']]
      };
      if (!T[m]) throw new Error('Type blocking, nonblocking, multiplexed or async');
      var notes = {
        blocking: ['Thread calls read() and the kernel puts it to sleep: it can do <b>nothing else</b>.', 'Still sleeping while the device works.', 'Still asleep.', 'Device has data in the kernel buffer.', 'Kernel copies into the user buffer, thread wakes.', 'Finally the thread can use the data.', 'Back to normal work.', 'Time wasted waiting: 4 ticks.'],
        nonblocking: ['read() returns <b>EAGAIN</b> immediately: not ready.', 'Ask again: still EAGAIN (CPU burned).', 'Again EAGAIN...', 'Again... data becomes ready only now.', 'This read succeeds and copies.', 'Use data.', 'Work.', 'Cost: many wasted syscalls (busy polling).'],
        multiplexed: ['epoll_wait watches MANY sockets at once.', 'Sleeping, but ready to hear about ANY of them.', 'Still waiting (other sockets could fire).', 'The device has data → kernel marks this fd readable.', 'epoll returns; we call read() ourselves (so still <b>synchronous</b> copy).', 'Use data.', 'Loop: back to epoll_wait for the next event.', 'One thread serves thousands of connections.'],
        async: ['Submit the request (io_uring SQE) and keep going.', 'Thread does other useful work.', 'Still free.', 'Device works; kernel does the copy later.', 'Kernel copies <i>directly into our buffer</i>.', 'A <b>completion</b> entry (CQE) appears.', 'We just use the data; nothing left to copy.', 'Zero blocked ticks.']
      };
      var frames = [], cols = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'], g = T[m];
      for (var i = 0; i < 8; i++) {
        var hl = {}; hl['0,' + i] = (g[0][i].indexOf('sleep') >= 0 || g[0][i].indexOf('blocked') >= 0) ? 'bad' : (g[0][i].indexOf('EAGAIN') >= 0 ? 'cur' : 'ok'); hl['1,' + i] = 'win';
        var rows = g.map(function (r) { return r.map(function (x, j) { return j <= i ? x : ''; }); });
        frames.push({ narr: '<b>' + cols[i] + '</b> (' + m + '): ' + notes[m][i], parts: [{ type: 'grid', label: 'rows: app thread / kernel+device', rows: rows, rowHead: ['App thread', 'Kernel / device'], colHead: cols, hl: hl }] });
      }
      return frames;
    }
  },
  examples: [
    { title: 'Why thread-per-connection fails at 10k connections', html: `<p>10,000 threads × 1 MB stack (virtual) and context switching = big memory and scheduler pressure. One epoll thread watching 10,000 sockets uses a few MB. That is the C10K problem and why Nginx and Redis are event-driven.</p>` },
    { title: 'select vs poll vs epoll', html: `<p><code>select</code>: fd bitmap limit (1024), kernel scans all fds each call, O(n). <code>poll</code>: no limit, still O(n). <code>epoll</code>: register once, the kernel keeps a ready list; <code>epoll_wait</code> returns only ready fds, O(ready). Level-triggered re-reports readiness each call; edge-triggered reports changes only (must read until EAGAIN).</p>` },
    { title: 'Readiness vs completion', html: `<p>epoll says "you <i>can</i> read now" (readiness). io_uring says "your read <i>finished</i> and the bytes are in your buffer" (completion). Completion models also work for regular files and can batch many operations into one syscall, even zero syscalls with SQ polling.</p>` }
  ],
  deepDive: `<p><b>Cost of blocking.</b> A blocked thread costs a kernel stack (~8-16 KB) plus scheduler bookkeeping; waking it needs a context switch (~1-5 µs plus cache pollution). For millions of tiny I/Os, syscall overhead (hundreds of ns, more with mitigations) dominates, which io_uring attacks with shared ring buffers.</p>
  <p><b>Epoll pitfalls.</b> Edge-triggered mode requires non-blocking fds and draining to EAGAIN or you will miss events. Thundering herd when many threads wait on one listening socket (use <code>EPOLLEXCLUSIVE</code> or <code>SO_REUSEPORT</code>). Regular files always report ready.</p>
  <p><b>Linux AIO vs io_uring.</b> POSIX AIO in glibc is a thread pool in disguise. Native Linux AIO (<code>io_submit</code>) works only with <code>O_DIRECT</code> and can still block. io_uring (since 5.1) supports files, sockets, timeouts, linked operations and registered buffers; its security surface is large, so some container runtimes restrict it (gVisor, some seccomp profiles, Google disabled it in production).</p>
  <p><b>Language runtimes.</b> Node.js: libuv uses epoll for sockets and a 4-thread pool for file I/O and DNS. Go: goroutines look blocking, but the runtime's netpoller uses epoll under the hood. Java NIO: selectors (epoll); virtual threads (Java 21) park on blocking calls and reuse carrier threads. Python asyncio: selectors + coroutines.</p>
  <p><b>Tail latency.</b> A single blocking call (DNS, fsync, a page fault) inside an event loop stalls every connection on that loop: the most common cause of mysterious p99 spikes in Node/Redis.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM serving is I/O-bound at the edges: thousands of streaming (SSE/WebSocket) connections waiting on tokens, so async runtimes (asyncio, Rust tokio, Go) and epoll/io_uring front ends dominate. Data loaders overlap disk reads, decode and GPU transfer with prefetch threads (async I/O in spirit). GPUDirect Storage lets NVMe DMA straight into GPU memory, skipping CPU copies.</p>
  <p><b>Work with AI:</b> give it your server's thread dump and ask "which threads are blocked in which syscall and what does that imply". It's good at pattern spotting; you verify with <code>strace</code> and <code>perf</code>.</p>
  <p><b>Where AI goes wrong:</b> it calls <code>epoll</code> "asynchronous I/O" (it is readiness-based, synchronous copy), confuses non-blocking with async, or suggests <code>O_NONBLOCK</code> for regular files (no effect).</p>
  <p><b>You must still own:</b> the vocabulary (blocking vs sync), finding the blocking call hidden in an async path, and choosing threads vs event loop vs io_uring by workload.</p>`,
  problems: [{
    title: 'Pick the I/O Model for a Chat Gateway',
    level: 'Medium', tags: ['I/O models', 'epoll'], companies: ['Meta', 'Cloudflare'],
    statement: `<p>A gateway holds 100,000 mostly-idle WebSocket connections and must also read a config file from disk occasionally. Which I/O model would you use for the sockets and for the file read? Explain what goes wrong with thread-per-connection and with busy-polling non-blocking sockets.</p>`,
    constraints: `Linux, 8 cores, p99 latency target 50 ms.`,
    example: `<p>Sockets: epoll with a few worker threads (one per core). File read: dedicated thread pool or io_uring, because regular files are always "ready" in epoll and would block the loop.</p>`,
    brute: { why: `<p>Thread-per-connection: 100,000 threads, huge stack memory, scheduler thrash, context switches. Busy-polling non-blocking: 100,000 fds × repeated syscalls burn all 8 cores doing nothing useful.</p>` },
    mcq: { q: 'Which model gives you a completion event with the data already in your buffer?', options: ['Blocking read', 'Non-blocking read', 'epoll + read', 'io_uring / IOCP'], answer: 3, explain: 'Async completion models perform the copy for you and notify on finish.' },
    hints: [`<p>Hint 1: most connections are idle, so you want something that sleeps until ANY fd is ready.</p>`, `<p>Hint 2: epoll scales with active fds, not total fds.</p>`, `<p>Hint 3: where can a blocking call sneak into the event loop? File I/O, DNS, fsync, logging.</p>`],
    solution: {
      approach: `<p>Use epoll (edge- or level-triggered) with N worker threads, each owning an event loop, sockets in non-blocking mode and SO_REUSEPORT to spread accepts. An idle connection then costs only a small struct, and work is proportional to active fds. Thread-per-connection fails because 100k threads cost gigabytes of stacks and kernel structures and heavy context switching; busy-polling non-blocking sockets would spin 8 cores at 100% to find mostly nothing. For the file read, epoll cannot help (regular files are always readable); run it on a small worker pool or io_uring so the event loop never blocks, and cache the result since the config rarely changes. Keep fsync, DNS and logging off the loop for the same reason, and measure p99 with strace/perf to catch any blocking syscall that slips in.</p>`,
      dry: { head: ['Approach', 'Memory', 'CPU while idle', 'Verdict'], rows: [['thread per connection', '100k stacks', 'low but huge switch cost on activity', '<span class="c-r">no</span>'], ['busy-poll non-blocking', 'small', '100% of cores', '<span class="c-r">no</span>'], ['epoll workers', 'small', '≈0', '<span class="c-g">yes</span>'], ['io_uring/thread pool for files', 'small', '≈0', '<span class="c-g">yes</span>']] },
      complexity: `<p>epoll_wait cost is O(number of ready fds) per call.</p>`
    }
  }]
});
// =====================================================================
// TOPIC 9: DMA and the I/O path
// =====================================================================
topics.push({
  title: 'DMA, Interrupts & the Life of a Disk Read',
  analogy: `<p>A manager (CPU) needs 500 boxes moved from the delivery truck to a warehouse. <b>Programmed I/O</b>: the manager carries every box personally, so no other work gets done. <b>DMA</b>: the manager gives a forklift driver (DMA controller) a note "move 500 boxes from here to there, ring me when done", then goes back to meetings. One phone call at the end instead of 500 trips.</p>`,
  explain: `<p>Devices (disk, NIC, GPU) are much slower than the CPU. How does data get between a device and RAM?</p>
  <ul><li><b>Programmed I/O (PIO / polling):</b> the CPU reads a status register in a loop, then moves each word with load/store instructions. Simple, burns CPU. Fine for tiny, rare transfers.</li>
  <li><b>Interrupt-driven I/O:</b> the CPU starts the device and runs something else; the device raises an <b>interrupt</b> when a byte/word is ready. Still one interrupt per word: too many for fast devices.</li>
  <li><b>DMA (Direct Memory Access):</b> the OS programs a DMA engine (or the device itself, "bus-master") with <i>source, destination address, byte count</i>. The engine copies the whole block over the memory bus without the CPU, then raises <b>one interrupt</b> on completion.</li></ul>
  <p><b>Life of a read() that misses the page cache</b> (with DMA):</p>
  <ol><li>App calls <code>read(fd, buf, 4096)</code> → trap into the kernel (system call).</li>
  <li>File system maps file offset → disk block (inode/extents), checks the page cache: <b>miss</b>.</li>
  <li>Block layer builds a request and the I/O scheduler queues it; the driver writes the command into the controller (NVMe submission queue + doorbell).</li>
  <li>The calling thread is put to <b>sleep</b>; the CPU runs other threads.</li>
  <li>The device fetches the data and <b>DMAs it into a kernel page-cache page</b> in RAM.</li>
  <li>Device raises an <b>interrupt</b>; the handler marks the request done and wakes the thread.</li>
  <li>Kernel copies from the page cache page into the user's <code>buf</code> (<code>copy_to_user</code>) and returns. This is the 1 CPU copy that remains (zero-copy methods like <code>sendfile</code>, <code>mmap</code> avoid it).</li></ol>
  ${H.table(['', 'PIO (polling)', 'Interrupt per word', 'DMA'], [
    ['CPU involvement', 'Entire transfer', 'Per word (ISR)', 'Setup + 1 completion interrupt'],
    ['Good for', 'Tiny, simple devices', 'Slow devices (keyboard)', 'Disks, NICs, GPUs'],
    ['1 MB transfer at 4 KB/block', '1M word copies by CPU', '~262,144 interrupts if per word... heavy', '256 DMA ops, 256 interrupts (or fewer with coalescing)']
  ])}
  <p>DMA caveat: the DMA engine writes RAM behind the CPU's back, so the kernel must keep <b>CPU caches coherent</b> (hardware snooping or explicit flush/invalidate) and use <b>IOMMU</b> to confine the device to allowed addresses.</p>`,
  clues: [
    '"CPU is 100% busy copying data from disk" → no DMA / programmed I/O',
    '"how does the OS know the disk finished" → interrupt (or polling in NVMe polled mode)',
    '"zero-copy", "sendfile", "avoid copying between kernel and user space"',
    '"interrupt storm", "interrupt coalescing", "NAPI" → too many interrupts at high packet rates',
    '"DMA and cache coherence", "IOMMU", "bounce buffer"',
    '"steps of a read system call" → trap → VFS → cache → block layer → driver → DMA → interrupt → copy'
  ],
  code: [
    { lang: 'python', run: true, title: 'CPU time: programmed I/O vs DMA (runnable estimate)', code: R`# Back-of-envelope: how much CPU time does moving 1 GB cost?
GB = 1 << 30
word = 8                       # bytes per CPU load/store
cpu_copy_rate = 4 * (1 << 30)  # ~4 GB/s a core can copy with PIO-style loops
pio_cpu_s = GB / cpu_copy_rate

dma_setup_us = 5               # program descriptor + handle completion interrupt
chunk = 128 * 1024             # 128 KB per DMA request
requests = GB // chunk
dma_cpu_s = requests * dma_setup_us / 1e6

print(f"PIO: CPU busy ~{pio_cpu_s * 1000:.0f} ms for 1 GB")
print(f"DMA: {requests} requests x {dma_setup_us} us = CPU busy ~{dma_cpu_s * 1000:.1f} ms")
print(f"CPU saved: {100 * (1 - dma_cpu_s / pio_cpu_s):.1f}%")
# And the bus-time: both still move 1 GB across the memory bus; DMA just does not use the CPU.` },
    { lang: 'cpp', title: 'sendfile(): kernel-side copy, no user buffer (C++)', code: R`// Send a file to a socket/fd without copying through user space (Linux).
#include <sys/sendfile.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <cstdio>

// copies "path" into out_fd. Data goes page cache -> NIC via DMA; CPU copies avoided.
bool sendWholeFile(int out_fd, const char* path) {
    int in = open(path, O_RDONLY);
    if (in < 0) return false;
    struct stat st;
    if (fstat(in, &st) != 0) { close(in); return false; }
    off_t offset = 0;
    while (offset < st.st_size) {
        ssize_t n = sendfile(out_fd, in, &offset, st.st_size - offset);  // offset advances
        if (n <= 0) { close(in); return false; }
    }
    close(in);
    return true;
}

int main() { return sendWholeFile(1, "/etc/hostname") ? 0 : 1; }   // fd 1 = stdout` }
  ],
  codeTitle: ['Python estimate', 'C++ sendfile (zero-copy)'],
  viz: {
    title: 'CPU copy (PIO) vs DMA data flow',
    input: 'dma',
    inputLabel: 'type "dma" or "pio"',
    gen: function (input) {
      var m = String(input).trim().toLowerCase();
      if (m !== 'dma' && m !== 'pio') throw new Error('Type dma or pio');
      var dma = m === 'dma';
      var nodes = [
        { id: 'APP', label: 'App (read call)', x: 12, y: 10, shape: 'box', w: 20 },
        { id: 'CPU', label: 'CPU / kernel', x: 12, y: 42, shape: 'box', w: 20 },
        { id: 'RAM', label: 'RAM (page cache)', x: 52, y: 42, shape: 'box', w: 22 },
        { id: 'DMA', label: dma ? 'DMA engine' : 'bus (CPU is mover)', x: 52, y: 10, shape: 'box', w: 22 },
        { id: 'DEV', label: 'Disk controller', x: 86, y: 26, shape: 'box', w: 20 }
      ];
      var edges = [['APP', 'CPU', 'read()'], ['CPU', 'DMA', 'program'], ['DMA', 'DEV', 'cmd'], ['DEV', 'RAM', 'data'], ['DEV', 'CPU', 'IRQ']];
      function G(hl, ehl, tags) { return { type: 'graph', label: dma ? 'DMA read' : 'Programmed I/O read', directed: true, height: 56, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
      var f = [];
      f.push({ narr: 'App calls <code>read()</code>; the CPU traps into the kernel. Data is not in the page cache yet.', parts: [G({ APP: 'cur', CPU: 'cur' }, { 'APP-CPU': 'ok' })] });
      if (dma) {
        f.push({ narr: 'The kernel programs the <b>DMA engine</b>: "copy 4 KB from the disk controller to RAM page X", then goes back to run other threads (the reader sleeps).', parts: [G({ DMA: 'cur' }, { 'CPU-DMA': 'ok', 'DMA-DEV': 'ok' }, { CPU: 'free for other work' })] });
        f.push({ narr: 'The disk controller streams the block <b>straight into RAM</b> over the bus. The CPU is not involved at all in moving bytes.', parts: [G({ DEV: 'cur', RAM: 'ok' }, { 'DEV-RAM': 'ok' }, { CPU: 'running other threads', RAM: 'filling' })] });
        f.push({ narr: 'Transfer finished: the device raises <b>one interrupt</b>. The kernel marks the page valid and wakes the sleeping thread.', parts: [G({ CPU: 'cur', RAM: 'ok' }, { 'DEV-CPU': 'ok' }, { CPU: 'IRQ handler' })] });
        f.push({ narr: 'Kernel does a final <code>copy_to_user</code> from the page cache to the app buffer (one CPU copy), then <code>read()</code> returns. CPU cost per block: a few microseconds.', parts: [G({ APP: 'ok', CPU: 'ok' }, { 'APP-CPU': 'ok' }, { APP: 'data ready' })] });
      } else {
        f.push({ narr: 'No DMA: the kernel tells the controller to read the block, then the CPU must <b>poll</b> the status register until "ready".', parts: [G({ CPU: 'cur', DEV: 'cur' }, { 'CPU-DMA': 'ok', 'DMA-DEV': 'ok' }, { CPU: 'polling status' })] });
        f.push({ narr: 'The CPU reads the data <b>word by word</b> from the controller and stores each word into RAM: 512 words for a 4 KB block at 8 bytes. Nothing else runs on this core.', parts: [G({ CPU: 'bad', RAM: 'cur' }, { 'DEV-RAM': 'ok', 'DEV-CPU': 'ok' }, { CPU: '100% busy copying', RAM: 'filling' })] });
        f.push({ narr: 'Block fully copied. Same trip again for the next block: this is why PIO is unusable for fast disks and NICs.', parts: [G({ RAM: 'ok' }, {}, { CPU: 'still busy' })] });
        f.push({ narr: 'Finally the kernel copies from the page cache to the app buffer and returns. Total CPU time was wasted moving bytes the device could have placed itself.', parts: [G({ APP: 'ok', CPU: 'ok' }, { 'APP-CPU': 'ok' }, { APP: 'data ready' })] });
      }
      f.push({ narr: dma ? 'DMA summary: CPU does setup + one interrupt; bytes move device → RAM on their own. Try "pio" to compare.' : 'PIO summary: CPU is the data mover for every word. Try "dma" to see the difference.', parts: [{ type: 'vars', vals: { mode: m.toUpperCase(), cpuMovesData: !dma, interruptsPerBlock: dma ? 1 : 'polling' }, hl: { mode: 'sel' } }] });
      return f;
    }
  },
  examples: [
    { title: 'Why NVMe is fast', html: `<p>Host and SSD share memory-resident <b>submission/completion queues</b>. The driver writes a command, rings a doorbell (one MMIO write); the SSD DMAs the command, executes it and DMAs the data and a completion entry into RAM. 64K queues allow one per CPU core with no locks.</p>` },
    { title: 'Network receive and interrupt coalescing', html: `<p>At 10 Gb/s a NIC can get ~800,000 packets/s of 1.5 KB. One interrupt per packet would swamp the CPU. NICs DMA packets into a ring buffer in RAM and interrupt once per batch (coalescing); Linux <b>NAPI</b> switches to polling under load. This is the same hybrid idea as epoll.</p>` },
    { title: 'Bounce buffers', html: `<p>A device that can only DMA to the low 4 GB of RAM cannot target a buffer at 6 GB. The kernel allocates a bounce buffer below 4 GB, DMAs there, then copies. An IOMMU removes this limit by remapping device addresses.</p>` }
  ],
  deepDive: `<p><b>Cache coherence.</b> On x86, DMA is cache-coherent (the memory controller snoops CPU caches). On many ARM systems it is not, so drivers use the DMA API (<code>dma_map_single</code>, <code>dma_sync_*</code>) to flush/invalidate. Mapping a user buffer for DMA requires <b>pinning</b> its pages so they cannot be swapped or moved during the transfer.</p>
  <p><b>Scatter-gather.</b> A buffer spread over many physical pages is described to the device as a list of (address, length) segments, so the CPU does not have to copy into one contiguous buffer. This also enables vectored I/O (<code>readv/writev</code>).</p>
  <p><b>Zero-copy paths.</b> Classic file-to-socket: disk → (DMA) page cache → (CPU) user buffer → (CPU) socket buffer → (DMA) NIC: 4 copies, 2 of them by the CPU and 4 context switches. <code>sendfile</code>/<code>splice</code>: disk → page cache → NIC (gather DMA): 2 DMA copies and zero CPU copies. <code>mmap</code> removes one copy; <code>MSG_ZEROCOPY</code> and <code>io_uring</code> registered buffers extend the idea. <b>RDMA</b> and <b>GPUDirect</b> let a NIC or SSD DMA directly into GPU or remote memory, bypassing the CPU completely.</p>
  <p><b>Security.</b> A malicious or buggy DMA device can read or write all of RAM (the "DMA attack": Thunderclap, malicious Thunderbolt peripherals). IOMMU (Intel VT-d, AMD-Vi, ARM SMMU) restricts each device to its mapped pages; it is also what enables safe PCIe passthrough to VMs.</p>
  <p><b>Polling returns.</b> At NVMe speeds (µs latency) interrupt overhead (~2-5 µs with context switch) is comparable to the I/O itself, so Linux supports hybrid polling and io_uring's IOPOLL; DPDK and SPDK poll in user space and skip interrupts altogether.</p>`,
  aiEra: `<p><b>What AI changes:</b> an 8-GPU server moves tens of GB/s between NVMe, NICs and GPU memory. <b>GPUDirect Storage</b> DMAs from NVMe straight into GPU memory, skipping the CPU bounce buffer; <b>GPUDirect RDMA</b> and InfiniBand/RoCE let gradient tensors flow GPU-to-GPU across machines without CPU copies. DPUs/SmartNICs offload storage and networking stacks entirely.</p>
  <p><b>Work with AI:</b> ask it to count copies and context switches for four file-serving designs (read+write, mmap+write, sendfile, io_uring), then validate against the diagram logic here.</p>
  <p><b>Where AI goes wrong:</b> it says DMA means "no copies at all" (the final copy_to_user remains), forgets the completion interrupt, or claims sendfile works for any fd pair on every OS.</p>
  <p><b>You must still own:</b> the step list of a read, where CPU copies still occur, and when polling beats interrupts.</p>`,
  problems: [{
    title: 'Copies and Context Switches in a File Server',
    level: 'Medium', tags: ['DMA', 'zero-copy'], companies: ['Netflix', 'Cloudflare'],
    statement: `<p>A server serves a static file with <code>read(file, buf); write(sock, buf)</code>. Count DMA copies, CPU copies and user/kernel mode switches. Then repeat for <code>sendfile(sock, file)</code>. Which is faster and why?</p>`,
    constraints: `Assume the file is not in the page cache and the NIC supports scatter-gather DMA.`,
    example: `${H.table(['Design', 'DMA copies', 'CPU copies', 'Mode switches'], [['read + write', '2', '2', '4'], ['sendfile', '2', '0', '2']])}`,
    brute: { why: `<p>read + write: disk → (DMA) page cache → (CPU) user buf → (CPU) socket buffer → (DMA) NIC. The two CPU copies consume memory bandwidth and CPU cycles and pollute CPU caches for data the app never inspects.</p>` },
    mcq: { q: 'What does DMA remove from the data path?', options: ['The CPU moving bytes between device and RAM', 'All kernel buffers', 'All interrupts', 'The need for a file system'], answer: 0, explain: 'The device writes RAM directly; interrupts and buffers still exist.' },
    hints: [`<p>Hint 1: draw boxes disk, page cache, user buffer, socket buffer, NIC.</p>`, `<p>Hint 2: label each arrow DMA or CPU.</p>`, `<p>Hint 3: each syscall = 2 mode switches (enter + exit).</p>`],
    solution: {
      approach: `<p>read+write path: (1) DMA disk → page cache, (2) CPU copy page cache → user buffer in read(), (3) CPU copy user buffer → socket buffer in write(), (4) DMA socket buffer → NIC. That is 2 DMA and 2 CPU copies, and 4 mode switches (two syscalls × enter/exit). sendfile path: (1) DMA disk → page cache, (2) DMA page cache → NIC using scatter-gather (only descriptors, not bytes, are appended to the socket), so 2 DMA copies, 0 CPU copies and 2 mode switches. sendfile is faster because it saves two CPU copies (memory bandwidth, cache pollution) and two mode switches, and the app never touches the data. It cannot be used when the app must transform the data (TLS in userspace, compression); kernel TLS (kTLS) restores it for HTTPS.</p>`,
      dry: { head: ['Step', 'read + write', 'sendfile'], rows: [['disk → page cache', 'DMA', 'DMA'], ['page cache → user buf', 'CPU copy', '—'], ['user buf → socket buf', 'CPU copy', '— (descriptors only)'], ['socket → NIC', 'DMA', 'DMA gather'], ['mode switches', '4', '2']] },
      complexity: `<p>Both O(bytes); sendfile removes two memory-bandwidth-bound passes.</p>`
    }
  }]
});
// =====================================================================
// QUIZ
// =====================================================================
function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
Q('What does an inode NOT store?', ['File owner and permissions', 'Pointers to data blocks', 'The file name', 'Link count'], 2, 'File names live in directory entries (name → inode number). The inode holds metadata and block pointers.');
Q('4 KB blocks, 4-byte pointers, 12 direct + single + double + triple indirect. Maximum file size is about…', ['4 GB', '4 TB', '48 KB', '4 PB'], 1, 'K = 1024. Triple indirect = 1024³ × 4 KB = 4 TB, which dominates the total (plus 4 GB + 4 MB + 48 KB).');
Q('You hard-link b to a, then delete a. What happens to b?', ['It becomes dangling', 'It still reads the data (link count 2 → 1)', 'It is deleted too', 'It becomes a symlink'], 1, 'Both names point to the same inode. The data is freed only when the link count reaches 0.');
Q('A symbolic link stores…', ['The inode number of the target', 'The path string of the target', 'A copy of the data', 'The block pointers of the target'], 1, 'A symlink is a tiny file whose content is the target path; it breaks if that path disappears.');
Q('Which allocation method suffers from external fragmentation?', ['Contiguous', 'Linked', 'Indexed', 'FAT'], 0, 'Contiguous needs one long free run, which gets fragmented as files come and go.');
Q('Why does a journal commit record exist?', ['To compress the log', 'To mark a transaction as complete so recovery knows to replay it', 'To encrypt metadata', 'To speed up reads'], 1, 'Recovery replays only committed transactions; incomplete ones are discarded, keeping the file system consistent.');
Q('Disk head at 53 and requests 98 183 37 122 14 124 65 67. Total head movement for FCFS is…', ['236', '331', '640', '299'], 2, '45+85+146+85+108+110+59+2 = 640.');
Q('Which scheduling algorithm can starve far-away requests?', ['SCAN', 'C-SCAN', 'SSTF', 'LOOK'], 2, 'SSTF always picks the nearest request, so a steady flow of nearby requests can postpone a distant one forever.');
Q('Four 2 TB disks in RAID 5 give usable capacity of…', ['8 TB', '6 TB', '4 TB', '2 TB'], 1, '(n − 1) × S = 3 × 2 TB = 6 TB.');
Q('RAID 6 tolerates how many simultaneous disk failures?', ['0', '1', '2', 'n/2 always'], 2, 'Two independent parities (P and Q) let it solve for two missing blocks.');
Q('In RAID 5 the lost block is rebuilt by…', ['Copying from a mirror', 'XOR of all surviving blocks of the stripe (data + parity)', 'Reading the journal', 'Re-running fsck'], 1, 'Because a ⊕ a = 0, XOR of the remaining blocks yields the missing one.');
Q('write() returned success but the machine lost power 2 seconds later. The data may be lost because…', ['write() is always asynchronous to the disk platter by design of the hardware only', 'it sits in the page cache until flushed (no fsync was called)', 'journals delete recent data', 'RAID parity was stale'], 1, 'write() copies into the page cache; fsync is needed to force it to stable storage.');
Q('epoll is best described as…', ['Blocking, synchronous I/O', 'Readiness-notification multiplexing (you still do the read)', 'True asynchronous completion I/O', 'Direct memory access'], 1, 'epoll tells you an fd is ready; you perform the read, so the copy is still synchronous. io_uring/IOCP are completion-based.');
Q('What is the main benefit of DMA?', ['The CPU does not copy each word between device and RAM', 'It removes the page cache', 'It eliminates interrupts entirely', 'It makes disks faster'], 0, 'DMA moves blocks directly; the CPU only sets it up and handles one completion interrupt.');
Q('Which journaling mode can leave a file containing stale garbage after a crash although the file system structure is consistent?', ['journal (full data)', 'ordered', 'writeback', 'none of them'], 2, 'Writeback does not order data before metadata commit, so metadata can point at blocks whose new data never landed.');

// =====================================================================
// INTERVIEW
// =====================================================================
function IV(q, level, a, f) { interview.push({ q: q, level: level, a: a, followUps: f }); }
IV('What is an inode and what does it contain? Where is the file name stored?', 'B', `<p>An inode is the on-disk record that describes one file: type, permissions, owner, size, timestamps, link count and pointers to the data blocks. It does <b>not</b> contain the name. The name is an entry in a directory, which is itself a file mapping <code>name → inode number</code>. That separation is what makes hard links and atomic rename possible, and why <code>ls -i</code> can show the same inode under two names.</p>`, ['How does path lookup of /a/b/c work?', 'What is the dentry cache?']);
IV('Compute the maximum file size with 12 direct pointers, single/double/triple indirect, 4 KB blocks and 4-byte pointers.', 'I', `<p>K = 4096/4 = 1024 pointers per block. Direct: 12 × 4 KB = 48 KB. Single: 1024 × 4 KB = 4 MB. Double: 1024² × 4 KB = 4 GB. Triple: 1024³ × 4 KB = 4 TB. Total ≈ 4 TB + 4 GB + 4 MB + 48 KB. Each level multiplies reach by K, so the triple term dominates. Real ext2/3 hit lower limits from 32-bit fields, and ext4 uses extents instead.</p>`, ['What changes with 8-byte pointers?', 'How many disk reads to read the last byte cold?']);
IV('Hard link vs symbolic link: what happens to each when you delete the original?', 'B', `<p>A hard link is another directory entry for the same inode, so after <code>rm original</code> the link count drops from 2 to 1 and the data stays readable through the other name. A symlink is a separate file containing the original path; after deletion that path no longer resolves and the symlink dangles (ENOENT). Hard links cannot cross file systems or (normally) point to directories; symlinks can do both.</p>`, ['Why are directory hard links prohibited?', 'How does a process keep a deleted file alive?']);
IV('Compare contiguous, linked and indexed allocation. What does FAT change?', 'I', `<p>Contiguous gives the fastest sequential and random access (just arithmetic) but suffers external fragmentation and hard growth. Linked has no external fragmentation but random access walks the chain from the start, and one corrupt pointer loses the tail. Indexed keeps a block list (index block or inode) so random access costs the index lookup plus the data block, at the price of index overhead for small files. FAT is linked allocation with all next-pointers moved into one table that is cached in memory, so chain walks happen in RAM.</p>`, ['Which does ext4 use today?', 'How big is a bitmap for a 1 TB disk with 4 KB blocks?']);
IV('Explain journaling. What happens on a crash at each stage of a transaction?', 'I', `<p>Journaling writes intended changes to a log first (write-ahead), then a commit record, then copies them to their real locations (checkpoint). Crash before the commit record: the transaction is incomplete and discarded, so the disk shows the old state. Crash after the commit: recovery replays the logged blocks (idempotent), so the new state appears. Recovery cost depends on journal size, not disk size, unlike fsck. It protects metadata consistency, not necessarily the latest data.</p>`, ['Metadata vs data journaling?', 'Why does the commit need a barrier/flush?', 'How do copy-on-write file systems differ?']);
IV('Explain ext4 data=ordered vs writeback vs journal modes.', 'A', `<p>In <b>journal</b> mode both data and metadata go through the journal: safest, but data is written twice. <b>Ordered</b> (default) journals only metadata but forces data blocks to disk before committing the metadata that references them, so a file never exposes stale or garbage blocks. <b>Writeback</b> journals metadata only with no ordering against data, giving the best speed but allowing files to contain old or zero data after a crash. All three keep the structure consistent; none gives application durability without fsync.</p>`, ['What does delayed allocation add to the risk?', 'Why do databases bring their own WAL?']);
IV('Walk through FCFS, SSTF, SCAN, C-SCAN and LOOK for head 53 and queue 98 183 37 122 14 124 65 67.', 'I', `<p>FCFS: 53→98→183→37→122→14→124→65→67 = 640. SSTF: 65, 67, 37, 14, 98, 122, 124, 183 = 236. SCAN (moving up): …183, to 199, then 37, 14 = 146 + 185 = 331. C-SCAN: up to 199, jump to 0, then 14, 37 = 146 + 199 + 37 = 382 (counting the jump). LOOK: turn at 183: 130 + 169 = 299. C-LOOK: 130 + 169 + 23 = 322. State the convention for jumps and edges.</p>`, ['Which one starves?', 'Which gives the most uniform wait?', 'Does this matter on SSDs?']);
IV('Why is seek-based disk scheduling less relevant on SSDs and with NCQ?', 'A', `<p>SSDs have no moving head, so access time is nearly independent of address; ordering by cylinder buys nothing. Even on HDDs, the drive firmware reorders queued commands (NCQ) using real geometry and rotational position that the OS cannot see (LBAs are remapped). So Linux uses simple schedulers: <code>none</code> for NVMe, <code>mq-deadline</code> for deadlines and starvation control, <code>bfq</code> for fairness. What matters on SSDs is queue depth and parallelism across NAND channels.</p>`, ['What is request merging?', 'How does mq-deadline avoid starvation?']);
IV('Describe RAID 0, 1, 5, 6 and 10: capacity and fault tolerance for n disks.', 'I', `<p>RAID 0 stripes with capacity n·S and no fault tolerance. RAID 1 mirrors: capacity S for 2 disks and survives one failure. RAID 5 stripes with one rotating parity: (n−1)·S, survives one failure. RAID 6 has two parities (P and Q): (n−2)·S, survives two failures. RAID 10 stripes across mirrored pairs: n/2·S, survives one failure per pair. RAID 5/6 have write penalties (4 and 6 I/Os for a small write); RAID 10 is better for random writes.</p>`, ['Why did RAID 5 become risky with big disks?', 'RAID 10 vs RAID 0+1?']);
IV('How is a failed disk rebuilt in RAID 5? Show it with an example.', 'I', `<p>Parity P = D0 ⊕ D1 ⊕ D2 per stripe. Since XOR is self-inverse, any missing block equals the XOR of all the remaining blocks in the stripe, parity included. Example: D0=101, D2=110, P=000 so D1 = 101 ⊕ 110 ⊕ 000 = 011. The rebuild reads every surviving disk end to end and writes the replacement, so it takes hours and stresses the other disks, while a second failure or an unrecoverable read error in that window loses data.</p>`, ['How does a small write update parity without reading all disks?', 'What is the write hole?']);
IV('What does fsync do and why is write() not enough? How do you replace a file atomically and durably?', 'A', `<p>write() copies data into the kernel page cache and returns; the data reaches disk later. fsync blocks until the file's data and needed metadata are on stable storage and the device cache is flushed. For an atomic durable replace: write to a temp file in the same directory, fsync it, rename over the target (atomic on POSIX), then fsync the directory so the rename survives a crash. Also check fsync/close return values; errors there mean lost data.</p>`, ['fsync vs fdatasync vs O_DIRECT?', 'What was fsyncgate?', 'Why does group commit help?']);
IV('Explain blocking, non-blocking, multiplexed and asynchronous I/O. Is epoll asynchronous?', 'A', `<p>Blocking: the call sleeps until done. Non-blocking: returns EAGAIN if not ready, so you must retry. Multiplexing (select/poll/epoll): one thread blocks on many fds and is told which are ready, then performs the read itself. Asynchronous (io_uring, IOCP): you submit an operation and get a completion event with data already in your buffer. epoll is readiness-based and the copy is synchronous, so strictly it is not async I/O; it scales C10K but regular files are always "ready", which is what io_uring fixes.</p>`, ['edge-triggered vs level-triggered?', 'How does Node handle file I/O?']);
IV('What is DMA and walk through what happens when a process calls read() on a file that is not cached.', 'A', `<p>DMA lets a device move blocks to or from RAM without the CPU copying each word. For read(): trap into the kernel, VFS maps offset to a block, page-cache miss, block layer queues a request, the driver programs the device, the thread sleeps, the device DMAs the block into a page-cache page, raises one interrupt, the handler wakes the thread, and the kernel copies from the page cache to the user buffer with copy_to_user. DMA removes the CPU copy from device to RAM; sendfile or mmap can remove the last copy as well.</p>`, ['Why do we need an IOMMU?', 'What is interrupt coalescing / NAPI?', 'What does GPUDirect Storage change?']);
IV('Design the storage layout for a database server: which RAID level, file system mode and fsync strategy would you pick and why?', 'E', `<p>For a write-heavy OLTP database: RAID 10 on NVMe/SSDs with power-loss protection (small random writes without a parity penalty, fast rebuild), ext4/XFS with metadata journaling in ordered mode, and the database's own WAL on a separate fast device with fsync/fdatasync per commit using group commit. Use O_DIRECT or a tuned buffer pool to avoid double caching, check fsync errors fatally, and test power-loss behaviour. RAID is not backup: add replication and point-in-time recovery from WAL archives.</p>`, ['What if the workload is read-mostly archive?', 'How do you verify the disks honor flushes?']);
// =====================================================================
// PRACTICE
// =====================================================================
function PR(o) {
  practice.push({
    title: o.title, level: o.level, tags: o.tags, companies: o.companies,
    statement: o.statement, constraints: o.constraints || `Show the arithmetic; state any convention you assume.`,
    example: o.example,
    brute: { why: o.brute },
    mcq: o.mcq,
    hints: o.hints,
    solution: { approach: o.approach, dry: o.dry, complexity: o.complexity || `<p>Constant-time arithmetic or a single pass over the request list.</p>`, followUps: o.followUps }
  });
}

// ---------------- EASY ----------------
PR({ title: 'Max File Size, Single Indirect Only', level: 'Easy', tags: ['inode', 'math'], companies: ['TCS', 'Infosys'],
  statement: `<p>An inode has <b>10 direct</b> pointers and <b>one single-indirect</b> pointer. Block size is <b>1 KB</b>, pointer size <b>4 bytes</b>. What is the maximum file size?</p>`,
  example: `<p>K = 1024/4 = 256. Direct 10 KB + single 256 KB = <b>266 KB</b>.</p>`,
  brute: `<p>Multiplying 11 pointers by 1 KB gives 11 KB. That forgets that the indirect pointer leads to a block of 256 more pointers.</p>`,
  mcq: { q: 'What decides the number of pointers per indirect block?', options: ['block size / pointer size', 'pointer size / block size', 'number of direct pointers', 'file size'], answer: 0, explain: 'One block of B bytes holds B/P pointers of P bytes.' },
  hints: [`<p>Hint 1: compute K = B/P.</p>`, `<p>Hint 2: direct blocks give 10 × 1 KB.</p>`, `<p>Hint 3: add the single-indirect reach K × 1 KB.</p>`],
  approach: `<p>Pointers per indirect block K = 1024 B / 4 B = 256. Direct part: 10 blocks × 1 KB = 10 KB. Single indirect: the one pointer leads to a block of 256 pointers, so 256 data blocks × 1 KB = 256 KB. Total maximum = 10 KB + 256 KB = <b>266 KB</b> (266 data blocks plus one index block of overhead). Reading a byte beyond 10 KB needs one extra disk read for the pointer block.</p>`,
  dry: { head: ['Part', 'Blocks', 'Size'], rows: [['direct', '10', '10 KB'], ['single', '256', '256 KB'], ['total', '266', '266 KB']] },
  followUps: ['Add a double-indirect pointer: new max?'] });

PR({ title: 'Delete the Original: Hard vs Soft', level: 'Easy', tags: ['links'], companies: ['Amazon'],
  statement: `<p>Commands run in order: <code>echo hi &gt; a</code>, <code>ln a h</code>, <code>ln -s a s</code>, <code>rm a</code>. What do <code>cat h</code> and <code>cat s</code> print? What is the link count of the inode afterwards? What if you now create a new file <code>a</code> containing "new" and run <code>cat s</code>?</p>`,
  example: `<p><code>cat h</code> → <span class="c-g">hi</span>. <code>cat s</code> → <span class="c-r">No such file or directory</span>. Link count 1. After recreating a: <code>cat s</code> → new.</p>`,
  brute: `<p>Saying "both links keep working because the data still exists" ignores that a symlink stores only the path "a", not the inode.</p>`,
  mcq: { q: 'What does a symlink point at?', options: ['An inode', 'A path name', 'A data block', 'A hard link count'], answer: 1, explain: 'A symlink contains a path string resolved at access time.' },
  hints: [`<p>Hint 1: hard link = second name for the same inode.</p>`, `<p>Hint 2: rm removes one name and decrements the count.</p>`, `<p>Hint 3: a symlink resolves its stored path every time it is opened.</p>`],
  approach: `<p>After <code>ln a h</code> the inode has link count 2 (names a and h). <code>ln -s a s</code> creates a separate inode holding the text "a"; the original inode's count stays 2. <code>rm a</code> removes the name a, lowering the count to 1, so the data survives and <code>cat h</code> prints "hi". <code>cat s</code> reads the text "a", looks up a in the current directory, finds nothing and fails with ENOENT because the symlink is dangling. If a new file named a is created later, the symlink resolves to that new file and prints "new": symlinks are bound to names, hard links to inodes.</p>`,
  dry: { head: ['Command', 'Names → inode', 'Inode link count'], rows: [['echo hi > a', 'a → 7', '1'], ['ln a h', 'a, h → 7', '2'], ['ln -s a s', 's → 9 (text "a")', '2'], ['rm a', 'h → 7; s dangling', '1']] } });

PR({ title: 'FCFS Head Movement', level: 'Easy', tags: ['disk scheduling'], companies: ['Wipro', 'Cognizant'],
  statement: `<p>Head at cylinder <b>50</b>, disk 0 to 199. Requests in arrival order: <b>82, 170, 43, 140, 24, 16, 190</b>. Total head movement with FCFS?</p>`,
  example: `<p>32 + 88 + 127 + 97 + 116 + 8 + 174 = <b>642</b>.</p>`,
  brute: `<p>Sorting requests first is a different algorithm. FCFS must follow arrival order, which is what creates the long zig-zags.</p>`,
  mcq: { q: 'FCFS disk scheduling is…', options: ['Fair but can have long total seek', 'Optimal in total seek', 'Starvation-prone', 'Elevator based'], answer: 0, explain: 'Serving in arrival order is fair and simple but ignores head position.' },
  hints: [`<p>Hint 1: start at the head position 50.</p>`, `<p>Hint 2: add |next − current| for each request in order.</p>`, `<p>Hint 3: double-check the big jumps 190→... and 170→43.</p>`],
  approach: `<p>FCFS processes requests exactly in the given order, so we sum absolute differences along 50 → 82 → 170 → 43 → 140 → 24 → 16 → 190. The moves are |82−50| = 32, |170−82| = 88, |43−170| = 127, |140−43| = 97, |24−140| = 116, |16−24| = 8, |190−16| = 174. Adding them: 32 + 88 = 120, + 127 = 247, + 97 = 344, + 116 = 460, + 8 = 468, + 174 = 642 cylinders. The average per request is 642/7 ≈ 91.7 cylinders, which is poor because the head keeps swinging across the disk.</p>`,
  dry: { head: ['From → To', 'Distance', 'Running total'], rows: [['50 → 82', '32', '32'], ['82 → 170', '88', '120'], ['170 → 43', '127', '247'], ['43 → 140', '97', '344'], ['140 → 24', '116', '460'], ['24 → 16', '8', '468'], ['16 → 190', '174', '642']] } });

PR({ title: 'RAID Capacity Table', level: 'Easy', tags: ['RAID'], companies: ['HPE', 'Dell'],
  statement: `<p>You have six 4 TB disks. Give usable capacity and the number of disk failures survived (worst case) for RAID 0, RAID 5, RAID 6 and RAID 10.</p>`,
  example: `${H.table(['Level', 'Usable', 'Survives'], [['0', '24 TB', '0'], ['5', '20 TB', '1'], ['6', '16 TB', '2'], ['10', '12 TB', '1 (guaranteed)']])}`,
  brute: `<p>Assuming every level loses the same fraction (say, always half) ignores that parity RAID loses only 1 or 2 disks of space and mirroring loses half.</p>`,
  mcq: { q: 'Which level has the lowest usable capacity with 6 disks?', options: ['RAID 0', 'RAID 5', 'RAID 6', 'RAID 10'], answer: 3, explain: 'RAID 10 gives n/2 = 3 disks = 12 TB, less than RAID 5 (20) and RAID 6 (16).' },
  hints: [`<p>Hint 1: RAID 0 uses all n disks.</p>`, `<p>Hint 2: parity costs 1 (RAID 5) or 2 (RAID 6) disks of space.</p>`, `<p>Hint 3: mirroring halves capacity.</p>`],
  approach: `<p>RAID 0 stripes with no redundancy: 6 × 4 = 24 TB, survives 0 failures. RAID 5 gives up one disk's worth for rotating parity: (6−1) × 4 = 20 TB, survives 1. RAID 6 gives up two disks: (6−2) × 4 = 16 TB, survives any 2. RAID 10 pairs the disks into 3 mirrors and stripes across them: 3 × 4 = 12 TB; it is guaranteed to survive one failure, and up to three if each failure hits a different mirror pair, but two failures in the same pair lose the array. Choose RAID 10 for random-write performance, RAID 6 for large archives and RAID 5 only for small, quick-rebuild sets.</p>`,
  dry: { head: ['Level', 'Formula', 'Usable', 'Worst-case failures'], rows: [['0', 'n × S', '24 TB', '0'], ['5', '(n−1) × S', '20 TB', '1'], ['6', '(n−2) × S', '16 TB', '2'], ['10', '(n/2) × S', '12 TB', '1']] } });

// ---------------- MEDIUM ----------------
PR({ title: 'SSTF, SCAN and LOOK on One Queue', level: 'Medium', tags: ['disk scheduling'], companies: ['Oracle', 'Samsung'],
  statement: `<p>Head at <b>50</b> moving up, disk 0 to 199, queue <b>82, 170, 43, 140, 24, 16, 190</b>. Find the service order and total movement for SSTF, SCAN and LOOK.</p>`,
  example: `<p>SSTF order 43 24 16 82 140 170 190 = <b>208</b>. SCAN: 82 140 170 190 (199) 43 24 16 = <b>332</b>. LOOK = <b>314</b>.</p>`,
  brute: `<p>Computing only FCFS (642) wastes the chance to cut movement: the head crosses the disk four times for no reason.</p>`,
  mcq: { q: 'LOOK differs from SCAN because it…', options: ['Reverses at the last request instead of the disk edge', 'Never reverses', 'Serves requests randomly', 'Uses a priority queue'], answer: 0, explain: 'LOOK turns around at the furthest pending request.' },
  hints: [`<p>Hint 1: sort: below 50 → 16, 24, 43; above → 82, 140, 170, 190.</p>`, `<p>Hint 2: SSTF repeatedly picks the nearest.</p>`, `<p>Hint 3: SCAN adds the trip to 199, LOOK stops at 190.</p>`],
  approach: `<p>SSTF: from 50 the nearest is 43 (7), then 24 (19), 16 (8); from 16 the nearest is 82 (66), then 140 (58), 170 (30), 190 (20): total 7+19+8+66+58+30+20 = 208. SCAN moving up: 50→82→140→170→190 then continue to 199, reverse and serve 43, 24, 16: (199−50) + (199−16) = 149 + 183 = 332. LOOK reverses at 190: (190−50) + (190−16) = 140 + 174 = 314. SSTF wins on raw movement but may starve; LOOK beats SCAN by skipping the useless trip to the edge (9 + 9 = 18 cylinders).</p>`,
  dry: { head: ['Algorithm', 'Order', 'Total'], rows: [['SSTF', '43 24 16 82 140 170 190', '208'], ['SCAN', '82 140 170 190 → 199 → 43 24 16', '332'], ['LOOK', '82 140 170 190 → 43 24 16', '314']] } });

PR({ title: 'Reads to Reach Block 100', level: 'Medium', tags: ['allocation', 'inode'], companies: ['Microsoft'],
  statement: `<p>Count the disk reads needed to read data block number 100 of a file (blocks numbered from 0) under (a) contiguous, (b) linked (pointer inside each block), (c) FAT with the table cached in RAM, (d) Unix inode with 12 direct pointers and 1024-entry indirect blocks. Assume the inode/directory entry is already in memory and nothing else is cached.</p>`,
  example: `<p>(a) 1, (b) 101, (c) 1, (d) 2 (single-indirect block + data block).</p>`,
  brute: `<p>Assuming all methods cost 1 read ignores the pointer-chasing of linked allocation and the extra indirect-block read in inodes.</p>`,
  mcq: { q: 'Block 100 in a 12-direct inode lives in…', options: ['a direct pointer', 'the single-indirect tree', 'the double-indirect tree', 'the triple-indirect tree'], answer: 1, explain: 'Blocks 0..11 are direct; 12..1035 are single-indirect with 1024-entry blocks.' },
  hints: [`<p>Hint 1: contiguous = start + 100, one read.</p>`, `<p>Hint 2: linked must read blocks 0..100 in order to learn pointers.</p>`, `<p>Hint 3: FAT chain walking is memory only; inode: block 100 − 12 = 88 inside the single-indirect.</p>`],
  approach: `<p>(a) Contiguous: address = start + 100, 1 disk read. (b) Linked: each block holds only the pointer to the next, so blocks 0 to 99 must be read to find block 100's address, then block 100 itself: 101 reads. (c) FAT: walking 100 entries happens in the cached table (memory), then 1 disk read of the data block. (d) Inode: block 100 is beyond the 12 direct pointers; 100 − 12 = 88 is inside the first 1024-entry single-indirect block, so we read that pointer block (1 read) and then the data block (1 read) = 2 reads, or 1 if the pointer block is cached. This is why random access in big files prefers indexed schemes.</p>`,
  dry: { head: ['Method', 'Walk cost', 'Disk reads'], rows: [['contiguous', 'arithmetic', '1'], ['linked', '100 pointer blocks', '101'], ['FAT (cached)', '100 RAM lookups', '1'], ['inode', 'indirect block', '2']] } });

PR({ title: 'Bitmap and Index Overhead', level: 'Medium', tags: ['bitmap', 'math'], companies: ['VMware'],
  statement: `<p>A 2 TB file system uses 4 KB blocks. (a) Size of the free-space bitmap. (b) With a free-list that stores a 4-byte block number for every free block on an empty disk, how large is it? (c) Which is better and when?</p>`,
  example: `<p>Blocks = 2<sup>41</sup>/2<sup>12</sup> = 2<sup>29</sup>. Bitmap = 2<sup>29</sup> bits = <b>64 MB</b>. Free-list = 2<sup>29</sup> × 4 B = <b>2 GB</b>.</p>`,
  brute: `<p>Keeping one inode-like record per free block (tens of bytes each) would cost tens of GB and make allocation slow.</p>`,
  mcq: { q: 'A bitmap uses how many bits per block?', options: ['1', '8', '32', '64'], answer: 0, explain: 'One bit marks used or free.' },
  hints: [`<p>Hint 1: blocks = size / block size.</p>`, `<p>Hint 2: bitmap bytes = blocks / 8.</p>`, `<p>Hint 3: free list size scales with the number of free blocks.</p>`],
  approach: `<p>2 TB = 2<sup>41</sup> bytes; 4 KB = 2<sup>12</sup>; so blocks = 2<sup>29</sup> = 536,870,912. Bitmap: one bit per block = 2<sup>29</sup> bits = 2<sup>26</sup> bytes = 64 MB regardless of how full the disk is. Free-list of 4-byte numbers on an empty disk: 2<sup>29</sup> × 4 = 2<sup>31</sup> bytes = 2 GB, which shrinks as the disk fills. The bitmap is a fixed 64 MB (cacheable per block group), supports finding runs of contiguous free blocks quickly, and is better unless the disk is almost full, where the free-list gets smaller; modern systems use per-group bitmaps or B-tree extents of free space.</p>`,
  dry: { head: ['Item', 'Value'], rows: [['blocks', '2^29'], ['bitmap', '2^29 bits = 64 MB'], ['free list (empty disk)', '2^29 × 4 B = 2 GB']] } });

PR({ title: 'Choose a Journaling Mode', level: 'Medium', tags: ['journaling'], companies: ['Red Hat'],
  statement: `<p>For each workload choose ext4 <code>journal</code>, <code>ordered</code> or <code>writeback</code> and justify: (1) a build farm with disposable output, (2) a mail spool where users must never see another user's old data in new files, (3) a small config store where file contents must match after a crash.</p>`,
  example: `<p>(1) writeback, (2) ordered, (3) journal (or ordered plus fsync with the atomic-rename recipe).</p>`,
  brute: `<p>"Always use full data journal" doubles every data write and slows a build farm by up to 2× for no real benefit.</p>`,
  mcq: { q: 'Which mode writes data blocks before committing metadata but does not journal the data?', options: ['journal', 'ordered', 'writeback', 'none'], answer: 1, explain: 'Ordered mode orders data before the metadata commit without logging data.' },
  hints: [`<p>Hint 1: ask what is the cost of losing or garbling data.</p>`, `<p>Hint 2: stale data exposure is a security issue.</p>`, `<p>Hint 3: for exact contents prefer an application-level atomic update.</p>`],
  approach: `<p>(1) Build output can be regenerated, so choose writeback for speed; the file system structure stays consistent, and after a crash you simply rebuild. (2) Mail spool: ordered mode makes data reach disk before the metadata that exposes it, so a crash cannot reveal old blocks of other users inside new files. (3) For small configs where exact contents matter, full data journaling guarantees metadata and data are replayed together, though the best portable answer is the application recipe: write a temp file, fsync it, rename it, fsync the directory, which works in every mode. Remember none of the modes make unsynced writes durable.</p>`,
  dry: { head: ['Workload', 'Mode', 'Reason'], rows: [['build farm', 'writeback', 'fastest, output disposable'], ['mail spool', 'ordered', 'no stale-data exposure'], ['config store', 'journal / atomic rename', 'data and metadata consistent']] } });

PR({ title: 'RAID 5 Small Write', level: 'Medium', tags: ['RAID', 'parity'], companies: ['NetApp'],
  statement: `<p>In a 5-disk RAID 5, an application overwrites one 4 KB block. Count the disk I/Os, give the new parity formula, and compare with RAID 10 and RAID 6. Numbers: old data 3, new data 7, old parity 5.</p>`,
  example: `<p>New parity = 5 ⊕ 3 ⊕ 7 = <b>1</b>. RAID 5: 2 reads + 2 writes = 4 I/Os.</p>`,
  brute: `<p>Reading all four other data blocks to recompute parity needs 4 reads + 2 writes = 6 I/Os and ties up every disk.</p>`,
  mcq: { q: 'RAID 6 small-write cost is…', options: ['2 I/Os', '4 I/Os', '6 I/Os', '8 I/Os'], answer: 2, explain: 'Read old data, P, Q (3) then write new data, P, Q (3).' },
  hints: [`<p>Hint 1: parity changes only by the difference between old and new data.</p>`, `<p>Hint 2: new P = old P ⊕ old D ⊕ new D.</p>`, `<p>Hint 3: count reads and writes separately.</p>`],
  approach: `<p>Read-modify-write: read the old data block (1) and the old parity block (2); compute P' = P ⊕ D ⊕ D' = 5 ⊕ 3 ⊕ 7. In binary 101 ⊕ 011 = 110; 110 ⊕ 111 = 001, so P' = 1. Then write the new data (3) and new parity (4): four I/Os for one logical write, on only two of the five disks. RAID 6 needs six I/Os because P and Q must both be updated; RAID 10 needs just two writes (one per mirror); RAID 1 also two. Full-stripe writes avoid the reads, so sequential workloads and log-structured designs hide the penalty.</p>`,
  dry: { head: ['Step', 'I/O', 'Value'], rows: [['1', 'read old D', '3'], ['2', 'read old P', '5'], ['3', 'compute P\' = 5 ^ 3 ^ 7', '1'], ['4', 'write new D, new P', '7, 1']] } });

// ---------------- HARD ----------------
PR({ title: 'Locate Byte Offset 3,000,000,000', level: 'Hard', tags: ['inode', 'math'], companies: ['Google', 'Apple'],
  statement: `<p>4 KB blocks, 4-byte pointers, 12 direct + single/double/triple indirect. For byte offset <b>3,000,000,000</b> find: the logical block number, the pointer level, the slot index in each pointer block, the offset inside the data block, and the number of cold disk reads.</p>`,
  example: `<p>Block 732,421 → double indirect; L1 slot 714, L2 slot 249; offset in block 3,584; 3 reads (L1 block, L2 block, data).</p>`,
  brute: `<p>Dividing by 4 KB and assuming a flat array of 732,421 pointers ignores the fixed 15-pointer inode: only 12 + a few indirect roots exist.</p>`,
  mcq: { q: 'After subtracting 12 direct and 1024 single-indirect blocks, the remainder is used with…', options: ['/ 1024 and % 1024 for the double-indirect slots', '/ 12', '/ 4096', 'nothing'], answer: 0, explain: 'Double indirect splits the index: first-level slot = r / K, second-level slot = r % K.' },
  hints: [`<p>Hint 1: block = ⌊offset / 4096⌋ and offset-in-block = offset mod 4096.</p>`, `<p>Hint 2: peel 12, then 1024, then compare with 1024².</p>`, `<p>Hint 3: remainder r: L1 slot = ⌊r/1024⌋, L2 slot = r mod 1024.</p>`],
  approach: `<p>Block number b = ⌊3,000,000,000 / 4096⌋ = 732,421; the offset inside the block is 3,000,000,000 − 732,421 × 4096 = 3,584. Since b ≥ 12, subtract 12: 732,409. This is ≥ 1024, so it is not in the single-indirect range; subtract 1024: 731,385. That is below 1024² = 1,048,576, so the block lives in the double-indirect tree. L1 slot = ⌊731,385 / 1024⌋ = 714 (714 × 1024 = 731,136), L2 slot = 731,385 − 731,136 = 249. Reading it cold: the inode's double-indirect pointer gives the L1 block (read 1), slot 714 gives the L2 block (read 2), slot 249 gives the data block (read 3): 3 disk reads, then take 3,584 bytes into the block.</p>`,
  dry: { head: ['Step', 'Value', 'Test'], rows: [['b = 3e9 / 4096', '732,421', '≥ 12'], ['b − 12', '732,409', '≥ 1024'], ['− 1024', '731,385', '< 1024² → double'], ['L1 slot', '714', '731,385 / 1024'], ['L2 slot', '249', '731,385 mod 1024']] } });

PR({ title: 'Durable Config Update After a Crash', level: 'Hard', tags: ['fsync', 'journaling', 'design'], companies: ['Google', 'Stripe'],
  statement: `<p>A service rewrites <code>/etc/app/config.json</code> (10 KB) on every admin change. Power can fail at any moment. Design the update procedure so that after any crash the file is either entirely the old version or entirely the new one, and list what each crash point leaves. Explain why <code>write</code> + <code>close</code> is not enough.</p>`,
  example: `<p>Recipe: write <code>config.json.tmp</code> in the same directory, <code>fsync</code> it, <code>rename</code> over the target, <code>fsync</code> the directory.</p>`,
  brute: `<p>Opening config.json with O_TRUNC and writing in place: a crash after truncate leaves an empty file, and a crash mid-write leaves a mix of old and new bytes. Even without a crash, close() does not flush.</p>`,
  mcq: { q: 'Why must the temp file be on the same file system as the target?', options: ['rename() is atomic only within one file system', 'To save space', 'fsync requires it', 'Permissions'], answer: 0, explain: 'Across file systems rename fails (EXDEV); copy + delete would not be atomic.' },
  hints: [`<p>Hint 1: you need an atomic switch; which POSIX call is atomic?</p>`, `<p>Hint 2: the new bytes must be durable before the switch.</p>`, `<p>Hint 3: the switch itself (a directory change) must be made durable too.</p>`],
  approach: `<p>Procedure: (1) create config.json.tmp in /etc/app, (2) write all 10 KB, (3) fsync the temp file so its data and inode are durable, (4) rename(tmp, config.json), which atomically replaces the directory entry, (5) fsync the directory /etc/app so the new entry is durable. Crash analysis: before step 4 completes, the old file is still intact and the stray .tmp is deleted on startup; after the rename is journaled but before the directory fsync, recovery shows either old or new (never a mix) depending on whether the journal transaction committed; after step 5 the new version is certain. Plain write plus close is insufficient because data only reaches the page cache; metadata and data can be flushed in any order, and in-place overwrites can leave torn files. Check every return value, including fsync and close, and treat failures as "update not applied".</p>`,
  dry: { head: ['Crash point', 'State on disk after reboot'], rows: [['after write, before fsync', 'old config (tmp may be partial, ignored)'], ['after fsync, before rename', 'old config, complete tmp present'], ['after rename, before dir fsync', 'old or new, never mixed'], ['after dir fsync', '<span class="c-g">new config, durable</span>']] },
  followUps: ['How would you keep a backup of the previous version?', 'What changes on a copy-on-write file system?'] });

PR({ title: 'RAID 5 Rebuild Time and URE Risk', level: 'Hard', tags: ['RAID', 'reliability'], companies: ['Dell EMC', 'Pure Storage'],
  statement: `<p>A RAID 5 array has five 8 TB disks. One fails and is replaced. Each disk streams at 150 MB/s. Disk spec: one unrecoverable read error (URE) per 10<sup>14</sup> bits. Estimate (a) rebuild time, (b) the expected number of UREs during rebuild and the probability of at least one, (c) what you would change.</p>`,
  example: `<p>(a) ≈ 14.8 hours, (b) 32 TB read = 2.56 × 10<sup>14</sup> bits → expected 2.56 UREs → P ≈ 92%, (c) RAID 6, enterprise disks, smaller arrays or erasure coding.</p>`,
  brute: `<p>"Disks are reliable, so a rebuild just works" ignores that all four survivors must be read completely and that one bad sector with no parity left means data loss for that stripe.</p>`,
  mcq: { q: 'What does RAID 6 add that helps most during rebuild?', options: ['A second parity, so a URE or second failure is still recoverable', 'Mirroring', 'Faster disks', 'A journal'], answer: 0, explain: 'With P and Q you can still reconstruct if one more block is unreadable during rebuild.' },
  hints: [`<p>Hint 1: rebuild reads in parallel; time is set by writing one 8 TB disk at 150 MB/s.</p>`, `<p>Hint 2: data read = 4 surviving disks × 8 TB.</p>`, `<p>Hint 3: P(at least one) = 1 − e<sup>−expected</sup>.</p>`],
  approach: `<p>(a) The four survivors are read in parallel while the new disk is written at 150 MB/s, so time ≈ 8 TB / 150 MB/s = 8,000,000 MB / 150 = 53,333 s ≈ 14.8 hours at full speed; in production with foreground load, it can take days. (b) The rebuild reads 4 × 8 TB = 32 TB = 2.56 × 10<sup>14</sup> bits. At one URE per 10<sup>14</sup> bits the expectation is 2.56 errors; P(at least one) = 1 − e<sup>−2.56</sup> ≈ 92%. This spec figure is pessimistic for enterprise drives (10<sup>15</sup> or 10<sup>16</sup>) but shows the risk. With no parity left, every URE destroys that stripe. (c) Use RAID 6 (or RAID-Z2), enterprise-class drives, hot spares to start rebuilds at once, scrubbing to find latent errors early, smaller arrays or erasure coding across nodes, and always keep backups.</p>`,
  dry: { head: ['Quantity', 'Calculation', 'Result'], rows: [['data read', '4 × 8 TB', '32 TB = 2.56e14 bits'], ['expected UREs', '2.56e14 / 1e14', '2.56'], ['P(≥1)', '1 − e^−2.56', '≈ 92%'], ['rebuild time', '8e6 MB / 150 MB/s', '≈ 14.8 h']] },
  followUps: ['How does scrubbing change the risk?', 'How does 10+4 erasure coding compare in overhead to RAID 6?'] });

PR({ title: 'Head Moving Down: All Six Algorithms', level: 'Hard', tags: ['disk scheduling', 'math'], companies: ['Samsung', 'Qualcomm'],
  statement: `<p>Disk cylinders 0 to 199. The head is at <b>100</b> and is currently moving <b>toward 0</b>. Queue: <b>23, 89, 132, 42, 187, 10, 150</b>. Compute total movement for FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK (count return jumps). Which is best, and what is surprising about SSTF vs SCAN?</p>`,
  example: `${H.table(['Algorithm', 'Total'], [['FCFS', '738'], ['SSTF', '286'], ['SCAN', '287'], ['C-SCAN', '366'], ['LOOK', '267'], ['C-LOOK', '322']])}`,
  brute: `<p>Reusing the "moving up" formulas flips the answer: a head moving down first serves 89, 42, 23, 10 before touching 132, 150, 187, which changes every sweep total.</p>`,
  mcq: { q: 'For head moving down, SCAN travels to…', options: ['cylinder 0, then up to the highest request', 'cylinder 199 first', 'the middle', 'the nearest request only'], answer: 0, explain: 'SCAN goes to the edge in its current direction, then reverses and sweeps back.' },
  hints: [`<p>Hint 1: split the queue: below 100 = 89, 42, 23, 10; above = 132, 150, 187.</p>`, `<p>Hint 2: mirror the problem (c → 199 − c) to reuse the "up" formulas.</p>`, `<p>Hint 3: C-SCAN down goes to 0, jumps to 199, then continues downward through 187, 150, 132.</p>`],
  approach: `<p>FCFS: |23−100| + |89−23| + |132−89| + |42−132| + |187−42| + |10−187| + |150−10| = 77+66+43+90+145+177+140 = 738. SSTF: 89 (11), 132 (43), 150 (18), 187 (37), then 42 (145), 23 (19), 10 (13): 286. SCAN down: 100→89→42→23→10→0 (100) then 0→132→150→187 (187) = 287. C-SCAN down: 100→0 (100), jump 0→199 (199), then 199→187→150→132 (67) = 366. LOOK down: 100→10 (90) then 10→187 (177) = 267. C-LOOK down: 100→10 (90), jump to 187 (177), then 187→132 (55) = 322. Best total: LOOK 267. SSTF (286) is nearly equal to SCAN (287) here because the requests happen to be clustered; SSTF however carries the starvation risk while SCAN/LOOK have bounded waits.</p>`,
  dry: { head: ['Algorithm', 'Path', 'Total'], rows: [['FCFS', '100,23,89,132,42,187,10,150', '738'], ['SSTF', '100,89,132,150,187,42,23,10', '286'], ['SCAN', '100,89,42,23,10,0,132,150,187', '287'], ['C-SCAN', '100,89,42,23,10,0,199,187,150,132', '366'], ['LOOK', '100,89,42,23,10,132,150,187', '267'], ['C-LOOK', '100,89,42,23,10,187,150,132', '322']] },
  followUps: ['Compute the average seek per request for each', 'What changes if the jump is not counted?'] });

// =====================================================================
registerModule({
  id: 'cs07',
  title: 'File Systems, I/O & Storage',
  intro: `<p>Every program you write eventually touches a disk, a network card or an SSD. This module explains what happens underneath: how a file is really a name pointing to an <b>inode</b> that points to blocks, how links and allocation methods work, why a crash does not destroy the disk (<b>journaling</b>), how the OS orders disk requests (<b>FCFS, SSTF, SCAN, C-SCAN, LOOK</b>) and how <b>RAID</b> uses XOR parity to survive failures. Then we follow a byte from the page cache to the platter with <b>fsync</b>, compare <b>blocking, non-blocking and async I/O</b>, and see how <b>DMA</b> keeps the CPU free. Expect lots of numeric practice: max file size, head movement, RAID capacity and crash-state analysis.</p>`,
  goals: [
    'Compute the maximum file size for any inode layout (direct + single/double/triple indirect) and locate a byte offset in it',
    'Explain hard vs soft links and predict what survives after deleting the original',
    'Compare contiguous, linked/FAT and indexed allocation and size a free-space bitmap',
    'Describe write-ahead journaling and state what survives a crash at each step (and in each journaling mode)',
    'Calculate total head movement for FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK',
    'Give capacity, fault tolerance and parity rebuild for RAID 0/1/5/6/10',
    'Explain page cache, fsync, blocking vs non-blocking vs async I/O and DMA in a read() walk-through'
  ],
  prereqs: `Memory Management & Virtual Memory (CS 6) for pages and caching ideas; basic binary and XOR arithmetic. Helpful: What an OS Does (CS 1) for system calls and interrupts.`,
  hours: 12,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
