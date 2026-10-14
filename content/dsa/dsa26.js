(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // =====================================================================
  // Shared helpers for the visualizers of DSA 26
  // =====================================================================
  function txt(s) { return String(s === undefined || s === null ? '' : s).trim(); }
  function one(k, v) { var o = {}; o[k] = v; return o; }
  function r2(x) { return Math.round(x * 100) / 100; }

  // Parse "x,y x,y ..." into [[x,y], ...] with friendly errors.
  function parsePts(s, minN, maxN, lim) {
    var t = txt(s);
    if (!t) throw new Error('Type points as x,y pairs separated by spaces, e.g. "0,0 4,0 2,3".');
    var toks = t.split(/\s+/), pts = [];
    toks.forEach(function (tok) {
      var m = tok.split(',');
      if (m.length !== 2) throw new Error('Each point must look like x,y with no space inside, e.g. "3,-2". Problem near "' + tok + '".');
      var x = Number(m[0]), y = Number(m[1]);
      if (m[0] === '' || m[1] === '' || !isFinite(x) || !isFinite(y) || Math.floor(x) !== x || Math.floor(y) !== y) throw new Error('Use whole-number coordinates like "3,-2". Problem near "' + tok + '".');
      if (Math.abs(x) > lim || Math.abs(y) > lim) throw new Error('Keep every coordinate between -' + lim + ' and ' + lim + '.');
      pts.push([x, y]);
    });
    if (pts.length < minN || pts.length > maxN) throw new Error('Give between ' + minN + ' and ' + maxN + ' points (got ' + pts.length + ').');
    return pts;
  }
  function parseNums(s, what, minLen, maxLen, lo, hi) {
    var t = txt(s);
    if (!t) throw new Error('Please type ' + what + ' (whole numbers separated by spaces).');
    var a = t.split(/[\s,]+/).map(Number);
    for (var i = 0; i < a.length; i++) {
      if (isNaN(a[i]) || Math.floor(a[i]) !== a[i]) throw new Error('Could not read ' + what + ': use whole numbers separated by spaces, e.g. "4 1 7".');
      if (a[i] < lo || a[i] > hi) throw new Error('Each value in ' + what + ' must be between ' + lo + ' and ' + hi + '.');
    }
    if (a.length < minLen || a.length > maxLen) throw new Error(what + ' must have ' + minLen + ' to ' + maxLen + ' values (got ' + a.length + ').');
    return a;
  }
  function splitBar(s, n, fmt) {
    var parts = String(s === undefined || s === null ? '' : s).split('|');
    if (parts.length !== n) throw new Error('Expected ' + n + ' parts separated by "|": ' + fmt);
    return parts.map(function (x) { return x.trim(); });
  }
  // Cross product of (A - O) and (B - O). > 0 left turn, < 0 right turn, 0 straight.
  function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
  function turnWord(c) { return c > 0 ? 'LEFT turn (counter-clockwise)' : c < 0 ? 'RIGHT turn (clockwise)' : 'STRAIGHT (collinear)'; }
  function pstr(p) { return '(' + p[0] + ',' + p[1] + ')'; }

  // Draw math points on the graph part (y axis flipped so "up" is up), uniform scale.
  function plot(pts, o) {
    o = o || {};
    var Hh = o.height || 56;
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
    var s = Math.min(84 / w, (Hh - 14) / h);
    var offX = 8 + (84 - w * s) / 2, offY = 7 + ((Hh - 14) - h * s) / 2;
    var ids = o.ids || pts.map(function (_, i) { return 'P' + i; });
    var nodes = pts.map(function (p, i) {
      return { id: ids[i], label: o.labels ? o.labels[i] : ids[i], x: r2(offX + (p[0] - minX) * s), y: r2(Hh - offY - (p[1] - minY) * s) };
    });
    var tags = o.tags;
    if (!tags && o.coords !== false) { tags = {}; pts.forEach(function (p, i) { tags[ids[i]] = pstr(p); }); }
    return { type: 'graph', label: o.label, height: Hh, directed: !!o.directed, nodes: nodes, edges: o.edges || [], hl: o.hl || {}, ehl: o.ehl || {}, tags: tags || {} };
  }

  // Small deterministic PRNG (mulberry32) so "random" visualizers replay identically.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randInt(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }

  // =====================================================================
  // TOPIC 1 — Vectors, cross product & orientation
  // =====================================================================
  topics.push({
    title: 'Vectors, Cross Product & Orientation (the CCW Test)',
    analogy: `<p>You are driving from your home <b>A</b> to a petrol pump <b>B</b>, and then on to your office <b>C</b>. At the petrol pump you either turn the steering wheel <b>left</b>, turn it <b>right</b>, or keep it <b>straight</b>. You never need a protractor or the exact angle to know which one it was — you just feel the direction of the turn.</p>
      <p>Computational geometry is built on exactly that feeling. One tiny formula — the <b>cross product</b> — tells a computer "left, right or straight?" for any three points, using only multiplication and subtraction. Almost every geometry interview question (straight lines, segment crossings, convex hulls, polygon area, point-in-polygon) is this one question asked many times.</p>`,
    explain: `<p><b>A point</b> is just a pair <code>(x, y)</code>. <b>A vector</b> is an arrow: "move <code>dx</code> right and <code>dy</code> up". The vector from A to B is <code>B − A = (B.x − A.x, B.y − A.y)</code>.</p>
      <p>Two products of vectors matter. For <code>u = (u.x, u.y)</code> and <code>v = (v.x, v.y)</code>:</p>
      ${H.table(['name', 'formula', 'what the SIGN tells you', 'what the SIZE tells you'], [
        ['<b>dot product</b> u·v', '<code>u.x·v.x + u.y·v.y</code>', '&gt; 0: angle under 90° (same-ish direction) · 0: perpendicular · &lt; 0: over 90°', '|u|·|v|·cos(angle) — used for projections'],
        ['<b>cross product</b> u×v', '<code>u.x·v.y − u.y·v.x</code>', '&gt; 0: v is to the <b>left</b> of u (counter-clockwise) · &lt; 0: <b>right</b> (clockwise) · 0: parallel', '<b>area of the parallelogram</b> spanned by u and v (= 2 × triangle area)']
      ])}
      <p><b>The orientation test.</b> For three points A, B, C compute <code>cross(A, B, C) = (B − A) × (C − A)</code>. Its sign answers "standing at A looking at B, is C on my left, my right, or dead ahead?" — which is the same as "do A→B→C turn left or right?".</p>
      <p><b>Worked example.</b> A = (0,0), B = (4,0), C = (2,3).</p>
      ${H.table(['step', 'value'], [
        ['u = B − A', '(4, 0)'],
        ['v = C − A', '(2, 3)'],
        ['u.x·v.y', '4·3 = 12'],
        ['u.y·v.x', '0·2 = 0'],
        ['cross = 12 − 0', H.c('g', '12 &gt; 0 → LEFT turn (counter-clockwise)')],
        ['triangle area', '|12| / 2 = ' + H.c('b', '6')]
      ])}
      <p>Change C to (6, −2): <code>4·(−2) − 0·6 = −8</code> → <span class="c-r">right turn</span>. Change C to (8, 0): <code>4·0 − 0·8 = 0</code> → <span class="c-y">collinear</span> (all three on one line).</p>
      <p><b>Why this beats slopes.</b> The school way to test "are three points on one line?" compares slopes <code>dy/dx</code>. That divides by zero on vertical lines and uses floating point, so <code>0.1 + 0.2 ≠ 0.3</code> style errors creep in. The cross product uses only integer multiply and subtract — <b>exact</b> for integer coordinates, no special cases.</p>
      <p><b>Four helpers you will reuse all module long:</b></p>
      <ul>
        <li><b>orientation(A,B,C)</b> = sign of the cross product.</li>
        <li><b>twice the triangle area</b> = <code>|cross(A,B,C)|</code> (keep it doubled to stay in integers).</li>
        <li><b>point on segment</b>: collinear (cross = 0) <i>and</i> inside the bounding box of the segment.</li>
        <li><b>distance from P to line AB</b> = <code>|cross(A,B,P)| / |AB|</code> (area ÷ base = height).</li>
      </ul>`,
    clues: [
      '"Are these points <b>collinear</b> / on a <b>straight line</b>?" → cross product equals 0, never compare slopes with doubles.',
      '"<b>Left turn / right turn</b>", "<b>clockwise or counter-clockwise</b>", "which <b>side</b> of the line is the point on?" → sign of the cross product.',
      '"<b>Area of a triangle</b> given its 3 vertices" → |cross| / 2, no Heron\'s formula and no square roots.',
      'Coordinates up to <code>10<sup>4</sup></code>–<code>10<sup>9</sup></code> and the word "exact" → integer cross products in <code>long</code>.',
      '"<b>Boomerang</b>", "do three points form a valid triangle?" → cross ≠ 0.',
      'Any problem that later needs <b>convex hull, segment intersection, polygon area</b> → you will build on the orientation test, so code it first as a helper.'
    ],
    code: [`
      // Orientation toolkit. All arithmetic in long: coordinates up to ~1e9 give
      // products up to ~4e18, which still fits in a signed 64-bit long (max ~9.22e18).
      static long cross(long ox, long oy, long ax, long ay, long bx, long by) {
          // (A - O) x (B - O)
          return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
      }

      // +1 = counter-clockwise (left turn), -1 = clockwise (right turn), 0 = collinear
      static int orientation(long[] o, long[] a, long[] b) {
          return Long.signum(cross(o[0], o[1], a[0], a[1], b[0], b[1]));
      }

      // Twice the triangle area: stays an exact integer, divide by 2 only when printing.
      static long twiceTriangleArea(long[] a, long[] b, long[] c) {
          return Math.abs(cross(a[0], a[1], b[0], b[1], c[0], c[1]));
      }

      // Dot product of (A - O) and (B - O): sign tells acute (>0), right (0) or obtuse (<0) angle at O.
      static long dot(long ox, long oy, long ax, long ay, long bx, long by) {
          return (ax - ox) * (bx - ox) + (ay - oy) * (by - oy);
      }

      // Is P on the closed segment AB? Collinear AND inside AB's bounding box.
      static boolean onSegment(long[] a, long[] b, long[] p) {
          if (cross(a[0], a[1], b[0], b[1], p[0], p[1]) != 0) return false;
          return Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0])
              && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
      }

      // Distance from P to the infinite line through A and B = |cross| / |AB| (area / base).
      static double distanceToLine(long[] a, long[] b, long[] p) {
          double area2 = Math.abs((double) cross(a[0], a[1], b[0], b[1], p[0], p[1]));
          double base = Math.hypot(b[0] - a[0], b[1] - a[1]);
          return area2 / base;
      }`, { lang: 'python', run: true, title: 'Same idea in Python (runnable)', code: `def cross(o, a, b):
    """(A - O) x (B - O): > 0 left turn, < 0 right turn, 0 straight."""
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

def turn(o, a, b):
    c = cross(o, a, b)
    if c > 0:
        return "LEFT  (counter-clockwise)"
    if c < 0:
        return "RIGHT (clockwise)"
    return "STRAIGHT (collinear)"

cases = [((0, 0), (4, 0), (2, 3)),
         ((0, 0), (4, 0), (6, -2)),
         ((1, 1), (2, 2), (5, 5)),
         ((0, 0), (0, 5), (0, -3))]   # vertical line: slopes would divide by zero
for o, a, b in cases:
    c = cross(o, a, b)
    print(o, a, b, "cross =", c, "->", turn(o, a, b), "| triangle area =", abs(c) / 2)` }],
    codeTitle: ['Orientation toolkit (Java)', 'Turn detector (Python, runnable)'],
    viz: {
      title: 'Turn detector: drive along a path and read the sign of each cross product',
      input: '0,0 4,0 6,3 3,5 5,7 9,7',
      inputLabel: 'path points x,y in driving order (4 to 9 points, coordinates -20..20)',
      gen: function (input) {
        var P = parsePts(input, 4, 9, 20), n = P.length, frames = [], summary = [];
        var ids = P.map(function (_, i) { return 'P' + i; });
        var allEdges = [];
        for (var e = 0; e + 1 < n; e++) allEdges.push(['P' + e, 'P' + (e + 1)]);
        frames.push({
          narr: 'We will drive <b>P0 → P1 → … → P' + (n - 1) + '</b>. At every inner point we ask: did we turn <b>left</b>, <b>right</b>, or go <b>straight</b>? Only multiplication and subtraction will be used — no angles, no slopes.',
          parts: [plot(P, { directed: true, edges: allEdges, label: 'the route' }),
            { type: 'text', html: 'Rule: <code>cross(A,B,C) = (B−A).x·(C−A).y − (B−A).y·(C−A).x</code>. Positive = left, negative = right, zero = straight.' }]
        });
        for (var i = 1; i + 1 < n; i++) {
          var A = P[i - 1], B = P[i], C = P[i + 1];
          var ux = B[0] - A[0], uy = B[1] - A[1], vx = C[0] - A[0], vy = C[1] - A[1];
          var c = ux * vy - uy * vx, cls = c > 0 ? 'ok' : c < 0 ? 'bad' : 'cur';
          var ehl = {}; ehl['P' + (i - 1) + '-P' + i] = cls; ehl['P' + i + '-P' + (i + 1)] = cls;
          var hl = {}; hl['P' + (i - 1)] = 'done'; hl['P' + i] = 'cur'; hl['P' + (i + 1)] = 'sel';
          summary.push(['P' + i, pstr(B), String(c), c > 0 ? 'left' : c < 0 ? 'right' : 'straight']);
          frames.push({
            narr: 'At <b>P' + i + '</b>: A = ' + pstr(A) + ', B = ' + pstr(B) + ', C = ' + pstr(C) + '. u = B − A = (' + ux + ', ' + uy + '), v = C − A = (' + vx + ', ' + vy + '). cross = ' + ux + '·' + vy + ' − ' + uy + '·' + vx + ' = <b>' + c + '</b> → <span class="' + (c > 0 ? 'c-g' : c < 0 ? 'c-r' : 'c-y') + '">' + turnWord(c) + '</span>. ' + (c === 0 ? 'Zero means C lies exactly on the line through A and B.' : 'The size ' + Math.abs(c) + ' is twice the area of triangle ABC = ' + (Math.abs(c) / 2) + '.'),
            parts: [plot(P, { directed: true, edges: allEdges, ehl: ehl, hl: hl, label: 'triple (P' + (i - 1) + ', P' + i + ', P' + (i + 1) + ')' }),
              { type: 'vars', label: 'arithmetic', vals: { 'u = B−A': '(' + ux + ',' + uy + ')', 'v = C−A': '(' + vx + ',' + vy + ')', 'u.x·v.y': ux * vy, 'u.y·v.x': uy * vx, cross: c }, hl: { cross: cls } },
              { type: 'code', lang: 'java', label: 'line running', code: 'long c = (b.x - a.x) * (c.y - a.y)\n       - (b.y - a.y) * (c.x - a.x);\nif (c > 0) turnLeft();\nelse if (c < 0) turnRight();\nelse goStraight();', hl: c > 0 ? { 3: 'ok' } : c < 0 ? { 4: 'bad' } : { 5: 'cur' } }]
          });
        }
        var lefts = summary.filter(function (r) { return r[3] === 'left'; }).length, rights = summary.filter(function (r) { return r[3] === 'right'; }).length;
        frames.push({
          narr: 'Summary: ' + lefts + ' left turn(s), ' + rights + ' right turn(s). ' + (rights === 0 && lefts > 0 ? 'Only left turns → if this path closed up it would be a <b>convex</b> counter-clockwise polygon (Topic 4 uses exactly this test).' : lefts === 0 && rights > 0 ? 'Only right turns → a clockwise convex chain.' : 'Mixed turns → the path wiggles; a closed version would be <b>non-convex</b>.'),
          parts: [{ type: 'table', label: 'turn at every inner point', columns: ['point', 'coords', 'cross', 'turn'], rows: summary }]
        });
        return frames;
      }
    },
    examples: [
      { title: 'Why slopes are a trap: a vertical line', html: `<p>Points (0,0), (0,5), (0,−3). Slopes: <code>(5−0)/(0−0)</code> → division by zero (Java <code>double</code> gives <code>Infinity</code>, <code>int</code> throws). Cross product: <code>(0−0)·(−3−0) − (5−0)·(0−0) = 0 − 0 = 0</code> → collinear, no special case needed.</p>
        ${H.table(['method', 'vertical line', 'huge coordinates', 'verdict'], [['slope a/b == c/d (double)', H.c('r', 'divide by 0'), H.c('r', 'rounding errors'), 'fragile'], ['cross product (long)', H.c('g', 'works'), H.c('g', 'exact up to ~1e9'), 'use this']])}` },
      { title: 'Triangle area without Heron', html: `<p>A = (1,1), B = (5,2), C = (2,6). u = (4,1), v = (1,5). cross = 4·5 − 1·1 = <b>19</b>. Area = 19/2 = <b>9.5</b>. Heron would need three square roots for side lengths and another root for the area — four chances for rounding error. The cross product needs two multiplications.</p>`, code: `long[] a = {1, 1}, b = {5, 2}, c = {2, 6};
long twice = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
System.out.println(twice / 2.0);   // 9.5` },
      { title: 'Which side of the fence is the cow on?', html: `<p>A straight fence runs from F1 = (0,0) to F2 = (10,10). Cow at (2,7): cross = 10·7 − 10·2 = 50 &gt; 0 → <span class="c-g">left side</span>. Cow at (8,3): 10·3 − 10·8 = −50 → <span class="c-r">right side</span>. Two cows are on the same side exactly when their cross products have the same sign — this is the core of segment intersection (Topic 2).</p>` },
      { title: 'Distance from a point to a line', html: `<p>Line through A=(0,0), B=(3,4) (length 5). P = (4,0). |cross| = |3·0 − 4·4| = 16 = parallelogram area. Height = area ÷ base = 16 / 5 = <b>3.2</b>. Same formula gives the distance to a segment when the projection lands inside it (check with two dot products), otherwise take the distance to the nearer endpoint.</p>` },
      { title: 'Acute or obtuse? Use the dot product', html: `<p>At O=(0,0) with A=(3,1) and B=(−1,2): dot = 3·(−1) + 1·2 = −1 &lt; 0 → the angle AOB is <b>obtuse</b> (over 90°). With B = (1,3): dot = 3 + 3 = 6 &gt; 0 → acute. Dot = 0 means a perfect right angle — handy for "is this a rectangle / right triangle?" questions.</p>` }
    ],
    deepDive: `<p><b>Where the formula comes from.</b> In 3D, <code>u × v</code> is a vector perpendicular to both; for vectors lying flat in the xy-plane it points straight up or straight down, and its z-component is exactly <code>u.x·v.y − u.y·v.x</code>. Up (positive) = counter-clockwise by the right-hand rule. It is also the 2×2 determinant <code>|u.x u.y; v.x v.y|</code>, i.e. the signed area of the parallelogram — which is why the same number gives orientation <i>and</i> area.</p>
      <p><b>Overflow budget.</b> With coordinates in <code>[−10<sup>9</sup>, 10<sup>9</sup>]</code> the differences reach <code>2·10<sup>9</sup></code>, each product <code>4·10<sup>18</sup></code>, and the difference of two products up to <code>8·10<sup>18</sup></code> — just under <code>Long.MAX_VALUE ≈ 9.22·10<sup>18</sup></code>. One more multiplication (for example comparing two cross products by multiplying them) overflows; compare <b>signs</b> instead (<code>Long.signum(a) != Long.signum(b)</code>), or use <code>Math.multiplyHigh</code>/<code>BigInteger</code>, or <code>__int128</code> in C++.</p>
      <p><b>Floating-point coordinates.</b> When inputs are doubles, an exactly-collinear triple can produce <code>cross = 1e-17</code>. Use an epsilon scaled to the magnitude (<code>|c| &lt; 1e-9 · |u|·|v|</code>) — but understand that epsilons break transitivity, so algorithms like convex hull can still misbehave on near-degenerate data. Production libraries (CGAL, Shewchuk's robust predicates used in Triangle and many CAD tools) use <b>adaptive exact arithmetic</b>: try a fast float evaluation with an error bound, and only if the result is too close to zero recompute exactly.</p>
      <p><b>Angle sorting without atan2.</b> To sort vectors by angle around a point, split into the upper half-plane (y &gt; 0 or y = 0, x &gt; 0) and the lower half, then within a half compare with <code>cross(a, b) &gt; 0</code>. It is exact for integers, while <code>Math.atan2</code> may place two distinct but nearly parallel directions in the wrong order.</p>
      <p><b>Production reality.</b> Game engines run millions of orientation tests per frame for collision checks; GIS libraries (JTS, GEOS, Shapely) build point-in-polygon and intersection on it; robot path planners use it to decide which way to steer around obstacles. In interviews it is the five-line helper that makes the rest of the code correct.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant will type out a cross product instantly, and "check if points are collinear" is a solved prompt. The value moved to <i>spotting</i> that a messy business question ("are these GPS pings on the same road?", "is the drone left of the no-fly boundary?") is an orientation test, and to choosing exact integer math over floats.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 8 degenerate test cases for an orientation function: vertical lines, duplicate points, huge coordinates near 1e9</code>, then run them yourself. Ask it to explain the right-hand rule visually if the sign convention feels arbitrary.</p>
      <p><b>Where AI goes wrong:</b> generated code often uses <code>int</code> and silently overflows at coordinates around 5·10<sup>4</sup>; it compares slopes with <code>double</code> division; it flips the sign convention between helpers (one function returns +1 for clockwise, another for counter-clockwise) so the hull or intersection code built on top is subtly wrong; and it "fixes" floating precision with a fixed <code>1e-9</code> that is wrong for coordinates near 10<sup>9</sup>.</p>
      <p><b>What you must still own:</b> the sign convention, the overflow budget, and the ability to verify a turn by hand with a 3-line table in the interview.</p>`,
    problems: [{
      title: 'Check If It Is a Straight Line', level: 'Easy', tags: ['geometry', 'cross product'], companies: ['Palantir', 'Amazon', 'Google'],
      statement: `<p>You are given an array <code>coordinates</code> where <code>coordinates[i] = [x, y]</code> is a point on the plane. Return <code>true</code> if all the points lie on one straight line, otherwise <code>false</code>.</p>`,
      constraints: `2 ≤ N ≤ 1000, −10<sup>4</sup> ≤ x, y ≤ 10<sup>4</sup>, all points distinct`,
      example: `<p>Input: <code>[[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]]</code> → Output ${H.c('g', 'true')} — every step moves (+1, +1), so all points sit on y = x + 1.</p>
        <p>Input: <code>[[1,1],[2,2],[3,4],[4,5]]</code> → Output ${H.c('r', 'false')} — cross((1,1),(2,2),(3,4)) = 1·3 − 1·2 = 1 ≠ 0, so (3,4) bends off the line.</p>`,
      brute: {
        why: `<p>Check every triple (i, j, k) with the cross product: correct, but <b>O(N<sup>3</sup>)</b> ≈ 1.7·10<sup>8</sup> triples for N = 1000 — wasteful, because a line is fully decided by its first two points. The other "naive" approach, comparing slopes <code>dy/dx</code> as doubles, is faster but <span class="c-r">wrong</span> on vertical lines (division by zero) and fragile with rounding.</p>`,
        code: `class Solution {
    // Brute force: every triple must be collinear. O(N^3).
    public boolean checkStraightLine(int[][] p) {
        int n = p.length;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                for (int k = j + 1; k < n; k++) {
                    long c = (long) (p[j][0] - p[i][0]) * (p[k][1] - p[i][1])
                           - (long) (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
                    if (c != 0) return false;   // this triple bends
                }
        return true;
    }
}`
      },
      mcq: { q: 'Points (2,1), (2,5), (2,9). A slope-based solution computes (5−1)/(2−2). What should you do instead?', options: ['Catch the ArithmeticException and return true', 'Compute cross((2,1),(2,5),(2,9)) = 0·8 − 4·0 = 0 → collinear', 'Use Double.compare on slopes', 'Sort the points first'], answer: 1, explain: 'The cross product needs no division, so vertical lines are not special. It equals 0 here, so the points are collinear.' },
      hints: [
        `<p>Hint 1: Two distinct points already define the line. Every other point only needs to be compared against <b>those two</b>.</p>`,
        `<p>Hint 2: "Point P is on line AB" ⇔ <code>cross(A, B, P) = (B−A)×(P−A) = 0</code>. No division, so no vertical-line special case.</p>`,
        `<p>Hint 3: Recipe — let A = p[0], d = p[1] − p[0]. For i = 2..N−1: e = p[i] − A; if <code>d.x·e.y − d.y·e.x ≠ 0</code> return false. Return true. With N = 2 the loop never runs → true. Use long for safety.</p>`
      ],
      solution: {
        approach: `<p>Fix the line by its first two points. For every other point, the cross product of the direction vector and the vector to that point must be exactly zero. One pass, integer arithmetic, no special cases.</p>`,
        code: `class Solution {
    public boolean checkStraightLine(int[][] p) {
        long x0 = p[0][0], y0 = p[0][1];
        long dx = p[1][0] - x0, dy = p[1][1] - y0;    // direction of the line A -> B
        for (int i = 2; i < p.length; i++) {
            long ex = p[i][0] - x0, ey = p[i][1] - y0; // vector A -> P_i
            if (dx * ey - dy * ex != 0) return false;  // P_i is off the line
        }
        return true;
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def checkStraightLine(self, p):
        (x0, y0), (x1, y1) = p[0], p[1]
        dx, dy = x1 - x0, y1 - y0
        return all(dx * (y - y0) - dy * (x - x0) == 0 for x, y in p[2:])` }, { lang: 'cpp', code: `class Solution {
public:
    bool checkStraightLine(vector<vector<int>>& p) {
        long long x0 = p[0][0], y0 = p[0][1], dx = p[1][0] - x0, dy = p[1][1] - y0;
        for (size_t i = 2; i < p.size(); i++)
            if (dx * (p[i][1] - y0) - dy * (p[i][0] - x0) != 0) return false;
        return true;
    }
};` }],
        dry: { head: ['i', 'point', 'e = P − A', 'dx·ey − dy·ex', 'verdict'], rows: [
          ['—', '(1,1) = A, (2,2)', 'd = (1,1)', '—', 'line fixed'],
          ['2', '(3,4)', '(2,3)', '1·3 − 1·2 = 1', '<span class="c-r">≠ 0 → return false</span>'],
          ['(other input) 2', '(3,3)', '(2,2)', '1·2 − 1·2 = 0', '<span class="c-g">on line</span>'],
          ['(other input) 3', '(4,4)', '(3,3)', '1·3 − 1·3 = 0', '<span class="c-g">on line → true</span>']
        ] },
        complexity: `<p>Time <b>O(N)</b>, space <b>O(1)</b>. Each check is two multiplications and a subtraction.</p>`,
        followUps: ['Return the maximum number of points on one line (LeetCode 149 — practice set).', 'What changes if points may repeat? (If p[0] == p[1], the direction is (0,0) and every cross is 0 — pick a different second point.)', 'Coordinates are doubles from GPS: how do you choose a tolerance?']
      }
    }]
  });
registerModule({ id: 'dsa26', title: 'Geometry, Randomized & Amortized Analysis', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
