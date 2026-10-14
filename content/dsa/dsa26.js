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
          narr: 'Summary: ' + lefts + ' left turn(s), ' + rights + ' right turn(s). ' + (lefts === 0 && rights === 0 ? 'Every cross product was 0 → all points are <b>collinear</b> (this is exactly the "Check If It Is a Straight Line" test).' : rights === 0 && lefts > 0 ? 'Only left turns → if this path closed up it would be a <b>convex</b> counter-clockwise polygon (Topic 4 uses exactly this test).' : lefts === 0 && rights > 0 ? 'Only right turns → a clockwise convex chain.' : 'Mixed turns → the path wiggles; a closed version would be <b>non-convex</b>.'),
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

  // =====================================================================
  // TOPIC 2 — Segment intersection
  // =====================================================================
  topics.push({
    title: 'Segment Intersection: Straddle Test, Collinear Cases & the Crossing Point',
    analogy: `<p>Two roads are drawn on a paper map as straight strokes. Do they cross? Stand on road 1 and look along it: if the two ends of road 2 are on <b>opposite sides</b> of you (one on your left, one on your right), road 2 cuts across your line. But that alone is not enough — road 2 might cross your <i>line</i> far beyond the end of your road. So you also stand on road 2 and check that road 1's ends are on opposite sides of <i>it</i>. Both roads must "split" each other. That double check is the whole algorithm.</p>`,
    explain: `<p>Segments <b>P1P2</b> and <b>Q1Q2</b>. Compute four orientations with the Topic 1 helper:</p>
      ${H.table(['name', 'question', 'formula'], [
        ['o1', 'which side of line P1P2 is Q1?', 'sign(cross(P1, P2, Q1))'],
        ['o2', 'which side of line P1P2 is Q2?', 'sign(cross(P1, P2, Q2))'],
        ['o3', 'which side of line Q1Q2 is P1?', 'sign(cross(Q1, Q2, P1))'],
        ['o4', 'which side of line Q1Q2 is P2?', 'sign(cross(Q1, Q2, P2))']
      ])}
      <p><b>General case:</b> if <code>o1 ≠ o2</code> <i>and</i> <code>o3 ≠ o4</code>, the segments intersect (this also covers a T-shaped touch where one value is 0).</p>
      <p><b>Special (collinear) cases:</b> if some <code>o = 0</code>, that endpoint lies on the other segment's <i>line</i>; it touches the <i>segment</i> only if it is also inside the segment's bounding box. Check all four: <code>o1 = 0 &amp;&amp; onSegment(P1,P2,Q1)</code>, and so on. If none applies → no intersection.</p>
      <p><b>Worked example.</b> P1=(0,0), P2=(6,4), Q1=(0,4), Q2=(6,0) (an X shape).</p>
      ${H.table(['test', 'cross', 'sign'], [
        ['o1: (P1,P2,Q1)', '6·4 − 4·0 = 24', H.c('g', '+ (left)')],
        ['o2: (P1,P2,Q2)', '6·0 − 4·6 = −24', H.c('r', '− (right)')],
        ['o3: (Q1,Q2,P1)', '(Q2−Q1)×(P1−Q1) = (6,−4)×(0,−4) = 6·(−4) − (−4)·0 = −24', H.c('r', '− (right)')],
        ['o4: (Q1,Q2,P2)', '(6,−4)×(P2−Q1) = (6,−4)×(6,0) = 0 − (−24) = 24', H.c('g', '+ (left)')]
      ])}
      <p>o1 ≠ o2 and o3 ≠ o4 → <b>they cross</b>.</p>
      <p><b>Where do they cross?</b> Write P(t) = P1 + t·r with r = P2 − P1, and Q(u) = Q1 + u·s with s = Q2 − Q1. Crossing both sides of <code>P1 + t·r = Q1 + u·s</code> with s (and with r) kills one unknown each time:</p>
      <ul>
        <li><code>t = ((Q1 − P1) × s) / (r × s)</code></li>
        <li><code>u = ((Q1 − P1) × r) / (r × s)</code></li>
      </ul>
      <p>Valid crossing ⇔ <code>r × s ≠ 0</code> and <code>0 ≤ t ≤ 1</code> and <code>0 ≤ u ≤ 1</code>. In the example r = (6,4), s = (6,−4), r×s = −24−24 = −48, Q1−P1 = (0,4): t = (0·(−4) − 4·6)/(−48) = 0.5, so the point is P1 + 0.5·(6,4) = <b>(3, 2)</b>. If <code>r × s = 0</code> the lines are parallel: either disjoint, or collinear (then check overlap of the 1D projections).</p>
      <p><b>Cheap pre-filter:</b> if the bounding boxes do not overlap, skip everything. Real systems with millions of segments do this first.</p>`,
    clues: [
      '"Do two line segments <b>intersect / cross / touch</b>?" → four orientation tests + collinear on-segment checks.',
      '"Return the <b>intersection point</b>" → parametric t and u with cross products; keep numerators/denominator as integers until the final division.',
      '"Does the polyline / path <b>cross itself</b>?" (LeetCode 335 Self Crossing, snake games) → segment intersection against earlier segments.',
      '"Can the robot <b>see</b> the target / is the line of sight blocked by walls?" → segment vs each wall segment.',
      'N segments, "<b>any</b> pair intersects?" with N ≤ 10<sup>5</sup> → sweep line (Shamos–Hoey) instead of O(N<sup>2</sup>) pairs.',
      '"Endpoints count as intersecting" or "touching counts" in the statement → you MUST handle the o = 0 cases, not just the strict straddle.'
    ],
    code: [`
      static long cross(long[] o, long[] a, long[] b) {
          return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      }

      // p is already known to be collinear with a-b; is it inside the segment's bounding box?
      static boolean inBox(long[] a, long[] b, long[] p) {
          return Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0])
              && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
      }

      // True if closed segments P1P2 and Q1Q2 share at least one point (touching counts).
      static boolean segmentsIntersect(long[] p1, long[] p2, long[] q1, long[] q2) {
          int o1 = Long.signum(cross(p1, p2, q1));
          int o2 = Long.signum(cross(p1, p2, q2));
          int o3 = Long.signum(cross(q1, q2, p1));
          int o4 = Long.signum(cross(q1, q2, p2));
          if (o1 != o2 && o3 != o4) return true;            // proper crossing or T-touch
          if (o1 == 0 && inBox(p1, p2, q1)) return true;    // Q1 lies on P1P2
          if (o2 == 0 && inBox(p1, p2, q2)) return true;    // Q2 lies on P1P2
          if (o3 == 0 && inBox(q1, q2, p1)) return true;    // P1 lies on Q1Q2
          if (o4 == 0 && inBox(q1, q2, p2)) return true;    // P2 lies on Q1Q2
          return false;                                     // separated
      }`, `
      // Crossing point of two NON-parallel segments, or null if they do not cross.
      // Exact test on integers; only the final coordinates use doubles.
      static double[] crossingPoint(long[] p1, long[] p2, long[] q1, long[] q2) {
          long rx = p2[0] - p1[0], ry = p2[1] - p1[1];      // r = P2 - P1
          long sx = q2[0] - q1[0], sy = q2[1] - q1[1];      // s = Q2 - Q1
          long qx = q1[0] - p1[0], qy = q1[1] - p1[1];      // Q1 - P1
          long den = rx * sy - ry * sx;                     // r x s
          if (den == 0) return null;                        // parallel or collinear: handle separately
          long tNum = qx * sy - qy * sx;                    // (Q1 - P1) x s
          long uNum = qx * ry - qy * rx;                    // (Q1 - P1) x r
          if (den < 0) { den = -den; tNum = -tNum; uNum = -uNum; }   // make the denominator positive
          if (tNum < 0 || tNum > den || uNum < 0 || uNum > den) return null; // outside a segment
          double t = (double) tNum / den;
          return new double[]{p1[0] + t * rx, p1[1] + t * ry};
      }`],
    codeTitle: ['Yes/no intersection test (handles every touching case)', 'Where they cross (parametric form, exact range check)'],
    viz: {
      title: 'Four orientation tests decide if two segments meet',
      input: '0,0 6,4 0,4 6,0',
      inputLabel: 'P1 P2 Q1 Q2 as x,y (coordinates -20..20)',
      gen: function (input) {
        var pts = parsePts(input, 4, 4, 20), P1 = pts[0], P2 = pts[1], Q1 = pts[2], Q2 = pts[3], frames = [];
        var ids = ['P1', 'P2', 'Q1', 'Q2'];
        var E = [['P1', 'P2'], ['Q1', 'Q2']];
        function pl(hl, ehl, extra, label) {
          var p = pts.slice(), id = ids.slice();
          if (extra) { p.push(extra); id.push('X'); }
          var tags = {}; p.forEach(function (q, i) { tags[id[i]] = '(' + r2(q[0]) + ',' + r2(q[1]) + ')'; });
          return plot(p, { ids: id, edges: E, hl: hl, ehl: ehl, tags: tags, label: label || 'segments P1P2 and Q1Q2' });
        }
        function sg(c) { return c > 0 ? '+1 (left)' : c < 0 ? '−1 (right)' : '0 (on the line)'; }
        var bx = !(Math.max(P1[0], P2[0]) < Math.min(Q1[0], Q2[0]) || Math.max(Q1[0], Q2[0]) < Math.min(P1[0], P2[0]) || Math.max(P1[1], P2[1]) < Math.min(Q1[1], Q2[1]) || Math.max(Q1[1], Q2[1]) < Math.min(P1[1], P2[1]));
        frames.push({ narr: 'Two segments. We will never compute slopes — only four cross products. First a cheap filter: do their <b>bounding boxes</b> overlap? ' + (bx ? '<span class="c-g">Yes</span>, so we must look closer.' : '<span class="c-r">No</span> — they cannot meet, but let us still run the full test to see why.'),
          parts: [pl({}, {}), { type: 'vars', label: 'bounding boxes', vals: { 'P box x': Math.min(P1[0], P2[0]) + '..' + Math.max(P1[0], P2[0]), 'P box y': Math.min(P1[1], P2[1]) + '..' + Math.max(P1[1], P2[1]), 'Q box x': Math.min(Q1[0], Q2[0]) + '..' + Math.max(Q1[0], Q2[0]), 'Q box y': Math.min(Q1[1], Q2[1]) + '..' + Math.max(Q1[1], Q2[1]), overlap: bx ? 'yes' : 'no' }, hl: { overlap: bx ? 'ok' : 'bad' } }] });
        var c1 = cross(P1, P2, Q1), c2 = cross(P1, P2, Q2), c3 = cross(Q1, Q2, P1), c4 = cross(Q1, Q2, P2);
        var o1 = Math.sign(c1), o2 = Math.sign(c2), o3 = Math.sign(c3), o4 = Math.sign(c4);
        var vals = {};
        vals.o1 = sg(c1);
        frames.push({ narr: 'Stand on <b>P1 → P2</b>. Where is <b>Q1</b>? cross(P1,P2,Q1) = <b>' + c1 + '</b> → ' + sg(c1) + '.', parts: [pl({ P1: 'cur', P2: 'cur', Q1: 'sel' }, { 'P1-P2': 'cur' }), { type: 'vars', label: 'orientations so far', vals: JSON.parse(JSON.stringify(vals)), hl: { o1: 'cur' } }] });
        vals.o2 = sg(c2);
        frames.push({ narr: 'Still on P1 → P2. Where is <b>Q2</b>? cross(P1,P2,Q2) = <b>' + c2 + '</b> → ' + sg(c2) + '. ' + (o1 !== o2 ? '<span class="c-g">Q1 and Q2 are split by line P1P2</span> (or one touches it).' : (o1 === 0 ? '<span class="c-y">Both Q1 and Q2 lie ON line P1P2</span> — the segments are collinear; only the overlap checks can say yes.' : '<span class="c-r">Q1 and Q2 are on the same side</span> — a crossing is impossible unless an endpoint touches.')), parts: [pl({ P1: 'cur', P2: 'cur', Q2: 'sel' }, { 'P1-P2': 'cur' }), { type: 'vars', label: 'orientations so far', vals: JSON.parse(JSON.stringify(vals)), hl: { o2: o1 !== o2 ? 'ok' : 'bad' } }] });
        vals.o3 = sg(c3);
        frames.push({ narr: 'Now stand on <b>Q1 → Q2</b>. Where is <b>P1</b>? cross(Q1,Q2,P1) = <b>' + c3 + '</b> → ' + sg(c3) + '.', parts: [pl({ Q1: 'cur', Q2: 'cur', P1: 'sel' }, { 'Q1-Q2': 'cur' }), { type: 'vars', label: 'orientations so far', vals: JSON.parse(JSON.stringify(vals)), hl: { o3: 'cur' } }] });
        vals.o4 = sg(c4);
        frames.push({ narr: 'Where is <b>P2</b>? cross(Q1,Q2,P2) = <b>' + c4 + '</b> → ' + sg(c4) + '. ' + (o3 !== o4 ? '<span class="c-g">P1 and P2 are split by line Q1Q2.</span>' : (o3 === 0 ? '<span class="c-y">Both P1 and P2 lie ON line Q1Q2</span> (collinear).' : '<span class="c-r">P1 and P2 are on the same side of line Q1Q2.</span>')), parts: [pl({ Q1: 'cur', Q2: 'cur', P2: 'sel' }, { 'Q1-Q2': 'cur' }), { type: 'vars', label: 'orientations', vals: JSON.parse(JSON.stringify(vals)), hl: { o4: o3 !== o4 ? 'ok' : 'bad' } }] });
        function inBox(a, b, p) { return Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]); }
        var general = o1 !== o2 && o3 !== o4, why = '';
        var hit = general;
        if (!hit) {
          if (o1 === 0 && inBox(P1, P2, Q1)) { hit = true; why = 'Q1 lies on segment P1P2'; }
          else if (o2 === 0 && inBox(P1, P2, Q2)) { hit = true; why = 'Q2 lies on segment P1P2'; }
          else if (o3 === 0 && inBox(Q1, Q2, P1)) { hit = true; why = 'P1 lies on segment Q1Q2'; }
          else if (o4 === 0 && inBox(Q1, Q2, P2)) { hit = true; why = 'P2 lies on segment Q1Q2'; }
        }
        frames.push({ narr: general ? '<b>General case holds</b>: o1 ≠ o2 AND o3 ≠ o4 → each segment splits the other → <span class="c-g">they intersect</span>.' : hit ? 'General case fails, but a <b>collinear special case</b> fires: ' + why + ' (orientation 0 AND inside the bounding box) → <span class="c-g">they touch</span>.' : 'General case fails and no endpoint lies on the other segment → <span class="c-r">no intersection</span>.' + (o1 === 0 && o2 === 0 ? ' (They are collinear but their shadows on the line do not overlap.)' : ''),
          parts: [pl(hit ? { P1: 'ok', P2: 'ok', Q1: 'ok', Q2: 'ok' } : { P1: 'bad', P2: 'bad', Q1: 'bad', Q2: 'bad' }, hit ? { 'P1-P2': 'ok', 'Q1-Q2': 'ok' } : { 'P1-P2': 'bad', 'Q1-Q2': 'bad' }),
            { type: 'code', lang: 'java', label: 'decision', code: 'if (o1 != o2 && o3 != o4) return true;\nif (o1 == 0 && inBox(P1,P2,Q1)) return true;\nif (o2 == 0 && inBox(P1,P2,Q2)) return true;\nif (o3 == 0 && inBox(Q1,Q2,P1)) return true;\nif (o4 == 0 && inBox(Q1,Q2,P2)) return true;\nreturn false;', hl: general ? { 1: 'ok' } : hit ? { 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok' } : { 6: 'bad' } }] });
        var rx = P2[0] - P1[0], ry = P2[1] - P1[1], sx = Q2[0] - Q1[0], sy = Q2[1] - Q1[1], qx = Q1[0] - P1[0], qy = Q1[1] - P1[1];
        var den = rx * sy - ry * sx;
        if (den !== 0) {
          var t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
          var X = [P1[0] + t * rx, P1[1] + t * ry], inside = t >= 0 && t <= 1 && u >= 0 && u <= 1;
          frames.push({ narr: 'Where would the <b>lines</b> meet? r×s = ' + den + ', t = ' + r2(t) + ', u = ' + r2(u) + ' → point X = (' + r2(X[0]) + ', ' + r2(X[1]) + '). ' + (inside ? 'Both t and u are in [0,1] → X is on <b>both segments</b>.' : 'At least one of t, u is outside [0,1] → the lines meet at X, but X is off a segment, so the segments do not meet.'),
            parts: [pl({ X: inside ? 'ok' : 'bad' }, {}, X, 'lines extended meet at X'), { type: 'vars', label: 'parametric solve', vals: { 'r = P2−P1': '(' + rx + ',' + ry + ')', 's = Q2−Q1': '(' + sx + ',' + sy + ')', 'r×s': den, t: r2(t), u: r2(u) }, hl: { t: t >= 0 && t <= 1 ? 'ok' : 'bad', u: u >= 0 && u <= 1 ? 'ok' : 'bad' } }] });
        } else {
          frames.push({ narr: 'r × s = 0 → the segments are <b>parallel</b>. ' + (cross(P1, P2, Q1) === 0 ? 'They are also collinear: project both onto the line and check whether the two 1D intervals overlap (that is what the inBox checks did).' : 'They lie on different parallel lines, so they can never meet.'),
            parts: [pl({}, {}), { type: 'vars', label: 'parallel check', vals: { 'r×s': 0, 'collinear?': cross(P1, P2, Q1) === 0 ? 'yes' : 'no' } }] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'The X (proper crossing)', html: `<p>P1(0,0)–P2(6,4) and Q1(0,4)–Q2(6,0): o1 = +, o2 = −, o3 = −, o4 = + → general case → intersect at (3,2). This is the textbook case everybody gets right.</p>` },
      { title: 'The T-touch (endpoint on the other segment)', html: `<p>P1(0,0)–P2(4,0) and Q1(2,0)–Q2(2,5). o1 = cross(P1,P2,Q1) = 0 (Q1 is on the line), o2 = + , o3 = sign(cross(Q1,Q2,P1)) = +, o4 = −. o1 ≠ o2 and o3 ≠ o4 → the general case already returns true. A "strict" test that demands <code>o1·o2 &lt; 0</code> would wrongly say "no".</p>
        ${H.table(['o1', 'o2', 'o3', 'o4', 'result'], [['0', '+1', '+1', '−1', H.c('g', 'touch → true')]])}` },
      { title: 'Collinear and overlapping', html: `<p>P1(0,0)–P2(4,0) and Q1(2,0)–Q2(7,0). All four orientations are 0, so the general case fails (0 = 0). The special cases rescue it: o1 = 0 and Q1 = (2,0) is inside P's box [0..4] → <span class="c-g">true</span>. The overlap is the segment (2,0)–(4,0).</p>` },
      { title: 'Collinear but apart (the classic bug)', html: `<p>P1(0,0)–P2(2,2) and Q1(3,3)–Q2(5,5). All orientations 0. A sloppy solution that says "collinear ⇒ intersect" returns true. The bounding-box checks all fail (3 &gt; 2), so the correct answer is <span class="c-r">false</span>.</p>` },
      { title: 'Parallel, never meeting', html: `<p>P1(0,0)–P2(4,0) and Q1(0,2)–Q2(4,2). o1 = o2 = + (both Q points on the left of P), so the general case fails; no orientation is 0; answer false. In the parametric form r × s = 4·0 − 0·4 = 0 signals "parallel" before any division.</p>`, code: `long[] p1 = {0, 0}, p2 = {4, 0}, q1 = {0, 2}, q2 = {4, 2};
long rxs = (p2[0] - p1[0]) * (q2[1] - q1[1]) - (p2[1] - p1[1]) * (q2[0] - q1[0]);
System.out.println("r x s = " + rxs + " -> parallel, never divide by this");` }
    ],
    deepDive: `<p><b>Why "o1 ≠ o2 and o3 ≠ o4" is enough (with zeros).</b> If, say, o1 = 0 and o2 ≠ 0, the two lines are not parallel and meet exactly at Q1. The condition o3 ≠ o4 says P1 and P2 are on different sides of (or on) line Q1Q2, so the meeting point Q1 lies between P1 and P2 — on the segment. When both o1 and o2 are 0 the segments are collinear and the bounding-box checks take over. This is the version in CLRS (Section 33.1).</p>
      <p><b>Overflow and signs.</b> Never test <code>c1 * c2 &lt; 0</code> on raw cross products: each can be ~10<sup>18</sup>, and their product overflows long. Compare <code>Long.signum</code> values. For the crossing point keep <code>tNum</code>, <code>uNum</code> and <code>den</code> as exact integers and compare <code>0 ≤ tNum ≤ den</code> after normalising the sign; divide only at the end. If an exact rational point is required (judges sometimes want fractions), output <code>(p1.x·den + tNum·rx) / den</code> reduced by gcd.</p>
      <p><b>Many segments.</b> Testing all pairs is O(N<sup>2</sup>). The <b>Shamos–Hoey</b> sweep answers "does ANY pair intersect?" in O(N log N): sweep a vertical line left to right, keep active segments ordered by y in a balanced BST (<code>TreeSet</code> with a comparator evaluated at the current x), and only test each newly inserted or removed segment against its neighbours above and below. <b>Bentley–Ottmann</b> extends it to report all K intersections in O((N + K) log N). Both are notoriously hard to make robust — degenerate inputs (vertical segments, shared endpoints, three segments through one point) need careful tie-breaking.</p>
      <p><b>Production reality.</b> GIS engines (JTS/GEOS behind PostGIS's <code>ST_Intersects</code>) use spatial indexes (R-trees) to find candidate pairs, then exactly this predicate with robust arithmetic. Chip-design tools check millions of wire segments for shorts; game physics does "ray vs wall" tests for bullets and line of sight every frame.</p>`,
    aiEra: `<p><b>What AI changes:</b> an LLM will produce a working-looking intersection function in seconds — and in a large fraction of attempts it misses one of the degenerate cases (collinear-apart, T-touch, zero-length segment) or uses floating slopes. The interview has shifted toward "here is generated code, find the bug" and toward degenerate-case reasoning.</p>
      <p><b>Use AI as a partner:</b> <code>Generate a brute-force checker that rasterises both segments on a fine integer grid, and 1000 random small-coordinate tests including collinear and touching cases</code>. Differential testing against a dumb oracle is exactly what you would want in production and AI writes the harness fast.</p>
      <p><b>Where AI goes wrong:</b> multiplying two cross products (overflow), returning true for all collinear pairs, dividing by <code>r × s</code> before checking for zero, and mixing "touching counts" vs "strict crossing" semantics without reading the statement.</p>
      <p><b>What you must still own:</b> the case analysis table (general vs four collinear checks), the reason it is complete, and the decision of exact vs floating arithmetic.</p>`,
    problems: [{
      title: 'Intersection Point of Two Segments', level: 'Medium', tags: ['geometry', 'cross product', 'math'], companies: ['Google', 'Uber', 'Bloomberg'],
      statement: `<p>Given two segments by their endpoints <code>start1, end1</code> and <code>start2, end2</code> (integer coordinates), return their intersection point as <code>[x, y]</code>. If they share infinitely many points (collinear overlap), return the one with the <b>smallest x</b>, breaking ties by <b>smallest y</b>. If they do not meet, return an empty array. (This is "Intersection", Cracking the Coding Interview 16.3.)</p>`,
      constraints: `|coordinates| ≤ 10<sup>6</sup>; a segment may have length 0 only if both endpoints are equal; answers within 10<sup>−6</sup> are accepted`,
      example: `<p><code>start1=(0,0), end1=(1,0), start2=(1,1), end2=(0,−1)</code> → ${H.c('g', '[0.5, 0]')}. r = (1,0), s = (−1,−2), r×s = −2; t = 0.5, u = 0.5 → both inside [0,1].</p>
        <p><code>(0,0)-(3,3)</code> and <code>(1,1)-(2,2)</code> → ${H.c('g', '[1, 1]')}: collinear overlap from (1,1) to (2,2); smallest x is 1.</p>
        <p><code>(0,0)-(1,1)</code> and <code>(1,0)-(2,1)</code> → ${H.c('r', '[]')}: parallel, different lines.</p>`,
      brute: {
        why: `<p>The school approach writes each segment as <code>y = kx + b</code> and solves the two equations with doubles. It needs special code for vertical segments (k is infinite), compares slopes with <code>==</code> on doubles, and treats "same slope" as "no answer" — so it silently fails on collinear overlaps. Every patch adds another special case. It is not slow, it is <b>wrong-prone</b>: the wasted effort is all the case-handling that vector cross products make unnecessary.</p>`,
        code: `class Solution {
    // Naive slope-intercept solution: shown to illustrate the special cases it gets wrong.
    public double[] intersection(int[] s1, int[] e1, int[] s2, int[] e2) {
        if (s1[0] == e1[0] || s2[0] == e2[0]) return new double[0];   // BUG: gives up on vertical segments
        double k1 = (double) (e1[1] - s1[1]) / (e1[0] - s1[0]), b1 = s1[1] - k1 * s1[0];
        double k2 = (double) (e2[1] - s2[1]) / (e2[0] - s2[0]), b2 = s2[1] - k2 * s2[0];
        if (k1 == k2) return new double[0];                              // BUG: collinear overlaps ignored
        double x = (b2 - b1) / (k1 - k2), y = k1 * x + b1;
        if (x < Math.min(s1[0], e1[0]) || x > Math.max(s1[0], e1[0])) return new double[0];
        if (x < Math.min(s2[0], e2[0]) || x > Math.max(s2[0], e2[0])) return new double[0];
        return new double[]{x, y};
    }
}`
      },
      mcq: { q: 'You computed r × s = 0 for the two direction vectors. What is the next check?', options: ['Return empty — parallel segments never meet', 'Check whether (Q1 − P1) × r = 0; if so they are collinear and may overlap', 'Divide anyway; Java returns Infinity', 'Swap the segments and recompute'], answer: 1, explain: 'r × s = 0 means parallel. They can still overlap if they lie on the same line, which is exactly when Q1 − P1 is also parallel to r.' },
      hints: [
        `<p>Hint 1: Describe segment 1 as P1 + t·r (t from 0 to 1) and segment 2 as Q1 + u·s. A meeting point solves P1 + t·r = Q1 + u·s — two unknowns, two equations.</p>`,
        `<p>Hint 2: Cross both sides with s to remove u: t = ((Q1−P1)×s)/(r×s). Cross with r to get u = ((Q1−P1)×r)/(r×s). Keep numerators and denominator as long integers and check 0 ≤ num ≤ den after making den positive.</p>`,
        `<p>Hint 3: If r × s = 0: if (Q1−P1) × r ≠ 0 they are parallel apart → []. Otherwise collinear: the overlap (if any) starts at one of the four endpoints; collect endpoints that lie inside BOTH bounding boxes and return the lexicographically smallest.</p>`
      ],
      solution: {
        approach: `<p>Vector form removes every special case. Non-parallel: exact integer range check on t and u, then one division. Parallel: either distinct lines (empty) or collinear — then the smallest shared point must be an endpoint of one of the segments, so test the four endpoints against both boxes.</p>`,
        code: `class Solution {
    public double[] intersection(int[] s1, int[] e1, int[] s2, int[] e2) {
        long[] p1 = {s1[0], s1[1]}, p2 = {e1[0], e1[1]}, q1 = {s2[0], s2[1]}, q2 = {e2[0], e2[1]};
        long rx = p2[0] - p1[0], ry = p2[1] - p1[1];          // r = P2 - P1
        long sx = q2[0] - q1[0], sy = q2[1] - q1[1];          // s = Q2 - Q1
        long qx = q1[0] - p1[0], qy = q1[1] - p1[1];          // Q1 - P1
        long den = rx * sy - ry * sx;                         // r x s
        if (den == 0) {
            if (qx * ry - qy * rx != 0) return new double[0];  // parallel, different lines
            double[] best = null;                              // collinear: best shared endpoint
            for (long[] c : new long[][]{p1, p2, q1, q2}) {
                if (inBox(p1, p2, c) && inBox(q1, q2, c)) {
                    if (best == null || c[0] < best[0] || (c[0] == best[0] && c[1] < best[1]))
                        best = new double[]{c[0], c[1]};
                }
            }
            return best == null ? new double[0] : best;
        }
        long tNum = qx * sy - qy * sx;                        // (Q1 - P1) x s
        long uNum = qx * ry - qy * rx;                        // (Q1 - P1) x r
        if (den < 0) { den = -den; tNum = -tNum; uNum = -uNum; }
        if (tNum < 0 || tNum > den || uNum < 0 || uNum > den) return new double[0];
        double t = (double) tNum / den;
        return new double[]{p1[0] + t * rx, p1[1] + t * ry};
    }

    private boolean inBox(long[] a, long[] b, long[] p) {
        return Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0])
            && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def intersection(self, s1, e1, s2, e2):
        rx, ry = e1[0] - s1[0], e1[1] - s1[1]
        sx, sy = e2[0] - s2[0], e2[1] - s2[1]
        qx, qy = s2[0] - s1[0], s2[1] - s1[1]
        den = rx * sy - ry * sx
        def in_box(a, b, p):
            return min(a[0], b[0]) <= p[0] <= max(a[0], b[0]) and min(a[1], b[1]) <= p[1] <= max(a[1], b[1])
        if den == 0:
            if qx * ry - qy * rx != 0:
                return []
            cands = [c for c in (s1, e1, s2, e2) if in_box(s1, e1, c) and in_box(s2, e2, c)]
            return list(map(float, min(cands))) if cands else []
        t_num, u_num = qx * sy - qy * sx, qx * ry - qy * rx
        if den < 0:
            den, t_num, u_num = -den, -t_num, -u_num
        if not (0 <= t_num <= den and 0 <= u_num <= den):
            return []
        t = t_num / den
        return [s1[0] + t * rx, s1[1] + t * ry]` }],
        dry: { head: ['quantity', 'value', 'meaning'], rows: [
          ['r = P2 − P1', '(1, 0)', 'direction of segment 1'],
          ['s = Q2 − Q1', '(−1, −2)', 'direction of segment 2'],
          ['Q1 − P1', '(1, 1)', 'jump from P1 to Q1'],
          ['den = r × s', '1·(−2) − 0·(−1) = −2', 'non-zero → not parallel'],
          ['tNum = (Q1−P1) × s', '1·(−2) − 1·(−1) = −1', ''],
          ['uNum = (Q1−P1) × r', '1·0 − 1·1 = −1', ''],
          ['normalise sign', 'den = 2, tNum = 1, uNum = 1', '0 ≤ 1 ≤ 2 for both → on both segments'],
          ['answer', 'P1 + 0.5·r = (0.5, 0)', '<span class="c-g">[0.5, 0]</span>']
        ] },
        complexity: `<p><b>O(1)</b> time and space. Every intermediate product is ≤ 4·10<sup>12</sup> here, far inside long.</p>`,
        followUps: ['Return the exact answer as reduced fractions instead of doubles.', 'Given N segments, report whether any two intersect in O(N log N) (Shamos–Hoey sweep).', 'LeetCode 335 Self Crossing: a path of N moves — does it ever cross itself? (O(N) with a constant number of look-backs.)']
      }
    }]
  });

  // =====================================================================
  // TOPIC 3 — Convex hull (Andrew monotone chain, Graham scan)
  // =====================================================================
  topics.push({
    title: 'Convex Hull: Andrew\'s Monotone Chain & Graham Scan',
    analogy: `<p>Hammer a handful of nails into a wooden board. Stretch a <b>rubber band</b> wide around all of them and let go. It snaps tight and touches only the outermost nails — the inner nails are inside, untouched. The shape the band makes is the <b>convex hull</b>.</p>
      <p>To build it by hand, walk around the outside always keeping the nails on your left. Whenever you notice you just made a <b>right turn</b>, the nail you turned at was a dent — it must be inside, so you throw it away and re-check. That "undo the dent" step is the heart of every fast hull algorithm.</p>`,
    explain: `<p>A shape is <b>convex</b> if the straight segment between any two of its points stays inside it (no dents, no caves). The <b>convex hull</b> of a set of points is the smallest convex polygon containing them all. Walking its boundary counter-clockwise, every corner is a <b>left turn</b>.</p>
      <p><b>Andrew's monotone chain</b> (the one to code in interviews):</p>
      <ol>
        <li><b>Sort</b> points by x, then by y. The first and last points are surely on the hull.</li>
        <li><b>Lower hull:</b> go left → right. Push each point onto a stack, but first <b>pop</b> while the last two stack points and the new point make a <b>non-left turn</b> (<code>cross ≤ 0</code>).</li>
        <li><b>Upper hull:</b> go right → left with the same rule.</li>
        <li>Join them, dropping the duplicated end points.</li>
      </ol>
      <p><b>Worked example.</b> Points sorted: A(0,0) B(1,2) C(2,1) D(3,3) E(4,0). Lower hull:</p>
      ${H.table(['new point', 'stack before', 'test', 'action', 'stack after'], [
        ['A(0,0)', '[]', '—', 'push', '[A]'],
        ['B(1,2)', '[A]', '—', 'push', '[A, B]'],
        ['C(2,1)', '[A, B]', 'cross(A,B,C) = 1·1 − 2·2 = −3 ' + H.c('r', '≤ 0'), 'pop B, push C', '[A, C]'],
        ['D(3,3)', '[A, C]', 'cross(A,C,D) = 2·3 − 1·3 = 3 ' + H.c('g', '&gt; 0'), 'push', '[A, C, D]'],
        ['E(4,0)', '[A, C, D]', 'cross(C,D,E) = 1·(−1) − 2·2 = −5 → pop D; cross(A,C,E) = 2·0 − 1·4 = −4 → pop C', 'push', '[A, E]']
      ])}
      <p>Lower hull = A → E. Upper pass (E, D, C, B, A) gives E → D → B → A. Hull counter-clockwise: <b>A, E, D, B</b>. C was inside.</p>
      <p><b>Why O(N log N):</b> sorting is N log N; after that each point is pushed once and popped at most once per chain, so the loops are O(N) total — an amortized argument you will meet again in Topic 7.</p>
      <p><b>Graham scan</b> is the older cousin: pick the lowest point as a pivot, sort the rest by <b>angle</b> around it (using cross products, not <code>atan2</code>), then run the same push/pop stack once. Same complexity; angle sorting has more tie-breaking traps, which is why Andrew's version is usually preferred.</p>
      <p><b>Collinear points on the boundary:</b> pop on <code>cross ≤ 0</code> to drop them (minimal hull), pop only on <code>cross &lt; 0</code> to keep them (LeetCode "Erect the Fence" wants them kept).</p>`,
    clues: [
      '"<b>Smallest fence / rubber band / perimeter</b> enclosing all points" → convex hull.',
      '"<b>Farthest pair</b> of points", "<b>diameter</b> of a point set" → hull + rotating calipers (O(N) after the hull).',
      '"Is this polygon / set <b>convex</b>?", "outermost points", "boundary trees" → hull or the turn test.',
      'N up to 10<sup>5</sup>–10<sup>6</sup> points → O(N log N) monotone chain; N ≤ 100 lets you even try O(N<sup>3</sup>) brute force for checking.',
      '"Keep points that lie <b>on the edges</b>" vs "only corners" → the single character <code>&lt;</code> vs <code>≤</code> in the pop condition.',
      'DP with "<b>minimum of lines</b> a·x + b" (convex hull trick, DSA 23) → the same lower-hull stack, applied to lines instead of points.'
    ],
    code: [`
      // Andrew's monotone chain. Returns hull vertices counter-clockwise, no collinear
      // boundary points, no duplicates. O(N log N) time, O(N) extra space.
      static long cross(long[] o, long[] a, long[] b) {
          return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      }

      static List<long[]> convexHull(long[][] input) {
          long[][] p = input.clone();
          Arrays.sort(p, (a, b) -> a[0] != b[0] ? Long.compare(a[0], b[0]) : Long.compare(a[1], b[1]));
          int n = p.length;
          if (n < 3) return new ArrayList<>(Arrays.asList(p));
          long[][] h = new long[2 * n][];
          int k = 0;
          for (int i = 0; i < n; i++) {                       // lower hull, left -> right
              while (k >= 2 && cross(h[k - 2], h[k - 1], p[i]) <= 0) k--;  // pop dents
              h[k++] = p[i];
          }
          for (int i = n - 2, lower = k + 1; i >= 0; i--) {   // upper hull, right -> left
              while (k >= lower && cross(h[k - 2], h[k - 1], p[i]) <= 0) k--;
              h[k++] = p[i];
          }
          // last point equals the first one; also guards the "all points identical" case
          return new ArrayList<>(Arrays.asList(Arrays.copyOf(h, Math.max(1, k - 1))));
      }`, `
      // Graham scan: pivot = lowest (then leftmost) point; sort others by angle using cross.
      static long cross(long[] o, long[] a, long[] b) {
          return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      }
      static long dist2(long[] a, long[] b) {
          long dx = a[0] - b[0], dy = a[1] - b[1];
          return dx * dx + dy * dy;
      }

      static List<long[]> grahamScan(long[][] pts) {
          int n = pts.length, piv = 0;
          for (int i = 1; i < n; i++)
              if (pts[i][1] < pts[piv][1] || (pts[i][1] == pts[piv][1] && pts[i][0] < pts[piv][0])) piv = i;
          final long[] p0 = pts[piv];
          List<long[]> rest = new ArrayList<>();
          for (int i = 0; i < n; i++) if (i != piv) rest.add(pts[i]);
          // All points are above p0 (or level and to its right), so angles lie in [0, pi)
          // and the cross-product comparator is a valid total order.
          rest.sort((a, b) -> {
              long c = cross(p0, a, b);
              if (c != 0) return c > 0 ? -1 : 1;            // a has the smaller angle
              return Long.compare(dist2(p0, a), dist2(p0, b)); // same ray: nearer first
          });
          Deque<long[]> st = new ArrayDeque<>();
          st.push(p0);
          for (long[] p : rest) {
              while (st.size() >= 2) {
                  long[] top = st.pop();
                  if (cross(st.peek(), top, p) > 0) { st.push(top); break; }  // left turn: keep top
              }
              st.push(p);
          }
          List<long[]> hull = new ArrayList<>(st);
          Collections.reverse(hull);                           // counter-clockwise from p0
          return hull;
      }`],
    codeTitle: ['Andrew\'s monotone chain (interview default)', 'Graham scan (angle sort + stack)'],
    viz: {
      title: 'Monotone chain: build the lower and upper hull, popping every right turn',
      input: '0,0 1,3 2,1 3,4 4,2 5,0 2,5 4,4 3,2 6,3',
      inputLabel: 'points x,y (3 to 12 points, coordinates -15..15)',
      gen: function (input) {
        var raw = parsePts(input, 3, 12, 15), seen = {}, P = [];
        raw.forEach(function (p) { var k = p[0] + ',' + p[1]; if (!seen[k]) { seen[k] = 1; P.push(p); } });
        if (P.length < 3) throw new Error('Need at least 3 distinct points.');
        P.sort(function (a, b) { return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]; });
        var L = 'ABCDEFGHIJKL', ids = P.map(function (_, i) { return L[i]; }), n = P.length, frames = [];
        var st = [], doneEdges = [], phase = 'lower';
        function edgesOf(stack) { var e = []; for (var i = 0; i + 1 < stack.length; i++) e.push([ids[stack[i]], ids[stack[i + 1]]]); return e; }
        function draw(cur, popped, label) {
          var hl = {}, ehl = {}, edges = doneEdges.concat(edgesOf(st));
          st.forEach(function (i) { hl[ids[i]] = 'ok'; });
          if (cur !== undefined) hl[ids[cur]] = 'cur';
          if (popped !== undefined) hl[ids[popped]] = 'bad';
          if (cur !== undefined && st.length) { edges.push([ids[st[st.length - 1]], ids[cur]]); ehl[ids[st[st.length - 1]] + '-' + ids[cur]] = popped !== undefined ? 'bad' : 'cur'; }
          return plot(P, { ids: ids, edges: edges, hl: hl, ehl: ehl, label: label || (phase + ' hull in progress') });
        }
        function stackPart() { return { type: 'stack', label: phase + ' chain (stack)', items: st.map(function (i) { return ids[i]; }), hl: one(st.length - 1, 'cur') }; }
        frames.push({ narr: 'Step 1: <b>sort</b> by x, then y, and name the points A, B, C … in that order: ' + P.map(function (p, i) { return ids[i] + pstr(p); }).join(', ') + '. ' + ids[0] + ' (leftmost) and ' + ids[n - 1] + ' (rightmost) are surely on the hull.',
          parts: [plot(P, { ids: ids, hl: one(ids[0], 'sel'), label: 'sorted points' }), { type: 'array', label: 'sorted order', values: ids.slice() }] });
        function pass(order) {
          var base = st.length;
          order.forEach(function (i) {
            while (st.length >= base + 2) {
              var a = st[st.length - 2], b = st[st.length - 1], c = cross(P[a], P[b], P[i]);
              if (c > 0) {
                frames.push({ narr: 'New point <b>' + ids[i] + '</b>. Check the turn ' + ids[a] + ' → ' + ids[b] + ' → ' + ids[i] + ': cross = <b>' + c + '</b> &gt; 0 → <span class="c-g">left turn, ' + ids[b] + ' stays</span>.',
                  parts: [draw(i), stackPart(), { type: 'vars', vals: { turn: ids[a] + '→' + ids[b] + '→' + ids[i], cross: c }, hl: { cross: 'ok' } }] });
                break;
              }
              st.pop();
              frames.push({ narr: 'New point <b>' + ids[i] + '</b>. Turn ' + ids[a] + ' → ' + ids[b] + ' → ' + ids[i] + ': cross = <b>' + c + '</b> ' + (c === 0 ? '= 0 (straight)' : '&lt; 0 (right turn)') + ' → <span class="c-r">' + ids[b] + ' is a dent, pop it</span> and re-check with the new top.',
                parts: [draw(i, b), stackPart(), { type: 'vars', vals: { turn: ids[a] + '→' + ids[b] + '→' + ids[i], cross: c }, hl: { cross: 'bad' } }] });
            }
            st.push(i);
            frames.push({ narr: 'Push <b>' + ids[i] + '</b> onto the ' + phase + ' chain. Stack: [' + st.map(function (k) { return ids[k]; }).join(', ') + '].',
              parts: [draw(), stackPart()] });
          });
        }
        pass(P.map(function (_, i) { return i; }));
        var lower = st.slice();
        frames.push({ narr: '<b>Lower hull done</b>: ' + lower.map(function (i) { return ids[i]; }).join(' → ') + '. Now walk back right → left for the <b>upper hull</b>, starting from ' + ids[n - 1] + ', with the very same pop rule.',
          parts: [draw(undefined, undefined, 'lower hull'), stackPart()] });
        doneEdges = edgesOf(lower);
        phase = 'upper';
        st = [n - 1];
        var ord = []; for (var i = n - 2; i >= 0; i--) ord.push(i);
        // upper pass: same rule; the chain starts at the rightmost point
        (function () {
          ord.forEach(function (i) {
            while (st.length >= 2) {
              var a = st[st.length - 2], b = st[st.length - 1], c = cross(P[a], P[b], P[i]);
              if (c > 0) {
                frames.push({ narr: 'Upper pass, new point <b>' + ids[i] + '</b>. Turn ' + ids[a] + ' → ' + ids[b] + ' → ' + ids[i] + ': cross = <b>' + c + '</b> &gt; 0 → <span class="c-g">left turn, keep ' + ids[b] + '</span>.',
                  parts: [draw(i), stackPart(), { type: 'vars', vals: { turn: ids[a] + '→' + ids[b] + '→' + ids[i], cross: c }, hl: { cross: 'ok' } }] });
                break;
              }
              st.pop();
              frames.push({ narr: 'Upper pass, new point <b>' + ids[i] + '</b>. Turn ' + ids[a] + ' → ' + ids[b] + ' → ' + ids[i] + ': cross = <b>' + c + '</b> → <span class="c-r">pop ' + ids[b] + '</span>.',
                parts: [draw(i, b), stackPart(), { type: 'vars', vals: { turn: ids[a] + '→' + ids[b] + '→' + ids[i], cross: c }, hl: { cross: 'bad' } }] });
            }
            st.push(i);
            frames.push({ narr: 'Push <b>' + ids[i] + '</b>. Upper stack: [' + st.map(function (k) { return ids[k]; }).join(', ') + '].', parts: [draw(), stackPart()] });
          });
        })();
        var hull = lower.slice(0, lower.length - 1).concat(st.slice(0, st.length - 1));
        var hl = {}, ehl = {}, edges = [];
        P.forEach(function (_, i) { hl[ids[i]] = 'done'; });
        hull.forEach(function (i, k) { hl[ids[i]] = 'sel'; var j = hull[(k + 1) % hull.length]; edges.push([ids[i], ids[j]]); ehl[ids[i] + '-' + ids[j]] = 'ok'; });
        var inside = P.length - hull.length;
        frames.push({ narr: '<b>Hull (counter-clockwise):</b> ' + hull.map(function (i) { return ids[i]; }).join(' → ') + ' → back to ' + ids[hull[0]] + '. ' + inside + ' point(s) were inside or on an edge and got popped. Every point was pushed at most twice and popped at most twice → O(N) after the sort.',
          parts: [plot(P, { ids: ids, edges: edges, hl: hl, ehl: ehl, directed: true, label: 'convex hull' }), { type: 'array', label: 'hull order', values: hull.map(function (i) { return ids[i]; }) }] });
        return frames;
      }
    },
    examples: [
      { title: 'Square with a point in the middle', html: `<p>Points (0,0), (4,0), (4,4), (0,4), (2,2). Sorted: (0,0), (0,4), (2,2), (4,0), (4,4). Lower chain: (0,0), (0,4); then (2,2) arrives and the turn (0,0)→(0,4)→(2,2) has cross = −8, so (0,4) is popped; (4,0) arrives and pops (2,2) (cross = −8); (4,4) is a left turn (cross = 16). The upper chain brings back (0,4). Hull = 4 corners; (2,2) is gone.</p>
        ${H.arr(['(0,0)', '(4,0)', '(4,4)', '(0,4)'], { label: 'hull CCW', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}` },
      { title: 'All points on one line', html: `<p>(0,0), (1,1), (2,2), (3,3). With <code>pop on cross ≤ 0</code> the lower chain ends as [(0,0), (3,3)] and the upper chain also as [(3,3), (0,0)] → hull = the two end points (a "degenerate polygon" of area 0). With <code>pop on cross &lt; 0</code> every point is kept, but each appears twice (once per chain) → you must de-duplicate. Always test this case.</p>` },
      { title: 'Keeping collinear boundary points', html: `<p>Square corners plus (2,0) on the bottom edge. Minimal hull (pop on ≤ 0): 4 corners. "Erect the Fence" style (pop on &lt; 0): 5 points, including (2,0), because the turn (0,0) → (2,0) → (4,0) has cross = 0 and is not popped.</p>
        ${H.table(['pop condition', 'hull size', 'use when'], [['cross ≤ 0', '4', 'corners only (area, perimeter, calipers)'], ['cross &lt; 0', '5', 'every point touching the fence']])}` },
      { title: 'Perimeter of the fence', html: `<p>Once you have the hull, the fence length is the sum of distances between consecutive hull vertices (wrap around). For the square example: 4 + 4 + 4 + 4 = 16. Interior points never matter.</p>`, code: `long[][] hull = {{0, 0}, {4, 0}, {4, 4}, {0, 4}};
double per = 0;
for (int i = 0; i < hull.length; i++) {
    long[] a = hull[i], b = hull[(i + 1) % hull.length];
    per += Math.hypot(b[0] - a[0], b[1] - a[1]);
}
System.out.println(per);   // 16.0` },
      { title: 'Farthest pair (diameter) with rotating calipers', html: `<p>The two farthest points of a set are always hull vertices. After the hull (H vertices), sweep two "calipers": for each edge, advance the opposite pointer while the triangle area (|cross|) keeps growing. Each pointer moves at most H steps → O(H) after the hull, versus O(N<sup>2</sup>) for checking all pairs.</p>` }
    ],
    deepDive: `<p><b>Lower bound.</b> Any comparison-based hull algorithm needs Ω(N log N): put numbers x<sub>i</sub> on the parabola (x<sub>i</sub>, x<sub>i</sub><sup>2</sup>); all are hull vertices and the hull visits them in sorted order, so a faster hull would sort faster than possible.</p>
      <p><b>Output-sensitive algorithms.</b> <b>Jarvis march</b> (gift wrapping): from the leftmost point repeatedly pick the point that makes every other point lie to the left — O(N·H) where H = hull size; great when H is tiny. <b>Chan's algorithm</b> combines Graham and Jarvis for O(N log H), optimal. <b>QuickHull</b> recursively takes the farthest point from a dividing line — average O(N log N), worst O(N<sup>2</sup>), and it generalises well to 3D (Qhull, used in MATLAB/SciPy).</p>
      <p><b>Correctness of the pop rule.</b> Invariant: the stack is the lower hull of the points processed so far, with all turns strictly left. A new point to the right can only invalidate points at the <i>end</i> of the chain (those now above the segment to the new point), and those are exactly the ones failing the turn test; earlier points stay valid because the chain is convex. Each point is pushed once and popped at most once per chain → amortized O(1) per point.</p>
      <p><b>Degenerate inputs that break hull code:</b> duplicates (dedupe or the cross is 0), all collinear (two-point hull, or duplicates when keeping collinear points), fewer than 3 points, many points sharing the extreme x (sorting by y as the tiebreak matters). Overflow: coordinates near 10<sup>9</sup> need long cross products.</p>
      <p><b>Production reality.</b> Physics engines approximate objects by convex hulls because collision tests between convex shapes are cheap (GJK, separating axis theorem). Robotics computes reachable regions; GIS uses hulls (and concave hulls / alpha shapes) to outline point clouds; ML uses them in support vector machines and in the convex hull trick to speed up DP.</p>`,
    aiEra: `<p><b>What AI changes:</b> "convex hull in Java" is a solved prompt, and assistants usually produce Andrew's algorithm correctly for the generic case. The interview signal moves to: choosing <code>&lt;</code> vs <code>≤</code> for the problem's collinear rule, handling the all-collinear and duplicate cases, and connecting a word problem ("smallest fence", "farthest towers") to the hull.</p>
      <p><b>Use AI as a partner:</b> ask it to write a brute-force O(N<sup>3</sup>) hull checker plus a random generator that loves degenerate inputs (many collinear points on a grid, duplicates), then fuzz your implementation against it. Ask for a rotating-calipers implementation only after you can explain why the farthest pair lies on the hull.</p>
      <p><b>Where AI goes wrong:</b> angle sorting with <code>Math.atan2</code> (ties between nearly-parallel directions mis-ordered), Graham-scan comparators that are not transitive when the pivot is chosen badly, forgetting to remove the duplicated first point at the end, and returning duplicates for collinear inputs in "keep boundary points" variants.</p>
      <p><b>What you must still own:</b> the push/pop invariant, the amortized O(N) argument, and the edge-case table — that is what an interviewer probes after the code compiles.</p>`,
    problems: [{
      title: 'Erect the Fence', level: 'Hard', tags: ['geometry', 'convex hull', 'monotone chain'], companies: ['Google', 'Amazon'],
      statement: `<p>Trees in a garden are given as points <code>trees[i] = [x, y]</code>. Fence the whole garden with the <b>minimum length</b> of rope; a tree is "on the fence" if it lies on the rope (corners <b>and</b> trees lying exactly on a straight stretch). Return all trees on the fence, in any order. (LeetCode 587.)</p>`,
      constraints: `1 ≤ N ≤ 3000, 0 ≤ x, y ≤ 100, all points distinct`,
      example: `<p><code>[[1,1],[2,2],[2,0],[2,4],[3,3],[4,2]]</code> → ${H.c('g', '[[1,1],[2,0],[4,2],[3,3],[2,4]]')}. Only (2,2) is strictly inside.</p>
        <p><code>[[1,2],[2,2],[4,2]]</code> → ${H.c('g', '[[1,2],[2,2],[4,2]]')}: all collinear, the "fence" is a line and every tree touches it.</p>`,
      brute: {
        why: `<p>For every ordered pair (i, j), check whether <b>no</b> tree lies strictly to the right of i → j. If so, i → j is a fence edge and every tree on segment ij is on the fence. That is N<sup>2</sup> pairs × N checks = <b>O(N<sup>3</sup>)</b> ≈ 2.7·10<sup>10</sup> for N = 3000 → far too slow. The waste: most pairs are obviously interior, and we re-scan all trees for each.</p>`,
        code: `class Solution {
    public int[][] outerTrees(int[][] t) {
        int n = t.length;
        boolean[] on = new boolean[n];
        if (n <= 3) return t;                              // all of them touch the rope
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++) {
                if (i == j) continue;
                boolean edge = true;
                for (int k = 0; k < n && edge; k++)
                    if (cross(t[i], t[j], t[k]) < 0) edge = false;   // someone is on the right
                if (!edge) continue;
                for (int k = 0; k < n; k++)                     // trees on this fence stretch
                    if (cross(t[i], t[j], t[k]) == 0 && between(t[i], t[j], t[k])) on[k] = true;
            }
        List<int[]> res = new ArrayList<>();
        for (int k = 0; k < n; k++) if (on[k]) res.add(t[k]);
        return res.toArray(new int[0][]);
    }
    private int cross(int[] o, int[] a, int[] b) {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }
    private boolean between(int[] a, int[] b, int[] p) {
        return Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0])
            && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
    }
}`
      },
      mcq: { q: 'In the monotone chain, which pop condition keeps trees that lie exactly on a fence edge?', options: ['Pop while cross ≤ 0', 'Pop while cross &lt; 0', 'Pop while cross ≥ 0', 'Never pop'], answer: 1, explain: 'A tree on a straight stretch makes a zero cross product. Popping only on strictly negative (right) turns keeps it.' },
      hints: [
        `<p>Hint 1: The answer is the convex hull, <i>including</i> points on its edges. Sort points by (x, y) so the leftmost and rightmost are on the fence.</p>`,
        `<p>Hint 2: Andrew's monotone chain with the pop condition <code>cross &lt; 0</code> (only strict right turns are dents). Build the lower chain left → right and the upper chain right → left.</p>`,
        `<p>Hint 3: Collinear input makes both chains contain the same points, so de-duplicate (track indices in a boolean[]). Recipe: sort; lower pass; upper pass with stack floor = lowerSize + 1; take h[0..k−2]; skip repeated indices.</p>`
      ],
      solution: {
        approach: `<p>Monotone chain on sorted points, popping only strict right turns so collinear boundary trees stay. Store <b>indices</b> in the stack so duplicates produced by collinear inputs can be removed with a boolean array.</p>`,
        code: `class Solution {
    public int[][] outerTrees(int[][] trees) {
        int n = trees.length;
        if (n <= 3) return trees;
        int[][] p = trees.clone();
        Arrays.sort(p, (a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(a[1], b[1]));
        int[] h = new int[2 * n];          // stack of indices into p
        int k = 0;
        for (int i = 0; i < n; i++) {                                   // lower chain
            while (k >= 2 && cross(p[h[k - 2]], p[h[k - 1]], p[i]) < 0) k--;
            h[k++] = i;
        }
        for (int i = n - 2, floor = k + 1; i >= 0; i--) {              // upper chain
            while (k >= floor && cross(p[h[k - 2]], p[h[k - 1]], p[i]) < 0) k--;
            h[k++] = i;
        }
        boolean[] used = new boolean[n];
        List<int[]> res = new ArrayList<>();
        for (int i = 0; i < k - 1; i++) {   // h[k-1] is p[0] again
            if (!used[h[i]]) { used[h[i]] = true; res.add(p[h[i]]); }
        }
        return res.toArray(new int[0][]);
    }

    private int cross(int[] o, int[] a, int[] b) {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def outerTrees(self, trees):
        pts = sorted(map(tuple, trees))
        if len(pts) <= 3:
            return [list(p) for p in pts]
        def cross(o, a, b):
            return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
        def chain(seq):
            st = []
            for p in seq:
                while len(st) >= 2 and cross(st[-2], st[-1], p) < 0:
                    st.pop()
                st.append(p)
            return st
        hull = set(chain(pts)) | set(chain(pts[::-1]))   # set removes collinear duplicates
        return [list(p) for p in hull]` }],
        dry: { head: ['step', 'new point', 'turn test', 'stack after'], rows: [
          ['sort', '—', '—', 'order: (1,1) (2,0) (2,2) (2,4) (3,3) (4,2)'],
          ['lower', '(1,1), (2,0)', 'push both', '[(1,1), (2,0)]'],
          ['lower', '(2,2)', 'cross((1,1),(2,0),(2,2)) = 2 ≥ 0', '[(1,1), (2,0), (2,2)]'],
          ['lower', '(2,4)', 'cross((2,0),(2,2),(2,4)) = 0 → keep', '[…, (2,2), (2,4)]'],
          ['lower', '(3,3)', 'cross = −2 pop (2,4); cross = −2 pop (2,2); then 4 ≥ 0', '[(1,1), (2,0), (3,3)]'],
          ['lower', '(4,2)', 'cross((2,0),(3,3),(4,2)) = −4 pop (3,3)', '[(1,1), (2,0), (4,2)]'],
          ['upper', '(3,3), (2,4)', 'cross((4,2),(3,3),(2,4)) = 0 keep', '[…, (4,2), (3,3), (2,4)]'],
          ['upper', '(2,2), (2,0)', 'both pushed, then popped by (1,1)', '[…, (2,4), (1,1)]'],
          ['result', '—', 'drop last, dedupe', '<span class="c-g">(1,1) (2,0) (4,2) (3,3) (2,4)</span>']
        ] },
        complexity: `<p><b>O(N log N)</b> for the sort, O(N) for both chains (each index pushed/popped at most once per chain). Space O(N).</p>`,
        followUps: ['Return only the corners (minimum number of trees to tie the rope to).', 'Return the rope length (perimeter of the hull).', 'Erect the Fence II (LeetCode 1924): the smallest enclosing <b>circle</b> — randomized Welzl, expected O(N) (see practice).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 4 — Polygon area (shoelace), convexity, Pick, point in polygon
  // =====================================================================
  topics.push({
    title: 'Polygon Area with the Shoelace Formula (plus Convexity, Pick\'s Theorem & Point-in-Polygon)',
    analogy: `<p>Stand at a lamp post in the middle of a field and shine a torch at a fenced garden. As your friend walks along the fence, the torch beam sweeps over a thin triangle for each fence piece: lamp post → start of the piece → end of the piece. When your friend walks one way the beam paints area <b>in</b>; on the far side of the garden it sweeps back the other way and paints area <b>out</b>. After a full lap, everything outside the garden has been painted in and out equally and cancels. What is left is exactly the garden's area.</p>
      <p>That is the <b>shoelace formula</b>: add up signed triangle areas from a fixed point. It is called "shoelace" because when you write the coordinates in two columns, the multiplications criss-cross like laces in a shoe.</p>`,
    explain: `<p>For a polygon with vertices <code>P<sub>0</sub>, P<sub>1</sub>, …, P<sub>n−1</sub></code> listed <b>in order</b> around the boundary (and wrapping back to P<sub>0</sub>):</p>
      <p style="text-align:center"><code>2·Area = | ∑ (x<sub>i</sub>·y<sub>i+1</sub> − x<sub>i+1</sub>·y<sub>i</sub>) |</code></p>
      <p>Each term is the cross product of P<sub>i</sub> and P<sub>i+1</sub> as vectors from the origin — twice the <b>signed</b> area of triangle (origin, P<sub>i</sub>, P<sub>i+1</sub>).</p>
      <p><b>Worked example</b> — a house shape (0,0), (4,0), (4,3), (2,5), (0,3):</p>
      ${H.table(['i', 'P<sub>i</sub>', 'P<sub>i+1</sub>', 'x<sub>i</sub>·y<sub>i+1</sub>', 'x<sub>i+1</sub>·y<sub>i</sub>', 'term'], [
        ['0', '(0,0)', '(4,0)', '0', '0', '0'],
        ['1', '(4,0)', '(4,3)', '12', '0', '12'],
        ['2', '(4,3)', '(2,5)', '20', '6', '14'],
        ['3', '(2,5)', '(0,3)', '6', '0', '6'],
        ['4', '(0,3)', '(0,0)', '0', '0', '0'],
        ['', '', '', '', 'sum', H.c('g', '32')]
      ])}
      <p>Area = 32 / 2 = <b>16</b>. Check by eye: a 4×3 rectangle (12) + a triangle roof of base 4 and height 2 (4) = 16 ✓.</p>
      <p><b>The sign is a bonus.</b> The signed sum is <b>positive</b> when the vertices go counter-clockwise and <b>negative</b> when clockwise. So the shoelace also answers "which direction is this polygon listed in?" — useful before running algorithms that assume CCW order.</p>
      <p><b>Three friends of the shoelace:</b></p>
      <ul>
        <li><b>Convexity test:</b> walk the vertices; every turn (cross product of consecutive edges) must have the same sign. One left and one right turn → not convex.</li>
        <li><b>Pick's theorem</b> (lattice polygons — all vertices at integer points): <code>Area = I + B/2 − 1</code>, where B = lattice points on the boundary (each edge contributes <code>gcd(|dx|, |dy|)</code>) and I = lattice points strictly inside. So <code>I = Area − B/2 + 1</code> — count millions of interior points with zero loops.</li>
        <li><b>Point in polygon:</b> shoot a ray to the right from the point and count how many edges it crosses — odd means inside (the "ray casting" or even-odd rule).</li>
      </ul>`,
    clues: [
      '"<b>Area of a polygon</b> given its vertices in order" → shoelace, keep 2·area as a long integer.',
      '"Are the vertices given <b>clockwise or counter-clockwise</b>?" → sign of the shoelace sum.',
      '"Is the polygon <b>convex</b>?" → all consecutive cross products share one sign (ignore zeros).',
      '"How many <b>lattice / integer points</b> lie inside / on the boundary?" → Pick\'s theorem + gcd per edge.',
      '"Is the point <b>inside</b> the polygon / which region / geofence?" → ray casting (even-odd) or winding number.',
      'Area of the <b>largest triangle</b> from N points (N ≤ 50) → O(N<sup>3</sup>) triples with |cross| / 2; N large → triangle vertices lie on the convex hull.'
    ],
    code: [`
      // Twice the SIGNED area: > 0 counter-clockwise, < 0 clockwise. Exact in long.
      static long twiceSignedArea(long[][] p) {
          long s = 0;
          int n = p.length;
          for (int i = 0; i < n; i++) {
              long[] a = p[i], b = p[(i + 1) % n];           // wrap around to the first vertex
              s += a[0] * b[1] - b[0] * a[1];                 // cross(P_i, P_{i+1})
          }
          return s;
      }

      static double area(long[][] p) {
          return Math.abs(twiceSignedArea(p)) / 2.0;
      }

      // Convex iff all non-zero turns have the same sign (vertices in order, simple polygon).
      static boolean isConvex(long[][] p) {
          int n = p.length, sign = 0;
          for (int i = 0; i < n; i++) {
              long[] a = p[i], b = p[(i + 1) % n], c = p[(i + 2) % n];
              long cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
              int s = Long.signum(cr);
              if (s == 0) continue;                           // straight angle: fine
              if (sign == 0) sign = s;
              else if (s != sign) return false;               // a left AND a right turn
          }
          return true;
      }

      static long gcd(long a, long b) { return b == 0 ? Math.abs(a) : gcd(b, a % b); }

      // Pick's theorem: A = I + B/2 - 1  ->  I = (2A - B + 2) / 2. Lattice polygon required.
      static long[] latticeCounts(long[][] p) {
          int n = p.length;
          long b = 0;
          for (int i = 0; i < n; i++) {
              long[] u = p[i], v = p[(i + 1) % n];
              b += gcd(Math.abs(v[0] - u[0]), Math.abs(v[1] - u[1])); // lattice steps on this edge
          }
          long twiceA = Math.abs(twiceSignedArea(p));
          long inside = (twiceA - b + 2) / 2;
          return new long[]{inside, b};
      }`, `
      // Point in polygon (even-odd rule) with exact integer math.
      // Returns 1 = inside, 0 = on the boundary, -1 = outside.
      static int pointInPolygon(long[][] poly, long px, long py) {
          int n = poly.length;
          boolean inside = false;
          for (int i = 0; i < n; i++) {
              long[] a = poly[i], b = poly[(i + 1) % n];
              long cr = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
              boolean inBox = Math.min(a[0], b[0]) <= px && px <= Math.max(a[0], b[0])
                           && Math.min(a[1], b[1]) <= py && py <= Math.max(a[1], b[1]);
              if (cr == 0 && inBox) return 0;                 // exactly on an edge
              // Half-open rule: count edges whose y-range contains py as [low, high).
              long[] lo = a[1] <= b[1] ? a : b, hi = a[1] <= b[1] ? b : a;
              if (lo[1] <= py && py < hi[1]) {
                  long side = (hi[0] - lo[0]) * (py - lo[1]) - (hi[1] - lo[1]) * (px - lo[0]);
                  if (side > 0) inside = !inside;             // point left of the upward edge
              }                                               // = edge crosses the ray to the right
          }
          return inside ? 1 : -1;
      }`, { lang: 'python', run: true, title: 'Shoelace + Pick in Python (runnable)', code: `from math import gcd

def twice_signed_area(p):
    n = len(p)
    return sum(p[i][0] * p[(i + 1) % n][1] - p[(i + 1) % n][0] * p[i][1] for i in range(n))

def pick(p):
    n = len(p)
    b = sum(gcd(abs(p[(i + 1) % n][0] - p[i][0]), abs(p[(i + 1) % n][1] - p[i][1])) for i in range(n))
    a2 = abs(twice_signed_area(p))
    return (a2 - b + 2) // 2, b      # interior, boundary

house = [(0, 0), (4, 0), (4, 3), (2, 5), (0, 3)]
s = twice_signed_area(house)
print("2*signed area =", s, "-> area", abs(s) / 2, "CCW" if s > 0 else "CW")
print("clockwise listing gives", twice_signed_area(house[::-1]))
inside, boundary = pick(house)
print("lattice points inside:", inside, "on boundary:", boundary)

# brute-force check of Pick's theorem for the house
def strictly_inside(pt, poly):
    x, y = pt
    res = False
    n = len(poly)
    for i in range(n):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
        if (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1) == 0 and min(x1, x2) <= x <= max(x1, x2) and min(y1, y2) <= y <= max(y1, y2):
            return False                     # on the boundary
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            res = not res
    return res
print("brute force interior count:", sum(strictly_inside((x, y), house) for x in range(0, 5) for y in range(0, 6)))` }],
    codeTitle: ['Shoelace, convexity and Pick (Java)', 'Point in polygon, exact (Java)', 'Shoelace + Pick check (Python, runnable)'],
    viz: {
      title: 'Shoelace: add one signed "torch-beam" triangle per edge',
      input: '0,0 4,0 4,3 2,5 0,3',
      inputLabel: 'polygon vertices x,y in boundary order (3 to 9 points, coordinates -12..12)',
      gen: function (input) {
        var P = parsePts(input, 3, 9, 12), n = P.length, frames = [];
        var ids = P.map(function (_, i) { return 'P' + i; });
        var oi = -1;
        P.forEach(function (p, i) { if (p[0] === 0 && p[1] === 0) oi = i; });
        var pts = P.slice(), allIds = ids.slice();
        if (oi < 0) { pts.push([0, 0]); allIds.push('O'); }
        var Oid = oi < 0 ? 'O' : ids[oi];
        var poly = [];
        for (var i = 0; i < n; i++) poly.push([ids[i], ids[(i + 1) % n]]);
        var rows = [], sum = 0;
        frames.push({ narr: 'The polygon, listed in order ' + ids.join(' → ') + ' → back to P0. We fix the <b>origin O = (0,0)</b> as the lamp post' + (oi >= 0 ? ' (here it is the vertex ' + Oid + ')' : '') + ' and add one signed triangle (O, P<sub>i</sub>, P<sub>i+1</sub>) per edge.',
          parts: [plot(pts, { ids: allIds, edges: poly, hl: one(Oid, 'sel'), label: 'polygon and origin O' }), { type: 'vars', vals: { 'running sum (2·area)': 0 } }] });
        for (i = 0; i < n; i++) {
          var a = P[i], b = P[(i + 1) % n], t1 = a[0] * b[1], t2 = b[0] * a[1], term = t1 - t2;
          sum += term;
          rows.push([String(i), pstr(a), pstr(b), String(t1), String(t2), String(term), String(sum)]);
          var e = poly.slice(), ehl = {}, hl = {};
          if (Oid !== ids[i]) { e.push([Oid, ids[i]]); ehl[Oid + '-' + ids[i]] = term >= 0 ? 'ok' : 'bad'; }
          if (Oid !== ids[(i + 1) % n]) { e.push([Oid, ids[(i + 1) % n]]); ehl[Oid + '-' + ids[(i + 1) % n]] = term >= 0 ? 'ok' : 'bad'; }
          ehl[ids[i] + '-' + ids[(i + 1) % n]] = 'cur';
          hl[ids[i]] = 'cur'; hl[ids[(i + 1) % n]] = 'cur'; hl[Oid] = 'sel';
          frames.push({ narr: 'Edge ' + ids[i] + ' → ' + ids[(i + 1) % n] + ': term = x<sub>i</sub>·y<sub>i+1</sub> − x<sub>i+1</sub>·y<sub>i</sub> = ' + a[0] + '·' + b[1] + ' − ' + b[0] + '·' + a[1] + ' = <b>' + term + '</b>. ' + (term > 0 ? 'Positive: the beam sweeps counter-clockwise and <span class="c-g">paints area in</span>.' : term < 0 ? 'Negative: the beam sweeps clockwise and <span class="c-r">paints area out</span> (cancels earlier over-painting).' : 'Zero: O, ' + ids[i] + ' and ' + ids[(i + 1) % n] + ' are collinear — a flat triangle adds nothing.') + ' Running sum = ' + sum + '.',
            parts: [plot(pts, { ids: allIds, edges: e, ehl: ehl, hl: hl, label: 'signed triangle (O, ' + ids[i] + ', ' + ids[(i + 1) % n] + ')' }),
              { type: 'table', label: 'shoelace terms', columns: ['i', 'P_i', 'P_i+1', 'x_i·y_i+1', 'x_i+1·y_i', 'term', 'running'], rows: rows.map(function (r) { return r.slice(); }), hl: one(rows.length - 1, 'cur') }] });
        }
        var area2 = Math.abs(sum);
        frames.push({ narr: 'Sum = <b>' + sum + '</b>. ' + (sum > 0 ? 'Positive → the vertices are listed <b>counter-clockwise</b>.' : sum < 0 ? 'Negative → the vertices are listed <b>clockwise</b>.' : 'Zero → the polygon is degenerate (all points on a line).') + ' Area = |' + sum + '| / 2 = <b>' + (area2 / 2) + '</b>.',
          parts: [plot(P, { ids: ids, edges: poly, hl: (function () { var h = {}; ids.forEach(function (d) { h[d] = 'ok'; }); return h; })(), label: 'area = ' + (area2 / 2) }), { type: 'vars', vals: { 'signed sum': sum, 'area': area2 / 2, 'orientation': sum > 0 ? 'CCW' : sum < 0 ? 'CW' : 'flat' }, hl: { area: 'sel' } }] });
        function g(x, y) { x = Math.abs(x); y = Math.abs(y); while (y) { var t = x % y; x = y; y = t; } return x; }
        var B = 0, brows = [];
        for (i = 0; i < n; i++) { var u = P[i], v = P[(i + 1) % n], gg = g(v[0] - u[0], v[1] - u[1]); B += gg; brows.push([ids[i] + '→' + ids[(i + 1) % n], (v[0] - u[0]) + ', ' + (v[1] - u[1]), String(gg)]); }
        var I = (area2 - B + 2) / 2;
        frames.push({ narr: '<b>Pick\'s theorem</b> bonus (integer vertices): boundary lattice points B = ∑ gcd(|dx|, |dy|) = <b>' + B + '</b>. Interior I = Area − B/2 + 1 = ' + (area2 / 2) + ' − ' + (B / 2) + ' + 1 = <b>' + I + '</b>' + (sum === 0 ? ' (meaningless for a flat polygon).' : '. No point-by-point counting needed.') + ' (Pick needs a simple, non-self-crossing polygon.)',
          parts: [{ type: 'table', label: 'lattice steps per edge', columns: ['edge', 'dx, dy', 'gcd'], rows: brows }, { type: 'vars', vals: { B: B, 'area': area2 / 2, 'I = A − B/2 + 1': I }, hl: { 'I = A − B/2 + 1': 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Rectangle sanity check', html: `<p>(0,0), (5,0), (5,3), (0,3): terms 0, 15, 15, 0 → sum 30 → area <b>15</b> = 5 × 3 ✓. Always test a formula on a shape whose answer you know.</p>` },
      { title: 'Concave L-shape (shoelace does not care about dents)', html: `<p>(0,0), (4,0), (4,1), (1,1), (1,3), (0,3). Terms: (0·0−4·0) = 0; (4·1−4·0) = 4; (4·1−1·1) = 3; (1·3−1·1) = 2; (1·3−0·3) = 3; (0·0−0·3) = 0 → sum <b>12</b> → area <b>6</b>. Check: 4×1 bottom bar + 1×2 upright bar = 4 + 2 = 6 ✓. The dent is handled automatically by the signed triangles — no need to split the shape into rectangles.</p>
        ${H.arr([0, 4, 3, 2, 3, 0], { label: 'terms', hl: { 1: 'g', 2: 'g', 3: 'g', 4: 'g' } })}` },
      { title: 'Clockwise input flips the sign', html: `<p>The house listed backwards (0,3), (2,5), (4,3), (4,0), (0,0) gives sum <b>−32</b>. Taking the absolute value still gives area 16; the minus sign tells you the order was clockwise. Many hull/offset algorithms require CCW — reverse the list when the sign is negative.</p>` },
      { title: 'Pick\'s theorem on the house', html: `<p>Edges: (4,0) gcd 4, (0,3) gcd 3, (−2,2) gcd 2, (−2,−2) gcd 2, (0,−3) gcd 3 → B = 14. Area 16 → I = 16 − 7 + 1 = <b>10</b> interior lattice points. The runnable Python snippet confirms it by brute force.</p>` },
      { title: 'Largest triangle from a few points', html: `<p>Points (0,0), (0,1), (1,0), (0,2), (2,0). Try all triples with |cross|/2: the best is (0,0), (0,2), (2,0) → |2·2 − 0·0| / 2 = <b>2</b>. With N ≤ 50 that is only ~20 000 triples.</p>`, code: `int[][] p = {{0, 0}, {0, 1}, {1, 0}, {0, 2}, {2, 0}};
long best = 0;
for (int i = 0; i < p.length; i++)
    for (int j = i + 1; j < p.length; j++)
        for (int k = j + 1; k < p.length; k++) {
            long c = (long) (p[j][0] - p[i][0]) * (p[k][1] - p[i][1]) - (long) (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
            best = Math.max(best, Math.abs(c));
        }
System.out.println(best / 2.0);   // 2.0` }
    ],
    deepDive: `<p><b>Why the cancellation works.</b> The shoelace is the discrete form of Green's theorem: area = ½∮(x dy − y dx). Geometrically, triangle (O, P<sub>i</sub>, P<sub>i+1</sub>) has signed area ½·cross(P<sub>i</sub>, P<sub>i+1</sub>). Any point outside the polygon is covered by as many positive triangles as negative ones; any point inside is covered exactly once more positively (for CCW order). The choice of origin does not matter — moving it changes every term but the total telescopes back. In practice, <b>subtract P<sub>0</sub> from every vertex</b> first: the numbers get smaller, which reduces overflow risk and floating error for coordinates like GPS values (~10<sup>6</sup> with decimals).</p>
      <p><b>Overflow.</b> Coordinates ≤ 10<sup>9</sup> make each product ≤ 10<sup>18</sup>; the running sum of N such terms can overflow even when the final area fits. Shifting by P<sub>0</sub> helps; otherwise accumulate in <code>BigInteger</code> or use <code>Math.addExact</code> to detect it.</p>
      <p><b>When the formula lies.</b> A <b>self-intersecting</b> polygon (a bow-tie) gives the <i>net</i> signed area — the two lobes cancel. Pick's theorem needs a simple lattice polygon. On a <b>sphere</b> (lat/long on Earth) the plane formula is wrong for big regions; GIS libraries either project to a local plane (UTM) or use spherical excess / geodesic area (GeographicLib, PostGIS <code>ST_Area(geography)</code>).</p>
      <p><b>Point in polygon details.</b> Ray casting must treat vertices exactly on the ray carefully; the <b>half-open rule</b> (count an edge if <code>low.y ≤ p.y &lt; high.y</code>) counts each vertex once and ignores horizontal edges. The <b>winding number</b> (sum of signed crossings) also works for self-intersecting shapes and is what SVG's <code>nonzero</code> fill rule uses; even-odd is SVG's <code>evenodd</code>. For a <b>convex</b> polygon you can answer in O(log N) with binary search over the fan of triangles from P<sub>0</sub>. For millions of queries against fixed polygons (geofencing), use a spatial index or a trapezoidal decomposition.</p>`,
    aiEra: `<p><b>What AI changes:</b> shoelace is one line in any language and assistants recall it perfectly. The interesting work is upstream — getting vertices <b>in boundary order</b> (raw data from sensors or a database is often unordered), checking for self-intersections, choosing projection for GPS data, and deciding integer vs floating arithmetic.</p>
      <p><b>Use AI as a partner:</b> ask it to generate random lattice polygons and a brute-force interior-point counter to validate your Pick's theorem code, or to explain Green's theorem in pictures. Ask "what assumptions does this area function make about its input?" — a good model lists order, simplicity, and planarity.</p>
      <p><b>Where AI goes wrong:</b> it happily computes the "area" of unordered points (garbage), applies plane formulas to lat/long degrees, forgets the wrap-around term (last vertex back to first), and writes ray casting that double-counts a vertex lying exactly on the ray.</p>
      <p><b>What you must still own:</b> the signed-area intuition (it powers orientation of whole polygons), the half-open rule, and the habit of checking a formula on a rectangle before trusting it.</p>`,
    problems: [{
      title: 'Convex Polygon', level: 'Medium', tags: ['geometry', 'cross product'], companies: ['Google', 'Microsoft'],
      statement: `<p>You are given the vertices of a <b>simple</b> polygon (edges do not cross) in order, as <code>points[i] = [x, y]</code>. Return <code>true</code> if the polygon is <b>convex</b>. Consecutive collinear vertices are allowed. (LeetCode 469.)</p>`,
      constraints: `3 ≤ N ≤ 10<sup>4</sup>, −10<sup>4</sup> ≤ x, y ≤ 10<sup>4</sup>`,
      example: `<p><code>[[0,0],[0,5],[5,5],[5,0]]</code> → ${H.c('g', 'true')} — every turn is a right turn (cross = −25 each).</p>
        <p><code>[[0,0],[0,10],[10,10],[10,0],[5,5]]</code> → ${H.c('r', 'false')} — at (10,0) the turn is right (−50) but at (5,5) it is left (+50): a dent.</p>`,
      brute: {
        why: `<p>A polygon is convex iff for every edge, all vertices lie on one side of the edge's line. Checking every edge against every vertex is <b>O(N<sup>2</sup>)</b> = 10<sup>8</sup> cross products at N = 10<sup>4</sup> — borderline slow, and wasteful: a dent always shows up <i>locally</i> as a turn of the wrong sign, so looking at consecutive triples is enough.</p>`,
        code: `class Solution {
    public boolean isConvex(List<List<Integer>> points) {
        int n = points.size();
        for (int i = 0; i < n; i++) {
            List<Integer> a = points.get(i), b = points.get((i + 1) % n);
            int pos = 0, neg = 0;
            for (int k = 0; k < n; k++) {               // every vertex vs this edge line
                List<Integer> c = points.get(k);
                long cr = (long) (b.get(0) - a.get(0)) * (c.get(1) - a.get(1))
                        - (long) (b.get(1) - a.get(1)) * (c.get(0) - a.get(0));
                if (cr > 0) pos++;
                else if (cr < 0) neg++;
            }
            if (pos > 0 && neg > 0) return false;      // vertices on both sides
        }
        return true;
    }
}`
      },
      mcq: { q: 'Walking the polygon you see turn signs: −, −, 0, −, −. Is it convex?', options: ['No — a zero means a dent', 'Yes — zeros are straight angles; all non-zero turns agree', 'Only if N is even', 'Cannot tell without the area'], answer: 1, explain: 'A zero cross product is a 180° angle (collinear vertices). Convexity only fails when both a positive and a negative turn appear.' },
      hints: [
        `<p>Hint 1: In a convex polygon you turn the same way at every corner (all left if CCW, all right if CW). A dent is a turn the other way.</p>`,
        `<p>Hint 2: For each i compute cross(P<sub>i</sub>, P<sub>i+1</sub>, P<sub>i+2</sub>) with indices mod N. Remember the first non-zero sign.</p>`,
        `<p>Hint 3: Skip zeros (straight angles). If any later non-zero sign differs from the remembered one → false. Use long. Don't forget the two wrap-around triples (N−2, N−1, 0) and (N−1, 0, 1).</p>`
      ],
      solution: {
        approach: `<p>One pass over all N consecutive triples (with wrap-around), tracking the sign of the first non-zero turn. Because the polygon is guaranteed simple, "all turns agree" is equivalent to convex. (For a non-simple input such as a pentagram, all turns agree but it is not convex — you would also need total turning = 360°.)</p>`,
        code: `class Solution {
    public boolean isConvex(List<List<Integer>> points) {
        int n = points.size(), sign = 0;
        for (int i = 0; i < n; i++) {
            List<Integer> a = points.get(i), b = points.get((i + 1) % n), c = points.get((i + 2) % n);
            long cr = (long) (b.get(0) - a.get(0)) * (c.get(1) - a.get(1))
                    - (long) (b.get(1) - a.get(1)) * (c.get(0) - a.get(0));
            int s = Long.signum(cr);
            if (s == 0) continue;                 // straight angle: allowed
            if (sign == 0) sign = s;              // first real turn fixes the direction
            else if (s != sign) return false;     // turned the other way: dent
        }
        return true;
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def isConvex(self, points):
        n, sign = len(points), 0
        for i in range(n):
            (ax, ay), (bx, by), (cx, cy) = points[i], points[(i + 1) % n], points[(i + 2) % n]
            cr = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
            if cr:
                s = 1 if cr > 0 else -1
                if sign == 0:
                    sign = s
                elif s != sign:
                    return False
        return True` }],
        dry: { head: ['i', 'triple', 'cross', 'sign', 'state'], rows: [
          ['0', '(0,0) (0,10) (10,10)', '0·10 − 10·10 = −100', '−', 'sign = −'],
          ['1', '(0,10) (10,10) (10,0)', '10·(−10) − 0·10 = −100', '−', 'agrees'],
          ['2', '(10,10) (10,0) (5,5)', '0·(−5) − (−10)(−5) = −50', '−', 'agrees'],
          ['3', '(10,0) (5,5) (0,0)', '(−5)·0 − 5·(−10) = +50', '+', '<span class="c-r">differs → false</span>']
        ] },
        complexity: `<p>Time <b>O(N)</b>, space <b>O(1)</b>.</p>`,
        followUps: ['Also return whether the vertices are listed clockwise (sign of the shoelace sum).', 'Answer many "is point inside this convex polygon?" queries in O(log N) each.', 'How would you detect a self-intersecting (non-simple) input?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 5 — Reservoir sampling
  // =====================================================================
  topics.push({
    title: 'Reservoir Sampling: Fair Random Picks from a Stream of Unknown Length',
    analogy: `<p>You are the doorkeeper at a party and must give <b>one</b> fair lucky-draw prize to a guest. Guests arrive one at a time, you have no guest list, and nobody tells you how many will come. You may hold only <b>one</b> name card in your pocket.</p>
      <p>Trick: the 1st guest's card goes in your pocket. When the 2nd guest arrives, swap cards with probability ½. The 3rd guest: swap with probability ⅓. The i-th guest: swap with probability 1/i. When the door closes, whatever card is in your pocket is a perfectly fair winner — every guest had exactly the same chance, even though you never knew the total. Your pocket is the "reservoir".</p>`,
    explain: `<p><b>Problem:</b> pick k items uniformly at random from a stream of N items, where N is unknown or too large to store, using only O(k) memory and one pass.</p>
      <p><b>k = 1 rule:</b> keep item i (1-based) with probability <b>1/i</b>, replacing the current pick.</p>
      <p><b>Why it is fair (N = 4):</b> item 2 ends up chosen if it is picked at step 2 <i>and</i> not replaced at steps 3 and 4:</p>
      ${H.table(['item', 'picked when it arrives', 'survives step 3', 'survives step 4', 'final chance'], [
        ['1', '1', '2/3', '3/4', '1 · ½ · ⅔ · ¾ = ' + H.c('g', '1/4')],
        ['2', '1/2', '2/3', '3/4', '½ · ⅔ · ¾ = ' + H.c('g', '1/4')],
        ['3', '1/3', '—', '3/4', '⅓ · ¾ = ' + H.c('g', '1/4')],
        ['4', '1/4', '—', '—', H.c('g', '1/4')]
      ])}
      <p>(Item 1 also has to survive step 2 with chance ½.) The products <b>telescope</b>: (1/i) · (i/(i+1)) · … · ((N−1)/N) = 1/N for every i.</p>
      <p><b>General k (Algorithm R):</b></p>
      <ol>
        <li>Put the first k items straight into the reservoir array.</li>
        <li>For item number i (0-based, i ≥ k): draw <code>j = random integer in [0, i]</code>. If <code>j &lt; k</code>, replace <code>reservoir[j]</code> with the item. (So the item enters with probability k/(i+1), and evicts a uniformly random current member.)</li>
      </ol>
      <p><b>Proof sketch:</b> after processing i+1 items, each one is in the reservoir with probability <code>k/(i+1)</code>. An existing member gets evicted at step i with probability (k/(i+1)) · (1/k) = 1/(i+1), so it survives with i/(i+1); multiply: (k/i) · (i/(i+1)) = k/(i+1). ✓</p>
      <p><b>Cost:</b> O(N) time, <b>O(k)</b> memory, one pass, works on streams, files too big for RAM, linked lists, and log lines arriving forever (the reservoir is a valid sample at every moment).</p>`,
    clues: [
      '"Pick a random element from a <b>linked list / stream</b>" with "length unknown" or "cannot fit in memory" → reservoir sampling (k = 1).',
      '"Randomly sample <b>k</b> items <b>uniformly</b> in <b>one pass</b>" → Algorithm R.',
      '"Return a random <b>index</b> of the target value; the array is huge" (LeetCode 398) → reservoir over the matching positions only.',
      '"Each element must have <b>equal probability</b>" + "O(1) extra space" → reservoir, not copying into an ArrayList.',
      '"Sample proportional to <b>weights</b> from a stream" → weighted reservoir (A-Res: key = u<sup>1/w</sup>, keep the k largest).',
      'Follow-up "What if the stream is <b>distributed</b> across machines?" → sample per shard, then merge reservoirs weighted by shard counts.'
    ],
    code: [`
      // Algorithm R: k uniform samples from an Iterator of unknown length, O(k) memory.
      static <T> List<T> reservoirSample(Iterator<T> stream, int k, Random rnd) {
          List<T> res = new ArrayList<>(k);
          int i = 0;                                   // number of items seen so far
          while (stream.hasNext()) {
              T item = stream.next();
              if (i < k) {
                  res.add(item);                       // fill phase
              } else {
                  int j = rnd.nextInt(i + 1);          // uniform in [0, i]  (nextInt has no modulo bias)
                  if (j < k) res.set(j, item);         // enter with prob k/(i+1), evict a random member
              }
              i++;
          }
          return res;                                  // fewer than k items if the stream was short
      }`, `
      // Weighted reservoir (Efraimidis-Spirakis "A-Res"): item with weight w gets key u^(1/w),
      // u uniform in (0,1); keep the k LARGEST keys. Heavier items tend to get larger keys.
      static List<String> weightedSample(String[] items, double[] w, int k, Random rnd) {
          PriorityQueue<double[]> heap = new PriorityQueue<>((a, b) -> Double.compare(a[0], b[0])); // min-heap by key
          for (int i = 0; i < items.length; i++) {
              double u = 1.0 - rnd.nextDouble();                    // (0, 1], avoids log/pow of 0
              double key = Math.pow(u, 1.0 / w[i]);
              if (heap.size() < k) heap.add(new double[]{key, i});
              else if (key > heap.peek()[0]) { heap.poll(); heap.add(new double[]{key, i}); }
          }
          List<String> out = new ArrayList<>();
          for (double[] e : heap) out.add(items[(int) e[1]]);
          return out;
      }`, { lang: 'python', run: true, title: 'Empirical fairness check (Python, runnable)', code: `import random

def reservoir(stream, k, rnd):
    res = []
    for i, x in enumerate(stream):
        if i < k:
            res.append(x)
        else:
            j = rnd.randint(0, i)        # inclusive on both ends
            if j < k:
                res[j] = x
    return res

rnd = random.Random(2026)              # fixed seed -> reproducible
n, k, trials = 6, 2, 60000
count = [0] * n
for _ in range(trials):
    for x in reservoir(range(n), k, rnd):
        count[x] += 1
print("expected frequency k/n =", round(k / n, 4))
for x in range(n):
    print("item", x, "chosen", round(count[x] / trials, 4))

# A WRONG variant: replace with probability 1/2 every time -> late items dominate
count = [0] * n
for _ in range(trials):
    pick = 0
    for x in range(1, n):
        if rnd.random() < 0.5:
            pick = x
    count[pick] += 1
print("wrong 'coin flip' variant:", [round(c / trials, 3) for c in count])` }],
    codeTitle: ['Algorithm R (Java)', 'Weighted reservoir A-Res (Java)', 'Fair vs unfair, measured (Python, runnable)'],
    viz: [{
      title: 'Algorithm R step by step (seeded, so it replays the same way)',
      input: '10 20 30 40 50 60 70 80 90 | 3 | 7',
      inputLabel: 'stream values | k | seed   (2 to 14 values)',
      gen: function (input) {
        var parts = splitBar(input, 3, 'values | k | seed, e.g. "10 20 30 40 | 2 | 5"');
        var a = parseNums(parts[0], 'stream values', 2, 14, -999, 999);
        var k = Number(parts[1]), seed = Number(parts[2]);
        if (!(k >= 1 && k <= a.length && Math.floor(k) === k)) throw new Error('k must be a whole number between 1 and the stream length.');
        if (!isFinite(seed)) throw new Error('seed must be a number.');
        var r = rng(seed), res = [], frames = [];
        frames.push({ narr: 'A stream of ' + a.length + ' items arrives one at a time (pretend we cannot see the future). We keep a reservoir of <b>k = ' + k + '</b>. Memory never grows beyond k.',
          parts: [{ type: 'array', label: 'stream (unseen)', values: a, hl: (function () { var h = {}; a.forEach(function (_, i) { h[i] = 'done'; }); return h; })() }, { type: 'array', label: 'reservoir', values: [] }] });
        for (var i = 0; i < a.length; i++) {
          var hlS = {}; for (var q = 0; q < i; q++) hlS[q] = 'done'; hlS[i] = 'cur';
          if (i < k) {
            res.push(a[i]);
            frames.push({ narr: 'Item #' + i + ' = <b>' + a[i] + '</b>: reservoir not full yet → just add it.', parts: [
              { type: 'array', label: 'stream', values: a, hl: hlS, ptr: one(i, 'i') },
              { type: 'array', label: 'reservoir', values: res.slice(), hl: one(res.length - 1, 'ok') },
              { type: 'vars', vals: { i: i, 'P(item i enters)': '1 (fill phase)' } }] });
          } else {
            var j = randInt(r, 0, i), ok = j < k;
            var before = res.slice();
            if (ok) res[j] = a[i];
            frames.push({ narr: 'Item #' + i + ' = <b>' + a[i] + '</b>: draw j uniformly from [0, ' + i + '] → <b>j = ' + j + '</b>. ' + (ok ? 'j &lt; k → <span class="c-g">replace reservoir[' + j + ']</span> (' + before[j] + ' leaves).' : 'j ≥ k → <span class="c-r">skip</span>, reservoir unchanged.') + ' Chance this item enters = k/(i+1) = ' + k + '/' + (i + 1) + '.',
              parts: [
                { type: 'array', label: 'stream', values: a, hl: hlS, ptr: one(i, 'i') },
                { type: 'array', label: 'reservoir', values: res.slice(), hl: ok ? one(j, 'ok') : {}, ptr: ok ? one(j, 'j') : {} },
                { type: 'vars', vals: { i: i, j: j, k: k, 'P(enter)': k + '/' + (i + 1) }, hl: { j: ok ? 'ok' : 'bad' } },
                { type: 'code', lang: 'java', label: 'line running', code: 'int j = rnd.nextInt(i + 1);\nif (j < k) res.set(j, item);', hl: ok ? { 2: 'ok' } : { 1: 'cur' } }] });
          }
        }
        frames.push({ narr: 'Stream over. Final sample: <b>[' + res.join(', ') + ']</b>. Over many runs (different seeds), every item would appear with probability k/N = ' + k + '/' + a.length + '. Try other seeds to see different — but equally likely — samples.',
          parts: [{ type: 'array', label: 'final reservoir', values: res.slice(), hl: (function () { var h = {}; res.forEach(function (_, x) { h[x] = 'sel'; }); return h; })() }] });
        return frames;
      }
    }, {
      title: 'Why it is fair: every seen item always has the same chance k/(i+1)',
      input: '6 | 2',
      inputLabel: 'N (2..10) | k',
      gen: function (input) {
        var parts = splitBar(input, 2, 'N | k, e.g. "6 | 2"');
        var n = Number(parts[0]), k = Number(parts[1]);
        if (!(n >= 2 && n <= 10 && Math.floor(n) === n)) throw new Error('N must be a whole number from 2 to 10.');
        if (!(k >= 1 && k <= n && Math.floor(k) === k)) throw new Error('k must be between 1 and N.');
        var frames = [];
        for (var i = 0; i < n; i++) {
          var vals = [], texts = [], idx = [], hl = {};
          for (var j = 0; j <= i; j++) {
            // P(item j in reservoir after step i) = (j < k ? 1 : k/(j+1)) * prod_{t=max(j,k-1)+1..i} t/(t+1)
            var p = j < k ? 1 : k / (j + 1);
            for (var t = Math.max(j, k - 1) + 1; t <= i; t++) p *= t / (t + 1);
            vals.push(Math.round(p * 1000) / 10); texts.push(Math.round(p * 1000) / 10 + '%'); idx.push('#' + j);
            hl[j] = j === i ? 'cur' : 'ok';
          }
          frames.push({ narr: i < k ? 'After item #' + i + ' (fill phase): every seen item is in the reservoir with probability <b>1</b>.' : 'After item #' + i + ': the new item entered with chance k/(i+1) = ' + k + '/' + (i + 1) + '; each older member survived with chance i/(i+1) = ' + i + '/' + (i + 1) + '. Every bar is now exactly <b>k/(i+1) = ' + (Math.round(k / (i + 1) * 1000) / 10) + '%</b> — the products telescope.',
            parts: [{ type: 'bars', label: 'P(item is in the reservoir) after ' + (i + 1) + ' items', values: vals, texts: texts, idxLabels: idx, hl: hl },
              { type: 'vars', vals: { 'items seen': i + 1, k: k, 'k / seen': k + '/' + (i + 1) } }] });
        }
        frames.push({ narr: 'Final: all ' + n + ' bars equal k/N = ' + k + '/' + n + '. That is the definition of a <b>uniform</b> sample, achieved without ever knowing N in advance.',
          parts: [{ type: 'text', html: 'Proof in one line: <code>P = (k/(j+1)) · ((j+1)/(j+2)) · … · ((N−1)/N) = k/N</code>.' }] });
        return frames;
      }
    }],
    examples: [
      { title: 'The coin-flip trap', html: `<p>"Replace the pick with probability ½ each time" sounds fair but is not: with 6 items the last item wins with chance ½, item 0 only with (½)<sup>5</sup> ≈ 3%. The probability must <b>shrink</b> as 1/i so that early items are protected by the growing number of later competitors. The runnable Python snippet measures both.</p>
        ${H.table(['item', '0', '1', '2', '3', '4', '5'], [['coin flip', '3%', '3%', '6%', '13%', '25%', H.c('r', '50%')], ['reservoir', '16.7%', '16.7%', '16.7%', '16.7%', '16.7%', H.c('g', '16.7%')]])}` },
      { title: 'Random line from a 200 GB log file', html: `<p>You cannot load it, and counting lines first means reading 200 GB twice. Reservoir with k = 1 reads it <b>once</b>, holds one line in memory, and is a valid uniform sample even if you stop early. For k = 10 000 lines (a training-data sample), memory is 10 000 lines, not 200 GB.</p>` },
      { title: 'Random Pick Index on a huge array', html: `<p>nums = [1, 2, 3, 3, 3], target = 3. Run the reservoir only over positions where nums[i] == target: count c = 1 at i=2 (keep 2), c = 2 at i=3 (keep 3 with prob ½), c = 3 at i=4 (keep 4 with prob ⅓). Each of 2, 3, 4 is returned with probability ⅓ using O(1) extra space.</p>`, code: `int[] nums = {1, 2, 3, 3, 3};
int target = 3, count = 0, pick = -1;
Random rnd = new Random(1);
for (int i = 0; i < nums.length; i++) {
    if (nums[i] != target) continue;
    count++;
    if (rnd.nextInt(count) == 0) pick = i;   // keep with probability 1/count
}
System.out.println(pick);` },
      { title: 'Distributed reservoir merge', html: `<p>Shard A saw 900 items and keeps a sample of k; shard B saw 100. To merge into one uniform sample of k, draw each output slot from A with probability 900/1000 and from B with 100/1000 (sampling without replacement inside each reservoir, updating the remaining counts). Simply concatenating and re-sampling equally would over-represent B 9×.</p>` }
    ],
    deepDive: `<p><b>Algorithm L (skip ahead).</b> Algorithm R calls the RNG N times. Vitter's/Li's <b>Algorithm L</b> computes how many items to <i>skip</i> before the next replacement using a geometric distribution: <code>W ← W · exp(log(random())/k)</code>, <code>skip = floor(log(random()) / log(1 − W))</code>. Expected RNG calls drop to O(k(1 + log(N/k))) — a big win when the stream is a fast file scan and RNG cost dominates.</p>
      <p><b>Weighted sampling.</b> A-Res (key = u<sup>1/w</sup>) gives inclusion probabilities matching sequential weighted sampling without replacement; A-ExpJ adds exponential jumps like Algorithm L. For "sample with replacement proportional to weight" from a static array, use prefix sums + binary search (Random Pick with Weight) or Walker's <b>alias method</b> for O(1) per draw after O(N) setup.</p>
      <p><b>RNG details that matter.</b> <code>rand() % n</code> has <b>modulo bias</b> when 2<sup>32</sup> is not a multiple of n; Java's <code>nextInt(bound)</code> uses rejection to be exactly uniform. <code>java.util.Random</code> is a 48-bit LCG — fine for algorithms, not for security (use <code>SecureRandom</code>). In multi-threaded code use <code>ThreadLocalRandom</code> or <code>SplittableRandom</code> to avoid contention. Always allow a <b>seed</b> for reproducible tests.</p>
      <p><b>Production reality.</b> Reservoirs back metric systems (Dropwizard/Micrometer histograms used reservoirs to estimate latency percentiles — and their bias toward old data led to "exponentially decaying" reservoirs that favour recent samples), tracing systems sampling requests, database <code>TABLESAMPLE</code>, and ML pipelines sampling training examples from unbounded logs.</p>`,
    aiEra: `<p><b>What AI changes:</b> the code is ten lines and every assistant knows Algorithm R. What still trips people (and models) is the <b>probability argument</b> — interviewers now ask you to prove fairness or spot the bias in a slightly-wrong variant, because "write it" is trivial.</p>
      <p><b>Use AI as a partner:</b> have it generate a Monte Carlo test harness (as in the runnable snippet) or a chi-squared test to check uniformity of your sampler. Ask it to derive Algorithm L's skip formula step by step and then verify it numerically yourself.</p>
      <p><b>Where AI goes wrong:</b> off-by-one in the random range (<code>nextInt(i)</code> vs <code>nextInt(i + 1)</code>, which silently makes the newest item impossible or too likely), using <code>Math.random() * n</code> cast incorrectly, sharing one <code>Random</code> across threads, and merging distributed reservoirs naïvely.</p>
      <p><b>What you must still own:</b> the telescoping proof, the 0-based vs 1-based range, and the ability to explain why a sample is uniform at <i>every</i> moment of the stream.</p>`,
    problems: [{
      title: 'Linked List Random Node', level: 'Medium', tags: ['reservoir sampling', 'linked list', 'randomized'], companies: ['Google', 'Meta', 'Amazon'],
      statement: `<p>Given a singly linked list, implement <code>Solution(ListNode head)</code> and <code>int getRandom()</code>, which returns a random node's value such that <b>each node has the same probability</b> of being chosen. Follow-up: the list is extremely large and its length is unknown — solve it with O(1) extra space. (LeetCode 382.)</p>`,
      constraints: `1 ≤ number of nodes ≤ 10<sup>4</sup>, at most 10<sup>4</sup> calls to getRandom (follow-up: assume the list may not fit in memory)`,
      example: `<p>List 1 → 2 → 3. Each call returns 1, 2 or 3 with probability ⅓ each. One possible sequence of calls: ${H.c('b', '1, 3, 2, 2, 3')}.</p>`,
      brute: {
        why: `<p>Copy all values into an <code>ArrayList</code> in the constructor, then return <code>list.get(rnd.nextInt(size))</code>. O(1) per call, but <b>O(N) extra memory</b> — exactly what the follow-up forbids — and impossible if the list is a stream that cannot be stored or its length changes.</p>`,
        code: `class Solution {
    private final List<Integer> vals = new ArrayList<>();
    private final Random rnd = new Random();

    public Solution(ListNode head) {
        for (ListNode cur = head; cur != null; cur = cur.next) vals.add(cur.val);  // O(N) memory
    }

    public int getRandom() {
        return vals.get(rnd.nextInt(vals.size()));
    }
}`
      },
      mcq: { q: 'While walking the list you are at the 5th node (1-based). With what probability should it replace the current pick?', options: ['1/2', '1/5', '5/N', '1/N — but N is unknown'], answer: 1, explain: 'Reservoir with k = 1 keeps the i-th item with probability 1/i. The telescoping product then makes every node’s final chance 1/N.' },
      hints: [
        `<p>Hint 1: You do not need N in advance. Decide on the fly: is this node "the winner so far"?</p>`,
        `<p>Hint 2: At the i-th node (1-based) replace the current pick with probability 1/i — <code>rnd.nextInt(i) == 0</code>.</p>`,
        `<p>Hint 3: Recipe — pick = head.val; i = 1; for node in head.next…: i++; if nextInt(i) == 0, pick = node.val. Return pick. Each call is O(N) time, O(1) space.</p>`
      ],
      solution: {
        approach: `<p>Reservoir sampling with k = 1 on every call. The i-th node survives as the pick with probability (1/i) · (i/(i+1)) · … · ((N−1)/N) = 1/N, so the result is uniform without storing or counting the list.</p>`,
        code: `class Solution {
    private final ListNode head;
    private final Random rnd = new Random();

    public Solution(ListNode head) {
        this.head = head;                       // O(1) memory: keep only the head
    }

    public int getRandom() {
        int pick = head.val, i = 1;             // first node: chosen with probability 1/1
        for (ListNode cur = head.next; cur != null; cur = cur.next) {
            i++;
            if (rnd.nextInt(i) == 0) pick = cur.val;   // replace with probability 1/i
        }
        return pick;
    }
}`,
        alt: [{ lang: 'python', code: `import random

class Solution:
    def __init__(self, head):
        self.head = head

    def getRandom(self):
        pick, i, cur = self.head.val, 1, self.head.next
        while cur:
            i += 1
            if random.randrange(i) == 0:   # probability 1/i
                pick = cur.val
            cur = cur.next
        return pick` }, { lang: 'cpp', code: `struct ListNode { int val; ListNode* next; ListNode(int x) : val(x), next(nullptr) {} };  // LeetCode provides this

class Solution {
    ListNode* head;
    mt19937 gen{random_device{}()};
public:
    Solution(ListNode* h) : head(h) {}
    int getRandom() {
        int pick = head->val, i = 1;
        for (ListNode* cur = head->next; cur; cur = cur->next) {
            ++i;
            if (uniform_int_distribution<int>(0, i - 1)(gen) == 0) pick = cur->val;
        }
        return pick;
    }
};` }],
        dry: { head: ['node (i)', 'value', 'roll nextInt(i)', 'replace?', 'pick'], rows: [
          ['1', '1', '—', 'start', '1'],
          ['2', '2', '1', 'no (need 0)', '1'],
          ['3', '3', '0', '<span class="c-g">yes</span>', '3'],
          ['end', '—', '—', '—', '<span class="c-b">return 3</span>']
        ] },
        complexity: `<p>Constructor O(1). <b>getRandom: O(N) time, O(1) space.</b> (The array copy gives O(1) per call but O(N) space — the classic time/space trade-off; mention both.)</p>`,
        followUps: ['Return k distinct random nodes (Algorithm R with a k-array).', 'Many calls, list fits in memory: which version would you ship? (Copy once: O(1) per call.)', 'Make the sample weighted by node value.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 6 — Randomized algorithms: Fisher-Yates shuffle & quickselect
  // =====================================================================
  topics.push({
    title: 'Randomized Algorithms: Fisher–Yates Shuffle & Randomized Quickselect',
    analogy: `<p><b>Shuffling:</b> to shuffle a deck fairly, pull a card at random from the cards still in your hand and put it face-down on the table. Repeat with the cards left. Every card had an equal chance for every position, so every order of the deck is equally likely. That is Fisher–Yates.</p>
      <p><b>Selecting:</b> to find the 3rd shortest person in a hall of 500 without sorting everybody, pick a <b>random</b> person and ask everyone to stand left (shorter) or right (taller). If 40 people are on the left, the 3rd shortest is among them — send the other 460 home and repeat. A random pick is almost never the very tallest or shortest, so the crowd shrinks fast. That is quickselect, and the randomness is what protects it from an unlucky (or malicious) line-up.</p>`,
    explain: `<p><b>Two flavours of randomized algorithm:</b></p>
      ${H.table(['type', 'always correct?', 'running time', 'examples'], [
        ['<b>Las Vegas</b>', H.c('g', 'yes'), 'random — we bound the <i>expected</i> time', 'randomized quickselect / quicksort, treaps, skip lists, Welzl\'s min circle'],
        ['<b>Monte Carlo</b>', H.c('y', 'with high probability'), 'fixed / bounded', 'Miller–Rabin primality, Karger min cut, Bloom filters, hashing-based checks']
      ])}
      <p><b>Fisher–Yates (Knuth) shuffle:</b> for <code>i = n−1</code> down to <code>1</code>: pick <code>j</code> uniformly in <code>[0, i]</code> and swap <code>a[i]</code>, <code>a[j]</code>. Position i is then final. The number of possible choice sequences is n · (n−1) · … · 2 = <b>n!</b>, one per permutation — so each permutation has probability exactly 1/n!.</p>
      <p><b>The classic bug:</b> "for every i, swap a[i] with a[random 0..n−1]". That makes n<sup>n</sup> equally likely choice sequences. For n = 3 that is 27, which cannot split evenly into 6 permutations (27/6 = 4.5) — some orders <i>must</i> appear more often:</p>
      ${H.table(['permutation', 'ABC', 'ACB', 'BAC', 'BCA', 'CAB', 'CBA'], [['naive (out of 27)', '4', H.c('r', '5'), H.c('r', '5'), H.c('r', '5'), '4', '4'], ['Fisher–Yates (out of 6)', '1', '1', '1', '1', '1', '1']])}
      <p><b>Randomized quickselect (k-th smallest):</b></p>
      <ol>
        <li>Pick a pivot uniformly at random in the current range.</li>
        <li>Partition: smaller left, larger right (3-way partition puts equals in the middle).</li>
        <li>If the target index is in the left part, continue left; if right, continue right; if in the middle block, the pivot is the answer.</li>
      </ol>
      <p><b>Why expected O(N):</b> a pivot is "good" if it lands in the middle half of the range — probability ½. A good pivot shrinks the range to at most ¾. On average you need 2 tries per good pivot, so expected work ≤ 2·(N + ¾N + (¾)<sup>2</sup>N + …) = 2·4N = <b>8N = O(N)</b>. The worst case O(N<sup>2</sup>) still exists, but it needs bad luck on almost every step — probability vanishingly small, and no input can force it (unlike a fixed "first element" pivot on sorted input).</p>`,
    clues: [
      '"<b>Shuffle</b> an array so every permutation is <b>equally likely</b>" → Fisher–Yates, backwards loop, j in [0, i].',
      '"<b>k-th largest / smallest</b>", "<b>median</b>", "top k unsorted" in O(N) average → randomized quickselect (or a heap for O(N log k)).',
      '"Avoid worst case on <b>sorted / adversarial</b> input" → randomize the pivot or shuffle first.',
      '"<b>Expected</b> running time" / "with high probability" in the statement → a Las Vegas / Monte Carlo analysis is expected.',
      '"Random pick with <b>blacklist / weight / in a circle / in rectangles</b>" → map the random number to the answer space uniformly (prefix sums, rejection sampling).',
      'Many duplicates (e.g. all elements equal) → use a <b>3-way partition</b>, otherwise quickselect degrades to O(N<sup>2</sup>).'
    ],
    code: [`
      // Fisher-Yates: every one of the n! permutations has probability exactly 1/n!.
      static void shuffle(int[] a, Random rnd) {
          for (int i = a.length - 1; i > 0; i--) {
              int j = rnd.nextInt(i + 1);   // uniform in [0, i] -- NOT [0, n-1]
              int t = a[i]; a[i] = a[j]; a[j] = t;
          }
      }

      // Sattolo's variant: j in [0, i-1] produces a uniformly random single CYCLE
      // (nobody stays in place) -- useful for "secret santa" style derangements of one loop.
      static void sattolo(int[] a, Random rnd) {
          for (int i = a.length - 1; i > 0; i--) {
              int j = rnd.nextInt(i);       // excludes i
              int t = a[i]; a[i] = a[j]; a[j] = t;
          }
      }`, `
      // Randomized quickselect with 3-way partition. Returns the k-th smallest (0-based k).
      // Expected O(N) time, O(1) extra space; robust to duplicates and sorted input.
      static int quickselect(int[] a, int k, Random rnd) {
          int lo = 0, hi = a.length - 1;
          while (true) {
              int pivot = a[lo + rnd.nextInt(hi - lo + 1)];
              int lt = lo, i = lo, gt = hi;            // a[lo..lt-1] < p, a[lt..i-1] == p, a[gt+1..hi] > p
              while (i <= gt) {
                  if (a[i] < pivot) { int t = a[lt]; a[lt] = a[i]; a[i] = t; lt++; i++; }
                  else if (a[i] > pivot) { int t = a[gt]; a[gt] = a[i]; a[i] = t; gt--; }
                  else i++;
              }
              if (k < lt) hi = lt - 1;                  // answer is in the "smaller" part
              else if (k > gt) lo = gt + 1;             // answer is in the "larger" part
              else return pivot;                        // k lands in the "equal" block
          }
      }`, { lang: 'python', run: true, title: 'Exhaustive bias check: naive vs Fisher-Yates (Python, runnable)', code: `from itertools import product
from collections import Counter

def apply(choices, mode, n):
    a = list("ABCD"[:n])
    if mode == "naive":                 # for i in 0..n-1: swap a[i], a[rand(0..n-1)]
        for i, j in enumerate(choices):
            a[i], a[j] = a[j], a[i]
    else:                               # Fisher-Yates: for i = n-1..1: swap a[i], a[rand(0..i)]
        for i, j in zip(range(n - 1, 0, -1), choices):
            a[i], a[j] = a[j], a[i]
    return "".join(a)

n = 3
naive = Counter(apply(c, "naive", n) for c in product(range(n), repeat=n))
fy_choices = product(*[range(i + 1) for i in range(n - 1, 0, -1)])   # j ranges [0..2], [0..1]
fy = Counter(apply(c, "fy", n) for c in fy_choices)
print("naive  (27 equally likely runs):", dict(sorted(naive.items())))
print("Fisher-Yates (6 equally likely runs):", dict(sorted(fy.items())))` }],
    codeTitle: ['Fisher–Yates and Sattolo (Java)', 'Randomized quickselect, 3-way partition (Java)', 'Count every possible run (Python, runnable)'],
    viz: [{
      title: 'Fisher–Yates: lock in one position per step, right to left',
      input: 'A B C D E F G | 11',
      inputLabel: 'items (2 to 12, space separated) | seed',
      gen: function (input) {
        var parts = splitBar(input, 2, 'items | seed, e.g. "A B C D | 3"');
        var a = parts[0].split(/\s+/).filter(function (x) { return x; });
        if (a.length < 2 || a.length > 12) throw new Error('Give 2 to 12 items.');
        a = a.map(function (x) { return x.slice(0, 4); });
        var seed = Number(parts[1]);
        if (!isFinite(seed)) throw new Error('seed must be a number.');
        var r = rng(seed), n = a.length, frames = [];
        frames.push({ narr: 'Start with ' + n + ' items. We go from the <b>last</b> position down. At position i we pick j uniformly in <b>[0, i]</b> (only among the not-yet-locked items) and swap. Total equally likely runs = ' + n + '! — exactly one per permutation.',
          parts: [{ type: 'array', label: 'array', values: a.slice() }] });
        for (var i = n - 1; i > 0; i--) {
          var j = randInt(r, 0, i), hl = {}, k;
          for (k = i + 1; k < n; k++) hl[k] = 'done';
          hl[i] = 'cur'; hl[j] = j === i ? 'cur' : 'sel';
          frames.push({ narr: 'i = ' + i + ': choose j uniformly from 0..' + i + ' (' + (i + 1) + ' equally likely options) → <b>j = ' + j + '</b>. ' + (j === i ? 'j = i: the item stays where it is (this is allowed and necessary for fairness).' : 'Swap a[' + i + '] = ' + a[i] + ' with a[' + j + '] = ' + a[j] + '.'),
            parts: [{ type: 'array', label: 'before swap', values: a.slice(), hl: hl, ptr: j === i ? one(i, 'i=j') : (function () { var p = {}; p[i] = 'i'; p[j] = 'j'; return p; })(), range: [0, i] },
              { type: 'vars', vals: { i: i, j: j, 'choices here': i + 1 } }] });
          var t = a[i]; a[i] = a[j]; a[j] = t;
          var hl2 = {}; for (k = i; k < n; k++) hl2[k] = k === i ? 'ok' : 'done';
          frames.push({ narr: 'Position ' + i + ' is now <b>locked</b> with ' + a[i] + '. It will never be touched again; the rest (0..' + (i - 1) + ') is a smaller copy of the same problem.',
            parts: [{ type: 'array', label: 'after swap', values: a.slice(), hl: hl2, range: [0, i - 1] }] });
        }
        frames.push({ narr: 'Done: <b>' + a.join(' ') + '</b>. Each run picks one of ' + n + '·' + (n - 1) + '·…·2 = ' + n + '! paths, and each path gives a different permutation → perfectly uniform.',
          parts: [{ type: 'array', label: 'shuffled', values: a.slice(), hl: (function () { var h = {}; a.forEach(function (_, x) { h[x] = 'ok'; }); return h; })() }] });
        return frames;
      }
    }, {
      title: 'Why the naive shuffle is biased: count every possible run',
      input: '3',
      inputLabel: 'n = 3 or 4',
      gen: function (input) {
        var n = Number(txt(input));
        if (n !== 3 && n !== 4) throw new Error('Type 3 or 4 (the number of runs grows as n^n).');
        var base = 'ABCD'.slice(0, n).split(''), perms = [], frames = [];
        (function gen(pre, rest) { if (!rest.length) { perms.push(pre.join('')); return; } rest.forEach(function (x, i) { gen(pre.concat([x]), rest.slice(0, i).concat(rest.slice(i + 1))); }); })([], base);
        var cnt = {}; perms.forEach(function (p) { cnt[p] = 0; });
        var total = Math.pow(n, n);
        frames.push({ narr: 'The naive loop does <code>swap(a[i], a[rand(0..' + (n - 1) + ')])</code> for every i. That is ' + n + '<sup>' + n + '</sup> = <b>' + total + '</b> equally likely runs, but only ' + n + '! = <b>' + perms.length + '</b> permutations. ' + total + ' / ' + perms.length + ' is not a whole number, so it cannot be uniform. Let us count.',
          parts: [{ type: 'bars', label: 'runs ending in each permutation', values: perms.map(function () { return 0; }), idxLabels: perms }] });
        for (var first = 0; first < n; first++) {
          for (var c = 0; c < Math.pow(n, n - 1); c++) {
            var ch = [first], x = c;
            for (var q = 1; q < n; q++) { ch.push(x % n); x = Math.floor(x / n); }
            var arr = base.slice();
            for (var i = 0; i < n; i++) { var t = arr[i]; arr[i] = arr[ch[i]]; arr[ch[i]] = t; }
            cnt[arr.join('')]++;
          }
          frames.push({ narr: 'Counted all runs whose first swap partner is ' + first + ' (' + (first + 1) * Math.pow(n, n - 1) + ' of ' + total + ' runs so far).',
            parts: [{ type: 'bars', label: 'runs ending in each permutation', values: perms.map(function (p) { return cnt[p]; }), idxLabels: perms }] });
        }
        var vals = perms.map(function (p) { return cnt[p]; }), mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals), hl = {};
        vals.forEach(function (v, i) { hl[i] = v === mx ? 'bad' : v === mn ? 'win' : ''; });
        frames.push({ narr: 'Final counts: the most likely permutation appears <b>' + mx + '</b> times, the least likely <b>' + mn + '</b> times — a ' + Math.round((mx / mn - 1) * 100) + '% bias. Fisher–Yates has exactly ' + perms.length + ' runs, one per permutation, so every bar would be 1.',
          parts: [{ type: 'bars', label: 'naive shuffle (red = over-represented)', values: vals, idxLabels: perms, hl: hl },
            { type: 'bars', label: 'Fisher–Yates', values: perms.map(function () { return 1; }), idxLabels: perms, hl: (function () { var h = {}; perms.forEach(function (_, i) { h[i] = 'ok'; }); return h; })() }] });
        return frames;
      }
    }, {
      title: 'Randomized quickselect: partition around a random pivot, keep one side',
      input: '7 2 9 4 1 8 3 6 5 | 3 | 22',
      inputLabel: 'array (3 to 14 numbers) | k (1 = smallest) | seed',
      gen: function (input) {
        var parts = splitBar(input, 3, 'array | k | seed, e.g. "5 1 4 2 3 | 2 | 7"');
        var a = parseNums(parts[0], 'array', 3, 14, -99, 99), k = Number(parts[1]), seed = Number(parts[2]);
        if (!(k >= 1 && k <= a.length && Math.floor(k) === k)) throw new Error('k must be between 1 and the array length.');
        if (!isFinite(seed)) throw new Error('seed must be a number.');
        var r = rng(seed), target = k - 1, lo = 0, hi = a.length - 1, frames = [], round = 0;
        frames.push({ narr: 'Find the <b>' + k + (k % 100 >= 11 && k % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][k % 10] || 'th')) + ' smallest</b> = the value that would sit at index ' + target + ' after sorting. Sorting costs N log N; we will only partition, and keep the side that contains index ' + target + '.',
          parts: [{ type: 'array', label: 'array', values: a.slice(), ptr: one(target, 'target') }] });
        while (round < 20) {
          round++;
          var pi = randInt(r, lo, hi), pivot = a[pi];
          var hl0 = {}; hl0[pi] = 'sel';
          frames.push({ narr: 'Round ' + round + ': range [' + lo + ', ' + hi + '] (' + (hi - lo + 1) + ' elements). Random pivot index ' + pi + ' → <b>pivot = ' + pivot + '</b>.',
            parts: [{ type: 'array', label: 'array', values: a.slice(), hl: hl0, range: [lo, hi], ptr: (function () { var p = {}; p[target] = 'target'; if (pi !== target) p[pi] = 'pivot'; else p[pi] = ['pivot', 'target']; return p; })() },
              { type: 'vars', vals: { lo: lo, hi: hi, pivot: pivot, target: target } }] });
          var lt = lo, i = lo, gt = hi, t;
          while (i <= gt) {
            if (a[i] < pivot) { t = a[lt]; a[lt] = a[i]; a[i] = t; lt++; i++; }
            else if (a[i] > pivot) { t = a[gt]; a[gt] = a[i]; a[i] = t; gt--; }
            else i++;
          }
          var hl = {}, x;
          for (x = lo; x < lt; x++) hl[x] = 'win';
          for (x = lt; x <= gt; x++) hl[x] = 'sel';
          for (x = gt + 1; x <= hi; x++) hl[x] = 'cur';
          var where = target < lt ? 'left (smaller) part' : target > gt ? 'right (larger) part' : 'equal block';
          frames.push({ narr: 'After 3-way partition: blue = smaller than ' + pivot + ' [' + lo + '..' + (lt - 1) + '], purple = equal [' + lt + '..' + gt + '], amber = larger [' + (gt + 1) + '..' + hi + ']. Target index ' + target + ' is in the <b>' + where + '</b>' + (where === 'equal block' ? ' → <span class="c-g">answer = ' + pivot + '</span>.' : ' → discard the other ' + (target < lt ? hi - lt + 1 : gt - lo + 1) + ' elements.'),
            parts: [{ type: 'array', label: 'partitioned', values: a.slice(), hl: hl, ptr: one(target, 'target') },
              { type: 'vars', vals: { lt: lt, gt: gt, target: target, 'kept size': where === 'equal block' ? 0 : (target < lt ? lt - lo : hi - gt) }, hl: { target: 'cur' } }] });
          if (target < lt) hi = lt - 1;
          else if (target > gt) lo = gt + 1;
          else {
            var sorted = a.slice().sort(function (p, q) { return p - q; });
            frames.push({ narr: 'Done in ' + round + ' round(s). Check: sorted array is [' + sorted.join(', ') + '], index ' + target + ' holds <b>' + sorted[target] + '</b> ✓. Work done ≈ size of each range scanned, a shrinking series — expected O(N).',
              parts: [{ type: 'array', label: 'sorted (for checking only)', values: sorted, hl: one(target, 'ok') }] });
            break;
          }
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Off-by-one that breaks Fisher–Yates', html: `<p>Writing <code>rnd.nextInt(i)</code> instead of <code>rnd.nextInt(i + 1)</code> means an element can never stay in place — you get <b>Sattolo's algorithm</b>, which only produces permutations that form a single cycle ((n−1)! of them). For n = 3, only BCA and CAB can ever appear. A one-character bug, a totally different distribution.</p>
        ${H.table(['code', 'outcomes', 'uniform over all n!?'], [['nextInt(i + 1)', 'n!', H.c('g', 'yes')], ['nextInt(i)', '(n−1)! single cycles', H.c('r', 'no')], ['nextInt(n) for every i', 'n<sup>n</sup> runs', H.c('r', 'no (biased)')]])}` },
      { title: 'Quickselect trace: 2nd largest of [3, 2, 1, 5, 6, 4]', html: `<p>2nd largest = index 4 in ascending order. Pivot 3 → [2, 1 | 3 | 6, 4, 5]; index 4 is in the right part [3..5]. Pivot 5 → [4 | 5 | 6]; index 4 is the equal block → answer <b>5</b>. Two partitions touched 6 + 3 = 9 elements instead of sorting.</p>` },
      { title: 'Why a fixed pivot is dangerous', html: `<p>Quickselect with "pivot = first element" on an already sorted array of 10<sup>5</sup> elements, asking for the largest: each partition removes only one element → 10<sup>5</sup> + (10<sup>5</sup> − 1) + … ≈ 5·10<sup>9</sup> steps → TLE. LeetCode 215 contains exactly such tests. A random pivot makes no input bad; a 3-way partition handles the all-equal array.</p>` },
      { title: 'Random point in a circle (rejection sampling)', html: `<p>Pick x, y uniformly in the square [−r, r]<sup>2</sup>; if x<sup>2</sup> + y<sup>2</sup> &gt; r<sup>2</sup>, try again. Acceptance probability = π/4 ≈ 78.5%, so the expected number of tries is 4/π ≈ 1.27 — a Las Vegas algorithm. The tempting "random angle + random radius" is <b>biased</b> toward the centre; the correct polar method uses radius = r·√u.</p>`, code: `Random rnd = new Random(7);
double r = 1.0, x, y;
int tries = 0;
do {
    x = (rnd.nextDouble() * 2 - 1) * r;
    y = (rnd.nextDouble() * 2 - 1) * r;
    tries++;
} while (x * x + y * y > r * r);          // reject points outside the circle
System.out.println(x + ", " + y + " after " + tries + " tries");` }
    ],
    deepDive: `<p><b>Quickselect's exact expectation.</b> Using indicator variables (elements i and j are compared iff one of them is the first pivot chosen among the values between them), expected comparisons for quickselect are at most ≈ 3.39N (and 2N ln N ≈ 1.39 N log<sub>2</sub>N for quicksort). <b>Floyd–Rivest</b> picks the pivot from a small random sample and needs only about N + min(k, N−k) + o(N) comparisons. Deterministic linear time exists — <b>median of medians</b> (groups of 5, recursion on the medians) — but its constant (~20N) makes it slower in practice; libraries use <b>introselect</b> (C++ <code>std::nth_element</code>): quickselect, falling back to a guaranteed method if recursion gets too deep.</p>
      <p><b>Adversaries.</b> A deterministic pivot rule can be attacked: McIlroy's "killer adversary" builds inputs that make any fixed-pivot quicksort quadratic. Randomness defeats this <i>only if the attacker cannot predict the RNG</i> — the same reason hash tables use random seeds (hash-flooding DoS attacks, 2011). Java's <code>Arrays.sort</code> for primitives is a dual-pivot quicksort that falls back to heapsort when recursion gets too deep, so it cannot be driven quadratic; for objects it uses TimSort (stable, worst case O(N log N)).</p>
      <p><b>Shuffling in production.</b> Use <code>Collections.shuffle</code> (Fisher–Yates inside). A 32-bit seed has only ~4·10<sup>9</sup> states, but 52! ≈ 8·10<sup>67</sup>: most deck orders are <b>unreachable</b> from such a generator. A famous 1999 online-poker flaw seeded the shuffle with the system clock, letting researchers predict hands in real time. For gambling or security, use <code>SecureRandom</code>.</p>
      <p><b>Analysing randomized code:</b> linearity of expectation (no independence needed), geometric distribution (expected tries = 1/p), Markov/Chernoff bounds for "with high probability" claims, and the birthday paradox (√N draws until the first repeat) for hashing and ID collisions.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLMs reliably write <code>Collections.shuffle</code> or a textbook Fisher–Yates; they are less reliable at <i>reasoning about distributions</i>. Interviews increasingly hand you a subtly biased sampler or an O(N<sup>2</sup>)-prone quickselect and ask "is this uniform / what is its worst case?"</p>
      <p><b>Use AI as a partner:</b> ask it to enumerate every run of a small randomized procedure (as in the bias visualizer), or to write a chi-squared test for your shuffle. Ask for an adversarial input generator against your pivot rule. Ask it to explain the median-of-medians recurrence T(N) = T(N/5) + T(7N/10) + O(N) and check its algebra.</p>
      <p><b>Where AI goes wrong:</b> <code>nextInt(n)</code> instead of <code>nextInt(i + 1)</code>, sorting with a random comparator (<code>(a, b) -&gt; rnd.nextInt(3) - 1</code> — biased and can throw "Comparison method violates its general contract"), Lomuto partition on many duplicates, and claiming "O(N) worst case" for randomized quickselect.</p>
      <p><b>What you must still own:</b> the counting argument (n! paths vs n<sup>n</sup> runs), the good-pivot expectation argument, and the difference between expected, amortized and worst-case bounds.</p>`,
    problems: [{
      title: 'Kth Largest Element in an Array', level: 'Medium', tags: ['quickselect', 'randomized', 'partition'], companies: ['Meta', 'Amazon', 'Microsoft', 'LinkedIn'],
      statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, return the <b>k-th largest</b> element in sorted order (not the k-th distinct). Can you do it without sorting? (LeetCode 215.)</p>`,
      constraints: `1 ≤ k ≤ N ≤ 10<sup>5</sup>, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup> (lots of duplicates are possible)`,
      example: `<p><code>nums = [3,2,1,5,6,4], k = 2</code> → ${H.c('g', '5')} (sorted: 1 2 3 4 <b>5</b> 6).</p>
        <p><code>nums = [3,2,3,1,2,4,5,5,6], k = 4</code> → ${H.c('g', '4')} (sorted descending: 6 5 5 <b>4</b> …).</p>`,
      brute: {
        why: `<p>Sort and return <code>nums[N − k]</code>: <b>O(N log N)</b>. It does far more work than needed — it fully orders thousands of elements we never look at. A size-k min-heap is O(N log k), better but still not linear.</p>`,
        code: `class Solution {
    public int findKthLargest(int[] nums, int k) {
        int[] a = nums.clone();
        Arrays.sort(a);                 // O(N log N): orders everything
        return a[a.length - k];
    }
}`
      },
      mcq: { q: 'nums has 10<sup>5</sup> copies of the same number. Which quickselect variant stays fast?', options: ['Lomuto partition with a random pivot', 'Hoare partition with pivot = first element', '3-way (Dutch flag) partition with a random pivot', 'Any — duplicates do not matter'], answer: 2, explain: 'With 2-way partitions all equal keys go to one side, so each round removes one element → O(N²). A 3-way partition puts all equal keys in the middle block and finishes in one round.' },
      hints: [
        `<p>Hint 1: The k-th largest is the element at index <code>N − k</code> of the sorted array. You only need to know which element lands there, not the full order.</p>`,
        `<p>Hint 2: Partition around a random pivot into &lt; p, = p, &gt; p. Only one side can contain index N − k; drop the rest and loop.</p>`,
        `<p>Hint 3: Use a 3-way partition (lt, i, gt pointers) so duplicates finish instantly. Loop: pick pivot in [lo, hi]; partition; if target &lt; lt → hi = lt − 1; if target &gt; gt → lo = gt + 1; else return pivot.</p>`
      ],
      solution: {
        approach: `<p>Randomized quickselect with a Dutch-national-flag partition. Each round is linear in the current range; the range shrinks geometrically in expectation, giving expected O(N). Randomness protects against sorted inputs; the 3-way split protects against duplicates.</p>`,
        code: `class Solution {
    private final Random rnd = new Random();

    public int findKthLargest(int[] nums, int k) {
        int target = nums.length - k;            // index in ascending order
        int lo = 0, hi = nums.length - 1;
        while (true) {
            int pivot = nums[lo + rnd.nextInt(hi - lo + 1)];
            int lt = lo, i = lo, gt = hi;        // < pivot | == pivot | unknown | > pivot
            while (i <= gt) {
                if (nums[i] < pivot) swap(nums, lt++, i++);
                else if (nums[i] > pivot) swap(nums, i, gt--);
                else i++;
            }
            if (target < lt) hi = lt - 1;        // go left
            else if (target > gt) lo = gt + 1;   // go right
            else return pivot;                   // inside the equal block
        }
    }

    private void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }
}`,
        alt: [{ lang: 'python', code: `import random

class Solution:
    def findKthLargest(self, nums, k):
        target, lo, hi = len(nums) - k, 0, len(nums) - 1
        while True:
            p = nums[random.randint(lo, hi)]
            lt, i, gt = lo, lo, hi
            while i <= gt:
                if nums[i] < p:
                    nums[lt], nums[i] = nums[i], nums[lt]; lt += 1; i += 1
                elif nums[i] > p:
                    nums[gt], nums[i] = nums[i], nums[gt]; gt -= 1
                else:
                    i += 1
            if target < lt:
                hi = lt - 1
            elif target > gt:
                lo = gt + 1
            else:
                return p` }, { lang: 'cpp', code: `class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        // The standard library already ships introselect: expected O(N), worst O(N log N).
        nth_element(nums.begin(), nums.begin() + (nums.size() - k), nums.end());
        return nums[nums.size() - k];
    }
};` }],
        dry: { head: ['round', 'range', 'pivot', 'array after partition', 'lt..gt', 'target 4 is…'], rows: [
          ['1', '[0, 5]', '3', '[2, 1, <b>3</b>, 6, 4, 5]', '2..2', 'right → lo = 3'],
          ['2', '[3, 5]', '5', '[2, 1, 3, 4, <b>5</b>, 6]', '4..4', '<span class="c-g">equal block → return 5</span>']
        ] },
        complexity: `<p><b>Expected O(N)</b> time (≈ a few N comparisons), worst case O(N<sup>2</sup>) with negligible probability; <b>O(1)</b> extra space (iterative, in place — note it reorders the input; clone it if the caller needs the original).</p>`,
        followUps: ['Return the k largest elements in any order (they are everything right of the answer after the final partition).', 'Stream of numbers: maintain the k-th largest online (min-heap of size k, LeetCode 703).', 'Guarantee O(N) worst case (median of medians) — and explain why libraries rarely use it.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 7 — Amortized analysis
  // =====================================================================
  topics.push({
    title: 'Amortized Analysis: Dynamic Arrays, Binary Counters, Monotonic Stacks & Union-Find',
    analogy: `<p>You run the dishwasher at home. Every day you drop in a few dishes — <b>cheap</b>, a few seconds. Once in a while the machine is full and you must run it and unload 60 dishes — <b>expensive</b>, twenty minutes. Is "putting away a dish" slow? No: spread the big unloading over the 60 dishes that caused it and each dish costs a few extra seconds. That spreading-out is <b>amortized cost</b>.</p>
      <p>Another way to see it: a <b>piggy bank</b>. Every cheap step you pay a little <i>extra</i> coin into the bank. When the expensive step comes, the bank already holds enough coins to pay for it. If the bank never goes negative, your "price per step" is an honest upper bound on the average — for <b>every</b> possible sequence of operations, not just typical ones.</p>`,
    explain: `<p><b>Amortized cost</b> = total cost of a worst-case <i>sequence</i> of M operations ÷ M. It is a <b>guarantee</b> (no probability involved), unlike "average case" (which assumes random inputs) or "expected" (which assumes random choices by the algorithm).</p>
      <p><b>Example 1 — dynamic array (ArrayList / vector) with doubling.</b> Appending costs 1, except when the array is full: then allocate twice the space and copy everything (cost = size).</p>
      ${H.table(['push #', '1', '2', '3', '4', '5', '6', '7', '8', '9'], [
        ['capacity before', '1', '1', '2', '4', '4', '8', '8', '8', '8'],
        ['copies', '0', '1', '2', '0', '4', '0', '0', '0', '8'],
        ['cost (1 + copies)', '1', '2', '3', '1', '5', '1', '1', '1', '9']
      ])}
      <p>Copies over N pushes = 1 + 2 + 4 + … &lt; 2N (a geometric series). Total ≤ N + 2N = <b>3N</b> → <b>O(1) amortized per push</b>, even though one single push can cost O(N).</p>
      <p><b>The three proof methods</b> (same answer, different bookkeeping):</p>
      <ul>
        <li><b>Aggregate:</b> add up the whole sequence's cost and divide (what we just did).</li>
        <li><b>Accounting / banker's:</b> charge each push <b>3 coins</b>: 1 pays for writing it, 2 are saved on that element. When the array of size m doubles, the m/2 elements added since the last doubling hold m coins — exactly enough to copy all m elements.</li>
        <li><b>Potential:</b> define Φ = 2·size − capacity (≥ 0 right after a doubling). Amortized cost = actual cost + ΔΦ. A normal push: 1 + 2 = 3. A doubling push at size m: (1 + m) + (2 − m) = 3. Always 3.</li>
      </ul>
      <p><b>Example 2 — binary counter.</b> Incrementing flips a run of trailing 1s to 0 and one 0 to 1. One increment can flip log N bits, but bit 0 flips every time, bit 1 every 2nd time, bit 2 every 4th… total flips over N increments &lt; N(1 + ½ + ¼ + …) = <b>2N</b> → O(1) amortized.</p>
      <p><b>Example 3 — monotonic stack.</b> The inner <code>while (stack not empty &amp;&amp; top &lt; x) pop()</code> looks like it could make the loop O(N<sup>2</sup>). But each element is pushed once and popped at most once, so all the pops in the whole run total ≤ N → <b>O(N) overall</b>. Same argument for the two pointers of a sliding window, and for the hull stack in Topic 3.</p>
      <p><b>Example 4 — union-find.</b> With union by rank + path compression, any sequence of M operations on N elements costs O(M · α(N)), where α (inverse Ackermann) is ≤ 4 for any N you will ever see. A single <code>find</code> can still walk a long path once — but it flattens that path, so the cost cannot repeat.</p>`,
    clues: [
      'A loop with an <b>inner while that pops / advances</b> something ("while stack top &lt; x pop") → count total pushes/pops: O(N) amortized, not O(N<sup>2</sup>).',
      '"<b>Amortized O(1)</b>", "average cost per operation over a sequence" → aggregate / banker / potential argument expected.',
      '"Design a data structure where operations are <b>usually cheap but occasionally rebuild</b>" (resize, rehash, compaction) → geometric growth + amortized proof.',
      '"Queue using two stacks", "<b>min/max stack</b>", "stock span", "sliding window max" → each element moves a constant number of times.',
      'Interviewer asks "<b>what is the worst case of a single call?</b>" right after you say O(1) → they are testing that you know amortized ≠ worst-case per operation.',
      '"Union-Find is O(1)?" follow-up → O(α(N)) amortized with both optimisations; O(log N) with only one of them; no amortized bound if you need rollback.'
    ],
    code: [`
      // A growable int array: amortized O(1) add/removeLast, memory always O(size).
      class IntVector {
          private int[] data = new int[1];
          private int size = 0;

          void add(int x) {
              if (size == data.length) resize(2 * data.length);   // full: DOUBLE (geometric growth)
              data[size++] = x;
          }

          int removeLast() {
              if (size == 0) throw new NoSuchElementException();
              int x = data[--size];
              // Shrink only at 1/4 full, not 1/2: halving at 1/2 would let an add/remove
              // pair at the boundary trigger a full copy every time (thrashing).
              if (size > 0 && size == data.length / 4) resize(data.length / 2);
              return x;
          }

          int get(int i) {
              if (i < 0 || i >= size) throw new IndexOutOfBoundsException(i);
              return data[i];
          }

          int size() { return size; }

          private void resize(int cap) {
              data = Arrays.copyOf(data, Math.max(1, cap));      // O(size) copy, rare
          }
      }`, `
      // Binary counter: one increment may flip many bits, but N increments flip < 2N bits.
      static int increment(int[] bits) {          // bits[0] = least significant bit
          int flips = 0, i = 0;
          while (i < bits.length && bits[i] == 1) { bits[i++] = 0; flips++; }   // trailing 1s -> 0
          if (i < bits.length) { bits[i] = 1; flips++; }                          // first 0 -> 1
          return flips;
      }

      // Union-Find with union by rank + path compression: O(alpha(N)) amortized per op.
      static int[] parent, rank;
      static int find(int x) {
          while (parent[x] != x) {
              parent[x] = parent[parent[x]];       // path halving (a form of compression)
              x = parent[x];
          }
          return x;
      }
      static boolean union(int a, int b) {
          int ra = find(a), rb = find(b);
          if (ra == rb) return false;
          if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
          parent[rb] = ra;                         // attach the shorter tree under the taller
          if (rank[ra] == rank[rb]) rank[ra]++;
          return true;
      }`, `
      // Monotonic stack: inner while looks quadratic, but every index is pushed once
      // and popped at most once -> O(N) total. Returns next greater element (or -1).
      static int[] nextGreater(int[] a) {
          int n = a.length;
          int[] ans = new int[n];
          Arrays.fill(ans, -1);
          Deque<Integer> st = new ArrayDeque<>();  // indices with decreasing values
          for (int i = 0; i < n; i++) {
              while (!st.isEmpty() && a[st.peek()] < a[i]) ans[st.pop()] = a[i];
              st.push(i);
          }
          return ans;
      }`],
    codeTitle: ['Dynamic array with grow and shrink', 'Binary counter and union-find', 'Monotonic stack (amortized O(N))'],
    viz: [{
      title: 'Dynamic array: cheap pushes save coins that pay for the rare copy',
      input: '17 | x2',
      inputLabel: 'number of pushes (4..24) | growth: x2, x1.5 or +K (e.g. +3)',
      gen: function (input) {
        var parts = splitBar(input, 2, 'pushes | growth, e.g. "17 | x2" or "17 | +3"');
        var n = Number(parts[0]), g = parts[1].replace(/\s/g, '');
        if (!(n >= 4 && n <= 24 && Math.floor(n) === n)) throw new Error('Number of pushes must be 4 to 24.');
        var mode, f;
        if (/^x(2|1\.5)$/.test(g)) { mode = 'mul'; f = Number(g.slice(1)); }
        else if (/^\+\d+$/.test(g) && Number(g.slice(1)) >= 1 && Number(g.slice(1)) <= 8) { mode = 'add'; f = Number(g.slice(1)); }
        else throw new Error('Growth must be x2, x1.5 or +K with K from 1 to 8.');
        var cap = 1, size = 0, total = 0, bank = 0, costs = [], frames = [];
        function cells() { var c = []; for (var i = 0; i < cap; i++) c.push(i < size ? 'v' + i : '·'); return c; }
        frames.push({ narr: 'Empty array, capacity 1. Every push is charged a flat <b>3 coins</b> (banker\'s method): 1 coin pays for writing the element, the rest go into the bank. Growth rule: <b>' + g + '</b>.',
          parts: [{ type: 'array', label: 'memory (capacity ' + cap + ')', values: cells() }, { type: 'vars', vals: { size: 0, capacity: cap, 'total cost': 0, bank: 0 } }] });
        for (var p = 1; p <= n; p++) {
          var copies = 0, grew = false, oldCap = cap;
          if (size === cap) { copies = size; grew = true; cap = mode === 'mul' ? Math.max(cap + 1, Math.floor(cap * f)) : cap + f; }
          size++;
          var cost = 1 + copies;
          total += cost; bank += 3 - cost; costs.push(cost);
          var hl = {}; hl[size - 1] = grew ? 'bad' : 'ok';
          if (grew) for (var q = 0; q < size - 1; q++) hl[q] = 'cur';
          var bhl = {}; bhl[costs.length - 1] = grew ? 'bad' : 'ok';
          frames.push({ narr: 'Push #' + p + ': ' + (grew ? '<span class="c-r">array full</span> → allocate capacity ' + cap + ' (was ' + oldCap + ') and copy ' + copies + ' element(s); cost = 1 + ' + copies + ' = <b>' + cost + '</b>.' : 'room available → cost <b>1</b>.') + ' Total so far ' + total + ' for ' + p + ' pushes = <b>' + (Math.round(total / p * 100) / 100) + '</b> per push. Bank = ' + bank + (bank < 0 ? ' <span class="c-r">(negative! 3 coins per push are NOT enough for this growth rule)</span>' : '') + '.',
            parts: [{ type: 'array', label: 'memory (capacity ' + cap + ')', values: cells(), hl: hl },
              { type: 'bars', label: 'actual cost of each push', values: costs.slice(), hl: bhl, idxLabels: costs.map(function (_, i) { return '#' + (i + 1); }) },
              { type: 'vars', vals: { size: size, capacity: cap, 'total cost': total, 'cost per push': Math.round(total / p * 100) / 100, bank: bank }, hl: { bank: bank < 0 ? 'bad' : 'ok' } }] });
        }
        frames.push({ narr: mode === 'mul' ? 'Geometric growth (' + g + '): copies form a geometric series, so the cost per push stays a <b>constant</b> no matter how many pushes (≤ 3 for doubling; a 1.5× rule needs about 4 coins per push, so the 3-coin bank may dip). That is amortized O(1).' : 'Additive growth (+' + f + '): the array copies every ' + f + ' pushes and each copy is bigger than the last → total cost grows like N<sup>2</sup>/' + (2 * f) + '. Cost per push keeps <b>rising</b> — amortized O(N). Always grow by a <b>factor</b>.',
          parts: [{ type: 'bars', label: 'cost per push', values: costs.slice(), idxLabels: costs.map(function (_, i) { return '#' + (i + 1); }) }, { type: 'vars', vals: { pushes: n, 'total cost': total, 'cost per push': Math.round(total / n * 100) / 100 }, hl: { 'cost per push': mode === 'mul' ? 'ok' : 'bad' } }] });
        return frames;
      }
    }, {
      title: 'Binary counter: count every bit flip over N increments',
      input: '16',
      inputLabel: 'number of increments (4..40)',
      gen: function (input) {
        var n = Number(txt(input));
        if (!(n >= 4 && n <= 40 && Math.floor(n) === n)) throw new Error('Type a whole number of increments from 4 to 40.');
        var v = 0, total = 0, frames = [], per = [];
        frames.push({ narr: 'A 6-bit counter starting at 0. An increment flips the trailing 1s to 0 and the next 0 to 1. Worst single increment flips many bits — but how many flips <b>in total</b>?',
          parts: [{ type: 'bits', label: 'counter', value: 0, width: 6 }, { type: 'vars', vals: { increments: 0, 'total flips': 0 } }] });
        for (var s = 1; s <= n; s++) {
          var nv = (v + 1) & 63, changed = v ^ nv, flips = 0, hl = {};
          for (var b = 0; b < 6; b++) if (changed & (1 << b)) { flips++; hl[b] = (nv >> b) & 1 ? 'ok' : 'bad'; }
          total += flips; per.push(flips); v = nv;
          frames.push({ narr: 'Increment #' + s + ': ' + flips + ' bit flip(s) (' + (flips > 1 ? (flips - 1) + ' trailing 1s became 0, then one 0 became 1' : 'just bit 0') + '). Total flips ' + total + ' &lt; 2 × ' + s + ' = ' + (2 * s) + '.',
            parts: [{ type: 'bits', label: 'counter', value: v, width: 6, hl: hl },
              { type: 'bars', label: 'flips per increment', values: per.slice(), idxLabels: per.map(function (_, i) { return '#' + (i + 1); }), hl: one(per.length - 1, flips > 2 ? 'bad' : 'ok') },
              { type: 'vars', vals: { increments: s, 'total flips': total, '2·increments': 2 * s }, hl: { 'total flips': 'ok' } }] });
        }
        frames.push({ narr: 'Bit 0 flipped ' + n + ' times, bit 1 about ' + Math.floor(n / 2) + ', bit 2 about ' + Math.floor(n / 4) + ' … the sum is below 2N. Potential view: Φ = number of 1-bits; an increment that clears t ones costs t + 1 but lowers Φ by t − 1, so amortized cost = 2.',
          parts: [{ type: 'vars', vals: { N: n, 'total flips': total, 'per increment': Math.round(total / n * 100) / 100 }, hl: { 'per increment': 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Monotonic stack: every element is pushed once and popped at most once',
      input: '2 1 5 3 4 1 6 2',
      inputLabel: 'array (3 to 14 numbers)',
      gen: function (input) {
        var a = parseNums(input, 'array', 3, 14, -99, 99), n = a.length, st = [], ans = a.map(function () { return '?'; }), pushes = 0, pops = 0, frames = [];
        frames.push({ narr: 'Next greater element with a stack. The inner <code>while</code> can pop many items in one step — is that O(N<sup>2</sup>)? Let us count total pushes and pops.',
          parts: [{ type: 'array', label: 'a', values: a }, { type: 'stack', label: 'stack (indices)', items: [] }, { type: 'vars', vals: { pushes: 0, pops: 0 } }] });
        for (var i = 0; i < n; i++) {
          var popped = [];
          while (st.length && a[st[st.length - 1]] < a[i]) { var t = st.pop(); ans[t] = a[i]; pops++; popped.push(t); }
          st.push(i); pushes++;
          var hl = {}; hl[i] = 'cur'; popped.forEach(function (t) { hl[t] = 'ok'; });
          frames.push({ narr: 'i = ' + i + ', a[i] = ' + a[i] + ': ' + (popped.length ? 'pop ' + popped.length + ' smaller item(s) (indices ' + popped.join(', ') + ') — their next greater is ' + a[i] + '.' : 'nothing smaller on top.') + ' Push ' + i + '. Work this step = ' + (popped.length + 1) + ', but total pops can never exceed total pushes.',
            parts: [{ type: 'array', label: 'a', values: a, hl: hl, ptr: one(i, 'i') },
              { type: 'stack', label: 'stack (index:value)', items: st.map(function (x) { return x + ':' + a[x]; }), hl: one(st.length - 1, 'cur') },
              { type: 'array', label: 'answer', values: ans.slice() },
              { type: 'vars', vals: { pushes: pushes, pops: pops, 'pushes + pops': pushes + pops, '2N': 2 * n } }] });
        }
        st.forEach(function (x) { ans[x] = -1; });
        frames.push({ narr: 'Leftovers have no greater element → −1. Total work = pushes + pops = ' + (pushes + pops) + ' ≤ 2N = ' + (2 * n) + '. <b>O(N)</b>, even though single steps varied.',
          parts: [{ type: 'array', label: 'next greater', values: ans }, { type: 'vars', vals: { pushes: pushes, pops: pops, '2N': 2 * n }, hl: { pops: 'ok' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Growth by +10 is quadratic', html: `<p>Grow by 10 slots each time: copies happen at sizes 10, 20, 30, …, N, total ≈ 10 + 20 + … + N = N<sup>2</sup>/20. For N = 10<sup>6</sup> that is 5·10<sup>10</sup> copies — minutes instead of milliseconds. Any constant <b>factor</b> &gt; 1 (2, 1.5, even 1.1) gives O(1) amortized; any constant <b>addend</b> gives O(N).</p>
        ${H.table(['growth rule', 'copies for N pushes', 'amortized push'], [['×2', '&lt; 2N', H.c('g', 'O(1)')], ['×1.5 (Java ArrayList)', '&lt; 3N', H.c('g', 'O(1)')], ['+10', '≈ N<sup>2</sup>/20', H.c('r', 'O(N)')]])}` },
      { title: 'Shrinking at half is a trap (thrashing)', html: `<p>Capacity 8, size 8. Rule "halve when size ≤ capacity/2" + "double when full". Push → double to 16 (copy 8). Pop → size 8 = 16/2 → halve to 8 (copy 8). Push → full → double (copy 8)… every operation costs O(N). Shrinking at <b>¼ full</b> leaves a gap of N/4 cheap operations between any two resizes, restoring O(1) amortized.</p>` },
      { title: 'Queue from two stacks', html: `<p>Push onto <code>in</code>. To pop, if <code>out</code> is empty move <b>everything</b> from <code>in</code> to <code>out</code> (reverses the order), then pop <code>out</code>. A single pop can cost O(N), but each element is moved from in to out at most once in its life → each element costs ≤ 4 stack operations total → O(1) amortized per queue operation.</p>`, code: `Deque<Integer> in = new ArrayDeque<>(), out = new ArrayDeque<>();
for (int x = 1; x <= 3; x++) in.push(x);          // enqueue 1, 2, 3
if (out.isEmpty()) while (!in.isEmpty()) out.push(in.pop());   // one O(N) transfer
System.out.println(out.pop() + " " + out.pop()); // 1 2 (FIFO), next pops are O(1)` },
      { title: 'Union-find: one slow find, then fast forever', html: `<p>A chain 1 → 2 → 3 → 4 → 5 (root 5). <code>find(1)</code> walks 4 links (slow) but path compression points 1, 2, 3 directly at 5. The next <code>find(1)</code> takes 1 step. The expensive walk "pays" for flattening, so the total over M operations is O(M α(N)).</p>
        ${H.arr(['1→2', '2→3', '3→4', '4→5'], { label: 'before' })}${H.arr(['1→5', '2→5', '3→5', '4→5'], { label: 'after find(1)', hl: { 0: 'g', 1: 'g', 2: 'g' } })}` },
      { title: 'Amortized vs expected vs worst case', html: `<p>Three different promises:</p>
        ${H.table(['bound', 'promise', 'example'], [['worst case per op', 'every single call is fast', 'balanced BST insert O(log N)'], ['amortized', 'any sequence of M calls costs ≤ M·c', 'ArrayList.add, union-find'], ['expected', 'average over the algorithm\'s random choices', 'quickselect, skip list, hashing']])}
        <p>A latency-sensitive system (trading, games at 60 fps, real-time audio) may reject an amortized structure because one call occasionally stalls.</p>` }
    ],
    deepDive: `<p><b>Potential method, formally.</b> Pick Φ(state) ≥ 0 with Φ(initial) = 0. Define amortized cost ĉ<sub>i</sub> = c<sub>i</sub> + Φ<sub>i</sub> − Φ<sub>i−1</sub>. Summing telescopes: ∑ĉ = ∑c + Φ<sub>final</sub> − Φ<sub>0</sub> ≥ ∑c. So bounding every ĉ<sub>i</sub> bounds the real total. For grow-and-shrink arrays use Φ = |2·size − capacity| (or a piecewise version) to cover both directions. Classic potential-method results: splay trees (Φ = ∑ log subtree sizes → O(log N) amortized), Fibonacci heaps (Φ = trees + 2·marked → O(1) amortized decrease-key, which gives Dijkstra O(E + V log V)), and union-find (Tarjan's α(N) proof; Tarjan also proved a matching lower bound for pointer machines).</p>
      <p><b>Growth factor choice.</b> Java <code>ArrayList</code> grows by 1.5× (<code>old + (old &gt;&gt; 1)</code>), CPython lists by ~1.125× plus a constant, C++ libstdc++ <code>vector</code> by 2×, MSVC by 1.5×, Go slices by 2× until 256 elements then smoothly toward 1.25×. A factor below the golden ratio (≈1.618) lets freed blocks be reused by later allocations; a larger factor means fewer copies but more wasted memory (up to 50% at 2×).</p>
      <p><b>De-amortization.</b> When single-operation latency matters, spread the rebuild: allocate the new array early and copy two old elements on every push (incremental resizing). Redis rehashes its dictionaries incrementally (a few buckets per operation, two tables live at once); Go maps grow incrementally during writes; real-time garbage collectors work in small slices. The total work is the same, but no single call stalls.</p>
      <p><b>When amortized bounds break.</b> They assume a <b>single timeline</b>. With <b>persistence</b> or <b>rollback</b> (undo the last union, branch a data structure), an adversary can replay the expensive operation many times. That is why "DSU with rollback" (offline dynamic connectivity) uses union by rank <b>without</b> path compression: O(log N) worst case per find, and undo is O(1).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants correctly state "ArrayList add is amortized O(1)" but frequently conflate amortized, average-case and expected bounds, or call a monotonic-stack solution "O(N<sup>2</sup>) because of the nested loop". Code review — human or AI-assisted — needs someone who can make the counting argument in one sentence.</p>
      <p><b>Use AI as a partner:</b> ask it to instrument your code with operation counters (pushes, pops, copies) and plot cost per operation for adversarial sequences — the fastest way to see amortization or catch thrashing. Ask it to propose a potential function and then check the algebra yourself.</p>
      <p><b>Where AI goes wrong:</b> shrinking at ½ capacity, additive growth in hand-rolled buffers, claiming O(1) worst-case for <code>HashMap.put</code> (it is amortized and expected), and forgetting that union-find with path compression is incompatible with rollback.</p>
      <p><b>What you must still own:</b> the "each element is pushed once and popped once" argument, the geometric-series bound, and the judgement of when a latency spike from an amortized structure is unacceptable.</p>`,
    problems: [{
      title: 'Design a Growable Array (ArrayList from scratch)', level: 'Medium', tags: ['amortized analysis', 'design', 'arrays'], companies: ['Microsoft', 'Bloomberg', 'Oracle'],
      statement: `<p>Implement <code>GrowableArray</code> backed by a plain <code>int[]</code> with <code>add(x)</code> (append), <code>get(i)</code>, <code>set(i, x)</code>, <code>removeLast()</code> and <code>size()</code>. Requirements: <code>get</code>/<code>set</code> O(1) worst case; <code>add</code>/<code>removeLast</code> <b>amortized O(1)</b>; memory must stay <b>O(size)</b> even after many removals. Explain why your resize policy meets the bounds.</p>`,
      constraints: `up to 10<sup>6</sup> operations in any order; values fit in int; removeLast on empty → throw`,
      example: `<p>add 5, add 7, add 9 (capacity 1 → 2 → 4), get(1) = ${H.c('g', '7')}, removeLast() = ${H.c('g', '9')}, removeLast() = ${H.c('g', '7')} → size 1 = capacity 4 / 4 → shrink to 2. Total copies stay linear in the number of operations.</p>`,
      brute: {
        why: `<p>Grow the array by exactly <b>one</b> slot on every add (allocate size+1, copy all). Each add copies the whole array: 0 + 1 + 2 + … + (N−1) ≈ N<sup>2</sup>/2 copies → 5·10<sup>11</sup> for 10<sup>6</sup> adds. The waste: we keep paying for the same copies again and again instead of buying spare room in advance.</p>`,
        code: `class GrowableArray {
    private int[] data = new int[0];

    void add(int x) {
        int[] bigger = new int[data.length + 1];          // grow by ONE: O(N) every time
        System.arraycopy(data, 0, bigger, 0, data.length);
        bigger[data.length] = x;
        data = bigger;
    }

    int removeLast() {
        if (data.length == 0) throw new NoSuchElementException();
        int x = data[data.length - 1];
        data = Arrays.copyOf(data, data.length - 1);      // shrink by ONE: O(N) every time
        return x;
    }

    int get(int i) { return data[i]; }
    void set(int i, int x) { data[i] = x; }
    int size() { return data.length; }
}`
      },
      mcq: { q: 'You double when full. When should you halve the capacity during removals?', options: ['When size drops to capacity / 2', 'When size drops to capacity / 4', 'Never — memory is cheap', 'On every removal'], answer: 1, explain: 'Halving at ½ lets an add/remove pair at the boundary trigger a full copy every time. At ¼, after halving the array is half full, so at least capacity/4 cheap operations happen before the next resize.' },
      hints: [
        `<p>Hint 1: Separate <b>size</b> (elements used) from <b>capacity</b> (array length). Most adds just write into spare capacity.</p>`,
        `<p>Hint 2: When full, allocate <b>2×</b> capacity and copy. Copies form 1 + 2 + 4 + … &lt; 2N, so adds are O(1) amortized (charge 3 coins per add).</p>`,
        `<p>Hint 3: For removals, halve when size == capacity/4 (not /2), keep capacity ≥ 1, and bounds-check get/set against <b>size</b>, not capacity. Potential Φ = |2·size − capacity| proves both directions.</p>`
      ],
      solution: {
        approach: `<p>Geometric growth (×2 when full) and lazy shrink (÷2 at a quarter full). Between any two resizes at least capacity/4 cheap operations happen, and each resize costs O(capacity), so the copying spreads to O(1) per operation. Memory ≤ 4·size + 1.</p>`,
        code: `class GrowableArray {
    private int[] data = new int[1];
    private int size = 0;

    void add(int x) {
        if (size == data.length) resize(data.length * 2);       // geometric growth
        data[size++] = x;
    }

    int removeLast() {
        if (size == 0) throw new NoSuchElementException("empty");
        int x = data[--size];
        if (size > 0 && size == data.length / 4) resize(data.length / 2);  // lazy shrink
        return x;
    }

    int get(int i) { check(i); return data[i]; }
    void set(int i, int x) { check(i); data[i] = x; }
    int size() { return size; }
    int capacity() { return data.length; }

    private void check(int i) {
        if (i < 0 || i >= size) throw new IndexOutOfBoundsException("index " + i + ", size " + size);
    }

    private void resize(int cap) {
        int[] next = new int[Math.max(1, cap)];
        System.arraycopy(data, 0, next, 0, size);                // O(size), rare
        data = next;
    }
}`,
        alt: [{ lang: 'python', code: `class GrowableArray:
    def __init__(self):
        self.data, self.size = [0], 0

    def _resize(self, cap):
        new = [0] * max(1, cap)
        new[:self.size] = self.data[:self.size]
        self.data = new

    def add(self, x):
        if self.size == len(self.data):
            self._resize(2 * len(self.data))
        self.data[self.size] = x
        self.size += 1

    def remove_last(self):
        if self.size == 0:
            raise IndexError("empty")
        self.size -= 1
        x = self.data[self.size]
        if self.size > 0 and self.size == len(self.data) // 4:
            self._resize(len(self.data) // 2)
        return x

    def get(self, i):
        if not 0 <= i < self.size:
            raise IndexError(i)
        return self.data[i]` }],
        dry: { head: ['operation', 'size', 'capacity', 'copies', 'note'], rows: [
          ['add 5', '1', '1', '0', 'fits'],
          ['add 7', '2', '2', '1', 'full → double'],
          ['add 9', '3', '4', '2', 'full → double'],
          ['add 4', '4', '4', '0', 'fits'],
          ['removeLast → 4', '3', '4', '0', '3 ≠ 4/4'],
          ['removeLast → 9', '2', '4', '0', '2 ≠ 1'],
          ['removeLast → 7', '1', '2', '1', '1 == 4/4 → halve'],
          ['total', '—', '—', '4 copies / 7 ops', '<span class="c-g">linear</span>']
        ] },
        complexity: `<p>get/set <b>O(1)</b> worst case. add/removeLast <b>O(1) amortized</b> (a single call can be O(N) when it resizes). Space <b>O(size)</b>: capacity ≤ 4·size + 1 after any removal.</p>`,
        followUps: ['Add insert(i, x) and remove(i): what is their cost and why?', 'Make add worst-case O(1) with incremental copying (two arrays live at once).', 'Why does Java pick 1.5× growth instead of 2×?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 8 — Skip lists
  // =====================================================================
  topics.push({
    title: 'Skip Lists: Express Lanes over a Sorted Linked List',
    analogy: `<p>A city metro has a <b>local line</b> that stops at every station and an <b>express line</b> that stops only at a few big ones. To reach a small station far away, you ride the express as far as you can <i>without overshooting</i>, then step down to the local line for the last few stops. Some cities add a <b>super-express</b> above that. You never ride every station, so the trip is short.</p>
      <p>A <b>skip list</b> is that metro for a sorted linked list. And the clever part is how stations become "express": each one flips a coin. Heads → it also gets an express stop; heads again → a super-express stop too. No careful planning or rebalancing — luck alone makes the lanes well spread out on average.</p>`,
    explain: `<p><b>The problem:</b> a sorted linked list can insert in O(1) once you are at the right spot, but <i>finding</i> the spot is O(N) — no random access, so no binary search.</p>
      <p><b>The structure:</b> level 0 is the full sorted list. Each node also appears on level 1 with probability ½, on level 2 with probability ¼, and so on (keep flipping a coin until tails). A head sentinel sits at the left of every level.</p>
      ${H.table(['level', 'nodes present (keys 3 7 9 12 19 21 25 26)', 'expected count'], [
        ['L3', '· · · · · · 21 · ·', 'N/8'],
        ['L2', '· · 9 · · · 21 · ·', 'N/4'],
        ['L1', '3 · 9 · 19 · 21 · 26', 'N/2'],
        ['L0', '3 7 9 12 19 21 25 26', 'N']
      ])}
      <p><b>Search(x):</b> start at the head on the top level. While the next node on this level is <b>&lt; x</b>, move right. Otherwise drop down one level. At level 0, the next node is x if x exists.</p>
      <p><b>Worked search for 25</b> in the table above: L3: head → 21 (21 &lt; 25), next is null → down. L2: at 21, next null → down. L1: next is 26 (not &lt; 25) → down. L0: next is 25 → <b>found</b>. 5 moves instead of 7 on the plain list; with 10<sup>6</sup> keys it is ~40 moves instead of ~500 000.</p>
      <p><b>Insert(x):</b> search as above, remembering in <code>update[level]</code> the last node visited on each level (the node after which x must be spliced). Flip coins for x's height h. For each level below h: <code>x.next[l] = update[l].next[l]; update[l].next[l] = x</code>. <b>Delete</b> is the same walk, then unlink x from every level it appears on.</p>
      <p><b>Costs (expected):</b> height ≈ log<sub>2</sub>N, search / insert / delete <b>O(log N)</b>, space ≈ 2N pointers (N + N/2 + N/4 + …). Worst case O(N) exists but needs absurd coin luck. It also supports ordered operations a hash table cannot: floor/ceiling, range scans, and (with span counts) rank queries.</p>`,
    clues: [
      '"Design a <b>Skiplist</b> without built-in libraries" (LeetCode 1206) → multi-level linked list + coin flips + update[] array.',
      '"Sorted set with <b>O(log N)</b> insert/delete/search, but <b>simpler than a red-black tree</b>" → skip list.',
      '"<b>Concurrent</b> sorted map", "lock-free ordered structure" → skip list (Java <code>ConcurrentSkipListMap</code>).',
      '"<b>Leaderboard / rank</b> of a player, range by score" → Redis sorted set = skip list + hash map (spans give the rank).',
      'Answer must be "<b>expected</b> O(log N)" and "randomized" is allowed → skip list or treap rather than AVL/red-black.',
      'LSM-tree <b>memtable</b>, in-memory index that is written heavily and scanned in order → skip list (LevelDB / RocksDB).'
    ],
    code: [`
      // A complete skip list for ints (duplicates allowed), expected O(log N) per operation.
      class SkipList {
          private static final int MAX_LEVEL = 16;          // enough for ~2^16 = 65k elements at p = 1/2
          private static final double P = 0.5;              // promotion probability

          private static final class Node {
              final int val;
              final Node[] next;                            // next[l] = successor on level l
              Node(int val, int height) { this.val = val; this.next = new Node[height]; }
          }

          private final Node head = new Node(Integer.MIN_VALUE, MAX_LEVEL); // sentinel on every level
          private int levels = 1;                           // levels currently in use
          private final Random rnd;

          SkipList(long seed) { rnd = new Random(seed); }

          private int randomHeight() {                      // 1 + number of consecutive heads
              int h = 1;
              while (h < MAX_LEVEL && rnd.nextDouble() < P) h++;
              return h;
          }

          boolean contains(int x) {
              Node cur = head;
              for (int l = levels - 1; l >= 0; l--)         // top level down
                  while (cur.next[l] != null && cur.next[l].val < x) cur = cur.next[l]; // ride right
              cur = cur.next[0];
              return cur != null && cur.val == x;
          }

          void insert(int x) {
              Node[] update = new Node[MAX_LEVEL];
              Node cur = head;
              for (int l = levels - 1; l >= 0; l--) {
                  while (cur.next[l] != null && cur.next[l].val < x) cur = cur.next[l];
                  update[l] = cur;                          // x goes right after cur on level l
              }
              int h = randomHeight();
              for (int l = levels; l < h; l++) update[l] = head;   // brand-new top levels start at head
              levels = Math.max(levels, h);
              Node node = new Node(x, h);
              for (int l = 0; l < h; l++) {                 // splice into each of its levels
                  node.next[l] = update[l].next[l];
                  update[l].next[l] = node;
              }
          }

          boolean remove(int x) {
              Node[] update = new Node[MAX_LEVEL];
              Node cur = head;
              for (int l = levels - 1; l >= 0; l--) {
                  while (cur.next[l] != null && cur.next[l].val < x) cur = cur.next[l];
                  update[l] = cur;
              }
              Node target = cur.next[0];
              if (target == null || target.val != x) return false;
              for (int l = 0; l < target.next.length; l++)  // unlink from every level it is on
                  if (update[l].next[l] == target) update[l].next[l] = target.next[l];
              while (levels > 1 && head.next[levels - 1] == null) levels--;   // drop empty top levels
              return true;
          }

          // Smallest key >= x, or null: an ordered query a HashMap cannot answer.
          Integer ceiling(int x) {
              Node cur = head;
              for (int l = levels - 1; l >= 0; l--)
                  while (cur.next[l] != null && cur.next[l].val < x) cur = cur.next[l];
              return cur.next[0] == null ? null : cur.next[0].val;
          }
      }`, { lang: 'python', run: true, title: 'Measure search steps vs log2 N (Python, runnable)', code: `import random, math

class SkipList:
    MAX = 24

    def __init__(self, p=0.5, seed=1):
        self.p, self.rnd, self.levels = p, random.Random(seed), 1
        self.head = [None, [None] * self.MAX]          # node = [value, next pointers]

    def _height(self):
        h = 1
        while h < self.MAX and self.rnd.random() < self.p:
            h += 1
        return h

    def insert(self, x):
        update, cur = [self.head] * self.MAX, self.head
        for l in range(self.levels - 1, -1, -1):
            while cur[1][l] is not None and cur[1][l][0] < x:
                cur = cur[1][l]
            update[l] = cur
        h = self._height()
        self.levels = max(self.levels, h)
        node = [x, [None] * h]
        for l in range(h):
            node[1][l], update[l][1][l] = update[l][1][l], node

    def search_steps(self, x):
        cur, steps = self.head, 0
        for l in range(self.levels - 1, -1, -1):
            while cur[1][l] is not None and cur[1][l][0] < x:
                cur, steps = cur[1][l], steps + 1
            steps += 1                                    # the drop-down
        return steps

for n in (1_000, 10_000, 100_000):
    sl = SkipList(seed=7)
    keys = list(range(n))
    random.Random(3).shuffle(keys)
    for k in keys:
        sl.insert(k)
    probe = random.Random(5).sample(range(n), 300)
    avg = sum(sl.search_steps(k) for k in probe) / len(probe)
    print(f"N={n:>7}  levels={sl.levels:>2}  avg steps={avg:6.1f}  log2 N={math.log2(n):5.1f}  (theory ~ 2*log2 N = {2*math.log2(n):5.1f})")` }],
    codeTitle: ['Skip list with insert / contains / remove / ceiling (Java)', 'Empirical O(log N) check (Python, runnable)'],
    viz: {
      title: 'Build a skip list with coin flips, then search riding the express lanes',
      input: '3 7 9 12 19 21 25 26 | 25 | 4',
      inputLabel: 'keys (3 to 12 distinct numbers) | key to search | seed',
      gen: function (input) {
        var parts = splitBar(input, 3, 'keys | target | seed, e.g. "1 4 6 9 | 6 | 2"');
        var raw = parseNums(parts[0], 'keys', 3, 12, -99, 99), target = Number(parts[1]), seed = Number(parts[2]);
        if (!isFinite(target) || Math.floor(target) !== target) throw new Error('The search key must be a whole number.');
        if (!isFinite(seed)) throw new Error('seed must be a number.');
        var keys = [];
        raw.forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
        var r = rng(seed), MAXL = 4, frames = [];
        var heights = {}, inserted = [];
        function grid(hl, label, extraTag) {
          var cols = ['head'].concat(inserted.map(String)), rows = [], rowHead = [];
          var top = 1; inserted.forEach(function (k) { top = Math.max(top, heights[k]); });
          for (var l = MAXL - 1; l >= 0; l--) {
            var row = [l < top ? 'H' : ''];
            inserted.forEach(function (k) { row.push(heights[k] > l ? String(k) : (l < top ? '—' : '')); });
            rows.push(row); rowHead.push('L' + l);
          }
          return { type: 'grid', label: label || 'skip list (— = express lane passes by)', colHead: cols, rowHead: rowHead, rows: rows, hl: hl || {} };
        }
        frames.push({ narr: 'We insert ' + keys.length + ' keys. Each new node flips a coin: <b>heads</b> → also appear one level higher, flip again; <b>tails</b> → stop. Max height ' + MAXL + ' for this demo. The list stays sorted on every level.',
          parts: [{ type: 'array', label: 'keys to insert (in this order)', values: keys }] });
        keys.forEach(function (k) {
          var h = 1, flips = [];
          while (h < MAXL) { var hd = r() < 0.5; flips.push(hd ? 'H' : 'T'); if (!hd) break; h++; }
          if (h === MAXL && flips[flips.length - 1] === 'H') flips.push('(cap)');
          heights[k] = h;
          inserted.push(k); inserted.sort(function (a, b) { return a - b; });
          var c = inserted.indexOf(k) + 1, hl = {};
          for (var l = 0; l < h; l++) hl[(MAXL - 1 - l) + ',' + c] = 'ok';
          frames.push({ narr: 'Insert <b>' + k + '</b>: coin flips ' + flips.join(' ') + ' → height <b>' + h + '</b> (levels 0..' + (h - 1) + '). It is spliced in after the last smaller node on each of those levels.',
            parts: [grid(hl), { type: 'vars', vals: { key: k, flips: flips.join(' '), height: h } }] });
        });
        var cols = inserted.length;
        var top = 1; inserted.forEach(function (k) { top = Math.max(top, heights[k]); });
        var path = {}, l = top - 1, c = 0, steps = 0;
        function keyAt(col) { return inserted[col - 1]; }
        function nextOn(col, lev) { for (var q = col + 1; q <= cols; q++) if (heights[keyAt(q)] > lev) return q; return -1; }
        frames.push({ narr: 'Now <b>search for ' + target + '</b>. Start at the head on the top used level L' + l + '. Rule: move right while the next key is &lt; ' + target + ', otherwise drop down.',
          parts: [grid(one((MAXL - 1 - l) + ',0', 'cur'), 'search starts at head, level L' + l)] });
        while (true) {
          var nx = nextOn(c, l);
          var hl = {}; Object.keys(path).forEach(function (kk) { hl[kk] = 'done'; });
          var here = (MAXL - 1 - l) + ',' + c;
          if (nx >= 0 && keyAt(nx) < target) {
            path[here] = 1; c = nx; steps++;
            hl[(MAXL - 1 - l) + ',' + c] = 'cur';
            frames.push({ narr: 'Level L' + l + ': next key ' + keyAt(c) + ' &lt; ' + target + ' → <b>ride right</b> to ' + keyAt(c) + '. (Each express hop skips the nodes underneath.)',
              parts: [grid(hl, 'searching for ' + target), { type: 'vars', vals: { level: l, at: keyAt(c), moves: steps } }] });
          } else {
            path[here] = 1;
            hl[here] = 'cur';
            if (nx >= 0) hl[(MAXL - 1 - l) + ',' + nx] = 'bad';
            if (l === 0) {
              var found = nx >= 0 && keyAt(nx) === target, plain = Math.min(cols, inserted.filter(function (q) { return q < target; }).length + 1);
              if (nx >= 0) hl[(MAXL - 1) + ',' + nx] = found ? 'sel' : 'bad';
              frames.push({ narr: 'Level L0: next key is ' + (nx >= 0 ? keyAt(nx) : 'null') + '. ' + (found ? '<span class="c-g">It equals ' + target + ' → FOUND</span>' : '<span class="c-r">' + target + ' is not in the list</span>' + (nx >= 0 ? ' (its ceiling is ' + keyAt(nx) + ')' : '')) + ' after ' + (steps + 1) + ' pointer steps; a plain sorted linked list needs ' + plain + '. ' + (cols < 20 ? 'With only ' + cols + ' keys the lanes help a little (or not at all on unlucky flips); with 10<sup>6</sup> keys it is ~40 steps versus up to 10<sup>6</sup>.' : ''),
                parts: [grid(hl, 'search result'), { type: 'vars', vals: { 'skip list steps': steps + 1, 'plain list steps': plain, found: found ? 'yes' : 'no' }, hl: { found: found ? 'ok' : 'bad' } }] });
              break;
            }
            frames.push({ narr: 'Level L' + l + ': next is ' + (nx >= 0 ? keyAt(nx) + ' (not &lt; ' + target + ')' : 'null') + ' → <b>drop down</b> to L' + (l - 1) + ' at the same node.',
              parts: [grid(hl, 'searching for ' + target), { type: 'vars', vals: { level: l, at: c === 0 ? 'head' : keyAt(c), moves: steps } }] });
            l--; steps++;
          }
        }
        return frames;
      }
    },
    examples: [
      { title: 'Expected shape for 16 keys', html: `<p>With p = ½: about 16 nodes on L0, 8 on L1, 4 on L2, 2 on L3, 1 on L4 → total pointers ≈ 31 ≈ 2N. Height ≈ log<sub>2</sub>16 = 4. Each level halves the candidates, like binary search.</p>
        ${H.table(['level', 'expected nodes'], [['L0', '16'], ['L1', '8'], ['L2', '4'], ['L3', '2'], ['L4', '1']])}` },
      { title: 'Insert 20 into the example list', html: `<p>Walk: L3 head → stop (21 ≥ 20), update[3] = head. L2: head → 9 → stop (21 ≥ 20), update[2] = 9. L1: 9 → 19 → stop, update[1] = 19. L0: 19 → stop (21), update[0] = 19. Coin flips: H, T → height 2. Splice on L0 and L1 after 19. No other node changes — no rotations, no rebalancing.</p>` },
      { title: 'Range query: all keys in [8, 20]', html: `<p>Find ceiling(8) with a normal search (lands on 9), then walk level 0 until a key exceeds 20: 9, 12, 19. Cost O(log N + K) for K results — the same as a balanced BST's in-order range scan, and something a hash table cannot do.</p>`, code: `// Java ships a production skip list: ConcurrentSkipListSet / ConcurrentSkipListMap.
ConcurrentSkipListSet<Integer> s = new ConcurrentSkipListSet<>(List.of(3, 7, 9, 12, 19, 21, 25, 26));
System.out.println(s.ceiling(8));                    // 9
System.out.println(s.subSet(8, true, 20, true));     // [9, 12, 19]` },
      { title: 'Why p = 1/4 in Redis', html: `<p>Expected search cost ≈ (log<sub>1/p</sub>N)/p. For p = ½: 2·log<sub>2</sub>N. For p = ¼: 4·log<sub>4</sub>N = 2·log<sub>2</sub>N — the <b>same</b> number of steps, but only 1/(1−p) = 1.33 pointers per node instead of 2. Redis uses p = ¼ and a max level of 32 for its sorted sets, trading nothing in speed for less memory.</p>` }
    ],
    deepDive: `<p><b>Analysis (Pugh, 1990).</b> Look at the search path <b>backwards</b>: from the target, climb up whenever the current node has a higher level (probability p), otherwise step left. Climbing log<sub>1/p</sub>N levels needs on average (log<sub>1/p</sub>N)/p steps, plus O(1/(1−p)) at the top. Height exceeds c·log N with probability at most N<sup>1−c</sup> — so O(log N) holds <b>with high probability</b>, not just in expectation. Space: expected N/(1−p) pointers.</p>
      <p><b>Indexable skip lists.</b> Store on each forward pointer its <b>span</b> (how many level-0 nodes it jumps). Summing spans along the search path gives the <b>rank</b> of a key in O(log N), and you can find the k-th element by walking spans. That is how Redis implements <code>ZRANK</code> and <code>ZRANGE</code> on sorted sets (skip list for order + hash map for O(1) member lookup).</p>
      <p><b>Concurrency.</b> Skip lists shine with many threads: an insert touches only a few local pointers, so it can be done with compare-and-swap, level by level from the bottom (a node is "in the set" once linked at level 0; higher links are just shortcuts). Java's <code>ConcurrentSkipListMap/Set</code> are lock-free skip lists — the standard library has no concurrent balanced tree because rotations touch too much shared state. LevelDB/RocksDB use a skip list as the <b>memtable</b>: writes are frequent, reads need sorted iteration for flushing to SSTables.</p>
      <p><b>Trade-offs.</b> Versus red-black trees: simpler code, natural concurrency, easy range scans; but more memory per key, pointer chasing that is cache-unfriendly (B-trees win on disk and often in RAM), and probabilistic rather than guaranteed bounds. <b>Deterministic</b> variants (1-2-3 skip lists) bound the gaps but lose the simplicity. <b>Treaps</b> are the tree-shaped cousin: random priorities give expected O(log N) depth.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can produce a working LeetCode 1206 skip list on demand, so interviews lean on the <i>why</i>: why coin flips give O(log N), why <code>ConcurrentSkipListMap</code> exists but no concurrent TreeMap, what Redis gains from p = ¼, and how spans give ranks.</p>
      <p><b>Use AI as a partner:</b> ask it to instrument a skip list to histogram node heights and search lengths for 10<sup>5</sup> keys, and compare with the theory (geometric heights, ~2 log<sub>2</sub>N steps). Ask for a property-based test comparing your skip list against <code>TreeSet</code> on random operation sequences — the classic way to catch splice bugs.</p>
      <p><b>Where AI goes wrong:</b> forgetting to set <code>update[l] = head</code> for new top levels, unlinking a duplicate that is not the found node, never lowering the level count after deletions, and using an unseeded RNG that makes failing tests impossible to reproduce.</p>
      <p><b>What you must still own:</b> the update[] mental model (the last node before x on every level), the expected-cost argument, and the engineering comparison with trees, B-trees and hash maps.</p>`,
    problems: [{
      title: 'Design Skiplist', level: 'Hard', tags: ['skip list', 'design', 'randomized', 'linked list'], companies: ['Google', 'Pure Storage', 'eBay'],
      statement: `<p>Design a skip list without built-in ordered containers. Implement <code>Skiplist()</code>, <code>boolean search(int target)</code>, <code>void add(int num)</code> and <code>boolean erase(int num)</code> (erase one occurrence; return false if absent). <b>Duplicates may exist.</b> Each operation should run in expected O(log N). (LeetCode 1206.)</p>`,
      constraints: `0 ≤ num, target ≤ 2·10<sup>4</sup>, at most 5·10<sup>4</sup> calls in total`,
      example: `<p>add 1, add 2, add 3, search(0) → ${H.c('r', 'false')}, add 4, search(1) → ${H.c('g', 'true')}, erase(0) → ${H.c('r', 'false')}, erase(1) → ${H.c('g', 'true')}, search(1) → ${H.c('r', 'false')}.</p>`,
      brute: {
        why: `<p>Keep a sorted <code>ArrayList</code>: search with binary search in O(log N), but <code>add</code>/<code>erase</code> shift elements → <b>O(N)</b> each, so 5·10<sup>4</sup> operations can cost ~10<sup>9</sup> moves in the worst case. A plain sorted linked list fixes the shifting but makes the search O(N). The skip list gets both: linked-list splicing plus binary-search-like hops.</p>`,
        code: `class Skiplist {
    private final List<Integer> list = new ArrayList<>();   // always sorted

    public boolean search(int target) {
        return Collections.binarySearch(list, target) >= 0; // O(log N)
    }

    public void add(int num) {
        int i = Collections.binarySearch(list, num);
        if (i < 0) i = -i - 1;
        list.add(i, num);                                    // O(N) shift
    }

    public boolean erase(int num) {
        int i = Collections.binarySearch(list, num);
        if (i < 0) return false;
        list.remove(i);                                      // O(N) shift
        return true;
    }
}`
      },
      mcq: { q: 'During add(num), what does update[l] store?', options: ['The node num itself on level l', 'The last node on level l whose value is &lt; num (num is spliced right after it)', 'The first node on level l whose value is ≥ num', 'The head of level l'], answer: 1, explain: 'The search drops a level exactly when the next value is ≥ num, so the current node is the predecessor on that level. New levels above the current top use the head as predecessor.' },
      hints: [
        `<p>Hint 1: Node = value + array of next pointers (one per level it lives on). A head sentinel has the maximum number of levels.</p>`,
        `<p>Hint 2: All three operations start with the same walk: from the top level, move right while next.val &lt; x, then go down. Record the node where you went down on each level in update[].</p>`,
        `<p>Hint 3: add: height = 1 + number of consecutive coin heads (cap at ~16); levels above the current top use head as predecessor; splice bottom-up. erase: target = update[0].next[0]; check its value; unlink on each level where update[l].next[l] == target; shrink the level count while the top is empty.</p>`
      ],
      solution: {
        approach: `<p>Classic Pugh skip list with p = ½ and 16 levels (2<sup>16</sup> &gt; 5·10<sup>4</sup>). The shared "find predecessors" walk drives all operations. Duplicates work naturally because the walk stops before the first equal value; erase unlinks exactly the node it found by comparing references.</p>`,
        code: `class Skiplist {
    private static final int MAX_LEVEL = 16;
    private static final double P = 0.5;

    private static final class Node {
        final int val;
        final Node[] next;
        Node(int val, int h) { this.val = val; this.next = new Node[h]; }
    }

    private final Node head = new Node(-1, MAX_LEVEL);
    private int level = 1;
    private final Random rnd = new Random();

    public Skiplist() { }

    private int randomLevel() {
        int h = 1;
        while (h < MAX_LEVEL && rnd.nextDouble() < P) h++;
        return h;
    }

    // Fills update[l] with the last node < x on each level; returns the level-0 predecessor.
    private Node findPredecessors(int x, Node[] update) {
        Node cur = head;
        for (int l = level - 1; l >= 0; l--) {
            while (cur.next[l] != null && cur.next[l].val < x) cur = cur.next[l];
            if (update != null) update[l] = cur;
        }
        return cur;
    }

    public boolean search(int target) {
        Node cand = findPredecessors(target, null).next[0];
        return cand != null && cand.val == target;
    }

    public void add(int num) {
        Node[] update = new Node[MAX_LEVEL];
        findPredecessors(num, update);
        int h = randomLevel();
        for (int l = level; l < h; l++) update[l] = head;     // new top levels
        level = Math.max(level, h);
        Node node = new Node(num, h);
        for (int l = 0; l < h; l++) {
            node.next[l] = update[l].next[l];
            update[l].next[l] = node;
        }
    }

    public boolean erase(int num) {
        Node[] update = new Node[MAX_LEVEL];
        Node target = findPredecessors(num, update).next[0];
        if (target == null || target.val != num) return false;
        for (int l = 0; l < target.next.length; l++)
            if (update[l].next[l] == target) update[l].next[l] = target.next[l];
        while (level > 1 && head.next[level - 1] == null) level--;
        return true;
    }
}`,
        alt: [{ lang: 'python', code: `import random

class Node:
    __slots__ = ("val", "nxt")
    def __init__(self, val, h):
        self.val, self.nxt = val, [None] * h

class Skiplist:
    MAX = 16

    def __init__(self):
        self.head, self.level = Node(-1, self.MAX), 1

    def _preds(self, x):
        update, cur = [self.head] * self.MAX, self.head
        for l in range(self.level - 1, -1, -1):
            while cur.nxt[l] and cur.nxt[l].val < x:
                cur = cur.nxt[l]
            update[l] = cur
        return update

    def search(self, target):
        nxt = self._preds(target)[0].nxt[0]
        return nxt is not None and nxt.val == target

    def add(self, num):
        update, h = self._preds(num), 1
        while h < self.MAX and random.random() < 0.5:
            h += 1
        self.level = max(self.level, h)              # update[] already defaults to head
        node = Node(num, h)
        for l in range(h):
            node.nxt[l], update[l].nxt[l] = update[l].nxt[l], node

    def erase(self, num):
        update = self._preds(num)
        t = update[0].nxt[0]
        if t is None or t.val != num:
            return False
        for l in range(len(t.nxt)):
            if update[l].nxt[l] is t:
                update[l].nxt[l] = t.nxt[l]
        while self.level > 1 and self.head.nxt[self.level - 1] is None:
            self.level -= 1
        return True` }],
        dry: { head: ['call', 'walk / coin flips', 'structure after (L1 / L0)', 'returns'], rows: [
          ['add 1', 'flips H,T → height 2', 'L1: 1 · L0: 1', '—'],
          ['add 2', 'flips T → height 1', 'L1: 1 · L0: 1 2', '—'],
          ['add 3', 'flips H,T → height 2', 'L1: 1 3 · L0: 1 2 3', '—'],
          ['search 0', 'L1: head, next 1 ≥ 0 → down; L0: next 1 ≠ 0', 'unchanged', '<span class="c-r">false</span>'],
          ['add 4', 'flips T → height 1', 'L1: 1 3 · L0: 1 2 3 4', '—'],
          ['search 1', 'L1: next 1 not &lt; 1 → down; L0: next is 1', 'unchanged', '<span class="c-g">true</span>'],
          ['erase 1', 'update = [head, head]; unlink on L0 and L1', 'L1: 3 · L0: 2 3 4', '<span class="c-g">true</span>']
        ] },
        complexity: `<p>Expected <b>O(log N)</b> per operation (worst case O(N) with negligible probability). Expected space <b>O(N)</b> (≈ 2N next pointers at p = ½).</p>`,
        followUps: ['Add rank(x) and kth(k) in O(log N) using span counts.', 'Make it thread-safe; why do skip lists suit lock-free designs better than red-black trees?', 'Choose p and MAX_LEVEL for 10<sup>9</sup> keys and justify the memory.']
      }
    }]
  });
registerModule({ id: 'dsa26', title: 'Geometry, Randomized & Amortized Analysis', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
