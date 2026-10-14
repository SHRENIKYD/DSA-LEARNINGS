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
-- delete half the rows: pages become partly or fully empty
DELETE FROM notes WHERE id % 2 = 0;
SELECT freelist_count AS free_pages_after_delete FROM pragma_freelist_count();
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
            snap('<b>Insert ' + name + '</b> (' + len + ' units): bytes go at the <b>end</b> of free space (offset ' + fe + '), and ' + (reuse >= 0 ? 'a <b>reused</b> slot s' + si + ' (no new slot needed)' : 'a new slot s' + si + ' is appended at the front') + '. Its RID is <b>(page, ' + si + ')</b>.', { cells: cl, slot: si, cls: 'cur' });
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
        solution: {
          approach: `<p>Turn the page anatomy into arithmetic. Usable bytes, per-row bytes, floor division, ceiling division. Writing it as a CTE keeps each assumption visible and easy to tweak (try fillfactor 100, or a 16 KB InnoDB page).</p>`,
          code: lab(`WITH params AS (
  SELECT 20000000 AS n_rows, 96 AS data_bytes, 8192 AS page_size, 24 AS page_hdr,
         24 AS tuple_hdr, 4 AS line_ptr, 90 AS fillfactor
), calc AS (
  SELECT n_rows, page_size,
         (page_size - page_hdr) * fillfactor / 100 AS usable,
         tuple_hdr + data_bytes + line_ptr       AS per_row
  FROM params
)
SELECT usable, per_row,
       usable / per_row                                        AS rows_per_page,
       (n_rows + usable / per_row - 1) / (usable / per_row)    AS pages,
       ((n_rows + usable / per_row - 1) / (usable / per_row)) * page_size / 1048576 AS size_mb
FROM calc;`),
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
  registerModule({ id: 'sql13', title: 'Storage Engines Internals', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, databases: { engine: DB_ENGINE, lab: DB_LAB }, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
