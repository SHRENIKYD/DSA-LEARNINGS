(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers for the visualizers in this module ---------- */
  function num(s, def) { var n = Number(s); return isNaN(n) || s === '' || s === null ? def : n; }
  function kv(str) {
    var out = {};
    String(str || '').trim().split(/[\s,]+/).forEach(function (tok) {
      var p = tok.split('=');
      if (p.length === 2 && p[0]) out[p[0].toLowerCase()] = p[1];
    });
    return out;
  }
  function nums(str, maxN, hint) {
    var t = String(str || '').trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
    if (!t.length || t.some(isNaN)) throw new Error(hint);
    if (t.length > maxN) throw new Error('Use at most ' + maxN + ' numbers');
    return t;
  }
  function r1(x) { return Math.round(x * 10) / 10; }
  function words(s) { return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function (w) { return w; }); }

  /* ================= TOPIC 1: BLOB / OBJECT STORAGE ================= */
  topics.push({
    title: 'Blob / Object Storage (S3-style): Photos, Videos and Backups',
    analogy: `<p>A normal hard drive is a <b>filing cabinet with folders</b>: you open a drawer, walk into a folder, edit a page in the middle of a file. An object store is a <b>giant left-luggage office</b> at a train station. You hand over a bag (the file), get a <b>ticket</b> (the key, like <code>photos/2026/asha/beach.jpg</code>), and later hand the ticket back to get the <b>whole bag</b>. You can't reach inside and swap one sock — you replace the entire bag. In exchange, the office is almost unlimited in size, keeps every bag in several rooms at once so a flood in one room loses nothing, and never slows down however many bags arrive.</p>`,
    explain: `<p><b>Object storage</b> (Amazon S3, Google Cloud Storage, Azure Blob, MinIO) stores big, unstructured things — photos, videos, PDFs, backups, logs, ML datasets — as <b>objects</b>. An object has three parts:</p>
      ${H.table(['Part', 'What it is', 'Example'], [
        ['Key', 'A unique name inside a <b>bucket</b>. The namespace is flat — the "/" is just a character, folders are an illusion.', '<code>photos/2026/asha/beach.jpg</code>'],
        ['Data (the blob)', 'The bytes. Immutable: you can overwrite the whole object, never edit a middle chunk.', '2.4 MB of JPEG'],
        ['Metadata', 'System fields (size, ETag, content-type, created time) plus your own tags.', '<code>owner=asha, content-type=image/jpeg</code>']
      ])}
      <p><b>Why not just use a database?</b> A database is built for small rows you query and update. Putting 5&nbsp;MB images inside it bloats backups, wastes expensive RAM and disk IOPS, and makes replication slow. The standard pattern: <b>bytes go to the object store, the database keeps only the key and a few fields</b> (user, caption, <code>photo_key</code>).</p>
      <p><b>The three kinds of storage — pick by access pattern:</b></p>
      ${H.table(['', 'Block (EBS, SAN)', 'File (NFS, EFS)', 'Object (S3)'], [
        ['Looks like', 'A raw disk', 'A shared folder tree', 'Bucket + key → blob via HTTP API'],
        ['Edit in the middle?', H.c('g', 'Yes'), H.c('g', 'Yes'), H.c('r', 'No — replace whole object')],
        ['Scale', 'One VM at a time', 'Thousands of clients, limited', H.c('g', 'Practically unlimited')],
        ['Latency', 'Sub-millisecond', 'Milliseconds', 'Tens of milliseconds (first byte)'],
        ['Cost per GB', 'High', 'Medium', H.c('g', 'Lowest')],
        ['Best for', 'Databases, boot disks', 'Shared home dirs, legacy apps', 'Media, backups, data lakes, static sites']
      ])}
      <p><b>How it works inside (simplified):</b> a <b>front-end API fleet</b> authenticates you and routes the request. A <b>metadata service</b> (a sharded, replicated key-value store) maps <code>bucket+key → where the bytes live + version + size</code>. A fleet of <b>data nodes</b> actually holds the bytes. For durability each object is either <b>copied 3 times</b> in different racks/zones or cut into pieces with <b>erasure coding</b> (e.g. 6 data + 3 parity shards: any 6 of the 9 rebuild the object, only 1.5× storage instead of 3×).</p>
      <p><b>Big files and flaky networks: multipart upload.</b> Uploading a 2&nbsp;GB video in one HTTP request is fragile — one dropped packet at 99% means starting over. Instead: (1) <b>initiate</b> → get an <code>uploadId</code>; (2) upload <b>parts</b> (5&nbsp;MB–5&nbsp;GB each, up to 10,000 parts) <b>in parallel</b>, each returns an <b>ETag</b> (a checksum); a failed part is simply retried; (3) <b>complete</b> by sending the list of (partNumber, ETag). Only then does the object appear. Parts that never complete cost money, so a lifecycle rule aborts stale uploads.</p>
      <p><b>Never stream big uploads through your app servers.</b> Your server hands the client a <b>pre-signed URL</b> — a time-limited link that lets the client PUT directly to the bucket. Your servers stay small and cheap; the storage fleet absorbs the bandwidth.</p>
      <p><b>Other features interviewers expect:</b> <b>versioning</b> (undo deletes/overwrites), <b>storage classes</b> (hot → infrequent → archive, moved by <b>lifecycle rules</b>), <b>event notifications</b> (new object → queue → thumbnail worker), <b>CDN in front</b> for reads, <b>encryption at rest</b> (SSE-S3/KMS), <b>replication across regions</b>.</p>`,
    clues: [
      '"store photos / videos / documents / backups" → object storage, not the database',
      '"upload a 5 GB video", "resume interrupted uploads", "unreliable mobile network" → multipart upload + pre-signed URLs',
      '"11 nines of durability", "never lose a file" → replication across zones or erasure coding',
      '"users upload directly" / "don\'t overload app servers" → pre-signed URL, bypass the app tier',
      '"old data rarely read, keep costs low" → storage classes + lifecycle policy (hot → cold → archive)',
      '"generate thumbnails after upload" → object-created event → queue → worker',
      '"serve images worldwide with low latency" → CDN in front of the bucket'
    ],
    code: [
      { lang: 'python', run: true, title: 'Multipart upload simulator: split, retry a flaky part, build the S3-style final ETag', code: `import hashlib

def split_parts(data: bytes, part_size: int):
    """Cut the file into numbered parts, exactly like a multipart upload does."""
    return [(n + 1, data[i:i + part_size]) for n, i in enumerate(range(0, len(data), part_size))]

def upload_parts(parts, flaky_part=None):
    """Upload each part; the 'flaky' part fails once and is retried (only that part)."""
    etags, attempts = {}, {}
    for number, body in parts:
        attempts[number] = 0
        while True:
            attempts[number] += 1
            if number == flaky_part and attempts[number] == 1:
                print(f"  part {number}: network error, retrying only this part")
                continue
            etags[number] = hashlib.md5(body).digest()   # server returns a checksum (ETag) per part
            print(f"  part {number}: {len(body):>3} bytes uploaded, etag={etags[number].hex()[:8]}")
            break
    return etags, attempts

def complete(etags):
    """S3 style: final ETag = md5(concat of part md5s) + '-' + number_of_parts."""
    combined = hashlib.md5(b"".join(etags[n] for n in sorted(etags))).hexdigest()
    return f"{combined}-{len(etags)}"

file_bytes = bytes(range(256)) * 1          # a pretend 256-byte "video"
parts = split_parts(file_bytes, 100)         # real S3: parts are 5 MB or more
print("parts:", [(n, len(b)) for n, b in parts])
etags, attempts = upload_parts(parts, flaky_part=2)
print("attempts per part:", attempts)
print("object ETag:", complete(etags))` },
      { lang: 'json', title: 'Lifecycle policy: tier down, expire, and abort half-finished multipart uploads', code: `{
  "Rules": [
    {
      "ID": "photos-tiering",
      "Status": "Enabled",
      "Filter": { "Prefix": "photos/originals/" },
      "Transitions": [
        { "Days": 30,  "StorageClass": "STANDARD_IA" },
        { "Days": 180, "StorageClass": "GLACIER" }
      ]
    },
    {
      "ID": "abort-stale-multipart",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 2 }
    },
    {
      "ID": "expire-temp",
      "Status": "Enabled",
      "Filter": { "Prefix": "tmp/" },
      "Expiration": { "Days": 7 }
    }
  ]
}` },
      { lang: 'http', check: false, title: 'Pre-signed URL flow (the client talks to storage directly)', code: `# 1) Client asks YOUR API for permission to upload
POST /v1/photos/upload-url
{"filename": "beach.jpg", "contentType": "image/jpeg", "sizeBytes": 2400000}

# 2) Your API checks auth + quota, creates a DB row (status=PENDING), signs a URL
HTTP/1.1 200 OK
{"photoId": "p_881", "uploadUrl": "https://photos-bucket.s3.amazonaws.com/u_77/p_881.jpg?X-Amz-Expires=900&X-Amz-Signature=...", "expiresInSec": 900}

# 3) Client uploads the bytes straight to the bucket (your servers never see them)
PUT https://photos-bucket.s3.amazonaws.com/u_77/p_881.jpg?X-Amz-...
Content-Type: image/jpeg

# 4) Bucket emits an ObjectCreated event -> queue -> worker makes thumbnails, marks row READY` }
    ],
    codeTitle: ['Multipart upload simulator (runs in your browser)', 'S3 lifecycle policy', 'Pre-signed upload flow'],
    viz: {
      title: 'Multipart upload: split, upload in parts, retry one, complete',
      input: 'size=100 part=25 fail=3',
      inputLabel: 'size = MB, part = MB per part, fail = part number that fails once (0 = none)',
      gen: function (input) {
        var o = kv(input), size = num(o.size, 100), part = num(o.part, 25), fail = num(o.fail, 0);
        if (size < 1 || part < 1 || size > 5000) throw new Error('Format: size=100 part=25 fail=3  (size 1-5000 MB, part >= 1 MB)');
        var n = Math.ceil(size / part);
        if (n > 12) throw new Error('That makes ' + n + ' parts - use at most 12 (make part= bigger)');
        var sizes = [], i;
        for (i = 0; i < n; i++) sizes.push(Math.min(part, size - i * part));
        var st = sizes.map(function () { return 'pending'; });
        var etag = function (k) { return ((k + 3) * 7919 % 65521).toString(16); };
        function hlOf() { var h = {}; for (var k = 0; k < n; k++) { h[k] = st[k] === 'ok' ? 'ok' : st[k] === 'cur' ? 'cur' : st[k] === 'bad' ? 'bad' : ''; } return h; }
        function graph(hn, he, tags) {
          return { type: 'graph', label: 'Where the bytes travel', directed: true, height: 52, nodes: [
            { id: 'C', label: 'Client (phone)', x: 11, y: 26, shape: 'box', w: 16 },
            { id: 'API', label: 'S3 front-end API', x: 42, y: 26, shape: 'box', w: 18 },
            { id: 'META', label: 'Metadata index', x: 80, y: 8, shape: 'box', w: 18 },
            { id: 'DATA', label: 'Data nodes (copies / shards)', x: 78, y: 42, shape: 'box', w: 26 }
          ], edges: [['C', 'API'], ['API', 'DATA'], ['API', 'META']], hl: hn || {}, ehl: he || {}, tags: tags || {} };
        }
        var frames = [];
        frames.push({ narr: 'A <b>' + size + ' MB</b> file is too big to send in one request. We cut it into <b>' + n + ' parts</b> of up to ' + part + ' MB. Each box below is one part (value = MB).', parts: [
          { type: 'array', label: 'Parts of the file (MB)', values: sizes, showIdx: true, idxLabels: sizes.map(function (_, k) { return 'part ' + (k + 1); }) }, graph()] });
        frames.push({ narr: '<b>Step 1 - Initiate.</b> The client says "I want to upload <code>beach.mp4</code> in parts". The API creates an upload session and returns an <b>uploadId</b>. Nothing is visible in the bucket yet.', parts: [
          { type: 'array', label: 'Parts of the file (MB)', values: sizes, showIdx: true }, graph({ API: 'cur' }, { 'C-API': 'ok' }, { API: 'uploadId=u-42' }),
          { type: 'vars', vals: { uploadId: 'u-42', parts: n, status: 'in progress' } }] });
        var failed = false;
        for (i = 0; i < n; i++) {
          st[i] = 'cur';
          if (fail === i + 1 && !failed) {
            st[i] = 'bad';
            frames.push({ narr: '<b>Part ' + (i + 1) + ' fails</b> (a network blip). With a single big upload we would restart from zero. Here only this one <span class="c-r">' + sizes[i] + ' MB</span> part is retried.', parts: [
              { type: 'array', label: 'Parts of the file (MB)', values: sizes, hl: hlOf(), showIdx: true }, graph({ C: 'bad' }, { 'C-API': 'bad' }, { C: 'timeout' }),
              { type: 'vars', vals: { retrying: 'part ' + (i + 1), 'parts done': st.filter(function (x) { return x === 'ok'; }).length }, hl: { retrying: 'bad' } }] });
            failed = true; st[i] = 'cur';
          }
          var done = st.filter(function (x) { return x === 'ok'; }).length;
          frames.push({ narr: '<b>Step 2 - Upload part ' + (i + 1) + '</b> (' + sizes[i] + ' MB)' + (failed && fail === i + 1 ? ' - the retry' : '') + '. The API stores the bytes on data nodes and answers with an <b>ETag</b> (a checksum). Parts can go in <i>parallel</i> in real life; we show them one by one.', parts: [
            { type: 'array', label: 'Parts of the file (MB)', values: sizes, hl: hlOf(), showIdx: true }, graph({ API: 'cur', DATA: 'ok' }, { 'C-API': 'cur', 'API-DATA': 'ok' }, { DATA: 'part ' + (i + 1) }),
            { type: 'vars', vals: { part: i + 1, etag: etag(i), 'parts done': done + 1 + '/' + n }, hl: { etag: 'ok' } }] });
          st[i] = 'ok';
        }
        var rows = sizes.map(function (s, k) { return [k + 1, s + ' MB', etag(k)]; });
        frames.push({ narr: '<b>Step 3 - Complete.</b> The client sends the list of (part number, ETag). The API checks every part exists and matches, stitches them into <b>one object</b>, and writes a single row into the metadata index. <span class="c-g">Only now</span> can anyone read the file.', parts: [
          { type: 'array', label: 'Parts of the file (MB)', values: sizes, hl: hlOf(), showIdx: true }, graph({ API: 'cur', META: 'ok' }, { 'C-API': 'cur', 'API-META': 'ok' }, { META: 'key -> parts' }),
          { type: 'table', label: 'Manifest sent in "complete"', columns: ['partNumber', 'size', 'ETag'], rows: rows }] });
        frames.push({ narr: 'Done. The object is durable (copies or erasure-coded shards in several zones) and readable by key. If the client had never called complete, a <b>lifecycle rule</b> would abort the upload after a few days so you stop paying for orphan parts.', parts: [
          { type: 'array', label: 'Final object', values: [size], hl: { 0: 'sel' }, idxLabels: ['beach.mp4 (' + size + ' MB)'] },
          { type: 'table', label: 'Metadata row', columns: ['key', 'size', 'parts', 'class', 'durability'], rows: [['videos/beach.mp4', size + ' MB', n, 'STANDARD', '3 zones, 11 nines']], hl: { 0: 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Why erasure coding beats 3 copies', html: `<p>You store 1&nbsp;PB of photos. With <b>3 full copies</b> you need ${H.c('r', '3 PB')} of disks and survive losing any 2 copies. With <b>erasure coding 6+3</b> every object is cut into 6 data pieces + 3 parity pieces (9 total), each on a different rack. Any 6 of the 9 rebuild the object, so you survive <b>any 3 failures</b> and use only 9/6 = ${H.c('g', '1.5 PB')}.</p>
        ${H.table(['Scheme', 'Storage used for 1 PB', 'Failures survived', 'Trade-off'], [['3 copies', '3.0 PB', '2', 'Fast reads and repairs, simple'], ['Erasure 6+3', '1.5 PB', '3', 'Rebuilding costs CPU and network (read 6 pieces)'], ['Erasure 10+4', '1.4 PB', '4', 'Cheaper still, slower repair, big stripes']])}
        <p>Real systems often mix: new hot objects as 3 copies (fast), older ones converted to erasure-coded layout (cheap).</p>` },
      { title: 'Cost of storage classes (the lifecycle story)', html: `<p>A photo app has 500&nbsp;TB. 90% of photos older than 6 months are almost never opened. Illustrative prices per GB-month: Standard ${H.c('b', '$0.023')}, Infrequent-Access ${H.c('b', '$0.0125')}, Glacier ${H.c('b', '$0.004')}.</p>
        ${H.table(['Plan', 'Monthly cost (approx.)'], [['All 500 TB in Standard', '500,000 GB x $0.023 = ' + H.c('r', '$11,500')], ['50 TB Standard + 150 TB IA + 300 TB Glacier', '1,150 + 1,875 + 1,200 = ' + H.c('g', '$4,225')]])}
        <p>A lifecycle rule ("after 30 days to IA, after 180 days to Glacier") saves ~63% with <b>zero code</b>. The catch: archive tiers charge per retrieval and can take minutes to hours, so never archive things users open daily.</p>` },
      { title: 'Why not put the key prefix as the date?', html: `<p>Object stores shard by key prefix. If every key starts with <code>2026-10-15/...</code>, all of today's uploads land on <b>one partition</b> - a <span class="c-r">hot prefix</span> that throttles at roughly a few thousand requests per second. Fix: put a high-cardinality part first, e.g. <code>u_77/2026-10-15/p_881.jpg</code> or a hash prefix <code>a3/p_881.jpg</code>. Modern S3 scales per prefix automatically, but spreading load across many prefixes is still the safe interview answer.</p>`,
        code: { lang: 'python', run: true, title: 'Spread keys across prefixes with a short hash', code: `import hashlib

def object_key(user_id: str, photo_id: str) -> str:
    # first 2 hex chars of the hash give 256 evenly used prefixes
    prefix = hashlib.sha1(photo_id.encode()).hexdigest()[:2]
    return f"{prefix}/{user_id}/{photo_id}.jpg"

for p in ["p_881", "p_882", "p_883"]:
    print(object_key("u_77", p))` } },
      { title: 'Resumable uploads for a phone on a train', html: `<p>The app slices a 1.2&nbsp;GB video into 8&nbsp;MB parts (150 parts) and keeps a local list of finished part numbers. Train enters a tunnel at part 63. When signal returns, the app asks the API <code>ListParts(uploadId)</code>, sees parts 1-62 are stored, and continues from part 63. The user lost 8&nbsp;MB of progress, not 500&nbsp;MB. This is also how you upload from many threads: parts 1-4 go in parallel, finishing in about a quarter of the time on a fast link.</p>` }
    ],
    deepDive: `<p><b>Durability vs availability.</b> "11 nines of durability" (99.999999999%) means: store 10 million objects and expect to lose one every ~10,000 years. That comes from copies/erasure shards in at least 3 zones <b>plus</b> background <b>scrubbing</b> (continuously re-reading data and checksums to catch silent bit-rot) and <b>fast re-replication</b> when a disk dies. Availability (can I read it right now?) is lower, around 99.99%. Do not confuse them.</p>
      <p><b>Consistency.</b> Early S3 had eventual consistency for overwrites and listings; since late 2020 S3 offers <b>strong read-after-write consistency</b> for PUT, DELETE and LIST. Under the hood this needs the metadata layer to be a strongly consistent replicated store (Paxos/Raft-style), with a cache-coherence protocol in front of it. Object stores still have <b>no multi-object transactions</b> - you cannot atomically rename a "folder" of 1M objects; a rename is copy + delete per object.</p>
      <p><b>Small-files problem.</b> Per-object overhead (metadata row, request cost, minimum billing size) makes millions of 1&nbsp;KB objects wasteful and slow. Pack them into larger files (tar, Parquet, a log-structured "needle" format as in Facebook's Haystack) and keep an offset index. Haystack's insight: photo reads were slow because each needed several disk seeks for filesystem metadata; one big append-only file plus an in-memory index gives one seek per read.</p>
      <p><b>Dedup and content addressing.</b> Name objects by their hash (<code>sha256/ab/cd/abcd...</code>) and identical files are stored once (Git, Docker image layers, backup tools). Costs: reference counting for safe deletion, and a privacy side-channel if deduping across users.</p>
      <p><b>Security.</b> Buckets private by default; pre-signed URLs with short expiry; scope them to one key and one HTTP method; validate content-type and size server-side via signed conditions; encrypt at rest (SSE-KMS, per-object data keys wrapped by a master key); block public ACLs; log access. Anti-virus scan uploads <b>before</b> marking them READY.</p>
      <p><b>Reads at scale.</b> Put a CDN in front (cache by URL); serve resized variants (<code>?w=400</code>) generated once and stored, instead of resizing on every request; use range requests (<code>Range: bytes=...</code>) for video seeking; for hot objects use object-store caches close to compute. <b>Egress bandwidth</b> is usually the biggest bill, not storage.</p>`,
    aiEra: `<p><b>What AI changes:</b> object storage is now the home of <b>training data, embeddings snapshots and model checkpoints</b>. A fine-tuning job reads terabytes of images or text shards straight from the bucket, so throughput per prefix, parallel range reads and data locality matter more than ever. Vector databases keep their cold segments in object storage too. Photo apps run <b>AI on upload</b>: the ObjectCreated event triggers captioning, face grouping, NSFW checks and embedding generation, and the results (tags, vectors) go into a search index, not into the object.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Given 200M photos a day at 3 MB each, estimate storage per year for 3 copies vs 6+3 erasure coding and the monthly bill under three storage-class mixes"</code> and check the arithmetic yourself. Ask it to draft a lifecycle policy, then audit every rule: wrong prefixes silently archive hot data.</p>
      <p><b>Where AI goes wrong:</b> it happily suggests "store the image as a BLOB in Postgres", proxies uploads through the app server, forgets multipart/abort-incomplete rules, or writes a bucket policy that is accidentally public. It can also invent S3 limits - verify numbers against the provider docs.</p>
      <p><b>What you must still own:</b> the access pattern analysis (hot vs cold), the security model of presigned URLs, durability vs cost trade-offs, and the failure story (what happens if the client dies at part 63?).</p>`,
    after: `<p><b>Remember:</b> bytes in the object store, pointers in the database, clients upload directly with pre-signed URLs, big files go multipart, cold data moves down tiers by lifecycle rules, and a CDN serves the reads.</p>`,
    problems: [{
      title: 'Design Photo Storage on S3 (like Google Photos / Instagram uploads)',
      level: 'Medium', tags: ['object storage', 'S3', 'multipart', 'CDN', 'HLD'], companies: ['Google', 'Meta', 'Dropbox'],
      statement: `<p>Design the storage and upload path for a photo-sharing app with <b>50M daily active users</b>. Each user uploads on average 2 photos a day (avg 3&nbsp;MB, some videos up to 2&nbsp;GB). Users view photos far more than they upload (read:write about 50:1). Photos must <b>never be lost</b>, thumbnails must appear within seconds, and storage cost must stay sane over 5 years.</p>`,
      constraints: `50M DAU; 100M uploads/day; avg 3 MB; videos up to 2 GB; users on flaky mobile networks; global audience; durability matters more than anything else; read latency under 200 ms with a CDN.`,
      example: `<p>Estimate: 100M uploads/day x 3 MB = <b>300 TB/day</b> ≈ 110 PB/year raw. Upload QPS ≈ 100M / 86,400 ≈ <b>1,150/s</b> average, ~3,500/s at peak. Reads: 50x = ~58,000 req/s average. That is why the <span class="c-g">bytes cannot touch the app servers or the database</span>.</p>`,
      brute: { why: `<p>Naive design: the mobile app POSTs the file to an app server, which saves it as a BLOB column (or on its local disk) and also serves it back. It breaks everywhere: 300 TB/day through app servers saturates network and CPU; a DB with 100 PB of BLOBs cannot be backed up, replicated or cached sensibly; local disks die and photos are lost; one failed 2 GB upload restarts from zero; every view hits the origin, so the bill and latency explode.</p>` },
      mcq: { q: 'Where should the 3 MB photo bytes travel on upload?', options: ['Phone -> app server -> database BLOB', 'Phone -> pre-signed URL -> object store directly; app stores only metadata', 'Phone -> message queue -> app server disk', 'Phone -> CDN -> app server'], answer: 1, explain: 'Direct-to-object-store uploads keep heavy bytes off your stateless app tier; the app only issues a short-lived signed URL and records metadata.' },
      hints: [`<p>Hint 1: Separate <b>bytes</b> from <b>metadata</b>. Which system is built for each?</p>`, `<p>Hint 2: Think pre-signed URLs, multipart for big files, an ObjectCreated event feeding a queue and thumbnail workers, and a CDN for reads.</p>`, `<p>Hint 3: Cover lifecycle tiers, deletes (soft-delete + versioning), idempotent completion, virus scan, and what the DB row states are (PENDING, READY, FAILED).</p>`],
      solution: {
        approach: `<p><b>Write path.</b> (1) Client calls <code>POST /photos/upload-url</code> with size and type. The API authenticates, checks quota, inserts a row <code>photo(id, user_id, key, status=PENDING)</code> and returns a pre-signed PUT URL (or, for files over ~8&nbsp;MB, an <code>uploadId</code> plus pre-signed part URLs for <b>multipart</b>). (2) The phone uploads straight to the bucket in parallel parts, retrying only failed parts and resuming with ListParts. (3) The bucket emits an <b>ObjectCreated</b> event to a queue (SQS/Kafka). Workers virus-scan, strip EXIF location if needed, generate thumbnails (200/800/1600 px) and a video transcode ladder, extract AI tags/embeddings, then flip the row to READY. The workers are idempotent (key + version as the idempotency key) so redelivery is harmless.</p>
          <p><b>Storage layout.</b> Keys like <code>{hash2}/{userId}/{photoId}/orig.jpg</code> spread across prefixes. Originals in Standard, a lifecycle rule moves them to Infrequent-Access after 30 days and to an archive tier after a year while thumbnails stay hot. Versioning plus a 30-day soft delete protects against accidental or malicious deletes; cross-region replication of originals protects against a regional disaster. Durability comes from the store (multi-zone copies or erasure coding), we never rely on single disks.</p>
          <p><b>Read path.</b> The feed API returns photo metadata with CDN URLs of the right thumbnail size; the CDN (with long Cache-Control since keys are immutable) serves ~95% of traffic, and misses go to the bucket via an origin shield. Private photos use short-lived signed CDN URLs. Metadata lives in a sharded database (by user id); counters and feeds sit in cache.</p>
          <p><b>Trade-offs.</b> Direct upload means a second round trip but saves servers; a PENDING row without an object is cleaned by a janitor job; eventual thumbnail availability is fine because the client shows a local preview. Bottleneck check: 58k reads/s are CDN hits, ~3.5k writes/s peak are spread across prefixes, the DB only sees small metadata rows.</p>`,
        complexity: `<p>Storage ≈ 110 PB/yr raw; with erasure coding ~1.5x = 165 PB, versus 330 PB with 3 copies. Upload path is O(parts) requests per file; app servers handle only ~3.5k small JSON calls/s at peak.</p>`,
        followUps: ['How would you deduplicate identical photos uploaded by many users?', 'How do you delete a user\'s data for GDPR, including backups and CDN caches?', 'How would you add "search my photos by what is in them"?']
      }
    }]
  });

  /* ================= TOPIC 2: SEARCH ENGINES ================= */
  topics.push({
    title: 'Search Engines: Inverted Index, Ranking and Elasticsearch',
    analogy: `<p>Open a thick cookbook. To find every recipe that uses "saffron" you could read all 800 pages (slow) - or flip to the <b>index at the back</b>: <i>saffron: pages 12, 87, 301</i>. That back-of-the-book index is an <b>inverted index</b>: instead of "page -> words on it" it stores "<b>word -> pages that contain it</b>". A search engine is that index, built for billions of pages, split across many machines, plus a smart way to put the most useful pages first.</p>`,
    explain: `<p>A normal database index helps you find a row when you know the <b>exact value</b> (<code>WHERE email = 'a@b.com'</code>). It is bad at "find products whose description mentions <i>waterproof</i> and <i>hiking</i>, tolerate typos, rank by relevance". <code>LIKE '%waterproof%'</code> scans every row. A <b>search engine</b> solves this with an <b>inverted index</b>.</p>
      <p><b>Building it, step by step:</b></p>
      <ol>
        <li><b>Analyze</b> each document's text: lowercase, split into <b>tokens</b>, drop stop-words ("the", "a"), <b>stem</b> ("running" -> "run") so related forms match.</li>
        <li>For each token, add this document's id to the token's <b>postings list</b> (a sorted list of doc ids, often with positions and counts).</li>
        <li>Keep the <b>term dictionary</b> (all unique terms, sorted) so lookups are fast.</li>
      </ol>
      ${H.table(['doc', 'text'], [['1', 'red running shoes'], ['2', 'blue running socks'], ['3', 'red wool socks']])}
      ${H.table(['term', 'postings list (doc ids)'], [['red', '1, 3'], ['running', '1, 2'], ['shoes', '1'], ['blue', '2'], ['socks', '2, 3'], ['wool', '3']])}
      <p><b>Querying:</b> "red socks" -> fetch postings of <code>red</code> = [1,3] and <code>socks</code> = [2,3]. For AND, <b>intersect</b> two sorted lists with two pointers in O(a+b): result [3]. For OR, merge: [1,2,3]. No document is scanned; cost depends on the postings you touch, not on the corpus size.</p>
      <p><b>Ranking.</b> Which of 10,000 matches goes first? Classic answer <b>TF-IDF</b>: a word counts more if it appears <b>often in this document</b> (term frequency) and is <b>rare across all documents</b> (inverse document frequency - "waterproof" tells you more than "product"). Modern engines use <b>BM25</b>, a smarter TF-IDF that saturates repeated words and normalizes by document length. Real product search then blends relevance with business signals: popularity, margin, stock, personalization, recency - often via a learning-to-rank model.</p>
      <p><b>Elasticsearch / OpenSearch / Solr</b> wrap this in a distributed system. Elasticsearch is built on <b>Lucene</b>:</p>
      ${H.table(['Concept', 'Meaning'], [
        ['Index', 'A collection of documents (like a table), e.g. <code>products</code>'],
        ['Document', 'A JSON object (one product)'],
        ['Shard', 'A slice of an index; each is a self-contained Lucene index. Docs are routed by <code>hash(id) % number_of_primary_shards</code>'],
        ['Replica', 'A copy of a shard on another node: survives node loss and serves reads in parallel'],
        ['Segment', 'Immutable files inside a shard. New docs go into a small in-memory buffer, <b>refresh</b> (about every 1 s) makes them searchable as a new segment, background <b>merges</b> combine segments, deletes are just marks until a merge'],
        ['Query flow', 'A request hits any node (coordinator) -> fans out to one copy of every shard -> each returns its top-N -> coordinator merges and returns the global top-N (scatter-gather)']
      ])}
      <p><b>Important truth:</b> a search engine is a <b>secondary index</b>, not your source of truth. The primary database holds the real product row; changes flow to the search index (via CDC/Kafka or a dual write with a fixer job). Search results can lag by seconds - that is <b>near real-time</b> search, and it is fine for catalogues.</p>
      <p><b>Beyond keywords (2026 reality):</b> engines now store <b>vectors (embeddings)</b> next to text. <b>Hybrid search</b> = BM25 keyword score + vector similarity (ANN index such as HNSW), fused with Reciprocal Rank Fusion. Keywords catch exact SKUs and brand names; vectors catch meaning ("shoes for rainy hikes" matches "waterproof trail boots").</p>`,
    clues: [
      '"search by keyword", "full-text search", "typo tolerance / fuzzy" -> inverted index (Elasticsearch / OpenSearch / Solr)',
      '"autocomplete / type-ahead on product names" -> edge n-grams or a completion suggester (and see the trie case study)',
      '"filter by brand, price range, rating + facets/counts" -> search engine with filters and aggregations',
      '"LIKE \'%word%\' is too slow" -> that is a full scan; you need an inverted index',
      '"rank by relevance" -> TF-IDF / BM25, then business boosts or learning-to-rank',
      '"keep search in sync with the main database" -> change-data-capture / Kafka pipeline, eventual consistency, reindex job',
      '"search by meaning", "semantic search", "find similar" -> embeddings + ANN, usually hybrid with BM25'
    ],
    code: [
      { lang: 'python', run: true, title: 'A tiny search engine: tokenizer, inverted index, AND query, TF-IDF ranking', code: `import math
from collections import defaultdict

STOP = {"the", "a", "an", "and", "of", "for"}

def analyze(text):
    """Lowercase, split on non-letters, drop stop words, naive stemming."""
    tokens = []
    for w in "".join(c if c.isalnum() else " " for c in text.lower()).split():
        if w in STOP:
            continue
        if w.endswith("ing") and len(w) > 5:
            w = w[:-3]                      # running -> runn (toy stemmer, real ones are smarter)
        tokens.append(w)
    return tokens

def build_index(docs):
    index = defaultdict(dict)               # term -> {doc_id: term_frequency}
    for doc_id, text in docs.items():
        for t in analyze(text):
            index[t][doc_id] = index[t].get(doc_id, 0) + 1
    return index

def search(index, n_docs, query):
    terms = analyze(query)
    if not terms:
        return []
    # AND semantics: intersect the postings lists, smallest list first
    lists = sorted((set(index.get(t, {})) for t in terms), key=len)
    matches = set.intersection(*lists)
    scores = {}
    for d in matches:
        s = 0.0
        for t in terms:
            idf = math.log(1 + n_docs / len(index[t]))   # rare words weigh more
            s += index[t][d] * idf
        scores[d] = round(s, 3)
    return sorted(scores.items(), key=lambda kv: -kv[1])

docs = {
    1: "Red running shoes for men",
    2: "Blue running socks",
    3: "Red wool socks",
    4: "Waterproof hiking shoes, red and grey",
}
idx = build_index(docs)
for term in sorted(idx):
    print(f"{term:12} -> {sorted(idx[term])}")
print("query 'red shoes' ->", search(idx, len(docs), "red shoes"))
print("query 'socks'     ->", search(idx, len(docs), "socks"))` },
      { lang: 'json', title: 'Elasticsearch: index mapping for an e-commerce catalogue', code: `{
  "settings": {
    "number_of_shards": 5,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "autocomplete": { "tokenizer": "edge_ngram_tok", "filter": ["lowercase"] }
      },
      "tokenizer": {
        "edge_ngram_tok": { "type": "edge_ngram", "min_gram": 2, "max_gram": 15, "token_chars": ["letter", "digit"] }
      }
    }
  },
  "mappings": {
    "properties": {
      "title":       { "type": "text", "analyzer": "english", "fields": { "ac": { "type": "text", "analyzer": "autocomplete", "search_analyzer": "standard" } } },
      "description": { "type": "text", "analyzer": "english" },
      "brand":       { "type": "keyword" },
      "category":    { "type": "keyword" },
      "price":       { "type": "scaled_float", "scaling_factor": 100 },
      "rating":      { "type": "half_float" },
      "in_stock":    { "type": "boolean" },
      "sales_30d":   { "type": "integer" },
      "embedding":   { "type": "dense_vector", "dims": 384, "index": true, "similarity": "cosine" }
    }
  }
}` },
      { lang: 'json', title: 'Elasticsearch: query with fuzzy text, filters, boost and facets', code: `{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "must": [
            { "multi_match": { "query": "waterproof hikng shoes", "fields": ["title^3", "description"], "fuzziness": "AUTO" } }
          ],
          "filter": [
            { "term": { "in_stock": true } },
            { "range": { "price": { "lte": 150 } } },
            { "term": { "category": "footwear" } }
          ]
        }
      },
      "field_value_factor": { "field": "sales_30d", "modifier": "log1p", "factor": 0.2 },
      "boost_mode": "sum"
    }
  },
  "aggs": {
    "brands": { "terms": { "field": "brand", "size": 10 } },
    "price_ranges": { "range": { "field": "price", "ranges": [ { "to": 50 }, { "from": 50, "to": 100 }, { "from": 100 } ] } }
  },
  "size": 20
}` }
    ],
    codeTitle: ['Toy search engine (runs in your browser)', 'Elasticsearch mapping', 'Elasticsearch search request'],
    viz: {
      title: 'Build an inverted index from documents, then answer a query',
      input: 'red running shoes|blue running socks|red wool socks ? red socks',
      inputLabel: 'documents separated by |  then ?  then the query words (max 6 docs)',
      gen: function (input) {
        var parts = String(input).split('?'), docsRaw = parts[0].split('|').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
        var qterms = words(parts[1] || '');
        if (!docsRaw.length || docsRaw.length > 6) throw new Error('Give 1-6 documents separated by |, then ? and query words. Example: red shoes|blue socks ? red socks');
        if (qterms.length > 4) throw new Error('Use at most 4 query words');
        var index = {}, order = [], frames = [], d;
        var docRows = docsRaw.map(function (t, i) { return [i + 1, t]; });
        function entries(sorted) {
          var keys = order.slice(); if (sorted) keys.sort();
          return keys.map(function (k) { return [k, '[' + index[k].join(', ') + ']']; });
        }
        frames.push({ narr: 'We have <b>' + docsRaw.length + ' documents</b>. A scan-everything search would read all of them for every query. Instead we build an <b>inverted index</b>: for every word, the list of documents that contain it.', parts: [
          { type: 'table', label: 'Documents', columns: ['docId', 'text'], rows: docRows }, { type: 'map', label: 'Inverted index (empty)', entries: [] }] });
        for (d = 0; d < docsRaw.length; d++) {
          var toks = words(docsRaw[d]), hl = {}, seenHere = {};
          toks.forEach(function (t) {
            if (seenHere[t]) return; seenHere[t] = 1;
            if (!index[t]) { index[t] = []; order.push(t); hl[t] = 'ok'; } else hl[t] = 'cur';
            index[t].push(d + 1);
          });
          frames.push({ narr: '<b>Index doc ' + (d + 1) + '</b>: "' + H.esc(docsRaw[d]) + '". Tokens: ' + toks.map(function (t) { return '<code>' + t + '</code>'; }).join(' ') + '. New words get a fresh entry (<span class="c-g">green</span>); words seen before just append this doc id to their postings (<span class="c-y">amber</span>).', parts: [
            { type: 'table', label: 'Documents', columns: ['docId', 'text'], rows: docRows, hl: (function () { var h = {}; h[d] = 'cur'; return h; })() },
            { type: 'map', label: 'Inverted index: term -> postings list', entries: entries(false), hl: hl }] });
        }
        frames.push({ narr: 'The index is finished. We keep the terms <b>sorted</b> (the term dictionary) so a word can be found by binary search or a prefix tree (an FST in Lucene). Postings lists are also sorted, which makes merging fast.', parts: [
          { type: 'map', label: 'Term dictionary (sorted) -> postings', entries: entries(true) }] });
        if (qterms.length) {
          var N = docsRaw.length, lists = [], i;
          qterms.forEach(function (t) { lists.push(index[t] || []); });
          frames.push({ narr: '<b>Query:</b> ' + qterms.map(function (t) { return '<code>' + t + '</code>'; }).join(' AND ') + '. Look up each word in the dictionary and fetch its postings list. We never open the documents themselves.', parts:
            [{ type: 'map', label: 'Term dictionary', entries: entries(true), hl: (function () { var h = {}; qterms.forEach(function (t) { h[t] = 'sel'; }); return h; })() }].concat(lists.map(function (l, k) { return { type: 'array', label: 'postings of "' + qterms[k] + '"', values: l.length ? l : ['(none)'] }; })) });
          var inter = lists[0].slice();
          for (i = 1; i < lists.length; i++) inter = inter.filter(function (x) { return lists[i].indexOf(x) >= 0; });
          frames.push({ narr: '<b>Intersect</b> the postings lists (two sorted lists walked with two pointers, O(a+b)). Docs in <i>every</i> list match: ' + (inter.length ? '<b>' + inter.join(', ') + '</b>' : '<span class="c-r">none</span>') + '.', parts: lists.map(function (l, k) {
            var h = {}; l.forEach(function (x, j) { if (inter.indexOf(x) >= 0) h[j] = 'ok'; });
            return { type: 'array', label: 'postings of "' + qterms[k] + '"', values: l.length ? l : ['(none)'], hl: h };
          }).concat([{ type: 'array', label: 'AND result', values: inter.length ? inter : ['(no match)'], hl: inter.length ? (function () { var h = {}; inter.forEach(function (x, j) { h[j] = 'sel'; }); return h; })() : {} }]) });
          var rows = inter.map(function (id) {
            var s = 0, why = [];
            qterms.forEach(function (t) {
              var tf = words(docsRaw[id - 1]).filter(function (w) { return w === t; }).length;
              var idf = Math.log(1 + N / index[t].length); s += tf * idf; why.push(t + ': tf ' + tf + ' x idf ' + (Math.round(idf * 100) / 100));
            });
            return [id, why.join(' + '), Math.round(s * 100) / 100];
          }).sort(function (a, b) { return b[2] - a[2]; });
          frames.push({ narr: '<b>Rank</b> the matches. Score = sum of (term frequency x inverse document frequency). A word found in few documents (rare) is worth more than one found everywhere. Highest score is shown first.', parts: [
            { type: 'table', label: 'Ranked results', columns: ['docId', 'score parts', 'score'], rows: rows.length ? rows : [['-', 'no document contains all query words', 0]], hl: rows.length ? { 0: 'sel' } : {} }] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'Why LIKE \'%x%\' dies and the inverted index does not', html: `<p>Catalogue of <b>20M products</b>. <code>WHERE description LIKE '%waterproof%'</code> must read all 20M descriptions: seconds to minutes, and the plan can't use a normal B-tree. The inverted index finds the term "waterproof" in the dictionary in microseconds and reads its postings list (say 300,000 ids). Cost = size of the postings touched, not 20M. For a multi-word AND query the engine starts from the <b>shortest</b> list and skips ahead in the longer ones (skip pointers), so even a 10M-entry list is mostly jumped over.</p>` },
      { title: 'Scatter-gather across shards', html: `<p>Index <code>products</code> has 5 primary shards, each with 1 replica (10 shard copies on 6 nodes). Query "red shoes" arrives at node A (coordinator). A forwards the query to one copy of each shard (it load-balances between primary and replica). Each shard searches its own inverted index and returns its <b>top 20 (docId, score)</b>. A merges 5x20 = 100 candidates into the global top 20, then does a second small "fetch" phase to pull the stored fields for just those 20 docs. <span class="c-r">Deep paging</span> (<code>from: 100000</code>) is expensive because every shard must return 100,020 candidates - use <code>search_after</code> instead.</p>` },
      { title: 'Keeping the index fresh: DB -> Kafka -> Elasticsearch', html: `<p>Sellers edit prices all day. Flow: product service writes to <b>PostgreSQL</b> (source of truth) in a transaction -> a CDC tool (Debezium) reads the WAL and publishes change events to <b>Kafka</b> -> an indexer consumes in batches and calls the <b>bulk API</b> -> after the 1-second refresh the change is searchable. Each event carries a <b>version</b> (e.g. the row's updated_at or LSN) so Elasticsearch uses <code>version_type=external</code> and ignores stale, out-of-order updates. If the indexer is down for an hour, Kafka retains the events - it catches up. A nightly <b>reindex to a new index + alias swap</b> repairs any drift.</p>` },
      { title: 'Autocomplete with edge n-grams', html: `<p>At index time the title "waterproof" is also stored as the tokens <code>wa, wat, wate, water, ...</code> (edge n-grams of length 2-15). At query time the user's partial text "wat" is looked up as one normal term - an O(1) dictionary hit, no prefix scan. Cost: a bigger index (roughly 2-3x for that field). For top suggestions by popularity use a separate small <b>completion suggester</b> or a trie service fed by search logs.</p>` }
    ],
    deepDive: `<p><b>Lucene internals.</b> A shard = many immutable <b>segments</b>. Each segment has a sorted term dictionary (an FST - finite state transducer - compresses it into RAM), postings compressed with frame-of-reference / delta encoding (store gaps between doc ids: 1001, 1003, 1010 -> 1001, +2, +7 and pack in few bits), optional positions (for phrase queries "red shoes" as adjacent words), doc values (a column store used for sorting and aggregations) and stored fields. Immutability gives lock-free reads, OS page-cache friendliness and trivial caching; the price is <b>write amplification</b> from merges and deletes that only take effect at merge time.</p>
      <p><b>Write path:</b> doc -> in-memory buffer + <b>translog</b> (write-ahead log fsynced for durability) -> <b>refresh</b> (~1 s) writes a new searchable segment -> <b>flush</b> commits segments and truncates the translog -> background merge policy (tiered) combines small segments. Heavy bulk loads: raise <code>refresh_interval</code> to 30 s or -1, use bulk requests of 5-15 MB, then restore.</p>
      <p><b>BM25.</b> score(term, doc) = IDF x (tf x (k1+1)) / (tf + k1 x (1 - b + b x docLen/avgDocLen)). Defaults k1 = 1.2, b = 0.75. Intuition: the 10th occurrence of a word adds less than the 2nd (saturation), and a long document needs more mentions than a short one to score the same. <b>Note:</b> each shard computes IDF from its <i>own</i> statistics unless you use <code>dfs_query_then_fetch</code>; on small indexes with many shards this skews ranking.</p>
      <p><b>Sizing shards.</b> Too many tiny shards waste heap (each shard has fixed overhead) and slow queries via fan-out; too few huge shards make recovery and merges slow. Rule of thumb: <b>10-50 GB per shard</b>, a few hundred shards per node at most. The number of primary shards is fixed at index creation (re-sharding means reindex/split), which is why time-based data uses one index per day/month plus rollover. Hot-warm-cold tiers and searchable snapshots on object storage keep old data cheap.</p>
      <p><b>Consistency and failure.</b> Writes go to the primary then replicate in parallel to in-sync replicas. Search is eventually consistent (refresh delay). A split brain is prevented by a quorum-based master election. Mappings are mostly immutable: you cannot change a field's type, you reindex. <b>Dynamic mapping</b> on user-controlled field names causes a "mapping explosion" - lock it down. Also never use Elasticsearch as the only store of critical data.</p>
      <p><b>Relevance engineering</b> is a product: synonyms ("sneakers" = "trainers"), spell correction, query understanding (brand detection, category intent), field boosts (title^3), recency/popularity decay, and A/B tests with metrics like click-through, add-to-cart and zero-result rate. Learning-to-rank (LambdaMART or neural rankers) re-orders the top 100-500 candidates in a second stage because a heavy model cannot run on millions of docs.</p>`,
    aiEra: `<p><b>What AI changes:</b> search moved from "match words" to "match meaning". Embedding models turn queries and products into vectors; an ANN index (HNSW, IVF-PQ) finds nearest neighbours in milliseconds. Production stacks are <b>hybrid</b>: BM25 and vector retrieval run in parallel, scores are fused (RRF), and a cross-encoder or LLM <b>reranker</b> sorts the top 50. Conversational shopping ("something warm for a trip to Oslo in March under 8000") uses an LLM to turn the sentence into filters plus a semantic query. RAG (retrieval-augmented generation) for chatbots is simply search with an LLM on the end - the quality of your index decides the quality of the answer.</p>
      <p><b>Use AI as a partner:</b> have it generate 200 realistic test queries with typos and synonyms, label obviously relevant results to bootstrap an evaluation set, draft analyzers/synonym lists, and explain why a document ranked high using <code>_explain</code> output. Ask <code>"Design hybrid search for 20M products: components, latency budget per stage, how to evaluate"</code> and then challenge each number.</p>
      <p><b>Where AI goes wrong:</b> it suggests <code>wildcard</code> or <code>LIKE</code> queries for search, picks 1 shard (or 100) with no reasoning, forgets the sync pipeline from the database, and treats vector search as a drop-in replacement for exact filters (SKUs, sizes, stock). LLM rerankers add latency and cost per query and can hallucinate relevance - measure with offline metrics (NDCG, recall@k) and online A/B tests.</p>
      <p><b>What you must still own:</b> the data pipeline (freshness, ordering, backfills), shard/replica sizing, evaluation methodology, and the latency/cost budget across retrieval, filtering and reranking.</p>`,
    problems: [{
      title: 'Build Search for an E-commerce Catalogue (20M products)',
      level: 'Medium', tags: ['search', 'Elasticsearch', 'inverted index', 'CDC', 'ranking'], companies: ['Amazon', 'Flipkart', 'Walmart'],
      statement: `<p>Design search for an online store with <b>20M products</b>, <b>30,000 search queries/second at peak</b> and 1M product updates a day (price, stock, new items). Users expect results in under <b>200 ms</b>, typo tolerance, filters (brand, price, rating, in-stock) with counts, autocomplete as they type, and sensible ranking (relevance + popularity). Updates should be visible within a few seconds.</p>`,
      constraints: `20M docs of ~2 KB (≈ 40 GB of source); 30k QPS peak; p99 < 200 ms; index freshness ≤ 10 s; the SQL product database must not be hammered by search traffic.`,
      example: `<p>Query: <code>"waterproof hikng shoes"</code> with filter price ≤ 150, in-stock. The engine fixes "hikng" (fuzzy), matches "waterproof" + "hiking" + "shoes" in title (boosted) and description, filters by price/stock, boosts best-sellers, returns the top 20 plus brand counts. <span class="c-g">No SQL query runs at search time.</span></p>`,
      brute: { why: `<p>Naive design: <code>SELECT * FROM products WHERE title LIKE '%hiking%' AND description LIKE '%waterproof%'</code> on the main database. Leading wildcards can't use B-tree indexes, so each query scans 20M rows; at 30k QPS the OLTP database collapses and checkout slows too. There is no typo tolerance, no relevance order, and facet counts need a separate GROUP BY scan.</p>` },
      mcq: { q: 'What is the best way to keep the search index updated when a seller changes a price?', options: ['Search service queries the SQL DB on every request', 'Write to the DB, stream the change (CDC -> Kafka) to an indexer that updates the search index with a version number', 'Rebuild the whole index every hour', 'Store prices only in the search index'], answer: 1, explain: 'The DB stays the source of truth; an async pipeline updates the secondary index within seconds, and versions prevent out-of-order updates from overwriting newer data.' },
      hints: [`<p>Hint 1: You need a structure that maps <b>word -> products</b>, not product -> words. What is it called?</p>`, `<p>Hint 2: Size it: 40 GB of source fits in a handful of shards; QPS decides the number of replicas. Think scatter-gather and how replicas add read throughput.</p>`, `<p>Hint 3: Cover the sync pipeline, mappings (text vs keyword), autocomplete, ranking blend, caching of popular queries, and how to deploy a new analyzer without downtime (reindex + alias swap).</p>`],
      solution: {
        approach: `<p><b>Components.</b> Product service + <b>PostgreSQL</b> (source of truth) -> <b>Debezium CDC -> Kafka</b> -> <b>indexer workers</b> -> <b>Elasticsearch/OpenSearch cluster</b>. A <b>search API</b> sits in front: it parses the query (spell hints, brand/category detection), builds the ES request, applies filters, calls ES, optionally reranks the top ~100 with a learning-to-rank service, and returns results plus facet counts. A CDN/edge cache and an in-process cache hold the results of the hottest queries for 30-60 s.</p>
          <p><b>Index design.</b> One index <code>products_v7</code> behind alias <code>products</code>. 40 GB of source ≈ 80-100 GB indexed; use <b>5 primary shards</b> (≈ 20 GB each, inside the 10-50 GB rule). 30k QPS with ~10 ms per shard search needs about 30k x 5 shard-queries = 150k shard-queries/s; a replica factor of 3 spread over 12-15 data nodes gives headroom and survives node loss. Fields: <code>title</code> and <code>description</code> as analyzed text (title boosted x3, with a sub-field of edge n-grams for autocomplete), <code>brand</code>/<code>category</code> as keyword (exact filters, aggregations), <code>price</code>, <code>rating</code>, <code>in_stock</code>, <code>sales_30d</code> as numeric doc-values, optional <code>embedding</code> for hybrid semantic search.</p>
          <p><b>Ranking.</b> BM25 on title^3 + description, fuzziness AUTO, filters in <code>filter</code> context (cached, no scoring), then add <code>log(1+sales_30d)</code>, rating and an in-stock boost; later a second-stage LTR model trained on click and purchase logs. Facets via aggregations on keyword fields. Autocomplete uses the n-gram field (or a completion suggester) with prefix ranking by popularity.</p>
          <p><b>Freshness and reliability.</b> Each change event carries the row version; the indexer uses bulk requests with external versioning so late events can't overwrite newer ones; end-to-end lag is Kafka latency + 1 s refresh ≈ 2-5 s. For schema/analyzer changes: build <code>products_v8</code> from the DB or a Kafka replay, verify, then flip the alias atomically. If the whole search cluster fails, degrade gracefully to cached results or a category-browse page rather than hitting SQL.</p>`,
        complexity: `<p>Query cost ≈ O(size of touched postings) per shard, with fan-out to 5 shards in parallel, so latency ≈ slowest shard + merge ≈ 20-60 ms. Memory: dictionaries (FST) in heap/page cache; keep the hot index in RAM across the nodes. Indexing throughput 1M updates/day ≈ 12/s average, trivial for bulk indexing.</p>`,
        followUps: ['How would you add "did you mean" spelling correction?', 'How do you A/B test a new ranking function safely?', 'How would you make search results personalized without exploding cache hit rates?']
      }
    }]
  });

  /* ================= TOPIC 3: TIME-SERIES DATABASES ================= */
  topics.push({
    title: 'Time-Series Databases: Metrics, IoT and Downsampling',
    analogy: `<p>Think of a <b>hospital heart monitor</b>. Every second it writes one more number at the end of a never-ending paper strip. Nobody goes back to edit the number from 3:02:07 yesterday. Doctors ask questions like "show me the last 10 minutes" or "what was the average pulse each hour this week?" After a month the hospital doesn't keep every second - it keeps one summary line per hour (average, highest, lowest) and throws away the original strip to save room. A time-series database is that strip: <b>append at the end, read by time range, summarize old data, delete the very old</b>.</p>`,
    explain: `<p>A <b>time-series</b> is a sequence of (timestamp, value) points about something that changes over time: CPU usage, a sensor's temperature, a stock price, requests per second. A <b>time-series database (TSDB)</b> is built for this workload: <b>massive append-only writes, queries by time range, and automatic lifecycle</b> (summarize, expire).</p>
      <p><b>Data model.</b> One point = <code>metric name + tags (labels) + timestamp + value(s)</code>.</p>
      ${H.table(['metric', 'tags', 'timestamp', 'value'], [['temperature', 'device=d42, room=lab, city=pune', '2026-10-15T10:00:00Z', '23.4'], ['temperature', 'device=d42, room=lab, city=pune', '2026-10-15T10:00:10Z', '23.5'], ['cpu_usage', 'host=web-3, region=eu', '2026-10-15T10:00:10Z', '71.2']])}
      <p>The unique combination (metric + all tag values) is one <b>series</b>. "Give me temperature for device d42 from 10:00 to 11:00" reads <b>one contiguous run</b> of one series - very fast when data is stored sorted by series then time.</p>
      <p><b>Why a normal SQL table struggles:</b> 1 million sensors reporting every 10 seconds is <b>100,000 inserts per second</b>, 8.6 billion rows a day. A B-tree index updated on each insert causes random disk writes and endless page splits. Updates and deletes of single rows are rare, yet a general database pays for them anyway.</p>
      <p><b>How a TSDB is built differently:</b></p>
      <ul>
        <li><b>Write path:</b> points go to an in-memory buffer + a write-ahead log, then are flushed as immutable, time-partitioned blocks (like an LSM tree; Prometheus makes a block every 2 hours). Writes are sequential, never in place.</li>
        <li><b>Compression:</b> timestamps arrive at regular steps, so store the <b>delta of deltas</b> (almost always 0) and XOR consecutive floats - Facebook's <b>Gorilla</b> paper reached about 1.4 bytes per point instead of 16.</li>
        <li><b>Partition by time:</b> dropping data older than 90 days = delete a whole partition/file (instant), not millions of row deletes.</li>
        <li><b>Retention + downsampling:</b> keep raw points for 7 days, 1-minute rollups for 90 days, 1-hour rollups for 2 years.</li>
        <li><b>Query engine:</b> group-by-time-bucket (<code>avg(cpu) GROUP BY 5m</code>), rates (<code>rate(requests[5m])</code>), gap filling, percentiles.</li>
      </ul>
      <p><b>Downsampling</b> means replacing many points with one summary per time bucket. Store <b>several aggregates</b> - count, sum, min, max, avg - not only the average. An average can hide a short, dangerous spike (a 3-second CPU peak); the max keeps it visible. (Percentiles can't be averaged, so keep histograms/sketches such as t-digest or DDSketch if you need rollup p99.)</p>
      <p><b>The big enemy: high cardinality.</b> Every unique tag combination is a new series with its own index entry and memory. Tags like <code>region</code> (10 values) are fine; <code>user_id</code> or <code>request_id</code> (millions of values) creates millions of series and kills the index. Rule: <b>tags = bounded sets used to filter/group; unbounded identifiers belong in logs/traces or as a field value.</b></p>
      <p><b>Popular choices:</b> <b>Prometheus</b> (pull-based monitoring, local storage, PromQL), <b>InfluxDB</b>, <b>TimescaleDB</b> (PostgreSQL extension: hypertables auto-partitioned by time, continuous aggregates; you keep SQL and joins), <b>VictoriaMetrics/Mimir/Thanos/M3</b> (long-term, clustered Prometheus storage), and analytical engines like <b>ClickHouse</b> or <b>Druid</b> for event-style time data with huge cardinality.</p>`,
    clues: [
      '"millions of devices send a reading every few seconds" / "IoT sensor data" -> time-series database + Kafka/MQTT ingestion',
      '"metrics and monitoring dashboards", "alert when CPU > 90% for 5 minutes" -> Prometheus-style TSDB',
      '"keep raw data 7 days, summaries for a year" -> retention policy + downsampling / continuous aggregates',
      '"query last 15 minutes, average per minute" -> time-bucket aggregation over a time-range scan',
      '"write-heavy, append-only, rarely updated" -> LSM/append-only blocks, not a B-tree OLTP table',
      '"tag by user id" -> RED FLAG: cardinality explosion; move the id out of the tags',
      '"late or out-of-order sensor data" -> need an out-of-order write window / backfill support'
    ],
    code: [
      { lang: 'python', run: true, title: 'Downsample raw points into 1-minute rollups (count, min, max, avg)', code: `from collections import defaultdict

def downsample(points, bucket_seconds):
    """points: list of (unix_ts, value). Returns one summary row per time bucket."""
    buckets = defaultdict(list)
    for ts, v in points:
        bucket_start = ts - (ts % bucket_seconds)       # floor the timestamp to the bucket
        buckets[bucket_start].append(v)
    rows = []
    for start in sorted(buckets):
        vals = buckets[start]
        rows.append({
            "bucket": start, "count": len(vals),
            "min": min(vals), "max": max(vals),
            "avg": round(sum(vals) / len(vals), 2),
        })
    return rows

# 12 readings, one every 10 seconds; the 7th reading is a short spike (90)
raw = [(1000 + 10 * i, v) for i, v in enumerate([20, 22, 21, 23, 22, 21, 90, 24, 23, 22, 21, 22])]
for row in downsample(raw, 60):
    print(row)
print("raw points:", len(raw), "-> rollup rows:", len(downsample(raw, 60)))` },
      { lang: 'python', run: true, title: 'Why timestamps compress so well: delta-of-delta encoding', code: `def delta_of_delta(timestamps):
    """Gorilla-style: store the first timestamp, then only the change of the change."""
    out = [timestamps[0]]
    prev_delta = None
    for i in range(1, len(timestamps)):
        delta = timestamps[i] - timestamps[i - 1]
        out.append(delta if prev_delta is None else delta - prev_delta)
        prev_delta = delta
    return out

# a sensor that reports every 10 s, with one 1-second jitter
ts = [1000, 1010, 1020, 1030, 1041, 1051, 1061, 1071]
enc = delta_of_delta(ts)
print("raw       :", ts)
print("encoded   :", enc)          # mostly zeros -> each zero can be stored in a single bit
zeros = sum(1 for x in enc[2:] if x == 0)
print(f"{zeros} of {len(enc) - 2} stored values are 0 -> ~1 bit each instead of 64")` },
      { lang: 'sql', check: false, title: 'TimescaleDB: hypertable, continuous aggregate, retention (PostgreSQL + extension)', code: `-- One normal-looking table, automatically partitioned into time chunks
CREATE TABLE readings (
  ts         timestamptz NOT NULL,
  device_id  text        NOT NULL,
  temp_c     double precision
);
SELECT create_hypertable('readings', 'ts', chunk_time_interval => INTERVAL '1 day');

-- Hourly rollup kept up to date by the database
CREATE MATERIALIZED VIEW readings_hourly
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', ts) AS hour, device_id,
       count(*) AS n, min(temp_c) AS min_c, max(temp_c) AS max_c, avg(temp_c) AS avg_c
FROM readings GROUP BY hour, device_id;

-- Raw rows older than 14 days are dropped chunk by chunk (instant), rollups stay
SELECT add_retention_policy('readings', INTERVAL '14 days');` },
      { lang: 'text', title: 'PromQL examples (Prometheus query language)', code: `# Requests per second over the last 5 minutes, per service
sum by (service) (rate(http_requests_total[5m]))

# 99th percentile latency from a histogram metric
histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# Alert rule idea: CPU above 90% for 5 minutes straight
avg by (host) (cpu_usage_percent) > 90` }
    ],
    codeTitle: ['Downsampling (runs in your browser)', 'Delta-of-delta compression', 'TimescaleDB hypertable + retention', 'PromQL'],
    viz: {
      title: 'Time-series downsampling: many raw points become one summary per bucket',
      input: '4 | 20 22 21 23 22 21 90 24 23 22 21 22',
      inputLabel: 'bucket size (points per bucket) | raw readings (max 24)',
      gen: function (input) {
        var sp = String(input).split('|');
        if (sp.length !== 2) throw new Error('Format: 4 | 20 22 21 90 25 24  (bucket size, a | sign, then the readings)');
        var b = Math.floor(num(sp[0].trim(), 0));
        var v = nums(sp[1], 24, 'Readings must be numbers separated by spaces');
        if (b < 2 || b > 12) throw new Error('Bucket size must be between 2 and 12');
        var frames = [], rows = [], avgs = [], maxs = [], i, k;
        frames.push({ narr: 'These are <b>' + v.length + ' raw readings</b> (say one every 10 seconds). Keeping them all forever is expensive. We will cut time into <b>buckets of ' + b + ' points</b> and keep one summary row per bucket.', parts: [
          { type: 'bars', label: 'Raw readings over time', values: v, texts: v.map(String) }] });
        for (i = 0; i < v.length; i += b) {
          var slice = v.slice(i, i + b), sum = 0, mn = Infinity, mx = -Infinity;
          slice.forEach(function (x) { sum += x; if (x < mn) mn = x; if (x > mx) mx = x; });
          var avg = r1(sum / slice.length), hl = {};
          for (k = i; k < i + slice.length; k++) hl[k] = 'win';
          var spike = mx > avg * 1.8;
          rows.push([rows.length + 1, slice.length, mn, mx, avg]); avgs.push(avg); maxs.push(mx);
          frames.push({ narr: '<b>Bucket ' + rows.length + '</b> covers readings ' + (i + 1) + '-' + (i + slice.length) + ' (blue). Count ' + slice.length + ', min ' + mn + ', max ' + mx + ', avg <b>' + avg + '</b>.' + (spike ? ' <span class="c-r">Notice the max is far above the average - the average alone would hide this spike.</span>' : ''), parts: [
            { type: 'bars', label: 'Raw readings (blue = current bucket)', values: v, hl: hl, texts: v.map(String) },
            { type: 'table', label: 'Rollup table so far', columns: ['bucket', 'count', 'min', 'max', 'avg'], rows: rows.slice(), hl: (function () { var h = {}; h[rows.length - 1] = spike ? 'bad' : 'ok'; return h; })() }] });
        }
        var hmax = {}; maxs.forEach(function (m, j) { if (m > avgs[j] * 1.8) hmax[j] = 'bad'; });
        frames.push({ narr: 'Compare what survives. The <b>average</b> series (top) is smooth and cheap but the spike is nearly invisible. The <b>max</b> series (bottom) keeps it. That is why rollups store <b>min / max / avg / count</b>, not only the average.', parts: [
          { type: 'bars', label: 'avg per bucket', values: avgs, texts: avgs.map(String) },
          { type: 'bars', label: 'max per bucket', values: maxs, hl: hmax, texts: maxs.map(String) }] });
        frames.push({ narr: '<b>Storage saved:</b> ' + v.length + ' raw points became ' + rows.length + ' rollup rows (each has 4 numbers). Real systems do this in tiers: raw for days, 1-minute for weeks, 1-hour for years - and drop each older tier by deleting whole time partitions.', parts: [
          { type: 'vars', vals: { 'raw points': v.length, 'rollup rows': rows.length, 'numbers stored raw': v.length, 'numbers stored rolled': rows.length * 4, 'compression': r1(v.length / (rows.length * 4)) + 'x (and gets bigger with larger buckets)' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Capacity math for 1 million IoT sensors', html: `<p>1M sensors x 1 reading / 10 s = ${H.c('b', '100,000 points/s')} = 8.64 billion points/day.</p>
        ${H.table(['Storage layout', 'Bytes per point', 'Per day', 'Per 30 days'], [['Naive SQL row (id, device, ts, value + index)', '~50', '432 GB', '13 TB'], ['Raw 16 bytes (8 ts + 8 value)', '16', '138 GB', '4.1 TB'], ['Gorilla-style compressed', '~1.4', ' 12 GB', '360 GB'], ['Plus tiering: raw 7 d + 1-min rollups', '-', '~12 GB x 7 + rollups', H.c('g', '~100 GB')]])}
        <p>Write rate matters as much as size: 100k writes/s is batchable (the ingest tier sends 5,000-point batches), which a single good TSDB node handles; clusters shard by <code>hash(series)</code> and time.</p>` },
      { title: 'The cardinality trap', html: `<p>A team tags a request-latency metric with <code>user_id</code>. They have 2M users, 40 endpoints and 5 status codes: potentially <b>2M x 40 x 5 = 400 million series</b>. Each series needs index entries and in-memory chunk headers (~1-3 KB), so the monitoring server runs out of RAM within minutes. Fix: drop <code>user_id</code> from tags (use <code>endpoint</code>, <code>status</code>, <code>region</code>: ~2,000 series); if you need per-user data, send it to logs/traces or an event store like ClickHouse. Alert on "active series count" growth to catch this early.</p>` },
      { title: 'Pull vs push collection', html: `<p><b>Pull (Prometheus):</b> the monitoring server visits each service's <code>/metrics</code> endpoint every 15 s. Benefits: the server knows who is down (a failed scrape = <code>up == 0</code>), central control of scrape rate. <b>Push (InfluxDB/StatsD, IoT):</b> devices send readings to a gateway. Needed when devices are behind NAT/firewalls, short-lived (batch jobs), or battery powered and sleep most of the time. IoT usually looks like: device -> <b>MQTT broker</b> -> <b>Kafka</b> -> TSDB writer; Kafka absorbs bursts and lets you replay.</p>` },
      { title: 'Out-of-order and late data', html: `<p>A truck loses mobile coverage for 20 minutes and then uploads 120 buffered readings stamped with their <i>original</i> times. A strictly append-only TSDB rejects points older than its current head block. Options: configure an <b>out-of-order window</b> (Prometheus supports one), write late points into a separate "backfill" path that rewrites older blocks, or keep a short buffer upstream in Kafka and sort before insert. Always store <b>event time</b> (when it happened), not just arrival time.</p>` }
    ],
    deepDive: `<p><b>Gorilla compression in detail.</b> Timestamps: store the first in full; then the delta-of-delta using variable-length bit codes (0 -> one bit '0' for the common case; small values get 7-14 bit codes). Values: XOR each float with the previous one; if the result is 0 (same value) store one bit; if the meaningful bits fit in the previous XOR's window store just those, otherwise store new length/position. For slowly changing gauges this yields ~1.4 bytes/point. Counters (monotonic) compress even better when stored as deltas. Everything is compressed in small chunks (e.g. 120 points) so a range read decompresses only what it needs.</p>
      <p><b>Index structure.</b> A TSDB needs two things: (1) a way to find series by tags - an <b>inverted index</b> from tag=value to series ids (exactly the search-engine idea, intersected for <code>region=eu AND service=cart</code>), and (2) the actual chunks per series. Cardinality cost = size of (1) plus open chunks in RAM. Prometheus keeps the head block in memory (2 h) and a WAL for crash recovery; older data is memory-mapped immutable blocks, compacted into larger ones.</p>
      <p><b>Rollups done right.</b> Aggregates that can be merged: count, sum, min, max (and avg = sum/count - never average averages across buckets of different sizes). Percentiles cannot be merged from per-bucket percentiles; store histogram buckets (Prometheus histograms), t-digest or DDSketch and merge those. <b>Continuous aggregates / recording rules</b> precompute rollups incrementally so dashboards over 1 year don't scan billions of raw points. Also decide the <b>resolution vs retention</b> contract up front; once raw is dropped it's gone.</p>
      <p><b>Scaling out.</b> Single-node Prometheus tops out at a few million active series. Scale with: functional sharding (one Prometheus per team/region), <b>remote-write</b> into a clustered store (Mimir, Cortex, VictoriaMetrics, Thanos with object-storage blocks) that shards by series hash and replicates 3x, with a query layer that fans out and merges (same scatter-gather pattern as search). Long-term blocks sit in object storage (cheap) with a small local cache.</p>
      <p><b>Choosing vs alternatives.</b> TSDB vs ClickHouse: TSDBs shine at metrics (rate(), downsampling built in, regular intervals); ClickHouse/Druid at wide event rows, ad-hoc dimensions and high cardinality (every field is filterable). TSDB vs Cassandra/Dynamo-style wide-column (time-bucketed partition key such as <code>(device_id, day)</code>, clustering by time): good for pure key-value fetch of one device's history at huge write rates but you build rollups and alerts yourself. Hot partitions: never use only the time as partition key - all writes would hit "now".</p>
      <p><b>Alerting</b> is a streaming evaluation: every N seconds the rule engine runs a query, a state machine (inactive -> pending -> firing) requires the condition for the "for:" duration to avoid flapping, and routes via an alert manager that groups, dedups and silences. Missing data is its own alert (dead man's switch).</p>`,
    aiEra: `<p><b>What AI changes:</b> time-series data is the fuel for <b>anomaly detection and forecasting</b>. Instead of a fixed threshold ("CPU > 90%") teams train models (seasonal decomposition, Prophet, deep forecasters, or time-series foundation models) to learn "normal for a Tuesday 9am" and flag deviations. AIOps tools correlate a metric spike with deploys, logs and traces, and LLM assistants write PromQL/SQL from plain questions ("which service's p99 doubled after the 14:05 deploy?"). Predictive maintenance on IoT (vibration of a motor) is a classic: features are rolled-up windows (mean, max, FFT bands) taken straight from downsampled tiers.</p>
      <p><b>Use AI as a partner:</b> ask it to translate a dashboard idea into PromQL or Timescale SQL, to suggest which labels are safe (bounded) versus dangerous, and to estimate series counts from your tag cardinalities. Have it generate synthetic sensor data with seasonality, gaps and spikes to test your rollup logic.</p>
      <p><b>Where AI goes wrong:</b> it adds <code>user_id</code> or <code>request_id</code> as labels, averages percentiles, proposes storing sensor data in a plain relational table with a B-tree index on every column, or forgets retention so costs grow forever. Generated PromQL often misuses <code>rate()</code> on gauges or the wrong range window. Anomaly models trained on a short, unrepresentative window will alert on every holiday.</p>
      <p><b>What you must still own:</b> the data model (metric vs tag vs field), cardinality budget, the retention/resolution contract, and what is allowed to wake someone up at 3 a.m.</p>`,
    problems: [{
      title: 'Store IoT Metrics from 1 Million Sensors',
      level: 'Medium', tags: ['time-series', 'IoT', 'downsampling', 'Kafka', 'retention'], companies: ['Tesla', 'Bosch', 'Uber'],
      statement: `<p>A company has <b>1 million temperature/humidity sensors</b> in cold-storage warehouses. Each reports every <b>10 seconds</b>. Operations needs (a) a live dashboard for the <b>last hour</b> per warehouse, (b) alerts if temperature stays above 8 °C for 5 minutes, (c) monthly trend reports for the <b>last 2 years</b>, and (d) a way to look at raw readings of one sensor for the <b>last 7 days</b> when investigating. Design the ingestion, storage and query layers and keep the cost reasonable.</p>`,
      constraints: `1M devices; 100k points/s average (3x bursts after outages); raw data useful for 7 days, hourly summaries for 2 years; dashboards load in under 2 s; the system must survive a broker or DB node failure without losing readings.`,
      example: `<p>Raw volume: 100,000 points/s x 86,400 = <b>8.64 B points/day</b>. Raw 16 B each = 138 GB/day; compressed (~1.4 B) ≈ 12 GB/day; 7 days of raw ≈ 85 GB. Hourly rollups: 1M sensors x 24 x ~40 bytes ≈ 1 GB/day, 730 GB for 2 years - very manageable.</p>`,
      brute: { why: `<p>Naive design: every sensor does an <code>INSERT</code> into one PostgreSQL table <code>readings(id, sensor_id, ts, value)</code> with indexes on sensor_id and ts, and dashboards run <code>AVG(value) ... GROUP BY</code> over months of raw rows. 100k inserts/s thrash the B-tree indexes, the table grows by ~430 GB/day, <code>DELETE FROM readings WHERE ts &lt; ...</code> for retention locks and bloats it, and a 2-year report scans trillions of rows. One DB failure loses data from devices that don't buffer.</p>` },
      mcq: { q: 'Which way of keeping 2 years of history is best for the monthly trend reports?', options: ['Keep all raw readings for 2 years in the hot TSDB', 'Keep hourly rollups (count/min/max/avg) for 2 years, and raw for 7 days only', 'Keep only daily averages and drop the min/max', 'Delete everything older than a month'], answer: 1, explain: 'Rollups give ~100x less data for long-range queries while min/max keep spikes visible; short raw retention covers the investigation use case.' },
      hints: [`<p>Hint 1: The workload is append-only and queried by time range. Pick storage built for that, and put a buffer between devices and the database.</p>`, `<p>Hint 2: MQTT/gateway -> Kafka (buffer, replay) -> batch writers -> TSDB. Separate tiers: raw (7 d), rollups (2 y). Alerts are a streaming/rule evaluation.</p>`, `<p>Hint 3: Do the byte math, name the tags (warehouse, zone, sensor model - bounded) and keep sensor_id as a series key only if the TSDB can afford 1M series; discuss backfill of buffered readings and what happens at 3x burst.</p>`],
      solution: {
        approach: `<p><b>Ingestion.</b> Devices speak MQTT (small payloads, handles flaky networks, QoS 1) to regional <b>MQTT brokers/IoT gateways</b>, which authenticate devices and publish to <b>Kafka</b>, partitioned by <code>sensor_id</code> so each sensor's readings stay ordered. Kafka (3x replication, 3-day retention) absorbs the 3x burst after an outage and allows replay. Stateless <b>writer workers</b> consume in batches of a few thousand points and write to the TSDB; consumer lag is the key health metric. Devices keep a small local buffer and send event-time stamps so late data is still placed correctly.</p>
          <p><b>Storage.</b> Use a clustered TSDB (VictoriaMetrics/Mimir/Timescale/InfluxDB cluster): points are sharded by hash of series id, replicated 2-3x, compressed with delta-of-delta + XOR to ~1.4 B/point, so 7 days of raw is ≈ 85 GB x replication - small. Tags are bounded (<code>warehouse</code>, <code>zone</code>, <code>model</code>); <code>sensor_id</code> is the series identity (1M series is fine for a cluster, not for one Prometheus). A <b>continuous aggregate</b> rolls readings up to 5-minute and hourly rows (count, min, max, avg) continuously; a retention policy drops raw chunks after 7 days and 5-minute rollups after 90 days; hourly rollups are kept 2 years (and also exported as Parquet to object storage for the data lake / BI).</p>
          <p><b>Queries.</b> The live dashboard queries the 5-minute rollup per warehouse (a few hundred series, milliseconds) with a cache; investigation reads raw for one sensor and a time range (contiguous scan of one series); monthly trend reports read hourly rollups. <b>Alerts</b>: a rule evaluator runs <code>max over 5 min &gt; 8</code> per sensor/zone every 30 s with a "for 5m" pending state to stop flapping, plus a "no data for 2 min" alert for dead sensors, routed through an alert manager that dedups and groups (a whole warehouse failing should be 1 page, not 50,000).</p>
          <p><b>Failure and trade-offs.</b> If the TSDB is down, Kafka holds data; if a broker region fails, devices reconnect to another and replay buffers. Rollups lose resolution by design - decide this contract early. Costs are dominated by replication and query CPU, not raw disk. Multi-region: write locally, replicate rollups only.</p>`,
        complexity: `<p>Ingest: O(1) amortized per point (batched, sequential). Dashboard query: O(series x buckets) on rollups (e.g. 300 series x 12 buckets). Raw investigation: O(points in range) = 7 d x 8,640 = ~60k points for one sensor. Retention drop: O(number of chunks), not O(rows).</p>`,
        followUps: ['How would you detect a sensor that is stuck sending the same value?', 'What changes if the same system must serve per-customer dashboards for 10,000 tenants?', 'How would you handle devices with wrong clocks?']
      }
    }]
  });

  /* ================= TOPIC 4: DATA WAREHOUSES & LAKES ================= */
  topics.push({
    title: 'Data Warehouses, Data Lakes and Lakehouses',
    analogy: `<p>Picture a big company's records. The <b>shop floor</b> (your app database) is busy: customers buy, stock changes every second. Management does not want to ask questions on the shop floor - "total sales per country per month for 3 years" would block the cashiers. So you build two other places. The <b>data lake</b> is a giant <b>warehouse shed where you dump everything in its original boxes</b> - raw logs, JSON, images, CSVs - cheap, huge, unsorted until someone needs it. The <b>data warehouse</b> is the <b>tidy reading room</b>: only cleaned, organized tables with labelled columns, built so analysts can get answers in seconds. A <b>lakehouse</b> puts reading-room rules (tables, transactions) directly on top of the shed.</p>`,
    explain: `<p>Two kinds of database work, and they want opposite designs:</p>
      ${H.table(['', 'OLTP (the app database)', 'OLAP (analytics)'], [
        ['Question', '"Update order 881 status"', '"Revenue per country per month, 3 years"'],
        ['Touches', 'A few rows, all columns', 'Billions of rows, a few columns'],
        ['Queries', 'Many tiny, millisecond', 'Few big, seconds to minutes'],
        ['Storage', 'Row-oriented (B-tree)', H.c('g', 'Column-oriented') ],
        ['Examples', 'PostgreSQL, MySQL, DynamoDB', 'Snowflake, BigQuery, Redshift, ClickHouse']
      ])}
      <p><b>Data warehouse.</b> A database specialised for analytics. Key ideas:</p>
      <ul>
        <li><b>Columnar storage.</b> Store each column's values together. <code>SUM(price)</code> reads only the price column (maybe 1/20 of the data) and similar values compress extremely well (a country column sorted becomes "IN x 4M, US x 3M" - <b>run-length encoding</b>).</li>
        <li><b>MPP</b> (massively parallel processing): a query is split across many nodes that each scan their share and combine results.</li>
        <li><b>Separation of storage and compute</b> (Snowflake, BigQuery): data sits in cheap object storage; you spin up compute clusters on demand and pay per use.</li>
        <li><b>Schema-on-write:</b> data is cleaned and modelled <i>before</i> it goes in. Classic model = <b>star schema</b>: a central <b>fact table</b> (one row per event: order lines, with numbers and foreign keys) surrounded by <b>dimension tables</b> (who/what/where/when: customer, product, date, country).</li>
      </ul>
      <p><b>Data lake.</b> Raw files (CSV, JSON, Avro, <b>Parquet</b>, ORC, images, logs) on object storage (S3/GCS/ADLS). <b>Schema-on-read:</b> you decide the structure when you query. Pros: very cheap, any data type, keep everything including data you do not yet know how to use, great for machine learning. Cons: no transactions or constraints, easily becomes a <b>data swamp</b> (nobody knows what is in it or whether it is correct), slow unless files are well formatted and partitioned.</p>
      <p><b>Lakehouse.</b> Add an <b>open table format</b> - <b>Apache Iceberg, Delta Lake, Apache Hudi</b> - on top of Parquet files in the lake. A metadata layer tracks which files form the table at each version, giving <b>ACID transactions, schema evolution, time travel, upserts/deletes</b> and fast planning, while any engine (Spark, Trino, Flink, Snowflake, DuckDB) can read the same files. This is the dominant 2026 architecture: one copy of data, many engines.</p>
      <p><b>Moving data in: ETL vs ELT.</b> <b>ETL</b>: Extract, Transform (on a separate server), then Load. <b>ELT</b>: Extract and Load raw data first into the lake/warehouse, then Transform <i>inside</i> it with SQL (tools like dbt). ELT is the modern default because warehouses are powerful and cheap, and keeping raw data lets you rebuild logic later. Sources: nightly exports, <b>CDC</b> (change data capture from the OLTP database's log), event streams from Kafka, SaaS APIs.</p>
      <p><b>Medallion layers (very common):</b> <b>Bronze</b> = raw, as received, append-only. <b>Silver</b> = cleaned, deduplicated, typed, joined. <b>Gold</b> = business-ready aggregates and star schemas feeding dashboards and ML features. Each layer can be rebuilt from the one below.</p>
      <p><b>Speed tricks you should name:</b> <b>partition pruning</b> (files laid out by <code>dt=2026-10-15/</code> so a one-day query skips 99.9% of files), <b>predicate pushdown</b> (Parquet stores min/max per column chunk, so the reader skips chunks that cannot match), <b>clustering/sort keys</b>, <b>materialized views</b>, and <b>compaction</b> (merging thousands of tiny files - the "small file problem").</p>`,
    clues: [
      '"analysts run heavy reports without slowing production" -> separate OLAP system fed from the OLTP DB (CDC / ETL)',
      '"aggregate billions of rows", "dashboards", "BI" -> columnar data warehouse',
      '"store all raw data cheaply, we do not know the questions yet", "ML on clickstream" -> data lake on object storage',
      '"need ACID / updates / GDPR deletes on lake data" -> lakehouse table format (Iceberg / Delta / Hudi)',
      '"fact table and dimension tables", "slowly changing dimension" -> star schema modelling',
      '"transform in the warehouse with SQL" -> ELT (dbt) rather than ETL',
      '"queries scan too much data and cost too much" -> partition pruning, columnar formats, clustering'
    ],
    code: [
      { lang: 'python', run: true, title: 'Row store vs column store: how many bytes does SUM(price) read?', code: `# A tiny table with 5 columns, each value pretend-stored as 8 bytes
columns = ["id", "user", "country", "price", "ts"]
rows = [
    (1, "asha", "IN", 120, 1001),
    (2, "ben",  "US",  80, 1002),
    (3, "chen", "IN",  40, 1003),
    (4, "dina", "US", 200, 1004),
    (5, "eli",  "IN",  60, 1005),
    (6, "fay",  "UK",  90, 1006),
]
BYTES = 8

# Row store: values of one row sit together, so SUM(price) still drags every column off disk
row_store_bytes = len(rows) * len(columns) * BYTES
# Column store: each column is its own file/block, read only 'price'
col_store_bytes = len(rows) * 1 * BYTES

print("SUM(price) =", sum(r[columns.index("price")] for r in rows))
print("row store reads   :", row_store_bytes, "bytes")
print("column store reads:", col_store_bytes, "bytes (", row_store_bytes // col_store_bytes, "x less )")

# Run-length encoding of a sorted low-cardinality column
country = sorted(r[2] for r in rows)
runs, prev = [], None
for c in country:
    if c == prev:
        runs[-1][1] += 1
    else:
        runs.append([c, 1]); prev = c
print("country column sorted:", country)
print("RLE form             :", runs)` },
      { lang: 'sql', title: 'A star schema and a typical warehouse query (runs in SQLite here)', code: `CREATE TABLE dim_country (country_id INTEGER PRIMARY KEY, country_name TEXT, region TEXT);
CREATE TABLE dim_date    (date_id INTEGER PRIMARY KEY, day TEXT, month TEXT, year INTEGER);
CREATE TABLE fact_orders (
  order_id   INTEGER PRIMARY KEY,
  date_id    INTEGER REFERENCES dim_date(date_id),
  country_id INTEGER REFERENCES dim_country(country_id),
  quantity   INTEGER,
  revenue    INTEGER
);

INSERT INTO dim_country VALUES (1,'India','APAC'),(2,'USA','AMER'),(3,'UK','EMEA');
INSERT INTO dim_date VALUES (20261001,'2026-10-01','2026-10',2026),(20261002,'2026-10-02','2026-10',2026),(20261101,'2026-11-01','2026-11',2026);
INSERT INTO fact_orders VALUES
  (1,20261001,1,2,240),(2,20261001,2,1,80),(3,20261002,1,5,400),
  (4,20261002,3,1,90),(5,20261101,2,3,300),(6,20261101,1,1,60);

-- Revenue per region per month: facts joined to small dimensions, then aggregated
SELECT d.month, c.region, SUM(f.revenue) AS revenue, SUM(f.quantity) AS units
FROM fact_orders f
JOIN dim_date d    ON d.date_id = f.date_id
JOIN dim_country c ON c.country_id = f.country_id
GROUP BY d.month, c.region
ORDER BY d.month, revenue DESC;` },
      { lang: 'sql', check: false, title: 'Iceberg-style lakehouse operations (Spark SQL / Trino)', code: `-- A table on Parquet files in object storage, partitioned by day
CREATE TABLE lake.silver.orders (
  order_id bigint, user_id bigint, amount decimal(10,2), country string, ts timestamp)
USING iceberg
PARTITIONED BY (days(ts));

-- Upsert changes from the CDC stream (ACID on files!)
MERGE INTO lake.silver.orders t
USING staging.orders_changes s ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' THEN DELETE
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;

-- Time travel: what did the table look like yesterday?
SELECT count(*) FROM lake.silver.orders TIMESTAMP AS OF '2026-10-14 00:00:00';

-- Fix the small-file problem
CALL lake.system.rewrite_data_files(table => 'silver.orders');` }
    ],
    codeTitle: ['Row vs column (runs in your browser)', 'Star schema (runs in SQLite)', 'Lakehouse operations'],
    viz: [{
      title: 'Row store vs column store: what does SUM(price) have to read?',
      input: 'price',
      inputLabel: 'column(s) to read, comma separated: id, user, country, price, ts',
      gen: function (input) {
        var cols = ['id', 'user', 'country', 'price', 'ts'];
        var rows = [[1, 'asha', 'IN', 120, 1001], [2, 'ben', 'US', 80, 1002], [3, 'chen', 'IN', 40, 1003], [4, 'dina', 'US', 200, 1004], [5, 'eli', 'IN', 60, 1005], [6, 'fay', 'UK', 90, 1006]];
        var want = String(input).toLowerCase().split(/[\s,]+/).filter(function (x) { return x; });
        if (!want.length) throw new Error('Name at least one column: id, user, country, price, ts');
        var idx = want.map(function (w) { var k = cols.indexOf(w); if (k < 0) throw new Error('Unknown column "' + w + '". Use: ' + cols.join(', ')); return k; });
        var frames = [], r, c;
        function cellsHl(fn) { var h = {}, a, b; for (a = 0; a < rows.length; a++) for (b = 0; b < cols.length; b++) { var v = fn(a, b); if (v) h[a + ',' + b] = v; } return h; }
        frames.push({ narr: 'A tiny <b>orders</b> table: 6 rows x 5 columns (30 cells). Question: <code>SELECT SUM(' + want[0] + ') FROM orders</code>' + (want.length > 1 ? ' (plus ' + want.slice(1).join(', ') + ')' : '') + '. We count how many cells the disk must hand over.', parts: [
          { type: 'grid', label: 'orders', colHead: cols, rows: rows }] });
        var read = 0;
        for (r = 0; r < rows.length; r++) {
          read += cols.length;
          frames.push({ narr: '<b>Row store, row ' + (r + 1) + '.</b> Disk pages hold whole rows, so to get the ' + want.join('/') + ' value we must also load every other column: <span class="c-r">' + cols.length + ' cells read</span> for ' + want.length + ' useful. Total read so far: <b>' + read + '</b>.', parts: [
            { type: 'grid', label: 'Row store: reads whole rows', colHead: cols, rows: rows, hl: cellsHl(function (rr, cc) { if (rr > r) return ''; return idx.indexOf(cc) >= 0 ? 'ok' : 'bad'; }) },
            { type: 'vars', vals: { 'cells read': read, 'cells useful': (r + 1) * want.length } }] });
        }
        var colRead = rows.length * want.length;
        frames.push({ narr: '<b>Column store.</b> Each column lives in its own block. The query opens only <b>' + want.join(', ') + '</b> and skips the rest entirely (faded). Cells read: <span class="c-g">' + colRead + '</span> instead of ' + rows.length * cols.length + '.', parts: [
          { type: 'grid', label: 'Column store: reads only the needed column(s)', colHead: cols, rows: rows, hl: cellsHl(function (rr, cc) { return idx.indexOf(cc) >= 0 ? 'ok' : 'done'; }) },
          { type: 'vars', vals: { 'cells read': colRead, 'cells useful': colRead }, hl: { 'cells read': 'ok' } }] });
        frames.push({ narr: 'Side by side: the column store reads <b>' + (rows.length * cols.length / colRead) + 'x less</b> here. With 200 columns and trillions of rows this is the difference between seconds and hours - and between a small and a huge cloud bill.', parts: [
          { type: 'bars', label: 'Cells read (row store, column store)', values: [rows.length * cols.length, colRead], texts: ['row store ' + rows.length * cols.length, 'column store ' + colRead], hl: { 0: 'bad', 1: 'ok' } }] });
        var sorted = rows.map(function (x) { return x[2]; }).sort();
        var runs = []; sorted.forEach(function (s) { if (runs.length && runs[runs.length - 1][0] === s) runs[runs.length - 1][1]++; else runs.push([s, 1]); });
        frames.push({ narr: '<b>Bonus - compression.</b> Values in one column are alike, so they compress superbly. Sort the <code>country</code> column and write it as <b>run-length encoding</b>: ' + runs.map(function (x) { return x[0] + ' x' + x[1]; }).join(', ') + '. With millions of rows the same trick shrinks a column 10-100x.', parts: [
          { type: 'array', label: 'country column, sorted', values: sorted, hl: (function () { var h = {}; sorted.forEach(function (s, i) { h[i] = s === 'IN' ? 'ok' : s === 'US' ? 'win' : 'sel'; }); return h; })() },
          { type: 'table', label: 'Run-length encoded', columns: ['value', 'run length'], rows: runs, hl: { 0: 'ok' } }] });
        return frames;
      }
    }, {
      title: 'Warehouse vs lake vs lakehouse: one data platform, layer by layer',
      input: 'lakehouse',
      inputLabel: 'type: lake, warehouse or lakehouse',
      gen: function (input) {
        var t = String(input).trim().toLowerCase();
        if (['lake', 'warehouse', 'lakehouse'].indexOf(t) < 0) throw new Error('Type one of: lake, warehouse, lakehouse');
        function g(hn, he, tags, middle) {
          var nodes = [
            { id: 'APP', label: 'App DB (OLTP)', x: 9, y: 8, shape: 'box', w: 15 }, { id: 'EVT', label: 'Event stream', x: 9, y: 28, shape: 'box', w: 15 },
            { id: 'SAAS', label: 'SaaS / files', x: 9, y: 48, shape: 'box', w: 15 },
            { id: 'ING', label: 'Ingest (CDC / ELT)', x: 36, y: 28, shape: 'box', w: 18 }
          ].concat(middle).concat([{ id: 'BI', label: 'Dashboards (BI)', x: 90, y: 10, shape: 'box', w: 17 }, { id: 'ML', label: 'ML / data science', x: 90, y: 46, shape: 'box', w: 17 }]);
          return { type: 'graph', label: 'Data platform', directed: true, height: 58, nodes: nodes, edges: [['APP', 'ING'], ['EVT', 'ING'], ['SAAS', 'ING']].concat(t === 'lake' ? [['ING', 'LAKE'], ['LAKE', 'BI'], ['LAKE', 'ML']] : t === 'warehouse' ? [['ING', 'DW'], ['DW', 'BI'], ['DW', 'ML']] : [['ING', 'LAKE'], ['LAKE', 'DW'], ['DW', 'BI'], ['LAKE', 'ML']]), hl: hn || {}, ehl: he || {}, tags: tags || {} };
        }
        var mid = t === 'lake' ? [{ id: 'LAKE', label: 'Data lake (raw files on object storage)', x: 64, y: 28, shape: 'box', w: 26 }]
          : t === 'warehouse' ? [{ id: 'DW', label: 'Data warehouse (columnar tables)', x: 64, y: 28, shape: 'box', w: 26 }]
          : [{ id: 'LAKE', label: 'Lakehouse: Parquet + Iceberg/Delta', x: 62, y: 46, shape: 'box', w: 28 }, { id: 'DW', label: 'Gold / SQL engine', x: 62, y: 10, shape: 'box', w: 22 }];
        var target = t === 'warehouse' ? 'DW' : 'LAKE';
        var frames = [];
        frames.push({ narr: 'Sources: the busy <b>app database</b>, a <b>stream of events</b>, and files from SaaS tools. Analysts and data scientists must not query the app DB directly - it would slow customers down.', parts: [g({ APP: 'cur', EVT: 'cur', SAAS: 'cur' }, {}, {}, mid)] });
        frames.push({ narr: '<b>Ingest.</b> A pipeline copies data out: CDC reads the app DB\'s change log, Kafka delivers events, connectors pull SaaS data. ' + (t === 'warehouse' ? 'Classic style: transform and clean <b>before</b> loading (ETL).' : 'Modern style: land it <b>raw first</b>, transform later (ELT).'), parts: [g({ ING: 'cur' }, { 'APP-ING': 'ok', 'EVT-ING': 'ok', 'SAAS-ING': 'ok' }, {}, mid)] });
        if (t === 'lake') {
          frames.push({ narr: '<b>Data lake:</b> everything lands as files (JSON, CSV, Parquet) in object storage, organised in folders such as <code>raw/orders/dt=2026-10-15/</code>. Cheap and flexible, structure applied <b>on read</b>. Danger: no transactions, no constraints, quality depends on discipline (the "data swamp").', parts: [g({ LAKE: 'ok' }, { 'ING-LAKE': 'ok' }, { LAKE: 'schema-on-read' }, mid)] });
          frames.push({ narr: 'Consumers read the files directly: ML jobs with Spark/Python, ad-hoc SQL with Athena/Trino. Great for exploration and training data; BI dashboards can be slow and results may not be consistent while files are being written.', parts: [g({ BI: 'cur', ML: 'ok' }, { 'LAKE-BI': 'cur', 'LAKE-ML': 'ok' }, { BI: 'slowish', ML: 'great' }, mid)] });
        } else if (t === 'warehouse') {
          frames.push({ narr: '<b>Data warehouse:</b> data is loaded into modelled tables (facts + dimensions) with enforced types. Columnar storage + MPP compute answer big aggregations in seconds. <b>Schema-on-write</b> means high quality, but you only keep what you modelled and storage costs more than a lake.', parts: [g({ DW: 'ok' }, { 'ING-DW': 'ok' }, { DW: 'schema-on-write' }, mid)] });
          frames.push({ narr: 'BI tools love it: fast, consistent SQL, role-based access. ML teams often need raw images/text it does not hold, so they end up building a second copy elsewhere - the pain a lakehouse tries to remove.', parts: [g({ BI: 'ok', ML: 'bad' }, { 'DW-BI': 'ok', 'DW-ML': 'bad' }, { BI: 'great', ML: 'limited' }, mid)] });
        } else {
          frames.push({ narr: '<b>Lakehouse step 1:</b> raw data lands in object storage as <b>Parquet files</b> (bronze), exactly like a lake: one cheap copy of the data.', parts: [g({ LAKE: 'ok' }, { 'ING-LAKE': 'ok' }, { LAKE: 'bronze' }, mid)] });
          frames.push({ narr: '<b>Step 2:</b> an open table format (Iceberg / Delta / Hudi) adds a metadata log on top of the files: <b>ACID commits, schema evolution, time travel, MERGE/DELETE</b>. Spark jobs refine bronze into <b>silver</b> (clean) and <b>gold</b> (business tables).', parts: [g({ LAKE: 'cur', DW: 'ok' }, { 'LAKE-DW': 'ok' }, { LAKE: 'silver', DW: 'gold' }, mid)] });
          frames.push({ narr: '<b>Step 3:</b> the <b>same files</b> are read by SQL engines for dashboards (fast, consistent snapshots) <i>and</i> by Spark/Python for ML (full raw access). One copy of data, many engines, one place for governance.', parts: [g({ BI: 'ok', ML: 'ok' }, { 'DW-BI': 'ok', 'LAKE-ML': 'ok' }, { BI: 'SQL', ML: 'Spark/Python' }, mid)] });
        }
        frames.push({ narr: 'Summary for <b>' + t + '</b>: ' + (t === 'lake' ? 'cheapest and most flexible, weakest guarantees.' : t === 'warehouse' ? 'best SQL/BI experience, strictest structure, pricier storage.' : 'warehouse-like guarantees on lake-like storage - the common 2026 default.'), parts: [g({ [target]: 'sel' }, {}, {}, mid)] });
        return frames;
      }
    }],
    examples: [
      { title: 'Partition pruning saves real money', html: `<p>A table of 3 years of clickstream = 1,095 daily folders, 40&nbsp;GB each (≈ 44&nbsp;TB). Query: <code>WHERE dt = '2026-10-14'</code>. With partitions by <code>dt</code> the engine opens <b>one folder (40 GB)</b>; without them it scans 44&nbsp;TB. BigQuery-style pricing is about $5-6 per TB scanned, so ${H.c('r', '$250')} versus ${H.c('g', '$0.22')} per query. Add a columnar format and select only 3 of 60 columns: 40 GB becomes ~2 GB. Always filter on the partition column - and never partition by a high-cardinality column like user_id (millions of tiny folders).</p>` },
      { title: 'Slowly changing dimension: a customer moves city', html: `<p>Asha lived in Pune and now lives in Delhi. Old orders must still be reported under Pune. <b>SCD Type 1</b> overwrites the city (history lost - fine for typo fixes). <b>SCD Type 2</b> keeps both rows with validity dates:</p>
        ${H.table(['cust_sk', 'cust_id', 'city', 'valid_from', 'valid_to', 'is_current'], [['101', 'C7', 'Pune', '2023-01-01', '2026-06-30', 'false'], ['245', 'C7', 'Delhi', '2026-07-01', '9999-12-31', 'true']])}
        <p>Fact rows point at the <i>surrogate key</i> (101 or 245) that was current when the order happened, so "revenue by city" stays historically correct.</p>` },
      { title: 'Daily pipeline: bronze -> silver -> gold', html: `<p>00:30 CDC files land in <code>bronze/orders/</code>. 01:00 Spark job: dedupe by order_id and latest version, fix types, mask card numbers, write <code>silver.orders</code> (MERGE). 02:00 dbt models build <code>gold.daily_revenue_by_country</code> and a <code>gold.customer_ltv</code> table. 02:30 data-quality tests (row counts vs source, null checks, revenue within 5% of yesterday) pass or the run is flagged and dashboards keep showing yesterday's data. Because bronze is immutable, a bug in the silver logic is fixed by re-running from bronze - nothing is lost.</p>` },
      { title: 'Which one do I pick?', html: `${H.table(['Situation', 'Choose'], [['Finance team, strict reporting, SQL only, small-mid data', 'Managed warehouse (BigQuery/Snowflake)'], ['Petabytes of logs/images, ML-heavy, cost-sensitive', 'Lake with Parquet + Iceberg/Delta'], ['Both BI and ML, many engines, avoid copies and vendor lock-in', 'Lakehouse'], ['Sub-second dashboards on fresh event data with high concurrency', 'Real-time OLAP (ClickHouse, Druid, Pinot) in front']])}` }
    ],
    deepDive: `<p><b>Parquet internals.</b> A Parquet file = row groups (e.g. 128&nbsp;MB) -> column chunks -> pages. Each column chunk stores encoded values (dictionary encoding, run-length, bit-packing, delta) then compresses them (Snappy/ZSTD). The footer holds the schema and per-chunk <b>min/max/null-count statistics</b>. A reader reads the footer first, skips row groups whose stats exclude the filter (<b>predicate pushdown</b>), and reads only requested column chunks (<b>projection pushdown</b>). Nested data is supported via the Dremel repetition/definition levels. Contrast with Avro (row-based, good for streaming and schema evolution) and ORC (similar to Parquet, Hive world).</p>
      <p><b>How a table format works (Iceberg).</b> Files are immutable. A table = a <b>metadata.json</b> pointing to a snapshot, which points to manifest lists, which point to manifest files listing data files with partition and column stats. A commit writes new data files plus new metadata and atomically swaps the table pointer in a catalog (compare-and-swap). Readers see a consistent snapshot (snapshot isolation); writers use <b>optimistic concurrency</b> and retry on conflict. Updates and deletes use <b>copy-on-write</b> (rewrite files) or <b>merge-on-read</b> (write small delete files, reconcile at read, compact later). Time travel = read an older snapshot. <b>Vacuum/expire snapshots</b> removes unreferenced files.</p>
      <p><b>Warehouse engine internals.</b> Data is split into micro-partitions/blocks with metadata (min/max per column) for pruning; queries are compiled into a DAG of stages: scan -> filter -> partial aggregate on each node -> <b>shuffle</b> by group key -> final aggregate. Joins: <b>broadcast</b> a small dimension to all nodes (cheap) or <b>shuffle both sides</b> by the join key (expensive; data skew on a hot key makes one node the straggler). Vectorised execution processes batches of thousands of values per CPU instruction. Result caching and materialized views make repeated dashboards almost free.</p>
      <p><b>Modelling.</b> Kimball star schemas denormalise for query speed (few joins); Inmon builds a normalised enterprise core first; <b>Data Vault</b> (hubs, links, satellites) is audit-friendly; many teams now use <b>one big wide table</b> per domain in gold because columnar compression makes denormalisation cheap. Define the <b>grain</b> of every fact table first ("one row per order line") - mixed grain is the commonest modelling bug.</p>
      <p><b>Governance and cost.</b> Catalog (Glue, Unity, Polaris, DataHub) for discovery and lineage, column-level security and masking for PII, row-level policies per tenant, retention rules, GDPR deletes (needs a table format with row-level delete, plus rewriting old snapshots and backups). Cost levers: separate compute per workload with auto-suspend, cluster/sort keys, compaction, tiered storage, and query guardrails (max bytes scanned). <b>Data mesh</b> pushes ownership to domain teams, publishing "data products" with contracts - an organisational answer to the central-team bottleneck.</p>`,
    aiEra: `<p><b>What AI changes:</b> the lakehouse is the <b>feedstock for AI</b>. Training sets, feature tables, embeddings and evaluation logs all live there, and "AI-ready data" (clean, documented, governed, lineage-tracked) became the real bottleneck. Warehouses now ship <b>natural-language-to-SQL</b> assistants, vector columns and LLM functions callable from SQL (<code>SUMMARIZE(review_text)</code>), and agents that explore tables and draft dashboards. Unstructured data (PDFs, call recordings) is parsed by AI into structured silver tables so it becomes queryable.</p>
      <p><b>Use AI as a partner:</b> ask it to draft a star schema from a business description, write dbt models and tests, convert a legacy SQL report, explain a slow query plan, or write data-quality checks. Give it your table DDL and sample rows so it stops guessing column names.</p>
      <p><b>Where AI goes wrong:</b> text-to-SQL silently picks the wrong join key or double-counts because it ignores the grain of a fact table; it proposes querying the production OLTP database for analytics, forgets partition filters (a $500 accidental full scan), and invents column names. Letting an LLM query raw PII without masking or access control is a compliance incident waiting to happen.</p>
      <p><b>What you must still own:</b> metric definitions (what exactly is "active user"?), data contracts, quality tests, access control, and validating any AI-written query against known totals before it reaches a dashboard.</p>`,
    problems: [{
      title: 'Design the Analytics Platform for an E-commerce Company',
      level: 'Medium', tags: ['data warehouse', 'data lake', 'lakehouse', 'ELT', 'CDC'], companies: ['Amazon', 'Snowflake', 'Databricks'],
      statement: `<p>An e-commerce company stores orders in PostgreSQL and emits ~2 billion clickstream events a day to Kafka. Business wants (a) daily and weekly sales dashboards by product, category and country, (b) analysts to explore raw events ad hoc, (c) data scientists to train recommendation models on 2 years of clicks and purchases, and (d) GDPR "delete my data" support. The production database must not be slowed down. Design the data platform.</p>`,
      constraints: `2B events/day (~1 TB compressed/day), orders DB ~5 TB, dashboards fresh within 1 hour, ML needs raw history, deletes within 30 days, cost-conscious.`,
      example: `<p>Dashboard question: "revenue by country for last week". It should scan a small <b>gold</b> table (a few GB), not 7 TB of clicks and never the production orders table.</p>`,
      brute: { why: `<p>Naive design: point the BI tool at the production PostgreSQL replica and run reports there; store clickstream in the same database. Heavy aggregations lock buffers and evict hot pages, hurting checkout; 2B rows/day overflow a row-store; raw history for ML is not retained; each team builds its own export scripts so numbers disagree; GDPR deletes touch many uncontrolled copies.</p>` },
      mcq: { q: 'Why land raw data in a lake/bronze layer before transforming (ELT)?', options: ['It is faster to write', 'Raw data is kept, so logic bugs can be fixed by re-running transformations without re-extracting sources', 'It removes the need for a warehouse', 'It avoids encryption'], answer: 1, explain: 'An immutable raw layer makes pipelines re-runnable and auditable; transformations become replaceable code.' },
      hints: [`<p>Hint 1: Separate the workloads: OLTP (checkout) vs OLAP (analytics). How does data move between them without hurting OLTP?</p>`, `<p>Hint 2: Think bronze/silver/gold on an open table format, Kafka -> lake for clicks, CDC for orders, a columnar SQL engine for BI.</p>`, `<p>Hint 3: Add partitioning by date, data quality tests, a catalog, PII masking, and how row-level deletes work for GDPR.</p>`],
      solution: {
        approach: `<p><b>Ingestion.</b> Orders and customers: <b>CDC</b> (Debezium) reads PostgreSQL's WAL, no load on query paths, publishes to Kafka. Clickstream: apps -> Kafka. A streaming/micro-batch job (Flink or Spark Structured Streaming) writes both into the lake every few minutes as Parquet in an <b>Iceberg</b> table <b>bronze</b> layer (append-only, partitioned by day). This keeps one cheap, raw, replayable copy on object storage.</p>
          <p><b>Transform.</b> Scheduled Spark/dbt jobs (hourly) build <b>silver</b> (dedupe by event id, correct types, sessionise clicks, join order headers and lines, mask PII) using MERGE for updates, then <b>gold</b>: star schema with <code>fact_order_lines</code>, <code>fact_sessions</code> and dimensions (product, customer SCD2, date, country) plus pre-aggregated tables such as <code>daily_revenue_by_country</code>. Data-quality tests (row-count reconciliation vs source, uniqueness, freshness) gate publication.</p>
          <p><b>Serve.</b> Dashboards read gold through a columnar SQL engine (Snowflake/BigQuery/Trino/StarRocks) with result caching and semantic-layer metric definitions so every team computes revenue identically. Analysts query silver directly; data scientists read bronze/silver with Spark and build feature tables; if sub-second customer-facing analytics are needed, load aggregates into a real-time OLAP store.</p>
          <p><b>Governance.</b> A catalog with lineage, column-level masking for PII, role-based access, partition and cost guardrails. GDPR: keep a user-id index, issue row-level DELETEs through the table format (merge-on-read), compact to physically remove, expire old snapshots and propagate to backups within the 30-day window; avoid personal data in file names/partitions. Trade-off: ELT stores more data than ETL, but object storage is cheap and the replay ability is worth it.</p>`,
        complexity: `<p>Storage: ~1 TB/day compressed clicks => ~730 TB for 2 years, mostly in cheap object storage. Dashboard queries scan gold (GBs) in seconds. Hourly jobs process ~40 GB/hour of new data incrementally by partition rather than reprocessing history.</p>`,
        followUps: ['How would you support a 5-second-fresh "orders in the last minute" tile?', 'How do you backfill 6 months after a bug in the sessionization logic?', 'How do you control a runaway analyst query that scans 700 TB?']
      }
    }]
  });

  /* ================= TOPIC 5: BATCH PROCESSING (MAPREDUCE / SPARK) ================= */
  topics.push({
    title: 'Batch Processing: MapReduce and Spark',
    analogy: `<p>Imagine counting the votes of a whole country. You do not ship every ballot to one clerk. Instead: ballots are split into piles and each <b>polling station counts its own pile</b> into small tallies (<b>map</b>). Tallies are then <b>sorted by candidate</b> and sent to one regional office per candidate group (<b>shuffle</b>). Each office adds up its candidates' tallies (<b>reduce</b>). Nobody needs to see all the ballots, the work is done in parallel by many people, and if one station's counter falls ill, you give that same pile to someone else and re-count it. That is batch processing: big, finished data, split, processed in parallel, results at the end.</p>`,
    explain: `<p><b>Batch processing</b> = process a large, <b>bounded</b> (finite, already collected) dataset in one job and produce output. Typical: nightly reports, billing runs, building search indexes, training data prep, daily aggregates. You care about <b>throughput</b> (terabytes per hour) more than latency (minutes to hours is fine).</p>
      <p><b>MapReduce</b> (Google 2004, Hadoop) is the idea that started big-data processing. You write two simple functions; the framework does the distributed hard parts:</p>
      <ol>
        <li><b>Input split.</b> The file (in HDFS or object storage) is cut into blocks (e.g. 128 MB). The scheduler runs a <b>mapper</b> on a machine that holds (or is near) each block - "move the code to the data".</li>
        <li><b>Map:</b> <code>map(record) -> list of (key, value)</code>. Word count: line "to be or not to be" -> (to,1) (be,1) (or,1) (not,1) (to,1) (be,1).</li>
        <li><b>Shuffle &amp; sort:</b> every pair is sent to the reducer chosen by <code>hash(key) % R</code> over the network, so <b>all values of one key meet in one place</b>, sorted and grouped. This is the expensive step.</li>
        <li><b>Reduce:</b> <code>reduce(key, [values]) -> result</code>. be -> [1,1] -> 2.</li>
        <li><b>Output</b> written back to distributed storage.</li>
      </ol>
      ${H.table(['Stage', 'Where it runs', 'Cost'], [['Map', 'Where the data block lives', 'Cheap: local disk read, CPU'], ['Combine (optional)', 'Same node, after map', 'Pre-add (be,1)(be,1) into (be,2) to shrink traffic'], ['Shuffle', 'Network between all mappers and reducers', H.c('r', 'Most expensive: network + disk sort')], ['Reduce', 'One reducer per key group', 'Cheap per key, but skew can hurt']])}
      <p><b>Fault tolerance:</b> machines fail all the time at scale. Tasks are <b>deterministic and side-effect free</b>, so if a mapper or reducer dies the scheduler simply <b>re-runs that task</b> elsewhere. Slow "straggler" tasks get a duplicate (<b>speculative execution</b>); whichever finishes first wins.</p>
      <p><b>Why Spark replaced classic MapReduce for most work:</b> MapReduce writes intermediate results to disk after every stage, so a multi-step pipeline reads/writes disks over and over. <b>Apache Spark</b> expresses the whole job as a <b>DAG</b> (graph) of transformations, keeps data in <b>memory</b> between steps and optimises the plan. Same shuffle idea underneath, but 10-100x faster for iterative and multi-stage work, with friendly APIs (DataFrames, SQL, ML, streaming).</p>
      ${H.table(['', 'Hadoop MapReduce', 'Apache Spark'], [['Intermediate data', 'Written to disk each stage', 'Memory first, spill to disk if needed'], ['Programming model', 'Map and reduce functions only', 'Rich: filter, join, groupBy, window, SQL, ML'], ['Fault tolerance', 'Re-run tasks, data replicated in HDFS', 'Re-compute lost partitions from <b>lineage</b>'], ['Latency', 'Minutes+', 'Seconds to minutes for batch'], ['Best for', 'Legacy, huge cold sequential scans', 'Almost all modern batch + ETL + ML prep']])}
      <p><b>Spark vocabulary you must know:</b> <b>partition</b> (a slice of data processed by one task), <b>transformation</b> (lazy: <code>filter, map, join, groupBy</code>) vs <b>action</b> (triggers execution: <code>count, write</code>), <b>narrow dependency</b> (each output partition needs one input partition - no network, e.g. filter/map) vs <b>wide dependency</b> (needs data from many partitions = <b>shuffle</b>, e.g. groupBy/join/distinct), and <b>stage</b> (a pipeline of narrow steps that ends at a shuffle).</p>
      <p><b>Running batch in production:</b> a scheduler/orchestrator (Airflow, Dagster, Step Functions) runs jobs on a schedule with dependencies ("run revenue report after the orders load succeeds"). Jobs must be <b>idempotent</b> - running the same day twice gives the same result (overwrite the day's partition instead of appending) - so retries and backfills are safe.</p>`,
    clues: [
      '"process terabytes of logs overnight", "daily/weekly report" -> batch (Spark / MapReduce)',
      '"results can be a few hours old" -> batch is enough, do not over-engineer streaming',
      '"count / group / join across the entire dataset" -> map -> shuffle -> reduce thinking',
      '"top K most frequent items in a huge file" -> distributed word-count pattern + final merge of local top-K',
      '"job failed halfway, must be re-runnable" -> idempotent output (overwrite partition), deterministic tasks',
      '"one reducer is much slower than others" -> data skew: hot key, salting or a combiner',
      '"build the search index / recommendations model nightly" -> batch pipeline with orchestrator'
    ],
    code: [
      { lang: 'java', title: 'MapReduce word count, simulated in plain Java (map -> shuffle -> reduce)', code: `import java.util.*;

class MiniMapReduce {
    // MAP: one line in -> many (word, 1) pairs out
    static List<Map.Entry<String, Integer>> map(String line) {
        List<Map.Entry<String, Integer>> out = new ArrayList<>();
        for (String w : line.toLowerCase().split("[^a-z0-9]+")) {
            if (!w.isEmpty()) out.add(Map.entry(w, 1));
        }
        return out;
    }

    // Partitioner: decides which reducer receives a key (same key -> same reducer, always)
    static int partition(String key, int reducers) {
        return Math.floorMod(key.hashCode(), reducers);
    }

    // REDUCE: one key + all of its values -> one result
    static int reduce(String key, List<Integer> values) {
        int sum = 0;
        for (int v : values) sum += v;
        return sum;
    }

    public static void main(String[] args) {
        String[] splits = { "to be or not to be", "to do or not to do" };  // two input splits
        int reducers = 2;

        // SHUFFLE: reducerId -> (key -> list of values), TreeMap keeps keys sorted like Hadoop does
        List<TreeMap<String, List<Integer>>> shuffled = new ArrayList<>();
        for (int r = 0; r < reducers; r++) shuffled.add(new TreeMap<>());

        for (String split : splits) {                       // each split would be its own mapper task
            for (Map.Entry<String, Integer> kv : map(split)) {
                int r = partition(kv.getKey(), reducers);
                shuffled.get(r).computeIfAbsent(kv.getKey(), k -> new ArrayList<>()).add(kv.getValue());
            }
        }

        for (int r = 0; r < reducers; r++) {                // each reducer runs independently
            for (Map.Entry<String, List<Integer>> e : shuffled.get(r).entrySet()) {
                System.out.println("reducer " + r + ": " + e.getKey() + " = " + reduce(e.getKey(), e.getValue()));
            }
        }
    }
}` },
      { lang: 'python', title: 'The same job in PySpark (what you would actually write in 2026)', check: false, code: `from pyspark.sql import SparkSession, functions as F

spark = SparkSession.builder.appName("daily-word-count").getOrCreate()

# Read: lazy, nothing happens yet. Files are split into partitions automatically.
lines = spark.read.text("s3://logs/raw/dt=2026-10-15/")

counts = (
    lines
    .select(F.explode(F.split(F.lower("value"), r"[^a-z0-9]+")).alias("word"))   # map side (narrow)
    .where(F.col("word") != "")                                                 # narrow
    .groupBy("word")                                                            # WIDE: shuffle happens here
    .count()
)

# Action: triggers the whole DAG. Overwrite today's partition only -> idempotent re-runs.
(counts.write
    .mode("overwrite")
    .option("partitionOverwriteMode", "dynamic")
    .parquet("s3://logs/gold/word_counts/dt=2026-10-15/"))` },
      { lang: 'python', run: true, title: 'Fixing data skew with key salting (runnable idea)', code: `import random
from collections import Counter

random.seed(7)
# 1 hot key ("home") and a few normal ones - typical of page-view logs
events = ["home"] * 9000 + ["cart"] * 500 + ["help"] * 300 + ["about"] * 200
R = 4  # number of reducers

def load(keys):
    per = Counter()
    for k in keys:
        per[hash(k) % R] += 1
    return dict(sorted(per.items()))

print("without salting, rows per reducer:", load(events))

# Stage 1: add a random salt 0..3 to each key so the hot key spreads over many reducers
salted = [f"{k}#{random.randrange(4)}" for k in events]
print("with salting,    rows per reducer:", load(salted))

# Stage 1 result: partial counts per salted key. Stage 2: strip the salt and add the tiny partials.
partial = Counter(salted)
final = Counter()
for k, c in partial.items():
    final[k.split("#")[0]] += c
print("final counts:", dict(final))` }
    ],
    codeTitle: ['Mini MapReduce in Java', 'PySpark word count', 'Data skew and salting'],
    viz: {
      title: 'MapReduce word count: split -> map -> shuffle -> reduce',
      input: 'to be or not to be|to do or not to do',
      inputLabel: 'input lines separated by | (max 4 lines, 2 reducers)',
      gen: function (input) {
        var lines = String(input).split('|').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
        if (!lines.length || lines.length > 4) throw new Error('Give 1-4 lines of text separated by |');
        var R = 2, frames = [], i;
        function part(w) { var h = 0; for (var k = 0; k < w.length; k++) h += w.charCodeAt(k); return h % R; }
        var splitRows = lines.map(function (l, k) { return ['split ' + (k + 1), 'mapper ' + (k + 1), l]; });
        frames.push({ narr: 'The input is cut into <b>' + lines.length + ' splits</b>. Each split goes to its own <b>mapper</b> task, ideally on the machine already holding that block of data.', parts: [
          { type: 'table', label: 'Input splits', columns: ['split', 'task', 'text'], rows: splitRows }] });
        var allPairs = [];
        for (i = 0; i < lines.length; i++) {
          var ws = words(lines[i]), rows = ws.map(function (w) { return [w, 1]; });
          rows.forEach(function (r) { allPairs.push({ w: r[0], from: i + 1 }); });
          frames.push({ narr: '<b>MAP, mapper ' + (i + 1) + '</b>: reads "' + H.esc(lines[i]) + '" and emits one <code>(word, 1)</code> pair per word. No counting yet - the mapper only looks at its own piece, so all mappers run <b>in parallel</b>.', parts: [
            { type: 'table', label: 'Input splits', columns: ['split', 'task', 'text'], rows: splitRows, hl: (function () { var h = {}; h[i] = 'cur'; return h; })() },
            { type: 'table', label: 'Mapper ' + (i + 1) + ' output', columns: ['key', 'value'], rows: rows.length ? rows : [['(empty)', '-']], hl: {} }] });
        }
        var shufRows = allPairs.map(function (p) { return [p.w, 1, 'mapper ' + p.from, 'reducer ' + part(p.w)]; });
        frames.push({ narr: '<b>SHUFFLE</b>: every pair is sent to the reducer picked by <code>hash(word) % ' + R + '</code>. This guarantees that <b>all pairs of the same word land on the same reducer</b>, whichever mapper made them. It crosses the network and is the costliest step.', parts: [
          { type: 'table', label: 'All mapper output with its destination', columns: ['key', 'value', 'from', 'goes to'], rows: shufRows, hl: (function () { var h = {}; shufRows.forEach(function (r, k) { h[k] = r[3] === 'reducer 0' ? 'win' : 'sel'; }); return h; })() }] });
        var groups = [{}, {}];
        allPairs.forEach(function (p) { var r = part(p.w); groups[r][p.w] = (groups[r][p.w] || 0) + 1; });
        function ent(r) { return Object.keys(groups[r]).sort().map(function (k) { var a = []; for (var j = 0; j < groups[r][k]; j++) a.push(1); return [k, '[' + a.join(', ') + ']']; }); }
        frames.push({ narr: '<b>SORT &amp; GROUP</b>: each reducer sorts its incoming pairs by key and groups the values: <code>word -> [1, 1, ...]</code>. Now every reducer holds complete information about its words.', parts: [
          { type: 'map', label: 'Reducer 0 input', entries: ent(0).length ? ent(0) : [['(nothing)', '-']] },
          { type: 'map', label: 'Reducer 1 input', entries: ent(1).length ? ent(1) : [['(nothing)', '-']] }] });
        var res = [];
        for (var r = 0; r < R; r++) Object.keys(groups[r]).sort().forEach(function (k) { res.push([k, groups[r][k], 'reducer ' + r]); });
        frames.push({ narr: '<b>REDUCE</b>: each reducer adds up each list: <code>be -> [1,1] -> 2</code>. Reducers work independently and in parallel; their outputs are written to storage as part-0 and part-1 files.', parts: [
          { type: 'table', label: 'Reducer output (word counts)', columns: ['word', 'count', 'produced by'], rows: res, hl: (function () { var h = {}, mx = 0; res.forEach(function (x) { if (x[1] > mx) mx = x[1]; }); res.forEach(function (x, k) { if (x[1] === mx) h[k] = 'sel'; }); return h; })() }] });
        var top = res.slice().sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : 1); });
        frames.push({ narr: 'Final answer as bars. A real job saw <b>billions</b> of pairs; the logic is identical. Tip: a <b>combiner</b> would have added up (to,1)(to,1) inside each mapper first, cutting shuffle traffic. And if one reducer got a very hot word, that reducer would become the straggler (<b>data skew</b>).', parts: [
          { type: 'bars', label: 'Word counts', values: top.map(function (x) { return x[1]; }), texts: top.map(function (x) { return x[0] + ' ' + x[1]; }), hl: { 0: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Spark stages: where does the shuffle happen?', html: `<p>Job: <code>events.filter(country == "IN").map(toPair).reduceByKey(sum).join(users)</code>.</p>
        ${H.table(['Step', 'Dependency', 'Network?'], [['filter', 'narrow', 'no'], ['map', 'narrow', 'no'], ['reduceByKey', H.c('r', 'wide'), 'shuffle #1 (but it pre-combines locally first)'], ['join(users)', H.c('r', 'wide'), 'shuffle #2 (unless users is small: broadcast it instead)']])}
        <p>Spark cuts the DAG at each wide dependency: <b>Stage 1</b> = filter + map (+ local combine), <b>Stage 2</b> = after reduceByKey, <b>Stage 3</b> = after join. Fewer shuffles = faster job. This is why "use reduceByKey/aggregations instead of groupByKey" and "broadcast the small table" are classic tuning tips.</p>` },
      { title: 'Top 10 search queries from 10 TB of logs', html: `<p>Do not sort 10 TB. Map: emit (query, 1). Combine locally. Shuffle by query hash. Reduce: total per query. Now each reducer keeps only its <b>local top 10</b> in a small min-heap and writes it. A final tiny job merges <code>R x 10</code> candidates into the global top 10. This is correct because a query's total count lives completely on <b>one</b> reducer (that is what the shuffle guarantees), so the global top 10 must be inside the union of local top 10s.</p>` },
      { title: 'Re-running a failed day safely (idempotence)', html: `<p>Job writes <code>daily_revenue/dt=2026-10-15/</code>. The cluster dies at 80%. The orchestrator retries. <b>Bad:</b> the job <i>appended</i> rows, so the retry doubles revenue. <b>Good:</b> write to a temporary folder and <b>atomically swap / overwrite the whole partition</b> at the end (or use a table format commit). Inputs are an immutable snapshot of "yesterday", not "whatever the table holds now". Then running it twice, or backfilling 30 days, is boring - which is the goal.</p>` },
      { title: 'Skewed join and salting', html: `<p>Joining 5 billion clicks with a table keyed by <code>user_id</code>, where a bot account has 400 million clicks. One reducer gets 8% of all data and runs for 2 hours while 199 others finish in 5 minutes. Fixes: <b>salt</b> the hot key (split it into 20 sub-keys and replicate the small side 20 times), <b>broadcast</b> the small table, or filter bots out earlier. Spark's Adaptive Query Execution can also split skewed partitions automatically.</p>` }
    ],
    deepDive: `<p><b>Shuffle internals.</b> Each map task writes its output into R partitioned, sorted spill files on local disk; reducers <b>fetch</b> their partition from every mapper (M x R small network transfers), merge-sort them and stream into reduce(). Costs: disk writes, network, and (de)serialisation, plus lots of small files when M and R are large. Spark's modern shuffle service lets executors die without losing shuffle files; cloud setups push shuffle to remote storage. Reducing shuffled bytes (filter early, project only needed columns, map-side combine, broadcast joins, bucketed/partition-aligned tables) is the main performance lever.</p>
      <p><b>Join strategies.</b> <b>Broadcast hash join</b>: small table (&lt; ~100 MB) shipped to every executor - no shuffle of the big side. <b>Shuffle hash / sort-merge join</b>: both sides shuffled by the join key. <b>Bucketed join</b>: tables pre-partitioned and sorted by the key on write, so no shuffle at read. Pick based on sizes; cost-based optimisers and AQE choose at runtime using real statistics.</p>
      <p><b>Fault tolerance via lineage.</b> A Spark partition knows how it was computed (the chain of transformations from stable input). Lose a partition -> recompute just that partition from its parents. Long lineages or wide dependencies make recompute expensive, so iterative jobs <b>checkpoint</b> to reliable storage. Output commit protocols (two-phase file commit, table-format transactions) make partial output invisible.</p>
      <p><b>Resource and sizing.</b> Rule of thumb: partitions of 100-200 MB, 2-4 tasks per core; too few partitions = idle cores and OOM, too many = scheduling overhead. Executors with 4-8 cores and 16-32 GB avoid GC pain. Spill to disk happens when a task's hash/sort needs exceed memory - the usual cause of "my job is slow" together with skew and tiny files. Autoscaling and spot instances cut cost (tasks are retryable), but shuffle-heavy jobs suffer when spot nodes vanish.</p>
      <p><b>Choosing engines.</b> Spark: general-purpose ETL, ML prep. Hive/Trino/Presto: interactive SQL over the lake. Flink: also does bounded jobs, with unified batch/stream API. Beam: portable API over Spark/Flink/Dataflow. DuckDB/Polars: single-node engines that beat clusters for datasets up to a few hundred GB - <b>do not use a cluster for data that fits on one big machine</b>. Warehouses (Snowflake/BigQuery) increasingly replace Spark for SQL-shaped batch work.</p>
      <p><b>Orchestration realities.</b> DAG of tasks with retries, SLAs, alerts, backfill commands, data-interval semantics (the run for 2026-10-15 processes data of 2026-10-15), sensors waiting for upstream data, and data-quality gates. Late-arriving data forces either reprocessing recent partitions (a rolling 3-day window) or accepting small inaccuracies - a bridge to the lambda/kappa discussion later in this module.</p>`,
    aiEra: `<p><b>What AI changes:</b> batch pipelines now feed and run AI. <b>Spark/Ray jobs</b> clean, deduplicate (MinHash), filter and tokenise petabytes of text and images for model training; <b>batch inference</b> scores millions of records or generates embeddings overnight at a fraction of real-time prices (many LLM APIs offer discounted asynchronous batch endpoints for this reason). Engineers use AI assistants to write PySpark/SQL, explain a query plan, or convert MapReduce jobs to Spark/dbt.</p>
      <p><b>Use AI as a partner:</b> paste your Spark UI numbers (stage times, shuffle read size, task time spread) and ask <code>"Why is stage 7 slow? Identify skew, spill, or small-files and suggest fixes"</code>. Ask it to write a unit test with a tiny dataset for each transformation, and to propose idempotent output paths.</p>
      <p><b>Where AI goes wrong:</b> it uses <code>groupByKey</code> or collects a huge DataFrame to the driver (<code>collect()</code> / <code>toPandas()</code>), proposes a Spark cluster for a 5 GB file, forgets to make writes idempotent, or hard-codes <code>spark.sql.shuffle.partitions = 200</code> for every data size. It also invents Spark config names - verify against the docs.</p>
      <p><b>What you must still own:</b> choosing partitioning and keys, reasoning about skew and shuffle cost, correctness under retries and late data, and the cost model (cluster-hours vs a single big machine vs a warehouse query).</p>`,
    problems: [{
      title: 'Top 10 Most Searched Queries per Day from 10 TB of Logs',
      level: 'Medium', tags: ['MapReduce', 'Spark', 'batch', 'top-K', 'shuffle'], companies: ['Google', 'Yahoo', 'LinkedIn'],
      statement: `<p>Every day your search service writes about <b>10 TB</b> of query logs (billions of lines like <code>2026-10-15T10:01:02Z user=u9 q="red shoes"</code>). Produce, every morning by 6 a.m., the <b>top 10 most frequent queries of yesterday</b> (and the top 10 per country). The job may be re-run any time and must give the same answer. Explain the pipeline, what is shuffled, and how you avoid skew.</p>`,
      constraints: `10 TB/day input in object storage, ~200M distinct queries, a hot query ("facebook") may be 3% of all traffic, cluster of 200 cores, finish within 2 hours, re-runnable.`,
      example: `<p>Input lines: "shoes", "shoes", "socks", "shoes", "socks", "hat". Map emits (shoes,1)... Reduce totals: shoes=3, socks=2, hat=1. Top 2 = shoes, socks. Same idea per (country, query) key for the per-country report.</p>`,
      brute: { why: `<p>Naive: load all queries into one machine's hash map and sort. 200M distinct queries with counters is many GB but the real issue is reading 10 TB through a single machine (about 10 TB / 500 MB/s ≈ 5.5 hours) and a single point of failure. Alternatively sort the whole 10 TB globally (a giant shuffle) just to take 10 rows - massively wasteful.</p>` },
      mcq: { q: 'Why can each reducer safely keep only its local top 10?', options: ['Because queries are sorted', 'Because the shuffle puts all counts of one query on one reducer, so global top 10 is within the union of local top 10s', 'Because Spark guarantees it', 'It cannot - you need all counts on one machine'], answer: 1, explain: 'Partitioning by key means each key lives in exactly one reducer with its full total, so any global top-10 key must be in the top 10 of its own reducer.' },
      hints: [`<p>Hint 1: This is word count where the "word" is the query string. Think map -> combine -> shuffle -> reduce.</p>`, `<p>Hint 2: You do not need a global sort. Keep a small heap of size 10 per reducer and merge the candidates.</p>`, `<p>Hint 3: Hot key: map-side combine collapses millions of (facebook,1) into one pair per mapper; salt if needed. Write output to a dated partition with overwrite for idempotence.</p>`],
      solution: {
        approach: `<p><b>Pipeline.</b> A Spark job (or MapReduce) reads yesterday's partition <code>logs/dt=2026-10-14/</code> only (partition pruning). <b>Map</b>: parse each line, drop malformed ones, normalise the query (trim, lowercase), emit <code>((country, query), 1)</code>. Spark's <code>reduceByKey</code> (or DataFrame <code>groupBy().count()</code>) does a <b>map-side combine</b> first, so each mapper outputs at most one pair per distinct key it saw instead of one per log line; only these partial counts cross the network in the <b>shuffle</b>, partitioned by <code>hash(country, query)</code> across e.g. 800 reduce partitions (~100-200 MB each). The reducers add up the partial counts.</p>
          <p><b>Top-K without a global sort.</b> After the reduce, each partition keeps only its local top 10 per country with a bounded min-heap (O(n log 10)). A second tiny stage collects those few thousand candidates onto one reducer and picks the final top 10 per country (and overall). Correctness: all partial counts for a key meet in one partition, so each candidate total is exact, and a key in the global top 10 must also be in the top 10 of its own partition.</p>
          <p><b>Skew and cost.</b> The hot query would put ~3% of 10 TB's pairs on one reducer; because of the combiner it is only (#mappers) partial pairs, which is trivial. If a skewed key still hurt (e.g. a join), salt it. Expected cost: scan 10 TB (compressed columnar logs ≈ 2-3 TB) at ~200 cores x ~100 MB/s ≈ 20 GB/s aggregate -> well under the 2-hour budget.</p>
          <p><b>Operations.</b> Output to <code>top_queries/dt=2026-10-14/</code> using partition overwrite so a rerun replaces, never duplicates. Orchestrator (Airflow) starts at 01:00 after the log-compaction task, alerts if row counts differ more than 30% from the previous day, and has retries plus a backfill command. Late log files are handled by re-running the previous two days.</p>`,
        complexity: `<p>Time O(N) for N log lines over P parallel workers (≈ N/P each) plus the shuffle of at most (#mappers x #distinct keys per mapper) partial pairs. Space per reducer: its share of distinct keys (~1/800 of 200M).</p>`,
        followUps: ['How would you get a near-real-time (1-minute) approximation of the same top 10?', 'How could a Count-Min Sketch + heap reduce the memory further?', 'How do you detect bot traffic polluting the counts?']
      }
    }]
  });

  /* ================= TOPIC 6: STREAM PROCESSING (FLINK) ================= */
  topics.push({
    title: 'Stream Processing: Flink, Windows, Watermarks and State',
    analogy: `<p>Batch is like a <b>teacher who waits until the end of the term, collects all exam papers in a pile and marks them over the weekend</b>. Streaming is a <b>lifeguard watching the pool</b>: events arrive continuously and she must react in seconds - a child under water cannot wait until Sunday. A lifeguard also keeps <b>memory</b> ("that kid went under 10 seconds ago and hasn't come up") and works with a <b>clock</b>: if a message "kid slipped at 3:02:07" is shouted late at 3:02:12, she must still understand that it <i>happened</i> at 3:02:07. Stream processing = continuous computation over never-ending events, with state and an honest notion of time.</p>`,
    explain: `<p><b>Stream processing</b> handles <b>unbounded</b> data - events that keep arriving forever (clicks, payments, sensor readings, log lines) - and produces results <b>continuously</b> with latency of milliseconds to seconds. Engines: <b>Apache Flink</b> (the reference "true streaming" engine), Kafka Streams / ksqlDB, Spark Structured Streaming (micro-batches, plus newer low-latency modes), Apache Beam on Dataflow, Pulsar Functions, Materialize/RisingWave (streaming SQL databases).</p>
      <p><b>Typical pipeline:</b> source (Kafka) -> processing job (parse, filter, enrich, aggregate, detect patterns) -> sink (database, Kafka topic, alert system, dashboard store).</p>
      <p><b>The four ideas to master:</b></p>
      <ol>
        <li><b>Event time vs processing time.</b> <i>Event time</i> = when it really happened (stamped by the phone). <i>Processing time</i> = when your job sees it. Networks delay and reorder events, so correct analytics use <b>event time</b>.</li>
        <li><b>Windows.</b> You can't "sum an infinite stream", so you sum per window: <b>tumbling</b> (fixed, non-overlapping: every 5 min), <b>sliding</b> (overlapping: last 10 min, update every 1 min), <b>session</b> (a burst of activity ends after N minutes of silence - great for user sessions).</li>
        <li><b>Watermarks.</b> The engine's guess "I have probably seen everything up to time T". With a watermark = (largest event time seen) - (allowed lateness, e.g. 2 s), a window <code>[0,5)</code> is <b>closed and emitted</b> once the watermark passes 5. Events that arrive after their window closed are <b>late</b>: drop them, send to a side-output for repair, or allow a grace period that re-fires an updated result. This is the central trade-off: <b>wait longer = more accurate, slower results.</b></li>
        <li><b>State + fault tolerance.</b> Counting, joining and de-duplicating need memory per key ("how many logins for card 123 in the last minute?"). Flink keeps this <b>keyed state</b> locally (heap or RocksDB on disk) and periodically takes a consistent <b>checkpoint</b> (barriers flow through the graph - Chandy-Lamport style) to durable storage. After a crash the job restores the last checkpoint and replays Kafka from the saved offsets, so results are as if nothing failed.</li>
      </ol>
      ${H.table(['Delivery guarantee', 'Meaning', 'How'], [['At-most-once', 'May lose events', 'No retries (rarely acceptable)'], ['At-least-once', 'No loss, may duplicate', 'Replay from checkpoint + idempotent or deduped sink'], ['Exactly-once (state)', 'Each event affects the state once', 'Checkpointing and offset rollback'], ['Exactly-once (end to end)', 'Output also not duplicated', 'Transactional/2PC sinks (Kafka transactions) or idempotent upserts by key']])}
      <p><b>Scaling:</b> a job is split into parallel instances. Data is <b>partitioned by key</b> (<code>keyBy(cardId)</code>) so all events of one card reach the same instance and its local state. Kafka partition count caps source parallelism. <b>Backpressure</b>: if a slow sink can't keep up, buffers fill and the pressure propagates upstream so the source slows down instead of the job running out of memory.</p>
      <p><b>Stream vs batch (the exam question):</b></p>
      ${H.table(['', 'Batch', 'Stream'], [['Data', 'Bounded, complete', 'Unbounded, arriving'], ['Latency', 'Minutes to hours', 'Milliseconds to seconds'], ['Correctness issues', 'Simple: all data is there', 'Late/out-of-order data, state, restarts'], ['Cost/complexity', 'Cheaper, easier to reason about', 'Always-on cluster, harder to operate'], ['Use when', 'Daily/weekly reports, ML training, backfills', 'Fraud, alerts, live dashboards, real-time personalisation']])}
      <p><b>Rule:</b> <b>ask "what is the cost of being late?"</b> A daily revenue report that arrives at 6 a.m. instead of 6:00:03 costs nothing: use batch. A card fraud decision that arrives 30 minutes late costs real money: use streaming. Many systems need both - which leads to the lambda/kappa discussion next.</p>`,
    clues: [
      '"detect fraud in real time", "alert within seconds" -> stream processing (Flink / Kafka Streams)',
      '"events can arrive late or out of order" -> event time, watermarks, allowed lateness',
      '"count per user in the last 5 minutes" -> keyed state + sliding/tumbling window',
      '"user sessions with a 30-minute inactivity gap" -> session windows',
      '"no duplicates, no loss" / "exactly-once" -> checkpoints, transactional sinks or idempotent writes',
      '"join clicks with impressions that arrive separately" -> stream-stream interval join with buffered state',
      '"report at 6 a.m. each day" -> batch is enough; do not build a streaming system'
    ],
    code: [
      { lang: 'java', title: 'Tumbling event-time windows with a watermark, from scratch', code: `import java.util.*;

class TumblingWindows {
    public static void main(String[] args) {
        int size = 5;            // window length in time units: [0,5) [5,10) [10,15) ...
        int maxOutOfOrder = 2;   // watermark = largest event time seen - 2
        int[] arrivals = {1, 2, 4, 6, 7, 3, 9, 11, 12, 8};   // event times in ARRIVAL order

        TreeMap<Integer, Integer> counts = new TreeMap<>();  // window start -> event count
        Set<Integer> fired = new HashSet<>();                // windows already emitted
        int maxTime = Integer.MIN_VALUE;

        for (int t : arrivals) {
            int start = (t / size) * size;                   // which window does this event belong to?
            if (fired.contains(start)) {                     // window already closed -> late event
                System.out.println("event " + t + " is LATE, window [" + start + "," + (start + size) + ") already emitted");
                continue;
            }
            counts.merge(start, 1, Integer::sum);            // keyed state: one counter per window
            maxTime = Math.max(maxTime, t);
            int watermark = maxTime - maxOutOfOrder;         // "we probably saw everything up to here"

            // emit every window whose end is <= watermark (TreeMap iterates in time order)
            Iterator<Map.Entry<Integer, Integer>> it = counts.entrySet().iterator();
            while (it.hasNext()) {
                Map.Entry<Integer, Integer> e = it.next();
                if (e.getKey() + size > watermark) break;
                System.out.println("watermark " + watermark + " -> EMIT window [" + e.getKey() + "," + (e.getKey() + size) + ") count=" + e.getValue());
                fired.add(e.getKey());
                it.remove();
            }
        }
        // end of a bounded input: the watermark jumps to infinity, flush what is left
        for (Map.Entry<Integer, Integer> e : counts.entrySet()) {
            System.out.println("end of stream -> EMIT window [" + e.getKey() + "," + (e.getKey() + size) + ") count=" + e.getValue());
        }
    }
}` },
      { lang: 'java', check: false, title: 'Flink DataStream job: flag a card used in 3+ countries within 1 minute', code: `DataStream<Txn> txns = env
    .fromSource(kafkaSource,
        WatermarkStrategy.<Txn>forBoundedOutOfOrderness(Duration.ofSeconds(5))
                         .withTimestampAssigner((t, ts) -> t.eventTimeMillis),
        "transactions");

txns.keyBy(t -> t.cardId)                                   // all events of a card -> same task + same state
    .window(SlidingEventTimeWindows.of(Time.minutes(1), Time.seconds(10)))
    .aggregate(new DistinctCountriesAgg())                  // keyed state per window, RocksDB-backed
    .filter(r -> r.distinctCountries >= 3)
    .sinkTo(alertsKafkaSink);                               // transactional sink -> exactly-once to Kafka

env.enableCheckpointing(30_000);                            // snapshot state every 30 s
env.execute("fraud-velocity-rule");` },
      { lang: 'sql', check: false, title: 'The same idea as Flink SQL', code: `CREATE TABLE txns (
  card_id STRING, country STRING, amount DECIMAL(10,2),
  ts TIMESTAMP(3),
  WATERMARK FOR ts AS ts - INTERVAL '5' SECOND
) WITH ('connector' = 'kafka', 'topic' = 'transactions', 'format' = 'json',
        'properties.bootstrap.servers' = 'kafka:9092');

INSERT INTO alerts
SELECT card_id, window_start, window_end, COUNT(DISTINCT country) AS countries
FROM TABLE(HOP(TABLE txns, DESCRIPTOR(ts), INTERVAL '10' SECOND, INTERVAL '1' MINUTE))
GROUP BY card_id, window_start, window_end
HAVING COUNT(DISTINCT country) >= 3;` }
    ],
    codeTitle: ['Watermark + tumbling windows (Java)', 'Flink job', 'Flink SQL'],
    viz: {
      title: 'Stream windowing: event time, watermark, late data',
      input: '5 | 1 2 4 6 7 3 9 11 12 8',
      inputLabel: 'window size | event times in ARRIVAL order (watermark = max time seen - 2)',
      gen: function (input) {
        var sp = String(input).split('|');
        if (sp.length !== 2) throw new Error('Format: 5 | 1 2 4 6 7 3 9  (window size, a | sign, then event times)');
        var W = Math.floor(num(sp[0].trim(), 0)), ev = nums(sp[1], 16, 'Event times must be whole numbers separated by spaces');
        if (W < 2 || W > 10) throw new Error('Window size must be between 2 and 10');
        if (ev.some(function (x) { return x < 0 || x > 99 || Math.floor(x) !== x; })) throw new Error('Event times must be whole numbers from 0 to 99');
        var LATE = 2, frames = [], counts = {}, fired = {}, status = [], maxT = -1, i;
        function label(s) { return '[' + s + ',' + (s + W) + ')'; }
        function entries() { return Object.keys(counts).map(Number).sort(function (a, b) { return a - b; }).map(function (s) { return [label(s), counts[s] + (fired[s] ? ' (emitted)' : ' (open)')]; }); }
        function hlWin() { var h = {}; Object.keys(counts).forEach(function (s) { if (fired[s]) h[label(Number(s))] = 'sel'; }); return h; }
        function hlEv(cur) { var h = {}; status.forEach(function (s, k) { h[k] = s === 'late' ? 'bad' : 'ok'; }); if (cur !== undefined) h[cur] = 'cur'; return h; }
        var emitted = [];
        frames.push({ narr: 'Events arrive in this order (numbers are their <b>event times</b>, when they really happened). Network delays mean they are slightly out of order. We count events per <b>tumbling window of ' + W + '</b>. Rule: <b>watermark = largest event time seen - ' + LATE + '</b>; a window is emitted when the watermark reaches its end.', parts: [
          { type: 'array', label: 'Arrival order of events (event time)', values: ev, showIdx: true }, { type: 'vars', vals: { 'window size': W, 'max lateness': LATE, 'max time seen': '-', watermark: '-' } }] });
        for (i = 0; i < ev.length; i++) {
          var t = ev[i], s = Math.floor(t / W) * W, msg;
          if (fired[s]) {
            status.push('late');
            msg = 'Event <b>' + t + '</b> belongs to window ' + label(s) + ', but that window was <span class="c-r">already emitted</span>. It is a <b>late event</b>: here we drop it (real jobs may send it to a side output, or use allowed lateness to re-fire the window).';
          } else {
            status.push('ok'); counts[s] = (counts[s] || 0) + 1;
            if (t > maxT) maxT = t;
            msg = 'Event <b>' + t + '</b> goes into window ' + label(s) + ' (its count is now ' + counts[s] + ').';
          }
          var wm = maxT - LATE, fireNow = [];
          Object.keys(counts).map(Number).sort(function (a, b) { return a - b; }).forEach(function (st) { if (!fired[st] && st + W <= wm) { fired[st] = true; fireNow.push(st); emitted.push([label(st), counts[st]]); } });
          msg += ' Watermark = ' + maxT + ' - ' + LATE + ' = <b>' + wm + '</b>.' + (fireNow.length ? ' <span class="c-g">Watermark passed the end of ' + fireNow.map(label).join(', ') + ' -> emit result.</span>' : ' No window is complete yet.');
          frames.push({ narr: msg, parts: [
            { type: 'array', label: 'Arrival order of events (green = counted, red = late)', values: ev, hl: hlEv(i), ptr: (function () { var p = {}; p[i] = 'now'; return p; })(), showIdx: true },
            { type: 'vars', vals: { 'event time': t, 'max time seen': maxT, watermark: wm, 'windows emitted': emitted.length }, hl: { watermark: fireNow.length ? 'ok' : 'cur' } },
            { type: 'map', label: 'Window state (keyed state)', entries: entries().length ? entries() : [['(none)', '-']], hl: hlWin() }] });
        }
        var rest = Object.keys(counts).map(Number).sort(function (a, b) { return a - b; }).filter(function (st) { return !fired[st]; });
        rest.forEach(function (st) { fired[st] = true; emitted.push([label(st), counts[st]]); });
        var lateN = status.filter(function (x) { return x === 'late'; }).length;
        frames.push({ narr: 'The input ended, so the watermark jumps to infinity and the remaining windows are flushed' + (rest.length ? ' (' + rest.map(label).join(', ') + ')' : '') + '. Final: ' + emitted.length + ' windows emitted, <b>' + lateN + ' late event(s)</b> missed their window. Raising the allowed lateness would catch them but delay every result - accuracy vs speed.', parts: [
          { type: 'table', label: 'Emitted results', columns: ['window', 'count'], rows: emitted, hl: {} },
          { type: 'array', label: 'Events', values: ev, hl: hlEv(), showIdx: true }] });
        return frames;
      }
    },
    examples: [
      { title: 'Which window type for which question?', html: `${H.table(['Question', 'Window', 'Why'], [['Orders per minute for the ops wall display', 'Tumbling 1 min', 'Each event in exactly one bucket, simple'], ['Rolling 10-minute error rate, refreshed every 30 s', 'Sliding 10 min / 30 s', 'Overlap gives a smooth moving value (each event is in 20 windows)'], ['Length and value of a shopping session', 'Session, gap = 30 min', 'Window boundaries depend on user behaviour, not the clock'], ['Total sales since midnight', 'Tumbling 1 day, with early firing every 10 s', 'Show running total, final at day end']])}` },
      { title: 'Fraud detection rule, step by step', html: `<p>Rule: "the same card used in 3 or more countries within 1 minute".</p>
        <ol><li>Transactions flow into Kafka, partitioned by <code>cardId</code>.</li><li>Flink job <code>keyBy(cardId)</code> so one task holds all state for a card.</li><li>Per card, state = set of (country, eventTime) in the last 60 s; a timer evicts old entries.</li><li>On each event, if distinct countries &ge; 3: emit an alert to an alerts topic (and optionally call a model for a risk score first).</li><li>The authorisation service reads the alert and blocks the next transaction.</li></ol>
        <p>Latency from swipe to block: network + Kafka (10-50 ms) + Flink (&lt; 100 ms) = well under a second. Doing this in a nightly batch means the thief has already spent the money.</p>` },
      { title: 'Exactly-once, what it really means', html: `<p>The job reads offsets 100-199 from Kafka, updates counters, writes results to a database, then crashes before the next checkpoint. After restart it restores state from the checkpoint and re-reads from offset 100 again - the <b>state is rolled back</b>, so counters are not double-counted. But the <b>database write already happened</b>. To avoid duplicates in the sink you need either a <b>transactional sink</b> (two-phase commit tied to the checkpoint: pre-commit on barrier, commit when the checkpoint completes) or an <b>idempotent write</b> such as <code>UPSERT ... ON CONFLICT (window_id, key)</code>. "Exactly-once" = at-least-once delivery + idempotence/transactions, never magic.</p>` },
      { title: 'Choose: batch or streaming?', html: `${H.table(['Requirement', 'Batch', 'Stream', 'Pick'], [['Daily finance report for the CFO', 'ok', 'overkill', H.c('g', 'Batch')], ['Block a fraudulent payment before it settles', 'too late', 'ok', H.c('b', 'Stream')], ['Retrain recommender weekly', 'ok', 'no', H.c('g', 'Batch')], ['Live delivery-ETA map', 'too late', 'ok', H.c('b', 'Stream')], ['Dashboard that is 15 minutes behind is fine', 'micro-batch every 5-15 min', 'ok', H.c('y', 'Either; choose the simpler: micro-batch')]])}` }
    ],
    deepDive: `<p><b>Watermarks in practice.</b> A watermark is a metadata message flowing with the data: "no more events with time &lt; T expected". Each parallel source computes its own; downstream operators take the <b>minimum across inputs</b>, so one idle Kafka partition can freeze the whole job's progress - configure <b>idle-source detection</b>. Heuristic watermarks (bounded out-of-orderness) are simple; "perfect" ones only exist when sources are ordered. Allowed lateness keeps window state around after firing and re-emits updated results (downstream must handle retractions/upserts); beyond it events go to a <b>side output</b> for a batch repair job. Pick lateness from measured data: the p99.9 of (arrival time - event time).</p>
      <p><b>Checkpoints.</b> The coordinator injects barrier markers at sources; each operator, on receiving barriers from all inputs, snapshots its state asynchronously and forwards the barrier. When every operator acks, the checkpoint is complete (a consistent cut of the distributed computation). <b>Unaligned checkpoints</b> speed this up under backpressure by storing in-flight buffers. State backends: heap (fast, limited by RAM) vs <b>RocksDB</b> (spills to local SSD; incremental checkpoints upload only changed SST files). <b>Savepoints</b> are user-triggered, portable checkpoints used for upgrading code, rescaling and migrating.</p>
      <p><b>State and scaling.</b> State is partitioned into <b>key groups</b>; rescaling reassigns key groups to new parallel instances. Unbounded state is the classic outage: a join or dedup that never expires keys grows forever - always set <b>state TTL</b> or use timers. Hot keys (one celebrity user) overload one task: pre-aggregate locally then merge, or salt the key.</p>
      <p><b>Joins on streams.</b> Stream-stream joins buffer both sides for the time bound ("click within 30 min after impression"). Stream-table (enrichment) joins look up a changing dimension: via a broadcast state, an async lookup to a cache/DB (with timeouts and retries), or a temporal table join that uses the dimension's value as of event time. CDC streams are naturally changelog tables (insert/update/delete rows).</p>
      <p><b>Micro-batch vs continuous.</b> Spark Structured Streaming collects events into small batches (e.g. 1 s) and reuses the batch engine - high throughput, simple semantics, latency floor around a second (lower with newer real-time modes). Flink processes event-by-event with pipelined network buffers, giving tens of ms and finer windowing/state control. Kafka Streams is a library inside your service (no cluster) tightly coupled to Kafka. Pick by latency need, existing skills and operational appetite; managed offerings (Confluent Flink, Kinesis Data Analytics, Dataflow) remove most cluster work.</p>
      <p><b>Operating streams.</b> Watch: consumer lag, checkpoint duration/size/failures, backpressure, watermark lag, state size, GC. Plan for reprocessing: replay Kafka (retention) or read the lake/batch copy with the same code (Flink's unified bounded mode) - which is exactly the question the next topic settles.</p>`,
    aiEra: `<p><b>What AI changes:</b> streaming is where AI becomes <b>real-time</b>. Fraud and risk models score every event in-stream (embedded models or calls to an inference service with strict timeouts and a safe fallback rule), recommendation features such as "clicks in the last 5 minutes" are computed by Flink and written to an online <b>feature store</b>, and LLM agents consume event streams (support tickets, alerts) to summarise, classify and route. Streaming ingestion also keeps <b>vector indexes</b> and RAG knowledge bases fresh without nightly rebuilds. Event-driven agent architectures treat Kafka topics as the nervous system between agents and tools.</p>
      <p><b>Use AI as a partner:</b> ask it to generate adversarial event sequences (out-of-order, duplicate, late by 10 minutes, a card used in 3 countries in 59.9 s) to unit-test windowing logic, to explain a stuck watermark from your metrics, or to draft the Flink SQL for a rule you describe in words. Review every window boundary it writes - off-by-one on [start, end) is common.</p>
      <p><b>Where AI goes wrong:</b> it uses processing time because it is easier, ignores late data entirely, promises "exactly-once" without a transactional or idempotent sink, lets state grow without TTL, calls a slow LLM synchronously inside the hot path of a 50 ms pipeline, or recommends streaming where a 15-minute micro-batch would be cheaper and safer.</p>
      <p><b>What you must still own:</b> the latency requirement and its business cost, lateness/accuracy trade-off, idempotent sinks, state size budgets, and the incident playbook (what do we do when lag grows to 2 hours?).</p>`,
    problems: [{
      title: 'Choose Batch vs Streaming: Daily Reports vs Fraud Alerts',
      level: 'Medium', tags: ['batch vs stream', 'Flink', 'fraud', 'architecture decision'], companies: ['PayPal', 'Stripe', 'Visa'],
      statement: `<p>A payments company has two requirements from the business: (1) a <b>daily finance report</b> showing settled revenue per merchant, delivered by 7 a.m., and (2) <b>fraud alerts</b> that must block a suspicious card payment within <b>2 seconds</b>. Transactions arrive at 5,000/s (peak 20,000/s) through Kafka. For each requirement choose batch or streaming (or both), name the technologies, and explain correctness issues (late events, duplicates, restarts) and what you would do about them.</p>`,
      constraints: `5k-20k events/s; fraud decision budget 2 s end-to-end; finance numbers must reconcile to the cent with the ledger; events can arrive up to 10 minutes late (mobile retries); no duplicate alerts or lost transactions on restart.`,
      example: `<p>Card 4242 pays in Mumbai at 10:00:05, in London at 10:00:20, in New York at 10:00:41. Streaming rule "3 countries in 60 s" fires at 10:00:41 and the 4th payment is declined. The same data in the nightly batch would show the pattern at 02:00 the next day - after the money is gone.</p>`,
      brute: { why: `<p>Naive design A: one system for both - a nightly Spark job also "does fraud" (hours late, useless). Naive design B: stream-process <i>everything</i> including the finance report in a single always-on job, summing in memory with processing time. Late events fall in the wrong day, a restart without checkpoints loses counters, replays double count, and the numbers never reconcile with the ledger. Each requirement is forced into the wrong tool.</p>` },
      mcq: { q: 'Which is the best fit?', options: ['Fraud: nightly batch. Finance report: streaming', 'Fraud: streaming with keyed state. Finance report: batch from the immutable ledger/lake with late data included', 'Both: streaming only', 'Both: batch only, run every minute'], answer: 1, explain: 'Fraud is latency-critical (seconds), finance is correctness-critical (reconcile exactly); each gets the model that suits its cost of lateness and cost of error.' },
      hints: [`<p>Hint 1: Ask "what is the cost of being late?" for each requirement separately.</p>`, `<p>Hint 2: Fraud = Kafka -> Flink (keyed by card, event-time windows, state, checkpoints) -> alerts topic. Finance = batch job over the settled-ledger partitions.</p>`, `<p>Hint 3: Address lateness (watermark + side output), duplicates (idempotency keys, transactional sink), and why a batch job can recompute exactly while a stream gives an early approximation.</p>`],
      solution: {
        approach: `<p><b>Decision.</b> Use <b>streaming for fraud</b> and <b>batch for the finance report</b>, sharing the same Kafka log and lake as sources. The two requirements have opposite costs: being late by 30 minutes on fraud loses money, but being a few hours "late" on the finance report is harmless, while being <i>wrong by one cent</i> there is unacceptable. One engine cannot be optimal for both.</p>
          <p><b>Fraud path (seconds).</b> Authorisation service publishes each payment to a Kafka topic partitioned by <code>cardId</code>. A Flink job reads it with event-time watermarks (bounded out-of-orderness of ~5 s - fraud decisions favour speed over perfect completeness). <code>keyBy(cardId)</code>; keyed state holds recent (country, device, amount, time) with TTL of 10 minutes (RocksDB backend, incremental checkpoints every 30 s). Rules: velocity (&gt; N payments per minute), geo-impossibility (two far countries in one minute), and an embedded ML risk score enriched with features from an online store. It emits alerts/decisions to a topic through a transactional sink; the authorisation service blocks or step-up-challenges the next payment. If the job restarts, it restores the checkpoint and replays offsets, so rule state is intact and the idempotent alert key (<code>paymentId</code>) prevents duplicate alerts. The 2-second budget: Kafka ~20 ms + Flink ~50-200 ms + decision lookups ~50 ms, leaving large headroom; provide a fail-open/fail-safe policy if the stream is lagging.</p>
          <p><b>Finance path (hours).</b> The same events (plus settlement files from the bank) are landed into the lake (Iceberg/Parquet, partitioned by event date). At 02:00 an orchestrated Spark/warehouse SQL job reads a <b>sealed snapshot</b> of yesterday's settled transactions, deduplicates by transaction id, handles the 10-minute-late arrivals simply because it runs hours after midnight, joins merchant dimensions and writes <code>daily_revenue/dt=...</code> with partition overwrite (idempotent). Reconciliation checks compare totals to the ledger and block publication if they differ. Report ready by 03:30, comfortably before 7 a.m.</p>
          <p><b>Trade-offs.</b> Fraud accepts occasionally incomplete late data (a side output re-evaluates after the fact), the finance path accepts hours of delay for exactness. Operating both costs two stacks, mitigated by sharing the log, schemas and business logic libraries - and, if desired, unifying with a kappa-style Flink bounded/streaming job (covered in the next topic).</p>`,
        complexity: `<p>Fraud: O(1) per event with per-card state bounded by TTL (e.g. 20 events x 100 B x 100M active cards ≈ 200 GB spread over parallel RocksDB tasks). Finance: O(N) scan of one day's partition (~430M events), embarrassingly parallel.</p>`,
        followUps: ['How would you show the CFO a "today so far" figure during the day?', 'What if the ML model needs the last 90 days of history for a card in the streaming path?', 'How do you backtest a new fraud rule on last month\'s data using the same code?']
      }
    }]
  });

  /* ================= TOPIC 7: LAMBDA vs KAPPA ================= */
  topics.push({
    title: 'Lambda vs Kappa Architecture: Combining Batch and Streaming',
    analogy: `<p>A newspaper has two ways of telling you the news. The <b>morning paper</b> (batch) is carefully checked, complete and correct - but it is already hours old. The <b>live news ticker</b> (stream) is instant but quick and sometimes rough. <b>Lambda</b> is a newsroom that runs <i>both</i>: you read the ticker for the last few hours and the paper for everything before, and each night the paper replaces the ticker's rough notes with the corrected version. <b>Kappa</b> is a newsroom that says "keep just one team and one notebook of everything that ever happened; if we find a mistake in how we report, we re-read the whole notebook with the improved method and swap the front page".</p>`,
    explain: `<p>You now know batch (accurate, complete, slow) and streaming (fast, harder to make exact). Real products often need <b>both</b>: a dashboard that is <b>live</b> and numbers that are <b>right</b>. Two architecture patterns answer this.</p>
      <p><b>Lambda architecture</b> (Nathan Marz, ~2011) has three layers:</p>
      <ul>
        <li><b>Batch layer</b>: keeps the <b>immutable master dataset</b> (all raw events, append-only) and periodically <b>recomputes views from scratch</b> (e.g. nightly Spark). High accuracy, high latency. Because it recomputes everything, bugs and late data get fixed automatically.</li>
        <li><b>Speed layer</b>: processes only <b>recent</b> events in real time (Flink / Storm / Kafka Streams) into small incremental views. Low latency, maybe approximate.</li>
        <li><b>Serving layer</b>: answers queries by <b>merging</b> batch view (everything up to the last batch run) + speed view (everything since). When the next batch run finishes, the speed view for that period is discarded.</li>
      </ul>
      ${H.table(['Lambda: pros', 'Lambda: cons'], [['Accurate (batch recompute heals bugs and late data)', H.c('r', 'Two code bases for the same logic (batch + stream) that must agree')], ['Fast recent view from speed layer', H.c('r', 'Two systems to run, monitor, deploy; double cost')], ['Simple fault model: raw data is the truth', H.c('r', 'Merge logic in serving layer is subtle (double counting at the boundary)')]])}
      <p><b>Kappa architecture</b> (Jay Kreps, 2014) says: drop the batch layer. Everything is a <b>stream</b>.</p>
      <ul>
        <li>An append-only <b>log</b> (Kafka, with long or unlimited retention via tiered storage) is the source of truth.</li>
        <li>One streaming job computes the views. To change the logic or fix a bug: deploy <b>job v2</b>, let it <b>replay the log from the start</b> into a new output table, and when it catches up, <b>switch readers</b> to v2 and delete v1.</li>
        <li><b>One code base</b>, one system. Batch becomes "a stream that happens to end".</li>
      </ul>
      ${H.table(['Kappa: pros', 'Kappa: cons'], [['One pipeline, one language, one deployment', H.c('r', 'Replaying years of data through a stream engine is slow and costly')], ['Reprocessing is just "replay the log"', H.c('r', 'Needs very long log retention (or tiered storage + lake)')], ['No merge logic in serving', H.c('r', 'Heavy ad-hoc analytics on history is still better in a warehouse')]])}
      <p><b>Which one in an interview?</b></p>
      ${H.table(['Situation', 'Lean towards'], [['Logic is simple, streaming engine can express everything, data fits replay budget', H.c('g', 'Kappa')], ['Heavy historical ML/analytics, complex joins over years, existing batch estate', H.c('b', 'Lambda (or lakehouse batch + stream)')], ['Strong correctness required and late data common', 'Batch recompute as the source of truth (lambda), or kappa with long lateness + replay'], ['Small team, want fewest moving parts', 'Kappa or a unified engine / streaming lakehouse']])}
      <p><b>The 2026 reality: unified and incremental.</b> Pure lambda is considered heavy and pure kappa a purist ideal. Modern stacks <b>blur the line</b>: (1) engines with one API for both modes (Flink and Spark run the same code on bounded and unbounded input; Beam), (2) <b>lakehouse tables (Iceberg/Delta/Hudi) that accept streaming writes</b> and can be read as a batch table or incrementally, (3) <b>Kafka tiered storage</b> that makes keeping the log for months cheap, (4) <b>incremental materialized views</b> and streaming databases (Materialize, RisingWave, ClickHouse materialized views, dynamic tables) that maintain results as data arrives. The goal is the same: <b>fresh and correct, with one definition of the logic</b>.</p>`,
    clues: [
      '"real-time dashboard AND accurate historical numbers" -> lambda / kappa discussion',
      '"we need to fix a bug and recompute last year" -> immutable log + reprocessing (replay) or batch recompute',
      '"two code paths (batch and stream) keep disagreeing" -> classic lambda pain; consider kappa / unified engine',
      '"keep the raw events forever" -> append-only master dataset (object storage / Kafka tiered storage)',
      '"serving layer merges batch view and real-time view" -> lambda serving layer, watch the boundary double count',
      '"single pipeline", "streaming-first", "replay the Kafka topic" -> kappa',
      '"late events must correct earlier results" -> recompute window, retractions, or periodic batch correction'
    ],
    code: [
      { lang: 'python', run: true, title: 'Lambda in 30 lines: batch view + speed view merged at query time', code: `from collections import Counter

# The immutable master log: (offset, page). Offsets 0-5 are "yesterday", 6-9 are "today".
log = [(0, "home"), (1, "cart"), (2, "home"), (3, "home"), (4, "cart"), (5, "help"),
       (6, "home"), (7, "home"), (8, "cart"), (9, "help")]

# BATCH LAYER: recomputed from scratch over everything up to a cut-off offset (slow, exact)
def batch_view(upto):
    return Counter(page for off, page in log if off < upto)

# SPEED LAYER: counts only events after the batch cut-off (fast, small, incremental)
def speed_view(since):
    return Counter(page for off, page in log if off >= since)

# SERVING LAYER: merge the two. The boundary must be exact or we double count / miss events.
def query(cutoff):
    merged = batch_view(cutoff) + speed_view(cutoff)
    return dict(merged)

CUT = 6                                   # last batch run finished at offset 6
print("batch  view :", dict(batch_view(CUT)))
print("speed  view :", dict(speed_view(CUT)))
print("merged query:", query(CUT))
print("truth       :", dict(Counter(p for _, p in log)))
assert query(CUT) == dict(Counter(p for _, p in log))` },
      { lang: 'python', run: true, title: 'Kappa in 30 lines: fix a bug by replaying the log into a new version', code: `from collections import Counter

# Append-only log with long retention. 'bot' events should NOT be counted (we forgot at first!).
log = [(0, "home", False), (1, "home", True), (2, "cart", False), (3, "home", True),
       (4, "cart", False), (5, "home", False)]

def job_v1(events):
    # BUG: counts bots too
    c = Counter()
    for off, page, is_bot in events:
        c[page] += 1
    return c

def job_v2(events):
    # FIX: skip bot traffic
    c = Counter()
    for off, page, is_bot in events:
        if not is_bot:
            c[page] += 1
    return c

serving = {"live": job_v1(log)}          # readers currently see v1 output
print("v1 output (buggy):", dict(serving["live"]))

# Kappa reprocessing: run v2 over the WHOLE log from offset 0 into a NEW table, side by side
new_table = job_v2(log)
print("v2 output (after replay):", dict(new_table))

# Once v2 has caught up with the log head, flip the pointer atomically and delete v1's table
serving["live"] = new_table
print("readers now see:", dict(serving["live"]))` },
      { lang: 'yaml', check: false, title: 'Kappa-style infrastructure knobs (Kafka topic with tiered storage, 1 year of replay)', code: `# kafka topic config
topic: ad-clicks
partitions: 64
replication.factor: 3
retention.ms: 31536000000          # keep 1 year of events for reprocessing
remote.storage.enable: true        # tiered storage: old segments live in object storage
local.retention.ms: 86400000       # only the last day stays on broker disks
cleanup.policy: delete
min.insync.replicas: 2

# flink job versions run side by side during a replay
jobs:
  - name: clicks-agg-v1
    output: serving.clicks_agg_v1
    start-from: group-offsets
  - name: clicks-agg-v2
    output: serving.clicks_agg_v2
    start-from: earliest           # replay the whole log with the fixed logic` }
    ],
    codeTitle: ['Lambda merge (runs in your browser)', 'Kappa replay (runs in your browser)', 'Kappa infrastructure config'],
    viz: [{
      title: 'Lambda vs Kappa pipelines, box by box',
      input: 'both',
      inputLabel: 'show: lambda, kappa or both',
      gen: function (input) {
        var m = String(input).trim().toLowerCase();
        if (['lambda', 'kappa', 'both'].indexOf(m) < 0) throw new Error('Type lambda, kappa or both');
        var frames = [];
        function L(hn, he, tags) {
          return { type: 'graph', label: 'LAMBDA architecture', directed: true, height: 56, nodes: [
            { id: 'SRC', label: 'Events', x: 7, y: 28, shape: 'box', w: 11 },
            { id: 'LOG', label: 'Log + data lake (master data)', x: 27, y: 28, shape: 'box', w: 22 },
            { id: 'BAT', label: 'Batch layer (Spark, nightly)', x: 54, y: 9, shape: 'box', w: 22 },
            { id: 'SPD', label: 'Speed layer (Flink, live)', x: 54, y: 47, shape: 'box', w: 22 },
            { id: 'BV', label: 'Batch view', x: 79, y: 9, shape: 'box', w: 14 },
            { id: 'RV', label: 'Realtime view', x: 79, y: 47, shape: 'box', w: 14 },
            { id: 'SRV', label: 'Serving: merge', x: 92, y: 28, shape: 'box', w: 14 }
          ], edges: [['SRC', 'LOG'], ['LOG', 'BAT'], ['LOG', 'SPD'], ['BAT', 'BV'], ['SPD', 'RV'], ['BV', 'SRV'], ['RV', 'SRV']], hl: hn || {}, ehl: he || {}, tags: tags || {} };
        }
        function K(hn, he, tags) {
          return { type: 'graph', label: 'KAPPA architecture', directed: true, height: 56, nodes: [
            { id: 'SRC', label: 'Events', x: 8, y: 28, shape: 'box', w: 12 },
            { id: 'LOG', label: 'Kafka log (long retention)', x: 33, y: 28, shape: 'box', w: 24 },
            { id: 'V1', label: 'Stream job v1', x: 62, y: 10, shape: 'box', w: 16 },
            { id: 'V2', label: 'Stream job v2', x: 62, y: 46, shape: 'box', w: 16 },
            { id: 'T1', label: 'Table v1', x: 84, y: 10, shape: 'box', w: 12 },
            { id: 'T2', label: 'Table v2', x: 84, y: 46, shape: 'box', w: 12 },
            { id: 'APP', label: 'Readers', x: 96, y: 28, shape: 'box', w: 9 }
          ], edges: [['SRC', 'LOG'], ['LOG', 'V1'], ['LOG', 'V2'], ['V1', 'T1'], ['V2', 'T2'], ['T1', 'APP'], ['T2', 'APP']], hl: hn || {}, ehl: he || {}, tags: tags || {} };
        }
        if (m !== 'kappa') {
          frames.push({ narr: '<b>LAMBDA, step 1.</b> Every event is appended to the log / data lake - the immutable <b>master dataset</b>. Nothing is ever updated or deleted there. Everything else is a view derived from it.', parts: [L({ SRC: 'cur', LOG: 'ok' }, { 'SRC-LOG': 'ok' }, { LOG: 'append-only' })] });
          frames.push({ narr: '<b>Step 2 - two paths from the same data.</b> The <b>batch layer</b> will recompute the whole view from scratch (slow, exact). The <b>speed layer</b> processes new events immediately (fast, covers only the recent hours).', parts: [L({ BAT: 'cur', SPD: 'cur' }, { 'LOG-BAT': 'ok', 'LOG-SPD': 'ok' }, { BAT: 'hours', SPD: 'seconds' })] });
          frames.push({ narr: '<b>Step 3 - views.</b> The batch layer writes the <b>batch view</b> (complete up to last midnight). The speed layer writes a small <b>realtime view</b> (only since midnight).', parts: [L({ BV: 'ok', RV: 'ok' }, { 'BAT-BV': 'ok', 'SPD-RV': 'ok' }, { BV: 'to 00:00', RV: 'since 00:00' })] });
          frames.push({ narr: '<b>Step 4 - query.</b> The serving layer answers a question by <b>merging both views</b>: yesterday\'s exact numbers + today\'s live numbers. The user sees something both fresh and accurate.', parts: [L({ SRV: 'sel', BV: 'ok', RV: 'ok' }, { 'BV-SRV': 'ok', 'RV-SRV': 'ok' }, { SRV: 'batch + speed' })] });
          frames.push({ narr: '<b>Step 5 - the nightly fix.</b> After the next batch run the batch view now covers today as well, with late events included and any speed-layer approximation corrected, so the realtime view is <b>thrown away</b> and the cycle restarts. Price paid: <span class="c-r">two code bases</span> for the same logic.', parts: [L({ BAT: 'cur', BV: 'ok', RV: 'bad' }, { 'LOG-BAT': 'ok', 'BAT-BV': 'ok' }, { RV: 'discarded', BV: 'to now' })] });
        }
        if (m !== 'lambda') {
          frames.push({ narr: '<b>KAPPA, step 1.</b> Events go into a <b>Kafka log</b> that keeps them for a very long time (tiered storage in object storage makes this cheap). There is no separate batch system.', parts: [K({ SRC: 'cur', LOG: 'ok' }, { 'SRC-LOG': 'ok' }, { LOG: 'retain 1 year' })] });
          frames.push({ narr: '<b>Step 2.</b> <b>One</b> streaming job (v1) reads the log and maintains the output table continuously. Readers query that table - fresh results, one code path.', parts: [K({ V1: 'ok', T1: 'ok', APP: 'cur' }, { 'LOG-V1': 'ok', 'V1-T1': 'ok', 'T1-APP': 'ok' }, { V1: 'live', T1: 'serving' })] });
          frames.push({ narr: '<b>Step 3 - you find a bug</b> (or want new logic, say "ignore bots"). The old output is wrong. Instead of a separate batch recompute, deploy <b>job v2</b> with the fix.', parts: [K({ V1: 'bad', T1: 'bad', V2: 'cur' }, {}, { V1: 'bug found', V2: 'new logic' })] });
          frames.push({ narr: '<b>Step 4 - replay.</b> v2 starts reading the Kafka log <b>from offset 0</b> and writes a new table v2. v1 keeps serving readers meanwhile, so there is no downtime. Replay speed can be far above live speed because the data is already there.', parts: [K({ V2: 'cur', T2: 'cur', T1: 'ok' }, { 'LOG-V2': 'cur', 'V2-T2': 'cur', 'T1-APP': 'ok' }, { V2: 'from offset 0', T2: 'catching up' })] });
          frames.push({ narr: '<b>Step 5 - switch.</b> When v2 catches up with the head of the log, readers are pointed at table v2 and v1 plus its table are deleted. Cost: replaying history through a stream engine; benefit: <span class="c-g">one code base</span>.', parts: [K({ V2: 'sel', T2: 'sel', APP: 'ok', V1: 'done', T1: 'done' }, { 'T2-APP': 'ok', 'LOG-V2': 'ok', 'V2-T2': 'ok' }, { T2: 'serving now', T1: 'deleted' })] });
        }
        if (m === 'both') frames.push({ narr: '<b>Compare.</b> Lambda = accuracy by recompute, but two systems. Kappa = one system, accuracy by replay, but needs long retention and a stream engine strong enough for history. Modern teams often use a <b>streaming lakehouse</b>: one Flink job writes Iceberg tables that serve both live and historical queries.', parts: [
          { type: 'table', label: 'Lambda vs Kappa', columns: ['', 'Lambda', 'Kappa'], rows: [['Code bases', '2 (batch + stream)', '1'], ['Fix a bug', 'Re-run batch', 'Replay log with job v2'], ['History source', 'Master dataset in lake', 'Retained Kafka log (tiered)'], ['Operational cost', 'High', 'Lower'], ['Best at', 'Heavy history, ML, exactness', 'Simple fresh pipelines, small teams']], hl: { 0: 'cur' } }] });
        return frames;
      }
    }, {
      title: 'Lambda serving layer: batch view + speed view = answer',
      input: '10000 | 120 80 90 150',
      inputLabel: 'batch count so far | live counts per hour since the last batch run (max 12)',
      gen: function (input) {
        var sp = String(input).split('|');
        if (sp.length !== 2) throw new Error('Format: 10000 | 120 80 90 150  (batch count, a | sign, then counts per hour)');
        var batch = num(sp[0].trim(), NaN);
        var hrs = nums(sp[1], 12, 'Hourly counts must be numbers separated by spaces');
        if (isNaN(batch) || batch < 0) throw new Error('Batch count must be a number >= 0');
        var frames = [], speed = 0, i, vals;
        frames.push({ narr: 'The nightly batch job finished: the <b>batch view</b> says <b>' + batch + '</b> page views up to 00:00. It is exact but it will not change until tomorrow\'s run.', parts: [
          { type: 'bars', label: 'Views (batch, speed)', values: [batch, 0], texts: ['batch ' + batch, 'speed 0'], hl: { 0: 'ok' } }, { type: 'vars', vals: { 'batch view': batch, 'speed view': 0, 'query answer': batch } }] });
        for (i = 0; i < hrs.length; i++) {
          speed += hrs[i];
          frames.push({ narr: 'Hour ' + (i + 1) + ': <b>' + hrs[i] + '</b> new events are counted instantly by the speed layer. Speed view = <b>' + speed + '</b>. A user asking now gets batch + speed = <b>' + (batch + speed) + '</b>, with no waiting for midnight.', parts: [
            { type: 'bars', label: 'Views (batch, speed)', values: [batch, speed], texts: ['batch ' + batch, 'speed ' + speed], hl: { 1: 'cur' } },
            { type: 'vars', vals: { 'batch view': batch, 'speed view': speed, 'query answer': batch + speed }, hl: { 'query answer': 'sel' } }] });
        }
        var total = batch + speed;
        frames.push({ narr: 'Midnight: the batch job runs again over the whole master dataset and now covers these hours too: new batch view = <b>' + total + '</b> (and late events would be included too). The speed view for this period is <span class="c-r">discarded</span>. If we forgot to discard it, the query would return ' + (total + speed) + ' - the classic <b>double-counting at the boundary</b> bug.', parts: [
          { type: 'bars', label: 'Views after the new batch run', values: [total, 0], texts: ['batch ' + total, 'speed 0'], hl: { 0: 'ok' } },
          { type: 'vars', vals: { 'new batch view': total, 'speed view': 0, 'correct answer': total, 'if speed kept (wrong)': total + speed }, hl: { 'correct answer': 'ok', 'if speed kept (wrong)': 'bad' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Ad click analytics, two ways', html: `<p>Need: live clicks per campaign (updates within 5 s) and exact billing numbers.</p>
        <p><b>Lambda:</b> Kafka -> (a) Flink increments Redis/Druid counters for "today"; (b) hourly Spark job re-aggregates the raw clicks from the lake, dedups bots and late clicks, writes billing tables. Dashboard = billing table + Redis delta. Finance trusts only the batch tables.</p>
        <p><b>Kappa:</b> Kafka (30-day retention + tiered storage) -> one Flink job with event-time windows and 24 h allowed lateness, writing to a warehouse/OLAP table via upserts; billing reads the same table after the window closes. Fix a bug by replaying 30 days into <code>clicks_v2</code>.</p>` },
      { title: 'The boundary double-count bug', html: `<p>Batch run finished covering events up to <b>offset 5000</b>. The speed layer was told to "forget everything before the cut-off", but it has a 200-event buffer for events that arrived late. Result: offsets 4800-5000 appear in both views, query = true + 200. Fixes: define the cut-off in <b>offsets/event-time</b> (not wall clock), have the batch job publish its cut-off atomically with the view, and make the serving merge filter speed rows by <code>offset &gt;= cutoff</code>. Make both layers use the same <b>deduplication key</b> (event id).</p>` },
      { title: 'How long would a Kappa replay take?', html: `<p>Log: 400 TB compressed over 1 year; a Flink cluster reads at 5 GB/s aggregate while also keeping state. Replay = 400,000 GB / 5 GB/s = 80,000 s ≈ <b>22 hours</b>. If the new logic needs state keyed by user (billions of keys), RocksDB size and checkpoints dominate, and 22 h becomes days. Options: replay only the last 30-90 days, replay from the lake (Parquet scans are much faster than Kafka reads) using the same job in bounded mode, or snapshot intermediate state. Do this arithmetic out loud in the interview; it is what separates "kappa is elegant" from "kappa is feasible".</p>` },
      { title: 'Real systems', html: `${H.table(['Company / tool', 'Pattern'], [['LinkedIn (origin of Kafka, Kappa idea)', 'Log as the backbone; reprocess by replay'], ['Twitter (early analytics)', 'Classic lambda: Hadoop batch + Storm speed layer'], ['Uber, Netflix', 'Kafka + Flink streaming, with lakehouse tables for history (unified)'], ['Flink + Iceberg/Paimon "streaming lakehouse"', 'One job writes tables that are both fresh and queryable as batch'], ['Materialize / RisingWave / ClickHouse MVs', 'Incrementally maintained views replace hand-built speed layers']])}` }
    ],
    deepDive: `<p><b>Why lambda hurts.</b> The same business rule ("what counts as an active user") is implemented twice, in different frameworks, with different semantics for time, nulls and rounding. Differences surface as "the dashboard says 1,204,331 but the report says 1,198,770". Mitigations: share logic via a common library or SQL, use one engine with batch and streaming modes (Flink SQL / Spark SQL), keep the speed layer deliberately <b>simple</b> (approximate counts only) and treat the batch layer as truth, and test both with the same golden dataset and a continuous <b>reconciliation job</b> that diffs the two.</p>
      <p><b>Why kappa is not free.</b> (1) <b>Retention cost</b>: a year of raw events in Kafka is expensive unless tiered storage offloads old segments to object storage. (2) <b>Replay throughput</b>: stream engines optimise for latency, not scanning terabytes; unbounded-state jobs reprocess slowly. (3) <b>Ordering and time</b>: replay must be deterministic - event-time semantics, no reliance on wall clock or external lookups whose values changed (use temporal joins on versioned dimension data). (4) <b>Side effects</b>: a replay that re-sends emails or calls payment APIs is a disaster; write outputs to idempotent stores and keep side-effect emitters on live traffic only. (5) <b>Schema evolution</b>: 3-year-old events must still be readable - schema registry with compatible evolution.</p>
      <p><b>Event sourcing connection.</b> Kappa generalises event sourcing: state is a fold over the event log, and current state tables are caches of that fold. CQRS fits naturally - commands append events, read models are streaming projections you can rebuild any time. The cost is a mindset shift: <i>data is facts that happened</i>, never edited in place; corrections are new compensating events.</p>
      <p><b>The unified/streaming-lakehouse view.</b> Table formats make a table both a changelog (read incremental commits) and a snapshot (read as of time T). A Flink job upserts CDC data into Iceberg/Paimon every minute (freshness ~1-5 min); batch engines read the same tables for backfills and ML. Late data becomes a normal upsert; correctness comes from the table's transactional commits and keys, not from two parallel pipelines. Where sub-second freshness is required, a real-time OLAP store (Pinot/Druid/ClickHouse) sits in front, fed by the same stream.</p>
      <p><b>Decision checklist.</b> (a) Freshness SLA: seconds, minutes or hours? Hours -> plain batch. (b) Correctness: can results be revised later (retractions) or must they be final? (c) Volume of history needed to recompute vs retention budget. (d) Logic complexity: do you need joins/ML over years that stream engines handle poorly? (e) Team skills and on-call budget. Document the choice and the reconciliation strategy; a design without a plan for late data and reprocessing is incomplete.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI systems need both freshness and a trustworthy history, which is the lambda/kappa problem wearing new clothes. <b>Feature stores</b> keep an offline store (batch, for training on history) and an online store (stream-updated, for serving) and must guarantee <b>training-serving consistency</b> - the same feature definition computed in both, exactly the "two code bases" trap. Teams now define features once (SQL / declarative) and let a platform run them in batch and streaming. RAG pipelines follow the same shape: batch re-embedding of the whole corpus when the embedding model changes (a kappa-style replay) plus streaming updates for new documents. LLM-based agents consume event logs, and logged agent traces are replayed for evaluation.</p>
      <p><b>Use AI as a partner:</b> ask it to compare lambda, kappa and a streaming-lakehouse design for your exact numbers (volume, freshness SLA, retention) and to write the reconciliation query that diffs two views. Have it draft a replay runbook (steps, rollback, how to verify v2 equals v1 on a sample) and then check each step for side effects.</p>
      <p><b>Where AI goes wrong:</b> it recites "kappa is simpler, always use it" without checking replay time, or recommends lambda without noting the dual-maintenance cost; it forgets idempotent sinks during replay, or the batch/stream cut-off boundary; it mixes processing time into "deterministic" jobs.</p>
      <p><b>What you must still own:</b> the freshness/accuracy contract, the reprocessing plan with real numbers (hours of replay, cost), and how you will know the two paths disagree.</p>`,
    problems: [{
      title: 'Design Real-Time + Accurate Ad Click Counts (Lambda or Kappa?)',
      level: 'Hard', tags: ['lambda', 'kappa', 'streaming', 'batch', 'ad tech'], companies: ['Google', 'Meta', 'Amazon Ads'],
      statement: `<p>An ad platform receives <b>50,000 clicks/s</b> (4.3 billion/day). Advertisers want a dashboard of clicks per campaign that is at most <b>10 seconds</b> behind, and invoices must be <b>exactly correct</b> (bots removed, duplicates removed, late clicks up to 6 hours included). Product also changes the bot-filter rules every few weeks and asks to recompute the last 30 days. Choose and design the architecture, and explain how you handle late data, the cut-over between fresh and final numbers, and reprocessing.</p>`,
      constraints: `50k events/s (peak 150k); dashboard freshness 10 s; billing exact and auditable; late events up to 6 h; rules change monthly with 30-day recompute; cost-aware; small platform team.`,
      example: `<p>At 10:00:04 a click arrives with event-time 10:00:01 (delayed by a phone). The dashboard bumps campaign 7 by 1 within seconds. At 02:00 the billing job (with the final bot rules) decides whether the click is valid and sets the invoice amount. Dashboard numbers for yesterday are then <b>replaced by the final numbers</b> - advertisers see a small correction instead of a mismatch with the invoice.</p>`,
      brute: { why: `<p>Naive design: a single streaming job increments counters in a database for every click and that is also used for billing. Duplicates from client retries and at-least-once replays double count, late events past the window are dropped, bot-rule changes cannot be applied retroactively, and an operator bug permanently corrupts counters with no way to rebuild because raw events were not kept. Alternatively only a nightly batch: the dashboard is 24 h stale.</p>` },
      mcq: { q: 'What is the most important property that makes recompute (reprocessing) possible in both lambda and kappa?', options: ['A fast database', 'An immutable, replayable log / master dataset of raw events', 'More Kafka partitions', 'Exactly-once at the sink only'], answer: 1, explain: 'If raw events are kept immutably, any view can be rebuilt with corrected logic; without them, errors are permanent.' },
      hints: [`<p>Hint 1: Two different consumers have different needs: the dashboard wants speed, billing wants exactness. Keep the raw clicks forever either way.</p>`, `<p>Hint 2: Consider a streaming-lakehouse flavour of kappa: one Flink job with event-time windows and an idempotent sink for the dashboard, and the same logic running in bounded mode over the lake for billing/backfill.</p>`, `<p>Hint 3: Address the cut-over (final replaces provisional by day), deduplication by click id, late data window, rule-version tagging, and how to verify the two paths agree.</p>`],
      solution: {
        approach: `<p><b>Architecture (unified kappa with a batch-correct final).</b> Clicks flow from ad servers to Kafka (partitioned by campaignId, 64+ partitions, 7-day broker retention with tiered storage to object storage). A single stream sink also lands every raw click (with an id, event time, and ingestion time) into an Iceberg table in the lake partitioned by event date: this is the <b>immutable master dataset</b>. Raw data is never edited.</p>
          <p><b>Speed path (dashboard, ≤ 10 s).</b> A Flink job reads Kafka, dedups by <code>clickId</code> using keyed state with a 6-hour TTL, applies the <b>current</b> bot filter (a versioned rule set broadcast to all tasks), and aggregates 10-second tumbling event-time windows per campaign (watermark lateness ~30 s for the live view). Results are upserted (key = campaign + window start) into a real-time OLAP store (Pinot/Druid/ClickHouse) for the dashboard; replays are harmless because upserts are idempotent. These numbers are labelled <b>provisional</b>.</p>
          <p><b>Final path (billing, exact).</b> At the end of each event-day plus the 6-hour lateness bound, a batch job (Spark or the <i>same Flink logic in bounded mode</i>, so the business rule is written once, as shared SQL/library code) reads the sealed day partition from the lake, dedups by clickId, applies the <b>rule version in force for that invoice</b>, and writes <code>billing_clicks</code> by overwriting the day partition (idempotent). The dashboard store then replaces the provisional rows for that day with the final ones (a "correction" step), and the invoice uses only final data. A reconciliation job compares provisional vs final per campaign; a deviation over, say, 1% raises an alert (it means the stream logic or lateness setting drifted).</p>
          <p><b>Reprocessing 30 days.</b> Because raw clicks are in the lake, a rule change triggers a backfill: re-run the batch/bounded job over 30 daily partitions (about 130 billion clicks; parallel across days, a few hours on a few hundred cores) into new versioned tables, verify against a sample, then flip the dashboard/invoice views to the new version. No need to replay Kafka for 30 days (retention would be costly); replay from the lake instead (kappa+ style). This keeps one definition of the logic while giving a cheap, fast history path.</p>
          <p><b>Why not pure lambda or pure kappa.</b> Pure lambda duplicates logic and creates boundary bugs; pure kappa (Kafka-only replay) of 30 days x 4.3B clicks is slow and expensive. The hybrid (stream for fresh + the same logic over lake partitions for final) gets freshness, exactness and a cheap reprocess. Operational notes: monitor consumer lag, watermark delay, state size and the provisional-vs-final gap; the platform team runs one engine (Flink) plus the lakehouse.</p>`,
        complexity: `<p>Streaming: O(1) per click with dedup state ≈ 50k/s x 21,600 s x ~40 B ≈ 43 GB across tasks. Batch day: 4.3B clicks scanned (~0.5 TB columnar) in minutes on ~200 cores. 30-day backfill ≈ 15 TB scan, hours.</p>`,
        followUps: ['How do you prevent advertisers from seeing numbers that go down after correction?', 'What changes if late data can be up to 30 days (e.g., offline conversions)?', 'How would you test that the streaming and batch implementations produce identical results?']
      }
    }]
  });

  /* ================= PRACTICE ================= */
  practice.push({
    title: 'Pick the Storage: Block, File or Object?', level: 'Easy', tags: ['object storage', 'basics'], companies: ['Amazon', 'Microsoft'],
    statement: `<p>For each workload choose <b>block</b>, <b>file</b> or <b>object</b> storage and say why: (a) the boot disk and data files of a PostgreSQL server, (b) 40&nbsp;TB of user-uploaded videos served over the internet, (c) a shared folder of Word documents that 200 office computers open as a network drive, (d) nightly database backups kept for 7 years, (e) the training images for an ML model read by 100 GPU workers.</p>`,
    constraints: `Think in terms of access pattern (edit in place or whole-object), scale, latency and cost.`,
    example: `<p>(a) <b>Block</b> - the database edits pages in place and needs sub-millisecond latency. (b) <b>Object</b> - whole-file reads over HTTP, unlimited scale, CDN friendly. (c) <b>File</b> - shared hierarchical folder semantics. (d) <b>Object</b> with archive tier - cheap and durable. (e) <b>Object</b> - massive parallel reads of immutable files.</p>`,
    brute: { why: `<p>The naive answer is "put everything on one big shared disk / network drive". Databases suffer latency from a file share, videos can't scale across the internet from one server, and 7 years of backups on expensive block volumes cost 5-10x more than object archive tiers.</p>` },
    mcq: { q: 'Which statement about object storage is TRUE?', options: ['You can edit bytes 100-200 of an object in place', 'Objects are addressed by key inside a flat namespace and are replaced as a whole', 'It has lower latency than block storage', 'It is only good for small files'], answer: 1, explain: 'Object stores give HTTP access by key and whole-object replace semantics; they trade low latency and in-place edits for scale, durability and low cost.' },
    hints: [`<p>Hint 1: Ask "does the workload modify the middle of a file, or write and read whole files?"</p>`, `<p>Hint 2: Databases and boot disks need block devices; shared folders need a file protocol (NFS/SMB); everything else that is big and mostly immutable is an object-store candidate.</p>`, `<p>Hint 3: Add storage classes and lifecycle rules for the backup case (cold data), and a CDN for the video case.</p>`],
    solution: {
      approach: `<p>(a) <b>Block storage</b> (EBS-like, SSD): databases do small random in-place reads/writes and need the lowest latency and fsync guarantees. (b) <b>Object storage</b> with a CDN in front: videos are written once, read many times in whole or by byte range, and scale to petabytes cheaply; transcoded renditions are separate objects. (c) <b>File storage</b> (NFS/SMB/EFS): clients expect folders, locking and in-place edits through a shared mount. (d) <b>Object storage with lifecycle to an archive tier</b>: backups are immutable, rarely read and need very high durability at the lowest cost; enable versioning/object-lock for ransomware protection. (e) <b>Object storage</b> (optionally with a caching layer or parallel file system in front for hot epochs): 100 workers can read different objects in parallel without a single file server bottleneck. Key trade-off in all answers: latency and in-place edits vs scale, durability and cost.</p>`,
      complexity: `<p>Not algorithmic. Cost order per GB: archive object &lt; standard object &lt; file &lt; block SSD. Latency order is the reverse.</p>`
    }
  });

  practice.push({
    title: 'Why Not Store Profile Photos in the Database?', level: 'Easy', tags: ['object storage', 'metadata', 'CDN'], companies: ['Meta', 'Zomato'],
    statement: `<p>A junior engineer stores user profile photos (200&nbsp;KB each) as BLOB columns in the <code>users</code> table of the main MySQL database. The app has 20M users and the database is now slow and backups take 14 hours. Explain what is wrong and propose the fix, including the new upload and download flow.</p>`,
    constraints: `20M users, 200 KB average photo (about 4 TB), photos change rarely, profile pages are read very often.`,
    example: `<p>Every <code>SELECT * FROM users</code> now drags 200 KB per row through the buffer pool, evicting hot data. Fix: store photo bytes in an object store, keep only <code>photo_key</code> in the row, serve through a CDN.</p>`,
    brute: { why: `<p>BLOBs inside the OLTP database inflate table size to ~4 TB, make backups and replication slow, flood the buffer pool and network with large payloads that are cache-unfriendly, and prevent serving through a CDN. The database also costs 5-10x more per GB than object storage.</p>` },
    mcq: { q: 'What should the users table store after the fix?', options: ['The photo bytes in a BLOB', 'A base64 string of the photo', 'The object key (and maybe size/content-type) of the photo in the object store', 'Nothing - the photo is not linked to the user'], answer: 2, explain: 'Keep small structured metadata in the database; keep large unstructured bytes in object storage and reference them by key.' },
    hints: [`<p>Hint 1: Separate bytes from metadata. Which store is cheap and huge, which is fast and transactional?</p>`, `<p>Hint 2: Upload with a pre-signed URL so the bytes skip your app servers; download through a CDN.</p>`, `<p>Hint 3: Plan a migration: copy existing BLOBs to the bucket in batches, write the key, verify checksums, then drop the BLOB column.</p>`],
    solution: {
      approach: `<p><b>Diagnosis:</b> large binary data in an OLTP row store hurts caching, backup size, replication lag and cost, and ties image serving to database capacity. <b>New flow:</b> (1) Client asks the API for an upload URL; the API authenticates, creates a key like <code>avatars/{userId}/{version}.jpg</code>, and returns a short-lived pre-signed PUT URL. (2) Client uploads straight to the bucket (with size/content-type conditions). (3) On success the client calls <code>PATCH /me</code> with the key (or an ObjectCreated event updates the row). A worker generates 64/256/1024 px thumbnails. (4) The users table stores <code>avatar_key</code> and <code>avatar_version</code>; pages reference <code>https://cdn.example.com/avatars/...?v=3</code>. The CDN caches with a long TTL; a new version changes the URL so no purge is needed. <b>Migration:</b> background job copies BLOBs to the bucket in batches with checksum verification, switches reads to the CDN URL behind a feature flag, and finally drops the column; a 14-hour backup becomes minutes because the DB shrinks from ~4 TB to a few GB of metadata.</p>`,
      complexity: `<p>Database size drops from ~4 TB to roughly 20M x 100 B ≈ 2 GB of rows. Reads are served by the CDN at near-zero cost to the database.</p>`
    }
  });

  practice.push({
    title: 'Build an Inverted Index by Hand', level: 'Easy', tags: ['inverted index', 'search'], companies: ['Google', 'Elastic'],
    statement: `<p>Given the documents <b>1</b>: "red running shoes", <b>2</b>: "blue running socks", <b>3</b>: "red wool socks", <b>4</b>: "wool hiking socks" build the inverted index (term -> sorted doc ids). Then answer the queries <code>red AND socks</code>, <code>wool OR running</code>, and <code>socks AND NOT red</code> without scanning the documents again.</p>`,
    constraints: `All lowercase, no stop words, no stemming. Use sorted postings lists and set operations.`,
    example: `<p>Index: red [1,3], running [1,2], shoes [1], blue [2], socks [2,3,4], wool [3,4], hiking [4]. <code>red AND socks</code> = [1,3] ∩ [2,3,4] = <b>[3]</b>.</p>`,
    brute: { why: `<p>Brute force scans every document for every query: O(total words) per query. With 20M documents that is far too slow. The index does the scanning once, ahead of time.</p>` },
    mcq: { q: 'How is the AND of two postings lists computed efficiently?', options: ['Re-read all documents', 'Walk both sorted lists with two pointers and keep common ids', 'Sort the union of all documents', 'Multiply their lengths'], answer: 1, explain: 'Sorted lists can be intersected in O(a+b) with two pointers (or faster with skip pointers).' },
    hints: [`<p>Hint 1: For each word, collect the ids of documents containing it.</p>`, `<p>Hint 2: AND = intersection, OR = union, NOT = difference. Sorted lists make these linear merges.</p>`, `<p>Hint 3: Start with the shortest list for AND queries to reduce work.</p>`],
    solution: {
      approach: `<p>Walk the documents once and append the doc id to each of its words' lists: red [1,3]; running [1,2]; shoes [1]; blue [2]; socks [2,3,4]; wool [3,4]; hiking [4]. Queries: (1) <code>red AND socks</code>: intersect [1,3] and [2,3,4] with two pointers (1&lt;2 advance left; 3 vs 2 advance right; 3=3 match; end) = [3]. (2) <code>wool OR running</code>: merge [3,4] and [1,2] = [1,2,3,4]. (3) <code>socks AND NOT red</code>: [2,3,4] minus [1,3] = [2,4]. No document text is read at query time. In a real engine the postings also hold term frequencies and positions for ranking and phrase queries.</p>`,
      complexity: `<p>Build O(total words). Each AND/OR/NOT query O(sum of the postings lengths touched), independent of corpus size.</p>`
    }
  });

  practice.push({
    title: 'Batch, Stream or Both? Classify Eight Workloads', level: 'Easy', tags: ['batch vs stream', 'decision'], companies: ['Uber', 'Stripe'],
    statement: `<p>Classify each as batch, stream, or hybrid and justify in one line: (1) monthly payroll, (2) detect a stolen credit card, (3) recompute search ranking model weights weekly, (4) live sports score ticker, (5) "customers also bought" shown on the product page, updated hourly, (6) alert when a server's error rate exceeds 5% for 3 minutes, (7) GDPR data export on request, (8) real-time fleet map plus nightly driver payouts.</p>`,
    constraints: `Use the question "what is the cost of the result being late?".`,
    example: `<p>(1) Batch - runs once a month, correctness over speed. (2) Stream - decision needed in seconds. (8) Hybrid - map is streaming, payouts are batch.</p>`,
    brute: { why: `<p>The weak answer is "streaming for everything because it is modern". That means paying for an always-on cluster, handling late data and state complexity, for jobs (payroll, weekly training) that run happily once and finish.</p>` },
    mcq: { q: 'The best single question to decide batch vs stream is:', options: ['Which tool is newer?', 'What is the business cost of the result arriving late?', 'How many servers do we have?', 'Which language do we prefer?'], answer: 1, explain: 'If lateness is costly (fraud, alerts) choose streaming; if minutes to hours are fine, batch (or micro-batch) is cheaper and simpler.' },
    hints: [`<p>Hint 1: Put a number on acceptable delay: seconds, minutes, hours, days.</p>`, `<p>Hint 2: Seconds -> stream. Hours or more -> batch. Minutes -> micro-batch / either.</p>`, `<p>Hint 3: Some systems need both: a live provisional view and a final correct one (see lambda/kappa).</p>`],
    solution: {
      approach: `<p>(1) Batch: runs monthly on complete data. (2) Stream: a 30-minute-late decision means the thief has spent the money; use keyed state in Flink. (3) Batch: training on a week of data, no latency need. (4) Stream: viewers expect seconds. (5) Batch (hourly) or micro-batch: a recommendation can be an hour stale. (6) Stream: sliding window on error rate with a 3-minute "for" duration in the rule engine. (7) Batch / on-demand job: a query over stored data, minutes to hours acceptable. (8) Hybrid: vehicle positions flow through streaming for the live map, while payouts are a nightly batch over the sealed, reconciled trips. General rule: choose the slowest model that still meets the business latency requirement, because slower is simpler, cheaper and easier to make exactly correct.</p>`,
      complexity: `<p>Not algorithmic. Cost trade-off: streaming = always-on resources and state; batch = pay per run.</p>`
    }
  });

  practice.push({
    title: 'Design a Resumable File Upload Service', level: 'Medium', tags: ['multipart', 'object storage', 'resumable', 'mobile'], companies: ['Dropbox', 'Google', 'Box'],
    statement: `<p>Design the upload part of a cloud-drive app. Files up to <b>50&nbsp;GB</b>, users on flaky Wi-Fi/mobile networks, uploads must resume after app restarts, integrity must be verified, and the same file uploaded twice should not waste storage. Describe the API, how chunking works, where the state lives and how you complete the upload.</p>`,
    constraints: `10M uploads/day, avg 80 MB, max 50 GB; interruptions common; integrity mandatory; storage cost matters; client may switch devices mid-upload.`,
    example: `<p>A 1&nbsp;GB file is cut into 8&nbsp;MB chunks (125 chunks). Network drops after chunk 63. The client asks "which chunks do you have?", gets 1-63, and sends 64-125. The server verifies the hash and creates the file.</p>`,
    brute: { why: `<p>A single <code>POST</code> of the whole file through an app server: any network blip restarts from zero (a 50 GB file never finishes on mobile), the app server buffers or streams huge bodies tying up connections, and there is no integrity or dedup check. Retrying 50 GB wastes bandwidth and cost.</p>` },
    mcq: { q: 'What lets the client resume after a crash?', options: ['A larger timeout', 'Server-side record of which chunk numbers (with checksums) have been stored for an uploadId', 'Compressing the file', 'Uploading from a second device only'], answer: 1, explain: 'A durable per-upload record of received parts lets the client query ListParts and send only the missing chunks.' },
    hints: [`<p>Hint 1: Break the file into fixed-size chunks and give the upload a session id.</p>`, `<p>Hint 2: Upload chunks directly to object storage with pre-signed part URLs; track parts and their hashes in metadata; complete with a manifest.</p>`, `<p>Hint 3: Dedup by content hash (SHA-256 of file or chunks) before storing; add expiry for abandoned sessions.</p>`],
    solution: {
      approach: `<p><b>API.</b> (1) <code>POST /uploads</code> {name, size, sha256 of the whole file if known, chunkSize} -> the service checks quota, and if a blob with the same content hash already exists, it just creates a metadata pointer (instant "upload", dedup). Otherwise it calls object-store <code>CreateMultipartUpload</code> and returns {uploadId, chunkSize, pre-signed URLs for the first parts}. (2) The client sends chunks in parallel (3-6 at a time) with <code>PUT</code> to the part URLs and keeps a local journal of finished parts; each part carries a content MD5/CRC the store verifies. (3) On resume the client calls <code>GET /uploads/{id}</code> (backed by ListParts) to learn finished parts, then requests URLs for the missing ones. (4) <code>POST /uploads/{id}/complete</code> with the manifest (partNumber, etag); the service completes the multipart upload, verifies total size and final hash, writes the file's metadata row (path, owner, blob key, size, hash, version) in one transaction, and emits an event for virus scan and previews. <b>State</b> lives in the object store (parts) plus a small uploads table (uploadId, user, status, expiry) so any server can serve any request, including from a second device. <b>Cleanup:</b> a lifecycle rule aborts multipart uploads untouched for 3 days. <b>Security:</b> short-lived signed URLs bound to the key and part number; encrypt at rest. Adaptive chunk size (larger on fast links) cuts request count; for files over 10,000 parts increase the chunk size.</p>`,
      complexity: `<p>Requests: file size / chunk size (50 GB / 64 MB ≈ 800 parts). Memory on clients: a few chunks. Server load: only small JSON calls, never file bytes.</p>`,
      followUps: ['How do you do delta sync so changing 1 MB of a 5 GB file does not re-upload everything?', 'How do you prevent two devices uploading the same path concurrently?']
    }
  });

  practice.push({
    title: 'Design a Log Search System (ELK-style) with Retention', level: 'Medium', tags: ['search', 'Elasticsearch', 'logs', 'retention', 'tiering'], companies: ['Datadog', 'Splunk', 'Elastic'],
    statement: `<p>Design centralized logging for 2,000 microservices producing <b>2&nbsp;TB of logs per day</b>. Engineers must search recent logs (last 3 days) in seconds, occasionally look back 30 days, and compliance requires keeping 1 year. Budget is limited. Describe ingestion, indexing, storage tiers and what you would NOT index.</p>`,
    constraints: `2 TB/day raw (~25k lines/s average, 100k/s bursts); search latency under 5 s on hot data; 1-year retention; PII must be masked; cost-sensitive.`,
    example: `<p>Query: <code>service:checkout AND level:ERROR AND "timeout" in the last 15 min</code> -> hits the hot tier index of today; a query for last month hits the warm tier; compliance requests restore from the archive in Parquet on object storage.</p>`,
    brute: { why: `<p>Index every field of every log line in a single Elasticsearch cluster with all data on SSD for a year: 2 TB/day x 365 = 730 TB raw, ~1+ PB indexed with replicas on premium disks - extremely expensive; heap pressure from huge shard counts and mapping explosion from free-form JSON make the cluster unstable; direct writes from services lose logs when it is overloaded.</p>` },
    mcq: { q: 'What is the standard way to keep old logs cheap but still searchable?', options: ['Keep all data on hot SSD nodes', 'Time-based indices with hot-warm-cold tiers and searchable snapshots/archives on object storage', 'Delete logs after 3 days', 'Store logs in the main SQL database'], answer: 1, explain: 'Time-partitioned indices roll over daily and move to cheaper tiers; old data can live as snapshots on object storage and be searched on demand.' },
    hints: [`<p>Hint 1: Put a durable buffer (Kafka) between producers and the index so bursts and outages don't lose logs.</p>`, `<p>Hint 2: Index only fields you filter on (service, level, trace id, timestamp) and keep the message as text; use daily rollover indices and tier them hot -> warm -> cold -> frozen/archive.</p>`, `<p>Hint 3: Control cardinality and mapping explosion, mask PII at the collector, sample verbose debug logs.</p>`],
    solution: {
      approach: `<p><b>Pipeline.</b> Agents on every node (Fluent Bit / Vector / OpenTelemetry collector) tail container logs, parse JSON, mask PII, add service/host/trace id, batch and compress, and ship to <b>Kafka</b> (topic per environment, partitioned by service; 3-day retention) which absorbs bursts and decouples producers from the indexers. <b>Indexer consumers</b> read Kafka and bulk-write to Elasticsearch/OpenSearch (5-15 MB bulks) and in parallel a second consumer writes compressed Parquet to object storage for the year-long archive and for batch analytics.</p>
          <p><b>Index design.</b> Data stream with daily (or size-based, ~30-50 GB per shard) rollover indices. Strict mapping: keyword for service, level, trace_id, host; date for @timestamp; text for message; unknown JSON fields stored but not indexed (flattened field) to prevent mapping explosion. Compression: ZSTD, <code>best_compression</code> codec for older tiers; disable doc-value/norms where unused. <b>Tiers:</b> hot (3 days, SSD, 1 replica, ~6 TB x 2) for fast search; warm (days 4-30, cheaper disks, 0-1 replica, force-merged) for occasional queries; frozen/searchable snapshots (days 31-365) on object storage, queried slowly on demand, or restored. ILM policy automates rollover and movement and deletes after 365 days. Compliance archive in Parquet is the system of record; the index is a convenience view.</p>
          <p><b>Operations.</b> Sample or drop DEBUG logs in production (often 50-70% of volume); per-service quotas to stop a chatty service from drowning others; dashboards on ingest lag, rejected bulks, shard count and heap; alerting on missing logs from a service. Trade-off: search-by-any-word over a year is slow/expensive by design; for tracing a request use trace ids; for metrics derive them from logs once, as time-series, instead of grepping.</p>`,
      complexity: `<p>Hot tier: ~6 TB raw/3 days x ~1.2 index overhead x 2 copies ≈ 15 TB SSD. Warm 27 days ≈ 55 TB x overhead. Cold in object storage ≈ 700 TB compressed (~100 TB with columnar+ZSTD). Query cost scales with shards touched, so always include a time range.</p>`,
      followUps: ['How do you correlate logs with traces and metrics?', 'How would you search PII-masked data for a legal request?']
    }
  });

  practice.push({
    title: 'Design a Metrics Monitoring System (Prometheus-style)', level: 'Medium', tags: ['time-series', 'monitoring', 'cardinality', 'alerting'], companies: ['Datadog', 'Google', 'Grafana'],
    statement: `<p>Design a monitoring platform for 5,000 servers/containers, each exposing ~500 metrics. Requirements: dashboards with 15-second resolution for the last 24&nbsp;h, 1-minute data for 30 days, 1-hour data for 2 years, alerting within 1 minute of a threshold breach, and protection against label (cardinality) explosions.</p>`,
    constraints: `5,000 targets x 500 series = 2.5M active series; scrape interval 15 s (≈ 167k samples/s); alert latency ≤ 60 s; single-region, HA required.`,
    example: `<p>Alert: <code>avg(cpu) &gt; 90 for 5m</code> on a host group. Dashboard: p99 latency per service over 6 hours at 15 s resolution (≈ 1,440 points per series).</p>`,
    brute: { why: `<p>One SQL table <code>(metric, labels JSON, ts, value)</code> with 167k inserts/s and queries that scan JSON labels; B-tree indexes thrash, 1-year retention needs deletes that bloat the table, dashboards over 2 years of raw data read billions of rows, and a developer adding <code>user_id</code> as a label creates millions of series and brings the database down.</p>` },
    mcq: { q: 'Why keep min/max/sum/count rollups instead of only averages?', options: ['Averages are expensive to compute', 'Averages hide spikes and cannot be recombined correctly across different bucket sizes', 'Rollups are required by SQL', 'Only for compression'], answer: 1, explain: 'Max preserves spikes, and sum+count allow correct re-aggregation (avg = sum/count) across buckets.' },
    hints: [`<p>Hint 1: Compute the raw rate and size: samples/s x bytes per sample. Is one node enough?</p>`, `<p>Hint 2: Pull-based scrapers + a TSDB with a local head block, WAL, compressed blocks; recording rules create 1-min and 1-h rollups; separate rule evaluator and alert manager.</p>`, `<p>Hint 3: HA via two identical scrapers; long-term storage in object storage; enforce a series limit per tenant and per metric.</p>`],
    solution: {
      approach: `<p><b>Collection.</b> Service discovery (Kubernetes/Consul) feeds two identical Prometheus-compatible scrapers that pull <code>/metrics</code> every 15 s (HA pair; both scrape, dedup at query time). 2.5M series x 4 samples/min ≈ 167k samples/s, which a single well-sized node handles (~1.4 bytes/sample compressed ≈ 20 GB/day raw). <b>Storage.</b> Local TSDB: in-memory head block (2 h) with a WAL, then immutable compressed blocks; <b>remote-write</b> to a long-term clustered store (Mimir/Thanos/VictoriaMetrics) that replicates 3x and keeps blocks in object storage. <b>Retention tiers</b> via recording rules/compactor downsampling: raw 15 s for 24 h-7 d, 1-minute (min/max/sum/count) for 30 days, 1-hour for 2 years; each tier is a separate resolution queried automatically by dashboard range.</p>
          <p><b>Alerting.</b> A rule evaluator runs every 15-30 s against the freshest data (local store, not the remote one) and applies a state machine: inactive -> pending -> firing after the "for" duration; an Alertmanager dedups across the HA pair, groups related alerts (one page per cluster issue), silences and routes to on-call. Add "absent()" and scrape-failure alerts and a dead-man's-switch heartbeat to detect a broken monitoring system itself. <b>Cardinality guard.</b> Per-tenant limits on active series (e.g. 2M), label-count and label-length limits, drop rules for banned labels (user_id, request_id), and a dashboard of top series by cardinality; new metrics from CI are reviewed. <b>Query.</b> Dashboards hit a query frontend that splits ranges, caches results and fans out to shards; heavy queries are rate-limited.</p>`,
      complexity: `<p>Ingest 167k samples/s ≈ 20 GB/day compressed; 2 years of hourly rollups ≈ 2.5M series x 17,520 points x ~1.5 B ≈ 65 GB. Query cost proportional to series x points in range.</p>`,
      followUps: ['How do you shard when series exceed 100M?', 'How would you monitor serverless functions that live for 200 ms?']
    }
  });

  practice.push({
    title: 'Diagnose a Slow Spark Job: Skew, Shuffle and Small Files', level: 'Medium', tags: ['Spark', 'skew', 'shuffle', 'performance'], companies: ['Databricks', 'Netflix', 'Airbnb'],
    statement: `<p>A nightly Spark job joins 3&nbsp;B <code>events</code> with a 20&nbsp;MB <code>products</code> table and groups by <code>product_id</code>. It used to take 30 minutes and now takes 4 hours. The Spark UI shows 199 of 200 reduce tasks finishing in 2 minutes, one task running 3.5 hours with 40 GB of shuffle read; the input folder now contains 400,000 files of ~500 KB each. Explain the likely causes and fixes.</p>`,
    constraints: `Cluster of 100 cores, input in Parquet on object storage, job must finish within 1 hour, same correctness.`,
    example: `<p>One product ("gift card") accounts for 25% of events - all its rows hash to one reducer (data skew). The small files make the scan slow too (400k tasks / listing overhead).</p>`,
    brute: { why: `<p>Naively "add more nodes" or raise <code>shuffle.partitions</code>: the hot key still lands in a single partition, so the straggler task is just as slow, while 400k tiny input files keep creating tiny tasks and listing overhead. Money is spent without removing the bottleneck.</p>` },
    mcq: { q: 'Which change most directly removes the join shuffle for a 20 MB table?', options: ['Increase executor memory only', 'Broadcast the small table to every executor (broadcast join)', 'Use groupByKey', 'Coalesce to one partition'], answer: 1, explain: 'A broadcast join ships the small table to all executors, so the big side never needs to be shuffled by the join key.' },
    hints: [`<p>Hint 1: One task takes forever while others finish - what is that symptom called?</p>`, `<p>Hint 2: Small side of a join: broadcast it. Skewed group-by: pre-aggregate locally, salt the hot key, or let Adaptive Query Execution split skewed partitions.</p>`, `<p>Hint 3: Fix the input side too: compact small files to 128-256 MB, and make sure queries prune partitions and columns.</p>`],
    solution: {
      approach: `<p><b>Diagnosis from the UI:</b> a single straggler with 40 GB shuffle read = <b>data skew</b> on a hot key; 400,000 tiny input files = <b>small-files problem</b> (task scheduling and object-store listing overhead dominate the scan). <b>Fixes in order:</b> (1) <b>Broadcast the 20 MB products table</b> (<code>broadcast(products)</code> or a broadcast hint, and a high <code>autoBroadcastJoinThreshold</code>) so the 3 B-row side is not shuffled for the join at all. (2) For the <code>groupBy(product_id)</code>, rely on the map-side partial aggregation (DataFrame aggregation does this; avoid groupByKey), and for the hot key apply <b>salting</b>: aggregate by (product_id, salt 0..19) first, then aggregate again by product_id, or enable AQE skew-join/partition coalescing (<code>spark.sql.adaptive.enabled</code>, skewedPartitionFactor). (3) <b>Compact the input</b>: a compaction job (or Iceberg rewrite_data_files) merges files into 128-256 MB Parquet files; write with a controlled number of output partitions. (4) Read only needed columns and partitions (pruning, predicate pushdown). (5) Re-check partition counts so tasks process ~100-200 MB. Expected result: stage time drops from hours to minutes because work is evenly spread and tasks are neither tiny nor giant.</p>`,
      complexity: `<p>Shuffle volume drops from ~full dataset to partial aggregates (a few GB); wall time is bounded by total work / cores (≈ 15-25 min) rather than the straggler.</p>`
    }
  });

  practice.push({
    title: 'Sessionize Clickstream in Real Time with Flink', level: 'Medium', tags: ['Flink', 'session windows', 'watermark', 'state'], companies: ['Netflix', 'Pinterest', 'Adobe'],
    statement: `<p>Clicks arrive from web and mobile via Kafka at 200k events/s with event timestamps that can be up to 2 minutes out of order. Compute <b>user sessions</b> (a session ends after 30 minutes of inactivity) and emit per-session statistics (page count, duration, last page) as soon as a session closes. Design the job, state and failure handling.</p>`,
    constraints: `200k events/s; 50M concurrent active users; lateness up to 2 min; exactly-once into the sink; state must not grow without bound.`,
    example: `<p>User u7 clicks at 10:00, 10:10, 10:25, then at 11:05: the first three form one session (gaps &lt; 30 min), the 11:05 click starts a new one because the gap was 40 min. The first session is emitted when the watermark passes 10:55.</p>`,
    brute: { why: `<p>Naive: a cron job every 5 minutes scans the last hour of clicks in SQL to rebuild sessions. Sessions are cut at arbitrary boundaries, long sessions are split, late events are missed, and the scan repeats the same data every run (huge waste); results are 5+ minutes stale.</p>` },
    mcq: { q: 'Which Flink window type fits "session ends after 30 minutes of inactivity"?', options: ['Tumbling window', 'Sliding window', 'Session window with a 30-minute gap', 'Global window without trigger'], answer: 2, explain: 'Session windows are defined by gaps in activity per key and merge when late events bridge two sessions.' },
    hints: [`<p>Hint 1: Key by user id so one task owns the user's state.</p>`, `<p>Hint 2: Event-time session window with gap 30 min and a watermark with 2 minutes of bounded out-of-orderness; allowed lateness for stragglers.</p>`, `<p>Hint 3: Use RocksDB state with incremental checkpoints and a transactional/idempotent sink; discuss state size.</p>`],
    solution: {
      approach: `<p>Kafka topic partitioned by <code>userId</code> -> Flink source with <code>WatermarkStrategy.forBoundedOutOfOrderness(2 min)</code> and event-time timestamps (idle-source detection enabled so a quiet partition does not stall the watermark). <code>keyBy(userId).window(EventTimeSessionWindows.withGap(30 min))</code> with an <code>AggregateFunction</code> that keeps a small accumulator per open session (count, first/last timestamp, last page), so state per user is ~100 bytes rather than all events. When a late event bridges two sessions, Flink <b>merges the windows</b> and their accumulators. A session is emitted when the watermark passes lastEvent + 30 min. <code>allowedLateness(5 min)</code> re-fires with an updated result for stragglers; very late events go to a side output for a daily batch repair. State: RocksDB backend with incremental checkpoints every minute; 50M active users x 100 B ≈ 5 GB plus overhead, spread over parallel tasks. Output: sessions written as upserts keyed by (userId, sessionStart) to the OLAP store/Kafka, so re-fires and replays after a failure overwrite instead of duplicate (or use a two-phase-commit Kafka sink for exactly-once). Scale with parallelism = Kafka partitions; watch watermark lag, checkpoint duration, state size and skew (bots with endless sessions: cap session length at 24 h by timer).</p>`,
      complexity: `<p>O(1) per event amortised (accumulator update). State O(active sessions). Memory is bounded by the 30-minute gap plus lateness window.</p>`,
      followUps: ['How do you split a session at midnight for daily reports?', 'How would you handle bot traffic creating 24-hour sessions?']
    }
  });

  practice.push({
    title: 'Data Retention and Tiering Plan for a Photo Platform', level: 'Medium', tags: ['storage classes', 'lifecycle', 'cost', 'object storage'], companies: ['Google', 'Apple', 'Pinterest'],
    statement: `<p>A photo platform stores 40&nbsp;PB: 90% of reads hit photos from the last 30 days; photos older than a year are opened rarely but users expect them within a second or two. Propose a storage layout, lifecycle rules and caching to cut the bill by half without hurting user experience, and list the risks.</p>`,
    constraints: `40 PB stored, growth 10%/month, p99 read latency < 300 ms for recent photos, < 2 s for old ones, durability must not decrease.`,
    example: `<p>Originals older than 30 days -> infrequent-access class. Thumbnails always on standard + CDN. Photos older than a year -> an archive class with instant retrieval (not the multi-hour tape-like class).</p>`,
    brute: { why: `<p>Keeping every byte (originals, all renditions) in the hot standard class costs the maximum; the opposite mistake, sending everything old to a deep-archive class with hours of retrieval time, breaks the 2-second expectation and adds per-retrieval fees that explode when users scroll old albums.</p>` },
    mcq: { q: 'Why should thumbnails stay in the hot tier even when originals are archived?', options: ['They are bigger', 'Browsing views thumbnails constantly while originals are rarely opened, and thumbnails are tiny', 'Archive tiers cannot store JPEG', 'To increase durability'], answer: 1, explain: 'Access pattern, not age alone, decides the tier; small, frequently read derivatives are cheap to keep hot.' },
    hints: [`<p>Hint 1: Separate derived objects (thumbnails) from originals; they have different access patterns and sizes.</p>`, `<p>Hint 2: Use lifecycle transitions based on age, or intelligent tiering driven by actual access; avoid deep archive for user-facing data.</p>`, `<p>Hint 3: Mind minimum storage durations and retrieval fees; measure with access logs before and after.</p>`],
    solution: {
      approach: `<p><b>Layout.</b> Keys by hash prefix/user/photo; <code>orig/</code> and <code>thumb/{size}/</code> are separate prefixes (and separate lifecycle rules). Thumbnails (small, ~3-5% of bytes, constantly read) stay in Standard behind the CDN. Originals: Standard for the first 30 days (90% of reads), then transition to Infrequent-Access (about half the storage price, per-GB retrieval fee), and after one year to an <b>instant-retrieval archive class</b> (cheaper still, millisecond access, higher retrieval fee) - never to deep archive for primary photos. Optionally use intelligent tiering where the store moves objects by observed access with no retrieval fees but a small monitoring charge. <b>Cost levers beyond classes:</b> erasure coding instead of 3 copies for cold data, recompress originals losslessly or to modern formats (AVIF/WebP for derivatives) where acceptable, dedup identical uploads, delete incomplete multipart uploads, expire orphaned temp objects, and trim unused rendition sizes after analysing which ones clients request. <b>Caching:</b> CDN with long TTL for immutable keys, regional cache for popular originals, and prefetching the first screen of an old album when a user opens it. <b>Risks:</b> minimum duration charges (objects deleted early), retrieval fee spikes (e.g. a viral old photo), small objects penalised in IA tiers (128 KB minimum billable), cross-region replication costs, and a lifecycle misconfiguration archiving hot data - roll out by prefix with metrics (tier distribution, retrieval costs, p99 latency) and canary on 1% of buckets. Estimated saving: if 85% of bytes are older originals, moving them from $0.023 to ~$0.004-0.0125/GB-month cuts the bill by roughly 50-70%.</p>`,
      complexity: `<p>Not algorithmic: billing = sum over classes of (GB x price) + retrieval + requests. Measure before/after on the same access trace.</p>`
    }
  });

  practice.push({
    title: 'Design a Data Pipeline for a Ride-Hailing App: Surge Pricing + Daily Payouts', level: 'Hard', tags: ['streaming', 'batch', 'Kafka', 'Flink', 'lakehouse'], companies: ['Uber', 'Lyft', 'Ola'],
    statement: `<p>A ride-hailing app has 5M trips/day and 2M location pings/s at peak. Build the data platform that powers (1) <b>surge pricing</b> per map cell, recalculated every 30 seconds, (2) <b>driver payouts</b> every night, exact to the cent, (3) analysts' dashboards and ML (ETA models) on 2 years of history. Choose technologies, define the data flow and explain correctness (late GPS pings, duplicates), cost and failure handling.</p>`,
    constraints: `2M pings/s peak; surge freshness 30 s; payouts exact; 2 years history (~hundreds of TB); GPS pings arrive up to 5 minutes late from poor-coverage areas; multi-AZ.`,
    example: `<p>Cell 8928308280fffff has 340 ride requests and 120 free drivers in the last 30 s -> surge 1.8x pushed to the pricing service. The same trips are later reconciled by the nightly job that computes each driver's payout from final fares and promotions.</p>`,
    brute: { why: `<p>One database for everything: pings written to PostgreSQL at 2M rows/s (impossible), surge computed by a cron query over the last minute, and payouts summed from the same live tables while trips are still changing. Writes overwhelm the DB, surge is stale/inconsistent, payouts double count late updates, and analysts' heavy queries hurt rider-facing latency.</p>` },
    mcq: { q: 'What should be the source of truth for payouts?', options: ['The in-memory surge counters', 'The sealed, deduplicated trip/fare records in the lake processed by an idempotent batch job', 'Driver app screenshots', 'Kafka consumer lag'], answer: 1, explain: 'Money needs exact, auditable, re-runnable computation over finalized data; streaming counters are provisional.' },
    hints: [`<p>Hint 1: Three consumers, three latency needs: seconds (surge), hours (payouts), days-years (analytics/ML). One log feeds them all.</p>`, `<p>Hint 2: Kafka (partition by geo-cell or driver) -> Flink for windows per cell; the same events land in an Iceberg lake; batch jobs read sealed partitions.</p>`, `<p>Hint 3: Geo-index (H3/geohash), event time + watermark, idempotent upserts, reconciliation between stream and batch, GDPR for location data.</p>`],
    solution: {
      approach: `<p><b>Ingestion.</b> Driver and rider apps send pings/requests to regional gateways (compact binary, batched every few seconds) -> <b>Kafka</b> topics <code>pings</code> (partitioned by driverId), <code>ride-requests</code>, <code>trip-events</code>, with 3 replicas, rack-aware, plus tiered storage. Every event has an id, event time and the geo-cell (H3 resolution ~8) assigned at the edge or in the first job. The trip lifecycle itself (requested, accepted, started, ended, payment) is owned by the trips service's database and also published via CDC/outbox so the stream and the DB agree.</p>
          <p><b>Surge (streaming, 30 s).</b> A Flink job keys by H3 cell, uses 30-second sliding/tumbling event-time windows (watermark lateness only ~10 s: surge values favour freshness; very late pings are ignored for pricing), counts open requests and available drivers, computes a smoothed demand/supply ratio (state keeps the last few windows to avoid price flapping and apply caps/regulatory limits), and upserts <code>surge[cell] = multiplier, version</code> into a low-latency store (Redis / Cassandra) read by the pricing service with a TTL so a dead job fails safe to 1.0x. Idempotent upserts make replays harmless.</p>
          <p><b>Lake and batch.</b> A second consumer writes all topics to <b>Iceberg bronze</b> tables in object storage partitioned by event date (using Flink or Kafka Connect with exactly-once commits). Nightly Spark jobs build <b>silver</b> (dedupe by event id, reconcile late pings up to 5 min, join trips with fares, tolls, promotions) and <b>gold</b>: <code>driver_daily_payout</code>, computed from sealed day partitions and written with partition overwrite; reconciliation compares totals with the payments ledger and blocks the payout release on a mismatch. Payments themselves use idempotency keys through a ledger service.</p>
          <p><b>Analytics and ML.</b> Gold/silver tables serve dashboards (warehouse/Trino) and feature pipelines for ETA models (offline features from the lake; online features updated by Flink to the feature store; one feature definition used in both for training-serving consistency). <b>Failure handling:</b> Kafka replay for the stream jobs (checkpoints every 30 s), regional failover with mirrored topics, backfill any day by re-running its batch partition. <b>Privacy:</b> location is PII - encrypt, coarsen after 30 days (store cells not exact points), delete on request using row-level deletes in Iceberg. Trade-off recap: streaming for what must be fast (provisional), batch for what must be exact (final), lake as the shared immutable history.</p>`,
      complexity: `<p>Ping volume 2M/s x ~100 B = 200 MB/s ingestion (~17 TB/day raw, ~3 TB columnar compressed). Surge state: ~100k active cells x a few windows = tiny. Nightly payout batch scans one day (5M trips plus related events) in minutes.</p>`,
      followUps: ['How do you stop driver collusion that games the surge signal?', 'How would you A/B test a new surge algorithm safely?', 'What changes for a multi-region (global) deployment?']
    }
  });

  practice.push({
    title: 'Design a Multi-Tenant Metrics Store for 100 Million Active Series', level: 'Hard', tags: ['time-series', 'sharding', 'cardinality', 'query engine', 'scale'], companies: ['Datadog', 'Grafana Labs', 'New Relic'],
    statement: `<p>You are building the backend of a SaaS monitoring product (like Datadog). Customers push metrics via an agent; the platform has <b>100M active series</b> across 10,000 tenants and ingests 5M samples/s. Queries range from "last 5 minutes" dashboards to year-long reports. Design ingestion, sharding, storage, query path, rollups and tenant isolation. Explain how you survive a tenant creating 50M new series by mistake.</p>`,
    constraints: `5M samples/s; 100M active series; ingest p99 < 1 s; dashboards p95 < 2 s; 13-month retention; noisy-neighbour isolation; replicas for HA; cost-conscious.`,
    example: `<p>Tenant A's query <code>sum by (region) (rate(http_requests_total[5m]))</code> touches 40k series spread over 30 shards; each shard computes a partial sum, the query frontend merges them.</p>`,
    brute: { why: `<p>One big TSDB node (or a naively sharded SQL table by timestamp): 5M samples/s is beyond a single node, all current writes hit the "latest time" shard (hot spot), memory for 100M series (≈ 1-3 KB each) exceeds hundreds of GB, and one tenant's cardinality bomb or a heavy query degrades everyone.</p>` },
    mcq: { q: 'How should samples be sharded across ingest nodes?', options: ['By timestamp only', 'By hash of (tenant, series identity), replicated 3x, with time-partitioned blocks per node', 'By metric name only', 'Randomly per sample'], answer: 1, explain: 'Hashing the series id spreads load evenly and keeps all samples of one series together; time partitioning inside each node makes retention and compaction cheap.' },
    hints: [`<p>Hint 1: Do the numbers: 100M series x 2 KB ≈ 200 GB of index/head memory, 5M samples/s x 1.5 B ≈ 7.5 MB/s compressed - memory and CPU, not disk, are the limits.</p>`, `<p>Hint 2: Stateless distributors validate/limit and route by series hash to stateful ingesters (WAL + head block), which flush blocks to object storage; queriers fan out to ingesters and the store gateway.</p>`, `<p>Hint 3: Per-tenant limits, shuffle sharding to isolate noisy tenants, query splitting/caching, compaction with downsampling.</p>`],
    solution: {
      approach: `<p><b>Write path.</b> Agents batch and send compressed remote-write requests to a regional load balancer -> stateless <b>distributors</b> that authenticate, enforce per-tenant limits (active series, samples/s, label sizes), validate and route each series by <code>hash(tenantId, labelset)</code> on a consistent-hash ring to <b>3 ingesters</b> (replication factor 3, quorum write of 2). Ingesters append to a WAL and hold the last ~2 h in an in-memory head (~100M series x 3 replicas x ~2 KB ≈ 600 GB spread across ~40 nodes of 32 GB heap budget each → size at ~60 nodes for headroom). Every 2 h they cut an immutable block (compressed chunks + inverted label index) and upload it to <b>object storage</b>; a <b>compactor</b> merges blocks per tenant, deduplicates the 3 replicas, and writes downsampled blocks (5-minute and 1-hour tiers keeping min/max/sum/count) so year-long queries read ~100x fewer points. Deletion by retention = deleting whole blocks.</p>
          <p><b>Read path.</b> Query frontend splits long ranges into daily sub-queries, shards by series hash, caches results (immutable past intervals are highly cacheable), and applies per-tenant concurrency limits. <b>Queriers</b> fetch recent data from ingesters and older data via <b>store gateways</b> that keep block indexes and a cache of hot chunks; partial aggregates are computed near the data and merged. The inverted label index resolves selectors like <code>{job="api", region=~"eu.*"}</code> to series ids by intersecting postings.</p>
          <p><b>Isolation and cardinality bombs.</b> Hard per-tenant caps on active series (e.g. default 1M, raised by contract): the distributor rejects new series beyond the cap with a clear 4xx while still accepting samples for existing series, so the 50M-series mistake costs the tenant, not the platform. Alerts on series growth rate, a self-service "top cardinality" explorer, and automatic relabel/drop suggestions. <b>Shuffle sharding</b> assigns each tenant a small random subset of ingesters/queriers so one bad tenant can hurt only a few others. Query guards: max series per query, max samples scanned, timeouts, priority queues. <b>HA and ops:</b> zone-aware replication, ring membership via gossip/etcd, graceful ingester handoff on deploy, WAL replay after crash, capacity planning by series count (the real cost driver) not by sample rate.</p>`,
      complexity: `<p>Ingest cost ~ O(samples) CPU; memory ~ O(active series). Query cost ~ O(series selected x points per series), reduced by index intersection, downsampled tiers and caching.</p>`,
      followUps: ['How would you support percentile queries across rollups?', 'How do you handle a tenant that needs 500M series?']
    }
  });

  practice.push({
    title: 'Design Web-Scale Search: Crawl, Index and Serve', level: 'Hard', tags: ['search', 'inverted index', 'sharding', 'MapReduce', 'ranking'], companies: ['Google', 'Microsoft Bing', 'DuckDuckGo'],
    statement: `<p>Design the indexing and serving side of a web search engine for <b>50 billion pages</b> with 100,000 queries/second and results in under 300 ms. Cover how the index is built in batch, how it is partitioned and replicated for serving, how queries fan out, how fresh content (news) gets in quickly, and the ranking stages.</p>`,
    constraints: `50B documents (average 10 KB text => 500 TB raw text); 100k QPS; p99 < 300 ms; news must be searchable within minutes; index updates without downtime.`,
    example: `<p>Query "weather pune today": the router sends it to a replica of every index shard; each returns its best candidates; a merger picks the top 1000, a ranking model sorts them and snippets are generated for the top 10.</p>`,
    brute: { why: `<p>A single global inverted index on one big cluster built by a single job: index size (many TB of postings) can't fit on one machine; a query for a popular term reads huge lists; rebuilding the whole index from scratch takes days and blocks freshness; no replication means a node loss drops pieces of the web from results.</p>` },
    mcq: { q: 'Document-partitioned vs term-partitioned index: which is the common choice for web search and why?', options: ['Term-partitioned, so each query hits one machine', 'Document-partitioned: every shard has a full mini-index of its documents, queries fan out to all shards in parallel and the load balances evenly', 'Neither - use a SQL database', 'Partition by crawl date only'], answer: 1, explain: 'Document partitioning gives balanced load, simple updates and fault tolerance (a failed shard loses a slice of documents, not whole terms), at the cost of fan-out to every shard.' },
    hints: [`<p>Hint 1: Break the work into offline building (batch MapReduce/Spark over crawled pages) and online serving (sharded, replicated, in-memory/SSD).</p>`, `<p>Hint 2: Doc-partition into thousands of shards, each with replicas; a 2-level tree of aggregators merges partial top-K; tiered index for popular/recent pages.</p>`, `<p>Hint 3: Ranking is staged: cheap retrieval (BM25/ANN) -> learned ranker on top 1000 -> final features; add an incremental real-time index for fresh content merged at query time.</p>`],
    solution: {
      approach: `<p><b>Build (batch).</b> Crawler output (raw HTML + metadata) lands in object storage. A MapReduce/Spark pipeline: (1) parse and clean, dedupe near-duplicates (SimHash/MinHash), extract text, links and language; (2) compute link-based signals (PageRank-style iterative jobs over the link graph) and quality scores; (3) the indexing job maps each document to (term, docId, positions, tf), shuffles by <b>shard id</b> (hash of docId, or URL-ordered with tiers), sorts, and writes per-shard compressed postings (delta + bit-packing), term dictionaries (FST) and forward data (titles, snippets source). Index segments are immutable files on object storage versioned by build number.</p>
          <p><b>Serve.</b> 50 B docs / ~20 M docs per shard ≈ 2,500 shards (each a few tens of GB on SSD with the hot dictionary and top postings in RAM), each with 3-5 replicas across zones. Index tiers: a small "tier-1" of high-quality/popular pages that is searched first and a larger tier-2 consulted only if needed, which cuts cost for most queries. A query goes to a front-end that does spell-correct, query understanding (intent, language, entities) and optionally rewrite/expansion, then fans out through a tree of aggregators (root -> ~50 mid-level -> shards) so no node waits on thousands of replies; each shard returns its top few hundred (docId, score) after BM25 plus static quality; hedged requests to a second replica cut tail latency. Merged top ~1000 go to a machine-learned ranker (gradient-boosted trees, then neural reranking on the top 50-100) using hundreds of features (text match, link score, freshness, click models, personalization/location); finally snippet servers fetch text for the top 10. Caches: results cache for head queries (the top 10% of queries serve ~50% of traffic), posting-list cache for hot terms.</p>
          <p><b>Freshness.</b> A separate <b>real-time index</b> for new pages: news crawlers publish to Kafka, a streaming indexer builds small in-memory segments every few seconds-minutes, searched in addition to the main index and merged at the aggregator. Periodic rollout of new base index builds is done as a rolling replace of shard replicas (blue-green per shard group) with rollback. <b>Reliability:</b> replicas, graceful degradation (return results from reachable shards flagged as partial rather than fail), per-query deadlines. Trade-offs: fan-out cost vs balanced load; staleness of the base index vs cost of real-time index; ranking model complexity vs latency budget.</p>`,
      complexity: `<p>Per query: parallel work across ~2,500 shards, each O(postings touched for query terms, with early termination/WAND) in a few ms; total latency ≈ aggregator depth x network + slowest shard ≈ 100-200 ms. Index size ≈ 10-30% of raw text with compression.</p>`,
      followUps: ['How would you add semantic (embedding) retrieval alongside BM25?', 'How do you fight spam and SEO manipulation?']
    }
  });

  practice.push({
    title: 'Migrate a Lambda Architecture to a Streaming Lakehouse Without Downtime', level: 'Hard', tags: ['lambda', 'kappa', 'migration', 'lakehouse', 'reconciliation'], companies: ['Uber', 'Airbnb', 'LinkedIn'],
    statement: `<p>Your company runs a classic lambda pipeline for order analytics: a nightly Spark job (batch views in the warehouse) and a Storm/Flink speed layer (Redis). The two codebases drift, finance sees mismatches between the dashboard and the invoices, and 30% of on-call pages come from the speed layer. Plan a migration to a single-logic pipeline (Flink writing Iceberg tables, batch backfills reuse the same code) with no downtime and no loss of trust in the numbers.</p>`,
    constraints: `Hundreds of consumers of the current tables; 5 TB/day; finance requires an auditable transition; migration over 3 months; rollback must be possible at every step.`,
    example: `<p>Week 6: both pipelines produce <code>orders_daily</code>. A reconciliation job reports 99.97% of rows equal and explains the 0.03% (all late events handled differently). Consumers are flipped to the new table one by one.</p>`,
    brute: { why: `<p>"Big bang" rewrite: turn off the old layers on a weekend and switch everyone to a new pipeline. Hidden semantic differences (time zones, late-event rules, dedup keys) surface in production, finance numbers shift without explanation, there is no way to roll back because the old state is gone, and trust is lost.</p>` },
    mcq: { q: 'What gives confidence before cutting consumers over to the new pipeline?', options: ['Developer opinion', 'Running old and new in parallel with an automated reconciliation that diffs outputs and explains differences', 'Deleting the old tables', 'Waiting for a bug report'], answer: 1, explain: 'Shadow running with automated diffs proves equivalence (or documents intended differences) before any consumer depends on the new output.' },
    hints: [`<p>Hint 1: First extract the business logic into one shared definition (SQL/library) and decide the canonical semantics (event time, lateness, dedup keys).</p>`, `<p>Hint 2: Shadow mode: new pipeline writes versioned tables next to old ones; reconciliation job compares; migrate consumers gradually behind views.</p>`, `<p>Hint 3: Plan rollback, backfill of history from the existing master data into the new tables, and the decommission steps.</p>`],
    solution: {
      approach: `<p><b>Phase 0 - Decide semantics.</b> Document exactly what each metric means (event-time day in which timezone, which events count, dedup key, lateness bound) and write the logic once as shared SQL/Flink SQL models with golden test datasets. Disagreements between the two old layers are listed as explicit decisions ("batch behaviour is canonical unless stated"). <b>Phase 1 - Foundation.</b> Create Iceberg tables for raw (bronze) and curated (silver/gold) layers; a Flink job streams the Kafka events into bronze with exactly-once commits; backfill history from the existing master dataset so old and new have identical inputs. <b>Phase 2 - Shadow.</b> The new pipeline (Flink SQL for streaming, the same SQL run in bounded/batch mode for backfills and the final nightly close) writes <code>orders_daily_v2</code> and <code>orders_live_v2</code>. A reconciliation job runs every hour and day: row counts, sums per dimension, per-key diffs; differences are classified (late data rule, rounding, bug) and either fixed or accepted and recorded. Target: &lt; 0.01% unexplained differences for 14 consecutive days including month-end. <b>Phase 3 - Cut over consumers.</b> Introduce stable views (<code>orders_daily</code>) that point to v1; migrate dashboards and downstream jobs in waves by flipping the view to v2 per consumer group (or per metric), watching alerts and complaints; instant rollback = flip the view back. Finance signs off on the invoice tables first after a full closed month where v1 and v2 agree. <b>Phase 4 - Decommission.</b> Turn off the speed layer, then the old batch jobs, keep v1 data read-only for a retention period for audit, remove Redis and Storm clusters, update runbooks and on-call. <b>Risks and mitigations:</b> hidden consumers (find via query logs and lineage before cutover), cost of running both (time-box to 2 months), replay load on Kafka, state restore time of the new job (savepoints, incremental checkpoints), skills gap (training and pairing). Outcome: one definition of logic, fresh data in minutes via the streaming table, exact closes through the same code in batch mode.</p>`,
      complexity: `<p>Engineering effort rather than algorithmic: parallel-run cost ≈ 2x pipeline infrastructure for ~8 weeks; storage for v2 ≈ 5 TB/day columnar compressed ≈ 1.5 TB.</p>`,
      followUps: ['How would you migrate the consumers that read directly from Redis?', 'What metrics prove the migration succeeded after 6 months?']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push({ q: 'Why is an object store a poor choice for a database data file that is updated in place?', options: ['Objects are too small', 'Objects are replaced as a whole and have higher latency; there is no in-place partial update', 'Object stores are not durable', 'Object stores cannot be encrypted'], answer: 1, explain: 'Object storage offers whole-object PUT/GET semantics with tens of ms latency; databases need block storage for small in-place random writes.' });
  quiz.push({ q: 'In a multipart upload, what happens if part 7 of 20 fails?', options: ['The whole upload must restart', 'Only part 7 is retried; the other parts stay stored until you complete or abort', 'The object is created with a missing section', 'The server deletes all parts immediately'], answer: 1, explain: 'Parts are independent; the object only appears when "complete" is called with the list of part numbers and ETags.' });
  quiz.push({ q: 'What is the main benefit of a pre-signed URL for uploads?', options: ['It encrypts the file twice', 'The client uploads directly to object storage, keeping heavy bytes off your app servers', 'It makes uploads free', 'It removes the need for authentication'], answer: 1, explain: 'Your API only authorizes and signs a short-lived URL; storage absorbs the bandwidth.' });
  quiz.push({ q: 'An inverted index maps…', options: ['document -> list of words', 'word (term) -> list of documents containing it', 'word -> its definition', 'user -> queries'], answer: 1, explain: 'It is the back-of-the-book index: from each term to the postings list of document ids.' });
  quiz.push({ q: 'In Elasticsearch, what is a shard?', options: ['A user role', 'A slice of an index; each shard is a self-contained Lucene index, with replicas as copies', 'A type of query', 'A cache layer'], answer: 1, explain: 'An index is split into primary shards for scale; replicas copy shards for failure tolerance and read throughput.' });
  quiz.push({ q: 'Which is a bad choice for a time-series label (tag)?', options: ['region', 'service name', 'user_id with millions of values', 'HTTP status class'], answer: 2, explain: 'Unbounded identifiers create a series per value (cardinality explosion). Use bounded labels and keep ids in logs/traces.' });
  quiz.push({ q: 'Why store min, max, sum and count in a rollup rather than just the average?', options: ['It is required by Prometheus', 'Averages hide spikes and cannot be recombined across buckets of different sizes', 'To make queries slower', 'Because averages cannot be computed'], answer: 1, explain: 'Max preserves spikes; sum and count combine correctly across buckets (avg = sum/count).' });
  quiz.push({ q: 'Why is columnar storage faster for "SUM(price) over 1 billion orders"?', options: ['It uses more CPUs', 'It reads only the price column and compresses similar values well', 'It stores data in RAM only', 'It avoids joins'], answer: 1, explain: 'Analytical queries touch few columns; column layout skips everything else and compresses far better.' });
  quiz.push({ q: 'What does a lakehouse table format such as Iceberg or Delta add on top of Parquet files in a lake?', options: ['A faster network', 'ACID transactions, schema evolution, time travel and row-level updates via a metadata layer', 'Automatic machine learning', 'Replacement of object storage'], answer: 1, explain: 'A metadata log tracks which files make up each table version, giving warehouse-like guarantees on open files.' });
  quiz.push({ q: 'In MapReduce, why does the shuffle send all pairs of the same key to the same reducer?', options: ['To balance bytes', 'So the reducer sees every value of that key and can compute its complete result', 'To compress the keys', 'Because mappers cannot read data'], answer: 1, explain: 'Partitioning by hash(key) % R guarantees co-location of a key\'s values, enabling a correct per-key reduction.' });
  quiz.push({ q: 'Which Spark operation causes a shuffle (wide dependency)?', options: ['filter', 'map', 'groupBy / join on a key', 'select of existing columns'], answer: 2, explain: 'Grouping and joining need rows with the same key together, which requires moving data across the network.' });
  quiz.push({ q: 'A streaming job uses watermark = max event time - 2. A window [0,5) is emitted when…', options: ['wall-clock time passes 5', 'the watermark reaches 5 (max event time seen is at least 7)', 'the first event arrives', 'the job restarts'], answer: 1, explain: 'The watermark says "events up to this time have probably all arrived"; windows ending at or before it are closed and emitted.' });
  quiz.push({ q: 'What is the standard way to achieve end-to-end "exactly-once" results with a stream processor?', options: ['A faster network', 'Checkpointed state plus a transactional or idempotent sink', 'Running the job twice', 'Turning off retries'], answer: 1, explain: 'State rollback on restart prevents double counting inside; transactional (2PC) or idempotent upserts prevent duplicate outputs.' });
  quiz.push({ q: 'What is the main drawback of the lambda architecture?', options: ['It cannot be accurate', 'It needs two code paths (batch and stream) that must produce consistent results', 'It needs no storage', 'It cannot handle late events'], answer: 1, explain: 'Maintaining and reconciling duplicate logic in two systems is the classic lambda pain; kappa or unified engines reduce it.' });
  quiz.push({ q: 'In a kappa architecture, how do you fix a bug in the aggregation logic?', options: ['Edit rows in place', 'Deploy a new job version, replay the retained log from the start into a new table, then switch readers', 'Run a nightly batch job', 'Delete the log'], answer: 1, explain: 'The log is the source of truth; reprocessing = replay with the corrected job and swap the output.' });

  /* ================= INTERVIEW ================= */
  interview.push({ level: 'B', q: 'What is object storage and when would you choose it over a database or a file system?',
    a: `<p>Object storage (S3, GCS, Azure Blob) stores immutable blobs addressed by <b>bucket + key</b> through an HTTP API, with rich metadata, in a flat namespace. I choose it for large, unstructured, write-once/read-many data: images, video, backups, logs, ML datasets and data-lake files. It scales almost without limit, is very durable (copies across zones or erasure coding), and is the cheapest per GB, especially with lifecycle tiers. I do <b>not</b> use it where I need in-place edits, low latency random IO or transactions - that is block storage or a database. The usual pattern: bytes in the object store, a pointer (key) plus searchable metadata in the database, CDN for reads, pre-signed URLs so clients upload and download directly.</p>`,
    followUps: ['How is durability of 11 nines achieved?', 'What is the difference between block, file and object storage?', 'Why can\'t you append to an S3 object?'] });
  interview.push({ level: 'I', q: 'Walk me through designing photo upload for a large app. Where do the bytes go?',
    a: `<p>The client asks my API for an upload URL; the API authenticates, checks quota, inserts a PENDING row and returns a <b>pre-signed URL</b> (or multipart part URLs for big files). The client uploads straight to the object store; bytes never touch my app servers. An ObjectCreated event goes to a queue; workers virus-scan, make thumbnails, extract metadata, and mark the row READY. The database holds only metadata and keys. Reads go through a CDN with immutable, versioned URLs. Lifecycle rules move cold originals to cheaper tiers, versioning plus soft delete protect from mistakes, and cross-region replication covers a regional disaster. Failure story: a janitor cleans PENDING rows with no object; multipart uploads that are never completed are aborted by lifecycle policy.</p>`,
    followUps: ['How do you handle a 4 GB video on a flaky connection?', 'How do you prevent hotlinking or unauthorized access?', 'How would you dedup identical uploads?'] });
  interview.push({ level: 'I', q: 'Explain how multipart upload works and why it exists.',
    a: `<p>A single HTTP request for a huge file is fragile: any failure restarts from zero, and one connection limits throughput. Multipart upload splits the file into parts (S3: 5 MB to 5 GB each, up to 10,000 parts). Steps: <b>initiate</b> to get an uploadId; <b>upload parts</b> (in parallel, any order), each returning an ETag; <b>complete</b> with the ordered list of (partNumber, ETag), after which the object appears atomically. Failed parts are retried individually; ListParts lets a client resume after a crash. Incomplete uploads cost storage, so add a lifecycle rule to abort them after a few days. Benefits: resumability, parallelism, and the ability to start uploading before the file's total size is known.</p>`,
    followUps: ['How would you choose the part size?', 'How is the final ETag computed?', 'What if two clients complete the same upload?'] });
  interview.push({ level: 'I', q: 'What is an inverted index, and how does a query use it?',
    a: `<p>An inverted index maps each <b>term</b> to a sorted <b>postings list</b> of documents containing it (often with term frequency and positions). It is built by analysing text (tokenise, lowercase, stop-words, stem) and appending doc ids to each term's list. A query for "red socks" looks both terms up in the sorted term dictionary and intersects the postings lists with a two-pointer merge in O(a+b) (starting from the shortest list; skip pointers speed it up). Ranking uses TF-IDF or BM25: frequent-in-document and rare-in-corpus terms score higher. The cost depends on the postings touched, not on corpus size, which is why it beats LIKE '%word%' scans by orders of magnitude.</p>`,
    followUps: ['How do phrase queries work?', 'How do you do prefix and typo-tolerant search?', 'What is BM25 and why is it better than raw TF-IDF?'] });
  interview.push({ level: 'A', q: 'How does Elasticsearch scale reads and writes, and what are the pitfalls?',
    a: `<p>An index is split into <b>primary shards</b> (a document goes to shard hash(id) % N) and each shard has <b>replicas</b>. Writes go to the primary, are replicated to in-sync replicas, written to a translog, and become searchable after the periodic <b>refresh</b> (~1 s) as an immutable Lucene segment; background merges compact segments. A query hits a coordinating node, scatters to one copy of every shard, each returns its local top-K, and the coordinator merges (scatter-gather); replicas add read throughput. Pitfalls: the shard count is fixed at index creation (plan with rollover indices), too many small shards waste heap, deep pagination is costly (use search_after), mapping explosion with dynamic fields, per-shard IDF skew on small data, and eventual consistency - search is a secondary index, never the only copy of important data.</p>`,
    followUps: ['How would you size shards for 5 TB of logs per day?', 'How do you reindex with zero downtime?', 'What happens when a node holding a primary dies?'] });
  interview.push({ level: 'I', q: 'How do you keep a search index in sync with the primary database?',
    a: `<p>The database stays the source of truth. I stream changes out: <b>change data capture</b> (Debezium reading the WAL/binlog) or the transactional <b>outbox</b> pattern publishes events to Kafka; an indexer consumes in batches and uses the bulk API. Each event carries a monotonically increasing <b>version</b>, and the index uses external versioning so stale or reordered events cannot overwrite newer data; deletes are tombstones. Lag is typically a few seconds (refresh included) and is monitored. For repair I run periodic full or partial reindexes into a new index and swap an alias atomically. Dual writes from the app are avoided because partial failure leaves the two stores inconsistent without a fixer.</p>`,
    followUps: ['What if the indexer is down for an hour?', 'How do you handle schema changes in the index?', 'How do you guarantee ordering per document?'] });
  interview.push({ level: 'I', q: 'Why use a time-series database instead of a regular relational table for metrics?',
    a: `<p>The workload is append-heavy, time-ordered and queried by time range with aggregation, rarely updated. TSDBs write sequentially into time-partitioned immutable blocks (no B-tree page splits), compress timestamps and values (delta-of-delta, XOR) to ~1-2 bytes per point, drop old data by deleting whole partitions, and provide built-in downsampling, rate() and group-by-time functions. A relational table with 100k inserts/s thrashes indexes, bloats on deletes and scans too much for dashboards. The big design caveat is <b>cardinality</b>: every unique label combination is a series with index and memory cost, so unbounded labels (user_id) must stay out of tags. Timescale offers a middle path: hypertables on PostgreSQL with continuous aggregates and retention policies.</p>`,
    followUps: ['How does Gorilla compression work?', 'How do you do percentile rollups?', 'Prometheus vs InfluxDB vs TimescaleDB?'] });
  interview.push({ level: 'A', q: 'Design downsampling and retention for 1M sensors that report every 10 seconds.',
    a: `<p>Volume: 100k points/s, 8.6 B/day; compressed ~12 GB/day. Keep <b>raw for 7 days</b> (investigations), <b>5-minute rollups for 90 days</b>, <b>hourly rollups for 2 years</b>, each storing count, min, max, sum (avg derived) and, if percentiles matter, a mergeable sketch such as t-digest. Rollups are produced continuously (continuous aggregates / recording rules) rather than by scanning raw data on demand; retention is enforced by dropping time partitions. Ingestion goes through MQTT/gateway -> Kafka -> batched writers for burst absorption and replay. Dashboards pick the resolution by time range; alerts evaluate on the freshest raw/5-min data. I would call out late and out-of-order data (event time, out-of-order window), clock skew on devices, and a series count budget.</p>`,
    followUps: ['What if a customer needs 1-second resolution for 1 year?', 'How do you detect dead sensors?', 'How would you shard the cluster?'] });
  interview.push({ level: 'I', q: 'Data warehouse vs data lake vs lakehouse: how do you choose?',
    a: `<p>A <b>warehouse</b> (Snowflake, BigQuery, Redshift) holds modelled, columnar tables with schema-on-write: best SQL/BI experience, strong governance, higher storage cost. A <b>lake</b> keeps raw files of any type on object storage with schema-on-read: cheapest and most flexible, good for ML and exploration, but without transactions and prone to becoming a swamp. A <b>lakehouse</b> adds an open table format (Iceberg, Delta, Hudi) on lake files for ACID, updates/deletes, time travel and multi-engine access: one copy of data serving BI and ML. I choose a warehouse for a SQL-centric business with moderate data, a lake/lakehouse for large raw or unstructured data, ML workloads, or when avoiding lock-in matters. Common practice is medallion layers (bronze raw, silver cleaned, gold business) fed by CDC and event streams with ELT transformations (dbt/Spark).</p>`,
    followUps: ['ETL vs ELT?', 'How do you model a star schema?', 'How do you do GDPR deletes in a lake?'] });
  interview.push({ level: 'I', q: 'Why are columnar formats such as Parquet good for analytics?',
    a: `<p>Analytical queries read a few columns across many rows. In a columnar format each column\'s values are stored contiguously, so the engine reads only the needed columns (<b>projection pushdown</b>), compresses well because neighbouring values are similar (dictionary, run-length, delta encodings), and can skip whole row groups using min/max statistics in the footer (<b>predicate pushdown</b>). Vectorised execution then processes batches of values efficiently. Combined with partitioning by date (partition pruning) a query may touch under 1% of the bytes. The downside: single-row lookups and updates are slow, which is why OLTP uses row stores and analytics systems batch their writes.</p>`,
    followUps: ['What is partition pruning?', 'What is the small-files problem and how do you fix it?', 'Parquet vs Avro vs ORC?'] });
  interview.push({ level: 'I', q: 'Explain MapReduce with word count, and why the shuffle is the expensive step.',
    a: `<p>Input is split across mappers; each mapper reads its split and emits (word, 1) for each word. The framework then <b>shuffles</b>: pairs are partitioned by hash(word) % R, sent to reducers and sorted/grouped, so each reducer receives all values for each of its keys. Reducers sum the values and write (word, count). The shuffle is expensive because it moves data across the network and writes/sorts on disk between machines; M mappers x R reducers transfers. Mitigations: a <b>combiner</b> that pre-sums locally, filtering/projecting early, fewer wide operations, broadcast joins, and fixing skew with salting. Failures are handled by re-running deterministic tasks; stragglers by speculative execution.</p>`,
    followUps: ['What is a combiner and when is it safe?', 'How does Spark improve on MapReduce?', 'How do you find the top K words?'] });
  interview.push({ level: 'A', q: 'How does Spark differ from Hadoop MapReduce, and how do you tune a slow Spark job?',
    a: `<p>Spark models a job as a DAG of lazy transformations, keeps intermediate data in memory (spilling if needed), and recomputes lost partitions from lineage; MapReduce persists to disk between every map and reduce stage, so multi-step and iterative jobs are far slower. Tuning: read the Spark UI. If one task is far slower than others -> <b>skew</b> (salt keys, broadcast the small side, enable AQE skew handling). If shuffle spill or long shuffle -> reduce shuffled bytes (filter early, select only needed columns, pre-aggregate, avoid groupByKey), tune partition counts so tasks handle ~100-200 MB. Many tiny input files -> compact them. Wrong join strategy -> broadcast or bucket. GC/OOM -> executor sizing and avoiding collect() on large data. Also use columnar formats and partition pruning to scan less in the first place.</p>`,
    followUps: ['What is a stage and how is it determined?', 'How does Adaptive Query Execution help?', 'When would you not use Spark at all?'] });
  interview.push({ level: 'A', q: 'Explain event time, processing time, watermarks and late data in stream processing.',
    a: `<p><b>Event time</b> is when something actually happened (timestamp in the event); <b>processing time</b> is when the system sees it. Networks delay and reorder events, so correct windowed analytics use event time. A <b>watermark</b> is the engine\'s estimate of how far event time has progressed, e.g. max event time seen minus an allowed out-of-orderness; when it passes a window\'s end, the window is considered complete and emitted. Events arriving after that are <b>late</b>: drop them, divert to a side output for repair, or keep window state for an <b>allowed lateness</b> and re-fire updated results. The trade-off is latency vs completeness: a larger lateness gives more accurate counts but delays outputs and increases state. Idle partitions can stall watermarks, so configure idle detection.</p>`,
    followUps: ['How do session windows differ from tumbling windows?', 'How do you pick the lateness bound?', 'What happens to results if you replay the stream?'] });
  interview.push({ level: 'A', q: 'How does Flink achieve fault tolerance and exactly-once processing?',
    a: `<p>Flink periodically takes <b>checkpoints</b>: the coordinator injects barriers at the sources, they flow through the dataflow, and each operator snapshots its keyed state (heap or RocksDB, incrementally) to durable storage when the barrier arrives; source offsets are part of the snapshot. After a failure the job restarts from the last completed checkpoint, restores state and rewinds sources (e.g. Kafka offsets), so state reflects each event exactly once. For <b>end-to-end</b> exactly-once the sink must cooperate: transactional sinks use two-phase commit tied to checkpoints (pre-commit on barrier, commit when the checkpoint completes), or writes are idempotent upserts keyed by a natural id. Savepoints are manual checkpoints for upgrades and rescaling. Costs: checkpoint latency, state size, and sink transaction timeouts.</p>`,
    followUps: ['What are unaligned checkpoints?', 'How do you rescale a stateful job?', 'Spark Structured Streaming vs Flink?'] });
  interview.push({ level: 'E', q: 'Lambda vs kappa architecture: explain both and give a recommendation for a real-time dashboard with exact billing.',
    a: `<p>Lambda has an immutable master dataset, a <b>batch layer</b> that recomputes accurate views periodically, a <b>speed layer</b> for recent events, and a serving layer that merges them. It is accurate and robust (batch heals bugs and late data) but needs two code bases and careful boundary handling. Kappa treats everything as a stream: a retained log is the source of truth, one streaming job computes views, and a bug fix is a replay of the log with a new job version into a new table, then a switch. It has one code path but needs long retention and fast replay. For a live dashboard with exact billing I would use a <b>unified approach</b>: one Flink logic (shared SQL) writes provisional per-window results to a real-time store for the dashboard, raw events land in an Iceberg lake, and the same logic runs in bounded mode on sealed daily partitions to produce final billing tables, replacing provisional values; a reconciliation job tracks the gap. Reprocessing runs from the lake rather than replaying months of Kafka.</p>`,
    followUps: ['How do you avoid double counting at the batch/speed boundary?', 'How would you migrate from lambda to this design?', 'When is plain batch enough?'] });
  interview.push({ level: 'E', q: 'You must decide between batch and streaming for a new pipeline. What questions do you ask and what trade-offs do you present?',
    a: `<p>I ask: (1) What is the business cost of a result being late - seconds, minutes, hours? (2) What are the correctness requirements - may results be revised, or must they be final and reconcilable? (3) What are the data volumes, burstiness and how late/out-of-order can events be? (4) What history is needed for recompute, and what does reprocessing cost? (5) What are the team\'s skills and on-call capacity? If hours are fine, choose <b>batch</b>: simpler, cheaper, easy to make exact and idempotent. If seconds matter (fraud, alerts, live ops) choose <b>streaming</b> and accept event-time, watermarks, state and checkpoint operations. If the answer is "minutes", consider micro-batch or incremental materialized views. Often the right answer is hybrid: streaming for provisional fast numbers and batch (or bounded mode of the same engine) for the final numbers, sharing the same raw log and logic definition.</p>`,
    followUps: ['What is the cheapest way to get 5-minute freshness?', 'How do you test streaming logic?', 'How would you explain provisional vs final numbers to business users?'] });

  registerModule({
    id: 'hld13',
    title: 'Storage & Data Processing Systems',
    intro: `<p>Almost every large system needs places to keep <b>huge things</b> (photos, videos, backups), ways to <b>search</b> them, databases made for <b>time-ordered measurements</b>, and engines that <b>crunch mountains of data</b> either overnight or as it arrives. This module covers the second half of the "building blocks" shelf: <b>object storage</b> (S3), <b>search engines</b> (inverted index, Elasticsearch), <b>time-series databases</b>, <b>data warehouses and lakes</b>, <b>batch</b> (MapReduce, Spark) versus <b>stream</b> processing (Flink), and the <b>lambda and kappa</b> architectures that combine them. Every concept starts with an everyday analogy, then an animated visualizer, worked examples, deep dives and an "AI era" section. You will finish able to design photo storage, e-commerce search, IoT metrics storage and to choose batch vs streaming like a senior engineer.</p>`,
    goals: [
      'Design blob storage for photos and video: object keys, multipart and resumable uploads, pre-signed URLs, durability (replication vs erasure coding), lifecycle tiers and CDN',
      'Explain how an <b>inverted index</b> is built and queried, how Elasticsearch shards, replicates and ranks (BM25), and keep a search index in sync with a database',
      'Design a time-series store: data model, compression, cardinality limits, downsampling and retention for IoT and monitoring',
      'Choose between a data warehouse, data lake and lakehouse and explain columnar storage, star schema, ELT and medallion layers',
      'Trace a MapReduce/Spark job (map, shuffle, reduce), spot skew and shuffle cost, and make batch jobs idempotent',
      'Explain stream processing: event time, windows, watermarks, state, checkpoints and exactly-once, and decide batch vs streaming from the business cost of lateness',
      'Compare lambda and kappa architectures, and design a unified pipeline with reprocessing and reconciliation'
    ],
    prereqs: `HLD modules 1-12, especially Databases at Scale (replication, sharding), Caching, Messaging &amp; Streaming (Kafka) and Reliability &amp; Observability. A little SQL helps for the warehouse and time-series sections.`,
    hours: 14,
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
