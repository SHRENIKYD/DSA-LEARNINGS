(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small shared helpers for the visualizers in this module ---------- */
  function pad2(n, w) { if (!w) return '·'; var s = n.toString(2); while (s.length < w) s = '0' + s; return s; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function money(c) { return '$' + (c / 100).toFixed(2); }

  /* ================= TOPIC 1: UBER ================= */
  topics.push({
    title: 'Design Uber: Geohash, Quadtrees & Driver Matching',
    analogy: `<p>Imagine a <b>taxi dispatcher</b> in a big city with a paper map cut into <b>labelled squares</b> ("B7", "B8", ...). Every driver radios in "I am in B7". The dispatcher keeps one clipboard per square. When a rider calls from B7, she does <b>not</b> read through every driver in the city. She looks at the B7 clipboard plus the 8 squares around it, picks the best few drivers, and phones them one at a time.</p>
      <p>That is the whole idea: <b>turn "where is everyone?" (a hard 2-D question) into "who is on this clipboard?" (a simple lookup)</b>. Geohash and quadtrees are two ways of cutting the map into squares.</p>`,
    explain: `<p><b>Goal:</b> a rider taps "Request ride". Within a second or two we find nearby available drivers, offer the trip to one, and both phones show a live map. We design this for a big city-scale product (millions of drivers and riders worldwide).</p>
      <h4>1. Requirements</h4>
      <ul>
        <li><b>Functional:</b> rider requests a ride (pickup, drop-off) and sees a fare estimate; drivers go online/offline and stream their location; system matches the rider to a nearby driver; both see live location during the trip; trip ends with a fare and a payment.</li>
        <li><b>Non-functional:</b> match in about 1-3 s (low latency); <b>a driver must never be assigned two trips at once</b> (strong consistency for assignment); location data may be slightly stale (eventual consistency is fine); highly available; scales by city/region.</li>
      </ul>
      <h4>2. Back-of-envelope estimates</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Active drivers online', '1 million worldwide, peak', '1M'],
        ['Location pings', 'one every 4 s per driver', '1M / 4 = <b>250,000 writes per second</b>'],
        ['Ride requests', '20M rides/day, peak 5x the average', '20M / 86,400 ≈ 230/s average, ≈ <b>1,200/s peak</b>'],
        ['Location memory', '1M drivers × ~100 bytes (id, lat, lng, status, time)', '≈ <b>100 MB</b> - fits in RAM on one machine'],
        ['Ping bandwidth', '250K/s × 100 B', '≈ 25 MB/s - easy']
      ])}
      <p>The insight: location data is <b>tiny but very write-heavy</b>. So keep it in memory (Redis / in-process), throw away old values, and never write every ping to a disk database. Trips (money, history) are low-volume but must be durable, so they go in a real database.</p>
      <h4>3. APIs</h4>
      ${H.table(['Call', 'Who', 'Notes'], [
        ['<code>POST /v1/rides</code> {pickup, dropoff, product}', 'Rider', 'Creates a ride in state REQUESTED. Returns ride_id and fare estimate. Needs an <code>Idempotency-Key</code> header so a double tap does not create two rides.'],
        ['<code>WS /v1/driver/stream</code> (sends {lat, lng, status} every 4 s)', 'Driver', 'WebSocket or MQTT - one long-lived connection per driver beats 250K HTTP requests per second.'],
        ['<code>POST /v1/rides/{id}/accept</code>', 'Driver', 'Compare-and-set on the ride: only one driver can win.'],
        ['<code>GET /v1/rides/{id}</code> + push channel', 'Rider', 'Live status and driver position.']
      ])}
      <h4>4. Data model</h4>
      <ul>
        <li><b>Driver location (hot, in memory):</b> <code>cell_id → set of (driver_id, lat, lng, ts)</code> and <code>driver_id → cell_id</code>. Stored in Redis (GEO or plain sets) with a TTL of ~10 s so a driver whose phone died disappears by itself.</li>
        <li><b>Trips (durable):</b> <code>trip(id, rider_id, driver_id, state, pickup, dropoff, fare, created_at)</code> in a sharded SQL / Spanner-style store. State machine: REQUESTED → OFFERED → ACCEPTED → ARRIVED → IN_PROGRESS → COMPLETED (or CANCELLED).</li>
        <li><b>Driver state:</b> AVAILABLE / OFFERED / ON_TRIP - changed only with an atomic compare-and-set.</li>
      </ul>
      <h4>5. High-level architecture</h4>
      <ol>
        <li>Driver app → <b>Gateway / WebSocket service</b> → <b>Location service</b> → updates the cell index (in-memory, sharded by cell prefix).</li>
        <li>Rider app → API gateway → <b>Trip service</b> (creates the ride) → <b>Matching service</b>.</li>
        <li>Matching asks the Location service "who is in my cell + 8 neighbours?", asks the <b>ETA service</b> to rank by road time, then sends an offer through the driver's WebSocket.</li>
        <li>Driver accepts → Trip service does a CAS (REQUESTED → ACCEPTED, driver AVAILABLE → ON_TRIP). Events go to <b>Kafka</b> for pricing, analytics, and payments.</li>
      </ol>
      <h4>6. The key idea: geohash (🔵 how it works)</h4>
      <p>A <b>geohash</b> cuts the world in half by longitude (west/east = bit 0/1), then the half by latitude, then longitude again, and so on - each bit halves the cell. Write the bits down, group by 5, and use base-32 letters. Result: a short string such as <code>9q8yyk</code> (San Francisco). Two nice properties:</p>
      <ul>
        <li><b>Longer string = smaller cell.</b> Length 5 ≈ 5 km square, 6 ≈ 1.2 km × 0.6 km, 7 ≈ 150 m.</li>
        <li><b>Shared prefix = same big cell</b> (<code>9q8yy</code> contains <code>9q8yyk</code>). So a database index on the string gives "everything near here" by a prefix scan.</li>
      </ul>
      <p>Try the first visualizer: it halves the world bit by bit around a point and finally lights up the 8 neighbours you must also search.</p>`,
    clues: [
      '"find nearby drivers / restaurants / friends" → a <b>geospatial index</b> (geohash, quadtree, S2, H3) - never scan all points',
      '"1 million drivers sending location every few seconds" → write-heavy, <b>keep in memory with TTL</b>, do not persist each ping',
      '"a driver must not get two rides" → atomic <b>compare-and-set</b> / lock on driver state, strong consistency for assignment only',
      '"match within a second" → pre-filter by cell, then rank a small candidate set by road ETA',
      '"design for cities / regions" → <b>shard by geography</b> (cell prefix), most traffic never crosses regions',
      '"surge pricing / supply-demand heat map" → aggregate counts per cell in a stream'
    ],
    code: [{
      lang: 'python', run: true, title: 'Geohash encoder, neighbours and a nearby-driver index (runnable)',
      code: `# Geohash: encode, decode to a box, neighbours, and a tiny "find nearby drivers" index.
BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"

def encode(lat, lng, precision=7):
    lat_lo, lat_hi, lng_lo, lng_hi = -90.0, 90.0, -180.0, 180.0
    bits, bit_count, even, out, ch = [16, 8, 4, 2, 1], 0, True, [], 0
    while len(out) < precision:
        if even:  # even bit -> longitude
            mid = (lng_lo + lng_hi) / 2
            if lng >= mid:
                ch |= bits[bit_count]; lng_lo = mid
            else:
                lng_hi = mid
        else:     # odd bit -> latitude
            mid = (lat_lo + lat_hi) / 2
            if lat >= mid:
                ch |= bits[bit_count]; lat_lo = mid
            else:
                lat_hi = mid
        even = not even
        if bit_count < 4:
            bit_count += 1
        else:
            out.append(BASE32[ch]); bit_count, ch = 0, 0
    return "".join(out)

def decode_box(gh):
    lat_lo, lat_hi, lng_lo, lng_hi, even = -90.0, 90.0, -180.0, 180.0, True
    for c in gh:
        v = BASE32.index(c)
        for mask in (16, 8, 4, 2, 1):
            on = bool(v & mask)
            if even:
                mid = (lng_lo + lng_hi) / 2
                if on: lng_lo = mid
                else: lng_hi = mid
            else:
                mid = (lat_lo + lat_hi) / 2
                if on: lat_lo = mid
                else: lat_hi = mid
            even = not even
    return lat_lo, lat_hi, lng_lo, lng_hi

def neighbours(gh):
    # Trick: find the cell centre, step one cell size in each direction, re-encode.
    lat_lo, lat_hi, lng_lo, lng_hi = decode_box(gh)
    clat, clng = (lat_lo + lat_hi) / 2, (lng_lo + lng_hi) / 2
    dlat, dlng = lat_hi - lat_lo, lng_hi - lng_lo
    out = []
    for a in (-1, 0, 1):
        for b in (-1, 0, 1):
            if a == 0 and b == 0:
                continue
            lat = max(-89.999999, min(89.999999, clat + a * dlat))
            lng = (clng + b * dlng + 180) % 360 - 180   # wrap around the date line
            out.append(encode(lat, lng, len(gh)))
    return out

class DriverIndex:
    """cell -> {driver_id: (lat, lng)}; the production version lives in Redis or memory."""
    def __init__(self, precision=6):
        self.p, self.cells, self.where = precision, {}, {}
    def update(self, driver, lat, lng):
        old = self.where.get(driver)
        if old is not None:
            self.cells[old].pop(driver, None)       # leave the old cell
        cell = encode(lat, lng, self.p)
        self.cells.setdefault(cell, {})[driver] = (lat, lng)
        self.where[driver] = cell
    def nearby(self, lat, lng, k=3):
        home = encode(lat, lng, self.p)
        found = []
        for cell in [home] + neighbours(home):      # the 9-cell query
            for d, (la, ln) in self.cells.get(cell, {}).items():
                found.append(((la - lat) ** 2 + (ln - lng) ** 2, d))
        return [d for _, d in sorted(found)[:k]]

print(encode(57.64911, 10.40744, 11))   # u4pruydqqvj  (the Wikipedia example)
print(encode(37.7749, -122.4194, 6))    # San Francisco
idx = DriverIndex(6)
idx.update("d1", 37.7750, -122.4190)
idx.update("d2", 37.7800, -122.4300)
idx.update("d3", 37.7760, -122.4180)
idx.update("d1", 37.7752, -122.4185)    # d1 moved, stays indexed once
print(idx.nearby(37.7749, -122.4194, 2))
`
    }],
    codeTitle: ['Geohash encoder + nearby-driver index (Python)'],
    viz: [{
      title: 'Geohash: halving the world, bit by bit',
      input: '37.77 -122.42 8',
      inputLabel: 'latitude longitude bits (2-8)',
      gen: function (input) {
        var t = String(input).trim().split(/[\s,]+/).map(Number);
        if (t.length < 2 || t.some(isNaN)) throw new Error('Enter: latitude longitude [bits], e.g. 37.77 -122.42 8');
        var lat = t[0], lng = t[1], bits = t.length > 2 ? Math.round(t[2]) : 8;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new Error('Latitude must be -90..90 and longitude -180..180');
        if (bits < 2 || bits > 8) throw new Error('Bits must be between 2 and 8 (the grid gets big!)');
        var lonLo = -180, lonHi = 180, latLo = -90, latHi = 90, lonIdx = 0, latIdx = 0, lonB = 0, latB = 0, acc = 0, str = '';
        var frames = [];
        function gridPart(extraHl) {
          var rows = 1 << latB, cols = 1 << lonB, g = [], hl = {}, rh = [], ch = [], r, c;
          for (r = 0; r < rows; r++) { var row = []; for (c = 0; c < cols; c++) row.push('·'); g.push(row); rh.push(pad2(rows - 1 - r, latB)); }
          for (c = 0; c < cols; c++) ch.push(pad2(c, lonB));
          var sr = rows - 1 - latIdx;
          hl[sr + ',' + lonIdx] = 'sel'; g[sr][lonIdx] = '★';
          if (extraHl) extraHl(hl, rows, cols, sr);
          return { type: 'grid', label: 'Map cells (north is up) - rows = latitude bits, columns = longitude bits', rows: g, rowHead: rh, colHead: ch, hl: hl };
        }
        frames.push({ narr: 'The whole world is <b>one cell</b>. Our point is lat <b>' + lat + '</b>, lng <b>' + lng + '</b>. Each new bit will cut the current cell in half - first by <b>longitude</b> (west/east), then <b>latitude</b> (south/north), alternating.', parts: [gridPart(), { type: 'vars', vals: { 'lng range': '[-180, 180]', 'lat range': '[-90, 90]', bits: '(none yet)' } }] });
        for (var i = 0; i < bits; i++) {
          var isLon = i % 2 === 0, bit, why;
          if (isLon) {
            var mid = (lonLo + lonHi) / 2; bit = lng >= mid ? 1 : 0;
            why = 'Bit ' + (i + 1) + ' cuts <b>longitude</b> at ' + mid + '. Our lng ' + lng + (bit ? ' ≥ ' : ' &lt; ') + mid + ' → bit <b>' + bit + '</b> (' + (bit ? 'east' : 'west') + ' half).';
            if (bit) lonLo = mid; else lonHi = mid;
            lonIdx = lonIdx * 2 + bit; lonB++;
          } else {
            var m2 = (latLo + latHi) / 2; bit = lat >= m2 ? 1 : 0;
            why = 'Bit ' + (i + 1) + ' cuts <b>latitude</b> at ' + m2 + '. Our lat ' + lat + (bit ? ' ≥ ' : ' &lt; ') + m2 + ' → bit <b>' + bit + '</b> (' + (bit ? 'north' : 'south') + ' half).';
            if (bit) latLo = m2; else latHi = m2;
            latIdx = latIdx * 2 + bit; latB++;
          }
          acc = acc * 2 + bit; str += bit;
          var hlb = {}; hlb[0] = 'cur';
          frames.push({ narr: why + ' The cell is now <b>' + (1 << latB) + ' × ' + (1 << lonB) + '</b> pieces of the world; we are in the starred one.', parts: [
            gridPart(),
            { type: 'bits', label: 'geohash bits so far (newest = rightmost, highlighted)', value: acc, width: i + 1, hl: hlb },
            { type: 'vars', vals: { 'lng range': '[' + r1(lonLo) + ', ' + r1(lonHi) + ']', 'lat range': '[' + r1(latLo) + ', ' + r1(latHi) + ']', bits: str } }
          ] });
        }
        frames.push({ narr: 'Why look at <b>neighbours</b>? A driver 5 metres away but across the cell edge has a <i>different</i> hash. So Uber-style code queries the <b>home cell + the 8 surrounding cells</b> (green) - 9 cheap lookups instead of scanning the city.', parts: [
          gridPart(function (hl, rows, cols, sr) { for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; var rr = sr + dr, cc = lonIdx + dc; if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) hl[rr + ',' + cc] = 'ok'; } }),
          { type: 'vars', vals: { 'cells to query': 'up to 9', 'cell width (deg lng)': r1(lonHi - lonLo), 'cell height (deg lat)': r1(latHi - latLo) } }
        ] });
        frames.push({ narr: 'Done. Every extra <b>5 bits</b> add one base-32 letter to the geohash. The longer the prefix, the smaller (and more precise) the cell. Two points sharing a long prefix are close - so a plain string index answers "who is nearby?".', parts: [
          gridPart(), { type: 'vars', vals: { 'bit string': str, 'bits used': bits, 'rule': 'shared prefix = same cell' }, hl: { 'bit string': 'sel' } }
        ] });
        return frames;
      }
    }, {
      title: 'Nearest driver by road time (not straight-line)',
      input: 'G 2',
      inputLabel: 'rider intersection (A-H) and how many drivers (1-4)',
      gen: function (input) {
        var tk = String(input).trim().toUpperCase().split(/[\s,]+/);
        var rider = tk[0], k = tk.length > 1 ? Number(tk[1]) : 2;
        var N = { A: [10, 12], B: [35, 8], C: [62, 10], D: [90, 15], E: [12, 45], F: [38, 35], G: [65, 42], H: [90, 48] };
        if (!N[rider]) throw new Error('Rider intersection must be one of A B C D E F G H, e.g. "G 2"');
        if (!(k >= 1 && k <= 4)) throw new Error('How many drivers: 1 to 4');
        var edges = [['A', 'B', 4], ['B', 'C', 5], ['C', 'D', 3], ['A', 'E', 6], ['B', 'F', 3], ['C', 'G', 4], ['D', 'H', 5], ['E', 'F', 4], ['F', 'G', 2], ['G', 'H', 6]];
        var drivers = { A: 'D1', D: 'D2', E: 'D3', H: 'D4' };
        var adj = {}; Object.keys(N).forEach(function (n) { adj[n] = []; });
        edges.forEach(function (e) { adj[e[0]].push([e[1], e[2]]); adj[e[1]].push([e[0], e[2]]); });
        var nodes = Object.keys(N).map(function (id) { return { id: id, label: id, x: N[id][0], y: N[id][1] }; });
        var dist = {}, done = {}, pq = [], found = [], tags = {}, hl = {}, frames = [];
        Object.keys(N).forEach(function (n) { dist[n] = Infinity; });
        dist[rider] = 0; pq.push([0, rider]);
        function snap(narr, cur, ehl) {
          var h = {}; Object.keys(done).forEach(function (n) { h[n] = 'ok'; });
          found.forEach(function (f) { h[f[1]] = 'sel'; });
          h[rider] = h[rider] === 'sel' ? 'sel' : 'win';
          if (cur) h[cur] = 'cur';
          var tg = {}; Object.keys(drivers).forEach(function (n) { tg[n] = drivers[n] + (isFinite(dist[n]) ? ' · ' + dist[n] + ' min' : ''); });
          Object.keys(dist).forEach(function (n) { if (isFinite(dist[n]) && !drivers[n]) tg[n] = dist[n] + ' min'; });
          var q = pq.slice().sort(function (a, b) { return a[0] - b[0]; }).map(function (p) { return p[1] + ':' + p[0]; });
          return { narr: narr, parts: [
            { type: 'graph', label: 'Road network (numbers = minutes). Rider = ' + rider + ' (blue). Drivers D1-D4 sit at A, D, E, H.', height: 60, nodes: nodes, edges: edges, hl: h, ehl: ehl || {}, tags: tg },
            { type: 'queue', label: 'Priority queue (closest first)', items: q, frontLabel: 'next', backLabel: 'later' },
            { type: 'vars', vals: { 'drivers found': found.map(function (f) { return f[2] + '@' + f[0] + 'min'; }).join(', ') || 'none yet', 'need': k } }
          ] };
        }
        frames.push(snap('The geohash cell step gave us a <b>candidate list</b>: D1, D2, D3, D4. But straight-line distance lies - rivers and one-way streets exist. So we run <b>Dijkstra on the road graph</b> starting from the rider at <b>' + rider + '</b>, and stop as soon as we have <b>' + k + '</b> drivers.', null));
        while (pq.length && found.length < k) {
          pq.sort(function (a, b) { return a[0] - b[0]; });
          var top = pq.shift(), d = top[0], u = top[1];
          if (done[u]) continue;
          done[u] = true;
          var ehl = {};
          adj[u].forEach(function (e) { if (!done[e[0]] && d + e[1] < dist[e[0]]) { dist[e[0]] = d + e[1]; pq.push([dist[e[0]], e[0]]); ehl[u + '-' + e[0]] = 'ok'; ehl[e[0] + '-' + u] = 'ok'; } });
          if (drivers[u]) {
            found.push([d, u, drivers[u]]);
            frames.push(snap('Pop <b>' + u + '</b> at ' + d + ' min: <span class="c-p">driver ' + drivers[u] + ' found</span> (' + found.length + ' of ' + k + '). Closest-first order guarantees nothing nearer is missed.', u, ehl));
          } else {
            frames.push(snap('Pop <b>' + u + '</b> at ' + d + ' min - no driver here. Relax its roads (green): neighbours get a better travel time if this route is shorter.', u, ehl));
          }
        }
        frames.push(snap('Ranking: ' + (found.map(function (f) { return f[2] + ' (' + f[0] + ' min)'; }).join(' then ') || 'no driver reachable') + '. The matching service now runs the offer protocol: set the best driver to OFFERED with a compare-and-set, send the offer, wait for the answer.', null));
        frames.push(snap('Search stops. Offer the trip to the <b>closest driver first</b>; if he declines or times out (e.g. 10 s), offer to the next. Only the nodes near the rider were touched - we never explored the whole city.', null));
        return frames;
      }
    }],
    examples: [
      { title: 'Choosing the geohash length', html: `<p>Pick the length so that one cell is about as big as your <b>search radius</b>. Pickup search radius ≈ 1-2 km → length 6 (≈ 1.2 km × 0.6 km) and query 9 cells ≈ 3.6 km × 1.8 km. If a cell has too few drivers (rural), go up one level: use the 5-letter prefix and widen the area. If a cell is overloaded (stadium after a concert), go down to length 7.</p>
        ${H.table(['Length', 'Cell size (approx.)', 'Use'], [['4', '39 km × 20 km', 'city-level surge heat map'], ['5', '4.9 km × 4.9 km', 'rural pickup search'], ['6', '1.2 km × 0.6 km', '<span class="c-g">urban pickup search</span>'], ['7', '153 m × 153 m', 'dense downtown, airport pickup zones'], ['8', '38 m × 19 m', 'precise parking-spot / pin snapping']])}` },
      { title: 'A driver crosses a cell border', html: `<p>Driver <code>d1</code> pings from cell <code>9q8yyk</code> then, 4 seconds later, from <code>9q8yym</code>. The Location service must <b>remove d1 from the old cell's set and add to the new one</b>. We keep the reverse map <code>driver → cell</code> so we know which set to remove from, in O(1). In Redis this is a small Lua script or a MULTI so a rider query never sees d1 in two cells (or none).</p>
        <p>The TTL also helps: every ping refreshes <code>EXPIRE driver:d1 10</code>. If pings stop, d1 quietly leaves the index after 10 s.</p>` },
      { title: 'Why not just SQL: WHERE lat BETWEEN ... AND lng BETWEEN ...?', html: `<p>With 1M drivers updating location 250K times per second, a B-tree index on (lat, lng) is rewritten constantly - the disk would melt. Also a two-column range query can use an index on only <b>one</b> column well, so it scans a long strip of the map. A geohash turns the 2-D position into <b>one string</b>, so a single-key hash lookup (or a short prefix scan) returns the candidates. And since the data is only valid for seconds, we keep it <b>in memory</b>.</p>`, code: { lang: 'text', title: 'The naive query that breaks', code: `SELECT id FROM drivers
 WHERE status = 'AVAILABLE'
   AND lat BETWEEN 37.76 AND 37.79
   AND lng BETWEEN -122.43 AND -122.40;   -- strip scan + index rewrite on every ping` } },
      { title: 'Surge pricing is just a per-cell ratio', html: `<p>A stream job (see the Ad Click Aggregator topic, same windowing idea) counts, per 6-letter cell and 1-minute window: <b>open ride requests</b> and <b>available drivers</b>. If requests / drivers &gt; 1.5, the multiplier rises (1.2x, 1.5x ...). Prices are smoothed with neighbouring cells so the price does not jump on one street corner. The multiplier is stored with a short TTL and shown to the rider <i>before</i> they confirm.</p>` }
    ],
    deepDive: `<h4>🟣 Geohash vs quadtree vs S2 vs H3</h4>
      ${H.table(['Index', 'Cell shape / idea', 'Strength', 'Weakness'], [
        ['<b>Geohash</b>', 'Fixed rectangles by alternating lng/lat halving; string prefix = containment', 'Trivial to implement; works in any key-value store (Redis, Cassandra, DynamoDB)', 'Cells get thin near the poles; edge effect needs 9-cell query; <b>uniform</b> size so busy and empty areas look the same'],
        ['<b>Quadtree</b>', 'Split a square into 4 only when it has more than C points - <b>adaptive</b>', 'Dense downtown = tiny cells, desert = huge cells; k-nearest search by walking the tree', 'Tree lives in memory and must be rebuilt/rebalanced as drivers move; harder to shard across machines'],
        ['<b>Google S2</b>', 'Sphere cut into cells ordered along a Hilbert curve; each cell has a 64-bit id', 'Works on a sphere (no pole distortion); nearby cells have nearby ids so range scans are cheap; many levels', 'More complex maths; need a library'],
        ['<b>Uber H3</b>', 'Hexagonal grid, 16 resolutions', 'A hexagon has 6 equal-distance neighbours (no "corner" neighbours), great for smoothing surge and routing', 'Hexagons do not nest perfectly (child cells approximate the parent)']
      ])}
      <p><b>Static vs adaptive:</b> geohash is static - you choose one length. A quadtree adapts: if more than, say, 500 drivers sit in a leaf, split it into 4 children. Because a driver can move, we do <b>not</b> rebuild the tree on every ping; production systems mostly use fixed grids (geohash/S2/H3) for the live driver index and use quadtrees/R-trees for <b>static</b> data like points of interest.</p>
      <h4>Driver matching: greedy vs batched</h4>
      <p><b>Greedy nearest-driver</b> is simple but unfair: two riders requesting at the same instant may both grab the single best driver, leaving one rider with a far one. <b>Batched matching</b> collects requests for ~2 seconds, builds a bipartite graph (riders on one side, drivers on the other, weight = pickup ETA) and solves an <b>assignment problem</b> (Hungarian algorithm or a heuristic) to minimise <i>total</i> waiting time. A tiny delay buys a much better global result.</p>
      <h4>Making assignment safe</h4>
      <ul>
        <li>Driver states AVAILABLE → OFFERED → ON_TRIP are changed with a <b>compare-and-set</b> (e.g. Redis <code>SET driver:7:state OFFERED NX EX 15</code>). Only one matching worker wins the driver.</li>
        <li>The offer has a <b>15 s timeout</b>. Accept/decline messages carry the offer id; a late accept for an expired offer is rejected.</li>
        <li>The trip row is the source of truth; if the Matching service crashes mid-way, the offer TTL expires and the driver returns to AVAILABLE by itself.</li>
      </ul>
      <h4>Scaling and sharding</h4>
      <ul>
        <li><b>Shard the Location service by geography</b> - e.g. consistent hashing on the 4-letter geohash prefix, so one city lives on a few nodes. A rider query touches 1-2 shards.</li>
        <li><b>Hot cells:</b> airport on Friday evening. Use finer prefixes for that region, or replicate the hot shard read-only for queries.</li>
        <li>The WebSocket tier is stateful (a connection lives on one box). Keep a map <code>driver_id → gateway node</code> in Redis so Matching can route an offer to the right box.</li>
        <li><b>ETA</b> uses the routing service (next topic: Google Maps) plus live traffic; for ranking 50 candidates you first sort by straight-line distance, then run road ETA only on the top 10 to save cost.</li>
        <li><b>Failure:</b> if a Location shard dies, drivers re-ping in 4 s and the index rebuilds itself - the data is self-healing. That is why we do not need to persist it.</li>
      </ul>
      <h4>Trade-offs to say out loud</h4>
      <ul>
        <li>Memory-only locations: fast and cheap, but a restart loses ≤ 4 s of data (acceptable).</li>
        <li>Strong consistency only on <b>assignment</b> (small, rare writes), eventual consistency for locations (huge, frequent writes).</li>
        <li>Batch window: bigger = better global match, but riders wait longer.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> Modern dispatch uses learned models for <b>ETA prediction</b> (graph neural nets on live traffic), <b>demand forecasting</b> (positioning drivers before a concert ends), and fraud detection. The geospatial index itself stays classical - geohash / S2 / H3 are still the first filter, because they are exact and cheap.</p>
        <p><b>Use AI as a partner:</b> <code>Give me 5 failure scenarios for a driver-assignment service using Redis TTL holds; for each, say what the user sees</code>, or ask it to quiz you on "geohash vs S2 for a delivery app in Tokyo". It is also handy for generating test coordinates near cell borders and the date line.</p>
        <p><b>Where AI goes wrong:</b> it often suggests storing every GPS ping in PostgreSQL "with PostGIS" (write amplification!), forgets the <b>9-cell neighbour query</b>, or uses a geohash length without justifying it from the search radius. It may also claim that a geohash distance equals real distance - it does not.</p>
        <p><b>What you must still own:</b> the estimates (250K writes/s), choosing consistency per data type, and explaining the driver-lock / offer-timeout protocol. Interviewers care about reasoning more than the brand of index.</p>`,
    problems: [{
      title: 'Nearby Drivers at 250K Updates per Second', level: 'Medium', tags: ['geohash', 'geospatial', 'hld'], companies: ['Uber', 'Lyft', 'DoorDash'],
      statement: `<p>Design the <b>location tracking and nearby search</b> part of a ride-hailing app. 1 million drivers are online and each sends its position every 4 seconds. A rider request must return the 10 closest available drivers within a 2 km radius in under 100 ms (the matching service calls this). Explain the data structure, where it is stored, what happens at cell borders, and how it scales.</p>`,
      constraints: `1M online drivers · 250K location writes/s · 1,200 nearby queries/s at peak · p99 query &lt; 100 ms · stale data older than 10 s must not be returned.`,
      example: `<p>Driver d1 at (37.7752, -122.4185) → cell <code>9q8yyk</code>. Rider at (37.7749, -122.4194) → cell <code>9q8yyk</code>. Query = that cell + its 8 neighbours.</p><p>${H.c('g', 'Output: [d1, d3]')} - sorted by distance after filtering the ~hundreds of candidates in 9 cells.</p>`,
      brute: { why: `<p>A SQL table <code>drivers(id, lat, lng)</code> with a range query on lat and lng. Every ping is an UPDATE that rewrites index pages: 250K writes/s will saturate any single database, and a range query on two columns scans a long strip. Scanning all 1M drivers per query (1,200/s) would be 1.2 billion distance checks per second.</p>` },
      mcq: { q: 'Which choice best handles 250K tiny location writes per second?', options: ['In-memory cell index (sharded) with TTL', 'One row per ping in a relational database', 'Write each ping to Kafka and read it back at query time'], answer: 0, explain: 'Location data is small, short-lived and self-healing; memory with a TTL gives O(1) updates and lookups. A relational row per ping wastes durability on data that is useless after seconds.' },
      hints: [`<p>The search is "who is near me?", so give every point a <b>cell id</b> and look up cells, not points.</p>`, `<p>Geohash of length 6 (~1.2 km cells), a map cell → set of drivers and a reverse map driver → cell, sharded by the first 4 letters. Add a TTL.</p>`, `<p>Edge cases: the rider sits near a border (query 9 cells); too few drivers (query the 5-letter parent); crowded cell (finer prefix); driver moves cell (remove from old set, add to new); stale driver (TTL). Finally sort the few hundred candidates by distance and return the top 10.</p>`],
      solution: {
        approach: `<p><b>Design.</b> Each driver app holds a WebSocket to a gateway and sends {lat, lng, status} every 4 s. The Location service computes the geohash (length 6) and updates two in-memory maps in Redis (or a custom memory store): <code>cell → set(driver)</code> and <code>driver → cell</code>, plus a per-driver key with <code>EXPIRE 10</code>. A move across cells is done in one atomic script (remove from old, add to new).</p>
          <p><b>Query.</b> Compute the rider's cell, fetch that cell and its 8 neighbours (9 O(1) lookups, possibly on 1-2 shards), drop drivers that are not AVAILABLE or whose last ping is older than 10 s, compute the straight-line distance for the few hundred survivors, take the top 10 within 2 km. If fewer than 10, widen to the 5-letter parent cell. Then the Matching service ranks these by road ETA.</p>
          <p><b>Scale.</b> Shard by the 4-letter prefix with consistent hashing so a city sits on a handful of nodes; replicate hot shards for reads (airport, stadium); use finer cells for dense areas. No disk persistence: after a crash drivers re-ping within 4 s and the index rebuilds. Back-pressure: if a shard is overloaded, drop every second ping from a driver who has not moved - the data is redundant.</p>`,
        complexity: `<p>Update: O(1). Query: O(9 cells + candidates in them) ≈ a few hundred items. Memory ≈ 1M × 100 B = 100 MB, comfortably in RAM.</p>`,
        followUps: ['How would you support "drivers heading towards this destination" (ride pooling)?', 'What changes if the cell holds 50,000 drivers (e.g. an airport)?']
      }
    }]
  });

  /* ================= TOPIC 2: GOOGLE MAPS ================= */
  topics.push({
    title: 'Design Google Maps: Tiles, Quadtrees & Routing (Dijkstra, A*, Contraction Hierarchies)',
    analogy: `<p>Think of a <b>paper road atlas</b>. There is a page for the whole country (zoom out), pages for each state, and pages for each city street map (zoom in). You never carry all pages - you open the ones you need. That is <b>map tiles</b>.</p>
      <p>Now you want to drive from your village to a city 800 km away. You do not study every lane in the country. You walk out of the village to the nearest <b>highway ramp</b>, ride highways, then leave near the destination. Fast route finders do the same - they build "highway shortcuts" in advance. That is <b>contraction hierarchies</b>.</p>`,
    explain: `<p><b>Goal:</b> show a zoomable map, let people search places, compute the best route and ETA between two points, and update the route when traffic changes - for a billion users.</p>
      <h4>1. Requirements</h4>
      <ul>
        <li><b>Functional:</b> (a) render the map at any zoom level; (b) search "pizza near me" / geocode an address to lat-lng; (c) route A → B by car/walk/transit with an ETA; (d) turn-by-turn navigation with re-routing; (e) live traffic.</li>
        <li><b>Non-functional:</b> map scrolling must feel instant (tiles from a nearby CDN); routing answers in &lt; 1 s even across a continent; map data is <b>read-mostly</b> (updates in hours/days, traffic in minutes); highly available; eventual consistency is fine.</li>
      </ul>
      <h4>2. Estimates</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Tile counts', 'zoom z has 2<sup>z</sup> × 2<sup>z</sup> = 4<sup>z</sup> tiles', 'z=0: 1 · z=10: ~1M · z=18: ~68.7 <b>billion</b>'],
        ['Tile size', 'vector tile ~20 KB, raster ~30-100 KB', 'full world is petabytes - but most tiles (oceans) are empty or shared'],
        ['Tile requests', '500M sessions/day × 30 tiles', '15B/day ≈ <b>175K/s</b>; with a 95% CDN hit rate the origin sees ≈ 9K/s'],
        ['Route requests', '50M/day', '≈ 580/s average, ≈ <b>3K/s</b> peak'],
        ['Road graph', '~500M intersections, ~1B road segments × 20 B', '≈ 20 GB - fits in memory when split by region']
      ])}
      <h4>3. APIs</h4>
      ${H.table(['Call', 'Notes'], [
        ['<code>GET /tiles/{z}/{x}/{y}.pbf</code>', 'Static, immutable URL, cache forever (version in the path). Served by CDN from object storage.'],
        ['<code>GET /v1/places?q=pizza&amp;near=lat,lng</code>', 'Search + geocoding; returns place ids and coordinates.'],
        ['<code>POST /v1/routes</code> {origin, destination, mode, depart_at}', 'Returns polyline, distance, ETA, and alternatives.'],
        ['<code>WS /v1/navigation</code>', 'Client streams position; server pushes re-route when traffic changes.']
      ])}
      <h4>4. Data model</h4>
      <ul>
        <li><b>Tiles:</b> object storage key <code>map/v42/{z}/{x}/{y}</code> → vector data (roads, buildings, labels). Built offline by a batch pipeline from raw map data and satellite imagery.</li>
        <li><b>Road graph:</b> nodes = intersections; edges = road segments with length, speed limit, one-way flag, turn restrictions. Partitioned by region (see below).</li>
        <li><b>Places:</b> a search index (inverted index for names + geo index like geohash/S2 cell) - Elasticsearch-style.</li>
        <li><b>Live traffic:</b> <code>segment_id → current speed</code> in a fast in-memory store, plus historical speeds by time-of-week.</li>
      </ul>
      <h4>5. High-level architecture</h4>
      <ol>
        <li><b>Map rendering path:</b> client computes which tiles are visible → asks CDN → CDN misses go to the Tile service → object storage. Client draws vector tiles on the GPU.</li>
        <li><b>Search path:</b> client → Places service → search index (names + geo filter) → ranked results.</li>
        <li><b>Routing path:</b> client → Route service → finds graph shard(s) for origin and destination → shortest path → ETA service adds live traffic.</li>
        <li><b>Traffic path:</b> phones send anonymous (position, speed) probes → <b>map matching</b> snaps to road segments → Kafka → streaming job averages speed per segment per minute → traffic store.</li>
      </ol>
      <h4>6. Tiles are a quadtree 🔵</h4>
      <p>Zoom 0 is a single tile covering the world. Each zoom level splits <b>every tile into 4</b> children: that is a <b>quadtree</b> with the tile address (z, x, y) as its path. Because the tree is complete, you never store it - you compute the address from latitude and longitude with a formula. The second visualizer-style idea below shows the <i>adaptive</i> version, used for <b>points of interest</b>: split a region only when it holds too many places, so downtown gets tiny cells and the Sahara gets one big cell.</p>
      <h4>7. Routing 🔵</h4>
      <p>The road network is a <b>weighted graph</b> (weights = seconds of travel). Three levels of cleverness:</p>
      <ul>
        <li><b>Dijkstra:</b> grow outwards from the start in order of travel time, like ripples on a pond, until the ripple hits the destination. Correct, but the ripple is a big circle - it explores everything within the same travel time in <i>all</i> directions.</li>
        <li><b>A*:</b> same, but order by <code>time-so-far + straight-line-estimate-to-goal</code>. The ripple leans towards the goal. Needs an estimate that never overestimates (straight-line distance divided by max speed).</li>
        <li><b>Contraction hierarchies:</b> pre-compute shortcuts so a query only climbs to "highway level" and back down - see the deep dive.</li>
      </ul>
      <p>The second visualizer lets you watch Dijkstra and A* on the same little map and compares how many places each looked at.</p>`,
    clues: [
      '"zoom in / zoom out smoothly" → <b>tile pyramid</b> (z/x/y), static tiles on a CDN, vector tiles rendered on the client',
      '"shortest path on a road network with 100M+ nodes" → plain Dijkstra is too slow; think A*, bidirectional search, <b>contraction hierarchies</b>, graph partitioning',
      '"avoid traffic / ETA changes with traffic" → edge weights change in real time → hierarchy must be <b>re-customisable</b>',
      '"search nearby places, but also by name" → inverted index for text + geo cell (geohash/S2/quadtree) filter',
      '"billions of tiles" → do not precompute everything: lazy-render + cache, empty ocean tiles share one object',
      '"navigation reroutes when I miss a turn" → keep the planned route on the client, request a new one from the current position'
    ],
    code: [{
      lang: 'python', run: true, title: 'Dijkstra vs A* on a small road graph (runnable)',
      code: `import heapq, math

# node -> (x, y) in "km"; edges are (a, b, minutes)
POS = {"S": (8, 30), "A": (25, 10), "B": (25, 50), "C": (45, 30), "D": (50, 8),
       "E": (55, 52), "F": (72, 30), "G": (85, 12), "T": (92, 48)}
ROADS = [("S", "A", 4), ("S", "B", 4), ("S", "C", 8), ("A", "D", 6), ("B", "E", 7), ("C", "D", 6),
         ("C", "E", 7), ("C", "F", 6), ("D", "G", 8), ("F", "G", 6), ("E", "T", 9), ("F", "T", 8), ("G", "T", 7)]
ADJ = {n: [] for n in POS}
for a, b, w in ROADS:
    ADJ[a].append((b, w)); ADJ[b].append((a, w))

def h(n, goal):
    # Straight-line km / 5 km-per-minute: never more than the real time, so A* stays correct.
    (x1, y1), (x2, y2) = POS[n], POS[goal]
    return math.floor(math.hypot(x1 - x2, y1 - y2) / 5)

def shortest(src, dst, use_astar):
    g = {src: 0}
    parent = {}
    pq = [(h(src, dst) if use_astar else 0, src)]   # ordered by f = g + h
    closed, explored = set(), 0
    while pq:
        f, u = heapq.heappop(pq)
        if u in closed:
            continue            # stale queue entry, a better one was already used
        closed.add(u); explored += 1
        if u == dst:
            path = [u]
            while path[-1] != src:
                path.append(parent[path[-1]])
            return g[u], path[::-1], explored
        for v, w in ADJ[u]:
            if g[u] + w < g.get(v, 1e9):
                g[v] = g[u] + w
                parent[v] = u
                heapq.heappush(pq, (g[v] + (h(v, dst) if use_astar else 0), v))
    return None

print("Dijkstra:", shortest("S", "T", False))
print("A*      :", shortest("S", "T", True))
`
    }],
    codeTitle: ['Dijkstra and A* with one heap (Python)'],
    viz: [{
      title: 'Quadtree-style adaptive split of a city (binary view)',
      input: 'cap=2 10,10 12,14 14,12 80,85 85,82 88,90 15,70 70,15 78,20 74,18',
      inputLabel: 'cap=<max points per cell> then x,y points (0-99)',
      gen: function (input) {
        var cap = 2, pts = [];
        String(input).trim().split(/\s+/).forEach(function (tok) {
          if (/^cap=/i.test(tok)) cap = Number(tok.slice(4));
          else { var p = tok.split(','); if (p.length !== 2 || isNaN(p[0]) || isNaN(p[1]) || p[0] === '' || p[1] === '') throw new Error('Points look like 12,80 (x,y from 0 to 99). Optional first token: cap=2'); pts.push([Number(p[0]), Number(p[1])]); }
        });
        if (!(cap >= 1 && cap <= 4)) throw new Error('cap must be 1 to 4');
        if (pts.length < 3 || pts.length > 16) throw new Error('Give between 3 and 16 points');
        pts.forEach(function (p) { if (p[0] < 0 || p[0] >= 100 || p[1] < 0 || p[1] >= 100) throw new Error('Coordinates must be 0 to 99.9'); });
        function mk(x0, y0, x1, y1, d) { return { x0: x0, y0: y0, x1: x1, y1: y1, d: d, pts: [], l: null, r: null, axis: d % 2, split: null }; }
        var root = mk(0, 0, 100, 100, 0), splits = 0;
        function trySplit(n) {
          if (n.pts.length <= cap || n.d >= 3) return;
          var a = n.axis; n.split = a === 0 ? (n.x0 + n.x1) / 2 : (n.y0 + n.y1) / 2;
          n.l = a === 0 ? mk(n.x0, n.y0, n.split, n.y1, n.d + 1) : mk(n.x0, n.y0, n.x1, n.split, n.d + 1);
          n.r = a === 0 ? mk(n.split, n.y0, n.x1, n.y1, n.d + 1) : mk(n.x0, n.split, n.x1, n.y1, n.d + 1);
          n.pts.forEach(function (p) { (p[a] < n.split ? n.l : n.r).pts.push(p); });
          n.pts = []; splits++;
          trySplit(n.l); trySplit(n.r);
        }
        function insert(p) {
          var n = root, idx = 0, path = [0];
          while (n.l) { var a = n.axis; if (p[a] < n.split) { n = n.l; idx = 2 * idx + 1; } else { n = n.r; idx = 2 * idx + 2; } path.push(idx); }
          n.pts.push(p);
          var before = splits; trySplit(n);
          // re-walk to find the final leaf for the point
          var m = root, j = 0, path2 = [0];
          while (m.l) { var b = m.axis; if (p[b] < m.split) { m = m.l; j = 2 * j + 1; } else { m = m.r; j = 2 * j + 2; } path2.push(j); }
          return { leaf: m, path: path2, did: splits > before };
        }
        function view(cur, info) {
          var arr = [], tags = {}, i;
          for (i = 0; i < 15; i++) arr.push(null);
          (function fill(n, idx) {
            if (idx > 14) return;
            if (n.l) { arr[idx] = (n.axis === 0 ? 'x=' : 'y=') + n.split; tags[idx] = n.axis === 0 ? 'W | E' : 'S | N'; fill(n.l, 2 * idx + 1); fill(n.r, 2 * idx + 2); }
            else { arr[idx] = '[' + n.pts.length + ']'; tags[idx] = n.pts.length ? n.pts.length + ' pt' : 'empty'; }
          })(root, 0);
          while (arr.length && arr[arr.length - 1] === null) arr.pop();
          var hl = {};
          if (info) { info.path.forEach(function (ix) { hl[ix] = 'cur'; }); hl[info.path[info.path.length - 1]] = 'ok'; }
          var rows = [], hg = {}, r, c;
          for (r = 0; r < 8; r++) { var row = []; for (c = 0; c < 8; c++) row.push(''); rows.push(row); }
          cur.forEach(function (p) { rows[7 - Math.floor(p[1] / 12.5)][Math.floor(p[0] / 12.5)] = '•'; });
          if (info) {
            var L = info.leaf;
            for (r = 0; r < 8; r++) for (c = 0; c < 8; c++) if (c * 12.5 >= L.x0 && (c + 1) * 12.5 <= L.x1 && (7 - r) * 12.5 >= L.y0 && (8 - r) * 12.5 <= L.y1) hg[r + ',' + c] = 'win';
            var lp = cur[cur.length - 1]; hg[(7 - Math.floor(lp[1] / 12.5)) + ',' + Math.floor(lp[0] / 12.5)] = 'cur';
          }
          return [
            { type: 'grid', label: 'City map (8 × 8 blocks, north up). • = place. Blue = the leaf region holding the new point.', rows: rows, hl: hg },
            { type: 'tree', label: 'Split tree (each node = one cut; a real quadtree does the x-cut and y-cut together → 4 children)', arr: arr, hl: hl, tags: tags }
          ];
        }
        var frames = [], inserted = [];
        frames.push({ narr: 'Start with <b>one big region</b> (the whole city) that holds at most <b>' + cap + '</b> places. Each time a region gets too full, we cut it in half (alternating vertical and horizontal cuts). Dense areas get cut again and again; empty areas never get cut.', parts: view([], null).concat([{ type: 'vars', vals: { capacity: cap, 'max depth': 3, 'places': 0, splits: 0 } }]) });
        pts.forEach(function (p, k) {
          var s0 = splits, info = insert(p); inserted.push(p);
          var msg = 'Insert place <b>(' + p[0] + ', ' + p[1] + ')</b>: walk down the cuts (x &lt; 50? left : right ...) to the leaf. ';
          msg += info.did ? '<span class="c-r">The leaf overflowed (more than ' + cap + ')</span> → it is <b>split</b> and its places are shared between the new halves.' : '<span class="c-g">The leaf still has room</span> - just store it.';
          if (!info.did && info.leaf.pts.length > cap) msg += ' (Max depth reached: this bucket stays large - real systems cap depth too.)';
          frames.push({ narr: msg, parts: view(inserted, info).concat([{ type: 'vars', vals: { capacity: cap, places: inserted.length, splits: splits, 'depth of leaf': info.leaf.d }, hl: info.did ? { splits: 'bad' } : {} }]) });
        });
        frames.push({ narr: 'Finished. Look: the crowded corners are cut into small cells, the quiet areas stay as big cells. A "find places near me" query only walks <b>one path</b> of about ' + 'log<sub>2</sub>(cells) steps and then scans a leaf of at most ' + cap + ' places plus neighbouring leaves.', parts: view(inserted, null).concat([{ type: 'vars', vals: { places: inserted.length, 'total splits': splits, lesson: 'adaptive cells' } }]) });
        return frames;
      }
    }, {
      title: 'Dijkstra vs A*: how much of the map do we explore?',
      input: 'S T astar',
      inputLabel: 'start end algorithm  (nodes S A B C D E F G T; algorithm: dijkstra or astar)',
      gen: function (input) {
        var tk = String(input).trim().split(/[\s,]+/);
        var src = (tk[0] || '').toUpperCase(), dst = (tk[1] || '').toUpperCase(), algo = (tk[2] || 'astar').toLowerCase();
        var P = { S: [8, 30], A: [25, 10], B: [25, 50], C: [45, 30], D: [50, 8], E: [55, 52], F: [72, 30], G: [85, 12], T: [92, 48] };
        if (!P[src] || !P[dst] || src === dst) throw new Error('Pick two different nodes from S A B C D E F G T, e.g. "S T astar"');
        if (algo !== 'dijkstra' && algo !== 'astar') throw new Error('Algorithm must be dijkstra or astar');
        var raw = [['S', 'A', 1.2], ['S', 'B', 1.2], ['S', 'C', 1.0], ['A', 'D', 1.3], ['B', 'E', 1.3], ['C', 'D', 1.4], ['C', 'E', 1.4], ['C', 'F', 1.0], ['D', 'G', 1.1], ['F', 'G', 1.5], ['E', 'T', 1.6], ['F', 'T', 1.0], ['G', 'T', 1.2]];
        function dd(a, b) { return Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]); }
        var edges = raw.map(function (e) { return [e[0], e[1], Math.ceil(dd(e[0], e[1]) * e[2] / 5)]; });
        var adj = {}; Object.keys(P).forEach(function (n) { adj[n] = []; });
        edges.forEach(function (e) { adj[e[0]].push([e[1], e[2]]); adj[e[1]].push([e[0], e[2]]); });
        var nodes = Object.keys(P).map(function (id) { return { id: id, label: id, x: P[id][0], y: P[id][1] }; });
        function H(n, useA) { return useA ? Math.floor(dd(n, dst) / 5) : 0; }
        function run(useA, emit) {
          var g = {}, par = {}, closed = {}, open = [], out = [], explored = 0;
          g[src] = 0; open.push([H(src, useA), src]);
          function snap(narr, cur, pathSet) {
            var hl = {}, tg = {}, ehl = {};
            Object.keys(closed).forEach(function (n) { hl[n] = 'ok'; tg[n] = 'g=' + g[n]; });
            open.forEach(function (o) { if (!closed[o[1]]) { hl[o[1]] = 'win'; tg[o[1]] = useA ? 'g' + g[o[1]] + '+h' + H(o[1], true) + '=' + o[0] : 'g=' + g[o[1]]; } });
            if (cur) hl[cur] = 'cur';
            if (pathSet) pathSet.forEach(function (n) { hl[n] = 'sel'; });
            if (pathSet) for (var q = 0; q + 1 < pathSet.length; q++) { ehl[pathSet[q] + '-' + pathSet[q + 1]] = 'sel'; ehl[pathSet[q + 1] + '-' + pathSet[q]] = 'sel'; }
            var rows = open.slice().sort(function (a, b) { return a[0] - b[0]; }).filter(function (o) { return !closed[o[1]]; }).map(function (o) { return [o[1], g[o[1]], H(o[1], useA), o[0]]; });
            return { narr: narr, parts: [
              { type: 'graph', label: (useA ? 'A*' : 'Dijkstra') + ' on a road map. Numbers on roads = minutes. Green = finished, blue = waiting in the queue.', height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tg },
              { type: 'table', label: 'Priority queue (smallest f first)', columns: ['node', 'g (time so far)', 'h (guess to goal)', 'f = g + h'], rows: rows.length ? rows : [['-', '-', '-', '-']], hl: rows.length ? { 0: 'cur' } : {} },
              { type: 'vars', vals: { 'nodes explored': explored, algorithm: useA ? 'A*' : 'Dijkstra' } }
            ] };
          }
          if (emit) out.push(snap((useA ? 'A* orders the queue by <b>f = g + h</b>, where h is a straight-line guess to the goal. ' : 'Dijkstra orders the queue only by <b>g</b>, the travel time so far. ') + 'Start at <b>' + src + '</b>, goal is <b>' + dst + '</b>.', null));
          while (open.length) {
            open.sort(function (a, b) { return a[0] - b[0]; });
            var top = open.shift(), u = top[1];
            if (closed[u]) continue;
            closed[u] = true; explored++;
            if (u === dst) {
              var path = [u]; while (path[path.length - 1] !== src) path.push(par[path[path.length - 1]]); path.reverse();
              if (emit) out.push(snap('Goal <b>' + dst + '</b> popped with total time <b>' + g[u] + ' min</b>. Path: <b>' + path.join(' → ') + '</b>. Nodes explored: <b>' + explored + '</b> of 9.', null, path));
              return { frames: out, explored: explored, cost: g[u], path: path };
            }
            var improved = [];
            adj[u].forEach(function (e) { var ng = g[u] + e[1]; if (!closed[e[0]] && (g[e[0]] === undefined || ng < g[e[0]])) { g[e[0]] = ng; par[e[0]] = u; open.push([ng + H(e[0], useA), e[0]]); improved.push(e[0]); } });
            if (emit) out.push(snap('Pop <b>' + u + '</b> (g=' + g[u] + (useA ? ', h=' + H(u, true) : '') + '). Relax its roads' + (improved.length ? ': improved ' + improved.join(', ') + '.' : ' - nothing improved.'), u));
          }
          throw new Error('No path found');
        }
        var main = run(algo === 'astar', true), other = run(algo !== 'astar', false);
        var last = main.frames[main.frames.length - 1];
        last.parts.push({ type: 'text', html: '<b>Compare:</b> ' + (algo === 'astar' ? 'A*' : 'Dijkstra') + ' explored <b>' + main.explored + '</b> nodes; ' + (algo === 'astar' ? 'Dijkstra' : 'A*') + ' explored <b>' + other.explored + '</b>. Same shortest time (' + main.cost + ' min) - A* just wastes less effort walking away from the goal. On a continent-sized graph that difference is millions of nodes.' });
        return main.frames;
      }
    }],
    examples: [
      { title: 'From latitude/longitude to a tile address', html: `<p>Web maps use the <b>Web Mercator</b> grid. For zoom z there are 2<sup>z</sup> columns. Column <code>x = floor((lng + 180) / 360 × 2<sup>z</sup>)</code>. The row <code>y</code> uses a log-tan formula for latitude, but you can remember: <b>y grows going south</b>.</p>
        ${H.table(['Point', 'Zoom', 'x', 'y', 'Meaning'], [['lng 0°, lat just north of 0°', '1', '1', '0', 'top-right tile of a 2×2 world'], ['lng -122.4° (San Francisco)', '10', 'floor(57.6/360 × 1024) = 163', '≈ 395', 'one tile ≈ 39 km wide'], ['same point', '18', '≈ 41,800', '≈ 101,000', 'one tile ≈ 150 m wide']])}
        <p>The client computes the 12-20 visible tile addresses itself and fetches them in parallel. No server logic is needed for map panning - that is why the CDN does 95%+ of the work.</p>` },
      { title: 'Why not store routes for every pair?', html: `<p>With 500M intersections there are 2.5 × 10<sup>17</sup> possible (start, end) pairs - impossible to precompute. We precompute <i>structure</i> instead (shortcuts), then answer each query quickly. Also we <b>cache popular routes</b> by a rounded key like (start geohash-7, end geohash-7, mode, 5-minute time bucket): airport → downtown is asked thousands of times.</p>` },
      { title: 'Live traffic: from phones to edge weights', html: `<p>1. A phone reports (lat, lng, speed, time) every few seconds (opt-in, anonymised). 2. <b>Map matching</b> snaps the GPS dots onto the most likely road segment (a Hidden-Markov-Model works well because GPS is noisy). 3. A stream job (Kafka + Flink) averages speeds per segment per minute using tumbling windows (see the Ad Click Aggregator topic). 4. The new speed is written to the traffic store; the Route service multiplies <code>segment_length / current_speed</code> to get the edge weight. Segments with no recent probes fall back to historical speed for that hour of the week.</p>`, code: { lang: 'text', title: 'Edge weight rule', code: `travel_time(segment) =
    length / live_speed          if probes in last 5 min >= 3
  | length / historical_speed(hour_of_week)   otherwise` } },
      { title: 'Reading the A* numbers in the visualizer', html: `<p>Run "S T astar" then "S T dijkstra". Dijkstra pops S, A, B, ... almost every node because they are all close in <i>time</i>. A* pops S, C, F, T: C and F lie roughly towards T so their <code>f = g + h</code> is smaller. The path cost is identical (A* with an <b>admissible</b> estimate never gives a worse path); only the effort changes.</p>` }
    ],
    deepDive: `<h4>🟣 Routing at continental scale</h4>
      <p><b>Why plain Dijkstra fails:</b> A cross-country query on a graph with ~10<sup>8</sup> nodes explores tens of millions of nodes - seconds, not milliseconds. With 3K queries/s that is impossible. We need ~1 ms per query.</p>
      <ul>
        <li><b>Bidirectional search:</b> search forward from the start and backward from the goal at the same time; stop when they meet. Two small circles are much smaller than one big circle (area grows with radius squared).</li>
        <li><b>A* with landmarks (ALT):</b> pre-compute exact distances from a few "landmark" nodes; the triangle inequality gives a much tighter lower bound than straight line, so A* is even more focused.</li>
        <li><b>Contraction Hierarchies (CH) - the intuition:</b> rank nodes by "importance" (a quiet side-street intersection is unimportant; a motorway junction is important). Remove ("contract") the least important node first; if the shortest path between two of its neighbours went through it, add a <b>shortcut edge</b> with the combined weight so no distances are lost. Repeat until all are contracted. At query time, run bidirectional Dijkstra but each side may only go <b>"upwards"</b> to more important nodes. The two upward searches meet near the top of the hierarchy (highways). Each side touches only a few hundred nodes → <b>sub-millisecond queries</b> on a continent; the price is hours of preprocessing and about 2x more edges.</li>
        <li><b>The traffic problem:</b> CH weights are baked in. If traffic changes a weight, shortcuts are wrong. Solutions: (a) <b>customisable</b> methods (customizable CH / multi-level partition schemes such as CRP) that split "structure" (slow to build, static) from "weights" (re-applied in seconds); (b) keep CH for the free-flow network and use a small corrective search for the traffic deltas; (c) run the live-traffic layer only on the "important" upper levels.</li>
      </ul>
      <h4>Partitioning the graph</h4>
      <p>One machine cannot hold the world graph and 3K QPS. <b>Partition</b> the graph into regions (cells of ~100K nodes) minimising cut edges (roads that cross region boundaries). Border nodes form a small <b>overlay graph</b>. A route between cities = (start region local route to border) + (overlay route between borders, computed on a graph a thousand times smaller) + (border to destination). Each region fits in one server's RAM; the overlay is replicated everywhere. This is the same idea as an airline "hub": you route by hubs and only look at local detail at both ends.</p>
      <h4>Map data and tile generation</h4>
      <ul>
        <li><b>Vector vs raster tiles:</b> raster tiles are images (heavy, fixed style). Vector tiles send geometry + labels; the client styles them, so rotating and dark mode are smooth and tiles are 5-10x smaller.</li>
        <li><b>Pipeline:</b> raw data (surveys, satellite, user edits, partner data) → conflict resolution and QA → build tiles for every zoom (a huge batch job, e.g. MapReduce/Spark) → versioned bucket <code>v42</code>. New version rolls out by changing a pointer; old clients keep working. Tiles are immutable, so CDN caching is trivially correct (cache-busting by version).</li>
        <li>Lazy rendering: ocean and desert tiles at deep zoom are identical or empty - store one shared "empty" object. Only urban deep-zoom tiles cost real storage.</li>
      </ul>
      <h4>Search and geocoding</h4>
      <p>Place search = text relevance (inverted index, typo-tolerant, tokenised addresses) × proximity (distance from the user) × popularity. The geo part uses a cell id: filter the index by the user's cell and the 8 neighbours first. Geocoding an address ("221B Baker St") runs through an address-normalisation pipeline and an interpolation table (house numbers along a street segment).</p>
      <h4>ETA</h4>
      <p>ETA = sum of (segment length / predicted speed) + turn penalties + signal delays. Predicted speed blends live speed (for the next ~15 minutes) and historical speed for the time you will actually reach that segment (a 90-minute drive passes segments at future times). Modern systems add learned models (graph neural nets on road segments, publicly described by Google/DeepMind in 2020) to cut ETA error.</p>
      <h4>Trade-offs</h4>
      <ul>
        <li>CH: fastest queries, slow rebuild, awkward with traffic - versus A*: slower queries but trivial weight updates.</li>
        <li>Route cache hit rate vs freshness: bucket by 5 minutes.</li>
        <li>Offline maps: ship the graph and tiles for a region to the phone - routing keeps working in a tunnel.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> ETA, "best time to leave", and place ranking are now learned models trained on trillions of probes. Generative AI adds conversational search ("a quiet cafe with outlets on my way home") that is turned into structured filters over the same places index. Image models read street signs and satellite images to extract new roads and house numbers, shrinking the map-data pipeline from weeks to days.</p>
        <p><b>Use AI as a partner:</b> <code>Explain contraction hierarchies using a bus-route analogy, then quiz me with 3 questions</code>; ask it to generate synthetic road graphs and test queries to compare Dijkstra and A* node counts; ask it to review your design for an <i>offline maps</i> feature.</p>
        <p><b>Where AI goes wrong:</b> it often says "just use Dijkstra with a priority queue" for planet-scale routing, mixes up admissible vs consistent heuristics, or says geohash is "the way maps are tiled" (tiles use the z/x/y quadtree address). It may also forget that traffic breaks precomputed shortcuts.</p>
        <p><b>What you must still own:</b> the CDN/tile math (what is cached, what is not), the argument for graph partitioning, and the honest trade-off between query speed and traffic freshness.</p>`,
    problems: [{
      title: 'Route Service for a Whole Continent', level: 'Hard', tags: ['routing', 'dijkstra', 'contraction hierarchies', 'hld'], companies: ['Google', 'Uber', 'Apple', 'HERE'],
      statement: `<p>Design the <b>route computation service</b> of a maps product. A request gives origin, destination and mode; the answer must come back in under 500 ms even for a 3,000 km trip, with 3,000 requests per second at peak. The road graph has 500 million nodes. Traffic speeds change every minute. Explain the algorithm, how the graph is stored and partitioned, and how traffic is handled.</p>`,
      constraints: `500M nodes, 1B edges · p99 &lt; 500 ms · 3K QPS · traffic updates each minute · global coverage.`,
      example: `<p>San Francisco → Los Angeles (≈ 600 km). Plain Dijkstra explores ≈ 30M nodes (seconds). With hierarchy shortcuts each search direction touches about 500 nodes (milliseconds).</p>`,
      brute: { why: `<p>One big Dijkstra over the whole graph on a single server: memory of 20+ GB, and every long query explores a huge circle, around 1-3 s each. At 3K QPS you would need thousands of cores. And a single machine is a single point of failure.</p>` },
      mcq: { q: 'Why can a contraction hierarchy answer a continental query so fast?', options: ['Both searches only climb to more important nodes, so they stay tiny', 'It stores every pair of nodes in a table', 'It ignores one-way streets'], answer: 0, explain: 'Shortcuts preserve distances while removing detail, so each bidirectional search only goes upward and meets near the highway level.' },
      hints: [`<p>The query cost must not depend on how far apart the points are - so you need precomputed structure.</p>`, `<p>Use a hierarchy (contraction hierarchies or multi-level partitions) for the static road structure and keep weights separate from structure.</p>`, `<p>Edge cases: weights change each minute (customisable hierarchy: recompute weights bottom-up in seconds), start/end snapping to the nearest road, one-way streets, turn restrictions, region borders (overlay graph), and a fallback to A* if the hierarchy build is stale.</p>`],
      solution: {
        approach: `<p><b>Offline.</b> Build the road graph from map data, partition it into ~100K-node regions with few cut edges, compute the overlay (border nodes) and a customisable hierarchy of shortcuts. Store each region's slice in RAM on several replicas of a Route-shard server; the small overlay graph is replicated on all shards. A weekly full rebuild takes a few hours and publishes a new graph version (immutable files, blue/green switch).</p>
          <p><b>Online.</b> Route service snaps origin and destination to the nearest road edges using a geo index (S2/geohash cell lookup), finds their regions, then runs a bidirectional upward search on the hierarchy (about 1 ms of CPU). Edge weights come from the in-memory traffic table; when a minute's speeds arrive, the customisation step recomputes shortcut weights bottom-up (seconds) and the shard swaps the weight array atomically. Results are cached by (rounded origin cell, destination cell, mode, 5-minute bucket). The ETA service re-prices the final path with predicted speeds for the time each segment will actually be reached, and attaches alternatives found by penalising edges of the first route.</p>
          <p><b>Failure/scale.</b> Stateless Route servers behind a load balancer routed by region; if a shard dies another replica takes over (graph is read-only, so replicas need no coordination). Fall back to A* on the plain graph if the hierarchy file is unavailable.</p>`,
        complexity: `<p>Query: about O(few hundred) node expansions per direction after preprocessing. Memory: ~2x edges for shortcuts (≈ 40 GB total, split into regions). Preprocessing: hours, parallelisable per region.</p>`,
        followUps: ['How would you add "avoid tolls" without rebuilding the whole hierarchy?', 'How do you route a truck with height restrictions?']
      }
    }]
  });

  /* ================= TOPIC 3: TICKET BOOKING ================= */
  topics.push({
    title: 'Design Ticket Booking (BookMyShow / Ticketmaster): Seat Holds & Flash Sales',
    analogy: `<p>At a cinema box office the clerk has a <b>seating chart</b>. When you say "B2, please", she does not sell it yet - she sticks a <b>yellow note "held for Priya until 7:10"</b> on B2 while you fetch your wallet. Nobody else can pick B2. If you come back in time, the note becomes a sale. If 7:10 passes, the note is peeled off and B2 is free again.</p>
      <p>Online, the yellow note is a <b>hold with a TTL</b> (time-to-live). The hard part is doing this when two million people stare at the same 50,000-seat chart at the same second.</p>`,
    explain: `<p><b>Goal:</b> users browse events, see a seat map, pick seats, pay, and get tickets. The one rule that cannot break: <b>a seat is sold to at most one person</b>. Everything else (seat map being a few seconds stale, a slow page) is forgivable.</p>
      <h4>1. Requirements</h4>
      <ul>
        <li><b>Functional:</b> search/browse events; view seat availability; select 1-8 seats; <b>hold</b> them for about 5-10 minutes; pay; receive e-tickets; cancel/refund; organiser dashboard.</li>
        <li><b>Non-functional:</b> <b>no double booking</b> (strong consistency on the seat); fairness during flash sales; high availability for browsing (eventual consistency is fine for the seat map); survive 100x traffic spikes at on-sale time; payment must be exactly-once from the user's view.</li>
      </ul>
      <h4>2. Estimates (a stadium on-sale)</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Seats for the event', '50,000', '50K rows - tiny'],
        ['People arriving at 10:00:00', '2,000,000 in the first minute', '≈ 33K users/s arriving, each polling the seat map every 2 s → <b>~1M map reads/s</b>'],
        ['Hold attempts', 'maybe 10% of users click a seat per second', '≈ 100K hold attempts/s burst, but only <b>50K can ever succeed</b>'],
        ['Bookings', '50K tickets sold in ~5-10 minutes', '≈ 100-150 bookings/s - low!'],
        ['Total storage', '50K seats × small rows × thousands of events', 'a few GB - one SQL cluster is plenty']
      ])}
      <p>The shape: <b>massive read and contention traffic over a tiny dataset</b>. The trick is to protect the database from the crowd (cache + waiting room) and to make the contended write (the hold) cheap and atomic.</p>
      <h4>3. APIs</h4>
      ${H.table(['Call', 'Notes'], [
        ['<code>GET /v1/events/{id}/seats</code>', 'Seat map with status FREE / HELD / SOLD. Cached for 1-2 s; not authoritative.'],
        ['<code>POST /v1/events/{id}/holds</code> {seat_ids[]}', 'All-or-nothing. Returns <code>hold_id</code> and <code>expires_at</code>, or 409 with the seats that failed.'],
        ['<code>POST /v1/bookings</code> {hold_id, payment_token}', 'Needs <code>Idempotency-Key</code>. Re-checks the hold, charges, marks seats SOLD.'],
        ['<code>DELETE /v1/holds/{id}</code>', 'User changes their mind - release early.']
      ])}
      <h4>4. Data model</h4>
      <ul>
        <li><b>seats</b> <code>(event_id, seat_id, status, hold_id, hold_expires_at, version)</code> - the durable truth in SQL, partitioned by event_id.</li>
        <li><b>holds (fast path)</b> - a Redis key <code>hold:{event}:{seat}</code> → <code>hold_id</code> with <code>EX 600</code>; this is what makes a hold O(1) and self-expiring.</li>
        <li><b>bookings</b> <code>(booking_id, user_id, event_id, seat_ids, amount, payment_id, status)</code> with a unique idempotency key.</li>
      </ul>
      <h4>5. High-level architecture</h4>
      <ol>
        <li>Event pages, images, seat-map layout: static → <b>CDN</b>.</li>
        <li>Flash sale: users enter a <b>virtual waiting room</b> (queue service) and are admitted at a rate the backend can take.</li>
        <li>Admitted users call the <b>Inventory service</b>: a hold = atomic <code>SET NX EX</code> in Redis for every chosen seat (Lua script, all-or-nothing) and an async/synchronous write of the hold to the DB.</li>
        <li><b>Booking service</b> calls Payments (previous topic) with an idempotency key; on success a DB transaction flips seats HELD → SOLD and deletes the Redis keys.</li>
        <li>Events → Kafka → ticket generation, email/push, analytics.</li>
      </ol>
      <h4>6. The hold as a tiny state machine 🔵</h4>
      <p>Each seat is in one of three states: <span class="c-g"><b>FREE</b></span> → <span class="c-p"><b>HELD</b></span> (by one user, until a deadline) → <span class="c-b"><b>SOLD</b></span>. HELD can go back to FREE by <b>timeout</b> or <b>cancel</b>. The visualizer below plays a little story: user U1 holds B2, U2 collides, U1 pays late or on time (you choose with the inputs), and U2 retries.</p>`,
    clues: [
      '"two users must never book the same seat" → atomic compare-and-set, unique constraint, or conditional UPDATE (<code>WHERE status=\'FREE\'</code>)',
      '"hold seats for 10 minutes while the user pays" → <b>TTL hold</b> (Redis key with EXPIRE, or an expiry column + sweeper)',
      '"1M users hit the site when tickets go on sale" → <b>virtual waiting room</b>, CDN for static, cache the seat map, rate-limit per user',
      '"user pays after the hold expired" → re-validate the hold at confirm time, refund or re-acquire',
      '"select multiple seats, all or none" → atomic multi-key script, sorted lock order to avoid deadlock',
      '"fairness / bots / scalpers" → queue tokens, CAPTCHA, per-account limits, device fingerprinting'
    ],
    code: [{
      lang: 'python', run: true, title: 'Seat inventory with all-or-nothing TTL holds (runnable)',
      code: `# Seat inventory with TTL holds. The clock is injected so we can "travel in time" in the demo.
class SeatInventory:
    def __init__(self, seats, hold_seconds, clock):
        self.status = {s: "FREE" for s in seats}   # FREE or SOLD (durable truth)
        self.holds = {}                             # seat -> (owner, expires_at); a Redis key with EXPIRE
        self.ttl, self.clock = hold_seconds, clock

    def _expire(self):
        now = self.clock()
        for seat, (_, exp) in list(self.holds.items()):
            if exp <= now:
                del self.holds[seat]               # Redis does this for us when the TTL runs out

    def hold(self, user, seats):
        """All-or-nothing: either every seat is held for the user, or none."""
        self._expire()
        wanted = sorted(set(seats))                # fixed order avoids deadlocks in the real, locking version
        for s in wanted:
            if self.status.get(s) != "FREE" or s in self.holds:
                return False
        exp = self.clock() + self.ttl
        for s in wanted:
            self.holds[s] = (user, exp)
        return True

    def book(self, user, seats):
        """Turn holds into sales only if THIS user still owns every hold (checked at payment time)."""
        self._expire()
        for s in seats:
            owner = self.holds.get(s, (None, 0))[0]
            if owner != user:
                return False                       # hold expired or belongs to someone else
        for s in seats:
            self.status[s] = "SOLD"
            del self.holds[s]
        return True

now = [0]
inv = SeatInventory(["A1", "A2", "B1", "B2"], hold_seconds=5, clock=lambda: now[0])
print("u1 holds A1,A2:", inv.hold("u1", ["A1", "A2"]))
print("u2 holds A2,B1 (A2 taken -> nothing held):", inv.hold("u2", ["A2", "B1"]))
now[0] = 3
print("u1 pays at t=3:", inv.book("u1", ["A1", "A2"]))
print("u2 holds B1,B2:", inv.hold("u2", ["B1", "B2"]))
now[0] = 9
print("u2 pays at t=9 (hold expired at 8):", inv.book("u2", ["B1", "B2"]))
print("final:", inv.status)
`
    }],
    codeTitle: ['Seat holds with a TTL (Python, injected clock)'],
    viz: {
      title: 'Seat hold lifecycle: hold, collide, expire, retry',
      input: 'ttl=4 pay=6',
      inputLabel: 'ttl = hold length in ticks (2-8), pay = tick when U1 pays (1-9)',
      gen: function (input) {
        var kv = {}; String(input).trim().split(/[\s,]+/).forEach(function (tok) { var p = tok.split('='); if (p.length === 2) kv[p[0].toLowerCase()] = Number(p[1]); });
        var ttl = kv.ttl === undefined ? 4 : kv.ttl, pay = kv.pay === undefined ? 6 : kv.pay;
        if (!(ttl >= 2 && ttl <= 8) || !(pay >= 1 && pay <= 9) || ttl !== Math.floor(ttl) || pay !== Math.floor(pay)) throw new Error('Use whole numbers: ttl=2..8 pay=1..9, e.g. ttl=4 pay=6');
        var rows = ['A', 'B', 'C'], cols = 5;
        var st = {}; rows.forEach(function (r) { for (var c = 1; c <= cols; c++) st[r + c] = { s: 'free', o: '' }; });
        st.A1.s = 'sold'; st.A2.s = 'sold'; st.C5.s = 'sold';
        var holdUntil = {}, frames = [], now = 0, tag = {};
        var ev = [{ t: 0, k: 'hold1' }, { t: 1, k: 'try2' }, { t: 2, k: 'hold2' }, { t: 3, k: 'pay2' }];
        if (pay >= ttl) ev.push({ t: ttl, k: 'expire' });
        ev.push({ t: pay, k: 'pay1' }); ev.push({ t: 7, k: 'retry2' });
        ev.forEach(function (e, i) { e.i = i; });
        ev.sort(function (a, b) { return a.t - b.t || a.i - b.i; });
        function cell(id) { var x = st[id]; return x.s === 'free' ? 'free' : x.s === 'sold' ? 'SOLD' : x.o + ' ⏳'; }
        function snap(narr, bad, extra) {
          var g = rows.map(function (r) { var row = []; for (var c = 1; c <= cols; c++) row.push(cell(r + c)); return row; }), hl = {};
          rows.forEach(function (r, ri) { for (var c = 1; c <= cols; c++) { var x = st[r + c]; if (x.s === 'held') hl[ri + ',' + (c - 1)] = 'sel'; else if (x.s === 'sold' && x.o) hl[ri + ',' + (c - 1)] = 'ok'; else if (x.s === 'sold') hl[ri + ',' + (c - 1)] = 'done'; } });
          if (bad) { var ri2 = rows.indexOf(bad.charAt(0)), ci2 = Number(bad.slice(1)) - 1; hl[ri2 + ',' + ci2] = 'bad'; }
          var keys = {}; Object.keys(holdUntil).forEach(function (s) { keys['hold:' + s] = st[s].o + ' (expires t=' + holdUntil[s] + ')'; });
          var vals = { clock: 't=' + now, 'hold length (ttl)': ttl }; if (!Object.keys(keys).length) keys['redis keys'] = '(none)'; Object.keys(keys).forEach(function (k) { vals[k] = keys[k]; });
          return { narr: narr, parts: [{ type: 'grid', label: 'Seat map: free / U1,U2 ⏳ = held (purple) / SOLD (green = just sold, faded = sold earlier)', rows: g, rowHead: rows, colHead: ['1', '2', '3', '4', '5'], hl: hl }, { type: 'vars', vals: vals, hl: extra || {} }] };
        }
        frames.push(snap('Seat map of a tiny hall. A1, A2 and C5 are already sold. Two shoppers, <b>U1</b> and <b>U2</b>, want seats. Holds last <b>' + ttl + '</b> ticks; U1 will try to pay at tick <b>' + pay + '</b>.', null));
        ev.forEach(function (e) {
          now = e.t; var bad = null, msg, ex = {};
          if (e.k === 'hold1') { st.B2 = { s: 'held', o: 'U1' }; holdUntil.B2 = now + ttl; msg = '<b>t=' + now + '</b> U1 clicks B2. Server runs <code>SET hold:B2 U1 NX EX ' + ttl + '</code> → <span class="c-g">OK</span>. B2 is now held; the key will delete itself at t=' + (now + ttl) + '.'; }
          else if (e.k === 'try2') { bad = 'B2'; msg = '<b>t=' + now + '</b> U2 also clicks B2. <code>SET ... NX</code> returns <span class="c-r">nil</span> because the key exists → <b>409 Conflict</b>. Atomic "set if not exists" is what stops the double booking, with no locks held.'; }
          else if (e.k === 'hold2') { st.B4 = { s: 'held', o: 'U2' }; holdUntil.B4 = now + ttl; msg = '<b>t=' + now + '</b> U2 picks B4 instead → hold granted until t=' + (now + ttl) + '.'; }
          else if (e.k === 'pay2') { st.B4 = { s: 'sold', o: 'U2' }; delete holdUntil.B4; msg = '<b>t=' + now + '</b> U2 pays in time. Booking service re-checks the hold, charges the card, and in one DB transaction sets B4 → <b>SOLD</b> and deletes the hold key.'; }
          else if (e.k === 'expire') { st.B2 = { s: 'free', o: '' }; delete holdUntil.B2; msg = '<b>t=' + now + '</b> U1 has not paid and the TTL ran out. Redis removes <code>hold:B2</code> by itself - no cron job needed - and B2 is <span class="c-g">FREE</span> again for anyone.'; ex = { clock: 'cur' }; }
          else if (e.k === 'pay1') {
            if (pay < ttl) { st.B2 = { s: 'sold', o: 'U1' }; delete holdUntil.B2; msg = '<b>t=' + now + '</b> U1 pays while the hold is still alive → <span class="c-g">booking confirmed</span>, B2 is SOLD.'; }
            else { bad = 'B2'; msg = '<b>t=' + now + '</b> U1\'s payment arrives <b>after</b> the hold expired. The confirm step does a conditional update (<code>WHERE hold_id = U1</code>) → 0 rows → <span class="c-r">fail</span>. The charge is voided/refunded automatically. Lesson: always re-check the hold at confirm time.'; }
          }
          else if (e.k === 'retry2') {
            if (st.B2.s === 'free') { st.B2 = { s: 'held', o: 'U2' }; holdUntil.B2 = now + ttl; msg = '<b>t=' + now + '</b> U2 retries B2: the old hold is gone → <span class="c-g">hold granted</span> to U2 until t=' + (now + ttl) + '.'; }
            else { bad = 'B2'; msg = '<b>t=' + now + '</b> U2 retries B2 but it is ' + (st.B2.s === 'sold' ? '<b>SOLD</b> to U1' : 'still <b>held</b> by U1') + ' → <span class="c-r">rejected</span>. U2 should refresh the seat map.'; }
          }
          frames.push(snap(msg, bad, ex));
        });
        frames.push(snap('End of the story. Notice: all conflicts were resolved by one atomic operation per seat, and every hold either became a sale or disappeared by itself. The seat map shown to users can be a second or two stale; the <b>hold/confirm path is the single source of truth</b>.', null));
        return frames;
      }
    },
    examples: [
      { title: 'Why SELECT-then-UPDATE is a bug', html: `<p>Two requests run at the same time. Both <code>SELECT status FROM seats WHERE seat='B2'</code> and both see FREE. Both then run <code>UPDATE ... SET status='HELD'</code>. Both think they won - a <b>race condition</b>. The fix is to make "check + change" one atomic statement:</p>`, code: { lang: 'sql', title: 'Atomic conditional update (the row count tells who won)', check: false, code: `UPDATE seats
   SET status = 'HELD', hold_id = :hold, hold_expires_at = now() + interval '10 minutes'
 WHERE event_id = :event AND seat_id = :seat
   AND (status = 'FREE' OR (status = 'HELD' AND hold_expires_at < now()));
-- rows_affected = 1 -> you won the seat; 0 -> someone else did` } },
      { title: 'Holding 3 seats together - all or nothing', html: `<p>A family wants A5, A6, A7. If we hold A5 and A6 but A7 fails, we must release A5 and A6 (otherwise they are blocked for 10 minutes for nothing). A Redis Lua script runs atomically: check all three keys are absent, then set all three. Sorting seat ids first means two overlapping requests always try seats in the same order, so they cannot deadlock each other (the classic dining-philosophers trap).</p>${H.table(['Request', 'Seats (sorted)', 'Result'], [['R1', 'A5 A6 A7', '<span class="c-g">all 3 held</span>'], ['R2 (same time)', 'A6 A7 A8', '<span class="c-r">rejected - A6 and A7 taken, A8 is untouched</span>']])}` },
      { title: 'The waiting room in numbers', html: `<p>The inventory can safely process about 2,000 hold attempts per second. 2 million people arrive. If we let everyone in, almost every request fails and the database melts. Instead the waiting room hands out <b>queue positions</b> (random draw or first-come) and admits <b>2,000 users/s</b> with signed tokens. Person #1,000,000 waits about 500 seconds. That feels fair and predictable, while the backend runs at a calm, constant load.</p>` },
      { title: 'Payment arrives after expiry', html: `<p>Real timeline: the user starts card entry at t=9:30 with a 10-minute hold, 3-D Secure takes 90 seconds, so confirm arrives at t=11:00. Options: (1) <b>extend the hold</b> by 3 minutes once payment starts (state HELD → PAYMENT_PENDING); (2) at confirm, if the seat is still free re-acquire it; (3) otherwise refund. Option 1 is the most user-friendly and common.</p>` }
    ],
    deepDive: `<h4>🟣 Three ways to guarantee "one owner per seat"</h4>
      ${H.table(['Approach', 'How', 'Good', 'Watch out'], [
        ['<b>Pessimistic lock</b>', '<code>SELECT ... FOR UPDATE</code> (or <code>SKIP LOCKED</code>) inside a DB transaction', 'Simple, correct', 'Holds a row lock while you talk to the user/payment - never hold DB locks across a network call to the user. Fine for ms-long operations only.'],
        ['<b>Optimistic (version / conditional update)</b>', '<code>UPDATE ... WHERE status=FREE</code> or <code>WHERE version=7</code>; check rows affected', 'No waiting; excellent when conflicts are rare', 'Under a hot sale many updates fail and clients must retry - wasted work, but DB stays consistent.'],
        ['<b>Distributed TTL lock in Redis</b>', '<code>SET key owner NX EX ttl</code> per seat (Lua for many)', 'O(1), self-expiring, can absorb 100K attempts/s', 'Redis is not the durable truth: confirm in the DB; use <b>fencing</b> (hold_id) so a stale owner cannot confirm.']
      ])}
      <p><b>Combine them:</b> Redis TTL keys absorb the hot, contended hold attempts (cheap), the SQL row with a conditional update is the final arbiter at confirm (durable). If Redis loses a key (failover) the worst case is that a seat looks free for a moment; the DB conditional update at confirm still prevents a double sale.</p>
      <h4>Expiry: how holds disappear</h4>
      <ul>
        <li><b>Lazy expiry:</b> treat <code>hold_expires_at &lt; now()</code> as FREE whenever you read. No background job needed for correctness (the SQL above does this).</li>
        <li><b>Active expiry:</b> Redis TTL deletes keys; a sweeper (or Redis keyspace notification / a delay queue) marks DB rows FREE and updates the seat map. Needed only so the <i>displayed</i> map refreshes quickly.</li>
        <li><b>Clock trouble:</b> use the database / Redis server time, never the client's clock, and add a small grace so a payment finishing at the last second is not punished.</li>
      </ul>
      <h4>Scaling the hot event</h4>
      <ul>
        <li><b>Partition by event_id.</b> A single mega-event is a single hot partition. Options: a dedicated shard/cluster for that event, or a <b>single-writer actor</b> per event (all holds for the event go to one in-memory process via a queue; it serialises decisions at 100K+/s with no lock contention and persists decisions to a log).</li>
        <li><b>Seat-map reads:</b> serve from a cache/CDN refreshed every 1-2 s, or push updates (WebSocket/SSE diffs) so clients do not poll. Eventual consistency is fine because the hold call re-validates.</li>
        <li><b>Sections / general admission:</b> if tickets are not seat-specific, hold a <i>count</i> per section with an atomic decrement (<code>DECR</code> with a floor check) - far cheaper than per-seat keys.</li>
        <li><b>Backpressure:</b> reject early with a friendly "Sold out / try again" at the edge once inventory counters hit 0, so doomed requests never reach the database.</li>
      </ul>
      <h4>Payment integration and failure modes</h4>
      <ul>
        <li>Use a <b>saga</b>: hold → charge → confirm. If charge succeeds but confirm fails (DB down), a compensating action (refund) or a retry via the outbox runs; use the booking's idempotency key so retries cannot double charge (see the Payments topic).</li>
        <li><b>Zombie holds:</b> app crashes mid-checkout - TTL cleans up automatically, which is exactly why we prefer TTL over "release on logout".</li>
        <li><b>Overselling on purpose:</b> airlines oversell and bump; concerts must not. Say which business you are in.</li>
      </ul>
      <h4>Fairness and abuse</h4>
      <p>Bots grab seats in milliseconds. Defences: signed queue tokens (one per verified account/device), CAPTCHA/proof-of-work at admission, per-account limits (max 6 tickets), hold-then-release limits (users who repeatedly hold and abandon are slowed), and delayed resale. These are policy trade-offs: stricter = fewer scalpers but more friction.</p>
      <h4>Trade-offs to say out loud</h4>
      <ul><li>Longer hold = fewer abandoned checkouts but more "phantom sold-out"; shorter = faster turnover but more payment-after-expiry pain.</li><li>Strict consistency on holds costs throughput on one hot partition; solved by waiting room + single-writer.</li><li>A stale seat map causes a few failed clicks; a locked seat map would cause an outage - choose staleness.</li></ul>`,
    aiEra: `<p><b>What AI changes:</b> Dynamic pricing models set ticket prices from demand forecasts; anomaly models spot bot traffic (superhuman click speed, shared device fingerprints); recommendation engines fill the unsold seats after the rush. Generative AI customer support handles refunds and transfers. The seat-locking core remains plain, deterministic code - nobody wants a probabilistic seat sale.</p>
        <p><b>Use AI as a partner:</b> <code>Write a Jepsen-style test plan for a seat-hold service with Redis TTL and a SQL source of truth</code>; ask for 10 race conditions in "hold, pay, expire" and which one your design misses; have it generate load-test scripts for the waiting room.</p>
        <p><b>Where AI goes wrong:</b> it often recommends <code>SELECT FOR UPDATE</code> for the whole checkout (locks held while the user types card details), forgets to re-validate the hold at confirm time, or suggests a distributed lock "with Redlock" as if it were a perfect guarantee. It also loves to cache the seat map and then treat the cache as the truth.</p>
        <p><b>What you must still own:</b> the invariant (one owner per seat), where it is enforced, and what happens at each failure edge (late payment, Redis failover, duplicate submit).</p>`,
    problems: [{
      title: 'Flash Sale: 50,000 Seats, 2 Million Users', level: 'Hard', tags: ['concurrency', 'ttl', 'queue', 'hld'], companies: ['Ticketmaster', 'BookMyShow', 'StubHub', 'Amazon'],
      statement: `<p>A superstar concert goes on sale at 10:00:00 for 50,000 seats. About 2 million people open the page within a minute. Design the booking flow: seat map, seat selection, hold, payment, confirmation. No seat may be sold twice, the site must not fall over, and the experience should feel fair.</p>`,
      constraints: `50K seats · 2M concurrent users · ~1M seat-map reads/s · ~100K hold attempts/s · holds last 10 min · payments take 2-90 s · no double booking.`,
      example: `<p>Seat B2: U1 holds at 10:00:01, U2 collides at 10:00:02 (<span class="c-r">409</span>). U1 abandons; at 10:10:01 the hold expires; U2 retries and wins the hold.</p>`,
      brute: { why: `<p>Everyone hits the SQL database directly: read the seat map, <code>SELECT FOR UPDATE</code>, wait for payment while holding the lock. 2M users produce millions of reads and lock waits; a single abandoned checkout blocks a seat row for minutes; connection pool exhaustion takes the whole site down, including users who are not even buying.</p>` },
      mcq: { q: 'What is the best place to absorb 100K contended hold attempts per second?', options: ['An in-memory store with atomic SET NX EX, behind a waiting room', 'Row locks held in SQL for the whole checkout', 'The client browser'], answer: 0, explain: 'In-memory atomic operations are O(1) and self-expiring; the waiting room keeps the load predictable; SQL remains the durable truth at confirm time.' },
      hints: [`<p>Separate three traffic types: static content, seat-map reads, and contended writes (holds).</p>`, `<p>CDN + short-TTL cache for reads; a waiting room to meter writes; Redis TTL holds for contention; SQL conditional update for the final sale.</p>`, `<p>Edge cases: multi-seat all-or-nothing, payment after expiry (extend hold during payment), Redis failover (SQL arbitrates), duplicate submit (idempotency key), bots (tokens/CAPTCHA), abandoned carts (TTL), refunds on compensation.</p>`],
      solution: {
        approach: `<p><b>Read path.</b> Event page and seat-map geometry are static on a CDN. Seat availability is a small JSON (50K seats → ~100 KB, or a compressed bitmap of 6 KB) refreshed every 1-2 seconds by a cache; clients poll it or get diffs over SSE. Staleness is acceptable because the hold re-validates.</p>
          <p><b>Admission.</b> A virtual waiting room assigns each visitor a random queue position and releases users at about 2,000/s with signed, short-lived tokens. Per-account limits and CAPTCHA keep bots out. This keeps the hold rate within what the inventory shard handles.</p>
          <p><b>Hold.</b> The Inventory service (sharded by event_id; the hot event gets its own shard) runs a Lua script on Redis: for the sorted seat list, if every <code>hold:{event}:{seat}</code> is absent set all with <code>EX 600</code> and the hold_id, else return the conflicting seats. The hold is also recorded in SQL (seats row status=HELD, hold_id, expires_at) so truth survives a Redis failover.</p>
          <p><b>Pay and confirm.</b> The Booking service calls the Payment service with an idempotency key. When payment starts, extend the hold by 3 minutes. On success, one SQL transaction runs the conditional update <code>WHERE hold_id = :h AND status = 'HELD'</code> for all seats, inserts the booking, writes an outbox row, and commits; then Redis keys are deleted. If the conditional update affects fewer rows than seats (hold lost), the payment is refunded through the saga. Tickets and emails are generated asynchronously from Kafka.</p>
          <p><b>Failure handling.</b> TTL cleans abandoned holds; lazy expiry in SQL makes correctness independent of sweepers; reconciliation compares payments to bookings nightly.</p>`,
        complexity: `<p>Hold: O(seats requested) atomic operations. Confirm: one transaction touching ≤ 8 rows. Memory: 50K Redis keys at peak - trivial. The scarce resource is attention, not storage.</p>`,
        followUps: ['How would you design the "best available" seat picker for a group of 4?', 'How do you release seats after a refund and avoid scalper bots buying them instantly?']
      }
    }]
  });

  /* ================= TOPIC 4: PAYMENTS ================= */
  topics.push({
    title: 'Design a Payment System: Idempotency Keys & Double-Entry Ledgers',
    analogy: `<p>Two ideas from the old paper world:</p>
      <ul>
        <li><b>The numbered receipt book.</b> You hand the shop clerk a form numbered <b>#4711</b>. If you hand the same form again (the clerk was not sure you had paid), she sees "#4711 already processed" and gives you the same receipt - she does <i>not</i> charge you twice. That is an <b>idempotency key</b>.</li>
        <li><b>The accountant's notebook with two columns.</b> Every time money moves, she writes it <b>twice</b>: once in the "from" column, once in the "to" column, and the two columns must add up to the same total. She never erases; to fix a mistake she writes a new line that cancels the old one. That is a <b>double-entry ledger</b>.</li>
      </ul>`,
    explain: `<p><b>Goal:</b> let customers pay merchants (cards, wallets, bank transfers), pay out merchants, support refunds, and be able to explain <b>every cent</b> at any time. In payments, <b>correctness and auditability beat speed</b>: a slow payment is a nuisance, a double charge is a headline.</p>
      <h4>1. Requirements</h4>
      <ul>
        <li><b>Functional:</b> create a payment (authorise + capture), get status, refund (full/partial), payout to merchants, webhooks to merchants, daily reconciliation with banks/card networks, reports.</li>
        <li><b>Non-functional:</b> <b>never charge twice, never lose a payment</b> (exactly-once <i>effect</i>), strong consistency for money, full audit trail (immutable), high availability of the pay API, security/compliance (PCI-DSS: never store raw card numbers), tolerate slow/failing external providers.</li>
      </ul>
      <h4>2. Estimates</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Payments', '10M/day, peak 10x average', '≈ 115/s average, <b>~1,200/s peak</b>'],
        ['Ledger rows', '3-4 entries per payment', '≈ 35M rows/day × 200 B ≈ 7 GB/day ≈ <b>2.5 TB/year</b>'],
        ['Idempotency keys', 'one per request, kept 24 h-30 days', '10M × 300 B = 3 GB/day'],
        ['External PSP latency', 'card network 300 ms - 3 s, sometimes timeouts', 'must be async-tolerant']
      ])}
      <p>The traffic is modest. The difficulty is <b>failure handling</b>: networks time out, services crash mid-way, providers answer twice. Design for the unhappy path.</p>
      <h4>3. APIs</h4>
      ${H.table(['Call', 'Notes'], [
        ['<code>POST /v1/payments</code> {amount, currency, source_token, merchant_id}<br><code>Idempotency-Key: 7c9e…</code>', 'The key is generated by the client (a UUID) <b>once per user intent</b> and re-sent on every retry.'],
        ['<code>GET /v1/payments/{id}</code>', 'State: CREATED, AUTHORIZED, CAPTURED, FAILED, REFUNDED …'],
        ['<code>POST /v1/payments/{id}/refunds</code>', 'Also idempotent; creates reversing ledger entries.'],
        ['Webhook <code>payment.succeeded</code> to merchants', 'At-least-once with signatures and retries; merchants dedupe by event id.']
      ])}
      <h4>4. Data model</h4>
      <ul>
        <li><b>payments</b> <code>(id, merchant_id, amount_minor, currency, state, psp_ref, created_at)</code>. Money is stored as an <b>integer in minor units</b> (cents) plus a currency - never a float.</li>
        <li><b>idempotency_keys</b> <code>(key PRIMARY KEY, request_hash, state, response_body, created_at)</code>. The unique key is the lock.</li>
        <li><b>ledger_entries</b> <code>(entry_id, txn_id, account_id, debit, credit, created_at)</code> - append-only. Invariant: for every <code>txn_id</code>, sum(debit) = sum(credit).</li>
        <li><b>accounts</b> (customer clearing, merchant payable, platform revenue, PSP receivable …); <b>balances</b> are derived from entries (and cached/materialised for speed).</li>
        <li><b>outbox</b> <code>(event_id, topic, payload, published)</code> - events written in the same DB transaction as the money change.</li>
      </ul>
      <h4>5. High-level architecture</h4>
      <ol>
        <li>Client → API gateway (auth, rate limit) → <b>Payment service</b>.</li>
        <li>Payment service inserts the idempotency key; if it already exists, it returns the stored result (or "in progress").</li>
        <li>It calls the <b>PSP / acquirer</b> (Stripe, Adyen, a bank) over a timeout-protected client, passing the <i>same</i> idempotency key downstream.</li>
        <li>On a result it opens <b>one DB transaction</b>: update payment state, insert ledger entries, mark the key COMPLETED with the response, insert an outbox row.</li>
        <li>A relay publishes outbox rows to <b>Kafka</b> → webhooks, notifications, analytics. A nightly <b>reconciliation</b> job compares our ledger with PSP settlement files.</li>
      </ol>
      <h4>6. Idempotency in one picture 🔵</h4>
      <p>A request can fail in an annoying way: the money moved but the <i>response</i> was lost. The client cannot tell success from failure, so it retries. Without a key the retry is a brand-new payment. With a key, the server notices "I have seen K1" and replays the saved answer. The visualizer below follows exactly this story with a real ledger table, then a refund that cancels it with <b>new</b> reversing lines.</p>`,
    clues: [
      '"retries must not charge twice" / "network timeout, unknown outcome" → <b>idempotency key</b> + stored response',
      '"track every cent / audit / explain the balance" → <b>double-entry, append-only ledger</b>; balances are derived',
      '"exactly-once" → impossible over a network; build <b>at-least-once delivery + idempotent processing</b>',
      '"call to the bank times out" → state UNKNOWN → query the provider by the same key / reconcile, never blindly retry as new',
      '"update DB and publish an event atomically" → <b>transactional outbox</b>',
      '"refund / chargeback / correction" → never UPDATE or DELETE history; write <b>reversing entries</b>'
    ],
    code: [{
      lang: 'java', title: 'Idempotent charge + double-entry ledger (Java, compiles; run the main method to see it)',
      code: `
import java.util.*;

/** Idempotent payment handler with a double-entry ledger (in-memory stand-in for a SQL transaction). */
public class PaymentDemo {
    /** One ledger line. Amounts are whole cents (long), never double. */
    record Entry(long id, String txn, String account, long debit, long credit) {}

    /** What we remember about each Idempotency-Key. */
    static class KeyRecord {
        final String requestHash;       // fingerprint of the request body
        String state = "IN_PROGRESS";   // IN_PROGRESS -> COMPLETED
        String response;                // saved answer, replayed on retries
        KeyRecord(String requestHash) { this.requestHash = requestHash; }
    }

    static class PaymentService {
        private final Map<String, KeyRecord> keys = new HashMap<>();
        private final List<Entry> ledger = new ArrayList<>();
        private long nextEntryId = 1;
        int pspCalls = 0;                // how many times we really talked to the card network

        /** Everything inside this method is one DB transaction in production (synchronized here). */
        synchronized String charge(String idemKey, String merchant, long amountCents, int feeBps) {
            String hash = merchant + "|" + amountCents + "|" + feeBps;
            KeyRecord rec = keys.get(idemKey);
            if (rec != null) {
                if (!rec.requestHash.equals(hash)) {
                    return "422 key reused with a different request";   // client bug, refuse loudly
                }
                if (rec.state.equals("IN_PROGRESS")) {
                    return "409 request still in progress, retry shortly";
                }
                return rec.response + " (replayed)";                      // same key + same body: same answer
            }
            keys.put(idemKey, new KeyRecord(hash));                      // unique-key insert wins the race

            pspCalls++;                                                    // call the card network exactly once
            long fee = amountCents * feeBps / 10_000;
            long toMerchant = amountCents - fee;
            String txn = "txn_" + idemKey;

            // Double entry: debits must equal credits. Both sides are written together.
            ledger.add(new Entry(nextEntryId++, txn, "card_clearing", amountCents, 0));
            ledger.add(new Entry(nextEntryId++, txn, "payable:" + merchant, 0, toMerchant));
            ledger.add(new Entry(nextEntryId++, txn, "revenue:fees", 0, fee));

            KeyRecord done = keys.get(idemKey);
            done.state = "COMPLETED";
            done.response = "200 paid " + amountCents + " cents, merchant gets " + toMerchant;
            return done.response;
        }

        synchronized long balanceCheck() {
            long d = 0, c = 0;
            for (Entry e : ledger) { d += e.debit(); c += e.credit(); }
            return d - c;                // must always be 0
        }
        synchronized int entries() { return ledger.size(); }
    }

    public static void main(String[] args) {
        PaymentService svc = new PaymentService();
        System.out.println(svc.charge("k-1001", "shop42", 10_000, 300));
        System.out.println(svc.charge("k-1001", "shop42", 10_000, 300));   // network retry
        System.out.println(svc.charge("k-1001", "shop42", 99_999, 300));   // bug: same key, different body
        System.out.println("PSP calls = " + svc.pspCalls + ", ledger rows = " + svc.entries() + ", debits - credits = " + svc.balanceCheck());
    }
}
`
    }],
    codeTitle: ['Idempotent payment handler and ledger (Java)'],
    viz: {
      title: 'One payment: idempotent retries and a double-entry ledger',
      input: '100 3 2',
      inputLabel: 'amount in dollars, fee percent, number of client retries (0-3)',
      gen: function (input) {
        var t = String(input).trim().split(/[\s,]+/).map(Number);
        if (t.length < 2 || t.some(isNaN)) throw new Error('Enter: amount feePercent [retries], e.g. 100 3 2');
        var amt = Math.round(t[0] * 100), pct = t[1], retries = t.length > 2 ? Math.round(t[2]) : 2;
        if (!(amt >= 100 && amt <= 1000000) || !(pct >= 0 && pct <= 20) || !(retries >= 0 && retries <= 3)) throw new Error('Amount 1..10000 dollars, fee 0..20 percent, retries 0..3');
        var fee = Math.round(amt * pct / 100), net = amt - fee;
        var cols = ['entry', 'txn', 'account', 'debit', 'credit'], ledger = [], idem = [], frames = [], eid = 1;
        var icols = ['key', 'request hash', 'state', 'saved response'];
        function sums() { var d = 0, c = 0; ledger.forEach(function (r) { d += r.d; c += r.c; }); return [d, c]; }
        function rowsL() { return ledger.map(function (r) { return [r.id, r.txn, r.acc, r.d ? money(r.d) : '', r.c ? money(r.c) : '']; }); }
        function snap(narr, lhl, ihl, extra) {
          var s = sums(), parts = [
            { type: 'table', label: 'idempotency_keys', columns: icols, rows: idem.length ? idem.map(function (r) { return r.slice(); }) : [['-', '-', '-', '-']], hl: ihl || {} },
            { type: 'table', label: 'ledger_entries (append-only)', columns: cols, rows: ledger.length ? rowsL() : [['-', '-', '-', '-', '-']], hl: lhl || {} },
            { type: 'vars', vals: { 'total debits': money(s[0]), 'total credits': money(s[1]), 'balanced?': s[0] === s[1] ? 'YES' : 'not yet (mid-transaction)', 'PSP charges made': extra && extra.psp !== undefined ? extra.psp : 0 }, hl: { 'balanced?': s[0] === s[1] ? 'ok' : 'bad' } }
          ];
          return { narr: narr, parts: parts };
        }
        var psp = 0;
        idem.push(['K1', 'h(' + money(amt) + ', shop42)', 'IN_PROGRESS', '-']);
        frames.push(snap('Client sends <code>POST /payments</code> for <b>' + money(amt) + '</b> with <code>Idempotency-Key: K1</code>. The server <b>inserts K1 first</b> (primary key = lock). If a second request with K1 arrives now, it cannot insert again.', {}, { 0: 'cur' }, { psp: psp }));
        psp = 1;
        frames.push(snap('Server calls the card network (passing K1 downstream too). It answers <b>captured</b>. Money has moved in the real world - now we must <b>record</b> it. We open one database transaction and write the ledger lines.', {}, { 0: 'cur' }, { psp: psp }));
        ledger.push({ id: eid++, txn: 'T1', acc: 'card_clearing (asset)', d: amt, c: 0 });
        frames.push(snap('Ledger line 1 (<b>debit</b>): the platform now holds <b>' + money(amt) + '</b> at the card network. Debits and credits do not match yet - we are mid-transaction, so nothing is visible to readers.', { 0: 'ok' }, { 0: 'cur' }, { psp: psp }));
        ledger.push({ id: eid++, txn: 'T1', acc: 'merchant_payable (liability)', d: 0, c: net });
        frames.push(snap('Line 2 (<b>credit</b>): we owe the merchant <b>' + money(net) + '</b>.', { 1: 'ok' }, { 0: 'cur' }, { psp: psp }));
        ledger.push({ id: eid++, txn: 'T1', acc: 'fee_revenue (income)', d: 0, c: fee });
        frames.push(snap('Line 3 (<b>credit</b>): our fee income is <b>' + money(fee) + '</b>. Now debits = credits = ' + money(amt) + ' → the transaction is <b>balanced</b>. If it were not, the commit would be rejected.', { 2: 'ok' }, { 0: 'cur' }, { psp: psp }));
        idem[0] = ['K1', 'h(' + money(amt) + ', shop42)', 'COMPLETED', '200 paid ' + money(amt)];
        frames.push(snap('COMMIT. In the same transaction the key row becomes <b>COMPLETED</b> with the response saved. Then the response travels back to the client... <span class="c-r">but the network drops it.</span> The client sees a timeout and does not know if it was charged.', { 0: 'done', 1: 'done', 2: 'done' }, { 0: 'ok' }, { psp: psp }));
        for (var r = 1; r <= retries; r++) {
          frames.push(snap('<b>Retry #' + r + '</b> with the <b>same</b> key K1. The server looks it up: state COMPLETED → returns the <b>saved response</b> (200 paid ' + money(amt) + '). <span class="c-g">No card call, no new ledger lines</span> - the retry is harmless.', { 0: 'done', 1: 'done', 2: 'done' }, { 0: 'sel' }, { psp: psp }));
        }
        frames.push(snap('A buggy client reuses K1 for a <i>different</i> amount. The server compares request hashes, sees they differ and answers <span class="c-r">422</span>. Reusing a key for a different request is a client bug - we refuse loudly instead of guessing.', { 0: 'done', 1: 'done', 2: 'done' }, { 0: 'bad' }, { psp: psp }));
        idem.push(['K2', 'h(refund T1)', 'COMPLETED', '200 refunded ' + money(amt)]);
        ledger.push({ id: eid++, txn: 'T2', acc: 'merchant_payable (liability)', d: net, c: 0 });
        ledger.push({ id: eid++, txn: 'T2', acc: 'fee_revenue (income)', d: fee, c: 0 });
        ledger.push({ id: eid++, txn: 'T2', acc: 'card_clearing (asset)', d: 0, c: amt });
        frames.push(snap('Later the customer asks for a <b>refund</b> (new key K2). We never edit or delete T1. We append T2 with the <b>opposite</b> lines: debit payable ' + money(net) + ', debit fee ' + money(fee) + ', credit clearing ' + money(amt) + '. History stays intact; the net effect of T1 + T2 is exactly zero.', { 3: 'ok', 4: 'ok', 5: 'ok' }, { 1: 'ok' }, { psp: psp + 1 }));
        frames.push(snap('Summary: <b>' + (retries + 1) + ' requests</b> for one intent produced <b>one</b> card charge and <b>3 ledger lines</b>. The books always balance, every cent has a trail, and a refund is just more history. This is why payment systems favour append-only data.', { 0: 'done', 1: 'done', 2: 'done', 3: 'done', 4: 'done', 5: 'done' }, {}, { psp: psp + 1 }));
        return frames;
      }
    },
    examples: [
      { title: 'The three answers a server can give for a key', html: `<p>Same key arrives again. The server must decide, in one atomic step:</p>
        ${H.table(['What the server finds', 'Response', 'Why'], [['no row for K1', 'process normally', 'first time'], ['row K1, state COMPLETED, same hash', '<span class="c-g">replay saved response</span> (same status code and body)', 'idempotent retry'], ['row K1, state IN_PROGRESS', '409 "processing" (or wait up to a few seconds)', 'a duplicate arrived while the first is still running'], ['row K1, different hash', '<span class="c-r">422</span>', 'client reused a key for another request']])}` },
      { title: 'Timeout talking to the bank: the UNKNOWN state', html: `<p>Our server calls the PSP and gets <b>no answer within 5 s</b>. Did the charge happen? <b>Unknown.</b> Wrong move: mark FAILED and let the user pay again (double charge risk). Right moves: mark the payment <code>PENDING_UNKNOWN</code>; retry the PSP call <b>with the same PSP idempotency key</b> (the PSP returns the original result); or ask the PSP "status of reference X"; or wait for its webhook; and a reconciliation job closes any leftovers next morning. The user sees "payment processing" rather than a possibly wrong failure.</p>` },
      { title: 'Why the ledger beats a balance column', html: `<p>A column <code>wallet.balance = 120</code> tells you the number but not why. If two requests update it at once or a bug subtracts twice, history is gone. With a ledger the balance is just <code>SUM(credit) - SUM(debit)</code> over the account's lines (cached for speed), and any bug can be investigated line by line.</p>`, code: { lang: 'sql', check: false, title: 'Balance and invariant checks', code: `-- balance of one account
SELECT SUM(credit) - SUM(debit) AS balance FROM ledger_entries WHERE account_id = :acct;
-- invariant: every transaction must balance (should return zero rows)
SELECT txn_id FROM ledger_entries GROUP BY txn_id HAVING SUM(debit) <> SUM(credit);` } },
      { title: 'Money is not a double', html: `<p>In floating point, 0.1 + 0.2 = 0.30000000000000004. Store <b>integer cents</b> (JPY has 0 decimals, KWD has 3 - store the currency's minor-unit exponent too). Fee 3% of 1,000 cents = 30 cents exactly; for rates that do not divide evenly, define a rounding rule (e.g. round half-even) and make sure the leftover cent goes to a specific account so the transaction still balances.</p>` }
    ],
    deepDive: `<h4>🟣 Idempotency keys - the details that bite</h4>
      <ul>
        <li><b>Who generates the key?</b> The <i>client</i>, once per user intent (e.g. when the checkout page loads, not on every button click). A server-generated key cannot help if the first response is lost.</li>
        <li><b>Atomic claim.</b> <code>INSERT ... ON CONFLICT DO NOTHING</code> (or a unique constraint) gives exactly one winner per key even with 50 concurrent retries. Never "SELECT then INSERT".</li>
        <li><b>Store the request fingerprint</b> (hash of body) to catch key misuse. <b>Store the response</b> so replays are byte-identical.</li>
        <li><b>Scope</b> keys per merchant/account to avoid cross-tenant collisions; keep them 24 hours to 30 days; keys must also be sent <i>downstream</i> to the PSP.</li>
        <li><b>Crash in the middle:</b> the key exists as IN_PROGRESS but the worker died. Use a lease (<code>locked_until</code>) so another worker can take over, and make downstream calls idempotent so resuming is safe.</li>
        <li><b>Natural idempotency:</b> where possible make operations idempotent by nature - "set status to PAID" instead of "add 100 to paid"; "PUT /payments/{id}" instead of POST.</li>
      </ul>
      <h4>"Exactly-once" is a myth; "effectively-once" is the goal</h4>
      <p>Over an unreliable network a message is either delivered at-most-once (may be lost) or at-least-once (may be duplicated). You cannot have both guarantees at the transport layer. Real systems take <b>at-least-once + idempotent consumers</b>, giving the <i>effect</i> of exactly-once. Kafka's "exactly-once semantics" works inside Kafka (idempotent producer + transactions); the moment you touch a database or an HTTP API you need your own idempotency.</p>
      <h4>Double-entry ledger design</h4>
      <ul>
        <li><b>Accounts</b> are typed: asset (what we hold), liability (what we owe), income, expense, equity. Debits increase assets/expenses; credits increase liabilities/income. You do not need to memorise this - just keep <b>sum(debit) = sum(credit)</b> per transaction.</li>
        <li><b>Immutable.</b> Rows are only inserted. Corrections are new transactions (reversal + replacement), each linked to the original (<code>reverses_txn_id</code>). Enforce with DB permissions (no UPDATE/DELETE) and periodic hash-chaining or WORM storage for auditors.</li>
        <li><b>Atomicity.</b> All lines of a transaction commit together - one SQL transaction. Across multiple databases you need a saga, not 2PC.</li>
        <li><b>Hot accounts.</b> A single "fee revenue" account touched by every payment becomes a write hotspot. Fix: split it into N sub-accounts (<code>fee_revenue#0..15</code>) chosen by hash and sum them for reporting; or aggregate lines per batch.</li>
        <li><b>Balances.</b> Compute on read for small accounts; for big ones keep a materialised balance updated in the same transaction (with optimistic version check) or maintain periodic snapshots + deltas. For a wallet that must not go negative, do a conditional update <code>WHERE balance &gt;= :amt</code> inside the transaction.</li>
        <li><b>Multi-currency.</b> One transaction balances per currency; FX conversion is itself a transaction between two currency accounts through an FX position account.</li>
        <li><b>Sharding.</b> Shard by account_id for balance queries, or by transaction id with an account index; cross-shard transfers become two-step sagas with a pending/holding account in between.</li>
      </ul>
      <h4>Transactional outbox and sagas</h4>
      <p>"Update the database and publish a Kafka event" is two systems - one can succeed while the other fails. The <b>outbox</b>: insert the event row in the <i>same</i> database transaction as the ledger lines; a relay process (or CDC like Debezium) reads the outbox and publishes at-least-once; consumers dedupe by event id. For multi-step flows (authorise → capture → payout) use a <b>saga</b>: each step has a compensating action (void authorisation, refund) and a durable state machine decides what to do after a crash.</p>
      <h4>Reconciliation and correctness at scale</h4>
      <ul>
        <li>Nightly, load the PSP/bank settlement file and compare with our ledger by PSP reference. Differences go into a <b>break queue</b> for investigation: missing on our side (we crashed before recording), missing on theirs (never captured), amount mismatch (fees, FX).</li>
        <li>Continuous invariants: total debits = total credits; sum of merchant payables = what the bank says we owe; alert on any drift.</li>
        <li><b>Payment state machine</b> with allowed transitions only: CREATED → AUTHORIZED → CAPTURED → SETTLED; CAPTURED → REFUNDED(partial/full); anything → FAILED. Illegal transitions are rejected - this stops "refund before capture" bugs.</li>
      </ul>
      <h4>Security and compliance</h4>
      <p>Card numbers never touch your servers: the browser sends them to the PSP's hosted fields and you receive a <b>token</b> (PCI scope shrinks dramatically). Add 3-D Secure / SCA for strong customer authentication, a fraud-scoring service before capture, TLS everywhere, secrets in an HSM/KMS, and strict audit logging.</p>
      <h4>Trade-offs to say out loud</h4>
      <ul><li>Synchronous response vs async (webhook) result: sync is simpler for users; async tolerates slow PSPs. Many systems return 202 + poll/webhook for slow methods.</li><li>Strongly consistent SQL (Postgres/Spanner) for money, eventually consistent stores for search and analytics only.</li><li>Key retention: longer = safer against late retries, more storage.</li></ul>`,
    aiEra: `<p><b>What AI changes:</b> Fraud and risk scoring is now mostly ML (graph features, device signals, LLM-assisted review of disputes); AI agents increasingly <i>initiate</i> payments on behalf of users, which makes idempotency and spending limits even more important (an agent that loops must not spend twice). Reconciliation break triage and dispute evidence are being automated.</p>
        <p><b>Use AI as a partner:</b> <code>List 8 ways a payment retry can go wrong between my API, the PSP, and my DB; for each give the detection and the fix</code>; have it write property tests ("for any sequence of charge/refund/retry, debits equal credits"); ask it to review your state machine for missing transitions.</p>
        <p><b>Where AI goes wrong:</b> it stores money as <code>float</code>, makes the server generate the idempotency key, "solves" exactly-once with a distributed lock, updates a balance column instead of appending to a ledger, or retries a timed-out charge as a new payment. Always challenge these.</p>
        <p><b>What you must still own:</b> the invariants (one charge per intent, balanced books), the failure matrix (timeout, crash, duplicate, partial commit), and the audit story. Regulators and finance teams will not accept "the model said so".</p>`,
    problems: [{
      title: 'Never Double-Charge: Payment API with Unreliable Networks', level: 'Medium', tags: ['idempotency', 'ledger', 'outbox', 'hld'], companies: ['Stripe', 'PayPal', 'Razorpay', 'Adyen'],
      statement: `<p>Design the core of a payment API used by merchants. The client app may retry on timeouts, the card network is slow and sometimes silent, and our own servers can crash mid-request. Guarantee: <b>one user intent produces at most one charge</b>, every cent is auditable, and refunds work. Describe the API contract, the tables, the request flow and the crash/timeout cases.</p>`,
      constraints: `1,200 payments/s peak · PSP latency up to 5 s · retries within 24 h · money in minor units · 7-year audit retention · no raw card data.`,
      example: `<p>Client sends K1 for $100 → we charge, record 3 ledger lines, save the response → response lost → client retries K1 → we return the saved response. ${H.c('g', 'One charge, one set of ledger lines.')}</p>`,
      brute: { why: `<p>A naive handler: receive request → call PSP → <code>UPDATE wallet SET balance = balance + 100</code> → return. A timeout makes the client retry, creating a second PSP charge. A crash between the PSP call and the UPDATE loses the record of a real charge. A balance column cannot explain how it reached its value, and concurrent updates can lose writes.</p>` },
      mcq: { q: 'The PSP call timed out. What should the payment be marked as?', options: ['UNKNOWN/PENDING, then resolved by status query or webhook', 'FAILED, so the user can try again immediately', 'COMPLETED, assuming success'], answer: 0, explain: 'A timeout means the outcome is unknown. Marking FAILED can double charge; assuming success can ship goods without payment. Resolve with a status query using the same reference or by reconciliation.' },
      hints: [`<p>The retry must be recognisable as "the same intent" - give every request a stable identifier created by the client.</p>`, `<p>Insert the key with a unique constraint first, store a request hash and the response, pass the key to the PSP, and write ledger lines + key completion in one transaction.</p>`, `<p>Edge cases: duplicate while in progress (409/lease), same key different body (422), crash after PSP success but before commit (resume via PSP lookup by key), timeout (UNKNOWN), outbox for events, reconciliation as the safety net, refunds as reversing entries.</p>`],
      solution: {
        approach: `<p><b>Contract.</b> <code>POST /v1/payments</code> requires an <code>Idempotency-Key</code> header (UUID per user intent). Same key + same body returns the original response; same key + different body returns 422; same key while running returns 409 or waits briefly.</p>
          <p><b>Flow.</b> (1) INSERT into idempotency_keys (key, request_hash, IN_PROGRESS, locked_until) - the unique constraint decides the single winner. (2) Create the payment row in CREATED. (3) Call the PSP with our key as the PSP's idempotency key and a 5 s timeout. (4) Open one DB transaction: set payment state, insert balanced ledger lines (clearing debit, merchant payable credit, fee credit), set the key COMPLETED with the saved response, insert an outbox event; commit. (5) Return the response. A relay publishes the outbox to Kafka for webhooks and analytics.</p>
          <p><b>Failures.</b> If the PSP times out, mark PENDING_UNKNOWN and return 202; a resolver job asks the PSP for the status by key (or receives its webhook) and then completes step 4. If the server crashes after step 3, the lease expires, a retry or the resolver finds the PSP result by key and finishes. If the response is lost, the client's retry replays the saved response. A nightly reconciliation compares the ledger with the PSP settlement file and opens break tickets for any difference.</p>
          <p><b>Refunds</b> use their own key and append reversing ledger lines linked to the original transaction, never mutating history. Money is integer minor units plus currency; card data is tokenised by the PSP.</p>`,
        complexity: `<p>Per payment: 1 unique insert, 1 PSP call, 1 transaction with ~3 inserts - O(1). Storage grows linearly with payments (append-only, partition by month and archive).</p>`,
        followUps: ['How would you support partial captures and multiple refunds on one payment?', 'How do you pay out 100K merchants every night without hot-spotting a single account?']
      }
    }]
  });

  /* ================= TOPIC 5: AUTOCOMPLETE ================= */
  topics.push({
    title: 'Design Autocomplete (Typeahead): Tries & Top-K Caching',
    analogy: `<p>Picture a big <b>library</b> where the shelves are arranged letter by letter: the "C" aisle splits into "CA" and "CO" shelves, "CA" splits into "CAR", "CAT", and so on. At the <b>entrance of every aisle there is a sign</b>: "Most borrowed in this aisle: CAR, CART, CAT". You type "ca" - the librarian walks two steps to the "CA" sign and reads it aloud. She does <b>not</b> walk down the whole aisle counting books.</p>
      <p>The aisles are a <b>trie</b> (prefix tree) and the signs are the <b>cached top-K lists</b>. Reading a sign is instant, which is how typeahead answers in a few milliseconds.</p>`,
    explain: `<p><b>Goal:</b> as a user types in a search box, show the 5-10 most useful completions within ~100 ms of each keystroke. It looks tiny, but it is one of the highest-QPS endpoints in any search product.</p>
      <h4>1. Requirements</h4>
      <ul>
        <li><b>Functional:</b> given a prefix return top-K suggestions ranked by popularity (and maybe recency/personalisation/location); support multiple languages; hide offensive or illegal suggestions; reflect trending queries within minutes.</li>
        <li><b>Non-functional:</b> very low latency (p99 &lt; 50-100 ms end to end), very high read QPS, high availability, <b>eventual consistency is fine</b> (suggestions can lag minutes), modest write path (a batch/stream pipeline, not user-facing).</li>
      </ul>
      <h4>2. Estimates</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Searches', '10B/day', '≈ 115K searches/s'],
        ['Suggest calls', '~4 calls per search after client debouncing', '≈ 460K/s average, <b>~1M/s peak</b>'],
        ['Distinct popular queries', '100M queries kept (the long tail is dropped)', '100M × ~25 B ≈ 2.5 GB of raw strings'],
        ['Trie with top-K per node', '~5x overhead for nodes, pointers and cached lists', '≈ <b>10-50 GB</b> - shard it, or keep in each region'],
        ['Response size', '5 suggestions × ~30 B', '≈ 200 B - tiny, ideal for caches']
      ])}
      <h4>3. API</h4>
      <p><code>GET /v1/suggest?q=ca&amp;limit=5&amp;lang=en</code> → <code>{"prefix":"ca","suggestions":["car","cart","cat"],"version":4812}</code>. The prefix, language and region form the <b>cache key</b>. Sending the data version lets clients and caches see staleness.</p>
      <h4>4. Data model and storage</h4>
      <ul>
        <li><b>Query log</b> (huge, append-only, in the data lake): <code>(query, timestamp, user bucket, region)</code>.</li>
        <li><b>Aggregates</b>: <code>(query, weekly/daily count, trend score)</code> computed by a batch job; plus a streaming layer for the last 15 minutes.</li>
        <li><b>Serving structure</b>: a read-only <b>trie snapshot</b> (or FST / sorted array with prefix ranges) where each node stores its top-K completions. Built offline, shipped as an immutable file, memory-mapped by the suggest servers.</li>
      </ul>
      <h4>5. High-level architecture</h4>
      <ol>
        <li><b>Client:</b> debounce (wait ~100-150 ms after the last key), cancel in-flight requests, cache results locally, and reuse results of "ca" to filter for "car".</li>
        <li><b>Edge/CDN cache</b> for short prefixes (1-3 letters) - they are asked millions of times and change slowly. TTL a few minutes.</li>
        <li><b>Suggest service</b> (stateless) → in-memory trie shard chosen by prefix → returns the node's cached top-K. Optional re-rank with the user's recent searches.</li>
        <li><b>Offline pipeline:</b> logs → Kafka → batch/stream aggregation (counts, filters, spam removal) → trie builder → snapshot to object storage → rolling deploy to the servers. A small <b>fresh layer</b> of trending queries is merged at query time.</li>
      </ol>
      <h4>6. The trie and why top-K is stored in every node 🔵</h4>
      <p>A <b>trie</b> stores strings by their letters: each edge is a character; each path from the root spells a prefix. Shared prefixes share nodes ("car", "cart", "cat" share "ca"). To find the completions of "ca" you walk 2 edges - <b>O(length of prefix)</b>, independent of dictionary size.</p>
      <p>But "all words below this node" may be millions (the node for "s"). Scanning them to find the best 5 on every keystroke is too slow. So each node <b>pre-computes its top-K</b> list. Memory goes up (K pointers per node) but a query becomes: walk the prefix, return the list. Use the visualizer: first it builds a tiny trie and shows each node's cached list, then it walks a prefix.</p>`,
    clues: [
      '"as the user types" / "suggestions in under 100 ms" → trie or sorted-prefix index, <b>precomputed top-K</b>, aggressive caching',
      '"most popular / trending queries" → offline aggregation of logs + a fresh streaming layer, ranking by count with time decay',
      '"billions of queries per day" → cache short prefixes at the edge, debounce on the client, shard the trie by prefix',
      '"memory is too big for one machine" → compressed trie / FST, store only popular queries, shard by first letters or hash',
      '"update suggestions without downtime" → immutable snapshots built offline, blue/green swap',
      '"typos / fuzzy match" → edit-distance on a candidate set, n-gram index, or a separate spell-correct service'
    ],
    code: [{
      lang: 'java', title: 'Trie with cached top-K per node (Java, compiles and runs)',
      code: `
import java.util.*;

/** Trie where every node caches its top-K most popular completions, so a lookup never scans the subtree. */
public class TrieTopK {
    static class Node {
        final Map<Character, Node> kids = new TreeMap<>();
        final List<String> top = new ArrayList<>();   // best words under this node, best first
    }

    private final Node root = new Node();
    private final Map<String, Long> score = new HashMap<>();   // word -> popularity
    private final int k;

    TrieTopK(int k) { this.k = k; }

    /** Add or update a word's popularity, then refresh the cached lists on its path (length of word nodes). */
    void put(String word, long count) {
        score.put(word, count);
        Node cur = root;
        refresh(cur, word);
        for (char ch : word.toCharArray()) {
            cur = cur.kids.computeIfAbsent(ch, c -> new Node());
            refresh(cur, word);
        }
    }

    /** Insert word into node.top keeping it sorted by score (desc, then alphabetical) and at most k long. */
    private void refresh(Node n, String word) {
        n.top.remove(word);                                   // drop the old position if the word is already listed
        n.top.add(word);
        n.top.sort((a, b) -> {
            int c = Long.compare(score.get(b), score.get(a));
            return c != 0 ? c : a.compareTo(b);
        });
        while (n.top.size() > k) n.top.remove(n.top.size() - 1);
    }

    /** O(length of prefix): walk down, then return the cached list. */
    List<String> suggest(String prefix) {
        Node cur = root;
        for (char ch : prefix.toCharArray()) {
            cur = cur.kids.get(ch);
            if (cur == null) return List.of();                // nothing starts with this prefix
        }
        return new ArrayList<>(cur.top);
    }

    public static void main(String[] args) {
        TrieTopK t = new TrieTopK(3);
        t.put("car", 50); t.put("cat", 30); t.put("cart", 45); t.put("cow", 20); t.put("dog", 10);
        System.out.println("ca  -> " + t.suggest("ca"));       // [car, cart, cat]
        System.out.println("c   -> " + t.suggest("c"));        // [car, cart, cat]
        t.put("cow", 99);                                      // cow becomes a trending query
        System.out.println("c   -> " + t.suggest("c"));        // [cow, car, cart]
        System.out.println("zzz -> " + t.suggest("zzz"));      // []
    }
}
`
    }],
    codeTitle: ['Trie where every node caches its top-K (Java)'],
    viz: {
      title: 'Trie prefix walk with cached top-K lists',
      input: 'car:50 cat:30 cow:20 dog:10 k=2 @ ca',
      inputLabel: 'word:count ... [k=1..3] @ prefix  (letters a-z, words up to 3 letters, max 2 next-letters per node)',
      gen: function (input) {
        var halves = String(input).split('@'), left = halves[0].trim(), prefix = (halves[1] || '').trim().toLowerCase();
        var k = 2, words = [];
        left.split(/\s+/).forEach(function (tok) {
          if (!tok) return;
          if (/^k=/i.test(tok)) { k = Number(tok.slice(2)); return; }
          var p = tok.split(':');
          if (p.length !== 2 || !/^[a-z]{1,3}$/i.test(p[0]) || isNaN(p[1]) || p[1] === '') throw new Error('Write words like car:50 (1-3 letters, then a count), then @ and a prefix, e.g. "car:50 cat:30 dog:10 @ ca"');
          words.push([p[0].toLowerCase(), Number(p[1])]);
        });
        if (!(k >= 1 && k <= 3)) throw new Error('k must be 1 to 3');
        if (words.length < 2 || words.length > 8) throw new Error('Give between 2 and 8 words');
        if (!/^[a-z]{0,3}$/.test(prefix)) throw new Error('Prefix must be 0-3 letters after the @');
        var seen = {}; words.forEach(function (w) { if (seen[w[0]]) throw new Error('Duplicate word: ' + w[0]); seen[w[0]] = 1; });
        // layout from the final trie
        var kids = { '': [] };
        words.forEach(function (w) { for (var i = 0; i < w[0].length; i++) { var pre = w[0].slice(0, i), ch = w[0].charAt(i); kids[pre] = kids[pre] || []; if (kids[pre].indexOf(ch) < 0) kids[pre].push(ch); kids[pre + ch] = kids[pre + ch] || []; } });
        var idxOf = { '': 0 };
        Object.keys(kids).sort(function (a, b) { return a.length - b.length || (a < b ? -1 : 1); }).forEach(function (pre) {
          kids[pre].sort();
          if (kids[pre].length > 2) throw new Error('Node "' + pre + '" has ' + kids[pre].length + ' next letters; this demo allows at most 2 so the picture stays binary (real tries allow 26+).');
          kids[pre].forEach(function (ch, j) { idxOf[pre + ch] = 2 * idxOf[pre] + 1 + j; });
        });
        function topOf(pre, present) {
          return present.filter(function (w) { return w[0].indexOf(pre) === 0; }).sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : 1); }).slice(0, k).map(function (w) { return w[0]; });
        }
        function treePart(present, hl, showTop) {
          var arr = [], tags = {}, i;
          for (i = 0; i < 15; i++) arr.push(null);
          arr[0] = 'root';
          if (showTop) tags[0] = 'top' + k + ': ' + topOf('', present).join(', ');
          present.forEach(function (w) { for (var j = 1; j <= w[0].length; j++) { var pre = w[0].slice(0, j); arr[idxOf[pre]] = pre.charAt(j - 1); if (showTop) tags[idxOf[pre]] = 'top' + k + ': ' + topOf(pre, present).join(', '); else if (j === w[0].length) tags[idxOf[pre]] = w[0] + ' (' + w[1] + ')'; } });
          while (arr.length > 1 && arr[arr.length - 1] === null) arr.pop();
          return { type: 'tree', label: 'Trie (each circle = one letter; the tag = cached top-' + k + ' under that node)', arr: arr, hl: hl, tags: tags };
        }
        function mapPart(present) { return { type: 'map', label: 'Query counts', entries: present.map(function (w) { return [w[0], w[1]]; }) }; }
        var frames = [], present = [];
        frames.push({ narr: 'We have a tiny search history with counts. We will build a <b>trie</b> and store at every node the <b>top-' + k + '</b> most popular words below it. Then we will look up the prefix <b>"' + prefix + '"</b>.', parts: [mapPart(words), treePart([], {}, false), { type: 'vars', vals: { k: k, prefix: prefix || '(empty)', words: words.length } }] });
        words.forEach(function (w) {
          present.push(w);
          var hl = {}; hl[0] = 'done';
          for (var j = 1; j <= w[0].length; j++) hl[idxOf[w[0].slice(0, j)]] = j === w[0].length ? 'ok' : 'win';
          frames.push({ narr: 'Insert <b>' + w[0] + '</b> (count ' + w[1] + '): walk/create one node per letter (blue), mark the end (green). Every node on this path also updates its cached top-' + k + ' list - look at the tags.', parts: [mapPart(present), treePart(present, hl, true), { type: 'vars', vals: { inserted: present.length, 'nodes created so far': Object.keys(idxOf).filter(function (p) { return present.some(function (x) { return x[0].indexOf(p) === 0; }); }).length } }] });
        });
        var steps = [];
        for (var i = 0; i <= prefix.length; i++) {
          var pre = prefix.slice(0, i), hl2 = {};
          if (idxOf[pre] === undefined) {
            frames.push({ narr: 'No edge for letter <b>"' + prefix.charAt(i - 1) + '"</b> here → nothing in the history starts with "' + prefix + '". Return an empty list (or fall back to spell-correct). Cost: ' + i + ' steps.', parts: [treePart(words, hl2, true), { type: 'vars', vals: { prefix: prefix, result: '(none)' }, hl: { result: 'bad' } }] });
            return frames;
          }
          for (var q = 0; q < i; q++) hl2[idxOf[prefix.slice(0, q)]] = 'done';
          hl2[idxOf[pre]] = 'cur';
          frames.push({ narr: i === 0 ? 'Lookup starts at the <b>root</b>.' : 'Type <b>"' + prefix.charAt(i - 1) + '"</b>: follow that edge to the node for <b>"' + pre + '"</b>. One hop per typed letter - no scanning.', parts: [treePart(words, hl2, true), { type: 'vars', vals: { 'typed so far': pre || '(nothing)', 'steps taken': i } }] });
        }
        var hl3 = {}; hl3[idxOf[prefix]] = 'sel';
        var sub = Object.keys(idxOf).filter(function (p) { return p.indexOf(prefix) === 0; }).length;
        frames.push({ narr: 'We are at the node for <b>"' + prefix + '"</b>. Its tag already holds the answer: <b>' + topOf(prefix, words).join(', ') + '</b>. Cost: <b>' + prefix.length + ' hops</b>. Without the cache we would have to visit all <b>' + sub + '</b> nodes in this subtree and sort their words - on a real trie that subtree can hold millions.', parts: [treePart(words, hl3, true), { type: 'vars', vals: { prefix: prefix || '(empty)', 'answer (cached)': topOf(prefix, words).join(', '), 'hops': prefix.length, 'subtree nodes avoided': sub }, hl: { 'answer (cached)': 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Reading the cached lists', html: `<p>Words: car 50, cart 45, cat 30, cow 20, dog 10 with K=3.</p>
        ${H.table(['Node (prefix)', 'Words below it', 'Cached top-3'], [['(root)', 'all five', 'car, cart, cat'], ['c', 'car, cart, cat, cow', 'car, cart, cat'], ['ca', 'car, cart, cat', 'car, cart, cat'], ['car', 'car, cart', 'car, cart'], ['co', 'cow', 'cow'], ['d', 'dog', 'dog']])}
        <p>Typing "c" returns instantly from node "c". Note the root list equals the "c" list here because "c" words dominate - a real root list would be the global top queries, shown when the box is focused but empty.</p>` },
      { title: 'Why shard by prefix needs care', html: `<p>If you shard by the first letter, shard "s" gets far more load than shard "x". Better: shard by hash of the first 2-3 characters, or split big letters further ("sa", "sb", ...) based on measured traffic. And remember that popular 1-2 letter prefixes are mostly served from the edge cache anyway, so the trie servers see mainly longer prefixes with a more even spread.</p>
        ${H.table(['Strategy', 'Pros', 'Cons'], [['Range by first letter', 'simple, contiguous', 'very uneven load'], ['Hash(first 3 letters)', 'even load', 'a request for "ca" must ask all shards that hold "ca*" (≤ 26 of them) unless shard key is the first 2'], ['Replicate whole trie per region', 'no cross-shard calls, trivial', '10-50 GB per replica, fine for RAM today']])}` },
      { title: 'Client-side tricks that save 90% of calls', html: `<p><b>Debounce:</b> wait 100-150 ms after the last keystroke before calling - a fast typist sending "c-a-r-t" produces one call, not four. <b>Cancel:</b> abort the previous request if a new key is typed. <b>Local cache:</b> keep results for prefix "ca"; for "car", if the server said the "ca" list was <i>complete</i> (fewer than K total matches), filter locally. <b>Prefetch:</b> when the user focuses the box, fetch the empty-prefix list (trending). Together these cut server QPS dramatically, so the server estimate above is a ceiling, not a typical day.</p>` },
      { title: 'Ranking is more than counts', html: `<p>Score = popularity (log of count) + <b>recency</b> (exponential decay so yesterday's trend beats last year's) + <b>personal</b> (the user's own recent searches boosted) + <b>location</b> (restaurants near me) + quality filters (blocklist, no private data). Keep the base trie ranked by global score; apply personal/location re-rank on the K×3 candidates fetched from the node. That keeps the heavy structure shared and the per-user work tiny.</p>` }
    ],
    deepDive: `<h4>🟣 Data structures</h4>
      ${H.table(['Structure', 'Idea', 'Notes'], [
        ['<b>Plain trie</b>', 'One node per character, child map/array', 'Simple; memory-heavy (pointer per edge). Child as array[26] wastes space; use sorted arrays or hash maps.'],
        ['<b>Compressed trie / radix tree</b>', 'Merge chains of single-child nodes: edge labels are strings', 'Far fewer nodes; lookup compares edge labels. Common in production.'],
        ['<b>FST / DAWG</b>', 'Share suffixes too (finite-state transducer)', 'Lucene/Elasticsearch completion suggester uses FSTs; extremely compact and memory-mappable, but built offline and immutable.'],
        ['<b>Sorted array + binary search</b>', 'Keep all queries sorted; a prefix = a contiguous range found by two binary searches', 'Simplest of all; top-K for the range via a range-max structure or precomputed lists for common prefixes.']
      ])}
      <h4>Top-K per node: storage vs speed</h4>
      <ul>
        <li><b>Store top-K at every node:</b> query O(prefix length); space O(nodes × K). With K=5-10 and a compressed trie this is affordable.</li>
        <li><b>Compute on demand (DFS the subtree):</b> no extra space, but O(subtree size) per query - hopeless for short prefixes.</li>
        <li><b>Hybrid:</b> store lists only for nodes with many descendants (short prefixes); for deep, small subtrees do a quick DFS. Saves memory with almost no latency cost.</li>
        <li><b>Updates and the "decrease" problem:</b> when a word's score rises, push it up its path and insert into each node's list (like the Java snippet). When a score <i>falls</i>, a word may leave a list and the replacement must be found from the children's lists - doable bottom-up, but simplest of all is to <b>rebuild offline</b>.</li>
      </ul>
      <h4>Freshness: batch + stream</h4>
      <ul>
        <li><b>Base layer:</b> rebuilt every few hours from the last N days of logs, with exponential time-decay weights. Output is an immutable snapshot with a version number; servers load the new file in the background and swap an atomic pointer (no downtime, instant rollback).</li>
        <li><b>Fresh layer:</b> a stream job counts queries per 5-15 minute window; queries whose rate jumps (a breaking news event) go into a tiny in-memory map. At query time merge: <code>top-K(base node list ∪ fresh matches for the prefix)</code>. This is a mini lambda architecture.</li>
        <li><b>Do not update the trie on every keystroke or search</b> - writing on the hot read path would destroy latency and let a few users manipulate rankings.</li>
      </ul>
      <h4>Caching layers</h4>
      <p>Browser → CDN/edge (key = region + language + prefix) → server RAM trie. Cache hit rates are very high because queries follow a power law: the top few thousand prefixes cover a big share of traffic. Short TTL (1-5 minutes) is OK since eventual consistency is acceptable. Watch out for <b>cache stampede</b> on a trending prefix: coalesce identical in-flight requests.</p>
      <h4>Quality, safety and abuse</h4>
      <ul>
        <li><b>Blocklist</b> of offensive/illegal/private strings applied at build time <i>and</i> as a final filter at serve time (so a hotfix needs no rebuild).</li>
        <li><b>Data poisoning:</b> attackers script millions of searches to push a bad suggestion. Count <b>unique users</b> (or unique sessions) rather than raw hits, require a minimum number of distinct users, and rate-limit per client.</li>
        <li><b>Privacy:</b> never suggest queries that contain personal data (emails, phone numbers); drop low-frequency queries (k-anonymity: need ≥ N distinct users to appear).</li>
        <li>Multilingual: tokenisation differs (CJK has no spaces), so use per-language tries and Unicode normalisation.</li>
      </ul>
      <h4>Fuzzy and semantic suggestions</h4>
      <p>Typos: generate candidates by edit distance ≤ 1-2 (deletion/insertion/substitution) from a small dictionary, or index character n-grams. Semantic ("cheap flights" ≈ "low cost airfare") is a different problem: embed queries as vectors and use approximate nearest neighbour search; typically used to <i>supplement</i> the prefix trie, not replace it, because prefix match is what users expect while typing.</p>
      <h4>Trade-offs to say out loud</h4>
      <ul><li>Memory vs latency (top-K in nodes).</li><li>Freshness vs stability (fresh layer vs rebuilt snapshot).</li><li>Personalisation vs cacheability (personal results cannot be shared at the edge - cache the global candidates, personalise on top).</li></ul>`,
    aiEra: `<p><b>What AI changes:</b> LLMs and embeddings enable <b>semantic and conversational completions</b> ("what's a good name for a bakery?"), query rewriting, and intent-aware ranking. Learned rankers use click-through to order suggestions. But for the classic typeahead box, latency (tens of ms) and cost (a million requests per second) mean the trie/FST stays the first stage; the model re-ranks a few candidates or generates "smart suggestions" in a separate, slower panel. Code editors' AI completion is a related but much heavier cousin with very different latency and cost profile.</p>
        <p><b>Use AI as a partner:</b> <code>Generate 30 adversarial prefixes (emoji, RTL text, very long, punctuation) to test my suggest API</code>; have it brainstorm blocklist categories; ask it to write a load test for 1M QPS with a Zipf distribution of prefixes.</p>
        <p><b>Where AI goes wrong:</b> proposing to "call an LLM on every keystroke" (impossible at this QPS and latency), forgetting caching/debouncing, using a database LIKE 'ca%' query, or ignoring poisoning and privacy. It also tends to say "use Elasticsearch" without being able to explain what FSTs give you.</p>
        <p><b>What you must still own:</b> the back-of-envelope numbers, the cache key design, the freshness pipeline, and the safety rules for what may be suggested.</p>`,
    problems: [{
      title: 'Typeahead for 10 Billion Searches a Day', level: 'Medium', tags: ['trie', 'top-k', 'caching', 'hld'], companies: ['Google', 'Amazon', 'Microsoft', 'LinkedIn'],
      statement: `<p>Design the search-box autocomplete for a large e-commerce or web search site. Each keystroke may request suggestions. Return the top 5 completions in under 100 ms, make trending queries appear within about 15 minutes, never show blocked terms, and keep the infrastructure cost reasonable. Describe the data structure, the pipeline, caching and sharding.</p>`,
      constraints: `10B searches/day · ~1M suggest QPS at peak · p99 &lt; 100 ms · 100M candidate queries · freshness ≤ 15 min for trending · memory per server ≤ 64 GB.`,
      example: `<p>User types "ip": the server returns [iphone 16, ipad, iphone case, ipl score, ip address]. After a big product launch "iphone 17" climbs to position 1 within ~10 minutes through the fresh layer.</p>`,
      brute: { why: `<p>Run <code>SELECT query FROM searches WHERE query LIKE 'ip%' GROUP BY query ORDER BY COUNT(*) DESC LIMIT 5</code> on every keystroke. Even with an index on the query text, each call scans every matching row and sorts by count: for "i" that is millions of rows. At 1M QPS the database collapses, and latency is seconds, not milliseconds.</p>` },
      mcq: { q: 'Why store the top-K list inside each trie node?', options: ['So a lookup is just prefix length hops with no subtree scan', 'To make inserts faster', 'To reduce memory'], answer: 0, explain: 'The cached list turns the answer into a read after walking the prefix. It costs extra memory and makes updates heavier, which is why updates are done offline in batches.' },
      hints: [`<p>The popular queries change slowly, but there are only a few hundred million of them - precompute the answer for every prefix.</p>`, `<p>A (compressed) trie or FST built offline from aggregated logs, each node holding top-K; serve it from RAM, behind an edge cache keyed by prefix.</p>`, `<p>Edge cases: trending queries (fresh layer merged at query time), blocked terms (final filter), shard hot prefixes, client debounce + cancel, snapshot versioning and rollback, poisoning (count unique users), personal re-rank on top of shared candidates.</p>`],
      solution: {
        approach: `<p><b>Offline pipeline.</b> Search logs flow through Kafka to a batch job that aggregates counts per normalised query over the last N days with exponential time decay, drops low-user-count and blocked queries, and ranks them. A builder constructs a compressed trie (or FST) where each node stores the top-5 query ids; the file is versioned and stored in object storage. A scheduled rollout loads the snapshot into every suggest server's RAM (10-50 GB), then swaps an atomic pointer; the previous version is kept for instant rollback.</p>
          <p><b>Online path.</b> The browser debounces and cancels requests and keeps a local prefix cache. The CDN caches responses for short prefixes (key = region + language + prefix, TTL 1-5 minutes) and absorbs most of the 1M QPS. On a miss, a stateless suggest service looks up the prefix in its trie shard (O(prefix length)) and returns the cached top-5. Sharding is by hash of the first 2-3 characters with replicas per region; hot shards get more replicas.</p>
          <p><b>Freshness.</b> A Flink job counts queries per 5-minute tumbling window and publishes rising queries (by rate-of-change and unique users) into a small in-memory "fresh" map on each server. The service merges base top-5 with fresh matches for the prefix and re-sorts. Personal and location re-ranking is applied on ~15 candidates after the shared lookup so the cache stays shareable. A final blocklist filter runs at serve time so hotfixes need no rebuild.</p>
          <p><b>Failure/abuse.</b> If trie servers fail, the CDN's stale copies serve (stale-while-revalidate); counts use unique users to resist poisoning.</p>`,
        complexity: `<p>Lookup O(L) for a prefix of length L plus O(K) to copy the list. Build is offline: O(total characters × K). Memory ≈ nodes × (children + K ids), compressible with a radix tree/FST.</p>`,
        followUps: ['How do you support typo tolerance without slowing the main path?', 'How would you handle a language without spaces such as Chinese?']
      }
    }]
  });

  /* ================= TOPIC 6: AD CLICK AGGREGATOR ================= */
  topics.push({
    title: 'Design an Ad Click Aggregator: Streaming Windows, Dedup & Late Events',
    analogy: `<p>It is <b>election night</b>. Ballots arrive at the counting hall from many polling stations. The officials count them <b>in hourly boxes</b>: "ballots cast between 9:00 and 10:00 go in the 9-10 box". Some trouble they must handle:</p>
      <ul>
        <li><b>The same ballot arrives twice</b> (a courier delivered a copy) - each ballot has a serial number; a number already seen is thrown away. That is <b>dedup</b>.</li>
        <li><b>A ballot from 9:30 arrives at 10:20</b> because the truck was stuck. Do we re-open the 9-10 box? The officials decide: "we wait until 10:05, then seal the box". Anything after goes to a separate "late" pile. That is a <b>watermark with allowed lateness</b>.</li>
        <li>The box is sealed and the total announced. That is a <b>tumbling window</b> result.</li>
      </ul>`,
    explain: `<p><b>Goal:</b> count ad clicks per ad, per minute, accurately and almost in real time. Advertisers are <b>billed</b> from these numbers, so they must be exact, deduplicated and auditable. Dashboards need "clicks in the last 5 minutes" and "top 100 ads in the last hour" within a minute or so.</p>
      <h4>1. Requirements</h4>
      <ul>
        <li><b>Functional:</b> ingest click events (ad_id, click_id, user/device, timestamp, placement); aggregate by ad and time (1 minute, 1 hour, 1 day); query counts for a time range; top-N ads in a window; filter fraud/bot clicks; keep raw events for audits and re-computation.</li>
        <li><b>Non-functional:</b> very high write throughput; <b>accuracy over speed</b> (bills!); no double counting; tolerate late and out-of-order events; end-to-end freshness of ~1 minute; fault tolerant (no lost clicks when a node dies); query latency of tens of ms on aggregates.</li>
      </ul>
      <h4>2. Estimates</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Clicks', '10B/day', '≈ 115K/s average, <b>~300K/s peak</b>'],
        ['Raw event size', '~200 B', '300K × 200 B = 60 MB/s; <b>2 TB/day</b> raw'],
        ['Aggregates', '2M active ads × 1,440 minutes', '≈ 2.9B rows/day at minute granularity (only ads with clicks → much less); roll up to hours and days'],
        ['Query load', 'dashboards: ~20K QPS', 'served from pre-aggregated tables, not raw events']
      ])}
      <h4>3. APIs</h4>
      ${H.table(['Call', 'Notes'], [
        ['<code>GET /click?ad=123&amp;cid=9f2…</code> (redirect to the advertiser, 302)', 'Click-tracking endpoint: log first, redirect immediately. The click_id is created at <i>impression</i> time so a re-sent click can be recognised.'],
        ['<code>GET /v1/ads/{id}/clicks?from&amp;to&amp;granularity=minute</code>', 'Time series for one ad from the aggregate store.'],
        ['<code>GET /v1/top-ads?window=1h&amp;k=100</code>', 'Top-K for dashboards.']
      ])}
      <h4>4. Data model</h4>
      <ul>
        <li><b>Raw clicks</b> (append-only, cheap storage, S3/HDFS in Parquet, partitioned by hour): <code>click_id, ad_id, user_id, ip, ts_event, ts_ingest, placement, fraud_flag</code>.</li>
        <li><b>Aggregates</b> in an OLAP / time-series store (ClickHouse, Druid, Pinot): <code>(ad_id, window_start, granularity) → click_count, unique_users</code>. Primary key = (ad_id, window_start) so a rewrite is an <b>upsert</b>, not an addition.</li>
        <li><b>Dedup state</b>: recently seen click_ids, held in the stream processor's keyed state (RocksDB) with a TTL equal to the lateness bound.</li>
      </ul>
      <h4>5. High-level architecture</h4>
      <ol>
        <li><b>Click servers</b> (stateless) validate, stamp ingest time, write to <b>Kafka</b> (topic <code>clicks</code>, key = ad_id so one ad's clicks stay in order in one partition) and 302-redirect.</li>
        <li><b>Stream processor (Flink/Spark Streaming)</b>: reads Kafka, drops duplicates by click_id, filters obvious bots, groups by ad_id, assigns each event to a window by its <b>event time</b>, counts, and emits when the <b>watermark</b> passes the window end.</li>
        <li>Results are <b>upserted</b> into the OLAP store (idempotent sink). Late events beyond the bound go to a <b>side output</b> topic.</li>
        <li>In parallel, Kafka Connect copies raw events to the <b>data lake</b>. A nightly <b>batch job</b> recomputes exact counts from raw data (including late events) and corrects the aggregates - the classic lambda/kappa safety net.</li>
        <li><b>Query service</b> reads the OLAP store (and rolled-up hourly/daily tables) for dashboards and billing.</li>
      </ol>
      <h4>6. Windows in one picture 🔵</h4>
      <p>A <b>tumbling window</b> chops time into fixed, non-overlapping boxes (0-10, 10-20, ...). Each click belongs to exactly one box, chosen by when the click <i>happened</i> (<b>event time</b>), not when we received it (processing time). Because events arrive out of order, we cannot close box 0-10 at time 10; we close it when the <b>watermark</b> (= the newest event time seen minus an allowed lateness) passes 10. The visualizer below plays exactly this, with bars for window counts and variables for the watermark, duplicates and late drops.</p>`,
    clues: [
      '"count events per minute / per hour" → <b>tumbling window</b> (fixed boxes); "last 5 minutes sliding every minute" → sliding window',
      '"events can arrive late or out of order" → <b>event time + watermark + allowed lateness</b>, side output for too-late events',
      '"the same click may be delivered twice" → <b>dedup by unique id</b> in keyed state (exact, not a bloom filter, if money is involved)',
      '"billing must be accurate" → exactly-once <i>effect</i>: checkpointed state + <b>idempotent upsert</b> sink + batch reconciliation from raw',
      '"one ad gets 50% of all traffic" → hot key → <b>salting</b> and two-stage (partial then final) aggregation',
      '"top-N ads in the last hour" → per-window counts + heap/merge, or a sketch (Count-Min) when cardinality is huge'
    ],
    code: [{
      lang: 'python', run: true, title: 'Tumbling-window aggregator with dedup, watermark and late events (runnable)',
      code: `
# Tumbling-window click counter with dedup, watermark and late-event side output.
class ClickAggregator:
    def __init__(self, window=10, allowed_lateness=4):
        self.w, self.lateness = window, allowed_lateness
        self.counts = {}          # window_start -> count (open windows only)
        self.seen = set()         # click ids already counted (state; real systems expire old ids)
        self.max_time = None      # largest event time seen so far
        self.emitted = []         # (window_start, count) final results
        self.late, self.dups = [], []

    def watermark(self):
        # "We believe nothing older than this will still arrive."
        return float("-inf") if self.max_time is None else self.max_time - self.lateness

    def on_click(self, event_time, click_id):
        if click_id in self.seen:
            self.dups.append(click_id)          # same click delivered twice (at-least-once delivery)
            return "duplicate"
        start = (event_time // self.w) * self.w
        if start + self.w <= self.watermark():  # its window was already closed and emitted
            self.late.append((event_time, click_id))
            return "late"
        self.seen.add(click_id)
        self.counts[start] = self.counts.get(start, 0) + 1
        self.max_time = event_time if self.max_time is None else max(self.max_time, event_time)
        for s in sorted(self.counts):           # close every window whose end is behind the watermark
            if s + self.w <= self.watermark():
                self.emitted.append((s, self.counts.pop(s)))
        return "counted"

events = [(1, "a"), (3, "b"), (4, "c"), (12, "d"), (3, "b"), (14, "e"), (9, "f"),
          (15, "g"), (23, "h"), (2, "i"), (31, "j")]
agg = ClickAggregator(window=10, allowed_lateness=4)
for t, cid in events:
    print(f"t={t:>2} id={cid} -> {agg.on_click(t, cid)}")
print("emitted windows:", agg.emitted)
print("still open     :", agg.counts)
print("late events    :", agg.late, " duplicates:", agg.dups)
`
    }],
    codeTitle: ['Windowed counter with watermark (Python)'],
    viz: {
      title: 'Tumbling-window click counts: dedup, watermark, late events',
      input: 'w=10 late=4 1#a 3#b 4#c 12#d 3#b 14#e 9#f 15#g 23#h 2#i 31#j',
      inputLabel: 'w = window size, late = allowed lateness, then events as time#id in ARRIVAL order',
      gen: function (input) {
        var w = 10, late = 4, ev = [];
        String(input).trim().split(/\s+/).forEach(function (tok) {
          var m;
          if ((m = tok.match(/^w=(\d+)$/i))) { w = Number(m[1]); return; }
          if ((m = tok.match(/^late=(\d+)$/i))) { late = Number(m[1]); return; }
          m = tok.match(/^(\d+)#([A-Za-z0-9]+)$/);
          if (!m) throw new Error('Events look like 12#d (event time, #, click id). Optional: w=10 late=4');
          ev.push([Number(m[1]), m[2]]);
        });
        if (!(w >= 2 && w <= 60)) throw new Error('w must be 2 to 60');
        if (late > 60) throw new Error('late must be at most 60');
        if (ev.length < 4 || ev.length > 20) throw new Error('Give between 4 and 20 events');
        var maxAll = Math.max.apply(null, ev.map(function (e) { return e[0]; })), nW = Math.floor(maxAll / w) + 1;
        if (nW > 8) throw new Error('Too many windows (' + nW + '). Use a larger w or smaller times (max 8 windows).');
        var counts = [], closed = [], i, seen = {}, maxT = null, nCount = 0, nDup = 0, nLate = 0, frames = [];
        for (i = 0; i < nW; i++) { counts.push(0); closed.push(false); }
        var labels = counts.map(function (_, j) { return (j * w) + '-' + ((j + 1) * w); });
        function wm() { return maxT === null ? '-∞' : maxT - late; }
        function snap(narr, cur, bad, evt, note) {
          var vals = { 'arriving': evt || '(none yet)', 'max event time': maxT === null ? '-' : maxT };
          vals['watermark = max - ' + late] = wm(); vals.counted = nCount; vals.duplicates = nDup; vals['late (dropped)'] = nLate;
          var hl = {}; closed.forEach(function (c, j) { hl[j] = c ? 'done' : 'win'; });
          if (cur !== null) hl[cur] = bad ? 'bad' : 'cur';
          return { narr: narr, parts: [
            { type: 'bars', label: 'Clicks per tumbling window (faded = closed and emitted, blue = still open)', values: counts.slice(), hl: hl, idxLabels: labels, texts: closed.map(function (c, j) { return counts[j] + (c ? ' ✓' : ''); }) },
            { type: 'vars', vals: vals, hl: note || {} }
          ] };
        }
        frames.push(snap('Window size is <b>' + w + '</b> time units, allowed lateness <b>' + late + '</b>. Clicks arrive in the order listed (<b>arrival order</b>, not time order). The watermark starts at -∞, so no window is closed yet.', null, false, null, null));
        ev.forEach(function (e) {
          var t = e[0], id = e[1], wi = Math.floor(t / w), label = t + '#' + id, msg, note = {};
          if (seen[id]) {
            nDup++; msg = 'Click <b>' + label + '</b>: id <b>' + id + '</b> was already counted → <span class="c-r">duplicate, dropped</span> (the ingest layer is at-least-once, so repeats happen). Counting it again would overbill the advertiser.'; note = { duplicates: 'bad' };
            frames.push(snap(msg, wi, true, label, note)); return;
          }
          if ((wi + 1) * w <= (maxT === null ? -Infinity : maxT - late)) {
            nLate++; msg = 'Click <b>' + label + '</b> belongs to window ' + labels[wi] + ', but the watermark (' + wm() + ') already passed that window\'s end (' + ((wi + 1) * w) + '). The window is <b>closed and emitted</b> → <span class="c-r">too late</span>, sent to the late side-output for the nightly batch to fix.'; note = { 'late (dropped)': 'bad' };
            frames.push(snap(msg, wi, true, label, note)); return;
          }
          seen[id] = true; counts[wi]++; nCount++;
          maxT = maxT === null ? t : Math.max(maxT, t);
          var newly = [];
          for (i = 0; i < nW; i++) if (!closed[i] && (i + 1) * w <= maxT - late) { closed[i] = true; newly.push(i); }
          msg = 'Click <b>' + label + '</b> is new → add 1 to window <b>' + labels[wi] + '</b>. Max event time is now ' + maxT + ', so the watermark is ' + maxT + ' - ' + late + ' = <b>' + (maxT - late) + '</b>.';
          if (newly.length) msg += ' <span class="c-g">Watermark passed the end of window ' + newly.map(function (j) { return labels[j]; }).join(', ') + ' → close it and emit its count (' + newly.map(function (j) { return counts[j]; }).join(', ') + ') to the database as an upsert.</span>';
          else msg += ' No window end is behind the watermark yet, so everything stays open.';
          note = { counted: 'ok' }; if (newly.length) note['watermark = max - ' + late] = 'sel';
          frames.push(snap(msg, wi, false, label, note));
        });
        frames.push(snap('Stream finished: <b>' + nCount + '</b> clicks counted, <b>' + nDup + '</b> duplicates removed, <b>' + nLate + '</b> late clicks diverted. Closed windows are final; open windows will be emitted when a later event moves the watermark (or when the job flushes at shutdown). The late pile is added by the next batch recompute from raw logs, so the final billing numbers are exact.', null, false, '(end)', { 'late (dropped)': nLate ? 'bad' : 'ok' }));
        return frames;
      }
    },
    examples: [
      { title: 'Tumbling vs sliding vs session windows', html: `${H.table(['Window', 'Shape', 'Use for', 'Cost'], [['<b>Tumbling</b>', 'fixed boxes: 0-10, 10-20 ...; each event in exactly one', 'per-minute click counts, billing', 'cheapest: 1 counter per box'], ['<b>Sliding (hopping)</b>', 'size 5 min, moves every 1 min; each event in 5 windows', '"clicks in the last 5 minutes" refreshed each minute', '5x the state and writes; or compute from 1-minute tumbling buckets'], ['<b>Session</b>', 'gap-based: closes after 30 min of no clicks per user', 'user sessions, funnels', 'dynamic windows, merging logic']])}
        <p>Trick: compute 1-minute tumbling counts once, then answer "last 5 minutes" by summing 5 buckets at query time. Cheap and exact.</p>` },
      { title: 'Event time vs processing time', html: `<p>A phone clicks an ad at 10:00:05 but is in a tunnel; the event reaches us at 10:03:40. <b>Processing time</b> (when we see it) would put it in the 10:03 minute - wrong for the advertiser's report. <b>Event time</b> (the timestamp in the event) puts it in 10:00. To make event-time windows close, we need the <b>watermark</b>: "I am fairly sure no events older than T are still coming." Phones can lie about the clock, so the click server also stamps ingest time and rejects events too far in the future or past.</p>` },
      { title: 'Hot ad: salting and two-stage aggregation', html: `<p>One ad gets 40% of 300K clicks/s = 120K/s - but a single partition and a single operator instance can only take, say, 30K/s. Fix: <b>stage 1</b> keys by <code>(ad_id, random 0-9)</code> so the work spreads over 10 workers and each emits a partial count per window; <b>stage 2</b> keys by <code>ad_id</code> and adds the 10 partials. Dedup must happen <i>before</i> salting (key by click_id or by ad_id) so a duplicate cannot land in two different salts.</p>
        ${H.table(['Stage', 'Key', 'Work', 'Output'], [['1: partial', '(ad_id, salt)', 'count clicks in the window', '10 partial counts per window'], ['2: final', 'ad_id', 'sum the partials', '1 final count per window']])}` },
      { title: 'Top-N ads with a heap', html: `<p>For the last hour: keep per-ad counts in a map; maintain a size-100 min-heap of (count, ad). When a window closes, push/update. For <b>every</b> shard compute its local top-100 and merge into a global top-100 (a top-N of the shard tops is exact only if ads are partitioned by ad_id, which they are). If you must handle billions of distinct keys in tiny memory, use a <b>Count-Min Sketch</b> + heap for an approximate answer - fine for a "trending" widget, <b>not</b> for billing.</p>` }
    ],
    deepDive: `<h4>🟣 Delivery guarantees and "exactly-once"</h4>
      <p>Clicks pass through several hops: browser → click server → Kafka → Flink → database. Each hop can duplicate (retries) or lose (crash). The recipe for <b>effectively-once</b> aggregates:</p>
      <ol>
        <li><b>Producer:</b> the click server writes to Kafka with acks=all and an idempotent producer (no duplicates from producer retries). It acknowledges the user only after the write (or accepts a tiny loss risk for the redirect, depending on business rules).</li>
        <li><b>Stream job:</b> reads Kafka offsets and updates keyed state; Flink <b>checkpoints</b> offsets and state atomically, so after a crash it rewinds to the last checkpoint and replays - state and offsets always agree.</li>
        <li><b>Sink:</b> replays would double-write; so the sink must be <b>idempotent</b>: <code>UPSERT (ad_id, window_start) → count</code>. Writing the final count for a window twice is harmless; adding to a counter twice is not. (Alternative: two-phase commit sink, heavier.)</li>
        <li><b>Source of truth:</b> raw events in the data lake. A batch job recomputes the day and overwrites the aggregate partitions. If the stream and batch disagree you investigate; billing uses the batch-verified numbers.</li>
      </ol>
      <h4>Dedup in detail</h4>
      <ul>
        <li>Each click has a unique <code>click_id</code> assigned at impression time. The stream job keeps <code>seen_ids</code> in RocksDB state keyed by ad_id; entries expire after <code>lateness + safety margin</code> (say 30 min). Memory: 300K/s × 1,800 s × 16 B ≈ 8.6 GB across the cluster - fine.</li>
        <li>A <b>Bloom filter</b> shrinks memory ~10x but has false positives = <i>real clicks silently dropped</i>. For billing use exact state; use Bloom only for pre-filters or analytics.</li>
        <li>Duplicates arriving after the dedup TTL are caught by the nightly batch (which dedups the whole day by click_id).</li>
        <li>Distinguish <b>technical duplicates</b> (same click delivered twice - drop) from <b>fraud</b> (many distinct clicks from one bot - separate pipeline: per-IP/device rate rules, ML scoring, click-farm detection; mark rather than delete so advertisers can be credited).</li>
      </ul>
      <h4>Watermarks and lateness trade-off</h4>
      <p>Allowed lateness of 5 minutes means every window result is delayed by 5 minutes but catches nearly all stragglers; 30 seconds gives fast dashboards but pushes more events into the late pile. Common design: <b>emit early (provisional) results</b> as the window fills, then <b>final</b> when the watermark passes, then <b>corrections</b> (upsert) for late events up to a longer bound. Dashboards show provisional numbers with a "still updating" marker; billing waits for the final batch.</p>
      <p>Per-partition watermarks: with many Kafka partitions the global watermark is the <i>minimum</i> across partitions, so one idle or slow partition stalls everything - configure idle-source detection.</p>
      <h4>Storage and queries</h4>
      <ul>
        <li><b>OLAP store choice:</b> ClickHouse/Druid/Pinot ingest from Kafka and answer group-by queries in milliseconds using columnar storage, pre-aggregation and time partitioning. A plain relational DB would struggle at billions of rows/day; a key-value store lacks flexible slicing.</li>
        <li><b>Rollups:</b> minute data kept 7-30 days, hourly 1 year, daily forever. Queries pick the coarsest table that fits the requested range. This cuts storage and makes year-long charts fast.</li>
        <li><b>Late corrections</b> only touch the partitions of the affected windows; partitioning by day keeps rewrites small.</li>
        <li>Unique users per ad need <b>HyperLogLog</b> sketches (mergeable across windows), not sets.</li>
      </ul>
      <h4>Failure modes</h4>
      <ul>
        <li><b>Kafka broker down:</b> replication factor 3 and min.insync.replicas=2; click servers buffer briefly in memory/disk and retry.</li>
        <li><b>Stream job crash:</b> restart from the last checkpoint (seconds-minutes); results are late, not lost.</li>
        <li><b>Backpressure:</b> if the sink is slow, Flink slows the source; Kafka retains data (days) so we catch up. Provision Kafka retention longer than your worst outage.</li>
        <li><b>Clock skew / bad timestamps:</b> clamp event time into [ingest - 1 day, ingest + 1 minute]; otherwise one phone from the year 2099 jumps the watermark and closes everything (the "max event time" rule is vulnerable - use a bounded watermark generator).</li>
        <li><b>Schema evolution:</b> versioned Avro/Protobuf with a schema registry.</li>
      </ul>
      <h4>Trade-offs to say out loud</h4>
      <ul><li>Latency vs accuracy (lateness window).</li><li>Exact dedup state (memory) vs probabilistic (errors).</li><li>Stream-only (kappa) is simpler; stream + batch reconciliation (lambda) is safer for money.</li><li>Pre-aggregation loses detail (cannot answer new questions) - so always keep raw events.</li></ul>`,
    aiEra: `<p><b>What AI changes:</b> Ad systems are driven by ML: predicted click-through rate sets the auction, and fraud detection models (sequence models over click streams, graph models of device farms) filter invalid traffic before it is billed. Generative AI summarises campaign dashboards ("why did CPC jump on Tuesday?") on top of the aggregate tables. Attribution is moving to privacy-preserving, modelled measurement as third-party identifiers disappear - aggregation happens on noisy, thresholded data.</p>
        <p><b>Use AI as a partner:</b> <code>Generate a click stream with 5% duplicates, 3% late events and a clock-skewed device, and the exact expected window counts</code>; ask it to review your watermark settings against a latency histogram; have it draft the runbook for "dashboard numbers dropped 30%".</p>
        <p><b>Where AI goes wrong:</b> it often says "use Redis INCR per ad per minute" - which has no dedup, no event-time handling and double-counts on retries; or it claims Kafka "exactly-once" fixes the whole pipeline; or it recommends a Bloom filter for dedup without noting the billing impact of false positives.</p>
        <p><b>What you must still own:</b> choosing event time vs processing time, the lateness policy, where idempotency lives, and the reconciliation process that makes numbers trustworthy enough to bill.</p>`,
    problems: [{
      title: 'Count Clicks per Ad per Minute Exactly', level: 'Hard', tags: ['streaming', 'windows', 'dedup', 'hld'], companies: ['Google', 'Meta', 'Amazon', 'Snap'],
      statement: `<p>Design a system that ingests up to 300,000 ad click events per second and produces, for every ad, the number of valid clicks in each one-minute window. Dashboards should update within about a minute; advertisers are billed from the numbers, so they must be exact. Events can be duplicated by retries, arrive out of order and up to a few minutes late. One viral ad may account for a large share of traffic. Describe ingestion, processing, storage, queries and correctness guarantees.</p>`,
      constraints: `300K events/s peak · 10B/day · freshness ~1 min · billing-grade accuracy · events up to 5 min late · hot ads possible · raw data retained 90 days.`,
      example: `<p>Clicks (event time#id): 1#a 3#b 4#c 12#d 3#b 14#e 9#f. Window 0-10 closes when the watermark passes 10. Click 3#b repeats → dropped as a duplicate. Click 9#f arrives after the watermark reached 10 → late → fixed by the batch recompute. ${H.c('g', 'Window 0-10 = 3 on the stream, 4 after batch correction.')}</p>`,
      brute: { why: `<p>Each click server runs <code>UPDATE ad_stats SET clicks = clicks + 1 WHERE ad_id=? AND minute=?</code> in a relational DB. 300K writes/s on a few hot rows serialise on locks. A retry increments twice (no idempotency), late events land in the wrong minute if processing time is used, and a crash gives no way to know what was counted. Redis <code>INCR</code> is faster but has the same double-count and no replay story.</p>` },
      mcq: { q: 'Why should the sink write window results as an upsert keyed by (ad_id, window_start)?', options: ['Replays after a crash rewrite the same value instead of adding twice', 'It makes the query faster', 'It removes the need for Kafka'], answer: 0, explain: 'Stream jobs replay events after a failure. An idempotent upsert makes the replay harmless, giving an exactly-once effect even though processing is at-least-once.' },
      hints: [`<p>Separate the three problems: moving events safely (Kafka), counting in time boxes correctly (event-time windows), and storing results idempotently.</p>`, `<p>Kafka keyed by ad_id → Flink with keyed dedup state, event-time tumbling windows and a watermark → upsert into an OLAP store; raw events to a data lake for nightly recompute.</p>`, `<p>Edge cases: hot key (salt + two-stage), late data (allowed lateness, side output, batch fix), duplicate after dedup TTL (batch dedup), bad timestamps (clamp), idle partitions stalling the watermark, backpressure and Kafka retention, fraud flagging.</p>`],
      solution: {
        approach: `<p><b>Ingest.</b> Stateless click servers validate the signed click token, stamp ingest time, write to Kafka (acks=all, idempotent producer, key = ad_id, replication 3) and redirect the user. A Kafka Connect job copies every event to object storage (Parquet, hourly partitions) as the system of record.</p>
          <p><b>Stream processing.</b> A Flink job reads the topic. Step 1: dedup by click_id using keyed RocksDB state with a 30-minute TTL. Step 2: clamp event time and drop obvious bot events (marked, not deleted). Step 3: key by (ad_id, salt) for hot ads, assign each event to a one-minute tumbling window by event time, keep a counter in state, and use a bounded-out-of-orderness watermark (5 minutes). When the watermark passes the window end, emit the partial count; stage 2 keyed by ad_id sums the salted partials and emits the final count. Events later than the allowed lateness go to a side output topic.</p>
          <p><b>Storage.</b> Results are upserted into ClickHouse/Druid keyed by (ad_id, window_start), so a replay after a checkpoint restore rewrites identical values. Hourly and daily rollups are produced from the minute table. Dashboards read the OLAP store; unique users use HyperLogLog sketches.</p>
          <p><b>Correctness.</b> Flink checkpoints (offsets + state) give exactly-once state updates; the idempotent sink extends this to the database. A nightly Spark job recomputes the previous day from raw data (global dedup by click_id, includes the late side output) and overwrites the minute partitions; billing uses the verified numbers. Alerts compare stream and batch totals and flag drift above 0.1%.</p>
          <p><b>Scale and failure.</b> 300K/s over ~64 Kafka partitions and ~64 Flink slots; backpressure plus multi-day Kafka retention handle sink outages; idle-source detection keeps the watermark moving.</p>`,
        complexity: `<p>Per event O(1) state lookup and counter update. State: dedup ids ≈ 8-10 GB across the cluster; window counters = active ads × open windows (tiny). Storage: ~2 TB/day raw (compressed 5-10x), aggregates in the tens of GB.</p>`,
        followUps: ['How would you show "clicks in the last 5 minutes" refreshed every 10 seconds?', 'How do you retroactively remove click-farm traffic discovered a week later?']
      }
    }]
  });

  /* ================= PRACTICE ================= */
  practice.push({
    title: 'Pick a Geohash Length', level: 'Easy', tags: ['geohash', 'estimation', 'hld'], companies: ['Uber', 'Lyft'],
    statement: `<p>A food-delivery app wants to find couriers within about <b>1 km</b> of a restaurant. You store each courier under a geohash string. Which geohash length would you choose, how many cells must a query read, and why is reading just the restaurant's own cell not enough?</p>`,
    constraints: `Reference sizes: length 5 ≈ 4.9 km × 4.9 km, length 6 ≈ 1.2 km × 0.6 km, length 7 ≈ 153 m × 153 m. Query must never miss a courier that is inside 1 km.`,
    example: `<p>Restaurant at cell <code>9q8yyk</code> (length 6). A courier 80 m away stands across a cell edge in <code>9q8yym</code>. ${H.c('r', 'Own cell only → courier missed.')} ${H.c('g', 'Own cell + 8 neighbours → found.')}</p>`,
    brute: { why: `<p>Scan every courier in the city and compute the distance to the restaurant: with 200K couriers and 5,000 requests per minute that is ~17M distance computations per second, all wasted on couriers 30 km away.</p>` },
    mcq: { q: 'A length-6 cell is about 1.2 km × 0.6 km. For a 1 km search, what is the safest query?', options: ['The home cell plus its 8 neighbours', 'Only the home cell', 'Only the parent cell of length 3'], answer: 0, explain: 'The radius can cross the cell edge in any direction, so the 3×3 block of cells is read and results are then filtered by real distance.' },
    hints: [`<p>Match the cell size to the search radius: a cell should be roughly as big as the radius, not 100x bigger or smaller.</p>`, `<p>Length 6 (about 1 km) fits. Always query the 3×3 block because points near the edge sit in neighbouring cells.</p>`, `<p>Then compute the exact distance for the few dozen candidates and filter to 1 km. If the area is rural and the cells are empty, move one level up (length 5).</p>`],
    solution: {
      approach: `<p>Choose <b>length 6</b>: a cell is about 1.2 km by 0.6 km, comparable to the 1 km radius, so each cell holds a manageable number of couriers. For each query compute the restaurant's cell, then the 8 neighbours (compute by stepping one cell width/height from the cell centre and re-encoding). Read these <b>9 cells</b> (9 O(1) key lookups in an in-memory map or Redis sets), collect couriers, compute the real great-circle distance for each, discard those beyond 1 km and sort by distance.</p>
        <p>Reading only the home cell is wrong because the cell edge is arbitrary: a courier 5 metres away but across the line has a different hash prefix. Length 7 cells (153 m) would require reading a 13×13 block to cover 1 km; length 5 cells (4.9 km) would return too many far couriers. So length 6 balances candidate count against number of lookups.</p>`,
      complexity: `<p>9 lookups plus the couriers in 9 cells (tens to hundreds). Independent of the city's total courier count.</p>`,
      followUps: ['What changes near the poles or the date line?', 'How would H3 hexagons change the neighbour count?']
    }
  });
  practice.push({
    title: 'Idempotency Key Decision Table', level: 'Easy', tags: ['idempotency', 'payments', 'api'], companies: ['Stripe', 'PayPal'],
    statement: `<p>Your payment API stores for every <code>Idempotency-Key</code> a request hash, a state (IN_PROGRESS or COMPLETED) and the saved response. List what the server should answer in each situation: (1) key never seen, (2) key seen, COMPLETED, same body, (3) key seen, IN_PROGRESS, (4) key seen, different body. Explain why each answer is chosen.</p>`,
    constraints: `Unique constraint on the key · responses must be byte-identical on replay · keys kept 24 h.`,
    example: `<p>Key K1, body {amount: 100}: first call → 200 and saved. Second call same key and body → ${H.c('g', 'same 200, no new charge')}. Third call same key with {amount: 500} → ${H.c('r', '422 error')}.</p>`,
    brute: { why: `<p>No key at all: every retry is a fresh payment. A timeout on the client side then produces a double charge. Another weak idea, "check the last payment by the same user in the past minute", wrongly blocks legitimate second purchases and still races under concurrency.</p>` },
    mcq: { q: 'The same key arrives while the first request is still running. What should the server do?', options: ['Return 409 (or wait briefly) - do not start a second charge', 'Start a second charge to be safe', 'Delete the key and start over'], answer: 0, explain: 'The unique key row is a lock. A concurrent duplicate must not start new work; it reports "in progress" or waits for the first to finish.' },
    hints: [`<p>The key row is created before any side effect; the database unique constraint decides who is first.</p>`, `<p>You need three stored facts: the request hash, the state and the saved response.</p>`, `<p>Crash case: an IN_PROGRESS row whose worker died needs a lease (locked_until) so a retry can take over after it expires.</p>`],
    solution: {
      approach: `<p><b>(1) Never seen:</b> insert the key row (IN_PROGRESS) atomically, process, store the response, mark COMPLETED. <b>(2) COMPLETED + same hash:</b> return the saved status code and body unchanged - the retry is harmless because no side effects run again. <b>(3) IN_PROGRESS:</b> return 409 "request in progress" (or wait a few seconds and then replay), never start parallel work; add a lease so a crashed worker's key becomes claimable after a timeout. <b>(4) Different hash:</b> return 422 - the client reused a key for another request, which is a bug; guessing could charge the wrong amount.</p>
        <p>All four rely on one atomic operation: INSERT with a unique constraint (or ON CONFLICT) so that exactly one concurrent request wins. The key must be created by the client once per user intent, and passed downstream to the card network so that the external call is idempotent too.</p>`,
      complexity: `<p>One indexed insert or lookup per request: O(1). Storage: ~300 B per key for the retention window.</p>`,
      followUps: ['How long should keys be retained?', 'What if the response was large - store it or recompute it?']
    }
  });
  practice.push({
    title: 'How Many Map Tiles?', level: 'Easy', tags: ['estimation', 'tiles', 'maps'], companies: ['Google', 'Apple'],
    statement: `<p>A map uses the standard tile pyramid: zoom level z has 2<sup>z</sup> × 2<sup>z</sup> tiles, each tile covering a quarter of its parent. Compute the tile count at zoom 0, 10, 15 and 18. If an average vector tile is 20 KB, estimate the storage for zoom 15 if only 5% of tiles are non-empty. What does this tell you about precomputing everything?</p>`,
    constraints: `4<sup>z</sup> tiles at zoom z · 20 KB average non-empty tile · 5% non-empty at zoom 15.`,
    example: `<p>Zoom 10: 2<sup>10</sup> × 2<sup>10</sup> = 1,048,576 tiles. Zoom 15: 2<sup>30</sup> ≈ 1.07 billion tiles. ${H.c('g', '5% × 1.07B × 20 KB ≈ 1.07 TB')}.</p>`,
    brute: { why: `<p>Render and store every tile at every zoom up to 20: 4<sup>20</sup> ≈ 1.1 trillion tiles at the deepest level alone - petabytes, most of which no one will ever look at (open ocean, deserts), and everything must be rebuilt when roads change.</p>` },
    mcq: { q: 'Going from zoom 14 to zoom 15 multiplies the number of tiles by', options: ['4', '2', '16'], answer: 0, explain: 'Each tile splits into 4 children (2 in each direction), so the count multiplies by 4 per zoom level.' },
    hints: [`<p>Each zoom level doubles the number of columns and rows.</p>`, `<p>Tile count = 4<sup>z</sup>; multiply by the non-empty fraction and the tile size.</p>`, `<p>Think about which tiles real users request - most of the globe at high zoom is empty or rarely visited, so lazy generation plus CDN caching beats precomputing everything.</p>`],
    solution: {
      approach: `<p>Zoom 0: 4<sup>0</sup> = 1 tile. Zoom 10: 4<sup>10</sup> = 1,048,576. Zoom 15: 4<sup>15</sup> = 1,073,741,824. Zoom 18: 4<sup>18</sup> ≈ 68.7 billion. Storage at zoom 15 with 5% non-empty: 0.05 × 1.07 × 10<sup>9</sup> × 20 KB ≈ 1.07 TB. At zoom 18 the same assumption gives ~69 TB for that single level, and levels 19-20 would add 16x and 256x more.</p>
        <p>Conclusion: precompute the lower zoom levels (up to about 12-14) where the tile count is manageable and traffic is heavy, and treat the deepest levels lazily: render on first request, store in object storage, serve through a CDN with immutable versioned URLs. Empty tiles (ocean) share one object. This is the standard answer to "how do you store billions of tiles".</p>`,
      complexity: `<p>Counting is O(1) arithmetic. The takeaway is exponential growth: 4x more tiles per zoom level.</p>`,
      followUps: ['How would a vector tile change the storage estimate versus raster images?', 'How does the CDN hit rate relate to zoom level?']
    }
  });
  practice.push({
    title: 'Record a Payment With a Fee', level: 'Easy', tags: ['ledger', 'double-entry', 'payments'], companies: ['Stripe', 'Square'],
    statement: `<p>A customer pays <b>$50.00</b> to a merchant. The platform keeps a fee of <b>$2.00</b>. Write the double-entry ledger lines for this payment (account, debit, credit), then the lines for a full refund. Show that each transaction balances.</p>`,
    constraints: `Use integer cents (5000 and 200). Accounts: card_clearing (asset), merchant_payable (liability), fee_revenue (income). Never edit existing lines.`,
    example: `<p>${H.table(['Txn', 'Account', 'Debit', 'Credit'], [['T1', 'card_clearing', '5000', ''], ['T1', 'merchant_payable', '', '4800'], ['T1', 'fee_revenue', '', '200']])}Debits 5000 = credits 5000 → ${H.c('g', 'balanced')}.</p>`,
    brute: { why: `<p>Keep one balance column per merchant and add 48.00 to it. You lose the story: where did the fee go, was the amount refunded, did two requests both add? Concurrent updates can overwrite each other, and there is nothing to audit or reconcile against the card network.</p>` },
    mcq: { q: 'How should the refund be recorded?', options: ['A new transaction with the opposite lines', 'Delete the original lines', 'Edit the original lines to zero'], answer: 0, explain: 'The ledger is append-only. A refund is a new transaction that reverses the effects; history stays intact for audits.' },
    hints: [`<p>Every transaction needs total debits equal to total credits.</p>`, `<p>The platform receives $50 (asset up = debit), owes the merchant $48 (liability up = credit) and earns $2 (income up = credit).</p>`, `<p>For the refund flip each line: debit merchant_payable 4800, debit fee_revenue 200, credit card_clearing 5000. Link it to T1 with reverses_txn_id.</p>`],
    solution: {
      approach: `<p><b>Payment T1:</b> debit card_clearing 5000; credit merchant_payable 4800; credit fee_revenue 200. Debits 5000 = credits 5000. <b>Refund T2</b> (own idempotency key, linked to T1): debit merchant_payable 4800; debit fee_revenue 200; credit card_clearing 5000. Debits 5000 = credits 5000. After both, every account's net movement is zero, but both transactions remain visible forever.</p>
        <p>If the merchant had already been paid out, the debit to merchant_payable would make that balance negative; the system then recovers the money from future payouts or a reserve - a policy decision, not a ledger hack. Never edit or delete lines; fix errors by posting corrections. Use integer cents so rounding never creates or loses a cent.</p>`,
      complexity: `<p>Three inserts per transaction in one database transaction; O(1).</p>`,
      followUps: ['How would a partial refund of $20 split the fee?', 'Where would a chargeback fee be booked?']
    }
  });
  practice.push({
    title: 'Hold Expiry vs Late Payment', level: 'Medium', tags: ['ticketing', 'ttl', 'concurrency'], companies: ['Ticketmaster', 'BookMyShow'],
    statement: `<p>A user holds seat C7 for 10 minutes. They enter card details at minute 9 and 3-D Secure takes 90 seconds, so the confirmation call arrives at minute 10.5 - after the hold expired. Meanwhile another user may have taken the seat. Design what happens, for both cases: the seat is still free, and the seat was taken by someone else.</p>`,
    constraints: `Hold TTL 10 min · payment 5-120 s · must never double sell · must never charge a customer without a ticket (or must refund quickly).`,
    example: `<p>Minute 10:00 hold expires → minute 10:30 payment succeeds. Seat still free → ${H.c('g', 'try to re-acquire and confirm')}. Seat taken → ${H.c('r', 'auto-refund and apologise')}.</p>`,
    brute: { why: `<p>Ignore the problem: mark seat SOLD when payment succeeds without checking the hold. Two customers can both pay for C7 and one ticket is oversold. The opposite naive rule - always fail late payments - silently takes money and gives nothing unless a refund job exists.</p>` },
    mcq: { q: 'Which protects the user best when payment starts near the end of the hold?', options: ['Extend the hold when payment begins (PAYMENT_PENDING)', 'Make the TTL one hour for everyone', 'Skip the hold check at confirm'], answer: 0, explain: 'A short extension tied to an in-flight payment keeps the TTL short for abandoned carts while protecting people who are actually paying.' },
    hints: [`<p>Distinguish "user is browsing" holds from "payment is in flight" holds.</p>`, `<p>State machine: FREE → HELD → PAYMENT_PENDING → SOLD, with TTL on HELD and a longer one on PAYMENT_PENDING.</p>`, `<p>At confirm use a conditional update keyed by hold_id. If it fails after a successful charge, run the compensating refund via the saga/outbox; show a clear message and keep the user's place in the queue.</p>`],
    solution: {
      approach: `<p>Add a <b>PAYMENT_PENDING</b> state. When the user submits payment, the booking service calls an atomic <code>extend-hold</code> (only if the hold_id still owns the seat) adding about 3 minutes, so slow 3-D Secure flows are safe. The charge uses an idempotency key. On success, one SQL transaction runs <code>UPDATE seats SET status='SOLD' WHERE seat=? AND hold_id=? AND status IN ('HELD','PAYMENT_PENDING')</code> and inserts the booking and an outbox row.</p>
        <p>If the extension failed because the hold had already expired: (a) before charging, check again; if the seat is free, atomically re-acquire a fresh hold for this user and continue; (b) if the seat is taken, do not charge at all - tell the user immediately. If the charge was already authorised when the conditional update fails (rare race), void the authorisation or refund automatically through a compensating step, notify the user, and offer similar seats. A nightly reconciliation of payments against bookings catches anything that slipped through.</p>`,
      complexity: `<p>Constant-time atomic operations per seat; no long-held DB locks.</p>`,
      followUps: ['How do you stop people extending holds forever by restarting payment?', 'What is the user experience when Redis fails over mid-hold?']
    }
  });
  practice.push({
    title: 'Surge Heat Map per Cell', level: 'Medium', tags: ['streaming', 'geohash', 'windows'], companies: ['Uber', 'Ola', 'Grab'],
    statement: `<p>Compute a surge multiplier for every city cell (geohash length 6) every 30 seconds from two streams: ride requests and available-driver heartbeats. Describe the pipeline, the window type, how to avoid jumpy prices at cell borders, and where the result is stored for the pricing API.</p>`,
    constraints: `~1,200 requests/s and 250K driver pings/s at peak · update every 30 s · price lookups &lt; 10 ms · multiplier changes must be smooth.`,
    example: `<p>Cell 9q8yyk, last minute: 40 requests, 20 available drivers → ratio 2.0 → multiplier 1.5x. Neighbouring cell ratio 1.0 → 1.0x. After smoothing the border price is ~1.25x.</p>`,
    brute: { why: `<p>For each pricing call, query the live driver table and count requests in the cell. 250K updates/s make live counting expensive, results differ between two calls a second apart, and prices flicker from request to request.</p>` },
    mcq: { q: 'Which window fits "recompute every 30 s over the last 2 minutes"?', options: ['Sliding (hopping) window: size 2 min, slide 30 s', 'Tumbling window of 30 s', 'Session window'], answer: 0, explain: 'A sliding window with a 30 s slide gives frequent updates while smoothing over 2 minutes of data.' },
    hints: [`<p>Aggregate per cell, not per ride: the key is the geohash.</p>`, `<p>Stream job: requests count and distinct available drivers per cell in a sliding window; compute the ratio.</p>`, `<p>Smooth over time (exponential average) and space (blend with neighbour cells, or use H3 rings); cap the change per interval; store (cell → multiplier, version) with a TTL in Redis.</p>`],
    solution: {
      approach: `<p>Kafka topics for ride requests and driver heartbeats, both keyed by geohash-6 cell. A Flink job uses a 2-minute window sliding every 30 seconds: count of open requests per cell and count of distinct available drivers (latest heartbeat per driver within the window, from keyed state). Supply-demand ratio r = requests / max(drivers, 1). A piecewise function maps r to a multiplier (for example 1.0 up to 1.0 ratio, then +0.25 per +0.5 up to a cap of 3.0).</p>
        <p>To avoid border jumps, blend each cell's value with the average of its 8 neighbours (weights 0.6/0.4) and apply an exponential moving average over time, limiting change to ±0.25 per update. Write <code>surge:{cell} → {multiplier, version}</code> to Redis with a 2-minute TTL; if a cell has no data it falls back to 1.0. The pricing API reads the single key (sub-millisecond), and shows the multiplier to the rider before confirming, locking it for a few minutes in the quote. Late heartbeats are ignored (supply data is perishable), so the job needs only a short lateness bound.</p>`,
      complexity: `<p>Per event O(1); state is active drivers (about 1M entries) plus per-cell counters.</p>`,
      followUps: ['How do you prevent drivers from gaming surge by going offline together?', 'What guardrails does the business need during emergencies?']
    }
  });
  practice.push({
    title: 'Airport Hot Cell', level: 'Medium', tags: ['sharding', 'hot partition', 'geospatial'], companies: ['Uber', 'Lyft'],
    statement: `<p>Your driver-location index is sharded by geohash prefix. At 6 pm on Friday the airport cell holds 8,000 drivers and receives 20x the average read traffic, overloading one shard. How do you detect and fix this without changing the product behaviour?</p>`,
    constraints: `Shard capacity 20K ops/s · airport cell 80K ops/s · query p99 &lt; 100 ms · no downtime.`,
    example: `<p>Shard "9q8y" normally runs at 5K ops/s. A flight bank lands; the airport queries jump to 80K ops/s on the same shard → timeouts.</p>`,
    brute: { why: `<p>Add more machines to the whole cluster. Because every key in the airport cell still hashes to one shard, 15 new empty machines do nothing - classic hot-key problem.</p>` },
    mcq: { q: 'What helps a read-hot cell most?', options: ['Replicate the hot shard and spread reads across replicas', 'Use a longer geohash for every city', 'Increase the TTL'], answer: 0, explain: 'Reads are the problem; read replicas of just the hot shard multiply capacity. Splitting the cell into finer prefixes also spreads write load.' },
    hints: [`<p>Find out whether the hotspot is read-heavy, write-heavy, or both.</p>`, `<p>Reads: replicate the shard. Writes: split the hot cell into finer prefixes mapped to different shards.</p>`, `<p>Automate: monitor ops/s per cell, apply a dynamic shard map (consulted by routers), and keep the airport as a special "zone" with queueing logic of its own.</p>`],
    solution: {
      approach: `<p><b>Detect:</b> per-cell ops/s and per-shard CPU metrics with alerts; a top-N hot-cell report. <b>Reads:</b> give the hot shard 3-5 read replicas (the data is memory-resident and self-healing, so replication via the update stream is cheap); routers send queries round-robin to replicas. <b>Writes:</b> if updates are the issue (8,000 drivers × 1 ping/4 s = 2K writes/s - modest) nothing more is needed; if bigger, split the cell into length-7 children (32 children) mapped to different shards via a dynamic shard map with a version number, so a query for the airport fans out to a few shards and merges. <b>Product-level:</b> airports use a virtual queue (drivers wait in a geofenced lot, ordered FIFO), so the matching service asks one small queue structure instead of searching all 8,000 locations.</p>
        <p>Add admission control: cap fan-out, return partial results at the deadline, and cache the candidate list for the airport pickup zone for 1-2 seconds, since many riders query it simultaneously.</p>`,
      complexity: `<p>Reads scale linearly with replicas; fan-out cost for a split cell is bounded by the number of child shards touched.</p>`,
      followUps: ['What breaks if different routers have different shard maps?', 'How do you rebalance after the event ends?']
    }
  });
  practice.push({
    title: 'Trending Queries in Typeahead', level: 'Medium', tags: ['typeahead', 'streaming', 'freshness'], companies: ['Google', 'Twitter'],
    statement: `<p>Your autocomplete trie is rebuilt every 6 hours from logs. A breaking-news query starts at 9:00 and must appear in suggestions by 9:15. Design the freshness mechanism without rebuilding the whole trie every minute, and prevent an attacker from pushing a fake query into suggestions.</p>`,
    constraints: `Base trie rebuild every 6 h · freshness target 15 min · 1M suggest QPS · low memory for the fresh layer.`,
    example: `<p>Query "storm warning bay area" jumps from 5 searches/min to 8,000/min by 9:05 from 6,000 distinct users → included in suggestions for prefixes "storm", "storm w" ... by 9:10.</p>`,
    brute: { why: `<p>Update the live trie on every search: millions of writes per minute contend with reads, lists in nodes need constant re-sorting, one attacker with a script can force any string to the top, and a crash loses nothing but takes minutes to rebuild.</p>` },
    mcq: { q: 'Why count unique users instead of raw searches when promoting a trending query?', options: ['It resists scripted spam from a few clients', 'It makes the trie smaller', 'Unique users are faster to count'], answer: 0, explain: 'A bot can send a million searches; it is much harder to fake thousands of distinct real users.' },
    hints: [`<p>Two layers: a big stable base and a tiny fast fresh layer merged at query time.</p>`, `<p>Stream job with 5-minute windows computes growth rate and unique-user counts per normalised query.</p>`, `<p>Publish promoted queries (with a minimum unique-user threshold and a blocklist check) to a small in-memory map on each server; merge with the trie's top-K at request time and expire entries after a few hours.</p>`],
    solution: {
      approach: `<p><b>Pipeline.</b> Search events → Kafka → Flink. Normalise the query (lowercase, trim, language detection), then in 5-minute tumbling windows compute count and distinct users per query (HyperLogLog). Compare with the 24-hour baseline: promote when count is above a floor, the growth ratio is high (for example 10x) and distinct users exceed a threshold (for example 500). Promoted entries pass the blocklist and quality filters and are published to a compacted "fresh-suggestions" Kafka topic.</p>
        <p><b>Serving.</b> Every suggest server consumes that topic into a small in-memory prefix map (a few thousand entries, each keyed by all its prefixes or kept in a mini trie). On each request: take the base trie node's top-K plus fresh entries matching the prefix, re-score fresh ones with a recency boost, and return the top K. Fresh entries expire after a few hours or when the next base snapshot already contains them. CDN TTLs for popular short prefixes are kept to about 1-2 minutes so freshness is not hidden by caches.</p>
        <p><b>Abuse resistance.</b> Unique-user thresholds, per-IP/device rate limits, and human review hooks for sensitive categories.</p>`,
      complexity: `<p>Stream per event O(1); serving adds O(F) for F matching fresh entries, tiny.</p>`,
      followUps: ['How do you remove a suggestion immediately after a legal complaint?', 'How would you localise trending per country?']
    }
  });
  practice.push({
    title: 'Nearby Restaurants With Text Search', level: 'Medium', tags: ['geospatial', 'search', 'quadtree'], companies: ['Yelp', 'Google', 'Zomato'],
    statement: `<p>Design "pizza near me": the user types a text query and the app returns the best-matching places within 5 km, ranked by relevance, rating and distance. The index holds 200 million places worldwide that change slowly. Choose the geospatial and text indexing approach and explain the query flow.</p>`,
    constraints: `200M places · p99 &lt; 200 ms · 20K QPS · updates in minutes, not seconds · uneven density (Manhattan versus countryside).`,
    example: `<p>"pizza" at (40.74, -73.99) → candidate cells around the user, filter documents whose text matches "pizza", score = text relevance × rating × proximity.</p>`,
    brute: { why: `<p>Run a full-text query across all 200M places and then sort by distance (or vice versa). A global text match returns millions of pizza places worldwide; computing distances for all of them per request is far too slow.</p>` },
    mcq: { q: 'Why is a quadtree (adaptive cells) attractive for place search?', options: ['Dense downtown areas get small cells while sparse areas stay large', 'It gives exact distances', 'It needs no memory'], answer: 0, explain: 'Adaptive splitting keeps every leaf at a manageable size, so the candidate set stays small in both dense and sparse regions.' },
    hints: [`<p>First restrict by geography (cheap), then by text; do not do the reverse.</p>`, `<p>Index each place under a spatial cell id (S2/geohash level chosen by density, or quadtree leaf) inside the search engine alongside an inverted index of its text.</p>`, `<p>Query: compute cells covering a 5 km circle, run the text query restricted to those cells (a filter), score and return top N. Expand the radius if too few results.</p>`],
    solution: {
      approach: `<p>Use a search engine (Elasticsearch/Lucene style) where each place document has text fields, rating, and a spatial cell token set (S2 cell ids at a couple of levels, or geohash prefixes). The inverted index gives fast text matching; a filter on the covering cells gives the geographic restriction. For adaptivity, choose the cell level per region from density statistics (quadtree-like): downtown uses a deep level, countryside a shallow one. Shard the index by region (country/city or S2 level-4 cells) so a query touches one or two shards, with replicas for load.</p>
        <p><b>Flow:</b> compute the set of cell ids covering the 5 km circle around the user (a few dozen); the engine ANDs the text terms with those cell ids, scores with BM25 × rating × distance decay, and returns the top 20 after a final exact-distance filter. If fewer than N results, widen to the parent cells. Place updates stream in via Kafka and are indexed within minutes; the index is immutable segments, so reads are cache-friendly. Popular queries and cell results are cached for a minute.</p>`,
      complexity: `<p>Query touches only candidates in a handful of cells matching the text; typically thousands of documents scored instead of 200 million.</p>`,
      followUps: ['How would you add opening-hours filtering ("open now")?', 'How does ranking change when the user is walking versus driving?']
    }
  });
  practice.push({
    title: 'Chargeback and Refund Flow', level: 'Medium', tags: ['payments', 'ledger', 'state machine'], companies: ['Stripe', 'Adyen', 'Razorpay'],
    statement: `<p>Thirty days after a payment, the customer's bank raises a chargeback (a forced reversal plus a fee). Describe how your payment system models this: payment state machine changes, ledger entries, merchant balance impact, the evidence-submission window, and how you ensure the same chargeback webhook processed twice does nothing extra.</p>`,
    constraints: `Webhooks are at-least-once · ledger append-only · merchant may have been paid out already · chargeback fee $15.`,
    example: `<p>$100 payment, merchant received $97. Chargeback: platform loses $100 to the bank; merchant payable debited $100 (balance may go negative); a $15 fee is charged to the merchant.</p>`,
    brute: { why: `<p>Subtract the amount from the merchant balance column when the webhook arrives. A duplicate webhook subtracts twice, the original payment loses its link to the dispute, and nothing explains the negative balance during an audit.</p>` },
    mcq: { q: 'The chargeback webhook is delivered twice. What prevents double booking?', options: ['Dedup by the dispute id with a unique constraint before posting entries', 'Hoping the bank sends only one', 'Checking the merchant balance'], answer: 0, explain: 'Treat the external event id as an idempotency key: a unique row per dispute event means replays do nothing.' },
    hints: [`<p>A chargeback is another business event with its own lifecycle (opened, evidence, won or lost), not a mutation of the payment.</p>`, `<p>Post reversal entries when funds are withdrawn, and reverse them again if the dispute is won.</p>`, `<p>Handle a negative merchant balance with a reserve, deduction from future payouts, or collection; track the dispute id as the idempotency key.</p>`],
    solution: {
      approach: `<p><b>Model.</b> Create a <code>disputes</code> table (dispute_id unique, payment_id, amount, reason, state: OPENED → EVIDENCE_SUBMITTED → WON | LOST, deadline). The webhook handler inserts the dispute_id first (unique) so duplicate deliveries are ignored. The payment state moves to DISPUTED (a flag, not a destructive change).</p>
        <p><b>Ledger on OPENED</b> (funds are provisionally withdrawn by the bank): debit merchant_payable 10000 (and fee_revenue reversal if policy says so), credit card_clearing 10000; debit merchant_payable 1500 for the dispute fee, credit fee_revenue 1500. <b>If WON:</b> post the opposite entries for the 10000 (funds returned); the fee may be refunded or kept per policy. <b>If LOST:</b> nothing more - the earlier entries stand, and the payment ends as CHARGED_BACK.</p>
        <p>If the merchant's payable goes negative because payouts already happened, record the receivable and recover through future payouts or a rolling reserve; alert risk. Evidence upload before the deadline is tracked in the state machine. Everything is auditable because all steps are new rows linked by dispute_id and original txn id.</p>`,
      complexity: `<p>A few inserts per dispute event; negligible load compared with payments themselves.</p>`,
      followUps: ['How do you detect merchants with a rising dispute rate and act on it?', 'How would partial chargebacks differ?']
    }
  });
  practice.push({
    title: 'Live Traffic Pipeline from Phone Probes', level: 'Hard', tags: ['streaming', 'maps', 'map matching'], companies: ['Google', 'Waze', 'HERE'],
    statement: `<p>Millions of phones send (lat, lng, speed, timestamp) every few seconds. Design the pipeline that turns these into current speeds per road segment, used by the routing service every minute. Cover noise, sparse data, privacy, late data, freshness and failure handling.</p>`,
    constraints: `50M active phones · one probe per 5 s per phone while driving (say 20% driving) → ~2M probes/s · freshness ≤ 2 min · 500M road segments · privacy-preserving.`,
    example: `<p>Segment S42 (1 km). Probes in the last minute: 25 mph, 31 mph, 22 mph → median ≈ 25 mph → travel time 2.4 min instead of the free-flow 1.2 min. ${H.c('r', 'Traffic jam detected.')}</p>`,
    brute: { why: `<p>Store every GPS point in a database and run "average speed per road in the last 5 minutes" queries when routing. 2M inserts/s, a spatial join of points to roads per query, and 500M segments make routing latency unacceptable; raw GPS is also noisy (points land on the wrong parallel street) and privacy-sensitive.</p>` },
    mcq: { q: 'What is map matching?', options: ['Snapping noisy GPS points to the most likely road segment', 'Matching drivers to riders', 'Picking tiles for the screen'], answer: 0, explain: 'Raw GPS is off by several metres; map matching uses the road network and movement continuity (often an HMM) to decide which segment the phone really travelled on.' },
    hints: [`<p>Raw points are noisy: first work out which road each point belongs to.</p>`, `<p>Pipeline: ingest → anonymise → map-match → per-segment windowed aggregation (robust statistic like median) → write to a fast speed store.</p>`, `<p>Sparse data: fall back to historical speed for the hour of the week, and blend with neighbouring segments; require a minimum number of distinct devices before trusting live speed.</p>`],
    solution: {
      approach: `<p><b>Ingest and privacy.</b> Phones send batched probes over a compact protocol to regional gateways, which strip identifiers, replace the device id by a short-lived random trip token (rotated every few minutes), and drop the first and last few hundred metres of each trip. Events go to Kafka partitioned by geohash/S2 cell of the point.</p>
        <p><b>Map matching.</b> A stateful stream operator keeps the last few points per trip token and runs an HMM/Viterbi map matcher against the local road graph (loaded in memory per region): candidate segments within 30 m, emission probability by distance, transition probability by network distance versus straight-line travel. Output: (segment_id, direction, speed, event time) plus traversal times between segments, which are more reliable than instantaneous GPS speed.</p>
        <p><b>Aggregation.</b> Key by segment_id; one-minute tumbling windows (5-minute sliding for stability) with event-time watermarks (2 minutes lateness). Per window compute the median or trimmed mean speed and the number of distinct trips, discarding implausible values. If distinct trips are below a minimum (for example 3), mark low confidence and blend with the historical speed profile for that hour of week and with neighbour segments. Results are upserted into an in-memory store (Redis or an embedded map replicated to route servers) as segment_id → speed, confidence, version.</p>
        <p><b>Consumption and failure.</b> Route servers apply weights from the latest version atomically every minute (customisable hierarchy re-weighting). If the pipeline stalls, speeds age out to the historical profile via TTL, so routing degrades gracefully rather than failing. Raw anonymised data is also stored to build the historical profiles and ML ETA models offline.</p>`,
      complexity: `<p>Per probe O(candidate segments) for matching (small); aggregation O(1) per matched point; storage for speeds is 500M × ~16 B = 8 GB, partitionable by region.</p>`,
      followUps: ['How would you detect an accident or road closure from probe patterns?', 'How do you prevent a single fake device farm from faking a traffic jam?']
    }
  });
  practice.push({
    title: 'Group Booking and Best-Available Seats', level: 'Hard', tags: ['ticketing', 'algorithm', 'concurrency'], companies: ['Ticketmaster', 'Fandango'],
    statement: `<p>A user asks for 4 adjacent seats in the best available section. Design the "best available" search so that it is fast, does not hand the same seats to two users, and degrades gracefully when no 4 adjacent seats remain. The venue has 60,000 seats, with thousands of concurrent searches during a sale.</p>`,
    constraints: `60K seats · groups of 1-8 · p99 &lt; 300 ms · many concurrent searches · no double selling · adjacency within a row.`,
    example: `<p>Row F has free seats 3-4-5-6-9-10. A group of 4 gets F3-F6. A group of 3 asked after that gets F9-F10 + (none) → search continues in row G.</p>`,
    brute: { why: `<p>Scan every seat for each request and hold seats one by one. Scanning 60K seats per search is wasteful; seat-by-seat holds can partially succeed and strand seats; two searches see the same "best" block and both attempt it, causing mass conflicts and retries.</p>` },
    mcq: { q: 'Two users search at the same instant and both receive the same block of 4 seats as the best. What is the right design response?', options: ['Make the hold atomic all-or-nothing; the loser retries with the next candidate block', 'Let both pay and refund one', 'Lock the whole venue during a search'], answer: 0, explain: 'Search can be optimistic and read-only; the hold is the atomic step. The loser simply gets a conflict and moves on to the next block.' },
    hints: [`<p>Precompute, per row, the runs of consecutive free seats; searching then scans runs, not seats.</p>`, `<p>Keep per-section sorted lists of runs by quality; search finds the first run of length ≥ n.</p>`, `<p>The search result is a suggestion; the atomic multi-seat hold decides. On conflict take the next candidate; cap retries and fall back to splitting the group across adjacent rows.</p>`],
    solution: {
      approach: `<p><b>Data structure.</b> For each row keep a bitmap of free seats (60K seats → 60K bits ≈ 7.5 KB total; trivial). Maintain, per section, an index of free runs: (row, start, length) ordered by a precomputed seat-quality score (view, price tier). Updating a run on hold/release is O(1) amortised, splitting or merging neighbouring runs.</p>
        <p><b>Search.</b> To find n adjacent seats, iterate sections in quality order and, within a section, runs in quality order; pick the first run with length ≥ n and choose the best window inside it (centred, leaving no orphan single seat on either side - a standard rule avoiding unsellable "singletons"). If no run fits, relax: allow adjacent rows (same seat numbers), then split into two blocks, then offer the closest alternatives. The search runs against an in-memory replica and is read-only, so thousands of searches execute in parallel.</p>
        <p><b>Hold.</b> The chosen seats are held with the atomic all-or-nothing script (sorted seat ids, SET NX EX in one Lua call). On conflict, take the next candidate from the same result list without re-searching; after 3 conflicts re-run the search because the map changed. Holds and releases publish events that update the in-memory run index. Fairness during a sale is handled in front by the waiting room; a per-event single-writer actor can serialise search+hold if contention is extreme.</p>`,
      complexity: `<p>Search O(number of runs scanned) - usually a few hundred; hold O(n) atomic operations; memory a few MB per event.</p>`,
      followUps: ['How do you avoid leaving single orphan seats?', 'How would accessible seating and companion seats be modelled?']
    }
  });
  practice.push({
    title: 'Top Ads in the Last Hour With Late Data', level: 'Hard', tags: ['streaming', 'top-k', 'windows'], companies: ['Google', 'Meta', 'Pinterest'],
    statement: `<p>Extend the click aggregator with a dashboard widget "top 100 ads by clicks in the last 60 minutes", refreshed every 10 seconds. Clicks may arrive up to 5 minutes late. Design the computation so that it is accurate, does not recompute from scratch every 10 seconds, and survives a hot ad.</p>`,
    constraints: `300K clicks/s · 2M active ads · refresh every 10 s · lateness 5 min · memory-bounded · hot ad up to 30% of traffic.`,
    example: `<p>At 12:00:10 the widget lists ad 77 (41,200 clicks), ad 12 (39,800)... computed from sixty one-minute buckets, with the newest bucket still open.</p>`,
    brute: { why: `<p>Every 10 seconds run a SQL query summing the last 60 minutes of raw events and sorting: scans tens of billions of rows each time. Or a naive 60-minute sliding window with a 10-second slide means every click is counted in 360 overlapping windows - 360x write amplification.</p>` },
    mcq: { q: 'Which approach avoids 360x write amplification?', options: ['Keep small tumbling buckets and sum the last 60 at read/merge time', 'Maintain a separate counter for each of the 360 overlapping windows', 'Recount from raw logs every refresh'], answer: 0, explain: 'Pre-aggregate into fixed small buckets; the long window is a sum of buckets, so each click is written once.' },
    hints: [`<p>Use small tumbling windows (10 s or 1 min) as building blocks.</p>`, `<p>Per ad, a ring of 60 one-minute counters; a rolling total updated by adding the new bucket and subtracting the expired one.</p>`, `<p>Top-100: keep the rolling totals in a sorted structure or a per-shard heap; merge shard tops. Late events update older buckets and adjust the totals (and are bounded by the lateness).</p>`],
    solution: {
      approach: `<p><b>Buckets.</b> The stream job produces exact one-minute counts per ad (the earlier design: dedup, event time, watermark with 5 minutes lateness, salting for hot ads, upsert emits). Those minute counts feed a second job that maintains per ad a circular buffer of 60 bucket counts plus a running total. When bucket m is updated (initial value or late correction delta) the total changes by the delta; when the window advances, the expired bucket is subtracted. Thus each click touches O(1) state once, regardless of the window length.</p>
        <p><b>Top-K.</b> Partition by ad_id; each partition holds its ads' totals in an indexed heap (or a sorted skip list) and emits its local top-100 every 10 seconds. A merge stage combines the shard tops into the global top-100; because partitioning is by ad, the merge is exact (any global top-100 ad is in its own shard's top-100). The result is written to a small key (Redis) read by the dashboard; a cached snapshot version tracks refresh time.</p>
        <p><b>Late data and hot ads.</b> Late clicks (≤ 5 min) arrive as corrections to older minute buckets and just adjust totals; beyond that they are handled by the nightly batch. Hot ads are salted in the first aggregation stage, but the second stage keys by ad_id and receives only one partial count per minute per salt, so it is never hot. Memory: 2M ads × 60 buckets × 4 B ≈ 480 MB across the cluster. If cardinality were far larger, use Count-Min Sketch plus a heap for approximate trending (not billing).</p>`,
      complexity: `<p>Per minute-update O(1) plus heap maintenance O(log K); merge O(P × K) for P partitions every 10 s.</p>`,
      followUps: ['How would you support an arbitrary window length chosen by the user?', 'What changes if you need the top 100 per country?']
    }
  });
  practice.push({
    title: 'Merchant Payouts and Reconciliation', level: 'Hard', tags: ['payments', 'reconciliation', 'saga'], companies: ['Stripe', 'Shopify', 'Uber'],
    statement: `<p>Every night you must pay out 500,000 merchants through a bank, based on their payable balance. The bank accepts a payout file and returns a status file the next morning. Design the payout and reconciliation process: avoiding double payouts, handling failures and partial successes, hot accounts and detecting mismatches between the ledger and the bank.</p>`,
    constraints: `500K payouts/night · bank file processed asynchronously · a payout must never happen twice · ledger must always balance · mismatches investigated within 1 business day.`,
    example: `<p>Merchant M1 payable $1,240.50 → payout P-20260315-M1 for 124050 cents. Bank returns: 499,880 settled, 100 rejected (invalid account), 20 missing.</p>`,
    brute: { why: `<p>Loop over merchants, send each payout to the bank API and update balances afterwards. A crash mid-loop leaves unknown state: re-running pays some merchants twice; failures are invisible; and a single hot "platform cash" account updated by 500K transactions serialises everything.</p>` },
    mcq: { q: 'What makes re-running a failed payout batch safe?', options: ['Each payout has a deterministic id/idempotency key recorded before sending', 'Running it at night when traffic is low', 'Randomising the order'], answer: 0, explain: 'A deterministic payout id (merchant + date) plus a unique row means a rerun cannot create a second payout, and the bank can dedupe on the same reference.' },
    hints: [`<p>Separate the stages: decide payouts, reserve funds, send, then settle. Each stage is a persisted state.</p>`, `<p>Reserve in the ledger first (move payable → payout_in_transit) so the merchant balance cannot be paid twice; then send the file; then settle or reverse based on the bank's answer.</p>`, `<p>Reconcile by payout reference: three buckets - matched, missing at bank, unknown at bank. Retry the missing ones with the same reference; investigate unknown ones.</p>`],
    solution: {
      approach: `<p><b>Plan.</b> A batch job selects merchants with payable &gt; threshold and, in a single transaction per merchant (sharded by merchant_id), creates a <code>payouts</code> row with a deterministic id (merchant + payout date), state PLANNED, and posts the ledger reservation: debit merchant_payable, credit payout_in_transit. The unique payout id means a rerun skips merchants already planned. Hot-account avoidance: payout_in_transit and platform cash are split into N sub-accounts by hash and summed for reporting; or net per batch with a single summarising entry per batch.</p>
        <p><b>Send.</b> Build the bank file from PLANNED rows, record its hash and a batch id, mark rows SENT after upload (upload is idempotent by batch id). If the process crashes, a restart compares SENT/PLANNED state and re-sends only what the bank has not acknowledged, using the same references.</p>
        <p><b>Settle.</b> On the bank's status file, process each line idempotently by payout id: settled → debit payout_in_transit, credit bank_cash, state PAID; rejected → reverse the reservation (credit merchant_payable) and notify the merchant to fix details; missing → keep SENT and re-query/retry. <b>Reconcile:</b> after settlement compare counts and sums: ledger payout_in_transit total versus bank file totals; any payout id present on one side only goes to a break queue with an owner and an SLA. Alert on drift in total debits vs credits and on payouts stuck in SENT beyond a day. Everything is append-only and traceable to a payout id.</p>`,
      complexity: `<p>O(number of merchants) per night; sharded transactions allow parallel planning; the file is processed as a stream.</p>`,
      followUps: ['How do you handle payouts in multiple currencies?', 'What if the bank pays only part of the file because of a limit?']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push({ q: 'In a geohash, what does a longer shared prefix between two locations tell you?', options: ['They are inside the same, smaller cell, so they are close together', 'They are exactly the same distance apart as the prefix length', 'They have the same latitude'], answer: 0, explain: 'Each extra character halves the cell further. Sharing a long prefix means both points fall in the same small rectangle - but points close together can still have different prefixes across a cell edge.' });
  quiz.push({ q: 'Why does a nearby-driver search query the home cell plus its 8 neighbours?', options: ['A nearby driver may sit just across an arbitrary cell border', 'Geohash cells are always empty', 'To spread load over 9 databases'], answer: 0, explain: 'Cell borders are arbitrary lines. Reading the 3×3 block guarantees we do not miss close drivers, then exact distance filtering removes the far ones.' });
  quiz.push({ q: 'For driver location pings (250K writes per second), the best storage choice is', options: ['In-memory index with a short TTL, sharded by location', 'One SQL row update per ping with full durability', 'Append every ping to a data warehouse and query it live'], answer: 0, explain: 'Location data is tiny, perishable and self-healing (drivers re-ping every few seconds), so memory with a TTL is cheapest and fastest. Trip data is what needs durability.' });
  quiz.push({ q: 'What makes A* explore fewer nodes than Dijkstra?', options: ['It orders the queue by cost so far plus an optimistic estimate to the goal', 'It ignores edge weights', 'It stores every pair of shortest paths'], answer: 0, explain: 'The heuristic pulls the search toward the goal. As long as it never overestimates the remaining cost, A* still finds an optimal path.' });
  quiz.push({ q: 'Contraction hierarchies answer long routes quickly because', options: ['Precomputed shortcuts let each search climb only to important nodes and meet near the highway level', 'They remove all small roads permanently', 'They guess the route with machine learning'], answer: 0, explain: 'Shortcuts preserve distances, so the upward bidirectional searches touch only a few hundred nodes. The cost is slow preprocessing and trouble when edge weights (traffic) change.' });
  quiz.push({ q: 'Two users click the same seat at the same moment. Which mechanism prevents both from getting it?', options: ['An atomic set-if-not-exists (or conditional update) on that seat', 'Reading the seat status and then writing it in two steps', 'Showing a warning on the page'], answer: 0, explain: 'Check-then-write has a race window. An atomic SET NX or UPDATE ... WHERE status=FREE lets exactly one request succeed.' });
  quiz.push({ q: 'Why do seat holds use a TTL instead of waiting for the app to release them?', options: ['Abandoned or crashed checkouts clean themselves up automatically', 'TTLs make payment faster', 'To prevent users from paying'], answer: 0, explain: 'Users close tabs and apps crash. A TTL guarantees the seat comes back without relying on a cleanup message that may never be sent.' });
  quiz.push({ q: 'What is the purpose of an idempotency key on a payment request?', options: ['A retry of the same intent returns the original result and does not charge twice', 'It encrypts the card number', 'It speeds up the bank'], answer: 0, explain: 'Networks lose responses. The key lets the server recognise a retry of the same operation and replay the stored response instead of repeating the side effect.' });
  quiz.push({ q: 'In a double-entry ledger, a refund should be recorded by', options: ['Posting a new transaction with opposite entries', 'Editing the original entries', 'Deleting the payment row'], answer: 0, explain: 'The ledger is append-only for auditability. A reversing transaction cancels the effect while keeping the full history.' });
  quiz.push({ q: 'A call to the card network times out. The payment should be treated as', options: ['Unknown, to be resolved by status query, webhook or reconciliation', 'Failed, so the user can pay again immediately', 'Successful'], answer: 0, explain: 'A timeout says nothing about whether the other side acted. Guessing either way risks double charging or unpaid goods.' });
  quiz.push({ q: 'Why does each trie node cache its top-K completions?', options: ['So answering a prefix needs only the walk down the prefix, not a scan of the subtree', 'So the trie uses less memory', 'So words can be deleted faster'], answer: 0, explain: 'Without the cache a short prefix would require visiting millions of descendants. The extra memory buys O(prefix length) lookups.' });
  quiz.push({ q: 'A click belongs to a one-minute window by', options: ['Its event time (when it happened), with a watermark deciding when the window closes', 'The time our server received it', 'A random choice'], answer: 0, explain: 'Using event time makes counts correct despite delays and reordering. The watermark tells the system how long to wait for stragglers before emitting the result.' });
  quiz.push({ q: 'Which sink design gives an exactly-once effect when the stream job replays after a crash?', options: ['Idempotent upsert keyed by (ad_id, window_start)', 'Increment the stored counter by the window count', 'Append a new row every time'], answer: 0, explain: 'Replays rewrite the same value rather than adding it again, so at-least-once processing becomes effectively once.' });
  quiz.push({ q: 'Why is a Bloom filter risky for deduplicating billable clicks?', options: ['False positives silently drop real clicks', 'It cannot be used with Kafka', 'It uses too much CPU'], answer: 0, explain: 'A Bloom filter may claim it has seen an id it has not. For analytics that is acceptable; for billing every wrongly dropped click is lost revenue, so use exact keyed state.' });

  /* ================= INTERVIEW ================= */
  interview.push({ q: 'Walk me through how you would design the nearby-driver search for a ride-hailing app.', level: 'I',
    a: `<p>I would start with the numbers: about 1M online drivers pinging every 4 seconds is 250K writes per second, but each record is ~100 bytes, so the whole fleet is ~100 MB. That says: keep locations in memory with a short TTL, not in a disk database.</p>
      <p>I would index drivers by a <b>cell id</b> - geohash of length 6 (about 1.2 km cells) - in two maps: <code>cell → set of drivers</code> and <code>driver → cell</code>, so a move removes the driver from the old cell and adds to the new one atomically. A query reads the rider's cell plus its 8 neighbours, filters to AVAILABLE and fresh pings, computes distances for the few hundred candidates and returns the top N. The index is sharded by geohash prefix so each city lives on a few nodes. The matching service then ranks candidates by road ETA and offers the trip with a timeout; assignment uses a compare-and-set on driver state so a driver never gets two trips.</p>`,
    followUps: ['What if the airport cell is overloaded?', 'Why not use PostGIS for all of it?', 'How would you handle driver location at the poles or date line?'] });
  interview.push({ q: 'Compare geohash, quadtree, S2 and H3. When would you pick each?', level: 'A',
    a: `<p><b>Geohash</b> is the easiest: fixed rectangles encoded as strings, works in any key-value store, but cells are uniform and distort near the poles, and neighbour lookups are needed at borders. <b>Quadtree</b> is adaptive - dense areas split into small cells - which is great for static, unevenly distributed data like places, but it lives in memory as a tree and is harder to shard or keep updated for moving points. <b>S2</b> maps the sphere onto cells ordered by a Hilbert curve; nearby cells have nearby ids, so range scans on a sorted key work well and there is no pole distortion. <b>H3</b> uses hexagons: every neighbour is equidistant, which suits smoothing (surge pricing) and movement modelling.</p>
      <p>For a live moving-driver index I would pick a fixed grid (S2 or H3, or geohash if the store is simple) for cheap updates; for points of interest I would pick a quadtree-like adaptive S2 level or an R-tree in a search engine.</p>`,
    followUps: ['Why do hexagons smooth better than squares?', 'What is the boundary problem and how do you solve it?'] });
  interview.push({ q: 'How does a driver get matched to a rider, and how do you make sure a driver is never assigned two rides?', level: 'I',
    a: `<p>The matching service gets candidates from the location index, ranks them by pickup ETA and sends an offer to the best driver with a ~15 second timeout. The driver's state (AVAILABLE, OFFERED, ON_TRIP) lives in a store that supports atomic compare-and-set, for example <code>SET driver:7:state OFFERED NX EX 15</code> in Redis or a conditional UPDATE in the trip database. Only the worker that wins the CAS may send the offer, so two matchers cannot offer the same driver. When the driver accepts, the trip service performs a second CAS on the ride (REQUESTED → ACCEPTED) and the driver state moves to ON_TRIP. If the driver declines or times out, the TTL expires and the driver returns to AVAILABLE, and we offer to the next candidate.</p>
      <p>To improve global efficiency, many systems batch requests for a couple of seconds and solve an assignment problem (minimise total pickup time) instead of greedy nearest-first.</p>`,
    followUps: ['What are the downsides of batching?', 'What happens if the matching service crashes between offer and accept?'] });
  interview.push({ q: 'Explain Dijkstra, A* and contraction hierarchies, and why a maps service cannot use plain Dijkstra.', level: 'A',
    a: `<p><b>Dijkstra</b> expands nodes in order of distance from the start, like a ripple; it is optimal but explores a huge disc around the start, which on a graph with 10<sup>8</sup> nodes means millions of expansions per query - seconds, too slow for thousands of queries per second. <b>A*</b> adds an estimate of the remaining distance (straight line divided by max speed); the search leans toward the goal and explores far fewer nodes, still optimal if the estimate never overestimates. <b>Contraction hierarchies</b> precompute shortcuts: nodes are ranked by importance, unimportant ones are contracted while adding shortcut edges that preserve distances. A query runs a bidirectional search that only moves upward in rank, meeting near the highway level, touching a few hundred nodes - sub-millisecond.</p>
      <p>The catch is that traffic changes weights, which invalidates shortcuts, so production systems use customisable variants that separate structure from weights, plus graph partitioning into regions with an overlay graph.</p>`,
    followUps: ['What makes a heuristic admissible versus consistent?', 'How do you add live traffic to a precomputed hierarchy?'] });
  interview.push({ q: 'How are map tiles stored and served at global scale?', level: 'I',
    a: `<p>The world is a pyramid of tiles addressed by (zoom, x, y); each zoom level has 4x more tiles than the previous one. A batch pipeline builds vector tiles from map data and writes them to object storage under a versioned path like <code>map/v42/z/x/y</code>. Because tiles are immutable per version, they are cached by a CDN essentially forever, and a map update is just a new version prefix. The client computes visible tile addresses from the viewport and fetches them in parallel from the nearest edge. Low zoom levels are precomputed; deep zoom levels in empty areas share an empty object or are rendered lazily on the first request.</p>
      <p>Vector tiles are preferred over raster images because they are smaller and let the client rotate, restyle and animate without refetching.</p>`,
    followUps: ['What CDN hit rate do you expect and why?', 'How do you roll out a new map version without breaking old clients?'] });
  interview.push({ q: 'Design the seat-booking flow so that no seat is sold twice. What are your options for the locking?', level: 'I',
    a: `<p>The invariant is one owner per seat. Options: (1) <b>Pessimistic row lock</b> (SELECT FOR UPDATE) - correct, but you cannot hold a database lock while the user types card details. (2) <b>Optimistic conditional update</b> (UPDATE ... WHERE status='FREE' and check the row count) - cheap and safe, but under heavy contention many attempts fail and retry. (3) <b>TTL hold in Redis</b> (SET NX EX) - O(1), self-expiring, absorbs the contention; the durable truth stays in SQL.</p>
      <p>My design combines them: a hold is an atomic all-or-nothing Redis script over the sorted seat ids with a 10-minute TTL, mirrored in the seats table; at confirm time a SQL transaction does a conditional update keyed by hold_id and creates the booking. If Redis loses a key during failover, the SQL conditional update still prevents a double sale. A waiting room limits the arrival rate during flash sales.</p>`,
    followUps: ['How do you avoid deadlocks when holding multiple seats?', 'What do you do when payment completes after the hold expired?'] });
  interview.push({ q: 'How do you handle 2 million users arriving at the same second for a 50,000-seat concert?', level: 'A',
    a: `<p>Protect the core and meter the crowd. Static content goes to a CDN. The seat map is a small payload served from a cache refreshed every 1-2 seconds (or pushed as diffs). Users enter a virtual waiting room that assigns a random or first-come position and admits them at a rate the inventory service can sustain (a few thousand per second) using signed tokens; bots are slowed with CAPTCHA, per-account limits and token binding. The inventory service is partitioned by event and, for a mega-event, uses a dedicated shard or a single-writer actor that serialises decisions at very high rate. Holds use atomic Redis scripts; SQL is the final arbiter. When inventory counters reach zero the edge returns "sold out" immediately so doomed requests never reach the database.</p>
      <p>Fairness is a product decision: lottery, queue order or verified-fan presale each have different anti-scalper properties.</p>`,
    followUps: ['How do you keep the waiting room itself from falling over?', 'How would you prevent scalper bots?'] });
  interview.push({ q: 'What is an idempotency key and how do you implement it on the server?', level: 'I',
    a: `<p>It is a unique token the client generates once per user intent and sends with every retry of that request. The server first inserts it into a table with a unique constraint along with a hash of the request and the state IN_PROGRESS. If the insert succeeds, it processes and stores the response and marks the key COMPLETED in the same transaction as the business changes. If the key exists: COMPLETED with the same hash returns the stored response; IN_PROGRESS returns 409 (or waits); a different hash returns 422. Keys are scoped per merchant and retained for 24 hours or more. The key must also be forwarded to downstream providers so that the external call is idempotent, and a lease on IN_PROGRESS rows lets another worker resume after a crash.</p>`,
    followUps: ['Where would you keep keys for lowest latency?', 'What about operations that are idempotent by nature, such as PUT?'] });
  interview.push({ q: 'Why is "exactly-once" delivery a myth, and what do you do instead?', level: 'A',
    a: `<p>On an unreliable network a sender cannot tell whether a message that got no acknowledgement was lost or just the ack was lost. Either it does not retry (at-most-once, may lose) or it retries (at-least-once, may duplicate). You cannot have both loss-free and duplicate-free at the transport layer. Systems therefore combine <b>at-least-once delivery</b> with <b>idempotent processing</b> so the effect is exactly-once: idempotency keys on APIs, unique constraints, deduplication by event id in consumers, upserts instead of increments, and transactional outbox so state changes and events commit together. Kafka's exactly-once semantics are real inside Kafka (idempotent producers and transactions) but do not extend to external databases or HTTP calls; for those you still need your own idempotency.</p>`,
    followUps: ['How does the transactional outbox work?', 'What does Flink checkpointing guarantee and what does it not?'] });
  interview.push({ q: 'Why use a double-entry ledger for a payment system instead of a balance column?', level: 'I',
    a: `<p>A balance column only stores the result, so you cannot explain it, audit it or recover from a bug. A double-entry ledger records every money movement as at least two lines whose debits equal credits, in an append-only table. Balances are derived (sum of lines) or maintained as a cache that can be verified. The invariant "debits = credits per transaction" catches many bugs automatically; corrections are new reversing transactions, so history is preserved for auditors; concurrency is easier because inserts do not overwrite each other; and reconciliation with banks is possible line by line. For hot accounts I split them into sub-accounts or batch lines; for multi-currency each transaction balances per currency and FX is its own transaction.</p>`,
    followUps: ['How do you store amounts and rounding?', 'How would you shard the ledger?'] });
  interview.push({ q: 'Your call to the payment provider timed out. What do you do?', level: 'I',
    a: `<p>The outcome is unknown. I mark the payment PENDING (not failed), keep the idempotency key, and resolve it asynchronously: retry the provider call with the same provider-side idempotency key (which returns the original result if the first call succeeded), or query the provider by our reference, or wait for its webhook. Meanwhile the user sees "payment processing" and we avoid inviting a second attempt. A resolver job with backoff and a deadline moves the payment to captured or failed, and the nightly reconciliation compares our records with the provider's settlement file to catch leftovers. Only after the state is known do we write ledger entries or release inventory.</p>`,
    followUps: ['What if the provider has no idempotency support?', 'How long should you wait before giving up?'] });
  interview.push({ q: 'Design autocomplete. How does the data structure change as traffic and data grow?', level: 'I',
    a: `<p>Start with the key idea: a trie where each node stores the top-K completions, built offline from aggregated query logs, so a lookup walks the prefix and returns the cached list. Add layers as scale grows: client debounce and local cache; an edge cache for short prefixes; in-memory trie servers sharded by hash of the first two or three characters with regional replicas; a radix tree or FST to compress memory; immutable snapshots swapped atomically; and a small fresh layer from a stream job for trending queries merged at query time. For quality, apply blocklists, count unique users to resist poisoning, and personalise by re-ranking a few candidates so the shared cache stays valid. A sorted-array-with-binary-search design is a perfectly good small-scale alternative.</p>`,
    followUps: ['How would you support typos?', 'How do you update the trie without downtime?'] });
  interview.push({ q: 'How do you keep autocomplete results fresh without hurting latency?', level: 'A',
    a: `<p>I keep the read path read-only and separate the write path. The big base trie is rebuilt every few hours from decayed counts and swapped as an immutable snapshot. A streaming job counts queries per five-minute window, finds queries whose rate and unique-user count have jumped, filters them and publishes them to a small fresh map on each server. At request time, the service merges the base node's top-K with fresh matches for the prefix. CDN TTLs for popular prefixes are short (a minute or two) so fresh entries are not hidden. Nothing on the request path performs synchronous writes. If the stream job fails, we simply lose freshness, not availability.</p>`,
    followUps: ['How do you remove a bad suggestion immediately?', 'How would you evaluate suggestion quality?'] });
  interview.push({ q: 'Explain event time, processing time and watermarks in a click aggregator.', level: 'A',
    a: `<p>Event time is when the click happened (timestamp in the event); processing time is when our system sees it. They differ because of mobile networks, retries and queues, so counting by processing time puts clicks in the wrong minute. We assign events to windows by event time, but then must decide when a window is complete. A <b>watermark</b> is the system's estimate that no events older than time T will still arrive; a common rule is watermark = max event time seen minus allowed lateness. When the watermark passes a window's end, the window is emitted. Events that arrive after that are late: they are either applied as corrections within an extended lateness bound or sent to a side output for a batch job to fix. The trade-off is latency of results versus completeness.</p>`,
    followUps: ['What happens to the watermark if one Kafka partition is idle?', 'How do bad client clocks affect it?'] });
  interview.push({ q: 'How would you make an ad click aggregator accurate enough to bill advertisers?', level: 'E',
    a: `<p>I would not trust any single path. Raw events always go to durable storage (Kafka then a data lake) as the system of record. The stream path gives fast numbers: dedup by click_id in exact keyed state, event-time windows with a watermark, salted two-stage aggregation for hot ads, checkpointed state, and an idempotent upsert sink so replays are harmless. A nightly batch job recomputes the previous day from raw data with global dedup and includes late events, overwrites the aggregate partitions, and its numbers are the billing source. Monitoring compares stream versus batch totals and alerts on drift, and fraud filtering flags invalid clicks without deleting them, so advertisers can be credited. This lambda-style reconciliation is what turns "fast and mostly right" into "auditably correct".</p>`,
    followUps: ['What are the failure modes of the watermark?', 'How would you test the pipeline for correctness?'] });
  interview.push({ q: 'Name the main trade-offs across these six systems and what you would say out loud in an interview.', level: 'E',
    a: `<p>Uber: consistency only where it matters (assignment) versus eventual consistency for locations; memory-only data is fast and cheap but needs re-ping recovery. Maps: query speed versus preprocessing and the difficulty of live traffic in precomputed hierarchies; CDN-cacheable immutable tiles. Ticketing: strict correctness on a tiny hot dataset, protected by a waiting room, TTL holds and a SQL arbiter; staleness of the seat map is acceptable. Payments: durability and auditability beat latency; idempotency keys, append-only ledgers, outbox and reconciliation handle the unhappy paths. Autocomplete: memory versus latency (top-K per node), freshness versus stability (base plus fresh layer). Ad aggregator: latency versus accuracy through lateness bounds and a batch correction loop. The meta-lesson: identify the one invariant that cannot break, enforce it with the simplest atomic mechanism, and let everything else be eventually consistent and cached.</p>`,
    followUps: ['Pick one system and describe how it fails during a regional outage.', 'Which of these would you build on managed cloud services and which in-house?'] });

  registerModule({
    id: 'hld16',
    title: 'Case Studies III: Uber, Google Maps, Ticket Booking, Payments, Autocomplete, Ad Click Aggregator',
    intro: `<p>This is the third and hardest set of full system designs. Each case study follows the same interview-ready shape: <b>requirements → estimates → APIs → data model → architecture → deep dives → trade-offs</b>. But each one teaches a different hard idea: <b>geospatial indexing</b> (geohash and quadtrees) and driver matching for Uber; <b>tiles and routing</b> (Dijkstra, A*, contraction hierarchies) for Google Maps; <b>seat locking with TTL holds</b> at flash-sale scale for ticket booking; <b>idempotency keys and double-entry ledgers</b> for payments; <b>tries with top-K caches</b> for autocomplete; and <b>streaming aggregation with windows, watermarks and dedup</b> for an ad click aggregator.</p>
      <p>Every topic starts with an everyday analogy, then builds up with numbers, tables and an animated visualizer (cells being halved, a tree splitting, a graph search, a seat map with holds, a ledger filling in, a trie being walked, and window counts changing as clicks arrive). Deep dives and AI-era notes show what experts care about, and the practice set lets you rehearse full designs.</p>`,
    goals: [
      'Run a complete design for Uber, Maps, Ticketing, Payments, Autocomplete and an Ad Click Aggregator: requirements, estimates, APIs, data model, architecture, deep dives, trade-offs',
      'Explain geohash, quadtree, S2 and H3, and choose between them for moving versus static points',
      'Describe Dijkstra, A* and contraction hierarchies in plain words and say why traffic complicates precomputed routing',
      'Guarantee one owner per seat using TTL holds, atomic multi-seat scripts and a SQL arbiter, including the late-payment edge case',
      'Make payments safe with idempotency keys, an append-only double-entry ledger, the transactional outbox and reconciliation',
      'Build typeahead with a trie and cached top-K, with a batch-plus-fresh-layer update strategy',
      'Design a streaming aggregator with event-time windows, watermarks, dedup, salting and idempotent sinks'
    ],
    prereqs: `HLD 1-13 (especially Estimation, Caching, Databases at Scale, Messaging &amp; Streaming, Consistent Hashing, Distributed Transactions, Storage &amp; Data Processing) and Case Studies I and II.`,
    hours: 16,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
