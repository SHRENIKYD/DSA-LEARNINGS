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
      input: 'mem=3 | 5 1 9 3 7 -3 2 8 4 6 | get 3 | get 7',
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
          why: `<p>The "brute force" is to deploy both engines and load-test them. That is the final answer in practice, but it costs days. A back-of-envelope model eliminates the hopeless option (the B-tree here is 13× over the device limit) in seconds, so you only benchmark the plausible designs.</p>`,
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
        solution: {
          approach: `<p>Recursive CTE generates level targets; aggregate the level count; derive WA and bandwidth. Five levels, WA ≈ 22, ≈ 880 MB/s of compaction writes: this workload needs several disks or nodes (or tiered/hybrid compaction) — a conclusion you can defend with numbers.</p>`,
          code: lab(`WITH RECURSIVE lv(level, target_mb, cum_mb) AS (
  SELECT 1, 256, 256
  UNION ALL
  SELECT level + 1, target_mb * 10, cum_mb + target_mb * 10 FROM lv WHERE cum_mb < 2097152
),
summary AS (SELECT MAX(level) AS levels FROM lv)
SELECT lv.level, lv.target_mb, lv.cum_mb,
       s.levels, 2 + 10 * (s.levels - 1) / 2.0 AS est_write_amp,
       40 * (2 + 10 * (s.levels - 1) / 2.0) AS compaction_write_mb_s
FROM lv CROSS JOIN summary s
ORDER BY lv.level;`),
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
        html: `<p>Inserting random UUIDs into a clustered index scatters writes across every leaf page: pages split 50/50 and settle near <b>~69% full</b>, the working set is the <i>whole</i> table (no hot right edge), and every secondary index stores the 16-byte PK. Auto-increment keys append at the right edge: pages fill to ~94% (InnoDB leaves 1/16 free), and only the last page is hot. Time-ordered <b>UUIDv7</b> (RFC 9562, 2024) or ULIDs give you global uniqueness <i>and</i> right-edge inserts. Run the Python sketch above to see ~100% vs ~69% fill.</p>`
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
<p><b>Where AI goes wrong:</b> saying "Postgres has a clustered index" (CLUSTER is a one-time reorder, not maintained), claiming RocksDB is a full SQL database, recommending the deprecated query cache or change buffer settings from old MySQL versions, or presenting MyRocks savings without the trade-offs.</p>
<p><b>What you must still own:</b> explaining why InnoDB secondary indexes store the PK, why UUIDv4 PKs hurt, what undo/purge and compaction each clean up, and when you would accept LSM read costs for space and write savings.</p>`,
    problems: [
      {
        title: 'Primary Key Choice and Page Fill in a Clustered Index',
        level: 'Medium', tags: ['InnoDB', 'clustered index', 'page split', 'simulation'], companies: ['Shopify', 'GitHub', 'Booking.com', 'PlanetScale'],
        statement: `<p>Simulate inserting <b>N</b> keys into B+tree leaf pages of capacity <b>C</b> using InnoDB's split rule: when a page overflows, split it 50/50 — <b>unless</b> the insert is at the far right end of the last page (sequential pattern), in which case keep the old page full and start a new page. Report pages, average fill and splits for auto-increment keys, random keys (UUIDv4) and time-ordered keys (UUIDv7).</p>`,
        constraints: `N ≤ 10<sup>5</sup>, 4 ≤ C ≤ 256. Inserts in the given order.`,
        example: `<p>N = 4000, C = 16 → auto-increment: ${H.c('g', '250 pages, ~100% full')}; UUIDv4: ${H.c('r', '~360 pages, ~69% full')}; UUIDv7: ${H.c('g', '~250 pages')}. Random keys need ~45% more pages, so more I/O and a bigger working set.</p>`,
        brute: {
          why: `<p>The naive estimate is pages = ⌈N / C⌉, assuming every page is full. It is exact for sequential keys and wrong by ~45% for random keys, because a 50/50 split leaves two half-full pages that only slowly fill up again. You must simulate (or know the ln 2 ≈ 69% result for random B-tree inserts).</p>`,
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
<p><b>Writes</b> are handled LSM-style: new rows land in a row-oriented <b>delta store</b> or small "parts", which background merges convert into big compressed column segments (ClickHouse MergeTree, Vertica WOS→ROS, SQL Server columnstore delta rowgroups, C-Store's WS→RS).</p>`,
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
  registerModule({ id: 'sql13', title: 'Storage Engines Internals', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, databases: { engine: DB_ENGINE, lab: DB_LAB }, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
