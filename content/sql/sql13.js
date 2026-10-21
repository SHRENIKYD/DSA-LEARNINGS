(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- sample databases (SQLite dialect) ---------------- */
  // engine: a tiny "storage engine lab" — a write-ahead log, the pages on disk at crash time,
  // a buffer-pool access trace, an SSTable catalogue, a key-value write log and a sales table for column-store tricks.
  var DB_ENGINE = `CREATE TABLE wal_log (
  lsn        INTEGER PRIMARY KEY,          -- log sequence number: position in the log
  txn        TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('BEGIN','UPDATE','COMMIT','ABORT','CLR','CKPT')),
  page       TEXT,                          -- which page the change touched
  before_val INTEGER,                       -- undo information (old value)
  after_val  INTEGER,                       -- redo information (new value)
  prev_lsn   INTEGER                        -- previous log record of the same transaction
);
INSERT INTO wal_log VALUES
  (1,  'T1', 'BEGIN',  NULL, NULL, NULL, NULL),
  (2,  'T1', 'UPDATE', 'A',  0,    5,    1),
  (3,  'T2', 'BEGIN',  NULL, NULL, NULL, NULL),
  (4,  'T2', 'UPDATE', 'B',  0,    7,    3),
  (5,  'T1', 'COMMIT', NULL, NULL, NULL, 2),
  (6,  'T2', 'UPDATE', 'C',  0,    9,    4),
  (7,  'T3', 'BEGIN',  NULL, NULL, NULL, NULL),
  (8,  'T3', 'UPDATE', 'A',  5,    8,    7),
  (9,  'T3', 'COMMIT', NULL, NULL, NULL, 8),
  (10, 'T4', 'BEGIN',  NULL, NULL, NULL, NULL),
  (11, 'T4', 'UPDATE', 'D',  0,    3,    10);
-- what the data file looked like when the power died (page_lsn = LSN of the last change written into that page)
CREATE TABLE disk_pages (page TEXT PRIMARY KEY, page_lsn INTEGER NOT NULL, val INTEGER NOT NULL);
INSERT INTO disk_pages VALUES ('A', 0, 0), ('B', 4, 7), ('C', 0, 0), ('D', 0, 0);
-- dirty page table + active transactions captured by the last fuzzy checkpoint
CREATE TABLE ckpt_dirty_pages (page TEXT PRIMARY KEY, rec_lsn INTEGER NOT NULL);
INSERT INTO ckpt_dirty_pages VALUES ('A', 2), ('C', 6);
CREATE TABLE ckpt_active_txns (txn TEXT PRIMARY KEY, first_lsn INTEGER NOT NULL);
INSERT INTO ckpt_active_txns VALUES ('T2', 3);
-- buffer pool counters (InnoDB-style names)
CREATE TABLE engine_stats (metric TEXT PRIMARY KEY, value INTEGER NOT NULL);
INSERT INTO engine_stats VALUES
  ('buffer_pool_read_requests', 1250000),   -- logical page reads (served from RAM or disk)
  ('buffer_pool_reads',            9800),   -- reads that MISSED and went to disk
  ('buffer_pool_pages_total',     65536),   -- 65536 x 16 KB = 1 GB pool
  ('buffer_pool_pages_dirty',      7200),
  ('buffer_pool_pages_free',        310);
-- a page access trace for LRU experiments
CREATE TABLE access_trace (t INTEGER PRIMARY KEY, page_id INTEGER NOT NULL, op TEXT NOT NULL CHECK (op IN ('R','W')));
INSERT INTO access_trace VALUES
  (1,1,'R'),(2,2,'R'),(3,3,'W'),(4,1,'R'),(5,4,'R'),(6,1,'W'),(7,5,'R'),(8,2,'R'),(9,1,'R'),(10,3,'R'),(11,4,'R'),(12,5,'W');
-- LSM-tree SSTable catalogue (sizes in MB)
CREATE TABLE sstables (id INTEGER PRIMARY KEY, level INTEGER NOT NULL, size_mb INTEGER NOT NULL, min_key TEXT NOT NULL, max_key TEXT NOT NULL, created_seq INTEGER NOT NULL);
INSERT INTO sstables VALUES
  (1, 0, 64,  'a', 'z', 41), (2, 0, 64, 'c', 'x', 42), (3, 0, 64, 'b', 'm', 43),
  (4, 1, 64,  'a', 'f', 30), (5, 1, 64, 'g', 'm', 31), (6, 1, 64, 'n', 'z', 32),
  (7, 2, 64,  'a', 'c', 10), (8, 2, 64, 'd', 'h', 11), (9, 2, 64, 'i', 'p', 12), (10, 2, 64, 'q', 'z', 13);
-- key-value write stream that an LSM engine received (op P = put, D = delete/tombstone)
CREATE TABLE kv_log (seq INTEGER PRIMARY KEY, k TEXT NOT NULL, v TEXT, op TEXT NOT NULL CHECK (op IN ('P','D')));
INSERT INTO kv_log VALUES
  (1,'user:1','asha','P'),(2,'user:2','ben','P'),(3,'user:1','asha.k','P'),(4,'user:3','chen','P'),
  (5,'user:2',NULL,'D'),(6,'user:4','dara','P'),(7,'user:3','chen.w','P'),(8,'user:5','eve','P');
-- a fact table for column-store experiments (sorted by region, then day)
CREATE TABLE sales (row_id INTEGER PRIMARY KEY, region TEXT NOT NULL, day TEXT NOT NULL, product TEXT NOT NULL, amount INTEGER NOT NULL);
INSERT INTO sales VALUES
  (1,'EU','2026-10-01','pen',120),(2,'EU','2026-10-01','ink',40),(3,'EU','2026-10-02','pen',95),
  (4,'EU','2026-10-02','pad',60),(5,'IN','2026-10-01','pen',300),(6,'IN','2026-10-01','pen',280),
  (7,'IN','2026-10-02','pad',75),(8,'IN','2026-10-02','ink',55),(9,'IN','2026-10-03','pen',310),
  (10,'US','2026-10-01','pad',90),(11,'US','2026-10-02','pen',150),(12,'US','2026-10-03','pen',160);`;

  // lab: an empty database — snippets that use it create their own tables.
  var DB_LAB = `PRAGMA foreign_keys = ON;`;

  /* ---------------- snippet helpers ---------------- */
  function eng(code, title) { return { lang: 'sql', db: 'engine', code: code, title: title || 'Runnable SQL on the engine lab database (▶ Run)' }; }
  function lab(code, title) { return { lang: 'sql', db: 'lab', code: code, title: title || 'Self-contained SQL (empty database, ▶ Run it)' }; }
  function py(code, title) { return { lang: 'python', code: code, run: true, title: title || 'Runnable Python sketch' }; }
  function java(code, title) { return { lang: 'java', code: code, title: title || 'Java sketch (compiles)' }; }

  /* =====================================================================
     TOPIC 1 — Pages, slotted records and the on-disk layout
     ===================================================================== */
  topics.push({
    title: 'Pages & Slotted Records: How Rows Really Sit on Disk',
    analogy: `<p>Think of a <b>notebook with numbered pages</b>. You never photocopy one sentence — you always copy a <i>whole page</i>. On each page you write a little <b>table of contents at the top</b> ("note 0 starts at line 27, note 1 starts at line 23…") and you write the notes themselves <b>from the bottom up</b>. The table of contents grows down, the notes grow up, and the blank middle is your free space. If someone asks for "page 7, note 2", you open page 7, read entry 2 of the contents, and jump straight to the note. That is exactly a <b>slotted page</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A database never reads "one row" from disk. Disks and SSDs move data in <b>blocks</b>, so the engine cuts every file into equal-size <b>pages</b> (also called blocks): ${H.c('b', 'SQLite 4 KB')} by default, ${H.c('b', 'PostgreSQL 8 KB')}, ${H.c('b', 'MySQL InnoDB 16 KB')}. Every read and write the storage engine does is "give me page N" or "write page N".</p>
<p><b>What lives inside one page?</b></p>
<ul>
<li><b>Page header</b> (24 bytes in Postgres; InnoDB has a 38-byte file header plus a 56-byte index-page header): page number, type, checksum, the <b>page LSN</b> (the last log record that changed this page — you will need it for recovery), and two pointers: where free space starts and where it ends.</li>
<li><b>Slot array</b> (Postgres calls them <i>line pointers</i>, 4 bytes each): entry <i>i</i> says "record <i>i</i> is at byte offset X, length Y". It grows <b>forward</b> from the header.</li>
<li><b>Records</b> (tuples): the actual row bytes, packed from the <b>end of the page backward</b>.</li>
<li><b>Free space</b> sits in the middle. The page is full when the two ends meet.</li>
</ul>
${H.table(['bytes', '0–23', '24–35', '36 … 8000', '8001 … 8191'], [['part', H.c('p', 'header'), H.c('b', 'slots 0,1,2 →'), H.c('m', 'free space'), H.c('g', '← records 2,1,0')]])}
<p><b>Why the indirection?</b> A row is addressed by a <b>record id</b> (RID) = <code>(page number, slot number)</code>. Postgres calls it the <code>ctid</code>, e.g. <code>(0,3)</code>. Indexes store RIDs. Because the index points at the <i>slot</i>, not the byte offset, the engine can shuffle records around inside the page (to squeeze out holes) and only has to update the slot entry — every index stays valid.</p>
<p><b>Record format.</b> A row is not just values glued together. A typical layout is: a small <b>record header</b> (transaction ids for MVCC, flags), a <b>null bitmap</b> (one bit per column, so NULL takes no data bytes), the <b>fixed-length columns</b>, then the <b>variable-length columns</b> with their lengths or offsets. Columns are often <b>aligned</b> to 4 or 8 bytes, so column order can waste padding (Postgres "column tetris").</p>
<p><b>Too big for a page?</b> Long values go to <b>overflow pages</b>: Postgres <b>TOAST</b> kicks in when a row exceeds about 2 KB, compressing and moving big values out of line; InnoDB DYNAMIC rows keep a 20-byte pointer and store long BLOB/TEXT off-page; SQLite chains overflow pages.</p>
<p><b>Delete and update.</b> Deleting usually just marks the slot dead — the bytes become a <b>hole</b>. Later a <b>page compaction</b> slides the live records together. Whole tables accumulate empty space too, which is why Postgres has <code>VACUUM</code>, InnoDB merges half-empty pages, and SQLite has <code>VACUUM</code> plus a <b>freelist</b> of unused pages.</p>`,
    clues: [
      '"How does a database store a row on disk?" / "what is a page?" → pages + slotted layout + RID',
      '"Why does my table take 3x the space of my data?" → page header, row header, alignment padding, fill factor, dead tuples, free space',
      '"ctid" / "rowid" / "record identifier" / "tuple id" → (page, slot) addressing',
      '"rows larger than 8 KB" / "large JSON / BLOB columns are slow" → TOAST / overflow pages',
      '"Why 4 KB / 8 KB / 16 KB pages?" → match OS page + SSD block, trade-off between read amplification and per-page overhead',
      '"after deleting half the rows the file did not shrink" → holes + freelist; needs VACUUM / OPTIMIZE TABLE'
    ],
    code: [
      lab(`-- Look at the page machinery SQLite exposes (on a file DB the same pragmas work).
PRAGMA page_size;                    -- 4096 by default
CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT);
-- 2000 rows of ~200 bytes each
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 2000)
INSERT INTO notes SELECT i, printf('%0200d', i) FROM n;
SELECT page_count, page_size, page_count * page_size AS bytes_on_disk,
       2000 * 200 AS raw_payload_bytes
FROM pragma_page_count(), pragma_page_size();
-- delete every other row: pages become HALF empty, but almost none become FREE
DELETE FROM notes WHERE id % 2 = 0;
SELECT freelist_count AS free_pages_after_delete FROM pragma_freelist_count();
-- delete a contiguous key range: whole pages empty out and go to the freelist
DELETE FROM notes WHERE id > 1000;
SELECT freelist_count AS free_pages_after_bigger_delete FROM pragma_freelist_count();
VACUUM;                              -- rewrite the file compactly
SELECT page_count AS pages_after_vacuum, freelist_count AS free_after_vacuum
FROM pragma_page_count(), pragma_freelist_count();`, 'Pages, page count and the freelist in SQLite (▶ Run)'),
      py(`import struct

# A slotted page in ~40 lines. Tiny 256-byte page so the numbers stay readable.
PAGE_SIZE = 256
HEADER = struct.Struct("<HHH")   # slot_count, free_start, free_end   (6 bytes)
SLOT = struct.Struct("<hH")       # offset (-1 = dead), length        (4 bytes)


class SlottedPage:
    def __init__(self):
        self.buf = bytearray(PAGE_SIZE)
        self._set_header(0, HEADER.size, PAGE_SIZE)

    def _header(self):
        return HEADER.unpack_from(self.buf, 0)

    def _set_header(self, n, free_start, free_end):
        HEADER.pack_into(self.buf, 0, n, free_start, free_end)

    def _slot_pos(self, slot):
        return HEADER.size + slot * SLOT.size

    def contiguous_free(self):
        n, fs, fe = self._header()
        return fe - fs

    def insert(self, record):
        n, fs, fe = self._header()
        need = len(record) + SLOT.size          # record bytes + one new slot entry
        if fe - fs < need:
            self.compact()                      # maybe holes can be squeezed out
            n, fs, fe = self._header()
            if fe - fs < need:
                raise ValueError("page full: the free-space map must pick another page")
        fe -= len(record)                       # records grow from the END backward
        self.buf[fe:fe + len(record)] = record
        SLOT.pack_into(self.buf, fs, fe, len(record))   # slots grow from the FRONT forward
        self._set_header(n + 1, fs + SLOT.size, fe)
        return n                                # slot number = stable id inside the page

    def get(self, slot):
        off, ln = SLOT.unpack_from(self.buf, self._slot_pos(slot))
        return None if off < 0 else bytes(self.buf[off:off + ln])

    def delete(self, slot):
        off, ln = SLOT.unpack_from(self.buf, self._slot_pos(slot))
        SLOT.pack_into(self.buf, self._slot_pos(slot), -1, ln)  # bytes stay as a hole

    def compact(self):
        n, fs, fe = self._header()
        live = []
        for s in range(n):
            off, ln = SLOT.unpack_from(self.buf, self._slot_pos(s))
            if off >= 0:
                live.append((s, bytes(self.buf[off:off + ln])))
        fe = PAGE_SIZE
        for s, rec in live:                     # slide live records to the end
            fe -= len(rec)
            self.buf[fe:fe + len(rec)] = rec
            SLOT.pack_into(self.buf, self._slot_pos(s), fe, len(rec))  # only the slot changes
        self._set_header(n, fs, fe)


page = SlottedPage()
ids = [page.insert(bytes([65 + i]) * 60) for i in range(3)]   # three 60-byte rows: AAA.., BBB.., CCC..
print("slots", ids, "contiguous free =", page.contiguous_free())
page.delete(1)
print("after delete(1): contiguous free =", page.contiguous_free(), "(the hole is not contiguous yet)")
new_slot = page.insert(b"D" * 100)          # does not fit contiguously -> compaction runs first
print("inserted 100-byte row into slot", new_slot, "-> free now", page.contiguous_free())
print("slot 0 still reads", page.get(0)[:5], "| slot 2 still reads", page.get(2)[:5], "| slot 1 is", page.get(1))
try:
    page.insert(b"E" * 80)
except ValueError as e:
    print("insert 80 bytes ->", e)`, 'A working slotted page (Python, ▶ Run)')
    ],
    codeTitle: ['SQLite page pragmas', 'Slotted page from scratch'],
    viz: {
      title: 'Slotted page: insert, delete, compact (1 cell = 1 unit of bytes)',
      input: '+A:5 +B:4 +C:6 ?B -B +D:7 +E:6 +F:4',
      inputLabel: 'Ops: +Name:len insert, -Name delete, ?Name lookup, compact',
      gen: function (input) {
        var toks = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        if (!toks.length) throw new Error('Enter ops like: +A:5 +B:4 -A ?B compact');
        if (toks.length > 16) throw new Error('Use at most 16 operations');
        var SIZE = 32, HDR = 2, W = 8;
        var slots = [], fe = SIZE, frames = [];
        function fs() { return HDR + slots.length; }
        function deadBytes() { var d = 0; slots.forEach(function (s) { if (s.state === 'dead') d += s.len; }); return d; }
        function snap(narr, focus) {
          focus = focus || {};
          var cells = [], hl = {};
          for (var i = 0; i < SIZE; i++) cells.push('');
          for (var h = 0; h < HDR; h++) { cells[h] = 'HDR'; hl[h] = 'sel'; }
          slots.forEach(function (s, i) {
            var c = HDR + i;
            cells[c] = 's' + i + (s.state === 'dead' ? '✕' : s.state === 'free' ? '○' : '→' + s.off);
            hl[c] = s.state === 'dead' ? 'bad' : s.state === 'free' ? 'done' : 'win';
            if (s.state !== 'free') for (var k = 0; k < s.len; k++) { cells[s.off + k] = s.state === 'dead' ? '(' + s.name + ')' : s.name; hl[s.off + k] = s.state === 'dead' ? 'bad' : 'ok'; }
          });
          (focus.cells || []).forEach(function (c) { hl[c] = focus.cls || 'cur'; });
          var rows = [], ghl = {}, rowHead = [];
          for (var r = 0; r < SIZE / W; r++) {
            var row = [];
            for (var c2 = 0; c2 < W; c2++) { var idx = r * W + c2; row.push(cells[idx]); if (hl[idx]) ghl[r + ',' + c2] = hl[idx]; }
            rows.push(row); rowHead.push('byte ' + (r * W) + '–' + (r * W + W - 1));
          }
          var colHead = []; for (var q = 0; q < W; q++) colHead.push('+' + q);
          var srows = slots.map(function (s, i) { return ['s' + i, s.state === 'free' ? '—' : s.name, s.state === 'free' ? '—' : s.off, s.state === 'free' ? '—' : s.len, s.state]; });
          var shl = {}; if (focus.slot !== undefined) shl[focus.slot] = focus.cls || 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'grid', label: 'Page (32 units). HDR = header, s# = slot entries growing →, records growing ← from the end', rows: rows, rowHead: rowHead, colHead: colHead, hl: ghl },
            { type: 'table', label: 'Slot directory (what indexes point into)', columns: ['slot', 'record', 'offset', 'len', 'state'], rows: srows.length ? srows : [['—', '—', '—', '—', 'empty page']], hl: shl },
            { type: 'vars', label: 'Free-space bookkeeping', vals: { free_start: fs(), free_end: fe, contiguous_free: fe - fs(), dead_hole_units: deadBytes() }, hl: focus.vars || {} }
          ] });
        }
        function compact(why) {
          var live = slots.filter(function (s) { return s.state === 'live'; });
          var end = SIZE;
          live.forEach(function (s) { end -= s.len; s.off = end; });
          slots.forEach(function (s) { if (s.state === 'dead') { s.state = 'free'; s.off = -1; } });
          fe = end;
          snap('<b>Compaction</b>' + (why ? ' (' + why + ')' : '') + ': live records slide to the end of the page so all free space becomes one block. Only the <b>offsets in the slots</b> change — slot numbers stay the same, so every index entry (page, slot) is still correct. Dead slots become <b>reusable</b> (○).', { vars: { contiguous_free: 'ok' } });
        }
        snap('An empty page: 2 units of <b>header</b> at the front, nothing else. Free space runs from unit ' + HDR + ' to unit ' + SIZE + '. Slots will grow forward, records will grow backward.');
        toks.forEach(function (t) {
          var m;
          if ((m = /^\+([A-Za-z0-9]{1,3}):(\d{1,2})$/.exec(t))) {
            var name = m[1], len = +m[2];
            if (len < 1 || len > 20) throw new Error('Record length must be 1..20');
            if (slots.some(function (s) { return s.name === name && s.state === 'live'; })) throw new Error('Record ' + name + ' already exists');
            var reuse = -1; slots.forEach(function (s, i) { if (reuse < 0 && s.state === 'free') reuse = i; });
            var need = len + (reuse >= 0 ? 0 : 1);
            if (fe - fs() < need) {
              if (fe - fs() + deadBytes() >= need) compact('triggered because ' + name + ' needs ' + need + ' units but only ' + (fe - fs()) + ' are contiguous');
              else { snap('<span class="c-r">Page full.</span> ' + name + ' needs ' + need + ' units (record + slot) but only ' + (fe - fs()) + ' are free even after compaction. The engine asks its <b>free-space map</b> for another page (or allocates a new one) and the row gets a RID on that page.', { vars: { contiguous_free: 'bad' }, cls: 'bad' }); return; }
              reuse = -1; slots.forEach(function (s, i) { if (reuse < 0 && s.state === 'free') reuse = i; });
            }
            fe -= len;
            var rec = { name: name, off: fe, len: len, state: 'live' }, si;
            if (reuse >= 0) { slots[reuse] = rec; si = reuse; } else { slots.push(rec); si = slots.length - 1; }
            var cl = []; for (var k = 0; k < len; k++) cl.push(fe + k); cl.push(HDR + si);
            snap('<b>Insert ' + name + '</b> (' + len + ' units): bytes go at the <b>end</b> of free space (offset ' + fe + '), and ' + (reuse >= 0 ? 'it takes the <b>reused</b> slot s' + si + ' (no new slot entry needed)' : 'a new slot s' + si + ' is appended at the front') + '. Its RID is <b>(page, ' + si + ')</b>.', { cells: cl, slot: si, cls: 'cur' });
          } else if ((m = /^-([A-Za-z0-9]{1,3})$/.exec(t))) {
            var di = -1; slots.forEach(function (s, i) { if (s.name === m[1] && s.state === 'live') di = i; });
            if (di < 0) { snap('Delete ' + m[1] + ': no live record with that name — nothing to do.'); return; }
            slots[di].state = 'dead';
            var dc = []; for (var k2 = 0; k2 < slots[di].len; k2++) dc.push(slots[di].off + k2);
            snap('<b>Delete ' + m[1] + '</b>: the slot is just marked dead (✕). The ' + slots[di].len + ' bytes stay where they are as a <span class="c-r">hole</span> — cheap now, cleaned later. Contiguous free space did <b>not</b> grow.', { cells: dc, slot: di, cls: 'bad', vars: { dead_hole_units: 'bad' } });
          } else if ((m = /^\?([A-Za-z0-9]{1,3})$/.exec(t))) {
            var li = -1; slots.forEach(function (s, i) { if (s.name === m[1] && s.state === 'live') li = i; });
            if (li < 0) { snap('Lookup ' + m[1] + ': not found on this page.'); return; }
            var lc = [HDR + li]; for (var k3 = 0; k3 < slots[li].len; k3++) lc.push(slots[li].off + k3);
            snap('<b>Lookup ' + m[1] + '</b> via RID (page, ' + li + '): read slot s' + li + ' in the header area → offset ' + slots[li].off + ', length ' + slots[li].len + ' → jump straight there. Two array reads, no scanning.', { cells: lc, slot: li, cls: 'sel' });
          } else if (/^compact$/i.test(t)) {
            compact('requested');
          } else throw new Error('Unknown op "' + t + '". Use +A:5, -A, ?A or compact');
        });
        snap('Done. Notice the three costs a real engine juggles: <b>slot overhead</b> per row, <b>holes</b> left by deletes, and the work of <b>compaction</b>. Postgres does this per page during pruning/VACUUM; InnoDB reorganises a page when an insert does not fit; SQLite defragments the page in place.');
        return frames;
      }
    },
    examples: [
      {
        title: 'How many 120-byte rows fit in an 8 KB Postgres page?',
        html: `<p>Page 8192 B − header 24 B = 8168 B usable. Each row costs <b>tuple header 23 B → padded to 24</b> + data 120 B = 144 B, plus a <b>4 B line pointer</b> = 148 B.</p>
${H.table(['item', 'bytes'], [['usable space', '8168'], ['per row (24 + 120 + 4)', '148'], ['rows per page', '⌊8168 / 148⌋ = ' + H.c('g', '55')], ['wasted at end', '8168 − 55·148 = 28']])}
<p>So a 10-million-row table needs about 10,000,000 / 55 ≈ <b>181,819 pages ≈ 1.4 GB</b>, even though the raw data is only 1.2 GB. Header + slot pointer are ${H.c('y', '~19%')} of every row here — tiny rows suffer even more.</p>`
      },
      {
        title: 'Fill factor: leaving room on purpose',
        html: `<p>Postgres <code>CREATE TABLE ... WITH (fillfactor = 80)</code> fills pages only to 80%. Why waste 20%? Because an <code>UPDATE</code> writes a <b>new row version</b>; if there is room on the <i>same page</i>, Postgres can do a <b>HOT update</b> (heap-only tuple) and skip updating every index. Update-heavy tables (counters, status columns) love a fill factor of 70–90. Append-only tables (logs) should keep 100.</p>
${H.table(['fillfactor', 'rows/page (148 B rows)', 'pages for 10M rows'], [['100', '55', '181,819'], ['80', '44', '227,273'], ['70', '38', '263,158']])}`,
        code: lab(`-- SQLite has no fillfactor, but you can SEE how page usage changes with row size.
CREATE TABLE small_rows (id INTEGER PRIMARY KEY, v TEXT);
CREATE TABLE fat_rows   (id INTEGER PRIMARY KEY, v TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1000)
INSERT INTO small_rows SELECT i, printf('%020d', i) FROM n;
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1000)
INSERT INTO fat_rows SELECT i, printf('%0900d', i) FROM n;
-- 4096-byte pages: about 4 rows of ~900 bytes fit, versus ~100+ rows of ~25 bytes
SELECT 'approx rows per 4 KB page (small)' AS what, 4096 / (20 + 8) AS value
UNION ALL SELECT 'approx rows per 4 KB page (fat)', 4096 / (900 + 8);`)
      },
      {
        title: 'Column order and alignment padding',
        html: `<p>Postgres aligns <code>bigint</code>/<code>timestamp</code> to 8 bytes. Layout A: <code>(flag boolean, id bigint, ok boolean, ts timestamp)</code> → 1 + <span class="c-r">7 pad</span> + 8 + 1 + <span class="c-r">7 pad</span> + 8 = <b>32 B</b>. Layout B: <code>(id bigint, ts timestamp, flag boolean, ok boolean)</code> → 8 + 8 + 1 + 1 = <b>18 B</b>. Same data, 44% smaller rows, more rows per page, fewer pages to read. Rule of thumb: <b>widest fixed-length columns first, variable-length last</b>.</p>`
      },
      {
        title: 'A big JSON column and TOAST',
        html: `<p>A row with a 50 KB JSON document cannot fit in an 8 KB page. Postgres TOAST compresses it (pglz or lz4) and, if still above ~2 KB, splits it into ~2 KB chunks stored in a hidden <code>pg_toast_NNN</code> table, leaving an 18-byte pointer in the row. Consequence: <code>SELECT id, status FROM docs</code> is fast (never touches TOAST), but <code>SELECT *</code> fetches and decompresses every chunk. That is a storage-layer reason why <b>"do not SELECT *"</b> matters.</p>`
      }
    ],
    deepDive: `<p><b>🟣 Page size is a trade-off.</b> Bigger pages mean fewer B-tree levels and better sequential throughput, but each random point lookup drags more useless bytes into memory (<b>read amplification</b>) and each tiny update rewrites more bytes. OLTP engines sit at 4–16 KB; analytical formats use row groups/blocks of megabytes. InnoDB allows 4/8/16/32/64 KB via <code>innodb_page_size</code>, chosen only at instance creation.</p>
<p><b>Torn pages.</b> A 16 KB InnoDB page is four 4 KB filesystem blocks; a power cut can leave half old, half new. Every page carries a <b>checksum</b> (CRC32C) so the engine <i>detects</i> it, and a repair mechanism: InnoDB's <b>doublewrite buffer</b> (write the page to a scratch area first, fsync, then write in place) or Postgres <b>full-page writes</b> (the first change to a page after a checkpoint logs the whole page image in the WAL). Hardware with atomic 16 KB writes lets you turn these off.</p>
<p><b>Heap files and free-space maps.</b> Where does a new row go? Postgres keeps a <b>Free Space Map</b> (a small tree of "how much room does page N have") and a <b>Visibility Map</b> (which pages are all-visible, enabling index-only scans and skipping VACUUM). InnoDB has no heap at all — the table <i>is</i> the clustered B+tree, so a row's "home" is determined by its primary key.</p>
<p><b>Slot stability vs MVCC.</b> In Postgres an <code>UPDATE</code> creates a new tuple; the old tuple's header gets <code>xmax</code> and a pointer (<code>t_ctid</code>) to the new version. Dead line pointers can be reused only after VACUUM has removed index entries pointing to them — otherwise an index could point to the wrong row. That is why "VACUUM cannot keep up" bloats both tables and indexes.</p>
<p><b>Direct I/O.</b> Engines that manage their own cache (InnoDB with <code>innodb_flush_method=O_DIRECT</code>) bypass the OS page cache to avoid caching every page twice. Postgres historically relies on the OS cache (shared_buffers ~25% of RAM) and added async/direct I/O infrastructure in recent versions.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can instantly explain a <code>pageinspect</code> dump, estimate table size from a schema, or suggest a better column order. Paste <code>\\d+ table</code> output and ask "estimate bytes per row including headers and padding" — it is a great calculator.</p>
<p><b>Use AI as a partner:</b> "Here is my schema and 50M expected rows. Estimate heap size in Postgres and InnoDB, show the arithmetic." Then check the numbers against reality with <code>pg_relation_size</code> or <code>information_schema.TABLES</code>.</p>
<p><b>Where AI goes wrong:</b> it often forgets the per-row header and slot cost, assumes 4 KB pages everywhere, invents TOAST thresholds, or claims deletes shrink files immediately. It also confuses InnoDB (clustered, no heap) with Postgres (heap + separate indexes).</p>
<p><b>What you must still own:</b> the mental model of page → slot → record, the reason RIDs survive compaction, and the judgement of when bloat or row width is the real performance problem.</p>`,
    problems: [
      {
        title: 'Estimate Pages and Disk Size for a Table',
        level: 'Easy', tags: ['pages', 'capacity planning'], companies: ['Amazon', 'Uber', 'Stripe'],
        statement: `<p>A Postgres table will hold <b>N = 20,000,000</b> rows. Each row has 96 bytes of column data. Page size is 8192 B with a 24 B page header; each row also costs a 24 B tuple header (after alignment) and a 4 B line pointer. The table uses <code>fillfactor = 90</code>. Write a query that prints rows per page, total pages and total size in MB.</p>`,
        constraints: `Use integer arithmetic (floor for rows per page, ceiling for pages). 1 MB = 1,048,576 B.`,
        example: `<p>usable = (8192 − 24) × 0.90 = ${H.c('b', '7351')} B; per row = 24 + 96 + 4 = ${H.c('b', '124')} B; rows/page = ⌊7351 / 124⌋ = ${H.c('g', '59')}; pages = ⌈20,000,000 / 59⌉ = ${H.c('g', '338,984')}; size ≈ ${H.c('g', '2648 MB')}.</p>`,
        brute: {
          why: `<p>The brute force is to <b>simulate</b>: keep adding rows to a page until it overflows, count pages. It gives the same answer but loops 20 million times — fine as a sanity check, silly as a method. The closed form is O(1).</p>`,
          code: { lang: 'python', code: `# Simulate filling pages row by row (slow: 20 million iterations, but obviously correct)
N, ROW = 20_000_000, 96
usable = int((8192 - 24) * 0.90)
cost = 24 + ROW + 4
pages, used = 1, 0
for _ in range(N):
    if used + cost > usable:
        pages += 1
        used = 0
    used += cost
print("pages:", pages, "MB:", round(pages * 8192 / 1048576))` }
        },
        mcq: { q: 'Which cost is easiest to forget when sizing rows per page?', options: ['The per-row tuple header and slot pointer', 'The column data', 'The page size', 'The number of rows'], answer: 0, explain: 'Header (≈24 B) + line pointer (4 B) per row add 28 B — for a 96 B row that is almost 30% overhead.' },
        hints: [
          `<p>Hint 1: the space you can use per page is (page size − page header) × fillfactor, not the full 8192 bytes.</p>`,
          `<p>Hint 2: each row costs header + data + slot pointer. Rows per page is the floor of usable / per-row cost.</p>`,
          `<p>Hint 3: pages = ceiling(N / rows per page) — in SQL, (N + r − 1) / r with integers. Multiply by 8192 and divide by 1,048,576 for MB.</p>`
        ],
        tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
          { rows: [
              [7351, 124, 59, 338984, 2648]
            ] },
          { after: 'UPDATE params SET n_rows = 1; SELECT * FROM page_estimate', rows: [
              [7351, 124, 59, 1, 0]
            ] },
          { after: 'UPDATE params SET n_rows = 59; SELECT * FROM page_estimate', rows: [
              [7351, 124, 59, 1, 0]
            ] },
          { after: 'UPDATE params SET n_rows = 60; SELECT * FROM page_estimate', rows: [
              [7351, 124, 59, 2, 0]
            ] },
          { after: 'UPDATE params SET n_rows = 59000; SELECT * FROM page_estimate', rows: [
              [7351, 124, 59, 1000, 7]
            ] },
          { after: 'UPDATE params SET fillfactor = 100; SELECT * FROM page_estimate', rows: [
              [8168, 124, 65, 307693, 2403]
            ] },
          { after: 'UPDATE params SET data_bytes = 8; SELECT * FROM page_estimate', rows: [
              [7351, 36, 204, 98040, 765]
            ] },
          { after: 'UPDATE params SET page_size = 16384, page_hdr = 40, fillfactor = 70, n_rows = 5000000; SELECT * FROM page_estimate', rows: [
              [11440, 124, 92, 54348, 849]
            ] },
          { after: 'UPDATE params SET n_rows = 0; SELECT * FROM page_estimate', rows: [
              [7351, 124, 59, 0, 0]
            ] }
        ] },
        solution: {
          approach: `<p>Turn the page anatomy into arithmetic. Usable bytes, per-row bytes, floor division, ceiling division. Writing it as a CTE keeps each assumption visible and easy to tweak (try fillfactor 100, or a 16 KB InnoDB page).</p>`,
          code: lab(`CREATE TEMP TABLE params AS
SELECT 20000000 AS n_rows, 96 AS data_bytes, 8192 AS page_size, 24 AS page_hdr,
       24 AS tuple_hdr, 4 AS line_ptr, 90 AS fillfactor;

CREATE TEMP VIEW page_estimate AS
WITH calc AS (
  SELECT n_rows, page_size,
         (page_size - page_hdr) * fillfactor / 100 AS usable,
         tuple_hdr + data_bytes + line_ptr       AS per_row
  FROM params
)
SELECT usable, per_row,
       usable / per_row                                        AS rows_per_page,
       (n_rows + usable / per_row - 1) / (usable / per_row)    AS pages,
       ((n_rows + usable / per_row - 1) / (usable / per_row)) * page_size / 1048576 AS size_mb
FROM calc;

-- change a number in params and run the view again to size another table
SELECT * FROM page_estimate;`),
          dry: { head: ['quantity', 'value'], rows: [['usable', '7351'], ['per_row', '124'], ['rows_per_page', '59'], ['pages', '338,984'], ['size_mb', '2648']] },
          complexity: `<p>O(1) arithmetic. The simulation is O(N).</p>`,
          followUps: ['Redo it for InnoDB: 16 KB pages, ~15/16 fill on sequential inserts, ~20 B row header, 6 B trx id + 7 B roll pointer.', 'How many pages does a single-column bigint index on this table need?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 2 — Buffer pool
     ===================================================================== */
  topics.push({
    title: 'The Buffer Pool: RAM Cache, Pinning, Dirty Pages & Eviction',
    analogy: `<p>A <b>library reading room</b> has only 20 desks, but the archive in the basement has a million books. When you ask for a book, the librarian first checks the desks (fast). If it is not there, someone walks to the basement (slow), and if all desks are full they must <b>send one book back</b> first — preferably one nobody touched for a while. If somebody <b>scribbled notes</b> in that book (dirty), it must be carefully re-shelved before the desk is freed. And while a reader is still holding a book (pinned), nobody may take it away.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Disk is roughly 1,000× slower than RAM (an NVMe read ≈ 50–100 µs, a RAM access ≈ 100 ns). So every database keeps a big chunk of memory called the <b>buffer pool</b> (InnoDB <code>innodb_buffer_pool_size</code>, Postgres <code>shared_buffers</code>, SQLite <code>cache_size</code>). It is an array of <b>frames</b>; each frame can hold one page.</p>
<p><b>The bookkeeping, per frame:</b></p>
${H.table(['field', 'meaning'], [['page id', 'which disk page sits here'], ['pin count', 'how many threads are using it right now — a pinned page can never be evicted'], ['dirty bit', 'changed in RAM but not yet written to disk'], ['page LSN / recLSN', 'for the WAL rule and checkpoints (next topic)'], ['reference info', 'LRU position or clock usage bit — used to choose a victim']])}
<p>Plus a <b>page table</b>: a hash map from page id → frame number, so "is page 42 in memory?" is O(1).</p>
<p><b>Fetching a page (the core loop):</b></p>
<ol>
<li>Look up the page id in the page table. <b>Hit</b> → pin it, update its recency, return the frame.</li>
<li><b>Miss</b> → find a free frame; if none, choose a <b>victim</b> with pin count 0 using the replacement policy.</li>
<li>If the victim is <b>dirty</b>, write it back first (and — the WAL rule — only after the log describing its changes is on disk).</li>
<li>Read the requested page from disk into the frame, update the page table, pin it.</li>
<li>When the caller is done it <b>unpins</b> the page (and marks it dirty if it modified it).</li>
</ol>
<p><b>Replacement policies.</b> ${H.c('b', 'LRU')} evicts the least recently used page — great for hot sets, terrible for one big scan, which <b>floods</b> the pool and pushes every hot page out ("sequential flooding"). Real engines patch this:</p>
<ul>
<li><b>InnoDB midpoint insertion</b>: the LRU list is split into a <i>young</i> (≈ 5/8) and <i>old</i> (≈ 3/8, <code>innodb_old_blocks_pct = 37</code>) sublist. New pages enter at the <b>head of the old sublist</b>; they are promoted to young only if touched again after <code>innodb_old_blocks_time</code> (1000 ms). A table scan churns through the old part and leaves the hot young pages alone.</li>
<li><b>Postgres clock-sweep</b>: each buffer has a <code>usage_count</code> (0–5); a "clock hand" sweeps the array, decrementing counts, and evicts the first unpinned buffer at 0. Large sequential scans and VACUUM use a small <b>ring buffer</b> (e.g. 256 KB) so they recycle their own few buffers instead of flushing the cache.</li>
<li>Research policies: <b>LRU-K</b> (evict by the K-th most recent access), <b>2Q</b>, <b>ARC</b> — all try to tell "used once" from "used often".</li>
</ul>
<p><b>Dirty pages are not written on commit.</b> A commit only forces the <b>log</b> to disk; dirty pages are flushed later by background threads (InnoDB page cleaners, Postgres background writer and checkpointer). That "no-force" design is what makes OLTP fast — and it is only safe because of the WAL.</p>`,
    clues: [
      '"The database is slow after a restart, then gets faster" → cold buffer pool / cache warming (InnoDB dumps and reloads the pool at shutdown/startup)',
      '"A nightly report makes the whole app slow" → sequential flooding of an LRU cache; midpoint insertion / ring buffers',
      '"How much RAM should the database get?" → working set vs buffer pool size, hit ratio, double buffering with the OS cache',
      '"Why not just use mmap?" → no control over eviction order or flush timing, TLB shootdowns, I/O stalls inside page faults, error handling via SIGBUS',
      '"Implement an LRU cache / page cache" → hash map + doubly linked list, O(1) get/put; add pin counts and dirty bits for a DB',
      '"pinned page", "dirty page", "page cleaner", "checkpoint spike" → buffer manager internals'
    ],
    code: [
      py(`from collections import OrderedDict


class BufferPool:
    """LRU buffer pool with pin counts and dirty-page write-back (the disk is a dict)."""

    def __init__(self, capacity, disk):
        self.capacity = capacity
        self.disk = disk                      # page_id -> bytes "on disk"
        self.frames = OrderedDict()           # page_id -> [data, pin_count, dirty]; order = LRU -> MRU
        self.hits = self.misses = self.disk_reads = self.disk_writes = 0

    def _evict(self):
        for pid, (data, pins, dirty) in self.frames.items():   # oldest first
            if pins == 0:                                       # never evict a pinned page
                if dirty:
                    self.disk[pid] = data                       # write-back (after WAL flush in a real DB)
                    self.disk_writes += 1
                del self.frames[pid]
                return pid
        raise RuntimeError("all frames pinned: buffer pool exhausted")

    def fetch(self, pid):
        if pid in self.frames:
            self.hits += 1
            self.frames.move_to_end(pid)                        # now most recently used
        else:
            self.misses += 1
            if len(self.frames) >= self.capacity:
                self._evict()
            self.frames[pid] = [self.disk[pid], 0, False]
            self.disk_reads += 1
        self.frames[pid][1] += 1                                # pin
        return self.frames[pid]

    def unpin(self, pid, new_data=None):
        frame = self.frames[pid]
        frame[1] -= 1
        if new_data is not None:
            frame[0] = new_data
            frame[2] = True                                     # dirty: flush later, not now


disk = {p: "v0" for p in range(1, 7)}
pool = BufferPool(3, disk)
trace = [(1, None), (2, None), (3, "v1"), (1, None), (4, None), (1, "v2"), (5, None), (2, None), (1, None)]
for pid, write in trace:
    pool.fetch(pid)
    pool.unpin(pid, write)
print("pool (LRU -> MRU):", list(pool.frames))
print("hits", pool.hits, "misses", pool.misses, "disk reads", pool.disk_reads, "dirty write-backs", pool.disk_writes)
print("hit ratio = %.0f%%" % (100 * pool.hits / (pool.hits + pool.misses)))
print("page 3 on disk now:", disk[3], "(written back when evicted)")`, 'Buffer pool with LRU, pins and dirty write-back (▶ Run)'),
      java(`// The classic O(1) LRU core: LinkedHashMap in access order + removeEldestEntry.
// A real buffer manager adds pin counts (skip pinned victims) and dirty write-back.
class LruPageCache extends LinkedHashMap<Integer, byte[]> {
    private final int capacity;
    private final Set<Integer> dirty = new HashSet<>();
    int writeBacks = 0;

    LruPageCache(int capacity) {
        super(16, 0.75f, true);          // true = access order (get() moves to the tail)
        this.capacity = capacity;
    }

    void markDirty(int pageId) { dirty.add(pageId); }

    @Override
    protected boolean removeEldestEntry(Map.Entry<Integer, byte[]> eldest) {
        if (size() <= capacity) return false;
        if (dirty.remove(eldest.getKey())) writeBacks++;   // flush before dropping
        return true;
    }

    public static void main(String[] args) {
        LruPageCache c = new LruPageCache(2);
        c.put(1, new byte[16]);
        c.put(2, new byte[16]);
        c.markDirty(1);
        c.get(1);                 // 1 becomes most recent
        c.put(3, new byte[16]);   // evicts 2 (clean)
        c.put(4, new byte[16]);   // evicts 1 (dirty -> write-back)
        System.out.println(c.keySet() + " writeBacks=" + c.writeBacks);   // [3, 4] writeBacks=1
    }
}`, 'LinkedHashMap LRU page cache (Java)'),
      eng(`-- Buffer pool hit ratio from InnoDB-style counters
SELECT
  MAX(CASE WHEN metric = 'buffer_pool_read_requests' THEN value END) AS logical_reads,
  MAX(CASE WHEN metric = 'buffer_pool_reads' THEN value END)         AS disk_reads,
  ROUND(100.0 * (1 - 1.0 * MAX(CASE WHEN metric = 'buffer_pool_reads' THEN value END)
                     / MAX(CASE WHEN metric = 'buffer_pool_read_requests' THEN value END)), 2) AS hit_ratio_pct,
  ROUND(100.0 * MAX(CASE WHEN metric = 'buffer_pool_pages_dirty' THEN value END)
              / MAX(CASE WHEN metric = 'buffer_pool_pages_total' THEN value END), 1)        AS dirty_pct,
  MAX(CASE WHEN metric = 'buffer_pool_pages_total' THEN value END) * 16 / 1024             AS pool_mb
FROM engine_stats;`, 'Hit ratio and dirty percentage (▶ Run)')
    ],
    codeTitle: ['Python buffer manager', 'Java LRU core', 'SQL monitoring'],
    viz: [
      {
        title: 'LRU buffer pool: hits, misses, dirty write-backs',
        input: 'cap=3 | 1 2 3w 1 4 1w 5 2 1',
        inputLabel: 'cap=N | page ids (append w for a write)',
        gen: function (input) {
          var s = String(input || '').trim(), cap = 3;
          var mm = /cap\s*=\s*(\d+)/i.exec(s);
          if (mm) { cap = +mm[1]; s = s.replace(mm[0], ''); }
          if (cap < 1 || cap > 6) throw new Error('cap must be 1..6');
          var toks = s.replace(/\|/g, ' ').split(/[\s,]+/).filter(Boolean);
          if (!toks.length) throw new Error('Enter page ids like: cap=3 | 1 2 3w 1 4');
          if (toks.length > 20) throw new Error('Use at most 20 accesses');
          var frames = [], lru = [], frame = [], where = {}, dirty = {}, st = { hits: 0, misses: 0, disk_reads: 0, dirty_writebacks: 0 };
          for (var i = 0; i < cap; i++) frame.push(null);
          function lab(p) { return 'P' + p + (dirty[p] ? '*' : ''); }
          function push(narr, o) {
            o = o || {};
            var lhl = {}, ptr = {};
            if (lru.length) { ptr[0] = 'MRU'; ptr[lru.length - 1] = lru.length > 1 ? 'LRU' : ['MRU', 'LRU']; }
            if (o.lruHl) for (var k in o.lruHl) lhl[k] = o.lruHl[k];
            var fv = frame.map(function (p) { return p === null ? '—' : lab(p); });
            var fhl = {}; if (o.frameHl) for (var k2 in o.frameHl) fhl[k2] = o.frameHl[k2];
            var ent = []; frame.forEach(function (p, fi) { if (p !== null) ent.push(['P' + p, 'frame ' + fi]); });
            var mhl = {}; if (o.mapKey) mhl[o.mapKey] = o.mapCls || 'cur';
            var total = st.hits + st.misses;
            frames.push({ narr: narr, parts: [
              { type: 'list', label: 'LRU list (MRU → LRU). * = dirty', values: lru.map(lab), hl: lhl, ptr: ptr },
              { type: 'array', label: 'Buffer pool frames', values: fv, hl: fhl, showIdx: true },
              { type: 'map', label: 'Page table (page → frame)', entries: ent, hl: mhl },
              { type: 'vars', label: 'Counters', vals: { hits: st.hits, misses: st.misses, disk_reads: st.disk_reads, dirty_writebacks: st.dirty_writebacks, hit_ratio: total ? Math.round(100 * st.hits / total) + '%' : '—' }, hl: o.varHl || {} }
            ] });
          }
          push('Empty pool with <b>' + cap + '</b> frames. The LRU list orders pages from most recently used (left) to least recently used (right). Pages marked * are dirty.');
          toks.forEach(function (t) {
            var m = /^(\d{1,3})(w?)$/i.exec(t);
            if (!m) throw new Error('Bad token "' + t + '" — use numbers like 4 or 4w');
            var p = m[1], w = !!m[2];
            if (where[p] !== undefined) {
              st.hits++;
              lru.splice(lru.indexOf(p), 1); lru.unshift(p);
              if (w) dirty[p] = true;
              var fh = {}; fh[where[p]] = 'ok';
              push('<b>' + (w ? 'Write' : 'Read') + ' P' + p + ' → HIT.</b> Page table says frame ' + where[p] + '. No disk I/O. Move P' + p + ' to the MRU end' + (w ? ' and set its <b>dirty bit</b> (it will be written back later, not now)' : '') + '.', { lruHl: { 0: 'ok' }, frameHl: fh, mapKey: 'P' + p, mapCls: 'ok', varHl: { hits: 'ok' } });
              return;
            }
            st.misses++;
            var fi = frame.indexOf(null);
            if (fi < 0) {
              var victim = lru[lru.length - 1]; fi = where[victim];
              var vh = {}; vh[lru.length - 1] = 'bad'; var vf = {}; vf[fi] = 'bad';
              var wasDirty = !!dirty[victim];
              push('<b>' + (w ? 'Write' : 'Read') + ' P' + p + ' → MISS</b> and the pool is full. Victim = the LRU end: <b>P' + victim + '</b> (pin count 0). ' + (wasDirty ? '<span class="c-r">It is dirty</span>, so it must be <b>written back to disk first</b> (after its log records are flushed — the WAL rule).' : 'It is clean, so we can simply drop it — the disk copy is identical.'), { lruHl: vh, frameHl: vf, mapKey: 'P' + victim, mapCls: 'bad', varHl: { misses: 'cur' } });
              if (wasDirty) st.dirty_writebacks++;
              delete where[victim]; delete dirty[victim]; lru.pop(); frame[fi] = null;
            }
            st.disk_reads++;
            frame[fi] = p; where[p] = fi; lru.unshift(p); dirty[p] = w;
            var lf = {}; lf[fi] = 'ok';
            push('Read P' + p + ' from disk into <b>frame ' + fi + '</b>, add it to the page table and put it at the MRU end' + (w ? ', then apply the write (dirty)' : '') + '.', { lruHl: { 0: 'ok' }, frameHl: lf, mapKey: 'P' + p, mapCls: 'ok', varHl: { disk_reads: 'cur', dirty_writebacks: 'cur' } });
          });
          var tot = st.hits + st.misses;
          push('Finished: ' + st.hits + ' hits / ' + tot + ' accesses = <b>' + Math.round(100 * st.hits / tot) + '% hit ratio</b>. Real OLTP systems aim for 99%+. Dirty pages still in RAM (*) are safe because their changes are already in the WAL; the checkpointer will flush them eventually.');
          return frames;
        }
      },
      {
        title: 'Scan pollution: plain LRU vs InnoDB midpoint insertion',
        input: '1 2 3 1 2 3 S1 S2 S3 S4 S5 1 2 3',
        inputLabel: 'Page ids (use S-prefixed ids for a one-off table scan), capacity 5',
        gen: function (input) {
          var toks = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
          if (toks.length < 3) throw new Error('Enter at least 3 page ids');
          if (toks.length > 24) throw new Error('Use at most 24 accesses');
          toks.forEach(function (t) { if (!/^[A-Za-z0-9]{1,4}$/.test(t)) throw new Error('Page ids must be short names like 1, 7, S3'); });
          var CAP = 5, OLD = 2, YCAP = CAP - OLD;
          var lru = [], young = [], old = [], h1 = 0, h2 = 0, frames = [];
          function push(narr, a, b) {
            frames.push({ narr: narr, parts: [
              { type: 'list', label: 'Plain LRU (MRU → LRU), 5 frames', values: lru.slice(), hl: a || {} },
              { type: 'list', label: 'Midpoint LRU: YOUNG sublist (3 frames, protected)', values: young.slice(), hl: (b && b.y) || {} },
              { type: 'list', label: 'Midpoint LRU: OLD sublist (new pages enter here)', values: old.slice(), hl: (b && b.o) || {} },
              { type: 'vars', label: 'Hits so far', vals: { plain_lru_hits: h1, midpoint_hits: h2 } }
            ] });
          }
          push('Both caches hold 5 pages. Plain LRU puts every new page at the front. InnoDB-style midpoint keeps a <b>young</b> list for pages that proved they are reused, and an <b>old</b> list where every newcomer starts.');
          toks.forEach(function (p) {
            var n1 = '', n2 = '', a = {}, b = { y: {}, o: {} };
            var i1 = lru.indexOf(p);
            if (i1 >= 0) { h1++; lru.splice(i1, 1); lru.unshift(p); a[0] = 'ok'; n1 = 'LRU: hit'; }
            else { var ev = ''; if (lru.length >= CAP) ev = lru.pop(); lru.unshift(p); a[0] = 'cur'; n1 = 'LRU: miss' + (ev ? ', evicted <span class="c-r">' + ev + '</span>' : ''); }
            var iy = young.indexOf(p), io = old.indexOf(p);
            if (iy >= 0) { h2++; young.splice(iy, 1); young.unshift(p); b.y[0] = 'ok'; n2 = 'Midpoint: hit in young'; }
            else if (io >= 0) {
              h2++; old.splice(io, 1); young.unshift(p); b.y[0] = 'sel'; n2 = 'Midpoint: hit in old → <b>promoted</b> to young (it proved it is reused)';
              while (young.length > YCAP) { var d = young.pop(); old.unshift(d); b.o[0] = 'cur'; n2 += '; young overflowed so ' + d + ' is demoted to the old head'; }
            } else {
              old.unshift(p); b.o[0] = 'cur'; n2 = 'Midpoint: miss, ' + p + ' enters at the <b>head of the old</b> sublist';
              if (young.length + old.length > CAP) { var e2 = old.length ? old.pop() : young.pop(); n2 += ', evicted <span class="c-r">' + e2 + '</span> from the old tail'; }
            }
            push('Access <b>' + p + '</b>. ' + n1 + '. ' + n2 + '.', a, b);
          });
          push('Result: plain LRU <b>' + h1 + '</b> hits vs midpoint <b>' + h2 + '</b> hits. The one-off scan pages (S*) only ever lived in the old sublist, so the hot pages in the young sublist survived. Real InnoDB also requires a page to stay in the old list for <code>innodb_old_blocks_time</code> (1 s) before promotion, so a scan that reads many rows from the same page quickly cannot sneak it into young.');
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Hit ratio from real counters',
        html: `<p>InnoDB exposes <code>Innodb_buffer_pool_read_requests</code> (logical reads) and <code>Innodb_buffer_pool_reads</code> (reads that went to disk). With 1,250,000 requests and 9,800 disk reads: hit ratio = 1 − 9800 / 1,250,000 = <b>99.22%</b>. Sounds great — but 9,800 misses × 100 µs = ~1 s of I/O wait spread over your queries. For latency, look at <b>misses per second</b>, not just the percentage.</p>`,
        code: eng(`SELECT ROUND(100.0 * (1 - 9800.0 / 1250000), 2) AS hit_ratio_pct,
       9800 * 100 / 1000 AS approx_io_ms_at_100us;`)
      },
      {
        title: 'Sizing: does the working set fit?',
        html: `<p>A 400 GB database where daily traffic touches the last 30 days of orders (≈ 25 GB of data pages + 8 GB of hot index pages). A <b>48 GB</b> buffer pool covers the ~33 GB working set with headroom → hit ratio near 99.9%. A <b>16 GB</b> pool would thrash: each miss evicts a page that will be needed again soon. Rule of thumb: InnoDB on a dedicated box gets 50–75% of RAM; Postgres gets ~25% for <code>shared_buffers</code> and relies on the OS page cache for the rest (<code>effective_cache_size</code> tells the planner about it).</p>`
      },
      {
        title: 'Clock-sweep by hand (Postgres)',
        html: `<p>4 buffers with usage counts [2, 0, 1, 3], hand at buffer 0, all unpinned. Need a victim:</p>
${H.table(['step', 'hand', 'usage before', 'action'], [['1', '0', '2', 'decrement → 1, move on'], ['2', '1', '0', H.c('r', 'evict buffer 1')]])}
<p>Accessing a buffer bumps its count (max 5), so popular pages survive several sweeps. It approximates LRU without a linked list that every reader would have to lock — a big win under high concurrency.</p>`
      },
      {
        title: 'The "report ruined my cache" incident',
        html: `<p>A 200 GB analytical <code>SELECT</code> runs on the primary each night. With plain LRU it would evict the entire hot set; the next morning every user request misses. Fixes, in order of preference: run reports on a <b>replica</b> or a column store; rely on midpoint insertion (InnoDB) or ring buffers (Postgres); after restarts, enable <code>innodb_buffer_pool_dump_at_shutdown</code>/<code>load_at_startup</code> or <code>pg_prewarm</code> to warm the cache.</p>`
      }
    ],
    deepDive: `<p><b>🟣 Why databases avoid mmap.</b> Letting the OS cache pages via <code>mmap</code> looks free, but the DB loses control: the OS may write a dirty page to disk <i>before</i> its WAL record is durable (breaking recovery), evicts by its own policy, stalls a thread on a page fault with no async alternative, and turns I/O errors into signals. The 2022 CIDR paper "Are You Sure You Want to Use MMAP in Your DBMS?" documents these; LMDB and early MongoDB (MMAPv1) are the famous mmap users, and MongoDB replaced it with WiredTiger.</p>
<p><b>Concurrency.</b> The page table and LRU list are hot shared structures. InnoDB splits the pool into <code>innodb_buffer_pool_instances</code> with separate mutexes; Postgres partitions its buffer mapping hash table into 128 lock partitions and uses clock-sweep to avoid a global list. Each page also has a <b>latch</b> (short-term read/write lock, different from transaction locks) protecting its bytes while a thread reads or modifies it.</p>
<p><b>Flushing strategy.</b> Writing dirty pages too slowly → checkpoints take forever and recovery is long; too fast → wasted I/O for pages that will be modified again. InnoDB's <b>adaptive flushing</b> watches redo log fill level and dirty ratio (<code>innodb_max_dirty_pages_pct</code>); Postgres spreads checkpoint writes with <code>checkpoint_completion_target = 0.9</code>. A "checkpoint spike" in latency graphs is the classic symptom of getting this wrong.</p>
<p><b>Huge pools.</b> With 500 GB pools, warm-up after restart can take hours of misses. Engines persist the list of cached page ids and reload them; cloud databases (Aurora, Neon) push caching into the storage layer so a compute restart keeps a warm cache nearby.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tuning assistants (and managed-DB "autopilot" features) read metrics like hit ratio, dirty percentage and checkpoint frequency and propose <code>innodb_buffer_pool_size</code> or <code>shared_buffers</code> changes. Ask an assistant to turn a <code>SHOW ENGINE INNODB STATUS</code> dump into a plain summary — it is good at that.</p>
<p><b>Use AI as a partner:</b> "Here are 24 hours of buffer pool metrics. Is the working set fitting in memory? What would happen if I halved the pool?" Then verify with a replay or a load test, not with the explanation alone.</p>
<p><b>Where AI goes wrong:</b> it recommends giving Postgres 75% of RAM for shared_buffers (that is InnoDB advice), treats a 99% hit ratio as automatically fine, or forgets that LLM-generated analytics queries can flood a cache shared with OLTP traffic.</p>
<p><b>What you must still own:</b> the fetch/evict/write-back algorithm, why pinned pages cannot be evicted, why commits do not flush data pages, and the trade-off between cache size, checkpoint cost and recovery time.</p>`,
    problems: [
      {
        title: 'Simulate an LRU Buffer Pool',
        level: 'Medium', tags: ['buffer pool', 'LRU', 'simulation'], companies: ['Google', 'Microsoft', 'Oracle', 'Snowflake'],
        statement: `<p>Given a buffer pool with <b>C</b> frames and a trace of page accesses (each a page id plus R or W), simulate LRU replacement. Report hits, misses, and how many <b>dirty pages had to be written back</b> on eviction. A W makes the page dirty; a page written back becomes clean only by leaving the pool.</p>`,
        constraints: `1 ≤ C ≤ 10<sup>5</sup>, trace length ≤ 10<sup>6</sup>. Each access must be O(1).`,
        example: `<p>C = 3, trace: 1R 2R 3W 1R 4R 1W 5R 2R 1R → ${H.c('g', 'hits = 3')} (1, 1, 1), ${H.c('r', 'misses = 6')}, ${H.c('y', 'write-backs = 1')}: page 3 is dirty when evicted by page 5.</p>`,
        brute: {
          why: `<p>Keep a plain list in recency order and use <code>list.remove</code> on every hit: each access costs O(C). With C = 10<sup>5</sup> and 10<sup>6</sup> accesses that is 10<sup>11</sup> operations.</p>`,
          code: { lang: 'python', run: true, code: `def simulate_slow(cap, trace):
    order, dirty = [], set()          # order[0] = LRU, order[-1] = MRU
    hits = misses = writebacks = 0
    for pid, op in trace:
        if pid in order:              # O(C) membership
            hits += 1
            order.remove(pid)         # O(C) removal
        else:
            misses += 1
            if len(order) == cap:
                victim = order.pop(0) # O(C) shift
                if victim in dirty:
                    writebacks += 1
                    dirty.discard(victim)
        order.append(pid)
        if op == "W":
            dirty.add(pid)
    return hits, misses, writebacks

trace = [(1,"R"),(2,"R"),(3,"W"),(1,"R"),(4,"R"),(1,"W"),(5,"R"),(2,"R"),(1,"R")]
print(simulate_slow(3, trace))` }
        },
        mcq: { q: 'Which pair of data structures gives O(1) LRU get and evict?', options: ['Hash map + doubly linked list', 'Min-heap keyed by time', 'Sorted array', 'Two stacks'], answer: 0, explain: 'The hash map finds the node in O(1); the linked list moves it to the MRU end and pops the LRU end in O(1). A heap would be O(log N).' },
        hints: [
          `<p>Hint 1: you need two things fast — "is page p cached?" and "which page is least recently used?". One structure cannot do both cheaply.</p>`,
          `<p>Hint 2: an ordered hash map (Python <code>OrderedDict</code>, Java <code>LinkedHashMap</code>) is exactly a hash map threaded by a doubly linked list: <code>move_to_end</code> and <code>popitem(last=False)</code> are O(1).</p>`,
          `<p>Hint 3: store the dirty flag as the map value. On a miss with a full pool, pop the oldest; if its flag is true, count a write-back. On W, set the flag after the access.</p>`
        ],
        tests: { sig: 'int int[] char[] -> int[]', fn: 'simulate', names: { python: 'run_lru' }, harness: { python: 'def run_lru(cap, pages, ops):\n    return list(simulate(cap, list(zip(pages, ops))))' }, cases: [
          [
            [
              3,
              [1, 2, 3, 1, 4, 1, 5, 2, 1],
              ['R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R']
            ],
            [3, 6, 1]
          ],
          [
            [
              1,
              [1, 2, 1, 2],
              ['W', 'R', 'W', 'R']
            ],
            [0, 4, 2]
          ],
          [
            [
              3,
              [5, 5, 5, 5],
              ['W', 'W', 'R', 'W']
            ],
            [3, 1, 0]
          ],
          [
            [
              4,
              [],
              []
            ],
            [0, 0, 0]
          ],
          [
            [
              10,
              [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
              ['W', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'R']
            ],
            [5, 5, 0]
          ],
          [
            [
              2,
              [1, 2, 1, 3, 1, 2],
              ['R', 'R', 'W', 'R', 'R', 'R']
            ],
            [2, 4, 0]
          ],
          [
            [
              2,
              [1, 2, 3, 1],
              ['W', 'W', 'R', 'R']
            ],
            [0, 4, 2]
          ],
          [
            [
              7,
              [4, 2, 3, 1, 9, 7, 10, 9, 6, 1, 4, 8, 4, 10, 4, 2, 3, 3, 9, 7, 3, 11, 3, 5, 4, 9, 2, 3, 2, 6, 3, 0, 3, 9, 1, 4, 1, 10, 10, 3, 1, 2, 8, 2, 5, 10, 4, 5, 7, 6, 3, 6, 7, 1, 1, 10, 10, 7, 5, 3, 9, 7, 8, 1, 0, 11, 9, 5, 3, 0, 6, 0, 10, 10, 9, 1, 11, 6, 8, 2, 5, 11, 4, 11, 10, 6, 5, 2, 7, 8, 0, 11, 11, 8, 3, 9, 4, 10, 4, 10, 1, 4, 9, 3, 10, 1, 10, 9, 6, 7, 8, 10, 10, 1, 0, 6, 3, 2, 6, 6, 7, 3, 9, 1, 9, 4, 4, 8, 2, 1, 6, 8, 11, 11, 3, 7, 8, 7, 6, 3, 0, 3, 6, 9, 9, 4, 1, 3, 4, 2, 6, 9, 5, 7, 2, 10, 0, 10, 5, 3, 0, 11, 8, 3, 2, 1, 3, 0, 0, 2, 4, 4, 8, 3, 5, 5, 10, 2, 10, 10, 11, 11, 1, 10, 6, 5, 8, 4, 1, 8, 7, 10, 9, 4, 11, 7, 10, 10, 5, 9, 9, 9, 1, 10, 1, 6, 3, 10, 7, 8, 4, 2, 5, 4, 2, 8, 2, 7, 3, 5, 9, 10, 0, 5, 6, 7, 9, 1, 7, 2, 1, 10, 0, 5, 10, 0, 10, 4, 1, 2, 7, 1, 3, 5, 6, 2, 2, 0, 4, 8, 2, 3, 0, 0, 2, 1, 4, 0, 0, 3, 4, 11, 10, 5, 4, 8, 4, 4, 2, 2, 8, 10, 11, 5, 1, 10, 8, 7, 5, 8, 3, 8, 11, 5, 11, 8, 0, 8, 4, 6, 7, 7, 11, 11, 7, 6, 9, 7, 7, 0, 4, 8, 8, 0, 0, 0, 11, 4, 2, 0, 8, 6, 4, 5, 8, 9, 7, 5, 11, 5, 0, 9, 11, 9, 4, 10, 6, 9, 2, 8, 0, 4, 3, 10, 9, 11, 8, 4, 1, 8, 2, 9, 10, 11, 0, 7, 2, 3, 5, 3, 4, 9, 10, 3, 2, 9, 5, 3, 1, 3, 7, 10, 6, 6, 9, 7, 2, 1, 10, 9, 4, 3, 8, 9, 6, 1, 5, 8, 0, 2, 5, 8, 0, 1, 5, 3, 3, 5, 6, 5, 8, 2, 11, 8, 1, 0, 2, 8, 10, 10, 9, 8, 6, 0, 5, 0, 11, 10, 5, 4, 9, 6, 7, 1, 8, 2, 4, 8, 11, 9, 7, 8, 8, 7, 10, 6, 7, 5, 8, 11, 9, 7, 11, 4, 6, 8, 8, 8, 5, 4, 8, 5, 2, 4, 2, 5, 5, 0, 3, 10, 5, 8, 8, 9, 6, 3, 9, 6, 8, 9, 6, 7, 11, 7, 6, 4, 9, 2, 11, 8, 0, 3, 10, 6, 4, 1, 11, 5, 6, 9, 3, 5, 8, 8, 7, 11, 1, 1, 9, 11, 8, 7, 3, 4, 1, 9, 2, 5, 9, 7],
              ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'W', 'W']
            ],
            [291, 209, 107]
          ],
          [
            [
              9,
              [36, 17, 24, 24, 13, 14, 37, 6, 18, 10, 4, 13, 25, 26, 25, 34, 17, 33, 15, 7, 23, 24, 30, 4, 14, 9, 9, 21, 9, 27, 29, 18, 7, 34, 29, 19, 33, 32, 1, 21, 29, 20, 9, 15, 23, 5, 27, 27, 31, 25, 8, 3, 38, 27, 6, 25, 20, 6, 26, 25, 15, 6, 22, 22, 5, 17, 38, 16, 31, 3, 4, 9, 14, 32, 8, 19, 1, 16, 7, 27, 34, 12, 24, 20, 17, 39, 30, 19, 29, 18, 8, 13, 1, 12, 15, 33, 17, 5, 24, 19, 18, 23, 31, 26, 35, 2, 23, 18, 3, 26, 13, 34, 16, 35, 28, 22, 2, 2, 38, 37, 17, 1, 25, 14, 20, 22, 33, 7, 8, 29, 6, 18, 24, 34, 28, 14, 1, 34, 17, 16, 7, 17, 34, 15, 24, 13, 33, 6, 16, 18, 8, 18, 32, 9, 21, 0, 14, 27, 36, 18, 29, 21, 28, 15, 1, 0, 24, 15, 34, 10, 35, 34, 25, 17, 21, 29, 38, 36, 30, 29, 35, 7, 11, 37, 6, 38, 23, 17, 32, 1, 17, 35, 21, 8, 12, 0, 11, 37, 1, 38, 5, 31, 34, 31, 3, 32, 4, 3, 27, 18, 17, 2, 15, 10, 7, 5, 21, 35, 24, 7, 19, 4, 30, 2, 37, 38, 27, 4, 9, 6, 18, 0, 17, 18, 24, 8, 25, 7, 7, 20, 22, 14, 22, 3, 10, 21, 24, 19, 38, 2, 8, 23, 30, 5, 11, 7, 37, 6, 25, 33, 23, 2, 14, 22, 22, 24, 6, 34, 10, 7, 10, 28, 14, 5, 25, 22, 32, 30, 33, 17, 23, 1, 5, 9, 35, 5, 11, 31, 18, 1, 2, 15, 19, 8, 37, 24, 4, 25, 26, 21, 26, 31, 11, 29, 17, 8, 24, 8, 28, 36, 38, 18, 21, 2, 14, 15, 20, 21, 2, 19, 10, 10, 18, 36, 32, 36, 3, 26, 3, 9, 2, 33, 7, 39, 19, 20, 6, 6, 39, 28, 17, 7, 17, 17, 20, 39, 30, 3, 6, 24, 17, 27, 12, 27, 10, 9, 1, 18, 14, 39, 11, 31, 24, 32, 16, 36, 9, 5, 1, 9, 9, 0, 10, 25, 27, 13, 12, 0, 38, 4, 12, 30, 16, 26, 15, 21, 33, 28, 21, 5, 17, 20, 13, 12, 30, 18, 29, 5, 2, 32, 10, 20, 7, 17, 1, 16, 14, 37, 30, 3, 35, 39, 15, 36, 18, 8, 22, 38, 30, 0, 11, 34, 1, 32, 39, 8, 21, 32, 22, 39, 20, 9, 38, 27, 22, 10, 5, 14, 4, 12, 39, 24, 27, 7, 38, 14, 14, 39, 11, 5, 6, 16, 9, 32, 36, 6, 4, 27, 26, 16, 38, 7, 24, 24, 13, 37, 31, 22, 20, 17, 8, 17, 4, 35, 39, 23, 30, 7, 27, 11, 3, 15, 33, 24, 31, 23, 29, 20, 2, 3, 36, 18, 38, 7, 7, 6, 24, 37, 8, 4, 10, 8, 29, 31, 0, 20, 17, 34, 37, 8, 18, 11, 5, 8, 4, 4, 2, 0, 8, 23, 21, 21, 3, 2, 21, 24, 10, 23, 9, 14, 14, 22, 23, 1, 26, 17, 7, 31, 9, 3, 10, 39, 26, 33, 7, 26, 16, 36, 0, 8, 14, 29, 22, 26, 31, 6, 18, 4, 14, 9, 2, 38, 34, 10, 24, 38, 23, 27, 31, 17, 38, 4, 16, 32, 34, 28, 5, 30, 37, 24, 31, 7, 26, 39, 12, 10, 2, 1, 3, 5, 21, 25, 27, 9, 16, 38, 37, 38, 37, 23, 38, 26, 22, 34, 5, 33, 15, 18, 2, 3, 14, 0, 29, 37, 25, 25, 15, 33, 29, 16, 30, 22, 15, 1, 33, 7, 23, 14, 28, 10, 19, 21, 16, 37, 4, 25, 30, 7, 9, 2, 22, 33, 34, 18, 36, 32, 2, 31, 20, 32, 27, 12, 29, 34, 27, 38, 4, 36, 32, 19, 16, 20, 31, 35, 18, 5, 37, 22, 25, 29, 10, 22, 3, 14, 7, 33, 19, 13, 11, 7, 16, 38, 7, 2, 11, 13, 3, 22, 16, 9, 27, 10, 28, 6, 16, 25, 24, 12, 36, 17, 21, 7, 31, 17, 32, 26, 20, 0, 30, 27, 17, 15, 39, 36, 15, 37, 30, 25, 2, 35, 22, 18, 7, 17, 22, 15, 3, 21, 26, 2, 17, 26, 32, 34, 15, 16, 19, 31, 22, 16, 39, 18, 26, 15, 17, 26, 13, 38, 9, 34, 24, 37, 11, 1, 36, 27, 4, 1, 14, 25, 32, 38, 25, 15, 32, 23, 38, 24, 17, 37, 5, 13, 27, 5, 5, 22, 36, 13, 22, 31, 27, 5, 22, 6, 7, 37, 7, 1, 39, 31, 28, 3, 30, 12, 14, 32, 34, 11, 6, 19, 24, 7, 25, 38, 13, 30, 4, 37, 7, 11, 24, 11, 39, 25, 19, 34, 24, 3, 31, 36, 15, 19, 21, 33, 9, 13, 14, 36, 9, 3, 15, 15, 19, 18, 9, 26, 22, 6, 19, 27, 4, 38, 21, 5, 27, 34, 5, 28, 7, 2, 35, 36, 9, 17, 14, 14, 31, 0, 9, 32, 28, 21, 3, 33, 37, 19, 23, 34, 4, 2, 34, 14, 34, 3, 15, 22, 16, 21, 24, 37, 18, 18, 33, 25, 4, 35, 12, 38, 37, 13, 19, 29, 13, 22, 17, 2, 34, 20, 2, 31, 27, 38, 33, 3, 36, 34, 19, 5, 9, 13, 37, 38, 21, 14, 12, 4, 5, 33, 3, 24, 9, 17, 36, 28, 20, 12, 20, 11, 33, 27, 27, 18, 39, 33, 19, 25, 3, 28, 32, 17, 36, 30, 4, 34, 19, 15, 3, 29, 11, 23, 29, 20, 9, 39, 7, 8, 23, 0, 26, 17, 16, 0, 39, 2, 15, 32, 37, 7, 20, 34, 23, 38, 22, 7, 17, 8, 19, 3, 10, 23, 15, 14, 24, 36, 27, 23, 10, 22, 36, 37, 25, 3, 0, 38, 38, 9, 11, 10, 24, 17, 9, 24, 19, 1, 28, 21, 9, 7, 9, 39, 12, 23, 0, 7, 3, 24, 36, 31, 22, 14, 28, 6, 28, 15, 26, 12, 16, 33, 19, 9, 39, 14, 29, 1, 37, 26, 7, 30, 11, 34, 9, 16, 28, 36, 6, 6, 7, 14, 31, 15, 14, 5, 25, 18, 31, 33, 15, 22, 7, 34, 8, 32, 2, 3, 13, 25, 6, 27, 19, 38, 27, 12, 34, 14, 7, 17, 38, 29, 7, 11, 29, 35, 32, 6, 10, 10, 11, 34, 14, 7, 39, 11, 0, 26, 14, 39, 7, 1, 14, 4, 19, 4, 8, 36, 33, 30, 36, 1, 4, 32, 20, 22, 30, 1, 38, 37, 27, 31, 34, 29, 33, 34, 3, 1, 5, 16, 15, 19, 5, 6, 22, 11, 1, 26, 23, 14, 8, 26, 34, 17, 18, 32, 31, 21, 5, 24, 1, 34, 30, 34, 11, 6, 2, 30, 1, 15, 26, 23, 22, 39, 6, 36, 11, 22, 7, 37, 7, 35, 35, 17, 12, 14, 32, 26, 22, 26, 12, 36, 35, 16, 38, 9, 17, 39, 1, 23, 15, 16, 17, 3, 4, 1, 28, 37, 33, 38, 36, 16, 25, 6, 3, 6, 0, 2, 31, 36, 15, 9, 25, 14, 39, 38, 25, 11, 13, 29, 9, 32, 14, 2, 0, 30, 23, 1, 18, 26, 18, 25, 4, 2, 25, 23, 24, 13, 12, 23, 19, 21, 26, 14, 32, 12, 30, 37, 23, 7, 38, 18, 13, 2, 1, 19, 3, 8, 21, 35, 35, 34, 7, 6, 10, 1, 17, 29, 36, 1, 12, 27, 28, 2, 27, 31, 2, 26, 19, 4, 18, 37, 3, 17, 10, 28, 9, 2, 3, 20, 22, 23, 25, 32, 24, 4, 39, 34, 24, 3, 26, 5, 7, 8, 38, 18, 10, 16, 1, 11, 2, 12, 16, 23, 14, 33, 16, 9, 21, 19, 36, 32, 35, 26, 32, 12, 19, 11, 13, 39, 34, 29, 29, 30, 18, 25, 22, 29, 12, 31, 9, 38, 11, 21, 15, 32, 17, 21, 4, 12, 30, 31, 5, 7, 29, 14, 16, 9, 24, 7, 5, 16, 5, 30, 1, 8, 11, 7, 24, 20, 33, 1, 1, 33, 35, 24, 2, 0, 36, 18, 12, 9, 3, 3, 1, 22, 18, 0, 11, 39, 35, 14, 8, 8, 22, 20, 37, 8, 35, 5, 13, 7, 15, 38, 9, 12, 29, 11, 25, 35, 10, 14, 8, 11, 9, 22, 18, 20, 5, 3, 33, 27, 25, 13, 38, 28, 33, 29, 24, 15, 39, 23, 2, 0, 38, 13, 9, 27, 18, 39, 32, 23, 32, 17, 31, 18, 29, 37, 3, 24, 28, 8, 27, 22, 15, 18, 38, 33, 16, 2, 2, 30, 5, 31, 15, 9, 3, 20, 14, 5, 11, 22, 15, 1, 10, 37, 31, 36, 24, 19, 20, 29, 11, 2, 35, 7, 29, 6, 12, 18, 22, 12, 32, 9, 33, 27, 23, 28, 18, 1, 7, 22, 12, 38, 2, 4, 28, 4, 10, 37, 20, 18, 13, 39, 30, 13, 13, 0, 20, 36, 20, 27, 31, 3, 26, 36, 23, 29, 11, 17, 17, 34, 16, 27, 23, 33, 24, 6, 3, 11, 37, 3, 6, 14, 36, 9, 21, 12, 20, 20, 13, 33, 36, 14, 21, 17, 20, 17, 20, 13, 10, 31, 21, 36, 32, 33, 35, 39, 29, 14, 37, 33, 38, 36, 39, 26, 29, 24, 18, 4, 12, 19, 4, 32, 36, 23, 29, 33, 20, 15, 30, 23, 13, 12, 28, 21, 25, 16, 27, 12, 7, 37, 15, 39, 26, 7, 10, 22, 8, 19, 10, 26, 26, 4, 24, 13, 5, 7, 37, 3, 22, 1, 23, 30, 14, 8, 5, 28, 24, 5, 33, 4, 39, 6, 17, 11, 34, 27, 15, 12, 1, 29, 15, 29, 4, 29, 4, 15, 35, 13, 11, 30, 10, 19, 14, 29, 25, 9, 18, 20, 15, 8, 15, 37, 27, 21, 34, 16, 23, 23, 0, 8, 27, 7, 10, 3, 11, 35, 9, 38, 31, 38, 25, 5, 39, 19, 11, 36, 12, 23, 9, 29, 34, 33, 18, 15, 1, 20, 12, 13, 25, 21, 30, 39, 28, 0, 13, 26, 8, 29, 26, 5, 33, 35, 2, 26, 26, 33, 11, 38, 5, 31, 11, 29, 9, 31, 0, 10, 5, 28, 20, 33, 23, 16, 25, 10, 31, 13, 26, 18, 4, 7, 27, 15, 17, 22, 37, 23, 5, 12, 4, 29, 5, 9, 13, 21, 23, 24, 4, 14, 32, 36, 13, 14, 15, 21, 0, 2, 19, 22, 24, 4, 7, 36, 0, 3, 4, 24, 36, 30, 14, 6, 0, 29, 32, 37, 25, 10, 17, 36, 1, 0, 31, 27, 5, 16, 1, 16, 23, 20, 34, 30, 2, 34, 28, 14, 4, 16, 10, 28, 22, 13, 24, 27, 16, 38, 20, 2, 38, 1, 39, 32, 4, 7, 8, 21, 17, 18, 27, 28, 8, 16, 4, 13, 9, 19, 21, 39, 15, 17, 26, 28, 12, 28, 10, 0, 12, 29, 8, 9, 35, 13, 17, 11, 24, 32, 15, 21, 6, 8, 3, 31, 37, 7, 3, 26, 32, 28, 5, 23, 22, 36, 10, 25, 23, 5, 27, 9, 39, 3, 11, 12, 38, 23, 3, 12, 33, 5, 0, 28, 24, 5, 32, 5, 17, 1, 17, 4, 0, 18, 23, 38, 4, 21, 13, 14, 1, 26, 13, 7, 24, 10, 2, 7, 21, 12, 9, 35, 37, 6, 5, 6, 22, 38, 15, 18, 1, 19, 29, 37, 9, 6, 35, 22, 17, 22, 29, 35, 24, 19, 2, 14, 39, 9, 34, 7, 20, 17, 3, 18, 19, 12, 34, 20, 0, 10, 2, 15, 16, 22, 8, 0, 30, 17, 11, 23, 34, 29, 18, 2, 29, 16, 32, 28, 11, 19, 28, 1, 19, 1, 23, 27, 34, 30, 27, 19, 29, 6, 31, 7, 29, 24, 36, 22, 38, 27, 21, 29, 28, 8, 37, 6, 23, 39, 38, 10, 35, 21, 36, 15, 15, 9, 20, 38, 30, 19, 13, 33, 0, 18, 36, 9, 11, 15, 12, 11, 17, 7, 28, 34, 25, 28, 25, 20, 33, 14, 9, 14, 32, 19, 5, 36, 7, 12, 33, 37, 35, 25, 11, 20, 12, 16, 23, 35, 25, 28, 28, 30, 34, 34, 22, 31, 27, 14, 31, 4, 0, 30, 6, 36, 3, 23, 16, 21, 10, 9, 24, 13, 10, 6, 30, 38, 30, 5, 16, 0, 10, 16, 22, 35, 12, 7, 8, 5, 20, 6, 20, 4, 12, 12, 3, 26, 6, 18, 6, 25, 30, 29, 30, 21, 21, 22, 1, 11, 19, 0, 36, 21, 19, 38, 26, 18, 34, 21, 3, 3, 34, 34, 15, 31, 38, 31, 29, 18, 25, 0, 39, 26, 26, 19, 37, 16, 31, 18, 12, 23, 14, 7, 25, 38, 17, 29, 37, 14, 11, 27, 21, 18, 34, 30, 11, 11, 5, 38, 25, 7, 3, 11, 39, 8, 28, 10, 15, 34, 14, 35, 34, 9, 9, 24, 15, 25, 21, 2, 16, 2, 37, 30, 25, 6, 19, 3, 32, 33, 37, 23, 1, 35, 24, 4, 10, 17, 11, 18, 33, 34, 23, 34, 28, 29, 22, 36, 19, 5, 30, 36, 5, 17, 30, 9, 22, 33, 2, 18, 9, 0, 17, 2, 21, 39, 32, 8, 18, 26, 24, 2, 15, 4, 27, 31, 36, 9, 10, 10, 24, 36, 6, 3, 36, 21, 16, 24, 17, 8, 32, 34, 26, 2, 23, 34, 18, 33, 25, 14, 5, 27, 35, 21, 33, 27, 4, 34, 22, 2, 0, 28, 32, 22, 35, 30, 2, 19, 2, 9, 30, 13, 13, 21, 1, 16, 18, 3, 8, 35, 34, 37, 15, 38, 20, 24, 27, 13, 35, 39, 37, 10, 36, 19, 36, 5, 26, 24, 29, 10, 27, 4, 37, 0, 15, 5, 8, 22, 25, 8, 5, 16, 34, 14, 34, 34, 28, 14, 9, 30, 7, 37, 23, 4, 11, 29, 28, 10, 8, 30, 29, 12, 21, 28, 16, 14, 21, 2, 19, 26, 15, 26, 21, 7, 21, 33, 34, 22, 37, 30, 15, 28, 5, 34, 38, 23, 30, 31, 20, 20, 32, 3, 13, 32, 1, 13, 34, 35, 37, 21, 6, 10, 23, 17, 15, 3, 12, 30, 9, 11, 19, 13, 13, 31, 3, 22, 1, 31, 5, 25, 11, 8, 2, 33, 34, 20, 2, 39, 7, 13, 12, 14, 17, 19, 0, 2, 37, 15, 14, 25, 2, 39, 9, 38, 37, 29, 11, 14, 25, 5, 22, 27, 17, 38, 23, 25, 21, 29, 7, 7, 32, 36, 11, 15, 14, 31, 37, 35, 0, 6, 12, 9, 10, 39, 38, 26, 6, 21, 15, 27, 10, 21, 38, 4, 17, 23, 31, 33, 17, 28, 12, 38, 39, 20, 0, 26, 29, 28, 17, 3, 36, 24, 17, 10, 16, 3, 4, 21, 38, 11, 9, 0, 9, 4, 21, 4, 28, 7, 37, 33, 16, 33, 0, 20, 15, 13, 26, 14, 31, 20, 8, 31, 36, 7, 37, 16, 7, 36, 19, 8, 18, 15, 9, 22, 29, 0, 24, 29, 8, 19, 7, 35, 10, 32, 9, 33, 5, 23, 23, 0, 24, 19, 10, 32, 23, 38, 15, 2, 34, 35, 18, 7, 9, 20, 2, 13, 14, 29, 7, 11, 23, 4, 20, 31, 2, 24, 35, 29, 8, 9, 14, 30, 3, 29, 25, 31, 12, 37, 21, 5, 15, 10, 13, 11, 31, 23, 8, 19, 12, 13, 13, 37, 4, 6, 38, 27, 9, 15, 20, 31, 0, 14, 22, 25, 30, 36, 26, 12, 31, 32, 29, 25, 24, 7, 33, 8, 23, 30, 0, 20, 38, 22, 6, 19, 12, 6, 3, 33, 2, 0, 6, 1, 32, 16, 26, 17, 21, 12, 33, 22, 7, 30, 26, 28, 3, 5, 9, 32, 30, 1, 14, 13, 38, 11, 22, 11, 8, 18, 2, 24, 6, 20, 9, 12, 36, 2, 26, 37, 15, 33, 13, 37, 32, 16, 25, 26, 16, 12, 5, 1, 14, 22, 17, 19, 28, 21, 4, 25, 30, 20, 23, 12, 22, 6, 39, 8, 17, 39, 10, 13, 23, 29, 2, 11, 36, 26, 35, 26, 17, 14, 13, 9, 23, 0, 5, 17, 11, 9, 32, 37, 10, 8, 23, 27, 9, 3, 30, 31, 37, 35, 29, 21, 23, 11, 22, 24, 8, 7, 4, 2, 11, 33, 34, 4, 25, 35, 8, 30, 38, 0, 11, 20, 33, 1, 23, 22, 5, 34, 2, 11, 17, 26, 13, 5, 6, 10, 5, 3, 24, 33, 39, 4, 28, 33, 0, 29, 23, 14, 0, 16, 20, 32, 19, 36, 0, 20, 7, 38, 20, 39, 9, 9, 26, 34, 27, 1, 17, 30, 18, 7, 29, 26, 14, 37, 3, 13, 32, 11, 38, 30, 25, 26, 27, 25, 5, 7, 10, 28, 35, 6, 37, 27, 1, 17, 39, 38, 0, 36, 6, 5, 19, 34, 27, 19, 30, 25, 25, 17, 22, 15, 1, 0, 14, 35, 21, 22, 38, 6, 24, 38, 25, 18, 24, 36, 19, 5, 36, 11, 26, 27, 15, 9, 33, 34, 23, 16, 16, 1, 23, 25, 5, 27, 9, 12, 2, 8, 16, 21, 13, 14, 4, 28, 32, 21, 28, 3, 11, 25, 13, 29, 17, 36, 0, 14, 14, 27, 18, 6, 34, 16, 30, 17, 21, 34, 29, 10, 31, 19, 1, 15, 13, 22, 14, 20, 11, 3, 35, 6, 0, 9, 33, 7, 8, 20, 38, 6, 8, 11, 4, 14, 31, 29, 35, 36, 5, 4, 7, 33, 3, 36, 35, 0, 21, 16, 33, 36, 31, 38, 7, 28, 15, 25, 17, 4, 11, 32, 10, 26, 18, 36, 36, 34, 19, 9, 27, 9, 11, 26, 36, 32, 2, 32, 32, 20, 38, 9, 21, 10, 21, 34, 38, 9, 16, 25, 28, 8, 39, 9, 36, 10, 29, 0, 34, 25, 26, 32, 4, 30, 0, 1],
              ['R', 'W', 'R', 'W', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'W', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'R', 'W', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R']
            ],
            [612, 2388, 894]
          ],
          [
            [
              1,
              [1, 3, 1, 0, 4, 4, 4, 1, 2, 1, 2, 2, 0, 4, 2, 2, 1, 1, 1, 4, 0, 2, 0, 1, 2, 2, 3, 1, 4, 0, 0, 4, 2, 3, 4, 3, 4, 0, 2, 4, 0, 1, 4, 4, 3, 2, 4, 0, 3, 1, 4, 1, 1, 3, 0, 1, 3, 1, 1, 1, 1, 3, 4, 0, 0, 1, 4, 4, 1, 3, 2, 4, 1, 0, 2, 1, 4, 0, 2, 4, 1, 2, 4, 2, 0, 3, 4, 2, 1, 3, 4, 3, 0, 0, 4, 1, 2, 2, 4, 1, 1, 4, 1, 3, 3, 3, 0, 0, 1, 3, 0, 4, 0, 3, 1, 1, 2, 3, 0, 3, 1, 1, 3, 1, 3, 3, 4, 0, 1, 0, 3, 3, 4, 4, 3, 0, 4, 3, 2, 2, 3, 1, 2, 2, 1, 1, 3, 2, 3, 2, 4, 3, 0, 2, 0, 0, 3, 1, 4, 3, 2, 1, 2, 0, 1, 1, 3, 3, 4, 4, 3, 3, 0, 3, 1, 0, 3, 0, 4, 1, 1, 2, 0, 4, 1, 2, 4, 2, 3, 0, 4, 4, 0, 4, 1, 2, 4, 0, 2, 1, 4, 3, 2, 4, 1, 1, 4, 2, 4, 4, 0, 2, 1, 1, 1, 1, 4, 2, 2, 0, 1, 4, 3, 1, 2, 3, 1, 0, 1, 0, 2, 1, 1, 0, 4, 0, 4, 3, 1, 1, 1, 4, 0, 3, 3, 1, 3, 4, 4, 1, 0, 0, 2, 4, 3, 0, 3, 4, 0, 4, 0, 4, 3, 2, 3, 2, 4, 2, 2, 3, 4, 0, 1, 4, 0, 0, 4, 3, 3, 1, 2, 2, 3, 4, 2, 0, 2, 0, 3, 1, 2, 4, 2, 2, 3, 1, 1, 1, 2, 4, 0, 0, 2, 4, 3, 1, 1, 2, 4, 2, 3, 3, 1, 2, 4, 1, 0, 3, 2, 1, 2, 2, 3, 3, 1, 1, 2, 4, 2, 1, 3, 2, 0, 1, 4, 4, 2, 2, 4, 2, 2, 3, 0, 2, 4, 4, 1, 1, 0, 0, 4, 4, 0, 3, 1, 2, 3, 3, 0, 2, 4, 0, 0, 4, 1, 4, 2, 1, 0, 1, 1, 3, 0, 0, 4, 2, 4, 1, 0, 0, 3, 2, 3, 3, 0, 3, 4, 2, 2, 0, 0, 1, 2, 0, 3, 1, 4, 4, 2, 4],
              ['W', 'W', 'R', 'W', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'W', 'W', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'W', 'W', 'W', 'W', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'W', 'R', 'W', 'R', 'R', 'W', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'W', 'R', 'W', 'R', 'R', 'W', 'W', 'R', 'W', 'W', 'W', 'R', 'R', 'R', 'W', 'R', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'W', 'R', 'R', 'R', 'R', 'W', 'R', 'R', 'W', 'W', 'W', 'R', 'R', 'W', 'R', 'R', 'W', 'R', 'R', 'R', 'R']
            ],
            [77, 323, 118]
          ],
          [
            [
              1000,
              { $range: [0, 200000] },
              { $rep: 'W', n: 200000 }
            ],
            [0, 200000, 199000]
          ],
          [
            [
              1000,
              { $concat: [
                  { $range: [0, 1001] },
                  { $range: [0, 1001] },
                  { $range: [0, 1001] },
                  { $range: [0, 1001] },
                  { $range: [0, 1001] }
                ] },
              { $rep: 'R', n: 5005 }
            ],
            [0, 5005, 0]
          ],
          [
            [
              100000,
              { $concat: [
                  { $range: [0, 100000] },
                  { $range: [0, 100000] }
                ] },
              { $rep: 'R', n: 200000 }
            ],
            [100000, 100000, 0]
          ]
        ] },
        solution: {
          approach: `<p>Use an <code>OrderedDict</code> mapping page → dirty flag, ordered LRU → MRU. Hit: move to end. Miss: evict from the front when full (counting dirty write-backs), then insert at the end. Every step is O(1).</p>`,
          code: { lang: 'python', run: true, code: `from collections import OrderedDict

def simulate(cap, trace):
    pool = OrderedDict()                     # page -> dirty?, ordered LRU -> MRU
    hits = misses = writebacks = 0
    for pid, op in trace:
        if pid in pool:
            hits += 1
            pool.move_to_end(pid)            # O(1)
        else:
            misses += 1
            if len(pool) == cap:
                victim, was_dirty = pool.popitem(last=False)   # O(1) evict LRU
                writebacks += was_dirty
            pool[pid] = False
        if op == "W":
            pool[pid] = True
    return hits, misses, writebacks

trace = [(1,"R"),(2,"R"),(3,"W"),(1,"R"),(4,"R"),(1,"W"),(5,"R"),(2,"R"),(1,"R")]
print("hits, misses, writebacks =", simulate(3, trace))` },
          alt: [java(`class LruSim {
    static int[] simulate(int cap, int[] pages, char[] ops) {
        LinkedHashMap<Integer, Boolean> pool = new LinkedHashMap<>(16, 0.75f, true);
        int hits = 0, misses = 0, writeBacks = 0;
        for (int i = 0; i < pages.length; i++) {
            int p = pages[i];
            if (pool.containsKey(p)) { hits++; pool.get(p); }          // get() refreshes recency
            else {
                misses++;
                if (pool.size() == cap) {
                    Map.Entry<Integer, Boolean> eldest = pool.entrySet().iterator().next();
                    if (eldest.getValue()) writeBacks++;
                    pool.remove(eldest.getKey());
                }
                pool.put(p, false);
            }
            if (ops[i] == 'W') pool.put(p, true);
        }
        return new int[]{hits, misses, writeBacks};
    }
}`)],
          dry: { head: ['access', 'result', 'pool LRU→MRU', 'write-backs'], rows: [['1R', 'miss', '1', '0'], ['2R', 'miss', '1 2', '0'], ['3W', 'miss', '1 2 3*', '0'], ['1R', 'hit', '2 3* 1', '0'], ['4R', 'miss, evict 2', '3* 1 4', '0'], ['1W', 'hit', '3* 4 1*', '0'], ['5R', 'miss, evict 3*', '4 1* 5', H.c('y', '1')], ['2R', 'miss, evict 4', '1* 5 2', '1'], ['1R', 'hit', '5 2 1*', '1']] },
          complexity: `<p>O(1) per access, O(N) total time; O(C) memory.</p>`,
          followUps: ['Add pin counts: skip pinned victims, and raise an error if every frame is pinned.', 'Implement Clock (second chance) instead and compare hit ratios on a looping trace.', 'Why does LRU score 0 hits on a cyclic scan of C+1 pages, and which policy fixes it?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 3 — Write-ahead log and crash recovery (ARIES idea)
     ===================================================================== */
  topics.push({
    title: 'Write-Ahead Logging & Crash Recovery (the ARIES Idea)',
    analogy: `<p>A shop owner keeps a <b>diary</b> next to the till. Before moving any money between drawers, they first write one line in the diary: "10:02 — moved ₹500 from drawer A to drawer B (A was 900, now 400)". Writing a line is quick; rearranging drawers is slow, so they do it whenever convenient. If the lights go out mid-shuffle, they open the diary next morning: <b>redo</b> every line that the drawers do not reflect yet, then <b>undo</b> the lines from customers who never finished paying. The diary is the truth; the drawers just catch up.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Changing data pages in place on every commit would be slow (random writes all over the disk) and unsafe (a crash halfway leaves a mess). So engines write a <b>log first</b>: a sequential, append-only file of small records describing each change. A transaction is <b>committed the moment its log records are durable</b>; the actual data pages are written later, lazily, by the buffer pool.</p>
<p><b>The two WAL rules</b> (memorise these):</p>
<ol>
<li><b>Undo rule</b> — before a dirty page is written to disk, every log record that changed it must already be on disk (<code>pageLSN ≤ flushedLSN</code>). Otherwise an uncommitted change could reach disk with no record of how to undo it.</li>
<li><b>Redo rule</b> — before a commit is acknowledged, all of that transaction's log records (including the COMMIT record) must be on disk. Otherwise a "committed" change could vanish.</li>
</ol>
<p><b>Vocabulary.</b> Every log record gets an increasing <b>LSN</b> (log sequence number). Each page stores <b>pageLSN</b> = the LSN of the last change applied to it. The engine tracks <b>flushedLSN</b> = how far the log is safely on disk. An UPDATE record carries <b>redo info</b> (the new value / how to re-apply) and <b>undo info</b> (the old value / how to reverse), plus <b>prevLSN</b> linking the transaction's records backward.</p>
<p><b>Buffer policies this enables:</b> ${H.c('b', 'STEAL')} — a dirty page with uncommitted changes <i>may</i> be written to disk (needed when RAM is tight), which is why we need <b>undo</b>. ${H.c('b', 'NO-FORCE')} — committed pages need <i>not</i> be written at commit, which is why we need <b>redo</b>. Steal + no-force is the fastest combination, and ARIES is the recovery algorithm that makes it safe.</p>
<p><b>ARIES recovery after a crash, in three passes:</b></p>
${H.table(['pass', 'direction', 'what it does'], [['1. Analysis', 'forward from last checkpoint', 'rebuild the dirty page table and active transaction table; decide <b>winners</b> (committed) and <b>losers</b> (not)'], ['2. Redo', 'forward from the smallest recLSN', '<b>repeat history</b>: re-apply every logged change (even losers!) whose LSN &gt; pageLSN'], ['3. Undo', 'backward', 'roll back losers in reverse LSN order, writing a <b>CLR</b> (compensation log record) for each undo step']])}
<p><b>Checkpoints</b> limit how much log recovery must read. A <i>fuzzy</i> checkpoint does not stop the world: it just writes the current dirty page table (each page's <b>recLSN</b> = first LSN that dirtied it) and active transaction table into the log. Redo starts at the minimum recLSN; older log segments can be recycled.</p>
<p><b>In real systems:</b> PostgreSQL's WAL is essentially <b>redo-only</b> — MVCC keeps old row versions, so an aborted transaction's rows are simply invisible (its status in the commit log says "aborted"). InnoDB has a <b>redo log</b> plus <b>undo logs</b> (stored in undo tablespaces, themselves protected by redo) and follows the ARIES pattern. SQLite offers a <b>rollback journal</b> (copy the original page out first, undo-style) or <b>WAL mode</b> (append new page images to a <code>-wal</code> file; readers consult it; a <b>checkpoint</b> copies pages back into the main file).</p>`,
    clues: [
      '"How does the database survive a power failure?" / "what does commit actually do?" → WAL + fsync of the log, data pages later',
      '"Why is the log written before the data?" → the two WAL rules; steal/no-force',
      '"Explain ARIES" / "redo vs undo" / "repeating history" / "CLR" → three-pass recovery',
      '"Recovery takes 20 minutes after a crash" → checkpoint interval / max_wal_size / innodb_log_file_size too big, redo work bounded by the oldest dirty page',
      '"synchronous_commit = off" / "innodb_flush_log_at_trx_commit = 2" → trading the last few ms/s of commits for throughput',
      '"group commit" / "fsync is the bottleneck" → batch many transactions into one log flush'
    ],
    code: [
      lab(`-- SQLite journaling modes. On a file database journal_mode=WAL returns 'wal';
-- this in-memory playground returns 'memory' (in-memory DBs never need a journal on disk).
PRAGMA journal_mode;                -- DELETE (classic rollback journal) on a fresh file DB
PRAGMA journal_mode = WAL;          -- switch to write-ahead logging
PRAGMA synchronous = NORMAL;        -- in WAL mode: fsync at checkpoints, not every commit (fast; may lose the last commits on power loss, never corrupts)
PRAGMA wal_autocheckpoint;          -- copy WAL pages back into the main file every 1000 pages (default)
CREATE TABLE acct (id INTEGER PRIMARY KEY, bal INTEGER NOT NULL);
INSERT INTO acct VALUES (1, 900), (2, 100);
BEGIN;
  UPDATE acct SET bal = bal - 500 WHERE id = 1;
  UPDATE acct SET bal = bal + 500 WHERE id = 2;
COMMIT;                             -- durable once the WAL frames (with a commit marker) are synced
PRAGMA wal_checkpoint(TRUNCATE);    -- force a checkpoint and reset the WAL file (no-op in memory)
SELECT * FROM acct;`, 'Journal modes and checkpoints in SQLite (▶ Run)'),
      py(`import io
import json
import zlib

# A toy key-value store with a write-ahead log and crash recovery.
# Log record framing: <crc32 8 hex chars> <json payload>, one per line.
# The "disk" is two BytesIO objects so the demo is fully self-contained.


class ToyWalStore:
    def __init__(self, log_file, data_snapshot):
        self.log = log_file                  # durable log (append-only)
        self.data = dict(data_snapshot)      # pages already on "disk"
        self.mem = dict(self.data)           # buffer pool view
        self.next_lsn = 1

    def _append(self, rec):
        rec["lsn"] = self.next_lsn
        self.next_lsn += 1
        payload = json.dumps(rec, sort_keys=True)
        crc = "%08x" % zlib.crc32(payload.encode())
        self.log.write((crc + " " + payload + "|").encode())   # '|' ends a record
        return rec["lsn"]

    def put(self, txn, key, value):
        before = self.mem.get(key)
        self._append({"t": "U", "txn": txn, "k": key, "before": before, "after": value})
        self.mem[key] = value                # change only in RAM (no-force)

    def commit(self, txn):
        self._append({"t": "C", "txn": txn})
        self.log.flush()                     # real code: os.fsync(log_fd) here = the durability point


def read_log(raw):
    """Parse records, stopping at the first torn / corrupt one (the crash point)."""
    out = []
    for chunk in raw.decode(errors="replace").split("|"):
        if not chunk:
            continue
        crc, _, payload = chunk.partition(" ")
        if "%08x" % zlib.crc32(payload.encode()) != crc:
            print("  torn record detected, ignoring log tail:", chunk[:30] + "...")
            break
        out.append(json.loads(payload))
    return out


def recover(raw_log, disk_data):
    recs = read_log(raw_log)
    winners = {r["txn"] for r in recs if r["t"] == "C"}              # 1) analysis
    state = dict(disk_data)
    for r in recs:                                                   # 2) redo: repeat history
        if r["t"] == "U":
            state[r["k"]] = r["after"]
    for r in reversed(recs):                                         # 3) undo losers, newest first
        if r["t"] == "U" and r["txn"] not in winners:
            if r["before"] is None:
                state.pop(r["k"], None)
            else:
                state[r["k"]] = r["before"]
    return state, winners


log = io.BytesIO()
store = ToyWalStore(log, {"alice": 900, "bob": 100})
store.put("T1", "alice", 400)
store.put("T1", "bob", 600)
store.commit("T1")                                  # T1 is durable
store.put("T2", "alice", 0)                         # T2 never commits
store.put("T2", "carol", 999)
raw = log.getvalue()
crashed = raw[:-25]                                 # power cut tears the last record
print("disk pages at crash:", {"alice": 900, "bob": 100})
state, winners = recover(crashed, {"alice": 900, "bob": 100})
print("winners:", sorted(winners))
print("recovered state:", state)`, 'Toy WAL with CRC framing, torn-tail detection and redo/undo (▶ Run)'),
      eng(`-- Recovery decisions straight from the log (engine lab DB).
-- Redo pass: re-apply an UPDATE only if the page on disk is older than the record.
SELECT l.lsn, l.txn, l.page, l.before_val, l.after_val, d.page_lsn AS disk_page_lsn,
       CASE WHEN l.lsn > d.page_lsn THEN 'REDO' ELSE 'skip: already on disk' END AS redo_decision,
       CASE WHEN l.txn IN (SELECT txn FROM wal_log WHERE kind = 'COMMIT') THEN 'winner' ELSE 'LOSER: undo later' END AS fate
FROM wal_log l JOIN disk_pages d ON d.page = l.page
WHERE l.kind = 'UPDATE'
ORDER BY l.lsn;`, 'Redo decisions by comparing LSN with pageLSN (▶ Run)')
    ],
    codeTitle: ['SQLite WAL mode', 'Toy WAL + recovery', 'Redo decisions in SQL'],
    viz: {
      title: 'WAL append → crash → Analysis / Redo / Undo',
      input: 'T1 A=5; T2 B=7; T1 commit; flush B; T2 C=9; T3 A=8; T3 commit; T2 D=4; crash',
      inputLabel: 'Ops separated by ; — "T1 A=5" update, "T1 commit", "flush A" (write page to disk), "crash"',
      gen: function (input) {
        var ops = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!ops.length) throw new Error('Enter ops like: T1 A=5; T1 commit; crash');
        if (ops.length > 14) throw new Error('Use at most 14 operations');
        var log = [], flushed = 0, buf = {}, disk = {}, committed = {}, frames = [], crashed = false;
        'ABCDEFGH'.split('').forEach(function (p) { disk[p] = { val: 0, lsn: 0 }; });
        function recStr(r) {
          if (r.type === 'UPD') return r.lsn + ': ' + r.txn + ' ' + r.page + ' ' + r.before + '→' + r.after;
          if (r.type === 'CLR') return r.lsn + ': CLR ' + r.txn + ' ' + r.page + '←' + r.after;
          return r.lsn + ': ' + r.txn + ' ' + r.type;
        }
        function pagesTouched() {
          var s = {}; log.forEach(function (r) { if (r.page) s[r.page] = 1; }); Object.keys(buf).forEach(function (p) { s[p] = 1; });
          var k = Object.keys(s).sort(); return k.length ? k : ['A'];
        }
        function push(narr, o) {
          o = o || {};
          var hl = {};
          log.forEach(function (r, i) { if (r.lsn > flushed) hl[i] = 'win'; });
          if (o.logHl) for (var k in o.logHl) hl[k] = o.logHl[k];
          var rows = [], thl = {};
          pagesTouched().forEach(function (p, i) {
            rows.push([p, buf[p] ? buf[p].val : '—', buf[p] ? buf[p].lsn : '—', disk[p].val, disk[p].lsn]);
            if (o.page === p) thl[i] = o.pageCls || 'cur';
          });
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'Write-ahead log (blue = still only in RAM, not yet fsynced)', values: log.length ? log.map(recStr) : ['(empty)'], hl: hl },
            { type: 'table', label: crashed ? 'Pages during recovery (buffer = rebuilt in RAM)' : 'Pages: buffer pool vs disk', columns: ['page', 'buffer val', 'buffer pageLSN', 'disk val', 'disk pageLSN'], rows: rows, hl: thl },
            { type: 'vars', label: 'Log state', vals: o.vars || { flushedLSN: flushed, lastLSN: log.length ? log[log.length - 1].lsn : 0, committed: Object.keys(committed).join(',') || '—' }, hl: o.varHl || {} }
          ] });
        }
        function flushLog() { if (log.length) flushed = log[log.length - 1].lsn; }
        push('Start: every page holds 0 on disk, the buffer pool is empty and the log is empty. Blue log entries will mean "appended in RAM but not yet fsynced".');
        for (var oi = 0; oi < ops.length && !crashed; oi++) {
          var op = ops[oi], m;
          if ((m = /^(T\d{1,2})\s+([A-H])\s*=\s*(-?\d{1,4})$/i.exec(op))) {
            var t = m[1].toUpperCase(), p = m[2].toUpperCase(), v = +m[3];
            if (committed[t]) throw new Error(t + ' already committed — use a new transaction id');
            if (!buf[p]) buf[p] = { val: disk[p].val, lsn: disk[p].lsn };
            var r = { lsn: log.length + 1, txn: t, type: 'UPD', page: p, before: buf[p].val, after: v };
            log.push(r); buf[p].val = v; buf[p].lsn = r.lsn;
            var h = {}; h[log.length - 1] = 'cur';
            push('<b>' + t + ' sets ' + p + ' = ' + v + '.</b> First append log record LSN ' + r.lsn + ' (undo info: ' + r.before + ', redo info: ' + v + '), then change the page <b>in the buffer pool only</b> and stamp pageLSN = ' + r.lsn + '. Nothing touched the data file.', { logHl: h, page: p });
          } else if ((m = /^(T\d{1,2})\s+commit$/i.exec(op))) {
            var t2 = m[1].toUpperCase();
            log.push({ lsn: log.length + 1, txn: t2, type: 'COMMIT' }); flushLog(); committed[t2] = 1;
            var h2 = {}; h2[log.length - 1] = 'ok';
            push('<b>' + t2 + ' commits:</b> append a COMMIT record and <b>fsync the log</b> up to LSN ' + flushed + ' (everything before it gets flushed too — that is how <b>group commit</b> batches many transactions in one fsync). Only now is the client told "OK". Data pages are still not written: <b>no-force</b>.', { logHl: h2, varHl: { flushedLSN: 'ok', committed: 'ok' } });
          } else if ((m = /^flush\s+([A-H])$/i.exec(op))) {
            var fp = m[1].toUpperCase();
            if (!buf[fp]) { push('Flush ' + fp + ': page is not in the buffer pool (nothing dirty to write).'); continue; }
            var forced = buf[fp].lsn > flushed;
            if (forced) flushLog();
            disk[fp] = { val: buf[fp].val, lsn: buf[fp].lsn };
            var owner = ''; log.forEach(function (rr) { if (rr.page === fp && rr.lsn === buf[fp].lsn) owner = rr.txn; });
            push('<b>Buffer pool writes page ' + fp + ' to disk</b> (eviction or background flush). ' + (forced ? '<span class="c-y">WAL rule:</span> its pageLSN ' + buf[fp].lsn + ' was beyond flushedLSN, so the log is forced to disk <b>first</b>. ' : 'Its pageLSN ' + buf[fp].lsn + ' ≤ flushedLSN, so the WAL rule is already satisfied. ') + (owner && !committed[owner] ? '<span class="c-r">Note: ' + owner + ' has not committed — this is a STEAL.</span> Undo info in the log makes it safe.' : ''), { page: fp, pageCls: 'sel', varHl: forced ? { flushedLSN: 'cur' } : {} });
          } else if (/^crash$/i.test(op)) {
            crashed = true;
          } else throw new Error('Unknown op "' + op + '"');
        }
        if (!crashed) crashed = true;
        var lost = log.filter(function (r) { return r.lsn > flushed; });
        var lh = {}; log.forEach(function (r, i) { if (r.lsn > flushed) lh[i] = 'bad'; });
        crashed = false;
        buf = {};
        push('<span class="c-r"><b>CRASH!</b></span> RAM is gone: the whole buffer pool and the unflushed log tail' + (lost.length ? ' (' + lost.map(recStr).join(', ') + ')' : '') + '. Only the disk columns and the fsynced log survive.', { logHl: lh, varHl: { flushedLSN: 'bad' } });
        crashed = true;
        log = log.filter(function (r) { return r.lsn <= flushed; });
        buf = {};
        var winners = {}, losers = {};
        log.forEach(function (r) { if (r.type === 'COMMIT') winners[r.txn] = 1; });
        log.forEach(function (r) { if (r.type === 'UPD' && !winners[r.txn]) losers[r.txn] = 1; });
        var av = { winners: Object.keys(winners).join(',') || '—', losers: Object.keys(losers).join(',') || '—', redo_from_LSN: 1 };
        push('<b>Pass 1 — Analysis.</b> Scan the surviving log. Transactions with a COMMIT record are <b>winners</b>; transactions with updates but no COMMIT are <b>losers</b>. (With a checkpoint, the scan would start there and the dirty page table would tell us where redo must begin.)', { vars: av, varHl: { winners: 'ok', losers: 'bad' } });
        log.forEach(function (r, i) {
          if (r.type !== 'UPD') return;
          if (!buf[r.page]) buf[r.page] = { val: disk[r.page].val, lsn: disk[r.page].lsn };
          var h3 = {}; h3[i] = 'cur';
          var plsn = buf[r.page].lsn;
          if (plsn < r.lsn) {
            buf[r.page].val = r.after; buf[r.page].lsn = r.lsn;
            push('<b>Pass 2 — Redo LSN ' + r.lsn + '</b> (' + r.txn + (winners[r.txn] ? ', winner' : ', <span class="c-r">loser</span>') + '): page ' + r.page + ' has pageLSN ' + plsn + ' &lt; ' + r.lsn + ', so the change is missing → re-apply ' + r.page + ' = ' + r.after + '. ARIES <b>repeats history</b>, even for losers, so the pages exactly match the moment of the crash.', { logHl: h3, page: r.page, pageCls: 'ok', vars: av });
          } else {
            push('<b>Pass 2 — Redo LSN ' + r.lsn + '</b>: page ' + r.page + ' already has pageLSN ' + buf[r.page].lsn + ' ≥ ' + r.lsn + ', so this change reached disk before the crash → <b>skip</b>. This pageLSN test is what makes redo <b>idempotent</b>.', { logHl: h3, page: r.page, pageCls: 'done', vars: av });
          }
        });
        var undo = log.filter(function (r) { return r.type === 'UPD' && losers[r.txn]; }).reverse();
        if (!undo.length) push('<b>Pass 3 — Undo.</b> No losers, nothing to roll back.', { vars: av });
        undo.forEach(function (r) {
          if (!buf[r.page]) buf[r.page] = { val: disk[r.page].val, lsn: disk[r.page].lsn };
          var clr = { lsn: log.length + 1, txn: r.txn, type: 'CLR', page: r.page, after: r.before };
          log.push(clr); buf[r.page].val = r.before; buf[r.page].lsn = clr.lsn;
          var h4 = {}; h4[log.length - 1] = 'sel'; log.forEach(function (x, i) { if (x.lsn === r.lsn) h4[i] = 'bad'; });
          push('<b>Pass 3 — Undo LSN ' + r.lsn + '</b> (loser ' + r.txn + ', newest first): restore ' + r.page + ' to its before-value ' + r.before + ' and write <b>CLR ' + clr.lsn + '</b>. If we crash again during recovery, the CLR says "already undone" so undo never runs twice.', { logHl: h4, page: r.page, pageCls: 'bad', vars: av });
        });
        var fin = pagesTouched().map(function (p) { return p + '=' + (buf[p] ? buf[p].val : disk[p].val); }).join(', ');
        push('<b>Recovered.</b> Final state: ' + fin + '. Every committed change survived; every uncommitted one is gone — atomicity + durability. The database now opens for traffic; the recovered dirty pages get flushed by normal checkpointing.', { vars: av });
        return frames;
      }
    },
    examples: [
      {
        title: 'Walkthrough: steal + crash on the engine lab log',
        html: `<p>The <code>wal_log</code> table has T1 and T3 committed, T2 and T4 not. On disk at crash time: B = 7 with pageLSN 4 (T2's uncommitted change was <b>stolen</b> to disk), everything else 0.</p>
${H.table(['LSN', 'record', 'redo?', 'undo?'], [['2', 'T1 A 0→5', H.c('g', 'yes (0 &lt; 2)'), '—'], ['4', 'T2 B 0→7', H.c('m', 'skip (4 ≥ 4)'), H.c('r', 'yes → B = 0')], ['6', 'T2 C 0→9', H.c('g', 'yes'), H.c('r', 'yes → C = 0')], ['8', 'T3 A 5→8', H.c('g', 'yes'), '—'], ['11', 'T4 D 0→3', H.c('g', 'yes'), H.c('r', 'yes → D = 0')]])}
<p>Final: <b>A = 8, B = 0, C = 0, D = 0</b>. Undo order is by descending LSN: 11, 6, 4.</p>`,
        code: eng(`-- Final recovered value of every page: last committed after-value,
-- otherwise the value before the first (loser) change, otherwise what disk has.
WITH winners AS (SELECT txn FROM wal_log WHERE kind = 'COMMIT'),
upd AS (SELECT * FROM wal_log WHERE kind = 'UPDATE'),
last_win AS (
  SELECT page, after_val, ROW_NUMBER() OVER (PARTITION BY page ORDER BY lsn DESC) AS rn
  FROM upd WHERE txn IN (SELECT txn FROM winners)
),
first_any AS (
  SELECT page, before_val, ROW_NUMBER() OVER (PARTITION BY page ORDER BY lsn) AS rn FROM upd
)
SELECT d.page, d.val AS on_disk_at_crash,
       COALESCE(w.after_val, f.before_val, d.val) AS recovered_val
FROM disk_pages d
LEFT JOIN last_win  w ON w.page = d.page AND w.rn = 1
LEFT JOIN first_any f ON f.page = d.page AND f.rn = 1
ORDER BY d.page;`)
      },
      {
        title: 'Group commit arithmetic',
        html: `<p>An NVMe fsync takes ~0.5 ms (a cloud network disk can take 1–5 ms). One fsync per commit caps you at ~2,000 commits/s per log. With <b>group commit</b>, 50 concurrent transactions that arrive within the same flush window share one fsync → up to ~100,000 commits/s, while each still waits only ~0.5–1 ms. This is why <code>innodb_flush_log_at_trx_commit = 1</code> (fully durable) is usually fast enough, and why Postgres has <code>commit_delay</code> to wait a few microseconds for more company.</p>
${H.table(['setting', 'durability on OS crash', 'speed'], [['InnoDB =1 / PG synchronous_commit=on', H.c('g', 'every commit'), 'baseline'], ['InnoDB =2 (write, fsync each second)', H.c('y', 'safe on mysqld crash, lose ≤1 s on OS crash'), 'faster'], ['InnoDB =0 / PG synchronous_commit=off', H.c('r', 'lose recent commits'), 'fastest']])}`
      },
      {
        title: 'Checkpoint: how much log must recovery read?',
        html: `<p>The checkpoint in the lab DB recorded dirty pages A (recLSN 2) and C (recLSN 6) and active transaction T2 (first LSN 3). <b>Redo starts at min(recLSN) = 2.</b> The log can be truncated before <b>min(2, 3) = 2</b> — anything older is no longer needed for redo <i>or</i> undo. A long-running transaction holding an old first LSN pins the whole log: this is why a forgotten open transaction can fill a disk with WAL.</p>`,
        code: eng(`SELECT (SELECT MIN(rec_lsn) FROM ckpt_dirty_pages) AS redo_start_lsn,
       MIN((SELECT MIN(rec_lsn) FROM ckpt_dirty_pages),
           (SELECT MIN(first_lsn) FROM ckpt_active_txns)) AS log_truncation_lsn;`)
      },
      {
        title: 'SQLite: rollback journal vs WAL mode',
        html: `<p><b>Rollback journal (DELETE mode)</b>: before changing a page, copy the <i>original</i> page into <code>db-journal</code>, fsync, then write the database file. Crash → copy originals back (undo). Readers and the writer block each other. <b>WAL mode</b>: write <i>new</i> page versions to <code>db-wal</code>; the main file is untouched until a checkpoint. Readers keep reading the old snapshot while one writer appends — so readers never block the writer. The cost: a <code>-shm</code> index file and the WAL can grow if a long reader prevents checkpoints.</p>`
      }
    ],
    deepDive: `<p><b>🟣 Physiological logging.</b> ARIES logs "physical to a page, logical within it": e.g. "on page 42, insert this record into slot 7". Pure physical logging (byte diffs) is huge; pure logical logging ("UPDATE accounts SET ...") cannot be replayed safely when pages are half-written. Postgres mostly logs physical-ish changes plus <b>full-page images</b> after each checkpoint to defeat torn pages.</p>
<p><b>Why redo losers too?</b> "Repeating history" makes redo a dumb, page-local, idempotent operation, and lets undo work on a consistent state. It also supports fine-grained locking: two transactions may have modified the same page, and only the loser's records need undoing.</p>
<p><b>CLRs and undoNextLSN.</b> Each CLR points to the next record of that transaction still to undo, so a crash during recovery resumes undo exactly where it stopped; CLRs themselves are redo-only and never undone. Recovery work is therefore bounded even with repeated crashes.</p>
<p><b>fsync is a contract, not a guarantee.</b> In 2018 "fsyncgate" showed that Linux could report an fsync error once, drop the dirty pages, and let the next fsync succeed — silently losing data. Postgres now PANICs on fsync failure and recovers from WAL. Disks with volatile write caches that lie about flushes break every WAL design; enterprise SSDs have power-loss protection capacitors for this reason.</p>
<p><b>Beyond one machine.</b> The log is also the unit of <b>replication</b> (Postgres streaming replication ships WAL; MySQL ships redo-derived binlog events) and of <b>point-in-time recovery</b> (base backup + archived WAL). Amazon Aurora takes it to the extreme: compute nodes send <i>only redo records</i> to a storage service, which materialises pages itself — "the log is the database".</p>`,
    aiEra: `<p><b>What AI changes:</b> postmortems after a crash or failover are now drafted by assistants that read logs like "redo done at 0/3A2F..." or "database system was not properly shut down; automatic recovery in progress". They can translate these lines and timelines into plain English quickly.</p>
<p><b>Use AI as a partner:</b> ask it to generate adversarial crash schedules for your toy WAL ("crash between the page write and the log fsync", "crash during undo") and turn them into tests. Property-based and fault-injection testing (in the style of Jepsen or deterministic simulation) is where AI-written test harnesses shine.</p>
<p><b>Where AI goes wrong:</b> claiming Postgres has undo logs like InnoDB, saying commits write data pages, inverting the WAL rule (page before log), forgetting that redo also replays losers, or recommending <code>fsync=off</code> as a "performance tip" — that setting can corrupt the whole cluster on a crash.</p>
<p><b>What you must still own:</b> being able to walk an interviewer through Analysis/Redo/Undo on a small log by hand, and to reason about which durability knob loses what.</p>`,
    problems: [
      {
        title: 'Recover Page Values from a WAL After a Crash',
        level: 'Hard', tags: ['WAL', 'ARIES', 'window functions'], companies: ['Oracle', 'Databricks', 'Amazon', 'CockroachDB'],
        statement: `<p>Using the engine lab tables <code>wal_log</code> and <code>disk_pages</code>, write one query that returns, for every page, its value <b>after recovery</b>: committed changes kept, uncommitted changes rolled back. Assume strict two-phase locking (a page changed by an uncommitted transaction was not changed by anybody else afterwards).</p>`,
        constraints: `Use only the log and disk tables. The answer must not depend on whether a loser's change happened to reach disk.`,
        example: `<p>Expected: ${H.c('g', 'A = 8')} (T3 committed 5→8), ${H.c('r', 'B = 0')} (T2 loser, even though 7 is on disk), ${H.c('r', 'C = 0')}, ${H.c('r', 'D = 0')} (T4 loser).</p>`,
        brute: {
          why: `<p>The brute force literally runs ARIES in a host language: load disk pages, redo every UPDATE with LSN &gt; pageLSN, then undo losers in reverse. Correct and educational, but it is procedural code outside the database; the set-based query below gets the same final answer in one statement.</p>`,
          code: { lang: 'python', run: true, code: `log = [
    (1,"T1","BEGIN",None,None,None),(2,"T1","UPDATE","A",0,5),(3,"T2","BEGIN",None,None,None),
    (4,"T2","UPDATE","B",0,7),(5,"T1","COMMIT",None,None,None),(6,"T2","UPDATE","C",0,9),
    (7,"T3","BEGIN",None,None,None),(8,"T3","UPDATE","A",5,8),(9,"T3","COMMIT",None,None,None),
    (10,"T4","BEGIN",None,None,None),(11,"T4","UPDATE","D",0,3)]
pages = {"A": [0, 0], "B": [7, 4], "C": [0, 0], "D": [0, 0]}     # page -> [value, pageLSN]
winners = {t for _, t, k, *_ in log if k == "COMMIT"}           # analysis
for lsn, t, k, p, before, after in log:                         # redo (repeat history)
    if k == "UPDATE" and pages[p][1] < lsn:
        pages[p] = [after, lsn]
for lsn, t, k, p, before, after in reversed(log):               # undo losers
    if k == "UPDATE" and t not in winners:
        pages[p][0] = before
print({p: v for p, (v, _) in sorted(pages.items())})` }
        },
        mcq: { q: 'Page B shows 7 on disk with pageLSN 4, written by uncommitted T2. During redo, what happens to LSN 4?', options: ['Skipped, because pageLSN 4 ≥ 4 already reflects it; undo will later reverse it', 'Re-applied, because every record is always redone', 'Deleted from the log', 'B is set to 0 immediately during redo'], answer: 0, explain: 'Redo is conditional on pageLSN &lt; LSN. The change is already present, so redo skips it; the undo pass then restores B to 0 and writes a CLR.' },
        hints: [
          `<p>Hint 1: after recovery each page equals either the <b>last committed after-value</b> or, if no winner ever touched it, its value before any loser touched it.</p>`,
          `<p>Hint 2: <code>ROW_NUMBER() OVER (PARTITION BY page ORDER BY lsn DESC)</code> picks the latest winner update per page; ordering ascending over all updates gives the first before-value.</p>`,
          `<p>Hint 3: LEFT JOIN both to <code>disk_pages</code> and use <code>COALESCE(last_winner_after, first_before, disk_val)</code> so untouched pages keep their disk value.</p>`
        ],
        tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
          { rows: [
              ['A', 8],
              ['B', 0],
              ['C', 0],
              ['D', 0]
            ] },
          { setup: 'INSERT INTO wal_log VALUES (12,\'T2\',\'COMMIT\',NULL,NULL,NULL,6)', rows: [
              ['A', 8],
              ['B', 7],
              ['C', 9],
              ['D', 0]
            ] },
          { setup: 'INSERT INTO wal_log VALUES (12,\'T4\',\'COMMIT\',NULL,NULL,NULL,11)', rows: [
              ['A', 8],
              ['B', 0],
              ['C', 0],
              ['D', 3]
            ] },
          { setup: 'DELETE FROM wal_log WHERE lsn = 9', rows: [
              ['A', 5],
              ['B', 0],
              ['C', 0],
              ['D', 0]
            ] },
          { setup: 'DELETE FROM wal_log WHERE txn = \'T4\'; UPDATE disk_pages SET val = 42 WHERE page = \'D\'', rows: [
              ['A', 8],
              ['B', 0],
              ['C', 0],
              ['D', 42]
            ] },
          { setup: 'INSERT INTO disk_pages VALUES (\'E\', 0, 11)', rows: [
              ['A', 8],
              ['B', 0],
              ['C', 0],
              ['D', 0],
              ['E', 11]
            ] },
          { setup: 'INSERT INTO wal_log VALUES (12,\'T2\',\'COMMIT\',NULL,NULL,NULL,6),(13,\'T4\',\'COMMIT\',NULL,NULL,NULL,11)', rows: [
              ['A', 8],
              ['B', 7],
              ['C', 9],
              ['D', 3]
            ] },
          { setup: 'DELETE FROM wal_log', rows: [
              ['A', 0],
              ['B', 7],
              ['C', 0],
              ['D', 0]
            ] },
          { setup: 'INSERT INTO wal_log VALUES (12,\'T2\',\'ABORT\',NULL,NULL,NULL,6)', rows: [
              ['A', 8],
              ['B', 0],
              ['C', 0],
              ['D', 0]
            ] },
          { setup: 'DELETE FROM wal_log WHERE kind = \'COMMIT\'', rows: [
              ['A', 0],
              ['B', 0],
              ['C', 0],
              ['D', 0]
            ] },
          { setup: 'INSERT INTO wal_log VALUES (12,\'T5\',\'BEGIN\',NULL,NULL,NULL,NULL),(13,\'T5\',\'UPDATE\',\'A\',8,20,12),(14,\'T5\',\'COMMIT\',NULL,NULL,NULL,13)', rows: [
              ['A', 20],
              ['B', 0],
              ['C', 0],
              ['D', 0]
            ] }
        ] },
        solution: {
          approach: `<p>Under strict 2PL, losers' changes sit "on top" of the last committed state, so the final value is the last winner's after-value; if there is none, the earliest before-value in the log is the last committed value. This is the <i>result</i> of ARIES expressed as a set query — handy for auditing a log or checking a recovery implementation.</p>`,
          code: eng(`WITH winners AS (SELECT txn FROM wal_log WHERE kind = 'COMMIT'),
upd AS (SELECT * FROM wal_log WHERE kind = 'UPDATE'),
last_win AS (
  SELECT page, after_val, ROW_NUMBER() OVER (PARTITION BY page ORDER BY lsn DESC) AS rn
  FROM upd WHERE txn IN (SELECT txn FROM winners)
),
first_any AS (
  SELECT page, before_val, ROW_NUMBER() OVER (PARTITION BY page ORDER BY lsn) AS rn FROM upd
)
SELECT d.page, COALESCE(w.after_val, f.before_val, d.val) AS recovered_val
FROM disk_pages d
LEFT JOIN last_win  w ON w.page = d.page AND w.rn = 1
LEFT JOIN first_any f ON f.page = d.page AND f.rn = 1
ORDER BY d.page;`),
          dry: { head: ['page', 'last winner after', 'first before', 'result'], rows: [['A', '8 (T3, LSN 8)', '0', H.c('g', '8')], ['B', '—', '0', H.c('r', '0')], ['C', '—', '0', H.c('r', '0')], ['D', '—', '0', H.c('r', '0')]] },
          complexity: `<p>One pass plus two window sorts: O(L log L) for L log records. The procedural ARIES version is O(L) with a hash map of pages.</p>`,
          followUps: ['Produce the list of CLRs the undo pass would write, in order (hint: losers\' UPDATEs by descending LSN).', 'How does the answer change if a loser and a winner both updated the same page (no strict 2PL)? Why do real systems forbid that?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 4 — B-tree vs LSM-tree
     ===================================================================== */
  topics.push({
    title: 'B-Tree vs LSM-Tree: Memtable, SSTables & the Read/Write Trade-off',
    analogy: `<p><b>B-tree = a perfectly sorted filing cabinet.</b> To change a document you walk to the exact drawer and edit it in place. Finding things is quick, but every small edit means opening a heavy drawer. <b>LSM-tree = an inbox tray.</b> New papers go on top of a tray on your desk (instant). When the tray is full you sort it and file the whole bundle as one new folder. Every evening an assistant merges folders together and throws away outdated copies. Writing is super fast; finding something means checking the tray first, then the newest folders, then older ones.</p>`,
    explain: `<p><b>🟢 Two families of storage engines.</b></p>
<p><b>B-tree engines</b> (InnoDB, PostgreSQL indexes, SQL Server, Oracle, SQLite, WiredTiger) keep data in fixed-size pages organised as a B+tree and <b>update pages in place</b> (via the buffer pool + WAL). Point read: walk root → leaf, typically 3–4 levels, and the upper levels are always cached, so ≈ <b>1 disk read</b>. Write: find the leaf, modify it in RAM, log it; later the whole page (16 KB) is written even if only 100 bytes changed.</p>
<p><b>LSM-tree engines</b> (Log-Structured Merge tree: RocksDB, LevelDB, Cassandra, ScyllaDB, HBase, Bigtable, CockroachDB's Pebble, TiKV) never update in place:</p>
<ol>
<li><b>Write path</b>: append the change to a <b>WAL</b> (durability), insert into the <b>memtable</b> — a sorted in-memory structure, usually a skip list. Done. No disk reads at all.</li>
<li><b>Flush</b>: when the memtable reaches its size (RocksDB default 64 MB) it becomes <b>immutable</b>, a new memtable takes writes, and the old one is written sequentially as an <b>SSTable</b> (Sorted String Table) into level 0. The WAL segment can then be deleted.</li>
<li><b>SSTables are immutable</b>: sorted key/value blocks (4–64 KB, compressed), a block index, a <b>Bloom filter</b>, and a footer.</li>
<li><b>Deletes</b> write a <b>tombstone</b> (a marker "key k is deleted as of seq n"); updates just write a newer version.</li>
<li><b>Compaction</b> (next topic) merges SSTables in the background, keeping the newest version of each key and dropping overwritten values and tombstones.</li>
<li><b>Read path</b>: memtable → immutable memtable → L0 files (newest first, they overlap) → one file per deeper level. A Bloom filter answers "definitely not here" for most files, so a point read usually costs ≈ 1 disk read.</li>
</ol>
${H.table(['', 'B-tree', 'LSM-tree (leveled)'], [['write cost', 'random page writes; WA ≈ page / row (can be 10–100×)', H.c('g', 'sequential; WA ≈ 10–30× but all big sequential I/O')], ['point read', H.c('g', '≈ 1 I/O, predictable'), '≈ 1 I/O with Bloom filters; more on misses of the filter'], ['range scan', H.c('g', 'walk adjacent leaves'), 'merge iterators across memtable + every level'], ['space', 'pages 50–70% full after random inserts; fragmentation', H.c('g', 'dense, compressed blocks; but old versions until compaction')], ['latency', H.c('g', 'steady'), 'compaction/flush stalls can cause spikes']])}
<p><b>Rule of thumb:</b> ${H.c('g', 'write-heavy, append-heavy, huge data, SSD cost matters')} → LSM. ${H.c('b', 'read-heavy OLTP, range scans, strict latency, lots of secondary indexes')} → B-tree. This is the <b>RUM conjecture</b>: you can optimise two of Read, Update, Memory (space) overhead, never all three.</p>`,
    clues: [
      '"Design a storage engine for a write-heavy workload (logs, metrics, IoT, events)" → LSM: WAL + memtable + SSTables + compaction',
      '"Millions of writes per second, mostly appends, rare reads of old data" → LSM / time-series engine',
      '"Read-mostly, lots of range queries, strict p99 latency" → B-tree',
      '"How does Cassandra / RocksDB / LevelDB / Bigtable store data?" → memtable + SSTables + Bloom filters',
      '"Deleted data still takes space / deleted rows reappear" → tombstones and compaction (and Cassandra gc_grace_seconds)',
      '"write amplification / read amplification / space amplification" → B-tree vs LSM trade-off (RUM conjecture)'
    ],
    code: [
      py(`import bisect
import hashlib

TOMBSTONE = None   # a delete is just a write of this marker


class Bloom:
    """Tiny Bloom filter: k hash functions over m bits. 'No' is certain, 'yes' is maybe."""
    def __init__(self, m=64, k=3):
        self.m, self.k, self.bits = m, k, 0

    def _hashes(self, key):
        h = hashlib.sha256(key.encode()).digest()
        return [int.from_bytes(h[4 * i:4 * i + 4], "big") % self.m for i in range(self.k)]

    def add(self, key):
        for b in self._hashes(key):
            self.bits |= 1 << b

    def might_contain(self, key):
        return all(self.bits >> b & 1 for b in self._hashes(key))


class SSTable:
    """Immutable sorted run with a Bloom filter (a real one is a file of compressed blocks)."""
    def __init__(self, items):
        self.keys = [k for k, _ in items]
        self.vals = [v for _, v in items]
        self.bloom = Bloom()
        for k in self.keys:
            self.bloom.add(k)

    def get(self, key):
        if not self.bloom.might_contain(key):
            return False, None                     # skipped without touching "disk"
        i = bisect.bisect_left(self.keys, key)     # binary search inside the run
        if i < len(self.keys) and self.keys[i] == key:
            return True, self.vals[i]
        return False, None


class ToyLSM:
    def __init__(self, memtable_limit=3):
        self.wal, self.memtable, self.sstables = [], {}, []   # sstables[0] = newest
        self.limit = memtable_limit

    def put(self, key, value):
        self.wal.append((key, value))      # 1) durability first (fsync in real life)
        self.memtable[key] = value         # 2) in-memory sorted structure (skip list in RocksDB)
        if len(self.memtable) >= self.limit:
            self.flush()

    def delete(self, key):
        self.put(key, TOMBSTONE)

    def flush(self):
        run = SSTable(sorted(self.memtable.items()))
        self.sstables.insert(0, run)       # newest first
        self.memtable, self.wal = {}, []   # WAL segment no longer needed

    def get(self, key):
        if key in self.memtable:
            return self.memtable[key]
        for run in self.sstables:          # newest to oldest: first hit wins
            found, val = run.get(key)
            if found:
                return val                 # may be TOMBSTONE -> deleted
        return None

    def compact(self):
        merged = {}
        for run in reversed(self.sstables):            # oldest first, newer overwrite
            merged.update(zip(run.keys, run.vals))
        live = sorted((k, v) for k, v in merged.items() if v is not TOMBSTONE)
        self.sstables = [SSTable(live)]                # tombstones dropped at the bottom level


db = ToyLSM()
for k, v in [("k5", "a"), ("k1", "b"), ("k9", "c"), ("k3", "d"), ("k7", "e"), ("k1", "B2")]:
    db.put(k, v)
db.delete("k3")
db.put("k8", "f")
print("SSTables (newest first):", [r.keys for r in db.sstables], "memtable:", db.memtable)
print("get k1 ->", db.get("k1"), "| get k3 ->", db.get("k3"), "(deleted) | get k4 ->", db.get("k4"))
db.flush()
db.compact()
print("after full compaction:", list(zip(db.sstables[0].keys, db.sstables[0].vals)))`, 'Toy LSM: WAL, memtable, SSTables, Bloom filter, tombstones, compaction (▶ Run)'),
      eng(`-- What would one full compaction of this write stream keep? Newest version per key, tombstones gone.
WITH ranked AS (
  SELECT k, v, op, seq, ROW_NUMBER() OVER (PARTITION BY k ORDER BY seq DESC) AS rn
  FROM kv_log
)
SELECT k, v AS live_value, seq AS winning_seq
FROM ranked
WHERE rn = 1 AND op = 'P'
ORDER BY k;`, 'Compaction result = latest version per key (▶ Run)'),
      eng(`-- Which SSTables must a point lookup for key 'k' consult? (L0 files overlap; L1+ have disjoint ranges)
SELECT id, level, min_key, max_key, created_seq,
       CASE WHEN level = 0 THEN 'check (L0 overlaps; newest first)'
            ELSE 'the only candidate on this level' END AS why
FROM sstables
WHERE 'k' BETWEEN min_key AND max_key
ORDER BY level, created_seq DESC;`, 'Read path: candidate SSTables for one key (▶ Run)')
    ],
    codeTitle: ['Toy LSM engine', 'Compaction outcome in SQL', 'Lookup candidates'],
    viz: {
      title: 'LSM write path: WAL + memtable → flush to L0 → compaction → reads',
      input: 'mem=3 | 5 1 9 3 7 2 8 4 6 -3 1 2 7 | get 3 | get 7 | get 4',
      inputLabel: 'mem=N | keys to put (-k = delete) | get k ...',
      gen: function (input) {
        var s = String(input || '').trim(), mem = 3;
        var mm = /mem\s*=\s*(\d+)/i.exec(s);
        if (mm) { mem = +mm[1]; s = s.replace(mm[0], ''); }
        if (mem < 2 || mem > 5) throw new Error('mem must be 2..5');
        var gets = [], rx = /get\s+(\d{1,3})/gi, g;
        while ((g = rx.exec(s))) gets.push(g[1]);
        s = s.replace(/get\s+\d{1,3}/gi, ' ');
        var toks = s.replace(/\|/g, ' ').split(/[\s,]+/).filter(Boolean);
        if (!toks.length) throw new Error('Enter keys like: mem=3 | 5 1 9 -1 | get 5');
        if (toks.length > 18 || gets.length > 4) throw new Error('At most 18 writes and 4 gets');
        var seq = 0, wal = [], mt = {}, l0 = [], l1 = [], frames = [];
        function ent(k, e) { return k + (e.del ? '✝' : '@' + e.seq); }
        function sortedEntries(obj) { return Object.keys(obj).sort(function (a, b) { return a - b; }).map(function (k) { return [k, obj[k]]; }); }
        function push(narr, hl) {
          hl = hl || {};
          var rows = [], rowHead = [], ghl = {};
          var mrow = sortedEntries(mt).map(function (e) { return ent(e[0], e[1]); });
          rows.push(mrow); rowHead.push('memtable (RAM)');
          l0.forEach(function (t, i) { rows.push(t.map(function (e) { return ent(e[0], e[1]); })); rowHead.push('L0 sst #' + (l0.length - i) + (i === 0 ? ' (newest)' : '')); });
          rows.push(l1.map(function (e) { return ent(e[0], e[1]); })); rowHead.push('L1 (sorted, one run)');
          var w = 1; rows.forEach(function (r) { w = Math.max(w, r.length); });
          rows = rows.map(function (r) { var c = r.slice(); while (c.length < w) c.push(''); return c; });
          var colHead = []; for (var i = 0; i < w; i++) colHead.push(String(i));
          for (var key in hl) ghl[key] = hl[key];
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'WAL (sequential appends; truncated after each flush)', values: wal.length ? wal.slice() : ['(empty)'], hl: wal.length ? (hl.wal || {}) : {} },
            { type: 'grid', label: 'LSM levels: key@seq, ✝ = tombstone', rows: rows, rowHead: rowHead, colHead: colHead, hl: ghl },
            { type: 'vars', label: 'Counters', vals: { seq: seq, memtable_entries: Object.keys(mt).length + '/' + mem, l0_files: l0.length, l1_entries: l1.length } }
          ] });
        }
        function rowOf(level, idx) { return level === 'mem' ? 0 : level === 'l0' ? 1 + idx : 1 + l0.length; }
        push('Empty LSM tree. Every write will touch only the <b>WAL</b> (sequential append) and the <b>memtable</b> (RAM). Disk files are created only by flushes and compactions, always written sequentially and never modified afterwards.');
        toks.forEach(function (t) {
          var m = /^(-?)(\d{1,3})$/.exec(t);
          if (!m) throw new Error('Bad token "' + t + '"');
          var del = m[1] === '-', k = m[2];
          seq++;
          wal.push((del ? 'DEL ' : 'PUT ') + k + ' #' + seq);
          mt[k] = { seq: seq, del: del };
          var col = sortedEntries(mt).map(function (e) { return e[0]; }).indexOf(k);
          var h = { wal: {} }; h.wal[wal.length - 1] = 'ok'; h['0,' + col] = del ? 'bad' : 'ok';
          push((del ? '<b>Delete ' + k + '</b>: deletes are writes too — we insert a <span class="c-r">tombstone</span> ' + k + '✝' : '<b>Put ' + k + '</b>') + ' with sequence number ' + seq + '. Append to WAL, insert into the sorted memtable. ' + (Object.keys(mt).length < mem ? 'No disk read, no page split: this is why LSM writes are cheap.' : 'Memtable is now <b>full</b>.'), h);
          if (Object.keys(mt).length >= mem) {
            l0.unshift(sortedEntries(mt)); mt = {}; wal = [];
            var fh = {}; for (var c = 0; c < l0[0].length; c++) fh['1,' + c] = 'cur';
            push('<b>Flush</b>: the memtable is frozen and written <b>sequentially</b> as a new immutable SSTable at the top of <b>L0</b>. Its WAL entries are no longer needed, so the WAL is truncated. L0 files may overlap each other in key range.', fh);
            if (l0.length >= 3) {
              var merged = {};
              l1.forEach(function (e) { merged[e[0]] = e[1]; });
              for (var i = l0.length - 1; i >= 0; i--) l0[i].forEach(function (e) { merged[e[0]] = e[1]; });
              var dropped = 0, out = [];
              sortedEntries(merged).forEach(function (e) { if (e[1].del) dropped++; else out.push(e); });
              var before = l1.length; l0.forEach(function (tt) { before += tt.length; });
              l0 = []; l1 = out;
              var ch = {}; for (var c2 = 0; c2 < l1.length; c2++) ch[rowOf('l1') + ',' + c2] = 'sel';
              push('<b>Compaction L0 → L1</b> (L0 reached 3 files): merge-sort all L0 files with L1, keep only the <b>newest version</b> of each key, and drop ' + dropped + ' tombstone(s) because L1 is the bottom level (nothing older can hide below). ' + before + ' entries in, ' + l1.length + ' out. This rewrite is the <b>write amplification</b> LSMs pay later instead of at write time.', ch);
            }
          }
        });
        gets.forEach(function (k) {
          var where = null, steps = [];
          if (mt[k]) { where = { lvl: 'mem', e: mt[k] }; steps.push('memtable: <b>found</b>'); }
          else {
            steps.push('memtable: no');
            for (var i = 0; i < l0.length && !where; i++) {
              var e = null; l0[i].forEach(function (x) { if (x[0] === k) e = x[1]; });
              if (e) { where = { lvl: 'l0', i: i, e: e }; steps.push('L0 #' + (l0.length - i) + ': Bloom says maybe → <b>found</b>'); }
              else steps.push('L0 #' + (l0.length - i) + ': Bloom filter says <i>definitely not</i> (skip, no I/O)');
            }
            if (!where) {
              var e1 = null; l1.forEach(function (x) { if (x[0] === k) e1 = x[1]; });
              if (e1) { where = { lvl: 'l1', e: e1 }; steps.push('L1: Bloom maybe → binary search → <b>found</b>'); }
              else steps.push('L1: not found');
            }
          }
          var hh = {};
          if (where) {
            var row = rowOf(where.lvl, where.i), rr = where.lvl === 'mem' ? sortedEntries(mt) : where.lvl === 'l0' ? l0[where.i] : l1;
            var ci = rr.map(function (x) { return x[0]; }).indexOf(k);
            hh[row + ',' + ci] = where.e.del ? 'bad' : 'sel';
          }
          push('<b>get ' + k + '</b>: search newest → oldest and stop at the first hit. ' + steps.join(' → ') + '. Result: ' + (!where ? 'not found.' : where.e.del ? '<span class="c-r">tombstone → key is deleted</span> (older versions below are ignored).' : '<b>value @seq ' + where.e.seq + '</b>.'), hh);
        });
        push('Summary: writes were all sequential (WAL appends, flushes, compaction output). Reads had to look in several places, which Bloom filters make cheap for point lookups. A <b>B-tree</b> would instead have updated one leaf page in place per write — fewer places to read, more random writes.');
        return frames;
      }
    },
    examples: [
      {
        title: 'Write amplification of a B-tree on random updates',
        html: `<p>10,000 random updates per second, 200-byte rows, 100 GB table, 16 KB InnoDB pages, buffer pool far smaller than the table. Each update usually lands on a different page, so eventually each one causes a 16 KB page write (plus 16 KB again via the doublewrite buffer) and ~250 B of redo:</p>
${H.table(['', 'bytes per update', 'MiB/s at 10k updates/s'], [['redo log', '≈ 250', '2.4'], ['page write', '16,384', '156'], ['doublewrite copy', '16,384', '156'], ['total', H.c('r', '≈ 33,000 (WA ≈ 165×)'), H.c('r', '≈ 315 MiB/s')]])}
<p>The same workload on a leveled LSM with WA ≈ 20 writes ≈ 40 MB/s, all sequential. This is the Facebook/MyRocks story: moving user DB tiers from InnoDB to RocksDB cut storage and write volume dramatically on flash.</p>`
      },
      {
        title: 'Point lookup cost with Bloom filters',
        html: `<p>An LSM with a memtable, 4 L0 files and levels L1–L4 (one candidate file each): up to 8 places to look. With 10 bits/key Bloom filters (≈ 1% false positives), a lookup for a key that lives in L4 costs: 7 filter checks in RAM, expected 7 × 0.01 = 0.07 wasted reads, plus 1 real read ≈ <b>1.07 I/Os</b>. A lookup for a key that does not exist costs ≈ 0.08 I/Os. Without Bloom filters it would be up to 8 I/Os — that is why every serious LSM uses them (RocksDB adds prefix and ribbon filters).</p>`,
        code: py(`# Expected disk reads for an LSM point lookup with Bloom filters
places, fpr = 8, 0.01
hit_in_last = (places - 1) * fpr + 1          # key exists in the deepest level
miss = places * fpr                            # key does not exist anywhere
print("existing key: %.2f I/Os, missing key: %.2f I/Os, without filters: %d" % (hit_in_last, miss, places))`)
      },
      {
        title: 'Choosing per workload',
        html: `${H.table(['workload', 'pick', 'why'], [['Metrics/IoT ingest 1M points/s, queries on recent data', H.c('g', 'LSM / time-series engine'), 'sequential writes, great compression, TTL drops whole files'], ['Banking ledger: OLTP, many secondary indexes, strict p99', H.c('b', 'B-tree (InnoDB/Postgres)'), 'predictable reads, cheap index lookups, no compaction stalls'], ['Chat messages, append-heavy, read latest per conversation', H.c('g', 'LSM (Cassandra/Scylla/HBase)'), 'writes dominate; reads hit memtable/recent files'], ['Product catalogue, read 100:1, rich range filters', H.c('b', 'B-tree'), 'range scans walk adjacent leaves'], ['Embedded KV in a distributed SQL DB', H.c('g', 'LSM (Pebble/RocksDB)'), 'CockroachDB, TiDB, YugabyteDB all chose LSM for write throughput and SSD efficiency']])}`
      },
      {
        title: 'Tombstone trouble',
        html: `<p>A queue-like table in Cassandra: insert a job, delete it when done. Deletes create tombstones that live until compaction <i>and</i> <code>gc_grace_seconds</code> (default 10 days) pass. A query "give me the first 10 pending jobs" may scan 100,000 tombstones before finding 10 live rows → timeouts (Cassandra warns at 1,000 and fails at 100,000 tombstones per query by default). Lesson: <b>LSMs hate delete-heavy queue patterns</b>; use a real queue or partition by time bucket and drop whole partitions.</p>`
      }
    ],
    deepDive: `<p><b>🟣 Memtable data structure.</b> RocksDB's default memtable is a concurrent <b>skip list</b> (lock-free reads, ordered iteration for flush). Alternatives: hash-skiplist for prefix workloads, vector memtable for bulk load. Sequence numbers make every entry a version, which gives LSMs cheap <b>snapshots</b>: a snapshot is just "ignore entries with seq &gt; S".</p>
<p><b>Inside an SSTable.</b> Data blocks with <b>prefix (delta) key compression</b> and restart points every 16 keys, compressed with LZ4/Zstd; an index block (last key of each data block → offset), optionally partitioned; a filter block (Bloom/Ribbon); a properties block; a footer with offsets and a magic number. Since files are immutable, caching, checksumming, backups (hard-link the files) and replication of files are all simple.</p>
<p><b>Range scans</b> need a <b>merging iterator</b>: a heap over iterators of the memtable and every overlapping SSTable, skipping shadowed versions and tombstones. Prefix Bloom filters and per-file min/max keys prune files. Range-delete tombstones avoid writing millions of point tombstones.</p>
<p><b>Write stalls.</b> If flushes or compactions fall behind, L0 file count grows and reads slow down; RocksDB then <b>slows</b> writes (<code>level0_slowdown_writes_trigger</code>, default 20 files) and finally <b>stops</b> them (<code>level0_stop_writes_trigger</code>, 36). Capacity planning for an LSM means planning compaction bandwidth, not just ingest bandwidth.</p>
<p><b>Middle ground designs.</b> <b>Bε-trees / fractal trees</b> (TokuDB) buffer messages in internal nodes; <b>Bw-tree</b> (Hekaton, Azure Cosmos DB) uses delta chains and a mapping table for latch-free updates; <b>WiscKey</b> separates keys from values (RocksDB BlobDB) to cut compaction cost for big values; copy-on-write B-trees (LMDB, Btrfs) never overwrite pages and need no WAL.</p>`,
    aiEra: `<p><b>What AI changes:</b> vector databases and AI feature stores are new, write-heavy workloads; many of them (Milvus segments, LanceDB, Turbopuffer on object storage) borrow LSM ideas: immutable segments, background merging, tombstones. Knowing LSM internals helps you reason about why a freshly inserted embedding is not yet indexed, or why deletes are slow.</p>
<p><b>Use AI as a partner:</b> give an assistant your workload profile (write/read ratio, row size, data size, latency SLO) and ask for a B-tree vs LSM comparison with explicit amplification arithmetic; then sanity check every number yourself and run a <code>db_bench</code> / sysbench test.</p>
<p><b>Where AI goes wrong:</b> it repeats "LSM is for writes, B-tree is for reads" without numbers, forgets that LSM point reads are nearly as cheap thanks to Bloom filters, ignores compaction debt and write stalls, or claims Postgres uses an LSM.</p>
<p><b>What you must still own:</b> drawing both write and read paths from memory, quantifying the three amplifications for a given workload, and defending the choice with numbers in a design interview.</p>`,
    problems: [
      {
        title: 'Pick an Engine with an Amplification Budget',
        level: 'Medium', tags: ['B-tree', 'LSM', 'capacity planning'], companies: ['Meta', 'Datadog', 'Uber', 'Netflix'],
        statement: `<p>A metrics service ingests <b>W = 200,000</b> random-key writes/s of <b>200-byte</b> rows and serves <b>R = 2,000</b> point reads/s. The SSD sustains <b>1,000 MB/s</b> of writes but you must keep total write traffic under 50% of that. Estimate disk write bandwidth for (a) a B-tree with 16 KB pages where nearly every write dirties a distinct page (doublewrite on) and (b) a leveled LSM with fanout 10 and 5 levels (WA ≈ 2 + 10 × (5 − 1) / 2). Print both and recommend one.</p>`,
        constraints: `Use the simple models given. 1 MB = 10<sup>6</sup> bytes for this estimate.`,
        example: `<p>B-tree: 200,000 × (16,384 × 2 + 200) ≈ ${H.c('r', '6,594 MB/s')} → impossible. LSM: WA = 2 + 20 = 22 → 200,000 × 200 × 22 = ${H.c('g', '880 MB/s')}... still above the 500 MB/s budget, so you would also need compression (≈ 3× on metrics) → ≈ ${H.c('g', '293 MB/s')}. Recommendation: <b>LSM with compression</b> (or a time-series engine).</p>`,
        brute: {
          why: `<p>The "brute force" is to deploy both engines and load-test them. That is the final answer in practice, but it costs days. A back-of-envelope model eliminates the hopeless option (the B-tree here is 13× over the 500 MB/s budget (6.6× the device limit)) in seconds, so you only benchmark the plausible designs.</p>`,
          code: { lang: 'python', run: true, code: `# Brute force: "simulate" bytes written for one second of traffic, write by write
W, ROW, PAGE = 200_000, 200, 16_384
btree_bytes = 0
for _ in range(W):
    btree_bytes += 2 * PAGE + ROW     # page write + doublewrite copy + redo record
print("B-tree MB/s:", btree_bytes // 1_000_000)` }
        },
        mcq: { q: 'Why does the B-tree model charge a whole 16 KB page per 200-byte write?', options: ['Random keys rarely share a dirty page before it is flushed, and pages are written whole', 'B-trees store each row in its own page', 'Because of the WAL', 'Because of Bloom filters'], answer: 0, explain: 'With a data set far larger than RAM and random keys, almost every write dirties a different page, and the engine always writes full pages.' },
        hints: [
          `<p>Hint 1: bandwidth = writes/s × bytes physically written per logical write. Find "bytes per write" for each engine.</p>`,
          `<p>Hint 2: B-tree ≈ 2 × page (page + doublewrite) + the redo record. LSM ≈ row × WA, where WA covers WAL + flush + compaction rewrites.</p>`,
          `<p>Hint 3: compare with the 500 MB/s budget; if both fail, ask which knob (compression, batching keys by time, fewer levels) brings one under budget.</p>`
        ],
        tests: { sig: 'int int -> string[]', fn: 'rep_engine', harness: { python: 'def rep_engine(writes, row):\n    import io, contextlib\n    buf = io.StringIO()\n    with contextlib.redirect_stdout(buf):\n        rec = engine_choice(writes, row)\n    return buf.getvalue().strip().split("\\n") + [rec]' }, cases: [
          [
            [200000, 200],
            ['B-tree       :     6594 MB/s', 'LSM (WA=22)  :      880 MB/s', 'LSM + 3x zstd:      293 MB/s  (budget 500 MB/s)', 'LSM with compression']
          ],
          [
            [1000, 100],
            ['B-tree       :       33 MB/s', 'LSM (WA=22)  :        2 MB/s', 'LSM + 3x zstd:        1 MB/s  (budget 500 MB/s)', 'B-tree fits the budget: prefer it for simpler, steadier reads']
          ],
          [
            [2000000, 200],
            ['B-tree       :    65936 MB/s', 'LSM (WA=22)  :     8800 MB/s', 'LSM + 3x zstd:     2933 MB/s  (budget 500 MB/s)', 'Neither fits: shard the writes across more disks/nodes']
          ],
          [
            [15000, 200],
            ['B-tree       :      495 MB/s', 'LSM (WA=22)  :       66 MB/s', 'LSM + 3x zstd:       22 MB/s  (budget 500 MB/s)', 'B-tree fits the budget: prefer it for simpler, steadier reads']
          ],
          [
            [15200, 200],
            ['B-tree       :      501 MB/s', 'LSM (WA=22)  :       67 MB/s', 'LSM + 3x zstd:       22 MB/s  (budget 500 MB/s)', 'LSM with compression']
          ],
          [
            [10000, 17232],
            ['B-tree       :      500 MB/s', 'LSM (WA=22)  :     3791 MB/s', 'LSM + 3x zstd:     1264 MB/s  (budget 500 MB/s)', 'B-tree fits the budget: prefer it for simpler, steadier reads']
          ],
          [
            [1, 1],
            ['B-tree       :        0 MB/s', 'LSM (WA=22)  :        0 MB/s', 'LSM + 3x zstd:        0 MB/s  (budget 500 MB/s)', 'B-tree fits the budget: prefer it for simpler, steadier reads']
          ],
          [
            [500000, 50],
            ['B-tree       :    16409 MB/s', 'LSM (WA=22)  :      550 MB/s', 'LSM + 3x zstd:      183 MB/s  (budget 500 MB/s)', 'LSM with compression']
          ]
        ] },
        solution: {
          approach: `<p>Compute bytes/write for each design, multiply by the write rate, compare with the budget, then apply the realistic mitigation (block compression on the LSM, whose immutable sorted blocks compress very well). Reads (2,000/s at ≈ 1 I/O each) are trivial for either engine, so writes decide.</p>`,
          code: { lang: 'python', run: true, code: `def engine_choice(writes, row, page=16_384, fanout=10, levels=5, budget_mb=500, compression=3.0):
    btree = writes * (2 * page + row) / 1e6                  # MB/s
    wa_lsm = 2 + fanout * (levels - 1) / 2                     # WAL + flush + average compaction rewrites
    lsm = writes * row * wa_lsm / 1e6
    lsm_c = lsm / compression                                  # SSTable blocks are compressed
    print("B-tree       : %8.0f MB/s" % btree)
    print("LSM (WA=%.0f)  : %8.0f MB/s" % (wa_lsm, lsm))
    print("LSM + %.0fx zstd: %8.0f MB/s  (budget %d MB/s)" % (compression, lsm_c, budget_mb))
    if btree <= budget_mb:
        return "B-tree fits the budget: prefer it for simpler, steadier reads"
    if lsm_c <= budget_mb:
        return "LSM with compression"
    return "Neither fits: shard the writes across more disks/nodes"

print("recommendation:", engine_choice(200_000, 200))` },
          complexity: `<p>O(1) arithmetic. The real work is choosing honest parameters (row size, WA, compression ratio) and validating them with a benchmark.</p>`,
          followUps: ['How would sorting writes by (metric, timestamp) change the B-tree estimate? (Hint: sequential keys fill pages before flushing.)', 'Estimate the space amplification of both designs for 10 TB of logical data.']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 5 — Compaction strategies and the math
     ===================================================================== */
  topics.push({
    title: 'Compaction: Leveled vs Tiered and the Amplification Math',
    analogy: `<p>Think of <b>sorting exam papers</b>. Strategy 1 (<b>leveled</b>): keep one perfectly sorted master pile per shelf; every time a small batch arrives you merge it into the master pile right away. Finding a paper is quick (one pile per shelf), but you re-handle the master pile again and again. Strategy 2 (<b>tiered</b>): let several small sorted piles accumulate; only when you have, say, 4 piles of the same size do you merge them into one bigger pile and move it up a shelf. Much less re-handling, but finding a paper means flipping through several piles, and during a big merge you temporarily need space for both the old piles and the new one.</p>`,
    explain: `<p><b>🟢 Why compaction exists.</b> An LSM tree keeps adding immutable SSTables. Without cleanup you would get (1) <b>more files to search</b> on every read, (2) <b>wasted space</b> for overwritten values and tombstones, and (3) slower range scans. Compaction is a background <b>k-way merge sort</b>: read several sorted runs, output one sorted run that keeps only the newest version of each key.</p>
<p><b>The three amplifications</b> (always ask "per byte of user data"):</p>
${H.table(['amplification', 'definition', 'hurts'], [['Write (WA)', 'bytes written to disk ÷ bytes the user wrote', 'SSD lifetime, disk bandwidth, ingest ceiling'], ['Read (RA)', 'disk reads (or runs checked) per logical read', 'latency, IOPS'], ['Space (SA)', 'disk bytes used ÷ live data bytes', 'storage cost']])}
<p><b>Leveled compaction</b> (LevelDB, RocksDB default, Cassandra LCS): L0 holds freshly flushed, overlapping files. From L1 down, each level is <b>one sorted run</b> split into many ~64 MB files with non-overlapping key ranges. Each level is <b>T times bigger</b> than the one above (RocksDB <code>max_bytes_for_level_multiplier = 10</code>). When a level exceeds its target, one file is merged with the ~T overlapping files below it.</p>
<ul><li>WA ≈ ${H.c('r', 'T per level')}, so worst case ≈ T × L (in practice ~10–30 total). RA ≈ ${H.c('g', '1 run per level')}. SA ≈ ${H.c('g', '1 + 1/T ≈ 1.1')}.</li></ul>
<p><b>Size-tiered compaction</b> (Cassandra STCS, RocksDB "universal", ScyllaDB): runs of similar size accumulate; when there are T of them, they are merged into one run on the next tier.</p>
<ul><li>WA ≈ ${H.c('g', '1 per tier')} → ≈ L total. RA ≈ ${H.c('r', 'up to T runs per tier')}. SA can reach ${H.c('r', '2×')} (a full merge needs the old and new copies at once, and duplicates live longer).</li></ul>
<p><b>How many levels?</b> With L1 target size B, fanout T and data size N: L ≈ ⌈log<sub>T</sub>(N / B)⌉ + 1. Example: N = 1 TB, B = 256 MB, T = 10 → log<sub>10</sub>(4096) ≈ 3.6 → 4 levels below L1 → <b>5 levels</b> (L1 256 MB, L2 2.56 GB, L3 25.6 GB, L4 256 GB, L5 2.56 TB target).</p>
<p><b>Specialised strategies:</b> <b>time-window</b> (Cassandra TWCS) compacts only within a time bucket and expires whole files when the TTL passes — perfect for metrics; <b>FIFO</b> (RocksDB) just deletes the oldest file, for caches and logs.</p>`,
    clues: [
      '"Disk write bandwidth is 10× the ingest rate" → write amplification from compaction',
      '"Reads get slower over the day, then recover at night" → compaction debt / too many L0 files or tiers',
      '"Disk usage spikes to 2× during compaction" → size-tiered space amplification',
      '"Time-series data with a 30-day TTL" → time-window or FIFO compaction, drop whole files',
      '"How many levels does RocksDB need for N TB?" → log_T(N / L1 size) arithmetic',
      '"leveled vs tiered" / "RocksDB universal compaction" / "Cassandra LCS vs STCS" → WA vs RA vs SA trade-off'
    ],
    code: [
      py(`import math

def leveled(n_gb, l1_gb=0.256, fanout=10):
    levels = max(1, math.ceil(math.log(n_gb / l1_gb, fanout))) + 1   # L1..Ln
    wa = 2 + fanout * (levels - 1) / 2          # WAL + flush + average merge cost per level move
    wa_worst = 2 + fanout * (levels - 1)
    sa = 1 + 1 / fanout                          # only the last level holds most data
    ra = levels                                  # one run per level (plus L0 files)
    return levels, wa, wa_worst, sa, ra

def tiered(n_gb, run_gb=0.064, fanout=4):
    tiers = max(1, math.ceil(math.log(n_gb / run_gb, fanout)))
    wa = 2 + tiers                               # every byte rewritten once per tier
    sa = 2.0                                     # worst case during a full merge
    ra = tiers * (fanout - 1) + 1                # up to T-1 runs waiting on each tier
    return tiers, wa, sa, ra

for n in (100, 1_000, 10_000):                    # GB of live data
    L, wa, waw, sa, ra = leveled(n)
    t, twa, tsa, tra = tiered(n)
    print("%6d GB | leveled: %d levels, WA ~%.0f (worst %.0f), SA %.2f, RA %d runs"
          "  | tiered: %d tiers, WA ~%.0f, SA up to %.1f, RA up to %d runs"
          % (n, L, wa, waw, sa, ra, t, twa, tsa, tra))

ingest_mb_s = 50
L, wa, *_ = leveled(1_000)
print("1 TB leveled at %d MB/s ingest -> ~%d MB/s of compaction writes (plus as many reads)"
      % (ingest_mb_s, ingest_mb_s * wa))`, 'Compaction calculator: levels and amplifications (▶ Run)'),
      lab(`-- Target size of each level for leveled compaction (L1 = 256 MB, fanout 10) until we can hold 1 TB
WITH RECURSIVE lv(level, target_mb, cumulative_mb) AS (
  SELECT 1, 256.0, 256.0
  UNION ALL
  SELECT level + 1, target_mb * 10, cumulative_mb + target_mb * 10
  FROM lv WHERE cumulative_mb < 1024 * 1024
)
SELECT level, ROUND(target_mb / 1024, 2) AS target_gb, ROUND(cumulative_mb / 1024, 1) AS cumulative_gb
FROM lv;`, 'Level sizes with a recursive CTE (▶ Run)'),
      eng(`-- Compaction picking (RocksDB-style "score"): L0 by file count, L1+ by size / target.
-- Here L1 target = 128 MB and each deeper level is 10x bigger. Highest score >= 1 compacts first.
WITH lvl AS (
  SELECT level, COUNT(*) AS files, SUM(size_mb) AS size_mb FROM sstables GROUP BY level
), scored AS (
  SELECT level, files, size_mb,
         CASE level WHEN 0 THEN NULL WHEN 1 THEN 128 WHEN 2 THEN 1280 ELSE 12800 END AS target_mb,
         CASE WHEN level = 0 THEN ROUND(files / 4.0, 2)
              ELSE ROUND(size_mb * 1.0 / (CASE level WHEN 1 THEN 128 WHEN 2 THEN 1280 ELSE 12800 END), 2) END AS score
  FROM lvl
)
SELECT level, files, size_mb, target_mb, score,
       CASE WHEN score >= 1 THEN 'needs compaction' ELSE 'ok' END AS verdict
FROM scored ORDER BY score DESC;

-- Files in L1 that an L0 -> L1 compaction must rewrite (their range overlaps the L0 files' range)
SELECT l1.id, l1.min_key, l1.max_key
FROM sstables l1,
     (SELECT MIN(min_key) AS lo, MAX(max_key) AS hi FROM sstables WHERE level = 0) l0
WHERE l1.level = 1 AND l1.max_key >= l0.lo AND l1.min_key <= l0.hi;`, 'Compaction score and overlapping files (▶ Run)')
    ],
    codeTitle: ['Amplification calculator', 'Level sizes', 'Picking a compaction'],
    viz: {
      title: 'Compaction simulator: leveled vs size-tiered write amplification',
      input: 'mode=leveled fanout=3 flushes=12',
      inputLabel: 'mode=leveled|tiered fanout=2..5 flushes=1..24 (each flush = 1 unit)',
      gen: function (input) {
        var s = String(input || '');
        var mode = (/mode\s*=\s*(\w+)/i.exec(s) || [0, 'leveled'])[1].toLowerCase();
        var T = +((/fanout\s*=\s*(\d+)/i.exec(s) || [0, 3])[1]);
        var N = +((/flushes\s*=\s*(\d+)/i.exec(s) || [0, 12])[1]);
        if (mode !== 'leveled' && mode !== 'tiered') throw new Error('mode must be leveled or tiered');
        if (!(T >= 2 && T <= 5)) throw new Error('fanout must be 2..5');
        if (!(N >= 1 && N <= 24)) throw new Error('flushes must be 1..24');
        var LV = 5, lev = [], written = [], user = 0, frames = [];
        for (var i = 0; i < LV; i++) { lev.push([]); written.push(0); }
        function size(i) { var t = 0; lev[i].forEach(function (x) { t += x; }); return t; }
        function cap(i) { return i === 0 ? null : Math.pow(T, i); }
        function total() { var t = 0; written.forEach(function (x) { t += x; }); return t; }
        function runs() {
          if (mode === 'tiered') { var r = 0; lev.forEach(function (l) { r += l.length; }); return r; }
          var r2 = lev[0].length; for (var i = 1; i < LV; i++) if (lev[i].length) r2++; return r2;
        }
        function push(narr, hlRows, hlBars) {
          var w = 1; lev.forEach(function (l) { w = Math.max(w, l.length); });
          var rows = [], ghl = {}, rowHead = [];
          lev.forEach(function (l, i) {
            var r = l.map(String); while (r.length < w) r.push('');
            rows.push(r);
            rowHead.push((mode === 'tiered' ? 'Tier ' : 'L') + i + (mode === 'leveled' && i > 0 ? ' (target ' + cap(i) + ')' : '') + ' = ' + size(i));
            if (hlRows && hlRows[i]) for (var c = 0; c < l.length; c++) ghl[i + ',' + c] = hlRows[i];
          });
          var colHead = []; for (var c2 = 0; c2 < w; c2++) colHead.push(mode === 'tiered' ? 'run ' + c2 : 'file ' + c2);
          frames.push({ narr: narr, parts: [
            { type: 'grid', label: (mode === 'tiered' ? 'Tiers: each cell is a sorted run (its size in units)' : 'Levels: each cell is an SST file (size in units); L1+ files never overlap'), rows: rows, rowHead: rowHead, colHead: colHead, hl: ghl },
            { type: 'bars', label: 'Units written into each level so far (flushes + compactions)', values: written.slice(), idxLabels: lev.map(function (_, i) { return (mode === 'tiered' ? 'T' : 'L') + i; }), hl: hlBars || {} },
            { type: 'vars', label: 'Amplification', vals: { user_units: user, disk_units_written: total(), write_amp: user ? (total() / user).toFixed(2) : '—', sorted_runs_to_check: runs(), live_units: user } }
          ] });
        }
        push('Start: ' + mode + ' compaction, fanout <b>' + T + '</b>. Each flush writes 1 unit of user data into ' + (mode === 'tiered' ? 'tier 0' : 'L0') + '. We count every unit the engine physically writes to find the <b>write amplification</b>. (Assume no overwrites, so live data = user data.)');
        for (var f = 1; f <= N; f++) {
          user++; lev[0].push(1); written[0]++;
          var h0 = {}; h0[0] = 'cur'; var b0 = {}; b0[0] = 'cur';
          push('<b>Flush #' + f + '</b>: the memtable becomes a 1-unit sorted run in ' + (mode === 'tiered' ? 'tier 0' : 'L0') + '. Disk writes so far: ' + total() + ' for ' + user + ' units of user data.', h0, b0);
          if (mode === 'tiered') {
            for (var t = 0; t < LV - 1; t++) {
              if (lev[t].length >= T) {
                var sum = 0; lev[t].forEach(function (x) { sum += x; });
                lev[t] = []; lev[t + 1].push(sum); written[t + 1] += sum;
                var ht = {}; ht[t + 1] = 'ok'; var bt = {}; bt[t + 1] = 'ok';
                push('<b>Tier ' + t + ' has ' + T + ' runs</b> of similar size → merge them into <b>one run of ' + sum + '</b> on tier ' + (t + 1) + '. Each byte is rewritten <b>once per tier</b>, so tiered WA grows slowly. During the merge the old and new copies both exist (space amplification up to 2×).', ht, bt);
              }
            }
          } else {
            if (lev[0].length >= 2) {
              var s0 = size(0), s1 = size(1);
              lev[0] = []; var n1 = s0 + s1; lev[1] = []; for (var k = 0; k < n1; k++) lev[1].push(1); written[1] += n1;
              var hl1 = {}; hl1[1] = 'ok'; var bl1 = {}; bl1[1] = 'ok';
              push('<b>L0 → L1</b>: L0 files overlap each other, so all ' + s0 + ' L0 units are merged with the whole of L1 (' + s1 + ' units) and rewritten as ' + n1 + ' non-overlapping L1 files. Cost: <b>' + n1 + ' units written</b> to move ' + s0 + ' units down.', hl1, bl1);
            }
            for (var L = 1; L < LV - 1; L++) {
              while (size(L) > cap(L)) {
                var below = size(L + 1), overlap = Math.min(T, below);
                lev[L].pop(); lev[L + 1].push(1); written[L + 1] += 1 + overlap;
                var hl2 = {}; hl2[L] = 'bad'; hl2[L + 1] = 'ok'; var bl2 = {}; bl2[L + 1] = 'ok';
                push('<b>L' + L + ' is over its target</b> (' + (size(L) + 1) + ' &gt; ' + cap(L) + '). Pick one file and merge it with the ~' + overlap + ' overlapping file(s) in L' + (L + 1) + ': write <b>' + (1 + overlap) + ' units</b> to move 1 unit down. With a full level below this is ≈ T + 1 per move — the source of leveled WA ≈ T per level.', hl2, bl2);
              }
            }
          }
        }
        var wa = (total() / user).toFixed(2);
        push('<b>Result (' + mode + ', fanout ' + T + '):</b> ' + user + ' units of user data caused ' + total() + ' units of disk writes → <b>WA = ' + wa + '</b>; a read may need to check <b>' + runs() + '</b> sorted run(s). Try the other mode with the same inputs: tiered usually gives lower WA but more runs to check (read amplification) and higher temporary space use.', null, null);
        return frames;
      }
    },
    examples: [
      {
        title: 'Compaction math: 1 TB on RocksDB defaults',
        html: `<p>L1 = 256 MB, T = 10. Level targets: 0.25 GB, 2.5 GB, 25 GB, 250 GB, 2.5 TB → data lands in <b>5 levels</b>. A key written once travels L0 → L1 → … → L5. Each level move rewrites it about T/2 to T times (merging into a fuller or emptier next level):</p>
${H.table(['component', 'writes per user byte'], [['WAL', '1'], ['flush to L0', '1'], ['L0 → L1', '≈ 1–2'], ['L1 → L2 … L4 → L5 (4 moves × ~5–10)', '≈ 20–40'], ['total', H.c('r', '≈ 23–44 worst case; typically 10–30 observed')]])}
<p>At 50 MB/s ingest that is roughly <b>1–1.5 GB/s</b> of background writes, plus as much read I/O. On a single NVMe that is most of its bandwidth: the ingest ceiling comes from compaction, not from the WAL.</p>`
      },
      {
        title: 'Dynamic level sizing fixes space amplification',
        html: `<p>With static targets and only 300 GB of data, L5 (target 2.5 TB) is nearly empty while L4 (target 250 GB) is full — the "last level" is not the biggest, and stale versions in L4 are not cleaned by bottom-level compaction → space amplification can exceed 2×. RocksDB's <code>level_compaction_dynamic_level_bytes = true</code> (default since RocksDB 8.4) sizes levels <b>from the bottom up</b>: last level = actual data (300 GB), L4 = 30 GB, L3 = 3 GB, L2 = 300 MB, and empty upper levels are skipped. Space amplification stays ≈ 1.11.</p>`
      },
      {
        title: 'Tiered compaction space spike',
        html: `<p>Cassandra STCS, a table of 600 GB currently in four ~150 GB SSTables. When those four get merged, the new 600 GB SSTable is written <i>before</i> the old ones are deleted → the node needs <b>1.2 TB</b> free during the compaction. Rule of thumb for STCS: keep ~50% disk free. LCS needs only ~10% headroom but costs more write I/O; UCS (Cassandra 5's unified compaction) lets you pick a point between them with one parameter.</p>`
      },
      {
        title: 'Tombstones and the bottom level',
        html: `<p>A tombstone for key k can be dropped only when compaction reaches a level where <b>no older version of k can exist below</b> — usually the last level (or when all lower files' ranges exclude k). Until then it must be carried down, consuming space and slowing scans. Cassandra additionally waits <code>gc_grace_seconds</code> so a replica that missed the delete cannot resurrect the value via repair ("zombie data").</p>`,
        code: eng(`-- Tombstones in the write stream and whether a newer write overrides them
SELECT k, seq, op,
       CASE WHEN op = 'D' AND seq = (SELECT MAX(seq) FROM kv_log x WHERE x.k = kv_log.k)
            THEN 'live tombstone: must reach the bottom level before it can be dropped'
            WHEN op = 'D' THEN 'tombstone shadowed by a newer put'
            ELSE 'put' END AS note
FROM kv_log ORDER BY k, seq;`)
      }
    ],
    deepDive: `<p><b>🟣 Where the "T per level" comes from.</b> Moving one file of size S from Li to Li+1 merges it with the files in Li+1 covering the same key range. Because Li+1 is T times larger and keys are spread evenly, that is ≈ T × S of overlapping data, so we write ≈ (T + 1) × S to move S bytes down. Every byte does this once per level → WA<sub>leveled</sub> ≈ T × L in the worst case. Tiered: merging T runs of size S into one of size T × S writes each byte once per tier → WA<sub>tiered</sub> ≈ L. Choosing T is the dial: bigger T → fewer levels (better RA, SA) but more WA per level in leveled; in tiered, bigger T → fewer merges but more runs to read.</p>
<p><b>Monkey and Dostoevsky</b> (Harvard DASlab research): allocate Bloom filter bits non-uniformly (more bits for smaller, upper levels) to cut lookup cost, and use "lazy leveling" — tiering on upper levels, leveling only at the last level — to get near-tiered WA with near-leveled space. RocksDB's hybrid options and Cassandra 5's UCS follow these ideas.</p>
<p><b>Operational knobs.</b> RocksDB: <code>max_background_jobs</code>, subcompactions (parallelise one big compaction by key range), a rate limiter to cap compaction I/O, <code>compaction_pri = kMinOverlappingRatio</code> (pick files whose overlap below is smallest, reducing WA), compaction filters (drop expired keys during merge — TTL for free), and per-level compression (no compression on L0/L1 for speed, Zstd on the bottom for space).</p>
<p><b>Disaggregated compaction.</b> Cloud designs (e.g. RocksDB remote compaction, Neon and various serverless databases on object storage) offload compaction to separate workers so foreground nodes keep CPU and I/O for queries — the math stays the same, only the bill moves.</p>`,
    aiEra: `<p><b>What AI changes:</b> auto-tuners (RocksDB tuning advisors, ML-based configuration tools from academic work like OtterTune's lineage) explore compaction knobs far faster than a human. They are useful — but the search space is only meaningful if you know which amplification your workload is actually paying.</p>
<p><b>Use AI as a partner:</b> paste RocksDB <code>LOG</code> compaction stats ("Cumulative compaction: X GB write, Y MB/s") and ask it to compute observed WA per level and to explain stalls. Then cross-check with the formula: does WA ≈ T per level match?</p>
<p><b>Where AI goes wrong:</b> mixing up leveled and tiered trade-offs (claiming tiered has lower read amplification), using decimal and binary units inconsistently, ignoring L0 → L1 cost, or suggesting a huge fanout without noting the WA penalty.</p>
<p><b>What you must still own:</b> deriving WA, RA and SA for both strategies on a whiteboard, sizing levels for a given data volume, and telling an interviewer which strategy fits a write-heavy time-series vs. an update-heavy key-value workload.</p>`,
    problems: [
      {
        title: 'Size the Levels and the Compaction Bandwidth',
        level: 'Medium', tags: ['LSM', 'compaction', 'recursive CTE'], companies: ['Meta', 'ByteDance', 'Confluent', 'Cockroach Labs'],
        statement: `<p>A leveled LSM has L1 target <b>256 MB</b> and fanout <b>T = 10</b>. It must hold <b>2 TB</b> (2,097,152 MB) of live data and ingest <b>40 MB/s</b>. Write a query that lists each level's target size until the cumulative capacity reaches 2 TB, then estimate total WA as 2 + T × (levels − 1) / 2 and the background write bandwidth.</p>`,
        constraints: `Use a recursive CTE; stop as soon as cumulative capacity ≥ 2,097,152 MB.`,
        example: `<p>Levels: 256 MB, 2,560 MB, 25,600 MB, 256,000 MB, 2,560,000 MB → ${H.c('b', '5 levels')}. WA ≈ 2 + 10 × 4 / 2 = ${H.c('y', '22')}. Bandwidth ≈ 40 × 22 = ${H.c('r', '880 MB/s')} of writes.</p>`,
        brute: {
          why: `<p>A loop in application code works, but the point of the exercise is to keep the planning model next to the data: a recursive CTE expresses "keep multiplying by T until it fits" directly in SQL, and you can join the result with live catalogue tables like <code>sstables</code>.</p>`,
          code: { lang: 'python', run: true, code: `target, cum, level = 256, 0, 0
while cum < 2_097_152:
    level += 1
    cum += target
    print("L%d target %d MB (cumulative %d MB)" % (level, target, cum))
    target *= 10
wa = 2 + 10 * (level - 1) / 2
print("levels", level, "WA", wa, "bandwidth MB/s", 40 * wa)` }
        },
        mcq: { q: 'Doubling the fanout T from 10 to 20 in leveled compaction mainly…', options: ['Reduces the number of levels but increases write amplification per level', 'Reduces write amplification everywhere', 'Increases space amplification to 2×', 'Has no effect on reads'], answer: 0, explain: 'Fewer levels (log base T grows) but each level move now merges ~T files, so WA per level goes up; total WA ≈ T × L usually rises.' },
        hints: [
          `<p>Hint 1: start the recursion at level 1 with target 256 and cumulative 256.</p>`,
          `<p>Hint 2: the recursive step multiplies the target by 10 and adds it to the cumulative total; stop when the <i>previous</i> cumulative already reached 2 TB.</p>`,
          `<p>Hint 3: compute WA from <code>MAX(level)</code> in a second CTE, then bandwidth = 40 × WA.</p>`
        ],
        tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
          { rows: [
              [1, 256, 256, 5, 22, 880],
              [2, 2560, 2816, 5, 22, 880],
              [3, 25600, 28416, 5, 22, 880],
              [4, 256000, 284416, 5, 22, 880],
              [5, 2560000, 2844416, 5, 22, 880]
            ] },
          { after: 'UPDATE params SET capacity_mb = 256; SELECT * FROM lsm_levels', rows: [
              [1, 256, 256, 1, 2, 80]
            ] },
          { after: 'UPDATE params SET capacity_mb = 257; SELECT * FROM lsm_levels', rows: [
              [1, 256, 256, 2, 7, 280],
              [2, 2560, 2816, 2, 7, 280]
            ] },
          { after: 'UPDATE params SET l1_mb = 64, fanout = 4, capacity_mb = 10000; SELECT * FROM lsm_levels', rows: [
              [1, 64, 64, 5, 10, 400],
              [2, 256, 320, 5, 10, 400],
              [3, 1024, 1344, 5, 10, 400],
              [4, 4096, 5440, 5, 10, 400],
              [5, 16384, 21824, 5, 10, 400]
            ] },
          { after: 'UPDATE params SET fanout = 3, l1_mb = 100, capacity_mb = 1000, ingest_mb_s = 7; SELECT * FROM lsm_levels', rows: [
              [1, 100, 100, 3, 5, 35],
              [2, 300, 400, 3, 5, 35],
              [3, 900, 1300, 3, 5, 35]
            ] },
          { after: 'UPDATE params SET capacity_mb = 100; SELECT * FROM lsm_levels', rows: [
              [1, 256, 256, 1, 2, 80]
            ] },
          { after: 'UPDATE params SET fanout = 2, l1_mb = 1, capacity_mb = 1000000, ingest_mb_s = 100; SELECT * FROM lsm_levels', rows: [
              [1, 1, 1, 20, 21, 2100],
              [2, 2, 3, 20, 21, 2100],
              [3, 4, 7, 20, 21, 2100],
              [4, 8, 15, 20, 21, 2100],
              [5, 16, 31, 20, 21, 2100],
              [6, 32, 63, 20, 21, 2100],
              [7, 64, 127, 20, 21, 2100],
              [8, 128, 255, 20, 21, 2100],
              [9, 256, 511, 20, 21, 2100],
              [10, 512, 1023, 20, 21, 2100],
              [11, 1024, 2047, 20, 21, 2100],
              [12, 2048, 4095, 20, 21, 2100],
              [13, 4096, 8191, 20, 21, 2100],
              [14, 8192, 16383, 20, 21, 2100],
              [15, 16384, 32767, 20, 21, 2100],
              [16, 32768, 65535, 20, 21, 2100],
              [17, 65536, 131071, 20, 21, 2100],
              [18, 131072, 262143, 20, 21, 2100],
              [19, 262144, 524287, 20, 21, 2100],
              [20, 524288, 1048575, 20, 21, 2100]
            ] },
          { after: 'UPDATE params SET ingest_mb_s = 0; SELECT * FROM lsm_levels', rows: [
              [1, 256, 256, 5, 22, 0],
              [2, 2560, 2816, 5, 22, 0],
              [3, 25600, 28416, 5, 22, 0],
              [4, 256000, 284416, 5, 22, 0],
              [5, 2560000, 2844416, 5, 22, 0]
            ] }
        ] },
        solution: {
          approach: `<p>Recursive CTE generates level targets; aggregate the level count; derive WA and bandwidth. Five levels, WA ≈ 22, ≈ 880 MB/s of compaction writes: this workload needs several disks or nodes (or tiered/hybrid compaction) — a conclusion you can defend with numbers.</p>`,
          code: lab(`CREATE TEMP TABLE params AS
SELECT 256 AS l1_mb, 10 AS fanout, 2097152 AS capacity_mb, 40 AS ingest_mb_s;

CREATE TEMP VIEW lsm_levels AS
WITH RECURSIVE lv(level, target_mb, cum_mb) AS (
  SELECT 1, l1_mb, l1_mb FROM params
  UNION ALL
  SELECT level + 1, target_mb * fanout, cum_mb + target_mb * fanout FROM lv, params WHERE cum_mb < capacity_mb
),
summary AS (SELECT MAX(level) AS levels FROM lv)
SELECT lv.level, lv.target_mb, lv.cum_mb,
       s.levels, 2 + p.fanout * (s.levels - 1) / 2.0 AS est_write_amp,
       p.ingest_mb_s * (2 + p.fanout * (s.levels - 1) / 2.0) AS compaction_write_mb_s
FROM lv CROSS JOIN summary s CROSS JOIN params p
ORDER BY lv.level;

SELECT * FROM lsm_levels;`),
          dry: { head: ['level', 'target MB', 'cumulative MB', 'enough?'], rows: [['1', '256', '256', 'no'], ['2', '2,560', '2,816', 'no'], ['3', '25,600', '28,416', 'no'], ['4', '256,000', '284,416', 'no'], ['5', '2,560,000', '2,844,416', H.c('g', 'yes → stop')]] },
          complexity: `<p>O(L) rows where L = ⌈log<sub>T</sub>(N/B)⌉ + 1 — tiny.</p>`,
          followUps: ['Recompute with dynamic level sizing (last level = 2 TB, each level above = previous / 10).', 'What is the WA for tiered compaction with T = 4 on the same data?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 6 — InnoDB vs RocksDB (and where Postgres fits)
     ===================================================================== */
  topics.push({
    title: 'InnoDB vs RocksDB: Two Real Engines Side by Side',
    analogy: `<p><b>InnoDB is a well-organised library</b>: every book has one fixed shelf position (ordered by primary key). To fix a typo, the librarian goes to that shelf and corrects the page — but first writes the old text in a "previous editions" notebook (undo) so readers who started earlier still see it. <b>RocksDB is a newsroom archive</b>: every correction is a new clipping dropped in today's box with a timestamp. Nobody edits old clippings; at night, staff merge boxes and shred clippings that newer ones replaced.</p>`,
    explain: `<p><b>🟢 InnoDB (MySQL's default engine) in one breath.</b> The table <b>is</b> a B+tree ordered by the primary key — a <b>clustered index</b>: leaf pages (16 KB) hold the full rows. Each row carries hidden columns <code>DB_TRX_ID</code> (6 B, last writer) and <code>DB_ROLL_PTR</code> (7 B, pointer to the previous version in the <b>undo log</b>). Secondary indexes store the <b>primary key value</b>, not a physical address, so a secondary lookup walks two B-trees.</p>
${H.table(['InnoDB part', 'job'], [['Buffer pool', 'caches pages; midpoint LRU; adaptive hash index for hot lookups'], ['Redo log', 'WAL for page changes (<code>innodb_redo_log_capacity</code>); fsync at commit'], ['Undo logs', 'old row versions for rollback and MVCC snapshots; purged later'], ['Doublewrite buffer', 'protects 16 KB pages from torn writes'], ['Change buffer', 'delays secondary-index updates for pages not in memory (MySQL 8.4 defaults it off)'], ['Locks', 'row locks on index records, gap and next-key locks for REPEATABLE READ']])}
<p><b>RocksDB (Meta's embeddable LSM library, fork of Google's LevelDB)</b> is a key-value engine: <code>Put / Get / Delete / Merge / Iterator</code> on byte strings, ordered by key.</p>
${H.table(['RocksDB part', 'job'], [['WAL', 'durability for memtable contents (shared by column families)'], ['MemTable', 'skip list of recent writes; immutable when full'], ['SST files', 'immutable sorted files on L0..Ln with Bloom filters and block index'], ['Compaction', 'leveled (default), universal (tiered) or FIFO'], ['Block cache', 'caches uncompressed data/index/filter blocks'], ['Column families', 'separate LSM trees sharing a WAL (e.g. one per index)'], ['Sequence numbers', 'every write is versioned → cheap snapshots, MVCC for MyRocks/TiKV']])}
<p><b>Who uses RocksDB?</b> MyRocks (MySQL on RocksDB, built for Meta's user database), TiKV (TiDB), YugabyteDB's DocDB, Kafka Streams and Apache Flink state stores, Ceph BlueStore metadata; CockroachDB started on RocksDB and moved to <b>Pebble</b>, a Go re-implementation of the same design.</p>
<p><b>And PostgreSQL?</b> A third design: an unordered <b>heap</b> of pages plus separate B-tree indexes pointing to (page, slot). Updates write a whole new tuple version into the heap (MVCC in the table itself), and <b>VACUUM</b> cleans dead versions. No clustered index, no undo log, redo-only WAL.</p>
${H.table(['', 'InnoDB', 'RocksDB / MyRocks', 'PostgreSQL'], [['structure', 'clustered B+tree', 'LSM-tree', 'heap + B-tree indexes'], ['update', 'in place + undo', 'new version appended', 'new tuple in heap'], ['old versions', 'undo log, purge', 'older SST entries, compaction', 'dead tuples, VACUUM'], ['space efficiency', 'pages ~50–90% full; weak compression', H.c('g', 'best (dense, Zstd per level)'), 'fill factor + bloat'], ['write amp', 'high on random writes', H.c('g', 'lower, sequential'), 'high (+ index updates unless HOT)'], ['read latency', H.c('g', 'low, steady'), 'good, compaction-sensitive', H.c('g', 'low, steady')]])}`,
    clues: [
      '"MySQL InnoDB vs MyRocks" / "why did Facebook move to RocksDB?" → space and write amplification on flash',
      '"Should I use UUID as primary key in MySQL?" → clustered index, random inserts cause page splits and poor locality; prefer auto-increment or time-ordered UUIDv7',
      '"Secondary index lookup is slower in InnoDB" → secondary index stores the PK, so two B-tree walks',
      '"Embedded key-value store for a stream processor / distributed DB" → RocksDB (or Pebble, LMDB, BadgerDB)',
      '"History list length is growing" / "undo tablespace is huge" → long-running transaction blocking InnoDB purge',
      '"Postgres vs MySQL storage" → heap + VACUUM vs clustered index + undo'
    ],
    code: [
      lab(`-- SQLite can show both layouts. A normal table is a B-tree keyed by a hidden rowid (heap-like),
-- while WITHOUT ROWID stores rows inside the primary-key B-tree: a clustered index, like InnoDB.
CREATE TABLE users_rowid (email TEXT PRIMARY KEY, name TEXT, country TEXT);
CREATE TABLE users_clustered (email TEXT PRIMARY KEY, name TEXT, country TEXT) WITHOUT ROWID;
CREATE INDEX idx_rowid_country ON users_rowid(country);
CREATE INDEX idx_clu_country   ON users_clustered(country);
INSERT INTO users_rowid VALUES ('asha@x.io','Asha','IN'), ('ben@x.io','Ben','UK'), ('chen@x.io','Chen','CN');
INSERT INTO users_clustered SELECT * FROM users_rowid;
-- rowid table: PK lookup = search the PK index, then fetch the row by rowid (two B-trees)
EXPLAIN QUERY PLAN SELECT name FROM users_rowid WHERE email = 'ben@x.io';
-- clustered table: PK lookup lands directly on the row (one B-tree)
EXPLAIN QUERY PLAN SELECT name FROM users_clustered WHERE email = 'ben@x.io';
-- secondary index on a clustered table stores the PRIMARY KEY, like InnoDB secondary indexes
EXPLAIN QUERY PLAN SELECT name FROM users_clustered WHERE country = 'UK';
SELECT name FROM users_clustered WHERE country = 'UK';`, 'Rowid (heap-like) vs WITHOUT ROWID (clustered) tables (▶ Run)'),
      { lang: 'java', check: false, title: 'RocksDB Java API sketch (needs the rocksdbjni library)', code: `import org.rocksdb.*;

public class RocksDemo {
    public static void main(String[] args) throws RocksDBException {
        RocksDB.loadLibrary();
        try (Options opt = new Options()
                .setCreateIfMissing(true)
                .setWriteBufferSize(64L << 20)                  // 64 MB memtable
                .setMaxBytesForLevelBase(256L << 20)            // L1 target 256 MB
                .setMaxBytesForLevelMultiplier(10)              // fanout T = 10
                .setLevelCompactionDynamicLevelBytes(true)
                .setCompressionType(CompressionType.LZ4_COMPRESSION)
                .setBottommostCompressionType(CompressionType.ZSTD_COMPRESSION);
             RocksDB db = RocksDB.open(opt, "/tmp/rocks-demo");
             WriteOptions durable = new WriteOptions().setSync(true)) {   // fsync WAL per write
            db.put(durable, "user:1".getBytes(), "asha".getBytes());
            db.delete(durable, "user:2".getBytes());                       // writes a tombstone
            byte[] v = db.get("user:1".getBytes());                        // memtable -> L0 -> Ln
            System.out.println(new String(v));
            try (RocksIterator it = db.newIterator()) {                    // merging iterator
                for (it.seek("user:".getBytes()); it.isValid(); it.next())
                    System.out.println(new String(it.key()) + " = " + new String(it.value()));
            }
        }
    }
}` },
      py(`import bisect
import random

def build_clustered_index(keys, cap=16):
    """Insert keys into B+tree leaf pages the way InnoDB does: split in half, except for
    an append at the far right end, where the old page stays full and a new page starts."""
    leaves, firsts, splits = [[]], [], 0          # firsts[i] = first key of leaves[i + 1]
    for k in keys:
        i = bisect.bisect_right(firsts, k)
        leaf = leaves[i]
        bisect.insort(leaf, k)
        if len(leaf) > cap:
            splits += 1
            if i == len(leaves) - 1 and leaf[-1] == k:     # sequential pattern detected
                new = [leaf.pop()]
            else:                                          # 50/50 split in the middle
                half = len(leaf) // 2
                new = leaf[half:]
                del leaf[half:]
            leaves.insert(i + 1, new)
            firsts.insert(i, new[0])
    rows = sum(len(l) for l in leaves)
    return len(leaves), rows / (len(leaves) * cap), splits

random.seed(42)
N = 4000
auto_inc = list(range(N))
uuid_v4 = random.sample(range(10**12), N)                       # random, like UUIDv4
uuid_v7 = [(i << 20) | random.getrandbits(20) for i in range(N)] # time prefix + random bits

for name, keys in (("auto-increment", auto_inc), ("UUIDv4 (random)", uuid_v4), ("UUIDv7 (time-ordered)", uuid_v7)):
    pages, fill, splits = build_clustered_index(keys)
    print("%-22s pages=%4d  avg fill=%3.0f%%  splits=%d" % (name, pages, 100 * fill, splits))`, 'Why random UUID primary keys hurt a clustered index (▶ Run)')
    ],
    codeTitle: ['Clustered vs rowid tables', 'RocksDB API', 'PK choice and page fill'],
    viz: {
      title: 'One UPDATE through InnoDB, then one Put through RocksDB',
      input: 'both',
      inputLabel: 'both | innodb | rocksdb',
      gen: function (input) {
        var which = String(input || 'both').trim().toLowerCase();
        if (['both', 'innodb', 'rocksdb'].indexOf(which) < 0) throw new Error('Type both, innodb or rocksdb');
        var nodes = [
          { id: 'IC', label: 'Client (InnoDB)', x: 7, y: 14, shape: 'box' },
          { id: 'BP', label: 'Buffer pool', x: 30, y: 14, shape: 'box' },
          { id: 'UN', label: 'Undo log', x: 53, y: 4, shape: 'box' },
          { id: 'RL', label: 'Redo log', x: 53, y: 24, shape: 'box' },
          { id: 'DW', label: 'Doublewrite', x: 74, y: 4, shape: 'box' },
          { id: 'IB', label: '.ibd B+tree', x: 93, y: 14, shape: 'box' },
          { id: 'RC', label: 'Client (RocksDB)', x: 7, y: 56, shape: 'box' },
          { id: 'WL', label: 'WAL', x: 30, y: 46, shape: 'box' },
          { id: 'MT', label: 'MemTable', x: 30, y: 66, shape: 'box' },
          { id: 'IM', label: 'Immutable memtable', x: 53, y: 66, shape: 'box' },
          { id: 'L0', label: 'L0 SSTs', x: 74, y: 66, shape: 'box' },
          { id: 'LN', label: 'L1..Ln SSTs', x: 93, y: 56, shape: 'box' },
          { id: 'BC', label: 'Block cache', x: 74, y: 46, shape: 'box' }
        ];
        var edges = [['IC', 'BP', '1 locate row'], ['BP', 'UN', '2 old version'], ['BP', 'RL', '3 redo rec'], ['BP', 'DW', '5 flush'], ['DW', 'IB', 'in place'],
          ['RC', 'WL', '1 append'], ['RC', 'MT', '2 insert'], ['MT', 'IM', '3 freeze'], ['IM', 'L0', '4 flush'], ['L0', 'LN', '5 compact'], ['LN', 'BC', 'read'], ['BC', 'RC', '6 get']];
        var frames = [];
        function f(narr, hl, ehl, tags) { frames.push({ narr: narr, parts: [{ type: 'graph', label: 'Write paths (top: InnoDB, bottom: RocksDB)', directed: true, height: 72, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }] }); }
        if (which !== 'rocksdb') {
          f('<b>InnoDB: UPDATE accounts SET bal = 70 WHERE id = 7.</b> Walk the clustered B+tree from the root to the leaf holding id 7. If the leaf page is not cached, read it from the .ibd file into the buffer pool. Take an exclusive row lock on that index record.', { IC: 'cur', BP: 'cur' }, { 'IC-BP': 'cur' }, { BP: 'page 812 pinned' });
          f('Before touching the row, copy its <b>old version</b> (bal = 100) into the <b>undo log</b> and point the row\'s hidden <code>DB_ROLL_PTR</code> at it. Rollback uses it; MVCC readers with older snapshots follow the pointer to see 100.', { BP: 'cur', UN: 'ok' }, { 'BP-UN': 'ok' }, { UN: 'bal=100' });
          f('Modify the row <b>in place</b> in the 16 KB page (now dirty) and append a <b>redo record</b> to the log buffer. The undo write itself is also redo-logged, so undo survives a crash.', { BP: 'sel', RL: 'ok' }, { 'BP-RL': 'ok' }, { BP: 'dirty', RL: 'LSN 9001' });
          f('<b>COMMIT</b>: fsync the redo log (group commit) — the client gets OK now. The data page is still only in memory: <b>no-force</b>.', { RL: 'ok', IC: 'ok' }, { 'BP-RL': 'done' }, { RL: 'fsynced' });
          f('Later a <b>page cleaner</b> thread flushes the dirty page: first into the <b>doublewrite</b> area (sequential, fsync), then <b>in place</b> into the .ibd file. If power fails mid-write, recovery copies the intact page from the doublewrite area.', { DW: 'cur', IB: 'ok' }, { 'BP-DW': 'cur', 'DW-IB': 'ok' }, { IB: 'page 812 = bal 70' });
          f('Finally the <b>purge</b> thread removes the undo record once no active snapshot needs bal = 100, and checkpoints advance so old redo can be reused. Watch "History list length" — a long-running transaction stops purge and undo grows.', { UN: 'done' }, {}, { UN: 'purged' });
        }
        if (which !== 'innodb') {
          f('<b>RocksDB: Put("acct:7", "70").</b> Append the write (inside a WriteBatch with a sequence number) to the <b>WAL</b>; with <code>sync=true</code> it is fsynced. No page is read first — RocksDB does not need the old value.', { RC: 'cur', WL: 'ok' }, { 'RC-WL': 'ok' }, { WL: 'seq 501' });
          f('Insert into the <b>memtable</b> (a skip list) as acct:7@501. The old value 100 still sits untouched in some SST file. Write done: one sequential append + one memory insert.', { RC: 'cur', MT: 'ok' }, { 'RC-MT': 'ok' }, { MT: 'acct:7@501' });
          f('When the memtable reaches 64 MB it becomes <b>immutable</b>; a fresh memtable takes new writes so ingestion never pauses.', { MT: 'done', IM: 'cur' }, { 'MT-IM': 'cur' }, { IM: 'frozen' });
          f('A background thread <b>flushes</b> the immutable memtable as a new sorted SST file in L0, then the WAL segment covering it is deleted.', { IM: 'done', L0: 'ok' }, { 'IM-L0': 'ok' }, { L0: 'new SST' });
          f('<b>Compaction</b> later merges that L0 file into L1..Ln; acct:7@501 survives, the older acct:7 = 100 version is dropped (unless a snapshot still needs it). Write amplification is paid here, in big sequential I/O.', { L0: 'cur', LN: 'ok' }, { 'L0-LN': 'ok' }, { LN: 'acct:7=70' });
          f('<b>Get("acct:7")</b>: memtable → immutable memtable → L0 files (Bloom filters) → one file per level, data blocks served from the <b>block cache</b> when hot. The first match by newest sequence number wins.', { BC: 'sel', RC: 'sel' }, { 'LN-BC': 'sel', 'BC-RC': 'sel' }, { RC: '70' });
        }
        f('<b>Compare:</b> InnoDB pays at write time (find the page, undo copy, later a 16 KB in-place write + doublewrite) but reads are one B-tree walk. RocksDB pays later (flush + compaction rewrites) but each write is just a log append and a memory insert. Same durability guarantee: both are only "committed" once their log is fsynced.', { BP: 'win', MT: 'win' }, {}, {});
        if (frames.length < 4) f('Pick "both" to compare the two paths in one run.', {}, {}, {});
        return frames;
      }
    },
    examples: [
      {
        title: 'UUIDv4 primary key in InnoDB',
        html: `<p>Inserting random UUIDs into a clustered index scatters writes across every leaf page: pages split 50/50 and settle near <b>~69% full</b>, the working set is the <i>whole</i> table (no hot right edge), and every secondary index stores the 16-byte PK. Auto-increment keys append at the right edge: pages fill to ~94% (InnoDB leaves 1/16 free), and only the last page is hot. Time-ordered <b>UUIDv7</b> (RFC 9562, 2024) or ULIDs give you global uniqueness <i>and</i> right-edge inserts. Run the Python sketch above to see ~100% vs ~70% fill.</p>`
      },
      {
        title: 'Secondary index lookup cost',
        html: `<p><code>SELECT * FROM orders WHERE customer_id = 42</code> in InnoDB: walk <code>idx_customer</code> (3 levels) to find PK values, then walk the clustered index (3–4 levels) for each match. 100 matches → up to 100 extra B-tree descents (mostly cached upper levels, but leaf reads are random). A <b>covering index</b> <code>(customer_id, status, total)</code> answers <code>SELECT status, total</code> without touching the clustered index at all. In MyRocks the same two-step lookup happens across two column families.</p>`
      },
      {
        title: 'MyRocks at Meta in numbers',
        html: `<p>Meta's user database (UDB) moved from compressed InnoDB to MyRocks around 2016–2017. Publicly reported results: roughly <b>half the storage</b> of compressed InnoDB and much lower bytes written to flash, at similar CPU. The reasons map directly onto this module: no half-empty pages (space), no 16 KB rewrite per small change (write amplification), better compression of immutable sorted blocks, and per-level compression (light on top, Zstd at the bottom).</p>`
      },
      {
        title: 'The "history list length" incident',
        html: `<p>A BI tool opens a <code>REPEATABLE READ</code> transaction at 9:00 and leaves it idle. InnoDB cannot purge any undo newer than that snapshot. By 17:00 <b>history list length</b> is 40 million, undo tablespaces have grown by 80 GB, and simple reads slow down because they walk long version chains. Fix: kill the idle transaction, set <code>wait_timeout</code>/<code>max_execution_time</code>, and alert on history list length. (The Postgres equivalent is an old <code>xmin</code> horizon blocking VACUUM; in RocksDB a long-lived snapshot blocks compaction from dropping old versions.)</p>`,
        code: eng(`-- Toy "version chain" view: how many old versions a long snapshot keeps alive per key
SELECT k, COUNT(*) AS versions_written,
       COUNT(*) - 1 AS old_versions_kept_if_a_snapshot_predates_all
FROM kv_log GROUP BY k ORDER BY versions_written DESC, k;`)
      }
    ],
    deepDive: `<p><b>🟣 InnoDB file layout.</b> Each table lives in its own <code>.ibd</code> tablespace (<code>innodb_file_per_table</code>). Space is managed in <b>extents</b> of 64 pages (1 MB) grouped into <b>segments</b> (one for leaf pages, one for non-leaf pages per index), so a B-tree's leaves stay roughly contiguous and range scans can use read-ahead. Pages merge when they drop below <code>MERGE_THRESHOLD</code> (50%).</p>
<p><b>InnoDB locking interacts with storage.</b> Locks are attached to <b>index records</b>; REPEATABLE READ uses <b>next-key locks</b> (record + gap before it) to prevent phantoms, which is why a range UPDATE without a good index can lock huge parts of a table.</p>
<p><b>RocksDB internals worth naming.</b> <b>Merge operator</b> (blind read-modify-write: counters, list appends) avoids reads at write time; <b>TransactionDB</b> provides pessimistic or optimistic transactions on top; <b>BlobDB</b> stores large values separately (WiscKey) to cut compaction cost; <b>HyperClockCache</b> is a lock-free block cache; <b>user-defined timestamps</b> support MVCC in systems like TiKV and CockroachDB-style designs.</p>
<p><b>MyRocks trade-offs.</b> Gains: space, write amplification, replication-friendly. Costs: range scans across many levels can be slower, unique secondary keys need reads during writes, <code>SELECT ... FOR UPDATE</code> gap-lock semantics differ (MyRocks has no gap locks, so it effectively requires READ COMMITTED or RR without gap locks), and tuning compaction is a skill of its own.</p>
<p><b>Other engines to know.</b> <b>WiredTiger</b> (MongoDB): B-tree with in-memory page images, copy-on-write checkpoints every 60 s plus a journal; supports compression well. <b>LMDB</b>: copy-on-write B+tree via mmap, single writer, no WAL needed. <b>Aurora / Neon / AlloyDB</b>: keep the engine's page format but move WAL processing and page materialisation into a distributed storage layer.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate schemas fast — and they love <code>id CHAR(36) DEFAULT (UUID())</code> as a primary key. In InnoDB that is the random-UUID clustered-index anti-pattern. Knowing the storage engine lets you catch it in review and ask for BIGINT auto-increment or UUIDv7 instead.</p>
<p><b>Use AI as a partner:</b> give it <code>SHOW ENGINE INNODB STATUS</code> or RocksDB <code>LOG</code> statistics and ask for a summary of buffer pool hit rate, history list length, pending flushes or stall counters. Ask it to write the db_bench/sysbench command lines for a fair InnoDB vs MyRocks comparison.</p>
<p><b>Where AI goes wrong:</b> saying "Postgres has a clustered index" (CLUSTER is a one-time reorder, not maintained), claiming RocksDB is a full SQL database, recommending the query cache (removed in MySQL 8.0) or change buffer settings from old MySQL versions, or presenting MyRocks savings without the trade-offs.</p>
<p><b>What you must still own:</b> explaining why InnoDB secondary indexes store the PK, why UUIDv4 PKs hurt, what undo/purge and compaction each clean up, and when you would accept LSM read costs for space and write savings.</p>`,
    problems: [
      {
        title: 'Primary Key Choice and Page Fill in a Clustered Index',
        level: 'Medium', tags: ['InnoDB', 'clustered index', 'page split', 'simulation'], companies: ['Shopify', 'GitHub', 'Booking.com', 'PlanetScale'],
        statement: `<p>Simulate inserting <b>N</b> keys into B+tree leaf pages of capacity <b>C</b> using InnoDB's split rule: when a page overflows, split it 50/50 (when the count is odd, the right-hand page keeps the extra key) — <b>unless</b> the insert is at the far right end of the last page (sequential pattern), in which case keep the old page full and start a new page. Report pages, average fill and splits for auto-increment keys, random keys (UUIDv4) and time-ordered keys (UUIDv7).</p>`,
        constraints: `N ≤ 10<sup>5</sup>, 4 ≤ C ≤ 256. Inserts in the given order.`,
        example: `<p>N = 4000, C = 16 → auto-increment: ${H.c('g', '250 pages, ~100% full')}; UUIDv4: ${H.c('r', '~355 pages, ~70% full')}; UUIDv7: ${H.c('g', '~250 pages')}. Random keys need ~40% more pages, so more I/O and a bigger working set.</p>`,
        brute: {
          why: `<p>The naive estimate is pages = ⌈N / C⌉, assuming every page is full. It is exact for sequential keys and wrong by ~40% for random keys, because a 50/50 split leaves two half-full pages that only slowly fill up again. You must simulate (or know the ln 2 ≈ 69% result for random B-tree inserts).</p>`,
          code: { lang: 'python', run: true, code: `import math
N, C = 4000, 16
print("naive pages =", math.ceil(N / C), "(assumes 100% fill for every key pattern)")` }
        },
        mcq: { q: 'Why does InnoDB avoid a 50/50 split when inserting at the far right of the last page?', options: ['With sequential keys the left half would never receive more rows, leaving pages half empty forever', 'To save CPU on sorting', 'Because the right page is locked', 'It is required by the WAL protocol'], answer: 0, explain: 'Auto-increment inserts only ever go to the right edge; a 50/50 split would leave every page permanently ~50% full.' },
        hints: [
          `<p>Hint 1: keep leaves as a list of sorted lists, plus an array of each leaf's first key for <code>bisect</code> to find the target leaf.</p>`,
          `<p>Hint 2: after inserting, if the leaf exceeds C, detect "last leaf and the new key is its maximum" for the sequential split; otherwise split at len/2.</p>`,
          `<p>Hint 3: keep the first-key array in sync when you insert a new leaf. Fill = total rows / (pages × C).</p>`
        ],
        tests: { sig: 'int[] int -> int[]', fn: 'run_tree', harness: { python: 'def run_tree(keys, cap):\n    return list(simulate(keys, cap))' }, cases: [
          [
            [
              [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541, 542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 561, 562, 563, 564, 565, 566, 567, 568, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 580, 581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 598, 599, 600, 601, 602, 603, 604, 605, 606, 607, 608, 609, 610, 611, 612, 613, 614, 615, 616, 617, 618, 619, 620, 621, 622, 623, 624, 625, 626, 627, 628, 629, 630, 631, 632, 633, 634, 635, 636, 637, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649, 650, 651, 652, 653, 654, 655, 656, 657, 658, 659, 660, 661, 662, 663, 664, 665, 666, 667, 668, 669, 670, 671, 672, 673, 674, 675, 676, 677, 678, 679, 680, 681, 682, 683, 684, 685, 686, 687, 688, 689, 690, 691, 692, 693, 694, 695, 696, 697, 698, 699, 700, 701, 702, 703, 704, 705, 706, 707, 708, 709, 710, 711, 712, 713, 714, 715, 716, 717, 718, 719, 720, 721, 722, 723, 724, 725, 726, 727, 728, 729, 730, 731, 732, 733, 734, 735, 736, 737, 738, 739, 740, 741, 742, 743, 744, 745, 746, 747, 748, 749, 750, 751, 752, 753, 754, 755, 756, 757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768, 769, 770, 771, 772, 773, 774, 775, 776, 777, 778, 779, 780, 781, 782, 783, 784, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 812, 813, 814, 815, 816, 817, 818, 819, 820, 821, 822, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 833, 834, 835, 836, 837, 838, 839, 840, 841, 842, 843, 844, 845, 846, 847, 848, 849, 850, 851, 852, 853, 854, 855, 856, 857, 858, 859, 860, 861, 862, 863, 864, 865, 866, 867, 868, 869, 870, 871, 872, 873, 874, 875, 876, 877, 878, 879, 880, 881, 882, 883, 884, 885, 886, 887, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 899, 900, 901, 902, 903, 904, 905, 906, 907, 908, 909, 910, 911, 912, 913, 914, 915, 916, 917, 918, 919, 920, 921, 922, 923, 924, 925, 926, 927, 928, 929, 930, 931, 932, 933, 934, 935, 936, 937, 938, 939, 940, 941, 942, 943, 944, 945, 946, 947, 948, 949, 950, 951, 952, 953, 954, 955, 956, 957, 958, 959, 960, 961, 962, 963, 964, 965, 966, 967, 968, 969, 970, 971, 972, 973, 974, 975, 976, 977, 978, 979, 980, 981, 982, 983, 984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 996, 997, 998, 999, 1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020, 1021, 1022, 1023, 1024, 1025, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035, 1036, 1037, 1038, 1039, 1040, 1041, 1042, 1043, 1044, 1045, 1046, 1047, 1048, 1049, 1050, 1051, 1052, 1053, 1054, 1055, 1056, 1057, 1058, 1059, 1060, 1061, 1062, 1063, 1064, 1065, 1066, 1067, 1068, 1069, 1070, 1071, 1072, 1073, 1074, 1075, 1076, 1077, 1078, 1079, 1080, 1081, 1082, 1083, 1084, 1085, 1086, 1087, 1088, 1089, 1090, 1091, 1092, 1093, 1094, 1095, 1096, 1097, 1098, 1099, 1100, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108, 1109, 1110, 1111, 1112, 1113, 1114, 1115, 1116, 1117, 1118, 1119, 1120, 1121, 1122, 1123, 1124, 1125, 1126, 1127, 1128, 1129, 1130, 1131, 1132, 1133, 1134, 1135, 1136, 1137, 1138, 1139, 1140, 1141, 1142, 1143, 1144, 1145, 1146, 1147, 1148, 1149, 1150, 1151, 1152, 1153, 1154, 1155, 1156, 1157, 1158, 1159, 1160, 1161, 1162, 1163, 1164, 1165, 1166, 1167, 1168, 1169, 1170, 1171, 1172, 1173, 1174, 1175, 1176, 1177, 1178, 1179, 1180, 1181, 1182, 1183, 1184, 1185, 1186, 1187, 1188, 1189, 1190, 1191, 1192, 1193, 1194, 1195, 1196, 1197, 1198, 1199, 1200, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208, 1209, 1210, 1211, 1212, 1213, 1214, 1215, 1216, 1217, 1218, 1219, 1220, 1221, 1222, 1223, 1224, 1225, 1226, 1227, 1228, 1229, 1230, 1231, 1232, 1233, 1234, 1235, 1236, 1237, 1238, 1239, 1240, 1241, 1242, 1243, 1244, 1245, 1246, 1247, 1248, 1249, 1250, 1251, 1252, 1253, 1254, 1255, 1256, 1257, 1258, 1259, 1260, 1261, 1262, 1263, 1264, 1265, 1266, 1267, 1268, 1269, 1270, 1271, 1272, 1273, 1274, 1275, 1276, 1277, 1278, 1279, 1280, 1281, 1282, 1283, 1284, 1285, 1286, 1287, 1288, 1289, 1290, 1291, 1292, 1293, 1294, 1295, 1296, 1297, 1298, 1299, 1300, 1301, 1302, 1303, 1304, 1305, 1306, 1307, 1308, 1309, 1310, 1311, 1312, 1313, 1314, 1315, 1316, 1317, 1318, 1319, 1320, 1321, 1322, 1323, 1324, 1325, 1326, 1327, 1328, 1329, 1330, 1331, 1332, 1333, 1334, 1335, 1336, 1337, 1338, 1339, 1340, 1341, 1342, 1343, 1344, 1345, 1346, 1347, 1348, 1349, 1350, 1351, 1352, 1353, 1354, 1355, 1356, 1357, 1358, 1359, 1360, 1361, 1362, 1363, 1364, 1365, 1366, 1367, 1368, 1369, 1370, 1371, 1372, 1373, 1374, 1375, 1376, 1377, 1378, 1379, 1380, 1381, 1382, 1383, 1384, 1385, 1386, 1387, 1388, 1389, 1390, 1391, 1392, 1393, 1394, 1395, 1396, 1397, 1398, 1399, 1400, 1401, 1402, 1403, 1404, 1405, 1406, 1407, 1408, 1409, 1410, 1411, 1412, 1413, 1414, 1415, 1416, 1417, 1418, 1419, 1420, 1421, 1422, 1423, 1424, 1425, 1426, 1427, 1428, 1429, 1430, 1431, 1432, 1433, 1434, 1435, 1436, 1437, 1438, 1439, 1440, 1441, 1442, 1443, 1444, 1445, 1446, 1447, 1448, 1449, 1450, 1451, 1452, 1453, 1454, 1455, 1456, 1457, 1458, 1459, 1460, 1461, 1462, 1463, 1464, 1465, 1466, 1467, 1468, 1469, 1470, 1471, 1472, 1473, 1474, 1475, 1476, 1477, 1478, 1479, 1480, 1481, 1482, 1483, 1484, 1485, 1486, 1487, 1488, 1489, 1490, 1491, 1492, 1493, 1494, 1495, 1496, 1497, 1498, 1499, 1500, 1501, 1502, 1503, 1504, 1505, 1506, 1507, 1508, 1509, 1510, 1511, 1512, 1513, 1514, 1515, 1516, 1517, 1518, 1519, 1520, 1521, 1522, 1523, 1524, 1525, 1526, 1527, 1528, 1529, 1530, 1531, 1532, 1533, 1534, 1535, 1536, 1537, 1538, 1539, 1540, 1541, 1542, 1543, 1544, 1545, 1546, 1547, 1548, 1549, 1550, 1551, 1552, 1553, 1554, 1555, 1556, 1557, 1558, 1559, 1560, 1561, 1562, 1563, 1564, 1565, 1566, 1567, 1568, 1569, 1570, 1571, 1572, 1573, 1574, 1575, 1576, 1577, 1578, 1579, 1580, 1581, 1582, 1583, 1584, 1585, 1586, 1587, 1588, 1589, 1590, 1591, 1592, 1593, 1594, 1595, 1596, 1597, 1598, 1599, 1600, 1601, 1602, 1603, 1604, 1605, 1606, 1607, 1608, 1609, 1610, 1611, 1612, 1613, 1614, 1615, 1616, 1617, 1618, 1619, 1620, 1621, 1622, 1623, 1624, 1625, 1626, 1627, 1628, 1629, 1630, 1631, 1632, 1633, 1634, 1635, 1636, 1637, 1638, 1639, 1640, 1641, 1642, 1643, 1644, 1645, 1646, 1647, 1648, 1649, 1650, 1651, 1652, 1653, 1654, 1655, 1656, 1657, 1658, 1659, 1660, 1661, 1662, 1663, 1664, 1665, 1666, 1667, 1668, 1669, 1670, 1671, 1672, 1673, 1674, 1675, 1676, 1677, 1678, 1679, 1680, 1681, 1682, 1683, 1684, 1685, 1686, 1687, 1688, 1689, 1690, 1691, 1692, 1693, 1694, 1695, 1696, 1697, 1698, 1699, 1700, 1701, 1702, 1703, 1704, 1705, 1706, 1707, 1708, 1709, 1710, 1711, 1712, 1713, 1714, 1715, 1716, 1717, 1718, 1719, 1720, 1721, 1722, 1723, 1724, 1725, 1726, 1727, 1728, 1729, 1730, 1731, 1732, 1733, 1734, 1735, 1736, 1737, 1738, 1739, 1740, 1741, 1742, 1743, 1744, 1745, 1746, 1747, 1748, 1749, 1750, 1751, 1752, 1753, 1754, 1755, 1756, 1757, 1758, 1759, 1760, 1761, 1762, 1763, 1764, 1765, 1766, 1767, 1768, 1769, 1770, 1771, 1772, 1773, 1774, 1775, 1776, 1777, 1778, 1779, 1780, 1781, 1782, 1783, 1784, 1785, 1786, 1787, 1788, 1789, 1790, 1791, 1792, 1793, 1794, 1795, 1796, 1797, 1798, 1799, 1800, 1801, 1802, 1803, 1804, 1805, 1806, 1807, 1808, 1809, 1810, 1811, 1812, 1813, 1814, 1815, 1816, 1817, 1818, 1819, 1820, 1821, 1822, 1823, 1824, 1825, 1826, 1827, 1828, 1829, 1830, 1831, 1832, 1833, 1834, 1835, 1836, 1837, 1838, 1839, 1840, 1841, 1842, 1843, 1844, 1845, 1846, 1847, 1848, 1849, 1850, 1851, 1852, 1853, 1854, 1855, 1856, 1857, 1858, 1859, 1860, 1861, 1862, 1863, 1864, 1865, 1866, 1867, 1868, 1869, 1870, 1871, 1872, 1873, 1874, 1875, 1876, 1877, 1878, 1879, 1880, 1881, 1882, 1883, 1884, 1885, 1886, 1887, 1888, 1889, 1890, 1891, 1892, 1893, 1894, 1895, 1896, 1897, 1898, 1899, 1900, 1901, 1902, 1903, 1904, 1905, 1906, 1907, 1908, 1909, 1910, 1911, 1912, 1913, 1914, 1915, 1916, 1917, 1918, 1919, 1920, 1921, 1922, 1923, 1924, 1925, 1926, 1927, 1928, 1929, 1930, 1931, 1932, 1933, 1934, 1935, 1936, 1937, 1938, 1939, 1940, 1941, 1942, 1943, 1944, 1945, 1946, 1947, 1948, 1949, 1950, 1951, 1952, 1953, 1954, 1955, 1956, 1957, 1958, 1959, 1960, 1961, 1962, 1963, 1964, 1965, 1966, 1967, 1968, 1969, 1970, 1971, 1972, 1973, 1974, 1975, 1976, 1977, 1978, 1979, 1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040, 2041, 2042, 2043, 2044, 2045, 2046, 2047, 2048, 2049, 2050, 2051, 2052, 2053, 2054, 2055, 2056, 2057, 2058, 2059, 2060, 2061, 2062, 2063, 2064, 2065, 2066, 2067, 2068, 2069, 2070, 2071, 2072, 2073, 2074, 2075, 2076, 2077, 2078, 2079, 2080, 2081, 2082, 2083, 2084, 2085, 2086, 2087, 2088, 2089, 2090, 2091, 2092, 2093, 2094, 2095, 2096, 2097, 2098, 2099, 2100, 2101, 2102, 2103, 2104, 2105, 2106, 2107, 2108, 2109, 2110, 2111, 2112, 2113, 2114, 2115, 2116, 2117, 2118, 2119, 2120, 2121, 2122, 2123, 2124, 2125, 2126, 2127, 2128, 2129, 2130, 2131, 2132, 2133, 2134, 2135, 2136, 2137, 2138, 2139, 2140, 2141, 2142, 2143, 2144, 2145, 2146, 2147, 2148, 2149, 2150, 2151, 2152, 2153, 2154, 2155, 2156, 2157, 2158, 2159, 2160, 2161, 2162, 2163, 2164, 2165, 2166, 2167, 2168, 2169, 2170, 2171, 2172, 2173, 2174, 2175, 2176, 2177, 2178, 2179, 2180, 2181, 2182, 2183, 2184, 2185, 2186, 2187, 2188, 2189, 2190, 2191, 2192, 2193, 2194, 2195, 2196, 2197, 2198, 2199, 2200, 2201, 2202, 2203, 2204, 2205, 2206, 2207, 2208, 2209, 2210, 2211, 2212, 2213, 2214, 2215, 2216, 2217, 2218, 2219, 2220, 2221, 2222, 2223, 2224, 2225, 2226, 2227, 2228, 2229, 2230, 2231, 2232, 2233, 2234, 2235, 2236, 2237, 2238, 2239, 2240, 2241, 2242, 2243, 2244, 2245, 2246, 2247, 2248, 2249, 2250, 2251, 2252, 2253, 2254, 2255, 2256, 2257, 2258, 2259, 2260, 2261, 2262, 2263, 2264, 2265, 2266, 2267, 2268, 2269, 2270, 2271, 2272, 2273, 2274, 2275, 2276, 2277, 2278, 2279, 2280, 2281, 2282, 2283, 2284, 2285, 2286, 2287, 2288, 2289, 2290, 2291, 2292, 2293, 2294, 2295, 2296, 2297, 2298, 2299, 2300, 2301, 2302, 2303, 2304, 2305, 2306, 2307, 2308, 2309, 2310, 2311, 2312, 2313, 2314, 2315, 2316, 2317, 2318, 2319, 2320, 2321, 2322, 2323, 2324, 2325, 2326, 2327, 2328, 2329, 2330, 2331, 2332, 2333, 2334, 2335, 2336, 2337, 2338, 2339, 2340, 2341, 2342, 2343, 2344, 2345, 2346, 2347, 2348, 2349, 2350, 2351, 2352, 2353, 2354, 2355, 2356, 2357, 2358, 2359, 2360, 2361, 2362, 2363, 2364, 2365, 2366, 2367, 2368, 2369, 2370, 2371, 2372, 2373, 2374, 2375, 2376, 2377, 2378, 2379, 2380, 2381, 2382, 2383, 2384, 2385, 2386, 2387, 2388, 2389, 2390, 2391, 2392, 2393, 2394, 2395, 2396, 2397, 2398, 2399, 2400, 2401, 2402, 2403, 2404, 2405, 2406, 2407, 2408, 2409, 2410, 2411, 2412, 2413, 2414, 2415, 2416, 2417, 2418, 2419, 2420, 2421, 2422, 2423, 2424, 2425, 2426, 2427, 2428, 2429, 2430, 2431, 2432, 2433, 2434, 2435, 2436, 2437, 2438, 2439, 2440, 2441, 2442, 2443, 2444, 2445, 2446, 2447, 2448, 2449, 2450, 2451, 2452, 2453, 2454, 2455, 2456, 2457, 2458, 2459, 2460, 2461, 2462, 2463, 2464, 2465, 2466, 2467, 2468, 2469, 2470, 2471, 2472, 2473, 2474, 2475, 2476, 2477, 2478, 2479, 2480, 2481, 2482, 2483, 2484, 2485, 2486, 2487, 2488, 2489, 2490, 2491, 2492, 2493, 2494, 2495, 2496, 2497, 2498, 2499, 2500, 2501, 2502, 2503, 2504, 2505, 2506, 2507, 2508, 2509, 2510, 2511, 2512, 2513, 2514, 2515, 2516, 2517, 2518, 2519, 2520, 2521, 2522, 2523, 2524, 2525, 2526, 2527, 2528, 2529, 2530, 2531, 2532, 2533, 2534, 2535, 2536, 2537, 2538, 2539, 2540, 2541, 2542, 2543, 2544, 2545, 2546, 2547, 2548, 2549, 2550, 2551, 2552, 2553, 2554, 2555, 2556, 2557, 2558, 2559, 2560, 2561, 2562, 2563, 2564, 2565, 2566, 2567, 2568, 2569, 2570, 2571, 2572, 2573, 2574, 2575, 2576, 2577, 2578, 2579, 2580, 2581, 2582, 2583, 2584, 2585, 2586, 2587, 2588, 2589, 2590, 2591, 2592, 2593, 2594, 2595, 2596, 2597, 2598, 2599, 2600, 2601, 2602, 2603, 2604, 2605, 2606, 2607, 2608, 2609, 2610, 2611, 2612, 2613, 2614, 2615, 2616, 2617, 2618, 2619, 2620, 2621, 2622, 2623, 2624, 2625, 2626, 2627, 2628, 2629, 2630, 2631, 2632, 2633, 2634, 2635, 2636, 2637, 2638, 2639, 2640, 2641, 2642, 2643, 2644, 2645, 2646, 2647, 2648, 2649, 2650, 2651, 2652, 2653, 2654, 2655, 2656, 2657, 2658, 2659, 2660, 2661, 2662, 2663, 2664, 2665, 2666, 2667, 2668, 2669, 2670, 2671, 2672, 2673, 2674, 2675, 2676, 2677, 2678, 2679, 2680, 2681, 2682, 2683, 2684, 2685, 2686, 2687, 2688, 2689, 2690, 2691, 2692, 2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700, 2701, 2702, 2703, 2704, 2705, 2706, 2707, 2708, 2709, 2710, 2711, 2712, 2713, 2714, 2715, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2723, 2724, 2725, 2726, 2727, 2728, 2729, 2730, 2731, 2732, 2733, 2734, 2735, 2736, 2737, 2738, 2739, 2740, 2741, 2742, 2743, 2744, 2745, 2746, 2747, 2748, 2749, 2750, 2751, 2752, 2753, 2754, 2755, 2756, 2757, 2758, 2759, 2760, 2761, 2762, 2763, 2764, 2765, 2766, 2767, 2768, 2769, 2770, 2771, 2772, 2773, 2774, 2775, 2776, 2777, 2778, 2779, 2780, 2781, 2782, 2783, 2784, 2785, 2786, 2787, 2788, 2789, 2790, 2791, 2792, 2793, 2794, 2795, 2796, 2797, 2798, 2799, 2800, 2801, 2802, 2803, 2804, 2805, 2806, 2807, 2808, 2809, 2810, 2811, 2812, 2813, 2814, 2815, 2816, 2817, 2818, 2819, 2820, 2821, 2822, 2823, 2824, 2825, 2826, 2827, 2828, 2829, 2830, 2831, 2832, 2833, 2834, 2835, 2836, 2837, 2838, 2839, 2840, 2841, 2842, 2843, 2844, 2845, 2846, 2847, 2848, 2849, 2850, 2851, 2852, 2853, 2854, 2855, 2856, 2857, 2858, 2859, 2860, 2861, 2862, 2863, 2864, 2865, 2866, 2867, 2868, 2869, 2870, 2871, 2872, 2873, 2874, 2875, 2876, 2877, 2878, 2879, 2880, 2881, 2882, 2883, 2884, 2885, 2886, 2887, 2888, 2889, 2890, 2891, 2892, 2893, 2894, 2895, 2896, 2897, 2898, 2899, 2900, 2901, 2902, 2903, 2904, 2905, 2906, 2907, 2908, 2909, 2910, 2911, 2912, 2913, 2914, 2915, 2916, 2917, 2918, 2919, 2920, 2921, 2922, 2923, 2924, 2925, 2926, 2927, 2928, 2929, 2930, 2931, 2932, 2933, 2934, 2935, 2936, 2937, 2938, 2939, 2940, 2941, 2942, 2943, 2944, 2945, 2946, 2947, 2948, 2949, 2950, 2951, 2952, 2953, 2954, 2955, 2956, 2957, 2958, 2959, 2960, 2961, 2962, 2963, 2964, 2965, 2966, 2967, 2968, 2969, 2970, 2971, 2972, 2973, 2974, 2975, 2976, 2977, 2978, 2979, 2980, 2981, 2982, 2983, 2984, 2985, 2986, 2987, 2988, 2989, 2990, 2991, 2992, 2993, 2994, 2995, 2996, 2997, 2998, 2999, 3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011, 3012, 3013, 3014, 3015, 3016, 3017, 3018, 3019, 3020, 3021, 3022, 3023, 3024, 3025, 3026, 3027, 3028, 3029, 3030, 3031, 3032, 3033, 3034, 3035, 3036, 3037, 3038, 3039, 3040, 3041, 3042, 3043, 3044, 3045, 3046, 3047, 3048, 3049, 3050, 3051, 3052, 3053, 3054, 3055, 3056, 3057, 3058, 3059, 3060, 3061, 3062, 3063, 3064, 3065, 3066, 3067, 3068, 3069, 3070, 3071, 3072, 3073, 3074, 3075, 3076, 3077, 3078, 3079, 3080, 3081, 3082, 3083, 3084, 3085, 3086, 3087, 3088, 3089, 3090, 3091, 3092, 3093, 3094, 3095, 3096, 3097, 3098, 3099, 3100, 3101, 3102, 3103, 3104, 3105, 3106, 3107, 3108, 3109, 3110, 3111, 3112, 3113, 3114, 3115, 3116, 3117, 3118, 3119, 3120, 3121, 3122, 3123, 3124, 3125, 3126, 3127, 3128, 3129, 3130, 3131, 3132, 3133, 3134, 3135, 3136, 3137, 3138, 3139, 3140, 3141, 3142, 3143, 3144, 3145, 3146, 3147, 3148, 3149, 3150, 3151, 3152, 3153, 3154, 3155, 3156, 3157, 3158, 3159, 3160, 3161, 3162, 3163, 3164, 3165, 3166, 3167, 3168, 3169, 3170, 3171, 3172, 3173, 3174, 3175, 3176, 3177, 3178, 3179, 3180, 3181, 3182, 3183, 3184, 3185, 3186, 3187, 3188, 3189, 3190, 3191, 3192, 3193, 3194, 3195, 3196, 3197, 3198, 3199, 3200, 3201, 3202, 3203, 3204, 3205, 3206, 3207, 3208, 3209, 3210, 3211, 3212, 3213, 3214, 3215, 3216, 3217, 3218, 3219, 3220, 3221, 3222, 3223, 3224, 3225, 3226, 3227, 3228, 3229, 3230, 3231, 3232, 3233, 3234, 3235, 3236, 3237, 3238, 3239, 3240, 3241, 3242, 3243, 3244, 3245, 3246, 3247, 3248, 3249, 3250, 3251, 3252, 3253, 3254, 3255, 3256, 3257, 3258, 3259, 3260, 3261, 3262, 3263, 3264, 3265, 3266, 3267, 3268, 3269, 3270, 3271, 3272, 3273, 3274, 3275, 3276, 3277, 3278, 3279, 3280, 3281, 3282, 3283, 3284, 3285, 3286, 3287, 3288, 3289, 3290, 3291, 3292, 3293, 3294, 3295, 3296, 3297, 3298, 3299, 3300, 3301, 3302, 3303, 3304, 3305, 3306, 3307, 3308, 3309, 3310, 3311, 3312, 3313, 3314, 3315, 3316, 3317, 3318, 3319, 3320, 3321, 3322, 3323, 3324, 3325, 3326, 3327, 3328, 3329, 3330, 3331, 3332, 3333, 3334, 3335, 3336, 3337, 3338, 3339, 3340, 3341, 3342, 3343, 3344, 3345, 3346, 3347, 3348, 3349, 3350, 3351, 3352, 3353, 3354, 3355, 3356, 3357, 3358, 3359, 3360, 3361, 3362, 3363, 3364, 3365, 3366, 3367, 3368, 3369, 3370, 3371, 3372, 3373, 3374, 3375, 3376, 3377, 3378, 3379, 3380, 3381, 3382, 3383, 3384, 3385, 3386, 3387, 3388, 3389, 3390, 3391, 3392, 3393, 3394, 3395, 3396, 3397, 3398, 3399, 3400, 3401, 3402, 3403, 3404, 3405, 3406, 3407, 3408, 3409, 3410, 3411, 3412, 3413, 3414, 3415, 3416, 3417, 3418, 3419, 3420, 3421, 3422, 3423, 3424, 3425, 3426, 3427, 3428, 3429, 3430, 3431, 3432, 3433, 3434, 3435, 3436, 3437, 3438, 3439, 3440, 3441, 3442, 3443, 3444, 3445, 3446, 3447, 3448, 3449, 3450, 3451, 3452, 3453, 3454, 3455, 3456, 3457, 3458, 3459, 3460, 3461, 3462, 3463, 3464, 3465, 3466, 3467, 3468, 3469, 3470, 3471, 3472, 3473, 3474, 3475, 3476, 3477, 3478, 3479, 3480, 3481, 3482, 3483, 3484, 3485, 3486, 3487, 3488, 3489, 3490, 3491, 3492, 3493, 3494, 3495, 3496, 3497, 3498, 3499, 3500, 3501, 3502, 3503, 3504, 3505, 3506, 3507, 3508, 3509, 3510, 3511, 3512, 3513, 3514, 3515, 3516, 3517, 3518, 3519, 3520, 3521, 3522, 3523, 3524, 3525, 3526, 3527, 3528, 3529, 3530, 3531, 3532, 3533, 3534, 3535, 3536, 3537, 3538, 3539, 3540, 3541, 3542, 3543, 3544, 3545, 3546, 3547, 3548, 3549, 3550, 3551, 3552, 3553, 3554, 3555, 3556, 3557, 3558, 3559, 3560, 3561, 3562, 3563, 3564, 3565, 3566, 3567, 3568, 3569, 3570, 3571, 3572, 3573, 3574, 3575, 3576, 3577, 3578, 3579, 3580, 3581, 3582, 3583, 3584, 3585, 3586, 3587, 3588, 3589, 3590, 3591, 3592, 3593, 3594, 3595, 3596, 3597, 3598, 3599, 3600, 3601, 3602, 3603, 3604, 3605, 3606, 3607, 3608, 3609, 3610, 3611, 3612, 3613, 3614, 3615, 3616, 3617, 3618, 3619, 3620, 3621, 3622, 3623, 3624, 3625, 3626, 3627, 3628, 3629, 3630, 3631, 3632, 3633, 3634, 3635, 3636, 3637, 3638, 3639, 3640, 3641, 3642, 3643, 3644, 3645, 3646, 3647, 3648, 3649, 3650, 3651, 3652, 3653, 3654, 3655, 3656, 3657, 3658, 3659, 3660, 3661, 3662, 3663, 3664, 3665, 3666, 3667, 3668, 3669, 3670, 3671, 3672, 3673, 3674, 3675, 3676, 3677, 3678, 3679, 3680, 3681, 3682, 3683, 3684, 3685, 3686, 3687, 3688, 3689, 3690, 3691, 3692, 3693, 3694, 3695, 3696, 3697, 3698, 3699, 3700, 3701, 3702, 3703, 3704, 3705, 3706, 3707, 3708, 3709, 3710, 3711, 3712, 3713, 3714, 3715, 3716, 3717, 3718, 3719, 3720, 3721, 3722, 3723, 3724, 3725, 3726, 3727, 3728, 3729, 3730, 3731, 3732, 3733, 3734, 3735, 3736, 3737, 3738, 3739, 3740, 3741, 3742, 3743, 3744, 3745, 3746, 3747, 3748, 3749, 3750, 3751, 3752, 3753, 3754, 3755, 3756, 3757, 3758, 3759, 3760, 3761, 3762, 3763, 3764, 3765, 3766, 3767, 3768, 3769, 3770, 3771, 3772, 3773, 3774, 3775, 3776, 3777, 3778, 3779, 3780, 3781, 3782, 3783, 3784, 3785, 3786, 3787, 3788, 3789, 3790, 3791, 3792, 3793, 3794, 3795, 3796, 3797, 3798, 3799, 3800, 3801, 3802, 3803, 3804, 3805, 3806, 3807, 3808, 3809, 3810, 3811, 3812, 3813, 3814, 3815, 3816, 3817, 3818, 3819, 3820, 3821, 3822, 3823, 3824, 3825, 3826, 3827, 3828, 3829, 3830, 3831, 3832, 3833, 3834, 3835, 3836, 3837, 3838, 3839, 3840, 3841, 3842, 3843, 3844, 3845, 3846, 3847, 3848, 3849, 3850, 3851, 3852, 3853, 3854, 3855, 3856, 3857, 3858, 3859, 3860, 3861, 3862, 3863, 3864, 3865, 3866, 3867, 3868, 3869, 3870, 3871, 3872, 3873, 3874, 3875, 3876, 3877, 3878, 3879, 3880, 3881, 3882, 3883, 3884, 3885, 3886, 3887, 3888, 3889, 3890, 3891, 3892, 3893, 3894, 3895, 3896, 3897, 3898, 3899, 3900, 3901, 3902, 3903, 3904, 3905, 3906, 3907, 3908, 3909, 3910, 3911, 3912, 3913, 3914, 3915, 3916, 3917, 3918, 3919, 3920, 3921, 3922, 3923, 3924, 3925, 3926, 3927, 3928, 3929, 3930, 3931, 3932, 3933, 3934, 3935, 3936, 3937, 3938, 3939, 3940, 3941, 3942, 3943, 3944, 3945, 3946, 3947, 3948, 3949, 3950, 3951, 3952, 3953, 3954, 3955, 3956, 3957, 3958, 3959, 3960, 3961, 3962, 3963, 3964, 3965, 3966, 3967, 3968, 3969, 3970, 3971, 3972, 3973, 3974, 3975, 3976, 3977, 3978, 3979, 3980, 3981, 3982, 3983, 3984, 3985, 3986, 3987, 3988, 3989, 3990, 3991, 3992, 3993, 3994, 3995, 3996, 3997, 3998, 3999],
              16
            ],
            [250, 100, 249]
          ],
          [
            [
              [0],
              16
            ],
            [1, 6, 0]
          ],
          [
            [
              [],
              16
            ],
            [1, 0, 0]
          ],
          [
            [
              [85, 886, 718, 43, 535, 472, 97, 118, 691, 703, 706, 832, 391, 88, 49, 112, 658, 445, 520, 175, 259, 775, 454, 373, 685, 589, 55, 1, 205, 484, 286, 139, 664, 649, 277, 661, 16, 754, 637, 127, 529, 694, 667, 346, 349, 439, 73, 856, 130, 625, 607, 652, 385, 322, 670, 409, 37, 184, 733, 82, 793, 121, 25, 748, 289, 619, 109, 568, 58, 850, 178, 826, 769, 214, 40, 883, 796, 199, 151, 799, 235, 223, 91, 871, 814, 343, 499, 721, 772, 52, 553, 646, 583, 382, 331, 622, 94, 808, 574, 466, 28, 394, 790, 766, 169, 301, 475, 874, 745, 376, 616, 316, 514, 805, 250, 895, 730, 13, 241, 427, 421, 442, 406, 643, 841, 604, 538, 592, 124, 370, 457, 367, 676, 523, 448, 586, 412, 898, 496, 526, 502, 280, 724, 763, 715, 268, 229, 337, 103, 655, 877, 613, 76, 22, 31, 334, 220, 565, 196, 757, 7, 712, 64, 889, 433, 133, 358, 10, 778, 451, 838, 181, 541, 304, 784, 559, 742, 145, 709, 853, 352, 79, 142, 436, 211, 862, 415, 190, 817, 148, 34, 868, 556, 844, 595, 880, 202, 364, 700, 232, 865, 481, 256, 160, 253, 892, 136, 760, 631, 355, 562, 820, 634, 847, 19, 829, 418, 262, 571, 319, 682, 505, 283, 835, 580, 424, 688, 577, 238, 388, 781, 517, 379, 115, 70, 325, 532, 274, 544, 4, 508, 100, 598, 601, 469, 307, 310, 550, 166, 400, 697, 727, 46, 292, 187, 751, 487, 859, 547, 802, 157, 193, 244, 295, 628, 811, 490, 463, 271, 736, 163, 361, 265, 640, 340, 787, 511, 208, 226, 172, 673, 403, 478, 67, 397, 610, 247, 298, 313, 328, 154, 61, 493, 679, 217, 739, 460, 106, 823, 430],
              16
            ],
            [27, 69, 26]
          ],
          [
            [
              [4, 82, 109, 112, 7, 37, 79, 28, 76, 106, 58, 10, 97, 103, 1, 13, 19, 46, 25, 16, 22, 100, 34, 49, 91, 67, 52, 70, 85, 64, 55, 40, 61, 88, 115, 31, 118, 94, 73, 43],
              4
            ],
            [14, 71, 13]
          ],
          [
            [
              [385, 538, 97, 934, 292, 28, 1165, 1255, 1111, 1270, 46, 1396, 58, 1087, 718, 802, 622, 1012, 823, 667, 493, 214, 52, 151, 472, 1288, 1417, 487, 43, 1000, 181, 73, 562, 70, 1156, 862, 649, 889, 400, 814, 4, 751, 577, 817, 952, 82, 1462, 955, 40, 1456, 103, 856, 274, 967, 1330, 466, 550, 298, 34, 1291, 1315, 598, 1360, 1264, 913, 793, 1261, 508, 1102, 160, 1219, 1285, 1204, 871, 208, 463, 847, 187, 685, 1327, 175, 940, 1171, 1459, 61, 1387, 373, 652, 244, 853, 277, 1477, 703, 790, 364, 193, 424, 1393, 910, 526, 337, 601, 1033, 661, 541, 76, 1123, 391, 565, 781, 643, 529, 196, 1240, 436, 1243, 1060, 112, 931, 16, 1120, 547, 232, 757, 1222, 961, 271, 772, 1345, 1198, 1039, 25, 1489, 346, 1453, 1249, 874, 1207, 553, 970, 1213, 430, 415, 1159, 1234, 1267, 994, 1447, 283, 1009, 475, 610, 67, 1153, 184, 1300, 736, 1075, 1420, 64, 868, 1411, 124, 1090, 1384, 973, 148, 928, 127, 1135, 697, 937, 715, 589, 229, 1186, 250, 1378, 355, 949, 1363, 349, 13, 841, 559, 778, 1279, 520, 499, 976, 1129, 979, 367, 1309, 1057, 1429, 217, 1498, 1096, 820, 721, 811, 295, 109, 946, 964, 631, 145, 1369, 1216, 163, 478, 1114, 580, 1210, 1180, 1192, 418, 904, 352, 1, 700, 880, 664, 616, 19, 334, 454, 532, 673, 517, 1432, 1348, 205, 1321, 235, 1471, 754, 523, 1402, 211, 316, 1168, 1021, 787, 1399, 1414, 1177, 427, 304, 892, 1483, 121, 991, 22, 1006, 322, 1051, 775, 1048, 484, 1354, 397, 268, 925, 1144, 1231, 262, 640, 88, 1423, 1372, 1108, 637, 898, 133, 37, 106, 835, 514, 808, 988, 358, 376, 388, 340, 259, 1492, 1282, 688, 679, 1024, 85, 1468, 469, 1375, 1141, 655, 157, 1138, 7, 943, 1162, 409, 1303, 784, 280, 1252, 1189, 361, 55, 325, 1357, 379, 1147, 505, 739, 1066, 619, 1381, 1201, 691, 1042, 958, 607, 502, 511, 1003, 1126, 433, 331, 154, 625, 421, 916, 91, 919, 190, 694, 592, 1084, 178, 985, 247, 1132, 1366, 445, 1297, 1099, 838, 628, 169, 799, 166, 1336, 442, 94, 319, 1351, 313, 1438, 583, 439, 130, 613, 241, 490, 1078, 883, 115, 1081, 1228, 100, 448, 10, 586, 1246, 1027, 544, 1333, 1342, 1117, 709, 826, 1465, 406, 1339, 769, 1273, 301, 202, 604, 1441, 760, 382, 238, 568, 877, 118, 220, 1183, 886, 370, 1390, 706, 859, 658, 574, 997, 766, 496, 49, 1036, 922, 727, 1054, 1069, 745, 865, 982, 412, 1486, 1426, 670, 907, 829, 646, 79, 535, 223, 31, 289, 1150, 310, 805, 1474, 724, 457, 1495, 403, 844, 142, 1072, 1294, 1408, 1195, 451, 895, 571, 634, 1318, 1444, 1015, 682, 265, 832, 328, 460, 1435, 676, 307, 796, 136, 1450, 199, 481, 1093, 1225, 1312, 1405, 748, 1258, 712, 595, 1105, 394, 730, 139, 850, 1480, 1030, 556, 286, 1045, 763, 733, 1063, 1306, 253, 1324, 343, 1237, 226, 172, 1276, 742, 901, 1174, 1018, 256],
              8
            ],
            [90, 69, 89]
          ],
          [
            [
              [39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
              4
            ],
            [13, 77, 12]
          ],
          [
            [
              [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
              16
            ],
            [2, 53, 1]
          ],
          [
            [
              [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
              16
            ],
            [1, 100, 0]
          ],
          [
            [
              [3475, 1045, 3643, 991, 4396, 1387, 292, 4615, 4159, 2476, 3850, 3991, 5560, 4291, 3835, 5365, 5152, 3274, 994, 4597, 3181, 2809, 5089, 1255, 5641, 4177, 3070, 4702, 1396, 4732, 2158, 2236, 769, 4990, 5950, 4069, 3064, 1546, 5113, 751, 5503, 1285, 4693, 5275, 5947, 3493, 3688, 2488, 4282, 4963, 3184, 2137, 1105, 2416, 4201, 2431, 2167, 3085, 2848, 3433, 2323, 4312, 3562, 2485, 2161, 646, 5752, 3388, 2191, 4192, 2632, 1750, 2224, 880, 5557, 5599, 2341, 2752, 4756, 3784, 4246, 3334, 2980, 1153, 1276, 889, 5524, 1222, 3667, 2047, 5815, 2290, 895, 1900, 2992, 5239, 4666, 5719, 2779, 1147, 1921, 2080, 2113, 514, 784, 1165, 301, 4837, 3805, 1507, 2020, 1717, 4942, 2542, 829, 490, 1456, 205, 2128, 679, 2854, 4534, 4801, 619, 3058, 4297, 5218, 5860, 2845, 2941, 745, 2866, 1174, 3346, 5941, 55, 2758, 2716, 3472, 268, 376, 1759, 4366, 1723, 5680, 5890, 4639, 1693, 2401, 4399, 4135, 124, 5230, 4165, 337, 4954, 2008, 4789, 3082, 5830, 1348, 2701, 3553, 3790, 4936, 4903, 2041, 1381, 1297, 1510, 2650, 13, 211, 3469, 2656, 2071, 2344, 1471, 1726, 1912, 5119, 2068, 331, 4483, 2305, 3856, 2884, 2608, 1528, 2428, 3157, 5893, 2185, 1366, 4918, 1681, 34, 868, 5452, 637, 2110, 3202, 3997, 5272, 3847, 5581, 4465, 1855, 2947, 5338, 4456, 52, 5638, 1114, 1069, 5533, 4729, 1720, 1570, 2797, 1543, 2353, 823, 5965, 5161, 2269, 5743, 334, 4609, 469, 3832, 3910, 715, 3220, 2671, 5098, 3679, 2590, 5653, 2572, 4060, 5143, 1402, 2911, 403, 5149, 5914, 1555, 3934, 223, 2005, 5521, 190, 4528, 2938, 838, 520, 193, 3103, 1279, 853, 3610, 2560, 3499, 394, 1897, 5467, 1432, 4945, 1189, 3025, 1003, 3298, 2338, 1345, 4351, 3547, 1192, 3415, 4879, 5206, 3505, 4735, 2389, 2989, 2956, 1711, 5728, 2629, 61, 2764, 1096, 304, 1732, 3394, 2449, 3760, 3811, 4951, 3040, 4429, 5662, 478, 535, 3277, 4606, 5446, 4567, 700, 1498, 1891, 1648, 5908, 2146, 1753, 3454, 1774, 2413, 5725, 1291, 586, 5431, 1459, 4471, 5938, 3685, 5065, 2452, 3952, 154, 3706, 5734, 5062, 5200, 4453, 382, 787, 4861, 1195, 3724, 2932, 109, 5176, 2680, 2251, 1330, 1168, 5044, 5545, 2827, 352, 2242, 4273, 5293, 5800, 2206, 5401, 1093, 607, 4873, 454, 4405, 196, 3154, 1117, 1816, 1978, 2152, 4930, 5593, 3604, 319, 5128, 4249, 133, 175, 2539, 2710, 2593, 472, 5425, 1906, 3655, 136, 3148, 4558, 3979, 5644, 3880, 1603, 565, 3919, 3442, 5320, 3355, 5071, 5125, 2614, 4855, 3793, 2074, 3742, 1990, 1915, 3715, 2197, 2725, 3163, 4618, 1000, 1312, 943, 2230, 925, 3427, 5737, 2581, 5491, 4354, 10, 4477, 2092, 5806, 4834, 5317, 4888, 1, 1144, 5602, 5074, 4570, 1831, 1237, 4129, 2548, 4408, 4081, 2836, 2851, 4030, 601, 1993, 4714, 3478, 2821, 5383, 3757, 3739, 3130, 3106, 2806, 3379, 4222, 3217, 2860, 3127, 4423, 877, 3286, 4357, 3088, 1534, 3331, 2212, 5389, 2473, 2968, 1225, 1378, 277, 5566, 1018, 4183, 1414, 547, 1894, 1741, 2314, 4504, 703, 5488, 5917, 2170, 3166, 5170, 5203, 4213, 5332, 2785, 4684, 2263, 1600, 421, 808, 4342, 5011, 4897, 1792, 3895, 2320, 4846, 250, 3349, 709, 1606, 3043, 3301, 5398, 655, 1585, 685, 3124, 256, 2881, 3511, 2902, 3898, 2812, 4468, 1315, 31, 3310, 5416, 2293, 1576, 5008, 1072, 3136, 4063, 3517, 2044, 4348, 3955, 3544, 4339, 3985, 859, 484, 3598, 5761, 5887, 3529, 2830, 5224, 3397, 430, 3817, 307, 2530, 3649, 1588, 364, 2023, 3520, 1492, 4816, 2350, 673, 5710, 2731, 2056, 970, 4093, 1810, 2179, 5140, 22, 5536, 4432, 5284, 3196, 1567, 3250, 706, 1777, 4384, 721, 4960, 310, 2695, 3160, 2254, 2641, 2131, 4240, 5215, 1210, 2050, 1522, 667, 5476, 688, 4138, 5692, 2227, 5236, 3073, 2458, 3538, 4576, 595, 4264, 5482, 3676, 3328, 3976, 5329, 97, 1909, 919, 103, 3616, 3451, 3289, 3796, 3763, 1843, 5371, 5335, 3928, 5851, 796, 3208, 160, 5092, 2194, 5707, 58, 3775, 1486, 766, 2917, 1783, 4033, 553, 5470, 5935, 511, 1885, 2119, 1027, 4015, 4393, 5809, 1333, 1882, 3646, 4495, 5758, 1066, 589, 2296, 2563, 598, 64, 493, 283, 5422, 1633, 343, 1636, 985, 3031, 3874, 2929, 1171, 397, 5797, 3364, 934, 742, 1183, 4102, 1651, 5824, 892, 202, 5713, 4630, 2698, 3178, 2545, 3532, 5767, 3889, 3232, 3280, 3973, 5080, 5116, 3799, 2446, 5659, 4696, 139, 2791, 3046, 1180, 739, 2104, 2425, 2155, 5551, 4972, 4171, 1006, 3052, 4723, 4006, 3022, 1039, 1351, 4573, 1267, 4204, 5485, 2683, 1495, 2977, 3937, 4849, 5980, 3391, 1504, 5962, 3244, 4813, 2182, 4447, 4147, 3913, 2434, 3199, 3871, 3982, 1786, 4258, 3580, 5413, 4498, 433, 2443, 2662, 1474, 2017, 1579, 1483, 3826, 5839, 1453, 5902, 3577, 2245, 2215, 3406, 5920, 5827, 5263, 5584, 5587, 4462, 2674, 4144, 4906, 523, 5872, 106, 1408, 5068, 1834, 5353, 5848, 1849, 5248, 1294, 3268, 1201, 5542, 3094, 1591, 952, 2311, 748, 4156, 1420, 4987, 1675, 5428, 4825, 2599, 5026, 3079, 3859, 4807, 4276, 415, 5764, 3187, 5971, 4120, 4225, 3904, 1405, 3574, 4381, 4372, 4237, 2002, 5857, 3595, 1531, 3892, 3100, 274, 5473, 3841, 3235, 5686, 3862, 5254, 2521, 4678, 46, 3115, 151, 2578, 5035, 658, 4672, 2770, 4285, 4840, 4279, 1087, 1057, 1744, 3016, 5227, 5683, 4537, 4306, 3769, 1438, 1246, 4795, 5611, 757, 4600, 3970, 5506, 1618, 1690, 5233, 5698, 2257, 3631, 4717, 5977, 4198, 361, 4474, 4195, 556, 5674, 2467, 4345, 1918, 3319, 2422, 5512, 4999, 5266, 4636, 5794, 1321, 2638, 5032, 1426, 3730, 4231, 1975, 1624, 3634, 1780, 4858, 3403, 2218, 4762, 3751, 4564, 1501, 3316, 259, 286, 3376, 4051, 592, 1108, 3076, 3628, 1861, 3637, 37, 1336, 2818, 2506, 3439, 5146, 2491, 3400, 2272, 3013, 4162, 2512, 2887, 2503, 2011, 1051, 4111, 4210, 3925, 5632, 1846, 3337, 5788, 4243, 3820, 3283, 3370, 4663, 424, 4288, 4948, 3940, 1033, 622, 1825, 3304, 3049, 4516, 4660, 1558, 2260, 4075, 3457, 5635, 2188, 3211, 3487, 265, 115, 1219, 3670, 4852, 5308, 5077, 1204, 2233, 4513, 3496, 5590, 4402, 3625, 4333, 5704, 1789, 5614, 5926, 2983, 1207, 4309, 4048, 457, 235, 4426, 4924, 1477, 1747, 391, 5038, 5281, 5836, 4501, 2767, 814, 1141, 4009, 4090, 5479, 4027, 1099, 2920, 70, 2740, 436, 628, 4939, 4747, 5968, 4180, 4594, 1954, 3145, 1756, 1549, 1582, 973, 4753, 1657, 2926, 1939, 3853, 1054, 448, 409, 5404, 5296, 2617, 2722, 79, 445, 5959, 2281, 2062, 2329, 1465, 3778, 3463, 5833, 145, 5530, 4699, 3214, 3601, 3343, 1462, 2368, 841, 2776, 2536, 5107, 3931, 1645, 5992, 2308, 1288, 940, 526, 5572, 1306, 4546, 1249, 1804, 793, 370, 2668, 4375, 466, 4360, 5194, 1375, 4828, 25, 4540, 5956, 2554, 5002, 5656, 4435, 2569, 3367, 4066, 2014, 1870, 2317, 1363, 439, 1009, 463, 4981, 5041, 4321, 1444, 1186, 2122, 3256, 1984, 5134, 3700, 3721, 979, 1942, 844, 3067, 184, 2557, 2908, 1873, 1468, 2266, 1369, 1924, 2374, 4759, 5731, 1936, 178, 862, 4822, 3589, 460, 451, 1597, 604, 1264, 4369, 3652, 958, 580, 5242, 2035, 400, 3958, 3781, 5155, 886, 499, 616, 1594, 5617, 1771, 3526, 4096, 2749, 5086, 1684, 4843, 2692, 172, 4750, 2239, 4087, 4114, 4915, 1216, 1696, 988, 5878, 3121, 4057, 3055, 2896, 1138, 2533, 5953, 385, 2575, 4219, 3661, 4819, 4777, 3142, 3223, 1837, 2398, 1240, 4450, 5014, 1705, 4207, 4000, 5689, 1447, 1612, 4459, 19, 3001, 3571, 4018, 2164, 1213, 1159, 4804, 4252, 901, 5539, 3307, 5881, 5677, 2950, 2248, 253, 1729, 3865, 5620, 4420, 1126, 2653, 2287, 577, 2551, 4228, 4054, 856, 3565, 2038, 220, 4654, 2995, 1048, 5245, 1132, 217, 1678, 3922, 4336, 4591, 2059, 148, 4786, 1801, 2077, 1270, 3133, 4363, 2914, 571, 262, 2203, 2365, 3829, 1357, 316, 3583, 5191, 2773, 2026, 4294, 3727, 583, 2746, 2890, 4189, 3514, 1282, 4036, 4864, 5212, 4045, 4042, 199, 2935, 3322, 5302, 1867, 5884, 5356, 5740, 2761, 1231, 4585, 3247, 5518, 3664, 661, 2719, 2479, 4681, 1078, 4411, 3169, 1015, 2359, 5845, 4525, 529, 1654, 1963, 4927, 5029, 3949, 1537, 4186, 2143, 2497, 3385, 3226, 835, 2440, 1735, 1339, 2332, 4522, 5164, 3436, 3673, 559, 3946, 94, 4105, 2383, 1390, 4072, 2284, 1933, 4123, 5578, 781, 5776, 4957, 118, 5770, 2386, 3823, 5665, 3964, 5173, 3754, 5605, 3988, 3748, 1687, 2965, 2053, 5671, 2299, 4510, 694, 1672, 4108, 1261, 82, 1063, 100, 5995, 4933, 3010, 4993, 3190, 1642, 1765, 3814, 2623, 2644, 5929, 3421, 1303, 5386, 3382, 5515, 931, 2584, 40, 1411, 3295, 241, 328, 574, 2347, 1036, 1300, 4489, 3292, 1228, 883, 2713, 43, 5875, 1807, 4603, 3004, 2464, 73, 4780, 4705, 1129, 5722, 289, 3718, 3916, 325, 1480, 226, 4867, 3943, 4099, 2815, 2173, 568, 3109, 4900, 3490, 5569, 2083, 3868, 775, 4039, 5197, 4444, 3682, 130, 5803, 3523, 1573, 1615, 1738, 5461, 5494, 5986, 3556, 1957, 4024, 4303, 2221, 2326, 1441, 4975, 481, 3460, 5548, 406, 28, 3535, 4831, 5377, 865, 3622, 4675, 5500, 4378, 379, 5182, 5395, 2302, 4021, 904, 2869, 76, 5341, 3430, 2461, 169, 4885, 4582, 5497, 5458, 1879, 826, 2116, 4978, 2419, 1519, 4720, 5419, 5563, 2482, 4126, 3886, 1945, 538, 475, 4882, 649, 1666, 5188, 2380, 5158, 7, 5782, 3592, 4810, 1162, 5983, 349, 5311, 517, 532, 4627, 4387, 3259, 3787, 3502, 508, 3238, 4774, 3061, 676, 4519, 85, 2626, 4549, 3424, 16, 2140, 5017, 5110, 913, 3712, 5701, 1714, 1795, 181, 4588, 5866, 1342, 1354, 5434, 820, 1399, 3541, 1393, 5410, 4633, 562, 4327, 1060, 4621, 5911, 5185, 418, 1024, 1090, 3877, 355, 1981, 5299, 997, 4174, 5647, 1309, 4330, 2566, 5869, 652, 805, 4234, 4744, 1564, 718, 5083, 2362, 2377, 5344, 2878, 3313, 949, 1699, 5131, 2029, 778, 4084, 1423, 907, 874, 3559, 712, 670, 91, 238, 5899, 664, 3205, 3697, 5629, 67, 2515, 691, 5104, 733, 5392, 2437, 3901, 5305, 2833, 157, 4648, 976, 4267, 3961, 3691, 4651, 4876, 550, 442, 5509, 1864, 5863, 1372, 730, 4216, 5368, 3994, 2743, 5440, 850, 3907, 5323, 544, 1630, 496, 4690, 2728, 3967, 817, 2395, 4642, 5359, 2872, 1525, 3766, 5005, 3568, 3097, 1258, 5695, 724, 3358, 2857, 961, 2149, 5347, 4438, 3844, 502, 5755, 5407, 2509, 3412, 1273, 4486, 4984, 4300, 3619, 2734, 2524, 2404, 2842, 2998, 1996, 4894, 1450, 2125, 4687, 1021, 916, 367, 1663, 2803, 871, 5818, 2689, 1966, 88, 3550, 121, 5122, 2611, 4552, 2278, 727, 1417, 1840, 2923, 1702, 2824, 3034, 4708, 4741, 937, 4480, 280, 5221, 5374, 1075, 1888, 4645, 3802, 2407, 1435, 3613, 3262, 4441, 4726, 5821, 2659, 3037, 3508, 2959, 4414, 4078, 3658, 811, 2095, 1156, 2707, 4870, 4579, 1852, 2371, 2494, 2392, 187, 163, 5596, 3373, 5554, 3481, 1639, 5350, 3418, 1903, 2665, 3139, 2944, 5779, 2134, 5575, 3265, 4798, 3883, 4657, 49, 4624, 4711, 4507, 4909, 5326, 5791, 910, 1327, 3586, 1489, 142, 1552, 2605, 5527, 5260, 5746, 3325, 5257, 244, 4261, 2794, 5050, 2602, 1324, 3445, 4012, 634, 3361, 1360, 1762, 5854, 5095, 4324, 799, 1669, 1252, 3352, 2209, 3409, 3340, 1429, 412, 1819, 1930, 4765, 3772, 763, 5056, 2800, 5623, 2875, 2677, 4531, 247, 1999, 922, 4141, 4783, 1876, 4996, 3484, 625, 2065, 5287, 5944, 2986, 1516, 1012, 3007, 1969, 4768, 5137, 5716, 2410, 1081, 1960, 4417, 4003, 4270, 5668, 1030, 3709, 3241, 3466, 2032, 5437, 946, 4912, 5449, 2470, 3253, 5812, 5362, 2335, 3607, 2893, 1198, 4492, 1243, 5251, 4390, 5443, 4669, 5020, 295, 127, 3193, 487, 1513, 5278, 5896, 5974, 5455, 955, 2356, 3028, 5932, 2962, 5101, 1084, 2527, 4132, 2737, 3838, 4792, 112, 4318, 1102, 697, 2899, 3736, 5269, 1120, 358, 4168, 760, 5179, 3745, 2905, 3118, 2620, 610, 967, 2500, 5464, 4771, 322, 2101, 5785, 3808, 4, 1948, 3229, 541, 5842, 5053, 1828, 1318, 3151, 4738, 643, 5998, 736, 2086, 1708, 1384, 982, 847, 2704, 1042, 928, 5905, 2089, 5290, 2953, 1972, 631, 2686, 2107, 1234, 5209, 613, 313, 2788, 5773, 1177, 2455, 505, 1150, 1927, 3091, 214, 4969, 682, 2518, 5608, 2176, 4255, 4555, 229, 5314, 1987, 388, 1561, 2596, 772, 3172, 4612, 373, 3019, 3640, 1609, 3112, 4153, 5023, 1111, 2275, 1768, 2839, 208, 754, 832, 340, 2587, 2098, 1621, 898, 3448, 1660, 5749, 2974, 4921, 2782, 802, 271, 5047, 1951, 5059, 2647, 3703, 1627, 3271, 1858, 232, 2863, 5167, 2635, 166, 640, 4561, 5989, 790, 4966, 298, 4891, 2971, 427, 2755, 1135, 5380, 4117, 346, 2200, 4543, 5626, 5923, 3694, 4315, 1540, 4150, 1123, 1798, 3733, 5650, 964, 1813, 3175, 1822],
              256
            ],
            [11, 71, 10]
          ],
          [
            [
              { $range: [0, 100000] },
              256
            ],
            [391, 100, 390]
          ],
          [
            [
              { $range: [2000, 0, -1] },
              16
            ],
            [222, 56, 221]
          ]
        ] },
        solution: {
          approach: `<p>Simulate leaf pages directly (upper B-tree levels do not affect fill). The sequential-split heuristic is the reason auto-increment and UUIDv7 keys keep pages full, while random keys converge to ~69% average fill (the classic ln 2 result for random B-tree insertion).</p>`,
          code: { lang: 'python', run: true, code: `import bisect
import random

def simulate(keys, cap=16):
    leaves, firsts, splits = [[]], [], 0
    for k in keys:
        i = bisect.bisect_right(firsts, k)
        leaf = leaves[i]
        bisect.insort(leaf, k)
        if len(leaf) > cap:
            splits += 1
            if i == len(leaves) - 1 and leaf[-1] == k:
                new = [leaf.pop()]                      # sequential: keep old page full
            else:
                half = len(leaf) // 2
                new = leaf[half:]
                del leaf[half:]
            leaves.insert(i + 1, new)
            firsts.insert(i, new[0])
    rows = sum(map(len, leaves))
    return len(leaves), round(100 * rows / (len(leaves) * cap)), splits

random.seed(1)
N = 4000
print("auto-inc :", simulate(range(N)))
print("UUIDv4   :", simulate(random.sample(range(10**12), N)))
print("UUIDv7   :", simulate([(i << 20) | random.getrandbits(20) for i in range(N)]))` },
          complexity: `<p>O(N · (log P + C)) with bisect and list inserts (P = pages); fine for 10<sup>5</sup> keys. A real B+tree does the same per insert in O(log N) page visits.</p>`,
          followUps: ['How does fill change if you periodically rebuild (OPTIMIZE TABLE) the random-key table?', 'Why is the secondary-index cost of a 16-byte UUID PK worse than its clustered-index cost?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 7 — Column stores
     ===================================================================== */
  topics.push({
    title: 'Column Stores: Columnar Layout, Compression, Zone Maps & Vectorized Scans',
    analogy: `<p>A class register can be kept two ways. <b>Row style</b>: one card per student with name, age, marks and address — perfect when you need everything about <i>one</i> student. <b>Column style</b>: one long strip with only the marks of all students, another strip with only the ages, and so on. To compute "average mark of the class" you grab just the marks strip — no need to flip through every card. And a strip like "IN IN IN IN US US" can be written as "IN×4, US×2" — that is compression for free.</p>`,
    explain: `<p><b>🟢 Row store vs column store.</b> Everything so far stored a row's columns <b>together</b> inside a page (the "N-ary storage model"). That is ideal for OLTP: <code>SELECT * FROM orders WHERE id = 42</code> touches one page. Analytics is the opposite: <code>SELECT region, SUM(amount) FROM sales GROUP BY region</code> touches <b>2 columns</b> out of maybe 50, but <b>all</b> rows. A <b>column store</b> keeps each column in its own contiguous storage, so the query reads only the columns it needs.</p>
${H.table(['', 'row store (InnoDB, Postgres)', 'column store (ClickHouse, DuckDB, Snowflake, BigQuery, Redshift, Parquet files)'], [['layout', 'all columns of a row together', 'all values of one column together'], ['great at', 'point lookups, single-row insert/update', 'scans and aggregates over few columns'], ['compression', '2–3× typical', H.c('g', '5–20× typical (similar values sit together)')], ['single-row update', H.c('g', 'cheap'), H.c('r', 'expensive → batch inserts, delta stores, merges')]])}
<p><b>Why columns compress so well</b> — neighbours have the same type and often the same value:</p>
<ul>
<li><b>Dictionary encoding</b>: replace strings with small integer codes: {EU:0, IN:1, US:2}. 3 distinct values need only <b>2 bits</b> each.</li>
<li><b>Run-length encoding (RLE)</b>: "IN IN IN IN" → (IN, 4). Works best on <b>sorted</b> data, so tables are sorted by low-cardinality columns first.</li>
<li><b>Bit-packing / frame-of-reference</b>: store numbers as small offsets from a block minimum using just enough bits.</li>
<li><b>Delta / delta-of-delta</b>: timestamps 1000, 1010, 1020 → 1000, +10, +10 → tiny.</li>
<li>Then a general codec (LZ4, Zstd) on top.</li>
</ul>
<p><b>Skipping data: zone maps.</b> Each block (Parquet row group/page, ClickHouse granule of 8192 rows, Snowflake micro-partition) stores <b>min/max</b> per column. <code>WHERE day = '2026-10-03'</code> skips every block whose min/max range excludes that day — often 99% of the table — without any B-tree.</p>
<p><b>Vectorized execution.</b> Instead of pulling one row at a time through the operator tree (the classic "Volcano" iterator), the engine processes <b>vectors</b> of ~1,000–2,000 values per call with tight loops the CPU can SIMD-ize, and may operate <b>directly on compressed data</b> (sum an RLE run as value × count). <b>Late materialization</b>: filter on a few columns first, stitch full rows together only for survivors.</p>
<p><b>Writes</b> are handled LSM-style: new rows land in a row-oriented <b>delta store</b> or small "parts", which background merges convert into big compressed column segments (ClickHouse MergeTree, older Vertica's WOS→ROS (WOS was removed in 10.0), SQL Server columnstore delta rowgroups, C-Store's WS→RS).</p>`,
    clues: [
      '"Dashboards over billions of rows, few columns per query" → column store / OLAP engine',
      '"Why is Parquet smaller than CSV?" → columnar layout + dictionary/RLE/bit-packing + Zstd',
      '"SUM / AVG / GROUP BY over a huge fact table is slow on Postgres/MySQL" → move analytics to a columnar engine or replica',
      '"Skip files that cannot match" / "partition pruning" / "min-max index" → zone maps',
      '"Real-time analytics on fresh OLTP data" → HTAP: delta store + column replica (TiFlash, SingleStore, HeatWave, Oracle In-Memory)',
      '"Why is updating one row in ClickHouse/BigQuery so slow?" → immutable compressed column segments, mutations rewrite parts'
    ],
    code: [
      eng(`-- Run-length encoding of the region column with gaps-and-islands (table is sorted by region)
WITH marked AS (
  SELECT row_id, region,
         row_id - ROW_NUMBER() OVER (PARTITION BY region ORDER BY row_id) AS grp
  FROM sales
)
SELECT region AS value, COUNT(*) AS run_length, MIN(row_id) AS first_row
FROM marked GROUP BY region, grp ORDER BY first_row;

-- Dictionary encoding: each distinct value gets a small integer code
SELECT DISTINCT region, DENSE_RANK() OVER (ORDER BY region) - 1 AS code FROM sales ORDER BY code;`, 'RLE and dictionary encoding in SQL (▶ Run)'),
      eng(`-- Zone maps: min/max per block of 4 rows, then prune blocks for amount >= 290
WITH blocks AS (
  SELECT (row_id - 1) / 4 AS block, MIN(amount) AS min_amt, MAX(amount) AS max_amt, COUNT(*) AS n
  FROM sales GROUP BY (row_id - 1) / 4
)
SELECT block, min_amt, max_amt, n,
       CASE WHEN max_amt < 290 THEN 'SKIP (cannot contain amount >= 290)' ELSE 'scan' END AS decision
FROM blocks ORDER BY block;`, 'Zone-map pruning (▶ Run)'),
      py(`import math
from itertools import groupby

region = ["EU"] * 4 + ["IN"] * 5 + ["US"] * 3
amount = [120, 40, 95, 60, 300, 280, 75, 55, 310, 90, 150, 160]

# --- dictionary + bit-packing ---
dictionary = {v: i for i, v in enumerate(sorted(set(region)))}
codes = [dictionary[v] for v in region]
bits = max(1, math.ceil(math.log2(len(dictionary))))
raw_bytes = sum(len(v) for v in region)
packed_bytes = math.ceil(len(codes) * bits / 8) + sum(len(k) for k in dictionary)
print("dictionary:", dictionary, "| codes:", codes, "|", bits, "bits each")
print("raw %d bytes -> dict+bitpacked %d bytes" % (raw_bytes, packed_bytes))

# --- run-length encoding on the (sorted) column ---
runs = [(v, len(list(g))) for v, g in groupby(region)]
print("RLE runs:", runs)

# --- frame-of-reference for a numeric column: store value - min with fewer bits ---
lo = min(amount)
offsets = [a - lo for a in amount]
for_bits = max(offsets).bit_length()
print("amount: min=%d, offsets need %d bits instead of 32" % (lo, for_bits))

# --- vectorized-style aggregate directly on encoded data ---
target = dictionary["IN"]
total = sum(a for c, a in zip(codes, amount) if c == target)   # compare small ints, not strings
print("SUM(amount) WHERE region='IN' =", total)

# --- bytes read: row store vs column store for that query ---
n_rows, n_cols, bytes_per_col = 1_000_000_000, 50, 8
row_store = n_rows * n_cols * bytes_per_col
col_store = n_rows * (bits / 8 + 4)            # 2-bit region codes + ~4 B compressed amount
print("1B rows x 50 cols: row store reads %.0f GB, column store reads ~%.1f GB" % (row_store / 1e9, col_store / 1e9))`, 'Encodings and bytes-read arithmetic (▶ Run)')
    ],
    codeTitle: ['RLE and dictionary in SQL', 'Zone maps', 'Encodings in Python'],
    viz: {
      title: 'Column encoding: dictionary → bit-packing → RLE → zone-map pruning',
      input: 'IN IN IN US US IN UK UK UK UK EU EU | find UK',
      inputLabel: 'Column values (space separated) | find VALUE',
      gen: function (input) {
        var parts = String(input || '').split('|');
        var vals = parts[0].trim().split(/[\s,]+/).filter(Boolean);
        var fm = /find\s+(\S+)/i.exec(parts.slice(1).join(' ')), find = fm ? fm[1] : null;
        if (vals.length < 4) throw new Error('Enter at least 4 values');
        if (vals.length > 20) throw new Error('Use at most 20 values');
        vals.forEach(function (v) { if (v.length > 6) throw new Error('Keep values short (≤ 6 chars)'); });
        if (!find) find = vals[vals.length - 1];
        var amounts = vals.map(function (_, i) { return 10 + (i * 37) % 90; });
        var frames = [];
        var rowGrid = vals.map(function (v, i) { return [i, v, amounts[i], 'p' + (i % 3)]; }).slice(0, 6);
        frames.push({ narr: 'A tiny table (row_id, region, amount, product). A <b>row store</b> packs each row\'s fields together in a page — reading only <i>region</i> still drags amount and product along.', parts: [
          { type: 'grid', label: 'Row store page (first 6 rows): one record per line', rows: rowGrid, rowHead: rowGrid.map(function (r) { return 'row ' + r[0]; }), colHead: ['row_id', 'region', 'amount', 'product'], hl: { '0,1': 'cur', '1,1': 'cur', '2,1': 'cur' } },
          { type: 'array', label: 'Column store: the region column alone, contiguous', values: vals.slice(), hl: {} }
        ] });
        var dict = {}, keys = [], codes = [];
        vals.forEach(function (v, i) {
          var isNew = !(v in dict);
          if (isNew) { dict[v] = keys.length; keys.push(v); }
          codes.push(dict[v]);
          var hl = {}; hl[i] = 'cur'; var ch = {}; ch[i] = isNew ? 'ok' : 'cur'; var mh = {}; mh[v] = isNew ? 'ok' : 'cur';
          frames.push({ narr: '<b>Dictionary encoding</b>, value ' + (i + 1) + ': "' + v + '" ' + (isNew ? 'is new → gets code <b>' + dict[v] + '</b>.' : 'already has code ' + dict[v] + ' — reuse it.') + ' Comparisons and GROUP BY can now work on small integers.', parts: [
            { type: 'array', label: 'region (raw strings)', values: vals.slice(), hl: hl },
            { type: 'map', label: 'Dictionary', entries: keys.map(function (k) { return [k, dict[k]]; }), hl: mh },
            { type: 'array', label: 'Encoded codes', values: codes.slice(), hl: ch }
          ] });
        });
        var bits = Math.max(1, Math.ceil(Math.log(keys.length) / Math.log(2)));
        var raw = 0; vals.forEach(function (v) { raw += v.length; });
        var dictBytes = 0; keys.forEach(function (k) { dictBytes += k.length; });
        var packed = Math.ceil(vals.length * bits / 8);
        frames.push({ narr: '<b>Bit-packing</b>: ' + keys.length + ' distinct values need only <b>' + bits + ' bit(s)</b> per code (⌈log₂ ' + keys.length + '⌉). The code ' + codes[0] + ' of the first row is shown in binary. ' + vals.length + ' codes fit in ' + packed + ' byte(s) plus a ' + dictBytes + '-byte dictionary, versus ' + raw + ' bytes of raw text.', parts: [
          { type: 'bits', label: 'first code in ' + bits + ' bit(s)', value: codes[0], width: bits, showDec: true },
          { type: 'array', label: 'Encoded codes', values: codes.slice(), hl: {} },
          { type: 'vars', label: 'Bytes', vals: { raw_text_bytes: raw, dictionary_bytes: dictBytes, packed_code_bytes: packed, total_encoded: dictBytes + packed }, hl: { total_encoded: 'ok' } }
        ] });
        function rle(arr) { var out = []; arr.forEach(function (v) { if (out.length && out[out.length - 1][0] === v) out[out.length - 1][1]++; else out.push([v, 1]); }); return out; }
        var runs = rle(vals), built = [], pos = 0;
        runs.forEach(function (r) {
          built.push(r[0] + '×' + r[1]);
          var hl = {}; for (var k = pos; k < pos + r[1]; k++) hl[k] = 'win';
          frames.push({ narr: '<b>Run-length encoding</b>: values ' + pos + '..' + (pos + r[1] - 1) + ' are all "' + r[0] + '" → one run <b>' + r[0] + '×' + r[1] + '</b>. A SUM over a run is just value × count.', parts: [
            { type: 'array', label: 'region column', values: vals.slice(), hl: hl },
            { type: 'array', label: 'RLE runs so far', values: built.slice(), hl: (function () { var h = {}; h[built.length - 1] = 'ok'; return h; })() }
          ] });
          pos += r[1];
        });
        var sorted = vals.slice().sort(), sruns = rle(sorted);
        frames.push({ narr: '<b>Sorting helps</b>: unsorted, the column needs <b>' + runs.length + '</b> runs; sorted by region it needs only <b>' + sruns.length + '</b> (one per distinct value). That is why column stores pick a sort key (ClickHouse ORDER BY, Redshift sort keys) starting with low-cardinality columns.', parts: [
          { type: 'array', label: 'unsorted runs (' + runs.length + ')', values: runs.map(function (r) { return r[0] + '×' + r[1]; }), hl: {} },
          { type: 'array', label: 'sorted runs (' + sruns.length + ')', values: sruns.map(function (r) { return r[0] + '×' + r[1]; }), hl: (function () { var h = {}; sruns.forEach(function (_, i) { h[i] = 'ok'; }); return h; })() }
        ] });
        var B = 4, blocks = [];
        for (var b = 0; b * B < sorted.length; b++) { var sl = sorted.slice(b * B, b * B + B); blocks.push([b, sl[0], sl[sl.length - 1], sl.length]); }
        var keep = 0, bhl = {};
        blocks.forEach(function (bl, i) { var hit = find >= bl[1] && find <= bl[2]; if (hit) keep++; bhl[i] = hit ? 'ok' : 'done'; });
        frames.push({ narr: '<b>Zone maps</b> on the sorted column: blocks of ' + B + ' values store their <b>min</b> and <b>max</b>. A query <code>WHERE region = \'' + H.esc(find) + '\'</code> scans only blocks whose [min, max] range can contain it: <b>' + keep + ' of ' + blocks.length + '</b> blocks. The rest are skipped without reading them.', parts: [
          { type: 'table', label: 'Zone map (block, min, max, rows)', columns: ['block', 'min', 'max', 'rows'], rows: blocks, hl: bhl },
          { type: 'array', label: 'sorted column', values: sorted, hl: (function () { var h = {}; sorted.forEach(function (v, i) { if (v === find) h[i] = 'sel'; }); return h; })() }
        ] });
        var sum = 0; vals.forEach(function (v, i) { if (v === find) sum += amounts[i]; });
        frames.push({ narr: '<b>Vectorized, late-materialized query</b>: compare the code column with code(' + H.esc(find) + ') = ' + (find in dict ? dict[find] : 'none') + ' in one tight loop → a selection vector of matching positions → only then read the <i>amount</i> column at those positions. SUM(amount) = <b>' + sum + '</b>. Other columns were never touched.', parts: [
          { type: 'array', label: 'codes', values: codes.slice(), hl: (function () { var h = {}; codes.forEach(function (c, i) { if (vals[i] === find) h[i] = 'sel'; }); return h; })() },
          { type: 'array', label: 'amount column (read only at selected positions)', values: amounts, hl: (function () { var h = {}; vals.forEach(function (v, i) { h[i] = v === find ? 'ok' : 'done'; }); return h; })() },
          { type: 'vars', label: 'Result', vals: { find: find, matches: vals.filter(function (v) { return v === find; }).length, sum_amount: sum } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Bytes read for one dashboard query',
        html: `<p><code>SELECT region, SUM(amount) FROM sales GROUP BY region</code> on 1 billion rows with 50 columns of ~8 bytes:</p>
${H.table(['engine', 'what is read', 'bytes'], [['row store', 'every page, all 50 columns', H.c('r', '≈ 400 GB')], ['column store, raw', '2 columns × 8 B', '≈ 16 GB'], ['column store, encoded', '2-bit region codes + ~4 B compressed amounts', H.c('g', '≈ 4.3 GB')], ['+ zone maps on a 1-month filter of 3 years', '~1/36 of blocks', H.c('g', '≈ 0.12 GB')]])}
<p>That is a ~3000× difference before any CPU tricks — the whole reason data warehouses are columnar.</p>`
      },
      {
        title: 'Delta encoding timestamps',
        html: `<p>Sensor timestamps every 10 s: 1760000000, 1760000010, 1760000020, … Raw: 8 bytes each. Delta: first value + deltas of 10 → fits in 1 byte each. Delta-of-delta (Gorilla, used by Prometheus-style TSDBs): the deltas are all 10, so delta-of-delta is 0 → about <b>1 bit</b> per timestamp. Regular data compresses to almost nothing.</p>
${H.arr([1760000000, 1760000010, 1760000020, 1760000030], { label: 'raw' })}${H.arr([1760000000, 10, 10, 10], { label: 'delta', hl: { 1: 'g', 2: 'g', 3: 'g' } })}${H.arr([1760000000, 10, 0, 0], { label: 'delta-of-delta', hl: { 2: 'g', 3: 'g' } })}`
      },
      {
        title: 'Parquet file anatomy',
        html: `<p>A Parquet file = <b>row groups</b> (e.g. 128 MB of rows) → inside each, one <b>column chunk</b> per column → split into <b>pages</b> (~1 MB) with dictionary/RLE/bit-packed encodings plus Snappy/Zstd. The <b>footer</b> holds the schema and min/max/null-count statistics per row group and column — a zone map. Query engines (DuckDB, Spark, Trino) read the footer first, skip row groups, and fetch only needed column chunks via ranged reads from object storage. Table formats like <b>Apache Iceberg</b> and <b>Delta Lake</b> add a metadata layer that tracks which Parquet files belong to each table snapshot.</p>`,
        code: eng(`-- Per-"row group" statistics like a Parquet footer (row groups of 6 rows here)
SELECT (row_id - 1) / 6 AS row_group,
       MIN(region) AS region_min, MAX(region) AS region_max,
       MIN(day) AS day_min, MAX(day) AS day_max,
       SUM(amount) AS sum_amount, COUNT(*) AS rows_in_group
FROM sales GROUP BY (row_id - 1) / 6;`)
      },
      {
        title: 'HTAP: one database, two layouts',
        html: `<p>TiDB writes rows to TiKV (row-oriented, RocksDB-based) and asynchronously replicates them via Raft learners to <b>TiFlash</b> (columnar). The optimizer sends <code>WHERE id = ?</code> to TiKV and <code>GROUP BY</code> scans to TiFlash. SingleStore keeps a rowstore buffer in front of a columnstore; Oracle Database In-Memory keeps a columnar copy in RAM next to the row-format buffer cache; MySQL HeatWave offloads scans to an in-memory columnar cluster. Same idea every time: <b>rows for writes and point reads, columns for scans</b>.</p>`
      }
    ],
    deepDive: `<p><b>🟣 C-Store to today.</b> The 2005 C-Store paper (Stonebraker et al.) became Vertica; MonetDB/X100 (Boncz) introduced vectorized execution and became VectorWise. Modern engines — DuckDB (embedded, in-process OLAP), ClickHouse, Snowflake, BigQuery (Capacitor format), Redshift, Velox (Meta's execution library), DataFusion (Arrow) — combine columnar storage, vectorized or JIT-compiled execution, and aggressive pruning.</p>
<p><b>ClickHouse MergeTree is an LSM in disguise.</b> Each INSERT creates an immutable <b>part</b> (sorted by the table's ORDER BY, columns in separate files, a sparse primary index with one entry per 8192-row granule). Background merges combine parts — the same write-amplification trade-off as LSM compaction. Inserting one row at a time creates thousands of tiny parts ("Too many parts" error); batch inserts or async inserts fix it. Updates/deletes are <b>mutations</b> that rewrite parts, or lightweight deletes that mark rows in a mask.</p>
<p><b>PAX and hybrid layouts.</b> PAX stores each page's rows column-by-column inside the page — row-store locality with column-store cache efficiency. Parquet's row groups are PAX at file scale.</p>
<p><b>Arrow</b> is the in-memory columnar standard (validity bitmap + values buffer + offsets for strings), enabling zero-copy hand-off between engines (DuckDB ↔ Pandas/Polars ↔ Spark). <b>Execution on compressed data</b>: predicate evaluation on dictionary codes, SUM on RLE runs, SIMD bit-unpacking — CPU stays busy on useful work instead of decompressing.</p>
<p><b>Costs.</b> Wide single-row reads reconstruct a tuple from many column files (one seek per column); small transactions and updates are expensive; high-cardinality unsorted columns compress poorly; join-heavy normalized schemas often get denormalized into wide fact tables.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI workloads are columnar to the core. Training data pipelines read Parquet/Arrow; feature stores and evaluation logs live in lakehouses (Iceberg/Delta); embeddings are stored in columnar formats like <b>Lance</b> designed for fast random access plus vector search. LLM-driven "chat with your data" tools generate SQL against DuckDB, Snowflake or BigQuery — and their cost is mostly bytes scanned.</p>
<p><b>Use AI as a partner:</b> ask it to propose a sort key, partitioning and codec per column given sample data and query patterns, and to estimate bytes scanned per query; then verify with <code>EXPLAIN</code>, query profiles and the warehouse's "bytes scanned" metric.</p>
<p><b>Where AI goes wrong:</b> generated queries with <code>SELECT *</code> on a columnar warehouse (scanning every column, sometimes costing real money), filters on non-sort-key columns that defeat pruning, or advice to "add an index" in engines where zone maps and sort keys are the indexing mechanism.</p>
<p><b>What you must still own:</b> knowing why columnar wins for scans and loses for point updates, how encodings and zone maps cut bytes read, and when an HTAP or replica design beats running analytics on the OLTP primary.</p>`,
    problems: [
      {
        title: 'Run-Length Encode a Sorted Column in SQL',
        level: 'Medium', tags: ['column store', 'RLE', 'gaps and islands'], companies: ['Snowflake', 'Databricks', 'ClickHouse', 'Google'],
        statement: `<p>Table <code>sales(row_id, region, …)</code> is stored in <code>row_id</code> order. Produce the <b>run-length encoding</b> of the <code>region</code> column: one row per maximal run of equal consecutive values with <code>value</code>, <code>run_length</code>, <code>start_row</code>, ordered by position. Also report the compression ratio (rows ÷ runs).</p>`,
        constraints: `row_id values are consecutive integers starting at 1. Runs must be maximal (two runs of the same value separated by another value stay separate).`,
        example: `<p>EU EU EU EU IN IN IN IN IN US US US → ${H.c('g', '(EU,4,1) (IN,5,5) (US,3,10)')}; 12 rows / 3 runs = ${H.c('b', '4×')}.</p>`,
        brute: {
          why: `<p>Pulling every row into the application and looping works, but moves the whole column over the network. A correlated subquery per row ("find where this run ends") is O(N²). Gaps-and-islands does it in one pass with window functions.</p>`,
          code: eng(`-- O(N^2): for each run start, find the next row with a different value
SELECT s.region AS value,
       COALESCE((SELECT MIN(row_id) FROM sales x WHERE x.row_id > s.row_id AND x.region <> s.region),
                (SELECT MAX(row_id) + 1 FROM sales)) - s.row_id AS run_length,
       s.row_id AS start_row
FROM sales s
WHERE s.row_id = 1 OR s.region <> (SELECT region FROM sales p WHERE p.row_id = s.row_id - 1)
ORDER BY s.row_id;`)
        },
        mcq: { q: 'In the gaps-and-islands trick, what stays constant inside one run?', options: ['row_id − ROW_NUMBER() OVER (PARTITION BY value ORDER BY row_id)', 'ROW_NUMBER() OVER (ORDER BY row_id)', 'COUNT(*) OVER ()', 'row_id itself'], answer: 0, explain: 'Inside a run both row_id and the per-value row number increase by 1 each step, so their difference is constant; a new run of the same value has a larger difference.' },
        hints: [
          `<p>Hint 1: number rows within each value: <code>ROW_NUMBER() OVER (PARTITION BY region ORDER BY row_id)</code>.</p>`,
          `<p>Hint 2: <code>row_id − that number</code> is the same for all rows of one run and different between separate runs of the same value.</p>`,
          `<p>Hint 3: GROUP BY (region, grp), take COUNT(*) and MIN(row_id); order by MIN(row_id). Ratio = total rows ÷ number of runs.</p>`
        ],
        tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
          { rows: [
              ['EU', 4, 1, 4],
              ['IN', 5, 5, 4],
              ['US', 3, 10, 4]
            ] },
          { setup: 'UPDATE sales SET region = \'EU\' WHERE row_id IN (5, 6)', rows: [
              ['EU', 6, 1, 4],
              ['IN', 3, 7, 4],
              ['US', 3, 10, 4]
            ] },
          { setup: 'UPDATE sales SET region = \'IN\' WHERE row_id IN (3, 4)', rows: [
              ['EU', 2, 1, 4],
              ['IN', 7, 3, 4],
              ['US', 3, 10, 4]
            ] },
          { setup: 'UPDATE sales SET region = CASE row_id % 2 WHEN 0 THEN \'A\' ELSE \'B\' END', rows: [
              ['B', 1, 1, 1],
              ['A', 1, 2, 1],
              ['B', 1, 3, 1],
              ['A', 1, 4, 1],
              ['B', 1, 5, 1],
              ['A', 1, 6, 1],
              ['B', 1, 7, 1],
              ['A', 1, 8, 1],
              ['B', 1, 9, 1],
              ['A', 1, 10, 1],
              ['B', 1, 11, 1],
              ['A', 1, 12, 1]
            ] },
          { setup: 'UPDATE sales SET region = \'ZZ\'', rows: [
              ['ZZ', 12, 1, 12]
            ] },
          { setup: 'DELETE FROM sales WHERE row_id > 1', rows: [
              ['EU', 1, 1, 1]
            ] },
          { setup: 'UPDATE sales SET region = \'EU\' WHERE row_id IN (5, 6, 7, 8, 9, 10, 11, 12)', rows: [
              ['EU', 12, 1, 12]
            ] },
          { setup: 'UPDATE sales SET region = \'IN\' WHERE row_id = 12', rows: [
              ['EU', 4, 1, 3],
              ['IN', 5, 5, 3],
              ['US', 2, 10, 3],
              ['IN', 1, 12, 3]
            ] },
          { setup: 'UPDATE sales SET region = \'EU\' WHERE row_id IN (1, 12)', rows: [
              ['EU', 4, 1, 3],
              ['IN', 5, 5, 3],
              ['US', 2, 10, 3],
              ['EU', 1, 12, 3]
            ] },
          { setup: 'DELETE FROM sales WHERE row_id > 7', rows: [
              ['EU', 4, 1, 3.5],
              ['IN', 3, 5, 3.5]
            ] },
          { setup: 'DELETE FROM sales', rows: [] }
        ] },
        solution: {
          approach: `<p>Classic gaps-and-islands: the difference between a global position and a per-value counter identifies each island. One window pass plus a group-by: O(N log N) with sorting, O(N) if already ordered.</p>`,
          code: eng(`WITH marked AS (
  SELECT row_id, region,
         row_id - ROW_NUMBER() OVER (PARTITION BY region ORDER BY row_id) AS grp
  FROM sales
), runs AS (
  SELECT region AS value, COUNT(*) AS run_length, MIN(row_id) AS start_row
  FROM marked GROUP BY region, grp
)
SELECT value, run_length, start_row,
       ROUND((SELECT COUNT(*) FROM sales) * 1.0 / (SELECT COUNT(*) FROM runs), 2) AS compression_ratio
FROM runs ORDER BY start_row;`),
          dry: { head: ['row_id', 'region', 'rn in region', 'grp'], rows: [['1', 'EU', '1', '0'], ['4', 'EU', '4', '0'], ['5', 'IN', '1', '4'], ['9', 'IN', '5', '4'], ['10', 'US', '1', '9'], ['12', 'US', '3', '9']] },
          complexity: `<p>O(N log N) for the window sort (O(N) when the engine knows the order). Output size = number of runs.</p>`,
          followUps: ['RLE the <code>day</code> column inside each region (two-level runs).', 'Decode: expand (value, run_length) back to rows with a recursive CTE.']
        }
      }
    ]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Buffer Pool Hit Ratio Report',
    level: 'Easy', tags: ['buffer pool', 'conditional aggregation'], companies: ['Amazon', 'Percona', 'Shopify'],
    statement: `<p>The table <code>engine_stats(metric, value)</code> holds InnoDB-style counters. Write one query returning <b>hit ratio %</b> (1 − disk reads ÷ read requests), <b>dirty page %</b> and <b>free page %</b>, each rounded to 2 decimals.</p>`,
    constraints: `One row of output. Avoid integer division (multiply by 1.0).`,
    example: `<p>read requests 1,250,000, disk reads 9,800 → hit ratio ${H.c('g', '99.22%')}; dirty 7,200 / 65,536 → ${H.c('y', '10.99%')}; free 310 / 65,536 → ${H.c('b', '0.47%')}.</p>`,
    brute: {
      why: `<p>One scalar subquery per metric works but repeats the table scan for every number and gets messy fast. Pivoting with conditional aggregation reads the table once.</p>`,
      code: eng(`SELECT ROUND(100.0 * (1 - (SELECT value FROM engine_stats WHERE metric = 'buffer_pool_reads') * 1.0
                       / (SELECT value FROM engine_stats WHERE metric = 'buffer_pool_read_requests')), 2) AS hit_ratio_pct;`)
    },
    mcq: { q: 'Hit ratio is 99.2% but p99 latency is bad. What should you look at next?', options: ['Absolute misses per second and which queries cause them', 'Nothing — 99% is always fine', 'Increase the page size', 'Turn off the WAL'], answer: 0, explain: 'A high percentage can still mean thousands of disk reads per second; latency depends on the absolute number of misses and where they happen.' },
    hints: [
      `<p>Hint 1: each metric is a row; you want them as columns — a pivot.</p>`,
      `<p>Hint 2: <code>MAX(CASE WHEN metric = 'x' THEN value END)</code> extracts one metric per column in a single scan.</p>`,
      `<p>Hint 3: wrap the pivot in a CTE, then compute the ratios with <code>* 1.0</code> and <code>ROUND(…, 2)</code>.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [99.22, 10.99, 0.47]
        ] },
      { setup: 'UPDATE engine_stats SET value = 0 WHERE metric = \'buffer_pool_reads\'', rows: [
          [100, 10.99, 0.47]
        ] },
      { setup: 'UPDATE engine_stats SET value = 1250000 WHERE metric = \'buffer_pool_reads\'', rows: [
          [0, 10.99, 0.47]
        ] },
      { setup: 'UPDATE engine_stats SET value = 0 WHERE metric = \'buffer_pool_pages_dirty\'', rows: [
          [99.22, 0, 0.47]
        ] },
      { setup: 'UPDATE engine_stats SET value = 65536 WHERE metric = \'buffer_pool_pages_free\'', rows: [
          [99.22, 10.99, 100]
        ] },
      { setup: 'UPDATE engine_stats SET value = 3 WHERE metric = \'buffer_pool_read_requests\'; UPDATE engine_stats SET value = 1 WHERE metric = \'buffer_pool_reads\'; UPDATE engine_stats SET value = 3 WHERE metric = \'buffer_pool_pages_total\'; UPDATE engine_stats SET value = 1 WHERE metric = \'buffer_pool_pages_dirty\'; UPDATE engine_stats SET value = 1 WHERE metric = \'buffer_pool_pages_free\'', rows: [
          [66.67, 33.33, 33.33]
        ] },
      { setup: 'UPDATE engine_stats SET value = 1000 WHERE metric = \'buffer_pool_read_requests\'; UPDATE engine_stats SET value = 7 WHERE metric = \'buffer_pool_reads\'; UPDATE engine_stats SET value = 1024 WHERE metric = \'buffer_pool_pages_total\'; UPDATE engine_stats SET value = 333 WHERE metric = \'buffer_pool_pages_dirty\'; UPDATE engine_stats SET value = 17 WHERE metric = \'buffer_pool_pages_free\'', rows: [
          [99.3, 32.52, 1.66]
        ] },
      { setup: 'DELETE FROM engine_stats WHERE metric = \'buffer_pool_pages_dirty\'', rows: [
          [99.22, null, 0.47]
        ] }
    ] },
    solution: {
      approach: `<p>Pivot the counters with conditional aggregation in a CTE, then compute three ratios. This is exactly how monitoring dashboards turn <code>SHOW GLOBAL STATUS</code> into health metrics.</p>`,
      code: eng(`WITH s AS (
  SELECT MAX(CASE WHEN metric = 'buffer_pool_read_requests' THEN value END) AS req,
         MAX(CASE WHEN metric = 'buffer_pool_reads'         THEN value END) AS miss,
         MAX(CASE WHEN metric = 'buffer_pool_pages_total'   THEN value END) AS total,
         MAX(CASE WHEN metric = 'buffer_pool_pages_dirty'   THEN value END) AS dirty,
         MAX(CASE WHEN metric = 'buffer_pool_pages_free'    THEN value END) AS free
  FROM engine_stats
)
SELECT ROUND(100.0 * (1 - miss * 1.0 / req), 2) AS hit_ratio_pct,
       ROUND(100.0 * dirty / total, 2)          AS dirty_pct,
       ROUND(100.0 * free / total, 2)           AS free_pct
FROM s;`),
      complexity: `<p>One scan of a tiny table: O(M) for M metrics.</p>`,
      followUps: ['Store snapshots every minute and compute misses per second with LAG().', 'What does a free_pct near 0 together with a high dirty_pct suggest?']
    }
  });

  practice.push({
    title: 'Compute Record IDs (page, slot) for a Heap File',
    level: 'Easy', tags: ['pages', 'RID', 'arithmetic'], companies: ['Microsoft', 'Oracle'],
    statement: `<p>Rows are appended to a heap file in insertion order, and exactly <b>3 rows fit per page</b>. For row numbers 1..10, output each row's <b>RID = (page, slot)</b> with pages and slots numbered from 0 — the same shape as a Postgres <code>ctid</code>.</p>`,
    constraints: `Generate the rows with a recursive CTE. No deletes, no free-space reuse.`,
    example: `<p>Row 1 → ${H.c('g', '(0,0)')}, row 3 → ${H.c('g', '(0,2)')}, row 4 → ${H.c('b', '(1,0)')}, row 10 → ${H.c('b', '(3,0)')}.</p>`,
    brute: {
      why: `<p>Simulating the page fill with a loop works but hides the simple formula: with a fixed rows-per-page R, page = ⌊(n − 1) / R⌋ and slot = (n − 1) mod R.</p>`,
      code: { lang: 'python', run: true, code: `page, slot, R = 0, 0, 3
for n in range(1, 11):
    print(n, "->", (page, slot))
    slot += 1
    if slot == R:              # page full: move to a new page
        page, slot = page + 1, 0` }
    },
    mcq: { q: 'Why do indexes store (page, slot) instead of (page, byte offset)?', options: ['So records can move inside the page during compaction without updating indexes', 'Slots are smaller than offsets', 'Offsets are not allowed in SQL', 'To support compression'], answer: 0, explain: 'The slot array is an indirection: compaction changes the offset in the slot, while the slot number in every index entry stays valid.' },
    hints: [
      `<p>Hint 1: switch to 0-based numbering first: k = n − 1.</p>`,
      `<p>Hint 2: integer division by 3 gives the page, the remainder gives the slot.</p>`,
      `<p>Hint 3: format with <code>'(' || page || ',' || slot || ')'</code> to mimic a ctid.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [1, 0, 0, '(0,0)'],
          [2, 0, 1, '(0,1)'],
          [3, 0, 2, '(0,2)'],
          [4, 1, 0, '(1,0)'],
          [5, 1, 1, '(1,1)'],
          [6, 1, 2, '(1,2)'],
          [7, 2, 0, '(2,0)'],
          [8, 2, 1, '(2,1)'],
          [9, 2, 2, '(2,2)'],
          [10, 3, 0, '(3,0)']
        ] },
      { after: 'UPDATE params SET n_rows = 1, rows_per_page = 3; SELECT * FROM rids', rows: [
          [1, 0, 0, '(0,0)']
        ] },
      { after: 'UPDATE params SET n_rows = 3, rows_per_page = 3; SELECT * FROM rids', rows: [
          [1, 0, 0, '(0,0)'],
          [2, 0, 1, '(0,1)'],
          [3, 0, 2, '(0,2)']
        ] },
      { after: 'UPDATE params SET n_rows = 4, rows_per_page = 3; SELECT * FROM rids', rows: [
          [1, 0, 0, '(0,0)'],
          [2, 0, 1, '(0,1)'],
          [3, 0, 2, '(0,2)'],
          [4, 1, 0, '(1,0)']
        ] },
      { after: 'UPDATE params SET n_rows = 5, rows_per_page = 1; SELECT * FROM rids', rows: [
          [1, 0, 0, '(0,0)'],
          [2, 1, 0, '(1,0)'],
          [3, 2, 0, '(2,0)'],
          [4, 3, 0, '(3,0)'],
          [5, 4, 0, '(4,0)']
        ] },
      { after: 'UPDATE params SET n_rows = 7, rows_per_page = 7; SELECT * FROM rids', rows: [
          [1, 0, 0, '(0,0)'],
          [2, 0, 1, '(0,1)'],
          [3, 0, 2, '(0,2)'],
          [4, 0, 3, '(0,3)'],
          [5, 0, 4, '(0,4)'],
          [6, 0, 5, '(0,5)'],
          [7, 0, 6, '(0,6)']
        ] },
      { after: 'UPDATE params SET n_rows = 30, rows_per_page = 8; SELECT * FROM rids', rows: [
          [1, 0, 0, '(0,0)'],
          [2, 0, 1, '(0,1)'],
          [3, 0, 2, '(0,2)'],
          [4, 0, 3, '(0,3)'],
          [5, 0, 4, '(0,4)'],
          [6, 0, 5, '(0,5)'],
          [7, 0, 6, '(0,6)'],
          [8, 0, 7, '(0,7)'],
          [9, 1, 0, '(1,0)'],
          [10, 1, 1, '(1,1)'],
          [11, 1, 2, '(1,2)'],
          [12, 1, 3, '(1,3)'],
          [13, 1, 4, '(1,4)'],
          [14, 1, 5, '(1,5)'],
          [15, 1, 6, '(1,6)'],
          [16, 1, 7, '(1,7)'],
          [17, 2, 0, '(2,0)'],
          [18, 2, 1, '(2,1)'],
          [19, 2, 2, '(2,2)'],
          [20, 2, 3, '(2,3)'],
          [21, 2, 4, '(2,4)'],
          [22, 2, 5, '(2,5)'],
          [23, 2, 6, '(2,6)'],
          [24, 2, 7, '(2,7)'],
          [25, 3, 0, '(3,0)'],
          [26, 3, 1, '(3,1)'],
          [27, 3, 2, '(3,2)'],
          [28, 3, 3, '(3,3)'],
          [29, 3, 4, '(3,4)'],
          [30, 3, 5, '(3,5)']
        ] },
      { after: 'UPDATE params SET n_rows = 100, rows_per_page = 64; SELECT * FROM rids', rows: [
          [1, 0, 0, '(0,0)'],
          [2, 0, 1, '(0,1)'],
          [3, 0, 2, '(0,2)'],
          [4, 0, 3, '(0,3)'],
          [5, 0, 4, '(0,4)'],
          [6, 0, 5, '(0,5)'],
          [7, 0, 6, '(0,6)'],
          [8, 0, 7, '(0,7)'],
          [9, 0, 8, '(0,8)'],
          [10, 0, 9, '(0,9)'],
          [11, 0, 10, '(0,10)'],
          [12, 0, 11, '(0,11)'],
          [13, 0, 12, '(0,12)'],
          [14, 0, 13, '(0,13)'],
          [15, 0, 14, '(0,14)'],
          [16, 0, 15, '(0,15)'],
          [17, 0, 16, '(0,16)'],
          [18, 0, 17, '(0,17)'],
          [19, 0, 18, '(0,18)'],
          [20, 0, 19, '(0,19)'],
          [21, 0, 20, '(0,20)'],
          [22, 0, 21, '(0,21)'],
          [23, 0, 22, '(0,22)'],
          [24, 0, 23, '(0,23)'],
          [25, 0, 24, '(0,24)'],
          [26, 0, 25, '(0,25)'],
          [27, 0, 26, '(0,26)'],
          [28, 0, 27, '(0,27)'],
          [29, 0, 28, '(0,28)'],
          [30, 0, 29, '(0,29)'],
          [31, 0, 30, '(0,30)'],
          [32, 0, 31, '(0,31)'],
          [33, 0, 32, '(0,32)'],
          [34, 0, 33, '(0,33)'],
          [35, 0, 34, '(0,34)'],
          [36, 0, 35, '(0,35)'],
          [37, 0, 36, '(0,36)'],
          [38, 0, 37, '(0,37)'],
          [39, 0, 38, '(0,38)'],
          [40, 0, 39, '(0,39)'],
          [41, 0, 40, '(0,40)'],
          [42, 0, 41, '(0,41)'],
          [43, 0, 42, '(0,42)'],
          [44, 0, 43, '(0,43)'],
          [45, 0, 44, '(0,44)'],
          [46, 0, 45, '(0,45)'],
          [47, 0, 46, '(0,46)'],
          [48, 0, 47, '(0,47)'],
          [49, 0, 48, '(0,48)'],
          [50, 0, 49, '(0,49)'],
          [51, 0, 50, '(0,50)'],
          [52, 0, 51, '(0,51)'],
          [53, 0, 52, '(0,52)'],
          [54, 0, 53, '(0,53)'],
          [55, 0, 54, '(0,54)'],
          [56, 0, 55, '(0,55)'],
          [57, 0, 56, '(0,56)'],
          [58, 0, 57, '(0,57)'],
          [59, 0, 58, '(0,58)'],
          [60, 0, 59, '(0,59)'],
          [61, 0, 60, '(0,60)'],
          [62, 0, 61, '(0,61)'],
          [63, 0, 62, '(0,62)'],
          [64, 0, 63, '(0,63)'],
          [65, 1, 0, '(1,0)'],
          [66, 1, 1, '(1,1)'],
          [67, 1, 2, '(1,2)'],
          [68, 1, 3, '(1,3)'],
          [69, 1, 4, '(1,4)'],
          [70, 1, 5, '(1,5)'],
          [71, 1, 6, '(1,6)'],
          [72, 1, 7, '(1,7)'],
          [73, 1, 8, '(1,8)'],
          [74, 1, 9, '(1,9)'],
          [75, 1, 10, '(1,10)'],
          [76, 1, 11, '(1,11)'],
          [77, 1, 12, '(1,12)'],
          [78, 1, 13, '(1,13)'],
          [79, 1, 14, '(1,14)'],
          [80, 1, 15, '(1,15)'],
          [81, 1, 16, '(1,16)'],
          [82, 1, 17, '(1,17)'],
          [83, 1, 18, '(1,18)'],
          [84, 1, 19, '(1,19)'],
          [85, 1, 20, '(1,20)'],
          [86, 1, 21, '(1,21)'],
          [87, 1, 22, '(1,22)'],
          [88, 1, 23, '(1,23)'],
          [89, 1, 24, '(1,24)'],
          [90, 1, 25, '(1,25)'],
          [91, 1, 26, '(1,26)'],
          [92, 1, 27, '(1,27)'],
          [93, 1, 28, '(1,28)'],
          [94, 1, 29, '(1,29)'],
          [95, 1, 30, '(1,30)'],
          [96, 1, 31, '(1,31)'],
          [97, 1, 32, '(1,32)'],
          [98, 1, 33, '(1,33)'],
          [99, 1, 34, '(1,34)'],
          [100, 1, 35, '(1,35)']
        ] }
    ] },
    solution: {
      approach: `<p>Generate 1..10, then compute page and slot with integer division and modulo. In real engines rows-per-page varies with row size, which is why the RID is <i>stored</i> rather than computed.</p>`,
      code: lab(`CREATE TEMP TABLE params AS SELECT 10 AS n_rows, 3 AS rows_per_page;

CREATE TEMP VIEW rids AS
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < (SELECT n_rows FROM params))
SELECT i AS row_number,
       (i - 1) / rows_per_page AS page,
       (i - 1) % rows_per_page AS slot,
       '(' || ((i - 1) / rows_per_page) || ',' || ((i - 1) % rows_per_page) || ')' AS ctid_style_rid
FROM n, params
ORDER BY i;

SELECT * FROM rids;`),
      complexity: `<p>O(N) rows, O(1) each.</p>`,
      followUps: ['After deleting row 2 and vacuuming, where could a new row go?', 'How does an UPDATE change a row\'s ctid in Postgres (and when does HOT keep it on the same page)?']
    }
  });

  practice.push({
    title: 'Bits Needed per Column for Dictionary Encoding',
    level: 'Easy', tags: ['column store', 'dictionary encoding', 'recursive CTE'], companies: ['Snowflake', 'ClickHouse', 'Databricks'],
    statement: `<p>For each column of <code>sales</code> (<code>region</code>, <code>day</code>, <code>product</code>, <code>amount</code>), compute the number of distinct values <b>d</b> and the bits per value after dictionary encoding: the smallest b ≥ 1 with 2<sup>b</sup> ≥ d.</p>`,
    constraints: `Do not rely on LOG2 (not always compiled into SQLite). Use a small recursive CTE of powers of two.`,
    example: `<p>region has 3 distinct values → ${H.c('g', '2 bits')}; amount has 12 → ${H.c('y', '4 bits')} instead of a 32-bit integer.</p>`,
    brute: {
      why: `<p>Counting distinct values one column at a time and doing the log in your head is fine for 4 columns, error-prone for 400. A query that does all columns and the bit math at once is reusable on any table.</p>`,
      code: eng(`SELECT COUNT(DISTINCT region) AS region_d, COUNT(DISTINCT day) AS day_d,
       COUNT(DISTINCT product) AS product_d, COUNT(DISTINCT amount) AS amount_d
FROM sales;`)
    },
    mcq: { q: 'A column has exactly 256 distinct values. Bits per code?', options: ['8', '9', '7', '256'], answer: 0, explain: '2<sup>8</sup> = 256 ≥ 256, so 8 bits suffice (codes 0..255).' },
    hints: [
      `<p>Hint 1: build one row per column with UNION ALL: (column_name, COUNT(DISTINCT col)).</p>`,
      `<p>Hint 2: a recursive CTE <code>pow(b, v)</code> producing (1,2), (2,4), (3,8)… up to b = 32.</p>`,
      `<p>Hint 3: for each column take <code>MIN(b) WHERE v ≥ d</code>.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['day', 3, 2, 24],
          ['product', 3, 2, 24],
          ['region', 3, 2, 24],
          ['amount', 12, 4, 48]
        ] },
      { setup: 'UPDATE sales SET region = \'EU\', day = \'d\', product = \'p\', amount = 1', rows: [
          ['amount', 1, 1, 12],
          ['day', 1, 1, 12],
          ['product', 1, 1, 12],
          ['region', 1, 1, 12]
        ] },
      { setup: 'UPDATE sales SET region = \'R\' || row_id', rows: [
          ['day', 3, 2, 24],
          ['product', 3, 2, 24],
          ['amount', 12, 4, 48],
          ['region', 12, 4, 48]
        ] },
      { setup: 'UPDATE sales SET region = \'R\' || ((row_id - 1) % 8)', rows: [
          ['day', 3, 2, 24],
          ['product', 3, 2, 24],
          ['region', 8, 3, 36],
          ['amount', 12, 4, 48]
        ] },
      { setup: 'UPDATE sales SET region = \'R\' || ((row_id - 1) % 9)', rows: [
          ['day', 3, 2, 24],
          ['product', 3, 2, 24],
          ['amount', 12, 4, 48],
          ['region', 9, 4, 48]
        ] },
      { setup: 'UPDATE sales SET amount = row_id % 2', rows: [
          ['amount', 2, 1, 12],
          ['day', 3, 2, 24],
          ['product', 3, 2, 24],
          ['region', 3, 2, 24]
        ] },
      { setup: 'UPDATE sales SET amount = row_id % 5', rows: [
          ['day', 3, 2, 24],
          ['product', 3, 2, 24],
          ['region', 3, 2, 24],
          ['amount', 5, 3, 36]
        ] },
      { setup: 'DELETE FROM sales WHERE row_id > 6', rows: [
          ['day', 2, 1, 6],
          ['region', 2, 1, 6],
          ['product', 3, 2, 12],
          ['amount', 6, 3, 18]
        ] },
      { setup: 'DELETE FROM sales', rows: [
          ['amount', 0, 1, 0],
          ['day', 0, 1, 0],
          ['product', 0, 1, 0],
          ['region', 0, 1, 0]
        ] },
      { setup: 'UPDATE sales SET product = \'P\' || (row_id % 4)', rows: [
          ['day', 3, 2, 24],
          ['product', 4, 2, 24],
          ['region', 3, 2, 24],
          ['amount', 12, 4, 48]
        ] }
    ] },
    solution: {
      approach: `<p>Unpivot distinct counts with UNION ALL, generate powers of two, and pick the smallest sufficient bit width per column. Real encoders also compare against RLE and plain encoding and choose the smallest.</p>`,
      code: eng(`WITH RECURSIVE pow(b, v) AS (SELECT 1, 2 UNION ALL SELECT b + 1, v * 2 FROM pow WHERE b < 32),
d AS (
  SELECT 'region' AS col, COUNT(DISTINCT region) AS distinct_vals FROM sales
  UNION ALL SELECT 'day', COUNT(DISTINCT day) FROM sales
  UNION ALL SELECT 'product', COUNT(DISTINCT product) FROM sales
  UNION ALL SELECT 'amount', COUNT(DISTINCT amount) FROM sales
)
SELECT d.col, d.distinct_vals,
       (SELECT MIN(b) FROM pow WHERE v >= d.distinct_vals) AS bits_per_value,
       (SELECT COUNT(*) FROM sales) * (SELECT MIN(b) FROM pow WHERE v >= d.distinct_vals) AS total_bits
FROM d ORDER BY bits_per_value, col;`),
      complexity: `<p>One distinct-count per column (a sort or hash each) plus a 32-row helper table.</p>`,
      followUps: ['When is dictionary encoding a bad idea (hint: nearly-unique columns)?', 'How does Parquet fall back when a dictionary page grows too large?']
    }
  });

  practice.push({
    title: 'Winners and Losers After a Crash',
    level: 'Easy', tags: ['WAL', 'recovery', 'GROUP BY'], companies: ['Oracle', 'SAP', 'Amazon'],
    statement: `<p>From <code>wal_log</code>, list every transaction with its number of UPDATE records and whether recovery treats it as a <b>winner</b> (has a COMMIT record → redo only) or a <b>loser</b> (no COMMIT → must be undone). This is the ARIES Analysis pass in one query.</p>`,
    constraints: `A transaction may have BEGIN/UPDATE/COMMIT records in any order of LSNs.`,
    example: `<p>${H.c('g', 'T1 winner (1 update)')}, ${H.c('r', 'T2 loser (2 updates)')}, ${H.c('g', 'T3 winner (1)')}, ${H.c('r', 'T4 loser (1)')}.</p>`,
    brute: {
      why: `<p>Listing transactions and then running a separate "does a COMMIT exist?" query per transaction is N+1 queries. A single GROUP BY with conditional counts does it in one scan.</p>`,
      code: eng(`SELECT DISTINCT txn,
       (SELECT COUNT(*) FROM wal_log c WHERE c.txn = l.txn AND c.kind = 'COMMIT') AS has_commit
FROM wal_log l ORDER BY txn;`)
    },
    mcq: { q: 'A loser\'s update already reached disk (stolen page). During Redo, ARIES…', options: ['Repeats history anyway (or skips it if pageLSN shows it is there); Undo later reverses it', 'Ignores all loser records in Redo', 'Deletes the page', 'Marks the transaction committed'], answer: 0, explain: 'ARIES redo is history-repeating and pageLSN-conditional; only the undo pass treats losers differently.' },
    hints: [
      `<p>Hint 1: one output row per transaction, so group the log by <code>txn</code>.</p>`,
      `<p>Hint 2: <code>SUM(kind = 'UPDATE')</code> counts updates; <code>MAX(kind = 'COMMIT')</code> is 1 if a commit exists (SQLite booleans are 0/1).</p>`,
      `<p>Hint 3: a CASE on that flag prints winner/loser; also show MAX(lsn) — the place Undo starts for a loser.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['T1', 1, 'winner: redo only', 5],
          ['T2', 2, 'LOSER: redo, then undo', 6],
          ['T3', 1, 'winner: redo only', 9],
          ['T4', 1, 'LOSER: redo, then undo', 11]
        ] },
      { setup: 'INSERT INTO wal_log (lsn, txn, kind) VALUES (12,\'T2\',\'COMMIT\')', rows: [
          ['T1', 1, 'winner: redo only', 5],
          ['T2', 2, 'winner: redo only', 12],
          ['T3', 1, 'winner: redo only', 9],
          ['T4', 1, 'LOSER: redo, then undo', 11]
        ] },
      { setup: 'DELETE FROM wal_log WHERE kind = \'COMMIT\'', rows: [
          ['T1', 1, 'LOSER: redo, then undo', 2],
          ['T2', 2, 'LOSER: redo, then undo', 6],
          ['T3', 1, 'LOSER: redo, then undo', 8],
          ['T4', 1, 'LOSER: redo, then undo', 11]
        ] },
      { setup: 'INSERT INTO wal_log (lsn, txn, kind) VALUES (12,\'T10\',\'BEGIN\'),(13,\'T10\',\'UPDATE\'),(14,\'T10\',\'UPDATE\'),(15,\'T10\',\'COMMIT\')', rows: [
          ['T1', 1, 'winner: redo only', 5],
          ['T10', 2, 'winner: redo only', 15],
          ['T2', 2, 'LOSER: redo, then undo', 6],
          ['T3', 1, 'winner: redo only', 9],
          ['T4', 1, 'LOSER: redo, then undo', 11]
        ] },
      { setup: 'DELETE FROM wal_log', rows: [] },
      { setup: 'INSERT INTO wal_log (lsn, txn, kind) VALUES (12,\'T5\',\'COMMIT\')', rows: [
          ['T1', 1, 'winner: redo only', 5],
          ['T2', 2, 'LOSER: redo, then undo', 6],
          ['T3', 1, 'winner: redo only', 9],
          ['T4', 1, 'LOSER: redo, then undo', 11],
          ['T5', 0, 'winner: redo only', 12]
        ] },
      { setup: 'INSERT INTO wal_log (lsn, txn, kind) VALUES (12,\'SYS\',\'CKPT\'),(13,\'T2\',\'CLR\'),(14,\'T2\',\'ABORT\')', rows: [
          ['T1', 1, 'winner: redo only', 5],
          ['T2', 2, 'LOSER: redo, then undo', 14],
          ['T3', 1, 'winner: redo only', 9],
          ['T4', 1, 'LOSER: redo, then undo', 11]
        ] },
      { setup: 'INSERT INTO wal_log (lsn, txn, kind) VALUES (12,\'T4\',\'UPDATE\'),(13,\'T4\',\'UPDATE\'),(14,\'T4\',\'UPDATE\')', rows: [
          ['T1', 1, 'winner: redo only', 5],
          ['T2', 2, 'LOSER: redo, then undo', 6],
          ['T3', 1, 'winner: redo only', 9],
          ['T4', 4, 'LOSER: redo, then undo', 14]
        ] },
      { setup: 'DELETE FROM wal_log WHERE txn <> \'T2\'', rows: [
          ['T2', 2, 'LOSER: redo, then undo', 6]
        ] }
    ] },
    solution: {
      approach: `<p>One aggregate per transaction: count updates, detect a COMMIT, and keep the last LSN (for losers, undo starts there and follows prev_lsn backward).</p>`,
      code: eng(`SELECT txn,
       SUM(kind = 'UPDATE') AS updates,
       CASE WHEN MAX(kind = 'COMMIT') = 1 THEN 'winner: redo only' ELSE 'LOSER: redo, then undo' END AS fate,
       MAX(lsn) AS last_lsn
FROM wal_log
WHERE kind <> 'CKPT'            -- checkpoint records belong to no transaction
GROUP BY txn
ORDER BY txn;`),
      complexity: `<p>O(L) for L log records (a hash or sort group-by).</p>`,
      followUps: ['Add ABORT records: an aborted transaction whose undo finished is not a loser any more — how do END records express that?', 'Order the losers\' UPDATE records exactly as the Undo pass would process them.']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Clock (Second-Chance) Page Replacement',
    level: 'Medium', tags: ['buffer pool', 'clock', 'simulation'], companies: ['Google', 'Microsoft', 'VMware'],
    statement: `<p>Implement the <b>Clock</b> replacement policy for a pool of <b>C</b> frames: each frame has a reference bit set to 1 on load and on every hit. To find a victim, the hand sweeps: a frame with bit 1 gets a second chance (bit cleared, hand moves on); the first frame with bit 0 is evicted. Return the number of hits for a trace, and compare with FIFO and LRU.</p>`,
    constraints: `C ≤ 10<sup>5</sup>, trace ≤ 10<sup>6</sup>. Amortised O(1) per access.`,
    example: `<p>C = 3, trace 1 2 3 1 4 1 5 1 6 1 7 1 → ${H.c('r', 'FIFO 3 hits')}, ${H.c('y', 'Clock 4 hits')}, ${H.c('g', 'LRU 5 hits')}. Clock sits between FIFO and LRU but needs no list reordering on hits — just set a bit.</p>`,
    brute: {
      why: `<p>FIFO is the brute-force policy: evict whatever arrived first, ignoring that page 1 is hot. It is O(1) and simple, but evicts the most popular page every C misses.</p>`,
      code: { lang: 'python', run: true, code: `def fifo_hits(cap, trace):
    queue, hits = [], 0
    for p in trace:
        if p in queue:
            hits += 1               # a hit does NOT protect the page in FIFO
            continue
        if len(queue) == cap:
            queue.pop(0)            # evict the oldest arrival, hot or not
        queue.append(p)
    return hits

print("FIFO hits:", fifo_hits(3, [1, 2, 3, 1, 4, 1, 5, 1, 6, 1, 7, 1]))` }
    },
    mcq: { q: 'Why do Postgres and many OSes prefer Clock over exact LRU?', options: ['A hit only sets a bit — no shared linked list to lock and reorder on every access', 'Clock always has a higher hit ratio than LRU', 'Clock needs no memory', 'LRU cannot handle dirty pages'], answer: 0, explain: 'Exact LRU must move the page to the list head on every hit, which serialises concurrent readers on a lock. Clock approximates recency with a bit (Postgres uses a 0–5 usage count).' },
    hints: [
      `<p>Hint 1: keep an array of frames, an array of reference bits, a dict page → frame, and a hand index.</p>`,
      `<p>Hint 2: on a hit just set ref = 1. On a miss, loop: if the frame is empty or ref = 0 → use it; else clear ref and advance the hand.</p>`,
      `<p>Hint 3: the loop ends within one full sweep because every bit it passes gets cleared. Remember to delete the evicted page from the dict.</p>`
    ],
    tests: { sig: 'int int[] -> int[]', fn: 'run_clock', harness: { python: 'def run_clock(cap, trace):\n    return [clock_hits(cap, trace), lru_hits(cap, trace)]' }, cases: [
      [
        [
          3,
          [1, 2, 3, 1, 4, 1, 5, 1, 6, 1, 7, 1]
        ],
        [4, 5]
      ],
      [
        [
          1,
          [1, 1, 2, 2, 1]
        ],
        [2, 2]
      ],
      [
        [
          3,
          []
        ],
        [0, 0]
      ],
      [
        [
          3,
          [1, 2, 3, 4, 1, 2, 3, 4]
        ],
        [0, 0]
      ],
      [
        [
          2,
          [1, 2, 1, 3, 1, 2, 3]
        ],
        [1, 2]
      ],
      [
        [
          4,
          [4, 7, 6, 5, 7, 4, 3, 3, 6, 5, 4, 1, 3, 5, 3, 2, 5, 7, 4, 7, 7, 1, 5, 5, 3, 6, 0, 4, 7, 4, 3, 2, 5, 2, 2, 4, 2, 2, 3, 3, 4, 7, 5, 0, 6, 4, 5, 2, 7, 2, 2, 4, 3, 6, 6, 0, 7, 7, 0, 6, 7, 2, 0, 4, 6, 5, 7, 4, 2, 7, 3, 2, 4, 7, 1, 7, 6, 7, 1, 3, 1, 5, 5, 5, 1, 7, 1, 2, 3, 6, 2, 1, 5, 4, 4, 0, 1, 4, 5, 5, 3, 7, 2, 7, 2, 1, 0, 4, 7, 7, 5, 6, 2, 4, 7, 7, 4, 4, 4, 3, 3, 2, 1, 6, 6, 2, 2, 0, 1, 0, 2, 1, 2, 4, 6, 6, 6, 5, 5, 3, 2, 7, 7, 5, 3, 7, 0, 4, 0, 3, 4, 2, 6, 4, 1, 0, 3, 0, 5, 7, 4, 3, 3, 4, 6, 2, 0, 3, 3, 7, 4, 2, 7, 2, 6, 2, 2, 4, 7, 6, 3, 7, 6, 5, 7, 0, 3, 2, 7, 2, 0, 1, 0, 6, 1, 0, 3, 0, 7, 3, 4, 5, 1, 5, 4, 2, 1, 3, 4, 7, 5, 1, 2, 1, 3, 7, 0, 1, 3, 3, 0, 5, 0, 2, 1, 4, 2, 5, 5, 5, 2, 6, 3, 4, 6, 6, 1, 5, 6, 2, 3, 2, 7, 5, 1, 7, 7, 5, 3, 3, 6, 1, 3, 1, 6, 4, 7, 4, 0, 1, 4, 4, 3, 7, 3, 7, 2, 4, 7, 1, 6, 5, 2, 4, 3, 3, 1, 1, 4, 3, 3, 4, 4, 4, 3, 2, 2, 1, 4, 0, 1, 7, 1, 2, 1, 7, 3, 7, 1, 5]
        ],
        [154, 152]
      ],
      [
        [
          5,
          [8, 4, 3, 5, 2, 6, 4, 0, 2, 7, 4, 2, 3, 0, 4, 5, 8, 4, 5, 5, 2, 1, 7, 7, 6, 5, 7, 7, 2, 2, 0, 1, 2, 8, 7, 8, 7, 1, 6, 8, 2, 3, 2, 4, 3, 0, 2, 7, 4, 7, 1, 6, 7, 5, 5, 1, 7, 7, 1, 2, 2, 0, 5, 2, 5, 2, 7, 6, 5, 3, 4, 2, 5, 4, 2, 6, 3, 7, 1, 3, 6, 1, 4, 3, 7, 8, 2, 0, 1, 5, 3, 2, 8, 2, 2, 3, 7, 6, 1, 4, 8, 4, 7, 8, 5, 8, 8, 5, 4, 0, 5, 1, 0, 2, 0, 1, 7, 1, 7, 4, 4, 5, 6, 8, 5, 3, 2, 5, 8, 2, 3, 4, 7, 2, 8, 0, 2, 7, 6, 1, 4, 0, 3, 5, 2, 7, 7, 7, 2, 0, 6, 8, 6, 5, 3, 6, 6, 4, 8, 4, 2, 3, 2, 3, 2, 6, 0, 0, 5, 3, 3, 8, 4, 8, 5, 6, 8, 7, 2, 8, 5, 6, 5, 0, 8, 8, 6, 2, 5, 4, 4, 7, 3, 2, 6, 0, 8, 0, 7, 2, 8, 8, 0, 6, 4, 8, 6, 5, 2, 1, 5, 0, 7, 4, 8, 7, 7, 2, 3, 3, 5, 2, 2, 0, 7, 6, 1, 5, 0, 3, 8, 2, 3, 3, 2, 2, 5, 2, 0, 0, 8, 2, 1, 6, 5, 7, 0, 4, 7, 8, 7, 2, 5, 8, 7, 8, 2, 0, 4, 1, 5, 8, 1, 7, 5, 8, 3, 7, 4, 6, 5, 7, 4, 8, 5, 0, 7, 6, 3, 0, 2, 5, 0, 8, 1, 7, 3, 0, 0, 4, 3, 0, 8, 0, 8, 1, 6, 1, 8, 6, 4, 5, 3, 5, 5, 7, 2, 6, 5, 8, 1, 0, 2, 4, 4, 8, 2, 4, 0, 8, 2, 2, 3, 2, 0, 2, 4, 0, 4, 3, 2, 4, 3, 4, 8, 3, 5, 3, 5, 5, 8, 6, 6, 5, 5, 3, 5, 5, 7, 2, 2, 1, 0, 6, 3, 0, 3, 4, 0, 6, 2, 4, 3, 5, 5, 1, 3, 4, 1, 0, 1, 5, 5, 0, 3, 3, 3, 2, 2, 7, 0, 3, 8, 2, 2, 0, 4, 4, 7, 0, 1, 4, 6, 4, 1, 2, 4, 5, 8, 0, 7, 4, 7, 2, 1, 5, 7, 2, 2, 7, 8, 6, 8, 6, 1, 2, 1, 4, 8, 6, 1, 0, 2, 7, 4, 4, 6, 8, 4, 7, 7, 5, 7, 0, 3, 8, 8, 3, 6, 0, 2, 0, 2, 4, 2, 7, 0, 7, 0, 1, 0, 8, 6, 4, 3, 3, 5, 4, 0, 3, 5, 4, 0, 6, 3, 8, 8, 4, 4, 5, 5, 0, 5, 3, 2, 2, 4, 5, 5, 0, 2, 5, 7, 3, 0, 2, 3, 7, 0, 1, 2, 8, 7, 5, 4, 7, 6, 4, 1, 5, 1, 5, 6, 4, 6, 8, 5, 2, 5, 1, 6, 3, 2, 2, 3, 8, 1, 1, 8, 2, 7, 1, 8, 0, 8, 4, 5, 0, 7, 2, 3, 1, 3, 5, 8, 4, 2, 5, 6, 5, 0, 0, 4, 3, 0, 1, 8, 1, 5, 3, 6, 7, 5, 7, 8, 0, 2, 0, 6, 0, 6, 5, 3, 5, 4, 8, 2, 3, 7, 1, 1, 0, 8, 5, 6, 4, 8, 3, 0, 5, 4, 4, 5, 7, 7, 0, 2, 7, 4, 3, 0, 4, 7, 1, 8, 1, 8, 2, 1, 4, 5, 4, 4, 3, 5, 4, 3, 0, 1, 0, 7, 3, 0, 0, 6, 8, 2, 7, 4, 0, 3, 3, 5, 2, 2, 6, 6, 3, 1, 5, 5, 4, 5, 8, 0, 0, 8, 4, 3, 7, 2, 5, 2, 6, 6, 6, 8, 4, 2, 6, 8, 4, 1, 7, 5, 2, 2, 3, 8, 2, 0, 4, 5, 5, 0, 5, 7, 3, 5, 1, 6, 2, 6, 8, 4, 4, 3, 4, 0, 0, 8, 8, 2, 2, 3, 1, 3, 0, 6, 0, 6, 6, 1, 7, 4, 1, 4, 7, 0, 3, 1, 1, 4, 2, 2, 6, 0, 6, 3, 4, 1, 2, 6, 4, 6, 7, 4, 7, 2, 2, 7, 6, 7, 2, 1, 6, 6, 4, 3, 4, 6, 0, 6, 6, 7, 4, 5, 7, 3, 2, 2, 0, 8, 1, 0, 0, 7, 2, 1, 8, 3, 0, 2, 5, 4, 2, 6, 3, 1, 3, 8, 2, 5, 3, 5, 1, 7, 3, 1, 0, 8, 1, 6, 6, 1, 6, 0, 0, 4, 3, 8, 0, 1, 3, 6, 1, 0, 0, 7, 4, 1, 4, 6, 3, 7, 8, 2, 2, 5, 5, 2, 4, 1, 5, 1, 7, 7, 8, 6, 0, 3, 6, 2, 1, 4, 8, 1, 6, 0, 1, 7, 4, 2, 6, 6, 6, 4, 8, 3, 7, 0, 6, 2, 2, 5, 2, 3, 4, 4, 4, 0, 6, 1, 3, 3, 5, 8, 8, 6, 6, 7, 5, 1, 4, 3, 6, 0, 2, 8, 2, 2, 7, 2, 6, 4, 0, 6, 0, 2, 2, 4, 7, 3, 5, 2, 6, 3, 5, 2, 0, 2, 5, 5, 3, 7, 5, 2, 8, 1, 2, 7, 1, 8, 7, 0, 1, 3, 4, 4, 6, 3, 6, 7, 2, 1, 6, 6, 3, 5, 3, 1, 4, 4, 0, 7, 6, 1, 5, 7, 0, 3, 0, 7, 3, 8, 3, 8, 2, 5, 6, 0, 7, 2, 7, 3, 0, 2, 0, 6, 5, 8, 8, 0, 3, 5, 8, 5, 4, 5, 1, 2, 1, 5, 1, 6, 2, 6, 6, 8, 2, 8, 2, 7, 8, 4, 6, 4, 6, 2, 3, 8, 3, 7, 5, 7, 4, 2, 2, 4, 6, 6, 5, 4, 7, 5, 3, 1, 5, 8, 6, 8, 8, 1, 3, 4, 4, 5, 0, 4, 8, 6, 1, 6, 7, 3, 6, 7, 0, 1, 4, 0, 1, 7, 8, 6, 7, 4, 4, 3, 1, 2, 0, 1, 5, 6, 8, 0, 0, 3, 0, 1, 3, 4, 7, 7, 2, 3, 0, 5, 1, 6, 8, 5, 0, 7, 5, 8, 2, 3, 8, 3, 4, 6, 4, 2, 1, 6, 5, 8, 4, 5, 1, 8, 1, 7, 7, 5, 5, 5, 4, 3, 2, 4, 4, 6, 3, 2, 5, 5, 2, 1, 4, 2, 0, 3, 1, 5, 6, 0, 8, 8, 6, 3, 0, 7, 7, 3, 5, 7, 4, 3, 3, 5, 0, 2, 7, 1, 7, 2, 3, 5, 2, 6, 1, 7, 3, 8, 3, 4, 7, 3, 6, 3, 7, 1, 2, 5, 1, 0, 8, 2, 6, 3, 5, 3, 3, 5, 0, 6, 4, 1, 5, 5, 7, 7, 0, 5, 2, 2, 7, 8, 5, 5, 3, 8, 3, 7, 7, 2, 5, 6, 1, 6, 4, 7, 5, 1, 0, 0, 8, 3, 3, 0, 0, 4, 6, 7, 7, 4, 6, 4, 2, 7, 8, 6, 2, 7, 2, 7, 4, 4, 5, 0, 6, 1, 0, 8, 5, 1, 4, 6, 4, 2, 1, 6, 1, 7, 7, 2, 8, 4, 2, 1, 1, 3, 3, 8, 3, 1, 2, 1, 1, 1, 3, 7, 8, 6, 3, 0, 5, 1, 1, 2, 2, 4, 3, 0, 6, 4, 7, 5, 7, 8, 8, 5, 3, 2, 8, 0, 2, 6, 8, 3, 5, 5, 2, 1, 4, 4, 4, 4, 5, 3, 0, 5, 3, 3, 4, 6, 7, 4, 1, 4, 7, 6, 0, 5, 7, 6, 0, 5, 6, 5, 0, 5, 3, 7, 7, 5, 5, 1, 2, 4, 1, 3, 5, 8, 5, 8, 3, 5, 3, 8, 5, 5, 0, 8, 0, 3, 7, 2, 7, 4, 5, 2, 1, 8, 0, 1, 1, 8, 5, 4, 2, 8, 7, 6, 2, 2, 2, 5, 3, 2, 4, 1, 5, 1, 1, 8, 3, 8, 1, 0, 0, 4, 5, 1, 1, 5, 1, 4, 5, 0, 3, 7, 4, 2, 0, 7, 2, 3, 0, 3, 3, 4, 4, 5, 6, 2, 7, 6, 3, 6, 7, 3, 8, 5, 0, 2, 8, 8, 6, 8, 3, 3, 8, 4, 8, 4, 0, 4, 0, 4, 5, 4, 1, 3, 8, 6, 7, 1, 4, 4, 3, 5, 7, 0, 2, 0, 1, 7, 8, 7, 0, 8, 7, 0, 8, 3, 2, 0, 4, 4, 5, 0, 0, 2, 4, 5, 5, 0, 3, 6, 3, 1, 8, 0, 8, 4, 8, 8, 1, 7, 2, 7, 2, 5, 1, 7, 6, 0, 6, 1, 3, 6, 2, 7, 2, 7, 4, 5, 4, 0, 2, 8, 3, 6, 7, 2, 4, 4, 4, 7, 3, 5, 5, 1, 0, 6, 3, 7, 0, 1, 6, 1, 0, 4, 6, 2, 8, 1, 6, 7, 6, 3, 5, 8, 2, 7, 0, 2, 5, 0, 6, 2, 1, 6, 2, 5, 5, 0, 2, 5, 7, 1, 2, 0, 3, 4, 8, 4, 1, 1, 2, 0, 7, 0, 8, 1, 2, 2, 3, 4, 1, 6, 5, 0, 4, 8, 1, 6, 3, 1, 3, 8, 1, 8, 5, 8, 6, 7, 7, 4, 2, 5, 0, 4, 2, 5, 6, 6, 5, 6, 0, 2, 8, 7, 6, 7, 7, 7, 4, 8, 5, 5, 2, 6, 8, 6, 2, 1, 3, 7, 3, 4, 6, 4, 0, 3, 2, 5, 8, 4, 6, 0, 7, 3, 3, 5, 1, 3, 5, 4, 8, 7, 3, 0, 0, 6, 4, 5, 2, 5, 1, 8, 7, 8, 5, 0, 7, 4, 6, 3, 0, 0, 8, 5, 3, 5, 2, 4, 6, 2, 3, 7, 1, 7, 5, 4, 2, 4, 7, 0, 0, 1, 0, 2, 8, 5, 4, 8, 6, 3, 7, 0, 8, 8, 7, 8, 5, 7, 5, 1, 0, 3, 2, 6, 3, 5, 2, 4, 0, 0, 5, 6, 2, 6, 7, 5, 2, 4, 6, 6, 3, 1, 8, 2, 3, 7, 6, 4, 4, 1, 0, 6, 0, 1, 4, 2, 6, 3, 6, 3, 1, 8, 7, 0, 7, 8, 0, 7, 5, 5, 7, 8, 6, 0, 3, 2, 8, 2, 7, 6, 6, 2, 1, 4, 6, 3, 0, 6, 2, 7, 1, 2, 6, 4, 6, 8, 1, 3, 4, 7, 1, 5, 1, 1, 0, 8, 5, 7, 2, 2, 4, 7, 3, 6, 8, 4, 3, 4, 2, 1, 0, 7, 1, 5, 7, 4, 4, 5, 3, 7, 2, 7, 7, 7, 2, 7, 0, 6, 4, 2, 0, 1, 1, 4, 3, 7, 6, 1, 3, 3, 3, 8, 3, 0, 6, 7, 3, 4, 0, 3, 1, 3, 4, 0, 8, 8, 7, 3, 3, 7, 7, 5, 6, 5, 0, 8, 2, 1, 5, 3, 4, 3, 5, 0, 1, 1, 0, 8, 8, 5, 3, 6, 3, 4, 1, 6, 3, 8, 6, 6, 4, 7, 3, 4, 4, 2, 1, 0, 6, 2, 3, 6, 3, 6, 6, 5, 0, 1, 7, 8, 7, 5, 7, 5, 3, 8, 4, 5, 3, 8, 0, 6, 3, 6, 5, 3, 1, 0, 0, 2, 6, 0, 2, 4, 3, 6, 3, 2, 5, 2, 5, 7, 7, 1, 4, 5, 0, 4, 8, 1, 0, 1, 4, 6, 4, 6, 1, 1, 8, 6, 3, 1, 7, 3, 6, 7, 6, 4, 7, 2, 8, 5, 8, 5, 5, 5, 7, 2, 5, 4, 3, 1, 2, 8, 0, 0, 7, 1, 2, 2, 8, 2, 1, 2, 6, 6, 7, 5, 0, 6, 1, 0, 0, 8, 7, 5, 0, 3, 5, 0, 6, 0, 2, 0, 0, 7, 3, 0, 5, 6, 0, 2, 6, 5, 5, 5, 1, 6, 0, 8, 6, 3, 3, 1, 7, 2, 6, 2, 1, 7, 4, 6, 0, 0, 5, 6, 3]
        ],
        [1090, 1094]
      ],
      [
        [
          3,
          [8, 4, 13, 18, 24, 5, 21, 28, 11, 21, 28, 19, 6, 11, 24, 13, 10, 20, 24, 23, 8, 7, 24, 7, 22, 27, 28, 22, 24, 17, 28, 18, 12, 3, 10, 5, 18, 26, 7, 13, 17, 18, 4, 25, 26, 25, 2, 9, 24, 0, 20, 15, 28, 7, 3, 16, 11, 29, 21, 27, 17, 6, 13, 28, 3, 27, 9, 24, 2, 16, 13, 24, 21, 8, 9, 24, 8, 18, 24, 7, 21, 6, 9, 7, 20, 24, 14, 4, 27, 12, 2, 17, 13, 29, 21, 5, 27, 13, 10, 28, 15, 1, 14, 4, 23, 0, 4, 12, 27, 9, 9, 16, 2, 27, 13, 13, 11, 26, 29, 29, 18, 28, 17, 9, 7, 19, 15, 22, 8, 26, 3, 10, 16, 23, 0, 28, 22, 2, 10, 8, 23, 25, 8, 9, 11, 15, 15, 1, 2, 4, 11, 18, 9, 11, 0, 4, 2, 19, 20, 28, 15, 22, 24, 19, 11, 5, 10, 5, 6, 9, 6, 27, 15, 5, 9, 8, 11, 5, 22, 12, 1, 1, 16, 2, 5, 25, 27, 24, 4, 4, 27, 21, 3, 1, 28, 13, 16, 25, 28, 26, 7, 27, 12, 1, 23, 3, 3, 14, 22, 14, 8, 6, 8, 29, 2, 13, 1, 28, 11, 7, 21, 12, 26, 24, 11, 28, 4, 6, 1, 21, 8, 11, 5, 27, 7, 18, 22, 2, 15, 22, 3, 23, 0, 25, 22, 25, 29, 28, 24, 1, 1, 16, 6, 9, 14, 9, 28, 18, 16, 4, 29, 1, 13, 24, 11, 26, 22, 13, 6, 8, 14, 19, 0, 19, 28, 18, 1, 21, 24, 14, 3, 7, 22, 28, 12, 18, 3, 9, 19, 11, 21, 13, 14, 2, 7, 25, 28, 9, 11, 26, 5, 13, 7, 14, 2, 12, 6, 14, 3, 1, 22, 5, 11, 12, 19, 24, 0, 0, 16, 24, 7, 29, 23, 20, 0, 13, 28, 7, 20, 11, 7, 16, 28, 0, 10, 18, 8, 23, 27, 11, 7, 26, 15, 19, 21, 5, 2, 12, 0, 3, 7, 0, 8, 17, 21, 14, 13, 9, 21, 23, 16, 14, 14, 22, 16, 27, 19, 27, 17, 4, 25, 20, 6, 18, 12, 3, 5, 24, 19, 1, 7, 12, 2, 7, 19, 19, 11, 22, 15, 12, 4, 1, 3, 10, 29, 7, 0, 4, 3, 11, 16, 11, 11, 0, 5, 19, 4, 11, 20, 20, 23, 27, 20, 22, 18, 9, 2, 18, 15, 17, 6, 18, 19, 4, 5, 21, 4, 4, 3, 4, 19, 13, 26, 23, 8, 21, 27, 22, 6, 21, 14, 9, 22, 7, 28, 0, 1, 27, 12, 8, 13, 23, 2, 6, 20, 13, 27, 4, 10, 8, 6, 5, 8, 17, 17, 8, 2, 24, 12, 15, 4, 1, 10, 3, 24, 3, 14, 3, 24, 23, 26, 17, 5, 6, 25, 13, 15, 19, 21, 13, 9, 9, 3, 22, 16, 29, 19, 13, 12, 2, 29, 9, 16, 0, 10, 1, 8, 23, 20, 26, 17, 2, 20, 8, 21, 20, 23, 12, 2, 5, 16, 8, 0, 11, 4, 14, 12, 19, 12, 23, 11, 10, 7, 20, 22, 18, 24, 2, 22, 22, 13, 8, 28, 1, 29, 27, 13, 3, 14, 22, 29, 27, 14, 10, 4, 21, 15, 10, 20, 8, 13, 20, 4, 16, 9, 4, 8, 24, 6, 10, 17, 24, 27, 6, 4, 9, 8, 22, 21, 19, 28, 4, 7, 29, 20, 5, 21, 13, 16, 22, 5, 11, 11, 8, 21, 7, 14, 12, 0, 27, 10, 0, 13, 28, 5, 16, 8, 8, 2, 25, 13, 8, 25, 1, 17, 21, 28, 23, 16, 21, 8, 2, 29, 21, 27, 14, 22, 22, 16, 0, 4, 19, 0, 24, 15, 23, 13, 19, 14, 17, 27, 12, 25, 21, 15, 14, 18, 16, 23, 5, 10, 27, 7, 25, 18, 4, 4, 20, 7, 9, 1, 29, 23, 13, 27, 9, 11, 5, 26, 6, 12, 0, 22, 22, 20, 2, 13, 24, 12, 22, 28, 28, 4, 13, 4, 23, 22, 12, 11, 16, 3, 9, 16, 0, 24, 24, 26, 28, 28, 0, 29, 11, 3, 19, 10, 7, 18, 2, 2, 26, 7, 5, 11, 4, 3, 17, 13, 25, 27, 24, 12, 25, 19, 13, 29, 9, 23, 3, 6, 29, 1, 14, 4, 21, 3, 20, 25, 23, 23, 18, 11, 13, 6, 23, 0, 21, 26, 16, 10, 5, 8, 28, 20, 28, 24, 21, 12, 0, 21, 24, 23, 4, 8, 3, 2, 26, 21, 13, 29, 5, 0, 24, 10, 25, 2, 29, 7, 10, 18, 8, 11, 3, 21, 22, 26, 17, 0, 8, 3, 19, 5, 0, 1, 8, 18, 20, 5, 14, 4, 20, 14, 2, 1, 4, 29, 16, 15, 27, 2, 26, 2, 4, 26, 28, 27, 19, 11, 6, 4, 20, 7, 20, 19, 11, 29, 17, 4, 27, 8, 22, 7, 8, 7, 13, 2, 17, 19, 8, 6, 23, 0, 9, 28, 15, 4, 4, 28, 0, 19, 26, 20, 2, 29, 29, 18, 0, 4, 8, 14, 21, 14, 24, 3, 16, 2, 15, 26, 20, 29, 14, 22, 21, 12, 4, 9, 18, 29, 26, 28, 3, 11, 14, 21, 10, 7, 28, 7, 7, 24, 21, 17, 16, 27, 25, 15, 8, 12, 17, 0, 20, 14, 29, 19, 20, 13, 10, 17, 5, 8, 24, 5, 9, 27, 17, 19, 3, 12, 14, 16, 16, 21, 26, 9, 17, 25, 14, 23, 14, 29, 15, 15, 10, 3, 9, 8, 1, 26, 0, 28, 19, 11, 17, 17, 17, 14, 28, 0, 20, 16, 15, 20, 25, 17, 22, 16, 0, 6, 25, 11, 20, 24, 26, 5, 24, 1, 13, 16, 5, 28, 12, 1, 0, 9, 3, 14, 26, 25, 16, 5, 26, 19, 26, 1, 23, 29, 28, 20, 14, 25, 28, 5, 25, 14, 17, 21, 5, 19, 15, 13, 17]
        ],
        [96, 95]
      ],
      [
        [
          10,
          [9, 8, 9, 5, 9, 1, 7, 1, 8, 3, 5, 3, 7, 8, 2, 7, 3, 0, 0, 7, 6, 1, 0, 3, 5, 1, 4, 4, 0, 9, 9, 2, 8, 3, 5, 8, 8, 5, 9, 8, 7, 4, 0, 7, 5, 4, 1, 1, 5, 5]
        ],
        [40, 40]
      ],
      [
        [
          2,
          [7]
        ],
        [0, 0]
      ],
      [
        [
          3,
          [1, 2, 3, 4, 5, 6, 7, 8, 9]
        ],
        [0, 0]
      ],
      [
        [
          1000,
          { $concat: [
              { $range: [0, 1000] },
              { $range: [0, 1000] },
              { $range: [0, 1000] }
            ] }
        ],
        [2000, 2000]
      ]
    ] },
    solution: {
      approach: `<p>Circular array + reference bits. Each sweep clears bits, so a page survives only if it was referenced since the hand last passed — an approximation of "recently used" with O(1) amortised cost and no reordering.</p>`,
      code: { lang: 'python', run: true, code: `from collections import OrderedDict

def clock_hits(cap, trace):
    frames, ref, where, hand, hits = [None] * cap, [0] * cap, {}, 0, 0
    for p in trace:
        if p in where:
            hits += 1
            ref[where[p]] = 1                 # second chance for later
            continue
        while frames[hand] is not None and ref[hand] == 1:
            ref[hand] = 0                     # give a second chance, move on
            hand = (hand + 1) % cap
        if frames[hand] is not None:
            del where[frames[hand]]           # evict victim
        frames[hand], ref[hand], where[p] = p, 1, hand
        hand = (hand + 1) % cap
    return hits

def lru_hits(cap, trace):
    pool, hits = OrderedDict(), 0
    for p in trace:
        if p in pool:
            hits += 1
            pool.move_to_end(p)
        else:
            if len(pool) == cap:
                pool.popitem(last=False)
            pool[p] = True
    return hits

trace = [1, 2, 3, 1, 4, 1, 5, 1, 6, 1, 7, 1]
print("Clock hits:", clock_hits(3, trace), "| LRU hits:", lru_hits(3, trace))` },
      complexity: `<p>Amortised O(1) per access (each sweep step clears a bit that a later access must set again); O(C) memory.</p>`,
      followUps: ['Turn the bit into a counter (0–5) like Postgres usage_count. What changes for very hot pages?', 'Add pin counts: pinned frames are skipped by the hand.']
    }
  });

  practice.push({
    title: 'Where Can the Log Be Truncated?',
    level: 'Medium', tags: ['WAL', 'checkpoint', 'recovery'], companies: ['Amazon', 'Microsoft', 'Yugabyte'],
    statement: `<p>A fuzzy checkpoint stored its dirty page table in <code>ckpt_dirty_pages(page, rec_lsn)</code> and its active transactions in <code>ckpt_active_txns(txn, first_lsn)</code>. Compute (1) the LSN where the <b>Redo</b> pass must start, (2) the oldest LSN still needed for <b>Undo</b>, (3) the <b>truncation point</b> (everything strictly older can be recycled), and list the log records that must be kept.</p>`,
    constraints: `Assume no transaction started before the checkpoint other than those in ckpt_active_txns.`,
    example: `<p>recLSNs {A: 2, C: 6} → redo from ${H.c('b', '2')}; active T2 first LSN 3 → undo needs ${H.c('y', '3')}; truncation point = min(2, 3) = ${H.c('g', '2')}: only LSN 1 can be recycled.</p>`,
    brute: {
      why: `<p>Never truncating is always "safe" but the log grows forever (and recovery reads all of it). Truncating at the checkpoint record itself is the classic bug: older records may still be needed to redo dirty pages or undo active transactions.</p>`,
      code: eng(`-- "Keep everything" (safe, but unbounded log and slow recovery)
SELECT COUNT(*) AS records_kept, MIN(lsn) AS oldest_kept FROM wal_log;`)
    },
    mcq: { q: 'An idle transaction began 6 hours ago and never committed. What happens to WAL/redo retention?', options: ['The log cannot be truncated past its first LSN, so log files pile up', 'Nothing — checkpoints ignore transactions', 'The transaction is auto-committed at the checkpoint', 'Only data pages grow'], answer: 0, explain: 'Undo may need its records, so the truncation point is pinned at its first LSN (InnoDB undo/history and Postgres replication slots show similar pinning).' },
    hints: [
      `<p>Hint 1: redo must start at the oldest change not yet on disk = MIN(rec_lsn).</p>`,
      `<p>Hint 2: undo of an active transaction may walk back to its first record = MIN(first_lsn).</p>`,
      `<p>Hint 3: truncation point = the smaller of the two; then <code>SELECT … FROM wal_log WHERE lsn &gt;= that</code>.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [2, 3, 2, 1, '2,3,4,5,6,7,8,9,10,11']
        ] },
      { setup: 'DELETE FROM ckpt_active_txns', rows: [
          [2, null, 2, 1, '2,3,4,5,6,7,8,9,10,11']
        ] },
      { setup: 'DELETE FROM ckpt_dirty_pages', rows: [
          [null, 3, 3, 2, '3,4,5,6,7,8,9,10,11']
        ] },
      { setup: 'UPDATE ckpt_active_txns SET first_lsn = 1', rows: [
          [2, 1, 1, 0, '1,2,3,4,5,6,7,8,9,10,11']
        ] },
      { setup: 'UPDATE ckpt_dirty_pages SET rec_lsn = rec_lsn + 3', rows: [
          [5, 3, 3, 2, '3,4,5,6,7,8,9,10,11']
        ] },
      { setup: 'INSERT INTO ckpt_active_txns VALUES (\'T9\', 8)', rows: [
          [2, 3, 2, 1, '2,3,4,5,6,7,8,9,10,11']
        ] },
      { setup: 'DELETE FROM ckpt_active_txns; DELETE FROM ckpt_dirty_pages', rows: [
          [null, null, null, 0, null]
        ] },
      { setup: 'DELETE FROM wal_log', rows: [
          [2, 3, 2, 0, null]
        ] },
      { setup: 'DELETE FROM wal_log WHERE lsn >= 4', rows: [
          [2, 3, 2, 1, '2,3']
        ] },
      { setup: 'UPDATE ckpt_dirty_pages SET rec_lsn = 11', rows: [
          [11, 3, 3, 2, '3,4,5,6,7,8,9,10,11']
        ] }
    ] },
    solution: {
      approach: `<p>Combine the two lower bounds. This is precisely what InnoDB's checkpoint age and Postgres's <code>max_wal_size</code>/checkpoint logic track: the oldest LSN any recovery could possibly need.</p>`,
      code: eng(`WITH bounds AS (
  SELECT (SELECT MIN(rec_lsn) FROM ckpt_dirty_pages)   AS redo_start,
         (SELECT MIN(first_lsn) FROM ckpt_active_txns) AS undo_oldest
), cut AS (
  SELECT redo_start, undo_oldest, COALESCE(MIN(redo_start, undo_oldest), redo_start, undo_oldest) AS keep_from FROM bounds
)
SELECT c.redo_start, c.undo_oldest, c.keep_from,
       (SELECT COUNT(*) FROM wal_log WHERE lsn < c.keep_from) AS recyclable_records,
       (SELECT GROUP_CONCAT(lsn) FROM (SELECT lsn FROM wal_log WHERE lsn >= c.keep_from ORDER BY lsn)) AS kept_lsns
FROM cut c;`),
      complexity: `<p>O(D + A + L): scan the dirty page table, active transaction table and the log once.</p>`,
      followUps: ['Why is a fuzzy checkpoint safe even though pages are being modified while it is taken?', 'How do replication slots or lagging replicas add a third lower bound in Postgres?']
    }
  });

  practice.push({
    title: 'Size a Bloom Filter per SSTable',
    level: 'Medium', tags: ['LSM', 'Bloom filter', 'math'], companies: ['Meta', 'Apple', 'Cloudflare'],
    statement: `<p>Each SSTable needs a Bloom filter with false-positive rate <b>p</b>. For <b>n</b> keys, compute the optimal bits per key (m/n = −ln p / (ln 2)<sup>2</sup>) and hash count (k = (m/n)·ln 2). For a database of <b>10<sup>9</sup> keys</b>, report total filter memory for p = 1% and p = 0.1%, and the expected wasted reads per lookup of a missing key across 7 SSTable levels.</p>`,
    constraints: `Round k to the nearest integer; report memory in MB (10<sup>6</sup> bytes).`,
    example: `<p>p = 1% → ${H.c('g', '9.59 bits/key, k = 7')}, 10<sup>9</sup> keys → ${H.c('b', '≈ 1,198 MB')}; 7 levels × 0.01 = ${H.c('y', '0.07')} wasted reads per miss. p = 0.1% → 14.4 bits/key ≈ 1,797 MB.</p>`,
    brute: {
      why: `<p>Brute force: try every (bits per key, k) pair and evaluate the false-positive formula (1 − e<sup>−k/b</sup>)<sup>k</sup>, keeping the cheapest that meets p. It works, but the closed form gives the optimum directly.</p>`,
      code: { lang: 'python', run: true, code: `import math
p_target = 0.01
best = None
for bits in [x / 10 for x in range(10, 300)]:          # bits per key 1.0 .. 29.9
    for k in range(1, 30):
        fpr = (1 - math.exp(-k / bits)) ** k
        if fpr <= p_target and (best is None or bits < best[0]):
            best = (bits, k, fpr)
print("search: bits/key=%.1f k=%d fpr=%.4f" % best)` }
    },
    mcq: { q: 'Halving the false-positive rate of a Bloom filter costs roughly…', options: ['About 1.44 extra bits per key', 'Twice the memory', 'One extra hash function and no memory', 'Nothing'], answer: 0, explain: 'm/n = −ln p / (ln 2)² = 1.44·log₂(1/p); halving p adds 1.44 bits per key.' },
    hints: [
      `<p>Hint 1: bits per key b = −ln(p) / (ln 2)<sup>2</sup> ≈ 1.44 · log<sub>2</sub>(1/p).</p>`,
      `<p>Hint 2: k = b · ln 2, rounded. Memory = n · b / 8 bytes.</p>`,
      `<p>Hint 3: for a missing key every level's filter gets a chance to lie: expected wasted reads ≈ levels × p.</p>`
    ],
    tests: { sig: 'long double -> double[]', fn: 'run_bloom', cmp: 'float', harness: { python: 'def run_bloom(n, p):\n    return list(bloom_plan(n, p))' }, cases: [
      [
        [1000000000, 0.01],
        [9.585058377367439, 7, 0.01003921765840619, 1198.1322971709299, 0.07]
      ],
      [
        [1000000000, 0.001],
        [14.37758756605116, 10, 0.001000024926883912, 1797.198445756395, 0.007]
      ],
      [
        [1, 0.5],
        [1.4426950408889634, 1, 0.5, 1.8033688011112042e-7, 3.5]
      ],
      [
        [1000000, 0.000001],
        [28.75517513210232, 20, 0.0000010000498543891735, 3.59439689151279, 0.000007]
      ],
      [
        [5000, 0.2],
        [3.3498341477947564, 2, 0.2021077388223146, 0.0020936463423717228, 1.4000000000000001]
      ],
      [
        [1000000000, 0.999],
        [0.0020824103598065316, 1, 1, 0.26030129497581644, 6.993]
      ],
      [
        [123456, 0.05],
        [6.235224229572683, 4, 0.05026948316860863, 0.09622198031076565, 0.35000000000000003]
      ]
    ] },
    solution: {
      approach: `<p>Use the closed-form optimum. Then reason about placement: RocksDB keeps filters in the block cache (pinning L0 and top-level filters), and research like Monkey gives deeper levels fewer bits since they hold most keys but are probed least often for hits.</p>`,
      code: { lang: 'python', run: true, code: `import math

def bloom_plan(n, p, levels=7):
    bits_per_key = -math.log(p) / (math.log(2) ** 2)
    k = max(1, round(bits_per_key * math.log(2)))
    actual_fpr = (1 - math.exp(-k / bits_per_key)) ** k
    mem_mb = n * bits_per_key / 8 / 1e6
    return bits_per_key, k, actual_fpr, mem_mb, levels * p

for p in (0.01, 0.001):
    b, k, fpr, mb, waste = bloom_plan(10**9, p)
    print("p=%.3f: %.2f bits/key, k=%d (fpr %.4f), memory %.0f MB, wasted reads per miss %.3f"
          % (p, b, k, fpr, mb, waste))` },
      complexity: `<p>O(1) closed form (the brute search is O(B·K)).</p>`,
      followUps: ['Why do RocksDB Ribbon filters save ~30% memory at the same FPR?', 'What changes for range queries — why do Bloom filters not help, and what are prefix Bloom filters?']
    }
  });

  practice.push({
    title: 'K-Way Merge of SSTables (Compaction Core)',
    level: 'Medium', tags: ['LSM', 'compaction', 'heap', 'merge'], companies: ['Cockroach Labs', 'PingCAP', 'Confluent', 'Datadog'],
    statement: `<p>You are given <b>k</b> SSTables, each a list of <code>(key, seq, value)</code> sorted by key, where <code>value = None</code> is a tombstone. Produce the compacted output: sorted by key, only the <b>highest seq</b> per key, and drop tombstones if <code>bottom_level = True</code> (keep them otherwise). Stream it — do not load everything and sort.</p>`,
    constraints: `Total entries up to 10<sup>8</sup> on disk; memory O(k). Keys within one SSTable are unique.`,
    example: `<p>run A [(a,1,x) (c,3,None)], run B [(a,5,y) (b,2,z)], bottom = True → ${H.c('g', '[(a,5,y), (b,2,z)]')}: a's newest version is seq 5; c's newest is a tombstone, dropped at the bottom.</p>`,
    brute: {
      why: `<p>Concatenate all runs, sort by (key, −seq), keep the first of each key. Correct, but O(N log N) time and O(N) memory — impossible for 100 GB of SSTables. The runs are already sorted; a heap merge streams them in O(N log k) with O(k) memory.</p>`,
      code: { lang: 'python', run: true, code: `def compact_brute(runs, bottom_level):
    allrows = sorted((row for run in runs for row in run), key=lambda r: (r[0], -r[1]))
    out, last = [], None
    for key, seq, val in allrows:
        if key == last:
            continue                       # older version, shadowed
        last = key
        if val is None and bottom_level:
            continue                       # tombstone can vanish at the bottom
        out.append((key, seq, val))
    return out

A = [("a", 1, "x"), ("c", 3, None)]
B = [("a", 5, "y"), ("b", 2, "z")]
print(compact_brute([A, B], True))` }
    },
    mcq: { q: 'Why may a tombstone NOT be dropped when compacting into a middle level?', options: ['An older value of the key may still exist in a deeper level, and would reappear', 'Tombstones are needed for Bloom filters', 'Middle levels are read-only', 'Because of the WAL'], answer: 0, explain: 'The tombstone is the only thing hiding older versions below it. Only at the bottom (or when no deeper file overlaps the key) is it safe to drop.' },
    hints: [
      `<p>Hint 1: <code>heapq.merge(*runs, key=lambda r: (r[0], -r[1]))</code> yields entries in key order, newest first for equal keys.</p>`,
      `<p>Hint 2: the first entry you see for a key is its newest version; skip the rest until the key changes.</p>`,
      `<p>Hint 3: emit tombstones only when not at the bottom level. Use a generator so output streams.</p>`
    ],
    tests: { sig: 'int[][][] bool -> int[][]', fn: 'run_compact', harness: { python: 'def run_compact(runs, bottom):\n    runs = [[(k, s, None if v < 0 else v) for k, s, v in r] for r in runs]\n    return [[k, s, -1 if v is None else v] for k, s, v in compact(runs, bottom)]' }, cases: [
      [
        [
          [
            [
              [0, 1, 10],
              [2, 3, -1],
              [3, 4, 40]
            ],
            [
              [0, 5, 50],
              [1, 2, 20],
              [3, 9, -1]
            ]
          ],
          true
        ],
        [
          [0, 5, 50],
          [1, 2, 20]
        ]
      ],
      [
        [
          [
            [
              [0, 1, 10],
              [2, 3, -1],
              [3, 4, 40]
            ],
            [
              [0, 5, 50],
              [1, 2, 20],
              [3, 9, -1]
            ]
          ],
          false
        ],
        [
          [0, 5, 50],
          [1, 2, 20],
          [2, 3, -1],
          [3, 9, -1]
        ]
      ],
      [
        [
          [],
          true
        ],
        []
      ],
      [
        [
          [
            []
          ],
          false
        ],
        []
      ],
      [
        [
          [
            [
              [1, 1, 5]
            ]
          ],
          true
        ],
        [
          [1, 1, 5]
        ]
      ],
      [
        [
          [
            [
              [1, 7, -1]
            ],
            [
              [1, 3, 9]
            ]
          ],
          true
        ],
        []
      ],
      [
        [
          [
            [
              [1, 7, -1]
            ],
            [
              [1, 3, 9]
            ]
          ],
          false
        ],
        [
          [1, 7, -1]
        ]
      ],
      [
        [
          [
            [
              [5, 1, -1],
              [6, 2, -1]
            ]
          ],
          true
        ],
        []
      ],
      [
        [
          [
            [
              [5, 1, -1],
              [6, 2, -1]
            ]
          ],
          false
        ],
        [
          [5, 1, -1],
          [6, 2, -1]
        ]
      ],
      [
        [
          [
            [
              [0, 0, 33],
              [1, 1, 55],
              [2, 2, 63],
              [4, 4, 92],
              [5, 5, 13],
              [7, 7, 24],
              [12, 12, 17],
              [13, 13, 91],
              [14, 14, 48],
              [15, 15, 34],
              [18, 18, 48],
              [19, 19, 60],
              [20, 20, 34],
              [21, 21, 36],
              [22, 22, 96],
              [23, 23, 91],
              [25, 25, -1],
              [27, 27, 39],
              [28, 28, 35],
              [29, 29, 42],
              [31, 31, 61],
              [35, 35, 64],
              [36, 36, 25],
              [37, 37, 0],
              [38, 38, 41]
            ],
            [
              [1, 1001, 33],
              [3, 1003, -1],
              [4, 1004, 4],
              [6, 1006, -1],
              [8, 1008, 86],
              [9, 1009, 74],
              [12, 1012, 45],
              [15, 1015, 30],
              [17, 1017, 2],
              [18, 1018, 98],
              [19, 1019, 85],
              [21, 1021, 66],
              [22, 1022, -1],
              [23, 1023, -1],
              [24, 1024, 81],
              [25, 1025, 85],
              [27, 1027, 27],
              [28, 1028, 58],
              [31, 1031, 25],
              [32, 1032, 53],
              [33, 1033, -1],
              [34, 1034, 38],
              [36, 1036, -1],
              [38, 1038, 24],
              [39, 1039, -1]
            ],
            [
              [3, 2003, 15],
              [7, 2007, 86],
              [8, 2008, 88],
              [9, 2009, -1],
              [10, 2010, 25],
              [11, 2011, 57],
              [12, 2012, 15],
              [13, 2013, 7],
              [14, 2014, 8],
              [16, 2016, 95],
              [17, 2017, 59],
              [18, 2018, 44],
              [20, 2020, 80],
              [23, 2023, 92],
              [24, 2024, 10],
              [25, 2025, -1],
              [27, 2027, 61],
              [29, 2029, 97],
              [30, 2030, 40],
              [31, 2031, -1],
              [32, 2032, -1],
              [34, 2034, 33],
              [36, 2036, 97],
              [37, 2037, -1],
              [39, 2039, 21]
            ],
            [
              [1, 3001, 22],
              [3, 3003, 40],
              [4, 3004, -1],
              [5, 3005, -1],
              [8, 3008, 5],
              [9, 3009, 92],
              [10, 3010, 59],
              [11, 3011, 44],
              [12, 3012, -1],
              [14, 3014, 18],
              [16, 3016, 57],
              [19, 3019, 5],
              [22, 3022, 22],
              [24, 3024, 47],
              [26, 3026, 50],
              [27, 3027, 28],
              [28, 3028, -1],
              [29, 3029, 80],
              [30, 3030, 27],
              [31, 3031, 97],
              [32, 3032, 24],
              [34, 3034, 46],
              [36, 3036, 37],
              [37, 3037, 48],
              [39, 3039, -1]
            ],
            [
              [0, 4000, 6],
              [2, 4002, 22],
              [3, 4003, 79],
              [5, 4005, 26],
              [6, 4006, 22],
              [7, 4007, -1],
              [8, 4008, -1],
              [9, 4009, 55],
              [16, 4016, -1],
              [17, 4017, 25],
              [18, 4018, -1],
              [20, 4020, 0],
              [21, 4021, 5],
              [23, 4023, -1],
              [24, 4024, 59],
              [28, 4028, 15],
              [29, 4029, 87],
              [30, 4030, 16],
              [31, 4031, 65],
              [32, 4032, 81],
              [33, 4033, 62],
              [35, 4035, 48],
              [36, 4036, 69],
              [37, 4037, 27],
              [39, 4039, 84]
            ],
            [
              [2, 5002, -1],
              [5, 5005, 22],
              [6, 5006, 58],
              [8, 5008, 28],
              [9, 5009, 71],
              [10, 5010, 69],
              [13, 5013, 2],
              [14, 5014, 49],
              [16, 5016, 70],
              [17, 5017, 21],
              [20, 5020, 62],
              [21, 5021, 74],
              [22, 5022, 32],
              [23, 5023, -1],
              [24, 5024, 15],
              [28, 5028, 84],
              [29, 5029, 75],
              [30, 5030, 20],
              [31, 5031, -1],
              [32, 5032, -1],
              [33, 5033, 27],
              [34, 5034, 47],
              [36, 5036, 99],
              [38, 5038, 58],
              [39, 5039, 1]
            ]
          ],
          true
        ],
        [
          [0, 4000, 6],
          [1, 3001, 22],
          [3, 4003, 79],
          [5, 5005, 22],
          [6, 5006, 58],
          [8, 5008, 28],
          [9, 5009, 71],
          [10, 5010, 69],
          [11, 3011, 44],
          [13, 5013, 2],
          [14, 5014, 49],
          [15, 1015, 30],
          [16, 5016, 70],
          [17, 5017, 21],
          [19, 3019, 5],
          [20, 5020, 62],
          [21, 5021, 74],
          [22, 5022, 32],
          [24, 5024, 15],
          [26, 3026, 50],
          [27, 3027, 28],
          [28, 5028, 84],
          [29, 5029, 75],
          [30, 5030, 20],
          [33, 5033, 27],
          [34, 5034, 47],
          [35, 4035, 48],
          [36, 5036, 99],
          [37, 4037, 27],
          [38, 5038, 58],
          [39, 5039, 1]
        ]
      ],
      [
        [
          [
            [
              [0, 0, 33],
              [1, 1, 55],
              [2, 2, 63],
              [4, 4, 92],
              [5, 5, 13],
              [7, 7, 24],
              [12, 12, 17],
              [13, 13, 91],
              [14, 14, 48],
              [15, 15, 34],
              [18, 18, 48],
              [19, 19, 60],
              [20, 20, 34],
              [21, 21, 36],
              [22, 22, 96],
              [23, 23, 91],
              [25, 25, -1],
              [27, 27, 39],
              [28, 28, 35],
              [29, 29, 42],
              [31, 31, 61],
              [35, 35, 64],
              [36, 36, 25],
              [37, 37, 0],
              [38, 38, 41]
            ],
            [
              [1, 1001, 33],
              [3, 1003, -1],
              [4, 1004, 4],
              [6, 1006, -1],
              [8, 1008, 86],
              [9, 1009, 74],
              [12, 1012, 45],
              [15, 1015, 30],
              [17, 1017, 2],
              [18, 1018, 98],
              [19, 1019, 85],
              [21, 1021, 66],
              [22, 1022, -1],
              [23, 1023, -1],
              [24, 1024, 81],
              [25, 1025, 85],
              [27, 1027, 27],
              [28, 1028, 58],
              [31, 1031, 25],
              [32, 1032, 53],
              [33, 1033, -1],
              [34, 1034, 38],
              [36, 1036, -1],
              [38, 1038, 24],
              [39, 1039, -1]
            ],
            [
              [3, 2003, 15],
              [7, 2007, 86],
              [8, 2008, 88],
              [9, 2009, -1],
              [10, 2010, 25],
              [11, 2011, 57],
              [12, 2012, 15],
              [13, 2013, 7],
              [14, 2014, 8],
              [16, 2016, 95],
              [17, 2017, 59],
              [18, 2018, 44],
              [20, 2020, 80],
              [23, 2023, 92],
              [24, 2024, 10],
              [25, 2025, -1],
              [27, 2027, 61],
              [29, 2029, 97],
              [30, 2030, 40],
              [31, 2031, -1],
              [32, 2032, -1],
              [34, 2034, 33],
              [36, 2036, 97],
              [37, 2037, -1],
              [39, 2039, 21]
            ],
            [
              [1, 3001, 22],
              [3, 3003, 40],
              [4, 3004, -1],
              [5, 3005, -1],
              [8, 3008, 5],
              [9, 3009, 92],
              [10, 3010, 59],
              [11, 3011, 44],
              [12, 3012, -1],
              [14, 3014, 18],
              [16, 3016, 57],
              [19, 3019, 5],
              [22, 3022, 22],
              [24, 3024, 47],
              [26, 3026, 50],
              [27, 3027, 28],
              [28, 3028, -1],
              [29, 3029, 80],
              [30, 3030, 27],
              [31, 3031, 97],
              [32, 3032, 24],
              [34, 3034, 46],
              [36, 3036, 37],
              [37, 3037, 48],
              [39, 3039, -1]
            ],
            [
              [0, 4000, 6],
              [2, 4002, 22],
              [3, 4003, 79],
              [5, 4005, 26],
              [6, 4006, 22],
              [7, 4007, -1],
              [8, 4008, -1],
              [9, 4009, 55],
              [16, 4016, -1],
              [17, 4017, 25],
              [18, 4018, -1],
              [20, 4020, 0],
              [21, 4021, 5],
              [23, 4023, -1],
              [24, 4024, 59],
              [28, 4028, 15],
              [29, 4029, 87],
              [30, 4030, 16],
              [31, 4031, 65],
              [32, 4032, 81],
              [33, 4033, 62],
              [35, 4035, 48],
              [36, 4036, 69],
              [37, 4037, 27],
              [39, 4039, 84]
            ],
            [
              [2, 5002, -1],
              [5, 5005, 22],
              [6, 5006, 58],
              [8, 5008, 28],
              [9, 5009, 71],
              [10, 5010, 69],
              [13, 5013, 2],
              [14, 5014, 49],
              [16, 5016, 70],
              [17, 5017, 21],
              [20, 5020, 62],
              [21, 5021, 74],
              [22, 5022, 32],
              [23, 5023, -1],
              [24, 5024, 15],
              [28, 5028, 84],
              [29, 5029, 75],
              [30, 5030, 20],
              [31, 5031, -1],
              [32, 5032, -1],
              [33, 5033, 27],
              [34, 5034, 47],
              [36, 5036, 99],
              [38, 5038, 58],
              [39, 5039, 1]
            ]
          ],
          false
        ],
        [
          [0, 4000, 6],
          [1, 3001, 22],
          [2, 5002, -1],
          [3, 4003, 79],
          [4, 3004, -1],
          [5, 5005, 22],
          [6, 5006, 58],
          [7, 4007, -1],
          [8, 5008, 28],
          [9, 5009, 71],
          [10, 5010, 69],
          [11, 3011, 44],
          [12, 3012, -1],
          [13, 5013, 2],
          [14, 5014, 49],
          [15, 1015, 30],
          [16, 5016, 70],
          [17, 5017, 21],
          [18, 4018, -1],
          [19, 3019, 5],
          [20, 5020, 62],
          [21, 5021, 74],
          [22, 5022, 32],
          [23, 5023, -1],
          [24, 5024, 15],
          [25, 2025, -1],
          [26, 3026, 50],
          [27, 3027, 28],
          [28, 5028, 84],
          [29, 5029, 75],
          [30, 5030, 20],
          [31, 5031, -1],
          [32, 5032, -1],
          [33, 5033, 27],
          [34, 5034, 47],
          [35, 4035, 48],
          [36, 5036, 99],
          [37, 4037, 27],
          [38, 5038, 58],
          [39, 5039, 1]
        ]
      ]
    ] },
    solution: {
      approach: `<p>Heap-based k-way merge (exactly RocksDB's MergingIterator idea) with "first version wins" de-duplication. Memory holds one cursor per input run. Real engines also respect snapshots: a version is dropped only if no live snapshot needs it.</p>`,
      code: { lang: 'python', run: true, code: `import heapq

def compact(runs, bottom_level):
    last_key = object()
    for key, seq, val in heapq.merge(*runs, key=lambda r: (r[0], -r[1])):
        if key == last_key:
            continue                       # shadowed older version
        last_key = key
        if val is None and bottom_level:
            continue                       # drop tombstone at the bottom level
        yield (key, seq, val)

A = [("a", 1, "x"), ("c", 3, None), ("d", 4, "old")]
B = [("a", 5, "y"), ("b", 2, "z"), ("d", 9, "new")]
print("bottom :", list(compact([A, B], True)))
print("middle :", list(compact([A, B], False)))` },
      complexity: `<p>O(N log k) time, O(k) memory, single sequential pass over each input — which is why compaction I/O is sequential.</p>`,
      followUps: ['Add snapshot support: keep the newest version visible to each live snapshot sequence number.', 'Split the output into ~64 MB files at key boundaries so the next level has non-overlapping files.']
    }
  });

  practice.push({
    title: 'Snapshot Read on a Versioned Key-Value Log',
    level: 'Medium', tags: ['LSM', 'MVCC', 'window functions'], companies: ['PingCAP', 'Cockroach Labs', 'Google'],
    statement: `<p>An LSM engine gives every write a sequence number, and a snapshot taken at sequence <b>S</b> sees, for each key, the newest version with <code>seq ≤ S</code> — unless that version is a delete. Using <code>kv_log(seq, k, v, op)</code>, return the visible key/value pairs for <b>S = 4</b> and <b>S = 6</b> in one query.</p>`,
    constraints: `op 'P' = put, 'D' = delete (tombstone). Output columns: snapshot, k, v.`,
    example: `<p>S = 4 → user:1 = asha.k, ${H.c('g', 'user:2 = ben')}, user:3 = chen. S = 6 → user:1 = asha.k, user:3 = chen, user:4 = dara (${H.c('r', 'user:2 deleted at seq 5')}).</p>`,
    brute: {
      why: `<p>A correlated subquery per (snapshot, key) — "find the max seq ≤ S for this key" — re-scans the log for every key: O(K · L) per snapshot. A window function does one pass per snapshot.</p>`,
      code: eng(`SELECT 4 AS snapshot, k, v FROM kv_log a
WHERE seq = (SELECT MAX(seq) FROM kv_log b WHERE b.k = a.k AND b.seq <= 4) AND op = 'P'
ORDER BY k;`)
    },
    mcq: { q: 'Why can an LSM engine offer snapshots almost for free?', options: ['Every version is kept with its sequence number until compaction, so a snapshot is just a sequence cutoff', 'It copies the whole database', 'It locks all keys', 'Snapshots are not possible in LSMs'], answer: 0, explain: 'Old versions live on in older memtables/SSTables; a snapshot only needs compaction to keep versions it can still see.' },
    hints: [
      `<p>Hint 1: cross join the log with a tiny table of snapshots (4, 6), filtering <code>seq ≤ snapshot</code>.</p>`,
      `<p>Hint 2: <code>ROW_NUMBER() OVER (PARTITION BY snapshot, k ORDER BY seq DESC)</code> marks the newest visible version as 1.</p>`,
      `<p>Hint 3: keep rn = 1 and op = 'P' — a newest version that is a tombstone hides the key.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [4, 'user:1', 'asha.k'],
          [4, 'user:2', 'ben'],
          [4, 'user:3', 'chen'],
          [6, 'user:1', 'asha.k'],
          [6, 'user:3', 'chen'],
          [6, 'user:4', 'dara']
        ] },
      { setup: 'INSERT INTO kv_log VALUES (9,\'user:1\',\'late\',\'P\')', rows: [
          [4, 'user:1', 'asha.k'],
          [4, 'user:2', 'ben'],
          [4, 'user:3', 'chen'],
          [6, 'user:1', 'asha.k'],
          [6, 'user:3', 'chen'],
          [6, 'user:4', 'dara']
        ] },
      { setup: 'DELETE FROM kv_log WHERE seq = 5', rows: [
          [4, 'user:1', 'asha.k'],
          [4, 'user:2', 'ben'],
          [4, 'user:3', 'chen'],
          [6, 'user:1', 'asha.k'],
          [6, 'user:2', 'ben'],
          [6, 'user:3', 'chen'],
          [6, 'user:4', 'dara']
        ] },
      { setup: 'INSERT INTO kv_log VALUES (0,\'user:0\',\'zero\',\'P\')', rows: [
          [4, 'user:0', 'zero'],
          [4, 'user:1', 'asha.k'],
          [4, 'user:2', 'ben'],
          [4, 'user:3', 'chen'],
          [6, 'user:0', 'zero'],
          [6, 'user:1', 'asha.k'],
          [6, 'user:3', 'chen'],
          [6, 'user:4', 'dara']
        ] },
      { setup: 'UPDATE kv_log SET op = \'D\', v = NULL WHERE seq = 4', rows: [
          [4, 'user:1', 'asha.k'],
          [4, 'user:2', 'ben'],
          [6, 'user:1', 'asha.k'],
          [6, 'user:4', 'dara']
        ] },
      { setup: 'DELETE FROM kv_log', rows: [] },
      { setup: 'DELETE FROM kv_log WHERE op = \'P\'', rows: [] },
      { setup: 'INSERT INTO kv_log VALUES (100,\'a\',\'x\',\'P\');DELETE FROM kv_log WHERE seq <= 3', rows: [
          [4, 'user:3', 'chen'],
          [6, 'user:3', 'chen'],
          [6, 'user:4', 'dara']
        ] },
      { setup: 'DELETE FROM kv_log WHERE seq > 6; INSERT INTO kv_log VALUES (7, \'user:2\', \'back\', \'P\')', rows: [
          [4, 'user:1', 'asha.k'],
          [4, 'user:2', 'ben'],
          [4, 'user:3', 'chen'],
          [6, 'user:1', 'asha.k'],
          [6, 'user:3', 'chen'],
          [6, 'user:4', 'dara']
        ] }
    ] },
    solution: {
      approach: `<p>Versioned reads are "latest version per key under a cutoff": a partitioned ROW_NUMBER. This is how TiKV/CockroachDB-style MVCC on top of an LSM resolves reads at a timestamp.</p>`,
      code: eng(`WITH snaps(s) AS (VALUES (4), (6)),
visible AS (
  SELECT s AS snapshot, k, v, op,
         ROW_NUMBER() OVER (PARTITION BY s, k ORDER BY seq DESC) AS rn
  FROM kv_log JOIN snaps ON kv_log.seq <= snaps.s
)
SELECT snapshot, k, v FROM visible
WHERE rn = 1 AND op = 'P'
ORDER BY snapshot, k;`),
      complexity: `<p>O(S · L log L) for S snapshots over L log entries (one sort per partition set).</p>`,
      followUps: ['Which versions can compaction drop if the oldest live snapshot is 4?', 'How does a long-lived snapshot affect space amplification?']
    }
  });

  practice.push({
    title: 'Group Commit: Throughput and Latency',
    level: 'Medium', tags: ['WAL', 'fsync', 'simulation'], companies: ['Stripe', 'Amazon', 'PlanetScale'],
    statement: `<p>Transactions arrive every <b>0.1 ms</b> (10,000/s) and each needs its COMMIT record fsynced; one fsync takes <b>1 ms</b>. Simulate 2,000 commits under (a) one fsync per commit, served one at a time, and (b) <b>group commit</b>: when an fsync finishes, the next fsync covers <i>all</i> commits waiting at that moment. Report number of fsyncs, average and max commit latency.</p>`,
    constraints: `Times in ms; the log device does one fsync at a time.`,
    example: `<p>Serial: capacity 1,000 commits/s &lt; 10,000/s arrivals → the queue explodes, ${H.c('r', 'max latency ≈ 1.8 s')}. Group commit: ${H.c('g', '~200 fsyncs, average latency ≈ 1.5 ms, max ≈ 1.9 ms')}.</p>`,
    brute: {
      why: `<p>One fsync per commit is the naive design: correct, but the device's fsync rate caps throughput at 1 / 1 ms = 1,000 commits/s, and latency grows without bound when arrivals exceed it.</p>`,
      code: { lang: 'python', run: true, code: `ARRIVE, FSYNC, N = 0.1, 1.0, 2000
t_free, lat = 0.0, []
for i in range(N):
    arrive = i * ARRIVE
    start = max(arrive, t_free)        # wait for the device
    t_free = start + FSYNC             # one fsync just for me
    lat.append(t_free - arrive)
print("serial: fsyncs=%d avg=%.1f ms max=%.1f ms" % (N, sum(lat) / N, max(lat)))` }
    },
    mcq: { q: 'Group commit improves throughput mainly because…', options: ['One fsync makes many transactions\' commit records durable at once', 'It skips fsync entirely', 'It writes data pages instead of the log', 'It reduces the size of log records'], answer: 0, explain: 'Durability cost is per fsync, not per transaction; batching amortises it across all commits waiting in the log buffer.' },
    hints: [
      `<p>Hint 1: keep <code>t_free</code> = when the device finishes its current fsync.</p>`,
      `<p>Hint 2: for group commit, when an fsync completes at time t, the batch is every commit that arrived up to t and is not yet durable.</p>`,
      `<p>Hint 3: latency of a commit = (end of the fsync that covers it) − (its arrival time). If nobody is waiting, the device idles until the next arrival.</p>`
    ],
    tests: { sig: 'int double double -> double[]', fn: 'group_commit', cmp: 'float', cases: [
      [
        [2000, 0.1, 1],
        [201, 1.45, 1.9, 9950.248756218905]
      ],
      [
        [100, 0.1, 1],
        [11, 1.45, 1.9, 9090.90909090909]
      ],
      [
        [1, 0.1, 1],
        [1, 1, 1, 1000]
      ],
      [
        [10, 1, 1],
        [10, 1, 1, 1000]
      ],
      [
        [50, 2, 1],
        [50, 1, 1, 505.050505050505]
      ],
      [
        [500, 0.3, 1],
        [151, 1.45, 1.9, 3311.2582781456954]
      ],
      [
        [1000, 0.5, 1],
        [501, 1.25, 1.5, 1996.007984031936]
      ],
      [
        [300, 0.7, 0.7],
        [300, 0.7, 0.7, 1428.5714285714287]
      ],
      [
        [2000, 0.01, 1],
        [21, 1.495, 1.99, 95238.09523809524]
      ],
      [
        [7, 0.1, 0.3],
        [3, 0.38571428571428573, 0.5, 7777.777777777777]
      ],
      [
        [10000, 0.05, 2],
        [251, 2.975, 3.95, 19920.3187250996]
      ]
    ] },
    solution: {
      approach: `<p>Event-driven loop over fsyncs instead of transactions: each fsync takes everything waiting. Throughput becomes "batch size / fsync time", and the batch grows automatically with load — the self-tuning property that makes durable commits cheap in InnoDB, Postgres and every serious WAL.</p>`,
      code: { lang: 'python', run: true, code: `def group_commit(n, arrive, fsync):
    arrivals = [i * arrive for i in range(n)]
    t, i, fsyncs, lat = 0.0, 0, 0, []
    while i < n:
        t = max(t, arrivals[i])                    # device idle until someone commits
        batch_end = i
        while batch_end < n and arrivals[batch_end] <= t + 1e-9:   # tolerance: arrival times are floats
            batch_end += 1                         # everyone waiting joins this fsync
        t += fsync
        fsyncs += 1
        lat.extend(t - arrivals[j] for j in range(i, batch_end))
        i = batch_end
    return fsyncs, sum(lat) / n, max(lat), n / (t / 1000)

ARRIVE, FSYNC, N = 0.1, 1.0, 2000
fsyncs, avg, worst, capacity = group_commit(N, ARRIVE, FSYNC)
print("group: fsyncs=%d avg=%.2f ms max=%.2f ms, throughput capacity ~%d commits/s"
      % (fsyncs, avg, worst, capacity))` },
      complexity: `<p>O(N) — each commit joins exactly one batch.</p>`,
      followUps: ['What does Postgres commit_delay / commit_siblings add to this model?', 'How do replicated commits (Raft/semi-sync) change the latency floor?']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'ARIES Undo with CLRs Survives a Crash During Recovery',
    level: 'Hard', tags: ['ARIES', 'CLR', 'recovery', 'idempotence'], companies: ['Oracle', 'Microsoft', 'Snowflake', 'Amazon'],
    statement: `<p>Implement recovery for a log of <b>logical increment</b> records (<code>UPD page += delta</code>, each with <code>prev</code> = previous LSN of the same transaction). Redo is conditional on pageLSN. Undo of a loser must write a <b>CLR</b> (compensation log record) carrying <code>undo_next</code> = the undone record's <code>prev</code>, and set pageLSN to the CLR's LSN. Show that if the system <b>crashes again after one undo step</b> (log and that page flushed), running recovery a second time still produces the correct state — and that a version without CLRs does not.</p>`,
    constraints: `Pages: X = 100, Y = 0 initially. T1 (loser): X += 10, X += 5. T2 (winner): Y += 7. Disk at the first crash: X = 115 (pageLSN 3), Y = 0.`,
    example: `<p>Correct final state: ${H.c('g', 'X = 100, Y = 7')}. Without CLRs the second recovery undoes "+5" again: ${H.c('r', 'X = 95')} — corruption, because logical undo is not idempotent.</p>`,
    brute: {
      why: `<p>The naive recovery undoes losers by walking their records backward but writes nothing to the log and does not bump pageLSN. If it crashes midway after flushing a page, the next recovery has no way to know which undos already happened, so it repeats them. With increment-style (logical) undo, repeating is wrong.</p>`,
      code: { lang: 'python', run: true, code: `def naive_recover(log, disk, crash_after=None):
    pages = {p: list(v) for p, v in disk.items()}
    winners = {r["txn"] for r in log if r["type"] == "COMMIT"}
    for r in log:                                            # redo
        if r["type"] == "UPD" and pages[r["page"]][1] < r["lsn"]:
            pages[r["page"]][0] += r["delta"]
            pages[r["page"]][1] = r["lsn"]
    steps = 0
    for r in reversed(log):                                  # undo, no CLRs
        if r["type"] == "UPD" and r["txn"] not in winners:
            if steps == crash_after:
                return pages                                 # crash! pages flushed as they are
            pages[r["page"]][0] -= r["delta"]
            steps += 1
    return pages

log = [{"lsn": 1, "txn": "T1", "type": "BEGIN", "prev": None},
       {"lsn": 2, "txn": "T1", "type": "UPD", "page": "X", "delta": 10, "prev": 1},
       {"lsn": 3, "txn": "T1", "type": "UPD", "page": "X", "delta": 5, "prev": 2},
       {"lsn": 4, "txn": "T2", "type": "BEGIN", "prev": None},
       {"lsn": 5, "txn": "T2", "type": "UPD", "page": "Y", "delta": 7, "prev": 4},
       {"lsn": 6, "txn": "T2", "type": "COMMIT", "prev": 5}]
disk = {"X": [115, 3], "Y": [0, 0]}
after_first = naive_recover(log, disk, crash_after=1)        # undid +5, then crashed
print("after crash during recovery:", after_first)
print("second naive recovery      :", naive_recover(log, after_first), "<- X should be 100")` }
    },
    mcq: { q: 'What does a CLR\'s undo_next pointer guarantee?', options: ['A later recovery skips work already undone and continues exactly where undo stopped', 'The CLR itself will be undone later', 'Winners are redone twice', 'The page is written to disk immediately'], answer: 0, explain: 'CLRs are redo-only; undo_next points to the next record still to undo, so repeated crashes never undo the same change twice and recovery work is bounded.' },
    hints: [
      `<p>Hint 1: Analysis — for each transaction remember its last LSN; transactions without COMMIT are losers whose undo starts at that last LSN.</p>`,
      `<p>Hint 2: Redo must replay CLRs too (they are just "X += −5" with their own LSN), guarded by pageLSN &lt; LSN.</p>`,
      `<p>Hint 3: Undo loop — pick the loser with the largest pending LSN; if it is a CLR jump to its undo_next; if UPD, append a CLR (delta = −delta, undo_next = prev), apply it, set pageLSN; stop at BEGIN (write END).</p>`
    ],
    tests: { sig: 'int[] int int -> int[]', fn: 'run_aries', harness: { python: 'def run_aries(deltas, y, crash):\n    log = [{"lsn": 1, "txn": "T1", "type": "BEGIN", "prev": None}]\n    for d in deltas:\n        n = len(log) + 1\n        log.append({"lsn": n, "txn": "T1", "type": "UPD", "page": "X", "delta": d, "prev": n - 1})\n    x_lsn = len(log)\n    n = len(log) + 1\n    log.append({"lsn": n, "txn": "T2", "type": "BEGIN", "prev": None})\n    log.append({"lsn": n + 1, "txn": "T2", "type": "UPD", "page": "Y", "delta": y, "prev": n})\n    log.append({"lsn": n + 2, "txn": "T2", "type": "COMMIT", "prev": n + 1})\n    disk = {"X": [100 + sum(deltas), x_lsn], "Y": [0, 0]}\n    pages, status = recover(log, disk, crash_after=None if crash < 0 else crash)\n    pages, status = recover(log, pages)\n    return [pages["X"][0], pages["Y"][0]]' }, cases: [
      [
        [
          [10, 5],
          7,
          1
        ],
        [100, 7]
      ],
      [
        [
          [10, 5],
          7,
          0
        ],
        [100, 7]
      ],
      [
        [
          [10, 5],
          7,
          2
        ],
        [100, 7]
      ],
      [
        [
          [10, 5],
          7,
          -1
        ],
        [100, 7]
      ],
      [
        [
          [10],
          7,
          0
        ],
        [100, 7]
      ],
      [
        [
          [],
          7,
          0
        ],
        [100, 7]
      ],
      [
        [
          [3, 4, 5],
          0,
          1
        ],
        [100, 0]
      ],
      [
        [
          [3, 4, 5],
          -2,
          2
        ],
        [100, -2]
      ],
      [
        [
          [-10, 25, -5, 8],
          9,
          3
        ],
        [100, 9]
      ],
      [
        [
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          1,
          6
        ],
        [100, 1]
      ],
      [
        [
          [100000, -100000],
          5,
          1
        ],
        [100, 5]
      ]
    ] },
    solution: {
      approach: `<p>Classic ARIES: history-repeating redo over UPD <i>and</i> CLR records, then undo driven by a max-LSN worklist. Because each undo step is logged (CLR) and stamps pageLSN, the second recovery's redo sees the CLR already applied and its undo resumes from undo_next — so the result is correct no matter how many times recovery crashes.</p>`,
      code: { lang: 'python', run: true, code: `def recover(log, disk, crash_after=None):
    pages = {p: list(v) for p, v in disk.items()}
    by_lsn = {r["lsn"]: r for r in log}
    last, committed = {}, set()
    for r in log:                                             # 1) analysis
        last[r["txn"]] = r["lsn"]
        if r["type"] in ("COMMIT", "END"):
            committed.add(r["txn"])
    pending = {t: l for t, l in last.items() if t not in committed}
    for r in log:                                             # 2) redo: UPD and CLR
        if r["type"] in ("UPD", "CLR") and pages[r["page"]][1] < r["lsn"]:
            pages[r["page"]][0] += r["delta"]
            pages[r["page"]][1] = r["lsn"]
    steps = 0
    while pending:                                            # 3) undo, newest first
        txn, lsn = max(pending.items(), key=lambda kv: kv[1])
        r = by_lsn[lsn]
        if r["type"] == "CLR":
            nxt = r["undo_next"]                              # skip what is already undone
        elif r["type"] == "UPD":
            if steps == crash_after:
                return pages, "CRASHED"
            clr = {"lsn": len(log) + 1, "txn": txn, "type": "CLR", "page": r["page"],
                   "delta": -r["delta"], "undo_next": r["prev"]}
            log.append(clr)
            by_lsn[clr["lsn"]] = clr
            pages[r["page"]][0] += clr["delta"]
            pages[r["page"]][1] = clr["lsn"]
            steps += 1
            nxt = r["prev"]
        else:
            nxt = None                                        # reached BEGIN
        if nxt and by_lsn[nxt]["type"] != "BEGIN":
            pending[txn] = nxt
        else:
            del pending[txn]
            log.append({"lsn": len(log) + 1, "txn": txn, "type": "END"})
    return pages, "OK"

log = [{"lsn": 1, "txn": "T1", "type": "BEGIN", "prev": None},
       {"lsn": 2, "txn": "T1", "type": "UPD", "page": "X", "delta": 10, "prev": 1},
       {"lsn": 3, "txn": "T1", "type": "UPD", "page": "X", "delta": 5, "prev": 2},
       {"lsn": 4, "txn": "T2", "type": "BEGIN", "prev": None},
       {"lsn": 5, "txn": "T2", "type": "UPD", "page": "Y", "delta": 7, "prev": 4},
       {"lsn": 6, "txn": "T2", "type": "COMMIT", "prev": 5}]
disk = {"X": [115, 3], "Y": [0, 0]}
pages, status = recover(log, disk, crash_after=1)
print("first recovery:", status, pages, "| log now ends with", log[-1]["type"], "lsn", log[-1]["lsn"])
pages, status = recover(log, pages)                           # flushed pages + flushed log
print("second recovery:", status, {p: v[0] for p, v in pages.items()})
print("log tail:", [(r["lsn"], r["type"], r.get("undo_next")) for r in log[6:]])` },
      complexity: `<p>O(L + U log T): one forward scan for analysis and redo, then each loser record undone once (heap/max over T losers). Repeated crashes add no repeated undo work.</p>`,
      followUps: ['Why are CLRs never undone themselves?', 'Postgres has no undo pass — what replaces it (hint: MVCC visibility and the commit log)?', 'Add a fuzzy checkpoint so analysis starts mid-log.']
    }
  });

  practice.push({
    title: 'Design a Storage Engine for 1M Metric Points per Second',
    level: 'Hard', tags: ['storage engine design', 'LSM', 'time-series', 'capacity planning'], companies: ['Datadog', 'Grafana Labs', 'Uber', 'Netflix'],
    statement: `<p>Design the single-node storage engine for a metrics database: <b>1,000,000 points/s</b> (series_id 8 B, timestamp 8 B, float64 value 8 B), queries mostly "last 1–6 hours for a few series", retention <b>30 days</b>. Choose the data structure, key layout, write path, compaction strategy, compression and deletion strategy, and size WAL bandwidth, memtable, flush frequency, total disk and compaction bandwidth. Write the sizing as code.</p>`,
    constraints: `One NVMe disk (≈ 2 GB/s sequential write, 1 M IOPS), 64 GB RAM. Gorilla-style compression ≈ 1.4 bytes per point.`,
    example: `<p>Raw ingest = 24 MB/s. Memtable 1 GB flushes every ~40 s. Compressed ≈ 1.4 MB/s → ${H.c('b', '≈ 3.6 TB for 30 days')}. Time-window compaction with WA ≈ 3 → ${H.c('g', '≈ 28 MB/s total disk writes')}. A B-tree on (series, ts) would dirty a random 16 KB page per point: ${H.c('r', '≈ 33 GB/s')} — impossible.</p>`,
    brute: {
      why: `<p>The naive design is a relational table <code>points(series_id, ts, value)</code> with a B-tree primary key in a general-purpose engine. With a million <i>different</i> series receiving points, inserts land on random leaf pages: page writes, doublewrite and index maintenance blow past any disk, and 30-day deletes become billions of row deletes.</p>`,
      code: { lang: 'python', run: true, code: `points_per_s = 1_000_000
page = 16_384
btree_bytes_per_s = points_per_s * (2 * page)     # random leaf page + doublewrite per point (worst case)
print("naive B-tree writes ~%.0f GB/s (disk does ~2 GB/s)" % (btree_bytes_per_s / 1e9))
rows_to_delete_daily = points_per_s * 86_400
print("retention via DELETE: %.1f billion row deletes per day" % (rows_to_delete_daily / 1e9))` }
    },
    mcq: { q: 'Which compaction strategy fits 30-day retention of time-series data best?', options: ['Time-window compaction: compact within time buckets and drop whole expired files', 'Leveled compaction with tombstones for every expired point', 'No compaction at all', 'Size-tiered with daily DELETE statements'], answer: 0, explain: 'Data arrives roughly in time order and expires by time; grouping files by time window lets expiry delete entire files with zero rewrite and no tombstones.' },
    hints: [
      `<p>Hint 1: the write path must be sequential: WAL + in-memory buffer per series, flushed as immutable sorted, compressed blocks (an LSM / TSM design).</p>`,
      `<p>Hint 2: key = (series_id, time_bucket) → value = compressed chunk of points (delta-of-delta timestamps, XOR floats). Recent data stays in RAM for the common "last few hours" query.</p>`,
      `<p>Hint 3: partition files by time window (e.g. 2 h blocks merged into daily blocks); retention = delete files older than 30 days. Size: raw MB/s, compressed MB/s, total TB, WA × compressed rate, memtable flush interval.</p>`
    ],
    tests: { sig: 'int double double int double double -> double[]', fn: 'size_engine', cmp: 'float', cases: [
      [
        [1000000, 24, 1.4, 30, 1, 3],
        [24, 24, 41.666666666666664, 1.4, 3.6288, 28.2, 10.08]
      ],
      [
        [1000, 24, 1.4, 30, 1, 3],
        [0.024, 0.024, 41666.666666666664, 0.0014, 0.0036288, 0.0282, 0.01008]
      ],
      [
        [500000, 16, 2, 7, 0.5, 4],
        [8, 8, 62.5, 1, 0.6048, 12, 7.2]
      ],
      [
        [1000000, 24, 1.4, 1, 2, 1],
        [24, 24, 83.33333333333333, 1.4, 0.12096, 25.4, 10.08]
      ],
      [
        [2500000, 32, 1.1, 90, 4, 5],
        [80, 80, 50, 2.75, 21.384, 93.75, 19.8]
      ],
      [
        [1, 8, 1, 1, 0.001, 2],
        [0.000008, 0.000008, 125000, 0.000001, 8.64e-8, 0.000009999999999999999, 0.0000072]
      ]
    ] },
    solution: {
      approach: `<p><b>Design:</b> an LSM-style time-series engine (like Prometheus TSDB, InfluxDB TSM, M3, VictoriaMetrics). <b>Write path:</b> append each batch to a WAL (group commit), add points to per-series in-memory chunks (the memtable); recent 2 h of data serves most queries from RAM. <b>Flush:</b> every ~2 h block (or when memory is high), write an immutable block: an index (series → chunk offsets, inverted label index) plus chunks compressed with delta-of-delta timestamps and XOR-encoded floats (~1.4 B/point). <b>Compaction:</b> time-window — merge small blocks into larger (e.g. 2 h → 8 h → 1 day) <i>within</i> a time range only; WA ≈ 2–3. <b>Retention:</b> delete whole blocks past 30 days — no tombstones. <b>Reads:</b> time-range pruning by block min/max time, then series lookup in each block's index. <b>Durability:</b> WAL replay on restart rebuilds the in-memory head.</p>`,
      code: { lang: 'python', run: true, code: `def size_engine(pts, raw_point, compressed, days, memtable_gb, wa):
    raw_mb_s = pts * raw_point / 1e6
    wal_mb_s = raw_mb_s                                  # WAL holds the raw batches
    flush_every_s = memtable_gb * 1e9 / (pts * raw_point)
    comp_mb_s = pts * compressed / 1e6
    disk_tb = pts * compressed * 86_400 * days / 1e12
    total_write_mb_s = wal_mb_s + comp_mb_s * wa
    head_2h_gb = pts * 7200 * compressed / 1e9           # recent data kept in RAM, compressed
    return raw_mb_s, wal_mb_s, flush_every_s, comp_mb_s, disk_tb, total_write_mb_s, head_2h_gb

PTS = 1_000_000            # points per second
RAW_POINT = 24             # bytes: series 8 + ts 8 + value 8
COMPRESSED = 1.4           # bytes/point with delta-of-delta + XOR floats
DAYS = 30
MEMTABLE_GB = 1.0
WA_TIME_WINDOW = 3         # flush + ~2 merges within a window

(raw_mb_s, wal_mb_s, flush_every_s, comp_mb_s, disk_tb,
 total_write_mb_s, head_2h_gb) = size_engine(PTS, RAW_POINT, COMPRESSED, DAYS, MEMTABLE_GB, WA_TIME_WINDOW)

print("raw ingest          : %.0f MB/s" % raw_mb_s)
print("WAL bandwidth       : %.0f MB/s (sequential, group-committed)" % wal_mb_s)
print("memtable flush every: %.0f s for a %.0f GB memtable" % (flush_every_s, MEMTABLE_GB))
print("compressed data rate: %.1f MB/s" % comp_mb_s)
print("30-day footprint    : %.1f TB" % disk_tb)
print("total disk writes   : %.0f MB/s of ~2000 available" % total_write_mb_s)
print("last 2 h in RAM     : %.1f GB compressed (serves most dashboards)" % head_2h_gb)` },
      complexity: `<p>Writes: O(1) amortised per point (append + in-memory insert); reads: O(blocks overlapping the time range × log series) via per-block indexes; retention: O(1) per expired block (file delete).</p>`,
      followUps: ['How do you handle out-of-order points that arrive 3 hours late?', 'How would you add downsampling (5-minute rollups) without rewriting raw blocks?', 'What changes if cardinality explodes to 100M active series (label explosion)?']
    }
  });

  practice.push({
    title: 'Detect and Repair Torn Pages',
    level: 'Hard', tags: ['torn page', 'checksum', 'doublewrite', 'durability'], companies: ['Oracle', 'Percona', 'Amazon', 'Alibaba'],
    statement: `<p>A page is 4 sectors; the disk guarantees only that each <b>sector</b> write is atomic. Simulate writing a new page version and crashing after 2 of 4 sectors. Implement (1) a <b>CRC32 checksum</b> in the page header to detect the torn page on read and (2) a <b>doublewrite</b> area: write the full new page there and fsync before writing in place, so recovery can repair a torn in-place page.</p>`,
    constraints: `Use zlib.crc32. The doublewrite copy itself may also be torn if the crash happens while writing it — then the in-place page is still the intact old version.`,
    example: `<p>Old page "AAAA|AAAA|AAAA|AAAA", new "BBBB|BBBB|BBBB|BBBB", crash after 2 sectors → disk holds ${H.c('r', 'BBBB BBBB AAAA AAAA')}: checksum mismatch → copy from doublewrite → ${H.c('g', 'BBBB×4')}.</p>`,
    brute: {
      why: `<p>Without checksums, a torn page is read back silently as half-new, half-old data — the engine cannot even tell something went wrong, and WAL redo (which assumes a consistent page image) may build on garbage.</p>`,
      code: { lang: 'python', run: true, code: `SECTORS = 4
old = ["AAAA"] * SECTORS
new = ["BBBB"] * SECTORS
disk = old[:]
for i in range(2):              # crash after 2 sectors
    disk[i] = new[i]
print("read back:", disk, "<- no way to know it is torn")` }
    },
    mcq: { q: 'Postgres solves torn pages without a doublewrite buffer by…', options: ['Writing a full-page image into the WAL on the first change to a page after each checkpoint', 'Using 512-byte pages', 'Never writing pages', 'Running fsck after crashes'], answer: 0, explain: 'full_page_writes = on: recovery restores the whole page from the WAL image, then replays later changes, so a torn page on disk does not matter.' },
    hints: [
      `<p>Hint 1: store the CRC of the payload sectors in a header sector; on read, recompute and compare.</p>`,
      `<p>Hint 2: write order = doublewrite copy (all sectors) → fsync → in-place sectors → fsync. A crash can tear only one of the two copies.</p>`,
      `<p>Hint 3: recovery: for each page, if the in-place copy fails its checksum, take the doublewrite copy if <i>it</i> verifies; if the doublewrite copy is torn, the in-place page is still the old intact version.</p>`
    ],
    tests: { sig: 'int int -> string[]', fn: 'run_scenario', harness: { python: 'def run_scenario(dw, ip):\n    _, _, final, ok, how = scenario(None if dw < 0 else dw, None if ip < 0 else ip)\n    return ["|".join(final), how, str(ok)]' }, cases: [
      [
        [-1, 2],
        ['BBBB|BBBB|BBBB|BBBB', 'repaired from doublewrite', 'True']
      ],
      [
        [-1, -1],
        ['BBBB|BBBB|BBBB|BBBB', 'in-place page is valid', 'True']
      ],
      [
        [-1, 0],
        ['AAAA|AAAA|AAAA|AAAA', 'in-place page is valid', 'True']
      ],
      [
        [-1, 1],
        ['BBBB|BBBB|BBBB|BBBB', 'repaired from doublewrite', 'True']
      ],
      [
        [-1, 3],
        ['BBBB|BBBB|BBBB|BBBB', 'repaired from doublewrite', 'True']
      ],
      [
        [-1, 4],
        ['BBBB|BBBB|BBBB|BBBB', 'in-place page is valid', 'True']
      ],
      [
        [0, -1],
        ['AAAA|AAAA|AAAA|AAAA', 'doublewrite torn: in-place page is still the old intact version', 'True']
      ],
      [
        [1, -1],
        ['AAAA|AAAA|AAAA|AAAA', 'doublewrite torn: in-place page is still the old intact version', 'True']
      ],
      [
        [2, -1],
        ['AAAA|AAAA|AAAA|AAAA', 'doublewrite torn: in-place page is still the old intact version', 'True']
      ],
      [
        [3, -1],
        ['AAAA|AAAA|AAAA|AAAA', 'doublewrite torn: in-place page is still the old intact version', 'True']
      ],
      [
        [3, 0],
        ['AAAA|AAAA|AAAA|AAAA', 'doublewrite torn: in-place page is still the old intact version', 'True']
      ],
      [
        [0, 3],
        ['AAAA|AAAA|AAAA|AAAA', 'doublewrite torn: in-place page is still the old intact version', 'True']
      ]
    ] },
    solution: {
      approach: `<p>Checksums give detection; a second, separately written full copy gives repair. InnoDB does exactly this (doublewrite buffer, since 8.0.20 in separate <code>#ib_*.dblwr</code> files); Postgres gets the same guarantee from full-page images in WAL; filesystems like ZFS avoid it with copy-on-write. Hardware with atomic 16 KB writes lets InnoDB disable doublewrite safely.</p>`,
      code: { lang: 'python', run: true, code: `import zlib

def make_page(sectors):
    crc = zlib.crc32("".join(sectors).encode())
    return {"crc": crc, "data": list(sectors)}

def valid(page):
    return zlib.crc32("".join(page["data"]).encode()) == page["crc"]

def write_page(target, page, crash_after=None):
    """Header (crc) goes with sector 0; each sector write is atomic."""
    for i, s in enumerate(page["data"]):
        if crash_after is not None and i == crash_after:
            return False
        target["data"][i] = s
        if i == 0:
            target["crc"] = page["crc"]
    return True

def scenario(dw_crash=None, inplace_crash=None):
    """Crash while writing the doublewrite copy and/or the in-place page, then recover.
    Returns (sectors after the crash, checksum ok?, sectors after recovery, checksum ok?, how)."""
    old = make_page(["AAAA"] * 4)
    new = make_page(["BBBB"] * 4)
    in_place = {"crc": old["crc"], "data": old["data"][:]}
    doublewrite = {"crc": 0, "data": ["....."] * 4}
    dw_done = write_page(doublewrite, new, dw_crash)   # 1) full copy to doublewrite, then fsync
    if dw_done:
        write_page(in_place, new, inplace_crash)       # 2) in-place write, possibly torn by a crash
    after_crash, ok = in_place["data"][:], valid(in_place)
    if ok:                                             # recovery
        how = "in-place page is valid" if dw_done else "doublewrite torn: in-place page is still the old intact version"
    elif valid(doublewrite):
        in_place = {"crc": doublewrite["crc"], "data": doublewrite["data"][:]}
        how = "repaired from doublewrite"
    else:
        how = "no valid copy"
    return after_crash, ok, in_place["data"], valid(in_place), how

after_crash, ok, final, final_ok, how = scenario(None, 2)
print("in-place after crash:", after_crash, "checksum ok?", ok)
print(how + ":", final, "checksum ok?", final_ok)` },
      complexity: `<p>Detection O(page size) per read (CRC32C is hardware-accelerated); doublewrite doubles page write bytes but the extra writes are sequential.</p>`,
      followUps: ['Why does InnoDB still need the redo log when it has a doublewrite buffer?', 'What does a checksum failure on a replica mean, and how do you recover (re-clone vs page-level repair)?']
    }
  });

  practice.push({
    title: 'WAL Record Framing: Recover Up to the Last Valid Record',
    level: 'Hard', tags: ['WAL', 'checksum', 'binary format', 'Java'], companies: ['Confluent', 'Apple', 'Cockroach Labs', 'Microsoft'],
    lang: 'java',
    statement: `<p>Design the on-disk record format for a write-ahead log and the startup scan that finds where valid data ends. Each record is <code>[int length][long crc32][payload bytes]</code>. On startup, read records sequentially and stop at the first record that is incomplete (torn tail) or whose CRC does not match; return the valid payloads and the byte offset where new appends must start (the log is truncated there).</p>`,
    constraints: `Payload ≤ 1 MB. Treat a negative or too-large length as corruption. Single log segment in a ByteBuffer.`,
    example: `<p>Records "BEGIN T1", "PUT k=v", "COMMIT T1", then a crash cuts the 4th record in half → recovery returns ${H.c('g', '3 records, truncate at byte 60')} (12-byte header + 8, 7 and 9 payload bytes); the partial record is ${H.c('r', 'discarded')}, never applied.</p>`,
    brute: {
      why: `<p>Newline-delimited text records seem fine, but a torn final line looks like a valid (shorter) record, and a bit flip in the middle is accepted silently. Without a length and checksum there is no reliable end-of-log detection.</p>`,
      code: { lang: 'java', code: `class NaiveTextWal {
    static List<String> recover(String logContents) {
        // Every line is accepted — including a half-written last line after a crash.
        return Arrays.asList(logContents.split("\\n"));
    }

    public static void main(String[] args) {
        String disk = "BEGIN T1\\nPUT k=v\\nCOMMIT T1\\nPUT k2=v";   // last record torn: "v2" lost
        System.out.println(recover(disk));                          // happily replays "PUT k2=v"
    }
}` }
    },
    mcq: { q: 'Why include the length BEFORE the payload instead of a terminator byte?', options: ['The reader knows exactly how many bytes to expect, detects truncation, and needs no escaping of payload bytes', 'It is smaller', 'Terminators are illegal in binary files', 'To support compression'], answer: 0, explain: 'Length-prefix framing makes truncation detection trivial (fewer bytes remain than promised) and lets payloads contain any byte; the CRC covers corruption inside.' },
    hints: [
      `<p>Hint 1: writing = putInt(len), putLong(crc of payload), put(payload). Header is 12 bytes.</p>`,
      `<p>Hint 2: reading loop: if remaining &lt; 12 → stop; read len; if len &lt; 0 or len &gt; max or remaining &lt; len → stop; read payload; recompute CRC; mismatch → stop.</p>`,
      `<p>Hint 3: remember the position <i>before</i> each record; the last good end position is the truncation point.</p>`
    ],
    tests: { sig: 'string[] int int -> string[]', fn: 'walCheck', harness: { java: 'class Check {\n    static String esc(String s) {\n        StringBuilder b = new StringBuilder();\n        for (char c : s.toCharArray()) b.append(c > 126 ? String.format("\\\\u%04x", (int) c) : String.valueOf(c));\n        return b.toString();\n    }\n    static String[] walCheck(String[] recs, int trim, int flipAt) {\n        ByteBuffer disk = ByteBuffer.allocate(1 << 22);\n        for (String r : recs) WalFraming.append(disk, r);\n        byte[] a = Arrays.copyOf(disk.array(), disk.position() - trim);\n        if (flipAt >= 0 && flipAt < a.length) a[flipAt] ^= 0x55;\n        int[] cut = new int[1];\n        List<String> valid = WalFraming.recover(ByteBuffer.wrap(a), cut);\n        List<String> out = new ArrayList<>();\n        for (String v : valid) out.add(esc(v));\n        out.add("@" + cut[0]);\n        return out.toArray(new String[0]);\n    }\n}' }, cases: [
      [
        [
          ['BEGIN T1', 'PUT k=v', 'COMMIT T1', 'PUT k2=v2-long-value'],
          10,
          -1
        ],
        ['BEGIN T1', 'PUT k=v', 'COMMIT T1', '@60']
      ],
      [
        [
          ['BEGIN T1', 'PUT k=v', 'COMMIT T1', 'PUT k2=v2-long-value'],
          0,
          -1
        ],
        ['BEGIN T1', 'PUT k=v', 'COMMIT T1', 'PUT k2=v2-long-value', '@92']
      ],
      [
        [
          [],
          0,
          -1
        ],
        ['@0']
      ],
      [
        [
          ['BEGIN T1', 'PUT k=v', 'COMMIT T1', 'PUT k2=v2-long-value'],
          32,
          -1
        ],
        ['BEGIN T1', 'PUT k=v', 'COMMIT T1', '@60']
      ],
      [
        [
          ['BEGIN T1', 'PUT k=v', 'COMMIT T1', 'PUT k2=v2-long-value'],
          27,
          -1
        ],
        ['BEGIN T1', 'PUT k=v', 'COMMIT T1', '@60']
      ],
      [
        [
          ['BEGIN T1', 'PUT k=v', 'COMMIT T1', 'PUT k2=v2-long-value'],
          0,
          34
        ],
        ['BEGIN T1', '@20']
      ],
      [
        [
          ['BEGIN T1', 'PUT k=v', 'COMMIT T1', 'PUT k2=v2-long-value'],
          0,
          45
        ],
        ['BEGIN T1', 'PUT k=v', '@39']
      ],
      [
        [
          ['BEGIN T1', 'PUT k=v', 'COMMIT T1', 'PUT k2=v2-long-value'],
          0,
          20
        ],
        ['BEGIN T1', '@20']
      ],
      [
        [
          ['', 'x', ''],
          0,
          -1
        ],
        ['', 'x', '', '@37']
      ],
      [
        [
          ['héllo wörld', '日本語'],
          0,
          -1
        ],
        ['h\\u00e9llo w\\u00f6rld', '\\u65e5\\u672c\\u8a9e', '@46']
      ],
      [
        [
          ['a'],
          12,
          -1
        ],
        ['@0']
      ],
      [
        [
          { $rep: 'record-0001', n: 5000 },
          0,
          -1
        ],
        ['record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', 'record-0001', '@115000']
      ]
    ] },
    solution: {
      approach: `<p>Length-prefixed, checksummed records — the format used (with variations such as record types, LSNs and per-block headers) by RocksDB's WAL, Kafka's log segments, Postgres WAL pages and etcd's WAL. The scan is linear and stops at the first invalid record; everything after is discarded and overwritten by new appends.</p>`,
      code: { lang: 'java', code: `import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.zip.CRC32;

class WalFraming {
    static final int HEADER = 4 + 8;               // length + crc32
    static final int MAX_PAYLOAD = 1 << 20;

    static long crc(byte[] data) {
        CRC32 c = new CRC32();
        c.update(data, 0, data.length);
        return c.getValue();
    }

    static void append(ByteBuffer log, String record) {
        byte[] payload = record.getBytes(StandardCharsets.UTF_8);
        log.putInt(payload.length);
        log.putLong(crc(payload));
        log.put(payload);
    }

    /** Returns the valid payloads; result[0] of the int array is the truncation offset. */
    static List<String> recover(ByteBuffer log, int[] truncateAt) {
        List<String> out = new ArrayList<>();
        int goodEnd = log.position();
        while (log.remaining() >= HEADER) {
            int len = log.getInt();
            long expected = log.getLong();
            if (len < 0 || len > MAX_PAYLOAD || log.remaining() < len) break;   // torn tail
            byte[] payload = new byte[len];
            log.get(payload);
            if (crc(payload) != expected) break;                                  // corruption
            out.add(new String(payload, StandardCharsets.UTF_8));
            goodEnd = log.position();
        }
        truncateAt[0] = goodEnd;
        return out;
    }

    public static void main(String[] args) {
        ByteBuffer disk = ByteBuffer.allocate(256);
        for (String r : List.of("BEGIN T1", "PUT k=v", "COMMIT T1", "PUT k2=v2-long-value")) append(disk, r);
        int written = disk.position();
        ByteBuffer afterCrash = ByteBuffer.wrap(disk.array(), 0, written - 10);   // last record torn
        int[] cut = new int[1];
        List<String> valid = recover(afterCrash.slice(), cut);
        System.out.println(valid + " truncate at byte " + cut[0]);
    }
}` },
      complexity: `<p>O(log size) single sequential scan; O(1) extra memory besides the payload being checked.</p>`,
      followUps: ['Why do many WALs also store the LSN or a segment-id/sequence in each record or block header (hint: recycled segments contain stale but valid-looking records)?', 'How would you make appends crash-safe across segment file boundaries?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'Why does a slotted page keep a slot array instead of letting indexes point at byte offsets?', options: ['Records can be moved inside the page (compaction) by updating only the slot, so index entries (page, slot) stay valid', 'Slot arrays make pages smaller', 'Offsets cannot be stored in indexes', 'It is required for compression'], answer: 0, explain: 'The slot is a level of indirection: the RID names the slot, the slot names the current offset.' });
  quiz.push({ q: 'Default page sizes: SQLite, PostgreSQL, InnoDB?', options: ['4 KB, 8 KB, 16 KB', '8 KB, 8 KB, 8 KB', '16 KB, 4 KB, 8 KB', '1 MB, 64 KB, 16 KB'], answer: 0, explain: 'SQLite 4096 B (PRAGMA page_size), Postgres 8 KB (BLCKSZ), InnoDB 16 KB (innodb_page_size).' });
  quiz.push({ q: 'The buffer pool must evict a dirty page. What has to happen first?', options: ['The log records up to that page\'s pageLSN must be flushed (WAL rule), then the page is written', 'The transaction that dirtied it must commit', 'Nothing — just drop it', 'A checkpoint must finish'], answer: 0, explain: 'STEAL allows writing uncommitted pages, but only after the log describing the change is durable so it can be undone.' });
  quiz.push({ q: 'A nightly full-table scan evicts the hot working set in a plain-LRU cache. What does InnoDB do about it?', options: ['Inserts new pages at the midpoint (head of the old sublist) and promotes them only if re-accessed after innodb_old_blocks_time', 'Disables the cache during scans', 'Uses MRU for everything', 'Sends scans to the redo log'], answer: 0, explain: 'Midpoint insertion keeps one-off scan pages in the old sublist so they are evicted first.' });
  quiz.push({ q: 'In ARIES, which statement about the Redo pass is TRUE?', options: ['It repeats history for all transactions, including losers, applying a record only if pageLSN &lt; LSN', 'It redoes only committed transactions', 'It runs backward from the end of the log', 'It writes CLRs'], answer: 0, explain: 'Redo restores the exact pre-crash state; Undo then rolls back losers and writes CLRs.' });
  quiz.push({ q: 'What does a commit actually wait for in a WAL-based engine with full durability?', options: ['The COMMIT log record (and everything before it) to be fsynced', 'All dirty data pages to be written', 'A checkpoint', 'Replication to every replica in all cases'], answer: 0, explain: 'No-force: data pages are written later; durability comes from the log.' });
  quiz.push({ q: 'In an LSM-tree, a Delete(k) is implemented as…', options: ['Writing a tombstone for k that shadows older versions until compaction removes both', 'Finding and erasing k in its SSTable in place', 'Rebuilding all SSTables immediately', 'Removing k only from the Bloom filter'], answer: 0, explain: 'SSTables are immutable, so deletes are writes of a marker; space is reclaimed by compaction.' });
  quiz.push({ q: 'Leveled vs size-tiered compaction: which pairing is correct?', options: ['Leveled: lower space and read amplification, higher write amplification; tiered: the opposite', 'Leveled: lowest write amplification', 'Tiered: lowest read amplification', 'They have identical trade-offs'], answer: 0, explain: 'Leveled rewrites data ~T times per level but keeps one run per level; tiered rewrites once per tier but leaves many runs and needs ~2× space during merges.' });
  quiz.push({ q: 'With L1 = 256 MB and fanout 10, roughly how many levels hold 1 TB?', options: ['5', '3', '10', '1'], answer: 0, explain: '256 MB → 2.56 GB → 25.6 GB → 256 GB → 2.56 TB: the fifth level is the first big enough.' });
  quiz.push({ q: 'Why do Bloom filters matter so much for LSM point reads?', options: ['They let the engine skip SSTables that definitely do not contain the key, so a lookup costs ≈ 1 I/O instead of one per level', 'They compress SSTables', 'They make range scans faster', 'They replace the WAL'], answer: 0, explain: 'A negative answer is certain; with ~1% false positives, almost all non-matching files are skipped in RAM.' });
  quiz.push({ q: 'In InnoDB, a secondary index entry stores…', options: ['The indexed columns plus the primary key value', 'The physical page and slot of the row', 'The full row', 'Only a hash of the row'], answer: 0, explain: 'Because rows move inside the clustered B+tree on splits, secondary indexes refer to rows by primary key.' });
  quiz.push({ q: 'Why are random UUIDv4 primary keys costly in InnoDB?', options: ['Inserts land on random leaf pages, causing 50/50 splits (~70% fill), poor cache locality and larger secondary indexes', 'UUIDs cannot be indexed', 'They disable the redo log', 'They force table scans'], answer: 0, explain: 'Sequential or time-ordered keys (auto-increment, UUIDv7) append at the right edge and keep pages full.' });
  quiz.push({ q: 'Which technique lets a column store skip whole blocks for <code>WHERE day = \'2026-10-03\'</code> without a B-tree?', options: ['Zone maps (min/max per block)', 'Dictionary encoding', 'Doublewrite buffer', 'Clock-sweep'], answer: 0, explain: 'Blocks whose [min, max] range excludes the value are never read.' });
  quiz.push({ q: 'SQLite in WAL mode: what is a checkpoint?', options: ['Copying committed pages from the -wal file back into the main database file', 'Deleting the database', 'Flushing the OS page cache', 'A full backup'], answer: 0, explain: 'New page versions are appended to the WAL; checkpoints transfer them into the main file so the WAL can be reset.' });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({
    q: 'Walk me through what happens on disk when you INSERT one row and COMMIT in a B-tree engine like InnoDB or Postgres.', level: 'I',
    a: `<p><b>1.</b> The engine finds the target page (InnoDB: the clustered-index leaf for the PK; Postgres: a heap page with free space from the Free Space Map) and loads it into the <b>buffer pool</b> if needed. <b>2.</b> It appends a <b>WAL record</b> describing the change to the in-memory log buffer, then modifies the page in RAM (slot + tuple), stamping its pageLSN; the page is now <b>dirty</b>. Secondary indexes get the same treatment. <b>3.</b> On COMMIT, a commit record is appended and the log is <b>fsynced</b> up to it (often batched with other commits — group commit). The client gets OK. <b>4.</b> Later, background writers flush the dirty page (after the WAL covering it is durable), with a doublewrite or full-page image protecting against torn writes. <b>5.</b> A checkpoint eventually records that this page is clean so the old log can be recycled.</p>`,
    followUps: ['What changes if synchronous_commit = off?', 'Which step is the durability point?', 'What if the dirty page is evicted before COMMIT?']
  });
  interview.push({
    q: 'What is a slotted page and why do databases use it?', level: 'B',
    a: `<p>A slotted page is the standard layout for variable-length records: a <b>header</b> at the start, a <b>slot array</b> growing forward (each slot = offset + length of one record), and <b>records</b> growing backward from the end, with free space in between. Records are addressed by <b>RID = (page, slot)</b>. Benefits: variable-length rows fit naturally, deleting just marks a slot, and the engine can <b>compact</b> the page (slide records together to merge holes) while only rewriting slot offsets — indexes that store (page, slot) remain valid. Costs: ~4 bytes per slot, holes until compaction, and slots can be reused only after nothing references them (Postgres reclaims line pointers only after VACUUM cleans index entries).</p>`,
    followUps: ['How are rows bigger than a page stored?', 'What does fill factor do and when would you lower it?']
  });
  interview.push({
    q: 'Explain the buffer pool. How would you implement page replacement, and what is special compared to a generic LRU cache?', level: 'I',
    a: `<p>The buffer pool is an array of page-sized frames plus a <b>page table</b> (hash map page_id → frame). Each frame has a <b>pin count</b>, a <b>dirty bit</b> and recency info. Fetch: hit → pin and return; miss → pick a victim with pin count 0, write it back if dirty (respecting the WAL rule: log up to its pageLSN first), read the new page, pin it. Replacement: LRU via hash map + doubly linked list is O(1) but suffers from <b>sequential flooding</b> and global-lock contention, so real systems use variants: InnoDB's <b>midpoint insertion</b> (young/old sublists, promotion only after 1 s), Postgres's <b>clock-sweep</b> with usage counts plus <b>ring buffers</b> for big scans, or LRU-K/2Q/ARC. Database-specific needs: pinning, dirty write-back ordering with the WAL, flushing policy tied to checkpoints, and prefetch for scans — none of which a generic cache or <code>mmap</code> gives you.</p>`,
    followUps: ['Why not just rely on the OS page cache or mmap?', 'How do you size innodb_buffer_pool_size vs shared_buffers?', 'What is a page latch vs a lock?']
  });
  interview.push({
    q: 'State the WAL protocol rules and explain the STEAL / NO-FORCE terminology.', level: 'A',
    a: `<p><b>Rule 1 (undo / write-ahead):</b> a dirty page may be written to disk only after all log records up to its pageLSN are on disk. <b>Rule 2 (redo / commit):</b> a transaction is acknowledged only after all its log records, including COMMIT, are on disk. <b>STEAL</b> = the buffer manager may write pages containing uncommitted changes (frees memory; requires undo information in the log). <b>NO-FORCE</b> = committed transactions' pages need not be written at commit (makes commits cheap; requires redo). Steal + no-force is the highest-performance combination, and ARIES is designed around it. The opposite (no-steal + force) needs neither undo nor redo but forces random page writes at every commit and caps transaction size by memory.</p>`,
    followUps: ['Which combination does Postgres effectively use, given that its WAL is redo-only?', 'What breaks if a disk lies about fsync?']
  });
  interview.push({
    q: 'Walk through ARIES recovery on a small example.', level: 'A',
    a: `<p>Log: 1 T1 A 0→5, 2 T2 B 0→7, 3 T1 COMMIT, 4 T2 C 0→9, 5 T3 A 5→8, 6 T3 COMMIT, crash. Disk: B = 7 (pageLSN 2, stolen), others old. <b>Analysis:</b> scan from the last checkpoint, rebuild the dirty page table and transaction table → winners T1, T3; loser T2. <b>Redo:</b> from min recLSN, re-apply every UPDATE whose LSN &gt; the page's pageLSN: A = 5 (LSN 1), skip B (pageLSN 2 ≥ 2), C = 9 (LSN 4, a loser — history is repeated), A = 8 (LSN 5). <b>Undo:</b> roll back losers in descending LSN order: C ← 0 writing CLR 7 (undoNext = 2), B ← 0 writing CLR 8 (undoNext = none), then END T2. Result A = 8, B = 0, C = 0. CLRs make the process restartable: a crash during undo resumes from undoNext without undoing anything twice.</p>`,
    followUps: ['Why repeat history for losers instead of skipping them?', 'What do fuzzy checkpoints store and why are they "fuzzy"?', 'How long can recovery take and what bounds it?']
  });
  interview.push({
    q: 'Compare B-trees and LSM-trees. When would you choose each?', level: 'A',
    a: `<p><b>B-tree</b>: in-place updates of fixed-size pages; point reads ≈ 1 I/O, efficient range scans, steady latency; writes are random and amplified (a 100 B change rewrites a 16 KB page, plus doublewrite), pages ~70% full after random inserts. <b>LSM</b>: WAL + memtable, flushed to immutable sorted SSTables, merged by compaction; writes are sequential and cheap, compression is excellent and space is dense; reads check memtable + several runs (Bloom filters make point reads ≈ 1 I/O), range scans merge iterators across levels, and compaction can cause latency spikes and costs write amplification later. Choose <b>LSM</b> for write-heavy ingest (metrics, logs, events, messaging), huge data on SSD where space and flash endurance matter (MyRocks at Meta), and embedded KV in distributed databases (TiKV, CockroachDB/Pebble). Choose <b>B-tree</b> for read-heavy OLTP, many secondary indexes, range-heavy queries, strict p99. Quantify with the three amplifications for the actual workload.</p>`,
    followUps: ['What is the RUM conjecture?', 'How do LSMs handle range deletes and secondary indexes?', 'Name a design between the two (Bε-tree, Bw-tree).']
  });
  interview.push({
    q: 'Derive the write amplification of leveled vs size-tiered compaction.', level: 'E',
    a: `<p><b>Leveled</b>, fanout T, L levels: moving S bytes from level i to i+1 merges them with the ~T·S bytes of overlapping data below, writing ≈ (T + 1)·S. Every byte makes that move once per level, so WA ≈ T per level, ≈ T·L worst case (≈ T·L/2 on average, plus 1 for the WAL and 1 for the flush). With T = 10 and 5 levels, ~20–40 in theory, typically 10–30 observed. Space amplification ≈ 1 + 1/T (≈ 1.1) and one run per level to read. <b>Size-tiered</b>: when T runs of similar size exist, merge them into one run of T·S: each byte is rewritten once per tier, so WA ≈ number of tiers ≈ log<sub>T</sub>(N/flush size), but there can be up to T−1 runs per tier to read, and a full merge needs old and new copies at once (SA up to 2×). Hybrids ("lazy leveling", RocksDB universal + leveled bottom, Cassandra 5 UCS) tier the top and level the bottom.</p>`,
    followUps: ['How does level_compaction_dynamic_level_bytes change space amplification?', 'Given 50 MB/s ingest and WA 22, what disk bandwidth do you need?']
  });
  interview.push({
    q: 'Design a key-value storage engine for a write-heavy workload (e.g. 500k writes/s, 2 TB).', level: 'E',
    a: `<p><b>Write path:</b> client batches → WAL append with group commit (one fsync per batch) → concurrent skip-list memtable (64–256 MB); when full, freeze it and switch to a new one. <b>Flush:</b> background thread writes the immutable memtable as an SSTable: sorted, 16 KB compressed blocks, block index, Bloom filter (~10 bits/key), footer with checksum; then delete the WAL segment. <b>Compaction:</b> leveled (T = 10, dynamic level sizes) for steady reads and ~1.1 space amp, or tiered/hybrid if write bandwidth is the bottleneck; rate-limited, with subcompactions and write-stall thresholds on L0 count. <b>Reads:</b> memtable → immutable → L0 newest-first → one file per level, Bloom filters and a block cache; merging iterator for scans; snapshots via sequence numbers. <b>Deletes:</b> tombstones, range tombstones, TTL via compaction filter. <b>Sizing:</b> 500k × 200 B = 100 MB/s WAL; WA ~20 → ~2 GB/s compaction writes → needs several NVMe drives or sharding across nodes. <b>Recovery:</b> replay WAL into a memtable; SST files are immutable so they need no recovery beyond manifest replay.</p>`,
    followUps: ['How do you avoid write stalls during a burst?', 'How would you add transactions?', 'Where does the manifest (list of live SST files) live and how is it made crash-safe?']
  });
  interview.push({
    q: 'InnoDB vs MyRocks (RocksDB) — what are the trade-offs, and why did Meta migrate?', level: 'A',
    a: `<p>InnoDB: clustered B+tree, 16 KB pages, in-place updates with undo logs for MVCC, redo log + doublewrite; secondary indexes store the PK. Strengths: predictable read latency, mature tooling, gap locks for REPEATABLE READ. Weaknesses on flash at Meta's scale: fragmented pages (~50–70% full), weak page compression, high write amplification (full page rewrites + doublewrite). MyRocks: LSM with leveled compaction, per-level compression (LZ4 on top, Zstd at the bottom), dense immutable files, prefix Bloom filters. Meta reported roughly half the space of compressed InnoDB and far fewer bytes written to flash, enabling fewer servers and longer SSD life. Trade-offs: range scans across levels, no gap locks (different isolation semantics), compaction tuning and occasional stalls, unique-key checks require reads, smaller ecosystem.</p>`,
    followUps: ['Which workloads would you keep on InnoDB?', 'How does MyRocks implement secondary indexes?']
  });
  interview.push({
    q: 'Why is a UUID primary key often a bad idea in MySQL, and what would you use instead?', level: 'I',
    a: `<p>InnoDB stores the table <b>inside</b> the primary-key B+tree. Random UUIDv4 keys insert into random leaf pages: frequent 50/50 page splits leave pages ~70% full, every insert touches a different page (no hot right edge in the buffer pool), so the working set becomes the whole table, and redo/page-write volume rises. Every secondary index also stores the PK, so a 16-byte (or 36-char string!) key bloats them all. Better: <code>BIGINT AUTO_INCREMENT</code> for single-writer systems; <b>UUIDv7</b> (RFC 9562) or ULID when you need globally unique, client-generated IDs — they are time-ordered, so inserts append at the right edge — stored as <code>BINARY(16)</code>, not a string. In distributed SQL (Spanner, CockroachDB) monotonically increasing keys create a write hotspot on one range, so there the advice flips toward hashed or random prefixes.</p>`,
    followUps: ['What does the Postgres heap do differently with random UUID keys?', 'How would you migrate a 2 TB table off UUIDv4 keys?']
  });
  interview.push({
    q: 'How does a column store make analytical queries fast?', level: 'I',
    a: `<p>(1) <b>Columnar layout</b>: read only the columns a query touches — 2 of 50 columns means ~25× less I/O. (2) <b>Compression</b> per column: dictionary codes, RLE (great when sorted), bit-packing, delta/frame-of-reference, then LZ4/Zstd — typically 5–20×. (3) <b>Zone maps / min-max stats</b> per block skip data that cannot match, often 90%+ of blocks with a good sort key. (4) <b>Vectorized execution</b>: operators process batches of ~1–2K values in tight SIMD-friendly loops instead of row-at-a-time iterators; predicates evaluated on compressed codes; <b>late materialization</b> builds rows only for survivors. (5) Massive parallelism across cores and nodes. The costs: single-row lookups and updates are slow (immutable compressed segments), so writes go through delta stores or small parts that are merged in the background, much like LSM compaction.</p>`,
    followUps: ['How does ClickHouse MergeTree resemble an LSM?', 'What is the difference between Parquet and Arrow?', 'When does HTAP make sense?']
  });
  interview.push({
    q: 'What are torn pages and how do InnoDB and Postgres protect against them?', level: 'A',
    a: `<p>Database pages (8–16 KB) are larger than the unit the storage stack writes atomically (often 4 KB sectors/blocks). A crash mid-write can leave a <b>torn page</b>: part new, part old. Redo cannot fix it because physiological redo assumes a consistent page image. <b>Detection:</b> per-page checksums (InnoDB CRC32C, Postgres data checksums). <b>Repair:</b> InnoDB writes each flushed page first to the <b>doublewrite buffer</b> (sequentially, fsync), then in place; after a crash a torn in-place page is restored from the doublewrite copy and then redo applies. Postgres uses <b>full_page_writes</b>: the first modification of a page after each checkpoint logs the whole page image to WAL, so recovery starts from that image. Both can be disabled on storage that guarantees atomic page-size writes (some ZFS setups, certain cloud volumes, Aurora-style storage).</p>`,
    followUps: ['Why do full-page writes cause a WAL volume spike right after each checkpoint?', 'How do checksums help detect silent corruption on replicas?']
  });
  interview.push({
    q: 'Your Postgres or MySQL primary takes 25 minutes to recover after a crash. What determines recovery time and how do you reduce it?', level: 'E',
    a: `<p>Recovery time ≈ (amount of WAL/redo after the oldest dirty page's recLSN) ÷ replay speed, plus undo work for in-flight transactions (InnoDB rolls back in the background after opening). It grows with: very large <code>max_wal_size</code>/<code>checkpoint_timeout</code> (Postgres) or <code>innodb_redo_log_capacity</code> (InnoDB) that let checkpoints lag; heavy write bursts creating many dirty pages; slow, single-threaded replay of random page reads (pages not in cache). Fixes: checkpoint more frequently or set a smaller redo capacity (trading steady-state I/O), keep the dirty page ratio in check (adaptive flushing), use faster storage, enable WAL prefetch (Postgres <code>recovery_prefetch</code>), parallel redo (InnoDB applies redo in parallel), and avoid giant transactions. Architecturally: fail over to a hot standby (seconds) instead of waiting for crash recovery, or use storage that applies redo continuously (Aurora).</p>`,
    followUps: ['What is the trade-off between checkpoint frequency and write amplification?', 'How does a long-running transaction affect InnoDB rollback after restart?']
  });
  interview.push({
    q: 'In an LSM-based system, users report that deleted rows still use disk space and some range queries are slow. Explain and fix.', level: 'A',
    a: `<p>Deletes write <b>tombstones</b>; the old values and the tombstones remain until compaction merges them down to a level where nothing older can hide below (the bottom level). Until then they take space and range scans must step over them — a scan over a heavily deleted range may read thousands of tombstones to return a few live rows (Cassandra warns at 1,000 per query and fails at 100,000 by default). Fixes: use <b>range tombstones</b> / <code>DeleteRange</code> instead of millions of point deletes; trigger targeted compaction of the affected key range (RocksDB <code>CompactRange</code>, deletion-triggered compaction collectors); for time-based expiry use TTL via compaction filters or time-window/FIFO compaction so whole files are dropped; redesign queue-like access patterns (insert/delete churn) to time-bucketed partitions. In Cassandra, also respect <code>gc_grace_seconds</code> and run repairs so deleted data is not resurrected.</p>`,
    followUps: ['Why can a long-lived snapshot also keep deleted data alive?', 'How does space amplification differ between leveled and tiered here?']
  });

  /* ---------------- vary MCQ answer positions (deterministic rotation) ---------------- */
  function rotate(q, r) {
    if (!q || !q.options) return;
    var n = q.options.length;
    r = r % n;
    if (!r) return;
    q.options = q.options.slice(r).concat(q.options.slice(0, r));
    q.answer = (q.answer - r + n) % n;
  }
  quiz.forEach(function (q, i) { rotate(q, i * 2 + 1); });
  practice.forEach(function (p, i) { rotate(p.mcq, i + 2); });
  topics.forEach(function (t, i) { (t.problems || []).forEach(function (p, j) { rotate(p.mcq, i + j + 1); }); });

  registerModule({
    id: 'sql13',
    title: 'Storage Engines Internals',
    intro: `<p>Every SQL statement you have written so far ends up as <b>bytes on a disk</b>. This module opens the box: how rows are laid out in <b>pages</b> with slot arrays, how the <b>buffer pool</b> decides what stays in RAM, how the <b>write-ahead log</b> lets a database survive a power cut (the ARIES recovery idea, walked through by hand), and why there are two great families of engines — <b>B-trees</b> that update in place and <b>LSM-trees</b> that append and compact. You will do the <b>compaction math</b> (levels, write/read/space amplification), compare <b>InnoDB with RocksDB</b> (and see where Postgres fits), and finish with <b>column stores</b> that power every data warehouse.</p>
<p>These are the questions that separate senior candidates: "what does COMMIT actually do?", "design a storage engine for a write-heavy workload", "why did Meta move to MyRocks?", "why is a UUID primary key slow in MySQL?". Every topic comes with an analogy, a step-by-step visualizer, runnable SQLite and Python experiments, and design problems with numbers.</p>`,
    goals: [
      'Draw a slotted page, explain RIDs (page, slot), page compaction, overflow/TOAST and fill factor, and estimate a table\'s size in pages',
      'Explain the buffer pool (frames, page table, pins, dirty bits) and compare LRU, Clock, InnoDB midpoint insertion and Postgres ring buffers',
      'State the WAL rules, explain STEAL/NO-FORCE, and run ARIES Analysis → Redo → Undo (with CLRs) on a log by hand',
      'Describe the LSM write and read paths (WAL, memtable, SSTables, Bloom filters, tombstones) and choose B-tree vs LSM for a workload using amplification numbers',
      'Compute levels, write/read/space amplification and compaction bandwidth for leveled and size-tiered compaction',
      'Contrast InnoDB, RocksDB/MyRocks and PostgreSQL storage, and explain why column stores (dictionary/RLE encoding, zone maps, vectorized execution) win for analytics'
    ],
    prereqs: `SQL 10 (Index Internals — B+trees, clustered vs secondary indexes) and SQL 12 (Transactions, Isolation &amp; Concurrency Control — ACID, MVCC). Comfort with basic Python helps for the toy engines; DSA modules on hashing, linked lists (LRU) and heaps (k-way merge) are useful background.`,
    hours: 16,
    databases: { engine: DB_ENGINE, lab: DB_LAB },
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
