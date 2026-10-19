(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers for the estimation visualizers ---------- */
  // Trim a number to ~3 significant digits for display: 1234.5 -> "1235", 12.345 -> "12.3", 1.2345 -> "1.23"
  function trim3(x) {
    var a = Math.abs(x);
    var s = a >= 100 ? x.toFixed(0) : a >= 10 ? x.toFixed(1) : x.toFixed(2);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  // Human count: 1500000 -> "1.5 M"
  function hum(n) {
    if (!isFinite(n)) return String(n);
    var a = Math.abs(n), u = [[1e15, 'Q'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
    for (var i = 0; i < u.length; i++) if (a >= u[i][0]) return trim3(n / u[i][0]) + ' ' + u[i][1];
    return trim3(n);
  }
  // Human bytes (decimal units, the way estimates are done): 3.2e12 -> "3.2 TB"
  function hb(n) {
    if (!isFinite(n)) return String(n);
    var a = Math.abs(n), u = [[1e18, 'EB'], [1e15, 'PB'], [1e12, 'TB'], [1e9, 'GB'], [1e6, 'MB'], [1e3, 'KB']];
    for (var i = 0; i < u.length; i++) if (a >= u[i][0]) return trim3(n / u[i][0]) + ' ' + u[i][1];
    return trim3(n) + ' B';
  }
  // Human time from nanoseconds: 150000 -> "150 µs"
  function ht(ns) {
    if (ns >= 3.15e16) return trim3(ns / 3.15e16) + ' years';
    if (ns >= 8.64e13) return trim3(ns / 8.64e13) + ' days';
    if (ns >= 3.6e12) return trim3(ns / 3.6e12) + ' hours';
    if (ns >= 6e10) return trim3(ns / 6e10) + ' min';
    if (ns >= 1e9) return trim3(ns / 1e9) + ' s';
    if (ns >= 1e6) return trim3(ns / 1e6) + ' ms';
    if (ns >= 1e3) return trim3(ns / 1e3) + ' µs';
    return trim3(ns) + ' ns';
  }
  // Scientific with unicode superscripts: 23148 -> "2.3 × 10⁴"
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function sci(n) {
    if (n === 0) return '0';
    var e = Math.floor(Math.log10(Math.abs(n))), m = n / Math.pow(10, e);
    return trim3(m) + ' × 10' + String(e).split('').map(function (c) { return SUP[c] || c; }).join('');
  }
  // Parse "a b c" into numbers, with friendly errors
  function nums(input, count, hint) {
    var a = String(input === undefined ? '' : input).trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
    if (a.length !== count || a.some(function (x) { return !isFinite(x) || x < 0; })) throw new Error(hint);
    return a;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  /* ===================== TOPIC 1: Units, powers of two, handy constants ===================== */
  topics.push({
    title: 'Your Estimation Toolkit: Units, Powers of Two & Handy Constants',
    analogy: `<p>Before cooking you learn that <b>1 cup ≈ 250 ml</b> and <b>1 teaspoon ≈ 5 ml</b>. You never measure exactly — you just need to know roughly how much flour goes into a cake. System design estimation is the same: you memorise a few kitchen conversions for computers (<b>1 KB ≈ a thousand bytes</b>, <b>a day ≈ 100,000 seconds</b>, <b>a photo ≈ 200 KB</b>) and then you can "cook" any estimate in your head in under a minute.</p>`,
    explain: `<p><b>Back-of-envelope estimation</b> means doing quick, rough maths (the kind you could scribble on the back of an envelope) to find out <i>how big</i> a system has to be. You are not looking for the exact answer. You want the right <b>order of magnitude</b> — is it 10, 1,000 or 1,000,000? That one number tells you whether one server is enough or you need a thousand.</p>
      <h4>1. Bytes and their big brothers</h4>
      <p>A <b>byte</b> is 8 bits — enough to store one English letter. Every next unit is about <b>1,000×</b> bigger. Computers really use <b>1,024 = 2<sup>10</sup></b>, but in an interview we round to 1,000 because it keeps the maths easy and the error is tiny.</p>
      ${H.table(['Power of 2', 'Exact value', 'Round it to', 'Name', 'Feels like'], [
        ['2<sup>10</sup>', '1,024', '1 thousand (10<sup>3</sup>)', '1 KB (kilobyte)', 'a short email'],
        ['2<sup>20</sup>', '1,048,576', '1 million (10<sup>6</sup>)', '1 MB (megabyte)', 'a phone photo is 1–3 MB'],
        ['2<sup>30</sup>', '1,073,741,824', '1 billion (10<sup>9</sup>)', '1 GB (gigabyte)', 'a 1-hour HD movie'],
        ['2<sup>40</sup>', '≈ 1.1 × 10<sup>12</sup>', '1 trillion (10<sup>12</sup>)', '1 TB (terabyte)', 'a laptop disk'],
        ['2<sup>50</sup>', '≈ 1.13 × 10<sup>15</sup>', '1 quadrillion (10<sup>15</sup>)', '1 PB (petabyte)', 'a big company\'s photo store'],
        ['2<sup>60</sup>', '≈ 1.15 × 10<sup>18</sup>', '10<sup>18</sup>', '1 EB (exabyte)', 'a hyperscaler\'s whole fleet']
      ])}
      <p>Trick: <b>every 10 powers of two ≈ 3 zeros</b>. So 2<sup>32</sup> = 2<sup>2</sup> × 2<sup>30</sup> ≈ 4 × 10<sup>9</sup> = 4 billion. That is why a 32-bit integer tops out near <b>4.3 billion</b> (or 2.1 billion if signed).</p>
      <h4>2. Time constants you will use every single time</h4>
      ${H.table(['Period', 'Exact seconds', 'Interview shortcut'], [
        ['1 day', '86,400', '<b>≈ 10<sup>5</sup></b> (100K) — error 16%, fine'],
        ['1 month', '≈ 2.6 million', '≈ 2.5 × 10<sup>6</sup>'],
        ['1 year', '≈ 31.5 million', '≈ 3 × 10<sup>7</sup> (or π × 10<sup>7</sup>)'],
        ['5 years', '≈ 158 million', '≈ 1.5 × 10<sup>8</sup>; also 5 × 365 ≈ 1,800 days']
      ])}
      <p>So "1 million things per day" is about <b>12 per second</b> (10<sup>6</sup> ÷ 10<sup>5</sup> = 10, exact 11.6). Burn that into memory: <b>1M/day ≈ 12/s, 1B/day ≈ 12K/s</b>.</p>
      <h4>3. How big is one thing?</h4>
      ${H.table(['Thing', 'Typical size'], [
        ['boolean / small enum', '1 byte'], ['int (32-bit) / float', '4 bytes'], ['long, timestamp, double, Snowflake ID', '8 bytes'],
        ['UUID', '16 bytes binary (36 as text)'], ['ASCII char / UTF-8 emoji', '1 byte / up to 4 bytes'],
        ['user profile row / tweet text + metadata', '~1 KB / ~300 B'], ['thumbnail / compressed photo', '~20–50 KB / ~200 KB–2 MB'],
        ['1 minute of 1080p video (streaming bitrate ~5 Mbps)', '~40 MB'], ['1 minute of audio (128 kbps)', '~1 MB']
      ])}
      <p>With these three tables you can estimate almost anything: <i>count × size</i> gives storage, <i>count ÷ seconds</i> gives rate.</p>`,
    clues: [
      '"Estimate how much storage / how many servers…" → start from units and round aggressively',
      '"Can a 32-bit ID hold all users/posts?" → 2<sup>32</sup> ≈ 4.3 B; anything near billions needs 64-bit',
      '"How long should the short code be?" → count combinations: 62<sup>k</sup> vs number of items',
      '"per day" numbers in the prompt → divide by 10<sup>5</sup> to get per second',
      '"5 years of data" → multiply daily volume by ~1,800 (5 × 365)',
      'Interviewer says "rough numbers are fine" → use powers of 10, say your rounding out loud'
    ],
    code: { lang: 'python', run: true, title: 'Powers of two vs powers of ten (runnable)', code: `# How wrong is "1 KB = 1000 bytes"? Let's measure the rounding error.
names = ["KB", "MB", "GB", "TB", "PB", "EB"]
for i, name in enumerate(names, start=1):
    binary = 2 ** (10 * i)      # what the computer really uses (KiB, MiB, ...)
    decimal = 10 ** (3 * i)     # what we say in interviews
    err = (binary - decimal) / decimal * 100
    print(f"2^{10*i:<3} = {binary:>26,}  vs 10^{3*i:<2}  -> {name}: error {err:4.1f}%")

# Handy time constants
day = 24 * 60 * 60
print("seconds per day   :", day, "(~10^5)")
print("seconds per year  :", day * 365, "(~3 x 10^7)")
print("1M events/day     :", round(1_000_000 / day, 1), "per second")
print("1B events/day     :", round(1_000_000_000 / day), "per second")

# Combinations for short codes: how many characters do we need?
for k in range(5, 9):
    print(f"base62 with {k} chars = {62**k:.2e} codes")` },
    viz: [{
      title: 'Climb the powers-of-two ladder (log scale)',
      gen: function () {
        var rungs = [
          [0, '1 B', 'one byte: a single letter'],
          [8, '256', '2⁸ = 256 values fit in one byte (0–255) — think a colour channel'],
          [10, '1 KB', '2¹⁰ = 1,024 ≈ 1 thousand → kilobyte'],
          [16, '65 K', '2¹⁶ = 65,536 — number of TCP ports, max of an unsigned 16-bit int'],
          [20, '1 MB', '2²⁰ ≈ 1 million → megabyte'],
          [30, '1 GB', '2³⁰ ≈ 1 billion → gigabyte'],
          [32, '4.3 B', '2³² ≈ 4.3 billion — all IPv4 addresses, max unsigned 32-bit int'],
          [40, '1 TB', '2⁴⁰ ≈ 1 trillion → terabyte'],
          [50, '1 PB', '2⁵⁰ ≈ 10¹⁵ → petabyte'],
          [60, '1 EB', '2⁶⁰ ≈ 10¹⁸ → exabyte'],
          [64, '1.8×10¹⁹', '2⁶⁴ ≈ 1.8 × 10¹⁹ — max unsigned 64-bit int; practically never runs out']
        ];
        var frames = [];
        frames.push({ narr: 'We will draw each power of two as a bar. <b>Log scale:</b> the bar height is the <i>exponent</i>, not the value. If we drew real values, 2⁶⁴ would be a skyscraper and 1 KB would be thinner than an atom. On a log scale, <b>each +10 in height means ×1,024 (≈ ×1,000)</b>.', parts: [
          { type: 'bars', label: 'height = exponent (log₂ of value)', values: [0], texts: ['2⁰'], idxLabels: ['1 B'] },
          { type: 'vars', label: 'rule of thumb', vals: { '2^10': '≈ 10^3', 'every +10 exponent': '+3 zeros' } }
        ] });
        for (var i = 1; i < rungs.length; i++) {
          var vals = [], texts = [], labs = [], hl = {};
          for (var j = 0; j <= i; j++) { vals.push(rungs[j][0]); texts.push('2^' + rungs[j][0]); labs.push(rungs[j][1]); }
          hl[i] = 'cur';
          var r = rungs[i], exact = Math.pow(2, r[0]), dec = Math.pow(10, r[0] * 0.30103);
          frames.push({ narr: 'Next rung: <b>' + r[2] + '</b>. Exact value ' + (r[0] <= 53 ? exact.toLocaleString('en-US') : '≈ 1.8 × 10¹⁹') + '. Notice the bar only grew a little even though the value multiplied by ' + (r[0] - rungs[i - 1][0] >= 10 ? '~' + hum(Math.pow(2, r[0] - rungs[i - 1][0])) : Math.pow(2, r[0] - rungs[i - 1][0])) + ' — that is the magic of a log scale.', parts: [
            { type: 'bars', label: 'height = exponent (log₂ of value)', values: vals, texts: texts, idxLabels: labs, hl: hl },
            { type: 'vars', label: 'this rung', vals: { power: '2^' + r[0], 'as powers of 10': sci(dec), name: r[1] }, hl: { name: 'ok' } }
          ] });
        }
        frames.push({ narr: 'Done! Remember only three anchors: <b>2¹⁰ ≈ 10³</b>, <b>2³² ≈ 4 billion</b>, <b>2⁶⁴ ≈ 1.8 × 10¹⁹</b>. Every other rung you can rebuild in 5 seconds. Rounding 1,024 to 1,000 makes us ~2% low at KB and ~10% low at TB — far smaller than the guesswork in "how many users".', parts: [
          { type: 'table', label: 'rounding error of 10³ⁿ vs 2¹⁰ⁿ', columns: ['unit', '2^x', '10^y', 'error'], rows: [['KB', '1,024', '1,000', '2.4%'], ['MB', '1,048,576', '10⁶', '4.9%'], ['GB', '1.07 × 10⁹', '10⁹', '7.4%'], ['TB', '1.10 × 10¹²', '10¹²', '10.0%'], ['PB', '1.13 × 10¹⁵', '10¹⁵', '12.6%']], hl: { 3: 'sel' } }
        ] });
        return frames;
      }
    }, {
      title: 'Unit converter: shrink a huge byte count step by step',
      input: '7300000000000',
      inputLabel: 'Bytes (plain number or 7.3e12)',
      gen: function (input) {
        var n = Number(String(input).trim());
        if (!isFinite(n) || n <= 0) throw new Error('Enter a positive number of bytes, e.g. 7300000000000 or 7.3e12');
        if (n > 1e24) throw new Error('Keep it under 1e24 bytes (a yottabyte!)');
        var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB'], rows = [], frames = [], v = n, k = 0;
        rows.push([units[0], trim3(v), 'start']);
        frames.push({ narr: 'We start with <b>' + n.toLocaleString('en-US') + ' bytes</b>. Too many digits to think with! We will divide by 1,000 until the number is between 1 and 1,000.', parts: [
          { type: 'table', label: 'conversion steps', columns: ['unit', 'value', 'step'], rows: clone(rows), hl: { 0: 'cur' } },
          { type: 'vars', vals: { digits: String(Math.floor(n)).length } }
        ] });
        while (v >= 1000 && k < units.length - 1) {
          v = v / 1000; k++;
          rows.push([units[k], trim3(v), '÷ 1,000']);
          var hl = {}; hl[rows.length - 1] = 'cur';
          frames.push({ narr: 'Divide by 1,000 → <b>' + trim3(v) + ' ' + units[k] + '</b>. ' + (v >= 1000 ? 'Still ≥ 1,000, keep going.' : 'Now it is a friendly number — stop here.'), parts: [
            { type: 'table', label: 'conversion steps', columns: ['unit', 'value', 'step'], rows: clone(rows), hl: hl },
            { type: 'vars', vals: { current: trim3(v) + ' ' + units[k], 'divisions so far': k } }
          ] });
        }
        var ssd = n / 4e12, hdd = n / 2e13;
        frames.push({ narr: 'Result: <b>' + hb(n) + '</b>. To make it real: that is about <b>' + trim3(ssd) + '</b> × 4 TB SSDs, or <b>' + trim3(hdd) + '</b> × 20 TB hard disks — before replication. With 3 replicas, triple it.', parts: [
          { type: 'table', label: 'conversion steps', columns: ['unit', 'value', 'step'], rows: clone(rows), hl: (function () { var h = {}; h[rows.length - 1] = 'sel'; return h; })() },
          { type: 'vars', label: 'make it physical', vals: { '4 TB SSDs': trim3(ssd), '20 TB HDDs': trim3(hdd), 'with 3× replication (SSDs)': trim3(ssd * 3) }, hl: { 'with 3× replication (SSDs)': 'ok' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Will a 32-bit int hold every user ID?', html: `<p>Facebook-scale has ~3 billion users. Signed 32-bit max is 2<sup>31</sup> − 1 ≈ <b>2.1 billion</b> ${H.c('r', '→ overflow')}. Unsigned gets 4.3 B, but posts/messages run into trillions. ${H.c('g', 'Use 64-bit IDs')} (2<sup>63</sup> ≈ 9.2 × 10<sup>18</sup>) — e.g. Twitter's Snowflake: 41 bits of timestamp + 10 bits machine + 12 bits sequence.</p>` },
      { title: 'How long must a short URL code be?', html: `<p>Characters a–z, A–Z, 0–9 = 62 choices per position.</p>${H.table(['length k', '62<sup>k</sup>', 'enough for'], [['6', '≈ 5.7 × 10<sup>10</sup> (57 B)', '100M URLs/month for ~47 years'], ['7', '≈ 3.5 × 10<sup>12</sup> (3.5 T)', 'lots of headroom'], ['8', '≈ 2.2 × 10<sup>14</sup>', 'way more than needed']])}<p>Trick: 62<sup>k</sup> ≈ 2<sup>6k</sup> (since 62 ≈ 2<sup>5.95</sup>), so 7 chars ≈ 2<sup>42</sup> ≈ 4 × 10<sup>12</sup>. ${H.c('g', '7 characters')} is the classic answer.</p>` },
      { title: '1 billion IDs in memory', html: `<p>1 B × 8 bytes = 8 × 10<sup>9</sup> B = <b>8 GB</b>. As text UUIDs (36 B each) it becomes 36 GB; as binary UUIDs 16 GB. A <i>bitmap</i> marking which of 1 B IDs are "seen" needs only 10<sup>9</sup> bits = 125 MB. Same data, 300× difference — this is why representation matters.</p>` },
      { title: 'Per day → per second in your head', html: `<p>500 million messages/day ÷ 10<sup>5</sup> = <b>5,000/s</b> (exact: 5,787/s). We under-estimated by 16% because 86,400 &lt; 100,000. If you want to be closer, divide by 86,400 ≈ "divide by 10<sup>5</sup> then add 15%".</p>` },
      { title: '1 TB a day for 5 years', html: `<p>1 TB × 365 × 5 ≈ 1 TB × 1,800 = <b>1.8 PB</b>. With 3 replicas: 5.4 PB. With erasure coding (≈1.5× overhead instead of 3×): 2.7 PB. Same raw data, very different hardware bill.</p>` }
    ],
    deepDive: `<p><b>KB vs KiB.</b> Officially 1 KB = 1,000 bytes (SI) and 1 KiB = 1,024 bytes (IEC). Disk makers use decimal (that's why your "1 TB" drive shows 931 GiB in the OS), RAM is binary, and network speeds are decimal <i>bits</i> (1 Gbps = 10<sup>9</sup> bits/s = 125 MB/s). The biggest real-world trap is <b>bits vs bytes</b>: a "10 Gbps" NIC moves only ~1.25 GB/s, and in practice ~70–80% of that after protocol overhead.</p>
      <p><b>Why order of magnitude is enough.</b> Infrastructure comes in coarse steps: one box, a handful, dozens, hundreds. An estimate that is 30% off almost never changes the architecture; one that is 10× off always does. So spend your accuracy budget on the <i>inputs that dominate</i> (number of users, size of media) not on 86,400 vs 100,000.</p>
      <p><b>Text encoding matters.</b> A 280-character tweet is 280 bytes in ASCII but up to 1,120 bytes in UTF-8 if it is all emoji (4 bytes each) — and most CJK characters are 3 bytes. Real systems also store metadata (IDs, timestamps, language, counters) which often outweighs the text. Rows in databases have per-row overhead too (Postgres has ~24 bytes of tuple header plus alignment) and indexes commonly add 30–100% more.</p>
      <p><b>Sizes drift with technology.</b> Photos went from 100 KB to 3–5 MB (HEIC/JPEG at 12–48 MP), but serving sizes stay small because of resizing and modern codecs (WebP/AVIF save 25–50%). Video is the giant: one minute of 4K at ~15–20 Mbps is ~110–150 MB, and platforms store several renditions (240p…4K) per upload — often 2–3× the original size in total. Always say which rendition you are counting.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can produce a beautifully formatted capacity spreadsheet in seconds. That makes the <i>arithmetic</i> cheap — but it also produces confident numbers built on wrong units (bits vs bytes, KiB vs KB, per-day vs per-second) more often than you would expect.</p>
      <p><b>Use AI as a partner:</b> ask <code>List the size in bytes of each field in this schema and total it; show your assumptions</code>, or <code>Check my estimate for unit errors only</code>. Treat its constants as a draft and sanity-check the anchors you memorised (2<sup>10</sup> ≈ 10<sup>3</sup>, 1 day ≈ 10<sup>5</sup> s).</p>
      <p><b>New sizes to know in 2026:</b> an LLM token is ~4 English characters (~0.75 words); a 1,536-dimension float32 embedding is 6 KB (1,536 × 4 B), so 1 billion embeddings ≈ 6 TB before indexes — and quantising to int8 cuts it to 1.5 TB. A 70B-parameter model in 16-bit weights is ~140 GB. These are the "photo = 200 KB" facts of AI systems.</p>
      <p><b>What you must still own:</b> in the interview there is no assistant. You need to say "a day is about 10<sup>5</sup> seconds" without blinking, and to notice when a number is absurd.</p>`,
    problems: [{
      title: 'Pick the ID size and short-code length', level: 'Easy', tags: ['estimation', 'powers of two'], companies: ['Amazon', 'Google'],
      statement: `<p>A photo-sharing app expects <b>100 million new photos per day</b> and wants to keep them forever (plan for 10 years). (a) Is a 32-bit integer enough for photo IDs? (b) If each photo gets a public short code using characters [a–zA–Z0–9], what is the minimum code length? (c) How much memory to keep all photo IDs (just the IDs) in RAM?</p>`,
      constraints: `<p>Round to powers of ten. State every assumption. No calculator.</p>`,
      example: `<p>10 years ≈ 3,650 days → total photos ≈ 10<sup>8</sup> × 3.65 × 10<sup>3</sup> ≈ ${H.c('b', '3.65 × 10<sup>11</sup>')} (365 billion). That is ~85× more than 2<sup>32</sup> ≈ 4.3 × 10<sup>9</sup>, so ${H.c('r', '32-bit fails')}.</p>`,
      brute: { why: `<p>The naive move is to pick an auto-increment INT because "that's the default" and worry later. The 32-bit counter overflows after ~43 days (4.3 × 10<sup>9</sup> ÷ 10<sup>8</sup>/day) — a famous class of production outage (YouTube famously had to switch its view counter to 64-bit when Gangnam Style approached 2<sup>31</sup> views in 2014). Migrating a primary key type on a live multi-terabyte table is weeks of painful work.</p>` },
      mcq: { q: 'Roughly how many values does a 64-bit unsigned integer hold?', options: ['4.3 × 10<sup>9</sup>', '1.8 × 10<sup>19</sup>', '10<sup>12</sup>', '6.4 × 10<sup>4</sup>'], answer: 1, explain: '2<sup>64</sup> = 2<sup>4</sup> × 2<sup>60</sup> ≈ 16 × 1.15 × 10<sup>18</sup> ≈ 1.8 × 10<sup>19</sup>.' },
      hints: [`<p>Hint 1: Total items = per-day × days. 10 years ≈ 3,650 days ≈ 4 × 10<sup>3</sup>.</p>`, `<p>Hint 2: Compare totals with 2<sup>32</sup> ≈ 4 × 10<sup>9</sup> and with 62<sup>k</sup> for k = 6, 7, 8.</p>`, `<p>Hint 3: Memory = count × bytes per ID. A 64-bit ID is 8 bytes. Add headroom: never plan for exactly 100% of the code space.</p>`],
      solution: {
        approach: `<p><b>Step 1 – total photos:</b> 10<sup>8</sup>/day × ~3.65 × 10<sup>3</sup> days ≈ 3.65 × 10<sup>11</sup>. Add 2× headroom for growth ≈ <b>7 × 10<sup>11</sup></b>.</p>
          <p><b>Step 2 – ID width:</b> 2<sup>32</sup> ≈ 4.3 × 10<sup>9</sup> is far too small (overflows in ~43 days). 2<sup>64</sup> ≈ 1.8 × 10<sup>19</sup> is plenty → use a <b>64-bit ID</b> (e.g. Snowflake-style time-ordered IDs so they also sort by creation time and can be generated without a central counter).</p>
          <p><b>Step 3 – code length:</b> 62<sup>6</sup> ≈ 5.7 × 10<sup>10</sup> ${H.c('r', '&lt; 7 × 10<sup>11</sup>')}; 62<sup>7</sup> ≈ 3.5 × 10<sup>12</sup> ${H.c('g', '≥ 7 × 10<sup>11</sup>')} with ~5× spare, which also keeps random codes sparse so guessing is hard. Answer: <b>7 characters</b>.</p>
          <p><b>Step 4 – RAM for IDs:</b> 3.65 × 10<sup>11</sup> × 8 B ≈ <b>2.9 TB</b>. That does not fit on one machine (typical big servers have 0.5–2 TB RAM), so a full in-memory ID set would need to be sharded — or, better, you only keep the <i>hot</i> subset in a cache.</p>`,
        complexity: `<p>Five multiplications and three comparisons; the whole thing should take under 2 minutes out loud.</p>`,
        followUps: ['What if codes must not be guessable — does 7 chars still work?', 'How would you generate unique 64-bit IDs across 100 servers without coordination?']
      }
    }]
  });
  /* ===================== TOPIC 2: Latency numbers ===================== */
  var LAT = [
    ['L1 cache reference', 1, 'CPU\'s pocket'],
    ['Branch mispredict', 3, 'CPU guessed wrong'],
    ['L2 cache reference', 4, 'CPU\'s desk drawer'],
    ['Mutex lock/unlock (uncontended)', 20, ''],
    ['Main memory (RAM) reference', 100, 'walk to the bookshelf'],
    ['Compress 1 KB (fast codec)', 2000, ''],
    ['Send 1 KB over 10 Gbps NIC', 1000, ''],
    ['Read 1 MB sequentially from RAM', 20000, ''],
    ['Random 4 KB read from NVMe SSD', 80000, 'go to the shop next door'],
    ['Round trip inside one datacenter', 500000, ''],
    ['Read 1 MB sequentially from NVMe SSD', 300000, ''],
    ['Redis GET over the network (same DC)', 800000, ''],
    ['Simple indexed DB query (same DC)', 3000000, ''],
    ['HDD disk seek', 10000000, 'drive to another town'],
    ['Read 1 MB sequentially from HDD', 8000000, ''],
    ['Round trip US East ↔ US West', 65000000, ''],
    ['Round trip California ↔ Netherlands', 150000000, 'fly to another continent']
  ];
  topics.push({
    title: 'Latency Numbers Every Engineer Should Know',
    analogy: `<p>Imagine you are cooking and need salt. If it is <b>in your hand</b>, it takes 1 second (that's the CPU cache). If it is <b>on the shelf</b>, about 2 minutes (RAM). If you must <b>go to the shop</b>, about a day (SSD). If it ships from <b>another continent</b>, nearly 5 years (a network round trip across the ocean). Same salt, wildly different waits — and a good chef plans the kitchen so the salt is usually in hand. That is what caches, replicas and CDNs do.</p>`,
    explain: `<p><b>Latency</b> is how long one operation takes from start to finish. Different places where data can live have <i>wildly</i> different latencies — not 2× or 10× apart, but <b>a million times</b> apart. Knowing the rough numbers lets you predict whether a design is fast or slow before writing a line of code.</p>
      ${H.table(['Operation', 'Approx. time (2026 hardware)', 'If L1 = 1 second…'], [
        ['L1 cache reference', '~1 ns', '1 second'],
        ['L2 cache reference', '~4 ns', '4 seconds'],
        ['Main memory (RAM) reference', '~100 ns', '~2 minutes'],
        ['Send 1 KB over a 10 Gbps network card', '~1 µs', '~17 minutes'],
        ['Read 1 MB sequentially from RAM', '~20 µs', '~6 hours'],
        ['Random 4 KB read from NVMe SSD', '~50–100 µs', '~1 day'],
        ['Read 1 MB sequentially from NVMe SSD', '~0.2–0.5 ms', '~2–6 days'],
        ['Round trip within one datacenter', '~0.5 ms', '~6 days'],
        ['Redis GET / cache hit over the network', '~0.5–1 ms', '~1–2 weeks'],
        ['Indexed database lookup', '~1–5 ms', '~2–8 weeks'],
        ['Hard-disk seek', '~5–10 ms', '~2–4 months'],
        ['Cross-country round trip (US East ↔ West)', '~60–70 ms', '~2 years'],
        ['Transatlantic round trip (California ↔ Netherlands)', '~150 ms', '~4.8 years']
      ])}
      <p><b>Units:</b> 1 ms (millisecond) = 1,000 µs (microseconds) = 1,000,000 ns (nanoseconds). A human notices delays above about <b>100 ms</b>; a web page should respond in roughly <b>200 ms</b> or less to feel "instant".</p>
      <h4>The 6 lessons hidden in the table</h4>
      <ol>
        <li><b>Memory is ~1,000× faster than SSD random reads</b> — that is why caching works.</li>
        <li><b>Sequential beats random</b>: reading 1 MB in one go is cheap; reading 250 random 4 KB blocks is not. Logs, LSM-trees and Kafka are built on this.</li>
        <li><b>Network inside a datacenter is fast (~0.5 ms)</b>, but every hop adds up. Ten sequential service calls = 5+ ms before any work.</li>
        <li><b>Distance is physics.</b> Light in fibre travels ~200 km per ms, so a round trip across the Atlantic can never beat ~60 ms. Only moving data closer (CDN, edge, regional replicas) helps.</li>
        <li><b>Hard disks seek slowly</b> — fine for big sequential files, bad for random lookups.</li>
        <li><b>Compression is cheap compared with sending bytes far away</b> — compress before crossing a WAN.</li>
      </ol>`,
    clues: [
      '"p99 latency under 100 ms" / "feels instant" → count every network hop and disk read in the request path',
      '"users worldwide" / "global" → physics: cross-ocean RTT ~150 ms → CDN, edge caching, regional replicas',
      '"read-heavy, same data requested repeatedly" → RAM is ~1,000× faster than SSD random reads → cache',
      '"append-only log / high write throughput" → sequential I/O beats random I/O',
      '"microservices calling each other" → each hop ~0.5–1 ms + serialization; fan-out multiplies tail latency',
      '"why is this endpoint slow?" → build a latency budget, biggest term first'
    ],
    code: { lang: 'python', run: true, title: 'Latency budget calculator (runnable)', code: `# Rough latency numbers in nanoseconds (2026-ish hardware, order of magnitude only)
NS = {
    "ram_ref": 100,
    "ssd_random_4k": 80_000,
    "dc_round_trip": 500_000,
    "redis_get": 800_000,
    "db_indexed_query": 3_000_000,
    "hdd_seek": 10_000_000,
    "cross_region_rtt": 65_000_000,
}

def fmt(ns):
    for unit, size in (("s", 1e9), ("ms", 1e6), ("us", 1e3)):
        if ns >= size:
            return f"{ns/size:.1f} {unit}"
    return f"{ns:.0f} ns"

# A request path: one cache miss, two DB queries, one call to another region
path = ["redis_get", "db_indexed_query", "db_indexed_query", "cross_region_rtt"]
total = 0
for step in path:
    total += NS[step]
    print(f"{step:<18} +{fmt(NS[step]):>8}   running total {fmt(total)}")
print("Budget 100 ms ->", "OK" if total < 100e6 else "TOO SLOW")

# Human scale: stretch 1 ns to 1 second
for name, ns in NS.items():
    secs = ns  # 1 ns -> 1 s
    print(f"{name:<18} feels like {secs/86400:,.1f} days" if secs > 86400 else f"{name:<18} feels like {secs/60:,.1f} minutes")` },
    viz: [{
      title: 'Latency ladder on a log scale',
      gen: function () {
        var order = LAT.slice().sort(function (a, b) { return a[1] - b[1]; });
        var frames = [];
        frames.push({ narr: 'Each bar is one operation. Heights use a <b>log₁₀ scale</b>: height = number of zeros in the nanoseconds. 1 ns → 0, 100 ns → 2, 1 ms (10⁶ ns) → 6, 150 ms → 8.2. On a normal scale, everything except the ocean round trip would be invisible!', parts: [
          { type: 'bars', label: 'height = log₁₀(nanoseconds)', values: [0.05], texts: ['1 ns'], idxLabels: ['L1'] },
          { type: 'vars', vals: { scale: 'log10', '+1 height': '×10 slower', '+3 height': '×1,000 slower' } }
        ] });
        for (var i = 1; i < order.length; i++) {
          var vals = [], texts = [], labs = [], hl = {};
          for (var j = 0; j <= i; j++) { vals.push(Math.max(0.05, Math.log10(order[j][1]))); texts.push(ht(order[j][1])); labs.push(String(j + 1)); }
          hl[i] = 'cur';
          var o = order[i], human = o[1]; // 1 ns -> 1 s
          var hs = human >= 3.15e7 ? trim3(human / 3.15e7) + ' years' : human >= 86400 ? trim3(human / 86400) + ' days' : human >= 3600 ? trim3(human / 3600) + ' hours' : human >= 60 ? trim3(human / 60) + ' minutes' : human + ' seconds';
          var jump = o[1] / order[i - 1][1];
          frames.push({ narr: '<b>' + o[0] + '</b> ≈ ' + ht(o[1]) + (o[2] ? ' (' + o[2] + ')' : '') + '. ' + (jump >= 3 ? 'That is <b>' + trim3(jump) + '×</b> slower than the previous rung. ' : '') + 'If 1 ns were 1 second, this would take <b>' + hs + '</b>.', parts: [
            { type: 'bars', label: 'height = log₁₀(nanoseconds)', values: vals, texts: texts, idxLabels: labs, hl: hl },
            { type: 'vars', label: 'rung #' + (i + 1), vals: { operation: o[0], latency: ht(o[1]), 'log10(ns)': trim3(Math.log10(o[1])), 'human scale': hs }, hl: { latency: 'cur' } }
          ] });
        }
        var fin = {}; fin[order.length - 1] = 'bad'; fin[4] = 'ok';
        frames.push({ narr: 'The big picture: RAM (~100 ns) to an ocean round trip (~150 ms) is a factor of <b>1.5 million</b>. Designs win by keeping hot data in RAM, doing I/O sequentially, and keeping users close to their data.', parts: [
          { type: 'bars', label: 'all rungs (green = RAM, red = cross-ocean)', values: order.map(function (o) { return Math.max(0.05, Math.log10(o[1])); }), texts: order.map(function (o) { return ht(o[1]); }), idxLabels: order.map(function (o, k) { return String(k + 1); }), hl: fin },
          { type: 'table', label: 'legend', columns: ['#', 'operation'], rows: order.map(function (o, k) { return [String(k + 1), o[0]]; }) }
        ] });
        return frames;
      }
    }, {
      title: 'Build a latency budget for one request',
      input: 'dns tls lb app redis db db s3',
      inputLabel: 'Steps (dns, tls, lb, app, redis, db, s3, ssd, rpc, xregion, llm)',
      gen: function (input) {
        var COST = { dns: [20, 'DNS lookup (cached by OS ~0, cold ~20 ms)'], tls: [30, 'TLS handshake (1 RTT to edge)'], lb: [0.5, 'load balancer hop'], app: [2, 'app server CPU work'], redis: [0.8, 'Redis GET'], db: [3, 'indexed DB query'], s3: [25, 'object-store GET (first byte)'], ssd: [0.1, 'local SSD read'], rpc: [1, 'internal service call'], xregion: [65, 'cross-region round trip'], llm: [400, 'LLM call: time to first token'] };
        var steps = String(input).trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
        if (!steps.length) throw new Error('List steps separated by spaces, e.g. "lb app redis db"');
        if (steps.length > 14) throw new Error('Use at most 14 steps');
        steps.forEach(function (s) { if (!COST[s]) throw new Error('Unknown step "' + s + '". Use: ' + Object.keys(COST).join(', ')); });
        var frames = [], rows = [], total = 0, budget = 200;
        frames.push({ narr: 'A user taps a button. We will add up every step the request makes, <b>one after another</b> (sequential steps add; parallel steps take the max). Our budget is <b>' + budget + ' ms</b> — roughly what feels instant.', parts: [
          { type: 'table', label: 'latency budget', columns: ['#', 'step', 'cost (ms)', 'running total (ms)'], rows: [] },
          { type: 'vars', vals: { budget: budget + ' ms', used: '0 ms' } }
        ] });
        steps.forEach(function (s, i) {
          total += COST[s][0];
          rows.push([String(i + 1), COST[s][1], String(COST[s][0]), trim3(total)]);
          var hl = {}; hl[i] = total > budget ? 'bad' : 'cur';
          frames.push({ narr: 'Step ' + (i + 1) + ': <b>' + COST[s][1] + '</b> costs ~' + COST[s][0] + ' ms. Running total <b>' + trim3(total) + ' ms</b>' + (total > budget ? ' — <span class="c-r">over budget!</span>' : ' (' + trim3(budget - total) + ' ms left).'), parts: [
            { type: 'table', label: 'latency budget', columns: ['#', 'step', 'cost (ms)', 'running total (ms)'], rows: clone(rows), hl: hl },
            { type: 'bars', label: 'cost per step (ms)', values: steps.slice(0, i + 1).map(function (x) { return COST[x][0]; }), idxLabels: steps.slice(0, i + 1), hl: (function () { var h = {}; h[i] = 'cur'; return h; })() },
            { type: 'vars', vals: { budget: budget + ' ms', used: trim3(total) + ' ms', left: trim3(budget - total) + ' ms' }, hl: { used: total > budget ? 'bad' : 'ok' } }
          ] });
        });
        var big = steps.reduce(function (b, s) { return COST[s][0] > COST[b][0] ? s : b; }, steps[0]);
        frames.push({ narr: 'Total <b>' + trim3(total) + ' ms</b>. The biggest single cost is <b>' + COST[big][1] + '</b>. Optimise the biggest term first: cache it, run it in parallel, move it closer (CDN/edge), or take it off the critical path (do it asynchronously).', parts: [
          { type: 'table', label: 'latency budget', columns: ['#', 'step', 'cost (ms)', 'running total (ms)'], rows: clone(rows), hl: (function () { var h = {}; h[steps.indexOf(big)] = 'sel'; return h; })() },
          { type: 'vars', vals: { total: trim3(total) + ' ms', verdict: total <= budget ? 'within budget' : 'over budget', 'fix first': big }, hl: { verdict: total <= budget ? 'ok' : 'bad', 'fix first': 'sel' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Why caching a DB result helps', html: `<p>Indexed DB query ≈ 3 ms; Redis hit ≈ 0.8 ms; in-process memory cache ≈ 0.0001 ms. With a 90% Redis hit rate the average read = 0.9 × 0.8 + 0.1 × (0.8 + 3) ≈ <b>1.1 ms</b> instead of 3 ms — and, more importantly, the DB sees 10× fewer reads.</p>` },
      { title: 'N+1 queries kill pages', html: `<p>A page lists 50 orders and fetches each customer with its own query: 50 × 3 ms = <b>150 ms</b> just waiting. One batched query (<code>WHERE id IN (...)</code>) = ~4 ms. ${H.c('g', '35× faster')} with the same database.</p>` },
      { title: 'A user in Sydney, servers in Virginia', html: `<p>Sydney ↔ Virginia RTT ≈ 200 ms. A cold HTTPS page needs DNS + TCP + TLS (≈ 2–3 round trips with TLS 1.3 and TCP) + request = ~3–4 RTTs ≈ <b>700 ms</b> before the first byte. A CDN edge in Sydney (RTT ~10 ms) cuts the handshake part to ~40 ms. Physics, not code, was the bottleneck.</p>` },
      { title: 'Sequential vs random disk reads', html: `<p>Read 1 GB as one sequential stream on an HDD at ~150 MB/s ≈ <b>7 s</b>. Read the same 1 GB as 250,000 random 4 KB blocks at ~10 ms per seek ≈ <b>2,500 s (42 min)</b>. Same bytes, 350× slower. That's why databases use B-trees with big pages and why Kafka just appends.</p>` },
      { title: 'Tail latency from fan-out', html: `<p>A request calls 100 shards in parallel; each shard is slow (≥ 50 ms) 1% of the time. Probability the request waits for at least one slow shard = 1 − 0.99<sup>100</sup> ≈ <b>63%</b>. Your "rare" p99 becomes the common case — hedged requests and timeouts fix it.</p>` }
    ],
    deepDive: `<p><b>Where the numbers come from.</b> The classic list was popularised by Jeff Dean and Peter Norvig (~2010). Hardware has moved since: RAM latency barely changed (~80–100 ns — it is limited by physics of DRAM), but SSDs replaced spinning disks for hot data (NVMe random reads ~20–100 µs vs ~10 ms seeks), and datacenter NICs went from 1 Gbps to 25–400 Gbps. What has <i>not</i> changed is the <b>shape</b>: each tier is 10–1,000× slower than the one above, and the speed of light caps WAN latency.</p>
      <p><b>Throughput ≠ latency.</b> An NVMe SSD may serve 1 million random reads/second (throughput) while each read still takes ~80 µs (latency), because it handles hundreds in parallel. <b>Little's Law</b> ties them: <i>in-flight requests = throughput × latency</i>. 10,000 req/s × 0.05 s = 500 requests in flight — that number sizes your thread pools and connection pools.</p>
      <p><b>Percentiles, not averages.</b> Production SLOs use p50/p95/p99. Averages hide the slow tail (GC pauses, cache misses, noisy neighbours, retries). In a fan-out of N parallel calls, the request is as slow as the slowest call, so p99 of a single shard becomes roughly the p50 of the whole request when N ≈ 70–100. Techniques: hedged/backup requests (send a duplicate after the p95 time), tight timeouts, partial results, and reducing fan-out.</p>
      <p><b>Speed of light check.</b> Light in fibre ≈ 200,000 km/s = 200 km/ms. New York ↔ London ≈ 5,600 km → one-way ≥ 28 ms, round trip ≥ 56 ms; real routes ≈ 70–80 ms. If an architecture requires a synchronous cross-region write on every request (e.g. strongly-consistent multi-region commit), you have just added ≥ 60–100 ms to every write — which is why global databases offer per-region leaders, follower reads or relaxed consistency.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM calls are now a normal box in many request paths, and they are the slowest box by far: time-to-first-token is typically ~0.2–1 s, and generating 500 tokens at ~50–150 tokens/s takes 3–10 s. A vector search over an ANN index is usually 5–50 ms. Your latency budget must treat the model call like a cross-ocean round trip — or worse.</p>
      <p><b>Design moves that matter:</b> <i>stream</i> tokens so perceived latency = time-to-first-token; run retrieval and other lookups in <i>parallel</i>; cache prompts/prefixes (provider prompt caching cuts both latency and cost on repeated system prompts); use a small fast model for routing and a big one only when needed; move LLM work off the critical path with queues when the user does not need an immediate answer.</p>
      <p><b>Use AI as a partner:</b> paste a trace and ask <code>Rank the spans by contribution to p99 and suggest which can run in parallel</code>. <b>Where AI goes wrong:</b> it often quotes the 2010 numbers (1 MB from RAM = 250 µs, SSD random read = 150 µs) as if current, and mixes up throughput and latency. <b>What you own:</b> the mental table, and the instinct that "one more synchronous hop" is never free.</p>`,
    problems: [{
      title: 'Why is the profile page slow?', level: 'Easy', tags: ['latency', 'estimation'], companies: ['Meta', 'Microsoft'],
      statement: `<p>A profile page does, <b>one after another</b>: 1 auth check RPC, 1 user query, then <b>20 separate queries</b> (one per recent post) to fetch post details, then a call to a recommendation service hosted in <b>another region</b>. Estimate the server-side latency and propose the top two fixes with their new latency.</p>`,
      constraints: `<p>Use: RPC ≈ 1 ms, indexed DB query ≈ 3 ms, cross-region RTT ≈ 65 ms, recommendation compute ≈ 20 ms. Target p50 ≤ 50 ms.</p>`,
      example: `<p>1 (auth) + 3 (user) + 20 × 3 (posts) + 65 + 20 (recs) = ${H.c('r', '149 ms')}. Over budget by ~3×.</p>`,
      brute: { why: `<p>The naive fix is "buy a bigger database server". But the DB is not slow — each query is 3 ms. The time goes into <b>20 sequential round trips</b> (N+1 pattern) and <b>one cross-region hop</b>. Faster hardware shaves maybe 20%; restructuring the calls removes 80%.</p>` },
      mcq: { q: 'Which single change saves the most time here?', options: ['Batch the 20 post queries into one', 'Move recommendations into the same region (or make them async)', 'Upgrade the auth service', 'Add an index to the users table'], answer: 1, explain: 'The cross-region call (65 ms) + its compute (20 ms) = 85 ms is the largest term; batching saves 57 ms — also great, so do both.' },
      hints: [`<p>Hint 1: Write every step with its cost in a table and sort by size. Fix the biggest term first.</p>`, `<p>Hint 2: Sequential costs add; parallel costs take the max. Which calls do not depend on each other?</p>`, `<p>Hint 3: Batching (IN-list), caching, co-locating and asynchronous loading are the four standard levers. Recompute total after each.</p>`],
      solution: {
        approach: `<p><b>Budget table:</b> auth 1 ms, user 3 ms, posts 20 × 3 = 60 ms, recs 65 + 20 = 85 ms → <b>149 ms</b>. Biggest terms: recs (85) and posts (60).</p>
          <p><b>Fix 1 — recommendations:</b> deploy a read replica of the recommendation service in the same region (RTT 0.5 ms), or better, <i>load them asynchronously</i>: the page renders without them and the client fetches them in a second request. Critical-path cost drops from 85 ms to ~0 (async) or ~21 ms (co-located).</p>
          <p><b>Fix 2 — N+1 queries:</b> one batched query <code>SELECT ... WHERE post_id IN (…20 ids…)</code> ≈ 4 ms instead of 60 ms. Optionally cache post details in Redis (hit ≈ 0.8 ms).</p>
          <p><b>Fix 3 — parallelism:</b> auth and the user query are independent → run in parallel: max(1, 3) = 3 ms.</p>
          <p><b>New total:</b> 3 (auth ∥ user) + 4 (batched posts) + 0 (async recs) ≈ <b>7 ms</b> server time, ~20× faster, with zero new hardware. Then verify with tracing, because real p99 will include GC pauses and cache misses.</p>`,
        complexity: `<p>Latency goes from O(N) sequential round trips to O(1) round trips; total ≈ 149 ms → ~7 ms.</p>`,
        followUps: ['What would the p99 look like if one of the 20 queries occasionally takes 200 ms?', 'When is it NOT safe to make the recommendations call async?']
      }
    }]
  });
  /* ===================== TOPIC 3: QPS estimation ===================== */
  topics.push({
    title: 'Estimating Traffic: DAU → QPS → Peak QPS',
    analogy: `<p>A coffee shop sells <b>1,200 coffees a day</b> and is open 12 hours — that's <b>100 per hour on average</b>. But nobody plans staff for the average: at 8:30 am there is a queue out of the door (maybe 300 per hour) and at 3 pm it is empty. You hire for the <b>morning rush</b>. Servers are the same: you compute the average requests per second, then multiply for the rush hour.</p>`,
    explain: `<p><b>QPS</b> (queries per second, also RPS — requests per second) is the number of requests your system must handle every second. It decides how many servers, database replicas and cache nodes you need.</p>
      <h4>The 4-line recipe</h4>
      ${H.table(['Line', 'Formula', 'Example: a chat app'], [
        ['1. Users', 'DAU (daily active users)', '50 M DAU'],
        ['2. Actions per day', 'DAU × actions per user per day', '50 M × 40 messages = 2 × 10<sup>9</sup>/day'],
        ['3. Average QPS', 'actions per day ÷ 86,400 (≈ 10<sup>5</sup>)', '2 × 10<sup>9</sup> ÷ 10<sup>5</sup> = <b>20,000/s</b> (exact 23,148)'],
        ['4. Peak QPS', 'average × peak factor (2–3 normal, 5–10 for spiky events)', '23K × 3 ≈ <b>70,000/s</b>']
      ])}
      <h4>Reads vs writes — always split them</h4>
      <p>Most products are <b>read-heavy</b>: one tweet is written once but read hundreds of times. Compute <b>write QPS</b> and <b>read QPS</b> separately because they are solved differently: reads scale with <i>caches and replicas</i>; writes scale with <i>sharding, queues and batching</i>.</p>
      ${H.table(['Product', 'Typical read : write', 'What it means'], [
        ['Social feed (Twitter/Instagram)', '100:1 or more', 'cache everything, precompute feeds'],
        ['URL shortener', '~100:1', 'cache hot short codes'],
        ['Chat (WhatsApp)', '~1:1 (each message written once, delivered once or a few times)', 'write path matters as much as reads'],
        ['Metrics / logging / IoT', '1:100 (write-heavy)', 'append-only stores, batching, Kafka'],
        ['E-commerce catalogue', '1000:1', 'CDN + caches; orders are a tiny write stream']
      ])}
      <h4>Where do DAU numbers come from?</h4>
      <p>Ask the interviewer, or propose one: "Let's assume 200 M DAU, similar to Twitter's scale — OK?" Useful anchors (public, approximate): Facebook ~2 B+ DAU, WhatsApp ~2–3 B monthly users, YouTube ~2.5 B monthly users, X/Twitter a few hundred million DAU. Pick a round number and <b>say it out loud</b>.</p>
      <p><b>Shortcut memory:</b> 1 M/day ≈ 12/s · 100 M/day ≈ 1,200/s · 1 B/day ≈ 12,000/s · 10 B/day ≈ 120,000/s.</p>`,
    clues: [
      '"100 M daily active users" / "1 B requests per day" → divide by 10<sup>5</sup> for average QPS',
      '"handle the Super Bowl / New Year / flash sale" → peak factor 5–10×, maybe pre-scaling',
      '"read-heavy" / "users browse much more than they post" → split read and write QPS',
      '"each user checks the feed N times per day" → reads = DAU × N × items per load',
      '"millions of devices report every few seconds" → write QPS = devices ÷ interval',
      '"how many servers do we need?" → peak QPS ÷ per-server QPS (with headroom)'
    ],
    code: { lang: 'python', run: true, title: 'QPS estimator (runnable)', code: `SECONDS_PER_DAY = 86_400

def qps(dau, actions_per_user_per_day, peak_factor=3):
    """Return (per_day, average_qps, peak_qps)."""
    per_day = dau * actions_per_user_per_day
    avg = per_day / SECONDS_PER_DAY
    return per_day, avg, avg * peak_factor

def show(name, per_day, avg, peak):
    print(f"{name:<22} {per_day:>16,.0f}/day  avg {avg:>10,.0f}/s  peak {peak:>11,.0f}/s")

# Twitter-like assumptions (state them out loud in an interview!)
DAU = 200_000_000
show("tweets written", *qps(DAU, 0.5))          # half the users post once a day
show("timeline loads", *qps(DAU, 10))           # each user opens the feed 10x/day
show("tweets rendered", *qps(DAU, 10 * 20))     # 20 tweets per load

# IoT: 1M devices, one ping every 4 seconds, flat traffic (peak factor 1.2)
devices, interval = 1_000_000, 4
avg = devices / interval
print(f"{'driver location pings':<22} avg {avg:>10,.0f}/s  peak {avg*1.2:>11,.0f}/s")` },
    viz: [{
      title: 'QPS calculator: fill the estimate line by line',
      input: '200000000 0.5 10 3',
      inputLabel: 'DAU, writes/user/day, reads/user/day, peak factor',
      gen: function (input) {
        var a = nums(input, 4, 'Enter 4 numbers: DAU writesPerUserPerDay readsPerUserPerDay peakFactor (e.g. 200000000 0.5 10 3)');
        var dau = a[0], w = a[1], r = a[2], pk = a[3];
        if (dau < 1 || dau > 1e10) throw new Error('DAU should be between 1 and 10 billion');
        if (pk < 1 || pk > 50) throw new Error('Peak factor should be between 1 and 50');
        var rows = [], frames = [];
        function add(step, formula, val, narr, hlCls, vars) {
          rows.push([step, formula, val]);
          var hl = {}; hl[rows.length - 1] = hlCls || 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'table', label: 'traffic estimate', columns: ['line', 'formula', 'value'], rows: clone(rows), hl: hl },
            { type: 'vars', label: 'running numbers', vals: vars }
          ] });
        }
        var wd = dau * w, wa = wd / 86400, wp = wa * pk, rd = dau * r, ra = rd / 86400, rp = ra * pk;
        add('DAU', 'given / assumed', hum(dau), 'Start from users: <b>' + hum(dau) + ' daily active users</b>. Always state this assumption and let the interviewer adjust it.', 'cur', { DAU: hum(dau) });
        add('writes/day', 'DAU × ' + w, hum(wd), 'Each user writes ' + w + ' times a day on average → <b>' + hum(wd) + ' writes per day</b>. (Averages can be fractions: 0.5 means half the users post once.)', 'cur', { DAU: hum(dau), 'writes/day': hum(wd) });
        add('avg write QPS', 'writes/day ÷ 86,400', trim3(wa) + '/s', 'Divide by seconds in a day. Shortcut: ÷ 10⁵ gives ' + trim3(wd / 1e5) + '/s; exact gives <b>' + trim3(wa) + '/s</b>. Either is fine — say which you used.', 'cur', { 'writes/day': hum(wd), 'avg write QPS': trim3(wa) });
        add('peak write QPS', 'avg × ' + pk, trim3(wp) + '/s', 'Traffic is not flat — evenings and events spike. Peak ≈ average × ' + pk + ' = <b>' + trim3(wp) + ' writes/s</b>. We size the write path for this.', 'ok', { 'avg write QPS': trim3(wa), 'peak write QPS': trim3(wp) });
        add('reads/day', 'DAU × ' + r, hum(rd), 'Now reads: each user reads ' + r + ' times a day → <b>' + hum(rd) + ' reads per day</b>.', 'cur', { 'reads/day': hum(rd), 'peak write QPS': trim3(wp) });
        add('avg read QPS', 'reads/day ÷ 86,400', trim3(ra) + '/s', 'Average read rate <b>' + trim3(ra) + '/s</b>.', 'cur', { 'avg read QPS': trim3(ra), 'peak write QPS': trim3(wp) });
        add('peak read QPS', 'avg × ' + pk, trim3(rp) + '/s', 'Peak reads <b>' + trim3(rp) + '/s</b>. This number sizes caches, replicas and the CDN.', 'ok', { 'peak read QPS': trim3(rp), 'peak write QPS': trim3(wp) });
        var ratio = wa > 0 ? ra / wa : Infinity;
        add('read : write', 'avg read ÷ avg write', isFinite(ratio) ? trim3(ratio) + ' : 1' : 'reads only', ratio >= 10 ? 'Ratio ≈ <b>' + trim3(ratio) + ':1 → read-heavy</b>. Design focus: caching, read replicas, precomputation, CDN.' : ratio <= 0.1 ? 'Ratio ≈ <b>' + trim3(ratio) + ':1 → write-heavy</b>. Design focus: append-only storage, batching, partitioning, queues.' : 'Ratio ≈ <b>' + trim3(ratio) + ':1 → balanced</b>. Both paths need care.', 'sel', { 'read:write': isFinite(ratio) ? trim3(ratio) : '∞' });
        frames.push({ narr: 'Summary on a <b>log₁₀ scale</b> (each +1 in height = ×10). Notice how small the write bars are next to the read bars — the shape of this chart tells you where to spend your design time.', parts: [
          { type: 'bars', label: 'height = log₁₀(QPS)', values: [wa, wp, ra, rp].map(function (x) { return Math.max(0.05, Math.log10(Math.max(1, x))); }), texts: [wa, wp, ra, rp].map(function (x) { return hum(x) + '/s'; }), idxLabels: ['avg W', 'peak W', 'avg R', 'peak R'], hl: { 1: 'ok', 3: 'sel' } },
          { type: 'table', label: 'traffic estimate', columns: ['line', 'formula', 'value'], rows: clone(rows) }
        ] });
        return frames;
      }
    }, {
      title: 'A day of traffic: why we plan for the peak',
      input: '23000',
      inputLabel: 'Average QPS',
      gen: function (input) {
        var avg = nums(input, 1, 'Enter one number: the average QPS (e.g. 23000)')[0];
        if (avg <= 0 || avg > 1e9) throw new Error('Average QPS must be between 1 and 1e9');
        // A typical diurnal shape (relative to average), plus an event spike at 21:00
        var shape = [0.35, 0.25, 0.2, 0.18, 0.2, 0.3, 0.55, 0.9, 1.2, 1.25, 1.2, 1.25, 1.35, 1.3, 1.2, 1.15, 1.2, 1.35, 1.6, 1.8, 1.9, 2.6, 1.5, 0.75];
        var s = shape.reduce(function (x, y) { return x + y; }, 0) / 24;
        shape = shape.map(function (x) { return x / s; });
        var frames = [], max = 0, maxH = 0;
        frames.push({ narr: 'Traffic follows people: it is low at night and high in the evening. We will play one day hour by hour. The <b>average</b> is ' + hum(avg) + '/s, but watch the peak.', parts: [
          { type: 'bars', label: 'QPS per hour', values: [0], idxLabels: ['00'] },
          { type: 'vars', vals: { average: hum(avg) + '/s', 'peak so far': '–' } }
        ] });
        for (var h = 0; h < 24; h += 2) {
          var vals = [], labs = [], hl = {};
          for (var k = 0; k <= h + 1; k++) { vals.push(Math.round(avg * shape[k])); labs.push((k < 10 ? '0' : '') + k); if (vals[k] > max) { max = vals[k]; maxH = k; } }
          hl[maxH] = 'sel'; hl[h] = hl[h] || 'cur'; hl[h + 1] = hl[h + 1] || 'cur';
          var note = h === 2 ? 'Night: traffic is ~20% of average. Autoscaling can shrink the fleet here to save money.' : h === 8 ? 'Morning ramp: people wake up and open the app.' : h === 18 ? 'Evening: prime time, traffic well above average.' : h === 20 ? 'A live event at 21:00 (a match, a show) creates a sharp spike — the real peak.' : 'Hours ' + h + '–' + (h + 1) + ' at ~' + trim3(shape[h]) + '× and ' + trim3(shape[h + 1]) + '× of average.';
          frames.push({ narr: note, parts: [
            { type: 'bars', label: 'QPS per hour (purple = peak so far)', values: vals, idxLabels: labs, hl: hl },
            { type: 'vars', vals: { average: hum(avg) + '/s', 'peak so far': hum(max) + '/s at ' + maxH + ':00', 'peak ÷ average': trim3(max / avg) + '×' }, hl: { 'peak so far': 'sel' } }
          ] });
        }
        frames.push({ narr: 'The day\'s peak is <b>' + trim3(max / avg) + '× the average</b>. If we sized for the average, the service would fall over every evening. Rule: <b>peak ≈ 2–3× average</b> for normal days, then add headroom (run servers at ≤ 60–70% at peak) and plan separately for known events.', parts: [
          { type: 'vars', label: 'capacity to plan', vals: { average: hum(avg) + '/s', peak: hum(max) + '/s', 'with 1.5× headroom': hum(max * 1.5) + '/s' }, hl: { 'with 1.5× headroom': 'ok' } },
          { type: 'text', html: '<b>Why headroom?</b> One availability zone can fail (lose 1/3 of servers), deploys take servers out of rotation, and latency rises sharply as utilisation approaches 100% (queueing theory).' }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Twitter-like posting', html: `<p>200 M DAU × 0.5 tweets = 10<sup>8</sup>/day → 10<sup>8</sup> ÷ 10<sup>5</sup> ≈ <b>1,000–1,200 tweets/s</b> average, ~3,500/s peak. Sanity check: Twitter publicly reported ~6,000 tweets/s on average around 2013 with a record of ~143,000/s during a TV broadcast in Japan. Our order of magnitude is right; the record shows why event peaks need 10×+ planning.</p>` },
      { title: 'Search engine', html: `<p>Assume 8.5 B searches/day (a commonly cited figure for Google) → 8.5 × 10<sup>9</sup> ÷ 86,400 ≈ <b>~100,000 QPS</b> average, perhaps 200K+ at peak. Each search fans out to thousands of index shards internally, so <i>internal</i> QPS is far higher — always ask which layer you are estimating.</p>` },
      { title: 'Ride-hailing location pings (write-heavy)', html: `<p>2 M active drivers send GPS every 4 s → 2 × 10<sup>6</sup> ÷ 4 = <b>500,000 writes/s</b>, fairly flat. DAU-based maths does not apply here; <i>devices ÷ interval</i> does. This is why such systems keep latest locations in memory (Redis/geo-index) instead of a disk-based relational table.</p>` },
      { title: 'E-commerce flash sale', html: `<p>Normal: 10 M DAU × 30 page views = 3 × 10<sup>8</sup>/day ≈ 3,500 QPS. During a 10-minute flash sale, 2 M users each refresh 20 times: 4 × 10<sup>7</sup> ÷ 600 s ≈ <b>67,000 QPS</b> — ~20× normal. Plan: pre-scale, cache product pages at the CDN, queue checkout requests, rate-limit per user.</p>` },
      { title: 'Notifications blast', html: `<p>Send a push to 100 M users "within 5 minutes": 10<sup>8</sup> ÷ 300 s ≈ <b>333,000 sends/s</b>. The daily average is irrelevant — the deadline sets the rate. Answer: a queue with many parallel workers and batching per provider (APNs/FCM).</p>` }
    ],
    deepDive: `<p><b>Peak factors in reality.</b> Diurnal traffic usually swings 3–5× between trough and peak, so peak ≈ 1.5–2.5× average. Events (sports finals, New Year, launches, outages that cause retry storms) can add another 5–20×. Global products flatten the curve somewhat because time zones overlap, but regional traffic still peaks locally — so size <i>each region</i> for its own peak.</p>
      <p><b>Retries and amplification.</b> One user action is rarely one request. A page view may cause 1 HTML + 30 asset requests (mostly CDN), 5–10 API calls, and each API call may fan out to several internal services. Retries during partial outages can multiply load 2–5× exactly when you are weakest (a "retry storm"). Good estimates distinguish <b>edge QPS</b> (what the load balancer sees) from <b>internal QPS</b> per service and per database.</p>
      <p><b>Little's Law for concurrency.</b> <i>Concurrency = QPS × latency</i>. 70,000 peak QPS × 50 ms = 3,500 requests in flight. If each app instance can handle ~200 concurrent requests (thread pool / event loop limits), you need ≥ 18 instances just for concurrency. For long-lived connections (WebSockets, chat), count <b>concurrent connections</b> instead: 50 M DAU with ~10% online at peak = 5 M sockets; at ~50–100K sockets per gateway box → 50–100 boxes.</p>
      <p><b>Utilisation and queueing.</b> In a simple queue model, waiting time grows like 1/(1 − utilisation): at 50% busy you wait ~1× the service time, at 90% ~9×, at 99% ~99×. That is why capacity plans target 50–70% CPU at peak, not 100%.</p>`,
    aiEra: `<p><b>What AI changes:</b> for LLM features the unit of load is not just requests but <b>tokens per second</b>. 1 M DAU × 5 chat turns × (1,500 input + 300 output tokens) = 9 × 10<sup>9</sup> tokens/day ≈ <b>104,000 tokens/s</b> average. Providers rate-limit in requests per minute <i>and</i> tokens per minute, and GPU capacity is sized in tokens/s per replica — so estimate both.</p>
      <p><b>Agents multiply calls:</b> one "task" by an agent may make 5–30 model calls and many tool calls. Estimate <i>calls per task × tasks per day</i>, and watch the peak: agents retry automatically, which can amplify load like a retry storm.</p>
      <p><b>Use AI as a partner:</b> <code>Here are my DAU and actions; list which per-user actions I forgot (background sync, notifications, prefetch)</code> — it is good at recalling hidden traffic. <b>Where it goes wrong:</b> it happily divides by 3,600 instead of 86,400, or forgets the peak factor. <b>What you own:</b> the assumptions and the judgement of which number drives the design.</p>`,
    problems: [{
      title: 'Estimate Twitter\'s QPS', level: 'Medium', tags: ['estimation', 'QPS', 'twitter'], companies: ['X', 'Meta', 'Amazon', 'Google'],
      statement: `<p>Estimate the traffic for a Twitter-like service: (a) tweet write QPS (average and peak), (b) home-timeline read QPS, (c) number of tweets rendered per second, (d) the read:write ratio and what it implies for the design.</p>`,
      constraints: `<p>Assume 300 M monthly users, 200 M daily active. Each DAU posts 0.5 tweets/day and opens the home timeline 10 times/day; each open shows 20 tweets. Peak factor 3×.</p>`,
      example: `<p>Writes: 200 M × 0.5 = ${H.c('b', '10<sup>8</sup>/day')} → ÷ 10<sup>5</sup> ≈ ${H.c('g', '1,000–1,160/s')} avg, ~3,500/s peak.</p>`,
      brute: { why: `<p>The naive approach is to guess "a lot — let's use Cassandra and Kafka" without numbers. You cannot then justify any choice: 1,000 writes/s fits on one well-tuned database, while 460,000 tweet-reads/s does not. Numbers decide which side (reads or writes) deserves the clever design. Another naive mistake: computing only the average and sizing for it — the system falls over every evening.</p>` },
      mcq: { q: 'Home timeline: 200 M DAU × 10 loads/day ≈ how many timeline requests per second on average?', options: ['~2,300/s', '~23,000/s', '~230,000/s', '~2.3 M/s'], answer: 1, explain: '2 × 10<sup>9</sup>/day ÷ 86,400 ≈ 23,000/s. Shortcut: 2 × 10<sup>9</sup> ÷ 10<sup>5</sup> = 20,000.' },
      hints: [`<p>Hint 1: Compute per day first (DAU × actions), then divide by 86,400 (≈ 10<sup>5</sup>), then multiply by the peak factor.</p>`, `<p>Hint 2: Distinguish timeline <i>requests</i> from tweets <i>rendered</i> — one request returns 20 tweets.</p>`, `<p>Hint 3: Ratio = reads ÷ writes. At 100:1+ the design should precompute timelines (fan-out on write) and cache aggressively.</p>`],
      solution: {
        approach: `${H.table(['Quantity', 'Per day', 'Avg / s', 'Peak / s (×3)'], [
          ['Tweets written', '200 M × 0.5 = 10<sup>8</sup>', '≈ 1,160', '≈ 3,500'],
          ['Timeline requests', '200 M × 10 = 2 × 10<sup>9</sup>', '≈ 23,000', '≈ 70,000'],
          ['Tweets rendered', '2 × 10<sup>9</sup> × 20 = 4 × 10<sup>10</sup>', '≈ 460,000', '≈ 1.4 M']
        ])}
          <p><b>Read:write</b> ≈ 23,000 requests ÷ 1,160 writes ≈ <b>20:1</b> by request, or ≈ <b>400:1</b> by tweets read vs written. Strongly read-heavy.</p>
          <p><b>Design implications:</b> (1) Writes (3.5K/s peak) are modest — a sharded store handles them easily; the real write cost is <i>fan-out</i>: if the average user has 200 followers, 1,160 tweets/s × 200 = ~230,000 timeline inserts/s, so we use a queue and async workers. (2) Reads (70K requests/s, 1.4 M tweets/s) must be served from memory: precomputed per-user timelines in a Redis-like cache (list of tweet IDs) + a tweet-object cache; the database is the source of truth, not the read path. (3) Celebrities with millions of followers are handled by <i>fan-out on read</i> (merge their tweets at read time) to avoid 50 M inserts per tweet.</p>`,
        complexity: `<p>About 8 multiplications/divisions; target under 3 minutes in the interview, then move on to storage.</p>`,
        followUps: ['How many Redis nodes to keep the last 800 tweet IDs for every DAU?', 'What changes if a World Cup final multiplies tweets by 30× for 10 minutes?']
      }
    }]
  });
  /* ===================== TOPIC 4: Storage, bandwidth, cache memory ===================== */
  topics.push({
    title: 'Estimating Storage, Bandwidth & Cache Memory',
    analogy: `<p>Think of a <b>water tank for a building</b>. How big must the tank be? <i>Litres used per flat per day × flats × days you want to last</i> — that's <b>storage</b>. How thick must the pipe be? <i>Litres per second at the busiest moment</i> — that's <b>bandwidth</b>. And the small bucket in each kitchen that holds what you use most often? That's the <b>cache</b>: small, close, fast, and sized for the 20% of things you use 80% of the time.</p>`,
    explain: `<h4>Storage = how much data piles up</h4>
      <p><b>Storage per day = new items per day × size of one item.</b> Then multiply by how long you keep it, by how many copies you keep, and add some overhead for indexes.</p>
      ${H.table(['Line', 'Formula', 'Twitter-like example'], [
        ['1. Items/day', 'from the QPS step', '10<sup>8</sup> tweets/day'],
        ['2. Size per item', 'add up the fields', '~300 B (ID 8, user 8, time 8, text ~140–280, counters, flags)'],
        ['3. Per day', 'items × size', '10<sup>8</sup> × 300 B = <b>30 GB/day</b>'],
        ['4. Per year', '× 365', '≈ 11 TB/year'],
        ['5. Retention', '× years kept', '5 years ≈ <b>55 TB</b>'],
        ['6. Replication', '× 3 copies', '≈ <b>165 TB</b>'],
        ['7. Media (separately!)', '10% of tweets with a 500 KB image', '10<sup>7</sup> × 500 KB = <b>5 TB/day</b> → ~9 PB in 5 years']
      ])}
      <p>Notice line 7: <b>media dwarfs text</b> by ~150×. Always estimate media separately — it goes to <i>object storage</i> (S3-like blob store) and a CDN, not the database.</p>
      <h4>Bandwidth = how much data flows per second</h4>
      <p><b>Bandwidth = QPS × bytes per request.</b> Do it for both directions:</p>
      <ul>
        <li><b>Ingress</b> (data coming in, uploads): write QPS × upload size.</li>
        <li><b>Egress</b> (data going out, downloads): read QPS × response size. Usually much larger — and in the cloud, egress is what you pay for.</li>
      </ul>
      <p>Convert bytes to bits for network links: <b>1 MB/s = 8 Mbps</b>; <b>1 GB/s = 8 Gbps</b>. Example: 23,000 timeline reads/s × 6 KB = 138 MB/s ≈ <b>1.1 Gbps</b> of JSON — easy. But 23,000 image views/s × 200 KB = 4.6 GB/s ≈ <b>37 Gbps</b> — that needs a CDN.</p>
      <h4>Cache memory = the 80/20 rule</h4>
      <p>Usage is skewed: roughly <b>20% of items get 80% of the reads</b> (Pareto). So cache about 20% of one day's <i>unique</i> read data. Example: 2 × 10<sup>9</sup> timeline reads/day × 6 KB = 12 TB/day of reads; 20% → <b>2.4 TB</b> of RAM. A cache node with ~100 GB usable memory → ~24 nodes, ×2 for replicas → ~50 nodes. (If many reads hit the same items, the unique set is smaller — say so.)</p>`,
    clues: [
      '"store for 5 years" / "never delete" → retention multiplier (5 × 365 ≈ 1,800 days)',
      '"photos / videos / attachments" → estimate media separately; blob store + CDN',
      '"must survive a datacenter failure" → replication factor 3 (or erasure coding ~1.4–1.5×)',
      '"read-heavy, hot items" → 80/20 rule → cache ≈ 20% of daily read volume',
      '"serve video worldwide" → egress bandwidth in Gbps/Tbps → CDN is mandatory',
      '"how many disks / machines for storage?" → total ÷ usable capacity per node'
    ],
    code: { lang: 'python', run: true, title: 'Storage + bandwidth + cache estimator (runnable)', code: `def human_bytes(n):
    for unit in ["B", "KB", "MB", "GB", "TB", "PB", "EB"]:
        if abs(n) < 1000:
            return f"{n:,.1f} {unit}"
        n /= 1000
    return f"{n:,.1f} ZB"

DAY = 86_400

# ---- Storage (Twitter-like) ----
tweets_per_day = 100_000_000
tweet_bytes = 300
media_fraction, media_bytes = 0.10, 500_000
years, replicas = 5, 3

text_day = tweets_per_day * tweet_bytes
media_day = tweets_per_day * media_fraction * media_bytes
for label, per_day in (("text", text_day), ("media", media_day)):
    total = per_day * 365 * years
    print(f"{label:<6} per day {human_bytes(per_day):>10}  over {years}y {human_bytes(total):>10}  x{replicas} {human_bytes(total * replicas):>10}")

# ---- Bandwidth ----
read_qps, response_bytes = 23_000, 6_000      # timeline JSON
image_qps, image_bytes = 23_000, 200_000       # image views
for label, qps, size in (("timeline JSON", read_qps, response_bytes), ("images", image_qps, image_bytes)):
    bps = qps * size
    print(f"egress {label:<14} {human_bytes(bps)}/s = {bps * 8 / 1e9:,.1f} Gbps")

# ---- Cache (80/20 rule) ----
daily_read_bytes = read_qps * DAY * response_bytes
cache = 0.2 * daily_read_bytes
node_ram = 100e9
print(f"daily read volume {human_bytes(daily_read_bytes)}, cache 20% = {human_bytes(cache)}, nodes ~{cache / node_ram:.0f} (x2 for replicas)")` },
    viz: [{
      title: 'Storage calculator: from one record to petabytes',
      input: '100000000 300 0.1 500000 5 3',
      inputLabel: 'items/day, bytes/item, media fraction, bytes/media, years, replicas',
      gen: function (input) {
        var a = nums(input, 6, 'Enter 6 numbers: itemsPerDay bytesPerItem mediaFraction bytesPerMedia years replicas (e.g. 100000000 300 0.1 500000 5 3)');
        var n = a[0], sz = a[1], mf = a[2], ms = a[3], yrs = a[4], rep = a[5];
        if (mf > 1) throw new Error('Media fraction must be between 0 and 1 (e.g. 0.1 = 10%)');
        if (yrs > 100 || rep > 10) throw new Error('Keep years ≤ 100 and replicas ≤ 10');
        var rows = [], frames = [];
        function add(item, formula, val, narr, cls, extra) {
          rows.push([item, formula, val]);
          var hl = {}; hl[rows.length - 1] = cls || 'cur';
          var parts = [{ type: 'table', label: 'storage estimate', columns: ['line', 'formula', 'value'], rows: clone(rows), hl: hl }];
          if (extra) parts.push(extra);
          frames.push({ narr: narr, parts: parts });
        }
        var td = n * sz, md = n * mf * ms, tot = td + md, yr = tot * 365, all = yr * yrs, repl = all * rep;
        add('items/day', 'given', hum(n), 'We store <b>' + hum(n) + ' new items per day</b> (from the QPS estimate: writes/s × 86,400).');
        add('metadata/day', hum(n) + ' × ' + sz + ' B', hb(td), 'Each item\'s metadata/text is ~' + sz + ' bytes → <b>' + hb(td) + ' per day</b>. This goes to the database.', 'cur', { type: 'vars', vals: { 'DB per day': hb(td) } });
        add('media/day', hum(n) + ' × ' + mf + ' × ' + hb(ms), hb(md), mf > 0 ? 'Only ' + (mf * 100) + '% of items carry media, but each is ' + hb(ms) + ' → <b>' + hb(md) + ' per day</b>' + (td > 0 ? ' (' + trim3(md / td) + '× the metadata!)' : '') + '. This goes to object storage.' : 'No media in this system.', md > td ? 'bad' : 'cur', { type: 'vars', vals: { 'DB per day': hb(td), 'blob per day': hb(md) }, hl: { 'blob per day': md > td ? 'bad' : '' } });
        add('total/day', 'metadata + media', hb(tot), 'Total new data per day: <b>' + hb(tot) + '</b>.');
        add('per year', '× 365', hb(yr), 'One year ≈ 365 days → <b>' + hb(yr) + '</b>.');
        add('retention', '× ' + yrs + ' years', hb(all), 'Keep it ' + yrs + ' years → <b>' + hb(all) + '</b> of unique data.', 'cur');
        add('with copies', '× ' + rep + ' replicas', hb(repl), 'Store ' + rep + ' copies for durability → <b>' + hb(repl) + '</b> of raw disk. (Object stores often use erasure coding at ~1.5× instead of 3×, which would be ' + hb(all * 1.5) + '.)', 'ok');
        var nodes = repl / 20e12;
        add('machines', '÷ 20 TB usable per node', trim3(Math.max(1, Math.ceil(nodes))) + ' nodes', 'If one storage node holds ~20 TB usable, we need about <b>' + Math.max(1, Math.ceil(nodes)) + ' nodes</b>. That number tells you whether one machine is enough or the data must be sharded.', 'sel');
        frames.push({ narr: 'Metadata vs media on a <b>log₁₀ scale</b> (height = number of zeros in bytes). When the media bar is 2+ units taller, media is 100×+ bigger — separate stores, separate scaling plans.', parts: [
          { type: 'bars', label: 'height = log₁₀(bytes)', values: [td, md, all, repl].map(function (x) { return Math.max(0.05, Math.log10(Math.max(1, x))); }), texts: [hb(td), hb(md), hb(all), hb(repl)], idxLabels: ['meta/day', 'media/day', yrs + 'y unique', 'replicated'], hl: { 1: 'bad', 3: 'sel' } },
          { type: 'table', label: 'storage estimate', columns: ['line', 'formula', 'value'], rows: clone(rows) }
        ] });
        return frames;
      }
    }, {
      title: 'Bandwidth & cache calculator',
      input: '23000 1160 6000 300 0.2',
      inputLabel: 'avg read QPS, avg write QPS, bytes/read, bytes/write, cache fraction',
      gen: function (input) {
        var a = nums(input, 5, 'Enter 5 numbers: readQPS writeQPS bytesPerRead bytesPerWrite cacheFraction (e.g. 23000 1160 6000 300 0.2)');
        var rq = a[0], wq = a[1], rb = a[2], wb = a[3], cf = a[4];
        if (cf > 1) throw new Error('Cache fraction must be between 0 and 1');
        var rows = [], frames = [];
        function add(item, formula, val, narr, cls, vars) {
          rows.push([item, formula, val]);
          var hl = {}; hl[rows.length - 1] = cls || 'cur';
          frames.push({ narr: narr, parts: [{ type: 'table', label: 'bandwidth & cache', columns: ['line', 'formula', 'value'], rows: clone(rows), hl: hl }, { type: 'vars', vals: vars }] });
        }
        var ing = wq * wb, eg = rq * rb, dayRead = rq * 86400 * rb, cache = dayRead * cf, nodes = Math.max(1, Math.ceil(cache / 100e9));
        add('ingress', trim3(wq) + '/s × ' + hb(wb), hb(ing) + '/s', 'Incoming data = write QPS × write size = <b>' + hb(ing) + '/s</b>.', 'cur', { ingress: hb(ing) + '/s' });
        add('ingress (bits)', '× 8', trim3(ing * 8 / 1e6) + ' Mbps', 'Network links are measured in <b>bits</b>, so ×8 → <b>' + trim3(ing * 8 / 1e6) + ' Mbps</b>.', 'cur', { ingress: trim3(ing * 8 / 1e6) + ' Mbps' });
        add('egress', trim3(rq) + '/s × ' + hb(rb), hb(eg) + '/s', 'Outgoing data = read QPS × response size = <b>' + hb(eg) + '/s</b>. Egress is usually the big one — and the one cloud providers charge for.', 'cur', { ingress: trim3(ing * 8 / 1e6) + ' Mbps', egress: hb(eg) + '/s' });
        add('egress (bits)', '× 8', trim3(eg * 8 / 1e9) + ' Gbps', 'In bits: <b>' + trim3(eg * 8 / 1e9) + ' Gbps</b> average (peak ≈ 3× = ' + trim3(eg * 24 / 1e9) + ' Gbps). ' + (eg * 24 / 1e9 > 50 ? 'That is beyond a few servers\' NICs → serve via a <b>CDN</b>.' : 'A handful of servers with 10–25 Gbps NICs can serve this.'), eg * 24 / 1e9 > 50 ? 'bad' : 'ok', { egress: trim3(eg * 8 / 1e9) + ' Gbps', 'peak egress': trim3(eg * 24 / 1e9) + ' Gbps' });
        add('read volume/day', 'read QPS × 86,400 × size', hb(dayRead), 'Bytes read per day = <b>' + hb(dayRead) + '</b>. Much of it is the same popular items read again and again.', 'cur', { 'read volume/day': hb(dayRead) });
        add('cache size', '× ' + cf + ' (80/20 rule)', hb(cache), 'Cache the hot ' + (cf * 100) + '% → <b>' + hb(cache) + '</b> of RAM. That should serve ~80% of reads from memory.', 'ok', { 'cache RAM': hb(cache) });
        add('cache nodes', '÷ 100 GB usable per node', nodes + ' nodes (' + nodes * 2 + ' with replicas)', 'At ~100 GB usable RAM per cache node: <b>' + nodes + ' nodes</b>, ×2 for replicas = ' + nodes * 2 + '. Done — a concrete, defensible cache tier.', 'sel', { 'cache nodes': nodes, 'with replicas': nodes * 2 });
        return frames;
      }
    }],
    examples: [
      { title: 'WhatsApp-like message storage', html: `<p>100 B messages/day × 100 B each = 10<sup>13</sup> B = <b>10 TB/day</b>. If the server deletes messages after delivery (store-and-forward), only undelivered messages stay: maybe 1% → 100 GB live. If you keep history 1 year: 3.65 PB × 3 replicas ≈ 11 PB. ${H.c('b', 'Retention policy changes the answer by 10,000×')} — ask about it.</p>` },
      { title: 'YouTube-like uploads', html: `<p>500 hours of video uploaded per minute (a widely cited figure) = 30,000 min/min. At ~40 MB per minute of 1080p: 30,000 × 40 MB = 1.2 TB per minute ≈ <b>1.7 PB/day</b> of originals; with multiple renditions (×2–3) ≈ 4–5 PB/day. That is why video platforms build custom storage and transcoding fleets.</p>` },
      { title: 'Bandwidth for a video stream', html: `<p>1 M concurrent viewers × 5 Mbps (1080p) = 5 × 10<sup>12</sup> bits/s = <b>5 Tbps</b>. No origin can do that — CDN edges serve it, and adaptive bitrate drops users to lower renditions when congested.</p>` },
      { title: 'Cache for a URL shortener', html: `<p>20,000 redirects/s × 86,400 ≈ 1.7 × 10<sup>9</sup> reads/day; each cached mapping ~500 B. 20% hot → 3.4 × 10<sup>8</sup> × 500 B ≈ <b>170 GB</b> — but those reads hit far fewer <i>unique</i> URLs. If only 10 M distinct URLs are read per day, the hot set is 10 M × 500 B = 5 GB — fits in one Redis node (plus a replica).</p>` },
      { title: 'Database index overhead', html: `<p>A 2 TB users table with 3 secondary indexes may need 3–4 TB on disk. Rule of thumb: metadata storage × 1.5–2 for indexes and fragmentation, then × replicas. Leave 30% free disk for compaction/vacuum headroom.</p>` }
    ],
    deepDive: `<p><b>Replication vs erasure coding.</b> Three full replicas cost 3× storage but give fast reads from any copy and simple recovery. Erasure coding (e.g. Reed–Solomon 6+3 or 10+4) splits data into k data + m parity chunks: it survives m lost chunks at only (k+m)/k ≈ 1.4–1.5× overhead, but reconstruction reads from many nodes and costs CPU. Object stores (S3, GCS, Azure Blob) use erasure coding internally — which is why blob storage is ~5× cheaper per GB than replicated SSD databases.</p>
      <p><b>Storage tiers.</b> Hot data on NVMe (fast, expensive), warm on HDD or standard object storage, cold in archive tiers (cents per GB-month or less, retrieval in minutes to hours). Most data goes cold fast: in many social apps, items older than a few weeks get a tiny fraction of reads. Lifecycle policies that move data down tiers can cut storage bills by 50–80%.</p>
      <p><b>Compression and encoding.</b> Columnar formats (Parquet/ORC) with dictionary + run-length encoding often compress logs/analytics 5–10×. Text compresses 3–4× with zstd. Images and video are already compressed — do not count on further savings. Deduplication helps for backups and file-sync (same file uploaded by many users stored once, keyed by content hash).</p>
      <p><b>Bandwidth reality.</b> Effective throughput is lower than link speed (TCP/TLS/HTTP overhead, ~70–90% utilisation), and traffic is bursty. Cloud egress pricing (often several cents per GB to the internet, lower via CDNs and committed contracts) makes bandwidth a <i>cost</i> estimate, not just a capacity one: 1 PB/month of egress at even $0.02/GB is ~$20,000/month.</p>
      <p><b>Cache sizing nuance.</b> The 80/20 rule is a heuristic. Real access distributions are often Zipf-like: hit-rate grows roughly logarithmically with cache size, so doubling the cache from 20% to 40% might only lift hit-rate from 85% to 92%. Measure with a cache simulator on real traces when you can.</p>`,
    aiEra: `<p><b>What AI changes:</b> new data types with their own sizes. <b>Embeddings:</b> 1 B chunks × 1,024 dims × 4 B = 4 TB of vectors, plus an HNSW graph index (~+20–50%), and you usually want them in RAM or on fast SSD for low latency — quantisation (int8, binary, product quantisation) shrinks this 4–32× at some recall cost. <b>Logs of prompts/responses</b> for evaluation: 10 M requests/day × 8 KB ≈ 80 GB/day — small in bytes, but often sensitive (PII) so retention and access policies matter more than size. <b>Model weights</b>: a 70B model in 16-bit ≈ 140 GB, loaded on every GPU replica — bandwidth for cold starts matters.</p>
      <p><b>Use AI as a partner:</b> <code>Given this schema and these row counts, estimate on-disk size including indexes for Postgres; list assumptions</code>. Then check the 2–3 biggest fields yourself. <b>Where AI goes wrong:</b> mixing bits and bytes in bandwidth, forgetting replication, or counting media in the DB. <b>What you own:</b> deciding what is stored where and for how long — that is a product and cost decision, not arithmetic.</p>`,
    problems: [{
      title: 'Estimate Twitter\'s storage and bandwidth', level: 'Medium', tags: ['estimation', 'storage', 'bandwidth', 'twitter'], companies: ['X', 'Meta', 'Snap'],
      statement: `<p>Continuing from the QPS problem (10<sup>8</sup> tweets/day, 23,000 timeline requests/s average): estimate (a) tweet metadata storage for 5 years with 3× replication, (b) media storage for 5 years, (c) egress bandwidth for timelines and for images, (d) cache size for hot timelines.</p>`,
      constraints: `<p>Tweet record ≈ 300 B. 10% of tweets have one image (500 KB original; 200 KB served size). A timeline response is 20 tweets ≈ 6 KB JSON; each timeline load shows ~5 images on average. Cache: keep the last 800 tweet IDs (8 B each) for each DAU (200 M).</p>`,
      example: `<p>Metadata/day = 10<sup>8</sup> × 300 B = ${H.c('b', '30 GB')}. Media/day = 10<sup>7</sup> × 500 KB = ${H.c('r', '5 TB')} — 166× bigger.</p>`,
      brute: { why: `<p>A naive estimate lumps everything into "the database": 5 TB/day of images going into MySQL rows would make backups, replication and queries miserable, and costs ~5–10× more than object storage. Another naive error is quoting bandwidth in bytes against a link measured in bits (off by 8×), or forgetting that image egress, not JSON, dominates.</p>` },
      mcq: { q: 'Which part of Twitter\'s storage should live in an object store + CDN rather than the main database?', options: ['Tweet text', 'User profiles', 'Images and videos', 'Follower graph'], answer: 2, explain: 'Media is large, immutable and read-heavy — perfect for blob storage served through CDN edges. The DB stores only the media URL/ID.' },
      hints: [`<p>Hint 1: Per day first, then × 365 × 5, then × replicas. Do metadata and media in separate rows.</p>`, `<p>Hint 2: Egress = requests/s × bytes per request. Convert to Gbps with × 8. Images: 23,000 loads/s × 5 images × 200 KB.</p>`, `<p>Hint 3: Timeline cache = DAU × IDs per timeline × 8 B; then add tweet-object cache for the hot tweets.</p>`],
      solution: {
        approach: `${H.table(['Item', 'Calculation', 'Result'], [
          ['Metadata 5 y', '30 GB × 365 × 5 = 55 TB; × 3', '<b>≈ 165 TB</b> (+ indexes → ~250 TB)'],
          ['Media 5 y', '5 TB × 1,825 ≈ 9 PB; erasure coding ×1.5; + resized versions (~+40%)', '<b>≈ 15–20 PB</b> in object storage'],
          ['Timeline egress', '23,000/s × 6 KB = 138 MB/s', '<b>≈ 1.1 Gbps</b> avg, ~3.3 Gbps peak'],
          ['Image egress', '23,000 × 5 × 200 KB = 23 GB/s', '<b>≈ 184 Gbps</b> avg, ~550 Gbps peak → CDN'],
          ['Timeline cache', '200 M × 800 × 8 B', '<b>≈ 1.3 TB</b> RAM → ~13 nodes of 100 GB, ×2 replicas']
        ])}
          <p><b>Conclusions:</b> tweet metadata is a "normal" sharded database problem (hundreds of TB across tens of nodes). Media is a petabyte-scale blob-storage problem, served almost entirely by CDN (the origin sees only cache misses, maybe 5–10%). Timeline JSON bandwidth is trivial; image bandwidth needs edge caching. The timeline cache fits in about a dozen big-memory nodes, so precomputed timelines are affordable.</p>`,
        complexity: `<p>About 10 arithmetic steps; ~4 minutes in an interview. Report results in a small table so the interviewer can see the whole picture at once.</p>`,
        followUps: ['How does the estimate change if 5% of tweets contain a 30-second video?', 'How much could moving media older than 1 year to a cold tier save?']
      }
    }]
  });
  /* ===================== TOPIC 5: Numbers → machines ===================== */
  topics.push({
    title: 'From Numbers to Machines: Servers, Shards, Cache Nodes & Cost',
    analogy: `<p>Knowing that a wedding has <b>600 guests</b> is only useful once you turn it into decisions: <b>60 tables of 10</b>, <b>12 waiters</b> (one per 5 tables), <b>3 buses</b> of 200 seats. Estimation in system design ends the same way — you divide your big numbers by "how much one machine can handle" and get a concrete count of servers, database shards and cache boxes. Plus a few spare, in case a waiter calls in sick.</p>`,
    explain: `<p>Numbers matter only when they change a <b>decision</b>. The final step of estimation is: <b>count = demand ÷ capacity per unit ÷ target utilisation</b>, then add redundancy.</p>
      <h4>Rough capacity of one unit (order of magnitude, 2026 commodity cloud hardware)</h4>
      ${H.table(['Unit', 'Handles roughly', 'Notes'], [
        ['Stateless app server (8–16 vCPU)', '1,000–10,000 simple req/s', 'depends hugely on work per request; JSON + 1 cache call ≈ thousands'],
        ['Relational DB primary (Postgres/MySQL, big box)', '~10K–50K simple reads/s, ~5K–20K writes/s', 'single writer; scale reads with replicas'],
        ['Redis / Memcached node', '~100K–1M ops/s, 25–300 GB RAM', 'often network-bound before CPU-bound'],
        ['Kafka broker', '~100s of MB/s', 'scale by partitions'],
        ['Wide-column NoSQL node (Cassandra-style)', '~10K–50K writes/s per node, a few TB', 'scales horizontally, add nodes'],
        ['WebSocket gateway', '~50K–500K idle connections', 'memory per connection is the limit'],
        ['Storage node', '~10–100 TB', 'disk count × size; keep 20–30% free'],
        ['NIC', '10–100 Gbps', 'remember bits vs bytes']
      ])}
      <h4>The recipe</h4>
      <ol>
        <li><b>App servers</b> = peak QPS ÷ QPS per server ÷ 0.6 (run at ~60% to absorb spikes) → then make sure you have ≥ 2 per availability zone.</li>
        <li><b>Cache nodes</b> = cache RAM ÷ usable RAM per node, ×2 for replicas.</li>
        <li><b>DB shards</b> = max(storage ÷ storage per shard, write QPS ÷ writes per shard). Whichever is bigger wins.</li>
        <li><b>Read replicas</b> = reads that miss the cache ÷ reads per replica.</li>
        <li><b>Cost</b> (optional, impressive): units × price per unit per month.</li>
      </ol>
      <p>Example: 70,000 peak QPS ÷ 2,000 per server ÷ 0.6 ≈ <b>59 → 60 app servers</b> (20 per zone across 3 zones). Storage 250 TB ÷ 10 TB per shard = 25 shards; writes 3,500/s ÷ 5,000 per shard = 1 shard → <b>25 shards</b> (storage wins).</p>`,
    clues: [
      '"how many servers do we need?" → peak QPS ÷ per-server capacity ÷ utilisation target',
      '"single database won\'t be enough" → shards = max(storage-bound, write-bound)',
      '"keep latency low under peak" → target 50–70% utilisation, not 100%',
      '"survive the loss of a zone/region" → N+1 or N+2 redundancy across zones',
      '"is this cost-effective?" → units × unit price; compare to revenue per user',
      '"millions of concurrent connections" → size by connections per box, not QPS'
    ],
    code: { lang: 'python', run: true, title: 'Fleet sizer (runnable)', code: `import math

def fleet(peak_read_qps, peak_write_qps, per_server_qps, storage_tb, cache_gb,
          utilisation=0.6, zones=3, shard_tb=10, shard_writes=5_000,
          cache_node_gb=100, cache_hit=0.9, replica_reads=10_000):
    app = math.ceil((peak_read_qps + peak_write_qps) / per_server_qps / utilisation)
    app = max(app, 2 * zones)                       # at least 2 per zone
    app = math.ceil(app / zones) * zones            # spread evenly over zones
    cache = math.ceil(cache_gb / cache_node_gb) * 2  # x2 for replicas
    shards = max(math.ceil(storage_tb / shard_tb), math.ceil(peak_write_qps / shard_writes))
    miss_reads = peak_read_qps * (1 - cache_hit)
    replicas = max(1, math.ceil(miss_reads / replica_reads / shards))  # per shard
    return {"app servers": app, "cache nodes": cache, "db shards": shards,
            "replicas per shard": replicas, "db machines": shards * (1 + replicas)}

plan = fleet(peak_read_qps=70_000, peak_write_qps=3_500, per_server_qps=2_000,
             storage_tb=250, cache_gb=1_300)
for k, v in plan.items():
    print(f"{k:<20} {v}")

# Rough monthly cost with ASSUMED prices (check your provider's real price sheet)
price = {"app servers": 300, "cache nodes": 900, "db machines": 1_500}
total = sum(plan[k] * p for k, p in price.items())
print(f"approx monthly compute bill: \${total:,.0f}")` },
    viz: [{
      title: 'Turn numbers into an architecture with box counts',
      input: '70000 3500 2000 250 1300',
      inputLabel: 'peak read QPS, peak write QPS, QPS per app server, DB storage TB, cache GB',
      gen: function (input) {
        var a = nums(input, 5, 'Enter 5 numbers: peakReadQPS peakWriteQPS qpsPerServer storageTB cacheGB (e.g. 70000 3500 2000 250 1300)');
        var pr = a[0], pw = a[1], per = a[2], st = a[3], cg = a[4];
        if (per <= 0) throw new Error('QPS per server must be > 0');
        var app = Math.ceil((pr + pw) / per / 0.6); app = Math.max(app, 6); app = Math.ceil(app / 3) * 3;
        var cache = Math.max(1, Math.ceil(cg / 100)), shards = Math.max(1, Math.ceil(st / 10), Math.ceil(pw / 5000));
        var miss = pr * 0.1, reps = Math.max(1, Math.ceil(miss / 10000 / shards));
        var nodes = [
          { id: 'U', label: 'Users', x: 8, y: 30, shape: 'box' },
          { id: 'LB', label: 'Load Balancer', x: 28, y: 30, shape: 'box' },
          { id: 'APP', label: 'App servers', x: 50, y: 30, shape: 'box' },
          { id: 'C', label: 'Cache', x: 74, y: 10, shape: 'box' },
          { id: 'DB', label: 'DB shards', x: 74, y: 30, shape: 'box' },
          { id: 'R', label: 'Read replicas', x: 74, y: 50, shape: 'box' }
        ];
        var edges = [['U', 'LB'], ['LB', 'APP'], ['APP', 'C'], ['APP', 'DB', 'writes'], ['DB', 'R', 'replicate'], ['APP', 'R', 'misses']];
        var tags = {}, rows = [], frames = [];
        function fr(narr, hl, ehl, vars, row, cls) {
          if (row) rows.push(row);
          var thl = {}; if (row) thl[rows.length - 1] = cls || 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: clone(tags) },
            { type: 'table', label: 'sizing', columns: ['component', 'formula', 'count'], rows: clone(rows), hl: thl },
            { type: 'vars', vals: vars }
          ] });
        }
        fr('Here is a standard read-heavy architecture. Our demand: <b>' + hum(pr) + ' reads/s</b> and <b>' + hum(pw) + ' writes/s</b> at peak, <b>' + st + ' TB</b> of database data and <b>' + cg + ' GB</b> of hot data to cache. Let\'s size each box.', { U: 'cur' }, { 'U-LB': 'cur' }, { 'peak reads': hum(pr), 'peak writes': hum(pw) });
        tags.LB = '2+ (redundant)';
        fr('Load balancer: managed LBs scale automatically; we just need <b>at least 2</b> so there is no single point of failure.', { LB: 'cur' }, { 'LB-APP': 'cur' }, { 'LB instances': '≥ 2' }, ['load balancer', 'managed / ≥ 2 for redundancy', '2+'], 'ok');
        tags.APP = '×' + app;
        fr('App servers: (' + hum(pr) + ' + ' + hum(pw) + ') ÷ ' + per + ' per server ÷ 0.6 utilisation = ' + trim3((pr + pw) / per / 0.6) + ' → round up to a multiple of 3 zones = <b>' + app + ' servers</b> (' + app / 3 + ' per zone). If one zone dies, the other two carry ' + trim3((pr + pw) / per / (app * 2 / 3) * 100) + '% load.', { APP: 'cur' }, { 'LB-APP': 'ok' }, { 'app servers': app, 'per zone': app / 3 }, ['app servers', '(R+W) ÷ ' + per + ' ÷ 0.6, ×3 zones', String(app)], 'ok');
        tags.C = '×' + cache * 2;
        fr('Cache: ' + cg + ' GB ÷ 100 GB usable per node = <b>' + cache + ' nodes</b>, ×2 for replicas = ' + cache * 2 + '. With a ~90% hit rate, only ' + hum(miss) + ' reads/s reach the database.', { C: 'cur' }, { 'APP-C': 'ok' }, { 'cache nodes': cache * 2, 'reads reaching DB': hum(miss) + '/s' }, ['cache nodes', cg + ' GB ÷ 100 GB × 2', String(cache * 2)], 'ok');
        tags.DB = '×' + shards;
        fr('DB shards: storage needs ' + st + ' ÷ 10 TB = ' + Math.ceil(st / 10) + '; writes need ' + hum(pw) + ' ÷ 5,000 = ' + Math.ceil(pw / 5000) + '. Take the max → <b>' + shards + ' shards</b>. ' + (Math.ceil(st / 10) >= Math.ceil(pw / 5000) ? 'Storage is the binding constraint.' : 'Write throughput is the binding constraint.'), { DB: 'cur' }, { 'APP-DB': 'ok' }, { 'storage-bound': Math.ceil(st / 10), 'write-bound': Math.ceil(pw / 5000), shards: shards }, ['DB shards', 'max(TB ÷ 10, writes ÷ 5K)', String(shards)], 'ok');
        tags.R = reps + ' per shard';
        fr('Read replicas: cache misses (' + hum(miss) + '/s) spread over ' + shards + ' shards ÷ 10K reads per replica → <b>' + reps + ' replica(s) per shard</b> (at least 1 anyway, for failover).', { R: 'cur' }, { 'DB-R': 'ok', 'APP-R': 'ok' }, { 'replicas per shard': reps, 'DB machines': shards * (1 + reps) }, ['read replicas', 'misses ÷ shards ÷ 10K, min 1', reps + ' per shard'], 'ok');
        var cost = app * 300 + cache * 2 * 900 + shards * (1 + reps) * 1500;
        fr('Total fleet ≈ <b>' + (app + cache * 2 + shards * (1 + reps) + 2) + ' machines</b>. With assumed prices ($300/app server, $900/cache node, $1,500/DB machine per month) ≈ <b>$' + Math.round(cost).toLocaleString('en-US') + '/month</b> of compute. Now every box in your diagram has a number you can defend.', { APP: 'sel', C: 'sel', DB: 'sel', R: 'sel' }, {}, { machines: app + cache * 2 + shards * (1 + reps) + 2, 'monthly $ (assumed prices)': Math.round(cost).toLocaleString('en-US') }, ['TOTAL', 'sum of all tiers', String(app + cache * 2 + shards * (1 + reps) + 2)], 'sel');
        return frames;
      }
    }],
    examples: [
      { title: 'Chat gateways sized by connections', html: `<p>50 M DAU, 20% online at peak = 10 M WebSocket connections. At ~100K connections per gateway (memory ~10–20 KB each = 1–2 GB) → <b>100 gateways</b>, +30% headroom → 130. QPS here is secondary — connections are the binding constraint.</p>` },
      { title: 'Write-bound sharding', html: `<p>An IoT platform writes 500,000 readings/s, 100 B each = 50 MB/s, 4.3 TB/day; keep 30 days = 130 TB. Storage-bound: 130 ÷ 10 = 13 shards. Write-bound: 500K ÷ 20K per node = 25 nodes. <b>Write-bound wins → 25+ nodes</b> of a write-optimised store (or batch through Kafka into a time-series DB).</p>` },
      { title: 'One machine is enough!', html: `<p>An internal tool: 2,000 employees × 50 requests/day = 10<sup>5</sup>/day ≈ <b>1 QPS</b>. Data: 10 GB. A single small server + managed Postgres with a standby. Estimation's most valuable output is sometimes "${H.c('g', 'don\'t over-engineer')}".</p>` },
      { title: 'Cost sanity check', html: `<p>A free photo app with 10 M DAU stores 20 PB. At an assumed ~$0.02/GB-month for standard object storage: 20 × 10<sup>6</sup> GB × $0.02 = <b>$400,000/month</b> = $0.04 per DAU per month just for storage. If revenue per user is $0.10/month, storage tiering and compression are business-critical, not nice-to-haves.</p>` },
      { title: 'Headroom for zone failure', html: `<p>Need 40 servers' worth of capacity at peak. Spread across 3 zones and survive losing one: each zone must hold 40 ÷ 2 = 20 → <b>60 servers total</b>. Running "N+1 zones" costs 50% extra — say it explicitly; it is a real trade-off.</p>` }
    ],
    deepDive: `<p><b>Per-server capacity is the most uncertain number</b> in your estimate — it can vary 100× depending on the work per request (a cached JSON response vs. a server-side render with 10 DB calls vs. an ML inference). In real life you <i>measure</i> it with a load test: ramp traffic until p99 latency breaks the SLO, take ~60–70% of that as the safe per-instance capacity, and autoscale on that metric. In an interview, state an assumption ("~2,000 simple requests/s per instance") and move on.</p>
      <p><b>Binding constraint thinking.</b> Every tier is limited by one resource first: CPU (app servers), memory (caches, connection gateways), disk IOPS or capacity (databases), network (media servers), or a single-writer bottleneck (a primary DB, a hot partition, a global counter). The sizing formula should use the binding one, and the design should remove single-writer bottlenecks before buying bigger boxes.</p>
      <p><b>Hot spots break averages.</b> 25 shards × 5,000 writes/s = 125,000 writes/s on paper, but if one celebrity or one tenant generates 30% of traffic, its shard melts at 37,500/s. Good plans include a skew factor or a hot-key strategy (key salting, splitting, request coalescing, local caches).</p>
      <p><b>Cost models.</b> Rough cloud prices change often and differ by provider and contract, so state them as assumptions. The comparisons are stable though: RAM is ~10–100× pricier per GB than SSD, SSD ~3–5× pricier than HDD/object storage, and GPU-hours dwarf CPU-hours. Engineers who quote "this design costs about $X/month, and the cache pays for itself by removing 20 DB machines" stand out in senior interviews.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI features add a new, very expensive tier — GPUs. Size it the same way: <i>peak tokens/s ÷ tokens/s per GPU replica ÷ utilisation</i>. If a model replica on one GPU node serves ~2,000–5,000 output tokens/s with batching and you need 100,000 tokens/s at peak, that's 20–50 nodes — at a few dollars per GPU-hour each, often more than the rest of the fleet combined. Or use a hosted API and convert tokens into dollars directly.</p>
      <p><b>Smart moves:</b> semantic/prompt caching (reuse answers or prefixes), routing easy requests to a small model, batching offline jobs into cheaper batch APIs, and capping agent loops (max steps per task) are capacity decisions now.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my sizing table; which tier is most likely to be the real bottleneck and why?</code> — useful for spotting hot keys or single writers. <b>Where AI goes wrong:</b> quoting precise cloud prices that are out of date, or assuming linear scaling for a single-writer database. <b>What you own:</b> the binding-constraint reasoning and the redundancy policy.</p>`,
    problems: [{
      title: 'Size the fleet for a news website', level: 'Medium', tags: ['estimation', 'capacity planning'], companies: ['Amazon', 'Microsoft', 'Booking'],
      statement: `<p>A news site has <b>30 M DAU</b>, each reading <b>15 articles/day</b> (each article page makes 1 API call returning 20 KB of JSON; images come from a CDN). Editors publish <b>5,000 articles/day</b>. Comments: 2 M/day. Size: app servers, cache, database (primary + replicas), and the CDN egress for images (each article shows 3 images × 150 KB). Peak factor 4× (breaking news).</p>`,
      constraints: `<p>App server: 1,500 req/s. Target utilisation 60%, 3 zones. Article metadata+body 50 KB; comment 500 B; keep everything 10 years. Cache node 100 GB usable.</p>`,
      example: `<p>Reads: 30 M × 15 = 4.5 × 10<sup>8</sup>/day ≈ ${H.c('b', '5,200/s')} avg → ${H.c('r', '~21,000/s')} peak.</p>`,
      brute: { why: `<p>A naive plan sizes everything for the average (5,200/s → 4 servers) — then the site dies during breaking news, exactly when it matters most. The opposite naive plan shards the database "for scale" — but the entire article corpus is tiny (5,000 × 50 KB = 250 MB/day) and writes are ~0.1/s, so sharding adds complexity for nothing.</p>` },
      mcq: { q: 'What is the binding constraint for the article database here?', options: ['Write throughput', 'Storage size', 'Read QPS (solved by cache/replicas)', 'Network bandwidth'], answer: 2, explain: 'Writes are ~0.1 articles/s and 10 years of articles ≈ 0.9 TB — tiny. Reads (21K/s peak) are the challenge, solved by caching (popular articles are a small hot set) and a few replicas — no sharding needed.' },
      hints: [`<p>Hint 1: Compute peak read QPS and peak write QPS separately; writes here are almost nothing.</p>`, `<p>Hint 2: Hot set: a news site's popular articles are the last few days' — tens of thousands of articles × 50 KB ≈ a few GB. That fits in one cache node.</p>`, `<p>Hint 3: CDN egress = peak page views/s × 3 × 150 KB, then × 8 for Gbps.</p>`],
      solution: {
        approach: `${H.table(['Tier', 'Calculation', 'Result'], [
          ['Peak reads', '4.5 × 10<sup>8</sup> ÷ 86,400 × 4', '≈ 21,000 req/s'],
          ['App servers', '21,000 ÷ 1,500 ÷ 0.6 = 23.3 → multiple of 3', '<b>24</b> (8 per zone)'],
          ['Article storage', '5,000 × 50 KB × 3,650 days', '≈ 0.9 TB (+ comments 2 M × 500 B × 3,650 ≈ 3.7 TB)'],
          ['DB', 'writes: articles ~0.06/s, comments ~23/s avg (~90/s peak)', '<b>1 primary + 2–3 replicas</b>, no sharding'],
          ['Cache', 'hot: last 7 days ≈ 35,000 articles × 50 KB ≈ 1.75 GB + rendered pages', '<b>2 nodes</b> (1 + replica); hit-rate 95%+'],
          ['CDN egress', '21,000 × 3 × 150 KB = 9.45 GB/s', '<b>≈ 76 Gbps peak</b> — CDN, origin sees only misses']
        ])}
          <p><b>Design story:</b> stateless app servers behind a load balancer, a small Redis tier for hot articles (or even full-page caching at the CDN with short TTLs and purge-on-publish), one relational database with replicas for comments and articles, and images on object storage behind a CDN. The interesting work is <i>cache invalidation on breaking-news edits</i> and protecting the origin during spikes (request coalescing at the CDN), not raw capacity.</p>`,
        complexity: `<p>~12 arithmetic steps. The key insight — "no sharding needed" — is worth more than any of the numbers.</p>`,
        followUps: ['How would you handle a 50× spike when a story goes viral on social media?', 'What changes if the site personalises every page per user?']
      }
    }]
  });
  /* ===================== TOPIC 6: The HLD interview framework ===================== */
  var PHASES = [
    { id: 'REQ', label: 'Requirements', x: 13, y: 10, min: 5, say: 'Clarify what to build: core features (functional), scale/latency/availability/consistency (non-functional), and what is out of scope.', out: 'A written list: 3–5 functional requirements, 3–5 non-functional with numbers, and an out-of-scope list.' },
    { id: 'EST', label: 'Estimation', x: 38, y: 10, min: 3, say: 'Back-of-envelope: DAU → read/write QPS → storage → bandwidth → cache. Only what will change a decision.', out: 'A tiny table: peak QPS (R/W), storage over N years, read:write ratio.' },
    { id: 'API', label: 'API', x: 61, y: 10, min: 4, say: 'Define the contract: endpoints/RPCs with inputs and outputs, pagination, auth, idempotency.', out: '3–6 endpoints, e.g. POST /v1/urls, GET /{code}.' },
    { id: 'DM', label: 'Data Model', x: 85, y: 10, min: 4, say: 'Entities, key fields, access patterns, and the storage choice (SQL vs NoSQL vs blob) with a reason.', out: 'Tables/collections with primary keys and indexes that match the access patterns.' },
    { id: 'HLD', label: 'High-Level Design', x: 82, y: 42, min: 10, say: 'Draw boxes and arrows: client → LB → services → cache/DB/queue/blob/CDN. Walk one write and one read request end to end.', out: 'A diagram that satisfies every functional requirement.' },
    { id: 'DD', label: 'Deep Dives', x: 52, y: 42, min: 14, say: 'Go deep on the 2–3 hardest parts: bottlenecks, scaling, consistency, failure handling. Let the interviewer steer.', out: 'Concrete mechanisms: sharding key, cache strategy, fan-out, ID generation, failure modes.' },
    { id: 'TO', label: 'Trade-offs & Wrap-up', x: 20, y: 42, min: 5, say: 'Summarise choices and their costs, name what you would monitor, and what you would do with more time.', out: 'A crisp 60-second recap with the top trade-offs and next steps.' }
  ];
  function mmss(m) { var s = Math.round(m * 60), mm = Math.floor(s / 60), ss = s % 60; return mm + ':' + (ss < 10 ? '0' : '') + ss; }
  topics.push({
    title: 'The HLD Interview Framework: 6 Phases and a Clock',
    analogy: `<p>Building a house goes in a fixed order: <b>talk to the family</b> (what rooms? how many people?), <b>check the budget and plot size</b>, agree on <b>where doors and windows go</b>, decide <b>what materials</b>, draw the <b>floor plan</b>, then zoom into <b>tricky parts</b> like the staircase and plumbing, and finally explain <b>what you traded off</b> ("bigger kitchen, smaller garden"). Nobody pours concrete before knowing how many bedrooms. A system design interview is the same house-building conversation, squeezed into 45 minutes.</p>`,
    explain: `<p>A <b>High-Level Design (HLD) interview</b> gives you a vague prompt like "Design Instagram" and ~45–60 minutes. You are judged less on the "right" answer (there isn't one) and more on <b>how you think</b>: do you clarify, quantify, structure, go deep where it matters, and own trade-offs? A fixed framework keeps you calm and shows all of that.</p>
      ${H.table(['#', 'Phase', 'Time (45 min)', 'What you produce'], [
        ['1', '<b>Requirements</b>', '~5 min', 'functional + non-functional (with numbers) + out of scope'],
        ['2', '<b>Estimation</b>', '~3 min', 'peak QPS, storage, bandwidth — only what drives decisions'],
        ['3', '<b>API</b>', '~4 min', 'the contract: endpoints, params, responses'],
        ['4', '<b>Data model</b>', '~4 min', 'entities, keys, access patterns, DB choice'],
        ['5', '<b>High-level design</b>', '~10 min', 'boxes and arrows; walk a read and a write'],
        ['6', '<b>Deep dives</b>', '~14 min', '2–3 hard parts: scale, consistency, failures'],
        ['7', '<b>Trade-offs & wrap-up</b>', '~5 min', 'what you chose, what it cost, what you\'d monitor']
      ])}
      <p>(Many people count estimation inside requirements, so you will hear it called a "6-step" framework — same thing.)</p>
      <h4>Golden rules</h4>
      <ul>
        <li><b>Breadth first, then depth.</b> Get a complete, simple design on the board by ~minute 25. A perfect cache design with no database is a fail; a simple end-to-end design plus two good deep dives is a pass.</li>
        <li><b>Think out loud and check in.</b> "I'm going to assume X — does that match what you had in mind?" Interviewers drop hints; listen for them.</li>
        <li><b>Write things down.</b> Requirements and numbers on the board become your checklist later ("we said p99 &lt; 200 ms, so…").</li>
        <li><b>Every box needs a reason.</b> Don't add Kafka because it's cool; add it because "fan-out to 200 followers must be async".</li>
        <li><b>Let the interviewer steer deep dives.</b> Offer options: "I could go deeper into the feed generation or the media pipeline — which is more interesting to you?"</li>
      </ul>`,
    clues: [
      '"Design X" with no details → the vagueness is deliberate; start with clarifying questions',
      '"You have 45 minutes" → budget time per phase; aim for a full design by ~25 minutes',
      '"What would you do if…?" from the interviewer → a deep-dive invitation; follow it',
      '"Let\'s not worry about…" → explicitly out of scope; write it down and move on',
      '"How would this scale to 10×?" → revisit your estimates and the binding constraint',
      '"Any questions or anything to add?" near the end → give the trade-offs recap'
    ],
    viz: [{
      title: 'The interview clock: phase by phase',
      input: '45',
      inputLabel: 'Interview length in minutes (30–75)',
      gen: function (input) {
        var total = nums(input, 1, 'Enter the interview length in minutes, e.g. 45')[0];
        if (total < 30 || total > 75) throw new Error('Use a length between 30 and 75 minutes');
        var scale = total / 45, frames = [], elapsed = 0;
        var nodes = PHASES.map(function (p) { return { id: p.id, label: p.label, x: p.x, y: p.y, shape: 'box' }; });
        var edges = []; for (var i = 0; i < PHASES.length - 1; i++) edges.push([PHASES[i].id, PHASES[i + 1].id]);
        var alloc = PHASES.map(function (p) { return p.min * scale; });
        function graph(cur, done, tagsExtra) {
          var hl = {}, ehl = {}, tags = {};
          PHASES.forEach(function (p, k) {
            if (k < cur) { hl[p.id] = 'done'; tags[p.id] = '✓ ' + mmss(alloc[k]); }
            else if (k === cur) { hl[p.id] = 'cur'; tags[p.id] = '⏱ ' + mmss(alloc[k]); }
            else tags[p.id] = mmss(alloc[k]);
            if (k < cur && k + 1 < PHASES.length) ehl[PHASES[k].id + '-' + PHASES[k + 1].id] = 'ok';
          });
          if (done) PHASES.forEach(function (p) { hl[p.id] = 'ok'; });
          return { type: 'graph', directed: true, height: 52, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags };
        }
        function bars(cur) {
          var hl = {}; for (var k = 0; k < PHASES.length; k++) hl[k] = k < cur ? 'done' : k === cur ? 'cur' : '';
          return { type: 'bars', label: 'minutes per phase', values: alloc.map(function (x) { return Math.round(x * 10) / 10; }), texts: alloc.map(mmss), idxLabels: PHASES.map(function (p) { return p.id; }), hl: hl };
        }
        frames.push({ narr: 'The interviewer says: "Design a URL shortener." The clock starts. We have <b>' + total + ' minutes</b>, split across 7 phases (time scaled from the 45-minute plan). Breadth first: we want a complete design on the board by about minute ' + Math.round(26 * scale) + '.', parts: [
          graph(-1), bars(-1), { type: 'vars', label: 'clock', vals: { elapsed: '0:00', remaining: mmss(total) } }
        ] });
        PHASES.forEach(function (p, k) {
          frames.push({ narr: '<b>Phase ' + (k + 1) + ': ' + p.label + '</b> (' + mmss(alloc[k]) + '). ' + p.say, parts: [
            graph(k), bars(k), { type: 'vars', label: 'clock', vals: { elapsed: mmss(elapsed), 'phase ends at': mmss(elapsed + alloc[k]), remaining: mmss(total - elapsed) }, hl: { elapsed: 'cur' } }
          ] });
          elapsed += alloc[k];
          frames.push({ narr: '✓ Checkpoint at <b>' + mmss(elapsed) + '</b> — you should now have: ' + p.out + (k === 4 ? ' <b>This is the most important checkpoint:</b> a complete, working design exists.' : '') + (k === 5 ? ' If the interviewer is still asking questions, follow them — deep dives are where senior signal lives.' : ''), parts: [
            graph(k + 1 < PHASES.length ? k + 1 : PHASES.length), bars(k + 1), { type: 'vars', label: 'clock', vals: { elapsed: mmss(elapsed), remaining: mmss(total - elapsed), 'phases done': (k + 1) + ' / 7' }, hl: { 'phases done': 'ok' } }
          ] });
        });
        frames.push({ narr: 'Time! All phases covered. Notice the shape: about <b>a third</b> of the time on understanding the problem (requirements, numbers, API, data), <b>a quarter</b> on the big picture, and <b>a third</b> on depth. Running over in an early phase is the #1 reason candidates never reach deep dives.', parts: [
          graph(PHASES.length, true), { type: 'vars', label: 'clock', vals: { elapsed: mmss(total), remaining: '0:00' }, hl: { remaining: 'sel' } }
        ] });
        return frames;
      }
    }, {
      title: 'Strong vs weak timelines (5-minute slots)',
      gen: function () {
        var slots = ['0-5', '5-10', '10-15', '15-20', '20-25', '25-30', '30-35', '35-40', '40-45'];
        var full = {
          strong: ['REQ', 'EST+API', 'DM', 'HLD', 'HLD', 'DD', 'DD', 'DD', 'TO'],
          weakA: ['HLD?', 'DB tuning', 'DB tuning', 'cache', 'cache', 'REQ?', 'HLD', 'HLD', '—'],
          weakB: ['REQ', 'REQ', 'REQ', 'EST', 'EST', 'API', 'HLD', 'HLD', '—'],
          weakC: ['REQ', 'EST', 'API', 'DM', 'HLD', 'HLD', 'HLD', 'HLD', 'HLD']
        };
        var rows = ['strong', 'weakA', 'weakB', 'weakC'], heads = ['Strong: framework', 'Weak A: jumps to tech', 'Weak B: stuck clarifying', 'Weak C: never goes deep'];
        var notes = [
          'Four candidates, same prompt. We reveal their timelines 5 minutes at a time.',
          '0–5 min: Strong and B clarify requirements. A starts drawing boxes before knowing what to build. C is on track.',
          '5–10 min: Strong does quick estimates + API. A is already tuning a database it hasn\'t justified.',
          '10–15 min: B is <i>still</i> clarifying — asking questions is good, but 15 minutes of it signals indecision.',
          '15–20 min: Strong is drawing the high-level design with numbers behind every box.',
          '20–25 min: Strong has a complete design (checkpoint!). A realises the requirements were different and must restart.',
          '25–30 min: Strong starts deep dives — the interviewer picks "how do you generate unique short codes?"',
          '30–35 min: C keeps adding more boxes at the same shallow level — breadth without depth.',
          '35–40 min: Strong discusses caching hot links, failure modes, and sharding.',
          '40–45 min: Strong wraps up with trade-offs. A and B never finished a design; C never showed depth.'
        ];
        var frames = [];
        for (var s = 0; s <= slots.length; s++) {
          var grid = rows.map(function (r) { return full[r].map(function (c, j) { return j < s ? c : ''; }); });
          var hl = {};
          rows.forEach(function (r, i) {
            for (var j = 0; j < s; j++) {
              var c = full[r][j];
              if (r === 'strong') hl[i + ',' + j] = j === s - 1 ? 'cur' : 'ok';
              else if (c === '—' || c.indexOf('?') >= 0 || c === 'DB tuning' || (r === 'weakB' && j >= 1 && j <= 2) || (r === 'weakC' && j >= 5)) hl[i + ',' + j] = 'bad';
              else hl[i + ',' + j] = 'done';
            }
          });
          frames.push({ narr: notes[s], parts: [{ type: 'grid', label: 'timeline (minutes)', colHead: slots, rowHead: heads, rows: grid, hl: hl }] });
        }
        frames.push({ narr: 'Lesson: the framework is not bureaucracy — it is a <b>time budget</b> that guarantees you show every signal the interviewer is scoring: clarity, quantitative thinking, a complete design, depth, and judgement.', parts: [
          { type: 'table', label: 'what each interviewer wrote down', columns: ['candidate', 'feedback'], rows: [['Strong', 'Structured, quantified, complete design, solid depth, aware of trade-offs → hire'], ['Weak A', 'Solved the wrong problem; jumped to tech without requirements'], ['Weak B', 'Never reached a design; could not drive the conversation'], ['Weak C', 'Broad but shallow; no evidence of depth']], hl: { 0: 'ok', 1: 'bad', 2: 'bad', 3: 'bad' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Opening line that buys you structure', html: `<p>"Before designing, I'd like to spend ~5 minutes on requirements and quick numbers, then an API and data model, then the high-level design, and then we can deep-dive wherever you like. Does that work?" — You've just shown structure and invited the interviewer to steer.</p>` },
      { title: 'A good checkpoint sentence', html: `<p>At ~minute 25: "This design covers all three functional requirements: create (write path), redirect (read path through cache), and analytics (async via the queue). Next I'd like to go deeper into short-code generation and hot-key caching — or is there another area you'd prefer?"</p>` },
      { title: 'Recovering from overtime', html: `<p>You notice it's minute 18 and you're still on the data model. Say: "I'm conscious of time — let me sketch the full flow now and we can return to the schema details in the deep dive." Interviewers reward self-awareness; they penalise silence and rabbit holes.</p>` },
      { title: '60-minute variant', html: `<p>Scale proportionally (~1.33×): requirements 7, estimates 4, API 5, data model 5, HLD 13, deep dives 19, wrap-up 7. The extra time goes mostly into deep dives — that's where senior candidates differentiate.</p>` },
      { title: 'Senior vs junior expectations', html: `<p>Juniors/new grads: a correct end-to-end design with sensible components is often enough. Senior/staff: you're expected to drive, quantify, identify bottlenecks unprompted, discuss failure modes, consistency, operability (monitoring, deploys, migrations) and cost — and to <i>choose</i> between options with reasons.</p>` }
    ],
    deepDive: `<p><b>What interviewers actually score</b> (common rubrics across big tech): (1) <i>problem navigation</i> — clarifying ambiguity, scoping; (2) <i>solution design</i> — a coherent architecture that meets the requirements; (3) <i>technical depth</i> — real mechanisms, not buzzwords; (4) <i>trade-off reasoning</i> — alternatives considered and why rejected; (5) <i>communication</i> — structured, collaborative, responsive to hints. The framework maps one-to-one onto these.</p>
      <p><b>Adapting the order.</b> The framework is a default, not a law. For data-heavy problems (analytics, ad-click aggregation) the data model and estimates drive everything — spend longer there. For real-time problems (chat, multiplayer) the connection model and message flow deserve the HLD time. For infrastructure prompts ("design a distributed rate limiter / key-value store") the API is tiny and the deep dives are the whole interview. Saying "I'll adapt the usual order because…" is itself a senior signal.</p>
      <p><b>Product-style vs infra-style interviews.</b> Product design (Instagram, Uber) rewards end-to-end user flows and pragmatic component choices; infrastructure design (a queue, a cache, a scheduler) rewards internals — replication, consistency, partitioning, failure detection. Ask early which flavour the interviewer wants if it's unclear.</p>
      <p><b>Anti-patterns.</b> Name-dropping (Kafka, Cassandra, Kubernetes) without reasons; designing for 1 B users when they said 10 K; ignoring the numbers you computed; never mentioning failure; arguing with the interviewer instead of exploring their concern; going silent for minutes. A useful tactic is to narrate your decision: "Two options here, A and B. A is simpler, B scales writes better. Given our 3,500 writes/s, A is enough — I'll pick A and note B as the path if we grow 10×."</p>`,
    aiEra: `<p><b>What AI changes:</b> many 2026 interviews include AI-shaped prompts ("design a support chatbot", "design a RAG search over company docs", "design an agent that books travel"). The framework still works — add <i>model-specific</i> items to each phase: requirements (quality bar, hallucination tolerance, latency to first token, cost per request), estimation (tokens/s, GPU or API cost), API (streaming responses, tool-call schemas), data model (documents, chunks, embeddings, conversation state), HLD (retrieval, model gateway, guardrails, evaluation pipeline), deep dives (caching, evaluation, safety, fallback when the model is down).</p>
      <p><b>Practice with AI:</b> ask an assistant to role-play the interviewer: <code>Act as a system design interviewer for "design a URL shortener". Ask clarifying questions back, interrupt me at minute 25 if I have no complete design, and grade me on the 5 rubric areas.</code> It's an excellent sparring partner for timing and communication.</p>
      <p><b>Where AI goes wrong:</b> it produces generic "kitchen-sink" architectures with every buzzword, and it doesn't feel time pressure. <b>What you must still own:</b> pacing, prioritising, and the courage to say "this component isn't needed at our scale."</p>`,
    problems: [{
      title: 'Plan your 45 minutes for "Design Instagram"', level: 'Easy', tags: ['framework', 'interview strategy'], companies: ['Meta', 'Google', 'Amazon'],
      statement: `<p>You're given "Design Instagram" and 45 minutes. Write your phase plan: for each phase, the time box, the 2–3 concrete things you'll write on the board, and the checkpoint sentence you'll say before moving on. Then name the two deep dives you'd propose.</p>`,
      constraints: `<p>Must reach a complete high-level design by minute ~25. Must leave ≥ 12 minutes for deep dives.</p>`,
      example: `<p>Phase 1 (0–5): ${H.c('g', 'Functional:')} upload photo, follow users, view home feed. ${H.c('b', 'Non-functional:')} 500 M DAU, feed p99 &lt; 300 ms, high availability, eventual consistency OK for feeds. ${H.c('m', 'Out of scope:')} stories, DMs, ads.</p>`,
      brute: { why: `<p>The naive approach is to start drawing "Users → API → DB" immediately and improvise. Without requirements you don't know feed latency matters most; without numbers you can't justify a CDN or precomputed feeds; without a time plan you spend 20 minutes on image upload and never reach the feed — the most interesting part.</p>` },
      mcq: { q: 'At minute 22 you have requirements, numbers, API and a half-drawn diagram. What should you do?', options: ['Pause and perfect the database schema', 'Quickly finish the end-to-end diagram (read + write path)', 'Jump to deep dives right away', 'Ask the interviewer to restate the problem'], answer: 1, explain: 'Breadth first: a complete simple design must exist before going deep. Schema details can come back in a deep dive.' },
      hints: [`<p>Hint 1: Use the default split: 5 / 3 / 4 / 4 / 10 / 14 / 5 minutes.</p>`, `<p>Hint 2: For Instagram the heavy parts are (a) photo upload + storage + CDN and (b) home feed generation (fan-out on write vs read).</p>`, `<p>Hint 3: Write each checkpoint as one sentence that names the output of the phase, e.g. "We have 4 endpoints: upload, follow, feed, like."</p>`],
      solution: {
        approach: `${H.table(['Time', 'Phase', 'On the board', 'Checkpoint sentence'], [
          ['0–5', 'Requirements', 'upload/view photos, follow, home feed, like; 500 M DAU; feed p99 &lt; 300 ms; 99.95% availability; eventual consistency OK; out: stories, DMs, search', '"So the core is upload + feed, read-heavy, latency-sensitive feed. OK to proceed?"'],
          ['5–8', 'Estimation', '100 M uploads/day ≈ 1,200/s (peak ~4K); feed reads ~60K/s peak; media ≈ 100 M × 2 MB = 200 TB/day → object store + CDN', '"Media is petabytes → blob store + CDN; feed reads dominate → precompute."'],
          ['8–12', 'API', 'POST /v1/media (pre-signed upload URL), POST /v1/posts, POST /v1/follow, GET /v1/feed?cursor=, POST /v1/posts/{id}/like', '"Four endpoints cover all requirements; cursor pagination for the feed."'],
          ['12–16', 'Data model', 'users, posts(post_id, user_id, media_url, ts), follows(follower, followee), feed cache per user (list of post_ids)', '"Posts and follows in a sharded store keyed by user_id; feed lists in Redis."'],
          ['16–26', 'HLD', 'client → CDN/LB → upload service → blob store; post service → DB → queue → fan-out workers → feed cache; feed service reads cache + hydrates posts', '"Write path and read path are both complete."'],
          ['26–40', 'Deep dives', '(1) feed generation: fan-out on write + celebrity fan-out on read; (2) media pipeline: resize, multiple sizes, CDN caching and invalidation', '"Shall I go deeper here or look at failure handling?"'],
          ['40–45', 'Wrap-up', 'trade-offs: eventual consistency in feeds, storage cost of multiple image sizes, hybrid fan-out complexity; monitoring: feed p99, fan-out lag', '"Top risks are hot celebrities and CDN cost; next I\'d add ranking."']
        ])}
          <p><b>Why this plan works:</b> it front-loads the information that drives decisions (read-heavy, media-heavy), guarantees a complete design by minute 26, and saves 14 minutes for the two parts where Instagram is actually hard. If the interviewer redirects (e.g. "talk about likes counting"), you swap one deep dive — the plan absorbs it.</p>`,
        complexity: `<p>Not an algorithm — the "cost" is time: 45 minutes, with ≥ 30% on deep dives and the full design done by ~55% of the interview.</p>`,
        followUps: ['How would your plan change for a 30-minute phone screen?', 'The interviewer interrupts at minute 10 to ask about ranking — what do you do?']
      }
    }]
  });
  /* ===================== TOPIC 7: Requirements → API → Data model ===================== */
  var SCEN = {
    pastebin: {
      name: 'Pastebin',
      fr: ['Create a paste (text up to 10 MB) and get a unique link', 'Read a paste by its link', 'Optional expiry time (10 min … never)', 'Optional private/unlisted pastes'],
      nfr: ['10 M new pastes/day (~120/s), reads 10:1 → ~1,200/s', 'Read p99 < 200 ms', 'Highly available reads (99.9%+); a paste never gets lost once created', 'Links are hard to guess'],
      oos: ['User accounts & editing', 'Syntax highlighting server-side', 'Search across pastes'],
      api: ['POST /v1/pastes {content, expires_in?, visibility} → 201 {key, url}', 'GET /v1/pastes/{key} → 200 {content, created_at} | 404 | 410 (expired)', 'DELETE /v1/pastes/{key} (with delete token) → 204'],
      dm: ['pastes(key PK, blob_ref, size, created_at, expires_at, visibility, delete_token_hash)', 'content in object storage at blob_ref (avg 10 KB, max 10 MB)', 'index on expires_at for the cleanup job'],
      store: 'Metadata: key-value / NoSQL (pure lookup by key, ~3.6 B rows over 1 y). Content: object store (cheap, large blobs) + CDN cache.'
    },
    urlshortener: {
      name: 'URL shortener',
      fr: ['Shorten a long URL into a 7-char code', 'Redirect short code → long URL', 'Optional custom alias and expiry', 'Basic click counts per link'],
      nfr: ['100 M new links/month (~40/s), redirects 100:1 → ~4,000/s avg, ~12K peak', 'Redirect p99 < 50 ms server side', '99.99% availability for redirects', 'Codes unique forever; not easily enumerable'],
      oos: ['Accounts & billing', 'Detailed analytics dashboards', 'Link previews / malware scanning (mention only)'],
      api: ['POST /v1/links {long_url, alias?, expires_at?} → 201 {code, short_url}', 'GET /{code} → 301/302 Location: long_url | 404', 'GET /v1/links/{code}/stats → {clicks}'],
      dm: ['links(code PK, long_url, created_at, expires_at, owner_id?)', 'clicks aggregated: link_stats(code, day, count)', 'optional index long_url_hash → code (dedupe)'],
      store: 'Key-value / wide-column store keyed by code (simple lookups, billions of rows, easy to shard by code). Redis cache in front for hot codes.'
    },
    likes: {
      name: 'Like button & counter',
      fr: ['Like / unlike a post (one like per user per post)', 'Show like count on each post', 'Show "liked by you" state', 'List who liked a post (paginated)'],
      nfr: ['500 M DAU; ~5 B likes/day → ~58K writes/s avg, ~200K peak', 'Count reads ~1 M/s (every post render)', 'Counts may lag a few seconds (eventual); the user\'s own like must show instantly', 'No double-counting on retries'],
      oos: ['Reactions other than like', 'Notifications for likes', 'Ranking/feed changes due to likes'],
      api: ['PUT /v1/posts/{id}/likes/me → 200 (idempotent: liking twice = once)', 'DELETE /v1/posts/{id}/likes/me → 204', 'GET /v1/posts/{id}/likes?cursor= → users + next_cursor', 'Count returned inside the post object: like_count'],
      dm: ['likes(post_id, user_id, created_at) PK (post_id, user_id)', 'like_counts(post_id PK, count) — updated asynchronously / sharded counters', 'user_likes(user_id, post_id) for "liked by you" lookups'],
      store: 'Wide-column / NoSQL partitioned by post_id for likes (huge write volume, simple access patterns); counters in Redis + periodic flush; hot posts use sharded counters.'
    }
  };
  topics.push({
    title: 'Phases 1–4 in Practice: Requirements, Estimates, API & Data Model',
    analogy: `<p>Ordering a custom cake: the baker first asks <b>what</b> (chocolate, 3 layers, "Happy Birthday Mia"), <b>how much</b> (for 40 people, by Saturday 4 pm), and <b>what not</b> ("no nuts needed, no delivery"). Then they write an <b>order slip</b> — a contract both sides agree on (that's your API). Then they plan <b>ingredients and trays</b> (your data model). Skipping the questions is how you end up with a beautiful vanilla cake for a chocolate lover.</p>`,
    explain: `<h4>Phase 1 — Requirements (≈5 min)</h4>
      <p><b>Functional requirements</b> = what the system <i>does</i> (features, verbs): "users can post a photo", "users see a feed". Pick the <b>3–5 core</b> ones; push the rest to "out of scope".</p>
      <p><b>Non-functional requirements</b> = how <i>well</i> it does it — and put numbers on them: scale (DAU, QPS), latency (p99 &lt; 200 ms), availability (99.9% = ~8.8 h downtime/year; 99.99% = ~53 min/year), consistency (strong vs eventual), durability (never lose data), security/privacy.</p>
      ${H.table(['Ask about…', 'Example question', 'Why it matters'], [
        ['Users & scale', '"How many daily users? Global or one region?"', 'drives sharding, CDN, multi-region'],
        ['Read vs write', '"Do people mostly read or post?"', 'cache/replicas vs write scaling'],
        ['Latency', '"What feels acceptable for a redirect / feed load?"', 'what must be in memory'],
        ['Consistency', '"Is it OK if a like count is a few seconds stale?"', 'eventual consistency unlocks huge scale'],
        ['Data lifetime', '"Do pastes expire? Keep history forever?"', 'storage ×10 or ÷10'],
        ['Special features', '"Custom aliases? Private items? Edits?"', 'extra APIs, uniqueness checks, auth']
      ])}
      <h4>Phase 2 — Estimation (≈3 min)</h4><p>Only the numbers that change a decision: peak read/write QPS, total storage, read:write ratio, maybe bandwidth and cache size (see the earlier topics).</p>
      <h4>Phase 3 — API (≈4 min)</h4>
      <p>The API is the <b>contract</b> between clients and your system. Use REST for public CRUD-style APIs, gRPC between internal services, WebSockets/SSE for real-time push. For each endpoint give: method + path, request fields, response, and important behaviours:</p>
      <ul><li><b>Pagination</b> with cursors (<code>?cursor=abc&amp;limit=20</code>) for lists — offsets get slow and skip items when data changes.</li>
      <li><b>Idempotency</b> for writes that may be retried (<code>Idempotency-Key</code> header, or PUT semantics) — no double charges, no double likes.</li>
      <li><b>Auth</b> (who is calling?), <b>rate limits</b>, <b>versioning</b> (<code>/v1/</code>).</li></ul>
      <h4>Phase 4 — Data model (≈4 min)</h4>
      <p>List the <b>entities</b> (users, posts, follows…), their key fields, and — most important — the <b>access patterns</b> ("get the 20 newest posts of user X", "get the long URL for code Y"). Choose the store from the access patterns: relational for relationships, transactions and flexible queries; key-value/wide-column for huge-scale simple lookups by key; object storage for blobs; search index for text search; a cache for hot reads.</p>`,
    clues: [
      '"Design X" (vague) → list functional requirements, confirm, then non-functional with numbers',
      '"should be fast" / "highly available" → turn adjectives into numbers (p99 ms, nines)',
      '"users might click twice / network retries" → idempotent API (PUT, idempotency key)',
      '"show the newest items, infinite scroll" → cursor pagination on (created_at, id)',
      '"look up by key, billions of rows" → key-value / wide-column store, partition by that key',
      '"needs joins, transactions, money" → relational database (possibly sharded)'
    ],
    viz: [{
      title: 'Fill the design doc: requirements → API → data model',
      input: 'urlshortener',
      inputLabel: 'Scenario: urlshortener | pastebin | likes',
      gen: function (input) {
        var key = String(input).trim().toLowerCase().replace(/[\s_-]/g, '');
        var sc = SCEN[key];
        if (!sc) throw new Error('Choose one of: urlshortener, pastebin, likes');
        var rows = [], frames = [], clock = 0;
        var plan = [['Functional', sc.fr, 'REQ', 1.25], ['Non-functional', sc.nfr, 'REQ', 0], ['Out of scope', sc.oos, 'REQ', 0], ['API', sc.api, 'API', 1.33], ['Data model', sc.dm, 'DM', 1.33]];
        frames.push({ narr: 'Prompt: <b>"Design a ' + sc.name + '."</b> We fill a mini design document section by section, saying each line out loud and checking it with the interviewer.', parts: [
          { type: 'table', label: 'design doc', columns: ['section', 'item'], rows: [] },
          { type: 'vars', label: 'clock', vals: { phase: 'start', elapsed: '0:00' } }
        ] });
        var tips = { 'Functional': 'Functional = verbs the user can do. Keep it to the core few.', 'Non-functional': 'Non-functional = quality targets with numbers — scale, latency, availability, consistency.', 'Out of scope': 'Saying what you will NOT build protects your time and shows judgement.', 'API': 'The API makes requirements concrete: one endpoint per core verb, with inputs/outputs and status codes.', 'Data model': 'Entities and keys chosen to match the access patterns implied by the API.' };
        plan.forEach(function (sec) {
          sec[1].forEach(function (item, i) {
            rows.push([sec[0], item]);
            clock += sec[0] === 'Functional' ? 0.35 : sec[0] === 'Non-functional' ? 0.5 : sec[0] === 'Out of scope' ? 0.25 : 1.1;
            var hl = {}; hl[rows.length - 1] = sec[0] === 'Out of scope' ? 'done' : sec[0] === 'API' ? 'win' : sec[0] === 'Data model' ? 'sel' : 'cur';
            frames.push({ narr: (i === 0 ? '<b>' + sec[0] + ':</b> ' + tips[sec[0]] + ' ' : '') + 'Add: <i>' + item.replace(/</g, '&lt;') + '</i>.', parts: [
              { type: 'table', label: 'design doc', columns: ['section', 'item'], rows: clone(rows), hl: hl },
              { type: 'vars', label: 'clock', vals: { phase: sec[0], elapsed: mmss(clock) } }
            ] });
          });
        });
        rows.push(['Storage choice', sc.store]);
        var fh = {}; fh[rows.length - 1] = 'ok';
        frames.push({ narr: 'Finally pick storage <b>from the access patterns</b>, with one sentence of justification. We are at ~' + mmss(clock + 0.8) + ' — on schedule to start the high-level diagram.', parts: [
          { type: 'table', label: 'design doc', columns: ['section', 'item'], rows: clone(rows), hl: fh },
          { type: 'vars', label: 'clock', vals: { phase: 'data model done', elapsed: mmss(clock + 0.8), next: 'high-level design' }, hl: { next: 'ok' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Turning adjectives into numbers', html: `${H.table(['Vague', 'Quantified'], [['"fast"', 'p99 read latency &lt; 100 ms server-side'], ['"always up"', '99.99% availability (≈ 4.3 min/month downtime)'], ['"lots of users"', '100 M DAU, 3× peak factor, global'], ['"reliable"', 'zero data loss after a write is acknowledged (RPO = 0)']])}` },
      { title: 'Cursor vs offset pagination', html: `<p><code>GET /feed?offset=10000&amp;limit=20</code> makes the DB skip 10,000 rows (slow) and new posts shift pages (duplicates/missing items). <code>GET /feed?cursor=eyJ0cyI6...&amp;limit=20</code> encodes "after (created_at, id) = X" → an index seek, stable results. ${H.c('g', 'Use cursors for feeds and big lists.')}</p>` },
      { title: 'Idempotent payment API', html: `<p><code>POST /v1/payments</code> with header <code>Idempotency-Key: 7f3a…</code>. The server stores key → result for 24 h; a retry with the same key returns the stored result instead of charging again. Without it, a timeout + retry can double-charge a customer.</p>` },
      { title: 'Access patterns choose the database', html: `<p>Chat messages: "get last 50 messages of conversation C, newest first" → wide-column table partitioned by conversation_id, clustered by message time. Bank transfers: "move money atomically between two accounts" → relational DB with transactions. Product search: "find shoes, size 9, under $80, matching 'running'" → search index (inverted index), with the DB as source of truth.</p>` },
      { title: 'Status codes that show care', html: `<p>Redirect: 301 (permanent, browsers cache it → fewer hits but you lose click stats) vs 302 (temporary, every click reaches you → accurate analytics). Expired paste: 410 Gone vs 404. Rate-limited: 429 with Retry-After. Choosing deliberately and saying why is an easy depth signal.</p>` }
    ],
    deepDive: `<p><b>Availability maths.</b> Nines translate to downtime budgets: 99.9% ≈ 43.8 min/month, 99.99% ≈ 4.4 min/month, 99.999% ≈ 26 s/month. Components in series multiply: three services each at 99.9% → 0.999³ ≈ 99.7%. Redundant components in parallel combine as 1 − (1 − a)²: two 99% replicas → 99.99% if failures are independent (they often aren't — same region, same deploy). This is why each extra synchronous dependency in the request path quietly lowers your availability.</p>
      <p><b>Consistency requirements, precisely.</b> "Eventual consistency" is fine for like counts, feeds and view counters. Read-your-writes (users see their own changes immediately) is needed for profile edits and posting — achievable by reading from the leader or a session-sticky replica for a short window after a write. Strong consistency/linearizability is needed for money, inventory, unique usernames and locks. Asking "which data needs which?" lets you use cheap, scalable eventual consistency for 90% of the system.</p>
      <p><b>API design details.</b> REST resources with nouns (<code>/posts/{id}/likes</code>), PUT/DELETE for idempotent toggles, POST + idempotency key for creates. gRPC (HTTP/2, protobuf) for internal low-latency calls and streaming. GraphQL when many clients need different shapes of the same data (beware N+1 resolvers and caching difficulty). Pre-signed URLs for uploads: the client uploads straight to object storage, your servers never carry the bytes.</p>
      <p><b>Data-model pitfalls.</b> Choosing a partition key with skew (a celebrity post_id gets millions of likes → hot partition; fix with sharded counters or write buffering); needing a query the key doesn't support (secondary index or a second, denormalised table maintained via events); unbounded rows (a "followers" list inside a user document grows forever — model it as its own table). Design tables per access pattern, not per noun.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is very good at turning a confirmed requirements list into a first-draft OpenAPI spec or schema — use it to go from bullet points to <code>openapi.yaml</code> in seconds at work. In 2026 many teams start design docs this way, then edit.</p>
      <p><b>New requirement types for AI features:</b> answer quality (measured by evals), groundedness (cite sources), safety/PII handling, latency to first token, cost per request, and fallback behaviour when the model API is down. Data models gain <i>documents, chunks, embeddings (with model version), conversations/messages, tool-call logs, and feedback (thumbs up/down)</i>. APIs gain <i>streaming</i> (SSE) responses and structured tool schemas (e.g. MCP tools).</p>
      <p><b>Use AI as a partner:</b> <code>Here are my functional requirements; list ambiguities an interviewer would expect me to clarify</code>. <b>Where AI goes wrong:</b> it adds every possible feature, invents numbers, and designs tables per noun instead of per access pattern. <b>What you own:</b> scoping ruthlessly and tying each data-model choice to an access pattern.</p>`,
    problems: [{
      title: 'Requirements, API and data model for a polling app', level: 'Medium', tags: ['framework', 'API design', 'data model'], companies: ['Google', 'Microsoft', 'Slack'],
      statement: `<p>"Design a live polling feature for video meetings": the host creates a poll (question + 2–6 options), participants vote once, everyone sees results update live. Produce phases 1–4: requirements (functional, non-functional with numbers, out of scope), quick estimates, API, and data model with storage choice.</p>`,
      constraints: `<p>Assume 5 M meetings/day, 10% use polls, ~2 polls per meeting, avg 30 participants (max 10,000 in webinars). Results should appear within ~1 s.</p>`,
      example: `<p>Polls/day = 5 M × 10% × 2 = ${H.c('b', '1 M')} → ~12/s. Votes/day = 1 M × 30 = ${H.c('b', '30 M')} → ~350/s avg, but bursty: a 10,000-person webinar votes within ~20 s → ${H.c('r', '500 votes/s on one poll')}.</p>`,
      brute: { why: `<p>Naive: one SQL table <code>votes</code> and every client polls <code>GET /results</code> every second. With 10,000 participants that's 10,000 requests/s for one poll, each running a <code>COUNT(*) GROUP BY</code>. It also allows double votes unless you enforce uniqueness. The numbers show the real challenges: bursty hot polls and live fan-out of results, not total storage.</p>` },
      mcq: { q: 'How do you guarantee one vote per participant even if the client retries?', options: ['Check in the UI', 'Unique key (poll_id, user_id) + idempotent PUT', 'Rate limit the user', 'Store votes in a cookie'], answer: 1, explain: 'A uniqueness constraint (or upsert on the composite key) makes the operation idempotent at the source of truth; PUT /votes/me expresses "set my vote" semantics.' },
      hints: [`<p>Hint 1: Functional verbs: create poll, vote (change vote?), close poll, see live results. Out of scope: quizzes, anonymous mode analytics.</p>`, `<p>Hint 2: Consistency: results may be ~1 s stale (eventual), but the voter's own choice must be recorded exactly once.</p>`, `<p>Hint 3: Live results → push over the meeting's existing WebSocket; aggregate counts in memory (Redis HINCRBY) and broadcast every ~500 ms instead of per vote.</p>`],
      solution: {
        approach: `<p><b>Functional:</b> host creates poll; participants vote once (may change vote until closed); host closes poll; everyone sees live results. <b>Out of scope:</b> quiz scoring, exporting, cross-meeting analytics.</p>
          <p><b>Non-functional:</b> results visible ≤ 1 s after a vote; votes durable and exactly-once per user; handle 10,000-voter bursts; 99.9% availability (poll failure must not break the meeting).</p>
          <p><b>Estimates:</b> ~12 polls/s, ~350 votes/s average, hot-poll bursts ~500/s on a single poll; storage tiny (30 M votes × ~50 B = 1.5 GB/day).</p>
          <p><b>API:</b> <code>POST /v1/meetings/{m}/polls {question, options[]}</code> → poll_id; <code>PUT /v1/polls/{p}/votes/me {option_id}</code> (idempotent; changing vote = overwrite); <code>POST /v1/polls/{p}/close</code>; results pushed as <code>poll.results {counts[]}</code> events on the meeting WebSocket; <code>GET /v1/polls/{p}/results</code> for late joiners.</p>
          <p><b>Data model:</b> <code>polls(poll_id PK, meeting_id, question, options, status, created_at)</code>; <code>votes(poll_id, user_id, option_id, updated_at) PK (poll_id, user_id)</code>; live counters in Redis hash <code>poll:{id}:counts</code> updated with HINCRBY (decrement old option on vote change). <b>Storage:</b> a relational DB or key-value store for durable votes (partition by poll_id), Redis for live aggregates, broadcast batched every 500 ms to avoid 10,000 × 500 messages/s fan-out.</p>`,
        complexity: `<p>Per vote: O(1) upsert + O(1) counter update; broadcasts are O(participants) per tick rather than per vote — 2 ticks/s × 10,000 = 20,000 messages/s instead of 5 M.</p>`,
        followUps: ['How do you rebuild Redis counts if the cache node dies mid-poll?', 'How would you support anonymous polls where even the host cannot see who voted what?']
      }
    }]
  });
  /* ===================== TOPIC 8: HLD → deep dives → trade-offs ===================== */
  topics.push({
    title: 'Phases 5–7 in Practice: High-Level Design, Deep Dives & Trade-offs',
    analogy: `<p>A city map works at two zoom levels. First the <b>zoomed-out map</b>: highways, districts, the river — enough to plan any trip (that's the high-level design). Then you <b>zoom into</b> the busy junction that jams every evening and redesign it with a flyover (a deep dive). Finally, the city council explains the <b>trade-off</b>: "the flyover costs ₹500 crore and blocks the view, but cuts the jam from 40 to 5 minutes." Good designers show all three zoom levels.</p>`,
    explain: `<h4>Phase 5 — High-level design (≈10 min)</h4>
      <p>Draw the boxes and arrows that satisfy <b>every functional requirement</b>, nothing fancier yet. Then <b>walk one request</b> through it for each core flow: "A POST comes in through the load balancer to the shortener service, which gets a new ID, encodes it, writes to the DB, returns the code. A GET hits the redirect service, which checks the cache, falls back to the DB, and answers 302."</p>
      <p>Standard building blocks: <b>client</b>, <b>DNS/CDN</b>, <b>load balancer</b>, <b>API gateway</b> (auth, rate limiting), <b>stateless services</b>, <b>cache</b>, <b>database</b> (SQL/NoSQL), <b>object storage</b>, <b>message queue</b> (async work), <b>workers</b>, <b>search index</b>, <b>analytics pipeline</b>.</p>
      <h4>Phase 6 — Deep dives (≈14 min)</h4>
      <p>Pick the <b>2–3 hardest or riskiest parts</b> — usually where your estimates showed pressure — and go into real mechanisms. Typical deep-dive menu:</p>
      ${H.table(['Area', 'Questions to answer'], [
        ['Scaling the hot path', 'Where is the bottleneck at peak? cache strategy, replicas, sharding key, hot keys'],
        ['Data correctness', 'unique IDs, idempotency, consistency level, transactions vs eventual'],
        ['Fan-out / async', 'queues, ordering, retries, dead-letter queues, backpressure'],
        ['Failure handling', 'what if the cache / DB primary / a region dies? timeouts, retries, failover'],
        ['Operations', 'monitoring (SLIs), deploys, migrations, abuse/rate limiting, cost']
      ])}
      <h4>Phase 7 — Trade-offs & wrap-up (≈5 min)</h4>
      <p>Every design choice costs something. Say it explicitly using a simple pattern: <b>"I chose X over Y because of requirement Z; the cost is W; if Z changes, I'd switch to Y."</b> Then name what you'd monitor and what you'd build next.</p>
      ${H.table(['Choice', 'Gain', 'Cost'], [
        ['Cache in front of DB', 'latency ↓, DB load ↓', 'staleness, invalidation complexity, extra component'],
        ['Async queue', 'smooth spikes, decouple', 'eventual consistency, more moving parts'],
        ['NoSQL partitioned by key', 'horizontal write scale', 'no joins, limited queries'],
        ['302 instead of 301 redirect', 'accurate click analytics', 'every click hits our servers'],
        ['Precompute (fan-out on write)', 'fast reads', 'write amplification, wasted work for inactive users']
      ])}`,
    clues: [
      '"walk me through what happens when…" → trace a request through every box of your diagram',
      '"what is the bottleneck?" → go back to your peak QPS / storage numbers',
      '"what if this component fails?" → failure-mode deep dive: redundancy, timeouts, fallbacks',
      '"why not use X instead?" → trade-off statement: gain, cost, when you would switch',
      '"how would you know it works in production?" → SLIs/SLOs, dashboards, alerts',
      '"we have 5 minutes left" → stop adding; recap requirements → design → trade-offs'
    ],
    viz: [{
      title: 'Build a URL shortener: diagram, request walk, deep dives',
      gen: function () {
        var N = {
          C: { id: 'C', label: 'Client', x: 7, y: 30, shape: 'box' },
          LB: { id: 'LB', label: 'Load Balancer', x: 24, y: 30, shape: 'box' },
          W: { id: 'W', label: 'Shorten svc', x: 45, y: 12, shape: 'box' },
          R: { id: 'R', label: 'Redirect svc', x: 45, y: 48, shape: 'box' },
          K: { id: 'K', label: 'ID ranges (KGS)', x: 68, y: 4, shape: 'box' },
          DB: { id: 'DB', label: 'Links DB', x: 70, y: 28, shape: 'box' },
          CA: { id: 'CA', label: 'Redis cache', x: 70, y: 48, shape: 'box' },
          Q: { id: 'Q', label: 'Click queue', x: 45, y: 66, shape: 'box' },
          A: { id: 'A', label: 'Analytics', x: 70, y: 66, shape: 'box' },
          CDN: { id: 'CDN', label: 'CDN edge', x: 7, y: 54, shape: 'box' }
        };
        function g(ids, edges, hl, ehl, tags) { return { type: 'graph', directed: true, height: 72, nodes: ids.map(function (i) { return N[i]; }), edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var base = ['C', 'LB', 'W', 'R', 'DB'], E1 = [['C', 'LB'], ['LB', 'W', 'POST'], ['LB', 'R', 'GET'], ['W', 'DB'], ['R', 'DB']];
        var full = base.concat(['K', 'CA']), E2 = E1.concat([['W', 'K'], ['R', 'CA']]);
        var all = full.concat(['Q', 'A']), E3 = E2.concat([['R', 'Q'], ['Q', 'A']]);
        var frames = [];
        frames.push({ narr: '<b>Phase 5 starts.</b> Requirements: shorten, redirect, count clicks. Numbers: ~40 writes/s, ~4,000 redirects/s (12K peak), 7-char codes. First the simplest thing that works: client → load balancer → two services split by traffic shape (writes are rare, reads are hot) → one links database.', parts: [g(base, E1, { LB: 'cur' }), { type: 'vars', label: 'clock', vals: { phase: 'High-level design', elapsed: '16:00' } }] });
        frames.push({ narr: '<b>Write path:</b> POST /v1/links reaches the Shorten service. It needs a unique code. We add a <b>Key Generation Service</b> that hands out ID ranges; the service base62-encodes the next ID into a 7-char code and stores (code → long_url).', parts: [g(full.slice(0, 6), E1.concat([['W', 'K']]), { W: 'cur', K: 'ok' }, { 'C-LB': 'cur', 'LB-W': 'cur', 'W-K': 'ok', 'W-DB': 'ok' }), { type: 'vars', vals: { request: 'POST /v1/links', result: '201 {code: "aZ3x9Qk"}' } }] });
        frames.push({ narr: '<b>Read path:</b> GET /aZ3x9Qk reaches the Redirect service. With a 100:1 read ratio we add a <b>Redis cache</b>: hit → answer in ~1 ms; miss → read the DB, fill the cache, answer 302 with Location: long_url.', parts: [g(full, E2, { R: 'cur', CA: 'ok' }, { 'C-LB': 'cur', 'LB-R': 'cur', 'R-CA': 'ok', 'R-DB': 'cur' }, { CA: 'hit ~90%' }), { type: 'vars', vals: { request: 'GET /aZ3x9Qk', result: '302 Location: https://…' } }] });
        frames.push({ narr: '<b>Analytics without slowing redirects:</b> the redirect service publishes a click event to a <b>queue</b> and returns immediately; analytics workers aggregate counts asynchronously. The redirect latency does not include analytics. <b>Checkpoint:</b> all three functional requirements are covered.', parts: [g(all, E3, { Q: 'ok', A: 'ok' }, { 'R-Q': 'ok', 'Q-A': 'ok' }), { type: 'vars', label: 'clock', vals: { phase: 'HLD complete ✓', elapsed: '26:00' }, hl: { phase: 'ok' } }] });
        frames.push({ narr: '<b>Deep dive 1 — unique codes.</b> Options: hash(long_url) and truncate (collisions → retry/check), random code + existence check (DB round trip per write, rare collisions), or <b>counter + base62</b>. We pick counters: the KGS leases blocks of 1,000 IDs to each Shorten server, so there is no per-write coordination and no collisions. To avoid guessable sequential codes, we can shuffle IDs with a reversible bijection before encoding.', parts: [g(all, E3, { K: 'cur', W: 'cur' }, { 'W-K': 'cur' }, { K: 'block 41,000–41,999', W: 'next id 41,337' }), { type: 'table', label: 'key-generation options', columns: ['option', 'pro', 'con'], rows: [['hash + truncate', 'same URL → same code', 'collisions; need check'], ['random + check', 'unguessable', 'extra read per write'], ['counter range + base62', 'no collisions, no per-write coordination', 'sequential unless shuffled; KGS must be HA']], hl: { 2: 'ok' } }] });
        frames.push({ narr: '<b>Deep dive 2 — hot links.</b> A viral link can get 50,000 clicks/s — one Redis key, one shard. Fixes: cache 301/302 responses at a <b>CDN edge</b> for popular codes (short TTL so stats stay roughly right), and a small in-process cache in the redirect service. The origin then sees only a trickle.', parts: [g(all.concat(['CDN']), E3.concat([['C', 'CDN', 'hot'], ['CDN', 'LB', 'miss']]), { CDN: 'cur', CA: 'bad' }, { 'C-CDN': 'ok', 'CDN-LB': 'cur' }, { CA: 'hot key!', CDN: 'serves 95%' }), { type: 'vars', vals: { 'viral clicks': '50K/s', 'reaching origin': '~2.5K/s' }, hl: { 'reaching origin': 'ok' } }] });
        frames.push({ narr: '<b>Deep dive 3 — data growth & failures.</b> 100 M links/month × 500 B ≈ 600 GB/year — a sharded key-value store partitioned by <b>hash(code)</b> spreads load evenly; 3 replicas per shard. If Redis dies, the DB suddenly takes all 12K reads/s: use replicated cache nodes, request coalescing, and keep DB read replicas sized for at least the miss storm.', parts: [g(all, E3, { DB: 'cur', CA: 'bad' }, { 'R-DB': 'bad' }, { DB: 'shard by hash(code) ×3 replicas', CA: 'node failed' }), { type: 'vars', vals: { 'storage/year': '~600 GB', 'reads if cache down': '12K/s → DB' }, hl: { 'reads if cache down': 'bad' } }] });
        frames.push({ narr: '<b>Phase 7 — trade-offs & wrap-up.</b> State each choice as gain vs cost, plus what to monitor. Then stop — a crisp ending beats a rushed extra box.', parts: [
          { type: 'table', label: 'trade-offs', columns: ['decision', 'why', 'cost / when to revisit'], rows: [['302 not 301', 'accurate click counts', 'more origin traffic; CDN caching mitigates'], ['counter ranges for codes', 'no collisions, fast', 'KGS is critical — replicate it; IDs lost on crash (fine)'], ['NoSQL keyed by code', 'simple lookups, easy sharding', 'no ad-hoc queries; analytics lives elsewhere'], ['async analytics', 'redirects stay fast', 'counts lag seconds; at-least-once → dedupe']], hl: { 0: 'sel', 1: 'sel', 2: 'sel', 3: 'sel' } },
          { type: 'vars', label: 'monitor', vals: { 'redirect p99': '< 50 ms', 'cache hit rate': '> 90%', 'queue lag': '< 1 min', '5xx rate': '< 0.1%' } }
        ] });
        return frames;
      }
    }, {
      title: 'Trade-off scale: cache TTL vs freshness vs DB load',
      input: '4000 60',
      inputLabel: 'read QPS, cache TTL in seconds',
      gen: function (input) {
        var a = nums(input, 2, 'Enter read QPS and a TTL in seconds, e.g. 4000 60');
        var q = a[0], maxT = a[1];
        if (q <= 0 || maxT < 1 || maxT > 86400) throw new Error('QPS > 0 and TTL between 1 and 86400 seconds');
        // Model: 20,000 distinct hot keys; each key refreshes once per TTL if read at least once in that window.
        var keys = 20000, ttls = [1, 5, 15, 60, 300, 3600].filter(function (t) { return t <= Math.max(maxT, 1) * 60; });
        if (ttls.indexOf(maxT) < 0) { ttls.push(maxT); ttls.sort(function (x, y) { return x - y; }); }
        var frames = [], rows = [];
        frames.push({ narr: 'A classic trade-off with a dial: the cache TTL (time-to-live). <b>Short TTL</b> → data is fresh, but the DB sees more refresh traffic. <b>Long TTL</b> → DB is quiet, but users may see stale data for longer. Model: ' + hum(q) + ' reads/s spread over ~20K hot keys.', parts: [
          { type: 'table', label: 'TTL options', columns: ['TTL', 'max staleness', 'DB reads/s (approx)', 'hit rate'], rows: [] }
        ] });
        ttls.forEach(function (t, i) {
          var refresh = Math.min(q, keys / t, q); // each hot key reloaded at most once per TTL
          var hit = Math.max(0, 1 - refresh / q);
          rows.push([t + ' s', t >= 60 ? trim3(t / 60) + ' min' : t + ' s', trim3(refresh), trim3(hit * 100) + '%']);
          var hl = {}; hl[i] = t === maxT ? 'sel' : 'cur';
          frames.push({ narr: 'TTL ' + t + ' s: each hot key is reloaded at most once every ' + t + ' s → DB sees about <b>' + trim3(refresh) + ' reads/s</b> (hit rate ' + trim3(hit * 100) + '%), and a change can take up to ' + t + ' s to appear.' + (t === maxT ? ' <b>← your chosen TTL.</b>' : ''), parts: [
            { type: 'table', label: 'TTL options', columns: ['TTL', 'max staleness', 'DB reads/s (approx)', 'hit rate'], rows: clone(rows), hl: hl },
            { type: 'bars', label: 'DB reads/s per TTL', values: rows.map(function (r) { return Number(r[2]); }), idxLabels: rows.map(function (r) { return r[0]; }), hl: hl }
          ] });
        });
        frames.push({ narr: 'There is no "correct" TTL — it depends on the requirement. Short links almost never change → long TTL (hours) is safe. Prices or stock levels change often → short TTL plus explicit invalidation on write. Saying <b>"I\'d pick X because requirement Y tolerates Z seconds of staleness"</b> is the trade-off answer interviewers want.', parts: [
          { type: 'table', label: 'TTL options', columns: ['TTL', 'max staleness', 'DB reads/s (approx)', 'hit rate'], rows: clone(rows) },
          { type: 'text', html: 'Combine both: <b>long TTL + delete-on-write</b> invalidation gives low DB load and fresh data for most updates; the TTL is just a safety net.' }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Trade-off sentence template', html: `<p>"I'm using <b>fan-out on write</b> for home feeds because reads are 100× writes and feed p99 must be &lt; 200 ms. The cost is write amplification — a user with 10 M followers would trigger 10 M inserts — so for accounts above ~100 K followers I switch to <b>fan-out on read</b> and merge at request time."</p>` },
      { title: 'Walking a request', html: `<p>"User taps <i>Post</i> → HTTPS to the nearest edge → load balancer → API gateway checks auth token and rate limit → post service writes the row (sharded by user_id) and uploads were already done via pre-signed URL → publishes PostCreated to Kafka → fan-out workers push the post_id into followers' feed lists in Redis → 201 returned in ~50 ms; followers see it within seconds."</p>` },
      { title: 'Choosing deep dives from your numbers', html: `<p>Your estimate says: 3,500 writes/s, 1.4 M tweet reads/s, 9 PB media. The deep dives choose themselves: (1) how reads are served at 1.4 M/s (timeline cache), (2) where 9 PB lives and how it's served (blob + CDN). Not "which load-balancing algorithm" — it doesn't move the needle.</p>` },
      { title: 'Failure-mode table', html: `${H.table(['Failure', 'Impact', 'Mitigation'], [['cache node dies', 'DB read spike', 'replicas, consistent hashing, request coalescing'], ['DB primary dies', 'writes fail', 'automatic failover to sync replica (~30 s)'], ['queue backlog', 'analytics lag', 'autoscale consumers, alert on lag'], ['region outage', 'everything down', 'multi-region active-passive, DNS failover']])}` },
      { title: 'A 60-second wrap-up', html: `<p>"To recap: we met the three requirements with a write path through the KGS and a cached read path at ~1 ms. Main trade-offs: 302 redirects for accurate analytics, eventual consistency for counts, and a KGS that must be highly available. I'd monitor redirect p99, cache hit rate and queue lag. With more time I'd add abuse detection for malicious URLs and multi-region reads."</p>` }
    ],
    deepDive: `<p><b>Depth means mechanisms, not names.</b> "Use Redis" is a name. "Cache-aside with a 24 h TTL and delete-on-update; on a miss, a single-flight lock per key so 1,000 concurrent misses cause one DB read; keys sharded across 6 primaries with consistent hashing; eviction allkeys-LRU; expected hit-rate 95% based on the 80/20 estimate" is a mechanism. Each deep dive should end in numbers or a concrete protocol.</p>
      <p><b>Common deep-dive patterns to have ready:</b> unique ID generation (Snowflake, ranges, UUIDv7); cache strategies and stampede protection; sharding key choice and hot-key handling; fan-out on write vs read; idempotency and exactly-once <i>effects</i> (dedupe keys, outbox pattern); rate limiting (token bucket); leader election and failover; pagination; search via inverted index; geospatial indexing; media pipelines (upload → transcode → CDN). Later modules in this track cover each in depth.</p>
      <p><b>Trade-off axes</b> that recur everywhere: latency vs consistency (PACELC), cost vs performance (RAM vs disk), simplicity vs scalability (one SQL DB vs sharded NoSQL), freshness vs load (TTL), write cost vs read cost (precompute vs compute on demand), availability vs correctness (serve stale vs fail). Naming the axis ("this is a freshness-vs-load trade-off") signals maturity.</p>
      <p><b>Evolution story.</b> Senior candidates often describe <i>versions</i>: "V1 for 10 K users is a monolith + Postgres; at 1 M we add caching and replicas; at 100 M we shard and go async." It shows you won't over-engineer and know which bottleneck hits first — directly linked to your estimates.</p>`,
    aiEra: `<p><b>What AI changes:</b> design tools can now draft architecture diagrams and even design docs from a prompt. That makes the <i>generic</i> part of phase 5 cheap — and the interview increasingly focuses on what AI is weak at: choosing deep dives from the numbers, defending trade-offs under pushback, and reasoning about failure modes.</p>
      <p><b>AI systems have their own deep dives:</b> retrieval quality (chunking, hybrid search, re-ranking), evaluation pipelines (offline evals + online feedback), guardrails (input/output filters, PII), model gateway (routing, fallbacks between providers, rate limits, token budgets), caching (prompt prefix cache, semantic cache with similarity threshold — a freshness/accuracy vs cost trade-off), and agent safety (tool permissions, max steps, human approval for risky actions).</p>
      <p><b>Use AI as a partner:</b> <code>Here's my design. Play a skeptical staff engineer: give me the 3 hardest failure scenarios and challenge my weakest trade-off.</code> <b>Where AI goes wrong:</b> it agrees too easily, or suggests adding components rather than removing them. <b>What you own:</b> the final judgement and the ability to say "simpler is better here, because the numbers say so."</p>`,
    problems: [{
      title: 'Run the full framework: a video view counter', level: 'Hard', tags: ['framework', 'counters', 'mini design'], companies: ['Google', 'Netflix', 'TikTok'],
      statement: `<p>Design the view counter shown under every video on a YouTube-like platform. Go through all phases: requirements, estimates, API, data model, high-level design, two deep dives, and trade-offs.</p>`,
      constraints: `<p>1 B video views/day; counts shown on every video page and in search results (~10 B count reads/day). Counts can lag up to ~1 minute; must not double-count retries; must resist simple bots; viral videos get 100K+ views/s.</p>`,
      example: `<p>Writes: 10<sup>9</sup>/day ÷ 10<sup>5</sup> ≈ ${H.c('b', '12K/s')} avg, ~40K/s peak, with ${H.c('r', '100K/s on a single video')} during a viral moment. Reads: ~116K/s avg — read-heavy, and a single hot key on writes.</p>`,
      brute: { why: `<p>Naive: <code>UPDATE videos SET views = views + 1 WHERE id = ?</code> on every view. A single row taking 100K updates/s means row-lock contention — a relational DB handles maybe a few thousand updates/s on one hot row. Reads of the same row compete with writes. Retries double-count, and bots inflate counts freely.</p>` },
      mcq: { q: 'Best way to absorb 100K increments/s on one viral video?', options: ['Bigger database server', 'Sharded counters + batching in memory, flushed periodically', 'A distributed lock around the counter', 'Strongly consistent multi-region transaction per view'], answer: 1, explain: 'Split the hot counter into N sub-counters (or aggregate in memory/stream processor) and flush sums every few seconds — turns 100K writes/s into a handful of DB writes per second.' },
      hints: [`<p>Hint 1: Separate "recording a view event" (append to a log/queue) from "maintaining the count" (aggregation) from "serving the count" (cache).</p>`, `<p>Hint 2: Kafka partitioned by video_id → stream aggregator sums per video per 5–10 s → increments the stored count. Hot videos: pre-aggregate on the ingest servers too.</p>`, `<p>Hint 3: Dedupe with a view_id / (user, video, time-bucket) key; bot filtering happens in the stream before counting. Counts served from cache with ~30 s TTL.</p>`],
      solution: {
        approach: `<p><b>Requirements.</b> Functional: record a view; display a view count per video. Non-functional: 1 B views/day (~40K/s peak, 100K/s on one video), 10 B count reads/day (~350K/s peak), count lag ≤ 1 min, no double counting of retries, basic bot resistance, highly available reads. Out of scope: monetisation-grade auditing, per-user watch history.</p>
          <p><b>API.</b> <code>POST /v1/videos/{id}/views {view_id, watch_ms}</code> → 202 Accepted (async, idempotent on view_id). Count returned inside video metadata: <code>view_count</code>.</p>
          <p><b>Data model.</b> View events (append-only log, retained days); <code>video_counts(video_id PK, count, updated_at)</code> in a key-value store; dedupe set of recent view_ids (TTL ~1 h).</p>
          <p><b>HLD.</b> Player → LB → ingest service (validates, drops obvious bots, assigns view_id) → Kafka topic partitioned by video_id → stream aggregator (Flink-style) that dedupes by view_id and sums per video in 10 s windows → writes <code>count += delta</code> to the KV store → count cache (Redis/CDN-embedded metadata, TTL ~30 s) → video page.</p>
          <p><b>Deep dive 1 – hot videos:</b> partitioning by video_id puts a viral video on one partition; ingest servers pre-aggregate locally (sum per video per second) before producing, so 100K events/s become ~100 messages/s per ingest server; the store receives one increment per window. <b>Deep dive 2 – correctness:</b> at-least-once delivery + dedupe on view_id gives effectively-once counting; the aggregator checkpoints offsets with its state so a crash replays without double-counting; a nightly batch job recomputes exact counts from the log and corrects drift.</p>
          <p><b>Trade-offs.</b> Counts are eventually consistent (≤ ~1 min) in exchange for absorbing massive write rates cheaply; extra infrastructure (Kafka + stream processor) vs simplicity; bot filtering in the stream may delay counts for suspicious traffic (YouTube famously froze counts around 301+ in the past while verifying views). Monitor: Kafka lag, aggregator checkpoint age, count freshness, dedupe hit rate.</p>`,
        complexity: `<p>Ingest O(1) per view; storage writes reduced from 40K/s to roughly (#active videos per window) / 10 s; reads O(1) from cache.</p>`,
        followUps: ['How would you show a live, exact count to the video\'s owner while showing a cached count to everyone else?', 'How do you backfill counts if the aggregator was down for an hour?']
      }
    }]
  });
  /* ===================== PRACTICE: Easy ===================== */
  practice.push({
    title: 'Messages per second for a chat app', level: 'Easy', tags: ['estimation', 'QPS'], companies: ['Meta', 'Discord'],
    statement: `<p>A chat app has <b>10 M DAU</b>; each user sends <b>50 messages per day</b>. Estimate the average and peak message rate, and the delivery rate if the average message goes to a group of 4 recipients.</p>`,
    constraints: `<p>Peak factor 3×. Use 1 day ≈ 10<sup>5</sup> s and then the exact 86,400 to compare.</p>`,
    example: `<p>10 M × 50 = ${H.c('b', '5 × 10<sup>8</sup> messages/day')} → ÷ 10<sup>5</sup> = ${H.c('g', '5,000/s')} (exact 5,787/s).</p>`,
    brute: { why: `<p>Naive: "10 M users, so 10 M messages per second". This confuses users with requests and days with seconds — off by more than 1,000×, leading to a hugely over-built system. Always go users → actions per day → per second.</p>` },
    mcq: { q: '5 × 10<sup>8</sup> per day is roughly how many per second?', options: ['~600', '~6,000', '~60,000', '~600,000'], answer: 1, explain: '5 × 10<sup>8</sup> ÷ 86,400 ≈ 5,787 ≈ 6,000/s.' },
    hints: [`<p>Hint 1: messages/day = DAU × messages per user per day.</p>`, `<p>Hint 2: Divide by 86,400 (≈ 10<sup>5</sup>) for average/s; multiply by 3 for peak.</p>`, `<p>Hint 3: Deliveries = messages × recipients per message (fan-out); that is the rate the push/delivery system must handle.</p>`],
    solution: {
      approach: `${H.table(['Quantity', 'Calculation', 'Result'], [['messages/day', '10<sup>7</sup> × 50', '5 × 10<sup>8</sup>'], ['average send rate', '5 × 10<sup>8</sup> ÷ 86,400', '≈ 5,800/s'], ['peak send rate', '× 3', '≈ 17,400/s'], ['deliveries (×4 recipients)', '5,800 × 4 / 17,400 × 4', '≈ 23,000/s avg, ≈ 70,000/s peak']])}
        <p>Conclusion: the send path (~17K/s peak) is moderate; the <b>delivery path</b> is 4× larger and must push to online users over persistent connections, so connection gateways and a fan-out queue are the parts to design carefully. Also note: if 10% of users are online at peak, that's 1 M concurrent WebSockets — which sizes the gateway fleet independently of QPS.</p>`,
      complexity: `<p>Four multiplications/divisions; under one minute.</p>`,
      followUps: ['How many gateway servers for 1 M concurrent connections at 100K per server with 50% headroom?']
    }
  });
  practice.push({
    title: 'Storage for user profiles and avatars', level: 'Easy', tags: ['estimation', 'storage'], companies: ['LinkedIn', 'Amazon'],
    statement: `<p>A service has <b>500 M users</b>. Each profile row is ~2 KB; each user has one avatar stored in 3 sizes totalling 150 KB. Estimate database storage and object storage, including 3× replication for the DB and 1.5× erasure-coding overhead for objects.</p>`,
    constraints: `<p>Ignore growth; round to one significant figure.</p>`,
    example: `<p>Profiles: 5 × 10<sup>8</sup> × 2 KB = ${H.c('b', '1 TB')}; avatars: 5 × 10<sup>8</sup> × 150 KB = ${H.c('r', '75 TB')}.</p>`,
    brute: { why: `<p>Naive: store avatars as BLOB columns in the profile table → the "users" table becomes 76 TB, every backup and replica copies image bytes, and reading a profile drags megabytes through the DB. Separate metadata (DB) from media (object store + CDN).</p>` },
    mcq: { q: 'Which is bigger, and by roughly how much?', options: ['Profiles, by 10×', 'Avatars, by ~75×', 'They are about equal', 'Avatars, by ~7×'], answer: 1, explain: '75 TB vs 1 TB ≈ 75×. Media almost always dominates storage.' },
    hints: [`<p>Hint 1: Count × size for each kind of data separately.</p>`, `<p>Hint 2: 5 × 10<sup>8</sup> × 2 × 10<sup>3</sup> B = 10<sup>12</sup> B = 1 TB.</p>`, `<p>Hint 3: Multiply DB by 3 (replicas) and objects by 1.5 (erasure coding); add ~50% for DB indexes.</p>`],
    solution: {
      approach: `<p><b>Database:</b> 500 M × 2 KB = 1 TB; + indexes (~50%) = 1.5 TB; × 3 replicas = <b>~4.5 TB</b>. That fits on a few large database machines — possibly one primary + replicas with big SSDs, or a small number of shards for write headroom.</p>
        <p><b>Object storage:</b> 500 M × 150 KB = 75 TB; × 1.5 erasure coding = <b>~110 TB</b> of raw capacity — handled by any cloud object store; serve through a CDN since avatars are read constantly and rarely change (long cache TTL with versioned URLs like <code>/avatars/{user}/{version}.webp</code>).</p>
        <p>Takeaway: the database problem is small; the media problem is ~25× bigger in raw bytes but cheap per GB in object storage.</p>`,
      complexity: `<p>Two products and two multipliers — 1 minute.</p>`,
      followUps: ['How would versioned avatar URLs help with CDN cache invalidation?']
    }
  });
  practice.push({
    title: 'Bandwidth for serving images', level: 'Easy', tags: ['estimation', 'bandwidth'], companies: ['Pinterest', 'Etsy'],
    statement: `<p>A shopping site serves <b>1,000 product-page views per second</b> on average; each page shows <b>8 images of 200 KB</b> and 50 KB of HTML/JSON. Estimate egress bandwidth in Gbps (average and with a 3× peak), and decide whether a CDN is needed.</p>`,
    constraints: `<p>Remember: network links are measured in bits per second.</p>`,
    example: `<p>Images: 1,000 × 8 × 200 KB = ${H.c('b', '1.6 GB/s')} → × 8 = ${H.c('r', '12.8 Gbps')}.</p>`,
    brute: { why: `<p>Naive: forget the × 8 and compare 1.6 "GB/s" with a "10 Gbps" NIC, concluding one server suffices. In reality 12.8 Gbps average and ~38 Gbps peak would saturate several 10 Gbps servers — and the cloud egress bill would be large.</p>` },
    mcq: { q: '1 GB/s equals about…', options: ['1 Gbps', '8 Gbps', '125 Mbps', '80 Gbps'], answer: 1, explain: '1 byte = 8 bits, so 1 GB/s = 8 Gbps.' },
    hints: [`<p>Hint 1: bytes/s = page views/s × bytes per page.</p>`, `<p>Hint 2: Multiply by 8 to get bits/s; divide by 10<sup>9</sup> for Gbps.</p>`, `<p>Hint 3: Compare peak with what a handful of servers can push (10–25 Gbps each at ~70% usable) and consider cost.</p>`],
    solution: {
      approach: `<p><b>Per page:</b> 8 × 200 KB + 50 KB = 1.65 MB. <b>Average:</b> 1,000 × 1.65 MB = 1.65 GB/s ≈ <b>13.2 Gbps</b>. <b>Peak (3×):</b> ≈ <b>40 Gbps</b>.</p>
        <p><b>Decision:</b> images are static and identical for all users → a <b>CDN</b> serves them from edges near users with 95%+ hit rates, so the origin sees only ~2 Gbps at peak. HTML/JSON (50 KB × 3,000 peak = 150 MB/s ≈ 1.2 Gbps) can come from app servers. Bonus: modern formats (WebP/AVIF) and responsive sizes could cut image bytes 30–50%, directly lowering CDN cost.</p>`,
      complexity: `<p>One multiplication chain and a unit conversion.</p>`,
      followUps: ['What CDN hit rate do you need so the origin stays under 5 Gbps at peak?']
    }
  });
  practice.push({
    title: 'Spot the impossible latency claim', level: 'Easy', tags: ['latency', 'sanity check'], companies: ['Google', 'Jane Street'],
    statement: `<p>A design doc claims: "Each search request reads <b>1,000 random 4 KB records</b> from a <b>hard disk</b> sequentially, then calls a ranking service in <b>another continent</b>, all within a <b>50 ms</b> p99." Show with latency numbers why it's impossible and propose a design that could meet 50 ms.</p>`,
    constraints: `<p>HDD seek ≈ 10 ms; NVMe random read ≈ 80 µs; RAM ≈ 100 ns; cross-continent RTT ≈ 150 ms; same-DC RTT ≈ 0.5 ms.</p>`,
    example: `<p>Disk part alone: 1,000 × 10 ms = ${H.c('r', '10 s')} — 200× over budget before the network even starts.</p>`,
    brute: { why: `<p>The naive response is "use faster servers". CPU speed is irrelevant: the time is spent waiting for disk heads to move and light to cross an ocean. Only changing <i>where data lives</i> (RAM/SSD, same region) and <i>how it's read</i> (parallel/batched) fixes it.</p>` },
    mcq: { q: 'Which single fact makes the 50 ms target impossible even with infinitely fast disks?', options: ['The CPU is too slow', 'The cross-continent round trip ≈ 150 ms', 'JSON parsing', 'TLS handshakes'], answer: 1, explain: 'Speed of light in fibre: an intercontinental round trip is ~100–150 ms on its own.' },
    hints: [`<p>Hint 1: Compute each part separately: 1,000 sequential seeks, then one RTT.</p>`, `<p>Hint 2: Which tier makes 1,000 reads cheap? RAM: 1,000 × 100 ns = 0.1 ms; NVMe in parallel ≈ a few ms.</p>`, `<p>Hint 3: Move the ranking service (or a replica of it) into the same region, so the call costs ~1 ms plus compute.</p>`],
    solution: {
      approach: `<p><b>Why impossible:</b> 1,000 sequential random HDD reads ≈ 1,000 × 10 ms = 10 s. Even on NVMe sequentially: 1,000 × 80 µs = 80 ms. The intercontinental call adds ≥ 150 ms. Total ≥ 230 ms best case, ~10 s as written.</p>
        <p><b>Feasible design:</b> (1) keep the search index and the 1,000 hot records in <b>RAM</b> (or NVMe read in parallel with high queue depth): ~1 ms; (2) shard the index so 1,000 lookups run in parallel across shards; (3) deploy the ranking model <b>in the same region</b> (or each region): ~0.5 ms RTT + ~10–20 ms compute; (4) cap fan-out and use timeouts/hedged requests for the tail. Budget: ~2 ms retrieval + ~20 ms ranking + ~5 ms overhead ≈ <b>30 ms</b> — within 50 ms p99 with headroom.</p>`,
      complexity: `<p>Latency goes from O(N × seek) sequential to O(1) round trips with parallel in-memory lookups.</p>`,
      followUps: ['If the index is 5 TB, how many 256 GB RAM machines does an all-in-memory design need with 2 replicas?']
    }
  });

  /* ===================== PRACTICE: Medium ===================== */
  practice.push({
    title: 'Estimate a URL shortener end to end', level: 'Medium', tags: ['estimation', 'url shortener'], companies: ['Amazon', 'Google', 'Bitly', 'Microsoft'],
    statement: `<p>Estimate everything an interviewer expects for a URL shortener: write and read QPS (avg and peak), storage for 10 years, short-code length, cache size, bandwidth, and the number of app servers.</p>`,
    constraints: `<p>100 M new links per month; read:write = 100:1; link record ≈ 500 B; peak 3×; redirect response ≈ 500 B; app server ≈ 2,000 req/s at 60% target utilisation.</p>`,
    example: `<p>Writes: 10<sup>8</sup> ÷ (30 × 86,400) ≈ ${H.c('b', '40/s')}; reads ≈ ${H.c('b', '4,000/s')} avg, ${H.c('r', '12,000/s')} peak.</p>`,
    brute: { why: `<p>Naive: skip numbers and jump to "Cassandra + Kafka + 100 servers". With numbers, the system turns out modest — 12K peak reads, ~6 TB of data over 10 years — so a simple key-value store, a cache and a handful of servers suffice. Over-engineering is as much a red flag as under-engineering.</p>` },
    mcq: { q: 'Total links in 10 years ≈ ?', options: ['1.2 × 10<sup>9</sup>', '1.2 × 10<sup>10</sup>', '1.2 × 10<sup>11</sup>', '3.5 × 10<sup>12</sup>'], answer: 1, explain: '10<sup>8</sup>/month × 120 months = 1.2 × 10<sup>10</sup> (12 billion).' },
    hints: [`<p>Hint 1: Per-month → per-second: divide by ~2.6 × 10<sup>6</sup>.</p>`, `<p>Hint 2: Code length: compare 1.2 × 10<sup>10</sup> with 62<sup>6</sup> ≈ 5.7 × 10<sup>10</sup> and 62<sup>7</sup> ≈ 3.5 × 10<sup>12</sup>.</p>`, `<p>Hint 3: Cache: 20% of daily read requests' data, then reconsider distinct links; bandwidth: QPS × 500 B × 8.</p>`],
    solution: {
      approach: `${H.table(['Quantity', 'Calculation', 'Result'], [
        ['Write QPS', '10<sup>8</sup> ÷ 2.6 × 10<sup>6</sup> s', '≈ 40/s (peak ~120/s)'],
        ['Read QPS', '× 100', '≈ 4,000/s (peak ~12,000/s)'],
        ['Links in 10 y', '10<sup>8</sup> × 120', '1.2 × 10<sup>10</sup>'],
        ['Storage', '1.2 × 10<sup>10</sup> × 500 B', '6 TB (× 3 replicas = 18 TB)'],
        ['Code length', '62<sup>6</sup> ≈ 5.7 × 10<sup>10</sup> is only ~5× headroom', '<b>7 chars</b> (3.5 × 10<sup>12</sup>)'],
        ['Cache', '4,000 × 86,400 × 500 B × 20%', '≈ 35 GB → 1 node + replica'],
        ['Bandwidth', '12,000 × 500 B × 8', '≈ 48 Mbps peak (trivial)'],
        ['App servers', '12,120 ÷ 2,000 ÷ 0.6 ≈ 10 → spread over 3 zones', '<b>12</b>']
      ])}
        <p><b>So what:</b> a small, read-heavy system. Design: stateless redirect service + Redis cache + a key-value store sharded by code (or even a single Postgres with replicas for 6 TB). Focus deep dives on code generation (no collisions, not guessable) and hot links, not on raw capacity.</p>`,
      code: { lang: 'python', run: true, title: 'URL shortener estimator', code: `import math
links_per_month = 100_000_000
month_s, day_s = 30 * 86_400, 86_400
write_qps = links_per_month / month_s
read_qps = write_qps * 100
peak_r, peak_w = read_qps * 3, write_qps * 3
total_links = links_per_month * 12 * 10
storage_tb = total_links * 500 / 1e12
k = next(k for k in range(1, 12) if 62 ** k >= total_links * 5)   # 5x headroom
cache_gb = read_qps * day_s * 500 * 0.2 / 1e9
servers = math.ceil((peak_r + peak_w) / 2000 / 0.6 / 3) * 3
print(f"write {write_qps:.0f}/s, read {read_qps:,.0f}/s, peak read {peak_r:,.0f}/s")
print(f"links in 10y {total_links:.1e}, storage {storage_tb:.1f} TB (x3 = {storage_tb*3:.0f} TB)")
print(f"code length {k} chars -> {62**k:.1e} codes")
print(f"cache ~{cache_gb:.0f} GB, egress peak {peak_r*500*8/1e6:.0f} Mbps, app servers {servers}")` },
      complexity: `<p>~10 calculations; aim for 3–4 minutes, then summarise "small, read-heavy, cache-friendly".</p>`,
      followUps: ['How do estimates change if each link also stores 1 KB of click analytics per day for 1 year?', 'Would you choose 301 or 302, and how does that affect read QPS reaching you?']
    }
  });
  practice.push({
    title: 'Estimate WhatsApp-scale messaging', level: 'Medium', tags: ['estimation', 'chat', 'connections'], companies: ['Meta', 'Telegram', 'Signal'],
    statement: `<p>Estimate for a WhatsApp-like service: message QPS, concurrent connections and gateway count, and storage under two policies — (a) store-and-forward (delete after delivery), (b) keep server-side history for 1 year.</p>`,
    constraints: `<p>2 B monthly users, 1 B DAU; 40 messages/user/day; 100 B per text message; 5% of messages carry 300 KB media; 15% of DAU online at peak; 100K connections per gateway; peak 2×.</p>`,
    example: `<p>Messages: 10<sup>9</sup> × 40 = ${H.c('b', '4 × 10<sup>10</sup>/day')} ≈ ${H.c('g', '460K/s')} avg, ~930K/s peak.</p>`,
    brute: { why: `<p>Naive: assume history is stored forever in one relational DB and that QPS alone sizes the system. Two things dominate instead: (1) <b>connections</b> — 150 M concurrent sockets; (2) the <b>retention policy</b>, which changes storage by ~1,000×.</p>` },
    mcq: { q: 'Under store-and-forward, what mostly determines server-side message storage?', options: ['Total messages ever sent', 'Messages not yet delivered (offline recipients)', 'Number of users', 'Media resolution'], answer: 1, explain: 'Messages are deleted after delivery, so only the in-flight backlog for offline devices is stored.' },
    hints: [`<p>Hint 1: Messages/day ÷ 86,400 for QPS; peak = 2×.</p>`, `<p>Hint 2: Connections = DAU × online fraction; gateways = connections ÷ 100K, plus headroom.</p>`, `<p>Hint 3: Text/day = messages × 100 B; media/day = messages × 5% × 300 KB. For store-and-forward, estimate backlog as ~1–2 days for a fraction of users.</p>`],
    solution: {
      approach: `${H.table(['Quantity', 'Calculation', 'Result'], [
        ['Messages/day', '10<sup>9</sup> × 40', '4 × 10<sup>10</sup>'],
        ['QPS', '÷ 86,400; × 2 peak', '≈ 460K/s avg, ≈ 930K/s peak'],
        ['Concurrent connections', '10<sup>9</sup> × 15%', '150 M'],
        ['Gateways', '150 M ÷ 100K, +30% headroom', '≈ 2,000 servers'],
        ['Text/day', '4 × 10<sup>10</sup> × 100 B', '4 TB/day'],
        ['Media/day', '4 × 10<sup>10</sup> × 5% × 300 KB', '600 TB/day'],
        ['(a) store-and-forward', 'say 10% of messages wait ~1 day', '~60 TB rolling (mostly media)'],
        ['(b) 1-year history', '604 TB × 365', '≈ 220 PB (+ replication/EC)']
      ])}
        <p><b>Design implications:</b> a huge, mostly-idle connection layer (memory-bound gateways using efficient event loops), a message router keyed by recipient, an offline inbox store (write-heavy, short-lived data, e.g. wide-column with TTL), and media in object storage with links in messages. Policy (b) turns the product into a 200+ PB storage system — a business decision, which is exactly why WhatsApp historically stored messages only until delivery (and end-to-end encryption means the server can't read them anyway).</p>`,
      complexity: `<p>~10 steps; the key insight is "connections and retention, not QPS, dominate".</p>`,
      followUps: ['How do group chats with 1,000 members change delivery QPS?', 'How much RAM per gateway if each connection uses ~20 KB?']
    }
  });
  practice.push({
    title: 'Estimate video upload storage and transcoding', level: 'Medium', tags: ['estimation', 'video', 'storage'], companies: ['Google', 'TikTok', 'Netflix'],
    statement: `<p>A video platform receives <b>500 hours of video per minute</b>. Estimate daily storage for originals and for transcoded renditions, yearly growth, and how many transcoding workers are needed.</p>`,
    constraints: `<p>Original ≈ 1 GB per hour (compressed 1080p upload ≈ 2.2 Mbps); renditions (240p–1080p, two codecs) together ≈ 2× the original; one transcoding worker produces the full rendition set for 2 hours of video per hour of work; keep 1.5× worker headroom.</p>`,
    example: `<p>Uploads/day = 500 × 60 × 24 = ${H.c('b', '720,000 hours')} → originals ≈ ${H.c('r', '720 TB/day')}.</p>`,
    brute: { why: `<p>Naive: estimate only originals and forget renditions, thumbnails and replication — under-estimating storage 3–4×. Or size transcoding by the daily average without headroom, so uploads queue for hours during peaks.</p>` },
    mcq: { q: 'Yearly storage for originals + renditions (before replication) is roughly…', options: ['~80 TB', '~800 TB', '~800 PB', '~8 EB'], answer: 2, explain: '720 TB/day × 3 (original + 2× renditions) ≈ 2.2 PB/day × 365 ≈ 790 PB/year.' },
    hints: [`<p>Hint 1: Video-hours uploaded per day = 500 per minute × 1,440 minutes per day.</p>`, `<p>Hint 2: Storage/day = hours × 1 GB × (1 + 2).</p>`, `<p>Hint 3: Workers = video-hours arriving per hour ÷ hours processed per worker-hour × headroom.</p>`],
    solution: {
      approach: `<p><b>Arrival:</b> 500 h/min × 1,440 min = 720,000 h/day = 30,000 h of video per hour.</p>
        <p><b>Storage:</b> originals 720,000 × 1 GB = 720 TB/day; renditions 1.44 PB/day; total ≈ <b>2.2 PB/day</b>, ≈ <b>790 PB/year</b>; with erasure coding (1.5×) ≈ 1.2 EB/year of raw capacity. Tiering matters: most videos get few views after the first weeks — move originals and rare renditions to cold storage, keep popular renditions hot and on CDN.</p>
        <p><b>Transcoding:</b> 30,000 video-hours arrive per hour; each worker handles 2 video-hours per hour → 15,000 workers; × 1.5 headroom ≈ <b>22,500 workers</b> (or equivalent GPU/ASIC capacity — large platforms use custom video-transcoding chips). Pipeline: upload to object storage → event to queue → split video into segments → transcode segments in parallel (so a 2-hour upload finishes in minutes) → write renditions + manifest (HLS/DASH) → publish.</p>`,
      complexity: `<p>Simple multiplications; the design insight is segment-parallel transcoding and storage tiering.</p>`,
      followUps: ['How would you prioritise transcoding for a famous creator\'s upload vs. a new user\'s?', 'Which renditions would you skip for videos that get under 10 views?']
    }
  });
  practice.push({
    title: 'Size the cache for a news feed', level: 'Medium', tags: ['estimation', 'cache'], companies: ['Meta', 'LinkedIn', 'Reddit'],
    statement: `<p>A social app precomputes each active user's feed as a list of post IDs and caches post objects. Estimate (a) RAM for feed lists, (b) RAM for hot post objects using the 80/20 rule, (c) number of cache nodes with replicas, (d) expected DB read QPS on cache misses.</p>`,
    constraints: `<p>300 M DAU; feed list = 500 post IDs × 8 B; posts created 200 M/day, post object 1 KB; feed reads 50K/s avg; each feed read hydrates 20 posts; hit rate 95%; cache node 100 GB usable.</p>`,
    example: `<p>Feed lists: 3 × 10<sup>8</sup> × 500 × 8 B = ${H.c('b', '1.2 TB')}.</p>`,
    brute: { why: `<p>Naive: "cache everything": all posts ever (hundreds of TB) in RAM — enormously expensive and pointless, since most reads hit recent, popular posts. Or "cache nothing and add DB replicas": 1 M post reads/s straight to databases needs ~100 replicas.</p>` },
    mcq: { q: 'With 1 M post lookups/s and 95% hit rate, how many reach the DB?', options: ['5,000/s', '50,000/s', '95,000/s', '500,000/s'], answer: 1, explain: '5% of 1,000,000 = 50,000/s.' },
    hints: [`<p>Hint 1: Feed list RAM = DAU × IDs × 8 B.</p>`, `<p>Hint 2: Post cache: posts are mostly read in the first ~2 days. 20% of 2 days of posts × 1 KB.</p>`, `<p>Hint 3: Post lookups/s = feed reads/s × 20; misses = lookups × (1 − hit rate).</p>`],
    solution: {
      approach: `<p><b>(a) Feed lists:</b> 3 × 10<sup>8</sup> × 500 × 8 B = <b>1.2 TB</b> (Redis lists/sorted sets have overhead — budget ~2 TB).</p>
        <p><b>(b) Post objects:</b> 2 days × 200 M = 400 M recent posts; 20% hot = 80 M × 1 KB = <b>80 GB</b> (budget ~150 GB with overhead). Surprisingly small — popular content is concentrated.</p>
        <p><b>(c) Nodes:</b> (2 TB + 0.15 TB) ÷ 100 GB ≈ 22 primaries; × 2 for replicas = <b>~44 nodes</b>.</p>
        <p><b>(d) DB load:</b> post lookups = 50K × 20 = 1 M/s; misses at 5% = <b>50K/s</b>; at peak (×3) 150K/s, spread over shards and replicas (~10K reads/s each → ~15 DB machines for reads). Raising hit rate to 98% would cut this to 60K/s at peak — a strong argument for multi-get batching and a small local (in-process) cache for the very hottest posts.</p>`,
      complexity: `<p>Memory O(DAU × feed length) for lists; post cache O(hot set); computed in ~3 minutes.</p>`,
      followUps: ['How much RAM do you save by only keeping feeds for users active in the last 7 days?', 'How do you warm the cache after a full cache-cluster restart?']
    }
  });
  practice.push({
    title: 'Run phases 1–4 for Pastebin', level: 'Medium', tags: ['framework', 'requirements', 'API', 'data model'], companies: ['Amazon', 'Dropbox', 'Atlassian'],
    statement: `<p>Run the first four framework phases for "Design Pastebin": requirements (functional, non-functional with numbers, out of scope), estimates, API, and data model with storage choice. Keep it to what you'd say in ~15 minutes.</p>`,
    constraints: `<p>10 M new pastes/day, read:write 5:1, average paste 10 KB (max 10 MB), default expiry 1 year, some never expire.</p>`,
    example: `<p>Writes ≈ 10<sup>7</sup> ÷ 86,400 ≈ ${H.c('b', '115/s')}; storage/day = 10<sup>7</sup> × 10 KB = ${H.c('b', '100 GB/day')} → ~36 TB/year.</p>`,
    brute: { why: `<p>Naive: one SQL table <code>pastes(id, content TEXT, …)</code> with 10 MB text blobs in rows. At 36 TB/year the DB becomes huge, slow to replicate and back up; large rows hurt cache efficiency. Also, auto-increment IDs make pastes enumerable — a privacy problem for "unlisted" pastes.</p>` },
    mcq: { q: 'Where should paste content (avg 10 KB, max 10 MB) live?', options: ['In the same DB row as metadata', 'In object storage, with the key/URL in the metadata DB', 'Only in Redis', 'On the app servers\' local disks'], answer: 1, explain: 'Object storage is cheap, durable and great for blobs; the metadata DB stays small and fast. Redis may cache hot pastes.' },
    hints: [`<p>Hint 1: Functional: create, read, expire, (unlisted). Non-functional: durability, read latency, unguessable keys.</p>`, `<p>Hint 2: API: POST /pastes, GET /pastes/{key}, DELETE with a delete token.</p>`, `<p>Hint 3: Data: metadata (key, size, created, expires, blob_ref) in a KV store; content in object storage; cleanup job on expires_at.</p>`],
    solution: {
      approach: `<p><b>Requirements:</b> create a text paste and get a link; read by link; optional expiry; unlisted (not discoverable). Out of scope: accounts, editing, search. Non-functional: ~115 writes/s (peak ~350), ~600 reads/s (peak ~1,800), read p99 &lt; 200 ms, 99.9% availability, never lose an acknowledged paste, links not guessable.</p>
        <p><b>Estimates:</b> 100 GB/day → ~36 TB/year raw content (×1.5 EC in object storage); metadata 10<sup>7</sup> × 200 B = 2 GB/day → ~730 GB/year (tiny). Cache: hot pastes 20% of daily reads ≈ 600 × 86,400 × 10 KB × 0.2 ≈ 100 GB.</p>
        <p><b>API:</b> <code>POST /v1/pastes {content, expires_in?, visibility}</code> → <code>201 {key, url, delete_token}</code>; <code>GET /v1/pastes/{key}</code> → 200 / 404 / 410; <code>DELETE /v1/pastes/{key}</code> with delete token → 204. Rate-limit POSTs per IP to stop abuse.</p>
        <p><b>Data model:</b> <code>pastes(key PK, blob_ref, size, created_at, expires_at, visibility, delete_token_hash)</code> in a key-value/NoSQL store (pure lookups by key); content in object storage under <code>blob_ref</code>; key = 8 random base62 chars (62<sup>8</sup> ≈ 2 × 10<sup>14</sup>, unguessable, insert-if-absent to avoid collisions). Expiry via a background job scanning an <code>expires_at</code> index (or store TTL) and deleting blobs.</p>`,
      complexity: `<p>About 15 minutes of interview time; each phase produces a written artifact you'll refer back to.</p>`,
      followUps: ['How would you serve very popular pastes cheaply?', 'How would you deduplicate identical pastes (same content)?']
    }
  });
  practice.push({
    title: 'Latency budget for a 200 ms search page', level: 'Medium', tags: ['latency', 'fan-out', 'tail latency'], companies: ['Google', 'Amazon', 'Airbnb'],
    statement: `<p>A search page must render server-side within <b>200 ms p99</b>. The request: auth (1 ms), query parsing (2 ms), fan-out to <b>50 index shards</b> in parallel (each p50 10 ms, p99 80 ms), merge (5 ms), ranking model (30 ms), fetch details for top 20 results from DB (3 ms each, sequential), render (10 ms). Estimate p50 and p99 and fix what's broken.</p>`,
    constraints: `<p>Assume shard latencies are independent. Parallel step latency = slowest participant.</p>`,
    example: `<p>Probability all 50 shards beat their p99: 0.99<sup>50</sup> ≈ ${H.c('r', '60%')}, so ~40% of requests wait for at least one slow shard.</p>`,
    brute: { why: `<p>Naive: add up p50s (1 + 2 + 10 + 5 + 30 + 60 + 10 = 118 ms) and declare victory. But with 50-way fan-out, a slow shard is common, so the p99 of the fan-out step is far above 10 ms; and the 20 sequential DB calls waste 57 ms.</p>` },
    mcq: { q: 'Best fix for the fan-out tail?', options: ['Remove shards', 'Hedged requests / replica racing + a per-shard timeout with partial results', 'Bigger merge server', 'Retry the whole request'], answer: 1, explain: 'Sending a backup request to another replica after ~p95 and returning partial results after a deadline cuts the tail dramatically at small extra cost.' },
    hints: [`<p>Hint 1: Fan-out p99: with 50 shards, the request p99 is driven by each shard's ~p99.98 — expect ≥ 80 ms.</p>`, `<p>Hint 2: Sequential DB calls → one batched multi-get (~4 ms).</p>`, `<p>Hint 3: Hedging after ~20 ms to a replica makes "both slow" rare: P(slow) ≈ 0.01² per shard.</p>`],
    solution: {
      approach: `<p><b>Current p50:</b> ≈ 1 + 2 + ~20 (max of 50 shards at median is above the single-shard median) + 5 + 30 + 60 + 10 ≈ <b>128 ms</b>. <b>Current p99:</b> the fan-out step's p99 ≈ 80+ ms (often more), so ≈ 1 + 2 + 90 + 5 + 30 + 60 + 10 ≈ <b>~200 ms or worse</b> — budget blown on bad days.</p>
        <p><b>Fixes:</b> (1) Batch the 20 detail fetches into one multi-get (or cache them): 60 → ~4 ms. (2) Hedged requests: if a shard hasn't answered within ~20 ms, send the same query to its replica and take the first answer; per-shard P(slow) drops to ~10<sup>-4</sup>, so the fan-out p99 approaches ~25 ms. (3) A hard deadline (e.g. 40 ms) returning partial results from the shards that answered — search quality barely changes. (4) Run detail fetch and ranking feature lookup in parallel where possible.</p>
        <p><b>New budget:</b> p50 ≈ 1 + 2 + 15 + 5 + 30 + 4 + 10 ≈ 67 ms; p99 ≈ 1 + 2 + 30 + 5 + 40 + 6 + 15 ≈ <b>~100 ms</b> — half the budget, leaving room for network and growth. Cost: ~5% extra shard load from hedges.</p>`,
      complexity: `<p>Tail latency of an N-way fan-out ≈ the (1 − 0.01/N) quantile of one shard; hedging squares the per-shard slow probability.</p>`,
      followUps: ['How would you pick the hedge delay automatically?', 'What if shards are not independent (e.g. a GC storm hits all at once)?']
    }
  });
  /* ===================== PRACTICE: Hard ===================== */
  practice.push({
    title: 'Full Twitter estimation: QPS, fan-out, storage, bandwidth, fleet', level: 'Hard', tags: ['estimation', 'twitter', 'fan-out', 'capacity'], companies: ['X', 'Meta', 'Google', 'Amazon'],
    statement: `<p>Produce the complete capacity estimate a senior interviewer expects for Twitter: write/read QPS, fan-out-on-write load, timeline cache size, storage (text + media, 5 years), egress bandwidth, and fleet size (app servers, cache nodes, DB shards). End with the 3 decisions the numbers force.</p>`,
    constraints: `<p>200 M DAU; 0.5 tweets/user/day; 10 timeline loads/user/day × 20 tweets; average 200 followers, but 0.01% of accounts have ≥ 1 M followers; tweet 300 B; 10% of tweets with a 500 KB image (served at 200 KB); peak 3×; app server 2,000 req/s; cache node 100 GB; DB shard 10 TB and 5K writes/s.</p>`,
    example: `<p>Fan-out inserts: 1,160 tweets/s × 200 followers = ${H.c('r', '~230K timeline inserts/s')} average — 200× the raw tweet rate.</p>`,
    brute: { why: `<p>Naive estimates stop at "1,160 tweets/s — easy". They miss that fan-out multiplies writes 200× (and a single celebrity tweet would cause millions of inserts), that read QPS is 20× higher than write QPS, and that media is 99% of bytes. Each miss leads to a design that breaks in a different place.</p>` },
    mcq: { q: 'A celebrity with 50 M followers tweets. With pure fan-out-on-write, how many timeline inserts does that one tweet trigger?', options: ['1', '200', '50 M', 'Depends on DAU only'], answer: 2, explain: 'One insert per follower: 50 M writes for one tweet — why hybrid fan-out (pull celebrity tweets at read time) exists.' },
    hints: [`<p>Hint 1: Do the base QPS table first (tweets, timeline loads, tweets rendered), then multiply tweets by followers for fan-out.</p>`, `<p>Hint 2: Timeline cache: DAU × ~800 IDs × 8 B; tweet-object cache: hot tweets of the last day.</p>`, `<p>Hint 3: Fleet: app = peak requests ÷ 2,000 ÷ 0.6; DB shards = max(storage ÷ 10 TB, peak writes ÷ 5K); celebrities → fan-out on read.</p>`],
    solution: {
      approach: `${H.table(['Item', 'Calculation', 'Result'], [
        ['Tweets', '10<sup>8</sup>/day ÷ 86,400', '1,160/s avg · 3,500/s peak'],
        ['Timeline loads', '2 × 10<sup>9</sup>/day', '23K/s avg · 70K/s peak'],
        ['Tweets rendered', '× 20', '460K/s avg · 1.4 M/s peak (from cache)'],
        ['Fan-out inserts', '1,160 × 200', '230K/s avg · 700K/s peak (async workers)'],
        ['Timeline cache', '2 × 10<sup>8</sup> × 800 × 8 B', '1.3 TB → ~13 nodes ×2 = 26'],
        ['Tweet cache', '10<sup>8</sup> × 300 B × ~2 days hot', '60 GB → 1–2 nodes ×2'],
        ['Text storage 5 y', '30 GB/day × 1,825 × 3', '≈ 165 TB (+ indexes ≈ 250 TB)'],
        ['Media storage 5 y', '5 TB/day × 1,825 × 1.5 EC', '≈ 14 PB (+ resized copies)'],
        ['Image egress', '70K × 5 images × 200 KB', '≈ 70 GB/s ≈ 560 Gbps peak → CDN'],
        ['App servers', '(70K + 3.5K) ÷ 2,000 ÷ 0.6', '≈ 62 → 63 (21 per zone)'],
        ['Tweet DB shards', 'max(250 TB ÷ 10, 3.5K ÷ 5K)', '25 shards (storage-bound)']
      ])}
        <p><b>Decisions forced by the numbers:</b> (1) <b>Precompute timelines</b> in RAM (fan-out on write via a queue + workers), because 1.4 M tweet renders/s can't hit a database; (2) <b>hybrid fan-out</b>: accounts above ~100K followers are not fanned out — their recent tweets are merged at read time, capping write amplification; (3) <b>media through object storage + CDN</b>, since it's ~99% of bytes and ~560 Gbps at peak. Everything else (25 shards, ~63 app servers, ~30 cache nodes) is ordinary horizontal scaling.</p>`,
      code: { lang: 'python', run: true, title: 'Twitter capacity model', code: `import math
DAY = 86_400
dau, tweets_pu, loads_pu, per_load = 200e6, 0.5, 10, 20
followers, peak = 200, 3

tweets = dau * tweets_pu / DAY
loads = dau * loads_pu / DAY
rendered = loads * per_load
fanout = tweets * followers
print(f"tweets {tweets:,.0f}/s  loads {loads:,.0f}/s  rendered {rendered:,.0f}/s  fan-out {fanout:,.0f}/s (peak x{peak})")

timeline_cache_tb = dau * 800 * 8 / 1e12
text_tb = dau * tweets_pu * 300 * 365 * 5 * 3 / 1e12
media_pb = dau * tweets_pu * 0.10 * 500e3 * 365 * 5 * 1.5 / 1e15
egress_gbps = loads * peak * 5 * 200e3 * 8 / 1e9
print(f"timeline cache {timeline_cache_tb:.2f} TB, text 5y x3 {text_tb:.0f} TB, media 5y {media_pb:.1f} PB")
print(f"peak image egress {egress_gbps:,.0f} Gbps")

app = math.ceil((loads + tweets) * peak / 2000 / 0.6 / 3) * 3
shards = max(math.ceil(text_tb * 1.5 / 10), math.ceil(tweets * peak / 5000))
cache_nodes = math.ceil(timeline_cache_tb * 1000 / 100) * 2
print(f"app servers {app}, tweet DB shards {shards}, timeline cache nodes {cache_nodes}")` },
      complexity: `<p>~20 calculations; in an interview, present the table in ~5 minutes and spend the remaining time on the three decisions.</p>`,
      followUps: ['Where exactly do you draw the celebrity threshold, and how would you tune it with data?', 'How much does skipping fan-out for users inactive for 30 days save?']
    }
  });
  practice.push({
    title: 'Run the full framework: Top-K trending hashtags', level: 'Hard', tags: ['framework', 'streaming', 'top-k'], companies: ['X', 'TikTok', 'LinkedIn'],
    statement: `<p>In a 45-minute mock, design "trending hashtags": show the top 10 hashtags in the last hour, globally and per country, refreshed every minute. Run every framework phase and write down your time plan.</p>`,
    constraints: `<p>500 M posts/day, ~1.5 hashtags per post; 200 countries; results may be ~1 minute stale; trending page read ~50K/s at peak; resist spam (one account posting a tag 10,000 times).</p>`,
    example: `<p>Hashtag events: 5 × 10<sup>8</sup> × 1.5 = ${H.c('b', '7.5 × 10<sup>8</sup>/day')} ≈ ${H.c('b', '8,700/s')} avg, ~26K/s peak. Reads are a separate, cacheable stream.</p>`,
    brute: { why: `<p>Naive: <code>SELECT tag, COUNT(*) FROM post_tags WHERE ts &gt; now() - 1h GROUP BY tag ORDER BY 2 DESC LIMIT 10</code> on every page view. That scans ~30 M rows per query at 50K queries/s — impossible. Also, raw counts let a spammer "trend" a tag, and global popular tags (#love) would always win without a "trending = unusual growth" notion.</p>` },
    mcq: { q: 'What decouples the 50K/s trending-page reads from the counting work?', options: ['Strong consistency', 'Precomputing the top-K every minute and serving it from cache', 'Bigger SQL server', 'Client-side counting'], answer: 1, explain: 'The answer changes once a minute, so compute it once a minute and serve the cached list — reads become trivial.' },
    hints: [`<p>Hint 1: Separate the write path (stream of hashtag events → windowed counts) from the read path (cached top-K list per region).</p>`, `<p>Hint 2: Sliding 1-hour window as 60 one-minute buckets; per bucket, count per (country, tag); keep a min-heap of size K per country. Count-Min Sketch if tag cardinality is huge.</p>`, `<p>Hint 3: Trending = growth vs baseline (e.g. last hour vs same hour average); dedupe per (user, tag, window) to stop spam.</p>`],
    solution: {
      approach: `<p><b>Time plan (45 min):</b> requirements 5, estimates 3, API 3, data model 4, HLD 10, deep dives 15, wrap-up 5.</p>
        <p><b>Requirements:</b> top-10 tags for the last hour, global + per country, refreshed every minute; staleness ≤ 1–2 min OK; spam resistance; out of scope: personalised trends, topic clustering. <b>Estimates:</b> ~26K tag events/s peak; distinct tags/hour maybe ~10 M (long tail); reads 50K/s peak but only 201 distinct answers.</p>
        <p><b>API:</b> <code>GET /v1/trends?country=IN</code> → <code>{as_of, tags:[{tag, score}]}</code>; internal event <code>PostCreated{post_id, user_id, country, tags[], ts}</code>.</p>
        <p><b>Data model:</b> stream state: per (country, minute) a map tag → count (or Count-Min Sketch + heavy-hitter heap); output table <code>trends(country, as_of, list)</code> in a KV store + cache.</p>
        <p><b>HLD:</b> post service → Kafka (partitioned by tag hash) → stream processors (dedupe per user/tag/hour, count per minute bucket) → per-partition local top-K → aggregator merges partial top-Ks per country every minute → writes trends to KV store → CDN/Redis cache → trends API.</p>
        <p><b>Deep dives:</b> (1) <i>Sliding window</i>: 60 minute-buckets; hour count = sum of buckets; drop the oldest each minute (O(1) update). (2) <i>Heavy hitters at scale</i>: exact counts per partition are fine for ~10 M tags × 4 B; at bigger scales use Count-Min Sketch (fixed memory, slight over-count) with a top-K heap. Merge of partial top-Ks is approximate — request top-100 from each partition to make the global top-10 accurate. (3) <i>Trending vs popular</i>: score = (count_now + α) ÷ (baseline + α) with a minimum volume, so a jump from 100 → 5,000 beats a steady 1 M. (4) <i>Spam</i>: count distinct users not posts; down-weight new/low-reputation accounts.</p>
        <p><b>Trade-offs:</b> approximate counts and 1-minute staleness in exchange for constant memory and trivial reads; partition by tag balances load but needs a merge step; hot tags (#worldcup) can overload one partition → pre-aggregate on producers. Monitor: Kafka lag, window completeness, freshness of <code>as_of</code>.</p>`,
      complexity: `<p>Per event O(1) (or O(d) for a d-row Count-Min Sketch); per minute O(P × K log K) to merge P partitions' top-K; reads O(1) from cache.</p>`,
      followUps: ['How would you compute trends for arbitrary windows (last 15 minutes, last 24 hours) without separate pipelines?', 'How do you backfill if a stream processor crashes for 10 minutes?']
    }
  });
  practice.push({
    title: 'Estimate a ride-hailing location service (write-heavy)', level: 'Hard', tags: ['estimation', 'geospatial', 'write-heavy'], companies: ['Uber', 'Lyft', 'Grab', 'DoorDash'],
    statement: `<p>Drivers' apps send their GPS location periodically; riders' apps search for nearby drivers. Estimate write QPS, read QPS, memory for "current locations", storage for location history, and bandwidth. Then state which storage approach the numbers force for current locations vs history.</p>`,
    constraints: `<p>5 M drivers online at peak, update every 4 s; 100-byte update payload; 20 M ride requests/day, each causing ~10 "nearby drivers" queries while matching; keep history 30 days for disputes; each stored history point 50 B.</p>`,
    example: `<p>Writes: 5 × 10<sup>6</sup> ÷ 4 = ${H.c('r', '1.25 M updates/s')} — flat, not diurnal-averaged, because it's driven by online devices.</p>`,
    brute: { why: `<p>Naive: store every update as a row in a relational table with a geo index and query <code>ORDER BY distance LIMIT 10</code>. 1.25 M writes/s with index maintenance would need dozens of large DB shards just to keep up, and nearby-queries would fight the writes. Current location is ephemeral data — it belongs in memory.</p>` },
    mcq: { q: 'How much RAM to hold the current location of all 5 M online drivers (≈ 100 B each incl. overhead)?', options: ['~500 KB', '~500 MB', '~500 GB', '~5 TB'], answer: 1, explain: '5 × 10<sup>6</sup> × 100 B = 5 × 10<sup>8</sup> B = 500 MB — tiny; it fits in one machine\'s RAM (replicate/shard for throughput, not size).' },
    hints: [`<p>Hint 1: Writes = drivers ÷ interval. Reads = rides/day × queries per ride ÷ 86,400 (× peak).</p>`, `<p>Hint 2: Current-location memory is tiny; the problem is write <i>rate</i>, so shard by geography (geohash/H3 cell) across in-memory nodes.</p>`, `<p>Hint 3: History: 1.25 M/s × 86,400 × 50 B per day → append-only, time-partitioned storage (or columnar files) with 30-day TTL.</p>`],
    solution: {
      approach: `${H.table(['Item', 'Calculation', 'Result'], [
        ['Location writes', '5 × 10<sup>6</sup> ÷ 4 s', '1.25 M/s (flat at peak)'],
        ['Ingress bandwidth', '1.25 M × 100 B × 8', '≈ 1 Gbps'],
        ['Nearby queries', '2 × 10<sup>7</sup> × 10 ÷ 86,400 × 3 peak', '≈ 7,000/s peak'],
        ['Current locations RAM', '5 M × 100 B', '≈ 500 MB'],
        ['History/day', '1.25 M × 86,400 × 50 B', '≈ 5.4 TB/day'],
        ['History 30 days', '× 30 (× 3 replicas)', '≈ 160 TB (≈ 490 TB replicated)']
      ])}
        <p><b>Forced decisions:</b> (1) <b>Current locations in memory</b>, sharded by geographic cell (geohash/H3) across, say, 20–50 in-memory nodes so each handles ~25–60K updates/s; a nearby query reads the rider's cell + neighbours. (2) <b>History is a write-heavy append-only stream</b>: send updates to Kafka; a consumer writes compressed, time-partitioned files/tables (wide-column or object storage + columnar format) with 30-day expiry; nobody reads history on the hot path. (3) Updates are idempotent-ish and loss-tolerant (the next one comes in 4 s), so we accept at-most-once on the hot path for latency, while trips themselves use durable, strongly-consistent storage. (4) Reads (7K/s) are small compared with writes — this is a rare <b>write-heavy</b> product, so caches don't help; partitioning does.</p>`,
      complexity: `<p>Update O(1) into a cell index; nearby query O(drivers in ~9 cells); history append-only O(1).</p>`,
      followUps: ['How would you reduce write rate by 2× without hurting matching quality?', 'What happens to a geo-shard during New Year\'s Eve in one city (hot cell)?']
    }
  });
  practice.push({
    title: 'Cost model for a photo service over 5 years', level: 'Hard', tags: ['estimation', 'cost', 'storage tiering', 'CDN'], companies: ['Google', 'Apple', 'Dropbox'],
    statement: `<p>A photo backup/sharing service gets <b>50 M uploads/day</b>. Estimate total storage after 5 years and the <b>monthly bill</b> in year 5 for storage and egress, (a) keeping everything in standard object storage and serving from origin, (b) with lifecycle tiering + CDN. Show the savings.</p>`,
    constraints: `<p>Assumed prices (illustrative, check real price sheets): standard storage $0.02/GB-month; infrequent tier $0.01; archive $0.002; origin egress $0.05/GB; CDN egress $0.02/GB. Photo 3 MB original + 300 KB of resized versions. Reads: 1 B photo views/day at 300 KB average served size. Tiering: last 90 days standard, 90 d–1 y infrequent, older archive. CDN hit rate 90% (misses still incur origin egress to the CDN).</p>`,
    example: `<p>Per day: 50 M × 3.3 MB = ${H.c('b', '165 TB/day')} → ~60 PB/year → ${H.c('r', '~300 PB')} after 5 years.</p>`,
    brute: { why: `<p>Naive: estimate capacity but never cost — or price everything at the most expensive tier. Storage grows linearly forever, so the bill grows every month; without tiering, year-5 storage alone is ~$6 M/month. Cost is often the deciding requirement for photo/video products, and senior interviews reward noticing it.</p>` },
    mcq: { q: 'Which lever saves the most in year 5?', options: ['Smaller thumbnails', 'Archiving photos older than 1 year', 'Faster servers', 'Fewer replicas of metadata'], answer: 1, explain: 'About 80% of 5-year storage is older than 1 year; moving it from $0.02 to $0.002/GB-month cuts that part of the bill ~10×.' },
    hints: [`<p>Hint 1: Storage after 5 years ≈ 165 TB × 1,825 days. Split it by age: last 90 days, 90 d–1 y, older than 1 y.</p>`, `<p>Hint 2: Monthly egress = 1 B × 300 KB × 30 = 9 PB/month.</p>`, `<p>Hint 3: Cost = GB × price per tier; egress (b) = 9 PB × CDN price + 10% × 9 PB × origin price.</p>`],
    solution: {
      approach: `<p><b>Storage after 5 years:</b> 165 TB/day × 1,825 ≈ <b>301 PB</b> (= 3.01 × 10<sup>8</sup> GB). Split by age: last 90 days ≈ 14.9 PB; 90 d–1 y ≈ 45.4 PB; older ≈ 240.9 PB.</p>
        <p><b>Egress:</b> 10<sup>9</sup> views/day × 300 KB = 300 TB/day ≈ <b>9 PB/month</b> (9 × 10<sup>6</sup> GB).</p>
        ${H.table(['Line', '(a) all standard, origin', '(b) tiering + CDN'], [
          ['Storage', '3.01 × 10<sup>8</sup> GB × $0.02 ≈ <b>$6.0 M</b>', '14.9 PB × $0.02 + 45.4 PB × $0.01 + 240.9 PB × $0.002 ≈ $0.30 M + $0.45 M + $0.48 M ≈ <b>$1.23 M</b>'],
          ['Egress', '9 × 10<sup>6</sup> GB × $0.05 ≈ <b>$0.45 M</b>', '9 × 10<sup>6</sup> × $0.02 + 0.9 × 10<sup>6</sup> × $0.05 ≈ <b>$0.23 M</b>'],
          ['Total / month', '<b>≈ $6.45 M</b>', '<b>≈ $1.46 M</b> (−77%)']
        ])}
        <p><b>Design consequences:</b> lifecycle policies by age, a CDN in front of everything, and a read path that tolerates archive retrieval latency (minutes to hours) for very old originals — e.g. serve a cached resized version instantly and restore the original on demand. Further levers: modern codecs (AVIF/HEIC) ~30–50% smaller, deduplication of identical uploads by content hash, and per-user quotas. Caveat: archive tiers charge for retrieval and have minimum storage durations — model retrieval rates before archiving aggressively.</p>`,
      complexity: `<p>Linear growth: storage(t) ≈ daily × t; the bill is dominated by the oldest data unless tiered.</p>`,
      followUps: ['If 0.5% of archived photos are requested each month at $0.01/GB retrieval, does tiering still pay off?', 'How does erasure coding vs 3× replication change the numbers if you run your own storage?']
    }
  });
  /* ===================== QUIZ ===================== */
  quiz.push({ q: 'About how many seconds are in a day, using the interview shortcut?', options: ['~10<sup>3</sup>', '~10<sup>4</sup>', '~10<sup>5</sup>', '~10<sup>6</sup>'], answer: 2, explain: '86,400 ≈ 10<sup>5</sup>. Dividing a daily count by 10<sup>5</sup> gives a per-second rate (~16% low).' });
  quiz.push({ q: '2<sup>30</sup> bytes is roughly…', options: ['1 MB', '1 GB', '1 TB', '4 GB'], answer: 1, explain: '2<sup>10</sup> ≈ 10<sup>3</sup>, so 2<sup>30</sup> ≈ 10<sup>9</sup> bytes = 1 GB.' });
  quiz.push({ q: 'Roughly how much slower is a random 4 KB NVMe SSD read than a RAM reference?', options: ['~2×', '~10×', '~1,000×', '~1,000,000×'], answer: 2, explain: 'RAM ≈ 100 ns, NVMe random read ≈ 50–100 µs → ~500–1,000×. That gap is why caching in RAM pays off.' });
  quiz.push({ q: '100 M events per day ≈ how many per second on average?', options: ['~120', '~1,200', '~12,000', '~120,000'], answer: 1, explain: '10<sup>8</sup> ÷ 86,400 ≈ 1,157/s. Memorise: 1 M/day ≈ 12/s.' });
  quiz.push({ q: 'A service serves 2,000 responses/s of 500 KB each. What is the egress bandwidth?', options: ['1 Gbps', '8 Gbps', '1 GB/s ≈ 8 Gbps', '100 Mbps'], answer: 2, explain: '2,000 × 500 KB = 10<sup>9</sup> B/s = 1 GB/s = 8 Gbps. Watch bits vs bytes.' });
  quiz.push({ q: 'Why do we multiply average QPS by a peak factor?', options: ['To include retries only', 'Traffic is uneven; systems must survive the busiest periods, not the average', 'Because averages are always wrong by 10×', 'To account for replication'], answer: 1, explain: 'Daily curves and events create peaks 2–3× (or 10×+) the average; capacity sized for the average fails during rush hour.' });
  quiz.push({ q: 'Which part of a social app usually dominates raw storage?', options: ['User profiles', 'Text posts', 'Photos and videos', 'Follower lists'], answer: 2, explain: 'Media is 100–1,000× larger per item than text; it lives in object storage behind a CDN.' });
  quiz.push({ q: 'Using the 80/20 rule, you cache…', options: ['80% of all data', '~20% of daily read volume (the hot items)', 'Only writes', 'Exactly the last hour of data'], answer: 1, explain: 'About 20% of items get ~80% of reads; caching that hot set serves most requests from RAM.' });
  quiz.push({ q: 'You need 250 TB of DB storage and 3,500 writes/s. A shard holds 10 TB and 5K writes/s. How many shards?', options: ['1', '10', '25', '50'], answer: 2, explain: 'max(250 ÷ 10, 3,500 ÷ 5,000) = max(25, 1) = 25; storage is the binding constraint.' });
  quiz.push({ q: 'In a 45-minute HLD interview, roughly when should a complete high-level design be on the board?', options: ['Minute 5', 'Around minute 25', 'Minute 44', 'Only if the interviewer asks'], answer: 1, explain: 'Breadth first: requirements, numbers, API, data model and a full diagram by ~25 minutes leaves ~15 minutes for deep dives.' });
  quiz.push({ q: 'Which is a NON-functional requirement?', options: ['Users can follow other users', 'Users can upload a photo', 'Feed loads in under 200 ms at p99', 'Users can like a post'], answer: 2, explain: 'Non-functional requirements describe qualities (latency, availability, scale, consistency), ideally with numbers.' });
  quiz.push({ q: 'Why prefer cursor pagination over offset pagination for a feed?', options: ['Cursors are shorter strings', 'Offsets require scanning skipped rows and shift when new items arrive; cursors seek by index and stay stable', 'Offsets are not allowed in REST', 'Cursors need no index'], answer: 1, explain: 'A cursor encodes "after (created_at, id)", enabling an index seek and stable pages even as data changes.' });
  quiz.push({ q: 'Little\'s Law says in-flight requests = throughput × latency. At 10,000 req/s and 50 ms, how many requests are in flight?', options: ['50', '200', '500', '5,000'], answer: 2, explain: '10,000 × 0.05 = 500 concurrent requests — this sizes thread and connection pools.' });
  quiz.push({ q: 'A cross-Atlantic round trip is ~70–150 ms. What is the main way to reduce it for users?', options: ['Faster CPUs', 'Better compression', 'Serve from closer locations (CDN/edge, regional replicas)', 'More threads'], answer: 2, explain: 'It\'s limited by the speed of light in fibre; only moving data/compute closer helps.' });

  /* ===================== INTERVIEW Q&A ===================== */
  interview.push({ q: 'Why do back-of-envelope estimation at all in a system design interview?', level: 'B', a: `<p>Because numbers turn opinions into decisions. Knowing peak QPS, storage and the read:write ratio tells you whether one database is enough or you need sharding, whether a cache is mandatory, whether media needs a CDN, and which part of the system deserves deep-dive time. It also shows the interviewer you can reason quantitatively and avoid both over- and under-engineering. Aim for order-of-magnitude accuracy in 2–4 minutes, stating assumptions out loud.</p>`, followUps: ['When would you skip estimation?', 'Which single number most often changes the design?'] });
  interview.push({ q: 'Walk me through estimating average and peak QPS from DAU.', level: 'B', a: `<p>Start with DAU (assume or ask), multiply by actions per user per day to get daily volume, divide by 86,400 (≈ 10<sup>5</sup>) for average QPS, then multiply by a peak factor of 2–3× for normal daily peaks (5–10× or more for events). Do reads and writes separately. Example: 200 M DAU × 10 feed loads = 2 × 10<sup>9</sup>/day ≈ 23K/s average, ~70K/s peak. Finally convert to resources: peak ÷ per-server capacity ÷ ~0.6 target utilisation.</p>`, followUps: ['How do you estimate QPS for IoT devices instead of users?', 'What about traffic amplification from retries and fan-out?'] });
  interview.push({ q: 'What latency numbers do you keep in your head, and how do you use them?', level: 'B', a: `<p>Rough tiers: L1 ~1 ns, RAM ~100 ns, NVMe random read ~50–100 µs, same-datacenter round trip ~0.5 ms, Redis GET ~1 ms, indexed DB query ~1–5 ms, HDD seek ~10 ms, cross-region ~60–80 ms, transatlantic ~150 ms. I use them to build latency budgets: list each sequential step in a request path, sum them, compare with the SLO, and attack the largest term — usually by caching, batching, parallelising, or moving data closer to the user.</p>`, followUps: ['Which of these numbers changed most in the last decade?', 'How do percentiles change the picture?'] });
  interview.push({ q: 'How do you estimate storage for a system, and what do people usually forget?', level: 'I', a: `<p>Items per day × size per item, × retention (days), × replication or erasure-coding overhead, + index overhead (30–100% for databases). Estimate metadata and media separately because media is often 100× larger and lives in object storage. Commonly forgotten: replication (×3), indexes, multiple renditions/thumbnails for images and video, backups and snapshots, logs, and free-space headroom for compaction. And the biggest lever of all: the retention policy — ask about it.</p>`, followUps: ['Replication vs erasure coding — when do you pick each?', 'How would you estimate the size of a Postgres row?'] });
  interview.push({ q: 'Explain the 80/20 rule for cache sizing and its limits.', level: 'I', a: `<p>Access is skewed: roughly 20% of items get 80% of the reads, so caching ~20% of the daily read volume (or better, 20% of the daily <i>distinct</i> items read) yields a high hit rate. Limits: real distributions are Zipf-like and vary — some workloads (search long tail, analytics) have poor locality; hit rate grows sub-linearly with cache size; and per-key overheads (Redis can add 50+ bytes per key) inflate memory. In production you measure hit-rate curves from real traces and size for a target hit rate that protects the database.</p>`, followUps: ['How do you protect the DB when the cache is cold or fails?', 'When would a CDN replace an application cache?'] });
  interview.push({ q: 'Describe your framework for a 45-minute system design interview.', level: 'B', a: `<p>Seven steps on a clock: requirements (~5 min: functional, non-functional with numbers, out of scope); estimation (~3 min: QPS, storage, ratio); API (~4 min); data model and storage choice (~4 min); high-level design (~10 min: boxes and arrows, walk a read and a write); deep dives (~14 min: the 2–3 hardest parts, chosen from the numbers and the interviewer's interest); trade-offs and wrap-up (~5 min). The rule is breadth first: a complete simple design by ~minute 25, then depth. I check in with the interviewer at each transition.</p>`, followUps: ['How do you adapt it for an infrastructure-style question?', 'What do you do if the interviewer drags you into a detail early?'] });
  interview.push({ q: 'What clarifying questions do you ask first, for example for "Design a chat app"?', level: 'B', a: `<p>Scope: 1:1 only or groups (max size)? Media? Read receipts, typing indicators, presence? Message history across devices? Scale: DAU, messages per user per day, global? Non-functionals: delivery latency target, ordering guarantees per conversation, durability (store-and-forward vs full history), end-to-end encryption, availability. Out of scope candidates: calls, stories, payments. Each answer changes the design: e.g. history across devices turns a transient queue into a large persistent store; large groups change fan-out.</p>`, followUps: ['Which of these answers changes the architecture the most?', 'How do you avoid spending too long on questions?'] });
  interview.push({ q: 'How do you choose which areas to deep-dive into?', level: 'I', a: `<p>From three sources: (1) the estimates — whatever is under the most pressure (1 M reads/s → caching; 500K writes/s → partitioning/stream ingestion; petabytes → storage tiering); (2) the requirements that are hardest to satisfy (strong consistency, exactly-once effects, real-time delivery); (3) the interviewer's signals — I offer two or three options and let them choose. I avoid deep-diving into generic parts (load balancer algorithms) unless asked, because they rarely differentiate the design.</p>`, followUps: ['Give an example where the numbers changed your deep dive choice.', 'How deep is "deep enough"?'] });
  interview.push({ q: 'How do you express trade-offs convincingly?', level: 'I', a: `<p>Name the alternatives, the requirement that decides, the cost, and the condition that would flip the decision: "I chose fan-out on write because reads are 100× writes and feed p99 must be under 200 ms; it costs write amplification and wasted work for inactive users; for accounts with over ~100K followers I switch to fan-out on read." Naming the axis — latency vs consistency, freshness vs load, cost vs performance, simplicity vs scalability — shows maturity. Numbers make the trade-off concrete.</p>`, followUps: ['Give a trade-off where you would choose the "less scalable" option.', 'How do you handle an interviewer who disagrees with your choice?'] });
  interview.push({ q: 'Your estimate says a single Postgres instance can handle the load. Would you still shard? Why or why not?', level: 'A', a: `<p>Not by default. If peak writes are a few thousand per second and data is a few TB, a well-provisioned primary with synchronous standby and read replicas is simpler, cheaper, transactional and easier to operate. I'd design for future sharding — choose a natural shard key (e.g. tenant_id/user_id), avoid cross-entity transactions where possible, use IDs that don't depend on one sequence — and define the trigger (e.g. storage &gt; 70% of a node, or write QPS &gt; 50% of measured capacity). Premature sharding adds cross-shard queries, rebalancing and operational risk with no current benefit.</p>`, followUps: ['What signals would tell you it is time to shard?', 'How would you migrate to shards with zero downtime?'] });
  interview.push({ q: 'How does Little\'s Law help in capacity planning?', level: 'A', a: `<p>Concurrency = throughput × latency. At 20K req/s with 100 ms latency there are 2,000 requests in flight, which sizes thread pools, DB connection pools and load-balancer limits. It also explains cascading failures: if a dependency slows from 50 ms to 500 ms at the same throughput, in-flight requests grow 10×, exhausting pools and memory — hence timeouts, bulkheads and load shedding. For long-lived connections, size by concurrent connections instead of QPS.</p>`, followUps: ['How does utilisation affect queueing delay?', 'How would you size a DB connection pool for 50 app servers?'] });
  interview.push({ q: 'How do estimates change for an LLM-powered feature?', level: 'A', a: `<p>Add token-based units: requests/s and tokens/s (input and output separately), because providers and GPUs are limited by tokens. Example: 1 M DAU × 5 turns × 1,800 tokens ≈ 9 × 10<sup>9</sup> tokens/day ≈ 100K tokens/s average. Cost = tokens × price, often the dominant line item. Latency: time-to-first-token (~0.2–1 s) plus generation time (output tokens ÷ tokens/s), so streaming matters. Storage: embeddings (dims × 4 bytes × chunks) plus vector index overhead, and conversation logs with PII constraints. Agents multiply model calls per task, so estimate calls per task too.</p>`, followUps: ['How would prompt caching change cost and latency?', 'How many GPU replicas for 100K output tokens/s?'] });
  interview.push({ q: 'A candidate designs a system for 1 B users when the interviewer said 10 K internal users. What went wrong and how do you avoid it?', level: 'E', a: `<p>They skipped or ignored the requirements and estimation phases — a classic over-engineering signal that suggests poor judgement and higher cost and operational burden than needed. For 10 K internal users (~1 QPS), a single service with a managed database, a standby and backups is appropriate; the interesting parts are security, auditability and reliability, not scale. Avoid it by writing the numbers on the board, explicitly saying "at this scale X is unnecessary", and describing how the design would evolve if scale grew 100×.</p>`, followUps: ['How would you show scalability awareness without over-engineering?', 'Which non-functional requirements matter most for an internal tool?'] });
  registerModule({
  langExplain: `<p><b>About the code here.</b> System design is language-neutral, and interviews never require a particular language for it. The short samples are Python (and occasionally Java) only to make an idea concrete, such as an estimate, a hash ring or a rate limiter. Read them like pseudocode; the runnable ones are calculators you can change and re-run.</p>`,
    id: 'hld03',
    title: 'Estimation & the HLD Interview Framework',
    intro: `<p>Every great system design answer rests on two skills: <b>quick, confident numbers</b> and a <b>calm, repeatable structure</b>. In this module you will learn to turn "100 million users" into requests per second, terabytes, gigabits and a count of machines — in your head, in minutes — using powers of two, a day ≈ 10<sup>5</sup> seconds, and the latency numbers every engineer should know. Then you will learn the HLD interview framework (requirements → estimation → API → data model → high-level design → deep dives → trade-offs) with a clock in hand, and practise it on Twitter, a URL shortener, Pastebin, a polling app and more.</p><p>Each topic has animated calculators: watch an estimate fill line by line, climb the powers-of-two and latency ladders on a log scale, and follow the interview clock phase by phase.</p>`,
    goals: [
      'Convert between bytes/KB/MB/GB/TB/PB and powers of two instantly, and know the time constants (day ≈ 10<sup>5</sup> s, year ≈ 3 × 10<sup>7</sup> s)',
      'Recall the latency ladder (RAM, SSD, network, disk, cross-region) and build a latency budget for a request',
      'Estimate average and peak read/write QPS, storage over years, bandwidth in Gbps and cache size with the 80/20 rule',
      'Turn estimates into machine counts (app servers, cache nodes, DB shards) and a rough monthly cost',
      'Run the 45-minute HLD framework with time boxes, producing requirements, API, data model, a complete diagram, deep dives and trade-offs',
      'Estimate Twitter and a URL shortener end to end and explain which design decisions the numbers force'
    ],
    prereqs: `HLD 1 (What is System Design? Client-Server & Request Flow) and HLD 2 (Scalability Basics). Comfortable with multiplication and powers of ten; no coding required (optional Python calculators provided).`,
    hours: 9,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
